// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   LÚTUT RIDER — js/lr_art_tw.js
   The ride drawn the way Four Brothers: Tuftwood is painted
   (mini-games/tuftwood/src/paint.js, scenery.js, sky.js, heroes.js):
   smooth vector shapes, a clean warm dark-brown ink line round
   everything, soft gradients lit from the upper left, painterly
   dabs, fuzzy pom-pom trees, warm earth with strata, roots and
   inked pebbles under a three-tone grass line with hanging turf,
   swaying grass blades in front, glossy storybook eyes, soft glow
   clouds and light shafts, a paper grain over it all, and words in
   Gaegu.

   Same calls as js/lr_art.js (the 4 Brothers pixel look), so the
   game can switch between them: LR.looks.storybook.
   ============================================================ */
(function () {
  'use strict';
  const LR = window.LR;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const A = {};
  LR.looks = LR.looks || {};
  LR.looks.storybook = A;
  const INK = '#3a2a22';
  const FONT = '"Gaegu", "Comic Sans MS", cursive';

  /* ---------------- colour and paint ---------------- */
  const hx = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const toHex = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = hx(a), y = hx(b); return toHex([0, 1, 2].map(i => x[i] + (y[i] - x[i]) * t)); };
  const rgba = (h, a) => { const c = hx(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  A.mix = mix;
  const ell = (g, x, y, rx, ry, fill, rot) => { g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU); g.fillStyle = fill; g.fill(); };
  const glow = (g, x, y, r, col, a) => { if (r <= 0) return; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a == null ? 1 : a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const ball = (g, x, y, rx, ry, light, base, dark) => {
    const gr = g.createRadialGradient(x - rx * 0.35, y - ry * 0.45, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.15);
    gr.addColorStop(0, light); gr.addColorStop(0.55, base); gr.addColorStop(1, dark); ell(g, x, y, rx, ry, gr);
  };
  const lin = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of stops) gr.addColorStop(s[0], s[1]); return gr; };
  const stroke = (g, w, col) => { g.strokeStyle = col || INK; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); };
  const blobPath = (g, pts) => {
    const n = pts.length; g.beginPath();
    g.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    g.closePath();
  };
  /* a glossy storybook eye; iris sets the colour (the Lútut's glow yellow) */
  const eye = (g, x, y, r, open, iris) => {
    open = open == null ? 1 : open;
    if (open < 0.15) { g.beginPath(); g.moveTo(x - r, y); g.quadraticCurveTo(x, y + r * 0.35, x + r, y); stroke(g, r * 0.35, '#2a1c18'); return; }
    if (iris) { glow(g, x, y, r * 2, iris, 0.45); ball(g, x, y, r * 0.95, r * open, '#fff6b0', iris, '#b07810'); ell(g, x + r * 0.15, y, r * 0.22, r * 0.62 * open, '#1d1412'); }
    else ell(g, x, y, r * 0.86, r * open, '#1d1412');
    ell(g, x - r * 0.28, y - r * 0.38 * open, r * 0.3, r * 0.3 * open, '#fff');
    ell(g, x + r * 0.3, y + r * 0.35 * open, r * 0.14, r * 0.14 * open, 'rgba(255,255,255,.7)');
  };
  const rnd = s => LR.rng(s);

  /* paper grain, laid over the whole picture */
  let grain = null;
  function grainTile() {
    if (grain) return grain;
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const d = g.createImageData(256, 256), r = rnd(77);
    for (let i = 0; i < d.data.length; i += 4) { const v = 118 + r() * 20 + (r() < 0.02 ? 30 : 0); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
    g.globalAlpha = 0.07; g.strokeStyle = '#fff';
    for (let i = 0; i < 60; i++) { g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 14); g.stroke(); }
    return (grain = c);
  }

  /* ---------------- each region, painted ---------------- */
  /* sky: top, middle, bottom (Tuftwood's own times of day); earth: top, under, deep; grass: dark, mid, light, turf */
  const PAL = {
    downs: { sky: ['#3b97dc', '#86cdf0', '#dff5f2'], sun: 1, earth: ['#a8703f', '#7d4c2c', '#3b2319'], grass: ['#2c5c30', '#58a844', '#b6de63', '#3f8a3c'], hills: ['#9cc8d8', '#7fb08a', '#5f9a5a'], pom: 'green' },
    road: { sky: ['#4b8fcf', '#a9cfe0', '#fbe2ae'], sun: 1, gold: 0.6, earth: ['#a8703f', '#7d4c2c', '#3b2319'], grass: ['#2c5c30', '#4f9a3c', '#a9d85e', '#3a7a36'], hills: ['#c8b0a8', '#8aa878', '#4e8a4a'], pom: 'dark' },
    canyon: { sky: ['#5d4c92', '#e07f8a', '#ff9a6e'], sun: 1, gold: 1, earth: ['#c98a58', '#9a5a34', '#4a2416'], grass: ['#7a4a2a', '#c88a58', '#efd9a8', '#a86a3e'], hills: ['#c88a8a', '#b06a58', '#8a4a38'], pom: 'gold' },
    marsh: { sky: ['#141a44', '#2a2a5e', '#3e3a6c'], night: 1, earth: ['#6f5a52', '#4a3a38', '#2a2026'], grass: ['#1e3a2a', '#3a6a44', '#6a9a5a', '#2a5034'], hills: ['#2e3460', '#283a48', '#22352e'], pom: 'dark' },
    ridge: { sky: ['#77838f', '#a3adb3', '#c6ced0'], sun: 0.4, earth: ['#8a7e70', '#5e554a', '#2e2a26'], grass: ['#3a5a3a', '#6a8a5a', '#a8c088', '#4a6a44'], hills: ['#9aa4ac', '#7a8890', '#5a6a6a'], pom: 'dark' },
  };
  const POM = { dark: ['#3a7446', '#28583a', '#1b4130', '#122c20'], green: ['#cfe86a', '#7cbf45', '#3c8540', '#27533a'], pink: ['#ffd9df', '#f59bb4', '#c95f86', '#7a3a5c'], gold: ['#ffe9a0', '#f2b544', '#c9782c', '#7a4320'] };

  /* ================= the camera (the same as the pixel look) ================= */
  A.makeView = () => ({ k: 18, cx: 0, cy: 0, shake: 0, W: 1, H: 1, sx: 0, sy: 0 });
  A.follow = function (view, run, W, H, dt, snap) {
    view.W = W; view.H = H;
    const gh = run.land.h(run.x), hag = Math.max(0, run.y - gh);
    const v = Math.hypot(run.vx, run.vy);
    const span = clamp(Math.max(12 + v * 0.28, hag * 1.2 + 10), 12, 95);
    const k = Math.min(Math.sqrt(W * H) * 0.92 / span, H / (hag * 1.15 + 9));
    const cx = run.x + clamp(run.vx, -10, 40) * 0.45 + W * 0.12 / k;
    const cy = lerp(run.y, gh, clamp(hag / (span * 0.9), 0, 0.5)) + span * 0.06;
    const s = snap ? 1 : 1 - Math.exp(-dt * 4);
    view.k = lerp(view.k, k, snap ? 1 : 1 - Math.exp(-dt * 1.6));
    view.cx = lerp(view.cx, cx, s); view.cy = lerp(view.cy, cy, s);
    view.shake = Math.max(0, view.shake - dt * 2.5);
  };
  const X = (v, x) => (x - v.cx) * v.k + v.W * 0.5 + v.sx;
  const Y = (v, y) => v.H * 0.5 - (y - v.cy) * v.k + v.sy;

  /* ================= soft painted specks ================= */
  A.fx = [];
  A.burst = function (kind, x, y, n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const a = (o.dir != null ? o.dir : Math.PI / 2) + (Math.random() - 0.5) * (o.spread || 2.4), s = (o.speed || 6) * (0.4 + Math.random() * 0.8);
      A.fx.push({ kind, x, y, vx: Math.cos(a) * s + (o.vx || 0), vy: Math.sin(a) * s + (o.vy || 0), life: (o.life || 0.9) * (0.6 + Math.random() * 0.6), age: 0,
        size: (o.size || 0.25) * (0.6 + Math.random() * 0.8), col: o.col || '#ffffff', rot: Math.random() * TAU, av: (Math.random() - 0.5) * 8, g: o.g != null ? o.g : 1 });
    }
  };
  A.popText = [];
  A.pop = (text, x, y, col) => A.popText.push({ text, x, y, col: col || '#fff7e0', age: 0 });
  function stepFx(dt, land) {
    for (const p of A.fx) {
      p.age += dt; p.vy -= 9.8 * p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.av * dt;
      if (p.g && land && p.y < land.h(p.x)) { p.y = land.h(p.x); p.vy *= -0.3; p.vx *= 0.6; }
    }
    A.fx = A.fx.filter(p => p.age < p.life);
    for (const p of A.popText) { p.age += dt; p.y += dt * 2.2; }
    A.popText = A.popText.filter(p => p.age < 1.6);
  }

  /* ================= sky ================= */
  const clouds = Array.from({ length: 8 }, (_, i) => ({ u: i * 380 + LR.hash(9, i) * 200, h: 0.08 + LR.hash(11, i) * 0.3, s: 0.6 + LR.hash(13, i) * 1.1, k: i }));
  function sky(g, v, P, t) {
    const { W, H } = v;
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, P.sky[0]], [0.55, P.sky[1]], [1, P.sky[2]]]); g.fillRect(0, 0, W, H);
    if (P.night) {
      g.fillStyle = '#fff';
      for (let i = 0; i < 110; i++) { const x = ((LR.hash(5, i) * W * 1.4 - v.cx * 0.3) % W + W) % W, y = LR.hash(7, i) * H * 0.7, r = 0.6 + LR.hash(3, i) * 1.4; g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      const mx = W * 0.78, my = H * 0.2, mr = H * 0.05;
      glow(g, mx, my, mr * 4, '#c8d0ff', 0.25); ball(g, mx, my, mr, mr, '#fbfbff', '#dfe3f6', '#aab0d0');
      ell(g, mx - mr * 0.3, my - mr * 0.1, mr * 0.18, mr * 0.15, 'rgba(150,156,190,.5)'); ell(g, mx + mr * 0.3, my + mr * 0.35, mr * 0.12, mr * 0.1, 'rgba(150,156,190,.5)');
    } else {
      const sx = W * 0.78, sy = H * (P.gold ? 0.34 : 0.2), sr = H * 0.045;
      glow(g, sx, sy, sr * 7, P.gold ? '#ffcf8a' : '#fff4c8', 0.55 * (P.sun || 1)); ell(g, sx, sy, sr, sr, P.gold ? '#fff0c0' : '#fffbe6');
      /* light shafts slanting down */
      g.save(); g.globalAlpha = 0.07 * (P.sun || 1); g.fillStyle = '#fffbe0';
      for (let i = 0; i < 4; i++) { const x = W * (0.15 + i * 0.22) - (v.cx * 0.6) % 60; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + W * 0.07, 0); g.lineTo(x - W * 0.12, H); g.lineTo(x - W * 0.2, H); g.closePath(); g.fill(); }
      g.restore();
    }
    /* soft clouds made of glows */
    for (const c of clouds) {
      const span = W + 700, x = ((c.u - v.cx * v.k * 0.03 - t * 7) % span + span) % span - 350, y = H * c.h, s = c.s * H * 0.07;
      for (let i = 0; i < 7; i++) { const ox = (LR.hash(c.k, i) - 0.5) * s * 4.4, oy = (LR.hash(c.k + 50, i) - 0.3) * s * 0.7, r = s * (0.8 + LR.hash(c.k + 90, i)); glow(g, x + ox, y + oy, r * 1.3, P.night ? '#8a8ab8' : '#ffffff', P.night ? 0.18 : 0.8); }
      for (let i = 0; i < 4; i++) glow(g, x + (LR.hash(c.k + 7, i) - 0.5) * s * 3.6, y + s * 0.45, s * 1.1, P.night ? '#2a2a50' : '#9fb4d8', 0.25);
    }
  }
  /* far hills: soft rounded layers, with pale pom trees on the nearer ones */
  function hills(g, v, P, i, par, base, amp, seed, poms) {
    const { W, H } = v, col = P.hills[i], shift = v.cx * 18 * par, lift = clamp((v.cy - 20) * 18 * par * 0.12, -H * 0.1, H * 0.1);
    const yAt = px => { const u = (px + shift) / 300; const n = 0.65 * LR.noise(seed, u) + 0.35 * LR.noise(seed + 5, u * 2.3); return H * base - (n * 0.5 + 0.5) * H * amp + lift; };
    if (poms) {
      const c = POM[P.pom];
      for (let px = -((shift) % 90) - 90; px < W + 90; px += 90) {
        const id = Math.round((px + shift) / 90), hh = LR.hash(seed, id); if (hh < 0.35) continue;
        const r = H * (0.03 + hh * 0.025), y = yAt(px) - r * 0.6;
        g.globalAlpha = 0.55; ball(g, px, y, r, r * 0.95, mix(c[0], col, 0.5), mix(c[1], col, 0.6), mix(c[2], col, 0.6)); g.globalAlpha = 1;
      }
    }
    g.beginPath(); g.moveTo(0, H);
    for (let px = 0; px <= W + 10; px += 10) g.lineTo(px, yAt(px));
    g.lineTo(W, H); g.closePath();
    g.fillStyle = lin(g, 0, H * (base - amp), 0, H, [[0, mix(col, '#ffffff', 0.12)], [1, mix(col, P.sky[2], 0.3)]]); g.fill();
  }

  /* ================= the land ================= */
  function ground(g, v, run, P, t) {
    const land = run.land, k = v.k, W = v.W, H = v.H;
    const x0 = v.cx - W * 0.5 / k - 3, x1 = v.cx + W * 0.5 / k + 3, step = Math.max(0.25, 4 / k);
    const path = off => { g.beginPath(); g.moveTo(X(v, x0), Y(v, land.h(x0) - off)); for (let x = x0; x <= x1 + step; x += step) g.lineTo(X(v, x), Y(v, land.h(x) - off)); };
    /* earth, warm at the top, darker deep down */
    path(0); g.lineTo(X(v, x1 + step), H + 20); g.lineTo(X(v, x0), H + 20); g.closePath();
    const gy = Y(v, land.h(v.cx));
    g.fillStyle = lin(g, 0, gy - 30, 0, gy + 22 * k, [[0, P.earth[0]], [0.22, P.earth[1]], [1, P.earth[2]]]); g.fill();
    g.save(); g.clip();
    /* painted strata, inked pebbles, roots, all fixed to the land */
    const a = Math.floor(x0 / 4), b = Math.ceil(x1 / 4);
    for (let i = a; i <= b; i++) {
      const h1 = LR.hash(31, i), h2 = LR.hash(37, i), h3 = LR.hash(41, i), wx = i * 4 + h1 * 4, top = land.h(wx);
      ell(g, X(v, wx), Y(v, top - 2.5 - h2 * 18), k * (1.2 + h3 * 2.4), k * (0.25 + h1 * 0.35), h3 < 0.5 ? 'rgba(255,214,160,.10)' : 'rgba(30,14,10,.16)', (h2 - 0.5) * 0.3);
      if (h2 < 0.32) {
        const px = X(v, wx + 1.3), py = Y(v, top - 3 - h3 * 14), rr = k * (0.35 + h1 * 0.5);
        ball(g, px, py, rr * 1.25, rr, '#cbb9a4', '#8f7c6c', '#5a4a42');
        g.beginPath(); g.ellipse(px, py, rr * 1.25, rr, 0, 0, TAU); stroke(g, Math.max(1, k * 0.09), rgba('#2a1a14', 0.7));
      }
      if (h1 > 0.86 && !land.cutAt(wx)) {
        const rx = X(v, wx), ry = Y(v, top - 0.8);
        g.beginPath(); g.moveTo(rx, ry); g.bezierCurveTo(rx + k * 0.6, ry + k * 2, rx - k * 1.2 + h2 * k * 2.4, ry + k * 3.6, rx - k * 1.5 + h3 * k * 3, ry + k * (5 + h2 * 3));
        stroke(g, Math.max(1.2, k * (0.15 + h3 * 0.1)), rgba('#3a2216', 0.55));
      }
    }
    g.restore();
    /* chasms: the dark below */
    for (const sg of land.segsIn(x0, x1)) {
      const c = sg.cut; if (!c) continue;
      if (c.kind === 'chasm') { g.fillStyle = lin(g, 0, Y(v, c.rim - 2), 0, Y(v, c.rim - 30), [[0, 'rgba(14,8,12,0)'], [1, 'rgba(14,8,12,.95)']]); g.fillRect(X(v, c.a - 2.6), Y(v, c.rim - 2), (c.w + 5.2) * k, H); }
    }
    /* turf hanging over the earth, then the three-tone grass line */
    const grassy = x => !land.cutAt(x);
    for (let i = Math.floor(x0 / 0.8); i <= Math.ceil(x1 / 0.8); i++) {
      const wx = i * 0.8; if (!grassy(wx)) continue;
      ell(g, X(v, wx + LR.hash(3, i) * 0.2), Y(v, land.h(wx) - 0.45), k * 0.55, k * (0.45 + LR.hash(5, i) * 0.3), P.grass[3]);
    }
    const run3 = (off, w, col) => { path(off); stroke(g, Math.max(1, w * k), col); };
    run3(-0.2, 0.85, P.grass[0]); run3(-0.1, 0.58, P.grass[1]); run3(0.07, 0.22, P.grass[2]);
  }
  /* blades of grass in front of everything, swaying */
  function blades(g, v, run, P, t) {
    const land = run.land, k = v.k, x0 = v.cx - v.W * 0.5 / k - 2, x1 = v.cx + v.W * 0.5 / k + 2;
    const wind = land.wind(v.cx, t) * 0.04 + 0.3;
    for (let pass = 0; pass < 2; pass++) {
      g.strokeStyle = pass ? P.grass[2] : P.grass[1]; g.lineWidth = Math.max(1, k * (pass ? 0.1 : 0.15)); g.lineCap = 'round'; g.beginPath();
      for (let i = Math.floor(x0 / 0.65); i <= Math.ceil(x1 / 0.65); i++) {
        if ((i & 1) !== pass) continue;
        const wx = i * 0.65 + LR.hash(17, i) * 0.45; if (land.cutAt(wx)) continue;
        const x = X(v, wx), y = Y(v, land.h(wx)) + k * 0.12, h = k * (0.55 + LR.hash(19, i) * 0.65), sw = (Math.sin(t * 1.6 - wx * 0.22) * 0.6 + wind) * k * 0.3;
        g.moveTo(x - k * 0.2, y); g.quadraticCurveTo(x - k * 0.15 + sw * 0.4, y - h * 0.6, x - k * 0.25 + sw, y - h * 0.8);
        g.moveTo(x, y); g.quadraticCurveTo(x + sw * 0.5, y - h * 0.7, x + k * 0.05 + sw * 1.2, y - h);
        g.moveTo(x + k * 0.2, y); g.quadraticCurveTo(x + k * 0.2 + sw * 0.4, y - h * 0.5, x + k * 0.35 + sw, y - h * 0.7);
      }
      g.stroke();
    }
  }
  /* marsh pools: a pond with glints */
  function pools(g, v, run, t) {
    const k = v.k;
    for (const sg of run.land.segsIn(v.cx - v.W / k, v.cx + v.W / k)) {
      const c = sg.cut; if (!c || c.kind !== 'pool') continue;
      const xa = X(v, c.a - 3), xb = X(v, c.b + 3), top = Y(v, c.rim), bot = Y(v, c.rim - c.depth);
      g.save(); g.beginPath(); g.moveTo(xa, top);
      for (let x = c.a - 3; x <= c.b + 3; x += 0.5) g.lineTo(X(v, x), Math.max(top, Y(v, run.land.h(x))));
      g.closePath(); g.clip();
      g.fillStyle = lin(g, 0, top, 0, bot, [[0, '#3a5a8a'], [0.4, '#22365a'], [1, '#121c30']]); g.fillRect(xa, top, xb - xa, bot - top + 4);
      g.globalAlpha = 0.5; g.strokeStyle = '#a8c8f0'; g.lineWidth = Math.max(1, k * 0.08); g.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const u = ((LR.hash(i, c.a | 0) + t * 0.03 * (i % 2 ? 1 : -1)) % 1 + 1) % 1, x = lerp(xa, xb, u), y = top + k * (0.3 + (i % 3) * 0.5); g.beginPath(); g.moveTo(x, y); g.lineTo(x + k * (0.8 + (i % 2)), y); g.stroke(); }
      g.globalAlpha = 1; g.restore();
      g.beginPath(); g.moveTo(xa + k, top); g.lineTo(xb - k, top); stroke(g, Math.max(1, k * 0.12), 'rgba(200,225,255,.55)');
    }
  }
  /* the roost: a plump hollow stump with a thatch mop, round windows and door */
  function roost(g, v, land) {
    const k = v.k, cx = X(v, -9), base = Y(v, land.H0);
    if (cx < -k * 12 || cx > v.W + k * 12) return;
    const w = k * 4.6, h = k * 5.2;
    g.beginPath(); g.moveTo(cx - w * 1.15, base); g.quadraticCurveTo(cx - w * 1.02, base - h * 0.5, cx - w * 0.92, base - h); g.lineTo(cx + w * 0.92, base - h); g.quadraticCurveTo(cx + w * 1.02, base - h * 0.5, cx + w * 1.15, base); g.closePath();
    g.fillStyle = lin(g, cx - w, 0, cx + w, 0, [[0, '#c98f5a'], [0.45, '#9a6238'], [1, '#5c3721']]); g.fill();
    g.save(); g.clip(); for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(cx + i * w * 0.22, base - h); g.quadraticCurveTo(cx + i * w * 0.24 + k * 0.2, base - h * 0.5, cx + i * w * 0.25, base); stroke(g, Math.max(1, k * 0.12), 'rgba(58,34,22,.35)'); } g.restore();
    g.beginPath(); g.moveTo(cx - w * 1.15, base); g.quadraticCurveTo(cx - w * 1.02, base - h * 0.5, cx - w * 0.92, base - h); g.lineTo(cx + w * 0.92, base - h); g.quadraticCurveTo(cx + w * 1.02, base - h * 0.5, cx + w * 1.15, base); stroke(g, Math.max(1.5, k * 0.16));
    /* thatch mop */
    const pts = []; for (let i = 0; i < 18; i++) { const a = Math.PI + (i / 17) * Math.PI, rr = (i % 2 ? 1.06 : 0.96); pts.push([cx + Math.cos(a) * w * 1.12 * rr, base - h + Math.sin(a) * h * 0.42 * rr]); }
    pts.push([cx + w * 1.1, base - h + k * 0.5]); pts.push([cx - w * 1.1, base - h + k * 0.5]);
    blobPath(g, pts); g.fillStyle = lin(g, 0, base - h * 1.45, 0, base - h + k * 0.5, [[0, '#f0cf78'], [1, '#c8963e']]); g.fill(); stroke(g, Math.max(1.5, k * 0.16));
    g.save(); blobPath(g, pts); g.clip(); for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(cx + i * w * 0.13, base - h - h * 0.4); g.lineTo(cx + i * w * 0.15, base - h + k * 0.4); stroke(g, Math.max(1, k * 0.07), 'rgba(140,90,30,.4)'); } g.restore();
    /* door, windows */
    g.beginPath(); g.moveTo(cx - k * 0.9, base); g.lineTo(cx - k * 0.9, base - k * 1.8); g.arc(cx, base - k * 1.8, k * 0.9, Math.PI, 0); g.lineTo(cx + k * 0.9, base); g.closePath();
    g.fillStyle = lin(g, 0, base - k * 2.7, 0, base, [[0, '#e07a68'], [1, '#a84838']]); g.fill(); stroke(g, Math.max(1.5, k * 0.14));
    for (const wx of [-2.6, 2.6]) { const px = cx + wx * k, py = base - k * 3.2; glow(g, px, py, k * 1.6, '#ffc870', 0.45); ell(g, px, py, k * 0.62, k * 0.62, '#ffd890'); g.beginPath(); g.arc(px, py, k * 0.62, 0, TAU); g.moveTo(px - k * 0.62, py); g.lineTo(px + k * 0.62, py); g.moveTo(px, py - k * 0.62); g.lineTo(px, py + k * 0.62); stroke(g, Math.max(1.2, k * 0.12)); }
  }
  /* way stones and the best-distance flag */
  function markers(g, v, run) {
    const land = run.land, k = v.k, x0 = v.cx - v.W / k, x1 = v.cx + v.W / k;
    g.textAlign = 'center';
    for (let m = Math.ceil(x0 / 250) * 250; m < x1; m += 250) {
      if (m <= 0) continue;
      const x = X(v, m), y = Y(v, land.h(m));
      g.beginPath(); g.moveTo(x - k * 0.7, y + k * 0.2); g.lineTo(x - k * 0.6, y - k * 2.4); g.quadraticCurveTo(x, y - k * 3.1, x + k * 0.6, y - k * 2.4); g.lineTo(x + k * 0.7, y + k * 0.2); g.closePath();
      g.fillStyle = lin(g, x - k, 0, x + k, 0, [[0, '#d6cfc2'], [0.5, '#a59c90'], [1, '#6e665c']]); g.fill(); stroke(g, Math.max(1.4, k * 0.13));
      g.font = '700 ' + Math.max(14, k * 1.1) + 'px ' + FONT; g.lineWidth = 4; g.strokeStyle = 'rgba(40,26,20,.75)'; g.strokeText(m + ' m', x, y - k * 3.5); g.fillStyle = '#fff7e0'; g.fillText(m + ' m', x, y - k * 3.5);
    }
    if (run.best > 30 && run.best > x0 && run.best < x1) {
      const x = X(v, run.best), y = Y(v, land.h(run.best));
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - k * 6.5); stroke(g, Math.max(2, k * 0.22)); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - k * 6.5); stroke(g, Math.max(1, k * 0.1), '#e8dcc0');
      g.beginPath(); g.moveTo(x, y - k * 6.5); g.quadraticCurveTo(x + k * 1.6, y - k * 6.9 + Math.sin(Date.now() / 300) * k * 0.2, x + k * 3, y - k * 6); g.lineTo(x, y - k * 5); g.closePath();
      g.fillStyle = lin(g, x, 0, x + k * 3, 0, [[0, '#ffe27a'], [1, '#e8a83a']]); g.fill(); stroke(g, Math.max(1.3, k * 0.12));
      g.font = '700 ' + Math.max(14, k * 1) + 'px ' + FONT; g.textAlign = 'left'; g.lineWidth = 4; g.strokeStyle = 'rgba(40,26,20,.75)'; g.strokeText('best', x + k * 0.4, y - k * 7.1); g.fillStyle = '#ffe9a0'; g.fillText('best', x + k * 0.4, y - k * 7.1);
    }
  }
  function thermals(g, v, run, t) {
    const k = v.k;
    for (const sg of run.land.segsIn(v.cx - v.W / k, v.cx + v.W / k)) for (const th of sg.thermals) {
      const gy = run.land.h(th.x);
      for (let i = 0; i < 10; i++) { const ph = (t * 0.35 + LR.hash(th.x | 0, i)) % 1, x = th.x + (LR.hash(i, th.x | 0) - 0.5) * th.w * 1.3; glow(g, X(v, x + Math.sin(t + i) * 0.6), Y(v, gy + ph * 45), k * 0.7, '#fff4d8', 0.35 * Math.sin(ph * Math.PI)); }
    }
  }

  /* ================= stones and trees ================= */
  function stone(g, v, o, P) {
    const k = v.k, x = X(v, o.x), y = Y(v, o.y), hw = o.w / 2 * k, h = o.h * k, r = rnd(o.seed);
    const lw = Math.max(1.4, k * 0.14);
    if (o.broken) {
      for (let i = 0; i < 4; i++) { const px = x - hw + r() * hw * 2, rr = k * (0.25 + r() * 0.3); ball(g, px, y - rr * 0.6, rr * 1.3, rr, '#d6cfc2', '#a59c90', '#6e665c'); g.beginPath(); g.ellipse(px, y - rr * 0.6, rr * 1.3, rr, 0, 0, TAU); stroke(g, lw * 0.8); }
      return;
    }
    const lean = (LR.hash(o.seed, 9) - 0.5) * k * 0.6;
    const shape = () => { g.beginPath(); g.moveTo(x - hw * 1.05, y + k * 0.15); g.quadraticCurveTo(x - hw * 1.05, y - h * 0.6, x - hw * 0.75 + lean, y - h * 0.95); g.quadraticCurveTo(x + lean, y - h * 1.08, x + hw * 0.75 + lean, y - h * 0.95); g.quadraticCurveTo(x + hw * 1.05, y - h * 0.6, x + hw * 1.05, y + k * 0.15); g.closePath(); };
    shape(); g.fillStyle = lin(g, x - hw, 0, x + hw, 0, [[0, '#d6cfc2'], [0.45, '#a59c90'], [1, '#6e665c']]); g.fill();
    g.save(); shape(); g.clip();
    for (let c = 1; c < o.h / 1.1; c++) { const cy = y - c * 1.05 * k, cx = x + lean * c / o.h; g.beginPath(); g.moveTo(cx - hw * 0.45, cy + k * 0.3); g.lineTo(cx, cy); g.lineTo(cx + hw * 0.45, cy + k * 0.3); stroke(g, Math.max(1, k * 0.09), 'rgba(58,42,34,.55)'); }
    glow(g, x - hw * 0.4 + lean, y - h * 0.8, hw * 1.2, '#ffffff', 0.18);
    ell(g, x - hw * 0.2 + lean, y - h * 1.0, hw * 0.75, k * 0.35, rgba(P.grass[1], 0.9));   // moss on top
    g.restore();
    shape(); stroke(g, lw);
  }
  function tree(g, v, o, P, t) {
    const k = v.k, x = X(v, o.x), y = Y(v, o.y), th = o.h * k, w = o.w * k, lw = Math.max(1.5, k * 0.15);
    if (o.broken) {
      g.beginPath(); g.moveTo(x - w * 0.9, y + k * 0.2); g.lineTo(x - w * 0.6, y - k * 1.6); g.lineTo(x - w * 0.15, y - k * 1.1); g.lineTo(x + w * 0.1, y - k * 1.9); g.lineTo(x + w * 0.55, y - k * 1.3); g.lineTo(x + w * 0.9, y + k * 0.2); g.closePath();
      g.fillStyle = lin(g, x - w, 0, x + w, 0, [[0, '#c98f5a'], [1, '#5c3721']]); g.fill(); stroke(g, lw);
      ell(g, x - w * 0.1, y - k * 1.45, w * 0.55, k * 0.25, '#e8c890');
      return;
    }
    const trunkH = th * 0.72, sway = Math.sin(t * 0.8 + o.seed) * k * 0.15;
    const trunk = () => { g.beginPath(); g.moveTo(x - w * 1.2, y + k * 0.2); g.quadraticCurveTo(x - w * 0.55, y - trunkH * 0.1, x - w * 0.45, y - trunkH * 0.5); g.lineTo(x - w * 0.3 + sway, y - trunkH); g.lineTo(x + w * 0.3 + sway, y - trunkH); g.lineTo(x + w * 0.45, y - trunkH * 0.5); g.quadraticCurveTo(x + w * 0.55, y - trunkH * 0.1, x + w * 1.25, y + k * 0.2); g.closePath(); };
    trunk(); g.fillStyle = lin(g, x - w, 0, x + w, 0, [[0, '#c98f5a'], [0.45, '#9a6238'], [1, '#5c3721']]); g.fill();
    g.save(); trunk(); g.clip(); const r = rnd(o.seed); for (let i = 0; i < 6; i++) { const yy = y - r() * trunkH, xx = x + (r() - 0.5) * w * 0.6; g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + k * 0.2, yy + k * 0.7, xx - k * 0.1, yy + k * 1.4); stroke(g, Math.max(1, k * 0.1), 'rgba(58,34,22,.35)'); } g.restore();
    trunk(); stroke(g, lw);
    /* the pom-pom crown */
    const c = POM[P.pom], R0 = th * 0.27;
    const blobs = [[0, -trunkH - R0 * 0.45, R0], [-R0 * 0.85, -trunkH + R0 * 0.1, R0 * 0.72], [R0 * 0.9, -trunkH + R0 * 0.05, R0 * 0.7]];
    for (const [bx, by, R] of blobs) {
      const cx = x + bx + sway, cy = y + by, rr = rnd(o.seed + bx | 0), pts = [];
      for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU, q = R * (i % 2 ? 1.06 + rr() * 0.06 : 0.93 + rr() * 0.04); pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
      blobPath(g, pts);
      const gr = g.createRadialGradient(cx - R * 0.38, cy - R * 0.46, R * 0.08, cx, cy, R * 1.15); gr.addColorStop(0, c[0]); gr.addColorStop(0.5, c[1]); gr.addColorStop(1, c[2]);
      g.fillStyle = gr; g.fill();
      g.save(); g.clip(); glow(g, cx + R * 0.46, cy + R * 0.6, R * 0.9, c[3], 0.55);
      for (let i = 0; i < 16; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * R * 0.85, tx = cx + Math.cos(a) * d, ty = cy + Math.sin(a) * d, s = R * (0.09 + rr() * 0.09), lit = (tx - cx) + (ty - cy) < -R * 0.1; g.beginPath(); g.moveTo(tx - s, ty - s * 0.2); g.quadraticCurveTo(tx, ty + s * 0.8, tx + s, ty - s * 0.2); stroke(g, Math.max(1, R * 0.024), lit ? 'rgba(255,255,255,.33)' : rgba(c[3], 0.42)); }
      g.restore();
      blobPath(g, pts); stroke(g, Math.max(1.4, R * 0.032), c[3]);
    }
  }

  /* ================= teeth ================= */
  const TCOL = { 1: ['#fffaf0', '#ece6d4', '#b8ad98'], 5: ['#ffd8a8', '#e8a860', '#a8682c'], 25: ['#fff2a0', '#ffd040', '#c08a10'], 100: ['#f0e0ff', '#c090ff', '#7a4ac0'] };
  function tooth(g, x, y, s, c) {
    glow(g, x, y, s * 1.6, c[1], 0.35);
    g.beginPath(); g.moveTo(x - s * 0.5, y - s * 0.55); g.quadraticCurveTo(x, y - s * 0.85, x + s * 0.5, y - s * 0.55); g.quadraticCurveTo(x + s * 0.32, y + s * 0.2, x + s * 0.04, y + s * 0.75); g.quadraticCurveTo(x - s * 0.28, y + s * 0.12, x - s * 0.5, y - s * 0.55); g.closePath();
    g.fillStyle = lin(g, x - s, y - s, x + s, y + s, [[0, c[0]], [0.5, c[1]], [1, c[2]]]); g.fill(); stroke(g, Math.max(1.2, s * 0.14));
    ell(g, x - s * 0.18, y - s * 0.4, s * 0.12, s * 0.2, 'rgba(255,255,255,.8)', 0.4);
  }

  /* ================= prey, storybook ================= */
  function prey(g, v, p, t) {
    if (p.eaten || (p.kind === 'eel' && !p.up)) return;
    const k = v.k, x = X(v, p.x), y = Y(v, p.y), lw = Math.max(1.2, k * 0.1);
    if (p.kind === 'hopper') {
      const s = k * 0.55, air = !p.gr, hop = air ? -0.25 : 0;
      g.save(); g.translate(x, y); g.rotate(hop);
      for (const ex of [0.25, 0.6]) { g.beginPath(); g.ellipse(s * ex, -s * 1.95, s * 0.18, s * 0.6, 0.25, 0, TAU); g.fillStyle = '#b8a88a'; g.fill(); stroke(g, lw); }
      g.beginPath(); g.ellipse(-s * 0.5, -s * 0.3, s * 0.45, s * 0.22, 0.4, 0, TAU); g.fillStyle = '#8a7a62'; g.fill(); stroke(g, lw);       // the long hind foot
      g.beginPath(); g.ellipse(0, -s * 0.85, s * 0.95, s * 0.8, 0, 0, TAU); g.fillStyle = (() => { const gr = g.createRadialGradient(-s * 0.3, -s * 1.2, s * 0.1, 0, -s * 0.85, s); gr.addColorStop(0, '#e6d6b8'); gr.addColorStop(0.6, '#b8a88a'); gr.addColorStop(1, '#8a7a62'); return gr; })(); g.fill(); stroke(g, lw);
      eye(g, s * 0.45, -s * 1.0, s * 0.24, 1); glow(g, s * 0.55, -s * 0.65, s * 0.25, '#ff7b6e', 0.45);
      ell(g, -s * 0.85, -s * 0.85, s * 0.2, s * 0.2, '#f4ecd8');
      g.restore();
    } else if (p.kind === 'byrd') {
      const s = k * 0.6, f = Math.sin(t * 14 + p.ph * 3);
      g.save(); g.translate(x, y);
      g.beginPath(); g.ellipse(0, 0, s * 0.7, s * 0.55, 0, 0, TAU); g.fillStyle = (() => { const gr = g.createRadialGradient(-s * 0.2, -s * 0.25, s * 0.05, 0, 0, s * 0.8); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#e2d8f0'); gr.addColorStop(1, '#a898c0'); return gr; })(); g.fill(); stroke(g, lw);
      for (let i = 0; i < 5; i++) { const a = -1.5 + i * 0.32, bx = s * 0.35, by = -s * 0.3; g.beginPath(); g.moveTo(bx + Math.cos(a - 0.3) * s * 0.15, by + Math.sin(a - 0.3) * s * 0.15); g.lineTo(bx + Math.cos(a) * s * 0.62, by + Math.sin(a) * s * 0.62); g.lineTo(bx + Math.cos(a + 0.3) * s * 0.15, by + Math.sin(a + 0.3) * s * 0.15); g.closePath(); g.fillStyle = '#f6dc78'; g.fill(); stroke(g, lw * 0.7); }
      glow(g, s * 0.5, -s * 0.5, s * 0.55, '#f6e48a', 0.3);
      g.beginPath(); g.moveTo(-s * 0.1, -s * 0.1); g.quadraticCurveTo(-s * 0.6, -s * (0.3 + f * 0.8), -s * 0.75, -s * (0.1 + f * 0.9)); g.quadraticCurveTo(-s * 0.35, s * 0.05, s * 0.15, s * 0.05); g.closePath(); g.fillStyle = '#c8b8e0'; g.fill(); stroke(g, lw);
      eye(g, s * 0.35, -s * 0.05, s * 0.17, 1);
      g.beginPath(); g.moveTo(s * 0.62, s * 0.02); g.lineTo(s * 0.9, s * 0.1); g.lineTo(s * 0.62, s * 0.2); g.closePath(); g.fillStyle = '#f0a848'; g.fill(); stroke(g, lw * 0.7);
      g.restore();
    } else if (p.kind === 'shellback') {
      const s = k * 1.3, step = Math.sin(t * 4 + p.x);
      g.save(); g.translate(x, y);
      for (const lx of [-0.5, -0.18, 0.2, 0.5]) { g.beginPath(); g.ellipse(lx * s + step * s * 0.04 * (lx > 0 ? 1 : -1), -s * 0.12, s * 0.12, s * 0.16, 0, 0, TAU); g.fillStyle = '#7a6a4a'; g.fill(); stroke(g, lw); }
      g.beginPath(); g.ellipse(s * 0.95, -s * 0.38, s * 0.32, s * 0.26, 0, 0, TAU); g.fillStyle = '#9a8a62'; g.fill(); stroke(g, lw);
      eye(g, s * 1.05, -s * 0.44, s * 0.1, 1);
      const shell = () => { g.beginPath(); g.moveTo(-s * 0.95, -s * 0.2); g.bezierCurveTo(-s * 0.95, -s * 1.05, s * 0.95, -s * 1.05, s * 0.95, -s * 0.2); g.quadraticCurveTo(0, -s * 0.08, -s * 0.95, -s * 0.2); g.closePath(); };
      shell(); g.fillStyle = lin(g, -s, -s, s * 0.6, 0, [[0, '#c9b070'], [0.5, '#a58a4a'], [1, '#6a5428']]); g.fill();
      g.save(); shell(); g.clip(); for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(i * s * 0.26, -s * 0.1); g.quadraticCurveTo(i * s * 0.2 + s * 0.3, -s * 0.5, i * s * 0.12 + s * 0.6, -s * 1); g.moveTo(i * s * 0.26, -s * 0.1); g.quadraticCurveTo(i * s * 0.2 - s * 0.3, -s * 0.5, i * s * 0.12 - s * 0.6, -s * 1); stroke(g, Math.max(1, s * 0.035), 'rgba(66,40,14,.6)'); } glow(g, -s * 0.35, -s * 0.75, s * 0.5, '#fff0c0', 0.35); g.restore();
      shell(); stroke(g, lw * 1.2);
      g.restore();
    } else if (p.kind === 'eel') {
      const s = k * 0.75, a = Math.atan2(-(p.vy || 0), 3);
      g.save(); g.translate(x, y); g.rotate(a);
      const w = Math.sin(t * 10) * s * 0.3;
      g.beginPath(); g.moveTo(-s * 1.3, w); g.quadraticCurveTo(-s * 0.3, -w, s * 0.9, 0); stroke(g, Math.max(3, s * 0.55));
      g.beginPath(); g.moveTo(-s * 1.3, w); g.quadraticCurveTo(-s * 0.3, -w, s * 0.9, 0); stroke(g, Math.max(2, s * 0.38), '#4a7a5a');
      ell(g, s * 0.95, 0, s * 0.3, s * 0.24, '#4a7a5a'); g.beginPath(); g.ellipse(s * 0.95, 0, s * 0.3, s * 0.24, 0, 0, TAU); stroke(g, lw);
      eye(g, s * 1.02, -s * 0.06, s * 0.1, 1, '#e8e080');
      g.restore();
    }
  }

  /* ================= the Lútut, storybook ================= */
  const HIDE = ['#5a4e6e', '#2e2638', '#17121f'], MEMB = ['#4a3a54', '#2a2032'], BONE = ['#fff4dc', '#e2d6bc', '#9a8c74'];
  /* one bat wing: ang 0 = straight up, + leans forward; fold 0..1 */
  function wing(g, r, sx, sy, ang, fold, near) {
    g.save(); g.translate(sx, sy); g.rotate(ang); g.scale(1 - fold * 0.6, 1 - fold * 0.35);
    const wrist = [r * 0.12, -r * 0.82], tips = [[-r * 0.3, -r * 1.85], [-r * 0.95, -r * 1.5], [-r * 1.3, -r * 0.92], [-r * 1.2, -r * 0.32]], root = [-r * 0.62, r * 0.12];
    const path = () => {
      g.beginPath(); g.moveTo(0, 0); g.lineTo(wrist[0], wrist[1]); g.lineTo(tips[0][0], tips[0][1]);
      for (let i = 0; i < tips.length - 1; i++) { const a = tips[i], b = tips[i + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; g.quadraticCurveTo(mx + (wrist[0] - mx) * 0.3, my + (wrist[1] - my) * 0.3, b[0], b[1]); }
      const a = tips[tips.length - 1]; g.quadraticCurveTo((a[0] + root[0]) / 2 + r * 0.12, (a[1] + root[1]) / 2, root[0], root[1]); g.closePath();
    };
    path(); g.fillStyle = lin(g, 0, -r * 1.8, -r * 1.2, 0, [[0, near ? mix(MEMB[0], '#ffffff', 0.08) : MEMB[0]], [1, MEMB[1]]]); g.fill();
    g.save(); path(); g.clip(); glow(g, -r * 0.2, -r * 1.1, r * 0.8, '#b8a0d8', near ? 0.18 : 0.08); g.restore();
    for (const tp of tips) { g.beginPath(); g.moveTo(wrist[0], wrist[1]); g.quadraticCurveTo((wrist[0] + tp[0]) / 2 + r * 0.05, (wrist[1] + tp[1]) / 2 - r * 0.05, tp[0], tp[1]); stroke(g, Math.max(1, r * 0.05), near ? '#6a5a7a' : '#4a3e58'); }
    path(); stroke(g, Math.max(1.2, r * 0.06));
    g.beginPath(); g.moveTo(0, 0); g.lineTo(wrist[0], wrist[1]); stroke(g, Math.max(1.5, r * 0.11)); g.beginPath(); g.moveTo(0, 0); g.lineTo(wrist[0], wrist[1]); stroke(g, Math.max(1, r * 0.06), near ? '#6a5a7a' : '#4a3e58');
    g.beginPath(); g.moveTo(wrist[0], wrist[1]); g.quadraticCurveTo(wrist[0] + r * 0.1, wrist[1] - r * 0.26, wrist[0] + r * 0.24, wrist[1] - r * 0.2); stroke(g, Math.max(1.2, r * 0.07), BONE[2]);
    g.restore();
  }
  /* o: { wing (-1 swept back/down .. 1 up and forward), fold, flare, throat, legs ('tuck'|'walk'|'stand'), walk, tail (wave), dead } */
  function lututBody(g, r, o) {
    const lw = Math.max(1.4, r * 0.06);
    const B = { x: r * 0.18, y: 0, rx: r, ry: r * 0.82 };
    const wAng = -0.6 + 0.85 * o.wing;
    wing(g, r, B.x - r * 0.18, B.y - r * 0.6, wAng - 0.18, o.fold, false);
    /* the tail, tapering, a slow wave down it, the spiked ball */
    const n = 10, L = r * 1.75, pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push([B.x - B.rx * 0.72 - u * L, B.y + r * 0.02 + r * 0.12 * u * u + Math.sin(o.tail - u * 3.2) * r * 0.16 * u]); }
    const tailPath = () => {
      g.beginPath();
      for (let i = 0; i <= n; i++) { const w = r * (0.2 - i / n * 0.13); i ? g.lineTo(pts[i][0], pts[i][1] - w) : g.moveTo(pts[i][0], pts[i][1] - w); }
      for (let i = n; i >= 0; i--) { const w = r * (0.2 - i / n * 0.13); g.lineTo(pts[i][0], pts[i][1] + w); }
      g.closePath();
    };
    tailPath(); g.fillStyle = lin(g, 0, -r * 0.2, 0, r * 0.3, [[0, HIDE[0]], [0.5, HIDE[1]], [1, HIDE[2]]]); g.fill(); stroke(g, lw);
    if (o.cracks) for (let c = 0; c < o.cracks; c++) { const p = pts[2 + c * 2] || pts[n - 1]; g.beginPath(); g.moveTo(p[0], p[1] - r * 0.15); g.lineTo(p[0] - r * 0.06, p[1]); g.lineTo(p[0] + r * 0.04, p[1] + r * 0.06); g.lineTo(p[0] - r * 0.03, p[1] + r * 0.15); stroke(g, Math.max(1.2, r * 0.045), '#fff4f0'); }
    const e = pts[n], bx = e[0] - r * 0.18, by = e[1] + r * 0.06, br = r * 0.3;
    for (let i = 0; i < 10; i++) {
      const a = o.tail * 0.3 + i / 10 * TAU;
      g.beginPath(); g.moveTo(bx + Math.cos(a - 0.25) * br, by + Math.sin(a - 0.25) * br); g.lineTo(bx + Math.cos(a) * br * 1.75, by + Math.sin(a) * br * 1.75); g.lineTo(bx + Math.cos(a + 0.25) * br, by + Math.sin(a + 0.25) * br); g.closePath();
      g.fillStyle = BONE[1]; g.fill(); stroke(g, lw * 0.75);
    }
    ball(g, bx, by, br, br, HIDE[0], HIDE[1], HIDE[2]); g.beginPath(); g.arc(bx, by, br, 0, TAU); stroke(g, lw);
    /* legs */
    const legs = near => {
      for (const [lx, ph] of [[0.48, 0], [-0.42, 1.6]]) {
        const x = B.x + lx * r + (near ? r * 0.06 : -r * 0.06), top = B.y + r * 0.45;
        const sw = o.legs === 'walk' ? Math.sin(o.walk + ph + (near ? 0 : Math.PI)) * r * 0.16 : 0, tuck = o.legs === 'tuck' ? r * 0.18 : 0;
        const fx = x + sw - tuck * 0.6, fy = B.y + r * 0.9 - tuck;
        g.beginPath(); g.moveTo(x, top); g.lineTo(fx, fy); stroke(g, r * 0.2); g.beginPath(); g.moveTo(x, top); g.lineTo(fx, fy); stroke(g, r * 0.13, near ? HIDE[1] : HIDE[2]);
        for (const c of [-1, 0, 1]) { g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + r * 0.11 + c * r * 0.05, fy + r * 0.07); stroke(g, Math.max(1, r * 0.04), BONE[2]); }
      }
    };
    legs(false);
    /* the body: a round drop, nearly all head */
    const body = () => {
      g.beginPath(); g.moveTo(B.x - B.rx * 1.02, B.y + r * 0.02);
      g.bezierCurveTo(B.x - B.rx * 0.7, B.y - B.ry * 0.95, B.x + B.rx * 0.55, B.y - B.ry * 1.12, B.x + B.rx, B.y - B.ry * 0.12);
      g.bezierCurveTo(B.x + B.rx * 1.06, B.y + B.ry * 0.45, B.x + B.rx * 0.6, B.y + B.ry * 1.02, B.x, B.y + B.ry * 0.98);
      g.bezierCurveTo(B.x - B.rx * 0.5, B.y + B.ry * 0.95, B.x - B.rx * 0.85, B.y + B.ry * 0.45, B.x - B.rx * 1.02, B.y + r * 0.02); g.closePath();
    };
    body(); const gr = g.createRadialGradient(B.x - r * 0.3, B.y - r * 0.5, r * 0.08, B.x, B.y, B.rx * 1.15); gr.addColorStop(0, HIDE[0]); gr.addColorStop(0.55, HIDE[1]); gr.addColorStop(1, HIDE[2]); g.fillStyle = gr; g.fill();
    g.save(); body(); g.clip();
    glow(g, B.x + r * 0.4, B.y + r * 0.55, r * 0.9, '#0a0610', 0.5);
    glow(g, B.x - r * 0.35, B.y - r * 0.55, r * 0.55, '#9a88c0', 0.22);
    for (let i = 0; i < 9; i++) { const a = 2.2 + i * 0.37, rr = 0.55 + (i % 3) * 0.12; ell(g, B.x + Math.cos(a) * B.rx * rr * 0.9, B.y + Math.sin(a) * B.ry * rr, r * 0.035, r * 0.035, 'rgba(160,140,190,.35)'); }
    g.restore();
    body(); stroke(g, lw);
    /* spines down the back */
    for (let i = 0; i < 6; i++) {
      const u = i / 5, a = Math.PI * (1.08 + u * 0.36), x = B.x + Math.cos(a) * B.rx * 0.98, y = B.y + Math.sin(a) * B.ry * 1.02, h = r * (0.1 + (i % 2) * 0.06);
      g.beginPath(); g.moveTo(x - r * 0.05, y + r * 0.04); g.lineTo(x - r * 0.02, y - h); g.lineTo(x + r * 0.06, y + r * 0.04); g.closePath(); g.fillStyle = HIDE[1]; g.fill(); stroke(g, lw * 0.7);
    }
    /* the mouth: an open lamprey ring, teeth all round pointing in */
    {
      const flare = o.flare || 1, mx = B.x + B.rx * 0.89, my = B.y + r * 0.08, mry = r * 0.52 * flare, mrx = r * 0.3 * flare;
      g.beginPath(); g.ellipse(mx, my, mrx * 1.28, mry * 1.12, -0.06, 0, TAU); g.fillStyle = lin(g, mx - mrx, my - mry, mx + mrx, my + mry, [[0, '#6a5a80'], [1, '#2e2638']]); g.fill(); stroke(g, lw);
      const deep = g.createRadialGradient(mx + mrx * 0.25, my, 0, mx, my, mry);
      deep.addColorStop(0, o.throat ? '#ff6a3a' : '#7a1c2a'); deep.addColorStop(0.55, o.throat ? '#b02028' : '#30080e'); deep.addColorStop(1, '#0c0306');
      g.beginPath(); g.ellipse(mx + r * 0.02, my, mrx * 0.92, mry * 0.94, -0.06, 0, TAU); g.fillStyle = deep; g.fill(); stroke(g, lw * 0.7);
      if (o.throat) glow(g, mx + r * 0.1, my, mry * 1.6, '#ff5a3a', 0.35);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + 0.1, c = Math.cos(a), s = Math.sin(a), bx2 = mx + r * 0.02 + c * mrx * 0.9, by2 = my + s * mry * 0.92;
        const big = i % 2 === 0, tl = r * (big ? 0.2 : 0.12) * (0.75 + 0.25 * Math.abs(s)), ix = -c * mrx, iy = -s * mry, il = Math.hypot(ix, iy) || 1, px = -iy / il, py = ix / il, w = r * (big ? 0.055 : 0.04);
        g.beginPath(); g.moveTo(bx2 + px * w, by2 + py * w); g.lineTo(bx2 + ix / il * tl, by2 + iy / il * tl); g.lineTo(bx2 - px * w, by2 - py * w); g.closePath();
        g.fillStyle = big ? BONE[0] : BONE[1]; g.fill(); stroke(g, Math.max(0.8, r * 0.022));
      }
    }
    /* the glowing eye under a heavy brow, and the horns */
    const ex = B.x + B.rx * 0.5, ey = B.y - B.ry * 0.56;
    if (o.dead) { g.beginPath(); g.moveTo(ex - r * 0.12, ey); g.quadraticCurveTo(ex, ey + r * 0.06, ex + r * 0.12, ey); stroke(g, lw); }
    else eye(g, ex, ey + r * 0.02, r * 0.17, 1, '#ffd040');
    g.beginPath(); g.moveTo(ex - r * 0.32, ey - r * 0.08); g.quadraticCurveTo(ex, ey - r * 0.34, ex + r * 0.32, ey - r * 0.06); g.quadraticCurveTo(ex + r * 0.05, ey - r * 0.16, ex - r * 0.32, ey - r * 0.08); g.closePath(); g.fillStyle = HIDE[1]; g.fill(); stroke(g, lw);
    const horn = (hx0, hy0, sc, col) => {
      g.beginPath(); g.moveTo(hx0 - r * 0.1 * sc, hy0); g.quadraticCurveTo(hx0 - r * 0.06 * sc, hy0 - r * 0.45 * sc, hx0 - r * 0.24 * sc, hy0 - r * 0.64 * sc); g.quadraticCurveTo(hx0 + r * 0.08 * sc, hy0 - r * 0.42 * sc, hx0 + r * 0.1 * sc, hy0 + r * 0.02); g.closePath();
      g.fillStyle = lin(g, hx0, hy0, hx0 - r * 0.2, hy0 - r * 0.6, [[0, col], [1, BONE[1]]]); g.fill(); stroke(g, lw);
    };
    horn(ex - r * 0.2, ey - r * 0.22, 0.85, HIDE[2]); horn(ex - r * 0.04, ey - r * 0.18, 1, HIDE[1]);
    legs(true);
    wing(g, r, B.x - r * 0.04, B.y - r * 0.55, wAng, o.fold, true);
  }
  /* the Eikar: a round storybook head, the Aagac cap, markings under the eyes, a scarf; s = pixels per metre */
  function eikar(g, s, o) {
    const lw = Math.max(1.2, s * 0.07), t = o.t || 0, st = clamp(o.scarf == null ? 0.5 : o.scarf, 0, 1);
    g.save(); g.rotate(o.lean || 0);
    /* scarf streaming back */
    g.beginPath(); g.moveTo(s * 0.06, -s * 0.66);
    g.bezierCurveTo(-s * 0.3, -s * (0.62 + Math.sin(t * 9) * 0.05 * st), -s * (0.5 + 0.3 * st), -s * (0.78 + Math.sin(t * 11 + 1) * 0.1 * st), -s * (0.6 + 0.55 * st), -s * (0.62 + Math.sin(t * 13) * 0.12 * st));
    stroke(g, s * 0.2); g.stroke(); g.lineWidth = s * 0.13; g.strokeStyle = '#d8604a'; g.stroke();
    /* leg down the side, body, mitt on the horn */
    g.beginPath(); g.moveTo(s * 0.02, -s * 0.18); g.quadraticCurveTo(s * 0.2, s * 0.1, s * 0.08, s * 0.34); stroke(g, s * 0.2); g.beginPath(); g.moveTo(s * 0.02, -s * 0.18); g.quadraticCurveTo(s * 0.2, s * 0.1, s * 0.08, s * 0.34); stroke(g, s * 0.13, '#5a4a34');
    g.beginPath(); g.ellipse(0, -s * 0.38, s * 0.24, s * 0.3, 0.15, 0, TAU); g.fillStyle = lin(g, -s * 0.2, -s * 0.6, s * 0.2, 0, [[0, '#5a9a82'], [1, '#2e5a4a']]); g.fill(); stroke(g, lw);
    g.beginPath(); g.moveTo(s * 0.12, -s * 0.5); g.quadraticCurveTo(s * 0.35, -s * 0.45, s * (0.5 + (o.reach || 0)), -s * 0.5); stroke(g, s * 0.16); g.beginPath(); g.moveTo(s * 0.12, -s * 0.5); g.quadraticCurveTo(s * 0.35, -s * 0.45, s * (0.5 + (o.reach || 0)), -s * 0.5); stroke(g, s * 0.1, '#dd8436');
    ball(g, s * (0.52 + (o.reach || 0)), -s * 0.5, s * 0.09, s * 0.09, '#f6b160', '#dd8436', '#a9561f');
    /* the head: warm acorn-brown, grain lines, big glossy eyes, the dark markings beneath them, blush */
    const hx0 = s * 0.1, hy0 = -s * 0.92, hr = s * 0.3;
    g.beginPath(); g.arc(hx0, hy0, hr, 0, TAU);
    const hg = g.createRadialGradient(hx0 - hr * 0.3, hy0 - hr * 0.4, hr * 0.1, hx0, hy0, hr * 1.2); hg.addColorStop(0, '#f6b160'); hg.addColorStop(0.6, '#dd8436'); hg.addColorStop(1, '#a9561f'); g.fillStyle = hg; g.fill();
    g.save(); g.beginPath(); g.arc(hx0, hy0, hr, 0, TAU); g.clip();
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(hx0 + i * hr * 0.3, hy0 - hr); g.quadraticCurveTo(hx0 + i * hr * 0.28, hy0, hx0 + i * hr * 0.12, hy0 + hr); stroke(g, Math.max(0.7, s * 0.02), i % 2 ? 'rgba(140,70,24,.18)' : 'rgba(255,220,160,.2)'); }
    g.restore();
    g.beginPath(); g.arc(hx0, hy0, hr, 0, TAU); stroke(g, lw);
    eye(g, hx0 + hr * 0.42, hy0 + hr * 0.05, hr * 0.26, o.blink ? 0.1 : 1);
    g.beginPath(); g.moveTo(hx0 + hr * 0.24, hy0 + hr * 0.34); g.lineTo(hx0 + hr * 0.5, hy0 + hr * 0.62); g.lineTo(hx0 + hr * 0.62, hy0 + hr * 0.34); g.closePath(); g.fillStyle = '#3a1a0c'; g.fill();
    glow(g, hx0 + hr * 0.15, hy0 + hr * 0.4, hr * 0.28, '#ff7b6e', 0.5);
    if (o.cap !== false) aagac(g, hx0 - hr * 0.02, hy0 - hr * 0.42, hr * 1.25);
    g.restore();
  }
  /* the Aagac: a dome with a diamond pattern and a curled stem, as Tuftwood paints its acorn */
  function aagac(g, x, y, w) {
    const chh = w * 0.72, lw = Math.max(1.2, w * 0.07);
    g.save(); g.translate(x, y);
    g.beginPath(); g.moveTo(0, -chh * 1.05); g.quadraticCurveTo(0, -chh * 1.4, w * 0.28, -chh * 1.45); stroke(g, w * 0.22); g.beginPath(); g.moveTo(0, -chh * 1.05); g.quadraticCurveTo(0, -chh * 1.4, w * 0.28, -chh * 1.45); stroke(g, w * 0.12, '#9a5c30');
    const cap = () => { g.beginPath(); g.moveTo(-w, 0); g.bezierCurveTo(-w - w * 0.06, -chh * 0.95, -w * 0.55, -chh * 1.12, 0, -chh * 1.12); g.bezierCurveTo(w * 0.55, -chh * 1.12, w * 1.06, -chh * 0.95, w, 0); g.quadraticCurveTo(w * 0.5, w * 0.15, 0, w * 0.14); g.quadraticCurveTo(-w * 0.5, w * 0.15, -w, 0); g.closePath(); };
    cap(); g.fillStyle = lin(g, -w, -chh, w * 0.6, w * 0.12, [[0, '#c98850'], [0.5, '#a5673a'], [1, '#74401f']]); g.fill();
    g.save(); cap(); g.clip();
    for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(i * w * 0.27, w * 0.2); g.quadraticCurveTo(i * w * 0.22 + w * 0.3, -chh * 0.4, i * w * 0.12 + w * 0.66, -chh * 1.2); g.moveTo(i * w * 0.27, w * 0.2); g.quadraticCurveTo(i * w * 0.22 - w * 0.3, -chh * 0.4, i * w * 0.12 - w * 0.66, -chh * 1.2); stroke(g, Math.max(0.7, w * 0.045), 'rgba(66,32,14,.7)'); }
    glow(g, -w * 0.38, -chh * 0.8, w * 0.42, '#ffe0b0', 0.35);
    g.restore(); cap(); stroke(g, lw);
    g.restore();
  }

  /* what it is doing, as paint: wing pose, mouth, legs */
  function pose(run, anim, dt) {
    const v = Math.hypot(run.vx, run.vy);
    anim.t += dt; anim.tail = (anim.tail || 0) + dt * (run.grounded ? 2.6 : 5);
    const o = { wing: anim.wing == null ? 0.3 : anim.wing, fold: 0, flare: 1, throat: run.numb > 0.4, legs: 'tuck', walk: anim.walk || 0, tail: anim.tail, cracks: run.cracks, dead: run.over === 'shattered' || run.over === 'sank' || run.over === 'fell' };
    let want = 0.28, beat = false;
    if (run.over === 'hungry' || (run.over && run.grounded && run.overT > 1) || o.dead) { o.fold = 1; want = -1.2; o.legs = 'stand'; }
    else if (run.grounded) { o.legs = v > 1 ? 'walk' : 'stand'; anim.walk = (anim.walk || 0) + v * dt * 3.2; want = 0.2; o.fold = v > 1 ? 0.3 : 0.7; if (run.beating) beat = true; }
    else if (run.tucking) { want = -1; o.fold = 0.25; }
    else if (run.beating) beat = true;
    if (run.suckT > 0) o.flare = 1 + 0.25 * (0.5 + 0.5 * Math.sin(anim.t * 16));
    if (o.throat) o.flare = 1.3;
    if (beat) { anim.ph = (anim.ph || 0) + dt * 9; o.wing = Math.sin(anim.ph); }
    else { o.wing = lerp(o.wing, want, 1 - Math.exp(-dt * 8)); anim.ph = Math.asin(clamp(o.wing, -1, 1)); }
    anim.wing = o.wing;
    return o;
  }
  A.lututState = (run, anim, dt) => pose(run, anim, dt);


  /* ================= the Lútut and its Eikar, from the real models =================
     img/model/*.png are rendered from Torcain's Run's 3D Lútut (rpg/assets/models/lutut.glb) and Eikar
     (rpg/js/actors.js), side on, posed by the model's own clips, with an ink outline (tools/render_sprites.js).
     img/model/frames.js says where the body's middle, the saddle, the mouth and the tail ball are in each. */
  const MF = window.LR_MODEL_FRAMES || null;
  const MIMG = {};
  const MBASE = (document.currentScript && document.currentScript.src || '').replace(/js\/lr_art_tw\.js.*$/, '') + 'img/model/';
  if (MF) for (const grp of ['lutut', 'eikar']) for (const n in MF[grp]) { const im = new Image(); im.src = MBASE + MF[grp][n].file; MIMG[grp + ':' + n] = im; }
  const ready = (grp, n) => { const im = MIMG[grp + ':' + n]; return im && im.complete && im.naturalWidth ? im : null; };
  const axis = f => Math.atan2(f.mouth[1] - f.tail[1], f.mouth[0] - f.tail[0]);
  /* sprite pixels → the game's metres: the mouth-to-tail length of the standing frame is the Lútut's length in the ride */
  const STAND = MF && MF.lutut.stand, LEN = STAND ? Math.hypot(STAND.mouth[0] - STAND.tail[0], STAND.mouth[1] - STAND.tail[1]) : 1;
  const PER_M = LEN / (4.05 * LR.R);          // sprite pixels to the ride's metre (a grown Lútut)
  /* which frame, for what it is doing */
  function frameFor(run, anim) {
    const v = Math.hypot(run.vx, run.vy);
    if (run.over === 'shattered' || run.over === 'sank' || run.over === 'fell') return 'death';
    if (run.over === 'hungry' || (run.over && run.grounded && run.overT > 1)) return 'stand';
    if (run.suckT > 0) return 'suck';
    if (run.numb > 0.4) return 'screech';
    if (run.grounded) return v > 1 ? 'walk' + (Math.floor((anim.walkM || 0) / 0.55) % 6) : 'stand';
    if (run.tucking) return 'dive';
    if (run.beating || anim.flapOn > 0) return 'fly' + (Math.floor((anim.flap || 0) * 8) % 8);
    return 'glide';
  }
  /* draws it; false if the pictures aren't in yet */
  function modelLutut(g, run, anim, x, y, k, t, dt) {
    if (!MF) return false;
    const v = Math.hypot(run.vx, run.vy);
    anim.walkM = (anim.walkM || 0) + (run.grounded ? v * dt : 0);
    if (run.beating) { anim.flapOn = 0.25; anim.flap = ((anim.flap || 0) + dt * 1.6) % 1; }
    else if (anim.flapOn > 0) { anim.flapOn -= dt; anim.flap = ((anim.flap || 0) + dt * 1.6) % 1; }
    const name = frameFor(run, anim), f = MF.lutut[name], im = ready('lutut', name);
    if (!im) return false;
    const sc = k * run.st.scale / PER_M;
    /* the dive clip already pitches the body nose-down, and so does the ride: take the clip's own pitch out */
    const corr = name === 'dive' ? axis(f) - axis(STAND) : 0;
    g.save(); g.translate(x, y); g.rotate(-run.ang - corr);
    g.drawImage(im, -f.body[0] * sc, -f.body[1] * sc, f.w * sc, f.h * sc);
    /* cracks, pale, along the tail */
    for (let c = 0; c < run.cracks; c++) {
      const u = 0.35 + c * 0.14, cx = (f.body[0] + (f.tail[0] - f.body[0]) * u - f.body[0]) * sc, cy = (f.body[1] + (f.tail[1] - f.body[1]) * u - f.body[1]) * sc, r = k * 0.35;
      g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx - r * 0.3, cy); g.lineTo(cx + r * 0.2, cy + r * 0.3); g.lineTo(cx - r * 0.1, cy + r * 0.8); stroke(g, Math.max(1.5, k * 0.12), '#fff4f0');
    }
    if (run.numb > 0) for (let i = 0; i < 6; i++) { const a = t * 3 + i; glow(g, (f.seat[0] - f.body[0]) * sc + Math.cos(a) * k * 1.2, (f.seat[1] - f.body[1]) * sc - k * 0.6 + Math.sin(a * 1.3) * k * 0.5, k * 0.18, '#c8e8ff', 0.8); }
    /* the rider, sat in the saddle */
    if (!run.rider) {
      const rn = run.tucking ? 'lean' : 'ride', rf = MF.eikar[rn], rim = ready('eikar', rn);
      if (rim) {
        const rs = k / PER_M;          // the Eikar keeps its own size, whatever size the Lútut is
        const bob = run.beating ? Math.sin((anim.flap || 0) * TAU) * k * 0.06 : 0;
        const hp = rf.hip || rf.seat;
        g.drawImage(rim, (f.seat[0] - f.body[0]) * sc - hp[0] * rs, (f.seat[1] - f.body[1]) * sc - hp[1] * rs + bob, rf.w * rs, rf.h * rs);
      }
    }
    g.restore();
    return true;
  }
  function modelEikarFall(g, R, X0, Y0, k) {
    const f = MF && MF.eikar.fall, im = ready('eikar', 'fall');
    if (!im) return false;
    const rs = k / PER_M;
    g.save(); g.translate(X0, Y0); g.rotate(-R.rot); g.drawImage(im, -f.w * rs / 2, -f.h * rs / 2, f.w * rs, f.h * rs); g.restore();
    return true;
  }

  /* ================= one frame ================= */
  A.frame = function (ctx, view, run, t, dt, anim) {
    const v = view, S = run.stage, P = PAL[S.id] || PAL.downs, k = v.k;
    stepFx(dt, run.land);
    v.sx = v.shake ? (Math.random() - 0.5) * v.shake * 14 : 0; v.sy = v.shake ? (Math.random() - 0.5) * v.shake * 14 : 0;
    const g = ctx;
    sky(g, v, P, t);
    hills(g, v, P, 0, 0.06, 0.66, 0.3, S.seed + 101, false);
    hills(g, v, P, 1, 0.16, 0.76, 0.24, S.seed + 202, true);
    hills(g, v, P, 2, 0.32, 0.88, 0.18, S.seed + 303, true);
    thermals(g, v, run, t);
    const x0 = v.cx - v.W * 0.5 / k - 30, x1 = v.cx + v.W * 0.5 / k + 30, segs = run.land.segsIn(x0, x1);
    for (const sg of segs) for (const o of sg.trees) tree(g, v, o, P, t);
    ground(g, v, run, P, t);
    pools(g, v, run, t);
    roost(g, v, run.land);
    markers(g, v, run);
    for (const sg of segs) for (const o of sg.rocks) stone(g, v, o, P);
    const tc = TCOL[LR.toothValue(run.dist)];
    for (const sg of segs) for (const tt of sg.teeth) if (!tt.got) tooth(g, X(v, tt.x), Y(v, tt.y + Math.sin(t * 3 + tt.x) * 0.15), k * 0.6, tc);
    for (const sg of segs) for (const p of sg.prey) prey(g, v, p, t);

    /* the Lútut and its Eikar */
    const o = pose(run, anim, dt), r = run.r * k;
    if (!modelLutut(g, run, anim, X(v, run.x), Y(v, run.y), k, t, dt)) {
    g.save(); g.translate(X(v, run.x), Y(v, run.y)); g.rotate(-run.ang);
    g.translate(0, o.legs === 'tuck' ? -Math.sin(anim.ph || 0) * r * 0.05 : 0);
    lututBody(g, r, o);
    if (o.throat) for (let i = 0; i < 6; i++) { const a = t * 3 + i; glow(g, -r * 0.5 + Math.cos(a) * r * 0.8, -r * 1.1 + Math.sin(a * 1.3) * r * 0.4, r * 0.12, '#c8e8ff', 0.8); }
    if (!run.rider) {
      const sp = Math.hypot(run.vx, run.vy);
      g.translate(r * 0.06, -r * 0.74);
      eikar(g, 1.15 * k, { t, lean: run.tucking ? 0.35 : run.grounded ? 0.1 : clamp(-run.av * 0.08, -0.3, 0.3) + 0.15, scarf: sp / 25, reach: run.tucking ? 0.06 : 0, blink: (t % 4) < 0.12 });
    }
    g.restore();
    }
    if (run.rider) {
      const R = run.rider;
      if (!modelEikarFall(g, R, X(v, R.x), Y(v, R.y), k)) { g.save(); g.translate(X(v, R.x), Y(v, R.y)); g.rotate(-R.rot); eikar(g, 1.15 * k, { t, scarf: 0.6, cap: false, blink: true }); g.restore(); }
      aagac(g, X(v, R.hat.x), Y(v, R.hat.y), 0.32 * k);
    }

    blades(g, v, run, P, t);
    /* soft specks */
    for (const p of A.fx) {
      const a = 1 - p.age / p.life, x = X(v, p.x), y = Y(v, p.y), s = Math.max(1.5, p.size * k);
      g.globalAlpha = clamp(a * 1.3, 0, 1);
      if (p.kind === 'dust') glow(g, x, y, s * (1.6 + (1 - a) * 2), p.col, 0.8);
      else if (p.kind === 'feather') ell(g, x, y, s * 1.3, s * 0.45, p.col, p.rot);
      else if (p.kind === 'shard') { g.save(); g.translate(x, y); g.rotate(p.rot); g.beginPath(); g.moveTo(-s, -s * 0.5); g.lineTo(s, -s * 0.2); g.lineTo(0, s * 0.7); g.closePath(); g.fillStyle = p.col; g.fill(); stroke(g, Math.max(1, s * 0.2)); g.restore(); }
      else ell(g, x, y, s, s, p.col);
    }
    g.globalAlpha = 1;
    if (P.night) { g.fillStyle = 'rgba(16,14,48,0.22)'; g.fillRect(0, 0, v.W, v.H); }
    /* words, Tuftwood's way: Gaegu, a soft dark edge */
    g.textAlign = 'center'; g.font = '700 ' + Math.max(20, k * 1.3) + 'px ' + FONT;
    for (const p of A.popText) {
      g.globalAlpha = clamp(1.6 - p.age, 0, 1);
      const x = X(v, p.x), y = Y(v, p.y);
      g.lineWidth = 5; g.strokeStyle = 'rgba(40,26,20,.75)'; g.lineJoin = 'round'; g.strokeText(p.text, x, y); g.fillStyle = p.col; g.fillText(p.text, x, y);
    }
    g.globalAlpha = 1;
    /* paper grain, and a soft dark edge */
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.16; g.fillStyle = g.createPattern(grainTile(), 'repeat'); g.fillRect(0, 0, v.W, v.H); g.restore();
    const vg = g.createRadialGradient(v.W / 2, v.H / 2, Math.min(v.W, v.H) * 0.45, v.W / 2, v.H / 2, Math.max(v.W, v.H) * 0.78);
    vg.addColorStop(0, 'rgba(30,20,40,0)'); vg.addColorStop(1, 'rgba(30,20,40,' + (P.night ? 0.45 : 0.22) + ')');
    g.fillStyle = vg; g.fillRect(0, 0, v.W, v.H);
    return o;
  };

  /* a still portrait of a Lútut and its rider, for the roost */
  A.portrait = function (canvas, kind) {
    const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height, K = LR.KINDS[kind];
    g.clearRect(0, 0, W, H);
    if (MF) {
      const im = ready('lutut', 'stand'), rim = ready('eikar', 'ride');
      if (!im || !rim) { const again = () => A.portrait(canvas, kind); (MIMG['lutut:stand'] || {}).onload = again; (MIMG['eikar:ride'] || {}).onload = again; if (!im || !rim) return; }
      const f = MF.lutut.stand, rf = MF.eikar.ride, hp = rf.hip || rf.seat, k = W * 0.84 / (f.w / PER_M * 1.15), sc = k * K.scale / PER_M, rs = k / PER_M;
      glow(g, W * 0.5, H * 0.84, W * 0.34, '#000000', 0.22);
      const x = W * 0.5 + (f.body[0] - f.w / 2) * sc, y = H * 0.58;
      g.drawImage(im, x - f.body[0] * sc, y - f.body[1] * sc, f.w * sc, f.h * sc);
      g.drawImage(rim, x + (f.seat[0] - f.body[0]) * sc - hp[0] * rs, y + (f.seat[1] - f.body[1]) * sc - hp[1] * rs, rf.w * rs, rf.h * rs);
      return;
    }
    const k = H * 0.16, r = LR.R * K.scale * k;
    glow(g, W * 0.55, H * 0.86, W * 0.32, '#000000', 0.25);
    g.save(); g.translate(W * 0.6, H * 0.56); g.rotate(-0.06);
    lututBody(g, r, { wing: 0.55, fold: 0, flare: 1, legs: 'stand', walk: 0, tail: 1.2, cracks: 0 });
    g.translate(r * 0.06, -r * 0.74); eikar(g, 1.15 * k, { t: 1, lean: 0.12, scarf: 0.45 });
    g.restore();
  };
})();
