// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 22: the rings around the Leviathan's Heart Chamber (new worlds only).
//  * Rock World grows downward (1280 x 1500). Below Stalagmere's cavern band, the hollow shell gives way to five
//    flooded rings, one inside the other, all made of caves and caverns, with the Heart Chamber in the middle:
//      Coral Caverns  : wide caverns crusted with coral, rock pillars, big open water. Ore: coralite.
//      Kelp Grottos   : tall caves of stone-rooted kelp you can climb; kelp walls you cut, which grow back. Verdigrite.
//      Scald Vents    : black basalt. The water is hot (it burns without Scald armour or a Chillshell Charm),
//                       glowing magma burns no matter what, and vents throw geysers that launch you. Cindrite.
//      Boneyard Hollows: fossil stone, giant ribcages, bone piles that rise as skeleton fish when you come near.
//                       Fossilite.
//      The Hollow Dark: pitch black void stone, currents that drag you toward the abyss, and glowing anchors to
//                       hold on to (and see by). Nullstone.
//    Between each ring and the next is a seal of its own stone that only the next rune can break.
//  * Each ring with a boss has a lair cave (meta.v3lairs); the bosses live in v3s24.
//  * Worlds made before this keep the old layout. A world knows it has rings by `v3_rings@w<id>` in the store; a
//    friend who joins gets the host's flag with the world.
(function (RW) {
  'use strict';
  const def = RW.WORLDS && RW.WORLDS.rock, WD = RW.world, P = RW.player, E = RW.ent, U = RW.ui, N = RW.net, A = RW.art, TS = RW.TILE;
  if (!def || !WD || !P) return;

  // ---------------- is this a ring world? ----------------
  RW.v3ringsOn = () => {
    if (N && N.transport === 'p2p' && !N.isHost && RW.v3ringsHost != null) return !!RW.v3ringsHost;
    if (window.__v3rings) return true; // tests and the test world
    const w = RW.v3slots && RW.v3slots.world; return !!(w && RW.store.get('v3_rings@w' + w, 0));
  };

  // ---------------- blocks ----------------
  function addTile(d) { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; }
  const T = RW.T;
  const TL = {
    reef: addTile({ key: 'v3reefrock', name: 'Reef Rock', solid: true, hard: 9, time: 1.2, drop: 'v3reefrock', colors: ['#3e4a52', '#56646a', '#2e3840'], tex: 'rough' }),
    coral: addTile({ key: 'v3coral', name: 'Living Coral', solid: true, hard: 9, time: 0.6, drop: 'v3coral', colors: ['#c8604a', '#f09070', '#8a3a30'], tex: 'nodule', nod: '#f0b0d0', light: [0.12, 0.05, 0.06] }),
    coralite: addTile({ key: 'v3coralite', name: 'Coralite Ore', solid: true, hard: 9, time: 1.8, drop: 'coralite_ore', colors: ['#3e4a52', '#56646a', '#2e3840'], tex: 'ore', ore: '#f08a6a', light: [0.2, 0.08, 0.06] }),
    sealCoral: addTile({ key: 'v3seal_coral', name: 'Reef Seal', solid: true, hard: 9, time: 3, drop: null, colors: ['#5a3a40', '#7a5058', '#3a2428'], tex: 'facet' }),
    kelprock: addTile({ key: 'v3kelprock', name: 'Kelp Slate', solid: true, hard: 11, time: 1.4, drop: 'v3kelprock', colors: ['#2e3a30', '#3e4e40', '#222c24'], tex: 'layer' }),
    kelpwall: addTile({ key: 'v3kelpwall', name: 'Kelp Wall', solid: true, hard: 1, time: 0.3, drop: null, colors: ['#3a6a2a', '#5a8a3a', '#2a4a1e'], tex: 'spire' }),
    verdigrite: addTile({ key: 'v3verdigrite', name: 'Verdigrite Ore', solid: true, hard: 11, time: 2.0, drop: 'verdigrite_ore', colors: ['#2e3a30', '#3e4e40', '#222c24'], tex: 'ore', ore: '#5ad8a0', light: [0.05, 0.18, 0.12] }),
    sealKelp: addTile({ key: 'v3seal_kelp', name: 'Frond Seal', solid: true, hard: 11, time: 3, drop: null, colors: ['#2a4a2e', '#3e6a40', '#1a3020'], tex: 'facet' }),
    basalt: addTile({ key: 'v3basalt', name: 'Scald Basalt', solid: true, hard: 13, time: 1.6, drop: 'v3basalt', colors: ['#1e1a1c', '#2c2628', '#141012'], tex: 'spire' }),
    magma: addTile({ key: 'v3magma', name: 'Superheated Rock', solid: true, hard: 13, time: 1.6, drop: 'v3basalt', colors: ['#6a1e10', '#e0602a', '#3a0e08'], tex: 'rough', light: [0.6, 0.25, 0.08] }),
    vent: addTile({ key: 'v3vent', name: 'Scald Vent', solid: true, hard: 99, time: 9, drop: null, colors: ['#2c2628', '#4a3a34', '#141012'], tex: 'plate', light: [0.4, 0.18, 0.06] }),
    cindrite: addTile({ key: 'v3cindrite', name: 'Cindrite Ore', solid: true, hard: 13, time: 2.2, drop: 'cindrite_ore', colors: ['#1e1a1c', '#2c2628', '#141012'], tex: 'ore', ore: '#ff8a3a', light: [0.28, 0.12, 0.04] }),
    sealHeat: addTile({ key: 'v3seal_heat', name: 'Scald Seal', solid: true, hard: 13, time: 3, drop: null, colors: ['#4a1a10', '#7a2a18', '#2a0e08'], tex: 'facet', light: [0.15, 0.05, 0.02] }),
    fossil: addTile({ key: 'v3fossil', name: 'Fossil Stone', solid: true, hard: 15, time: 1.8, drop: 'v3fossil', colors: ['#6a665a', '#8a8472', '#4e4a42'], tex: 'nodule', nod: '#d8d0b4' }),
    bone: addTile({ key: 'v3bone', name: 'Giant Bone', solid: true, hard: 15, time: 2.0, drop: 'bone', colors: ['#c8c0a4', '#e8e0c8', '#8a8470'], tex: 'bone' }),
    fossilite: addTile({ key: 'v3fossilite', name: 'Fossilite Ore', solid: true, hard: 15, time: 2.4, drop: 'fossilite_ore', colors: ['#6a665a', '#8a8472', '#4e4a42'], tex: 'ore', ore: '#e8e0b0', light: [0.14, 0.13, 0.08] }),
    sealBone: addTile({ key: 'v3seal_bone', name: 'Grave Seal', solid: true, hard: 15, time: 3, drop: null, colors: ['#8a8470', '#aaa48c', '#5a5648'], tex: 'facet' }),
    voidrock: addTile({ key: 'v3voidrock', name: 'Void Stone', solid: true, hard: 17, time: 2.0, drop: 'v3voidrock', colors: ['#0c0a12', '#16121e', '#06050a'], tex: 'rough' }),
    anchor: addTile({ key: 'v3anchor', name: 'Glowing Anchor', solid: true, hard: 99, time: 9, drop: null, colors: ['#3a3a5a', '#8a8ad8', '#22223a'], tex: 'plate', light: [0.35, 0.35, 0.8] }),
    nullstone: addTile({ key: 'v3nullstone', name: 'Nullstone Ore', solid: true, hard: 17, time: 2.6, drop: 'nullstone_ore', colors: ['#0c0a12', '#16121e', '#06050a'], tex: 'ore', ore: '#5a3ab0', light: [0.1, 0.05, 0.22] }),
    sealVoid: addTile({ key: 'v3seal_void', name: 'Void Seal', solid: true, hard: 17, time: 3, drop: null, colors: ['#1a1030', '#2a1a4a', '#0e0818'], tex: 'facet', light: [0.06, 0.02, 0.12] }),
    sealHeart: addTile({ key: 'v3seal_heart', name: 'Heart Seal', solid: true, hard: 19, time: 3.5, drop: null, colors: ['#10302e', '#1e5a52', '#081a18'], tex: 'facet', light: [0.04, 0.16, 0.14] }),
  };
  if (A.buildTiles && A.tiles && !A.tiles[TL.sealHeart]) { try { A.buildTiles(); } catch (e) { /* drawn plain */ } }

  // ---------------- geometry ----------------
  const W = 1280, H = 1500, CUT = 436, CX = 640, CY = 1010;
  const RX = [240, 295, 365, 435, 505, 585], RY = [85, 130, 185, 240, 295, 355];
  const RING = ['chamber', 'void', 'bone', 'heat', 'kelp', 'coral'];
  const SEAL = [TL.sealHeart, TL.sealVoid, TL.sealBone, TL.sealHeat, TL.sealKelp, TL.sealCoral];
  const ROCK = [null, TL.voidrock, TL.fossil, TL.basalt, TL.kelprock, TL.reef];
  const ORE = [null, TL.nullstone, TL.fossilite, TL.cindrite, TL.verdigrite, TL.coralite];
  const NAMES = { r_coral: 'The Coral Caverns', r_kelp: 'The Kelp Grottos', r_heat: 'The Scald Vents', r_bone: 'The Boneyard Hollows', r_void: 'The Hollow Dark', r_shell: 'The Deep Shell' };
  let LAY = null; // this world's ring layout (wobble seeds), set by the generator

  function noiseFn(seed) { return (x, y) => RW.noise2(x, y, seed); }
  // which region a block is in: 0 chamber, 1 void, 2 bone, 3 heat, 4 kelp, 5 coral, 6 the shell outside. Also whether it is in a seal.
  function regionAt(x, y) {
    if (!LAY) return { j: 6, seal: false };
    const dx = x - CX, dy = y - CY, th = Math.atan2(dy, dx);
    for (let j = 0; j < 6; j++) {
      const w = 1 + 0.035 * Math.sin(3 * th + LAY.a[j]) + 0.02 * Math.sin(7 * th + LAY.b[j]);
      const q = Math.hypot(dx / RX[j], dy / RY[j]) / w;
      if (q <= 1) { const q2 = Math.hypot(dx / (RX[j] - 3), dy / (RY[j] - 3)) / w; return { j, seal: q2 > 1 }; }
    }
    return { j: 6, seal: false };
  }
  RW.v3ringAt = (x, y) => (RW.v3ringsOn() && y >= CUT ? regionAt(x, y) : null);

  // ---------------- the generator ----------------
  function build(gen) {
    const seed = (gen.meta && gen.meta.seed) || 1, rnd = (a, b, k) => RW.hash2(a, b, seed + (k || 0));
    LAY = { a: [], b: [] }; for (let j = 0; j < 6; j++) { LAY.a.push(rnd(j, 1, 77) * 6.283); LAY.b.push(rnd(j, 2, 77) * 6.283); }
    const Wo = gen.W, Ho = gen.H; if (Wo !== W) return gen;
    const fg = new gen.fg.constructor(W * H), bg = new gen.bg.constructor(W * H);
    fg.set(gen.fg.subarray(0, CUT * W)); bg.set(gen.bg.subarray(0, CUT * W));
    const WL = RW.W, Tt = RW.T;
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) fg[y * W + x] = t; };
    const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? Tt.bedrock : fg[y * W + x]);
    const setb = (x, y, w) => { if (x >= 0 && y >= 0 && x < W && y < H) bg[y * W + x] = w; };
    const n1 = noiseFn(seed + 11), n2 = noiseFn(seed + 23), n3 = noiseFn(seed + 37), n4 = noiseFn(seed + 51);
    const fbm = (x, y) => n1(x, y) * 0.55 + n2(x * 2.1, y * 2.1) * 0.3 + n3(x * 4.3, y * 4.3) * 0.15;
    const WALL = [WL.heart || WL.deep, WL.deep, WL.stratw || WL.deep, WL.basaltw || WL.deep, WL.rootw || WL.deep, WL.grottow || WL.deep];
    // 1. stone, seals, the rings' own caves
    for (let y = CUT; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (x < 2 || x >= W - 2 || y >= H - 3) { fg[i] = Tt.bedrock; continue; }
      const r = regionAt(x, y), j = r.j;
      if (j === 6) { // the deep shell: stone with a few dry caves
        fg[i] = fbm(x / 22 + 300, y / 16) > 0.62 && y > CUT + 6 ? Tt.air : Tt.stone; bg[i] = WL.deep; continue;
      }
      bg[i] = WALL[j];
      if (r.seal) { fg[i] = SEAL[j]; continue; }
      if (j === 0) { fg[i] = Tt.water; continue; }
      let open;
      if (j === 5) open = fbm(x / 40, y / 26) > 0.51;
      else if (j === 4) open = fbm(x / 15, y / 46) > 0.53;
      else if (j === 3) open = fbm(x / 24, y / 20) > 0.53;
      else if (j === 2) open = fbm(x / 20, y / 20) > 0.52;
      else open = fbm(x / 28, y / 16) > 0.53;
      if (open) fg[i] = Tt.water;
      else fg[i] = n4(x / 6 + j * 50, y / 6) > 0.8 ? ORE[j] : ROCK[j];
    }
    // 2. a winding tunnel round the middle of every ring, so each ring is one connected space
    for (let j = 1; j <= 5; j++) {
      const rxm = (RX[j - 1] + RX[j]) / 2, rym = (RY[j - 1] + RY[j]) / 2, steps = 2400;
      for (let s = 0; s < steps; s++) {
        const th = s / steps * 6.2832, wob = 1 + 0.12 * (n2(s / 90 + j * 9, 3) - 0.5) * 2;
        const x = Math.round(CX + Math.cos(th) * rxm * wob), y = Math.round(CY + Math.sin(th) * rym * wob), rad = 2 + Math.round(n3(s / 40, j) * 3);
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          if (dx * dx + dy * dy > rad * rad) continue; const xx = x + dx, yy = y + dy, rr = regionAt(xx, yy);
          if (rr.j === j && !rr.seal) set(xx, yy, Tt.water);
        }
      }
    }
    const meta = Object.assign({}, gen.meta);
    // 3. lairs: a big cave in each boss ring
    const lairs = [], lair = (boss, j, th, rx, ry) => {
      const rxm = (RX[j - 1] + RX[j]) / 2, rym = (RY[j - 1] + RY[j]) / 2, x = Math.round(CX + Math.cos(th) * rxm), y = Math.round(CY + Math.sin(th) * rym);
      for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) { if ((dx / rx) ** 2 + (dy / ry) ** 2 > 1) continue; const rr = regionAt(x + dx, y + dy); if (rr.j === j && !rr.seal) set(x + dx, y + dy, Tt.water); }
      // a flat floor along the bottom
      for (let dx = -rx + 3; dx <= rx - 3; dx++) for (let k = 0; k < 3; k++) { const rr = regionAt(x + dx, y + ry - k); if (rr.j === j && !rr.seal) set(x + dx, y + ry - k, ROCK[j]); }
      lairs.push({ boss, ring: RING[j], x, y, rx, ry });
    };
    lair('v3b_grindmaw', 5, 0.7, 34, 16);
    lair('v3b_frondwraith', 4, 2.4, 26, 22);
    lair('v3b_scaldjaw', 3, -0.6, 28, 16);
    lair('v3b_gravekeeper', 2, 1.57, 44, 20);
    meta.v3lairs = lairs;
    // 4. each ring's features
    const kelp = [], vents = [], bones = [], fans = [];
    const water = (x, y) => get(x, y) === Tt.water;
    for (let y = CUT + 2; y < H - 4; y++) for (let x = 3; x < W - 3; x++) {
      const t = get(x, y); if (!RW.TILES[t].solid) continue;
      const above = water(x, y - 1), below = water(x, y + 1), h = rnd(x, y, 5);
      const r = regionAt(x, y); if (r.seal || r.j === 0 || r.j === 6) continue;
      if (r.j === 5) { // coral: solid coral grows on the floors and ceilings; fans of soft coral on floors
        if ((above || below) && h < 0.12) set(x, y, TL.coral);
        if (above && h > 0.93) fans.push({ x, y: y - 1, c: (h * 997 | 0) % 4 });
      } else if (r.j === 4) { // kelp grows up from the floors
        if (above && h < 0.16 && !kelp.some((k) => Math.abs(k.x - x) < 3 && Math.abs(k.y1 - y) < 6)) { let top = y - 1; while (top > y - 60 && water(x, top - 1)) top--; if (y - 1 - top > 4) kelp.push({ x, y0: top + 1 + Math.round(h * 4), y1: y - 1 }); }
      } else if (r.j === 3) { // vents on the floors, superheated rock around some of them
        if (above && h < 0.03 && !vents.some((v) => Math.abs(v.x - x) < 18 && Math.abs(v.y - y) < 10)) { set(x, y, TL.vent); vents.push({ x, y, ph: h * 40 }); for (let k = -2; k <= 2; k++) if (k && rnd(x + k, y, 9) < 0.5 && RW.TILES[get(x + k, y)].solid) set(x + k, y, TL.magma); }
      } else if (r.j === 2) { // bone piles on the floors
        if (above && h < 0.02 && !bones.some((v) => Math.abs(v.x - x) < 14 && Math.abs(v.y - y) < 8)) bones.push({ x, y: y - 1 });
      } else if (r.j === 1) { // glowing anchors on floors and ceilings
        if ((above || below) && h < 0.025) set(x, y, TL.anchor);
      }
    }
    // kelp walls across the narrow spots of the kelp ring
    for (let y = CUT; y < H; y++) for (let x = 3; x < W - 3; x++) {
      if (!water(x, y)) continue; const r = regionAt(x, y); if (r.j !== 4 || r.seal) continue;
      if (!RW.TILES[get(x, y - 3)].solid || !RW.TILES[get(x, y + 3)].solid) continue; // only where the passage is short top to bottom
      if (n4(x / 3, y / 30) > 0.72) set(x, y, TL.kelpwall);
    }
    // giant ribcages in the bone ring: a spine and its ribs arching over the open water
    for (let k = 0; k < 14; k++) {
      const th = rnd(k, 3, 31) * 6.283, rr = (RX[1] + RX[2]) / 2, ry = (RY[1] + RY[2]) / 2, sx = Math.round(CX + Math.cos(th) * rr), sy = Math.round(CY + Math.sin(th) * ry);
      const len = 30 + Math.round(rnd(k, 4, 31) * 20);
      for (let i = 0; i < len; i++) { const x = sx + i - (len >> 1), y = sy - 8; const r = regionAt(x, y); if (r.j === 2 && !r.seal) set(x, y, TL.bone); }
      for (let i = 0; i < len; i += 5) for (let a = 0; a <= 16; a++) { const an = a / 16 * Math.PI, x = sx + i - (len >> 1) + Math.round(Math.cos(an) * 3), y = sy - 8 + Math.round(Math.sin(an) * 12); const r = regionAt(x, y); if (r.j === 2 && !r.seal && rnd(x, y, 3) > 0.15) set(x, y, TL.bone); }
    }
    // 5. the chamber: a rocky floor and roof spikes; the altar and the golden chest
    meta.roofSpikes = [];
    for (let x = CX - RX[0] + 4; x <= CX + RX[0] - 4; x++) {
      let yb = CY + RY[0]; while (yb > CY && !(regionAt(x, yb).j === 0 && !regionAt(x, yb).seal)) yb--;
      const fl = 6 + Math.round(n1(x / 14, 7) * 8); for (let k = 0; k < fl; k++) if (regionAt(x, yb - k).j === 0 && !regionAt(x, yb - k).seal) set(x, yb - k, TL.voidrock);
      let yt = CY - RY[0]; while (yt < CY && !(regionAt(x, yt).j === 0 && !regionAt(x, yt).seal)) yt++;
      if (x % 7 === 0) { const L = 3 + Math.round(rnd(x, 1, 41) * 8); for (let k = 0; k < L; k++) set(x, yt + k, TL.voidrock); meta.roofSpikes.push({ x, y: yt + L }); }
    }
    meta.arena = { cx: CX, cy: CY, rx: RX[0], ry: RY[0] }; meta.riftAt = { x: CX, y: CY + RY[0] - 14 };
    if (Tt.levaltar != null) { let y = CY; while (y < H - 2 && !RW.TILES[get(CX, y + 1)].solid) y++; set(CX, y, Tt.levaltar); meta.v3altar = { x: CX, y }; }
    if (Tt.goldchest != null && Tt.goldchestr != null) {
      outer: for (let dx = 20; dx < 160; dx++) for (const s of [1, -1]) { const x = CX + s * dx; let y = CY; while (y < H - 2 && !RW.TILES[get(x, y + 1)].solid) y++; if (water(x, y) && water(x + 1, y) && RW.TILES[get(x + 1, y + 1)].solid) { set(x, y, Tt.goldchest); set(x + 1, y, Tt.goldchestr); meta.goldChest = { x, y }; break outer; } }
    }
    // 6. the way down: a shaft from the bottom of the cavern band to the top of the Coral seal, with a chain to climb back up
    { const top = CUT - 30, sealTop = (() => { let y = CUT; while (y < H && regionAt(CX + 120, y).j === 6) y++; return y; })();
      const sx = CX + 120; let y0 = top; while (y0 > 220 && RW.TILES[get(sx, y0)].solid) y0--;
      for (let y = y0; y < sealTop; y++) for (let dx = -2; dx <= 2; dx++) { if (get(sx + dx, y) === Tt.bedrock) continue; set(sx + dx, y, dx === -2 && Tt.chain != null ? Tt.chain : Tt.air); setb(sx + dx, y, WL.deep); }
      meta.v3shaft = { x: sx, y0, y1: sealTop };
    }
    // 7. everything open inside the rings is under water
    for (let y = CUT; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (fg[i] === Tt.air) { const r = regionAt(x, y); if (r.j <= 5) fg[i] = Tt.water; } }
    meta.legend = (meta.legend || []).filter((p) => p.y < CUT);
    meta.v3kelp = kelp; meta.v3vents = vents; meta.v3bones = bones; meta.v3fans = fans; meta.v3rings = { CX, CY, RX, RY, CUT, a: LAY.a, b: LAY.b };
    return Object.assign({}, gen, { W, H, fg, bg, meta });
  }

  const prevGen = def.generate;
  def.generate = function () {
    const gen = prevGen.apply(this, arguments);
    if (!RW.v3ringsOn()) { LAY = null; return gen; }
    let out = gen;
    try { out = build(gen); def.store = 'rockv4_' + ((gen.meta && gen.meta.seed) || 1).toString(36); def.core = out.meta.arena; def.size = [W, H]; } catch (e) { console.warn('rings', e); LAY = null; }
    return out;
  };

  // ---------------- zones, light, music ----------------
  Object.assign(def.zones, {
    r_shell: { name: NAMES.r_shell, music: 'tubes' }, r_coral: { name: NAMES.r_coral, music: 'tubes' }, r_kelp: { name: NAMES.r_kelp, music: 'tubes' },
    r_heat: { name: NAMES.r_heat, music: 'core' }, r_bone: { name: NAMES.r_bone, music: 'core' }, r_void: { name: NAMES.r_void, music: 'core' },
  });
  const ZONE = ['core', 'r_void', 'r_bone', 'r_heat', 'r_kelp', 'r_coral', 'r_shell'];
  const baseZone = def.zoneAt;
  def.zoneAt = function (x, y) { if (LAY && y >= CUT) return ZONE[regionAt(x, y).j]; return baseZone.apply(this, arguments); };
  const AMB = [0, 0, 0.1, 0.2, 0.17, 0.22, 0.04];
  const baseAmb = def.ambientAt;
  def.ambientAt = function (x, y) { if (LAY && y >= CUT) return AMB[regionAt(x, y).j]; return baseAmb.apply(this, arguments); };
  // the old rock-world water creatures live in the rings too, until the rings have their own
  Object.values(RW.SPECIES).forEach((sp) => { const s = sp.spawn; if (s && (s.worlds || []).includes('rock') && s.medium === 'water') s.zones.push('r_coral', 'r_kelp', 'r_heat', 'r_bone', 'r_void'); });

  // ---------------- multiplayer: the host's ring flag goes with the world ----------------
  if (N) {
    const bs = N.send; N.send = function (m) { if (m && m.k === 'world' && m.w === 'rock' && N.isHost) m.rings = RW.v3ringsOn() ? 1 : 0; return bs.apply(this, arguments); };
    const br = N.recv; N.recv = function (m) { if (m && m.k === 'world' && m.w === 'rock' && m.to === N.pid && !N.isHost && m.rings != null) RW.v3ringsHost = !!m.rings; return br.apply(this, arguments); };
  }

  // ================= the rings' ways =================
  const M = () => WD.meta || {};
  const inRing = (j) => { if (!LAY || !WD.def || WD.def.id !== 'rock') return false; const r = regionAt((P.x + P.w / 2) / TS, (P.y + P.h / 2) / TS); return r.j === j && !r.seal; };
  const pc = () => ({ x: P.x + P.w / 2, y: P.y + P.h / 2 });
  const worn = (id) => P.armor && Object.values(P.armor).includes(id);
  let burnT = 0, heatT = 0, boneT = 0;
  const baseUpd = P.update;
  P.update = function (dt) {
    const r = baseUpd.apply(this, arguments);
    if (!LAY || P.dead || !(RW.game && RW.game.playing) || !WD.def || WD.def.id !== 'rock') return r;
    const c = pc(), tx = c.x / TS, ty = c.y / TS, here = regionAt(tx, ty), wet = WD.isWaterAt(c.x, c.y);
    // Kelp Grottos: climb a kelp stalk by holding jump or up beside it
    if (here.j === 4 && (RW.input.act('jump') || RW.input.act('up'))) {
      const k = (M().v3kelp || []).find((s) => Math.abs(s.x * TS + 8 - c.x) < 12 && ty >= s.y0 - 1 && ty <= s.y1 + 1);
      if (k) { P.vy = Math.min(P.vy, -95); if (Math.random() < dt * 6) RW.fx.spawn({ x: k.x * TS + 8 + RW.rand(-4, 4), y: c.y, vy: 20, life: 0.6, color: '#5a8a3a', size: 1 }); }
    }
    // Scald Vents: hot water burns without Scald armour or a Chillshell Charm; superheated rock and vents burn anyway
    if (here.j === 3) {
      heatT -= dt;
      const cool = (worn('scald_helm') && worn('scald_mail')) || worn('t_chill');
      let superhot = false;
      for (let yy = Math.floor(ty) - 2; yy <= Math.floor(ty) + 2 && !superhot; yy++) for (let xx = Math.floor(tx) - 2; xx <= Math.floor(tx) + 2; xx++) { const t = WD.get(xx, yy); if (t === TL.magma || t === TL.vent) { superhot = true; break; } }
      if (heatT <= 0 && wet && (superhot || !cool)) { heatT = superhot ? 0.6 : 1.0; P.hurt(superhot ? 7 : 3, 0, superhot ? 'superheated rock' : 'scalding water'); RW.fx.burst(c.x, c.y, ['#ffffff', '#ffb070'], 5, 40, { add: true, kind: 'glow', life: 0.5, grav: -60 }); if (!cool && !superhot && !P.flags.v3hotTip) { P.flags.v3hotTip = 1; U.toast('The water here is scalding. Scald armour or a Chillshell Charm keeps it off you.'); } }
      // geysers: every vent blasts for a moment every few seconds and throws you upward
      const now = performance.now() / 1000;
      (M().v3vents || []).forEach((v) => { const ph = (now + v.ph) % 4.5; if (ph < 1.1 && Math.abs(v.x * TS + 8 - c.x) < 22 && c.y < v.y * TS && c.y > v.y * TS - 14 * TS) { P.vy = Math.min(P.vy, -480); } });
    }
    // Boneyard Hollows: bone piles rise as skeleton fish when you come close
    if (here.j === 2) {
      boneT -= dt;
      if (boneT <= 0) { boneT = 0.5; (M().v3bones || []).forEach((b) => { if ((b.t || 0) > performance.now()) return; if (Math.hypot(b.x * TS + 8 - c.x, b.y * TS - c.y) < 6 * TS) { b.t = performance.now() + 60000; const sp = RW.SPECIES.v3_skelfish ? 'v3_skelfish' : 'creepy_fish'; for (let k = 0; k < 2; k++) { const e = E.spawnEnemy(sp, b.x * TS + RW.rand(-10, 10), b.y * TS - 12); if (e) e.provoked = true; } RW.fx.debris(b.x * TS + 8, b.y * TS, ['#d8d0b4', '#ada488'], 14); RW.audio.sfx('break'); } }); }
    }
    // The Hollow Dark: currents drag you toward the abyss unless you hold on beside a glowing anchor
    if (here.j === 1 && wet) {
      let held = false;
      for (let yy = Math.floor(ty) - 1; yy <= Math.floor(ty) + 1 && !held; yy++) for (let xx = Math.floor(tx) - 1; xx <= Math.floor(tx) + 1; xx++) if (WD.get(xx, yy) === TL.anchor) { held = true; break; }
      if (!held) {
        const dx = CX * TS - c.x, dy = CY * TS - c.y, d = Math.hypot(dx, dy) || 1, t = performance.now() / 1000;
        const surge = 0.6 + 0.4 * Math.sin(t * 0.7 + c.x * 0.001);
        P.vx += ((dx / d) * 120 + (-dy / d) * 160) * surge * dt; P.vy += ((dy / d) * 120 + (dx / d) * 160) * surge * dt;
        if (Math.random() < dt * 8) RW.fx.spawn({ x: c.x + RW.rand(-40, 40), y: c.y + RW.rand(-30, 30), vx: (-dy / d) * 80, vy: (dx / d) * 80, life: 0.8, color: '#3a2a6a', add: true, kind: 'glow', size: 1 });
      } else if (!P.flags.v3anchorTip) { P.flags.v3anchorTip = 1; U.toast('You hold on to the anchor. The current cannot take you here.'); }
    }
    // kelp walls grow back
    regrow(dt);
    return r;
  };
  // kelp walls: when one is cut, it grows back after a while if nothing is in the way
  const cut = [];
  const baseSet = WD.set;
  if (baseSet) WD.set = function (x, y, t) { const was = WD.get(x, y); const r = baseSet.apply(this, arguments); if (LAY && was === TL.kelpwall && t !== TL.kelpwall) cut.push({ x, y, at: performance.now() + 40000 }); return r; };
  let regT = 0;
  function regrow(dt) {
    if ((regT -= dt) > 0 || !cut.length) return; regT = 1;
    const now = performance.now(), c = pc();
    for (let i = cut.length - 1; i >= 0; i--) { const k = cut[i]; if (now < k.at) continue; const t = WD.get(k.x, k.y); if ((t === RW.T.water || t === RW.T.air) && Math.hypot(k.x * TS + 8 - c.x, k.y * TS + 8 - c.y) > 40) { WD.set(k.x, k.y, TL.kelpwall); } cut.splice(i, 1); }
  }

  // ================= drawing the rings' living things =================
  const KELP = ['#1e3a18', '#2e5a22', '#4a7a2e', '#6a9a3a'], FANC = [['#e0607a', '#ff9ab0'], ['#e8a040', '#ffd080'], ['#a060e0', '#d0a0ff'], ['#40c0b0', '#a0fff0']];
  const baseTiles = WD.drawTiles;
  WD.drawTiles = function (g, cam, vw, vh, time) {
    const r = baseTiles.apply(this, arguments);
    if (!LAY || !WD.def || WD.def.id !== 'rock' || (RW.v3zoom && RW.v3zoom.far())) return r;
    const x0 = cam.x / TS - 2, x1 = (cam.x + vw) / TS + 2, y0 = cam.y / TS - 2, y1 = (cam.y + vh) / TS + 2, ox = -Math.round(cam.x), oy = -Math.round(cam.y), m = M();
    g.save();
    // kelp stalks: a swaying stem with leaves every few blocks
    (m.v3kelp || []).forEach((k) => {
      if (k.x < x0 || k.x > x1 || k.y1 < y0 || k.y0 > y1) return;
      for (let y = k.y1 * TS + 15; y > k.y0 * TS; y -= 2) {
        const up = (k.y1 * TS + 15 - y) / TS, sway = Math.round(Math.sin(time * 1.6 + k.x * 0.7 + up * 0.35) * Math.min(5, up * 0.6));
        const x = k.x * TS + 7 + sway;
        g.fillStyle = KELP[1]; g.fillRect(x + ox, y + oy, 2, 2);
        if (y % 12 === 0) { g.fillStyle = KELP[2]; g.fillRect(x + ox - 5, y + oy - 1, 5, 2); g.fillStyle = KELP[3]; g.fillRect(x + ox - 4, y + oy - 2, 2, 1); }
        if (y % 12 === 6) { g.fillStyle = KELP[2]; g.fillRect(x + ox + 2, y + oy - 1, 5, 2); g.fillStyle = KELP[0]; g.fillRect(x + ox + 5, y + oy, 2, 1); }
      }
    });
    // soft coral fans on the coral floors
    (m.v3fans || []).forEach((f) => {
      if (f.x < x0 || f.x > x1 || f.y < y0 || f.y > y1) return;
      const [a, b] = FANC[f.c], bx = f.x * TS + 8 + ox, by = (f.y + 1) * TS + oy, sw = Math.round(Math.sin(time * 1.3 + f.x) * 1);
      for (let k = -3; k <= 3; k++) { const h = 10 - Math.abs(k) * 2; g.fillStyle = k % 2 ? a : b; g.fillRect(bx + k * 2 + sw, by - h, 2, h); }
      g.fillStyle = a; g.fillRect(bx - 1, by - 3, 3, 3);
    });
    // bone piles
    (m.v3bones || []).forEach((b) => {
      if (b.x < x0 || b.x > x1 || b.y < y0 || b.y > y1) return;
      const bx = b.x * TS + ox, by = (b.y + 1) * TS + oy, risen = (b.t || 0) > performance.now();
      g.fillStyle = '#8a8470'; g.fillRect(bx - 6, by - 4, 28, 4); g.fillStyle = '#d8d0b4';
      if (!risen) { g.fillRect(bx - 4, by - 7, 6, 3); g.fillRect(bx + 4, by - 9, 3, 5); g.fillRect(bx + 9, by - 6, 7, 2); g.fillStyle = '#0a0810'; g.fillRect(bx - 3, by - 6, 1, 1); g.fillRect(bx, by - 6, 1, 1); }
      else { g.fillRect(bx + 2, by - 5, 10, 2); }
    });
    // geysers: a column of steam and bubbles over every vent while it blasts
    const now = performance.now() / 1000;
    (m.v3vents || []).forEach((v) => {
      if (v.x < x0 || v.x > x1 || v.y < y0 - 14 || v.y > y1) return;
      const ph = (now + v.ph) % 4.5, bx = v.x * TS + 8 + ox, by = v.y * TS + oy;
      if (ph < 1.1) { g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 14; k++) { const yy = by - ((k * 13 + now * 300) % (14 * TS)); g.fillStyle = 'rgba(255,200,150,' + (0.25 + 0.2 * Math.sin(k + now * 9)).toFixed(2) + ')'; g.fillRect(bx - 4 + Math.round(Math.sin(k * 1.7 + now * 12) * 4), yy, 6, 6); } g.globalCompositeOperation = 'source-over'; }
      else if (ph > 3.6) { g.fillStyle = 'rgba(255,160,90,0.5)'; g.fillRect(bx - 1 + Math.round(Math.sin(now * 20) * 2), by - 4, 2, 2); } // it rumbles before it blows
    });
    g.restore();
    return r;
  };

  RW.v3ringsLib = { TL, regionAt: (x, y) => regionAt(x, y), RING, NAMES, CX, CY, RX, RY, CUT };
})(window.RW);
