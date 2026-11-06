/* ============================================================
   PUNK RACES — js/pr_art.js
   Drawing the race: the sky and land of each track, the trees and
   their branch tips, the Punks (pumpkins with no eyes and no mouth,
   vines growing from the top round the stem) and their Eikar riders
   with their acorn hats, the vines, and the bits that fly about.
   ============================================================ */
(function () {
  'use strict';
  const PR = window.PR;
  const A = PR.art = {};
  const TAU = Math.PI * 2;

  A.THEMES = {
    farm: { sky: ['#7fb8e0', '#f4e2b4'], sun: '#fff2c0', far: '#9fb88a', mid: '#7f9e5c', ground: '#6f8f3c', grass: '#93be52', dirt: '#7a5a38', trunk: '#6e4a2a', leaf: ['#4d8a38', '#6aa84a', '#87c25a'], water: '#4f8fc8', shape: 'round', fruit: '#f0a030' },
    forest: { sky: ['#6fa6cc', '#d6e6c2'], sun: '#fff6d0', far: '#6f8f72', mid: '#557a4c', ground: '#4c6c2c', grass: '#6c9a3c', dirt: '#5a4228', trunk: '#5a3c22', leaf: ['#2f6a2c', '#468a3a', '#62a64a'], water: '#3f7fb0', shape: 'round', fruit: '#f0a030' },
    river: { sky: ['#8cc2e6', '#eef4f2'], sun: '#ffffff', far: '#8aa6a8', mid: '#4f7a62', ground: '#4f6f3a', grass: '#6f9a4a', dirt: '#5a4a38', trunk: '#4e3a26', leaf: ['#244e36', '#2f6a44', '#3f8050'], water: '#5aa0d0', shape: 'pine', fruit: '#f0a030' },
    mist: { sky: ['#9aa4ae', '#dadfe2'], sun: '#eef0f2', far: '#a8b0b6', mid: '#7f8a8a', ground: '#4f5a4a', grass: '#6a7a62', dirt: '#4a4440', trunk: '#3e3a36', leaf: ['#3e5050', '#4e6262', '#627676'], water: '#6a8a9a', shape: 'pine', fruit: '#e8b040' },
    spires: { sky: ['#5e90d4', '#f2d6aa'], sun: '#fff0c8', far: '#9a8aa0', mid: '#7a6a6a', ground: '#6a5a48', grass: '#7f8a4a', dirt: '#5a4a3a', trunk: '#5a3a26', leaf: ['#2f5e34', '#3f7a40', '#5a9450'], water: '#4a7ab0', shape: 'spire', fruit: '#f0a030' },
    ash: { sky: ['#2e2228', '#b0603a'], sun: '#ffb070', far: '#4a3434', mid: '#33282a', ground: '#2a2220', grass: '#4a3a30', dirt: '#1e1816', trunk: '#1c1614', leaf: ['#3a2a22', '#4a3428', '#5a3e2e'], water: '#ff7a2a', shape: 'dead', fruit: '#ffcc40', lava: true },
    jungle: { sky: ['#4f9686', '#d6e8a2'], sun: '#fffad0', far: '#5a8a6a', mid: '#3a7048', ground: '#3f5428', grass: '#5a7a2a', dirt: '#3a3220', trunk: '#4a3a22', leaf: ['#1f6a32', '#3a8a3a', '#5aaa3a'], water: '#4a8a6a', shape: 'round', fruit: '#ff6aa0' },
    fair: { sky: ['#86bef0', '#ffe6bc'], sun: '#fff4c8', far: '#a6b88a', mid: '#88a060', ground: '#6f8a3c', grass: '#96c058', dirt: '#7a5a38', trunk: '#6e4a2a', leaf: ['#4d8a38', '#6aa84a', '#87c25a'], water: '#4f8fc8', shape: 'round', fruit: '#f0a030', fair: true },
  };

  /* ---------------- particles ---------------- */
  const parts = [];
  A.parts = parts;
  function puff(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.ang != null ? o.ang : -Math.PI / 2) + (Math.random() - 0.5) * (o.spread || 2.5);
      const sp = (o.sp || 120) * (0.4 + Math.random() * 0.8);
      parts.push({ x, y, vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp, life: o.life || 0.6, age: 0, r: o.r || 3, col: o.col || '#fff', g: o.g == null ? 400 : o.g, kind: o.kind || 'dot' });
    }
  }
  A.event = function (e, th) {
    switch (e.t) {
      case 'land': puff(e.x, e.y, 5, { col: th.dirt, sp: 90, r: 3, life: 0.4 }); break;
      case 'thud': puff(e.x, e.y, 14, { col: th.dirt, sp: 180, r: 4, life: 0.6 }); break;
      case 'jump': puff(e.x, e.y + PR.PUNK_R, 4, { col: th.grass, sp: 80, r: 2 }); break;
      case 'splash': puff(e.x, e.y, 18, { col: th.lava ? '#ffb040' : '#cfe8ff', sp: 260, r: 3, life: 0.7 }); break;
      case 'paddle': puff(e.x, e.y, 2, { col: th.lava ? '#ffb040' : '#e0f0ff', sp: 70, r: 2, life: 0.4 }); break;
      case 'clean': puff(e.x, e.y, 10, { col: '#fff6b0', sp: 160, r: 2.5, g: 0, life: 0.5, kind: 'spark' }); break;
      case 'fruit': puff(e.x, e.y, 16, { col: th.fruit, sp: 200, r: 3, g: 0, life: 0.6, kind: 'spark' }); break;
      case 'boost': puff(e.x, e.y, 22, { col: '#ffe08a', sp: 240, r: 3, g: 0, ang: Math.PI, spread: 1.2, life: 0.6, kind: 'spark' }); break;
      case 'fall': puff(e.x, e.y, 10, { col: th.dirt, sp: 120, r: 4, life: 0.8 }); break;
      case 'thorns': puff(e.x, e.y, 2, { col: '#3a5a22', sp: 80, r: 2, life: 0.4 }); break;
      case 'venom': puff(e.x, e.y, 2, { col: '#a8e040', sp: 60, r: 3, g: -60, life: 0.8 }); break;
      case 'steam': puff(e.x, e.y, 2, { col: 'rgba(255,240,230,.7)', sp: 80, r: 8, g: -200, life: 0.9 }); break;
      case 'vine': puff(e.x, e.y, 6, { col: th.leaf[2], sp: 90, r: 2.5, g: 200, life: 0.6, kind: 'leaf' }); break;
      case 'finish': puff(e.x, e.y - 40, 30, { col: ['#ff6a5a', '#ffd84a', '#5ad0ff', '#9aff6a'][Math.floor(Math.random() * 4)], sp: 300, r: 3, g: 300, life: 1.2, kind: 'leaf' }); break;
    }
  };
  A.stepParts = function (dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt;
      if (p.age > p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 1.5 * dt;
    }
    if (parts.length > 600) parts.splice(0, parts.length - 600);
  };

  /* ---------------- the view ---------------- */
  A.camera = { x: 0, y: 0, z: 1 };
  A.resetCamera = function (u) { A.camera.x = u.x; A.camera.y = u.y; A.camera.z = 1; };

  /* deterministic little hash, for steady decoration */
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  A.draw = function (ctx, W, H, race, focus, now, opts) {
    opts = opts || {};
    const th = A.THEMES[race.track.theme] || A.THEMES.farm;
    const c = race.course, cam = A.camera;
    /* the camera leads the Punk a little, and pulls back with speed */
    const sp = Math.hypot(focus.vx, focus.vy);
    const zBase = Math.min(Math.max(W / 1500, W / 1100), H / 760) * 1.05;   // a phone held upright sees a little less ahead, bigger
    const zT = zBase * (1 - Math.min(0.22, sp / 5200));
    cam.z += (zT - cam.z) * 0.04;
    const lead = Math.max(-80, Math.min(260, focus.vx * 0.32));
    cam.x += (focus.x + lead - cam.x) * 0.12;
    const yT = Math.min(focus.y, c.surface(focus.x) - 120) - 40;
    cam.y += (yT - cam.y) * 0.08;
    const z = cam.z;
    const ox = W * 0.38 - cam.x * z, oy = H * (H > W ? 0.66 : 0.58) - cam.y * z;
    const SX = x => x * z + ox, SY = y => y * z + oy;

    /* sky */
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* sun and the far Tatu in the sky */
    ctx.fillStyle = th.sun; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(W * 0.78, H * 0.18, Math.min(W, H) * 0.06, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#e8e0ff';
    ctx.beginPath(); ctx.arc(W * 0.2, H * 0.14, Math.min(W, H) * 0.035, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    /* clouds */
    for (let i = 0; i < 6; i++) {
      const px = ((hash(i) * 2400 - cam.x * 0.08 - now * 6 * (1 + hash(i + 9))) % 2400 + 2400) % 2400 - 300;
      const py = H * (0.08 + hash(i + 3) * 0.25);
      ctx.fillStyle = th.lava ? 'rgba(60,40,40,.5)' : 'rgba(255,255,255,.55)';
      const s = 40 + hash(i + 5) * 60;
      ctx.beginPath(); ctx.ellipse(px, py, s * 1.6, s * 0.45, 0, 0, TAU); ctx.ellipse(px + s * 0.6, py - s * 0.2, s * 0.8, s * 0.4, 0, 0, TAU); ctx.fill();
    }
    /* far and middle hills, in parallax */
    const hills = (k, col, amp, base, freq) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      for (let sx = 0; sx <= W + 20; sx += 20) {
        const wx = (sx - W * 0.38) / z * k + cam.x * k;
        const y = base + Math.sin(wx * freq) * amp + Math.sin(wx * freq * 2.7 + 1.3) * amp * 0.4;
        ctx.lineTo(sx, y);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    };
    hills(0.15, th.far, H * 0.06, H * 0.5, 0.004);
    if (th.fair) drawTents(ctx, W, H, cam, z, now);
    hills(0.35, th.mid, H * 0.05, H * 0.6, 0.006);

    ctx.save();
    const x0 = cam.x - (W * 0.38) / z - 200, x1 = cam.x + (W * 0.62) / z + 200;

    /* gaps: water, lava, or a dark drop */
    c.gaps.forEach(gp => {
      if (gp.x1 < x0 || gp.x0 > x1) return;
      const surf = Math.max(c.surface(gp.x0), c.surface(gp.x1));
      if (gp.kind === 'water') {
        ctx.fillStyle = th.water;
        ctx.fillRect(SX(gp.x0), SY(surf + 30), (gp.x1 - gp.x0) * z, H);
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath();
        for (let x = gp.x0; x < gp.x1; x += 12) ctx.lineTo(SX(x), SY(surf + 30 + Math.sin(x * 0.05 + now * 3) * 3));
        ctx.stroke();
      } else {
        const gg = ctx.createLinearGradient(0, SY(surf), 0, SY(surf + 500));
        gg.addColorStop(0, th.lava ? '#3a1a10' : '#2a2420'); gg.addColorStop(1, th.lava ? '#ff6a1a' : '#0a0808');
        ctx.fillStyle = gg; ctx.fillRect(SX(gp.x0), SY(surf + 10), (gp.x1 - gp.x0) * z, H);
      }
    });

    /* trees behind the runners */
    c.trees.forEach((t, i) => { if (t.x > x0 - 300 && t.x < x1 + 300) drawTree(ctx, t, i, th, SX, SY, z, now); });
    /* hanging roots over wide gaps */
    c.anchors.forEach(a => {
      if (!a.root || a.x < x0 || a.x > x1) return;
      ctx.strokeStyle = th.trunk; ctx.lineWidth = 4 * z; ctx.beginPath(); ctx.moveTo(SX(a.x), SY(a.y - 260)); ctx.quadraticCurveTo(SX(a.x + 10), SY(a.y - 120), SX(a.x), SY(a.y)); ctx.stroke();
      ctx.fillStyle = th.leaf[1]; ctx.beginPath(); ctx.arc(SX(a.x), SY(a.y), 9 * z, 0, TAU); ctx.fill();
    });

    /* the ground */
    ctx.fillStyle = th.dirt;
    ctx.beginPath();
    let open = false;
    const STEPX = 14;
    for (let x = Math.floor(x0 / STEPX) * STEPX; x <= x1; x += STEPX) {
      const s = c.groundAt(x);
      if (s == null) { if (open) { ctx.lineTo(SX(x - STEPX), H + 10); ctx.closePath(); open = false; } continue; }
      if (!open) { ctx.moveTo(SX(x), H + 10); open = true; }
      ctx.lineTo(SX(x), SY(s));
    }
    if (open) { ctx.lineTo(SX(x1), H + 10); ctx.closePath(); }
    ctx.fill();
    /* a darker band of earth under the grass, and stones in it */
    ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 26 * z; ctx.lineJoin = 'round';
    ctx.beginPath(); let pen = false;
    for (let x = Math.floor(x0 / STEPX) * STEPX; x <= x1; x += STEPX) {
      const s = c.groundAt(x);
      if (s == null) { pen = false; continue; }
      if (!pen) { ctx.moveTo(SX(x), SY(s + 34)); pen = true; } else ctx.lineTo(SX(x), SY(s + 34));
    }
    ctx.stroke();
    for (let x = Math.floor(x0 / 37) * 37; x <= x1; x += 37) {
      const s = c.groundAt(x); if (s == null) continue;
      const h1 = hash(x * 0.37), h2 = hash(x * 0.71);
      ctx.fillStyle = h1 > 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.16)';
      ctx.beginPath(); ctx.ellipse(SX(x + h2 * 20), SY(s + 50 + h1 * 120), (4 + h2 * 6) * z, (3 + h1 * 3) * z, 0, 0, TAU); ctx.fill();
    }
    /* the grass edge, and hazard patches */
    ctx.lineWidth = 7 * z; ctx.lineCap = 'round';
    for (let x = Math.floor(x0 / STEPX) * STEPX; x <= x1; x += STEPX) {
      const s = c.groundAt(x), s2 = c.groundAt(x + STEPX);
      if (s == null || s2 == null) continue;
      const zn = c.zoneAt(x + 7);
      ctx.strokeStyle = zn ? (zn.kind === 'venom' ? '#8a3aa8' : zn.kind === 'vent' ? '#5a4a44' : '#3a4a1e') : th.grass;
      ctx.beginPath(); ctx.moveTo(SX(x), SY(s)); ctx.lineTo(SX(x + STEPX), SY(s2)); ctx.stroke();
      if (!zn && hash(x) > 0.55) {
        /* tufts */
        ctx.lineWidth = 2 * z; ctx.beginPath();
        for (let k = -1; k <= 1; k++) { ctx.moveTo(SX(x + 4), SY(s)); ctx.lineTo(SX(x + 4 + k * 5), SY(s - 9 - hash(x + k) * 7)); }
        ctx.stroke(); ctx.lineWidth = 7 * z;
      }
    }
    c.zones.forEach(zn => {
      if (zn.x1 < x0 || zn.x0 > x1) return;
      for (let x = zn.x0 + 8; x < zn.x1; x += 18) {
        const s = c.surface(x), h = hash(x);
        if (zn.kind === 'thorns') {
          ctx.strokeStyle = '#2e3e16'; ctx.lineWidth = 2.5 * z; ctx.beginPath();
          ctx.moveTo(SX(x), SY(s)); ctx.quadraticCurveTo(SX(x + 10), SY(s - 30 - h * 20), SX(x + 18), SY(s - 12)); ctx.stroke();
          ctx.fillStyle = '#c8d8a0'; ctx.beginPath(); ctx.arc(SX(x + 9), SY(s - 22 - h * 10), 2 * z, 0, TAU); ctx.fill();
        } else if (zn.kind === 'venom') {
          ctx.fillStyle = 'rgba(150,60,180,.7)'; ctx.beginPath(); ctx.ellipse(SX(x), SY(s + 2), 14 * z, 5 * z, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(190,240,80,.8)'; ctx.beginPath(); ctx.arc(SX(x + 4), SY(s - 4 - ((now * 20 + h * 30) % 30)), 2.5 * z, 0, TAU); ctx.fill();
        }
      }
    });
    /* geysers */
    c.geysers.forEach(gz => {
      if (gz.x < x0 || gz.x > x1) return;
      const s = c.surface(gz.x), on = PR.geyserOn(gz, race.t);
      ctx.fillStyle = '#3a2a24'; ctx.beginPath(); ctx.ellipse(SX(gz.x), SY(s), 30 * z, 9 * z, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = on ? '#ff9a4a' : '#7a3a2a'; ctx.beginPath(); ctx.ellipse(SX(gz.x), SY(s), 14 * z, 4 * z, 0, 0, TAU); ctx.fill();
      if (on) {
        for (let k = 0; k < 8; k++) {
          const yy = s - ((now * 600 + k * 90) % 700);
          ctx.fillStyle = 'rgba(255,240,225,' + (0.5 * (1 - (s - yy) / 700)) + ')';
          ctx.beginPath(); ctx.arc(SX(gz.x + Math.sin(k * 3 + now * 4) * 14), SY(yy), (18 + (s - yy) * 0.06) * z, 0, TAU); ctx.fill();
        }
      } else if (Math.sin(now * 20) > 0.6) {
        ctx.fillStyle = 'rgba(255,240,225,.25)'; ctx.beginPath(); ctx.arc(SX(gz.x), SY(s - 20), 10 * z, 0, TAU); ctx.fill();
      }
    });

    /* the start and finish lines */
    const flag = (x, label, col) => {
      const s = c.surface(x);
      ctx.fillStyle = '#5a4026'; ctx.fillRect(SX(x - 3), SY(s - 260), 6 * z, 260 * z);
      ctx.fillRect(SX(x + 157), SY(s - 260), 6 * z, 260 * z);
      for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#fff' : col; ctx.fillRect(SX(x + k * 20), SY(s - 262), 20 * z, 26 * z); }
      ctx.fillStyle = '#2a1a10'; ctx.font = 'bold ' + Math.round(18 * z) + 'px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(label, SX(x + 80), SY(s - 270));
    };
    if (c.startX + 300 > x0) flag(c.startX + 40, 'START', '#3a7a3a');
    if (c.finish > x0 - 200 && c.finish < x1 + 200) flag(c.finish, 'FINISH', '#c83a2a');

    /* Ju fruit */
    c.fruit.forEach(f => {
      if (f.x < x0 || f.x > x1 || focus.fruit[f.id]) return;
      const bob = Math.sin(now * 3 + f.id) * 4;
      ctx.fillStyle = 'rgba(255,240,160,.35)'; ctx.beginPath(); ctx.arc(SX(f.x), SY(f.y + bob), 20 * z, 0, TAU); ctx.fill();
      ctx.fillStyle = th.fruit; ctx.beginPath(); ctx.arc(SX(f.x), SY(f.y + bob), 10 * z, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a6a2a'; ctx.fillRect(SX(f.x - 1), SY(f.y + bob - 16), 2 * z, 7 * z);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(SX(f.x - 3), SY(f.y + bob - 3), 3 * z, 0, TAU); ctx.fill();
    });

    /* a ghost of your best run (time trials) */
    if (opts.ghost && race.t > 0) {
      const i = Math.min(opts.ghost.length / 2 - 1, Math.floor(race.t * 20)) * 2;
      if (i >= 0) {
        ctx.globalAlpha = 0.35;
        drawPunk(ctx, { x: opts.ghost[i], y: opts.ghost[i + 1], vx: 300, vy: 0, mode: 'air', coat: 'pale', hat: '#ffffff', spin: race.t * 6, anchor: null, boostT: 0 }, SX, SY, z, now, th);
        ctx.globalAlpha = 1;
      }
    }

    /* where your vine would go */
    if (opts.aim && focus.mode !== 'swing' && !focus.finished) {
      const a = PR.pickAnchor(c, focus);
      if (a) {
        const pulse = 0.6 + Math.sin(now * 8) * 0.4;
        ctx.strokeStyle = 'rgba(255,250,180,' + (0.5 + pulse * 0.4) + ')'; ctx.lineWidth = 2 * z;
        ctx.beginPath(); ctx.arc(SX(a.x), SY(a.y), (12 + pulse * 4) * z, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#fffac0'; ctx.beginPath(); ctx.arc(SX(a.x), SY(a.y), 4 * z, 0, TAU); ctx.fill();
      }
    }

    /* the runners (the one you follow drawn last, on top) */
    race.runners.slice().sort((a, b) => (a === focus) - (b === focus)).forEach(u => drawPunk(ctx, u, SX, SY, z, now, th, u === focus));

    /* particles */
    parts.forEach(p => {
      const a = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = p.col;
      if (p.kind === 'spark') { ctx.fillRect(SX(p.x) - p.r * z, SY(p.y) - p.r * z, p.r * 2 * z, p.r * 2 * z); }
      else if (p.kind === 'leaf') { ctx.beginPath(); ctx.ellipse(SX(p.x), SY(p.y), p.r * 1.8 * z, p.r * z, p.age * 6, 0, TAU); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(SX(p.x), SY(p.y), p.r * z * (1 + (1 - a)), 0, TAU); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    /* Velki's mist closes in */
    if (c.fog) {
      const fg = ctx.createLinearGradient(W * 0.45, 0, W, 0);
      fg.addColorStop(0, 'rgba(220,225,230,0)'); fg.addColorStop(0.55, 'rgba(220,225,230,.78)'); fg.addColorStop(1, 'rgba(220,225,230,.96)');
      ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
    }
    if (th.lava) { ctx.fillStyle = 'rgba(255,120,40,.06)'; ctx.fillRect(0, 0, W, H); }
    return { SX, SY, z };
  };

  function drawTents(ctx, W, H, cam, z, now) {
    for (let i = -2; i < 12; i++) {
      const wx = i * 600 + Math.floor(cam.x * 0.25 / 600) * 600;
      const sx = (wx - cam.x * 0.25) * z * 0.6 + W * 0.38;
      if (sx < -200 || sx > W + 200) continue;
      const base = H * 0.57, hgt = 70 + hash(wx) * 40;
      const col = ['#c84a3a', '#e8c04a', '#4a7ac8', '#5aa85a'][Math.floor(hash(wx + 1) * 4)];
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(sx - 60, base); ctx.lineTo(sx, base - hgt); ctx.lineTo(sx + 60, base); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.moveTo(sx - 20, base); ctx.lineTo(sx, base - hgt); ctx.lineTo(sx + 20, base); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, base - hgt); ctx.lineTo(sx, base - hgt - 20); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sx, base - hgt - 20); ctx.lineTo(sx + 14 + Math.sin(now * 4 + i) * 3, base - hgt - 15); ctx.lineTo(sx, base - hgt - 10); ctx.fill();
    }
  }

  function drawTree(ctx, t, i, th, SX, SY, z, now) {
    const sway = Math.sin(now * 0.8 + i) * 3;
    const topX = t.x + t.lean + sway;
    /* trunk */
    ctx.fillStyle = th.trunk;
    const w = (18 + t.H * 0.03) * z;
    ctx.beginPath();
    ctx.moveTo(SX(t.x) - w, SY(t.base + 6));
    ctx.quadraticCurveTo(SX(t.x + t.lean * 0.3) - w * 0.7, SY((t.base + t.top) / 2), SX(topX) - w * 0.35, SY(t.top + 40));
    ctx.lineTo(SX(topX) + w * 0.35, SY(t.top + 40));
    ctx.quadraticCurveTo(SX(t.x + t.lean * 0.3) + w * 0.7, SY((t.base + t.top) / 2), SX(t.x) + w, SY(t.base + 6));
    ctx.closePath(); ctx.fill();
    /* roots */
    ctx.beginPath(); ctx.ellipse(SX(t.x), SY(t.base + 4), w * 1.8, 6 * z, 0, 0, TAU); ctx.fill();
    /* bark lines */
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.5 * z;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(SX(t.x + (k - 1) * 6), SY(t.base)); ctx.quadraticCurveTo(SX(t.x + t.lean * 0.3 + (k - 1) * 4), SY((t.base + t.top) / 2), SX(topX + (k - 1) * 2), SY(t.top + 60)); ctx.stroke(); }

    /* branches out to each tip */
    const tips = PR._tipsOf ? PR._tipsOf(i) : null;
    ctx.strokeStyle = th.trunk; ctx.lineCap = 'round';
    (tips || []).forEach(a => {
      ctx.lineWidth = 6 * z;
      ctx.beginPath(); ctx.moveTo(SX(topX), SY(t.top + 70)); ctx.quadraticCurveTo(SX((topX + a.x) / 2), SY(a.y - 20), SX(a.x + sway * 0.5), SY(a.y)); ctx.stroke();
    });

    /* the crown */
    const L = th.leaf;
    if (th.shape === 'pine') {
      for (let k = 0; k < 5; k++) {
        const yy = t.top + k * 48, ww = (34 + k * 22) * z;
        ctx.fillStyle = L[k % 3];
        ctx.beginPath(); ctx.moveTo(SX(topX) - ww, SY(yy + 70)); ctx.lineTo(SX(topX), SY(yy - 20)); ctx.lineTo(SX(topX) + ww, SY(yy + 70)); ctx.closePath(); ctx.fill();
      }
    } else if (th.shape === 'dead') {
      ctx.strokeStyle = th.trunk; ctx.lineWidth = 3 * z;
      for (let k = 0; k < 6; k++) {
        const ang = -Math.PI / 2 + (hash(i * 10 + k) - 0.5) * 2.4, len = 40 + hash(i * 7 + k) * 60;
        const bx = topX, by = t.top + 40 + k * 10;
        ctx.beginPath(); ctx.moveTo(SX(bx), SY(by)); ctx.lineTo(SX(bx + Math.cos(ang) * len), SY(by + Math.sin(ang) * len)); ctx.stroke();
      }
      ctx.fillStyle = '#ff8a3a';
      for (let k = 0; k < 3; k++) { const ex = topX + (hash(i + k) - 0.5) * 60, ey = t.top + 50 + hash(i * 3 + k) * 80; ctx.globalAlpha = 0.5 + Math.sin(now * 5 + k + i) * 0.4; ctx.fillRect(SX(ex), SY(ey), 3 * z, 3 * z); }
      ctx.globalAlpha = 1;
    } else {
      const big = th.shape === 'spire' ? 1.25 : 1;
      for (let k = 0; k < 7; k++) {
        const hx = topX + (hash(i * 13 + k) - 0.5) * 140 * big, hy = t.top + 20 + hash(i * 17 + k) * 70;
        const rr = (40 + hash(i * 19 + k) * 34) * big * z;
        ctx.fillStyle = L[k % 3];
        ctx.beginPath(); ctx.arc(SX(hx), SY(hy), rr, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,220,.12)';
      ctx.beginPath(); ctx.arc(SX(topX - 20), SY(t.top + 10), 44 * big * z, 0, TAU); ctx.fill();
    }
    /* leaf clusters at the branch tips (what a vine catches) */
    (tips || []).forEach(a => {
      ctx.fillStyle = th.shape === 'dead' ? '#4a3428' : L[1];
      ctx.beginPath(); ctx.arc(SX(a.x + sway * 0.5), SY(a.y), 13 * z, 0, TAU); ctx.fill();
      ctx.fillStyle = th.shape === 'dead' ? '#5a3e2e' : L[2];
      ctx.beginPath(); ctx.arc(SX(a.x + sway * 0.5 - 4), SY(a.y - 4), 7 * z, 0, TAU); ctx.fill();
    });
  }

  /* index anchors by tree once per course, for drawing branches */
  A.indexCourse = function (course) {
    const by = {};
    course.anchors.forEach(a => { if (a.tree >= 0) (by[a.tree] = by[a.tree] || []).push(a); });
    PR._tipsOf = i => by[i];
  };

  /* ---------------- a Punk and its rider ---------------- */
  function drawPunk(ctx, u, SX, SY, z, now, th, focus) {
    const coat = PR.COATS[u.coat] || PR.COATS.orange;
    const BIG = 1.35;                       // drawn a little bigger than it collides
    const R = PR.PUNK_R * z * BIG;
    const cx = SX(u.x), cy = SY(u.y) - (BIG - 1) * PR.PUNK_R * z;
    const run = u.mode === 'ground', swing = u.mode === 'swing', swim = u.mode === 'swim';
    const tilt = Math.max(-0.5, Math.min(0.5, (u.vy || 0) / 1600)) + (swing ? 0 : 0);
    const bounce = run ? Math.abs(Math.sin(u.spin * 3)) * 4 * z : 0;

    /* shadow */
    if (!swim) {
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath(); ctx.ellipse(cx, cy + R + 2 * z, R * 1.1, R * 0.22, 0, 0, TAU); ctx.fill();
    }
    /* boost trail */
    if (u.boostT > 0) {
      ctx.fillStyle = 'rgba(255,220,120,.35)';
      ctx.beginPath(); ctx.ellipse(cx - R * 1.6, cy, R * 2.2, R * 0.6, tilt, 0, TAU); ctx.fill();
    }
    const topX = cx, topY = cy - R * 0.9 - bounce;

    /* vine-legs: 6 of them, from the top round the stem, draping down */
    ctx.strokeStyle = coat.vine; ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      const side = k < 3 ? -1 : 1, j = k % 3;
      const ph = u.spin * 3 + k * 1.1;
      let fx, fy;
      if (run) { fx = cx + Math.sin(ph) * R * 1.1 + (j - 1) * R * 0.4; fy = cy + R + Math.min(0, Math.cos(ph)) * R * 0.4; }
      else if (swim) { fx = cx + Math.sin(now * 6 + k) * R * 0.9; fy = cy + R * 0.9; }
      else if (swing) { fx = cx + side * R * (0.6 + j * 0.25) - u.vx * 0.02 * z; fy = cy + R * (1.1 + j * 0.15); }
      else { fx = cx - (u.vx || 0) * 0.04 * z + side * R * 0.5 * (j + 1) * 0.6; fy = cy + R * (0.8 + j * 0.2) - (u.vy || 0) * 0.02 * z; }
      ctx.lineWidth = (4 - j * 0.6) * z;
      ctx.beginPath();
      ctx.moveTo(topX + side * R * 0.15, topY + R * 0.15);
      ctx.quadraticCurveTo(cx + side * R * 1.35, cy - R * 0.2, fx, fy);
      ctx.stroke();
      /* curled tip */
      ctx.beginPath(); ctx.arc(fx + side * 2 * z, fy, 2.5 * z, 0, TAU * 0.75); ctx.stroke();
    }
    /* the swinging vine to its anchor */
    if (swing && u.anchor) {
      const ax = SX(u.anchor.x), ay = SY(u.anchor.y);
      const sag = Math.max(0, u.len * z - Math.hypot(ax - topX, ay - topY)) * 0.5;
      ctx.lineWidth = 5 * z; ctx.strokeStyle = coat.vine;
      ctx.beginPath(); ctx.moveTo(topX, topY); ctx.quadraticCurveTo((ax + topX) / 2 + sag * 0.3, (ay + topY) / 2 + sag, ax, ay); ctx.stroke();
      ctx.lineWidth = 1.5 * z; ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.moveTo(topX, topY); ctx.quadraticCurveTo((ax + topX) / 2 + sag * 0.3, (ay + topY) / 2 + sag, ax, ay); ctx.stroke();
      /* a leaf where it holds */
      ctx.fillStyle = coat.vine; ctx.beginPath(); ctx.ellipse(ax + 5 * z, ay - 3 * z, 6 * z, 3 * z, -0.5, 0, TAU); ctx.fill();
    }

    /* the pumpkin body: ribs side by side, no eyes, no mouth */
    ctx.save();
    ctx.translate(cx, cy - bounce);
    ctx.rotate(tilt + (swing ? Math.atan2(u.x - u.anchor.x, u.anchor.y - u.y) * -0.25 : 0));
    const ribs = [-0.62, -0.3, 0, 0.3, 0.62];
    ribs.forEach((o, k) => {
      const gr = ctx.createRadialGradient(o * R - R * 0.2, -R * 0.4, R * 0.1, o * R, 0, R * 0.9);
      gr.addColorStop(0, lighten(coat.rind, 0.25)); gr.addColorStop(1, k === 2 ? coat.rind : coat.rib);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(o * R, 0, R * (k === 2 ? 0.5 : 0.42), R * 0.86, 0, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = coat.rind;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.46, R * 0.88, 0, 0, TAU); ctx.fill();
    if (u.coat === 'striped') { ctx.strokeStyle = coat.rib; ctx.lineWidth = 3 * z; [-0.6, 0, 0.6].forEach(o => { ctx.beginPath(); ctx.moveTo(o * R, -R * 0.8); ctx.quadraticCurveTo(o * R * 1.2, 0, o * R, R * 0.8); ctx.stroke(); }); }
    if (u.coat === 'ember') { ctx.strokeStyle = 'rgba(255,200,80,' + (0.5 + Math.sin(now * 6) * 0.3) + ')'; ctx.lineWidth = 1.5 * z; ctx.beginPath(); ctx.moveTo(-R * 0.4, -R * 0.3); ctx.lineTo(-R * 0.1, R * 0.1); ctx.lineTo(R * 0.3, -R * 0.1); ctx.stroke(); }
    /* the stem (the saddle's pommel) */
    ctx.fillStyle = coat.stem;
    ctx.beginPath(); ctx.moveTo(-R * 0.12, -R * 0.82); ctx.quadraticCurveTo(-R * 0.05, -R * 1.25, R * 0.2, -R * 1.3); ctx.lineTo(R * 0.24, -R * 1.18); ctx.quadraticCurveTo(R * 0.08, -R * 1.1, R * 0.12, -R * 0.82); ctx.closePath(); ctx.fill();
    /* saddle blanket */
    ctx.fillStyle = u.hat || '#6a5a2a';
    ctx.beginPath(); ctx.ellipse(-R * 0.15, -R * 0.78, R * 0.55, R * 0.16, -0.1, 0, TAU); ctx.fill();

    /* the rider: a little Eikar, leaning into it, with an acorn hat */
    const lean = Math.max(-0.4, Math.min(0.6, (u.vx || 0) / 1500));
    ctx.translate(-R * 0.25, -R * 0.95);
    ctx.rotate(lean);
    ctx.fillStyle = '#8a6a44';           // acorn-textured skin
    ctx.beginPath(); ctx.ellipse(0, -R * 0.35, R * 0.2, R * 0.32, 0, 0, TAU); ctx.fill();      // body
    ctx.fillStyle = '#9a7a50';
    ctx.beginPath(); ctx.arc(R * 0.05, -R * 0.78, R * 0.2, 0, TAU); ctx.fill();               // head
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath(); ctx.arc(R * 0.14, -R * 0.8, R * 0.035, 0, TAU); ctx.fill();              // eye
    ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 1 * z;
    ctx.beginPath(); ctx.moveTo(R * 0.09, -R * 0.72); ctx.lineTo(R * 0.17, -R * 0.72); ctx.stroke();  // the marking under the eye
    /* the Aagac (acorn cap), part of who they are */
    ctx.fillStyle = u.hat || '#6a5a2a';
    ctx.beginPath(); ctx.ellipse(R * 0.03, -R * 0.92, R * 0.27, R * 0.17, 0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1 * z;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(R * (0.03 + k * 0.09), -R * 0.92); ctx.lineTo(R * (0.03 + k * 0.06), -R * 1.06); ctx.stroke(); }
    ctx.fillStyle = u.hat || '#6a5a2a'; ctx.fillRect(R * 0.01, -R * 1.17, R * 0.05, R * 0.1);
    /* arms: reins to the stem */
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 2.5 * z;
    ctx.beginPath(); ctx.moveTo(R * 0.05, -R * 0.45); ctx.lineTo(R * 0.35, -R * 0.2); ctx.stroke();
    ctx.restore();

    /* the name over the Punk you are following, or a rival's, small */
    if (!focus && u.rider) {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.font = Math.round(11 * Math.max(0.8, z)) + 'px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(u.rider, cx, cy - R * 2.6);
    }
  }
  A.drawPunk = drawPunk;

  function lighten(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) + 255 * k), g = Math.min(255, ((n >> 8) & 255) + 255 * k), b = Math.min(255, (n & 255) + 255 * k);
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  A.lighten = lighten;

  /* a still portrait of a Punk, for the stable */
  A.portrait = function (canvas, punk, hat) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const th = A.THEMES.farm;
    const z = H / 110;
    drawPunk(ctx, { x: 0, y: 0, vx: 0, vy: 0, mode: 'ground', coat: punk.coat, hat: hat || '#6a5a2a', spin: 0.3, boostT: 0 }, x => W / 2 + x * z, y => H * 0.62 + y * z, z, 0, th, true);
  };
})();
