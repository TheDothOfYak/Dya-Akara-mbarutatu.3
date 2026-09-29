/* ============================================================
   Match visual: CONTACT SHADOWS
   A soft shadow under every creature so it sits on the ground.
   Flyers cast a smaller, fainter shadow further below them, which
   reads as height.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const FX = DYA.matchFx;
  if (!FX) return;
  const TAU = Math.PI * 2;

  FX.register({
    id: 'contactShadows', name: 'Creature shadows',
    desc: 'Soft ground shadows under creatures; flyers cast theirs from above.',
    under(ctx, R, M) {
      for (const c of M.creatures) {
        if (c.dead || c.inHut || c.onTower || c.riding) continue;
        const r = c.radius * 1.35;
        const fly = c.sp.tags && c.sp.tags.includes('flyer');
        const alpha = (fly ? 0.2 : 0.4) * (c.tetherFrac > 0.8 ? Math.max(0.2, 1 - (c.tetherFrac - 0.8) / 0.2) : 1);
        const y = c.y + r * (fly ? 1.5 : 0.88);
        const rx = r * (fly ? 0.75 : 1.05), ry = r * (fly ? 0.26 : 0.36);
        const g = ctx.createRadialGradient(c.x, y, 0, c.x, y, rx);
        g.addColorStop(0, 'rgba(0,0,0,' + alpha + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(c.x, y, rx, ry, 0, 0, TAU); ctx.fill();
      }
    },
  });
})();
