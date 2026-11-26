// 4 Brothers World V3 — part 6: boulder rocks, a darker Rock World, chunky boss pixels, 1x1 / 2x2 mining on T.
//  * Rock heroes, rock villagers and every other rock are rounded boulders now, drawn at twice the detail.
//    Body: Round, Egg or Lumpy boulder (replaces Tall / Stocky / Slim: old heroes get the nearest one).
//    Arms: Stubby (short round arms), Long (hang to the knees) or Pebble (little floating pebble fists).
//    Moves: Trundle, Tumble (rolls, face and all), Wobble, Bounce or Scuttle. Each has its own walk and its own
//    run (hold Shift). They are only looks: every rock walks, runs and fights exactly the same.
//    Rock type colours, toppers, cracks, eyes, eye glow and mouths all carry over. The creator shows each choice moving.
//    (The choices travel to other players inside the "shape" field as body.arms.move, so nothing new is needed online.)
//  * Rock World underground is very dark: tunnels and wild caves are nearly black, the towns a little brighter.
//    A rock's own eye glow only reaches a few blocks down there; glow trinkets (v3s7) light more.
//  * The Leviathan, its guardians and the boss effects are drawn on a 1-pixel-per-unit layer: chunky like the heroes.
//  * The rock's 2x2 mining is a toggle now: T switches between 1x1 and 2x2. The target outline shows the 2x2 square,
//    and the hotbar says "2x2". The off-hand torch key is gone: a torch only lights when you hold it.
(function (RW) {
  'use strict';
  const A = RW.art, E = RW.ent, P = RW.player, WD = RW.world, U = RW.ui, N = RW.net, TS = RW.TILE;
  if (!A || !E || !P || !WD) return;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d'); c.ctx.imageSmoothingEnabled = false; return c; };

  // ================================= 1. boulder rocks =================================
  const BODIES = { round: 'Round boulder', egg: 'Egg boulder', lumpy: 'Lumpy boulder' };
  const ARMS = { stubby: 'Stubby arms', long: 'Long arms', pebble: 'Pebble fists' };
  const MOVES = { trundle: 'Trundle', tumble: 'Tumble', wobble: 'Wobble', bounce: 'Bounce', scuttle: 'Scuttle' };
  const OLD = { tall: 'egg', stocky: 'round', slim: 'lumpy' };
  const parse = (shape) => { const p = String(shape || 'round').split('.'); return { body: BODIES[p[0]] ? p[0] : OLD[p[0]] || 'round', arms: ARMS[p[1]] ? p[1] : 'stubby', move: MOVES[p[2]] ? p[2] : 'trundle' }; };
  const join = (o) => o.body + '.' + o.arms + '.' + o.move;
  // the creator lists three bodies; every combination (and the old names) still counts as a valid shape online
  const S2 = {}; Object.keys(BODIES).forEach((k) => (S2[k] = BODIES[k]));
  Object.keys(BODIES).forEach((b) => Object.keys(ARMS).forEach((a) => Object.keys(MOVES).forEach((m) => Object.defineProperty(S2, b + '.' + a + '.' + m, { value: BODIES[b], enumerable: false }))));
  Object.keys(OLD).forEach((k) => Object.defineProperty(S2, k, { value: BODIES[OLD[k]], enumerable: false }));
  RW.SHAPES = S2; RW.ROCK_BODIES = BODIES; RW.ROCK_ARMS = ARMS; RW.ROCK_MOVES = MOVES;
  if (A.DEFAULT_LOOK && A.DEFAULT_LOOK.shape === 'tall') A.DEFAULT_LOOK.shape = 'round.stubby.trundle';
  const baseRandomLook = A.randomLook;
  if (baseRandomLook) A.randomLook = function () { const l = baseRandomLook.apply(this, arguments); l.shape = join({ body: RW.pick(Object.keys(BODIES)), arms: RW.pick(Object.keys(ARMS)), move: RW.pick(Object.keys(MOVES)) }); return l; };

  const BAYER = [[0, 0.5], [0.75, 0.25]];
  const mix = (a, b, k) => RW.mix(a, b, k);
  // the boulder itself (face, cracks, topper) at twice the detail, facing right, centred at (40, 52) on an 80x84 sheet
  function boulder(look, P0) {
    const c = mk(80, 84), g = c.ctx, C = A.rockColors(look), rt = C.rt;
    const mid = mix(C.base, C.dark, 0.5), deep = RW.shade(C.dark, -0.3);
    const { body } = P0, cx = 40, cy = 52;
    const rx = body === 'egg' ? 17 : 20, ry = body === 'egg' ? 23 : body === 'lumpy' ? 18 : 19;
    const seed = RW.hash2((look.rock || 'g').length, (look.hue || 0) + 50, 3) * 6.28;
    const R = (a) => body === 'lumpy' ? 1 + 0.07 * Math.sin(a * 5 + seed) + 0.05 * Math.sin(a * 9 + seed * 2) + 0.03 * Math.sin(a * 13) : 1;
    const inside = (x, y) => { let X = x / rx, Y = y / ry; if (body === 'egg') X = x / (rx * (1 + 0.14 * Math.max(-1, Math.min(1, y / ry)))); const d = Math.hypot(X, Y); return d <= R(Math.atan2(Y, X)) ? d / R(Math.atan2(Y, X)) : -1; };
    for (let y = -ry - 3; y <= ry + 3; y++) for (let x = -rx - 4; x <= rx + 4; x++) {
      const d = inside(x, y); if (d < 0) continue;
      const nx = x / rx, ny = y / ry;
      let l = 0.62 - nx * 0.22 - ny * 0.5 - Math.max(0, d - 0.82) * 0.9 + (BAYER[(y + 60) & 1][(x + 60) & 1] - 0.375) * 0.16;
      if (rt.bands && ((y + 40) % 9 < 2)) l += 0.18;
      let col = l > 0.78 ? C.light : l > 0.42 ? C.base : l > 0.12 ? mid : C.dark;
      if (d > 0.93 && ny > -0.2) col = mix(col, deep, 0.5);
      const h = RW.hash2(x + 90, y + 90, 77);
      if (h > 0.93) col = C.fleck[0]; else if (h < 0.035 && C.fleck[1]) col = C.fleck[1];
      A.px(g, cx + x, cy + y, col);
    }
    if (rt.veins) for (let t = -1; t <= 1; t += 0.02) { const x = Math.round(t * rx * 0.8), y = Math.round(Math.sin(t * 3) * 5 - 2); if (inside(x, y) > 0) A.px(g, cx + x, cy + y, C.dark); }
    if (rt.gloss) { for (let k = 0; k < 7; k++) { A.px(g, cx - 9 + k, cy - ry + 5 + (k >> 1), '#9a90b4'); A.px(g, cx - 9 + k, cy - ry + 6 + (k >> 1), '#7a7096'); } }
    // cracks
    const crack = look.cracks || 'bolt', cc = crack === 'magma' ? '#ff6a2a' : RW.shade(C.dark, -0.45);
    const L = (x0, y0, x1, y1, col) => A.line(g, cx + x0, cy + y0, cx + x1, cy + y1, col || cc);
    if (crack === 'bolt' || crack === 'magma') { let x = -2, y = -ry + 3; const pts = [[x, y]]; for (let k = 0; k < 5; k++) { x += k % 2 ? -4 : 4; y += Math.ceil(ry * 1.7 / 5); pts.push([x, y]); } for (let k = 0; k < pts.length - 1; k++) { L(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]); L(pts[k][0] + 1, pts[k][1], pts[k + 1][0] + 1, pts[k + 1][1]); } if (crack === 'magma') pts.forEach(([a, b]) => A.px(g, cx + a, cy + b, '#ffd08a')); }
    else if (crack === 'web') { L(-6, -6, 0, 2); L(0, 2, 7, -3); L(0, 2, -2, 11); L(-9, 7, -2, 11); L(7, -3, 11, 4); }
    else if (crack === 'split') { L(-3, -ry + 2, -1, ry - 2); L(-2, -ry + 2, 0, ry - 2); }
    // face: three-quarters to the right
    const glow = RW.GLOWS[look.glow] || look.glow || RW.GLOWS.amber, eyes = look.eyes || 'round';
    const ex = Math.round(rx * 0.34), ey = Math.round(-ry * 0.2);
    A.rect(g, cx + ex - 9, cy + ey - 1, 16, 6, RW.shade(C.dark, -0.25));
    if (eyes === 'cyclops') { A.rect(g, cx + ex - 3, cy + ey, 6, 4, glow); A.rect(g, cx + ex - 1, cy + ey, 2, 2, '#ffffff'); }
    else if (eyes === 'narrow') { A.rect(g, cx + ex - 7, cy + ey + 2, 4, 2, glow); A.rect(g, cx + ex + 1, cy + ey + 2, 4, 2, glow); }
    else if (eyes === 'sleepy') { A.rect(g, cx + ex - 7, cy + ey + 2, 4, 2, glow); A.rect(g, cx + ex + 1, cy + ey + 2, 4, 2, glow); A.rect(g, cx + ex - 8, cy + ey, 15, 2, C.dark); }
    else { A.rect(g, cx + ex - 7, cy + ey, 4, 4, glow); A.rect(g, cx + ex + 1, cy + ey, 4, 4, glow); A.rect(g, cx + ex - 7, cy + ey, 2, 2, '#ffffff'); A.rect(g, cx + ex + 1, cy + ey, 2, 2, '#ffffff'); }
    const my = cy + ey + 9, mouth = look.mouth || 'none', mc = RW.shade(C.dark, -0.45);
    if (mouth === 'line') A.rect(g, cx + ex - 3, my, 7, 2, mc);
    else if (mouth === 'grin') { A.rect(g, cx + ex - 5, my, 11, 2, mc); A.rect(g, cx + ex - 6, my - 2, 2, 2, mc); A.rect(g, cx + ex + 5, my - 2, 2, 2, mc); }
    else if (mouth === 'beard') for (let k = 0; k < 14; k++) A.line(g, cx + ex - 8 + k, my - 1, cx + ex - 8 + k, my + 3 + (k % 3) * 2, k % 2 ? '#5f7d4a' : '#4a6a3a');
    // topper on the crown
    const top = cy - Math.round(ry * (body === 'lumpy' ? 1.05 : 1)), tp = look.topper || 'mushroom';
    if (tp === 'mushroom') { for (let r = 0; r < 8; r++) { const w = 18 + r * 2; A.rect(g, cx - 2 - (w >> 1), top - 9 + r, w, 1, r < 2 ? '#c07858' : '#9a5a42'); } A.rect(g, cx - 2 - 17, top - 1, 34, 2, '#6a3a2a'); [[-8, -6], [0, -8], [6, -5], [-2, -4], [10, -3], [-12, -3]].forEach(([a, b]) => A.rect(g, cx - 2 + a, top + b, 2, 2, '#e8d8c0')); }
    else if (tp === 'moss') { for (let k = 0; k < 26; k++) A.line(g, cx - 14 + k, top + 2, cx - 14 + k, top - 2 - (k * 7 % 5), k % 2 ? '#6f8f4a' : '#4f6f3a'); }
    else if (tp === 'crystal') { [[-6, 9], [0, 13], [6, 7]].forEach(([dx, h]) => { A.line(g, cx + dx, top + 2, cx + dx, top + 2 - h, '#6fb8e8'); A.line(g, cx + dx + 1, top + 2, cx + dx + 1, top + 3 - h, '#b8e8ff'); A.line(g, cx + dx - 1, top + 2, cx + dx - 1, top + 4 - h, '#4a8ac0'); }); }
    else if (tp === 'lichen') { for (let k = 0; k < 18; k++) A.rect(g, cx - 9 + k, top + 1 - (k % 3 === 0 ? 1 : 0), 1, 2, k % 2 ? '#c8c86a' : '#a8a84a'); }
    else if (tp === 'pebbles') { for (let k = 0; k < 5; k++) A.ell(g, cx - 10 + k * 5, top + 1 - (k % 2) * 2, 2, 2, k % 2 ? C.light : '#8a8a92'); }
    return { c, rx, ry };
  }
  // limbs
  function leg(g, x, y, h, col, dark) { A.rect(g, x - 4, y, 8, h, col); A.rect(g, x - 4, y + h - 2, 9, 3, dark); A.rect(g, x - 4, y, 8, 1, mix(col, '#ffffff', 0.15)); }
  function fist(g, x, y, r, col, light, dark) { A.ell(g, x, y, r, r, col); A.px(g, x - 1, y - r + 1, light); A.px(g, x, y - r + 1, light); A.rect(g, x - r + 1, y + r - 1, r * 2 - 1, 1, dark); }
  function arm(g, kind, sx, sy, ang, len, C, front) {
    const col = front ? C.base : RW.shade(C.base, -0.18), lt = C.light, dk = C.dark;
    if (kind === 'pebble') { const x = sx + Math.cos(ang) * (len * 0.6 + 4), y = sy + Math.sin(ang) * (len * 0.6 + 4); fist(g, Math.round(x), Math.round(y), 4, col, lt, dk); return { x, y }; }
    const L2 = kind === 'long' ? len * 1.35 : len * 0.75, w = kind === 'long' ? 3 : 4;
    for (let t = 0; t <= L2; t += 1) { const x = sx + Math.cos(ang) * t, y = sy + Math.sin(ang) * t; A.ell(g, Math.round(x), Math.round(y), w, w, col); }
    const fx = Math.round(sx + Math.cos(ang) * L2), fy = Math.round(sy + Math.sin(ang) * L2);
    fist(g, fx, fy, kind === 'long' ? 5 : 5, col, lt, dk); return { x: fx, y: fy };
  }
  // one frame: 0 idle, 1-4 walk, 5 jump, 6 swing, 7 swim, 8-11 run. Returns the 2x sheet (56x72) and the hand (1x)
  function pose(move, frame) {
    const walk = frame >= 1 && frame <= 4, run = frame >= 8, k = walk ? frame - 1 : run ? frame - 8 : 0;
    const q = { bob: 0, tilt: 0, rot: 0, sx: 1, sy: 1, lift: 0, legs: [[-8, 0], [8, 0]], armB: 1.9, armF: 1.25, limbs: true, lean: 0, low: 0, blur: false };
    if (frame === 6) { q.armF = -0.15; q.armB = 2.3; q.lean = 0.08; }
    if (frame === 7) { q.armF = -0.5; q.armB = 3.6; q.bob = -1; }
    if (frame === 5) { q.lift = 3; q.legs = [[-7, -3], [7, -2]]; q.armF = -0.9; q.armB = 3.9; }
    if (move === 'trundle') {
      if (walk || run) { const s = run ? 5 : 3; const st = [[s, 0, -s, 1], [s / 2, 1, -s / 2, 0], [-s, 1, s, 0], [-s / 2, 0, s / 2, 1]][k]; q.legs = [[-8 + st[0], -st[1] * (run ? 3 : 2)], [8 + st[2], -st[3] * (run ? 3 : 2)]]; q.bob = k % 2 ? (run ? -2 : -1) : 0; q.armF = 1.25 + (k < 2 ? 0.5 : -0.5) * (run ? 1.6 : 1); q.armB = 1.9 - (k < 2 ? 0.5 : -0.5) * (run ? 1.6 : 1); if (run) q.lean = 0.16; }
    } else if (move === 'tumble') {
      if (walk || run) { q.limbs = false; q.rot = (k * Math.PI / 2) + (run ? Math.PI / 4 : 0); q.blur = run; }
      if (frame === 5) { q.limbs = false; q.rot = 0.4; }
    } else if (move === 'wobble') {
      if (walk || run) { const a = run ? 0.24 : 0.14; q.tilt = [a, 0, -a, 0][k]; q.legs = [[-8 + (k === 0 ? 2 : 0), k === 0 ? -2 : 0], [8 - (k === 2 ? 2 : 0), k === 2 ? -2 : 0]]; q.bob = k % 2 ? -1 : 0; q.armF = 0.9 + q.tilt * 3; q.armB = 2.2 + q.tilt * 3; }
    } else if (move === 'bounce') {
      if (walk || run) { const big = run ? 1.6 : 1; q.sy = [0.84, 1.12, 1.06, 0.88][k]; q.sx = [1.14, 0.92, 0.95, 1.1][k]; q.lift = [0, 5, 9, 1][k] * big; q.legs = [[-6, q.lift > 2 ? -2 : 0], [6, q.lift > 2 ? -2 : 0]]; q.armF = k === 2 ? -0.6 : 1.4; q.armB = k === 2 ? 3.8 : 1.8; }
    } else if (move === 'scuttle') {
      q.low = 5; q.sy = 0.86; q.sx = 1.08;
      if (walk || run) { const sp = run ? 7 : 5; q.legs = [[-11 + (k % 2 ? sp : -sp) * 0.5, -(k % 2) * 2], [11 + (k % 2 ? -sp : sp) * 0.5, -((k + 1) % 2) * 2]]; q.blur = run; q.lean = run ? 0.2 : 0.08; q.armF = 0.6 + (k % 2) * 0.4; q.armB = 2.6 - (k % 2) * 0.4; }
      else q.legs = [[-11, 0], [11, 0]];
    }
    return q;
  }
  function frameHD(look, frame) {
    const P0 = parse(look.shape), C = A.rockColors(look), q = pose(P0.move, frame);
    const c = mk(56, 72), g = c.ctx, B = boulder(look, P0), G = 71;
    const legH = q.limbs ? 9 - Math.min(4, q.low) : 0;
    const bodyCY = q.limbs ? Math.min(G - legH - B.ry * q.sy + 6 - q.lift + q.bob + q.low * 0.4, G - 2 - B.ry * q.sy - legH * 0.45 - q.lift) : G - B.ry - 1 - q.lift;
    const cx = 28, sh = { x: cx, y: Math.round(bodyCY - B.ry * q.sy * 0.15) };
    // legs (behind the body)
    if (q.limbs) q.legs.forEach(([lx, ly], i) => { if (q.blur && P0.move === 'scuttle') { g.globalAlpha = 0.35; leg(g, cx + lx - 4, G - legH + 1 + ly, legH, C.dark, RW.shade(C.dark, -0.3)); g.globalAlpha = 1; } leg(g, cx + lx, G - legH + 1 + ly - Math.round(q.lift), legH, i ? C.dark : RW.shade(C.dark, -0.12), RW.shade(C.dark, -0.35)); });
    // the back arm
    const armLen = Math.round(B.ry * 0.9);
    if (q.limbs) arm(g, P0.arms, cx - Math.round(B.rx * 0.55), sh.y, q.armB, armLen, C, false);
    // the boulder, turned and squashed as the move needs
    if (q.blur) { g.save(); g.globalAlpha = 0.25; g.translate(cx - 5, bodyCY); g.rotate(q.rot - 0.5); g.scale(q.sx, q.sy); g.drawImage(B.c, -40, -52); g.restore(); }
    g.save(); g.translate(cx, Math.round(bodyCY)); g.rotate(q.rot + q.tilt + q.lean); g.scale(q.sx, q.sy); g.drawImage(B.c, -40, -52); g.restore();
    // the front arm and its fist (where held things go)
    let hand = { x: cx + B.rx * 0.6, y: sh.y + 6 };
    if (q.limbs) { const f = arm(g, P0.arms, cx + Math.round(B.rx * 0.5), sh.y + 2, q.armF, armLen, C, true); hand = f; }
    else hand = { x: cx + 10, y: bodyCY };
    if (q.blur && P0.move === 'tumble') { g.fillStyle = 'rgba(220,210,190,0.35)'; for (let k = 0; k < 4; k++) g.fillRect(cx - B.rx - 10 - k * 3, Math.round(bodyCY) - 8 + k * 5, 8, 1); }
    A.outline(c, '#141218');
    return { c, hand: { x: Math.round(hand.x / 2), y: Math.round(hand.y / 2) } };
  }
  const flipC = (cv) => { const o = mk(cv.width, cv.height); o.ctx.translate(cv.width, 0); o.ctx.scale(-1, 1); o.ctx.drawImage(cv, 0, 0); return o; };
  const half = (hd) => { const o = mk(hd.width / 2, hd.height / 2); const d = hd.ctx.getImageData(0, 0, hd.width, hd.height).data, od = o.ctx.createImageData(o.width, o.height); for (let y = 0; y < o.height; y++) for (let x = 0; x < o.width; x++) { let best = 0, bi = 0; for (const [ax, ay] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = ((y * 2 + ay) * hd.width + x * 2 + ax) * 4; if (d[i + 3] > best) { best = d[i + 3]; bi = i; } } const o4 = (y * o.width + x) * 4; od.data[o4] = d[bi]; od.data[o4 + 1] = d[bi + 1]; od.data[o4 + 2] = d[bi + 2]; od.data[o4 + 3] = d[bi + 3]; } o.ctx.putImageData(od, 0, 0); return o; };
  const cache = {};
  A.rockSprites = function (look) {
    look = look || A.DEFAULT_LOOK;
    const key = JSON.stringify(look); if (cache[key]) return cache[key];
    const frames = [];
    for (let f = 0; f < 12; f++) {
      const r = frameHD(look, f), lo = half(r.c); lo.hand = r.hand; lo.__hd2 = r.c;
      const fl = flipC(lo); fl.hand = r.hand; fl.__hd2 = flipC(r.c);
      frames.push([lo, fl]);
    }
    cache[key] = frames; return frames;
  };
  A.rockFrame = (look, f) => A.rockSprites(look)[f][0];
  if (A._spCache) Object.keys(A._spCache).forEach((k) => { const sp = RW.SPECIES[k]; if (sp && sp.art && sp.art.draw === 'rockfolk') delete A._spCache[k]; });
  // dressed rocks (armour, hats, capes) keep the sharp body wherever the dressing doesn't cover it
  const baseDressed = A.dressed;
  A.dressed = function (species, look, armor) {
    const out = baseDressed.apply(this, arguments);
    if (species === 'rock' && out && !out.__v3hd) {
      out.__v3hd = true; const base = A.rockSprites(look || A.DEFAULT_LOOK);
      out.forEach((pair, i) => {
        const d = pair[0], f = base[i] && base[i][0]; if (!d || !f || d === f || !f.__hd2 || d.__hd2) return;
        const W = d.width, H = d.height, ox = Math.round((W - f.width) / 2), oy = H - f.height;
        let dd, fd; try { dd = d.getContext('2d').getImageData(0, 0, W, H).data; fd = f.getContext('2d').getImageData(0, 0, f.width, f.height).data; } catch (e) { return; }
        const hd = mk(W * 2, H * 2); hd.ctx.drawImage(d, 0, 0, W * 2, H * 2);
        const hdd = f.__hd2.getContext('2d').getImageData(0, 0, f.__hd2.width, f.__hd2.height).data, img = hd.ctx.getImageData(0, 0, W * 2, H * 2);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const bx = x - ox, by = y - oy; if (bx < 0 || by < 0 || bx >= f.width || by >= f.height) continue;
          const i = (y * W + x) * 4, j = (by * f.width + bx) * 4;
          if (dd[i] !== fd[j] || dd[i + 1] !== fd[j + 1] || dd[i + 2] !== fd[j + 2] || dd[i + 3] !== fd[j + 3]) continue;
          for (const [ax, ay] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const s = ((by * 2 + ay) * f.__hd2.width + bx * 2 + ax) * 4, t = ((y * 2 + ay) * W * 2 + x * 2 + ax) * 4; img.data[t] = hdd[s]; img.data[t + 1] = hdd[s + 1]; img.data[t + 2] = hdd[s + 2]; img.data[t + 3] = hdd[s + 3]; }
        }
        hd.ctx.putImageData(img, 0, 0); d.__hd2 = hd; if (pair[1]) pair[1].__hd2 = flipC(hd);
      });
    }
    return out;
  };

  // running: holding Shift (or moving fast, for other players) shows the move's own run frames
  const RUN_V = ((RW.HEROES.rock && RW.HEROES.rock.spd) || 92) * 1.15;
  const baseDP = E.drawPlayer;
  E.drawPlayer = function (g, cam, p, look, opts) {
    if (opts && opts.species === 'rock' && p.anim >= 1 && p.anim <= 4) {
      let fast;
      if (p === P) fast = P.sprinting && Math.abs(P.vx) > RUN_V * 0.9;
      else { const now = performance.now(), lx = p.__lx, lt = p.__lt; p.__v = lx != null && now > lt ? Math.abs(p.x - lx) / ((now - lt) / 1000) : p.__v || 0; p.__lx = p.x; p.__lt = now; fast = p.__v > RUN_V; }
      if (fast) { const q = Object.assign({}, p, { anim: p.anim + 7 }); arguments[2] = q; return baseDP.apply(this, arguments); }
    }
    return baseDP.apply(this, arguments);
  };

  // ---- the creator: Body, Arms and Moves rows for a rock, each one moving in the preview ----
  let liveLook = null;
  const baseDr2 = A.dressed;
  A.dressed = function (species, look) { const cr = document.getElementById('creator'); if (species === 'rock' && cr && !cr.classList.contains('hidden-ui') && look) liveLook = look; return baseDr2.apply(this, arguments); };
  function patchCreator() {
    const dyn = document.getElementById('c-dyn'); if (!dyn || dyn.__v3) return;
    const rows = Array.from(dyn.querySelectorAll('.opt')); const bodyRow = rows.find((r) => { const l = r.querySelector('.label'); return l && l.textContent === 'Body'; });
    if (!bodyRow || !rows.some((r) => { const l = r.querySelector('.label'); return l && l.textContent === 'Rock'; })) return;
    dyn.__v3 = true;
    const mkRow = (label, map, key, after, note) => {
      const r = document.createElement('div'); r.className = 'opt'; const l = document.createElement('span'); l.className = 'label'; l.textContent = label; const box = document.createElement('div'); box.className = 'chips'; r.append(l, box);
      if (note) { const n = document.createElement('div'); n.className = 'label'; n.style.cssText = 'opacity:.75;grid-column:1/-1;margin-top:-4px'; n.textContent = note; setTimeout(() => r.after(n), 0); }
      const paint = () => { const cur = liveLook ? parse(liveLook.shape)[key] : null; Array.from(box.children).forEach((b) => b.setAttribute('aria-pressed', b.dataset.k === cur)); };
      Object.entries(map).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = v; b.dataset.k = k;
        b.onclick = () => { if (!liveLook) return; const o = parse(liveLook.shape); o[key] = k; liveLook.shape = join(o); RW.audio.sfx('ui'); paint(); };
        b.onmouseenter = () => { if (!liveLook || key !== 'move') return; b.__prev = liveLook.shape; const o = parse(liveLook.shape); o.move = k; liveLook.shape = join(o); };
        b.onmouseleave = () => { if (b.__prev && liveLook && key === 'move' && parse(liveLook.shape).move === k && b.__prev !== liveLook.shape && !b.__clicked) liveLook.shape = b.__prev; b.__prev = null; };
        box.append(b); });
      Array.from(box.children).forEach((b) => b.addEventListener('click', () => { b.__clicked = true; setTimeout(() => (b.__clicked = false), 50); }));
      after.after(r); setTimeout(paint, 60); return r;
    };
    const r1 = mkRow('Body', BODIES, 'body', bodyRow);
    const r2 = mkRow('Arms', ARMS, 'arms', r1);
    mkRow('Moves', MOVES, 'move', r2, 'Hover a move to watch it in the picture. Every move is only a look: same speed and strength.');
    bodyRow.remove();
  }
  new MutationObserver(() => { const dyn = document.getElementById('c-dyn'); if (dyn && !dyn.__v3) patchCreator(); }).observe(document.body, { childList: true, subtree: true });
  // the creator's picture uses the sharp frames too
  const pv = document.getElementById('preview');
  if (pv) { const pg = pv.getContext('2d'), raw = pg.drawImage; pg.drawImage = function (img) { if (img && img.__hd2 && arguments.length === 5) { const a = Array.from(arguments); a[0] = img.__hd2; return raw.apply(this, a); } return raw.apply(this, arguments); }; }
  const baseRS = A.rockSprites;

  // ================================= 2. darker underground =================================
  const def = RW.WORLDS.rock;
  if (def && def.ambientAt) {
    const baseAmb = def.ambientAt;
    def.ambientAt = function (x, y) {
      const v = baseAmb.apply(this, arguments), M = WD.meta;
      if (!M || !M.floorY || y <= M.floorY[RW.clamp(x | 0, 0, M.floorY.length - 1)] + 2) return v;
      if (v >= 0.37) return 0.085;   // Stalagmere and the towns
      if (v >= 0.35) return 0.055;   // the Crystal Forest
      if (v >= 0.3) return 0.03;     // the Heart Chamber
      return 0.018;                  // tunnels, shafts, wild caves, tubes
    };
  }
  const baseLight = WD.computeLight;
  WD.computeLight = function (tx0, ty0, tw, th, extra) {
    if (WD.def && WD.def.id === 'rock' && WD.meta && WD.meta.floorY && Array.isArray(extra)) {
      const px = P.x + 6, py = P.y + 6, fy = WD.meta.floorY[RW.clamp(Math.floor(px / TS), 0, WD.meta.floorY.length - 1)];
      if (py / TS > fy + 2) extra.forEach((e) => { if (Math.abs(e.x - px) < 0.01 && Math.abs(e.y - py) < 0.01 && !e.v3) { const m = Math.max(e.r, e.g, e.b) || 1, k = 0.34 / m; e.r *= k; e.g *= k; e.b *= k; } });
    }
    return baseLight.apply(this, arguments);
  };

  // ================================= 3. chunky pixels for the boss layer =================================
  let off = null;
  RW.v3pix = function (g, fn, opts) {
    opts = opts || {};
    const v = RW.view, W = Math.ceil(v.w) + 2, H = Math.ceil(v.h) + 2;
    if (!off || off.width !== W || off.height !== H) { off = mk(W, H); }
    const o = off.ctx; o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H);
    try { fn(o); } catch (e) { console.warn('pixel layer', e); }
    // firm up the edges: nearly-solid pixels become solid, faint ones vanish
    if (!opts.soft) {
      const img = o.getImageData(0, 0, W, H), d = img.data;
      for (let i = 3; i < d.length; i += 4) { const a = d[i]; if (!a) continue; if (a >= 110) d[i] = 255; else if (a < 36) d[i] = 0; }
      o.putImageData(img, 0, 0);
    }
    g.save(); g.imageSmoothingEnabled = false; if (opts.add) g.globalCompositeOperation = 'lighter'; g.drawImage(off, 0, 0); g.restore();
  };

  // ================================= 4. 1x1 / 2x2 on T, no off-hand torch =================================
  RW.binds.torch = []; P.offTorch = false;
  const ti = RW.ACTIONS.findIndex((a) => a[0] === 'torch'); if (ti >= 0) RW.ACTIONS.splice(ti, 1);
  if (!RW.ACTIONS.some((a) => a[0] === 'mine2')) { RW.ACTIONS.splice(Math.max(0, ti), 0, ['mine2', 'Rock: switch between 1x1 and 2x2 mining', ['KeyT']]); }
  if (!RW.binds.mine2 || !RW.binds.mine2.length) RW.binds.mine2 = ['KeyT'];
  P.toggleTorch = function () { };
  const baseLit = P.torchLit;
  if (baseLit) P.torchLit = function () { P.offTorch = false; return baseLit.apply(this, arguments); };
  RW.v3mine2 = !!RW.store.get('v3_mine2', false);
  RW.v3mine2On = () => RW.v3mine2 && P.species === 'rock';
  const baseAct = P.actions;
  P.actions = function () {
    const r = baseAct.apply(this, arguments);
    if (RW.input.actHit('mine2') && !(U.blocking && U.blocking())) {
      if (P.species !== 'rock') U.toast('Only rocks can smash 2x2.');
      else { RW.v3mine2 = !RW.v3mine2; RW.store.set('v3_mine2', RW.v3mine2); U.toast(RW.v3mine2 ? '2x2 mining: each punch smashes a 2x2 square. Press T for one block.' : '1x1 mining: one block per punch. Press T for 2x2.'); RW.audio.sfx('ui'); U.dirty(); }
    }
    return r;
  };
  // the 2x2 square under the cursor, and the label on the hotbar
  const baseOverDraw = RW.fx.drawOver;
  RW.fx.drawOver = function (g, cam) {
    const r = baseOverDraw.apply(this, arguments);
    if (RW.game && RW.game.playing && !P.dead && RW.v3mine2On() && RW.mouseWorld && !(U.blocking && U.blocking())) {
      const h = P.held(); if (!(h && (h.kind === 'place' || h.kind === 'torch' || h.plant))) {
        const m = RW.mouseWorld(), tx = Math.floor(m.x / TS), ty = Math.floor(m.y / TS), sx = m.x / TS - tx >= 0.5 ? 1 : -1, sy = m.y / TS - ty >= 0.5 ? 1 : -1;
        const x0 = Math.min(tx, tx + sx), y0 = Math.min(ty, ty + sy);
        g.save(); g.strokeStyle = 'rgba(255,200,120,0.7)'; g.lineWidth = 1; g.setLineDash([3, 2]); g.strokeRect(x0 * TS - cam.x + 0.5, y0 * TS - cam.y + 0.5, TS * 2 - 1, TS * 2 - 1); g.restore();
      }
    }
    return r;
  };
  const css = document.createElement('style'); css.textContent = '#v3mode { position: fixed; z-index: 20; pointer-events: none; font-family: var(--small); font-size: 12px; color: #ffd98a; background: rgba(12,10,16,.85); border: 1px solid var(--edge); padding: 1px 6px; }'; document.head.appendChild(css);
  const tag = document.createElement('div'); tag.id = 'v3mode'; tag.textContent = '2x2'; tag.hidden = true; document.body.appendChild(tag);
  setInterval(() => {
    const hb = document.getElementById('hotbar'); const show = !!(RW.game && RW.game.playing && RW.v3mine2On() && hb);
    tag.hidden = !show; if (!show) return; const r = hb.getBoundingClientRect(); tag.style.left = (r.right + 6) + 'px'; tag.style.top = (r.top + 4) + 'px';
  }, 250);
  void baseRS;
})(window.RW);
