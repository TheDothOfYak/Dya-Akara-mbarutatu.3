/* ============================================================
   SKAAR UVERKHRON — js/art.js
   Every picture in the game, drawn in code: terrain, trees and
   mountains, map objects, the creatures, heroes and captains.
   Smooth shapes, gradients and highlights — no blocks.
   Each creature is drawn standing on (0,0), about `s` px tall
   for a medium creature, facing right when f = 1.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data;
  const A = SU.art = {};
  const TAU = Math.PI * 2;

  /* ---------- colour helpers ---------- */
  function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  A.rgba = (h, a) => { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; };
  A.shade = (h, amt) => { const [r, g, b] = hexToRgb(h); const f = v => SU.clamp(Math.round(amt > 0 ? v + (255 - v) * amt / 100 : v * (1 + amt / 100)), 0, 255); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); };
  A.mix = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const rgba = A.rgba, shade = A.shade;
  function canvas(w, h) { const c = typeof document !== 'undefined' ? document.createElement('canvas') : null; if (c) { c.width = Math.ceil(w); c.height = Math.ceil(h); } return c; }
  A.canvas = canvas;
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function radial(ctx, x, y, r, c0, c1) { const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; }
  function lin(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function outline(ctx, w) { ctx.lineWidth = w || 1.4; ctx.strokeStyle = 'rgba(16,10,6,0.78)'; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  /* the one shadow everything casts on the ground: soft-edged, darkest under the feet, the same everywhere */
  function contact(ctx, x, y, rx, ry, a) {
    rx = Math.max(0.5, rx); ry = Math.max(0.3, ry); a = a == null ? 0.42 : a;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, 'rgba(8,6,12,' + a + ')'); gr.addColorStop(0.55, 'rgba(8,6,12,' + (a * 0.62) + ')'); gr.addColorStop(1, 'rgba(8,6,12,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  A.contact = contact;
  function shadow(ctx, w, h) { contact(ctx, 0, 0, w * 1.2, h * 1.25, 0.42); }
  A.ell = ell; A.radial = radial; A.lin = lin; A.outline = outline;

  /* ======================= terrain textures ======================= */
  const TERR = {
    grass: { base: '#5d8a3a', hi: '#7aa84a', lo: '#466e2b' },
    dirt: { base: '#8a6a44', hi: '#a5835a', lo: '#6e5234' },
    rough: { base: '#7c7766', hi: '#99937f', lo: '#5d594c' },
    sand: { base: '#d1b77a', hi: '#e6d29c', lo: '#b49a5f' },
    snow: { base: '#e3ebf2', hi: '#ffffff', lo: '#b7c7d8' },
    swamp: { base: '#4f5e3a', hi: '#66784a', lo: '#36432a' },
    ash: { base: '#5a4740', hi: '#74605a', lo: '#3c2d29' },
    dusk: { base: '#3a3150', hi: '#51456e', lo: '#261f36' },
    moon: { base: '#b9b6c8', hi: '#dcdae8', lo: '#8f8ca3' },
    water: { base: '#2a5f86', hi: '#3f7fa8', lo: '#1c4566' },
    void: { base: '#06060c', hi: '#0c0c18', lo: '#020205' },
  };
  A.TERR = TERR;
  const texCache = {};
  /* one tile's texture, seamless enough to sit next to itself. ts = tile size in px */
  A.terrainTex = function (id, variant, ts) {
    const k = id + variant + '_' + ts; if (texCache[k]) return texCache[k];
    const c = canvas(ts, ts), g = c.getContext('2d'), P = TERR[id] || TERR.grass;
    const R = SU.makeRng(variant * 977 + id.length * 31 + ts);
    g.fillStyle = P.base; g.fillRect(0, 0, ts, ts);
    /* soft mottling */
    for (let i = 0; i < 14; i++) { g.fillStyle = rgba(R.chance(0.5) ? P.hi : P.lo, 0.16); ell(g, R.range(0, ts), R.range(0, ts), R.range(ts * 0.15, ts * 0.45), R.range(ts * 0.1, ts * 0.3)); g.fill(); }
    const dots = (n, col, a, rmin, rmax) => { for (let i = 0; i < n; i++) { g.fillStyle = rgba(col, a); ell(g, R.range(0, ts), R.range(0, ts), R.range(rmin, rmax), R.range(rmin, rmax) * 0.7); g.fill(); } };
    const S_ = ts / 48;
    if (id === 'grass') {
      for (let i = 0; i < 70; i++) { const x = R.range(0, ts), y = R.range(0, ts), h = R.range(2, 5) * S_; g.strokeStyle = rgba(R.chance(0.5) ? P.hi : '#8bbd55', R.range(0.35, 0.7)); g.lineWidth = 0.9 * S_; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + R.range(-1.5, 1.5) * S_, y - h * 0.6, x + R.range(-2, 2) * S_, y - h); g.stroke(); }
      if (R.chance(0.5)) for (let i = 0; i < 3; i++) { g.fillStyle = R.pick(['#f1e48a', '#ffffff', '#e89ac0', '#b5a0ff']); ell(g, R.range(3, ts - 3), R.range(3, ts - 3), 1.1 * S_, 1.1 * S_); g.fill(); }
    } else if (id === 'dirt') { dots(26, P.lo, 0.5, 0.6 * S_, 1.6 * S_); dots(10, P.hi, 0.5, 0.8 * S_, 1.8 * S_); }
    else if (id === 'rough') { for (let i = 0; i < 9; i++) { const x = R.range(0, ts), y = R.range(0, ts), r = R.range(1.5, 3.5) * S_; g.fillStyle = radial(g, x, y, r, P.hi, P.lo); ell(g, x, y, r, r * 0.7); g.fill(); } dots(20, '#4a4638', 0.4, 0.5 * S_, 1.2 * S_); }
    else if (id === 'sand') { g.strokeStyle = rgba(P.lo, 0.35); g.lineWidth = 1 * S_; for (let i = 0; i < 6; i++) { const y = R.range(0, ts); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(ts * 0.3, y - 3 * S_, ts * 0.6, y + 3 * S_, ts, y); g.stroke(); } dots(14, P.hi, 0.6, 0.4 * S_, 1 * S_); }
    else if (id === 'snow') { for (let i = 0; i < 6; i++) { g.fillStyle = rgba('#9fb4cc', 0.2); ell(g, R.range(0, ts), R.range(0, ts), R.range(5, 12) * S_, R.range(2, 5) * S_); g.fill(); } dots(18, '#ffffff', 0.9, 0.3 * S_, 0.8 * S_); }
    else if (id === 'swamp') { for (let i = 0; i < 4; i++) { const x = R.range(4, ts - 4), y = R.range(4, ts - 4); g.fillStyle = lin(g, x, y - 4, x, y + 4, [[0, '#3c5f63'], [1, '#22383a']]); ell(g, x, y, R.range(4, 9) * S_, R.range(2, 4) * S_); g.fill(); g.strokeStyle = rgba('#9fc0a0', 0.25); g.stroke(); } dots(14, '#7a8a4a', 0.5, 0.6 * S_, 1.4 * S_); }
    else if (id === 'ash') { g.strokeStyle = rgba('#1e1412', 0.55); g.lineWidth = 0.9 * S_; for (let i = 0; i < 5; i++) { let x = R.range(0, ts), y = R.range(0, ts); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += R.range(-6, 6) * S_; y += R.range(-6, 6) * S_; g.lineTo(x, y); } g.stroke(); } dots(5, '#ff8a3a', 0.65, 0.5 * S_, 1.1 * S_); dots(14, '#8a7a72', 0.4, 0.5 * S_, 1.4 * S_); }
    else if (id === 'dusk') { g.strokeStyle = rgba('#8e7cff', 0.45); g.lineWidth = 1 * S_; for (let i = 0; i < 4; i++) { let x = R.range(0, ts), y = R.range(0, ts); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { x += R.range(-7, 7) * S_; y += R.range(-7, 7) * S_; g.lineTo(x, y); } g.stroke(); } dots(10, '#b9a8ff', 0.35, 0.4 * S_, 1 * S_); dots(16, '#1a1528', 0.5, 0.8 * S_, 2 * S_); }
    else if (id === 'moon') { for (let i = 0; i < 4; i++) { const x = R.range(0, ts), y = R.range(0, ts), r = R.range(2, 6) * S_; g.fillStyle = rgba(P.lo, 0.6); ell(g, x, y, r, r * 0.8); g.fill(); g.strokeStyle = rgba(P.hi, 0.7); g.lineWidth = 0.8 * S_; g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0, Math.PI * 0.9, Math.PI * 1.9); g.stroke(); } }
    else if (id === 'water') { g.strokeStyle = rgba('#9fd0ee', 0.18); g.lineWidth = 1 * S_; for (let i = 0; i < 4; i++) { const y = R.range(0, ts), x = R.range(-5, ts); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 5 * S_, y - 2 * S_, x + 10 * S_, y); g.stroke(); } }
    else if (id === 'void') { dots(4, '#ffffff', R.range(0.3, 0.9), 0.3 * S_, 0.7 * S_); dots(3, '#9fb0ff', 0.4, 0.3 * S_, 0.6 * S_); }
    texCache[k] = c; return c;
  };

  /* ======================= obstacles on the map ======================= */
  const obCache = {};
  /* returns {c, ox, oy}: draw at (tileX*ts - ox, tileY*ts - oy) */
  A.obstacle = function (kind, variant, ts) {
    const k = kind + (A._single ? 's' : '') + '_' + (variant % 6) + '_' + ts; if (obCache[k]) return obCache[k];
    const R = SU.makeRng(variant % 6 * 131 + kind.length * 7);
    const W = ts * 2, H = ts * 2.4, c = canvas(W, H), g = c.getContext('2d');
    const cx = W / 2, gy = H - ts * 0.55; const s = ts / 48;
    g.save(); g.translate(cx, gy);
    if ((kind === 'tree' || kind === 'glowtree') && !A._single) {
      /* a little copse: two or three trees of different sizes */
      const n = R.chance(0.6) ? 3 : 2, spots = [[-9, -3, 0.78], [8, -1, 0.86], [0, 4, 1]].slice(3 - n);
      g.fillStyle = 'rgba(18,30,12,0.3)'; ell(g, 0, 2 * s, 22 * s, 7 * s); g.fill();
      g.restore(); A._single = true;
      spots.forEach(([dx, dy, k], i) => { const sub = A.obstacle(kind, variant + i * 7 + 1, Math.round(ts * k)); g.drawImage(sub.c, cx + dx * s - sub.c.width / 2, gy + dy * s - sub.c.height + ts * k * 0.55); });
      A._single = false;
      return (obCache[k] = { c, ox: W / 2 - ts / 2, oy: gy - ts * 0.78 });
    }
    if (kind === 'tree' || kind === 'glowtree') {
      g.save(); g.scale(1, 1); shadow(g, 14 * s, 5 * s); g.restore();
      g.fillStyle = lin(g, -3 * s, 0, 3 * s, 0, [[0, '#4a3220'], [1, '#2a1b10']]); g.beginPath(); g.moveTo(-3 * s, 0); g.lineTo(-2 * s, -16 * s); g.lineTo(2 * s, -16 * s); g.lineTo(3 * s, 0); g.fill();
      const leaf = kind === 'glowtree' ? ['#3d8a7a', '#68e0c8', '#1f4d45'] : R.pick([['#3e6e2a', '#6aa040', '#24451a'], ['#46702c', '#7fae4c', '#2a4a1c'], ['#3a6630', '#5f9a48', '#213f1c']]);
      const blobs = [[0, -30, 14], [-9, -24, 10], [9, -23, 10], [-5, -36, 9], [6, -35, 9], [0, -19, 10]];
      blobs.forEach(([x, y, r]) => { g.fillStyle = radial(g, x * s, y * s, r * s, leaf[1], leaf[0]); ell(g, x * s, y * s, r * s, r * s * 0.9); g.fill(); });
      blobs.forEach(([x, y, r]) => { g.fillStyle = rgba(leaf[2], 0.35); ell(g, x * s + r * s * 0.3, y * s + r * s * 0.35, r * s * 0.6, r * s * 0.45); g.fill(); });
      for (let i = 0; i < 9; i++) { g.fillStyle = rgba(leaf[1], 0.6); ell(g, R.range(-12, 12) * s, R.range(-40, -18) * s, 2.2 * s, 1.6 * s); g.fill(); }
      if (kind === 'glowtree') { g.shadowColor = '#68e0c8'; g.shadowBlur = 8 * s; for (let i = 0; i < 6; i++) { g.fillStyle = '#c9fff2'; ell(g, R.range(-10, 10) * s, R.range(-38, -18) * s, 1.3 * s, 1.3 * s); g.fill(); } g.shadowBlur = 0; }
    } else if (kind === 'pine') {
      shadow(g, 11 * s, 4 * s);
      g.fillStyle = '#3a2716'; g.fillRect(-2 * s, -8 * s, 4 * s, 8 * s);
      const tiers = 4; for (let i = 0; i < tiers; i++) { const y = -8 * s - i * 9 * s, w = (14 - i * 3) * s;
        g.fillStyle = lin(g, -w, 0, w, 0, [[0, '#2f5a3e'], [0.55, '#3f7650'], [1, '#1d3a28']]); g.beginPath(); g.moveTo(-w, y); g.quadraticCurveTo(0, y - 2 * s, w, y); g.lineTo(0, y - 15 * s); g.closePath(); g.fill();
        g.fillStyle = rgba('#ffffff', 0.55); g.beginPath(); g.moveTo(-w * 0.5, y - 6 * s); g.lineTo(0, y - 15 * s); g.lineTo(w * 0.2, y - 9 * s); g.closePath(); g.fill(); }
    } else if (kind === 'palm') {
      shadow(g, 10 * s, 4 * s);
      g.strokeStyle = '#7a5a34'; g.lineWidth = 3.5 * s; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(6 * s, -18 * s, 2 * s, -34 * s); g.stroke();
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.55; g.strokeStyle = i % 2 ? '#4f8a34' : '#3d6e28'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(2 * s, -34 * s); g.quadraticCurveTo(2 * s + Math.cos(a) * 10 * s, -34 * s + Math.sin(a) * 10 * s - 4 * s, 2 * s + Math.cos(a) * 18 * s, -34 * s + Math.sin(a) * 14 * s + 6 * s); g.stroke(); }
    } else if (kind === 'deadtree') {
      shadow(g, 9 * s, 3 * s);
      g.strokeStyle = '#2a1e1a'; g.lineCap = 'round';
      const br = (x, y, a, l, w) => { if (l < 3 * s) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); br(x2, y2, a - R.range(0.3, 0.7), l * 0.68, w * 0.65); br(x2, y2, a + R.range(0.3, 0.7), l * 0.62, w * 0.6); };
      br(0, 0, -Math.PI / 2, 16 * s, 4 * s);
      g.fillStyle = rgba('#ff7a2a', 0.6); ell(g, 2 * s, -2 * s, 1.5 * s, 1 * s); g.fill();
    } else if (kind === 'reeds') {
      for (let i = 0; i < 12; i++) { const x = R.range(-12, 12) * s, h = R.range(10, 22) * s; g.strokeStyle = R.chance(0.5) ? '#7a8a44' : '#5e7034'; g.lineWidth = 1.6 * s; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + R.range(-3, 3) * s, -h * 0.6, x + R.range(-4, 4) * s, -h); g.stroke();
        if (R.chance(0.4)) { g.fillStyle = '#5a3a20'; ell(g, x + R.range(-1, 1) * s, -h + 2 * s, 1.4 * s, 3.2 * s); g.fill(); } }
    } else if (kind === 'mountain' || kind === 'ridge') {
      /* a painted range: two or three overlapping peaks of different heights, lit from the
         upper left, rock strata and scree, snow only on the tallest — no hard outline */
      const big = kind === 'mountain';
      const peaks = big ? [[R.range(-14, -4), R.range(30, 40), R.range(16, 20)], [R.range(4, 14), R.range(36, 52), R.range(18, 24)], [R.range(-2, 4), R.range(22, 30), R.range(12, 16)]] : [[R.range(-8, 0), R.range(14, 20), 12], [R.range(4, 10), R.range(10, 16), 10]];
      g.fillStyle = 'rgba(20,16,12,0.28)'; ell(g, 4 * s, 1 * s, (big ? 34 : 20) * s, (big ? 9 : 5) * s); g.fill();
      peaks.sort((p1, p2) => p1[1] - p2[1]).forEach(([px, ph, pw], i) => {
        const x0 = px * s, h = ph * s, w = pw * s, tipx = x0 + R.range(-0.2, 0.2) * w;
        const tone = big ? ['#8f897c', '#7d776a', '#6e685c'][i % 3] : '#857f70';
        /* lit face */
        g.fillStyle = lin(g, x0 - w, -h, x0, 0, [[0, shade(tone, 22)], [1, shade(tone, -8)]]);
        g.beginPath(); g.moveTo(x0 - w, 0); g.quadraticCurveTo(x0 - w * 0.55, -h * 0.5, tipx, -h); g.lineTo(tipx + w * 0.08, -h * 0.6); g.quadraticCurveTo(x0, -h * 0.25, x0 + w * 0.15, 0); g.closePath(); g.fill();
        /* shadowed face */
        g.fillStyle = lin(g, x0, -h, x0 + w, 0, [[0, shade(tone, -28)], [1, shade(tone, -48)]]);
        g.beginPath(); g.moveTo(tipx, -h); g.quadraticCurveTo(x0 + w * 0.55, -h * 0.5, x0 + w, 0); g.lineTo(x0 + w * 0.15, 0); g.quadraticCurveTo(x0, -h * 0.25, tipx + w * 0.08, -h * 0.6); g.closePath(); g.fill();
        /* strata and cracks */
        g.strokeStyle = rgba('#2a2620', 0.28); g.lineWidth = 0.8 * s;
        for (let k = 0; k < 4; k++) { const yy = -h * R.range(0.15, 0.7), xx = tipx + R.range(-0.5, 0.4) * w * (1 + yy / h); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + R.range(3, 8) * s, yy + R.range(1, 4) * s); g.stroke(); }
        g.strokeStyle = rgba('#fffaf0', 0.18); g.beginPath(); g.moveTo(tipx, -h); g.quadraticCurveTo(x0 - w * 0.5, -h * 0.5, x0 - w * 0.9, -1 * s); g.stroke();
        /* snow on the tallest */
        if (big && h > 38 * s) { g.fillStyle = 'rgba(244,247,252,0.95)'; g.beginPath(); g.moveTo(tipx, -h); g.quadraticCurveTo(tipx - w * 0.25, -h * 0.82, tipx - w * 0.34, -h * 0.68); g.lineTo(tipx - w * 0.12, -h * 0.74); g.lineTo(tipx + w * 0.02, -h * 0.66); g.lineTo(tipx + w * 0.2, -h * 0.75); g.quadraticCurveTo(tipx + w * 0.12, -h * 0.86, tipx, -h); g.fill();
          g.fillStyle = 'rgba(160,180,210,0.5)'; g.beginPath(); g.moveTo(tipx, -h); g.lineTo(tipx + w * 0.2, -h * 0.75); g.lineTo(tipx + w * 0.06, -h * 0.72); g.closePath(); g.fill(); }
        g.strokeStyle = 'rgba(30,24,18,0.35)'; g.lineWidth = 0.7 * s; g.beginPath(); g.moveTo(x0 - w, 0); g.quadraticCurveTo(x0 - w * 0.55, -h * 0.5, tipx, -h); g.quadraticCurveTo(x0 + w * 0.55, -h * 0.5, x0 + w, 0); g.stroke();
      });
      /* scree at the foot */
      for (let k = 0; k < 6; k++) { g.fillStyle = rgba(k % 2 ? '#9a9486' : '#5f5a50', 0.8); ell(g, R.range(-24, 24) * s, R.range(-2, 1) * s, R.range(1, 2.5) * s, R.range(0.6, 1.4) * s); g.fill(); }
    } else if (kind === 'rock') {
      shadow(g, 10 * s, 3 * s);
      for (let i = 0; i < 3; i++) { const x = (i - 1) * 6 * s, r = R.range(4, 8) * s; g.fillStyle = radial(g, x, -r * 0.6, r, '#a9a395', '#5f5a50'); ell(g, x, -r * 0.6, r, r * 0.75); g.fill(); outline(g, 1 * s); }
    } else if (kind === 'crystal') {
      shadow(g, 9 * s, 3 * s); g.shadowColor = '#b9a8ff'; g.shadowBlur = 10 * s;
      for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 5 * s, h = R.range(10, 22) * s, w = 3.5 * s; g.fillStyle = lin(g, x - w, 0, x + w, 0, [[0, '#e6deff'], [0.5, '#a796ff'], [1, '#5d4fb0']]); g.beginPath(); g.moveTo(x - w, 0); g.lineTo(x - w * 0.6, -h); g.lineTo(x, -h - 4 * s); g.lineTo(x + w * 0.6, -h); g.lineTo(x + w, 0); g.closePath(); g.fill(); }
      g.shadowBlur = 0;
    }
    g.restore();
    return (obCache[k] = { c, ox: W / 2 - ts / 2, oy: gy - ts * 0.78 });
  };

  /* ======================= the Dearcàn: heroes and captains =======================
     As the other Flake Games draw them:
       EIKAR — an acorn: the nut is the body (and the face), the Aagac cap on top
               with its stem, little limbs.
       KEILIA — taller, a pinecone: dark pine-wood scales, one eye, and a cape of
               pinecone scales falling from the head to the calf.
       KARNEN — small, quick and angular, in a worn triangular hat.
       KALO'EIK — moon-folk: a pale, silvered acorn with a crescent on the cap.
     (x,y) is the feet. o: { color, look, weapon, t, f, seated, helm, armor, swing, noShadow } */
  const SKIN = { eikar: ['#b9863f', '#a8743a', '#c7954e', '#9a6a34'], kaloeik: ['#d6dcec', '#c8d0e6', '#e2e6f2'], keilia: ['#5a3e26', '#4a3220', '#634630'], karnen: ['#8a6a54', '#9a7a5c', '#7a5c48'] };
  function weaponAt(ctx, wpn, S_, t, team, sw) {
    ctx.save(); ctx.rotate(-0.2 + (sw || 0));
    if (wpn === 'spear') { ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 1.4 * S_; ctx.beginPath(); ctx.moveTo(0, 7 * S_); ctx.lineTo(0, -19 * S_); ctx.stroke(); ctx.fillStyle = '#d8dce6'; ctx.beginPath(); ctx.moveTo(-1.6 * S_, -18 * S_); ctx.lineTo(0, -24 * S_); ctx.lineTo(1.6 * S_, -18 * S_); ctx.fill(); }
    else if (wpn === 'sword') { ctx.strokeStyle = '#d8dce6'; ctx.lineWidth = 1.8 * S_; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -13 * S_); ctx.stroke(); ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = 1.4 * S_; ctx.beginPath(); ctx.moveTo(-2.4 * S_, -1 * S_); ctx.lineTo(2.4 * S_, -1 * S_); ctx.stroke(); }
    else if (wpn === 'axe') { ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.6 * S_; ctx.beginPath(); ctx.moveTo(0, 4 * S_); ctx.lineTo(0, -13 * S_); ctx.stroke(); ctx.fillStyle = lin(ctx, 0, -13 * S_, 6 * S_, -7 * S_, [[0, '#e6e9f0'], [1, '#8a8f9a']]); ctx.beginPath(); ctx.moveTo(0, -13 * S_); ctx.quadraticCurveTo(7 * S_, -13 * S_, 6 * S_, -6 * S_); ctx.lineTo(0, -8 * S_); ctx.fill(); }
    else if (wpn === 'staff') { ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 1.5 * S_; ctx.beginPath(); ctx.moveTo(0, 9 * S_); ctx.lineTo(0, -19 * S_); ctx.stroke(); ctx.shadowColor = '#8e7cff'; ctx.shadowBlur = 8 * S_; ctx.fillStyle = '#c9b8ff'; ell(ctx, 0, -20 * S_, 2.2 * S_, 2.2 * S_); ctx.fill(); ctx.shadowBlur = 0; }
    else if (wpn === 'hammer') { ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 1.8 * S_; ctx.beginPath(); ctx.moveTo(0, 4 * S_); ctx.lineTo(0, -11 * S_); ctx.stroke(); ctx.fillStyle = lin(ctx, -4 * S_, 0, 4 * S_, 0, [[0, '#9aa0aa'], [1, '#585e68']]); ctx.fillRect(-4 * S_, -15 * S_, 8 * S_, 5 * S_); ctx.fillStyle = '#4fe0e8'; ctx.fillRect(-1 * S_, -14 * S_, 2 * S_, 3 * S_); }
    else if (wpn === 'bow') { const dr = sw ? 1 : 0; ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 1.3 * S_; ctx.beginPath(); ctx.arc(0, -4 * S_, 9 * S_, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 0.5 * S_; ctx.beginPath(); ctx.moveTo(Math.cos(-1.2) * 9 * S_, -4 * S_ + Math.sin(-1.2) * 9 * S_); ctx.lineTo(-dr * 4 * S_, -4 * S_); ctx.lineTo(Math.cos(1.2) * 9 * S_, -4 * S_ + Math.sin(1.2) * 9 * S_); ctx.stroke(); if (!dr) { ctx.strokeStyle = '#d8dce6'; ctx.lineWidth = 0.7 * S_; ctx.beginPath(); ctx.moveTo(-3 * S_, -4 * S_); ctx.lineTo(11 * S_, -4 * S_); ctx.stroke(); } }
    else if (wpn === 'pouch') { ctx.fillStyle = '#7a5a34'; ell(ctx, 0, 0, 4 * S_, 4.4 * S_); ctx.fill(); outline(ctx, 0.6 * S_); ctx.fillStyle = '#ff8c3a'; [[-1.6, -4], [0.6, -5], [2.2, -3.6]].forEach(([x, y]) => { ctx.save(); ctx.translate(x * S_, y * S_); ctx.rotate(-1.2 + x * 0.3); ctx.beginPath(); ctx.moveTo(0, -3 * S_); ctx.lineTo(-1 * S_, 0); ctx.lineTo(1 * S_, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#5aa04a'; ctx.fillRect(-0.8 * S_, 0, 1.6 * S_, 1.2 * S_); ctx.fillStyle = '#ff8c3a'; ctx.restore(); }); }
    else if (wpn === 'banner') { ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 1.4 * S_; ctx.beginPath(); ctx.moveTo(0, 7 * S_); ctx.lineTo(0, -25 * S_); ctx.stroke(); const wv = Math.sin(t * 4) * 1.5 * S_; ctx.fillStyle = team; ctx.beginPath(); ctx.moveTo(0, -25 * S_); ctx.quadraticCurveTo(6 * S_, -24 * S_ + wv, 11 * S_, -22 * S_); ctx.lineTo(10 * S_, -16 * S_ + wv); ctx.quadraticCurveTo(5 * S_, -17 * S_ - wv, 0, -16 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.7 * S_); }
    ctx.restore();
  }
  function limbs(ctx, S_, hipY, hipW, legLen, col, t, seated, stride) {
    if (seated) return;
    const st = stride || 0;
    ctx.strokeStyle = shade(col, -45); ctx.lineWidth = 2.4 * S_; ctx.lineCap = 'round';
    [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(sd * hipW, hipY); ctx.lineTo(sd * hipW * 1.1 + sd * st * S_, 0); ctx.stroke();
      ctx.fillStyle = shade(col, -55); ell(ctx, sd * hipW * 1.1 + sd * st * S_ + 1.2 * S_, -0.3 * S_, 2 * S_, 1 * S_); ctx.fill(); });
  }
  function arm(ctx, S_, fromX, fromY, toX, toY, col) { ctx.strokeStyle = shade(col, -35); ctx.lineWidth = 2.2 * S_; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.quadraticCurveTo((fromX + toX) / 2 + 1 * S_, (fromY + toY) / 2 + 1.5 * S_, toX, toY); ctx.stroke(); ctx.fillStyle = shade(col, -10); ell(ctx, toX, toY, 1.5 * S_, 1.5 * S_); ctx.fill(); }

  A.person = function (ctx, x, y, s, people, o) {
    o = o || {}; const f = o.f || 1, t = o.t || 0, R = SU.makeRng(o.look || 7);
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    const k = people === 'keilia' ? 1.35 : people === 'karnen' ? 0.8 : 1;
    const S_ = s / 30 * k;
    if (!o.noShadow && !o.seated) { shadow(ctx, 8 * S_, 2.6 * S_); }
    const bob = Math.sin(t * 3 + (o.look || 0)) * 0.5 * S_; ctx.translate(0, bob);
    const team = o.color || '#c43a3a', wpn = o.weapon || 'spear';
    const skin = R.pick(SKIN[people] || SKIN.eikar);
    if (people === 'keilia') drawKeilia(ctx, S_, t, o, skin, team, wpn, R);
    else if (people === 'karnen') drawKarnen(ctx, S_, t, o, skin, team, wpn, R);
    else drawAcornFolk(ctx, S_, t, o, skin, team, wpn, R, people === 'kaloeik');
    ctx.restore();
  };
  /* EIKAR and KALO'EIK: the acorn */
  function drawAcornFolk(ctx, S_, t, o, skin, team, wpn, R, moon) {
    limbs(ctx, S_, -5 * S_, 3 * S_, 5, skin, t, o.seated, o.stride);
    /* a cloak in the team's colour, behind */
    ctx.fillStyle = lin(ctx, -9 * S_, -20 * S_, 6 * S_, -4 * S_, [[0, shade(team, -5)], [1, shade(team, -50)]]);
    ctx.beginPath(); ctx.moveTo(-6 * S_, -19 * S_); ctx.quadraticCurveTo(-12 * S_, -10 * S_, -9 * S_ + Math.sin(t * 2) * 0.6 * S_, -4 * S_); ctx.lineTo(-2 * S_, -6 * S_); ctx.closePath(); ctx.fill();
    /* the nut: widest under the cap, rounding to a point below */
    ctx.fillStyle = radial(ctx, -2 * S_, -15 * S_, 13 * S_, shade(skin, 30), shade(skin, -30));
    ctx.beginPath(); ctx.moveTo(-8 * S_, -19 * S_); ctx.bezierCurveTo(-9.5 * S_, -11 * S_, -5 * S_, -4 * S_, 0, -3 * S_); ctx.bezierCurveTo(5 * S_, -4 * S_, 9.5 * S_, -11 * S_, 8 * S_, -19 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.8 * S_);
    ctx.strokeStyle = rgba('#ffffff', 0.16); ctx.lineWidth = 1.2 * S_; ctx.beginPath(); ctx.moveTo(-5.5 * S_, -16 * S_); ctx.quadraticCurveTo(-6.5 * S_, -11 * S_, -3.5 * S_, -7 * S_); ctx.stroke();
    /* armour or a belt */
    if (o.armor) { ctx.fillStyle = lin(ctx, 0, -13 * S_, 0, -8 * S_, [[0, '#9aa0aa'], [1, '#585e68']]); ctx.beginPath(); ctx.moveTo(-8.3 * S_, -13 * S_); ctx.quadraticCurveTo(0, -11 * S_, 8.3 * S_, -13 * S_); ctx.lineTo(7 * S_, -8.5 * S_); ctx.quadraticCurveTo(0, -6.5 * S_, -7 * S_, -8.5 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.6 * S_); }
    else { ctx.strokeStyle = team; ctx.lineWidth = 1.6 * S_; ctx.beginPath(); ctx.moveTo(-7.8 * S_, -10 * S_); ctx.quadraticCurveTo(0, -8 * S_, 7.8 * S_, -10 * S_); ctx.stroke(); }
    /* face: eyes and the markings beneath them */
    const ey = -15.5 * S_;
    ctx.fillStyle = '#1a1008'; ell(ctx, 1.8 * S_, ey, 0.9 * S_, 1.1 * S_); ctx.fill(); ell(ctx, 4.8 * S_, ey - 0.2 * S_, 0.8 * S_, 1 * S_); ctx.fill();
    ctx.strokeStyle = moon ? rgba('#bcd0ff', 0.9) : rgba('#3a2010', 0.65); ctx.lineWidth = 0.6 * S_;
    ctx.beginPath(); ctx.moveTo(0.8 * S_, ey + 1.8 * S_); ctx.lineTo(3.3 * S_, ey + 3.2 * S_); ctx.lineTo(5.8 * S_, ey + 1.6 * S_); ctx.stroke();
    /* arms: one holds the weapon */
    arm(ctx, S_, -7 * S_, -13 * S_, -9 * S_, -8 * S_, skin);
    ctx.save(); ctx.translate(9 * S_, -10 * S_); weaponAt(ctx, wpn, S_, t, team, o.swing); ctx.restore();
    arm(ctx, S_, 7 * S_, -13 * S_, 9 * S_, -10 * S_, skin);
    /* the Aagac: the acorn cap, part of them, stem and all */
    const cap = moon ? '#9aa6d8' : R.pick(['#5a3a1c', '#6a4a24', '#4a2e16', '#3a2a17']);
    ctx.fillStyle = radial(ctx, -2 * S_, -23 * S_, 10 * S_, shade(cap, 35), shade(cap, -35));
    ctx.beginPath(); ctx.moveTo(-9.6 * S_, -18.5 * S_); ctx.quadraticCurveTo(-9.5 * S_, -26.5 * S_, 0, -27 * S_); ctx.quadraticCurveTo(9.5 * S_, -26.5 * S_, 9.6 * S_, -18.5 * S_); ctx.quadraticCurveTo(0, -16.5 * S_, -9.6 * S_, -18.5 * S_); ctx.fill(); outline(ctx, 0.8 * S_);
    ctx.strokeStyle = rgba('#1e1208', 0.45); ctx.lineWidth = 0.55 * S_;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 2.6 * S_, -18 * S_); ctx.lineTo(i * 2.1 * S_ + 0.6 * S_, -24.5 * S_); ctx.stroke(); }
    for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.moveTo(-8.6 * S_, -20.3 * S_ - j * 2.4 * S_); ctx.quadraticCurveTo(0, -22.2 * S_ - j * 2.6 * S_, 8.6 * S_, -20.3 * S_ - j * 2.4 * S_); ctx.stroke(); }
    ctx.strokeStyle = shade(cap, -25); ctx.lineWidth = 1.5 * S_; ctx.beginPath(); ctx.moveTo(0, -26.6 * S_); ctx.quadraticCurveTo(0.6 * S_, -29.5 * S_, 2.6 * S_, -29.8 * S_); ctx.stroke();
    if (moon) { ctx.save(); ctx.shadowColor = '#e8eeff'; ctx.shadowBlur = 6 * S_; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1 * S_; ctx.beginPath(); ctx.arc(-1 * S_, -22.5 * S_, 2.6 * S_, Math.PI * 0.6, Math.PI * 1.6); ctx.stroke(); ctx.restore(); }
    if (o.helm) { ctx.fillStyle = lin(ctx, 0, -27 * S_, 0, -19 * S_, [[0, '#d8dce6'], [1, '#6a6f7a']]); ctx.beginPath(); ctx.moveTo(-9.8 * S_, -19 * S_); ctx.quadraticCurveTo(-9.6 * S_, -27.5 * S_, 0, -28 * S_); ctx.quadraticCurveTo(9.6 * S_, -27.5 * S_, 9.8 * S_, -19 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.7 * S_); }
  }
  /* KEILIA: the pinecone — dark scaled wood, one eye, and a cape of scales */
  function drawKeilia(ctx, S_, t, o, skin, team, wpn, R) {
    limbs(ctx, S_, -4 * S_, 3.2 * S_, 5, skin, t, o.seated, o.stride);
    /* the scale-hair cape, from the crown to the calf */
    const capeCol = shade(skin, -10);
    ctx.fillStyle = lin(ctx, -10 * S_, -28 * S_, 0, -2 * S_, [[0, shade(capeCol, 15)], [1, shade(capeCol, -35)]]);
    ctx.beginPath(); ctx.moveTo(-3 * S_, -28 * S_); ctx.quadraticCurveTo(-13 * S_, -18 * S_, -10 * S_ + Math.sin(t * 2) * 0.5 * S_, -2 * S_); ctx.lineTo(2 * S_, -4 * S_); ctx.quadraticCurveTo(-4 * S_, -14 * S_, 2 * S_, -27 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.7 * S_);
    ctx.fillStyle = rgba('#1a0e06', 0.35);
    for (let r = 0; r < 7; r++) for (let c = 0; c < 2; c++) { const sx = -9 * S_ + c * 3.5 * S_ + (r % 2) * 1.6 * S_ + r * 0.3 * S_, sy = -24 * S_ + r * 3 * S_; ctx.beginPath(); ctx.moveTo(sx - 1.6 * S_, sy); ctx.quadraticCurveTo(sx, sy + 2.6 * S_, sx + 1.6 * S_, sy); ctx.fill(); }
    /* the body: a pinecone, broad in the middle, pointed above */
    ctx.fillStyle = radial(ctx, -1 * S_, -15 * S_, 13 * S_, shade(skin, 35), shade(skin, -35));
    ctx.beginPath(); ctx.moveTo(0, -30 * S_); ctx.bezierCurveTo(7 * S_, -28 * S_, 8.5 * S_, -16 * S_, 7 * S_, -8 * S_); ctx.quadraticCurveTo(5 * S_, -3 * S_, 0, -3 * S_); ctx.quadraticCurveTo(-5 * S_, -3 * S_, -7 * S_, -8 * S_); ctx.bezierCurveTo(-8.5 * S_, -16 * S_, -7 * S_, -28 * S_, 0, -30 * S_); ctx.fill(); outline(ctx, 0.8 * S_);
    /* overlapping scales in a lattice */
    ctx.save(); ctx.clip();
    for (let r = 0; r < 9; r++) for (let c = -3; c <= 3; c++) { const sx = c * 3.2 * S_ + (r % 2) * 1.6 * S_, sy = -28 * S_ + r * 3 * S_;
      ctx.fillStyle = rgba(r % 2 ? '#2a180c' : '#1e1208', 0.32); ctx.beginPath(); ctx.moveTo(sx - 1.7 * S_, sy); ctx.quadraticCurveTo(sx, sy + 3 * S_, sx + 1.7 * S_, sy); ctx.lineTo(sx, sy + 1 * S_); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#d8a878', 0.18); ctx.lineWidth = 0.5 * S_; ctx.beginPath(); ctx.moveTo(sx - 1.6 * S_, sy + 0.2 * S_); ctx.quadraticCurveTo(sx, sy + 2.6 * S_, sx + 1.6 * S_, sy + 0.2 * S_); ctx.stroke(); }
    ctx.restore();
    /* the single eye */
    ctx.fillStyle = '#efe6cc'; ell(ctx, 2.4 * S_, -21 * S_, 2.2 * S_, 1.8 * S_); ctx.fill(); outline(ctx, 0.5 * S_);
    ctx.fillStyle = '#1a1008'; ell(ctx, 3 * S_, -21 * S_, 1.1 * S_, 1.2 * S_); ctx.fill();
    ctx.strokeStyle = rgba('#1a0e06', 0.8); ctx.lineWidth = 0.7 * S_; ctx.beginPath(); ctx.moveTo(0, -23.6 * S_); ctx.quadraticCurveTo(2.4 * S_, -24.4 * S_, 4.8 * S_, -23.4 * S_); ctx.stroke();
    /* a belt in the team's colour */
    ctx.strokeStyle = team; ctx.lineWidth = 1.8 * S_; ctx.beginPath(); ctx.moveTo(-7.6 * S_, -11 * S_); ctx.quadraticCurveTo(0, -9 * S_, 7.6 * S_, -11 * S_); ctx.stroke();
    if (o.armor) { ctx.fillStyle = lin(ctx, 0, -18 * S_, 0, -12 * S_, [[0, '#9aa0aa'], [1, '#585e68']]); ctx.fillRect(-6.5 * S_, -17 * S_, 13 * S_, 5 * S_); outline(ctx, 0.6 * S_); }
    arm(ctx, S_, -6.5 * S_, -15 * S_, -9 * S_, -9 * S_, skin);
    ctx.save(); ctx.translate(9.5 * S_, -11 * S_); weaponAt(ctx, wpn === 'hammer' && !o.builder ? 'axe' : wpn, S_, t, team, o.swing); ctx.restore();
    arm(ctx, S_, 6.5 * S_, -15 * S_, 9.5 * S_, -11 * S_, skin);
    if (o.helm) { ctx.fillStyle = lin(ctx, 0, -31 * S_, 0, -25 * S_, [[0, '#d8dce6'], [1, '#6a6f7a']]); ctx.beginPath(); ctx.moveTo(-5 * S_, -25 * S_); ctx.lineTo(0, -32 * S_); ctx.lineTo(5 * S_, -25 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.6 * S_); }
  }
  /* KARNEN: small, quick, angular, in a worn triangular hat */
  function drawKarnen(ctx, S_, t, o, skin, team, wpn, R) {
    limbs(ctx, S_, -5 * S_, 2.6 * S_, 5, skin, t, o.seated, o.stride);
    ctx.fillStyle = lin(ctx, -7 * S_, -20 * S_, 7 * S_, -4 * S_, [[0, shade(skin, 30)], [1, shade(skin, -30)]]);
    ctx.beginPath(); ctx.moveTo(0, -21 * S_); ctx.lineTo(7 * S_, -12 * S_); ctx.lineTo(3.5 * S_, -4 * S_); ctx.lineTo(-3.5 * S_, -4 * S_); ctx.lineTo(-7 * S_, -12 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.8 * S_);
    ctx.fillStyle = team; ctx.beginPath(); ctx.moveTo(-6 * S_, -11 * S_); ctx.lineTo(6 * S_, -11 * S_); ctx.lineTo(4.6 * S_, -8 * S_); ctx.lineTo(-4.6 * S_, -8 * S_); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1008'; ell(ctx, 1.5 * S_, -15.5 * S_, 0.8 * S_, 1 * S_); ctx.fill(); ell(ctx, 3.8 * S_, -15.6 * S_, 0.7 * S_, 0.9 * S_); ctx.fill();
    arm(ctx, S_, -5.5 * S_, -13 * S_, -8 * S_, -8 * S_, skin);
    ctx.save(); ctx.translate(8 * S_, -10 * S_); weaponAt(ctx, wpn, S_, t, team, o.swing); ctx.restore();
    arm(ctx, S_, 5.5 * S_, -13 * S_, 8 * S_, -10 * S_, skin);
    ctx.fillStyle = lin(ctx, 0, -27 * S_, 0, -19 * S_, [[0, '#6a5a3a'], [1, '#3a2e1a']]);
    ctx.beginPath(); ctx.moveTo(-9 * S_, -19 * S_); ctx.lineTo(0, -28 * S_); ctx.lineTo(9 * S_, -19 * S_); ctx.quadraticCurveTo(0, -17.5 * S_, -9 * S_, -19 * S_); ctx.fill(); outline(ctx, 0.8 * S_);
    ctx.strokeStyle = rgba('#e8d8a8', 0.3); ctx.lineWidth = 0.6 * S_; ctx.beginPath(); ctx.moveTo(-6 * S_, -20.5 * S_); ctx.lineTo(0, -26 * S_); ctx.stroke();
  }

  /* a hero on the map: on a Domestic Punk (a faceless pumpkin walking on vines), or a Kuni Byrd */
  A.mountedHero = function (ctx, x, y, s, hero, color, t, f) {
    ctx.save(); ctx.translate(x, y); ctx.scale(f || 1, 1);
    const S_ = s / 30;
    shadow(ctx, 14 * S_, 4 * S_);
    if (hero.mount === 'kuni') { A.creature(ctx, 'kuni', 0, 0, s * 0.9, { t, f: 1, noShadow: true }); ctx.translate(0, -16 * S_); }
    else {
      CREATURE.punk(ctx, S_ * 1.05, t, { tint: 2, noShadow: true, moving: hero.moving, saddle: color });
      ctx.translate(-1 * S_, -21 * S_);
    }
    A.person(ctx, 0, 0, s * 0.72, hero.people, { color, look: hero.look, weapon: 'banner', t, noShadow: true, seated: true });
    ctx.restore();
  };

  /* ======================= creatures ======================= */
  /* o: { f, t, tint (1 = upgraded), flash, pose: 'idle'|'attack'|'hit', alpha, noShadow, color } */
  A.creature = function (ctx, art, x, y, s, o) {
    o = o || {}; const fn = CREATURE[art] || CREATURE.punk;
    ctx.save(); ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const f = o.f || 1; ctx.scale(f, 1);
    const lunge = o.pose === 'attack' ? Math.sin(Math.min(1, o.poseT || 0) * Math.PI) * s * 0.25 : 0;
    ctx.translate(lunge, 0);
    fn(ctx, s / 30, o.t || 0, o);
    /* struck: the creature itself flares (drawn again, added on top), nothing around it */
    if (o.flash > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, o.flash) * 0.55 * (o.alpha != null ? o.alpha : 1); fn(ctx, s / 30, o.t || 0, Object.assign({}, o, { flash: 0 })); ctx.restore(); }
    ctx.restore();
  };
  const CREATURE = A.CREATURE = {};
  /* THE PUNK FAMILY — faceless pumpkins. Every vine, legs and arms alike, sprouts
     from the stem cluster at the crown: the legs arch out and drape to the ground,
     the arms reach up and out with curled, grasping tips. (Dya'Akara, Torcain's Run.) */
  function punkBody(ctx, S_, t, o, P) {
    const moving = !!o.moving || o.pose === 'attack', attack = o.pose === 'attack';
    const bw = P.w * S_, bh = P.h * S_, y0 = -P.lift * S_ - bh + Math.sin(t * 2.2) * 0.4 * S_;
    const crown = y0 - bh * 0.8;
    /* vine legs: from the crown, arching out, down to curled feet */
    for (let i = 0; i < P.legs; i++) {
      const fr = P.legs === 1 ? 0.5 : i / (P.legs - 1), dir = fr < 0.5 ? -1 : 1;
      const step = moving ? Math.sin(t * 8 + i * 2.2) : 0;
      const fx = (fr - 0.5) * bw * 2.3 + step * 2 * S_, fy = -Math.max(0, step) * 1.6 * S_;
      const ox = (fr - 0.5) * bw * 0.2, mx = (ox + fx) / 2 + dir * bw * 0.55, my = (crown + fy) / 2 - 1 * S_;
      ctx.strokeStyle = shade(P.vine, i % 2 ? -30 : -12); ctx.lineWidth = P.legW * S_; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ox, crown); ctx.bezierCurveTo(ox + (mx - ox) * 0.5, crown - 3 * S_, mx, my, fx, fy); ctx.stroke();
      ctx.lineWidth = P.legW * 0.7 * S_; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + dir * 2.4 * S_, fy + 0.4 * S_, fx + dir * 1.2 * S_, fy - 1.6 * S_); ctx.stroke();
    }
    /* the pumpkin */
    ctx.fillStyle = lin(ctx, 0, y0 - bh, 0, y0 + bh, [[0, shade(P.rind, 30)], [0.6, P.rind], [1, shade(P.rind, -40)]]);
    ell(ctx, 0, y0, bw, bh); ctx.fill(); outline(ctx, 0.7 * S_);
    /* deep ribs hugging the surface, meeting at stem and base */
    ctx.strokeStyle = rgba(shade(P.rind, -45), 0.75); ctx.lineWidth = Math.max(0.6, 0.7 * S_);
    for (let i = 0; i < P.ribs; i++) { const fr = (i / (P.ribs - 1)) * 2 - 1, px = fr * bw * 0.97; ctx.beginPath();
      for (let k = 0; k <= 14; k++) { const v = -1 + 2 * k / 14, xx = px * Math.sqrt(Math.max(0, 1 - v * v)), yy = y0 + v * bh; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    ctx.fillStyle = rgba('#ffffff', 0.16); ell(ctx, -bw * 0.35, y0 - bh * 0.4, bw * 0.28, bh * 0.22, -0.4); ctx.fill();
    if (P.cracks) { ctx.save(); ctx.shadowColor = '#c88aff'; ctx.shadowBlur = 6 * S_; ctx.strokeStyle = rgba('#c88aff', 0.6 + Math.sin(t * 3) * 0.3); ctx.lineWidth = 0.7 * S_;
      [[-0.5, -0.4, -0.2, 0.1, -0.4, 0.5], [0.3, -0.6, 0.5, -0.1, 0.2, 0.4]].forEach(c => { ctx.beginPath(); ctx.moveTo(c[0] * bw, y0 + c[1] * bh); ctx.lineTo(c[2] * bw, y0 + c[3] * bh); ctx.lineTo(c[4] * bw, y0 + c[5] * bh); ctx.stroke(); }); ctx.restore(); }
    /* a saddle blanket for a mount */
    if (o.saddle) { ctx.fillStyle = o.saddle; ctx.beginPath(); ctx.moveTo(-bw * 0.62, y0 - bh * 0.62); ctx.quadraticCurveTo(0, y0 - bh * 1.12, bw * 0.62, y0 - bh * 0.62); ctx.lineTo(bw * 0.5, y0 - bh * 0.05); ctx.quadraticCurveTo(0, y0 + bh * 0.08, -bw * 0.5, y0 - bh * 0.05); ctx.closePath(); ctx.fill(); outline(ctx, 0.6 * S_);
      ctx.strokeStyle = '#d9b87a'; ctx.lineWidth = 0.7 * S_; ctx.beginPath(); ctx.moveTo(-bw * 0.48, y0 - bh * 0.15); ctx.quadraticCurveTo(0, y0, bw * 0.48, y0 - bh * 0.15); ctx.stroke(); }
    /* the stem at the crown, and a leaf */
    ctx.strokeStyle = shade(P.vine, -40); ctx.lineWidth = P.stemW * S_; ctx.beginPath(); ctx.moveTo(0, crown + 1 * S_); ctx.quadraticCurveTo(0.6 * S_, crown - 2.5 * S_, 2.2 * S_, crown - 3.6 * S_); ctx.stroke();
    ctx.fillStyle = shade(P.vine, 10); ell(ctx, -2.4 * S_, crown - 1.6 * S_, 2.6 * S_, 1.2 * S_, 0.5); ctx.fill();
    /* grasping vine arms: up and out from the crown */
    for (let i = 0; i < P.arms; i++) {
      const sp = P.arms === 1 ? 0 : i / (P.arms - 1) - 0.5, lash = attack ? Math.max(0, Math.sin(t * 12 - i)) : 0;
      let ang = -Math.PI / 2 + sp * 1.6 + Math.sin(t * 2.3 + i * 1.7) * 0.2; if (attack) ang = -0.3 + sp * 0.5 - lash * 0.4;
      const reach = P.reach * S_ * (1 + lash * 0.5), ox = sp * bw * 0.18;
      const tx = ox + Math.cos(ang) * reach, ty = crown + Math.sin(ang) * reach, mx = ox + Math.cos(ang) * reach * 0.5 - Math.sin(ang) * 1.6 * S_, my = crown + Math.sin(ang) * reach * 0.5;
      ctx.strokeStyle = shade(P.vine, 8); ctx.lineWidth = P.armW * S_; ctx.beginPath(); ctx.moveTo(ox, crown); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
      ctx.beginPath(); ctx.arc(tx, ty, 1.2 * S_, ang, ang + Math.PI * 1.3); ctx.stroke();
      ctx.fillStyle = shade(P.vine, -10); ell(ctx, mx, my, 1.4 * S_, 0.7 * S_, ang); ctx.fill();
    }
    return { crown, y0, bh };
  }
  CREATURE.punk = function (ctx, S_, t, o) {
    const dom = o.tint === 2;
    if (!o.noShadow) shadow(ctx, 12 * S_, 3.5 * S_);
    return punkBody(ctx, S_, t, o, dom
      ? { w: 11, h: 8.5, lift: 5.5, ribs: 9, rind: '#d97c2b', vine: '#3f7d3a', legs: 4, legW: 2.4, arms: o.saddle ? 0 : 3, armW: 1.6, reach: 12, stemW: 2.2 }
      : { w: 8.5, h: 7.5, lift: 7, ribs: 7, rind: '#b8641f', vine: '#2e5c2a', legs: 4, legW: 1.7, arms: 2, armW: 1.3, reach: 12, stemW: 1.8 });
  };
  CREATURE.malsti = function (ctx, S_, t, o) {
    /* the smallest Punk, sprouted from a Duat Seedling: violet rind with glowing cracks */
    const up = o.tint === 1;
    if (!o.noShadow) shadow(ctx, 8 * S_, 2.6 * S_);
    const hop = Math.abs(Math.sin(t * 5)) * 1.6 * S_; ctx.translate(0, -hop);
    punkBody(ctx, S_, t, o, { w: 6.5, h: 5.5, lift: 5, ribs: 6, rind: up ? '#7a4aa5' : '#5a3a75', vine: '#2a1c36', legs: 4, legW: 1.4, arms: 2, armW: 1.1, reach: 8, stemW: 1.3, cracks: true });
    /* a little sack of stolen gold */
    ctx.fillStyle = '#8a6a3a'; ell(ctx, -8 * S_, -4 * S_, 2.4 * S_, 2.2 * S_); ctx.fill(); outline(ctx, 0.6 * S_); ctx.fillStyle = '#e8c25a'; ell(ctx, -8 * S_, -6.2 * S_, 1 * S_, 0.7 * S_); ctx.fill();
    if (up) { ctx.globalAlpha *= 0.45; ctx.strokeStyle = '#c9a8ff'; ctx.lineWidth = 1 * S_; ctx.beginPath(); ctx.arc(0, -11 * S_, 10 * S_ + Math.sin(t * 4) * S_, 0, TAU); ctx.stroke(); ctx.globalAlpha /= 0.45; }
  };
  CREATURE.velnur = function (ctx, S_, t, o) {
    /* one figure stands for the stack: a Velnurthalith of the Duskareth */
    const up = o.tint === 1, col = o.color || '#6a4ad0';
    A.person(ctx, 0, 0, 27 * S_, up ? 'keilia' : 'eikar', { color: col, look: up ? 44 : 5, weapon: up ? 'axe' : 'spear', t, armor: up, helm: up, swing: o.pose === 'attack' ? 0.9 : 0, noShadow: o.noShadow });
  };
  CREATURE.ver = function (ctx, S_, t, o) {
    /* the Ver, the Dark Screamers: hooded, throat-lit, screaming */
    const up = o.tint === 1;
    if (!o.noShadow) shadow(ctx, 8 * S_, 3 * S_);
    const sway = Math.sin(t * 2) * 0.8 * S_;
    ctx.fillStyle = lin(ctx, -8 * S_, -30 * S_, 8 * S_, 0, [[0, up ? '#3a2a5a' : '#2a2238'], [1, '#100c18']]);
    ctx.beginPath(); ctx.moveTo(-6 * S_ + sway, -28 * S_); ctx.quadraticCurveTo(-11 * S_, -12 * S_, -8 * S_, 0); ctx.lineTo(8 * S_, 0); ctx.quadraticCurveTo(10 * S_, -14 * S_, 6 * S_ + sway, -28 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 1 * S_);
    ctx.strokeStyle = rgba('#8e7cff', 0.35); ctx.lineWidth = 0.8 * S_; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo((-4 + i * 4) * S_, -22 * S_); ctx.lineTo((-5 + i * 4.5) * S_, -2 * S_); ctx.stroke(); }
    /* hood */
    ctx.fillStyle = up ? '#4a3870' : '#342a48'; ctx.beginPath(); ctx.moveTo(-6 * S_ + sway, -27 * S_); ctx.quadraticCurveTo(0 + sway, -40 * S_, 7 * S_ + sway, -27 * S_); ctx.quadraticCurveTo(0 + sway, -24 * S_, -6 * S_ + sway, -27 * S_); ctx.fill(); outline(ctx, 0.9 * S_);
    ctx.fillStyle = '#05030a'; ell(ctx, 1.5 * S_ + sway, -29 * S_, 3.6 * S_, 3.2 * S_); ctx.fill();
    const scream = o.pose === 'attack' ? 1 : 0.35 + Math.sin(t * 3) * 0.15;
    ctx.shadowColor = '#b9a8ff'; ctx.shadowBlur = 10 * S_; ctx.fillStyle = rgba('#d9ccff', 0.9); ell(ctx, 2.6 * S_ + sway, -28 * S_, 1.2 * S_, 1.4 * S_ * scream + 0.4 * S_); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#e6d8ff'; ell(ctx, 0.6 * S_ + sway, -30.4 * S_, 0.6 * S_, 0.5 * S_); ctx.fill(); ell(ctx, 3.4 * S_ + sway, -30.6 * S_, 0.6 * S_, 0.5 * S_); ctx.fill();
    if (o.pose === 'attack') { ctx.strokeStyle = rgba('#b9a8ff', 0.6); ctx.lineWidth = 1.2 * S_; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(6 * S_, -28 * S_, i * 4 * S_, -0.6, 0.6); ctx.stroke(); } }
    if (up) { ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = 1 * S_; ctx.beginPath(); ctx.arc(1 * S_ + sway, -35 * S_, 3 * S_, Math.PI, TAU); ctx.stroke(); }
  };
  CREATURE.harkal = function (ctx, S_, t, o) {
    /* the Su shark: swims through open air, low over the ground */
    const up = o.tint === 1; const body = up ? '#4e6e7f' : '#5d7e8f', belly = '#c9d6dc';
    const bob = Math.sin(t * 2.4) * 2 * S_;
    if (!o.noShadow) shadow(ctx, 18 * S_, 4 * S_);
    ctx.translate(0, -12 * S_ + bob);
    const sw = Math.sin(t * 5) * 0.12;
    /* tail */
    ctx.save(); ctx.translate(-20 * S_, 0); ctx.rotate(sw);
    ctx.fillStyle = shade(body, -15); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10 * S_, -10 * S_); ctx.quadraticCurveTo(-6 * S_, 0, -10 * S_, 9 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 1 * S_); ctx.restore();
    ctx.fillStyle = lin(ctx, 0, -9 * S_, 0, 8 * S_, [[0, shade(body, 20)], [0.6, body], [0.62, belly], [1, shade(belly, -20)]]);
    ctx.beginPath(); ctx.moveTo(-21 * S_, 0); ctx.quadraticCurveTo(-8 * S_, -10 * S_, 12 * S_, -6 * S_); ctx.quadraticCurveTo(24 * S_, -2 * S_, 25 * S_, 1 * S_); ctx.quadraticCurveTo(18 * S_, 7 * S_, 2 * S_, 7 * S_); ctx.quadraticCurveTo(-12 * S_, 6 * S_, -21 * S_, 0); ctx.closePath(); ctx.fill(); outline(ctx, 1.1 * S_);
    ctx.fillStyle = shade(body, -10); ctx.beginPath(); ctx.moveTo(-2 * S_, -8 * S_); ctx.quadraticCurveTo(0, -18 * S_, 6 * S_, -19 * S_); ctx.quadraticCurveTo(4 * S_, -12 * S_, 7 * S_, -7 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 1 * S_);
    ctx.beginPath(); ctx.moveTo(4 * S_, 5 * S_); ctx.quadraticCurveTo(0, 13 * S_, -5 * S_, 12 * S_); ctx.quadraticCurveTo(-2 * S_, 8 * S_, -2 * S_, 5 * S_); ctx.fill(); outline(ctx, 0.9 * S_);
    /* gills, scars */
    ctx.strokeStyle = rgba('#2a3a42', 0.7); ctx.lineWidth = 0.9 * S_; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo((10 - i * 2) * S_, -3 * S_); ctx.lineTo((9 - i * 2) * S_, 3 * S_); ctx.stroke(); }
    ctx.strokeStyle = rgba('#e8e0d4', up ? 0.8 : 0.45); ctx.lineWidth = 0.8 * S_; [[-8, -4, -3, -1], [-12, 0, -6, 2], [0, -5, 4, -3]].slice(0, up ? 3 : 1).forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a * S_, b * S_); ctx.lineTo(c * S_, d * S_); ctx.stroke(); });
    ctx.fillStyle = '#0a0d10'; ell(ctx, 17 * S_, -2 * S_, 1.3 * S_, 1.3 * S_); ctx.fill();
    const open = o.pose === 'attack' ? 3 * S_ : 1 * S_;
    ctx.fillStyle = '#3a1418'; ctx.beginPath(); ctx.moveTo(25 * S_, 1 * S_); ctx.quadraticCurveTo(18 * S_, 3 * S_ + open, 13 * S_, 3 * S_); ctx.quadraticCurveTo(18 * S_, 3 * S_ - 0.5, 25 * S_, 1 * S_); ctx.fill();
    ctx.fillStyle = '#f0ece0'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo((15 + i * 2) * S_, 2.6 * S_); ctx.lineTo((16 + i * 2) * S_, 4 * S_ + open * 0.4); ctx.lineTo((17 + i * 2) * S_, 2.4 * S_); ctx.fill(); }
  };
  CREATURE.kaloeik = function (ctx, S_, t, o) {
    /* Kalo'Eik who serve the Duskareth: tall moon-pale acorns in long robes, with a ward of Stygian */
    if (!o.noShadow) shadow(ctx, 10 * S_, 3 * S_);
    const glow = 0.5 + Math.sin(t * 2) * 0.2;
    ctx.fillStyle = lin(ctx, -10 * S_, -26 * S_, 10 * S_, 0, [[0, '#4a5288'], [1, '#1e2244']]);
    ctx.beginPath(); ctx.moveTo(-7 * S_, -20 * S_); ctx.quadraticCurveTo(-12 * S_, -8 * S_, -10 * S_, 0); ctx.lineTo(10 * S_, 0); ctx.quadraticCurveTo(12 * S_, -8 * S_, 7 * S_, -20 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.9 * S_);
    ctx.fillStyle = '#c9a24e'; for (let i = 0; i < 3; i++) { ell(ctx, 0, (-15 + i * 5) * S_, 0.9 * S_, 0.9 * S_); ctx.fill(); }
    ctx.strokeStyle = '#8a8fb0'; ctx.lineWidth = 1.6 * S_; ctx.beginPath(); ctx.moveTo(11 * S_, 0); ctx.lineTo(11 * S_, -40 * S_); ctx.stroke();
    ctx.save(); ctx.shadowColor = '#bcd0ff'; ctx.shadowBlur = 12 * S_ * glow; ctx.strokeStyle = rgba('#e8eeff', 0.9); ctx.lineWidth = 1.5 * S_; ctx.beginPath(); ctx.arc(11 * S_, -42 * S_, 4 * S_, Math.PI * 0.6, Math.PI * 2.4); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(0, -16 * S_); A.person(ctx, 0, 0, 28 * S_, 'kaloeik', { look: 11, weapon: 'none', t, noShadow: true, seated: true, color: '#3a3f68' }); ctx.restore();
  };
  CREATURE.ularnaga = function (ctx, S_, t, o) {
    /* the Ular Naga: a many-headed serpent of the earth on four heavy legs, armoured in scale, with a spiked club tail */
    if (!o.noShadow) shadow(ctx, 20 * S_, 5 * S_);
    const c1 = '#57713d', c2 = '#3c4f2a', belly = '#a8a868';
    const sw = Math.sin(t * 2) * 0.12;
    /* club tail */
    ctx.save(); ctx.translate(-16 * S_, -10 * S_); ctx.rotate(-0.3 + sw);
    ctx.strokeStyle = c2; ctx.lineWidth = 5 * S_; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-8 * S_, -2 * S_, -15 * S_, -7 * S_); ctx.stroke();
    ctx.fillStyle = radial(ctx, -16 * S_, -8 * S_, 5 * S_, '#8a9a6a', c2); ell(ctx, -16 * S_, -8 * S_, 4.4 * S_, 3.8 * S_); ctx.fill(); outline(ctx, 0.8 * S_);
    ctx.fillStyle = '#d8d0b8'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ctx.beginPath(); ctx.moveTo(-16 * S_ + Math.cos(a) * 3.6 * S_, -8 * S_ + Math.sin(a) * 3.2 * S_); ctx.lineTo(-16 * S_ + Math.cos(a) * 7 * S_, -8 * S_ + Math.sin(a) * 6 * S_); ctx.lineTo(-16 * S_ + Math.cos(a + 0.4) * 3.6 * S_, -8 * S_ + Math.sin(a + 0.4) * 3.2 * S_); ctx.fill(); }
    ctx.restore();
    /* four heavy legs */
    [[-11, 0.6], [-4, -0.6], [5, 0.6], [12, -0.6]].forEach(([lx, ph], i) => { const st = Math.sin(t * 3 + ph * 3) * 1.2 * S_; ctx.fillStyle = i % 2 ? shade(c2, -20) : c2;
      ctx.beginPath(); ctx.moveTo(lx * S_ - 3 * S_, -10 * S_); ctx.quadraticCurveTo(lx * S_ - 4 * S_ + st, -4 * S_, lx * S_ - 3.2 * S_ + st, 0); ctx.quadraticCurveTo(lx * S_ + st, 1 * S_, lx * S_ + 3.4 * S_ + st, 0); ctx.quadraticCurveTo(lx * S_ + 3 * S_, -5 * S_, lx * S_ + 3 * S_, -10 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.6 * S_);
      ctx.fillStyle = '#d8d0b8'; for (let c = -1; c <= 1; c++) { ell(ctx, lx * S_ + st + c * 1.6 * S_ + 0.6 * S_, -0.2 * S_, 0.6 * S_, 0.9 * S_); ctx.fill(); } });
    /* the body */
    ctx.fillStyle = lin(ctx, 0, -20 * S_, 0, -4 * S_, [[0, shade(c1, 20)], [0.7, c1], [0.72, belly], [1, shade(belly, -25)]]);
    ell(ctx, 0, -12 * S_, 18 * S_, 8 * S_); ctx.fill(); outline(ctx, 0.9 * S_);
    ctx.save(); ell(ctx, 0, -12 * S_, 18 * S_, 8 * S_); ctx.clip();
    for (let r = 0; r < 4; r++) for (let c = -6; c <= 6; c++) { ctx.strokeStyle = rgba('#1e2a14', 0.35); ctx.lineWidth = 0.6 * S_; ctx.beginPath(); ctx.arc(c * 3 * S_ + (r % 2) * 1.5 * S_, -19 * S_ + r * 3 * S_, 1.8 * S_, 0.2, Math.PI - 0.2); ctx.stroke(); }
    ctx.restore();
    /* a ridge of plates */
    ctx.fillStyle = '#8a9a6a'; for (let i = -4; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 3.6 * S_ - 1.6 * S_, -19.4 * S_); ctx.lineTo(i * 3.6 * S_, -23.5 * S_); ctx.lineTo(i * 3.6 * S_ + 1.6 * S_, -19.4 * S_); ctx.fill(); }
    /* the heads, each on its own neck */
    [[12, -40, 1.5, 0], [4, -33, 1.25, 1.7], [20, -29, 1.2, 3.1]].forEach(([hx, hy, k, ph]) => {
      const nx = hx * S_ + Math.sin(t * 1.7 + ph) * 1.5 * S_, ny = hy * S_ + Math.cos(t * 1.5 + ph) * 1 * S_;
      ctx.strokeStyle = c1; ctx.lineWidth = 4.4 * S_ * k; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(8 * S_, -15 * S_); ctx.quadraticCurveTo(nx - 6 * S_, (ny - 15 * S_) / 2, nx, ny); ctx.stroke();
      ctx.strokeStyle = rgba('#1e2a14', 0.35); ctx.lineWidth = 0.7 * S_; ctx.stroke();
      ctx.fillStyle = radial(ctx, nx + 1 * S_, ny - 1 * S_, 5 * S_ * k, '#7a9a54', c2);
      ctx.beginPath(); ctx.moveTo(nx - 3 * S_ * k, ny - 2.6 * S_ * k); ctx.quadraticCurveTo(nx + 3 * S_ * k, ny - 4 * S_ * k, nx + 7 * S_ * k, ny - 0.5 * S_ * k); ctx.quadraticCurveTo(nx + 3 * S_ * k, ny + 3.2 * S_ * k, nx - 3 * S_ * k, ny + 2.4 * S_ * k); ctx.closePath(); ctx.fill(); outline(ctx, 0.7 * S_);
      ctx.fillStyle = '#ffd86a'; ell(ctx, nx + 2.2 * S_ * k, ny - 1.4 * S_ * k, 0.9 * S_ * k, 0.7 * S_ * k); ctx.fill();
      ctx.fillStyle = '#d8d0b8'; ctx.beginPath(); ctx.moveTo(nx - 1 * S_ * k, ny - 2.6 * S_ * k); ctx.lineTo(nx - 3.4 * S_ * k, ny - 6 * S_ * k); ctx.lineTo(nx + 0.6 * S_ * k, ny - 3 * S_ * k); ctx.fill();
      if (o.pose === 'attack') { ctx.fillStyle = '#3a1418'; ctx.beginPath(); ctx.moveTo(nx + 7 * S_ * k, ny - 0.5 * S_ * k); ctx.lineTo(nx + 1 * S_ * k, ny + 0.6 * S_ * k); ctx.lineTo(nx + 6 * S_ * k, ny + 2.4 * S_ * k); ctx.fill(); }
    });
  };
  CREATURE.tyndael = function (ctx, S_, t, o) {
    /* a living flame: round body, wide many-coloured wings, a crown of fire; it never lands */
    const hov = Math.sin(t * 3) * 3 * S_;
    if (!o.noShadow) { ctx.fillStyle = 'rgba(255,120,30,0.18)'; ell(ctx, 0, 0, 12 * S_, 4 * S_); ctx.fill(); }
    ctx.translate(0, -24 * S_ + hov);
    const flap = Math.sin(t * 7) * 0.35;
    [-1, 1].forEach(side => { ctx.save(); ctx.scale(side, 1); ctx.rotate(flap * side * -1);
      const g = lin(ctx, 0, 0, 24 * S_, -6 * S_, [[0, '#ffd24a'], [0.35, '#ff7a1a'], [0.7, '#e0305a'], [1, '#7a3ad0']]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(3 * S_, -2 * S_); ctx.quadraticCurveTo(14 * S_, -20 * S_, 26 * S_, -14 * S_); ctx.quadraticCurveTo(20 * S_, -8 * S_, 24 * S_, -2 * S_); ctx.quadraticCurveTo(16 * S_, 0, 20 * S_, 6 * S_); ctx.quadraticCurveTo(10 * S_, 4 * S_, 3 * S_, 3 * S_); ctx.closePath();
      ctx.globalAlpha *= 0.92; ctx.fill(); ctx.globalAlpha /= 0.92; outline(ctx, 0.9 * S_); ctx.restore(); });
    ctx.shadowColor = '#ff9a3a'; ctx.shadowBlur = 16 * S_;
    ctx.fillStyle = radial(ctx, 0, 0, 9 * S_, '#fff2b0', '#ff6a10'); ell(ctx, 0, 0, 8 * S_, 8 * S_); ctx.fill();
    ctx.shadowBlur = 0;
    /* crown of fire */
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.42, fl = (8 + Math.sin(t * 9 + i) * 2.5) * S_;
      ctx.fillStyle = i % 2 ? '#ffd24a' : '#ff8a2a'; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.2) * 6 * S_, Math.sin(a - 0.2) * 6 * S_ - 2 * S_); ctx.quadraticCurveTo(Math.cos(a) * (6 * S_ + fl), Math.sin(a) * (6 * S_ + fl) - 4 * S_, Math.cos(a + 0.2) * 6 * S_, Math.sin(a + 0.2) * 6 * S_ - 2 * S_); ctx.fill(); }
    ctx.fillStyle = '#3a1004'; ell(ctx, 3 * S_, -1 * S_, 1.2 * S_, 1.5 * S_); ctx.fill(); ell(ctx, 6 * S_, -1.2 * S_, 1 * S_, 1.3 * S_); ctx.fill();
    /* trailing flame for legs */
    ctx.fillStyle = rgba('#ff7a1a', 0.7); ctx.beginPath(); ctx.moveTo(-3 * S_, 6 * S_); ctx.quadraticCurveTo(0, 16 * S_ + Math.sin(t * 8) * 2 * S_, 3 * S_, 6 * S_); ctx.fill();
  };
  CREATURE.xiweik = function (ctx, S_, t, o) {
    /* child of the Xiw and the Eikar: an acorn with devil wings and horns */
    const hov = Math.sin(t * 3.4) * 2.5 * S_;
    if (!o.noShadow) shadow(ctx, 9 * S_, 3 * S_);
    ctx.translate(0, -20 * S_ + hov);
    const flap = Math.sin(t * 8) * 0.4;
    [-1, 1].forEach(side => { ctx.save(); ctx.scale(side, 1); ctx.rotate(-flap * side);
      ctx.fillStyle = lin(ctx, 0, -10 * S_, 20 * S_, 0, [[0, '#5a1420'], [1, '#2a0810']]);
      ctx.beginPath(); ctx.moveTo(3 * S_, -4 * S_); ctx.lineTo(18 * S_, -16 * S_); ctx.lineTo(16 * S_, -8 * S_); ctx.lineTo(21 * S_, -6 * S_); ctx.lineTo(15 * S_, -1 * S_); ctx.lineTo(18 * S_, 3 * S_); ctx.lineTo(4 * S_, 2 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.9 * S_);
      ctx.strokeStyle = rgba('#ff5a6a', 0.35); ctx.lineWidth = 0.7 * S_; ctx.beginPath(); ctx.moveTo(4 * S_, -2 * S_); ctx.lineTo(16 * S_, -8 * S_); ctx.moveTo(4 * S_, 0); ctx.lineTo(15 * S_, -1 * S_); ctx.stroke(); ctx.restore(); });
    /* the acorn body */
    const nut = '#9a5a2a';
    ctx.fillStyle = radial(ctx, 0, 2 * S_, 8 * S_, shade(nut, 30), shade(nut, -35));
    ctx.beginPath(); ctx.moveTo(-6.5 * S_, -2 * S_); ctx.quadraticCurveTo(-7 * S_, 8 * S_, 0, 10 * S_); ctx.quadraticCurveTo(7 * S_, 8 * S_, 6.5 * S_, -2 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 1 * S_);
    ctx.fillStyle = radial(ctx, 0, -4 * S_, 8 * S_, '#5a2a1a', '#2a100a'); ctx.beginPath(); ctx.ellipse(0, -2 * S_, 8 * S_, 5.6 * S_, 0, Math.PI, TAU); ctx.fill(); outline(ctx, 1 * S_);
    /* horns */
    ctx.fillStyle = lin(ctx, 0, -12 * S_, 0, -4 * S_, [[0, '#f0e0c0'], [1, '#6a4a3a']]);
    [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(sd * 3 * S_, -6 * S_); ctx.quadraticCurveTo(sd * 6 * S_, -10 * S_, sd * 5 * S_, -15 * S_); ctx.quadraticCurveTo(sd * 4 * S_, -10 * S_, sd * 1 * S_, -6.5 * S_); ctx.fill(); });
    ctx.shadowColor = '#ff3a2a'; ctx.shadowBlur = 6 * S_; ctx.fillStyle = '#ffb04a'; ell(ctx, 2 * S_, 2 * S_, 1.1 * S_, 0.9 * S_); ctx.fill(); ell(ctx, 4.6 * S_, 1.8 * S_, 1 * S_, 0.8 * S_); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#2a0a06'; ctx.lineWidth = 0.8 * S_; ctx.beginPath(); ctx.moveTo(1 * S_, 5 * S_); ctx.quadraticCurveTo(3 * S_, 6.5 * S_, 5 * S_, 4.6 * S_); ctx.stroke();
    /* tail */
    ctx.strokeStyle = '#3a0e0a'; ctx.lineWidth = 1.2 * S_; ctx.beginPath(); ctx.moveTo(-5 * S_, 7 * S_); ctx.quadraticCurveTo(-12 * S_, 10 * S_ + Math.sin(t * 4) * 2 * S_, -13 * S_, 4 * S_); ctx.stroke();
    ctx.fillStyle = '#3a0e0a'; ctx.beginPath(); ctx.moveTo(-13 * S_, 4 * S_); ctx.lineTo(-15 * S_, 2 * S_); ctx.lineTo(-11 * S_, 2.5 * S_); ctx.fill();
    if (o.pose === 'chaos') { ctx.strokeStyle = rgba('#ff5a6a', 0.7); ctx.lineWidth = 1 * S_; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, (12 + i * 5) * S_, t * 3 + i, t * 3 + i + 1.4); ctx.stroke(); } }
  };
  CREATURE.lutut = function (ctx, S_, t, o) {
    /* vast flying predator patterned like carved stone, jaws for meat */
    const hov = Math.sin(t * 1.8) * 4 * S_;
    if (!o.noShadow) { contact(ctx, 0, 0, 24 * S_, 6 * S_, 0.38); }
    ctx.translate(0, -34 * S_ + hov);
    const flap = Math.sin(t * 3.2) * 0.4;
    const stone = '#6d6a80', dark = '#44415c';
    [-1, 1].forEach(side => { ctx.save(); ctx.scale(side === 1 ? 1 : -0.85, 1); ctx.rotate(-flap);
      ctx.fillStyle = lin(ctx, 0, -20 * S_, 40 * S_, 10 * S_, [[0, shade(stone, 15)], [1, dark]]);
      ctx.beginPath(); ctx.moveTo(-2 * S_, -4 * S_); ctx.quadraticCurveTo(14 * S_, -30 * S_, 42 * S_, -26 * S_); ctx.lineTo(36 * S_, -18 * S_); ctx.lineTo(40 * S_, -12 * S_); ctx.lineTo(32 * S_, -8 * S_); ctx.lineTo(34 * S_, -2 * S_); ctx.lineTo(22 * S_, 0); ctx.quadraticCurveTo(10 * S_, 4 * S_, -2 * S_, 4 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 1.2 * S_);
      ctx.strokeStyle = rgba('#2a283a', 0.6); ctx.lineWidth = 0.9 * S_; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(4 * S_, 0); ctx.lineTo((20 + i * 6) * S_, (-20 + i * 5) * S_); ctx.stroke(); }
      ctx.restore(); });
    /* body */
    ctx.fillStyle = lin(ctx, 0, -12 * S_, 0, 12 * S_, [[0, shade(stone, 20)], [1, dark]]);
    ctx.beginPath(); ctx.moveTo(-26 * S_, 2 * S_); ctx.quadraticCurveTo(-10 * S_, -12 * S_, 10 * S_, -9 * S_); ctx.quadraticCurveTo(22 * S_, -7 * S_, 24 * S_, 0); ctx.quadraticCurveTo(14 * S_, 10 * S_, -4 * S_, 9 * S_); ctx.quadraticCurveTo(-18 * S_, 8 * S_, -26 * S_, 2 * S_); ctx.fill(); outline(ctx, 1.2 * S_);
    /* carved-stone patterns */
    ctx.strokeStyle = rgba('#c9c4e0', 0.4); ctx.lineWidth = 0.8 * S_;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo((-16 + i * 8) * S_, -4 * S_); ctx.lineTo((-12 + i * 8) * S_, 2 * S_); ctx.lineTo((-16 + i * 8) * S_, 7 * S_); ctx.stroke(); }
    /* head and the big jaw */
    ctx.fillStyle = radial(ctx, 26 * S_, -4 * S_, 10 * S_, shade(stone, 25), dark);
    ctx.beginPath(); ctx.moveTo(18 * S_, -8 * S_); ctx.quadraticCurveTo(30 * S_, -14 * S_, 38 * S_, -6 * S_); ctx.lineTo(34 * S_, -2 * S_); ctx.lineTo(20 * S_, 2 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 1.1 * S_);
    const jaw = o.pose === 'attack' ? 0.5 : 0.12 + Math.sin(t * 1.5) * 0.05;
    ctx.save(); ctx.translate(20 * S_, 1 * S_); ctx.rotate(jaw);
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(17 * S_, -2 * S_); ctx.lineTo(14 * S_, 5 * S_); ctx.quadraticCurveTo(6 * S_, 6 * S_, 0, 4 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 1 * S_);
    ctx.fillStyle = '#ece6d4'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo((3 + i * 3) * S_, -0.6 * S_); ctx.lineTo((4 + i * 3) * S_, -3 * S_); ctx.lineTo((5 + i * 3) * S_, -0.8 * S_); ctx.fill(); }
    ctx.restore();
    ctx.shadowColor = '#ffcc55'; ctx.shadowBlur = 6 * S_; ctx.fillStyle = '#ffd86a'; ell(ctx, 29 * S_, -8 * S_, 1.6 * S_, 1.2 * S_); ctx.fill(); ctx.shadowBlur = 0;
    /* tail */
    ctx.strokeStyle = dark; ctx.lineWidth = 3 * S_; ctx.beginPath(); ctx.moveTo(-24 * S_, 3 * S_); ctx.quadraticCurveTo(-36 * S_, 6 * S_ + Math.sin(t * 2) * 3 * S_, -42 * S_, -2 * S_); ctx.stroke();
    /* talons */
    ctx.strokeStyle = '#2a2830'; ctx.lineWidth = 2 * S_; [[-4, 1], [4, 0]].forEach(([lx]) => { ctx.beginPath(); ctx.moveTo(lx * S_, 8 * S_); ctx.lineTo(lx * S_ + 2 * S_, 15 * S_); ctx.stroke(); });
  };
  CREATURE.nekh = function (ctx, S_, t, o) {
    /* the great worm of the Duat, rearing out of the ground: segmented, su-blue seams, a round many-toothed maw */
    const col = '#3a4a63', col2 = '#1f2b40', ridge = '#4fb4e8';
    /* o.flat: lying long across the field, head raised (battle); o.stretch: how long */
    const st_ = o.stretch || 1, flat = !!o.flat;
    const rise = (o.pose === 'attack' ? 1.1 : 1) * (flat ? 0.42 : 1), N = flat ? 30 : 18;
    ctx.fillStyle = rgba('#2a2018', 0.55); ell(ctx, (-6 - (st_ - 1) * 12) * S_, 0, (30 + (st_ - 1) * 13) * S_, 7 * S_); ctx.fill();
    const pts = [];
    for (let i = 0; i <= N; i++) { const u = i / N; const px = SU.lerp(-26 * st_, 14, u) * S_ + Math.sin(u * 6 * st_ - t * 2) * 2.5 * S_;
      const lift = flat ? Math.pow(u, 3) : 0.5 * (1 - Math.cos(u * Math.PI));
      const h = 62 * S_ * rise * lift + (flat ? 8 * S_ * (1 - lift) : 0); const w = 11 * S_ * (0.45 + 0.55 * Math.sin(Math.min(u, 0.92) * Math.PI)); pts.push({ x: px, y: -h, w }); }
    for (let i = 0; i <= N; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)]; const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; pts[i].nx = -dy / l; pts[i].ny = dx / l; }
    ctx.fillStyle = lin(ctx, -20 * S_, -60 * S_, 20 * S_, 0, [[0, shade(col, 30)], [0.6, col], [1, shade(col, -35)]]);
    ctx.beginPath(); ctx.moveTo(pts[0].x + pts[0].nx * pts[0].w, pts[0].y + pts[0].ny * pts[0].w);
    for (let i = 1; i <= N; i++) ctx.lineTo(pts[i].x + pts[i].nx * pts[i].w, pts[i].y + pts[i].ny * pts[i].w);
    for (let i = N; i >= 0; i--) ctx.lineTo(pts[i].x - pts[i].nx * pts[i].w, pts[i].y - pts[i].ny * pts[i].w);
    ctx.closePath(); ctx.fill(); outline(ctx, 1.3 * S_);
    for (let i = 1; i < N; i++) { const p = pts[i]; ctx.strokeStyle = rgba(col2, 0.55); ctx.lineWidth = 1.2 * S_; ctx.beginPath(); ctx.moveTo(p.x + p.nx * p.w, p.y + p.ny * p.w); ctx.lineTo(p.x - p.nx * p.w, p.y - p.ny * p.w); ctx.stroke();
      if (i % 3 === 0) { ctx.strokeStyle = rgba(ridge, 0.55 + Math.sin(t * 3 + i) * 0.2); ctx.shadowColor = ridge; ctx.shadowBlur = 8 * S_; ctx.lineWidth = 1.5 * S_; ctx.beginPath(); ctx.moveTo(p.x + p.nx * p.w * 0.9, p.y + p.ny * p.w * 0.9); ctx.lineTo(p.x - p.nx * p.w * 0.9, p.y - p.ny * p.w * 0.9); ctx.stroke(); ctx.shadowBlur = 0; } }
    const H = pts[N], Hp = pts[N - 1], ha = Math.atan2(H.y - Hp.y, H.x - Hp.x);
    ctx.save(); ctx.translate(H.x, H.y); ctx.rotate(ha);
    const R_ = H.w * 1.45;
    ctx.fillStyle = shade(col, -14); ell(ctx, R_ * 0.15, 0, R_ * 0.7, R_); ctx.fill();
    ctx.strokeStyle = rgba(ridge, 0.7); ctx.shadowColor = ridge; ctx.shadowBlur = 10 * S_; ctx.lineWidth = 1.8 * S_; ell(ctx, R_ * 0.15, 0, R_ * 0.7, R_); ctx.stroke(); ctx.shadowBlur = 0;
    ['#243247', '#1a2434', '#0d1420', '#03060b'].forEach((c, k) => { const f = 1 - k * 0.22; ctx.fillStyle = c; ell(ctx, R_ * 0.15, 0, R_ * 0.7 * f, R_ * f); ctx.fill(); });
    ctx.fillStyle = '#e0dacb'; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; const x0 = R_ * 0.15 + Math.cos(a) * R_ * 0.62, y0 = Math.sin(a) * R_ * 0.9; const x1 = R_ * 0.15 + Math.cos(a) * R_ * 0.4, y1 = Math.sin(a) * R_ * 0.6;
      ctx.beginPath(); ctx.moveTo(x0 + Math.sin(a) * 1.4 * S_, y0 - Math.cos(a) * 1.4 * S_); ctx.lineTo(x1, y1); ctx.lineTo(x0 - Math.sin(a) * 1.4 * S_, y0 + Math.cos(a) * 1.4 * S_); ctx.fill(); }
    ctx.restore();
  };
  CREATURE.uff = function (ctx, S_, t, o) {
    if (!o.noShadow) shadow(ctx, 6 * S_, 2 * S_);
    const sw = Math.sin(t * 2.5) * 0.15;
    ctx.strokeStyle = '#6a8a3a'; ctx.lineWidth = 1.6 * S_; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2 * S_, 0); ctx.quadraticCurveTo(-3 * S_, -8 * S_, 0, -14 * S_); ctx.moveTo(2 * S_, 0); ctx.quadraticCurveTo(3 * S_, -8 * S_, 0, -14 * S_); ctx.stroke();
    ctx.fillStyle = radial(ctx, 0, -16 * S_, 5 * S_, '#c8d87a', '#7a8a3a'); ell(ctx, 0, -16 * S_, 4 * S_, 4.5 * S_); ctx.fill(); outline(ctx, 0.8 * S_);
    ctx.save(); ctx.translate(0, -19 * S_); ctx.rotate(sw);
    ctx.strokeStyle = '#8a9a4a'; ctx.lineWidth = 2 * S_; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4 * S_, -8 * S_, 9 * S_, -10 * S_); ctx.stroke();
    ctx.fillStyle = lin(ctx, 6 * S_, -14 * S_, 14 * S_, -8 * S_, [[0, '#b5c46a'], [0.5, '#8a4a2e'], [1, '#b5c46a']]); ell(ctx, 11 * S_, -11 * S_, 4.4 * S_, 3.4 * S_, 0.3); ctx.fill(); outline(ctx, 0.8 * S_);
    ctx.strokeStyle = '#6a3018'; ctx.lineWidth = 0.9 * S_; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(11 * S_ + i * 2 * S_, -14 * S_); ctx.lineTo(11 * S_ + i * 2 * S_, -8 * S_); ctx.stroke(); }
    ctx.fillStyle = '#1a1008'; ell(ctx, 13.4 * S_, -11.6 * S_, 0.8 * S_, 0.8 * S_); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#5a7a2a'; ctx.lineWidth = 1.3 * S_; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(sd * 3 * S_, -16 * S_); ctx.lineTo(sd * 8 * S_, -18 * S_ + Math.sin(t * 6 + sd) * 2 * S_); ctx.stroke(); ctx.fillStyle = '#9ab45a'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(sd * (5 + k) * S_, -17.5 * S_); ctx.lineTo(sd * (5.6 + k) * S_, -20 * S_); ctx.lineTo(sd * (6.2 + k) * S_, -17.4 * S_); ctx.fill(); } });
  };
  CREATURE.kuni = function (ctx, S_, t, o) {
    const hov = Math.sin(t * 2.6) * 2 * S_;
    if (!o.noShadow) shadow(ctx, 12 * S_, 3 * S_);
    ctx.translate(0, -18 * S_ + hov);
    const flap = Math.sin(t * 6) * 0.5;
    const b = '#8a6d3b', l = '#d9c27a';
    [-1, 1].forEach(side => { ctx.save(); ctx.scale(side, 1); ctx.rotate(-flap * side);
      ctx.fillStyle = lin(ctx, 0, 0, 26 * S_, -10 * S_, [[0, b], [1, shade(b, -40)]]);
      ctx.beginPath(); ctx.moveTo(2 * S_, -3 * S_); ctx.quadraticCurveTo(14 * S_, -18 * S_, 28 * S_, -14 * S_); ctx.lineTo(24 * S_, -9 * S_); ctx.lineTo(26 * S_, -5 * S_); ctx.lineTo(20 * S_, -3 * S_); ctx.lineTo(21 * S_, 1 * S_); ctx.quadraticCurveTo(10 * S_, 3 * S_, 2 * S_, 3 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.9 * S_);
      ctx.strokeStyle = rgba(l, 0.5); ctx.lineWidth = 0.7 * S_; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo((8 + i * 4) * S_, -6 * S_); ctx.lineTo((12 + i * 4) * S_, (-12 + i) * S_); ctx.stroke(); } ctx.restore(); });
    ctx.fillStyle = radial(ctx, 0, 0, 10 * S_, l, b); ell(ctx, 0, 0, 9 * S_, 6.5 * S_); ctx.fill(); outline(ctx, 1 * S_);
    ctx.fillStyle = radial(ctx, 9 * S_, -5 * S_, 5 * S_, shade(l, 20), b); ell(ctx, 9 * S_, -5 * S_, 4.6 * S_, 4 * S_); ctx.fill(); outline(ctx, 0.9 * S_);
    ctx.fillStyle = '#e8c25a'; ctx.beginPath(); ctx.moveTo(12.5 * S_, -6 * S_); ctx.quadraticCurveTo(18 * S_, -5 * S_, 16 * S_, -1 * S_); ctx.lineTo(12.5 * S_, -3.5 * S_); ctx.fill(); outline(ctx, 0.7 * S_);
    ctx.fillStyle = '#1a1008'; ell(ctx, 10.4 * S_, -6.4 * S_, 0.9 * S_, 0.9 * S_); ctx.fill();
    ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 1.4 * S_; [-3, 3].forEach(lx => { ctx.beginPath(); ctx.moveTo(lx * S_, 5 * S_); ctx.lineTo(lx * S_ + 1, 10 * S_); ctx.stroke(); });
  };
  CREATURE.naga = function (ctx, S_, t, o) {
    /* the Su Naga: a great calm serpent, the first head near-invincible, lit from within */
    if (!o.noShadow) shadow(ctx, 20 * S_, 5 * S_);
    const c1 = '#2f7f8a', c2 = '#1a4a52';
    ctx.fillStyle = lin(ctx, -24 * S_, 0, 24 * S_, 0, [[0, c2], [0.5, c1], [1, c2]]);
    ctx.beginPath(); ctx.ellipse(-4 * S_, -5 * S_, 22 * S_, 6 * S_, 0, 0, TAU); ctx.fill(); outline(ctx, 1.1 * S_);
    [[6, -36, 1], [-6, -30, 0.8], [16, -28, 0.75]].forEach(([hx, hy, k], i) => {
      const sw = Math.sin(t * 1.6 + i) * 2 * S_;
      ctx.strokeStyle = i ? c2 : c1; ctx.lineWidth = 6 * S_ * k; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx * 0.4 * S_, -8 * S_); ctx.quadraticCurveTo((hx - 6) * S_ + sw, (hy * 0.5) * S_, hx * S_ + sw, hy * S_); ctx.stroke();
      ctx.fillStyle = radial(ctx, hx * S_ + sw, hy * S_, 6 * S_ * k, '#5fd3c6', c2); ell(ctx, hx * S_ + sw + 2 * S_ * k, hy * S_, 6 * S_ * k, 4 * S_ * k); ctx.fill(); outline(ctx, 0.9 * S_);
      ctx.shadowColor = '#9ff0ff'; ctx.shadowBlur = 8 * S_; ctx.fillStyle = '#e0ffff'; ell(ctx, hx * S_ + sw + 4 * S_ * k, hy * S_ - 1 * S_, 1 * S_, 0.8 * S_); ctx.fill(); ctx.shadowBlur = 0;
    });
    ctx.strokeStyle = rgba('#9ff0ff', 0.35); ctx.lineWidth = 0.8 * S_; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc((-20 + i * 7) * S_, -5 * S_, 3 * S_, Math.PI, TAU); ctx.stroke(); }
  };
  CREATURE.mcfly = function (ctx, S_, t, o) {
    const hov = Math.sin(t * 5) * 2 * S_;
    ctx.translate(0, -16 * S_ + hov);
    ctx.shadowColor = '#c9ffb0'; ctx.shadowBlur = 12 * S_;
    const flap = Math.sin(t * 14) * 0.5;
    [-1, 1].forEach(sd => { ctx.save(); ctx.scale(sd, 1); ctx.rotate(-flap); ctx.fillStyle = rgba('#e8fff0', 0.6); ell(ctx, 6 * S_, -3 * S_, 6 * S_, 3 * S_, -0.4); ctx.fill(); ctx.restore(); });
    ctx.fillStyle = radial(ctx, 0, 0, 5 * S_, '#f4ffb0', '#7ad06a'); ell(ctx, 0, 0, 4.5 * S_, 3.6 * S_); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#1a2a10'; ell(ctx, 2 * S_, -0.8 * S_, 0.7 * S_, 0.7 * S_); ctx.fill();
  };


  /* ======================= the Elsha'ryn ======================= */
  /* SPRENGJU — little flying carrots, glowing, a leafy top, a trail of sparks. A few stand for the stack. */
  CREATURE.sprengju = function (ctx, S_, t, o) {
    const up = o.tint === 1;
    [[0, 0, 1], [-7, 4, 0.8], [6, 6, 0.75]].forEach(([dx, dy, k], i) => {
      const bob = Math.sin(t * 6 + i * 2) * 2 * S_, x = dx * S_, y = (-16 + dy) * S_ + bob, s = S_ * k;
      if (!o.noShadow && i === 0) { contact(ctx, 0, 0, 8 * S_, 2.4 * S_, 0.3); }
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.5 + Math.sin(t * 4 + i) * 0.15 + (o.pose === 'attack' ? 0.6 : 0));
      /* sparks behind */
      for (let k2 = 0; k2 < 3; k2++) { ctx.fillStyle = rgba(up ? '#fff0a0' : '#ffd24a', 0.7 - k2 * 0.2); ell(ctx, -9 * s - k2 * 3 * s, Math.sin(t * 9 + k2 + i) * 1.4 * s, 1.2 * s, 1 * s); ctx.fill(); }
      ctx.shadowColor = up ? '#fff0a0' : '#ffb43a'; ctx.shadowBlur = 8 * s;
      ctx.fillStyle = lin(ctx, -6 * s, -2 * s, 7 * s, 2 * s, [[0, up ? '#ffb050' : '#ff8c3a'], [1, up ? '#ffe0a0' : '#ffc070']]);
      ctx.beginPath(); ctx.moveTo(-5 * s, -2.6 * s); ctx.quadraticCurveTo(2 * s, -2.4 * s, 8 * s, 0); ctx.quadraticCurveTo(2 * s, 2.4 * s, -5 * s, 2.6 * s); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; outline(ctx, 0.5 * s);
      ctx.strokeStyle = rgba('#a04a10', 0.6); ctx.lineWidth = 0.5 * s; for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.moveTo((-2 + r * 3) * s, -2 * s); ctx.lineTo((-1.4 + r * 3) * s, 2 * s); ctx.stroke(); }
      ctx.fillStyle = '#5aa04a'; [-0.6, 0, 0.6].forEach(a => { ctx.save(); ctx.translate(-5 * s, 0); ctx.rotate(Math.PI + a); ell(ctx, 3 * s, 0, 3 * s, 0.9 * s); ctx.fill(); ctx.restore(); });
      ctx.restore();
    });
  };
  /* SPEAR EIKAR — an Eikar of the forest with a long spear (Grovewarden Spears wear bark plates) */
  CREATURE.speareikar = function (ctx, S_, t, o) {
    const up = o.tint === 1;
    A.person(ctx, 0, 0, 27 * S_, 'eikar', { color: o.color || '#3f7d3a', look: up ? 61 : 23, weapon: 'spear', t, armor: up, helm: false, swing: o.pose === 'attack' ? 0.9 : 0, noShadow: o.noShadow });
    /* a leaf over the cap */
    ctx.fillStyle = up ? '#8fbf3f' : '#5aa04a'; ell(ctx, -2 * S_, -27 * S_, 3.6 * S_, 1.4 * S_, -0.4); ctx.fill(); outline(ctx, 0.5 * S_);
  };
  /* STRYX — stone armour, vine limbs, no legs: rooted where it fell */
  CREATURE.stryx = function (ctx, S_, t, o) {
    const up = o.tint === 1, stone = up ? '#7a7a6e' : '#8a8478', vine = up ? '#3d6a38' : '#4d7a44';
    if (!o.noShadow) shadow(ctx, 12 * S_, 3 * S_);
    /* roots, spread over the ground */
    ctx.strokeStyle = shade(vine, -25); ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const a = (i / 5 - 0.5) * 2.6; ctx.lineWidth = (2 - Math.abs(a) * 0.4) * S_; ctx.beginPath(); ctx.moveTo(Math.sin(a) * 3 * S_, -2 * S_); ctx.quadraticCurveTo(Math.sin(a) * 8 * S_, 0, Math.sin(a) * 13 * S_, 1.4 * S_); ctx.stroke(); }
    /* the stone body: stacked plates */
    const plates = [[0, -6, 9, 6], [0, -14, 8, 5.5], [0, -21, 6, 4.5]];
    plates.forEach(([x, y, w, h], i) => { ctx.fillStyle = lin(ctx, -w * S_, y * S_, w * S_, y * S_, [[0, shade(stone, 18)], [0.6, stone], [1, shade(stone, -35)]]); ell(ctx, x * S_, y * S_, w * S_, h * S_); ctx.fill(); outline(ctx, 0.8 * S_);
      ctx.strokeStyle = rgba('#3a3830', 0.4); ctx.lineWidth = 0.6 * S_; ctx.beginPath(); ctx.moveTo((x - w * 0.5) * S_, (y - h * 0.2) * S_); ctx.lineTo((x + w * 0.1) * S_, (y + h * 0.3) * S_); ctx.stroke(); });
    if (up) { ctx.fillStyle = rgba('#7ab04a', 0.7); ell(ctx, -3 * S_, -24 * S_, 4 * S_, 1.6 * S_); ctx.fill(); ell(ctx, 5 * S_, -10 * S_, 3 * S_, 1.2 * S_); ctx.fill(); }
    /* vines wrapping it, and two vine arms; one holds a rock */
    ctx.strokeStyle = vine; ctx.lineWidth = 1.2 * S_; ctx.beginPath(); ctx.moveTo(-8 * S_, -4 * S_); ctx.bezierCurveTo(-2 * S_, -10 * S_, 4 * S_, -12 * S_, 6 * S_, -20 * S_); ctx.stroke();
    const throwing = o.pose === 'attack' ? Math.sin(Math.min(1, o.poseT || 0) * Math.PI) : 0;
    [[-1, -16], [1, -17]].forEach(([sd, y], i) => { const ang = sd < 0 ? Math.PI + 0.6 : -0.9 - throwing * 1.4 + Math.sin(t * 2 + i) * 0.1; const ex = sd * 6 * S_ + Math.cos(ang) * 10 * S_, ey = y * S_ + Math.sin(ang) * 10 * S_;
      ctx.lineWidth = 1.8 * S_; ctx.beginPath(); ctx.moveTo(sd * 5 * S_, y * S_); ctx.quadraticCurveTo(sd * 10 * S_, (y - 4) * S_, ex, ey); ctx.stroke();
      if (sd > 0) { ctx.fillStyle = radial(ctx, ex, ey - 1 * S_, 3 * S_, '#b8b2a4', '#5a564c'); ell(ctx, ex, ey - 1 * S_, 2.8 * S_, 2.4 * S_); ctx.fill(); outline(ctx, 0.5 * S_); } });
    /* a crack of an eye */
    ctx.fillStyle = '#d8f0a0'; ell(ctx, 2.4 * S_, -21.5 * S_, 1.4 * S_, 0.6 * S_); ctx.fill();
  };
  /* ALBALI BYRD — a great pale bird with a single red horn under its healing film */
  CREATURE.albali = function (ctx, S_, t, o) {
    const up = o.tint === 1, body = up ? '#f2eee2' : '#e8e3d4', horn = '#b03030';
    if (!o.noShadow) shadow(ctx, 11 * S_, 3 * S_);
    const hov = Math.sin(t * 2.6) * 1.6 * S_; ctx.translate(0, -15 * S_ + hov);
    const flap = Math.sin(t * 6) * 0.5 + (o.pose === 'attack' ? 0.4 : 0);
    /* far wing */
    ctx.save(); ctx.rotate(-0.4 - flap); ctx.fillStyle = shade(body, -18); ctx.beginPath(); ctx.moveTo(-2 * S_, -2 * S_); ctx.quadraticCurveTo(-8 * S_, -16 * S_, -16 * S_, -14 * S_); ctx.quadraticCurveTo(-10 * S_, -6 * S_, -4 * S_, 2 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.6 * S_); ctx.restore();
    /* tail */
    ctx.fillStyle = shade(body, -10); ctx.beginPath(); ctx.moveTo(-8 * S_, 0); ctx.lineTo(-17 * S_, 3 * S_); ctx.lineTo(-15 * S_, -1 * S_); ctx.lineTo(-18 * S_, -3 * S_); ctx.lineTo(-8 * S_, -3 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.6 * S_);
    /* body */
    ctx.fillStyle = lin(ctx, 0, -6 * S_, 0, 6 * S_, [[0, '#ffffff'], [0.5, body], [1, shade(body, -22)]]); ell(ctx, 0, 0, 10 * S_, 6 * S_, -0.15); ctx.fill(); outline(ctx, 0.8 * S_);
    /* head and beak */
    ctx.fillStyle = body; ell(ctx, 9 * S_, -6 * S_, 4.2 * S_, 3.8 * S_); ctx.fill(); outline(ctx, 0.7 * S_);
    ctx.fillStyle = '#d9a441'; ctx.beginPath(); ctx.moveTo(12.5 * S_, -6.5 * S_); ctx.lineTo(17 * S_, -5 * S_); ctx.lineTo(12.5 * S_, -4.2 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.5 * S_);
    ctx.fillStyle = '#1a1410'; ell(ctx, 10.5 * S_, -7 * S_, 0.8 * S_, 0.8 * S_); ctx.fill();
    /* the one horn, filmed and glistening */
    ctx.fillStyle = lin(ctx, 8 * S_, -9 * S_, 10 * S_, -17 * S_, [[0, shade(horn, -20)], [1, shade(horn, 30)]]); ctx.beginPath(); ctx.moveTo(7.5 * S_, -9 * S_); ctx.quadraticCurveTo(8 * S_, -15 * S_, 11 * S_, -18 * S_); ctx.quadraticCurveTo(10 * S_, -13 * S_, 10.5 * S_, -9.4 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.5 * S_);
    ctx.fillStyle = rgba('#d0fff0', 0.35 + Math.sin(t * 3) * 0.15); ell(ctx, 9.6 * S_, -14 * S_, 1 * S_, 3 * S_, 0.4); ctx.fill();
    /* near wing */
    ctx.save(); ctx.rotate(0.3 + flap * 0.8); ctx.fillStyle = lin(ctx, 0, -12 * S_, 0, 4 * S_, [[0, '#ffffff'], [1, shade(body, -14)]]); ctx.beginPath(); ctx.moveTo(0, -1 * S_); ctx.quadraticCurveTo(-4 * S_, -18 * S_, -14 * S_, -17 * S_); ctx.quadraticCurveTo(-8 * S_, -8 * S_, -2 * S_, 3 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.7 * S_);
    ctx.strokeStyle = rgba('#a09a8c', 0.7); ctx.lineWidth = 0.5 * S_; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-2 * S_ - i * 2 * S_, -2 * S_ - i * 2 * S_); ctx.lineTo(-6 * S_ - i * 2.2 * S_, -10 * S_ - i * 1.6 * S_); ctx.stroke(); } ctx.restore();
    /* legs tucked */
    ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 0.9 * S_; ctx.beginPath(); ctx.moveTo(1 * S_, 5 * S_); ctx.lineTo(0, 9 * S_); ctx.moveTo(4 * S_, 5 * S_); ctx.lineTo(3.5 * S_, 9 * S_); ctx.stroke();
  };
  /* TONGUATJIS — a great shelled snapper of the deep forest, and a tongue many times its length */
  CREATURE.tonguatjis = function (ctx, S_, t, o) {
    const shell = '#4f6b3a', skin = '#7a6a4a', tongue = '#d46a6a';
    if (!o.noShadow) shadow(ctx, 20 * S_, 4 * S_);
    const step = Math.sin(t * 3) * 1 * S_;
    /* stubby legs */
    ctx.fillStyle = shade(skin, -20); [[-12, 0], [-4, 1], [6, 0], [13, 1]].forEach(([x, k], i) => { ell(ctx, x * S_, -2 * S_ + (i % 2 ? step : -step) * 0.5, 2.6 * S_, 3.6 * S_); ctx.fill(); outline(ctx, 0.6 * S_); });
    /* head, low and forward, jaws */
    const snap = o.pose === 'attack' ? Math.sin(Math.min(1, o.poseT || 0) * Math.PI) : 0.15 + Math.sin(t * 1.5) * 0.05;
    ctx.fillStyle = skin; ell(ctx, 19 * S_, -7 * S_, 6 * S_, 4.4 * S_, 0.1); ctx.fill(); outline(ctx, 0.7 * S_);
    ctx.fillStyle = shade(skin, -15); ctx.beginPath(); ctx.moveTo(15 * S_, -5 * S_); ctx.lineTo(26 * S_, -4 * S_ + snap * 3 * S_); ctx.lineTo(16 * S_, -2 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.6 * S_);
    ctx.fillStyle = '#f0e0a0'; ell(ctx, 21 * S_, -9.4 * S_, 1.1 * S_, 1 * S_); ctx.fill(); ctx.fillStyle = '#1a1208'; ell(ctx, 21.3 * S_, -9.4 * S_, 0.5 * S_, 0.7 * S_); ctx.fill();
    /* the tongue: rolled in, or lashing out */
    const lash = o.pose === 'attack' ? Math.sin(Math.min(1, o.poseT || 0) * Math.PI) : 0;
    ctx.strokeStyle = tongue; ctx.lineCap = 'round'; ctx.lineWidth = 1.8 * S_; ctx.beginPath(); ctx.moveTo(24 * S_, -4.5 * S_);
    if (lash > 0.05) { ctx.quadraticCurveTo(34 * S_, -10 * S_ * lash, 24 * S_ + 40 * S_ * lash, -5 * S_); ctx.stroke(); ctx.fillStyle = tongue; ell(ctx, 24 * S_ + 40 * S_ * lash, -5 * S_, 2.4 * S_, 1.8 * S_); ctx.fill(); }
    else { ctx.quadraticCurveTo(27 * S_, -2 * S_, 25 * S_, -1 * S_); ctx.stroke(); }
    /* the domed shell, plated, mossy */
    ctx.fillStyle = lin(ctx, 0, -22 * S_, 0, -2 * S_, [[0, shade(shell, 30)], [0.6, shell], [1, shade(shell, -40)]]); ctx.beginPath(); ctx.moveTo(-17 * S_, -3 * S_); ctx.quadraticCurveTo(-16 * S_, -22 * S_, 1 * S_, -23 * S_); ctx.quadraticCurveTo(17 * S_, -22 * S_, 17 * S_, -3 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 1 * S_);
    ctx.strokeStyle = rgba('#203018', 0.6); ctx.lineWidth = 0.8 * S_; [[-9, -6, -6, -18], [0, -4, 1, -21], [9, -6, 7, -18]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a * S_, b * S_); ctx.lineTo(c * S_, d * S_); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(-14 * S_, -11 * S_); ctx.quadraticCurveTo(0, -15 * S_, 14 * S_, -11 * S_); ctx.stroke();
    ctx.fillStyle = rgba('#8fbf3f', 0.55); ell(ctx, -4 * S_, -20 * S_, 5 * S_, 1.6 * S_); ctx.fill(); ell(ctx, 7 * S_, -17 * S_, 3 * S_, 1.2 * S_); ctx.fill();
  };
  /* SAKLAY'PUNK'EIK — an Eikar archer on a Domestic Punk */
  CREATURE.saklaypunk = function (ctx, S_, t, o) {
    if (!o.noShadow) shadow(ctx, 13 * S_, 3.6 * S_);
    ctx.save(); CREATURE.punk(ctx, S_ * 1.05, t, { tint: 2, noShadow: true, moving: o.moving || o.pose === 'attack', saddle: o.color || '#3f7d3a' }); ctx.restore();
    ctx.save(); ctx.translate(-1 * S_, -21 * S_);
    A.person(ctx, 0, 0, 22 * S_, 'eikar', { color: o.color || '#3f7d3a', look: 17, weapon: 'bow', t, noShadow: true, seated: true, swing: o.pose === 'attack' ? 1 : 0 });
    ctx.restore();
  };
  /* API BUTA — the Blind Beast: a huge slug of charred basalt veined with embers, fire tentacles at the mouth, no eyes */
  CREATURE.apibuta = function (ctx, S_, t, o) {
    if (!o.noShadow) shadow(ctx, 34 * S_, 5 * S_);
    const L = 34 * S_, wv = Math.sin(t * 1.4) * 1.2 * S_;
    /* heat shimmer */
    ctx.fillStyle = rgba('#ff8a3a', 0.08 + Math.sin(t * 3) * 0.03); ell(ctx, 0, -10 * S_, L * 1.08, 15 * S_); ctx.fill();
    /* the body: long, low, ridged */
    ctx.fillStyle = lin(ctx, 0, -20 * S_, 0, 0, [[0, '#4a3a34'], [0.5, '#2a2220'], [1, '#120c0a']]);
    ctx.beginPath(); ctx.moveTo(-L, -1 * S_); ctx.quadraticCurveTo(-L * 1.05, -9 * S_, -L * 0.7, -12 * S_ + wv);
    ctx.quadraticCurveTo(-L * 0.2, -20 * S_ - wv, L * 0.35, -18 * S_ + wv); ctx.quadraticCurveTo(L * 0.85, -17 * S_, L * 0.95, -8 * S_); ctx.quadraticCurveTo(L, -1 * S_, L * 0.8, 0); ctx.closePath(); ctx.fill(); outline(ctx, 1.1 * S_);
    /* the slime foot */
    ctx.fillStyle = rgba('#5a2a14', 0.7); ell(ctx, 0, -0.6 * S_, L * 0.95, 2 * S_); ctx.fill();
    /* ember veins, glowing */
    ctx.save(); ctx.shadowColor = '#ff6a10'; ctx.shadowBlur = 8 * S_; ctx.strokeStyle = rgba('#ff8a3a', 0.65 + Math.sin(t * 2) * 0.25); ctx.lineWidth = 1 * S_;
    [[-0.8, -6, -0.5, -12, -0.2, -9], [-0.3, -15, 0, -11, 0.25, -16], [0.2, -8, 0.45, -13, 0.7, -9], [-0.6, -12, -0.4, -16, -0.1, -15]].forEach(v => { ctx.beginPath(); ctx.moveTo(v[0] * L, v[1] * S_); ctx.lineTo(v[2] * L, v[3] * S_); ctx.lineTo(v[4] * L, v[5] * S_); ctx.stroke(); });
    ctx.restore();
    /* the wide mouth, and its fire tentacles */
    const breath = o.pose === 'attack' ? Math.sin(Math.min(1, o.poseT || 0) * Math.PI) : 0;
    ctx.fillStyle = '#1a0806'; ell(ctx, L * 0.93, -6 * S_, 3.6 * S_, 2.6 * S_ + breath * 2 * S_); ctx.fill();
    ctx.save(); ctx.shadowColor = '#ffb43a'; ctx.shadowBlur = 10 * S_;
    for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1; ctx.strokeStyle = i ? '#ffd24a' : '#ff8a3a'; ctx.lineWidth = 2 * S_; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(L * 0.92, -9 * S_ + sd * 2 * S_);
      ctx.bezierCurveTo(L * 1.1, -14 * S_ + sd * 4 * S_ + Math.sin(t * 4 + i) * 2 * S_, L * 1.2, -4 * S_ + sd * 3 * S_, L * 1.08 + Math.sin(t * 5 + i) * 2 * S_, -2 * S_ + sd * S_); ctx.stroke(); }
    for (let i = 0; i < 6; i++) { ctx.strokeStyle = rgba('#ff8a3a', 0.7); ctx.lineWidth = 1 * S_; const x = L * (0.55 + i * 0.07); ctx.beginPath(); ctx.moveTo(x, -1 * S_); ctx.quadraticCurveTo(x + 1 * S_, 2 * S_, x + Math.sin(t * 6 + i) * 1.5 * S_, 3.6 * S_); ctx.stroke(); }
    if (breath > 0.05) { ctx.fillStyle = rgba('#ffb43a', 0.6 * breath); ell(ctx, L * 1.25, -6 * S_, 9 * S_ * breath, 4 * S_ * breath); ctx.fill(); ctx.fillStyle = rgba('#fff0a0', 0.7 * breath); ell(ctx, L * 1.15, -6 * S_, 4 * S_ * breath, 2 * S_ * breath); ctx.fill(); }
    ctx.restore();
  };
  /* SRU VORN — a heavy, low lizard with matted fur like armour, curved tusks, a spiked ball-tail and acid saliva */
  CREATURE.sruvorn = function (ctx, S_, t, o) {
    const fur = '#6b5b45', acid = '#8fbf3f';
    if (!o.noShadow) shadow(ctx, 24 * S_, 4.4 * S_);
    const step = Math.sin(t * 2.5) * 1.2 * S_, lunge = o.pose === 'attack' ? Math.sin(Math.min(1, o.poseT || 0) * Math.PI) * 3 * S_ : 0;
    /* the tail and its spiked ball */
    ctx.strokeStyle = shade(fur, -20); ctx.lineWidth = 4 * S_; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-14 * S_, -7 * S_); ctx.quadraticCurveTo(-24 * S_, -6 * S_ + Math.sin(t * 2) * 2 * S_, -29 * S_, -12 * S_); ctx.stroke();
    ctx.fillStyle = '#5a4a38'; ell(ctx, -30 * S_, -13 * S_, 4 * S_, 4 * S_); ctx.fill(); outline(ctx, 0.7 * S_);
    ctx.fillStyle = '#d8d0b8'; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; ctx.beginPath(); ctx.moveTo(-30 * S_ + Math.cos(a) * 3.6 * S_, -13 * S_ + Math.sin(a) * 3.6 * S_); ctx.lineTo(-30 * S_ + Math.cos(a + 0.2) * 6.4 * S_, -13 * S_ + Math.sin(a + 0.2) * 6.4 * S_); ctx.lineTo(-30 * S_ + Math.cos(a + 0.4) * 3.6 * S_, -13 * S_ + Math.sin(a + 0.4) * 3.6 * S_); ctx.fill(); }
    /* short heavy legs */
    ctx.fillStyle = shade(fur, -30); [[-10, 1], [-3, -1], [8, 1], [14, -1]].forEach(([x, k]) => { ctx.fillRect((x - 2.4) * S_, -6 * S_ + k * step, 4.8 * S_, 6 * S_); ctx.fillStyle = '#3a3026'; ell(ctx, x * S_, 0, 3 * S_, 1.4 * S_); ctx.fill(); ctx.fillStyle = shade(fur, -30); });
    /* the body: low and broad, shaggy */
    ctx.fillStyle = lin(ctx, 0, -18 * S_, 0, -3 * S_, [[0, shade(fur, 20)], [0.6, fur], [1, shade(fur, -35)]]); ell(ctx, 0, -10 * S_, 18 * S_, 8 * S_); ctx.fill(); outline(ctx, 1 * S_);
    ctx.strokeStyle = rgba('#3a2e20', 0.55); ctx.lineWidth = 0.7 * S_; for (let i = 0; i < 16; i++) { const x = (-15 + i * 2) * S_; ctx.beginPath(); ctx.moveTo(x, -16 * S_ + Math.abs(i - 8) * 0.5 * S_); ctx.quadraticCurveTo(x - 1 * S_, -11 * S_, x + 0.6 * S_, -5 * S_); ctx.stroke(); }
    /* the head, tusks and acid */
    ctx.save(); ctx.translate(lunge, 0);
    ctx.fillStyle = shade(fur, -8); ell(ctx, 19 * S_, -9 * S_, 7 * S_, 5 * S_, 0.1); ctx.fill(); outline(ctx, 0.8 * S_);
    ctx.fillStyle = '#efe6cc'; [[0], [1]].forEach(([k]) => { const y = -6 * S_ + k * 1.6 * S_; ctx.beginPath(); ctx.moveTo(22 * S_, y); ctx.quadraticCurveTo(29 * S_, y + 1 * S_, 28 * S_, y - 6 * S_); ctx.quadraticCurveTo(26 * S_, y - 1 * S_, 22 * S_, y - 1.6 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.5 * S_); });
    ctx.fillStyle = '#e0f070'; ell(ctx, 21 * S_, -12 * S_, 1 * S_, 0.8 * S_); ctx.fill(); ctx.fillStyle = '#1a1a08'; ell(ctx, 21.3 * S_, -12 * S_, 0.4 * S_, 0.7 * S_); ctx.fill();
    ctx.fillStyle = rgba(acid, 0.75); const drip = (t * 0.8) % 1; ell(ctx, 24 * S_, -4 * S_ + drip * 4 * S_, 0.9 * S_, 1.4 * S_); ctx.fill(); ell(ctx, 21 * S_, -3.6 * S_, 1.6 * S_, 0.8 * S_); ctx.fill();
    ctx.restore();
  };
  /* THE VYRENALUR — Light Shadow: a stag whose hide is shadow dappled with moving light, crowned by antlers of pure light */
  CREATURE.vyrenalur = function (ctx, S_, t, o) {
    if (!o.noShadow) shadow(ctx, 22 * S_, 4 * S_);
    const hide = '#1a1a2c', walk = o.moving || o.pose === 'attack' ? Math.sin(t * 7) : Math.sin(t * 1.2) * 0.15, charge = o.pose === 'attack' ? Math.sin(Math.min(1, o.poseT || 0) * Math.PI) : 0;
    /* slender legs */
    ctx.strokeStyle = shade(hide, 10); ctx.lineCap = 'round'; ctx.lineWidth = 2.2 * S_;
    [[-12, 1], [-8, -1], [10, -1], [14, 1]].forEach(([x, k]) => { const a = walk * 0.35 * k; ctx.beginPath(); ctx.moveTo(x * S_, -16 * S_); ctx.lineTo((x + Math.sin(a) * 5 - 1) * S_, -8 * S_); ctx.lineTo((x + Math.sin(a) * 3) * S_, 0); ctx.stroke(); });
    ctx.translate(0, 3 * S_);
    /* the body */
    ctx.fillStyle = lin(ctx, 0, -26 * S_, 0, -12 * S_, [[0, '#2c2c48'], [1, '#0c0c18']]); ctx.beginPath(); ctx.moveTo(-16 * S_, -16 * S_); ctx.quadraticCurveTo(-17 * S_, -25 * S_, -6 * S_, -25 * S_); ctx.quadraticCurveTo(8 * S_, -27 * S_, 15 * S_, -24 * S_); ctx.quadraticCurveTo(19 * S_, -18 * S_, 14 * S_, -14 * S_); ctx.quadraticCurveTo(0, -12 * S_, -16 * S_, -16 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.8 * S_);
    /* the neck and head, lowered to charge */
    ctx.save(); ctx.translate(13 * S_, -23 * S_); ctx.rotate(0.55 + charge * 0.7);
    ctx.fillStyle = '#1e1e34'; ctx.beginPath(); ctx.moveTo(-3 * S_, 2 * S_); ctx.quadraticCurveTo(2 * S_, -8 * S_, 4 * S_, -12 * S_); ctx.lineTo(9 * S_, -10 * S_); ctx.quadraticCurveTo(5 * S_, -2 * S_, 4 * S_, 3 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.7 * S_);
    ctx.fillStyle = '#20203a'; ell(ctx, 8 * S_, -12 * S_, 4.6 * S_, 2.6 * S_, 0.3); ctx.fill(); outline(ctx, 0.6 * S_);
    ctx.fillStyle = '#fff6c8'; ell(ctx, 8 * S_, -13 * S_, 0.8 * S_, 0.8 * S_); ctx.fill();
    /* antlers of pure light, trailing threads like sunbeams */
    ctx.save(); ctx.shadowColor = '#fff2b0'; ctx.shadowBlur = 14 * S_; ctx.strokeStyle = rgba('#fffbe0', 0.95); ctx.lineWidth = 1.3 * S_;
    [[-1, 0], [1, 0.4]].forEach(([sd, off]) => { ctx.beginPath(); ctx.moveTo(6 * S_, -14 * S_); ctx.quadraticCurveTo((4 + sd * 4) * S_, -22 * S_, (2 + sd * 7) * S_, -30 * S_); ctx.stroke();
      [[0.35, -4, -5], [0.6, 5, -6], [0.85, -3, -5]].forEach(([k, dx, dy]) => { const x = (6 + ((2 + sd * 7) - 6) * k) * S_, y = (-14 - 16 * k) * S_; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * S_, y + dy * S_); ctx.stroke(); }); });
    ctx.strokeStyle = rgba('#fff2b0', 0.35); ctx.lineWidth = 0.6 * S_; for (let i = 0; i < 4; i++) { const x = (2 + i * 2.6) * S_, y = (-26 - i) * S_; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2 * S_ + Math.sin(t * 2 + i) * S_, y + 16 * S_); ctx.stroke(); }
    ctx.restore(); ctx.restore();
    /* light dappling the shadow-hide, drifting */
    ctx.save(); ctx.beginPath(); ctx.moveTo(-16 * S_, -16 * S_); ctx.quadraticCurveTo(-17 * S_, -25 * S_, -6 * S_, -25 * S_); ctx.quadraticCurveTo(8 * S_, -27 * S_, 15 * S_, -24 * S_); ctx.quadraticCurveTo(19 * S_, -18 * S_, 14 * S_, -14 * S_); ctx.quadraticCurveTo(0, -12 * S_, -16 * S_, -16 * S_); ctx.clip();
    for (let i = 0; i < 9; i++) { const x = ((i * 37 + t * 4) % 34 - 17) * S_, y = (-15 - (i * 13) % 10) * S_; ctx.fillStyle = rgba('#fff2b0', 0.28 + 0.18 * Math.sin(t * 2 + i)); ell(ctx, x, y, 1.8 * S_, 1.2 * S_); ctx.fill(); }
    ctx.restore();
    if (charge > 0.05) { ctx.fillStyle = rgba('#fff6c8', 0.35 * charge); ell(ctx, 26 * S_, -26 * S_, 14 * S_ * charge, 5 * S_ * charge, -0.2); ctx.fill(); }
  };
  /* KIPSU — a weasel's face, a fox's ears, a fluffy tail that glows */
  CREATURE.kipsu = function (ctx, S_, t, o) {
    if (!o.noShadow) shadow(ctx, 9 * S_, 2.6 * S_);
    const hop = Math.abs(Math.sin(t * 6)) * (o.moving ? 2 : 0.4) * S_; ctx.translate(0, -hop);
    /* the tail, glowing in its own pattern */
    ctx.save(); ctx.shadowColor = '#68e0c8'; ctx.shadowBlur = 10 * S_; ctx.fillStyle = lin(ctx, -16 * S_, -10 * S_, -6 * S_, -4 * S_, [[0, '#9ff8e8'], [1, '#a3703f']]);
    ctx.beginPath(); ctx.moveTo(-6 * S_, -6 * S_); ctx.quadraticCurveTo(-18 * S_, -4 * S_ + Math.sin(t * 3) * 2 * S_, -16 * S_, -16 * S_); ctx.quadraticCurveTo(-10 * S_, -14 * S_, -5 * S_, -9 * S_); ctx.closePath(); ctx.fill(); ctx.restore(); outline(ctx, 0.5 * S_);
    ctx.fillStyle = rgba('#d0fff4', 0.8); for (let i = 0; i < 3; i++) { ell(ctx, (-14 + i * 2.6) * S_, (-12 + i) * S_, 0.9 * S_, 0.7 * S_); ctx.fill(); }
    /* body and legs */
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.4 * S_; [[-4, 1], [4, -1]].forEach(([x, k]) => { ctx.beginPath(); ctx.moveTo(x * S_, -5 * S_); ctx.lineTo((x + Math.sin(t * 8) * k) * S_, 0); ctx.stroke(); });
    ctx.fillStyle = lin(ctx, 0, -10 * S_, 0, -3 * S_, [[0, '#c08a50'], [1, '#7a5230']]); ell(ctx, 0, -6.5 * S_, 7.5 * S_, 3.6 * S_); ctx.fill(); outline(ctx, 0.6 * S_);
    /* head, pointed snout, big fox ears */
    ctx.fillStyle = '#b8824a'; ell(ctx, 7.5 * S_, -9 * S_, 3.4 * S_, 2.8 * S_); ctx.fill(); outline(ctx, 0.5 * S_);
    ctx.beginPath(); ctx.moveTo(10 * S_, -9.8 * S_); ctx.lineTo(13.6 * S_, -8.4 * S_); ctx.lineTo(10 * S_, -7.6 * S_); ctx.fill();
    ctx.fillStyle = '#a3703f'; [[6, -1], [8.4, 1]].forEach(([x, k]) => { ctx.beginPath(); ctx.moveTo((x - 1.4) * S_, -11 * S_); ctx.lineTo((x + k * 0.6) * S_, -16 * S_); ctx.lineTo((x + 1.4) * S_, -11 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.4 * S_); });
    ctx.fillStyle = '#1a1208'; ell(ctx, 9 * S_, -9.6 * S_, 0.6 * S_, 0.6 * S_); ctx.fill(); ell(ctx, 13.4 * S_, -8.4 * S_, 0.5 * S_, 0.4 * S_); ctx.fill();
  };

  /* a captain on the battlefield: a person with a banner */
  A.captain = function (ctx, x, y, s, cap, color, t, f, pose) {
    A.person(ctx, x, y, s, cap.people, { color, look: cap.look, weapon: cap.rank === 'jukeeper' ? 'pouch' : cap.rank === 'tracker' ? 'staff' : cap.rank === 'grovewarden' ? 'spear' : cap.rank === 'naelst' ? 'staff' : cap.rank === 'thar' ? 'banner' : cap.people === 'keilia' ? 'hammer' : 'sword', t, f, helm: cap.rank === 'stamijan', armor: cap.level > 2, swing: pose === 'attack' ? 1 : 0 });
  };

  /* ======================= resources (icons) ======================= */
  A.resIcon = function (ctx, res, x, y, s) {
    ctx.save(); ctx.translate(x, y); const S_ = s / 16;
    const I = D.RES_INFO[res];
    if (res === 'gold') { for (let i = 0; i < 3; i++) { ctx.fillStyle = radial(ctx, (i - 1) * 4 * S_, -i * 2 * S_, 5 * S_, '#fff0a0', '#b8902a'); ell(ctx, (i - 1) * 4 * S_, 3 * S_ - i * 2.5 * S_, 5 * S_, 2.6 * S_); ctx.fill(); outline(ctx, 0.7 * S_); } }
    else if (res === 'wood' || res === 'timber') { const c = res === 'timber' ? '#c04a20' : '#8a5a2a'; for (let i = 0; i < 3; i++) { ctx.fillStyle = lin(ctx, 0, -4 * S_, 0, 4 * S_, [[0, shade(c, 25)], [1, shade(c, -30)]]); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-7 * S_, (i * 3.6 - 6) * S_, 14 * S_, 3.4 * S_, 1.6 * S_) : ctx.rect(-7 * S_, (i * 3.6 - 6) * S_, 14 * S_, 3.4 * S_); ctx.fill(); outline(ctx, 0.6 * S_); ctx.fillStyle = shade(c, 40); ell(ctx, 7 * S_, (i * 3.6 - 4.3) * S_, 1.4 * S_, 1.6 * S_); ctx.fill(); } if (res === 'timber') { ctx.fillStyle = rgba('#ffcc55', 0.8); ell(ctx, 0, -8 * S_, 2 * S_, 2.6 * S_); ctx.fill(); } }
    else if (res === 'stone') { [[-4, 2, 5], [3, 3, 4.4], [0, -3, 4.6]].forEach(([a, b, r]) => { ctx.fillStyle = radial(ctx, a * S_, b * S_, r * S_, '#d0ccc0', '#6a665c'); ell(ctx, a * S_, b * S_, r * S_, r * 0.8 * S_); ctx.fill(); outline(ctx, 0.6 * S_); }); }
    else if (res === 'food') { ctx.fillStyle = radial(ctx, 0, 0, 8 * S_, '#f0d080', '#9a6a20'); ctx.beginPath(); ctx.moveTo(-6 * S_, 6 * S_); ctx.quadraticCurveTo(-8 * S_, -6 * S_, 0, -8 * S_); ctx.quadraticCurveTo(8 * S_, -6 * S_, 6 * S_, 6 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.7 * S_); ctx.strokeStyle = '#6a4a14'; ctx.lineWidth = 0.7 * S_; ctx.beginPath(); ctx.moveTo(-3 * S_, -4 * S_); ctx.lineTo(3 * S_, -4 * S_); ctx.stroke(); }
    else { const col = I.color; ctx.shadowColor = col; ctx.shadowBlur = 8 * S_; ctx.fillStyle = lin(ctx, -6 * S_, -8 * S_, 6 * S_, 8 * S_, [[0, shade(col, 50)], [0.5, col], [1, shade(col, -45)]]);
      if (res === 'stygian') { ctx.beginPath(); ctx.moveTo(0, -9 * S_); ctx.lineTo(6 * S_, -2 * S_); ctx.lineTo(3 * S_, 8 * S_); ctx.lineTo(-3 * S_, 8 * S_); ctx.lineTo(-6 * S_, -2 * S_); ctx.closePath(); ctx.fill(); }
      else if (res === 'ngakara') { ell(ctx, 0, 0, 6 * S_, 7.5 * S_); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = rgba('#ffffff', 0.7); ell(ctx, -2 * S_, -3 * S_, 1.6 * S_, 2.4 * S_); ctx.fill(); }
      else { for (let i = 0; i < 5; i++) { ell(ctx, (i - 2) * 3 * S_, Math.sin(i * 2) * 2 * S_, 3.4 * S_, 2.8 * S_); ctx.fill(); } }
      ctx.shadowBlur = 0; outline(ctx, 0.6 * S_); }
    ctx.restore();
  };

  /* a flag on a pole, in a player's colour */
  A.flag = function (ctx, x, y, s, color, t) {
    const S_ = s / 16, wv = Math.sin(t * 4 + x) * 1.2 * S_;
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.2 * S_; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 16 * S_); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - 16 * S_); ctx.quadraticCurveTo(x + 5 * S_, y - 15 * S_ + wv, x + 10 * S_, y - 14 * S_); ctx.lineTo(x + 9 * S_, y - 9 * S_ + wv); ctx.quadraticCurveTo(x + 4 * S_, y - 10 * S_ - wv, x, y - 9 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.6 * S_);
  };
})(typeof window !== 'undefined' ? window : globalThis);
