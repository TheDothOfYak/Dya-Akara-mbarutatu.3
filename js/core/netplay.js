/* ============================================================
   DYA'AKARA — core/netplay.js
   Real cross-device Private Matches.

   The match engine is already a deterministic fixed-timestep
   lockstep simulation (shared seed + input log), so networked
   play only has to agree on WHICH inputs run at WHICH tick:

   - Time is cut into frames of K ticks (K=5 → 250ms).
   - An input issued during frame N executes at the first tick of
     frame N+DELAY (DELAY=2 → 500–750ms input latency) on BOTH
     clients.
   - At the end of every frame each client broadcasts that frame's
     (possibly empty) input list. A client may not simulate frame F
     until it holds the opponent's frame F-DELAY, so the two sims
     can never diverge on inputs.
   - Every frame packet carries the last 3 frames (loss tolerance)
     and a periodic state hash (desync detector).

   Transport: Supabase Realtime broadcast channels — the room code
   IS the channel name. The supabase-js UMD bundle is fetched on
   demand; friends (online.js) work without it.

   Lockstep itself is transport-agnostic and unit-tested headless
   in tests/test_netplay.js.
   ============================================================ */
(function () {
  'use strict';

  const N = {};
  DYA.netplay = N;

  const TICK = 1 / 20;
  N.FRAME_TICKS = 5;   // K
  N.DELAY_FRAMES = 2;  // input delay in frames
  N.HASH_EVERY = 8;    // hash every 8th frame (2s)

  /* ================= deterministic state hash ================= */
  N.stateHash = function (M) {
    let h = (M.tick | 0) ^ 0x5F17;
    const add = v => { h = (Math.imul(h, 31) + (v | 0)) | 0; };
    for (const c of M.creatures) {
      if (c.dead) continue;
      add(c.id); add(Math.round(c.x * 4)); add(Math.round(c.y * 4)); add(Math.round(c.hp * 4));
    }
    M.teams.forEach(T => { if (T.resources) { add(Math.round((T.resources.Fti + T.resources.Su + T.resources.Eldi + T.resources.Ular) * 4)); } });
    return h | 0;
  };

  /* ================= Lockstep core =================
     N-player generalization. A match may seat any number of HUMAN teams
     plus any number of AI (Dya'kukull) teams. AI seats run the deterministic
     seeded brain (Match.aiThink) identically on every client, so they need
     no networking at all — only the human seats exchange inputs. Each human
     client owns one seat (a team index) and streams that seat's frames; it
     may not outrun the slowest OTHER human seat's known inputs.

     match: a DYA.match.Match
     mySeat: the team index this client controls
     send(payload): transport hook — broadcast to every other human client
     humanSeats: array of team indices that are human (defaults to [0,1], the
       classic 1v1, so existing two-player callers are unchanged). */
  N.Lockstep = function (match, mySeat, send, humanSeats) {
    const L = this;
    L.M = match;
    L.mySeat = mySeat;
    L.myTeam = mySeat;     // back-compat alias
    L.send = send;
    L.seats = (humanSeats && humanSeats.length ? humanSeats.slice() : [0, 1]).sort((a, b) => a - b);
    L.others = L.seats.filter(s => s !== mySeat);
    L.K = N.FRAME_TICKS;
    L.DELAY = N.DELAY_FRAMES;
    L.pending = [];        // local inputs collected during the current frame
    L.sent = {};           // my flushed frames, kept for re-send: n -> inputs
    L.myFrame = 0;         // next frame index I will flush
    L.oppFrame = {};       // seat -> highest CONTIGUOUS frame received
    L.oppBuffer = {};      // seat -> { frameN -> inputs } (out-of-order buffer)
    L.others.forEach(s => { L.oppFrame[s] = -1; L.oppBuffer[s] = {}; });
    L.seq = 0;
    L.myHashes = {};       // tick -> my hash (ring)
    L.oppHashes = {};      // tick -> { seat -> hash }, compared when I pass that tick
    L.desynced = false;
    L.acc = 0;
    L.stallSince = null;   // wall-clock ms when we first hit the safety wall
    L.needAsked = 0;
  };

  /* the single other human seat (used to attribute a legacy, seat-less frame) */
  N.Lockstep.prototype._soleOther = function () { return this.others.length === 1 ? this.others[0] : null; };

  /* local player issued an input NOW */
  N.Lockstep.prototype.queueLocal = function (input) {
    const L = this, M = L.M;
    if (M.over) return;
    const frame = Math.floor(M.tick / L.K);      // frame currently being collected
    const execTick = (frame + L.DELAY) * L.K + 1; // first tick of frame+DELAY
    const seq = L.seq++;
    L.pending.push({ input, seq });
    M.queueInput(L.mySeat, input, execTick, seq);
  };

  /* the tick a given frame's inputs execute at */
  N.Lockstep.prototype.execTickOf = function (frame) { return (frame + this.DELAY) * this.K + 1; };

  /* highest tick we may simulate without outrunning any other human seat.
     With no other human seats (everyone else is AI) there is nothing to wait
     for, so the sim runs free. */
  N.Lockstep.prototype.maxSafeTick = function () {
    if (!this.others.length) return Infinity;
    let m = Infinity;
    for (const s of this.others) m = Math.min(m, (this.oppFrame[s] + this.DELAY + 1) * this.K);
    return m;
  };

  N.Lockstep.prototype.flushFrame = function () {
    const L = this;
    const n = L.myFrame++;
    const inputs = L.pending.map(p => ({ i: p.input, s: p.seq }));
    L.pending = [];
    L.sent[n] = inputs;
    const msg = { t: 'frame', seat: L.mySeat, frames: [] };
    for (let k = Math.max(0, n - 2); k <= n; k++) if (L.sent[k]) msg.frames.push({ n: k, inputs: L.sent[k] });
    if (n % N.HASH_EVERY === 0) {
      const ht = (n + 1) * L.K; // frame n completed at tick (n+1)*K
      msg.h = L.myHashes[ht]; msg.ht = ht;
    }
    L.send(msg);
  };

  /* transport hands every remote payload here */
  N.Lockstep.prototype.onRemote = function (msg) {
    const L = this, M = L.M;
    if (!msg || M.over) return;
    if (msg.t === 'frame') {
      const seat = msg.seat != null ? msg.seat : L._soleOther();
      if (seat != null && seat !== L.mySeat && L.oppBuffer[seat]) {
        (msg.frames || []).forEach(f => {
          if (f.n <= L.oppFrame[seat] || L.oppBuffer[seat][f.n]) return;
          L.oppBuffer[seat][f.n] = f.inputs || [];
        });
        /* advance THAT seat contiguously, scheduling its inputs */
        while (L.oppBuffer[seat][L.oppFrame[seat] + 1]) {
          const n = ++L.oppFrame[seat];
          const at = L.execTickOf(n);
          for (const e of L.oppBuffer[seat][n]) M.queueInput(seat, e.i, at, e.s);
          delete L.oppBuffer[seat][n];
        }
        if (msg.ht != null) {
          (L.oppHashes[msg.ht] = L.oppHashes[msg.ht] || {})[seat] = msg.h;
          L.compareHashes();
        }
      }
    } else if (msg.t === 'need') {
      /* a peer lost frames — re-send MY frames from where they are */
      const out = { t: 'frame', seat: L.mySeat, frames: [] };
      for (let k = msg.from; k < L.myFrame && out.frames.length < 40; k++) if (L.sent[k]) out.frames.push({ n: k, inputs: L.sent[k] });
      if (out.frames.length) L.send(out);
    }
  };

  N.Lockstep.prototype.compareHashes = function () {
    const L = this;
    for (const t in L.oppHashes) {
      if (L.myHashes[t] === undefined) continue;
      const bySeat = L.oppHashes[t];
      for (const s in bySeat) { if (L.myHashes[t] !== bySeat[s]) L.desynced = true; }
      delete L.oppHashes[t];   // myHashes[t] is left to age out, so late peers still compare
    }
  };

  /* replaces Match.step for networked play (pause is cosmetic online) */
  N.Lockstep.prototype.step = function (dtReal) {
    const L = this, M = L.M;
    if (M.over) return;
    L.acc += Math.min(dtReal, 0.25);
    let advanced = false;
    while (L.acc >= TICK) {
      if (M.tick >= L.maxSafeTick()) {
        /* safety wall: we are ahead of the opponent's known inputs */
        L.acc = Math.min(L.acc, TICK * 2); // don't bank a burst for when they return
        if (L.stallSince == null) L.stallSince = Date.now();
        else if (Date.now() - L.stallSince > 1500 && Date.now() - L.needAsked > 2000) {
          L.needAsked = Date.now();
          /* ask from the lowest frame any lagging seat still owes us */
          let from = Infinity;
          for (const s of L.others) from = Math.min(from, L.oppFrame[s] + 1);
          L.send({ t: 'need', from: from === Infinity ? 0 : from });
        }
        break;
      }
      L.acc -= TICK;
      M.doTick();
      advanced = true;
      if (M.tick % L.K === 0) {
        const f = M.tick / L.K - 1; // just-completed frame
        if (f % N.HASH_EVERY === 0 || L.oppHashes[M.tick] !== undefined) L.myHashes[M.tick] = N.stateHash(M);
        L.compareHashes();
        L.flushFrame();
        /* prune old bookkeeping */
        delete L.sent[f - 60];
        delete L.myHashes[M.tick - 60 * L.K];
      }
      if (M.over) { L.send({ t: 'frame', seat: L.mySeat, frames: [] }); break; }
    }
    if (advanced) L.stallSince = null;
    return advanced;
  };

  N.Lockstep.prototype.stalled = function () {
    return this.stallSince != null && Date.now() - this.stallSince > 900;
  };

  /* ================= Supabase Realtime transport ================= */
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
  let sdkPromise = null;
  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SDK_URL;
      s.onload = () => window.supabase && window.supabase.createClient ? resolve(window.supabase) : reject(new Error('Supabase client library loaded but is unusable.'));
      s.onerror = () => { sdkPromise = null; reject(new Error('Could not load the realtime client library. Check the internet connection.')); };
      document.head.appendChild(s);
    });
    return sdkPromise;
  }

  let sbClient = null;
  async function client() {
    const c = (window.DYA_CONFIG && window.DYA_CONFIG.supabase) || {};
    if (!c.url || !c.anonKey) throw new Error('Online play is not configured. Friends → Set up online play.');
    if (!sbClient) {
      const sdk = await loadSdk();
      sbClient = sdk.createClient(c.url, c.anonKey, { realtime: { params: { eventsPerSecond: 20 } } });
    }
    return sbClient;
  }

  N.ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  N.genRoomCode = function () {
    let s = '';
    for (let i = 0; i < 5; i++) s += N.ROOM_ALPHABET[Math.floor(Math.random() * N.ROOM_ALPHABET.length)];
    return s;
  };

  /* Join a room channel. handlers: {onMessage(payload), onPeerJoin(key), onPeerLeave(key), onStatus(s)} */
  N.joinRoom = async function (code, myKey, handlers) {
    const sb = await client();
    code = String(code).trim().toUpperCase();
    const channel = sb.channel('dya-room-' + code, {
      config: { broadcast: { self: false }, presence: { key: myKey } },
    });
    channel.on('broadcast', { event: 'msg' }, (e) => handlers.onMessage && handlers.onMessage(e.payload));
    channel.on('presence', { event: 'join' }, (e) => { if (e.key !== myKey && handlers.onPeerJoin) handlers.onPeerJoin(e.key); });
    channel.on('presence', { event: 'leave' }, (e) => { if (e.key !== myKey && handlers.onPeerLeave) handlers.onPeerLeave(e.key); });
    await new Promise((resolve, reject) => {
      let settled = false;
      channel.subscribe((status, err) => {
        if (handlers.onStatus) handlers.onStatus(status);
        if (settled) return;
        if (status === 'SUBSCRIBED') { settled = true; resolve(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { settled = true; reject(err || new Error('Could not join the room channel (' + status + '). Is Realtime enabled for the project?')); }
      });
      setTimeout(() => { if (!settled) { settled = true; reject(new Error('Timed out joining the room.')); } }, 12000);
    });
    await channel.track({ at: Date.now() });
    return {
      code,
      send(payload) { channel.send({ type: 'broadcast', event: 'msg', payload }); },
      peers() { const st = channel.presenceState(); return Object.keys(st).filter(k => k !== myKey); },
      leave() { try { channel.untrack(); sb.removeChannel(channel); } catch (e) { } },
    };
  };
})();
