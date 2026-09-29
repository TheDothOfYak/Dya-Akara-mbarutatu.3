/* ============================================================
   Match visual: LIGHTING
   Warm campfire light pooled at each hoard, and a soft vignette
   around the screen that pulls the eye to the fight. During the
   Sunear'Zikhron the vignette cools toward the storm's teal.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const FX = DYA.matchFx;
  if (!FX) return;
  const TAU = Math.PI * 2;

  FX.register({
    id: 'lighting', name: 'Lighting & vignette',
    desc: 'Campfire glow at each hoard and a soft vignette around the view.',
    world(ctx, R, M, env) {
      ctx.globalCompositeOperation = 'lighter';
      for (const T of M.teams) {
        if (!T.hoard || T.controller === 'wild') continue;
        const flick = 1 + Math.sin(env.t * 7.3 + T.idx) * 0.04 + Math.sin(env.t * 13.1 + T.idx * 2) * 0.03;
        const r = 120 * flick;
        const g = ctx.createRadialGradient(T.hoard.x, T.hoard.y, 0, T.hoard.x, T.hoard.y, r);
        g.addColorStop(0, 'rgba(255,190,110,0.22)'); g.addColorStop(1, 'rgba(255,190,110,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(T.hoard.x, T.hoard.y, r, r * 0.7, 0, 0, TAU); ctx.fill();
      }
    },
    /* the vignette is a CSS overlay above the canvas: the compositor draws
       it, so it costs the canvas nothing. It lives inside the match screen,
       so it disappears with it. */
    screen(ctx, R, M) {
      const host = R.canvas.parentNode;
      if (!host) return;
      let v = R._fxVignette;
      if (!v || v.parentNode !== host) {
        v = R._fxVignette = document.createElement('div');
        v.setAttribute('aria-hidden', 'true');
        v.style.cssText = 'position:absolute;inset:0;pointer-events:none;transition:background 1.2s ease';
        host.insertBefore(v, R.canvas.nextSibling);
      }
      /* cools toward the storm's teal during the Sunear'Zikhron */
      const zik = (M.zikFrac ? M.zikFrac() : 0) > 0;
      if (v._zik !== zik) {
        v._zik = zik;
        v.style.background = 'radial-gradient(ellipse at center, transparent 55%, ' + (zik ? 'rgba(6,32,40,.58)' : 'rgba(8,5,2,.5)') + ' 100%)';
      }
    },
  });
})();
