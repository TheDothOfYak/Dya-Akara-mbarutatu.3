/* ============================================================
   Character look: KEILIA, AS THE ROKARVAC DESCRIBES THEM
   Far larger than the Eikar and built for building. Their hair
   overlaps like armour — growing from the head, and thickest from
   the shoulders, falling to the calf like a cape. Seed beings like
   the Eikar, with the same floating-tool style of drawing.
   Delete this file (and its <script> line) to go back to the
   original Keilia drawing.
   ============================================================ */
(function () {
  'use strict';
  const CL = DYA.charLooks;
  if (!CL) return;
  const TAU = Math.PI * 2, shade = CL.shade;

  /* one row of overlapping hair locks, like shingles */
  function shingles(ctx, x0, x1, y, h, col, n) {
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * (i + 0.5) / n, w = (x1 - x0) / n * 0.75;
      const g = ctx.createLinearGradient(x, y - h * 0.2, x, y + h);
      g.addColorStop(0, shade(col, 16)); g.addColorStop(1, shade(col, -22));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.9, y + h * 0.8, x, y + h);
      ctx.quadraticCurveTo(x + w * 0.9, y + h * 0.8, x + w, y); ctx.closePath(); ctx.fill();
    }
  }

  function draw(ctx, o, t, state) {
    const sp = o.sp, r = o.r, F = sp.features || {};
    const skin = sp.color || '#9c8f7d', hair = sp.color2 || '#4a4238';
    const moving = state === 'walk' || state === 'run';
    const gait = moving ? Math.sin(t * (state === 'run' ? 11 : 7)) : 0;
    const bob = state === 'idle' ? Math.sin(t * 2) * r * 0.03 : moving ? -Math.abs(gait) * r * 0.05 : 0;
    const sway = moving ? gait * 0.05 : Math.sin(t * 1.3) * 0.02;
    const headY = -r * 0.72 + bob, shoulderY = -r * 0.38 + bob, hipY = r * 0.3 + bob;
    const sw = r * 0.44;

    /* the cape of hair behind — shoulders to calf */
    ctx.save(); ctx.translate(-r * 0.06, shoulderY); ctx.rotate(sway);
    for (let row = 0; row < 5; row++) {
      const y = row * r * 0.22, spread = sw * (1.05 + row * 0.07);
      shingles(ctx, -spread - r * 0.05, spread * 0.55, y, r * 0.34, shade(hair, -row * 4), 4);
    }
    ctx.restore();

    /* legs — thick */
    ctx.lineCap = 'round';
    ctx.strokeStyle = shade(skin, -40); ctx.lineWidth = Math.max(3, r * 0.2);
    for (const s of [-1, 1]) {
      const d = moving ? gait * s * r * 0.16 : 0;
      ctx.beginPath(); ctx.moveTo(s * r * 0.17, hipY - r * 0.05); ctx.lineTo(s * r * 0.19 + d, r * 0.86); ctx.stroke();
      ctx.fillStyle = shade(skin, -55);
      ctx.beginPath(); ctx.ellipse(s * r * 0.19 + d + r * 0.05, r * 0.9, r * 0.13, r * 0.065, 0, 0, TAU); ctx.fill();
    }

    /* torso — broad, a seed-shape narrowing to the hips */
    const tg = ctx.createLinearGradient(-sw, shoulderY, sw, hipY);
    tg.addColorStop(0, shade(skin, 22)); tg.addColorStop(1, shade(skin, -24));
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(-sw, shoulderY + r * 0.06);
    ctx.quadraticCurveTo(-sw, shoulderY - r * 0.08, -sw * 0.6, shoulderY - r * 0.08);
    ctx.lineTo(sw * 0.6, shoulderY - r * 0.08);
    ctx.quadraticCurveTo(sw, shoulderY - r * 0.08, sw, shoulderY + r * 0.06);
    ctx.quadraticCurveTo(sw * 0.9, hipY, 0, hipY + r * 0.06);
    ctx.quadraticCurveTo(-sw * 0.9, hipY, -sw, shoulderY + r * 0.06);
    ctx.closePath(); ctx.fill();
    /* grain */
    ctx.save(); ctx.clip();
    ctx.strokeStyle = shade(skin, -30) + '55'; ctx.lineWidth = Math.max(0.6, r * 0.022);
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * sw * 0.26, shoulderY); ctx.lineTo(i * sw * 0.12, hipY); ctx.stroke(); }
    ctx.restore();

    /* the shoulder mantle — the thickest hair, overlapping plates */
    shingles(ctx, -sw * 1.12, sw * 1.02, shoulderY - r * 0.1, r * 0.17, hair, 6);

    /* head, with hair falling from it */
    const hr = r * 0.27, hx = r * 0.08;
    /* hair falls from the back of the head, leaving the face clear */
    shingles(ctx, hx - hr * 1.5, hx - hr * 0.2, headY - hr * 0.3, hr * 1.25, hair, 2);
    const hg = ctx.createRadialGradient(hx - hr * 0.3, headY - hr * 0.3, hr * 0.1, hx, headY, hr);
    hg.addColorStop(0, shade(skin, 28)); hg.addColorStop(1, shade(skin, -18));
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, headY, hr, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(hair, 6);          /* crown of hair, swept back */
    ctx.beginPath(); ctx.ellipse(hx - hr * 0.35, headY - hr * 0.45, hr * 0.95, hr * 0.62, -0.35, Math.PI * 0.9, Math.PI * 2.02); ctx.fill();
    /* face */
    for (const ex of [hx + hr * 0.12, hx + hr * 0.58]) {
      ctx.fillStyle = '#1e140b'; ctx.beginPath(); ctx.ellipse(ex, headY + hr * 0.08, r * 0.045, r * 0.055, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.arc(ex + r * 0.015, headY + hr * 0.02, r * 0.016, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = shade(hair, -10); ctx.lineWidth = Math.max(1, r * 0.035);   /* heavy brow */
    ctx.beginPath(); ctx.moveTo(hx - hr * 0.05, headY - hr * 0.2); ctx.lineTo(hx + hr * 0.78, headY - hr * 0.22); ctx.stroke();
    ctx.strokeStyle = '#1e140b88'; ctx.lineWidth = Math.max(0.8, r * 0.025);
    ctx.beginPath(); ctx.moveTo(hx + hr * 0.2, headY + hr * 0.58); ctx.lineTo(hx + hr * 0.55, headY + hr * 0.54); ctx.stroke();

    /* the floating tool or weapon — larger, as befits a Keilia */
    CL.drawFloatingWeapon(ctx, F.weapon, r * 0.75, -r * 0.1 + bob, r * 0.85, t, state);
  }

  CL.register({
    id: 'keiliaCanon', name: 'Keilia redesign',
    desc: 'Broad Keilia with overlapping hair growing thickest from the shoulders and falling to the calf like a cape.',
    species: sp => sp.family === 'Keilia' && sp.rig === 'biped',
    draw,
  });
})();
