// 4 Brothers World V2 — part 6: every hero runs in a full side view.
// Frames 1-4 (running) and 5 (in the air) are drawn in profile for the fuzzy, the acorn, the ghost and the rock:
// one eye at the front, only the near arm showing, legs that really stride. The idle, swing and swim frames are the
// original drawings. Sizes are exactly the originals (fuzzy 28x30, acorn 24x30, ghost 26x30, rock 28x36).
(function (RW) {
  'use strict';
  const A = RW.art; if (!A || !A.fuzzySprites || !A.rockSprites || !A.acornSprites || !A.ghostSprites) return;
  const { px, rect, line, ell } = A; const mk = A.canvas;
  const BAYER = [[0, 0.5], [0.75, 0.25]];
  const isSide = (f) => f >= 1 && f <= 5;
  // the stride: [near foot x, far foot x, near lift, far lift] for the four running frames, and the arm swing opposite to it
  const STRIDE = [[3, -3, 0, 0], [1, -1, 1, 0], [-3, 3, 0, 0], [-1, 1, 0, 1]];
  const strideOf = (frame) => (frame >= 1 && frame <= 4 ? STRIDE[frame - 1] : frame === 5 ? [2, -2, 1, 1] : [0, 0, 0, 0]);
  const swingOf = (frame) => (frame >= 1 && frame <= 4 ? [-2, -1, 2, 1][frame - 1] : 0);

  // ====================== FUZZY ======================
  const fuzzySide = function (look, frame) {
    const c = mk(28, 30), g = c.ctx; const C = A.furColors(look);
    const mid = RW.mix(C.base, C.dark, 0.5), deep = RW.mix(C.dark, '#000000', 0.3), muzzle = RW.mix(C.base, C.light, 0.3);
    const blush = RW.mix(C.base, '#ff7a8a', 0.5), ink = '#1a0e0a';
    const cx = 14, run = frame >= 1 && frame <= 4;
    const bob = run && frame % 2 ? -1 : 0, cy = 16 + bob + (frame === 5 ? -1 : 0), R0 = 9.5;
    const fl = look.fluff || 'round';
    const rad = (a) => {
      if (fl === 'shaggy') return R0 + 0.6 + 1.7 * Math.abs(Math.sin(a * 6 + 0.4)) * (Math.sin(a) > -0.4 ? 1 : 0.55);
      if (fl === 'spiky') { const s2 = Math.abs(Math.sin(a * 5 + 0.3)); return R0 + (Math.sin(a) < 0.1 ? Math.pow(s2, 5) * 3.6 : 0.4 + s2 * 0.6); }
      return R0 + 0.3 + 1.0 * Math.abs(Math.sin(a * 7));
    };
    const shade = (x, y) => { const d = Math.hypot(x, y); return 0.58 - x / R0 * 0.32 - y / R0 * 0.42 - Math.max(0, d - R0 + 1.5) * 0.1 + (BAYER[(y + 40) & 1][(x + 40) & 1] - 0.375) * 0.12; };
    const tone = (l) => (l > 0.8 ? C.light : l > 0.42 ? C.base : l > 0.12 ? mid : C.dark);
    // feet: one forward, one back, each lifting as it swings through (the toe points the way he runs)
    const foot = (x, lift, col) => { rect(g, x - 2, 28 - lift, 6, 2, col); rect(g, x - 1, 27 - lift, 3, 1, mid); px(g, x, 29 - lift, deep); px(g, x + 2, 29 - lift, deep); };
    const [xa, xb, la, lb] = strideOf(frame);
    foot(cx - 1 + xb, lb, RW.mix(C.dark, '#000000', 0.2)); foot(cx - 1 + xa, la, C.dark);
    // the fur ball (same size and fur as always); the lighter muzzle sits at the front
    for (let y = -14; y <= 13; y++) for (let x = -14; x <= 13; x++) {
      const d = Math.hypot(x, y); if (d > rad(Math.atan2(y, x))) continue;
      let col = tone(shade(x, y));
      if ((((x - 6) * (x - 6)) / 6 + ((y - 3.5) * (y - 3.5)) / 3) < 1 && col !== C.dark) col = muzzle;
      px(g, cx + x, cy + y, col);
    }
    for (let i = 0; i < 30; i++) {
      const a = RW.hash2(i, 5, 3) * Math.PI * 2, r = 3 + RW.hash2(i, 9, 3) * (R0 - 3.5);
      const x = Math.round(Math.cos(a) * r), y = Math.round(Math.sin(a) * r);
      if (x > 1 && y > -7 && y < 7) continue; // keep the face clear
      const l = shade(x, y); const col = l > 0.42 ? mid : l > 0.12 ? C.base : mid;
      const ox = Math.round(Math.cos(a + 0.6)), oy = Math.round(Math.sin(a + 0.6));
      px(g, cx + x, cy + y, col); px(g, cx + x + ox, cy + y + oy, col);
    }
    for (let k = 0; k < 5; k++) px(g, cx - 6 + k, cy - 8 + Math.round(Math.abs(k - 2) * 0.6), RW.mix(C.light, '#ffffff', 0.25));
    // the near paw: a round paw on his side that swings as he runs
    const armY = cy + 3, sw = swingOf(frame) * 1;
    const pawC = RW.mix(C.base, C.light, 0.5);
    const paw = (x, y) => { rect(g, x - 1, y, 6, 4, deep); rect(g, x, y - 1, 4, 6, deep); rect(g, x, y, 4, 4, pawC); px(g, x, y, C.light); px(g, x + 1, y, C.light); px(g, x + 3, y + 3, mid); };
    if (frame === 5) { paw(cx + 6, armY - 5); c.hand = { x: cx + 9, y: armY - 4 }; }
    else { paw(cx + 4 + sw, armY + 1); c.hand = { x: cx + 7 + sw, y: armY + 2 }; }
    // face in profile: one big eye, a rosy cheek, a little nose and a mouth at the front edge
    const eyes = look.eyes || 'big'; const ey = cy - 4, x = cx + 4;
    if (eyes === 'big') { rect(g, x + 1, ey, 2, 1, ink); rect(g, x, ey + 1, 4, 3, ink); rect(g, x + 1, ey + 4, 2, 1, ink); rect(g, x + 1, ey + 3, 2, 1, '#4a2a1e'); px(g, x + 1, ey + 1, '#ffffff'); px(g, x + 1, ey + 2, '#ffffff'); }
    else if (eyes === 'happy') { px(g, x, ey + 3, ink); px(g, x + 1, ey + 2, ink); px(g, x + 2, ey + 2, ink); px(g, x + 3, ey + 3, ink); }
    else if (eyes === 'sleepy') { rect(g, x, ey + 3, 4, 1, ink); rect(g, x + 1, ey + 2, 2, 1, mid); }
    else { rect(g, x + 1, ey + 2, 2, 2, ink); px(g, x + 1, ey + 2, '#ffffff'); }
    rect(g, cx + 2, ey + 5, 2, 1, blush);
    rect(g, cx + 9, cy - 1, 2, 2, '#3a1e14'); px(g, cx + 9, cy - 1, '#6a4030'); // nose
    const mo = look.mouth || 'smile', my = cy + 3, lip = '#5a2a1a', m = cx + 6;
    if (mo === 'smile') { px(g, m - 2, my, lip); px(g, m - 1, my + 1, lip); px(g, m, my + 1, lip); px(g, m + 1, my, lip); }
    else if (mo === 'open') { rect(g, m - 2, my, 4, 1, lip); rect(g, m - 1, my + 1, 2, 2, '#e87a8a'); px(g, m - 2, my + 1, lip); px(g, m + 1, my + 1, lip); }
    else if (mo === 'fangs') { rect(g, m - 2, my, 4, 1, lip); px(g, m - 2, my + 1, '#ffffff'); px(g, m + 1, my + 1, '#ffffff'); }
    const ex = look.extra || 'none'; const top = cy - Math.round(rad(-Math.PI / 2));
    if (ex === 'leaf') { for (let k = 0; k < 7; k++) line(g, cx - 3 + k, top + 1, cx - 2 + k, top - 2 - Math.round(2 - Math.abs(k - 3) * 0.6), k % 2 ? '#6ab84a' : '#4a8a3a'); line(g, cx - 1, top - 1, cx + 3, top - 3, '#3a6a2a'); px(g, cx - 3, top - 4, '#8ad86a'); }
    else if (ex === 'scarf') { rect(g, cx - 8, cy + 6, 16, 2, '#b84a3a'); rect(g, cx - 7, cy + 6, 14, 1, '#d8604a'); rect(g, cx - 11, cy + 7, 4, 2, '#a03a2a'); px(g, cx - 11, cy + 8, '#d8604a'); }
    else if (ex === 'flower') { [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => px(g, cx + 2 + dx, cy - 8 + dy, '#f0a0c0')); px(g, cx + 2, cy - 8, '#ffe36a'); px(g, cx + 1, cy - 6, '#4a8a3a'); }
    A.outline(c, '#1a100a');
    return c;
  };

  // ====================== ROCK ======================
  const rockSide = function (look, frame) {
    const c = mk(28, 36), g = c.ctx; const C = A.rockColors(look); const rt = C.rt;
    const shp = { tall: [12, 15, 6], stocky: [14, 12, 5], slim: [10, 15, 7] }[look.shape] || [12, 15, 6];
    const [bw0, bh, lh] = shp; const bw = bw0, cx = 14, foot = 35;
    const [xa, xb, la, lb] = strideOf(frame); const sw = swingOf(frame);
    const tTop = foot - lh - bh + 1, tx = cx - Math.floor(bw / 2), armTop = tTop + 1, armLen = bh + 1;
    // far arm, behind the body, swinging the other way
    const farC = RW.shade(C.base, -0.32);
    if (frame === 5) rect(g, cx - 4, armTop + 2, 4, armLen - 5, farC); else rect(g, cx - 2 - sw, armTop, 4, armLen, farC);
    // legs: far leg darker, the toe of each foot points forward
    const leg = (x, lift, col) => { rect(g, cx - 2 + x, foot - lh, 4, lh + 1 - lift, col); rect(g, cx - 2 + x, foot - lift, 6, 1, col); };
    leg(xb, lb, RW.shade(C.dark, -0.25)); leg(xa, la, C.dark);
    // torso
    rect(g, tx, tTop, bw, bh, C.base);
    for (let y = tTop; y < tTop + bh; y++) for (let x = tx; x < tx + bw; x++) {
      const h = RW.hash2(x, y, 77);
      if (x === tx || y === tTop) px(g, x, y, C.light);
      else if (x === tx + bw - 1 || y > tTop + bh - 3) px(g, x, y, C.dark);
      if (h > 0.9) px(g, x, y, C.fleck[0]); else if (h < 0.05 && C.fleck[1]) px(g, x, y, C.fleck[1]);
      if (rt.bands && (y - tTop) % 5 === 2 && h > 0.25) px(g, x, y, C.light);
    }
    if (rt.veins) line(g, tx + 2, tTop + 2, tx + bw - 3, tTop + bh - 4, C.dark);
    if (rt.gloss) line(g, tx + 2, tTop + 1, tx + 2, tTop + 5, '#8a80a0');
    g.clearRect(tx, tTop, 1, 1); g.clearRect(tx + bw - 1, tTop, 1, 1);
    const crack = look.cracks || 'bolt', cc = crack === 'magma' ? '#ff6a2a' : RW.shade(C.dark, -0.45);
    if (crack === 'bolt' || crack === 'magma') {
      let x = cx, y = tTop + 1; const pts = [[x, y]];
      for (let k = 0; k < 5; k++) { x += k % 2 ? -2 : 2; y += Math.ceil(bh / 5); pts.push([x, Math.min(y, tTop + bh - 1)]); }
      for (let k = 0; k < pts.length - 1; k++) line(g, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], cc);
      if (crack === 'magma') pts.forEach(([a, b2]) => px(g, a, b2, '#ffd08a'));
    } else if (crack === 'web') {
      line(g, cx - 2, tTop + 3, cx + 1, tTop + 7, cc); line(g, cx + 1, tTop + 7, cx + 3, tTop + 5, cc); line(g, cx + 1, tTop + 7, cx - 1, tTop + 11, cc); line(g, cx - 3, tTop + 9, cx - 1, tTop + 11, cc);
    } else if (crack === 'split') line(g, cx, tTop + 2, cx, tTop + bh - 1, cc);
    // head, turned to face the way he runs: the face is on the front half, with a brow ridge that sticks out
    const hw = Math.max(6, bw - 2), hh = 6, hx = tx + 1, hy = tTop - hh + 2, fr = hx + hw; // fr = the front edge of the head
    rect(g, hx, hy, hw, hh, C.base); rect(g, hx, hy, hw, 1, C.light); rect(g, hx, hy + hh - 1, hw, 1, C.dark);
    rect(g, fr, hy + 1, 1, 3, C.base); px(g, fr, hy + 1, C.light);
    const glow = RW.GLOWS[look.glow] || look.glow || RW.GLOWS.amber;
    rect(g, fr - 4, hy + 2, 5, 2, RW.shade(C.dark, -0.3));
    const ey = hy + 2, eyes = look.eyes || 'round', fx = fr - 3;
    if (eyes === 'cyclops') { rect(g, fx - 1, ey, 3, 2, glow); px(g, fx, ey, '#ffffff'); }
    else if (eyes === 'narrow') rect(g, fx - 1, ey + 1, 3, 1, glow);
    else if (eyes === 'sleepy') { rect(g, fx - 1, ey + 1, 3, 1, glow); rect(g, fx - 1, ey, 3, 1, C.dark); }
    else { rect(g, fx, ey, 2, 2, glow); px(g, fx, ey, '#ffffff'); }
    const mouth = look.mouth || 'none', dk = RW.shade(C.dark, -0.4);
    if (mouth === 'line') rect(g, fr - 3, hy + hh - 2, 3, 1, dk);
    else if (mouth === 'grin') { rect(g, fr - 4, hy + hh - 2, 4, 1, dk); px(g, fr - 4, hy + hh - 3, dk); px(g, fr - 1, hy + hh - 3, dk); }
    else if (mouth === 'beard') { for (let k = 0; k < 4; k++) line(g, fr - 4 + k, hy + hh - 1, fr - 4 + k, hy + hh + 2 + (k % 3), k % 2 ? '#5f7d4a' : '#4a6a3a'); }
    // the near arm, in front of the body, swinging opposite to the near leg (raised when he jumps)
    const nearC = C.base;
    if (frame === 5) { rect(g, cx - 2, armTop - 2, 6, armLen - 3, C.dark); rect(g, cx - 1, armTop - 1, 4, armLen - 4, nearC); rect(g, cx - 1, armTop - 1, 4, 1, C.light); rect(g, cx - 1, armTop + armLen - 6, 4, 2, C.dark); c.hand = { x: cx + 2, y: armTop - 1 }; }
    else { rect(g, cx - 3 + sw, armTop - 1, 6, armLen + 1, C.dark); rect(g, cx - 2 + sw, armTop, 4, armLen - 1, nearC); rect(g, cx - 2 + sw, armTop, 4, 1, C.light); rect(g, cx - 2 + sw, armTop + armLen - 3, 4, 2, RW.shade(C.base, -0.2)); c.hand = { x: cx + 1 + sw, y: armTop + armLen - 2 }; }
    // topper (on the head, tufts on the shoulders)
    const top = look.topper || 'mushroom', hcx = hx + Math.floor(hw / 2);
    if (top === 'mushroom' || top === 'moss') for (let k = 0; k < 5; k++) { px(g, tx - 3 + k, tTop - 1 - (k % 2), k % 2 ? '#6f8f4a' : '#4f6f3a'); px(g, tx + bw - 2 + k, tTop - 1 - (k % 2), k % 2 ? '#6f8f4a' : '#4f6f3a'); }
    if (top === 'mushroom') {
      const cw = hw + 6, cy0 = hy - 3;
      for (let r = 0; r < 4; r++) { const w = cw - (3 - r) * 2; rect(g, hcx - Math.floor(w / 2), cy0 + r, w, 1, r === 0 ? '#c07858' : '#9a5a42'); }
      rect(g, hcx - Math.floor(cw / 2), cy0 + 3, cw, 1, '#6a3a2a');
      [[-4, 1], [0, 0], [3, 2], [-1, 2], [5, 1]].forEach(([dx, dy]) => px(g, hcx + dx, cy0 + dy, '#e8d8c0'));
    } else if (top === 'moss') {
      for (let k = 0; k < hw + 2; k++) line(g, hx - 1 + k, hy, hx - 1 + k, hy - 2 - (k % 3), k % 2 ? '#6f8f4a' : '#4f6f3a');
    } else if (top === 'crystal') {
      [[-3, 4], [0, 6], [3, 3]].forEach(([dx, h]) => { line(g, hcx + dx, hy - 1, hcx + dx, hy - h, '#6fb8e8'); line(g, hcx + dx + 1, hy - 1, hcx + dx + 1, hy - h + 1, '#b8e8ff'); });
    } else if (top === 'lichen') {
      for (let k = 0; k < hw; k++) px(g, hx + k, hy - 1, k % 2 ? '#c8c86a' : '#a8a84a'); px(g, hx + 1, hy - 2, '#c8c86a'); px(g, hx + hw - 2, hy - 2, '#a8a84a');
    } else if (top === 'pebbles') {
      for (let k = 0; k < 4; k++) ell(g, hx + 1 + k * 2, hy - 1 - (k % 2), 1, 1, k % 2 ? C.light : '#8a8a92');
    }
    A.outline(c, '#141218');
    return c;
  };

  // ====================== ACORN ======================
  const acornAdj = (hex, look, maxS) => { const [h, s, l] = RW.rgbToHsl(...RW.hexToRgb(hex)); return RW.hslToHex(h + (look.hue || 0), Math.min(s, maxS || 0.6), RW.clamp(l + (look.tone || 0), 0.06, 0.94)); };
  const acornSide = function (look, frame) {
    const c = mk(look._gear && look._gear.c ? 34 : 24, 30), g = c.ctx; const sh = RW.SHELLS[look.shell] || RW.SHELLS.brown;
    const adj = (h) => acornAdj(h, look);
    const base = adj(sh.base), dark = adj(sh.dark), light = adj(sh.light), cap = adj(sh.cap), capD = adj(sh.capDark);
    const deep = RW.mix(dark, '#000000', 0.3), capL = RW.mix(cap, '#ffffff', 0.22), capDD = RW.mix(capD, '#000000', 0.35), gleam = RW.mix(light, '#ffffff', 0.4);
    const ink = '#1a0e0a', blush = RW.mix(base, '#ff7a8a', 0.45);
    const cx = c.width / 2, run = frame >= 1 && frame <= 4, walk = run ? [0, 1, 0, -1][frame - 1] : 0;
    const bob = run && frame % 2 ? -1 : 0; const ty = 11 + bob + (frame === 5 ? -1 : 0);
    if (look._gear && A.acornGearBack) A.acornGearBack(g, look._gear, { cx, ty, by: ty + 2, frame, walk });
    const [xa, xb, la, lb] = strideOf(frame);
    const leg = (x, lift, col, shoe) => { rect(g, x, 25 - lift, 2, 3, col); rect(g, x, 27 - lift, 4, 2, shoe); };
    leg(cx - 1 + xb, lb, RW.mix(capD, '#000000', 0.2), RW.mix(capDD, '#000000', 0.2)); leg(cx - 1 + xa, la, capD, capDD);
    const by = ty + 2;
    for (let y = 0; y <= 13; y++) {
      const hw = y < 5 ? 7 - (y === 0 ? 0.6 : 0) : 7 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 5) / 9.3, 2)));
      for (let x = -7; x <= 7; x++) {
        if (Math.abs(x) > hw + 0.25) continue;
        let l = 0.62 - x / 7 * 0.42 - y / 13 * 0.3 + (BAYER[(y + 40) & 1][(x + 40) & 1] - 0.375) * 0.1;
        let col = l > 0.8 ? light : l > 0.4 ? base : l > 0.12 ? dark : deep;
        if (y > 5 && (x === -3 || x === 3) && (y % 3 !== 0)) col = RW.mix(col, dark, 0.35);
        px(g, cx + x, by + y, col);
      }
    }
    px(g, cx, by + 14, deep); px(g, cx, by + 13, dark);
    for (let y = 2; y <= 6; y++) px(g, cx - 5, by + y, gleam); px(g, cx - 4, by + 1, gleam);
    // the near arm only: a thin twig with a round hand, swinging opposite to the near leg
    const ay = by + 7; const sw = swingOf(frame);
    const arm = (x0, y0, x1, y1) => { line(g, x0, y0, x1, y1, capD); rect(g, x1 - 1, y1, 2, 2, capD); };
    if (frame === 5) { arm(cx - 1, ay, cx + 3, ay - 3); c.hand = { x: cx + 3.5, y: ay - 2 }; }
    else { arm(cx - 1, ay, cx - 1 + sw, ay + 4); c.hand = { x: cx - 0.5 + sw, y: ay + 5 }; }
    // the cap (round from the side as well)
    const style = look.cap || 'classic'; const hgt = style === 'tall' ? 8 : 6;
    for (let r = 1; r <= hgt; r++) {
      const hw = Math.round(9.4 * Math.sqrt(Math.max(0, 1 - Math.pow((r - 0.5) / (hgt + 0.6), 2))));
      for (let x = -hw; x <= hw; x++) {
        let col = x < -hw * 0.35 && r > hgt * 0.3 ? capL : x > hw * 0.45 ? capD : cap;
        if ((style === 'classic' || style === 'tall') && ((x + (r % 2) * 1.5 + 30) % 3 < 1) && r % 2 === 0) col = capD;
        if (style === 'spiky' && (x + r * 2 + 30) % 4 === 0) col = capDD;
        if (style === 'smooth' && x > -hw + 1 && x < -hw + 4 && r > 1 && r < hgt) col = RW.mix(capL, '#ffffff', 0.3);
        px(g, cx + x, ty - r + 1, col);
      }
    }
    for (let x = -10; x <= 10; x++) { px(g, cx + x, ty + 1, x < -4 ? capL : cap); px(g, cx + x, ty + 2, capDD); }
    if (style === 'spiky') { for (let x = -10; x <= 10; x += 2) px(g, cx + x, ty + 3, capD); for (let x = -7; x <= 7; x += 3) px(g, cx + x, ty - hgt, capD); }
    const st = ty - hgt; px(g, cx, st, capD); px(g, cx, st - 1, capD); px(g, cx + 1, st - 2, capD); px(g, cx + 1, st - 1, RW.mix(capD, '#ffffff', 0.15));
    if (look._gear && A.acornGearFront) A.acornGearFront(g, look._gear, { cx, ty, by, hgt, frame, walk, ay, hand: c.hand });
    // face in profile: one eye near the front, a cheek, the mouth at the front edge
    const ey = by + 4, eyes = look.eyes || 'big', x = cx + 2;
    if (eyes === 'big') { rect(g, x, ey, 3, 3, ink); px(g, x + 1, ey - 1, ink); px(g, x + 1, ey + 3, ink); px(g, x, ey, '#ffffff'); px(g, x + 1, ey, '#ffffff'); px(g, x + 2, ey + 2, '#c8b8b0'); }
    else if (eyes === 'happy') { px(g, x, ey + 2, ink); px(g, x + 1, ey + 1, ink); px(g, x + 2, ey + 2, ink); }
    else if (eyes === 'sleepy') { rect(g, x, ey + 2, 3, 1, ink); rect(g, x, ey + 1, 3, 1, dark); }
    else { rect(g, x, ey + 1, 3, 2, ink); px(g, x + 2, ey + 1, '#ffffff'); line(g, x - 1, ey, x + 3, ey, '#3a2016'); }
    rect(g, cx + 1, ey + 4, 2, 1, blush);
    const mo = look.mouth || 'smile', my = ey + 5, lip = '#5a2a1a', cxm = cx + 4;
    if (mo === 'smile') { px(g, cxm - 1, my, lip); px(g, cxm, my + 1, lip); px(g, cxm + 1, my, lip); }
    else if (mo === 'open') { rect(g, cxm - 1, my, 3, 2, lip); px(g, cxm, my + 1, '#e87a8a'); }
    else if (mo === 'grin') { rect(g, cxm - 2, my, 4, 1, lip); rect(g, cxm - 1, my + 1, 3, 1, '#ffffff'); }
    const ex = look.extra || 'none';
    if (ex === 'leaf') { for (let k = 0; k < 6; k++) line(g, cx + 2 + k, st - 1, cx + 3 + k, st - 3 - Math.round(1.5 - Math.abs(k - 2.5) * 0.5), k % 2 ? '#6ab84a' : '#4a8a3a'); line(g, cx + 2, st - 1, cx + 7, st - 3, '#3a6a2a'); }
    else if (ex === 'stick') { line(g, cx + 3, ay + 4, cx + 5, ay - 7, '#6a4a2e'); px(g, cx + 5, ay - 8, '#4a8a3a'); px(g, cx + 4, ay - 8, '#6ab84a'); }
    else if (ex === 'scarf') { rect(g, cx - 6, by + 10, 13, 2, '#3a6aa8'); rect(g, cx - 5, by + 10, 11, 1, '#5a8ac8'); rect(g, cx - 9, by + 11, 4, 2, '#2a5a98'); }
    A.outline(c, '#1a100a');
    return c;
  };

  // ====================== GHOST (V2's cloud blob) ======================
  const disc = (g, cx, cy, r, col, light, shade) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r * 0.6) continue;
      let c = col; if (light && dy < -r * 0.35 && dx < r * 0.2) c = light; else if (shade && dy > r * 0.45) c = shade;
      px(g, Math.round(cx + dx), Math.round(cy + dy), c);
    }
  };
  const hueOf = (hex, look, sat) => {
    if (!look || (!look.hue && !look.tone)) return hex;
    const [h, s, l] = RW.rgbToHsl(...RW.hexToRgb(hex));
    return RW.shade(RW.hslToHex(h + (look.hue || 0), Math.min(1, s + Math.abs(look.hue || 0) * (sat || 0.004)), l), look.tone || 0);
  };
  const ghostSide = function (look, frame) {
    const c = mk(26, 30), g = c.ctx;
    const sheet = hueOf(RW.SHEETS[look.sheet] || RW.SHEETS.white, look), light = RW.shade(sheet, 0.3), shade = RW.shade(sheet, -0.22);
    const shape = look.shape || 'round', cx = 13;
    const bob = Math.round(Math.sin(frame * 1.3)) - (frame === 5 ? 2 : 0);
    const walk = frame >= 1 && frame <= 4 ? frame : 0; const trail = walk ? -2 - (walk % 2) : (frame === 5 ? -2 : 0);
    let puffs;
    if (shape === 'tall') puffs = [[cx, 8, 5], [cx - 1, 14, 6], [cx + 1, 19, 6], [cx - 4 + trail, 23, 4], [cx + 3 + trail, 24, 3]];
    else if (shape === 'tattered') puffs = [[cx, 11, 7], [cx - 5, 15, 5], [cx + 5, 15, 5], [cx + trail - 6, 22, 3], [cx + trail, 24, 3], [cx + trail + 6, 21, 2], [cx + trail - 9, 19, 2]];
    else puffs = [[cx, 11, 7], [cx - 6, 15, 5], [cx + 6, 15, 5], [cx, 17, 7], [cx - 4 + trail, 23, 4], [cx + 4 + trail, 23, 3]];
    puffs.forEach(([x, y, r]) => { g.globalAlpha = y > 21 ? 0.6 : 1; disc(g, x, y + bob, r, sheet, light, shade); });
    g.globalAlpha = 1;
    // only the near puff arm, held out in front of him
    const ay = 15 + bob, f2 = frame % 2;
    disc(g, cx + 4, ay + f2, 2, sheet, light, shade); c.hand = { x: cx + 6, y: ay + f2 + 1 };
    // face in profile: one eye and the mouth near the front edge
    const ey = (shape === 'tall' ? 9 : 10) + bob, eyes = look.eyes || 'hollow', x = cx + 4;
    if (eyes === 'cyclops') { ell(g, x, ey + 1, 2, 2, '#14121e'); px(g, x, ey + 1, '#c8a6ff'); px(g, x - 1, ey, '#ffffff'); }
    else if (eyes === 'hollow') rect(g, x - 1, ey, 2, 3, '#14121e');
    else if (eyes === 'glowing') { rect(g, x - 1, ey, 2, 3, '#14121e'); px(g, x, ey + 1, '#9ad8ff'); }
    else rect(g, x - 1, ey + 2, 3, 1, '#14121e');
    const mo = look.mouth || 'o', my = ey + 5, m = cx + 5;
    if (mo === 'o') rect(g, m - 1, my, 2, 2, '#14121e');
    else if (mo === 'smile') { px(g, m - 2, my, '#14121e'); rect(g, m - 1, my + 1, 2, 1, '#14121e'); px(g, m + 1, my, '#14121e'); }
    else if (mo === 'fangs') { rect(g, m - 2, my, 4, 1, '#14121e'); px(g, m - 2, my + 1, '#ffffff'); px(g, m + 1, my + 1, '#ffffff'); }
    const ex = look.extra || 'none';
    if (ex === 'crown') { const ty = (shape === 'tall' ? 2 : 3) + bob; rect(g, cx - 3, ty + 1, 7, 2, '#f2c94c'); [cx - 3, cx, cx + 3].forEach((xx) => px(g, xx, ty, '#f2c94c')); px(g, cx, ty + 1, '#e0525a'); }
    else if (ex === 'chain') { for (let k = 0; k < 4; k++) px(g, cx - 6 + trail - k, 24 + bob + (k % 2), k % 2 ? '#9aa3ad' : '#6a7380'); }
    else if (ex === 'lantern') { const lx = c.hand.x, ly = c.hand.y + 1; rect(g, lx, ly, 3, 4, '#5a4a3a'); rect(g, lx + 1, ly + 1, 1, 2, '#ffd36a'); }
    return c;
  };

  // ====================== install ======================
  // Each hero's sprite set keeps its frames 0, 6 and 7 (idle, swing, swim) and gets the side-view frames 1-5 swapped in.
  const wrapSprites = (name, fn, defName) => {
    const orig = A[name]; if (!orig) return; const cache = {};
    A[name] = function (look) {
      const key = JSON.stringify(look || null); if (cache[key]) return cache[key];
      const look2 = look || A[defName] || {};
      const out = orig.call(this, look).map((pair, f) => { if (!isSide(f)) return pair; const r = fn(look2, f); return [r, A.flip(r)]; });
      return (cache[key] = out);
    };
  };
  wrapSprites('fuzzySprites', fuzzySide, 'DEFAULT_FUZZY'); wrapSprites('rockSprites', rockSide, 'DEFAULT_LOOK');
  wrapSprites('acornSprites', acornSide, 'DEFAULT_ACORN'); wrapSprites('ghostSprites', ghostSide, 'DEFAULT_GHOST');
  A.sideFrames = { fuzzy: fuzzySide, rock: rockSide, acorn: acornSide, ghost: ghostSide };
})(window.RW);
