// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 21: zoom out up to 15 times.
//  * - zooms out and = zooms in through: 2x in, normal, then 1.5, 2, 3, 4, 6, 8, 10, 12 and 15 times out.
//    Saved in this browser.
//  * Up to 3 times out the world is drawn as usual. From 4 times out it is drawn the way the big map is: one colour
//    per block, only the places you have explored (the rest stays dark), no light. Monsters, heroes, the Leviathan
//    and effects are still drawn on top, so you can watch a whole fight.
(function (RW) {
  'use strict';
  const WD = RW.world, HD = RW.v2hd, U = RW.ui, TS = RW.TILE;
  if (!WD || !HD) return;
  const Z = [0.5, 1, 1.5, 2, 3, 4, 6, 8, 10, 12, 15];
  let zi = Z.indexOf(RW.store.get('v3_zoomf', 1)); if (zi < 0) zi = 1;
  const f = () => Z[zi];
  const far = () => f() >= 4;
  RW.v3zoom = { get: f, far, set(v) { const k = Z.indexOf(v); if (k >= 0) { zi = k; RW.store.set('v3_zoomf', v); } } };
  // the old three-step zoom stays at normal: this one takes over the keys
  HD.zoom = 0; RW.store.set('v2_zoom', 0); try { if (RW.view && RW.v2hdApply) RW.v2hdApply(true); } catch (e) { /* applied on the next frame */ }
  window.addEventListener('keydown', (e) => {
    const out = (RW.binds.zoomout || []).includes(e.code), inn = (RW.binds.zoomin || []).includes(e.code);
    if (!out && !inn) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (RW.typing && RW.typing()) return;
    const was = zi; zi = Math.max(0, Math.min(Z.length - 1, zi + (out ? 1 : -1)));
    if (zi !== was) { RW.store.set('v3_zoomf', f()); if (U && U.toast) U.toast(f() === 1 ? 'Normal zoom' : f() < 1 ? 'Zoomed in' : 'Zoomed out ' + f() + 'x' + (far() ? ' (map view: explored places only)' : '')); }
  }, true);

  // the view: the same canvas, a smaller scale
  const cv = document.getElementById('game');
  const baseBackdrop = WD.drawBackdrop;
  WD.drawBackdrop = function (g) {
    const r = baseBackdrop.apply(this, arguments);
    const v = RW.view, k = f();
    if (k !== 1 && cv) {
      v.scale = HD.scale / k; v.w = Math.ceil(cv.width / v.scale); v.h = Math.ceil(cv.height / v.scale);
      g.setTransform(v.scale, 0, 0, v.scale, 0, 0); g.imageSmoothingEnabled = false;
    }
    return r;
  };

  // far out: blocks from the map picture, water and light skipped
  const baseTiles = WD.drawTiles;
  WD.drawTiles = function (g, cam, vw, vh, time) {
    if (!far()) return baseTiles.apply(this, arguments);
    const M = RW.v3map; if (!M || !M.state) return baseTiles.apply(this, arguments);
    try { M.refreshMap(4); } catch (e) { /* draw what there is */ }
    const m = M.state(); if (!m || !m.img) return;
    const sx = cam.x / TS, sy = cam.y / TS, sw = vw / TS, sh = vh / TS;
    const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
    // whole blocks only, so the picture lines up with the world
    const x0 = Math.floor(sx), y0 = Math.floor(sy), w = Math.ceil(sw) + 2, h = Math.ceil(sh) + 2;
    g.drawImage(m.img, x0, y0, w, h, x0 * TS - cam.x, y0 * TS - cam.y, w * TS, h * TS);
    g.imageSmoothingEnabled = sm;
  };
  // the 1-unit pixel layer is as big as the view: far out it is skipped and things are drawn straight on
  const basePix = RW.v3pix;
  if (basePix) RW.v3pix = function (g, fn, opts) { if (f() >= 3) { try { fn(g); } catch (e) { /* skip */ } return; } return basePix.apply(this, arguments); };
  const baseWater = WD.drawWater;
  WD.drawWater = function (g, cam, vw, vh, time) { return far() ? baseWater.call(this, g, cam, 0, 0, time) : baseWater.apply(this, arguments); };
  const baseCompute = WD.computeLight;
  WD.computeLight = function () { if (far()) return; return baseCompute.apply(this, arguments); };
  const baseLight = WD.drawLight;
  WD.drawLight = function () { if (far()) return; return baseLight.apply(this, arguments); };
})(window.RW);
