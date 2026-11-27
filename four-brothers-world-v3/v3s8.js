// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 8: big detailed art for the Leviathan's loot.
//  * Every Leviathan item (drops, core crafts, cores, Abyssite gear, trinkets, the krait pearl) is painted at 48x48:
//    shaded in a few flat tones, picked out with highlights and a dark outline, the way Terraria items look.
//  * The bag, the crafting list and the held weapon all use the 48x48 picture. Held weapons are drawn half again bigger.
//  * RW.v3art.paint(id) gives the 48x48 canvas (the preview sheet uses the same code).
(function (RW) {
  'use strict';
  const A = RW.art;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d'); return c; };
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const OUT = '#0a0810';
  // snap every pixel to the nearest tone of the item's palette, drop soft edges, then outline
  function finish(c, pal, opts) {
    const g = c.ctx, W = c.width, H = c.height, d = g.getImageData(0, 0, W, H), a = d.data, P = pal.map(hex);
    for (let i = 0; i < a.length; i += 4) {
      if (a[i + 3] < 110) { a[i + 3] = 0; continue; }
      let best = 0, bd = 1e9; for (let k = 0; k < P.length; k++) { const dr = a[i] - P[k][0], dg = a[i + 1] - P[k][1], db = a[i + 2] - P[k][2], dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; if (dd < bd) { bd = dd; best = k; } }
      a[i] = P[best][0]; a[i + 1] = P[best][1]; a[i + 2] = P[best][2]; a[i + 3] = 255;
    }
    if (!(opts && opts.noOutline)) {
      // Terraria-style: each part is outlined in a deep shade of its own colour, and lit along its upper-left edges
      const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[(y * W + x) * 4 + 3] > 0, out = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!op(x, y)) { let n = -1; for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (op(x + dx, y + dy)) { n = ((y + dy) * W + x + dx) * 4; break; } if (n >= 0) out.push([(y * W + x) * 4, n]); }
      const lit = []; for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) { const i = (y * W + x) * 4; if (a[i + 3] && (!op(x - 1, y) || !op(x, y - 1)) && op(x + 1, y) && op(x, y + 1)) lit.push(i); }
      lit.forEach((i) => { a[i] = Math.min(255, a[i] + (255 - a[i]) * 0.35); a[i + 1] = Math.min(255, a[i + 1] + (255 - a[i + 1]) * 0.35); a[i + 2] = Math.min(255, a[i + 2] + (255 - a[i + 2]) * 0.35); });
      out.forEach(([i, n]) => { a[i] = Math.round(a[n] * 0.28); a[i + 1] = Math.round(a[n + 1] * 0.26); a[i + 2] = Math.round(a[n + 2] * 0.32) + 6; a[i + 3] = 255; });
    }
    g.putImageData(d, 0, 0); return c;
  }
  // drawing helpers (smooth shapes; finish() turns them into clean pixels)
  const poly = (g, pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const circ = (g, x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); };
  const ellip = (g, x, y, rx, ry, rot, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.283); g.fill(); };
  const line = (g, x0, y0, x1, y1, w, col, cap) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = cap || 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const rect = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const px = (g, x, y, col) => rect(g, Math.round(x), Math.round(y), 1, 1, col);
  const lin = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); return gr; };
  const rad = (g, x, y, r0, r1, stops) => { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); return gr; };
  const path = (g, fill, fn) => { g.fillStyle = fill; g.beginPath(); fn(g); g.fill(); };
  // along the diagonal: x runs from the grip (bottom left) toward the top right, 0..60
  const diag = (g, fn) => { g.save(); g.translate(6, 42); g.rotate(-Math.PI / 4); fn(g); g.restore(); };

  // shared tones
  const BLK = ['#0e0c16', '#1a1726', '#2a2540', '#3e3860', '#5a5288'];        // abyss metal: darkest to lit
  const BON = ['#3e3a30', '#5e5848', '#857e66', '#ada488', '#d8d0b4'];        // old bone
  const VIO = ['#2a1648', '#46287a', '#6a44b0', '#9a74e0', '#d4c0ff'];        // deep violet glow
  const TEA = ['#0c3a40', '#145a62', '#1f8a8a', '#4cc4b8', '#b8fff0'];        // cold teal glow
  const GHO = ['#4a5560', '#6e7a86', '#98a6b0', '#c4d0d8', '#f0f6fa'];        // ghost white
  const EMB = ['#3a0e0a', '#6a1e14', '#9a3220', '#d0603a', '#ffb080'];        // drowned ember (knight)
  const ICE = ['#0e2a40', '#1a4868', '#2e70a0', '#62a8d8', '#c8ecff'];        // deep ice (archer)
  const MIS = ['#26262e', '#3a3a46', '#585a68', '#80849a', '#b8bccc'];        // mist (mage)
  const HEA = ['#0e3028', '#185040', '#2a7a5e', '#5ab894', '#c0f8dc'];        // tide green (healer)
  const ABY = ['#0c0a12', '#16121e', '#221a30', '#33244a', '#4a3270', '#6c4aa8', '#a088e0'];   // Abyssite: black into dark violet
  const LEA = ['#120e10', '#22181c', '#36262a', '#4e383a'];                    // drowned leather
  const all = (...ps) => [].concat(...ps);

  const P = {};
  // ============================ LEVIATHAN DROPS ============================
  P.riftreaper = { fit: 0.74, dx: 3, dy: 3, pal: all(BLK, BON, VIO, LEA), fn(g) { // a spine-bone scythe with a black blade and a violet tear in it
    diag(g, (q) => {
      rect(q, -4, -2.6, 12, 5.2, LEA[1]); for (let x = -3; x < 8; x += 2.4) { line(q, x, -2.6, x + 1.6, 2.6, 0.9, LEA[3]); }  // wrapped grip
      for (let k = 0; k < 9; k++) { const x = 9 + k * 4.3; ellip(q, x + 1.6, 0, 2.4, 3.1, 0, BON[1]); ellip(q, x + 1.4, -0.6, 1.8, 2.2, 0, BON[3]); px(q, x + 0.6, -1.6, BON[4]); rect(q, x + 3.4, -1.2, 1, 2.4, BON[0]); } // vertebrae
      q.save(); q.translate(50, 0);
      // the blade sweeps back and down from the head
      path(q, lin(q, 0, -16, 0, 6, [BLK[3], BLK[2], BLK[1]]), (p) => { p.moveTo(2, -4); p.bezierCurveTo(-4, -22, -26, -30, -46, -22); p.bezierCurveTo(-30, -21, -12, -14, -3, 4); p.closePath(); });
      path(q, BLK[4], (p) => { p.moveTo(-2, -6); p.bezierCurveTo(-8, -20, -26, -27, -42, -22.5); p.bezierCurveTo(-26, -24, -10, -18, -3, -4); });
      q.strokeStyle = VIO[2]; q.lineWidth = 2.4; q.beginPath(); q.moveTo(-4, 0); q.bezierCurveTo(-10, -13, -24, -19, -38, -20); q.stroke();  // the rift along the inner edge
      q.strokeStyle = VIO[3]; q.lineWidth = 1.1; q.beginPath(); q.moveTo(-6, -3); q.bezierCurveTo(-11, -13, -24, -18, -34, -19); q.stroke();
      for (let k = 0; k < 5; k++) px(q, -12 - k * 5, -16 - k * 0.6 + (k % 2) * 3, VIO[4]);
      // a skull-like vertebra cap where the blade meets the shaft
      ellip(q, 0, 0, 5.5, 5, 0, BON[2]); ellip(q, -0.6, -1, 4.2, 3.8, 0, BON[3]); px(q, -2, -2.5, BON[4]); circ(q, 1.4, 0.6, 1.4, VIO[3]); px(q, 1, 0, VIO[4]); line(q, -2.5, 2.6, 2, 3.2, 0.8, BON[0]);
      q.restore();
    }); } };
  P.trenchfall = { fit: 0.8, pal: all(BLK, BON, TEA, LEA), fn(g) { // an abyss-stone warhammer cracked with teal pressure veins
    diag(g, (q) => {
      rect(q, -4, -2.4, 46, 4.8, BLK[1]); rect(q, -4, -2.4, 46, 1.4, BLK[2]);
      [2, 12, 22, 32].forEach((x) => { rect(q, x, -3, 3, 6, BON[1]); rect(q, x, -3, 3, 1.4, BON[3]); });
      rect(q, -6, -3, 4, 6, BLK[2]); circ(q, -6, 0, 2.6, BON[2]);
      q.save(); q.translate(44, 0);
      // the head: a heavy block with chamfered corners and a back spike
      poly(q, [[-9, -17], [9, -17], [12, -13], [12, 13], [9, 17], [-9, 17], [-12, 13], [-12, -13]], BLK[1]);
      q.fillStyle = lin(q, -12, 0, 12, 0, [BLK[3], BLK[2], BLK[2], BLK[1]]); q.fillRect(-11, -15, 22, 30);
      poly(q, [[-9, -17], [9, -17], [12, -13], [-12, -13]], BLK[4]); poly(q, [[-12, 13], [12, 13], [9, 17], [-9, 17]], BLK[0]);
      rect(q, -13, -6, 3, 12, BON[2]); rect(q, 10, -6, 3, 12, BON[2]); rect(q, -13, -6, 3, 2, BON[4]); rect(q, 10, -6, 3, 2, BON[4]);
      poly(q, [[-12, -3], [-22, 0], [-12, 3]], BON[3]); poly(q, [[-12, -3], [-22, 0], [-17, -1]], BON[4]);
      q.strokeStyle = TEA[2]; q.lineWidth = 1.8; q.beginPath(); q.moveTo(-7, -12); q.lineTo(-2, -5); q.lineTo(-6, 2); q.lineTo(-1, 9); q.lineTo(-4, 14); q.moveTo(6, -13); q.lineTo(2, -4); q.lineTo(7, 4); q.lineTo(4, 12); q.stroke();
      q.strokeStyle = TEA[4]; q.lineWidth = 0.8; q.beginPath(); q.moveTo(-6.5, -11); q.lineTo(-2.5, -5); q.moveTo(5.5, -12); q.lineTo(2.4, -4.5); q.stroke();
      circ(q, 0, 0, 3.4, TEA[1]); circ(q, 0, 0, 2.2, TEA[3]); px(q, -1, -1, TEA[4]);
      q.restore();
    }); } };
  P.gravewake = { pal: all(BLK, BON, TEA, LEA), fn(g) { // a harpoon gun: black stock, bone ribs, a teal line coiled on its drum
    g.save(); g.translate(24, 26); g.rotate(-0.42);
    rect(g, -20, -4, 30, 9, BLK[1]); g.fillStyle = lin(g, 0, -4, 0, 5, [BLK[3], BLK[2], BLK[1]]); g.fillRect(-19, -3.5, 28, 7);
    for (let x = -16; x < 6; x += 4) { rect(g, x, -5, 2, 11, BON[1]); rect(g, x, -5, 2, 2, BON[3]); }
    poly(g, [[-20, -4], [-26, -1], [-27, 8], [-20, 5]], BLK[2]); poly(g, [[-26, -1], [-27, 8], [-25, 8], [-24, 0]], BLK[3]);
    poly(g, [[-10, 5], [-6, 5], [-7, 14], [-12, 14]], LEA[2]); poly(g, [[-10, 5], [-8, 5], [-9, 14], [-12, 14]], LEA[3]);
    rect(g, 9, -2.2, 10, 4.4, BLK[2]); rect(g, 9, -2.2, 10, 1.2, BLK[3]);
    rect(g, 18, -1.3, 8, 2.6, BON[2]); rect(g, 18, -1.3, 8, 0.9, BON[4]);
    poly(g, [[25, -6], [33, 0], [25, 6], [27, 0]], BON[2]); poly(g, [[25, -6], [33, 0], [28, -0.5]], BON[4]); poly(g, [[22, -4], [25, 0], [22, 4], [23.5, 0]], BON[1]);
    circ(g, -6, -8, 5.5, BLK[2]); circ(g, -6, -8, 4, BLK[1]); g.strokeStyle = TEA[2]; g.lineWidth = 1.2; for (let r = 1.5; r < 4.5; r += 1.2) { g.beginPath(); g.arc(-6, -8, r, 0, 6.283); g.stroke(); }
    g.strokeStyle = TEA[3]; g.lineWidth = 1; g.beginPath(); g.moveTo(-1, -8); g.bezierCurveTo(6, -12, 12, -4, 20, -2); g.stroke(); px(g, -7, -10, TEA[4]);
    g.restore(); } };
  P.wraithstring = { pal: all(BLK, BON, GHO), fn(g) { // a soul bow: black limbs, bone tips, a ghost-white string and a skull at the grip
    const cx = 14, cy = 24, R = 20;
    g.lineCap = 'round';
    g.strokeStyle = BLK[1]; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R, -1.25, 1.25); g.stroke();
    g.strokeStyle = BLK[3]; g.lineWidth = 2; g.beginPath(); g.arc(cx - 0.8, cy, R - 0.8, -1.15, -0.3); g.stroke(); g.beginPath(); g.arc(cx - 0.8, cy, R - 0.8, 0.3, 1.15); g.stroke();
    const tip = (s) => { const a = s * 1.25, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; poly(g, [[x - 2, y], [x + 3, y + s * 6], [x + 2.5, y - s * 1]], BON[3]); px(g, x + 2, y + s * 4, BON[4]); return [x, y]; };
    const t1 = tip(-1), t2 = tip(1);
    for (let k = -2; k <= 2; k++) { if (!k) continue; const a = k * 0.42, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; circ(g, x, y, 1.6, BON[2]); px(g, x - 0.5, y - 0.5, BON[4]); }
    line(g, t1[0] + 1, t1[1] + 2, t2[0] + 1, t2[1] - 2, 1.2, GHO[3]);
    for (let y = t1[1] + 4; y < t2[1] - 3; y += 5) px(g, t1[0] + 1.5, y, GHO[4]);
    // the skull at the grip, looking out
    circ(g, cx + R + 1, cy, 5.4, BON[2]); circ(g, cx + R + 0.4, cy - 0.8, 4.2, BON[3]); rect(g, cx + R - 2, cy + 3, 6, 3, BON[2]);
    circ(g, cx + R - 0.8, cy - 0.4, 1.4, BLK[0]); circ(g, cx + R + 2.6, cy - 0.4, 1.4, BLK[0]); px(g, cx + R - 1, cy - 0.6, GHO[4]); px(g, cx + R + 2.4, cy - 0.6, GHO[4]);
    px(g, cx + R - 1, cy + 4, BLK[0]); px(g, cx + R + 1, cy + 4, BLK[0]); px(g, cx + R + 3, cy + 4, BLK[0]);
    // a ghost arrow nocked
    line(g, 15, cy, 44, cy, 1.4, GHO[2]); poly(g, [[42, cy - 3], [47, cy], [42, cy + 3]], GHO[4]); for (let k = 0; k < 3; k++) line(g, 15 + k * 2, cy, 13 + k * 2, cy - 3, 0.9, GHO[3]);
  } };
  P.drowneye = { fit: 0.84, pal: all(BLK, BON, TEA, GHO), fn(g) { // the Leviathan's dead eye, held in a black claw on a staff
    diag(g, (q) => {
      rect(q, -4, -2.2, 44, 4.4, BLK[1]); rect(q, -4, -2.2, 44, 1.2, BLK[3]);
      for (let x = 4; x < 36; x += 8) { rect(q, x, -2.8, 2, 5.6, BON[2]); }
      q.save(); q.translate(48, 0);
      [-1, 1].forEach((s) => { path(q, BLK[2], (p) => { p.moveTo(-8, s * 2); p.quadraticCurveTo(-4, s * 14, 6, s * 12); p.lineTo(4, s * 8); p.quadraticCurveTo(-2, s * 8, -4, s * 1); }); poly(q, [[6, s * 12], [10, s * 9], [4, s * 8]], BON[3]); });
      path(q, BLK[1], (p) => { p.moveTo(-9, -3); p.lineTo(-9, 3); p.lineTo(-4, 2); p.lineTo(-4, -2); });
      circ(q, 2, 0, 9, BLK[0]); q.fillStyle = rad(q, 0, -2, 1, 8.5, [TEA[4], TEA[3], TEA[2], TEA[1]]); q.beginPath(); q.arc(2, 0, 8, 0, 6.283); q.fill();
      for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.3; line(q, 2 + Math.cos(a) * 4, Math.sin(a) * 4, 2 + Math.cos(a) * 7.5, Math.sin(a) * 7.5, 0.6, TEA[1]); }
      path(q, BLK[0], (p) => { p.moveTo(1, -7); p.quadraticCurveTo(4.5, 0, 1, 7); p.quadraticCurveTo(-1.5, 0, 1, -7); });
      circ(q, -1.5, -3.5, 1.6, GHO[4]); px(q, 4, 3, GHO[3]);
      q.restore();
    }); } };
  P.codex = { pal: all(BLK, BON, VIO, LEA), fn(g) { // the Sunken Codex: a soaked black tome, chained shut, a tentacle slipping out of the pages
    poly(g, [[9, 10], [37, 7], [40, 39], [11, 42]], LEA[0]);
    g.fillStyle = lin(g, 9, 8, 40, 42, [LEA[3], LEA[2], LEA[1]]); poly(g, [[10, 10], [36, 8], [38, 38], [12, 40]], g.fillStyle);
    poly(g, [[9, 10], [13, 9.6], [15, 41.6], [11, 42]], LEA[0]); for (let y = 12; y < 40; y += 6) rect(g, 10, y, 4, 1.5, BON[1]);
    poly(g, [[36, 8], [40, 9], [42, 38], [38, 38]], BON[3]); for (let y = 11; y < 37; y += 2) line(g, 38, y, 41.2, y + 0.3, 0.5, BON[1]);
    line(g, 12, 25, 38, 23, 2.4, BLK[2]); for (let x = 14; x < 37; x += 4) { circ(g, x, 25 - (x - 12) * 0.08, 1.6, BLK[3]); }
    circ(g, 25, 24, 6.5, BLK[1]); circ(g, 25, 24, 5.2, VIO[1]); g.strokeStyle = VIO[3]; g.lineWidth = 1.2; g.beginPath(); g.ellipse(25, 24, 4.6, 2.6, 0, 0, 6.283); g.stroke(); circ(g, 25, 24, 1.6, VIO[4]);
    [[15, 13], [31, 34], [16, 35], [33, 12]].forEach(([x, y]) => { circ(g, x, y, 2.2, BON[1]); circ(g, x - 0.4, y - 0.4, 1.3, BON[3]); px(g, x, y, BLK[0]); });
    g.strokeStyle = VIO[1]; g.lineWidth = 3; g.beginPath(); g.moveTo(38, 16); g.bezierCurveTo(44, 12, 40, 5, 45, 2); g.stroke();
    g.strokeStyle = VIO[2]; g.lineWidth = 1.2; g.beginPath(); g.moveTo(38.6, 15); g.bezierCurveTo(43.4, 11.4, 39.6, 5, 44.6, 2.4); g.stroke(); for (let k = 0; k < 4; k++) px(g, 41 + (k % 2), 12 - k * 2.6, VIO[4]);
  } };
  P.tidetome = { pal: all(BLK, BON, TEA, HEA), fn(g) { // healing trinket: the Tome of the Ebbing Tide
    poly(g, [[10, 9], [38, 7], [40, 40], [12, 42]], HEA[0]);
    g.fillStyle = lin(g, 10, 8, 40, 42, [HEA[2], HEA[1], HEA[0]]); poly(g, [[11, 10], [37, 8], [38.6, 39], [13, 41]], g.fillStyle);
    poly(g, [[37, 8], [41, 9], [42.6, 39], [38.6, 39]], BON[3]); for (let y = 11; y < 38; y += 2) line(g, 38.6, y, 42, y + 0.3, 0.5, BON[1]);
    poly(g, [[10, 9], [14, 8.6], [16, 41.6], [12, 42]], BLK[1]);
    g.strokeStyle = TEA[3]; g.lineWidth = 1.6; [19, 25, 31].forEach((yy) => { g.beginPath(); for (let x = 18; x <= 35; x++) g.lineTo(x, yy + Math.sin(x * 0.75 + yy) * 1.8 - (x - 18) * 0.06); g.stroke(); });
    g.strokeStyle = TEA[4]; g.lineWidth = 0.7; g.beginPath(); for (let x = 18; x <= 30; x++) g.lineTo(x, 24.3 + Math.sin(x * 0.75 + 25) * 1.8); g.stroke();
    line(g, 26, 7, 25, 1, 1.6, HEA[3]); line(g, 25, 1, 23, -1, 1.6, HEA[3]); poly(g, [[26, 40], [28, 47], [30, 41]], HEA[2]);
    [[8, 20], [6, 27], [44, 12]].forEach(([x, y], k) => { circ(g, x, y, 1.4 - k * 0.2, TEA[3]); px(g, x - 0.5, y - 0.6, TEA[4]); });
  } };
  // ============================ CRAFTED FROM GUARDIAN CORES ============================
  P.ossuary = { pal: all(ABY, BON, EMB), fn(g) { // Ossuary Anchor: black Abyssite on a vertebra chain, an ember skull at its crown
    for (let k = 0; k < 7; k++) { const x = 4 + k * 2.6, y = 4 + k * 2.4; ellip(g, x, y, 2, 1.6, 0.8, k % 2 ? BON[3] : BON[1]); px(g, x - 0.6, y - 0.6, BON[4]); }
    circ(g, 24, 15, 4.2, ABY[3]); circ(g, 24, 15, 2.2, ABY[0]);
    g.fillStyle = lin(g, 21, 0, 27, 0, [ABY[5], ABY[4], ABY[2]]); g.fillRect(21.5, 18, 5, 21);
    g.fillStyle = lin(g, 0, 20, 0, 25, [ABY[5], ABY[3], ABY[2]]); g.fillRect(13, 20.5, 22, 4.5); circ(g, 13, 22.7, 2.6, ABY[4]); circ(g, 35, 22.7, 2.6, ABY[4]);
    g.strokeStyle = ABY[2]; g.lineWidth = 5; g.beginPath(); g.arc(24, 28, 14, 0.32, 2.82); g.stroke();
    g.strokeStyle = ABY[5]; g.lineWidth = 1.4; g.beginPath(); g.arc(24, 28, 15.6, 0.6, 2.5); g.stroke();
    poly(g, [[8, 31], [5, 40], [13, 38]], ABY[3]); poly(g, [[40, 31], [43, 40], [35, 38]], ABY[3]); poly(g, [[8, 31], [5, 40], [7, 38]], ABY[6]); poly(g, [[40, 31], [43, 40], [41.5, 38]], ABY[5]);
    circ(g, 24, 41, 3, ABY[3]); px(g, 23, 40, ABY[6]);
    circ(g, 24, 29.6, 5.4, BON[2]); circ(g, 23.5, 29, 4.4, BON[3]); rect(g, 21, 32.6, 6, 3, BON[2]);
    circ(g, 22, 29, 1.4, EMB[3]); circ(g, 26, 29, 1.4, EMB[3]); px(g, 22, 28.6, EMB[4]); px(g, 26, 28.6, EMB[4]); for (let k = 0; k < 3; k++) px(g, 22 + k * 2, 34, BLK[0]);
  } };
  P.silentfathom = { pal: all(ABY, BON, ICE), fn(g) { // Silent Fathom: a crossbow with a spiral narwhal-horn stock and two watching eyes
    g.save(); g.translate(24, 25); g.rotate(-0.42);
    g.fillStyle = lin(g, 0, -3, 0, 3, [BON[4], BON[2], BON[1]]); poly(g, [[-23, -2.6], [16, -2], [24, 0], [16, 2], [-23, 2.6]], g.fillStyle);
    for (let x = -20; x < 20; x += 3) line(g, x, -2.4, x + 2, 2.4, 0.8, BON[0]);
    rect(g, -9, -4.6, 20, 9.2, ABY[2]); rect(g, -9, -4.6, 20, 2, ABY[4]); rect(g, -9, 3, 20, 1.6, ABY[0]);
    g.strokeStyle = ABY[3]; g.lineWidth = 3.6; g.beginPath(); g.moveTo(8, -4); g.quadraticCurveTo(4, -15, -4, -20); g.stroke(); g.beginPath(); g.moveTo(8, 4); g.quadraticCurveTo(4, 15, -4, 20); g.stroke();
    g.strokeStyle = ABY[5]; g.lineWidth = 1.2; g.beginPath(); g.moveTo(9, -5); g.quadraticCurveTo(5.4, -15, -2.6, -19.4); g.stroke();
    line(g, -4, -20, -6, 0, 0.9, ICE[3]); line(g, -4, 20, -6, 0, 0.9, ICE[3]);
    poly(g, [[-6, 6], [-2, 6], [-3, 15], [-8, 15]], ABY[2]); poly(g, [[-6, 6], [-4.4, 6], [-5.4, 15], [-8, 15]], ABY[4]);
    rect(g, -2, -1.4, 3, 2.8, BLK[0]); rect(g, 3, -1.4, 3, 2.8, BLK[0]); rect(g, -1.4, -0.8, 1.8, 1.4, ICE[4]); rect(g, 3.6, -0.8, 1.8, 1.4, ICE[4]);
    g.restore(); } };
  P.veilstaff = { fit: 0.84, pal: all(ABY, MIS, GHO), fn(g) { // Veilstaff: a staff crowned with an empty hood that pours mist
    diag(g, (q) => {
      rect(q, -4, -2, 42, 4, ABY[2]); rect(q, -4, -2, 42, 1, ABY[4]); for (let x = 6; x < 36; x += 9) { rect(q, x, -2.6, 2, 5.2, ABY[5]); }
      q.save(); q.translate(46, 0);
      path(q, lin(q, -10, -10, 10, 10, [MIS[3], MIS[2], MIS[1]]), (p) => { p.moveTo(-9, -9); p.quadraticCurveTo(4, -16, 12, -2); p.quadraticCurveTo(10, 8, 0, 12); p.quadraticCurveTo(-6, 6, -9, -9); });
      path(q, MIS[4], (p) => { p.moveTo(-8, -8.5); p.quadraticCurveTo(3, -14.6, 10, -3); p.quadraticCurveTo(3, -10, -6, -6); });
      ellip(q, 2.4, -0.4, 5.6, 6.6, 0.4, '#000000'); ellip(q, 2.4, -0.4, 4.2, 5.2, 0.4, MIS[0]);
      for (let k = 0; k < 9; k++) { const t = k / 8; circ(q, 4 + t * 10 + Math.sin(k * 1.7) * 2, 4 + t * 7, 2.2 - t * 1.3, k % 2 ? GHO[1] : GHO[2]); }
      px(q, 3, -2, GHO[4]);
      q.restore();
    }); } };
  P.soullantern = { pal: all(ABY, HEA, BON), fn(g) { // Soulbound Lantern: an Abyssite cage holding a green soul light, with a soul tether
    line(g, 22, 2, 22, 8, 1.8, BON[2]); g.strokeStyle = BON[2]; g.lineWidth = 1.6; g.beginPath(); g.arc(22, 4, 3, Math.PI, 0); g.stroke();
    poly(g, [[13, 12], [31, 12], [28, 8], [16, 8]], ABY[4]); poly(g, [[13, 12], [31, 12], [30, 10], [14, 10]], ABY[5]);
    rect(g, 14, 12, 16, 22, ABY[1]); g.fillStyle = rad(g, 22, 22, 1, 10, [HEA[4], HEA[3], HEA[2], HEA[1]]); g.fillRect(15.5, 13.5, 13, 19);
    ellip(g, 22, 24, 3.4, 5, 0, HEA[3]); ellip(g, 22, 25, 2, 3, 0, HEA[4]); px(g, 21, 21, '#ffffff');
    [14, 22, 29].forEach((x) => { rect(g, x - 0.6, 12, 2.2, 22, ABY[3]); rect(g, x - 0.6, 12, 0.8, 22, ABY[5]); });
    poly(g, [[12, 34], [32, 34], [29, 38], [15, 38]], ABY[4]); poly(g, [[15, 38], [29, 38], [27, 41], [17, 41]], ABY[2]);
    g.strokeStyle = HEA[3]; g.lineWidth = 1.3; g.beginPath(); g.moveTo(30, 22); g.bezierCurveTo(38, 16, 38, 30, 46, 24); g.stroke(); px(g, 46, 24, HEA[4]); px(g, 38, 22, HEA[4]);
  } };
  // ============================ GUARDIAN CORES ============================
  function core(g, R, face) { // a soul caged in Abyssite bars, its face glowing in the wisp
    const C = ['#16121e', '#2a2540', '#3e3860', '#5a5288'];
    // the soul behind the bars: a glowing wisp
    g.fillStyle = rad(g, 24, 25, 1, 13, [R[4], R[3], R[2], R[1]]); g.beginPath(); g.moveTo(24, 12); g.bezierCurveTo(33, 13, 34, 28, 30, 34); g.quadraticCurveTo(27, 38, 24, 35); g.quadraticCurveTo(21, 39, 18, 34); g.bezierCurveTo(14, 28, 15, 13, 24, 12); g.fill();
    if (face === 'skull') { circ(g, 24, 22, 5, BON[3]); rect(g, 21, 25, 6, 4, BON[3]); circ(g, 22, 21.6, 1.5, BLK[0]); circ(g, 26, 21.6, 1.5, BLK[0]); px(g, 22, 21.4, R[4]); px(g, 26, 21.4, R[4]); for (let k = 0; k < 3; k++) px(g, 22 + k * 2, 28, BLK[0]); }
    if (face === 'eyes') { ellip(g, 24, 23, 6.6, 5.4, 0, BLK[0]); rect(g, 20, 22, 3, 1.6, R[4]); rect(g, 25.4, 22, 3, 1.6, R[4]); }
    if (face === 'hood') { path(g, MIS[2], (p) => { p.moveTo(17, 32); p.quadraticCurveTo(16, 16, 24, 14); p.quadraticCurveTo(32, 16, 31, 32); }); ellip(g, 24, 24, 4, 5.4, 0, '#000000'); for (let k = 0; k < 4; k++) px(g, 22 + k, 31 + (k % 2), GHO[3]); }
    if (face === 'face') { ellip(g, 24, 24, 5, 6, 0, '#8a9aa4'); ellip(g, 23.5, 23, 3.6, 4.4, 0, '#a4b2ba'); g.strokeStyle = '#9a8a48'; g.lineWidth = 1; g.beginPath(); g.ellipse(24, 23, 8, 9.5, 0, 0, 6.283); g.stroke(); line(g, 22, 23, 23.4, 23, 0.8, '#3a4a50'); line(g, 24.8, 23, 26.2, 23, 0.8, '#3a4a50'); }
    // the cage: a ring on top, a crown, curved bars, a heavy base
    g.strokeStyle = C[3]; g.lineWidth = 1.8; g.beginPath(); g.arc(24, 4.5, 2.6, 0, 6.283); g.stroke();
    path(g, C[2], (p) => { p.moveTo(14, 11); p.quadraticCurveTo(24, 3, 34, 11); p.lineTo(32, 12.5); p.quadraticCurveTo(24, 6.5, 16, 12.5); });
    [-9.5, -5, 0, 5, 9.5].forEach((dx, k) => { g.strokeStyle = k === 0 || k === 4 ? C[2] : C[3]; g.lineWidth = 1.25; g.beginPath(); g.moveTo(24 + dx * 0.55, 11); g.bezierCurveTo(24 + dx * 1.3, 18, 24 + dx * 1.3, 32, 24 + dx * 1.05, 39); g.stroke(); });
    g.strokeStyle = C[2]; g.lineWidth = 1.4; g.beginPath(); g.ellipse(24, 25, 12.4, 2, 0, 0, Math.PI); g.stroke();
    poly(g, [[11, 39], [37, 39], [35, 44], [13, 44]], C[1]); poly(g, [[11, 39], [37, 39], [36.5, 40.4], [11.5, 40.4]], C[3]); for (let k = 0; k < 4; k++) px(g, 15 + k * 6, 42, R[3]);
    for (let k = 0; k < 4; k++) px(g, 9 + (k % 2) * 30, 16 + k * 6, R[4]);
  }
  P.core_knight = { pal: all(BLK, BON, EMB, ABY), fn(g) { core(g, EMB, 'skull'); } };
  P.core_archer = { pal: all(BLK, ICE, ABY), fn(g) { core(g, ICE, 'eyes'); } };
  P.core_mage = { pal: all(BLK, MIS, GHO, ABY), fn(g) { core(g, MIS, 'hood'); } };
  P.core_healer = { pal: all(BLK, HEA, ABY, ['#8a9aa4', '#a4b2ba', '#3a4a50', '#5a6a70', '#9a8a48']), fn(g) { core(g, HEA, 'face'); } };
  // ============================ ABYSSITE ============================
  P.abyssite_ore = { pal: all(ABY, ['#2a2630', '#3a3640', '#4c4852', '#5e5a64']), fn(g) {
    path(g, '#2a2630', (p) => { p.moveTo(8, 30); p.lineTo(12, 14); p.lineTo(24, 8); p.lineTo(37, 12); p.lineTo(42, 26); p.lineTo(36, 40); p.lineTo(18, 42); p.closePath(); });
    path(g, '#3a3640', (p) => { p.moveTo(12, 14); p.lineTo(24, 8); p.lineTo(37, 12); p.lineTo(30, 18); p.lineTo(16, 20); }); path(g, '#4c4852', (p) => { p.moveTo(14, 15); p.lineTo(24, 10); p.lineTo(28, 12); p.lineTo(18, 17); });
    [[17, 26, 5], [29, 22, 6], [33, 34, 4], [21, 36, 3.6]].forEach(([x, y, r]) => { poly(g, [[x, y - r * 1.3], [x + r, y], [x, y + r * 1.1], [x - r, y]], ABY[3]); poly(g, [[x, y - r * 1.3], [x + r, y], [x, y]], ABY[5]); poly(g, [[x, y - r * 1.3], [x - r, y], [x, y]], ABY[4]); px(g, x - 1, y - r * 0.6, ABY[6]); });
  } };
  P.abyssite_bar = { pal: all(ABY), fn(g) {
    poly(g, [[5, 32], [12, 18], [43, 18], [37, 32]], ABY[2]); poly(g, [[12, 18], [43, 18], [41, 22], [14, 22]], ABY[5]); poly(g, [[37, 32], [43, 18], [44, 21], [39, 34]], ABY[1]);
    poly(g, [[5, 32], [37, 32], [39, 34], [7, 35]], ABY[0]); line(g, 15, 20, 38, 20, 0.8, ABY[6]); line(g, 13, 27, 31, 27, 1.2, ABY[4]); px(g, 16, 25, ABY[6]);
  } };
  P.abyssite_helm = { pal: all(ABY, BON), fn(g) {
    path(g, lin(g, 0, 8, 0, 40, [ABY[4], ABY[3], ABY[1]]), (p) => { p.moveTo(9, 40); p.lineTo(8, 22); p.quadraticCurveTo(10, 9, 24, 8); p.quadraticCurveTo(38, 9, 40, 22); p.lineTo(39, 40); p.lineTo(31, 40); p.lineTo(31, 28); p.lineTo(17, 28); p.lineTo(17, 40); p.closePath(); });
    path(g, ABY[5], (p) => { p.moveTo(10, 20); p.quadraticCurveTo(12, 10, 24, 9.6); p.quadraticCurveTo(30, 10, 34, 13); p.quadraticCurveTo(24, 12, 12, 21); });
    rect(g, 22.8, 9, 2.4, 19, ABY[2]); rect(g, 17, 25, 14, 3.4, ABY[0]); px(g, 20, 26, ABY[6]); px(g, 28, 26, ABY[6]);
    [-1, 1].forEach((s) => { path(g, BON[2], (p) => { p.moveTo(24 + s * 13, 15); p.quadraticCurveTo(24 + s * 22, 10, 24 + s * 21, 1); p.quadraticCurveTo(24 + s * 18, 9, 24 + s * 12, 11); }); line(g, 24 + s * 14, 13, 24 + s * 20, 5, 0.8, BON[4]); });
  } };
  P.abyssite_mail = { pal: all(ABY, BON), fn(g) {
    path(g, lin(g, 0, 6, 0, 44, [ABY[4], ABY[3], ABY[1]]), (p) => { p.moveTo(6, 15); p.lineTo(16, 7); p.lineTo(32, 7); p.lineTo(42, 15); p.lineTo(39, 25); p.lineTo(35, 23); p.lineTo(35, 43); p.lineTo(13, 43); p.lineTo(13, 23); p.lineTo(9, 25); p.closePath(); });
    poly(g, [[16, 7], [32, 7], [29, 13], [19, 13]], ABY[0]); poly(g, [[6, 15], [16, 7], [16, 13], [9, 20]], ABY[5]); poly(g, [[42, 15], [32, 7], [32, 13], [39, 20]], ABY[2]);
    for (let k = 0; k < 5; k++) { const y = 17 + k * 4.6; rect(g, 17, y, 14, 2, BON[2]); rect(g, 17, y, 14, 0.8, BON[4]); rect(g, 16, y + 0.4, 1.4, 1.2, BON[1]); }
    poly(g, [[24, 15], [27, 20], [24, 25], [21, 20]], ABY[5]); px(g, 24, 18, ABY[6]); rect(g, 13, 40, 22, 3, ABY[0]);
  } };
  P.abyssite_pick = { pal: all(ABY, BON, LEA), fn(g) {
    diag(g, (q) => {
      rect(q, -4, -2.4, 44, 4.8, LEA[2]); rect(q, -4, -2.4, 44, 1.4, LEA[3]); for (let x = -3; x < 9; x += 2.4) line(q, x, -2.4, x + 1.6, 2.4, 0.8, LEA[0]);
      q.save(); q.translate(42, 0);
      path(q, lin(q, -4, 0, 10, 0, [ABY[5], ABY[3], ABY[1]]), (p) => { p.moveTo(-5, -24); p.quadraticCurveTo(8, -8, 6, 0); p.quadraticCurveTo(8, 8, -5, 24); p.quadraticCurveTo(13, 6, 2, 0); p.quadraticCurveTo(13, -6, -5, -24); });
      q.strokeStyle = ABY[6]; q.lineWidth = 1; q.beginPath(); q.moveTo(-3, -21); q.quadraticCurveTo(7, -9, 6.4, -2); q.stroke();
      rect(q, -3, -5, 7, 10, ABY[2]); rect(q, -3, -5, 7, 2, ABY[4]); circ(q, 0.5, 0, 1.6, ABY[6]);
      q.restore();
    }); } };
  P.glow_abyssal = { pal: all(ABY, BON, VIO), fn(g) {
    line(g, 12, 6, 24, 16, 1.4, BON[2]); line(g, 36, 6, 24, 16, 1.4, BON[2]); circ(g, 24, 16, 2, BON[3]);
    circ(g, 24, 29, 12, ABY[0]); g.fillStyle = rad(g, 22, 27, 1, 11, [VIO[4], VIO[3], VIO[2], ABY[2]]); g.beginPath(); g.arc(24, 29, 10.6, 0, 6.283); g.fill();
    for (let k = 0; k < 6; k++) { const a = k * 1.047; poly(g, [[24 + Math.cos(a) * 11, 29 + Math.sin(a) * 11], [24 + Math.cos(a + 0.2) * 14, 29 + Math.sin(a + 0.2) * 14], [24 + Math.cos(a + 0.4) * 11, 29 + Math.sin(a + 0.4) * 11]], ABY[4]); }
    circ(g, 20, 25, 2.4, '#ffffff'); [[24, 44], [8, 29], [40, 29]].forEach(([x, y]) => { px(g, x, y, VIO[4]); });
  } };
  P.lev_altar = { pal: all(BLK, BON, TEA), fn(g) {
    rect(g, 5, 36, 38, 8, BLK[1]); rect(g, 5, 36, 38, 2, BLK[3]); rect(g, 9, 30, 30, 6, BLK[2]); rect(g, 9, 30, 30, 1.6, BLK[4]);
    [[13, 30, 14], [35, 30, 16], [24, 30, 24]].forEach(([x, y, h]) => { poly(g, [[x - 4, y], [x, y - h], [x + 4, y]], BON[2]); poly(g, [[x - 4, y], [x, y - h], [x - 1, y]], BON[4]); });
    circ(g, 24, 40, 3.4, TEA[1]); circ(g, 24, 40, 2, TEA[3]); px(g, 23, 39, TEA[4]);
    for (let k = 0; k < 4; k++) rect(g, 8 + k * 9, 42, 4, 1.4, BLK[0]);
  } };
  P.krait_pearl = { pal: all(BLK, TEA, GHO), fn(g) { // the pet: a dark pearl with a little sea krait curled round it
    circ(g, 24, 26, 12, BLK[1]); g.fillStyle = rad(g, 20, 22, 1, 12, [GHO[3], BLK[4], BLK[2], BLK[1]]); g.beginPath(); g.arc(24, 26, 11, 0, 6.283); g.fill(); circ(g, 19, 21, 2.6, GHO[4]);
    g.lineCap = 'round'; const pts = []; for (let a = 0; a < 5.2; a += 0.18) pts.push([24 + Math.cos(a + 2) * (13 + a * 0.4), 26 + Math.sin(a + 2) * (13 + a * 0.4)]);
    pts.forEach(([x, y], k) => circ(g, x, y, 3.2 - k * 0.05, Math.floor(k / 3) % 2 ? TEA[1] : '#16141e'));
    const [hx, hy] = pts[pts.length - 1]; circ(g, hx, hy, 3.8, '#16141e'); px(g, hx + 1, hy - 1, TEA[4]); px(g, hx + 2, hy - 1, TEA[4]); poly(g, [[hx - 2, hy - 3], [hx, hy - 8], [hx + 1, hy - 3]], TEA[2]);
  } };
  // ============================ TRINKETS ============================
  P.t_fang = { pal: all(BLK, BON, EMB), fn(g) { line(g, 12, 6, 36, 6, 2, BLK[3]); g.strokeStyle = BLK[3]; g.lineWidth = 1.2; g.beginPath(); g.arc(24, 2, 13, 0.6, 2.5); g.stroke();
    path(g, lin(g, 16, 0, 32, 0, [BON[4], BON[3], BON[1]]), (p) => { p.moveTo(17, 8); p.lineTo(31, 8); p.quadraticCurveTo(30, 30, 24, 45); p.quadraticCurveTo(18, 30, 17, 8); });
    line(g, 19, 10, 22, 34, 1, BON[4]); rect(g, 16, 7, 16, 3, BLK[2]); circ(g, 24, 16, 1.8, EMB[3]); for (let k = 0; k < 3; k++) line(g, 27, 14 + k * 7, 29, 15 + k * 7, 0.8, BON[0]); } };
  P.t_eye = { pal: all(BLK, BON, ['#3a3420', '#6a5e2a', '#a8943a', '#e0d080']), fn(g) { line(g, 24, 1, 24, 10, 1.4, BON[2]);
    circ(g, 24, 26, 14, BLK[2]); circ(g, 24, 26, 12, '#3a3420'); g.fillStyle = rad(g, 21, 23, 1, 11, ['#e0d080', '#a8943a', '#6a5e2a']); g.beginPath(); g.arc(24, 26, 10.5, 0, 6.283); g.fill();
    path(g, BLK[0], (p) => { p.moveTo(24, 16); p.quadraticCurveTo(28, 26, 24, 36); p.quadraticCurveTo(20, 26, 24, 16); }); circ(g, 20, 21, 2, '#ffffff'); for (let k = 0; k < 8; k++) { const a = k * 0.785; px(g, 24 + Math.cos(a) * 13, 26 + Math.sin(a) * 13, BON[3]); } } };
  P.t_coil = { pal: all(BLK, BON, EMB), fn(g) { g.lineCap = 'round'; g.strokeStyle = BON[1]; g.lineWidth = 3.4; g.beginPath(); for (let a = 0; a < 15; a += 0.2) g.lineTo(24 + Math.cos(a) * (3 + a * 1.2), 24 + Math.sin(a) * (3 + a * 1.2)); g.stroke();
    g.strokeStyle = BON[3]; g.lineWidth = 1.2; g.beginPath(); for (let a = 0; a < 15; a += 0.2) g.lineTo(24 + Math.cos(a) * (3 + a * 1.2) - 0.6, 24 + Math.sin(a) * (3 + a * 1.2) - 0.8); g.stroke(); circ(g, 24, 24, 3.2, EMB[2]); px(g, 23, 23, EMB[4]);
    for (let k = 0; k < 6; k++) { const a = k * 1.05; rect(g, 24 + Math.cos(a) * 21 - 1, 24 + Math.sin(a) * 21 - 1, 2.4, 2.4, BLK[3]); } } };
  P.t_shell = { pal: all(BLK, BON), fn(g) { path(g, lin(g, 0, 6, 0, 42, [BLK[4], BLK[3], BLK[2]]), (p) => { p.moveTo(24, 6); p.lineTo(42, 20); p.lineTo(37, 40); p.lineTo(11, 40); p.lineTo(6, 20); p.closePath(); });
    for (let k = -3; k <= 3; k++) line(g, 24, 9, 24 + k * 5.6, 38, 1.2, BLK[1]); for (let k = -3; k <= 3; k += 2) line(g, 24 + 0.6, 9, 24 + k * 5.6 + 0.8, 37, 0.7, BLK[4]);
    rect(g, 10, 38, 28, 4, BON[2]); rect(g, 10, 38, 28, 1.2, BON[4]); circ(g, 24, 8, 2.6, BON[3]); } };
  P.t_anchor = { pal: all(BLK, BON), fn(g) { circ(g, 24, 8, 4.4, BLK[3]); circ(g, 24, 8, 2.2, BLK[0]); g.fillStyle = lin(g, 21, 0, 27, 0, [BLK[4], BLK[3], BLK[1]]); g.fillRect(21.5, 11, 5, 28); g.fillRect(13, 15, 22, 4); circ(g, 13, 17, 2.4, BLK[4]); circ(g, 35, 17, 2.4, BLK[4]);
    g.strokeStyle = BLK[2]; g.lineWidth = 4.6; g.beginPath(); g.arc(24, 28, 14, 0.3, 2.84); g.stroke(); g.strokeStyle = BLK[4]; g.lineWidth = 1; g.beginPath(); g.arc(24, 28, 15.6, 0.6, 2.5); g.stroke();
    poly(g, [[8, 31], [5, 40], [13, 38]], BLK[3]); poly(g, [[40, 31], [43, 40], [35, 38]], BLK[3]); rect(g, 20, 22, 8, 3, BON[2]); } };
  P.t_thorn = { pal: all(BLK, BON, EMB), fn(g) { for (let k = 0; k < 12; k++) { const a = k * 0.5236; poly(g, [[24 + Math.cos(a - 0.22) * 9, 24 + Math.sin(a - 0.22) * 9], [24 + Math.cos(a) * 21, 24 + Math.sin(a) * 21], [24 + Math.cos(a + 0.22) * 9, 24 + Math.sin(a + 0.22) * 9]], k % 2 ? BON[2] : BON[3]); }
    circ(g, 24, 24, 11, BLK[2]); g.fillStyle = rad(g, 22, 22, 1, 9, [BLK[4], BLK[3], BLK[1]]); g.beginPath(); g.arc(24, 24, 9.6, 0, 6.283); g.fill(); circ(g, 24, 24, 4, EMB[2]); circ(g, 23, 23, 1.8, EMB[4]); } };
  P.t_gill = { pal: all(BLK, BON, TEA), fn(g) { line(g, 24, 1, 24, 9, 1.4, BON[2]); path(g, lin(g, 0, 9, 0, 42, [TEA[1], TEA[0], BLK[1]]), (p) => { p.moveTo(11, 11); p.lineTo(37, 11); p.quadraticCurveTo(42, 26, 37, 41); p.lineTo(11, 41); p.quadraticCurveTo(6, 26, 11, 11); });
    for (let k = 0; k < 5; k++) { const y = 16 + k * 5.4; g.strokeStyle = TEA[3]; g.lineWidth = 1.6; g.beginPath(); g.moveTo(14, y); g.quadraticCurveTo(24, y + 3, 34, y); g.stroke(); } rect(g, 11, 10, 26, 2.4, BON[2]); } };
  P.t_fin = { pal: all(BLK, BON, TEA), fn(g) { g.strokeStyle = BLK[3]; g.lineWidth = 3.4; g.beginPath(); g.arc(24, 28, 12, 0, 6.283); g.stroke(); g.strokeStyle = BLK[4]; g.lineWidth = 1; g.beginPath(); g.arc(24, 28, 13.4, 3.4, 4.8); g.stroke();
    path(g, lin(g, 20, 4, 44, 20, [TEA[3], TEA[2], TEA[1]]), (p) => { p.moveTo(22, 17); p.quadraticCurveTo(34, 2, 45, 3); p.quadraticCurveTo(38, 12, 36, 21); p.closePath(); }); for (let k = 0; k < 4; k++) line(g, 25 + k * 3, 16 - k * 0.5, 34 + k * 2.6, 6 + k * 2.4, 0.7, TEA[4]); } };
  P.t_feather = { pal: all(BON, GHO), fn(g) { line(g, 8, 44, 40, 4, 1.8, BON[2]);
    path(g, lin(g, 10, 40, 40, 4, [GHO[1], GHO[2], GHO[3]]), (p) => { p.moveTo(12, 38); p.quadraticCurveTo(14, 14, 40, 4); p.quadraticCurveTo(36, 26, 12, 38); });
    for (let k = 0; k < 8; k++) { const t = k / 8, x = 14 + t * 24, y = 36 - t * 30; line(g, x, y, x + 6 - t * 3, y + 3, 0.8, GHO[0]); line(g, x, y, x - 3 + t * 2, y - 5, 0.8, GHO[4]); } } };
  P.t_lens = { pal: all(BLK, BON, TEA, GHO), fn(g) { line(g, 28, 28, 43, 43, 5, BON[1]); line(g, 28, 28, 42, 42, 1.6, BON[3]); circ(g, 19, 19, 14, BLK[3]); circ(g, 19, 19, 11.4, BLK[1]);
    g.fillStyle = rad(g, 15, 15, 1, 11, [GHO[3], TEA[2], TEA[0]]); g.beginPath(); g.arc(19, 19, 10.6, 0, 6.283); g.fill(); line(g, 12, 15, 15, 11, 1.6, GHO[4]); } };
  P.t_pebble = { pal: all(BLK, TEA, ['#3e3a46', '#56525e', '#6e6a76', '#88849a']), fn(g) { path(g, '#3e3a46', (p) => { p.ellipse(24, 26, 15, 13, -0.3, 0, 6.283); }); path(g, '#56525e', (p) => { p.ellipse(22, 24, 12, 10, -0.3, 0, 6.283); }); path(g, '#6e6a76', (p) => { p.ellipse(19, 20, 5, 3.4, -0.5, 0, 6.283); });
    g.strokeStyle = TEA[3]; g.lineWidth = 1.6; g.beginPath(); g.moveTo(17, 26); g.lineTo(24, 19); g.lineTo(31, 26); g.lineTo(24, 33); g.closePath(); g.stroke(); px(g, 24, 26, TEA[4]); } };
  P.t_magnet = { pal: all(BLK, EMB, ICE), fn(g) { g.strokeStyle = BLK[2]; g.lineWidth = 9; g.beginPath(); g.arc(24, 22, 12, Math.PI, 0); g.stroke(); g.strokeStyle = BLK[4]; g.lineWidth = 2; g.beginPath(); g.arc(24, 22, 15, Math.PI + 0.3, -0.4); g.stroke();
    rect(g, 7.5, 22, 9, 14, BLK[2]); rect(g, 31.5, 22, 9, 14, BLK[2]); rect(g, 7.5, 33, 9, 6, EMB[2]); rect(g, 31.5, 33, 9, 6, ICE[2]); rect(g, 7.5, 33, 9, 1.4, EMB[4]); rect(g, 31.5, 33, 9, 1.4, ICE[4]); } };

  // ============================ caching, and the hookup to the game ============================
  const cache = {};
  function paint(id) {
    if (cache[id]) return cache[id];
    const p = P[id]; if (!p) return null;
    const c = mk(48, 48); c.ctx.imageSmoothingEnabled = true; if (p.fit) { c.ctx.translate(24 + (p.dx || 0), 24 + (p.dy || 0)); c.ctx.scale(p.fit, p.fit); c.ctx.translate(-24, -24); } p.fn(c.ctx); finish(c, p.pal);
    const it = RW.ITEMS[id], gc = it && it.v3glowc;
    if (gc) { // the Leviathan's own gear: a halo in its glow colour and a few sparkles
      const o = mk(48, 48), h = mk(48, 48); h.ctx.drawImage(c, 0, 0); h.ctx.globalCompositeOperation = 'source-in'; h.ctx.fillStyle = gc; h.ctx.fillRect(0, 0, 48, 48);
      o.ctx.filter = 'blur(2px)'; o.ctx.globalAlpha = 0.9; o.ctx.drawImage(h, 0, 0); o.ctx.drawImage(h, 0, 0); o.ctx.filter = 'none'; o.ctx.globalAlpha = 1; o.ctx.drawImage(c, 0, 0);
      const sp = (x, y, r) => { o.ctx.fillStyle = '#ffffff'; o.ctx.fillRect(x, y - r, 1, r * 2 + 1); o.ctx.fillRect(x - r, y, r * 2 + 1, 1); o.ctx.fillStyle = gc; o.ctx.fillRect(x - 1, y - 1, 1, 1); o.ctx.fillRect(x + 1, y + 1, 1, 1); };
      sp(9, 9, 2); sp(40, 30, 2); sp(14, 40, 1); sp(36, 6, 1);
      o.__noHD = true; cache[id] = o; return o;
    }
    c.__noHD = true; cache[id] = c; return c;
  }
  const artOf = (id) => { const it = RW.ITEMS[id]; return it && it.v3art ? it.v3art : P[id] ? id : null; };
  RW.v3art = { paint, has: (id) => !!artOf(id), artOf, painters: P, finish };

  // A.icon: a 16x16 picture (the small copy), with the 48x48 one riding along for everything that can show it
  const baseIcon = A.icon;
  A.icon = function (id) {
    const key = artOf(id); if (!key) return baseIcon.apply(this, arguments);
    if (A.icons[id] && A.icons[id].__big48) return A.icons[id];
    const big = paint(key), c = mk(16, 16); c.ctx.imageSmoothingEnabled = true; c.ctx.drawImage(big, 0, 0, 16, 16);
    c.__big48 = big; c.__hd2 = big; c.__iconId = id; A.icons[id] = c; return c;
  };
  // the bag, crafting list and tooltips paint icons into small canvases: give them the big picture instead
  const rawDI = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img, x, y) {
    if (arguments.length === 3 && img && img.__big48 && x === 0 && y === 0 && this.canvas && this.canvas.width === 16 && this.canvas.height === 16 && !this.canvas.__world) {
      const cv = this.canvas; cv.width = img.__big48.width; cv.height = img.__big48.height; cv.style.imageRendering = 'pixelated'; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; return rawDI.call(g, img.__big48, 0, 0);
    }
    return rawDI.apply(this, arguments);
  };
  // held: the big weapons are drawn half again larger, the grip kept in the hand
  const E = RW.ent;
  if (E && E.drawPlayer) {
    const baseDP = E.drawPlayer;
    E.drawPlayer = function (g, cam, p, look, opts) {
      if (!opts || !opts.item || !artOf(opts.item) || (RW.ITEMS[opts.item] || {}).kind !== 'weapon') return baseDP.apply(this, arguments);
      const raw = g.drawImage; let done = false;
      g.drawImage = function (img, x, y, w, h) { if (!done && arguments.length === 5 && img && img.__big48 && x === -3 && y === -13 && w === 16) { done = true; return raw.call(this, img.__big48, -5, -19.5, 24, 24); } return raw.apply(this, arguments); };
      try { return baseDP.apply(this, arguments); } finally { g.drawImage = raw; }
    };
  }
})(window.RW);
