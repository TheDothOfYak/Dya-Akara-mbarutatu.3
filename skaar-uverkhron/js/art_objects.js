/* ============================================================
   SKAAR UVERKHRON — js/art_objects.js
   Things on the adventure map: towns, mines, Urverk, places to
   visit, piles, chests, Relics, scrolls, memory cores, boats.
   (x, y) is the top-left of the tile you visit the object on;
   bigger objects reach up and left over their body tiles.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, A = SU.art;
  const TAU = Math.PI * 2, rgba = A.rgba, shade = A.shade, ell = A.ell, radial = A.radial, lin = A.lin, outline = A.outline;
  const cache = {};

  function cached(keyName, w, h, draw) {
    if (cache[keyName]) return cache[keyName];
    const c = A.canvas(w, h); draw(c.getContext('2d'));
    return (cache[keyName] = c);
  }
  function stoneWall(g, x, y, w, h, s, col) {
    g.fillStyle = lin(g, x, y, x, y + h, [[0, shade(col, 18)], [1, shade(col, -30)]]); g.fillRect(x, y, w, h);
    g.strokeStyle = rgba('#0c0a12', 0.45); g.lineWidth = 0.7 * s;
    for (let r = 0; r < h / (5 * s); r++) { const yy = y + r * 5 * s; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke();
      for (let k = (r % 2) * 4 * s; k < w; k += 8 * s) { g.beginPath(); g.moveTo(x + k, yy); g.lineTo(x + k, yy + 5 * s); g.stroke(); } }
    g.strokeStyle = 'rgba(10,8,14,0.85)'; g.lineWidth = 1.1 * s; g.strokeRect(x, y, w, h);
  }
  function crenels(g, x, y, w, s, col) { g.fillStyle = shade(col, 10); for (let k = 0; k < w; k += 6 * s) { g.fillRect(x + k, y - 3.5 * s, 3.6 * s, 3.5 * s); g.strokeStyle = 'rgba(10,8,14,0.7)'; g.lineWidth = 0.7 * s; g.strokeRect(x + k, y - 3.5 * s, 3.6 * s, 3.5 * s); } }
  function tower(g, x, y, w, h, s, col, roof, glow) {
    stoneWall(g, x, y - h, w, h, s, col);
    g.fillStyle = lin(g, x, y - h - w, x + w, y - h, [[0, shade(roof, 25)], [1, shade(roof, -30)]]);
    g.beginPath(); g.moveTo(x - 2 * s, y - h); g.lineTo(x + w / 2, y - h - w * 1.3); g.lineTo(x + w + 2 * s, y - h); g.closePath(); g.fill(); outline(g, 1 * s);
    if (glow) { g.shadowColor = glow; g.shadowBlur = 8 * s; g.fillStyle = A.mix(glow, '#ffffff', 0.4); for (let k = 0; k < 2; k++) { g.beginPath(); g.moveTo(x + w / 2 - 1.6 * s, y - h * (0.35 + k * 0.3)); g.lineTo(x + w / 2 - 1.6 * s, y - h * (0.35 + k * 0.3) - 4 * s); g.arc(x + w / 2, y - h * (0.35 + k * 0.3) - 4 * s, 1.6 * s, Math.PI, 0); g.lineTo(x + w / 2 + 1.6 * s, y - h * (0.35 + k * 0.3)); g.fill(); } g.shadowBlur = 0; }
  }

  /* ---------- the Duskareth town ---------- */
  A.town = function (ctx, o, x, y, ts, t, color) {
    const lvl = (o.built.includes('fort3') ? 3 : o.built.includes('fort2') ? 2 : o.built.includes('fort1') ? 1 : 0) + (o.built.includes('hall3') ? 2 : o.built.includes('hall2') ? 1 : 0);
    const c = cached('town' + lvl + '_' + ts, ts * 3.4, ts * 3.6, g => {
      const s = ts / 48, W = ts * 3.4, base = ts * 3.3, cx = W / 2;
      const stone = '#4a4560', roof = '#2a2440';
      g.fillStyle = 'rgba(0,0,0,0.32)'; ell(g, cx, base - 4 * s, W * 0.46, ts * 0.42); g.fill();
      /* the ground of the town: dark flagstones */
      g.fillStyle = lin(g, 0, base - ts * 0.8, 0, base, [[0, '#2a2438'], [1, '#1c1828']]); ell(g, cx, base - ts * 0.35, W * 0.44, ts * 0.38); g.fill();
      /* back keep and the great spire of the Duat */
      tower(g, cx - 14 * s, base - ts * 1.25, 28 * s, 54 * s + lvl * 6 * s, s, '#3e3956', roof, '#8e7cff');
      g.save(); g.shadowColor = '#8e7cff'; g.shadowBlur = 14 * s; g.fillStyle = lin(g, cx, base - ts * 3.3, cx, base - ts * 2, [[0, '#d9ccff'], [1, '#5d4fb0']]);
      g.beginPath(); g.moveTo(cx - 3 * s, base - ts * 1.25 - 54 * s - lvl * 6 * s - 30 * s); g.lineTo(cx, base - ts * 3.3); g.lineTo(cx + 3 * s, base - ts * 1.25 - 54 * s - lvl * 6 * s - 30 * s); g.fill(); g.restore();
      /* side towers */
      const nT = 2 + Math.min(2, lvl >> 1);
      for (let i = 0; i < nT; i++) { const side = i % 2 ? 1 : -1, k = i >> 1; tower(g, cx + side * (34 + k * 22) * s - 8 * s, base - ts * 0.85 + k * 6 * s, 16 * s, (34 + lvl * 5 - k * 6) * s, s, stone, roof, i < 2 ? '#b9a8ff' : null); }
      /* front wall with the gate */
      if (lvl >= 1) {
        const wy = base - ts * 0.62, wh = 18 * s + lvl * 2 * s;
        stoneWall(g, cx - 60 * s, wy - wh, 120 * s, wh, s, '#575170'); crenels(g, cx - 60 * s, wy - wh, 120 * s, s, '#575170');
      } else { g.strokeStyle = '#5a4a2a'; g.lineWidth = 2 * s; for (let k = -56; k <= 56; k += 6) { g.beginPath(); g.moveTo(cx + k * s, base - ts * 0.62); g.lineTo(cx + k * s, base - ts * 0.62 - 14 * s); g.stroke(); } }
      /* gate */
      g.fillStyle = '#0a0812'; g.beginPath(); g.moveTo(cx - 9 * s, base - ts * 0.62); g.lineTo(cx - 9 * s, base - ts * 0.62 - 14 * s); g.arc(cx, base - ts * 0.62 - 14 * s, 9 * s, Math.PI, 0); g.lineTo(cx + 9 * s, base - ts * 0.62); g.closePath(); g.fill();
      g.shadowColor = '#8e7cff'; g.shadowBlur = 12 * s; g.strokeStyle = rgba('#b9a8ff', 0.8); g.lineWidth = 1.4 * s; g.stroke(); g.shadowBlur = 0;
      g.strokeStyle = rgba('#6a5aa0', 0.6); g.lineWidth = 1 * s; for (let k = -6; k <= 6; k += 4) { g.beginPath(); g.moveTo(cx + k * s, base - ts * 0.62); g.lineTo(cx + k * s, base - ts * 0.62 - 20 * s); g.stroke(); }
      /* houses inside */
      for (let i = 0; i < 5; i++) { const hx = cx + (i - 2) * 18 * s, hy = base - ts * 0.95 - (i % 2) * 6 * s; g.fillStyle = shade('#3a3450', (i % 3) * 8); g.fillRect(hx - 6 * s, hy - 9 * s, 12 * s, 9 * s); g.fillStyle = '#231d33'; g.beginPath(); g.moveTo(hx - 8 * s, hy - 9 * s); g.lineTo(hx, hy - 16 * s); g.lineTo(hx + 8 * s, hy - 9 * s); g.fill(); g.fillStyle = '#ffcf6a'; g.fillRect(hx - 1.5 * s, hy - 6 * s, 3 * s, 3 * s); }
    });
    ctx.drawImage(c, x + ts / 2 - c.width / 2, y + ts - ts * 3.3);
    /* the owner's banners over the gate */
    A.flag(ctx, x + ts / 2 - ts * 0.9, y + ts * 0.15, ts * 0.42, color, t);
    A.flag(ctx, x + ts / 2 + ts * 0.7, y + ts * 0.15, ts * 0.42, color, t + 1);
  };

  /* ---------- mines ---------- */
  A.mine = function (ctx, o, x, y, ts, t, color) {
    const c = cached('mine' + o.kind + ts, ts * 2.4, ts * 2.4, g => {
      const s = ts / 48, W = ts * 2.4, cx = W / 2 - ts * 0.3, gy = ts * 2.15;
      g.fillStyle = 'rgba(0,0,0,0.28)'; ell(g, cx, gy - 6 * s, ts * 0.95, ts * 0.3); g.fill();
      const rockPile = (col, vein) => { [[-20, 0, 18], [6, -4, 22], [26, 2, 14]].forEach(([dx, dy, r]) => { g.fillStyle = radial(g, cx + dx * s, gy - 12 * s + dy * s, r * s, shade(col, 30), shade(col, -35)); g.beginPath(); g.moveTo(cx + (dx - r) * s, gy - 4 * s); g.quadraticCurveTo(cx + (dx - r * 0.6) * s, gy - (12 + r) * s + dy * s, cx + dx * s, gy - (14 + r) * s + dy * s); g.quadraticCurveTo(cx + (dx + r * 0.8) * s, gy - (8 + r * 0.6) * s, cx + (dx + r) * s, gy - 4 * s); g.closePath(); g.fill(); outline(g, 1 * s); });
        if (vein) { g.shadowColor = vein; g.shadowBlur = 8 * s; g.strokeStyle = vein; g.lineWidth = 1.6 * s; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(cx + (-24 + i * 11) * s, gy - (10 + (i % 2) * 8) * s); g.lineTo(cx + (-20 + i * 11) * s, gy - (18 + (i % 3) * 6) * s); g.lineTo(cx + (-16 + i * 11) * s, gy - (14 + (i % 2) * 5) * s); g.stroke(); } g.shadowBlur = 0; } };
      const shaft = () => { g.fillStyle = '#0c0a08'; g.beginPath(); g.moveTo(cx - 8 * s, gy - 6 * s); g.lineTo(cx - 8 * s, gy - 18 * s); g.arc(cx, gy - 18 * s, 8 * s, Math.PI, 0); g.lineTo(cx + 8 * s, gy - 6 * s); g.fill(); g.strokeStyle = '#6a4a2a'; g.lineWidth = 2.4 * s; g.beginPath(); g.moveTo(cx - 9 * s, gy - 6 * s); g.lineTo(cx - 9 * s, gy - 26 * s); g.lineTo(cx + 9 * s, gy - 26 * s); g.lineTo(cx + 9 * s, gy - 6 * s); g.stroke(); };
      const hut = (hx, col) => { g.fillStyle = lin(g, 0, gy - 26 * s, 0, gy, [[0, shade(col, 20)], [1, shade(col, -30)]]); g.fillRect(hx - 12 * s, gy - 20 * s, 24 * s, 16 * s); outline(g, 1 * s); g.fillStyle = '#5a2a1a'; g.beginPath(); g.moveTo(hx - 15 * s, gy - 20 * s); g.lineTo(hx, gy - 32 * s); g.lineTo(hx + 15 * s, gy - 20 * s); g.closePath(); g.fill(); outline(g, 1 * s); g.fillStyle = '#ffcf6a'; g.fillRect(hx - 3 * s, gy - 15 * s, 5 * s, 5 * s); };
      switch (o.kind) {
        case 'gold': rockPile('#7a6a54', '#ffd24a'); shaft(); g.fillStyle = '#5a3a20'; g.fillRect(cx + 14 * s, gy - 12 * s, 14 * s, 7 * s); A.resIcon(g, 'gold', cx + 21 * s, gy - 14 * s, 10 * s); break;
        case 'wood': hut(cx + 6 * s, '#7a5a34'); for (let i = 0; i < 4; i++) { g.fillStyle = lin(g, 0, 0, 0, 6 * s, [[0, '#9a6a3a'], [1, '#5a3a1a']]); g.fillRect(cx - 34 * s, gy - (8 + i * 5) * s, 22 * s, 5 * s); outline(g, 0.7 * s); g.fillStyle = '#c99a5a'; ell(g, cx - 12 * s, gy - (5.5 + i * 5) * s, 2.4 * s, 2.4 * s); g.fill(); } break;
        case 'stone': rockPile('#8a8478'); for (let i = 0; i < 3; i++) { g.fillStyle = lin(g, 0, 0, 0, 1, [[0, '#d0ccc0'], [1, '#8a8478']]); g.fillRect(cx + (8 + i * 9) * s, gy - 12 * s, 8 * s, 8 * s); outline(g, 0.8 * s); } g.strokeStyle = '#5a3a20'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(cx - 30 * s, gy - 4 * s); g.lineTo(cx - 24 * s, gy - 40 * s); g.lineTo(cx - 4 * s, gy - 36 * s); g.stroke(); g.beginPath(); g.moveTo(cx - 6 * s, gy - 36 * s); g.lineTo(cx - 6 * s, gy - 26 * s); g.stroke(); break;
        case 'food': for (let r = 0; r < 4; r++) { g.strokeStyle = r % 2 ? '#c9a24e' : '#9ab45a'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(cx - 36 * s, gy - (4 + r * 5) * s); g.lineTo(cx - 4 * s, gy - (6 + r * 5) * s); g.stroke(); } hut(cx + 14 * s, '#a8875a'); break;
        case 'stygian': rockPile('#3a3448', '#b9a8ff'); g.shadowColor = '#8e7cff'; g.shadowBlur = 12 * s; for (let i = 0; i < 3; i++) { const xx = cx + (-10 + i * 10) * s; g.fillStyle = lin(g, xx - 3 * s, 0, xx + 3 * s, 0, [[0, '#e6deff'], [1, '#5d4fb0']]); g.beginPath(); g.moveTo(xx - 3 * s, gy - 8 * s); g.lineTo(xx, gy - (26 + i * 4) * s); g.lineTo(xx + 3 * s, gy - 8 * s); g.fill(); } g.shadowBlur = 0; break;
        case 'ngakara': g.fillStyle = lin(g, 0, gy - 20 * s, 0, gy, [[0, '#2f7f8a'], [1, '#123a44']]); ell(g, cx, gy - 10 * s, 30 * s, 10 * s); g.fill(); g.strokeStyle = rgba('#9ff0ff', 0.6); g.lineWidth = 1.2 * s; g.stroke(); g.save(); g.translate(cx + 4 * s, gy - 6 * s); A.CREATURE.naga(g, 0.7 * s, 0, { noShadow: true }); g.restore(); break;
        case 'timber': for (let i = 0; i < 3; i++) { g.save(); g.translate(cx + (-20 + i * 18) * s, gy - (2 + (i % 2) * 4) * s); g.fillStyle = '#3a1a10'; g.fillRect(-2.5 * s, -14 * s, 5 * s, 14 * s); [[0, -26, 11], [-7, -20, 8], [7, -20, 8]].forEach(([a, b, r]) => { g.fillStyle = radial(g, a * s, b * s, r * s, '#ffb04a', '#a8301a'); ell(g, a * s, b * s, r * s, r * s * 0.9); g.fill(); }); g.restore(); } break;
        case 'glowmoss': g.fillStyle = radial(g, cx, gy - 16 * s, 26 * s, '#4a5a48', '#1e281e'); g.beginPath(); g.moveTo(cx - 30 * s, gy - 4 * s); g.quadraticCurveTo(cx - 26 * s, gy - 40 * s, cx, gy - 40 * s); g.quadraticCurveTo(cx + 28 * s, gy - 38 * s, cx + 30 * s, gy - 4 * s); g.fill(); outline(g, 1 * s); g.fillStyle = '#050805'; ell(g, cx, gy - 10 * s, 12 * s, 9 * s); g.fill(); g.shadowColor = '#9ff0a0'; g.shadowBlur = 10 * s; g.fillStyle = '#c9ffc0'; for (let i = 0; i < 10; i++) { ell(g, cx + Math.cos(i * 1.7) * 22 * s, gy - 20 * s + Math.sin(i * 2.3) * 14 * s, 1.6 * s, 1.2 * s); g.fill(); } g.shadowBlur = 0; break;
      }
    });
    ctx.drawImage(c, x - ts * 0.9, y + ts * 0.95 - ts * 2.15);
    if (o.owner >= 0 || o.owner === -1) A.flag(ctx, x + ts * 0.75, y + ts * 0.7, ts * 0.36, o.owner >= 0 ? color : '#8a8478', t);
  };

  /* ---------- Urverk: portal arches ---------- */
  A.urverk = function (ctx, o, x, y, ts, t, open) {
    const s = ts / 48, cx = x + ts / 2, gy = y + ts * 0.9;
    const col = { aligned: '#6fb4ff', toll: '#e8c25a', danger: '#ff5a4a', always: '#b9a8ff', kalo: '#e8eeff' }[o.kind] || '#b9a8ff';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ell(ctx, cx, gy, ts * 1.3, ts * 0.3); ctx.fill();
    /* the stone ring */
    const R = ts * 0.95;
    ctx.lineWidth = 9 * s; ctx.strokeStyle = lin(ctx, cx - R, 0, cx + R, 0, [[0, '#8a8478'], [0.5, '#5a5650'], [1, '#3a3632']]);
    ctx.beginPath(); ctx.arc(cx, gy - R * 0.95, R, Math.PI * 0.92, Math.PI * 2.08); ctx.stroke();
    ctx.lineWidth = 1.2 * s; ctx.strokeStyle = 'rgba(10,8,6,0.8)'; ctx.beginPath(); ctx.arc(cx, gy - R * 0.95, R + 4.5 * s, Math.PI * 0.92, Math.PI * 2.08); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, gy - R * 0.95, R - 4.5 * s, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke();
    for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; ctx.fillStyle = rgba(col, 0.55 + (open ? 0.4 : 0)); ell(ctx, cx + Math.cos(a) * R, gy - R * 0.95 + Math.sin(a) * R, 1.8 * s, 1.8 * s); ctx.fill(); }
    /* the swirling Duat inside */
    if (open) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, gy - R * 0.85, R - 6 * s, R * 0.82, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = radial(ctx, cx, gy - R * 0.85, R, A.mix(col, '#ffffff', 0.5), '#120c24'); ctx.fillRect(cx - R, gy - R * 2, R * 2, R * 2);
      ctx.strokeStyle = rgba(col, 0.7); ctx.lineWidth = 1.6 * s;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); for (let k = 0; k < 40; k++) { const a = k * 0.32 + t * 1.5 + i * 1.57, r = k * 0.55 * s; const px = cx + Math.cos(a) * r, py = gy - R * 0.85 + Math.sin(a) * r * 0.85; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
      ctx.restore();
    } else { ctx.fillStyle = 'rgba(10,8,18,0.55)'; ell(ctx, cx, gy - R * 0.85, R - 6 * s, R * 0.82); ctx.fill(); }
    /* plinths */
    [-1, 1].forEach(sd => { ctx.fillStyle = lin(ctx, 0, gy - 10 * s, 0, gy, [[0, '#8a8478'], [1, '#4a4640']]); ctx.fillRect(cx + sd * R - 7 * s, gy - 10 * s, 14 * s, 10 * s); ctx.strokeStyle = 'rgba(10,8,6,0.8)'; ctx.lineWidth = 1 * s; ctx.strokeRect(cx + sd * R - 7 * s, gy - 10 * s, 14 * s, 10 * s); });
    if (o.kind === 'toll') { ctx.fillStyle = '#ffcf6a'; ctx.shadowColor = '#ffcf6a'; ctx.shadowBlur = 8 * s; ell(ctx, cx + R + 4 * s, gy - 18 * s, 2.6 * s, 3.4 * s); ctx.fill(); ctx.shadowBlur = 0; }
    if (o.kind === 'danger') { ctx.strokeStyle = rgba('#ff5a4a', 0.7); ctx.lineWidth = 1.2 * s; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - R * 0.6 + i * R * 0.6, gy - 2 * s); ctx.lineTo(cx - R * 0.5 + i * R * 0.6, gy + 4 * s); ctx.stroke(); } }
    if (o.kind === 'kalo') { ctx.strokeStyle = '#ffffff'; ctx.shadowColor = '#e8eeff'; ctx.shadowBlur = 8 * s; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(cx, gy - R * 2.05, 6 * s, Math.PI * 0.2, Math.PI * 1.4); ctx.stroke(); ctx.shadowBlur = 0; }
    if (!o.triggerKnown) { ctx.strokeStyle = 'rgba(30,20,20,0.9)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(cx - R * 0.6, gy - R * 1.4); ctx.lineTo(cx + R * 0.6, gy - R * 0.4); ctx.stroke(); }
    ctx.restore();
  };

  /* ---------- places to visit ---------- */
  A.visit = function (ctx, o, x, y, ts, t) {
    const s = ts / 48, cx = x + ts / 2, gy = y + ts * 0.86;
    ctx.save();
    const sh = (w) => { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ell(ctx, cx, gy, w * s, w * 0.3 * s); ctx.fill(); };
    const house = (hx, hy, w, h, wall, roof, lamp) => { ctx.fillStyle = lin(ctx, 0, hy - h, 0, hy, [[0, shade(wall, 20)], [1, shade(wall, -30)]]); ctx.fillRect(hx - w / 2, hy - h, w, h); outline(ctx, 1 * s); ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(hx - w / 2 - 3 * s, hy - h); ctx.lineTo(hx, hy - h - w * 0.55); ctx.lineTo(hx + w / 2 + 3 * s, hy - h); ctx.closePath(); ctx.fill(); outline(ctx, 1 * s); if (lamp) { ctx.shadowColor = lamp; ctx.shadowBlur = 8 * s; ctx.fillStyle = lamp; ctx.fillRect(hx - 2.5 * s, hy - h * 0.6, 5 * s, 5 * s); ctx.shadowBlur = 0; } };
    switch (o.kind) {
      case 'ring': sh(22); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; const px = cx + Math.cos(a) * 16 * s, py = gy - 6 * s + Math.sin(a) * 6 * s; ctx.fillStyle = lin(ctx, px - 3 * s, 0, px + 3 * s, 0, [[0, '#a8a395'], [1, '#5f5a50']]); ctx.fillRect(px - 3 * s, py - 12 * s, 6 * s, 12 * s); outline(ctx, 0.8 * s); } break;
      case 'bulwark': sh(16); ctx.fillStyle = radial(ctx, cx, gy - 16 * s, 16 * s, '#b8b2a4', '#5a554c'); ctx.beginPath(); ctx.moveTo(cx - 13 * s, gy); ctx.lineTo(cx - 10 * s, gy - 26 * s); ctx.lineTo(cx + 4 * s, gy - 30 * s); ctx.lineTo(cx + 13 * s, gy - 20 * s); ctx.lineTo(cx + 12 * s, gy); ctx.closePath(); ctx.fill(); outline(ctx, 1 * s); ctx.strokeStyle = rgba('#c9a24e', 0.8); ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.arc(cx, gy - 16 * s, 5 * s, 0, TAU); ctx.stroke(); break;
      case 'banner': sh(12); A.flag(ctx, cx - 2 * s, gy, ts * 0.6, '#7a2a2a', 0.3); ctx.fillStyle = '#c9a24e'; ell(ctx, cx + 5 * s, gy - 2 * s, 3 * s, 2 * s); ctx.fill(); break;
      case 'library': sh(30); house(cx - ts * 0.3, gy, 40 * s, 22 * s, '#8a8fb0', '#3a3f68', '#e8eeff'); ctx.fillStyle = lin(ctx, 0, gy - 50 * s, 0, gy - 22 * s, [[0, '#e8eeff'], [1, '#6a6fa0']]); ctx.beginPath(); ctx.arc(cx - ts * 0.3, gy - 30 * s, 12 * s, Math.PI, 0); ctx.fill(); outline(ctx, 1 * s); break;
      case 'milestone': sh(9); ctx.fillStyle = lin(ctx, cx - 5 * s, 0, cx + 5 * s, 0, [[0, '#b0aa9c'], [1, '#6a655a']]); ctx.beginPath(); ctx.moveTo(cx - 5 * s, gy); ctx.lineTo(cx - 5 * s, gy - 16 * s); ctx.arc(cx, gy - 16 * s, 5 * s, Math.PI, 0); ctx.lineTo(cx + 5 * s, gy); ctx.fill(); outline(ctx, 0.9 * s); ctx.fillStyle = '#3a2a1a'; ctx.font = (7 * s) + 'px Georgia'; ctx.textAlign = 'center'; ctx.fillText('ᚫ', cx, gy - 10 * s); break;
      case 'maze': sh(22); ctx.fillStyle = '#2f5a2a'; for (let i = 0; i < 4; i++) { ctx.fillRect(cx - 20 * s + i * 2 * s, gy - 4 * s - i * 4 * s, 40 * s - i * 4 * s, 3 * s); } ctx.fillStyle = '#3f7a34'; ctx.fillRect(cx - 20 * s, gy - 18 * s, 4 * s, 16 * s); ctx.fillRect(cx + 16 * s, gy - 18 * s, 4 * s, 16 * s); break;
      case 'tower': sh(18); ctx.fillStyle = lin(ctx, cx - ts * 0.5 - 8 * s, 0, cx - ts * 0.5 + 8 * s, 0, [[0, '#9a8a6a'], [1, '#5a4a3a']]); ctx.fillRect(cx - ts * 0.5 - 8 * s, gy - 56 * s, 16 * s, 56 * s); outline(ctx, 1 * s); ctx.fillStyle = '#4a2a1a'; ctx.beginPath(); ctx.moveTo(cx - ts * 0.5 - 12 * s, gy - 56 * s); ctx.lineTo(cx - ts * 0.5, gy - 72 * s); ctx.lineTo(cx - ts * 0.5 + 12 * s, gy - 56 * s); ctx.fill(); outline(ctx, 1 * s); ctx.fillStyle = '#ffcf6a'; ctx.fillRect(cx - ts * 0.5 - 2 * s, gy - 46 * s, 4 * s, 6 * s); break;
      case 'spring': sh(18); ctx.fillStyle = lin(ctx, 0, gy - 12 * s, 0, gy, [[0, '#5ab4e8'], [1, '#1c4566']]); ell(ctx, cx, gy - 5 * s, 16 * s, 6 * s); ctx.fill(); ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 3 * s; ctx.stroke(); ctx.fillStyle = rgba('#e0f4ff', 0.8 + Math.sin(t * 3) * 0.2); for (let i = 0; i < 3; i++) { ell(ctx, cx + Math.sin(t * 2 + i * 2) * 8 * s, gy - 8 * s - ((t * 10 + i * 7) % 14) * s, 1.2 * s, 1.2 * s); ctx.fill(); } break;
      case 'camp': sh(22); [[-10, '#8a6a4a'], [10, '#7a5a3a']].forEach(([dx, c]) => { ctx.fillStyle = lin(ctx, cx + dx * s - 10 * s, 0, cx + dx * s + 10 * s, 0, [[0, shade(c, 20)], [1, shade(c, -30)]]); ctx.beginPath(); ctx.moveTo(cx + dx * s - 10 * s, gy - 2 * s); ctx.lineTo(cx + dx * s, gy - 20 * s); ctx.lineTo(cx + dx * s + 10 * s, gy - 2 * s); ctx.closePath(); ctx.fill(); outline(ctx, 0.9 * s); });
        ctx.fillStyle = '#ff8a3a'; ctx.shadowColor = '#ffaa4a'; ctx.shadowBlur = 10 * s; ctx.beginPath(); ctx.moveTo(cx - 3 * s, gy + 2 * s); ctx.quadraticCurveTo(cx, gy - 8 * s - Math.sin(t * 9) * 2 * s, cx + 3 * s, gy + 2 * s); ctx.fill(); ctx.shadowBlur = 0; break;
      case 'songstone': sh(10); ctx.fillStyle = lin(ctx, cx - 6 * s, 0, cx + 6 * s, 0, [[0, '#7a7a90'], [1, '#3a3a4a']]); ctx.beginPath(); ctx.moveTo(cx - 7 * s, gy); ctx.lineTo(cx - 5 * s, gy - 28 * s); ctx.lineTo(cx + 2 * s, gy - 32 * s); ctx.lineTo(cx + 7 * s, gy - 24 * s); ctx.lineTo(cx + 6 * s, gy); ctx.closePath(); ctx.fill(); outline(ctx, 1 * s); ctx.shadowColor = '#9ff0a0'; ctx.shadowBlur = 8 * s; ctx.strokeStyle = rgba('#c9ffc0', 0.7 + Math.sin(t * 2) * 0.3); ctx.lineWidth = 1 * s; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 3 * s, gy - (6 + i * 6) * s); ctx.lineTo(cx + 3 * s, gy - (8 + i * 6) * s); ctx.stroke(); } ctx.shadowBlur = 0; break;
      case 'seer': sh(14); ctx.fillStyle = lin(ctx, 0, gy - 20 * s, 0, gy, [[0, '#8a7a5a'], [1, '#4a3a2a']]); ctx.beginPath(); ctx.moveTo(cx - 13 * s, gy); ctx.quadraticCurveTo(cx - 14 * s, gy - 18 * s, cx, gy - 22 * s); ctx.quadraticCurveTo(cx + 14 * s, gy - 18 * s, cx + 13 * s, gy); ctx.fill(); outline(ctx, 1 * s); ctx.fillStyle = '#0a0806'; ell(ctx, cx, gy - 6 * s, 4 * s, 6 * s); ctx.fill(); ctx.fillStyle = '#c9a8ff'; ctx.shadowColor = '#c9a8ff'; ctx.shadowBlur = 6 * s; ell(ctx, cx, gy - 24 * s, 2 * s, 2 * s); ctx.fill(); ctx.shadowBlur = 0; break;
      case 'trainer': sh(14); ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(cx, gy); ctx.lineTo(cx, gy - 26 * s); ctx.moveTo(cx - 10 * s, gy - 18 * s); ctx.lineTo(cx + 10 * s, gy - 18 * s); ctx.stroke(); ctx.fillStyle = '#c9a24e'; ell(ctx, cx, gy - 27 * s, 4 * s, 4 * s); ctx.fill(); outline(ctx, 0.8 * s); break;
      case 'tavern': sh(20); house(cx, gy, 34 * s, 20 * s, '#8a6a44', '#5a2a1a', '#ffcf6a'); ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(cx + 17 * s, gy - 18 * s); ctx.lineTo(cx + 24 * s, gy - 18 * s); ctx.stroke(); ctx.fillStyle = '#ffcf6a'; ctx.shadowColor = '#ffcf6a'; ctx.shadowBlur = 8 * s; ell(ctx, cx + 24 * s, gy - 14 * s, 2.4 * s, 3 * s); ctx.fill(); ctx.shadowBlur = 0; break;
      case 'fair': sh(30); [['#c43a3a', -18], ['#d0a23a', 4], ['#3a6fd0', 24]].forEach(([c, dx], i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(cx - ts * 0.4 + dx * s - 11 * s, gy - 4 * s); ctx.lineTo(cx - ts * 0.4 + dx * s, gy - 26 * s - i * 2 * s); ctx.lineTo(cx - ts * 0.4 + dx * s + 11 * s, gy - 4 * s); ctx.closePath(); ctx.fill(); outline(ctx, 0.9 * s); ctx.fillStyle = '#f0e6c8'; ctx.beginPath(); ctx.moveTo(cx - ts * 0.4 + dx * s - 4 * s, gy - 4 * s); ctx.lineTo(cx - ts * 0.4 + dx * s, gy - 14 * s); ctx.lineTo(cx - ts * 0.4 + dx * s + 4 * s, gy - 4 * s); ctx.fill(); }); break;
      case 'shipyard': sh(20); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(cx - 18 * s, gy - 8 * s, 36 * s, 5 * s); for (let i = -2; i <= 2; i++) ctx.fillRect(cx + i * 8 * s - 1.5 * s, gy - 8 * s, 3 * s, 12 * s); ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(cx - 10 * s, gy - 8 * s); ctx.quadraticCurveTo(cx, gy - 22 * s, cx + 12 * s, gy - 8 * s); ctx.stroke(); break;
      case 'shrine': {
        sh(30); const sx = cx - ts * 0.3;
        ctx.fillStyle = lin(ctx, 0, gy - 10 * s, 0, gy, [[0, '#e8e6f0'], [1, '#9a98b0']]); ctx.fillRect(sx - 24 * s, gy - 8 * s, 48 * s, 8 * s); outline(ctx, 1 * s);
        [-16, 16].forEach(dx => { ctx.fillStyle = lin(ctx, sx + dx * s - 4 * s, 0, sx + dx * s + 4 * s, 0, [[0, '#ffffff'], [1, '#a8a6c0']]); ctx.fillRect(sx + dx * s - 4 * s, gy - 40 * s, 8 * s, 32 * s); outline(ctx, 0.9 * s); });
        ctx.fillStyle = '#d8d6e6'; ctx.beginPath(); ctx.moveTo(sx - 24 * s, gy - 40 * s); ctx.lineTo(sx, gy - 52 * s); ctx.lineTo(sx + 24 * s, gy - 40 * s); ctx.closePath(); ctx.fill(); outline(ctx, 1 * s);
        ctx.shadowColor = '#bcd0ff'; ctx.shadowBlur = 16 * s; ctx.fillStyle = radial(ctx, sx, gy - 24 * s, 9 * s, '#ffffff', '#8a9ad8'); ell(ctx, sx, gy - 24 * s + Math.sin(t * 2) * 2 * s, 7 * s, 7 * s); ctx.fill(); ctx.shadowBlur = 0;
        break; }
    }
    ctx.restore();
  };

  /* ---------- small things ---------- */
  A.pile = function (ctx, o, x, y, ts, t) {
    const s = ts / 48, cx = x + ts / 2, gy = y + ts * 0.72;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, cx, gy + 4 * s, 12 * s, 4 * s); ctx.fill();
    A.resIcon(ctx, o.res, cx - 4 * s, gy, 13 * s); A.resIcon(ctx, o.res, cx + 5 * s, gy + 2 * s, 11 * s);
    const sp = (Math.sin(t * 2 + x) + 1) / 2; if (sp > 0.85) { ctx.fillStyle = rgba('#ffffff', (sp - 0.85) * 6); ctx.beginPath(); ctx.moveTo(cx + 6 * s, gy - 14 * s); ctx.lineTo(cx + 7 * s, gy - 11 * s); ctx.lineTo(cx + 10 * s, gy - 10 * s); ctx.lineTo(cx + 7 * s, gy - 9 * s); ctx.lineTo(cx + 6 * s, gy - 6 * s); ctx.lineTo(cx + 5 * s, gy - 9 * s); ctx.lineTo(cx + 2 * s, gy - 10 * s); ctx.lineTo(cx + 5 * s, gy - 11 * s); ctx.fill(); }
  };
  A.chest = function (ctx, o, x, y, ts, t) {
    const s = ts / 48, cx = x + ts / 2, gy = y + ts * 0.78;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, cx, gy + 2 * s, 13 * s, 4 * s); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, gy - 12 * s, 0, gy, [[0, '#9a6a3a'], [1, '#5a3a1a']]); ctx.fillRect(cx - 11 * s, gy - 11 * s, 22 * s, 11 * s); outline(ctx, 1 * s);
    ctx.fillStyle = lin(ctx, 0, gy - 20 * s, 0, gy - 11 * s, [[0, '#b07a44'], [1, '#6a4422']]); ctx.beginPath(); ctx.moveTo(cx - 11 * s, gy - 11 * s); ctx.quadraticCurveTo(cx, gy - 22 * s, cx + 11 * s, gy - 11 * s); ctx.closePath(); ctx.fill(); outline(ctx, 1 * s);
    ctx.strokeStyle = '#d9b87a'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(cx - 6 * s, gy - 17 * s); ctx.lineTo(cx - 6 * s, gy); ctx.moveTo(cx + 6 * s, gy - 17 * s); ctx.lineTo(cx + 6 * s, gy); ctx.stroke();
    ctx.fillStyle = '#ffd86a'; ctx.fillRect(cx - 2 * s, gy - 13 * s, 4 * s, 4 * s);
  };
  A.relicOnGround = function (ctx, o, x, y, ts, t) {
    const s = ts / 48, cx = x + ts / 2, gy = y + ts * 0.8, r = D.RELICS[o.relic];
    const col = D.RARE_COLOR[r.rare];
    ctx.fillStyle = lin(ctx, 0, gy - 8 * s, 0, gy, [[0, '#8a8478'], [1, '#4a4640']]); ctx.fillRect(cx - 8 * s, gy - 8 * s, 16 * s, 8 * s); outline(ctx, 0.9 * s);
    ctx.shadowColor = col; ctx.shadowBlur = 14 * s; A.relicIcon(ctx, o.relic, cx, gy - 16 * s + Math.sin(t * 2) * 2 * s, 18 * s); ctx.shadowBlur = 0;
  };
  A.scroll = function (ctx, o, x, y, ts, t) {
    const s = ts / 48, cx = x + ts / 2, gy = y + ts * 0.74;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, cx, gy + 4 * s, 10 * s, 3 * s); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, gy - 6 * s, 0, gy + 4 * s, [[0, '#f4e8c8'], [1, '#c9b48a']]); ctx.fillRect(cx - 10 * s, gy - 5 * s, 20 * s, 9 * s); outline(ctx, 0.8 * s);
    ctx.fillStyle = '#b8a070'; ell(ctx, cx - 10 * s, gy - 0.5 * s, 2.6 * s, 4.6 * s); ctx.fill(); ell(ctx, cx + 10 * s, gy - 0.5 * s, 2.6 * s, 4.6 * s); ctx.fill();
    ctx.fillStyle = '#7a2a2a'; ell(ctx, cx, gy - 0.5 * s, 2.4 * s, 2.4 * s); ctx.fill();
  };
  A.coreOnGround = function (ctx, o, x, y, ts, t) {
    const s = ts / 48, cx = x + ts / 2, cy = y + ts * 0.5 + Math.sin(t * 2) * 2 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, cx, y + ts * 0.86, 9 * s, 3 * s); ctx.fill();
    A.coreIcon(ctx, cx, cy, 13 * s, t, o.kind);
  };
  A.coreIcon = function (ctx, cx, cy, r, t, kind) {
    ctx.save(); ctx.shadowColor = '#bcd0ff'; ctx.shadowBlur = r;
    ctx.fillStyle = radial(ctx, cx, cy, r, '#ffffff', kind === 'captain' ? '#8a6a3a' : '#5d4fb0'); ell(ctx, cx, cy, r * 0.7, r * 0.7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba('#ffffff', 0.7); ctx.lineWidth = Math.max(1, r * 0.08);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.95, r * 0.35, t * 0.8 + i * 1.05, 0, TAU); ctx.stroke(); }
    ctx.restore();
  };
  A.boat = function (ctx, o, x, y, ts, t, color) {
    const s = ts / 48, cx = x + ts / 2, gy = y + ts * 0.7 + Math.sin(t * 2) * 1.5 * s;
    ctx.fillStyle = lin(ctx, 0, gy - 6 * s, 0, gy + 4 * s, [[0, '#8a5a2a'], [1, '#4a2a10']]); ctx.beginPath(); ctx.moveTo(cx - 18 * s, gy - 4 * s); ctx.quadraticCurveTo(cx, gy + 8 * s, cx + 18 * s, gy - 4 * s); ctx.closePath(); ctx.fill(); outline(ctx, 1 * s);
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(cx, gy - 4 * s); ctx.lineTo(cx, gy - 30 * s); ctx.stroke();
    ctx.fillStyle = '#efe6cc'; ctx.beginPath(); ctx.moveTo(cx + 1 * s, gy - 29 * s); ctx.quadraticCurveTo(cx + 14 * s, gy - 18 * s, cx + 1 * s, gy - 7 * s); ctx.fill(); outline(ctx, 0.8 * s);
    if (color) { ctx.fillStyle = color; ctx.fillRect(cx, gy - 32 * s, 7 * s, 4 * s); }
  };

  /* ---------- Relic icons ---------- */
  A.relicIcon = function (ctx, rid, cx, cy, sz) {
    const r = D.RELICS[rid]; if (!r) return; const s = sz / 20, col = D.RARE_COLOR[r.rare];
    ctx.save(); ctx.translate(cx, cy);
    const metal = lin(ctx, -8 * s, -8 * s, 8 * s, 8 * s, [[0, '#f0f0f6'], [1, '#7a7f8a']]);
    switch (r.slot) {
      case 'head': ctx.fillStyle = rid === 'aagac' ? radial(ctx, 0, 0, 10 * s, '#8a6a3a', '#3a2a14') : rid === 'ringcrown' ? lin(ctx, 0, -8 * s, 0, 4 * s, [[0, '#ffe08a'], [1, '#a8802a']]) : lin(ctx, 0, -8 * s, 0, 6 * s, [[0, '#4a4060'], [1, '#1e1a2a']]);
        if (rid === 'ringcrown') { ctx.beginPath(); ctx.moveTo(-8 * s, 4 * s); ctx.lineTo(-8 * s, -4 * s); ctx.lineTo(-4 * s, 0); ctx.lineTo(0, -7 * s); ctx.lineTo(4 * s, 0); ctx.lineTo(8 * s, -4 * s); ctx.lineTo(8 * s, 4 * s); ctx.closePath(); ctx.fill(); outline(ctx, 0.8 * s); ctx.fillStyle = '#8e7cff'; ell(ctx, 0, 1 * s, 1.8 * s, 1.8 * s); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(0, 2 * s, 9 * s, 7 * s, 0, Math.PI, TAU); ctx.fill(); outline(ctx, 0.8 * s); } break;
      case 'neck': ctx.strokeStyle = rid === 'naganeck' ? '#5fd3c6' : '#c9a24e'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(0, -3 * s, 7 * s, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.fillStyle = rid === 'tooth' ? '#f0ece0' : rid === 'memstone' ? '#b9a8ff' : col; ell(ctx, 0, 5 * s, 3 * s, 3.6 * s); ctx.fill(); outline(ctx, 0.7 * s); break;
      case 'body': ctx.fillStyle = rid === 'leathers' ? lin(ctx, 0, -8 * s, 0, 8 * s, [[0, '#9a6a3a'], [1, '#5a3a1a']]) : rid === 'duskmantle' ? lin(ctx, 0, -8 * s, 0, 8 * s, [[0, '#5a4a8a'], [1, '#1e1a3a']]) : metal; ctx.beginPath(); ctx.moveTo(-8 * s, -6 * s); ctx.lineTo(-4 * s, -8 * s); ctx.lineTo(4 * s, -8 * s); ctx.lineTo(8 * s, -6 * s); ctx.lineTo(6 * s, 8 * s); ctx.lineTo(-6 * s, 8 * s); ctx.closePath(); ctx.fill(); outline(ctx, 0.8 * s); break;
      case 'hand': ctx.rotate(-0.7); if (rid === 'saklay') { ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(-2 * s, 0, 9 * s, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 0.6 * s; ctx.beginPath(); ctx.moveTo(1.6 * s, -8.4 * s); ctx.lineTo(1.6 * s, 8.4 * s); ctx.stroke(); }
        else { ctx.strokeStyle = metal; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.moveTo(0, 8 * s); ctx.lineTo(0, -10 * s); ctx.stroke(); ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(-3 * s, 5 * s); ctx.lineTo(3 * s, 5 * s); ctx.stroke(); if (rid === 'tuun') { ctx.shadowColor = '#8e7cff'; ctx.shadowBlur = 6 * s; ctx.strokeStyle = '#c9b8ff'; ctx.lineWidth = 0.8 * s; ctx.beginPath(); ctx.moveTo(0, 3 * s); ctx.lineTo(0, -9 * s); ctx.stroke(); } } break;
      case 'off': ctx.fillStyle = rid === 'moonshield' ? radial(ctx, 0, 0, 10 * s, '#ffffff', '#8a8fb0') : radial(ctx, 0, 0, 10 * s, '#d88a4a', '#7a3a14'); ctx.beginPath(); ctx.moveTo(-8 * s, -7 * s); ctx.lineTo(8 * s, -7 * s); ctx.quadraticCurveTo(8 * s, 6 * s, 0, 10 * s); ctx.quadraticCurveTo(-8 * s, 6 * s, -8 * s, -7 * s); ctx.fill(); outline(ctx, 0.8 * s); break;
      case 'feet': ctx.fillStyle = rid === 'duatboots' ? lin(ctx, 0, -8 * s, 0, 8 * s, [[0, '#5a4a8a'], [1, '#2a1e4a']]) : lin(ctx, 0, -8 * s, 0, 8 * s, [[0, '#8a6a4a'], [1, '#4a3020']]); ctx.beginPath(); ctx.moveTo(-5 * s, -8 * s); ctx.lineTo(1 * s, -8 * s); ctx.lineTo(1 * s, 3 * s); ctx.lineTo(8 * s, 5 * s); ctx.lineTo(8 * s, 8 * s); ctx.lineTo(-5 * s, 8 * s); ctx.closePath(); ctx.fill(); outline(ctx, 0.8 * s); break;
      case 'ring': ctx.strokeStyle = lin(ctx, -6 * s, 0, 6 * s, 0, [[0, '#ffe08a'], [1, '#a8802a']]); ctx.lineWidth = 2.4 * s; ctx.beginPath(); ctx.arc(0, 2 * s, 6 * s, 0, TAU); ctx.stroke(); ctx.fillStyle = rid === 'eyering' ? '#6fb4ff' : rid === 'breathring' ? '#9ff0a0' : '#8a8478'; ell(ctx, 0, -5 * s, 3 * s, 3 * s); ctx.fill(); outline(ctx, 0.7 * s); break;
      default: ctx.fillStyle = rid === 'glowlamp' ? radial(ctx, 0, 0, 9 * s, '#e0ffe0', '#3a6a3a') : rid === 'stormglass' ? radial(ctx, 0, 0, 9 * s, '#e0f4ff', '#3a6a9a') : rid === 'aerolfeather' ? lin(ctx, 0, -10 * s, 0, 10 * s, [[0, '#ffe08a'], [1, '#c96a2a']]) : rid === 'songbook' || rid === 'purse' ? lin(ctx, 0, -8 * s, 0, 8 * s, [[0, '#8a3a2a'], [1, '#4a1a10']]) : radial(ctx, 0, 0, 9 * s, '#c9b8ff', '#4a3a8a');
        if (rid === 'aerolfeather') { ctx.beginPath(); ctx.moveTo(0, 10 * s); ctx.quadraticCurveTo(-8 * s, -2 * s, 0, -10 * s); ctx.quadraticCurveTo(8 * s, -2 * s, 0, 10 * s); ctx.fill(); }
        else if (rid === 'songbook' || rid === 'purse') { ctx.fillRect(-7 * s, -8 * s, 14 * s, 16 * s); ctx.strokeStyle = '#d9b87a'; ctx.lineWidth = 0.8 * s; ctx.strokeRect(-5 * s, -6 * s, 10 * s, 12 * s); }
        else { ell(ctx, 0, 0, 7 * s, 8 * s); ctx.fill(); }
        outline(ctx, 0.8 * s);
    }
    ctx.restore();
  };

  /* draw any map object */
  A.object = function (ctx, st, o, x, y, ts, t) {
    const color = o.owner >= 0 ? st.players[o.owner].color : D.NEUTRAL_COLOR;
    switch (o.type) {
      case 'town': return A.town(ctx, o, x, y, ts, t, color);
      case 'mine': return A.mine(ctx, o, x, y, ts, t, color);
      case 'urverk': return A.urverk(ctx, o, x, y, ts, t, SU.rules.urverkOpen(st, o) && o.triggerKnown);
      case 'visit': return A.visit(ctx, o, x, y, ts, t);
      case 'pile': return A.pile(ctx, o, x, y, ts, t);
      case 'chest': return A.chest(ctx, o, x, y, ts, t);
      case 'relic': return A.relicOnGround(ctx, o, x, y, ts, t);
      case 'scroll': return A.scroll(ctx, o, x, y, ts, t);
      case 'core': return A.coreOnGround(ctx, Object.assign({ kind: st.cores[o.core] && st.cores[o.core].kind }, o), x, y, ts, t);
      case 'boat': return A.boat(ctx, o, x, y, ts, t, color);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
