/* ============================================================
   Character look: INK OUTLINE
   A thin dark outline around every creature, like an inked
   drawing — keeps them readable against any ground.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const CL = DYA.charLooks;
  if (!CL) return;
  let sil = null, sctx = null;

  CL.register({
    id: 'inkOutline', name: 'Ink outline', heavy: true,
    desc: 'A thin dark outline around creatures so they stand out from the ground.',
    /* drawn inside the creature's own small layer: a dark copy of its
       silhouette, nudged four ways, slipped in behind the body */
    finish(lctx, o, t, state, px, P) {
      if (!sil) { sil = document.createElement('canvas'); sctx = sil.getContext('2d'); }
      if (sil.width < P || sil.height < P) { sil.width = Math.max(P, sil.width); sil.height = Math.max(P, sil.height); }
      sctx.globalCompositeOperation = 'copy';
      sctx.drawImage(lctx.canvas, 0, 0, P, P, 0, 0, P, P);
      sctx.globalCompositeOperation = 'source-in';
      sctx.fillStyle = 'rgba(26,16,8,0.82)';
      sctx.fillRect(0, 0, P, P);
      const w = Math.max(1, Math.min(2.2, o.r * px * 0.07));
      lctx.globalCompositeOperation = 'destination-over';
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) lctx.drawImage(sil, 0, 0, P, P, dx * w, dy * w, P, P);
    },
  });
})();
