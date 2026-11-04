/* ============================================================
   SKAAR UVERKHRON — js/state.js
   The shape of a game, and the small queries everything uses.

   state = {
     seed, rngState, nextId, day,
     setup:   { size, players:[...], mode, name },
     layers:  [ { id, w, h, t:Uint8Array terrain, ob:Uint8Array obstacle,
                  road:Uint8Array } ]          (index = layer number)
     objects: { id: { id, type, layer, x, y, ... } }   towns, mines, …
     armies:  { id: { id, owner, layer, x, y, heroId|null, slots, mp } }
     heroes:  { id: hero }, cores: { id: core },
     players: [ { idx, name, color, kind, ai, team, res, explored[], … } ],
     current, storm, weekEvent, monthEvent, log
   }
   Runtime-only fields start with _ and are rebuilt on load.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data;
  const S = SU.state = {};

  S.TCODES = Object.keys(D.TERRAIN);              // terrain code → id
  S.TC = {}; S.TCODES.forEach((k, i) => S.TC[k] = i);
  /* obstacles: 0 none */
  S.OB = { none: 0, tree: 1, pine: 2, mountain: 3, rock: 4, deadtree: 5, crystal: 6, reeds: 7, palm: 8, glowtree: 9, ridge: 10 };
  S.OB_NAMES = Object.keys(S.OB);

  S.idx = (L, x, y) => y * L.w + x;
  S.inside = (L, x, y) => x >= 0 && y >= 0 && x < L.w && y < L.h;
  S.terrainAt = (L, x, y) => S.TCODES[L.t[y * L.w + x]];

  /* ---------- occupancy: which object / army stands on each tile ---------- */
  S.rebuild = function (st) {
    st._occ = st.layers.map(L => new Int32Array(L.w * L.h));   // object index + 1
    st._block = st.layers.map(L => new Uint8Array(L.w * L.h));  // tiles blocked by object bodies
    st._armyAt = st.layers.map(() => new Map());
    st._objList = [];
    Object.values(st.objects).forEach(o => S.place(st, o));
    Object.values(st.armies).forEach(a => { if (!a.dead) st._armyAt[a.layer].set(a.y * st.layers[a.layer].w + a.x, a.id); });
  };
  S.place = function (st, o) {
    const L = st.layers[o.layer]; if (!L) return;
    st._objList.push(o.id);
    const k = st._objList.length;
    st._occ[o.layer][o.y * L.w + o.x] = k;
    o._k = k;
    S.footprint(o).forEach(([dx, dy]) => { const x = o.x + dx, y = o.y + dy; if (S.inside(L, x, y)) st._block[o.layer][y * L.w + x] = 1; });
  };
  S.unplace = function (st, o) {
    const L = st.layers[o.layer];
    if (st._occ[o.layer][o.y * L.w + o.x] === o._k) st._occ[o.layer][o.y * L.w + o.x] = 0;
    S.footprint(o).forEach(([dx, dy]) => { const x = o.x + dx, y = o.y + dy; if (S.inside(L, x, y)) st._block[o.layer][y * L.w + x] = 0; });
  };
  /* tiles an object's body covers, apart from the tile you visit it on */
  S.footprint = function (o) {
    if (o.type === 'town') return [[-1, 0], [1, 0], [-1, -1], [0, -1], [1, -1], [-1, -2], [0, -2], [1, -2]];
    if (o.type === 'mine' || o.type === 'keep') return [[-1, 0], [-1, -1], [0, -1]];
    if (o.type === 'urverk') return [[-1, -1], [0, -1], [1, -1]];
    if (o.type === 'visit' && (o.kind === 'shrine' || o.kind === 'tower' || o.kind === 'library' || o.kind === 'fair')) return [[-1, 0], [0, -1], [-1, -1]];
    return [];
  };
  S.objAt = function (st, layer, x, y) {
    const L = st.layers[layer]; if (!S.inside(L, x, y)) return null;
    const k = st._occ[layer][y * L.w + x]; if (!k) return null;
    const o = st.objects[st._objList[k - 1]];
    return o && o.layer === layer && o.x === x && o.y === y && !o.gone && !o.hidden ? o : null;
  };
  S.armyAt = function (st, layer, x, y) {
    const L = st.layers[layer]; const id = st._armyAt[layer].get(y * L.w + x);
    const a = id && st.armies[id]; return a && !a.dead && a.x === x && a.y === y && a.layer === layer ? a : null;
  };
  S.moveArmyIndex = function (st, a, layer, x, y) {
    const L0 = st.layers[a.layer];
    if (st._armyAt[a.layer].get(a.y * L0.w + a.x) === a.id) st._armyAt[a.layer].delete(a.y * L0.w + a.x);
    a.layer = layer; a.x = x; a.y = y;
    if (!a.dead) st._armyAt[layer].set(y * st.layers[layer].w + x, a.id);
  };
  S.passable = function (st, layer, x, y, opts) {
    const L = st.layers[layer]; if (!S.inside(L, x, y)) return false;
    const i = y * L.w + x; const T = D.TERRAIN[S.TCODES[L.t[i]]];
    if (opts && opts.boat) return !!T.water && !L.ob[i] && !st._block[layer][i];
    if (T.pass === false && !(opts && opts.fly && T.water)) return false;
    if (L.ob[i] && !(opts && opts.fly && L.ob[i] !== S.OB.mountain)) return false;
    if (st._block[layer][i]) return false;
    return true;
  };

  /* ---------- players ---------- */
  S.player = (st, i) => st.players[i];
  S.cur = st => st.players[st.current];
  S.allies = (st, a, b) => a === b || (a >= 0 && b >= 0 && st.players[a].team && st.players[a].team === st.players[b].team);
  S.color = (st, owner) => owner >= 0 ? st.players[owner].color : D.NEUTRAL_COLOR;

  /* ---------- calendar ---------- */
  S.cal = function (day) {
    const d0 = day - 1;
    return { day, month: Math.floor(d0 / D.MONTH) + 1, week: Math.floor((d0 % D.MONTH) / D.WEEK) + 1, dow: (d0 % D.WEEK) + 1, weekAbs: Math.floor(d0 / D.WEEK) + 1 };
  };
  S.isMarketDay = st => S.cal(st.day).dow === D.MARKET_DAY;
  /* where Xikia and Leotik are in their swing around Velki: 0..1 */
  S.phase = (day, layerId) => D.ORBITS[layerId] ? ((day - 1) % D.ORBITS[layerId]) / D.ORBITS[layerId] : 0;

  /* ---------- army helpers ---------- */
  S.slotsOf = (st, a) => a.heroId ? st.heroes[a.heroId].slots : a.slots;
  S.heroOf = (st, a) => a && a.heroId ? st.heroes[a.heroId] : null;
  /* every stack of creatures in a set of slots, flattened (captains' stacks too) */
  S.stacksIn = function (slots) {
    const out = [];
    (slots || []).forEach(s => {
      if (!s) return;
      if (s.kind === 'stack') out.push(s);
      else if (s.kind === 'cap') { s.stacks.forEach(x => x && out.push(x)); (s.reserve || []).forEach(x => x && out.push(x)); }
    });
    return out;
  };
  S.captainsIn = slots => (slots || []).filter(s => s && s.kind === 'cap').map(s => s.cap);
  S.armySize = slots => S.stacksIn(slots).reduce((t, s) => t + s.n, 0);
  S.isEmptySlots = slots => S.armySize(slots) === 0 && S.captainsIn(slots).length === 0;
  /* a rough fighting strength, for the AI and for "how strong does it look" */
  S.power = function (slots, hero) {
    let p = 0;
    S.stacksIn(slots).forEach(s => { const c = D.CREATURES[s.cr]; p += s.n * c.hp * (c.dmg[0] + c.dmg[1]) * 0.5 * (1 + (c.atk + c.def) * 0.04) * (c.ranged ? 1.3 : 1) * (c.fly ? 1.15 : 1); });
    S.captainsIn(slots).forEach(c => { p += 400 + (c.level || 1) * 120; });
    if (hero) p *= 1 + (hero.stats.Strength + hero.stats.Defense) * 0.05 + (hero.level - 1) * 0.02;
    return p;
  };
  S.powerWord = function (p) {
    if (p < 2500) return 'a few';
    if (p < 12000) return 'a band';
    if (p < 40000) return 'a host';
    if (p < 120000) return 'a horde';
    if (p < 400000) return 'a legion';
    return 'a vast legion';
  };
  /* how big a stack looks to someone who can't count it: [from, to, word] */
  S.COUNT_WORDS = [[1, 4, 'A few'], [5, 9, 'Several'], [10, 19, 'A pack'], [20, 49, 'Lots'], [50, 99, 'A horde'], [100, 249, 'A throng'], [250, 499, 'A swarm'], [500, 999, 'Zounds'], [1000, null, 'A legion']];
  S.countWord = function (n) { const w = S.COUNT_WORDS.find(c => n <= (c[1] == null ? Infinity : c[1])) || S.COUNT_WORDS[S.COUNT_WORDS.length - 1]; return w[2]; };
  S.countRange = function (n) { const w = S.COUNT_WORDS.find(c => n <= (c[1] == null ? Infinity : c[1])) || S.COUNT_WORDS[S.COUNT_WORDS.length - 1]; return w[1] == null ? w[0] + '+' : w[0] + '–' + w[1]; };

  /* ---------- heroes ---------- */
  S.heroStat = function (st, h, stat) {
    let v = h.stats[stat] || 0;
    Object.values(h.relics || {}).forEach(rid => { const r = rid && D.RELICS[rid]; if (r && r.mods[stat]) v += r.mods[stat]; });
    (h.linked || []).forEach(rid => { const r = D.RELICS[rid]; if (r && r.mods[stat]) v += r.mods[stat]; });
    return Math.max(0, v);
  };
  S.relicMod = function (st, h, key) {
    let v = 0; if (!h) return 0;
    Object.values(h.relics || {}).forEach(rid => { const r = rid && D.RELICS[rid]; if (r && r.mods[key]) v += r.mods[key]; });
    (h.linked || []).forEach(rid => { const r = D.RELICS[rid]; if (r && r.mods[key]) v += r.mods[key]; });
    return v;
  };
  /* a hero's level in a skill, counting their active memory-core skills */
  S.skill = function (st, h, id) {
    if (!h) return 0;
    let lv = (h.skills && h.skills[id]) || 0;
    (h.pouch || []).forEach(cid => {
      const c = st.cores[cid]; if (!c) return;
      (c.active || []).forEach(ai => { const s = c.offer[ai]; if (s && s.id === id && s.lv > lv) lv = s.lv; });
    });
    return Math.min(5, lv);
  };
  S.skillVal = function (st, h, id) { const lv = S.skill(st, h, id); return lv ? D.SKILLS[id].per[lv - 1] : 0; };
  S.activeSkillList = function (st, h) {
    const ids = new Set(Object.keys(h.skills || {}));
    (h.pouch || []).forEach(cid => { const c = st.cores[cid]; if (c) (c.active || []).forEach(ai => c.offer[ai] && ids.add(c.offer[ai].id)); });
    return [...ids].map(id => ({ id, lv: S.skill(st, h, id) })).filter(s => s.lv > 0);
  };
  S.xpFor = lv => Math.round(1000 * (Math.pow(1.38, lv - 1) - 1) / 0.38);   // xp needed to reach level lv
  S.fieldHeroes = (st, owner) => Object.values(st.armies).filter(a => !a.dead && a.owner === owner && a.heroId);
  S.townsOf = (st, owner) => Object.values(st.objects).filter(o => o.type === 'town' && o.owner === owner && !o.gone);
  S.heroLocation = function (st, h) {
    const a = Object.values(st.armies).find(a => !a.dead && a.heroId === h.id);
    if (a) return { army: a };
    const t = Object.values(st.objects).find(o => o.type === 'town' && (o.heroes || []).includes(h.id));
    return t ? { town: t } : {};
  };
  S.townAtArmy = function (st, a) { const o = S.objAt(st, a.layer, a.x, a.y); return o && o.type === 'town' ? o : null; };

  /* ---------- fog of war (per player, per layer: 0 unseen, 1 seen) ---------- */
  S.reveal = function (st, pi, layer, cx, cy, r) {
    const P = st.players[pi]; if (!P) return;
    const L = st.layers[layer]; const E = P.explored[layer]; const r2 = r * r + r;
    for (let y = Math.max(0, cy - r); y <= Math.min(L.h - 1, cy + r); y++)
      for (let x = Math.max(0, cx - r); x <= Math.min(L.w - 1, cx + r); x++)
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) E[y * L.w + x] = 1;
    /* allies share what they see */
    st.players.forEach((Q, qi) => { if (qi !== pi && S.allies(st, pi, qi) && Q.alive) {
      const E2 = Q.explored[layer]; for (let y = Math.max(0, cy - r); y <= Math.min(L.h - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(L.w - 1, cx + r); x++) if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) E2[y * L.w + x] = 1; } });
  };
  S.seen = (st, pi, layer, x, y) => { const L = st.layers[layer]; return !!st.players[pi].explored[layer][y * L.w + x]; };

  /* ---------- log ---------- */
  S.log = function (st, text, owner) { st.log.push({ day: st.day, text, owner: owner == null ? -1 : owner }); if (st.log.length > 300) st.log.shift(); SU.emit('log', text); };

  /* ---------- saving: typed arrays ↔ compact strings ---------- */
  function packBytes(a) { let s = ''; let i = 0; while (i < a.length) { const v = a[i]; let n = 1; while (i + n < a.length && a[i + n] === v && n < 4095) n++; s += (v < 36 ? v.toString(36) : '~' + String.fromCharCode(48 + v)) + (n > 1 ? '*' + n.toString(36) + '.' : ''); i += n; } return s; }
  function unpackBytes(s, len) {
    const a = new Uint8Array(len); let i = 0, p = 0;
    while (p < s.length) { let v; if (s[p] === '~') { v = s.charCodeAt(p + 1) - 48; p += 2; } else { v = parseInt(s[p], 36); p++; }
      let n = 1; if (s[p] === '*') { const e = s.indexOf('.', p); n = parseInt(s.slice(p + 1, e), 36); p = e + 1; }
      a.fill(v, i, i + n); i += n; }
    return a;
  }
  /* saves from before the land was shared out into territories cannot be played on */
  S.VERSION = 2;
  S.current = st => !!st && (st.version || 1) >= S.VERSION && !!st.regions;
  S.serialize = function (st) {
    SU.syncRng(st);
    const out = {};
    Object.keys(st).forEach(k => { if (k[0] !== '_') out[k] = st[k]; });
    out.layers = st.layers.map(L => ({ id: L.id, w: L.w, h: L.h, t: packBytes(L.t), ob: packBytes(L.ob), road: packBytes(L.road), v: packBytes(L.v), reg: L.reg ? packBytes(L.reg) : '' }));
    out.players = st.players.map(P => Object.assign({}, P, { explored: P.explored.map(e => packBytes(e)) }));
    return JSON.stringify(out, (k, v) => (k && k[0] === '_') ? undefined : v);
  };
  S.deserialize = function (json) {
    const st = typeof json === 'string' ? JSON.parse(json) : json;
    st.layers = st.layers.map(L => { const o = { id: L.id, w: L.w, h: L.h, t: unpackBytes(L.t, L.w * L.h), ob: unpackBytes(L.ob, L.w * L.h), road: unpackBytes(L.road, L.w * L.h), v: unpackBytes(L.v || '', L.w * L.h) }; if (L.reg) o.reg = unpackBytes(L.reg, L.w * L.h); return o; });
    st.players.forEach(P => { P.explored = P.explored.map((e, li) => unpackBytes(e, st.layers[li].w * st.layers[li].h)); });
    S.rebuild(st);
    return st;
  };
})(typeof window !== 'undefined' ? window : globalThis);
