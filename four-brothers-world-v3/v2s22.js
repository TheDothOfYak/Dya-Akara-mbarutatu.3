// 4 Brothers World V2 — part 22: the cavalry's mounts running wild (ridgebacks, shellbacks), the centipede bats,
// Captain Shellbrace, and Tanglehold's slingers and sages fighting off monsters that come into the village.
// (drawings: the cavalry, the centipede bats, the sages' spells and the sling stone; same helpers as v2s20)
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
  D.ridgeback = () => fitFrames([0, 1, 2, 3, 4, 5].map((f) => lizard(f, null)));

  // ---- Shellback turtle (heavy cavalry) ----
  // A huge almond-shaped shell of hex plates, a crown of spikes on a big head, thick legs and a pointed
  // tail. The rider sits in a saddle on top, held on by straps that run down the shell.
  const TUR = { shell: '#8a7a44', shellHi: '#b8a866', shellDk: '#62542e', seam: '#3a3020', rim: '#56482a', rimHi: '#7a6a3e', skin: '#7a8a58', skinHi: '#a0b076', skinDk: '#55603c', skinDeep: '#3a4228', under: '#c4c092', nail: '#ece4cc', horn: '#ddd4b4', hornDk: '#a89e80', eye: '#ff9a2a' };
  const TK = 1.6; // shellbacks are big: much bigger than ridgebacks
  function turtle(frame, rider) {
    const K = TK, k = (v) => v * K; // the turtle is drawn K times the size of its first sketch (the rider stays fuzzy-sized)
    const W = Math.round(120 * K), H = Math.round(84 * K); const c = mk(W, H), g = c.ctx; const T = TUR;
    const walk = frame <= 3, charge = frame === 4, brace = frame === 5;
    const ph = walk ? (frame / 4) * Math.PI * 2 : 0;
    const bob = walk && frame % 2 ? -1 : 0;
    const GY = H - 6, SX = Math.round(k(54)), SW = k(34), SH = k(21), SB = k(5), legLen = brace ? 1 : k(11);
    const SY = GY - SB - legLen - 2 + bob; // the shell's widest line
    const sTop = (x) => { const u = (x - SX) / SW; return u * u >= 1 ? null : SY - SH * Math.pow(1 - u * u, 0.72); };
    const sBot = (x) => { const u = (x - SX) / SW; return u * u >= 1 ? null : SY + SB * Math.pow(1 - u * u, 0.9); };
    // --- legs: thick, scaly, three toenails ---
    const leg = (x, phase, far) => {
      const col = far ? T.skinDk : T.skin, hi = far ? T.skinDk : T.skinHi, dk = far ? T.skinDeep : T.skinDk;
      if (brace) { const y = GY - 2; rect(g, x - 4, y, Math.round(k(8)), 3, col); px(g, x - 4, y, hi); [0, 3, 6, 9].forEach((q) => px(g, x - 4 + q, y + 2, T.nail)); return; }
      const lift = walk ? Math.max(0, Math.sin(ph + phase)) * k(2) : 0, step = walk ? Math.cos(ph + phase) * k(1.5) : charge ? (phase ? k(2) : -k(2)) : 0;
      const y0 = Math.round(sBot(x) - k(4)), y1 = GY - 2 - Math.round(lift);
      for (let y = y0; y <= y1; y++) {
        const t = (y - y0) / Math.max(1, y1 - y0); const w = Math.round(t < 0.3 ? k(4) : t < 0.8 ? k(3) : k(4)); const xs = Math.round(x + step * t);
        rect(g, xs - w, y, w * 2 + 1, 1, col); px(g, xs - w, y, hi); px(g, xs + w, y, dk);
        if ((y + x) % 4 === 0 && t > 0.15 && t < 0.85) { px(g, xs - 1, y, dk); px(g, xs + 2, y + 1, dk); }
      }
      const fx = Math.round(x + step), fw = Math.round(k(9)), f0 = fx - (fw >> 1); rect(g, f0, y1 + 1, fw, 2, dk); rect(g, f0, y1 + 1, fw, 1, col);
      for (let q = 1; q < fw; q += 3) { px(g, f0 + q, y1 + 2, T.nail); px(g, f0 + q, y1 + 1, T.nail); }
    };
    leg(Math.round(SX - k(12)), Math.PI, true); leg(Math.round(SX + k(24)), 0, true);
    // --- tail ---
    const tw = walk ? Math.round(Math.sin(ph) * K) : 0;
    poly(g, [[SX - SW + k(6), SY - k(3)], [SX - SW + k(6), SY + k(3)], [SX - SW - k(9), SY + k(3) + tw]], T.skin); line(g, SX - SW + k(5), SY + k(3), SX - SW - k(8), SY + k(3) + tw, T.skinDk); line(g, SX - SW + k(4), SY - 1, SX - SW - k(4), SY + k(1) + tw, T.skinHi);
    // --- neck and head (the shell front covers where the neck goes in) ---
    const hx = Math.round(SX + SW + k(brace ? 2 : charge ? 13 : 10)), hy = Math.round(SY - k(brace ? 2 : charge ? 4 : 6) + (walk ? Math.round(Math.sin(ph * 2) * 0.6 * K) : 0));
    if (!brace) { poly(g, [[SX + SW - k(10), SY - k(7)], [hx - k(5), hy - k(5)], [hx - k(5), hy + k(5)], [SX + SW - k(10), SY + k(4)]], T.skin); line(g, SX + SW - k(6), SY + k(3), hx - k(5), hy + k(4), T.under); for (let q = 0; q < 4; q++) line(g, SX + SW - k(3) + q * k(3), SY - k(5) + q * 0.5, SX + SW - k(2) + q * k(3), SY + k(1) + q * 0.5, T.skinDk); }
    // crown of spikes (from the sketch), drawn behind the head
    [[-7, 4], [-4, 6], [-1, 7], [2, 6], [5, 4]].forEach(([dx, h0]) => { const h = Math.round(k(h0)); for (let q = 0; q < h; q++) { const w = Math.max(0, Math.round((h - q) / 3)); for (let j = -w; j <= w; j++) px(g, Math.round(hx + k(dx) + j - q * 0.5), Math.round(hy - k(4) - q), j <= 0 ? T.horn : T.hornDk); } });
    for (let y = -Math.round(k(6)); y <= Math.round(k(5)); y++) for (let x = -Math.round(k(8)); x <= Math.round(k(12)); x++) {
      const u = x / (x > 0 ? k(12.5) : k(8.5)), v = y / (y < 0 ? k(6) : k(5)); if (u * u + v * v > 1) continue;
      px(g, hx + x, hy + y, v < -0.5 ? T.skinHi : v > 0.55 ? T.under : (x + y) % 5 === 0 && v < 0.3 ? T.skinDk : T.skin);
    }
    // cheek spikes, brow, eye, nostril, mouth
    [[-6, 2], [-3, 4], [-9, 0]].forEach(([dx, dy]) => { const ax = Math.round(hx + k(dx)), ay = Math.round(hy + k(dy)); line(g, ax, ay, ax - Math.round(k(4)), ay + Math.round(k(2)), T.horn); px(g, ax - Math.round(k(4)), ay + Math.round(k(2)), T.hornDk); });
    const ex = Math.round(hx + k(2.5)), ey = Math.round(hy - k(3));
    line(g, hx, Math.round(hy - k(4)), Math.round(hx + k(6)), Math.round(hy - k(3.4)), T.skinDeep); rect(g, ex, ey, 4, 4, '#1a120a'); px(g, ex + 1, ey + 1, T.eye); px(g, ex + 2, ey + 1, T.eye); px(g, ex + 1, ey + 2, T.eye); px(g, ex + 2, ey, '#ffffff');
    px(g, Math.round(hx + k(11)), Math.round(hy - k(2)), T.skinDeep); px(g, Math.round(hx + k(10.5)), Math.round(hy - k(2)), T.skinDeep);
    if (charge) { poly(g, [[hx + k(2), hy + k(1)], [hx + k(13), hy - k(1)], [hx + k(13), hy + k(5)], [hx + k(3), hy + k(4)]], '#6a2228'); [5, 8, 11].forEach((x) => { px(g, Math.round(hx + k(x)), Math.round(hy + k(1)), '#f0e8d8'); px(g, Math.round(hx + k(x) - 1), Math.round(hy + k(4)), '#f0e8d8'); }); }
    else { line(g, Math.round(hx + k(2)), Math.round(hy + k(2)), Math.round(hx + k(11)), Math.round(hy + k(1)), T.skinDeep); px(g, Math.round(hx + k(1)), Math.round(hy + k(3)), T.skinDeep); }
    // --- lance (behind the rider) and rider ---
    let r = null, rx = 0, ry = 0;
    if (rider) {
      r = riderFrame(rider.look, charge ? 6 : 0, true); rx = SX - 14; ry = Math.round(sTop(SX)) - 25 + (walk && frame % 2 ? 0 : 0);
      const ax = rx + r.hand.x, ay = ry + r.hand.y;
      let l0, l1;
      if (charge) { l0 = [ax - 26, ay + 2]; l1 = [ax + 38, ay + 2]; } else if (brace) { l0 = [ax - 12, ay + 8]; l1 = [ax + 24, ay - 12]; } else { l0 = [ax - 30, ay + 4]; l1 = [ax + 32, ay - 3]; }
      spear(g, l0[0], l0[1], l1[0], l1[1], 'barbed');
      // pennant near the head of the lance
      const fx = l1[0] - 10, fy = Math.round(l0[1] + (l1[1] - l0[1]) * ((fx - l0[0]) / (l1[0] - l0[0])));
      poly(g, [[fx - 7, fy + 1], [fx, fy + 1], [fx - 3, fy + 6]], SADDLE.cloth); line(g, fx - 6, fy + 1, fx, fy + 1, SADDLE.trim); px(g, fx - 3, fy + 4, SADDLE.dk);
      g.drawImage(r, rx, ry);
    }
    // --- shell: an almond lens of hex plates ---
    const HX = 7.6 * Math.sqrt(K), HY = HX * 0.87; const cells = [];
    for (let j = -2; j < 12; j++) for (let i = -2; i < 20; i++) cells.push([SX - 9 * HX + i * HX + (j & 1 ? HX / 2 : 0), SY - SH + 2 + j * HY]);
    for (let x = SX - SW; x <= SX + SW; x++) {
      const t = sTop(x), b = sBot(x); if (t == null) continue;
      for (let y = Math.round(t); y <= Math.round(b); y++) {
        const edge = Math.min(y - t, Math.abs(x - (SX - SW)) * 0.5, Math.abs(SX + SW - x) * 0.5) / Math.sqrt(K);
        let col;
        if (y > SY) col = (x & 3) === 0 ? T.seam : y === SY + 1 ? T.rimHi : T.rim; // the plastron rim
        else if (edge < 2.2 || y >= SY - 1) col = (x % 5 === 0) ? T.seam : y === Math.round(t) ? T.rimHi : T.rim; // marginal plates
        else {
          let d1 = 1e9, d2 = 1e9, best = null;
          cells.forEach((p) => { const d = Math.hypot(x - p[0], y - p[1]); if (d < d1) { d2 = d1; d1 = d; best = p; } else if (d < d2) d2 = d; });
          const lx = x - best[0], ly = y - best[1];
          if (d2 - d1 < 1.05) col = T.seam;
          else if (lx < 0 && ly < 0 && lx + ly > -5 * Math.sqrt(K) && d1 < 3.2 * Math.sqrt(K)) col = T.shellHi;
          else if (lx + ly > 2.5 * Math.sqrt(K)) col = T.shellDk;
          else col = T.shell;
          if (col === T.shell && x > SX + k(14) && y > SY - k(9)) col = T.shellDk; // the shell rounds away from the light
        }
        px(g, x, y, col);
      }
    }
    // --- saddle and straps ---
    if (rider) {
      const top0 = Math.round(sTop(SX));
      [[-1, -Math.round(k(26))], [1, Math.round(k(26))]].forEach(([s, end]) => { line(g, SX + s * 6, top0 + 2, SX + end, SY - 1, SADDLE.strap); line(g, SX + s * 7, top0 + 2, SX + end + s, SY - 1, SADDLE.strap); rect(g, SX + end - 1 + (s > 0 ? 0 : 0), SY - 2, 2, 2, SADDLE.trim); });
      line(g, SX - 2, top0 + 3, Math.round(SX - k(12)), SY - 1, SADDLE.strap); line(g, SX + 2, top0 + 3, Math.round(SX + k(12)), SY - 1, SADDLE.strap); // the X across the shell
      rect(g, SX - 10, top0 - 2, 21, 4, SADDLE.cloth); rect(g, SX - 10, top0 - 2, 21, 1, SADDLE.hi); rect(g, SX - 9, top0 + 1, 19, 1, SADDLE.dk);
      for (let k = 0; k < 21; k += 2) px(g, SX - 10 + k, top0 + 2, SADDLE.trim);
    }
    leg(Math.round(SX - k(22)), 0, false); leg(Math.round(SX + k(16)), Math.PI, false);
    return A.outline(c, '#12140c');
  }
  D.turtlerider = (o) => fitFrames([0, 1, 2, 3, 4, 5].map((f) => turtle(f, { look: (o && o.look) || RIDER_LOOK })));
  D.shellback = () => fitFrames([0, 1, 2, 3, 4, 5].map((f) => turtle(f, null)));

  const SLING = { cord: '#dcc89c', pouch: '#6a4024', pouchHi: '#9a6a3a', stone: '#a8a296', stoneHi: '#d8d2c4', stoneDk: '#6e6a62' };
  D.slingstone = () => [0, 1].map((f) => { const c = mk(14, 7), g = c.ctx; disc(g, 10, 3, 1.8, SLING.stone); px(g, 9 + f, 2, SLING.stoneHi); px(g, 11, 4, SLING.stoneDk); A.outline(c, '#141218'); for (let k = 0; k < 6; k += 1 + f) px(g, k, 3, '#ffffff'); return c; });

  D.sagespell = (o) => {
    const el = (o && o.v) || 'water'; const frames = [];
    for (let f = 0; f < 3; f++) {
      const c = mk(26, 26), g = c.ctx;
      if (el === 'water') { // a wobbling ball of water with droplets around it
        const rx = [6, 6.6, 5.6][f], ry = [6, 5.4, 6.4][f];
        for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) { const d = (x * x) / (rx * rx) + (y * y) / (ry * ry); if (d <= 1) px(g, 13 + x, 13 + y, d > 0.6 ? '#2a6ab8' : y < -1 && x < 1 ? '#7fc8f8' : '#4a90e0'); }
        rect(g, 10, 9, 2, 2, '#e0f8ff'); px(g, 15, 16, '#c8f0ff');
        A.outline(c, '#0e2240');
        [[3, 6], [22, 4], [21, 21], [4, 20]].forEach(([x, y], k) => { if ((k + f) % 2) { px(g, x, y, '#7fd0ff'); px(g, x, y + 1, '#3a8ad8'); } });
      } else if (el === 'fire') { // a fireball with a flickering tail
        for (let k = 7; k >= 0; k--) disc(g, 9 - k * 0.9, 13 + Math.sin(k * 1.3 + f * 2) * 1.6, 3.6 - k * 0.38, k < 3 ? '#ff7a2e' : '#d8402a');
        disc(g, 15, 13, 5.5, '#e85a2a'); disc(g, 16, 13, 4, '#ff9a3a'); disc(g, 17, 12, 2.4, '#ffd060'); px(g, 18, 11, '#fff8d0');
        A.outline(c, '#3a0e08');
        [[5, 7], [3, 18], [9, 4]].forEach(([x, y], k) => { if ((k + f) % 2 === 0) px(g, x, y, '#ffb347'); });
      } else if (el === 'leaf') { // a thorny vine bursting up out of the ground
        const h = [9, 17, 22][f];
        for (let y = 0; y < h; y++) { const x = 12 + Math.round(Math.sin(y * 0.55) * 2.2); px(g, x, 25 - y, '#3a7a34'); px(g, x + 1, 25 - y, '#24501f'); if (y % 4 === 2) { px(g, x - 1, 25 - y, '#ece4cc'); px(g, x + 2, 24 - y, '#ece4cc'); } }
        if (f) { const ty = 25 - h; disc(g, 9, ty + 4, 1.8, '#5ca24c'); px(g, 8, ty + 3, '#8be04a'); disc(g, 16, ty + 7, 1.8, '#4a8a3a'); px(g, 16, ty + 6, '#8be04a'); disc(g, 13, ty + 1, 1.3, '#8be04a'); }
        rect(g, 8, 24, 10, 2, '#5a3a24'); px(g, 9, 24, '#7a5234');
        A.outline(c, '#0e1e0a');
      } else { // a spiral gust of wind
        for (let k = 0; k < 46; k++) { const a = k * 0.33 + f * 1.1, r = 1 + k * 0.21; px(g, 13 + Math.cos(a) * r, 13 + Math.sin(a) * r * 0.7, k > 30 ? '#ffffff' : k > 14 ? '#dce8f8' : '#a8b8d4'); }
        for (let k = 0; k < 3; k++) { const y = 5 + k * 7 + f; line(g, 1 + k * 2, y, 6 + k * 2, y, '#ffffff'); px(g, 7 + k * 2, y + 1, '#dce8f8'); }
        A.outline(c, '#3a4a68');
      }
      frames.push(c);
    }
    return frames;
  };

  // ======================= CENTIPEDE BATS =======================
  // From the sketch, seen from the front: bat wings with a hooked claw on each tip, a long segmented
  // centipede body hanging below with legs down both sides, a spike on the head, pincers under the jaw
  // and a hooked tail. Three sizes: Skitterwing (common), Broodwing (bigger, venomous) and the
  // Gloomwing Matriarch (huge, crowned, glowing spine).
  RW.CBATS = {
    small: { segs: 7, r: 2.2, span: 16, plate: '#7a6878', plateHi: '#a894a6', plateDk: '#4a3a4a', leg: '#2a2030', mem: '#3a2a40', memHi: '#4e3a58', bone: '#c0aac0', eye: '#ff4a3a', glow: null, out: '#100a12' },
    brood: { segs: 10, r: 3.0, span: 25, plate: '#8a3a2a', plateHi: '#c0663e', plateDk: '#5a2018', leg: '#2e1410', mem: '#4e2626', memHi: '#6e3a32', bone: '#d8a070', eye: '#c8ff4a', glow: '#8be04a', out: '#140806' },
    matriarch: { segs: 14, r: 4.4, span: 42, plate: '#c8c0ae', plateHi: '#ece6d6', plateDk: '#8a8070', leg: '#3a3040', mem: '#3a2448', memHi: '#5a3a6e', bone: '#d8d0c0', eye: '#ff3a5a', glow: '#b080ff', out: '#0e0812', crown: true, tatter: true },
  };
  function cbat(kind, frame) {
    const K = RW.CBATS[kind] || RW.CBATS.small; const s = K.r / 2.2;
    const W = Math.round(K.span * 2 + 24 * s), H = Math.round(K.segs * K.r * 1.55 + 30 * s + K.span);
    const c = mk(W, H), g = c.ctx;
    const dive = frame === 4, fold = frame === 5; const cx = Math.round(W / 2) - 0.5;
    // wing beat: 0 up, 1 level, 2 down, 3 level; folded wings hug the body
    const beat = fold ? -1.7 : dive ? -1.3 : [-1, 0, 1, 0][frame];
    const headY = Math.round(K.span * 0.75 + 4 * s + (dive ? 3 : 0) - (beat > 0 ? 1 : 0));
    const segs = []; const gap = K.r * 1.55; const still = dive || fold;
    for (let i = 0; i < K.segs; i++) {
      const t = i / (K.segs - 1); const sway = still ? 0 : Math.sin(i * 0.7 + frame * 1.5) * (1 + t * 2.5 * s);
      segs.push([cx + sway, headY + K.r * 1.8 + i * gap, K.r * (1 - t * 0.45)]);
    }
    const shoulder = segs[1];
    // --- wings (behind the body) ---
    const wing = (side) => {
      const S = [shoulder[0] + side * shoulder[2] * 0.6, shoulder[1] - K.r * 0.4];
      const span = fold ? K.span * 0.32 : dive ? K.span * 0.55 : K.span;
      const lift = beat < -1.5 ? 2.4 : beat < 0 ? 1.4 : beat > 0 ? -0.2 : 0.6;
      const wrist = [cx + side * span * 0.55, S[1] - span * 0.32 * lift];
      const tip = [cx + side * span, wrist[1] + span * (beat < -1.5 ? 0.4 : beat < 0 ? -0.05 : beat > 0 ? 0.55 : 0.28)];
      const f2 = [cx + side * span * 0.78, S[1] + span * (beat > 0 ? 0.75 : 0.5) + (fold ? K.span * 0.35 : 0)];
      const f3 = [cx + side * span * 0.42, S[1] + span * (beat > 0 ? 0.62 : 0.45) + (fold ? K.span * 0.3 : 0)];
      const tl = segs[Math.min(K.segs - 1, fold ? 6 : 4)]; const T = [tl[0] + side * tl[2] * 0.5, tl[1]];
      const sc = (a, b, k) => { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; return [m[0] - side * k * 0.2, m[1] - k]; };
      poly(g, [S, wrist, tip, sc(tip, f2, 2 * s), f2, sc(f2, f3, 2.4 * s), f3, sc(f3, T, 1.6 * s), T], K.mem);
      poly(g, [S, wrist, tip, [(tip[0] + f2[0]) / 2, (tip[1] + f2[1]) / 2 - 2 * s], [(wrist[0] + f3[0]) / 2, (wrist[1] + f3[1]) / 2]], K.memHi);
      if (K.tatter && !fold) [[0.5, 0.55], [0.75, 0.42], [0.3, 0.72]].forEach(([a, b], k) => { const hx = S[0] + (tip[0] - S[0]) * a, hy = S[1] + (f2[1] - S[1]) * b; g.clearRect(Math.round(hx) - (k === 0 ? 1 : 0), Math.round(hy), 2 + (k & 1), 2); });
      const bw = Math.max(0.5, s * 0.6);
      stroke(g, S, [(S[0] + wrist[0]) / 2, Math.min(S[1], wrist[1]) - 1], wrist, bw, bw * 0.8, K.bone, 20);
      [tip, f2, f3].forEach((f, i) => line(g, wrist[0], wrist[1], f[0], f[1], i === 0 ? K.bone : RW.mix(K.bone, K.mem, 0.45)));
      stroke(g, tip, [tip[0] + side * 2.2 * s, tip[1] + 1 * s], [tip[0] + side * 1 * s, tip[1] + 3.2 * s], 0.7 * s, 0.4, K.bone, 10); // the hooked claw
      px(g, wrist[0] + side, wrist[1] - 1, K.bone);
    };
    wing(-1); wing(1);
    // --- legs: a pair per segment, rippling ---
    segs.forEach(([x, y, r], i) => {
      if (i === 0) return; const up = ((i + frame) % 2 ? -1 : 1) * (still ? 0 : 1);
      [-1, 1].forEach((side) => {
        const kx = x + side * (r + 1.6 * s), ky = y - 0.5 + up * 0.6 * s, fx = kx + side * 1 * s, fy = ky + 2.2 * s + (dive ? -2 * s : 0);
        if (s > 1.5) { stroke(g, [x + side * r * 0.7, y], [kx, ky - 0.5], [kx, ky], 0.6, 0.6, K.leg, 8); stroke(g, [kx, ky], [fx, (ky + fy) / 2], [fx, fy], 0.6, 0.3, K.leg, 8); }
        else { line(g, x + side * r * 0.7, y, kx, ky, K.leg); line(g, kx, ky, fx, fy, K.leg); }
      });
    });
    // --- tail hook: a big curved claw and a smaller one ---
    const last = segs[K.segs - 1]; const hd = still ? 0 : Math.sin(frame * 1.5) * s;
    stroke(g, [last[0], last[1]], [last[0] - 1 * s + hd, last[1] + 5.5 * s], [last[0] - 4.5 * s + hd, last[1] + 6.5 * s], last[2] * 0.75, 0.5, K.plateDk, 20);
    stroke(g, [last[0], last[1]], [last[0] + 1 * s, last[1] + 4.5 * s], [last[0] + 3 * s, last[1] + 6 * s], last[2] * 0.55, 0.5, K.plateDk, 16);
    // --- body segments, tail first so the front ones sit on top ---
    for (let i = K.segs - 1; i >= 0; i--) {
      const [x, y, r] = segs[i];
      for (let yy = -Math.ceil(r); yy <= Math.ceil(r); yy++) for (let xx = -Math.ceil(r + 0.6); xx <= Math.ceil(r + 0.6); xx++) {
        const u = xx / (r + 0.6), v = yy / (r * 0.82); if (u * u + v * v > 1) continue;
        px(g, x + xx, y + yy, v < -0.35 ? (u < 0.2 ? K.plateHi : K.plate) : v > 0.45 ? K.plateDk : u > 0.55 ? K.plateDk : K.plate);
      }
      px(g, x, y + Math.round(r * 0.8), K.plateDk);
    }
    // --- head with its spike; the Matriarch wears a crown of them ---
    const hx0 = segs[0][0], hy0 = headY, hr = K.r * 1.3;
    const spike = (dx, h, lean) => { for (let k = 0; k < h; k++) { const w = Math.max(0, Math.round(((h - k) / 3) * s * 0.6)); for (let j = -w; j <= w; j++) px(g, hx0 + dx + j + Math.round(k * lean), hy0 - hr - k + 1, j <= 0 ? K.plateHi : K.plate); } };
    spike(0, Math.round(5 * s), 0); if (K.crown) { spike(-3.2 * s, Math.round(3.5 * s), -0.35); spike(3.2 * s, Math.round(3.5 * s), 0.35); spike(-5.6 * s, Math.round(2.5 * s), -0.6); spike(5.6 * s, Math.round(2.5 * s), 0.6); }
    for (let yy = -Math.ceil(hr); yy <= Math.ceil(hr); yy++) for (let xx = -Math.ceil(hr + 1); xx <= Math.ceil(hr + 1); xx++) {
      const u = xx / (hr + 1), v = yy / hr; if (u * u + v * v > 1) continue; px(g, hx0 + xx, hy0 + yy, v < -0.3 ? K.plateHi : v > 0.5 ? K.plateDk : K.plate);
    }
    const eyeY = Math.round(hy0 - hr * 0.1);
    const eye = (dx) => { px(g, hx0 + dx, eyeY, K.eye); if (s > 1.2) { px(g, hx0 + dx, eyeY + 1, RW.shade(K.eye, -0.35)); px(g, hx0 + dx + (dx < 0 ? 1 : -1), eyeY, RW.shade(K.eye, -0.35)); } };
    eye(-Math.round(hr * 0.5)); eye(Math.round(hr * 0.5)); if (kind === 'matriarch') { eye(-Math.round(hr * 0.9)); eye(Math.round(hr * 0.9)); }
    // pincers under the jaw, opening wide for the dive
    const open = dive ? 1.7 : 1;
    [-1, 1].forEach((side) => stroke(g, [hx0 + side * hr * 0.4, hy0 + hr * 0.6], [hx0 + side * hr * 1.05 * open, hy0 + hr * 1.6], [hx0 + side * hr * 0.25, hy0 + hr * 2.1], Math.max(0.6, 0.6 * s), 0.4, K.bone, 14));
    A.outline(c, K.out);
    // glowing venom and spine lights go on top of the outline
    if (K.glow) {
      const tx = Math.round(last[0] - 4.5 * s + hd), ty = Math.round(last[1] + 6.5 * s);
      px(g, tx, ty + 1, K.glow); if (frame % 2) px(g, tx, ty + 2, K.glow);
      px(g, Math.round(hx0 - hr * 0.25), Math.round(hy0 + hr * 2.1) + 1, K.glow);
      segs.forEach(([x, y], i) => { if (kind === 'matriarch' ? i % 2 === 0 && i > 0 : i % 3 === 1) px(g, Math.round(x) - (kind === 'brood' ? 1 : 0), Math.round(y), K.glow); });
    }
    return fold ? flipV(c) : c; // folded and flipped: hanging from the ceiling by its tail hook
  }
  D.cbat = (o) => fitFrames([0, 1, 2, 3, 4, 5].map((f) => cbat((o && o.v) || 'small', f)));

})(window.RW);
// ====================== THE NEW CREATURES ======================
//  * Ridgeback (Tanglewood and Tuftwood Forest): the cavalry's lizard, running wild. Fast, charges in a line.
//  * Shellback (Tanglewood): the heavy cavalry's turtle, running wild. Hits from the front glance off its shell
//    (a quarter of the damage, and it braces); get behind it or over it and hit its back.
//  * Centipede bats (Fuzzy and Acorn World caves): the Skitterwing (common), the Broodwing (deeper, rarer: its bite
//    poisons you) and the Gloomwing Matriarch (deepest caves, very rare: calls Skitterwings to her).
//  * Captain Shellbrace, the heavy cavalry's turtle rider, stands at the east gate of Tanglehold.
//  * Tanglehold fights back: when a monster comes into the village, the slingers throw stones at it and the sages
//    tear out words: Old Puddle a ball of water (it gets wet), Ember a fireball (it burns), Sprig a thorn vine
//    (it's held in place) and Gale a gust (it's blown back).
(function (RW) {
  'use strict';
  const A = RW.art, E = RW.ent, U = RW.ui, P = RW.player, TS = RW.TILE, R = RW.register, D = A.drawers;
  if (!P || !E || !D.ridgeback && !D.lizardrider) return;
  const ec = E.center;

  // ---------- drops ----------
  R.items([
    { id: 'ridge_scale', name: 'Ridgeback Scale', kind: 'material', icon: { s: 'scale', a: '#a2c260', b: '#4e6a2a' }, desc: 'A green scale from a wild ridgeback lizard. Tough and light.' },
    { id: 'shell_plate', name: 'Shell Plate', kind: 'material', icon: { s: 'shard', a: '#b8a866', b: '#5e5030' }, desc: 'A hex plate from a shellback\'s shell. Nothing gets through one of these from the front.' },
    { id: 'brood_venom', name: 'Brood Venom', kind: 'material', icon: { s: 'spine', a: '#8be04a', b: '#5a2018' }, desc: 'A glowing green drop from a Broodwing\'s pincers. Handle carefully.' },
  ]);

  // ---------- species ----------
  const S = R.species;
  S({ id: 'ridgeback', type: 'monsters', name: 'Ridgeback', world: 'fuzzy', role: 'enemy', status: 'active', art: { draw: 'ridgeback' },
    w: 40, h: 20, hp: 70, dmg: 12, speed: 170, behavior: 'charger',
    spawn: { worlds: ['fuzzy'], medium: 'surface', zones: ['jungle', 'forest'], weight: 3 },
    drops: [['ridge_scale', 0.8, 1, 2], ['warthog_hide', 0.2, 1, 1]],
    blurb: 'The light cavalry\'s lizard, running wild. Quick, and it charges in a straight line, so step aside and hit its back.' });
  S({ id: 'shellback', type: 'monsters', name: 'Shellback', world: 'fuzzy', role: 'enemy', status: 'active', art: { draw: 'shellback' },
    w: 96, h: 54, hp: 320, dmg: 18, speed: 70, behavior: 'charger', armored: true,
    spawn: { worlds: ['fuzzy'], medium: 'surface', zones: ['jungle'], weight: 1.2 },
    drops: [['shell_plate', 1, 1, 3], ['ridge_scale', 0.3, 1, 1]],
    blurb: 'The heavy cavalry\'s turtle, running wild. Hits from the front glance off its shell. Get behind it, or jump over it, and hit its back.' });
  S({ id: 'cbat_small', type: 'monsters', name: 'Skitterwing', world: 'fuzzy', role: 'enemy', status: 'active', art: { draw: 'cbat', v: 'small' },
    w: 22, h: 38, hp: 20, dmg: 8, speed: 95, behavior: 'flyer',
    spawn: { worlds: ['fuzzy', 'acorn'], medium: 'air', zones: ['caves', 'deep'], weight: 6 },
    drops: [['bat_wing', 0.7, 1, 2]],
    blurb: 'A centipede with bat wings. Skitters through the caves and dives at anything warm.' });
  S({ id: 'cbat_brood', type: 'monsters', name: 'Broodwing', world: 'fuzzy', role: 'enemy', status: 'active', art: { draw: 'cbat', v: 'brood' },
    w: 34, h: 62, hp: 80, dmg: 13, speed: 85, behavior: 'flyer', poisons: true,
    spawn: { worlds: ['fuzzy', 'acorn'], medium: 'air', zones: ['deep'], weight: 2 },
    drops: [['brood_venom', 0.7, 1, 2], ['bat_wing', 0.8, 1, 3]],
    blurb: 'A bigger, rust-red centipede bat. Its pincers drip green venom: its bite poisons you.' });
  S({ id: 'cbat_matriarch', type: 'monsters', name: 'Gloomwing Matriarch', world: 'fuzzy', role: 'enemy', status: 'active', art: { draw: 'cbat', v: 'matriarch' },
    w: 56, h: 104, hp: 650, dmg: 22, speed: 70, behavior: 'flyer', poisons: true, elite: true,
    spawn: { worlds: ['fuzzy', 'acorn'], medium: 'air', zones: ['deep'], weight: 0.25 },
    drops: [['brood_venom', 1, 3, 5], ['bat_wing', 1, 4, 8], ['key_fragment', 0.5, 1, 1], ['crystal_purple', 0.5, 1, 1]],
    blurb: 'The pale, crowned mother of the centipede bats. Very rare, deep in the caves. She calls Skitterwings to her side.' });
  R.species({ id: 'jv_captain', type: 'fuzzies', name: 'Captain Shellbrace', world: 'fuzzy', role: 'npc', status: 'active', art: { draw: 'jv_turtle' },
    blurb: 'Captain of the heavy cavalry. Rides a shellback named Boulder, who has never once been in a hurry.' });
  D.jv_turtle = () => { const f = D.turtlerider({}); return [f[0], f[1], f[2], f[3]]; };

  // ---------- how they look while they move, and what they do ----------
  const near = (e, r) => { const c = ec(e), p = P.center(); return Math.hypot(c.x - p.x, c.y - p.y) < r; };
  const baseUpd = E.updateEnemies;
  E.updateEnemies = function (dt) {
    const r = baseUpd.apply(this, arguments);
    E.enemies.forEach((e) => {
      if (e.dead) return; const t = e.t || 0;
      if (e.sp === 'ridgeback') e.fr = e.cs === 'charge' ? 1 + Math.floor(t * 14) % 4 : Math.abs(e.vx) > 8 ? 1 + Math.floor(t * 9) % 4 : e.cs === 'wind' ? 5 : 0;
      else if (e.sp === 'shellback') e.fr = e.v2brace > 0 ? 5 : e.cs === 'charge' ? 4 : Math.abs(e.vx) > 4 ? Math.floor(t * 6) % 4 : 0;
      else if (/^cbat_/.test(e.sp)) {
        const p = P.center(), c = ec(e);
        e.fr = e.vy > 30 && near(e, 120) && p.y > c.y ? 4 : Math.floor(t * 10) % 4;
        if (e.sp === 'cbat_matriarch' && near(e, 260) && (e.callT = (e.callT == null ? 3 : e.callT) - dt) <= 0) {
          e.callT = 7;
          const kids = E.enemies.filter((k) => !k.dead && k.sp === 'cbat_small' && Math.hypot(ec(k).x - c.x, ec(k).y - c.y) < 300).length;
          if (kids < 3) { E.spawnEnemy('cbat_small', c.x + RW.rand(-30, 30), c.y - 20); RW.audio.sfx('swing'); RW.fx.text(c.x, e.y - 8, 'SCREE', '#d8d0c0'); }
        }
      } else return;
      if (e.v2brace > 0) e.v2brace -= dt;
      e.frame = e.fr;
    });
    return r;
  };
  // the shellback's shell, from the front
  const baseDamage = E.damage;
  E.damage = function (e, d, dir, knock, crit, color) {
    if (e && !e.dead && e.sp === 'shellback' && (color == null || color === '#ffffff' || color === '#ffe36a')) {
      const p = P.center(), c = ec(e);
      if (e.face && Math.sign(p.x - c.x) === Math.sign(e.face) && p.y > e.y) {
        d = Math.max(1, Math.round(d * 0.25)); e.v2brace = 0.6; knock = 0;
        RW.fx.text(c.x, e.y - 10, 'BLOCKED', '#d8d0b0'); RW.audio.sfx('mine');
        if (!(P.seen && P.seen.v2_shell)) { P.seen = P.seen || {}; P.seen.v2_shell = 1; U.toast('Its shell takes the hit. Get behind a shellback, or jump over it, and hit its back.'); }
      }
    }
    return baseDamage.call(this, e, d, dir, knock, crit, color);
  };
  // a Broodwing's (or the Matriarch's) bite poisons you
  const baseHurt = P.hurt;
  P.hurt = function (d, dir, src) {
    const hp = P.hp, r = baseHurt.apply(this, arguments);
    if ((src === 'cbat_brood' || src === 'cbat_matriarch') && P.hp < hp && !P.dead) { P.poisonT = Math.max(P.poisonT || 0, 3); if (!(P.seen && P.seen.v2_brood)) { P.seen = P.seen || {}; P.seen.v2_brood = 1; U.toast('Its pincers were dripping venom. You\'re poisoned!'); } }
    return r;
  };

  // ---------- Captain Shellbrace at the east gate of Tanglehold ----------
  const baseInit = E.initNpcs;
  E.initNpcs = function () {
    const r = baseInit.apply(this, arguments);
    const W = RW.world; if (!W.def || W.def.id !== 'fuzzy' || !W.meta || !W.meta.jv) return r;
    const JY = W.meta.jv.JY, x = 646;
    E.npcs.push({ id: 'jv_captain', x: x * TS - 22, y: JY * TS - 40, w: 60, h: 40, home: x * TS - 22, face: -1, t: Math.random() * 4, vx: 0, vy: 0 });
    return r;
  };
  const CAPTAIN = ['Boulder and I hold the east gate. Nothing gets past a shellback. Mostly because nothing wants to wait that long.',
    'Wild shellbacks roam the Tanglewood. Don\'t hit one on the nose: get behind it. Their backs are soft. Well, softer.',
    'Light cavalry ride ridgebacks, heavy cavalry ride shellbacks. I asked for a ridgeback once. They gave me Boulder.',
    'Deep in the caves there are bats with centipede bodies. The pale crowned one is their mother. If you see her, run, or bring friends.'];
  const baseTalk = U.talk;
  U.talk = function (npc) {
    if (!npc || npc.id !== 'jv_captain') return baseTalk.apply(this, arguments);
    U.openModal('talk'); const box = document.getElementById('talk');
    box.querySelector('.who').textContent = 'Captain Shellbrace';
    try { U.portrait(box.querySelector('canvas'), 'jv_captain'); } catch (e) { /* no portrait is fine */ }
    box.querySelector('.says').textContent = RW.pick(CAPTAIN);
    const acts = box.querySelector('.acts'), extra = box.querySelector('.extra'); acts.innerHTML = ''; extra.innerHTML = '';
    const lab = document.createElement('div'); lab.className = 'label'; lab.textContent = RW.SPECIES.jv_captain.blurb; extra.append(lab);
    const b = document.createElement('button'); b.className = 'btn small'; b.type = 'button'; b.textContent = 'Goodbye'; b.onclick = () => U.closeModal(); acts.append(b);
  };

  // ---------- Tanglehold fights back: sling stones and the sages' words ----------
  const SPELL = { jv_sage_water: 'water', jv_sage_fire: 'fire', jv_sage_leaf: 'leaf', jv_sage_wind: 'wind' };
  const SLINGERS = ['jv_chief', 'jv_glyph', 'jv_spiral', 'jv_zig'];
  const shots = []; let defT = 0;
  const inVillage = (x) => x > 560 * TS && x < 652 * TS;
  function defend(dt) {
    const W = RW.world; if (!W.def || W.def.id !== 'fuzzy' || !W.meta || !W.meta.jv) return;
    if ((defT -= dt) > 0) return; defT = 0.9;
    const foes = E.enemies.filter((e) => !e.dead && !e.friendly && !e.harmless && inVillage(ec(e).x));
    if (!foes.length) return;
    E.npcs.forEach((n) => {
      const kind = SPELL[n.id] || (SLINGERS.includes(n.id) ? 'stone' : null); if (!kind) return;
      if ((n.v2cd = (n.v2cd || 0) - 0.9) > 0) return;
      const nx = n.x + n.w / 2, ny = n.y + 4;
      const target = foes.filter((e) => Math.hypot(ec(e).x - nx, ec(e).y - ny) < 190).sort((a, b) => Math.hypot(ec(a).x - nx, ec(a).y - ny) - Math.hypot(ec(b).x - nx, ec(b).y - ny))[0];
      if (!target) return;
      const c = ec(target), a = Math.atan2(c.y - ny, c.x - nx), sp = kind === 'stone' ? 280 : 170;
      shots.push({ kind, x: nx, y: ny, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.6, t: 0 });
      n.face = c.x > nx ? 1 : -1; n.v2cd = kind === 'stone' ? 1.8 : 3.6; RW.audio.sfx(kind === 'stone' ? 'swing' : 'crystal');
    });
  }
  function moveShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.t += dt; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.kind === 'stone') s.vy += 260 * dt;
      const hit = E.enemies.find((e) => !e.dead && s.x > e.x - 3 && s.x < e.x + e.w + 3 && s.y > e.y - 3 && s.y < e.y + e.h + 3);
      if (hit) {
        const c = ec(hit), dir = Math.sign(s.vx) || 1;
        if (s.kind === 'stone') E.damage(hit, 6, dir, 2, false, '#d8d2c4');
        else if (s.kind === 'water') { E.damage(hit, 5, dir, 1, false, '#7fc0ff'); hit.v2wet = Math.max(hit.v2wet || 0, 6); hit.burn = 0; RW.fx.burst(c.x, c.y, ['#7fc0ff', '#c8f0ff'], 10, 80, { kind: 'spark', life: 0.4 }); }
        else if (s.kind === 'fire') { E.damage(hit, 8, dir, 1, false, '#ffb347'); E.applyFx(hit, 'fire', 8); }
        else if (s.kind === 'leaf') { E.damage(hit, 5, 0, 0, false, '#8be04a'); hit.v2root = 2.2; RW.fx.debris(c.x, hit.y + hit.h, ['#3a7a34', '#5ca24c', '#8be04a'], 8); }
        else if (s.kind === 'wind') { E.damage(hit, 3, dir, 0, false, '#e8f4ff'); if (!(hit.isBoss || hit === E.boss)) { hit.vx = dir * 380; hit.vy = -160; } }
        shots.splice(i, 1); continue;
      }
      if (s.life <= 0 || RW.world.solid(Math.floor(s.x / TS), Math.floor(s.y / TS))) shots.splice(i, 1);
    }
    // a thorn vine holds a monster in place
    E.enemies.forEach((e) => { if (e.v2root > 0) { e.v2root -= dt; e.vx = 0; if (e.vy < 0) e.vy = 0; } });
  }
  const baseNpcs = E.updateNpcs;
  E.updateNpcs = function (dt) { const r = baseNpcs.apply(this, arguments); try { defend(dt); moveShots(dt); } catch (e) { /* keep the game running */ } return r; };
  const FR = {};
  const frames = (k) => FR[k] || (FR[k] = k === 'stone' ? D.slingstone() : D.sagespell({ v: k }));
  const baseDraw = E.draw;
  E.draw = function (g, cam) {
    const r = baseDraw.apply(this, arguments);
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y);
    shots.forEach((s) => {
      const f = frames(s.kind); const im = f[Math.floor(s.t * 10) % f.length]; const flip = s.vx < 0;
      g.save(); g.translate(Math.round(s.x + ox), Math.round(s.y + oy)); if (flip) g.scale(-1, 1);
      const sc = s.kind === 'stone' ? 1 : 0.7; g.drawImage(im, -im.width * sc / 2, -im.height * sc / 2, im.width * sc, im.height * sc); g.restore();
    });
    return r;
  };
})(window.RW);
