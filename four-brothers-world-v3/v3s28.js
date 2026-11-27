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

  // ---------------- 3.19: stalactites and stalagmites in every cave (new worlds) ----------------
  // Tapered spikes of the cave's own stone hang from roofs and rise from floors wherever a cave is tall enough, so
  // they never close a tunnel. Towns, the village, lairs, structures, the shaft and the Heart Chamber are left alone.
  const def = RW.WORLDS && RW.WORLDS.rock;
  if (def && def.generate) {
    const prevGen = def.generate;
    def.generate = function () {
      const out = prevGen.apply(this, arguments);
      try { if (out && out.meta && out.meta.v3rings) spikes(out); } catch (e) { console.warn('v3 spikes', e); }
      return out;
    };
  }
  function spikes(out) {
    const W = out.W, H = out.H, fg = out.fg, m = out.meta, T = RW.T, TLs = RW.TILES, seed = (m.seed || 1) + 777, L = RW.v3ringsLib;
    const hh = (a, b, k) => RW.hash2(a, b, seed + k);
    const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.bedrock : fg[y * W + x]);
    const open = (t) => t === T.air || t === T.water;
    const stoneLike = (t) => { const d = TLs[t]; return !!(d && d.solid && !d.decor && !d.ore && !d.loot && !d.storage && !BUILT[d.tex] && (d.hard || 0) < 50); };
    const avoid = [];
    (m.caverns || []).forEach((c) => { if (c.kind !== 'wild') avoid.push([c.cx - c.rx - 6, c.cy - c.ry - 6, c.cx + c.rx + 6, c.cy + c.ry + 6]); });
    (m.v3lairs || []).forEach((l) => avoid.push([l.x - l.rx - 4, l.y - l.ry - 4, l.x + l.rx + 4, l.y + l.ry + 4]));
    (m.v3structs || []).forEach((q) => avoid.push([q.x - 3, q.y - 3, q.x + q.w + 3, q.y + q.h + 3]));
    if (m.v3shaft) avoid.push([m.v3shaft.x - 6, 0, m.v3shaft.x + 6, H]);
    if (m.arena) avoid.push([m.arena.cx - m.arena.rx - 30, m.arena.cy - m.arena.ry - 20, m.arena.cx + m.arena.rx + 30, H]);
    const blocked = (x, y) => avoid.some((b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]);
    const sealAt = (x, y) => L && L.regionAt && L.regionAt(x, y).seal;
    let x = 6;
    while (x < W - 6) {
      // walk down the column: every roof (stone over open) and floor (open over stone) is a place for a spike
      for (let y = 8; y < H - 8; y++) {
        const a = get(x, y), b = get(x, y + 1);
        const roof = stoneLike(a) && open(b), floor = open(a) && stoneLike(b);
        if (!roof && !floor) continue;
        if (hh(x, y, 1) > 0.62 || blocked(x, y)) continue;
        // how tall is the open space here?
        let gap = 0; const dir = roof ? 1 : -1, y0 = roof ? y + 1 : y;
        while (gap < 40 && open(get(x, y0 + dir * gap))) gap++;
        if (gap < 9) continue;
        const len = Math.min(Math.floor((gap - 4) / 2.1), 4 + Math.floor(hh(x, y, 2) * 12)), half = len > 10 ? 3 : len > 5 ? 2 : 1;
        if (len < 3) continue;
        const rock = roof ? a : b;
        if (sealAt(x, y0)) continue;
        for (let k = 0; k < len; k++) {
          const w = Math.round(half * (1 - k / len) + (hh(x, k, 3) < 0.3 ? 0.4 : 0)), yy = y0 + dir * k;
          for (let dx = -w; dx <= w; dx++) { const xx = x + dx; if (xx > 2 && xx < W - 3 && open(get(xx, yy)) && !blocked(xx, yy)) fg[yy * W + xx] = rock; }
        }
        y += roof ? len : 0;
      }
      x += 4 + Math.floor(hh(x, 0, 4) * 7);
    }
  }

  // ---------------- stepped pixel corners on menus, buttons and slots ----------------
  const cut = (n) => `polygon(${n}px 0, calc(100% - ${n}px) 0, calc(100% - ${n}px) ${n / 2}px, calc(100% - ${n / 2}px) ${n / 2}px, calc(100% - ${n / 2}px) ${n}px, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n / 2}px) calc(100% - ${n}px), calc(100% - ${n / 2}px) calc(100% - ${n / 2}px), calc(100% - ${n}px) calc(100% - ${n / 2}px), calc(100% - ${n}px) 100%, ${n}px 100%, ${n}px calc(100% - ${n / 2}px), ${n / 2}px calc(100% - ${n / 2}px), ${n / 2}px calc(100% - ${n}px), 0 calc(100% - ${n}px), 0 ${n}px, ${n / 2}px ${n}px, ${n / 2}px ${n / 2}px, ${n}px ${n / 2}px)`;
  const st = document.createElement('style');
  st.textContent = `.stone, .panel { clip-path: ${cut(8)}; } .btn, #v3mini, .chip, .opt { clip-path: ${cut(4)}; } .slot { clip-path: ${cut(4)}; }`;
  document.head.appendChild(st);
})(window.RW);
