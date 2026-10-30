/* ============================================================
   FLAKE GAMES — js/flake/account.js
   One account for every game on the site.

   The account IS the old Dya'Akara account: the same row in
   dya_accounts, the same email + password, the same id. Nothing is
   migrated, so everyone who already played keeps what they have.

   Signing in happens once, on the Flake Games home page
   (index.html). The page remembers who you are in this browser
   (localStorage 'flake-session': id, email, name and the password
   hash the account row already stores — never the password), and
   every game reads it:

     FLAKE.gate(gameId)   on a main game's page: no session → off to
                          the home page to sign in, then straight back;
                          banned from this game → a blocking notice.
                          (Mini games let a guest play without one.)

   Bans come in two kinds (both shown on the Admin Panel):
     • Dya'Akara's own ban (dya_bans) — scope 'game', as before.
     • every other scope, incl. 'all' (every game at once), lives
       per account in dya_config under 'ban:<account id>':
         { all: {...}, rpg: {...}, '4bw': {...}, ld: {...} }
       each { reason, permanent, until, at }.

   The home page's editable text (the studio name, each game's
   tagline) is dya_config 'flake_hub', edited in the Admin Panel.

   Standalone on purpose: needs only js/config.js, so any page can
   include it. Game ids match the live-broadcast targets
   (js/core/broadcast.js).
   ============================================================ */
(function () {
  'use strict';
  const SESSION_KEY = 'flake-session';
  const HUB_CACHE_KEY = 'flake-hub-cache';
  const HUB_KEY = 'flake_hub';

  /* where the site root is, from this script's own address (js/flake/account.js) */
  const SELF = (document.currentScript && document.currentScript.src) || '';
  const ROOT = SELF ? SELF.replace(/js\/flake\/account\.js(\?.*)?$/, '') : './';

  const GAMES = [
    { id: 'game', name: 'Dya’Akara', href: 'dya-akara.html', tagline: 'The token game of the Mbaru Tatu' },
    { id: 'rpg', name: 'Torcain’s Run', href: 'rpg/index.html', tagline: 'A 3D adventure across the Tatu' },
    { id: '4bw', name: 'The 4 Brothers Worlds', href: 'four-brothers-world/index.html', tagline: 'Dig, build and explore together' },
  ];
  const MINI = [
    { id: 'ld', name: 'Little Dungeon', href: 'mini-games/little-dungeon/index.html', tagline: 'A tiny card-battling dungeon crawl' },
  ];
  const SCOPES = [['all', 'Every game']].concat(GAMES.concat(MINI).map(g => [g.id, g.name]));

  const FLAKE = { ROOT, GAMES, MINI, SCOPES, DEFAULT_STUDIO: 'Flake Games' };
  window.FLAKE = FLAKE;

  function cfg() { const c = window.DYA_CONFIG && window.DYA_CONFIG.supabase; return c && c.url && c.anonKey ? c : null; }
  FLAKE.configured = () => !!cfg();

  function rest(method, path, body, prefer) {
    const c = cfg();
    if (!c) return Promise.reject(new Error('Online is not set up for this site.'));
    return fetch(c.url + '/rest/v1/' + path, {
      method,
      headers: Object.assign({ apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey, 'Content-Type': 'application/json' }, prefer ? { Prefer: prefer } : {}),
      body: body != null ? JSON.stringify(body) : undefined,
    }).then(async res => {
      if (res.status === 204) return null;
      const data = await res.json().catch(() => null);
      if (!res.ok) { const e = new Error((data && (data.message || data.hint)) || 'HTTP ' + res.status); e.status = res.status; throw e; }
      return data;
    });
  }
  FLAKE.rest = rest;

  /* the same password hash as js/core/state.js (FNV-1a over a salted string) */
  FLAKE.hashPass = function (p) {
    const s = 'dya!' + p + '!akara';
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return String(h >>> 0);
  };
  function uid(prefix) { return prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36) + '_' + Math.floor(Math.random() * 46656).toString(36); }
  const BAD = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'bitch', 'dick', 'cock', 'ass\\b', 'rape'];
  function nameOk(n) { const low = n.toLowerCase(); return !BAD.some(w => new RegExp(w).test(low)); }

  /* ================= the session in this browser ================= */
  FLAKE.session = function () {
    try {
      const v = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      return v && v.id && v.email ? v : null;
    } catch (e) { return null; }
  };
  function setSession(who) {
    const s = { id: who.id, email: who.email, name: who.name, passHash: who.passHash, at: Date.now() };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* private mode: this tab only */ }
    return s;
  }
  FLAKE.setSession = setSession;
  FLAKE.signOut = function () {
    try {
      const s = FLAKE.session();
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('torcain-identity');   // Torcain's Run's old sign-in, from before Flake Games
      if (s) localStorage.removeItem('dya:session:' + s.id);   // Dya'Akara's one-tab slot
    } catch (e) { /* ignore */ }
  };

  FLAKE.signIn = async function (email, pass) {
    if (!cfg()) return { err: 'Online accounts are not set up for this site.' };
    email = String(email || '').trim().toLowerCase();
    if (!email) return { err: 'Enter your email.' };
    let rows;
    try { rows = await rest('GET', 'dya_accounts?email=eq.' + encodeURIComponent(email) + '&select=id,email,pass_hash,name:data->>displayName'); }
    catch (e) { return { err: 'Could not reach the account service: ' + e.message }; }
    const r = rows && rows[0];
    if (!r) return { err: 'No account found with that email.' };
    if (r.pass_hash !== FLAKE.hashPass(pass)) return { err: 'Incorrect password.' };
    return { who: setSession({ id: r.id, email: r.email, name: r.name || r.email.split('@')[0], passHash: r.pass_hash }) };
  };

  /* A new account starts as a bare row: email, password, display name.
     Each game fills in its own part the first time it is opened
     (Dya'Akara asks for an appearance and a home region, then runs its
     tutorial — see state.js G.resumeSession). */
  FLAKE.createAccount = async function (email, pass, name) {
    if (!cfg()) return { err: 'Online accounts are not set up for this site.' };
    email = String(email || '').trim().toLowerCase();
    name = String(name || '').trim();
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) return { err: 'A real-looking email, please.' };
    if (String(pass || '').length < 4) return { err: 'Password must be at least 4 characters.' };
    if (name.length < 2 || name.length > 20) return { err: 'Display name must be 2–20 characters.' };
    if (!nameOk(name)) return { err: 'That name is not permitted.' };
    try {
      const rows = await rest('GET', 'dya_accounts?email=eq.' + encodeURIComponent(email) + '&select=id');
      if (rows && rows.length) return { err: 'An account with that email already exists.' };
    } catch (e) { return { err: 'Could not reach the account service: ' + e.message }; }
    const id = uid('acc'), passHash = FLAKE.hashPass(pass), now = Date.now();
    const data = { id, email, passHash, displayName: name, createdAt: now, lastLogin: now, savedAt: 0, ai: false, flakeNew: true };
    try {
      await rest('POST', 'dya_accounts', { id, email, pass_hash: passHash, data, updated_at: new Date().toISOString() });
    } catch (e) {
      if (e.status === 409 || /duplicate key/i.test(e.message)) return { err: 'An account with that email already exists.' };
      return { err: e.message };
    }
    return { who: setSession({ id, email, name, passHash }) };
  };

  /* is the remembered session still good? (account deleted, password changed
     elsewhere → no). A network failure keeps the session: the game's own
     cloud calls will report the problem. */
  FLAKE.verify = async function (s) {
    s = s || FLAKE.session();
    if (!s) return { ok: false };
    if (!cfg()) return { ok: true, offline: true };
    try {
      const rows = await rest('GET', 'dya_accounts?id=eq.' + encodeURIComponent(s.id) + '&select=id,pass_hash,name:data->>displayName');
      const r = rows && rows[0];
      if (!r || r.pass_hash !== s.passHash) return { ok: false };
      if (r.name && r.name !== s.name) setSession(Object.assign({}, s, { name: r.name }));
      return { ok: true };
    } catch (e) { return { ok: true, offline: true }; }
  };

  /* ================= links back and forth ================= */
  FLAKE.hubUrl = function (params) {
    const q = params ? Object.keys(params).filter(k => params[k] != null).map(k => k + '=' + encodeURIComponent(params[k])).join('&') : '';
    return ROOT + 'index.html' + (q ? '?' + q : '');
  };
  FLAKE.toHub = function (params) { location.href = FLAKE.hubUrl(params); };
  /* send someone to sign in, and back here afterwards */
  FLAKE.toSignIn = function () { FLAKE.toHub({ signin: 1, next: location.pathname + location.search + location.hash }); };

  /* ================= bans ================= */
  function banLive(b) { return !!(b && (b.permanent || (b.until && b.until > Date.now()))); }
  FLAKE.banLive = banLive;
  /* every ban on an account, by scope: { all, game, rpg, '4bw', ld } */
  FLAKE.fetchBans = async function (accId) {
    const out = {};
    if (!cfg() || !accId) return out;
    const [doc, dya] = await Promise.all([
      rest('GET', 'dya_config?key=eq.' + encodeURIComponent('ban:' + accId) + '&select=value').catch(() => null),
      rest('GET', 'dya_bans?account_id=eq.' + encodeURIComponent(accId) + '&select=*').catch(() => null),
    ]);
    const v = doc && doc[0] && doc[0].value;
    if (v && typeof v === 'object') Object.keys(v).forEach(k => { if (v[k]) out[k] = v[k]; });
    const d = dya && dya[0];
    if (d) out.game = { reason: d.reason, permanent: !!d.permanent, until: d.until ? Date.parse(d.until) : null, at: d.created_at ? Date.parse(d.created_at) : null };
    return out;
  };
  /* the ban that stops this account playing this game, or null */
  FLAKE.banFor = function (bans, gameId) {
    if (!bans) return null;
    if (banLive(bans.all)) return Object.assign({ scope: 'all' }, bans.all);
    if (gameId && banLive(bans[gameId])) return Object.assign({ scope: gameId }, bans[gameId]);
    return null;
  };
  /* Admin Panel: ban / lift for any scope except Dya'Akara's own ('game'),
     which keeps going through the Dya'Akara admin (dya_bans). */
  FLAKE.setBan = async function (accId, scope, ban) {
    const rows = await rest('GET', 'dya_config?key=eq.' + encodeURIComponent('ban:' + accId) + '&select=value');
    const v = (rows && rows[0] && rows[0].value) || {};
    if (ban) v[scope] = ban; else delete v[scope];
    const key = 'ban:' + accId;
    if (!Object.keys(v).length) { await rest('DELETE', 'dya_config?key=eq.' + encodeURIComponent(key)); return v; }
    await rest('POST', 'dya_config?on_conflict=key', { key, value: v, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
    return v;
  };
  /* every account with a non-Dya'Akara ban, for the Admin Panel's list */
  FLAKE.fetchAllBans = async function () {
    const rows = await rest('GET', 'dya_config?key=like.ban:*&select=key,value');
    const out = {};
    (rows || []).forEach(r => { out[r.key.slice(4)] = r.value || {}; });
    return out;
  };
  FLAKE.scopeName = function (scope) { const s = SCOPES.find(x => x[0] === scope); return s ? s[1] : scope; };

  /* ================= the home page's editable text ================= */
  function cachedHub() { try { return JSON.parse(localStorage.getItem(HUB_CACHE_KEY) || 'null'); } catch (e) { return null; } }
  FLAKE.hubConfig = function () { return normHub(cachedHub()); };
  /* { studio, games: { id: { name, tagline, hidden, preview } },
       order: { main: [ids], mini: [ids] }, soon: [{ id, name, tagline, blurb, kind, preview }] } */
  function normHub(v) {
    v = v && typeof v === 'object' ? v : {};
    return {
      studio: (v.studio || '').trim() || FLAKE.DEFAULT_STUDIO,
      games: v.games && typeof v.games === 'object' ? v.games : {},
      order: v.order && typeof v.order === 'object' ? v.order : {},
      soon: Array.isArray(v.soon) ? v.soon : [],
    };
  }
  /* the games of one kind ('main' or 'mini') in the admin's order; any game
     the order doesn't name yet goes at the end */
  FLAKE.orderOf = function (hub, kind) {
    const all = (kind === 'mini' ? MINI : GAMES).map(g => g.id);
    const set = ((hub && hub.order && hub.order[kind]) || []).filter(id => all.indexOf(id) >= 0);
    return set.concat(all.filter(id => set.indexOf(id) < 0));
  };
  /* what the home page shows: the visible games in order, then coming-soon slots */
  FLAKE.shown = function (hub, kind) {
    hub = hub || FLAKE.hubConfig();
    const all = kind === 'mini' ? MINI : GAMES;
    const games = FLAKE.orderOf(hub, kind).map(id => all.find(g => g.id === id)).filter(g => !(hub.games[g.id] || {}).hidden);
    const soon = (hub.soon || []).filter(s => (s.kind || 'main') === kind).map(s => Object.assign({ soon: true, href: null }, s));
    return games.concat(soon);
  };

  /* preview images uploaded in the Admin Panel (dya_config 'flake_preview:<id>') */
  FLAKE.fetchPreview = async function (id) {
    const rows = await rest('GET', 'dya_config?key=eq.' + encodeURIComponent('flake_preview:' + id) + '&select=value');
    return (rows && rows[0] && rows[0].value && rows[0].value.data) || null;
  };
  FLAKE.savePreview = function (id, data) { return rest('POST', 'dya_config?on_conflict=key', { key: 'flake_preview:' + id, value: { data, at: Date.now() }, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates'); };
  FLAKE.removePreview = function (id) { return rest('DELETE', 'dya_config?key=eq.' + encodeURIComponent('flake_preview:' + id)); };
  FLAKE.fetchHubConfig = async function () {
    if (!cfg()) return FLAKE.hubConfig();
    try {
      const rows = await rest('GET', 'dya_config?key=eq.' + HUB_KEY + '&select=value');
      const v = (rows && rows[0] && rows[0].value) || {};
      try { localStorage.setItem(HUB_CACHE_KEY, JSON.stringify(v)); } catch (e) { /* ignore */ }
      return normHub(v);
    } catch (e) { return FLAKE.hubConfig(); }
  };
  FLAKE.saveHubConfig = async function (v) {
    await rest('POST', 'dya_config?on_conflict=key', { key: HUB_KEY, value: v, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
    try { localStorage.setItem(HUB_CACHE_KEY, JSON.stringify(v)); } catch (e) { /* ignore */ }
  };
  /* a game's text with the admin's edits laid over the defaults */
  FLAKE.gameText = function (game, hub) {
    if (game.soon) return { name: game.name || 'Coming soon', tagline: game.tagline || 'Coming soon' };
    const o = ((hub || FLAKE.hubConfig()).games || {})[game.id] || {};
    return { name: (o.name || '').trim() || game.name, tagline: (o.tagline || '').trim() || game.tagline };
  };

  /* ================= your own account (the home page's Account dialog) ================= */
  /* the account row, checked against a password — the same check as signing in */
  async function ownRow(pass) {
    const s = FLAKE.session();
    if (!s) return { err: 'Sign in first.' };
    let rows;
    try { rows = await rest('GET', 'dya_accounts?id=eq.' + encodeURIComponent(s.id) + '&select=id,email,pass_hash,data'); }
    catch (e) { return { err: 'Could not reach the account service: ' + e.message }; }
    const r = rows && rows[0];
    if (!r) return { err: 'This account no longer exists.' };
    if (pass != null && r.pass_hash !== FLAKE.hashPass(pass)) return { err: 'That password is not right.' };
    return { s, row: r };
  }
  /* write identity fields into the row; savedAt moves on so the games take
     this copy over an older one they still hold in the browser */
  async function patchAccount(row, fields) {
    const data = Object.assign({}, row.data || {}, fields.data || {}, { savedAt: Date.now() });
    const body = { data, updated_at: new Date().toISOString() };
    if (fields.passHash) { body.pass_hash = fields.passHash; data.passHash = fields.passHash; }
    await rest('PATCH', 'dya_accounts?id=eq.' + encodeURIComponent(row.id), body);
  }
  function checkName(name) {
    name = String(name || '').trim();
    if (name.length < 2 || name.length > 20) return { err: 'Display name must be 2–20 characters.' };
    if (!nameOk(name)) return { err: 'That name is not permitted.' };
    return { name };
  }
  FLAKE.rename = async function (name) {
    const n = checkName(name); if (n.err) return n;
    const o = await ownRow(null); if (o.err) return o;
    try { await patchAccount(o.row, { data: { displayName: n.name } }); } catch (e) { return { err: e.message }; }
    return { who: setSession(Object.assign({}, o.s, { name: n.name })) };
  };
  FLAKE.changePassword = async function (current, next) {
    if (String(next || '').length < 4) return { err: 'The new password must be at least 4 characters.' };
    const o = await ownRow(current); if (o.err) return o;
    const passHash = FLAKE.hashPass(next);
    try { await patchAccount(o.row, { passHash }); } catch (e) { return { err: e.message }; }
    return { who: setSession(Object.assign({}, o.s, { passHash })) };
  };
  /* everything every game keeps for an account, besides the account row */
  FLAKE.wipeGameData = async function (accId) {
    const id = encodeURIComponent(accId);
    await Promise.all([
      rest('DELETE', 'dya_config?key=eq.' + encodeURIComponent('rpg_save:' + accId)),
      rest('DELETE', 'dya_config?key=like.' + encodeURIComponent('fbw:' + accId + ':*')),
      rest('DELETE', 'dya_config?key=eq.' + encodeURIComponent('ban:' + accId)),
      rest('DELETE', 'dya_bans?account_id=eq.' + id),
    ].map(p => p.catch(() => null)));
  };
  FLAKE.deleteAccount = async function (pass) {
    const o = await ownRow(pass); if (o.err) return o;
    try {
      await FLAKE.wipeGameData(o.row.id);
      await rest('DELETE', 'dya_accounts?id=eq.' + encodeURIComponent(o.row.id));
    } catch (e) { return { err: e.message }; }
    FLAKE.signOut();
    return { ok: true };
  };

  /* Forgot your password? There is no email service, so the request goes to
     the Admin Panel (General → Players), where an admin sets a new one and
     tells you. One request per email; asking again just updates it. */
  FLAKE.requestReset = async function (email, note) {
    email = String(email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) return { err: 'Enter the email you signed up with.' };
    try {
      await rest('POST', 'dya_config?on_conflict=key', { key: 'pwreset:' + email, value: { email, note: String(note || '').slice(0, 300), at: Date.now() }, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
    } catch (e) { return { err: 'Could not send the request: ' + e.message }; }
    return { ok: true };
  };
  FLAKE.fetchResetRequests = async function () {
    const rows = await rest('GET', 'dya_config?key=like.' + encodeURIComponent('pwreset:*') + '&select=key,value');
    return (rows || []).map(r => r.value || { email: r.key.slice(8) }).sort((a, b) => (b.at || 0) - (a.at || 0));
  };
  FLAKE.clearResetRequest = function (email) { return rest('DELETE', 'dya_config?key=eq.' + encodeURIComponent('pwreset:' + email)); };

  /* ================= the Admin Panel's tools for any account ================= */
  async function rowById(accId) {
    const rows = await rest('GET', 'dya_accounts?id=eq.' + encodeURIComponent(accId) + '&select=id,email,pass_hash,data');
    if (!rows || !rows[0]) throw new Error('No such account.');
    return rows[0];
  }
  FLAKE.adminSetPassword = async function (accId, next) {
    if (String(next || '').length < 4) throw new Error('At least 4 characters.');
    const row = await rowById(accId);
    await patchAccount(row, { passHash: FLAKE.hashPass(next) });
    await FLAKE.clearResetRequest(row.email).catch(() => null);
  };
  FLAKE.adminRename = async function (accId, name) {
    const n = checkName(name); if (n.err) throw new Error(n.err);
    await patchAccount(await rowById(accId), { data: { displayName: n.name } });
  };

  /* ================= the Admin Panel's own password =================
     Kept online (dya_config 'admin_auth'), so it works from any device,
     as a slow salted hash (PBKDF2-SHA-256) rather than anything that
     could be read back. There is no built-in password any more: the
     first time, the panel is set up with the old admin password (the one
     that used to be built in, or a custom one this browser kept). */
  const ADMIN_KEY = 'admin_auth';
  const LEGACY_ADMIN_HASH = '1831298627';   // the old built-in password, hashed the old way
  const hex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  async function pbkdf2(pass, saltHex, iter) {
    const enc = new TextEncoder();
    const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
    const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
  }
  async function makeAuth(pass) {
    const salt = hex(crypto.getRandomValues(new Uint8Array(16))), iter = 150000;
    return { salt, iter, hash: await pbkdf2(pass, salt, iter), at: Date.now() };
  }
  FLAKE.admin = {
    MIN: 8,
    /* the stored record, or null when the panel has not been set up yet */
    async fetch() {
      const rows = await rest('GET', 'dya_config?key=eq.' + ADMIN_KEY + '&select=value');
      return (rows && rows[0] && rows[0].value) || null;
    },
    async check(pass) {
      const a = await FLAKE.admin.fetch();
      return !!(a && a.hash && (await pbkdf2(String(pass || ''), a.salt, a.iter)) === a.hash);
    },
    /* first time only. oldOk: the browser's own check of a custom password it kept (state.js) */
    async setup(oldPass, next, oldOk) {
      if (await FLAKE.admin.fetch()) throw new Error('The admin password is already set. Sign in with it.');
      if (FLAKE.hashPass(oldPass) !== LEGACY_ADMIN_HASH && !oldOk) throw new Error('That is not the old admin password.');
      if (String(next || '').length < FLAKE.admin.MIN) throw new Error('The new password must be at least ' + FLAKE.admin.MIN + ' characters.');
      if (next === oldPass) throw new Error('Choose a new password, not the old one.');
      /* a plain insert: if someone else got there a moment ago, this fails rather than overwriting */
      await rest('POST', 'dya_config', { key: ADMIN_KEY, value: await makeAuth(next), updated_at: new Date().toISOString() });
    },
    async change(current, next) {
      if (!(await FLAKE.admin.check(current))) throw new Error('The current password is not right.');
      if (String(next || '').length < FLAKE.admin.MIN) throw new Error('The new password must be at least ' + FLAKE.admin.MIN + ' characters.');
      await rest('PATCH', 'dya_config?key=eq.' + ADMIN_KEY, { value: await makeAuth(next), updated_at: new Date().toISOString() });
    },
  };

  /* ================= the gate every game page passes through ================= */
  /* A full-screen notice, styled on its own so it works on any page. */
  FLAKE.notice = function (title, text) {
    const el = document.createElement('div');
    el.className = 'flake-notice';
    el.setAttribute('style', 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,8,6,.94);color:#e8dfc8;font:15px Georgia,serif;text-align:center');
    const box = document.createElement('div');
    box.setAttribute('style', 'max-width:420px;padding:26px 24px;border:1px solid #8a6f42;border-radius:10px;background:#1c1610');
    const h = document.createElement('h2'); h.textContent = title; h.setAttribute('style', 'color:#d9b87a;font-weight:normal;margin:0 0 10px');
    const p = document.createElement('p'); p.textContent = text; p.setAttribute('style', 'margin:0 0 18px;line-height:1.5');
    const a = document.createElement('a'); a.href = FLAKE.hubUrl(); a.textContent = '← Back to ' + FLAKE.hubConfig().studio;
    a.setAttribute('style', 'display:inline-block;padding:9px 20px;border:1px solid #d9b87a;border-radius:6px;color:#ffedc4;text-decoration:none;background:#4a3a1c');
    box.appendChild(h); box.appendChild(p); box.appendChild(a); el.appendChild(box);
    (document.body || document.documentElement).appendChild(el);
    return el;
  };
  FLAKE.banText = function (b) {
    const where = b.scope === 'all' ? 'every ' + FLAKE.hubConfig().studio + ' game' : FLAKE.scopeName(b.scope);
    return 'This account is banned from ' + where + (b.reason ? ': “' + b.reason + '”' : '') + '. ' +
      (b.permanent ? 'The ban is permanent.' : 'Until ' + new Date(b.until).toLocaleString() + '.');
  };
  /* resolves with the signed-in player, or never (the page has been sent to
     sign in, or is blocked by a ban) */
  FLAKE.gate = function (gameId) {
    return new Promise(resolve => {
      const s = FLAKE.session();
      if (!s) { FLAKE.toSignIn(); return; }
      FLAKE.verify(s).then(v => {
        if (!v.ok) { FLAKE.signOut(); FLAKE.toSignIn(); return; }
        return FLAKE.fetchBans(s.id).then(bans => {
          /* Dya'Akara's own ban only limits Dya'Akara, which handles it itself (view-only) */
          const b = FLAKE.banFor(bans, gameId === 'game' ? null : gameId);
          if (b) { FLAKE.notice('Account restricted', FLAKE.banText(b)); return; }
          resolve(FLAKE.session());
        });
      }).catch(() => resolve(s));
    });
  };
})();
