/* ============================================================
   Character look: EIKAR, AS THE CREATOR DRAWS THEM
   From the Rokarvac: Eikar are the acorn people — acorn-textured
   skin, a triangular body, markings beneath the eyes, and an Aagac
   (acorn-cap hat) that is part of their being. On the hat, a symbol
   shows what kind of Eikar they are. They are drawn without hands:
   weapons and tools simply float beside them.
   Delete this file (and its <script> line) to go back to the
   original Eikar drawing.
   ============================================================ */
(function () {
  'use strict';
  const CL = DYA.charLooks;
  if (!CL) return;
  const TAU = Math.PI * 2, shade = CL.shade;

  /* the hat symbol for each kind of Eikar */
  function emblem(ctx, weapon, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#f3dca0'; ctx.fillStyle = '#f3dca0';
    ctx.lineWidth = Math.max(1, s * 0.14); ctx.lineCap = 'round';
    ctx.beginPath();
    if (weapon === 'sword') { ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.moveTo(-s * 0.5, s * 0.35); ctx.lineTo(s * 0.5, s * 0.35); ctx.stroke(); }
    else if (weapon === 'spear') { ctx.moveTo(0, s); ctx.lineTo(0, -s * 0.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.1); ctx.lineTo(0, -s); ctx.lineTo(s * 0.4, -s * 0.1); ctx.closePath(); ctx.fill(); }
    else if (weapon === 'bow') { ctx.arc(-s * 0.3, 0, s * 0.9, -1.1, 1.1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.6, 0); ctx.lineTo(s * 0.8, 0); ctx.stroke(); }
    else if (weapon === 'flask') { ctx.moveTo(-s * 0.2, -s); ctx.lineTo(-s * 0.2, -s * 0.2); ctx.lineTo(-s * 0.7, s * 0.8); ctx.lineTo(s * 0.7, s * 0.8); ctx.lineTo(s * 0.2, -s * 0.2); ctx.lineTo(s * 0.2, -s); ctx.stroke(); }
    else { ctx.arc(0, 0, s * 0.5, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  function draw(ctx, o, t, state) {
    const sp = o.sp, r = o.r, F = sp.features || {};
    const skin = sp.color || '#c8a05c', cap = sp.color2 || '#6d4a2e';
    const moving = state === 'walk' || state === 'run';
    const gait = moving ? Math.sin(t * (state === 'run' ? 13 : 8)) : 0;
    const bob = state === 'idle' ? Math.sin(t * 2.4) * r * 0.035 : moving ? -Math.abs(gait) * r * 0.06 : 0;
    const top = -r * 0.62 + bob, bot = r * 0.42 + bob;   // the body: broad at the top, a rounded point below
    const hw = r * 0.5;

    /* legs — short and sturdy */
    ctx.lineCap = 'round';
    ctx.strokeStyle = shade(skin, -48); ctx.lineWidth = Math.max(2, r * 0.14);
    for (const s of [-1, 1]) {
      const sw = moving ? gait * s * r * 0.2 : 0;
      ctx.beginPath(); ctx.moveTo(s * r * 0.16, bot - r * 0.12); ctx.lineTo(s * r * 0.18 + sw, r * 0.86); ctx.stroke();
      ctx.fillStyle = shade(skin, -58);
      ctx.beginPath(); ctx.ellipse(s * r * 0.18 + sw + r * 0.05, r * 0.88, r * 0.1, r * 0.055, 0, 0, TAU); ctx.fill();
    }

    /* body — a triangle of acorn, rounded at every corner */
    const bg = ctx.createLinearGradient(-hw, top, hw, bot);
    bg.addColorStop(0, shade(skin, 26)); bg.addColorStop(1, shade(skin, -26));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-hw, top + r * 0.12);
    ctx.quadraticCurveTo(-hw, top, -hw * 0.7, top);
    ctx.lineTo(hw * 0.7, top);
    ctx.quadraticCurveTo(hw, top, hw, top + r * 0.12);
    ctx.quadraticCurveTo(hw * 0.75, bot - r * 0.2, r * 0.08, bot);
    ctx.quadraticCurveTo(0, bot + r * 0.04, -r * 0.08, bot);
    ctx.quadraticCurveTo(-hw * 0.75, bot - r * 0.2, -hw, top + r * 0.12);
    ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    /* acorn texture: fine grain lines and a few pores */
    ctx.strokeStyle = shade(skin, -34) + '66'; ctx.lineWidth = Math.max(0.6, r * 0.025);
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * hw * 0.28, top); ctx.quadraticCurveTo(i * hw * 0.22, (top + bot) / 2, i * r * 0.03, bot); ctx.stroke();
    }
    ctx.fillStyle = shade(skin, -40) + '55';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(Math.sin(i * 2.3) * hw * 0.6, top + r * 0.3 + (i % 3) * r * 0.16, r * 0.022, 0, TAU); ctx.fill(); }
    ctx.restore();

    /* face — eyes toward where they're going, markings beneath */
    const ey = top + r * 0.3;
    for (const ex of [r * 0.08, r * 0.3]) {
      ctx.fillStyle = '#1e140b'; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.06, r * 0.075, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.arc(ex + r * 0.02, ey - r * 0.025, r * 0.022, 0, TAU); ctx.fill();
      /* the markings under the eyes */
      ctx.fillStyle = shade(cap, -10);
      ctx.beginPath(); ctx.moveTo(ex - r * 0.05, ey + r * 0.1); ctx.lineTo(ex + r * 0.05, ey + r * 0.1); ctx.lineTo(ex, ey + r * 0.22); ctx.closePath(); ctx.fill();
    }

    /* the Aagac — a scaled acorn cap, its brim, its stem, its symbol */
    const capY = top + r * 0.04, capW = hw * 1.18, capH = r * 0.5;
    const cg = ctx.createLinearGradient(0, capY - capH, 0, capY);
    cg.addColorStop(0, shade(cap, 20)); cg.addColorStop(1, shade(cap, -22));
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.ellipse(0, capY, capW, capH, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = shade(cap, -38); ctx.lineWidth = Math.max(0.7, r * 0.03);
    for (let row = 0; row < 4; row++) {
      const yy = capY - row * capH * 0.26;
      for (let k = -5; k <= 5; k++) {
        const xx = k * capW * 0.2 + (row % 2) * capW * 0.1;
        ctx.beginPath(); ctx.arc(xx, yy, capW * 0.11, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.fillStyle = shade(cap, -30);
    ctx.beginPath(); ctx.ellipse(0, capY, capW * 1.02, r * 0.07, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = shade(cap, -42); ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath(); ctx.moveTo(0, capY - capH * 0.95); ctx.quadraticCurveTo(r * 0.04, capY - capH * 1.25, r * 0.12, capY - capH * 1.35); ctx.stroke();
    emblem(ctx, F.weapon, capW * 0.32, capY - capH * 0.45, r * 0.13);

    /* the floating weapon */
    CL.drawFloatingWeapon(ctx, F.weapon, r * 0.78, -r * 0.05 + bob, r * 0.8, t, state);
  }

  CL.register({
    id: 'eikarCanon', name: 'Eikar redesign',
    desc: 'Acorn-textured Eikar with triangular bodies, eye markings, a hat symbol for their kind, and floating weapons — as the creator draws them.',
    species: sp => sp.family === 'Eikar' && sp.rig === 'biped',
    markings: false,
    draw,
  });
})();
