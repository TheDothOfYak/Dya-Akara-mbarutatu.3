// 4 Brothers World V3: the four brothers. Each one moves, fights and explores in his own way.
// Art target: McKay's smooth references (clean dark-brown outline, soft gradients, big glossy eyes, w-smile with tongue).
(function () {
  'use strict';
  const V3 = window.V3, U = V3.util, P = V3.paint, W = V3.world, S = V3.sky, I = V3.input, TAU = U.TAU;
  const INK = '#3b1f12';
  const HS = (V3.heroes = {});
  const A = () => V3.audio;

  // ================= shared face parts (also used by villagers) =================
  // big glossy eye: dark ring, brown iris lit from below, white highlight top-left
  HS.eye = (g, x, y, r, open, glow) => {
    if (open !== undefined && open < 0.2) { P.ink(g, [[x - r, y - r * 0.1], [x, y + r * 0.4], [x + r, y - r * 0.1]], r * 0.3, '#2a140c'); return; }
    const o = open === undefined ? 1 : open;
    if (glow) { g.globalCompositeOperation = 'lighter'; P.glow(g, x, y, r * 1.9, glow, 0.42); g.globalCompositeOperation = 'source-over'; }
    P.ell(g, x, y, r, r * o, '#1c0e09');
    const gr = g.createRadialGradient(x, y + r * 0.55 * o, r * 0.1, x, y + r * 0.1, r * 0.95);
    gr.addColorStop(0, glow || '#a85a26'); gr.addColorStop(0.6, glow ? U.mixHex(glow, '#3a1a0c', 0.4) : '#4a230f'); gr.addColorStop(1, 'rgba(28,14,9,0)');
    P.ell(g, x, y + r * 0.1 * o, r * 0.84, r * 0.84 * o, gr);
    P.ell(g, x, y - r * 0.05 * o, r * 0.5, r * 0.55 * o, glow ? '#fff3c0' : '#120806');
    P.ell(g, x - r * 0.3, y - r * 0.4 * o, r * 0.32, r * 0.32 * o, '#fff');
    P.ell(g, x + r * 0.34, y + r * 0.36 * o, r * 0.11, r * 0.11 * o, 'rgba(255,255,255,.75)');
  };
  // the small open "w" smile with a pink tongue. mood: 1 happy, 0 flat, -1 ouch, 2 big "o"
  HS.mouth = (g, x, y, s, mood) => {
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (mood === 2) { P.ell(g, x, y + s * 0.3, s * 0.45, s * 0.55, '#4a1512'); P.ell(g, x, y + s * 0.55, s * 0.28, s * 0.22, '#f0707c'); g.strokeStyle = INK; g.lineWidth = s * 0.16; g.beginPath(); g.ellipse(x, y + s * 0.3, s * 0.45, s * 0.55, 0, 0, TAU); g.stroke(); return; }
    if (mood === -1) { P.ink(g, [[x - s * 0.6, y + s * 0.4], [x - s * 0.2, y], [x + s * 0.2, y + s * 0.4], [x + s * 0.6, y]], s * 0.18, INK); return; }
    if (mood === 0) { P.ink(g, [[x - s * 0.5, y + s * 0.1], [x, y + s * 0.25], [x + s * 0.5, y + s * 0.1]], s * 0.18, INK); return; }
    g.beginPath(); g.moveTo(x - s, y - s * 0.05); g.quadraticCurveTo(x - s * 0.5, y + s * 0.42, x, y + s * 0.02); g.quadraticCurveTo(x + s * 0.5, y + s * 0.42, x + s, y - s * 0.05);
    g.quadraticCurveTo(x + s * 0.55, y + s * 1.25, x, y + s * 1.2); g.quadraticCurveTo(x - s * 0.55, y + s * 1.25, x - s, y - s * 0.05); g.closePath();
    g.fillStyle = '#5a1a16'; g.fill();
    g.save(); g.clip(); P.ell(g, x, y + s * 1.12, s * 0.55, s * 0.42, '#f27d8a'); g.restore();
    g.strokeStyle = INK; g.lineWidth = s * 0.17; g.stroke();
  };
  const face = (g, cx, cy, er, gap, turn, st, o) => {
    o = o || {};
    const sh = turn * gap * 0.38, near = 1 + Math.abs(turn) * 0.06, far = 1 - Math.abs(turn) * 0.16;
    const lx = cx - gap / 2 + sh, rx = cx + gap / 2 + sh;
    HS.eye(g, lx, cy, er * (turn < 0 ? near : far), st.blink, o.glow);
    HS.eye(g, rx, cy, er * (turn > 0 ? near : far), st.blink, o.glow);
    if (o.blush !== false) { P.blush(g, lx - er * 0.9, cy + er * 1.15, er * 0.7); P.blush(g, rx + er * 0.9, cy + er * 1.15, er * 0.7); }
    HS.mouth(g, cx + sh * 1.15, cy + er * (o.mouthY || 0.95), er * (o.mouthS || 0.62), st.mood);
  };
  const mitt = (g, x, y, rx, ry, rot, c0, c1) => { g.save(); g.translate(x, y); g.rotate(rot); P.ell(g, 0, 0, rx, ry, P.lin(g, -rx, -ry, rx, ry, [[0, c0], [1, c1]])); g.strokeStyle = INK; g.lineWidth = 2.8; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke(); g.restore(); };
  const foot = (g, x, y, w, c0, c1, lift) => { g.save(); g.translate(x, y - (lift || 0)); P.rr(g, -w, -w * 0.95, w * 2, w * 1.25, w * 0.6); g.fillStyle = P.lin(g, 0, -w, 0, w * 0.4, [[0, c0], [1, c1]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.8; g.stroke(); g.lineWidth = 1.6; g.beginPath(); g.moveTo(-w * 0.3, -w * 0.1); g.lineTo(-w * 0.3, w * 0.25); g.moveTo(w * 0.3, -w * 0.1); g.lineTo(w * 0.3, w * 0.25); g.stroke(); g.restore(); };
  HS.shadow = (g, x, y, w, a) => P.ell(g, x, y + 3, w, w * 0.2, 'rgba(40,20,10,' + (a === undefined ? 0.28 : a) + ')');

  // ================= the four drawings. origin = feet centre; st = animation state =================
  // st: {f (facing), turn (-1..1 smoothed), walk (phase), sx, sy (squash), blink, mood, t, ...}
  const drawFuzzy = (g, st) => {
    const R = 37 * (1 + (st.puff || 0) * 0.5), cy = -R - 8 + (st.puff ? 0 : Math.sin(st.t * 3) * 1);
    const step = Math.sin(st.walk), lean = U.clamp(st.vx / 900, -0.25, 0.25);
    const cs = st.cols || ['#dc9655', '#b76d35', '#7e4520'], c0 = cs[0], c1 = cs[1], c2 = cs[2];
    if (st.streak) { g.lineCap = 'round'; for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(255,236,205,' + (0.75 - i * 0.1) + ')'; g.lineWidth = 5 - i * 0.5; const yy = cy - 22 + i * 9; g.beginPath(); g.moveTo(-st.sdx * (24 + i % 2 * 8), yy - st.sdy * 20); g.lineTo(-st.sdx * (70 + (i * 37) % 40), yy - st.sdy * 60); g.stroke(); } }
    foot(g, -15, 0, 10.5, c1, c2, Math.max(0, step) * 6 * st.moving); foot(g, 15, 0, 10.5, c1, c2, Math.max(0, -step) * 6 * st.moving);
    g.save(); g.translate(0, cy); g.rotate(lean); g.scale(st.sx, st.sy);
    mitt(g, -R - 3, 8 + step * 3 * st.moving, 8.5, 11, 0.5 + step * 0.3 * st.moving, c1, c2);
    // fur: three overlapping layers of soft pointed tufts (like shingles), swept back by speed, standing up with static
    const sweep = U.clamp(-st.vx / 420, -0.6, 0.6), stand = 1 + (st.charge || 0) * 0.22 + (st.puff || 0) * 0.1, fx = st.back ? 99 : st.turn * 6;
    const tuft = (a, rad, len, wid, k, outer) => {
      // a tuft rooted at angle a on a circle of radius rad; it leans downward at the sides, as hanging fur does
      const droop = (st.charge ? 1 - st.charge * 0.8 : 1) * 0.5 * Math.cos(a) * (Math.sin(a) > -0.75 ? 1 : 0.3);
      const ta = a + droop + sweep * 0.45 * Math.abs(Math.sin(a)) + Math.sin(st.t * 3 + k * 1.7) * 0.03;
      const bx = Math.cos(a) * rad, by = Math.sin(a) * rad * 0.97, px = -Math.sin(a), py = Math.cos(a);
      const tx = bx + Math.cos(ta) * len + sweep * len * 0.5, ty = by + Math.sin(ta) * len;
      if (!outer && Math.abs(tx - fx) < R * 0.66 && ty > -R * 0.42 && ty < R * 0.5) return;
      g.beginPath(); g.moveTo(bx - px * wid, by - py * wid);
      g.quadraticCurveTo(bx - px * wid * 0.7 + Math.cos(ta) * len * 0.55, by - py * wid * 0.7 + Math.sin(ta) * len * 0.55, tx, ty);
      g.quadraticCurveTo(bx + px * wid * 0.7 + Math.cos(ta) * len * 0.55, by + py * wid * 0.7 + Math.sin(ta) * len * 0.55, bx + px * wid, by + py * wid);
      const lit = bx + by < -R * 0.25;
      g.fillStyle = by > R * 0.45 ? U.mixHex(c1, c2, outer ? 0.8 : 0.45) : lit ? U.mixHex(c0, c1, 0.3) : c1; g.fill();
      g.strokeStyle = outer ? INK : 'rgba(74,36,14,.42)'; g.lineWidth = outer ? 3 : 1.6; g.stroke();
    };
    g.lineJoin = 'round'; g.lineCap = 'round';
    const N0 = 30; for (let i = 0; i < N0; i++) { const a = (i / N0) * TAU + 0.1; tuft(a, R * 0.86, R * (0.27 + U.hash(i * 3.7) * 0.12) * stand, R * 0.17, i, true); }
    const gr = g.createRadialGradient(-R * 0.3, -R * 0.45, R * 0.1, 0, 0, R * 1.2); gr.addColorStop(0, c0); gr.addColorStop(0.6, c1); gr.addColorStop(1, c2);
    P.ell(g, 0, 0, R * 0.93, R * 0.9, gr);
    P.glow(g, R * 0.15, R * 0.7, R * 0.7, c2, 0.4);
    const N1 = 24; for (let i = 0; i < N1; i++) { const a = (i / N1) * TAU + 0.23; tuft(a, R * 0.76, R * 0.27, R * 0.16, i + 40, false); }
    const N2 = 17; for (let i = 0; i < N2; i++) { const a = (i / N2) * TAU + 0.4; tuft(a, R * 0.52, R * 0.26, R * 0.15, i + 80, false); }
    const N3 = 9; for (let i = 0; i < N3; i++) { const a = (i / N3) * TAU + 0.6; tuft(a, R * 0.27, R * 0.24, R * 0.14, i + 120, false); }
    if (st.back) for (let i = 0; i < 4; i++) tuft(Math.PI / 2 + (i - 1.5) * 0.7, R * 0.08, R * 0.24, R * 0.14, i + 99, false);
    // face
    if (!st.back) {
      const tx = st.turn;
      face(g, tx * 6, -1, 9.6, 30, tx, st, { glow: st.glowEyes ? '#ff9a2e' : null });
      g.strokeStyle = '#6b3516'; g.lineWidth = 2.6; g.lineCap = 'round';
      for (const s of [-1, 1]) { const bx = tx * 6 + s * 15.5 + tx * 5; g.beginPath(); g.moveTo(bx - 5.5, -16 - (st.mood < 0 ? -2 * s : 0)); g.quadraticCurveTo(bx, -20, bx + 5.5, -16 + (st.mood < 0 ? -2 * s : 0)); g.stroke(); }
    }
    mitt(g, R + 3, 8 - step * 3 * st.moving, 8.5, 11, -0.5 - step * 0.3 * st.moving - (st.glowEyes ? 0.9 : 0), c1, c2);
    g.restore();
  };

  const drawAcorn = (g, st) => {
    const step = Math.sin(st.walk), lean = U.clamp(st.vx / 1100, -0.2, 0.2), tuck = st.tuck || 0;
    const c0 = '#f6b160', c1 = '#dd8436', c2 = '#a9561f';
    if (tuck < 0.8) { foot(g, -15, 0, 9.5, '#c9772f', '#8a4a1c', Math.max(0, step) * 6 * st.moving); foot(g, 15, 0, 9.5, '#c9772f', '#8a4a1c', Math.max(0, -step) * 6 * st.moving); }
    g.save(); g.translate(0, -8 + tuck * 6); g.rotate(lean + (st.spin || 0)); g.scale(st.sx, st.sy);
    const bw = 39, top = -52 + tuck * 14;
    if (tuck < 0.8) mitt(g, -bw - 2, -18 + step * 3 * st.moving, 8, 10.5, 0.6 + step * 0.3 * st.moving, c1, c2);
    // the nut: wide and round with a small point underneath
    const nut = () => { g.beginPath(); g.moveTo(-bw, top + 6); g.bezierCurveTo(-bw - 5, -18, -bw * 0.72, -1, -6, 1.5); g.lineTo(0, 5); g.lineTo(6, 1.5); g.bezierCurveTo(bw * 0.72, -1, bw + 5, -18, bw, top + 6); g.closePath(); };
    nut(); const gr = g.createRadialGradient(-bw * 0.25, -34, 4, 0, -24, bw * 1.25); gr.addColorStop(0, c0); gr.addColorStop(0.6, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fill();
    g.save(); g.clip(); g.lineCap = 'round';
    for (let i = -5; i <= 5; i++) { g.strokeStyle = i % 2 ? 'rgba(140,70,24,.16)' : 'rgba(255,220,160,.2)'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * 8, top + 14); g.quadraticCurveTo(i * 7.4, -22, i * 2.2, 2); g.stroke(); }
    g.restore(); nut(); g.strokeStyle = INK; g.lineWidth = 3; g.lineJoin = 'round'; g.stroke();
    if (!st.back && tuck < 0.5) face(g, st.turn * 7, -26 + tuck * 10, 8.8, 31, st.turn, st, {});
    if (tuck < 0.8) mitt(g, bw + 2, -18 - step * 3 * st.moving - (st.throwT > 0 ? 12 : 0), 8, 10.5, -0.6 - step * 0.3 * st.moving - (st.throwT > 0 ? 1.2 : 0), c1, c2);
    // the cap: a dome with a diamond pattern and a curled stem
    const cy = top + 8 + tuck * 22, cw = 48, chh = 35;
    g.strokeStyle = INK; g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.moveTo(-1, cy - chh + 3); g.quadraticCurveTo(0, cy - chh - 14, 13, cy - chh - 17); g.stroke();
    g.strokeStyle = '#9a5c30'; g.lineWidth = 6; g.stroke(); P.ell(g, 14, cy - chh - 17, 3.4, 4.6, '#c98850', 0.3);
    const cap = () => { g.beginPath(); g.moveTo(-cw, cy); g.bezierCurveTo(-cw - 3, cy - chh * 0.95, -cw * 0.55, cy - chh * 1.12, 0, cy - chh * 1.12); g.bezierCurveTo(cw * 0.55, cy - chh * 1.12, cw + 3, cy - chh * 0.95, cw, cy); g.quadraticCurveTo(cw * 0.5, cy + 7, 0, cy + 6.5); g.quadraticCurveTo(-cw * 0.5, cy + 7, -cw, cy); g.closePath(); };
    cap(); g.fillStyle = P.lin(g, -cw, cy - chh, cw * 0.6, cy + 6, [[0, '#c98850'], [0.5, '#a5673a'], [1, '#74401f']]); g.fill();
    g.save(); g.clip();
    g.strokeStyle = 'rgba(66,32,14,.7)'; g.lineWidth = 2.2; for (let i = -9; i <= 9; i++) { g.beginPath(); g.moveTo(i * 13, cy + 9); g.quadraticCurveTo(i * 10.5 + 15, cy - 14, i * 6 + 32, cy - chh - 8); g.moveTo(i * 13, cy + 9); g.quadraticCurveTo(i * 10.5 - 15, cy - 14, i * 6 - 32, cy - chh - 8); g.stroke(); }
    for (let i = -3; i <= 3; i++) for (let j = 0; j < 3; j++) P.ell(g, i * 13 + (j % 2) * 6.5 - 3, cy - 6 - j * 10.5, 2.6, 1.6, 'rgba(255,224,176,.3)', -0.5);
    P.glow(g, -18, cy - chh * 0.8, 20, '#ffe0b0', 0.35);
    g.restore(); cap(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    g.restore();
  };

  const drawRock = (g, st) => {
    const step = Math.sin(st.walk), c0 = '#d2ccc2', c1 = '#9e978d', c2 = '#655e58';
    const capc = ['#d98a62', '#b3613f', '#7a3c26'];
    if (st.roll > 0.5) { // curled into a boulder, the mushroom cap rolling round with it
      const R = 37;
      g.save(); g.translate(0, -R); g.rotate(st.rollAng);
      P.ball(g, 0, 0, R, R, c0, c1, c2);
      g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
      g.beginPath(); g.ellipse(0, -R * 0.62, R * 1.05, R * 0.62, 0, 0, TAU); g.fillStyle = P.lin(g, -R, -R, R, 0, [[0, capc[0]], [1, capc[2]]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      for (const s of [[-14, -24, 5], [8, -28, 4], [20, -16, 3.5], [-3, -14, 3]]) P.ell(g, s[0], s[1], s[2], s[2] * 0.8, '#fff0d8');
      for (let i = 0; i < 7; i++) P.ell(g, -24 + i * 8, -R * 0.06, 5, 6, '#5d9b45');
      g.strokeStyle = 'rgba(60,50,46,.6)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-4, 4); g.lineTo(5, 14); g.lineTo(-2, 24); g.lineTo(4, 34); g.stroke();
      for (let i = 0; i < 9; i++) P.ell(g, (U.hash(i) - 0.5) * 50, 8 + U.hash(i * 3) * 22, 2, 2, 'rgba(70,60,56,.35)');
      g.restore(); g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
      g.restore(); return;
    }
    const bw = 29, bh = 70, wind = st.windup || 0;
    foot(g, -13, 0, 10.5, c1, c2, Math.max(0, step) * 5 * st.moving); foot(g, 13, 0, 10.5, c1, c2, Math.max(0, -step) * 5 * st.moving);
    g.save(); g.translate(0, -8); g.rotate(U.clamp(st.vx / 1500, -0.1, 0.1) - wind * 0.12 * st.f); g.scale(st.sx, st.sy);
    // back arm
    g.save(); g.translate(-bw - 3, -bh + 22); g.rotate(0.12 + step * 0.25 * st.moving + (st.f < 0 ? -wind * 1.6 + (st.punch || 0) * 2.3 : 0)); P.rr(g, -9, 0, 18, 44, 9); g.fillStyle = P.lin(g, -9, 0, 9, 0, [[0, c1], [1, c2]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.8; g.stroke(); g.restore();
    // body: a tall rounded stone
    P.rr(g, -bw, -bh, bw * 2, bh + 2, 15); g.fillStyle = P.lin(g, -bw, -bh, bw, 0, [[0, c0], [0.5, c1], [1, c2]]); g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 22; i++) P.ell(g, (U.hash(i * 2.2) - 0.5) * bw * 1.8, -U.hash(i * 4.1) * bh, 1.6 + U.hash(i) * 1.6, 1.6, i % 3 ? 'rgba(70,60,56,.3)' : 'rgba(255,226,206,.45)');
    P.glow(g, -bw * 0.5, -bh * 0.75, 26, '#ffffff', 0.3);
    g.strokeStyle = 'rgba(60,50,46,.65)'; g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(3, -26); g.lineTo(-3, -17); g.lineTo(4, -9); g.lineTo(-1, 0); g.stroke();
    g.restore(); P.rr(g, -bw, -bh, bw * 2, bh + 2, 15); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    if (!st.back) face(g, st.turn * 5, -bh + 30, 8, 25, st.turn, st, { glow: '#ffa53a', blush: false, mouthS: 0.5 });
    // moss fringe under the cap
    for (let i = 0; i < 9; i++) { const x = -bw - 4 + i * (bw * 2 + 8) / 8; P.ell(g, x, -bh + 9 + (i % 2) * 3, 6.5, 8, i % 2 ? '#6fae4c' : '#4f8f3e'); }
    // mushroom cap
    const cap = () => { g.beginPath(); g.moveTo(-bw - 10, -bh + 8); g.bezierCurveTo(-bw - 10, -bh - 22, -bw * 0.5, -bh - 30, 0, -bh - 30); g.bezierCurveTo(bw * 0.5, -bh - 30, bw + 10, -bh - 22, bw + 10, -bh + 8); g.quadraticCurveTo(0, -bh + 14, -bw - 10, -bh + 8); g.closePath(); };
    cap(); g.fillStyle = P.lin(g, -bw, -bh - 30, bw, -bh + 10, [[0, capc[0]], [0.55, capc[1]], [1, capc[2]]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    for (const s of [[-20, -8, 5.5], [-4, -19, 5], [15, -11, 6], [27, 0, 3.5], [-30, 2, 3]]) P.ell(g, s[0], -bh + s[1], s[2], s[2] * 0.75, '#fff0d8');
    // front arm (punches)
    g.save(); g.translate(bw + 3, -bh + 22); g.rotate(-0.12 - step * 0.25 * st.moving + (st.f > 0 ? wind * 1.6 - (st.punch || 0) * 2.3 : 0)); P.rr(g, -9, 0, 18, 44 + (st.punch || 0) * 10, 9); g.fillStyle = P.lin(g, -9, 0, 9, 0, [[0, c0], [1, c1]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.8; g.stroke(); g.restore();
    g.restore();
  };

  const drawGhost = (g, st) => {
    const bob = Math.sin(st.t * 2.2) * 4, R = 30;
    g.save(); g.translate(0, -R - 14 + bob); g.rotate(U.clamp(st.vx / 900, -0.3, 0.3)); g.scale(st.sx, st.sy);
    g.globalAlpha *= st.solid ? 1 : 0.86;
    g.globalCompositeOperation = 'lighter'; P.glow(g, 0, 0, R * 2.4, '#bcd0ff', 0.22 + S.night * 0.2); g.globalCompositeOperation = 'source-over';
    // a puffy cloud of a body with a wavering hem
    const pts = [];
    for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI, rr = R * (i % 2 ? 0.9 : 1.12) * (i === 0 || i === 8 ? 0.92 : 1); pts.push([Math.cos(a) * rr * 0.98, Math.sin(a) * rr * 0.98 - 3]); }
    for (let i = 0; i < 5; i++) { const x = R * 0.86 - i * R * 0.43, w = Math.sin(st.t * 4 + i * 1.7) * 3; pts.push([x, R * (i % 2 ? 0.62 : 1.02) + w - Math.abs(st.vx) * 0.004 * (i % 2 ? 0 : 6)]); }
    P.blobPath(g, pts);
    const gr = g.createRadialGradient(-R * 0.3, -R * 0.5, 3, 0, 0, R * 1.35); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#e9eefb'); gr.addColorStop(1, '#a9b8de');
    g.fillStyle = gr; g.fill(); g.strokeStyle = '#4a4a6e'; g.lineWidth = 2.8; g.lineJoin = 'round'; g.stroke();
    mitt(g, -R - 1, 6, 6.5, 8.5, 0.7 + Math.sin(st.t * 3) * 0.2, '#ffffff', '#b9c6e6'); mitt(g, R + 1, 6, 6.5, 8.5, -0.7 - Math.sin(st.t * 3) * 0.2 - (st.boo ? 1.6 : 0), '#ffffff', '#b9c6e6');
    if (!st.back) face(g, st.turn * 6, -6, 8.4, 25, st.turn, st, { blush: true, mouthS: 0.55 });
    g.restore();
  };
  HS.draw = { fuzzy: drawFuzzy, acorn: drawAcorn, rock: drawRock, ghost: drawGhost };
  HS.info = {
    fuzzy: { name: 'The Fuzzy', w: 48, h: 64, hp: 4, tag: 'Light as lint. Floats, glides, and crackles with static.', act: 'Zap-dash', sp: 'Puff up' },
    rock: { name: 'The Rock', w: 54, h: 88, hp: 6, tag: 'Heavy and unbothered. Rolls, slams, sinks.', act: 'Punch / Slam', sp: 'Roll' },
    acorn: { name: 'The Acorn', w: 58, h: 70, hp: 5, tag: 'Throws seeds. Things grow where they land.', act: 'Throw seed', sp: 'Tuck in' },
    ghost: { name: 'The Ghost', w: 48, h: 62, hp: 3, tag: 'Drifts through walls. Says boo. Borrows bodies.', act: 'Boo!', sp: 'Possess' },
  };
  HS.order = ['fuzzy', 'rock', 'acorn', 'ghost'];

  // ================= the party: one body, four brothers =================
  const PT = (V3.party = {
    x: W.SPAWN, y: 0, vx: 0, vy: 0, w: 48, h: 64, grounded: false, f: 1,
    id: 'fuzzy', hp: { fuzzy: 4, rock: 6, acorn: 5, ghost: 3 }, invuln: 0, swapT: 0, idle: 0,
    st: { f: 1, turn: 1, walk: 0, sx: 1, sy: 1, blink: 1, mood: 1, t: 0, vx: 0, moving: 0 },
    // fuzzy
    puffs: 2, charge: 0, dashT: 0, dashCd: 0, breath: 1.4, puffing: false, coyote: 0,
    // rock
    rolling: false, rollAng: 0, windup: 0, punchT: 0, slamming: false,
    // acorn
    tuckT: 0, tucked: false, seedCd: 0, rootT: 0,
    // ghost
    solidT: 0, booCd: 0, host: null,
    frozen: 0,
  });
  Object.defineProperty(PT, 'active', { get() { return PT; } });
  PT.teleport = (x, y) => { PT.x = x; PT.y = y === undefined ? W.groundY(x) - (PT.id === 'ghost' ? 40 : 0) : y; PT.vx = PT.vy = 0; };
  PT.alive = (id) => PT.hp[id] > 0;
  PT.swap = (id, force) => {
    if (id === PT.id || !HS.order.includes(id) || (!force && (PT.swapT > 0 || !PT.alive(id) || PT.frozen > 0))) return false;
    if (PT.host) PT.unpossess();
    const old = PT.id; PT.id = id; const inf = HS.info[id];
    PT.w = inf.w; PT.h = inf.h; PT.swapT = 0.35; PT.rolling = PT.puffing = PT.tucked = PT.slamming = false; PT.dashT = 0; PT.windup = 0; PT.tuckT = 0; PT.st.tuck = 0; PT.st.roll = 0; PT.st.puff = 0;
    PT.drill = false; PT.rootT = 0; PT.holdLock = true; PT.st.streak = false; PT.st.glowEyes = false;
    if (old === 'ghost' && id !== 'ghost') { const gy = W.groundY(PT.x); if (PT.y > gy) PT.y = gy; }
    if (id === 'ghost') PT.y = Math.min(PT.y, W.groundY(PT.x) - 30);
    P.burst(PT.x, PT.y - 34, 16, { kind: 'fluff', col: { fuzzy: '#e7b07a', rock: '#cfc8be', acorn: '#f0b060', ghost: '#e8eeff' }[id], speed: 190, life: 0.5, r: 9 });
    P.emit({ kind: 'ring', x: PT.x, y: PT.y - 34, R: 70, r: 5, col: '#fff3d0', life: 0.35 });
    A().sfx('swap'); V3.bus.emit('swap', id, old);
    return true;
  };
  PT.hurt = (d, fromX, why) => {
    if (PT.invuln > 0 || PT.frozen > 0 || V3.game.grace > 0) return false; // grace: a few safe seconds to read the opening hint
    if (PT.id === 'ghost' && PT.solidT <= 0 && !PT.host) return false;          // nothing to hit
    if (PT.id === 'acorn' && PT.tucked) { if (PT.tuckT < 0.3) { A().sfx('parry'); P.burst(PT.x, PT.y - 40, 10, { kind: 'star', col: '#ffe08a', speed: 220, r: 7 }); V3.bus.emit('parry', fromX); V3.game.shake(5); return 'parry'; } A().sfx('thud'); return false; }
    if (PT.id === 'rock' && PT.rolling && Math.abs(PT.vx) > 240) return false;
    if (PT.host) { PT.unpossess(); return false; }
    PT.hp[PT.id] = Math.max(0, PT.hp[PT.id] - d); PT.invuln = 1.2; PT.st.mood = -1; PT.moodT = 0.7;
    if (PT.id !== 'rock') { PT.vx = (PT.x < fromX ? -1 : 1) * (PT.id === 'fuzzy' ? 560 : 380); PT.vy = -330; PT.grounded = false; }
    PT.dashT = 0; PT.puffing = false;
    A().sfx('hurt'); V3.game.shake(7); V3.game.hitStop(0.06);
    P.burst(PT.x, PT.y - 34, 8, { kind: 'star', col: '#fff', speed: 200, r: 6 });
    V3.bus.emit('hurt', PT.id, why);
    if (PT.hp[PT.id] <= 0) {
      const next = HS.order.find((h) => PT.alive(h));
      P.say(PT.x, PT.y - 90, HS.info[PT.id].name + ' needs a rest', '#ffd9a8');
      if (next) PT.swap(next, true); else V3.game.wipe();
    }
    return true;
  };
  PT.heal = (id, n) => { const mx = HS.info[id].hp; if (PT.hp[id] < mx) { PT.hp[id] = Math.min(mx, PT.hp[id] + n); if (id === PT.id) { A().sfx('heal'); P.burst(PT.x, PT.y - 40, 6, { kind: 'star', col: '#aef58a', speed: 90, r: 6, vy: -60 }); } return true; } return false; };
  PT.healAll = () => { for (const id of HS.order) PT.hp[id] = HS.info[id].hp; };
  PT.unpossess = () => {
    const c = PT.host; if (!c) return;
    PT.host = null; c.possessed = false; c.dazed = Math.max(c.dazed || 0, 2.2); PT.x = c.rideX !== undefined ? c.rideX : c.x; PT.y = c.rideY !== undefined ? c.rideY - 20 : c.y - c.h - 20; PT.vy = -160; PT.vx = 0;
    A().sfx('unpossess'); P.burst(PT.x, PT.y - 20, 12, { kind: 'fluff', col: '#dfe8ff', speed: 160, r: 8 });
    V3.creatures.damage(c, 1, { src: 'chill', from: c.x });
  };

  // ---- plants the Acorn grows
  const PL = (V3.plants = { list: [], seeds: [] });
  PL.remove = (p) => { for (const pf of p.plats) { const i = W.platforms.indexOf(pf); if (i >= 0) W.platforms.splice(i, 1); } const i = PL.list.indexOf(p); if (i >= 0) PL.list.splice(i, 1); P.burst(p.x, p.y - (p.h || 0) * 0.5, 10, { kind: 'leaf', col: '#b98a4a', speed: 80, g: 200, life: 1 }); };
  PL.add = (p) => { PL.list.push(p); const mine = PL.list.filter((q) => q.kind !== 'snare'); if (mine.length > 3) PL.remove(mine[0]); V3.bus.emit('grow', p); };
  PL.growStalk = (x, y) => {
    const H0 = 270 * (1 + S.rain * 0.5), p = { kind: 'stalk', x, y, h: 0, H: H0, t: 0, life: 26, plats: [], seed: U.rand(0, 99) };
    for (let i = 0, yy = 78; yy < H0 - 30; yy += 84, i++) { const side = i % 2 ? 1 : -1; const pf = { x1: x + (side > 0 ? 2 : -74), x2: x + (side > 0 ? 74 : -2), y: y - yy, kind: 'leaf', need: yy / H0, gone: true }; p.plats.push(pf); W.platforms.push(pf); }
    const top = { x1: x - 38, x2: x + 38, y: y - H0, kind: 'bloom', need: 0.98, gone: true }; p.plats.push(top); W.platforms.push(top);
    PL.add(p); A().sfx('sprout');
  };
  PL.growRaft = (x, y) => { const pf = { x1: x - 62, x2: x + 62, y: y + 2, kind: 'raft' }; W.platforms.push(pf); PL.add({ kind: 'raft', x, y, t: 0, life: 30, plats: [pf] }); A().sfx('plop'); };
  PL.update = (dt) => {
    for (let i = PL.seeds.length - 1; i >= 0; i--) {
      const s = PL.seeds[i]; s.vy += 1700 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * 9;
      let done = false;
      const c = V3.creatures.nearest(s.x, s.y, 44, (c) => !c.critter || c.kind === 'snag');
      if (c) { V3.creatures.snare(c, 3.4, s.x, s.y); P.burst(s.x, s.y, 8, { kind: 'leaf', col: '#7cc04a', speed: 140 }); A().sfx('vine'); done = true; }
      const wt = !done && W.waterAt(s.x, s.y);
      if (wt) { PL.growRaft(s.x, wt.y); P.burst(s.x, wt.y, 8, { kind: 'drop', col: '#cfefff', speed: 160, vy: -120, g: 600, r: 2.5 }); done = true; }
      if (!done) {
        for (const sol of W.solids) if (s.x > sol.x && s.x < sol.x + sol.w && s.y > sol.y && s.y < sol.y + 30 && s.vy > 0) { PL.growStalk(s.x, sol.y); done = true; }
        if (!done && s.y >= W.groundY(s.x)) { if (Math.abs(W.slope(s.x)) < 1.2) PL.growStalk(s.x, W.groundY(s.x)); else P.burst(s.x, s.y, 5, { col: '#a8703f', speed: 80 }); done = true; }
      }
      if (done || s.y > 900) PL.seeds.splice(i, 1);
    }
    for (let i = PL.list.length - 1; i >= 0; i--) {
      const p = PL.list[i]; p.t += dt;
      if (p.kind === 'stalk') { p.h = U.smooth(Math.min(1, p.t / 0.75)); for (const pf of p.plats) pf.gone = p.h < pf.need; }
      if (p.t > p.life) PL.remove(p);
    }
  };
  PL.draw = (g) => {
    for (const p of PL.list) {
      const fade = U.clamp((p.life - p.t) / 2, 0, 1); g.globalAlpha = fade;
      if (p.kind === 'stalk') {
        const h = p.H * p.h, sw = S.sway(p.x, p.seed) * 10;
        const sx = (yy) => p.x + Math.sin(yy * 0.03 + p.seed) * 7 + sw * (yy / p.H);
        for (let k = 0; k < 2; k++) { g.strokeStyle = k ? '#7cc04a' : '#27533a'; g.lineWidth = k ? 8 : 13; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x, p.y + 4); for (let yy = 10; yy <= h; yy += 10) g.lineTo(sx(yy), p.y - yy); g.stroke(); }
        for (const pf of p.plats) {
          if (pf.gone) continue; const cx = (pf.x1 + pf.x2) / 2;
          if (pf.kind === 'leaf') { const d = cx > p.x ? 1 : -1; g.beginPath(); g.moveTo(p.x, pf.y + 6); g.quadraticCurveTo(cx, pf.y - 16, pf.x1 * (d < 0 ? 1 : 0) + pf.x2 * (d > 0 ? 1 : 0), pf.y + 1); g.quadraticCurveTo(cx, pf.y + 20, p.x, pf.y + 6); g.fillStyle = P.lin(g, 0, pf.y - 12, 0, pf.y + 16, [[0, '#b5e06a'], [1, '#4f9a3c']]); g.fill(); g.strokeStyle = '#27533a'; g.lineWidth = 2.6; g.stroke(); }
          else { const b = pf.bounce > 0 ? Math.sin(pf.bounce * 20) * pf.bounce * 20 : 0; for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + S.time * 0.3; P.ell(g, sx(h) + Math.cos(a) * 26, pf.y - 6 + Math.sin(a) * 9 + b, 17, 10, i % 2 ? '#ff9db5' : '#ffc2d0', a); } P.ell(g, sx(h), pf.y - 7 + b, 15, 8, '#ffd166'); g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(sx(h), pf.y - 7 + b, 15, 8, 0, 0, TAU); g.stroke(); if (pf.bounce > 0) pf.bounce -= 0.016; }
        }
      } else if (p.kind === 'raft') {
        const b = Math.sin(S.time * 2 + p.x) * 2;
        g.beginPath(); g.ellipse(p.x, p.y + 3 + b, 64, 13, 0, 0.25, TAU - 0.05); g.lineTo(p.x, p.y + 3 + b); g.closePath(); g.fillStyle = P.lin(g, 0, p.y - 10, 0, p.y + 16, [[0, '#a6dc68'], [1, '#3f8f48']]); g.fill(); g.strokeStyle = '#1e4d2e'; g.lineWidth = 2.6; g.stroke();
        P.ell(g, p.x - 20, p.y - 2 + b, 9, 5, '#ffc2d0'); P.ell(g, p.x - 20, p.y - 3 + b, 4, 2.4, '#ffd166');
      }
    }
    g.globalAlpha = 1;
    for (const s of PL.seeds) { g.save(); g.translate(s.x, s.y); g.rotate(s.rot); P.ball(g, 0, 0, 8, 10, '#f6c070', '#c9772f', '#8a4a1c'); g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 8, 10, 0, 0, TAU); g.stroke(); P.ell(g, 0, -8, 7, 4, '#8a5028'); g.restore(); }
  };

  // ================= update =================
  const hitFx = (x, y, col) => { P.burst(x, y, 9, { kind: 'star', col: col || '#fff2c0', speed: 230, r: 7, life: 0.35 }); P.emit({ kind: 'ring', x, y, R: 46, r: 5, col: '#ffffff', life: 0.25 }); };
  HS.hitFx = hitFx;
  const landFx = (b, heavy) => { P.burst(b.x, b.y, heavy ? 12 : 5, { col: '#e6d2b0', speed: heavy ? 190 : 90, flat: 0.25, vy: -30, life: 0.5, r: heavy ? 8 : 5, a: 0.6 }); A().sfx(heavy ? 'thud' : 'land', { vol: heavy ? 1 : 0.5 }); };

  PT.update = (dt) => {
    const b = PT, st = b.st; let id = b.id;
    st.t += dt; b.invuln -= dt; b.swapT -= dt; b.dashCd -= dt; b.seedCd -= dt; b.booCd -= dt; b.solidT -= dt; b.frozen -= dt;
    if (b.moodT > 0) { b.moodT -= dt; if (b.moodT <= 0) st.mood = 1; }
    if (b.frozen > 0) { b.vx = U.damp(b.vx, 0, 8, dt); if (id !== 'ghost') { b.vy += 1800 * dt; W.moveBody(b, dt, {}); } return; }
    // swap brothers
    if (b.holdLock && !I.down.special && !I.down.down) b.holdLock = false;
    if (b.dashT <= 0 && st.streak) { st.streak = false; st.glowEyes = false; }
    for (let i = 0; i < 4; i++) if (I.hit('h' + (i + 1))) b.swap(HS.order[i]);
    if (I.hit('next')) { let k = HS.order.indexOf(id); for (let n = 0; n < 4; n++) { k = (k + 1) % 4; if (b.alive(HS.order[k])) { b.swap(HS.order[k]); break; } } }
    id = b.id;
    const ax = I.axisX(), ay = I.axisY();
    if (ax && b.dashT <= 0 && !(id === 'rock' && b.rolling && b.grounded)) b.f = ax;
    b.idle = ax || ay || I.any ? 0 : b.idle + dt;
    const wasG = b.grounded, water = W.waterAt(b.x, b.y - 6);
    if (b.host) { V3.creatures.drive(b.host, dt, ax, ay, I.hit('jump'), I.hit('act')); if (!b.host) return; b.x = b.host.rideX !== undefined ? b.host.rideX : b.host.x; b.y = b.host.rideY !== undefined ? b.host.rideY : b.host.y - b.host.h; b.hostT -= dt; if (I.hit('special') || b.hostT <= 0 || b.host.dead) b.unpossess(); st.vx = 0; return; }
    if (id === 'fuzzy') updFuzzy(b, dt, ax, ay, water);
    else if (id === 'rock') updRock(b, dt, ax, ay, water);
    else if (id === 'acorn') updAcorn(b, dt, ax, ay, water);
    else updGhost(b, dt, ax, ay);
    // bloom bounce, twig snap, landing puff
    if (b.grounded && b.onPlat) {
      if (b.onPlat.kind === 'bloom' && id !== 'ghost') { b.vy = id === 'fuzzy' ? -1050 : id === 'rock' ? -620 : -930; b.grounded = false; b.onPlat.bounce = 0.4; b.puffs = 2; A().sfx('bloom'); P.burst(b.x, b.y, 8, { kind: 'leaf', col: '#ffb3c6', speed: 150, life: 0.6 }); V3.bus.emit('bounce'); }
      else if (b.onPlat.kind === 'twig' && id === 'rock') { const p = b.onPlat; p.gone = true; p.regrow = 25; b.grounded = false; A().sfx('crack'); P.burst(b.x, b.y, 14, { kind: 'leaf', col: '#b98a58', speed: 200, g: 500, life: 0.9 }); V3.game.shake(6); V3.bus.emit('twigsnap'); }
    }
    if (b.landed && !wasG && id !== 'ghost') { landFx(b, id === 'rock' || b.landSpeed > 900); st.sy = id === 'rock' ? 0.9 : 0.72; st.sx = id === 'rock' ? 1.08 : 1.25; if (id === 'rock' && b.landSpeed > 500) V3.game.shake(4); }
    if (water && !b.wasWater) { A().sfx('splash'); P.burst(b.x, water.y, 14, { kind: 'drop', col: '#d6f3ff', speed: 240, vy: -200, g: 900, r: 3 }); V3.bus.emit('splash', b.x, id); }
    b.wasWater = !!water;
    // animation state
    st.f = b.f; st.turn = U.damp(st.turn, b.f, 14, dt); st.vx = b.vx; st.moving = U.damp(st.moving, b.grounded && Math.abs(b.vx) > 30 ? 1 : 0, 12, dt);
    st.walk += dt * (6 + Math.abs(b.vx) * 0.035);
    st.sx = U.damp(st.sx, 1, 10, dt); st.sy = U.damp(st.sy, 1, 10, dt);
    if (!b.grounded && id !== 'ghost' && !b.rolling) { const k = U.clamp(Math.abs(b.vy) / 1400, 0, 0.22); st.sy = Math.max(st.sy, 1 + k); st.sx = Math.min(st.sx, 1 - k * 0.6); }
    st.blink = (st.t % 3.7) > 3.56 || (b.idle > 9 && id === 'fuzzy') ? 0 : 1;
    if (b.idle > 9 && id === 'fuzzy' && U.chance(dt * 0.8)) P.say(b.x + 26, b.y - 80, 'z', '#dfe8ff', 20);
  };

  function jumpBuffer(b) { return I.hit('jump'); }
  function updFuzzy(b, dt, ax, ay, water) {
    const st = b.st;
    b.coyote = b.grounded || water ? 0.1 : b.coyote - dt;
    if (b.grounded || water) { b.puffs = 2; b.breath = Math.min(1.4, b.breath + dt * 1.5); }
    if (b.dashT > 0) { // zap-dash: a straight crackling line
      b.dashT -= dt; b.vx = b.ddx * 1500; b.vy = b.ddy * 1500;
      const dmg = b.dashCharge >= 1 ? 3 : b.dashCharge > 0.45 ? 2 : 1;
      if (V3.creatures.hitCircle(b.x, b.y - 32, 50, dmg, { src: 'zap', from: b.x - b.ddx * 40, kx: b.ddx * 420, ky: -260, once: b.dashId })) { hitFx(b.x + b.ddx * 30, b.y - 32, '#ffe08a'); V3.game.hitStop(0.05); V3.game.shake(4); }
      if (U.chance(0.7)) P.emit({ kind: 'spark', x: b.x + U.rand(-20, 20), y: b.y - 32 + U.rand(-20, 20), vx: U.rand(-200, 200), vy: U.rand(-200, 200), col: '#fff0a0', life: 0.25, r: 5 });
      if (b.dashT <= 0) {
        b.vx *= 0.25; b.vy = Math.min(b.vy * 0.2, 0);
        if (b.dashCharge >= 1) { const n = V3.creatures.chain(b.x, b.y - 32, 300, 3, 2); A().sfx('zapbig'); V3.game.shake(n ? 8 : 4); P.emit({ kind: 'ring', x: b.x, y: b.y - 32, R: 150, r: 7, col: '#fff0a0', life: 0.35 }); V3.bus.emit('bigzap', b.x, b.y); }
        st.streak = false; st.glowEyes = false;
      }
    } else {
      const sp = 315; b.vx = U.approach(b.vx, ax * sp, (b.grounded ? 2800 : 1500) * dt);
      b.puffing = I.down.special && !V3.ui.talking && !b.holdLock && b.breath > 0 && !water;
      if (b.puffing) { b.breath -= dt; b.vy = U.approach(b.vy, -235, 2400 * dt); if (U.chance(0.3)) P.emit({ kind: 'fluff', x: b.x + U.rand(-30, 30), y: b.y, vy: 60, col: '#f3d2ac', life: 0.5, r: 5, a: 0.6 }); if (I.hit('special')) A().sfx('puff'); V3.creatures.hitCircle(b.x, b.y - 36, 62, 0, { src: 'puff', from: b.x, kx: 300, ky: -200, push: true }); }
      else {
        b.vy += 1500 * dt;
        const gliding = I.down.jump && b.vy > 0 && !b.grounded;
        if (gliding) { b.vy = Math.min(b.vy, 85); b.vx += S.wind * 260 * dt; if (!b.wasGlide) A().sfx('glide'); b.charge = Math.min(1, b.charge + dt * 0.12); }
        b.wasGlide = gliding;
      }
      const up = W.updraftAt(b.x, b.y);
      if (up && !b.grounded) { b.vy -= up.lift * dt * (b.puffing || I.down.jump ? 1.6 : 0.8); b.vy = Math.max(b.vy, -520); if (U.chance(0.4)) P.emit({ kind: 'leaf', x: b.x + U.rand(-40, 40), y: b.y + 30, vy: -300, col: '#d9f0a8', life: 0.6, r: 5 }); V3.bus.emit('updraft'); }
      if (water) { // too light to sink: bobs on top
        const tgt = water.y + 12; b.vy += (tgt - b.y) * 60 * dt - 1500 * dt; b.vy *= 1 - 5 * dt; if (b.y > tgt + 30) b.y = tgt + 30; b.vx *= 1 - 1.5 * dt;
      }
      if (I.hit('jump')) {
        if (b.coyote > 0) { b.vy = -610; b.coyote = 0; b.grounded = false; A().sfx('jump'); st.sy = 1.25; st.sx = 0.82; }
        else if (b.puffs > 0) { b.puffs--; b.vy = -540; A().sfx('puff'); P.burst(b.x, b.y, 9, { kind: 'fluff', col: '#f3d2ac', speed: 130, life: 0.5, r: 7 }); st.sy = 1.2; st.sx = 0.85; }
      }
      if (!I.down.jump && b.vy < -200 && !b.puffing && !up) b.vy += 1900 * dt;
      // static builds from scurrying through the grass
      if (b.grounded && Math.abs(b.vx) > 150 && !water) { b.charge = Math.min(1, b.charge + dt * 0.36); if (b.charge >= 1 && !b.full) { b.full = true; A().sfx('chime', { pitch: 1.5, vol: 0.5 }); P.say(b.x, b.y - 90, 'crackle!', '#fff0a0', 20); } }
      if (b.charge > 0.3 && U.chance(b.charge * 0.3)) P.emit({ kind: 'spark', x: b.x + U.rand(-30, 30), y: b.y - 34 + U.rand(-30, 30), vx: U.rand(-90, 90), vy: U.rand(-90, 90), col: '#fff3a8', life: 0.18, r: 4 });
      if (I.hit('act') && b.dashCd <= 0) {
        let dx = ax, dy = ay; if (!dx && !dy) dx = b.f; const l = Math.hypot(dx, dy); b.ddx = dx / l; b.ddy = dy / l; if (dx) b.f = Math.sign(dx);
        b.dashT = 0.18; b.dashCd = 0.5; b.dashCharge = b.charge; b.charge = 0; b.full = false; b.dashId = (b.dashId || 0) + 1; b.grounded = false; b.puffing = false;
        st.streak = true; st.sdx = b.ddx; st.sdy = b.ddy; st.glowEyes = true; A().sfx(b.dashCharge > 0.45 ? 'zap' : 'dash'); V3.bus.emit('dash', b.x, b.y);
      }
    }
    st.puff = U.damp(st.puff || 0, b.puffing ? 1 : 0, 12, dt); st.charge = b.charge;
    W.moveBody(b, dt, {});
    if (b.grounded && b.vy >= 0 && b.dashT > 0 && b.ddy > 0.5) b.dashT = 0.001;
  }

  function updRock(b, dt, ax, ay, water) {
    const st = b.st;
    const wantRoll = (I.down.down || I.down.special) && !V3.ui.talking && !b.holdLock && !b.windup && !b.slamming;
    if (wantRoll && !b.rolling) { b.rolling = true; A().sfx('tuck'); }
    if (!wantRoll && b.rolling) b.rolling = false;
    b.h = b.rolling ? 72 : 88;
    const g = water ? 1100 : 2700; b.vy += g * dt; if (water) b.vy = Math.min(b.vy, 240);
    if (b.slamming) { b.vx = 0; b.vy = Math.max(b.vy, 1500); }
    else if (b.rolling) {
      const s = W.slope(b.x), along = b.grounded ? 1650 * s / Math.sqrt(1 + s * s) : 0;
      b.vx += (along + ax * (b.grounded ? 560 : 200)) * dt; b.vx *= 1 - (water ? 1.6 : 0.22) * dt; b.vx = U.clamp(b.vx, -820, 820);
      b.rollAng += (b.vx / 37) * dt;
      const sp = Math.abs(b.vx);
      if (b.grounded && sp > 120) { if (U.chance(sp / 900)) P.emit({ x: b.x - Math.sign(b.vx) * 20, y: b.y - 4, vx: -b.vx * 0.2, vy: -60, col: '#e6d2b0', life: 0.45, r: 7, a: 0.5 }); if ((b.rumble = (b.rumble || 0) - dt) <= 0) { A().sfx('roll', { vol: Math.min(1, sp / 600) }); b.rumble = 0.22; } }
      if (sp > 230) { const d = sp > 520 ? 3 : 2; if (V3.creatures.hitCircle(b.x + Math.sign(b.vx) * 20, b.y - 36, 48, d, { src: 'roll', from: b.x - b.vx, kx: b.vx * 0.9, ky: -420, cd: 0.5 })) { hitFx(b.x + Math.sign(b.vx) * 34, b.y - 36); V3.game.hitStop(0.07); V3.game.shake(7); A().sfx('punch'); b.vx *= 0.75; } }
      if (I.hit('jump') && b.grounded) { b.vy = -520; b.grounded = false; A().sfx('jump', { pitch: 0.6 }); }
      if (I.hit('act') && !b.grounded && !water) { b.rolling = false; b.slamming = true; b.vy = 900; A().sfx('dash', { pitch: 0.5 }); }
    } else {
      const sp = water ? 110 : 178; b.vx = U.approach(b.vx, b.windup ? 0 : ax * sp, 1500 * dt);
      if (I.hit('jump') && b.grounded) { b.vy = water ? -420 : -560; b.grounded = false; A().sfx('jump', { pitch: 0.6 }); }
      if (b.windup > 0) {
        b.windup += dt;
        if (b.windup > 0.32) {
          b.windup = 0; b.punchT = 0.22; const hx = b.x + b.f * 58, hy = b.y - 46;
          const n = V3.creatures.hitCircle(hx, hy, 62, 3, { src: 'punch', from: b.x, kx: b.f * 700, ky: -380, heavy: true });
          A().sfx('punch'); V3.game.shake(n ? 9 : 4); if (n) { hitFx(hx, hy); V3.game.hitStop(0.09); } else P.emit({ kind: 'ring', x: hx, y: hy, R: 40, r: 4, col: '#fff', life: 0.2 });
          for (const wl of W.walls) if (!wl.broken && Math.abs(wl.x - hx) < 60 && b.y > wl.y1 && b.y - 80 < wl.y2) breakWall(wl);
          V3.bus.emit('punch', hx, hy);
        }
      } else if (I.hit('act')) {
        if (b.grounded) b.windup = 0.001; else { b.slamming = true; b.vy = 900; A().sfx('dash', { pitch: 0.5 }); }
      }
    }
    if (water && U.chance(dt * 2.5)) P.emit({ x: b.x + U.rand(-10, 10), y: b.y - 80, vy: -70, col: '#d6f3ff', life: 1.2, r: 3.5, a: 0.7, kind: 'ring', R: 5, layer: 1 });
    b.punchT -= dt; st.windup = b.windup > 0 ? Math.min(1, b.windup / 0.3) : 0; st.punch = b.punchT > 0 ? b.punchT / 0.22 : 0;
    st.roll = b.rolling ? 1 : 0; st.rollAng = b.rollAng;
    W.moveBody(b, dt, { heavy: true, onWall: (wl) => { if (b.rolling && Math.abs(b.vx) > 300) { breakWall(wl); b.vx *= 0.7; return true; } if (b.rolling) { b.vx = -b.vx * 0.35; A().sfx('thud'); } return false; } });
    if (b.hitWall && b.rolling && Math.abs(st.vx) > 300) { V3.game.shake(6); A().sfx('thud'); V3.bus.emit('bonk', b.x, b.y); }
    if (b.slamming && b.grounded) {
      b.slamming = false; const n = V3.creatures.hitCircle(b.x, b.y - 10, 185, 2, { src: 'slam', from: b.x, ky: -560, daze: 2.2, radial: 300 });
      A().sfx('slam'); V3.game.shake(14); V3.game.hitStop(n ? 0.08 : 0.03);
      P.emit({ kind: 'ring', x: b.x, y: b.y - 4, R: 190, r: 9, col: '#fff3d0', life: 0.4, squash: 0.3 }); P.burst(b.x, b.y, 22, { col: '#e6d2b0', speed: 330, flat: 0.3, vy: -60, life: 0.6, r: 9, a: 0.6 });
      st.sy = 0.72; st.sx = 1.25; V3.bus.emit('slam', b.x, b.y);
    }
  }
  function breakWall(wl) {
    wl.broken = true; A().sfx('crack'); V3.game.shake(11); V3.game.hitStop(0.06);
    P.burst(wl.x, (wl.y1 + wl.y2) / 2, 30, { kind: 'leaf', col: wl.kind === 'root' ? '#8a5c3a' : '#4f9a3c', speed: 380, g: 700, life: 1, r: 9 });
    V3.bus.emit('wallbreak', wl);
  }
  HS.breakWall = breakWall;

  function updAcorn(b, dt, ax, ay, water) {
    const st = b.st;
    b.tucked = I.down.special && !V3.ui.talking && !b.holdLock;
    if (b.tucked) { if (I.hit('special')) { b.tuckT = 0; A().sfx('tuck'); } b.tuckT += dt; } else { b.tuckT = 0; b.rootT = 0; }
    b.vy += (water ? 500 : 2100) * dt; if (water) { b.vy = Math.min(b.vy, 130); b.vy -= 900 * dt * (I.down.jump ? 1 : 0.55); b.vy = Math.max(b.vy, -260); }
    if (b.tucked) {
      b.vx = U.damp(b.vx, 0, b.grounded ? 5 : 0.5, dt);
      if (!b.grounded && !water) { b.vy = Math.max(b.vy, 1150); b.drill = true; st.spin = (st.spin || 0) + dt * 26; }
      else {
        st.spin = 0;
        if (b.drill) { b.drill = false; const n = V3.creatures.hitCircle(b.x, b.y - 10, 80, 2, { src: 'drill', from: b.x, ky: -480, daze: 1.5 }); A().sfx('slam', { pitch: 1.5, vol: 0.7 }); V3.game.shake(n ? 9 : 5); P.burst(b.x, b.y, 12, { kind: 'leaf', col: '#b5e06a', speed: 220, g: 400, life: 0.7 }); V3.bus.emit('drill', b.x, b.y); }
        b.rootT += dt;
        if (b.grounded && b.rootT > 1.2 && !water) { // taking root: a slow, leafy rest
          if (((b.rootTick = (b.rootTick || 0) + dt)) > 2.2) { b.rootTick = 0; b.heal('acorn', 1); V3.bus.emit('rooted', b.x); }
          if (U.chance(dt * 5)) P.emit({ kind: 'leaf', x: b.x + U.rand(-34, 34), y: b.y, vy: -50, col: U.pick(['#b5e06a', '#ffc2d0', '#ffd166']), life: 1.1, r: 6 });
        }
      }
    } else {
      st.spin = 0; b.drill = false;
      b.vx = U.approach(b.vx, ax * 255, (b.grounded ? 2400 : 1500) * dt);
      b.coyote = b.grounded ? 0.09 : b.coyote - dt;
      if (I.hit('jump') && (b.coyote > 0 || water)) { b.vy = water ? -420 : -690; b.coyote = 0; b.grounded = false; A().sfx('jump', { pitch: 1.15 }); st.sy = 1.22; st.sx = 0.84; }
      if (!I.down.jump && b.vy < -220) b.vy += 2200 * dt;
      const up = W.updraftAt(b.x, b.y); if (up && !b.grounded) b.vy -= up.lift * 0.3 * dt;
      if (I.hit('act') && b.seedCd <= 0) {
        b.seedCd = 0.38; st.throwT = 0.2;
        const v = ay < 0 ? [b.f * 150, -820] : ay > 0 ? [b.f * 520, -80] : [b.f * 430, -520];
        PL.seeds.push({ x: b.x + b.f * 26, y: b.y - 50, vx: v[0] + b.vx * 0.5, vy: v[1], rot: 0 }); A().sfx('seed'); V3.bus.emit('seed');
      }
    }
    st.throwT = (st.throwT || 0) - dt; st.tuck = U.damp(st.tuck || 0, b.tucked ? 1 : 0, 18, dt);
    W.moveBody(b, dt, { drop: I.down.down && !b.tucked });
  }

  function updGhost(b, dt, ax, ay) {
    const st = b.st, sp = 245 * (1 + S.night * 0.25);
    b.vx = U.damp(b.vx, ax * sp, 6, dt); b.vy = U.damp(b.vy, ay * sp + (ay ? 0 : 26), 6, dt);
    const gy = W.groundY(b.x);
    if (b.y < gy - 380) b.vy += (b.y - (gy - 380)) * -8 * dt + 500 * dt;         // tethered to the ground below
    const px = b.x;
    W.moveBody(b, dt, { ghost: true });
    if (b.y > W.groundY(b.x) - 22) { b.y = W.groundY(b.x) - 22; if (b.vy > 0) b.vy = 0; }
    b.grounded = false;
    for (const wl of W.walls) if (!wl.broken && (px - wl.x) * (b.x - wl.x) < 0 && b.y > wl.y1 && b.y - 50 < wl.y2) { A().sfx('phase'); P.burst(wl.x, b.y - 30, 12, { kind: 'fluff', col: '#dfe8ff', speed: 110, life: 0.6, r: 8 }); V3.bus.emit('phase', wl); }
    if (U.chance(dt * 6)) P.emit({ kind: 'fluff', x: b.x + U.rand(-14, 14), y: b.y - 8, vy: 30, col: '#dfe8ff', life: 0.7, r: 5, a: 0.4, layer: -1 });
    if (I.hit('act') && b.booCd <= 0) {
      b.booCd = 0.9; b.solidT = 0.5; st.boo = true; st.mood = 2; b.moodT = 0.5; A().sfx('boo'); V3.game.shake(5);
      P.emit({ kind: 'ring', x: b.x, y: b.y - 36, R: 190, r: 8, col: '#e8eeff', life: 0.45 }); P.say(b.x, b.y - 96, 'BOO!', '#e8eeff', 34);
      V3.creatures.spook(b.x, b.y - 36, 200, 3.4); V3.bus.emit('boo', b.x, b.y);
    }
    if (b.solidT <= 0) st.boo = false;
    if (I.hit('special')) {
      const c = V3.creatures.nearest(b.x, b.y - 30, 150, (c) => c.canHost);
      if (c) { b.host = c; c.possessed = true; c.spooked = 0; c.dazed = 0; b.hostT = 7; A().sfx('possess'); P.burst(c.x, c.y - c.h / 2, 14, { kind: 'fluff', col: '#dfe8ff', speed: 150, r: 8 }); V3.bus.emit('possess', c); }
      else P.say(b.x, b.y - 90, 'nobody to borrow', '#cfd8ff', 18);
    }
    st.solid = b.solidT > 0;
  }

  // ================= drawing the active brother (and his light) =================
  PT.draw = (g) => {
    if (PT.host || PT.hidden) return;
    const b = PT, st = b.st;
    if (b.id !== 'ghost') HS.shadow(g, b.x, W.groundY(b.x) < b.y + 80 ? Math.max(b.y, Math.min(W.groundY(b.x), b.y + 80)) : b.y + 80, 30 * U.clamp(1 - (W.groundY(b.x) - b.y) / 300, 0.3, 1), 0.26);
    g.save(); g.translate(b.x, b.y);
    if (b.swapT > 0) { const k = 1 - b.swapT / 0.35; g.scale(0.5 + k * 0.5, 0.5 + k * 0.5); }
    if (b.invuln > 0 && Math.floor(b.invuln * 14) % 2) g.globalAlpha = 0.45;
    if (b.id === 'ghost' && S.night < 0.5 && !st.solid) g.globalAlpha *= 0.82;
    HS.draw[b.id](g, st);
    g.restore();
  };
  PT.lights = (out) => {
    if (PT.id === 'ghost') out.push({ x: PT.x, y: PT.y - 36, r: 330, a: 0.95 });
    else if (PT.id === 'fuzzy') out.push({ x: PT.x, y: PT.y - 34, r: 150 + PT.charge * 190, a: 0.6 + PT.charge * 0.35 });
    else if (PT.id === 'rock') out.push({ x: PT.x + PT.f * 10, y: PT.y - 60, r: 190, a: 0.75 });
    else out.push({ x: PT.x, y: PT.y - 34, r: 140, a: 0.5 });
  };

  const baseUpd = PT.update;
  PT.update = (dt) => {
    baseUpd(dt);
    const b = PT;
    if (b.grounded && !b.host && b.id !== 'ghost' && Math.abs(b.vx) > 200 && !W.waterAt(b.x, b.y - 6) && U.chance(dt * 9)) P.emit({ x: b.x - Math.sign(b.vx) * 14, y: b.y - 3, vx: -b.vx * 0.12, vy: -34, col: W.caveAt(b.x, b.y) > 0.4 ? '#b9aca4' : '#eadbb8', life: 0.4, r: 5, grow: 1.2, a: 0.45 });
  };

})();
