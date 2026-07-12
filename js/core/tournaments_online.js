/* ============================================================
   DYA'AKARA — core/tournaments_online.js
   REAL, shared, cross-device tournaments.

   Tournaments are for REAL players. Every device sees the same
   open events (dya_tournaments); friends browse and join them,
   optionally behind a password. Only real players ever hold a
   seat (one row each in dya_tournament_players) — the Dya'kukull
   (AI) are padded in ONLY at start, ONLY to fill the empty seats,
   and NEVER form a tournament by themselves. Because AI are never
   registered, a real player always takes priority over a filler:
   joining an open event seats you in a Dya'kukull's place.

   Titles come from OFFICIAL season tournaments only — those the
   creator makes live from the Admin Panel. Everything else (a
   friend's Friday bracket) plays for gold and glory, not titles.

   Shape compatibility: the online tournament object mirrors the
   local one exactly, and is kept inside G.world.tournaments with
   `online:true`, so the existing browser and bracket screens run
   unchanged. Remote players (and the AI fillers) are materialized
   as light pseudo-accounts in G.world.accounts, keyed by the id
   the shared bracket uses, so `G.world.accounts[pid]` keeps working
   on every device.

   Play model: the shared bracket lives in the row's `data`. Each
   human plays THEIR own matches on their own device and reports the
   result back (first writer wins a human-vs-human pairing). The
   organizer's device resolves the ambient Dya'kukull-vs-Dya'kukull
   pairings and advances rounds. Polling keeps every device in sync —
   the field fills in around you, exactly like the single-device game.

   Offline (no Supabase configured) this layer is dormant and the
   local tournament browser behaves exactly as before.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util;

  const TO = {};
  DYA.tournamentsOnline = TO;

  const POLL_MS = 15000;
  const STALL_FORFEIT_MS = 4 * 60000; // a human match unplayed this long is auto-resolved so the bracket never freezes

  function cfg() { return (window.DYA_CONFIG && window.DYA_CONFIG.supabase) || {}; }
  TO.configured = function () { const c = cfg(); return !!(c.url && c.anonKey); };

  function rest(method, path, body, prefer) {
    const c = cfg();
    return fetch(c.url + '/rest/v1/' + path, {
      method,
      headers: Object.assign({
        'apikey': c.anonKey,
        'Authorization': 'Bearer ' + c.anonKey,
        'Content-Type': 'application/json',
      }, prefer ? { 'Prefer': prefer } : {}),
      body: body != null ? JSON.stringify(body) : undefined,
    }).then(async res => {
      if (res.status === 204) return null;
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (data && (data.message || data.hint || data.error)) || ('HTTP ' + res.status);
        const e = new Error(msg); e.status = res.status; e.data = data;
        throw e;
      }
      return data;
    });
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
      const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function me() {
    const G = DYA.state;
    return G && G.me && !G.me.ai ? G.me : null;
  }
  /* the permanent online identity shared with the friends & market layers */
  function myNetId() {
    const m = me();
    if (!m) return null;
    if (!m.netId) { m.netId = uuid(); DYA.state.save(); }
    return m.netId;
  }
  /* the id my device knows the local player by, inside a mirrored bracket */
  function localizeId(id) { const m = me(); return (m && id === m.netId) ? m.id : id; }
  function netifyId(id) { const m = me(); return (m && id === m.id) ? m.netId : id; }

  /* ---------- password hashing (matches the game's local trust model) ---------- */
  TO.hashPass = function (p) { return p ? String(U.hashStr('dyatrn!' + p + '!akara')) : null; };

  /* ---------- live cache (the UI reads this) ---------- */
  TO.state = {
    rows: [],          // raw dya_tournaments rows (not done)
    error: null,
    lastFetch: 0,
    tablesMissing: false,
  };
  TO.enabled = function () { return TO.configured() && !!me(); };

  /* is a given (mirrored) tournament an online one? */
  TO.isOnline = function (t) { return !!(t && t.online); };

  /* ================= pseudo-accounts ================= */
  /* materialize a roster member (a remote real player, or an AI filler) as a
     light account so the bracket UI and match sim find it in G.world.accounts */
  function ensurePseudo(id, desc) {
    const G = DYA.state;
    const existing = G.world.accounts[id];
    if (existing && !existing.pseudo && !existing.ai) return; // never shadow a real local account
    const toks = {};
    const tokenIds = [];
    (desc.pouch || []).forEach(tk => {
      if (!tk || !tk.id) return;
      toks[tk.id] = tk;
      tokenIds.push(tk.id);
    });
    G.world.accounts[id] = Object.assign(existing && existing.pseudo ? existing : {}, {
      id,
      displayName: desc.name || 'Player',
      level: desc.level || 1,
      rank: desc.rank || 1000,
      avatarIdx: desc.avatarIdx || 0,
      ai: !!desc.ai,
      pseudo: true,
      remote: !desc.ai,
      tokens: toks,
      pouches: [{ id: 'p_' + id, name: (desc.name || 'Player') + '’s Pouch', tokenIds }],
      seal: { avatarIdx: desc.avatarIdx || 0, patterns: ['runes'], locked: true },
      aiCfg: { matchSkill: desc.skill != null ? desc.skill : 0.7 },
      stall: { name: '', trophies: [] },
      stats: { wins: 0, losses: 0, tourneysWon: 0 },
    });
  }

  /* ================= build / refresh the local mirror ================= */
  function circuitFor(row) { return row.circuit || (row.data && row.data.circuit) || 'Local'; }

  /* turn a server row (+ its registration rows) into the local tournament object */
  function buildMirror(row, playerRows) {
    const G = DYA.state, EC = DYA.economy;
    const d = row.data || {};
    const t = Object.assign({}, d, {
      id: row.id,
      online: true,
      onlineId: row.id,
      name: row.name,
      circuit: circuitFor(row),
      sealed: !!row.sealed,
      official: !!row.official,
      hasPassword: !!row.pass_hash,
      organizer: row.organizer_name || d.organizer || 'A player',
      organizerNetId: row.organizer_net_id || d.organizerNetId || null,
      size: row.size || d.size || 8,
      state: row.state,
    });

    const mn = myNetId();

    if (row.state === 'open') {
      /* open: the seat list is the live registration rows (real players only) */
      const regs = (playerRows || []).slice().sort((a, b) => Date.parse(a.joined_at) - Date.parse(b.joined_at));
      t.players = regs.map(r => {
        if (r.net_id !== mn) ensurePseudo(r.net_id, { name: r.name, level: r.level, rank: r.rank, avatarIdx: r.avatar_idx, ai: false, pouch: r.pouch || [] });
        else if ((r.pouch || []).length) t.myPouch = r.pouch.map(x => x.id); // my locked pouch
        return localizeId(r.net_id);
      });
      t.registered = regs.map(r => ({ netId: r.net_id, name: r.name, level: r.level }));
      t.bracket = null;
    } else {
      /* running/done: the roster + bracket in `data` are authoritative */
      const roster = d.roster || {};
      Object.keys(roster).forEach(id => { if (id !== mn) ensurePseudo(id, roster[id]); });
      if (mn && roster[mn] && (roster[mn].pouch || []).length) t.myPouch = roster[mn].pouch.map(x => x.id); // my locked pouch
      t.players = (d.players || []).map(localizeId);
      t.bracket = (d.bracket || null) && d.bracket.map(round => round.map(m2 => m2 && ({
        a: localizeId(m2.a), b: m2.b == null ? null : localizeId(m2.b),
        winner: m2.winner == null ? null : localizeId(m2.winner),
        at: m2.at || null,
      })));
      t.champion = d.champion == null ? null : localizeId(d.champion);
    }
    /* the local player's chosen pouch for this event (kept device-side) */
    const prevMirror = G.world.tournaments[row.id];
    if (prevMirror && prevMirror.online) {
      t.myPouch = prevMirror.myPouch || t.myPouch;
      t.myTitlePicks = prevMirror.myTitlePicks || t.myTitlePicks;
      t.localPaid = prevMirror.localPaid || t.localPaid;
    }
    return t;
  }

  /* am I a seated participant of this mirrored tournament? */
  TO.iAmIn = function (t) {
    const m = me();
    if (!m || !t) return false;
    return (t.players || []).includes(m.id) || (t.registered || []).some(r => r.netId === m.netId);
  };

  let lastSig = '';
  TO.refresh = async function () {
    if (!TO.configured() || !me()) return;
    try {
      const rows = await rest('GET', 'dya_tournaments?state=in.(open,running,done)&select=*&order=created_at.desc&limit=100');
      TO.state.rows = rows || [];
      TO.state.lastFetch = Date.now();
      TO.state.error = null;
      TO.state.tablesMissing = false;

      /* fetch registration rows for OPEN tournaments (seat lists) in one call */
      const openIds = (rows || []).filter(r => r.state === 'open').map(r => r.id);
      let regsById = {};
      if (openIds.length) {
        const regs = await rest('GET', 'dya_tournament_players?tournament_id=in.(' + openIds.map(encodeURIComponent).join(',') + ')&select=*') || [];
        regs.forEach(r => { (regsById[r.tournament_id] = regsById[r.tournament_id] || []).push(r); });
      }

      const G = DYA.state;
      const liveIds = {};
      const now = Date.now();
      (rows || []).forEach(row => {
        /* forget finished events once they've had time to settle everywhere */
        if (row.state === 'done' && Date.parse(row.updated_at || 0) < now - 60 * 60000) return;
        liveIds[row.id] = true;
        const t = buildMirror(row, regsById[row.id]);
        G.world.tournaments[row.id] = t;
        /* a done event I was in, that I didn't finish myself: settle & tell me */
        if (t.state === 'done' && !t.localPaid && TO.iAmIn(t)) {
          const sum = TO.settleLocal(t);
          if (sum) {
            G.notify({ type: 'tournament', title: 'Tournament concluded', body: t.name + ' — ' + (sum.champion ? 'you took the championship!' : sum.championName + ' takes it') + (sum.gold ? ' Your share: ' + U.fmt(sum.gold) + 'g.' : ''), icon: '🏆' });
          }
        }
      });
      /* drop mirrors of online tournaments that vanished/aged out server-side */
      Object.keys(G.world.tournaments).forEach(id => {
        const t = G.world.tournaments[id];
        if (t && t.online && !liveIds[id]) delete G.world.tournaments[id];
      });

      /* keep the field moving: any seated participant resolves the ambient
         Dya'kukull pairings (outcomes are seeded per match, so every device
         agrees). This means an official event the admin merely monitors still
         advances as long as one real entrant is online. */
      for (const row of (rows || [])) {
        if (row.state === 'running' && amParticipant(row)) {
          await resolveAmbient(row).catch(() => {});
        }
      }

      const sig = (rows || []).map(r => r.id + ':' + r.state + ':' + (r.updated_at || '')).join(',');
      if (sig !== lastSig) {
        lastSig = sig;
        if (DYA.ui && DYA.ui.onTournamentsUpdate) DYA.ui.onTournamentsUpdate();
      }
    } catch (e) {
      TO.state.error = e.message;
      if (e.status === 404 || /relation .* does not exist|Could not find the table/i.test(e.message)) TO.state.tablesMissing = true;
    }
  };

  /* ================= CREATE ================= */
  /* def: { name, circuit, size, structure, pouchFormat, entryFee, password,
           official, sealed, aftd, customReward, terrainTokens, rules, arena,
           terrain, titlePool, schedule, myPouch } */
  TO.create = async function (def) {
    const m = me();
    const EC = DYA.economy, L = DYA.lore;
    if (!m) return { err: 'Not logged in.' };
    if (!TO.configured()) return { err: 'Online play is not configured.' };
    const circuit = def.circuit || 'Local';
    const id = U.uid('otrn');
    const data = {
      circuit, name: def.name, sealed: !!def.sealed, official: !!def.official,
      organizer: m.displayName, organizerNetId: myNetId(),
      entryFee: def.entryFee || 0, pouchFormat: def.pouchFormat || 'single',
      size: def.size || 8, structure: def.structure || 'single',
      aftd: !!def.aftd, customReward: def.customReward || { gold: 0, tokenId: null },
      terrainTokens: def.terrainTokens || [],
      titlePool: def.official ? (def.titlePool || (EC.TITLES.filter(tt => tt.tier === circuit || (circuit === 'Whole Planet' && tt.tier === 'Planet')).map(tt => tt.id))) : [],
      rules: def.rules ? def.rules.slice() : [],
      arena: def.arena || (L.ARENAS[circuit] ? L.ARENAS[circuit][0] : 'Arena'),
      terrain: def.terrain || 'plains',
      minLevel: EC.CIRCUIT_MIN_LEVEL[circuit] || 1,
      createdAt: Date.now(),
      schedule: def.schedule || 'Rolling — matches play when the bracket fills',
      state: 'open', roster: {}, bracket: null, players: [], champion: null,
    };
    if (data.aftd) data.rules.push('Aftð — Active Tokens: XP, growth, and behavior persist across the tournament.');
    if (data.structure === 'rr') data.rules.push('Round robin: most match wins takes the championship.');
    try {
      await rest('POST', 'dya_tournaments', {
        id, name: def.name, circuit, state: 'open', official: !!def.official, sealed: !!def.sealed,
        organizer_net_id: myNetId(), organizer_name: m.displayName, size: data.size,
        pass_hash: TO.hashPass(def.password), data,
      });
    } catch (e) {
      if (e.status === 404 || /relation .* does not exist|Could not find the table/i.test(e.message)) return { err: 'The online tournament tables are missing — re-run supabase/schema.sql.' };
      return { err: 'Could not create the tournament: ' + e.message };
    }
    /* the organizer takes the first seat (an official event the admin may run without playing) */
    let joinErr = null;
    if (!def.adminHostOnly) {
      const r = await TO.join({ id, hasPassword: !!def.password, entryFee: 0, minLevel: data.minLevel, size: data.size, official: !!def.official }, def.myPouch || [], def.password, { skipFee: true, skipLevel: true });
      if (r.err) joinErr = r.err;
    }
    await TO.refresh();
    return { ok: true, id, joinErr };
  };

  /* ================= JOIN (seat a real player — atomic) ================= */
  TO.join = async function (t, pouch, password, opts) {
    opts = opts || {};
    const m = me();
    if (!m) return { err: 'Not logged in.' };
    if (!TO.configured()) return { err: 'Online play is not configured.' };
    if (t.state && t.state !== 'open') return { err: 'That tournament has already started.' };
    if (!opts.skipLevel && m.level < (t.minLevel || 1)) return { err: 'This circuit needs level ' + (t.minLevel || 1) + '.' };
    /* password gate */
    if (t.hasPassword) {
      const row = TO.state.rows.find(r => r.id === (t.onlineId || t.id));
      const need = row ? row.pass_hash : undefined;
      if (need && TO.hashPass(password) !== need) return { err: 'Wrong tournament password.' };
    }
    const fee = t.entryFee || 0;
    if (!opts.skipFee && fee > 0 && m.gold < fee) return { err: 'Entry is ' + U.fmt(fee) + 'g.' };
    const pouchToks = (pouch || []).map(x => (x && x.id ? x : m.tokens[x])).filter(Boolean);
    try {
      await rest('POST', 'dya_tournament_players', {
        tournament_id: t.onlineId || t.id, net_id: myNetId(),
        name: m.displayName, level: m.level, rank: m.rank || 1000, avatar_idx: m.avatarIdx || 0,
        pouch: pouchToks,
      });
    } catch (e) {
      if (e.status === 409 || /duplicate key/i.test(e.message)) return { err: 'You are already registered for this tournament.' };
      return { err: 'Could not join: ' + e.message };
    }
    if (!opts.skipFee && fee > 0) { m.gold -= fee; DYA.state.save(); }
    /* remember my pouch for this event, device-side */
    const mir = DYA.state.world.tournaments[t.onlineId || t.id];
    if (mir) mir.myPouch = pouchToks.map(x => x.id);
    await TO.refresh();
    return { ok: true };
  };

  /* ================= LEAVE (only while open) ================= */
  TO.leave = async function (t) {
    const m = me();
    if (!m) return { err: 'Not logged in.' };
    if (t.state && t.state !== 'open') return { err: 'You can only withdraw before it starts.' };
    try {
      await rest('DELETE', 'dya_tournament_players?tournament_id=eq.' + encodeURIComponent(t.onlineId || t.id) + '&net_id=eq.' + encodeURIComponent(myNetId()));
    } catch (e) { return { err: e.message }; }
    if ((t.entryFee || 0) > 0) { m.gold += t.entryFee; DYA.state.save(); } // refund
    await TO.refresh();
    return { ok: true };
  };

  /* ================= START ("go live") ================= */
  /* seats the real registrants, pads the rest with Dya'kukull fillers, builds
     the bracket, and flips the event to running. Refuses an all-AI field. */
  TO.start = async function (t) {
    const G = DYA.state, EC = DYA.economy, SP = DYA.species, TK = DYA.token, L = DYA.lore;
    if (!TO.configured()) return { err: 'Online play is not configured.' };
    const id = t.onlineId || t.id;
    let regs;
    try {
      regs = await rest('GET', 'dya_tournament_players?tournament_id=eq.' + encodeURIComponent(id) + '&select=*') || [];
    } catch (e) { return { err: 'Could not read the entrants: ' + e.message }; }
    if (!regs.length) return { err: 'A tournament needs at least one real player — the Dya’kukull never run one by themselves.' };

    const rng = new U.Rng(U.newSeed());
    const size = t.size || Math.max(4, Math.pow(2, Math.ceil(Math.log2(regs.length))));
    const roster = {};
    const ids = [];
    /* real players first — they always take priority over any filler */
    regs.sort((a, b) => Date.parse(a.joined_at) - Date.parse(b.joined_at)).slice(0, size).forEach(r => {
      roster[r.net_id] = { name: r.name, level: r.level, rank: r.rank, avatarIdx: r.avatar_idx, ai: false, pouch: r.pouch || [] };
      ids.push(r.net_id);
    });
    /* Dya'kukull fill the remaining empty seats, drawn near the circuit level */
    const minLv = EC.CIRCUIT_MIN_LEVEL[t.circuit] || 1;
    const aiPool = Object.values(G.world.accounts).filter(a => a.ai && !a.pseudo && a.level >= minLv);
    let fillN = 0;
    while (ids.length < size) {
      const pick = aiPool.length ? rng.pick(aiPool) : null;
      const aid = 'aifill_' + (fillN++);
      const name = pick ? pick.displayName : DYA.lore.genName(rng);
      const pouch = pick ? aiPouch(pick) : [];
      roster[aid] = { name, level: pick ? pick.level : Math.max(minLv, rng.int(minLv, minLv + 12)), rank: pick ? pick.rank : 1000, avatarIdx: pick ? pick.avatarIdx : rng.int(0, 16), ai: true, skill: pick ? (G.aiSkill ? G.aiSkill(pick) : 0.7) : 0.7, pouch };
      ids.push(aid);
    }

    const order = rng.shuffle(ids);
    let bracket;
    if (t.structure === 'rr') {
      const round = [];
      for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) round.push({ a: order[i], b: order[j], winner: null });
      bracket = [round];
    } else {
      bracket = [order.map((p, i) => i % 2 === 0 ? { a: order[i], b: order[i + 1] || null, winner: order[i + 1] ? null : order[i], at: order[i + 1] ? null : Date.now() } : null).filter(Boolean)];
    }

    const row = TO.state.rows.find(r => r.id === id);
    const data = Object.assign({}, (row && row.data) || {}, {
      roster, bracket, players: order, state: 'running', size,
      pot: (t.entryFee || 0) * regs.length, startedAt: Date.now(),
    });
    try {
      await rest('PATCH', 'dya_tournaments?id=eq.' + encodeURIComponent(id), {
        state: 'running', size, data, updated_at: new Date().toISOString(),
      });
    } catch (e) { return { err: 'Could not start: ' + e.message }; }
    await TO.refresh();
    return { ok: true, fillers: fillN, reals: Math.min(regs.length, size) };
  };

  /* ================= REPORT a played match ================= */
  /* the local human just finished their match: write the winner back (in net-id
     space). A human-vs-human pairing is decided by whoever reports first. */
  TO.reportMatch = async function (t, roundIdx, matchIdx, winnerLocalId) {
    const id = t.onlineId || t.id;
    let row;
    try {
      const rows = await rest('GET', 'dya_tournaments?id=eq.' + encodeURIComponent(id) + '&select=*');
      row = rows && rows[0];
    } catch (e) { return { err: e.message }; }
    if (!row || row.state !== 'running') return { err: 'Tournament is not running.' };
    const d = row.data || {};
    const mt = d.bracket && d.bracket[roundIdx] && d.bracket[roundIdx][matchIdx];
    if (!mt) return { err: 'That match is gone.' };
    let already = false;
    if (mt.winner) { already = true; } // someone reported this pairing first
    else { mt.winner = netifyId(winnerLocalId); mt.at = Date.now(); advance(d); }
    if (!already) {
      try {
        await rest('PATCH', 'dya_tournaments?id=eq.' + encodeURIComponent(id), { state: d.state, data: d, updated_at: new Date().toISOString() });
      } catch (e) { return { err: e.message }; }
    }
    /* rebuild THIS event's mirror directly (a done event isn't re-fetched by the
       open/running poll, so the caller can still settle & show the result) */
    row.data = d; row.state = d.state;
    const mir = buildMirror(row, null);
    DYA.state.world.tournaments[id] = mir;
    if (DYA.ui && DYA.ui.onTournamentsUpdate) DYA.ui.onTournamentsUpdate();
    return { ok: true, already, mir, done: d.state === 'done' };
  };

  /* ================= organizer: resolve ambient AI pairings ================= */
  async function resolveAmbient(row) {
    const d = row.data || {};
    if (!d.bracket || row.state !== 'running') return;
    const roster = d.roster || {};
    const isAi = id => id == null || (roster[id] && roster[id].ai);
    let changed = false;
    const last = d.bracket[d.bracket.length - 1];
    last.forEach(mt => {
      if (!mt || mt.winner) return;
      if (mt.b == null) { mt.winner = mt.a; mt.at = mt.at || Date.now(); changed = true; return; } // bye
      const bothAi = isAi(mt.a) && isAi(mt.b);
      const stale = mt.at == null ? false : (Date.now() - mt.at > STALL_FORFEIT_MS);
      /* AI-vs-AI resolves on its own; a human match only auto-resolves if it has
         been left hanging long enough that the bracket would otherwise freeze */
      if (bothAi || (stale && (isAi(mt.a) || isAi(mt.b)))) {
        mt.winner = simWinner(row.id, roster, mt.a, mt.b); mt.at = Date.now(); changed = true;
      } else if (mt.at == null) { mt.at = Date.now(); changed = true; } // start the clock
    });
    if (advance(d)) changed = true;
    if (changed) {
      try {
        await rest('PATCH', 'dya_tournaments?id=eq.' + encodeURIComponent(row.id), { state: d.state, data: d, updated_at: new Date().toISOString() });
        row.data = d; row.state = d.state;
      } catch (e) { /* retried next poll */ }
    }
  }

  function amParticipant(row) {
    const mn = myNetId();
    if (!mn) return false;
    const d = row.data || {};
    if (d.roster && d.roster[mn]) return true;
    return (d.players || []).includes(mn);
  }

  /* deterministic per-match outcome so every device that resolves an ambient
     pairing computes the SAME winner (no divergence when several are online) */
  /* an AI filler's pouch — uses the play helper when present (game client),
     else reads the account's own pouch directly (admin panel) */
  function aiPouch(acc) {
    if (DYA.play && DYA.play.accountPouch) return DYA.play.accountPouch(acc).slice(0, 15);
    const ids = (acc.pouches && acc.pouches[0]) ? acc.pouches[0].tokenIds : Object.keys(acc.tokens || {}).slice(0, 15);
    return ids.map(id => acc.tokens[id]).filter(Boolean).slice(0, 15);
  }

  function simWinner(rowId, roster, a, b) {
    if (a == null) return b; if (b == null) return a;
    const ra = (roster[a] && roster[a].rank) || 1000;
    const rb = (roster[b] && roster[b].rank) || 1000;
    const pa = 1 / (1 + Math.pow(10, (rb - ra) / 400));
    const rng = new U.Rng(U.hashStr(rowId + '|' + a + '|' + b));
    return rng.next() < pa ? a : b;
  }

  /* advance the shared bracket in net-id space; sets d.state='done' + d.champion */
  function advance(d) {
    if (!d.bracket) return false;
    if (d.structure === 'rr') {
      if (d.bracket[0].every(m2 => m2.winner)) {
        const wins = {};
        d.bracket[0].forEach(m2 => { if (m2.winner) wins[m2.winner] = (wins[m2.winner] || 0) + 1; });
        d.champion = (d.players || []).slice().sort((a, b) => (wins[b] || 0) - (wins[a] || 0))[0];
        if (d.state !== 'done') { d.state = 'done'; d.doneAt = Date.now(); return true; }
      }
      return false;
    }
    const last = d.bracket[d.bracket.length - 1];
    if (last.length === 1 && last[0].winner) {
      if (d.state !== 'done') { d.state = 'done'; d.champion = last[0].winner; d.doneAt = Date.now(); return true; }
      return false;
    }
    if (last.length > 1 && last.every(m => m.winner)) {
      const next = [];
      for (let i = 0; i < last.length; i += 2) {
        const a = last[i].winner, b = last[i + 1] ? last[i + 1].winner : null;
        next.push({ a, b, winner: b ? null : a, at: b ? null : Date.now() });
      }
      d.bracket.push(next);
      return true;
    }
    return false;
  }

  /* ================= completion payout (device-local) =================
     Each device settles ITS OWN player once, from the final standings. Titles
     are granted only by OFFICIAL season tournaments. Returns a summary for the
     champion/placement modal, or null if there is nothing to settle. */
  TO.settleLocal = function (t) {
    const G = DYA.state, EC = DYA.economy;
    const m = me();
    if (!m || !t || t.state !== 'done' || t.localPaid) return null;
    if (!TO.iAmIn(t)) { t.localPaid = true; return null; }
    t.localPaid = true;
    const pool = t.pot != null ? t.pot : (t.entryFee || 0) * ((t.players && t.players.length) || 0);
    let placement = 99;
    const champ = t.champion;
    if (champ === m.id) placement = 1;
    else if (t.structure === 'rr' && t.bracket) {
      const wins = {}; t.bracket[0].forEach(x => { if (x.winner) wins[x.winner] = (wins[x.winner] || 0) + 1; });
      const order = (t.players || []).slice().sort((a, b) => (wins[b] || 0) - (wins[a] || 0));
      const idx = order.indexOf(m.id); placement = idx >= 0 ? idx + 1 : 99;
    } else if (t.bracket && t.bracket.length) {
      const finalM = t.bracket[t.bracket.length - 1][0];
      if (finalM && (finalM.a === m.id || finalM.b === m.id)) placement = 2;
      else {
        const semis = t.bracket.length > 1 ? t.bracket[t.bracket.length - 2] : null;
        if (semis && semis.some(x => x.a === m.id || x.b === m.id)) placement = 3;
      }
    }
    let gold = 0, xp = 0;
    if (placement === 1) { gold = Math.round(pool * 0.6) + (EC.CIRCUIT_GOLD[t.circuit] || 0) + ((t.customReward && t.customReward.gold) || 0); xp = EC.CIRCUIT_XP[t.circuit] || 0; }
    else if (placement === 2) { gold = Math.round(pool * 0.25); xp = Math.round((EC.CIRCUIT_XP[t.circuit] || 0) * 0.3); }
    else if (placement === 3) { gold = Math.round(pool * 0.05); xp = Math.round((EC.CIRCUIT_XP[t.circuit] || 0) * 0.15); }
    if (gold) G.addGold(gold, true);
    if (placement === 1) {
      m.stats.tourneysWon = (m.stats.tourneysWon || 0) + 1;
      if (G.grantAchievement) G.grantAchievement('tourney_win');
      G.world.season.winners.push({ name: m.displayName, circuit: t.circuit, tournament: t.name, at: Date.now() });
      /* a bigger official win earns a Hunt slot, as in the local circuits */
      if (t.official && EC.CIRCUITS.indexOf(t.circuit) >= 1) {
        m.huntSlots.push({ id: U.uid('hs'), huntId: null, source: 'tournament', expiresAtBand: Math.floor(m.level / 10) * 10 + 10 });
      }
    }
    /* titles come from OFFICIAL season tournaments only */
    const titlePool = (placement === 1 && t.official) ? (t.titlePool || []).map(id => EC.TITLES.find(x => x.id === id)).filter(Boolean) : [];
    G.save();
    return { placement, gold, xp, champion: placement === 1, official: !!t.official, titlePool, championName: (G.world.accounts[champ] || {}).displayName || '—' };
  };

  /* ================= ADMIN ================= */
  /* create an OFFICIAL season tournament from the Admin Panel — the Guild
     hosts it (no player seat), real players join from their own devices, and
     only official events award titles. */
  TO.adminCreate = async function (def) {
    const EC = DYA.economy, L = DYA.lore;
    if (!TO.configured()) return { err: 'Online play is not configured.' };
    const circuit = def.circuit || 'Local';
    const id = U.uid('otrn');
    const data = {
      circuit, name: def.name, sealed: true, official: true,
      organizer: 'Dya Guild', organizerNetId: 'guild:admin',
      entryFee: def.entryFee || 0, pouchFormat: def.pouchFormat || 'three-draft',
      size: def.size || 8, structure: def.structure || 'single',
      aftd: false, customReward: { gold: def.bonusGold || 0, tokenId: null },
      terrainTokens: [],
      titlePool: def.titlePool || EC.TITLES.filter(tt => tt.tier === circuit || (circuit === 'Whole Planet' && tt.tier === 'Planet')).map(tt => tt.id),
      rules: [], arena: (L.ARENAS[circuit] ? L.ARENAS[circuit][0] : 'Arena'),
      terrain: def.terrain || 'plains', minLevel: EC.CIRCUIT_MIN_LEVEL[circuit] || 1,
      createdAt: Date.now(), schedule: def.schedule || 'Official season event',
      state: 'open', roster: {}, bracket: null, players: [], champion: null,
    };
    try {
      await rest('POST', 'dya_tournaments', {
        id, name: def.name, circuit, state: 'open', official: true, sealed: true,
        organizer_net_id: 'guild:admin', organizer_name: 'Dya Guild', size: data.size,
        pass_hash: TO.hashPass(def.password), data,
      });
    } catch (e) {
      if (e.status === 404 || /relation .* does not exist|Could not find the table/i.test(e.message)) return { err: 'The online tournament tables are missing — re-run supabase/schema.sql.' };
      return { err: e.message };
    }
    return { ok: true, id };
  };

  TO.adminFetchAll = async function () {
    if (!TO.configured()) return [];
    return rest('GET', 'dya_tournaments?select=*&order=created_at.desc&limit=200') || [];
  };
  TO.adminFetchPlayers = async function (id) {
    if (!TO.configured()) return [];
    return rest('GET', 'dya_tournament_players?tournament_id=eq.' + encodeURIComponent(id) + '&select=net_id,name,level,rank,joined_at&order=joined_at.asc') || [];
  };
  TO.adminDelete = async function (id) {
    await rest('DELETE', 'dya_tournaments?id=eq.' + encodeURIComponent(id));
    return { ok: true };
  };

  /* ================= LIFECYCLE ================= */
  let timer = null;
  TO.onAuthChange = function () {
    clearInterval(timer); timer = null;
    /* clear any stale online mirrors from a previous session */
    const G = DYA.state;
    if (G && G.world && G.world.tournaments) {
      Object.keys(G.world.tournaments).forEach(id => { if (G.world.tournaments[id] && G.world.tournaments[id].online) delete G.world.tournaments[id]; });
    }
    if (!me() || !TO.configured()) return;
    TO.refresh();
    timer = setInterval(() => { TO.refresh(); }, POLL_MS);
  };
})();
