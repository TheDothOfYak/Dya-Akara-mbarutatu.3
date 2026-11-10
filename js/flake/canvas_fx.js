/* ============================================================
   FLAKE GAMES — js/flake/canvas_fx.js
   Shared tricks that make a 2D canvas game look painted rather
   than drawn: smooth noise and textures made from it, a bloom pass
   for things that glow (works in every browser: it blurs by
   shrinking and growing, not with ctx.filter), tapered ribbons for
   vines and branches, light shafts, a vignette and colour grading.
   Used by Punk Races and Stryx Pilot.
   ============================================================ */
(function () {
  'use strict';
  const FX = window.FX = {};
  const TAU = Math.PI * 2;

  /* ---------------- colour ---------------- */
  FX.hex = function (h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  FX.rgba = function (h, a) { const c = FX.hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  FX.mix = function (a, b, t) {
    const x = FX.hex(a), y = FX.hex(b);
    const c = [0, 1, 2].map(i => Math.round(x[i] + (y[i] - x[i]) * t));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  };
  FX.shade = function (h, k) { return k >= 0 ? FX.mix(h, '#ffffff', k) : FX.mix(h, '#000000', -k); };

  /* ---------------- noise ---------------- */
  /* value noise on a lattice; period makes it tile seamlessly */
  FX.noise = function (seed, period) {
    const P = period || 256;
    const perm = new Uint8Array(512), val = new Float32Array(256);
    let s = (seed | 0) || 1;
    const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 0; i < 256; i++) { perm[i] = i; val[i] = rnd(); }
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
    const lat = (x, y) => val[perm[(perm[((x % P) + P) % P & 255] + (((y % P) + P) % P)) & 255]];
    const sm = t => t * t * (3 - 2 * t);
    function n2(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const a = lat(xi, yi), b = lat(xi + 1, yi), c = lat(xi, yi + 1), d = lat(xi + 1, yi + 1);
      const u = sm(xf), v = sm(yf);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    n2.fbm = function (x, y, oct, per) {
      let sum = 0, amp = 0.5, f = 1, norm = 0;
      for (let i = 0; i < (oct || 4); i++) { sum += n2(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2; }
      return sum / norm;
    };
    return n2;
  };

  /* a tiling texture: fn(nx, ny, n) returns [r,g,b,a] for each pixel, n is the noise */
  FX.texture = function (size, seed, fn, cells) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
    const C = cells || 8;
    const n = FX.noise(seed, C);
    /* each octave tiles at its own period, so the whole texture tiles */
    const oct = [n, FX.noise(seed + 1, C * 2), FX.noise(seed + 2, C * 4), FX.noise(seed + 3, C * 8)];
    const fbm = (x, y) => (oct[0](x * C, y * C) * 0.5 + oct[1](x * C * 2, y * C * 2) * 0.25 + oct[2](x * C * 4, y * C * 4) * 0.15 + oct[3](x * C * 8, y * C * 8) * 0.1);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = x / size, ny = y / size;
      const px = fn(nx, ny, fbm(nx, ny), fbm);
      const i = (y * size + x) * 4;
      d[i] = px[0]; d[i + 1] = px[1]; d[i + 2] = px[2]; d[i + 3] = px[3] == null ? 255 : px[3];
    }
    g.putImageData(img, 0, 0);
    return c;
  };
  FX.canvas = function (w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

  /* ---------------- bloom ---------------- */
  /* Draw the things that glow into glow.ctx (screen coordinates), then end() adds a
     soft and a wide halo over the main canvas. */
  FX.Glow = function () {
    const G = this;
    G.a = FX.canvas(8, 8); G.b = FX.canvas(4, 4); G.c = FX.canvas(2, 2);
    G.ctx = G.a.getContext('2d');
    G.resize = function (W, H) {
      const w = Math.ceil(W / 4), h = Math.ceil(H / 4);
      if (G.a.width !== w || G.a.height !== h) { G.a.width = w; G.a.height = h; G.b.width = Math.ceil(w / 3); G.b.height = Math.ceil(h / 3); G.c.width = Math.ceil(w / 9); G.c.height = Math.ceil(h / 9); }
      G.W = W; G.H = H;
    };
    G.begin = function () {
      const g = G.ctx;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.clearRect(0, 0, G.a.width, G.a.height);
      g.setTransform(G.a.width / G.W, 0, 0, G.a.height / G.H, 0, 0);
      return g;
    };
    G.end = function (main, strength) {
      const bctx = G.b.getContext('2d'), cctx = G.c.getContext('2d');
      bctx.imageSmoothingEnabled = cctx.imageSmoothingEnabled = true;
      bctx.clearRect(0, 0, G.b.width, G.b.height); bctx.drawImage(G.a, 0, 0, G.b.width, G.b.height);
      cctx.clearRect(0, 0, G.c.width, G.c.height); cctx.drawImage(G.b, 0, 0, G.c.width, G.c.height);
      main.save();
      main.globalCompositeOperation = 'lighter';
      main.imageSmoothingEnabled = true;
      main.globalAlpha = 0.85 * (strength == null ? 1 : strength);
      main.drawImage(G.a, 0, 0, G.W, G.H);
      main.globalAlpha = 0.9 * (strength == null ? 1 : strength);
      main.drawImage(G.b, 0, 0, G.W, G.H);
      main.globalAlpha = 0.7 * (strength == null ? 1 : strength);
      main.drawImage(G.c, 0, 0, G.W, G.H);
      main.restore();
    };
  };

  /* a soft round light */
  FX.orb = function (ctx, x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, FX.rgba(col, a == null ? 1 : a)); g.addColorStop(0.35, FX.rgba(col, (a == null ? 1 : a) * 0.45)); g.addColorStop(1, FX.rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  };

  /* ---------------- shapes ---------------- */
  /* a tapered ribbon along points [[x,y],...], from width w0 to w1 */
  FX.ribbon = function (ctx, pts, w0, w1) {
    const n = pts.length;
    if (n < 2) return;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
      L.push([p[0] - dy * w, p[1] + dx * w]); R.push([p[0] + dy * w, p[1] - dx * w]);
    }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath(); ctx.fill();
  };
  /* points along a quadratic curve */
  FX.quad = function (x0, y0, cx, cy, x1, y1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]); }
    return out;
  };
  /* a leaf: base at (x,y), pointing at angle a, length l */
  FX.leaf = function (ctx, x, y, a, l, col, vein) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(l * 0.5, -l * 0.42, l, 0); ctx.quadraticCurveTo(l * 0.5, l * 0.42, 0, 0); ctx.fill();
    if (vein) { ctx.strokeStyle = vein; ctx.lineWidth = Math.max(0.5, l * 0.06); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(l * 0.85, 0); ctx.stroke(); }
    ctx.restore();
  };

  /* ---------------- the whole picture ---------------- */
  FX.vignette = function (ctx, W, H, k, col) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    g.addColorStop(0, FX.rgba(col || '#000000', 0)); g.addColorStop(1, FX.rgba(col || '#000000', k == null ? 0.45 : k));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  FX.grade = function (ctx, W, H, col, mode, a) {
    ctx.save(); ctx.globalCompositeOperation = mode || 'soft-light'; ctx.globalAlpha = a == null ? 0.3 : a;
    ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.restore();
  };
  /* long soft beams of light from (sx, sy), fanning down across the picture */
  FX.shafts = function (ctx, W, H, sx, sy, col, a, now, n) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const len = Math.hypot(W, H) * 1.3;
    for (let i = 0; i < (n || 7); i++) {
      const base = 0.35 + i * 0.16 + Math.sin(now * 0.13 + i * 1.7) * 0.035;
      const w = 0.025 + ((i * 37) % 7) * 0.006;
      const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(base) * len, sy + Math.sin(base) * len);
      const k = a * (0.5 + 0.5 * Math.sin(now * 0.3 + i * 2.3));
      g.addColorStop(0, FX.rgba(col, k)); g.addColorStop(1, FX.rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(base - w) * len, sy + Math.sin(base - w) * len);
      ctx.lineTo(sx + Math.cos(base + w) * len, sy + Math.sin(base + w) * len);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };
  /* a lens flare along the line from a light through the middle of the screen */
  FX.flare = function (ctx, W, H, sx, sy, col, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const dx = W / 2 - sx, dy = H / 2 - sy;
    [[0.3, 0.05, 0.25], [0.55, 0.02, 0.4], [0.8, 0.08, 0.15], [1.25, 0.035, 0.3], [1.6, 0.11, 0.1]].forEach(([t, r, k]) => {
      FX.orb(ctx, sx + dx * t, sy + dy * t, Math.min(W, H) * r, col, a * k);
    });
    ctx.restore();
  };
})();
