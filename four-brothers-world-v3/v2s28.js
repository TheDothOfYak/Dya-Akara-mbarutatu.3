// 4 Brothers World V2 — part 28: Cloudtop, a happy magic land on a cloud high above Tuftwood.
//  * A long cloud floats over Fuzzy World (tile x 190–670, the top at about row 30), right above Tuftwood village.
//    Tuftwood's town portal now carries you up there; a cloud portal in the cloud village brings you back down.
//  * Four places, west to east: Bloomfield Meadows (flowers everywhere, giant blooms, the flower folk),
//    Puffton (the cloud village), the Candyfloss Grove (cotton-candy trees, rainbow bridges over gaps in the cloud,
//    and the Rainbow Falls pouring down to the land below) and the Starlit Isles (little floating islands under a
//    twilight sky, crystals and star flowers).
//  * The cloud folk are drawn from McKay's sketch ("Lil guys"): Sprinkles the donut, the Bloomlings (flower folk),
//    Tippy the triangle, Mayor Nimbus the cloud, Inchworth the long block, and Mr. Doorley the house.
//  * Only two bad guys live up there: the Scribbles, from the spiky scribble in the sketch. They float about the
//    Starlit Isles, wind up and dash at you in a zigzag, then get dizzy (hit them then).
//  * Falling off the cloud never hurts: a little cloud catches you and floats you down.
//  * It's always fine weather above the clouds: no rain, fog or storm-grey sky up there.
(function (RW) {
  'use strict';
  const A = RW.art, D = A.drawers, E = RW.ent, P = RW.player, U = RW.ui, R = RW.register, WD = RW.world, TS = RW.TILE;
  if (!A || !E || !P || !RW.WORLDS || !RW.WORLDS.fuzzy) return;
  const { px, rect, line } = A; const mk = A.canvas;
  const H4 = A.h4 || {}; const { disc, poly } = H4;
  const def = RW.WORLDS.fuzzy;
  const H2 = RW.hash2, clamp = RW.clamp, mix = RW.mix;

  // ======================= 1. WHERE IT IS =======================
  const CL = { X0: 190, X1: 670, Y0: 30, VX0: 300, VX1: 400, GX1: 545 };
  const ISLES = [[548, 566, 30], [572, 585, 28], [591, 606, 31], [612, 623, 28], [629, 646, 30], [652, 668, 29]];
  const CHASMS = [[452, 458], [503, 508]];   // gaps in the grove; the first one pours the Rainbow Falls
  RW.v2cloud = CL;
  const ZN = { meadow: 'cl_meadow', village: 'cl_village', grove: 'cl_grove', isles: 'cl_isles' };
  const fuzzyHere = () => RW.world && RW.world.def === def && RW.world.meta && RW.world.meta.cl;
  const sectionAt = (x) => (x < CL.VX0 ? 'meadow' : x < CL.VX1 ? 'village' : x < CL.GX1 ? 'grove' : 'isles');
  // inside the cloud's band of sky (tile coords)
  const inBand = (x, y) => x >= CL.X0 - 3 && x <= CL.X1 + 3 && y >= 0 && y <= 46;

  // ======================= 2. BLOCKS, WALLS, ITEMS =======================
  const addTile = (d) => { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; };
  const addWall = (d) => { if (RW.W[d.key] != null) return RW.W[d.key]; const id = RW.WALLS.length; RW.WALLS.push(d); RW.W[d.key] = id; return id; };
  const CLOUDC = ['#f4f2ff', '#fbfaff', '#e6e2f8'];
  const T_CLOUD = addTile({ key: 'cloud', name: 'Cloud', solid: true, hard: 1, time: 0.3, drop: 'cloud_puff', colors: CLOUDC, tex: 'cloud', v2cloud: true });
  const T_TURF = addTile({ key: 'cloudturf', name: 'Cloud Meadow', solid: true, hard: 1, time: 0.35, drop: 'cloud_puff', colors: CLOUDC, tex: 'cloud', top: '#8fe0a0', topHi: '#c6f6b8', v2cloud: true });
  const T_PINK = addTile({ key: 'pinkbrick', name: 'Candy Brick', solid: true, hard: 2, time: 0.6, drop: 'pinkbrick', colors: ['#f4a6c4', '#ffc4da', '#d886a8'], tex: 'brick' });
  const T_SKYP = addTile({ key: 'skyplank', name: 'Sky Planks', solid: true, hard: 1, time: 0.5, drop: 'skyplank', colors: ['#9cc8f0', '#bcdcff', '#7aa6d4'], tex: 'plank' });
  const T_RAIN = addTile({ key: 'rainbow', name: 'Rainbow Bridge', platform: true, hard: 1, time: 0.25, drop: 'rainbow_bridge', decor: 'rainbow', light: [0.3, 0.25, 0.35] });
  const T_FLOW = addTile({ key: 'skyflower', name: 'Sky Flower', hard: 0, time: 0.05, drop: ['sky_petal', 0, 1], decor: 'skyflower' });
  const T_BIGB = addTile({ key: 'bigbloom', name: 'Big Bloom', hard: 0, time: 0.15, drop: ['sky_petal', 1, 2], decor: 'bigbloom' });
  const T_GIANT = addTile({ key: 'giantbloom', name: 'Giant Bloom', hard: 99, decor: 'giantbloom', lockedMsg: 'A giant bloom, taller than a house. It smells like honey.' });
  const T_CTREE = addTile({ key: 'cottontree', name: 'Candyfloss Tree', hard: 2, time: 0.8, drop: ['sky_petal', 2, 4], decor: 'cottontree' });
  const T_LAMP = addTile({ key: 'skylamp', name: 'Cloud Lamp', hard: 1, time: 0.2, drop: 'cloud_lamp', decor: 'skylamp', light: [0.95, 0.85, 0.62] });
  const T_PORT = addTile({ key: 'cloudportal', name: 'Cloud Portal', hard: 99, decor: 'cloudportal', use: 'cloudportal', light: [0.8, 0.72, 1.0], lockedMsg: 'The cloud portal. Press R beside it to float back down to Tuftwood.' });
  const T_FOUNT = addTile({ key: 'rfountain', name: 'Rainbow Fountain', hard: 99, decor: 'rfountain', light: [0.45, 0.5, 0.65], lockedMsg: 'The Rainbow Fountain. Its water comes out in seven colours.' });
  const T_STAR = addTile({ key: 'starbloom', name: 'Star Bloom', hard: 0, time: 0.05, drop: ['sky_petal', 0, 1], decor: 'starbloom', light: [0.32, 0.28, 0.55] });
  const T_SCRY = addTile({ key: 'skycrystal', name: 'Sky Crystal', hard: 2, time: 0.6, drop: ['crystal_shard', 1, 2], decor: 'skycrystal', light: [0.4, 0.34, 0.62] });
  const WL_CLOUD = addWall({ key: 'cloudw', colors: ['#d8d2ee', '#e2ddf6', '#ccc4e6'] });
  const WL_PINK = addWall({ key: 'pinkw', colors: ['#e8b4cc', '#f0c2d6', '#dca6c0'], brick: true });
  const WL_SKY = addWall({ key: 'skyw', colors: ['#a8c8e8', '#b6d4f0', '#98bade'], plank: true });

  // icons
  A.iconExtra.cl_donut = (g, a, b) => { disc(g, 8, 8.5, 6, '#c8884a'); disc(g, 8, 8, 5.4, a); g.clearRect(7, 7, 3, 3); px(g, 6, 7, b); px(g, 8, 5, '#8fd0ff'); px(g, 11, 8, '#ffe680'); px(g, 5, 10, '#ffffff'); px(g, 10, 11, b); };
  A.iconExtra.cl_petal = (g, a, b) => { disc(g, 8, 8, 4.5, a); disc(g, 7, 7, 2.5, '#ffffff'); px(g, 11, 12, b); px(g, 12, 13, b); };
  A.iconExtra.cl_shard = (g, a, b) => { const C = ['#ff8a8a', '#ffc27a', '#ffe680', '#9ff0a0', '#8fd0ff', '#c8a0ff']; for (let y = 2; y < 14; y++) for (let x = 4; x < 13; x++) { const w = y < 7 ? (y - 2) * 0.8 : (14 - y) * 0.57; if (Math.abs(x - 8) <= w) px(g, x, y, C[clamp(Math.floor((x - 4) / 1.5), 0, 5)]); } px(g, 7, 5, '#ffffff'); };
  A.iconExtra.cl_rainbow = (g) => { const C = ['#ff8a8a', '#ffc27a', '#ffe680', '#9ff0a0', '#8fd0ff', '#c8a0ff']; C.forEach((c, i) => rect(g, 2, 5 + i, 12, 1, c)); };
  A.iconExtra.cl_lamp = (g, a, b) => { rect(g, 7, 7, 2, 8, b); disc(g, 8, 5, 3.5, a); px(g, 7, 4, '#ffffff'); };
  R.items([
    { id: 'cloud_puff', name: 'Cloud Puff', kind: 'place', place: 'cloud', icon: { s: 'block', a: '#f4f2ff', b: '#c8c0e8' }, desc: 'A soft handful of cloud. You can build with it: it holds you up, somehow.' },
    { id: 'sky_petal', name: 'Sky Petal', kind: 'material', icon: { s: 'cl_petal', a: '#ff9ec8', b: '#5cc060' }, desc: 'A petal from a Cloudtop flower. Sprinkles the donut bakes them into sprinkles.' },
    { id: 'rainbow_shard', name: 'Rainbow Shard', kind: 'material', icon: { s: 'cl_shard', a: '#ffffff', b: '#c8a0ff' }, desc: 'A sliver of solid rainbow. Inchworth in Puffton can stretch one into a whole bridge.' },
    { id: 'rainbow_bridge', name: 'Rainbow Bridge', kind: 'place', place: 'rainbow', icon: { s: 'cl_rainbow', a: '#ffffff', b: '#ffffff' }, desc: 'A piece of rainbow you can walk on. Place it in the air to make a bridge.' },
    { id: 'sprinkle_donut', name: 'Sprinkle Donut', kind: 'food', heal: 35, icon: { s: 'cl_donut', a: '#ff9cc8', b: '#ffe680' }, desc: 'Fresh from Sprinkles\' bakery in Puffton. Pink icing, petal sprinkles. Heals a lot.' },
    { id: 'pinkbrick', name: 'Candy Brick', kind: 'place', place: 'pinkbrick', icon: { s: 'block', a: '#f4a6c4', b: '#d886a8' } },
    { id: 'skyplank', name: 'Sky Planks', kind: 'place', place: 'skyplank', icon: { s: 'block', a: '#9cc8f0', b: '#7aa6d4' } },
    { id: 'cloud_lamp', name: 'Cloud Lamp', kind: 'place', place: 'skylamp', icon: { s: 'cl_lamp', a: '#fff0b0', b: '#c8c0e8' }, desc: 'A little lamp shaped like a cloud.' },
  ].filter((i) => !RW.ITEMS[i.id]));

  // ---- the cloud texture: soft white with lavender shading and a few bright curls ----
  const baseBuild = A.buildTiles;
  A.buildTiles = function () {
    const r = baseBuild.apply(this, arguments);
    [T_CLOUD, T_TURF].forEach((id) => {
      A.tiles[id] = [0, 1, 2, 3, 4, 5, 6, 7].map((v) => {
        const c = mk(TS, TS), g = c.ctx;
        for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
          const n = (Math.sin((x + v * 5) * 0.55) + Math.sin((y + v * 3) * 0.7 + x * 0.2)) * 0.25 + H2(x + v * 16, y, 2801) * 0.25;
          px(g, x, y, n > 0.42 ? '#ffffff' : n > 0.05 ? '#f6f4ff' : n > -0.3 ? '#eeebfb' : '#e2def4');
        }
        // a curl or two
        for (let k = 0; k < 2; k++) { const cx = 3 + H2(v, k, 2802) * 10 | 0, cy = 3 + H2(k, v, 2803) * 10 | 0; px(g, cx, cy, '#ffffff'); px(g, cx + 1, cy, '#ffffff'); px(g, cx + 2, cy + 1, '#e2def4'); px(g, cx - 1, cy + 1, '#e2def4'); }
        return c;
      });
    });
    return r;
  };

  // ======================= 3. THE CLOUD FOLK (from the sketch) =======================
  const INK = '#2b2238';
  // the sketch's eyes: an outlined oval with the pupil sitting low
  const eye = (g, x, y, look) => {
    rect(g, x, y + 1, 4, 3, INK); rect(g, x + 1, y, 2, 5, INK);
    rect(g, x + 1, y + 1, 2, 3, '#ffffff');
    rect(g, x + 1 + (look > 0 ? 1 : 0), y + 2, look ? 1 : 2, 2, INK); if (!look) px(g, x + 1, y + 2, INK);
  };
  const smile = (g, x, y, w, col) => { for (let k = 1; k < w - 1; k++) px(g, x + k, y + 1, col || INK); px(g, x, y, col || INK); px(g, x + w - 1, y, col || INK); };
  const shoe = (g, x, y, w, col) => { rect(g, x + 1, y, w - 2, 3, col); rect(g, x, y + 1, w, 1, col); };
  const fin = (c) => A.outline(c, INK);

  // ---- Sprinkles, the donut: a ring with pink icing and sprinkles, arms straight out with puffy glove hands,
  // two long legs and big round shoes ----
  function donut(f) {
    const W = 46, H = 36, c = mk(W, H), g = c.ctx, cx = 23, cy = 12 + (f === 1 ? -1 : 0), R0 = 11, RH = 3.6;
    // legs and shoes
    const ly = cy + R0 - 1;
    for (const lx of [cx - 4, cx + 3]) { rect(g, lx, ly, 2, 33 - ly - 1, '#fff4dc'); px(g, lx - 1 + (lx > cx ? 2 : 0), ly + 3, '#fff4dc'); }
    shoe(g, cx - 9, 31, 7, '#ffffff'); shoe(g, cx + 2, 31, 7, '#ffffff'); rect(g, cx - 8, 33, 5, 1, '#d8d0e8'); rect(g, cx + 3, 33, 5, 1, '#d8d0e8');
    // arms and gloves
    const ay = cy + 1, wave = f === 1 ? -2 : 0;
    line(g, cx - R0, ay, cx - R0 - 7, ay + wave, '#fff4dc'); line(g, cx + R0, ay, cx + R0 + 7, ay + wave, '#fff4dc');
    for (const s of [-1, 1]) { const hx = cx + s * (R0 + 9), hy = ay + wave; disc(g, hx, hy, 2.6, '#ffffff'); disc(g, hx + s * 2, hy - 2, 1.3, '#ffffff'); disc(g, hx + s * 2.6, hy, 1.3, '#ffffff'); disc(g, hx + s * 1.5, hy + 2, 1.2, '#ffffff'); }
    // the ring
    for (let y = -R0; y <= R0; y++) for (let x = -R0; x <= R0; x++) {
      const d = Math.hypot(x, y); if (d > R0 + 0.3 || d < RH) continue;
      const a = Math.atan2(y, x), ice = d < 8.6 + Math.sin(a * 7) * 0.9 + (y < 0 ? 0.6 : -0.4) && d > RH + 0.8;
      let col = y < 2 ? '#e8b468' : '#cf9050'; if (y > 7) col = '#b87a40';
      if (ice) col = (x + y < -6 ? '#ffc6de' : '#ff9cc8');
      px(g, cx + x, cy + y, col);
    }
    // sprinkles (not on the face)
    [[-7, 2, '#8fd0ff'], [6, 3, '#ffe680'], [-5, 6, '#ffffff'], [7, -2, '#9ff0a0'], [-8, -3, '#ffe680'], [3, 7, '#8fd0ff'], [-2, 7, '#c8a0ff'], [8, 5, '#ffffff']].forEach(([x, y, col]) => { px(g, cx + x, cy + y, col); px(g, cx + x + 1, cy + y - (x % 2 ? 1 : 0), col); });
    eye(g, cx - 6, cy - 9, 0); eye(g, cx + 2, cy - 9, 0);
    smile(g, cx - 2, cy - 4, 5);
    return fin(c);
  }
  // ---- a Bloomling: a cloud-shaped flower head with a face, on a long stem with one leaf ----
  const BLOOM = { pink: ['#ff9ec8', '#ffc8e0', '#e07aa8'], yellow: ['#ffd86a', '#fff0a8', '#e0b040'], lilac: ['#c8a6ff', '#e2d0ff', '#9a78d8'], peach: ['#ffb48a', '#ffd6bc', '#e08a62'], sky: ['#9fd8ff', '#d0ecff', '#70b0e0'] };
  function bloomling(v, f) {
    const C = BLOOM[v] || BLOOM.pink, W = 24, H = 38, c = mk(W, H), g = c.ctx, sw = f === 1 ? 1 : 0, hx = 12 + sw, hy = 9;
    // stem with a gentle bend and one leaf
    for (let y = 16; y < 37; y++) { const x = Math.round(12 + Math.sin((y - 16) / 21 * Math.PI) * 0.8 * (f === 1 ? 1 : -1) + (y < 22 ? sw * (22 - y) / 6 : 0)); rect(g, x, y, 2, 1, y > 30 ? '#4aa850' : '#5cc060'); }
    const lx = 14, ly = 27; for (let k = 0; k < 6; k++) { rect(g, lx + k, ly - Math.round(k * 0.7), 2, 2 + (k > 1 && k < 5 ? 1 : 0), '#7ed870'); } px(g, lx + 2, ly - 1, '#a8f09a');
    // the head: a cloud with three bumps on top
    [[hx, hy, 7.2], [hx - 6, hy + 1, 4.4], [hx + 6, hy + 1, 4.4], [hx - 3.5, hy - 4.5, 3.8], [hx + 3.5, hy - 4.5, 3.8], [hx, hy - 5.5, 3.2]].forEach(([x, y, r]) => disc(g, x, y, r, C[0]));
    [[hx - 4, hy - 5, 2], [hx - 6, hy - 1, 1.6]].forEach(([x, y, r]) => disc(g, x, y, r, C[1]));
    for (let x = hx - 9; x <= hx + 9; x++) { const y = hy + 6; if (g.getImageData(x, y, 1, 1).data[3]) px(g, x, y, C[2]); }
    eye(g, hx - 5, hy - 2, 0); eye(g, hx + 1, hy - 2, 0);
    smile(g, hx - 1, hy + 3, 4);
    return fin(c);
  }
  // ---- Tippy, the triangle: a tall triangle with crossed poles at the tip, waving two little flags ----
  function tippy(f) {
    const W = 40, H = 36, c = mk(W, H), g = c.ctx, ax = 20, ay = 6, by = 28, hw = 13;
    // crossed poles at the tip
    line(g, ax - 3, ay + 2, ax + 3, ay - 5, '#8a5a34'); line(g, ax + 3, ay + 2, ax - 3, ay - 5, '#8a5a34');
    // arms and flags
    const up = f === 1 ? -3 : 0;
    line(g, ax - 8, 19, ax - 14, 13 + up, '#8a5a34'); line(g, ax + 8, 19, ax + 14, 13 - up, '#8a5a34');
    poly(g, [[ax - 17, 9 + up], [ax - 13, 8 + up], [ax - 12, 12 + up], [ax - 16, 13 + up]], '#ff9ec8');
    poly(g, [[ax + 13, 9 - up], [ax + 17, 8 - up], [ax + 18, 12 - up], [ax + 14, 13 - up]], '#8fd0ff');
    // legs with L feet
    rect(g, ax - 5, by, 1, 5, INK); rect(g, ax - 7, by + 5, 3, 1, INK); rect(g, ax + 4, by, 1, 5, INK); rect(g, ax + 4, by + 5, 3, 1, INK);
    // the triangle
    for (let y = ay; y <= by; y++) { const w = (y - ay) / (by - ay) * hw; for (let x = Math.round(ax - w); x <= Math.round(ax + w); x++) px(g, x, y, x > ax + w * 0.35 ? '#f0b24e' : y < ay + 6 ? '#ffe49a' : '#ffcf6e'); }
    eye(g, ax - 5, 13, 0); eye(g, ax + 1, 13, 0);
    rect(g, ax - 2, 21, 5, 1, INK);
    return fin(c);
  }
  // ---- Mayor Nimbus, the cloud: a big puffy cloud with an open happy mouth, twig arms and little feet ----
  function nimbus(f) {
    const W = 52, H = 40, c = mk(W, H), g = c.ctx, cx = 26, cy = 18 + (f === 1 ? -1 : 0);
    // twig arms with forked ends
    const up = f === 1 ? -1 : 0;
    for (const s of [-1, 1]) { const x0 = cx + s * 14, x1 = cx + s * 22, y1 = cy - 3 + up; line(g, x0, cy + 1, x1, y1, '#7a5634'); line(g, x1, y1, x1 + s * 2, y1 - 3, '#7a5634'); line(g, x1, y1, x1 + s * 3, y1 + 1, '#7a5634'); }
    // little dark feet
    rect(g, cx - 9, cy + 16, 6, 3, '#3a3048'); rect(g, cx + 4, cy + 17, 6, 3, '#3a3048');
    const P0 = [[0, 0, 10], [-9, 1, 7.5], [9, 1, 7.5], [-5, -8, 6.5], [5, -9, 7], [-12, 7, 5.5], [12, 7, 5.5], [-4, 9, 6.5], [5, 9, 6.5], [0, -11, 4.5]];
    P0.forEach(([x, y, r]) => disc(g, cx + x, cy + y, r, '#fbfaff'));
    // soft lavender shading underneath, a highlight on top
    const d = g.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!d[(y * W + x) * 4 + 3]) continue; const below = y + 3 < H && !d[((y + 3) * W + x) * 4 + 3]; if (y > cy + 8 && below) px(g, x, y, '#dcd6f2'); }
    [[-6, -10, 3], [3, -12, 2.4]].forEach(([x, y, r]) => disc(g, cx + x, cy + y, r, '#ffffff'));
    eye(g, cx - 7, cy - 6, 0); eye(g, cx + 3, cy - 6, 0);
    // the open smile with a tongue
    rect(g, cx - 3, cy + 1, 7, 1, INK); rect(g, cx - 2, cy + 2, 5, 2, INK); rect(g, cx - 1, cy + 4, 3, 1, INK); rect(g, cx - 1, cy + 3, 3, 1, '#ff8aa8');
    return fin(c);
  }
  // ---- Inchworth, the long block: a long box with ruler ticks along the top and little knobs on the ends ----
  function inchworth(f) {
    const W = 48, H = 26, c = mk(W, H), g = c.ctx, x0 = 5, x1 = 42, y0 = 6 + (f === 1 ? -1 : 0), y1 = y0 + 14;
    rect(g, x0, y0, x1 - x0 + 1, y1 - y0 + 1, '#9ee6c8'); rect(g, x0, y1 - 3, x1 - x0 + 1, 4, '#7ccca8'); rect(g, x0, y0, x1 - x0 + 1, 2, '#c4f4dc');
    for (let k = 0; k < 7; k++) { const tx = x0 + 9 + k * 4; rect(g, tx, y0 - 2, 1, k % 2 ? 3 : 4, INK); }
    rect(g, x0 - 2, y0 + 6, 2, 4, '#7ccca8'); rect(g, x1 + 1, y0 + 6, 2, 4, '#7ccca8');
    eye(g, 19, y0 + 3, 0); eye(g, 25, y0 + 3, 0);
    rect(g, 20, y0 + 10, 7, 1, INK);
    const st = f === 1 ? 1 : 0;
    rect(g, 13 + st, y1 + 1, 6, 3, '#3a3048'); rect(g, 27 - st, y1 + 1, 6, 3, '#3a3048');
    return fin(c);
  }
  // ---- Mr. Doorley, the house: a pointed roof, window eyes, a curly moustache, a door, and legs ----
  function doorley(f) {
    const W = 36, H = 46, c = mk(W, H), g = c.ctx, cx = 18, top = 2 + (f === 1 ? -1 : 0), wy = top + 12, by = wy + 24;
    // arms
    const up = f === 1 ? -2 : 0;
    line(g, cx - 11, wy + 12, cx - 15, wy + 9 + up, '#7a5634'); line(g, cx + 11, wy + 12, cx + 15, wy + 9 - up, '#7a5634');
    // legs and feet
    rect(g, cx - 6, by, 1, 4, INK); rect(g, cx + 6, by, 1, 4, INK); rect(g, cx - 9, by + 4, 5, 2, '#3a3048'); rect(g, cx + 5, by + 4, 5, 2, '#3a3048');
    // walls
    rect(g, cx - 11, wy, 23, by - wy, '#ffe6a8'); rect(g, cx + 6, wy, 6, by - wy, '#f4d48a');
    // roof
    for (let y = top; y <= wy; y++) { const w = (y - top) / (wy - top) * 13; for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) px(g, x, y, x > cx + w * 0.4 ? '#d85e5e' : '#f07878'); }
    // window eyes
    for (const ex of [cx - 9, cx + 2]) { rect(g, ex, wy + 2, 7, 7, INK); rect(g, ex + 1, wy + 3, 5, 5, '#ffffff'); disc(g, ex + 3.5, wy + 5.5, 1.6, INK); px(g, ex + 3, wy + 5, '#ffffff'); }
    // curly moustache and smile
    [[-5, 0], [-4, -1], [-3, -1], [-2, 0], [-1, 1], [0, 0], [1, 1], [2, 0], [3, -1], [4, -1], [5, 0], [-5, 1], [5, 1]].forEach(([x, y]) => px(g, cx + x, wy + 11 + y, '#6a4428'));
    smile(g, cx - 2, wy + 13, 5);
    // little windows with crosses, and the door with its knob
    for (const wx of [cx - 10, cx + 6]) { rect(g, wx, wy + 15, 5, 5, INK); rect(g, wx + 1, wy + 16, 3, 3, '#a8dcff'); px(g, wx + 2, wy + 16, INK); px(g, wx + 2, wy + 18, INK); px(g, wx + 1, wy + 17, INK); px(g, wx + 3, wy + 17, INK); }
    rect(g, cx - 3, wy + 15, 7, by - wy - 15, '#a86a3e'); rect(g, cx - 3, wy + 15, 7, 1, '#7a4a2a'); px(g, cx + 2, wy + 20, '#ffe680');
    return fin(c);
  }
  // ---- a Scribble (the bad guy): a spiky scribble with a grin, a twig arm, a cross on a stick, and loopy feet.
  // Every frame is scribbled again, so it boils like a drawing that won't sit still. ----
  function scribble(f) {
    const W = 48, H = 46, c = mk(W, H), g = c.ctx, cx = 23, cy = 21, N = 13;
    const pts = []; for (let k = 0; k < N * 2; k++) { const a = k / (N * 2) * Math.PI * 2 + f * 0.05, r = (k % 2 ? 7 : 15) + (H2(k, f, 2811) - 0.5) * 3.5; pts.push([cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 0.92]); }
    // twig arm (left) and the cross on a stick (top right)
    const j = (k) => Math.round((H2(k, f, 2812) - 0.5) * 2);
    line(g, cx - 12, cy + 6, cx - 21, cy + 10 + j(1), '#3a2c50'); line(g, cx - 21, cy + 10 + j(1), cx - 23, cy + 6, '#3a2c50'); line(g, cx - 21, cy + 10 + j(1), cx - 24, cy + 12, '#3a2c50');
    line(g, cx + 10, cy - 10, cx + 13, cy - 19, '#3a2c50'); line(g, cx + 10 + j(2), cy - 18, cx + 16, cy - 18, '#3a2c50');
    // loopy scribble feet
    for (const [fx, fy] of [[cx + 10, cy + 17], [cx + 17, cy + 12]]) for (let k = 0; k < 14; k++) { const a = k * 0.9 + f, r = 2.6 + (k % 3) * 0.5; px(g, Math.round(fx + Math.cos(a) * r), Math.round(fy + Math.sin(a) * r), '#3a2c50'); }
    poly(g, pts, '#4a3866');
    // scribble lines inside
    for (let s = 0; s < 3; s++) { let x = cx - 8 + H2(s, f, 2813) * 16, y = cy - 8 + H2(f, s, 2814) * 16; for (let n = 0; n < 22; n++) { const a = n * 0.7 + s * 2 + f; x += Math.cos(a) * 1.4; y += Math.sin(a * 1.3) * 1.2; const ix = Math.round(x), iy = Math.round(y); if (g.getImageData(ix, iy, 1, 1).data[3]) px(g, ix, iy, s === 1 ? '#ff7ab8' : '#7a62a8'); } }
    // face: small eyes and a big grin
    rect(g, cx - 5, cy - 3, 3, 3, '#ffffff'); rect(g, cx + 2, cy - 4, 3, 3, '#ffffff'); px(g, cx - 4, cy - 2, INK); px(g, cx + 3, cy - 3, INK); px(g, cx - 3, cy - 2, INK); px(g, cx + 4, cy - 3, INK);
    for (let k = 0; k <= 8; k++) { const x = cx - 5 + k, y = cy + 3 + Math.round(Math.sin(k / 8 * Math.PI) * 2); px(g, x, y, '#ffe8f4'); }
    return fin(c);
  }
  const cache2 = (fn) => { let k = null; return () => (k = k || fn()); };
  D.cl_donut = cache2(() => [donut(0), donut(1)]);
  D.cl_bloom = (o) => [bloomling(o.v, 0), bloomling(o.v, 1)];
  D.cl_tippy = cache2(() => [tippy(0), tippy(1)]);
  D.cl_nimbus = cache2(() => [nimbus(0), nimbus(1)]);
  D.cl_inch = cache2(() => [inchworth(0), inchworth(1)]);
  D.cl_doorley = cache2(() => [doorley(0), doorley(1)]);
  D.cl_scribble = () => [0, 1, 2, 3].map((f) => scribble(f));
  RW.v2cloudArt = { donut, bloomling, tippy, nimbus, inchworth, doorley, scribble };

  R.type({ id: 'cloudfolk', name: 'Cloudtop Folk', creator: 'McKay', color: '#c8b8ff', blurb: 'The happy folk who live on the cloud above Tuftwood.' });
  const NPC = [
    // id, drawer, variant, name, size [w, h], where (key into meta.cl.npcs), blurb
    ['cl_donut', 'cl_donut', null, 'Sprinkles', [22, 34], 'The baker of Puffton. A donut with pink icing, and very proud of it. Bakes with Sky Petals.'],
    ['cl_tippy', 'cl_tippy', null, 'Tippy', [20, 34], 'A triangle who waves two flags at everyone who comes up through the portal. Knows every corner of Cloudtop.'],
    ['cl_nimbus', 'cl_nimbus', null, 'Mayor Nimbus', [32, 38], 'The mayor of Puffton, and the biggest cloud in it. Always smiling, even when it rains (it never rains).'],
    ['cl_inch', 'cl_inch', null, 'Inchworth', [38, 22], 'A long block with ruler marks on top. Measures everything. Can stretch a Rainbow Shard into a bridge.'],
    ['cl_doorley', 'cl_doorley', null, 'Mr. Doorley', [24, 44], 'A house with legs and a fine curly moustache. Keeps the Puffton inn, which is him.'],
    ['cl_bloom_pink', 'cl_bloom', 'pink', 'Posy', [16, 36], 'A Bloomling, one of the flower folk of Bloomfield Meadows. Says hello to everyone. Twice.'],
    ['cl_bloom_yellow', 'cl_bloom', 'yellow', 'Bud', [16, 36], 'A Bloomling. Faces the sun all day and gets a little dizzy.'],
    ['cl_bloom_lilac', 'cl_bloom', 'lilac', 'Petunia', [16, 36], 'A Bloomling who has never once seen the ground below the cloud, and doesn\'t believe in it.'],
    ['cl_bloom_peach', 'cl_bloom', 'peach', 'Pip', [16, 36], 'A small Bloomling who lives among the candyfloss trees.'],
  ];
  NPC.forEach(([id, draw, v, name, , blurb]) => R.species({ id, type: 'cloudfolk', name, world: 'fuzzy', role: 'npc', status: 'active', art: { draw, v }, still: /^cl_bloom/.test(id), blurb }));
  R.species({ id: 'cl_scribble', type: 'cloudfolk', name: 'Scribble', world: 'fuzzy', role: 'enemy', status: 'active', art: { draw: 'cl_scribble' },
    w: 30, h: 30, hp: 170, dmg: 14, speed: 300, behavior: 'cl_scribble',
    drops: [['rainbow_shard', 1, 1, 2], ['sky_petal', 0.8, 1, 3], ['crystal_purple', 0.3, 1, 1]],
    blurb: 'A scribble that got loose from a drawing. There are only two of them, out in the Starlit Isles. It floats about grinning, then shivers, and dashes at you in a zigzag. After a dash it is dizzy for a moment: that is when to hit it.' });
  if (A._spCache) Object.keys(A._spCache).forEach((k) => { if (/^cl_/.test(k)) delete A._spCache[k]; });

  // ======================= 4. BUILDING THE CLOUD =======================
  const baseGen = def.generate;
  def.generate = function () {
    const gen = baseGen.apply(this, arguments);
    try { build(gen); } catch (e) { console.warn('cloudtop', e); }
    return gen;
  };
  const CARV = RW.CARVINGS_FUZZY || (RW.CARVINGS_FUZZY = []);
  const CARVE_BASE = CARV.length;
  CARV.push(
    { title: 'Hello', text: 'Hello! Welcome to Cloudtop. Wipe your feet (you can\'t, it\'s a cloud). Puffton is this way, the flowers are that way, and everything is nice.' },
    { title: 'The Starlit Isles', text: 'It is always evening out here. Two Scribbles drifted in from somewhere and never left. They are not mean, exactly. They are just very, very scribbly.' },
  );
  function build(gen) {
    const T = RW.T, W = gen.W, fg = gen.fg, bg = gen.bg, H = fg.length / W, M = gen.meta, surf = M.surf;
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) fg[y * W + x] = typeof t === 'number' ? t : T[t]; };
    const wall = (x, y, w) => { if (x >= 0 && y >= 0 && x < W && y < H) bg[y * W + x] = w || 0; };
    const get = (x, y) => fg[y * W + x];
    const isle = (x) => ISLES.find(([a, b]) => x >= a && x <= b);
    const chasm = (x) => CHASMS.some(([a, b]) => x >= a && x <= b);
    const top = new Int16Array(W).fill(-1), bot = new Int16Array(W).fill(-1);
    for (let x = CL.X0; x <= CL.X1; x++) {
      let t, th;
      if (x < CL.GX1) {
        if (chasm(x)) continue;
        const s = sectionAt(x);
        if (s === 'meadow') { const k = clamp((CL.VX0 - x) / 10, 0, 1); t = CL.Y0 + Math.round((2.2 * Math.sin(x / 9.5) + 1.3 * Math.sin(x / 4.1 + 1) - 1) * k); }
        else if (s === 'village') t = CL.Y0;
        else { const k = clamp((x - CL.VX1) / 8, 0, 1); t = CL.Y0 + Math.round(1.5 * Math.sin(x / 11) * k); }
        th = 9 + Math.round(2 * Math.sin(x / 13) + 1.5 * Math.sin(x / 5.3));
        const e0 = (x - CL.X0) / 16, e1 = (CL.GX1 - 1 - x) / 10, e = Math.min(1, e0, e1);
        if (e < 1) { th = Math.max(2, Math.round(th * Math.sqrt(Math.max(0.05, e)))); t += Math.round((1 - e) * 2); }
      } else {
        const I = isle(x); if (!I) continue;
        const [a, b, ty] = I, c = (a + b) / 2, hw = (b - a) / 2 + 0.6;
        t = ty + (Math.abs(x - c) > hw - 1.2 ? 1 : 0); th = Math.max(2, Math.round(7 * Math.sqrt(Math.max(0, 1 - ((x - c) / hw) ** 2))));
      }
      let b = t + th + (H2(x, 0, 2821) > 0.6 ? 1 : 0);
      b = Math.min(b, surf[x] - 10);
      top[x] = t; bot[x] = b;
      for (let y = t; y <= b; y++) { set(x, y, y === t && x < CL.GX1 ? T_TURF : T_CLOUD); wall(x, y, y > t && y < b ? WL_CLOUD : 0); }
    }
    const freeAbove = (x, y, n) => { for (let k = 0; k < n; k++) if (get(x, y - k) !== T.air) return false; return true; };
    // ---- Puffton ----
    const Y0 = CL.Y0;
    const house = (x0, x1, h, mat, wl) => {
      for (let y = Y0 - h; y < Y0; y++) { set(x0, y, mat); set(x1, y, mat); for (let x = x0 + 1; x < x1; x++) { set(x, y, 'air'); wall(x, y, wl); } }
      for (let y = Y0 - 3; y < Y0; y++) { set(x0, y, 'air'); set(x1, y, 'air'); wall(x0, y, wl); wall(x1, y, wl); }
      for (let x = x0; x <= x1; x++) set(x, Y0 - h - 1, mat);
      // a puffy cloud roof
      for (let x = x0 - 1; x <= x1 + 1; x++) set(x, Y0 - h - 2, T_CLOUD);
      for (let x = x0 + 1; x <= x1 - 1; x++) set(x, Y0 - h - 3, T_CLOUD);
      for (let x = x0 + 3; x <= x1 - 3; x++) set(x, Y0 - h - 4, T_CLOUD);
      set(x0 + 2, Y0 - h + 1, 'window'); set(x1 - 2, Y0 - h + 1, 'window');
    };
    house(324, 334, 5, T_PINK, WL_PINK); set(331, Y0 - 1, T_LAMP); set(326, Y0 - 1, 'bookshelf');                // Sprinkles' bakery
    house(351, 364, 7, T_SKYP, WL_SKY); set(353, Y0 - 1, 'bookshelf'); set(362, Y0 - 1, 'bookshelf'); set(357, Y0 - 1, T_LAMP); // the mayor's hall
    house(369, 381, 5, T_SKYP, WL_SKY); set(372, Y0 - 1, 'bed'); set(378, Y0 - 1, 'bed'); set(375, Y0 - 1, T_LAMP);     // the inn
    house(386, 396, 5, T_PINK, WL_PINK); set(388, Y0 - 1, 'bookshelf'); set(394, Y0 - 1, T_LAMP);              // Inchworth's workshop
    set(318, Y0 - 1, T_PORT); set(344, Y0 - 1, T_FOUNT); set(306, Y0 - 1, 'tablet'); M.carvings = M.carvings || {}; M.carvings['306,' + (Y0 - 1)] = CARVE_BASE;
    [303, 312, 338, 349, 366, 384, 399].forEach((x) => { if (get(x, Y0 - 1) === T.air) set(x, Y0 - 1, T_LAMP); });
    for (let x = CL.VX0; x < CL.VX1; x++) if (get(x, Y0) === T_TURF && get(x, Y0 - 1) === T.air && Math.abs(x - 344) > 3 && Math.abs(x - 318) > 2 && H2(x, 1, 2822) < 0.45) set(x, Y0 - 1, T_FLOW);
    // ---- Bloomfield Meadows: flowers everywhere, big blooms, and three giant ones ----
    const GIANTS = [214, 252, 287];
    GIANTS.forEach((x) => { if (top[x] > 0) set(x, top[x] - 1, T_GIANT); });
    for (let x = CL.X0; x < CL.VX0; x++) {
      if (top[x] < 0 || get(x, top[x] - 1) !== T.air || GIANTS.some((g) => Math.abs(g - x) < 2)) continue;
      const h = H2(x, 2, 2823); if (h < 0.12 && freeAbove(x, top[x] - 1, 4)) set(x, top[x] - 1, T_BIGB); else if (h < 0.8) set(x, top[x] - 1, T_FLOW);
    }
    // ---- the Candyfloss Grove ----
    const TREES = [];
    for (let x = CL.VX1 + 4; x < CL.GX1 - 3; x += 7 + Math.floor(H2(x, 3, 2824) * 5)) { if (top[x] > 0 && top[x - 1] > 0 && top[x + 1] > 0 && !chasm(x - 2) && !chasm(x + 2)) { set(x, top[x] - 1, T_CTREE); TREES.push(x); } }
    for (let x = CL.VX1; x < CL.GX1; x++) { if (top[x] < 0 || get(x, top[x] - 1) !== T.air || TREES.some((t) => Math.abs(t - x) < 2)) continue; if (H2(x, 4, 2825) < 0.4) set(x, top[x] - 1, T_FLOW); }
    // rainbow bridges over the gaps
    CHASMS.forEach(([a, b]) => { const y = Math.min(top[a - 1], top[b + 1]); for (let x = a; x <= b; x++) set(x, y, T_RAIN); });
    set(CL.GX1 - 14, top[CL.GX1 - 14] - 1, 'woodchest');
    // ---- the Starlit Isles ----
    ISLES.forEach(([a, b], i) => {
      for (let x = a; x <= b; x++) { if (top[x] < 0 || get(x, top[x] - 1) !== T.air) continue; const h = H2(x, 5, 2826); if (h < 0.12) set(x, top[x] - 1, T_SCRY); else if (h < 0.42) set(x, top[x] - 1, T_STAR); }
      const n = ISLES[i + 1]; if (!n) return;
      const y = Math.min(top[b], top[n[0]]); for (let x = b + 1; x < n[0]; x++) set(x, y, T_RAIN);
    });
    const last = ISLES[ISLES.length - 1], cx = last[1] - 3;
    set(cx, top[cx] - 1, 'woodchest'); M.special = M.special || {}; M.special[cx + ',' + (top[cx] - 1)] = 'gold';
    const tx = last[0] + 2; set(tx, top[tx] - 1, 'tablet'); M.carvings[tx + ',' + (top[tx] - 1)] = CARVE_BASE + 1;
    const mid = (I) => Math.round((I[0] + I[1]) / 2);
    M.cl = {
      Y0, bot: Array.from(bot.slice(CL.X0, CL.X1 + 1)), top: Array.from(top.slice(CL.X0, CL.X1 + 1)),
      portal: { x: 318, y: Y0 - 1 }, arrive: { x: 321, y: Y0 - 1 },
      falls: { x0: CHASMS[0][0], x1: CHASMS[0][1], y: Math.min(top[CHASMS[0][0] - 1], top[CHASMS[0][1] + 1]) },
      homes: [{ x: mid(ISLES[2]), y: ISLES[2][2] - 5 }, { x: mid(ISLES[4]), y: ISLES[4][2] - 5 }],
      npcs: { cl_tippy: [321, Y0 - 1], cl_donut: [329, Y0 - 1], cl_nimbus: [341, Y0 - 1], cl_doorley: [367, Y0 - 1], cl_inch: [383, Y0 - 1],
        cl_bloom_pink: [229, top[229] - 1], cl_bloom_yellow: [246, top[246] - 1], cl_bloom_lilac: [271, top[271] - 1], cl_bloom_peach: [470, top[470] - 1] },
    };
    // the Bloomlings stand on clear ground
    Object.keys(M.cl.npcs).forEach((k) => { const [x, y] = M.cl.npcs[k]; if (/^cl_bloom/.test(k) && get(x, y) !== T.air && !RW.TILES[get(x, y)].solid) set(x, y, 'air'); });
  }

  // ---- the ground below stays in the open sky: daylight, rain and "outdoors" look past the cloud ----
  const bSky = WD.recalcSky;
  WD.recalcSky = function () {
    const r = bSky.apply(this, arguments);
    if (!fuzzyHere()) return r;
    const C = WD.meta.cl, TL = RW.TILES, gt = RW.W.gtrunk, gl = RW.W.gleaf;
    for (let x = CL.X0; x <= CL.X1; x++) {
      const b = C.bot[x - CL.X0]; if (b < 0 || WD.skyTop[x] > b) continue;
      let y = b + 1; while (y < WD.H) { const i = y * WD.W + x, w = WD.bg[i]; if (TL[WD.fg[i]].solid || (w !== 0 && w !== gt && w !== gl)) break; y++; }
      WD.skyTop[x] = y;
    }
    return r;
  };

  // ---- zones ----
  Object.assign(def.zones, {
    [ZN.meadow]: { name: 'Bloomfield Meadows', music: 'crystal' }, [ZN.village]: { name: 'Puffton', music: 'village' },
    [ZN.grove]: { name: 'The Candyfloss Grove', music: 'crystal' }, [ZN.isles]: { name: 'The Starlit Isles', music: 'crystal' },
  });
  const baseZone = def.zoneAt;
  def.zoneAt = function (x, y) {
    if (inBand(x, y) && RW.world && RW.world.meta && RW.world.meta.cl) { const C = RW.world.meta.cl, i = clamp(x - CL.X0, 0, CL.X1 - CL.X0); if (C.bot[i] < 0 || y <= C.bot[i] + 2) return ZN[sectionAt(x)]; }
    return baseZone.call(this, x, y);
  };
  const onCloud = () => { if (!fuzzyHere()) return false; const c = P.center(); return inBand(Math.floor(c.x / TS), Math.floor(c.y / TS)); };

  // ======================= 5. DRAWING THE CLOUD'S THINGS =======================
  const PET = ['#ff9ec8', '#ffd86a', '#c8a6ff', '#9fd8ff', '#ffb48a', '#ffffff', '#ff7aa8', '#a8f0c8'];
  const sprite = new Map();
  const cached = (key, w, h, fn) => { let c = sprite.get(key); if (!c) { c = mk(w, h); fn(c.ctx); sprite.set(key, c); } return c; };
  // a little flower like the one in the sketch: five round petals with an outline, a dot in the middle
  const daisy = (g, cx, cy, r, col, ctr) => {
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; disc(g, cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25, r + 0.7, INK); }
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; disc(g, cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25, r, col); }
    disc(g, cx, cy, Math.max(1, r * 0.75), ctr || '#ffe680'); px(g, Math.round(cx), Math.round(cy), INK);
  };
  const flowerSprite = (kind, ci) => cached('f' + kind + '_' + ci, 16, 24, (g) => {
    const col = PET[ci], stem = '#5cc060', lf = '#7ed870';
    if (kind === 0) { rect(g, 7, 13, 1, 11, stem); rect(g, 8, 18, 2, 1, lf); rect(g, 9, 17, 1, 1, lf); daisy(g, 7.5, 10, 1.6, col); }
    else if (kind === 1) { rect(g, 7, 14, 1, 10, stem); rect(g, 5, 19, 2, 1, lf); rect(g, 4, 18, 1, 1, lf); rect(g, 5, 9, 6, 5, INK); rect(g, 6, 10, 4, 4, col); px(g, 6, 9, INK); px(g, 8, 8, INK); px(g, 9, 9, INK); px(g, 7, 9, col); px(g, 6, 10, RW.shade(col, 0.3)); }
    else if (kind === 2) { rect(g, 7, 12, 1, 12, stem); [[5, 13], [10, 15], [6, 17]].forEach(([x, y]) => { disc(g, x, y, 1.9, INK); disc(g, x, y, 1.2, col); }); px(g, 6, 14, stem); px(g, 9, 16, stem); }
    else { rect(g, 5, 18, 1, 6, stem); rect(g, 10, 16, 1, 8, stem); daisy(g, 5, 16, 1.1, col); daisy(g, 10.5, 14, 1.1, PET[(ci + 3) % PET.length]); }
  });
  const bigBloomSprite = (ci) => cached('bb' + ci, 26, 46, (g) => {
    for (let y = 16; y < 46; y++) rect(g, 12 + Math.round(Math.sin(y / 9) * 0.8), y, 2, 1, '#4fb257');
    for (let k = 0; k < 7; k++) { rect(g, 14 + k, 32 - Math.round(k * 0.6), 2, 2, '#7ed870'); rect(g, 11 - k, 38 - Math.round(k * 0.5), 2, 2, '#6ccc66'); }
    daisy(g, 13, 11, 3.3, PET[ci], '#ffe680');
  });
  const giantSprite = (ci) => cached('gb' + ci, 72, 104, (g) => {
    for (let y = 36; y < 104; y++) { const x = 35 + Math.round(Math.sin(y / 16) * 1.5); rect(g, x, y, 4, 1, '#4aa850'); px(g, x, y, '#3a8a40'); px(g, x + 3, y, '#6cc870'); }
    const leaf = (x0, y0, s) => { for (let k = 0; k < 16; k++) { const w = Math.round(Math.sin(k / 16 * Math.PI) * 4); rect(g, x0 + s * k, y0 - Math.round(k * 0.55) - w, 1, w * 2 + 1, k % 5 ? '#6ccc66' : '#5ab85a'); } };
    leaf(38, 74, 1); leaf(34, 86, -1); leaf(38, 60, 1);
    const cx = 36, cy = 26, col = PET[ci], hi = RW.shade(col, 0.25), lo = RW.shade(col, -0.18);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2; disc(g, cx + Math.cos(a) * 16, cy + Math.sin(a) * 14, 10.5, INK); }
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2, x = cx + Math.cos(a) * 16, y = cy + Math.sin(a) * 14; disc(g, x, y, 9.6, col); disc(g, x - 2, y - 2, 4, hi); disc(g, x + 2, y + 3, 3, lo); }
    disc(g, cx, cy, 10, INK); disc(g, cx, cy, 9, '#ffcf4a'); disc(g, cx - 2, cy - 2, 5, '#ffe680');
    for (let k = 0; k < 14; k++) px(g, cx - 6 + Math.round(H2(k, ci, 2831) * 12), cy - 6 + Math.round(H2(ci, k, 2832) * 12), '#d89a2a');
  });
  const treeSprite = (v) => cached('ct' + v, 64, 92, (g) => {
    const C = [['#ffb6d9', '#ffd6ea', '#e88ab8'], ['#a6dcff', '#d0eeff', '#78b4e4'], ['#d8b8ff', '#ece0ff', '#ab88e0']][v];
    // a candy-striped trunk
    for (let y = 34; y < 92; y++) for (let x = 29; x <= 34; x++) px(g, x, y, ((x + y) >> 2) % 2 ? '#ffffff' : '#ff8ab8');
    for (let y = 34; y < 92; y++) { px(g, 28, y, INK); px(g, 35, y, INK); }
    // the cotton-candy crown: a cluster of puffs
    const puffs = [[32, 24, 16], [18, 30, 11], [46, 30, 11], [24, 14, 10], [41, 13, 11], [32, 6, 8], [12, 22, 7], [52, 21, 7]];
    puffs.forEach(([x, y, r]) => disc(g, x, y, r + 1, INK));
    puffs.forEach(([x, y, r]) => disc(g, x, y, r, C[0]));
    puffs.forEach(([x, y, r]) => disc(g, x + r * 0.3, y + r * 0.35, r * 0.6, C[2]));
    puffs.forEach(([x, y, r]) => disc(g, x - r * 0.35, y - r * 0.35, r * 0.45, C[1]));
    for (let k = 0; k < 9; k++) { const x = 10 + H2(k, v, 2833) * 44 | 0, y = 4 + H2(v, k, 2834) * 30 | 0; if (g.getImageData(x, y, 1, 1).data[3]) px(g, x, y, '#ffffff'); }
  });
  const lampSprite = () => cached('lamp', 16, 30, (g) => {
    rect(g, 7, 10, 2, 20, '#c8c0e8'); rect(g, 7, 10, 1, 20, '#e8e4f8'); rect(g, 5, 28, 6, 2, '#a8a0cc');
    [[8, 7, 4], [5, 8, 2.6], [11, 8, 2.6], [8, 4, 2.6]].forEach(([x, y, r]) => disc(g, x, y, r + 1, '#8a82b0'));
    [[8, 7, 4], [5, 8, 2.6], [11, 8, 2.6], [8, 4, 2.6]].forEach(([x, y, r]) => disc(g, x, y, r, '#fff4c0'));
    disc(g, 7, 6, 1.6, '#ffffff');
  });
  const fountainSprite = () => cached('fount', 56, 44, (g) => {
    // a round basin of candy stone, a column, and a top bowl
    poly(g, [[4, 32], [52, 32], [48, 44], [8, 44]], INK); poly(g, [[5, 33], [51, 33], [47, 43], [9, 43]], '#f4a6c4');
    rect(g, 6, 33, 44, 2, '#ffc4da'); rect(g, 7, 34, 42, 2, '#8fd0ff');
    rect(g, 25, 14, 6, 19, INK); rect(g, 26, 14, 4, 19, '#ffc4da'); rect(g, 26, 14, 1, 19, '#ffe0ec');
    poly(g, [[16, 12], [40, 12], [36, 18], [20, 18]], INK); poly(g, [[17, 13], [39, 13], [35, 17], [21, 17]], '#f4a6c4'); rect(g, 18, 13, 20, 1, '#8fd0ff');
  });
  const RB = ['#ff8a8a', '#ffc27a', '#ffe680', '#9ff0a0', '#8fd0ff', '#c8a0ff'];

  const baseDecor = A.drawDecor;
  A.drawDecor = function (g, t, sx, sy, time, stage, x, y) {
    switch (t.decor) {
      case 'skyflower': { const h = H2(x, y, 2841), kind = Math.floor(h * 4), ci = Math.floor(H2(y, x, 2842) * PET.length), sw = Math.round(Math.sin(time * 1.8 + x * 0.7) * 0.6); g.drawImage(flowerSprite(kind, ci), sx + sw, sy - 8); return; }
      case 'bigbloom': { const ci = Math.floor(H2(x, y, 2843) * PET.length), sw = Math.round(Math.sin(time * 1.3 + x) * 0.8); g.drawImage(bigBloomSprite(ci), sx - 5 + sw, sy - 30); return; }
      case 'giantbloom': { const ci = [0, 2, 1][Math.floor(H2(x, y, 2844) * 3)]; g.drawImage(giantSprite(ci), sx - 28, sy - 88); if (Math.random() < 0.04) RW.fx.spawn({ x: x * TS + 8 + RW.rand(-20, 20), y: (y - 5) * TS, vy: -10, vx: RW.rand(-8, 8), life: 1.6, color: '#fff0a0', add: true, kind: 'glow' }); return; }
      case 'cottontree': { const v = Math.floor(H2(x, y, 2845) * 3); g.drawImage(treeSprite(v), sx - 24, sy - 76); return; }
      case 'skylamp': { g.drawImage(lampSprite(), sx, sy - 14); return; }
      case 'rainbow': {
        RB.forEach((c, i) => { g.fillStyle = c; g.fillRect(sx, sy + i, TS, 1); });
        const sh = ((time * 30 + x * 16) % 48) - 16; if (sh >= 0 && sh < TS) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(sx + sh, sy, 2, 6); }
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(sx, sy, TS, 1);
        return;
      }
      case 'rfountain': {
        g.drawImage(fountainSprite(), sx - 20, sy - 28);
        // rainbow water: arcs of droplets from the top bowl down into the basin
        for (let k = 0; k < 18; k++) {
          const ph = (time * 0.9 + k / 18) % 1, side = k % 2 ? 1 : -1, col = RB[k % 6];
          const ax = sx + 8 + side * ph * 18, ay = sy - 16 - Math.sin(ph * Math.PI) * 9 + ph * 14;
          g.fillStyle = col; g.fillRect(Math.round(ax), Math.round(ay), 2, 2);
        }
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(sx + 7, sy - 20 + Math.round(Math.sin(time * 6)), 2, 3);
        return;
      }
      case 'cloudportal': {
        // pillars of cloud puffs, a rainbow arch over the top, and a swirl of sky inside
        const top = sy - 30;
        g.fillStyle = '#2a4a8a'; g.fillRect(sx - 3, top + 6, 22, 40);
        for (let k = 0; k < 14; k++) { const a = time * 2 + k * 0.45, r = 2 + (k % 5) * 1.4; g.fillStyle = k % 3 ? '#ffffff' : RB[k % 6]; g.fillRect(Math.round(sx + 8 + Math.cos(a) * r * 1.2 - 1), Math.round(top + 26 + Math.sin(a) * r * 2.4), 2, 2); }
        RB.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 1; g.beginPath(); g.arc(sx + 8, top + 8, 15 - i, Math.PI, 0); g.stroke(); });
        for (let k = 0; k < 6; k++) for (const s of [-1, 1]) { const px0 = sx + 8 + s * 13, py0 = top + 12 + k * 6; g.fillStyle = '#8a82b0'; g.beginPath(); g.arc(px0, py0, 5, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px0, py0, 4, 0, 7); g.fill(); }
        g.fillStyle = '#ffe680'; g.fillRect(sx + 7, top - 9, 3, 3); g.fillRect(sx + 6, top - 8, 5, 1); g.fillRect(sx + 8, top - 10, 1, 5);
        if (Math.random() < 0.05) RW.fx.spawn({ x: x * TS + 8 + RW.rand(-8, 8), y: y * TS - 6, vy: -30, life: 1, color: RW.pick(RB), add: true, kind: 'glow' });
        return;
      }
      case 'starbloom': {
        const tw = 0.6 + 0.4 * Math.sin(time * 3 + x * 1.3), cx = sx + 8, cy = sy + 6, col = H2(x, y, 2846) < 0.5 ? '#fff0a0' : '#d8c8ff';
        g.fillStyle = '#5cc060'; g.fillRect(cx, cy + 2, 1, 8);
        g.globalAlpha = 0.35 * tw; g.fillStyle = col; g.beginPath(); g.arc(cx + 0.5, cy, 5, 0, 7); g.fill(); g.globalAlpha = 1;
        g.fillStyle = col; g.fillRect(cx - 1, cy - 3, 3, 7); g.fillRect(cx - 3, cy - 1, 7, 3); g.fillStyle = '#ffffff'; g.fillRect(cx, cy, 1, 1);
        return;
      }
      case 'skycrystal': {
        const C = [['#f4b8ff', '#ffe0ff', '#c078e0'], ['#a8e0ff', '#e0f4ff', '#6aaee0'], ['#c8b8ff', '#ece4ff', '#8a70d8']][Math.floor(H2(x, y, 2847) * 3)];
        [[3, 9, 3], [8, 13, 4], [12, 7, 3]].forEach(([ox, h, w]) => { const bx = sx + ox, by = sy + TS; g.fillStyle = INK; g.fillRect(bx - 1, by - h - 1, w + 2, h + 1); g.fillStyle = C[0]; g.fillRect(bx, by - h, w, h); g.fillStyle = C[1]; g.fillRect(bx, by - h, 1, h); g.fillStyle = C[2]; g.fillRect(bx + w - 1, by - h + 2, 1, h - 2); });
        return;
      }
    }
    return baseDecor.apply(this, arguments);
  };

  // ---- puffs on the cloud's open edges, so it looks like a cloud and not a wall of blocks ----
  const PUFF_OUT = '#b9b2dc', PUFF_SH = '#e2def4';
  const bTiles = WD.drawTiles;
  WD.drawTiles = function (g, cam, vw, vh, time) {
    const r = bTiles.apply(this, arguments);
    if (!fuzzyHere() || cam.y > 60 * TS) return r;
    try {
      const tx0 = Math.max(CL.X0 - 1, Math.floor(cam.x / TS)), tx1 = Math.min(CL.X1 + 1, Math.ceil((cam.x + vw) / TS)), ty0 = Math.max(0, Math.floor(cam.y / TS)), ty1 = Math.min(48, Math.ceil((cam.y + vh) / TS));
      const ox = -Math.round(cam.x), oy = -Math.round(cam.y), TL = RW.TILES;
      const isC = (x, y) => { const t = WD.get(x, y); return t === T_CLOUD || t === T_TURF; };
      const solid = (x, y) => TL[WD.get(x, y)].solid;
      const blob = (x, y, rr, fill, out) => { g.fillStyle = out; g.beginPath(); g.arc(x, y, rr + 1, 0, 7); g.fill(); g.fillStyle = fill; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); };
      // outlines first, then fills, so neighbouring puffs merge
      for (const pass of [0, 1]) for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
        const t = WD.get(x, y); if (t !== T_CLOUD) continue;
        const sx = x * TS + ox, sy = y * TS + oy, h = H2(x, y, 2851);
        const draw = (cx, cy, rr, fill) => { g.fillStyle = pass ? fill : PUFF_OUT; g.beginPath(); g.arc(cx, cy, rr + (pass ? 0 : 1), 0, 7); g.fill(); };
        if (!solid(x, y - 1)) { draw(sx + 4, sy + 4, 4 + (h > 0.5 ? 1 : 0), '#ffffff'); draw(sx + 12, sy + 3 + (h > 0.7 ? 1 : 0), 4.5, '#ffffff'); }
        if (!solid(x, y + 1)) { draw(sx + 5, sy + 11, 5, PUFF_SH); draw(sx + 12, sy + 12 + (h > 0.5 ? 1 : 0), 4.5, PUFF_SH); }
        if (!solid(x - 1, y)) draw(sx + 3, sy + 8, 5, solid(x, y + 1) ? '#f6f4ff' : PUFF_SH);
        if (!solid(x + 1, y)) draw(sx + 13, sy + 8, 5, solid(x, y + 1) ? '#f6f4ff' : PUFF_SH);
      }
      // tall things whose foot is just off screen still show
      const TALL = { giantbloom: 1, cottontree: 1, bigbloom: 1 }, bx0 = Math.floor(cam.x / TS), bx1 = Math.ceil((cam.x + vw) / TS), by0 = Math.floor(cam.y / TS), by1 = Math.ceil((cam.y + vh) / TS);
      for (let y = by0; y <= by1 + 7; y++) for (let x = bx0 - 4; x <= bx1 + 4; x++) {
        if (x >= bx0 && x <= bx1 && y <= by1) continue;
        const t = TL[WD.get(x, y)]; if (t.decor && TALL[t.decor]) A.drawDecor(g, t, x * TS + ox, y * TS + oy, time, 0, x, y);
      }
      // the meadow top and the cloud under it are the same cloud: no border line between them
      for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
        if (WD.get(x, y) !== T_TURF || WD.get(x, y + 1) !== T_CLOUD || !solid(x - 1, y) || !solid(x + 1, y) || !solid(x - 1, y + 1) || !solid(x + 1, y + 1)) continue;
        const sx = x * TS + ox, sy = y * TS + oy, tex = A.tiles[T_CLOUD][(x * 13 + y * 7) & 7];
        g.drawImage(tex, 0, 8, TS, 8, sx, sy + 8, TS, 8); g.drawImage(A.tiles[T_CLOUD][(x * 13 + (y + 1) * 7) & 7], 0, 0, TS, 8, sx, sy + TS, TS, 8);
      }
      void isC; void blob;
    } catch (e) { /* never stop the frame */ }
    return r;
  };

  // ======================= 6. SKY, RAINBOWS, FALLS, BUTTERFLIES =======================
  // how much the camera is up at the cloud (0 on the ground, 1 up there), and how far into the Starlit Isles
  const camAt = (cam, vw, vh) => { const cx = (cam.x + vw / 2) / TS, cy = (cam.y + vh / 2) / TS; return { cx, cy, up: clamp((62 - cy) / 18, 0, 1) * clamp(Math.min(cx - CL.X0 + 30, CL.X1 + 30 - cx) / 30, 0, 1), isle: clamp((cx - (CL.GX1 - 20)) / 30, 0, 1) }; };
  let lastCam = null;
  // fine weather up there, and twilight over the isles
  let origSky = null, skyFrames = 0, skyHooked = false;
  function hookSky() {
    const G = RW.game; if (!G || !G.sky) return;
    if (!origSky) origSky = G.sky;
    if (skyHooked || ++skyFrames < 3) return; skyHooked = true;
    const cur = G.sky;
    G.sky = function () {
      const s = cur.apply(this, arguments);
      try {
        if (!fuzzyHere() || !lastCam) return s;
        const k = lastCam.up; if (k <= 0) return s;
        const w = RW.v2weather || {};
        if ((w.cover || 0) > 0.3 || (w.dark || 0) > 0.02) { const o = origSky.apply(this, arguments), m = k * clamp(((w.cover || 0) - 0.2) * 2 + (w.dark || 0) * 4, 0, 1); ['top', 'bottom', 'mid'].forEach((f) => { if (s[f] && o[f]) s[f] = mix(s[f], o[f], m); }); s.light = s.light + (o.light - s.light) * m; }
        const iso = lastCam.isle * k; if (iso > 0 && !s.night) { s.top = mix(s.top, '#2c2470', iso * 0.8); s.bottom = mix(s.bottom, '#f0a0c8', iso * 0.6); if (s.mid) s.mid = mix(s.mid, '#c890d8', iso * 0.6); }
      } catch (e) { /* keep the sky */ }
      return s;
    };
  }
  const STARS = Array.from({ length: 70 }, (_, i) => [H2(i, 1, 2861), H2(i, 2, 2862), H2(i, 3, 2863)]);
  const bHills = WD.drawHills;
  WD.drawHills = function (g, cam, vw, vh, sky) {
    hookSky();
    const r = bHills.apply(this, arguments);
    if (!fuzzyHere()) return r;
    try {
      const c = lastCam = camAt(cam, vw, vh), ox = -Math.round(cam.x), oy = -Math.round(cam.y), time = performance.now() / 1000;
      // stars over the isles
      if (c.isle * c.up > 0.05 && sky && !sky.night) { g.fillStyle = '#ffffff'; STARS.forEach(([a, b, s]) => { const tw = 0.5 + 0.5 * Math.sin(time * (1 + s * 2) + a * 20); g.globalAlpha = c.isle * c.up * tw * 0.8; g.fillRect(Math.round(a * vw), Math.round(b * vh * 0.6), s > 0.8 ? 2 : 1, s > 0.8 ? 2 : 1); }); g.globalAlpha = 1; }
      // a great rainbow behind the grove (it moves a little slower than the land, so it feels far away)
      if (c.up > 0) {
        const p = 0.7, ccx = cam.x + vw / 2, ccy = cam.y + vh / 2, ax = vw / 2 + (472 * TS - ccx) * p, ay = vh / 2 + ((CL.Y0 + 9) * TS - ccy) * p, R0 = 26 * TS * p;
        g.globalAlpha = 0.36 * c.up; g.lineWidth = 5;
        RB.forEach((col, i) => { g.strokeStyle = col; g.beginPath(); g.arc(ax, ay, R0 - i * 5, Math.PI, Math.PI * 2); g.stroke(); });
        g.globalAlpha = 1; g.lineWidth = 1;
      }
      // the Rainbow Falls: seven colours pouring out of the gap in the grove down to the land below
      const F = WD.meta.cl.falls, fx0 = F.x0 * TS + ox + 3, fw = (F.x1 - F.x0 + 1) * TS - 6, fy0 = F.y * TS + oy + 6;
      const groundAt = (px) => (WD.skyTop[clamp(Math.floor((px - ox) / TS), 0, WD.W - 1)] || 90) * TS + oy, gy = groundAt(fx0 + fw / 2);
      if (fx0 < vw + 20 && fx0 + fw > -20 && fy0 < vh && gy > 0) {
        const bw = fw / RB.length, y0 = Math.max(-2, fy0);
        RB.forEach((col, i) => {
          const x = Math.round(fx0 + i * bw), w = Math.ceil(bw), edge = i === 0 || i === RB.length - 1, y1 = Math.min(vh + 4, Math.max(groundAt(x), groundAt(x + w - 1)) + 4);
          g.globalAlpha = edge ? 0.45 : 0.62; g.fillStyle = col; g.fillRect(x, y0, w, y1 - y0);
          // bright streaks flowing down each band
          g.fillStyle = '#ffffff';
          for (let yy = fy0 + ((time * 140 + i * 37) % 44) - 44; yy < y1; yy += 44) { if (yy + 14 < y0) continue; g.globalAlpha = 0.2; g.fillRect(x + (i % 2), Math.max(y0, Math.round(yy)), Math.max(1, w - 2), 14); }
        });
        g.globalAlpha = 0.7; g.fillStyle = '#ffffff';
        for (let k = 0; k < 30; k++) { const sx2 = Math.round(fx0 + H2(k, 1, 2864) * fw), yy = fy0 + ((time * 170 + k * 97) % Math.max(1, groundAt(sx2) - fy0)); if (yy < -4 || yy > vh + 4) continue; g.fillRect(sx2, Math.round(yy), 1, 5); }
        // mist where it leaves the cloud and where it lands
        g.globalAlpha = 0.5; g.fillStyle = '#ffffff';
        for (let k = 0; k < 7; k++) { const a = time * 1.5 + k; g.beginPath(); g.arc(fx0 + fw / 2 + Math.sin(a) * fw * 0.6, gy - 6 - Math.abs(Math.cos(a * 1.3)) * 8, 6 + (k % 3) * 2, 0, 7); g.fill(); }
        g.globalAlpha = 1;
        if (gy < vh + 10 && Math.random() < 0.5) RW.fx.spawn({ x: F.x0 * TS + 4 + Math.random() * fw, y: (WD.meta.surf[Math.round((F.x0 + F.x1) / 2)] || 90) * TS - 2, vx: RW.rand(-40, 40), vy: -RW.rand(30, 90), life: 0.8, color: RW.pick(RB), grav: 160, add: true, kind: 'glow' });
      }
    } catch (e) { /* never stop the frame */ }
    return r;
  };
  // butterflies and drifting petals up on the cloud (drawn over the land)
  const bugs = [];
  const bWater = WD.drawWater;
  WD.drawWater = function (g, cam, vw, vh, time) {
    // no rain, fog or blowing leaves up on the cloud
    const up = fuzzyHere() && lastCam && lastCam.up > 0.5 && onCloud();
    const keep = WD.backdropUnder; if (up) WD.backdropUnder = true;
    let r; try { r = bWater.apply(this, arguments); } finally { WD.backdropUnder = keep; }
    if (!fuzzyHere() || !lastCam || lastCam.up <= 0) { bugs.length = 0; return r; }
    try {
      const want = Math.round(16 * lastCam.up), dt = 1 / 60, ox = -Math.round(cam.x), oy = -Math.round(cam.y);
      while (bugs.length < want) { const isle = lastCam.isle > 0.5; bugs.push({ x: cam.x + Math.random() * vw, y: cam.y + Math.random() * vh, k: isle ? 2 : Math.random() < 0.55 ? 0 : 1, c: RW.pick(PET), ph: Math.random() * 7, vx: RW.rand(-12, 12) }); }
      for (let i = bugs.length - 1; i >= 0; i--) {
        const b = bugs[i]; b.ph += dt;
        if (b.k === 0) { b.x += (b.vx + Math.sin(b.ph * 1.3) * 18) * dt; b.y += Math.sin(b.ph * 2.1) * 14 * dt; }
        else if (b.k === 1) { b.x += (8 + Math.sin(b.ph) * 10) * dt; b.y += 12 * dt; }
        else { b.x += Math.sin(b.ph * 0.7) * 6 * dt; b.y += Math.cos(b.ph * 0.5) * 5 * dt; }
        const sx = Math.round(b.x + ox), sy = Math.round(b.y + oy);
        if (sx < -30 || sx > vw + 30 || sy < -30 || sy > vh + 30 || bugs.length > want + 2) { bugs.splice(i, 1); continue; }
        if (WD.solid(Math.floor(b.x / TS), Math.floor(b.y / TS))) { if (b.k === 1) { bugs.splice(i, 1); continue; } b.y -= 20 * dt; }
        if (b.k === 0) { const flap = Math.sin(b.ph * 16) > 0; g.fillStyle = b.c; g.fillRect(sx - (flap ? 3 : 2), sy - 1, flap ? 3 : 2, flap ? 3 : 2); g.fillRect(sx + 1, sy - 1, flap ? 3 : 2, flap ? 3 : 2); g.fillStyle = INK; g.fillRect(sx, sy - 1, 1, 3); }
        else if (b.k === 1) { g.fillStyle = b.c; g.fillRect(sx, sy, 2, 1); g.fillRect(sx + (Math.sin(b.ph * 3) > 0 ? 1 : 0), sy + 1, 1, 1); }
        else { const tw = 0.5 + 0.5 * Math.sin(b.ph * 4); g.globalAlpha = 0.4 + 0.6 * tw; g.fillStyle = '#fff6c0'; g.fillRect(sx, sy, 1, 1); g.globalAlpha = 0.25 * tw; g.fillRect(sx - 1, sy - 1, 3, 3); g.globalAlpha = 1; RW.fx.light(b.x, b.y, 0.25, 0.22, 0.1); }
      }
    } catch (e) { /* never stop the frame */ }
    return r;
  };

  // ======================= 7. GETTING UP AND DOWN =======================
  const F = () => (P.flags = P.flags || {});
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  function warp(tx, ty, msg) {
    P.x = tx * TS + (TS - P.w) / 2; P.y = (ty + 1) * TS - P.h; P.vx = P.vy = 0; P.invulnT = Math.max(P.invulnT || 0, 1.5);
    RW.cam.x = P.x - RW.view.w / 2; RW.cam.y = P.y - RW.view.h / 2;
    if (E.buddy) { E.buddy.x = P.x - 16; E.buddy.y = P.y; }
    if (E.pet) { E.pet.x = P.x + 14; E.pet.y = P.y; }
    RW.audio.sfx('rift'); RW.fx.flash && RW.fx.flash('#fff4c8', 0.5); RW.fx.ring(P.x + P.w / 2, P.y + P.h / 2, '#ffffff', 50, 0.6, 2);
    for (let k = 0; k < 24; k++) RW.fx.spawn({ x: P.x + P.w / 2 + RW.rand(-20, 20), y: P.y + P.h, vx: RW.rand(-60, 60), vy: -RW.rand(20, 80), life: 0.9, color: k % 3 ? '#ffffff' : RW.pick(RB), add: true, kind: 'glow' });
    if (msg) U.toast(msg); RW.game.saveSoon && RW.game.saveSoon();
  }
  function goUp() {
    const C = RW.world.meta.cl; warp(C.arrive.x, C.arrive.y);
    if (!F().cl_visited) { F().cl_visited = 1; U.banner('Cloudtop', 'A happy land on a cloud, high above Tuftwood.'); } else U.toast('Up you float, to Cloudtop.');
  }
  function goDown() { const m = RW.world.meta.portal; if (!m) return; warp(m.x + 2, m.y, 'Down you float, back to Tuftwood.'); }
  const nearTile = (id, r) => { const c = P.center(), tx = Math.floor(c.x / TS), ty = Math.floor(c.y / TS); for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) if (RW.world.get(x, y) === id) return true; return false; };
  // Tuftwood's town portal: go up to Cloudtop, or meet up with other players as before
  function portalMenu(meet) {
    U.openModal('pick');
    document.getElementById('pick-label').textContent = 'Town Portal';
    document.getElementById('pick-title').textContent = 'Where to?';
    const box = document.getElementById('picklist'); box.innerHTML = '';
    const up = el('button', 'btn small primary', 'Float up to Cloudtop, the land on the cloud'); up.type = 'button'; up.onclick = () => { U.closeModal(); goUp(); }; box.append(up);
    const m = el('button', 'btn small', 'Meet up with another player'); m.type = 'button'; m.onclick = () => { U.closeModal(); meet(); }; box.append(m);
    RW.audio.sfx('rift');
  }
  E.useHandlers = E.useHandlers || {};
  const bUseTP = E.useHandlers.townportal;
  E.useHandlers.townportal = function () { if (fuzzyHere() && !onCloud()) return portalMenu(() => bUseTP && bUseTP.apply(this, arguments)); return bUseTP && bUseTP.apply(this, arguments); };
  E.useHandlers.cloudportal = () => goDown();
  const bInteract = P.interact;
  P.interact = function () {
    if (fuzzyHere()) {
      if (nearTile(T_PORT, 2)) { goDown(); return; }
      if (RW.T.townportal != null && nearTile(RW.T.townportal, 2)) { const self = this, args = arguments; portalMenu(() => bInteract.apply(self, args)); return; }
    }
    return bInteract.apply(this, arguments);
  };
  const bMine = P.mineTile;
  P.mineTile = function (tx, ty) { const t = RW.world.get(tx, ty); if (t === T_PORT || t === T_FOUNT || t === T_GIANT) { P.mine = null; return; } return bMine.apply(this, arguments); };

  // ---- falling off the cloud never hurts: a little cloud catches you ----
  let cloudT = 0, caught = false;
  const bUpd = P.update;
  P.update = function (dt) {
    const r = bUpd.apply(this, arguments);
    try {
      if (!fuzzyHere() || P.dead) { caught = false; return r; }
      const c = P.center(), tx = Math.floor(c.x / TS), ty = Math.floor(c.y / TS);
      if (inBand(tx, ty)) cloudT = 3; else cloudT = Math.max(0, cloudT - dt);
      const below = tx >= CL.X0 - 4 && tx <= CL.X1 + 4 && ty > 20 && ty < (WD.meta.surf[clamp(tx, 0, WD.W - 1)] || 999) - 1;
      if ((cloudT > 0 || caught) && below && P.vy > 80 && !P.ground && !P.water) {
        if (!caught) { caught = true; if (!F().cl_caught) { F().cl_caught = 1; U.toast('A little cloud catches you and floats you gently down.'); } }
        P.vy = Math.min(P.vy, 80);
        if (Math.random() < dt * 20) RW.fx.spawn({ x: c.x + RW.rand(-8, 8), y: P.y + P.h + 2, vx: RW.rand(-15, 15), vy: RW.rand(-5, 10), life: 0.6, color: '#ffffff', size: 3, kind: 'smoke' });
      }
      if (P.ground || P.water) caught = false;
    } catch (e) { /* keep playing */ }
    return r;
  };
  // tell people at Tuftwood's portal that it goes up now
  let tipT = 0;
  const bUpdN = E.updateNpcs;
  E.updateNpcs = function (dt) {
    const r = bUpdN.apply(this, arguments);
    try {
      if ((tipT -= dt) <= 0 && fuzzyHere()) {
        tipT = 1; const m = RW.world.meta.portal;
        if (m && !F().cl_tip && RW.dist(P.x, P.y, m.x * TS, m.y * TS) < 5 * TS) { F().cl_tip = 1; setTimeout(() => U.toast('The town portal shimmers with sky-light. Press R beside it to float up to the cloud.'), 3500); }
      }
    } catch (e) { /* keep playing */ }
    return r;
  };

  // ======================= 8. THE CLOUD FOLK AT HOME =======================
  const bInit = E.initNpcs;
  E.initNpcs = function () {
    const r = bInit.apply(this, arguments);
    if (!fuzzyHere()) return r;
    const M = RW.world.meta.cl;
    NPC.forEach(([id, , , , [w, h]]) => { const p = M.npcs[id]; if (!p) return; E.npcs.push({ id, x: p[0] * TS + (TS - w) / 2, y: (p[1] + 1) * TS - h, w, h, home: p[0] * TS + (TS - w) / 2, face: -1, t: Math.random() * 4, vx: 0, vy: 0 }); });
    return r;
  };
  const LINES = {
    cl_donut: ['Hello hello! Fresh donuts! Well. Fresh donut. Me. I\'m the donut.', 'The secret is the petals. Sky Petals make the best sprinkles.', 'Do NOT ask what\'s in the middle of me. Nothing. There\'s nothing. It\'s a hole.'],
    cl_tippy: ['Welcome to Cloudtop! *waves both flags*', 'West is Bloomfield Meadows: flowers, flowers, flowers. East is the Candyfloss Grove, and past it the Starlit Isles.', 'If you fall off, don\'t worry. The cloud always catches you. Always! I fell off nine times yesterday.', 'The portal by me takes you back down to Tuftwood. The one down there brings you back up.'],
    cl_nimbus: ['Welcome, welcome! I am Mayor Nimbus. Everything in Puffton is soft, including the rules.', 'It never rains on Cloudtop. We are the rain\'s upstairs neighbours.', 'Have you seen the Rainbow Falls in the grove? They pour all the way down to the ground. Very good for the flowers down there.'],
    cl_inch: ['Did you know Cloudtop is exactly four hundred and eighty blocks long? I measured. Twice.', 'You are about one and three-quarter blocks tall. Lovely height.', 'Bring me a Rainbow Shard and I\'ll stretch it into a bridge. Ten pieces long. I measured.'],
    cl_doorley: ['Hello there! Come in, come in. Well, you\'re already standing in front of me. Close enough.', 'Mind the moustache. I comb it every morning.', 'Rooms are free. I\'m the rooms.'],
    cl_bloom_pink: ['Hello!', 'Hello! Hello!', 'Hello! I like your face.'],
    cl_bloom_yellow: ['Hello! Is it sunny? It\'s always sunny. Hello!', 'I follow the sun around all day. My neck hurts. I don\'t have a neck.'],
    cl_bloom_lilac: ['Hello! There\'s no ground under the cloud. That\'s just a story.', 'Hello! The giant blooms are our grandmas.'],
    cl_bloom_peach: ['Hello! The trees here taste like candy. Don\'t tell them I told you.', 'Hello! The Scribbles live out past the grove. They\'re scribbly.'],
  };
  function talk(npc) {
    const sp = RW.SPECIES[npc.id]; U.openModal('talk');
    const box = document.getElementById('talk'); box.querySelector('.who').textContent = sp.name;
    try { U.portrait(box.querySelector('canvas'), npc.id); } catch (e) { /* no portrait is fine */ }
    const says = box.querySelector('.says'), acts = box.querySelector('.acts'), extra = box.querySelector('.extra');
    acts.innerHTML = ''; extra.innerHTML = '';
    const btn = (t, fn, primary) => { const b = el('button', 'btn small' + (primary ? ' primary' : ''), t); b.type = 'button'; b.onclick = fn; acts.append(b); return b; };
    const f = F(); let line = RW.pick(LINES[npc.id] || ['Hello!']);
    const done = (title, sub) => { U.banner(title, sub); RW.audio.sfx('crystal'); U.dirty && U.dirty(); talk(npc); };
    if (npc.id === 'cl_nimbus') {
      const n = f.cl_scrib || 0;
      if (!f.cl_mayor) { line = 'Two Scribbles have floated over to the Starlit Isles, east past the grove. They scribble on the stars! Could you calm them down? Bop them until they puff away. They come back after a while, but it helps.'; btn('I\'ll calm them down', () => { f.cl_mayor = 1; f.cl_scrib = 0; U.toast('Calm the two Scribbles in the Starlit Isles, east of the Candyfloss Grove.'); U.closeModal(); }, true); }
      else if (f.cl_mayor === 1) {
        line = n >= 2 ? 'The stars are clean again! Thank you, thank you.' : 'The Scribbles are out in the Starlit Isles. ' + (n ? 'One down, one to go! ' : '') + 'Hit them when they\'re dizzy after a dash.';
        if (n >= 2) btn('Tell the Mayor', () => { f.cl_mayor = 2; P.add('coin', 80); P.add('star_ember', 1); P.add('key_fragment', 1); P.add('rainbow_bridge', 10); done('Mayor Nimbus is delighted', '80 rupees, a Star Ember, a Key Fragment and ten pieces of Rainbow Bridge.'); }, true);
      }
    }
    if (npc.id === 'cl_donut') {
      if (!f.cl_donut) { line = 'A new face! Here, have a donut. On the house. Well, on the donut.'; btn('Thank you!', () => { f.cl_donut = 1; P.add('sprinkle_donut', 1); done('A Sprinkle Donut', 'Pink icing. Petal sprinkles. Heals a lot.'); }, true); }
      else if (P.count('sky_petal') >= 5) btn('Trade 5 Sky Petals for 2 donuts', () => { P.remove('sky_petal', 5); P.add('sprinkle_donut', 2); done('Two Sprinkle Donuts', 'Still warm.'); }, true);
      else line += ' (Bring me 5 Sky Petals and I\'ll bake you two donuts. Flowers drop them.)';
    }
    if (npc.id === 'cl_inch' && P.count('rainbow_shard') >= 1) btn('Stretch a Rainbow Shard', () => { P.remove('rainbow_shard', 1); P.add('rainbow_bridge', 10); done('Ten pieces of Rainbow Bridge', 'Exactly ten. Inchworth measured.'); }, true);
    if (npc.id === 'cl_doorley') btn('Rest a while', () => { P.hp = P.maxHp(); if (P.mana != null && P.maxMana) P.mana = P.maxMana(); RW.fx.text(P.center().x, P.y - 6, 'rested', '#8dff8a'); U.toast('You nap in Mr. Doorley\'s cosiest room. You feel brand new.'); U.dirty && U.dirty(); U.closeModal(); });
    says.textContent = line;
    if (sp.blurb) extra.append(el('div', 'label', sp.blurb));
    btn('Goodbye', () => U.closeModal());
  }
  const bTalk = U.talk;
  U.talk = function (npc) { if (npc && /^cl_/.test(npc.id)) return talk(npc); return bTalk.apply(this, arguments); };

  // ======================= 9. THE SCRIBBLES =======================
  // They float about their island. When you come near one shivers (the warning), then dashes at you in a zigzag,
  // leaving a scribbled trail. After a dash it's dizzy for a moment and takes extra damage: hit it then.
  const ec = E.center || ((e) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 }));
  E.behaviors.cl_scribble = function (e, dt, sp) {
    const pc = P.center(), c = ec(e); e.cs = e.cs || 'float'; e.ct = (e.ct || 0) - dt; e.tt = (e.tt || 0) + dt;
    const hx = (e.hx != null ? e.hx : c.x), hy = (e.hy != null ? e.hy : c.y); if (e.hx == null) { e.hx = hx; e.hy = hy; }
    const d = RW.dist(pc.x, pc.y, c.x, c.y);
    if (e.cs === 'float') {
      e.harmless = false;
      const gx = hx + Math.sin(e.tt * 0.7) * 50, gy = hy + Math.sin(e.tt * 1.3) * 14;
      e.vx = RW.lerp(e.vx || 0, (gx - c.x) * 1.5, dt * 3); e.vy = RW.lerp(e.vy || 0, (gy - c.y) * 1.5, dt * 3);
      if (!P.dead && d < 11 * TS && (e.atkT = (e.atkT == null ? 1.5 : e.atkT) - dt) <= 0) { e.cs = 'wind'; e.ct = 0.7; e.face = Math.sign(pc.x - c.x) || 1; RW.fx.text(c.x, e.y - 8, '!', '#ff7ab8', true); }
      if (Math.abs(e.vx) > 5) e.face = Math.sign(e.vx);
    } else if (e.cs === 'wind') {
      e.vx *= 0.8; e.vy *= 0.8; e.x += RW.rand(-1, 1);
      if (e.ct <= 0) { const a = Math.atan2(pc.y - c.y, pc.x - c.x); e.dx = Math.cos(a); e.dy = Math.sin(a); e.cs = 'dash'; e.ct = 0.85; RW.audio.sfx('bow'); }
    } else if (e.cs === 'dash') {
      const z = Math.sin(e.ct * 30) * 160;
      e.vx = e.dx * sp.speed - e.dy * z; e.vy = e.dy * sp.speed + e.dx * z; e.face = Math.sign(e.dx) || e.face;
      if (Math.random() < dt * 40) RW.fx.spawn({ x: c.x, y: c.y, vx: 0, vy: 0, life: 0.7, color: Math.random() < 0.3 ? '#ff7ab8' : '#4a3866', size: 2 });
      if (e.ct <= 0) { e.cs = 'dizzy'; e.ct = 1.4; }
    } else {
      e.harmless = true; e.vx *= Math.pow(0.05, dt); e.vy = e.vy * Math.pow(0.05, dt) + Math.sin(e.tt * 5) * 6;
      if (Math.random() < dt * 8) RW.fx.spawn({ x: c.x + Math.cos(e.tt * 9) * 14, y: e.y - 4 + Math.sin(e.tt * 9) * 4, vx: 0, vy: -8, life: 0.4, color: '#ffe680', add: true, kind: 'glow' });
      if (e.ct <= 0) { e.cs = 'float'; e.atkT = 1.6 + Math.random() * 1.2; }
    }
    // never wander far from home
    const away = RW.dist(c.x, c.y, hx, hy); if (away > 16 * TS && e.cs !== 'dash') { e.vx += (hx - c.x) * dt * 2; e.vy += (hy - c.y) * dt * 2; }
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.frame = Math.floor(e.tt * (e.cs === 'wind' || e.cs === 'dash' ? 16 : 7)) % 4;
  };
  const bDamage = E.damage;
  E.damage = function (e, d) { if (e && e.sp === 'cl_scribble' && e.cs === 'dizzy') arguments[1] = Math.round(d * 1.6); return bDamage.apply(this, arguments); };
  const scribKey = (i) => 'cl_scrib_' + i;
  let scT = 0;
  const bUpdE = E.updateEnemies;
  E.updateEnemies = function (dt) {
    const r = bUpdE.apply(this, arguments);
    if ((scT -= dt) > 0 || !fuzzyHere() || P.dead) return r; scT = 1;
    try {
      const c = P.center(), tx = c.x / TS, ty = c.y / TS; if (tx < CL.GX1 - 30 || tx > CL.X1 + 30 || ty > 60) return r;
      RW.world.meta.cl.homes.forEach((h, i) => {
        if (E.enemies.some((e) => !e.dead && e.sp === 'cl_scribble' && e.slot === i)) return;
        if (Date.now() - RW.store.get(scribKey(i), 0) < 8 * 60 * 1000) return;   // a calmed Scribble comes back after 8 minutes
        const sp = RW.SPECIES.cl_scribble, e = E.spawnEnemy('cl_scribble', h.x * TS - sp.w / 2, h.y * TS - sp.h / 2);
        if (e) { e.slot = i; e.hx = h.x * TS; e.hy = h.y * TS; }
      });
    } catch (e) { /* keep playing */ }
    return r;
  };
  const bKill = E.kill;
  E.kill = function (e) {
    if (e && e.sp === 'cl_scribble' && !e._clDone) {
      e._clDone = true; if (e.slot != null) RW.store.set(scribKey(e.slot), Date.now());
      const f = F(); f.cl_scrib = (f.cl_scrib || 0) + 1;
      const c = ec(e); for (let k = 0; k < 30; k++) RW.fx.spawn({ x: c.x, y: c.y, vx: RW.rand(-120, 120), vy: RW.rand(-120, 80), life: 0.9, color: RW.pick(RB), add: true, kind: 'glow' });
      U.toast(f.cl_mayor === 1 && f.cl_scrib >= 2 ? 'Both Scribbles are calm. Tell Mayor Nimbus!' : 'The Scribble puffs into a little rainbow.');
    }
    return bKill.apply(this, arguments);
  };
})(window.RW);
