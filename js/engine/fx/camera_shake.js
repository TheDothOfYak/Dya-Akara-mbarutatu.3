/* ============================================================
   Match visual: CAMERA SHAKE
   The view jolts when something big falls, a boss is struck hard,
   or the ShurgrEdan answers. Brief and small; off automatically
   when the player's system asks for reduced motion. Only the
   picture moves — clicks and drags still land where you aim.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const FX = DYA.matchFx;
  if (!FX) return;

  FX.register({
    id: 'cameraShake', name: 'Camera shake',
    desc: 'A short jolt when big creatures fall or the ShurgrEdan strikes.',
    begin(ctx, R, M, env) {
      if (FX.reducedMotion) return;
      const S = FX.state(R, 'cameraShake', () => ({ amp: 0, seenStrike: new WeakSet() }));
      for (const e of env.events) {
        if (e.type === 'death' && e.c.radius >= 20) S.amp = Math.max(S.amp, Math.min(9, e.c.radius * 0.22));
        else if (e.type === 'hit' && e.c.isBoss && e.amount > e.c.maxHp * 0.04) S.amp = Math.max(S.amp, 4);
      }
      for (const fx of (M.effects || [])) {
        if (fx.type === 'shurgredan' && !S.seenStrike.has(fx)) { S.seenStrike.add(fx); S.amp = 14; }
      }
      if (S.amp < 0.2) { S.amp = 0; return; }
      const a = S.amp;
      ctx.translate((Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a);
      S.amp *= Math.pow(0.02, Math.min(0.05, env.dt || 0.016));   // ~0.3s decay
    },
  });
})();
