/* ============================================================
   DYA'AKARA — engine/sprites.js
   Animated procedural placeholder sprites.

   Per creator's direction:
   - beast-like creatures  → a small four-legged animal rig
   - humanoid creatures    → a small two-legged, two-armed acorn rig
   Species features (wings, extra heads, shells, horns, vines,
   flame…) are layered onto those base rigs so every creature
   reads distinctly while staying an honest placeholder.

   Animation states: idle / walk / run / attack / hit / death /
   dormant + one special per signature behavior.
   Shader treatments per design doc: magical shimmer, per-creature
   bioluminescence, tether fade (alpha handled by caller).
   ============================================================ */
(function () {
  'use strict';
  const SPR = {};
  const TAU = Math.PI * 2;

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }
  SPR.shade = shade;

  /* ============ master draw ============ */
  /* o: {sp (species def), r, state, t, phase, facing, teamColor, alpha,
         shimmer (bool), biolum (bool), heat (0..1 tyndael), swarmFrac,
         heads (actual head count), hasRider, quality} */
  SPR.draw = function (ctx, o) {
    const sp = o.sp;
    const state = o.state || 'idle';
    const t = (o.t || 0) + (o.phase || 0);
    ctx.save();
    ctx.globalAlpha = o.alpha != null ? o.alpha : 1;

    /* death: sink + fade handled via alpha by caller; here we squash */
    let squash = 1;
    if (state === 'death') squash = 0.6;

    /* bioluminescent under-glow */
    if (o.biolum && (sp.features.biolum || sp.features.biolumTail || sp.features.glow)) {
      const g = ctx.createRadialGradient(0, 0, o.r * 0.2, 0, 0, o.r * 2.2);
      const glowCol = sp.color2 || '#68e0e8';
      g.addColorStop(0, glowCol + 'aa');
      g.addColorStop(1, glowCol + '00');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, o.r * 2.2, 0, TAU); ctx.fill();
    }

    /* team ring (subtle, under the creature) — player's seal engraved inside (§3) */
    if (o.teamColor) {
      if (o.seal) {
        ctx.save();
        ctx.globalAlpha *= 0.4;
        ctx.translate(0, o.r * 0.85);
        ctx.scale(1, 0.45);
        SPR.drawSeal(ctx, 0, 0, o.r * 1.02, o.seal);
        ctx.restore();
      }
      ctx.strokeStyle = o.teamColor;
      ctx.globalAlpha *= 0.55;
      ctx.lineWidth = Math.max(1.5, o.r * 0.12);
      ctx.beginPath(); ctx.ellipse(0, o.r * 0.85, o.r * 1.1, o.r * 0.45, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    }
    /* optional floating seal token above the creature (§3, match-settings toggle) */
    if (o.seal && o.sealBadge && state !== 'death') {
      SPR.drawSeal(ctx, 0, -o.r * 2.1 + Math.sin(t * 2) * 2, o.r * 0.32, o.seal);
    }

    ctx.scale(o.facing < 0 ? -1 : 1, squash);

    const rig = sp.rig || 'quad';
    if (rig === 'quad') drawQuad(ctx, o, t, state);
    else if (rig === 'biped') drawBiped(ctx, o, t, state);
    else if (rig === 'flame') drawFlame(ctx, o, t, state);
    else if (rig === 'swarm') drawSwarm(ctx, o, t, state);
    else if (rig === 'tree') drawTree(ctx, o, t, state);
    else if (rig === 'blob') drawBlob(ctx, o, t, state);
    else if (rig === 'field') drawField(ctx, o, t, state);
    else if (rig === 'relic') drawRelicShard(ctx, o, t, state);
    else if (rig === 'crab') drawCrab(ctx, o, t, state);
    else if (rig === 'mcfly') drawMcFly(ctx, o, t, state);
    else if (rig === 'bird') drawBird(ctx, o, t, state);
    else drawQuad(ctx, o, t, state);

    ctx.scale(o.facing < 0 ? -1 : 1, 1); // unflip for shimmer

    /* magical shimmer — subtle color shimmer playing across the surface */
    if (o.shimmer && state !== 'death') {
      const sw = Math.sin(t * 1.4) * o.r;
      const hue = (t * 40) % 360;
      const g = ctx.createLinearGradient(sw - o.r * 0.6, -o.r, sw + o.r * 0.6, o.r);
      g.addColorStop(0, 'hsla(' + hue + ',80%,75%,0)');
      g.addColorStop(0.5, 'hsla(' + hue + ',80%,80%,0.16)');
      g.addColorStop(1, 'hsla(' + hue + ',80%,75%,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, o.r * 1.15, o.r * 1.05, 0, 0, TAU); ctx.fill();
      /* occasional gentle flicker */
      if (Math.sin(t * 0.7 + (o.phase || 0) * 13) > 0.985) {
        ctx.globalAlpha *= 0.85;
      }
    }

    /* hit flash */
    if (state === 'hit') {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.25 * Math.sin(t * 30)) + ')';
      ctx.beginPath(); ctx.ellipse(0, 0, o.r * 1.1, o.r, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  /* ============ QUADRUPED — "small four-legged animal" ============ */
  function drawQuad(ctx, o, t, state) {
    const sp = o.sp, r = o.r, F = sp.features || {};
    const moving = state === 'walk' || state === 'run';
    const rate = state === 'run' ? 14 : 8;
    const gait = moving ? Math.sin(t * rate) : 0;
    const idleBob = state === 'idle' ? Math.sin(t * 2.2) * r * 0.05 : 0;
    const dormant = state === 'dormant';
    const attackLunge = state === 'attack' ? Math.max(0, Math.sin(t * 12)) * r * 0.35 : 0;

    const bodyW = r * (F.low ? 1.25 : 1.05), bodyH = r * (F.low ? 0.55 : (F.round ? 0.85 : 0.68));
    const y0 = -r * 0.15 + idleBob + (dormant ? r * 0.28 : 0);

    /* --- wings (behind body) --- */
    if (F.wings && !dormant) {
      const flap = state === 'death' ? 0.1 : Math.sin(t * (moving ? 12 : 5)) * 0.7;
      ctx.fillStyle = shade(sp.color, -25) + 'dd';
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(-r * 0.1, y0 - bodyH * 0.5);
        ctx.rotate(side * (0.5 + flap * 0.5) - 0.2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-r * 1.1, -r * (0.7 + 0.2 * side), -r * 1.5, -r * 0.15);
        ctx.quadraticCurveTo(-r * 0.8, r * 0.05, 0, 0);
        ctx.fill();
        ctx.restore();
      }
    }

    /* --- aquatic body plan: fins and tail, never legs (§6) --- */
    if (F.aquatic) {
      const swim = Math.sin(t * (moving ? 9 : 4));
      ctx.fillStyle = shade(sp.color, -18);
      /* tail fin */
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.9, y0);
      ctx.lineTo(-bodyW * 1.35, y0 - r * 0.34 + swim * r * 0.16);
      ctx.lineTo(-bodyW * 1.35, y0 + r * 0.34 + swim * r * 0.16);
      ctx.closePath(); ctx.fill();
      /* side fins */
      ctx.beginPath();
      ctx.moveTo(bodyW * 0.05, y0 + bodyH * 0.5);
      ctx.quadraticCurveTo(bodyW * 0.0 + swim * r * 0.1, y0 + bodyH * 1.15, -bodyW * 0.35, y0 + bodyH * 0.55);
      ctx.closePath(); ctx.fill();
    }
    /* --- 4 legs (never for aquatic or legless species) --- */
    if (!dormant && !F.stationary && !F.aquatic && !F.legless) {
      ctx.strokeStyle = shade(sp.color, -40);
      ctx.lineWidth = Math.max(2, r * 0.16);
      ctx.lineCap = 'round';
      const legY = y0 + bodyH * 0.4, footY = r * 0.85;
      const legXs = [-bodyW * 0.55, -bodyW * 0.25, bodyW * 0.2, bodyW * 0.5];
      legXs.forEach((lx, i) => {
        const sw = moving ? Math.sin(t * rate + i * Math.PI * 0.9) * r * 0.22 : 0;
        ctx.beginPath();
        ctx.moveTo(lx, legY);
        ctx.lineTo(lx + sw, footY);
        ctx.stroke();
      });
    }

    /* --- tail --- */
    if (F.ballTail) {
      const wag = Math.sin(t * 3) * 0.2;
      ctx.strokeStyle = shade(sp.color, -30); ctx.lineWidth = r * 0.14;
      ctx.beginPath(); ctx.moveTo(-bodyW * 0.9, y0); ctx.quadraticCurveTo(-bodyW * 1.3, y0 - r * 0.3 + wag * r, -bodyW * 1.5, y0 + wag * r); ctx.stroke();
      ctx.fillStyle = shade(sp.color, -50);
      ctx.beginPath(); ctx.arc(-bodyW * 1.5, y0 + wag * r, r * 0.28, 0, TAU); ctx.fill();
      // spikes
      ctx.strokeStyle = shade(sp.color, -70); ctx.lineWidth = Math.max(1, r * 0.05);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        ctx.beginPath(); ctx.moveTo(-bodyW * 1.5 + Math.cos(a) * r * 0.26, y0 + wag * r + Math.sin(a) * r * 0.26);
        ctx.lineTo(-bodyW * 1.5 + Math.cos(a) * r * 0.4, y0 + wag * r + Math.sin(a) * r * 0.4); ctx.stroke();
      }
    } else if (F.fluffTail) {
      const wag = Math.sin(t * 4) * 0.3;
      ctx.fillStyle = F.biolumTail && o.biolum ? sp.color2 : shade(sp.color, 15);
      ctx.beginPath(); ctx.ellipse(-bodyW * 1.05, y0 - r * 0.25 + wag * r * 0.5, r * 0.42, r * 0.26, -0.5 + wag, 0, TAU); ctx.fill();
      if (F.biolumTail && o.biolum) {
        ctx.fillStyle = '#ffffff55';
        ctx.beginPath(); ctx.ellipse(-bodyW * 1.05, y0 - r * 0.25 + wag * r * 0.5, r * 0.18, r * 0.1, -0.5 + wag, 0, TAU); ctx.fill();
      }
    } else if (!F.round && !F.stationary) {
      const wag = Math.sin(t * (moving ? 6 : 2.5)) * 0.25;
      ctx.strokeStyle = shade(sp.color, -20); ctx.lineWidth = Math.max(2, r * 0.1);
      ctx.beginPath(); ctx.moveTo(-bodyW * 0.85, y0); ctx.quadraticCurveTo(-bodyW * 1.2, y0 - r * 0.2 + wag * r, -bodyW * 1.35, y0 - r * 0.05 + wag * r * 1.4); ctx.stroke();
    }

    /* --- body --- */
    const grd = ctx.createLinearGradient(0, y0 - bodyH, 0, y0 + bodyH);
    grd.addColorStop(0, shade(sp.color, 22));
    grd.addColorStop(1, shade(sp.color, -18));
    ctx.fillStyle = grd;
    const undul = F.aquatic ? Math.sin(t * 6) * 0.05 : 0;
    ctx.beginPath(); ctx.ellipse(attackLunge * 0.3, y0, bodyW, bodyH * (dormant ? 0.75 : 1), undul, 0, TAU); ctx.fill();

    /* rocky / carved / scars / plates texture */
    if (F.rocky || F.carved) {
      ctx.strokeStyle = shade(sp.color, -55) + '88'; ctx.lineWidth = Math.max(1, r * 0.05);
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + 0.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * bodyW * 0.5, y0 + Math.sin(a) * bodyH * 0.5);
        ctx.lineTo(Math.cos(a) * bodyW * 0.2, y0 + Math.sin(a) * bodyH * 0.1);
        ctx.stroke();
      }
    }
    if (F.scars) {
      ctx.strokeStyle = shade(sp.color, 45) + '99'; ctx.lineWidth = Math.max(1, r * 0.04);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(-bodyW * 0.4 + i * bodyW * 0.3, y0 - bodyH * 0.4);
        ctx.lineTo(-bodyW * 0.25 + i * bodyW * 0.3, y0 + bodyH * 0.3); ctx.stroke();
      }
    }
    /* ridge along back (naga/hvaleia) */
    if (F.ridge) {
      ctx.fillStyle = shade(sp.color2 || sp.color, -10);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * bodyW * 0.28 - r * 0.1, y0 - bodyH * 0.85);
        ctx.lineTo(i * bodyW * 0.28, y0 - bodyH * 1.35);
        ctx.lineTo(i * bodyW * 0.28 + r * 0.1, y0 - bodyH * 0.85);
        ctx.fill();
      }
    }
    /* blowholes (hvaleia) */
    if (F.blowholes) {
      ctx.fillStyle = shade(sp.color, -60);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(-bodyW * 0.3 + i * bodyW * 0.3, y0 - bodyH * 0.7, r * 0.07, 0, TAU); ctx.fill();
      }
      if (state === 'special') { // jet blast
        ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = r * 0.1;
        for (let i = 0; i < 3; i++) {
          const h = (0.6 + 0.4 * Math.sin(t * 20 + i)) * r;
          ctx.beginPath(); ctx.moveTo(-bodyW * 0.3 + i * bodyW * 0.3, y0 - bodyH * 0.75);
          ctx.lineTo(-bodyW * 0.3 + i * bodyW * 0.3, y0 - bodyH * 0.75 - h); ctx.stroke();
        }
      }
    }
    /* vines (punks/stryx) */
    if (F.vines) {
      ctx.strokeStyle = sp.color2 || '#3f7d3a'; ctx.lineWidth = Math.max(1.5, r * 0.09);
      const n = 3;
      for (let i = 0; i < n; i++) {
        const a = -0.6 + i * 0.5;
        const wob = Math.sin(t * 3 + i * 2) * 0.3 + (state === 'attack' ? Math.sin(t * 15) * 0.8 : 0);
        ctx.beginPath();
        ctx.moveTo(bodyW * 0.2 - i * bodyW * 0.3, y0 - bodyH * 0.7);
        ctx.quadraticCurveTo(
          bodyW * 0.4 - i * bodyW * 0.3 + wob * r, y0 - bodyH * 0.7 - r * 0.7,
          bodyW * (0.7 + (state === 'attack' ? 0.5 : 0)) - i * bodyW * 0.35 + wob * r * 1.5, y0 - bodyH * 0.3 - r * (0.9 + 0.2 * Math.sin(t * 2 + i)));
        ctx.stroke();
      }
    }

    /* --- head(s) --- */
    const headCount = o.heads || (F.heads ? F.heads[0] : 1);
    const headR = r * (F.bigJaw ? 0.42 : 0.34) * (headCount > 1 ? 0.8 : 1);
    for (let h = 0; h < headCount; h++) {
      const spread = headCount > 1 ? (h - (headCount - 1) / 2) * 0.55 : 0;
      const hx = bodyW * 0.8 + attackLunge + (headCount > 1 ? Math.abs(spread) * -r * 0.15 : 0);
      const hy = y0 - bodyH * 0.55 - (headCount > 1 ? r * 0.45 : r * 0.15) + spread * r * 0.55 + (dormant ? r * 0.3 : 0) + Math.sin(t * 2.5 + h * 1.7) * r * 0.04;
      if (F.serpent || headCount > 1) { // neck
        ctx.strokeStyle = shade(sp.color, -8); ctx.lineWidth = headR * 1.05;
        ctx.beginPath();
        ctx.moveTo(bodyW * 0.4, y0 - bodyH * 0.2);
        ctx.quadraticCurveTo(bodyW * 0.65, hy + r * 0.2, hx, hy);
        ctx.stroke();
      }
      ctx.fillStyle = h === 0 ? shade(sp.color, 12) : shade(sp.color, 12 - h * 8);
      ctx.beginPath(); ctx.arc(hx, hy, headR, 0, TAU); ctx.fill();
      /* first-head marker for nagas (near-invincible) */
      if (h === 0 && headCount > 1) {
        ctx.strokeStyle = (sp.color2 || '#fff') + 'cc'; ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.beginPath(); ctx.arc(hx, hy, headR * 1.15, 0, TAU); ctx.stroke();
      }
      /* eye */
      if (!dormant) {
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(hx + headR * 0.4, hy - headR * 0.15, Math.max(1, headR * 0.18), 0, TAU); ctx.fill();
        if (F.manyEyes) {
          for (let e = 0; e < 3; e++) {
            ctx.beginPath(); ctx.arc(hx + headR * (0.1 - e * 0.25), hy - headR * (0.3 + e * 0.12), Math.max(1, headR * 0.12), 0, TAU); ctx.fill();
          }
        }
      } else {
        ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(hx + headR * 0.2, hy - headR * 0.1); ctx.lineTo(hx + headR * 0.6, hy - headR * 0.1); ctx.stroke();
      }
      /* jaw / mouth strike */
      if (F.mouth || F.bigJaw) {
        const open = state === 'attack' || state === 'special' ? 0.5 + 0.3 * Math.sin(t * 14) : (dormant ? 0 : 0.08);
        ctx.fillStyle = shade(sp.color, -65);
        ctx.beginPath();
        ctx.moveTo(hx + headR * 0.2, hy + headR * 0.25);
        ctx.lineTo(hx + headR * (1.1 + open * 0.3), hy + headR * (0.05 - open));
        ctx.lineTo(hx + headR * (1.1 + open * 0.3), hy + headR * (0.45 + open));
        ctx.closePath(); ctx.fill();
      }
      /* tusks */
      if (F.tusks && h === 0) {
        ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = Math.max(2, r * 0.08);
        ctx.beginPath(); ctx.moveTo(hx + headR * 0.5, hy + headR * 0.4); ctx.quadraticCurveTo(hx + headR * 1.2, hy + headR * 0.5, hx + headR * 1.3, hy - headR * 0.2); ctx.stroke();
      }
      /* horns (albali — five) */
      if (F.horns && h === 0) {
        ctx.strokeStyle = sp.color2 || '#b03030'; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          const a = -1.9 + i * 0.28;
          ctx.beginPath(); ctx.moveTo(hx, hy - headR * 0.4);
          ctx.lineTo(hx + Math.cos(a) * headR * 1.3, hy - headR * 0.4 + Math.sin(a) * headR * 1.3);
          ctx.stroke();
        }
      }
      /* ears (kipsu) */
      if (F.ears && h === 0) {
        ctx.fillStyle = shade(sp.color, 5);
        for (const s of [-0.45, 0.15]) {
          ctx.beginPath();
          ctx.moveTo(hx + headR * s, hy - headR * 0.7);
          ctx.lineTo(hx + headR * (s + 0.15), hy - headR * 1.5);
          ctx.lineTo(hx + headR * (s + 0.45), hy - headR * 0.6);
          ctx.fill();
        }
      }
      /* tongue (tonguatjis special) */
      if (F.tongue && (state === 'special' || state === 'attack')) {
        const ext = (0.5 + 0.5 * Math.sin(t * 10)) * r * 3.2;
        ctx.strokeStyle = sp.color2 || '#d46a6a'; ctx.lineWidth = Math.max(2, r * 0.09);
        ctx.beginPath(); ctx.moveTo(hx + headR * 0.9, hy + headR * 0.2);
        ctx.quadraticCurveTo(hx + headR + ext * 0.5, hy + headR * 0.2 - r * 0.15, hx + headR + ext, hy + headR * 0.15);
        ctx.stroke();
        ctx.fillStyle = sp.color2 || '#d46a6a';
        ctx.beginPath(); ctx.arc(hx + headR + ext, hy + headR * 0.15, r * 0.12, 0, TAU); ctx.fill();
      }
    }

    /* shell over body */
    if (F.shell) {
      ctx.fillStyle = shade(sp.color, -25);
      ctx.beginPath(); ctx.ellipse(-bodyW * 0.1, y0 - bodyH * 0.25, bodyW * 0.85, bodyH * 0.95, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = shade(sp.color, -50); ctx.lineWidth = Math.max(1, r * 0.05);
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.ellipse(-bodyW * 0.1, y0 - bodyH * 0.25, bodyW * 0.85 * i / 4, bodyH * 0.95 * i / 4, 0, Math.PI, TAU); ctx.stroke();
      }
    }
    /* grothyn stalk = breath weapon port on shell top */
    if (F.stalk) {
      ctx.strokeStyle = sp.color2; ctx.lineWidth = Math.max(2, r * 0.1);
      ctx.beginPath(); ctx.moveTo(-bodyW * 0.1, y0 - bodyH * 1.1);
      ctx.quadraticCurveTo(-bodyW * 0.1 + Math.sin(t * 2) * r * 0.15, y0 - bodyH * 1.5, -bodyW * 0.1, y0 - bodyH * 1.8);
      ctx.stroke();
      ctx.fillStyle = sp.color2;
      ctx.beginPath(); ctx.arc(-bodyW * 0.1, y0 - bodyH * 1.8, r * 0.12, 0, TAU); ctx.fill();
    }
    /* rider (acorn on back) */
    if ((F.rider || o.hasRider) && !dormant) {
      drawMiniAcorn(ctx, -bodyW * 0.15, y0 - bodyH * 1.15 + idleBob, r * 0.4, t, '#c8a05c', '#6d4a2e');
    }
  }

  /* ============ ACORN BIPED — "two-legged two-armed acorn" ============ */
  function drawBiped(ctx, o, t, state) {
    const sp = o.sp, r = o.r, F = sp.features || {};
    const moving = state === 'walk' || state === 'run';
    const rate = state === 'run' ? 13 : 8;
    const gait = moving ? Math.sin(t * rate) : 0;
    const idleBob = state === 'idle' ? Math.sin(t * 2.4) * r * 0.04 : 0;
    const attackSwing = state === 'attack' ? Math.sin(t * 14) : 0;
    const bodyR = r * 0.62;
    const y0 = -r * 0.25 + idleBob;

    /* legs */
    ctx.strokeStyle = shade(sp.color, -45); ctx.lineWidth = Math.max(2, r * 0.13); ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const sw = moving ? gait * s * r * 0.2 : 0;
      ctx.beginPath();
      ctx.moveTo(s * bodyR * 0.35, y0 + bodyR * 0.7);
      ctx.lineTo(s * bodyR * 0.35 + sw, r * 0.9);
      ctx.stroke();
    }
    /* Uff stalk legs are longer + wobbly */
    if (F.stalkLegs) { /* drawn by same code; body sits higher via y0 tweak below */ }

    /* hair armor cape (Keilia) — covers the back */
    if (F.hairArmor) {
      ctx.fillStyle = shade(sp.color2 || '#4a4238', -10);
      ctx.beginPath();
      ctx.moveTo(-bodyR * 0.9, y0 - bodyR * 0.7);
      ctx.quadraticCurveTo(-bodyR * 1.5, y0 + bodyR * 0.5, -bodyR * 0.9, y0 + bodyR * 1.4);
      ctx.lineTo(-bodyR * 0.2, y0 + bodyR * 0.9);
      ctx.closePath(); ctx.fill();
    }

    /* acorn body — rounded bottom, cap on top */
    const grd = ctx.createLinearGradient(0, y0 - bodyR, 0, y0 + bodyR);
    grd.addColorStop(0, shade(sp.color, 25));
    grd.addColorStop(1, shade(sp.color, -20));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.85, y0 - bodyR * 0.1);
    ctx.quadraticCurveTo(-bodyR * 0.9, y0 + bodyR, 0, y0 + bodyR);
    ctx.quadraticCurveTo(bodyR * 0.9, y0 + bodyR, bodyR * 0.85, y0 - bodyR * 0.1);
    ctx.closePath(); ctx.fill();

    /* face on the acorn body */
    ctx.fillStyle = '#241a10';
    ctx.beginPath(); ctx.arc(bodyR * 0.25, y0 + bodyR * 0.1, Math.max(1, r * 0.07), 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(bodyR * 0.55, y0 + bodyR * 0.1, Math.max(1, r * 0.07), 0, TAU); ctx.fill();
    /* Eikar eye markings */
    if (sp.family === 'Eikar') {
      ctx.strokeStyle = '#241a1099'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bodyR * 0.2, y0 + bodyR * 0.25); ctx.lineTo(bodyR * 0.32, y0 + bodyR * 0.38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bodyR * 0.5, y0 + bodyR * 0.25); ctx.lineTo(bodyR * 0.62, y0 + bodyR * 0.38); ctx.stroke();
    }
    /* striped head/neck for Uff */
    if (F.longNeck) {
      ctx.strokeStyle = sp.color; ctx.lineWidth = r * 0.16;
      const nod = Math.sin(t * 3) * 0.2;
      ctx.beginPath(); ctx.moveTo(0, y0 - bodyR * 0.5);
      ctx.quadraticCurveTo(r * 0.3, y0 - r * 1.0, r * (0.5 + nod), y0 - r * 1.2); ctx.stroke();
      ctx.fillStyle = sp.color2 || '#8a4a2e';
      ctx.beginPath(); ctx.arc(r * (0.5 + nod), y0 - r * 1.25, r * 0.22, 0, TAU); ctx.fill();
      ctx.strokeStyle = shade(sp.color2 || '#8a4a2e', 40); ctx.lineWidth = Math.max(1, r * 0.05);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(r * (0.5 + nod), y0 - r * 1.25, r * (0.08 + i * 0.06), -1, 1); ctx.stroke();
      }
    }

    /* acorn cap (integral to their being) — or triangle hat for Karnen */
    if (F.triangleHat) {
      ctx.fillStyle = sp.color2 || '#7a3b3b';
      ctx.beginPath();
      ctx.moveTo(-bodyR * 0.9, y0 - bodyR * 0.15);
      ctx.lineTo(0, y0 - bodyR * 1.5);
      ctx.lineTo(bodyR * 0.9, y0 - bodyR * 0.15);
      ctx.closePath(); ctx.fill();
    } else if (!F.longNeck) {
      ctx.fillStyle = sp.color2 || '#6d4a2e';
      ctx.beginPath();
      ctx.ellipse(0, y0 - bodyR * 0.25, bodyR * 0.95, bodyR * 0.5, 0, Math.PI, TAU);
      ctx.fill();
      /* cap texture */
      ctx.strokeStyle = shade(sp.color2 || '#6d4a2e', -25); ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(i * bodyR * 0.3, y0 - bodyR * 0.3); ctx.lineTo(i * bodyR * 0.32, y0 - bodyR * 0.6); ctx.stroke();
      }
      /* stem */
      ctx.strokeStyle = shade(sp.color2 || '#6d4a2e', -35); ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath(); ctx.moveTo(0, y0 - bodyR * 0.72); ctx.lineTo(bodyR * 0.12, y0 - bodyR * 1.05); ctx.stroke();
    }

    /* arms + weapon */
    ctx.strokeStyle = shade(sp.color, -45); ctx.lineWidth = Math.max(2, r * 0.12);
    const armY = y0 + bodyR * 0.05;
    if (F.petalArms) {
      /* Uff — spiky vine petals, flail when special/attack */
      const flail = (state === 'attack' || state === 'special') ? Math.sin(t * 18) * 1.2 : Math.sin(t * 2.5) * 0.2;
      ctx.strokeStyle = shade(sp.color, -20);
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const a = s * (0.5 + i * 0.4) + flail * s;
          ctx.beginPath(); ctx.moveTo(s * bodyR * 0.7, armY);
          ctx.lineTo(s * bodyR * 0.7 + Math.cos(a) * r * 0.75, armY - Math.abs(Math.sin(a)) * r * 0.75);
          ctx.stroke();
        }
      }
    } else {
      /* back arm */
      ctx.beginPath(); ctx.moveTo(-bodyR * 0.7, armY);
      ctx.lineTo(-bodyR * 1.1, armY + bodyR * 0.4 + gait * r * 0.08); ctx.stroke();
      /* front arm holds weapon */
      const wx = bodyR * 0.95, wy = armY + bodyR * 0.15;
      ctx.beginPath(); ctx.moveTo(bodyR * 0.7, armY); ctx.lineTo(wx, wy); ctx.stroke();
      drawWeapon(ctx, F.weapon, wx, wy, r, t, attackSwing, state);
    }
  }

  function drawWeapon(ctx, weapon, x, y, r, t, swing, state) {
    ctx.save();
    ctx.translate(x, y);
    if (weapon === 'sword') {
      ctx.rotate(-0.6 + swing * 1.4);
      ctx.strokeStyle = '#c9ccd4'; ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 1.1); ctx.stroke();
      ctx.strokeStyle = '#6d4a2e'; ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath(); ctx.moveTo(-r * 0.14, -r * 0.16); ctx.lineTo(r * 0.14, -r * 0.16); ctx.stroke();
    } else if (weapon === 'spear') {
      ctx.rotate(-0.25 + swing * 0.9);
      ctx.strokeStyle = '#8a6f4a'; ctx.lineWidth = Math.max(2, r * 0.07);
      ctx.beginPath(); ctx.moveTo(0, r * 0.5); ctx.lineTo(0, -r * 1.5); ctx.stroke();
      ctx.fillStyle = '#c9ccd4';
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 1.45); ctx.lineTo(0, -r * 1.8); ctx.lineTo(r * 0.1, -r * 1.45); ctx.fill();
    } else if (weapon === 'bow') {
      ctx.rotate(0.15);
      const draw = state === 'attack' ? 0.5 + 0.5 * Math.sin(t * 12) : 0.15;
      ctx.strokeStyle = '#6d4a2e'; ctx.lineWidth = Math.max(2, r * 0.07);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.75, -1.25, 1.25); ctx.stroke();
      ctx.strokeStyle = '#e8e3d4'; ctx.lineWidth = 1;
      const bx = Math.cos(1.25) * r * 0.75, by = Math.sin(1.25) * r * 0.75;
      ctx.beginPath(); ctx.moveTo(bx, -by); ctx.lineTo(-draw * r * 0.5, 0); ctx.lineTo(bx, by); ctx.stroke();
      if (state === 'attack') {
        ctx.strokeStyle = '#a8a29a';
        ctx.beginPath(); ctx.moveTo(-draw * r * 0.5, 0); ctx.lineTo(r * 0.8, 0); ctx.stroke();
      }
    } else if (weapon === 'hammer') {
      ctx.rotate(-0.5 + swing * 1.2);
      ctx.strokeStyle = '#8a6f4a'; ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.95); ctx.stroke();
      ctx.fillStyle = '#9aa0ab';
      ctx.fillRect(-r * 0.3, -r * 1.25, r * 0.6, r * 0.35);
    } else if (weapon === 'flask') {
      const shake = state === 'special' ? Math.sin(t * 16) * 0.2 : 0;
      ctx.rotate(shake);
      ctx.fillStyle = '#7ec8e388';
      ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.1); ctx.lineTo(-r * 0.2, r * 0.25); ctx.lineTo(r * 0.2, r * 0.25); ctx.lineTo(r * 0.12, -r * 0.1); ctx.fill();
      ctx.strokeStyle = '#e8e3d4'; ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.25); ctx.lineTo(-r * 0.1, -r * 0.05); ctx.moveTo(r * 0.1, -r * 0.25); ctx.lineTo(r * 0.1, -r * 0.05); ctx.stroke();
    }
    ctx.restore();
  }

  function drawMiniAcorn(ctx, x, y, r, t, col, capCol) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.05);
    ctx.quadraticCurveTo(-r * 0.65, r * 0.7, 0, r * 0.7);
    ctx.quadraticCurveTo(r * 0.65, r * 0.7, r * 0.6, -r * 0.05);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = capCol;
    ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r * 0.68, r * 0.38, 0, Math.PI, TAU); ctx.fill();
    ctx.restore();
  }
  SPR.drawMiniAcorn = drawMiniAcorn;

  /* ============ TYNDAEL — living flame ============ */
  function drawFlame(ctx, o, t, state) {
    const sp = o.sp, r = o.r;
    const heat = o.heat != null ? o.heat : 0.7;
    const hover = Math.sin(t * 3) * r * 0.12;
    const flick = Math.sin(t * 11) * 0.15 + Math.sin(t * 23) * 0.08;
    /* wings — many-colored */
    for (const s of [-1, 1]) {
      const flap = Math.sin(t * 7) * 0.5;
      const g = ctx.createLinearGradient(0, 0, s * r * 1.6, -r);
      g.addColorStop(0, sp.color + 'ee');
      g.addColorStop(0.6, '#e84a8a99');
      g.addColorStop(1, '#7a4ae855');
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(0, hover);
      ctx.rotate(s * (0.25 + flap * 0.35));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * r * 1.4, -r * 1.1, s * r * 1.8, -r * 0.2);
      ctx.quadraticCurveTo(s * r * 0.9, r * 0.25, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    /* round flame body */
    const bg = ctx.createRadialGradient(0, hover, r * 0.1, 0, hover, r * (0.75 + flick));
    bg.addColorStop(0, '#fff3c8');
    bg.addColorStop(0.4, sp.color2 || '#ffd24a');
    bg.addColorStop(1, sp.color + (heat > 0.6 ? 'ff' : 'cc'));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, hover, r * (0.7 + flick * 0.5), 0, TAU); ctx.fill();
    /* eyes */
    ctx.fillStyle = '#2a1005';
    ctx.beginPath(); ctx.arc(r * 0.2, hover - r * 0.1, r * 0.09, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.45, hover - r * 0.1, r * 0.09, 0, TAU); ctx.fill();
    /* crown of fire — size/color reflects heat & age */
    const crownN = 3 + Math.round(heat * 4);
    for (let i = 0; i < crownN; i++) {
      const a = -Math.PI / 2 + (i - (crownN - 1) / 2) * 0.35;
      const fh = r * (0.5 + heat * 0.6) * (0.7 + 0.3 * Math.sin(t * 9 + i * 2));
      ctx.strokeStyle = 'hsl(' + (20 + heat * 30 - i * 6) + ',95%,' + (55 + heat * 12) + '%)';
      ctx.lineWidth = Math.max(2, r * 0.12); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.5, hover + Math.sin(a) * r * 0.55);
      ctx.lineTo(Math.cos(a) * (r * 0.5 + fh), hover + Math.sin(a) * (r * 0.55 + fh));
      ctx.stroke();
    }
    /* dangling legs that never touch the ground */
    ctx.strokeStyle = sp.color; ctx.lineWidth = Math.max(2, r * 0.09);
    for (const s of [-0.3, 0.3]) {
      ctx.beginPath(); ctx.moveTo(s * r, hover + r * 0.6);
      ctx.lineTo(s * r + Math.sin(t * 4 + s * 8) * r * 0.1, hover + r * 1.1); ctx.stroke();
    }
    /* breath fire special */
    if (state === 'special' || state === 'attack') {
      const g = ctx.createLinearGradient(r * 0.5, hover, r * 2.6, hover);
      g.addColorStop(0, '#fff3c8ee'); g.addColorStop(1, sp.color + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(r * 0.5, hover);
      ctx.lineTo(r * 2.6, hover - r * 0.7 * (0.8 + 0.2 * Math.sin(t * 17)));
      ctx.lineTo(r * 2.6, hover + r * 0.7 * (0.8 + 0.2 * Math.cos(t * 15)));
      ctx.closePath(); ctx.fill();
    }
  }

  /* ============ MAKARI SWARM ============ */
  function drawSwarm(ctx, o, t, state) {
    const sp = o.sp, r = o.r;
    const frac = o.swarmFrac != null ? o.swarmFrac : 1;
    const n = Math.max(2, Math.round(14 * frac));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * (1.2 + (i % 3) * 0.4);
      const rad = r * (0.4 + 0.6 * ((i * 37 % 10) / 10)) * (state === 'attack' ? 1.2 : 1);
      const x = Math.cos(a + Math.sin(t * 2 + i) * 0.6) * rad;
      const y = Math.sin(a * 1.3 + t) * rad * 0.7;
      const cols = ['#c2b23a', '#3b9ae1', '#e8842c', '#4caf50'];
      ctx.fillStyle = cols[i % 4];
      ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, r * 0.09), 0, TAU); ctx.fill();
      /* tiny wings */
      ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 2, y - 3 + Math.sin(t * 30 + i) * 1.5); ctx.stroke();
    }
  }

  /* ============ TREE (Albali Aagac) ============ */
  function drawTree(ctx, o, t, state) {
    const sp = o.sp, r = o.r;
    const sway = Math.sin(t * 1.2) * 0.04;
    ctx.strokeStyle = sp.color2 || '#6d4a2e'; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.quadraticCurveTo(sway * r * 2, 0, sway * r * 4, -r * 0.7); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const bx = sway * r * 4 + (i - 1) * r * 0.5, by = -r * (0.6 + i * 0.15);
      ctx.fillStyle = shade(sp.color, i * 8 - 8);
      ctx.beginPath(); ctx.arc(bx, by, r * (0.55 - i * 0.08), 0, TAU); ctx.fill();
    }
    /* fruit dots */
    ctx.fillStyle = '#d9a441';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(Math.sin(i * 2.1) * r * 0.5 + sway * r * 4, -r * 0.65 + Math.cos(i * 1.7) * r * 0.3, r * 0.07, 0, TAU); ctx.fill();
    }
  }

  /* ============ BLOB (buds, fruit, sprengju) ============ */
  function drawBlob(ctx, o, t, state) {
    const sp = o.sp, r = o.r;
    const puls = 1 + Math.sin(t * 3) * 0.06;
    const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.8 * puls);
    g.addColorStop(0, shade(sp.color, 30));
    g.addColorStop(1, shade(sp.color, -15));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.75 * puls, 0, TAU); ctx.fill();
    ctx.strokeStyle = sp.color2; ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.quadraticCurveTo(r * 0.2, -r * 1.0, r * 0.1, -r * 1.15); ctx.stroke();
    if (sp.features.glow) {
      ctx.fillStyle = '#fff8';
      ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.2, r * 0.16, 0, TAU); ctx.fill();
    }
  }

  /* ============ JU FIELD ============ */
  function drawField(ctx, o, t, state) {
    const sp = o.sp, r = o.r;
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU;
      const x = Math.cos(a) * r * 0.7, y = Math.sin(a) * r * 0.45;
      /* carrot top */
      ctx.strokeStyle = sp.color2; ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath(); ctx.moveTo(x, y - r * 0.1); ctx.lineTo(x - r * 0.06, y - r * 0.28); ctx.moveTo(x, y - r * 0.1); ctx.lineTo(x + r * 0.07, y - r * 0.3); ctx.stroke();
      /* carrot body */
      ctx.fillStyle = sp.color;
      ctx.beginPath(); ctx.moveTo(x - r * 0.09, y - r * 0.1); ctx.lineTo(x, y + r * 0.22); ctx.lineTo(x + r * 0.09, y - r * 0.1); ctx.closePath(); ctx.fill();
    }
  }

  /* ============ RELIC SHARD (sprengju shaving) ============ */
  function drawRelicShard(ctx, o, t, state) {
    const sp = o.sp, r = o.r;
    const hover = Math.sin(t * 2.2) * r * 0.1;
    ctx.save(); ctx.translate(0, hover); ctx.rotate(Math.sin(t * 1.1) * 0.15);
    const g = ctx.createLinearGradient(-r * 0.4, -r * 0.6, r * 0.4, r * 0.6);
    g.addColorStop(0, shade(sp.color, 35)); g.addColorStop(1, shade(sp.color, -30));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.75); ctx.lineTo(r * 0.4, -r * 0.1); ctx.lineTo(r * 0.15, r * 0.7); ctx.lineTo(-r * 0.3, r * 0.35); ctx.lineTo(-r * 0.35, -r * 0.25);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = sp.color2 + 'cc'; ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.stroke();
    /* rune */
    ctx.strokeStyle = sp.color2;
    ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.3); ctx.lineTo(r * 0.1, 0); ctx.lineTo(-r * 0.1, r * 0.3); ctx.stroke();
    ctx.restore();
  }

  /* ============ CRAB (Raf Krabbi) ============ */
  function drawCrab(ctx, o, t, state) {
    const sp = o.sp, r = o.r;
    const moving = state === 'walk' || state === 'run';
    const scuttle = moving ? Math.sin(t * 16) : 0;
    const y0 = 0;
    /* legs — 3 per side */
    ctx.strokeStyle = shade(sp.color, -35); ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const sw = moving ? Math.sin(t * 16 + i * 2) * 0.25 : 0.05;
        ctx.beginPath();
        ctx.moveTo(s * r * 0.5, y0 + r * 0.1 - i * r * 0.12);
        ctx.lineTo(s * (r * 0.95 + Math.abs(sw) * r * 0.2), y0 + r * 0.55 - i * r * 0.1 + sw * r * 0.15);
        ctx.stroke();
      }
    }
    /* plated body */
    const g = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.4);
    g.addColorStop(0, shade(sp.color, 20)); g.addColorStop(1, shade(sp.color, -25));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, y0, r * 0.75, r * 0.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = shade(sp.color, -50); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, y0, r * 0.5, r * 0.32, 0, 0, TAU); ctx.stroke();
    /* eyes on stalks */
    ctx.strokeStyle = shade(sp.color, -40); ctx.lineWidth = Math.max(1, r * 0.06);
    for (const s of [-0.25, 0.25]) {
      ctx.beginPath(); ctx.moveTo(s * r, y0 - r * 0.4); ctx.lineTo(s * r, y0 - r * 0.7); ctx.stroke();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(s * r, y0 - r * 0.72, Math.max(1, r * 0.08), 0, TAU); ctx.fill();
    }
    /* claws */
    const snap = state === 'attack' ? Math.abs(Math.sin(t * 18)) : 0.15;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * r * 0.85, y0 - r * 0.05);
      ctx.rotate(s * -0.35);
      ctx.fillStyle = shade(sp.color, 8);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.32, r * 0.22, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = shade(sp.color, -15);
      ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.lineTo(s * r * 0.4, -r * (0.25 + snap * 0.25)); ctx.lineTo(s * r * 0.3, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, r * 0.08); ctx.lineTo(s * r * 0.42, r * (0.2 + snap * 0.1)); ctx.lineTo(s * r * 0.3, 0); ctx.fill();
      ctx.restore();
    }
    /* electric arcs when charged / special */
    if (state === 'special' || (o.charged && Math.sin(t * 8) > 0)) {
      ctx.strokeStyle = sp.color2 || '#7ec8e3'; ctx.lineWidth = Math.max(1, r * 0.06);
      for (let i = 0; i < 4; i++) {
        const a = t * 5 + i * TAU / 4;
        let x = Math.cos(a) * r * 0.6, y = Math.sin(a) * r * 0.4;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let sgm = 0; sgm < 3; sgm++) {
          x += (Math.sin(t * 31 + i + sgm * 7) * r * 0.25);
          y -= r * 0.18;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }

  /* ============ RUBBERMCFLY — ball, beak, butterfly wings, two legs (§6) ============ */
  function drawMcFly(ctx, o, t, state) {
    const sp = o.sp, r = o.r;
    const hover = Math.sin(t * 3.2) * r * 0.1;
    const flap = Math.sin(t * 10);
    /* butterfly wings — two pairs, colorful */
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * r * 0.18, hover - r * 0.1);
      ctx.rotate(side * flap * 0.45);
      const wg = ctx.createRadialGradient(side * r * 0.5, -r * 0.2, 2, side * r * 0.5, -r * 0.2, r * 0.75);
      wg.addColorStop(0, '#e8a4d8dd'); wg.addColorStop(0.6, sp.color2 + 'cc'); wg.addColorStop(1, '#68e0e866');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.ellipse(side * r * 0.55, -r * 0.3, r * 0.52, r * 0.34, side * 0.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(side * r * 0.45, r * 0.18, r * 0.36, r * 0.24, side * -0.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.lineTo(side * r * 0.8, -r * 0.4); ctx.stroke();
      ctx.restore();
    }
    /* two little legs */
    ctx.strokeStyle = shade(sp.color, -45); ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.lineCap = 'round';
    for (const side of [-0.3, 0.3]) {
      ctx.beginPath(); ctx.moveTo(side * r, hover + r * 0.45);
      ctx.lineTo(side * r + Math.sin(t * 5 + side * 9) * r * 0.06, hover + r * 0.85); ctx.stroke();
    }
    /* ball body */
    const bg = ctx.createRadialGradient(-r * 0.15, hover - r * 0.15, 2, 0, hover, r * 0.55);
    bg.addColorStop(0, shade(sp.color, 30)); bg.addColorStop(1, shade(sp.color, -12));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, hover, r * 0.52, 0, TAU); ctx.fill();
    /* beak */
    ctx.fillStyle = '#d9a441';
    ctx.beginPath();
    ctx.moveTo(r * 0.42, hover - r * 0.05);
    ctx.lineTo(r * 0.78, hover + r * 0.03 + (state === 'special' ? Math.sin(t * 12) * r * 0.05 : 0));
    ctx.lineTo(r * 0.42, hover + r * 0.14);
    ctx.closePath(); ctx.fill();
    /* eyes */
    ctx.fillStyle = '#241a10';
    ctx.beginPath(); ctx.arc(r * 0.2, hover - r * 0.12, Math.max(1, r * 0.08), 0, TAU); ctx.fill();
  }

  /* ============ BIRD RIG — Kuni & Albali Byrds read as real birds (§6) ============ */
  function drawBird(ctx, o, t, state) {
    const sp = o.sp, r = o.r, F = sp.features || {};
    const moving = state === 'walk' || state === 'run';
    const idleBob = state === 'idle' ? Math.sin(t * 2.4) * r * 0.05 : 0;
    const attackLunge = state === 'attack' || state === 'special' ? Math.max(0, Math.sin(t * 12)) * r * 0.3 : 0;
    const y0 = -r * 0.15 + idleBob;
    const flap = Math.sin(t * (moving || state === 'special' ? 13 : 4.5));
    /* far wing */
    ctx.fillStyle = shade(sp.color, -28);
    ctx.save();
    ctx.translate(-r * 0.1, y0 - r * 0.25);
    ctx.rotate(-0.35 - flap * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-r * 0.9, -r * 0.75, -r * 1.45, -r * 0.28);
    ctx.quadraticCurveTo(-r * 0.85, 0.06 * r, 0, 0);
    ctx.fill();
    ctx.restore();
    /* tail feathers */
    ctx.fillStyle = shade(sp.color, -16);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, y0 + r * 0.1);
      ctx.lineTo(-r * (1.15 + Math.abs(i) * 0.05), y0 + r * 0.28 + i * r * 0.14 + flap * r * 0.03);
      ctx.lineTo(-r * 0.55, y0 + r * 0.3);
      ctx.closePath(); ctx.fill();
    }
    /* legs + talons */
    ctx.strokeStyle = '#d9a441'; ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.lineCap = 'round';
    for (const side of [-0.18, 0.22]) {
      const sw = moving ? Math.sin(t * 12 + side * 20) * r * 0.12 : 0;
      ctx.beginPath(); ctx.moveTo(side * r, y0 + r * 0.55);
      ctx.lineTo(side * r + sw, r * 0.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(side * r + sw - r * 0.09, r * 0.88); ctx.lineTo(side * r + sw + r * 0.12, r * 0.88); ctx.stroke();
    }
    /* body — upright bird oval */
    const grd = ctx.createLinearGradient(0, y0 - r * 0.6, 0, y0 + r * 0.6);
    grd.addColorStop(0, shade(sp.color, 22)); grd.addColorStop(1, shade(sp.color, -16));
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(attackLunge * 0.3, y0, r * 0.52, r * 0.66, -0.18, 0, TAU); ctx.fill();
    /* breast feather texture */
    ctx.strokeStyle = shade(sp.color, -30) + '66'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(r * 0.12, y0 + r * 0.1 + i * r * 0.14, r * 0.2, 0.6, 2.4); ctx.stroke();
    }
    /* head + beak */
    const hx = r * 0.42 + attackLunge, hy = y0 - r * 0.62;
    ctx.fillStyle = shade(sp.color, 14);
    ctx.beginPath(); ctx.arc(hx, hy, r * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = F.feral ? '#8a2a2a' : '#d9a441';
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.22, hy - r * 0.06);
    ctx.lineTo(hx + r * (0.62 + (state === 'attack' ? 0.1 : 0)), hy + r * 0.05);
    ctx.lineTo(hx + r * 0.22, hy + r * 0.14);
    ctx.closePath(); ctx.fill();
    /* hooked tip for raptors */
    ctx.beginPath(); ctx.moveTo(hx + r * 0.6, hy + r * 0.02); ctx.lineTo(hx + r * 0.56, hy + r * 0.16); ctx.lineTo(hx + r * 0.46, hy + r * 0.08); ctx.fill();
    /* eye */
    ctx.fillStyle = '#241a10';
    ctx.beginPath(); ctx.arc(hx + r * 0.06, hy - r * 0.06, Math.max(1, r * 0.07), 0, TAU); ctx.fill();
    /* Albali: five horns with healing film */
    if (F.horns) {
      ctx.strokeStyle = sp.color2 || '#b03030'; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a = -2.1 + i * 0.3;
        ctx.beginPath(); ctx.moveTo(hx, hy - r * 0.2);
        ctx.lineTo(hx + Math.cos(a) * r * 0.55, hy - r * 0.2 + Math.sin(a) * r * 0.55); ctx.stroke();
      }
    }
    /* near wing */
    ctx.fillStyle = shade(sp.color, -8);
    ctx.save();
    ctx.translate(r * 0.05, y0 - r * 0.2);
    ctx.rotate(-0.25 + flap * 0.55);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-r * 1.0, -r * 0.85, -r * 1.55, -r * 0.3);
    ctx.quadraticCurveTo(-r * 0.9, r * 0.1, 0, 0);
    ctx.fill();
    /* wing feather lines */
    ctx.strokeStyle = shade(sp.color, -35) + '88'; ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(-r * 0.2 * i, -r * 0.05 * i);
      ctx.lineTo(-r * (1.3 - 0.1 * i), -r * (0.4 - 0.06 * i)); ctx.stroke();
    }
    ctx.restore();
    /* rider */
    if (F.rider || o.hasRider) drawMiniAcorn(ctx, -r * 0.12, y0 - r * 0.75, r * 0.34, t, '#c8a05c', '#6d4a2e');
  }

  /* ============ PLAYER SEAL — engraved coin crest (§3) ============ */
  const sealCache = {};
  SPR.PATTERNS = ['runes', 'laurel', 'dots', 'waves', 'chevrons', 'stars', 'vines', 'knots'];
  SPR.drawSeal = function (ctx, x, y, R, seal, opts) {
    seal = seal || { avatarIdx: 0, patterns: [] };
    opts = opts || {};
    const key = (seal.avatarIdx || 0) + ':' + (seal.patterns || []).join(',') + ':' + Math.round(R);
    let cv = sealCache[key];
    if (!cv) {
      cv = document.createElement('canvas');
      const S = Math.max(24, Math.ceil(R * 2));
      cv.width = S; cv.height = S;
      renderSeal(cv.getContext('2d'), S / 2, seal);
      sealCache[key] = cv;
    }
    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
    ctx.drawImage(cv, x - R, y - R, R * 2, R * 2);
    ctx.restore();
  };

  function renderSeal(ctx, R, seal) {
    const gold = '#d9b87a';
    /* coin disc */
    ctx.fillStyle = '#241d14';
    ctx.beginPath(); ctx.arc(R, R, R * 0.98, 0, TAU); ctx.fill();
    ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1, R * 0.05);
    ctx.beginPath(); ctx.arc(R, R, R * 0.94, 0, TAU); ctx.stroke();
    ctx.lineWidth = Math.max(0.7, R * 0.025);
    ctx.beginPath(); ctx.arc(R, R, R * 0.58, 0, TAU); ctx.stroke();
    /* outer ring: up to two engraved patterns */
    const pats = (seal.patterns || []).slice(0, 2);
    pats.forEach((p, pi) => {
      const rr = R * (pats.length === 1 ? 0.76 : pi === 0 ? 0.82 : 0.68);
      drawPatternRing(ctx, R, rr, p, gold);
    });
    /* center: engraving-style acorn portrait (line work, no fill color) */
    ctx.save();
    ctx.translate(R, R * 1.08);
    ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1, R * 0.045); ctx.lineJoin = 'round';
    const r = R * 0.34;
    const idx = seal.avatarIdx || 0;
    ctx.beginPath(); /* acorn body */
    ctx.moveTo(-r, -r * 0.1);
    ctx.quadraticCurveTo(-r * 1.05, r * 1.05, 0, r * 1.05);
    ctx.quadraticCurveTo(r * 1.05, r * 1.05, r, -r * 0.1);
    ctx.stroke();
    if (idx % 5 === 4) { /* pointed cap */
      ctx.beginPath(); ctx.moveTo(-r * 1.05, -r * 0.05); ctx.lineTo(0, -r * 1.4); ctx.lineTo(r * 1.05, -r * 0.05); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(0, -r * 0.14, r * 1.08, r * 0.48, 0, Math.PI, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.16, -r * 0.95); ctx.stroke();
    }
    /* eyes */
    ctx.fillStyle = gold;
    ctx.beginPath(); ctx.arc(-r * 0.35, r * 0.22, r * 0.09, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.35, r * 0.22, r * 0.09, 0, TAU); ctx.fill();
    if (idx >= 7 && idx % 2 === 1) { /* eyepatch line */
      ctx.beginPath(); ctx.arc(r * 0.35, r * 0.22, r * 0.17, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  function drawPatternRing(ctx, R, rr, pattern, gold) {
    ctx.save();
    ctx.strokeStyle = gold; ctx.fillStyle = gold;
    ctx.lineWidth = Math.max(0.7, R * 0.03); ctx.lineCap = 'round';
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      ctx.save();
      ctx.translate(R + Math.cos(a) * rr, R + Math.sin(a) * rr);
      ctx.rotate(a + Math.PI / 2);
      const u = R * 0.07;
      switch (pattern) {
        case 'runes':
          ctx.strokeRect(-u * 0.5, -u, u, u * 2);
          ctx.beginPath(); ctx.moveTo(-u * 0.5, 0); ctx.lineTo(u * 0.5, i % 2 ? -u * 0.6 : u * 0.6); ctx.stroke();
          break;
        case 'laurel':
          ctx.beginPath(); ctx.ellipse(0, 0, u * 0.5, u * 1.1, 0.5, 0, TAU); ctx.stroke();
          break;
        case 'dots':
          ctx.beginPath(); ctx.arc(0, 0, u * 0.45, 0, TAU); ctx.fill();
          break;
        case 'waves':
          ctx.beginPath(); ctx.moveTo(-u, 0); ctx.quadraticCurveTo(-u * 0.3, -u, 0, 0); ctx.quadraticCurveTo(u * 0.3, u, u, 0); ctx.stroke();
          break;
        case 'chevrons':
          ctx.beginPath(); ctx.moveTo(-u * 0.7, u * 0.5); ctx.lineTo(0, -u * 0.6); ctx.lineTo(u * 0.7, u * 0.5); ctx.stroke();
          break;
        case 'stars':
          for (let k = 0; k < 4; k++) {
            const sa = k / 4 * TAU;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(sa) * u * 0.8, Math.sin(sa) * u * 0.8); ctx.stroke();
          }
          break;
        case 'vines':
          ctx.beginPath(); ctx.moveTo(-u, u * 0.4); ctx.quadraticCurveTo(0, -u * 1.1, u, u * 0.4); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, -u * 0.4, u * 0.2, 0, TAU); ctx.fill();
          break;
        case 'knots':
          ctx.beginPath(); ctx.arc(-u * 0.3, 0, u * 0.45, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.arc(u * 0.3, 0, u * 0.45, 0, TAU); ctx.stroke();
          break;
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /* ============ token coin (loading screen, market, okid) ============ */
  SPR.drawCoin = function (ctx, x, y, R, t, sp, opts) {
    opts = opts || {};
    ctx.save();
    ctx.translate(x, y);
    const wobble = Math.cos(t * (opts.spinRate || 1.6));
    const w = Math.max(0.08, Math.abs(wobble));
    ctx.scale(w, 1);
    /* rim */
    const g = ctx.createLinearGradient(-R, -R, R, R);
    g.addColorStop(0, '#d9b87a'); g.addColorStop(0.5, '#8a6f42'); g.addColorStop(1, '#5c4a2c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2f1d';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.86, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4d3f28';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.8, 0, TAU); ctx.fill();
    /* engraved creature (only on "front" face) */
    if (wobble > 0.15 && sp) {
      SPR.draw(ctx, { sp, r: R * 0.45, state: 'idle', t, facing: 1, alpha: 0.9, shimmer: false, biolum: false });
    } else if (wobble <= 0.15) {
      /* back face: vein pattern where NgAkara was poured */
      ctx.strokeStyle = '#68e0e877'; ctx.lineWidth = Math.max(1, R * 0.04);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU + 0.4;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a) * R * 0.4, Math.sin(a) * R * 0.4, Math.cos(a + 0.5) * R * 0.7, Math.sin(a + 0.5) * R * 0.7);
        ctx.stroke();
      }
    }
    /* rim runes */
    ctx.fillStyle = '#d9b87a66';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + t * 0.1;
      ctx.save();
      ctx.translate(Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillRect(-R * 0.02, -R * 0.04, R * 0.04, R * 0.08);
      ctx.restore();
    }
    ctx.restore();
  };

  /* ============ avatar portraits (illustrated acorn folk) ============ */
  SPR.AVATAR_COUNT = 17;
  SPR.drawAvatar = function (ctx, idx, size) {
    const rng = new DYA.util.Rng(1000 + idx * 77);
    const skin = ['#c8a05c', '#b8905c', '#d4b078', '#a3814e', '#9c8f7d', '#c9995c'][idx % 6];
    const cap = ['#6d4a2e', '#4a4238', '#7a3f1c', '#43572f', '#5a3a75', '#31576b'][(idx * 3 + 1) % 6];
    const bg = ['#2a2f3a', '#33658a22', '#4caf5022', '#e8842c22', '#5a3a7533', '#1e3f57'][(idx * 5 + 2) % 6];
    ctx.save();
    ctx.fillStyle = bg || '#2a2f3a';
    ctx.fillRect(0, 0, size, size);
    ctx.translate(size / 2, size * 0.58);
    const r = size * 0.33;
    /* acorn head/body portrait */
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.1);
    ctx.quadraticCurveTo(-r * 1.05, r * 1.1, 0, r * 1.1);
    ctx.quadraticCurveTo(r * 1.05, r * 1.1, r, -r * 0.1);
    ctx.closePath(); ctx.fill();
    /* eyes + markings */
    ctx.fillStyle = '#241a10';
    const eyeY = r * 0.25, eyeDx = r * 0.35;
    ctx.beginPath(); ctx.arc(-eyeDx, eyeY, r * 0.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeDx, eyeY, r * 0.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#241a1088'; ctx.lineWidth = Math.max(1, size * 0.012);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * eyeDx - r * 0.08, eyeY + r * 0.2);
      ctx.lineTo(s * eyeDx + r * 0.08, eyeY + r * 0.35); ctx.stroke();
      if (idx % 3 === 0) { ctx.beginPath(); ctx.moveTo(s * eyeDx + r * 0.1, eyeY + r * 0.2); ctx.lineTo(s * eyeDx - r * 0.05, eyeY + r * 0.38); ctx.stroke(); }
    }
    /* mouth */
    ctx.strokeStyle = '#241a10aa'; ctx.lineWidth = Math.max(1, size * 0.014);
    ctx.beginPath();
    if (idx % 4 === 0) ctx.arc(0, r * 0.62, r * 0.18, 0.2, Math.PI - 0.2);
    else if (idx % 4 === 1) { ctx.moveTo(-r * 0.15, r * 0.68); ctx.lineTo(r * 0.15, r * 0.68); }
    else if (idx % 4 === 2) ctx.arc(0, r * 0.85, r * 0.16, Math.PI + 0.4, TAU - 0.4);
    else { ctx.moveTo(-r * 0.12, r * 0.66); ctx.quadraticCurveTo(0, r * 0.74, r * 0.12, r * 0.64); }
    ctx.stroke();
    /* cap — style varies */
    ctx.fillStyle = cap;
    if (idx % 5 === 4) { // pointed
      ctx.beginPath(); ctx.moveTo(-r * 1.05, 0); ctx.lineTo(0, -r * 1.5); ctx.lineTo(r * 1.05, 0); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(0, -r * 0.12, r * 1.08, r * (0.5 + (idx % 3) * 0.1), 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = shade(cap, -25); ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.3, -r * 0.15); ctx.lineTo(i * r * 0.34, -r * 0.5); ctx.stroke(); }
      ctx.strokeStyle = shade(cap, -35); ctx.lineWidth = Math.max(2, size * 0.02);
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.15, -r * 0.95); ctx.stroke();
    }
    /* accessories by index */
    if (idx >= 7 && idx % 2 === 1) { // eyepatch
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(eyeDx, eyeY, r * 0.16, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = Math.max(1, size * 0.012);
      ctx.beginPath(); ctx.moveTo(eyeDx - r * 0.2, eyeY - r * 0.1); ctx.lineTo(r * 0.95, -r * 0.05); ctx.stroke();
    }
    if (idx >= 10 && idx % 3 === 0) { // guild pin
      ctx.fillStyle = '#d9b87a';
      ctx.beginPath(); ctx.arc(-r * 0.7, r * 0.85, r * 0.12, 0, TAU); ctx.fill();
    }
    if (idx >= 13) { // stygian sheen
      ctx.strokeStyle = '#7a4ae866'; ctx.lineWidth = Math.max(2, size * 0.02);
      ctx.beginPath(); ctx.arc(0, r * 0.05, r * 1.25, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  };

  /* ============ Guild seal ============ */
  SPR.drawGuildSeal = function (ctx, x, y, R) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#8a1c1c';
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#d9b87a'; ctx.lineWidth = Math.max(1.5, R * 0.09);
    ctx.beginPath(); ctx.arc(0, 0, R * 0.82, 0, TAU); ctx.stroke();
    /* three planets */
    ctx.fillStyle = '#d9b87a';
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * TAU / 3;
      ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42, R * (0.2 - i * 0.04), 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  DYA.sprites = SPR;
})();
