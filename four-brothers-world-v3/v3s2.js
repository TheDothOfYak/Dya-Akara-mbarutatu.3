// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 2: a sharper picture.
//  * The game draws at your screen's real resolution instead of a small picture blown up. Positions in the world don't
//    change (a block is still 16 units); only how finely things are drawn.
//  * Blocks are drawn 20 x 20 pixels (400 pixels each, up from 256), on a screen size that keeps every block pixel
//    the same size: a block is 40, 60 or 80 screen pixels, picked from the window height.
//  * Wherever a block meets open air its edge is worn and uneven, with rounded outer corners, a dark rim and a lit top,
//    so the ground reads as rock and earth instead of a grid of squares. The wear follows the world, so neighbouring
//    blocks line up. (Only the look changes: walking and digging work exactly as before.)
//  * Zoom: - zooms out, = zooms in (three steps). Saved in this browser.
(function (RW) {
  'use strict';
  const WD = RW.world, A = RW.art, TS = RW.TILE, U = RW.ui;
  if (!WD || !A) return;
  const HD = (RW.v2hd = { k: 3, scale: 3.75, zoom: RW.store.get('v2_zoom', 0) | 0, on: true });
  const T20 = 20;

  // ---------------- 1. screen size: a block is 20*k device pixels ----------------
  const cv = document.getElementById('game');
  function want() {
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const W = Math.round(window.innerWidth * dpr), H = Math.round(window.innerHeight * dpr);
    const k0 = Math.max(2, Math.round(H / 330));
    const k = Math.max(1, Math.min(k0 + 2, k0 - HD.zoom));
    return { W, H, k, scale: (T20 * k) / TS };
  }
  function apply(force) {
    const w = want(), v = RW.view;
    if (!force && cv.width === w.W && cv.height === w.H && HD.scale === w.scale && v.scale === w.scale) return;
    HD.k = w.k; HD.scale = w.scale;
    if (cv.width !== w.W || cv.height !== w.H) { cv.width = w.W; cv.height = w.H; }
    v.scale = w.scale; v.w = Math.ceil(w.W / w.scale); v.h = Math.ceil(w.H / w.scale);
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  }
  RW.v2hdApply = apply;
  // the mouse: from screen to world, through the view (not the canvas's pixel count)
  let mouseHooked = false;
  function hookMouse() {
    if (mouseHooked || !RW.mouseWorld) return; mouseHooked = true;
    RW.mouseWorld = () => { const r = cv.getBoundingClientRect(); return { x: (RW.input.mouse.x - r.left) * RW.view.w / r.width + RW.cam.x, y: (RW.input.mouse.y - r.top) * RW.view.h / r.height + RW.cam.y }; };
  }
  // the first thing drawn each frame: size the canvas and set the scale
  const baseBackdrop = WD.drawBackdrop;
  WD.drawBackdrop = function (g) {
    hookMouse(); apply(false);
    g.setTransform(HD.scale, 0, 0, HD.scale, 0, 0); g.imageSmoothingEnabled = false;
    return baseBackdrop.apply(this, arguments);
  };
  window.addEventListener('resize', () => setTimeout(() => apply(true), 0));

  // zoom keys
  [['zoomout', 'Zoom out', ['Minus', 'NumpadSubtract']], ['zoomin', 'Zoom in', ['Equal', 'NumpadAdd']]].forEach(([id, label, keys]) => {
    if (!RW.ACTIONS.some((a) => a[0] === id)) { RW.ACTIONS.push([id, label, keys]); if (!RW.binds[id]) RW.binds[id] = keys.slice(); }
  });
  window.addEventListener('keydown', (e) => {
    if (RW.typing && RW.typing()) return;
    const out = (RW.binds.zoomout || []).includes(e.code), inn = (RW.binds.zoomin || []).includes(e.code);
    if (!out && !inn) return;
    const before = HD.zoom;
    HD.zoom = RW.clamp(HD.zoom + (out ? 1 : -1), -1, 1);
    if (want().k < 2 && out) HD.zoom = before; // never so far out that a block is under 40 pixels
    if (HD.zoom !== before) { RW.store.set('v2_zoom', HD.zoom); apply(true); if (U && U.toast) U.toast(HD.zoom > 0 ? 'Zoomed out' : HD.zoom < 0 ? 'Zoomed in' : 'Normal zoom'); }
    e.preventDefault();
  });

  // ---------------- 2. 20 x 20 blocks ----------------
  const ids = new WeakMap(); let nextId = 1;
  const idOf = (c) => { let i = ids.get(c); if (!i) { i = nextId++; ids.set(c, i); } return i; };
  const h2 = (a, b, s) => RW.hash2(a, b, s);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d'); c.ctx.imageSmoothingEnabled = false; return c; };
  const wallSet = new WeakSet();
  const baseBuild = A.buildTiles;
  A.buildTiles = function () {
    const r = baseBuild.apply(this, arguments);
    (A.walls || []).forEach((vs) => (vs || []).forEach((c) => c && wallSet.add(c)));
    twins = new WeakMap(); masked.clear();
    return r;
  };
  let twins = new WeakMap();
  // a 16 x 16 block picture resampled to 20 x 20: smooth sampling snapped back to the block's own colours, then fine
  // grain, specks and a soft light from the top left so the extra pixels carry real detail
  function twin(src) {
    let t = twins.get(src); if (t) return t;
    const sd = src.getContext('2d').getImageData(0, 0, 16, 16).data, seed = idOf(src) * 7.13;
    const pal = []; const seen = new Set();
    for (let i = 0; i < 256; i++) { if (sd[i * 4 + 3] < 128) continue; const k = (sd[i * 4] << 16) | (sd[i * 4 + 1] << 8) | sd[i * 4 + 2]; if (!seen.has(k) && pal.length < 40) { seen.add(k); pal.push([sd[i * 4], sd[i * 4 + 1], sd[i * 4 + 2]]); } }
    const c = mk(T20, T20), g = c.ctx, out = g.createImageData(T20, T20), od = out.data;
    const S = (x, y, ch) => sd[(RW.clamp(y, 0, 15) * 16 + RW.clamp(x, 0, 15)) * 4 + ch];
    const lum = new Float32Array(T20 * T20);
    for (let Y = 0; Y < T20; Y++) for (let X = 0; X < T20; X++) {
      const u = (X + 0.5) * 0.8 - 0.5, v = (Y + 0.5) * 0.8 - 0.5, x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
      const bl = (ch) => S(x0, y0, ch) * (1 - fx) * (1 - fy) + S(x0 + 1, y0, ch) * fx * (1 - fy) + S(x0, y0 + 1, ch) * (1 - fx) * fy + S(x0 + 1, y0 + 1, ch) * fx * fy;
      const a = bl(3), o = (Y * T20 + X) * 4;
      if (a < 128) { od[o + 3] = 0; continue; }
      const r = bl(0), gg = bl(1), b = bl(2);
      let best = pal[0] || [r, gg, b], bd = 1e9;
      for (const p of pal) { const d = (p[0] - r) ** 2 + (p[1] - gg) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; best = p; } }
      od[o] = best[0]; od[o + 1] = best[1]; od[o + 2] = best[2]; od[o + 3] = 255;
      lum[Y * T20 + X] = best[0] * 0.3 + best[1] * 0.59 + best[2] * 0.11;
    }
    for (let Y = 0; Y < T20; Y++) for (let X = 0; X < T20; X++) {
      const o = (Y * T20 + X) * 4; if (!od[o + 3]) continue;
      const l = lum[Y * T20 + X], ul = Y && X ? lum[(Y - 1) * T20 + X - 1] : l, dr = Y < 19 && X < 19 ? lum[(Y + 1) * T20 + X + 1] : l;
      const hh = h2(X, Y, seed);
      let k = 1 + (hh - 0.5) * 0.06 + RW.clamp((l - ul) * 0.004 - (l - dr) * 0.002, -0.08, 0.08);
      if (hh > 0.975) k *= 1.16; else if (hh < 0.03) k *= 0.8;
      od[o] = RW.clamp(od[o] * k, 0, 255); od[o + 1] = RW.clamp(od[o + 1] * k, 0, 255); od[o + 2] = RW.clamp(od[o + 2] * k, 0, 255);
    }
    g.putImageData(out, 0, 0);
    twins.set(src, c); return c;
  }

  // ---------------- 3. worn edges where a block meets the air ----------------
  // smooth noise along an edge, in block pixels, so the wear runs on from one block to the next
  const vn = (p, row, s) => { const i = Math.floor(p / 5), f = p / 5 - i, a = h2(i, row, s), b = h2(i + 1, row, s), q = f * f * (3 - 2 * f); return a + (b - a) * q; };
  const depth = (p, row, s, built) => built ? (vn(p, row, s) > 0.72 ? 1 : 0) : Math.floor(vn(p, row, s) * 3.4 + vn(p * 2.3, row, s + 5) * 1.4 + h2(p, row, s + 9) * 0.8);
  const masked = new Map();
  const openAt = (x, y) => { if (!WD.inb(x, y)) return false; const t = RW.TILES[WD.get(x, y)]; return !t.solid && !(t.decor && t.solid); }; // 3.18: water counts as open too, so rock under water wears and rounds like rock in air
  const BUILT = { brick: 1, plank: 1, plate: 1, stake: 1, books: 1 };
  function wornTile(tx, ty, base, t) {
    const up = openAt(tx, ty - 1), dn = openAt(tx, ty + 1), lf = openAt(tx - 1, ty), rt = openAt(tx + 1, ty);
    if (!up && !dn && !lf && !rt) return null;
    const key = tx + ',' + ty + ':' + idOf(base) + ':' + (up | 0) + (dn | 0) + (lf | 0) + (rt | 0);
    let c = masked.get(key); if (c) return c;
    if (masked.size > 5000) masked.clear();
    const built = !!BUILT[t.tex], src = twin(base), sd = src.ctx.getImageData(0, 0, T20, T20), d = sd.data;
    const keep = new Uint8Array(T20 * T20).fill(1), R = built ? 3 : 5 + Math.floor(h2(tx, ty, 77) * 4);
    for (let y = 0; y < T20; y++) for (let x = 0; x < T20; x++) {
      let k = 1;
      if (up && y < depth(tx * T20 + x, ty * 2, 11, built)) k = 0;
      if (dn && T20 - 1 - y < depth(tx * T20 + x, ty * 2 + 1, 12, built)) k = 0;
      if (lf && x < depth(ty * T20 + y, tx * 2, 13, built)) k = 0;
      if (rt && T20 - 1 - x < depth(ty * T20 + y, tx * 2 + 1, 14, built)) k = 0;
      const cr = (cx, cy) => { const dx = x - cx, dy = y - cy; return dx * dx + dy * dy > R * R; };
      if (up && lf && x < R && y < R && cr(R, R)) k = 0;
      if (up && rt && x > T20 - 1 - R && y < R && cr(T20 - 1 - R, R)) k = 0;
      if (dn && lf && x < R && y > T20 - 1 - R && cr(R, T20 - 1 - R)) k = 0;
      if (dn && rt && x > T20 - 1 - R && y > T20 - 1 - R && cr(T20 - 1 - R, T20 - 1 - R)) k = 0;
      if (!d[(y * T20 + x) * 4 + 3]) k = 0;
      keep[y * T20 + x] = k;
    }
    const K = (x, y) => {
      if (x < 0) return lf ? 0 : 1; if (x >= T20) return rt ? 0 : 1; if (y < 0) return up ? 0 : 1; if (y >= T20) return dn ? 0 : 1;
      return keep[y * T20 + x];
    };
    for (let y = 0; y < T20; y++) for (let x = 0; x < T20; x++) {
      const o = (y * T20 + x) * 4;
      if (!keep[y * T20 + x]) { d[o + 3] = 0; continue; }
      const edge = !K(x - 1, y) || !K(x + 1, y) || !K(x, y - 1) || !K(x, y + 1);
      let m = 1;
      if (edge) m = 0.42;
      else if (!K(x, y - 2) || !K(x - 1, y - 1) || !K(x + 1, y - 1)) m = 1.24;          // the lit rim along the top
      else if (!K(x, y - 3)) m = 1.1;
      else if (!K(x, y + 2) || !K(x, y + 3)) m = 0.74;                                   // shade under an overhang
      else if (!K(x - 2, y) || !K(x + 2, y)) m = 0.88;
      if (m !== 1) { d[o] = RW.clamp(d[o] * m + (m > 1 ? 6 : 0), 0, 255); d[o + 1] = RW.clamp(d[o + 1] * m + (m > 1 ? 6 : 0), 0, 255); d[o + 2] = RW.clamp(d[o + 2] * m + (m > 1 ? 5 : 0), 0, 255); }
    }
    c = mk(T20, T20); c.ctx.putImageData(sd, 0, 0); masked.set(key, c); return c;
  }

  // ---------------- 4. while the blocks are drawn, 16 x 16 block pictures become their 20 x 20 versions ----------------
  let cam = null, depthDraw = 0;
  const baseTiles = WD.drawTiles;
  WD.drawTiles = function (g, rc) {
    if (!HD.on) return baseTiles.apply(this, arguments);
    const raw = g.drawImage; cam = rc; depthDraw++;
    g.drawImage = function (img, x, y) {
      if (arguments.length === 3 && img && img.width === 16 && img.height === 16 && depthDraw > 0) {
        const wx = x + cam.x, wy = y + cam.y;
        if (Math.abs(wx - Math.round(wx / TS) * TS) < 0.01 && Math.abs(wy - Math.round(wy / TS) * TS) < 0.01) {
          const tx = Math.round(wx / TS), ty = Math.round(wy / TS);
          if (!wallSet.has(img) && WD.inb(tx, ty)) {
            const id = WD.get(tx, ty), t = RW.TILES[id];
            if (t && t.solid && !(t.decor) && A.tiles[id] && A.tiles[id].length) {
              const base = A.tiles[id][(tx * 13 + ty * 7) & 7] || img;
              const w = wornTile(tx, ty, base, t);
              if (w) return raw.call(this, w, x, y, TS, TS);
              return raw.call(this, twin(img), x, y, TS, TS);
            }
          }
          return raw.call(this, twin(img), x, y, TS, TS);
        }
      }
      return raw.apply(this, arguments);
    };
    try { return baseTiles.apply(this, arguments); }
    finally { depthDraw--; g.drawImage = raw; }
  };
})(window.RW);
