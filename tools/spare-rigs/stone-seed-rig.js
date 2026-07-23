/* ============================================================
   SPARE RIG (not wired) — "Stone Seed"
   The original Stryx sprite: a rooted stone-seed pod that grips the
   ground with roots, wears cracked stone armor with a faceted highlight,
   a single watchful biolum eye under a stone brow, a seedling sprout at
   its crown, moss creeping up the base, and 3 grasping vine limbs that
   sway when watching and lash to reach on a strike.

   Saved for reuse on a FUTURE creature (the Stryx itself now shares the
   Gynge boulder + crown vines). This file is standalone and not loaded by
   the game.

   To use it on a new species:
     1. Copy the drawStoneSeed() function below into js/engine/sprites.js
        (alongside the other rig drawers).
     2. Add a dispatch line in SPR.draw:
          else if (rig === 'stoneseed') drawStoneSeed(ctx, o, t, state);
     3. Add 'stoneseed' to the RIGS array in js/ui/admin.js.
     4. Set rig: 'stoneseed' on the species def (sp.color = stone,
        sp.color2 = vine/moss). It relies only on the module-level
        shade() helper and TAU already present in sprites.js.
   ============================================================ */

  /* ============ STRYX — rooted stone-seed with grasping vine limbs ============
     A seed that lands, roots where fortune takes it, and never moves again:
     a boulder-like stone pod gripping the ground with roots, plated and
     cracked (stone armor), a single watchful eye set in the stone, and
     vine limbs that sway when it watches and lash out to its reach when it
     strikes. Legless and stationary by design — walk/run read as idle.
     Colors: sp.color = stone, sp.color2 = vine/moss. */
  function drawStoneSeed(ctx, o, t, state) {
    const sp = o.sp, r = o.r;
    const stone = sp.color || '#7d766a';
    const vine = sp.color2 || '#4d7a44';
    const dormant = state === 'dormant';
    const dead = state === 'death';
    const attack = state === 'attack' || state === 'special';

    const breathe = dead ? 0 : Math.sin(t * 1.6) * r * 0.02;   // faint stone "settle"
    const sink = (dormant ? r * 0.16 : 0) + (dead ? r * 0.1 : 0);
    const groundY = r * 0.85;
    const bodyW = r * 0.8, bodyH = r * 0.92;
    const cy = -r * 0.02 + breathe + sink;   // pod centre
    const topY = cy - bodyH;                  // crown

    /* --- roots: grip the ground, behind everything (pull in when dormant) --- */
    ctx.strokeStyle = shade(vine, -34); ctx.lineCap = 'round';
    const rootN = 5;
    for (let i = 0; i < rootN; i++) {
      const f = rootN === 1 ? 0 : i / (rootN - 1) - 0.5;   // -0.5..0.5
      const grip = dormant ? 0.6 : 1;
      const bx = f * bodyW * 0.5;
      const ex = f * bodyW * 2.5 * grip;
      const flex = Math.sin(t * 1.4 + i) * r * 0.02;
      ctx.lineWidth = Math.max(1.5, r * 0.12 * (1 - Math.abs(f) * 0.5));
      ctx.beginPath();
      ctx.moveTo(bx, cy + bodyH * 0.55);
      ctx.quadraticCurveTo((bx + ex) / 2, groundY - r * 0.05 + flex, ex, groundY + r * 0.05);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(ex, groundY + r * 0.05);
      ctx.lineTo(ex + (f < 0 ? -1 : 1) * r * 0.09, groundY + r * 0.13);
      ctx.stroke();
    }

    /* --- stone pod body (a seed / boulder: pointed crown, rounded base) --- */
    const grd = ctx.createLinearGradient(0, topY, 0, cy + bodyH);
    grd.addColorStop(0, shade(stone, 26));
    grd.addColorStop(1, shade(stone, -22));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.bezierCurveTo(bodyW * 1.05, cy - bodyH * 0.55, bodyW * 0.98, cy + bodyH * 0.6, 0, cy + bodyH);
    ctx.bezierCurveTo(-bodyW * 0.98, cy + bodyH * 0.6, -bodyW * 1.05, cy - bodyH * 0.55, 0, topY);
    ctx.closePath(); ctx.fill();

    /* faceted highlight plane (reads as carved stone) */
    ctx.fillStyle = shade(stone, 16) + '55';
    ctx.beginPath();
    ctx.moveTo(-bodyW * 0.12, topY + bodyH * 0.18);
    ctx.lineTo(bodyW * 0.38, cy - bodyH * 0.15);
    ctx.lineTo(-bodyW * 0.08, cy + bodyH * 0.15);
    ctx.closePath(); ctx.fill();

    /* stone-armor cracks (rocky) */
    ctx.strokeStyle = shade(stone, -50) + 'aa'; ctx.lineWidth = Math.max(1, r * 0.05); ctx.lineCap = 'round';
    const cracks = [[-0.3, -0.5, -0.15, 0.1], [0.35, -0.35, 0.15, 0.2], [0.0, 0.15, -0.28, 0.6], [0.2, 0.35, 0.42, 0.7]];
    cracks.forEach(k => {
      ctx.beginPath();
      ctx.moveTo(k[0] * bodyW, cy + k[1] * bodyH);
      ctx.lineTo(k[2] * bodyW, cy + k[3] * bodyH);
      ctx.stroke();
    });
    if (dead) {   // a broad split opens as it crumbles
      ctx.strokeStyle = shade(stone, -66); ctx.lineWidth = Math.max(1.5, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(-r * 0.05, topY + bodyH * 0.2);
      ctx.lineTo(r * 0.12, cy);
      ctx.lineTo(-r * 0.08, cy + bodyH * 0.7);
      ctx.stroke();
    }

    /* moss / lichen creeping up the base — raised by its surroundings */
    ctx.fillStyle = shade(vine, 4) + 'cc';
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * 0.55 + i * 0.5;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * bodyW * 0.7, cy + bodyH * 0.55 + Math.sin(a) * bodyH * 0.2, r * 0.1, r * 0.06, a, 0, TAU);
      ctx.fill();
    }

    /* seedling sprout at the crown (it began life as a seed) */
    if (!dead) {
      const sway = Math.sin(t * 2) * 0.15;
      ctx.strokeStyle = shade(vine, 10); ctx.lineWidth = Math.max(1.5, r * 0.05);
      ctx.beginPath(); ctx.moveTo(0, topY); ctx.quadraticCurveTo(sway * r, topY - r * 0.2, sway * r * 1.5, topY - r * 0.32); ctx.stroke();
      ctx.fillStyle = shade(vine, 6);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sway * r * 1.2 + s * r * 0.08, topY - r * 0.3, r * 0.09, r * 0.05, s * 0.6 + sway, 0, TAU);
        ctx.fill();
      }
    }

    /* single watchful eye set in the stone */
    const ex0 = bodyW * 0.12, ey0 = cy - bodyH * 0.18, eR = r * 0.24;
    if (dormant || dead) {
      ctx.strokeStyle = shade(stone, -55); ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex0 - eR * 0.9, ey0); ctx.quadraticCurveTo(ex0, ey0 + eR * 0.5, ex0 + eR * 0.9, ey0); ctx.stroke();
    } else {
      ctx.fillStyle = shade(stone, -40);
      ctx.beginPath(); ctx.ellipse(ex0, ey0, eR, eR * 0.8, 0, 0, TAU); ctx.fill();
      const blink = Math.sin(t * 0.6 + (o.phase || 0) * 7) > 0.96 ? 0.14 : 1;   // occasional blink
      ctx.fillStyle = shade(vine, 40);
      ctx.beginPath(); ctx.ellipse(ex0, ey0, eR * 0.8, eR * 0.62 * blink, 0, 0, TAU); ctx.fill();
      if (blink > 0.5) {
        const pupR = eR * (attack ? 0.5 : 0.34), look = attack ? eR * 0.4 : eR * 0.25;
        ctx.fillStyle = '#161410';
        ctx.beginPath(); ctx.arc(ex0 + look, ey0, pupR, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffffbb';
        ctx.beginPath(); ctx.arc(ex0 + look - pupR * 0.3, ey0 - pupR * 0.3, pupR * 0.35, 0, TAU); ctx.fill();
      }
    }
    /* stone brow ridge over the eye */
    ctx.strokeStyle = shade(stone, -30); ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ex0 - eR, ey0 - eR * 0.9); ctx.quadraticCurveTo(ex0, ey0 - eR * 1.25, ex0 + eR * 1.1, ey0 - eR * 0.7); ctx.stroke();

    /* --- vine limbs (in front): sway when watching, lash to reach on strike --- */
    const vineN = 3, reach = r * 1.15, shoulderY = cy - bodyH * 0.45;
    for (let i = 0; i < vineN; i++) {
      const spread = vineN === 1 ? 0 : i / (vineN - 1) - 0.5;   // -0.5..0.5
      const ox = spread * bodyW * 0.7;
      const oy = shoulderY + Math.abs(spread) * bodyH * 0.15;
      let ang, ext;
      if (attack) {
        const lash = Math.max(0, Math.sin(t * 12 - i * 1.2));
        ang = -0.15 + spread * 0.5 - lash * 0.5;   // whip forward
        ext = 1 + lash * 1.0;                       // reach out to strike
      } else if (dormant) {
        ang = 0.7 + spread * 0.5; ext = 0.55;       // coil down against the pod
      } else if (dead) {
        ang = 0.9 + spread * 0.35; ext = 0.6;       // wilt
      } else {
        ang = -Math.PI / 2 + spread * 1.4 + Math.sin(t * 2.2 + i * 1.7) * 0.22;   // reach up, sway
        ext = 1;
      }
      const tipX = ox + Math.cos(ang) * reach * ext, tipY = oy + Math.sin(ang) * reach * ext;
      const midX = ox + Math.cos(ang) * reach * 0.5 * ext - Math.sin(ang) * r * 0.14;
      const midY = oy + Math.sin(ang) * reach * 0.5 * ext;
      ctx.strokeStyle = shade(vine, i === 1 ? 6 : -10); ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.stroke();
      /* curled grasping tip — clenches on attack, limp when dead */
      const curl = attack ? 1.1 : (dead ? 0.2 : 0.55 + Math.sin(t * 3 + i) * 0.2);
      ctx.beginPath(); ctx.arc(tipX, tipY, r * 0.1, ang, ang + Math.PI * 1.5 * curl); ctx.stroke();
      /* a leaf partway along */
      if (!dead) {
        ctx.fillStyle = shade(vine, -6);
        ctx.beginPath(); ctx.ellipse(midX, midY, r * 0.12, r * 0.06, ang, 0, TAU); ctx.fill();
      }
    }
  }
