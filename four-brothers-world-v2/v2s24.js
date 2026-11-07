// 4 Brothers World V2 — part 24: Fuzzy World's caves, lava that flows, and clams that fight.
//  * Every part of Fuzzy World has its own caves now, each with its own rock and walls:
//    the Sandstone Galleries under the desert (long banded halls on three levels, fossils in the rock),
//    the Root Hollows under Tuftwood Forest (round earthy chambers with tree roots hanging from the roof,
//    glowing moss and mushrooms), the Magma Halls under the Tall Peaks (a great hall of basalt columns with
//    lavafalls pouring into a lava lake), the Flooded Grottos under the Tanglewood (half-drowned chambers,
//    blue crystals and glowing lichen), and Crystal Geodes deep down everywhere.
//  * Caves are entered by sloping, winding passages you can walk down, not straight holes.
//  * Lava flows: it creeps out when you dig next to it, pours off ledges and spreads (slower than water),
//    burns plants in its way, and where it meets water it hardens into glowing crust (hot to stand on) that
//    cools to basalt. Lavafalls pour in the Magma Halls.
//  * Clams on the sea floor of both oceans: Snapclams that clap their shells to swim at you and bite, and
//    Grand Clams that spit bubble jets and slam shut. Their shells turn hits aside; strike them while open.
(function (RW) {
  'use strict';
  const A = RW.art, D = A.drawers, E = RW.ent, P = RW.player, U = RW.ui, R = RW.register, TS = RW.TILE;
  if (!A || !E || !P || !RW.WORLDS || !RW.WORLDS.fuzzy) return;
  const { px, rect } = A; const mk = A.canvas;
  const H4 = A.h4 || {}; const { fitFrames } = H4;
  const def = RW.WORLDS.fuzzy;
  const addTile = (d) => { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; };
  const addWall = (d) => { if (RW.W[d.key] != null) return RW.W[d.key]; const id = RW.WALLS.length; RW.WALLS.push(d); RW.W[d.key] = id; return id; };
  const pick = (h, arr) => arr[Math.min(arr.length - 1, Math.floor(h * arr.length))];
  // ======================= 1. CAVE ROCK, WALLS AND THINGS THAT GROW IN CAVES =======================
  // Each cave region has its own rock. Rock textures are 8 hand-made variants per block (the game picks a variant
  // from the block's position); background walls are painted straight from world position so they flow across blocks.
  const ROCK = {
    strata_a: { name: 'Cream Sandstone', colors: ['#d8bf8e', '#e8d4a8', '#bba274'], hard: 2 },
    strata_b: { name: 'Ochre Sandstone', colors: ['#c4924e', '#d6a964', '#a4783c'], hard: 2 },
    strata_c: { name: 'Rust Sandstone', colors: ['#a4583a', '#bc6e4a', '#86442c'], hard: 2 },
    strata_d: { name: 'Rose Sandstone', colors: ['#c48678', '#d6a092', '#a46a5e'], hard: 2 },
    fossilrock: { name: 'Fossil Stone', colors: ['#d8bf8e', '#e8d4a8', '#bba274'], hard: 2, drop: ['bone', 1, 2] },
    basalt: { name: 'Basalt', colors: ['#38343e', '#4a4652', '#28252e'], hard: 3 },
    magmarock: { name: 'Magma Rock', colors: ['#3a2a28', '#4e3630', '#281c1a'], hard: 3, light: [0.42, 0.14, 0.03] },
    grotto: { name: 'Grotto Stone', colors: ['#3e5a5c', '#587a7a', '#2c4244'], hard: 2 },
    loam: { name: 'Root Loam', colors: ['#3e2c20', '#4e3a2a', '#2e2018'], hard: 1, drop: 'dirt' },
    rootstone: { name: 'Rooted Stone', colors: ['#56504a', '#686058', '#423c36'], hard: 2 },
    agate: { name: 'Geode Shell', colors: ['#6a6278', '#8a82a0', '#4e485a'], hard: 3 },
    amethyst: { name: 'Amethyst', colors: ['#7a4aa8', '#a678d8', '#58307e'], hard: 3, light: [0.32, 0.12, 0.48], drop: ['crystal_purple', 0, 1] },
  };
  const TID = {};
  Object.entries(ROCK).forEach(([key, r]) => { TID[key] = addTile({ key, name: r.name, solid: true, hard: r.hard, time: 0.7 + r.hard * 0.1, drop: r.drop || 'stone', colors: r.colors, tex: 'rough', light: r.light, v2rock: true }); });
  if (!RW.ITEMS.bone) R.items([{ id: 'bone', name: 'Old Bone', kind: 'material', icon: { s: 'dust', a: '#efe6cc', b: '#a8987a' }, desc: 'A fossil bone from the Sandstone Galleries. Something very big lived here a very long time ago.' }]);
  const T_HROOT = addTile({ key: 'hroot', name: 'Hanging Roots', hard: 0, time: 0.2, drop: ['wood', 0, 1], climb: true, decor: 'hroot', soft: true });
  const T_STALAC = addTile({ key: 'stalac', name: 'Stalactite', hard: 1, time: 0.3, drop: 'stone', decor: 'stalac', soft: true });
  const T_STALAG = addTile({ key: 'stalag', name: 'Stalagmite', hard: 1, time: 0.3, drop: 'stone', decor: 'stalag', soft: true });
  const T_LICHEN = addTile({ key: 'lichen', name: 'Glow Lichen', hard: 0, time: 0.05, decor: 'lichen', soft: true, light: [0.08, 0.3, 0.34] });
  const T_CRUST = addTile({ key: 'crust', name: 'Cooling Crust', solid: true, hard: 2, time: 0.8, drop: 'stone', colors: ['#3a2622', '#4e322a', '#2a1a16'], tex: 'rough', light: [0.6, 0.2, 0.04], hot: true });
  const WL = {
    stratw: addWall({ key: 'stratw', colors: ['#6a5034', '#7a5e40', '#5a4228'] }),
    rootw: addWall({ key: 'rootw', colors: ['#2e2218', '#382a1e', '#241a12'] }),
    basaltw: addWall({ key: 'basaltw', colors: ['#242128', '#2c2830', '#1c1a20'] }),
    grottow: addWall({ key: 'grottow', colors: ['#22383a', '#2a4446', '#1a2c2e'] }),
    geodew: addWall({ key: 'geodew', colors: ['#2e2440', '#3a2e52', '#241c32'] }),
  };
  const blank = mk(TS, TS);

  // ---- rock textures ----
  const N2 = RW.noise2, H2 = RW.hash2;
  const ramp = (cols, lv) => cols[RW.clamp(Math.round(lv), 0, cols.length - 1)];
  const shades = (c) => [RW.shade(c[2], -0.18), c[2], c[0], c[1], RW.shade(c[1], 0.14)];
  const rockTex = {
    // fine horizontal laminations, the odd pebble and pit
    strata(k, v, c) { const S = shades(c); for (let y = 0; y < 16; y++) { const band = Math.sin(y * 1.9 + v * 0.7) * 0.6 + (y % 5 === 0 ? -0.7 : 0); for (let x = 0; x < 16; x++) { const n = N2((x + v * 16) / 5, y / 1.6, 31 + k); let lv = 2 + band + (n - 0.5) * 1.6; if (H2(x, y, v * 7 + k) > 0.96) lv -= 1.4; px(this.g, x, y, ramp(S, lv)); } } },
    fossil(k, v, c) { rockTex.strata.call(this, k, v, c); const g = this.g, bone = ['#f4ecd4', '#d8ccae', '#a8987a'];
      if (v % 2 === 0) { for (let a = 0; a < 26; a++) { const r = 0.5 + a * 0.24, an = a * 0.62; px(g, 8 + Math.cos(an) * r, 8 + Math.sin(an) * r * 0.9, bone[a % 3 === 2 ? 2 : a % 2]); } }   // an ammonite
      else { const yy = 5 + (v % 3) * 2; for (let x = 2; x < 14; x++) px(g, x, yy + Math.round(Math.sin(x * 0.5) * 0.6), bone[0]); [[2, -1], [2, 1], [13, -1], [13, 1]].forEach(([x, d]) => px(g, x, yy + d, bone[1])); for (let x = 4; x < 13; x += 3) { px(g, x, yy + 2, bone[1]); px(g, x, yy + 3, bone[2]); } } },  // a rib bone
    // side-on basalt columns: two per block, each lit on the left, with joints at different heights
    basalt(k, v, c, glow) { const S = shades(c), g = this.g;
      for (let col = 0; col < 2; col++) { const j1 = (v * 5 + col * 7) % 16, j2 = (j1 + 6 + (v % 3)) % 16;
        for (let y = 0; y < 16; y++) for (let i = 0; i < 8; i++) { const x = col * 8 + i; let lv = 3.1 - i * 0.32 + (N2(x / 3, (y + v * 16) / 6, 41) - 0.5) * 0.9;
          if (i === 0) lv = 4; if (i === 7) lv = 0.3; if (y === j1 || y === j2) lv = i === 0 ? 2 : 0.4; if (y === (j1 + 1) % 16 || y === (j2 + 1) % 16) lv += 0.7;
          px(g, x, y, ramp(S, lv)); }
        if (glow) for (let y = 0; y < 16; y++) if ((y + v + col * 3) % 9 < 4) px(g, col * 8 + 7, y, y % 2 ? '#ff7a1e' : '#c84a10');
        if (glow && (v + col) % 2) for (let i = 1; i < 7; i++) px(g, col * 8 + i, j1, i % 2 ? '#ffb347' : '#ff7a1e');
      } },
    // smooth, water-worn stone with wet shine and a little moss
    grotto(k, v, c) { const S = shades(c), g = this.g; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const n = N2((x + v * 13) / 6, (y + v * 5) / 6, 51), m = N2((x + v * 13) / 2.5, (y + v * 5) / 2.5, 52); let lv = 1.4 + n * 2.2 + (m > 0.72 ? 0.8 : 0); if (n > 0.62 && m > 0.6) lv = 4.4; px(g, x, y, ramp(S, lv)); if (H2(x, y, 53 + v) > 0.975) px(g, x, y, '#5a8a4a'); } },
    // dark earth threaded with roots and pebbles
    loam(k, v, c, stony) { const S = shades(c), g = this.g; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const n = N2((x + v * 16) / 4, y / 4, 61); px(g, x, y, ramp(S, 1.6 + n * 1.8)); }
      for (let r = 0; r < 2; r++) { let x = 2 + H2(v, r, 62) * 12, y = 0; const dx = H2(r, v, 63) > 0.5 ? 1 : -1; for (let s = 0; s < 18; s++) { px(g, x, y, stony ? '#5a3e26' : '#6e4a2c'); if (s % 4 === 0) px(g, x + dx, y, '#3a2416'); y += 1; if (H2(s, v + r, 64) > 0.55) x += dx; if (x < 0 || x > 15) break; } }
      for (let p = 0; p < (stony ? 5 : 2); p++) { const x = H2(p, v, 65) * 14, y = H2(v, p, 66) * 14; px(g, x, y, '#8a8278'); px(g, x + 1, y, '#a8a098'); px(g, x, y + 1, '#5a544c'); } },
    // agate: curved bands of grey, lilac and white
    agate(k, v, c) { const B = ['#4e485a', '#6a6278', '#8a82a0', '#b8b0cc', '#e4def0', '#9a8ab8'], g = this.g; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const r = Math.hypot(x - 8 + (v - 3.5) * 3, y + 20 + v * 2) * 0.55 + N2(x / 5, y / 5, 71 + v) * 2.2; px(g, x, y, B[Math.floor(r) % B.length]); } },
    // crystal facets
    amethyst(k, v, c) { const F = ['#3e1e5e', '#58307e', '#7a4aa8', '#a678d8', '#d4b4f4', '#f4e8ff'], g = this.g;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { let d1 = 99, d2 = 99, hv = 0; for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) { const cx = i * 7 + H2(i + v * 3, j, 72) * 6, cy = j * 7 + H2(j + v * 5, i, 73) * 6, d = Math.hypot(x - cx, y - cy); if (d < d1) { d2 = d1; d1 = d; hv = H2(i + v, j, 74); } else if (d < d2) d2 = d; }
        let lv = 1 + hv * 3.2; if (d2 - d1 < 0.9) lv = 0; if (d1 < 1.2 && hv > 0.6) lv = 5; px(g, x, y, ramp(F, lv)); } },
    crust(k, v, c) { rockTex.basalt.call(this, k, v, ['#3a2622', '#4e322a', '#2a1a16']); const g = this.g; for (let s = 0; s < 3; s++) { let x = H2(s, v, 81) * 16, y = 0; for (let n = 0; n < 20; n++) { px(g, x, y, n % 3 ? '#ff8a24' : '#ffd060'); y += H2(n, s + v, 82) > 0.4 ? 1 : 0; x += H2(s + v, n, 83) > 0.5 ? 1 : -1; if (y > 15 || x < 0 || x > 15) break; } } },
  };
  const ROCK_TEX = { strata_a: 'strata', strata_b: 'strata', strata_c: 'strata', strata_d: 'strata', fossilrock: 'fossil', basalt: 'basalt', magmarock: 'basalt', grotto: 'grotto', loam: 'loam', rootstone: 'loam', agate: 'agate', amethyst: 'amethyst', crust: 'crust' };
  const baseBuild = A.buildTiles;
  A.buildTiles = function () {
    const r = baseBuild.apply(this, arguments);
    Object.entries(ROCK_TEX).forEach(([key, fn]) => {
      const id = RW.T[key], t = RW.TILES[id];
      A.tiles[id] = [0, 1, 2, 3, 4, 5, 6, 7].map((v) => { const c = mk(TS, TS); rockTex[fn].call({ g: c.ctx }, id, v, t.colors, key === 'magmarock' || key === 'rootstone'); return c; });
    });
    Object.values(WL).forEach((id) => { A.walls[id] = [blank, blank, blank]; });
    return r;
  };

  // ---- background walls, painted from world position so they flow across blocks (64x64-block repeat) ----
  const wallCache = new Map();
  const WALLPAINT = {
    stratw(X, Y) { const b = ((Math.floor((Y + Math.sin(X / 23) * 6 + N2(X / 40, Y / 30, 91) * 10) / 7) % 5) + 5) % 5; const C = ['#8a6a44', '#9a7a4e', '#ae8c5c', '#8e5a42', '#a08058'][b]; const n = N2(X / 6, Y / 2, 92); return RW.shade(C, (n - 0.5) * 0.25 + (H2(X, Y, 93) > 0.97 ? -0.2 : 0)); },
    rootw(X, Y) { const n = N2(X / 12, Y / 12, 94), r = Math.abs(N2(X / 18, Y / 7, 95) - 0.5); let C = RW.mix('#463422', '#6a5034', n); if (r < 0.035) C = '#7a5634'; else if (r < 0.06) C = '#3a2818'; if (H2(X, Y, 96) > 0.985) C = '#5a524a'; return C; },
    basaltw(X, Y) { const col = Math.floor(X / 10), i = X - col * 10, off = H2(col, 0, 97) * 40, j = (Y + off) % 22; let C = RW.mix('#1a181e', '#34303a', 1 - i / 10); if (i === 0) C = '#3e3a46'; if (j < 1) C = '#141217'; if (H2(col, Math.floor((Y + off) / 22), 98) > 0.8 && i === 9) C = '#6a2a10'; return C; },
    grottow(X, Y) { const n = N2(X / 14, Y / 30, 99), s = N2(X / 2.2, Y / 40, 100); let C = RW.mix('#1e3436', '#3a5c5e', n); if (s > 0.7) C = RW.shade(C, 0.18); if (H2(X, Y, 101) > 0.992) C = '#7ff0e0'; return C; },
    geodew(X, Y) { let d1 = 99, d2 = 99, hv = 0; const cx = Math.floor(X / 12), cy = Math.floor(Y / 12); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const ax = (cx + i) * 12 + H2(cx + i, cy + j, 102) * 10, ay = (cy + j) * 12 + H2(cy + j, cx + i, 103) * 10, d = Math.hypot(X - ax, Y - ay); if (d < d1) { d2 = d1; d1 = d; hv = H2(cx + i, cy + j, 104); } else if (d < d2) d2 = d; }
      return d2 - d1 < 1 ? '#160f22' : RW.mix('#24193a', '#4a3870', hv * 0.8 + (d1 < 3 ? 0.2 : 0)); },
  };
  const WALLKEY = {}; Object.entries(WL).forEach(([k, id]) => { WALLKEY[id] = k; });
  function wallTile(id, wx, wy) {
    const key = id + ',' + (wx & 63) + ',' + (wy & 63); let c = wallCache.get(key); if (c) return c;
    if (wallCache.size > 2500) wallCache.clear();
    c = mk(TS, TS); const g = c.ctx, f = WALLPAINT[WALLKEY[id]];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(g, x, y, f((wx & 63) * 16 + x, (wy & 63) * 16 + y));
    wallCache.set(key, c); return c;
  }
  const bHills = RW.world.drawHills;
  RW.world.drawHills = function (g, cam, vw, vh) {
    const r = bHills.apply(this, arguments);
    try {
      const W = RW.world; if (!W.def || W.def.id !== 'fuzzy') return r;
      const TL = RW.TILES, tx0 = Math.floor(cam.x / TS), ty0 = Math.floor(cam.y / TS), tx1 = Math.ceil((cam.x + vw) / TS), ty1 = Math.ceil((cam.y + vh) / TS), ox = -Math.round(cam.x), oy = -Math.round(cam.y);
      for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
        const w = W.getBg(x, y); if (!WALLKEY[w]) continue;
        if (TL[W.get(x, y)].solid && TL[W.get(x, y - 1)].solid && TL[W.get(x, y + 1)].solid && TL[W.get(x - 1, y)].solid && TL[W.get(x + 1, y)].solid) continue;
        g.drawImage(wallTile(w, x, y), x * TS + ox, y * TS + oy);
      }
    } catch (e) { /* never stop the frame */ }
    return r;
  };

  // ---- hanging roots, stalactites, stalagmites, lichen ----
  const X = A.decorExtra;
  const ROOTC = ['#2a1a10', '#3e2818', '#5a3c22', '#76522e', '#946a3e'];
  X.hroot = (g, t, x, y, time, h, wx, wy) => {
    const W = RW.world, above = W.get(wx, wy - 1) === T_HROOT, below = W.get(wx, wy + 1) === T_HROOT;
    let depth = 0; for (let k = 1; k < 8 && W.get(wx, wy - k) === T_HROOT; k++) depth++;
    const n = 4 + Math.floor(H2(wx, 0, 111) * 3);
    for (let s = 0; s < n; s++) {
      const len = H2(wx, s, 112);                                  // how far down this strand reaches (in blocks)
      const reach = 1 + len * 5; if (depth >= reach) continue;
      const end = below && depth + 1 < reach ? 16 : Math.round(4 + H2(wx, s + 9, 113) * 10);
      let sx = 2 + (s / n) * 12 + Math.sin(wy * 0.9 + s) * 1.5, thick = depth < 1 && s % 2 === 0 ? 2 : 1;
      const sway = Math.sin(time * 0.8 + wx * 0.7 + s) * 0.4;
      for (let j = 0; j < end; j++) {
        const xx = Math.round(sx + Math.sin((wy * 16 + j) * 0.25 + s * 2) * 1.1 + sway * (depth + j / 16));
        px(g, x + xx, y + j, ROOTC[3 - (s % 2)]); if (thick > 1) px(g, x + xx + 1, y + j, ROOTC[1]);
        if (H2(wx * 16 + xx, wy * 16 + j, 114) > 0.93) { px(g, x + xx - 1, y + j + 1, ROOTC[2]); px(g, x + xx - 2, y + j + 2, ROOTC[2]); }  // a rootlet
      }
      if (end < 16) { px(g, x + Math.round(sx), y + end, ROOTC[4]); }  // a pale tip
    }
    if (!above) for (let i = 0; i < 16; i++) if (H2(wx * 16 + i, wy, 115) > 0.35) px(g, x + i, y, ROOTC[1 + (i % 2)]); // where they come out of the roof
  };
  // the cone takes its colour from the rock it hangs from / stands on
  const rockCols = (id) => { const t = RW.TILES[id]; return t && t.colors ? t.colors : ['#5d5a60', '#6b676c', '#4d4a52']; };
  const cone = (g, x, y, wx, wy, down, cols) => {
    const w = 3 + Math.floor(H2(wx, wy, 121) * 4), L = 8 + Math.floor(H2(wy, wx, 122) * 8), cx = 4 + Math.floor(H2(wx, wy, 123) * 8);
    for (let j = 0; j < L; j++) { const half = Math.max(0, Math.round(w * (1 - j / L))); const yy = down ? y + j : y + 15 - j;
      for (let i = -half; i <= half; i++) px(g, x + cx + i, yy, i < 0 ? cols[1] : i === half ? cols[2] : cols[0]);
      if (half >= 1) px(g, x + cx - half, yy, RW.shade(cols[1], 0.15)); }
    if (down) px(g, x + cx, y + L, '#a8d8f0');                       // a drop of water at the tip
  };
  X.stalac = (g, t, x, y, time, h, wx, wy) => cone(g, x, y, wx, wy, true, rockCols(RW.world.get(wx, wy - 1)));
  X.stalag = (g, t, x, y, time, h, wx, wy) => cone(g, x, y, wx, wy, false, rockCols(RW.world.get(wx, wy + 1)));
  X.lichen = (g, t, x, y, time, h, wx, wy) => {
    const W = RW.world, S = (a, b) => RW.TILES[W.get(a, b)].solid, sides = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([a, b]) => S(wx + a, wy + b));
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.3 + wx * 0.9 + wy * 1.7);
    sides.forEach(([a, b]) => { for (let k = 0; k < 9; k++) { const u = H2(wx * 4 + k, wy + a * 3 + b, 131) * 15, d = H2(wy * 4 + k, wx + b, 132) * 4;
      const xx = a ? (a < 0 ? d : 15 - d) : u, yy = b ? (b < 0 ? d : 15 - d) : u; const col = k % 3 === 0 ? (pulse > 0.6 ? '#d8fff4' : '#9ff0e0') : k % 3 === 1 ? '#3fc4b0' : '#2a8a84';
      px(g, x + xx, y + yy, col); if (k % 4 === 0) px(g, x + xx + 1, y + yy, '#2a8a84'); } });
  };
  // ======================= 2. CUSTOM CAVES =======================
  // The old caves had straight shafts down from the surface: those are gone. Each region is filled back in with its
  // own rock, then carved to its own plan, and reached by a sloping, switchbacking passage you can walk down.
  {
    const baseCaves = RW.surface.caves;
    RW.surface.caves = function (c, opt) { if (opt && opt.worms === 46 && opt.mouths && opt.mouths[0] === 150) opt = Object.assign({}, opt, { mouths: [] }); return baseCaves.call(this, c, opt); };
  }
  const CZ = { gal: 'galleries', root: 'roothollow', magma: 'magmahall', grotto: 'grotto', geode: 'geode' };
  def.zones[CZ.gal] = { name: 'The Sandstone Galleries', music: 'caves' };
  def.zones[CZ.root] = { name: 'The Root Hollows', music: 'caves' };
  def.zones[CZ.magma] = { name: 'The Magma Halls', music: 'caves' };
  def.zones[CZ.grotto] = { name: 'The Flooded Grottos', music: 'caves' };
  def.zones[CZ.geode] = { name: 'A Crystal Geode', music: 'caves' };
  {
    const baseGen = def.generate;
    def.generate = function (seed) {
      const gen = baseGen.apply(this, arguments);
      try { if (gen.W === 1200) customCaves(gen, seed || 1337); } catch (e) { console.warn('fuzzy caves v24', e); }
      return gen;
    };
  }
  function customCaves(gen, seed) {
    const W = gen.W, H = gen.H, fg = gen.fg, bg = gen.bg, M = gen.meta, T = RW.T, TL = RW.TILES, WLB = RW.W;
    const surf = (x) => Math.round(M.surf[RW.clamp(Math.round(x), 0, W - 1)]);
    let rs = (seed * 9301 + 4917) % 233280; const rng = () => { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };
    const inb = (x, y) => x >= 1 && y >= 1 && x < W - 1 && y < H - 6;
    const get = (x, y) => (inb(x, y) ? fg[y * W + x] : T.bedrock), set = (x, y, t) => { if (inb(x, y)) fg[y * W + x] = t; };
    const getb = (x, y) => (inb(x, y) ? bg[y * W + x] : 0), setb = (x, y, w) => { if (inb(x, y)) bg[y * W + x] = w; };
    const NAT_WALL = new Set([0, WLB.cave, WLB.deep, WLB.crystal, WLB.dirt, WLB.mud, WLB.sandw, WLB.sea].concat(Object.values(WL)));
    const NO_GO = [[144, 214, 0, 150], [864, 934, 0, 160]];                 // the two scorpion dens
    const guarded = (x, y) => !NAT_WALL.has(getb(x, y)) || NO_GO.some(([a, b, c, d]) => x >= a && x <= b && y >= c && y <= d);
    const RECOLOR = new Set(['stone', 'deepstone', 'dirt', 'sandstone', 'sand', 'mud', 'clay', 'hardsand', 'gravel'].map((k) => T[k]).filter((v) => v != null).concat(Object.values(TID)));
    const isRock = (t) => t !== T.bedrock && TL[t].solid && !!TL[t].colors && !TL[t].chest && !TL[t].decor && !/brick|plank|plate/.test(TL[t].tex || '');
    const soft = (t) => t === T.air || t === T.water || t === T.lava || (!TL[t].solid && !TL[t].chest && TL[t].key !== 'woodchest');
    const carvable = (t) => soft(t) || isRock(t) || (TL[t].decor === 'crystal');
    const zones = (M.v2caves = []), falls = (M.v2lavafalls = []), chestsOut = [];
    const CHEST = T.woodchest;
    // fill a region with its own rock (ores stay; chests are taken out and put back on a floor later)
    function refill(x0, x1, y0f, y1, pickRock, wall) {
      for (let x = x0; x <= x1; x++) { const ya = typeof y0f === 'function' ? y0f(x) : y0f;
        for (let y = ya; y <= y1; y++) { if (!inb(x, y) || guarded(x, y)) continue;
          const edge = Math.min(x - x0, x1 - x, y - ya, y1 - y); if (edge < 7 && edge < RW.noise2(x / 6, y / 6, seed + 31) * 9) continue;   // a ragged outline, not a box
          const t = get(x, y);
          if (TL[t].chest || t === CHEST) { chestsOut.push(t); set(x, y, pickRock(x, y)); }
          else if (RECOLOR.has(t) || soft(t)) set(x, y, pickRock(x, y));
          setb(x, y, wall); } }
    }
    const carveDisc = (cx, cy, r, wall, fill) => { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { if ((x - cx) ** 2 + (y - cy) ** 2 > r * r || !inb(x, y) || guarded(x, y)) continue; if (carvable(get(x, y))) { set(x, y, fill == null ? T.air : fill); if (wall && y > surf(x)) setb(x, y, wall); } } };
    const tunnel = (pts, r, wall) => { for (let i = 0; i + 1 < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2); for (let k = 0; k <= n; k++) { const t = k / n; carveDisc(ax + (bx - ax) * t, ay + (by - ay) * t, r + Math.sin((i * 7 + k) * 0.3) * 0.25, wall); } } };
    // a chamber: a flattened oval with a rough roof and a flat-ish floor
    const chamber = (cx, cy, rx, ry, wall, floorCut) => { for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 - (RW.noise2(x / 4, y / 4, seed + 7) - 0.5) * 0.45; if (e > 1) continue; if (floorCut != null && y > cy + ry * floorCut) continue;
      if (inb(x, y) && !guarded(x, y) && carvable(get(x, y))) { set(x, y, T.air); setb(x, y, wall); } } };
    // a walkable way down from the surface: legs no steeper than ~30 degrees that switch back and forth
    function entrance(x0, tx, ty, wall, span) {
      const pts = [[x0, surf(x0) - 2]]; let x = x0, y = surf(x0) + 1, dir = tx >= x0 ? 1 : -1; pts.push([x + dir * 3, y]);
      x += dir * 3; span = span || 14;
      while (y < ty - 1) { const dy = Math.min(span * 0.55, ty - y); const nx = x + dir * span; pts.push([nx, y + dy]); x = nx; y += dy; if (y < ty - 1) { const want = tx > x ? 1 : -1; dir = Math.abs(tx - x) > span * 1.6 ? want : -dir; } }
      pts.push([tx, ty]);
      // the mouth: a wide arch with a lip
      for (let k = -2; k <= 3; k++) carveDisc(x0 + k * Math.sign(pts[1][0] - x0 || 1), surf(x0) - 1 + Math.abs(k) * 0.4, 2.6, wall);
      tunnel(pts, 2.3, wall);
      return pts;
    }
    const placeChests = (box, n) => { for (let tries = 0; tries < 400 && n > 0; tries++) { const x = box[0] + Math.floor(rng() * (box[1] - box[0])), y = box[2] + Math.floor(rng() * (box[3] - box[2]));
      if (get(x, y) === T.air && get(x, y - 1) === T.air && TL[get(x, y + 1)].solid && !guarded(x, y)) { set(x, y, CHEST != null ? CHEST : T.air); n--; } } return n; };
    const dress = (x0, x1, y0, y1, opts) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (!inb(x, y) || guarded(x, y) || get(x, y) !== T.air || (opts.deep && y < surf(x) + 10)) continue; const h = RW.hash2(x, y, seed + 211), up = get(x, y - 1), dn = get(x, y + 1);
        if (isRock(up) && get(x, y + 1) === T.air) { if (opts.roots && h < opts.roots) { const L = 1 + Math.floor(RW.hash2(x, 3, seed) * 4); for (let k = 0; k < L && get(x, y + k) === T.air && get(x, y + k + 1) === T.air; k++) set(x, y + k, T_HROOT); continue; }
          if (h > 1 - (opts.stalac || 0)) { set(x, y, T_STALAC); continue; } }
        if (isRock(dn) && get(x, y - 1) === T.air) { if (opts.caps && h < opts.caps && T.glowcap != null) { set(x, y, T.glowcap); continue; } if (h > 1 - (opts.stalag || 0)) { set(x, y, T_STALAG); continue; }
          if (opts.crystals && h < opts.crystals) { set(x, y, RW.hash2(y, x, 7) < 0.7 ? opts.crystal1 : opts.crystal2); continue; } }
        if (opts.lichen && h > 0.5 && h < 0.5 + opts.lichen && [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([a, b]) => isRock(get(x + a, y + b)))) set(x, y, T_LICHEN);
      }
    };

    // ---------- A. the Sandstone Galleries, under the desert ----------
    {
      const S = [TID.strata_a, TID.strata_b, TID.strata_c, TID.strata_a, TID.strata_d, TID.strata_b, TID.strata_c];
      const rock = (x, y) => { const b = Math.floor((y + Math.sin(x / 17) * 3 + RW.noise2(x / 30, y / 12, seed + 3) * 4) / 3); return RW.hash2(x, y, seed + 5) < 0.012 ? TID.fossilrock : S[((b % S.length) + S.length) % S.length]; };
      refill(34, 142, (x) => surf(x) + 8, 176, rock, WL.stratw);
      const LV = [[124, 46, 138], [141, 40, 140], [158, 48, 134]];        // floor y, x from, x to
      LV.forEach(([fy, a, b], li) => {
        for (let x = a; x <= b; x++) {
          if ((x - a) % 17 >= 15 && x > a + 6 && x < b - 6 && li !== 0) continue;                       // pillars
          const ph = ((x - a) % 17) / 15, hgt = 3 + Math.round(Math.sin(Math.PI * Math.min(1, ph)) * 4 + RW.noise2(x / 5, li, seed + 11) * 1.6);   // arches between the pillars
          const f = fy + Math.round(Math.sin(x / 13 + li) * 0.8);
          for (let y = f - hgt; y < f; y++) if (carvable(get(x, y))) { set(x, y, T.air); setb(x, y, WL.stratw); }
          if (RW.hash2(x, li, seed + 13) < 0.35 && T.sand != null) set(x, f, T.sand);                     // drifts of sand on the floor
        }
      });
      // ramps between the levels, at alternate ends
      tunnel([[134, 121], [120, 130], [112, 138]], 2.1, WL.stratw);
      tunnel([[48, 138], [60, 146], [70, 155]], 2.1, WL.stratw);
      tunnel([[40, 138], [26, 144]], 2, WL.stratw);                          // out west, towards the old caves
      tunnel([[100, 155], [92, 166], [84, 178], [78, 186]], 2, WL.stratw);    // and down to the deep
      entrance(96, 118, 121, WL.stratw, 13);
      dress(34, 142, 100, 176, { stalac: 0.08, stalag: 0.03 });
      zones.push({ z: CZ.gal, x0: 34, x1: 142, y0: 112, y1: 176 });
    }

    // ---------- B. the Root Hollows, under Tuftwood Forest (and the Deep Tanglewood) ----------
    const rootHollows = (x0, x1, yTop, chain) => {
      const rock = (x, y) => (RW.noise2(x / 14, y / 10, seed + 21) > 0.62 || y > 158 + RW.noise2(x / 9, 2, seed) * 12 ? TID.rootstone : TID.loam);
      refill(x0, x1, (x) => Math.max(surf(x) + 10, yTop - 14), 172, rock, WL.rootw);
      let prev = null;
      chain.forEach(([cx, cy, rx, ry]) => { chamber(cx, cy, rx, ry, WL.rootw, 0.55); if (prev) tunnel([[prev[0], prev[1] + prev[3] * 0.3], [(prev[0] + cx) / 2, (prev[1] + cy) / 2 + 1], [cx, cy + ry * 0.3]], 2.1, WL.rootw); prev = [cx, cy, rx, ry]; });
      dress(x0, x1, yTop - 16, 172, { roots: 0.42, caps: 0.16, stalag: 0.02 });
    };
    {
      const chain = []; for (let i = 0; i < 8; i++) chain.push([250 + i * 20 + Math.round(rng() * 6), Math.max(surf(250 + i * 20) + 18, 128 + Math.round(Math.sin(i * 1.3) * 9)), 7 + Math.round(rng() * 3), 4 + Math.round(rng() * 2)]);
      [[300, 158, 9, 5], [334, 160, 8, 5], [366, 156, 9, 5]].forEach((c) => chain.push(c));
      rootHollows(236, 404, 116, chain);
      tunnel([[chain[7][0], chain[7][1]], [416, chain[7][1] + 4]], 2, WL.rootw);
      tunnel([[chain[0][0], chain[0][1]], [226, chain[0][1] + 6]], 2, WL.rootw);
      entrance(262, chain[0][0] + 2, chain[0][1] + 1, WL.rootw, 13);
      zones.push({ z: CZ.root, x0: 236, x1: 404, y0: 104, y1: 172 });
      const chain2 = []; for (let i = 0; i < 9; i++) { const cx = 772 + i * 22; if (cx > 858 && cx < 940) continue; chain2.push([cx, 142 + Math.round(Math.sin(i) * 7), 8 + Math.round(rng() * 3), 5 + Math.round(rng() * 2)]); }
      rootHollows(762, 972, 128, chain2);
      entrance(950, chain2[chain2.length - 1][0], chain2[chain2.length - 1][1], WL.rootw, 12);
      zones.push({ z: CZ.root, x0: 762, x1: 972, y0: 116, y1: 172 });
    }

    // ---------- C. the Magma Halls, under the Tall Peaks ----------
    {
      const cx = 482, cy = surf(479) + 50, rx = 33, ry = 12;
      const rock = (x, y) => TID.basalt;
      refill(418, 544, (x) => surf(x) + 10, cy + 30, rock, WL.basaltw);
      chamber(cx, cy, rx, ry, WL.basaltw, null);
      const lakeY = cy + 4;
      for (let y = lakeY; y <= cy + ry + 1; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) if (get(x, y) === T.air) set(x, y, T.lava);
      // basalt columns rising out of the lava: stepping stones, and a few that reach the roof
      for (let k = 0; k < 9; k++) { const x = cx - rx + 6 + k * 7, top = k % 3 === 1 ? cy - ry - 2 : lakeY - 1 - (k % 2); for (let y = top; y <= cy + ry + 2; y++) for (let i = 0; i < 3; i++) if (inb(x + i, y) && (get(x + i, y) === T.air || get(x + i, y) === T.lava)) set(x + i, y, TID.basalt); }
      // the far ledge, with a chest
      for (let x = cx + rx - 6; x <= cx + rx + 3; x++) for (let y = lakeY - 1; y <= lakeY + 4; y++) set(x, y, TID.basalt);
      if (CHEST != null) set(cx + rx - 2, lakeY - 2, CHEST);
      // magma rock next to the lava
      for (let y = cy - ry - 4; y <= cy + ry + 5; y++) for (let x = cx - rx - 4; x <= cx + rx + 4; x++) if (get(x, y) === TID.basalt) { let near = false; for (let j = -2; j <= 2 && !near; j++) for (let i = -2; i <= 2; i++) if (get(x + i, y + j) === T.lava) { near = true; break; } if (near) set(x, y, TID.magmarock); }
      // lavafalls from cracks in the roof
      [cx - 22, cx - 2, cx + 19].forEach((fx) => { let y = cy; while (y > cy - ry - 6 && get(fx, y - 1) === T.air) y--; if (get(fx, y - 1) !== T.air) falls.push({ x: fx + 0.5, y0: y, y1: lakeY }); for (let j = 1; j <= 2; j++) set(fx, y - j, TID.magmarock); });
      // the lava tube down from the mountainside, and a way out east
      entrance(438, cx - rx + 2, cy - 2, WL.basaltw, 12);
      tunnel([[cx + rx, cy - 3], [cx + rx + 8, cy + 2], [cx + rx + 14, cy + 9]], 2.1, WL.basaltw);
      dress(418, 544, cy - ry - 8, cy + 30, { stalac: 0.06, stalag: 0.03 });
      zones.push({ z: CZ.magma, x0: 418, x1: 544, y0: cy - ry - 16, y1: cy + 30 });
    }

    // ---------- D. the Flooded Grottos, under the Tanglewood ----------
    {
      refill(556, 744, (x) => surf(x) + 14, 186, () => TID.grotto, WL.grottow);
      const ch = []; for (let i = 0; i < 7; i++) ch.push([572 + i * 26 + Math.round(rng() * 6), 138 + Math.round(Math.sin(i * 1.7) * 10) + (i % 2) * 8, 9 + Math.round(rng() * 3), 6 + Math.round(rng() * 2)]);
      let prev = null; ch.forEach(([cx, cy, rx, ry]) => { chamber(cx, cy, rx, ry, WL.grottow, null); if (prev) tunnel([[prev[0], prev[1] + 2], [(prev[0] + cx) / 2, Math.max(prev[1], cy) + 4], [cx, cy + 2]], 2, WL.grottow); prev = [cx, cy]; });
      // flood the bottom of each chamber (the dips between them fill too)
      ch.forEach(([cx, cy, rx, ry]) => { const wl = cy + 1; for (let y = wl; y <= cy + ry + 6; y++) for (let x = cx - rx - 14; x <= cx + rx + 14; x++) if (get(x, y) === T.air && getb(x, y) === WL.grottow) set(x, y, T.water); });
      tunnel([[ch[0][0], ch[0][1] - 2], [546, ch[0][1] + 2]], 2, WL.grottow);
      tunnel([[ch[6][0], ch[6][1] - 2], [752, ch[6][1] + 4]], 2, WL.grottow);
      entrance(552, ch[0][0] - 4, ch[0][1] - 3, WL.grottow, 12);
      dress(556, 744, 110, 186, { stalac: 0.1, stalag: 0.02, crystals: 0.07, crystal1: T.c_blue, crystal2: T.c_green, lichen: 0.08 });
      zones.push({ z: CZ.grotto, x0: 556, x1: 744, y0: 120, y1: 186 });
    }

    // ---------- E. crystal geodes, deep down ----------
    for (let i = 0; i < 9; i++) {
      const cx = 70 + i * 125 + Math.round(rng() * 40), cy = 222 + Math.round(rng() * 56), rx = 8 + Math.round(rng() * 3), ry = 6 + Math.round(rng() * 2);
      if (cx > W - 20) continue;
      for (let y = cy - ry - 3; y <= cy + ry + 3; y++) for (let x = cx - rx - 3; x <= cx + rx + 3; x++) {
        if (!inb(x, y) || guarded(x, y)) continue; const e = Math.sqrt(((x - cx) / (rx + 2)) ** 2 + ((y - cy) / (ry + 2)) ** 2);
        if (e > 1) continue; setb(x, y, WL.geodew);
        if (e > 0.82) { if (carvable(get(x, y))) set(x, y, TID.agate); } else if (e > 0.66) set(x, y, TID.amethyst); else set(x, y, T.air);
      }
      for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) { if (get(x, y) !== T.air) continue; const h = RW.hash2(x, y, seed + 301);
        if ((get(x, y + 1) === TID.amethyst || get(x, y - 1) === TID.amethyst) && h < 0.45) set(x, y, h < 0.06 ? T.c_gold : h < 0.32 ? T.c_purple : T.c_blue); }
      // a crack out to the nearest cave
      for (const d of [1, -1]) { let k = rx + 3; while (k < 40 && carvable(get(cx + d * k, cy)) && get(cx + d * k, cy) !== T.air) k++; if (get(cx + d * k, cy) === T.air) { tunnel([[cx + d * (rx - 1), cy + ry * 0.4], [cx + d * k, cy]], 1.6, null); break; } }
      zones.push({ z: CZ.geode, x0: cx - rx - 2, x1: cx + rx + 2, y0: cy - ry - 2, y1: cy + ry + 2 });
    }

    // ---------- everywhere else underground: stalactites and stalagmites ----------
    dress(2, W - 3, 0, H - 8, { stalac: 0.035, stalag: 0.015, deep: true });
    // put back any chests the new rock swallowed
    const left = placeChests([34, 142, 110, 176], chestsOut.length >> 2) + placeChests([236, 404, 110, 172], chestsOut.length >> 2) + placeChests([556, 744, 110, 140], chestsOut.length - 2 * (chestsOut.length >> 2));
    M.v2cavesMade = { chests: chestsOut.length, notPlaced: left };
  }
  {
    const a0 = def.ambientAt, AMB = { [CZ.gal]: 0.42, [CZ.root]: 0.42, [CZ.magma]: 0.3, [CZ.grotto]: 0.34, [CZ.geode]: 0.4 };
    def.ambientAt = function (x, y) { const b = a0.call(this, x, y); const z = def.zoneAt(x, y); return AMB[z] ? Math.max(b, AMB[z]) : b; };
  }
  // ---- zones: the themed caves name themselves; creatures of the caves live in them too ----
  {
    const z0 = def.zoneAt;
    def.zoneAt = function (x, y) {
      const z = z0.call(this, x, y);
      if (z !== 'caves' && z !== 'deep') return z;
      const L = RW.world && RW.world.def === def && RW.world.meta && RW.world.meta.v2caves; if (!L) return z;
      for (let i = L.length - 1; i >= 0; i--) { const b = L[i]; if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return b.z; }
      return z;
    };
    const EXTRA = { [CZ.magma]: ['ember_crawler'], [CZ.grotto]: ['spiky_fish', 'jungle_slime'], [CZ.geode]: ['crystal_crawler'] };
    Object.values(RW.SPECIES).forEach((s) => { const sp = s.spawn; if (!sp || !(sp.worlds || []).includes('fuzzy') || !sp.zones || !sp.zones.includes('caves')) return; [CZ.gal, CZ.root, CZ.magma, CZ.grotto].forEach((z) => { if (!sp.zones.includes(z)) sp.zones.push(z); }); });
    Object.entries(EXTRA).forEach(([z, ids]) => ids.forEach((id) => { const s = RW.SPECIES[id]; if (s && s.spawn) { s.spawn.worlds = Array.from(new Set((s.spawn.worlds || []).concat('fuzzy'))); if (!s.spawn.zones.includes(z)) s.spawn.zones.push(z); } }));
  }
  // ======================= 3. LAVA THAT FLOWS =======================
  // Lava works like water, only slower and hungrier: dig next to it and it creeps out, pours off ledges and spreads
  // when there's lava piled behind it. Plants in its way burn. Where it meets water it hardens into Cooling Crust
  // (glowing, hot to stand on), which goes dark as basalt after a while.
  {
    const WD = RW.world;
    const lActive = new Set(), crustT = new Map();
    const bWake = WD.wakeWater;
    WD.wakeWater = function (x, y) {
      bWake.apply(this, arguments);
      const L = RW.T.lava; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (WD.inb(xx, yy) && WD.fg[yy * WD.W + xx] === L) lActive.add(yy * WD.W + xx); }
    };
    const burnable = (t) => { const q = RW.TILES[t]; return t !== RW.T.air && t !== RW.T.water && t !== RW.T.lava && !q.solid && !q.chest && !q.liquid && q.key !== 'woodchest' && q.decor !== 'crystal' && q.decor !== 'bigcrystal'; };
    const steam = (x, y) => { for (let k = 0; k < 6; k++) RW.fx.spawn({ x: x * TS + Math.random() * TS, y: y * TS + Math.random() * 6, vx: RW.rand(-20, 20), vy: -RW.rand(20, 60), life: 0.9, color: RW.pick(['#e8eef4', '#c8d0d8', '#ffffff']), size: 3, kind: 'smoke' }); };
    const embers = (x, y, n) => { for (let k = 0; k < n; k++) RW.fx.spawn({ x: x * TS + Math.random() * TS, y: y * TS + Math.random() * TS, vx: RW.rand(-30, 30), vy: -RW.rand(30, 80), life: 0.7, color: RW.pick(['#ffb347', '#ff7a1e', '#ffe08a']), add: true, kind: 'ember' }); };
    let tickT = 0, tick = 0, scanT = 0, hotT = 0, fallHurtT = 0;
    function lavaTick() {
      const T = RW.T, L = T.lava, Wd = WD.W, fgA = WD.fg;
      const at = (x, y) => (WD.inb(x, y) ? fgA[y * Wd + x] : T.bedrock);
      const open = (x, y) => { const t = at(x, y); return t === T.air || burnable(t); };
      const list = Array.from(lActive); lActive.clear(); list.sort((a, b) => b - a); tick++;
      let moves = 0;
      for (const i of list) {
        if (fgA[i] !== L) continue; if (moves > 80) { lActive.add(i); continue; }
        const x = i % Wd, y = (i / Wd) | 0;
        // water: the lava hardens, the water above it boils away
        let quenched = false;
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) if (at(x + dx, y + dy) === T.water) { quenched = true; if (dy === -1) WD.setTile(x, y - 1, T.air); }
        if (quenched) { WD.setTile(x, y, RW.T.crust); crustT.set(i, performance.now()); steam(x, y); RW.audio && RW.audio.sfx && RW.audio.sfx('splash'); continue; }
        let to = null; const dirs = (x + y + tick) & 1 ? [1, -1] : [-1, 1];
        if (open(x, y + 1)) to = [x, y + 1];
        else {
          for (const d of dirs) if (open(x + d, y) && open(x + d, y + 1)) { to = [x + d, y]; break; }
          if (!to && at(x, y - 1) === L) for (const d of dirs) { let k = 1; while (k <= 8 && at(x + d * k, y) === L) k++; if (k <= 8 && open(x + d * k, y)) { to = [x + d * k, y]; break; } }
        }
        if (!to) continue;
        const was = at(to[0], to[1]); if (was !== T.air) embers(to[0], to[1], 6);
        WD.setTile(x, y, T.air); WD.setTile(to[0], to[1], L); moves++;
        lActive.add(to[1] * Wd + to[0]);
      }
    }
    const bFlow = WD.flowWater;
    WD.flowWater = function (dt) {
      const r = bFlow.apply(this, arguments);
      try {
        const T = RW.T; if (!WD.def) return r;
        const auth = !(RW.net && RW.net.transport && RW.sync && !RW.sync.auth);
        if ((tickT -= dt) <= 0 && lActive.size) { tickT = 0.28; if (auth) lavaTick(); else lActive.clear(); }
        // crust cools to basalt
        if ((scanT -= dt) <= 0) { scanT = 1; const now = performance.now();
          crustT.forEach((t0, i) => { if (WD.fg[i] !== T.crust) { crustT.delete(i); return; } if (now - t0 > 25000 && auth) { WD.setTile(i % WD.W, (i / WD.W) | 0, TID.basalt); crustT.delete(i); } });
          const p = P.center(), x0 = Math.floor(p.x / TS) - 30, y0 = Math.floor(p.y / TS) - 20;
          for (let y = y0; y < y0 + 40; y++) for (let x = x0; x < x0 + 60; x++) if (WD.inb(x, y) && WD.fg[y * WD.W + x] === T.crust && !crustT.has(y * WD.W + x)) crustT.set(y * WD.W + x, now);
        }
        // standing on hot crust or magma rock burns
        if ((hotT -= dt) <= 0 && !P.dead) { const fy = Math.floor((P.y + P.h + 2) / TS); let hot = false; for (let x = Math.floor(P.x / TS); x <= Math.floor((P.x + P.w - 1) / TS); x++) if (RW.TILES[WD.get(x, fy)].hot) hot = true;
          if (hot) { hotT = 0.7; P.hurt(P.species === 'rock' ? 2 : 4, 0, 'lava'); RW.fx.text(P.center().x, P.y - 6, 'Hot!', '#ff9a4a'); } else hotT = 0.1; }
        // lavafalls burn
        const F = WD.def.id === 'fuzzy' && WD.meta && WD.meta.v2lavafalls;
        if (F && (fallHurtT -= dt) <= 0 && !P.dead) { const p = P.center(); F.forEach((f) => { if (Math.abs(p.x - f.x * TS) < 10 + P.w / 2 && p.y > f.y0 * TS && p.y < f.y1 * TS) { fallHurtT = 0.45; P.hurt(P.species === 'rock' ? 7 : 14, Math.sign(p.x - f.x * TS) || 1, 'lava'); } }); }
      } catch (e) { /* never stop the frame */ }
      return r;
    };

    // ---- how lava looks: a molten flow under drifting dark crust, a bright rippling top, falling streams ----
    const PER = 64, NF = 8, frames = [], fallFrames = [];
    const MOLT = ['#3a0c06', '#5e1408', '#8a200a', '#b83410', '#e05a14', '#ff8a24', '#ffb84a', '#ffe08a'];
    function buildLava() {
      const tw = Math.PI * 2 / PER;
      for (let f = 0; f < NF; f++) {
        const c = mk(PER, PER), g = c.ctx, ph = (f / NF) * Math.PI * 2;
        // plates of dark crust drifting on the melt, bright cracks between them (cells wrap round the 64px tile)
        const NC = 3, cells = []; for (let j = 0; j < NC; j++) for (let i = 0; i < NC; i++) { const h1 = RW.hash2(i, j, 421), h2 = RW.hash2(j, i, 422); cells.push([(i + 0.5 + Math.cos(ph + h1 * 6.28) * 0.18 + (h1 - 0.5) * 0.4) * PER / NC, (j + 0.5 + Math.sin(ph + h2 * 6.28) * 0.18 + (h2 - 0.5) * 0.4) * PER / NC, RW.hash2(i, j, 423)]); }
        for (let y = 0; y < PER; y++) for (let x = 0; x < PER; x++) {
          let d1 = 1e9, d2 = 1e9, hv = 0;
          for (const [cx, cy, h] of cells) { let dx = Math.abs(x - cx), dy = Math.abs(y - cy); dx = Math.min(dx, PER - dx); dy = Math.min(dy, PER - dy); const d = Math.hypot(dx, dy); if (d < d1) { d2 = d1; d1 = d; hv = h; } else if (d < d2) d2 = d; }
          const gap = d2 - d1, swirl = Math.sin(x * tw * 3 + Math.sin(y * tw * 2 + ph) * 2 + ph);
          let lv = gap < 1.0 ? 7 : gap < 2.2 ? 6 : gap < 3.6 ? 5 : gap < 5 ? 4 : hv < 0.3 ? 4 + (swirl > 0.5 ? 1 : 0) : 2 + (swirl > 0.4 ? 1 : 0) - (d1 < 4 && hv > 0.6 ? 1 : 0);
          if (lv <= 3 && RW.hash2(x, y, 401 + f) > 0.95) lv = 1;
          px(g, x, y, MOLT[lv]);
        }
        frames.push(c);
        const d = mk(16, PER), q = d.ctx;   // a falling stream: streaks running down
        for (let y = 0; y < PER; y++) for (let x = 0; x < 16; x++) { const s = Math.sin(x * 1.3 + 2) * 0.5 + Math.sin(((y + f * 8) % PER) * tw * 4 + x * 0.9) * 0.8; const lv = x < 2 || x > 13 ? 2 : s > 0.6 ? 7 : s > 0.1 ? 6 : s > -0.5 ? 5 : 4; px(q, x, y, MOLT[lv]); }
        fallFrames.push(d);
      }
    }
    const bDecor = A.drawDecor;
    A.drawDecor = function (g, t, sx, sy, time, stage, x, y) {
      if (!t || t.decor !== 'lava') return bDecor.apply(this, arguments);
      if (!frames.length) buildLava();
      const W = RW.world, L = RW.T.lava, up = W.get(x, y - 1), dn = W.get(x, y + 1);
      const falling = up === L && (dn === RW.T.air || (dn === L && W.get(x - 1, y) !== L && W.get(x + 1, y) !== L)) && W.get(x - 1, y) !== L && W.get(x + 1, y) !== L;
      const f = Math.floor(time * 3) % NF;
      if (falling) { const fy = Math.floor(time * 40) % PER; g.drawImage(fallFrames[f], 0, (fy + (y * 16) % PER) % (PER - 16), 16, 16, sx, sy, 16, 16); return; }
      const ox = (((x & 3) * 16 + Math.floor(time * 4)) % PER + PER) % PER, oy = (y & 3) * 16;
      const src = frames[f];
      if (ox + 16 <= PER) g.drawImage(src, ox, oy, 16, 16, sx, sy, 16, 16); else { const w1 = PER - ox; g.drawImage(src, ox, oy, w1, 16, sx, sy, w1, 16); g.drawImage(src, 0, oy, 16 - w1, 16, sx + w1, sy, 16 - w1, 16); }
      if (up !== L) { // the top: a bright skin that ripples, and bubbles that swell and pop
        for (let i = 0; i < 16; i++) { const h = 1 + Math.round(1 + Math.sin(time * 2.2 + (x * 16 + i) * 0.35)); g.fillStyle = MOLT[7]; g.fillRect(sx + i, sy, 1, h); g.fillStyle = MOLT[6]; g.fillRect(sx + i, sy + h, 1, 1); }
        const bt = (time * 0.7 + RW.hash2(x, y, 411) * 7) % 3; if (bt < 1) { const r = Math.round(bt * 3), bx = sx + 3 + Math.floor(RW.hash2(x, y, 412) * 10); g.fillStyle = MOLT[5]; g.fillRect(bx - r, sy - r, r * 2 + 1, r + 1); g.fillStyle = MOLT[7]; g.fillRect(bx - r + 1, sy - r, Math.max(1, r), 1); if (bt > 0.94) embers(x, y - 1, 2); }
      }
    };
    if (RW.T.lava != null) { RW.TILES[RW.T.lava].flicker = true; }

    // ---- lavafalls in the Magma Halls ----
    const bWater = WD.drawWater;
    WD.drawWater = function (g, cam, vw, vh, time) {
      const r = bWater.apply(this, arguments);
      try {
        const F = WD.def && WD.def.id === 'fuzzy' && WD.meta && WD.meta.v2lavafalls; if (!F) return r;
        if (!frames.length) buildLava();
        F.forEach((fl) => {
          const x = Math.round(fl.x * TS - cam.x), y0 = Math.round(fl.y0 * TS - cam.y), y1 = Math.round(fl.y1 * TS - cam.y) + 2;
          if (x < -40 || x > vw + 40 || y1 < 0 || y0 > vh) return;
          const f = Math.floor(time * 6) % NF, scroll = Math.floor(time * 60) % PER;
          for (let y = y0; y < y1; y += 16) { const h = Math.min(16, y1 - y); g.drawImage(fallFrames[f], 0, (scroll + (y - y0)) % (PER - 16), 16, h, x - 8, y, 16, h); }
          g.fillStyle = 'rgba(255,160,60,0.22)'; g.fillRect(x - 11, y0, 22, y1 - y0);
          if (Math.random() < 0.5) RW.fx.spawn({ x: fl.x * TS + RW.rand(-8, 8), y: fl.y1 * TS - 2, vx: RW.rand(-50, 50), vy: -RW.rand(40, 110), life: 0.6, color: RW.pick(['#ffb347', '#ff7a1e', '#ffe08a']), add: true, kind: 'ember' });
        });
      } catch (e) { /* never stop the frame */ }
      return r;
    };
    // the falls light the hall
    const bLight = WD.computeLight;
    WD.computeLight = function (tx0, ty0, tw, th, extra) {
      const F = WD.def && WD.def.id === 'fuzzy' && WD.meta && WD.meta.v2lavafalls;
      if (F && Array.isArray(extra)) F.forEach((fl) => { for (let y = fl.y0; y < fl.y1; y += 3) extra.push({ x: fl.x * TS, y: y * TS, r: 1, g: 0.45, b: 0.12 }); });
      return bLight.apply(this, arguments);
    };
  }
  // ======================= CLAM ART =======================
  // Side view. The bottom shell is a ribbed bowl resting on the sand, the top shell is hinged to it at the back
  // and swings up. Both lips have interlocking teeth. Inside: a glowing mantle along the lips, a pink tongue,
  // a pearl, and two little eyes on stalks that peek out when it opens.
  const CLAM = {
    snap: { L: 18, Dp: 6, shell: ['#7a3f6e', '#a85a92', '#cf86b6', '#ebb4d4', '#fbe0ee'], lip: '#5a2a50', mantle: ['#1f7a86', '#2fb2b4', '#7ff0dc'], ribs: 7 },
    grand: { L: 34, Dp: 10, shell: ['#2c3c74', '#3e5aa0', '#5a82c4', '#8eb4e0', '#cfe4f6'], lip: '#c0443a', mantle: ['#8a1f6e', '#c63c9a', '#ff9ad8'], ribs: 9, barnacles: true },
  };
  function clam(kind, open, f) {
    const K = CLAM[kind], L = K.L, Dp = K.Dp, pad = 4;
    const W = L + pad * 2 + 6, Hh = Math.ceil(Dp * 2 + L * Math.sin(0.95) + pad * 2 + 16);  // the same size for every frame, so they line up
    const c = mk(W, Hh), g = c.ctx, hx = pad, ly = Hh - pad - Dp - 1;   // the hinge, at the back of the lip line
    const squash = f && f.squash ? 1 : 0;
    // the shell's outline: a fan, fullest towards the front, round at the front edge
    const D = (u) => { if (u < 0 || u > L) return -1; const t = u / L; return (1 - 0.12 * squash) * Dp * Math.pow(Math.sin(Math.PI * (0.18 + 0.7 * t)), 0.55) * (t < 0.12 ? t / 0.12 * 0.6 + 0.4 : 1) * (t > 0.86 ? Math.sqrt(Math.max(0, 1 - ((t - 0.86) / 0.14) ** 2)) : 1); };
    const tooth = (u, off) => (((Math.floor(u) + off) % 4) < 2 ? 1.6 : 0);
    const ca = Math.cos(open), sa = Math.sin(open);
    const shellPix = (u, v, top) => { // u along, v down (bottom shell) or up (top shell, after un-rotating)
      const d = D(u); if (d < 1.2) return null;
      const teeth = tooth(u, top ? 2 : 0);
      if (v < -teeth || v > d) return null;
      // radial ribs from the hinge, light from above
      const th = Math.atan2(Math.max(0, v) + 0.5, u + 2), rib = Math.sin(th * K.ribs * 2.2 + 0.4);
      const rim = v / Math.max(1, d);
      let lv = top ? 2.6 - rim * 1.2 : 1.9 - rim * 1.3;
      lv += rib > 0.55 ? 0.8 : rib < -0.6 ? -0.7 : 0;
      if (v > d - 1.2) lv = top ? 1 : 0.4;                      // the dark curve of the shell edge
      if (v < 1) return 'lip';
      return K.shell[RW.clamp(Math.round(lv), 0, 4)];
    };
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const u = x - hx, v = y - ly;
      let col = shellPix(u, v, false);
      // top shell: rotate the pixel back by the opening angle, then mirror
      const tu = u * ca - v * sa, tv = -(u * sa + v * ca);
      const tc = shellPix(tu, tv, true);
      if (tc) col = tc === 'lip' ? (open > 0.05 ? K.mantle[1] : K.lip) : tc;
      else if (col === 'lip') col = open > 0.05 ? K.mantle[1] : K.lip;
      else if (!col && open > 0.05 && v < 0 && u > 0) {
        // inside the open mouth: between the bottom lip (v=0) and the top lip line (tv=0)
        const toTop = -tv, toBot = -v;
        if (tv < 0 && tu > 0 && tu < L * 0.94 - 0.9 * Math.min(toTop, toBot) && u < L * 0.94 - 0.9 * Math.min(toTop, toBot)) {   // the mouth's front edge curves in
          if (toTop < 2.2 || toBot < 2.2) col = (Math.floor(u) + Math.floor(v)) % 5 === 0 ? K.mantle[2] : K.mantle[1];   // the mantle, spotted
          else if (toTop < 3.2 || toBot < 3.2) col = K.mantle[0];
          else col = '#2a0e24';
        }
      }
      if (col) px(g, x, y, col);
    }
    if (open > 0.15) {
      // tongue
      const tx0 = hx + L * 0.35, tl = L * 0.32 * Math.min(1, open * 1.4);
      for (let k = 0; k < tl; k++) { const yy = ly - 2 - Math.round(Math.sin((k / tl) * Math.PI) * (2 + Dp * 0.12)); px(g, tx0 + k, yy, '#ff8aa0'); px(g, tx0 + k, yy + 1, '#d85a78'); }
      // the pearl, glowing
      const pxx = Math.round(hx + L * 0.28), pyy = Math.round(ly - 3 - Dp * 0.12);
      const pr = kind === 'grand' ? 2.6 : 1.6;
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const d = Math.hypot(i, j); if (d <= pr) px(g, pxx + i, pyy + j, d < pr - 1 ? '#fffaf0' : '#f0dcc8'); }
      px(g, pxx - 1, pyy - 1, '#ffffff');
      // eyes on stalks
      if (open > 0.3) [[0.62, 7], [0.76, 9]].forEach(([t, h0]) => {
        const sx = Math.round(hx + L * t), h = Math.round(h0 * (kind === 'grand' ? 1.6 : 1) * Math.min(1, open)), top = ly - 2 - h;
        for (let k = 0; k < h; k++) px(g, sx + Math.round(Math.sin(k * 0.5 + (f && f.look || 0)) * 0.6), ly - 2 - k, K.mantle[0]);
        const er = kind === 'grand' ? 2 : 1;
        for (let j = -er; j <= er; j++) for (let i = -er; i <= er; i++) if (i * i + j * j <= er * er + 0.5) px(g, sx + i, top + j, '#f4f0e0');
        px(g, sx + 1, top, '#120a10'); if (er > 1) px(g, sx + 1, top - 1, '#120a10');
      });
    }
    if (K.barnacles) { // barnacles and a wisp of weed on the big one's top shell
      [[0.35, 0.55], [0.5, 0.75], [0.68, 0.6], [0.2, 0.4]].forEach(([t, r], i) => {
        const u = L * t, d = D(u), lu = u, lv = d * r, xx = Math.round(hx + lu * ca - (-lv) * -sa), yy = Math.round(ly - (lu * sa + lv * ca));
        px(g, xx, yy, '#e8e0d0'); px(g, xx + 1, yy, '#b8b0a0'); px(g, xx, yy - 1, '#f8f4ea'); if (i % 2) px(g, xx + 1, yy - 1, '#8a8478');
      });
      const u = L * 0.45, lv = D(u) * 0.95; let wx = hx + u * ca + lv * sa, wy = ly - (u * sa + lv * ca);
      for (let k = 0; k < 9; k++) { px(g, Math.round(wx), Math.round(wy - k), k % 3 ? '#3a8a3a' : '#5ab05a'); wx += Math.sin(k * 0.8 + (f && f.look || 0)) * 0.7; }
    }
    const out = A.outline(c, kind === 'grand' ? '#0c1024' : '#1c0a18');
    if (f && f.bubbles) { const q = out.ctx; [[L + 6, ly - 4, 2], [L + 2, ly - 9, 1], [L + 9, ly - 1, 1]].forEach(([x, y, r]) => { if (x < W) { px(q, x, y - r, '#cfefff'); px(q, x - r, y, '#cfefff'); px(q, x + r, y, '#8ecfee'); px(q, x, y + r, '#8ecfee'); } }); }
    return out;
  }
  // frames: snapclam 0 shut, 1 ajar, 2 open, 3 wide (about to bite), 4 clap (swimming jet), 5 bite (shut hard)
  D.snapclam = () => fitFrames([[0], [0.25], [0.55, { look: 1 }], [0.9, { look: 2 }], [0, { bubbles: 1 }], [0, { squash: 1 }]].map(([a, f]) => clam('snap', a, f)));
  // grand clam: 0 shut, 1 ajar, 2 open, 3 wide (spitting), 4 slam
  D.grandclam = () => fitFrames([[0], [0.2], [0.45, { look: 1 }], [0.7, { look: 2, bubbles: 1 }], [0, { squash: 1 }]].map(([a, f]) => clam('grand', a, f)));
  // ======================= 5. CLAMS =======================
  // They live in beds on the sea floor of both oceans. A shut shell turns a hit aside (a fifth of the damage):
  // strike while it's open.
  {
    const S = R.species, B = E.behaviors, ec = E.center;
    if (!RW.ITEMS.pearl) R.items([
      { id: 'pearl', name: 'Pearl', kind: 'material', icon: { s: 'berry', a: '#f6eee0', b: '#c8b8d8' }, desc: 'A pearl from a clam on the sea floor. Smooth, cool and faintly glowing. Traders love them.', value: 30 },
      { id: 'clam_meat', name: 'Clam', kind: 'food', heal: 10, icon: { s: 'berry', a: '#ff9aa8', b: '#c85a70' }, desc: 'A soft, salty clam. Better cooked, but nobody is stopping you.' },
    ]);
    S({ id: 'snapclam', type: 'monsters', name: 'Snapclam', world: 'fuzzy', role: 'enemy', status: 'active', art: { draw: 'snapclam' },
      w: 18, h: 12, hp: 30, dmg: 9, speed: 120, behavior: 'snapclam',
      drops: [['clam_meat', 1, 1, 1], ['pearl', 0.25, 1, 1]],
      blurb: 'A little clam of the sea floor. When something comes near it claps its shell to shoot through the water and bites with a mouthful of teeth. Its shell turns hits aside: wait for it to open.' });
    S({ id: 'grandclam', type: 'monsters', name: 'Grand Clam', world: 'fuzzy', role: 'enemy', status: 'active', art: { draw: 'grandclam' },
      w: 32, h: 20, hp: 110, dmg: 14, speed: 0, behavior: 'grandclam', elite: false,
      drops: [['pearl', 0.85, 1, 2], ['clam_meat', 1, 1, 2]],
      blurb: 'A big old clam with barnacles on its back. It lies open, watching, then spits jets of bubbles and slams shut on anything that comes too close. Hit the soft part while it\'s open.' });
    const grav = (e, dt) => { const wet = RW.world.isWaterAt(e.x + e.w / 2, e.y + e.h / 2); e.vy += (wet ? 240 : 900) * dt; if (wet) { e.vy = Math.min(e.vy, 90); e.vx *= Math.pow(0.2, dt); } else e.vx *= Math.pow(0.02, dt); return wet; };
    const move = (e, dt) => { const r = E.move(e, dt, { step: false, grounded: e.ground }); e.ground = r.ground; return r; };
    const bites = (e, reach) => { const p = P.center(), c = ec(e); return !P.dead && Math.abs(p.x - (c.x + e.face * e.w * 0.4)) < reach && Math.abs(p.y - c.y) < reach; };
    B.snapclam = function (e, dt, sp) {
      const wet = grav(e, dt), p = P.center(), c = ec(e), d = Math.hypot(p.x - c.x, p.y - c.y);
      e.cs = e.cs || 'rest'; e.ct = (e.ct || 0) - dt;
      if (e.cs === 'rest') { e.fr = 0; if (d < 7 * TS && !P.dead && e.ct <= 0) { e.cs = 'peek'; e.ct = 0.5; e.face = Math.sign(p.x - c.x) || 1; } }
      else if (e.cs === 'peek') { e.fr = e.ct > 0.25 ? 1 : 2; if (e.ct <= 0) { e.cs = 'swim'; e.ct = 0; e.claps = 0; } }
      else if (e.cs === 'swim') {
        e.face = Math.sign(p.x - c.x) || e.face;
        if (e.ct <= 0) { // clap: a jet of water shoots it forward
          e.ct = 0.6; e.claps++; e.vx = e.face * (wet ? 150 : 60); e.vy = wet ? -Math.max(40, Math.min(150, (c.y - p.y) * 2 + 60)) : -120; e.clapT = 0.18;
          for (let k = 0; k < 4; k++) RW.fx.spawn({ x: c.x - e.face * 8, y: c.y, vx: -e.face * RW.rand(20, 50), vy: RW.rand(-15, 15), life: 0.8, color: '#cfefff', kind: 'bubble', add: true, size: 0 });
        }
        e.clapT = (e.clapT || 0) - dt; e.fr = e.clapT > 0 ? 4 : 2;
        if (bites(e, 20)) { e.cs = 'wind'; e.ct = 0.3; }
        else if (d > 12 * TS || e.claps > 9) { e.cs = 'rest'; e.ct = 2; }
      } else if (e.cs === 'wind') { e.fr = 3; if (e.ct <= 0) { e.cs = 'bite'; e.ct = 0.5; RW.audio.sfx('swing'); if (bites(e, 22)) P.hurt(sp.dmg, e.face, 'snapclam'); } }
      else if (e.cs === 'bite') { e.fr = 5; if (e.ct <= 0) { e.cs = 'swim'; e.ct = 0.5; } }
      e.shut = e.fr === 0 || e.fr === 4 || e.fr === 5;
      e.harmless = true;       // it only hurts with a bite
      move(e, dt);
    };
    const bubbles = [];
    B.grandclam = function (e, dt, sp) {
      grav(e, dt); e.vx = 0; const p = P.center(), c = ec(e), d = Math.hypot(p.x - c.x, p.y - c.y);
      e.cs = e.cs || 'shut'; e.ct = (e.ct == null ? 1 + Math.random() * 2 : e.ct) - dt; e.harmless = true;
      if (e.cs === 'shut') { e.fr = 0; if (e.ct <= 0) { e.cs = 'ajar'; e.ct = 0.6; } }
      else if (e.cs === 'ajar') { e.fr = 1; if (e.ct <= 0) { e.cs = 'open'; e.ct = 1.8; e.spat = 0; } }
      else if (e.cs === 'open') {
        e.fr = 2; if (d < 12 * TS) e.face = Math.sign(p.x - c.x) || e.face;
        if (d < 2.4 * TS && Math.sign(p.x - c.x) === e.face) { e.cs = 'slam'; e.ct = 0.7; RW.audio.sfx('slam'); RW.fx.shake(2, 0.15); if (bites(e, 30)) P.hurt(sp.dmg + 6, e.face, 'grandclam'); }
        else if (d < 11 * TS && e.ct < 1.0 && !e.spat) { e.cs = 'spit'; e.ct = 0.6; e.shots = 0; }
        else if (e.ct <= 0) { e.cs = 'shut'; e.ct = 2 + Math.random() * 1.5; }
      } else if (e.cs === 'spit') {
        e.fr = 3; if ((e.shotT = (e.shotT || 0) - dt) <= 0 && e.shots < 3) { e.shotT = 0.16; e.shots++;
          const a = Math.atan2(p.y - (c.y - 4), p.x - (c.x + e.face * 12)) + RW.rand(-0.12, 0.12);
          bubbles.push({ x: c.x + e.face * 14, y: c.y - 4, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, life: 1.6, r: 3 + Math.random() * 2 }); RW.audio.sfx('splash'); }
        if (e.ct <= 0) { e.cs = 'open'; e.ct = 0.8; e.spat = 1; }
      } else if (e.cs === 'slam') { e.fr = 4; if (e.ct <= 0) { e.cs = 'shut'; e.ct = 2.2; } }
      e.shut = e.fr === 0 || e.fr === 4;
      move(e, dt);
    };
    // a shut shell turns the hit aside
    const bDamage = E.damage;
    E.damage = function (e, d, dir, knock, crit, color) {
      if (e && !e.dead && (e.sp === 'snapclam' || e.sp === 'grandclam') && e.shut && d > 1) {
        d = Math.max(1, Math.round(d * 0.2)); knock = 0; const c = ec(e); RW.fx.text(c.x, e.y - 8, 'CLINK', '#e8e0f0'); RW.audio.sfx('mine');
        if (!(P.seen && P.seen.v2_clam)) { P.seen = P.seen || {}; P.seen.v2_clam = 1; U.toast('The shell turns your hit aside. Wait for the clam to open, then strike.'); }
      }
      return bDamage.call(this, e, d, dir, knock, crit, color);
    };
    // the beds, and the bubble jets
    const bedKey = (i) => 'clam_' + i;
    let bedT = 0;
    const bUpd = E.updateEnemies;
    E.updateEnemies = function (dt) {
      const r = bUpd.apply(this, arguments);
      try {
        for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.pow(0.5, dt); b.vy = b.vy * Math.pow(0.5, dt) - 30 * dt;
          const pc = P.center(); if (!P.dead && Math.abs(pc.x - b.x) < P.w / 2 + b.r && Math.abs(pc.y - b.y) < P.h / 2 + b.r) { P.hurt(7, Math.sign(b.vx) || 1, 'grandclam'); P.vx += b.vx * 0.8; b.life = 0; }
          if (b.life <= 0 || RW.TILES[RW.world.get(Math.floor(b.x / TS), Math.floor(b.y / TS))].solid) { RW.fx.burst(b.x, b.y, ['#cfefff', '#8ecfee'], 5, 40, {}); bubbles.splice(i, 1); } }
        if ((bedT -= dt) > 0 || P.dead || RW.world.def.id !== 'fuzzy') return r; bedT = 1;
        const beds = RW.world.meta && RW.world.meta.v2clams; if (!beds) return r;
        const ptx = (P.x + P.w / 2) / TS, pty = (P.y + P.h / 2) / TS;
        beds.forEach((bd, i) => {
          if (Math.abs(ptx - bd.x) > 34 || Math.abs(pty - bd.y) > 24 || Math.abs(ptx - bd.x) < 12) return;
          if (E.enemies.some((e) => !e.dead && e.bed === i)) return;
          if (Date.now() - RW.store.get(bedKey(i), 0) < 4 * 60 * 1000) return;
          const sp = RW.SPECIES[bd.k], e = E.spawnEnemy(bd.k, bd.x * TS + 8 - sp.w / 2, bd.y * TS - sp.h); if (e) { e.bed = i; e.face = RW.hash2(i, 1, 5) < 0.5 ? -1 : 1; }
        });
      } catch (e) { /* never stop the frame */ }
      return r;
    };
    const bKill = E.kill;
    E.kill = function (e) { if (e && e.bed != null && (e.sp === 'snapclam' || e.sp === 'grandclam')) RW.store.set(bedKey(e.bed), Date.now()); return bKill.apply(this, arguments); };
    const bW = RW.world.drawWater;
    RW.world.drawWater = function (g, cam) {
      const r = bW.apply(this, arguments);
      bubbles.forEach((b) => { const x = Math.round(b.x - cam.x), y = Math.round(b.y - cam.y); g.strokeStyle = '#e8f8ff'; g.lineWidth = 1; g.beginPath(); g.arc(x + 0.5, y + 0.5, b.r, 0, 6.29); g.stroke(); g.fillStyle = 'rgba(160,220,255,0.35)'; g.fill(); g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - Math.round(b.r) + 1, 1, 1); });
      return r;
    };
    // put the beds on the sea floor when the world is made
    const baseGen = def.generate;
    def.generate = function (seed) {
      const gen = baseGen.apply(this, arguments);
      try {
        const T = RW.T, Wd = gen.W, fg = gen.fg, beds = (gen.meta.v2clams = []);
        const floorAt = (x) => { let y = def.sea; while (y < gen.H - 8 && fg[y * Wd + x] === T.water) y++; return fg[(y - 1) * Wd + x] === T.water && y - def.sea > 3 ? y - 1 : -1; };
        [[4, 30], [Wd - 34, Wd - 4]].forEach(([a, b]) => {
          for (let x = a; x <= b; x += 2) { const y = floorAt(x); if (y < 0) continue; const h = RW.hash2(x, y, (seed || 1) + 77); if (h < 0.5) beds.push({ x, y, k: h < 0.1 ? 'grandclam' : 'snapclam' }); }
        });
      } catch (e) { console.warn('clams', e); }
      return gen;
    };
  }
})(window.RW);
