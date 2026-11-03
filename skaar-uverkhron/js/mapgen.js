/* ============================================================
   SKAAR UVERKHRON — js/mapgen.js
   The random map generator: three Tatu and the Kalo.

   On every Tatu the land follows the directions, as Dearcineon
   does: the north is Fti (snow and highland), the south Su
   (marsh), the west Eldi (sand and ash), the east Ular (grass).
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, M = SU.make;
  const G = SU.mapgen = {};
  const T = S.TC, OB = S.OB;

  G.SIZES = { S: 40, M: 54, L: 70, XL: 90, G: 120 };
  G.SIZE_NAMES = { S: 'Small', M: 'Medium', L: 'Large', XL: 'Extra large', G: 'Gigantic' };

  G.newGame = function (setup) {
    const seed = setup.seed || (Math.random() * 1e9) | 0;
    const st = {
      version: 1, seed, rngState: seed ^ 0x5bd1e995, nextId: 1, day: 1, current: 0,
      setup: SU.deep(setup), layers: [], objects: {}, armies: {}, heroes: {}, cores: {},
      players: [], storm: null, weekEvent: 'none', monthEvent: 'none', log: [], over: null, turnSeq: 0,
    };
    const R = SU.rng(st);
    const base = G.SIZES[setup.size] || G.SIZES.M;
    D.LAYERS.forEach((ld, li) => {
      const w = Math.round(base * ld.scale), h = Math.round(base * ld.scale * (li === 3 ? 0.8 : 1));
      st.layers.push({ id: ld.id, w, h, t: new Uint8Array(w * h), ob: new Uint8Array(w * h), road: new Uint8Array(w * h), v: new Uint8Array(w * h) });
    });
    st.layers.forEach(L => { for (let i = 0; i < L.v.length; i++) L.v[i] = R.int(0, 255); });
    for (let li = 0; li < 3; li++) genTatu(st, li, seed + li * 7919);
    const moons = genKalo(st, seed + 31337);
    S.rebuild(st);

    setup.players.forEach((pc, i) => st.players.push(M.player(st, i, pc)));
    const regions = st.layers.map((L, li) => mainRegion(st, li));
    placeTowns(st, regions);
    S.rebuild(st);
    placeRoads(st);
    placeMines(st, regions);
    placeUrverk(st, regions, moons);
    placeTreasure(st, regions, moons);
    for (let li = 0; li < 4; li++) connectLayer(st, li);
    placeWild(st, regions);
    S.rebuild(st);
    startArmies(st);
    delete st._reserve;
    st.storm = SU.rules && st.setup.storm !== false ? SU.rules.newStorm(st) : null;
    SU.syncRng(st);
    return st;
  };

  /* ---------- one Tatu ---------- */
  function genTatu(st, li, seed) {
    const L = st.layers[li], w = L.w, h = L.h;
    const ne = SU.noise2(seed), nm = SU.noise2(seed + 1), nb = SU.noise2(seed + 2), nf = SU.noise2(seed + 3);
    const elev = new Float32Array(w * h);
    const lobes = li === 0 ? 3 : li === 1 ? 2 : 4;   // Velki: big continents; Leotik: broken land
    const R = SU.makeRng(seed);
    const cs = []; for (let i = 0; i < lobes; i++) cs.push([R.range(0.3, 0.7), R.range(0.3, 0.7), R.range(0.22, 0.34)]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = x / w, ny = y / h;
      let lobe = 0; cs.forEach(c => { const d = Math.hypot(nx - c[0], ny - c[1]) / c[2]; lobe = Math.max(lobe, 1 - d * d); });
      const edge = Math.min(nx, ny, 1 - nx, 1 - ny);
      let e = ne.fbm(nx * 4, ny * 4, 5) * 0.9 + lobe * 0.95 - 0.08 + ({ little: 0.14, normal: 0, lots: -0.12 }[st.setup.water] || 0);
      if (edge < 0.06) e -= (0.06 - edge) * 14;
      elev[y * w + x] = e;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, e = elev[i];
      if (e < 0.02) { L.t[i] = T.water; continue; }
      const nx = x / w, ny = y / h;
      const j = (k) => nb.fbm(nx * 3 + k * 17, ny * 3, 3) * 0.9;
      const sN = (0.5 - ny) * 2.2 + j(1), sS = (ny - 0.5) * 2.2 + j(2), sW = (0.5 - nx) * 2.2 + j(3), sE = (nx - 0.5) * 2.2 + j(4);
      const best = Math.max(sN, sS, sW, sE);
      let t;
      if (best < 0.45) t = nm.fbm(nx * 6, ny * 6, 3) > 0.12 ? T.dirt : T.grass;
      else if (best === sN) t = sN > 0.95 ? T.snow : T.rough;
      else if (best === sS) t = sS > 0.75 ? T.swamp : T.grass;
      else if (best === sW) t = sW > 0.85 ? T.ash : T.sand;
      else t = nm.fbm(nx * 7, ny * 7, 2) > 0.2 ? T.dirt : T.grass;
      if (li === 2 && nm(nx * 9, ny * 9) > 0.35) t = T.swamp;          // Leotik: wild, wet, poisonous
      if (e < 0.08 && t !== T.swamp && t !== T.snow) t = T.sand;        // beaches
      L.t[i] = t;
    }
    /* drop tiny islands */
    const comp = components(L, i => L.t[i] !== T.water);
    comp.forEach(c => { if (c.length < 14) c.forEach(i => L.t[i] = T.water); });
    /* obstacles */
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x; if (L.t[i] === T.water) continue;
      const e = elev[i], f = nf.fbm(x / w * 7, y / h * 7, 3), tt = S.TCODES[L.t[i]];
      const coast = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => L.t[i + dx + dy * w] === T.water);
      if (e > 0.74 && !coast && R.chance(0.7)) { L.ob[i] = OB.mountain; continue; }
      if (f > (li === 1 ? 0.12 : 0.2) && !coast) {
        L.ob[i] = tt === 'snow' || tt === 'rough' ? OB.pine : tt === 'ash' ? OB.deadtree : tt === 'sand' ? OB.palm : tt === 'swamp' ? (R.chance(0.5) ? OB.reeds : OB.tree) : (R.chance(0.06) ? OB.glowtree : OB.tree);
        if (R.chance(0.2)) L.ob[i] = 0;   // clearings
        continue;
      }
      if (R.chance(0.025)) L.ob[i] = tt === 'rough' || tt === 'snow' ? OB.ridge : OB.rock;
    }
  }

  /* ---------- the Kalo: moons in the void ---------- */
  function genKalo(st, seed) {
    const L = st.layers[3], R = SU.makeRng(seed), w = L.w, h = L.h;
    L.t.fill(T.void);
    const moons = []; const want = 4 + Math.floor(st.setup.players.length / 2);
    let tries = 0;
    while (moons.length < want && tries++ < 400) {
      const r = R.int(4, 6), cx = R.int(r + 2, w - r - 3), cy = R.int(r + 2, h - r - 3);
      if (moons.some(m => Math.hypot(m.x - cx, m.y - cy) < m.r + r + 4)) continue;
      moons.push({ x: cx, y: cy, r, tatu: moons.length % 3, name: MOON_NAMES[moons.length % MOON_NAMES.length] });
    }
    const n = SU.noise2(seed + 5);
    moons.forEach(m => {
      for (let y = m.y - m.r - 1; y <= m.y + m.r + 1; y++) for (let x = m.x - m.r - 1; x <= m.x + m.r + 1; x++) {
        if (!S.inside(L, x, y)) continue;
        const d = Math.hypot(x - m.x, y - m.y) + n(x * 0.4, y * 0.4) * 1.4;
        if (d <= m.r) { const i = y * w + x; L.t[i] = T.moon; if (d > 2 && R.chance(0.07)) L.ob[i] = OB.crystal; }
      }
    });
    return moons;
  }
  const MOON_NAMES = ['Bolo Kalo', 'Kalo Vessa', 'The Dancing Kalo', 'Kalo Thren', 'Lun Ardeth', 'Kalo Miri', 'Pale Usk', 'Kalo Nor'];

  /* ---------- connected regions ---------- */
  function components(L, ok) {
    const seen = new Uint8Array(L.w * L.h), out = [];
    for (let i = 0; i < L.w * L.h; i++) {
      if (seen[i] || !ok(i)) continue;
      const comp = [], q = [i]; seen[i] = 1;
      while (q.length) { const j = q.pop(); comp.push(j); const x = j % L.w, y = (j / L.w) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (!S.inside(L, xx, yy)) continue; const k = yy * L.w + xx; if (!seen[k] && ok(k)) { seen[k] = 1; q.push(k); } } }
      out.push(comp);
    }
    return out.sort((a, b) => b.length - a.length);
  }
  function mainRegion(st, li) {
    const L = st.layers[li];
    const ok = i => { const td = D.TERRAIN[S.TCODES[L.t[i]]]; return td.pass !== false && !L.ob[i]; };
    const comps = components(L, ok);
    const set = new Uint8Array(L.w * L.h);
    /* the Kalo: every moon counts */
    /* towns, mines and Urverk go on each world's main land, so they can be walked to;
       the Kalo: every moon counts */
    (li === 3 ? comps : comps.slice(0, 1)).forEach(c => c.forEach(i => set[i] = 1));
    return set;
  }

  /* ---------- free tiles ---------- */
  function freeAt(st, li, x, y, reg, foot) {
    const L = st.layers[li]; if (!S.inside(L, x, y) || x < 2 || y < 3 || x > L.w - 3 || y > L.h - 2) return false;
    const i = y * L.w + x; if (!reg[i] || L.ob[i] || st._block[li][i] || st._occ[li][i]) return false;
    const R = st._reserve && st._reserve[li];
    if (R && R[i]) return false;
    if (S.armyAt(st, li, x, y)) return false;
    if (L.road[i] && !foot) return false;
    for (const [dx, dy] of (foot || [])) { const xx = x + dx, yy = y + dy; if (!S.inside(L, xx, yy)) return false; const j = yy * L.w + xx;
      if (st._block[li][j] || st._occ[li][j] || L.road[j] || D.TERRAIN[S.TCODES[L.t[j]]].pass === false || (R && R[j])) return false; }
    /* the tile in front must be open, so it can be reached */
    if (!reg[(y + 1) * L.w + x] && !reg[y * L.w + x + 1] && !reg[y * L.w + x - 1]) return false;
    return true;
  }
  function addObj(st, o) { o.id = o.id || SU.uid(st, 'o'); st.objects[o.id] = o; S.place(st, o); /* clear the body tiles of trees */
    const L = st.layers[o.layer]; S.footprint(o).forEach(([dx, dy]) => { const xx = o.x + dx, yy = o.y + dy; if (S.inside(L, xx, yy)) L.ob[yy * L.w + xx] = 0; });
    /* keep the way in clear: nothing else may be built in front of an entrance */
    if (!st._reserve) st._reserve = st.layers.map(L2 => new Uint8Array(L2.w * L2.h));
    const front = o.type === 'town' ? [[0, 1], [-1, 1], [1, 1], [0, 2]] : (o.type === 'pile' || o.type === 'chest' || o.type === 'scroll' || o.type === 'relic') ? [] : [[0, 1], [-1, 1], [1, 1]];
    front.forEach(([dx, dy]) => { const xx = o.x + dx, yy = o.y + dy; if (S.inside(L, xx, yy)) { st._reserve[o.layer][yy * L.w + xx] = 1; L.ob[yy * L.w + xx] = 0; } });
    return o; }
  function randomFree(st, li, reg, R, test, foot, tries) {
    const L = st.layers[li];
    for (let k = 0; k < (tries || 300); k++) { const x = R.int(2, L.w - 3), y = R.int(3, L.h - 2); if (freeAt(st, li, x, y, reg, foot) && (!test || test(x, y))) return [x, y]; }
    return null;
  }
  function nearFree(st, li, reg, R, cx, cy, dmin, dmax, foot, test) {
    for (let k = 0; k < 200; k++) { const a = R.range(0, Math.PI * 2), d = R.range(dmin, dmax); const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      if (freeAt(st, li, x, y, reg, foot) && (!test || test(x, y))) return [x, y]; }
    return null;
  }

  /* ---------- towns ---------- */
  function placeTowns(st, regions) {
    const R = SU.rng(st), np = st.players.length;
    /* where everyone starts: three players get a Tatu each; otherwise it's random
       (or all on Velki, or spread, if the setup says so) */
    const mode = st.setup.starts || (st.setup.spread === false ? 'velki' : 'random');
    const layerFor = (() => { if (mode === 'velki') return () => 0; if (mode === 'spread' || np === 3) { const order = R.shuffle([0, 1, 2]); return pi => order[pi % 3]; } return () => R.int(0, 2); })();
    const foot = [[-1, 0], [1, 0], [-1, -1], [0, -1], [1, -1], [-1, -2], [0, -2], [1, -2], [0, 1], [-1, 1], [1, 1]];
    st._starts = [];
    const placed = [[], [], []];
    const minGap = Math.round((G.SIZES[st.setup.size] || 54) * 0.42);
    const findSpot = li => { const L = st.layers[li]; let best = null, bestD = -1;
      for (let k = 0; k < 500; k++) {
        const x = R.int(4, L.w - 5), y = R.int(5, L.h - 4);
        if (!townSpot(st, li, x, y, regions[li], foot)) continue;
        const d = placed[li].length ? Math.min(...placed[li].map(p => Math.hypot(p[0] - x, p[1] - y))) : Math.min(x, y, L.w - x, L.h - y) + R.range(0, 10);
        if (d > bestD) { bestD = d; best = [x, y]; }
      }
      return { best, d: placed[li].length ? bestD : 99 }; };
    st.players.forEach((P, pi) => {
      let li = layerFor(pi), f = findSpot(li);
      /* too close to a rival on that world: try the others */
      if (mode !== 'velki' && (!f.best || f.d < minGap)) [0, 1, 2].filter(l => l !== li).some(l => { const g = findSpot(l); if (g.best && g.d >= minGap) { li = l; f = g; return true; } return false; });
      P.startLayer = li;
      const L = st.layers[li];
      let best = f.best;
      if (!best) best = forceSpot(st, li, regions[li]);
      placed[li].push(best);
      const t = M.town(st, li, best[0], best[1], pi);
      t.coast = nearWater(L, best[0], best[1] + 1) || nearWater(L, best[0] - 1, best[1]) || nearWater(L, best[0] + 1, best[1]);
      clearAround(st, li, best[0], best[1], 3, true);
      /* a few defenders at home, so nobody's town falls on day two */
      t.garrison[0] = { kind: 'stack', cr: 'malsti', n: 14 + R.int(0, 6) }; t.garrison[1] = { kind: 'stack', cr: 'velnur', n: 6 + R.int(0, 3) };
      addObj(st, t);
      st._starts.push({ pi, li, x: best[0], y: best[1], town: t.id });
    });
    /* neutral towns */
    const extra = { S: 1, M: 1, L: 2, XL: 3, G: 4 }[st.setup.size] || 1;
    for (let li = 0; li < 3; li++) for (let k = 0; k < extra; k++) {
      let best = null, bestD = -1; const L = st.layers[li];
      for (let j = 0; j < 400; j++) { const x = R.int(4, L.w - 5), y = R.int(5, L.h - 4); if (!townSpot(st, li, x, y, regions[li], foot)) continue;
        const ps = placed[li]; const d = ps.length ? Math.min(...ps.map(p => Math.hypot(p[0] - x, p[1] - y))) : 99; if (d > bestD) { bestD = d; best = [x, y]; } }
      if (!best || bestD < 10) continue;
      placed[li].push(best);
      const t = M.town(st, li, best[0], best[1], -1);
      t.built = ['hall1', 'fort1', 'd1', 'd2', 'tavern'];
      t.coast = nearWater(L, best[0], best[1] + 1);
      clearAround(st, li, best[0], best[1], 2, false);
      addObj(st, t);
      const g = SU.make.wild(st, li, 0, 0, 2500 + R.int(0, 2500), { only: ['malsti', 'velnur', 'ver'] });
      t.garrison = g.slots; delete st.armies[g.id];
    }
  }
  function townSpot(st, li, x, y, reg, foot) {
    if (!freeAt(st, li, x, y, reg, foot)) return false;
    const L = st.layers[li]; let land = 0;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const xx = x + dx, yy = y + dy; if (S.inside(L, xx, yy) && reg[yy * L.w + xx]) land++; }
    return land > 45;
  }
  function forceSpot(st, li, reg) { const L = st.layers[li]; for (let i = 0; i < L.w * L.h; i++) if (reg[i]) { const x = i % L.w, y = (i / L.w) | 0; if (x > 3 && y > 4 && x < L.w - 4 && y < L.h - 3) return [x, y]; } return [8, 8]; }
  function clearAround(st, li, cx, cy, r, dusk) {
    const L = st.layers[li];
    for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      if (!S.inside(L, x, y)) continue; const i = y * L.w + x; const d = Math.hypot(x - cx, y - cy + 0.5);
      if (L.t[i] === T.water) continue;
      if (d <= r) L.ob[i] = 0;
      if (dusk && d <= r + 1.5) L.t[i] = T.dusk;
    }
  }

  /* ---------- roads between the towns of each Tatu ---------- */
  function placeRoads(st) {
    for (let li = 0; li < 3; li++) {
      const towns = Object.values(st.objects).filter(o => o.type === 'town' && o.layer === li);
      for (let i = 0; i < towns.length; i++) {
        const others = towns.filter(t => t !== towns[i]).sort((a, b) => Math.hypot(a.x - towns[i].x, a.y - towns[i].y) - Math.hypot(b.x - towns[i].x, b.y - towns[i].y));
        others.slice(0, 2).forEach(o => road(st, li, towns[i].x, towns[i].y + 1, o.x, o.y + 1));
      }
    }
  }
  function road(st, li, x0, y0, x1, y1) {
    const L = st.layers[li], w = L.w;
    const cost = i => { const td = D.TERRAIN[S.TCODES[L.t[i]]]; if (td.pass === false || st._block[li][i]) return Infinity; return (L.road[i] ? 0.4 : 1) + (L.ob[i] === OB.mountain ? 30 : L.ob[i] ? 4 : 0) + (td.cost - 100) / 60; };
    const dist = new Float32Array(w * L.h).fill(Infinity), prev = new Int32Array(w * L.h).fill(-1);
    const start = y0 * w + x0, goal = y1 * w + x1; dist[start] = 0;
    const open = [[0, start]];
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
      const [d, i] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (i === goal) break; if (d > dist[i]) continue;
      const x = i % w, y = (i / w) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const xx = x + dx, yy = y + dy; if (!S.inside(L, xx, yy)) return; const j = yy * w + xx; const c = cost(j); if (c === Infinity) return; const nd = d + c; if (nd < dist[j]) { dist[j] = nd; prev[j] = i; open.push([nd + Math.abs(xx - x1) + Math.abs(yy - y1), j]); } });
      if (open.length > 20000) break;
    }
    if (prev[goal] < 0) return;
    for (let i = goal; i >= 0 && i !== start; i = prev[i]) { L.road[i] = 1; L.ob[i] = 0; }
    L.road[start] = 1;
  }

  /* ---------- mines ---------- */
  const MINE_FOOT = [[-1, 0], [-1, -1], [0, -1]];
  function mine(st, li, x, y, kind, guardPow) {
    const o = addObj(st, { type: 'mine', kind, layer: li, x, y, owner: -1 });
    if (kind === 'ngakara') o.naga = { alive: true, calm: 0 };
    o._guard = guardPow || 0;
    return o;
  }
  function placeMines(st, regions) {
    const R = SU.rng(st);
    st._starts.forEach(s => {
      const reg = regions[s.li];
      [['wood', 4, 6, 0], ['stone', 4, 7, 0], ['food', 4, 7, 400], ['gold', 7, 11, 1800], [R.pick(['stygian', 'timber', 'glowmoss']), 8, 12, 3000]].forEach(([k, a, b, g]) => {
        const p = nearFree(st, s.li, reg, R, s.x, s.y, a, b, MINE_FOOT); if (p) mine(st, s.li, p[0], p[1], k, g);
      });
    });
    for (let li = 0; li < 3; li++) {
      const L = st.layers[li], reg = regions[li];
      const n = Math.round(L.w * L.h / 170);
      for (let k = 0; k < n; k++) {
        const kind = R.weighted(Object.keys(D.MINES), m => ({ gold: 2, wood: 3, stone: 3, food: 3, stygian: 1.2, ngakara: 1, timber: 1, glowmoss: 1 })[m]);
        const test = kind === 'ngakara' ? (x, y) => nearWater(L, x, y) : kind === 'timber' ? (x, y) => x < L.w * 0.55 : kind === 'glowmoss' ? (x, y) => y > L.h * 0.4 : null;
        const p = randomFree(st, li, reg, R, (x, y) => (!test || test(x, y)) && farFromStarts(st, li, x, y, 7), MINE_FOOT);
        if (p) mine(st, li, p[0], p[1], kind, 1);
      }
    }
  }
  function nearWater(L, x, y) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (S.inside(L, xx, yy) && L.t[yy * L.w + xx] === T.water) return true; } return false; }
  function farFromStarts(st, li, x, y, d) { return st._starts.every(s => s.li !== li || Math.hypot(s.x - x, s.y - y) >= d); }
  /* how far from the nearest start, for sizing guards: on a world nobody starts on,
     treat everything as middling-far rather than impossibly far */
  function distToStart(st, li, x, y) { let d = 60; st._starts.forEach(s => { if (s.li === li) d = Math.min(d, Math.hypot(s.x - x, s.y - y)); }); return Math.min(d, st._starts.some(s => s.li === li) ? 30 : 18); }

  /* ---------- Urverk ---------- */
  const FAMILIES = ['the House of Orrin', 'the Vessil family', 'the Keepers of Thren', 'the Lantern-Wardens', 'the Duskmoor clan', 'the Ashfeld family', 'the Sons of Quora'];
  function placeUrverk(st, regions, moons) {
    const R = SU.rng(st), size = st.setup.size;
    const perPair = size === 'S' ? 2 : size === 'XL' ? 4 : size === 'G' ? 5 : 3;
    const foot = [[-1, -1], [0, -1], [1, -1]];
    const make = (li, kind, extra) => {
      const p = randomFree(st, li, regions[li], R, (x, y) => farFromStarts(st, li, x, y, 7), foot, 600);
      if (!p) return null;
      return addObj(st, Object.assign({ type: 'urverk', layer: li, x: p[0], y: p[1], kind, triggerKnown: true }, extra || {}));
    };
    const link = (a, b) => { if (a && b) { a.link = b.id; b.link = a.id; } };
    const kindExtra = (kind, mover) => {
      if (kind === 'aligned') { const per = D.ORBITS[mover] || 24; const len = Math.max(3, Math.round(per * R.range(0.2, 0.35))); return { window: { period: per, from: R.int(0, per - 1), len } }; }
      if (kind === 'toll') return { toll: { gold: R.pick([500, 750, 1000, 1500]), family: R.pick(FAMILIES), respect: {}, alive: true } };
      if (kind === 'danger') return { danger: R.pick([0.15, 0.25, 0.35]) };
      return {};
    };
    [[0, 1], [0, 2], [1, 2]].forEach(([a, b]) => {
      const kinds = R.shuffle(['aligned', 'toll', 'danger', 'always', 'aligned']).slice(0, perPair);
      if (!kinds.includes('always') && !kinds.includes('toll')) kinds[0] = 'toll';
      kinds.forEach(kind => { const ex = kindExtra(kind, b === 2 ? 'leotik' : 'xikia'); link(make(a, kind, ex), make(b, kind, SU.deep(ex))); });
    });
    for (let li = 0; li < 3; li++) { const kind = R.pick(['always', 'danger']); const ex = kindExtra(kind); link(make(li, kind, ex), make(li, kind, SU.deep(ex))); }
    /* Kalo Urverk: one from each moon to its own Tatu, open only on the moon's near pass */
    moons.forEach((m, mi) => {
      const L = st.layers[3]; let p = null;
      for (let k = 0; k < 100 && !p; k++) { const x = m.x + R.int(-m.r + 2, m.r - 2), y = m.y + R.int(-m.r + 2, m.r - 2); if (freeAt(st, 3, x, y, regions[3], foot)) p = [x, y]; }
      if (!p) return;
      const per = R.pick([8, 10, 12]); const win = { period: per, from: R.int(0, per - 1), len: R.int(2, 3) };
      const mo = addObj(st, { type: 'urverk', layer: 3, x: p[0], y: p[1], kind: 'kalo', moon: m.name, window: win, triggerKnown: true });
      const to = make(m.tatu, 'kalo', { moon: m.name, window: SU.deep(win) });
      link(mo, to);
      m.urverk = mo.id;
    });
  }

  /* ---------- treasure, places to visit, shrines ---------- */
  function placeTreasure(st, regions, moons) {
    const R = SU.rng(st);
    for (let li = 0; li < 3; li++) {
      const L = st.layers[li], reg = regions[li], area = L.w * L.h;
      const put = (o, foot, test) => { const p = randomFree(st, li, reg, R, test || ((x, y) => farFromStarts(st, li, x, y, 3)), foot); if (p) { o.layer = li; o.x = p[0]; o.y = p[1]; addObj(st, o); return o; } return null; };
      for (let k = 0; k < area / 55; k++) { const res = R.weighted(D.RES, r => ({ gold: 4, wood: 3, stone: 3, food: 2, stygian: 1, ngakara: 0.6, timber: 0.8, glowmoss: 0.8 })[r]);
        const amt = res === 'gold' ? R.pick([500, 750, 1000]) : res === 'food' ? R.int(8, 16) : D.RES_INFO[res].common ? R.int(4, 8) : R.int(2, 4);
        put({ type: 'pile', res, amt }); }
      for (let k = 0; k < area / 150; k++) put({ type: 'chest', gold: R.pick([1000, 1500, 2000]), xp: R.pick([500, 1000, 1500]) });
      for (let k = 0; k < area / 380; k++) put({ type: 'relic', relic: R.weighted(D.RELIC_IDS.filter(r => D.RELICS[r].rare !== 'skaar'), r => ({ common: 6, rare: 3, great: 1 })[D.RELICS[r].rare]) }, null, (x, y) => farFromStarts(st, li, x, y, 6));
      for (let k = 0; k < area / 500; k++) put({ type: 'scroll', song: R.pick(D.SONG_IDS.filter(s => D.SONGS[s].tier <= 3)) });
      const visits = ['ring', 'bulwark', 'banner', 'library', 'milestone', 'maze', 'tower', 'spring', 'camp', 'songstone', 'seer', 'trainer', 'seer'];
      const big = ['tower', 'library', 'fair'];
      const nv = Math.round(area / 150);
      for (let k = 0; k < nv; k++) { const kind = visits[k % visits.length]; const o = { type: 'visit', kind, visited: {} };
        if (kind === 'songstone') o.song = R.pick(D.SONG_IDS.filter(s => D.SONGS[s].tier <= 3));
        put(o, big.includes(kind) ? [[-1, 0], [0, -1], [-1, -1]] : null); }
      put({ type: 'visit', kind: 'tavern', visited: {} });
      for (let k = 0; k < Math.max(1, Math.round(area / 900)); k++) { const p = randomFree(st, li, reg, R, (x, y) => farFromStarts(st, li, x, y, 6)); if (p) { const c = M.wildCore(st, 20000 + R.int(0, 40000)); addObj(st, { type: 'core', layer: li, x: p[0], y: p[1], core: c.id, hidden: true }); } }
      if (li === 2 || area > 3000) put({ type: 'visit', kind: 'aerie', visited: {} }, null, (x, y) => farFromStarts(st, li, x, y, 10));
      put({ type: 'visit', kind: 'fair', visited: {} }, [[-1, 0], [0, -1], [-1, -1]]);
      for (let k = 0; k < (area > 3000 ? 2 : 1); k++) { const p = randomFree(st, li, reg, R, (x, y) => nearWater(L, x, y) && farFromStarts(st, li, x, y, 4)); if (p) addObj(st, { type: 'visit', kind: 'shipyard', layer: li, x: p[0], y: p[1], visited: {} }); }
      /* herds to tame */
      for (let k = 0; k < area / 600; k++) { const p = randomFree(st, li, reg, R, (x, y) => farFromStarts(st, li, x, y, 5)); if (p) { const a = M.wild(st, li, p[0], p[1], 600 + R.int(0, 1200), { cr: R.pick(['wildpunk', 'dompunk']), stacks: 1, herd: true }); a.herd = true; } }
    }
    /* the Kalo: a shrine on every moon, and moon treasure */
    const L3 = st.layers[3], reg3 = regions[3];
    moons.forEach(m => {
      const shrineFoot = [[-1, 0], [0, -1], [-1, -1]];
      for (let k = 0; k < 120; k++) { const x = m.x + R.int(-m.r + 2, m.r - 1), y = m.y + R.int(-m.r + 2, m.r - 1);
        if (freeAt(st, 3, x, y, reg3, shrineFoot)) { addObj(st, { type: 'visit', kind: 'shrine', layer: 3, x, y, moon: m.name, visited: {}, quest: null, keeper: R.pick(D.NAMES.kaloeik) }); m.shrine = [x, y]; break; } }
      for (let k = 0; k < 3; k++) { const x = m.x + R.int(-m.r + 1, m.r - 1), y = m.y + R.int(-m.r + 1, m.r - 1); if (freeAt(st, 3, x, y, reg3)) addObj(st, { type: k === 0 ? 'relic' : 'pile', layer: 3, x, y, relic: R.pick(D.RELIC_IDS.filter(r => D.RELICS[r].rare === 'great' || D.RELICS[r].rare === 'rare')), res: R.pick(['stygian', 'ngakara', 'glowmoss']), amt: R.int(3, 6) }); }
    });
    st._moons = moons;
    st.moons = moons.map(m => ({ name: m.name, x: m.x, y: m.y, r: m.r, tatu: m.tatu }));
  }

  /* ---------- make sure every open place can be reached ----------
     Object bodies and trees can wall off pockets of land. Starting from
     each town (or each moon's Urverk), flood the open land; then carve a
     way through trees, rocks and mountains to anything left behind. */
  function connectLayer(st, li) {
    const L = st.layers[li], w = L.w, N = w * L.h;
    const vanish = o => o && (o.type === 'pile' || o.type === 'chest' || o.type === 'relic' || o.type === 'scroll');
    const land = i => D.TERRAIN[S.TCODES[L.t[i]]].pass !== false;
    const open = i => { if (!land(i) || L.ob[i] || st._block[li][i]) return false; const o = S.objAt(st, li, i % w, (i / w) | 0); return !o || vanish(o); };
    const want = i => open(i) || (!!S.objAt(st, li, i % w, (i / w) | 0));   /* every object's visit tile must be reachable */
    let seeds = Object.values(st.objects).filter(o => o.layer === li && (o.type === 'town' || (li === 3 && o.type === 'urverk')));
    if (!seeds.length) seeds = Object.values(st.objects).filter(o => o.layer === li && o.type === 'urverk');
    if (!seeds.length) return;
    /* on a Tatu, flood from ONE town (a player's if there is one) and carve toward every other */
    if (li !== 3) seeds = [seeds.find(o => o.type === 'town' && o.owner >= 0) || seeds[0]];
    const reach = new Uint8Array(N);
    const flood = from => { const q = from.slice(); from.forEach(i => reach[i] = 1); while (q.length) { const i = q.pop(), x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (!S.inside(L, xx, yy)) continue; const j = yy * w + xx; if (reach[j]) continue; if (open(j)) { reach[j] = 1; q.push(j); } else if (want(j)) reach[j] = 2; } } };
    /* on the Kalo, each moon is its own world */
    if (li === 3) { seeds.forEach(o => { const i = (o.y + 1) * w + o.x; if (S.inside(L, o.x, o.y + 1)) flood([i]); }); return; }
    flood(seeds.map(o => (o.y + 1) * w + o.x).filter(i => i < N));
    for (let pass = 0; pass < 40; pass++) {
      let lost = -1; for (let i = 0; i < N; i++) if (!reach[i] && want(i) && regionLike(i)) { lost = i; break; }
      if (lost < 0) break;
      /* carve the cheapest way from the lost tile to the reached land */
      const dist = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1); dist[lost] = 0;
      const q = [[0, lost]]; let hit = -1;
      while (q.length) { let bi = 0; for (let k = 1; k < q.length; k++) if (q[k][0] < q[bi][0]) bi = k; const [d, i] = q[bi]; q[bi] = q[q.length - 1]; q.pop();
        if (reach[i] === 1) { hit = i; break; } if (d > dist[i]) continue; const x = i % w, y = (i / w) | 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const xx = x + dx, yy = y + dy; if (!S.inside(L, xx, yy)) return; const j = yy * w + xx; if (!land(j) || st._block[li][j]) return; const ob = S.objAt(st, li, xx, yy);
          if (ob && !vanish(ob) && reach[j] !== 1) return; const c = 1 + (L.ob[j] ? (L.ob[j] === OB.mountain ? 6 : 3) : 0); if (d + c < dist[j]) { dist[j] = d + c; prev[j] = i; q.push([d + c, j]); } });
        if (q.length > 30000) break; }
      if (hit < 0) { reach[lost] = 3; continue; }
      const path = []; for (let i = hit; i >= 0; i = prev[i]) { path.push(i); if (i === lost) break; }
      path.forEach(i => { L.ob[i] = 0; });
      flood(path.filter(i => open(i)));
      if (!reach[lost]) reach[lost] = 3;
    }
    function regionLike(i) { /* skip tiny unreachable specks between mountains */ return true; }
  }

  /* ---------- wild groups ---------- */
  const LAYER_MUL = [1, 1.25, 1.6, 2.4];
  function placeWild(st, regions) {
    const R = SU.rng(st);
    const strength = { weak: 0.6, normal: 1, strong: 1.5 }[st.setup.wild || 'normal'];
    const guard = (o, mul) => {
      if (o.type === 'town' || o._noguard) return;
      const L = st.layers[o.layer]; const d = o.layer === 3 ? 30 : distToStart(st, o.layer, o.x, o.y);
      if (o.layer < 3 && d < 5 && !(o._guard > 1)) return;
      let pow = (o._guard > 1 ? o._guard : 900 + d * d * 26 + d * 160) * LAYER_MUL[o.layer] * strength * (mul || 1) * R.range(0.8, 1.25);
      /* stand in front of the thing guarded */
      const spots = [[0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0]].map(([dx, dy]) => [o.x + dx, o.y + dy]).filter(([x, y]) => S.inside(L, x, y) && S.passable(st, o.layer, x, y) && !S.objAt(st, o.layer, x, y) && !S.armyAt(st, o.layer, x, y));
      if (!spots.length) return;
      const [x, y] = spots[0];
      M.wild(st, o.layer, x, y, pow, { guard: o.id, only: o.layer === 3 ? ['kaloeik', 'lutut', 'tyndael', 'kuni', 'xiweik'] : null });
    };
    Object.values(st.objects).forEach(o => {
      if (o.type === 'mine') guard(o, o.kind === 'gold' || !D.RES_INFO[D.MINES[o.kind].res].common ? 1.4 : 1);
      else if (o.type === 'relic') guard(o, D.RELICS[o.relic].rare === 'great' ? 3 : D.RELICS[o.relic].rare === 'rare' ? 2 : 1.3);
      else if (o.type === 'chest' && R.chance(0.6)) guard(o, 1);
      else if (o.type === 'scroll') guard(o, 1.5);
      else if (o.type === 'urverk' && R.chance(o.kind === 'kalo' ? 1 : 0.55)) guard(o, o.layer === 3 ? 2 : 1.3);
      else if (o.type === 'visit' && o.kind === 'shrine') guard(o, 3);
      else if (o.type === 'visit' && o.kind === 'aerie') guard(o, 2.5);
      else if (o.type === 'pile' && o.layer === 3) guard(o, 1);
    });
    /* roamers */
    for (let li = 0; li < 3; li++) {
      const L = st.layers[li]; const n = Math.round(L.w * L.h / 260);
      for (let k = 0; k < n; k++) { const p = randomFree(st, li, regions[li], R, (x, y) => farFromStarts(st, li, x, y, 8)); if (!p) continue;
        const d = distToStart(st, li, p[0], p[1]); M.wild(st, li, p[0], p[1], (1200 + d * d * 22) * LAYER_MUL[li] * strength * R.range(0.7, 1.3), { roam: R.chance(0.5) }); }
    }
  }

  /* ---------- each player's first hero ---------- */
  function startArmies(st) {
    const R = SU.rng(st);
    st._starts.forEach(s => {
      const P = st.players[s.pi], t = st.objects[s.town], pc = (st.setup.players || [])[s.pi] || {};
      /* the hero chosen before the game (or a random one) */
      const h = M.hero(st, Object.assign({ owner: s.pi }, pc.hero ? { people: pc.hero.people, base: pc.hero.base, name: pc.hero.name } : {}));
      while (Object.keys(h.skills).length < 5) { const id = R.pick(D.SKILL_IDS); if (!h.skills[id]) h.skills[id] = 1; }
      if (h.skills.songcraft && !h.songs.length) h.songs.push('mend');
      h.breath = M.breathMax(st, h);
      const cap = M.captain(st, { rank: 'stamijan', abil: R.pick(['drillmaster', 'shieldbearer', 'banner']) });
      h.slots[0] = M.capSlot(cap, [{ cr: 'malsti', n: R.int(16, 22) }, { cr: 'velnur', n: R.int(6, 9) }]);
      h.slots[1] = { kind: 'stack', cr: 'malsti', n: R.int(8, 12) };
      M.army(st, s.pi, s.li, t.x, t.y, h.id);
      P.startTown = t.id;
      /* difficulty: a person's starting stores */
      const diff = D.DIFFICULTY.find(d => d.id === st.setup.difficulty);
      if (diff && P.kind === 'human') D.RES.forEach(r => P.res[r] = Math.round(P.res[r] * diff.res));
      /* the starting bonus */
      const bonus = pc.bonus === 'random' || !pc.bonus ? R.pick(['gold', 'res', 'relic']) : pc.bonus;
      if (bonus === 'gold') P.res.gold += 3000;
      else if (bonus === 'res') { P.res.wood += 10; P.res.stone += 10; ['stygian', 'ngakara', 'timber', 'glowmoss'].forEach(r => P.res[r] += 3); }
      else if (bonus === 'relic' && SU.rules) SU.rules.giveRelic(st, h, R.pick(D.RELIC_IDS.filter(r => D.RELICS[r].rare === 'common' || D.RELICS[r].rare === 'rare')));
      P.bonus = bonus;
      S.reveal(st, s.pi, s.li, t.x, t.y, 8);
    });
    delete st._starts;
  }
  G.startArmies = startArmies;
  G._internals = { components, mainRegion, freeAt };
})(typeof window !== 'undefined' ? window : globalThis);
