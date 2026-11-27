// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 28: edges that look made by nature, and pixel-cut menu corners.
//  * Every solid block buried in a wall gets a backing of its own colour first, so no gap in a texture can ever show
//    black between two kinds of stone (the black dashes where ores met rock).
//  * Inside corners: where open space has rock on two sides that meet (a floor meeting a wall, a ceiling meeting a
//    wall), a stepped pixel fillet of that rock fills the corner, so caves curve instead of meeting at right angles.
//    Bricks, planks and other built blocks keep their square corners.
//  * (v3s2 now wears and rounds rock under water too, and v3s26 smooths the band cave walls when a world is made.)
//  * Menus, buttons and bag slots get stepped pixel corners instead of square ones.
(function (RW) {
  'use strict';
  const WD = RW.world, TS = RW.TILE;
  if (!WD) return;
  const BUILT = { brick: 1, plank: 1, plate: 1, stake: 1, books: 1 };
  const TL = () => RW.TILES;
  const solidNat = (t) => !!(t && t.solid && !t.decor && !BUILT[t.tex] && !t.loot && !t.storage && !t.toggle);
  const solid = (t) => !!(t && t.solid && !t.decor);
  const fillOf = (t) => (t.colors && (t.colors[0] || t.colors[1])) || '#2a2830';
  const darkOf = (t) => (t.colors && (t.colors[2] || t.colors[0])) || '#18161c';

  const baseTiles = WD.drawTiles;
  WD.drawTiles = function (g, cam, vw, vh) {
    const far = RW.v3zoom && RW.v3zoom.far();
    const x0 = Math.floor(cam.x / TS) - 1, x1 = Math.ceil((cam.x + vw) / TS) + 1, y0 = Math.floor(cam.y / TS) - 1, y1 = Math.ceil((cam.y + vh) / TS) + 1;
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y), T = TL(), get = (x, y) => T[WD.get(x, y)];
    // 1. a backing under every buried block, in runs of one colour
    if (!far) {
      for (let y = y0; y <= y1; y++) {
        let runX = 0, runC = null, n = 0;
        const flush = () => { if (runC && n) { g.fillStyle = runC; g.fillRect(runX * TS + ox, y * TS + oy, n * TS, TS); } runC = null; n = 0; };
        for (let x = x0; x <= x1; x++) {
          const t = get(x, y);
          const buried = solid(t) && solid(get(x - 1, y)) && solid(get(x + 1, y)) && solid(get(x, y - 1)) && solid(get(x, y + 1));
          const c = buried ? darkOf(t) : null;
          if (c !== runC) { flush(); runC = c; runX = x; }
          if (c) n++;
        }
        flush();
      }
    }
    const r = baseTiles.apply(this, arguments);
    if (far) return r;
    // 2. stepped fillets in inside corners
    const S = 2; // one step in world units (a pixel of the 20x20 blocks is 0.8)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const here = get(x, y); if (!here || here.solid) continue;
      const u = get(x, y - 1), d = get(x, y + 1), l = get(x - 1, y), rt = get(x + 1, y);
      const px = x * TS + ox, py = y * TS + oy;
      const corner = (a, b, sx, sy) => { // a: the vertical neighbour, b: the horizontal one; sx/sy: which corner (0/1)
        if (!solidNat(a) || !solidNat(b)) return;
        const col = fillOf(a), edge = darkOf(a), h = (RW.hash2 ? RW.hash2(x, y, 41 + sx + sy * 2) : 0.5), steps = h < 0.3 ? 2 : 3;
        for (let k = 0; k < steps; k++) {
          const len = (steps - k) * S * 1.5, w = Math.round(len), off = k * S; // row k from the wall, shorter as it leaves the corner
          const rx = sx ? px + TS - w : px, ry = sy ? py + TS - off - S : py + off;
          g.fillStyle = col; g.fillRect(rx, ry, w, S);
          g.fillStyle = edge; g.fillRect(sx ? rx : rx + w - 1, ry, 1, S); // a dark pixel edge on the step
        }
      };
      if (d && l) corner(d, l, 0, 1); if (d && rt) corner(d, rt, 1, 1);
      if (u && l) corner(u, l, 0, 0); if (u && rt) corner(u, rt, 1, 0);
    }
    return r;
  };

  // ---------------- stepped pixel corners on menus, buttons and slots ----------------
  const cut = (n) => `polygon(${n}px 0, calc(100% - ${n}px) 0, calc(100% - ${n}px) ${n / 2}px, calc(100% - ${n / 2}px) ${n / 2}px, calc(100% - ${n / 2}px) ${n}px, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n / 2}px) calc(100% - ${n}px), calc(100% - ${n / 2}px) calc(100% - ${n / 2}px), calc(100% - ${n}px) calc(100% - ${n / 2}px), calc(100% - ${n}px) 100%, ${n}px 100%, ${n}px calc(100% - ${n / 2}px), ${n / 2}px calc(100% - ${n / 2}px), ${n / 2}px calc(100% - ${n}px), 0 calc(100% - ${n}px), 0 ${n}px, ${n / 2}px ${n}px, ${n / 2}px ${n / 2}px, ${n}px ${n / 2}px)`;
  const st = document.createElement('style');
  st.textContent = `.stone, .panel { clip-path: ${cut(8)}; } .btn, #v3mini, .chip, .opt { clip-path: ${cut(4)}; } .slot { clip-path: ${cut(4)}; }`;
  document.head.appendChild(st);
})(window.RW);
