// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3: the shape of Tuftwood. A smooth landscape, not a tile grid.
// Ground is one height curve. On top of it: solid slabs, one-way platforms, thin walls, water, wind.
(function () {
  'use strict';
  const V3 = window.V3, U = V3.util;
  const W = (V3.world = {});
  W.X0 = 0; W.X1 = 9600; W.STEP = 4;
  W.SPAWN = 4372;

  // ground control points [x, y]; y grows downward, the village sits at y = 0
  const PTS = [
    [-200, -430], [0, -420], [250, -400], [470, -230], [600, -70], [740, -20], [860, -12],
    [900, 0], [960, 140], [1040, 340], [1200, 400], [1400, 410], [1560, 380], [1800, 205], [2000, 45], [2110, -8],
    [2300, -40], [2600, 10], [2900, -30], [3200, -70], [3400, -40],
    [3700, -16], [4000, 0], [4300, 0], [4700, -8], [5000, -30], [5200, -60],
    [5500, -90], [5800, -50], [6000, -40], [6300, -60], [6500, -30],
    [6640, -4], [6740, 70], [6900, 190], [7200, 240], [7450, 200], [7620, 70], [7720, -4],
    [7900, -60], [8100, -180], [8300, -260], [8500, -400], [8700, -470], [8900, -500], [9100, -500], [9300, -570], [9600, -900], [9800, -950],
  ];
  const N = Math.floor((W.X1 - W.X0) / W.STEP) + 2;
  const H = new Float32Array(N);
  (function build() {
    let seg = 1;
    for (let i = 0; i < N; i++) {
      const x = W.X0 + i * W.STEP;
      while (seg < PTS.length - 2 && x > PTS[seg + 1][0]) seg++;
      const p0 = PTS[seg - 1], p1 = PTS[seg], p2 = PTS[seg + 1], p3 = PTS[Math.min(seg + 2, PTS.length - 1)];
      const t = U.clamp((x - p1[0]) / (p2[0] - p1[0]), 0, 1);
      // Catmull-Rom on y with tangents scaled for uneven spacing
      const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * (p2[0] - p1[0]);
      const m2 = (p3[1] - p1[1]) / (p3[0] - p1[0] || 1) * (p2[0] - p1[0]);
      const t2 = t * t, t3 = t2 * t;
      let y = (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
      // gentle lumps everywhere except the village green and the cave floor
      const calm = (x > 3600 && x < 5000) || (x > 880 && x < 2000) ? 0.25 : 1;
      y += (U.fbm(x / 170) - 0.5) * 26 * calm + (U.noise(x / 37 + 50) - 0.5) * 5 * calm;
      H[i] = y;
    }
  })();
  W.groundY = (x) => {
    const f = U.clamp((x - W.X0) / W.STEP, 0, N - 2), i = Math.floor(f);
    return H[i] + (H[i + 1] - H[i]) * (f - i);
  };
  // slope as dy/dx (positive = ground falls away to the right)
  W.slope = (x) => (W.groundY(x + 10) - W.groundY(x - 10)) / 20;

  // ---- solid slabs (axis-aligned). The big one is the earth shelf roofing Root Hollow.
  W.solids = [
    { x: 1130, y: -14, w: 640, h: 78, kind: 'shelf' },
    { x: 8460, y: -640, w: 150, h: 46, kind: 'rock' },
  ];
  // ---- one-way platforms {x1, x2, y, kind}; kind 'twig' snaps under the Rock
  W.platforms = [
    { x1: 905, x2: 1128, y: -12, kind: 'twig', id: 'twigbridge' },
    { x1: 930, x2: 1010, y: 210, kind: 'ledge' }, { x1: 1050, x2: 1125, y: 110, kind: 'ledge' },
    // village roofs are added by scenery.js; branches too
    { x1: 8180, x2: 8290, y: -400, kind: 'ledge' }, { x1: 8330, x2: 8430, y: -520, kind: 'ledge' },
    { x1: 8640, x2: 8760, y: -660, kind: 'ledge' },
  ];
  // ---- thin walls {x, y1, y2, kind, broken}. Ghost drifts through all of them; the Rock smashes them at a roll.
  W.walls = [
    { id: 'rootwall', x: 1330, y1: 64, y2: 420, kind: 'root', broken: false },
    { id: 'bramble', x: 5350, y1: -420, y2: -60, kind: 'bramble', broken: false },
    { id: 'thornring', x: 2480, y1: -230, y2: 10, kind: 'bramble', broken: false },
  ];
  // ---- water
  W.waters = [{ x1: 6700, x2: 7665, y: 46, id: 'pond' }];
  W.waterAt = (x, y) => { for (const w of W.waters) if (x > w.x1 && x < w.x2 && y > w.y) return w; return null; };
  // ---- wind lifts {x1, x2, y1, y2, lift}
  W.updrafts = [
    { x1: 930, x2: 1100, y1: -260, y2: 400, lift: 900 },
    { x1: 8040, x2: 8160, y1: -700, y2: -150, lift: 1300 },
    { x1: 8560, x2: 8660, y1: -900, y2: -430, lift: 1300 },
  ];
  W.updraftAt = (x, y) => { for (const u of W.updrafts) if (x > u.x1 && x < u.x2 && y > u.y1 && y < u.y2) return u; return null; };

  W.zones = [
    { id: 'cliff', name: 'Sunbake Rise', x1: 0, x2: 600 }, { id: 'hollow', name: 'Root Hollow', x1: 600, x2: 1900 },
    { id: 'woods', name: 'The Tuftwood', x1: 1900, x2: 3400 }, { id: 'village', name: 'Tuftwood Village', x1: 3400, x2: 5200 },
    { id: 'glade', name: "Snagroot's Glade", x1: 5200, x2: 6600 }, { id: 'pond', name: 'Mirror Pond', x1: 6600, x2: 7800 },
    { id: 'ridge', name: 'Windy Ridge', x1: 7800, x2: 9600 },
  ];
  W.zoneAt = (x) => { for (const z of W.zones) if (x < z.x2) return z; return W.zones[W.zones.length - 1]; };
  // how deep inside the Hollow's cave (0 outside, 1 fully under the shelf)
  W.caveAt = (x, y) => (x > 900 && x < 1900 && y > 60 ? U.clamp((y - 60) / 120, 0, 1) * U.clamp((1900 - x) / 200, 0, 1) : 0);

  // ---- moving a body. b = {x, y (feet), vx, vy, w, h, grounded}. opts: {ghost, heavy, drop, onWall(wall)}
  W.moveBody = (b, dt, o) => {
    o = o || {};
    const px = b.x, py = b.y, hw = b.w / 2;
    let nx = U.clamp(b.x + b.vx * dt, W.X0 + 60, W.X1 - 120);
    b.hitWall = 0; b.landed = false; b.onPlat = null;
    // thin walls
    if (!o.ghost) for (const wl of W.walls) {
      if (wl.broken || b.y < wl.y1 || b.y - b.h > wl.y2) continue;
      if ((px + hw <= wl.x && nx + hw > wl.x) || (px - hw >= wl.x && nx - hw < wl.x)) {
        if (o.onWall && o.onWall(wl)) continue;
        nx = px + hw <= wl.x ? wl.x - hw - 0.01 : wl.x + hw + 0.01; b.hitWall = Math.sign(b.vx); b.vx = 0;
      }
    }
    // terrain acting as a wall: the ground ahead rises well above the feet
    if (!o.ghost || true) {
      const ahead = W.groundY(nx + Math.sign(nx - px) * hw * 0.6);
      if (ahead < b.y - (b.grounded ? 34 : 14) && Math.abs(W.slope(nx)) > 1.9) { nx = px; b.hitWall = Math.sign(b.vx); b.vx = 0; }
    }
    // solids, sideways
    for (const s of W.solids) {
      if (b.y - 2 <= s.y || b.y - b.h >= s.y + s.h) continue;
      if (nx + hw > s.x && nx - hw < s.x + s.w) {
        if (px + hw <= s.x + 1) { nx = s.x - hw; b.hitWall = 1; b.vx = 0; } else if (px - hw >= s.x + s.w - 1) { nx = s.x + s.w + hw; b.hitWall = -1; b.vx = 0; }
      }
    }
    b.x = nx;
    let ny = b.y + b.vy * dt;
    const wasGrounded = b.grounded; b.grounded = false;
    // solids, up and down
    for (const s of W.solids) {
      if (b.x + hw <= s.x || b.x - hw >= s.x + s.w) continue;
      if (py <= s.y + 1 && ny >= s.y && b.vy >= 0) { ny = s.y; b.vy = 0; b.grounded = true; b.onPlat = s; }
      else if (py - b.h >= s.y + s.h - 1 && ny - b.h < s.y + s.h && b.vy < 0) { ny = s.y + s.h + b.h; b.vy = 0; }
    }
    // one-way platforms
    if (!o.ghost && !o.drop && b.vy >= 0 && !b.grounded) for (const p of W.platforms) {
      if (p.gone || b.x < p.x1 || b.x > p.x2) continue;
      if (o.heavy && (p.kind === 'pad' || p.kind === 'raft' || p.kind === 'leaf')) continue;
      if (py <= p.y + 2 && ny >= p.y) { ny = p.y; b.vy = 0; b.grounded = true; b.onPlat = p; break; }
    }
    // the ground curve
    const gy = W.groundY(b.x);
    if (ny >= gy) { ny = gy; if (b.vy > 0) { b.landed = !wasGrounded; b.landSpeed = b.vy; b.vy = 0; } b.grounded = true; b.onPlat = null; }
    else if (wasGrounded && !b.grounded && b.vy >= 0 && gy - ny < 26 && !o.ghost) { ny = gy; b.grounded = true; b.vy = 0; } // stick to downhill
    if (b.grounded && !wasGrounded && b.onPlat) { b.landed = true; b.landSpeed = b.landSpeed || 300; }
    b.y = ny;
  };
})();
