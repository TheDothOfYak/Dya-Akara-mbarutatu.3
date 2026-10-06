/* ============================================================
   Character look: HIT FLASH
   A creature's whole body flashes pale for an instant when it is
   struck — its exact shape, not a circle.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const CL = DYA.charLooks;
  if (!CL) return;
  const seen = new WeakMap();      // creature → { hp, until }
  const FLASH_MS = 110;

  function flashAlpha(o, state) {
    const c = o.creature;
    if (!c) return state === 'hit' ? 0.4 : 0;
    const now = performance.now();
    const rec = seen.get(c) || { hp: c.hp, until: 0 };
    if (c.hp < rec.hp - 0.5) rec.until = now + FLASH_MS;
    rec.hp = c.hp;
    seen.set(c, rec);
    return now < rec.until ? 0.75 * (rec.until - now) / FLASH_MS : 0;
  }

  CL.register({
    id: 'hitFlash', name: 'Hit flash',
    desc: 'Creatures flash pale for an instant when struck.',
    /* only ask for a layer while actually flashing */
    wants(o, t, state) { return flashAlpha(o, state) > 0; },
    finish(lctx, o, t, state, px, P) {
      const a = flashAlpha(o, state);
      if (a <= 0) return;
      lctx.globalCompositeOperation = 'source-atop';
      lctx.fillStyle = 'rgba(255,248,236,' + a + ')';
      lctx.fillRect(0, 0, P, P);
    },
  });
})();
