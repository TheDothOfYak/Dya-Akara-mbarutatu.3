// 4 Brothers World V3 — part 3: a new, much bigger Rock World (1280 x 700), different in every world.
//  * Each Rock World rolls its own layout from a seed kept in this browser. A friend who joins your room gets your
//    seed with the world, so you both stand in the same caves. Block changes are kept per seed (def.store
//    'rockv3_<seed>'), so the old 640 x 420 Rock World's changes are set aside, not lost.
//  * Layers: sky, the open sea (no rock stacks poking out), the upper crust (winding dry caves and your home cave),
//    the cavern band (Stalagmere, 3 to 5 other towns with cave names, the Crystal Forest and wild caverns, each with a
//    pool), the water tubes wrapped round the vast flooded Heart Chamber, deep veins, the shell core.
//  * Getting down is vertical: shafts with ledges and a chain to climb drop from the crust into every cavern, from
//    your home cave straight into Stalagmere, and from the crust down to the Heart Chamber. Water-filled drains run
//    from the cavern pools down into the tubes.
//  * Caverns are open: slim stalagmites rise from the floor and slim stalactites hang high from the roof, and both carry
//    farms (soil ledges with mushrooms, moss, lichen and crystal sprouts). Stalagmere keeps its people, its hanging
//    houses and Slagg's forge, plus a chest of the worst tools there are, to get a new rock started.
//  * The other modules' extras for Rock World (town portal, Duat Stone, legendary and old chests, the golden boss
//    chest) are placed again on the new layout.
(function (RW) {
  'use strict';
  const def = RW.WORLDS && RW.WORLDS.rock, N = RW.net;
  if (!def || !def.generate) return;
  const W = 1280, H = 700, SEA = 70;
  const CAV0 = 210, CAV1 = 432, TUBE0 = 440, TUBE1 = 566;

  // ---------------- new tiles ----------------
  function addTile(o) { const id = RW.TILES.length; o.id = id; RW.TILES.push(o); RW.T[o.key] = id; return id; }
  if (RW.T.starterchest == null) addTile({ key: 'starterchest', name: 'Starter Chest', solid: true, hard: 1, time: 0.6, decor: 'chest', loot: 'v2starter' });
  RW.LOOT.v2starter = [['flint_pick', 1, 1, 1], ['flint_handaxe', 1, 1, 1], ['wood_sword', 1, 1, 1], ['wood_spear', 1, 1, 1], ['torch', 3, 3, 1], ['cave_moss', 2, 2, 1]];

  // ---------------- the seed ----------------
  const localSeed = () => {
    let s = RW.store.get('v2_rockseed', 0) | 0;
    if (!s) { s = 1 + Math.floor(Math.random() * 2147483000); RW.store.set('v2_rockseed', s); }
    return s;
  };
  RW.v2rockSeed = () => (N && N.transport === 'p2p' && !N.isHost && RW.v2rockSeedHost ? RW.v2rockSeedHost : localSeed());
  let L = null; // the layout of the last world made: caverns, towns, chamber (zoneAt and ambientAt read it)

  // ---------------- cave names ----------------
  const NAME_A = ['Gloom', 'Shale', 'Quartz', 'Ember', 'Basalt', 'Grot', 'Echo', 'Drip', 'Flint', 'Geode', 'Mica', 'Slate', 'Cinder', 'Moss', 'Lantern', 'Hollow', 'Gneiss', 'Agate', 'Feldspar', 'Murk', 'Ochre', 'Pumice', 'Garnet', 'Tallow'];
  const NAME_B = ['hollow', 'mere', 'delve', 'vault', 'crag', 'burrow', 'grotto', 'deep', 'reach', 'well', 'spire', 'nook', 'cairn', 'drop', 'hearth', 'rest', 'mouth', 'pit', 'gallery', 'den'];

  // ================================= THE GENERATOR =================================
  function build(seed) {
    const T = RW.T, WL = RW.W;
    const fg = new Uint8Array(W * H), bg = new Uint8Array(W * H);
    const rng = RW.seeded(seed);
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const rr = (a, b) => a + rng() * (b - a);
    const meta = { carvings: {}, special: {}, waterfalls: [], npcs: {}, secrets: [], ward: [], towns: [], caverns: [], shafts: [] };
    const I = (x, y) => y * W + x;
    const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const set = (x, y, t) => { if (ok(x, y)) fg[I(x, y)] = t; };
    const get = (x, y) => (ok(x, y) ? fg[I(x, y)] : T.bedrock);
    const setb = (x, y, w) => { if (ok(x, y)) bg[I(x, y)] = w; };
    const getb = (x, y) => (ok(x, y) ? bg[I(x, y)] : 0);
    const solid = (x, y) => !!RW.TILES[get(x, y)].solid;
    const Nz = (x, y, s, o) => RW.fbm(x, y, s + (seed % 100000), o);
    const hh = (x, y, s) => RW.hash2(x, y, s + (seed % 99991));
    const disc = (cx, cy, r, t, onlyIf) => {
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r && ok(x, y) && (!onlyIf || onlyIf(get(x, y), x, y))) set(x, y, t);
      }
    };
    const natural = (t) => t === T.stone || t === T.deepstone || t === T.gravel || t === T.flint || t === T.mossstone || t === T.lichenstone || t === T.iron || t === T.bronze || t === T.platinum || t === T.stygian_cold || t === T.seasand;

    // ---------- 1. sea, sea floor, rock ----------
    const floorY = new Int16Array(W);
    const trench = [rr(100, 400), rr(500, 800), rr(880, 1180)];
    for (let x = 0; x < W; x++) {
      let f = 128 + (Nz(x / 60, 0.5, 3, 3) - 0.5) * 40 + (Nz(x / 14, 2.5, 4, 2) - 0.5) * 9;
      trench.forEach((tx) => { const d = (x - tx) / 26; f += Math.exp(-d * d) * 18; });
      floorY[x] = Math.round(RW.clamp(f, 100, 165));
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let t;
      if (y < SEA) t = T.air;
      else if (y < floorY[x]) t = T.water;
      else if (y < floorY[x] + 3) t = T.seasand;
      else if (y < TUBE0 - 4) t = T.stone;
      else t = T.deepstone;
      set(x, y, t);
      if (y >= floorY[x] + 2) setb(x, y, y >= TUBE0 - 4 ? WL.deep : WL.cave);
    }

    // ---------- 2. upper crust: winding dry caves ----------
    const CR0 = 172, CR1 = CAV0 - 4;
    for (let y = CR0; y < CR1; y++) for (let x = 3; x < W - 3; x++) {
      if (y < floorY[x] + 12) continue;
      const n = Nz(x / 34, y / 12, 11, 4), n2 = Nz(x / 11, y / 8, 21, 2);
      if (n > 0.62 || (n > 0.56 && n2 > 0.64)) set(x, y, T.air);
    }
    const worm = (x, y, ang, len, r, y0, y1, vb) => {
      for (let i = 0; i < len; i++) {
        disc(x, y, r + Math.sin(i * 0.21) * 0.7, T.air, (t) => t !== T.bedrock && t !== T.water);
        ang += (rng() - 0.5) * 0.34; x += Math.cos(ang); y += Math.sin(ang) * (vb || 0.4);
        if (y < y0) { y = y0; ang = Math.abs(ang); } if (y > y1) { y = y1; ang = -Math.abs(ang); }
        x = RW.clamp(x, 5, W - 6);
      }
    };
    for (let i = 0; i < 18; i++) worm(rr(10, W - 10), rr(CR0 + 4, CR1 - 3), rng() * 6.28, rr(80, 200), rr(1.4, 2.4), CR0 + 2, CR1 - 2);
    worm(12, (CR0 + CR1) / 2, 0, 1300, 2.2, CR0 + 3, CR1 - 3, 0.22); // one long dry gallery so the crust links up end to end

    // ---------- 3. the cavern band ----------
    const cav = [];
    const fits = (c) => c.cx - c.rx > 20 && c.cx + c.rx < W - 20 && cav.every((o) => { const dx = (c.cx - o.cx) / (c.rx + o.rx + 22), dy = (c.cy - o.cy) / (c.ry + o.ry + 14); return dx * dx + dy * dy > 1; });
    const place = (kind, rx, ry, tries, xr) => {
      for (let k = 0; k < (tries || 400); k++) {
        const c = { kind, rx, ry, cx: Math.round(xr ? rr(xr[0], xr[1]) : rr(40 + rx, W - 40 - rx)), cy: Math.round(rr(CAV0 + ry + 4, CAV1 - ry - 4)) };
        if (fits(c)) { cav.push(c); return c; }
      }
      return null;
    };
    const VIL = place('village', 104, 60, 800, [300, 980]) || (cav.push({ kind: 'village', cx: 640, cy: 320, rx: 104, ry: 60 }), cav[cav.length - 1]); // about 100 blocks floor to roof
    const CRY = place('crystal', 92, 56, 800) || place('crystal', 70, 46, 800);
    const nTowns = ri(3, 5), names = new Set(['Stalagmere']);
    for (let i = 0; i < nTowns; i++) {
      const c = place('town', ri(64, 82), ri(40, 50), 600) || place('town', 52, 36, 600); if (!c) continue;
      let nm; for (let k = 0; k < 30; k++) { nm = NAME_A[ri(0, NAME_A.length - 1)] + NAME_B[ri(0, NAME_B.length - 1)]; if (!names.has(nm)) break; }
      names.add(nm); c.name = nm; c.zone = 'town' + meta.towns.length; meta.towns.push(c);
    }
    for (let i = 0; i < 8; i++) place('wild', ri(36, 66), ri(26, 42), 300);
    // carve them: noisy walls, a pool in the low part
    cav.forEach((c, ci) => {
      const wall = c.kind === 'crystal' ? WL.crystal : WL.cave;
      for (let y = c.cy - c.ry - 6; y <= c.cy + c.ry + 6; y++) for (let x = c.cx - c.rx - 8; x <= c.cx + c.rx + 8; x++) {
        if (!ok(x, y)) continue;
        const dx = (x - c.cx) / c.rx, dy = (y - c.cy) / (y < c.cy ? c.ry * 1.08 : c.ry);
        const edge = 1 + (Nz(x / 8, y / 7, 31 + ci * 7, 2) - 0.5) * 0.24;
        const d = dx * dx + dy * dy;
        if (d < edge) { set(x, y, T.air); setb(x, y, wall); }
        else if (c.kind === 'crystal' && d < edge + 0.35 && get(x, y) === T.stone && hh(x, y, 5) < 0.55) set(x, y, T.crystalblock);
      }
      // a gently rolling floor, so the bottom is walkable instead of a bowl
      const fl = (x) => Math.round(c.cy + c.ry * 0.62 + (Nz(x / 18, 3.3 + ci, 71, 3) - 0.5) * 10);
      for (let x = c.cx - c.rx - 8; x <= c.cx + c.rx + 8; x++) for (let y = fl(x); y <= c.cy + c.ry + 6; y++) if (get(x, y) === T.air) set(x, y, c.kind === 'crystal' && y < fl(x) + 2 ? T.crystalblock : T.stone);
      c.floor = fl;
      c.water = Math.round(c.cy + c.ry * 0.5);
      meta.caverns.push({ kind: c.kind, cx: c.cx, cy: c.cy, rx: c.rx, ry: c.ry, name: c.name || null, zone: c.zone || null });
    });

    // ---------- 4. the water tubes and the Heart Chamber ----------
    const CORE = { cx: Math.round(rr(470, 810)), cy: 503, rx: 214, ry: 50 };
    const tube = (x, y, ang, len, r) => {
      for (let i = 0; i < len; i++) {
        disc(x, y, r, T.water, (t) => t !== T.bedrock);
        for (let k = -r - 1; k <= r + 1; k++) setb(Math.round(x), Math.round(y + k), WL.deep);
        ang += (rng() - 0.5) * 0.18; x += Math.cos(ang); y += Math.sin(ang) * 0.35;
        if (y < TUBE0 + 4) { y = TUBE0 + 4; ang = Math.abs(ang) * 0.5; } if (y > TUBE1 - 4) { y = TUBE1 - 4; ang = -Math.abs(ang) * 0.5; }
        if (x < 8 || x > W - 8) { ang = Math.PI - ang; x = RW.clamp(x, 8, W - 8); }
      }
    };
    for (let i = 0; i < 16; i++) tube(rr(20, W - 20), TUBE0 + 6 + i * 7, rng() < 0.5 ? 0 : Math.PI, rr(300, 600), rr(2.2, 3.6));
    for (let y = CORE.cy - CORE.ry - 5; y <= CORE.cy + CORE.ry + 5; y++) for (let x = CORE.cx - CORE.rx - 5; x <= CORE.cx + CORE.rx + 5; x++) {
      const dx = (x - CORE.cx) / CORE.rx, dy = (y - CORE.cy) / CORE.ry;
      if (dx * dx + dy * dy < 1 + (Nz(x / 11, y / 7, 51, 2) - 0.5) * 0.1) { set(x, y, T.water); setb(x, y, WL.deep); } // flooded to the roof
    }
    // deep veins
    const vein = (x, y, ang, len, r) => {
      for (let i = 0; i < len; i++) {
        disc(x, y, r, T.water, (t) => t !== T.bedrock);
        for (let k = -r - 1; k <= r + 1; k++) setb(Math.round(x), Math.round(y + k), WL.deep);
        ang += (rng() - 0.5) * 0.3; x += Math.cos(ang); y += Math.sin(ang) * 0.5;
        if (y < TUBE1 + 4) { y = TUBE1 + 4; ang = Math.abs(ang) * 0.5; } if (y > H - 20) { y = H - 20; ang = -Math.abs(ang) * 0.5; }
        if (x < 8 || x > W - 8) { ang = Math.PI - ang; x = RW.clamp(x, 8, W - 8); }
      }
    };
    for (let i = 0; i < 14; i++) vein(rr(20, W - 20), rr(TUBE1 + 8, H - 30), rng() * 6.28, rr(180, 360), rr(1.3, 2.2));
    // dry pockets above the tubes (ember crawler nests)
    for (let i = 0; i < 14; i++) {
      const px = rr(30, W - 30), py = rr(TUBE0 + 4, TUBE0 + 70);
      for (let y = py - 4; y <= py + 3; y++) for (let x = px - 9; x <= px + 9; x++) {
        const X = Math.round(x), Y = Math.round(y), dx = (x - px) / 9, dy = (y - py) / 4;
        if (dx * dx + dy * dy < 1 && ok(X, Y) && get(X, Y) !== T.water) { set(X, Y, T.air); setb(X, Y, WL.deep); }
      }
    }

    // ---------- 5. the shell ----------
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (y >= H - 8 || x < 2 || x >= W - 2) set(x, y, T.bedrock);
    for (let x = 0; x < W; x++) for (let y = H - 14; y < H - 8; y++) if (Nz(x / 6, y / 3, 61, 2) > 0.45 && get(x, y) !== T.water) set(x, y, T.bedrock);

    // ---------- 6. the Heart Chamber's insides ----------
    const nIsl = 7;
    for (let k = 0; k < nIsl; k++) {
      const ix = Math.round(CORE.cx - CORE.rx * 0.78 + (CORE.rx * 1.56) * (k / (nIsl - 1))), top = CORE.cy + 22 + (k % 2) * 4 + ri(-2, 2);
      for (let y = top; y < CORE.cy + CORE.ry + 3; y++) { const w = 2 + (y - top) * 0.4; for (let x = Math.round(ix - w); x <= ix + w; x++) if (ok(x, y) && get(x, y) === T.water) set(x, y, y === top ? T.crystalblock : T.spire); }
      set(ix, top - 1, [T.c_red, T.c_blue, T.c_purple, T.c_green][k % 4]);
    }
    const alcove = (x0, y0, w, h, crystalTile) => {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { set(x, y, T.air); setb(x, y, WL.crystal); }
      for (let x = x0; x < x0 + w; x++) set(x, y0 + h, T.crystalblock);
      set(Math.round(x0 + w / 2), y0 + h - 1, crystalTile);
    };
    const ward = (x, y) => { set(x, y, T.ward); meta.ward.push([x, y]); };
    const lx = CORE.cx - CORE.rx - 12, rx2 = CORE.cx + CORE.rx + 3;
    alcove(lx, CORE.cy - 4, 9, 6, T.c_fire);
    for (let y = CORE.cy - 4; y < CORE.cy + 2; y++) for (let x = lx + 9; x < CORE.cx - CORE.rx + 6; x++) ward(x, y);
    alcove(rx2, CORE.cy - 4, 9, 6, T.c_poison);
    for (let y = CORE.cy - 4; y < CORE.cy + 2; y++) for (let x = CORE.cx + CORE.rx - 6; x < rx2; x++) ward(x, y);
    alcove(CORE.cx - 4, CORE.cy - CORE.ry - 13, 9, 6, T.c_light);
    for (let y = CORE.cy - CORE.ry - 7; y < CORE.cy - CORE.ry + 3; y++) for (let x = CORE.cx - 4; x < CORE.cx + 5; x++) ward(x, y);
    for (let a = 0; a < 320; a++) {
      const ang = rng() * Math.PI * 2, x = Math.round(CORE.cx + Math.cos(ang) * (CORE.rx - 1)), y = Math.round(CORE.cy + Math.sin(ang) * (CORE.ry - 1));
      if (get(x, y) === T.water && y < CORE.cy + 30) { const r = rng(); set(x, y, r < 0.05 ? T.c_gold : r < 0.3 ? T.c_red : r < 0.55 ? T.c_blue : r < 0.78 ? T.c_purple : T.c_green); }
    }
    // the roof is studded with crystal stalactites (the Leviathan brings them down when it slams the walls)
    meta.roofSpikes = [];
    for (let x = CORE.cx - CORE.rx + 20; x < CORE.cx + CORE.rx - 20; x += ri(9, 16)) {
      let y = CORE.cy - CORE.ry; while (y < CORE.cy && get(x, y) !== T.water) y++;
      const len = ri(3, 7); for (let k = 0; k < len; k++) { const w = Math.max(0, Math.round((len - k) * 0.25)); for (let dx = -w; dx <= w; dx++) if (get(x + dx, y + k) === T.water) set(x + dx, y + k, k === len - 1 ? T.crystalblock : T.spire); }
      meta.roofSpikes.push({ x, y: y + len });
    }
    { const ix = CORE.cx + 14, iy = CORE.cy + 24; if (get(ix, iy) === T.water) { meta.carvings[ix + ',' + iy] = 2; set(ix, iy, T.tablet); set(ix, iy + 1, T.spire); } }
    meta.arena = CORE; meta.riftAt = { x: CORE.cx, y: CORE.cy + 6 };

    // ---------- 7. ores, flint, gravel ----------
    const blob = (cx, cy, r, tile, allow) => disc(cx, cy, r, tile, (t) => allow.includes(t));
    for (let i = 0; i < 11000; i++) {
      const x = 3 + Math.floor(rng() * (W - 6)), y = 150 + Math.floor(rng() * (H - 160)); const r = rng(); const t = get(x, y);
      if (t !== T.stone && t !== T.deepstone) continue;
      if (y < CAV1 && r < 0.30) blob(x, y, 1.2 + rng() * 1.6, T.gravel, [T.stone]);
      else if (y < CAV1 + 10 && r < 0.48) blob(x, y, 0.8 + rng() * 0.8, T.flint, [T.stone]);
      else if (y > 210 && y < 520 && r < 0.66) blob(x, y, 1 + rng() * 1.3, T.iron, [T.stone, T.deepstone]);
      else if (y > 380 && y < 600 && r < 0.78) blob(x, y, 0.9 + rng() * 1.2, T.bronze, [T.stone, T.deepstone]);
      else if (y > 500 && r < 0.86) blob(x, y, 0.8 + rng() * 1.0, T.platinum, [T.deepstone]);
      else if (y > 560 && r < 0.875) blob(x, y, 0.7, T.stygian_cold, [T.deepstone]);
    }
    for (let y = TUBE0; y < H - 10; y++) for (let x = 4; x < W - 4; x++) {
      if (get(x, y) !== T.water || !solid(x, y + 1) || get(x, y + 1) === T.bedrock) continue;
      const dx = (x - CORE.cx) / CORE.rx, dy = (y - CORE.cy) / CORE.ry; if (dx * dx + dy * dy < 1.05) continue;
      const h = hh(x, y, 977);
      if (h < 0.05) { const r = hh(y, x, 978); set(x, y, r < 0.05 ? T.c_gold : r < 0.3 ? T.c_blue : r < 0.55 ? T.c_green : r < 0.78 ? T.c_purple : T.c_red); }
    }

    // ---------- 8. cavern pools ----------
    cav.forEach((c) => { for (let y = c.water; y <= c.cy + c.ry + 6; y++) for (let x = c.cx - c.rx - 8; x <= c.cx + c.rx + 8; x++) if (get(x, y) === T.air) { const dx = (x - c.cx) / (c.rx + 9), dy = (y - c.cy) / (c.ry + 7); if (dx * dx + dy * dy < 1) set(x, y, T.water); } });

    // ---------- 9. vertical shafts ----------
    const floorAt = (x, from, to) => { for (let y = from; y < (to || H); y++) if (solid(x, y) || get(x, y) === T.water) return y; return H; };
    const ceilAt = (x, from) => { for (let y = from; y > 0; y--) if (solid(x, y)) return y; return 0; };
    // a climbable shaft: carved air, a ledge every few rows on alternate sides, a chain down one wall
    const shaft = (x0, y0, y1, w, opts) => {
      opts = opts || {}; const ph = rr(0, 6.28); let lastX = x0;
      for (let y = y0; y <= y1; y++) {
        const xx = Math.round(x0 + Math.sin(y * 0.09 + ph) * 3 + Math.sin(y * 0.031 + ph * 2) * 4);
        for (let k = -w; k <= w; k++) { const t = get(xx + k, y); if (t !== T.bedrock && t !== T.ward && !(opts.keepWater && t === T.water)) { set(xx + k, y, opts.fill || T.air); setb(xx + k, y, y > TUBE0 - 4 ? WL.deep : WL.cave); } }
        lastX = xx;
        if (!opts.fill) {
          if ((y - y0) % 7 === 3 && y < y1 - 3) { const side = ((y - y0) / 7) % 2 ? 1 : -1; for (let k = 0; k < 2; k++) set(xx + side * (w - k), y, T.stone); }
          if (opts.chain !== false && get(xx - w + (((y - y0) / 7) % 2 ? 0 : 0), y) === T.air && y > y0) set(xx - w, y, T.chain);
        }
      }
      meta.shafts.push({ x: x0, y0, y1, w, wet: !!opts.fill });
      return lastX;
    };
    // the crust above each cavern: one or two shafts drop into its roof
    cav.forEach((c) => {
      const n = c.kind === 'wild' ? 1 : 2;
      for (let k = 0; k < n; k++) {
        const x = Math.round(c.cx + (n === 1 ? rr(-0.3, 0.3) : k ? rr(0.35, 0.6) : rr(-0.6, -0.35)) * c.rx);
        const top = Math.round(rr(CR0 + 4, CR1 - 4)), bottom = ceilAt(x, c.cy) + 2;
        if (bottom > top + 4) shaft(x, top, bottom, 2);
      }
    });
    // drains: a column of water from each pool's bottom down into the tubes
    cav.forEach((c, i) => { if (i % 2) return; const x = c.cx + ri(-Math.round(c.rx * 0.3), Math.round(c.rx * 0.3)); shaft(x, c.cy + c.ry - 2, TUBE0 + 12, 1, { fill: T.water }); });
    // the way down to the Heart Chamber: two long shafts from the crust that end at the flooded roof
    [CORE.cx - Math.round(CORE.rx * 0.55), CORE.cx + Math.round(CORE.rx * 0.55)].forEach((x) => {
      let roof = CORE.cy; while (roof > CORE.cy - CORE.ry - 8 && get(x, roof) === T.water) roof--;
      shaft(x, CR0 + 6, roof + 1, 2, { keepWater: true });
    });
    // sea-floor vents (water, dead ends, for kelp and fish)
    for (let i = 0; i < 6; i++) { const x = ri(30, W - 30); shaft(x, floorY[x] - 1, floorY[x] + ri(14, 30), 1, { fill: T.water }); }

    // ---------- 10. home cave, and its shaft into Stalagmere ----------
    const hx = Math.round(VIL.cx - VIL.rx * 0.55), hy = CR1 - 6;
    const HOME = { x0: hx - 10, x1: hx + 10, y0: hy - 4, y1: hy + 4 };
    for (let y = HOME.y0; y <= HOME.y1; y++) for (let x = HOME.x0; x <= HOME.x1; x++) {
      const dy = (y - (HOME.y0 + HOME.y1) / 2) / ((HOME.y1 - HOME.y0) / 2 + 1), dx = (x - (HOME.x0 + HOME.x1) / 2) / ((HOME.x1 - HOME.x0) / 2 + 1);
      if (dx * dx + dy * dy < 1.05) { set(x, y, T.air); setb(x, y, WL.cave); }
    }
    for (let x = HOME.x0 - 2; x <= HOME.x1 + 2; x++) if (!solid(x, HOME.y1 + 1)) set(x, HOME.y1 + 1, T.stone);
    // a little tunnel out to the dry gallery above
    for (let y = HOME.y0 - 14; y <= HOME.y0; y++) for (let k = -1; k <= 1; k++) { set(HOME.x0 + 3 + k, y, T.air); setb(HOME.x0 + 3 + k, y, WL.cave); }
    for (let y = HOME.y0 - 13; y <= HOME.y0; y++) set(HOME.x0 + 2, y, T.chain);
    // the shaft: from the cave floor's east end down into Stalagmere's roof
    const vilRoof = ceilAt(HOME.x1 + 4, VIL.cy) + 2;
    for (let x = HOME.x1 - 2; x <= HOME.x1 + 6; x++) for (let y = hy - 2; y <= hy + 2; y++) { set(x, y, T.air); setb(x, y, WL.cave); }
    shaft(HOME.x1 + 5, hy, Math.max(hy + 6, vilRoof), 2);
    set(HOME.x0 + 2, HOME.y0 + 2, T.lantern);
    set(HOME.x0 + 5, HOME.y1, T.altar); set(HOME.x0 + 5, HOME.y1 + 1, T.stone);
    set(HOME.x1 - 3, HOME.y1, T.wildmush);
    def.spawn.x = hx - 2; def.spawn.y = HOME.y1;
    for (let x = def.spawn.x - 2; x <= def.spawn.x + 2; x++) { set(x, def.spawn.y + 1, T.stone); for (let y = def.spawn.y - 2; y <= def.spawn.y; y++) set(x, y, T.air); }
    // starter flint and gravel round the cave
    [[HOME.x0 - 1, HOME.y1 - 1], [HOME.x0 + 6, HOME.y0 - 1], [HOME.x1 - 6, HOME.y0 - 1], [HOME.x0 + 12, HOME.y0 - 1]].forEach(([x, y]) => blob(x, y, 1.1, T.flint, [T.stone, T.gravel]));
    [[HOME.x0 + 3, HOME.y1 + 2], [HOME.x1 - 4, HOME.y1 + 2], [HOME.x0 - 3, HOME.y1]].forEach(([x, y]) => blob(x, y, 1.6, T.gravel, [T.stone]));

    // ---------- 11. towns: slim stalagmites and stalactites with farms, hanging houses ----------
    const CROPS = [T.crop_mush, T.crop_moss, T.crop_lichen, T.crop_sprout];
    const farmLedge = (x0, dir, y, len, walk) => { // soil with a crop on every block, then a walkway out
      for (let k = 0; k < len; k++) { const x = x0 + dir * k; if (get(x, y) === T.air || get(x, y) === T.water) set(x, y, T.soil); if (get(x, y - 1) === T.air) set(x, y - 1, CROPS[(k + y + x) % 4]); }
      for (let k = len; k < len + (walk || 0); k++) if (get(x0 + dir * k, y) === T.air) set(x0 + dir * k, y, T.walkway);
    };
    const stalagmite = (sx, c, hFrac, farms) => {
      const base = c.floor(sx) + 2, top = Math.round(base - (base - (c.cy - c.ry)) * hFrac);
      const wAt = (y) => 0.7 + (y - top) * 0.075;
      for (let y = top; y <= base; y++) { const w = wAt(y); for (let x = Math.round(sx - w); x <= Math.round(sx + w); x++) if (!solid(x, y) || natural(get(x, y))) set(x, y, T.spire); }
      if (farms) { let side = hh(sx, 1, 3) < 0.5 ? 1 : -1; for (let y = Math.min(base - 6, c.water - 2); y > top + 5; y -= 8) { const w = Math.round(wAt(y)); farmLedge(sx + side * (w + 1), side, y, 4, 2); side = -side; } }
      return { top, base, wAt };
    };
    const stalactite = (sx, c, len, farms) => {
      const roof = ceilAt(sx, c.cy) + 1; const wAt = (y) => Math.max(0, (len - (y - roof)) * 0.11);
      for (let y = roof; y < roof + len; y++) { const w = wAt(y); for (let x = Math.round(sx - w); x <= Math.round(sx + w); x++) if (get(x, y) === T.air) set(x, y, T.spire); }
      if (farms) { const fy = roof + Math.round(len * 0.55), w = Math.round(wAt(fy)); farmLedge(sx - w - 1, -1, fy, 3, 1); farmLedge(sx + w + 1, 1, fy, 3, 1); set(sx, roof + len, T.lantern); }
      return roof;
    };
    const house = (hx2, floorRow, w, h, owner) => {
      const x0 = hx2 - Math.floor(w / 2), x1 = x0 + w - 1, roof = floorRow - h;
      for (let y = roof; y <= floorRow; y++) for (let x = x0; x <= x1; x++) {
        const edge = y === roof || y === floorRow || x === x0 || x === x1;
        set(x, y, edge ? (y === floorRow ? T.ironplate : T.brick) : T.air); setb(x, y, WL.brick);
      }
      for (let y = floorRow - 3; y < floorRow; y++) { set(x0, y, T.air); set(x1, y, T.air); }
      [x0 + 1, x1 - 1].forEach((cx) => { const c = ceilAt(cx, roof - 1); for (let y = c + 1; y < roof; y++) set(cx, y, T.chain); });
      set(hx2, roof + 1, T.lantern);
      for (let k = 1; k <= 5; k++) { if (get(x0 - k, floorRow) === T.air) set(x0 - k, floorRow, T.walkway); if (get(x1 + k, floorRow) === T.air) set(x1 + k, floorRow, T.walkway); }
      if (owner) meta.npcs[owner] = { x: hx2, y: floorRow - 1 };
      return { x0, x1, roof, floorRow };
    };
    const lanterns = (c, n) => { for (let i = 0; i < n; i++) { const x = Math.round(c.cx - c.rx * 0.8 + (c.rx * 1.6) * (i + 0.5) / n); const top = ceilAt(x, c.cy - 8); const len = 4 + ((i * 7 + x) % 9); let y; for (y = top + 1; y < top + len && get(x, y) === T.air; y++) set(x, y, T.chain); if (get(x, y) === T.air) set(x, y, T.lantern); } };
    const shore = (c) => { for (let x = c.cx - c.rx; x < c.cx + c.rx; x += 2) { const f = floorAt(x, c.cy - 10, c.cy + c.ry + 8); if (f < H && get(x, f) !== T.water && get(x, f - 1) === T.air && hh(x, f, 9) < 0.3) set(x, f - 1, T.wildmush); } };

    // Stalagmere
    {
      const c = VIL;
      const mites = [c.cx - Math.round(c.rx * 0.55), c.cx + Math.round(c.rx * 0.05), c.cx + Math.round(c.rx * 0.6)];
      const ms = mites.map((x, i) => stalagmite(x, c, [0.38, 0.46, 0.34][i], true));
      [-0.78, -0.3, 0.3, 0.82].forEach((f, i) => stalactite(Math.round(c.cx + f * c.rx), c, 9 + (i % 2) * 4, true));
      const hy0 = Math.round(c.cy - c.ry * 0.18);
      const bridge0 = (xa, xb, y) => { for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) if (get(x, y) === T.air) set(x, y, T.walkway); };
      const h1 = house(Math.round(c.cx - c.rx * 0.3), hy0, 13, 7, 'gneiss');
      const h2 = house(Math.round(c.cx + c.rx * 0.28), hy0 + 5, 11, 6, null);
      const h3 = house(Math.round(c.cx + c.rx * 0.78), hy0 + 12, 9, 6, 'cubert');
      const h4 = house(Math.round(c.cx - c.rx * 0.74), hy0 + 9, 10, 6, 'wedgeworth'); // V3: Wedgeworth has his own home now
      meta.npcs.guesthouse = { x: Math.round((h2.x0 + h2.x1) / 2), y: h2.floorRow - 1 };
      meta.carvings[(h2.x1 - 2) + ',' + (h2.floorRow - 1)] = 5; set(h2.x1 - 2, h2.floorRow - 1, T.tablet); // Triangle Accord
      // Slagg's forge, on the middle stalagmite
      const m = ms[1], fy = Math.min(c.water - 4, m.top + 14), fx = mites[1] + Math.round(m.wAt(fy)) + 1;
      for (let x = fx; x <= fx + 9; x++) set(x, fy, T.brick);
      house(fx + 5, fy, 11, 6, null); // V3: Slagg's forge is his home too, walled and roofed
      set(fx + 1, fy - 1, T.forge); set(fx + 7, fy - 1, T.knapstone);
      meta.npcs.slagg = { x: fx + 3, y: fy - 1 };
      // V3: every house hangs in the air, joined door to door by sagging rope bridges held up by chains
      const hs = [h4, h1, { x0: fx, x1: fx + 10, floorRow: fy }, h2, h3].sort((a, b) => a.x0 - b.x0);
      const soft = (t) => t === T.spire || t === T.stone || t === T.soil || t === T.walkway || (CROPS.indexOf(t) >= 0);
      const hang = (xa, ya, xb, yb) => {
        const n = Math.max(1, xb - xa), sag = Math.min(4, Math.round(n / 9));
        for (let x = xa; x <= xb; x++) {
          const t = (x - xa) / n, y = Math.round(ya + (yb - ya) * t + Math.sin(t * Math.PI) * sag);
          if (get(x, y) === T.air || soft(get(x, y))) set(x, y, T.walkway);
          for (let k = 1; k <= 3; k++) if (soft(get(x, y - k))) set(x, y - k, T.air);   // a way through spires and farm ledges
          if (x === xa + 1 || x === xb - 1 || x === Math.round((xa + xb) / 2)) { const top = ceilAt(x, y - 1); for (let yy = top + 1; yy < y; yy++) if (get(x, yy) === T.air) set(x, yy, T.chain); } // held up at both ends and the middle
        }
      };
      for (let k = 1; k < hs.length; k++) { const a = hs[k - 1], b = hs[k]; if (b.x0 - a.x1 > 1) hang(a.x1 + 1, a.floorRow, b.x0 - 1, b.floorRow); }
      // the starter chest: where the shaft from your cave lands
      const sx = HOME.x1 + 5; let sy = floorAt(sx, vilRoof + 1, H); if (get(sx, sy) === T.water) sy = c.water;
      const landX = sx + 3; let ly = floorAt(landX, vilRoof + 1, H);
      set(h1.x0 + 2, h1.floorRow - 1, T.starterchest); meta.starter = { x: h1.x0 + 2, y: h1.floorRow - 1 }; // V3: you wake inside Gneiss's house
      lanterns(c, 9); shore(c);
      // a hidden cache below the mere
      meta.villageAt = { cx: c.cx, cy: c.cy };
    }
    // the other towns
    meta.towns.forEach((c, ti) => {
      const nm = ri(2, 3);
      for (let k = 0; k < nm; k++) stalagmite(Math.round(c.cx + (-0.6 + 1.2 * (k + 0.5) / nm) * c.rx), c, rr(0.3, 0.45), true);
      const nt = ri(3, 4);
      for (let k = 0; k < nt; k++) stalactite(Math.round(c.cx + (-0.75 + 1.5 * (k + 0.5) / nt) * c.rx + ri(-4, 4)), c, ri(8, 12), true);
      const nh = ri(2, 4), houses = [];
      for (let k = 0; k < nh; k++) houses.push(house(Math.round(c.cx + (-0.6 + 1.2 * (k + 0.5) / nh) * c.rx), Math.round(c.cy - c.ry * 0.15 + ri(-4, 8)), ri(9, 12), ri(5, 7), null));
      houses.forEach((h, k) => { if (k) for (let x = houses[k - 1].x1; x <= h.x0; x++) { const y = Math.max(houses[k - 1].floorRow, h.floorRow) + 3; if (get(x, y) === T.air) set(x, y, T.walkway); } });
      // each town keeps something: a chest in one house, a lantern in each
      const hc = houses[ri(0, houses.length - 1)]; set(hc.x0 + 2, hc.floorRow - 1, T.woodchest);
      if (ti === 0) meta.special[(hc.x0 + 2) + ',' + (hc.floorRow - 1)] = 'gold';
      c.homes = houses.map((h) => ({ x: Math.round((h.x0 + h.x1) / 2), y: h.floorRow - 1 }));
      lanterns(c, 6); shore(c);
    });
    // wild caverns: a stalagmite or two, a stalactite, mushrooms
    cav.filter((c) => c.kind === 'wild').forEach((c) => { stalagmite(c.cx + ri(-10, 10), c, rr(0.25, 0.4), hh(c.cx, 2, 4) < 0.4); stalactite(c.cx + ri(-Math.round(c.rx / 2), Math.round(c.rx / 2)), c, ri(6, 10), false); shore(c); });

    // ---------- 12. Crystal Forest ----------
    if (CRY) {
      const c = CRY;
      for (let x = c.cx - c.rx; x < c.cx + c.rx; x++) {
        const f = floorAt(x, c.cy - c.ry + 4, c.cy + c.ry + 8);
        if (f >= H || get(x, f) === T.water || get(x, f - 1) !== T.air) continue;
        const r = hh(x, 7, 1);
        if (r < 0.09 && x % 2 === 0) { const hgt = 5 + Math.floor(hh(x, 9, 1) * 7); for (let y = f - 1; y > f - 1 - hgt; y--) set(x, y, T.ctrunk); disc(x, f - hgt - 2, 2.6 + hh(x, 3, 1) * 1.4, T.cleaf, (t) => t === T.air); }
        else if (r < 0.32) { const q = hh(x, 11, 1); set(x, f - 1, q < 0.015 ? T.c_gold : q < 0.27 ? T.c_blue : q < 0.52 ? T.c_purple : q < 0.76 ? T.c_green : T.c_red); }
        const cc = ceilAt(x, c.cy);
        if (hh(x, 13, 1) < 0.2 && get(x, cc + 1) === T.air) set(x, cc + 1, hh(x, 17, 1) < 0.5 ? T.c_blue : T.c_purple);
      }
      [-0.5, 0.05, 0.55].forEach((fr) => { const x = Math.round(c.cx + fr * c.rx), top = ceilAt(x, c.cy), f = floorAt(x, c.cy, c.cy + c.ry + 8); meta.waterfalls.push({ x, y0: top + 1, y1: f, kind: 'powder' }); for (let k = -2; k <= 2; k++) if (get(x + k, f) !== T.air && get(x + k, f) !== T.water) set(x + k, f, T.crystalblock); });
      const tx = c.cx - 20, ty = floorAt(tx, c.cy, c.cy + c.ry + 8) - 1;
      if (get(tx, ty) === T.air) { meta.carvings[tx + ',' + ty] = 3; set(tx, ty, T.tablet); }
    }

    // ---------- 13. moss, lichen, mushrooms, vines, kelp, coral ----------
    for (let x = 3; x < W - 3; x++) for (let y = SEA; y < H - 10; y++) {
      const t = get(x, y), above = get(x, y - 1), below = get(x, y + 1), h = hh(x, y, 5);
      const inCry = CRY && ((x - CRY.cx) / CRY.rx) ** 2 + ((y - CRY.cy) / CRY.ry) ** 2 < 1;
      if (t === T.stone && above === T.air && y > CR0 && y < TUBE0) { if (h < 0.18) set(x, y, T.mossstone); else if (h < 0.26) set(x, y, T.lichenstone); }
      if (t === T.air && RW.TILES[below].solid && below !== T.soil && y > CR0 && y < TUBE0 && h > 0.965 && !inCry) set(x, y, T.wildmush);
      if (t === T.air && RW.TILES[above].solid && y > CR0 && y < TUBE0 && h > 0.95 && !inCry && above !== T.brick && above !== T.ironplate) set(x, y, T.vines);
      if (t === T.water && RW.TILES[below].solid && y < floorY[x] + 2) { if (h < 0.12) set(x, y, T.kelp); else if (h > 0.93) set(x, y, T.coral); }
    }

    // ---------- 14. shipwrecks ----------
    const wreck = (wx, special) => {
      const f = floorY[wx]; const Lw = 22, Hh = 7;
      for (let y = f - Hh; y <= f + 1; y++) for (let x = wx - Lw / 2; x <= wx + Lw / 2; x++) {
        const dy = y - (f - Hh), inset = Math.max(0, dy - Hh + 3) * 1.6, xl = wx - Lw / 2 + inset, xr = wx + Lw / 2 - inset;
        if (x < xl || x > xr) continue;
        const edge = y === f + 1 || x <= xl + 1 || x >= xr - 1 || (y === f - Hh && RW.hash2(x, y, 3) < 0.6);
        if (edge && RW.hash2(x, y, 7) > 0.18) set(Math.round(x), y, T.shipplank); else set(Math.round(x), y, T.water);
        setb(Math.round(x), y, WL.ship);
      }
      for (let y = f - Hh - 10; y < f - Hh; y++) set(wx - 3, y, T.shipplank);
      set(wx + 2, f, T.shipchest); if (special) meta.special[(wx + 2) + ',' + f] = special;
      meta.secrets.push({ x: wx + 2, y: f, kind: 'wreck' });
      return f;
    };
    const wx = [ri(60, 360), ri(480, 780), ri(900, 1200)];
    wreck(wx[0], 'shipbreaker_anchor'); const f2 = wreck(wx[1], null); wreck(wx[2], null);
    meta.carvings[(wx[1] - 4) + ',' + f2] = 4; set(wx[1] - 4, f2, T.tablet);

    // ---------- 15. secret rooms ----------
    const secretRoom = (sx, sy, w, h, inside, side) => {
      for (let y = sy - 1; y <= sy + h; y++) for (let x = sx - 1; x <= sx + w; x++) set(x, y, T.stone);
      for (let y = sy; y < sy + h; y++) for (let x = sx; x < sx + w; x++) { set(x, y, T.air); setb(x, y, WL.brick); }
      const fx = side > 0 ? sx + w : sx - 1;
      for (let y = sy + h - 3; y < sy + h; y++) { set(fx, y, T.fakewall); set(fx + side, y, T.fakewall); }
      inside(sx, sy, w, h); meta.secrets.push({ x: sx + Math.floor(w / 2), y: sy + h - 1, kind: 'room' });
    };
    secretRoom(HOME.x0 - 16, HOME.y0 - 2, 7, 4, (sx, sy, w, h) => { set(sx + 2, sy + h - 1, T.cache); meta.special[(sx + 2) + ',' + (sy + h - 1)] = 'gold'; set(sx + 5, sy + h - 1, T.tablet); meta.carvings[(sx + 5) + ',' + (sy + h - 1)] = 6; set(sx + 3, sy, T.lantern); }, 1);
    if (CRY) secretRoom(CRY.cx + CRY.rx - 4, CRY.cy - 30, 7, 4, (sx, sy, w, h) => { set(sx + 3, sy + h - 1, T.cache); meta.special[(sx + 3) + ',' + (sy + h - 1)] = 'prism_splitter'; set(sx + 1, sy + h - 1, T.c_gold); set(sx + 5, sy + h - 1, T.c_purple); }, -1);
    secretRoom(ri(60, 300), TUBE0 + 30, 10, 5, (sx, sy, w, h) => { for (let x = sx; x < sx + w; x++) { set(x, sy, T.platinum); set(x, sy + h - 1, x % 2 ? T.bronze : T.platinum); } set(sx + 5, sy + 2, T.c_gold); }, 1);
    secretRoom(VIL.cx + 40, VIL.cy + VIL.ry + 9, 6, 4, (sx, sy, w, h) => { set(sx + 2, sy + h - 1, T.cache); set(sx + 4, sy + h - 1, T.tablet); meta.carvings[(sx + 4) + ',' + (sy + h - 1)] = 0; }, -1);
    { const dx = ri(900, 1180), dy = TUBE0 + 52; for (let y = dy - 3; y <= dy; y++) for (let x = dx - 4; x <= dx + 4; x++) { set(x, y, T.air); setb(x, y, WL.deep); } set(dx, dy, T.tablet); meta.carvings[dx + ',' + dy] = 1; set(dx, dy + 1, T.deepstone); for (let y = dy - 24; y < dy - 3; y++) set(dx + Math.round(Math.sin(y * 0.15) * 2), y, T.air); }

    meta.floorY = floorY; meta.seed = seed;
    meta.layout = { CAV0, CAV1, TUBE0, TUBE1, SEA, CR0, CR1, vil: { cx: VIL.cx, cy: VIL.cy, rx: VIL.rx, ry: VIL.ry }, cry: CRY ? { cx: CRY.cx, cy: CRY.cy, rx: CRY.rx, ry: CRY.ry } : null, core: CORE, home: HOME };
    return { W, H, fg, bg, meta };
  }

  // ---------------- the extras other modules put in every world, placed again here ----------------
  function extras(gen, old) {
    const T = RW.T, fg = gen.fg, Wd = gen.W, Hd = gen.H, M = gen.meta, sp = def.spawn;
    const at = (x, y) => (x < 0 || y < 0 || x >= Wd || y >= Hd ? T.bedrock : fg[y * Wd + x]);
    const solid = (x, y) => !!RW.TILES[at(x, y)].solid;
    const free = (x, y) => { const t = RW.TILES[at(x, y)]; return !t.solid && !t.climb && !t.platform && !t.decor && at(x, y) !== T.water; };
    // town portal, beside where you wake
    if (T.townportal != null) for (const dx of [-4, -5, -6, -3, -7, 4, 5, 6]) { const x = sp.x + dx; let y = sp.y - 3; while (y < Hd - 1 && !solid(x, y + 1)) y++; if (Math.abs(y - sp.y) > 5 || !free(x, y) || !free(x, y - 1) || !free(x, y - 2)) continue; fg[y * Wd + x] = T.townportal; M.portal = { x, y }; break; }
    // the Duat Stone: the same carving the old layout used
    const ds = old && old.meta && old.meta.duatStone, di = ds && old.meta.carvings ? old.meta.carvings[ds.x + ',' + ds.y] : null;
    if (di != null && T.tablet != null) for (const dx of [7, -8, 8, -9, 9, 3, -3]) { const x = sp.x + dx; let y = sp.y - 3; while (y < Hd - 1 && !solid(x, y + 1)) y++; if (Math.abs(y - sp.y) > 5 || !free(x, y) || !free(x, y - 1) || !RW.TILES[at(x, y + 1)].solid || RW.TILES[at(x, y + 1)].decor) continue; fg[y * Wd + x] = T.tablet; M.carvings[x + ',' + y] = di; M.duatStone = { x, y }; break; }
    // legendary chests (two, deep and far apart) and old chests in the caves
    const spots = [];
    for (let y = 180; y < Hd - 12; y += 1) for (let x = 6; x < Wd - 6; x += 1) {
      if (at(x, y) !== T.air || at(x, y - 1) !== T.air || !solid(x, y + 1) || RW.TILES[at(x, y + 1)].decor || at(x, y + 1) === T.water) continue;
      if (Math.abs(x - sp.x) < 40 && Math.abs(y - sp.y) < 30) continue;
      if (at(x - 1, y) !== T.air && at(x + 1, y) !== T.air) continue;
      spots.push([x, y, RW.hash2(x, y, (M.seed % 9973) + 4242)]);
    }
    spots.sort((a, b) => a[2] - b[2]);
    const taken = [];
    if (T.legendchest != null) { M.legend = []; for (const p of spots) { if (p[1] < 260) continue; if (taken.every((q) => Math.abs(q[0] - p[0]) > Wd / 4)) { fg[p[1] * Wd + p[0]] = T.legendchest; M.legend.push({ x: p[0], y: p[1] }); taken.push(p); } if (M.legend.length >= 3) break; } }
    if (T.woodchest != null) { let n = 0; for (const p of spots) { if (n >= 24) break; if (taken.some((q) => Math.abs(q[0] - p[0]) < 30 && Math.abs(q[1] - p[1]) < 18)) continue; if (at(p[0], p[1]) !== T.air) continue; fg[p[1] * Wd + p[0]] = T.woodchest; taken.push(p); n++; } M.v2chests = n; }
    // the golden chest: on a floor near where the rift opens, once the Leviathan is beaten
    const r = M.riftAt, GC = T.goldchest, GR = T.goldchestr;
    if (r && GC != null && GR != null) {
      const fr = (x, y) => at(x, y) === T.air || at(x, y) === T.water;
      const roomy = (x, y) => fr(x, y) && fr(x + 1, y) && fr(x, y - 1) && fr(x + 1, y - 1) && solid(x, y + 1) && solid(x + 1, y + 1);
      outer: for (let dx = 4; dx < 120; dx++) for (const s of [1, -1]) for (let dy = -6; dy <= 60; dy++) { const x = r.x + s * dx, y = r.y + dy; if (roomy(x, y)) { fg[y * Wd + x] = GC; fg[y * Wd + x + 1] = GR; M.goldChest = { x, y }; break outer; } }
    }
  }

  // ---------------- swap the generator ----------------
  const oldGen = def.generate;
  let oldCache = null;
  def.generate = function () {
    const seed = RW.v2rockSeed();
    if (!oldCache) { try { oldCache = oldGen.apply(this, arguments); } catch (e) { oldCache = null; } } // once: the old chain sets up its carvings
    const gen = build(seed);
    try { extras(gen, oldCache); } catch (e) { console.warn('rock extras', e); }
    def.store = 'rockv3_' + seed.toString(36);
    def.homeCave = gen.meta.layout.home; def.core = gen.meta.arena;
    def.village = gen.meta.layout.vil; def.crystal = gen.meta.layout.cry;
    def.titleCam = { x: gen.meta.layout.vil.cx, y: gen.meta.layout.vil.cy - 10 };
    gen.meta.towns.forEach((t) => { def.zones[t.zone] = { name: t.name, music: 'village' }; });
    L = gen.meta;
    return gen;
  };
  def.size = [W, H];
  def.blurb = 'A hollow stone planet with a sea for a sky, different in every world. Home of the rocks.';
  const inE = (x, y, e, k) => { const dx = (x - e.cx) / (e.rx * k), dy = (y - e.cy) / (e.ry * k); return dx * dx + dy * dy <= 1; };
  def.zoneAt = function (x, y) {
    if (!L || !L.layout) return 'caves'; const Lo = L.layout;
    if (y < Lo.SEA) return 'sky';
    if (y < L.floorY[RW.clamp(x | 0, 0, W - 1)] + 2) return 'sea';
    if (inE(x, y, Lo.vil, 1.1)) return 'village';
    if (Lo.cry && inE(x, y, Lo.cry, 1.15)) return 'crystal';
    for (const t of L.towns) if (inE(x, y, t, 1.1)) return t.zone;
    if (inE(x, y, { cx: Lo.core.cx, cy: Lo.core.cy, rx: Lo.core.rx + 20, ry: Lo.core.ry + 14 }, 1)) return 'core';
    if (y >= Lo.TUBE0 - 2) return 'tubes';
    return 'caves';
  };
  def.ambientAt = function (x, y) {
    if (!L || !L.layout) return 0.2; const Lo = L.layout;
    if (inE(x, y, Lo.vil, 1.05)) return 0.42;
    if (Lo.cry && inE(x, y, Lo.cry, 1.05)) return 0.36;
    for (const t of L.towns) if (inE(x, y, t, 1.05)) return 0.38;
    if (inE(x, y, Lo.core, 1.08)) return 0.34;
    if (y >= Lo.TUBE0) return 0.15;
    return 0.2;
  };
  // the map names every town
  const baseZoneName = null; void baseZoneName;

  // ---------------- multiplayer: friends who join get the host's seed ----------------
  if (N) {
    const baseSend = N.send;
    N.send = function (m) { if (m && m.k === 'world' && m.w === 'rock' && N.isHost) m.rseed = localSeed(); return baseSend.apply(this, arguments); };
    const baseRecv = N.recv;
    N.recv = function (m) {
      if (m && m.k === 'world' && m.w === 'rock' && m.to === N.pid && !N.isHost && (m.rseed | 0) > 0) {
        const s = m.rseed | 0; RW.v2rockSeedHost = s;
        if (RW.world.def && RW.world.def.id === 'rock' && RW.world.meta && RW.world.meta.seed !== s) {
          const P = RW.player;
          RW.world.init('rock'); RW.ent.initNpcs && RW.ent.initNpcs();
          if (RW.game && RW.game.playing) { const sp = def.spawn; P.spawnAt(sp.x, sp.y); }
        }
      }
      return baseRecv.apply(this, arguments);
    };
  }
})(window.RW);
