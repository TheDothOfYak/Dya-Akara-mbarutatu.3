/* ============================================================
   Match visual: HIT SPARKS & FALLS
   Sparks fly when a creature takes a hit — tinted by its element —
   and when one falls, a puff of dust and a mote of its truth rises
   and fades.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const FX = DYA.matchFx, SP = DYA.species;
  if (!FX) return;
  const TAU = Math.PI * 2;
  const MAX = 420;

  function colorOf(c) { return (SP.ELEMENT_COLORS && SP.ELEMENT_COLORS[c.element || c.sp.element]) || '#ffe8c8'; }

  FX.register({
    id: 'hitSparks', name: 'Hit sparks & falls',
    desc: 'Element-tinted sparks on hits; dust and a rising mote when a creature falls.',
    world(ctx, R, M, env) {
      const S = FX.state(R, 'hitSparks', () => ({ p: [] }));
      const P = S.p;
      for (const e of env.events) {
        if (e.type === 'hit') {
          const c = e.c, frac = Math.min(1, e.amount / Math.max(1, c.maxHp));
          const n = Math.min(10, 3 + Math.round(frac * 22));
          const col = colorOf(c);
          for (let i = 0; i < n && P.length < MAX; i++) {
            const a = Math.random() * TAU, sp = 60 + Math.random() * 140 * (0.5 + frac);
            P.push({ k: 's', x: c.x, y: c.y - c.radius * 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.35 + Math.random() * 0.25, age: 0, col: Math.random() < 0.5 ? '#fff4dc' : col, sz: 1.4 + Math.random() * 1.8 });
          }
        } else if (e.type === 'death') {
          const c = e.c, col = colorOf(c);
          for (let i = 0; i < 14 && P.length < MAX; i++) {
            const a = (i / 14) * TAU;
            P.push({ k: 'd', x: c.x, y: c.y + c.radius * 0.8, vx: Math.cos(a) * (30 + Math.random() * 30), vy: Math.sin(a) * 12, life: 0.9, age: 0, col: 'rgba(170,150,120,', sz: c.radius * 0.35 + 3 });
          }
          P.push({ k: 'm', x: c.x, y: c.y - c.radius, vx: 0, vy: -38, life: 1.6, age: 0, col, sz: Math.max(3, c.radius * 0.28) });
        }
      }
      const dt = Math.min(0.05, env.dt || 0.016);
      let w = 0;
      for (let i = 0; i < P.length; i++) {
        const q = P[i];
        q.age += dt;
        if (q.age >= q.life) continue;
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.k === 's') { q.vy += 320 * dt; q.vx *= 0.96; }
        else if (q.k === 'd') { q.vx *= 0.92; q.vy *= 0.92; }
        P[w++] = q;
        const f = 1 - q.age / q.life;
        if (q.k === 's') {
          ctx.globalAlpha = f; ctx.strokeStyle = q.col; ctx.lineWidth = q.sz;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); ctx.stroke();
        } else if (q.k === 'd') {
          ctx.globalAlpha = 1; ctx.fillStyle = q.col + (0.35 * f) + ')';
          ctx.beginPath(); ctx.arc(q.x, q.y, q.sz * (1.6 - f * 0.6), 0, TAU); ctx.fill();
        } else {
          ctx.globalAlpha = f;
          const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.sz * 3);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, q.col); g.addColorStop(1, q.col + '00');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x + Math.sin(q.age * 5) * 4, q.y, q.sz * 3, 0, TAU); ctx.fill();
        }
      }
      P.length = w;
    },
  });
})();
