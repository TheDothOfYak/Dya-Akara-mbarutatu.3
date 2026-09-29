/* ============================================================
   Match visual: PULSE RIPPLE
   When a resource pulse reaches a hoard, a ring of light rolls
   out across the ground from it in that side's colour.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const FX = DYA.matchFx;
  if (!FX) return;
  const TAU = Math.PI * 2, LIFE = 1.1;

  FX.register({
    id: 'pulseRipple', name: 'Pulse ripples',
    desc: 'A ring rolls out from each hoard when resources pulse in.',
    under(ctx, R, M, env) {
      const S = FX.state(R, 'pulseRipple', () => ({ rings: [] }));
      for (const e of env.events) {
        if (e.type !== 'pulse') continue;
        const T = M.teams[e.team];
        S.rings.push({ x: e.x, y: e.y, col: (T && T.color) || '#d9b87a', age: 0 });
      }
      const dt = Math.min(0.05, env.dt || 0.016);
      S.rings = S.rings.filter(r => (r.age += dt) < LIFE);
      for (const r of S.rings) {
        const f = r.age / LIFE, rad = 50 + f * 170;
        ctx.globalAlpha = (1 - f) * 0.8;
        ctx.strokeStyle = r.col; ctx.lineWidth = 4 * (1 - f) + 1;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * 0.62, 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = (1 - f) * 0.35;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, rad * 0.8, rad * 0.5, 0, 0, TAU); ctx.stroke();
      }
    },
  });
})();
