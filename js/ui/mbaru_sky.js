/* ============================================================
   DYA'AKARA — ui/mbaru_sky.js
   The sky over the Mbaru Tatu, drawn true to the Rokarvac:

   - Velki, the largest Tatu, sits at the heart of the cluster.
     Xikia is held so tightly by Velki's pull that it swings
     around it almost like a moon; Leotik, the smallest (still
     far larger than any Kalo), rides a wider, slower loop.
     All three circle Pia'don's star together.
   - Each Tatu keeps its own Kalo. Bolo Kalo is one of Velki's
     smaller moons; Xikia has a little moon that dances close.
   - Velki: twelve continents, the largest ocean, and the misted
     northern supercontinent Nekh FtiSular. Xikia: nine
     continents, green and mountainous. Leotik: six and a half
     wild continents, mostly unexplored, volcanic and venomous.
   - The Sunear'Zikhron never stops: it wraps one world, then
     passes through the Duat to the next. RubberMcFly play in
     it — the only time they glow.
   - Beyond the cluster: Pia'don's outer cloud, and the other
     worlds of the system — Katkan, Oskerarean, Su'Kryulndael.

   DYA.mbaruSky.mount(canvas, opts) runs the animation until the
   canvas leaves the document. opts:
     cx, cy     cluster centre as fractions of the canvas (0..1)
     labels     false | true | 'full'  (Tatu names / plus named Kalo)
     far        draw the distant Pia'don worlds (default true)
     storm      draw the Sunear'Zikhron (default true)
     bg         paint the space backdrop (default true)
   ============================================================ */
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  /* small seeded rng so every visit shows the same continents */
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* continents: blobs laid on a scrolling band, wrapped around the disc */
  function makeLands(seed, count, colors, opts) {
    const r = rng(seed), out = [];
    for (let i = 0; i < count; i++) {
      const lobes = [];
      const n = 3 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) lobes.push([(r() - 0.5) * 0.34, (r() - 0.5) * 0.22, 0.07 + r() * 0.1]);
      out.push({
        u: (i + r() * 0.6) / count,                        // longitude 0..1
        v: (opts && opts.lat ? opts.lat(i, r) : (r() - 0.5) * 1.3), // latitude -1..1
        col: colors[Math.floor(r() * colors.length)],
        lobes,
      });
    }
    return out;
  }

  const TATU = [
    {
      id: 'velki', name: 'Velki',
      rel: 1, orbit: 0, speed: 0, spin: 0.012,
      sea: '#23557a', seaDeep: '#123049',
      lands: makeLands(11, 12, ['#4f7a45', '#6b7d48', '#7c6a45', '#3f6a4a']),
      mistCap: true,                                        // Nekh FtiSular & the Megla Aagac
      kalo: [
        { name: 'Bolo Kalo', r: 0.13, d: 1.9, s: 0.55, col: '#b8b2c8' },
        { r: 0.09, d: 2.35, s: -0.38, col: '#9c96a8' },
        { r: 0.07, d: 1.55, s: 0.9, col: '#c9c1ae' },
      ],
    },
    {
      id: 'xikia', name: 'Xikia',
      rel: 0.64, orbit: 3.1, speed: 0.11, phase: 0.6, spin: 0.018,
      sea: '#2d6a86', seaDeep: '#163c50',
      lands: makeLands(29, 9, ['#4e8a45', '#5d9150', '#6e7a44', '#45703d']),
      kalo: [{ r: 0.14, d: 1.75, s: 1.4, col: '#d7cfb8', dance: true }],
    },
    {
      id: 'leotik', name: 'Leotik',
      rel: 0.44, orbit: 5.2, speed: 0.052, phase: 3.9, spin: 0.024,
      sea: '#1f4a45', seaDeep: '#0f2826',
      lands: makeLands(47, 7, ['#2f5a2a', '#3c6b2c', '#4a5a26', '#2a4a24']),
      volcanic: true,
      kalo: [{ r: 0.16, d: 1.8, s: -0.7, col: '#a89c8a' }],
    },
  ];

  const FAR = [
    { name: 'Katkan', col: '#9a9aa4', x: 0.08, y: 0.16, r: 3.2, fuzz: true },
    { name: 'Oskerarean', col: '#cfd8e8', x: 0.6, y: 0.1, r: 2.6, ghost: true },
    { name: 'Su’Kryulndael', col: '#4a8fd0', x: 0.93, y: 0.72, r: 3.4 },
  ];

  function shade(hex, amt) {
    if (DYA.sprites && DYA.sprites.shade) return DYA.sprites.shade(hex, amt);
    return hex;
  }

  /* ---------- backdrop: space, Pia'don's cloud, star, far worlds ---------- */
  function drawBackdrop(ctx, w, h, t, st, opts) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#04050d'); g.addColorStop(0.65, '#0b0913'); g.addColorStop(1, '#161009');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    /* nebulae — a few soft colour clouds */
    [[0.18, 0.28, '#5b3a7a'], [0.78, 0.62, '#23586a'], [0.5, 0.9, '#6a3a28']].forEach(([x, y, c], i) => {
      const rr = Math.max(w, h) * (0.32 + i * 0.05);
      const ng = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, rr);
      ng.addColorStop(0, c + '26'); ng.addColorStop(1, c + '00');
      ctx.fillStyle = ng; ctx.fillRect(0, 0, w, h);
    });

    /* Pia'don's outer cloud — a pale ring of dust across the sky */
    ctx.save();
    ctx.translate(w * 0.5, h * 0.36); ctx.rotate(-0.16);
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = 'rgba(233,214,170,' + (0.035 - k * 0.009) + ')';
      ctx.lineWidth = 26 + k * 22;
      ctx.beginPath(); ctx.ellipse(0, 0, w * 0.78, h * 0.14, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
    }
    ctx.restore();

    /* stars */
    st.stars.forEach(s => {
      ctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(t * 0.4 + s[3]));
      ctx.fillStyle = s[4];
      ctx.fillRect(s[0] * w, s[1] * h, s[2], s[2]);
    });
    ctx.globalAlpha = 1;

    /* a dim quasar — long in the sky, small, and cold */
    const qx = w * 0.14, qy = h * 0.62;
    ctx.strokeStyle = 'rgba(190,210,255,0.28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(qx - 7, qy); ctx.lineTo(qx + 7, qy); ctx.moveTo(qx, qy - 7); ctx.lineTo(qx, qy + 7); ctx.stroke();
    ctx.fillStyle = 'rgba(220,230,255,0.7)'; ctx.fillRect(qx - 1, qy - 1, 2, 2);

    /* Pia'don's star */
    const sx = w * st.sun[0], sy = h * st.sun[1];
    const R = Math.max(90, Math.min(w, h) * 0.2);
    const sg = ctx.createRadialGradient(sx, sy, 3, sx, sy, R);
    sg.addColorStop(0, '#fff8e0'); sg.addColorStop(0.12, '#ffe39acc'); sg.addColorStop(0.4, '#ffd76a33'); sg.addColorStop(1, '#ffd76a00');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, R, 0, TAU); ctx.fill();

    /* the other worlds of Pia'don */
    if (opts.far !== false) {
      FAR.forEach(f => {
        const fx = f.x * w, fy = f.y * h;
        ctx.globalAlpha = f.ghost ? 0.35 + 0.2 * Math.sin(t * 0.8) : 0.8;
        if (f.fuzz) {
          const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, f.r * 2.4);
          fg.addColorStop(0, f.col); fg.addColorStop(0.5, f.col + '88'); fg.addColorStop(1, f.col + '00');
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fx, fy, f.r * 2.4, 0, TAU); ctx.fill();
        } else {
          ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(fx, fy, f.r, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (opts.labels) {
          ctx.fillStyle = 'rgba(232,223,200,0.32)'; ctx.font = '9px Georgia, serif'; ctx.textAlign = 'center';
          ctx.fillText(f.name, fx, fy + f.r + 12);
        }
      });
    }
  }

  /* ---------- one Tatu: sea, continents, mist, night side ---------- */
  function drawTatu(ctx, p, x, y, r, t, sun) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();

    const sg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    sg.addColorStop(0, shade(p.sea, 25)); sg.addColorStop(1, p.seaDeep);
    ctx.fillStyle = sg; ctx.fillRect(x - r, y - r, r * 2, r * 2);

    /* continents scroll with the Tatu's spin and squash toward the limb */
    const spin = t * p.spin;
    p.lands.forEach(l => {
      let u = (l.u + spin) % 1; if (u < 0) u += 1;
      const lon = (u - 0.5) * Math.PI;                    // -90°..90° visible hemisphere band
      if (Math.abs(lon) > 1.5) return;
      const lx = x + Math.sin(lon) * r;
      const ly = y + l.v * r * 0.78;
      const squash = Math.max(0.15, Math.cos(lon));
      ctx.fillStyle = l.col;
      l.lobes.forEach(([dx, dy, rr]) => {
        ctx.beginPath();
        ctx.ellipse(lx + dx * r * squash, ly + dy * r, rr * r * squash + 0.6, rr * r * 0.8 + 0.6, 0, 0, TAU);
        ctx.fill();
      });
    });

    if (p.volcanic) {                                       // Leotik's fire-glints
      for (let i = 0; i < 4; i++) {
        const a = spin * TAU * 1.2 + i * 1.7;
        const gx = x + Math.cos(a) * r * 0.55, gy = y + Math.sin(a * 1.3) * r * 0.45;
        ctx.fillStyle = 'rgba(255,120,50,' + (0.35 + 0.35 * Math.sin(t * 2 + i)) + ')';
        ctx.beginPath(); ctx.arc(gx, gy, Math.max(0.8, r * 0.05), 0, TAU); ctx.fill();
      }
    }

    if (p.mistCap) {                                        // Nekh FtiSular — the misted north
      const mg = ctx.createLinearGradient(x, y - r, x, y - r * 0.35);
      mg.addColorStop(0, 'rgba(176,168,200,0.85)'); mg.addColorStop(1, 'rgba(150,140,180,0)');
      ctx.fillStyle = mg; ctx.fillRect(x - r, y - r, r * 2, r * 0.7);
      const ice = ctx.createLinearGradient(x, y + r, x, y + r * 0.7);  // Su'Kryundel, the frozen south
      ice.addColorStop(0, 'rgba(230,236,245,0.75)'); ice.addColorStop(1, 'rgba(230,236,245,0)');
      ctx.fillStyle = ice; ctx.fillRect(x - r, y + r * 0.7, r * 2, r * 0.3);
    }

    /* night side, away from Pia'don's star */
    const dx = x - sun[0], dy = y - sun[1], dl = Math.hypot(dx, dy) || 1;
    const nx = dx / dl, ny = dy / dl;
    const ng = ctx.createLinearGradient(x - nx * r, y - ny * r, x + nx * r, y + ny * r);
    ng.addColorStop(0, 'rgba(0,0,0,0)'); ng.addColorStop(0.5, 'rgba(0,0,0,0.12)'); ng.addColorStop(1, 'rgba(2,2,8,0.78)');
    ctx.fillStyle = ng; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();

    /* atmosphere rim */
    ctx.strokeStyle = 'rgba(150,200,240,0.28)'; ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath(); ctx.arc(x, y, r + ctx.lineWidth * 0.4, 0, TAU); ctx.stroke();
  }

  function drawKalo(ctx, k, x, y, R, t, sun) {
    const kr = Math.max(1.6, R * k.r);
    ctx.fillStyle = k.col; ctx.beginPath(); ctx.arc(x, y, kr, 0, TAU); ctx.fill();
    const dx = x - sun[0], dy = y - sun[1], dl = Math.hypot(dx, dy) || 1;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(x + dx / dl * kr * 0.45, y + dy / dl * kr * 0.45, kr * 0.85, 0, TAU); ctx.fill();
  }

  /* ---------- the whole scene ---------- */
  function frame(ctx, w, h, t, st, opts) {
    if (opts.bg !== false) drawBackdrop(ctx, w, h, t, st, opts);
    else ctx.clearRect(0, 0, w, h);

    const cx = w * (opts.cx == null ? 0.5 : opts.cx), cy = h * (opts.cy == null ? 0.5 : opts.cy);
    const TILT = 0.36;
    const spaceX = Math.min(cx, w - cx) - 14, spaceY = Math.min(cy, h - cy) - 14;
    const R = Math.max(8, Math.min(opts.maxR || 64, spaceX / 5.9, spaceY / (5.9 * TILT + 1.2)));
    const sun = [w * st.sun[0], h * st.sun[1]];

    /* place every body, then paint back-to-front */
    const bodies = [];
    TATU.forEach(p => {
      const a = p.orbit ? t * p.speed + p.phase : 0;
      const px = cx + Math.cos(a) * p.orbit * R, py = cy + Math.sin(a) * p.orbit * R * TILT;
      const depth = p.orbit ? Math.sin(a) : 0;
      const pr = R * p.rel * (1 + depth * 0.08);
      bodies.push({ kind: 'tatu', p, x: px, y: py, r: pr, z: py });
      (p.kalo || []).forEach(k => {
        let ka = t * k.s + (k.d * 3.1);
        let kd = k.d;
        if (k.dance) kd = k.d + Math.sin(t * 0.7) * 0.45;    // the little moon that dances on near passes
        const kx = px + Math.cos(ka) * pr * kd, ky = py + Math.sin(ka) * pr * kd * 0.42;
        bodies.push({ kind: 'kalo', k, x: kx, y: ky, r: pr, z: ky + (Math.sin(ka) > 0 ? 0.01 : -0.01) });
      });
    });

    /* orbits */
    ctx.lineWidth = 1;
    TATU.forEach(p => {
      if (!p.orbit) return;
      ctx.strokeStyle = 'rgba(217,184,122,0.12)';
      ctx.beginPath(); ctx.ellipse(cx, cy, p.orbit * R, p.orbit * R * TILT, 0, 0, TAU); ctx.stroke();
    });

    bodies.sort((a, b) => a.z - b.z);
    bodies.forEach(b => {
      if (b.kind === 'tatu') drawTatu(ctx, b.p, b.x, b.y, b.r, t, sun);
      else drawKalo(ctx, b.k, b.x, b.y, b.r, t, sun);
    });

    /* the Sunear'Zikhron: wraps one world, then crosses through the Duat to the next */
    if (opts.storm !== false) drawStorm(ctx, bodies.filter(b => b.kind === 'tatu'), t);

    /* labels */
    if (opts.labels) {
      bodies.forEach(b => {
        if (b.kind === 'tatu') {
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(232,210,160,0.78)'; ctx.font = Math.round(Math.max(10, Math.min(15, b.r * 0.34))) + 'px Georgia, serif';
          ctx.fillText(b.p.name, b.x, b.y + b.r + 15);
        } else if (b.k.name && opts.labels === 'full') {
          ctx.fillStyle = 'rgba(232,223,200,0.35)'; ctx.font = '9px Georgia, serif'; ctx.textAlign = 'center';
          ctx.fillText(b.k.name, b.x, b.y - 6);
        }
      });
    }
  }

  const STORM_HOLD = 9, STORM_PASS = 2.5;           // seconds on a world, seconds crossing
  function drawStorm(ctx, tatu, t) {
    const cycle = STORM_HOLD + STORM_PASS;
    const order = [0, 1, 2];                          // Velki → Xikia → Leotik → Velki …
    const n = Math.floor(t / cycle), f = t - n * cycle;
    const host = tatu.find(b => b.p === TATU[order[n % 3]]);
    const next = tatu.find(b => b.p === TATU[order[(n + 1) % 3]]);
    if (!host || !next) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (f < STORM_HOLD) {
      const k = Math.min(1, f / 1.2, (STORM_HOLD - f) / 1.2);        // swell in, ebb out
      for (let i = 0; i < 3; i++) {
        const rr = host.r * (1.18 + i * 0.1);
        const a0 = t * (0.9 + i * 0.25) + i * 2.1;
        ctx.strokeStyle = 'rgba(104,224,232,' + (0.16 * k) + ')';
        ctx.lineWidth = Math.max(1.5, host.r * (0.16 - i * 0.03));
        ctx.beginPath(); ctx.ellipse(host.x, host.y, rr, rr * 0.9, 0.3, a0, a0 + Math.PI * 1.25); ctx.stroke();
      }
      /* RubberMcFly at play — the only time they glow */
      for (let i = 0; i < 5; i++) {
        const a = t * (1.6 + i * 0.21) + i * 1.3;
        const rr = host.r * (1.25 + 0.12 * Math.sin(t * 1.3 + i));
        ctx.fillStyle = 'rgba(200,184,232,' + (0.7 * k) + ')';
        ctx.beginPath(); ctx.arc(host.x + Math.cos(a) * rr, host.y + Math.sin(a) * rr * 0.9, Math.max(1, host.r * 0.045), 0, TAU); ctx.fill();
      }
    } else {
      /* the crossing — a thin thread through the Duat */
      const p = (f - STORM_HOLD) / STORM_PASS;
      const ex = host.x + (next.x - host.x) * p, ey = host.y + (next.y - host.y) * p;
      const tail = Math.max(0, p - 0.35);
      const sx = host.x + (next.x - host.x) * tail, sy = host.y + (next.y - host.y) * tail;
      const lg = ctx.createLinearGradient(sx, sy, ex, ey);
      lg.addColorStop(0, 'rgba(157,127,224,0)'); lg.addColorStop(1, 'rgba(104,224,232,0.55)');
      ctx.strokeStyle = lg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = 'rgba(180,240,245,0.8)';
      ctx.beginPath(); ctx.arc(ex, ey, 2.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function mount(cv, opts) {
    opts = opts || {};
    const ctx = cv.getContext('2d');
    const r = rng(opts.seed || 7);
    const st = {
      sun: opts.sun || [0.84, 0.18],
      stars: Array.from({ length: opts.stars || 190 }, () => [r(), r(), r() * 1.5 + 0.4, r() * 20, r() < 0.12 ? '#ffe7b0' : (r() < 0.1 ? '#b8d4ff' : '#ffffff')]),
    };
    let reduce = false;
    try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
    const t0 = performance.now() - (opts.startAt || 14) * 1000;
    let raf = 0;
    function tick(now) {
      if (!cv.isConnected) { cancelAnimationFrame(raf); return; }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (w && h) {
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const t = (now - t0) / 1000 * (reduce ? 0.15 : 1) * (opts.speed || 1);
        frame(ctx, w, h, t, st, opts);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return { stop() { cancelAnimationFrame(raf); } };
  }

  DYA.mbaruSky = { mount, TATU };
})();
