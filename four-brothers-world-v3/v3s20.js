// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 20: the Leviathan as a pixel-art serpent, in four stages.
//  * Built like the big Terraria worms: a head, a chain of separate armoured segments and a tail, each its own
//    pixel sprite (shaded flat, outlined, lit from the upper left), turned to follow the body. Big and chunky:
//    one sprite pixel is PX world units.
//  * Four stages, each with its own colours: 1 teal plates studded with gems, 2 dark abyssal black and violet,
//    3 pale bone over black with cold teal eyes, 4 molten rage: black plates cracked with fire.
//  * Sprites are painted once per stage and size and cached, so drawing is just turned pictures.
//  * The Heart Chamber is pitch black (only your own light shows it), set here so it wins over the cave light.
(function (RW) {
  'use strict';
  const VA = RW.v3art, WD = RW.world;
  if (!VA || !RW.v3lev) return;
  const K = 3, PX = 2, NSEG = RW.v3lev.NSEG;
  const segR = (i) => (34 - 24 * Math.pow(i / NSEG, 1.3)) * K; // world units, same as the fight uses
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); c.ctx = c.getContext('2d'); c.ctx.imageSmoothingEnabled = true; return c; };
  const sh = (c, k) => RW.shade(c, k);

  // ---------------- the four looks ----------------
  const GEMS = ['#e0525a', '#4fa8f0', '#5fd98a', '#a86ef0', '#f2c94c', '#7fe3ff'];
  const THEMES = {
    1: { name: 'teal', plate: ['#0b1f26', '#123440', '#1b4b5a', '#256777', '#3a8792', '#5ba7a8'], belly: ['#5d8c88', '#83b2a8', '#b4dccf'], seam: '#6ee6ff', gems: GEMS, eye: '#f2c94c', mouth: ['#24123a', '#52288a'], teeth: ['#b8b098', '#ece6d0'], crest: GEMS, fin: ['#1b4b5a', '#3a8792', '#7fd8e0'] },
    2: { name: 'abyssal', plate: ['#06050b', '#0e0a18', '#171226', '#221a36', '#30244c', '#433262'], belly: ['#251e32', '#352c46', '#4a3e5e'], seam: '#8a5ad8', gems: ['#6c4aa8', '#9a74e0', '#4a3270'], eye: '#b08aff', mouth: ['#120818', '#3a1a5a'], teeth: ['#8a8298', '#c8c0d4'], crest: ['#6c4aa8', '#9a74e0', '#4a3270'], fin: ['#171226', '#30244c', '#6c4aa8'] },
    3: { name: 'bone', plate: ['#4e4838', '#6e6852', '#948c70', '#b8ae90', '#d8d0b4', '#f0ead4'], belly: ['#0a0a10', '#14141c', '#20202a'], seam: '#3ae0d0', gems: ['#3ae0d0', '#a8fff4'], eye: '#4cf0e0', mouth: ['#04040a', '#141420'], teeth: ['#d8d0b4', '#f0ead4'], crest: ['#b8ae90', '#d8d0b4', '#948c70'], fin: ['#0c0c12', '#20202a', '#6e6852'], dark: ['#040406', '#0a0a10', '#14141c'] },
    4: { name: 'rage', plate: ['#080404', '#140a0a', '#221010', '#321616', '#461e1c', '#5e2a24'], belly: ['#3a1c18', '#56281e', '#7a3a24'], seam: '#ff5a3a', gems: ['#ff5a3a', '#ffb070', '#ffe0a0'], eye: '#ff3a2a', mouth: ['#2a0604', '#ff6a2a'], teeth: ['#d8c8b0', '#fff0d8'], crest: ['#ff5a3a', '#ffb070', '#c83a20'], fin: ['#221010', '#461e1c', '#ff6a3a'], crack: ['#c83a20', '#ff6a3a', '#ffc070'] },
  };
  const palOf = (T) => ['#020204', '#ffffff'].concat(T.plate, T.belly, T.gems, T.crest, T.fin, T.mouth, T.teeth, [T.seam, T.eye, sh(T.eye, 0.5)], T.dark || [], T.crack || []);

  // ---------------- painters (pixel units, facing right) ----------------
  function ellipse(g, x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 6.283); g.fill(); }
  function poly(g, pts, col) { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); }
  // one armoured segment; R is its radius in sprite pixels; v picks the extras on its back
  function paintSeg(T, R, v, stage) {
    const w = R * 1.7 + 6, h = R * 2.9 + 6, c = mk(w, h), g = c.ctx, cx = w / 2, cy = h - R * 1.18 - 3;
    const P = T.plate, B = T.belly;
    // the dorsal piece first, so the body overlaps its root
    if (v === 0) { // a crystal / bone spine
      const col = T.crest[(R | 0) % T.crest.length], hh = R * 1.05;
      poly(g, [[cx - R * 0.32, cy - R * 0.7], [cx + R * 0.12, cy - R * 0.62 - hh], [cx + R * 0.3, cy - R * 0.72]], sh(col, -0.4));
      poly(g, [[cx - R * 0.12, cy - R * 0.72], [cx + R * 0.12, cy - R * 0.62 - hh], [cx + R * 0.3, cy - R * 0.72]], col);
      poly(g, [[cx + R * 0.02, cy - R * 0.8], [cx + R * 0.12, cy - R * 0.62 - hh], [cx + R * 0.08, cy - R * 0.84]], sh(col, 0.5));
    } else if (v === 1) { // a ragged dorsal fin
      poly(g, [[cx - R * 0.6, cy - R * 0.6], [cx - R * 0.2, cy - R * 1.35], [cx + R * 0.1, cy - R * 1.0], [cx + R * 0.4, cy - R * 1.2], [cx + R * 0.55, cy - R * 0.62]], T.fin[1]);
      for (let k = 0; k < 4; k++) { g.strokeStyle = T.fin[2]; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - R * 0.4 + k * R * 0.28, cy - R * 0.7); g.lineTo(cx - R * 0.25 + k * R * 0.22, cy - R * 1.2); g.stroke(); }
    } else { // two short knobs
      ellipse(g, cx - R * 0.25, cy - R * 0.86, R * 0.16, R * 0.2, P[4]); ellipse(g, cx + R * 0.25, cy - R * 0.84, R * 0.14, R * 0.18, P[4]);
    }
    // body: a fat armoured ring
    ellipse(g, cx, cy, R * 0.8, R, P[1]);
    ellipse(g, cx + R * 0.04, cy - R * 0.08, R * 0.72, R * 0.88, P[2]);
    ellipse(g, cx + R * 0.1, cy - R * 0.3, R * 0.56, R * 0.56, P[3]);
    ellipse(g, cx + R * 0.16, cy - R * 0.44, R * 0.34, R * 0.3, P[4]);
    if (stage === 3) { ellipse(g, cx + R * 0.05, cy + R * 0.15, R * 0.62, R * 0.55, T.dark[1]); }
    // belly plates
    g.save(); g.beginPath(); g.ellipse(cx, cy, R * 0.8, R, 0, 0, 6.283); g.clip();
    g.fillStyle = B[1]; g.fillRect(cx - R, cy + R * 0.38, R * 2, R);
    g.fillStyle = B[2]; g.fillRect(cx - R, cy + R * 0.38, R * 2, Math.max(1, R * 0.1));
    for (let k = 0; k < 3; k++) { g.fillStyle = B[0]; g.fillRect(cx - R, cy + R * (0.56 + k * 0.16), R * 2, Math.max(1, R * 0.05)); }
    // the plate's back edge: a dark crescent so the segments read as overlapping armour
    g.strokeStyle = P[0]; g.lineWidth = Math.max(1, R * 0.12); g.beginPath(); g.ellipse(cx - R * 0.72, cy, R * 0.5, R * 1.1, 0, -1.2, 1.2); g.stroke();
    g.strokeStyle = P[5]; g.lineWidth = Math.max(1, R * 0.06); g.beginPath(); g.ellipse(cx + R * 0.66, cy, R * 0.3, R * 0.95, 0, -1.1, 0.3); g.stroke();
    // stage marks
    if (stage === 1 || stage === 2) { // gem studs in a row along the back
      for (let k = 0; k < 3; k++) { const gx = cx - R * 0.4 + k * R * 0.4, gy = cy - R * 0.55 + (k % 2) * R * 0.1, s = Math.max(1.2, R * 0.12), col = T.gems[((R | 0) + k) % T.gems.length];
        poly(g, [[gx, gy - s], [gx + s, gy], [gx, gy + s], [gx - s, gy]], col); g.fillStyle = '#ffffff'; g.fillRect(Math.round(gx - s * 0.3), Math.round(gy - s * 0.5), 1, 1); }
    } else if (stage === 3) { // ribs showing through
      for (let k = 0; k < 3; k++) { g.strokeStyle = T.plate[4]; g.lineWidth = Math.max(1, R * 0.08); g.beginPath(); g.arc(cx - R * 0.35 + k * R * 0.35, cy + R * 0.05, R * 0.55, -2.4, -0.7); g.stroke(); }
    } else if (stage === 4) { // glowing cracks
      g.strokeStyle = T.crack[1]; g.lineWidth = Math.max(1, R * 0.06); g.beginPath(); g.moveTo(cx - R * 0.5, cy - R * 0.5); g.lineTo(cx - R * 0.15, cy - R * 0.1); g.lineTo(cx - R * 0.3, cy + R * 0.3); g.moveTo(cx + R * 0.2, cy - R * 0.7); g.lineTo(cx + R * 0.35, cy - R * 0.25); g.lineTo(cx + R * 0.15, cy + R * 0.05); g.stroke();
      g.strokeStyle = T.crack[2]; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - R * 0.45, cy - R * 0.45); g.lineTo(cx - R * 0.17, cy - R * 0.12); g.stroke();
    }
    // the glowing seam along the flank
    g.fillStyle = T.seam; g.fillRect(cx - R * 0.8, cy + R * 0.1, R * 1.6, Math.max(1, R * 0.07));
    g.restore();
    VA.finish(c, palOf(T)); c.cy = cy; c.cx = cx; return c;
  }
  // the head, facing right; jaw 0 closed .. 2 wide open
  function paintHead(T, R, jaw, stage) {
    const w = R * 4.4 + 8, h = R * 3.6 + 8, c = mk(w, h), g = c.ctx, cx = R * 1.3 + 4, cy = h * 0.46;
    const P = T.plate, open = [0.05, 0.32, 0.6][jaw];
    // swept-back horns / crest
    poly(g, [[cx - R * 0.2, cy - R * 0.7], [cx - R * 1.4, cy - R * 1.65], [cx - R * 0.6, cy - R * 0.95], [cx + R * 0.3, cy - R * 0.85]], T.crest[0]);
    poly(g, [[cx + R * 0.3, cy - R * 0.75], [cx - R * 0.7, cy - R * 1.45], [cx - R * 0.1, cy - R * 0.85], [cx + R * 0.8, cy - R * 0.8]], T.crest[1 % T.crest.length]);
    // lower jaw, turned open about its hinge
    g.save(); g.translate(cx - R * 0.3, cy + R * 0.15); g.rotate(open);
    poly(g, [[0, -R * 0.2], [R * 2.6, -R * 0.05], [R * 2.9, R * 0.15], [R * 2.2, R * 0.55], [R * 0.5, R * 0.75], [-R * 0.4, R * 0.4]], P[2]);
    poly(g, [[R * 0.2, R * 0.35], [R * 2.3, R * 0.3], [R * 1.9, R * 0.55], [R * 0.5, R * 0.68]], T.belly[1]);
    if (open > 0.1) { poly(g, [[0, -R * 0.2], [R * 2.6, -R * 0.05], [R * 2.4, R * 0.1], [R * 0.2, R * 0.05]], T.mouth[1]); }
    for (let k = 0; k < 7; k++) poly(g, [[R * (0.5 + k * 0.32), -R * 0.12], [R * (0.62 + k * 0.32), -R * 0.45], [R * (0.74 + k * 0.32), -R * 0.1]], T.teeth[1]);
    g.restore();
    // mouth hollow
    if (open > 0.1) poly(g, [[cx - R * 0.3, cy + R * 0.1], [cx + R * 2.7, cy + R * 0.05], [cx + R * 2.4, cy + R * (0.2 + open * 1.4)], [cx, cy + R * (0.25 + open * 0.9)]], T.mouth[0]);
    // the skull: round at the back, a long tapering snout
    poly(g, [[cx - R * 1.1, cy - R * 0.2], [cx - R * 0.8, cy - R * 0.85], [cx + R * 0.4, cy - R * 0.95], [cx + R * 2.2, cy - R * 0.55], [cx + R * 3.0, cy - R * 0.1], [cx + R * 2.8, cy + R * 0.12], [cx + R * 0.2, cy + R * 0.22], [cx - R * 0.9, cy + R * 0.5]], P[2]);
    poly(g, [[cx - R * 0.7, cy - R * 0.7], [cx + R * 0.4, cy - R * 0.82], [cx + R * 2.1, cy - R * 0.45], [cx + R * 0.6, cy - R * 0.42], [cx - R * 0.5, cy - R * 0.3]], P[3]);
    poly(g, [[cx - R * 0.3, cy - R * 0.72], [cx + R * 1.2, cy - R * 0.68], [cx + R * 0.5, cy - R * 0.56]], P[4]);
    if (stage === 3) { // a bare skull: dark hollows
      ellipse(g, cx + R * 2.5, cy - R * 0.25, R * 0.14, R * 0.08, T.dark[0]); ellipse(g, cx + R * 0.75, cy - R * 0.32, R * 0.36, R * 0.26, T.dark[0]); // a nostril and a deep eye socket
    }
    // upper teeth
    for (let k = 0; k < 8; k++) poly(g, [[cx + R * (0.1 + k * 0.33), cy + R * 0.12], [cx + R * (0.22 + k * 0.33), cy + R * 0.48], [cx + R * (0.34 + k * 0.33), cy + R * 0.12]], T.teeth[1]);
    // brow ridge and the eye
    poly(g, [[cx + R * 0.1, cy - R * 0.62], [cx + R * 1.1, cy - R * 0.5], [cx + R * 0.95, cy - R * 0.36], [cx + R * 0.15, cy - R * 0.44]], P[0]);
    ellipse(g, cx + R * 0.75, cy - R * 0.32, R * 0.26, R * 0.16, '#020204');
    ellipse(g, cx + R * 0.78, cy - R * 0.33, R * 0.18, R * 0.1, T.eye);
    g.fillStyle = sh(T.eye, 0.5); g.fillRect(Math.round(cx + R * 0.72), Math.round(cy - R * 0.38), Math.max(1, R * 0.06), Math.max(1, R * 0.06));
    if (stage === 1) g.fillStyle = '#020204', g.fillRect(Math.round(cx + R * 0.76), Math.round(cy - R * 0.42), 1, Math.max(1, R * 0.18)); // a slit pupil
    // gill slits and a cheek plate
    for (let k = 0; k < 3; k++) { g.strokeStyle = P[0]; g.lineWidth = Math.max(1, R * 0.07); g.beginPath(); g.arc(cx - R * 0.55 + k * R * 0.22, cy, R * 0.35, -0.9, 0.9); g.stroke(); }
    if (stage === 4) { g.strokeStyle = T.crack[1]; g.lineWidth = Math.max(1, R * 0.07); g.beginPath(); g.moveTo(cx - R * 0.4, cy - R * 0.6); g.lineTo(cx + R * 0.3, cy - R * 0.3); g.lineTo(cx + R * 0.1, cy); g.moveTo(cx + R * 1.4, cy - R * 0.5); g.lineTo(cx + R * 1.7, cy - R * 0.2); g.stroke(); }
    // whisker barbels
    g.strokeStyle = T.fin[2]; g.lineWidth = Math.max(1, R * 0.06); g.beginPath(); g.moveTo(cx + R * 2.6, cy + R * 0.1); g.quadraticCurveTo(cx + R * 2.2, cy + R * 0.9, cx + R * 1.5, cy + R * 1.2); g.stroke();
    VA.finish(c, palOf(T)); c.cx = cx; c.cy = cy; return c;
  }
  function paintTail(T, R) {
    const w = R * 4 + 8, h = R * 4 + 8, c = mk(w, h), g = c.ctx, cx = w - R - 4, cy = h / 2;
    for (let k = -3; k <= 3; k++) { const a = Math.PI + k * 0.24, L = R * (3.2 - Math.abs(k) * 0.25); poly(g, [[cx, cy - R * 0.25], [cx + Math.cos(a - 0.1) * L, cy + Math.sin(a - 0.1) * L], [cx + Math.cos(a + 0.1) * L, cy + Math.sin(a + 0.1) * L], [cx, cy + R * 0.25]], k % 2 ? T.fin[1] : T.fin[0]); }
    for (let k = -3; k <= 3; k++) { const a = Math.PI + k * 0.24, L = R * (3.1 - Math.abs(k) * 0.25); g.strokeStyle = T.fin[2]; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); g.stroke(); }
    ellipse(g, cx, cy, R * 0.9, R * 0.8, T.plate[2]); ellipse(g, cx + R * 0.1, cy - R * 0.2, R * 0.5, R * 0.4, T.plate[3]);
    VA.finish(c, palOf(T)); c.cx = cx; c.cy = cy; return c;
  }
  // a big pectoral fin, hanging back and down from a segment
  function paintFin(T, R) {
    const w = R * 3 + 6, h = R * 2.2 + 6, c = mk(w, h), g = c.ctx, x0 = w - 4, y0 = 4;
    poly(g, [[x0, y0], [x0 - R * 2.8, y0 + R * 1.2], [x0 - R * 2.2, y0 + R * 1.9], [x0 - R * 1.2, y0 + R * 1.5], [x0 - R * 0.3, y0 + R * 0.7]], T.fin[1]);
    for (let k = 0; k < 5; k++) { g.strokeStyle = T.fin[2]; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - R * (2.7 - k * 0.45), y0 + R * (1.3 + k * 0.1)); g.stroke(); }
    poly(g, [[x0, y0], [x0 - R * 2.8, y0 + R * 1.2], [x0 - R * 2.4, y0 + R * 1.25]], T.fin[0]);
    VA.finish(c, palOf(T)); c.ox = x0; c.oy = y0; return c;
  }

  // ---------------- cache ----------------
  const cache = new Map();
  function sprite(kind, stage, R, v) {
    const key = kind + stage + ':' + R + ':' + (v || 0); let c = cache.get(key); if (c) return c;
    const T = THEMES[stage] || THEMES[1];
    c = kind === 'seg' ? paintSeg(T, R, v, stage) : kind === 'head' ? paintHead(T, R, v, stage) : kind === 'tail' ? paintTail(T, R) : paintFin(T, R);
    cache.set(key, c); return c;
  }
  const bucket = (r) => Math.max(4, Math.round(r / PX / 3) * 3); // segment radius in sprite pixels, in steps of 3

  // ---------------- drawing ----------------
  const stageOf = (b) => { const f = (b.fx || []).find((q) => q.type === 'v3stage'); return b.stage || (f && f.x) || (b.phase === 3 ? 4 : b.phase === 2 ? 2 : 1); };
  function drawRot(g, img, x, y, ang, ax, ay, flip) {
    g.save(); g.translate(x, y); g.rotate(ang); if (flip) g.scale(1, -1); g.scale(PX, PX); g.drawImage(img, -ax, -ay); g.restore();
  }
  function draw(g, b, ox, oy, time) {
    const stage = stageOf(b), dead = b.dead, dt0 = dead ? (b.deadT || 0) : 0, segs = b.segs, n = segs.length;
    const flash = b.hitT > 0 ? Math.min(1, b.hitT / 0.15) : 0;
    const h = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
    g.save(); if (dead) g.globalAlpha = Math.max(0, 1 - Math.max(0, dt0 - 1.8) / 1.6);
    const pos = (i) => {
      const s = i < 0 ? h : segs[i]; let x = s.x, y = s.y;
      if (dead && i >= 0) { const k = Math.max(0, dt0 - (n - i) * 0.05); x += Math.sin(i * 2.1) * k * 30 * K; y += k * k * 40 * K + Math.cos(i * 1.7) * k * 12 * K; }
      // a slow travelling ripple, for life
      if (!dead && i >= 2) { const prev = segs[i - 1], ax = s.x - prev.x, ay = s.y - prev.y, L = Math.hypot(ax, ay) || 1, wv = Math.sin(time * 3.4 - i * 0.45) * Math.min(5 * K, i * 0.4 * K); x -= (ay / L) * wv; y += (ax / L) * wv; }
      return { x, y };
    };
    const P = []; for (let i = -1; i < n; i++) P.push(pos(i));
    const angAt = (i) => { const a = P[i + 1], q = P[i]; return Math.atan2(q.y - a.y, q.x - a.x); }; // toward the head
    // tail fan
    { const i = n - 1, a = angAt(i), p = P[i + 1], R = bucket(segR(i) * 0.9), t = sprite('tail', stage, R);
      drawRot(g, t, p.x + ox, p.y + oy, a, t.cx, t.cy, Math.cos(a) < 0); }
    // segments, tail first so each one overlaps the one behind it
    for (let i = n - 1; i >= 0; i--) {
      const p = P[i + 1], a = angAt(i), R = bucket(segR(i)), v = i % 4 === 1 ? 1 : i % 2 === 0 ? 0 : 2, s = sprite('seg', stage, R, v), flip = Math.cos(a) < 0;
      drawRot(g, s, p.x + ox, p.y + oy, a, s.cx, s.cy, flip);
      if (i === 3 || i === 9) { const f = sprite('fin', stage, Math.round(R * 0.9)), row = Math.sin(time * 4 + i) * 0.18; drawRot(g, f, p.x + ox, p.y + oy, a + (flip ? -row : row), f.ox, f.oy - R * 0.3, flip); }
      if (flash) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45 * flash; drawRot(g, s, p.x + ox, p.y + oy, a, s.cx, s.cy, flip); g.restore(); }
    }
    // head, jaw by the fight's state
    { const a = b.ang || 0, jaw = (b.jaw || 0) < 0.15 ? 0 : (b.jaw || 0) < 0.42 ? 1 : 2, R = bucket(segR(0) * 1.15), s = sprite('head', stage, R, jaw), flip = Math.cos(a) < 0;
      const p = P[0]; drawRot(g, s, p.x + ox, p.y + oy, a, s.cx, s.cy, flip);
      if (flash) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45 * flash; drawRot(g, s, p.x + ox, p.y + oy, a, s.cx, s.cy, flip); g.restore(); } }
    // the crystal shield: a shimmering pixel ring around every third plate
    if ((b.shield || (b.fx || []).some((f) => f.type === 'v3shield')) && !dead) {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i += 3) { const p = P[i + 1], r = segR(i) * 1.25, a = 0.18 + 0.12 * Math.sin(time * 3 + i * 0.3); g.fillStyle = 'rgba(160,230,255,' + a.toFixed(3) + ')';
        for (let k = 0; k < 16; k++) { const an = k / 16 * 6.283 + time * 0.6; g.fillRect(Math.round(p.x + ox + Math.cos(an) * r) - PX, Math.round(p.y + oy + Math.sin(an) * r) - PX, PX * 2, PX * 2); } }
      g.globalCompositeOperation = 'source-over';
    }
    g.restore(); g.imageSmoothingEnabled = sm;
  }
  RW.v3levDraw = draw;
  RW.v3levArt = { sprite, THEMES, PX, paintSeg, paintHead, paintTail, paintFin, stageOf };

  // ---------------- the chamber is pitch black (set after v3s6's cave light) ----------------
  const RDEF = RW.WORLDS && RW.WORLDS.rock;
  if (RDEF && RDEF.ambientAt) {
    const bAmb = RDEF.ambientAt;
    RDEF.ambientAt = function (x, y) {
      const c = WD.meta && WD.meta.arena;
      if (c && WD.def && WD.def.id === 'rock') { const dx = (x - c.cx) / (c.rx + 3), dy = (y - c.cy) / (c.ry + 3); if (dx * dx + dy * dy <= 1) return 0; }
      return bAmb.apply(this, arguments);
    };
  }
})(window.RW);
