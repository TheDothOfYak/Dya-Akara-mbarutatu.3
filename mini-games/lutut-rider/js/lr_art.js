// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   LÚTUT RIDER — js/lr_art.js
   Drawing a ride: the sky and the far hills, the land (grass, soil,
   chasms, marsh pools), standing stones and trees, the teeth to pick
   up, the prey, the Eikar on the Lútut's back, and the bits that fly
   when things break.

   The Lútut itself is Dya'Akara's own drawing of it
   (js/engine/looks/lutut.js), loaded by the page after this file:
   the small DYA.charLooks below is all that file needs to hand its
   draw() over. If it is ever missing, a plain stand-in is drawn.
   ============================================================ */
(function () {
  'use strict';
  const LR = window.LR;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* the hand-over point for js/engine/looks/lutut.js */
  window.DYA = window.DYA || {};
  if (!window.DYA.charLooks) {
    window.DYA.charLooks = {
      register(look) { if (look && look.id === 'lututLook') LR.look = look; },
      shade(hex, amt) {
        const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, v + amt));
        return '#' + ((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0');
      },
    };
  }

  const A = LR.art = {};
  const hx = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const x = hx(a), y = hx(b); return 'rgb(' + [0, 1, 2].map(i => Math.round(x[i] + (y[i] - x[i]) * t)).join(',') + ')'; };
  const rgba = (h, a) => { const c = hx(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  A.mix = mix;

  /* ================= the camera ================= */
  A.makeView = () => ({ k: 18, cx: 0, cy: 0, shake: 0, W: 1, H: 1 });
  A.follow = function (view, run, W, H, dt, snap) {
    view.W = W; view.H = H;
    const gh = run.land.h(run.x), hag = Math.max(0, run.y - gh);
    const v = Math.hypot(run.vx, run.vy);
    const span = clamp(Math.max(30 + v * 0.55, hag * 1.5 + 18), 30, 120);        // metres from top to bottom of the screen
    const k = Math.min(H, W * 0.75) / span;
    const ahead = clamp(run.vx, -10, 40) * 0.45;
    const cx = run.x + ahead + W * 0.12 / k;
    const cy = lerp(run.y, gh, clamp(hag / (span * 0.9), 0, 0.5)) + span * 0.06;
    const s = snap ? 1 : 1 - Math.exp(-dt * 4);
    view.k = lerp(view.k, k, snap ? 1 : 1 - Math.exp(-dt * 1.6));
    view.cx = lerp(view.cx, cx, s); view.cy = lerp(view.cy, cy, s);
    view.shake = Math.max(0, view.shake - dt * 2.5);
  };
  const X = (v, x) => (x - v.cx) * v.k + v.W * 0.5 + v.sx;
  const Y = (v, y) => v.H * 0.5 - (y - v.cy) * v.k + v.sy;

  /* ================= bits that fly ================= */
  A.fx = [];
  A.burst = function (kind, x, y, n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const a = (o.dir != null ? o.dir : Math.PI / 2) + (Math.random() - 0.5) * (o.spread || 2.4), s = (o.speed || 6) * (0.4 + Math.random() * 0.8);
      A.fx.push({ kind, x, y, vx: Math.cos(a) * s + (o.vx || 0), vy: Math.sin(a) * s + (o.vy || 0), life: (o.life || 0.9) * (0.6 + Math.random() * 0.6), age: 0,
        size: (o.size || 0.25) * (0.6 + Math.random() * 0.8), col: o.col || '#ffffff', rot: Math.random() * TAU, av: (Math.random() - 0.5) * 12, g: o.g != null ? o.g : 1 });
    }
  };
  A.popText = [];
  A.pop = (text, x, y, col) => A.popText.push({ text, x, y, col: col || '#fff2c0', age: 0 });
  function stepFx(dt, land) {
    for (const p of A.fx) {
      p.age += dt; p.vy -= 9.8 * p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.av * dt;
      if (p.g && land && p.y < land.h(p.x)) { p.y = land.h(p.x); p.vy *= -0.3; p.vx *= 0.6; }
    }
    A.fx = A.fx.filter(p => p.age < p.life);
    for (const p of A.popText) { p.age += dt; p.y += dt * 2.2; }
    A.popText = A.popText.filter(p => p.age < 1.2);
  }

  /* ================= the sky and the far land ================= */
  const clouds = Array.from({ length: 9 }, (_, i) => ({ u: i * 420 + Math.random() * 200, h: 0.08 + Math.random() * 0.3, s: 0.6 + Math.random() * 0.9 }));
  function sky(ctx, v, S, t) {
    const { W, H } = v;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, S.sky[0]); g.addColorStop(1, S.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* the sun (or a moon at night), Pia, low in the sky */
    const sx = W * 0.78 - (v.cx * 0.01) % 40, sy = H * (S.night ? 0.2 : 0.24);
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.25);
    sg.addColorStop(0, S.night ? 'rgba(230,230,255,0.55)' : 'rgba(255,250,220,0.85)'); sg.addColorStop(0.12, S.night ? 'rgba(200,200,255,0.18)' : 'rgba(255,240,190,0.35)'); sg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = S.night ? '#e8e8ff' : '#fffbe8'; ctx.beginPath(); ctx.arc(sx, sy, H * 0.035, 0, TAU); ctx.fill();
    if (S.night) {   // stars
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 60; i++) { const x = (LR.hash(91, i) * W * 1.3 - v.cx * 0.02) % W, y = LR.hash(93, i) * H * 0.5; ctx.fillRect((x + W) % W, y, 1.5, 1.5); }
    }
    /* clouds drift slowly by */
    ctx.fillStyle = S.night ? 'rgba(200,200,240,0.12)' : 'rgba(255,255,255,0.55)';
    for (const c of clouds) {
      const span = W + 600, x = ((c.u - v.cx * v.k * 0.04 - t * 6) % span + span) % span - 300, y = H * c.h, s = c.s * H * 0.06;
      ctx.beginPath(); ctx.ellipse(x, y, s * 2.2, s * 0.6, 0, 0, TAU); ctx.ellipse(x + s * 1.2, y - s * 0.3, s * 1.3, s * 0.6, 0, 0, TAU); ctx.ellipse(x - s * 1.1, y - s * 0.15, s, s * 0.5, 0, 0, TAU); ctx.fill();
    }
  }
  function farLand(ctx, v, S, par, col, amp, base, seed, scale) {
    const { W, H } = v;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let px = 0; px <= W + 8; px += 8) {
      const u = (px - W * 0.5) / v.k * par + v.cx * par;
      const n = 0.6 * LR.noise(seed, u / scale) + 0.3 * LR.noise(seed + 5, u / (scale * 0.4)) + 0.1 * LR.noise(seed + 9, u / (scale * 0.12));
      ctx.lineTo(px, H * base - n * H * amp - (v.cy * v.k * par * 0.15));
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }

  /* ================= the land ================= */
  function landShape(ctx, v, land, x0, x1, step, off) {
    ctx.beginPath(); ctx.moveTo(X(v, x0), v.H + 10);
    for (let x = x0; x <= x1; x += step) ctx.lineTo(X(v, x), Y(v, land.h(x) - (off || 0)));
    ctx.lineTo(X(v, x1), v.H + 10); ctx.closePath();
  }
  function ground(ctx, v, run, t) {
    const land = run.land, S = land.stage, k = v.k;
    const x0 = v.cx - v.W * 0.5 / k - 4, x1 = v.cx + v.W * 0.5 / k + 4, step = Math.max(0.25, 3 / k);
    /* deep soil, then the top soil, then the grass line */
    const gy = Y(v, land.h(v.cx));
    const sg = ctx.createLinearGradient(0, gy - 20, 0, gy + v.H * 0.8);
    sg.addColorStop(0, S.soil); sg.addColorStop(1, mix(S.soil, '#000000', 0.55));
    landShape(ctx, v, land, x0, x1, step, 0); ctx.fillStyle = sg; ctx.fill();
    ctx.save(); ctx.clip();
    /* layers in the soil */
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = Math.max(1, k * 0.25);
    for (const d of [2.5, 6, 11]) { ctx.beginPath(); for (let x = x0; x <= x1; x += step * 2) { const yy = Y(v, land.h(x) - d - LR.noise(7, x / 6) * 0.8); x === x0 ? ctx.moveTo(X(v, x), yy) : ctx.lineTo(X(v, x), yy); } ctx.stroke(); }
    /* stones in the soil */
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = Math.floor(x0 / 3) * 3; x < x1; x += 3) { const hh = LR.hash(41, x | 0); if (hh < 0.4) { ctx.beginPath(); ctx.ellipse(X(v, x + hh * 3), Y(v, land.h(x) - 1.5 - hh * 8), k * (0.3 + hh), k * (0.2 + hh * 0.5), 0, 0, TAU); ctx.fill(); } }
    ctx.restore();
    /* the grass band along the top */
    ctx.strokeStyle = S.ground; ctx.lineWidth = Math.max(2, k * 0.9); ctx.lineJoin = 'round';
    ctx.beginPath(); for (let x = x0; x <= x1; x += step) { const yy = Y(v, land.h(x) - 0.4); x === x0 ? ctx.moveTo(X(v, x), yy) : ctx.lineTo(X(v, x), yy); } ctx.stroke();
    ctx.strokeStyle = S.grass; ctx.lineWidth = Math.max(1.5, k * 0.3);
    ctx.beginPath(); for (let x = x0; x <= x1; x += step) { const yy = Y(v, land.h(x)); x === x0 ? ctx.moveTo(X(v, x), yy) : ctx.lineTo(X(v, x), yy); } ctx.stroke();
    /* tufts, bending in the wind */
    ctx.strokeStyle = S.grass; ctx.lineWidth = Math.max(1, k * 0.08); ctx.lineCap = 'round';
    const wind = land.wind(v.cx, t);
    for (let x = Math.floor(x0); x < x1; x += 1) {
      const hh = LR.hash(S.seed, x);
      if (hh > 0.55 || land.cutAt(x)) continue;
      const bx = x + hh * 2, by = land.h(bx), sway = Math.sin(t * 2 + x) * 0.15 + wind * 0.03;
      for (let b = -1; b <= 1; b++) {
        ctx.beginPath(); ctx.moveTo(X(v, bx + b * 0.15), Y(v, by));
        ctx.quadraticCurveTo(X(v, bx + b * 0.25 + sway * 0.5), Y(v, by + 0.4), X(v, bx + b * 0.35 + sway), Y(v, by + 0.55 + hh * 0.6));
        ctx.stroke();
      }
    }
    /* chasms (darkness) and pools (black water) */
    for (const sgm of land.segsIn(x0, x1)) {
      const c = sgm.cut;
      if (!c) continue;
      if (c.kind === 'chasm') {
        const dg = ctx.createLinearGradient(0, Y(v, c.rim), 0, Y(v, c.rim - c.depth));
        dg.addColorStop(0, 'rgba(10,6,12,0)'); dg.addColorStop(1, 'rgba(10,6,12,0.95)');
        ctx.fillStyle = dg; ctx.fillRect(X(v, c.a - 3), Y(v, c.rim), (c.w + 6) * k, c.depth * k + v.H);
      } else {
        const top = Y(v, c.rim), wg = ctx.createLinearGradient(0, top, 0, top + 6 * k);
        wg.addColorStop(0, '#2a3a4a'); wg.addColorStop(1, '#0a0e14');
        ctx.fillStyle = wg;
        ctx.beginPath(); ctx.moveTo(X(v, c.a - 3), top);
        for (let x = c.a - 3; x <= c.b + 3; x += step) ctx.lineTo(X(v, x), Math.max(top, Y(v, land.h(x))) + 0.5);
        ctx.closePath(); ctx.fill();
        ctx.fillRect(X(v, c.a - 3), top, (c.w + 6) * k, 0);
        const yy = top;
        ctx.save(); ctx.beginPath(); ctx.rect(X(v, c.a - 3), yy, (c.w + 6) * k, 5 * k); ctx.clip();
        ctx.fillStyle = wg; ctx.fillRect(X(v, c.a - 3), yy, (c.w + 6) * k, 5 * k);
        ctx.strokeStyle = 'rgba(180,200,230,0.25)'; ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) { const wx = c.a + ((i * 7 + t * 1.3) % c.w); ctx.beginPath(); ctx.moveTo(X(v, wx), yy + 2 + i % 3 * 3); ctx.lineTo(X(v, wx + 1.5), yy + 2 + i % 3 * 3); ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = 'rgba(200,220,255,0.35)'; ctx.lineWidth = Math.max(1, k * 0.1);
        ctx.beginPath(); ctx.moveTo(X(v, c.a - 1), yy); ctx.lineTo(X(v, c.b + 1), yy); ctx.stroke();
      }
    }
  }

  /* the roost: a hollow stump on the ledge, where the Eikar keep their Lútut */
  function roost(ctx, v, land) {
    const k = v.k, x = -9, y = land.H0;
    if (X(v, x + 12) < -50) return;
    ctx.fillStyle = '#5a3a22';
    ctx.beginPath(); ctx.moveTo(X(v, x - 5), Y(v, y)); ctx.lineTo(X(v, x - 4), Y(v, y + 9)); ctx.quadraticCurveTo(X(v, x), Y(v, y + 11), X(v, x + 4), Y(v, y + 9)); ctx.lineTo(X(v, x + 5), Y(v, y)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(1, k * 0.15);
    for (let i = -3; i <= 3; i += 1.5) { ctx.beginPath(); ctx.moveTo(X(v, x + i), Y(v, y)); ctx.lineTo(X(v, x + i * 0.85), Y(v, y + 9.5)); ctx.stroke(); }
    ctx.fillStyle = '#1e140c'; ctx.beginPath(); ctx.ellipse(X(v, x), Y(v, y + 2.6), k * 1.6, k * 2.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb860'; ctx.beginPath(); ctx.arc(X(v, x - 2.6), Y(v, y + 6), k * 0.5, 0, TAU); ctx.arc(X(v, x + 2.7), Y(v, y + 5.2), k * 0.45, 0, TAU); ctx.fill();
    /* a banner: the roost's sign */
    ctx.strokeStyle = '#3a2614'; ctx.lineWidth = Math.max(1, k * 0.18);
    ctx.beginPath(); ctx.moveTo(X(v, x + 6.5), Y(v, y)); ctx.lineTo(X(v, x + 6.5), Y(v, y + 7)); ctx.stroke();
    ctx.fillStyle = '#a8402a'; ctx.beginPath(); ctx.moveTo(X(v, x + 6.5), Y(v, y + 7)); ctx.lineTo(X(v, x + 9.5), Y(v, y + 6.2)); ctx.lineTo(X(v, x + 6.5), Y(v, y + 5.2)); ctx.fill();
  }

  /* way stones every 250 m, and a flag at your best */
  function markers(ctx, v, run) {
    const land = run.land, k = v.k, x0 = v.cx - v.W * 0.5 / k, x1 = v.cx + v.W * 0.5 / k;
    for (let m = Math.ceil(x0 / 250) * 250; m < x1; m += 250) {
      if (m <= 0) continue;
      const y = land.h(m);
      ctx.fillStyle = '#7a7466';
      ctx.beginPath(); ctx.moveTo(X(v, m - 0.6), Y(v, y - 0.3)); ctx.lineTo(X(v, m - 0.45), Y(v, y + 2.6)); ctx.lineTo(X(v, m), Y(v, y + 3)); ctx.lineTo(X(v, m + 0.45), Y(v, y + 2.6)); ctx.lineTo(X(v, m + 0.6), Y(v, y - 0.3)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff4d0'; ctx.font = '700 ' + Math.max(10, k * 0.7) + 'px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(m + ' m', X(v, m), Y(v, y + 3.6));
    }
    if (run.best > 30 && run.best > x0 && run.best < x1) {
      const b = run.best, y = land.h(b);
      ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = Math.max(1, k * 0.14);
      ctx.beginPath(); ctx.moveTo(X(v, b), Y(v, y)); ctx.lineTo(X(v, b), Y(v, y + 7)); ctx.stroke();
      ctx.fillStyle = '#f0c860'; ctx.beginPath(); ctx.moveTo(X(v, b), Y(v, y + 7)); ctx.lineTo(X(v, b + 3), Y(v, y + 6.3)); ctx.lineTo(X(v, b), Y(v, y + 5.5)); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.max(10, k * 0.6) + 'px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('BEST', X(v, b + 0.4), Y(v, y + 7.6));
    }
  }

  /* warm air rising: a faint shimmer */
  function thermals(ctx, v, run, t) {
    const k = v.k;
    ctx.strokeStyle = 'rgba(255,240,210,0.16)'; ctx.lineWidth = Math.max(1, k * 0.12); ctx.lineCap = 'round';
    for (const sg of run.land.segsIn(v.cx - v.W / k, v.cx + v.W / k)) for (const th of sg.thermals) {
      const gy = run.land.h(th.x);
      for (let i = 0; i < 7; i++) {
        const u = (i / 7 - 0.5) * th.w * 1.2, ph = (t * 0.5 + i * 0.37) % 1;
        const y0 = gy + ph * 50, y1 = y0 + 6;
        ctx.globalAlpha = Math.sin(ph * Math.PI);
        ctx.beginPath(); ctx.moveTo(X(v, th.x + u), Y(v, y0));
        ctx.bezierCurveTo(X(v, th.x + u + 1), Y(v, y0 + 2), X(v, th.x + u - 1), Y(v, y0 + 4), X(v, th.x + u), Y(v, y1)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ================= stones and trees ================= */
  function stone(ctx, v, o, S) {
    const k = v.k, x = o.x, y = o.y, hw = o.w / 2;
    if (o.broken) {   // rubble
      ctx.fillStyle = '#6a6458';
      for (let i = 0; i < 4; i++) { const hh = LR.hash(o.seed, i); ctx.beginPath(); ctx.ellipse(X(v, x - hw + hh * o.w), Y(v, y + 0.5), k * (0.3 + hh * 0.4), k * 0.3, hh, 0, TAU); ctx.fill(); }
      return;
    }
    const top = y + o.h, lean = (LR.hash(o.seed, 9) - 0.5) * 0.3;
    const g = ctx.createLinearGradient(X(v, x - hw), 0, X(v, x + hw), 0);
    g.addColorStop(0, '#9a9282'); g.addColorStop(1, '#5e584c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(X(v, x - hw), Y(v, y)); ctx.lineTo(X(v, x - hw * 0.8 + lean), Y(v, top - 0.3)); ctx.quadraticCurveTo(X(v, x + lean), Y(v, top + 0.4), X(v, x + hw * 0.8 + lean), Y(v, top - 0.4)); ctx.lineTo(X(v, x + hw), Y(v, y)); ctx.closePath(); ctx.fill();
    /* old carvings: chevrons, like the ones on a Lútut's hide */
    ctx.strokeStyle = 'rgba(40,34,30,0.45)'; ctx.lineWidth = Math.max(1, k * 0.09);
    for (let c = 0; c < Math.floor(o.h / 1.2); c++) {
      const cy = y + 0.8 + c * 1.1; ctx.beginPath(); ctx.moveTo(X(v, x - hw * 0.5 + lean * c / 3), Y(v, cy + 0.3)); ctx.lineTo(X(v, x + lean * c / 3), Y(v, cy)); ctx.lineTo(X(v, x + hw * 0.5 + lean * c / 3), Y(v, cy + 0.3)); ctx.stroke();
    }
    ctx.fillStyle = S.grass; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(X(v, x - hw * 0.4), Y(v, top - 0.4), k * hw * 0.5, k * 0.18, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  function tree(ctx, v, o, S, t) {
    const k = v.k, x = o.x, y = o.y, th = o.h, w = o.w;
    const dark = S.id === 'marsh';
    ctx.fillStyle = dark ? '#2a221c' : '#5a3e26';
    if (o.broken) {
      ctx.beginPath(); ctx.moveTo(X(v, x - w * 0.6), Y(v, y)); ctx.lineTo(X(v, x - w * 0.5), Y(v, y + 1.6)); ctx.lineTo(X(v, x - w * 0.1), Y(v, y + 1.1)); ctx.lineTo(X(v, x + w * 0.2), Y(v, y + 1.9)); ctx.lineTo(X(v, x + w * 0.5), Y(v, y + 1.2)); ctx.lineTo(X(v, x + w * 0.6), Y(v, y)); ctx.fill();
      return;
    }
    const sway = Math.sin(t * 0.8 + o.seed) * 0.25;
    ctx.beginPath(); ctx.moveTo(X(v, x - w * 0.6), Y(v, y)); ctx.quadraticCurveTo(X(v, x - w * 0.3), Y(v, y + th * 0.5), X(v, x - w * 0.25 + sway), Y(v, y + th * 0.85));
    ctx.lineTo(X(v, x + w * 0.25 + sway), Y(v, y + th * 0.85)); ctx.quadraticCurveTo(X(v, x + w * 0.3), Y(v, y + th * 0.5), X(v, x + w * 0.6), Y(v, y)); ctx.closePath(); ctx.fill();
    /* the canopy: a few round masses (hanging and dark in the marsh) */
    const base = dark ? '#24342a' : S.id === 'canyon' ? '#7a7a3a' : '#3e6a30';
    for (let i = 0; i < 6; i++) {
      const hh = LR.hash(o.seed, i), cx = x + sway + (hh - 0.5) * th * 0.5, cy = y + th * (0.72 + LR.hash(o.seed, i + 9) * 0.3), r = th * (0.17 + hh * 0.1);
      ctx.fillStyle = mix(base, i % 2 ? '#000000' : '#ffffff', i % 2 ? 0.15 : 0.08);
      ctx.beginPath(); ctx.ellipse(X(v, cx), Y(v, cy), r * k, r * k * (dark ? 1.3 : 0.85), 0, 0, TAU); ctx.fill();
    }
    if (dark) {   // hanging strands
      ctx.strokeStyle = 'rgba(60,80,60,0.7)'; ctx.lineWidth = Math.max(1, k * 0.08);
      for (let i = 0; i < 8; i++) { const sx = x + sway + (LR.hash(o.seed, i + 30) - 0.5) * th * 0.6; ctx.beginPath(); ctx.moveTo(X(v, sx), Y(v, y + th * 0.7)); ctx.lineTo(X(v, sx + Math.sin(t + i) * 0.3), Y(v, y + th * 0.38)); ctx.stroke(); }
    }
  }

  /* ================= teeth to pick up ================= */
  const TOOTH_COL = { 1: '#f4efe2', 5: '#e8b070', 25: '#ffd860', 100: '#c8a0ff' };
  function teeth(ctx, v, run, t) {
    const k = v.k, val = LR.toothValue(run.dist), col = TOOTH_COL[val];
    for (const sg of run.land.segsIn(v.cx - v.W / k, v.cx + v.W / k)) for (const tt of sg.teeth) {
      if (tt.got) continue;
      const x = X(v, tt.x), y = Y(v, tt.y + Math.sin(t * 3 + tt.x) * 0.15), s = k * 0.55;
      if (x < -20 || x > v.W + 20) continue;
      ctx.fillStyle = rgba('#fff0c0', 0.18); ctx.beginPath(); ctx.arc(x, y, s * 1.1, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(x - s * 0.45, y - s * 0.5); ctx.quadraticCurveTo(x, y - s * 0.75, x + s * 0.45, y - s * 0.5);
      ctx.quadraticCurveTo(x + s * 0.3, y + s * 0.2, x + s * 0.05, y + s * 0.7); ctx.quadraticCurveTo(x - s * 0.25, y + s * 0.1, x - s * 0.45, y - s * 0.5); ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,40,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  /* ================= what the Lútut hunts ================= */
  function prey(ctx, v, run, t) {
    const k = v.k;
    for (const sg of run.land.segsIn(v.cx - v.W / k, v.cx + v.W / k)) for (const p of sg.prey) {
      if (p.eaten) continue;
      const x = X(v, p.x), y = Y(v, p.y);
      if (x < -60 || x > v.W + 60) continue;
      if (p.kind === 'hopper') {
        const s = k * 0.55, air = !p.gr;
        ctx.fillStyle = '#8a7a62';
        ctx.beginPath(); ctx.ellipse(x, y - s * 0.7, s * 0.75, s * 0.55, air ? -0.3 : 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + s * 0.6, y - s * 1.05, s * 0.38, s * 0.32, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#6a5c48'; ctx.lineWidth = Math.max(1, s * 0.18); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 0.4); ctx.lineTo(x - s * (air ? 1.0 : 0.6), y - (air ? s * 0.1 : 0)); ctx.stroke();   // the long hind leg
        ctx.beginPath(); ctx.moveTo(x + s * 0.7, y - s * 1.3); ctx.lineTo(x + s * 0.4, y - s * 1.9); ctx.stroke();  // an ear
        ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(x + s * 0.78, y - s * 1.1, Math.max(1, s * 0.08), 0, TAU); ctx.fill();
      } else if (p.kind === 'byrd') {
        /* an Albali Byrd: five horns, flapping */
        const s = k * 0.6, f = Math.sin(t * 14 + p.ph * 3);
        ctx.fillStyle = '#d8d0e0';
        ctx.beginPath(); ctx.ellipse(x, y, s * 0.6, s * 0.32, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#b8aec8';
        ctx.beginPath(); ctx.moveTo(x - s * 0.1, y - s * 0.1); ctx.lineTo(x - s * 0.6, y - s * (0.2 + f * 0.9)); ctx.lineTo(x + s * 0.3, y - s * 0.15); ctx.fill();
        ctx.fillStyle = '#e8d890';
        for (let i = 0; i < 5; i++) { const a = -1.3 + i * 0.35; ctx.beginPath(); ctx.moveTo(x + s * 0.45, y - s * 0.12); ctx.lineTo(x + s * 0.45 + Math.cos(a) * s * 0.45, y - s * 0.12 + Math.sin(a) * s * 0.45); ctx.lineTo(x + s * 0.55, y - s * 0.05); ctx.fill(); }
        ctx.fillStyle = 'rgba(232,216,144,0.25)'; ctx.beginPath(); ctx.arc(x + s * 0.6, y - s * 0.25, s * 0.5, 0, TAU); ctx.fill();   // the stinging film
      } else if (p.kind === 'shellback') {
        const s = k * 1.3, step = Math.sin(t * 4 + p.x);
        ctx.strokeStyle = '#3a3226'; ctx.lineWidth = Math.max(1, s * 0.14); ctx.lineCap = 'round';
        for (const lx of [-0.5, -0.2, 0.2, 0.5]) { ctx.beginPath(); ctx.moveTo(x + lx * s, y - s * 0.3); ctx.lineTo(x + lx * s + step * s * 0.08 * (lx > 0 ? 1 : -1), y); ctx.stroke(); }
        const g = ctx.createRadialGradient(x - s * 0.2, y - s * 0.75, s * 0.1, x, y - s * 0.4, s);
        g.addColorStop(0, '#8a7e5a'); g.addColorStop(1, '#4a4230');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - s * 0.42, s * 0.85, s * 0.5, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(30,24,16,0.5)'; ctx.lineWidth = Math.max(1, s * 0.05);
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * s * 0.3, y - s * 0.42); ctx.lineTo(x + i * s * 0.2, y - s * 0.85); ctx.stroke(); }
        ctx.fillStyle = '#5a5038'; ctx.beginPath(); ctx.ellipse(x + s * 0.9, y - s * 0.35, s * 0.25, s * 0.18, 0, 0, TAU); ctx.fill();
      } else if (p.kind === 'eel') {
        if (!p.up) continue;
        const s = k * 0.7, a = Math.atan2(-(p.vy || 0), 3);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.strokeStyle = '#2a3a2e'; ctx.lineWidth = Math.max(2, s * 0.4); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-s * 1.2, Math.sin(t * 10) * s * 0.3); ctx.quadraticCurveTo(0, -Math.sin(t * 10) * s * 0.3, s * 1.0, 0); ctx.stroke();
        ctx.fillStyle = '#e8e080'; ctx.beginPath(); ctx.arc(s * 0.9, -s * 0.08, Math.max(1, s * 0.08), 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  }

  /* ================= the Eikar ================= */
  /* sitting astride, holding the horns. o: { s (px per m), lean (rad), t, scarf (0..1 how hard it streams), cap } */
  const SKIN = '#b07a40', SKIN_DK = '#7e5426', CAP = '#6a4826', CAP_LT = '#8a6236', TUNIC = '#3e6a5a', SCARF = '#c8503a';
  A.eikar = function (ctx, o) {
    const s = o.s, t = o.t || 0;
    ctx.save(); ctx.rotate(o.lean || 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    /* the scarf streams out behind */
    const st = clamp(o.scarf == null ? 0.5 : o.scarf, 0, 1);
    ctx.strokeStyle = SCARF; ctx.lineWidth = s * 0.12;
    ctx.beginPath(); ctx.moveTo(s * 0.05, -s * 0.78);
    ctx.bezierCurveTo(-s * 0.3, -s * (0.72 + Math.sin(t * 9) * 0.06 * st), -s * (0.5 + 0.3 * st), -s * (0.85 - st * 0.1 + Math.sin(t * 11 + 1) * 0.1 * st), -s * (0.55 + 0.55 * st), -s * (0.7 + Math.sin(t * 13) * 0.12 * st));
    ctx.stroke();
    /* the near leg, down the Lútut's side */
    ctx.strokeStyle = '#3a3a2a'; ctx.lineWidth = s * 0.14;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.1); ctx.lineTo(s * 0.18, s * 0.22); ctx.lineTo(s * 0.05, s * 0.45); ctx.stroke();
    /* the body, leaning forward */
    ctx.fillStyle = TUNIC;
    ctx.beginPath(); ctx.moveTo(-s * 0.16, 0); ctx.quadraticCurveTo(-s * 0.2, -s * 0.45, s * 0.02, -s * 0.72); ctx.lineTo(s * 0.2, -s * 0.64); ctx.quadraticCurveTo(s * 0.18, -s * 0.3, s * 0.14, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-s * 0.17, -s * 0.12, s * 0.32, s * 0.06);   // belt
    /* the arms, reaching forward for the horns */
    ctx.strokeStyle = SKIN_DK; ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.moveTo(s * 0.12, -s * 0.6); ctx.quadraticCurveTo(s * 0.32, -s * 0.5, s * (0.46 + (o.reach || 0)), -s * 0.56); ctx.stroke();
    /* the head: acorn-textured skin, the markings under the eyes */
    const hx0 = s * 0.12, hy0 = -s * 0.92, hr = s * 0.2;
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.ellipse(hx0, hy0, hr * 0.95, hr, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(90,56,20,0.35)'; ctx.lineWidth = Math.max(0.6, s * 0.012);
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hx0 - hr * 0.7, hy0 + i * hr * 0.35); ctx.lineTo(hx0 + hr * 0.7, hy0 + i * hr * 0.35 + hr * 0.15); ctx.stroke(); }
    ctx.fillStyle = '#1a120a'; ctx.beginPath(); ctx.arc(hx0 + hr * 0.5, hy0 - hr * 0.05, Math.max(0.8, s * 0.028), 0, TAU); ctx.fill();
    ctx.strokeStyle = '#f0e0b0'; ctx.lineWidth = Math.max(0.8, s * 0.022);
    ctx.beginPath(); ctx.moveTo(hx0 + hr * 0.32, hy0 + hr * 0.25); ctx.lineTo(hx0 + hr * 0.55, hy0 + hr * 0.3); ctx.moveTo(hx0 + hr * 0.3, hy0 + hr * 0.42); ctx.lineTo(hx0 + hr * 0.5, hy0 + hr * 0.47); ctx.stroke();
    /* the Aagac: the acorn cap that is part of every Eikar */
    if (o.cap !== false) A.aagac(ctx, hx0 - hr * 0.05, hy0 - hr * 0.55, hr * 1.25);
    ctx.restore();
  };
  A.aagac = function (ctx, x, y, w) {
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createLinearGradient(0, -w * 0.6, 0, w * 0.2);
    g.addColorStop(0, CAP_LT); g.addColorStop(1, CAP);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, w, w * 0.62, 0, Math.PI, 0); ctx.quadraticCurveTo(w * 0.9, w * 0.22, 0, w * 0.22); ctx.quadraticCurveTo(-w * 0.9, w * 0.22, -w, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(40,24,10,0.45)'; ctx.lineWidth = Math.max(0.6, w * 0.06);       // the scaly cap
    for (let r = 0; r < 3; r++) for (let i = -3 + r; i <= 3 - r; i++) { const cx = i * w * 0.26, cy = -r * w * 0.2 + w * 0.02; ctx.beginPath(); ctx.arc(cx, cy, w * 0.13, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
    ctx.strokeStyle = CAP; ctx.lineWidth = Math.max(1, w * 0.14);
    ctx.beginPath(); ctx.moveTo(0, -w * 0.6); ctx.quadraticCurveTo(w * 0.05, -w * 0.85, w * 0.22, -w * 0.9); ctx.stroke();   // the stem
    ctx.restore();
  };

  /* ================= the Lútut ================= */
  /* the same bob and tilt the look puts on its body, so the rider sits where the body is */
  function lookPose(state, t, r) {
    const moving = state === 'walk' || state === 'run', grounded = state === 'dormant' || state === 'death';
    const rate = moving ? 9 : state === 'attack' ? 7 : state === 'special' ? 14 : 4.5;
    const beat = grounded ? 0 : Math.sin(t * rate);
    const bob = grounded ? 0 : -beat * r * 0.06 + Math.sin(t * 1.3) * r * 0.03;
    const tilt = state === 'death' ? 0.18 : state === 'special' ? -0.22 : moving ? 0.1 : state === 'attack' ? 0.08 : 0;
    return { bob: bob + (grounded ? r * 0.28 : 0) + (state === 'death' ? r * 0.18 : 0), tilt };
  }
  function standIn(ctx, r, t) {   // only if the look file is missing
    ctx.fillStyle = '#2b2535';
    ctx.beginPath(); ctx.ellipse(r * 0.18, 0, r, r * 0.82, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2b2535'; ctx.lineWidth = r * 0.25; ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(-r * 2.6, r * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 2.8, r * 0.25, r * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#241c28'; ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(-r * 1.4, -r * (1.6 + Math.sin(t * 9) * 0.5)); ctx.lineTo(-r * 0.6, -r * 0.2); ctx.fill();
    ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(r * 0.68, -r * 0.46, r * 0.15, 0, TAU); ctx.fill();
  }
  /* o: { x, y (canvas px), r (px), ang (rad, y up), state, t, rider: {lean, scarf, reach} | null, tint } */
  A.lutut = function (ctx, o) {
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(-o.ang);
    if (o.tint && 'filter' in ctx) ctx.filter = o.tint;
    if (LR.look) LR.look.draw(ctx, { r: o.r }, o.t, o.state); else standIn(ctx, o.r, o.t);
    if ('filter' in ctx) ctx.filter = 'none';
    if (o.cracks) {   // cracks you can see, spreading along the tail
      ctx.strokeStyle = 'rgba(255,240,220,0.75)'; ctx.lineWidth = Math.max(1, o.r * 0.03);
      for (let c = 0; c < o.cracks; c++) {
        const bx = -o.r * (1.2 + c * 0.42), by = o.r * 0.02;
        ctx.beginPath(); ctx.moveTo(bx, by - o.r * 0.12); ctx.lineTo(bx - o.r * 0.06, by); ctx.lineTo(bx + o.r * 0.03, by + o.r * 0.05); ctx.lineTo(bx - o.r * 0.04, by + o.r * 0.14); ctx.stroke();
      }
    }
    if (o.numb) {    // the Byrd's sting: a cold shimmer on the wings
      ctx.fillStyle = 'rgba(200,230,255,' + (0.5 * o.numb) + ')';
      for (let i = 0; i < 7; i++) { const a = o.t * 3 + i; ctx.beginPath(); ctx.arc(-o.r * 0.5 + Math.cos(a) * o.r * 0.8, -o.r * 1.1 + Math.sin(a * 1.3) * o.r * 0.4, o.r * 0.06, 0, TAU); ctx.fill(); }
    }
    if (o.rider) {
      const P = lookPose(o.state, o.t, o.r);
      ctx.translate(0, P.bob); ctx.rotate(P.tilt);
      ctx.translate(o.r * 0.06, -o.r * 0.78);
      A.eikar(ctx, Object.assign({ s: o.riderPx || o.r * 0.85, t: o.t }, o.rider));
    }
    ctx.restore();
  };
  /* which of the look's states, and the clock to hand it, for what the Lútut is doing */
  A.lututState = function (run, anim, dt) {
    let state = 'run';
    if (run.over === 'shattered' || run.over === 'sank' || run.over === 'fell') state = 'death';
    else if (run.over === 'hungry' || (run.over && run.grounded && run.overT > 1)) state = 'dormant';
    else if (run.suckT > 0) state = 'attack';
    else if (run.numb > 0.4) state = 'special';
    else if (run.grounded) state = 'walk';
    const v = Math.hypot(run.vx, run.vy);
    if (state === 'walk') anim.t += dt * clamp(v / 8, 0.15, 1.4);
    else if (state === 'run') {
      if (run.beating) anim.t += dt;
      else {   // hold the wings out (gliding) or swept back (tucked): ease the clock to that point in the beat
        const want = run.tucking ? -Math.PI / 2 : Math.asin(0.28);
        const ph = anim.t * 9, cyc = Math.floor(ph / TAU) * TAU, target = (cyc + (want < 0 ? want + TAU : want)) / 9;
        anim.t = lerp(anim.t, target >= anim.t - 0.02 ? target : target + TAU / 9, 1 - Math.exp(-dt * 10));
      }
    } else anim.t += dt;
    return state;
  };

  /* ================= everything, one frame ================= */
  A.frame = function (ctx, view, run, t, dt, anim, opts) {
    opts = opts || {};
    const S = run.stage, v = view;
    stepFx(dt, run.land);
    v.sx = v.shake ? (Math.random() - 0.5) * v.shake * 14 : 0; v.sy = v.shake ? (Math.random() - 0.5) * v.shake * 14 : 0;
    sky(ctx, v, S, t);
    farLand(ctx, v, S, 0.08, S.far, 0.12, 0.62, S.seed + 101, 500);
    farLand(ctx, v, S, 0.25, mix(S.mid, S.far, 0.35), 0.1, 0.74, S.seed + 202, 300);
    farLand(ctx, v, S, 0.5, S.mid, 0.08, 0.86, S.seed + 303, 180);
    if (S.night) { ctx.fillStyle = 'rgba(20,16,40,' + S.night * 0.35 + ')'; ctx.fillRect(0, 0, v.W, v.H); }
    thermals(ctx, v, run, t);
    const k = v.k, x0 = v.cx - v.W * 0.5 / k - 30, x1 = v.cx + v.W * 0.5 / k + 30;
    const segs = run.land.segsIn(x0, x1);
    for (const sg of segs) for (const o of sg.trees) tree(ctx, v, o, S, t);
    ground(ctx, v, run, t);
    roost(ctx, v, run.land);
    markers(ctx, v, run);
    for (const sg of segs) for (const o of sg.rocks) stone(ctx, v, o, S);
    teeth(ctx, v, run, t);
    prey(ctx, v, run, t);

    /* the Lútut, its rider (or the rider thrown off) */
    const state = A.lututState(run, anim, dt);
    const sp = Math.hypot(run.vx, run.vy);
    const lean = run.over === 'thrown' ? 0 : run.tucking ? 0.35 : run.grounded ? 0.1 : clamp(-run.av * 0.08, -0.3, 0.3) + 0.15;
    const tint = run.st.kind === 'young' ? 'brightness(1.18) saturate(0.9)' : run.st.kind === 'old' ? 'brightness(0.86)' : null;
    A.lutut(ctx, { x: X(v, run.x), y: Y(v, run.y), r: run.r * k, ang: run.ang, state, t: anim.t, cracks: run.cracks, numb: run.numb, tint,
      rider: run.rider ? null : { lean, scarf: sp / 25, reach: run.tucking ? 0.06 : 0 }, riderPx: 1.15 * k });
    if (run.rider) {
      const R = run.rider;
      ctx.save(); ctx.translate(X(v, R.x), Y(v, R.y)); ctx.rotate(-R.rot); A.eikar(ctx, { s: 1.15 * k, t, lean: 0, scarf: 0.6, cap: false }); ctx.restore();
      A.aagac(ctx, X(v, R.hat.x), Y(v, R.hat.y), 0.3 * k);
    }
    /* bits flying */
    for (const p of A.fx) {
      const a = 1 - p.age / p.life, x = X(v, p.x), y = Y(v, p.y), s = Math.max(1, p.size * k);
      ctx.globalAlpha = clamp(a * 1.4, 0, 1); ctx.fillStyle = p.col;
      if (p.kind === 'shard') { ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.fillRect(-s, -s * 0.5, s * 2, s); ctx.restore(); }
      else if (p.kind === 'feather') { ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, s * 1.4, s * 0.4, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(x, y, s * (p.kind === 'dust' ? 1 + (1 - a) * 2 : 1), 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const p of A.popText) {
      ctx.globalAlpha = clamp(1.4 - p.age, 0, 1);
      ctx.font = '700 ' + Math.max(14, k * 0.9) + 'px Georgia, serif';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.strokeText(p.text, X(v, p.x), Y(v, p.y));
      ctx.fillStyle = p.col; ctx.fillText(p.text, X(v, p.x), Y(v, p.y));
    }
    ctx.globalAlpha = 1;
    /* a soft vignette */
    const vg = ctx.createRadialGradient(v.W / 2, v.H / 2, Math.min(v.W, v.H) * 0.4, v.W / 2, v.H / 2, Math.max(v.W, v.H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + (S.night ? 0.5 : 0.28) + ')');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, v.W, v.H);
    return state;
  };

  /* a still portrait of a Lútut with its rider, for the roost */
  A.portrait = function (canvas, kind, t) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const K = LR.KINDS[kind], r = H * 0.2 * K.scale;
    const tint = kind === 'young' ? 'brightness(1.18) saturate(0.9)' : kind === 'old' ? 'brightness(0.86)' : null;
    A.lutut(ctx, { x: W * 0.6, y: H * 0.56, r, ang: 0.08, state: 'idle', t: t || 1.1, tint, rider: { lean: 0.12, scarf: 0.4 }, riderPx: H * 0.2 });
  };
})();
