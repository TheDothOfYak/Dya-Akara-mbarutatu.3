// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   Character look: THE LÚTUT
   Drawn true to the creator's sculpt (art/lutut): a round,
   drop-shaped body that is nearly all head, the front of it one
   great lamprey mouth ringed with teeth that can never close; a
   heavy brow over glowing yellow eyes under clear lids; two horns;
   little spines down the back; four stubby legs; bat wings; and a
   long tail ending in a spiked ball. Near-black, with a violet cast.
   Seen side on, facing right (the game flips it to face left).
   States: idle hovers, walk/run flies, attack sucks (the mouth
   flares and draws in), special screeches (the throat glows red),
   dormant rests on the ground with its wings tucked, death falls.
   Delete this file (and its <script> line) to go back to the
   original Lútut drawing.
   ============================================================ */
(function () {
  'use strict';
  const CL = DYA.charLooks;
  if (!CL) return;
  const TAU = Math.PI * 2;
  const HIDE = '#2b2535', HIDE_LT = '#463d55', HIDE_DK = '#15111b', MEMB = '#241c28', MEMB_LT = '#3a2e40';
  const BONE = '#d8cfbe', BONE_DK = '#8f8574', GULLET = '#3a0c16', EYE = '#ffd040';

  function spikes(ctx, x, y, rad, n, len, rot, fill) {
    ctx.fillStyle = fill;
    for (let i = 0; i < n; i++) {
      const a = rot + i / n * TAU, c = Math.cos(a), s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a - 0.22) * rad, y + Math.sin(a - 0.22) * rad);
      ctx.lineTo(x + c * (rad + len), y + s * (rad + len));
      ctx.lineTo(x + Math.cos(a + 0.22) * rad, y + Math.sin(a + 0.22) * rad);
      ctx.closePath(); ctx.fill();
    }
  }

  /* one bat wing from the shoulder: a long leading edge out to the tip, four finger struts, a scalloped
     trailing edge, a thumb claw at the wrist. ang: + raised. near: drawn over the body, lighter. */
  function wing(ctx, r, sx, sy, ang, fold, near) {
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-ang);
    const span = r * (2.0 - fold * 1.3), lift = r * (0.25 - fold * 0.1);
    const wrist = [-r * 0.15 - span * 0.12, -r * 0.55 + fold * r * 0.25];
    const tips = [[-span * 0.98, -lift - r * 0.62], [-span * 0.86, -lift + r * 0.05], [-span * 0.62, r * 0.32], [-span * 0.36, r * 0.42]];
    const g = ctx.createLinearGradient(0, -r, -span, r * 0.4);
    g.addColorStop(0, near ? MEMB_LT : MEMB); g.addColorStop(1, near ? MEMB : '#1a141e');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(wrist[0], wrist[1]); ctx.lineTo(tips[0][0], tips[0][1]);
    for (let i = 0; i < tips.length - 1; i++) {
      const a = tips[i], b = tips[i + 1];
      ctx.quadraticCurveTo((a[0] + b[0]) / 2 + r * 0.05, (a[1] + b[1]) / 2 - r * 0.02 + r * 0.12, b[0], b[1]);
    }
    ctx.quadraticCurveTo(-span * 0.2, r * 0.36, r * 0.05, r * 0.3);   // the membrane meets the flank
    ctx.closePath(); ctx.fill();
    // the arm and the finger bones
    ctx.strokeStyle = near ? HIDE_LT : HIDE; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(wrist[0], wrist[1]); ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.035);
    for (const tp of tips) { ctx.beginPath(); ctx.moveTo(wrist[0], wrist[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke(); }
    // thumb claw
    ctx.fillStyle = near ? HIDE_LT : HIDE;
    ctx.beginPath(); ctx.moveTo(wrist[0], wrist[1]); ctx.quadraticCurveTo(wrist[0] + r * 0.1, wrist[1] - r * 0.2, wrist[0] + r * 0.18, wrist[1] - r * 0.14);
    ctx.quadraticCurveTo(wrist[0] + r * 0.06, wrist[1] - r * 0.08, wrist[0] + r * 0.03, wrist[1] + r * 0.03); ctx.fill();
    ctx.restore();
  }

  function draw(ctx, o, t, state) {
    const r = o.r;
    const moving = state === 'walk' || state === 'run';
    const dormant = state === 'dormant', dead = state === 'death';
    const suck = state === 'attack', screech = state === 'special';
    const grounded = dormant || dead;
    // the body rides up and down with the wingbeat; it tips forward when it flies, back when it screeches
    const beatRate = moving ? 9 : suck ? 7 : screech ? 14 : 4.5;
    const beat = grounded ? 0 : Math.sin(t * beatRate);
    const bob = grounded ? 0 : -beat * r * 0.06 + Math.sin(t * 1.3) * r * 0.03;
    const tilt = dead ? 0.35 : screech ? -0.22 : moving ? 0.1 : suck ? 0.08 : 0;
    ctx.save();
    ctx.translate(0, bob + (grounded ? r * 0.28 : 0) + (dead ? r * 0.18 : 0));
    ctx.rotate(tilt);
    if (dead) ctx.scale(1, -1);             // fallen, belly up

    const B = { x: r * 0.12, y: 0, rx: r * 0.95, ry: r * 0.78 };   // the drop's round front
    const mouthX = B.x + B.rx * 0.93, mouthY = B.y + r * 0.08;
    const flare = suck ? 1 + 0.25 * (0.5 + 0.5 * Math.sin(t * 16)) : screech ? 1.32 : 1;

    /* ---- far wing (behind everything) ---- */
    const wAng = grounded ? -0.1 : 0.3 + 0.75 * beat + (screech ? 0.3 : 0);   // a full stroke: high on the up, low on the down
    const fold = dormant ? 1 : dead ? 0.6 : 0;
    wing(ctx, r, B.x - r * 0.12, B.y - r * 0.62, wAng + 0.12, fold, false);

    /* ---- the tail: straight out behind, a slow wave down its length, the spiked ball at the end ---- */
    {
      const n = 14, L = r * 2.55;
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = B.x - B.rx * 0.72 - u * L;
        const wave = grounded ? 0 : Math.sin(t * (moving ? 5 : 2.6) - u * 3.2) * r * 0.16 * u;
        const droop = grounded ? r * (0.32 * u + 0.1 * u * u) : r * 0.12 * u * u;
        pts.push([x, B.y + r * 0.02 + droop + wave]);
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < n; i++) {
        const u = i / n;
        ctx.strokeStyle = i % 2 ? HIDE : shade(HIDE, 4);
        ctx.lineWidth = r * (0.36 - u * 0.24);
        ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
      }
      // a paler line along the top of the tail, catching the light
      ctx.strokeStyle = HIDE_LT; ctx.lineWidth = Math.max(1, r * 0.035);
      ctx.beginPath(); pts.forEach((p, i) => { const u = i / n, off = r * (0.17 - u * 0.12); i ? ctx.lineTo(p[0], p[1] - off) : ctx.moveTo(p[0], p[1] - off); }); ctx.stroke();
      const end = pts[n], ball = r * 0.3;
      spikes(ctx, end[0] - ball * 0.6, end[1] + ball * 0.2, ball * 0.85, 11, ball * 0.85, t * 0.4, BONE_DK);
      spikes(ctx, end[0] - ball * 0.6, end[1] + ball * 0.2, ball * 0.85, 11, ball * 0.45, t * 0.4, HIDE_DK);
      const bg = ctx.createRadialGradient(end[0] - ball, end[1] - ball * 0.2, ball * 0.2, end[0] - ball * 0.6, end[1] + ball * 0.2, ball * 1.1);
      bg.addColorStop(0, HIDE_LT); bg.addColorStop(1, HIDE_DK);
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(end[0] - ball * 0.6, end[1] + ball * 0.2, ball, 0, TAU); ctx.fill();
    }

    /* ---- far legs ---- */
    const legs = (near) => {
      ctx.strokeStyle = near ? HIDE : HIDE_DK; ctx.lineCap = 'round';
      [[0.48, 0], [-0.42, 1.6]].forEach(([lx, ph], i) => {
        const x = B.x + lx * r + (near ? r * 0.06 : -r * 0.06), top = B.y + r * 0.5;
        const swing = grounded ? 0 : Math.sin(t * beatRate * 0.5 + ph + (near ? 0 : 1)) * r * 0.05;
        const tuck = moving ? r * 0.12 : 0;
        const foot = grounded ? B.y + r * 0.72 : B.y + r * 0.86 - tuck;
        ctx.lineWidth = r * 0.16;
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + swing - tuck, foot); ctx.stroke();
        ctx.lineWidth = Math.max(1, r * 0.05);
        for (const c of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(x + swing - tuck, foot); ctx.lineTo(x + swing - tuck + r * 0.1 + c * r * 0.05, foot + r * 0.08); ctx.stroke(); }
      });
    };
    legs(false);

    /* ---- the body: a round drop, the front almost all head ---- */
    const g = ctx.createRadialGradient(B.x - r * 0.15, B.y - r * 0.45, r * 0.1, B.x, B.y, B.rx * 1.15);
    g.addColorStop(0, HIDE_LT); g.addColorStop(0.55, HIDE); g.addColorStop(1, HIDE_DK);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(B.x - B.rx * 1.02, B.y + r * 0.02);                                         // where the tail leaves it
    ctx.bezierCurveTo(B.x - B.rx * 0.7, B.y - B.ry * 0.95, B.x + B.rx * 0.55, B.y - B.ry * 1.12, B.x + B.rx, B.y - B.ry * 0.12);
    ctx.bezierCurveTo(B.x + B.rx * 1.06, B.y + B.ry * 0.45, B.x + B.rx * 0.6, B.y + B.ry * 1.02, B.x, B.y + B.ry * 0.98);
    ctx.bezierCurveTo(B.x - B.rx * 0.5, B.y + B.ry * 0.95, B.x - B.rx * 0.85, B.y + B.ry * 0.45, B.x - B.rx * 1.02, B.y + r * 0.02);
    ctx.closePath(); ctx.fill();
    // a little lighter on the belly, the back darker
    ctx.fillStyle = 'rgba(120,100,140,0.10)'; ctx.beginPath(); ctx.ellipse(B.x + r * 0.05, B.y + B.ry * 0.55, B.rx * 0.65, B.ry * 0.28, 0, 0, TAU); ctx.fill();
    // little bumps and spines down the back
    ctx.fillStyle = HIDE_DK;
    for (let i = 0; i < 6; i++) {
      const u = i / 5, a = Math.PI * (1.08 + u * 0.36), x = B.x + Math.cos(a) * B.rx * 0.98, y = B.y + Math.sin(a) * B.ry * 1.02;
      const h = r * (0.09 + (i % 2) * 0.05);
      ctx.beginPath(); ctx.moveTo(x - r * 0.04, y + r * 0.03); ctx.lineTo(x - r * 0.02, y - h); ctx.lineTo(x + r * 0.05, y + r * 0.03); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(70,61,85,0.55)';
    for (let i = 0; i < 9; i++) { const a = 2.2 + i * 0.37, rr = 0.55 + (i % 3) * 0.12; ctx.beginPath(); ctx.arc(B.x + Math.cos(a) * B.rx * rr * 0.9, B.y + Math.sin(a) * B.ry * rr, r * 0.03, 0, TAU); ctx.fill(); }

    /* ---- the mouth: the whole front, a round lamprey mouth seen from the side — always open ---- */
    {
      const mx = mouthX, my = mouthY, mry = r * 0.5 * flare, mrx = r * 0.17 * flare;
      // the lip: a thick fold of hide round the opening
      ctx.fillStyle = HIDE_LT; ctx.beginPath(); ctx.ellipse(mx - r * 0.04, my, mrx * 1.55, mry * 1.1, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = HIDE_DK; ctx.beginPath(); ctx.ellipse(mx - r * 0.02, my, mrx * 1.3, mry * 1.02, 0, 0, TAU); ctx.fill();
      // the gullet: dark, red deep inside; lit when it screeches
      const deep = ctx.createRadialGradient(mx + mrx * 0.3, my, 0, mx, my, mry);
      deep.addColorStop(0, screech ? '#ff5a3a' : GULLET); deep.addColorStop(0.6, screech ? '#9a1a22' : '#1a060a'); deep.addColorStop(1, '#0c0306');
      ctx.fillStyle = deep; ctx.beginPath(); ctx.ellipse(mx, my, mrx, mry, 0, 0, TAU); ctx.fill();
      // rings of teeth round the rim, pointing in
      for (let i = 0; i < 13; i++) {
        const a = -Math.PI / 2 + (i / 12) * Math.PI, c = Math.cos(a), s = Math.sin(a);
        const bx = mx + c * mrx * 1.05 - mrx * 0.15, by = my + s * mry * 0.98;
        const tl = r * (0.17 + (i % 2) * 0.07) * (1 - Math.abs(s) * 0.3);
        ctx.fillStyle = i % 2 ? BONE_DK : BONE;
        ctx.beginPath(); ctx.moveTo(bx - r * 0.02, by - r * 0.045); ctx.lineTo(bx + tl * 0.7, by - s * tl * 0.95); ctx.lineTo(bx - r * 0.02, by + r * 0.045); ctx.closePath(); ctx.fill();
      }
    }

    /* ---- the brow, the eye under it, the horns ---- */
    {
      const ex = B.x + B.rx * 0.58, ey = B.y - B.ry * 0.5;
      // the eye: a yellow dome under a clear lid; its glow stays on the eye
      if (!dead) {
        ctx.save();
        ctx.shadowColor = 'rgba(255,200,60,0.85)'; ctx.shadowBlur = r * 0.12;
        const eg = ctx.createRadialGradient(ex + r * 0.02, ey - r * 0.02, 0, ex, ey, r * 0.13);
        eg.addColorStop(0, '#fff2a0'); eg.addColorStop(0.5, EYE); eg.addColorStop(1, '#c08a10');
        ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.13, r * 0.1, -0.25, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, r * 0.02);   // the clear lid's gloss
        ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.15, r * 0.12, -0.25, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
      } else {
        ctx.strokeStyle = HIDE_DK; ctx.lineWidth = Math.max(1, r * 0.04); ctx.beginPath(); ctx.moveTo(ex - r * 0.1, ey); ctx.lineTo(ex + r * 0.1, ey); ctx.stroke();
      }
      // the heavy brow, frowning down over it
      ctx.fillStyle = HIDE; ctx.beginPath();
      ctx.moveTo(ex - r * 0.26, ey - r * 0.05); ctx.quadraticCurveTo(ex, ey - r * 0.26, ex + r * 0.26, ey - r * 0.02);
      ctx.quadraticCurveTo(ex + r * 0.05, ey - r * 0.1, ex - r * 0.26, ey - r * 0.05); ctx.fill();
      // the horns: the far one a little behind, then the near one, curving up and back
      const horn = (hx, hy, s, col, tip) => {
        const hg = ctx.createLinearGradient(hx, hy, hx - r * 0.2 * s, hy - r * 0.6 * s);
        hg.addColorStop(0, col); hg.addColorStop(1, tip);
        ctx.fillStyle = hg; ctx.beginPath();
        ctx.moveTo(hx - r * 0.1 * s, hy);
        ctx.quadraticCurveTo(hx - r * 0.06 * s, hy - r * 0.45 * s, hx - r * 0.22 * s, hy - r * 0.62 * s);
        ctx.quadraticCurveTo(hx + r * 0.08 * s, hy - r * 0.4 * s, hx + r * 0.1 * s, hy + r * 0.02);
        ctx.closePath(); ctx.fill();
      };
      horn(ex - r * 0.2, ey - r * 0.22, 0.85, HIDE_DK, '#3e3830');
      horn(ex - r * 0.05, ey - r * 0.18, 1, HIDE, '#6a6052');
    }

    /* ---- near legs and the near wing, over the body ---- */
    legs(true);
    wing(ctx, r, B.x - r * 0.02, B.y - r * 0.55, wAng, fold, true);

    /* ---- what it is doing ---- */
    if (suck) {   // air and grit pulled in toward the mouth
      ctx.strokeStyle = 'rgba(210,200,230,0.45)'; ctx.lineWidth = Math.max(1, r * 0.03); ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const k = (t * 1.8 + i / 6) % 1, a = (i / 6 - 0.5) * 1.6, d = r * (1.9 - k * 1.5);
        const x = mouthX + Math.cos(a) * d, y = mouthY + Math.sin(a) * d;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * r * 0.22, y - Math.sin(a) * r * 0.22); ctx.stroke();
      }
    }
    if (screech) {  // the screech rings out of the mouth
      ctx.lineWidth = Math.max(1, r * 0.05);
      for (let i = 0; i < 3; i++) {
        const k = (t * 1.6 + i / 3) % 1;
        ctx.strokeStyle = 'rgba(255,150,150,' + (0.6 * (1 - k)) + ')';
        ctx.beginPath(); ctx.arc(mouthX, mouthY, r * (0.4 + k * 1.6), -0.9, 0.9); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function shade(hex, amt) { return CL.shade ? CL.shade(hex, amt) : hex; }

  CL.register({ id: 'lututLook', name: 'The Lútut', desc: 'The Lútut drawn from its sculpt: side on, all mouth, horns, glowing eyes and a spiked tail.', species: ['lutut'], draw });
})();
