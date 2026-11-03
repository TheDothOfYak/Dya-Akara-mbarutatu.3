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
  function shadow(ctx, w, h) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ell(ctx, 0, 0, w, h); ctx.fill(); }
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
    const k = kind + '_' + (variant % 6) + '_' + ts; if (obCache[k]) return obCache[k];
    const R = SU.makeRng(variant % 6 * 131 + kind.length * 7);
    const W = ts * 2, H = ts * 2.4, c = canvas(W, H), g = c.getContext('2d');
    const cx = W / 2, gy = H - ts * 0.55; const s = ts / 48;
    g.save(); g.translate(cx, gy);
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
      const big = kind === 'mountain'; const w = (big ? 30 : 18) * s, h = (big ? 46 : 22) * s * R.range(0.85, 1.15);
      g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, 0, 0, w * 1.1, w * 0.3); g.fill();
      const peak = R.range(-0.25, 0.25) * w;
      g.fillStyle = lin(g, -w, 0, w, 0, [[0, '#9c968a'], [0.45, '#7d776c'], [0.55, '#5b564e'], [1, '#423e38']]);
      g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w * 0.55, -h * 0.45); g.lineTo(peak, -h); g.lineTo(w * 0.5, -h * 0.5); g.lineTo(w, 0); g.closePath(); g.fill();
      g.fillStyle = rgba('#2c2925', 0.35); g.beginPath(); g.moveTo(peak, -h); g.lineTo(w * 0.5, -h * 0.5); g.lineTo(w, 0); g.lineTo(peak + w * 0.1, 0); g.closePath(); g.fill();
      g.strokeStyle = rgba('#2c2925', 0.5); g.lineWidth = 1 * s; for (let i = 0; i < 4; i++) { g.beginPath(); const x0 = peak + R.range(-0.4, 0.4) * w; g.moveTo(x0, -h * R.range(0.5, 0.8)); g.lineTo(x0 + R.range(-6, 6) * s, -h * R.range(0.1, 0.3)); g.stroke(); }
      if (big) { g.fillStyle = '#f2f5fa'; g.beginPath(); g.moveTo(peak, -h); g.lineTo(peak - w * 0.28, -h * 0.68); g.lineTo(peak - w * 0.1, -h * 0.72); g.lineTo(peak + w * 0.05, -h * 0.64); g.lineTo(peak + w * 0.22, -h * 0.74); g.closePath(); g.fill(); }
      g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w * 0.55, -h * 0.45); g.lineTo(peak, -h); g.lineTo(w * 0.5, -h * 0.5); g.lineTo(w, 0); outline(g, 1.2 * s);
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

  /* ======================= Dearcàn figures: heroes and captains ======================= */
  /* people: eikar keilia kaloeik karnen. o: { f, t, color (player), look, weapon, mounted, scale } */
  A.person = function (ctx, x, y, s, people, o) {
    o = o || {}; const f = o.f || 1, t = o.t || 0, R = SU.makeRng(o.look || 7);
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    const bob = Math.sin(t * 3 + (o.look || 0)) * 0.6 * s / 30;
    const k = people === 'keilia' ? 1.35 : people === 'karnen' ? 0.78 : 1;
    const S_ = s / 30 * k;
    if (!o.noShadow) { ctx.save(); shadow(ctx, 9 * S_, 3 * S_); ctx.restore(); }
    ctx.translate(0, bob);
    const team = o.color || '#c43a3a';
    const skin = people === 'eikar' ? R.pick(['#b9863f', '#a8743a', '#c7954e']) : people === 'kaloeik' ? '#cfd6ea' : people === 'karnen' ? R.pick(['#8a6a54', '#9a7a5c']) : R.pick(['#c49a72', '#a87a58', '#d4a882']);
    /* legs */
    ctx.fillStyle = '#2a2018'; ctx.fillRect(-4 * S_, -9 * S_, 3 * S_, 9 * S_); ctx.fillRect(1.2 * S_, -9 * S_, 3 * S_, 9 * S_);
    ctx.fillStyle = '#18100a'; ell(ctx, -2.4 * S_, -0.6 * S_, 2.6 * S_, 1.2 * S_); ctx.fill(); ell(ctx, 2.8 * S_, -0.6 * S_, 2.6 * S_, 1.2 * S_); ctx.fill();
    /* cloak (Keilia: hair like armour, cape to the calf) */
    if (people === 'keilia') {
      ctx.fillStyle = lin(ctx, -10 * S_, -26 * S_, 8 * S_, -4 * S_, [[0, '#6a4a2e'], [1, '#3a2614']]);
      ctx.beginPath(); ctx.moveTo(-7 * S_, -26 * S_); ctx.quadraticCurveTo(-12 * S_, -12 * S_, -9 * S_, -4 * S_); ctx.lineTo(6 * S_, -5 * S_); ctx.quadraticCurveTo(8 * S_, -16 * S_, 5 * S_, -26 * S_); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#2a1a0c', 0.6); ctx.lineWidth = 0.8 * S_; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-8 * S_ + i * 2.4 * S_, -22 * S_ + (i % 2) * 2 * S_); ctx.quadraticCurveTo(-9 * S_ + i * 2.6 * S_, -14 * S_, -8 * S_ + i * 2.6 * S_, -6 * S_); ctx.stroke(); }
    } else {
      ctx.fillStyle = lin(ctx, -8 * S_, -24 * S_, 6 * S_, -6 * S_, [[0, shade(team, -10)], [1, shade(team, -55)]]);
      ctx.beginPath(); ctx.moveTo(-6 * S_, -23 * S_); ctx.quadraticCurveTo(-11 * S_, -12 * S_, -8 * S_ + Math.sin(t * 2) * 0.6 * S_, -7 * S_); ctx.lineTo(-1 * S_, -9 * S_); ctx.closePath(); ctx.fill();
    }
    /* body */
    const tunic = people === 'kaloeik' ? '#3a3a62' : o.armor ? '#5a5f6a' : '#4a3a2a';
    ctx.fillStyle = lin(ctx, -6 * S_, -24 * S_, 6 * S_, -8 * S_, [[0, shade(tunic, 25)], [1, shade(tunic, -35)]]);
    ctx.beginPath(); ctx.moveTo(-5.5 * S_, -24 * S_); ctx.quadraticCurveTo(-7 * S_, -15 * S_, -5 * S_, -8 * S_); ctx.lineTo(5 * S_, -8 * S_); ctx.quadraticCurveTo(7 * S_, -15 * S_, 5.5 * S_, -24 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.9 * S_);
    /* team sash */
    ctx.strokeStyle = team; ctx.lineWidth = 2 * S_; ctx.beginPath(); ctx.moveTo(-5 * S_, -22 * S_); ctx.lineTo(4.5 * S_, -11 * S_); ctx.stroke();
    ctx.fillStyle = '#c9a24e'; ell(ctx, 0, -10 * S_, 1.4 * S_, 1.2 * S_); ctx.fill();
    /* arms + weapon */
    const wpn = o.weapon || 'spear';
    ctx.strokeStyle = shade(tunic, -10); ctx.lineWidth = 2.6 * S_; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(4.5 * S_, -21 * S_); ctx.lineTo(8 * S_, -14 * S_); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4.5 * S_, -21 * S_); ctx.lineTo(-6.5 * S_, -14 * S_); ctx.stroke();
    ctx.fillStyle = skin; ell(ctx, 8 * S_, -14 * S_, 1.5 * S_, 1.5 * S_); ctx.fill();
    const sw = o.swing || 0;
    ctx.save(); ctx.translate(8 * S_, -14 * S_); ctx.rotate(-0.2 + sw);
    if (wpn === 'spear') { ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 1.4 * S_; ctx.beginPath(); ctx.moveTo(0, 8 * S_); ctx.lineTo(0, -20 * S_); ctx.stroke(); ctx.fillStyle = '#d8dce6'; ctx.beginPath(); ctx.moveTo(-1.6 * S_, -19 * S_); ctx.lineTo(0, -25 * S_); ctx.lineTo(1.6 * S_, -19 * S_); ctx.fill(); }
    else if (wpn === 'sword') { ctx.strokeStyle = '#d8dce6'; ctx.lineWidth = 1.8 * S_; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -14 * S_); ctx.stroke(); ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = 1.4 * S_; ctx.beginPath(); ctx.moveTo(-2.4 * S_, -1 * S_); ctx.lineTo(2.4 * S_, -1 * S_); ctx.stroke(); }
    else if (wpn === 'axe') { ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.6 * S_; ctx.beginPath(); ctx.moveTo(0, 4 * S_); ctx.lineTo(0, -14 * S_); ctx.stroke(); ctx.fillStyle = lin(ctx, 0, -14 * S_, 6 * S_, -8 * S_, [[0, '#e6e9f0'], [1, '#8a8f9a']]); ctx.beginPath(); ctx.moveTo(0, -14 * S_); ctx.quadraticCurveTo(7 * S_, -14 * S_, 6 * S_, -7 * S_); ctx.lineTo(0, -9 * S_); ctx.fill(); }
    else if (wpn === 'staff') { ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 1.5 * S_; ctx.beginPath(); ctx.moveTo(0, 10 * S_); ctx.lineTo(0, -20 * S_); ctx.stroke(); ctx.shadowColor = '#8e7cff'; ctx.shadowBlur = 8 * S_; ctx.fillStyle = '#c9b8ff'; ell(ctx, 0, -21 * S_, 2.2 * S_, 2.2 * S_); ctx.fill(); ctx.shadowBlur = 0; }
    else if (wpn === 'hammer') { ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 1.8 * S_; ctx.beginPath(); ctx.moveTo(0, 4 * S_); ctx.lineTo(0, -12 * S_); ctx.stroke(); ctx.fillStyle = lin(ctx, -4 * S_, 0, 4 * S_, 0, [[0, '#9aa0aa'], [1, '#585e68']]); ctx.fillRect(-4 * S_, -16 * S_, 8 * S_, 5 * S_); }
    else if (wpn === 'banner') { ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 1.4 * S_; ctx.beginPath(); ctx.moveTo(0, 8 * S_); ctx.lineTo(0, -26 * S_); ctx.stroke(); const wv = Math.sin(t * 4) * 1.5 * S_; ctx.fillStyle = team; ctx.beginPath(); ctx.moveTo(0, -26 * S_); ctx.quadraticCurveTo(6 * S_, -25 * S_ + wv, 11 * S_, -23 * S_); ctx.lineTo(10 * S_, -17 * S_ + wv); ctx.quadraticCurveTo(5 * S_, -18 * S_ - wv, 0, -17 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.8 * S_); }
    ctx.restore();
    /* head */
    const hy = -29 * S_;
    if (people === 'eikar') {
      /* an acorn: the body of the nut is the face, the Aagac (hat) is part of them */
      ctx.fillStyle = radial(ctx, 0, hy + 1 * S_, 6.5 * S_, shade(skin, 30), shade(skin, -25));
      ctx.beginPath(); ctx.moveTo(-5.6 * S_, hy - 1 * S_); ctx.quadraticCurveTo(-6 * S_, hy + 6 * S_, 0, hy + 7.5 * S_); ctx.quadraticCurveTo(6 * S_, hy + 6 * S_, 5.6 * S_, hy - 1 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.9 * S_);
      const cap = R.pick(['#5a3a1c', '#6a4a24', '#4a2e16', '#3a2a17']);
      ctx.fillStyle = radial(ctx, 0, hy - 3 * S_, 7 * S_, shade(cap, 30), shade(cap, -30));
      ctx.beginPath(); ctx.ellipse(0, hy - 1 * S_, 7 * S_, 5 * S_, 0, Math.PI, TAU); ctx.fill(); outline(ctx, 0.9 * S_);
      ctx.strokeStyle = rgba('#1e1208', 0.5); ctx.lineWidth = 0.6 * S_;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 2.6 * S_, hy - 1 * S_); ctx.lineTo(i * 2.2 * S_, hy - 4.5 * S_); ctx.stroke(); }
      ctx.strokeStyle = shade(cap, -20); ctx.lineWidth = 1.4 * S_; ctx.beginPath(); ctx.moveTo(0, hy - 5.8 * S_); ctx.quadraticCurveTo(1 * S_, hy - 8.5 * S_, 2.5 * S_, hy - 8.8 * S_); ctx.stroke();
      ctx.fillStyle = '#1a1008'; ell(ctx, 1.8 * S_, hy + 2.2 * S_, 0.9 * S_, 1.1 * S_); ctx.fill(); ell(ctx, 4.2 * S_, hy + 2 * S_, 0.8 * S_, 1 * S_); ctx.fill();
      ctx.strokeStyle = rgba('#3a2010', 0.6); ctx.lineWidth = 0.6 * S_; ctx.beginPath(); ctx.moveTo(1 * S_, hy + 3.8 * S_); ctx.lineTo(2.6 * S_, hy + 4 * S_); ctx.stroke();
    } else {
      ctx.fillStyle = radial(ctx, 0, hy, 5.2 * S_, shade(skin, 25), shade(skin, -25)); ell(ctx, 0, hy, 4.6 * S_, 5.2 * S_); ctx.fill(); outline(ctx, 0.9 * S_);
      if (people === 'keilia') { ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.ellipse(-1 * S_, hy - 2 * S_, 5.2 * S_, 4 * S_, 0, Math.PI * 0.9, TAU * 1.02); ctx.fill(); ctx.fillRect(-5.5 * S_, hy - 2 * S_, 2.5 * S_, 8 * S_); }
      if (people === 'kaloeik') { ctx.shadowColor = '#bcd0ff'; ctx.shadowBlur = 6 * S_; ctx.strokeStyle = '#e8eeff'; ctx.lineWidth = 0.9 * S_; ctx.beginPath(); ctx.arc(0, hy - 1 * S_, 6.4 * S_, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = '#9aa6d8'; ctx.beginPath(); ctx.ellipse(0, hy - 2.5 * S_, 4.8 * S_, 3 * S_, 0, Math.PI, TAU); ctx.fill(); }
      if (people === 'karnen') { ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.ellipse(0, hy - 2.8 * S_, 4.8 * S_, 2.6 * S_, 0, Math.PI, TAU); ctx.fill(); ctx.fillStyle = skin; ell(ctx, -4.6 * S_, hy - 1 * S_, 1.4 * S_, 2.2 * S_); ctx.fill(); }
      ctx.fillStyle = '#1a1008'; ell(ctx, 1.8 * S_, hy + 0.2 * S_, 0.8 * S_, 1 * S_); ctx.fill(); ell(ctx, 3.6 * S_, hy, 0.7 * S_, 0.9 * S_); ctx.fill();
    }
    if (o.helm) { ctx.fillStyle = lin(ctx, -5 * S_, hy - 6 * S_, 5 * S_, hy, [[0, '#c9ccd6'], [1, '#6a6f7a']]); ctx.beginPath(); ctx.ellipse(0, hy - 2.4 * S_, 5.4 * S_, 4.2 * S_, 0, Math.PI, TAU); ctx.fill(); outline(ctx, 0.8 * S_); }
    ctx.restore();
  };

  /* a hero on a mount, for the map */
  A.mountedHero = function (ctx, x, y, s, hero, color, t, f) {
    ctx.save(); ctx.translate(x, y); ctx.scale(f || 1, 1);
    const S_ = s / 30, step = Math.sin(t * 8) * (hero.moving ? 1 : 0);
    shadow(ctx, 14 * S_, 4 * S_);
    if (hero.mount === 'kuni') { A.creature(ctx, 'kuni', 0, 0, s * 0.9, { t, f: 1, noShadow: true }); ctx.translate(0, -16 * S_); }
    else {
      /* a Domestic Punk, saddled: the pumpkin-and-vine beast of the roads */
      const body = '#d27426', vine = '#3d6a24', dvine = '#2a4a18';
      ctx.lineCap = 'round';
      /* vine tail, curling */
      ctx.strokeStyle = vine; ctx.lineWidth = 1.6 * S_;
      ctx.beginPath(); ctx.moveTo(-12 * S_, -14 * S_); ctx.bezierCurveTo(-18 * S_, -16 * S_, -20 * S_, -8 * S_ + Math.sin(t * 3) * S_, -16 * S_, -7 * S_); ctx.stroke();
      ctx.beginPath(); ctx.arc(-15.5 * S_, -8.6 * S_, 1.6 * S_, 0, Math.PI * 1.5); ctx.stroke();
      /* four vine legs with leafy feet */
      [[-9, 1, dvine], [5, -1, dvine], [-5, -1, vine], [9, 1, vine]].forEach(([lx, ph, c]) => {
        ctx.strokeStyle = c; ctx.lineWidth = 2.6 * S_;
        const fx = lx * S_ + step * ph * 3 * S_;
        ctx.beginPath(); ctx.moveTo(lx * S_, -9 * S_); ctx.bezierCurveTo(lx * S_ - 2 * S_, -5 * S_, fx + 2 * S_, -3 * S_, fx, 0); ctx.stroke();
        ctx.fillStyle = '#5a8a34'; ell(ctx, fx + 1.4 * S_, -0.4 * S_, 2.2 * S_, 1 * S_, 0.2); ctx.fill();
      });
      /* the pumpkin body, deeply ribbed */
      ctx.fillStyle = radial(ctx, 2 * S_, -16 * S_, 14 * S_, shade(body, 40), shade(body, -45)); ell(ctx, 0, -14 * S_, 13 * S_, 8.5 * S_); ctx.fill(); outline(ctx, 1.1 * S_);
      ctx.strokeStyle = rgba('#7a3608', 0.6); ctx.lineWidth = 1 * S_;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(i * 3.6 * S_, -14 * S_, 1.8 * S_, 8 * S_, 0, -1.35, 1.35); ctx.stroke(); }
      /* saddle blanket in the hero's colour, and a strap */
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-7 * S_, -21 * S_); ctx.quadraticCurveTo(0, -23 * S_, 7 * S_, -21 * S_); ctx.lineTo(6 * S_, -11 * S_); ctx.quadraticCurveTo(0, -9.5 * S_, -6 * S_, -11 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 0.8 * S_);
      ctx.strokeStyle = '#d9b87a'; ctx.lineWidth = 0.8 * S_; ctx.beginPath(); ctx.moveTo(-6.5 * S_, -12 * S_); ctx.quadraticCurveTo(0, -10.5 * S_, 6.5 * S_, -12 * S_); ctx.stroke();
      /* the head: a smaller pumpkin with a carved face, a stem and a leaf */
      const hx = 14 * S_, hy = -20 * S_ + Math.sin(t * 3) * 0.5 * S_;
      ctx.fillStyle = radial(ctx, hx, hy - 1 * S_, 6 * S_, shade(body, 45), shade(body, -35)); ell(ctx, hx, hy, 6.2 * S_, 5.2 * S_); ctx.fill(); outline(ctx, 0.9 * S_);
      ctx.strokeStyle = rgba('#7a3608', 0.6); ctx.lineWidth = 0.7 * S_; [-2.2, 0, 2.2].forEach(dx => { ctx.beginPath(); ctx.ellipse(hx + dx * S_, hy, 1 * S_, 4.8 * S_, 0, -1.3, 1.3); ctx.stroke(); });
      ctx.fillStyle = '#2a1206'; ctx.beginPath(); ctx.moveTo(hx + 1 * S_, hy - 1.6 * S_); ctx.lineTo(hx + 2.8 * S_, hy - 2.6 * S_); ctx.lineTo(hx + 2.6 * S_, hy - 0.6 * S_); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + 3.8 * S_, hy - 1.4 * S_); ctx.lineTo(hx + 5.2 * S_, hy - 2.4 * S_); ctx.lineTo(hx + 5 * S_, hy - 0.4 * S_); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + 0.8 * S_, hy + 1.4 * S_); ctx.lineTo(hx + 2 * S_, hy + 2.6 * S_); ctx.lineTo(hx + 3 * S_, hy + 1.8 * S_); ctx.lineTo(hx + 4 * S_, hy + 2.8 * S_); ctx.lineTo(hx + 5.4 * S_, hy + 1.4 * S_); ctx.lineTo(hx + 4 * S_, hy + 3.6 * S_); ctx.lineTo(hx + 2 * S_, hy + 3.6 * S_); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4a3a1a'; ctx.lineWidth = 1.6 * S_; ctx.beginPath(); ctx.moveTo(hx - 0.5 * S_, hy - 5 * S_); ctx.quadraticCurveTo(hx - 1 * S_, hy - 8 * S_, hx + 1.5 * S_, hy - 8.5 * S_); ctx.stroke();
      ctx.fillStyle = '#5a9a34'; ell(ctx, hx - 3.2 * S_, hy - 6.6 * S_, 2.8 * S_, 1.3 * S_, 0.5); ctx.fill(); outline(ctx, 0.5 * S_);
      /* reins */
      ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 0.7 * S_; ctx.beginPath(); ctx.moveTo(hx - 2 * S_, hy + 1 * S_); ctx.quadraticCurveTo(6 * S_, -20 * S_, 3 * S_, -24 * S_); ctx.stroke();
      ctx.translate(0, -11.5 * S_);   /* sat down into the saddle */
    }
    A.person(ctx, 0, 0, s * 0.82, hero.people, { color, look: hero.look, weapon: 'banner', t, noShadow: true });
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
    if (o.flash) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = rgba('#ffffff', o.flash * 0.6); ctx.fillRect(-60 * s / 30, -90 * s / 30, 120 * s / 30, 100 * s / 30); }
    ctx.restore();
  };
  const CREATURE = A.CREATURE = {};
  CREATURE.malsti = function (ctx, S_, t, o) {
    /* the smallest Punk, Duat-born: violet-dark pumpkin body, vine legs */
    const up = o.tint === 1; const body = up ? '#7a4aa5' : '#5a3a75', dark = '#241733';
    if (!o.noShadow) shadow(ctx, 9 * S_, 3 * S_);
    const hop = Math.abs(Math.sin(t * 5)) * 2 * S_;
    ctx.translate(0, -hop);
    ctx.strokeStyle = '#2f4a2a'; ctx.lineWidth = 1.6 * S_; ctx.lineCap = 'round';
    [[-5, 0.2], [-2, -0.3], [2, 0.3], [5, -0.2]].forEach(([lx, ph]) => { ctx.beginPath(); ctx.moveTo(lx * S_, -6 * S_); ctx.quadraticCurveTo(lx * S_ + Math.sin(t * 6 + ph * 9) * 1.5 * S_, -3 * S_, lx * 1.2 * S_, hop); ctx.stroke(); });
    ctx.fillStyle = radial(ctx, 0, -10 * S_, 9 * S_, shade(body, 40), dark); ell(ctx, 0, -10 * S_, 8.5 * S_, 6.5 * S_); ctx.fill(); outline(ctx, 1 * S_);
    ctx.strokeStyle = rgba('#1a0f24', 0.6); ctx.lineWidth = 0.8 * S_; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(i * 3 * S_, -10 * S_, 1.4 * S_, 6 * S_, 0, -1.2, 1.2); ctx.stroke(); }
    /* glowing Duat eyes */
    ctx.shadowColor = '#c9a8ff'; ctx.shadowBlur = 6 * S_; ctx.fillStyle = '#e6d8ff'; ell(ctx, 3 * S_, -11 * S_, 1.4 * S_, 1.1 * S_); ctx.fill(); ell(ctx, 6.2 * S_, -11.4 * S_, 1.2 * S_, 1 * S_); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#2f4a2a'; ctx.lineWidth = 1.3 * S_; ctx.beginPath(); ctx.moveTo(-1 * S_, -16 * S_); ctx.quadraticCurveTo(-3 * S_, -21 * S_, 1 * S_, -22 * S_); ctx.stroke();
    ctx.fillStyle = '#4a7a3a'; ell(ctx, 1.5 * S_, -22 * S_, 2 * S_, 1.1 * S_, -0.4); ctx.fill();
    /* a little sack of stolen gold */
    ctx.fillStyle = '#8a6a3a'; ell(ctx, -7 * S_, -7 * S_, 2.6 * S_, 2.4 * S_); ctx.fill(); outline(ctx, 0.7 * S_); ctx.fillStyle = '#e8c25a'; ell(ctx, -7 * S_, -9.4 * S_, 1 * S_, 0.7 * S_); ctx.fill();
    if (up) { ctx.globalAlpha *= 0.5; ctx.strokeStyle = '#c9a8ff'; ctx.lineWidth = 1 * S_; ctx.beginPath(); ctx.arc(0, -10 * S_, 11 * S_ + Math.sin(t * 4) * S_, 0, TAU); ctx.stroke(); ctx.globalAlpha /= 0.5; }
  };
  CREATURE.punk = function (ctx, S_, t, o) {
    const dom = o.tint === 2; const body = dom ? '#c86e2a' : '#b5562a';
    if (!o.noShadow) shadow(ctx, 13 * S_, 4 * S_);
    ctx.strokeStyle = '#3d5a22'; ctx.lineWidth = 2.2 * S_; ctx.lineCap = 'round';
    [[-8, 0], [-3, 1], [3, 2], [8, 3]].forEach(([lx, ph]) => { ctx.beginPath(); ctx.moveTo(lx * S_, -8 * S_); ctx.quadraticCurveTo(lx * S_ + Math.sin(t * 5 + ph) * 2 * S_, -3 * S_, lx * S_ + Math.sin(t * 5 + ph) * 2 * S_, 0); ctx.stroke(); });
    const w = dom ? 13 : 11;
    ctx.fillStyle = radial(ctx, 0, -13 * S_, w * S_, shade(body, 35), shade(body, -40)); ell(ctx, 0, -13 * S_, w * S_, 8 * S_); ctx.fill(); outline(ctx, 1.1 * S_);
    ctx.strokeStyle = rgba('#5a2a10', 0.6); ctx.lineWidth = 1 * S_; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(i * 4 * S_, -13 * S_, 2 * S_, 7.5 * S_, 0, -1.3, 1.3); ctx.stroke(); }
    ctx.fillStyle = '#1a1008'; ell(ctx, 8 * S_, -15 * S_, 1.2 * S_, 1.3 * S_); ctx.fill(); ell(ctx, 4.5 * S_, -15.5 * S_, 1.1 * S_, 1.2 * S_); ctx.fill();
    ctx.strokeStyle = '#1a1008'; ctx.lineWidth = 0.9 * S_; ctx.beginPath(); ctx.moveTo(4 * S_, -11 * S_); ctx.quadraticCurveTo(6.5 * S_, -9.5 * S_, 9 * S_, -11.5 * S_); ctx.stroke();
    ctx.strokeStyle = '#3d5a22'; ctx.lineWidth = 1.6 * S_; ctx.beginPath(); ctx.moveTo(0, -21 * S_); ctx.quadraticCurveTo(2 * S_, -25 * S_, 5 * S_, -25 * S_); ctx.stroke();
    ctx.fillStyle = '#5a8a34'; ell(ctx, -3 * S_, -22 * S_, 3 * S_, 1.5 * S_, 0.5); ctx.fill();
    /* vine arms */
    ctx.strokeStyle = '#3d5a22'; ctx.lineWidth = 1.6 * S_; ctx.beginPath(); ctx.moveTo(9 * S_, -10 * S_); ctx.quadraticCurveTo(14 * S_, -12 * S_ + Math.sin(t * 4) * 2 * S_, 15 * S_, -6 * S_); ctx.stroke();
  };
  CREATURE.velnur = function (ctx, S_, t, o) {
    /* a mixed band: an Eikar, a Keilia, a Karnen, armed */
    const up = o.tint === 1, col = o.color || '#6a4ad0';
    const men = [[-7, 'keilia', 'axe', 2], [0, 'eikar', 'spear', 5], [7, 'karnen', 'sword', 9]];
    men.forEach(([dx, p, w, lk]) => A.person(ctx, dx * S_, (lk % 3) * 0.6 * S_, 22 * S_, p, { color: col, look: lk + (up ? 40 : 0), weapon: w, t: t + lk, armor: up, helm: up && p !== 'eikar', swing: o.pose === 'attack' ? 0.9 : 0 }));
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
    /* moon-folk: tall, robed, pale and calm, with a ward of Stygian */
    if (!o.noShadow) shadow(ctx, 10 * S_, 3 * S_);
    const glow = 0.5 + Math.sin(t * 2) * 0.2;
    ctx.fillStyle = lin(ctx, -10 * S_, -38 * S_, 10 * S_, 0, [[0, '#4a5288'], [1, '#1e2244']]);
    ctx.beginPath(); ctx.moveTo(-6 * S_, -32 * S_); ctx.quadraticCurveTo(-13 * S_, -14 * S_, -11 * S_, 0); ctx.lineTo(11 * S_, 0); ctx.quadraticCurveTo(13 * S_, -14 * S_, 6 * S_, -32 * S_); ctx.closePath(); ctx.fill(); outline(ctx, 1.1 * S_);
    ctx.strokeStyle = rgba('#c9d6ff', 0.4); ctx.lineWidth = 1 * S_; ctx.beginPath(); ctx.moveTo(0, -30 * S_); ctx.lineTo(0, -1 * S_); ctx.stroke();
    ctx.fillStyle = '#c9a24e'; for (let i = 0; i < 4; i++) { ell(ctx, 0, (-26 + i * 6) * S_, 1 * S_, 1 * S_); ctx.fill(); }
    /* the shield-staff */
    ctx.strokeStyle = '#8a8fb0'; ctx.lineWidth = 1.6 * S_; ctx.beginPath(); ctx.moveTo(10 * S_, 0); ctx.lineTo(10 * S_, -42 * S_); ctx.stroke();
    ctx.shadowColor = '#bcd0ff'; ctx.shadowBlur = 12 * S_ * glow; ctx.strokeStyle = rgba('#e8eeff', 0.9); ctx.lineWidth = 1.6 * S_; ctx.beginPath(); ctx.arc(10 * S_, -44 * S_, 4 * S_, Math.PI * 0.6, Math.PI * 2.4); ctx.stroke(); ctx.shadowBlur = 0;
    /* head with crescent */
    ctx.fillStyle = radial(ctx, 0, -36 * S_, 6 * S_, '#f0f4ff', '#a8b0d0'); ell(ctx, 0, -36 * S_, 5 * S_, 5.6 * S_); ctx.fill(); outline(ctx, 0.9 * S_);
    ctx.fillStyle = '#1a1a30'; ell(ctx, 2 * S_, -36 * S_, 0.8 * S_, 1 * S_); ctx.fill(); ell(ctx, 4 * S_, -36.2 * S_, 0.7 * S_, 0.9 * S_); ctx.fill();
    ctx.shadowColor = '#e8eeff'; ctx.shadowBlur = 8 * S_; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4 * S_; ctx.beginPath(); ctx.arc(-1 * S_, -42 * S_, 5 * S_, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.shadowBlur = 0;
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
    if (!o.noShadow) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, 0, 0, 24 * S_, 6 * S_); ctx.fill(); }
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

  /* a captain on the battlefield: a person with a banner */
  A.captain = function (ctx, x, y, s, cap, color, t, f, pose) {
    A.person(ctx, x, y, s, cap.people, { color, look: cap.look, weapon: cap.rank === 'naelst' ? 'staff' : cap.rank === 'thar' ? 'banner' : cap.people === 'keilia' ? 'hammer' : 'sword', t, f, helm: cap.rank === 'stamijan', armor: cap.level > 2, swing: pose === 'attack' ? 1 : 0 });
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
