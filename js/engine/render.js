/* ============================================================
   DYA'AKARA — engine/render.js
   Canvas renderer for matches: terrain sets, creatures (via the
   placeholder rigs), shader treatments from the design doc
   (magical shimmer, bioluminescence, tether fade, element-colored
   resource orbs), effects, structures, and the circular minimap.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, SPR = DYA.sprites, SP = DYA.species;
  const TAU = Math.PI * 2;

  function Renderer(canvas, match) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.match = match;
    this.t = 0;
    this.scale = 1; this.ox = 0; this.oy = 0;
  }

  Renderer.prototype.resize = function () {
    const c = this.canvas, M = this.match;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; }
    this.dpr = dpr;
    this.scale = Math.min(w / M.world.w, h / M.world.h);
    this.ox = (w - M.world.w * this.scale) / 2;
    this.oy = (h - M.world.h * this.scale) / 2;
  };

  Renderer.prototype.toWorld = function (px, py) {
    return { x: (px - this.ox) / this.scale, y: (py - this.oy) / this.scale };
  };
  Renderer.prototype.toScreen = function (wx, wy) {
    return { x: wx * this.scale + this.ox, y: wy * this.scale + this.oy };
  };

  function settings() {
    const me = DYA.state && DYA.state.me;
    return (me && me.settings.display) || { quality: 'high', particles: true, bioluminescence: true, holographic: true, colorblind: false };
  }

  /* Sunear'Zikhron — the memory storm passes deterministically */
  function zikhronActive(M) { return Math.floor(M.time / 60) % 5 === 4; }

  Renderer.prototype.draw = function (dt) {
    const R = this, M = R.match, ctx = R.ctx;
    R.t += dt;
    R.resize();
    const dpr = R.dpr;
    ctx.save();
    ctx.scale(dpr, dpr);
    const cw = R.canvas.clientWidth, ch = R.canvas.clientHeight;
    const dset = settings();
    const zik = zikhronActive(M);

    /* ------- background / arena surround ------- */
    ctx.fillStyle = '#14110c';
    ctx.fillRect(0, 0, cw, ch);

    ctx.translate(R.ox, R.oy);
    ctx.scale(R.scale, R.scale);

    /* ------- terrain ground ------- */
    const T = M.terrain;
    const g = ctx.createLinearGradient(0, 0, 0, M.world.h);
    g.addColorStop(0, SPR.shade(T.ground, 10));
    g.addColorStop(1, SPR.shade(T.ground, -14));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, M.world.w, M.world.h);
    /* ground mottling */
    const grng = new U.Rng(M.seed ^ 0x51);
    ctx.fillStyle = T.accent + '33';
    for (let i = 0; i < 60; i++) {
      const x = grng.next() * M.world.w, y = grng.next() * M.world.h, r = 14 + grng.next() * 60;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, TAU); ctx.fill();
    }
    const zf = M.zikFrac ? M.zikFrac() : (zik ? 1 : 0);
    if (zf > 0) { /* the Sunear'Zikhron: memory-wave ribbons, glyph motes, cyan wash */
      ctx.fillStyle = 'rgba(104,224,232,' + (0.06 * zf) + ')';
      ctx.fillRect(0, 0, M.world.w, M.world.h);
      /* three drifting wave ribbons sweeping the arena */
      for (let w2 = 0; w2 < 3; w2++) {
        ctx.strokeStyle = 'rgba(104,224,232,' + (0.16 * zf * (1 - w2 * 0.25)) + ')';
        ctx.lineWidth = 10 - w2 * 3;
        ctx.beginPath();
        const baseY = ((R.t * (34 + w2 * 16) + w2 * 340) % (M.world.h + 260)) - 130;
        for (let x = 0; x <= M.world.w; x += 26) {
          const y = baseY + Math.sin(x * 0.008 + R.t * (1.1 + w2 * 0.4)) * 34;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      /* memory glyph motes riding the storm wind */
      const mrng = new DYA.util.Rng(0xF00D);
      ctx.fillStyle = 'rgba(180,240,244,' + (0.5 * zf) + ')';
      ctx.font = '11px Georgia';
      for (let i = 0; i < 34; i++) {
        const sx = mrng.next() * M.world.w, sy = mrng.next() * M.world.h, spd = 40 + mrng.next() * 70;
        const mx = (sx + R.t * spd) % M.world.w;
        const my = sy + Math.sin(R.t * 1.3 + i) * 14;
        ctx.globalAlpha = 0.35 * zf * (0.4 + 0.6 * Math.abs(Math.sin(R.t * 0.9 + i)));
        ctx.fillText(['ᛃ', 'ᛗ', 'ᛟ', '᛫', 'ᛝ'][i % 5], mx, my);
      }
      ctx.globalAlpha = 1;
    }

    /* ------- zones under everything ------- */
    for (const z of M.zones) {
      if (z.type === 'water') {
        const wg = ctx.createRadialGradient(z.x, z.y, z.r * 0.2, z.x, z.y, z.r);
        wg.addColorStop(0, '#3b9ae1aa'); wg.addColorStop(1, '#2a6f8f66');
        ctx.fillStyle = wg;
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.7, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#bfe8ff44'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const rr = z.r * (0.4 + 0.2 * i) + Math.sin(R.t * 1.5 + i) * 5;
          ctx.beginPath(); ctx.ellipse(z.x, z.y, rr, rr * 0.7, 0, 0, TAU); ctx.stroke();
        }
      } else if (z.type === 'forest') {
        ctx.fillStyle = '#3c5530cc';
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.8, 0, 0, TAU); ctx.fill();
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * TAU;
          const tx = z.x + Math.cos(a) * z.r * 0.55, ty = z.y + Math.sin(a) * z.r * 0.45;
          ctx.fillStyle = '#4a3520';
          ctx.fillRect(tx - 2.5, ty - 4, 5, 14);
          ctx.fillStyle = SPR.shade('#3c5530', 18 + (i % 3) * 10);
          ctx.beginPath(); ctx.arc(tx, ty - 14, 13 + (i % 3) * 3, 0, TAU); ctx.fill();
        }
      } else if (z.type === 'bog') {
        ctx.fillStyle = '#8fbf3f55';
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.72, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5d7a2e88';
        for (let i = 0; i < 4; i++) {
          const bx = z.x + Math.sin(i * 2.4 + R.t * 0.8) * z.r * 0.5;
          const by = z.y + Math.cos(i * 1.9 + R.t * 0.6) * z.r * 0.35;
          ctx.beginPath(); ctx.arc(bx, by, 4 + Math.sin(R.t * 3 + i) * 2, 0, TAU); ctx.fill();
        }
      } else if (z.type === 'fire') {
        const fg = ctx.createRadialGradient(z.x, z.y, 2, z.x, z.y, z.r);
        fg.addColorStop(0, '#ffd24acc'); fg.addColorStop(0.6, '#e8842c99'); fg.addColorStop(1, '#e8842c00');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
        if (dset.particles) {
          ctx.fillStyle = '#ffd24a';
          for (let i = 0; i < 4; i++) {
            const px = z.x + Math.sin(R.t * 7 + i * 2.6) * z.r * 0.5;
            const py = z.y - ((R.t * 30 + i * 20) % 30);
            ctx.globalAlpha = 0.5; ctx.fillRect(px, py, 2.5, 2.5); ctx.globalAlpha = 1;
          }
        }
      }
    }

    /* ------- terrain props ------- */
    for (const p of M.props) drawProp(ctx, p, T, R.t);

    /* ------- hoards ------- */
    M.teams.forEach((Tm, i) => {
      if (Tm.controller === 'wild') return;
      const hx = Tm.hoard.x, hy = Tm.hoard.y;
      ctx.strokeStyle = Tm.color + '88'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(hx, hy, 70, 48, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = Tm.color + '22';
      ctx.beginPath(); ctx.ellipse(hx, hy, 70, 48, 0, 0, TAU); ctx.fill();
      /* hoard chest mound */
      ctx.fillStyle = SPR.shade('#8a6f42', i === 0 ? 0 : -20);
      ctx.beginPath(); ctx.ellipse(hx, hy, 26, 16, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d9b87a';
      for (let k = 0; k < 5; k++) {
        ctx.beginPath(); ctx.arc(hx - 12 + k * 6, hy - 6 + Math.sin(k * 2.7) * 4, 3.5, 0, TAU); ctx.fill();
      }
    });

    /* ------- resource orbs ------- */
    for (const o of M.orbs) {
      const age = M.time - o.t0;
      if (age > 3) continue;
      const col = SP.ELEMENT_COLORS[o.el] || '#fff';
      const a = Math.max(0, 1 - age / 3);
      const pulse = 1 + Math.sin(age * 9) * 0.18;
      ctx.globalAlpha = a * 0.9;
      const og = ctx.createRadialGradient(o.x, o.y - age * 12, 1, o.x, o.y - age * 12, 9 * pulse);
      og.addColorStop(0, '#ffffff'); og.addColorStop(0.4, col); og.addColorStop(1, col + '00');
      ctx.fillStyle = og;
      ctx.beginPath(); ctx.arc(o.x, o.y - age * 12, 9 * pulse, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* ------- structures ------- */
    for (const s of M.structures) drawStructure(ctx, s, M, R.t);

    /* ------- makari remnants ------- */
    ctx.fillStyle = '#c2b23a99';
    for (const r of M.remnants) {
      for (let i = 0; i < 5; i++) ctx.fillRect(r.x + Math.sin(i * 2.1) * 8, r.y + Math.cos(i * 1.3) * 6, 3, 3);
    }

    /* ------- relics (one per side) ------- */
    for (const rl of (M.relics || [])) {
      if (rl.disabled || rl.captured) continue;
      const bob = rl.carrier ? 0 : Math.sin(R.t * 2) * 4;
      const rg = ctx.createRadialGradient(rl.x, rl.y - 14 + bob, 2, rl.x, rl.y - 14 + bob, 30);
      rg.addColorStop(0, '#e8d9ffcc'); rg.addColorStop(1, '#7a4ae800');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(rl.x, rl.y - 14 + bob, 30, 0, TAU); ctx.fill();
      ctx.save();
      ctx.translate(rl.x, rl.y - 14 + bob);
      ctx.rotate(Math.sin(R.t * 1.3) * 0.2);
      const ownCol = M.teams[rl.ownerTeam] ? M.teams[rl.ownerTeam].color : '#cbb8f0';
      const relg = ctx.createLinearGradient(-8, -12, 8, 12);
      relg.addColorStop(0, '#cbb8f0'); relg.addColorStop(0.5, ownCol); relg.addColorStop(1, '#5a3a95');
      ctx.fillStyle = relg;
      ctx.beginPath();
      ctx.moveTo(0, -14); ctx.lineTo(9, -4); ctx.lineTo(6, 12); ctx.lineTo(-6, 12); ctx.lineTo(-9, -4);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e8d9ff'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }

    /* ------- field morsels: Karnen food + chemist pieces ------- */
    for (const pk of (M.pickups || [])) {
      const bob = Math.sin(R.t * 2.4 + pk.id) * 2;
      if (pk.kind === 'food') {
        ctx.fillStyle = '#8a6b3a';
        ctx.beginPath(); ctx.ellipse(pk.x, pk.y + bob, 7, 5, 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#a8c46a';
        ctx.beginPath(); ctx.ellipse(pk.x + 3, pk.y - 3 + bob, 4, 3, -0.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#5d4a28'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pk.x - 4, pk.y - 2 + bob); ctx.lineTo(pk.x - 7, pk.y - 7 + bob); ctx.stroke();
      } else { /* chemist piece: a glowing swirl */
        const g2 = ctx.createRadialGradient(pk.x, pk.y + bob, 1, pk.x, pk.y + bob, 12);
        g2.addColorStop(0, '#c48ae8cc'); g2.addColorStop(1, '#c48ae800');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 12, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8d4f8';
        ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 3.4 + Math.sin(R.t * 4 + pk.id) * 0.8, 0, TAU); ctx.fill();
      }
    }

    /* ------- creatures (sorted by y for depth) ------- */
    /* a rider sits at its mount's position — nudge its sort key so it draws
       just after (on top of) the mount */
    const sorted = M.creatures.slice().sort((a, b) => (a.y + (a.riding ? 1 : 0)) - (b.y + (b.riding ? 1 : 0)));
    for (const c of sorted) {
      if (c.inHut) continue;   // sheltering inside the Builder's Hut — not on the field
      let alpha = 1;
      if (c.dead) {
        alpha = Math.max(0, 1 - (M.tick - c.deadTick) / 50);
        if (alpha <= 0) continue;
      } else if (c.tetherFrac > 0.8) {
        alpha = Math.max(0.12, 1 - (c.tetherFrac - 0.8) / 0.2); // tether fade per design doc
      }
      if (c.camoUntil > M.tick) alpha *= 0.35;
      const biolumOn = dset.bioluminescence && (
        (c.sp.features.biolum && c.speciesId !== 'rubbermcfly') ||
        c.sp.features.biolumTail ||
        (c.speciesId === 'rubbermcfly' && zik) ||
        c.sp.features.glow);
      /* a mounted rider is drawn seated on its mount's back, with a quick
         hop-up when it first climbs on. Its shot origin stays at c.x/c.y. */
      let drawY = c.y, rMul = 1.35;
      if (c.riding) {
        const seat = (c.rideR || c.radius) * 1.05;
        const p = Math.max(0, Math.min(1, (M.tick - (c.mountedAt || 0)) / 7));
        const ease = 1 - (1 - p) * (1 - p);
        drawY = c.y - seat * ease - Math.sin(p * Math.PI) * (c.rideR || c.radius) * 0.35;   // rise + a little arc
        rMul = 1.35 * 0.82;   // sit a touch smaller on the mount
      }
      ctx.save();
      ctx.translate(c.x, drawY);
      SPR.draw(ctx, {
        sp: c.sp, r: c.radius * rMul, state: c.dead ? 'death' : c.state,
        indiv: c.tok && DYA.token.physique ? DYA.token.physique(c.tok) : null,
        t: R.t, phase: c.animPhase, facing: c.facing,
        teamColor: M.mode === 'hunt' && c.team === 1 ? '#9c3a3a' : M.teams[c.team] ? M.teams[c.team].color : null,
        seal: M.teams[c.team] ? M.teams[c.team].seal : null,
        sealBadge: dset.sealBadges,
        alpha,
        shimmer: dset.holographic && !c.dead,
        biolum: biolumOn,
        heat: c.heat, swarmFrac: c.swarmFrac,
        /* the mount does NOT draw the generic acorn rider — its real rider
           (Archer, Spear, Keilia…) is drawn as its own creature, seated above */
        heads: c.headsLeft, hasRider: !!c.hasRider && !c.riderUnit,
        charged: c.mem && c.mem.charge >= 1,
        hasRelic: !!c.carryingRelic,
      });
      ctx.restore();

      /* hp bar (a mounted rider shows none — it can't be hit up there, and the
         mount already carries the pair's health bar) */
      if (!c.dead && !c.riding && c.hp < c.maxHp && !c.sp.tags.includes('inert')) {
        const bw = Math.max(22, c.radius * 2);
        const frac = Math.max(0, c.hp / c.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(c.x - bw / 2, c.y - c.radius * 1.9 - 6, bw, 4);
        ctx.fillStyle = dset.colorblind ? (frac > 0.4 ? '#3ba7e1' : '#e8d24a') : (frac > 0.55 ? '#5aba5a' : frac > 0.25 ? '#d9b23a' : '#c14953');
        ctx.fillRect(c.x - bw / 2, c.y - c.radius * 1.9 - 6, bw * frac, 4);
      }
      /* boss skull */
      if (c.isBoss && !c.dead) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px serif'; ctx.textAlign = 'center';
        ctx.fillText('☠', c.x, c.y - c.radius * 2.4);
      }
      /* relic carried marker */
      if (c.carryingRelic) {
        ctx.fillStyle = '#cbb8f0';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - c.radius * 2.2 - 8); ctx.lineTo(c.x + 5, c.y - c.radius * 2.2);
        ctx.lineTo(c.x, c.y - c.radius * 2.2 + 4); ctx.lineTo(c.x - 5, c.y - c.radius * 2.2);
        ctx.closePath(); ctx.fill();
      }
      /* stun stars */
      if (c.stunnedUntil > M.tick) {
        ctx.fillStyle = '#ffe88a';
        for (let i = 0; i < 3; i++) {
          const a = R.t * 4 + i * TAU / 3;
          ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * 14, c.y - c.radius * 2 + Math.sin(a) * 5, 2, 0, TAU); ctx.fill();
        }
      }
    }

    /* ------- projectiles ------- */
    for (const p of M.projectiles) {
      if (p.type === 'arrow' || p.type === 'hanii') {
        const a = Math.atan2(p.vy, p.vx);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
        ctx.strokeStyle = p.type === 'hanii' ? '#c9ccd4' : '#8a6f4a';
        ctx.lineWidth = p.type === 'hanii' ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(6, 0); ctx.stroke();
        ctx.fillStyle = '#c9ccd4';
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(2, -2.5); ctx.lineTo(2, 2.5); ctx.fill();
        ctx.restore();
      } else if (p.type === 'jet') {
        ctx.fillStyle = '#bfe8ffcc';
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#bfe8ff55';
        ctx.beginPath(); ctx.arc(p.x - p.vx * 0.02, p.y - p.vy * 0.02, 9, 0, TAU); ctx.fill();
      }
    }

    /* ------- effects ------- */
    for (const e of M.effects) {
      const age = M.time - e.t0;
      if (age > e.dur) continue;
      const f = age / e.dur;
      drawEffect(ctx, e, f, R.t, dset);
    }

    ctx.restore();
  };

  /* ---------------- props ---------------- */
  function drawProp(ctx, p, T, t) {
    const s = p.s;
    ctx.save();
    ctx.translate(p.x, p.y);
    const sway = Math.sin(t * 0.9 + p.seed) * 0.03;
    switch (p.kind) {
      case 'trees': {
        ctx.rotate(sway);
        ctx.fillStyle = '#4a3520';
        ctx.fillRect(-4 * s, -8 * s, 8 * s, 26 * s);
        ctx.fillStyle = SPR.shade(T.accent, -6);
        ctx.beginPath(); ctx.arc(0, -26 * s, 22 * s, 0, TAU); ctx.fill();
        ctx.fillStyle = SPR.shade(T.accent, 10);
        ctx.beginPath(); ctx.arc(-8 * s, -34 * s, 14 * s, 0, TAU); ctx.fill();
        break;
      }
      case 'firetrees': {
        ctx.rotate(sway * 2);
        ctx.fillStyle = '#3d2a20';
        ctx.fillRect(-5 * s, -6 * s, 10 * s, 30 * s);
        const fg = ctx.createRadialGradient(0, -30 * s, 2, 0, -30 * s, 24 * s);
        fg.addColorStop(0, '#ffd24a'); fg.addColorStop(0.6, '#e8842c'); fg.addColorStop(1, '#b3502c88');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(0, -30 * s, (20 + Math.sin(t * 5 + p.seed) * 2.5) * s, 0, TAU); ctx.fill();
        break;
      }
      case 'glowmoss': {
        ctx.fillStyle = '#68e0c8' + (Math.sin(t * 2 + p.seed) > 0 ? '66' : '44');
        ctx.beginPath(); ctx.ellipse(0, 0, 18 * s, 9 * s, 0, 0, TAU); ctx.fill();
        break;
      }
      case 'rocks': case 'cliffs': {
        ctx.fillStyle = SPR.shade(T.ground, -30);
        ctx.beginPath();
        ctx.moveTo(-16 * s, 8 * s); ctx.lineTo(-8 * s, -12 * s); ctx.lineTo(4 * s, -16 * s); ctx.lineTo(16 * s, -2 * s); ctx.lineTo(12 * s, 8 * s);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = SPR.shade(T.ground, -12);
        ctx.beginPath(); ctx.moveTo(-8 * s, -12 * s); ctx.lineTo(4 * s, -16 * s); ctx.lineTo(8 * s, -4 * s); ctx.lineTo(-4 * s, 0); ctx.closePath(); ctx.fill();
        break;
      }
      case 'spires': {
        ctx.fillStyle = SPR.shade(T.accent, -20);
        ctx.beginPath(); ctx.moveTo(-10 * s, 10 * s); ctx.lineTo(0, -48 * s); ctx.lineTo(10 * s, 10 * s); ctx.closePath(); ctx.fill();
        break;
      }
      case 'pillars': {
        ctx.fillStyle = SPR.shade(T.accent, 8);
        ctx.fillRect(-7 * s, -34 * s, 14 * s, 42 * s);
        ctx.fillRect(-10 * s, -40 * s, 20 * s, 7 * s);
        break;
      }
      case 'banners': {
        ctx.strokeStyle = '#4a3520'; ctx.lineWidth = 3 * s;
        ctx.beginPath(); ctx.moveTo(0, 8 * s); ctx.lineTo(0, -38 * s); ctx.stroke();
        ctx.fillStyle = ['#8a1c1c', '#31576b', '#43572f'][p.seed % 3];
        ctx.beginPath();
        ctx.moveTo(0, -38 * s);
        ctx.quadraticCurveTo(16 * s + sway * 60, -32 * s, 14 * s + sway * 80, -22 * s);
        ctx.lineTo(0, -24 * s);
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'dunes': {
        ctx.fillStyle = SPR.shade(T.ground, 12) + '99';
        ctx.beginPath(); ctx.ellipse(0, 0, 34 * s, 10 * s, 0.1, 0, TAU); ctx.fill();
        break;
      }
      case 'grass': {
        ctx.strokeStyle = SPR.shade(T.accent, 14); ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 5 * s - 10, 4);
          ctx.quadraticCurveTo(i * 5 * s - 10 + sway * 40, -6 * s, i * 5 * s - 8 + sway * 60, -12 * s);
          ctx.stroke();
        }
        break;
      }
      case 'embers': {
        ctx.fillStyle = '#ffb03a';
        for (let i = 0; i < 3; i++) {
          const ey = -((t * 14 + i * 12 + p.seed) % 36);
          ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 3 + i);
          ctx.fillRect(Math.sin(t + i * 2) * 8, ey, 2, 2);
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'water': break; // zones handle water
    }
    ctx.restore();
  }

  /* ---------------- structures ---------------- */
  function drawStructure(ctx, s, M, t) {
    ctx.save();
    ctx.translate(s.x, s.y);
    const teamCol = M.teams[s.team] ? M.teams[s.team].color : '#999';
    let barTop = -50;
    if (s.kind === 'tower' || s.kind === 'cone') {
      const cap = s.capacity || 1, occ = s.occupants ? s.occupants.length : 0;
      const bw = 12 + cap * 5, bh = 30 + cap * 6;   // bigger tower for more archers
      /* range bands: FAR (1.5×) faint, then CLOSE (2.5×), or a forward cone */
      if (s.kind === 'cone') {
        const cr = s.coneRange || s.far || 120, ch = s.coneHalf || 0.6, cd = s.coneDir || 0;
        const grd = ctx.createRadialGradient(0, 0, 6, 0, 0, cr);
        grd.addColorStop(0, teamCol + '30'); grd.addColorStop(1, teamCol + '00');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, cr, cd - ch, cd + ch); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = teamCol + '55'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, cr, cd - ch, cd + ch); ctx.closePath(); ctx.stroke();
      } else {
        ctx.strokeStyle = teamCol + '18'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, s.far || 240, 0, TAU); ctx.stroke();
        ctx.strokeStyle = teamCol + (s.upgraded ? '3a' : '28'); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, s.close || 80, 0, TAU); ctx.stroke();
      }
      /* the tower body — an upgraded tower is a distinctly different two-tier
         stone keep in pale stone with a gold trim and twin pennants */
      const up = s.upgraded;
      const lite = up ? '#9c8a63' : '#6b5b45', dark = up ? '#786641' : '#57493a';
      ctx.fillStyle = dark; ctx.fillRect(-bw / 2 - 3, -bh, bw + 6, bh + 6);
      ctx.fillStyle = lite; ctx.fillRect(-bw / 2, -bh + 4, bw, bh);
      let deckTop = -bh - 12, capW = bw + 8;
      if (up) {
        ctx.fillStyle = dark; ctx.fillRect(-bw / 2 - 6, -12, 6, 18); ctx.fillRect(bw / 2, -12, 6, 18);  // corner buttresses
        ctx.fillStyle = dark; ctx.fillRect(-bw / 2 - 6, -bh - 14, bw + 12, 16);                          // wide battlement deck
        ctx.fillStyle = lite; ctx.fillRect(-bw / 2 + 2, -bh - 27, bw - 4, 15);                            // upper tier
        deckTop = -bh - 31; capW = bw + 12;
        ctx.strokeStyle = '#d9b23a99'; ctx.lineWidth = 1.5; ctx.strokeRect(-bw / 2 - 3, -bh, bw + 6, bh + 6);
      } else {
        ctx.fillStyle = '#57493a'; ctx.fillRect(-bw / 2 - 4, -bh - 10, bw + 8, 12);
      }
      /* crenellations (chunkier when upgraded) */
      ctx.fillStyle = up ? '#5a4d38' : '#4c4033';
      for (let i = 0; i * 8 < capW; i++) ctx.fillRect(-capW / 2 + i * 8, deckTop, 4, 5);
      /* garrison pips — one per seated archer, capacity shown faint */
      for (let i = 0; i < cap; i++) {
        ctx.fillStyle = i < occ ? teamCol : '#3a3229';
        ctx.beginPath(); ctx.arc(-((cap - 1) * 5) + i * 10, deckTop - 6, 3, 0, TAU); ctx.fill();
      }
      /* pennant(s) */
      const flagY = deckTop - 12;
      ctx.fillStyle = teamCol; ctx.fillRect(bw / 2 - 1, flagY, 2, 12);
      ctx.beginPath(); ctx.moveTo(bw / 2 + 1, flagY); ctx.lineTo(bw / 2 + 11, flagY + 4); ctx.lineTo(bw / 2 + 1, flagY + 7); ctx.fill();
      if (up) { ctx.fillStyle = teamCol; ctx.fillRect(-bw / 2 - 1, flagY, 2, 12); ctx.beginPath(); ctx.moveTo(-bw / 2 - 1, flagY); ctx.lineTo(-bw / 2 - 11, flagY + 4); ctx.lineTo(-bw / 2 - 1, flagY + 7); ctx.fill(); }
      barTop = flagY - 6;
    } else if (s.kind === 'wallTower') {
      /* squat unmanned wall-tower that auto-fires (taller with a banner when upgraded) */
      const up = s.upgraded;
      ctx.strokeStyle = teamCol + '20'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, s.range || 50, 0, TAU); ctx.stroke();
      const th = up ? 34 : 26;
      ctx.fillStyle = up ? '#8a7a58' : '#5d5241'; ctx.fillRect(-9, -th, 18, th + 6);
      ctx.fillStyle = up ? '#5a4d38' : '#4c4033';
      for (let i = -1; i <= 1; i++) ctx.fillRect(i * 7 - 3, -th - 4, 5, 5);
      ctx.fillStyle = teamCol; ctx.fillRect(-1, -th + 4, 2, 10); // arrow slit marker
      if (up) { ctx.strokeStyle = '#d9b23a99'; ctx.lineWidth = 1.2; ctx.strokeRect(-9, -th, 18, th + 6); ctx.fillStyle = teamCol; ctx.fillRect(7, -th - 2, 2, 9); }
      barTop = -th - 10;
    } else if (s.isHut) {
      /* the Builder's Hut — a wooden lodge at Level 1, a stone stronghold at Level 2 */
      const lvl2 = s.level >= 2;
      if (lvl2) {
        ctx.fillStyle = '#7f7768'; ctx.fillRect(-28, -24, 56, 30);           // stone body
        ctx.fillStyle = '#5f584e'; for (let i = 0; i < 4; i++) ctx.fillRect(-28 + i * 15, -30, 10, 7); // battlements
        ctx.fillStyle = '#2c2419'; ctx.fillRect(-8, -16, 16, 22);            // doorway
        ctx.strokeStyle = '#4a443b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-28, -10); ctx.lineTo(28, -10); ctx.stroke();
        ctx.strokeStyle = '#d9b23a'; ctx.lineWidth = 1.5; ctx.strokeRect(-28, -24, 56, 30);
        // tall banner marking the level
        ctx.fillStyle = teamCol; ctx.fillRect(-1, -46, 2, 16);
        ctx.fillRect(1, -46, 12, 9);
        ctx.fillStyle = '#f4e6b8'; ctx.font = '7px sans-serif'; ctx.fillText('II', 3, -39);
        barTop = -52;
      } else {
        ctx.fillStyle = '#5a4a34'; ctx.fillRect(-24, -20, 48, 26);
        ctx.fillStyle = '#6e5a3f'; ctx.beginPath(); ctx.moveTo(-28, -20); ctx.lineTo(0, -36); ctx.lineTo(28, -20); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2c2419'; ctx.fillRect(-7, -14, 14, 20);
        ctx.fillStyle = teamCol; ctx.fillRect(-1, -38, 2, 8);
        ctx.strokeStyle = '#3a2f1d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-24, -8); ctx.lineTo(24, -8); ctx.stroke();
        barTop = -44;
      }
    } else if (s.type === 'wall') {
      /* a proper battlemented stone wall (vertical front/back, or horizontal
         side); merlons run along the enemy-facing edge, gold-trimmed at Level 2 */
      const hw = (s.w || 24) / 2, hh = (s.h || 84) / 2, up = s.upgraded, face = s.face || 1, vert = s.vertical !== false;
      const lite = up ? '#b7b0a0' : '#8a8377', dark = up ? '#7d766a' : '#5f584e';
      const g = ctx.createLinearGradient(-hw, -hh, hw, hh);
      g.addColorStop(0, dark); g.addColorStop(0.5, lite); g.addColorStop(1, dark);
      ctx.fillStyle = g; ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
      /* stone-block coursing (staggered) */
      ctx.strokeStyle = '#4a443b'; ctx.lineWidth = 1;
      if (vert) {
        const n = Math.max(3, Math.round(hh * 2 / 15));
        for (let i = 1; i < n; i++) { const y = -hh + i * (hh * 2 / n); ctx.beginPath(); ctx.moveTo(-hw, y); ctx.lineTo(hw, y); ctx.stroke(); }
        for (let i = 0; i < n; i++) { const y = -hh + i * (hh * 2 / n), x = (i % 2) ? 0 : -hw * 0.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + hh * 2 / n); ctx.stroke(); }
      } else {
        const n = Math.max(3, Math.round(hw * 2 / 15));
        for (let i = 1; i < n; i++) { const x = -hw + i * (hw * 2 / n); ctx.beginPath(); ctx.moveTo(x, -hh); ctx.lineTo(x, hh); ctx.stroke(); }
        for (let i = 0; i < n; i++) { const x = -hw + i * (hw * 2 / n), y = (i % 2) ? 0 : -hh * 0.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + hw * 2 / n, y); ctx.stroke(); }
      }
      /* battlement merlons along the enemy-facing long edge */
      ctx.fillStyle = up ? '#c9c2b2' : '#9a9387';
      if (vert) { for (let i = -2; i <= 2; i++) { const y = i * (hh * 2 / 5.5); ctx.fillRect(face > 0 ? hw - 1 : -hw - 5, y - 5, 6, 9); } }
      else { for (let i = -2; i <= 2; i++) { const x = i * (hw * 2 / 5.5); ctx.fillRect(x - 5, face > 0 ? hh - 1 : -hh - 5, 9, 6); } }
      /* team-tinted rampart line + gold trim when upgraded */
      ctx.fillStyle = teamCol;
      if (vert) ctx.fillRect(face > 0 ? hw - 2 : -hw, -hh, 2, hh * 2); else ctx.fillRect(-hw, face > 0 ? hh - 2 : -hh, hw * 2, 2);
      if (up) { ctx.strokeStyle = '#d9b23a88'; ctx.lineWidth = 1.5; ctx.strokeRect(-hw, -hh, hw * 2, hh * 2); }
      /* spikes on a trapped wall (outer edge) */
      if (s.trapped) {
        ctx.fillStyle = '#c9ccd4';
        if (vert) for (let i = -1; i <= 1; i++) { const y = i * hh * 0.55, ex = face > 0 ? hw : -hw; ctx.beginPath(); ctx.moveTo(ex, y - 3); ctx.lineTo(ex + face * 7, y); ctx.lineTo(ex, y + 3); ctx.fill(); }
        else for (let i = -1; i <= 1; i++) { const x = i * hw * 0.55, ey = face > 0 ? hh : -hh; ctx.beginPath(); ctx.moveTo(x - 3, ey); ctx.lineTo(x, ey + face * 7); ctx.lineTo(x + 3, ey); ctx.fill(); }
      }
      barTop = -hh - 8;
    } else if (s.type === 'ward') {
      const rr = s.radius || 66, pulse = 1 + Math.sin(t * 3) * 0.05;
      const rg = ctx.createRadialGradient(0, 0, rr * 0.2, 0, 0, rr * pulse);
      rg.addColorStop(0, teamCol + '10'); rg.addColorStop(0.7, teamCol + '22'); rg.addColorStop(1, teamCol + '00');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, rr * pulse, 0, TAU); ctx.fill();
      ctx.strokeStyle = teamCol + 'cc'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, rr * pulse, 0, TAU); ctx.stroke();
      /* rotating rune ticks */
      ctx.strokeStyle = teamCol; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU + t * 0.4;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * rr * 0.86, Math.sin(a) * rr * 0.86); ctx.lineTo(Math.cos(a) * rr * 0.98, Math.sin(a) * rr * 0.98); ctx.stroke();
      }
      barTop = -rr - 10;
    }
    /* structure hp */
    if (s.hp < s.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-16, barTop, 32, 3);
      ctx.fillStyle = '#d9b23a'; ctx.fillRect(-16, barTop, 32 * (s.hp / s.maxHp), 3);
    }
    ctx.restore();
  }

  /* ---------------- effects ---------------- */
  function drawEffect(ctx, e, f, t, dset) {
    ctx.save();
    switch (e.type) {
      case 'deploy': {
        ctx.strokeStyle = 'rgba(217,184,122,' + (1 - f) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, 20 + f * 40, (20 + f * 40) * 0.5, 0, 0, TAU); ctx.stroke();
        /* okid coin flip-in */
        if (f < 0.5) {
          SPR.drawCoin(ctx, e.x, e.y - 40 * (0.5 - f) * 2, 10, t * 3, null, {});
        }
        break;
      }
      case 'rock': {
        /* a thrown stone arcing from source to target */
        const rx = e.x + (e.tx - e.x) * f, ry = e.y + (e.ty - e.y) * f - Math.sin(f * Math.PI) * 46;
        ctx.fillStyle = '#8d8578';
        ctx.save();
        ctx.translate(rx, ry); ctx.rotate(f * 9);
        ctx.beginPath();
        ctx.moveTo(-5, 2); ctx.lineTo(-2, -4); ctx.lineTo(4, -3); ctx.lineTo(5, 3); ctx.lineTo(0, 5);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#00000033'; ctx.fillRect(-3, -1, 4, 3);
        ctx.restore();
        if (f > 0.85) {
          ctx.fillStyle = 'rgba(200,190,170,' + (1 - f) * 3 + ')';
          for (let i = 0; i < 4; i++) {
            const a = i / 4 * TAU;
            ctx.beginPath(); ctx.arc(e.tx + Math.cos(a) * (f - 0.85) * 60, e.ty + Math.sin(a) * (f - 0.85) * 60, 2.4, 0, TAU); ctx.fill();
          }
        }
        break;
      }
      case 'hit': {
        ctx.fillStyle = 'rgba(255,235,200,' + (1 - f) * 0.8 + ')';
        const n = e.big ? 7 : 4;
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU + e.x;
          const d = f * (e.big ? 26 : 14);
          ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, (e.big ? 3.4 : 2.2) * (1 - f), 0, TAU); ctx.fill();
        }
        break;
      }
      case 'breath': {
        const col = SP.ELEMENT_COLORS[e.el] || '#e8842c';
        ctx.globalAlpha = (1 - f) * 0.7;
        const a = Math.atan2(e.ty - e.y, e.tx - e.x);
        const len = U.dist(e.x, e.y, e.tx, e.ty);
        ctx.translate(e.x, e.y); ctx.rotate(a);
        const bg = ctx.createLinearGradient(0, 0, len, 0);
        bg.addColorStop(0, col + 'ee'); bg.addColorStop(1, col + '00');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(len, -14 - f * 12);
        ctx.lineTo(len, 14 + f * 12);
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'screech': {
        ctx.strokeStyle = 'rgba(255,232,138,' + (1 - f) + ')';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 3; i++) {
          const r = (f * 130 + i * 18) % 150;
          ctx.beginPath(); ctx.arc(e.x, e.y, r, -0.6, 0.6); ctx.stroke();
          ctx.beginPath(); ctx.arc(e.x, e.y, r, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
        }
        break;
      }
      case 'teleport': {
        ctx.strokeStyle = 'rgba(122,74,232,' + (1 - f) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, 6 + f * 26, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(36,23,51,' + (1 - f) * 0.8 + ')';
        ctx.beginPath(); ctx.arc(e.x, e.y, 12 * (1 - f), 0, TAU); ctx.fill();
        break;
      }
      case 'shurgredan': {
        /* the sky answers: massive claw of light */
        ctx.globalAlpha = f < 0.2 ? f * 5 : (1 - f);
        ctx.fillStyle = '#fff3c8';
        ctx.translate(e.x, e.y);
        for (let i = -1; i <= 1; i++) {
          ctx.save();
          ctx.rotate(i * 0.22 + 0.1);
          ctx.beginPath();
          ctx.moveTo(i * 26 - 9, -560);
          ctx.lineTo(i * 26 + 9, -560);
          ctx.lineTo(i * 8 + 3, 10);
          ctx.lineTo(i * 8 - 3, 10);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        const rg = ctx.createRadialGradient(0, 0, 4, 0, 0, 90);
        rg.addColorStop(0, '#fff3c8ee'); rg.addColorStop(1, '#e8842c00');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(0, 0, 90, 0, TAU); ctx.fill();
        break;
      }
      case 'heal': {
        ctx.fillStyle = 'rgba(122,232,138,' + (1 - f) + ')';
        for (let i = 0; i < 4; i++) {
          const a = i * TAU / 4 + t;
          ctx.fillRect(e.x + Math.cos(a) * 14 - 1.5, e.y + Math.sin(a) * 8 - f * 26 - 1.5, 3, 9);
        }
        break;
      }
      case 'buff': {
        ctx.strokeStyle = 'rgba(232,210,74,' + (1 - f) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, 16 + f * 14, (16 + f * 14) * 0.5, 0, 0, TAU); ctx.stroke();
        break;
      }
      case 'tongue': {
        ctx.strokeStyle = 'rgba(212,106,106,' + (1 - f) + ')';
        ctx.lineWidth = 4 * (1 - f * 0.5);
        ctx.beginPath(); ctx.moveTo(e.x, e.y);
        const mx = (e.x + e.tx) / 2, my = (e.y + e.ty) / 2 - 18;
        ctx.quadraticCurveTo(mx, my, e.tx, e.ty); ctx.stroke();
        break;
      }
      case 'dive': {
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - f) * 0.5 + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(U.lerp(e.x, e.tx, f), U.lerp(e.y, e.ty, f)); ctx.stroke();
        break;
      }
      case 'electric': {
        ctx.strokeStyle = 'rgba(126,200,227,' + (1 - f) + ')';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const a = i * TAU / 5 + t * 3;
          let x = e.x, y = e.y;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let sgm = 0; sgm < 3; sgm++) {
            x += Math.cos(a) * 12 + Math.sin(t * 40 + i + sgm) * 6;
            y += Math.sin(a) * 12 + Math.cos(t * 37 + i * 2) * 6;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        break;
      }
      case 'swarmBurst': {
        ctx.fillStyle = 'rgba(194,178,58,' + (1 - f) + ')';
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * TAU;
          const d = f * 80;
          ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * 0.6, 2.5, 0, TAU); ctx.fill();
        }
        break;
      }
      case 'plant': {
        ctx.strokeStyle = 'rgba(139,196,106,' + (1 - f) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.quadraticCurveTo(e.x + 5, e.y - 10 - f * 8, e.x + 2, e.y - 16 - f * 10); ctx.stroke();
        break;
      }
      case 'bogForm': {
        ctx.strokeStyle = 'rgba(143,191,63,' + (1 - f) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, f * 46, f * 32, 0, 0, TAU); ctx.stroke();
        break;
      }
      case 'steal': {
        ctx.fillStyle = 'rgba(217,184,122,' + (1 - f) + ')';
        ctx.beginPath(); ctx.arc(e.x, e.y - f * 24, 4, 0, TAU); ctx.fill();
        break;
      }
      case 'biolum': {
        ctx.strokeStyle = (e.col || '#68e0e8') + Math.floor((1 - f) * 200).toString(16).padStart(2, '0');
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, 10 + f * 60, 0, TAU); ctx.stroke();
        break;
      }
      case 'breathSu': {
        ctx.fillStyle = 'rgba(59,154,225,' + (1 - f) * 0.8 + ')';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.arc(e.x + i * 6 - 6, e.y - f * 20 - i * 4, 3 - f * 2, 0, TAU); ctx.fill();
        }
        break;
      }
      case 'headLost': {
        ctx.fillStyle = 'rgba(255,255,255,' + (1 - f) + ')';
        ctx.font = 'bold ' + (10 + f * 8) + 'px serif';
        ctx.textAlign = 'center';
        ctx.fillText('✦', e.x, e.y - f * 30);
        break;
      }
    }
    ctx.restore();
  }

  /* ---------------- circular minimap ---------------- */
  Renderer.prototype.drawMinimap = function (ctx2, size) {
    const M = this.match;
    ctx2.clearRect(0, 0, size, size);
    ctx2.save();
    /* circular clip */
    ctx2.beginPath(); ctx2.arc(size / 2, size / 2, size / 2 - 2, 0, TAU); ctx2.clip();
    ctx2.fillStyle = SPR.shade(M.terrain.ground, -25);
    ctx2.fillRect(0, 0, size, size);
    const sx = size / M.world.w, sy = size / M.world.h;
    const s = Math.min(sx, sy);
    const ox = (size - M.world.w * s) / 2, oy = (size - M.world.h * s) / 2;
    /* zones */
    M.zones.forEach(z => {
      ctx2.fillStyle = z.type === 'water' ? '#3b9ae188' : z.type === 'bog' ? '#8fbf3f66' : z.type === 'forest' ? '#3c553088' : '#e8842c66';
      ctx2.beginPath(); ctx2.arc(ox + z.x * s, oy + z.y * s, z.r * s, 0, TAU); ctx2.fill();
    });
    /* hoards */
    M.teams.forEach(T => {
      if (T.controller === 'wild') return;
      ctx2.fillStyle = T.color;
      ctx2.beginPath(); ctx2.arc(ox + T.hoard.x * s, oy + T.hoard.y * s, 5, 0, TAU); ctx2.fill();
    });
    /* relics */
    (M.relics || []).forEach(rl => {
      if (rl.disabled || rl.captured) return;
      ctx2.fillStyle = M.teams[rl.ownerTeam] ? M.teams[rl.ownerTeam].color : '#cbb8f0';
      ctx2.save();
      ctx2.translate(ox + rl.x * s, oy + rl.y * s);
      ctx2.rotate(Math.PI / 4);
      ctx2.fillRect(-3, -3, 6, 6);
      ctx2.restore();
    });
    /* creatures */
    M.creatures.forEach(c => {
      if (c.dead) return;
      ctx2.fillStyle = M.mode === 'hunt' && c.team === 1 ? '#e05252' : (M.teams[c.team] ? M.teams[c.team].color : '#ccc');
      ctx2.beginPath(); ctx2.arc(ox + c.x * s, oy + c.y * s, c.isBoss ? 4 : 2.2, 0, TAU); ctx2.fill();
    });
    ctx2.restore();
    /* rim */
    ctx2.strokeStyle = '#d9b87a66'; ctx2.lineWidth = 2;
    ctx2.beginPath(); ctx2.arc(size / 2, size / 2, size / 2 - 2, 0, TAU); ctx2.stroke();
  };

  DYA.render = { Renderer };
})();
