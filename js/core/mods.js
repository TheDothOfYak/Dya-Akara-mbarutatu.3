/* ============================================================
   DYA'AKARA — core/mods.js
   The live-editing layer. Everything the Admin Panel can change
   about the GAME ITSELF — species stats, behaviors, sprites,
   lore text, UI strings, balance tables, AI tuning — is stored
   here as an overrides document ("mods") and applied on top of
   the base data files at load time.

   Storage:
     • localStorage (dyaakara_mods_v1) — always, so the same
       browser's game + admin panel share edits instantly.
     • Supabase table dya_config (key='mods') — when online is
       configured, so EVERY player receives admin edits. The
       game polls for a newer revision every minute.

   Load order: after data files (species/economy/lore), before
   token/state — the cached overrides apply synchronously at
   parse time, then the remote revision is fetched async.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, SP = DYA.species, EC = DYA.economy, L = DYA.lore;

  const M = {};
  DYA.mods = M;

  const LS_KEY = 'dyaakara_mods_v1';
  const CONFIG_KEY = 'mods';
  const POLL_MS = 60000;
  const IS_ADMIN_PAGE = /admin/i.test((window.location && window.location.pathname) || '');

  /* text replacement is live in the game, but OFF inside the admin
     panel itself — renaming "Save" must not break the editor */
  M.trEnabled = !IS_ADMIN_PAGE;

  /* ================= BASE SNAPSHOTS =================
     Pristine copies of everything editable, taken before any
     override is applied. "Reset to default" restores from here. */
  const BASE = {
    species: U.deepCopy(SP.all),
    balance: {
      RARITY_COST: SP.RARITY_COST.slice(),
      RARITY_VALUE: SP.RARITY_VALUE.slice(),
      SIZE_HP: SP.SIZE_HP.slice(),
      SIZE_DMG: SP.SIZE_DMG.slice(),
      SIZE_RADIUS: SP.SIZE_RADIUS.slice(),
      SIZE_SPEED: SP.SIZE_SPEED.slice(),
    },
    economy: {
      START: U.deepCopy(EC.START),
      XP: U.deepCopy(EC.XP),
      GOLD: U.deepCopy(EC.GOLD),
      XP_BONUS: U.deepCopy(EC.XP_BONUS),
      MARKET_TAX: EC.MARKET_TAX.slice(),
      BUYBACK_RATE: EC.BUYBACK_RATE,
      LISTING_FEE: EC.LISTING_FEE,
      TRUSTED_SELLER_SALES: EC.TRUSTED_SELLER_SALES,
      CRAFT_COST: U.deepCopy(EC.CRAFT_COST),
      CRAFT_BY_OKID: U.deepCopy(EC.CRAFT_BY_OKID),
      COMBINE_OKID: U.deepCopy(EC.COMBINE_OKID),
      NO_AUTOGEN: EC.NO_AUTOGEN,
      POUCH_SIZE: EC.POUCH_SIZE,
    },
    lore: {
      TIPS: L.TIPS.slice(),
      QUICK_CHAT: L.QUICK_CHAT.slice(),
      SPECTATOR_REACTIONS: L.SPECTATOR_REACTIONS.slice(),
      MATERIALS: L.MATERIALS.slice(),
      PLACES: L.PLACES.slice(),
      TERRAINS: L.TERRAINS.slice(),
      STORY_LIVED: L.STORY_LIVED.slice(),
      STORY_TEMPER: L.STORY_TEMPER.slice(),
      STORY_MATERIAL: L.STORY_MATERIAL.slice(),
    },
  };
  M.base = BASE;

  /* ---------- AI tuning defaults (the Dya'kukull dials) ---------- */
  const AI_DEFAULTS = {
    marketActivityMul: 1,    // × every AI's own marketActivity
    matchSkillMul: 1,        // × every AI's own matchSkill
    actionsPerBeat: 3,       // market actions per 45s world tick
    minOnline: 6,            // AIs kept online at minimum
    challengeChance: 0.07,   // per beat: an AI challenges the player
    friendRequestChance: 0.015,
    listPriceLo: 0.8,        // AI listing price range × market value
    listPriceHi: 1.5,
    tournamentJoinChance: 0.55,
  };
  M.AI_DEFAULTS = AI_DEFAULTS;

  function emptyMods() {
    return {
      rev: 0,
      updatedAt: 0,
      species: {},        // id -> partial override (top-level keys replace base)
      customSpecies: {},  // id -> full definition (admin-created clones)
      text: {},           // exact UI string -> replacement (game-wide)
      lore: {},           // key -> replacement array (TIPS, QUICK_CHAT, …)
      balance: {},        // key -> replacement array (RARITY_COST, SIZE_HP, …)
      economy: {},        // key -> replacement value
      ai: {},             // AI tuning knobs (see AI_DEFAULTS)
      hunts: {},          // id -> admin-authored individual Hunt (see Hunts tab)
      guild: {            // the Dya Guild's own market stall (see Guild Market tab)
        pool: [],         // species ids the RANDOM "Guild stall token" draws from
        poolPrice: 100,   // price of one random Guild stall token
        poolRarityMax: 1, // ceiling rarity a random pull can roll
        listings: {},     // id -> individual creature the Guild sells outright
      },
      season: { live: false, openedAt: 0 }, // the Guild's official season: OFF until the organizer (admin) opens it
    };
  }

  M.data = emptyMods();

  /* ================= APPLY ================= */
  /* Species objects are shared BY REFERENCE across the whole game
     (SP.get returns the live object), so apply() mutates them in
     place — every system sees the edit immediately. */
  function applySpecies(id, live) {
    const base = BASE.species[id];
    const patch = M.data.species[id];
    /* restore pristine base first (removes stale override keys) */
    for (const k in live) if (!(k in base)) delete live[k];
    Object.assign(live, U.deepCopy(base));
    if (patch) {
      for (const k in patch) {
        if (patch[k] === null) delete live[k];
        else live[k] = U.deepCopy(patch[k]);
      }
    }
    live.id = id;
  }

  function applyInPlaceArray(target, replacement) {
    target.length = 0;
    replacement.forEach(v => target.push(U.deepCopy(v)));
  }

  M.apply = function () {
    /* ---- species (base roster) ---- */
    for (const id in BASE.species) applySpecies(id, SP.all[id]);
    /* ---- custom species (admin-created) ---- */
    Object.keys(SP.all).forEach(id => {
      if (!BASE.species[id] && !M.data.customSpecies[id]) delete SP.all[id];
    });
    for (const id in M.data.customSpecies) {
      const def = U.deepCopy(M.data.customSpecies[id]);
      def.id = id; def._custom = true;
      if (SP.all[id]) {
        const live = SP.all[id];
        for (const k in live) delete live[k];
        Object.assign(live, def);
      } else {
        SP.all[id] = def;
      }
    }
    /* ---- rebuild the derived rosters (live references, not copies) ---- */
    SP.list.length = 0;
    Object.keys(SP.all).forEach(k => SP.list.push(SP.all[k]));
    SP.craftable.length = 0;
    Object.keys(SP.all).forEach(k => { if (!SP.all[k].notCraftable) SP.craftable.push(k); });

    /* ---- balance tables (mutated in place — engine holds references) ---- */
    for (const k in BASE.balance) {
      const src = (M.data.balance && M.data.balance[k]) || BASE.balance[k];
      applyInPlaceArray(SP[k], src);
    }

    /* ---- economy ---- */
    for (const k in BASE.economy) {
      const src = (M.data.economy && k in M.data.economy) ? M.data.economy[k] : BASE.economy[k];
      const cur = EC[k];
      if (Array.isArray(cur)) applyInPlaceArray(cur, src);
      else if (cur && typeof cur === 'object') {
        for (const kk in cur) delete cur[kk];
        Object.assign(cur, U.deepCopy(src));
      } else EC[k] = src;
    }

    /* ---- lore text pools ---- */
    for (const k in BASE.lore) {
      const src = (M.data.lore && M.data.lore[k]) || BASE.lore[k];
      applyInPlaceArray(L[k], src);
    }

    if (DYA.ui && DYA.ui.onModsApplied) DYA.ui.onModsApplied();
  };

  /* ================= TEXT OVERRIDES ================= */
  M.tr = function (s) {
    if (!M.trEnabled || s == null) return s;
    const t = M.data.text;
    if (!t) return s;
    const r = t[s];
    return r != null ? r : s;
  };

  /* ================= AI TUNING ================= */
  M.aiTuning = function () {
    return Object.assign({}, AI_DEFAULTS, M.data.ai || {});
  };

  /* ================= OFFICIAL SEASON =================
     The Guild's official season (the ranked ladder) doesn't run until the
     organizer — the admin — opens it. This flag rides the same dya_config
     channel as every other admin edit, so every player's game learns the
     season is live within a minute. */
  M.seasonLive = function () { const s = M.data.season || {}; return !!s.live; };
  M.setSeasonLive = function (live) {
    M.data.season = Object.assign({ live: false, openedAt: 0 }, M.data.season || {});
    M.data.season.live = !!live;
    if (live) M.data.season.openedAt = Date.now();
    M.save();
  };

  /* ================= HUNTS =================
     Individual, admin-authored quarry. Unlike species (a template),
     each Hunt is ONE specific creature: it is hunted once and then
     consumed. Authored in the Admin Panel's Hunts tab, stored here so
     the roster — and each "hunted" flag — reaches every player online. */
  M.hunts = function () { return Object.values(M.data.hunts || {}); };
  M.getHunt = function (id) { return (M.data.hunts || {})[id] || null; };
  M.availableHunts = function () { return M.hunts().filter(h => !h.hunted); };
  M.huntedHunts = function () { return M.hunts().filter(h => h.hunted); };
  M.setHunt = function (h) {
    if (!h || !h.id) return;
    M.data.hunts = M.data.hunts || {};
    M.data.hunts[h.id] = U.deepCopy(h);
    M.save();
  };
  M.deleteHunt = function (id) {
    if (M.data.hunts && M.data.hunts[id]) { delete M.data.hunts[id]; M.save(); }
  };
  /* Reopen a consumed Hunt (admin action). */
  M.reopenHunt = function (id) {
    const h = M.data.hunts && M.data.hunts[id];
    if (!h) return;
    h.hunted = false; h.huntedBy = null; h.huntedAt = 0;
    M.save();
  };
  /* Global consumption: the first player to finish a Hunt claims it for
     the whole world. We adopt any newer admin state first so our push
     doesn't clobber a concurrent edit, then flag it and push straight
     away (the same optimistic, first-writer-wins model as the market). */
  M.markHunted = async function (id, by) {
    if (M.configured()) { try { await M.fetchRemote(); } catch (e) { /* offline is fine */ } }
    const h = M.data.hunts && M.data.hunts[id];
    if (!h) return { missing: true };
    if (h.hunted) return { already: true, by: h.huntedBy };
    h.hunted = true; h.huntedBy = by || null; h.huntedAt = Date.now();
    M.save();
    if (M.configured()) { try { await M.pushRemote(); } catch (e) { /* debounced push will retry */ } }
    return { ok: true };
  };

  /* ================= GUILD MARKET =================
     The Dya Guild's own stall. Two admin-authored parts, both riding the
     same dya_config channel as every other edit so every player's game
     picks them up within a minute:
       • pool  — the species the RANDOM "Guild stall token" draws from,
                 plus its price and the highest rarity a pull may roll.
       • listings — individual creatures the Guild sells outright: each is
                 a specific species/rarity/name/price the player can buy
                 directly, minted deterministically so what's shown is what
                 you get. */
  const GUILD_DEFAULT_POOL = ['kipsu', 'wild_punk', 'uff', 'raf_krabbi', 'rodak', 'mikolo_moko', 'karnen'];
  M.guildData = function () {
    const g = M.data.guild || {};
    return {
      pool: Array.isArray(g.pool) ? g.pool : [],
      poolPrice: g.poolPrice != null ? g.poolPrice : 100,
      poolRarityMax: g.poolRarityMax != null ? g.poolRarityMax : 1,
      listings: g.listings || {},
    };
  };
  /* The effective random pool: the admin's curated species if they've set
     any, otherwise the original built-in seven. */
  M.guildPool = function () {
    const g = M.guildData();
    return (g.pool && g.pool.length) ? g.pool.slice() : GUILD_DEFAULT_POOL.slice();
  };
  M.guildListings = function () { return Object.values((M.data.guild && M.data.guild.listings) || {}); };
  /* Only the listings still for sale — a listing is one-of-a-kind, so once
     any player buys it, it's gone from every player's stall. */
  M.availableGuildListings = function () { return M.guildListings().filter(l => !l.sold); };
  M.soldGuildListings = function () { return M.guildListings().filter(l => l.sold); };
  M.setGuildPool = function (pool, price, rarityMax) {
    M.data.guild = M.data.guild || {};
    M.data.guild.pool = (pool || []).slice();
    if (price != null) M.data.guild.poolPrice = Math.max(0, price);
    if (rarityMax != null) M.data.guild.poolRarityMax = Math.max(0, rarityMax);
    M.save();
  };
  M.setGuildListing = function (l) {
    if (!l || !l.id) return;
    M.data.guild = M.data.guild || {};
    M.data.guild.listings = M.data.guild.listings || {};
    M.data.guild.listings[l.id] = U.deepCopy(l);
    M.save();
  };
  M.deleteGuildListing = function (id) {
    if (M.data.guild && M.data.guild.listings && M.data.guild.listings[id]) {
      delete M.data.guild.listings[id];
      M.save();
    }
  };
  /* Put a sold listing back on the stall (admin action). */
  M.relistGuildListing = function (id) {
    const l = M.data.guild && M.data.guild.listings && M.data.guild.listings[id];
    if (!l) return;
    l.sold = false; l.soldBy = null; l.soldAt = 0;
    M.save();
  };
  /* Atomically claim a one-of-a-kind listing for a buyer. Same optimistic,
     first-writer-wins model as Hunts and the online market: adopt the newest
     admin state first so we don't clobber a concurrent sale, refuse if it's
     already gone, otherwise flag it sold and push straight away. The caller
     only mints the token and charges gold when this returns { ok: true }. */
  M.buyGuildListing = async function (id, by) {
    if (M.configured()) { try { await M.fetchRemote(); } catch (e) { /* offline is fine */ } }
    const l = M.data.guild && M.data.guild.listings && M.data.guild.listings[id];
    if (!l) return { missing: true };
    if (l.sold) return { already: true, by: l.soldBy };
    l.sold = true; l.soldBy = by || null; l.soldAt = Date.now();
    M.save();
    if (M.configured()) { try { await M.pushRemote(); } catch (e) { /* debounced push will retry */ } }
    return { ok: true };
  };

  /* ================= EDIT HELPERS (used by the Admin Panel) ================= */
  /* Compute the minimal per-key diff of an edited species vs its base. */
  M.setSpecies = function (id, edited) {
    const base = BASE.species[id];
    if (!base) { /* custom species: store the whole definition */
      const def = U.deepCopy(edited); delete def._custom;
      M.data.customSpecies[id] = def;
      M.save();
      return;
    }
    const patch = {};
    const keys = new Set(Object.keys(base).concat(Object.keys(edited)));
    keys.forEach(k => {
      if (k === 'id') return;
      const inEdit = k in edited, inBase = k in base;
      if (inEdit && (!inBase || JSON.stringify(edited[k]) !== JSON.stringify(base[k]))) patch[k] = U.deepCopy(edited[k]);
      else if (!inEdit && inBase) patch[k] = null; // deleted key
    });
    if (Object.keys(patch).length) M.data.species[id] = patch;
    else delete M.data.species[id];
    M.save();
  };
  M.resetSpecies = function (id) {
    if (BASE.species[id]) delete M.data.species[id];
    else delete M.data.customSpecies[id];
    M.save();
  };
  M.isEdited = function (id) { return !!M.data.species[id]; };
  M.isCustom = function (id) { return !!M.data.customSpecies[id]; };

  M.set = function (section, key, value) {
    /* section: 'lore' | 'balance' | 'economy' | 'ai' | 'text' */
    M.data[section] = M.data[section] || {};
    if (value === undefined || value === null) delete M.data[section][key];
    else {
      /* storing a value identical to base = clearing the override */
      const baseVal = BASE[section] ? BASE[section][key] : undefined;
      if (baseVal !== undefined && JSON.stringify(baseVal) === JSON.stringify(value)) delete M.data[section][key];
      else M.data[section][key] = U.deepCopy(value);
    }
    M.save();
  };
  M.resetSection = function (section) { M.data[section] = {}; M.save(); };
  M.resetAll = function () { M.data = emptyMods(); M.save(); };

  M.export = function () { return JSON.stringify(M.data, null, 2); };
  M.import = function (json) {
    const d = JSON.parse(json);
    M.data = Object.assign(emptyMods(), d);
    M.save();
  };

  /* how many edits are live (for the admin overview) */
  M.summary = function () {
    const d = M.data;
    return {
      species: Object.keys(d.species || {}).length,
      customSpecies: Object.keys(d.customSpecies || {}).length,
      text: Object.keys(d.text || {}).length,
      lore: Object.keys(d.lore || {}).length,
      balance: Object.keys(d.balance || {}).length + Object.keys(d.economy || {}).length,
      ai: Object.keys(d.ai || {}).length,
      hunts: Object.keys(d.hunts || {}).length,
      huntsAvailable: Object.values(d.hunts || {}).filter(h => !h.hunted).length,
      guildListings: Object.keys((d.guild && d.guild.listings) || {}).length,
      rev: d.rev,
      updatedAt: d.updatedAt,
    };
  };

  /* ================= PERSISTENCE ================= */
  function cacheLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(M.data)); } catch (e) { console.error('mods cache failed', e); }
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) M.data = Object.assign(emptyMods(), JSON.parse(raw));
    } catch (e) { console.error('mods load failed', e); }
  }

  let pushTimer = null;
  M.save = function () {
    M.data.rev = (M.data.rev || 0) + 1;
    M.data.updatedAt = Date.now();
    cacheLocal();
    M.apply();
    /* debounce the remote push — admin edits often come in bursts */
    if (M.configured()) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => { M.pushRemote(); }, 1200);
    }
  };

  /* ================= REMOTE SYNC (Supabase dya_config) ================= */
  function cfg() { return (window.DYA_CONFIG && window.DYA_CONFIG.supabase) || {}; }
  M.configured = function () { const c = cfg(); return !!(c.url && c.anonKey); };
  M.syncState = { lastPush: 0, lastFetch: 0, error: null, remoteRev: null };

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
        const e = new Error(msg); e.status = res.status;
        throw e;
      }
      return data;
    });
  }

  M.pushRemote = async function () {
    if (!M.configured()) return { err: 'Online is not configured.' };
    try {
      await rest('POST', 'dya_config?on_conflict=key', {
        key: CONFIG_KEY, value: M.data, updated_at: new Date().toISOString(),
      }, 'resolution=merge-duplicates');
      M.syncState.lastPush = Date.now();
      M.syncState.error = null;
      M.syncState.remoteRev = M.data.rev;
      return { ok: true };
    } catch (e) {
      M.syncState.error = e.message;
      return { err: e.message };
    }
  };

  M.fetchRemote = async function () {
    if (!M.configured()) return { err: 'Online is not configured.' };
    try {
      const rows = await rest('GET', 'dya_config?key=eq.' + CONFIG_KEY + '&select=value');
      M.syncState.lastFetch = Date.now();
      M.syncState.error = null;
      const remote = rows && rows[0] && rows[0].value;
      if (remote) {
        M.syncState.remoteRev = remote.rev || 0;
        /* Adopt when the remote is NEWER BY WALL-CLOCK (updatedAt), not merely
           when its rev is higher. The rev is a per-device counter, so a device
           that has made its own edits can end up with a higher local rev than a
           genuinely newer edit made elsewhere and would otherwise ignore it —
           the exact reason admin edits "didn't stick" on a second device.
           Timestamp comparison is last-writer-wins across every device. */
        const remoteAt = remote.updatedAt || 0, localAt = M.data.updatedAt || 0;
        const newer = remoteAt > localAt || (remoteAt === localAt && (remote.rev || 0) > (M.data.rev || 0));
        if (newer) {
          M.data = Object.assign(emptyMods(), remote);
          cacheLocal();
          M.apply();
          return { ok: true, adopted: true };
        }
      }
      return { ok: true, adopted: false };
    } catch (e) {
      /* a missing table just means schema.sql hasn't been re-run yet */
      M.syncState.error = e.message;
      return { err: e.message };
    }
  };

  /* ================= BOOT ================= */
  loadLocal();
  M.apply();
  if (M.configured() && typeof fetch === 'function') {
    M.fetchRemote();
    /* the game keeps listening for admin edits; the admin page
       fetches once so an open editor is never clobbered mid-edit */
    if (!IS_ADMIN_PAGE) setInterval(() => { M.fetchRemote(); }, POLL_MS);
  }
})();
