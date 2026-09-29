/* ============================================================
   Match visual: DAMAGE NUMBERS
   Small numbers float up when a creature is hurt (warm) or healed
   (green). Hits landing on the same creature in quick succession
   are summed into one number so the field never floods.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const FX = DYA.matchFx;
  if (!FX) return;
  const MERGE = 0.3, LIFE = 1.1, MAX = 70, MIN_SHOWN = 2;

  FX.register({
    id: 'damageNumbers', name: 'Damage numbers',
    desc: 'Floating numbers for damage and healing (2 or more).',
    world(ctx, R, M, env) {
      const S = FX.state(R, 'damageNumbers', () => ({ list: [] }));
      const L = S.list;
      for (const e of env.events) {
        if (e.type !== 'hit' && e.type !== 'heal') continue;
        const heal = e.type === 'heal';
        const open = L.find(n => n.c === e.c && n.heal === heal && n.age < MERGE);
        if (open) { open.v += e.amount; continue; }
        if (L.length >= MAX) L.shift();
        /* stagger numbers that pop at the same spot so they never stack */
        const near = L.filter(n => n.age < 0.5 && Math.abs(n.x - e.c.x) < 24 && Math.abs(n.y - (e.c.y - e.c.radius * 1.9)) < 24).length;
        L.push({ c: e.c, heal, v: e.amount, age: 0, x: e.c.x + (near % 2 ? 1 : -1) * near * 9 + (Math.random() - 0.5) * 8, y: e.c.y - e.c.radius * 1.9 - near * 12 });
      }
      const dt = Math.min(0.05, env.dt || 0.016);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let w = 0;
      for (const n of L) {
        n.age += dt;
        if (n.age >= LIFE) continue;
        L[w++] = n;
        const v = Math.round(n.v);
        if (v < MIN_SHOWN) continue;   // chip damage stays silent — keeps the field readable
        const big = n.c.maxHp ? Math.min(1, n.v / n.c.maxHp) : 0;
        const size = 13 + big * 14;
        const pop = n.age < 0.12 ? 1 + (0.12 - n.age) * 4 : 1;
        const f = n.age < LIFE * 0.6 ? 1 : 1 - (n.age - LIFE * 0.6) / (LIFE * 0.4);
        ctx.globalAlpha = f;
        ctx.font = 'bold ' + Math.round(size * pop) + 'px Georgia, serif';
        const y = n.y - n.age * 34;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,12,6,0.85)';
        ctx.strokeText((n.heal ? '+' : '') + v, n.x, y);
        ctx.fillStyle = n.heal ? '#8ee89a' : (big > 0.3 ? '#ffb347' : '#ffe6c2');
        ctx.fillText((n.heal ? '+' : '') + v, n.x, y);
      }
      L.length = w;
    },
  });
})();
