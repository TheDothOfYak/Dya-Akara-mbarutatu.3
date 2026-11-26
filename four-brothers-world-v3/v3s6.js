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
  const FACEX = { none: 'None', scar: 'Scar', chip: 'Chipped', freckles: 'Mineral freckles' };
  const BODYX = { none: 'None', crystals: 'Crystal growths', gems: 'Embedded gems', barnacles: 'Barnacles & vines' };
  const SIZES = { pebble: 'Pebble', small: 'Small', medium: 'Medium', large: 'Large', boulder: 'Boulder' };
  const SIZE_K = { pebble: 0.8, small: 0.9, medium: 1, large: 1.1, boulder: 1.2 };
  const VEINS = { none: 'None', gold: '#e8c050', silver: '#d8dce8', copper: '#d0783a', jade: '#4ab87a', ruby: '#d0384a', sapphire: '#3a78d8', amethyst: '#9a5ae0', obsidian: '#1a1622' };
  const parse = (shape) => { const p = String(shape || 'round').split('.'); return { body: BODIES[p[0]] ? p[0] : OLD[p[0]] || 'round', arms: ARMS[p[1]] ? p[1] : 'stubby', move: MOVES[p[2]] ? p[2] : 'trundle',
    face: FACEX[p[3]] ? p[3] : 'none', extra: BODYX[p[4]] ? p[4] : 'none', size: SIZES[p[5]] ? p[5] : 'medium', vein: VEINS[p[6]] ? p[6] : 'none' }; };
  const join = (o) => { let s2 = o.body + '.' + o.arms + '.' + o.move; if ((o.face || 'none') !== 'none' || (o.extra || 'none') !== 'none' || (o.size || 'medium') !== 'medium' || (o.vein || 'none') !== 'none') s2 += '.' + (o.face || 'none') + '.' + (o.extra || 'none') + '.' + (o.size || 'medium') + '.' + (o.vein || 'none'); return s2; };
  // the creator lists three bodies; every combination (and the old names) still counts as a valid shape online
  const S2 = {}; Object.keys(BODIES).forEach((k) => (S2[k] = BODIES[k]));
  Object.keys(BODIES).forEach((b) => Object.keys(ARMS).forEach((a) => Object.keys(MOVES).forEach((m) => Object.defineProperty(S2, b + '.' + a + '.' + m, { value: BODIES[b], enumerable: false }))));
  Object.keys(OLD).forEach((k) => Object.defineProperty(S2, k, { value: BODIES[OLD[k]], enumerable: false }));
  const SHP = new Proxy(S2, { get(t, k) { if (k in t || typeof k !== 'string') return t[k]; const q = k.split('.'); if (q.length === 7 && BODIES[q[0]] && ARMS[q[1]] && MOVES[q[2]] && FACEX[q[3]] && BODYX[q[4]] && SIZES[q[5]] && VEINS[q[6]]) return BODIES[q[0]]; return undefined; } });
  RW.SHAPES = SHP; RW.ROCK_FACEX = FACEX; RW.ROCK_BODYX = BODYX; RW.ROCK_SIZES = SIZES; RW.ROCK_VEINS = VEINS; RW.ROCK_BODIES = BODIES; RW.ROCK_ARMS = ARMS; RW.ROCK_MOVES = MOVES;
  if (A.DEFAULT_LOOK && A.DEFAULT_LOOK.shape === 'tall') A.DEFAULT_LOOK.shape = 'round.stubby.trundle';
  const baseRandomLook = A.randomLook;
  if (baseRandomLook) A.randomLook = function () { const l = baseRandomLook.apply(this, arguments); l.shape = join({ body: RW.pick(Object.keys(BODIES)), arms: RW.pick(Object.keys(ARMS)), move: RW.pick(Object.keys(MOVES)), face: Math.random() < 0.4 ? RW.pick(Object.keys(FACEX)) : 'none', extra: Math.random() < 0.4 ? RW.pick(Object.keys(BODYX)) : 'none', size: Math.random() < 0.5 ? RW.pick(Object.keys(SIZES)) : 'medium', vein: Math.random() < 0.4 ? RW.pick(Object.keys(VEINS)) : 'none' }); return l; };

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
    // mineral veins in the colour chosen
    const P1 = parse(look.shape);
    if (P1.vein !== 'none') { const vc = RW.mix(VEINS[P1.vein], C.base, 0.55), vl = RW.mix(VEINS[P1.vein], C.light, 0.6);
      for (let v = 0; v < 3; v++) { let x = -rx * 0.8 + v * 6, y = -ry * 0.5 + v * ry * 0.45; for (let k = 0; k < 40; k++) { x += 0.9; y += Math.sin(k * 0.45 + v * 2 + seed) * 0.9; if (inside(Math.round(x), Math.round(y)) > 0 && inside(Math.round(x), Math.round(y)) < 0.94) { A.px(g, cx + Math.round(x), cy + Math.round(y), vc); if (k % 9 === 4) A.px(g, cx + Math.round(x), cy + Math.round(y) - 1, vl); } } } }
    // things growing on or set into the boulder
    if (P1.extra === 'crystals') { const cc = P1.vein !== 'none' && P1.vein !== 'obsidian' ? VEINS[P1.vein] : '#7fd0f0';
      [[-0.7, -0.4, -2.4, 12], [-0.88, 0.05, -2.85, 9], [-0.45, -0.75, -2.0, 8]].forEach(([fx, fy, an, h]) => { const bx = cx + Math.round(fx * rx), by = cy + Math.round(fy * ry);
        for (let k = 0; k < h; k++) { const w = Math.max(0, Math.round(2.6 * (1 - k / h) + 0.4)), x = Math.round(bx + Math.cos(an) * k), y = Math.round(by + Math.sin(an) * k); for (let j = -w; j <= w; j++) A.px(g, x, y + j, j < 0 ? RW.shade(cc, 0.4) : j === 0 ? cc : RW.shade(cc, -0.35)); }
        A.px(g, Math.round(bx + Math.cos(an) * h), Math.round(by + Math.sin(an) * h), '#ffffff'); }); }
    else if (P1.extra === 'gems') { [[-0.35, 0.35, '#d0384a'], [0.05, 0.6, '#3a78d8'], [-0.6, -0.1, '#4ab87a']].forEach(([fx, fy, col]) => { const x = cx + Math.round(fx * rx), y = cy + Math.round(fy * ry);
        A.ell(g, x, y, 4, 3.4, '#8a6a28'); A.ell(g, x, y, 3, 2.6, col); A.rect(g, x - 2, y - 2, 2, 1, '#ffffff'); A.px(g, x + 2, y + 1, RW.shade(col, -0.45)); A.px(g, x + 1, y + 1, RW.shade(col, -0.4)); A.px(g, x - 3, y, '#c8a040'); A.px(g, x + 3, y, '#c8a040'); }); }
    else if (P1.extra === 'barnacles') {
      [[-0.7, 0.45], [-0.5, 0.7], [-0.85, 0.15], [-0.3, 0.8], [-0.62, 0.62]].forEach(([fx, fy], k) => { const x = cx + Math.round(fx * rx), y = cy + Math.round(fy * ry); A.ell(g, x, y, 3.2, 2.6, '#6a6458'); A.ell(g, x, y - 0.5, 2.6, 2, '#d8d0bc'); A.rect(g, x - 1, y - 2, 2, 2, '#2a2420'); A.px(g, x - 2, y - 1, '#f4eee0'); if (k % 2) A.px(g, x + 1, y + 1, '#8a8478'); });
      [[-0.55, 9], [-0.2, 12], [-0.82, 7]].forEach(([fx, len], k) => { const x0 = cx + Math.round(fx * rx); let y = cy - ry + 2 + Math.round(Math.abs(fx) * 4); for (let j = 0; j < len; j++) { const x = x0 + Math.round(Math.sin(j * 0.6 + k) * 1); if (inside(x - cx, y - cy) > 0) { A.rect(g, x, y, 2, 1, j % 3 ? '#2f5a26' : '#4a7a36'); } if (j % 4 === 2) { A.px(g, x + 2, y, '#6ab04a'); A.px(g, x + 3, y - 1, '#6ab04a'); } y++; } }); }
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
    if (P1.face === 'scar') { for (let k = 0; k < 15; k++) { const x = cx + ex + 8 - k, y = cy + ey - 8 + Math.round(k * 1.05); A.rect(g, x, y, 2, 1, RW.shade(C.dark, -0.55)); A.px(g, x + 2, y, C.light); if (k % 4 === 1) A.px(g, x - 1, y + 1, RW.shade(C.dark, -0.55)); } }
    else if (P1.face === 'chip') { const qx = cx + rx - 4, qy = cy - Math.round(ry * 0.4); g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(qx - 7, qy - 6); g.lineTo(qx + 9, qy - 6); g.lineTo(qx + 9, qy + 6); g.lineTo(qx + 2, qy + 4); g.lineTo(qx - 2, qy); g.closePath(); g.fill(); g.restore();
      for (let k = 0; k < 7; k++) { A.px(g, qx - 2 + k, qy + Math.round(k * 0.6), C.light); A.px(g, qx - 2 + k, qy + 1 + Math.round(k * 0.6), RW.shade(C.base, -0.1)); } A.px(g, qx - 3, qy - 1, C.light); }
    else if (P1.face === 'freckles') { [[-7, 5], [-3, 7], [1, 5], [5, 7], [8, 5], [-5, 9], [4, 10]].forEach(([dx, dy], k) => { const x = cx + ex + dx, y = cy + ey + dy; A.rect(g, x, y, 2, 2, k % 3 ? '#e8c860' : '#c8e8ff'); A.px(g, x, y, '#ffffff'); }); }
    // the head's top edge, column by column (everything on the crown sits snug on it)
    const id0 = g.getImageData(0, 0, 80, 84).data, TOPY = [];
    for (let x = 0; x < 80; x++) { let y = 0; while (y < 84 && id0[(y * 80 + x) * 4 + 3] < 10) y++; TOPY.push(y); }
    const T2 = (x) => TOPY[RW.clamp(Math.round(x), 0, 79)];
    const hcx = cx - 2, top = T2(hcx);
    const along = (x0, x1, d, col) => { for (let x = x0; x <= x1; x++) { const y = T2(x); if (y < 84) A.px(g, x, y + d, col); } };
    const span = (x0, x1) => { let l = x0, r = x1; while (l < r && T2(l) > top + 14) l++; while (r > l && T2(r) > top + 14) r--; return [l, r]; };
    const hat = look.v3hat !== undefined ? look.v3hat : look.hat;
    const wearsHat = hat && hat !== 'none' && RW.HATS && RW.HATS[hat];
    const helmOn = !!(look.v3armor && look.v3armor[0] && RW.ITEMS[look.v3armor[0]]);
    const tp = wearsHat || helmOn ? 'bare' : (look.topper || 'mushroom');
    if (tp === 'mushroom') { // a domed cap pulled down on the crown: shaded bands, gills under the rim, raised spots
      const [l, r] = span(hcx - 19, hcx + 17);
      for (let x = l - 2; x <= r + 2; x++) { const y0 = T2(RW.clamp(x, l, r)) + 3, k = (x - (l - 2)) / (r - l + 4), dome = Math.round(Math.sin(k * Math.PI) * 10) + 2;
        for (let y = y0 - dome; y <= y0; y++) { const t = (y - (y0 - dome)) / (dome + 1); A.px(g, x, y, t < 0.18 ? '#d88a68' : t < 0.55 ? '#b0644a' : t < 0.85 ? '#8a4a36' : '#6a3626'); }
        A.px(g, x, y0 + 1, (x & 1) ? '#c8b898' : '#a8987a'); }
      [[-9, -8, 3], [-1, -10, 3], [7, -7, 2], [-5, -4, 2], [12, -4, 2], [-14, -4, 2], [2, -5, 2]].forEach(([dx, dy, rr]) => { const x = hcx + dx, y = T2(x) + 3 + dy; A.ell(g, x, y, rr, rr - 0.5, '#efe2c8'); A.px(g, x - 1, y - 1, '#ffffff'); A.px(g, x + rr - 1, y + 1, '#c8b494'); });
    } else if (tp === 'moss') { // layered strands following the head, a few tiny flowers
      const [l, r] = span(hcx - 16, hcx + 15);
      for (let x = l; x <= r; x++) { const y0 = T2(x) + 3, h = 4 + Math.round(RW.hash2(x, 3, 11) * 5) + (Math.abs(x - hcx) < 8 ? 2 : 0);
        for (let k = 0; k < h; k++) A.px(g, x + (k > h - 3 ? (x % 2 ? 1 : -1) : 0), y0 - k, k < 2 ? '#3a5a2a' : k < h - 2 ? (x % 3 ? '#5f7d42' : '#4f6f36') : '#86a85a'); }
      [[-8, 0], [3, 0], [10, 0]].forEach(([dx]) => { const x = hcx + dx, y = T2(x) - 6; A.px(g, x, y, '#f0e080'); A.px(g, x - 1, y, '#e8f0ff'); A.px(g, x + 1, y, '#e8f0ff'); A.px(g, x, y - 1, '#e8f0ff'); });
    } else if (tp === 'crystal') { // faceted crystals growing out of the crown
      [[-8, 10, -0.25], [0, 15, 0], [7, 9, 0.28], [-14, 6, -0.5], [13, 6, 0.5]].forEach(([dx, h, lean]) => { const bx = hcx + dx, by = T2(bx) + 4;
        for (let k = 0; k < h; k++) { const w = Math.max(0, Math.round(2.6 * (1 - k / h) + 0.5)), x = Math.round(bx + lean * k); for (let j = -w; j <= w; j++) A.px(g, x + j, by - k, j < 0 ? '#9ad8ff' : j === 0 ? '#6fb8e8' : '#3e7ab0'); }
        A.px(g, Math.round(bx + lean * (h - 1)), by - h, '#e8faff'); A.px(g, bx - 1, by - 2, '#e8faff'); });
    } else if (tp === 'lichen') { // a crusty ring of lichen round the crown
      const [l, r] = span(hcx - 15, hcx + 14);
      for (let x = l; x <= r; x++) { const y0 = T2(x) + 2; for (let k = -1; k < 3; k++) { const h = RW.hash2(x, k + 5, 21); if (h < 0.8) A.px(g, x, y0 + k, h < 0.25 ? '#e0e08a' : h < 0.55 ? '#c0c060' : '#949440'); } if (x % 4 === 0) A.px(g, x, y0 - 2, '#d8d870'); }
    } else if (tp === 'pebbles') { // a crown of little pebbles, set in a row
      for (let k = 0; k < 6; k++) { const x = hcx - 13 + k * 5.2, y = T2(x) + 1 - (k % 2), cols = ['#8a8a96', C.light, '#a09484', '#7a7a86']; A.ell(g, x, y, 2.6, 2.3, '#3a3840'); A.ell(g, x, y, 2, 1.8, cols[k % 4]); A.px(g, x - 1, y - 1, '#e8e8f0'); }
    }
    // hats, pulled down snug, at twice the detail
    if (wearsHat) {
      const [l, r] = span(hcx - 17, hcx + 16), W2 = r - l;
      if (hat === 'cap') { // a cloth cap in panels, a stitched seam, a button, the bill facing forward
        for (let x = l; x <= r; x++) { const y0 = T2(x) + 5, k = (x - l) / W2, h = Math.round(Math.sin(k * Math.PI) * 7) + 4;
          for (let y = y0 - h; y <= y0; y++) { const t = (y - y0 + h) / (h + 1); A.px(g, x, y, Math.abs(x - hcx) % 9 === 0 ? '#7a2424' : t < 0.25 ? '#e0625a' : t < 0.7 ? '#c0423a' : '#962e28'); } }
        for (let x = l + 2; x < r; x += 2) A.px(g, x, T2(x) + 3, '#f0d0c0');
        for (let x = r - 6; x <= r + 9; x++) { const y = T2(RW.clamp(x, l, r)) + 5; A.px(g, x, y, '#5a1a18'); A.px(g, x, y + 1, '#7a2420'); if (x > r) A.px(g, x, y - 1, '#a83430'); }
        const by = T2(hcx) - 6; A.ell(g, hcx, by, 2, 1.5, '#f0e0d0'); A.px(g, hcx - 1, by - 1, '#ffffff');
      } else if (hat === 'crown') { // a gold band with five points, engraved, set with gems
        const by = (x) => T2(x) + 4;
        for (let x = l + 1; x <= r - 1; x++) for (let y = by(x) - 5; y <= by(x); y++) A.px(g, x, y, y === by(x) - 5 ? '#fff0a0' : y === by(x) ? '#8a6418' : (x + y) % 5 === 0 ? '#c89428' : '#e8b838');
        for (let k = 0; k < 5; k++) { const x = Math.round(l + 3 + k * (W2 - 6) / 4), h = k === 2 ? 9 : k % 2 ? 6 : 7; for (let j = 0; j < h; j++) { const w = Math.max(0, Math.round((1 - j / h) * 2)); for (let i = -w; i <= w; i++) A.px(g, x + i, by(x) - 6 - j, i < 0 ? '#fff0a0' : '#d8a430'); } A.ell(g, x, by(x) - 7 - h, 1.4, 1.4, '#ffe878'); }
        [[-6, '#d0384a'], [1, '#3a78d8'], [8, '#4ab87a']].forEach(([dx, col]) => { const x = hcx + dx, y = by(x) - 3; A.rect(g, x - 1, y - 1, 3, 3, col); A.px(g, x - 1, y - 1, '#ffffff'); });
      } else if (hat === 'flowers') { // a woven vine with flowers all the way round
        for (let x = l; x <= r; x++) { const y = T2(x) + 2; A.px(g, x, y, x % 2 ? '#3a6a2a' : '#4a8a3a'); A.px(g, x, y + 1, '#2a4a1e'); if (x % 5 === 0) { A.px(g, x + 1, y - 1, '#6ab04a'); A.px(g, x + 2, y - 2, '#6ab04a'); } }
        const FL = [['#e85a6a', '#ffd0d8'], ['#f0d040', '#fff4b0'], ['#f4f4f8', '#ffffff'], ['#6a8ae8', '#c8d8ff'], ['#e88a3a', '#ffd0a0']];
        for (let k = 0; k < 6; k++) { const x = Math.round(l + 2 + k * (W2 - 4) / 5), y = T2(x) + 1, [c1, c2] = FL[k % 5]; [[0, -2], [2, 0], [0, 2], [-2, 0]].forEach(([a2, b2]) => A.ell(g, x + a2, y + b2 - 1, 1.5, 1.5, c1)); A.px(g, x - 1, y - 3, c2); A.px(g, x, y - 1, '#f8e070'); A.px(g, x, y, '#c8a030'); }
      } else if (hat === 'wizard') { // a tall bent hat on a flat round brim, a buckled band, stars and a moon
        const base = top + 6, H2 = 22, bw = Math.round(W2 / 2) + 6, br = 3;
        A.ell(g, hcx, base + 1, bw + 1, br + 1, '#140c30'); A.ell(g, hcx, base, bw, br, '#3a2278'); A.ell(g, hcx - 1, base - 1, bw - 2, br - 1.2, '#4f2f98');
        for (let x = hcx - bw + 2; x <= hcx + bw - 2; x++) A.px(g, x, base + Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((x - hcx) / bw, 2))) * br), '#6a48b0');
        for (let j = 0; j < H2; j++) { const k = j / H2, w = Math.round((W2 / 2 - 3) * (1 - k) + 1), off = -Math.round(k * k * 7); for (let i = -w; i <= w; i++) A.px(g, hcx + off + i, base - 1 - j, i < -w * 0.4 ? '#6a48b0' : i < w * 0.3 ? '#4f2f98' : '#3a2278'); }
        A.px(g, hcx - 7, base - H2, '#f0d860');
        for (let x = hcx - Math.round(W2 / 2) + 3; x <= hcx + Math.round(W2 / 2) - 3; x++) { A.px(g, x, base - 2, '#2a1a4a'); A.px(g, x, base - 3, '#2a1a4a'); }
        A.rect(g, hcx - 2, base - 4, 4, 3, '#e8c050'); A.px(g, hcx - 1, base - 3, '#2a1a4a');
        [[-3, -9], [2, -14], [-4, -18]].forEach(([dx, dy]) => { const x = hcx + dx, y = base + dy; A.px(g, x, y, '#ffe878'); A.px(g, x - 1, y, '#c8a030'); A.px(g, x + 1, y, '#c8a030'); A.px(g, x, y - 1, '#c8a030'); A.px(g, x, y + 1, '#c8a030'); });
        A.ell(g, hcx + 3, base - 8, 2, 2, '#f0e8b0'); A.ell(g, hcx + 4, base - 9, 1.6, 1.6, '#4f2f98');
      } else if (hat === 'bandana') { // cloth wrapped over the crown, dotted, knotted at the back with two tails
        for (let x = l; x <= r; x++) { const y0 = T2(x) + 6, h = Math.round(Math.sin((x - l) / W2 * Math.PI) * 3) + 5; for (let y = y0 - h; y <= y0; y++) A.px(g, x, y, y === y0 ? '#1e3e88' : y < y0 - h + 2 ? '#5a8ae8' : '#3a6ad0'); }
        for (let x = l + 2; x < r; x += 4) for (let y = T2(x) + 2; y < T2(x) + 6; y += 3) A.px(g, x + ((y >> 1) & 1), y, '#f0f4ff');
        const kx = l + 1, ky = T2(l + 3) + 5; A.ell(g, kx - 1, ky, 2.5, 2, '#2a52b0'); for (let k = 0; k < 7; k++) { A.px(g, kx - 3 - k * 0.7, ky + 1 + k, '#3a6ad0'); A.px(g, kx - 1 - k * 0.4, ky + 2 + k, '#2a52b0'); }
      } else if (hat === 'bow') { // a big ribbon bow, folded loops and a knot, tied on the side of the head
        const bx = hcx - 6, byy = T2(hcx - 6) + 1;
        [-1, 1].forEach((sd) => { for (let j = 0; j < 9; j++) for (let i = 0; i < 9 - Math.abs(j - 4); i++) A.px(g, bx + sd * (2 + i), byy - 4 + j, i > 6 - Math.abs(j - 4) ? '#a02838' : j < 4 ? '#e85a6a' : '#d04a5a'); A.line(g, bx + sd * 3, byy - 1, bx + sd * 6, byy, '#8a1e2e'); });
        A.rect(g, bx - 1, byy - 1, 3, 3, '#b83444'); A.px(g, bx - 1, byy - 1, '#ff9aa8');
        for (let k = 0; k < 5; k++) { A.px(g, bx - 1 - k * 0.5, byy + 2 + k, '#d04a5a'); A.px(g, bx + 1 + k * 0.6, byy + 2 + k, '#c04050'); }
      }
    }
    // armour, worn as real pieces: a chestplate with pauldrons, a helmet over the crown (Terraria-style ramps, rivets, trims)
    const AR = look.v3armor || [], hI = RW.ITEMS[AR[0]], bI = RW.ITEMS[AR[1]];
    const ramp = (c) => [RW.shade(c, -0.62), RW.shade(c, -0.4), RW.shade(c, -0.18), c, RW.shade(c, 0.28), RW.shade(c, 0.55)];
    const acc = look.ac && look.ac !== 'auto' && RW.ACCENTS ? RW.ACCENTS[look.ac] : null;
    if (bI) {
      const Rm = ramp(bI.tint || '#9aa3ad'), y0 = cy + Math.round(ry * 0.18), y1 = cy + Math.round(ry * 0.86), bs = look.bs || 'auto';
      for (let y = y0; y <= y1; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
        const d = inside(x - cx, y - cy); if (d < 0) continue;
        const band = Math.floor((y - y0) / 5), yy = (y - y0) % 5, nx = (x - cx) / rx;
        let col = yy === 0 ? Rm[4] : yy === 4 ? Rm[1] : nx < -0.4 ? Rm[3] : nx > 0.5 ? Rm[2] : Rm[3];
        if (bs === 'scale') col = ((x + (band % 2) * 2) % 4 === 0 || yy === 4) ? Rm[1] : yy === 0 ? Rm[4] : Rm[3];
        if (d > 0.9) col = Rm[1]; if (d > 0.96) col = Rm[0];
        A.px(g, x, y, col);
        if (bs === 'studded' && yy === 2 && (x + band) % 5 === 0 && d < 0.88) { A.px(g, x, y, Rm[5]); A.px(g, x + 1, y + 1, Rm[0]); }
      }
      for (let x = cx - rx; x <= cx + rx; x++) { const d = inside(x - cx, y0 - cy); if (d >= 0) { A.px(g, x, y0, Rm[5]); A.px(g, x, y0 - 1, Rm[0]); } }
      if (bs === 'fur') for (let x = cx - rx; x <= cx + rx; x++) { if (inside(x - cx, y0 - cy) < 0) continue; for (let k = 0; k < 3 + (x % 3 === 0 ? 1 : 0); k++) A.px(g, x, y0 - 1 + k, k === 0 ? '#e8dcc0' : x % 2 ? '#c8b894' : '#a89874'); }
      if (bs === 'sash') for (let k = 0; k < 30; k++) { const x = cx - rx + 4 + k, y = y0 + Math.round(k * 0.55); if (inside(x - cx, y - cy) > 0) { A.px(g, x, y, acc || '#c83a3a'); A.px(g, x, y + 1, RW.shade(acc || '#c83a3a', -0.35)); A.px(g, x, y - 1, RW.shade(acc || '#c83a3a', 0.3)); } }
      const emx = cx + Math.round(rx * 0.3), emy = cy + Math.round(ry * 0.45), ec2 = bI.glow || acc || Rm[5];
      A.rect(g, emx - 2, emy - 2, 5, 5, Rm[0]); A.rect(g, emx - 1, emy - 1, 3, 3, ec2); A.px(g, emx - 1, emy - 1, '#ffffff');
      [[-0.86, -1], [0.8, 1]].forEach(([fx, side]) => { const px0 = cx + Math.round(fx * rx), py0 = cy + Math.round(ry * 0.12); // pauldrons
        A.ell(g, px0, py0, 6.4, 4.6, Rm[0]); A.ell(g, px0, py0, 5.6, 3.8, Rm[2]); A.ell(g, px0 - 1, py0 - 1, 4.4, 2.6, Rm[3]); A.rect(g, px0 - 3, py0 - 3, 4, 1, Rm[5]);
        for (let k = -1; k <= 1; k++) A.px(g, px0 + k * 3, py0 + 2, Rm[1]); if (bI.glow) A.px(g, px0, py0, bI.glow); if (acc) A.rect(g, px0 - 4, py0 + 3, 8, 1, acc); });
    }
    if (hI) {
      const Rm = ramp(hI.tint || '#9aa3ad'), yb = cy - Math.round(ry * 0.36), hs = look.hs || 'auto';
      for (let x = cx - rx - 2; x <= cx + rx + 2; x++) { const t0 = T2(x); if (t0 >= yb) continue;
        for (let y = t0 - 1; y <= yb; y++) { const k = (y - (t0 - 1)) / Math.max(1, yb - t0 + 1), nx = (x - cx) / rx; let col = k < 0.15 ? Rm[5] : nx < -0.35 ? Rm[4] : nx > 0.45 ? Rm[2] : Rm[3]; if (y === t0 - 1) col = Rm[0]; if (y >= yb - 1) col = y === yb ? Rm[0] : Rm[1]; A.px(g, x, y, col); }
        if ((x - cx) % 6 === 0) A.px(g, x, yb - 1, Rm[5]); }
      const nxp = cx + ex - 2; A.rect(g, nxp, yb, 3, 7, Rm[1]); A.px(g, nxp, yb, Rm[4]); A.px(g, nxp + 1, yb + 6, Rm[0]);
      if (hI.glow) { A.px(g, cx - 3, top - 1, hI.glow); A.px(g, cx + 3, top, hI.glow); A.px(g, cx, yb - 3, hI.glow); }
      const ac2 = acc || '#c83a3a', tt = T2(cx - 2);
      if (hs === 'plume') for (let k = 0; k < 14; k++) { const x = cx - 2 - k, y = tt - 2 - Math.round(Math.sin(k / 13 * Math.PI) * 6) + (k > 9 ? k - 9 : 0); A.rect(g, x, y, 1, 3, k % 2 ? ac2 : RW.shade(ac2, 0.25)); A.px(g, x, y + 3, RW.shade(ac2, -0.4)); }
      else if (hs === 'crest') for (let k = 0; k < 16; k++) { const x = cx + 6 - k, y = T2(x) - 3; A.rect(g, x, y, 1, 3, k % 2 ? ac2 : RW.shade(ac2, -0.25)); A.px(g, x, y - 1, RW.shade(ac2, 0.35)); }
      else if (hs === 'horns') [-1, 1].forEach((sd) => { for (let k = 0; k < 9; k++) { const x = cx - 2 + sd * (8 + k), y = T2(cx - 2 + sd * 8) + 1 - Math.round(k * 1.1) - (k > 5 ? k - 5 : 0); A.rect(g, x, y, 2, 2, k < 6 ? '#e8e0c8' : '#c8bca0'); A.px(g, x, y + 2, '#8a8070'); } });
      else if (hs === 'wings') [-1, 1].forEach((sd) => { for (let k = 0; k < 4; k++) for (let j = 0; j < 7 - k; j++) A.px(g, cx - 2 + sd * (rx - 3 + j), yb - 4 - k * 2 - Math.round(j * 0.5), j === 6 - k ? '#a8a8b8' : '#f0f0f0'); });
      else if (hs === 'spike') { for (let k = 0; k < 8; k++) { const w = Math.max(0, Math.round((1 - k / 8) * 2)); for (let i = -w; i <= w; i++) A.px(g, cx - 2 + i, tt - 2 - k, i < 0 ? Rm[5] : Rm[2]); } }
    }
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

  // hats: the boulder paints them itself (snug, at twice the detail); the old 1x hat is skipped, and a helmet hides the hat
  const baseDr3 = A.dressed;
  A.dressed = function (species, look, armor) {
    if (species === 'rock' && look) {
      const head = armor && armor[0] && RW.ITEMS[armor[0]], body = armor && armor[1] && RW.ITEMS[armor[1]];
      if ((look.hat && look.hat !== 'none') || head || body) { arguments[1] = Object.assign({}, look, { hat: 'none', v3hat: head ? 'none' : look.hat, v3armor: [head ? armor[0] : '', body ? armor[1] : ''] }); arguments[2] = []; }
    }
    return baseDr3.apply(this, arguments);
  };
  // size: a pebble to a boulder (only the picture changes)
  const baseDPs = E.drawPlayer;
  E.drawPlayer = function (g, cam, p, look, opts) {
    if (opts && (opts.species || 'rock') === 'rock' && look && look.shape) { const k = SIZE_K[parse(look.shape).size] || 1; if (k !== 1) arguments[4] = Object.assign({}, opts, { scale: (opts.scale || 1) * k }); }
    return baseDPs.apply(this, arguments);
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
  A.dressed = function (species, look) {
    const cr = document.getElementById('creator'), open = species === 'rock' && cr && !cr.classList.contains('hidden-ui') && look;
    if (open) liveLook = look;
    const out = baseDr2.apply(this, arguments);
    // in the creator the rock stands still, facing you, unless you hover a move
    if (open && arguments.length < 3 && out && out[0]) {
      if (!RW.v3hoverMove) { const st = [out[0][0], out[0][0]]; return out.map(() => st); }
      const t = performance.now() / 1000, k = Math.floor(t * 7) % 4, run = Math.floor(t / 2) % 2, fr = out[(run && out[8 + k] ? 8 : 1) + k] || out[1 + k] || out[0], mv = [fr[0], fr[0]]; return out.map(() => mv);
    }
    return out;
  };
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
        b.onmouseenter = () => { if (!liveLook || key !== 'move') return; RW.v3hoverMove = true; b.__prev = liveLook.shape; const o = parse(liveLook.shape); o.move = k; liveLook.shape = join(o); };
        b.onmouseleave = () => { if (key === 'move') RW.v3hoverMove = false; if (b.__prev && liveLook && key === 'move' && parse(liveLook.shape).move === k && b.__prev !== liveLook.shape && !b.__clicked) liveLook.shape = b.__prev; b.__prev = null; };
        box.append(b); });
      Array.from(box.children).forEach((b) => b.addEventListener('click', () => { b.__clicked = true; setTimeout(() => (b.__clicked = false), 50); }));
      after.after(r); setTimeout(paint, 60); return r;
    };
    const r1 = mkRow('Body', BODIES, 'body', bodyRow);
    const r2 = mkRow('Arms', ARMS, 'arms', r1);
    const r3 = mkRow('Moves', MOVES, 'move', r2, 'Hover a move to watch it in the picture. Every move is only a look: same speed and strength.');
    const VNAMES = {}; Object.keys(VEINS).forEach((k) => (VNAMES[k] = k === 'none' ? 'None' : k[0].toUpperCase() + k.slice(1)));
    setTimeout(() => { const n3 = r3.nextElementSibling || r3; const r4 = mkRow('Face', FACEX, 'face', n3); const r5 = mkRow('Growths', BODYX, 'extra', r4); const r6 = mkRow('Size', SIZES, 'size', r5, 'Size is only a look too: every rock has the same reach and the same hitbox.'); setTimeout(() => mkRow('Veins', VNAMES, 'vein', r6.nextElementSibling || r6), 5); }, 5);
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
