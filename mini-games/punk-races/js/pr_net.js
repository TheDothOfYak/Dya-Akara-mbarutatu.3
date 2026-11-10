/* ============================================================
   PUNK RACES — js/pr_net.js
   Racing friends online. No account needed: anyone can host or
   join a room with its five-letter code. (Signed-in players have
   their online races recorded on their account; a guest's stay in
   their browser, like the rest of their stable.)

   How a race stays together:
     • the course is built from the track's seed, and the time of day
       and weather from a seed the host sends, so everyone races the
       same course;
     • each player's own Punk runs on their own device and streams
       where it is about 12 times a second; everyone else's Punk is
       drawn from those updates, smoothed in between;
     • the host runs the rival riders who fill empty seats, and
       streams them too;
     • the host says when to start, and everyone counts down together.

   Transport: Supabase Realtime broadcast channels (the room code is
   the channel), with presence to notice who leaves. For testing on
   one computer, add ?net=local to the address and two tabs talk over
   a BroadcastChannel instead.
   ============================================================ */
(function (root) {
  'use strict';
  const PR = root.PR;
  const NET = PR.net = {};
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  NET.code = () => Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
  NET.cleanCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  NET.local = typeof location !== 'undefined' && /[?&]net=local\b/.test(location.search);
  NET.MAX = 4;
  NET.SEND_MS = 80;

  /* ---------------- transports ---------------- */
  const SB_URLS = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js', 'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'];
  let sbPromise = null, sbClient = null;
  function loadSb() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    if (sbPromise) return sbPromise;
    sbPromise = new Promise((resolve, reject) => {
      const next = i => {
        if (i >= SB_URLS.length) { sbPromise = null; reject(new Error('Could not load the online library. Check the internet connection.')); return; }
        const s = document.createElement('script'); s.src = SB_URLS[i]; s.async = true;
        s.onload = () => (window.supabase && window.supabase.createClient ? resolve(window.supabase) : next(i + 1));
        s.onerror = () => next(i + 1);
        document.head.appendChild(s);
      };
      next(0);
    });
    return sbPromise;
  }
  async function supabaseChannel(code, key, on) {
    const c = window.DYA_CONFIG && window.DYA_CONFIG.supabase;
    if (!c || !c.url || !c.anonKey) throw new Error('Online play is not set up for this site.');
    const sdk = await loadSb();
    sbClient = sbClient || (window.DYA_LIVE && window.DYA_LIVE._client) || sdk.createClient(c.url, c.anonKey, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 25 } } });
    const ch = sbClient.channel('pr-room-' + code, { config: { broadcast: { self: false }, presence: { key } } });
    ch.on('broadcast', { event: 'm' }, e => on.message(e.payload));
    ch.on('presence', { event: 'leave' }, e => { if (e.key !== key) on.leave(e.key); });
    await new Promise((resolve, reject) => {
      let done = false;
      ch.subscribe(status => {
        if (done) return;
        if (status === 'SUBSCRIBED') { done = true; resolve(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { done = true; reject(new Error('Could not reach the online service.')); }
      });
      setTimeout(() => { if (!done) { done = true; reject(new Error('The online service took too long to answer.')); } }, 12000);
    });
    try { await ch.track({ at: Date.now() }); } catch (e) { /* presence is a nicety */ }
    return { kind: 'online', send: p => ch.send({ type: 'broadcast', event: 'm', payload: p }), close: () => { try { ch.untrack(); sbClient.removeChannel(ch); } catch (e) { /* ignore */ } } };
  }
  async function localChannel(code, key, on) {
    const bc = new BroadcastChannel('pr-room-' + code);
    bc.onmessage = e => on.message(e.data);
    window.addEventListener('pagehide', () => bc.postMessage({ t: 'bye', from: key }));
    return { kind: 'local', send: p => bc.postMessage(p), close: () => { try { bc.postMessage({ t: 'bye', from: key }); bc.close(); } catch (e) { /* ignore */ } } };
  }

  /* ---------------- a room ---------------- */
  /* me: { key, name, coat, hat, stats }   handlers: { onLobby(room), onStart(spec), onState(list), onClosed(why) } */
  NET.Room = function (me, handlers) {
    const R = this;
    R.me = me; R.h = handlers; R.host = false; R.hostKey = null; R.code = null;
    R.roster = {};            // key → { key, name, coat, hat, stats, seen }
    R.track = null; R.fill = true; R.state = 'idle'; R.ch = null; R.timer = null;
  };
  const P = NET.Room.prototype;
  P.open = async function (code, asHost) {
    const R = this;
    R.code = NET.cleanCode(code); R.host = !!asHost; R.hostKey = asHost ? R.me.key : null;
    R.roster = {}; R.roster[R.me.key] = Object.assign({ seen: Date.now(), joined: asHost ? 0 : Date.now() }, R.me);
    const on = { message: m => R.onMessage(m), leave: k => R.drop(k) };
    R.ch = NET.local ? await localChannel(R.code, R.me.key, on) : await supabaseChannel(R.code, R.me.key, on);
    R.state = 'lobby';
    R.hello();
    clearInterval(R.timer);
    R.timer = setInterval(() => R.tick(), 2000);
    if (!R.host) {
      /* no host answer in a while: the room is empty or the code is wrong */
      setTimeout(() => { if (R.state === 'lobby' && !R.hostKey && R.h.onClosed) R.h.onClosed('Nobody is hosting a room with that code.'); }, 8000);
    }
    R.lobbyChanged();
    return R;
  };
  P.send = function (m) { if (this.ch) { m.from = this.me.key; try { this.ch.send(m); } catch (e) { /* a dropped packet */ } } };
  P.hello = function () { const m = this.me; this.send({ t: 'hello', name: m.name, coat: m.coat, hat: m.hat, stats: m.stats, host: this.host }); };
  P.players = function () { return Object.values(this.roster).sort((a, b) => (b.key === this.hostKey) - (a.key === this.hostKey) || a.joined - b.joined); };
  P.tick = function () {
    const R = this, now = Date.now();
    if (R.state === 'lobby') {
      R.hello();
      if (R.host) R.sendLobby();
    }
    /* anyone not heard from in a while has gone */
    Object.keys(R.roster).forEach(k => { if (k !== R.me.key && now - R.roster[k].seen > (R.state === 'race' ? 15000 : 9000)) R.drop(k); });
  };
  P.drop = function (k) {
    const R = this;
    if (!R.roster[k]) return;
    delete R.roster[k];
    if (k === R.hostKey && R.state === 'lobby' && R.h.onClosed) { R.h.onClosed('The host left the room.'); return; }
    if (R.host) R.sendLobby();
    R.lobbyChanged();
  };
  P.sendLobby = function () { this.send({ t: 'lobby', track: this.track, fill: this.fill, order: this.players().map(p => p.key) }); };
  P.lobbyChanged = function () { if (this.h.onLobby) this.h.onLobby(this); };
  P.setTrack = function (id) { this.track = id; this.sendLobby(); this.lobbyChanged(); };
  P.setFill = function (v) { this.fill = !!v; this.sendLobby(); this.lobbyChanged(); };
  P.onMessage = function (m) {
    const R = this;
    if (!m || !m.from || m.from === R.me.key) return;
    const known = R.roster[m.from];
    if (known) known.seen = Date.now();
    switch (m.t) {
      case 'hello': {
        if (!known) {
          if (R.state !== 'lobby') return;
          if (R.host && Object.keys(R.roster).length >= NET.MAX) { R.send({ t: 'full', to: m.from }); return; }
          R.roster[m.from] = { key: m.from, name: String(m.name || 'Rider').slice(0, 18), coat: m.coat, hat: m.hat, stats: m.stats, seen: Date.now(), joined: m.host ? 0 : Date.now() };
          R.hello();                                   // so the newcomer learns about us too
          if (R.host) R.sendLobby();
        } else Object.assign(known, { name: String(m.name || known.name).slice(0, 18), coat: m.coat, hat: m.hat, stats: m.stats });
        if (m.host) R.hostKey = m.from;
        R.lobbyChanged();
        break;
      }
      case 'lobby':
        if (R.host) return;
        R.hostKey = m.from; R.track = m.track; R.fill = m.fill;
        R.lobbyChanged();
        break;
      case 'full':
        if (m.to === R.me.key && R.h.onClosed) R.h.onClosed('That room is full.');
        break;
      case 'start':
        if (m.from !== R.hostKey || R.state !== 'lobby') return;
        R.state = 'race';
        if (R.h.onStart) R.h.onStart(m.spec);
        break;
      case 'st':
        if (R.state === 'race' && R.h.onState) R.h.onState(m.s, m.from);
        break;
      case 'again':
        if (m.from === R.hostKey) { R.state = 'lobby'; R.lobbyChanged(); }
        break;
      case 'bye':
        R.drop(m.from);
        break;
    }
  };
  /* the host starts the race: who is in it, the rivals in the empty seats, the course */
  P.start = function (rivals) {
    const R = this;
    if (!R.host || R.state !== 'lobby') return null;
    const humans = R.players().map(p => ({ id: p.key, name: p.name + '’s Punk', rider: p.name, coat: p.coat || 'orange', hat: p.hat || '#6a5a2a', stats: p.stats, ai: false, human: true }));
    const spec = { track: R.track, mood: (Date.now() ^ 0x5bd1) & 0xffffff, entrants: humans.concat(R.fill ? rivals.slice(0, Math.max(0, NET.MAX - humans.length)) : []), delay: 4200 };
    R.state = 'race';
    R.send({ t: 'start', spec });
    return spec;
  };
  P.backToLobby = function () { this.state = 'lobby'; if (this.host) this.send({ t: 'again' }); this.lobbyChanged(); };
  P.leave = function () { const R = this; clearInterval(R.timer); R.send({ t: 'bye' }); if (R.ch) R.ch.close(); R.ch = null; R.state = 'idle'; };

  /* ---------------- racing over the wire ---------------- */
  const MODES = ['ground', 'air', 'swing', 'swim'];
  /* what this device tells the others: its own Punk, and (for the host) the rivals */
  NET.pack = function (race, myKey, host) {
    const out = [];
    race.runners.forEach(u => {
      if (u.remote) return;
      if (u.ai && !host) return;
      const id = u.id === 'me' ? myKey : u.id;
      out.push([id, Math.round(u.x), Math.round(u.y), Math.round(u.vx), Math.round(u.vy), Math.max(0, MODES.indexOf(u.mode)),
        u.anchor ? race.course.anchors.indexOf(u.anchor) : -1, Math.round((u.flipA || 0) * 100) / 100, u.boostT > 0 ? 1 : 0,
        u.finished ? Math.round(u.time * 1000) / 1000 : -1, u.climb > 0 ? 1 : 0]);
    });
    return out;
  };
  NET.unpack = function (race, list, myKey) {
    const now = performance.now();
    (list || []).forEach(e => {
      if (e[0] === myKey) return;
      const u = race.runners.find(r => r.id === e[0]);
      if (!u || !u.remote) return;
      u.net = { x: e[1], y: e[2], vx: e[3], vy: e[4], at: now };
      u.mode = MODES[e[5]] || 'air';
      u.anchor = e[6] >= 0 ? race.course.anchors[e[6]] || null : null;
      if (u.anchor && u.mode === 'swing') u.len = Math.hypot(e[1] - u.anchor.x, e[2] - u.anchor.y);
      u.flipA = e[7]; u.boostT = e[8] ? 0.2 : 0; u.climb = e[10] ? 0.1 : 0;
      if (e[9] >= 0 && !u.finished) { u.finished = true; u.time = e[9]; u.events.push({ t: 'finish', x: u.x, y: u.y }); }
      u.lastNet = now;
    });
  };
  /* move a friend's Punk smoothly toward where it should be by now */
  NET.smooth = function (race, dt) {
    const now = performance.now();
    race.runners.forEach(u => {
      if (!u.remote || !u.net) return;
      const age = Math.min(0.25, (now - u.net.at) / 1000);
      const tx = u.net.x + u.net.vx * age, ty = u.net.y + u.net.vy * age;
      const k = Math.min(1, dt * 14);
      if (Math.hypot(tx - u.x, ty - u.y) > 400) { u.x = tx; u.y = ty; }
      else { u.x += (tx - u.x) * k; u.y += (ty - u.y) * k; }
      u.vx = u.net.vx; u.vy = u.net.vy;
      u.spin += u.vx * dt * 0.02;
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
