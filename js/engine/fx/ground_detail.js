/* ============================================================
   Match visual: GROUND DETAIL
   Paints terrain texture over the flat field — grass blades,
   pebbles, cracks, dune ripples, ash, flagstones — chosen from the
   terrain's feature list, plus soft light from Pia'don's star in
   the upper left. Built once per match into an offscreen canvas,
   so it costs one drawImage per frame.
   Delete this file (and its <script> line) to remove it.
   ============================================================ */
(function () {
  'use strict';
  const FX = DYA.matchFx, U = DYA.util, SPR = DYA.sprites;
  if (!FX) return;
  const TAU = Math.PI * 2;

  function build(M) {
    const W = M.world.w, H = M.world.h, T = M.terrain;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const rng = new U.Rng((M.seed ^ 0x6a17) >>> 0);
    const f = new Set(T.features || []);
    const dark = SPR.shade(T.ground, -22), light = SPR.shade(T.ground, 18), acc = T.accent;

    /* fine speckle so the ground never reads as a flat fill */
    for (let i = 0; i < 4200; i++) {
      g.fillStyle = rng.next() < 0.5 ? dark + '30' : light + '26';
      g.fillRect(rng.next() * W, rng.next() * H, 1.4, 1.4);
    }
    /* larger soft patches */
    for (let i = 0; i < 26; i++) {
      const x = rng.next() * W, y = rng.next() * H, r = 60 + rng.next() * 140;
      const pg = g.createRadialGradient(x, y, 0, x, y, r);
      const c = rng.next() < 0.5 ? dark : light;
      pg.addColorStop(0, c + '22'); pg.addColorStop(1, c + '00');
      g.fillStyle = pg; g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, TAU); g.fill();
    }
    if (f.has('grass') || f.has('trees') || f.has('glowmoss')) {
      g.lineCap = 'round';
      for (let i = 0; i < 1300; i++) {
        const x = rng.next() * W, y = rng.next() * H, h = 5 + rng.next() * 8;
        g.strokeStyle = (rng.next() < 0.6 ? light : acc) + '88'; g.lineWidth = 1.3;
        for (let k = -1; k <= 1; k++) {
          g.beginPath(); g.moveTo(x + k * 2, y); g.quadraticCurveTo(x + k * 2.5, y - h * 0.6, x + k * 4 + (rng.next() - 0.5) * 2, y - h); g.stroke();
        }
      }
    }
    if (f.has('rocks') || f.has('cliffs') || f.has('spires')) {
      for (let i = 0; i < 260; i++) {
        const x = rng.next() * W, y = rng.next() * H, r = 1.5 + rng.next() * 3.5;
        g.fillStyle = '#00000026'; g.beginPath(); g.ellipse(x + 1, y + 1.2, r, r * 0.7, 0, 0, TAU); g.fill();
        g.fillStyle = SPR.shade('#8a8578', (rng.next() - 0.5) * 30); g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, TAU); g.fill();
      }
    }
    if (f.has('cliffs') || f.has('spires') || f.has('dunes')) {      /* cracks */
      g.strokeStyle = dark + '55'; g.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        let x = rng.next() * W, y = rng.next() * H;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (rng.next() - 0.5) * 30; y += (rng.next() - 0.3) * 18; g.lineTo(x, y); }
        g.stroke();
      }
    }
    if (f.has('dunes')) {                                              /* wind ripples */
      g.strokeStyle = light + '44'; g.lineWidth = 1.4;
      for (let i = 0; i < 90; i++) {
        const x = rng.next() * W, y = rng.next() * H, len = 40 + rng.next() * 70;
        g.beginPath(); g.moveTo(x, y);
        g.bezierCurveTo(x + len * 0.3, y - 5, x + len * 0.7, y + 5, x + len, y); g.stroke();
      }
    }
    if (f.has('embers') || f.has('firetrees')) {                       /* ash drifts */
      for (let i = 0; i < 500; i++) {
        g.fillStyle = rng.next() < 0.85 ? '#2a221c44' : '#e8842c55';
        g.fillRect(rng.next() * W, rng.next() * H, 2, 2);
      }
    }
    if (f.has('pillars') || f.has('banners')) {                        /* worn flagstones */
      g.strokeStyle = dark + '40'; g.lineWidth = 1.2;
      for (let y = 0; y < H; y += 46) {
        const off = (y / 46) % 2 ? 0 : 38;
        for (let x = -off; x < W; x += 76) g.strokeRect(x + 2, y + 2, 72 + (rng.next() - 0.5) * 6, 42);
      }
    }
    if (f.has('water')) {                                              /* wet sand sheen */
      const wg = g.createLinearGradient(0, H, 0, H * 0.55);
      wg.addColorStop(0, '#bfe8ff1c'); wg.addColorStop(1, '#bfe8ff00');
      g.fillStyle = wg; g.fillRect(0, 0, W, H);
    }
    /* light from Pia'don's star, upper left */
    const lg = g.createLinearGradient(0, 0, W, H);
    lg.addColorStop(0, '#fff2cc1c'); lg.addColorStop(0.55, '#fff2cc00'); lg.addColorStop(1, '#0000001a');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    return cv;
  }

  FX.register({
    id: 'groundDetail', name: 'Ground detail', heavy: true,
    desc: 'Grass, pebbles, cracks, dune ripples and soft sunlight on the field.',
    ground(ctx, R, M) {
      const S = FX.state(R, 'groundDetail');
      const key = M.terrain.id + ':' + M.seed + ':' + M.world.w + 'x' + M.world.h;
      if (S.key !== key) { S.cv = build(M); S.key = key; }
      ctx.drawImage(S.cv, 0, 0, M.world.w, M.world.h);
    },
  });
})();
