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

     FLAKE.gate(gameId)   on a game page: no session → off to the
                          home page to sign in, then straight back;
                          banned from this game → a blocking notice.

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
  function normHub(v) {
    v = v && typeof v === 'object' ? v : {};
    return { studio: (v.studio || '').trim() || FLAKE.DEFAULT_STUDIO, games: v.games && typeof v.games === 'object' ? v.games : {} };
  }
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
    const o = ((hub || FLAKE.hubConfig()).games || {})[game.id] || {};
    return { name: (o.name || '').trim() || game.name, tagline: (o.tagline || '').trim() || game.tagline };
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
