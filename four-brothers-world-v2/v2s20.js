// 4 Brothers World V2 — part 20: Tanglehold, the jungle village (the slinger tribes, the sages and the Word Temple).
// The first part draws the villagers (from the sketchbook sprites); the second builds the village.
/* js/engine/art4.js */
// ART (part 4) — fuzzy cavalry (lizard riders and turtle riders), jungle slinger fuzzies, the sages,
// and the centipede bats. Drawn from the brothers' sketches with the same helpers as art.js / art2.js:
// flat colors, hard-edged shading, a dark 1px outline. Every drawer returns right-facing frames
// (the engine mirrors them for left). All frames in a set share one size, so they line up.
//
// Drawers added to RW.art.drawers (use them as art: { draw: '...', v: '...' } in a species file):
//   lizardrider                     0 idle, 1-4 run, 5 spear thrust
//   ridgeback                       the lizard on its own (same frames)
//   turtlerider                     0-3 walk, 4 lance charge, 5 shell brace
//   shellback                       the turtle on its own (same frames)
//   slinger   v: bands|glyph|key|zigzag    0 idle, 1-4 walk, 5-7 whirl, 8 release
//   slingstone                      the stone a slinger throws (2 frames)
//   sage      v: water|fire|leaf|wind      0-1 idle, 2-5 walk, 6-8 cast
//   sageword  v: (book)             a word torn from a magic book, fluttering (4 frames)
//   sagespell v: (book)             what the word becomes: water orb, fireball, thorn vine, gust (3 frames)
//   cbat      v: small|brood|matriarch     0-3 flap, 4 dive, 5 hanging from the ceiling
(function (RW) {
  const A = RW.art, D = A.drawers; const { px, rect, line } = A; const mk = A.canvas;

  // ======================= HELPERS =======================
  // filled disc with a float radius
  const disc = (g, cx, cy, r, c) => { const R = Math.ceil(r); for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (x * x + y * y <= r * r + 0.35) px(g, Math.round(cx + x), Math.round(cy + y), c); };
  // polygon fill (scanline through pixel centers)
  const poly = (g, pts, c) => {
    let y0 = Infinity, y1 = -Infinity; pts.forEach((p) => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    g.fillStyle = c;
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); if (xb > xa) g.fillRect(xa, y, xb - xa, 1); }
    }
  };
  // quadratic bezier point, and a tapering stroke along one (color may be a function of t)
  const qb = (p0, p1, p2, t) => [(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
  const stroke = (g, p0, p1, p2, r0, r1, col, steps) => { const n = steps || 40; for (let i = 0; i <= n; i++) { const t = i / n; const [x, y] = qb(p0, p1, p2, t); disc(g, x, y, r0 + (r1 - r0) * t, typeof col === 'function' ? col(t) : col); } };
  const hexOf = (d, i) => '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
  // recolor an already drawn canvas: fn(x, y, color, colorAt) returns a new color or null
  const recolor = (c, fn) => {
    const W = c.width, H = c.height, d = c.ctx.getImageData(0, 0, W, H).data;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H || d[(y * W + x) * 4 + 3] < 128 ? null : hexOf(d, (y * W + x) * 4));
    const ch = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const col = at(x, y); if (!col) continue; const n = fn(x, y, col, at); if (n) ch.push([x, y, n]); }
    ch.forEach(([x, y, n]) => px(c.ctx, x, y, n));
    return c;
  };
  // crop every frame of a set to the box that holds all of them, so the set shares one size and anchor
  const fitFrames = (frames) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    frames.forEach((f) => { const d = f.ctx.getImageData(0, 0, f.width, f.height).data; for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) if (d[(y * f.width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } });
    if (x1 < 0) return frames;
    return frames.map((f) => { const c = mk(x1 - x0 + 1, y1 - y0 + 1); c.ctx.drawImage(f, -x0, -y0); return c; });
  };
  const flipV = (cv) => { const c = mk(cv.width, cv.height); c.ctx.translate(0, cv.height); c.ctx.scale(1, -1); c.ctx.drawImage(cv, 0, 0); return c; };
  // a soft glow in pixel-art style: a checkered ring of solid pixels (drawn after the outline)
  const glowRing = (g, cx, cy, r0, r1, col, seed) => { for (let y = -Math.ceil(r1); y <= Math.ceil(r1); y++) for (let x = -Math.ceil(r1); x <= Math.ceil(r1); x++) { const d = Math.hypot(x, y); if (d >= r0 && d <= r1 && ((x + y + (seed || 0)) & 1) === 0) px(g, Math.round(cx + x), Math.round(cy + y), col); } };
  const sparkle = (g, x, y, col, big) => { px(g, x, y, '#ffffff'); px(g, x - 1, y, col); px(g, x + 1, y, col); px(g, x, y - 1, col); px(g, x, y + 1, col); if (big) { px(g, x - 2, y, col); px(g, x + 2, y, col); px(g, x, y - 2, col); px(g, x, y + 2, col); } };

  // ---------- fuzzy helpers ----------
  const OUT = '#1a100a'; // the fuzzy outline color from art2.js
  // the colors a fuzzy's fur is made of, so paint goes on fur and never over eyes, mouth or cheeks
  const furSet = (look) => { const C = A.furColors(look); const mid = RW.mix(C.base, C.dark, 0.5); return { C, mid, set: new Set([C.base, C.dark, C.light, mid, RW.mix(C.light, '#ffffff', 0.25)]), muzzle: RW.mix(C.base, C.light, 0.3) }; };
  // the body center of a fuzzy frame (matches art2.js fuzzyFrame)
  const fuzzyCenter = (frame) => { const bob = frame >= 1 && frame <= 4 && frame % 2 ? -1 : 0; return { cx: 14, cy: 16 + bob + (frame === 5 ? -1 : 0) }; };
  const nearFeature = (x, y, at, F) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = at(x + dx, y + dy); if (c && c !== OUT && !F.set.has(c) && c !== F.muzzle) return true; } return false; };

  // ======================= FUZZY CAVALRY =======================
  // Riders are ordinary fuzzies. Light cavalry ride ridgeback lizards with spears; heavy cavalry wear
  // iron helmets and ride shellback turtles with long barbed lances.
  const SADDLE = { cloth: '#a8382a', hi: '#d0583a', dk: '#6a1e16', trim: '#e8b840', strap: '#4a2a18' };
  const RIDER_LOOK = { fur: 'brown', hue: 0, tone: 0, fluff: 'round', ears: 'none', eyes: 'big', mouth: 'smile', extra: 'none' };
  // a fuzzy rider, with an iron kettle helmet for heavy cavalry
  const riderFrame = (look, frame, helm) => {
    const c = A.fuzzyFrame(look, frame); if (!helm) return c;
    const { cx, cy } = fuzzyCenter(frame); const F = furSet(look); const g = c.ctx;
    recolor(c, (x, y, col) => {
      if (col === OUT || !F.set.has(col)) return null; const v = y - cy, u = x - cx;
      if (v >= -6) return null; if (v === -7) return '#5a5e68';
      return v < -9 ? (u < -1 ? '#c8ccd4' : '#9a9ea8') : u < -3 ? '#a8acb4' : u > 4 ? '#6e727c' : '#8a8e98';
    });
    rect(g, cx - 11, cy - 6, 23, 1, '#4a4e58'); rect(g, cx - 10, cy - 6, 20, 1, '#8a8e98'); px(g, cx - 10, cy - 6, '#c8ccd4');
    rect(g, cx - 1, cy - 14, 2, 2, '#8a8e98'); px(g, cx - 1, cy - 14, '#c8ccd4'); px(g, cx, cy - 15, '#9a9ea8'); // spike
    [-6, -2, 2, 6].forEach((dx) => px(g, cx + dx, cy - 8, '#d8dce2')); // rivets
    return A.outline(c, OUT);
  };
  // a spear or lance, drawn BEHIND the rider so it looks gripped, not stuck through them
  const spear = (g, x0, y0, x1, y1, kind) => {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    line(g, x0, y0, x1, y1, '#7a5230');
    for (let k = 3; k < L - 2; k += 4) px(g, x0 + ux * k, y0 + uy * k, '#5a3a20'); // grain
    if (kind === 'barbed') {
      // the three-pronged head from the turtle sketch
      line(g, x1, y1, x1 + ux * 5, y1 + uy * 5, '#c8ccd4'); px(g, x1 + ux * 5, y1 + uy * 5, '#ffffff');
      line(g, x1 + ux, y1 + uy, x1 + ux * 4 - uy * 3, y1 + uy * 4 + ux * 3, '#a0a4ac');
      line(g, x1 + ux, y1 + uy, x1 + ux * 4 + uy * 3, y1 + uy * 4 - ux * 3, '#a0a4ac');
    } else {
      // a leaf-shaped iron point with a red tassel
      disc(g, x1 + ux * 2, y1 + uy * 2, 1.2, '#8a8e98'); line(g, x1, y1, x1 + ux * 5, y1 + uy * 5, '#c8ccd4'); px(g, x1 + ux * 5, y1 + uy * 5, '#eef2f8');
      px(g, x1 - ux - uy, y1 - uy + ux, SADDLE.cloth); px(g, x1 - ux * 2 - uy * 2, y1 - uy * 2 + ux * 2, SADDLE.hi); px(g, x1 - ux - uy * 2, y1 - uy + ux * 2, SADDLE.dk);
    }
  };

  // ---- Ridgeback lizard (light cavalry) ----
  // Long and low on upright legs, a flat head with a dark stripe through the eye, a crest of three
  // spikes behind the head, little spikes down the back, and a long tail that curls up behind.
  const LIZ = { base: '#7a9a44', light: '#a2c260', dark: '#4e6a2a', deep: '#34481c', belly: '#d8d098', bellyDk: '#aca474', spike: '#c8dc8c', claw: '#ece4cc', eye: '#ffd23a' };
  function lizard(frame, rider) {
    const W = 92, H = 70; const c = mk(W, H), g = c.ctx; const L = LIZ;
    const run = frame >= 1 && frame <= 4, thrust = frame === 5;
    const ph = run ? ((frame - 1) / 4) * Math.PI * 2 : 0;
    const bob = run ? (frame % 2 ? -1 : 0) : 0;
    const GY = 64, BX = 40, RX = 19, RY = 6.5, by = 48 + bob;
    // --- legs ---
    const leg = (hipX, phase, far) => {
      const s = run ? Math.sin(ph + phase) : 0, lift = run ? Math.max(0, Math.cos(ph + phase)) * 2.5 : 0;
      const col = far ? L.dark : L.base, hi = far ? L.dark : L.light, dk = far ? L.deep : L.dark;
      const knee = [hipX + 2.5 + s * 1.5, by + 7 - lift * 0.6], foot = [hipX + s * 3.5, GY - 2 - lift];
      stroke(g, [hipX, by + 2], [hipX + 1.5, by + 5], knee, 2.8, 2.0, col, 12);
      stroke(g, knee, [(knee[0] + foot[0]) / 2 - 1, (knee[1] + foot[1]) / 2], foot, 1.9, 1.5, col, 12);
      px(g, knee[0] - 1, knee[1] - 1, hi);
      const fx = Math.round(foot[0]), fy = Math.round(foot[1]);
      rect(g, fx - 2, fy, 6, 2, col); px(g, fx - 2, fy, hi); px(g, fx - 1, fy + 1, dk);
      px(g, fx + 4, fy + 1, L.claw); px(g, fx + 2, fy + 2, L.claw); px(g, fx, fy + 2, L.claw);
    };
    leg(BX - 10, Math.PI, true); leg(BX + 12, 0, true);
    // --- tail: sweeps back, then curls up high behind the rider ---
    const sw = run ? Math.round(Math.sin(ph) * 1.5) : 0;
    const t1 = [[BX - RX + 3, by - 1], [BX - RX - 12, by + 5], [8, by - 6]], t2 = [[8, by - 6], [3 + sw, by - 18], [10 + sw, by - 24]];
    stroke(g, ...t1, 3.6, 2.2, L.base, 40); stroke(g, ...t2, 2.2, 0.6, L.base, 40);
    for (let k = 0; k <= 30; k++) { const t = k / 30; const [x, y] = qb(...t1, t); px(g, x, y - 2.5 + t * 0.6, L.light); px(g, x + 0.5, y + 2.6 - t * 0.6, L.dark); }
    for (let k = 0; k <= 30; k++) { const t = k / 30; const [x, y] = qb(...t2, t); if (t < 0.8) px(g, x - 1.5 + t, y, L.light); }
    for (let k = 1; k < 4; k++) { const [x, y] = qb(...t1, k / 4); line(g, x, y - 2, x + 1, y + 1, L.dark); }
    for (let k = 1; k < 4; k++) { const [x, y] = qb(...t2, k / 4.5); line(g, x - 1, y, x + 1, y, L.dark); }
    // --- body ---
    for (let y = -7; y <= 7; y++) for (let x = BX - RX - 1; x <= BX + RX + 1; x++) {
      const u = (x - BX) / RX, v = y / RY; if (u * u + v * v > 1) continue;
      let col = v < -0.45 ? L.light : v > 0.62 ? L.belly : v > 0.42 ? L.bellyDk : L.base;
      if (v < 0.3 && v > -0.85 && (x + Math.round(v * 2)) % 6 === 0) col = L.dark; // bands down the back
      if (v > -0.45 && v < -0.3 && (x & 1)) col = L.base;
      px(g, x, by + y, col);
    }
    // little spikes along the spine
    for (let x = BX - RX + 5; x <= BX + RX - 4; x += 4) { const t = Math.round(by - RY * Math.sqrt(Math.max(0, 1 - ((x - BX) / RX) ** 2))); px(g, x, t - 1, L.dark); px(g, x + 1, t - 1, L.dark); px(g, x + 1, t - 2, L.spike); }
    // --- spear (behind the rider) and rider ---
    let r = null, rx = 0, ry = 0;
    if (rider) {
      r = riderFrame(rider.look, thrust ? 6 : 0, false); rx = BX - 15; ry = by - 31;
      const ax = rx + r.hand.x, ay = ry + r.hand.y;
      if (thrust) spear(g, ax - 14, ay + 1, ax + 17, ay - 1); else spear(g, ax - 6, ay + 9, ax + 9, ay - 13);
      g.drawImage(r, rx, ry);
      // saddle blanket, fringe and girth strap
      const sx = BX - 9, sy = by - RY - 2;
      rect(g, sx, sy, 19, 4, SADDLE.cloth); rect(g, sx, sy, 19, 1, SADDLE.hi); rect(g, sx + 1, sy + 3, 17, 1, SADDLE.dk);
      rect(g, sx - 1, sy + 1, 1, 3, SADDLE.dk); rect(g, sx + 19, sy + 1, 1, 3, SADDLE.dk);
      for (let k = 0; k < 19; k += 2) px(g, sx + k, sy + 4, SADDLE.trim);
      line(g, BX, sy + 4, BX, by + RY - 1, SADDLE.strap); px(g, BX, by + 2, SADDLE.trim);
    }
    // --- neck, crest and head ---
    const hx = BX + RX + 7 + (thrust ? 1 : 0), hy = by - 6;
    disc(g, BX + RX - 1, by - 2, 5.2, L.base); disc(g, BX + RX - 2, by - 4, 2.6, L.light); line(g, BX + RX - 4, by + 3, BX + RX + 3, by + 1, L.belly);
    [[-8, 7], [-4, 6], [0, 4]].forEach(([dx, h]) => { for (let k = 0; k < h; k++) { const w = Math.max(0, Math.round((h - k) / 2.6)); for (let j = -w; j <= w; j++) px(g, hx + dx + j - Math.round(k * 0.45), hy - 3 - k, j < 0 ? L.dark : L.deep); px(g, hx + dx - w - Math.round(k * 0.45), hy - 3 - k, L.base); } });
    for (let y = -5; y <= 4; y++) for (let x = -7; x <= 12; x++) {
      const u = x / (x > 0 ? 12.5 : 7.5), v = y / (y < 0 ? 4.6 : 3.8); if (u * u + v * v > 1) continue;
      px(g, hx + x, hy + y, v < -0.45 ? L.light : v > 0.5 ? L.belly : L.base);
    }
    // eye stripe, eye, nostril, mouth
    line(g, hx - 7, hy - 1, hx + 8, hy - 1, L.deep); line(g, hx - 6, hy, hx - 1, hy, L.dark);
    rect(g, hx + 2, hy - 3, 3, 3, L.deep); px(g, hx + 3, hy - 2, L.eye); px(g, hx + 4, hy - 2, '#1a120a'); px(g, hx + 2, hy - 3, L.dark);
    px(g, hx + 11, hy - 2, L.deep);
    if (thrust) { poly(g, [[hx + 3, hy + 1], [hx + 13, hy - 1], [hx + 13, hy + 4], [hx + 4, hy + 3]], '#7a2a2a'); [5, 8, 11].forEach((x) => { px(g, hx + x, hy + 1, '#f0e8d8'); px(g, hx + x - 1, hy + 3, '#f0e8d8'); }); }
    else { line(g, hx + 3, hy + 2, hx + 11, hy + 1, L.deep); px(g, hx + 2, hy + 3, L.deep); }
    leg(BX - 14, 0, false); leg(BX + 8, Math.PI, false);
    return A.outline(c, '#101808');
  }
  D.lizardrider = (o) => fitFrames([0, 1, 2, 3, 4, 5].map((f) => lizard(f, { look: (o && o.look) || RIDER_LOOK })));

  // ======================= JUNGLE SLINGERS =======================
  // Fuzzies of the new jungle biome. Each tribe paints its fur with its own design (curved bands,
  // blocky glyphs, a square spiral, or zigzags) and they fight with slings.
  RW.SLINGER_TRIBES = {
    bands: { name: 'Bandfur', look: { fur: 'honey', hue: 0, tone: 0, fluff: 'round', ears: 'none', eyes: 'big', mouth: 'smile', extra: 'none' }, ink: '#2a1a10', accent: '#c8402a' },
    glyph: { name: 'Glyphfur', look: { fur: 'cream', hue: 0, tone: 0, fluff: 'shaggy', ears: 'none', eyes: 'big', mouth: 'smile', extra: 'leaf' }, ink: '#24160e', accent: '#2a9a90' },
    key: { name: 'Spiralfur', look: { fur: 'moss', hue: 0, tone: 0.03, fluff: 'round', ears: 'none', eyes: 'big', mouth: 'fangs', extra: 'none' }, ink: '#1c1a0e', accent: '#e8c040' },
    zigzag: { name: 'Zigfur', look: { fur: 'black', hue: 0, tone: 0.03, fluff: 'spiky', ears: 'none', eyes: 'big', mouth: 'open', extra: 'none' }, ink: '#e8dcc0', accent: '#e07a32' },
  };
  const GLYPHS = [['XXXX', 'X..X', 'X.XX', 'X...'], ['XX.X', '.X.X', '.XXX', '...X'], ['XXX.', '..X.', 'X.XX', 'X...'], ['X.XX', 'X..X', 'XX.X', '...X']];
  // a true square spiral, lines 3 pixels apart; each pixel remembers which side of the spiral it's on
  const SPIRAL = (() => { const m = new Map(); let x = 0, y = 0, d = 0, len = 1; const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]; m.set('0,0', 0); for (let turn = 0; turn < 16; turn++) { for (let k = 0; k < len * 3; k++) { x += dirs[d][0]; y += dirs[d][1]; m.set(x + ',' + y, turn); } d = (d + 1) % 4; if (turn & 1) len++; } return m; })();
  // which paint a pixel gets: 0 none, 1 ink, 2 accent
  const patternAt = (kind, u, v) => {
    if (kind === 'bands') { const w = v + Math.round(u * u * 0.045); const m = (((w + 2) % 8) + 8) % 8; return m === 0 || m === 3 ? 1 : m === 1 || m === 2 ? 2 : 0; }
    if (kind === 'zigzag') { const tri = Math.abs((((v % 6) + 6) % 6) - 3); const k = u + tri + 40; return k % 5 === 0 ? (Math.floor(k / 5) & 1 ? 2 : 1) : 0; }
    if (kind === 'glyph') {
      const gx = Math.floor((u + 20) / 5), gy = Math.floor((v + 21) / 5), lx = (u + 20) % 5, ly = (v + 21) % 5;
      if (lx === 4 || ly === 4) return 0; const G = GLYPHS[Math.floor(RW.hash2(gx, gy, 41) * 4)];
      if (G[ly][lx] !== 'X') return 0; return RW.hash2(gx, gy, 7) > 0.7 && (Math.abs(u - 2) > 7 || v > 4) ? 2 : 1;
    }
    if (kind === 'key') { const t = SPIRAL.get((u + 4) + ',' + (v - 3)); return t == null ? 0 : t % 4 === 3 ? 2 : 1; }
    return 0;
  };
  const paintFur = (c, look, frame, kind, ink, accent) => {
    const F = furSet(look); const { cx, cy } = fuzzyCenter(frame);
    recolor(c, (x, y, col, at) => {
      if (col === OUT || !F.set.has(col)) return null;
      const u = x - cx, v = y - cy; if (u * u + v * v > 13 * 13 || v > 11) return null;
      if (nearFeature(x, y, at, F)) return null;
      const p = patternAt(kind, u, v); if (!p) return null;
      const k = col === F.C.dark || col === F.mid ? -0.22 : col === F.C.light ? 0.12 : 0; // keep the fur's light and shadow
      return RW.shade(p === 1 ? ink : accent, k);
    });
    return c;
  };
  const SLING = { cord: '#dcc89c', pouch: '#6a4024', pouchHi: '#9a6a3a', stone: '#a8a296', stoneHi: '#d8d2c4', stoneDk: '#6e6a62' };
  const slingPouch = (g, x, y, full) => { rect(g, x - 1, y, 4, 2, SLING.pouch); px(g, x - 1, y, SLING.pouchHi); px(g, x + 2, y + 1, '#4a2a14'); if (full) { rect(g, x, y - 1, 2, 1, SLING.stone); px(g, x, y - 1, SLING.stoneHi); } };
  function slinger(kind, frame) {
    const T = RW.SLINGER_TRIBES[kind] || RW.SLINGER_TRIBES.bands;
    const W = 60, H = 50, ox = 12, oy = 16; const c = mk(W, H), g = c.ctx;
    // frames: 0 idle, 1-4 walk, 5-7 whirl, 8 release
    const ff = frame <= 4 ? frame : 6; const fz = paintFur(A.fuzzyFrame(T.look, ff), T.look, ff, kind, T.ink, T.accent);
    const hx = ox + fz.hand.x, hy = oy + fz.hand.y;
    const fx = []; // motion effects, drawn after the outline
    if (frame >= 5 && frame <= 7) {
      // whirling the sling over the head
      const ccx = hx - 4, ccy = hy - 10, R = 9, a = [-0.3, 0.7, 1.7][frame - 5] * Math.PI;
      g.drawImage(fz, ox, oy);
      const pxx = ccx + Math.cos(a) * R, pyy = ccy + Math.sin(a) * R * 0.5;
      line(g, hx, hy - 1, pxx, pyy, SLING.cord); slingPouch(g, Math.round(pxx) - 1, Math.round(pyy), true);
      for (let k = 2; k < 16; k++) { const aa = a - k * 0.2; fx.push([ccx + Math.cos(aa) * R, ccy + Math.sin(aa) * R * 0.5, k < 7 ? '#ffffff' : '#c8c0b0', k & 1]); }
    } else if (frame === 8) {
      g.drawImage(fz, ox, oy);
      line(g, hx, hy - 1, hx + 8, hy - 7, SLING.cord); slingPouch(g, hx + 8, hy - 8, false);
      disc(g, hx + 18, hy - 12, 1.4, SLING.stone); px(g, hx + 17, hy - 13, SLING.stoneHi); px(g, hx + 19, hy - 11, SLING.stoneDk);
      for (let k = 0; k < 6; k++) fx.push([hx + 11 + k, hy - 9 - k * 0.5, '#ffffff', k & 1]);
    } else {
      // hanging from the paw, swinging as they walk
      g.drawImage(fz, ox, oy);
      const sw = frame === 0 ? 0 : [1, 2, 1, 0][frame - 1];
      stroke(g, [hx + 1, hy], [hx + 3, hy + 2], [hx + 2 + sw, hy + 5], 0.3, 0.3, SLING.cord, 12);
      slingPouch(g, hx + 1 + sw, hy + 6, true);
    }
    A.outline(c, OUT);
    fx.forEach(([x, y, col, skip]) => { if (!skip) px(g, x, y, col); });
    return c;
  }
  D.slinger = (o) => fitFrames([0, 1, 2, 3, 4, 5, 6, 7, 8].map((f) => slinger((o && o.v) || 'bands', f)));

  // ======================= SAGES =======================
  // Fuzzies with magic. A sage tears words out of a magic book and the words become real, but only
  // things written in that book: a water book can only make water. Each wears a striped head wrap in
  // the color of its book and carries a forked staff holding an orb.
  RW.SAGE_BOOKS = {
    water: { name: 'Water', cloth: '#2a5a9a', hi: '#4a84c4', dk: '#183a6a', orb: '#7fd0ff', glow: '#c8f0ff', cover: '#1f4a80', ink: '#2a5a9a', look: { fur: 'grey', hue: 0, tone: 0.04, fluff: 'shaggy', ears: 'none', eyes: 'sleepy', mouth: 'smile', extra: 'none' } },
    fire: { name: 'Fire', cloth: '#a8322a', hi: '#d8583a', dk: '#6a1a14', orb: '#ffb347', glow: '#fff0a0', cover: '#7a1e18', ink: '#a8322a', look: { fur: 'ginger', hue: 0, tone: 0, fluff: 'round', ears: 'none', eyes: 'big', mouth: 'smile', extra: 'none' } },
    leaf: { name: 'Leaf', cloth: '#3a7a34', hi: '#5ca24c', dk: '#24501f', orb: '#8be04a', glow: '#e0ffb0', cover: '#2a5a24', ink: '#2a6a24', look: { fur: 'honey', hue: 0, tone: 0, fluff: 'round', ears: 'none', eyes: 'big', mouth: 'smile', extra: 'none' } },
    wind: { name: 'Wind', cloth: '#d4d0c4', hi: '#f2eee4', dk: '#9a968a', orb: '#e8f4ff', glow: '#ffffff', cover: '#5a6a8a', ink: '#5a6a8a', look: { fur: 'cream', hue: 0, tone: -0.05, fluff: 'shaggy', ears: 'none', eyes: 'happy', mouth: 'smile', extra: 'none' } },
  };
  const STAFF = { wood: '#6a4628', woodHi: '#946a3e', woodDk: '#44301c' };
  const PAPER = '#f4ecd4', PAPER_DK = '#d8ccae';
  // a fuzzy wearing a striped head wrap (the "pot" shape from the sketch)
  const sageFuzzy = (B, ff) => {
    const fz = A.fuzzyFrame(B.look, ff); const { cx, cy } = fuzzyCenter(ff); const g = fz.ctx;
    for (let y = -14; y <= -5; y++) for (let x = -11; x <= 11; x++) {
      const u = x / 10.6, v = (y + 8) / 6.4; if (y < -8 ? u * u + v * v > 1 : Math.abs(x) > 10 - (y === -5 ? 1 : 0)) continue;
      const stripe = (y & 1) === 0;
      let col = x > 5 ? (stripe ? B.cloth : B.dk) : x < -6 ? (stripe ? B.hi : B.cloth) : stripe ? B.hi : B.cloth;
      if (y === -14 || (y === -13 && Math.abs(x) > 5)) col = B.dk; // the top coil
      if (y === -5) col = B.dk;
      px(g, cx + x, cy + y, col);
    }
    rect(g, cx - 5, cy - 13, 10, 1, B.cloth); // the dent in the top of the wrap
    // brooch with a gem on the front
    rect(g, cx + 4, cy - 10, 3, 3, '#c8a040'); px(g, cx + 5, cy - 9, B.orb); px(g, cx + 4, cy - 10, '#f0d070');
    return A.outline(fz, OUT);
  };
  // a page torn from the book: 0 flat, 1 tilted, 2 edge-on (fluttering); lit pages glow
  const page = (g, x, y, k, B, lit) => {
    x = Math.round(x); y = Math.round(y); const p = lit ? B.glow : PAPER, ink = lit ? B.orb : B.ink;
    const v = ((k % 3) + 3) % 3;
    if (v === 0) { rect(g, x, y, 5, 4, p); px(g, x + 4, y, PAPER_DK); line(g, x + 1, y + 1, x + 3, y + 1, ink); px(g, x + 1, y + 2, ink); px(g, x + 3, y + 2, ink); }
    else if (v === 1) { rect(g, x, y + 1, 4, 3, p); rect(g, x + 1, y, 4, 3, p); px(g, x + 4, y, PAPER_DK); line(g, x + 1, y + 1, x + 3, y + 1, ink); px(g, x + 2, y + 2, ink); }
    else { rect(g, x + 1, y, 2, 4, p); px(g, x + 2, y + 1, ink); px(g, x + 1, y + 3, PAPER_DK); }
  };
  function sage(el, frame) {
    const B = RW.SAGE_BOOKS[el] || RW.SAGE_BOOKS.water;
    const W = 60, H = 60, ox = 14, oy = 24; const c = mk(W, H), g = c.ctx;
    // frames: 0-1 idle, 2-5 walk, 6-8 cast
    const cast = frame >= 6, walkF = frame >= 2 && frame <= 5 ? frame - 1 : 0, idleB = frame === 1 ? 1 : 0;
    const ff = cast ? 7 : walkF; // fuzzy frame 7 raises both paws
    const { cx, cy } = fuzzyCenter(ff); const F = furSet(B.look);
    // the tail of the wrap hangs down the back
    const sway = idleB || walkF % 2 ? 1 : 0;
    stroke(g, [ox + cx - 9, oy + cy - 8], [ox + cx - 13 - sway, oy + cy - 4], [ox + cx - 13 - sway, oy + cy + 1], 1.2, 1, B.dk, 14);
    stroke(g, [ox + cx - 9, oy + cy - 9], [ox + cx - 12 - sway, oy + cy - 5], [ox + cx - 12 - sway, oy + cy], 0.5, 0.5, B.cloth, 14);
    const fz = sageFuzzy(B, ff); g.drawImage(fz, ox, oy);
    const hx = ox + fz.hand.x, hy = oy + fz.hand.y;
    // --- forked staff with an orb (from the sketch) ---
    const sx = hx + 1, sTop = hy - (cast ? 20 : 16), sBot = hy + (cast ? 8 : 12);
    for (let y = sTop; y <= sBot; y++) { px(g, sx, y, (y & 3) === 1 ? STAFF.woodDk : STAFF.wood); px(g, sx - 1, y, y % 5 === 0 ? STAFF.wood : STAFF.woodHi); }
    stroke(g, [sx - 1, sTop], [sx - 4, sTop - 1], [sx - 3, sTop - 6], 0.5, 0.5, STAFF.woodHi, 12); px(g, sx - 2, sTop - 7, STAFF.wood);
    stroke(g, [sx, sTop], [sx + 3, sTop - 1], [sx + 2, sTop - 6], 0.5, 0.5, STAFF.wood, 12); px(g, sx + 1, sTop - 7, STAFF.woodDk);
    const oxr = sx - 0.5, oyr = sTop - 3.5;
    disc(g, oxr, oyr, 1.8, B.orb); px(g, Math.round(oxr) - 1, Math.round(oyr) - 1, B.glow); px(g, Math.round(oxr) + 1, Math.round(oyr) + 1, RW.shade(B.orb, -0.3));
    rect(g, hx, hy, 2, 2, F.mid); px(g, hx, hy, F.C.base); // paw wrapped round the staff
    // --- the open book in the other paw ---
    const bx = ox + cx - 18, byy = oy + cy + (cast ? -4 : 1) - idleB;
    rect(g, bx, byy, 11, 7, B.cover); rect(g, bx + 1, byy - 1, 4, 7, PAPER); rect(g, bx + 6, byy - 1, 4, 7, PAPER_DK); line(g, bx + 5, byy - 1, bx + 5, byy + 6, B.cover);
    for (let k = 0; k < 3; k++) { line(g, bx + 2, byy + k * 2, bx + 3 + (k & 1), byy + k * 2, B.ink); line(g, bx + 7, byy + k * 2, bx + 8 + ((k + 1) & 1), byy + k * 2, B.ink); }
    if (cast) { rect(g, bx + 2, byy + 3, 2, 2, PAPER); } // a gap where a word was torn out
    rect(g, bx + 9, byy + 2, 3, 3, F.mid); px(g, bx + 9, byy + 2, F.C.base); // paw holding the book
    // --- words: torn-out pages drift around the sage, or stream from the book into the orb ---
    const after = [];
    if (!cast) {
      const t = frame <= 1 ? frame : walkF;
      [[ox + cx - 20, oy + cy - 14, 0], [ox + cx - 11, oy + cy - 22, 1], [ox + cx - 1, oy + cy - 21, 2]].forEach(([x, y, k]) => page(g, x + ((k + t) & 1), y - ((k + t + 1) & 1), k + t, B, false));
    } else {
      const n = 5; for (let k = 0; k < n; k++) {
        const t = (k / n + (frame - 6) / (n * 3)) % 1; const [x, y] = qb([bx + 3, byy - 4], [bx - 2, sTop - 14], [oxr - 2, oyr - 2], t);
        page(g, x, y, k + frame, B, t > 0.45); if (t > 0.45) after.push([Math.round(x) + 2, Math.round(y) + 2]);
      }
    }
    A.outline(c, OUT);
    // glows go on after the outline, as solid pixels
    glowRing(g, oxr, oyr, 2.6, cast ? 4.5 + (frame - 6) : 3.2, B.glow, frame);
    if (cast) { sparkle(g, Math.round(oxr), Math.round(oyr), B.orb, frame === 8); after.forEach(([x, y], i) => { if ((i + frame) & 1) px(g, x - 3, y + 2, B.glow); }); }
    return c;
  }
  D.sage = (o) => fitFrames([0, 1, 2, 3, 4, 5, 6, 7, 8].map((f) => sage((o && o.v) || 'water', f)));
  // a single word torn from a book, fluttering through the air (projectile)
  A.h4 = A.h4 || { disc, poly, qb, stroke, recolor, fitFrames, flipV, glowRing, sparkle, furSet, fuzzyCenter, OUT };
})(window.RW);
// ====================== TANGLEHOLD: the jungle village ======================
// In the west of the Tanglewood Jungle on Fuzzy World, between the Tall Peaks and Gnarlroot's Hollow.
//  * The Word Temple: a stepped temple (from the brothers' sketch) with a swirling old door on top and the sages'
//    library inside. Four sages live there, one for each Book: Water, Fire, Leaf and Wind.
//  * Stilt huts joined by a rope bridge, a warm mud pool that heals you, and a lizard pen for the light cavalry.
//  * Slinger tribes: Bandfur, Glyphfur, Spiralfur and Zigfur fuzzies, each with fur painted in their own design.
//  * The Giant Strangler tree west of the village: a climbable giant with canopy platforms and a rope.
//  * Quests: Chief Tassel's warthog hides, and Old Puddle's torn page (it blew to the top of the giant tree).
//  * The Easter egg: once the page is back, each sage tells you one word. Say all four words in chat at the top
//    of the Word Temple and the old door turns gold and opens the vault under the library.
(function (RW) {
  'use strict';
  const A = RW.art, E = RW.ent, U = RW.ui, P = RW.player, TS = RW.TILE, R = RW.register;
  if (!P || !E || !RW.WORLDS.fuzzy) return;
  const def = RW.WORLDS.fuzzy;
  const VX0 = 570, VX1 = 642, TX = 609; // village span and the temple's middle
  const TREE = 556;                       // the giant tree
  let JY = 108;                            // village ground (set when the world is made)

  // ---------- items and species ----------
  A.iconExtra.page = (g, a, b) => { A.rect(g, 4, 3, 8, 10, a); A.rect(g, 4, 3, 8, 1, '#ffffff'); A.rect(g, 6, 6, 4, 1, b); A.rect(g, 6, 8, 3, 1, b); A.rect(g, 6, 10, 4, 1, b); A.px(g, 11, 12, '#c8bc9a'); A.px(g, 10, 13, '#c8bc9a'); };
  R.item({ id: 'torn_page', name: 'Torn Page', kind: 'material', stack: 1, icon: { s: 'page', a: '#f4ecd4', b: '#9ab8e8' }, desc: 'A page torn from the Book of Wind. The words on it shift when you look away. Old Puddle in Tanglehold wants it back.' });
  const D = A.drawers, T4 = RW.SLINGER_TRIBES || {}, SB = RW.SAGE_BOOKS || {};
  D.jv_slinger = (o) => { const f = D.slinger(o); return [f[0], f[0], f[0], f[5], f[6], f[7]]; };
  D.jv_sage = (o) => { const f = D.sage(o); return [f[0], f[1]]; };
  D.jv_lizard = () => { const f = D.lizardrider({}); return [f[0], f[1], f[0], f[3]]; };
  const NPC = [
    // id, drawer, variant, name, size [w, h], blurb
    ['jv_chief', 'jv_slinger', 'bands', 'Chief Tassel', [16, 24], 'Chief of Tanglehold and of the Bandfur tribe. Can hit a berry off a branch from forty paces.'],
    ['jv_glyph', 'jv_slinger', 'glyph', 'Scribbles', [16, 24], 'A Glyphfur slinger. Every glyph in her fur is a story, and she will tell you all of them.'],
    ['jv_spiral', 'jv_slinger', 'key', 'Coil', [16, 24], 'A Spiralfur slinger. Quiet. Watches the jungle from the hut bridge.'],
    ['jv_zig', 'jv_slinger', 'zigzag', 'Zigg', [16, 24], 'A Zigfur slinger. The loudest fuzzy in the jungle.'],
    ['jv_sage_water', 'jv_sage', 'water', 'Old Puddle', [16, 24], 'The Water Sage. Keeper of the Book of Water, and the oldest of the four.'],
    ['jv_sage_fire', 'jv_sage', 'fire', 'Ember', [16, 24], 'The Fire Sage. Keeps her book in a clay box, just in case.'],
    ['jv_sage_leaf', 'jv_sage', 'leaf', 'Sprig', [16, 24], 'The Leaf Sage. Talks to the temple vines. Sometimes they answer.'],
    ['jv_sage_wind', 'jv_sage', 'wind', 'Gale', [16, 24], 'The Wind Sage. Lost a page to the wind once, which the others will not let him forget.'],
    ['jv_scout', 'jv_lizard', null, 'Scout Quickfoot', [40, 30], 'Light cavalry. Rides a ridgeback lizard and knows every trail in the Tanglewood.'],
  ];
  NPC.forEach(([id, draw, v, name, , blurb]) => R.species({ id, type: 'fuzzies', name, world: 'fuzzy', role: 'npc', status: 'active', art: { draw, v }, blurb }));

  // ---------- building the village into Fuzzy World ----------
  const baseGen = def.generate;
  def.generate = function () {
    const gen = baseGen.apply(this, arguments);
    try { build(gen); } catch (e) { console.warn('tanglehold', e); }
    return gen;
  };
  function build(gen) {
    const T = RW.T, WL = RW.W, W = gen.W, fg = gen.fg, bg = gen.bg, H = fg.length / W, M = gen.meta, surf = M.surf;
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H && T[t] != null) fg[y * W + x] = T[t]; };
    const wall = (x, y, w) => { if (x >= 0 && y >= 0 && x < W && y < H) bg[y * W + x] = w ? (WL[w] || 0) : 0; };
    const get = (x, y) => fg[y * W + x];
    let s = 0; for (let x = VX0; x <= VX1; x++) s += surf[x]; JY = Math.round(s / (VX1 - VX0 + 1));
    // flatten: clear the air above, fill mud below, jungle grass on top (ease the edges into the land around)
    for (let x = VX0 - 6; x <= VX1 + 6; x++) {
      const edge = x < VX0 ? (VX0 - x) / 6 : x > VX1 ? (x - VX1) / 6 : 0, gy = Math.round(JY + (surf[x] - JY) * edge);
      for (let y = gy - 34; y < gy; y++) { set(x, y, 'air'); wall(x, y, 0); }
      for (let y = gy; y < gy + 8; y++) { if (fg[y * W + x] === T.air || y === gy) set(x, y, y === gy ? 'jgrass' : 'mud'); wall(x, y, 'mud'); }
      surf[x] = gy;
    }
    // west gate and east gate: torches and banners
    [[VX0, 'banner_f'], [VX0 + 3, 'torchwall'], [VX1, 'banner_f'], [VX1 - 3, 'torchwall']].forEach(([x, t]) => set(x, JY - 2, t));
    // the lizard pen: a hide roof on posts, with a hitching rail
    for (let y = JY - 5; y < JY; y++) { set(VX0 + 6, y, 'trunk'); set(VX0 + 17, y, 'trunk'); }
    for (let x = VX0 + 5; x <= VX0 + 18; x++) set(x, JY - 6, 'hide');
    for (let x = VX0 + 7; x <= VX0 + 16; x++) set(x, JY - 2, x % 3 ? 'air' : 'tallgrass');
    // the warm mud pool (it heals)
    for (let x = VX0 + 20; x <= VX0 + 26; x++) { const d = x === VX0 + 20 || x === VX0 + 26 ? 1 : 2; for (let y = JY; y < JY + d; y++) set(x, y, 'water'); set(x, JY + d, 'mud'); }
    // ---- the Word Temple ----
    const tx0 = TX - 9;
    for (let k = 0; k < 5; k++) for (let y = JY - 2 * k - 2; y <= JY - 2 * k - 1; y++) for (let x = tx0 + k * 2 - (k ? 0 : 0); x <= TX + 9 - k * 2; x++) { set(x, y, (x + y) % 5 ? 'brick' : 'mossstone'); wall(x, y, 'brick'); }
    // the library inside, with doors on both sides
    for (let y = JY - 4; y <= JY - 1; y++) for (let x = TX - 6; x <= TX + 6; x++) { set(x, y, 'air'); wall(x, y, 'brick'); }
    for (let y = JY - 3; y <= JY - 1; y++) for (const x of [TX - 9, TX - 8, TX - 7, TX + 7, TX + 8, TX + 9]) { set(x, y, 'air'); wall(x, y, 'brick'); }
    for (const x of [TX - 5, TX - 4, TX + 4, TX + 5]) set(x, JY - 4, 'bookshelf');
    set(TX - 3, JY - 2, 'torchwall'); set(TX + 3, JY - 2, 'torchwall');
    for (let x = TX - 6; x <= TX + 6; x++) set(x, JY, 'brick');
    set(TX - 2, JY - 1, 'tablet'); M.carvings[(TX - 2) + ',' + (JY - 1)] = CARVE_BASE;
    set(TX + 2, JY - 1, 'tablet'); M.carvings[(TX + 2) + ',' + (JY - 1)] = CARVE_BASE + 1;
    // the sealed vault under the library
    for (let y = JY + 1; y <= JY + 5; y++) for (let x = TX - 5; x <= TX + 5; x++) set(x, y, 'brick');
    for (let y = JY + 1; y <= JY + 4; y++) for (let x = TX - 4; x <= TX + 4; x++) { set(x, y, 'air'); wall(x, y, 'brick'); }
    set(TX - 1, JY, 'runestone'); set(TX, JY, 'runestone');
    for (let y = JY + 1; y <= JY + 4; y++) set(TX - 1, y, 'ladder');
    set(TX + 3, JY + 4, 'woodchest'); M.special[(TX + 3) + ',' + (JY + 4)] = 'gold';
    set(TX - 3, JY + 4, 'tablet'); M.carvings[(TX - 3) + ',' + (JY + 4)] = CARVE_BASE + 2;
    set(TX + 1, JY + 2, 'torchwall');
    // on top: two torches by the old door
    set(TX - 2, JY - 11, 'torchwall'); set(TX + 2, JY - 11, 'torchwall');
    // ---- stilt huts and the rope bridge ----
    const hut = (x0, x1, floor) => {
      for (let y = floor + 1; y < JY; y++) { set(x0, y, 'trunk'); set(x1, y, 'trunk'); }
      for (let x = x0; x <= x1; x++) set(x, floor, 'planks');
      set(x0 + 2, floor, 'air'); for (let y = floor; y < JY; y++) set(x0 + 2, y, 'ladder');
      for (let y = floor - 4; y < floor; y++) { set(x0, y, 'planks'); set(x1, y, 'planks'); for (let x = x0 + 1; x < x1; x++) wall(x, y, 'plank'); }
      set(x0, floor - 1, 'air'); set(x0, floor - 2, 'air'); set(x1, floor - 1, 'air'); set(x1, floor - 2, 'air');
      for (let x = x0 - 1; x <= x1 + 1; x++) set(x, floor - 5, 'leaves');
      for (let x = x0 + 1; x <= x1 - 1; x++) set(x, floor - 6, 'leaves');
      set(x1 - 2, floor - 4, 'lantern');
    };
    hut(TX - 20, TX - 12, JY - 7);                // on stilts over the mud pool
    hut(TX + 13, TX + 21, JY - 7); hut(TX + 25, TX + 32, JY - 7);
    for (let x = TX + 22; x <= TX + 24; x++) set(x, JY - 7, 'ropebridge');
    set(TX - 11, JY - 1, 'campfire');
    // ---- the Giant Strangler tree, west of the village ----
    const tg = surf[TREE], top = tg - 30;
    for (let y = top; y < tg; y++) for (let x = TREE - 1; x <= TREE + 1; x++) { set(x, y, 'trunk'); }
    for (let x = TREE - 2; x <= TREE + 2; x++) set(x, tg - 1, 'trunk');
    for (let y = top - 2; y < tg; y++) set(TREE + 2, y, y > top + 1 ? 'rope' : 'air');
    [[top + 18, -6, 5], [top + 9, -2, 7], [top, -5, 4]].forEach(([y, a, b]) => { for (let x = TREE + a; x <= TREE + b; x++) if (fg[y * W + x] !== T.trunk) set(x, y, 'woodplat'); for (let x = TREE + a - 2; x <= TREE + b + 2; x++) for (let k = 1; k <= 3; k++) if (get(x, y - k) === T.air && RW.hash2(x, k, 31) < 0.75) set(x, y - k, 'leaves'); });
    for (let x = TREE - 4; x <= TREE + 4; x++) set(x, top - 1, 'air');
    for (let x = TREE - 5; x <= TREE + 6; x++) for (let k = 2; k <= 5; k++) if (get(x, top - k) === T.air && Math.abs(x - TREE) < 7 - k) set(x, top - k, 'leaves');
    // ---- old ruins between the village and the Hollow ----
    const rx = 648, ry = surf[rx];
    [[rx, 5], [rx + 6, 3], [rx + 11, 6]].forEach(([x, h]) => { for (let y = ry - h; y < ry; y++) set(x, y, 'mossstone'); });
    for (let x = rx; x <= rx + 6; x++) if (x !== rx + 3) set(x, ry - 6, 'mossstone');
    set(rx + 3, ry - 1, 'tablet'); M.carvings[(rx + 3) + ',' + (ry - 1)] = CARVE_BASE + 3;
    // where everyone stands
    M.jv = { JY, npcs: {
      jv_chief: [TX - 10, JY - 1], jv_glyph: [TX - 16, JY - 8], jv_spiral: [TX + 29, JY - 8], jv_zig: [VX1 - 6, JY - 1],
      jv_sage_water: [TX - 5, JY - 1], jv_sage_fire: [TX + 5, JY - 1], jv_sage_leaf: [TX - 4, JY - 7], jv_sage_wind: [TX + 4, JY - 7],
      jv_scout: [VX0 + 11, JY - 1] } };
  }

  // ---------- carvings ----------
  const CARV = RW.CARVINGS_FUZZY || (RW.CARVINGS_FUZZY = []);
  const CARVE_BASE = CARV.length;
  CARV.push(
    { title: 'The Four Books', text: 'Water, Fire, Leaf and Wind. A sage may only call what is written in their own book. Tear out a word, and the word becomes the thing.' },
    { title: 'The Old Door', text: 'Four sages, four words. Speak them together at the top of the temple, where the old door turns, and what was sealed will open.' },
    { title: 'Made by Four Brothers', text: 'Four brothers drew these worlds when they were small: fuzzies and rocks, acorns and ghosts, and squares that wander. If you are reading this, you are in their world now. Be kind to it.' },
    { title: 'Before the Village', text: 'This was a temple once, older than Tanglehold. The sages say Gnarlroot\'s roots pulled it down. The vines say nothing, but they look guilty.' },
  );

  // ---------- the village zone: safe, bright, and the mud pool heals ----------
  def.zones.jvillage = { name: 'Tanglehold', music: 'village' };
  const baseZone = def.zoneAt, baseAmb = def.ambientAt;
  const inVil = (x, y) => x >= VX0 - 2 && x <= VX1 + 2 && y < JY + 6 && y > JY - 20;
  def.zoneAt = function (x, y) { return inVil(x, y) ? 'jvillage' : baseZone.call(this, x, y); };
  def.ambientAt = function (x, y) { return inVil(x, y) && y < JY + 1 ? 0.36 : baseAmb.call(this, x, y); };

  // ---------- villagers ----------
  const baseInit = E.initNpcs;
  E.initNpcs = function () {
    const r = baseInit.apply(this, arguments);
    const W = RW.world; if (!W.def || W.def.id !== 'fuzzy' || !W.meta || !W.meta.jv) return r;
    JY = W.meta.jv.JY;
    NPC.forEach(([id, , , , [w, h]]) => { const p = W.meta.jv.npcs[id]; if (!p) return; E.npcs.push({ id, x: p[0] * TS + (TS - w) / 2, y: (p[1] + 1) * TS - h, w, h, home: p[0] * TS, face: -1, t: Math.random() * 4, vx: 0, vy: 0 }); });
    return r;
  };

  // ---------- talking ----------
  const F = () => (P.flags = P.flags || {});
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const WORD = { jv_sage_water: 'FOUR', jv_sage_fire: 'BROTHERS', jv_sage_leaf: 'ONE', jv_sage_wind: 'WORLD' };
  const LINES = {
    jv_chief: ['Welcome to Tanglehold, traveller. Mind the mud, mind the vines, and never stand in front of a slinger.', 'The four tribes paint their fur so we can tell each other apart in the leaves. Also it looks good.', 'Gnarlroot sleeps in the Hollow to the east. When it wakes, the whole jungle knows.'],
    jv_glyph: ['This glyph is my grandmother. This one is a warthog I beat. This one is lunch.', 'The temple is older than the village. We just moved in around it.', 'Sprig says the vines on the temple whisper. I think it is just Sprig.'],
    jv_spiral: ['...', 'From up here you can see the Strangler tree. Old Puddle\'s page is still up there, I think.', 'The spiral means patience. Mostly.'],
    jv_zig: ['HELLO! Did you see that? I hit a bat in the dark! I think it was a bat!', 'Zigfurs are the best slingers. Do not ask the other tribes. They will lie.', 'Get behind a warthog and hit it in the back. It can\'t turn fast enough. WHAM.'],
    jv_sage_water: ['Water can only make water. That is the rule of the books.', 'Your weather magic is old magic, young one. No book, no words. The sky just listens to you.'],
    jv_sage_fire: ['A fire sage tears out the word FLAME and a flame appears. Tear out too many and you have no book left.', 'Rain puts out fire. Do not bring your rain cloud near my books.'],
    jv_sage_leaf: ['The vines remember when this was all temple. They are a little sad about it.', 'A leaf word becomes a thorn vine. Very useful. Very prickly.'],
    jv_sage_wind: ['I am the reason we keep the windows shut.', 'Gust, rain, storm. Your weathers work best together, little fuzzy: soak them first, then the lightning bites.'],
    jv_scout: ['Ridgebacks are fast, but they can\'t turn quick. Neither can most beasts. Hit them from behind and it hurts them more.', 'Keep hitting a beast and it staggers, all dizzy. That\'s when you hit hardest. Bosses too, a little.', 'The heavy cavalry ride turtles. They\'re out east. Slow, but nothing gets past a turtle.'],
  };
  function talk(npc) {
    const sp = RW.SPECIES[npc.id]; U.openModal('talk');
    const box = document.getElementById('talk'); box.querySelector('.who').textContent = sp.name;
    try { U.portrait(box.querySelector('canvas'), npc.id); } catch (e) { /* no portrait is fine */ }
    const says = box.querySelector('.says'), acts = box.querySelector('.acts'), extra = box.querySelector('.extra');
    acts.innerHTML = ''; extra.innerHTML = '';
    const btn = (t, fn, primary) => { const b = el('button', 'btn small' + (primary ? ' primary' : ''), t); b.type = 'button'; b.onclick = fn; acts.append(b); return b; };
    const f = F(); let line = RW.pick(LINES[npc.id] || ['Hello.']);
    // Chief Tassel: warthog hides
    if (npc.id === 'jv_chief') {
      if (!f.jv_hides) line = 'Warthogs keep trampling our mud gardens. Bring me 6 Warthog Hides and I\'ll make it worth your while.';
      else if (f.jv_hides === 1) {
        line = P.count('warthog_hide') >= 6 ? 'Six hides! Our gardens thank you.' : 'Still need those 6 Warthog Hides (you have ' + P.count('warthog_hide') + '). Hit them from behind: they can\'t turn quick.';
        if (P.count('warthog_hide') >= 6) btn('Give 6 Warthog Hides', () => { P.remove('warthog_hide', 6); f.jv_hides = 2; const gotSling = !P.has('slingshot'); if (gotSling) P.add('slingshot', 1); P.add('coin', 40); P.add('key_fragment', 1); U.banner('Chief Tassel is pleased', (gotSling ? 'A slingshot, ' : '') + '40 coins and a key fragment.'); RW.audio.sfx('crystal'); U.dirty(); talk(npc); }, true);
      }
    }
    // Old Puddle: the torn page
    if (npc.id === 'jv_sage_water') {
      if (!f.jv_page) line = 'The wind took a page of the Book of Wind and blew it to the top of the Strangler, the giant tree west of the village. Climb its rope and bring the page back?';
      else if (f.jv_page === 1) {
        line = P.has('torn_page') ? 'You found it! Look at those words wriggle.' : 'The page is at the very top of the Strangler tree, west of here. Climb the rope.';
        if (P.has('torn_page')) btn('Give the Torn Page', () => { P.remove('torn_page', 1); f.jv_page = 2; P.add('coin', 50); P.add('recipe_square', 1); U.banner('The page is home', '50 coins and a Recipe Square. And the sages will share their words with you now.'); RW.audio.sfx('crystal'); U.dirty(); talk(npc); }, true);
      }
    }
    if (npc.id === 'jv_sage_water' && !f.jv_page) btn('I\'ll find it', () => { f.jv_page = 1; U.toast('Climb the rope on the Strangler tree, west of Tanglehold.'); U.closeModal(); }, true);
    if (npc.id === 'jv_chief' && !f.jv_hides) btn('I\'ll get them', () => { f.jv_hides = 1; U.toast('Bring Chief Tassel 6 Warthog Hides.'); U.closeModal(); }, true);
    // the sages' words, once the page is home
    if (WORD[npc.id] && f.jv_page === 2) {
      f['jv_w_' + npc.id] = 1;
      line = 'My word is ' + WORD[npc.id] + '. ' + (Object.keys(WORD).every((k) => f['jv_w_' + k]) ? 'You have all four now. Speak them together at the top of the temple: four, brothers, one, world.' : 'Ask the other sages for theirs.');
    }
    says.textContent = line;
    if (sp.blurb) extra.append(el('div', 'label', sp.blurb));
    btn('Goodbye', () => U.closeModal());
  }
  const baseTalk = U.talk;
  U.talk = function (npc) { if (npc && /^jv_/.test(npc.id)) return talk(npc); return baseTalk.apply(this, arguments); };

  // ---------- every frame: the page at the top of the tree, the healing mud, the old door ----------
  let pageDrop = 0, healT = 0;
  const inFuzzy = () => RW.world && RW.world.def && RW.world.def.id === 'fuzzy' && RW.world.meta && RW.world.meta.jv;
  function tick(dt) {
    if (!inFuzzy() || P.dead) return;
    const f = F(), c = P.center(), tx = c.x / TS, ty = c.y / TS, sf = RW.world.meta.surf;
    // the torn page waits at the top of the Strangler
    if (f.jv_page === 1 && !P.has('torn_page') && (pageDrop -= dt) <= 0) {
      const top = sf[TREE] - 30;
      if (Math.abs(tx - TREE) < 6 && ty < top + 2 && ty > top - 6 && !(E.drops || []).some((d) => d.id === 'torn_page')) { E.dropItem('torn_page', 1, (TREE + 3) * TS, (top - 1) * TS); U.toast('A page flutters on the branch, its words wriggling.'); pageDrop = 6; }
    }
    // the warm mud pool heals
    if (P.water && Math.abs(tx - (VX0 + 23)) < 4.5 && Math.abs(ty - JY) < 3 && (healT -= dt) <= 0) { healT = 0.6; if (P.hp < P.maxHp()) { P.hp = Math.min(P.maxHp(), P.hp + 2); RW.fx.text(c.x, P.y - 6, '+2', '#8dff8a'); U.dirty(); } if (!f.jv_mud) { f.jv_mud = 1; U.toast('Warm mud. It soothes your bruises.'); } }
  }
  const baseUpd = E.updateNpcs;
  E.updateNpcs = function (dt) { const r = baseUpd.apply(this, arguments); try { tick(dt); } catch (e) { /* keep the game running */ } return r; };

  // ---------- the old door on top of the temple, and the four words ----------
  const opened = () => !!F().jv_vault;
  const onTop = () => { const c = P.center(); return Math.abs(c.x / TS - (TX + 0.5)) < 4.5 && c.y / TS < JY - 9.5 && c.y / TS > JY - 16; };
  function openVault() {
    const W = RW.world; F().jv_vault = 1;
    W.setTile(TX - 1, JY, RW.T.ladder); W.setTile(TX, JY, RW.T.air);
    RW.fx.shake(6, 0.8); RW.audio.sfx('slam'); RW.fx.flash && RW.fx.flash('#ffe9a0', 0.15);
    U.banner('The old door turns gold', 'Something opened under the temple library.');
  }
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target || e.target.id !== 'chatin' || !inFuzzy()) return;
    const said = (e.target.value || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!/(four|4) brothers (one|1) world/.test(said)) return;
    if (opened()) { setTimeout(() => U.toast('The door already listened. The vault is open.'), 50); return; }
    if (!onTop()) { setTimeout(() => U.toast('The words echo through the jungle, but nothing listens here. Try the top of the Word Temple.'), 50); return; }
    setTimeout(openVault, 400);
  }, true);
  const baseDraw = E.draw;
  E.draw = function (g, cam) {
    const r = baseDraw.apply(this, arguments);
    if (!inFuzzy()) return r;
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y), t = performance.now() / 1000;
    const cx = (TX + 0.5) * TS + ox, cy = (JY - 13) * TS + oy;
    if (cx < -60 || cx > g.canvas.width + 60) return r;
    const gold = opened();
    // a stone arch with a slowly turning spiral inside it
    g.fillStyle = '#4a4650'; g.fillRect(cx - 16, cy - 18, 4, 30); g.fillRect(cx + 12, cy - 18, 4, 30); g.fillRect(cx - 16, cy - 22, 32, 5);
    g.fillStyle = '#6a6670'; g.fillRect(cx - 16, cy - 22, 32, 1); g.fillRect(cx - 16, cy - 18, 1, 30);
    for (let k = 0; k < 70; k++) {
      const a = k * 0.28 + t * (gold ? 2.2 : 0.9), rr = 1 + k * 0.15;
      g.fillStyle = gold ? (k % 3 ? '#f2c94c' : '#fff0a0') : (k % 3 ? '#7a6ab8' : '#a8c8ff');
      g.globalAlpha = 0.35 + 0.65 * (k / 70); g.fillRect(Math.round(cx + Math.cos(a) * rr * 1.1), Math.round(cy - 4 + Math.sin(a) * rr * 1.3), 2, 2);
    }
    g.globalAlpha = 1;
    return r;
  };
})(window.RW);
