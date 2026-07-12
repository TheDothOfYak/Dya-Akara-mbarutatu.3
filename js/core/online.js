/* ============================================================
   DYA'AKARA — core/online.js
   The real online layer: cross-device friends over Supabase.

   Uses plain fetch against Supabase's REST API (PostgREST) — no
   SDK needed for this part. Realtime matches live in netplay.js.

   Every local account gets a permanent online identity the first
   time it goes online: a UUID + a 6-character FRIEND CODE. Two
   players on different computers exchange codes, send requests,
   accept, and then see each other (with live online status) in
   the Friends screen.

   Tables (see supabase/schema.sql): dya_players,
   dya_friend_requests, dya_friends.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util;

  const O = {};
  DYA.online = O;

  const CFG_KEY = 'dyaakara_online_cfg';
  const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
  const HEARTBEAT_MS = 15000;
  const ONLINE_WINDOW_MS = 45000;   // last_seen within this = online
  const AWAY_WINDOW_MS = 5 * 60000; // within this = away

  function cfg() { return (window.DYA_CONFIG && window.DYA_CONFIG.supabase) || {}; }
  O.configured = function () { const c = cfg(); return !!(c.url && c.anonKey); };
  Object.defineProperty(O, 'enabled', { get: () => O.configured() });

  /* ---------- config management (in-game setup panel) ---------- */
  O.saveConfig = function (url, anonKey) {
    url = String(url || '').trim().replace(/\/+$/, '');
    anonKey = String(anonKey || '').trim();
    if (!/^https:\/\/.+/.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(url)) return { err: 'The project URL should look like https://yourproject.supabase.co' };
    if (anonKey.length < 20) return { err: 'That does not look like an anon key. Copy the "anon public" key from Settings → API.' };
    localStorage.setItem(CFG_KEY, JSON.stringify({ url, anonKey }));
    window.DYA_CONFIG.supabase.url = url;
    window.DYA_CONFIG.supabase.anonKey = anonKey;
    O.onAuthChange();
    return { ok: true };
  };
  O.clearConfig = function () { localStorage.removeItem(CFG_KEY); };

  /* ---------- tiny REST client ---------- */
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
  O._rest = rest; // exposed for the setup panel's connection test

  O.testConnection = async function () {
    try {
      await rest('GET', 'dya_players?select=id&limit=1');
      return { ok: true };
    } catch (e) {
      if (e.status === 404 || /relation .* does not exist|Could not find the table/i.test(e.message)) {
        return { err: 'Connected to Supabase, but the game tables are missing. Run supabase/schema.sql in your project’s SQL Editor (see ONLINE_SETUP.md).' };
      }
      if (e.status === 401 || e.status === 403) return { err: 'Supabase rejected the key. Double-check the anon public key.' };
      return { err: 'Could not reach that Supabase project: ' + e.message };
    }
  };

  /* ---------- identity ---------- */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
      const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function genCode() {
    let s = '';
    const a = new Uint32Array(6);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (let i = 0; i < 6; i++) a[i] = Math.floor(Math.random() * 0xffffffff);
    for (let i = 0; i < 6; i++) s += CODE_ALPHABET[a[i] % CODE_ALPHABET.length];
    return s;
  }
  O.me = function () {
    const G = DYA.state;
    return G && G.me && !G.me.ai ? G.me : null;
  };
  O.myCode = function () { const me = O.me(); return me && me.friendCode || null; };
  O.looksLikeCode = function (s) { return /^[a-z0-9]{6}$/i.test(String(s || '').trim()); };

  /* ---------- live state cache (the Friends UI reads this) ---------- */
  O.state = {
    ready: false,       // profile registered this session
    error: null,        // last connection error (string)
    friends: [],        // [{id, name, code, level, avatarIdx, status, lastSeen}]
    incoming: [],       // pending requests to me [{id, fromId, fromName, fromCode, at}]
    outgoing: [],       // my pending requests [{id, toId, toName, toCode, at}]
  };
  const knownIncoming = {};

  function profileStatus(lastSeenIso) {
    const t = Date.parse(lastSeenIso || 0);
    const age = Date.now() - t;
    if (age < ONLINE_WINDOW_MS) return 'online';
    if (age < AWAY_WINDOW_MS) return 'away';
    return 'offline';
  }

  /* ---------- registration & heartbeat ---------- */
  async function ensureRegistered() {
    const me = O.me();
    if (!me || !O.configured()) return false;
    if (!me.netId) { me.netId = uuid(); DYA.state.save(); }
    for (let attempt = 0; attempt < 4; attempt++) {
      if (!me.friendCode) { me.friendCode = genCode(); DYA.state.save(); }
      try {
        await rest('POST', 'dya_players?on_conflict=id', {
          id: me.netId,
          friend_code: me.friendCode,
          name: me.displayName,
          level: me.level,
          avatar_idx: me.avatarIdx || 0,
          last_seen: new Date().toISOString(),
        }, 'resolution=merge-duplicates');
        O.state.ready = true;
        O.state.error = null;
        return true;
      } catch (e) {
        if (e.status === 409 || /duplicate key/i.test(e.message)) { me.friendCode = null; continue; } // code collision — reroll
        O.state.ready = false;
        O.state.error = e.message;
        return false;
      }
    }
    return false;
  }

  async function heartbeat() {
    const me = O.me();
    if (!me || !O.configured()) return;
    if (!O.state.ready) { if (!await ensureRegistered()) return; }
    try {
      await rest('PATCH', 'dya_players?id=eq.' + me.netId, {
        name: me.displayName, level: me.level, avatar_idx: me.avatarIdx || 0,
        last_seen: new Date().toISOString(),
      });
    } catch (e) { O.state.error = e.message; }
  }

  /* ---------- friends & requests ---------- */
  O.lookupCode = async function (code) {
    code = String(code || '').trim().toUpperCase();
    const rows = await rest('GET', 'dya_players?friend_code=eq.' + encodeURIComponent(code) + '&select=*');
    return rows && rows[0] || null;
  };

  O.sendRequest = async function (profile) {
    const me = O.me();
    if (!me || !O.state.ready) return { err: 'Not connected to the online service yet.' };
    if (profile.id === me.netId) return { err: 'That is your own friend code. Hopefully you are already friends.' };
    if (O.state.friends.some(f => f.id === profile.id)) return { err: 'Already friends.' };
    if (O.state.outgoing.some(r => r.toId === profile.id)) return { err: 'Request already sent.' };
    /* if THEY already sent one to us, accept it instead */
    const theirs = O.state.incoming.find(r => r.fromId === profile.id);
    if (theirs) return O.respondRequest(theirs, true).then(() => ({ ok: true, accepted: true }));
    try {
      await rest('POST', 'dya_friend_requests', {
        from_id: me.netId, from_name: me.displayName, from_code: me.friendCode,
        to_id: profile.id, status: 'pending',
      });
    } catch (e) { return { err: 'Could not send the request: ' + e.message }; }
    await O.refresh();
    return { ok: true };
  };

  O.respondRequest = async function (req, accept) {
    const me = O.me();
    if (!me) return { err: 'Not logged in.' };
    try {
      await rest('PATCH', 'dya_friend_requests?id=eq.' + req.id, { status: accept ? 'accepted' : 'declined' });
      if (accept) {
        /* canonical order avoids duplicate mirrored rows */
        const [a, b] = [me.netId, req.fromId].sort();
        await rest('POST', 'dya_friends?on_conflict=a_id,b_id', { a_id: a, b_id: b }, 'resolution=merge-duplicates');
      }
    } catch (e) { return { err: e.message }; }
    await O.refresh();
    return { ok: true };
  };

  O.cancelRequest = async function (req) {
    try { await rest('DELETE', 'dya_friend_requests?id=eq.' + req.id); } catch (e) { return { err: e.message }; }
    await O.refresh();
    return { ok: true };
  };

  O.removeFriend = async function (friendId) {
    const me = O.me();
    if (!me) return { err: 'Not logged in.' };
    const [a, b] = [me.netId, friendId].sort();
    try {
      await rest('DELETE', 'dya_friends?a_id=eq.' + a + '&b_id=eq.' + b);
      /* clear old request rows so a fresh add works cleanly later */
      await rest('DELETE', 'dya_friend_requests?or=(and(from_id.eq.' + me.netId + ',to_id.eq.' + friendId + '),and(from_id.eq.' + friendId + ',to_id.eq.' + me.netId + '))');
    } catch (e) { return { err: e.message }; }
    await O.refresh();
    return { ok: true };
  };

  /* ---------- polling ---------- */
  O.refresh = async function () {
    const me = O.me();
    if (!me || !O.configured() || !O.state.ready) return;
    try {
      const [reqsIn, reqsOut, links] = await Promise.all([
        rest('GET', 'dya_friend_requests?to_id=eq.' + me.netId + '&status=eq.pending&select=*'),
        rest('GET', 'dya_friend_requests?from_id=eq.' + me.netId + '&status=eq.pending&select=*'),
        rest('GET', 'dya_friends?or=(a_id.eq.' + me.netId + ',b_id.eq.' + me.netId + ')&select=*'),
      ]);
      const friendIds = (links || []).map(l => l.a_id === me.netId ? l.b_id : l.a_id);
      const outIds = (reqsOut || []).map(r => r.to_id);
      const needIds = friendIds.concat(outIds);
      let profiles = [];
      if (needIds.length) {
        profiles = await rest('GET', 'dya_players?id=in.(' + needIds.map(encodeURIComponent).join(',') + ')&select=*') || [];
      }
      const byId = {};
      profiles.forEach(p => byId[p.id] = p);
      O.state.friends = friendIds.map(id => {
        const p = byId[id];
        return {
          id, name: p ? p.name : 'Unknown', code: p ? p.friend_code : '?',
          level: p ? p.level : 0, avatarIdx: p ? p.avatar_idx : 0,
          status: p ? profileStatus(p.last_seen) : 'offline',
          lastSeen: p ? p.last_seen : null,
        };
      }).sort((x, y) => x.name.localeCompare(y.name));
      O.state.incoming = (reqsIn || []).map(r => ({ id: r.id, fromId: r.from_id, fromName: r.from_name, fromCode: r.from_code, at: r.created_at }));
      O.state.outgoing = (reqsOut || []).map(r => {
        const p = byId[r.to_id];
        return { id: r.id, toId: r.to_id, toName: p ? p.name : 'player ' + (p && p.friend_code || ''), toCode: p ? p.friend_code : '', at: r.created_at };
      });
      O.state.error = null;
      /* notify on brand-new incoming requests */
      O.state.incoming.forEach(r => {
        if (!knownIncoming[r.id]) {
          knownIncoming[r.id] = true;
          DYA.state.notify({ type: 'social', title: 'Friend request', body: r.fromName + ' (code ' + r.fromCode + ') wants to be friends. Friends → Pending.', icon: '🤝' });
        }
      });
      if (DYA.ui && DYA.ui.onOnlineUpdate) DYA.ui.onOnlineUpdate();
    } catch (e) {
      O.state.error = e.message;
    }
  };

  /* ---------- lifecycle ---------- */
  let timer = null;
  O.onAuthChange = function () {
    clearInterval(timer); timer = null;
    O.state.ready = false;
    O.state.friends = []; O.state.incoming = []; O.state.outgoing = [];
    /* the shared online market rides the same auth lifecycle */
    if (DYA.marketOnline) DYA.marketOnline.onAuthChange();
    /* so do the shared online tournaments */
    if (DYA.tournamentsOnline) DYA.tournamentsOnline.onAuthChange();
    const me = O.me();
    if (!me || !O.configured()) return;
    ensureRegistered().then(ok => { if (ok) O.refresh(); });
    timer = setInterval(() => { heartbeat(); O.refresh(); }, HEARTBEAT_MS);
  };
})();
