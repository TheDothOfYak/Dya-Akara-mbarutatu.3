// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3: painting helpers. Everything is smooth vector paint: soft blobs, brush dabs, ink lines.
(function () {
  'use strict';
  const V3 = window.V3, U = V3.util, TAU = U.TAU;
  const P = (V3.paint = {});
  P.S = 2;                 // sprite pixels per world unit (set by game.js from zoom * devicePixelRatio)
  P.INK = '#3a2a22';       // the warm dark line colour used for outlines
  const cache = new Map();
  P.flush = () => cache.clear();

  // A cached painted sprite. draw(ctx) works in world units with (0,0) at the sprite's anchor.
  // box = [left, top, right, bottom] extents around the anchor.
  P.sprite = (key, box, draw) => {
    let s = cache.get(key);
    if (s) return s;
    const w = box[2] - box[0], h = box[3] - box[1];
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.ceil(w * P.S)); c.height = Math.max(2, Math.ceil(h * P.S));
    const g = c.getContext('2d');
    g.scale(P.S, P.S); g.translate(-box[0], -box[1]);
    draw(g);
    s = { c, x: box[0], y: box[1], w, h };
    cache.set(key, s);
    return s;
  };
  P.put = (ctx, s, x, y, rot, sx, sy, alpha) => {
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    if (rot || sx !== undefined) {
      ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sx !== undefined) ctx.scale(sx, sy === undefined ? sx : sy);
      ctx.drawImage(s.c, s.x, s.y, s.w, s.h); ctx.restore();
    } else ctx.drawImage(s.c, x + s.x, y + s.y, s.w, s.h);
    if (alpha !== undefined) ctx.globalAlpha = 1;
  };

  P.ell = (g, x, y, rx, ry, fill, rot) => { g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU); g.fillStyle = fill; g.fill(); };
  // a soft glow / shadow: radial gradient from colour to transparent
  P.glow = (g, x, y, r, col, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, U.rgba(col, a === undefined ? 1 : a)); gr.addColorStop(1, U.rgba(col, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  };
  // a shaded ball: light from the upper left
  P.ball = (g, x, y, rx, ry, light, base, dark) => {
    const gr = g.createRadialGradient(x - rx * 0.35, y - ry * 0.45, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.15);
    gr.addColorStop(0, light); gr.addColorStop(0.55, base); gr.addColorStop(1, dark);
    P.ell(g, x, y, rx, ry, gr);
  };
  P.lin = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of stops) gr.addColorStop(s[0], s[1]); return gr; };
  // painterly dabs scattered inside an ellipse
  P.dabs = (g, rnd, x, y, rx, ry, n, size, cols, alpha) => {
    g.globalAlpha = alpha === undefined ? 0.5 : alpha;
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd());
      const s = size * (0.5 + rnd());
      P.ell(g, x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, s, s * (0.45 + rnd() * 0.4), cols[Math.floor(rnd() * cols.length)], rnd() * 3);
    }
    g.globalAlpha = 1;
  };
  // a hand-drawn ink line through points, a little thicker in the middle
  P.ink = (g, pts, w, col) => {
    g.strokeStyle = col || P.INK; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    const l = pts[pts.length - 1]; g.lineTo(l[0], l[1]); g.stroke();
  };
  // closed smooth blob through points
  P.blobPath = (g, pts) => {
    const n = pts.length; g.beginPath();
    g.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    g.closePath();
  };
  P.rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  // a glossy storybook eye
  P.eye = (g, x, y, r, open, look) => {
    open = open === undefined ? 1 : open;
    if (open < 0.15) { P.ink(g, [[x - r, y], [x, y + r * 0.35], [x + r, y]], r * 0.35, '#2a1c18'); return; }
    P.ell(g, x, y, r * 0.86, r * open, '#1d1412');
    P.ell(g, x - r * 0.28 + (look || 0), y - r * 0.38 * open, r * 0.34, r * 0.34 * open, '#fff');
    P.ell(g, x + r * 0.3, y + r * 0.35 * open, r * 0.16, r * 0.16 * open, 'rgba(255,255,255,.7)');
  };
  P.blush = (g, x, y, r) => P.glow(g, x, y, r, '#ff7b6e', 0.5);

  // paper grain: a soft noise tile laid over the whole picture so it reads as paint on paper
  P.grain = () => {
    if (P._grain) return P._grain;
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const d = g.createImageData(256, 256), r = U.mulberry(77);
    for (let i = 0; i < d.data.length; i += 4) { const v = 118 + r() * 20 + (r() < 0.02 ? 30 : 0); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
    // a few long fibres
    g.globalAlpha = 0.07; g.strokeStyle = '#fff';
    for (let i = 0; i < 60; i++) { g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 14); g.stroke(); }
    return (P._grain = c);
  };

  // ---- particles (soft painted specks). kinds: dot, leaf, fluff, spark, ring, star, drop, note, text
  const parts = (P.parts = []);
  P.emit = (o) => { if (parts.length < 700) parts.push(Object.assign({ t: 0, life: 0.6, vx: 0, vy: 0, g: 0, r: 4, col: '#fff', kind: 'dot', a: 1, rot: U.rand(0, 6), spin: 0, drag: 0 }, o)); };
  P.burst = (x, y, n, o) => {
    for (let i = 0; i < n; i++) {
      const a = U.rand(0, TAU), sp = (o.speed || 120) * U.rand(0.3, 1);
      P.emit(Object.assign({}, o, { x: x + U.rand(-4, 4), y: y + U.rand(-4, 4), vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp * (o.flat || 1) + (o.vy || 0), life: (o.life || 0.6) * U.rand(0.6, 1.2), r: (o.r || 4) * U.rand(0.6, 1.3), spin: U.rand(-4, 4) }));
    }
  };
  P.updateParts = (dt, wind) => {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt;
      if (p.t >= p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      p.vy += p.g * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
      if (p.windy) p.vx += wind * p.windy * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
    }
  };
  P.drawParts = (g, layer) => {
    for (const p of parts) {
      if ((p.layer || 0) !== layer) continue;
      const k = p.t / p.life, a = p.a * (p.fadeIn ? Math.min(1, p.t / p.fadeIn) : 1) * (1 - k * k);
      g.globalAlpha = a;
      if (p.kind === 'dot') P.ell(g, p.x, p.y, p.r * (p.grow ? 1 + k * p.grow : 1), p.r * (p.grow ? 1 + k * p.grow : 1), p.col);
      else if (p.kind === 'leaf') P.ell(g, p.x, p.y, p.r, p.r * 0.45, p.col, p.rot);
      else if (p.kind === 'fluff') { P.glow(g, p.x, p.y, p.r * 1.6, p.col, 0.9); }
      else if (p.kind === 'spark') { g.strokeStyle = p.col; g.lineWidth = p.r * 0.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); g.stroke(); }
      else if (p.kind === 'ring') { g.strokeStyle = p.col; g.lineWidth = p.r * (1 - k); g.beginPath(); g.ellipse(p.x, p.y, (p.R || 60) * U.smooth(k * 1.2), (p.R || 60) * U.smooth(k * 1.2) * (p.squash || 1), 0, 0, TAU); g.stroke(); }
      else if (p.kind === 'star') { g.fillStyle = p.col; g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? p.r * 0.4 : p.r; g.lineTo(Math.cos(j * TAU / 8) * rr, Math.sin(j * TAU / 8) * rr); } g.fill(); g.restore(); }
      else if (p.kind === 'drop') { g.strokeStyle = p.col; g.lineWidth = p.r; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); g.stroke(); }
      else if (p.kind === 'text') { g.font = '700 ' + p.r + 'px Gaegu, "Comic Sans MS", cursive'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(40,26,20,.75)'; g.strokeText(p.text, p.x, p.y); g.fillStyle = p.col; g.fillText(p.text, p.x, p.y); }
    }
    g.globalAlpha = 1;
  };
  P.say = (x, y, text, col, size) => P.emit({ kind: 'text', x, y, vy: -26, life: 1.6, text, col: col || '#fff7e0', r: size || 24, layer: 1 });
})();
