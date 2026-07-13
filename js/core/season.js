/* ============================================================
   DYA'AKARA — core/season.js
   The Guild's OFFICIAL SEASON — one long ranked ladder.

   Unlike a one-off bracket, the season is a circuit you climb.
   Everyone starts in their LOCAL circuit and plays other players
   there; winning raises your ranked rating, and enough rating
   PROMOTES you up a circuit (Local → Regional → Half Planet →
   Whole Planet → Interplanetary). Titles are earned by reaching
   each circuit — official-season only.

   A match is ALWAYS available. When you look for one, the game
   pairs you with another real player in your circuit who is also
   searching (an atomic claim over a shared queue, then a live
   cross-device match); if nobody is searching this instant, a
   Dya'kukull of your circuit fills in so you never wait.

   The shared leaderboard reads real ratings off dya_players
   (synced by the online heartbeat). Offline, the ladder still
   runs locally against the Dya'kukull.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util;

  const S = {};
  DYA.season = S;

  const FRESH_MS = 25000; // a queue row older than this is treated as abandoned

  function cfg() { return (window.DYA_CONFIG && window.DYA_CONFIG.supabase) || {}; }
  S.configured = function () { const c = cfg(); return !!(c.url && c.anonKey); };

  function rest(method, path, body, prefer) {
    const c = cfg();
    return fetch(c.url + '/rest/v1/' + path, {
      method,
      headers: Object.assign({
        'apikey': c.anonKey, 'Authorization': 'Bearer ' + c.anonKey, 'Content-Type': 'application/json',
      }, prefer ? { 'Prefer': prefer } : {}),
      body: body != null ? JSON.stringify(body) : undefined,
    }).then(async res => {
      if (res.status === 204) return null;
      const data = await res.json().catch(() => null);
      if (!res.ok) { const e = new Error((data && (data.message || data.hint)) || ('HTTP ' + res.status)); e.status = res.status; throw e; }
      return data;
    });
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => { const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
  }
  function me() { const G = DYA.state; return G && G.me && !G.me.ai ? G.me : null; }
  function myNetId() { const m = me(); if (!m) return null; if (!m.netId) { m.netId = uuid(); DYA.state.save(); } return m.netId; }

  S.enabled = function () { return S.configured() && !!me(); };
  S.netId = function () { return myNetId(); };

  /* the season only runs once the organizer (admin) has opened it. Offline /
     solo play keeps a local ladder open; online play waits for the shared
     "season live" flag the admin broadcasts through dya_config. */
  S.isOpen = function () {
    if (!S.configured()) return true; // offline: your local circuit ladder is always available
    return DYA.mods && DYA.mods.seasonLive ? DYA.mods.seasonLive() : false;
  };

  /* ---------- circuit standing (derived from your ranked rating) ---------- */
  S.circuit = function (acc) { return DYA.economy.circuitForRank((acc || me() || {}).rank || 0); };
  S.circuitIndex = function (acc) { return DYA.economy.CIRCUITS.indexOf(S.circuit(acc)); };

  /* ---------- promotion: award an official title the first time you reach a
     circuit this season. Returns { promoted, toCircuit, titlePool } or null. --- */
  S.checkPromotion = function (prevRank) {
    const m = me(); if (!m) return null;
    const EC = DYA.economy;
    const before = EC.circuitIndexForRank(prevRank);
    const after = EC.circuitIndexForRank(m.rank);
    if (after <= before) return null;
    m.seasonReached = m.seasonReached || [];
    const toCircuit = EC.CIRCUITS[after];
    if (m.seasonReached.includes(after)) { DYA.state.save(); return { promoted: true, toCircuit, titlePool: [] }; }
    m.seasonReached.push(after);
    DYA.state.save();
    const titlePool = EC.TITLES.filter(tt => tt.tier === toCircuit || (toCircuit === 'Whole Planet' && tt.tier === 'Planet')).slice(0, 6);
    return { promoted: true, toCircuit, titlePool };
  };

  /* ---------- an appropriate Dya'kukull for your circuit (always available) --- */
  S.aiOpponentFor = function (circuit) {
    const G = DYA.state, EC = DYA.economy;
    const minLv = EC.CIRCUIT_MIN_LEVEL[circuit] || 1;
    const i = EC.CIRCUITS.indexOf(circuit);
    const maxLv = i + 1 < EC.CIRCUITS.length ? (EC.CIRCUIT_MIN_LEVEL[EC.CIRCUITS[i + 1]] + 8) : 999;
    let pool = Object.values(G.world.accounts).filter(a => a.ai && !a.pseudo && a.level >= minLv && a.level <= maxLv);
    if (!pool.length) pool = Object.values(G.world.accounts).filter(a => a.ai && !a.pseudo && a.level >= minLv);
    if (!pool.length) pool = Object.values(G.world.accounts).filter(a => a.ai && !a.pseudo);
    const rng = new U.Rng(U.newSeed());
    return pool.length ? rng.pick(pool) : null;
  };

  /* ---------- live matchmaking over the shared queue ----------
     Returns one of:
       { pairing: { roomCode, oppNet, oppName, oppPouch, oppRank, hostNet, guestNet } }
       { waiting: true }   — in queue, nobody to pair with yet
       { err }             — transient error (caller keeps polling)
     Call it repeatedly (~every 2s) while the player searches. */
  S.poll = async function (pouch) {
    const m = me();
    if (!m || !S.configured()) return { err: 'offline' };
    const myNet = myNetId();
    const circuit = S.circuit(m);
    const season = DYA.state.world.season.number;
    const nowIso = new Date().toISOString();

    /* has someone already claimed me since last poll? */
    try {
      const mineRows = await rest('GET', 'dya_season_queue?net_id=eq.' + encodeURIComponent(myNet) + '&select=*');
      const mine = mineRows && mineRows[0];
      if (mine && mine.status === 'matched' && mine.opponent_net_id && mine.room_code) {
        const opp = await fetchQueueRow(mine.opponent_net_id);
        return { pairing: makePairing(myNet, mine.room_code, opp || { net_id: mine.opponent_net_id, name: 'Player', pouch: [] }) };
      }
    } catch (e) { return { err: e.message }; }

    /* refresh / insert my seeking row WITHOUT clobbering a concurrent claim
       (status / opponent_net_id / room_code are intentionally omitted, so
       merge-duplicates leaves an existing claim untouched and a new row
       defaults to seeking) */
    try {
      await rest('POST', 'dya_season_queue?on_conflict=net_id', {
        net_id: myNet, name: m.displayName, level: m.level, rank: m.rank || 1000,
        avatar_idx: m.avatarIdx || 0, circuit, season, pouch: pouch || [], updated_at: nowIso,
      }, 'resolution=merge-duplicates');
    } catch (e) { return { err: e.message }; }

    /* try to CLAIM a waiting peer in my circuit */
    try {
      const rows = await rest('GET', 'dya_season_queue?circuit=eq.' + encodeURIComponent(circuit) + '&status=eq.seeking&select=*&order=updated_at.asc&limit=20') || [];
      const cutoff = Date.now() - FRESH_MS;
      const peers = rows.filter(r => r.net_id !== myNet && !r.opponent_net_id && Date.parse(r.updated_at || 0) > cutoff && r.season === season);
      for (const peer of peers) {
        const code = DYA.netplay ? DYA.netplay.genRoomCode() : ('R' + (U.hashStr(myNet + peer.net_id) & 0xffff).toString(36));
        let claimed;
        try {
          claimed = await rest('PATCH',
            'dya_season_queue?net_id=eq.' + encodeURIComponent(peer.net_id) + '&status=eq.seeking&opponent_net_id=is.null',
            { status: 'matched', opponent_net_id: myNet, room_code: code, updated_at: new Date().toISOString() },
            'return=representation');
        } catch (e) { continue; }
        if (claimed && claimed.length) {
          /* I won the pairing — record it on my own row too, then meet in the room */
          await rest('PATCH', 'dya_season_queue?net_id=eq.' + encodeURIComponent(myNet),
            { status: 'matched', opponent_net_id: peer.net_id, room_code: code, updated_at: new Date().toISOString() }).catch(() => {});
          return { pairing: makePairing(myNet, code, claimed[0]) };
        }
      }
    } catch (e) { return { err: e.message }; }
    return { waiting: true };
  };

  function makePairing(myNet, roomCode, oppRow) {
    return {
      roomCode, oppNet: oppRow.net_id, oppName: oppRow.name || 'Player',
      oppPouch: oppRow.pouch || [], oppRank: oppRow.rank || 1000,
      hostNet: myNet < oppRow.net_id ? myNet : oppRow.net_id,
      guestNet: myNet < oppRow.net_id ? oppRow.net_id : myNet,
    };
  }
  async function fetchQueueRow(netId) {
    try { const r = await rest('GET', 'dya_season_queue?net_id=eq.' + encodeURIComponent(netId) + '&select=*'); return r && r[0]; }
    catch (e) { return null; }
  }

  /* leave the queue (best effort) */
  S.dequeue = async function () {
    const myNet = me() && me().netId;
    if (!myNet || !S.configured()) return;
    try { await rest('DELETE', 'dya_season_queue?net_id=eq.' + encodeURIComponent(myNet)); } catch (e) { }
  };

  /* ---------- shared leaderboard (real ratings off dya_players) ---------- */
  S.leaderboard = async function (limit) {
    if (!S.configured()) return null;
    try {
      return await rest('GET', 'dya_players?select=id,name,level,rank,avatar_idx&order=rank.desc&limit=' + (limit || 20)) || [];
    } catch (e) { return null; }
  };

  /* ---------- lifecycle ---------- */
  S.onAuthChange = function () { S.dequeue(); };
})();
