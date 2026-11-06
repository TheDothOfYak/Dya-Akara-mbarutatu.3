/* ============================================================
   STRYX PILOT — js/sp_art.js
   Drawing a flight: the sky between the Tatu, the Tatu and Kalo
   themselves, the ports, the Eldi ship (a hollowed fire tree with
   ember seams, a fire seed in the stern, gold solar sails, and you,
   the Stryx, a flat stone grown into the pilot stump with vines
   over it), the hazards, the Waves of Memory, and the map.
   ============================================================ */
(function () {
  'use strict';
  const SP = window.SP;
  const A = SP.art = {};
  const TAU = Math.PI * 2;
  const SUN = { x: -0.75, y: -0.66 };        // Pia'don's light comes from the upper left
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  A.LOOKS = {
    velki: { sea: '#2e6aa8', deep: '#1c4478', land: ['#5a8a3e', '#8a8a4e', '#6a9a4a'], cap: '#e8eef2', air: 'rgba(120,180,255,', ring: '#9ac8ff' },
    xikia: { sea: '#3a7a9a', deep: '#24526e', land: ['#3f7a34', '#2f6a2c', '#6a7a5a'], cap: null, air: 'rgba(150,220,180,', ring: '#a8f0c0' },
    leotik: { sea: '#2a5a4a', deep: '#163a2e', land: ['#2a5a22', '#3a4a1e', '#5a2a1a'], cap: null, air: 'rgba(190,220,120,', ring: '#d0f090', lava: true },
    kalo: { sea: '#8a8a94', deep: '#5a5a66', land: ['#7a7a84', '#9a9aa4', '#6a6a74'], cap: null, air: 'rgba(220,220,255,', ring: '#e0e0ff', craters: true },
    dancer: { sea: '#a090b8', deep: '#6a5a88', land: ['#b8a8d0', '#8a7aa8', '#c8b8e0'], cap: null, air: 'rgba(230,200,255,', ring: '#f0d8ff', craters: true },
  };

  /* ---------------- particles ---------------- */
  const parts = [];
  A.parts = parts;
  function puff(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.ang != null ? o.ang : 0) + (o.ang != null ? (Math.random() - 0.5) * (o.spread || 0.6) : Math.random() * TAU);
      const sp = (o.sp || 120) * (0.4 + Math.random() * 0.8);
      parts.push({ x, y, vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0), life: o.life || 0.6, age: 0, r: o.r || 3, col: o.col || '#fff', kind: o.kind || 'dot' });
    }
  }
  A.event = function (e, f) {
    const s = f.ship;
    switch (e.t) {
      case 'hit': puff(e.x, e.y, 10 + Math.min(20, e.n), { col: '#ffcf8a', sp: 220, r: 2.5, life: 0.5, kind: 'spark' }); A.shake = Math.min(18, (A.shake || 0) + 3 + e.n * 0.5); break;
      case 'pop': puff(e.x, e.y, 10, { col: '#ffb040', sp: 160, r: 2.5, life: 0.5, kind: 'spark' }); break;
      case 'thwack': puff(e.x, e.y, 8, { col: '#c8f0a0', sp: 140, r: 2.5, life: 0.4, kind: 'spark' }); break;
      case 'boost': puff(s.x - Math.cos(s.ang) * 40, s.y - Math.sin(s.ang) * 40, 24, { col: '#ffd070', sp: 300, ang: s.ang + Math.PI, spread: 0.8, r: 3, life: 0.6, kind: 'spark', vx: s.vx, vy: s.vy }); break;
      case 'mcfly': puff(e.x, e.y, 16, { col: '#ff9af0', sp: 180, r: 3, life: 0.8, kind: 'spark' }); break;
      case 'bolt': A.flash = 0.25; break;
      case 'wreck': puff(e.x, e.y, 60, { col: '#ff9a40', sp: 320, r: 4, life: 1.2, kind: 'spark' }); A.shake = 26; break;
      case 'dock': case 'touch': puff(e.x, e.y, 14, { col: 'rgba(230,220,200,.8)', sp: 90, r: 5, life: 0.8 }); break;
      case 'takeoff': puff(e.x, e.y, 18, { col: 'rgba(230,220,200,.8)', sp: 120, r: 5, life: 0.8 }); break;
    }
  };
  A.stepParts = function (dt, f) {
    const s = f.ship;
    if (s.thrusting && !f.docked) {
      const bx = s.x - Math.cos(s.ang) * 44, by = s.y - Math.sin(s.ang) * 44;
      puff(bx, by, 2, { col: Math.random() < 0.5 ? '#ffb040' : '#ff7020', sp: 160, ang: s.ang + Math.PI, spread: 0.5, r: 2.5, life: 0.45, kind: 'spark', vx: s.vx * 0.6, vy: s.vy * 0.6 });
    }
    if (s.smoulder > 0 && Math.random() < 0.5) puff(s.x, s.y, 1, { col: 'rgba(90,80,70,.6)', sp: 40, r: 6, life: 1.2 });
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt;
      if (p.age > p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 1.2 * dt; p.vy *= 1 - 1.2 * dt;
    }
    if (parts.length > 800) parts.splice(0, parts.length - 800);
    if (A.shake) A.shake = Math.max(0, A.shake - dt * 40);
    if (A.flash) A.flash = Math.max(0, A.flash - dt);
  };

  /* ---------------- the camera ---------------- */
  A.cam = { x: 0, y: 0, z: 0.6 };
  A.resetCamera = function (f) { A.cam.x = f.ship.x; A.cam.y = f.ship.y; A.cam.z = 0.9; };

  /* ---------------- the sky ---------------- */
  function sky(ctx, W, H, cam, now) {
    const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
    g.addColorStop(0, '#0c1230'); g.addColorStop(0.6, '#15123a'); g.addColorStop(1, '#22143e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* Pia'don's outer cloud: a pale ring across the sky */
    ctx.save(); ctx.translate(W * 0.5, H * 0.5); ctx.rotate(-0.35);
    const rg = ctx.createLinearGradient(0, -H * 0.18, 0, H * 0.18);
    rg.addColorStop(0, 'rgba(200,190,255,0)'); rg.addColorStop(0.5, 'rgba(200,190,255,.09)'); rg.addColorStop(1, 'rgba(200,190,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(-W, -H * 0.18, W * 2, H * 0.36); ctx.restore();
    /* the star, far off */
    const sg = ctx.createRadialGradient(W * 0.08, H * 0.1, 0, W * 0.08, H * 0.1, Math.max(W, H) * 0.35);
    sg.addColorStop(0, 'rgba(255,240,200,.55)'); sg.addColorStop(0.1, 'rgba(255,220,160,.2)'); sg.addColorStop(1, 'rgba(255,200,150,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    /* stars in two layers of parallax */
    [[0.03, 90, 1.2], [0.08, 60, 1.8]].forEach(([k, n, sz], L) => {
      for (let i = 0; i < n; i++) {
        const sx = ((hash(i + L * 1000) * 3000 - cam.x * k) % 3000 + 3000) % 3000 * W / 3000;
        const sy = ((hash(i * 3 + L * 999) * 3000 - cam.y * k) % 3000 + 3000) % 3000 * H / 3000;
        const tw = 0.5 + 0.5 * Math.sin(now * (1 + hash(i)) + i);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + tw * 0.5) + ')';
        ctx.fillRect(sx, sy, sz, sz);
      }
    });
  }

  /* ---------------- a Tatu or Kalo ---------------- */
  function body(ctx, b, SX, SY, z, now, quality) {
    const L = A.LOOKS[b.look] || A.LOOKS.kalo;
    const cx = SX(b.x), cy = SY(b.y), R = b.r * z;
    /* its air */
    const ag = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R + 230 * z);
    ag.addColorStop(0, L.air + '0.35)'); ag.addColorStop(1, L.air + '0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, R + 230 * z, 0, TAU); ctx.fill();
    /* the sea */
    const sg = ctx.createRadialGradient(cx + SUN.x * R * 0.5, cy + SUN.y * R * 0.5, R * 0.1, cx, cy, R);
    sg.addColorStop(0, L.sea); sg.addColorStop(1, L.deep);
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    /* continents: blobs round the rim and over the face */
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    const spin = b.look === 'dancer' ? Math.sin(now * 0.8) * 0.4 : 0;
    const n = quality ? 26 : 12;
    for (let i = 0; i < n; i++) {
      const a = hash(b.r + i * 7.3) * TAU + spin, dd = Math.sqrt(hash(b.r * 3 + i)) * R * 0.95;
      const rr = R * (0.12 + hash(i * 11 + b.r) * 0.22);
      ctx.fillStyle = L.land[i % L.land.length];
      ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, rr, rr * (0.6 + hash(i) * 0.4), a, 0, TAU); ctx.fill();
      if (L.craters && i % 2) { ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = Math.max(1, R * 0.015); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, rr * 0.45, 0, TAU); ctx.stroke(); }
    }
    if (L.lava) for (let i = 0; i < 10; i++) {
      const a = hash(i * 5.1) * TAU, dd = hash(i * 9.7) * R * 0.9;
      ctx.fillStyle = 'rgba(255,' + (90 + Math.floor(hash(i) * 80)) + ',30,' + (0.5 + 0.4 * Math.sin(now * 2 + i)) + ')';
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, Math.max(1.5, R * 0.02), 0, TAU); ctx.fill();
    }
    /* a misted north on Velki, ice at the south */
    if (L.cap) {
      ctx.fillStyle = L.cap; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.ellipse(cx, cy - R * 0.97, R * 0.4, R * 0.12, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.98, R * 0.3, R * 0.08, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    /* clouds drifting */
    if (b.look !== 'kalo' && b.look !== 'dancer') {
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      for (let i = 0; i < 8; i++) {
        const a = hash(i * 3.3 + b.r) * TAU + now * 0.01 * (1 + hash(i)), dd = hash(i * 1.7) * R * 0.9;
        ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, R * 0.22, R * 0.06, a * 0.5, 0, TAU); ctx.fill();
      }
    }
    /* night side, away from the star */
    const ng = ctx.createLinearGradient(cx + SUN.x * R, cy + SUN.y * R, cx - SUN.x * R, cy - SUN.y * R);
    ng.addColorStop(0, 'rgba(0,0,20,0)'); ng.addColorStop(0.55, 'rgba(0,0,20,.1)'); ng.addColorStop(1, 'rgba(0,0,20,.62)');
    ctx.fillStyle = ng; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
    /* rim light */
    ctx.strokeStyle = L.ring; ctx.globalAlpha = 0.35; ctx.lineWidth = Math.max(1, 3 * z);
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.atan2(SUN.y, SUN.x) - 1.2, Math.atan2(SUN.y, SUN.x) + 1.2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* ---------------- a port on a surface ---------------- */
  function port(ctx, p, f, SX, SY, z, now, mark) {
    const pp = SP.portPos(p, f.bodies);
    const a = Math.atan2(pp.ny, pp.nx);
    ctx.save();
    ctx.translate(SX(pp.x), SY(pp.y)); ctx.rotate(a + Math.PI / 2);
    const s = z;
    /* buildings either side of the pad */
    for (let i = 0; i < 6; i++) {
      const bx = (i < 3 ? -1 : 1) * (70 + (i % 3) * 34) * s, bh = (30 + hash(i + p.ang * 10) * 50) * s, bw = 22 * s;
      ctx.fillStyle = ['#7a5a3a', '#8a6a44', '#6a4a30'][i % 3];
      ctx.fillRect(bx - bw / 2, -bh, bw, bh + 4 * s);
      ctx.fillStyle = '#a04a2a';
      ctx.beginPath(); ctx.moveTo(bx - bw / 2 - 3 * s, -bh); ctx.lineTo(bx, -bh - 14 * s); ctx.lineTo(bx + bw / 2 + 3 * s, -bh); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,140,' + (0.5 + 0.5 * Math.sin(now * 2 + i)) + ')';
      ctx.fillRect(bx - 3 * s, -bh * 0.6, 6 * s, 6 * s);
    }
    /* the pad */
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(-56 * s, -6 * s, 112 * s, 10 * s);
    ctx.fillStyle = '#d9b87a'; for (let i = -3; i <= 3; i++) ctx.fillRect(i * 16 * s - 4 * s, -6 * s, 8 * s, 3 * s);
    /* the beacon */
    ctx.fillStyle = '#3a2a1e'; ctx.fillRect(58 * s, -70 * s, 5 * s, 70 * s);
    const on = 0.5 + 0.5 * Math.sin(now * 4);
    ctx.fillStyle = mark ? 'rgba(255,215,110,' + (0.6 + on * 0.4) + ')' : 'rgba(170,220,255,.8)';
    ctx.beginPath(); ctx.arc(60 * s, -74 * s, 6 * s, 0, TAU); ctx.fill();
    if (mark) {
      ctx.strokeStyle = 'rgba(255,215,110,' + (0.7 - on * 0.5) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -10 * s, (90 + on * 40) * s, Math.PI, TAU); ctx.stroke();
    }
    ctx.restore();
    /* its name, when close enough to read */
    if (z > 0.35) {
      ctx.fillStyle = mark ? '#ffe2a0' : 'rgba(230,230,255,.85)';
      ctx.font = (mark ? 'bold ' : '') + Math.round(Math.max(11, 15 * z)) + 'px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(p.name, SX(pp.x + pp.nx * 150), SY(pp.y + pp.ny * 150));
    }
  }

  /* ---------------- the Eldi ship ---------------- */
  function ship(ctx, f, SX, SY, z, now) {
    const s = f.ship;
    ctx.save();
    ctx.translate(SX(s.x), SY(s.y)); ctx.rotate(s.ang); ctx.scale(z * 1.3, z * 1.3);
    /* the seed's flame */
    if (s.thrusting) {
      const fl = 26 + Math.random() * 18 + (s.boostT > 0 ? 30 : 0);
      const fg = ctx.createLinearGradient(-44, 0, -44 - fl, 0);
      fg.addColorStop(0, 'rgba(255,230,140,.95)'); fg.addColorStop(0.5, 'rgba(255,140,40,.7)'); fg.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-40, -10); ctx.quadraticCurveTo(-44 - fl, 0, -40, 10); ctx.closePath(); ctx.fill();
    }
    /* the sails: two curved gold sails on their masts, catching the light (wider when you brake) */
    const open = f.braking ? 1.35 : 1;
    [[4, 1], [-16, 0.78]].forEach(([mx, k]) => {
      [-1, 1].forEach(sd => {
        const reach = 40 * k * open;
        const sg = ctx.createLinearGradient(mx, 0, mx, sd * reach);
        sg.addColorStop(0, 'rgba(255,220,120,.85)'); sg.addColorStop(1, 'rgba(240,190,80,.35)');
        ctx.fillStyle = sg; ctx.strokeStyle = 'rgba(255,236,170,.95)'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(mx + 2, sd * 8);
        ctx.quadraticCurveTo(mx + 16, sd * reach * 0.6, mx + 4, sd * reach);
        ctx.quadraticCurveTo(mx - 14, sd * reach * 0.75, mx - 14, sd * 8);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        /* ribs in the sail */
        ctx.strokeStyle = 'rgba(160,110,40,.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(mx - 2, sd * 10); ctx.lineTo(mx + 2, sd * reach * 0.92); ctx.stroke();
      });
      ctx.strokeStyle = '#4a2a1a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(mx, -40 * k * open); ctx.lineTo(mx, 40 * k * open); ctx.stroke();
    });
    /* the hull: a hollowed fire tree, bark with ember seams */
    const hg = ctx.createLinearGradient(0, -14, 0, 14);
    hg.addColorStop(0, '#8a4a2e'); hg.addColorStop(0.5, '#6b2f1e'); hg.addColorStop(1, '#3e1a10');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.moveTo(-42, -12); ctx.quadraticCurveTo(10, -18, 44, -6); ctx.quadraticCurveTo(52, 0, 44, 6); ctx.quadraticCurveTo(10, 18, -42, 12); ctx.quadraticCurveTo(-48, 0, -42, -12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,' + (120 + Math.floor(60 * Math.sin(now * 3))) + ',40,.8)'; ctx.lineWidth = 1.2;
    [[-30, -6, 0, -9, 30, -5], [-34, 5, -4, 8, 26, 4], [-20, 0, 6, 1, 36, 0]].forEach(l => { ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.quadraticCurveTo(l[2], l[3], l[4], l[5]); ctx.stroke(); });
    /* the hollow, and the crew rail */
    ctx.fillStyle = '#2a120a'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 5, 0, 0, TAU); ctx.fill();
    /* the fire seed in the stern */
    const glow = 0.6 + 0.4 * Math.sin(now * 5);
    const seedHeat = s.heat / f.S.heatMax;
    ctx.fillStyle = 'rgba(255,170,60,' + (0.25 + seedHeat * 0.35 * glow) + ')';
    ctx.beginPath(); ctx.arc(-40, 0, 16, 0, TAU); ctx.fill();
    ctx.fillStyle = seedHeat > 0.05 ? '#ffb040' : '#6a4a3a';
    ctx.beginPath(); ctx.ellipse(-40, 0, 8, 6, 0, 0, TAU); ctx.fill();
    /* you: the Stryx, a flat stone grown into the pilot stump at the bow */
    ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.ellipse(30, 0, 9, 9, 0, 0, TAU); ctx.fill();          // the stump
    ctx.fillStyle = '#8a8478'; ctx.beginPath(); ctx.ellipse(32, 0, 12, 8, 0, 0, TAU); ctx.fill();          // the stone body
    ctx.fillStyle = '#a8a294'; ctx.beginPath(); ctx.ellipse(34, -2, 7, 4, 0, 0, TAU); ctx.fill();
    /* its vines over it, steering; out wide when it lashes */
    ctx.strokeStyle = '#4e7a32'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    const lashK = s.lashT > 0 ? (1 - s.lashT / 0.35) : 0;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + now * 0.5;
      let ex, ey;
      if (lashK > 0) { const R = f.S.lash * Math.sin(lashK * Math.PI); ex = 32 + Math.cos(a) * R; ey = Math.sin(a) * R; }
      else { ex = 32 + Math.cos(a) * 14 + Math.sin(now * 2 + i) * 3; ey = Math.sin(a) * 12; }
      ctx.beginPath(); ctx.moveTo(32, 0); ctx.quadraticCurveTo((32 + ex) / 2 + Math.sin(now * 3 + i) * 6, ey / 2 + Math.cos(now * 3 + i) * 6, ex, ey); ctx.stroke();
    }
    if (s.stun > 0) { ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 3; i++) { const a = now * 6 + i * 2.1; ctx.beginPath(); ctx.arc(32 + Math.cos(a) * 20, Math.sin(a) * 20 - 24, 3, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
  A.drawShipAt = function (ctx, x, y, ang, scale, now) {
    const fake = { ship: { x: 0, y: 0, ang, heat: 1, thrusting: true, boostT: 0, lashT: 0, stun: 0 }, S: { heatMax: 1, lash: 100 } };
    ship(ctx, fake, X => x + X * scale, Y => y + Y * scale, scale, now);
  };

  /* ---------------- the whole view ---------------- */
  A.draw = function (ctx, W, H, f, now, opts) {
    opts = opts || {};
    const s = f.ship, cam = A.cam;
    const P = SP.pull(f, s.x, s.y);
    const sp = Math.hypot(s.vx, s.vy);
    /* close to the ground: close in; out in the sky: pull back */
    const zBase = Math.min(W, H) / 900;
    const zT = zBase * Math.max(0.28, Math.min(1.1, 1.15 - P.alt / 1600 - sp / 1800));
    cam.z += (zT - cam.z) * 0.035;
    cam.x += (s.x + s.vx * 0.5 - cam.x) * 0.08; cam.y += (s.y + s.vy * 0.5 - cam.y) * 0.08;
    const z = cam.z;
    const shx = A.shake ? (Math.random() - 0.5) * A.shake : 0, shy = A.shake ? (Math.random() - 0.5) * A.shake : 0;
    const ox = W / 2 - cam.x * z + shx, oy = H / 2 - cam.y * z + shy;
    const SX = x => x * z + ox, SY = y => y * z + oy;
    const vis = (x, y, r) => SX(x) + r * z > -50 && SX(x) - r * z < W + 50 && SY(y) + r * z > -50 && SY(y) - r * z < H + 50;

    sky(ctx, W, H, cam, now);
    /* the Waves of Memory */
    const w = f.wave;
    if (w) {
      const cx = w.nx * w.off, cy = w.ny * w.off;
      ctx.save();
      ctx.translate(SX(cx), SY(cy)); ctx.rotate(Math.atan2(w.flow[1], w.flow[0]));
      const half = w.w / 2 * z;
      const wg = ctx.createLinearGradient(0, -half, 0, half);
      wg.addColorStop(0, 'rgba(170,110,255,0)'); wg.addColorStop(0.5, 'rgba(190,130,255,' + (f.inWave ? 0.32 : 0.22) + ')'); wg.addColorStop(1, 'rgba(170,110,255,0)');
      ctx.fillStyle = wg; ctx.fillRect(-20000 * z, -half, 40000 * z, half * 2);
      ctx.strokeStyle = 'rgba(230,200,255,.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        const along = ((hash(i) * 8000 + now * 420) % 8000 - 4000) * z, across = (hash(i * 7) - 0.5) * half * 1.6;
        ctx.beginPath(); ctx.moveTo(along, across); ctx.lineTo(along - 120 * z, across); ctx.stroke();
      }
      ctx.restore();
      /* echoes of folk who once walked here, made of light */
      f.flies.forEach((m, i) => {
        if (m.got || m.x == null || !vis(m.x, m.y, 40)) return;
        const bob = Math.sin(now * 3 + m.ph) * 6;
        const g = ctx.createRadialGradient(SX(m.x), SY(m.y + bob), 0, SX(m.x), SY(m.y + bob), 26 * z);
        g.addColorStop(0, 'rgba(255,200,250,.95)'); g.addColorStop(0.4, 'rgba(255,120,230,.5)'); g.addColorStop(1, 'rgba(255,120,230,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(SX(m.x), SY(m.y + bob), 26 * z, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff0fc'; ctx.beginPath(); ctx.ellipse(SX(m.x), SY(m.y + bob), 7 * z, 5 * z, Math.sin(now * 4 + i) * 0.5, 0, TAU); ctx.fill();
      });
    }
    /* the oath-mist */
    f.mists.forEach(m => {
      if (!vis(m.x, m.y, m.r)) return;
      const g = ctx.createRadialGradient(SX(m.x), SY(m.y), 0, SX(m.x), SY(m.y), m.r * z);
      g.addColorStop(0, 'rgba(200,225,255,.42)'); g.addColorStop(0.7, 'rgba(190,215,250,.26)'); g.addColorStop(1, 'rgba(190,215,250,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(SX(m.x), SY(m.y), m.r * z, 0, TAU); ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = hash(i) * TAU + now * 0.05 * (i % 2 ? 1 : -1), d = hash(i * 3) * m.r * 0.7;
        ctx.fillStyle = 'rgba(230,240,255,.12)'; ctx.beginPath(); ctx.ellipse(SX(m.x + Math.cos(a) * d), SY(m.y + Math.sin(a) * d), m.r * 0.35 * z, m.r * 0.12 * z, a, 0, TAU); ctx.fill();
      }
    });
    /* the Tatu and Kalo */
    f.list.forEach(b => { if (vis(b.x, b.y, b.r + 240)) body(ctx, b, SX, SY, z, now, true); });
    /* ports */
    SP.PORTS.forEach(p => {
      const pp = SP.portPos(p, f.bodies);
      if (vis(pp.x, pp.y, 200)) port(ctx, p, f, SX, SY, z, now, opts.marks && opts.marks.has(p.id));
    });
    /* storms */
    f.storms.forEach(st => {
      if (!vis(st.x, st.y, st.r)) return;
      for (let i = 0; i < 9; i++) {
        const a = hash(i + st.x) * TAU + now * 0.1, d = hash(i * 5 + st.y) * st.r * 0.75;
        ctx.fillStyle = 'rgba(40,40,70,.45)'; ctx.beginPath(); ctx.arc(SX(st.x + Math.cos(a) * d), SY(st.y + Math.sin(a) * d), st.r * 0.38 * z, 0, TAU); ctx.fill();
      }
      /* the wind's way */
      ctx.strokeStyle = 'rgba(200,210,255,.25)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const px = st.x + (hash(i * 9) - 0.5) * st.r * 1.4, py = st.y + (hash(i * 13) - 0.5) * st.r * 1.4;
        const k = ((now * 1.5 + hash(i)) % 1);
        ctx.beginPath(); ctx.moveTo(SX(px + st.wx * k), SY(py + st.wy * k)); ctx.lineTo(SX(px + st.wx * (k + 0.25)), SY(py + st.wy * (k + 0.25))); ctx.stroke();
      }
    });
    f.strikes.forEach(k => {
      if (!vis(k.x, k.y, 200)) return;
      if (k.t > 0) {
        ctx.strokeStyle = 'rgba(255,255,200,' + (Math.sin(now * 40) > 0 ? 0.7 : 0.2) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(SX(k.x), SY(k.y), 95 * z, 0, TAU); ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255,255,230,.95)'; ctx.lineWidth = 4 * z + 1;
        ctx.beginPath(); let x = k.x, y = k.y - 700; ctx.moveTo(SX(x), SY(y));
        for (let i = 0; i < 9; i++) { x += (Math.random() - 0.5) * 80; y += 700 / 9; ctx.lineTo(SX(x), SY(y)); }
        ctx.stroke();
      }
    });
    /* sky rock */
    f.rocks.forEach(k => {
      if (!vis(k.x, k.y, k.r)) return;
      ctx.save(); ctx.translate(SX(k.x), SY(k.y)); ctx.rotate(k.spin);
      ctx.fillStyle = '#6a6470'; ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rr = k.r * (0.75 + hash(k.seed * 50 + i) * 0.35) * z; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(-k.r * 0.25 * z, -k.r * 0.25 * z, k.r * 0.3 * z, 0, TAU); ctx.fill();
      ctx.restore();
    });
    /* Tyndael: flying sparks with wings */
    f.tyndael.forEach((t, i) => {
      if (!t.alive || !vis(t.x, t.y, 30)) return;
      const fl = Math.sin(now * 22 + i) * 0.6;
      const g = ctx.createRadialGradient(SX(t.x), SY(t.y), 0, SX(t.x), SY(t.y), 22 * z);
      g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(0.35, 'rgba(255,150,40,.75)'); g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(SX(t.x), SY(t.y), 22 * z, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,90,.85)';
      ctx.save(); ctx.translate(SX(t.x), SY(t.y)); ctx.rotate(Math.atan2(t.vy, t.vx));
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10 * z, -14 * z * (1 + fl)); ctx.lineTo(-4 * z, 0); ctx.lineTo(-10 * z, 14 * z * (1 + fl)); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    /* Lutut: the big terrors of the sky */
    f.lutut.forEach(l => {
      if (!vis(l.x, l.y, 200)) return;
      if (l.state === 'screech') {
        for (let k = 0; k < 3; k++) {
          const rr = ((1.1 - l.t) * 400 + k * 120) % 420;
          ctx.strokeStyle = 'rgba(255,120,120,' + (0.6 - rr / 700) + ')'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(SX(l.x), SY(l.y), rr * z, 0, TAU); ctx.stroke();
        }
      }
      const ang = Math.atan2(l.vy, l.vx), flap = l.state === 'dive' ? 0.2 : Math.sin(now * 5 + l.ph) * 0.5;
      ctx.save(); ctx.translate(SX(l.x), SY(l.y)); ctx.rotate(ang); ctx.scale(z, z);
      ctx.fillStyle = '#2a1e2a';
      ctx.beginPath(); ctx.moveTo(40, 0); ctx.quadraticCurveTo(0, -20, -40, 0); ctx.quadraticCurveTo(0, 20, 40, 0); ctx.fill();
      [-1, 1].forEach(sd => {
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(-10, sd * (60 + flap * 40), -50, sd * (90 + flap * 50)); ctx.quadraticCurveTo(-30, sd * 30, -20, sd * 6); ctx.closePath(); ctx.fill();
      });
      ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(-70, -10); ctx.lineTo(-64, 0); ctx.lineTo(-70, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = l.state === 'dive' || l.state === 'screech' ? '#ff5a4a' : '#d0a040';
      ctx.beginPath(); ctx.arc(34, -4, 3, 0, TAU); ctx.arc(34, 4, 3, 0, TAU); ctx.fill();
      ctx.restore();
    });
    /* the ship */
    ship(ctx, Object.assign({ braking: opts.braking }, f), SX, SY, z, now);
    /* the vine-lash's reach */
    if (s.lashT > 0) {
      ctx.strokeStyle = 'rgba(160,230,120,' + (s.lashT / 0.35) * 0.6 + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(SX(s.x), SY(s.y), f.S.lash * z, 0, TAU); ctx.stroke();
    }
    /* particles */
    parts.forEach(p => {
      const a = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = p.col;
      if (p.kind === 'spark') ctx.fillRect(SX(p.x) - p.r * z, SY(p.y) - p.r * z, p.r * 2 * z + 1, p.r * 2 * z + 1);
      else { ctx.beginPath(); ctx.arc(SX(p.x), SY(p.y), p.r * z * (1 + (1 - a) * 2), 0, TAU); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
    if (A.flash) { ctx.fillStyle = 'rgba(255,255,240,' + A.flash + ')'; ctx.fillRect(0, 0, W, H); }
    if (f.inMist) { ctx.fillStyle = 'rgba(200,225,255,.18)'; ctx.fillRect(0, 0, W, H); }

    /* arrows at the screen's edge, to where your jobs are going */
    (opts.targets || []).forEach(t => {
      const pp = SP.portPos(SP.port(t.port), f.bodies);
      const sx = SX(pp.x), sy = SY(pp.y);
      if (sx > 30 && sx < W - 30 && sy > 30 && sy < H - 30) return;
      const a = Math.atan2(sy - H / 2, sx - W / 2);
      const m = 44, ex = Math.max(m, Math.min(W - m, W / 2 + Math.cos(a) * W)), ey = Math.max(m + 40, Math.min(H - m, H / 2 + Math.sin(a) * H));
      const k = Math.min((W / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - m - 20) / Math.abs(Math.sin(a) || 1e-6));
      const ax = W / 2 + Math.cos(a) * k, ay = H / 2 + Math.sin(a) * k;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
      ctx.fillStyle = t.color || '#ffd36a'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-4, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
      ctx.restore();
      const dist = Math.hypot(pp.x - s.x, pp.y - s.y);
      ctx.fillStyle = t.color || '#ffd36a'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(t.label + ' · ' + Math.round(dist / 40) + ' m', ax - Math.cos(a) * 30, ay - Math.sin(a) * 22 + 4);
      void ex; void ey;
    });
    return { SX, SY, z };
  };

  /* ---------------- the little map in the corner ---------------- */
  A.minimap = function (ctx, W, H, f, marks) {
    ctx.clearRect(0, 0, W, H);
    const k = Math.min(W, H) / 22000;
    const cx = W / 2 - f.bodies.velki.x * k, cy = H / 2 - f.bodies.velki.y * k;
    ctx.fillStyle = 'rgba(10,10,30,.6)'; ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) / 2 - 1, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.stroke();
    f.list.forEach(b => {
      ctx.fillStyle = (A.LOOKS[b.look] || A.LOOKS.kalo).sea;
      ctx.beginPath(); ctx.arc(cx + b.x * k, cy + b.y * k, Math.max(2, b.r * k), 0, TAU); ctx.fill();
    });
    (marks || []).forEach(id => {
      const pp = SP.portPos(SP.port(id), f.bodies);
      ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(cx + pp.x * k, cy + pp.y * k, 3, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + f.ship.x * k, cy + f.ship.y * k, 2.5, 0, TAU); ctx.fill();
  };

  /* ---------------- the chart of the sky (the port screen) ---------------- */
  A.chart = function (ctx, W, H, day, here, marks, now) {
    const L = SP.layout(day);
    sky(ctx, W, H, { x: 0, y: 0 }, now);
    const k = Math.min(W, H) / 21500;
    const cx = W / 2, cy = H / 2;
    /* orbits */
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
    SP.BODIES.forEach(b => { if (!b.orbit) return; const c = L[b.orbit[0]]; ctx.beginPath(); ctx.arc(cx + c.x * k, cy + c.y * k, b.orbit[1] * k, 0, TAU); ctx.stroke(); });
    const BIG = b => b.r < 300 ? 3.2 : 2.2;      // drawn bigger than they are, so they read on a chart
    Object.values(L).forEach(b => body(ctx, b, x => cx + b.x * k + (x - b.x) * k * BIG(b), y => cy + b.y * k + (y - b.y) * k * BIG(b), k * BIG(b), now, false));
    Object.values(L).forEach(b => {
      ctx.fillStyle = 'rgba(230,230,255,.85)'; ctx.font = (b.r < 300 ? '11px' : '13px') + ' Georgia, serif'; ctx.textAlign = 'center';
      const below = b.r >= 300;
      ctx.fillText(b.name, cx + b.x * k, cy + b.y * k + (below ? b.r * k * BIG(b) + 15 : -b.r * k * BIG(b) - 6));
    });
    SP.PORTS.forEach(p => {
      const pp = SP.portPos(p, L);
      const bb = L[p.body], big = bb.r < 300 ? 3.2 : 2.2;
      const x = cx + (bb.x + (pp.x - bb.x) * big) * k, y = cy + (bb.y + (pp.y - bb.y) * big) * k;
      const mk = marks && marks.has(p.id);
      ctx.fillStyle = p.id === here ? '#ffffff' : mk ? '#ffd36a' : 'rgba(200,200,230,.6)';
      ctx.beginPath(); ctx.arc(x, y, p.id === here ? 5 : mk ? 4 : 2.5, 0, TAU); ctx.fill();
      if (p.id === here) { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 9 + Math.sin(now * 3) * 2, 0, TAU); ctx.stroke(); }
    });
  };
})();
