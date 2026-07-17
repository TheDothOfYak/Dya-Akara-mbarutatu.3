/* ============================================================
   DYA'AKARA — engine/parts.js
   Modular creature parts library.

   A creature with rig:'composed' is assembled from a `parts` spec
   instead of a single hardcoded rig:

     sp.parts = {
       body:  'oval' | 'chick' | 'bird' | 'fish' | 'serpent',
       wings: 'angel' | 'bird' | 'bat' | 'butterfly' | null,
       shell: 'turtle' | null,
       feet:  'talon' | 'paw' | 'fin' | null,
       tail:  'fish' | 'fluff' | null,
       eyes:  'round' | 'slit' | 'many' | 'none',
       mouth: 'beak' | 'jaw' | 'none',
       // optional per-part tuning:
       bodyW, bodyH, wingSpan, ...
     }

   Every part is a small drawer(ctx, E[, layer]) where E is the shared
   animation environment (see env()). Parts read E.hx/E.hy/E.hr — the
   head anchor the chosen body stamps on — so eyes/mouth land correctly
   whatever the body shape. Draw order is handled by draw().

   Mix and match live in tools/creature-composer.html; export the `parts`
   block straight into a species def or the Admin Panel.
   ============================================================ */
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  /* shared animation environment for one draw */
  function env(o, t, state) {
    const sp = o.sp, r = o.r, P = sp.parts || {};
    const moving = state === 'walk' || state === 'run';
    const rate = state === 'run' ? 13 : 8;
    const idleBob = state === 'idle' ? Math.sin(t * 2.2) * r * 0.05 : 0;
    const limp = state === 'dormant' || state === 'death';
    const attack = state === 'attack' || state === 'special';
    const bodyW = r * (P.bodyW != null ? P.bodyW : 0.9);
    const bodyH = r * (P.bodyH != null ? P.bodyH : 0.72);
    const y0 = -r * 0.1 + idleBob + (limp ? r * 0.2 : 0);
    return {
      o, sp, r, P, t, state, moving, rate, idleBob, limp, attack,
      bodyW, bodyH, y0, footY: r * 0.9,
      col: sp.color || '#b98a4a', col2: sp.color2 || '#5d594f',
      // head anchor — bodies overwrite these
      hx: bodyW * 0.7, hy: y0 - bodyH * 0.3, hr: r * 0.32,
    };
  }

  function bodyGrad(ctx, E, col) {
    const g = ctx.createLinearGradient(0, E.y0 - E.bodyH, 0, E.y0 + E.bodyH);
    g.addColorStop(0, shade(col, 24)); g.addColorStop(1, shade(col, -20));
    return g;
  }
  /* per-part tunable value (E.P.<key>), falling back to a default */
  function pv(E, key, def) { return E.P[key] != null ? E.P[key] : def; }

  /* ============================ BODIES ============================ */
  const BODY = {};

  BODY.oval = function (ctx, E) {
    ctx.fillStyle = bodyGrad(ctx, E, E.col);
    ctx.beginPath(); ctx.ellipse(0, E.y0, E.bodyW, E.bodyH * (E.limp ? 0.85 : 1), 0, 0, TAU); ctx.fill();
    /* no separate head — the face sits right on the front of the main oval */
    E.hx = E.bodyW * 0.5; E.hy = E.y0 - E.bodyH * 0.12; E.hr = E.r * 0.34;
  };

  /* round chick — big fluffy round body + small round head on top */
  BODY.chick = function (ctx, E) {
    const r = E.r, bob = E.idleBob;
    const bodyR = E.r * (E.P.bodyW != null ? E.P.bodyW : 0.7);
    // body
    const g = ctx.createRadialGradient(-bodyR * 0.2, E.y0 - bodyR * 0.2, bodyR * 0.2, 0, E.y0, bodyR);
    g.addColorStop(0, shade(E.col, 30)); g.addColorStop(1, shade(E.col, -14));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, E.y0 + bodyR * 0.2, bodyR, 0, TAU); ctx.fill();
    // fluff scallops around the base
    ctx.fillStyle = shade(E.col, 10);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.15 + i / 8 * Math.PI * 0.7;
      ctx.beginPath(); ctx.arc(Math.cos(a) * bodyR, E.y0 + bodyR * 0.2 + Math.sin(a) * bodyR, bodyR * 0.16, 0, TAU); ctx.fill();
    }
    // head
    const headR = bodyR * 0.62, hx = r * 0.16, hy = E.y0 - bodyR * 0.7 + bob;
    ctx.fillStyle = shade(E.col, 22);
    ctx.beginPath(); ctx.arc(hx, hy, headR, 0, TAU); ctx.fill();
    E.hx = hx + headR * 0.5; E.hy = hy; E.hr = headR;
  };

  /* upright bird body */
  BODY.bird = function (ctx, E) {
    const r = E.r;
    ctx.fillStyle = bodyGrad(ctx, E, E.col);
    ctx.beginPath(); ctx.ellipse(0, E.y0, r * 0.5, r * 0.66, -0.18, 0, TAU); ctx.fill();
    // breast feather arcs
    ctx.strokeStyle = shade(E.col, -28) + '66'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(r * 0.1, E.y0 + r * 0.08 + i * r * 0.14, r * 0.2, 0.6, 2.4); ctx.stroke(); }
    // head
    const hx = r * 0.4, hy = E.y0 - r * 0.62;
    ctx.fillStyle = shade(E.col, 16);
    ctx.beginPath(); ctx.arc(hx, hy, r * 0.3, 0, TAU); ctx.fill();
    E.hx = hx + r * 0.06; E.hy = hy - r * 0.04; E.hr = r * 0.3;
  };

  /* horizontal fish — teardrop with tail fin + gill */
  BODY.fish = function (ctx, E) {
    const r = E.r, swim = Math.sin(E.t * (E.moving ? 9 : 4));
    const bw = E.bodyW * 1.1, bh = E.bodyH * 0.9;
    // tail fin
    ctx.fillStyle = shade(E.col, -18);
    ctx.beginPath();
    ctx.moveTo(-bw * 0.82, E.y0);
    ctx.lineTo(-bw * 1.3, E.y0 - r * 0.34 + swim * r * 0.16);
    ctx.lineTo(-bw * 1.3, E.y0 + r * 0.34 + swim * r * 0.16);
    ctx.closePath(); ctx.fill();
    // dorsal fin
    ctx.beginPath();
    ctx.moveTo(-bw * 0.1, E.y0 - bh * 0.9);
    ctx.quadraticCurveTo(bw * 0.1, E.y0 - bh * 1.5, bw * 0.35, E.y0 - bh * 0.85);
    ctx.closePath(); ctx.fill();
    // body
    ctx.fillStyle = bodyGrad(ctx, E, E.col);
    ctx.beginPath(); ctx.ellipse(0, E.y0, bw, bh, Math.sin(E.t * 6) * 0.04, 0, TAU); ctx.fill();
    // gill
    ctx.strokeStyle = shade(E.col, -30); ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.beginPath(); ctx.arc(bw * 0.42, E.y0, bh * 0.6, -0.9, 0.9); ctx.stroke();
    E.hx = bw * 0.7; E.hy = E.y0 - bh * 0.18; E.hr = r * 0.26;
  };

  /* serpent — sinuous thick body, head raised at the front */
  BODY.serpent = function (ctx, E) {
    const r = E.r, wig = E.t * (E.moving ? 6 : 2.6);
    ctx.strokeStyle = bodyGrad(ctx, E, E.col);
    ctx.lineWidth = E.bodyH * 1.1; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 1.15, E.y0 + r * 0.28 + Math.sin(wig) * r * 0.08);
    ctx.bezierCurveTo(
      -r * 0.5, E.y0 + Math.sin(wig + 1) * r * 0.28,
      r * 0.2, E.y0 - r * 0.1 + Math.sin(wig + 2) * r * 0.22,
      r * 0.7, E.y0 - r * 0.4);
    ctx.stroke();
    // ridge highlight
    ctx.strokeStyle = shade(E.col, 18) + '88'; ctx.lineWidth = E.bodyH * 0.3;
    ctx.stroke();
    // head
    const hx = r * 0.8, hy = E.y0 - r * 0.5;
    ctx.fillStyle = shade(E.col, 14);
    ctx.beginPath(); ctx.ellipse(hx, hy, r * 0.34, r * 0.26, -0.4, 0, TAU); ctx.fill();
    E.hx = hx + r * 0.12; E.hy = hy - r * 0.02; E.hr = r * 0.26;
  };

  /* ============================ WINGS ============================ */
  /* drawn behind the body; each renders the pair */
  const WINGS = {};

  function wingFlap(E) { return Math.sin(E.t * (E.moving || E.attack ? 12 : 5)); }

  WINGS.angel = function (ctx, E) {
    const r = E.r, flap = wingFlap(E), span = r * 1.7 * (E.P.wingSpan || 1);
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(-r * 0.05, E.y0 - E.bodyH * 0.4);
      ctx.rotate(s * (0.35 + flap * 0.25));
      const g = ctx.createLinearGradient(0, 0, s * span, -r * 0.4);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d9def0');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * span * 0.7, -r * 1.1, s * span, -r * 0.2);
      ctx.quadraticCurveTo(s * span * 0.7, r * 0.5, 0, r * 0.1);
      ctx.closePath(); ctx.fill();
      // layered feather arcs
      ctx.strokeStyle = '#c3c9de'; ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath(); ctx.arc(s * span * 0.28 * i, -r * 0.05 * i, span * 0.34, -0.4, 1.2); ctx.stroke();
      }
      ctx.restore();
    }
  };

  WINGS.bird = function (ctx, E) {
    const r = E.r, flap = wingFlap(E), span = r * 1.45 * (E.P.wingSpan || 1);
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(-r * 0.05, E.y0 - E.bodyH * 0.3);
      ctx.rotate(s * (0.25 + flap * 0.4));
      ctx.fillStyle = shade(E.col, -22);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * span * 0.8, -r * 0.8, s * span, -r * 0.1);
      ctx.quadraticCurveTo(s * span * 0.5, r * 0.25, 0, 0);
      ctx.fill();
      ctx.strokeStyle = shade(E.col, -40) + '88'; ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(s * span * 0.15 * i, -r * 0.04 * i); ctx.lineTo(s * span * (0.9 - i * 0.08), -r * (0.35 - i * 0.05)); ctx.stroke(); }
      ctx.restore();
    }
  };

  WINGS.bat = function (ctx, E) {
    const r = E.r, flap = wingFlap(E), span = r * 1.55 * (E.P.wingSpan || 1);
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(-r * 0.05, E.y0 - E.bodyH * 0.3);
      ctx.rotate(s * (0.2 + flap * 0.45));
      ctx.fillStyle = shade(E.col, -30) + 'ee';
      const f = [0.45, 0.7, 0.9, 1.0];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      // membrane scalloped between finger struts
      for (let i = 0; i < f.length; i++) {
        const fx = s * span * f[i], fy = -r * (0.7 - i * 0.18);
        ctx.lineTo(fx, fy);
        if (i < f.length - 1) { const nx = s * span * f[i + 1], ny = -r * (0.7 - (i + 1) * 0.18); ctx.quadraticCurveTo((fx + nx) / 2, (fy + ny) / 2 + r * 0.28, nx, ny); }
      }
      ctx.quadraticCurveTo(s * span * 0.5, r * 0.35, 0, 0);
      ctx.closePath(); ctx.fill();
      // finger struts
      ctx.strokeStyle = shade(E.col, -50); ctx.lineWidth = Math.max(1, r * 0.03);
      for (let i = 0; i < f.length; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * span * f[i], -r * (0.7 - i * 0.18)); ctx.stroke(); }
      ctx.restore();
    }
  };

  WINGS.butterfly = function (ctx, E) {
    const r = E.r, flap = wingFlap(E), span = r * 1.25 * (E.P.wingSpan || 1);
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(0, E.y0 - E.bodyH * 0.1);
      ctx.rotate(s * flap * 0.4);
      const g = ctx.createRadialGradient(s * span * 0.5, -r * 0.2, 2, s * span * 0.5, -r * 0.2, span * 0.9);
      g.addColorStop(0, shade(E.col2, 30)); g.addColorStop(0.6, E.col2); g.addColorStop(1, shade(E.col, 10));
      ctx.fillStyle = g;
      // upper + lower wing lobes
      ctx.beginPath(); ctx.ellipse(s * span * 0.55, -r * 0.35, span * 0.55, r * 0.55, s * 0.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * span * 0.45, r * 0.28, span * 0.4, r * 0.4, s * -0.4, 0, TAU); ctx.fill();
      // eyespots
      ctx.fillStyle = '#ffffff88';
      ctx.beginPath(); ctx.arc(s * span * 0.6, -r * 0.35, r * 0.1, 0, TAU); ctx.fill();
      ctx.restore();
    }
  };

  /* ============================ SHELL ============================ */
  const SHELL = {};
  SHELL.turtle = function (ctx, E) {
    const r = E.r, bw = E.bodyW * 0.92, bh = E.bodyH * 1.05;
    const g = ctx.createRadialGradient(-bw * 0.2, E.y0 - bh * 0.4, bh * 0.2, 0, E.y0 - bh * 0.2, bw);
    g.addColorStop(0, shade(E.col2, 24)); g.addColorStop(1, shade(E.col2, -26));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(-bw * 0.05, E.y0 - bh * 0.2, bw, bh, 0, Math.PI, TAU); ctx.fill();
    // rim
    ctx.fillStyle = shade(E.col2, -34);
    ctx.beginPath(); ctx.ellipse(-bw * 0.05, E.y0 - bh * 0.2, bw, bh * 0.16, 0, 0, Math.PI); ctx.fill();
    // scute hexagons
    ctx.strokeStyle = shade(E.col2, -40); ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath(); ctx.ellipse(-bw * 0.05, E.y0 - bh * 0.25, bw * 0.42, bh * 0.5, 0, Math.PI, TAU); ctx.stroke();
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * bw * 0.42, E.y0 - bh * 0.2);
      ctx.lineTo(i * bw * 0.42, E.y0 - bh * 1.05);
      ctx.stroke();
    }
  };

  /* ============================ TAILS ============================ */
  const TAIL = {};
  TAIL.fluff = function (ctx, E) {
    const wag = Math.sin(E.t * 4) * 0.3;
    ctx.fillStyle = shade(E.col, 14);
    ctx.beginPath(); ctx.ellipse(-E.bodyW * 1.0, E.y0 - E.r * 0.2 + wag * E.r * 0.5, E.r * 0.4, E.r * 0.24, -0.5 + wag, 0, TAU); ctx.fill();
  };
  TAIL.fish = function (ctx, E) { /* fish body already carries its fin */ };
  TAIL.pointed = function (ctx, E) {
    const len = pv(E, 'tailLength', 1);
    const sway = Math.sin(E.t * (E.moving ? 6 : 2.5)) * E.r * 0.18;
    const bx = -E.bodyW * 0.8, by = E.y0;
    const tx = -E.bodyW * (0.8 + 0.7 * len), ty = E.y0 - E.r * 0.15 + sway;
    ctx.fillStyle = shade(E.col, -12);
    ctx.beginPath();
    ctx.moveTo(bx, by - E.r * 0.22);
    ctx.quadraticCurveTo((bx + tx) / 2, (by + ty) / 2 - E.r * 0.12, tx, ty);
    ctx.quadraticCurveTo((bx + tx) / 2, (by + ty) / 2 + E.r * 0.12, bx, by + E.r * 0.22);
    ctx.closePath(); ctx.fill();
  };

  /* ============================ FEET ============================ */
  const FEET = {};
  /* legs root inside the body (hidden behind it — feet are drawn before the
     body) and reach down to the ground; length/thickness/spread tunable */
  FEET.talon = function (ctx, E) {
    const r = E.r, len = pv(E, 'legLength', 1), thick = pv(E, 'legThick', 1), spread = pv(E, 'legSpread', 1);
    const top = E.y0 + E.bodyH * 0.4, bot = (E.y0 + E.bodyH) + (E.footY - (E.y0 + E.bodyH)) * len;
    ctx.strokeStyle = '#d9a441'; ctx.lineWidth = Math.max(1.5, r * 0.09 * thick); ctx.lineCap = 'round';
    for (const side of [-0.22 * spread, 0.26 * spread]) {
      const sw = E.moving ? Math.sin(E.t * E.rate + side * 20) * r * 0.12 : 0;
      ctx.beginPath(); ctx.moveTo(side * r, top); ctx.lineTo(side * r + sw, bot); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(side * r + sw - r * 0.09, bot + r * 0.02); ctx.lineTo(side * r + sw + r * 0.12, bot + r * 0.02); ctx.stroke();
    }
  };
  FEET.paw = function (ctx, E) {
    const r = E.r, n = Math.round(pv(E, 'legCount', 4)), len = pv(E, 'legLength', 1), thick = pv(E, 'legThick', 1), spread = pv(E, 'legSpread', 1);
    const top = E.y0 + E.bodyH * 0.35, bot = (E.y0 + E.bodyH) + (E.footY - (E.y0 + E.bodyH)) * len;
    ctx.strokeStyle = shade(E.col, -40); ctx.lineWidth = Math.max(2, r * 0.14 * thick); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const lx = (n === 1 ? 0 : i / (n - 1) - 0.5) * E.bodyW * 1.1 * spread;
      const sw = E.moving ? Math.sin(E.t * E.rate + i * Math.PI * 0.9) * r * 0.2 : 0;
      ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx + sw, bot); ctx.stroke();
    }
  };
  FEET.fin = function (ctx, E) {
    const r = E.r, swim = Math.sin(E.t * (E.moving ? 9 : 4));
    ctx.fillStyle = shade(E.col, -14);
    ctx.beginPath();
    ctx.moveTo(E.bodyW * 0.05, E.y0 + E.bodyH * 0.5);
    ctx.quadraticCurveTo(swim * r * 0.1, E.y0 + E.bodyH * 1.25, -E.bodyW * 0.35, E.y0 + E.bodyH * 0.55);
    ctx.closePath(); ctx.fill();
  };

  /* ============================ EYES ============================ */
  const EYES = {};
  EYES.round = function (ctx, E) {
    if (E.limp) { eyesClosed(ctx, E); return; }
    const s = E.hr * 0.4 * pv(E, 'eyeSpread', 1), rad = Math.max(1, E.hr * 0.2 * pv(E, 'eyeSize', 1));
    ctx.fillStyle = '#1a1208';
    ctx.beginPath(); ctx.arc(E.hx - s, E.hy - s * 0.3, rad, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(E.hx + s * 0.4, E.hy - s * 0.3, rad, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffffcc';
    ctx.beginPath(); ctx.arc(E.hx - s - rad * 0.3, E.hy - s * 0.4, rad * 0.3, 0, TAU); ctx.fill();
  };
  EYES.slit = function (ctx, E) {
    if (E.limp) { eyesClosed(ctx, E); return; }
    const sp = pv(E, 'eyeSpread', 1), sz = pv(E, 'eyeSize', 1);
    ctx.fillStyle = '#f2d84a';
    ctx.strokeStyle = '#1a1208'; ctx.lineWidth = Math.max(1, E.hr * 0.08);
    for (const dx of [-E.hr * 0.4 * sp, E.hr * 0.4 * sp]) {
      ctx.beginPath(); ctx.ellipse(E.hx + dx, E.hy - E.hr * 0.1, E.hr * 0.22 * sz, E.hr * 0.3 * sz, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(E.hx + dx, E.hy - E.hr * 0.35 * sz); ctx.lineTo(E.hx + dx, E.hy + E.hr * 0.15 * sz); ctx.stroke();
    }
  };
  EYES.many = function (ctx, E) {
    if (E.limp) { eyesClosed(ctx, E); return; }
    const sz = pv(E, 'eyeSize', 1), sp = pv(E, 'eyeSpread', 1);
    ctx.fillStyle = '#1a1208';
    for (let i = 0; i < 4; i++) {
      const a = -0.6 + i * 0.5;
      ctx.beginPath(); ctx.arc(E.hx + Math.cos(a) * E.hr * 0.5 * sp, E.hy + Math.sin(a) * E.hr * 0.4 * sp - E.hr * 0.1, Math.max(1, E.hr * 0.13 * sz), 0, TAU); ctx.fill();
    }
  };
  function eyesClosed(ctx, E) {
    ctx.strokeStyle = '#1a1208'; ctx.lineWidth = Math.max(1, E.hr * 0.1);
    for (const dx of [-E.hr * 0.4, E.hr * 0.4]) { ctx.beginPath(); ctx.moveTo(E.hx + dx - E.hr * 0.2, E.hy); ctx.lineTo(E.hx + dx + E.hr * 0.2, E.hy); ctx.stroke(); }
  }

  /* ============================ MOUTHS ============================ */
  const MOUTH = {};
  MOUTH.beak = function (ctx, E) {
    const hr = E.hr * pv(E, 'mouthSize', 1);
    const open = E.attack ? Math.max(0, Math.sin(E.t * 12)) * hr * 0.5 : 0;
    ctx.fillStyle = '#d9a441';
    ctx.beginPath();
    ctx.moveTo(E.hx + hr * 0.5, E.hy - hr * 0.05);
    ctx.lineTo(E.hx + hr * 1.25, E.hy + hr * 0.05 - open);
    ctx.lineTo(E.hx + hr * 0.5, E.hy + hr * 0.28);
    ctx.closePath(); ctx.fill();
    if (open > 0) { ctx.fillStyle = '#7a3b1c'; ctx.beginPath(); ctx.moveTo(E.hx + hr * 0.5, E.hy + hr * 0.1); ctx.lineTo(E.hx + hr * 1.2, E.hy + hr * 0.1 + open); ctx.lineTo(E.hx + hr * 0.5, E.hy + hr * 0.28); ctx.fill(); }
  };
  MOUTH.jaw = function (ctx, E) {
    const hr = E.hr * pv(E, 'mouthSize', 1);
    const open = E.attack ? 0.5 + 0.3 * Math.sin(E.t * 14) : (E.limp ? 0 : 0.1);
    ctx.fillStyle = shade(E.col, -60);
    ctx.beginPath();
    ctx.moveTo(E.hx + hr * 0.1, E.hy + hr * 0.3);
    ctx.lineTo(E.hx + hr * (1.05 + open * 0.3), E.hy + hr * (0.1 - open));
    ctx.lineTo(E.hx + hr * (1.05 + open * 0.3), E.hy + hr * (0.5 + open));
    ctx.closePath(); ctx.fill();
    // teeth
    ctx.fillStyle = '#f0ead8';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(E.hx + hr * (0.4 + i * 0.25), E.hy + hr * 0.32); ctx.lineTo(E.hx + hr * (0.5 + i * 0.25), E.hy + hr * 0.5); ctx.lineTo(E.hx + hr * (0.6 + i * 0.25), E.hy + hr * 0.32); ctx.fill(); }
  };

  /* ============================ HORNS ============================ */
  const HORN = {};
  function oneHorn(ctx, E, cx, cy, hr, lean) {
    ctx.fillStyle = shade(E.col2 || E.col, 25);
    ctx.beginPath();
    ctx.moveTo(cx - hr * 0.28, cy);
    ctx.quadraticCurveTo(cx + lean * hr * 0.5, cy - hr * 1.6, cx + lean * hr * 0.8, cy - hr * 2.05);
    ctx.quadraticCurveTo(cx + lean * hr * 0.15, cy - hr * 1.3, cx + hr * 0.28, cy);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade(E.col2 || E.col, -22); ctx.lineWidth = Math.max(1, E.r * 0.02);
    for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx - hr * 0.18, cy - hr * 0.45 * i); ctx.lineTo(cx + lean * hr * 0.2 + hr * 0.14, cy - hr * 0.5 * i); ctx.stroke(); }
  }
  HORN.single = function (ctx, E) { const z = pv(E, 'hornSize', 1); oneHorn(ctx, E, E.hx, E.hy - E.hr * 0.7, E.hr * z, 0.5); };
  HORN.pair = function (ctx, E) { const z = pv(E, 'hornSize', 1); oneHorn(ctx, E, E.hx - E.hr * 0.35, E.hy - E.hr * 0.7, E.hr * 0.8 * z, -0.4); oneHorn(ctx, E, E.hx + E.hr * 0.35, E.hy - E.hr * 0.7, E.hr * 0.8 * z, 0.5); };
  HORN.five = function (ctx, E) { const z = pv(E, 'hornSize', 1); for (let i = 0; i < 5; i++) { const f = i / 4 - 0.5; oneHorn(ctx, E, E.hx + f * E.hr * 0.95, E.hy - E.hr * 0.55, E.hr * 0.6 * z, f * 1.6); } };

  /* ============================ RIDGE (back spikes / sail) ============================ */
  const RIDGE = {};
  RIDGE.spikes = function (ctx, E) {
    const bh = E.bodyH * (E.limp ? 0.86 : 1);
    const n = Math.round(pv(E, 'ridgeCount', 7)), hMul = pv(E, 'ridgeHeight', 1);
    ctx.fillStyle = shade(E.col2 || E.col, -8);
    for (let i = 0; i < n; i++) {
      const bx = (n === 1 ? 0 : (i / (n - 1) - 0.5) * 1.5) * E.bodyW;
      const surf = Math.sqrt(Math.max(0, 1 - (bx / E.bodyW) * (bx / E.bodyW)));
      const topY = E.y0 - bh * surf;
      const h = E.r * (0.16 + 0.18 * surf) * hMul;
      ctx.beginPath();
      ctx.moveTo(bx - E.r * 0.1, topY);
      ctx.lineTo(bx - E.r * 0.03, topY - h);   // lean slightly back
      ctx.lineTo(bx + E.r * 0.1, topY);
      ctx.closePath(); ctx.fill();
    }
  };
  RIDGE.sail = function (ctx, E) {
    const bh = E.bodyH * (E.limp ? 0.86 : 1), hM = pv(E, 'ridgeHeight', 1);
    ctx.fillStyle = shade(E.col2 || E.col, -4) + 'ee';
    ctx.beginPath();
    ctx.moveTo(-E.bodyW * 0.6, E.y0 - bh * 0.78);
    ctx.quadraticCurveTo(0, E.y0 - bh * (0.78 + 1.22 * hM), E.bodyW * 0.5, E.y0 - bh * 0.68);
    ctx.quadraticCurveTo(0, E.y0 - bh * 1.05, -E.bodyW * 0.6, E.y0 - bh * 0.78);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade(E.col2 || E.col, -26); ctx.lineWidth = Math.max(1, E.r * 0.03);
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * E.bodyW * 0.22, E.y0 - bh * 0.85); ctx.lineTo(i * E.bodyW * 0.22, E.y0 - bh * 1.55); ctx.stroke(); }
  };

  /* ============================ ASSEMBLY ============================ */
  const CATALOG = {
    body: ['oval', 'chick', 'bird', 'fish', 'serpent'],
    wings: [null, 'angel', 'bird', 'bat', 'butterfly'],
    horn: [null, 'single', 'pair', 'five'],
    ridge: [null, 'spikes', 'sail'],
    shell: [null, 'turtle'],
    tail: [null, 'pointed', 'fluff', 'fish'],
    feet: [null, 'talon', 'paw', 'fin'],
    eyes: ['round', 'slit', 'many', 'none'],
    mouth: ['none', 'beak', 'jaw'],
  };

  /* tunable numeric parameters, with a `when(parts)` gate so the UIs only show
     a slider when its part is actually selected. Both the composer and the
     admin species editor render these automatically. */
  const PARAMS = [
    { key: 'bodyW', label: 'Body width', min: 0.4, max: 1.6, step: 0.01, def: 0.9 },
    { key: 'bodyH', label: 'Body height', min: 0.3, max: 1.4, step: 0.01, def: 0.72 },
    { key: 'wingSpan', label: 'Wing span', min: 0.5, max: 2, step: 0.01, def: 1, when: p => !!p.wings },
    { key: 'ridgeCount', label: 'Ridge spikes', min: 2, max: 16, step: 1, def: 7, when: p => p.ridge === 'spikes' },
    { key: 'ridgeHeight', label: 'Ridge height', min: 0.3, max: 2.2, step: 0.05, def: 1, when: p => !!p.ridge },
    { key: 'hornSize', label: 'Horn size', min: 0.4, max: 2.5, step: 0.05, def: 1, when: p => !!p.horn },
    { key: 'tailLength', label: 'Tail length', min: 0.5, max: 2.2, step: 0.05, def: 1, when: p => !!p.tail },
    { key: 'legCount', label: 'Leg count', min: 2, max: 6, step: 1, def: 4, when: p => p.feet === 'paw' },
    { key: 'legLength', label: 'Leg length', min: 0.3, max: 1.6, step: 0.05, def: 1, when: p => p.feet === 'paw' || p.feet === 'talon' },
    { key: 'legThick', label: 'Leg thickness', min: 0.4, max: 2.4, step: 0.05, def: 1, when: p => p.feet === 'paw' || p.feet === 'talon' },
    { key: 'legSpread', label: 'Leg spread', min: 0.4, max: 1.8, step: 0.05, def: 1, when: p => p.feet === 'paw' || p.feet === 'talon' },
    { key: 'eyeSize', label: 'Eye size', min: 0.4, max: 2.2, step: 0.05, def: 1, when: p => p.eyes !== 'none' },
    { key: 'eyeSpread', label: 'Eye spread', min: 0.3, max: 2, step: 0.05, def: 1, when: p => p.eyes !== 'none' },
    { key: 'mouthSize', label: 'Mouth size', min: 0.4, max: 2.2, step: 0.05, def: 1, when: p => p.mouth && p.mouth !== 'none' },
  ];

  function draw(ctx, o, t, state) {
    const E = env(o, t, state);
    const P = E.P;
    /* back-to-front assembly */
    if (P.wings && WINGS[P.wings]) WINGS[P.wings](ctx, E);
    if (P.tail && TAIL[P.tail]) TAIL[P.tail](ctx, E);
    if (P.ridge && RIDGE[P.ridge]) RIDGE[P.ridge](ctx, E);   // behind body, spikes rise over the back
    if (P.feet && FEET[P.feet] && P.feet !== 'fin') FEET[P.feet](ctx, E);  // legs root behind the body
    (BODY[P.body] || BODY.oval)(ctx, E);           // stamps head anchor onto E
    if (P.feet === 'fin' && FEET.fin) FEET.fin(ctx, E);      // side fins sit in front
    if (P.shell && SHELL[P.shell]) SHELL[P.shell](ctx, E);
    if (P.horn && HORN[P.horn]) HORN[P.horn](ctx, E);
    if (P.mouth && P.mouth !== 'none' && MOUTH[P.mouth]) MOUTH[P.mouth](ctx, E);
    if (P.eyes !== 'none') (EYES[P.eyes] || EYES.round)(ctx, E);
  }

  window.DYA = window.DYA || {};
  DYA.parts = { draw, CATALOG, PARAMS, BODY, WINGS, HORN, RIDGE, SHELL, TAIL, FEET, EYES, MOUTH, shade };
})();
