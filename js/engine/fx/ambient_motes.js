/* ============================================================
   Match visual: AMBIENT MOTES
   Life in the air above the field, chosen by terrain: fireflies in
   forests, luminous spores in the Elsha'ryn, embers over the Eldi
   Aagac, drifting dust on dry ground, sea spray on the coast,
   seed fluff on the plains.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const FX = DYA.matchFx;
  if (!FX) return;
  const TAU = Math.PI * 2;

  /* kind → how the motes look and move */
  const KINDS = {
    firefly: { n: 34, col: '#e8f59a', glow: true, sz: 2.2, vx: 6, vy: -4, wob: 22 },
    spore:   { n: 44, col: '#68e0c8', glow: true, sz: 2.0, vx: 4, vy: -8, wob: 16 },
    ember:   { n: 46, col: '#ffa347', glow: true, sz: 1.8, vx: 10, vy: -34, wob: 10 },
    dust:    { n: 40, col: '#e8d8b0', glow: false, sz: 1.6, vx: 38, vy: 2, wob: 8 },
    spray:   { n: 36, col: '#dff4ff', glow: false, sz: 1.8, vx: 24, vy: -6, wob: 12 },
    fluff:   { n: 26, col: '#fbf6e6', glow: false, sz: 2.0, vx: 18, vy: -3, wob: 18 },
  };
  function kindFor(T) {
    const f = new Set(T.features || []);
    if (f.has('glowmoss')) return 'spore';
    if (f.has('embers') || f.has('firetrees')) return 'ember';
    if (f.has('water')) return 'spray';
    if (f.has('dunes') || f.has('cliffs') || f.has('spires') || f.has('pillars')) return 'dust';
    if (f.has('trees')) return 'firefly';
    return 'fluff';
  }

  FX.register({
    id: 'ambientMotes', name: 'Ambient motes', heavy: true,
    desc: 'Fireflies, spores, embers, dust or sea spray drifting over the field, by terrain.',
    world(ctx, R, M, env) {
      const K = KINDS[kindFor(M.terrain)];
      const W = M.world.w, H = M.world.h, t = env.t;
      for (let i = 0; i < K.n; i++) {
        /* stateless: each mote's path is a pure function of its index and time */
        const s1 = (i * 9301 + 49297) % 233280 / 233280, s2 = (i * 4447 + 1123) % 7919 / 7919;
        const x = ((s1 * W + t * K.vx * (0.6 + s2)) % (W + 40) + W + 40) % (W + 40) - 20 + Math.sin(t * 0.9 + i) * K.wob;
        const y = ((s2 * H + t * K.vy * (0.6 + s1)) % (H + 40) + H + 40) % (H + 40) - 20 + Math.cos(t * 0.7 + i * 1.7) * K.wob * 0.6;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.8 + s1) + i));
        if (K.glow) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, K.sz * 4);
          g.addColorStop(0, K.col); g.addColorStop(1, K.col + '00');
          ctx.globalAlpha = 0.55 * tw; ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y, K.sz * 4, 0, TAU); ctx.fill();
        } else {
          ctx.globalAlpha = 0.45 * tw; ctx.fillStyle = K.col;
          ctx.beginPath(); ctx.arc(x, y, K.sz, 0, TAU); ctx.fill();
        }
      }
    },
  });
})();
