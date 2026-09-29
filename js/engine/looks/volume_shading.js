/* ============================================================
   Character look: VOLUME SHADING
   Light falls on every creature from the upper left (Pia'don's
   star), with shade on the lower right, so flat shapes read as
   rounded bodies. Painted only on the creature itself.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const CL = DYA.charLooks;
  if (!CL) return;

  CL.register({
    id: 'volumeShading', name: 'Volume shading', heavy: true,
    desc: 'Light from the upper left and shade below, so creatures look rounded.',
    finish(lctx, o, t, state, px, P) {
      lctx.globalCompositeOperation = 'source-atop';
      const c = P / 2, R = o.r * px * 1.5;
      const g = lctx.createLinearGradient(c - R, c - R, c + R * 0.8, c + R);
      g.addColorStop(0, 'rgba(255,246,222,0.26)');
      g.addColorStop(0.42, 'rgba(255,246,222,0)');
      g.addColorStop(0.62, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(12,6,2,0.34)');
      lctx.fillStyle = g;
      lctx.fillRect(0, 0, P, P);
    },
  });
})();
