/* ============================================================
   Match visual: RELIC BEACON
   Each Relic throws a column of light in its owner's colour so it
   can be found at a glance; a carried Relic leaves a trail of
   motes behind its carrier, and a flash marks the moment it is
   picked up.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const FX = DYA.matchFx;
  if (!FX) return;
  const TAU = Math.PI * 2;

  function hexA(hex, a) {
    const h = (hex || '#cbb8f0').replace('#', '').slice(0, 6);
    const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  FX.register({
    id: 'relicBeacon', name: 'Relic beacons',
    desc: 'A light column over each Relic, a trail behind whoever carries it, and a flash on pickup.',
    under(ctx, R, M, env) {
      const S = FX.state(R, 'relicBeacon', () => ({ trail: [], flashes: [] }));
      for (const e of env.events) if (e.type === 'relic') S.flashes.push({ x: e.c.x, y: e.c.y, age: 0 });
      const t = env.t;
      for (const rl of (M.relics || [])) {
        if (rl.disabled || rl.captured) continue;
        const col = M.teams[rl.ownerTeam] ? M.teams[rl.ownerTeam].color : '#cbb8f0';
        const h = 150, w = 16 + Math.sin(t * 2.2) * 3;
        const g = ctx.createLinearGradient(0, rl.y, 0, rl.y - h);
        g.addColorStop(0, hexA(col, 0.32)); g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(rl.x - w, rl.y); ctx.lineTo(rl.x - w * 0.35, rl.y - h);
        ctx.lineTo(rl.x + w * 0.35, rl.y - h); ctx.lineTo(rl.x + w, rl.y); ctx.closePath(); ctx.fill();
        /* ground halo */
        ctx.strokeStyle = hexA(col, 0.35 + 0.2 * Math.sin(t * 3)); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(rl.x, rl.y + 2, 22, 9, 0, 0, TAU); ctx.stroke();
        if (rl.carrier) {
          if (!S.trail.length || Math.hypot(S.trail[S.trail.length - 1].x - rl.x, S.trail[S.trail.length - 1].y - rl.y) > 6) {
            S.trail.push({ x: rl.x, y: rl.y, age: 0, col });
          }
        }
      }
      const dt = Math.min(0.05, env.dt || 0.016);
      S.trail = S.trail.filter(p => (p.age += dt) < 1.2).slice(-80);
      for (const p of S.trail) {
        const f = 1 - p.age / 1.2;
        ctx.fillStyle = hexA(p.col, 0.5 * f);
        ctx.beginPath(); ctx.arc(p.x, p.y - 6 - p.age * 10, 2.5 * f + 0.5, 0, TAU); ctx.fill();
      }
      S.flashes = S.flashes.filter(fl => (fl.age += dt) < 0.7);
      for (const fl of S.flashes) {
        const f = fl.age / 0.7;
        ctx.strokeStyle = 'rgba(232,217,255,' + (1 - f) + ')'; ctx.lineWidth = 3 * (1 - f) + 1;
        ctx.beginPath(); ctx.ellipse(fl.x, fl.y, 12 + f * 70, (12 + f * 70) * 0.45, 0, 0, TAU); ctx.stroke();
      }
    },
  });
})();
