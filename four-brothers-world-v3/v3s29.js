// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 29: more blocks for the deep layers, and platforms in the water.
//  * The block limit: new (band) worlds keep their blocks in 16-bit cells (v3s22), so there can be more than 256 kinds.
//    A block numbered past 255 can't be placed in an older world (it says so and keeps the item).
//  * Ten new blocks in every layer:
//      3 building blocks (Polished, Bricks, Tiles; 4 of the layer's stone make 4 by hand),
//      3 natural growths that the world places (some solid, some small things on the floor), and they build too,
//      2 pieces of furniture (a lamp and a statue, made at the forge),
//      2 for getting on:
//        Coral: Blood Pearl vein (its pearl, used in Grindmaw's lair, calls it up enraged: more health, harder hits,
//               double the ore) and Glowpearl Block (strong light).
//        Kelp:  Wraith Seed vein (calls the Frondwraith) and Lumen Bulb Block (light).
//        Scald: Scald Ember vein (calls Scaldjaw) and Chillstone (cools the water within 4 blocks of it).
//        Bone:  Grave Bell vein (calls the Gravekeeper) and Soul Lantern (light; no skeleton fish rise within 8 blocks).
//        Void:  Anchor Stone (hold on beside it like a glowing anchor; currents can't take you) and Starglow Lamp.
//  * Platforms through the water layers, small and not too many (about 30 per layer): thin ledges you can jump up
//    through, little floating rock ledges (some with ore), and broken old walkways on chains. Some carry glowing
//    growths.
(function (RW) {
  'use strict';
  const P = RW.player, E = RW.ent, WD = RW.world, U = RW.ui, R = RW.register, A = RW.art, TS = RW.TILE, VA = RW.v3art;
  const L = RW.v3ringsLib, def = RW.WORLDS && RW.WORLDS.rock;
  if (!P || !WD || !R || !L || !def) return;
  function addTile(d) { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; }
  const item = (o) => R.item(Object.assign({ stack: 99 }, o));
  const recipes = (list) => { if (R.recipes) R.recipes(list); else list.forEach((r) => RW.RECIPES.push(r)); };

  // ---------------- the limit ----------------
  const wide = () => !(WD.fg instanceof Uint8Array);
  const baseSet = WD.setTile;
  WD.setTile = function (x, y, t) { if (t > 255 && !wide()) return; return baseSet.apply(this, arguments); };
  const basePlace = P.tryPlace;
  P.tryPlace = function (tx, ty, item) {
    const it = item || P.held(); const id = it && it.place && RW.T[it.place];
    if (id > 255 && !wide()) { U.toast('That block is from the deep layers. It only holds in worlds made since they were found.'); return; }
    return basePlace.apply(this, arguments);
  };

  // ---------------- the blocks ----------------
  const NAME = ['Coral', 'Kelp', 'Scald', 'Bone', 'Void'];
  const ROCKKEY = ['v3reefrock', 'v3kelprock', 'v3basalt', 'v3fossil', 'v3voidrock'];
  const BAR = ['coralite_bar', 'verdigrite_bar', 'cindrite_bar', 'fossilite_bar', 'nullstone_bar'];
  const HARD = [9, 11, 13, 15, 17];
  const PAL = [ // base, light, dark, accent, glow
    ['#56646a', '#7a8a90', '#2e3840', '#f08a6a', '#ffb0a0'],
    ['#3e4e40', '#5e7a58', '#222c24', '#7ad070', '#a8ff9a'],
    ['#2c2628', '#4a3e3c', '#141012', '#ff8a3a', '#ffd0a0'],
    ['#8a8472', '#b8ae90', '#4e4a42', '#d8d0b4', '#f0e8c0'],
    ['#16121e', '#2e2442', '#06050a', '#9a74e0', '#c8b0ff'],
  ];
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d'); return c; };
  const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  // sprites for the small things (16 x 16, drawn by hand in code)
  const DRAW = {
    lamp(g, p) { rect(g, 7, 6, 2, 10, p[2]); rect(g, 5, 14, 6, 2, p[2]); rect(g, 4, 2, 8, 5, p[0]); rect(g, 5, 3, 6, 3, p[4]); rect(g, 6, 3, 2, 1, '#ffffff'); rect(g, 3, 1, 10, 1, p[2]); },
    statue(g, p, b) {
      rect(g, 3, 13, 10, 3, p[2]); rect(g, 4, 12, 8, 1, p[1]);
      const S = [ // a carved figure of the layer's beast
        ['....xxx.....', '...xxxxx....', 'xxxxxxxxxx..', '.xxxxxxxxxxx', '..xxxxxxx...', '.xx.....x...'], // shark
        ['......xx....', '.....xxxx...', '..xxxxxxxx..', 'xxxx..xxx...', '.x....xx....', '......x.....'], // dragon
        ['..xxxx......', '.xxxxxx.....', 'xxxxxxxxxx..', 'xxxxxxx.xxx.', '.xxxxx......', '............'], // shell eel
        ['...xxxxx....', '..xxxxxxx...', '..x.xx.xx...', '..xxxxxxx...', '...x.x.x....', '...xxxxx....'], // skull
        ['....xxxx....', '..xxxxxxxx..', '.xxx.xx.xxx.', '..xxxxxxxx..', '....xxxx....', '.....xx.....'], // eye
      ][b];
      S.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'x') rect(g, 2 + x, 5 + y, 1, 1, (x + y) % 3 ? p[1] : p[0]); }));
    },
    anemone(g, p) { rect(g, 4, 13, 8, 3, p[3]); for (let k = 0; k < 5; k++) { const x = 4 + k * 2; rect(g, x, 8 + (k % 2) * 2, 1, 5 - (k % 2) * 2, p[3]); rect(g, x, 7 + (k % 2) * 2, 1, 1, p[4]); } },
    clam(g, p) { rect(g, 3, 11, 10, 4, p[1]); rect(g, 4, 9, 8, 2, p[1]); rect(g, 4, 12, 8, 1, p[2]); rect(g, 7, 11, 2, 1, '#f4f0ff'); for (let x = 4; x < 12; x += 2) rect(g, x, 9, 1, 5, p[0]); },
    bulb(g, p) { rect(g, 7, 9, 2, 7, p[2]); rect(g, 5, 4, 6, 6, p[3]); rect(g, 6, 5, 3, 3, p[4]); rect(g, 6, 3, 4, 1, p[3]); },
    embermoss(g, p) { for (let x = 1; x < 15; x++) { const h = 1 + ((x * 7) % 3); rect(g, x, 16 - h, 1, h, (x % 3) ? p[3] : p[4]); } },
    skulls(g, p) { [[2, 10], [8, 10], [5, 6]].forEach(([x, y]) => { rect(g, x, y, 6, 5, p[1]); rect(g, x + 1, y + 2, 1, 1, '#141018'); rect(g, x + 4, y + 2, 1, 1, '#141018'); rect(g, x + 2, y + 4, 2, 1, p[2]); }); },
    vcrystal(g, p) { [[4, 6, 3], [8, 3, 4], [11, 8, 2]].forEach(([x, y, w]) => { rect(g, x, y, w, 16 - y, p[3]); rect(g, x, y, 1, 16 - y, p[4]); rect(g, x + w - 1, y + 2, 1, 14 - y, p[2]); }); },
    shadowbloom(g, p) { rect(g, 7, 9, 2, 7, p[2]); [[4, 5], [9, 5], [6, 2], [6, 7]].forEach(([x, y]) => rect(g, x, y, 4, 3, p[3])); rect(g, 7, 5, 2, 2, p[4]); },
    glowplant(g) { rect(g, 7, 10, 1, 6, '#3a6a5a'); rect(g, 5, 12, 1, 4, '#3a6a5a'); rect(g, 10, 11, 1, 5, '#3a6a5a'); rect(g, 6, 7, 3, 3, '#8affe0'); rect(g, 4, 10, 3, 2, '#5ad8c0'); rect(g, 9, 9, 3, 2, '#5ad8c0'); rect(g, 7, 8, 1, 1, '#ffffff'); },
    soullantern(g, p) { rect(g, 7, 0, 2, 3, '#4a4650'); rect(g, 4, 3, 8, 10, '#2a2420'); rect(g, 5, 4, 6, 8, '#5ab894'); rect(g, 6, 5, 4, 5, '#c0f8dc'); rect(g, 3, 12, 10, 2, p[2]); },
    plat(g, p) { rect(g, 0, 0, 16, 4, p[0]); rect(g, 0, 0, 16, 1, p[1]); for (let x = 0; x < 16; x += 4) rect(g, x + 1, 4, 2, 1 + (x % 8 ? 1 : 0), p[2]); rect(g, 0, 3, 16, 1, p[2]); },
  };
  const sprites = {};
  function sprite(t) {
    if (sprites[t.id]) return sprites[t.id];
    const c = mk(16, 16), p = PAL[t.v3band] || PAL[0]; DRAW[t.v3draw](c.ctx, p, t.v3band || 0);
    if (VA && VA.finish && t.v3draw !== 'plat') try { VA.finish(c, p.concat(['#ffffff', '#141018', '#f4f0ff', '#2a2420', '#5ab894', '#c0f8dc', '#4a4650', '#3a6a5a', '#8affe0', '#5ad8c0'])); } catch (e) { /* plain */ }
    sprites[t.id] = c; return c;
  }
  const baseDecor = A.drawDecor;
  A.drawDecor = function (g, t, sx, sy) { if (t && t.v3draw) { g.drawImage(sprite(t), sx, sy); return; } return baseDecor.apply(this, arguments); };

  const K = []; // K[b] = { polished, bricks, tiles, nat: [...], lamp, statue, prog: [...], summon, plat }
  const GROW = [ // [key, name, solid?, tex or draw, colour, light]
    [['brain', 'Brain Coral', true, 'nodule', '#e07a8a'], ['sponge', 'Sea Sponge', true, 'pebble', '#e8c05a'], ['clam', 'Giant Clam', false, 'clam']],
    [['boulder', 'Mossy Boulder', true, 'rough', '#4a6a3a'], ['anemone', 'Sea Anemone', false, 'anemone'], ['kbulb', 'Kelp Bulb', false, 'bulb', null, [0.05, 0.18, 0.06]]],
    [['chimney', 'Sulfur Chimney', true, 'spire', '#d8c040'], ['slag', 'Glassy Slag', true, 'facet', '#3a2e44'], ['embermoss', 'Ember Moss', false, 'embermoss', null, [0.16, 0.06, 0.02]]],
    [['ribs', 'Ribcage Lattice', true, 'bone', '#d8d0b4'], ['fossilslab', 'Fossil Slab', true, 'layer', '#a89c80'], ['skulls', 'Skull Pile', false, 'skulls']],
    [['vcrystal', 'Void Crystal', false, 'vcrystal', null, [0.1, 0.06, 0.2]], ['shadow', 'Shadow Bloom', false, 'shadowbloom', null, [0.06, 0.03, 0.12]], ['starstone', 'Starstone', true, 'ore', '#e8e8ff', [0.06, 0.06, 0.12]]],
  ];
  for (let b = 0; b < 5; b++) {
    const p = PAL[b], N = NAME[b], k = (s) => 'v3k_' + b + '_' + s, o = { nat: [], prog: [] };
    const blk = (key, name, extra) => { const id = addTile(Object.assign({ key, name, solid: true, hard: HARD[b], time: 1.2, drop: key, colors: [p[0], p[1], p[2]] }, extra)); item({ id: key, name, kind: 'place', place: key, icon: { s: 'block', a: (extra && extra.colors ? extra.colors[0] : p[0]), b: p[2] }, desc: (extra && extra.desc) || 'A block from the ' + N + ' layer. It builds.' }); return id; };
    // 3 building blocks
    o.polished = blk(k('polished'), 'Polished ' + N + ' Stone', { tex: 'facet', colors: [p[1], RW.shade(p[1], 0.25), p[0]], desc: 'Smoothed ' + N.toLowerCase() + ' stone. For building.' });
    o.bricks = blk(k('bricks'), N + ' Bricks', { tex: 'brick', colors: [p[0], p[1], p[2]], desc: N + ' stone cut into bricks. For building.' });
    o.tiles = blk(k('tiles'), N + ' Tiles', { tex: 'plate', colors: [RW.shade(p[0], 0.1), p[1], p[2]], desc: 'Square-cut ' + N.toLowerCase() + ' tiles. For building.' });
    if (RW.ITEMS[ROCKKEY[b]]) recipes([{ out: k('polished'), n: 4, in: { [ROCKKEY[b]]: 4 } }, { out: k('bricks'), n: 4, in: { [ROCKKEY[b]]: 4 } }, { out: k('tiles'), n: 4, in: { [k('polished')]: 4 } }]);
    // 3 natural growths
    GROW[b].forEach(([gk, name, solid, how, col, light]) => {
      let id;
      if (solid) id = blk(k(gk), name, { tex: how, colors: [col, RW.shade(col, 0.25), RW.shade(col, -0.35)], ore: how === 'ore' ? col : undefined, light, desc: 'Grows in the ' + N + ' layer. It builds.' });
      else { id = addTile({ key: k(gk), name, solid: false, hard: 1, time: 0.3, drop: k(gk), decor: 'v3', v3draw: how, v3band: b, light }); item({ id: k(gk), name, kind: 'place', place: k(gk), icon: { s: 'petal', a: p[3], b: p[2] }, desc: 'Grows in the ' + N + ' layer. Place it as decoration.' }); }
      o.nat.push({ id, solid, key: k(gk) });
    });
    // 2 furniture
    o.lamp = addTile({ key: k('lamp'), name: N + ' Lamp', solid: false, hard: 1, time: 0.4, drop: k('lamp'), decor: 'v3', v3draw: 'lamp', v3band: b, light: [0.35 + (b === 2 ? 0.2 : 0), 0.32, 0.26 + (b === 4 ? 0.2 : 0)] });
    item({ id: k('lamp'), name: N + ' Lamp', kind: 'place', place: k('lamp'), icon: { s: 'lantern', a: p[4], b: p[2] }, desc: 'A lamp of ' + N.toLowerCase() + ' stone.' });
    o.statue = addTile({ key: k('statue'), name: N + ' Statue', solid: false, hard: 2, time: 0.8, drop: k('statue'), decor: 'v3', v3draw: 'statue', v3band: b });
    item({ id: k('statue'), name: N + ' Statue', kind: 'place', place: k('statue'), icon: { s: 'slab', a: p[1], b: p[2] }, desc: 'A carved statue of the ' + N + ' layer\'s beast.' });
    if (RW.ITEMS[BAR[b]] && RW.ITEMS[ROCKKEY[b]]) recipes([{ out: k('lamp'), in: { [BAR[b]]: 1, [k('polished')]: 2 }, at: 'forge' }, { out: k('statue'), in: { [k('polished')]: 10 }, at: 'forge' }]);
    K.push(o);
  }
  // progression blocks
  const SUMMON = [['bloodpearl', 'Blood Pearl', 'v3b_grindmaw', '#c0283a'], ['wraithseed', 'Wraith Seed', 'v3b_frondwraith', '#5ad870'], ['scaldember', 'Scald Ember', 'v3b_scaldjaw', '#ff6a2a'], ['gravebell', 'Grave Bell', 'v3b_gravekeeper', '#c8c0a0']];
  SUMMON.forEach(([s, name, boss, col], b) => {
    const p = PAL[b], key = 'v3k_' + b + '_' + s + 'vein';
    K[b].summon = addTile({ key, name: name + ' Vein', solid: true, hard: HARD[b], time: 2.2, drop: 'v3sum_' + s, colors: [p[0], p[1], p[2]], tex: 'ore', ore: col, light: [0.12, 0.04, 0.04] });
    item({ id: 'v3sum_' + s, name, kind: 'material', stack: 10, icon: { s: 'gem', a: col, b: RW.shade(col, -0.4) }, desc: 'Found in veins in the ' + NAME[b] + ' layer. Use it (right click) inside ' + (RW.SPECIES[boss] ? RW.SPECIES[boss].name : 'the boss') + '\'s lair to call it up enraged: more health, harder hits, double the ore.' });
    K[b].prog.push(K[b].summon);
    RW.v3useItem = RW.v3useItem || {};
    RW.v3useItem['v3sum_' + s] = () => {
      const l = ((WD.meta && WD.meta.v3lairs) || []).find((q) => q.boss === boss), c = P.center();
      if (!l || ((c.x / TS - l.x) / (l.rx * 1.3)) ** 2 + ((c.y / TS - l.y) / (l.ry * 1.3)) ** 2 > 1) { U.toast('Nothing answers. Use it inside the lair.'); return true; }
      if (E.enemies.some((q) => q.sp === boss && !q.dead)) { U.toast('It is already awake.'); return true; }
      if (!RW.v3callBoss) return true;
      P.remove ? P.remove('v3sum_' + s, 1) : null;
      const e = RW.v3callBoss(boss); if (e) { e.hp = e.maxhp = Math.round(e.maxhp * 1.5); e.v3enraged = true; e.sp && RW.SPECIES[e.sp] && (e.dmgMul = 1.25); U.banner && U.banner(RW.SPECIES[boss].name + ', enraged', 'It took the ' + name.toLowerCase() + '. It hits harder, and drops twice the ore.'); RW.fx.flash('#ff3a2a', 0.3); }
      return true;
    };
  });
  const prog = (b, key, name, extra, desc, recipe) => { const p = PAL[b]; const id = addTile(Object.assign({ key, name, solid: true, hard: HARD[b], time: 1.2, drop: key, colors: [p[0], p[1], p[2]] }, extra)); item({ id: key, name, kind: 'place', place: key, icon: { s: extra.decor ? 'lantern' : 'block', a: (extra.colors || p)[0], b: p[2] }, desc }); if (recipe) recipes([recipe]); K[b].prog.push(id); return id; };
  K[0].glowpearl = prog(0, 'v3k_0_glowpearl', 'Glowpearl Block', { tex: 'nodule', colors: ['#f4e8ec', '#ffffff', '#c8b8c0'], ore: '#ffffff', light: [0.6, 0.55, 0.55] }, 'Bright light for the dark water.', { out: 'v3k_0_glowpearl', n: 2, in: { v3m_pearlstone: 4, coralite_bar: 1 }, at: 'forge' });
  K[1].lumen = prog(1, 'v3k_1_lumen', 'Lumen Bulb Block', { tex: 'nodule', colors: ['#5ad870', '#a8ff9a', '#2a6a3a'], ore: '#d8ffd0', light: [0.25, 0.6, 0.3] }, 'A swollen glowing bulb. Lights the kelp.', { out: 'v3k_1_lumen', n: 2, in: { 'v3k_1_kbulb': 3, verdigrite_bar: 1 }, at: 'forge' });
  K[2].chill = prog(2, 'v3k_2_chill', 'Chillstone', { tex: 'facet', colors: ['#7ac8ff', '#c8f0ff', '#3a6a9a'], light: [0.12, 0.25, 0.4] }, 'Cold to the touch. Scalding water within 4 blocks of it won\'t burn you (superheated rock still does).', { out: 'v3k_2_chill', in: { cindrite_bar: 2, v3m_obsidian: 4 }, at: 'forge' });
  K[3].soul = addTile({ key: 'v3k_3_soullantern', name: 'Soul Lantern', solid: false, hard: 2, time: 0.6, drop: 'v3k_3_soullantern', decor: 'v3', v3draw: 'soullantern', v3band: 3, light: [0.25, 0.6, 0.45] });
  item({ id: 'v3k_3_soullantern', name: 'Soul Lantern', kind: 'place', place: 'v3k_3_soullantern', icon: { s: 'lantern', a: '#5ab894', b: '#2a2420' }, desc: 'Light, and the dead stay down: no skeleton fish rise within 8 blocks of it.' });
  recipes([{ out: 'v3k_3_soullantern', in: { fossilite_bar: 2, 'v3k_3_skulls': 2 }, at: 'forge' }]); K[3].prog.push(K[3].soul);
  K[4].anchor = prog(4, 'v3k_4_anchorstone', 'Anchor Stone', { tex: 'plate', colors: ['#3a3a5a', '#8a8ad8', '#22223a'], light: [0.3, 0.3, 0.7] }, 'Hold on beside it and the Hollow Dark\'s currents can\'t take you, like the glowing anchors.', { out: 'v3k_4_anchorstone', in: { nullstone_bar: 2, v3m_onyx: 3 }, at: 'forge' });
  K[4].starglow = prog(4, 'v3k_4_starglow', 'Starglow Lamp', { tex: 'ore', colors: ['#16121e', '#2e2442', '#06050a'], ore: '#e8e8ff', light: [0.45, 0.45, 0.7] }, 'Light that the void can\'t swallow.', { out: 'v3k_4_starglow', n: 2, in: { v3m_starglass: 4, nullstone_bar: 1 }, at: 'forge' });
  // platforms
  const PLAT = PAL.map((p, b) => addTile({ key: 'v3plat_' + b, name: NAME[b] + ' Ledge', platform: true, hard: 1, time: 0.3, drop: 'v3plat_' + b, decor: 'v3', v3draw: 'plat', v3band: b }));
  PLAT.forEach((id, b) => { item({ id: 'v3plat_' + b, name: NAME[b] + ' Ledge', kind: 'place', place: 'v3plat_' + b, icon: { s: 'slab', a: PAL[b][0], b: PAL[b][2] }, desc: 'A thin ledge you can jump up through.' }); if (RW.ITEMS[ROCKKEY[b]]) recipes([{ out: 'v3plat_' + b, n: 4, in: { [ROCKKEY[b]]: 1 } }]); });
  const GLOWPLANT = addTile({ key: 'v3k_glowplant', name: 'Glowing Growth', solid: false, hard: 0, time: 0.2, drop: 'glow_mushroom', decor: 'v3', v3draw: 'glowplant', light: [0.1, 0.35, 0.3] });
  if (A.buildTiles) { try { A.buildTiles(); } catch (e) { /* plain */ } }

  // ---------------- what the progression blocks do ----------------
  const near = (id, r) => { const c = P.center(), tx = Math.floor(c.x / TS), ty = Math.floor(c.y / TS); for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) if (WD.get(x, y) === id) return true; return false; };
  RW.v3nearTile = (key, r) => RW.T[key] != null && near(RW.T[key], r);
  // enraged bosses hit harder and drop twice the ore
  const baseHurt = P.hurt;
  P.hurt = function (d, dir, src) { if (E.enemies.some((q) => q.v3enraged && !q.dead && q.isRingBoss)) arguments[0] = Math.round(d * 1.25); return baseHurt.apply(this, arguments); };
  const ORE = { v3b_grindmaw: 'fangstone', v3b_frondwraith: 'leafscale', v3b_scaldjaw: 'magmashell', v3b_gravekeeper: 'gravesteel' };
  const baseKill = E.kill;
  E.kill = function (e) { if (e && e.v3enraged && ORE[e.sp] && !e.dead) { const c = { x: e.x + e.w / 2, y: e.y + e.h / 2 }; E.dropItem(ORE[e.sp], RW.randi(3, 6), c.x, c.y); } return baseKill.apply(this, arguments); };

  // ---------------- placing them in the world ----------------
  function fill(out) {
    const W = out.W, H = out.H, fg = out.fg, m = out.meta, T = RW.T, seed = (m.seed || 1) + 900;
    const hh = (a, b, k) => RW.hash2(a, b, seed + k), nz = (x, y, k) => RW.noise2(x, y, seed + k);
    const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.bedrock : fg[y * W + x]);
    const open = (t) => t === T.water || t === T.air;
    const avoid = [];
    (m.v3lairs || []).forEach((l) => avoid.push([l.x - l.rx - 3, l.y - l.ry - 3, l.x + l.rx + 3, l.y + l.ry + 3]));
    (m.v3structs || []).forEach((q) => avoid.push([q.x - 2, q.y - 2, q.x + q.w + 2, q.y + q.h + 2]));
    if (m.v3shaft) avoid.push([m.v3shaft.x - 5, 0, m.v3shaft.x + 5, H]);
    const blocked = (x, y) => avoid.some((q) => x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3]);
    const band = (x, y) => { const r = L.regionAt(x, y); return r.seal || r.j < 1 || r.j > 5 ? -1 : 5 - r.j; };
    const ROCKT = L.ROCK, ORET = L.ORE;
    for (let y = L.CUT + 3; y < H - 4; y++) for (let x = 3; x < W - 3; x++) {
      const b = band(x, y); if (b < 0) continue; const i = y * W + x, t = fg[i], o = K[b], j = 5 - b;
      if (t === ROCKT[j]) {
        const surf = open(get(x, y - 1)) || open(get(x, y + 1)) || open(get(x - 1, y)) || open(get(x + 1, y));
        const sol = o.nat.filter((q) => q.solid);
        if (sol[0] && nz(x / 7 + b * 31, y / 7, 11) > 0.915) fg[i] = sol[0].id;
        else if (sol[1] && nz(x / 4 + b * 17, y / 9, 12) > 0.925) fg[i] = sol[1].id;
        else if (o.summon && !surf && hh(x, y, 13) < 0.0009) fg[i] = o.summon; // rare veins, deep in the stone
        else if (surf && b === 0 && hh(x, y, 14) < 0.006) fg[i] = o.glowpearl;
        else if (surf && b === 1 && hh(x, y, 14) < 0.006) fg[i] = o.lumen;
        else if (surf && b === 2 && hh(x, y, 14) < 0.004) fg[i] = o.chill;
        else if (surf && b === 4 && hh(x, y, 14) < 0.003) fg[i] = o.starglow;
      } else if (open(t) && !blocked(x, y)) {
        const under = get(x, y + 1); if (!(RW.TILES[under] && RW.TILES[under].solid)) continue;
        const deco = o.nat.filter((q) => !q.solid);
        if (deco.length && hh(x, y, 15) < 0.05) fg[i] = deco[Math.floor(hh(x, y, 16) * deco.length)].id;
      }
    }
    // platforms: small, about 30 a layer, in open water away from everything
    const nPer = 30;
    for (let b = 0; b < 5; b++) {
      const j = 5 - b, y0 = L.TOP[b] + 6, y1 = (b < 4 ? L.TOP[b + 1] : L.TOP[5]) - 6; let made = 0;
      for (let a = 0; a < 2500 && made < nPer; a++) {
        const x = Math.round(10 + hh(b, a, 21) * (W - 20)), y = Math.round(y0 + hh(b, a, 22) * (y1 - y0));
        if (band(x, y) !== b || blocked(x, y)) continue;
        let ok = true; for (let yy = y - 4; yy <= y + 3 && ok; yy++) for (let xx = x - 5; xx <= x + 5; xx++) if (!open(get(xx, yy))) { ok = false; break; }
        if (!ok) continue;
        const kind = hh(x, y, 23), w = 3 + Math.floor(hh(x, y, 24) * 4);
        if (kind < 0.45) { // a thin ledge
          for (let k = 0; k < w; k++) fg[y * W + x - (w >> 1) + k] = PLAT[b];
        } else if (kind < 0.85) { // a little rock ledge, ragged underneath, sometimes with ore
          for (let k = 0; k < w; k++) { const xx = x - (w >> 1) + k; fg[y * W + xx] = hh(xx, y, 25) < 0.25 ? ORET[j] : ROCKT[j]; if (k > 0 && k < w - 1) fg[(y + 1) * W + xx] = hh(xx, y + 1, 26) < 0.2 ? ORET[j] : ROCKT[j]; if (k === w >> 1 && w > 4) fg[(y + 2) * W + xx] = ROCKT[j]; }
        } else { // a broken walkway hanging on chains
          const ww = w + 3; for (let k = 0; k < ww; k++) if (hh(x + k, y, 27) > 0.2) fg[y * W + x - (ww >> 1) + k] = T.woodplat;
          for (const cx of [x - (ww >> 1), x - (ww >> 1) + ww - 1]) { let yy = y - 1; while (yy > y - 16 && open(get(cx, yy))) yy--; if (yy > y - 16) for (let q = yy + 1; q < y; q++) fg[q * W + cx] = T.chain; }
        }
        if (hh(x, y, 28) < 0.4 && open(get(x, y - 1))) fg[(y - 1) * W + x] = GLOWPLANT;
        made++;
      }
    }
  }
  const prevGen = def.generate;
  def.generate = function () {
    const out = prevGen.apply(this, arguments);
    try { if (out && out.meta && out.meta.v3rings && out.meta.v3rings.bands && !(out.fg instanceof Uint8Array)) fill(out); } catch (e) { console.warn('v3 band blocks', e); }
    return out;
  };

  RW.v3blocks = { K, PLAT, GLOWPLANT, PAL, NAME };
})(window.RW);
