// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 17: Rock World chests, a map that fills in as you go, and a quieter far-off world.
//  * Chests by kind, each with its own Terraria-style picture in the bag and hotbar and its own look when placed:
//    Storage Chest (wood, 20 slots), Stone Chest (30), Crystal Chest (40), Abyssal Chest (60).
//  * The big map (M) is drawn piece by piece: only the parts you've explored, and only the bits that changed since
//    last time, instead of the whole world every time you open it.
//  * A small minimap in the corner shows the explored land around you and fills in as you explore (N hides it).
//  * Far away, the world waits: townsfolk more than 90 blocks from every hero stand still, and the sky line is only
//    worked out again for the columns that changed.
(function (RW) {
  'use strict';
  const A = RW.art, E = RW.ent, P = RW.player, WD = RW.world, U = RW.ui, R = RW.register, VA = RW.v3art, TS = RW.TILE;
  if (!A || !WD || !VA) return;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d'); return c; };
  const sh = (c, k) => RW.shade(c, k), ramp = (c) => [sh(c, -0.6), sh(c, -0.38), sh(c, -0.16), c, sh(c, 0.25), sh(c, 0.5), sh(c, 0.75)];

  // ---------------- chests ----------------
  const KINDS = [
    { id: 'storage_chest', key: 'storagechest', name: 'Storage Chest', body: '#8a6440', band: '#6a6a74', trim: '#c8a060', gem: null, size: 20 },
    { id: 'stone_chest', key: 'stonechest', name: 'Stone Chest', body: '#6e6a72', band: '#45424c', trim: '#a8a2a8', gem: '#7ad0e8', size: 30 },
    { id: 'crystal_chest', key: 'crystalchest', name: 'Crystal Chest', body: '#4a5a8a', band: '#c8d8f0', trim: '#e8f4ff', gem: '#9ad8ff', size: 40 },
    { id: 'abyssal_chest', key: 'abyssalchest', name: 'Abyssal Chest', body: '#221a30', band: '#4a3270', trim: '#a088e0', gem: '#b89aff', size: 60 },
  ];
  function chestArt(k, W, H, g) { // a chest in the item style: lid, bands, lock, a gem for the better ones
    const B = ramp(k.body), N = ramp(k.band), Tm = ramp(k.trim), s = W / 32;
    g.save(); g.scale(s, s);
    g.fillStyle = B[2]; g.fillRect(3, 13, 26, 15); g.fillStyle = B[3]; g.fillRect(3, 13, 26, 4); g.fillStyle = B[1]; g.fillRect(3, 25, 26, 3);
    g.fillStyle = B[4]; g.beginPath(); g.moveTo(3, 13); g.lineTo(5, 6); g.quadraticCurveTo(16, 2, 27, 6); g.lineTo(29, 13); g.closePath(); g.fill();
    g.fillStyle = B[5]; g.beginPath(); g.moveTo(5, 7); g.quadraticCurveTo(16, 3, 27, 7); g.lineTo(26, 9); g.quadraticCurveTo(16, 5.5, 6, 9); g.fill();
    if (k.id === 'storage_chest') { g.fillStyle = B[1]; for (let x = 7; x < 28; x += 6) g.fillRect(x, 17, 1, 8); }
    if (k.id === 'stone_chest') { g.fillStyle = B[1]; g.fillRect(9, 19, 4, 1); g.fillRect(20, 22, 5, 1); g.fillRect(14, 8, 3, 1); }
    if (k.id === 'crystal_chest') { [[7, 6], [24, 5], [12, 4]].forEach(([x, y]) => { g.fillStyle = ramp(k.gem)[4]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 4); g.lineTo(x + 4, y); g.fill(); }); }
    if (k.id === 'abyssal_chest') { g.fillStyle = Tm[2]; for (let x = 6; x < 28; x += 5) { g.fillRect(x, 26, 1, 3); } g.fillStyle = ramp(k.gem)[3]; g.fillRect(5, 19, 2, 2); g.fillRect(25, 19, 2, 2); }
    g.fillStyle = N[2]; g.fillRect(3, 12, 26, 2); g.fillStyle = N[4]; g.fillRect(3, 12, 26, 0.8);
    g.fillStyle = N[3]; g.fillRect(6, 4, 3, 24); g.fillRect(23, 4, 3, 24); g.fillStyle = N[5]; g.fillRect(6, 4, 1, 24); g.fillRect(23, 4, 1, 24);
    g.fillStyle = Tm[3]; g.fillRect(13, 11, 6, 8); g.fillStyle = Tm[5]; g.fillRect(13, 11, 6, 1.5); g.fillStyle = Tm[0]; g.fillRect(15.4, 14, 1.4, 3);
    if (k.gem) { g.fillStyle = ramp(k.gem)[3]; g.beginPath(); g.arc(16, 8, 2, 0, 6.283); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(15, 7, 1, 1); }
    g.restore();
  }
  KINDS.forEach((k) => {
    VA.painters['chest_' + k.id] = { pal: ['#0c0a10', '#ffffff'].concat(ramp(k.body), ramp(k.band), ramp(k.trim), k.gem ? ramp(k.gem) : []), fn(g) { chestArt(k, 48, 48, g); } };
    if (k.id !== 'storage_chest') {
      if (RW.T[k.key] == null) { const id = RW.TILES.length; RW.TILES.push({ id, key: k.key, name: k.name, solid: true, hard: 1, time: 0.6, decor: 'v3chest_' + k.key, chest: 'storage', storage: true, size: k.size, drop: k.id }); RW.T[k.key] = id; }
      R.item({ id: k.id, name: k.name, kind: 'place', place: k.key, icon: { s: 'chest', a: k.body, b: k.band }, desc: 'Put it down, then press R or right-click it to keep things in it. Holds ' + k.size + ' stacks.' });
    } else { const st = RW.TILES[RW.T.storagechest]; if (st) st.size = 20; }
    RW.ITEMS[k.id].v3art = 'chest_' + k.id;
    if (k.id !== 'storage_chest') A.decorExtra['v3chest_' + k.key] = (g, t, x, y) => { const c = mk(32, 32); chestArt(k, 32, 32, c.ctx); g.drawImage(c, x - 1, y - 1, 18, 18); };
  });
  R.recipes([
    { out: 'stone_chest', in: { stone: 30, iron_bar: 2 }, at: 'knap' },
    { out: 'crystal_chest', in: { crystal_dust: 12, crystal_shard: 4, iron_bar: 4 }, at: 'forge' },
    { out: 'abyssal_chest', in: { abyssite_bar: 6, stone: 20 }, at: 'forge' },
  ].filter((r) => Object.keys(r.in).every((k) => RW.ITEMS[k])));
  Object.keys(A.icons || {}).forEach((k) => { if (/chest/.test(k)) delete A.icons[k]; });

  // ---------------- the map, a piece at a time ----------------
  const CH = 32; const maps = {};          // per world (by store key): { img, done:Set of chunk ids, dirty:Set }
  const mkey = () => (WD.def && (WD.def.store || WD.def.id)) + ':' + WD.W + 'x' + WD.H;
  const st = () => { const k = mkey(); if (!maps[k]) maps[k] = { img: null, done: new Set(), dirty: new Set() }; return maps[k]; };
  const chunkId = (x, y) => Math.floor(y / CH) * 10000 + Math.floor(x / CH);
  let cols = null, colsFor = -1;
  function colours() {
    if (cols && colsFor === RW.TILES.length) return cols; const TL = RW.TILES, T = RW.T; cols = {}; colsFor = TL.length;
    TL.forEach((t, i) => { cols[i] = t.colors ? RW.hexToRgb(t.colors[0]) : t.crystal ? RW.hexToRgb(t.crystal) : null; });
    cols[T.water] = [40, 100, 140]; cols[T.walkway] = [140, 135, 140]; cols[T.chain] = [120, 128, 136]; cols[T.lantern] = [140, 240, 210];
    ['ladder', 'ropebridge', 'stairplank', 'woodplat', 'rope'].forEach((k) => { if (T[k] != null) cols[T[k]] = [168, 128, 82]; }); return cols;
  }
  function paintChunk(m, cx, cy) {
    const W = WD, x0 = cx * CH, y0 = cy * CH, w = Math.min(CH, W.W - x0), h = Math.min(CH, W.H - y0); if (w <= 0 || h <= 0) return;
    const id = m.img.ctx.createImageData(w, h), d = id.data, C = colours(); let any = false;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y0 + y) * W.W + x0 + x, o = (y * w + x) * 4;
      if (!W.explored[i]) { d[o] = 8; d[o + 1] = 7; d[o + 2] = 11; d[o + 3] = 255; continue; }
      any = true; let c3 = C[W.fg[i]]; if (!c3) c3 = W.bg[i] ? [34, 31, 40] : ((y0 + y) < W.def.sea ? [60, 80, 110] : [20, 18, 26]);
      d[o] = c3[0]; d[o + 1] = c3[1]; d[o + 2] = c3[2]; d[o + 3] = 255;
    }
    m.img.ctx.putImageData(id, x0, y0); if (any) m.done.add(chunkId(x0, y0));
  }
  function refreshMap(budgetMs) {
    const m = st(), t0 = performance.now();
    if (!m.img || m.img.width !== WD.W || m.img.height !== WD.H) {
      m.img = A.canvas ? A.canvas(WD.W, WD.H) : mk(WD.W, WD.H); if (!m.img.ctx) m.img.ctx = m.img.getContext('2d');
      m.img.ctx.fillStyle = '#08070b'; m.img.ctx.fillRect(0, 0, WD.W, WD.H); m.done.clear(); m.dirty.clear();
      // only chunks with something explored in them get drawn
      const nx = Math.ceil(WD.W / CH), ny = Math.ceil(WD.H / CH);
      for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) { let e = false; for (let y = cy * CH; y < Math.min(WD.H, cy * CH + CH) && !e; y += 2) { const row = y * WD.W; for (let x = cx * CH; x < Math.min(WD.W, cx * CH + CH); x += 2) if (WD.explored[row + x]) { e = true; break; } } if (e) m.dirty.add(cy * 10000 + cx); }
    }
    for (const c of m.dirty) { paintChunk(m, c % 10000, Math.floor(c / 10000)); m.dirty.delete(c); if (budgetMs && performance.now() - t0 > budgetMs) break; }
    return m.img;
  }
  // exploring and building mark their chunks
  const baseMark = WD.markExplored;
  WD.markExplored = function (cx, cy, r) { const out = baseMark.apply(this, arguments); const m = st(); for (let y = cy - r; y <= cy + r; y += CH / 2) for (let x = cx - r; x <= cx + r; x += CH / 2) if (WD.inb(Math.max(0, Math.min(WD.W - 1, x)), Math.max(0, Math.min(WD.H - 1, y)))) m.dirty.add(Math.floor(RW.clamp(y, 0, WD.H - 1) / CH) * 10000 + Math.floor(RW.clamp(x, 0, WD.W - 1) / CH)); return out; };
  const baseSet = WD.set;
  if (baseSet) WD.set = function (x, y) { const r = baseSet.apply(this, arguments); try { st().dirty.add(chunkId(x, y)); skyCols.add(x); } catch (e) { /* fine */ } return r; };
  // the big map uses the piece-by-piece picture
  if (U.renderMap) {
    const baseRender = U.renderMap;
    U.renderMap = function () {
      RW.v3mapImg = refreshMap(0);
      // let the base set up its view without walking every block: it loops over WD.fg, so hand it an empty one for a moment
      const fg = WD.fg; WD.fg = []; try { return baseRender.apply(this, arguments); } finally { WD.fg = fg; }
    };
    const baseDM = U.drawMap;
    U.drawMap = function () {
      const c = document.getElementById('mapc'); if (!c) return baseDM.apply(this, arguments);
      // the base draw reads its own cached picture; swap in ours for the one drawImage of the whole world
      const g = c.getContext('2d'), raw = g.drawImage, img = RW.v3mapImg || refreshMap(0);
      g.drawImage = function (src, sx, sy, sw, sh2) { if (arguments.length === 9 && sw === WD.W && sh2 === WD.H) { const a = Array.from(arguments); a[0] = img; return raw.apply(this, a); } return raw.apply(this, arguments); };
      try { return baseDM.apply(this, arguments); } finally { g.drawImage = raw; }
    };
  }

  // ---------------- the minimap ----------------
  let mini = null, miniOn = RW.store ? RW.store.get('v3_minimap', true) !== false : true, miniT = 0;
  function miniEl() {
    if (mini) return mini; mini = document.createElement('canvas'); mini.id = 'v3mini'; mini.width = 168; mini.height = 104;
    Object.assign(mini.style, { position: 'fixed', left: '16px', top: '92px', width: '168px', height: '104px', border: '2px solid #3e3658', background: '#08070b', imageRendering: 'pixelated', zIndex: 5, pointerEvents: 'none', opacity: '0.92' });
    document.body.appendChild(mini); return mini;
  }
  function drawMini() {
    const playing = RW.game && RW.game.playing && !P.dead && WD.W, el = miniEl();
    el.style.display = playing && miniOn && !(U.blocking && U.blocking()) ? 'block' : 'none'; if (el.style.display === 'none') return;
    const img = refreshMap(3), g = el.getContext('2d'), z = 2, vw = el.width / z, vh = el.height / z, cx = (P.x + 6) / TS, cy = (P.y + 14) / TS;
    g.imageSmoothingEnabled = false; g.fillStyle = '#08070b'; g.fillRect(0, 0, el.width, el.height);
    g.drawImage(img, Math.round(cx - vw / 2), Math.round(cy - vh / 2), vw, vh, 0, 0, el.width, el.height);
    g.fillStyle = '#ffb347'; g.fillRect(el.width / 2 - 2, el.height / 2 - 3, 4, 4);
    if (RW.net && RW.net.peers) { g.fillStyle = '#9ad8ff'; RW.net.peers.forEach((q) => { const x = (q.x / TS - cx) * z + el.width / 2, y = (q.y / TS - cy) * z + el.height / 2; if (x > 0 && y > 0 && x < el.width && y < el.height) g.fillRect(x - 1.5, y - 1.5, 3, 3); }); }
  }
  setInterval(() => { try { drawMini(); } catch (e) { /* only a picture */ } }, 250);
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyN' && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) { miniOn = !miniOn; if (RW.store) RW.store.set('v3_minimap', miniOn); drawMini(); U.toast && U.toast(miniOn ? 'Minimap on (N to hide).' : 'Minimap off (N to show).'); } });

  // ---------------- a quieter far-off world ----------------
  const skyCols = new Set();
  const baseSky = WD.recalcSky;
  if (baseSky) WD.recalcSky = function () {
    // only the columns that changed, when we know them and the sky line is already there
    if (WD.def && WD.def.id === 'rock' && WD.skyTop && WD.skyTop.length === WD.W && skyCols.size && skyCols.size < 64) {
      const TL = RW.TILES; skyCols.forEach((x) => { if (x < 0 || x >= WD.W) return; let y = 0; while (y < WD.H && !TL[WD.fg[y * WD.W + x]].solid && WD.bg[y * WD.W + x] === 0) y++; WD.skyTop[x] = y; });
      skyCols.clear(); WD.dirtySky = false; return;
    }
    skyCols.clear(); return baseSky.apply(this, arguments);
  };
  const baseNpcs = E.updateNpcs;
  if (baseNpcs) E.updateNpcs = function () {
    if (!E.npcs || E.npcs.length < 6) return baseNpcs.apply(this, arguments);
    const far = 90 * TS, heroes = [{ x: P.x, y: P.y }]; if (RW.net && RW.net.peers) RW.net.peers.forEach((q) => heroes.push({ x: q.x, y: q.y }));
    const all = E.npcs, near = all.filter((n) => heroes.some((h) => Math.abs(n.x - h.x) < far && Math.abs(n.y - h.y) < far));
    E.npcs = near; try { return baseNpcs.apply(this, arguments); } finally { all.forEach((n, i) => { }); E.npcs = all; }
  };
  RW.v3map = { refreshMap, chests: KINDS, state: st };
})(window.RW);
