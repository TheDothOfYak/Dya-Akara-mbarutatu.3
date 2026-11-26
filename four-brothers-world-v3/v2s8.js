// 4 Brothers World V2 — part 8: a bigger Ghost World.
// The Ghost World grows from 520x240 to 800x320 blocks (about the size of Fuzzy World and Rock World), west to east:
//   the Still Sea · the Pale Hills and the Pale Keep · the Bonewood (a dense dead forest, with the Hanging Hollow) ·
//   the Soulmire (a marsh of black pools and boardwalks, with a shrine island) · Barrowtown (a ruined town, a graveyard,
//   and the Barrow, a crypt underneath with a hidden room) · the Mistspires (tall pale peaks with a Cyitor watchtower) ·
//   the Hollows (the Hollow Wraith) · the Still Sea.
// Six new Ghost World creatures with their own drawings (bone, ash and cold light) and Barrow Chests with Ghost World treasure.
// It's a rebuilt world, so it is saved under a new name ('ghost2'): blocks changed in the old, smaller Ghost World
// stay with the old one, and you arrive at the Pale Keep.
// The generator plugs in underneath the legendary-chest and town-portal steps through a hook at the end of v2.js.
(function (RW) {
  'use strict';
  const def = RW.WORLDS && RW.WORLDS.ghost, S = RW.surface, R = RW.register;
  if (!def || !S || !R) return;

  const W = 800, H = 320, SEA = 146, DEEP = 262;
  const KEEP = { x0: 70, x1: 112, y: 124 };
  const ARENA = { x0: 668, x1: 768, y: 128 };
  const TOWN = { x0: 436, x1: 532, y: 124 };
  const BARROW = { x0: 478, x1: 514, y0: 138, y1: 146 }; // the crypt's room (inside, not counting its walls)
  let C = null;

  // ---------- a chest for the ruins ----------
  const addTile = (d) => { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; };
  { const wc = RW.TILES[RW.T.woodchest]; const copy = Object.assign({}, wc); delete copy.id; addTile(Object.assign(copy, { key: 'barrowchest', name: 'Barrow Chest', loot: 'barrow' })); }
  RW.LOOT.barrow = [['ectoplasm', 2, 5, 1], ['coin', 10, 30, 1], ['stygian_ore', 2, 5, 0.7], ['platinum_ore', 2, 4, 0.4], ['soulshroom', 1, 3, 0.6], ['key_fragment', 1, 1, 0.35], ['recipe_square', 1, 1, 0.2], ['wraith_essence', 1, 1, 0.06]]
    .filter(([id]) => RW.ITEMS[id]);

  // ---------- the world itself ----------
  Object.assign(def, {
    size: [W, H], sea: SEA, store: 'ghost2',
    blurb: 'Pale hills, the Bonewood, the Soulmire, ruined Barrowtown and the Mistspires, under a dead sky. Home of the cyators, the ghosts, and Stygian ore.',
    spawn: { x: 90, y: KEEP.y - 1 }, titleCam: { x: 90, y: KEEP.y - 8 },
  });
  def.boss.arena = { x0: ARENA.x0, x1: ARENA.x1, y0: ARENA.y - 64, y1: ARENA.y + 2 };
  def.boss.at = { x: (ARENA.x0 + ARENA.x1) / 2, y: ARENA.y - 4 };
  def.zones = Object.assign({}, def.zones, {
    bonewood: { name: 'The Bonewood', music: 'ghost' }, marsh: { name: 'The Soulmire', music: 'ghost' },
    crypt: { name: 'Barrowtown', music: 'ghost' }, barrow: { name: 'The Barrow', music: 'tubes' }, peaks: { name: 'The Mistspires', music: 'ghost' },
  });
  def.zoneAt = (x, y) => (C ? C.zone(x, y) : 'mist');
  def.ambientAt = (x, y) => {
    if (x >= KEEP.x0 && x <= KEEP.x1 && y < KEEP.y + 2 && y > KEEP.y - 16) return 0.34;
    if (x >= BARROW.x0 && x <= BARROW.x1 + 9 && y >= BARROW.y0 && y <= BARROW.y1) return 0.3;
    return 0.2;
  };

  RW.v2GhostGen = function (seed) {
    const c = S.ctx(W, H, seed + 303); C = c; const T = c.T, N = c.N;
    const hash = (x, y, k) => RW.hash2(x, y, seed + k);
    const mist = { top: 'ghostgrass', fill: 'ghostdirt', fillDepth: 8, stone: 'ghoststone', wall: 'ghost', trees: { kind: 'dead', density: 0.18, spacing: 6 }, decor: [['soulshroom', 0.12], ['tallgrass', 0.1]] };
    const sea = { top: 'ghostgrass', fill: 'dirt', stone: 'ghoststone', wall: 'ghost', height: () => SEA + 10 };
    S.terrain(c, [
      Object.assign({ key: 'ocean', x0: 0, x1: 22 }, sea),
      Object.assign({ key: 'mist', x0: 22, x1: 176, height: (x) => 126 + (N(x / 30, 1.3, 3, 3) - 0.5) * 34 }, mist),
      { key: 'bonewood', x0: 176, x1: 304, height: (x) => 130 + (N(x / 22, 2.1, 3, 3) - 0.5) * 22, top: 'ghostgrass', fill: 'ghostdirt', fillDepth: 8, stone: 'ghoststone', wall: 'ghost', trees: { kind: 'dead', density: 0.6, spacing: 3 }, decor: [['bonepile', 0.12], ['soulshroom', 0.16], ['tallgrass', 0.1]] },
      { key: 'marsh', x0: 304, x1: 424, height: (x) => SEA + 6 + (N(x / 13, 3.7, 3, 2) - 0.5) * 18, top: 'mud', fill: 'mud', fillDepth: 7, stone: 'ghoststone', wall: 'mud', decor: [['tallgrass', 0.25], ['soulshroom', 0.1]] },
      { key: 'crypt', x0: 424, x1: 540, height: (x) => 124 + (N(x / 40, 4.4, 3, 2) - 0.5) * 10, top: 'ghostgrass', fill: 'ghostdirt', fillDepth: 8, stone: 'ghoststone', wall: 'ghost', decor: [['bonepile', 0.05], ['tallgrass', 0.08]] },
      { key: 'peaks', x0: 540, x1: 656, height: (x) => { const t = (x - 540) / 116; return 124 - Math.sin(t * Math.PI) * 40 + (N(x / 11, 5.3, 3, 3) - 0.5) * 24; }, top: 'ghoststone', fill: 'ghoststone', fillDepth: 3, stone: 'ghoststone', wall: 'ghost', decor: [['soulshroom', 0.04]] },
      Object.assign({ key: 'mist', x0: 656, x1: 778, height: (x) => 128 + (N(x / 30, 6.1, 3, 3) - 0.5) * 24 }, mist),
      Object.assign({ key: 'ocean', x0: 778, x1: W }, sea),
    ], SEA, { deep: DEEP });
    // the Soulmire's pools have mud floors, not sand
    for (let x = 300; x < 428; x++) for (let y = c.surf[x]; y < c.surf[x] + 3; y++) if (c.get(x, y) === T.sand) c.set(x, y, T.mud);
    S.caves(c, { worms: 40, mouths: [150, 262, 600, 712], pools: 34 });
    S.ores(c, [
      ['stygian', 150, 315, 0.34, [0.9, 1.3], ['ghoststone', 'deepstone']],
      ['platinum', 175, 315, 0.12, [0.8, 1], ['ghoststone', 'deepstone']],
      ['iron', 135, 315, 0.12, [1, 1], ['ghoststone']],
      ['gravel', 130, 260, 0.14, [1.2, 1.2], ['ghoststone', 'ghostdirt']],
      ['flint', 130, 260, 0.14, [0.8, 0.8], ['ghoststone', 'ghostdirt']],
    ], 5400);
    S.decorate(c);
    for (let y = 0; y < H - 8; y++) for (let x = 3; x < W - 3; x++) if (y > c.surf[x] + 8 && c.get(x, y) === T.air && c.solid(x, y + 1) && hash(x, y, 0) > 0.96) c.set(x, y, T.soulshroom);

    // ---- the Pale Keep (as before) ----
    S.flatten(c, KEEP.x0, KEEP.x1, KEEP.y, 'ghostgrass');
    const k = S.house(c, KEEP.x0 + 6, KEEP.y - 1, 30, 9, { wall: 'palebrick', bg: 'pale', roof: 'palebrick' });
    for (let x = k.x0; x <= k.x1; x++) c.set(x, KEEP.y, T.palebrick);
    [k.x0 - 1, k.x1 + 1].forEach((tx) => { for (let y = KEEP.y - 1; y > KEEP.y - 16; y--) for (let d = 0; d < 3; d++) c.set(tx + (tx < KEEP.x0 + 10 ? -d : d), y, T.palebrick); });
    c.set(k.x0 + 6, KEEP.y - 2, T.forge); c.set(k.x0 + 10, KEEP.y - 2, T.workbench); c.set(k.x0 + 15, KEEP.y - 2, T.altar);
    c.set(k.x0 + 8, k.roof + 1, T.lantern); c.set(k.x0 + 22, k.roof + 1, T.lantern);
    c.set(k.x0 + 24, KEEP.y - 2, T.tablet); c.meta.carvings[(k.x0 + 24) + ',' + (KEEP.y - 2)] = 6;
    c.meta.npcs.vexa = { x: k.x0 + 19, y: KEEP.y - 2 };
    c.meta.npcs.cyator = { x: k.x1 + 4, y: KEEP.y - 1 };
    c.meta.npcs.cubert = { x: k.x0 + 4, y: KEEP.y - 2 };
    S.starterFlint(c, k.x0 - 36, k.x0 - 6, 3); S.starterFlint(c, k.x1 + 8, k.x1 + 36, 3);
    def.spawn = { x: k.x0 + 13, y: KEEP.y - 2 }; def.titleCam = { x: k.x0 + 15, y: KEEP.y - 8 };

    // ---- the Bonewood: the Hanging Hollow, a huge dead tree with a chest in its hollow foot ----
    {
      const x = 238, s = c.surf[x]; S.flatten(c, x - 5, x + 5, s, 'ghostgrass');
      for (let y = s - 1; y > s - 26; y--) for (let dx = -1; dx <= 1; dx++) c.set(x + dx, y, T.paletrunk);
      for (let y = s - 1; y > s - 6; y--) for (let dx = -2; dx <= 2; dx++) c.set(x + dx, y, T.paletrunk);
      [[-1, 9, 7], [1, 13, 8], [-1, 17, 6], [1, 20, 5], [-1, 23, 4]].forEach(([dir, h, len]) => { for (let i = 0; i < len; i++) c.set(x + dir * (2 + i), s - 1 - h - Math.floor(i / 2), T.paletrunk); });
      for (let y = s - 3; y <= s - 1; y++) for (let dx = -1; dx <= 1; dx++) c.set(x + dx, y, T.air);
      c.set(x + 2, s - 1, T.air); c.set(x + 2, s - 2, T.air);
      c.set(x - 1, s - 1, T.barrowchest); c.set(x, s - 1, T.soulshroom);
    }

    // ---- the Soulmire: boardwalks over the pools, and a shrine island ----
    for (let x = 306; x < 422; x++) {
      if (c.surf[x] <= SEA) continue; // dry mud here
      c.set(x, SEA - 1, T.woodplat);
      if (x % 7 === 0) for (let y = SEA; y < c.surf[x]; y++) c.set(x, y, T.paletrunk);
    }
    {
      const x0 = 358, x1 = 370, y = SEA - 2; S.flatten(c, x0, x1, y, 'mud');
      for (let x = x0; x <= x1; x++) for (let yy = y + 1; yy < y + 12; yy++) if (c.get(x, yy) === T.water || c.get(x, yy) === T.woodplat) c.set(x, yy, T.mud);
      [x0 + 1, x1 - 1].forEach((px) => { for (let yy = y - 1; yy > y - 5; yy--) c.set(px, yy, T.palebrick); });
      for (let x = x0 + 1; x <= x1 - 1; x++) c.set(x, y - 5, T.palebrick);
      c.set((x0 + x1) >> 1, y - 4, T.lantern); c.set((x0 + x1) >> 1, y - 1, T.barrowchest);
      c.set(x0 + 3, y - 1, T.soulshroom); c.set(x1 - 3, y - 1, T.soulshroom);
    }

    // ---- Barrowtown: three ruined houses, a graveyard, and the Barrow underneath ----
    S.flatten(c, TOWN.x0, TOWN.x1, TOWN.y, 'ghostgrass');
    const ruin = (x0, w, h, salt) => {
      const r = S.house(c, x0, TOWN.y - 1, w, h, { wall: 'palebrick', bg: 'pale', roof: 'palebrick' });
      for (let x = r.x0; x <= r.x1; x++) c.set(x, TOWN.y, T.palebrick);
      // broken roofs and upper walls, and gaps in the back wall
      for (let y = r.roof - Math.ceil(w / 2) - 1; y < TOWN.y - 1; y++) for (let x = r.x0; x <= r.x1; x++) {
        const hv = hash(x, y, salt);
        if (y <= r.roof + 1 && c.get(x, y) === T.palebrick && hv < 0.32) c.set(x, y, T.air);
        if (hv > 0.8) c.setb(x, y, 0);
      }
      return r;
    };
    const h1 = ruin(TOWN.x0 + 4, 14, 7, 11), h2 = ruin(TOWN.x0 + 56, 16, 8, 12), h3 = ruin(TOWN.x0 + 80, 13, 6, 13);
    c.set(h1.x0 + 3, TOWN.y - 2, T.barrowchest); c.set(h1.x0 + 2, h1.roof + 1, T.lantern);
    c.set(h3.x1 - 3, TOWN.y - 2, T.barrowchest); c.set(h3.x0 + 3, TOWN.y - 2, T.bonepile);
    for (let x = h1.x1 + 4; x < h2.x0 - 3; x += 4) {
      c.set(x, TOWN.y - 1, T.palebrick); if (hash(x, 3, 14) > 0.45) c.set(x, TOWN.y - 2, T.palebrick);
      if (hash(x, 5, 14) > 0.5) c.set(x + 1, TOWN.y - 1, T.bonepile); else if (hash(x, 6, 14) > 0.6) c.set(x + 1, TOWN.y - 1, T.soulshroom);
    }
    [h1.x1 + 2, h2.x0 - 2, h3.x1 + 3].forEach((x) => { c.set(x, TOWN.y - 1, T.paletrunk); c.set(x, TOWN.y - 2, T.paletrunk); c.set(x, TOWN.y - 3, T.lantern); });
    // the Barrow: a crypt under the middle house, down a ladder
    const B = BARROW;
    for (let y = B.y0 - 1; y <= B.y1 + 1; y++) for (let x = B.x0 - 1; x <= B.x1 + 1; x++) {
      const edge = x === B.x0 - 1 || x === B.x1 + 1 || y === B.y0 - 1 || y === B.y1 + 1;
      c.set(x, y, edge ? T.palebrick : T.air); c.setb(x, y, c.WL.pale);
    }
    const lx = h2.x0 + 8; for (let y = TOWN.y - 2; y <= B.y1; y++) { c.set(lx, y, T.ladder); c.setb(lx, y, c.WL.pale); }
    c.set(B.x0 + 3, B.y1, T.barrowchest); c.set(B.x1 - 3, B.y1, T.barrowchest);
    c.set(B.x0 + 9, B.y0, T.lantern); c.set(B.x1 - 9, B.y0, T.lantern);
    for (let x = B.x0 + 1; x < B.x1; x++) if (x !== lx && c.get(x, B.y1) === T.air && hash(x, 7, 15) > 0.78) c.set(x, B.y1, T.bonepile);
    for (let x = B.x0 + 12; x <= B.x1 - 12; x += 4) if (x !== lx && x !== lx - 1 && x !== lx + 1) c.set(x, B.y1, T.palebrick); // stone coffins
    S.secretRoom(c, B.x1 + 4, B.y1 - 3, 6, 4, -1, (sx, sy, w, h) => {
      const cx = sx + 2, cy = sy + h - 1; c.set(cx, cy, T.barrowchest); c.meta.special[cx + ',' + cy] = 'wraith_essence'; c.set(sx + 4, cy, T.soulshroom);
    });

    // ---- the Mistspires: a Cyitor watchtower on the highest peak ----
    {
      let px = 600; for (let x = 560; x < 640; x++) if (c.surf[x] < c.surf[px]) px = x;
      const s = c.surf[px]; S.flatten(c, px - 3, px + 3, s, 'ghoststone');
      for (let y = s - 1; y >= s - 15; y--) {
        c.set(px - 2, y, T.palebrick); c.set(px + 2, y, T.palebrick);
        for (let x = px - 1; x <= px + 1; x++) { c.set(x, y, T.air); c.setb(x, y, c.WL.pale); }
        c.set(px, y, T.ladder);
      }
      c.set(px - 2, s - 1, T.air); c.set(px - 2, s - 2, T.air); c.set(px - 2, s - 3, T.air); // the door
      c.set(px - 1, s - 12, T.woodplat); c.set(px + 1, s - 12, T.woodplat);
      for (let x = px - 2; x <= px + 2; x++) c.set(x, s - 16, T.palebrick);
      c.set(px + 1, s - 15, T.lantern);
      c.set(px - 1, s - 13, T.barrowchest);
      c.meta.watchtower = { x: px, y: s - 13 };
    }

    // ---- the Hollows ----
    S.flatten(c, ARENA.x0, ARENA.x1, ARENA.y, 'ghostgrass');
    c.meta.arena = def.boss.arena; c.meta.riftAt = { x: Math.round((ARENA.x0 + ARENA.x1) / 2), y: ARENA.y - 3 };

    c.zone = S.zoneFn(c, (x, y) => {
      if (x >= KEEP.x0 - 4 && x <= KEEP.x1 + 4 && y <= KEEP.y + 2 && y > KEEP.y - 18) return 'keep';
      if (x >= ARENA.x0 && x <= ARENA.x1 && y <= ARENA.y + 2 && y > ARENA.y - 70) return 'arena';
      if (x >= B.x0 - 1 && x <= B.x1 + 10 && y >= B.y0 - 1 && y <= B.y1 + 1) return 'barrow';
      return null;
    });
    c.meta.surf = c.surf;
    return { W, H, fg: c.fg, bg: c.bg, meta: c.meta };
  };

  // ---------- who lives there ----------
  const more = (id, zones) => { const s = RW.SPECIES[id]; if (s && s.spawn) s.spawn.zones = Array.from(new Set((s.spawn.zones || []).concat(zones))); };
  more('ghost', ['bonewood', 'marsh', 'crypt', 'peaks', 'barrow']);
  more('wailer', ['bonewood', 'crypt', 'peaks', 'barrow']);
  more('lutut', ['bonewood', 'marsh', 'peaks']);
  more('ghost_tank', ['peaks', 'crypt']);
  // ---------- their drawings: bone, ash and cold light (no green anywhere) ----------
  const A = RW.art, D = A && A.drawers;
  if (D) {
    const { px, rect, ell, line } = A; const mk = A.canvas;
    const BONE = '#e6dfcf', BONE2 = '#c9c1b0', ASH = '#2a2733', ASH2 = '#3e3a48', INK = '#0a0810', COLD = '#8af0ff', BLOOD = '#ff3040';
    // a skeletal hound: dark hide stretched over bone, ribs showing, a bare skull with cold eyes
    D.pale_hound = function () {
      const frames = [];
      for (let f = 0; f < 2; f++) {
        const c = mk(38, 24), g = c.ctx;
        line(g, 7, 8, 1, 3 + f, BONE2); px(g, 1, 3 + f, BONE);                                   // tail bones
        const legs = f ? [[9, -2], [12, 2], [24, 2], [27, -2]] : [[9, 2], [12, -2], [24, -2], [27, 2]];
        legs.forEach(([x, d], i) => { line(g, x, 13, x + d, 20, i % 2 ? BONE2 : ASH2); line(g, x + d, 20, x + d + 1, 22, BONE); });
        ell(g, 17, 11, 11, 5, ASH); ell(g, 9, 10, 4, 4, ASH2); ell(g, 25, 10, 4, 4, ASH2);       // hide, haunch, shoulder
        for (let i = 0; i < 5; i++) { const x = 12 + i * 3; line(g, x, 8, x - 1, 14, BONE2); px(g, x, 8, BONE); } // ribs
        for (let x = 6; x <= 27; x += 2) px(g, x, 6, BONE);                                     // spine
        line(g, 26, 9, 29, 8, ASH2);                                                            // neck
        ell(g, 31, 8, 4, 3, BONE); rect(g, 33, 8, 5, 3, BONE2);                                  // skull and snout
        rect(g, 29, 7, 2, 2, INK); px(g, 30, 7, COLD);                                           // eye socket
        rect(g, 33, 11, 5, 1, INK); px(g, 34, 11, '#ffffff'); px(g, 36, 11, '#ffffff');           // teeth
        rect(g, 32, 12 + f, 5, 1, BONE2); px(g, 35, 12 + f, '#ffffff');                           // jaw, snapping
        px(g, 37, 9, INK);
        A.outline(c, '#050408'); frames.push(c);
      }
      return frames;
    };
    // a centipede of little bone rings, dragging itself along on thin black legs
    D.grave_crawler = function () {
      const frames = [];
      for (let f = 0; f < 2; f++) {
        const c = mk(26, 12), g = c.ctx;
        for (let i = 0; i < 6; i++) { const x = 3 + i * 3; line(g, x, 7, x - 1 + ((i + f) % 2) * 2, 11, '#1a1720'); line(g, x, 5, x - 1 + ((i + f + 1) % 2) * 2, 2, '#1a1720'); }
        for (let i = 0; i < 6; i++) { const x = 3 + i * 3; ell(g, x, 6, 2, 2, i % 2 ? BONE2 : BONE); px(g, x, 6, ASH); }
        ell(g, 21, 6, 3, 3, BONE); px(g, 22, 5, BLOOD); px(g, 21, 4, BLOOD);                       // head, red pinprick eyes
        line(g, 23, 7, 25, 9 + f, BONE2); line(g, 23, 5, 25, 3 - f, BONE2);                        // mandibles
        A.outline(c, '#050408'); frames.push(c);
      }
      return frames;
    };
    // black sludge from the Soulmire: a skull sunk inside it, too many eyes, dripping
    D.mire_slime = function () {
      const frames = [];
      for (let f = 0; f < 2; f++) {
        const c = mk(26, 20), g = c.ctx; const sq = f;
        const body = '#241e2e', hi = '#4a4060', deep = '#120e18';
        ell(g, 13, 12 + sq, 11 + sq, 6 - sq, body); rect(g, 2 - sq, 12 + sq, 22 + sq * 2, 5 - sq, body);
        rect(g, 3, 16, 20, 1, deep);
        ell(g, 14, 13 + sq, 3, 2, '#4a4458'); px(g, 13, 13 + sq, deep); px(g, 15, 13 + sq, deep); px(g, 14, 15 + sq, deep); // the drowned skull
        for (let x = 6; x <= 19; x++) px(g, x, 7 + sq + (x < 9 || x > 16 ? 1 : 0), hi); px(g, 6, 9 + sq, hi);
        const eye = (x, y) => { rect(g, x, y, 2, 2, '#ece6cc'); px(g, x + 1, y + 1, '#b0102a'); };
        eye(6, 10 + sq); eye(17, 9 + sq); eye(20, 13 + sq); px(g, 10, 10 + sq, '#ece6cc');
        rect(g, 5, 17, 1, 2 + f, body); rect(g, 16, 17, 1, 1 + (1 - f), body); rect(g, 21, 17, 1, 2, body); // drips
        A.outline(c, '#000000'); frames.push(c);
      }
      return frames;
    };
    // a dead tree with a face: grey bark, no leaves, branches ending in long bone fingers
    D.bone_grasper = function () {
      const frames = [];
      for (let f = 0; f < 2; f++) {
        const c = mk(34, 42), g = c.ctx; const bark = '#3e3a46', barkD = '#26222c', barkL = '#5a5466';
        [[-1, 9], [1, 10], [-1, 4], [1, 5]].forEach(([d, k]) => line(g, 17 + d * 2, 40, 17 + d * k, 41, barkD)); // roots
        rect(g, 13, 14, 8, 27, bark); for (let y = 15; y < 40; y += 3) { px(g, 14 + (y % 4), y, barkD); px(g, 19 - (y % 3), y + 1, barkL); }
        rect(g, 11, 38, 12, 3, bark);
        const arm = (x0, y0, x1, y1, hand) => { line(g, x0, y0, x1, y1, bark); line(g, x0, y0 + 1, x1, y1 + 1, barkD); hand.forEach(([dx, dy]) => line(g, x1, y1, x1 + dx, y1 + dy, BONE)); };
        const curl = f ? 1 : 0;
        arm(14, 17, 4, 8, [[-3, -4 + curl], [-1, -6 + curl], [2, -5 + curl], [-4, -1 + curl]]);
        arm(20, 16, 29, 7, [[3, -4 + curl], [1, -6 + curl], [-2, -5 + curl], [4, -1 + curl]]);
        line(g, 17, 14, 16, 4, bark); line(g, 16, 6, 13, 2, barkD); line(g, 16, 8, 19, 3, barkD);
        rect(g, 14, 20, 2, 3, INK); rect(g, 19, 20, 2, 3, INK); px(g, 14, 21, '#c8d0ff'); px(g, 20, 21, '#c8d0ff'); // hollow eyes
        rect(g, 14, 26, 7, 4, INK); [14, 16, 18, 20].forEach((x) => px(g, x, 26, BONE)); [15, 17, 19].forEach((x) => px(g, x, 29, BONE)); // the mouth
        A.outline(c, '#050408'); frames.push(c);
      }
      return frames;
    };
    // a black eel with a row of bone spines, one milky eye and a jaw full of needles
    D.mire_eel = function () {
      const frames = [];
      for (let f = 0; f < 2; f++) {
        const c = mk(32, 12), g = c.ctx; const body = '#1f1e2a', belly = '#3e3a50';
        for (let x = 1; x < 25; x++) {
          const h = x < 8 ? 1 + Math.floor(x / 3) : 3, wob = x < 16 ? Math.round(Math.sin(x * 0.45 + f * 2.2) * 1.2) : 0;
          rect(g, x, 6 - h + wob, 1, h * 2, body); px(g, x, 5 + h + wob, belly);
          if (x > 5 && x % 2 === 0) px(g, x, 5 - h + wob, '#bfc4d8');
        }
        ell(g, 27, 6, 4, 3, body); rect(g, 25, 8, 7, 1, INK);
        [26, 28, 30].forEach((x) => px(g, x, 8, '#f4f0e6')); [27, 29].forEach((x) => px(g, x, 9 - f, '#f4f0e6')); // needle teeth
        rect(g, 27, 4, 2, 2, '#e8e4d8'); px(g, 28, 4, '#9aa0b4');                                  // milky eye
        A.outline(c, '#000000'); frames.push(c);
      }
      return frames;
    };
    // a gaunt pale bat: bare finger-bones holding up torn grey skin, a little skull of a face
    D.mist_bat = function () {
      const frames = [];
      for (let f = 0; f < 2; f++) {
        const c = mk(28, 16), g = c.ctx; const up = f ? -4 : 2;
        const wing = (dir) => {
          const sx = 14 + dir * 2, tip = [14 + dir * 13, 6 + up], low = [14 + dir * 10, 12], mid = [14 + dir * 7, 3 + up];
          g.globalAlpha = 0.55; for (let k = 0; k <= 8; k++) { const t = k / 8; line(g, sx, 8, Math.round(tip[0] + (low[0] - tip[0]) * t), Math.round(tip[1] + (low[1] - tip[1]) * t), '#7a7890'); } g.globalAlpha = 1;
          line(g, sx, 7, mid[0], mid[1], BONE2); line(g, mid[0], mid[1], tip[0], tip[1], BONE); line(g, mid[0], mid[1], low[0], low[1], BONE2);
        };
        wing(-1); wing(1);
        ell(g, 14, 9, 2, 3, ASH); ell(g, 14, 5, 2, 2, BONE); px(g, 12, 2, BONE); px(g, 16, 2, BONE);
        px(g, 13, 5, BLOOD); px(g, 15, 5, BLOOD); px(g, 14, 7, INK);
        px(g, 13, 12, ASH); px(g, 15, 12, ASH);
        A.outline(c, '#05040a'); frames.push(c);
      }
      return frames;
    };
  }

  R.type({ id: 'palewild', name: 'Ghost World Wildlife', creator: 'Shared', color: '#b8c8e0', blurb: 'Things that wandered into the mist and stayed. Pale, cold, and hungry.' });
  const mob = (o) => R.species(Object.assign({ type: 'palewild', world: 'ghost', role: 'enemy', status: 'active' }, o));
  mob({ id: 'pale_hound', name: 'Pale Hound', art: { draw: 'pale_hound' },
    w: 30, h: 20, hp: 150, dmg: 24, speed: 170, behavior: 'charger',
    spawn: { worlds: ['ghost'], medium: 'ground', zones: ['bonewood', 'crypt', 'mist'], weight: 9 },
    drops: [['ectoplasm', 0.6, 1, 2], ['warthog_tusk', 0.5, 1, 2], ['soulshroom', 0.2, 1, 1]],
    blurb: 'A hound that starved in the mist and kept on walking. Hide stretched over bone, one cold eye, and it still charges.' });
  mob({ id: 'grave_crawler', name: 'Grave Crawler', art: { draw: 'grave_crawler' },
    w: 22, h: 11, hp: 110, dmg: 22, speed: 70, behavior: 'crawler',
    spawn: { worlds: ['ghost'], medium: 'ground', zones: ['caves', 'deep', 'barrow'], weight: 8 },
    drops: [['ectoplasm', 0.6, 1, 2], ['stygian_ore', 0.3, 1, 2], ['crawler_shard', 0.4, 1, 2]],
    blurb: 'Crawls the cold caves and the crypts. Likes the taste of Stygian ore.' });
  mob({ id: 'mire_slime', name: 'Mire Slime', art: { draw: 'mire_slime' },
    w: 22, h: 16, hp: 130, dmg: 22, speed: 110, behavior: 'hopper',
    spawn: { worlds: ['ghost'], medium: 'ground', zones: ['marsh'], weight: 12 },
    drops: [['slime_gel', 1, 1, 3], ['ectoplasm', 0.4, 1, 1]],
    blurb: 'Black sludge from the Soulmire with a drowned skull sunk inside it, and far too many eyes. It hops.' });
  mob({ id: 'bone_grasper', name: 'Bone Grasper', art: { draw: 'bone_grasper' },
    w: 24, h: 34, hp: 220, dmg: 24, speed: 0, behavior: 'grabber',
    spawn: { worlds: ['ghost'], medium: 'ground', zones: ['bonewood'], weight: 5 },
    drops: [['wood', 0.8, 2, 4], ['ectoplasm', 0.5, 1, 2], ['living_vine', 0.3, 1, 2]],
    blurb: 'Looks like every other dead tree in the Bonewood, until it grabs you.' });
  mob({ id: 'mire_eel', name: 'Mire Eel', art: { draw: 'mire_eel' },
    w: 26, h: 12, hp: 100, dmg: 20, speed: 100, behavior: 'dasher',
    spawn: { worlds: ['ghost'], medium: 'water', zones: ['marsh', 'ocean'], weight: 10 },
    drops: [['fish_spine', 0.4, 1, 2], ['ectoplasm', 0.4, 1, 1]],
    blurb: 'Lives in the black pools of the Soulmire. Keep to the boardwalks.' });
  mob({ id: 'mist_bat', name: 'Mist Bat', art: { draw: 'mist_bat' },
    w: 16, h: 10, hp: 70, dmg: 18, speed: 100, behavior: 'flyer',
    spawn: { worlds: ['ghost'], medium: 'air', zones: ['peaks', 'caves', 'bonewood'], weight: 3 },
    drops: [['bat_wing', 0.7, 1, 2], ['ectoplasm', 0.3, 1, 1]],
    blurb: 'Roosts in the Mistspires. You hear it before you see it.' });
  // Ghosts float, so they get almost every spawn spot (most spots are open air). In the Ghost World, about half of the
  // ghosts that would turn up out in the open are swapped for whatever lives on the ground (or in the pool) below that spot.
  const E = RW.ent, TS = RW.TILE;
  const FLOATERS = new Set(['ghost', 'wailer']);
  const baseTry = E && E.trySpawn;
  if (baseTry) E.trySpawn = function (dt) {
    const n0 = E.enemies.length; const out = baseTry.apply(this, arguments);
    try {
      const Wd = RW.world; if (!Wd || !Wd.def || Wd.def.id !== 'ghost' || E.enemies.length !== n0 + 1) return out;
      const e = E.enemies[E.enemies.length - 1]; if (!FLOATERS.has(e.sp) || Math.random() > 0.55) return out;
      const T = RW.T, tx = Math.floor((e.x + e.w / 2) / TS); let ty = Math.floor((e.y + e.h - 1) / TS);
      for (let k = 0; k < 40 && ty < Wd.H - 2 && !Wd.solid(tx, ty + 1) && Wd.get(tx, ty + 1) !== T.water; k++) ty++;
      const below = Wd.get(tx, ty + 1), wet = below === T.water && Wd.get(tx, ty + 2) === T.water;
      if (!wet && (!Wd.solid(tx, ty + 1) || Wd.solid(tx, ty) || Wd.solid(tx, ty - 1) || Wd.solid(tx + 1, ty))) return out;
      const z = Wd.zoneAt(tx, ty + (wet ? 2 : 0)), medium = wet ? 'water' : 'ground';
      const opts = Object.values(RW.SPECIES).filter((s) => s.status === 'active' && s.spawn && (s.spawn.worlds || []).includes('ghost') && s.spawn.medium === medium && (s.spawn.zones || []).includes(z));
      if (!opts.length) return out;
      let r = Math.random() * opts.reduce((t, o) => t + o.spawn.weight, 0), pick = opts[0];
      for (const o of opts) { r -= o.spawn.weight; if (r <= 0) { pick = o; break; } }
      E.enemies.pop();
      const yy = wet ? (ty + 3) * TS - pick.h - TS / 2 : (ty + 1) * TS - pick.h;
      E.spawnEnemy(pick.id, tx * TS, yy);
    } catch (err) { console.warn('ghost world spawns', err); }
    return out;
  };
  // drops that don't exist in this build are left out rather than breaking the loot
  ['pale_hound', 'grave_crawler', 'mire_slime', 'bone_grasper', 'mire_eel', 'mist_bat'].forEach((id) => { const s = RW.SPECIES[id]; s.drops = s.drops.filter(([it]) => RW.ITEMS[it]); });
})(window.RW);
