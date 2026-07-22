/* ============================================================
   DYA'AKARA — core/state.js
   World state, accounts, save/load, progression, market,
   the 100 Dya'kukull AI players, notifications, moderation.

   Storage goes through DYA.store — a thin adapter. The local
   implementation uses localStorage; a Firebase adapter can be
   swapped in later (see README) without touching game code.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, SP = DYA.species, EC = DYA.economy, L = DYA.lore, TK = DYA.token;

  /* ================== STORAGE ADAPTER ================== */
  const KEY = 'dyaakara_world_v1';
  const store = {
    backend: 'local', // future: 'firebase' — plug adapter here
    load() {
      try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
      catch (e) { console.error('load failed', e); return null; }
    },
    save(world) {
      try { localStorage.setItem(KEY, JSON.stringify(world)); return true; }
      catch (e) { console.error('save failed', e); return false; }
    },
    reset() { localStorage.removeItem(KEY); },
    export() { return JSON.stringify(G.world); },
    import(json) { G.world = JSON.parse(json); store.save(G.world); },
  };

  /* ================== GAME STATE ================== */
  const G = {
    world: null,
    me: null,          // logged-in account (reference into world.accounts)
    saveTimer: null,
  };

  /* the logged-in human's account travels to the cloud (if configured)
     on every save, so it's there the next time they log in — from
     any device (see js/core/account_cloud.js) */
  function pushMeToCloud() {
    if (G.me && !G.me.ai && DYA.accountCloud && DYA.accountCloud.configured()) DYA.accountCloud.push(G.me);
  }
  /* the Admin Panel edits accounts other than G.me (or none at all —
     admin.html never logs in as a player), so its mutations push the
     specific account they touched explicitly. */
  function pushAccountToCloud(acc) {
    if (acc && !acc.ai && DYA.accountCloud && DYA.accountCloud.configured()) DYA.accountCloud.push(acc);
  }
  G.pushAccountToCloud = pushAccountToCloud;
  G.save = function () {
    clearTimeout(G.saveTimer);
    G.saveTimer = setTimeout(() => { store.save(G.world); pushMeToCloud(); adminAutoPublish(); }, 400);
  };
  G.saveNow = () => { store.save(G.world); pushMeToCloud(); adminAutoPublish(); };
  /* when an admin session mutates the world (deleting/editing/spawning AI
     tokens, curating Dya'kukull), publish the shared AI world so it reaches
     every device. No-op outside the admin panel and when offline. */
  function adminAutoPublish() { if (G.isAdminSession && G.publishAdminWorldSoon) G.publishAdminWorldSoon(); }

  /* ================== SHARED ADMIN WORLD (Dya'kukull + AI market) ==================
     Real player accounts already sync via account_cloud (dya_accounts). The AI
     world — the 100 Dya'kukull, their tokens, and the AI-owned market — is
     generated locally on every device and never uploaded, so admin curation of
     it (deleting tokens, editing prices/stats, spawning) used to vanish on any
     other device. We publish the admin-curated AI world to the shared dya_config
     table (key 'adminworld') and every device adopts it on boot, replacing ONLY
     its locally-generated AI accounts and their market listings — real players'
     accounts and listings are left completely untouched. */
  const ADMIN_WORLD_KEY = 'adminworld';
  function supaCfg() { return (window.DYA_CONFIG && window.DYA_CONFIG.supabase) || {}; }
  function onlineConfigured() { const c = supaCfg(); return !!(c.url && c.anonKey); }
  function supaRest(method, path, body, prefer) {
    const c = supaCfg();
    return fetch(c.url + '/rest/v1/' + path, {
      method,
      headers: Object.assign({ apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey, 'Content-Type': 'application/json' }, prefer ? { Prefer: prefer } : {}),
      body: body != null ? JSON.stringify(body) : undefined,
    }).then(async res => {
      if (res.status === 204) return null;
      const data = await res.json().catch(() => null);
      if (!res.ok) { const e = new Error((data && (data.message || data.hint || data.error)) || ('HTTP ' + res.status)); e.status = res.status; throw e; }
      return data;
    });
  }
  G.adminWorldSync = { lastPush: 0, lastFetch: 0, error: null, configured: onlineConfigured };

  function buildAdminWorldSnapshot() {
    const accounts = {}, aiIds = new Set();
    Object.values(G.world.accounts).forEach(a => { if (a.ai) { accounts[a.id] = a; aiIds.add(a.id); } });
    const listings = {};
    Object.values(G.world.market.listings).forEach(l => { if (aiIds.has(l.sellerId)) listings[l.id] = l; });
    return {
      rev: (G.world.adminWorldRev || 0) + 1,
      updatedAt: Date.now(),
      elbergiId: G.world.elbergiId || null,
      accounts,
      market: { listings },
    };
  }

  const ADMIN_WORLD_META_KEY = 'adminworld_meta';
  G.publishAdminWorld = async function () {
    if (!onlineConfigured()) return { err: 'Online is not configured.' };
    try {
      const snap = buildAdminWorldSnapshot();
      await supaRest('POST', 'dya_config?on_conflict=key', { key: ADMIN_WORLD_KEY, value: snap, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
      /* a tiny companion row so live pollers can check "is there anything new?"
         cheaply, without downloading the whole (multi-account) world each time */
      try { await supaRest('POST', 'dya_config?on_conflict=key', { key: ADMIN_WORLD_META_KEY, value: { updatedAt: snap.updatedAt, rev: snap.rev }, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates'); } catch (e) { /* non-fatal */ }
      G.world.adminWorldRev = snap.rev; G.world.adminWorldAt = snap.updatedAt;
      store.save(G.world);
      G.adminWorldSync.lastPush = Date.now(); G.adminWorldSync.error = null;
      return { ok: true, accounts: Object.keys(snap.accounts).length };
    } catch (e) { G.adminWorldSync.error = e.message; return { err: e.message }; }
  };

  let adminWorldPushTimer = null;
  G.publishAdminWorldSoon = function () {
    if (!onlineConfigured()) return;
    clearTimeout(adminWorldPushTimer);
    adminWorldPushTimer = setTimeout(() => { G.publishAdminWorld(); }, 2500);
  };

  function adoptAdminWorld(snap) {
    /* remove every locally-generated AI account… */
    Object.keys(G.world.accounts).forEach(id => { if (G.world.accounts[id] && G.world.accounts[id].ai) delete G.world.accounts[id]; });
    /* …and any market listing now missing its seller (the AI ones); real
       players' listings keep their (still-present) seller and stay. */
    Object.values(G.world.market.listings).forEach(l => {
      const seller = G.world.accounts[l.sellerId];
      if (!seller || seller.ai) delete G.world.market.listings[l.id];
    });
    /* install the shared AI accounts + their listings */
    Object.values(snap.accounts || {}).forEach(a => { a.ai = true; G.world.accounts[a.id] = a; });
    Object.values((snap.market && snap.market.listings) || {}).forEach(l => { if (G.world.accounts[l.sellerId]) G.world.market.listings[l.id] = l; });
    if (snap.elbergiId) G.world.elbergiId = snap.elbergiId;
    G.world.adminWorldRev = snap.rev || 0;
    G.world.adminWorldAt = snap.updatedAt || 0;
    store.save(G.world);
  }

  G.fetchAdminWorld = async function () {
    if (!onlineConfigured()) return { ok: false };
    try {
      const rows = await supaRest('GET', 'dya_config?key=eq.' + ADMIN_WORLD_KEY + '&select=value');
      G.adminWorldSync.lastFetch = Date.now(); G.adminWorldSync.error = null;
      const snap = rows && rows[0] && rows[0].value;
      if (!snap) return { ok: true, adopted: false };
      /* last-writer-wins by wall clock — never re-adopt our own latest push */
      if ((snap.updatedAt || 0) <= (G.world.adminWorldAt || 0)) return { ok: true, adopted: false };
      adoptAdminWorld(snap);
      return { ok: true, adopted: true };
    } catch (e) { G.adminWorldSync.error = e.message; return { err: e.message }; }
  };

  /* Live poll: cheaply read the meta row; only when it announces a newer world
     do we pull the full snapshot and adopt it. Lets an admin's curation reach
     players who are already logged in, without a heavy download every tick. */
  G.pollAdminWorld = async function () {
    if (!onlineConfigured()) return { ok: false };
    try {
      const rows = await supaRest('GET', 'dya_config?key=eq.' + ADMIN_WORLD_META_KEY + '&select=value');
      const meta = rows && rows[0] && rows[0].value;
      if (!meta || (meta.updatedAt || 0) <= (G.world.adminWorldAt || 0)) return { ok: true, adopted: false };
      return await G.fetchAdminWorld();
    } catch (e) { G.adminWorldSync.error = e.message; return { err: e.message }; }
  };

  /* ---------- global AI tuning (admin-editable via DYA.mods) ---------- */
  function aiTune() {
    return (DYA.mods && DYA.mods.aiTuning) ? DYA.mods.aiTuning() : {};
  }
  /* effective match skill for any AI account — per-AI dial × global dial */
  G.aiSkill = function (acc) {
    const mul = aiTune().matchSkillMul != null ? aiTune().matchSkillMul : 1;
    return U.clamp(((acc && acc.aiCfg && acc.aiCfg.matchSkill) || 0.6) * mul, 0.05, 1.5);
  };
  function aiMarketActivity(acc) {
    const mul = aiTune().marketActivityMul != null ? aiTune().marketActivityMul : 1;
    return U.clamp(((acc.aiCfg && acc.aiCfg.marketActivity) || 0) * mul, 0, 1);
  }

  /* ---------- password "hashing" (local build; real auth = Firebase later) ---------- */
  function hashPass(p) { return String(U.hashStr('dya!' + p + '!akara')); }

  /* ================== WORLD INIT ================== */
  G.init = function () {
    G.world = store.load();
    if (!G.world || G.world.version !== 3) {
      G.world = freshWorld();
      store.save(G.world);
    }
    return G.world;
  };

  function freshWorld() {
    const rng = new U.Rng(20260607);
    const w = {
      version: 3,
      createdAt: Date.now(),
      accounts: {},
      market: { listings: {}, offers: {}, requests: [], notifyMe: {} },
      tournaments: {},
      announcements: [
        { id: U.uid('ann'), at: Date.now(), title: 'Dya’Akara is live', body: 'The Dya Guild welcomes all players to the token game of the Mbaru Tatu. Play honestly. The Guild is watching — cordially.', type: 'mass' },
      ],
      avizu: [
        { id: U.uid('av'), at: Date.now(), title: 'Launch Edition — The Avizu’Vac', body: 'The Guild’s official publication marks the opening of the launch season. Featured: the full launch roster, the state of the circuits, and a word from the Elster Velki (declined to comment, as is tradition).' },
      ],
      trinvak: [
        { id: U.uid('tv'), at: Date.now(), author: 'Halvek Torn', title: 'LF duels, will wager', body: 'Any element, any size. Meet me at the Cracked Okid.', paid: 25 },
      ],
      bans: {},
      appeals: [],
      season: { number: 1, startedAt: Date.now(), endedAt: null, winners: [] },
      rulings: [
        { at: Date.now(), text: 'Season 1 opened. Standard Guild ruleset in force for all sealed tournaments.' },
      ],
      adminPass: null,
      seedCounter: 1,
    };

    /* ---- Elbergi Plass, the preset AI merchant ---- */
    const elbergi = makeAIAccount(rng, { name: L.ELBERGI.name, stallName: L.ELBERGI.stallName, bio: L.ELBERGI.bio, level: 42, region: 'fyrsti', merchant: true });
    w.accounts[elbergi.id] = elbergi;
    w.elbergiId = elbergi.id;

    /* ---- 100 Dya'kukull AI players ---- */
    for (let i = 0; i < 100; i++) {
      const ai = makeAIAccount(rng, {});
      w.accounts[ai.id] = ai;
    }

    /* ---- stock the market from AI collections ---- */
    const ais = Object.values(w.accounts).filter(a => a.ai);
    ais.forEach(ai => {
      const toks = Object.values(ai.tokens);
      const listCount = ai.aiCfg.merchant ? 8 : (rng.chance(ai.aiCfg.marketActivity) ? rng.int(1, 3) : 0);
      rng.shuffle(toks).slice(0, listCount).forEach(t => {
        aiCreateListing(w, ai, t, rng);
      });
    });

    /* ---- Elbergi always keeps a few honest cheap listings (tutorial depends on it) ---- */
    for (let i = 0; i < 4; i++) {
      const spid = rng.pick(['kipsu', 'wild_punk', 'uff', 'rodak', 'mikolo_moko', 'karnen', 'raf_krabbi']);
      const t = TK.mint({ speciesId: spid, rng, owner: elbergi.id, rarity: Math.min(SP.get(spid).rarity[1], rng.int(0, 1)), aiOwner: true });
      elbergi.tokens[t.id] = t;
      t.status = 'market';
      const lst = { id: U.uid('lst'), tokenId: t.id, sellerId: elbergi.id, price: rng.int(80, 160), status: 'sale', at: Date.now(), featured: false };
      w.market.listings[lst.id] = lst;
    }

    /* ---- seed tournaments ---- */
    seedTournaments(w, rng);
    return w;
  }

  /* ---------- AI account factory (Dya'kukull) ---------- */
  function makeAIAccount(rng, opt) {
    const name = opt.name || L.genName(rng);
    const level = opt.level || Math.max(1, Math.round(rng.gauss(14, 10)));
    const region = opt.region || rng.pick(EC.REGIONS).id;
    const acc = baseAccount({
      id: U.uid('ai'),
      displayName: name,
      email: name.toLowerCase().replace(/[^a-z]/g, '') + '@dya.kukull',
      region,
    });
    acc.ai = true;
    acc.aiCfg = {
      active: true,
      marketActivity: opt.merchant ? 1 : rng.range(0.1, 0.9),   // how often they list/buy
      playStyle: rng.pick(['aggressive', 'defensive', 'balanced', 'greedy', 'chaotic']),
      matchSkill: U.clamp(rng.range(0.2, 1) + level / 100, 0.2, 1.2),
      merchant: !!opt.merchant,
      tournaments: rng.chance(0.6),
    };
    acc.level = level;
    acc.xp = 0;
    acc.gold = Math.round(200 + level * rng.range(80, 300));
    acc.stats.wins = Math.round(level * rng.range(1, 6));
    acc.stats.losses = Math.round(acc.stats.wins * rng.range(0.5, 1.4));
    acc.stats.sales = opt.merchant ? 500 : rng.int(0, 40);
    acc.trustedSeller = acc.stats.sales >= EC.TRUSTED_SELLER_SALES;
    acc.stall.name = opt.stallName || (name + '’s Stall');
    acc.stall.bio = opt.bio || rng.pick([
      'Fair prices. Mostly.', 'Everything sung true.', 'Hunter of the ' + rng.pick(['north', 'coast', 'deep forest']) + '. I sell what I catch.',
      'Collection overflow — my loss, your gain.', 'Ask about bundle offers.',
    ]);
    acc.stall.banner = rng.pick(['#6d4a2e', '#31576b', '#7a3f1c', '#43572f', '#5a3a75']);
    /* collection: level-appropriate tokens */
    const count = U.clamp(Math.round(6 + level * rng.range(0.5, 1.4)), 6, 60);
    const craftables = SP.craftable;
    for (let i = 0; i < count; i++) {
      const spid = rng.pick(craftables);
      const t = TK.mint({ speciesId: spid, rng, owner: acc.id, aiOwner: true });
      acc.tokens[t.id] = t;
    }
    /* every player has a seal — AI seals derive from their identity */
    acc.avatarIdx = rng.int(0, 16);
    acc.seal = { avatarIdx: acc.avatarIdx, patterns: rng.shuffle(['runes', 'laurel', 'dots', 'waves', 'chevrons', 'stars', 'vines', 'knots']).slice(0, rng.int(1, 2)), locked: true };
    /* one pouch */
    const pouchToks = rng.shuffle(Object.keys(acc.tokens)).slice(0, Math.min(25, count));
    acc.pouches = [{ id: U.uid('pch'), name: name + '’s Pouch', tokenIds: pouchToks }];
    return acc;
  }

  function baseAccount(o) {
    return {
      id: o.id || U.uid('acc'),
      email: o.email || '',
      passHash: o.passHash || null,
      displayName: o.displayName || 'Player',
      region: o.region || 'velkinovek',
      avatarIdx: o.avatarIdx != null ? o.avatarIdx : 0,
      titleId: null,
      titles: [],
      unlockedAvatars: [0, 1, 2],
      level: 0, xp: 0,
      gold: 0, ngakara: 0,
      okid: [0, 0, 0, 0, 0, 0, 0],       // per rarity tier
      tokens: {},
      pouches: [],
      pieces: [],                          // hunt crafting pieces: {speciesId, from, at}
      achievements: {},                    // id -> {tier, at}
      matchHistory: [],                    // last 50 casual + tournament permanents
      replays: [],                         // {id, at, seed, settings, log, meta, permanent}
      friends: [], pendingIn: [], pendingOut: [], blocked: [], follows: [],
      notifications: [],
      dms: {},                             // otherId -> [{ by:'me'|'them', text, at }]
      dmReplies: {},                       // otherId -> timestamp of a pending Dya'kukull reply
      onlineStatus: 'online',
      settings: defaultSettings(),
      huntSlots: [],                       // {id, huntId, source, expiresAtBand} — huntId picks an admin-authored Hunt
      huntSlotsEarned: 0,
      huntCooldowns: {},                   // legacy per-species cooldowns (individual Hunts are one-and-done)
      stall: { name: '', bio: '', banner: '#6d4a2e', frame: 'wood', featuredTokenId: null, trophies: [] },
      stats: { wins: 0, losses: 0, draws: 0, duelsWon: 0, duelsLost: 0, crafted: 0, sales: 0, purchases: 0, huntsDone: 0, tourneysWon: 0, relicCaptures: 0, eliminations: 0, favSpecies: {}, rankHistory: [] },
      rank: 1000,                          // ranked rating
      winStreak: 0,
      lastWinDay: null,
      trustedSeller: false,
      tutorial: { step: 0, done: false, goldSpent: 0 },
      flags: {},
      createdAt: Date.now(), lastLogin: Date.now(),
      ai: false,
    };
  }

  function defaultSettings() {
    return {
      audio: { master: 0.8, music: 0.7, sfx: 0.8, crowd: 0.5, muteMaster: false, muteMusic: false, muteSfx: false, muteCrowd: false, shurgrEdan: true },
      display: { quality: 'high', particles: true, bioluminescence: true, holographic: true, colorblind: false, fullscreen: false, vsync: true, resolution: 'auto' },
      controls: { trigger1: ' ', trigger2: '2', trigger3: '3', trigger4: '4', trigger5: '5', pause: 'Escape' },
    };
  }

  /* ================== ACCOUNTS ================== */
  /* Cross-device accounts (see js/core/account_cloud.js): when online
     is configured, an account's email is the key to the SAME save on
     any device — the cloud copy is fetched at login and installed
     into G.world.accounts so every other system keeps working exactly
     as it did against a local-only world. Without online configured,
     accounts stay local to this device/browser only, as before. */
  function installAccount(acc, email) {
    /* drop any stale local-only duplicate of this email under a
       different id (e.g. this device's own pre-cloud copy) */
    Object.keys(G.world.accounts).forEach(id => {
      const a = G.world.accounts[id];
      if (id !== acc.id && !a.ai && a.email === email) delete G.world.accounts[id];
    });
    G.world.accounts[acc.id] = acc;
  }
  async function pullBanFromCloud(accId) {
    if (!(DYA.accountCloud && DYA.accountCloud.configured())) return;
    try {
      const b = await DYA.accountCloud.fetchBan(accId);
      if (b) G.world.bans[accId] = { at: Date.now(), reason: b.reason, permanent: b.permanent, until: b.until ? Date.parse(b.until) : null, public: true };
      else delete G.world.bans[accId];
    } catch (e) { /* keep whatever local ban state we already had */ }
  }
  G.createAccount = async function (email, pass, displayName) {
    if (!displayName || displayName.length < 2 || displayName.length > 20) return { err: 'Display name must be 2–20 characters.' };
    if (!U.profanityOk(displayName)) return { err: 'That name is not permitted by the Dya Guild.' };
    email = String(email || '').trim().toLowerCase();
    if (Object.values(G.world.accounts).some(a => !a.ai && a.email === email)) return { err: 'An account with that email already exists.' };
    const AC = DYA.accountCloud;
    if (AC && AC.configured()) {
      let remote;
      try { remote = await AC.fetchByEmail(email); }
      catch (e) { return { err: 'Could not reach the account service: ' + e.message }; }
      if (remote) return { err: 'An account with that email already exists.' };
    }
    const acc = baseAccount({ email, passHash: hashPass(pass), displayName });
    /* new player starting resources (design doc Part IX) */
    acc.gold = EC.START.gold;
    acc.okid[0] = EC.START.okid;
    acc.ngakara = EC.START.ngakara;
    if (AC && AC.configured()) {
      const r = await AC.insert(acc);
      if (r.err) return { err: r.err }; // e.g. someone else claimed the email a moment ago
    }
    G.world.accounts[acc.id] = acc;
    G.me = acc;
    G.save();
    if (DYA.online) DYA.online.onAuthChange();
    return { acc };
  };
  G.login = async function (email, pass) {
    /* Supabase email/password auth is OPT-IN (config.supabase.useAuth)
       and unrelated to cross-device accounts below — it's a separate,
       stronger (but unfinished) path some deployments may adopt later. */
    const useAuth = window.DYA_CONFIG && window.DYA_CONFIG.supabase && window.DYA_CONFIG.supabase.useAuth;
    const supa = useAuth && window.DYA_SUPABASE && window.DYA_SUPABASE.enabled ? window.DYA_SUPABASE.client : null;
    if (supa) {
      const res = await supa.signIn({ email, password: pass });
      if (res.error) return { err: res.error.message || 'Supabase sign-in failed.' };
      const authUser = res.user || (res.access_token ? await supa.getUser(res.access_token) : null);
      const acc = Object.values(G.world.accounts).find(a => !a.ai && a.email === email) || baseAccount({ email, passHash: null, displayName: email.split('@')[0] });
      acc.authProvider = 'supabase';
      acc.authId = authUser && authUser.id;
      acc.authToken = res.access_token || null;
      acc.email = email;
      acc.lastLogin = Date.now();
      G.world.accounts[acc.id] = acc;
      G.me = acc;
      G.save();
      if (DYA.online) DYA.online.onAuthChange();
      return { acc, auth: res };
    }

    email = String(email || '').trim().toLowerCase();
    const AC = DYA.accountCloud;
    if (AC && AC.configured()) {
      let remote;
      try { remote = await AC.fetchByEmail(email); }
      catch (e) { return { err: 'Could not reach the account service: ' + e.message }; }
      if (remote) {
        if (remote.pass_hash !== hashPass(pass)) return { err: 'Incorrect password.' };
        const acc = remote.data;
        acc.id = remote.id; acc.email = email; acc.passHash = remote.pass_hash;
        installAccount(acc, email);
        await pullBanFromCloud(acc.id);
        acc.lastLogin = Date.now();
        G.me = acc;
        G.save();
        if (DYA.online) DYA.online.onAuthChange();
        return { acc };
      }
      /* not in the cloud yet: a local-only account from before this
         device ever synced online. Log in locally, then this device's
         copy becomes the canonical cloud record from now on. */
      const localAcc = Object.values(G.world.accounts).find(a => !a.ai && a.email === email);
      if (!localAcc) return { err: 'No account found with that email.' };
      if (localAcc.passHash !== hashPass(pass)) return { err: 'Incorrect password.' };
      const r = await AC.insert(localAcc);
      if (r.err && !/already exists/i.test(r.err)) return { err: r.err };
      localAcc.lastLogin = Date.now();
      G.me = localAcc;
      G.save();
      if (DYA.online) DYA.online.onAuthChange();
      return { acc: localAcc };
    }

    /* offline fallback: fully local, exactly as before */
    const acc = Object.values(G.world.accounts).find(a => !a.ai && a.email === email);
    if (!acc) return { err: 'No account found with that email.' };
    if (acc.passHash !== hashPass(pass)) return { err: 'Incorrect password.' };
    acc.lastLogin = Date.now();
    G.me = acc;
    G.save();
    if (DYA.online) DYA.online.onAuthChange();
    return { acc };
  };
  G.logout = function () {
    G.me = null;
    /* a tutorial spotlight is a fixed element parented to <body>, outside
       the normal screen container — it survives UI.show() transitions and
       must be torn down explicitly, or it sits on top of (and swallows
       clicks on) whatever renders next, including the login form */
    if (DYA.tutorial) { DYA.tutorial.active = false; DYA.tutorial.clear(); }
    if (DYA.online) DYA.online.onAuthChange();
  };
  G.banInfo = function (accId) { return G.world.bans[accId || (G.me && G.me.id)] || null; };
  G.isBanned = function (accId) {
    const b = G.world.bans[accId];
    return !!(b && (b.permanent || b.until > Date.now()));
  };

  /* ================== PROGRESSION ================== */
  G.addGold = function (amount, silent) {
    G.me.gold = Math.max(0, G.me.gold + Math.round(amount));
    if (amount > 0) checkAchievement('rich_1', G.me.gold);
    if (!silent && DYA.ui) DYA.ui.refreshTopbar && DYA.ui.refreshTopbar();
    G.save();
  };

  G.titleBuff = function (key) {
    if (!G.me || !G.me.titleId) return 0;
    const t = EC.TITLES.find(t => t.id === G.me.titleId);
    return (t && t.buff && t.buff[key]) || 0;
  };

  /* Add XP; returns array of level-up events with chest contents. */
  G.addXP = function (amount) {
    amount = Math.round(amount * (1 + G.titleBuff('xp')));
    G.me.xp += amount;
    const events = [];
    while (G.me.xp >= EC.xpForLevel(G.me.level + 1)) {
      G.me.xp -= EC.xpForLevel(G.me.level + 1);
      G.me.level++;
      const rng = new U.Rng(U.newSeed());
      const chest = EC.levelChest(G.me.level, rng);
      const gained = { level: G.me.level, gold: chest.gold, okid: [], ngakara: 0, tokens: [], cosmetic: null };
      G.me.gold += chest.gold;
      G.me.okid[chest.okidRarity] += chest.okidQty;
      gained.okid.push({ qty: chest.okidQty, rarity: chest.okidRarity });
      if (rng.chance(chest.ngakaraChance)) { G.me.ngakara += 1; gained.ngakara += 1; }
      if (chest.milestone) {
        const m = chest.milestone;
        /* admin-curated milestone pool (Admin → Balance & Economy → Level
           chest pools): a manually-picked list of {speciesId, rarity} this
           level's chest may contain, in place of any random craftable
           species. Levels with no pool set keep the old random roll. */
        const pool = DYA.mods && DYA.mods.getLevelChestPool(G.me.level);
        let tok;
        if (pool && pool.length) {
          const pick = rng.pick(pool);
          const sp = SP.get(pick.speciesId);
          const rarity = pick.rarity != null ? pick.rarity : Math.min(m.tokenRarity, sp ? sp.rarity[1] : m.tokenRarity);
          tok = TK.mint({ speciesId: pick.speciesId, rng, owner: G.me.id, rarity });
        } else {
          const spid = rng.pick(SP.craftable);
          tok = TK.mint({ speciesId: spid, rng, owner: G.me.id, rarity: Math.min(m.tokenRarity, SP.get(spid).rarity[1]) });
        }
        G.me.tokens[tok.id] = tok;
        gained.tokens.push(tok);
        G.me.okid[m.okidRarity] += m.okidQty;
        gained.okid.push({ qty: m.okidQty, rarity: m.okidRarity });
        G.me.ngakara += m.ngakara; gained.ngakara += m.ngakara;
        gained.cosmetic = m.cosmetic;
        if (m.cosmetic) G.me.flags.stygianFrame = true;
      }
      /* Hunt slots: one per 10 levels; unused slots expire at the next level-10 interval */
      if (G.me.level % EC.HUNT.slotEveryLevels === 0) {
        G.me.huntSlots = G.me.huntSlots.filter(s => !s.expiresAtBand || s.expiresAtBand > G.me.level);
        G.me.huntSlots.push({ id: U.uid('hs'), huntId: null, source: 'level', expiresAtBand: G.me.level + EC.HUNT.slotEveryLevels });
        gained.huntSlot = true;
      }
      /* avatar unlocks by level */
      const avatarByLevel = { 2: 3, 4: 4, 6: 5, 8: 6, 10: 7, 14: 8, 18: 9, 22: 10, 26: 11, 30: 12, 35: 13, 40: 14, 45: 15, 50: 16 };
      if (avatarByLevel[G.me.level] != null && !G.me.unlockedAvatars.includes(avatarByLevel[G.me.level])) {
        G.me.unlockedAvatars.push(avatarByLevel[G.me.level]);
        gained.avatar = avatarByLevel[G.me.level];
      }
      events.push(gained);
      checkAchievement('level_10', G.me.level);
      checkAchievement('level_50', G.me.level);
    }
    G.save();
    return events;
  };

  /* ---------- achievements ---------- */
  function checkAchievement(id, value) {
    const def = EC.ACHIEVEMENTS.find(a => a.id === id);
    if (!def || !G.me) return null;
    const cur = G.me.achievements[id];
    if (def.tiered) {
      let tier = 0;
      for (let i = 0; i < def.tiered.length; i++) if (value >= def.tiered[i]) tier = i + 1;
      if (tier > 0 && (!cur || cur.tier < tier)) {
        G.me.achievements[id] = { tier, at: Date.now() };
        notifyAchievement(def, tier);
        return { def, tier };
      }
    } else if (!cur) {
      G.me.achievements[id] = { tier: 1, at: Date.now() };
      notifyAchievement(def, 1);
      return { def, tier: 1 };
    }
    return null;
  }
  G.checkAchievement = checkAchievement;
  G.grantAchievement = (id) => checkAchievement(id, 1);
  function notifyAchievement(def, tier) {
    const name = def.tierNames ? def.tierNames[tier - 1] : def.name;
    G.notify({ type: 'achievement', title: 'Achievement unlocked', body: name, icon: '🏅' });
    DYA.audio.play('levelup');
  }

  /* ---------- notifications (dismissed and gone — no history) ---------- */
  G.notify = function (n) {
    if (!G.me) return;
    n.id = U.uid('ntf'); n.at = Date.now();
    G.me.notifications.push(n);
    if (G.me.notifications.length > 60) G.me.notifications.shift();
    if (DYA.ui && DYA.ui.onNotify) DYA.ui.onNotify(n);
    G.save();
  };
  G.dismissNotification = function (id) {
    G.me.notifications = G.me.notifications.filter(n => n.id !== id);
    G.save();
  };

  /* ================== COLLECTION / POUCHES ================== */
  G.addToken = function (tok) {
    tok.ownerId = G.me.id;
    G.me.tokens[tok.id] = tok;
    const owned = Object.keys(G.me.tokens).length;
    checkAchievement('collect_25', owned);
    const elems = new Set(Object.values(G.me.tokens).map(t => t.element));
    if (elems.size >= 4) checkAchievement('all_elements', 1);
    if (tok.rarity === 6) checkAchievement('torcain_own', 1);
    G.save();
    return tok;
  };
  G.removeToken = function (tokId) {
    delete G.me.tokens[tokId];
    G.me.pouches.forEach(p => { p.tokenIds = p.tokenIds.filter(id => id !== tokId); });
    if (G.me.stall.featuredTokenId === tokId) G.me.stall.featuredTokenId = null;
    G.save();
  };
  G.savePouch = function (pouch) {
    const i = G.me.pouches.findIndex(p => p.id === pouch.id);
    if (i >= 0) G.me.pouches[i] = pouch; else G.me.pouches.push(pouch);
    G.save();
  };
  G.deletePouch = function (id) { G.me.pouches = G.me.pouches.filter(p => p.id !== id); G.save(); };

  /* ---------- crafting ---------- */
  G.canCraft = function (rarity) {
    const cost = EC.CRAFT_COST[rarity];
    let okidAvail = 0;
    for (let i = rarity; i < 7; i++) okidAvail += G.me.okid[i];
    const okidNeed = Math.max(1, cost.okid - G.titleBuff('craftDiscount'));
    return okidAvail >= okidNeed && G.me.ngakara >= cost.ngakara;
  };
  /* Craft-by-Okid (admin feature): when EC.CRAFT_BY_OKID is configured and the
     player has chosen which Okid rarity to spend, the crafted token's power is
     decided by that choice via the designer's table. Returns the target rarity
     + stat multipliers, or null when the classic (piece-rarity) path applies. */
  G.craftByOkidMap = function (okidRarity) {
    const tbl = EC.CRAFT_BY_OKID;
    if (!Array.isArray(tbl) || okidRarity == null) return null;
    const m = tbl[okidRarity];
    if (!m) return null;
    const target = m.rarity != null ? U.clamp(m.rarity | 0, 0, 6) : okidRarity;
    return { target, hpMul: m.hpMul != null ? m.hpMul : 1, dmgMul: m.dmgMul != null ? m.dmgMul : 1, speedMul: m.speedMul != null ? m.speedMul : 1 };
  };
  G.craftToken = function (piece, temperBias, okidRarity) {
    // piece: {speciesId, rarity?} from a Hunt (or market pieces)
    const sp = SP.get(piece.speciesId);
    const rng = new U.Rng(U.newSeed());
    const map = G.craftByOkidMap(okidRarity);

    /* ---- designer path: the chosen Okid rarity decides the token's power ---- */
    if (map) {
      const rarity = map.target;
      const cost = EC.CRAFT_COST[rarity];
      const okidNeed = Math.max(1, cost.okid - G.titleBuff('craftDiscount'));
      let avail = 0; for (let i = okidRarity; i < 7; i++) avail += G.me.okid[i];
      if (avail < okidNeed || G.me.ngakara < cost.ngakara) return { err: 'Not enough materials — needs ' + okidNeed + ' ' + SP.RARITIES[okidRarity] + '+ Okid and ' + cost.ngakara + ' NgAkara.' };
      let need = okidNeed;
      for (let i = okidRarity; i < 7 && need > 0; i++) { const use = Math.min(G.me.okid[i], need); G.me.okid[i] -= use; need -= use; }
      G.me.ngakara -= cost.ngakara;
      const tok = TK.mint({ speciesId: piece.speciesId, rng, owner: G.me.id, crafter: G.me.id, rarity, temperBias: temperBias || piece.temperBias || 0 });
      tok.stats.hp = Math.max(1, Math.round(tok.stats.hp * map.hpMul));
      tok.stats.dmg = Math.max(0, Math.round(tok.stats.dmg * map.dmgMul * 10) / 10);
      tok.stats.speed = Math.max(0, Math.round(tok.stats.speed * map.speedMul));
      tok.newlyCrafted = true;
      G.addToken(tok);
      G.me.pieces = G.me.pieces.filter(p => p !== piece);
      G.me.stats.crafted++;
      checkAchievement('first_craft', 1);
      checkAchievement('craft_10', G.me.stats.crafted);
      G.save();
      return { tok };
    }

    /* ---- classic path: the Hunt shard's own rarity ---- */
    const rarity = piece.rarity != null ? piece.rarity : rng.int(sp.rarity[0], sp.rarity[1]);
    if (!G.canCraft(rarity)) return { err: 'Not enough materials.' };
    const cost = EC.CRAFT_COST[rarity];
    let okidNeed = Math.max(1, cost.okid - G.titleBuff('craftDiscount'));
    for (let i = rarity; i < 7 && okidNeed > 0; i++) {
      const use = Math.min(G.me.okid[i], okidNeed);
      G.me.okid[i] -= use; okidNeed -= use;
    }
    G.me.ngakara -= cost.ngakara;
    const tok = TK.mint({ speciesId: piece.speciesId, rng, owner: G.me.id, crafter: G.me.id, rarity, temperBias: temperBias || piece.temperBias || 0 });
    tok.newlyCrafted = true;
    G.addToken(tok);
    G.me.pieces = G.me.pieces.filter(p => p !== piece);
    G.me.stats.crafted++;
    checkAchievement('first_craft', 1);
    checkAchievement('craft_10', G.me.stats.crafted);
    G.save();
    return { tok };
  };

  /* ---------- combine Okid: fuse N of one rarity into the next tier ---------- */
  G.combineOkidRule = function () {
    const c = EC.COMBINE_OKID || { need: 3, yield: 1 };
    return { need: Math.max(2, c.need | 0 || 3), yield: Math.max(1, c.yield | 0 || 1) };
  };
  G.canCombineOkid = function (rarity) {
    if (rarity == null || rarity < 0 || rarity >= 6) return false; // no tier above Torcain
    return (G.me.okid[rarity] || 0) >= G.combineOkidRule().need;
  };
  G.combineOkid = function (rarity) {
    if (rarity >= 6) return { err: 'Torcain is the highest rarity — there is nothing above it.' };
    const rule = G.combineOkidRule();
    if ((G.me.okid[rarity] || 0) < rule.need) return { err: 'Need ' + rule.need + ' ' + SP.RARITIES[rarity] + ' Okid to combine.' };
    G.me.okid[rarity] -= rule.need;
    G.me.okid[rarity + 1] += rule.yield;
    G.save();
    return { ok: true, from: rarity, to: rarity + 1, yield: rule.yield };
  };

  /* ---------- token upgrading (raise a specific individual's rarity) ----------
     Every rarity tier the mint formula grants +6% HP and +5% damage (token.js);
     an upgrade re-scales the exact same way so an upgraded token matches a
     freshly-minted one of that rarity, plus a small pace bump. Costs the same
     Okid + NgAkara as crafting a token of the target rarity would. */
  G.upgradeCost = function (tok) {
    if (!tok || tok.rarity >= 6) return null;
    return EC.CRAFT_COST[tok.rarity + 1];
  };
  G.upgradePreview = function (tok) {
    if (!tok || tok.rarity >= 6) return null;
    const old = tok.rarity, target = old + 1;
    const hpF = (1 + target * 0.06) / (1 + old * 0.06);
    const dmgF = (1 + target * 0.05) / (1 + old * 0.05);
    return {
      target,
      hp: Math.max(2, Math.round(tok.stats.hp * hpF)),
      dmg: Math.max(0.5, Math.round(tok.stats.dmg * dmgF * 10) / 10),
      speed: Math.round(tok.stats.speed * 1.02),
    };
  };
  G.canUpgrade = function (tok) {
    if (!tok || tok.rarity >= 6 || tok.isRental || tok.frozen) return false;
    const cost = EC.CRAFT_COST[tok.rarity + 1];
    let okidAvail = 0;
    for (let i = tok.rarity + 1; i < 7; i++) okidAvail += G.me.okid[i];
    const okidNeed = Math.max(1, cost.okid - G.titleBuff('craftDiscount'));
    return okidAvail >= okidNeed && G.me.ngakara >= cost.ngakara;
  };
  G.upgradeToken = function (tok) {
    if (!tok) return { err: 'Token not found.' };
    if (tok.rarity >= 6) return { err: 'Already ' + SP.RARITIES[6] + ' — the highest rarity.' };
    if (tok.isRental) return { err: 'Rented tokens belong to the Guild — they cannot be upgraded.' };
    if (tok.frozen) return { err: 'This token is frozen pending Guild review.' };
    if (tok.status === 'market') return { err: 'Take the token off the market before upgrading it.' };
    const target = tok.rarity + 1;
    const cost = EC.CRAFT_COST[target];
    if (!G.canUpgrade(tok)) return { err: 'Not enough materials — needs ' + Math.max(1, cost.okid - G.titleBuff('craftDiscount')) + ' ' + SP.RARITIES[target] + '+ Okid and ' + cost.ngakara + ' NgAkara.' };
    /* spend Okid (target tier and up) + NgAkara */
    let okidNeed = Math.max(1, cost.okid - G.titleBuff('craftDiscount'));
    for (let i = target; i < 7 && okidNeed > 0; i++) {
      const use = Math.min(G.me.okid[i], okidNeed);
      G.me.okid[i] -= use; okidNeed -= use;
    }
    G.me.ngakara -= cost.ngakara;
    /* raise every stat */
    const pre = G.upgradePreview(tok);
    tok.stats.hp = pre.hp;
    tok.stats.dmg = pre.dmg;
    tok.stats.speed = pre.speed;
    tok.rarity = target;
    /* price tracks power: refresh from the boosted stats (admin-pinned prices
       are left untouched) */
    if (!tok.costLocked) tok.cost = TK.costVec(tok);
    tok.upgraded = (tok.upgraded || 0) + 1;
    if (target === 6) checkAchievement('torcain_own', 1);
    G.save();
    return { ok: true, tok };
  };

  /* ================== MARKET ================== */
  G.marketAverage = function (speciesId, rarity) {
    // sellers-only market average: base value with a stable pseudo-market wobble
    const base = SP.RARITY_VALUE[rarity] * (SP.get(speciesId).tags.includes('apex') ? 1.2 : 1);
    const wobble = 0.85 + (U.hashStr(speciesId + ':' + rarity + ':' + G.world.season.number) % 100) / 100 * 0.4;
    return Math.round(base * wobble);
  };

  G.createListing = function (tok, price, status, want) {
    if (tok.frozen) return { err: 'This token is frozen pending Guild review.' };
    tok.status = 'market';
    const lst = {
      id: U.uid('lst'), tokenId: tok.id, sellerId: G.me.id, price: Math.round(price),
      want: want || null,      // §7 multi-currency listing: {ngakara, okidQty, okidRarity}
      status: status || 'sale', // sale | offer | display
      at: Date.now(), featured: false,
    };
    G.world.market.listings[lst.id] = lst;
    fireNotifyMe(tok);
    notifyFollowers(G.me, tok);
    G.save();
    return { lst };
  };
  function fireNotifyMe(tok) {
    const watchers = G.world.market.notifyMe[tok.speciesId] || [];
    watchers.forEach(accId => {
      const acc = G.world.accounts[accId];
      if (acc && !acc.ai && G.me && accId === G.me.id) return;
      if (acc && !acc.ai) {
        acc.notifications.push({ id: U.uid('ntf'), at: Date.now(), type: 'market', title: 'Notify Me', body: 'A ' + SP.get(tok.speciesId).name + ' was just listed on the market.', icon: '🔔' });
      }
    });
  }
  function notifyFollowers(seller, tok) {
    Object.values(G.world.accounts).forEach(acc => {
      if (!acc.ai && acc.follows && acc.follows.includes(seller.id) && (!G.me || acc.id !== G.me.id)) {
        acc.notifications.push({ id: U.uid('ntf'), at: Date.now(), type: 'market', title: 'New listing', body: seller.displayName + ' listed a ' + SP.get(tok.speciesId).name + '.', icon: '🛒' });
      }
    });
  }
  G.removeListing = function (lstId) {
    const lst = G.world.market.listings[lstId];
    if (!lst) return;
    const seller = G.world.accounts[lst.sellerId];
    const tok = seller && seller.tokens[lst.tokenId];
    if (tok) tok.status = 'collection';
    delete G.world.market.listings[lstId];
    G.save();
  };
  G.buyListing = function (lstId) {
    const lst = G.world.market.listings[lstId];
    if (!lst) return { err: 'Listing no longer exists.' };
    if (lst.status === 'display') return { err: 'This token is display only — make an offer instead.' };
    const seller = G.world.accounts[lst.sellerId];
    const tok = seller.tokens[lst.tokenId];
    if (!tok) return { err: 'Token unavailable.' };
    if (G.me.gold < lst.price) return { err: 'Not enough gold.' };
    const w2 = lst.want;
    if (w2) {
      if ((w2.ngakara || 0) > G.me.ngakara) return { err: 'Seller also wants ' + w2.ngakara + ' NgAkara.' };
      if ((w2.okidQty || 0) > G.me.okid[w2.okidRarity || 0]) return { err: 'Seller also wants ' + w2.okidQty + ' ' + SP.RARITIES[w2.okidRarity || 0] + ' Okid.' };
      G.me.ngakara -= (w2.ngakara || 0); seller.ngakara += (w2.ngakara || 0);
      if (w2.okidQty) { G.me.okid[w2.okidRarity || 0] -= w2.okidQty; seller.okid[w2.okidRarity || 0] += w2.okidQty; }
    }
    return completeSale(lst, seller, tok, G.me, lst.price);
  };
  function completeSale(lst, seller, tok, buyer, price) {
    const taxRate = Math.max(0, EC.MARKET_TAX[tok.rarity] + (seller === G.me ? G.titleBuff('tax') : 0));
    const tax = Math.round(price * taxRate);
    buyer.gold -= price;
    seller.gold += price - tax;
    delete seller.tokens[tok.id];
    seller.pouches.forEach(p => p.tokenIds = p.tokenIds.filter(id => id !== tok.id));
    if (seller.stall.featuredTokenId === tok.id) seller.stall.featuredTokenId = null;
    tok.ownerId = buyer.id;
    tok.status = 'collection';
    tok.tradeHistory.push({ at: Date.now(), from: seller.displayName, to: buyer.displayName, price });
    buyer.tokens[tok.id] = tok;
    seller.stats.sales++; buyer.stats.purchases++;
    if (seller.stats.sales >= EC.TRUSTED_SELLER_SALES) seller.trustedSeller = true;
    delete G.world.market.listings[lst.id];
    /* rolling recent-transactions feed (§7) */
    G.world.market.recent = G.world.market.recent || [];
    G.world.market.recent.unshift({ at: Date.now(), tokName: tok.name, species: tok.speciesId, price, buyer: buyer.displayName, buyerId: buyer.id, seller: seller.displayName, sellerId: seller.id });
    if (G.world.market.recent.length > 30) G.world.market.recent.pop();
    if (seller === G.me) { checkAchievement('first_sale', 1); }
    if (!seller.ai) seller.notifications.push({ id: U.uid('ntf'), at: Date.now(), type: 'market', title: 'Token sold', body: tok.name + ' sold for ' + U.fmt(price) + 'g (tax ' + U.fmt(tax) + 'g).', icon: '💰' });
    if (buyer === G.me) { checkAchievement('collect_25', Object.keys(G.me.tokens).length); }
    G.save();
    return { ok: true, tax };
  }
  /* ---------- offers: chat-style negotiation ---------- */
  /* value a mixed bundle in gold-equivalents (for AI judgment) */
  G.bundleValue = function (b) {
    let v = b.amount || 0;
    v += (b.extras && b.extras.ngakara || 0) * 120;
    if (b.extras && b.extras.okidQty) v += b.extras.okidQty * [60, 140, 320, 700, 1500, 3200, 7000][b.extras.okidRarity || 0];
    (b.extras && b.extras.tokenIds || []).forEach(tid => {
      const t = G.me && G.me.tokens[tid];
      if (t) v += Math.round(G.marketAverage(t.speciesId, t.rarity) * 0.8);
    });
    return v;
  };
  /* AI response delay (§7): skewed short, occasionally up to the 15-minute cap, never instant */
  function aiDelayMs(rng2) {
    const d = Math.min(900, 20 + -Math.log(Math.max(1e-6, rng2.next())) * 90);
    return Math.round(d * 1000);
  }
  G.makeOffer = function (lstId, amount, note, extras) {
    const lst = G.world.market.listings[lstId];
    if (!lst) return { err: 'Listing gone.' };
    if (G.me.gold < amount) return { err: 'You cannot offer more gold than you hold.' };
    if (extras) {
      if ((extras.ngakara || 0) > G.me.ngakara) return { err: 'You cannot offer NgAkara you do not hold.' };
      if ((extras.okidQty || 0) > G.me.okid[extras.okidRarity || 0]) return { err: 'You cannot offer Okid you do not hold.' };
    }
    const off = {
      id: U.uid('off'), listingId: lstId, buyerId: G.me.id, sellerId: lst.sellerId,
      state: 'pending', // pending | countered | accepted | ended | expired
      history: [{ by: 'buyer', amount: Math.round(amount), extras: extras || null, note: note || '', at: Date.now() }],
      at: Date.now(),
    };
    G.world.market.offers[off.id] = off;
    /* AI sellers respond on a humane delay, processed by the world tick */
    const seller = G.world.accounts[lst.sellerId];
    if (seller.ai) off.respondAt = Date.now() + aiDelayMs(new U.Rng(U.hashStr(off.id)));
    G.save();
    return { off };
  };
  G.counterOffer = function (offId, amount, note, bySeller) {
    const off = G.world.market.offers[offId];
    if (!off || off.state === 'accepted' || off.state === 'ended') return { err: 'Offer closed.' };
    off.history.push({ by: bySeller ? 'seller' : 'buyer', amount: Math.round(amount), note: note || '', at: Date.now() });
    off.state = 'countered';
    const other = G.world.accounts[bySeller ? off.buyerId : off.sellerId];
    if (other.ai) off.respondAt = Date.now() + aiDelayMs(new U.Rng(U.hashStr(off.id) ^ off.history.length));
    G.save();
    return { off };
  };
  G.acceptOffer = function (offId, asSeller) {
    const off = G.world.market.offers[offId];
    if (!off) return { err: 'Offer gone.' };
    const lst = G.world.market.listings[off.listingId];
    if (!lst) { off.state = 'expired'; return { err: 'Listing gone — offer expired.' }; }
    const seller = G.world.accounts[off.sellerId];
    const buyer = G.world.accounts[off.buyerId];
    const tok = seller.tokens[lst.tokenId];
    const last = off.history[off.history.length - 1];
    if (buyer.gold < last.amount) { off.state = 'expired'; G.save(); return { err: 'Buyer funds insufficient — offer auto-deleted.' }; }
    off.state = 'accepted';
    /* transfer any extras in the accepted bundle (§7) */
    const firstOffer = off.history.find(h => h.by === 'buyer' && h.extras);
    if (firstOffer && firstOffer.extras) {
      const ex = firstOffer.extras;
      if (ex.ngakara) { buyer.ngakara = Math.max(0, buyer.ngakara - ex.ngakara); seller.ngakara += ex.ngakara; }
      if (ex.okidQty) { buyer.okid[ex.okidRarity || 0] = Math.max(0, buyer.okid[ex.okidRarity || 0] - ex.okidQty); seller.okid[ex.okidRarity || 0] += ex.okidQty; }
      (ex.tokenIds || []).forEach(tid => {
        const t2 = buyer.tokens[tid];
        if (t2) { delete buyer.tokens[tid]; t2.ownerId = seller.id; seller.tokens[t2.id] = t2; t2.tradeHistory.push({ at: Date.now(), from: buyer.displayName, to: seller.displayName, price: 0, trade: true }); }
      });
    }
    const res = completeSale(lst, seller, tok, buyer, last.amount);
    delete G.world.market.offers[off.id];
    return res;
  };
  G.endOffer = function (offId) {
    const off = G.world.market.offers[offId];
    if (off) { delete G.world.market.offers[offId]; G.save(); }
  };
  /* free-text chat inside a negotiation — kept separate from the numeric
     offer history so it never disturbs the accept/counter state machine */
  const MARKET_BANTER = [
    'Talk is free. The token is not.', 'Flattery won’t move the price — gold will.',
    'Ha. Make it a real number.', 'The Guild taught me patience. Test it.',
    'A fine token deserves a fine offer.', 'Say less, offer more.',
    'We’re close. Don’t spoil it with words.', 'I have all Nurtui to wait. Do you?',
    'Charming. Now show me your hoard.', 'Mm. Keep talking, or keep bidding.',
  ];
  G.sayOnOffer = function (offId, note, bySeller) {
    const off = G.world.market.offers[offId];
    if (!off) return { err: 'Offer closed.' };
    note = String(note || '').trim();
    if (!note) return { err: 'Nothing to say.' };
    off.chat = off.chat || [];
    off.chat.push({ by: bySeller ? 'seller' : 'buyer', note: note.slice(0, 160), at: Date.now() });
    const other = G.world.accounts[bySeller ? off.buyerId : off.sellerId];
    let replyIn;
    if (other && other.ai) { replyIn = 1200 + Math.random() * 2600; off.chatRespondAt = Date.now() + replyIn; }
    G.save();
    return { off, replyIn };
  };
  function aiChatReply(off) {
    const responder = G.world.accounts[off.sellerId] && G.world.accounts[off.sellerId].ai ? 'seller'
      : (G.world.accounts[off.buyerId] && G.world.accounts[off.buyerId].ai ? 'buyer' : null);
    if (!responder) return;
    const rng = new U.Rng(U.hashStr(off.id) ^ ((off.chat && off.chat.length) || 0) ^ 0x9e37);
    off.chat = off.chat || [];
    off.chat.push({ by: responder, note: rng.pick(MARKET_BANTER), at: Date.now() });
    G.save();
    if (DYA.ui && DYA.ui.onMarketUpdate) DYA.ui.onMarketUpdate();
  }
  /* ---------- direct messages (friends) ---------- */
  const DM_LINES = [
    'Ha! Good to hear from you.', 'The circuits are brutal this season — you holding up?',
    'Saw your last match. Bold play.', 'Trade me something shiny sometime.',
    'One of these Nurtui, you and I duel. For honor.', 'The Guild is watching, as always. Stay sharp.',
    'Well met, friend.', 'I keep meaning to try that Relic run with you.',
    'Your name’s been coming up on the boards. Good things.', 'Careful out there. The Xikia highlands bite.',
  ];
  const DM_HOOKS = [
    { re: /\b(hi|hey|hello|yo|greet)/i, lines: ['Hey yourself!', 'Well met.', 'Ha — hello, friend.'] },
    { re: /\b(duel|fight|match|battle)/i, lines: ['A duel? Name the Nurtui and I’m there.', 'You’d lose, but I admire the spirit.', 'Bring your best token. I’ll bring mine.'] },
    { re: /\b(trade|sell|buy|token|market)/i, lines: ['Always. What are you hunting for?', 'Check my stall — I’ll cut you a friend’s price.', 'I might part with one. Might.'] },
    { re: /\b(gg|good game|well played|nice)/i, lines: ['Likewise! Rematch soon.', 'The sway favored you. Next time, me.', 'Ha, you earned it.'] },
    { re: /\?/, lines: ['Good question. Ask me over a duel.', 'Hm. The Guild would say “play honestly.”', 'Depends who’s asking, friend.'] },
  ];
  function pickDMReply(text) {
    const rng = new U.Rng(U.hashStr((text || '') + '|' + Date.now()));
    const hook = DM_HOOKS.find(h => h.re.test(text || ''));
    return hook ? rng.pick(hook.lines) : rng.pick(DM_LINES);
  }
  G.sendDM = function (otherId, text) {
    text = String(text || '').trim();
    if (!text) return { err: 'Nothing to send.' };
    const other = G.world.accounts[otherId];
    if (!other) return { err: 'That player is gone.' };
    G.me.dms = G.me.dms || {};
    const thread = G.me.dms[otherId] = G.me.dms[otherId] || [];
    thread.push({ by: 'me', text: text.slice(0, 200), at: Date.now() });
    if (thread.length > 100) thread.splice(0, thread.length - 100);
    let replyIn;
    if (other.ai) {
      G.me.dmReplies = G.me.dmReplies || {};
      replyIn = 1500 + Math.random() * 4000;
      G.me.dmReplies[otherId] = Date.now() + replyIn;
    }
    G.save();
    return { ok: true, replyIn };
  };
  function aiDMReply(otherId) {
    const other = G.world.accounts[otherId];
    if (!other || !G.me.dms || !G.me.dms[otherId]) return;
    const thread = G.me.dms[otherId];
    const lastMine = thread.slice().reverse().find(m => m.by === 'me');
    const reply = pickDMReply(lastMine ? lastMine.text : '');
    thread.push({ by: 'them', text: reply, at: Date.now() });
    if (thread.length > 100) thread.splice(0, thread.length - 100);
    G.notify({ type: 'social', title: other.displayName, body: reply, icon: '💬', action: { screen: 'friends' }, actionLabel: 'Open Friends' });
    G.save();
    if (DYA.ui && DYA.ui.onDM) DYA.ui.onDM(otherId);
    if (DYA.ui && DYA.ui.onOnlineUpdate) DYA.ui.onOnlineUpdate();
  }
  function aiRespondToOffer(off, lst) {
    const rngA = new U.Rng(U.hashStr(off.id) ^ off.history.length);
    const last = off.history[off.history.length - 1];
    if (last.by !== 'buyer') return;
    const reserve = Math.round(lst.price * rngA.range(0.72, 0.9));
    const lastAi = off.history.filter(h => h.by === 'seller').pop();
    const bundleVal = last.amount + G.bundleValue({ amount: 0, extras: last.extras });
    /* §7 bartering rule: the AI only pushes the price UP when the player's
       counter is under HALF of the AI's LAST offer. At or above that, it
       negotiates normally — counters down or accepts. */
    const lowball = lastAi ? bundleVal < lastAi.amount * 0.5 : bundleVal < reserve * 0.5;
    /* offer replies carry a click-through straight to the Offers tab */
    const offersAction = { screen: 'market', params: { tab: 'My Offers' } };
    if (bundleVal >= reserve) {
      G.acceptOffer(off.id, true);
      if (G.me && off.buyerId === G.me.id) G.notify({ type: 'market', title: 'Offer accepted!', body: 'Your offer was accepted. The token is yours.', icon: '🤝', action: offersAction, actionLabel: 'View offers' });
    } else if (lowball) {
      if (off.history.length > 7) { off.state = 'ended'; }
      else {
        const up = Math.round((lastAi ? lastAi.amount : lst.price) * rngA.range(1.02, 1.12));
        off.history.push({ by: 'seller', amount: up, note: rngA.pick(['You insult the token.', 'That number went the wrong way for you.', 'The Guild frowns on jokes.']), at: Date.now() });
        off.state = 'countered';
        if (G.me && off.buyerId === G.me.id) G.notify({ type: 'market', title: 'Counter-offer', body: 'The seller countered at ' + U.fmt(up) + 'g.', icon: '📩', action: offersAction, actionLabel: 'Reply in Offers' });
      }
    } else {
      const prev = lastAi ? lastAi.amount : lst.price;
      const counter = Math.round(Math.max(reserve, Math.min(prev - 1, (bundleVal + prev) / 2 * rngA.range(0.98, 1.05))));
      off.history.push({ by: 'seller', amount: counter, note: rngA.pick(['Closer.', 'I can’t go that low.', 'The song alone cost more than that.', 'Meet me here.']), at: Date.now() });
      off.state = 'countered';
      if (G.me && off.buyerId === G.me.id) G.notify({ type: 'market', title: 'Counter-offer', body: 'The seller countered at ' + U.fmt(counter) + 'g.', icon: '📩', action: offersAction, actionLabel: 'Reply in Offers' });
    }
    if (DYA.ui && DYA.ui.onMarketUpdate) DYA.ui.onMarketUpdate();
  }
  /* ---------- guild buyback (75% of market average, no tax) ---------- */
  G.buyback = function (tok) {
    const avg = G.marketAverage(tok.speciesId, tok.rarity);
    const pay = Math.round(avg * EC.BUYBACK_RATE);
    if (tok.flagged) return { err: 'Flagged tokens require review before buyback.' };
    G.removeToken(tok.id);
    G.addGold(pay);
    G.save();
    return { pay };
  };
  /* ---------- gifting (no fee) ---------- */
  G.giftToken = function (tok, friendId) {
    const friend = G.world.accounts[friendId];
    if (!friend) return { err: 'Friend not found.' };
    delete G.me.tokens[tok.id];
    G.me.pouches.forEach(p => p.tokenIds = p.tokenIds.filter(id => id !== tok.id));
    tok.ownerId = friendId;
    tok.tradeHistory.push({ at: Date.now(), from: G.me.displayName, to: friend.displayName, price: 0, gift: true });
    friend.tokens[tok.id] = tok;
    if (!friend.ai) friend.notifications.push({ id: U.uid('ntf'), at: Date.now(), type: 'market', title: 'Gift received', body: G.me.displayName + ' gifted you ' + tok.name + '!', icon: '🎁' });
    G.save();
    return { ok: true };
  };
  G.postRequest = function (speciesId, note, budget) {
    G.world.market.requests.unshift({ id: U.uid('req'), by: G.me.id, byName: G.me.displayName, speciesId, note, budget, at: Date.now() });
    if (G.world.market.requests.length > 50) G.world.market.requests.pop();
    G.save();
  };
  G.toggleNotifyMe = function (speciesId) {
    const nm = G.world.market.notifyMe;
    nm[speciesId] = nm[speciesId] || [];
    const i = nm[speciesId].indexOf(G.me.id);
    if (i >= 0) nm[speciesId].splice(i, 1); else nm[speciesId].push(G.me.id);
    G.save();
    return i < 0;
  };

  /* ---------- rentals ---------- */
  G.rentableStock = function () {
    // Guild stock = recently sold-in tokens + basic commons, freshly generated but stable per hour
    const rng = new U.Rng(Math.floor(Date.now() / 3600000) ^ 0xBEEF);
    const stock = [];
    for (let i = 0; i < 20; i++) {
      const spid = rng.pick(SP.craftable);
      const sp = SP.get(spid);
      const tok = TK.mint({ speciesId: spid, rng, owner: 'guild', rarity: Math.min(sp.rarity[1], rng.int(0, 2)) });
      tok.isRental = true;
      stock.push(tok);
    }
    return stock;
  };
  G.rentTokens = function (toks) {
    const rate = EC.rentalRate(toks.length);
    let cost = 0;
    toks.forEach(t => { cost += Math.round(G.marketAverage(t.speciesId, t.rarity) * rate); });
    if (G.me.gold < cost) return { err: 'Not enough gold — rental costs ' + U.fmt(cost) + 'g.' };
    G.me.gold -= cost;
    const until = Date.now() + EC.RENTAL.periodMs;
    toks.forEach(t => { t.rentalUntil = until; t.ownerId = G.me.id; G.me.tokens[t.id] = t; });
    G.save();
    return { cost, until };
  };
  G.cleanExpiredRentals = function () {
    if (!G.me) return;
    let removed = 0;
    Object.values(G.me.tokens).forEach(t => {
      if (t.isRental && t.rentalUntil && t.rentalUntil < Date.now()) { G.removeToken(t.id); removed++; }
    });
    if (removed) G.notify({ type: 'system', title: 'Rentals returned', body: removed + ' rented token(s) returned to the Guild.', icon: '↩️' });
  };

  /* ================== FRIENDS / SOCIAL ================== */
  G.findAccount = function (query) {
    query = query.toLowerCase().trim();
    return Object.values(G.world.accounts).find(a =>
      a.displayName.toLowerCase() === query || a.id.toLowerCase() === query) || null;
  };
  G.sendFriendRequest = function (accId) {
    const other = G.world.accounts[accId];
    if (!other) return { err: 'Player not found.' };
    if (other.blocked.includes(G.me.id)) return { err: 'Cannot send request.' };
    if (G.me.friends.includes(accId)) return { err: 'Already friends.' };
    if (G.me.pendingOut.includes(accId)) return { err: 'Request already sent.' };
    G.me.pendingOut.push(accId);
    if (other.ai) {
      // AI players accept within moments
      setTimeout(() => {
        G.me.pendingOut = G.me.pendingOut.filter(id => id !== accId);
        if (!G.me.friends.includes(accId)) G.me.friends.push(accId);
        if (!other.friends.includes(G.me.id)) other.friends.push(G.me.id);
        G.notify({ type: 'social', title: 'Friend request accepted', body: other.displayName + ' accepted your friend request.', icon: '🤝' });
        G.save();
      }, 1200 + Math.random() * 2500);
    } else {
      other.pendingIn.push(G.me.id);
    }
    G.save();
    return { ok: true };
  };
  G.respondFriendRequest = function (accId, accept) {
    G.me.pendingIn = G.me.pendingIn.filter(id => id !== accId);
    const other = G.world.accounts[accId];
    if (accept && other) {
      if (!G.me.friends.includes(accId)) G.me.friends.push(accId);
      if (!other.friends.includes(G.me.id)) other.friends.push(G.me.id);
    }
    if (other) other.pendingOut = other.pendingOut.filter(id => id !== G.me.id);
    G.save();
  };
  G.removeFriend = function (accId) {
    G.me.friends = G.me.friends.filter(id => id !== accId);
    const other = G.world.accounts[accId];
    if (other) other.friends = other.friends.filter(id => id !== G.me.id);
    G.save();
  };
  G.blockPlayer = function (accId) {
    if (!G.me.blocked.includes(accId)) G.me.blocked.push(accId);
    G.removeFriend(accId);
    G.save();
  };
  G.unblockPlayer = function (accId) { G.me.blocked = G.me.blocked.filter(id => id !== accId); G.save(); };
  G.toggleFollow = function (accId) {
    const i = G.me.follows.indexOf(accId);
    if (i >= 0) { G.me.follows.splice(i, 1); G.save(); return false; }
    if (G.me.follows.length >= 100) return null; // follow cap
    G.me.follows.push(accId); G.save(); return true;
  };
  G.followerCount = function (accId) {
    return Object.values(G.world.accounts).filter(a => a.follows && a.follows.includes(accId)).length;
  };
  G.reportPlayer = function (accId, reason, note) {
    G.world.appeals.push({ id: U.uid('rep'), kind: 'report', against: accId, by: G.me.id, reason, note, at: Date.now(), open: true });
    G.save();
  };
  G.reportToken = function (tokId, ownerId, reason) {
    G.world.appeals.push({ id: U.uid('rep'), kind: 'tokenReport', tokenId: tokId, against: ownerId, by: G.me.id, reason, at: Date.now(), open: true });
    // Pre-review: token functions completely normally until report is opened by admin.
    G.save();
  };

  /* ================== MATCH RESULTS ================== */
  G.recordMatch = function (result) {
    /* result: {win, draw, ranked, opponentName, opponentRank, format, duration, stats, replay, tournament} */
    const me = G.me;
    const entry = {
      id: U.uid('mh'), at: Date.now(), win: result.win, draw: result.draw || false,
      opponent: result.opponentName, format: result.format || 'Casual',
      ranked: !!result.ranked, duration: result.duration || 0,
      tournament: result.tournament || null,
    };
    me.matchHistory.unshift(entry);
    // last 50 casual saved; tournament permanent
    const casual = me.matchHistory.filter(m => !m.tournament);
    if (casual.length > 50) {
      const toDrop = casual.slice(50).map(m => m.id);
      me.matchHistory = me.matchHistory.filter(m => m.tournament || !toDrop.includes(m.id));
    }
    /* replays: seed + input log */
    if (result.replay) {
      result.replay.id = entry.id;
      result.replay.permanent = !!result.tournament;
      me.replays.unshift(result.replay);
      const casualReplays = me.replays.filter(r => !r.permanent);
      if (casualReplays.length > 50) {
        const drop = casualReplays.slice(50).map(r => r.id);
        me.replays = me.replays.filter(r => r.permanent || !drop.includes(r.id));
      }
    }
    /* rewards */
    let xp = 0, gold = 0;
    /* a draw is nobody's win — the victor's reward is split evenly between both sides */
    if (result.draw) { xp = Math.round((result.ranked ? EC.XP.rankedWin : EC.XP.casualWin) / 2); gold = Math.round((result.ranked ? EC.GOLD.rankedWin : EC.GOLD.casualWin) / 2); }
    else if (result.win) { xp = result.ranked ? EC.XP.rankedWin : EC.XP.casualWin; gold = result.ranked ? EC.GOLD.rankedWin : EC.GOLD.casualWin; }
    else { xp = result.ranked ? EC.XP.rankedLoss : EC.XP.casualLoss; gold = result.ranked ? EC.GOLD.rankedLoss : EC.GOLD.casualLoss; }
    /* bonus XP */
    const bonuses = [];
    if (result.win) {
      me.winStreak++;
      const streak = Math.min(EC.XP_BONUS.winStreakCap, (me.winStreak - 1) * EC.XP_BONUS.winStreakPerWin);
      if (streak > 0) { xp += streak; bonuses.push(['Win streak ×' + me.winStreak, streak]); }
      const day = new Date().toDateString();
      if (me.lastWinDay !== day) { me.lastWinDay = day; xp += EC.XP_BONUS.firstWinOfDay; bonuses.push(['First win of the day', EC.XP_BONUS.firstWinOfDay]); }
      if (result.usedNewToken) { xp += EC.XP_BONUS.newTokenMatch; bonuses.push(['New token’s first match', EC.XP_BONUS.newTokenMatch]); }
      if (result.fastRelic) { xp += EC.XP_BONUS.fastRelic; bonuses.push(['Swift Relic capture', EC.XP_BONUS.fastRelic]); }
      /* in-match combo achievements (Part IX bonus XP) */
      const combos = result.stats && result.stats.combos ? Object.keys(result.stats.combos) : [];
      combos.slice(0, 2).forEach(cn => { xp += EC.XP_BONUS.comboAchieved; bonuses.push(['Combo: ' + cn, EC.XP_BONUS.comboAchieved]); });
    } else {
      me.winStreak = 0;
    }
    /* field salvage — the win screen reserves space for earned Okid/NgAkara */
    const salvage = { okid: 0, ngakara: 0 };
    if (result.win && !result.draw) {
      const srng = new U.Rng(U.newSeed());
      if (srng.chance(0.12)) { salvage.okid = 1; me.okid[0] += 1; }
      if (srng.chance(0.07)) { salvage.ngakara = 1; me.ngakara += 1; }
    }
    gold = Math.round(gold * (1 + G.titleBuff('gold')));
    me.gold += gold;
    /* stats */
    if (result.draw) me.stats.draws++;
    else if (result.win) me.stats.wins++;
    else me.stats.losses++;
    if (result.stats) {
      me.stats.eliminations += result.stats.eliminations || 0;
      if (result.stats.relicCaptured) me.stats.relicCaptures++;
      (result.stats.tokensPlayed || []).forEach(spid => {
        me.stats.favSpecies[spid] = (me.stats.favSpecies[spid] || 0) + 1;
      });
    }
    if (result.ranked) {
      const delta = result.win ? 25 : result.draw ? 0 : -18;
      me.rank = Math.max(0, me.rank + delta);
      me.stats.rankHistory.push({ at: Date.now(), rank: me.rank });
      if (me.stats.rankHistory.length > 40) me.stats.rankHistory.shift();
    }
    /* achievements */
    checkAchievement('first_match', 1);
    if (result.win) {
      checkAchievement('first_win', 1);
      checkAchievement('win_10', me.stats.wins);
      checkAchievement('streak_5', me.winStreak >= 5 ? 1 : 0);
      if (result.duration && result.duration < 180 && result.stats && result.stats.relicCaptured) checkAchievement('relic_fast', 1);
    }
    const lvlEvents = G.addXP(xp);
    G.save();
    return { xp, gold, bonuses, lvlEvents, salvage };
  };

  /* ================== TOURNAMENTS ================== */
  function seedTournaments(w, rng) {
    const ais = Object.values(w.accounts).filter(a => a.ai && a.aiCfg.tournaments);
    const mk = (circuit, sealed, name, format) => {
      const org = sealed ? null : rng.pick(ais);
      const t = {
        id: U.uid('trn'), name, circuit, sealed,
        organizer: sealed ? 'Dya Guild' : org.displayName,
        organizerId: sealed ? null : org.id,
        entryFee: { 'Local': 25, 'Regional': 75, 'Half Planet': 200, 'Whole Planet': 500, 'Interplanetary': 1000 }[circuit],
        pouchFormat: format || rng.pick(['single', 'three-draft', 'random']),
        size: rng.pick([4, 8, 8, 16]),
        state: 'open', // open | running | done
        players: [], bracket: null, results: null,
        titlePool: EC.TITLES.filter(t => t.tier === circuit).map(t => t.id),
        rules: sealed ? [] : rng.shuffle(['No Torcain tokens', 'Chaos pulse mode', 'Max 2 apex tokens per pouch', 'Duel-format finals']).slice(0, rng.int(0, 2)),
        arena: rng.pick(L.ARENAS[circuit]),
        terrain: circuit === 'Local' ? rng.pick(['plains', 'forest', 'mountain', 'desert']) : rng.pick(L.TERRAIN_SETS.filter(ts => true)).id,
        createdAt: Date.now(),
        schedule: 'Rolling — matches play when bracket fills',
        structure: 'single',
        aftd: rng.chance(0.25), /* some seeded events run Aftð Active-Token rules (§2) */
      };
      if (t.aftd) t.rules.push('Aftð — Active Tokens: XP, growth, and behavior persist across the tournament.');
      w.tournaments[t.id] = t;
      return t;
    };
    mk('Local', true, 'Guild Local Open — Velkinovek', 'single');
    mk('Local', false, 'The Cracked Okid Friday Brawl');
    mk('Local', false, 'Backyard Cup (Miller Hama’s)');
    mk('Regional', true, 'Guild Regional Circuit — Xikia Lowlands', 'three-draft');
    mk('Regional', false, 'Bent Vine Invitational');
    mk('Half Planet', true, 'Guild Half-Planet Championship — Velki West');
    mk('Whole Planet', true, 'The Fyrsti’Vilag Grand Bracket');
    /* Interplanetary is admin-activated only */
  }
  G.seedTournamentsForAdmin = function () { seedTournaments(G.world, new U.Rng(U.newSeed())); G.save(); };

  /* ---------- rich tournament rewards (admin-authored, per placement) ----------
     reward: { gold, ngakara, huntSlots, okid:[{rarity,qty}], tokens:[{speciesId,rarity,qty}] }
     Grants everything to one account (real player or Dya'kukull). "Hunting
     privileges" are Hunt slots. Returns a summary for the placement modal. */
  G.grantTournamentReward = function (accId, reward) {
    if (!reward) return null;
    const acc = G.world.accounts[accId];
    if (!acc) return null;
    const isMe = !!(G.me && acc.id === G.me.id);
    const summary = { gold: 0, ngakara: 0, huntSlots: 0, okid: [], tokens: [] };
    if (reward.gold) { if (isMe) G.addGold(reward.gold, true); else acc.gold += reward.gold; summary.gold += reward.gold; }
    if (reward.ngakara) { acc.ngakara = (acc.ngakara || 0) + reward.ngakara; summary.ngakara += reward.ngakara; }
    (reward.okid || []).forEach(o => {
      const r = U.clamp((o.rarity | 0), 0, 6), q = (o.qty | 0);
      if (q > 0) { acc.okid[r] = (acc.okid[r] || 0) + q; summary.okid.push({ rarity: r, qty: q }); }
    });
    (reward.tokens || []).forEach(tk => {
      /* an exact, already-designed token pulled from the Reserve (Crafting
         Station), consumed on grant — rather than minted fresh from a spec */
      if (tk.reserveId) {
        const entry = DYA.mods && DYA.mods.getReserveEntry(tk.reserveId);
        if (!entry) return;
        DYA.mods.deleteReserveEntry(tk.reserveId);
        const tok = TK.mintSpec(entry.spec, { rng: new U.Rng(U.newSeed()), owner: acc.id, aiOwner: !!acc.ai });
        acc.tokens[tok.id] = tok;
        summary.tokens.push(tok);
        return;
      }
      /* a reward token may be a fully designed spec (Admin → token designer)
         or the simple species/rarity form — mint the same way either way */
      const spec = (tk.spec && tk.spec.speciesId) ? tk.spec : { speciesId: tk.speciesId, rarity: tk.rarity };
      if (!SP.get(spec.speciesId)) return;
      const q = Math.max(1, (tk.qty | 0) || 1);
      for (let i = 0; i < q; i++) {
        const tok = TK.mintSpec(spec, { rng: new U.Rng(U.newSeed()), owner: acc.id, aiOwner: !!acc.ai });
        acc.tokens[tok.id] = tok;
        summary.tokens.push(tok);
      }
    });
    if (reward.huntSlots) {
      const n = reward.huntSlots | 0;
      for (let i = 0; i < n; i++) acc.huntSlots.push({ id: U.uid('hs'), huntId: null, source: 'tournament', expiresAtBand: Math.floor((acc.level || 1) / 10) * 10 + 10 });
      summary.huntSlots += n;
    }
    if (isMe && (summary.okid.length || summary.tokens.length || summary.huntSlots || summary.ngakara)) {
      const bits = [];
      if (summary.ngakara) bits.push('+' + summary.ngakara + ' NgAkara');
      summary.okid.forEach(o => bits.push('+' + o.qty + ' ' + SP.RARITIES[o.rarity] + ' Okid'));
      if (summary.tokens.length) bits.push('+' + summary.tokens.length + ' token' + (summary.tokens.length > 1 ? 's' : ''));
      if (summary.huntSlots) bits.push('+' + summary.huntSlots + ' Hunt privilege' + (summary.huntSlots > 1 ? 's' : ''));
      if (bits.length) G.notify({ type: 'tournament', title: 'Tournament rewards', body: bits.join(' · '), icon: '🎁' });
    }
    if (!isMe) pushAccountToCloud(acc);
    return summary;
  };

  /* ================== AI WORLD SIMULATION TICK ================== */
  let lastSim = 0;
  G.simTick = function () {
    /* due AI offer responses fire regardless of the main tick throttle */
    Object.values(G.world.market.offers).forEach(off => {
      if (off.respondAt && off.respondAt <= Date.now() && (off.state === 'pending' || off.state === 'countered')) {
        off.respondAt = null;
        const lst = G.world.market.listings[off.listingId];
        const responder = G.world.accounts[off.sellerId];
        if (lst && responder && responder.ai) aiRespondToOffer(off, lst);
      }
      if (off.chatRespondAt && off.chatRespondAt <= Date.now()) {
        off.chatRespondAt = null;
        aiChatReply(off);
      }
    });
    /* due friend-message replies from the Dya'kukull */
    if (G.me && G.me.dmReplies) {
      Object.keys(G.me.dmReplies).forEach(otherId => {
        if (G.me.dmReplies[otherId] <= Date.now()) { delete G.me.dmReplies[otherId]; aiDMReply(otherId); }
      });
    }
    // Called periodically from the UI loop. Keeps market/world alive.
    if (Date.now() - lastSim < 45000) return;
    lastSim = Date.now();
    const rng = new U.Rng(U.newSeed());
    const T = aiTune();
    const ais = Object.values(G.world.accounts).filter(a => a.ai && a.aiCfg.active);
    if (!ais.length) return;
    /* a few AIs act */
    const acts = Math.max(0, Math.round(T.actionsPerBeat != null ? T.actionsPerBeat : 3));
    for (let i = 0; i < acts; i++) {
      const ai = rng.pick(ais);
      const roll = rng.next();
      const activity = aiMarketActivity(ai);
      if (roll < activity * 0.5) {
        // list something
        const toks = Object.values(ai.tokens).filter(t => t.status === 'collection');
        if (toks.length > 6) aiCreateListing(G.world, ai, rng.pick(toks), rng);
      } else if (roll < activity * 0.75) {
        // §7 AI reach: buy from ANY market or stall, not only player listings
        const lsts = Object.values(G.world.market.listings).filter(l => {
          const seller = G.world.accounts[l.sellerId];
          return seller && seller.id !== ai.id && l.status === 'sale' && !l.want;
        });
        if (lsts.length && rng.chance(0.35)) {
          const lst = rng.pick(lsts);
          const seller = G.world.accounts[lst.sellerId];
          const tok = seller.tokens[lst.tokenId];
          if (tok && ai.gold >= lst.price && lst.price < G.marketAverage(tok.speciesId, tok.rarity) * 1.4) {
            completeSale(lst, seller, tok, ai, lst.price);
            if (G.me && seller.id === G.me.id) {
              G.notify({ type: 'market', title: 'Token sold!', body: tok.name + ' sold to ' + ai.displayName + ' for ' + U.fmt(lst.price) + 'g.', icon: '💰' });
            }
          }
        }
      } else if (roll < activity * 0.8 && G.me) {
        // occasionally make an offer on a player's offer-enabled listing
        const lsts = Object.values(G.world.market.listings).filter(l => l.sellerId === G.me.id && l.status !== 'display');
        if (lsts.length && rng.chance(0.3)) {
          const lst = rng.pick(lsts);
          const off = {
            id: U.uid('off'), listingId: lst.id, buyerId: ai.id, sellerId: G.me.id,
            state: 'pending', history: [{ by: 'buyer', amount: Math.round(lst.price * rng.range(0.6, 0.92)), note: rng.pick(['Would you take this?', 'Best I can do.', 'It would have a good home.']), at: Date.now() }],
            at: Date.now(),
          };
          G.world.market.offers[off.id] = off;
          G.notify({ type: 'market', title: 'Offer received', body: ai.displayName + ' made an offer on ' + (G.me.tokens[lst.tokenId] ? G.me.tokens[lst.tokenId].name : 'your listing') + '.', icon: '📩', action: { screen: 'market', params: { tab: 'My Offers' } }, actionLabel: 'Reply in Offers' });
        }
      }
    }
    /* prune old AI listings so market stays fresh */
    const all = Object.values(G.world.market.listings);
    if (all.length > 140) {
      all.sort((a, b) => a.at - b.at).slice(0, all.length - 140).forEach(l => {
        const seller = G.world.accounts[l.sellerId];
        if (seller && seller.ai) { const t = seller.tokens[l.tokenId]; if (t) t.status = 'collection'; delete G.world.market.listings[l.id]; }
      });
    }
    /* the Dya'kukull live their own lives — with catch-up if the game was closed */
    const live = liveState();
    const elapsed = Date.now() - (live.lastBeat || Date.now());
    const beats = Math.min(40, Math.max(1, Math.floor(elapsed / 45000)));
    for (let b = 0; b < beats; b++) liveBeat(rng, b < beats - 1);
    live.lastBeat = Date.now();
    G.save();
  };

  /* ================= THE DYA'KUKULL LIVE =================
     The 100 AI players actually play the game: they log on, play
     casual matches among themselves, enter and run tournaments,
     hunt, craft, post notices, challenge the player — and log off
     again. Never everyone at once; never nobody. */
  function liveState() {
    const w = G.world;
    if (!w.live) w.live = { sessions: {}, matches: [], challenges: [], recent: [], lastBeat: 0 };
    if (!w.live.recent) w.live.recent = [];
    return w.live;
  }
  G.aiStatus = function (accId) {
    const live = liveState();
    const sess = live.sessions[accId];
    return sess ? sess.status : 'offline';
  };
  G.liveNow = function () {
    const live = liveState();
    const online = Object.values(G.world.accounts).filter(a => a.ai && G.aiStatus(a.id) === 'online');
    return { online, matches: live.matches.filter(m => !m.resolved), challenges: live.challenges.filter(ch => ch.expiresAt > Date.now()), recent: live.recent };
  };

  /* statistical outcome for an unwatched AI-vs-AI match */
  function aiVsAiOutcome(a, b, rng) {
    const sa = G.aiSkill(a) * 2 + a.rank / 1200;
    const sb = G.aiSkill(b) * 2 + b.rank / 1200;
    return rng.chance(sa / (sa + sb)); /* true = a wins */
  }
  function recordAiMatch(a, b, aWins, format, duration, tournament) {
    const at = Date.now();
    const mid = U.uid('mtc');
    [[a, aWins, b], [b, !aWins, a]].forEach(([p, won, opp]) => {
      p.stats[won ? 'wins' : 'losses']++;
      p.matchHistory.unshift({ id: mid, at, opponent: opp.displayName, format: format || 'Casual — Dya\u2019kukull', ranked: false, win: won, draw: false, duration: duration || 300, tournament: tournament || null });
      if (p.matchHistory.length > 30) p.matchHistory.pop();
      p.xp += won ? 40 : 15;
      while (p.xp >= EC.xpForLevel(p.level + 1)) p.level++;
      p.gold += won ? 25 : 10;
      p.rank = Math.max(800, p.rank + (won ? 3 : -3));
    });
  }
  G.resolveLiveMatch = function (matchId, winnerIdx) {
    const live = liveState();
    const rec = live.matches.find(m2 => m2.id === matchId);
    if (!rec || rec.resolved) return;
    rec.resolved = true;
    const a = G.world.accounts[rec.aId], b = G.world.accounts[rec.bId];
    if (a && b) {
      recordAiMatch(a, b, winnerIdx === 0, rec.format, Math.round((Date.now() - rec.startedAt) / 1000));
      live.recent.unshift({ at: Date.now(), a: a.displayName, b: b.displayName, winner: winnerIdx === 0 ? a.displayName : b.displayName });
      if (live.recent.length > 8) live.recent.pop();
    }
    G.save();
  };

  function liveBeat(rng, catchUp) {
    const live = liveState();
    const now = Date.now();
    const ais = Object.values(G.world.accounts).filter(a => a.ai && a.aiCfg.active);

    /* ---- presence: sessions with real breaks ---- */
    ais.forEach(a => {
      const sess = live.sessions[a.id];
      if (sess && sess.until > now) return;
      const r = rng.next();
      /* roughly 12-18 online at a time; sociable AIs stay on longer */
      if (!sess || sess.status === 'offline') {
        if (r < 0.12) live.sessions[a.id] = { status: 'online', until: now + (15 + rng.next() * 55) * 60000 };
        else live.sessions[a.id] = { status: 'offline', until: now + (30 + rng.next() * 240) * 60000 };
      } else if (sess.status === 'online') {
        if (r < 0.3) live.sessions[a.id] = { status: 'away', until: now + (4 + rng.next() * 12) * 60000 };
        else live.sessions[a.id] = { status: 'offline', until: now + (60 + rng.next() * 300) * 60000 };
      } else { /* away */
        if (r < 0.6) live.sessions[a.id] = { status: 'online', until: now + (10 + rng.next() * 40) * 60000 };
        else live.sessions[a.id] = { status: 'offline', until: now + (60 + rng.next() * 240) * 60000 };
      }
    });
    /* there should always be a few active */
    const T = aiTune();
    const minOnline = T.minOnline != null ? T.minOnline : 6;
    let online = ais.filter(a => G.aiStatus(a.id) === 'online');
    while (online.length < minOnline && ais.length) {
      const wake = rng.pick(ais.filter(a => G.aiStatus(a.id) !== 'online'));
      if (!wake) break;
      live.sessions[wake.id] = { status: 'online', until: now + (20 + rng.next() * 50) * 60000 };
      online = ais.filter(a => G.aiStatus(a.id) === 'online');
    }

    /* ---- casual matches among themselves ---- */
    live.matches.forEach(m2 => {
      if (!m2.resolved && m2.endsAt <= now && !m2.watched) {
        const a = G.world.accounts[m2.aId], b = G.world.accounts[m2.bId];
        m2.resolved = true;
        if (a && b) {
          const aWins = aiVsAiOutcome(a, b, rng);
          recordAiMatch(a, b, aWins, m2.format, Math.round((m2.endsAt - m2.startedAt) / 1000));
          live.recent.unshift({ at: now, a: a.displayName, b: b.displayName, winner: aWins ? a.displayName : b.displayName });
          if (live.recent.length > 8) live.recent.pop();
        }
      }
    });
    live.matches = live.matches.filter(m2 => !m2.resolved || now - m2.endsAt < 300000);
    const busy = {};
    live.matches.forEach(m2 => { if (!m2.resolved) { busy[m2.aId] = 1; busy[m2.bId] = 1; } });
    const free = online.filter(a => !busy[a.id]);
    if (live.matches.filter(m2 => !m2.resolved).length < 3 && free.length >= 2 && rng.chance(0.45)) {
      const a = rng.pick(free);
      let b = rng.pick(free);
      if (b === a) b = free[(free.indexOf(a) + 1) % free.length];
      if (a !== b) {
        live.matches.push({
          id: U.uid('lvm'), aId: a.id, bId: b.id, seed: U.newSeed(),
          format: rng.chance(0.25) ? 'Private Match' : 'Casual Queue',
          startedAt: now, endsAt: now + (3 + rng.next() * 5) * 60000,
          resolved: false, watched: false,
        });
      }
    }

    /* ---- tournaments run themselves — around the player, never FOR them ----
       AI-vs-AI pairings resolve on their own schedule, including inside events
       the player entered. The player's own matches are never played for them:
       a round only advances once THEY have played theirs. */
    /* online tournaments are driven by core/tournaments_online.js, not the local
       Dya'kukull sim — leave their shared brackets alone */
    const trns = Object.values(G.world.tournaments).filter(t => !t.online);
    const isHuman = (pid) => { const acc = G.world.accounts[pid]; return acc && !acc.ai; };
    const humanIn = (t) => t.players.some(isHuman);
    /* keep the browser stocked */
    if (trns.filter(t => t.state === 'open').length < 4 && rng.chance(0.5)) seedOneTournament(rng);
    trns.forEach(t => {
      const human = humanIn(t);
      if (t.state === 'open' && !human) {
        /* entrants trickle in */
        if (rng.chance(T.tournamentJoinChance != null ? T.tournamentJoinChance : 0.55)) {
          const cands = online.filter(a => a.aiCfg.tournaments && !t.players.includes(a.id) && a.level >= (EC.CIRCUIT_MIN_LEVEL[t.circuit] || 0));
          const joiner = cands.length ? rng.pick(cands) : null;
          if (joiner) { t.players.push(joiner.id); joiner.gold = Math.max(0, joiner.gold - t.entryFee); }
        }
        if (t.players.length >= t.size) {
          t.pot = t.entryFee * t.players.length;
          const order = rng.shuffle(t.players.slice());
          if (t.structure === 'rr') {
            const round = [];
            for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) round.push({ a: order[i], b: order[j], winner: null });
            t.bracket = [round];
          } else {
            t.bracket = [order.map((pid, i) => i % 2 === 0 ? { a: order[i], b: order[i + 1], winner: null } : null).filter(Boolean)];
          }
          t.state = 'running'; t.aiOnly = true;
        }
      } else if (t.state === 'running' && t.bracket && rng.chance(0.5)) {
        const round = t.bracket[t.bracket.length - 1];
        const humanMatch = (mm) => isHuman(mm.a) || isHuman(mm.b);
        /* resolve ONE AI-vs-AI pairing this beat; the player's matches wait */
        const open2 = round.filter(mm => !mm.winner && !humanMatch(mm));
        if (open2.length) {
          const mm = rng.pick(open2);
          const a = G.world.accounts[mm.a], b = G.world.accounts[mm.b];
          if (!a) mm.winner = mm.b; else if (!b) mm.winner = mm.a;
          else { const aw = aiVsAiOutcome(a, b, rng); mm.winner = aw ? mm.a : mm.b; recordAiMatch(a, b, aw, t.circuit + ' Tournament', 240 + Math.floor(rng.next() * 300), t.name); }
        } else if (round.every(mm => mm.winner)) {
          /* round complete (the player played theirs, or is out): crown or advance */
          if (t.structure === 'rr' || round.length === 1) {
            let champ;
            if (t.structure === 'rr') {
              const wins = {};
              t.bracket[0].forEach(mm => { if (mm.winner) wins[mm.winner] = (wins[mm.winner] || 0) + 1; });
              champ = t.players.slice().sort((x, y) => (wins[y] || 0) - (wins[x] || 0))[0];
            } else champ = round[0].winner;
            completeTournamentAmbient(t, champ, now);
          } else {
            const next = [];
            for (let i = 0; i < round.length; i += 2) next.push({ a: round[i].winner, b: round[i + 1] ? round[i + 1].winner : null, winner: round[i + 1] ? null : round[i].winner });
            t.bracket.push(next);
            /* tell the player when their next match is ready */
            if (G.me && next.some(mm => mm.a === G.me.id || mm.b === G.me.id)) {
              G.notify({ type: 'tournament', title: 'Your match is ready', body: t.name + ' — the round has advanced. To the bracket!', icon: '🏆' });
            }
          }
        }
        /* otherwise: the only open matches are the player's — the bracket waits for them */
      }
      /* prune finished AI-only events after an hour so the ledger stays lean */
      if (t.state === 'done' && t.aiOnly && t.doneAt && now - t.doneAt > 3600000) delete G.world.tournaments[t.id];
    });

    if (catchUp) return; /* during catch-up: world moves, but nobody pesters the player */

    /* ---- they reach out to the player ---- */
    const me = G.me;
    if (me && !me.ai) {
      live.challenges = live.challenges.filter(ch => ch.expiresAt > now);
      if (live.challenges.length < 2 && rng.chance(T.challengeChance != null ? T.challengeChance : 0.07)) {
        const near = online.filter(a => Math.abs(a.level - me.level) < 15 && !live.challenges.some(ch => ch.aiId === a.id));
        const ch = near.length ? rng.pick(near) : null;
        if (ch) {
          live.challenges.push({ id: U.uid('chl'), aiId: ch.id, at: now, expiresAt: now + 12 * 60000 });
          G.notify({ type: 'social', title: 'Challenge!', body: ch.displayName + ' (Lv ' + ch.level + ') challenges you to a match. Play → Live Now to accept.', icon: '⚔' });
        }
      }
      if (rng.chance(T.friendRequestChance != null ? T.friendRequestChance : 0.015)) {
        const cand = online.find(a => !me.friends.includes(a.id) && !me.pendingIn.includes(a.id) && !me.pendingOut.includes(a.id) && !me.blocked.includes(a.id));
        if (cand) {
          me.pendingIn.push(cand.id);
          if (!cand.pendingOut) cand.pendingOut = [];
          cand.pendingOut.push(me.id);
          G.notify({ type: 'social', title: 'Friend request', body: cand.displayName + ' wants to be friends.', icon: '🤝' });
        }
      }
    }

    /* ---- and the rest of a player's life: hunts, crafting, notices ---- */
    if (rng.chance(0.2) && online.length) {
      const a = rng.pick(online);
      const r2 = rng.next();
      if (r2 < 0.4) { /* hunting trip */
        a.stats.huntsDone++;
        a.pieces = a.pieces || [];
        /* Hunts are now individual admin-authored quarry; draw the piece
           from an available Hunt's species if any, else any craftable one. */
        const huntSpecies = (DYA.mods && DYA.mods.availableHunts().map(h => h.speciesId)) || [];
        const pieceSpid = huntSpecies.length ? rng.pick(huntSpecies) : rng.pick(SP.craftable);
        a.pieces.push({ speciesId: pieceSpid, material: rng.pick(L.MATERIALS), from: 'Hunt', temperBias: 0, at: now });
      } else if (r2 < 0.75) { /* craft something (keeps stalls stocked) */
        /* skip minting new filler when the creator has turned auto-generation
           off — they want to hand-design every active token */
        if (!EC.NO_AUTOGEN) {
          const piece = (a.pieces || []).pop();
          const spid = piece ? piece.speciesId : rng.pick(SP.craftable);
          const tok = TK.mint({ speciesId: spid, rng: new U.Rng(U.newSeed()), owner: a.id, aiOwner: true });
          a.tokens[tok.id] = tok;
          a.stats.crafted++;
        }
      } else if (r2 < 0.85) { /* post a notice */
        G.world.trinvak.unshift({
          id: U.uid('tv'), at: now, author: a.displayName, paid: 5 + Math.floor(rng.next() * 40),
          title: rng.pick(['Looking for sparring partners', 'WTB water tokens', 'Selling — see my stall', 'Local bracket forming', 'Lost a wager, selling cheap', 'Karnen co-op forming']),
          body: rng.pick(['Find me on the ladder.', 'Fair prices, honest songs.', 'No time-wasters, please.', 'The Guild has been notified. Cordially.', 'First come, first served.']),
        });
        if (G.world.trinvak.length > 30) G.world.trinvak.pop();
      }
    }
  }

  /* ambient completion: pays the field, honors the organizer, releases Aftð.
     Only reached when the champion is an AI (the player's own final can only
     complete through their own play). */
  function completeTournamentAmbient(t, champ, now) {
    if (t.paidOut) { t.state = 'done'; t.champion = t.champion || champ; return; }
    t.paidOut = true;
    t.state = 'done'; t.champion = champ; t.doneAt = now;
    const pool = t.pot != null ? t.pot : Math.round((t.entryFee || 0) * (t.size || 0));
    const cAcc = G.world.accounts[champ];
    if (cAcc) {
      if (G.me && cAcc === G.me) G.addGold(Math.round(pool * 0.6) + (EC.CIRCUIT_GOLD[t.circuit] || 0), true);
      else cAcc.gold += Math.round(pool * 0.6) + (EC.CIRCUIT_GOLD[t.circuit] || 0);
      cAcc.stats.tourneysWon++;
      G.world.season.winners.push({ name: cAcc.displayName, circuit: t.circuit, tournament: t.name, at: now });
    }
    const org = t.organizerId && G.world.accounts[t.organizerId];
    if (org) {
      const cut = Math.round(pool * 0.05) + (t.sealed ? 200 : 0);
      if (G.me && org === G.me) {
        G.addGold(cut, true);
        if (t.sealed) { G.me.okid[0]++; G.me.ngakara++; }
        G.notify({ type: 'tournament', title: 'Your event concluded', body: t.name + ' — champion: ' + (cAcc ? cAcc.displayName : '?') + '. Your organizer cut' + (t.sealed ? ' and creator reward have' : ' has') + ' been paid.', icon: '🏛' });
      } else { org.gold += cut; if (t.sealed) { org.okid[0]++; org.ngakara++; } }
    }
    /* the player entered but didn't win: tell them how it ended, release Aftð */
    if (G.me && t.players.includes(G.me.id) && champ !== G.me.id) {
      G.notify({ type: 'tournament', title: 'Tournament concluded', body: t.name + ' — ' + (cAcc ? cAcc.displayName : 'someone') + ' takes the championship.', icon: '🏆' });
    }
    if (t.aftd && window.DYA && DYA.aftd) DYA.aftd.deactivate(t);
  }

  function seedOneTournament(rng) {
    const circuit = rng.chance(0.65) ? 'Local' : 'Regional';
    const sealed = rng.chance(0.4);
    const ais = Object.values(G.world.accounts).filter(a => a.ai && a.aiCfg.tournaments);
    const org = rng.pick(ais);
    const t = {
      id: U.uid('trn'),
      name: sealed
        ? rng.pick(['Guild Evening Bracket', 'Guild Open Qualifier', 'Sealed Circuit Night']) + ' — ' + rng.pick(L.PLACES)
        : rng.pick(['The Bent Vine Cup', 'Backlot Brawl', 'Riverstone Invitational', 'The Cracked Okid Open', 'Torchlight Tourney']) + ' (' + org.displayName + ')',
      circuit, sealed,
      organizer: sealed ? 'Dya Guild' : org.displayName, organizerId: sealed ? null : org.id,
      entryFee: circuit === 'Local' ? 25 + Math.floor(rng.next() * 50) : 75, pouchFormat: rng.pick(['single', 'three-draft', 'random']),
      size: rng.pick([4, 8]), structure: rng.chance(0.25) ? 'rr' : 'single',
      aftd: rng.chance(0.25),
      state: 'open', players: [], bracket: null,
      titlePool: EC.TITLES.filter(tt => tt.tier === circuit).map(tt => tt.id),
      rules: [], arena: rng.pick(L.ARENAS[circuit]),
      terrain: rng.pick(['plains', 'forest', 'mountain', 'desert']), createdAt: Date.now(), schedule: 'Rolling',
    };
    if (t.aftd) t.rules.push('Aftð — Active Tokens: XP, growth, and behavior persist across the tournament.');
    G.world.tournaments[t.id] = t;
    return t;
  }
  G.acceptChallenge = function (chId) {
    const live = liveState();
    const ch = live.challenges.find(c2 => c2.id === chId);
    if (!ch || ch.expiresAt < Date.now()) return null;
    live.challenges = live.challenges.filter(c2 => c2 !== ch);
    G.save();
    return G.world.accounts[ch.aiId] || null;
  };
  G.markLiveWatched = function (matchId) {
    const live = liveState();
    const rec = live.matches.find(m2 => m2.id === matchId);
    if (rec) rec.watched = true;
  };
  function aiCreateListing(w, ai, tok, rng) {
    if (tok.status !== 'collection') return;
    tok.status = 'market';
    const T = aiTune();
    const avg = SP.RARITY_VALUE[tok.rarity];
    const lst = {
      id: U.uid('lst'), tokenId: tok.id, sellerId: ai.id,
      price: Math.round(avg * rng.range(T.listPriceLo != null ? T.listPriceLo : 0.8, T.listPriceHi != null ? T.listPriceHi : 1.5)),
      status: rng.chance(0.12) ? 'display' : rng.chance(0.3) ? 'offer' : 'sale',
      at: Date.now() - Math.floor(rng.next() * 86400000),
      featured: false,
    };
    w.market.listings[lst.id] = lst;
  }

  /* ================== ADMIN ================== */
  /* The admin password is kept in its OWN localStorage key, written and read
     synchronously — NOT inside the world save. The world save is debounced,
     versioned (a version bump regenerates a fresh world), and can be reset or
     re-imported; any of those would silently wipe an in-world password and
     force "first access — set the password" on every reload. A standalone key
     survives all of that. world.adminPass is still mirrored for older saves. */
  const ADMIN_PASS_KEY = 'dyaakara_admin_pass_v1';
  /* Built-in default admin password. This is a CLIENT-SIDE convenience gate,
     not real security — the whole admin panel and its Supabase anon key are
     already public — so a fixed default is fine and it means the panel never
     asks you to "set a password" again, even if this browser refuses to keep
     localStorage between loads (private mode, cleared storage, a fresh device).
     It always works; any password you additionally set with setPass() works too. */
  const DEFAULT_ADMIN_PASS_HASH = hashPass('rEsaliGrEsta810!');
  function readStoredAdminPass() {
    try { const v = localStorage.getItem(ADMIN_PASS_KEY); if (v) return v; } catch (e) { /* ignore */ }
    return (G.world && G.world.adminPass) || null;
  }
  function writeAdminPass(hash) {
    try { localStorage.setItem(ADMIN_PASS_KEY, hash); } catch (e) { /* ignore */ }
    if (G.world) { G.world.adminPass = hash; G.saveNow(); }
  }
  G.admin = {
    setPass(p) { writeAdminPass(hashPass(p)); },
    checkPass(p) { const h = hashPass(p); return h === DEFAULT_ADMIN_PASS_HASH || readStoredAdminPass() === h; },
    /* always true — there is always at least the built-in default password, so
       the gate shows "Enter" (never the first-time "set a password" screen) */
    hasPass() { return true; },
    clearPass() {
      try { localStorage.removeItem(ADMIN_PASS_KEY); } catch (e) { /* ignore */ }
      if (G.world) { G.world.adminPass = null; G.saveNow(); }
    },
    ban(accId, reason, days) {
      const until = days ? Date.now() + days * 86400000 : null;
      G.world.bans[accId] = { at: Date.now(), reason, permanent: !days, until, public: true };
      G.world.rulings.unshift({ at: Date.now(), text: 'BAN — ' + (G.world.accounts[accId] ? G.world.accounts[accId].displayName : accId) + ': ' + reason + (days ? ' (' + days + ' days)' : ' (permanent)') });
      G.saveNow();
      const acc = G.world.accounts[accId];
      if ((!acc || !acc.ai) && DYA.accountCloud && DYA.accountCloud.configured()) DYA.accountCloud.pushBan(accId, reason, !days, until);
    },
    unban(accId) {
      delete G.world.bans[accId];
      G.world.rulings.unshift({ at: Date.now(), text: 'Ban lifted for ' + (G.world.accounts[accId] ? G.world.accounts[accId].displayName : accId) + '.' });
      G.saveNow();
      if (DYA.accountCloud && DYA.accountCloud.configured()) DYA.accountCloud.clearBan(accId);
    },
    announce(title, body, type) {
      G.world.announcements.unshift({ id: U.uid('ann'), at: Date.now(), title, body, type: type || 'mass' });
      Object.values(G.world.accounts).forEach(a => {
        if (!a.ai) { a.notifications.push({ id: U.uid('ntf'), at: Date.now(), type: 'announcement', title, body, icon: '📣' }); pushAccountToCloud(a); }
      });
      G.saveNow();
    },
    spawnToken(accId, speciesId, rarity, opts) {
      opts = opts || {};
      const acc = G.world.accounts[accId];
      if (!acc) return { err: 'Account not found' };
      const tok = TK.mint({ speciesId, rng: new U.Rng(U.newSeed()), owner: accId, rarity, name: opts.name });
      /* §4 famous tokens: the editable-name flag is set at creation, here */
      if (opts.name && !opts.nameEditable) tok.nameLocked = true;
      if (opts.name) tok.famous = true;
      acc.tokens[tok.id] = tok;
      if (!acc.ai) acc.notifications.push({ id: U.uid('ntf'), at: Date.now(), type: 'system', title: 'Token granted', body: 'The Dya Guild has granted you ' + tok.name + ' (' + SP.get(speciesId).name + ').', icon: '🎁' });
      G.saveNow();
      pushAccountToCloud(acc);
      return { tok };
    },
    grantTrusted(accId) { const a = G.world.accounts[accId]; if (a) { a.trustedSeller = true; G.saveNow(); pushAccountToCloud(a); } },
    /* Reserve (Crafting Station): grant a designed, unowned token directly
       into a player's collection — minted true to the design, then consumed
       (removed) from the Reserve, exactly like a sold Guild listing. */
    grantReserveEntry(id, accId) {
      const entry = DYA.mods && DYA.mods.getReserveEntry(id);
      if (!entry) return { err: 'That token is not in the Reserve.' };
      const acc = G.world.accounts[accId];
      if (!acc) return { err: 'Account not found.' };
      DYA.mods.deleteReserveEntry(id);
      const tok = TK.mintSpec(entry.spec, { rng: new U.Rng(U.newSeed()), owner: acc.id, aiOwner: !!acc.ai });
      acc.tokens[tok.id] = tok;
      if (!acc.ai) acc.notifications.push({ id: U.uid('ntf'), at: Date.now(), type: 'system', title: 'Token granted', body: 'The Dya Guild has granted you ' + tok.name + ' (' + (SP.get(tok.speciesId) || {}).name + ').', icon: '🎁' });
      G.saveNow();
      pushAccountToCloud(acc);
      return { ok: true, tok };
    },
    /* Reserve (Crafting Station): push a designed, unowned token onto the
       Guild stall as a one-of-a-kind listing (sold once, like the market),
       removing it from the Reserve. */
    pushReserveToStall(id, price) {
      const entry = DYA.mods && DYA.mods.getReserveEntry(id);
      if (!entry) return { err: 'That token is not in the Reserve.' };
      DYA.mods.deleteReserveEntry(id);
      DYA.mods.setGuildListing({ id: U.uid('glst'), spec: entry.spec, price: Math.max(0, price | 0), desc: '', createdAt: Date.now() });
      return { ok: true };
    },
    /* grant Hunt slots directly to a player (admin gift). These never expire
       (expiresAtBand null) so an admin grant doesn't quietly vanish at the next
       level band the way earned slots do. */
    grantHuntSlots(accId, n) {
      const a = G.world.accounts[accId];
      if (!a) return { err: 'Account not found' };
      a.huntSlots = a.huntSlots || [];
      const count = Math.max(1, n | 0);
      for (let i = 0; i < count; i++) a.huntSlots.push({ id: U.uid('hs'), huntId: null, source: 'admin', expiresAtBand: null });
      if (!a.ai) a.notifications.push({ id: U.uid('ntf'), at: Date.now(), type: 'system', title: count > 1 ? count + ' Hunt slots granted' : 'Hunt slot granted', body: 'The Dya Guild grants you ' + count + ' Hunt slot' + (count > 1 ? 's' : '') + '. Choose your quarry in Adventures.', icon: '🏹' });
      G.saveNow(); pushAccountToCloud(a);
      return { ok: true, count };
    },
    /* count of procedurally-generated filler tokens still in the world */
    countAutoGenTokens() {
      let n = 0;
      Object.values(G.world.accounts).forEach(acc => Object.values(acc.tokens || {}).forEach(t => { if (t.autoGen && !t.adminEdited && !t.isStarter) n++; }));
      return n;
    },
    /* wipe every auto-generated token so only hand-designed / tutorial tokens
       remain. Cleans pouches and any market listings that pointed at them. */
    purgeAutoGenTokens() {
      let removed = 0;
      const touched = [];
      Object.values(G.world.accounts).forEach(acc => {
        let hit = false;
        Object.values(acc.tokens || {}).forEach(t => {
          if (t.autoGen && !t.adminEdited && !t.isStarter) {
            delete acc.tokens[t.id]; removed++; hit = true;
            (acc.pouches || []).forEach(p => { if (p.tokenIds) p.tokenIds = p.tokenIds.filter(x => x !== t.id); });
          }
        });
        if (hit) touched.push(acc);
      });
      Object.values(G.world.market.listings).forEach(l => {
        const seller = G.world.accounts[l.sellerId];
        if (!seller || !seller.tokens[l.tokenId]) delete G.world.market.listings[l.id];
      });
      G.saveNow();
      touched.forEach(acc => pushAccountToCloud(acc));
      return { removed };
    },
    activateInterplanetary() {
      const rng = new U.Rng(U.newSeed());
      const t = {
        id: U.uid('trn'), name: 'THE INTERPLANETARY — Season ' + G.world.season.number, circuit: 'Interplanetary', sealed: true,
        official: true, /* an official season tournament — the only kind that awards titles */
        organizer: 'Dya Guild', entryFee: 1000, pouchFormat: 'three-draft', size: 16,
        state: 'open', players: [], bracket: null,
        titlePool: EC.TITLES.filter(tt => tt.tier === 'Interplanetary').map(tt => tt.id),
        rules: [], arena: L.ARENAS['Interplanetary'][0], terrain: 'spire_cliffs', createdAt: Date.now(),
        schedule: 'Season finale — ends the ranked season',
        endsSeason: true,
      };
      G.world.tournaments[t.id] = t;
      G.admin.announce('The Interplanetary is LIVE', 'The Dya Guild has activated the Interplanetary tournament. The ranked season ends with its conclusion. Glory to the champion of the Mbaru Tatu.');
      G.saveNow();
      return t;
    },
    endSeason() {
      const w = G.world;
      w.season.endedAt = Date.now();
      const winners = w.season.winners.slice();
      w.season = { number: w.season.number + 1, startedAt: Date.now(), endedAt: null, winners: [] };
      Object.values(w.accounts).forEach(a => { if (!a.ai) { a.rank = Math.round((a.rank + 1000) / 2); a.seasonReached = []; } });
      G.admin.announce('Season ' + (w.season.number - 1) + ' has ended', 'The season reset ceremony honors all circuit winners. A new season begins now. Ranks have been softened toward 1000, and the circuit climb begins again.');
      G.saveNow();
      return winners;
    },
    openReport(repId) {
      const rep = G.world.appeals.find(r => r.id === repId);
      if (rep && rep.kind === 'tokenReport') {
        // During review: token frozen
        const owner = G.world.accounts[rep.against];
        if (owner && owner.tokens[rep.tokenId]) { owner.tokens[rep.tokenId].frozen = true; owner.tokens[rep.tokenId].flagged = true; }
        rep.reviewing = true;
        G.saveNow();
      }
      return rep;
    },
    resolveReport(repId, outcome) {
      const rep = G.world.appeals.find(r => r.id === repId);
      if (!rep) return;
      rep.open = false; rep.outcome = outcome; rep.resolvedAt = Date.now();
      if (rep.kind === 'tokenReport') {
        const owner = G.world.accounts[rep.against];
        const tok = owner && owner.tokens[rep.tokenId];
        if (tok) {
          tok.frozen = false;
          if (outcome === 'deleted') { delete owner.tokens[rep.tokenId]; }
          else if (outcome === 'cleared' || outcome === 'corrected') { tok.flagged = false; }
        }
        if (owner && !owner.ai) owner.notifications.push({ id: U.uid('ntf'), at: Date.now(), type: 'announcement', title: 'Guild ruling', body: 'Review of your token concluded: ' + outcome + '.', icon: '⚖️' });
        pushAccountToCloud(owner);
      }
      G.saveNow();
    },
  };

  DYA.store = store;
  DYA.state = G;
})();
