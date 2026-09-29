/* ============================================================
   Match visual: ARENA FRAME
   Darkens the field toward its edges and rings the arena in a
   leather-and-gold border, so the playing field reads as a place.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const FX = DYA.matchFx;
  if (!FX) return;

  FX.register({
    id: 'arenaFrame', name: 'Arena frame',
    desc: 'Shaded edges and a gold-trimmed border around the field.',
    ground(ctx, R, M) {
      const W = M.world.w, H = M.world.h, E = 70;
      const edge = (x0, y0, x1, y1) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, 'rgba(10,8,5,0.42)'); g.addColorStop(1, 'rgba(10,8,5,0)');
        return g;
      };
      ctx.fillStyle = edge(0, 0, 0, E); ctx.fillRect(0, 0, W, E);
      ctx.fillStyle = edge(0, H, 0, H - E); ctx.fillRect(0, H - E, W, E);
      ctx.fillStyle = edge(0, 0, E, 0); ctx.fillRect(0, 0, E, H);
      ctx.fillStyle = edge(W, 0, W - E, 0); ctx.fillRect(W - E, 0, E, H);
    },
    world(ctx, R, M) {
      const W = M.world.w, H = M.world.h;
      /* leather band just outside the field */
      ctx.strokeStyle = '#2a2016'; ctx.lineWidth = 14;
      ctx.strokeRect(-7, -7, W + 14, H + 14);
      ctx.strokeStyle = '#8a6f42'; ctx.lineWidth = 2;
      ctx.strokeRect(-1, -1, W + 2, H + 2);
      ctx.strokeStyle = '#d9b87a55'; ctx.lineWidth = 1;
      ctx.strokeRect(-12, -12, W + 24, H + 24);
      /* studs at the corners and midpoints */
      ctx.fillStyle = '#d9b87a';
      [[0, 0], [W / 2, 0], [W, 0], [0, H / 2], [W, H / 2], [0, H], [W / 2, H], [W, H]].forEach(([x, y]) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      });
    },
  });
})();
