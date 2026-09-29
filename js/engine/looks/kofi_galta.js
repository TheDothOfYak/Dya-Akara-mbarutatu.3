/* ============================================================
   Character look: THE KOFI GALTA
   From the creator's sketches: a long, crescent-shaped body with
   blade-like spines along the top and a fluffy dark tuft of a
   tail. The world's prey animal — found in every elemental region,
   breeding like bunnies, eaten by nearly everything.
   Applies to the Kofi and Big Momma Kofi.
   Delete this file (and its <script> line) to go back to the
   original Kofi drawing.
   ============================================================ */
(function () {
  'use strict';
  const CL = DYA.charLooks;
  if (!CL) return;
  const TAU = Math.PI * 2, shade = CL.shade;

  function draw(ctx, o, t, state) {
    const sp = o.sp, r = o.r;
    const fur = sp.color || '#c9a26b', dark = shade(sp.color2 || '#8a6f4a', -30);
    const momma = sp.id === 'big_momma_kofi';
    const moving = state === 'walk' || state === 'run';
    const hop = moving ? Math.abs(Math.sin(t * (state === 'run' ? 16 : 10))) : 0;
    const lift = -hop * r * 0.22 + (state === 'idle' ? Math.sin(t * 3) * r * 0.02 : 0);
    const belly = momma ? 0.34 : 0.22;
    ctx.save(); ctx.translate(0, lift);

    /* four little legs */
    ctx.strokeStyle = shade(fur, -45); ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.lineCap = 'round';
    [-0.45, -0.18, 0.18, 0.45].forEach((lx, i) => {
      const kick = moving ? Math.sin(t * 14 + i * 1.6) * r * 0.1 : 0;
      ctx.beginPath(); ctx.moveTo(lx * r, r * 0.3); ctx.lineTo(lx * r + kick, r * 0.72 + hop * r * 0.2); ctx.stroke();
    });

    /* the crescent body — both ends curving up */
    const g = ctx.createLinearGradient(0, -r * 0.4, 0, r * 0.45);
    g.addColorStop(0, shade(fur, 22)); g.addColorStop(1, shade(fur, -20));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, -r * 0.34);                                  // tail tip, raised
    ctx.quadraticCurveTo(-r * 0.6, r * (0.18 + belly), 0, r * (0.26 + belly));   // underside
    ctx.quadraticCurveTo(r * 0.62, r * (0.18 + belly), r * 0.92, -r * 0.22);     // up to the head
    ctx.quadraticCurveTo(r * 0.78, -r * 0.02, r * 0.5, 0);                     // back of the head
    ctx.quadraticCurveTo(0, r * 0.1, -r * 0.55, -r * 0.04);                     // inner curve of the crescent
    ctx.quadraticCurveTo(-r * 0.8, -r * 0.1, -r * 0.95, -r * 0.34);
    ctx.closePath(); ctx.fill();

    /* blade-like spines along the top */
    ctx.fillStyle = shade(fur, -38);
    for (let i = 0; i < 7; i++) {
      const u = i / 6, x = -r * 0.62 + u * r * 1.12;
      const y = r * 0.03 - Math.sin(u * Math.PI) * r * 0.03 + Math.abs(u - 0.5) * r * 0.12 - r * 0.06;
      const h = r * (0.22 + Math.sin(u * Math.PI) * 0.12), lean = -0.25;
      ctx.beginPath(); ctx.moveTo(x - r * 0.06, y + r * 0.04); ctx.lineTo(x + lean * h, y - h); ctx.lineTo(x + r * 0.07, y + r * 0.04); ctx.closePath(); ctx.fill();
    }

    /* the fluffy dark tail tuft */
    ctx.fillStyle = dark;
    for (let i = 0; i < 6; i++) {
      const a = -2.2 + i * 0.35 + Math.sin(t * 4 + i) * 0.08;
      ctx.beginPath(); ctx.arc(-r * 0.95 + Math.cos(a) * r * 0.14, -r * 0.4 + Math.sin(a) * r * 0.14, r * 0.12, 0, TAU); ctx.fill();
    }

    /* head end: an eye and a soft nose */
    ctx.fillStyle = '#1e140b';
    ctx.beginPath(); ctx.arc(r * 0.74, -r * 0.14, Math.max(1, r * 0.07), 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff6e0';
    ctx.beginPath(); ctx.arc(r * 0.76, -r * 0.16, Math.max(0.6, r * 0.025), 0, TAU); ctx.fill();
    ctx.fillStyle = shade(fur, -50);
    ctx.beginPath(); ctx.arc(r * 0.93, -r * 0.2, Math.max(0.8, r * 0.045), 0, TAU); ctx.fill();
    ctx.restore();
  }

  CL.register({
    id: 'kofiGalta', name: 'Kofi Galta redesign',
    desc: 'The Kofi as the creator sketched it: a crescent body with blade-like spines and a dark tail tuft.',
    species: ['kofi', 'big_momma_kofi'],
    draw,
  });
})();
