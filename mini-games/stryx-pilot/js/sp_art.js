/* ============================================================
   STRYX PILOT — js/sp_art.js
   Drawing a flight. The Tatu and Kalo are painted pixel by pixel
   (continents, seas, mountains, ice and craters from noise, lit
   from Pia'don's star, with city lights on the night side, glints
   on the sea, clouds drifting over them and a glow of air round
   them), and up close the land along the horizon rises in
   mountains and trees. The sky behind is a nebula of stars and
   Pia'don's outer cloud. The Eldi ship is bark and ember with gold
   sails and a seed that burns a trail; you are the Stryx at its
   bow. The Waves of Memory are an aurora across the sky.
   Things that glow bloom through js/flake/canvas_fx.js.

   Heavy painting happens once (and the worlds one at a time, so the
   first frame is quick); each frame puts the paintings in place.
   ============================================================ */
(function () {
  'use strict';
  const SP = window.SP, FX = window.FX;
  const A = SP.art = {};
  const TAU = Math.PI * 2;
  const SUN = { x: -0.62, y: -0.55 };          // Pia'don's light comes from the upper left
  const LIGHT = (() => { const z = 0.56; const l = Math.hypot(SUN.x, SUN.y, z); return [SUN.x / l, SUN.y / l, z / l]; })();
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  const glow = new FX.Glow();

  A.LOOKS = {
    velki: { deep: '#0e2e5e', sea: '#2a6aa8', shore: '#d8c890', land: ['#4f8a3a', '#6a9a48', '#8a8a50', '#7a6e5e'], snow: '#f2f4f8', sea0: 0.52, air: '#7ab4ff', cities: 0.6, northMist: true, ice: true, size: 640, seed: 11 },
    xikia: { deep: '#123c56', sea: '#2e7a9a', shore: '#cfc690', land: ['#2f6a2c', '#3f7a34', '#5a7a4a', '#7a7468'], snow: '#eef2f0', sea0: 0.44, air: '#8af0c0', cities: 0.62, northMist: false, ice: true, size: 540, seed: 23 },
    leotik: { deep: '#0e3a2e', sea: '#1e5a4a', shore: '#8a8a5a', land: ['#1f5a26', '#2a6a22', '#3a4a1e', '#3a2a22'], snow: null, sea0: 0.47, air: '#c8f080', cities: 0.9, lava: true, size: 460, seed: 37 },
    kalo: { deep: '#5a5a66', sea: '#7a7a86', shore: '#8a8a94', land: ['#8a8a94', '#9a9aa4', '#6a6a76', '#aeaeb8'], snow: null, sea0: -1, air: '#d8d8ff', cities: 0.8, craters: true, relics: true, size: 300, seed: 51 },
    karn: { deep: '#24324a', sea: '#2e6a78', shore: '#e8c890', land: ['#c8a050', '#a8803a', '#8a7a52', '#6a5a46'], snow: '#fff2d8', sea0: 0.46, air: '#ffd8a0', cities: 0.42, size: 560, seed: 91 },
    dancer: { deep: '#6a5a88', sea: '#8a7aa8', shore: '#a898c0', land: ['#b8a8d0', '#9a8ab8', '#c8b8e0', '#8a7aa8'], snow: null, sea0: -1, air: '#f0d0ff', cities: 2, craters: true, crystals: true, size: 260, seed: 63 },
  };

  /* ---------------- painting a world, once ---------------- */
  const baked = {};
  let bakeQueue = [];
  function bakeBody(look) {
    const L = A.LOOKS[look];
    const S = L.size, R = S / 2;
    const alb = FX.canvas(S, S), clo = FX.canvas(S, S), sha = FX.canvas(S, S), lit = FX.canvas(S, S);
    const ga = alb.getContext('2d'), gc = clo.getContext('2d'), gs = sha.getContext('2d'), gl = lit.getContext('2d');
    const ia = ga.createImageData(S, S), ic = gc.createImageData(S, S), is = gs.createImageData(S, S), il = gl.createImageData(S, S);
    const n = FX.noise(L.seed), nc = FX.noise(L.seed + 5), nk = FX.noise(L.seed + 9);
    const pal = k => FX.hex(k);
    const deep = pal(L.deep), sea = pal(L.sea), shore = pal(L.shore), land = L.land.map(pal), snow = L.snow ? pal(L.snow) : null;
    const craters = [];
    if (L.craters) { const r = SP.rng(L.seed); for (let i = 0; i < 28; i++) craters.push([r() * 2 - 1, r() * 2 - 1, 0.04 + Math.pow(r(), 2) * 0.22]); }
    const Hn = [LIGHT[0], LIGHT[1], LIGHT[2] + 1]; const hl = Math.hypot(Hn[0], Hn[1], Hn[2]); Hn[0] /= hl; Hn[1] /= hl; Hn[2] /= hl;
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - R) / R, ny = (y + 0.5 - R) / R, d2 = nx * nx + ny * ny;
      if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2);
      const lat = Math.asin(ny), lon = Math.atan2(nx, nz);
      const i = (y * S + x) * 4;
      /* the land */
      let h = n.fbm(lon * 1.6 + 7, lat * 2.2 + 3, 6);
      h += (n.fbm(lon * 6, lat * 6, 3) - 0.5) * 0.12;
      let col;
      if (L.craters) {
        col = mix(land[0], land[1], h);
        for (let k = 0; k < craters.length; k++) {
          const c = craters[k], dx = nx - c[0], dy = ny - c[1], dd = Math.sqrt(dx * dx + dy * dy) / c[2];
          if (dd < 1.15) { const rim = dd > 0.85 ? 1.18 : dd < 0.85 ? 0.82 + dd * 0.12 : 1; col = col.map(v => v * rim); }
        }
        if (L.crystals && nk(lon * 20, lat * 20) > 0.82) col = mix(col, [240, 210, 255], 0.7);
      } else if (h < L.sea0) {
        const t = Math.max(0, Math.min(1, (L.sea0 - h) / 0.18));
        col = mix(sea, deep, t);
        if (t < 0.12) col = mix(shore, col, t / 0.12 * 0.7 + 0.3);
      } else {
        const e = (h - L.sea0) / (1 - L.sea0);
        const moist = nc.fbm(lon * 2 + 11, lat * 2, 3);
        col = e < 0.08 ? mix(shore, land[0], e / 0.08) : e < 0.4 ? mix(land[0], land[1], moist) : e < 0.62 ? mix(land[1], land[2], (e - 0.4) / 0.22) : mix(land[2], land[3], Math.min(1, (e - 0.62) / 0.25));
        if (snow && e > 0.78) col = mix(col, snow, Math.min(1, (e - 0.78) / 0.12));
        if (L.lava && e > 0.55 && Math.abs(nk(lon * 9, lat * 9) - 0.5) < 0.025) col = [255, 110 + Math.random() * 60, 30];
      }
      /* ice at the poles, and Velki's misted north */
      if (L.ice && Math.abs(lat) > 1.34 + (n(lon * 3, 9) - 0.5) * 0.12) col = mix(col, [236, 242, 248], 0.92);
      if (L.northMist && lat < -0.75) col = mix(col, [220, 226, 236], Math.min(0.7, (-0.75 - lat) * 1.4));
      /* a little grain */
      const g = 0.94 + nk(x * 0.7, y * 0.7) * 0.12;
      ia.data[i] = col[0] * g; ia.data[i + 1] = col[1] * g; ia.data[i + 2] = col[2] * g; ia.data[i + 3] = 255;
      /* light: day side, night side, a soft line between */
      const dot = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
      const day = Math.max(0, Math.min(1, dot * 1.6 + 0.25));
      const limb = Math.pow(1 - nz, 3) * 0.35;
      is.data[i] = 4; is.data[i + 1] = 6; is.data[i + 2] = 22; is.data[i + 3] = Math.min(255, (1 - day) * 225 + limb * 255);
      /* glints on the sea, and lamps in the towns on the night side */
      const hd = Math.max(0, nx * Hn[0] + ny * Hn[1] + nz * Hn[2]);
      const isSea = !L.craters && h < L.sea0;
      let lr = 0, lg = 0, lb = 0, la = 0;
      if (isSea) { const sp = Math.pow(hd, 60) * 0.9 * day; lr = 255; lg = 245; lb = 220; la = sp; }
      const night = 1 - day;
      if (!isSea && night > 0.35) {
        /* towns gather in a few regions; within them, single lamps */
        const region = nc(lon * 4 + 20, lat * 4), lamp = nk(lon * 90, lat * 90);
        if (region > L.cities && lamp > 0.8) { lr = L.relics ? 140 : 255; lg = L.relics ? 230 : 205; lb = L.relics ? 255 : 130; la = Math.min(1, (lamp - 0.8) * 9) * night * 0.9; }
      }
      if (L.lava && col[0] > 240 && col[1] < 180) { lr = 255; lg = 120; lb = 40; la = 0.8; }
      il.data[i] = lr; il.data[i + 1] = lg; il.data[i + 2] = lb; il.data[i + 3] = la * 255;
      /* clouds */
      if (!L.craters) {
        const cv = nc.fbm(lon * 2.4 + 40, lat * 3.4, 5) + (nc(lon * 9, lat * 9) - 0.5) * 0.15;
        const a = Math.max(0, Math.min(1, (cv - 0.53) * 4));
        ic.data[i] = 250; ic.data[i + 1] = 252; ic.data[i + 2] = 255; ic.data[i + 3] = a * 235;
      }
    }
    ga.putImageData(ia, 0, 0); gc.putImageData(ic, 0, 0); gs.putImageData(is, 0, 0); gl.putImageData(il, 0, 0);
    baked[look] = { alb, clo, sha, lit, S, R };
  }
  function bodyArt(look) {
    if (baked[look]) return baked[look];
    if (bakeQueue.indexOf(look) < 0) bakeQueue.push(look);
    return null;
  }
  A.bakeSome = function () { if (bakeQueue.length) bakeBody(bakeQueue.shift()); };
  A.bakeAll = function () { Object.keys(A.LOOKS).forEach(k => { if (!baked[k]) bakeBody(k); }); bakeQueue = []; };

  /* ---------------- painting the sky, once ---------------- */
  let SKY = null;
  function sky() {
    if (SKY) return SKY;
    SKY = {};
    const T = 1024;
    SKY.neb = FX.texture(512, 77, (x, y, n, f) => {
      const a = f(x * 1.0 + 0.3, y * 1.0), b = f(x * 2 + 5, y * 2 + 1);
      const v = Math.max(0, a - 0.42) * 2.4, w = Math.max(0, b - 0.5) * 2;
      return [40 + v * 120 + w * 30, 20 + v * 40 + w * 90, 70 + v * 140 + w * 110, Math.min(255, (v * 0.55 + w * 0.3) * 255)];
    }, 4);
    const stars = k => {
      const c = FX.canvas(T, T), g = c.getContext('2d'), r = SP.rng(900 + k);
      for (let i = 0; i < (k ? 260 : 520); i++) {
        const x = r() * T, y = r() * T, s = (k ? 1.1 : 0.6) + Math.pow(r(), 3) * (k ? 2.4 : 1.2);
        const tint = r(); const col = tint < 0.15 ? '#ffd8b0' : tint < 0.3 ? '#b8d0ff' : '#ffffff';
        g.fillStyle = col; g.globalAlpha = 0.4 + r() * 0.6;
        g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
        if (s > 2.4) { g.globalAlpha = 0.35; g.fillRect(x - s * 4, y - 0.5, s * 8, 1); g.fillRect(x - 0.5, y - s * 4, 1, s * 8); FX.orb(g, x, y, s * 5, col, 0.25); }
      }
      return c;
    };
    SKY.s0 = stars(0); SKY.s1 = stars(1);
    /* rock, storm puffs and mist puffs */
    SKY.rocks = [];
    for (let i = 0; i < 6; i++) {
      const S = 96, c = FX.canvas(S, S), g = c.getContext('2d'), r = SP.rng(300 + i), nn = FX.noise(300 + i);
      const img = g.createImageData(S, S);
      const pts = []; for (let k = 0; k < 10; k++) pts.push(0.7 + r() * 0.3);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const dx = (x - S / 2) / (S / 2), dy = (y - S / 2) / (S / 2);
        const a = Math.atan2(dy, dx), d = Math.hypot(dx, dy);
        const k = (a / TAU + 1) * 10, k0 = Math.floor(k) % 10, k1 = (k0 + 1) % 10, t = k - Math.floor(k);
        const edge = pts[k0] + (pts[k1] - pts[k0]) * t;
        if (d > edge) continue;
        const nz = Math.sqrt(Math.max(0, 1 - (d / edge) ** 2));
        const lit = Math.max(0.1, dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2]);
        const tex = 0.7 + nn.fbm(x * 0.08, y * 0.08, 4) * 0.6;
        const v = 120 * lit * tex;
        const j = (y * S + x) * 4;
        img.data[j] = v * 0.95; img.data[j + 1] = v * 0.9; img.data[j + 2] = v; img.data[j + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      for (let k = 0; k < 3; k++) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(S * (0.3 + r() * 0.4), S * (0.3 + r() * 0.4), 4 + r() * 8, 0, TAU); g.stroke(); }
      SKY.rocks.push(c);
    }
    const puff = (seed, col, alpha) => FX.texture(160, seed, (x, y, n) => {
      const d = Math.hypot(x - 0.5, y - 0.5) * 2;
      const a = Math.max(0, (1 - d * d) * (n * 1.6 - 0.25));
      const c = FX.hex(col); const sh = 0.75 + (0.5 - y) * 0.6;
      return [c[0] * sh, c[1] * sh, c[2] * sh, Math.min(255, a * alpha * 255)];
    }, 3);
    SKY.storm = [puff(501, '#7a80a8', 1), puff(502, '#5a5e88', 1), puff(503, '#9aa0c0', 0.9)];
    SKY.mist = [puff(601, '#dfe8ff', 0.6), puff(602, '#c8d8f8', 0.5)];
    SKY.bark = FX.texture(64, 41, (x, y, n, f) => { const fur = Math.abs(Math.sin((y * 8 + f(x * 0.3, y) * 1.5) * Math.PI)); const v = 0.6 + n * 0.5; return [110 * v * (fur < 0.2 ? 0.55 : 1), 52 * v * (fur < 0.2 ? 0.55 : 1), 32 * v * (fur < 0.2 ? 0.55 : 1)]; }, 4);
    return SKY;
  }

  /* ---------------- particles ---------------- */
  const parts = [];
  A.parts = parts;
  function puff(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.ang != null ? o.ang : 0) + (o.ang != null ? (Math.random() - 0.5) * (o.spread || 0.6) : Math.random() * TAU);
      const sp = (o.sp || 120) * (0.4 + Math.random() * 0.8);
      parts.push({ x, y, vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0), life: (o.life || 0.6) * (0.7 + Math.random() * 0.6), age: 0, r: (o.r || 3) * (0.6 + Math.random() * 0.8), col: o.col || '#fff', kind: o.kind || 'dot' });
    }
  }
  A.event = function (e, f) {
    const s = f.ship;
    switch (e.t) {
      case 'hit': puff(e.x, e.y, 12 + Math.min(20, e.n), { col: '#ffcf8a', sp: 240, r: 2.5, life: 0.55, kind: 'spark' }); puff(e.x, e.y, 6, { col: '#5a3a2a', sp: 160, r: 3, life: 0.8, kind: 'chip' }); A.shake = Math.min(18, (A.shake || 0) + 3 + e.n * 0.5); break;
      case 'pop': puff(e.x, e.y, 14, { col: '#ffb040', sp: 180, r: 2.5, life: 0.5, kind: 'spark' }); break;
      case 'thwack': puff(e.x, e.y, 10, { col: '#c8f0a0', sp: 160, r: 2.5, life: 0.45, kind: 'spark' }); break;
      case 'boost': puff(s.x - Math.cos(s.ang) * 50, s.y - Math.sin(s.ang) * 50, 30, { col: '#ffd070', sp: 320, ang: s.ang + Math.PI, spread: 0.8, r: 3, life: 0.6, kind: 'spark', vx: s.vx, vy: s.vy }); A.ring(s.x - Math.cos(s.ang) * 50, s.y - Math.sin(s.ang) * 50, '#ffc060'); break;
      case 'mcfly': puff(e.x, e.y, 20, { col: '#ff9af0', sp: 200, r: 3, life: 0.9, kind: 'spark' }); A.ring(e.x, e.y, '#ffa0f0'); break;
      case 'bolt': A.flash = 0.22; A.bolts.push({ x: e.x, y: e.y, t: 0.3, seed: Math.random() * 1000 }); break;
      case 'wreck': puff(e.x, e.y, 70, { col: '#ff9a40', sp: 340, r: 4, life: 1.3, kind: 'spark' }); puff(e.x, e.y, 20, { col: '#4a2a1a', sp: 200, r: 5, life: 1.6, kind: 'chip' }); A.shake = 26; break;
      case 'dock': case 'touch': puff(e.x, e.y, 18, { col: 'rgba(230,220,200,.7)', sp: 100, r: 7, life: 1.0, kind: 'smoke' }); break;
      case 'takeoff': puff(e.x, e.y, 22, { col: 'rgba(230,220,200,.7)', sp: 130, r: 8, life: 1.1, kind: 'smoke' }); break;
      case 'rescue': puff(e.x, e.y, 30, { col: '#ffe0a0', sp: 220, r: 3, life: 1.0, kind: 'spark' }); A.ring(e.x, e.y, '#ffe0a0'); break;
      case 'sling': A.ring(e.x, e.y, '#a8e8ff'); puff(e.x, e.y, 16, { col: '#a8e8ff', sp: 160, r: 2.5, life: 0.7, kind: 'spark', vx: s.vx * 0.5, vy: s.vy * 0.5 }); break;
      case 'screech': A.ring(e.x, e.y, '#ff7a7a'); break;
    }
  };
  A.bolts = [];
  A.ring = function (x, y, col) { parts.push({ x, y, vx: 0, vy: 0, life: 0.6, age: 0, r: 70, col, kind: 'ring' }); };
  A.trail = [];
  A.stepParts = function (dt, f) {
    const s = f.ship;
    if (s.thrusting && !f.docked) {
      const bx = s.x - Math.cos(s.ang) * 56, by = s.y - Math.sin(s.ang) * 56;
      puff(bx, by, 3, { col: Math.random() < 0.5 ? '#ffb040' : '#ff7020', sp: 180, ang: s.ang + Math.PI, spread: 0.5, r: 2.6, life: 0.45, kind: 'spark', vx: s.vx * 0.6, vy: s.vy * 0.6 });
      if (Math.random() < 0.4) puff(bx, by, 1, { col: 'rgba(120,110,110,.35)', sp: 60, ang: s.ang + Math.PI, spread: 0.8, r: 6, life: 1.2, kind: 'smoke', vx: s.vx * 0.3, vy: s.vy * 0.3 });
    }
    if (s.smoulder > 0 && Math.random() < 0.6) puff(s.x, s.y, 1, { col: 'rgba(90,80,70,.6)', sp: 40, r: 7, life: 1.4, kind: 'smoke' });
    /* the seed's trail behind the ship */
    const T = A.trail;
    if (!f.docked && !s.grounded) T.push([s.x - Math.cos(s.ang) * 50, s.y - Math.sin(s.ang) * 50, s.thrusting ? 1 : 0.35]);
    if (T.length > 46 || (T.length && (f.docked || s.grounded))) T.shift();
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt;
      if (p.age > p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 1.2 * dt; p.vy *= 1 - 1.2 * dt;
    }
    if (parts.length > 900) parts.splice(0, parts.length - 900);
    for (let i = A.bolts.length - 1; i >= 0; i--) { A.bolts[i].t -= dt; if (A.bolts[i].t <= 0) A.bolts.splice(i, 1); }
    if (A.shake) A.shake = Math.max(0, A.shake - dt * 40);
    if (A.flash) A.flash = Math.max(0, A.flash - dt);
    A.bakeSome();
  };

  /* ---------------- the camera ---------------- */
  A.cam = { x: 0, y: 0, z: 0.6 };
  A.resetCamera = function (f) { A.cam.x = f.ship.x; A.cam.y = f.ship.y; A.cam.z = 0.9; A.trail.length = 0; };

  /* ---------------- the sky behind ---------------- */
  function drawSky(ctx, W, H, cam, z, now) {
    const K = sky();
    const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, '#070a22'); g.addColorStop(0.6, '#0f0c2a'); g.addColorStop(1, '#1a0e30');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const tileDraw = (img, k, scale, alpha) => {
      const w = img.width * scale, h = img.height * scale;
      const ox = ((-cam.x * k) % w + w) % w - w, oy = ((-cam.y * k) % h + h) % h - h;
      ctx.globalAlpha = alpha;
      for (let x = ox; x < W; x += w) for (let y = oy; y < H; y += h) ctx.drawImage(img, x, y, w, h);
      ctx.globalAlpha = 1;
    };
    tileDraw(K.neb, 0.01, 2.6, 0.9);
    tileDraw(K.s0, 0.025, 1, 1);
    tileDraw(K.s1, 0.06, 1, 0.9);
    /* Pia'don's outer cloud: a pale ring across the sky */
    ctx.save(); ctx.translate(W * 0.5, H * 0.52); ctx.rotate(-0.35);
    const rg = ctx.createLinearGradient(0, -H * 0.16, 0, H * 0.16);
    rg.addColorStop(0, 'rgba(210,190,255,0)'); rg.addColorStop(0.5, 'rgba(220,200,255,.11)'); rg.addColorStop(1, 'rgba(210,190,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(-W, -H * 0.16, W * 2, H * 0.32);
    ctx.restore();
    /* the star itself, far off at the upper left */
    const sx = W * 0.06, sy = H * 0.08;
    FX.orb(ctx, sx, sy, Math.max(W, H) * 0.45, '#ffcf90', 0.28);
    FX.orb(ctx, sx, sy, Math.max(W, H) * 0.12, '#fff2d0', 0.6);
    FX.orb(glow.ctx, sx, sy, Math.max(W, H) * 0.1, '#fff2d0', 0.8);
    return { sx, sy };
  }

  /* ---------------- a Tatu or Kalo ---------------- */
  function drawBody(ctx, gl, b, view, now, near) {
    const L = A.LOOKS[b.look] || A.LOOKS.kalo, Bk = bodyArt(b.look);
    const { z } = view;
    const R = b.r;
    /* the glow of its air */
    const ag = ctx.createRadialGradient(b.x, b.y, R * 0.96, b.x, b.y, R + 260);
    ag.addColorStop(0, FX.rgba(L.air, b.look === 'kalo' || b.look === 'dancer' ? 0.12 : 0.42)); ag.addColorStop(0.35, FX.rgba(L.air, 0.12)); ag.addColorStop(1, FX.rgba(L.air, 0));
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(b.x, b.y, R + 260, 0, TAU); ctx.fill();
    if (!Bk) {
      ctx.fillStyle = L.sea; ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, TAU); ctx.fill();
      return;
    }
    const spin = b.rot || 0;                  /* the world turns: its face, and its clouds a little faster */
    ctx.save(); ctx.translate(b.x, b.y);
    /* up close, a clean edge and fine texture over the painting */
    const close = R * z > 650;
    if (close) { ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip(); }
    ctx.save(); ctx.rotate(spin);
    ctx.drawImage(Bk.alb, -R, -R, R * 2, R * 2);
    if (close) {
      const K = sky();
      if (!K.grain) K.grain = FX.texture(256, 88, (x, y, nn) => { const v = 90 + nn * 150; return [v, v, v]; }, 8);
      if (!K.grainPat) K.grainPat = ctx.createPattern(K.grain, 'repeat');
      ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.45; ctx.scale(1.6, 1.6);
      ctx.fillStyle = K.grainPat; ctx.fillRect(-R, -R, R * 1.25, R * 1.25); ctx.restore();
    }
    /* clouds drift round */
    if (b.look !== 'kalo' && b.look !== 'dancer') {
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
      ctx.rotate(now * 0.006 + spin * 0.15);
      ctx.globalAlpha = 0.88; ctx.drawImage(Bk.clo, -R * 1.02, -R * 1.02, R * 2.04, R * 2.04);
      /* cloud shadows */
      ctx.globalAlpha = 0.18; ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(Bk.clo, -R * 1.02 + 8, -R * 1.02 + 10, R * 2.04, R * 2.04);
      ctx.restore();
    }
    ctx.restore();
    /* night side, then the lamps and sea-glints over it */
    ctx.drawImage(Bk.sha, -R, -R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(Bk.lit, -R, -R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'source-over';
    gl.save(); gl.translate(b.x, b.y); gl.globalAlpha = 0.8; gl.drawImage(Bk.lit, -R, -R, R * 2, R * 2); gl.globalAlpha = 1; gl.restore();
    /* light scattered in the air at the rim, brightest on the sun side */
    const sa = Math.atan2(SUN.y, SUN.x);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = Math.max(4, 14); ctx.strokeStyle = FX.rgba(L.air, 0.22);
    ctx.beginPath(); ctx.arc(0, 0, R + 3, sa - 1.9, sa + 1.9); ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = FX.rgba(L.air, 0.5);
    ctx.beginPath(); ctx.arc(0, 0, R + 1, sa - 1.3, sa + 1.3); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    /* up close: the land along the horizon stands up in mountains and trees */
    if (near && b.look !== 'dancer') horizon(ctx, gl, b, L, view, now);
  }
  function horizon(ctx, gl, b, L, view, now) {
    const { cam, W, H, z } = view;
    const ca = Math.atan2(cam.y - b.y, cam.x - b.x);
    const span = Math.min(Math.PI, (Math.hypot(W, H) / z) / b.r * 1.4 + 0.1);
    const step = 26 / b.r;
    const n = FX.noise(L.seed + 3);
    const lightAt = a => { const d = Math.cos(a - Math.atan2(SUN.y, SUN.x)); return Math.max(0, Math.min(1, d * 1.4 + 0.35)); };
    const land = L.land, R = b.r;
    /* mountains: a ridge line of noise, on land only */
    const rot = b.rot || 0;
    const padAngles = SP.PORTS.filter(p => p.body === b.id).map(p => p.ang + rot);
    const ridge = a => {
      /* flat ground round each port's pad */
      let flat = 1;
      for (let i = 0; i < padAngles.length; i++) { const d = Math.abs(SP.angDiff(a, padAngles[i])) * R; if (d < 520) flat = Math.min(flat, Math.max(0, (d - 220) / 300)); }
      const t = (a - rot) * R / 420;            /* features belong to the ground, so they turn with it */
      const h = n.fbm(t + 100, 3, 4), land0 = n.fbm(t * 0.35 + 50, 9, 3);
      if (!L.craters && land0 < 0.45) return { h: 0, sea: true };
      return { h: Math.pow(Math.max(0, h - 0.35), 1.4) * (L.craters ? 160 : 420) * flat, sea: false, flat };
    };
    const a0 = ca - span, a1 = ca + span;
    /* back range, lighter with haze */
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      let first = true;
      for (let a = a0; a <= a1; a += step) {
        const rg = ridge(a + (pass ? 0 : 0.6 / R * 100));
        const hh = rg.h * (pass ? 1 : 0.65);
        const rr = R - 6 + hh;
        const x = b.x + Math.cos(a) * rr, y = b.y + Math.sin(a) * rr;
        if (first) { ctx.moveTo(b.x + Math.cos(a) * (R - 40), b.y + Math.sin(a) * (R - 40)); first = false; }
        ctx.lineTo(x, y);
      }
      ctx.lineTo(b.x + Math.cos(a1) * (R - 40), b.y + Math.sin(a1) * (R - 40));
      ctx.closePath();
      const li = lightAt(ca);
      const base = pass ? land[3] : FX.mix(land[2], L.air, 0.45);
      ctx.fillStyle = FX.mix(base, '#06081a', 0.75 * (1 - li));
      ctx.fill();
    }
    /* snow on the high peaks */
    if (L.snow) {
      ctx.fillStyle = FX.mix(L.snow, '#06081a', 0.7 * (1 - lightAt(ca)));
      for (let a = a0; a <= a1; a += step) {
        const rg = ridge(a); if (rg.h < 230) continue;
        const rr = R - 6 + rg.h, x = b.x + Math.cos(a) * rr, y = b.y + Math.sin(a) * rr;
        const tx = -Math.sin(a), ty = Math.cos(a);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * 40 + tx * 16, y - Math.sin(a) * 40 + ty * 16); ctx.lineTo(x - Math.cos(a) * 40 - tx * 16, y - Math.sin(a) * 40 - ty * 16); ctx.fill();
      }
    }
    /* trees along the shore and the lowlands */
    if (!L.craters) {
      for (let a = a0; a <= a1; a += step * 0.3) {
        const rg = ridge(a); if (rg.sea || rg.h > 140 || rg.flat < 0.3) continue;
        const k = hash(Math.round((a - rot) * 1000));
        if (k < 0.35) continue;
        const rr = R - 2, x = b.x + Math.cos(a) * rr, y = b.y + Math.sin(a) * rr;
        const ux = Math.cos(a), uy = Math.sin(a), tx = -uy, ty = ux;
        const hgt = 16 + k * 28, li = lightAt(a);
        ctx.fillStyle = FX.mix(L.lava ? '#2a2018' : land[1], '#06081a', 0.7 * (1 - li));
        if (b.look === 'xikia' || k > 0.8) {
          ctx.beginPath(); ctx.moveTo(x + tx * 7, y + ty * 7); ctx.lineTo(x + ux * hgt, y + uy * hgt); ctx.lineTo(x - tx * 7, y - ty * 7); ctx.fill();
        } else {
          ctx.fillRect(x + ux * hgt * 0.2 - 2, y + uy * hgt * 0.2 - 2, 4, 4);
          ctx.beginPath(); ctx.arc(x + ux * hgt * 0.62, y + uy * hgt * 0.62, hgt * 0.36, 0, TAU); ctx.arc(x + ux * hgt * 0.5 + tx * hgt * 0.25, y + uy * hgt * 0.5 + ty * hgt * 0.25, hgt * 0.28, 0, TAU); ctx.fill();
        }
      }
    }
    /* Mba'Karn: lanterns all along its shore, waiting for a ship */
    if (b.look === 'karn') {
      for (let a = a0; a <= a1; a += step * 0.7) {
        if (hash(Math.round((a - rot) * 700)) > 0.4) continue;
        const rr = R + 14 + hash(a * 31) * 30, x = b.x + Math.cos(a) * rr, y = b.y + Math.sin(a) * rr;
        const fl = 0.7 + 0.3 * Math.sin(now * 3 + a * 50);
        ctx.fillStyle = '#ffd890'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
        FX.orb(gl, x, y, 46, '#ffb860', 0.8 * fl);
      }
    }
    /* sea at the horizon glitters */
    if (!L.craters) {
      gl.fillStyle = 'rgba(255,240,210,.5)';
      for (let a = a0; a <= a1; a += step * 0.4) {
        if (!ridge(a).sea || hash(a * 777 + Math.floor(now * 3)) > 0.12 || lightAt(a) < 0.5) continue;
        const x = b.x + Math.cos(a) * (R + 1), y = b.y + Math.sin(a) * (R + 1);
        gl.fillRect(x - 3, y - 3, 6, 6);
      }
    }
  }

  /* ---------------- a port ---------------- */
  function drawPort(ctx, gl, p, f, view, now, mark) {
    const pp = SP.portPos(p, f.bodies);
    const a = Math.atan2(pp.ny, pp.nx);
    const lit = Math.max(0, Math.min(1, Math.cos(a - Math.atan2(SUN.y, SUN.x)) * 1.4 + 0.35));
    const dim = c => FX.mix(c, '#06081a', 0.7 * (1 - lit));
    ctx.save(); gl.save();
    ctx.translate(pp.x, pp.y); ctx.rotate(a + Math.PI / 2);
    gl.translate(pp.x, pp.y); gl.rotate(a + Math.PI / 2);
    /* the buildings, tall timbered houses and towers, either side of the pad */
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1, j = i % 4;
      const bx = side * (72 + j * 30), bh = 34 + hash(i + p.ang * 10) * 60 + (j === 3 ? 30 : 0), bw = j === 3 ? 18 : 26;
      const wg = ctx.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0);
      wg.addColorStop(0, dim('#9a7a54')); wg.addColorStop(1, dim('#5a3e28'));
      ctx.fillStyle = wg; ctx.fillRect(bx - bw / 2, -bh, bw, bh + 6);
      ctx.fillStyle = dim('#3a2414'); ctx.fillRect(bx - bw / 2, -bh * 0.55, bw, 2); ctx.fillRect(bx - 1, -bh, 2, bh);
      ctx.fillStyle = dim(j === 3 ? '#5a6a8a' : '#a84a2a');
      ctx.beginPath(); ctx.moveTo(bx - bw / 2 - 4, -bh); ctx.lineTo(bx, -bh - (j === 3 ? 30 : 18)); ctx.lineTo(bx + bw / 2 + 4, -bh); ctx.closePath(); ctx.fill();
      /* windows: lamps lit on the night side */
      for (let w = 0; w < 3; w++) {
        const wy = -bh * (0.25 + w * 0.25), on = lit < 0.6 || hash(i * 7 + w) > 0.6;
        ctx.fillStyle = on ? '#ffd890' : dim('#2a1a10');
        ctx.fillRect(bx - 4, wy, 8, 7);
        if (on && lit < 0.7) FX.orb(gl, bx, wy + 3, 18, '#ffb060', 0.7);
      }
    }
    /* the pad, with lights along it */
    ctx.fillStyle = dim('#4a3a2a'); ctx.fillRect(-60, -6, 120, 12);
    ctx.fillStyle = dim('#7a6a54'); ctx.fillRect(-60, -6, 120, 3);
    for (let i = -3; i <= 3; i++) {
      const on = (Math.floor(now * 6) + i + 3) % 7 === 0;
      ctx.fillStyle = on ? '#fff0a0' : '#8a7a3a'; ctx.fillRect(i * 17 - 3, -8, 6, 3);
      if (on || mark) FX.orb(gl, i * 17, -7, on ? 16 : 8, mark ? '#ffd36a' : '#a0d8ff', on ? 0.9 : 0.4);
    }
    /* the beacon, and for a port your jobs are going to, a beam into the sky */
    ctx.fillStyle = dim('#3a2a1e'); ctx.fillRect(62, -84, 5, 84);
    const pulse = 0.5 + 0.5 * Math.sin(now * 4);
    ctx.fillStyle = mark ? '#ffd36a' : '#a8d8ff'; ctx.beginPath(); ctx.arc(64, -88, 6, 0, TAU); ctx.fill();
    FX.orb(gl, 64, -88, 34, mark ? '#ffd36a' : '#a8d8ff', 0.6 + pulse * 0.4);
    if (mark) {
      const bg = ctx.createLinearGradient(0, 0, 0, -1600);
      bg.addColorStop(0, 'rgba(255,215,110,.35)'); bg.addColorStop(1, 'rgba(255,215,110,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = bg;
      ctx.beginPath(); ctx.moveTo(-30, -10); ctx.lineTo(30, -10); ctx.lineTo(90 + pulse * 20, -1600); ctx.lineTo(-90 - pulse * 20, -1600); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore(); gl.restore();
    if (view.z > 0.3) {
      ctx.save();
      const lx = pp.x + pp.nx * 180, ly = pp.y + pp.ny * 180;
      ctx.translate(lx, ly); ctx.scale(1 / view.z, 1 / view.z);
      ctx.font = (mark ? 'bold ' : '') + '15px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillText(p.name, 1, 1);
      ctx.fillStyle = mark ? '#ffe2a0' : 'rgba(230,232,255,.9)'; ctx.fillText(p.name, 0, 0);
      ctx.restore();
    }
  }

  /* ---------------- the Eldi ship ---------------- */
  function nameTag(ctx, x, y, text, col, z) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1 / z, 1 / z);
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(text, 1, 1); ctx.fillStyle = col; ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  function drawShip(ctx, gl, s, S, now, braking, tint) {
    const K = sky();
    ctx.save(); gl.save();
    ctx.translate(s.x, s.y); ctx.rotate(s.ang); ctx.scale(1.3, 1.3);
    if (tint) { ctx.fillStyle = tint; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(6, -44); ctx.lineTo(6, -60); ctx.lineTo(22, -52); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
    gl.translate(s.x, s.y); gl.rotate(s.ang); gl.scale(1.3, 1.3);
    /* the flame of the seed */
    if (s.thrusting) {
      const fl = 30 + Math.random() * 20 + (s.boostT > 0 ? 40 : 0);
      const fg = ctx.createLinearGradient(-44, 0, -44 - fl, 0);
      fg.addColorStop(0, 'rgba(255,240,170,1)'); fg.addColorStop(0.4, 'rgba(255,150,40,.85)'); fg.addColorStop(1, 'rgba(255,70,20,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-42, -11); ctx.quadraticCurveTo(-46 - fl, 0, -42, 11); ctx.closePath(); ctx.fill();
      FX.orb(gl, -50, 0, 40 + fl * 0.5, '#ff9a30', 0.9);
    }
    /* the sails: gold, lit through by the light, two to a side */
    const open = braking ? 1.35 : 1;
    [[6, 1], [-16, 0.78]].forEach(([mx, k]) => {
      [-1, 1].forEach(sd => {
        const reach = 42 * k * open;
        const sg = ctx.createLinearGradient(mx, sd * 6, mx + (sd < 0 ? -6 : 6), sd * reach);
        const litSide = sd * SUN.y < 0 ? 1 : 0.7;
        sg.addColorStop(0, 'rgba(255,224,130,' + (0.9 * litSide) + ')'); sg.addColorStop(1, 'rgba(230,170,70,' + (0.4 * litSide) + ')');
        ctx.fillStyle = sg; ctx.strokeStyle = 'rgba(255,240,180,.95)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(mx + 2, sd * 8);
        ctx.quadraticCurveTo(mx + 18, sd * reach * 0.6, mx + 4, sd * reach);
        ctx.quadraticCurveTo(mx - 15, sd * reach * 0.75, mx - 14, sd * 8);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(150,100,40,.5)'; ctx.lineWidth = 0.8;
        for (let r2 = 0; r2 < 3; r2++) { ctx.beginPath(); ctx.moveTo(mx - 10 + r2 * 6, sd * 9); ctx.lineTo(mx - 6 + r2 * 5, sd * reach * (0.75 + r2 * 0.08)); ctx.stroke(); }
        /* rigging back to the hull */
        ctx.strokeStyle = 'rgba(60,40,20,.7)'; ctx.beginPath(); ctx.moveTo(mx + 4, sd * reach); ctx.lineTo(mx + 26, sd * 8); ctx.stroke();
      });
      ctx.strokeStyle = '#3a2214'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(mx, -42 * k * open); ctx.lineTo(mx, 42 * k * open); ctx.stroke();
      gl.globalAlpha = 0.25; gl.fillStyle = '#ffd890'; gl.beginPath(); gl.ellipse(mx, 0, 10, 40 * k * open, 0, 0, TAU); gl.fill(); gl.globalAlpha = 1;
    });
    /* the hull: a hollowed fire tree */
    const hull = new Path2D();
    hull.moveTo(-44, -12); hull.quadraticCurveTo(10, -19, 46, -6); hull.quadraticCurveTo(55, 0, 46, 6); hull.quadraticCurveTo(10, 19, -44, 12); hull.quadraticCurveTo(-50, 0, -44, -12); hull.closePath();
    ctx.fillStyle = ctx.createPattern(K.bark, 'repeat'); ctx.fill(hull);
    const hg = ctx.createLinearGradient(0, -16, 0, 16);
    hg.addColorStop(0, 'rgba(255,200,150,.35)'); hg.addColorStop(0.45, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = hg; ctx.fill(hull);
    /* ember seams glowing along the grain (fire never harms the wood) */
    const seams = [[-32, -6, 0, -10, 32, -5], [-36, 5, -4, 9, 28, 4], [-22, 0, 6, 1, 38, 0]];
    const flick = 0.6 + 0.4 * Math.sin(now * 3);
    ctx.strokeStyle = 'rgba(255,' + Math.floor(130 + 60 * flick) + ',50,.85)'; ctx.lineWidth = 1.2;
    gl.strokeStyle = 'rgba(255,140,40,' + flick + ')'; gl.lineWidth = 3;
    seams.forEach(l => { ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.quadraticCurveTo(l[2], l[3], l[4], l[5]); ctx.stroke(); gl.beginPath(); gl.moveTo(l[0], l[1]); gl.quadraticCurveTo(l[2], l[3], l[4], l[5]); gl.stroke(); });
    /* the hollow, with crew and cargo in it */
    ctx.fillStyle = '#1e0c06'; ctx.beginPath(); ctx.ellipse(-2, 0, 27, 5.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-18, -3, 7, 6); ctx.fillRect(-8, -3.5, 6, 7);
    ctx.fillStyle = '#9a7448'; ctx.beginPath(); ctx.arc(6, 0, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6a4a24'; ctx.beginPath(); ctx.ellipse(6, -1, 3.6, 2.4, 0, Math.PI, TAU); ctx.fill();
    /* the fire seed in the stern */
    const heat = s.heat / S.heatMax, pulse = 0.6 + 0.4 * Math.sin(now * 5);
    FX.orb(gl, -42, 0, 22 + heat * 12, '#ffa040', 0.3 + heat * 0.6 * pulse);
    const sg2 = ctx.createRadialGradient(-43, -2, 1, -42, 0, 9);
    sg2.addColorStop(0, heat > 0.05 ? '#fff0b0' : '#8a6a5a'); sg2.addColorStop(1, heat > 0.05 ? '#e86a20' : '#4a3a30');
    ctx.fillStyle = sg2; ctx.beginPath(); ctx.ellipse(-42, 0, 9, 7, 0, 0, TAU); ctx.fill();
    /* you: the Stryx, a flat stone grown into the pilot stump at the bow */
    ctx.fillStyle = '#4a3622'; ctx.beginPath(); ctx.ellipse(31, 0, 10, 10, 0, 0, TAU); ctx.fill();
    const stg = ctx.createRadialGradient(28, -4, 1, 32, 0, 13);
    stg.addColorStop(0, '#c8c2b4'); stg.addColorStop(1, '#5a5448');
    ctx.fillStyle = stg; ctx.beginPath(); ctx.ellipse(33, 0, 13, 8.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(40,36,30,.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(26, -2); ctx.lineTo(38, -3); ctx.moveTo(27, 3); ctx.lineTo(37, 2); ctx.stroke();
    /* its vines over it, steering; out wide when it lashes */
    const lashK = s.lashT > 0 ? (1 - s.lashT / 0.35) : 0;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + now * 0.5;
      let ex, ey;
      if (lashK > 0) { const R2 = S.lash / 1.3 * Math.sin(lashK * Math.PI); ex = 32 + Math.cos(a) * R2; ey = Math.sin(a) * R2; }
      else { ex = 32 + Math.cos(a) * 15 + Math.sin(now * 2 + i) * 3; ey = Math.sin(a) * 13; }
      const pts = FX.quad(32, 0, (32 + ex) / 2 + Math.sin(now * 3 + i) * 7, ey / 2 + Math.cos(now * 3 + i) * 7, ex, ey, 8);
      ctx.fillStyle = i % 2 ? '#3e6a2a' : '#5a8a3a'; FX.ribbon(ctx, pts, 3.4, 1);
      if (lashK > 0) { gl.fillStyle = 'rgba(180,255,140,.6)'; FX.ribbon(gl, pts, 4, 1); }
      else FX.leaf(ctx, pts[5][0], pts[5][1], a, 6, '#6a9a44');
    }
    if (s.stun > 0) { ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 3; i++) { const a = now * 6 + i * 2.1; ctx.beginPath(); ctx.arc(32 + Math.cos(a) * 20, Math.sin(a) * 20 - 26, 3, 0, TAU); ctx.fill(); } }
    ctx.restore(); gl.restore();
  }
  A.drawShipAt = function (ctx, x, y, ang, scale, now) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    drawShip(ctx, glow.ctx, { x: 0, y: 0, ang, heat: 1, thrusting: true, boostT: 0, lashT: 0, stun: 0 }, { heatMax: 1, lash: 100 }, now, false);
    ctx.restore();
  };

  /* ================= the whole view ================= */
  A.draw = function (ctx, W, H, f, now, opts) {
    opts = opts || {};
    const s = f.ship, cam = A.cam;
    glow.resize(W, H);
    const gl = glow.begin();
    const P = SP.pull(f, s.x, s.y);
    const sp = Math.hypot(s.vx, s.vy);
    const zBase = Math.min(W, H) / 900;
    const zT = zBase * Math.max(0.4, Math.min(1.1, 1.15 - P.alt / 2200 - sp / 2600));
    cam.z += (zT - cam.z) * 0.035;
    cam.x += (s.x + s.vx * 0.5 - cam.x) * 0.08; cam.y += (s.y + s.vy * 0.5 - cam.y) * 0.08;
    const z = cam.z;
    const shx = A.shake ? (Math.random() - 0.5) * A.shake : 0, shy = A.shake ? (Math.random() - 0.5) * A.shake : 0;
    const ox = W / 2 - cam.x * z + shx, oy = H / 2 - cam.y * z + shy;
    const SX = x => x * z + ox, SY = y => y * z + oy;
    const vis = (x, y, r) => SX(x) + r * z > -60 && SX(x) - r * z < W + 60 && SY(y) + r * z > -60 && SY(y) - r * z < H + 60;
    const view = { z, cam, W, H };

    const star = drawSky(ctx, W, H, cam, z, now);

    ctx.save(); ctx.translate(ox, oy); ctx.scale(z, z);
    gl.save(); gl.translate(ox, oy); gl.scale(z, z);

    /* the Waves of Memory: an aurora across the sky */
    const w = f.wave;
    if (w) aurora(ctx, gl, f, w, cam, W, H, z, now);
    /* the oath-mist */
    const K = sky();
    f.mists.forEach(m => {
      if (!vis(m.x, m.y, m.r)) return;
      for (let i = 0; i < 9; i++) {
        const a = hash(i) * TAU + now * 0.04 * (i % 2 ? 1 : -1), d = hash(i * 3) * m.r * 0.6;
        const img = K.mist[i % 2], sz = m.r * (0.9 + hash(i * 5) * 0.6);
        ctx.globalAlpha = 0.55;
        ctx.drawImage(img, m.x + Math.cos(a) * d - sz / 2, m.y + Math.sin(a) * d - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
    });
    /* the Tatu and Kalo */
    f.list.forEach(b => { if (vis(b.x, b.y, b.r + 280)) drawBody(ctx, gl, b, view, now, b.r * z > 500 && P.near === b); });
    /* ports */
    SP.portsIn(f.bodies).forEach(p => { const pp = SP.portPos(p, f.bodies); if (vis(pp.x, pp.y, 300)) drawPort(ctx, gl, p, f, view, now, opts.marks && opts.marks.has(p.id)); });
    /* storms */
    f.storms.forEach(st => {
      if (!vis(st.x, st.y, st.r + 100)) return;
      for (let i = 0; i < 11; i++) {
        const a = hash(i + st.x) * TAU + now * 0.06 * (i % 2 ? 1 : -1), d = hash(i * 5 + st.y) * st.r * 0.7;
        const img = K.storm[i % 3], sz = st.r * (0.7 + hash(i * 7) * 0.6);
        ctx.save(); ctx.translate(st.x + Math.cos(a) * d, st.y + Math.sin(a) * d); ctx.rotate(now * 0.05 + i);
        ctx.globalAlpha = 0.85; ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz); ctx.restore();
      }
      ctx.globalAlpha = 1;
      /* lightning flickering inside the clouds */
      if (Math.sin(now * 7 + st.x) > 0.93) FX.orb(gl, st.x + Math.sin(now * 31) * st.r * 0.4, st.y + Math.cos(now * 23) * st.r * 0.4, st.r * 0.6, '#c8d0ff', 0.6);
      ctx.strokeStyle = 'rgba(200,210,255,.22)'; ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const px = st.x + (hash(i * 9) - 0.5) * st.r * 1.4, py = st.y + (hash(i * 13) - 0.5) * st.r * 1.4, k = ((now * 1.5 + hash(i)) % 1);
        ctx.beginPath(); ctx.moveTo(px + st.wx * k, py + st.wy * k); ctx.lineTo(px + st.wx * (k + 0.25), py + st.wy * (k + 0.25)); ctx.stroke();
      }
    });
    f.strikes.forEach(k => {
      if (!vis(k.x, k.y, 200) || k.t <= 0) return;
      ctx.strokeStyle = 'rgba(255,255,210,' + (Math.sin(now * 40) > 0 ? 0.75 : 0.25) + ')'; ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(k.x, k.y, 95, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      FX.orb(gl, k.x, k.y, 60, '#e0e8ff', 0.3);
    });
    A.bolts.forEach(bo => {
      const r = SP.rng(Math.floor(bo.seed));
      const pts = []; let x = bo.x, y = bo.y - 760; pts.push([x, y]);
      for (let i = 0; i < 12; i++) { x += (r() - 0.5) * 90; y += 760 / 12; pts.push([x, y]); }
      ctx.fillStyle = 'rgba(255,255,240,.95)'; FX.ribbon(ctx, pts, 3, 7);
      gl.fillStyle = 'rgba(200,210,255,1)'; FX.ribbon(gl, pts, 16, 30);
    });
    /* sky rock */
    f.rocks.forEach(k => {
      if (!vis(k.x, k.y, k.r)) return;
      const img = K.rocks[Math.floor(k.seed * 6) % 6];
      ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.spin);
      ctx.drawImage(img, -k.r * 1.1, -k.r * 1.1, k.r * 2.2, k.r * 2.2);
      ctx.restore();
    });
    /* skiffs adrift */
    f.skiffs.forEach(k => {
      if (!vis(k.x, k.y, 120)) return;
      drawSkiff(ctx, gl, k, s, now);
    });
    /* Tyndael: flying sparks with wings */
    f.tyndael.forEach((t, i) => {
      if (!t.alive || !vis(t.x, t.y, 40)) return;
      const fl = Math.sin(now * 24 + i) * 0.6, ang = Math.atan2(t.vy, t.vx);
      FX.orb(gl, t.x, t.y, 34, '#ff9a30', 0.9);
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(ang);
      const tg = ctx.createLinearGradient(-30, 0, 10, 0);
      tg.addColorStop(0, 'rgba(255,90,20,0)'); tg.addColorStop(1, 'rgba(255,200,90,.9)');
      ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(-6, -7, -30 - Math.random() * 8, 0); ctx.quadraticCurveTo(-6, 7, 10, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,210,110,.85)';
      [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(-4, sd * 18 * (1 + fl), -14, sd * 16 * (1 + fl)); ctx.quadraticCurveTo(-8, sd * 6, -6, 0); ctx.fill(); });
      ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(4, 0, 4, 0, TAU); ctx.fill();
      ctx.restore();
    });
    /* Lutut: the big terrors of the sky */
    f.lutut.forEach(l => {
      if (!vis(l.x, l.y, 220)) return;
      drawLutut(ctx, gl, l, now);
    });
    /* the seed's trail, then the ship */
    const T = A.trail;
    if (T.length > 3) {
      gl.fillStyle = 'rgba(255,150,50,.7)'; FX.ribbon(gl, T.map(p => [p[0], p[1]]), 2, 18);
      ctx.fillStyle = 'rgba(255,190,110,.18)'; FX.ribbon(ctx, T.map(p => [p[0], p[1]]), 1, 10);
    }
    /* your hired crews' skiffs, running their routes */
    (opts.fleet || []).forEach(q => {
      if (!vis(q.x, q.y, 120)) return;
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(0.62, 0.62); ctx.translate(-q.x, -q.y);
      drawShip(ctx, gl, { x: q.x, y: q.y, ang: q.ang, heat: 1, thrusting: true, boostT: 0, lashT: 0, stun: 0 }, { heatMax: 1, lash: 100 }, now, false);
      ctx.restore();
      nameTag(ctx, q.x, q.y - 52, q.name, '#9fe0a0', view.z);
    });
    /* other pilots in the shared sky */
    (opts.others || []).forEach(o => {
      if (!vis(o.x, o.y, 160)) return;
      FX.orb(gl, o.x, o.y, 90, o.raidingMe ? '#ff5a4a' : '#8ab0ff', o.raidingMe ? 0.6 : 0.18);
      drawShip(ctx, gl, { x: o.x, y: o.y, ang: o.ang, heat: 1, thrusting: !!o.th, boostT: 0, lashT: 0, stun: 0 }, { heatMax: 1, lash: 100 }, now, false, o.color);
      nameTag(ctx, o.x, o.y - 70, o.name + (o.cargo ? ' · ' + o.cargo + ' in the hold' : ''), o.raidingMe ? '#ff8a7a' : '#dfe6ff', view.z);
      /* vines across: theirs onto you, or yours onto them */
      if (o.raidingMe || o.mine) {
        const a2 = o.mine ? s : o, b2 = o.mine ? o : s;
        const pts = FX.quad(a2.x, a2.y, (a2.x + b2.x) / 2 + Math.sin(now * 9) * 14, (a2.y + b2.y) / 2 + 26, b2.x, b2.y, 10);
        ctx.fillStyle = '#5a8a3a'; FX.ribbon(ctx, pts, 5, 3);
        gl.fillStyle = 'rgba(200,255,150,.5)'; FX.ribbon(gl, pts, 6, 4);
        if (o.mine && opts.raid) { ctx.strokeStyle = 'rgba(255,215,110,.95)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(o.x, o.y, 80, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, opts.raid)); ctx.stroke(); }
      }
    });
    drawShip(ctx, gl, s, f.S, now, opts.braking);
    if (s.lashT > 0) {
      ctx.strokeStyle = 'rgba(170,240,130,' + (s.lashT / 0.35) * 0.6 + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.x, s.y, f.S.lash, 0, TAU); ctx.stroke();
    }
    /* particles */
    parts.forEach(p => {
      const a = Math.max(0, 1 - p.age / p.life);
      if (p.kind === 'spark') {
        gl.globalAlpha = a; FX.orb(gl, p.x, p.y, p.r * 4, p.col.charAt(0) === '#' ? p.col : '#ffd080', 0.7); gl.globalAlpha = 1;
        ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + a * 0.6), 0, TAU); ctx.fill();
      } else if (p.kind === 'smoke') {
        const r = p.r * (1 + (1 - a) * 3);
        ctx.globalAlpha = a * 0.7;
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        pg.addColorStop(0, p.col); pg.addColorStop(1, 'rgba(200,200,200,0)');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      } else if (p.kind === 'ring') {
        ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = 4 * a + 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.8 - a), 0, TAU); ctx.stroke();
        gl.globalAlpha = a * 0.6; gl.strokeStyle = p.col; gl.lineWidth = 10; gl.beginPath(); gl.arc(p.x, p.y, p.r * (1.8 - a), 0, TAU); gl.stroke(); gl.globalAlpha = 1;
      } else if (p.kind === 'chip') {
        ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.fillRect(p.x - p.r, p.y - p.r * 0.5, p.r * 2, p.r);
      } else { ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
    gl.restore(); ctx.restore();

    glow.end(ctx, 0.9);
    if (!A.lowFx) FX.flare(ctx, W, H, star.sx, star.sy, '#ffd8a0', 0.22);
    if (A.flash) { ctx.fillStyle = 'rgba(230,235,255,' + A.flash + ')'; ctx.fillRect(0, 0, W, H); }
    if (f.inMist) { ctx.fillStyle = 'rgba(200,225,255,.2)'; ctx.fillRect(0, 0, W, H); }
    if (f.inWave && !A.lowFx) FX.grade(ctx, W, H, '#c080ff', 'soft-light', 0.25);
    FX.vignette(ctx, W, H, 0.5, '#02030c');

    /* arrows at the screen's edge, to where your jobs are going (and to anyone adrift) */
    (opts.targets || []).forEach(t => {
      const pp = t.port ? SP.portPos(SP.port(t.port), f.bodies) : t;
      const sx = SX(pp.x), sy = SY(pp.y);
      if (sx > 30 && sx < W - 30 && sy > 30 && sy < H - 30) return;
      const a = Math.atan2(sy - H / 2, sx - W / 2), m = 44;
      const k = Math.min((W / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - m - 20) / Math.abs(Math.sin(a) || 1e-6));
      const ax = W / 2 + Math.cos(a) * k, ay = H / 2 + Math.sin(a) * k;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
      ctx.shadowColor = t.color || '#ffd36a'; ctx.shadowBlur = 10;
      ctx.fillStyle = t.color || '#ffd36a'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-8, -11); ctx.lineTo(-3, 0); ctx.lineTo(-8, 11); ctx.closePath(); ctx.fill();
      ctx.restore();
      const dist = Math.hypot(pp.x - s.x, pp.y - s.y);
      ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(t.label + ' · ' + Math.round(dist / 40) + ' m', ax - Math.cos(a) * 32 + 1, ay - Math.sin(a) * 24 + 5);
      ctx.fillStyle = t.color || '#ffd36a'; ctx.fillText(t.label + ' · ' + Math.round(dist / 40) + ' m', ax - Math.cos(a) * 32, ay - Math.sin(a) * 24 + 4);
    });
    return { SX, SY, z };
  };

  function aurora(ctx, gl, f, w, cam, W, H, z, now) {
    const fx = w.flow[0], fy = w.flow[1];
    const along0 = cam.x * fx + cam.y * fy;
    const span = Math.hypot(W, H) / z * 0.8;
    const bands = [[0, 0.42, '#b070ff'], [0.22, 0.25, '#70e0ff'], [-0.25, 0.2, '#ff80e0']];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    bands.forEach(([off, wid, col], bi) => {
      const pts = [];
      for (let sAl = -span; sAl <= span; sAl += 60) {
        const al = along0 + sAl;
        const wob = Math.sin(al * 0.0016 + now * 0.5 + bi * 2) * w.w * 0.22 + Math.sin(al * 0.004 - now * 0.9 + bi) * w.w * 0.08;
        const across = w.off + off * w.w + wob;
        pts.push([w.nx * across + fx * al, w.ny * across + fy * al]);
      }
      ctx.fillStyle = FX.rgba(col, f.inWave ? 0.16 : 0.11); FX.ribbon(ctx, pts, w.w * wid, w.w * wid);
      ctx.fillStyle = FX.rgba(col, 0.1); FX.ribbon(ctx, pts, w.w * wid * 0.4, w.w * wid * 0.4);
      gl.fillStyle = FX.rgba(col, 0.25); FX.ribbon(gl, pts, w.w * wid * 0.5, w.w * wid * 0.5);
    });
    /* light running along it */
    ctx.strokeStyle = 'rgba(240,220,255,.4)'; ctx.lineWidth = 2;
    for (let i = 0; i < 46; i++) {
      const al = along0 + ((hash(i) * 8000 + now * 460) % 8000 - 4000), across = w.off + (hash(i * 7) - 0.5) * w.w * 0.8;
      const x = w.nx * across + fx * al, y = w.ny * across + fy * al;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - fx * 140, y - fy * 140); ctx.stroke();
    }
    ctx.restore();
    /* RubberMcFly, glowing in the wave */
    f.flies.forEach((m, i) => {
      if (m.got || m.x == null) return;
      const bob = Math.sin(now * 3 + m.ph) * 8, x = m.x, y = m.y + bob;
      FX.orb(gl, x, y, 40, '#ff90f0', 0.9);
      ctx.fillStyle = '#ffe8fc'; ctx.beginPath(); ctx.ellipse(x, y, 8, 6, Math.sin(now * 4 + i) * 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,250,.6)';
      [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(x - 2, y + sd * 7, 7, 3 + Math.abs(Math.sin(now * 20 + i)) * 3, sd * 0.6, 0, TAU); ctx.fill(); });
    });
  }

  function drawSkiff(ctx, gl, k, s, now) {
    const bob = Math.sin(k.ph * 1.3) * 6, rot = Math.sin(k.ph * 0.7) * 0.25;
    ctx.save(); ctx.translate(k.x, k.y + bob); ctx.rotate(rot);
    /* a small hollow-log skiff, its seed cold */
    const hg = ctx.createLinearGradient(0, -8, 0, 10);
    hg.addColorStop(0, '#7a4a2e'); hg.addColorStop(1, '#3a1c10');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(-30, -6); ctx.quadraticCurveTo(0, -10, 30, -4); ctx.quadraticCurveTo(34, 0, 28, 5); ctx.quadraticCurveTo(0, 11, -30, 6); ctx.quadraticCurveTo(-34, 0, -30, -6); ctx.fill();
    ctx.fillStyle = '#5a4a40'; ctx.beginPath(); ctx.arc(-28, 0, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a2214'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(2, -36); ctx.stroke();
    ctx.fillStyle = 'rgba(200,180,140,.6)'; ctx.beginPath(); ctx.moveTo(3, -34); ctx.lineTo(18, -12); ctx.lineTo(3, -10); ctx.fill();
    /* folk waving */
    for (let i = 0; i < 2; i++) {
      const fx = -12 + i * 12, wave = Math.sin(now * 8 + i) * 0.6;
      ctx.fillStyle = '#9a7448'; ctx.beginPath(); ctx.arc(fx, -12, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = ['#6a4a24', '#8a6a3a'][i]; ctx.beginPath(); ctx.ellipse(fx, -14, 5, 3, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = '#9a7448'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx + 2, -8); ctx.lineTo(fx + 6 + Math.cos(wave) * 3, -20 - Math.sin(wave) * 4); ctx.stroke();
    }
    ctx.restore();
    /* the distress lantern, blinking red */
    const on = Math.sin(now * 5) > 0;
    FX.orb(gl, k.x + 2, k.y + bob - 40, on ? 60 : 20, '#ff5a4a', on ? 1 : 0.4);
    ctx.fillStyle = on ? '#ff8a7a' : '#7a2a22'; ctx.beginPath(); ctx.arc(k.x + 2, k.y + bob - 40, 5, 0, TAU); ctx.fill();
    /* the tow: vines reaching while you hold alongside */
    if (k.hold > 0) {
      const pts = FX.quad(s.x, s.y, (s.x + k.x) / 2 + Math.sin(now * 6) * 10, (s.y + k.y) / 2 + 20, k.x, k.y + bob, 10);
      ctx.fillStyle = '#5a8a3a'; FX.ribbon(ctx, pts, 4, 2.5);
      ctx.strokeStyle = 'rgba(255,230,150,.9)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(k.x, k.y + bob, 56, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, k.hold / 1.6)); ctx.stroke();
    }
  }

  function drawLutut(ctx, gl, l, now) {
    const ang = Math.atan2(l.vy, l.vx) || 0, diving = l.state === 'dive', flap = diving ? 0.15 : Math.sin(now * 5 + l.ph) * 0.5;
    ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(ang);
    if (diving) { const tg = ctx.createLinearGradient(0, 0, -260, 0); tg.addColorStop(0, 'rgba(60,40,60,.35)'); tg.addColorStop(1, 'rgba(60,40,60,0)'); ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(30, -20); ctx.lineTo(-260, 0); ctx.lineTo(30, 20); ctx.fill(); }
    const body = '#241a26', rim = 'rgba(200,180,255,.5)';
    /* wings: long feathers fanning out */
    [-1, 1].forEach(sd => {
      const span = 110 + flap * 50;
      for (let k = 0; k < 7; k++) {
        const t = k / 6;
        const bx = 14 - t * 40, by = sd * 10;
        const tx = -20 - t * 70 - (1 - t) * 10, ty = sd * (span * (0.55 + t * 0.45) - t * 30);
        ctx.fillStyle = k % 2 ? body : '#2e2232';
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + tx) / 2 + 10, (by + ty) / 2, tx, ty); ctx.quadraticCurveTo((bx + tx) / 2 - 14, (by + ty) / 2, bx - 14, by); ctx.fill();
      }
      ctx.strokeStyle = rim; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, sd * 8); ctx.quadraticCurveTo(-10, sd * span * 0.7, -40, sd * span * 0.95); ctx.stroke();
    });
    /* body and tail */
    const bg = ctx.createLinearGradient(0, -22, 0, 22);
    bg.addColorStop(0, '#4a3a52'); bg.addColorStop(1, '#140c16');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(52, 0); ctx.quadraticCurveTo(10, -24, -46, 0); ctx.quadraticCurveTo(10, 24, 52, 0); ctx.fill();
    ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-86, -16); ctx.lineTo(-76, 0); ctx.lineTo(-86, 16); ctx.closePath(); ctx.fill();
    /* the head, a hooked beak, the eyes */
    ctx.fillStyle = '#6a5a40'; ctx.beginPath(); ctx.moveTo(50, -5); ctx.quadraticCurveTo(70, -2, 64, 8); ctx.lineTo(50, 4); ctx.fill();
    const eye = diving || l.state === 'screech' ? '#ff4a3a' : '#e0b040';
    ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(42, -6, 3.4, 0, TAU); ctx.arc(42, 6, 3.4, 0, TAU); ctx.fill();
    gl.save(); gl.translate(l.x, l.y); gl.rotate(ang); FX.orb(gl, 42, -6, 14, eye, 0.9); FX.orb(gl, 42, 6, 14, eye, 0.9); gl.restore();
    ctx.restore();
    if (l.state === 'screech') {
      for (let k = 0; k < 3; k++) {
        const rr = ((1.1 - l.t) * 420 + k * 130) % 440;
        ctx.strokeStyle = 'rgba(255,120,130,' + Math.max(0, 0.65 - rr / 680) + ')'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(l.x, l.y, rr, 0, TAU); ctx.stroke();
      }
    }
  }

  /* ---------------- the little map in the corner ---------------- */
  A.minimap = function (ctx, W, H, f, marks, others, fleet) {
    ctx.clearRect(0, 0, W, H);
    const k = Math.min(W, H) / 46000;
    const cx = W / 2 - f.bodies.velki.x * k, cy = H / 2 - f.bodies.velki.y * k;
    const R0 = Math.min(W, H) / 2 - 1;
    const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, R0);
    bg.addColorStop(0, 'rgba(20,20,50,.75)'); bg.addColorStop(1, 'rgba(8,8,24,.85)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(W / 2, H / 2, R0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, R0, 0, TAU); ctx.clip();
    f.list.forEach(b => {
      const L = A.LOOKS[b.look] || A.LOOKS.kalo;
      const x = cx + b.x * k, y = cy + b.y * k, r = Math.max(2.5, b.r * k);
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r);
      g.addColorStop(0, FX.shade(L.sea, 0.3)); g.addColorStop(1, L.deep);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    });
    (marks || []).forEach(id => { const pp = SP.portPos(SP.port(id), f.bodies); if (!pp) return; ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(cx + pp.x * k, cy + pp.y * k, 3, 0, TAU); ctx.fill(); });
    f.skiffs.forEach(s2 => { if (!s2.saved) { ctx.fillStyle = '#ff7a6a'; ctx.fillRect(cx + s2.x * k - 2, cy + s2.y * k - 2, 4, 4); } });
    (fleet || []).forEach(q => { ctx.fillStyle = '#9fe0a0'; ctx.fillRect(cx + q.x * k - 1.5, cy + q.y * k - 1.5, 3, 3); });
    (others || []).forEach(o => { ctx.fillStyle = o.raidingMe ? '#ff5a4a' : o.color || '#8ab0ff'; ctx.beginPath(); ctx.arc(cx + o.x * k, cy + o.y * k, 2.6, 0, TAU); ctx.fill(); });
    ctx.restore();
    /* you (pinned to the rim, with an arrow, when you are off the chart) */
    let sx = cx + f.ship.x * k, sy = cy + f.ship.y * k;
    const dx = sx - W / 2, dy = sy - H / 2, d = Math.hypot(dx, dy);
    if (d > R0 - 4) { sx = W / 2 + dx / d * (R0 - 6); sy = H / 2 + dy / d * (R0 - 6); ctx.fillStyle = '#ffe2a0'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('off the chart', W / 2, H - 8); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, TAU); ctx.fill();
  };

  /* ---------------- the chart of the sky (the port screen) ---------------- */
  A.chart = function (ctx, W, H, T, here, marks, now, fleet) {
    const L = SP.layout(T);
    drawSky(ctx, W, H, { x: now * 30, y: 0 }, 1, now);
    const k = Math.min(W, H) / 44000;
    const cx = W / 2, cy = H / 2;
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
    SP.BODIES.forEach(b => { if (!b.orbit) return; const c = L[b.orbit[0]]; ctx.beginPath(); ctx.arc(cx + c.x * k, cy + c.y * k, b.orbit[1] * k, 0, TAU); ctx.stroke(); });
    const BIG = b => A.mapBig(b, k);
    Object.values(L).forEach(b => {
      const x = cx + b.x * k, y = cy + b.y * k, r = b.r * k * BIG(b);
      drawGlobe(ctx, b, x, y, r);
      ctx.fillStyle = 'rgba(230,230,255,.9)'; ctx.font = (b.r < 400 ? '11px' : '13px') + ' Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(b.name, x, b.r >= 400 ? y + r + 15 : y - r - 6);
    });
    SP.portsIn(L).forEach(p => {
      const pp = SP.portPos(p, L), bb = L[p.body], big = BIG(bb);
      const x = cx + (bb.x + (pp.x - bb.x) * big) * k, y = cy + (bb.y + (pp.y - bb.y) * big) * k;
      const mk = marks && marks.has(p.id), ev = SP.portEvent && SP.portEvent(p.id, SP.skyDay(T));
      if (mk) FX.orb(ctx, x, y, 14, '#ffd36a', 0.7);
      ctx.fillStyle = p.id === here ? '#ffffff' : mk ? '#ffd36a' : ev ? '#ffb0e0' : 'rgba(200,200,230,.65)';
      ctx.beginPath(); ctx.arc(x, y, p.id === here ? 5 : mk ? 4 : 2.6, 0, TAU); ctx.fill();
      if (p.id === here) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 9 + Math.sin(now * 3) * 2, 0, TAU); ctx.stroke(); }
    });
    (fleet || []).forEach(sh => { const q = SP.fleetPos(sh, T, L); if (q) { ctx.fillStyle = '#9fe0a0'; ctx.beginPath(); ctx.arc(cx + q.x * k, cy + q.y * k, 2.5, 0, TAU); ctx.fill(); } });
    A.bakeSome();
  };
  /* a world drawn small (charts and the map): its painting, turned, lit */
  function drawGlobe(ctx, b, x, y, r) {
    const Bk = bodyArt(b.look), Lk = A.LOOKS[b.look] || A.LOOKS.kalo;
    FX.orb(ctx, x, y, r * 1.6, Lk.air, 0.25);
    if (Bk) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(b.rot || 0); ctx.drawImage(Bk.alb, -r, -r, r * 2, r * 2); ctx.drawImage(Bk.clo, -r, -r, r * 2, r * 2); ctx.restore();
      ctx.drawImage(Bk.sha, x - r, y - r, r * 2, r * 2); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(Bk.lit, x - r, y - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over';
    } else { ctx.fillStyle = Lk.sea; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  }
  /* how much bigger than life to draw a world at a scale, so it stays readable */
  A.mapBig = function (b, k) { const px = b.r * k; return px >= 22 ? 1 : Math.min(b.r < 400 ? 4 : 3, 22 / Math.max(1, px)); };

  /* ---------------- the sky map ---------------- */
  A.map = function (ctx, W, H, o) {
    const T = o.T, k = o.scale, L = SP.layout(T);
    if (o.extra && o.extra.karn) L.karn = o.extra.karn;
    drawSky(ctx, W, H, { x: o.cx * 0.2, y: o.cy * 0.2 }, 1, o.now);
    const SX = x => (x - o.cx) * k + W / 2, SY = y => (y - o.cy) * k + H / 2;
    /* a faint grid of the sky's leagues */
    ctx.strokeStyle = 'rgba(160,170,255,.06)'; ctx.lineWidth = 1;
    const step = Math.pow(10, Math.ceil(Math.log10(160 / k)));
    for (let gx = Math.floor((o.cx - W / 2 / k) / step) * step; gx < o.cx + W / 2 / k; gx += step) { ctx.beginPath(); ctx.moveTo(SX(gx), 0); ctx.lineTo(SX(gx), H); ctx.stroke(); }
    for (let gy = Math.floor((o.cy - H / 2 / k) / step) * step; gy < o.cy + H / 2 / k; gy += step) { ctx.beginPath(); ctx.moveTo(0, SY(gy)); ctx.lineTo(W, SY(gy)); ctx.stroke(); }
    /* orbits, and each world's path over the next few minutes */
    SP.BODIES.forEach(b => {
      if (!b.orbit) return;
      const c = L[b.orbit[0]];
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(SX(c.x), SY(c.y), b.orbit[1] * k, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,226,160,.45)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let s = 0; s <= 300; s += 15) { const Lf = SP.layout(T + s), q = Lf[b.id]; s ? ctx.lineTo(SX(q.x), SY(q.y)) : ctx.moveTo(SX(q.x), SY(q.y)); }
      ctx.stroke(); ctx.lineWidth = 1;
    });
    /* the dangerous places */
    const zone = (x, y, r, col, label) => { ctx.fillStyle = FX.rgba(col, 0.12); ctx.strokeStyle = FX.rgba(col, 0.45); ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(SX(x), SY(y), Math.max(8, r * k), 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); if (label && r * k > 14) { ctx.fillStyle = FX.rgba(col, 0.85); ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, SX(x), SY(y) + Math.max(8, r * k) + 12); } };
    const nekh = SP.portPos(SP.port('nekh'), L), ash = SP.portPos(SP.port('ashen'), L);
    zone(nekh.x + nekh.nx * 600, nekh.y + nekh.ny * 600, 800, '#a0a8ff', 'storms');
    zone(ash.x + ash.nx * 300, ash.y + ash.ny * 300, 700, '#c8e0ff', 'oath-mist');
    zone(L.leotik.x, L.leotik.y, L.leotik.r + 1400, '#ff9a40', 'Tyndael & Lutut');
    ctx.strokeStyle = 'rgba(200,190,180,.18)'; ctx.lineWidth = Math.max(2, 900 * k); ctx.beginPath(); ctx.arc(SX(L.velki.x), SY(L.velki.y), SP.body('bolo').orbit[1] * k, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
    /* the worlds */
    Object.values(L).forEach(b => {
      const big = A.mapBig(b, k), r = b.r * k * big;
      drawGlobe(ctx, b, SX(b.x), SY(b.y), r);
      ctx.fillStyle = 'rgba(235,235,255,.92)'; ctx.font = (b.r >= 400 ? 'bold 14px' : '12px') + ' Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(b.name, SX(b.x), SY(b.y) - r - 8);
    });
    /* ports */
    const routeAt = {};
    (o.route || []).forEach((id, i) => { routeAt[id] = i + 1; });
    const dueAt = {};
    (o.hold || []).forEach(j => { dueAt[j.to] = Math.min(dueAt[j.to] || 1e18, j.taken + j.par); });
    const portXY = p => { const pp = SP.portPos(p, L), b = L[p.body], big = A.mapBig(b, k); return [SX(b.x + (pp.x - b.x) * big), SY(b.y + (pp.y - b.y) * big)]; };
    SP.portsIn(L).forEach(p => {
      const [x, y] = portXY(p);
      const inRoute = routeAt[p.id], due = dueAt[p.id];
      if (due != null) FX.orb(ctx, x, y, 18, '#ffd36a', 0.6);
      ctx.fillStyle = p.id === o.here ? '#fff' : inRoute ? '#9fe0ff' : due != null ? '#ffd36a' : 'rgba(210,210,240,.8)';
      ctx.beginPath(); ctx.arc(x, y, inRoute || due != null || p.id === o.here ? 5 : 3.5, 0, TAU); ctx.fill();
      const bodyPx = L[p.body].r * k * A.mapBig(L[p.body], k);
      if (!(inRoute || due != null || p.id === o.here || bodyPx >= 46)) return;      /* names only when there is room for them */
      ctx.font = (inRoute || due != null ? 'bold ' : '') + '11.5px system-ui'; ctx.textAlign = 'left';
      const label = (inRoute ? inRoute + '. ' : '') + p.name + (due != null ? ' · due ' + SP.clockOf(due) : '');
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(label, x + 9, y + 4); ctx.fillStyle = inRoute ? '#bfeaff' : due != null ? '#ffe2a0' : 'rgba(225,225,250,.85)'; ctx.fillText(label, x + 8, y + 3);
    });
    /* the route */
    if (o.route && o.route.length) {
      ctx.strokeStyle = 'rgba(159,224,255,.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 7]);
      ctx.beginPath();
      let first = true;
      if (o.ship) { ctx.moveTo(SX(o.ship.x), SY(o.ship.y)); first = false; }
      else if (o.here) { const h = SP.port(o.here); if (L[h.body]) { const [x, y] = portXY(h); ctx.moveTo(x, y); first = false; } }
      o.route.forEach(id => { const p = SP.port(id); if (!L[p.body]) return; const [x, y] = portXY(p); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); });
      ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    }
    /* hired skiffs, other pilots, you */
    (o.fleet || []).forEach(sh => { const q = SP.fleetPos(sh, T, L); if (!q) return; ctx.fillStyle = '#9fe0a0'; ctx.beginPath(); ctx.arc(SX(q.x), SY(q.y), 3.5, 0, TAU); ctx.fill(); ctx.font = '10px system-ui'; ctx.fillText(sh.crew, SX(q.x) + 6, SY(q.y) - 4); });
    (o.others || []).forEach(p => { ctx.fillStyle = p.color || '#8ab0ff'; ctx.beginPath(); ctx.arc(SX(p.x), SY(p.y), 4, 0, TAU); ctx.fill(); ctx.font = '11px system-ui'; ctx.fillText(p.name, SX(p.x) + 7, SY(p.y) + 4); });
    if (o.ship) {
      const x = SX(o.ship.x), y = SY(o.ship.y);
      FX.orb(ctx, x, y, 22, '#ffffff', 0.5);
      ctx.save(); ctx.translate(x, y); ctx.rotate(o.ship.ang); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-7, -7); ctx.lineTo(-3, 0); ctx.lineTo(-7, 7); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText('you', x + 12, y - 8);
    }
    if (o.ahead) { ctx.fillStyle = 'rgba(255,226,160,.9)'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('The sky in ' + o.ahead / 60 + ' min (' + SP.clockOf(T) + ')', W / 2, 24); }
    ctx.fillStyle = 'rgba(220,220,255,.55)'; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText('drag to look round · wheel or buttons to zoom · tap a port to add it to your route', 12, H - 12);
    A.bakeSome();
  };
})();
