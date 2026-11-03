/* ============================================================
   SKAAR UVERKHRON — js/make.js
   Factories: heroes, captains, memory cores, towns, armies,
   wild groups and players.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state;
  const M = SU.make = {};

  function personName(R, people) { return R.pick(D.NAMES[people]); }

  /* ---------- heroes ---------- */
  M.hero = function (st, opts) {
    const R = SU.rng(st); opts = opts || {};
    const people = opts.people || R.weighted(Object.keys(D.PEOPLES), p => p === 'eikar' ? 4 : p === 'karnen' ? 1.5 : 2);
    const id = SU.uid(st, 'h');
    const stats = { Strength: 1, Defense: 1, Stride: 1, Cunning: 1 };
    Object.entries(D.PEOPLES[people].lean).forEach(([k, v]) => stats[k] += v);
    for (let i = 0; i < 2; i++) stats[R.pick(D.STATS)]++;
    const base = opts.base || R.pick(D.SKILL_IDS);
    const specCr = R.pick(['malsti', 'velnur', 'ver', 'harkal', 'kaloeik', 'tyndael', 'xiweik', 'lutut', D.PEOPLES[people].buff]);
    const h = {
      id, name: opts.name || (personName(R, people) + ' ' + R.pick(D.EPITHETS)), people, owner: opts.owner == null ? -1 : opts.owner,
      faction: 'duskareth', look: R.int(1, 1e9), level: 1, xp: 0, stats,
      skills: { [base]: 1 }, base, trainedToday: 0,
      songs: [], breath: 0, relics: {}, linked: [], pouch: [], cores: [], kahiz: {}, kahizCount: 0,
      spec: { cr: specCr, pct: 10 }, mount: 'punk', slots: [null, null, null, null, null],
      levelUps: [], dead: false,
    };
    if (base === 'songcraft') h.songs.push(R.pick(['mend', 'rally', 'quickstep', 'dimsight']));
    h.breath = M.breathMax(st, h);
    st.heroes[id] = h;
    return h;
  };
  M.breathMax = function (st, h) {
    const sc = S.skill(st, h, 'songcraft');
    return Math.round((12 + sc * 10 + (h.level || 1) + S.relicMod(st, h, 'breath')) * (1 + S.skillVal(st, h, 'breathwork') / 100));
  };
  M.heroCost = 2500;

  /* ---------- captains ---------- */
  M.captain = function (st, opts) {
    const R = SU.rng(st); opts = opts || {};
    const people = opts.people || R.weighted(Object.keys(D.PEOPLES), p => p === 'eikar' ? 4 : p === 'keilia' ? 2.5 : 1.5);
    const rank = opts.rank || R.weighted(['vel', 'stamijan', 'naelst', 'thar'], r => r === 'vel' ? 5 : r === 'naelst' ? 1.2 : 2);
    const abil = opts.abil || R.pick(Object.keys(D.CAPTAIN_ABIL));
    const lvl = opts.level || 1;
    const c = {
      id: SU.uid(st, 'c'), name: opts.name || personName(R, people), people, rank, abil,
      morale: R.int(0, 1) + (abil === 'banner' ? 1 : 0), luck: R.int(0, 1) + (abil === 'charm' ? 1 : 0),
      level: lvl, hp: D.CAPTAIN_BASE.hp + lvl * D.CAPTAIN_BASE.hpLevel, atk: D.CAPTAIN_BASE.atk + lvl, def: D.CAPTAIN_BASE.def + lvl,
      capacity: D.CAPTAIN_BASE.capacity + (abil === 'warcaller' ? 1 : 0), look: R.int(1, 1e9),
    };
    /* the rarest of all: a captain so good they lead only one stack, but lead it superbly */
    if (opts.rank !== 'rogue' && (opts.elite || R.chance(0.012))) {
      c.elite = true; c.capacity = 1; c.hp *= 2; c.atk += 6; c.def += 6; c.morale += 3; c.luck += 1;
      c.name += ' the Peerless';
    }
    return c;
  };
  M.captainCost = c => 600 + c.level * 250 + (c.rank === 'naelst' ? 400 : 0) + (c.elite ? 4000 : 0);
  M.capSlot = (cap, stacks) => ({ kind: 'cap', cap, stacks: stacks || [], reserve: [] });

  /* ---------- memory cores ---------- */
  /* a hero's core holds all their skills; when picked up it draws its offer */
  M.heroCore = function (st, h) {
    const skills = Object.entries(h.skills).map(([id, lv]) => ({ id, lv }));
    const core = { id: SU.uid(st, 'k'), kind: 'hero', name: h.name, people: h.people, skills, songs: (h.songs || []).slice(), offer: [], active: [] };
    st.cores[core.id] = core; return core;
  };
  M.captainCore = function (st, cap) {
    const core = { id: SU.uid(st, 'k'), kind: 'captain', name: cap.name, people: cap.people, captain: SU.deep(cap) };
    st.cores[core.id] = core; return core;
  };
  /* wild leaders' cores: a spread of skills at levels that grow with strength */
  M.wildCore = function (st, power) {
    const R = SU.rng(st);
    const n = SU.clamp(3 + Math.floor(power / 30000), 3, 8), skills = [];
    const ids = R.shuffle(D.SKILL_IDS.slice());
    for (let i = 0; i < n; i++) skills.push({ id: ids[i], lv: SU.clamp(1 + Math.floor(R.next() * (1 + power / 40000)), 1, 4) });
    const core = { id: SU.uid(st, 'k'), kind: 'hero', name: R.pick(D.NAMES.eikar) + ' the Wanderer', people: 'eikar', skills, songs: [], offer: [], active: [] };
    st.cores[core.id] = core; return core;
  };
  /* draw the 5 (or more) skills a core offers to the hero who picks it up */
  M.drawOffer = function (st, core, hero) {
    if (core.kind !== 'hero') return;
    const R = SU.rng(st);
    const n = 5 + S.skillVal(st, hero, 'memory');
    const pool = core.skills.slice();
    R.shuffle(pool);
    core.offer = [];
    for (let i = 0; i < Math.min(n, pool.length); i++) core.offer.push(pool[i]);
    /* a thin core repeats its skills at a lower level so there are still 5 to choose from */
    while (core.offer.length < Math.min(5, n) && pool.length) { const s = R.pick(pool); core.offer.push({ id: s.id, lv: Math.max(1, s.lv - 1) }); }
    core.active = [0, 1].filter(i => i < core.offer.length);
    core.holder = hero.id;
  };

  /* ---------- towns ---------- */
  M.town = function (st, layer, x, y, owner, name) {
    const R = SU.rng(st);
    const t = {
      id: SU.uid(st, 't'), type: 'town', faction: 'duskareth', layer, x, y, owner,
      name: name || R.pick(TOWN_NAMES), built: D.START_BUILDINGS.slice(), pop: 260, builtToday: 0,
      avail: {}, garrison: [null, null, null, null, null], heroes: [], defender: null,
      shipyardTile: null, nekhCount: 0, sealed: 0,
    };
    D.DUSK_LINEUP.forEach(c => t.avail[c] = 0);
    t.avail.malsti = D.CREATURES.malsti.grow; t.avail.velnur = D.CREATURES.velnur.grow;
    st.objects[t.id] = t;
    return t;
  };
  const TOWN_NAMES = ['Duskmere', 'Velthar', 'Onnar’s Rest', 'Nekhgate', 'Stygian Hollow', 'Lunmarch', 'Ashveil', 'Thar Kessal', 'Quorvane', 'Hollowmere', 'Vel’s Crossing', 'Dimholt', 'Thalos Edge', 'Umbrevale', 'Ringhold', 'Duat’s Mouth', 'Greywater', 'Sablekeep'];
  M.TOWN_NAMES = TOWN_NAMES;

  /* ---------- armies ---------- */
  M.army = function (st, owner, layer, x, y, heroId, slots) {
    const a = { id: SU.uid(st, 'a'), owner, layer, x, y, heroId: heroId || null, slots: heroId ? null : (slots || [null, null, null, null, null]), mp: 0, mpMax: 0, boat: false, sleep: false, face: 1 };
    st.armies[a.id] = a;
    if (st._armyAt) st._armyAt[layer].set(y * st.layers[layer].w + x, a.id);
    return a;
  };

  /* ---------- wild groups: always led by a rogue Dearcàn ---------- */
  const WILD_TABLE = [
    // [creature, minPower, weight, layers]
    ['wildpunk', 0, 6], ['uff', 0, 4], ['dompunk', 0, 4], ['malsti', 0, 3], ['velnur', 0, 3], ['ver', 2000, 2],
    ['harkal', 5000, 3], ['kaloeik', 12000, 2], ['tyndael', 15000, 2], ['xiweik', 30000, 1.5], ['naga', 40000, 1.5], ['ularnaga', 45000, 1.5], ['lutut', 70000, 1],
  ];
  M.wild = function (st, layer, x, y, power, opts) {
    const R = SU.rng(st); opts = opts || {};
    const choices = WILD_TABLE.filter(w => w[1] <= power && (!opts.only || opts.only.includes(w[0])));
    const nStacks = opts.stacks || (power > 30000 ? R.int(2, 3) : power > 6000 ? R.int(1, 2) : 1);
    const kinds = [];
    for (let i = 0; i < nStacks; i++) kinds.push(opts.cr || R.weighted(choices, w => w[2] * (1 + w[1] / Math.max(1, power)))[0]);
    const per = power / nStacks;
    const stacks = kinds.map(cr => {
      const c = D.CREATURES[cr]; const unit = c.hp * (c.dmg[0] + c.dmg[1]) * 0.5 * (1 + (c.atk + c.def) * 0.04) * (c.ranged ? 1.3 : 1) * (c.fly ? 1.15 : 1);
      return { cr, n: Math.max(1, Math.round(per / unit)) };
    });
    /* group them under rogue captains: each captain leads up to 2 stacks.
       Pure beasts (the Naga, herds, RubberMcFly) follow no one. */
    const slots = [null, null, null, null, null];
    let si = 0;
    const beasts = stacks.filter(x => { const C = D.CREATURES[x.cr]; return C.beast || C.herd && (opts.herd || opts.stacks === 1) || x.cr === 'naga' || x.cr === 'mcfly'; });
    const led = stacks.filter(x => !beasts.includes(x));
    beasts.forEach(x => { if (si < 5) slots[si++] = { kind: 'stack', cr: x.cr, n: x.n }; });
    for (let k = 0; k < led.length && si < 5; k += 2) {
      const cap = M.captain(st, { rank: 'rogue', level: SU.clamp(1 + Math.floor(power / 15000), 1, 8) });
      slots[si++] = M.capSlot(cap, led.slice(k, k + 2));
    }
    const a = M.army(st, -1, layer, x, y, null, slots);
    a.wild = true; a.guard = opts.guard || null; a.roam = !!opts.roam; a.herd = !!(opts.herd || (D.CREATURES[kinds[0]].herd && stacks.length === 1 && R.chance(0.6)));
    a.power0 = power; a.home = { x, y };
    return a;
  };

  /* ---------- players ---------- */
  M.player = function (st, idx, cfg) {
    return {
      idx, name: cfg.name || ('Player ' + (idx + 1)), color: cfg.color || D.PLAYER_COLORS[idx].c, colorId: cfg.colorId || D.PLAYER_COLORS[idx].id,
      kind: cfg.kind || 'human', ai: cfg.ai || 'normal', team: cfg.team || 0, account: cfg.account || null, faction: cfg.faction || 'duskareth',
      res: Object.assign({}, D.START_RES), alive: true, explored: st.layers.map(L => new Uint8Array(L.w * L.h)),
      unlocked: [], tavern: { heroes: [], captains: [] }, knownUrverk: [], vault: [], hungry: 0,
      startLayer: 0, daysWithoutTown: 0, respect: {}, quests: [], stormWins: 0,
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
