// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 26: what fills the deep bands (new worlds only).
//  * Minerals: every band has two of its own, in clumps and streaks through its stone. They are no use for gear, but
//    they build (each is a block you can place), and the job-givers in the towns buy them.
//      Coral: Pearlstone, Sea Glass · Kelp: Jadeite, Moss Agate · Scald: Obsidian, Sulfur · Bone: Amber, Ivory Chalk
//      · Hollow Dark: Starglass, Onyx.
//  * Structures in every band, built from that band's own stone so no two bands look alike:
//      Sunken ruins   : a broken hall of carved brick, pillars and lintels, rubble, a ruin chest.
//      Mining camps   : rotted scaffolds, ladders, hanging lanterns, old carts, a dead miner's chest.
//      Creature nests : a woven den. Swim close and its brood comes out; kill them all and a nest chest is left behind.
//      Vaults         : a sealed room of rune-cut stone that only the rune made from this band's boss ore can break.
//                       The best chest in the band is inside.
//    Chest loot depends on the band it is in (RW.LOOT getters read the band under the hero).
(function (RW) {
  'use strict';
  const def = RW.WORLDS && RW.WORLDS.rock, WD = RW.world, P = RW.player, E = RW.ent, U = RW.ui, R = RW.register, A = RW.art, TS = RW.TILE;
  const L = RW.v3ringsLib;
  if (!def || !WD || !P || !L || !R) return;
  function addTile(d) { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; }
  const item = (o) => R.item(Object.assign({ stack: 99 }, o));
  // bands by index b: 0 coral, 1 kelp, 2 heat, 3 bone, 4 void (region j = 5 - b)
  const BAND = [
    { j: 5, name: 'Coral', hard: 9, rock: ['#3e4a52', '#56646a', '#2e3840'], ruin: ['#b8a090', '#d8c4b0', '#8a7464'], vault: ['#4a5a6a', '#6a7e90', '#2e3a46'], glyph: '#ffb0a0' },
    { j: 4, name: 'Kelp', hard: 11, rock: ['#2e3a30', '#3e4e40', '#222c24'], ruin: ['#4a5e44', '#627a58', '#344230'], vault: ['#2e4a3e', '#44685a', '#1c3028'], glyph: '#8affc0' },
    { j: 3, name: 'Scald', hard: 13, rock: ['#1e1a1c', '#2c2628', '#141012'], ruin: ['#3a2e2c', '#52423e', '#261e1c'], vault: ['#4a2a22', '#6a3c30', '#2e1812'], glyph: '#ffb060' },
    { j: 2, name: 'Bone', hard: 15, rock: ['#6a665a', '#8a8472', '#4e4a42'], ruin: ['#a8a088', '#c8c0a4', '#7a745e'], vault: ['#5a564a', '#7a7462', '#3a3830'], glyph: '#f0e8c0' },
    { j: 1, name: 'Void', hard: 17, rock: ['#0c0a12', '#16121e', '#06050a'], ruin: ['#2a2438', '#3a3250', '#1a1626'], vault: ['#1e1630', '#2e2248', '#100c1c'], glyph: '#b090ff' },
  ];
  const bandOfJ = (j) => BAND.findIndex((b) => b.j === j);

  // ---------------- minerals ----------------
  const MIN = [
    ['pearlstone', 'Pearlstone', 0, 'nodule', '#f4e8ec', 6, null], ['seaglass', 'Sea Glass', 0, 'facet', '#7ae0d8', 9, [0.03, 0.1, 0.1]],
    ['jadeite', 'Jadeite', 1, 'ore', '#4ab070', 7, null], ['mossagate', 'Moss Agate', 1, 'nodule', '#9ac87a', 8, null],
    ['obsidian', 'Obsidian', 2, 'facet', '#3a3048', 8, null], ['sulfur', 'Sulfur', 2, 'ore', '#e8d040', 7, [0.1, 0.09, 0.02]],
    ['amberstone', 'Amber', 3, 'ore', '#f0a030', 12, [0.14, 0.08, 0.02]], ['ivorychalk', 'Ivory Chalk', 3, 'nodule', '#f4f0e0', 7, null],
    ['starglass', 'Starglass', 4, 'ore', '#e8e8ff', 14, [0.08, 0.08, 0.16]], ['onyx', 'Onyx', 4, 'facet', '#4a4458', 11, null],
  ];
  const MT = MIN.map(([k, name, b, tex, col, price, light]) => {
    const B = BAND[b], key = 'v3m_' + k;
    const t = addTile({ key, name, solid: true, hard: B.hard, time: 1.4, drop: key, colors: tex === 'facet' ? [col, RW.shade(col, 0.3), RW.shade(col, -0.35)] : B.rock, tex, ore: col, nod: col, light: light || undefined });
    item({ id: key, name, kind: 'place', place: key, icon: { s: 'ore', a: col, b: B.rock[0] }, desc: 'A pretty stone from the ' + B.name + ' band. Of no use for gear, but it builds, and the job-givers in the towns buy it (' + price + ' coins each).' });
    RW.V3_JOBS && RW.V3_JOBS.push({ give: { [key]: 5 }, get: ['coin', price * 5], note: 'Buys ' + name + '.' });
    return { t, b, price };
  });

  // ---------------- structure blocks ----------------
  const RUIN = BAND.map((B, b) => {
    const key = 'v3ruin_' + b, name = ['Coral', 'Kelp', 'Scald', 'Bone', 'Void'][b] + ' Brick';
    const t = addTile({ key, name, solid: true, hard: B.hard, time: 1.2, drop: key, colors: B.ruin, tex: 'brick' });
    item({ id: key, name, kind: 'place', place: key, icon: { s: 'block', a: B.ruin[1], b: B.ruin[2] }, desc: 'Carved brick from a sunken ruin. Building block.' });
    return t;
  });
  const VWALL = BAND.map((B, b) => addTile({ key: 'v3vault_' + b, name: 'Rune-cut ' + B.name + ' Stone', solid: true, hard: B.hard + 2, time: 3, drop: null, colors: B.vault, tex: 'plate', light: [0.04, 0.04, 0.06] }));
  const NEST = addTile({ key: 'v3nestmesh', name: 'Nest Weave', solid: true, hard: 3, time: 0.5, drop: null, colors: ['#4a3e2e', '#6a5a40', '#2e2618'], tex: 'spire' });
  const CHEST = {
    ruin: addTile({ key: 'v3c_ruin', name: 'Ruin Chest', solid: true, hard: 1, time: 1.0, decor: 'chest', chest: 'keep', loot: 'v3ruin' }),
    camp: addTile({ key: 'v3c_camp', name: "Miner's Chest", solid: true, hard: 1, time: 1.0, decor: 'chest', chest: 'camp', loot: 'v3camp' }),
    nest: addTile({ key: 'v3c_nest', name: 'Nest Hoard', solid: true, hard: 1, time: 1.0, decor: 'chest', chest: 'grove', loot: 'v3nest' }),
    vault: addTile({ key: 'v3c_vault', name: 'Deep Vault Chest', solid: true, hard: 2, time: 1.4, decor: 'chest', chest: 'vault', loot: 'v3vault', light: [0.35, 0.3, 0.12] }),
  };
  if (A.buildTiles) { try { A.buildTiles(); } catch (e) { /* plain */ } }

  // ---------------- loot, by the band you are in ----------------
  const RINGS = ['coralite', 'verdigrite', 'cindrite', 'fossilite', 'nullstone'], BOSSORE = ['fangstone', 'leafscale', 'magmashell', 'gravesteel', null];
  const hereBand = () => { const r = L.regionAt((P.x + P.w / 2) / TS, (P.y + P.h / 2) / TS); const b = bandOfJ(r.j); return b < 0 ? 0 : b; };
  const ok = (rows) => rows.filter((r) => r[0] && RW.ITEMS[r[0]]);
  const set = (b) => (RW.v3ringItems && RW.v3ringItems.SETS && RW.v3ringItems.SETS[b]) || null;
  const mins = (b) => MIN.filter((m) => m[2] === b).map((m) => 'v3m_' + m[0]);
  const LOOTS = {
    v3ruin: (b) => { const S = set(b); return ok([['coin', 30 * (b + 1), 80 * (b + 1), 1], [RINGS[b] + '_bar', 2, 5, 0.8], [mins(b)[0], 3, 8, 0.7], [mins(b)[1], 3, 8, 0.5], [RUIN[b] && 'v3ruin_' + b, 6, 14, 0.6], [S && S.helm[0], 1, 1, 0.1], [S && S.mail[0], 1, 1, 0.08], ['glow_bright_cyan', 1, 1, 0.12], ['star_ember', 1, 1, 0.15]]); },
    v3camp: (b) => ok([['coin', 20 * (b + 1), 50 * (b + 1), 1], [RINGS[b] + '_ore', 6, 14, 1], [RINGS[b] + '_bar', 1, 3, 0.5], ['torch', 6, 14, 0.9], ['chain', 4, 10, 0.5], ['iron_bar', 2, 6, 0.6], ['glow_lantern', 1, 3, 0.4], [mins(b)[0], 2, 6, 0.5], ['ladder', 4, 10, 0.4]]),
    v3nest: (b) => ok([['coin', 25 * (b + 1), 60 * (b + 1), 1], [BOSSORE[b], 1, 2, 0.25], [RINGS[b] + '_bar', 1, 4, 0.7], ['fish_scale', 3, 8, 0.8], ['fish_eye', 1, 3, 0.5], [mins(b)[1], 2, 6, 0.6], ['bone', 2, 6, b === 3 ? 0.9 : 0.3]]),
    v3vault: (b) => { const S = set(b); return ok([['coin', 150 * (b + 1), 300 * (b + 1), 1], [RINGS[b] + '_bar', 6, 10, 1], [BOSSORE[b] || 'nullstone_bar', 2, 3, 0.8], [S && S.melee[0], 1, 1, 0.35], [S && S.bow[0], 1, 1, 0.3], [S && S.staff[0], 1, 1, 0.3], [S && S.helm[0], 1, 1, 0.25], [S && S.mail[0], 1, 1, 0.2], [RW.pick(['t_coil', 't_thorn', 't_feather', 't_magnet']), 1, 1, 0.4], ['glow_radiant_violet', 1, 1, 0.15], ['star_ember', 1, 2, 0.5]]); },
  };
  Object.keys(LOOTS).forEach((k) => Object.defineProperty(RW.LOOT, k, { configurable: true, enumerable: true, get: () => LOOTS[k](hereBand()) }));

  // ---------------- building them into the world ----------------
  function decorate(out) {
    const W = out.W, H = out.H, fg = out.fg, bg = out.bg, Tt = RW.T, seed = (out.meta && out.meta.seed) || 1;
    const rnd = (a, b, k) => RW.hash2(a, b, seed + 400 + (k || 0)), nz = (x, y, k) => RW.noise2(x, y, seed + 500 + k);
    const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? Tt.bedrock : fg[y * W + x]);
    const inBand = (x, y, j) => { const r = L.regionAt(x, y); return r.j === j && !r.seal && x > 3 && x < W - 4; };
    const put = (x, y, t, j) => { if (inBand(x, y, j)) fg[y * W + x] = t; };
    const putb = (x, y, w, j) => { if (w != null && inBand(x, y, j)) bg[y * W + x] = w; };
    const meta = out.meta, taken = [];
    (meta.v3lairs || []).forEach((l) => taken.push({ x0: l.x - l.rx - 6, x1: l.x + l.rx + 6, y0: l.y - l.ry - 6, y1: l.y + l.ry + 6 }));
    if (meta.v3shaft) taken.push({ x0: meta.v3shaft.x - 8, x1: meta.v3shaft.x + 8, y0: 0, y1: H });
    const free = (x0, y0, x1, y1, j) => { if (taken.some((q) => x1 >= q.x0 && x0 <= q.x1 && y1 >= q.y0 && y0 <= q.y1)) return false; for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) if (!inBand(x, y, j)) return false; return true; };
    const ROCKT = L.ROCK, OREt = L.ORE;
    // 1. minerals
    for (let y = L.CUT; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      const i = y * W + x, r = L.regionAt(x, y); if (r.seal || r.j < 1 || r.j > 5) continue;
      if (fg[i] !== ROCKT[r.j]) continue;
      const b = bandOfJ(r.j), m = MT.filter((q) => q.b === b);
      if (nz(x / 5 + b * 40, y / 5, 1) > 0.83) fg[i] = m[0].t; // clumps
      else if (nz(x / 16 + b * 40, y / 3.2, 2) > 0.87) fg[i] = m[1].t; // streaks along the stone
    }
    const structs = [], carts = [], nests = [];
    const tryPlace = (j, w, h, k) => { for (let a = 0; a < 40; a++) { const x = Math.round(20 + rnd(j * 100 + k, a, 3) * (W - 40 - w)), y = Math.round(L.midOf(j) + (rnd(j * 100 + k, a, 4) - 0.5) * 120 - h / 2); if (free(x - 2, y - 2, x + w + 2, y + h + 2, j)) { taken.push({ x0: x - 4, x1: x + w + 4, y0: y - 4, y1: y + h + 4 }); return { x, y }; } } return null; };
    const carve = (x0, y0, w, h, j) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, Tt.water, j); };
    BAND.forEach((B, b) => {
      const j = B.j, brick = RUIN[b], wall = RW.W.brick;
      // sunken ruins (3)
      for (let k = 0; k < 3; k++) {
        const w = 18 + Math.round(rnd(b, k, 5) * 10), h = 13, at = tryPlace(j, w, h, k); if (!at) continue;
        const { x, y } = at; carve(x, y, w, h, j);
        for (let yy = y + 1; yy < y + h - 1; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) if (rnd(xx, yy, 6) < 0.75) putb(xx, yy, wall, j); // what is left of the back wall
        for (let xx = x; xx < x + w; xx++) { if (rnd(xx, y, 7) < 0.85) put(xx, y + h - 1, brick, j); if (rnd(xx, y, 8) < 0.6) put(xx, y + h, brick, j); } // the floor, cracked
        for (let xx = x + 1; xx < x + w - 1; xx += 5) { const hh = rnd(xx, y, 9) < 0.35 ? 2 + Math.round(rnd(xx, y, 10) * 5) : h - 2; for (let k2 = 1; k2 <= hh; k2++) put(xx, y + h - 1 - k2, brick, j); if (hh < h - 2) put(xx + 1, y + h - 2, brick, j); } // pillars, some broken off
        for (let xx = x; xx < x + w; xx++) if (rnd(xx, y, 11) < 0.7) put(xx, y, brick, j); // the lintel, fallen in places
        for (let xx = x + 3; xx < x + w - 3; xx++) if (rnd(xx, y, 12) < 0.12) put(xx, y + h - 2, brick, j); // rubble
        const cx = x + (w >> 1); put(cx, y + h - 2, CHEST.ruin, j); put(cx + 1, y + h - 2, Tt.water, j); put(cx - 1, y + h - 2, Tt.water, j);
        structs.push({ kind: 'ruin', band: b, x, y, w, h });
      }
      // mining camps (3)
      for (let k = 0; k < 3; k++) {
        const w = 22 + Math.round(rnd(b, k, 13) * 8), h = 11, at = tryPlace(j, w, h, 10 + k); if (!at) continue;
        const { x, y } = at; carve(x, y, w, h, j);
        for (let xx = x; xx < x + w; xx++) { put(xx, y + h, Tt.planks, j); if (rnd(xx, y, 14) < 0.2) put(xx, y + h, Tt.water, j); } // rotten boards
        for (const xx of [x, x + (w >> 1), x + w - 1]) for (let yy = y; yy < y + h; yy++) if (rnd(xx, yy, 15) < 0.9) put(xx, yy, Tt.planks, j); // posts
        for (let xx = x + 1; xx < x + w - 1; xx++) if (rnd(xx, y, 16) < 0.85) put(xx, y + 5, Tt.woodplat, j); // the scaffold deck
        for (let yy = y + 1; yy < y + h; yy++) put(x + 2, yy, Tt.ladder, j);
        for (const xx of [x + 5, x + w - 6]) { put(xx, y, Tt.chain, j); put(xx, y + 1, Tt.lantern, j); }
        put(x + w - 4, y + h - 1, CHEST.camp, j);
        carts.push({ x: x + 7, y: y + h - 1 }, { x: x + w - 10, y: y + 4 });
        structs.push({ kind: 'camp', band: b, x, y, w, h });
      }
      // creature nests (2)
      for (let k = 0; k < 2; k++) {
        const w = 22, h = 13, at = tryPlace(j, w, h, 20 + k); if (!at) continue;
        const { x, y } = at, cx = x + w / 2, cy = y + h / 2;
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
          const d = Math.max(Math.abs(xx - cx) / (w / 2), Math.abs(yy - cy) / (h / 2), (Math.abs(xx - cx) / (w / 2) + Math.abs(yy - cy) / (h / 2)) * 0.72); // an angular den, not a bubble
          if (d < 0.78) put(xx, yy, Tt.water, j); else if (d < 1) put(xx, yy, NEST, j);
        }
        for (let xx = x + 3; xx < x + w - 3; xx++) put(xx, y + h - 3, NEST, j); // the nest floor
        nests.push({ id: b * 10 + k, band: b, x: Math.round(cx), y: y + h - 4 });
        structs.push({ kind: 'nest', band: b, x, y, w, h });
      }
      // vaults (1, sometimes 2)
      for (let k = 0; k < (rnd(b, 0, 17) < 0.4 ? 2 : 1); k++) {
        const w = 16, h = 10, at = tryPlace(j, w, h, 30 + k); if (!at) continue;
        const { x, y } = at;
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const edge = xx < x + 2 || xx >= x + w - 2 || yy < y + 2 || yy >= y + h - 2; put(xx, yy, edge ? VWALL[b] : Tt.water, j); if (!edge) putb(xx, yy, wall, j); }
        put(x + 2, y + 2, Tt.lantern, j); put(x + w - 3, y + 2, Tt.lantern, j);
        put(x + (w >> 1), y + h - 3, CHEST.vault, j);
        structs.push({ kind: 'vault', band: b, x, y, w, h });
      }
    });
    meta.v3structs = structs; meta.v3carts = carts; meta.v3nests = nests;
    return out;
  }
  const prevGen = def.generate;
  def.generate = function () {
    const out = prevGen.apply(this, arguments);
    if (out && out.meta && out.meta.v3rings && out.meta.v3rings.bands) { try { decorate(out); } catch (e) { console.warn('v3 band decor', e); } }
    return out;
  };

  // ---------------- nests wake ----------------
  const nkey = (n) => 'v3nest_' + n.id + '@w' + ((RW.v3slots && RW.v3slots.world) || 'none');
  const BROOD = [['spiky_fish', 'creepy_fish'], ['lurker_fish', 'spiky_fish'], ['spiky_fish', 'lurker_fish'], ['v3_skelfish', 'creepy_fish'], ['lurker_fish', 'creepy_fish']];
  let nestT = 0;
  const baseUpd = P.update;
  P.update = function (dt) {
    const r = baseUpd.apply(this, arguments);
    if ((nestT -= dt) > 0 || P.dead || !(RW.game && RW.game.playing) || !WD.meta || !WD.meta.v3nests) return r;
    nestT = 0.5; const c = P.center();
    WD.meta.v3nests.forEach((n) => {
      if (n.done || RW.store.get(nkey(n), 0)) { n.done = true; return; }
      const nx = n.x * TS + 8, ny = n.y * TS + 8;
      if (!n.brood) {
        if (Math.hypot(nx - c.x, ny - c.y) > 9 * TS) return;
        const kinds = BROOD[n.band].filter((s) => RW.SPECIES[s]); n.brood = [];
        for (let k = 0; k < 4 + n.band; k++) { const e = E.spawnEnemy(kinds[k % kinds.length], nx + RW.rand(-60, 60), ny - RW.rand(10, 50)); if (e) { e.provoked = true; e.hp = e.maxhp = Math.round(e.maxhp * (1 + n.band * 0.6)); n.brood.push(e); } }
        U.toast('The nest stirs. Its brood comes for you!'); RW.audio.sfx('roar');
        return;
      }
      if (n.brood.every((e) => e.dead || !E.enemies.includes(e))) {
        if (Math.hypot(nx - c.x, ny - c.y) > 30 * TS) { n.brood = null; return; } // swam off: they settle back
        n.done = true; RW.store.set(nkey(n), 1); WD.setTile(n.x, n.y, CHEST.nest); U.banner('Nest cleared', 'The brood is gone. Their hoard is yours.'); RW.fx.burst(nx, ny, ['#f2c94c', '#ffffff'], 24, 120, { add: true, kind: 'glow' });
      }
    });
    return r;
  };

  // ---------------- drawing: carts, eggs, glyphs ----------------
  const baseTiles = WD.drawTiles;
  WD.drawTiles = function (g, cam, vw, vh, time) {
    const r = baseTiles.apply(this, arguments), m = WD.meta;
    if (!m || !m.v3structs || (RW.v3zoom && RW.v3zoom.far())) return r;
    const x0 = cam.x / TS - 4, x1 = (cam.x + vw) / TS + 4, y0 = cam.y / TS - 4, y1 = (cam.y + vh) / TS + 4, ox = -Math.round(cam.x), oy = -Math.round(cam.y);
    const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + ox), Math.round(y + oy), w, h); };
    (m.v3carts || []).forEach((k) => { // a tipped old mine cart
      if (k.x < x0 || k.x > x1 || k.y < y0 || k.y > y1) return; const x = k.x * TS, y = (k.y + 1) * TS;
      rect(x - 2, y - 12, 22, 9, '#3a2e24'); rect(x - 1, y - 11, 20, 2, '#5a4632'); rect(x, y - 8, 18, 1, '#2a2018');
      rect(x - 3, y - 13, 24, 2, '#6a6a72'); rect(x + 1, y - 4, 4, 4, '#2a2a30'); rect(x + 13, y - 4, 4, 4, '#2a2a30'); rect(x + 2, y - 3, 2, 2, '#6a6a72'); rect(x + 14, y - 3, 2, 2, '#6a6a72');
      rect(x + 4, y - 15, 3, 2, '#8a8472'); rect(x + 9, y - 16, 4, 3, '#6a665a');
    });
    (m.v3nests || []).forEach((n) => { // a clutch of eggs until the nest is cleared
      if (n.done || n.x < x0 || n.x > x1 || n.y < y0 || n.y > y1) return; const x = n.x * TS, y = (n.y + 1) * TS;
      [[-14, 7], [-6, 9], [3, 8], [11, 7], [-2, 6]].forEach(([dx, s], i) => { const wob = Math.sin(time * 3 + i) > 0.92 ? 1 : 0; rect(x + dx + wob, y - s - 2, s - 2, s, ['#d8c8a0', '#c8b890', '#e0d4b0'][i % 3]); rect(x + dx + 1 + wob, y - s - 1, 2, 2, '#f4ecd0'); rect(x + dx + 2 + wob, y - 4, 1, 1, '#6a5a40'); });
    });
    (m.v3structs || []).forEach((s) => { // carved glyphs glow on vault walls
      if (s.kind !== 'vault' || s.x > x1 || s.x + s.w < x0 || s.y > y1 || s.y + s.h < y0) return; const B = BAND[s.band], a = 0.5 + 0.5 * Math.sin(time * 2 + s.x);
      g.save(); g.globalAlpha = a; g.fillStyle = B.glyph;
      for (let xx = s.x + 1; xx < s.x + s.w - 1; xx += 3) { if (WD.get(xx, s.y) !== VWALL[s.band]) continue; const x = xx * TS + 6 + ox, y = s.y * TS + 6 + oy; g.fillRect(x, y, 4, 1); g.fillRect(x + 1, y, 1, 5); g.fillRect(x + 3, y + 2, 2, 1); }
      g.restore();
    });
    return r;
  };

  RW.v3bandDecor = { MIN, MT, RUIN, VWALL, NEST, CHEST, BAND, LOOTS };
})(window.RW);
