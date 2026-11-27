// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 30: slopes, half blocks, and blocks that blend into each other (Rock World).
//  * Natural stone, dirt and sand take their shape from what is around them, like Terraria's slopes:
//      a floor block with open space above and to one side becomes a slope rising away from the open side;
//      a lone bump with open space on both sides becomes a half block;
//      a ceiling block with open space below and to one side is cut at an angle too (looks only).
//    Blocks you placed keep their square shape. Bricks, planks, ores, chests and anything built stay square.
//  * They are real: you walk up a slope without jumping and step onto a half block; you stand on the slope's surface.
//  * Blending: where two different natural blocks meet, each speckles a few pixels into the other along the seam,
//    so stone runs into ore, sand into rock, coral into reef, instead of meeting at a hard line.
(function (RW) {
  'use strict';
  const WD = RW.world, E = RW.ent, TS = RW.TILE;
  if (!WD || !E) return;
  const BUILT = { brick: 1, plank: 1, plate: 1, stake: 1, books: 1 };
  const NATTEX = { rough: 1, layer: 1, sand: 1, soil: 1, soil2: 1, pebble: 1, nodule: 1, spire: 1 };
  const T = () => RW.TILES;
  const on = () => WD.def && WD.def.id === 'rock';
  const shapeable = (id) => { const t = T()[id]; return !!(t && t.solid && !t.decor && NATTEX[t.tex] && !t.ore && !t.loot && !t.storage && !t.toggle && (t.hard || 0) < 50); };
  const naturalSolid = (id) => { const t = T()[id]; return !!(t && t.solid && !t.decor && !BUILT[t.tex] && !t.loot && !t.storage && !t.toggle && (t.hard || 0) < 50); };
  const openId = (id) => { const t = T()[id]; return !!(t && !t.solid && !t.platform); };
  const placed = () => RW.v2placed;
  const G = (x, y) => (x >= 0 && y >= 0 && x < WD.W && y < WD.H ? WD.fg[y * WD.W + x] : RW.T.bedrock); // straight from the cells, never through a wrapped WD.get
  // 0 full, 1 half, 2 slope rising to the right, 3 slope rising to the left, 4/5 ceiling cuts (looks only)
  function shapeAt(x, y) {
    if (!on()) return 0;
    const id = G(x, y); if (!shapeable(id)) return 0;
    const pl = placed(); if (pl && pl.has && pl.has(WD.idx(x, y))) return 0;
    const up = openId(G(x, y - 1)), dn = openId(G(x, y + 1)), lf = openId(G(x - 1, y)), rt = openId(G(x + 1, y));
    const h = RW.hash2(x, y, 515);
    if (up && !dn) {
      if (lf && !rt) return h < 0.85 ? 2 : 0;
      if (rt && !lf) return h < 0.85 ? 3 : 0;
      if (lf && rt) return h < 0.7 ? 1 : 0;
      return 0;
    }
    if (dn && !up) {
      if (lf && !rt) return h < 0.6 ? 4 : 0;
      if (rt && !lf) return h < 0.6 ? 5 : 0;
    }
    return 0;
  }
  RW.v3shapeAt = shapeAt;
  // how far below the top of the block the surface is, at fx (0..1 across the block), for floor shapes
  const surf = (s, fx) => (s === 1 ? 0.5 : s === 2 ? 1 - fx : s === 3 ? fx : 0) * TS;
  const floorShape = (s) => s >= 1 && s <= 3;

  // ---------------- walking on them ----------------
  const baseMove = E.move;
  E.move = function (o, dt, opts) {
    if (!on() || !o || (o.vy || 0) < 0) return baseMove.apply(this, arguments);
    // for the move itself, floor-shaped blocks are not in the way: the surface is resolved afterwards
    const oSolid = WD.solid, oGet = WD.get, AIR = RW.T.air;
    WD.solid = function (x, y) { if (floorShape(shapeAt(x, y))) return false; return oSolid(x, y); };
    WD.get = function (x, y) { const id = oGet(x, y); if (id !== AIR && floorShape(shapeAt.call(null, x, y))) return AIR; return id; };
    let res;
    try { res = baseMove.apply(this, arguments); } finally { WD.solid = oSolid; WD.get = oGet; }
    // stand on the surface: pushed up out of the slope, or kept on it walking down
    const fx = o.x + o.w / 2, fy = o.y + o.h, tx = Math.floor(fx / TS), grounded = !!(opts && opts.grounded && !opts.drop);
    for (const ty of [Math.floor((fy - 0.5) / TS), Math.floor((fy + 0.5) / TS)]) {
      const sh = shapeAt(tx, ty); if (!floorShape(sh)) continue;
      const sy = ty * TS + surf(sh, (fx - tx * TS) / TS);
      if ((fy > sy && fy <= ty * TS + TS + 2) || (grounded && fy <= sy && sy - fy <= 7)) { o.y = sy - o.h; o.vy = 0; if (res) res.ground = true; break; }
    }
    return res;
  };

  // ---------------- light passes into them ----------------
  // the light pass sees a slope or half block as the open space it mostly is (otherwise its cut-off part stays dark)
  const baseLight = WD.computeLight;
  if (baseLight) WD.computeLight = function (tx0, ty0, tw, th) {
    if (!on()) return baseLight.apply(this, arguments);
    const swapped = [], W = WD.W, fg = WD.fg, AIR = RW.T.air, WATER = RW.T.water;
    for (let y = ty0 - 2; y <= ty0 + th + 2; y++) for (let x = tx0 - 2; x <= tx0 + tw + 2; x++) {
      const s = shapeAt(x, y); if (!s) continue;
      const i = y * W + x, wet = G(x, y - 1) === WATER || G(x, y + 1) === WATER || G(x - 1, y) === WATER || G(x + 1, y) === WATER;
      swapped.push(i, fg[i]);
    }
    for (let k = 0; k < swapped.length; k += 2) { const i = swapped[k]; const x = i % W, y = (i / W) | 0; fg[i] = (G(x, y - 1) === WATER || G(x, y + 1) === WATER || G(x - 1, y) === WATER || G(x + 1, y) === WATER) ? WATER : AIR; }
    try { return baseLight.apply(this, arguments); } finally { for (let k = 0; k < swapped.length; k += 2) fg[swapped[k]] = swapped[k + 1]; }
  };

  // ---------------- drawing them ----------------
  const STEP = TS / 8;
  function shapePath(g, s, x, y, keep) {
    if (!keep) g.beginPath();
    if (s === 1) { g.rect(x, y + TS / 2, TS, TS / 2); return; }
    // stepped diagonals, so the cut stays pixelated
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const a = k * STEP;
      if (s === 2) pts.push([x + a, y + TS - a], [x + a + STEP, y + TS - a]);       // floor rising right
      if (s === 3) pts.push([x + TS - a, y + TS - a], [x + TS - a - STEP, y + TS - a]); // floor rising left
      if (s === 4) pts.push([x + a, y + a], [x + a + STEP, y + a]);                 // ceiling, open below-left
      if (s === 5) pts.push([x + TS - a, y + a], [x + TS - a - STEP, y + a]);
    }
    if (s === 2) { g.moveTo(x, y + TS); pts.forEach(([a, b]) => g.lineTo(Math.min(a, x + TS), Math.max(b, y))); g.lineTo(x + TS, y + TS); }
    if (s === 3) { g.moveTo(x + TS, y + TS); pts.forEach(([a, b]) => g.lineTo(Math.max(a, x), Math.max(b, y))); g.lineTo(x, y + TS); }
    if (s === 4) { g.moveTo(x, y); pts.forEach(([a, b]) => g.lineTo(Math.min(a, x + TS), Math.min(b, y + TS))); g.lineTo(x + TS, y); }
    if (s === 5) { g.moveTo(x + TS, y); pts.forEach(([a, b]) => g.lineTo(Math.max(a, x), Math.min(b, y + TS))); g.lineTo(x, y); }
    g.closePath();
  }
  const solid4 = (x, y) => { const T2 = T(), ok = (q) => { const d = T2[q]; return !!(d && d.solid); }; return ok(G(x - 1, y)) && ok(G(x + 1, y)) && ok(G(x, y - 1)) && ok(G(x, y + 1)); };
  const naturalSolidT = (t) => !!(t && t.solid && !t.decor && !BUILT[t.tex] && !t.loot && !t.storage && !t.toggle && (t.hard || 0) < 50);
  const colOf = (t, k) => (t.ore && k === 2 ? t.ore : (t.colors && t.colors[k % 2]) || '#444');
  const baseTiles = WD.drawTiles;
  WD.drawTiles = function (g, cam, vw, vh) {
    if (!on() || (RW.v3zoom && RW.v3zoom.far())) return baseTiles.apply(this, arguments);
    const raw = g.drawImage, shapes = new Map();
    const tx0 = Math.floor(cam.x / TS) - 1, tx1 = Math.ceil((cam.x + vw) / TS) + 1, ty0 = Math.floor(cam.y / TS) - 1, ty1 = Math.ceil((cam.y + vh) / TS) + 1;
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) { const s = shapeAt(x, y); if (s) shapes.set(x + ',' + y, s); }
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y);
    g.drawImage = function (img, x, y, w, h) {
      if (img && (arguments.length === 3 || arguments.length === 5) && (arguments.length === 3 ? img.width === 16 : w === TS)) {
        const tx = Math.round((x - ox) / TS), ty = Math.round((y - oy) / TS);
        if (Math.abs(x - ox - tx * TS) < 0.01 && Math.abs(y - oy - ty * TS) < 0.01) {
          const t = T()[G(tx, ty)];
          const s = shapes.get(tx + ',' + ty);
          if (s && t && t.solid) { g.save(); shapePath(g, s, x, y); g.clip(); const r = raw.apply(this, arguments); g.restore(); return r; }
          // 3.23: no two blocks alike. A buried natural block is drawn turned (mirrored either way), a shade lighter or
          // darker, with a couple of flecks of its own colours, so the same block never repeats in a pattern
          if (t && naturalSolidT(t) && !t.ore && solid4(tx, ty) && !(RW.v3dbg && RW.v3dbg.novar)) {
            const h = RW.hash2(tx, ty, 707), fx = h < 0.5, fy = t.tex !== 'layer' && RW.hash2(tx, ty, 708) < 0.5;
            let r;
            if (fx || fy) { g.save(); g.translate(x + (fx ? TS : 0), y + (fy ? TS : 0)); g.scale(fx ? -1 : 1, fy ? -1 : 1); r = arguments.length === 5 ? raw.call(this, img, 0, 0, TS, TS) : raw.call(this, img, 0, 0); g.restore(); } else r = raw.apply(this, arguments);
            const k = RW.hash2(tx, ty, 709) - 0.5;
            g.fillStyle = k > 0 ? 'rgba(255,255,255,' + (k * 0.1).toFixed(3) + ')' : 'rgba(0,0,0,' + (-k * 0.14).toFixed(3) + ')'; g.fillRect(x, y, TS, TS);
            const c1 = (t.colors && t.colors[1]) || '#777', c2 = (t.colors && t.colors[2]) || '#333';
            for (let q = 0; q < 3; q++) { const a1 = RW.hash2(tx * 3 + q, ty, 710), a2 = RW.hash2(tx, ty * 3 + q, 711); g.fillStyle = q % 2 ? c1 : c2; g.fillRect(x + Math.floor(a1 * 7) * 2, y + Math.floor(a2 * 7) * 2, 2, 2); }
            return r;
          }
        }
      }
      return raw.apply(this, arguments);
    };
    let r;
    try { r = baseTiles.apply(this, arguments); } finally { g.drawImage = raw; }
    // the cut-off part of a block in the water is water too; the slope gets a lit rim along its face
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    shapes.forEach((s, k) => {
      const [x, y] = k.split(',').map(Number), sx = x * TS + ox, sy = y * TS + oy;
      const wet = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([a, b]) => WD.get(x + a, y + b) === RW.T.water);
      g.save(); g.beginPath(); g.rect(sx, sy, TS, TS); shapePath(g, s, sx, sy, true); g.clip('evenodd');
      if (wet) { g.fillStyle = 'rgba(20,70,124,0.62)'; g.fillRect(sx, sy, TS, TS); }
      g.restore();
      if (floorShape(s)) { g.fillStyle = 'rgba(255,255,240,0.16)'; for (let q = 0; q < 8; q++) { const fx = q / 8, py = sy + surf(s, fx + 0.06); g.fillRect(sx + q * STEP, Math.round(py), STEP, 1); } }
    });
    // blending: speckles of each block into its neighbour along the seam
    const T2 = T(); if (!(RW.v3dbg && RW.v3dbg.noblend))
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      const a = T2[WD.get(x, y)]; if (!naturalSolidT(a)) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const b = T2[WD.get(x + dx, y + dy)]; if (!naturalSolidT(b) || b === a) continue;
        if (shapes.has(x + ',' + y) || shapes.has((x + dx) + ',' + (y + dy))) continue;
        const sx = (x + dx) * TS + ox, sy = (y + dy) * TS + oy; // the seam is at the start of the second block
        for (let k = 0; k < 16; k++) {
          const h = RW.hash2(x * 7 + k, y * 3 + dx, 601), h2 = RW.hash2(x + k * 13, y, 602), along = Math.floor(h * 8) * 2, deep = Math.floor(h2 * h2 * 5) * 1.6;
          const into = k % 2, sz = h2 < 0.3 ? 3 : 2; // odd: b's colour into a; even: a's colour into b (most near the seam, a few further in)
          g.fillStyle = colOf(into ? b : a, k);
          if (dx) g.fillRect(into ? sx - deep - sz : sx + deep, sy + along, sz, 2); else g.fillRect(sx + along, into ? sy - deep - sz : sy + deep, 2, sz);
        }
      }
    }
    g.restore();
    return r;
  };
})(window.RW);
