/* ============================================================
   Character look: LIVING MOTION
   Creatures breathe while idle, lean into a run, and stretch into
   their strikes — squash and stretch anchored at their feet.
   Rooted things (trees, fields, shards) stay still.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const CL = DYA.charLooks;
  if (!CL) return;
  const STILL = { tree: 1, field: 1, relic: 1, blob: 1, gynge: 1 };

  CL.register({
    id: 'livingMotion', name: 'Living motion',
    desc: 'Breathing at rest, leaning into a run, stretching into strikes.',
    pose(ctx, o, t, state) {
      const sp = o.sp;
      if (STILL[sp.rig] || (sp.tags && sp.tags.includes('stationary')) || state === 'death' || state === 'dormant') return;
      const r = o.r, foot = r * 0.9;
      let sx = 1, sy = 1, lean = 0;
      if (state === 'idle') { const b = Math.sin(t * 2.1) * 0.025; sx = 1 + b; sy = 1 - b; }
      else if (state === 'walk') lean = 0.05;
      else if (state === 'run') { lean = 0.1; sx = 1.04; sy = 0.97; }
      else if (state === 'attack' || state === 'special') { const k = Math.max(0, Math.sin(t * 12)); sx = 1 + k * 0.1; sy = 1 - k * 0.06; lean = k * 0.08; }
      else if (state === 'hit') { sx = 0.94; sy = 1.06; lean = -0.08; }
      ctx.translate(0, foot);
      ctx.rotate(lean);
      ctx.scale(sx, sy);
      ctx.translate(0, -foot);
    },
  });
})();
