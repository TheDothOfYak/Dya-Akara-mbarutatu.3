/* ============================================================
   SKAAR UVERKHRON — js/view_town.js
   The town screen: a painted Duskareth town where every building
   you raise appears in the picture (click it), and panels below
   for building, recruiting, heroes and training, the garrison
   and the vault.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, RU = SU.rules, M = SU.make, A = SU.art, V = SU.mapView;
  const U = SU.ui, el = U.el, btn = U.btn, DL = SU.dialogs;
  const T = SU.townView = {};
  const VW = 1600, VH = 900;
  const TAU = Math.PI * 2, rgba = A.rgba, shade = A.shade, ell = A.ell, lin = A.lin, radial = A.radial, outline = A.outline;

  /* where each building stands in the picture (virtual 1600×900), and how it is drawn */
  const SPOT = {
    hall1: [800, 600, 'hall', 1], hall2: [800, 600, 'hall', 2], hall3: [800, 600, 'hall', 3],
    fort1: [800, 830, 'wall', 1], fort2: [800, 830, 'wall', 2], fort3: [800, 830, 'wall', 3],
    tavern: [1190, 690, 'inn'], market: [470, 720, 'stalls'], granary: [1360, 610, 'barn'], farms: [1430, 520, 'fields'],
    terraces: [250, 560, 'houses'], terraces2: [140, 640, 'stonehouses'],
    songs1: [620, 520, 'dome', 1], songs2: [620, 520, 'dome', 2], songs3: [620, 520, 'dome', 3], choir: [620, 520, 'dome', 4],
    t_drill: [1010, 740, 'yard'], t_road: [1460, 720, 'lodge'], t_count: [350, 620, 'counting'], t_capt: [1110, 570, 'lodge2'], t_duat: [700, 430, 'duattower'], t_pens: [1540, 610, 'pens'],
    woodyard: [1580, 760, 'lodge'], stoneyard: [120, 520, 'counting'], muster: [960, 800, 'yard'],
    vault: [905, 470, 'vault'], shipyard: [70, 790, 'dock'], urverk: [1250, 470, 'ring'], stygwell: [530, 610, 'well'], sanctum: [990, 410, 'sanctum'],
    d1: [300, 740, 'burrow'], d1u: [300, 740, 'burrow', 2], d2: [580, 790, 'barracks'], d2u: [580, 790, 'barracks', 2], d3: [1310, 420, 'spire'], d3u: [1310, 420, 'spire', 2],
    d4: [1050, 655, 'pool'], d4u: [1050, 655, 'pool', 2], d5: [420, 470, 'cloister'], d6: [1530, 430, 'roost'], d7: [210, 440, 'chapel'], d8: [1430, 400, 'crag'], d9: [800, 360, 'hole'],
  };
  const TAB_FOR = { tavern: 'tavern', market: 'market', vault: 'vault', shipyard: 'ship', urverk: 'gate' };

  T.open = function (town, visitor) {
    T.town = town; T.tab = T.tab || 'build';
    const scr = document.getElementById('town'); scr.classList.remove('hidden');
    V.hidden = true;
    scr.innerHTML = '';
    T.cv = el('canvas', { cls: 'bg' }); scr.appendChild(T.cv);
    T.top = el('div', { cls: 'town-top' }); scr.appendChild(T.top);
    T.ui = el('div', { cls: 'town-bar' }); scr.appendChild(T.ui);
    T.pageEl = el('div', { cls: 'town-page hidden' }); scr.appendChild(T.pageEl);
    T.open_ = T.open_ == null ? false : T.open_;
    T.cv.onmousemove = e => { const b = hit(e); T.hoverB = b; U.tip(b ? '<b>' + D.BUILDINGS[b].name + '</b><br>' + D.BUILDINGS[b].desc + '<br><i class="muted">Click to use · right-click to look closer</i>' : null, e.clientX, e.clientY); T.cv.style.cursor = b ? 'pointer' : 'default'; };
    T.cv.onmouseleave = () => U.tip(null);
    T.cv.oncontextmenu = e => { e.preventDefault(); const b = hit(e); if (b) T.buildingCard(T.town, b); };
    T.cv.onclick = e => { const b = hit(e); if (!b) return; const B = D.BUILDINGS[b];
      if (TAB_FOR[b] === 'tavern') return DL.tavern(T.town);
      if (TAB_FOR[b] === 'market') return DL.market(T.town);
      if (B.dwell || B.dwellUp) return T.page('dwelling', B.dwell || Object.values(D.BUILDINGS).find(x => x.dwell && D.CREATURES[x.dwell].up === B.dwellUp).dwell);
      if (B.teaches || B.songTier) return T.page('heroes');
      if (/^hall/.test(b)) return T.page('build');
      if (/^fort/.test(b)) return T.page('army');
      if (b === 'muster' || b === 'granary' || b === 'farms') return T.page('recruit');
      if (TAB_FOR[b]) return T.page(TAB_FOR[b]);
      T.buildingCard(T.town, b); };
    T.render();
    if (!T.raf) { const loop = now => { T.raf = requestAnimationFrame(loop); if (!document.getElementById('town').classList.contains('hidden')) draw(now / 1000); }; T.raf = requestAnimationFrame(loop); }
  };
  T.close = function () { document.getElementById('town').classList.add('hidden'); V.hidden = false; U.tip(null); U.refresh(); };
  SU.on('town', () => { if (T.town && !document.getElementById('town').classList.contains('hidden')) T.render(); });
  SU.on('screenkey', e => { if (document.getElementById('town').classList.contains('hidden')) return; if (e.key === 'Escape') { if (T.open_) { T.open_ = false; T.render(); } else T.close(); } });
  /* open the page for one thing, over everything */
  T.page = function (kind, arg) { T.tab = kind; T.pageArg = arg || null; T.open_ = true; T.render(); };

  function visitor() { const t = T.town, a = S.armyAt(U.st, t.layer, t.x, t.y); return a && a.owner === t.owner ? a : null; }
  function layout() {
    const r = T.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (T.cv.width !== Math.round(r.width * dpr) || T.cv.height !== Math.round(r.height * dpr)) { T.cv.width = Math.round(r.width * dpr); T.cv.height = Math.round(r.height * dpr); }
    /* the picture covers the whole screen (cropped at the edges if it must) */
    const sc = Math.max(r.width / VW, r.height / VH);
    return { dpr, sc, ox: (r.width - VW * sc) / 2, oy: (r.height - VH * sc) / 2, w: r.width, h: r.height };
  }
  function hit(e) {
    const r = T.cv.getBoundingClientRect(), L = layout();
    const vx = (e.clientX - r.left - L.ox) / L.sc, vy = (e.clientY - r.top - L.oy) / L.sc;
    let best = null, bd = 1e9;
    T.town.built.forEach(b => { const sp = SPOT[b]; if (!sp) return; const [x, y] = sp; const w = 110, h = b.startsWith('hall') || b === 'd9' || b === 'd8' ? 200 : 130;
      if (vx > x - w && vx < x + w && vy > y - h && vy < y + 20) { const d = Math.hypot(vx - x, vy - (y - h / 2)); if (d < bd) { bd = d; best = b; } } });
    return best;
  }

  /* ======================= the picture ======================= */
  function draw(t) {
    const L = layout(), g = T.cv.getContext('2d'), town = T.town, st = U.st;
    g.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    g.fillStyle = '#0a0806'; g.fillRect(0, 0, L.w, L.h);
    g.save(); g.translate(L.ox, L.oy); g.scale(L.sc, L.sc);
    /* the sky over the Duskareth: dusk deepening to violet, with the other Tatu */
    g.fillStyle = lin(g, 0, 0, 0, 560, [[0, '#14102a'], [0.55, '#3a2a55'], [0.85, '#a8566a'], [1, '#e89a6a']]); g.fillRect(-400, -200, VW + 800, 780);
    const sky = [['xikia', '#7ab0d0', 1180, 130, 46], ['leotik', '#9ab06a', 330, 90, 30], ['velki', '#5a8ac0', 1450, 60, 70]].filter(s => D.LAYERS[town.layer].id !== s[0]);
    sky.forEach(([, c, x, y, r]) => { g.fillStyle = radial(g, x, y, r, A.mix(c, '#ffffff', 0.4), shade(c, -50)); ell(g, x, y, r, r); g.fill(); g.fillStyle = 'rgba(10,8,20,0.45)'; ell(g, x + r * 0.35, y + r * 0.1, r * 0.85, r); g.fill(); });
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(t + i)) + ')'; g.fillRect((i * 263) % VW, (i * 97) % 300, 2, 2); }
    /* far mountains and the Duskwaste */
    g.fillStyle = '#2a2240'; g.beginPath(); g.moveTo(-400, 520); for (let x = -400; x <= VW + 400; x += 80) g.lineTo(x, 430 - Math.abs(Math.sin(x * 0.011)) * 120 - Math.sin(x * 0.037) * 30); g.lineTo(VW + 400, 600); g.lineTo(-400, 600); g.fill();
    g.fillStyle = '#1e1830'; g.beginPath(); g.moveTo(-400, 560); for (let x = -400; x <= VW + 400; x += 60) g.lineTo(x, 500 - Math.abs(Math.sin(x * 0.02 + 1)) * 60); g.lineTo(VW + 400, 620); g.lineTo(-400, 620); g.fill();
    g.fillStyle = lin(g, 0, 520, 0, 900, [[0, '#2e2840'], [1, '#141020']]); g.fillRect(-400, 540, VW + 800, 400);
    /* paths and a flagstone plaza before the hall */
    g.fillStyle = lin(g, 0, 620, 0, 900, [[0, '#3a3448'], [1, '#26202f']]); g.beginPath(); g.ellipse(800, 700, 520, 120, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.ellipse(800, 700, 520, 120, 0, 0, Math.PI * 2); g.clip();
    for (let yy = 590; yy < 830; yy += 16) for (let xx = 260 + ((yy / 16) % 2) * 14; xx < 1340; xx += 28) { g.fillStyle = 'rgba(255,255,255,' + (0.02 + ((xx * 7 + yy) % 5) * 0.012) + ')'; g.fillRect(xx, yy, 26, 14); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.strokeRect(xx, yy, 26, 14); }
    g.restore();
    g.strokeStyle = rgba('#8e7cff', 0.22); g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(i * 190 - 50, 900); g.lineTo(i * 190 + 30 + Math.sin(i) * 60, 620); g.stroke(); }
    /* lanterns */
    [[330, 690], [560, 650], [1050, 650], [1280, 690], [800, 760]].forEach(([lx, ly], i) => { g.strokeStyle = '#2a2236'; g.lineWidth = 4; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx, ly - 60); g.stroke();
      g.save(); g.shadowColor = '#ffcf6a'; g.shadowBlur = 24; g.fillStyle = 'rgba(255,214,130,' + (0.8 + Math.sin(t * 3 + i) * 0.15) + ')'; g.beginPath(); g.ellipse(lx, ly - 66, 7, 9, 0, 0, Math.PI * 2); g.fill(); g.restore();
      g.fillStyle = radial(g, lx, ly - 30, 70, 'rgba(255,200,120,0.14)', 'rgba(255,200,120,0)'); g.beginPath(); g.ellipse(lx, ly, 70, 22, 0, 0, Math.PI * 2); g.fill(); });
    if (town.coast || town.built.includes('shipyard')) { g.fillStyle = lin(g, 0, 700, 0, 900, [[0, '#2a5f86'], [1, '#12344e']]); g.beginPath(); g.moveTo(-400, 700); g.quadraticCurveTo(100, 690, 180, 900); g.lineTo(-400, 900); g.fill(); }
    /* buildings, back to front */
    const list = town.built.filter(b => SPOT[b]).sort((a, b) => SPOT[a][1] - SPOT[b][1]);
    list.forEach(b => { const [x, y, kind, lvl] = SPOT[b]; g.save(); g.translate(x, y); drawBuilding(g, kind, lvl || 1, t, b === T.hoverB); g.restore(); });
    /* mist low over the land */
    for (let k = 0; k < 3; k++) { const yy = 560 + k * 50, off = (t * (6 + k * 4)) % 400; g.fillStyle = lin(g, 0, yy - 30, 0, yy + 30, [[0, 'rgba(180,170,220,0)'], [0.5, 'rgba(180,170,220,' + (0.08 - k * 0.02) + ')'], [1, 'rgba(180,170,220,0)']]); g.fillRect(-400 + off - 400, yy - 30, VW + 1600, 60); }
    /* the visiting hero at the gate */
    const vis = visitor(); if (vis && vis.heroId) A.mountedHero(g, 860, 880, 70, st.heroes[vis.heroId], st.players[town.owner].color, t, -1);
    g.restore();
  }
  /* a block of masonry seen from the front and a little to the side */
  function stone(g, x, y, w, h, col) {
    const d = Math.min(w * 0.28, 30), dy = d * 0.5;
    /* contact shadow */
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + w / 2 + d * 0.5, y + h + 4, w * 0.62 + d * 0.5, 10, 0, 0, Math.PI * 2); g.fill();
    /* side face, in shade */
    g.fillStyle = lin(g, x + w, y, x + w + d, y, [[0, shade(col, -42)], [1, shade(col, -58)]]);
    g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w + d, y - dy); g.lineTo(x + w + d, y + h - dy); g.lineTo(x + w, y + h); g.closePath(); g.fill();
    /* top */
    g.fillStyle = shade(col, 22); g.beginPath(); g.moveTo(x, y); g.lineTo(x + d, y - dy); g.lineTo(x + w + d, y - dy); g.lineTo(x + w, y); g.closePath(); g.fill();
    /* front face with light from the left */
    g.fillStyle = lin(g, x, y, x + w, y + h, [[0, shade(col, 18)], [0.7, col], [1, shade(col, -22)]]); g.fillRect(x, y, w, h);
    /* brick courses, staggered, each stone a little different */
    const R = SU.makeRng(Math.round(x * 3 + y * 7 + w));
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    for (let r = 0, yy = y; yy < y + h; r++, yy += 11) for (let xx = x - (r % 2) * 9; xx < x + w; xx += 18) {
      g.fillStyle = rgba(R.chance(0.5) ? '#ffffff' : '#000000', R.range(0.02, 0.08)); g.fillRect(xx + 1, yy + 1, 16, 9);
      g.strokeStyle = 'rgba(8,6,12,0.28)'; g.lineWidth = 1; g.strokeRect(xx + 0.5, yy + 0.5, 18, 11);
    }
    /* weathering at the foot */
    g.fillStyle = lin(g, 0, y + h - 30, 0, y + h, [[0, 'rgba(10,8,16,0)'], [1, 'rgba(10,8,16,0.45)']]); g.fillRect(x, y + h - 30, w, 30);
    g.restore();
    g.strokeStyle = 'rgba(8,6,12,0.55)'; g.lineWidth = 1.2; g.strokeRect(x, y, w, h);
    /* side courses */
    g.strokeStyle = 'rgba(0,0,0,0.25)'; for (let yy = y + 11; yy < y + h; yy += 11) { g.beginPath(); g.moveTo(x + w, yy); g.lineTo(x + w + d, yy - dy); g.stroke(); }
  }
  /* a pitched roof of tiles: the gable at the front, a slope running back */
  function roof(g, x, y, w, h, col) {
    const d = Math.min(w * 0.28, 30), dy = d * 0.5;
    /* the far slope, receding */
    g.fillStyle = lin(g, x + w / 2, y - h, x + w + d, y, [[0, shade(col, -20)], [1, shade(col, -48)]]);
    g.beginPath(); g.moveTo(x + w / 2, y - h); g.lineTo(x + w / 2 + d, y - h - dy); g.lineTo(x + w + 8 + d, y - dy); g.lineTo(x + w + 8, y); g.closePath(); g.fill();
    /* tile rows on the slope */
    g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 1;
    for (let k = 1; k < 6; k++) { const f = k / 6; g.beginPath(); g.moveTo(SU.lerp(x + w / 2, x + w + 8, f), SU.lerp(y - h, y, f)); g.lineTo(SU.lerp(x + w / 2, x + w + 8, f) + d, SU.lerp(y - h, y, f) - dy); g.stroke(); }
    /* the gable */
    g.fillStyle = lin(g, x, y - h, x + w, y, [[0, shade(col, 28)], [1, shade(col, -26)]]);
    g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + w / 2, y - h); g.lineTo(x + w + 8, y); g.closePath(); g.fill();
    g.save(); g.clip(); g.strokeStyle = 'rgba(0,0,0,0.22)';
    for (let yy = y - h + 8; yy < y; yy += 8) { g.beginPath(); g.moveTo(x - 10, yy); g.lineTo(x + w + 10, yy); g.stroke(); for (let xx = x - 10 + ((yy / 8) % 2) * 6; xx < x + w + 10; xx += 12) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 8); g.stroke(); } }
    g.restore();
    g.strokeStyle = shade(col, 40); g.lineWidth = 2; g.beginPath(); g.moveTo(x + w / 2, y - h); g.lineTo(x + w / 2 + d, y - h - dy); g.stroke();
    g.strokeStyle = 'rgba(8,6,12,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + w / 2, y - h); g.lineTo(x + w + 8, y); g.stroke();
  }
  function windowLit(g, x, y, w, h, col) {
    const shape = () => { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); };
    g.save(); g.fillStyle = 'rgba(10,8,14,0.8)'; g.translate(-2, -2); g.scale(1, 1); shape(); g.lineWidth = 4; g.strokeStyle = 'rgba(30,24,36,0.9)'; g.stroke(); g.restore();
    g.save(); g.shadowColor = col || '#ffcf6a'; g.shadowBlur = 14; g.fillStyle = lin(g, x, y, x, y + h, [[0, A.mix(col || '#ffcf6a', '#ffffff', 0.4)], [1, col || '#ffcf6a']]); shape(); g.fill(); g.restore();
    g.strokeStyle = 'rgba(40,28,20,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + w / 2, y + 2); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * 0.55); g.lineTo(x + w, y + h * 0.55); g.stroke();
    g.fillStyle = 'rgba(160,150,170,0.6)'; g.fillRect(x - 2, y + h, w + 4, 3);
  }
  function glowOrb(g, x, y, r, col, t) { g.save(); g.shadowColor = col; g.shadowBlur = r * 2; g.fillStyle = radial(g, x, y, r, '#ffffff', col); ell(g, x, y + Math.sin(t * 2) * 3, r, r); g.fill(); g.restore(); }
  function drawBuilding(g, kind, lvl, t, hov) {
    if (hov) { g.save(); g.shadowColor = '#ffe3a3'; g.shadowBlur = 24; }
    const DUSK = '#4a4462', DARK = '#2a2440', VIOLET = '#8e7cff';
    switch (kind) {
      case 'hall': {
        const w = 150 + lvl * 50, h = 110 + lvl * 40;
        stone(g, -w / 2, -h, w, h, DUSK); roof(g, -w / 2, -h, w, 60 + lvl * 10, DARK);
        for (let i = 0; i < 2 + lvl; i++) windowLit(g, -w / 2 + 22 + i * (w - 44) / (1 + lvl), -h + 30, 16, 30, '#b9a8ff');
        g.fillStyle = '#0a0812'; g.beginPath(); g.moveTo(-22, 0); g.lineTo(-22, -48); g.arc(0, -48, 22, Math.PI, 0); g.lineTo(22, 0); g.fill();
        if (lvl >= 2) { stone(g, -w / 2 - 50, -h * 0.8, 50, h * 0.8, DUSK); roof(g, -w / 2 - 50, -h * 0.8, 50, 70, DARK); stone(g, w / 2, -h * 0.8, 50, h * 0.8, DUSK); roof(g, w / 2, -h * 0.8, 50, 70, DARK); }
        if (lvl >= 3) { g.save(); g.shadowColor = VIOLET; g.shadowBlur = 30; g.fillStyle = lin(g, 0, -h - 260, 0, -h - 50, [[0, '#ffffff'], [1, '#5d4fb0']]); g.beginPath(); g.moveTo(-14, -h - 60); g.lineTo(0, -h - 280); g.lineTo(14, -h - 60); g.fill(); g.restore(); }
        g.fillStyle = '#c9a24e'; g.beginPath(); g.arc(0, -h - 20 - lvl * 5, 12, 0, TAU); g.fill(); outline(g, 2);
        break; }
      case 'wall': {
        const h = 40 + lvl * 18, col = lvl === 1 ? '#5a4a3a' : '#575170';
        if (lvl === 1) { g.fillStyle = '#5a4030'; for (let x = -760; x < 760; x += 26) { g.fillRect(x, -h, 20, h); g.beginPath(); g.moveTo(x, -h); g.lineTo(x + 10, -h - 14); g.lineTo(x + 20, -h); g.fill(); } }
        else { stone(g, -760, -h, 1520, h, col); g.fillStyle = shade(col, 10); for (let x = -760; x < 760; x += 40) g.fillRect(x, -h - 16, 24, 16); }
        if (lvl >= 2) [-500, 500].concat(lvl >= 3 ? [-180, 180] : []).forEach(x => { stone(g, x - 40, -h - 80, 80, h + 80, col); roof(g, x - 40, -h - 80, 80, 70, DARK); windowLit(g, x - 8, -h - 50, 16, 26, '#b9a8ff'); });
        g.fillStyle = '#0a0812'; g.beginPath(); g.moveTo(-50, 0); g.lineTo(-50, -h + 10); g.arc(0, -h + 10, 50, Math.PI, 0); g.lineTo(50, 0); g.fill();
        g.save(); g.shadowColor = VIOLET; g.shadowBlur = 20; g.strokeStyle = rgba('#b9a8ff', 0.8); g.lineWidth = 3; g.stroke(); g.restore();
        break; }
      case 'inn': stone(g, -80, -90, 160, 90, '#6a5040'); roof(g, -80, -90, 160, 60, '#5a2a1a'); windowLit(g, -50, -70, 18, 26); windowLit(g, 30, -70, 18, 26);
        g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(80, -70); g.lineTo(110, -70); g.stroke(); glowOrb(g, 110, -55, 8, '#ffcf6a', t); break;
      case 'stalls': [['#c43a3a', -90], ['#d0a23a', 0], ['#3a6fd0', 90]].forEach(([c, x]) => { g.fillStyle = '#5a3a20'; g.fillRect(x - 36, -40, 72, 40); outline(g, 2); g.fillStyle = c; g.beginPath(); g.moveTo(x - 46, -40); g.lineTo(x, -78); g.lineTo(x + 46, -40); g.closePath(); g.fill(); outline(g, 2); g.fillStyle = '#e8c25a'; g.beginPath(); g.arc(x - 12, -18, 7, 0, TAU); g.fill(); }); break;
      case 'barn': stone(g, -70, -80, 140, 80, '#7a5a3a'); roof(g, -70, -80, 140, 50, '#6a2a1a'); g.fillStyle = '#3a2010'; g.fillRect(-20, -50, 40, 50); break;
      case 'fields': for (let r = 0; r < 6; r++) { g.strokeStyle = r % 2 ? '#c9a24e' : '#7a9a4a'; g.lineWidth = 9; g.beginPath(); g.moveTo(-160, -r * 14); g.lineTo(160, -r * 14 - 10); g.stroke(); } break;
      case 'houses': for (let i = 0; i < 5; i++) { const x = -120 + i * 55, y = -(i % 2) * 24; stone(g, x - 22, y - 46, 44, 46, '#4a4258'); roof(g, x - 22, y - 46, 44, 30, '#2a2236'); windowLit(g, x - 6, y - 34, 12, 16); } break;
      case 'stonehouses': for (let i = 0; i < 3; i++) { const x = -90 + i * 90; stone(g, x - 38, -84, 76, 84, '#6a6478'); g.fillStyle = '#3a3448'; g.fillRect(x - 44, -96, 88, 14); outline(g, 2); windowLit(g, x - 9, -60, 18, 24); } break;
      case 'dome': { const r = 60 + lvl * 12; stone(g, -r, -90 - lvl * 10, r * 2, 90 + lvl * 10, '#5a5478');
        g.fillStyle = lin(g, 0, -90 - lvl * 10 - r, 0, -90 - lvl * 10, [[0, lvl >= 4 ? '#e6deff' : '#9a8ad8'], [1, '#3a2a70']]); g.beginPath(); g.arc(0, -90 - lvl * 10, r, Math.PI, 0); g.fill(); outline(g, 2);
        for (let i = 0; i < 3; i++) windowLit(g, -r + 20 + i * (r * 2 - 40) / 2 - 8, -70 - lvl * 10, 16, 30, '#9ff0a0');
        if (lvl >= 4) glowOrb(g, 0, -90 - lvl * 10 - r - 20, 14, VIOLET, t);
        g.fillStyle = 'rgba(200,255,200,0.5)'; for (let i = 0; i < lvl * 3; i++) { const a = t * 0.6 + i * 1.3; g.font = '20px Georgia'; g.fillText('♪', Math.cos(a) * (r + 20), -120 - lvl * 10 + Math.sin(a * 1.3) * 40 - ((t * 20 + i * 15) % 60)); }
        break; }
      case 'yard': g.fillStyle = '#6a5a3a'; ell(g, 0, -10, 110, 24); g.fill(); [-70, 0, 70].forEach(x => { g.strokeStyle = '#5a3a20'; g.lineWidth = 6; g.beginPath(); g.moveTo(x, -10); g.lineTo(x, -70); g.moveTo(x - 20, -55); g.lineTo(x + 20, -55); g.stroke(); g.fillStyle = '#c9a24e'; g.beginPath(); g.arc(x, -76, 9, 0, TAU); g.fill(); }); break;
      case 'lodge': stone(g, -70, -70, 140, 70, '#6a5a44'); roof(g, -70, -70, 140, 50, '#3a4a2a'); windowLit(g, -10, -50, 20, 26); break;
      case 'lodge2': stone(g, -70, -80, 140, 80, '#5a4a5a'); roof(g, -70, -80, 140, 50, '#5a2a2a'); A.flag(g, 60, -120, 40, '#c43a3a', t); windowLit(g, -10, -56, 20, 28); break;
      case 'counting': stone(g, -60, -90, 120, 90, '#6a6050'); g.fillStyle = '#3a3428'; g.fillRect(-68, -104, 136, 16); outline(g, 2); [-36, 0, 36].forEach(x => { g.fillStyle = '#8a8070'; g.fillRect(x - 6, -88, 12, 88); }); A.resIcon(g, 'gold', 0, -118, 26); break;
      case 'duattower': stone(g, -36, -230, 72, 230, '#3a3456'); g.fillStyle = DARK; g.beginPath(); g.moveTo(-46, -230); g.lineTo(0, -320); g.lineTo(46, -230); g.fill(); outline(g, 2);
        for (let i = 0; i < 4; i++) windowLit(g, -8, -200 + i * 46, 16, 24, VIOLET); glowOrb(g, 0, -335, 10, VIOLET, t); break;
      case 'pens': g.strokeStyle = '#6a4a2a'; g.lineWidth = 5; for (let x = -80; x <= 80; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, -40); g.stroke(); } g.beginPath(); g.moveTo(-80, -30); g.lineTo(80, -30); g.stroke(); A.creature(g, 'punk', -30, -4, 34, { t, tint: 2 }); A.coreIcon(g, 40, -60, 16, t, 'hero'); break;
      case 'vault': stone(g, -60, -110, 120, 110, '#4a4a66'); g.fillStyle = '#2a2a40'; g.beginPath(); g.arc(0, -110, 60, Math.PI, 0); g.fill(); outline(g, 2); g.fillStyle = '#0a0812'; g.fillRect(-20, -60, 40, 60); A.coreIcon(g, 0, -150, 20, t, 'hero'); break;
      case 'dock': g.fillStyle = '#5a3a20'; g.fillRect(-60, -16, 160, 16); for (let x = -50; x < 100; x += 30) g.fillRect(x, -16, 8, 40); A.boat(g, {}, -10, -60, 80, t, '#c43a3a'); break;
      case 'ring': { const R = 80; g.lineWidth = 18; g.strokeStyle = lin(g, -R, 0, R, 0, [[0, '#8a8478'], [1, '#3a3632']]); g.beginPath(); g.arc(0, -R - 10, R, Math.PI * 0.9, Math.PI * 2.1); g.stroke();
        g.save(); g.beginPath(); g.ellipse(0, -R, R - 12, R * 0.85, 0, 0, TAU); g.clip(); g.fillStyle = radial(g, 0, -R, R, '#e6deff', '#120c24'); g.fillRect(-R, -R * 2, R * 2, R * 2);
        g.strokeStyle = rgba('#b9a8ff', 0.7); g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); for (let k = 0; k < 40; k++) { const a = k * 0.32 + t * 1.5 + i * 1.57, r = k * 1.6; const px = Math.cos(a) * r, py = -R + Math.sin(a) * r * 0.85; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); } g.restore(); break; }
      case 'well': g.fillStyle = '#5a5478'; ell(g, 0, -20, 40, 14); g.fill(); outline(g, 2); stone(g, -40, -20, 80, 20, '#5a5478'); glowOrb(g, 0, -44, 12, VIOLET, t); g.strokeStyle = '#6a4a2a'; g.lineWidth = 5; g.beginPath(); g.moveTo(-36, -20); g.lineTo(-36, -80); g.lineTo(36, -80); g.lineTo(36, -20); g.stroke(); break;
      case 'sanctum': stone(g, -60, -120, 120, 120, '#3a3050'); g.fillStyle = DARK; g.beginPath(); g.moveTo(-70, -120); g.lineTo(-40, -190); g.lineTo(0, -160); g.lineTo(40, -190); g.lineTo(70, -120); g.fill(); outline(g, 2); windowLit(g, -12, -90, 24, 40, VIOLET); break;
      case 'burrow': g.fillStyle = radial(g, 0, -30, 90, '#5a4a6a', '#1e1628'); ell(g, 0, -10, 100, 40); g.fill(); outline(g, 2);
        [-40, 10, 50].forEach((x, i) => { g.fillStyle = '#05030a'; ell(g, x, -16 + (i % 2) * 6, 16, 12); g.fill(); });
        A.creature(g, 'malsti', -10 + Math.sin(t) * 20, -6, 34, { t, tint: lvl === 2 ? 1 : 0 }); if (lvl === 2) A.creature(g, 'malsti', 60, -4, 30, { t: t + 1, tint: 1, f: -1 }); break;
      case 'barracks': stone(g, -90, -90, 180, 90, '#4a4458'); roof(g, -90, -90, 180, 46, DARK); for (let i = 0; i < 4; i++) windowLit(g, -70 + i * 44, -66, 14, 22); if (lvl === 2) { A.flag(g, -80, -150, 44, '#8e7cff', t); A.flag(g, 70, -150, 44, '#8e7cff', t + 1); } break;
      case 'spire': g.fillStyle = lin(g, -24, 0, 24, 0, [[0, '#4a4060'], [1, '#1e1a2a']]); g.beginPath(); g.moveTo(-30, 0); g.lineTo(-10, -280); g.lineTo(0, -320); g.lineTo(10, -280); g.lineTo(30, 0); g.fill(); outline(g, 2);
        for (let i = 0; i < 5; i++) windowLit(g, -5, -60 - i * 45, 10, 18, '#d9ccff');
        if (lvl === 2) { g.strokeStyle = rgba('#b9a8ff', 0.5 + Math.sin(t * 3) * 0.3); g.lineWidth = 2; for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(0, -300, i * 24, 0, TAU); g.stroke(); } } break;
      case 'pool': g.fillStyle = lin(g, 0, -40, 0, 0, [[0, '#2a5f86'], [1, '#0e2a3e']]); ell(g, 0, -16, 120, 30); g.fill(); g.strokeStyle = '#5a5478'; g.lineWidth = 8; g.stroke();
        A.creature(g, 'harkal', Math.sin(t * 0.8) * 50, -2, 40, { t, f: Math.cos(t * 0.8) > 0 ? 1 : -1, noShadow: true, tint: lvl === 2 ? 1 : 0 }); break;
      case 'cloister': stone(g, -90, -110, 180, 110, '#5a6080'); g.fillStyle = '#3a3f68'; g.fillRect(-100, -126, 200, 18); outline(g, 2); for (let i = 0; i < 5; i++) { g.fillStyle = '#c9d0f0'; g.fillRect(-80 + i * 38, -108, 10, 108); } glowOrb(g, 0, -160, 16, '#e8eeff', t); break;
      case 'roost': g.fillStyle = '#3a1a10'; g.fillRect(-10, -160, 20, 160); [[0, -190, 50], [-40, -150, 36], [40, -150, 36]].forEach(([x, y, r]) => { g.fillStyle = radial(g, x, y, r, '#ffb04a', '#a8301a'); ell(g, x, y, r, r * 0.8); g.fill(); });
        A.creature(g, 'tyndael', 30 + Math.sin(t) * 20, -130, 40, { t, noShadow: true }); break;
      case 'chapel': stone(g, -70, -140, 140, 140, '#4a2a34'); g.fillStyle = '#2a0e14'; g.beginPath(); g.moveTo(-80, -140); g.lineTo(0, -230); g.lineTo(80, -140); g.fill(); outline(g, 2);
        [-1, 1].forEach(sd => { g.fillStyle = '#e8d8c0'; g.beginPath(); g.moveTo(sd * 30, -200); g.quadraticCurveTo(sd * 70, -250, sd * 60, -280); g.quadraticCurveTo(sd * 50, -240, sd * 15, -205); g.fill(); });
        windowLit(g, -16, -110, 32, 50, '#ff5a4a'); break;
      case 'crag': g.fillStyle = lin(g, -160, 0, 160, 0, [[0, '#6a6478'], [1, '#2a2638']]); g.beginPath(); g.moveTo(-170, 60); g.lineTo(-120, -80); g.lineTo(-40, -150); g.lineTo(40, -120); g.lineTo(130, -170); g.lineTo(180, 60); g.fill(); outline(g, 2);
        A.creature(g, 'lutut', Math.sin(t * 0.5) * 60, -180 + Math.sin(t) * 10, 60, { t, noShadow: true, f: Math.cos(t * 0.5) > 0 ? 1 : -1 }); break;
      case 'hole': g.fillStyle = radial(g, 0, -10, 150, '#2a2040', '#05030a'); ell(g, 0, 0, 160, 50); g.fill(); g.strokeStyle = rgba('#4fb4e8', 0.6); g.lineWidth = 4; g.stroke();
        A.creature(g, 'nekh', 20, 10, 110, { t, noShadow: true }); break;
    }
    if (hov) g.restore();
  }

  /* ======================= the panels ======================= */
  T.render = function () {
    const town = T.town, st = U.st, P = st.players[town.owner], vis = visitor();
    /* top: name, people, and the way out */
    T.top.innerHTML = '';
    T.top.appendChild(el('h2', { text: town.name }));
    T.top.appendChild(el('span', { cls: 'panel', style: { padding: '4px 10px' } }, [Math.floor(town.pop) + ' / ' + RU.housing(town) + ' people' + (town.popChange ? ' (' + (town.popChange > 0 ? '+' : '') + town.popChange + ' today)' : '') + ' · +' + RU.townIncome(st, town).gold + ' gold a day · ' + (town.builtToday >= RU.buildsPerDay(st, town) ? 'built today' : 'can build today')]));
    T.top.appendChild(el('span', { cls: 'panel row', style: { padding: '4px 10px', gap: '10px' } }, D.RES.map(r => el('span', { cls: 'res', 'data-tip': '<b>' + D.RES_INFO[r].name + '</b>' + (D.RES_INFO[r].desc ? '<br>' + D.RES_INFO[r].desc : '') }, [U.resIcon(r, 16), SU.fmt(P.res[r])]))));
    T.top.appendChild(el('span', { cls: 'spacer' }));
    T.top.appendChild(btn('Leave town', () => T.close(), 'primary'));
    /* tabs */
    const tabs = [['build', 'Build'], ['recruit', 'Recruit'], ['army', 'Garrison & heroes'], ['heroes', 'Training & songs'], ['vault', 'Memory Vault'], ['tavern', 'Tavern'], ['market', 'Market']];
    if (RU.has(town, 'urverk')) tabs.push(['gate', 'Duat Gate']);
    if (RU.has(town, 'shipyard')) tabs.push(['ship', 'Shipyard']);
    T.ui.innerHTML = '';
    T.ui.appendChild(el('div', { cls: 'town-buttons' }, tabs.map(([id, n]) => btn(n, () => { if (id === 'tavern') return DL.tavern(town); if (id === 'market') { if (!RU.has(town, 'market')) { U.toast('Build a Market Square first.'); return; } return DL.market(town); }
      T.page(id); }))));
    /* the page: one thing, over everything */
    const pg = T.pageEl; pg.innerHTML = '';
    pg.classList.toggle('hidden', !T.open_);
    if (!T.open_) return;
    const TITLE = { build: 'Build', recruit: 'Recruit', army: 'Garrison & heroes', heroes: 'Training & songs', vault: 'Memory Vault', gate: 'Duat Gate', ship: 'Shipyard' };
    const title = T.tab === 'dwelling' ? (Object.values(D.BUILDINGS).find(b => b.dwell === T.pageArg) || {}).name || 'Dwelling' : TITLE[T.tab] || 'Build';
    pg.appendChild(el('div', { cls: 'tp-head' }, [el('h2', { text: title }), el('span', { cls: 'small muted', text: town.name }), el('span', { cls: 'spacer' }),
      el('span', { cls: 'row', style: { gap: '10px' } }, D.RES.map(r => el('span', { cls: 'res', 'data-tip': '<b>' + D.RES_INFO[r].name + '</b>' }, [U.resIcon(r, 16), SU.fmt(P.res[r])]))),
      btn('✕ Back to the town', () => { T.open_ = false; T.render(); }, 'primary', 'Esc')]));
    const body = el('div', { cls: 'tp-body' }); pg.appendChild(body);
    ({ build: buildTab, recruit: recruitTab, army: armyTab, heroes: heroesTab, vault: vaultTab, gate: gateTab, ship: shipTab, dwelling: (b, t, s, p, v) => dwellingPage(b, t, s, p, v, T.pageArg) }[T.tab] || buildTab)(body, town, st, P, vis);
  };

  /* a building, close up (as the halls of the old games show it): its picture, what it does, what it needs, what it costs */
  T.buildingCard = function (town, bid) {
    const st = U.st, P = st.players[town.owner] || st.players[U.viewer], B = D.BUILDINGS[bid];
    const built = town.built.includes(bid), chk = built ? { ok: false } : RU.canBuild(st, town, bid);
    const W = 380, H = 260, cv = el('canvas', { width: W * 2, height: H * 2, cls: 'bc-pic' }); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const sp = SPOT[bid] || [0, 0, 'houses', 1];
    let raf = 0;
    /* draw the building once on a large sheet, find where it actually is, and fit it to the frame */
    const pic = buildingPicture(sp[2], sp[3] || 1);
    { const g = cv.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0);
      g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#1a1430'], [0.6, '#3a2c4a'], [0.84, '#2a2234'], [1, '#141018']]); g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,240,200,0.5)'; for (let i = 0; i < 30; i++) g.fillRect((i * 97.3) % W, (i * 41.7) % (H * 0.5), 1.2, 1.2);
      const b = pic.box, k = Math.min((W - 40) / b.w, (H - 30) / b.h, 1.6);
      g.fillStyle = 'rgba(0,0,0,0.35)'; ell(g, W / 2, H - 18, b.w * k * 0.55, 9); g.fill();
      g.globalAlpha = built ? 1 : 0.85; g.drawImage(pic.cv, b.x, b.y, b.w, b.h, W / 2 - b.w * k / 2, H - 14 - b.h * k, b.w * k, b.h * k); g.globalAlpha = 1;
      if (!built) { g.fillStyle = 'rgba(20,16,30,0.15)'; g.fillRect(0, 0, W, H); } }
    const needs = (B.req || []).map(r => el('div', { cls: 'small ' + (RU.has(town, r) ? 'good' : 'bad') }, [(RU.has(town, r) ? '✓ ' : '✗ ') + D.BUILDINGS[r].name]));
    if (B.pop) needs.push(el('div', { cls: 'small ' + (town.pop >= B.pop ? 'good' : 'bad') }, [(town.pop >= B.pop ? '✓ ' : '✗ ') + B.pop + ' people (the town has ' + Math.floor(town.pop) + ')']));
    if (B.unlock) needs.push(el('div', { cls: 'small ' + (RU.blueprintHere(st, town) ? 'good' : 'bad') }, [(RU.blueprintHere(st, town) ? '✓ ' : '✗ ') + 'The Rokarvac of the Nekh in town']));
    const cr = B.dwell || B.dwellUp, C = cr && D.CREATURES[cr];
    const info = el('div', { cls: 'bc-info' }, [
      el('p', { text: B.desc }),
      C ? el('div', { cls: 'row', style: { flexWrap: 'nowrap' } }, [U.creatureIcon(cr, 54, { color: P.color }), el('div', { cls: 'small' }, [el('b', { text: C.plural }), el('br'), 'Tier ' + C.tier + ' · ' + C.grow + ' a week · attack ' + C.atk + ', defense ' + C.def + ', health ' + C.hp, el('br'), el('a', { href: '#', cls: 'gold', onclick: e => { e.preventDefault(); DL.creatureCard(cr, { town }); }, text: 'More about them…' })])]) : null,
      B.gold ? el('div', { cls: 'small' }, ['Income: ', el('b', { cls: 'gold', text: B.gold + ' gold a day' })]) : null,
      B.housing ? el('div', { cls: 'small' }, ['Room for ', el('b', { cls: 'gold', text: B.housing + ' people' })]) : null,
      B.teaches ? el('div', { cls: 'small' }, ['Teaches: ' + B.teaches.map(id => D.SKILLS[id].name).join(', ')]) : null,
      needs.length ? el('div', { style: { marginTop: '6px' } }, [el('b', { cls: 'small muted', text: 'Needs' }), ...needs]) : null,
      B.small ? el('div', { cls: 'small muted', text: 'Small: a second building may go up the same day.' }) : null,
      el('div', { style: { marginTop: '8px' } }, built ? el('b', { cls: 'good', text: 'Built' }) : [el('b', { cls: 'small muted', text: 'Cost' }), el('div', {}, U.costView(RU.buildCost(town, bid), P)), RU.labourCut(town) ? el('div', { cls: 'small good', text: 'Punks at work here: ' + Math.round(RU.labourCut(town) * 100) + '% off wood and stone, ' + Math.round(RU.labourCut(town) * 50) + '% off gold.' }) : null]),
      !built && !chk.ok && chk.why ? el('div', { cls: 'warn small', style: { marginTop: '4px' }, text: chk.why }) : null]);
    const m = U.modal([el('h2', { text: B.name }), el('div', { cls: 'bc' }, [cv, info]),
      el('div', { cls: 'acts' }, [btn(built ? 'Close' : 'Not now', () => m.close()), !built && town.owner === U.viewer ? btn('Build', () => { const r = RU.build(st, town, bid); if (!r.ok) { U.toast(r.why); return; } m.close(); U.toast(B.name + ' is built.'); T.render(); U.refresh(); }, 'primary big') : null].map(b => { if (b && b.textContent === 'Build' && !chk.ok) b.disabled = true; return b; }))], { wide: true, onClose: () => cancelAnimationFrame(raf) });
    m.box.classList.add('bc-box');
  };

  const PIC_CACHE = {};
  function buildingPicture(kind, lvl) {
    const key = kind + lvl; if (PIC_CACHE[key]) return PIC_CACHE[key];
    const SW = 1000, SH = 900, OX = 500, OY = 650, cv = A.canvas(SW, SH), g = cv.getContext('2d');
    g.save(); g.translate(OX, OY); drawBuilding(g, kind, lvl, 0.6, false); g.restore();
    const d = g.getImageData(0, 0, SW, SH).data; let x0 = SW, y0 = SH, x1 = 0, y1 = 0;
    for (let y = 0; y < SH; y += 2) for (let x = 0; x < SW; x += 2) if (d[(y * SW + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const box = x1 > x0 ? { x: Math.max(0, x0 - 6), y: Math.max(0, y0 - 6), w: Math.min(SW, x1 - x0 + 12), h: Math.min(SH, y1 - y0 + 12) } : { x: 0, y: 0, w: SW, h: SH };
    return (PIC_CACHE[key] = { cv, box });
  }

  function buildTab(body, town, st, P) {
    const grid = el('div', { cls: 'bgrid' });
    const seen = new Set();
    D.BUILD_ORDER.forEach(bid => {
      const B = D.BUILDINGS[bid];
      /* a chain (hall1 → hall2 → hall3) shows only its next step */
      if (B.replaces && !RU.has(town, B.replaces) && !town.built.includes(bid)) return;
      if (Object.values(D.BUILDINGS).some(x => x.replaces === bid && RU.has(town, x.id))) return;
      if (B.coast && !town.coast) return;
      if (seen.has(bid)) return; seen.add(bid);
      const built = town.built.includes(bid);
      const chk = built ? { ok: false } : RU.canBuild(st, town, bid);
      grid.appendChild(el('div', { cls: 'bcard' + (built ? ' done' : chk.ok ? ' ok' : ''), onclick: () => T.buildingCard(town, bid), oncontextmenu: e => { e.preventDefault(); T.buildingCard(town, bid); }, 'data-tip': '<b>' + B.name + '</b><br>' + B.desc + (B.req ? '<br><span class="muted">Needs: ' + B.req.map(r => D.BUILDINGS[r].name).join(', ') + '</span>' : '') + (B.pop ? '<br><span class="muted">Needs ' + B.pop + ' people.</span>' : '') + (B.small ? '<br><span class="muted">Small: a second one may go up the same day.</span>' : '') },
        [el('div', { text: B.name }), built ? el('div', { cls: 'c good', text: 'Built' }) : el('div', { cls: 'c' }, [U.costView(RU.buildCost(town, bid), P), !chk.ok && !chk.poor ? el('div', { cls: 'warn', text: chk.why }) : null])]));
    });
    body.appendChild(grid);
  }

  /* where recruits go: the garrison, or the army at the gate */
  function destOf(town, st, vis) { const vh = vis && S.heroOf(st, vis); const dest = T.dest && (T.dest === 'garrison' || vh) ? T.dest : (vh ? 'hero' : 'garrison'); return { vh, dest, slots: dest === 'hero' && vh ? vh.slots : town.garrison, hero: dest === 'hero' ? vh : null }; }
  function destRow(town, st, vis) { const d = destOf(town, st, vis); return el('div', { cls: 'row' }, ['Recruit into: ', btn('Garrison', () => { T.dest = 'garrison'; T.render(); }, d.dest === 'garrison' ? 'on' : ''), d.vh ? btn(d.vh.name + '’s army', () => { T.dest = 'hero'; T.render(); }, d.dest === 'hero' ? 'on' : '') : null]); }
  /* one dwelling, close up: the creature, how many wait, what they cost */
  function dwellingPage(body, town, st, P, vis, base) {
    const d = RU.townDwellings(town).find(x => x.base === base);
    if (!d) { body.appendChild(el('p', { text: 'This dwelling is not built yet.' })); return; }
    const cr = d.up || d.base, C = D.CREATURES[cr], max = RU.maxRecruit(st, town, cr, d.base), dd = destOf(town, st, vis);
    const pic = U.creatureIcon(cr, 220, { color: P.color }); pic.classList.add('tp-pic');
    const range = el('input', { type: 'range', min: 0, max, value: max, style: { width: '260px' } });
    const lab = el('div', {}); const upd = () => { lab.innerHTML = ''; lab.appendChild(el('b', { cls: 'gold', text: range.value + ' ' + C.plural + ' for ' })); lab.appendChild(U.costView(RU.recruitCost(cr, +range.value), P)); }; range.oninput = upd; upd();
    body.appendChild(el('div', { cls: 'tp-dwell' }, [pic, el('div', { cls: 'col', style: { gap: '8px' } }, [
      el('h3', { text: C.plural + ' · tier ' + C.tier }),
      el('div', {}, [el('b', { cls: 'gold', text: String(town.avail[d.base] || 0) }), ' ready to join · ' + C.grow + ' more each week' + (C.tier >= 8 ? ' (only ever one a week)' : '')]),
      el('div', { cls: 'small muted', text: 'Attack ' + C.atk + ' · Defense ' + C.def + ' · Damage ' + C.dmg[0] + '–' + C.dmg[1] + ' · Health ' + C.hp + ' · Speed ' + C.spd + (C.ranged ? ' · Shots ' + C.shots : '') + (C.fly ? ' · flies' : '') }),
      el('div', {}, ['Each: ', U.costView(C.cost, P)]),
      destRow(town, st, vis), range, lab,
      el('div', { cls: 'row' }, [btn('Recruit', () => { const r = RU.recruit(st, town, cr, d.base, +range.value, dd.slots, dd.hero); if (!r.ok) U.toast(r.why); else U.toast(r.n + ' ' + C.plural + ' join.'); T.render(); U.refresh(); }, 'primary big'),
        btn('All I can', () => { range.value = max; upd(); }), btn('More about them…', () => DL.creatureCard(cr, { town }))])])]));
  }
  function recruitTab(body, town, st, P, vis) {
    const src = RU.recruitSources(st, town), dd = destOf(town, st, vis);
    body.appendChild(el('div', { cls: 'row' }, [destRow(town, st, vis), el('span', { cls: 'spacer' }),
      btn('Recruit everything I can afford', () => { const n = RU.recruitAll(st, town, dd.slots, dd.hero); U.toast(n ? n + ' creatures join.' : 'Nothing more you can afford, or no room.'); T.render(); U.refresh(); }, 'primary', 'The strongest first, as many as your treasury and the slots allow')]));
    if (RU.has(town, 'muster')) body.appendChild(el('p', { cls: 'small gold', text: 'The Muster Ground: recruit from the dwellings of all your towns. The troops come here.' }));
    const dw = src;
    if (!dw.length) { body.appendChild(el('p', { text: 'Build dwellings to recruit creatures.' })); return; }
    const vh = vis && S.heroOf(st, vis);
    let dest = T.dest && (T.dest === 'garrison' || vh) ? T.dest : (vh ? 'hero' : 'garrison');
    const grid = el('div', { cls: 'row', style: { alignItems: 'stretch', marginTop: '8px' } });
    dw.forEach(d => {
      const cr = d.up || d.base, C = D.CREATURES[cr], from = d.town || town;
      const max = RU.maxRecruit(st, from, cr, d.base);
      const range = el('input', { type: 'range', min: 0, max, value: max, style: { width: '120px' } });
      const lab = el('div', { cls: 'small' }); const upd = () => { lab.innerHTML = ''; lab.appendChild(U.costView(RU.recruitCost(cr, +range.value), P)); }; range.oninput = upd; upd();
      grid.appendChild(el('div', { cls: 'frame col', style: { width: '170px', alignItems: 'center' }, 'data-tip': DL.creatureTip(cr) + '<br><i>Double-click for more.</i>', ondblclick: () => from === town ? T.page('dwelling', d.base) : DL.creatureCard(cr, { town }), oncontextmenu: e => { e.preventDefault(); e.stopPropagation(); DL.creatureCard(cr, { town }); } }, [
        U.creatureIcon(cr, 80, { color: P.color }), el('b', { text: C.plural }), el('div', { cls: 'small muted', text: (from.avail[d.base] || 0) + ' ready' + (from !== town ? ' in ' + from.name : '') + (C.pop ? ' · uses people' : '') }),
        el('div', { cls: 'small' }, U.costView(C.cost, P)), range, lab,
        btn('Recruit', () => { const slots = dest === 'hero' && vh ? vh.slots : town.garrison; const r = RU.recruit(st, from, cr, d.base, +range.value, slots, dest === 'hero' ? vh : null); if (!r.ok) U.toast(r.why); else U.toast(r.n + ' ' + C.plural + ' join.'); T.render(); U.refresh(); }, 'primary')]));
    });
    body.appendChild(grid);
    /* upgrades for stacks already here */
    const ups = [];
    const collect = (slots, label) => S.stacksIn(slots).forEach(s => { const C = D.CREATURES[s.cr]; if (C.up && Object.values(D.BUILDINGS).some(b => b.dwellUp === C.up && town.built.includes(b.id))) ups.push({ s, label }); });
    collect(town.garrison, 'garrison'); if (vh) collect(vh.slots, vh.name);
    if (ups.length) body.appendChild(el('div', { cls: 'col', style: { marginTop: '8px' } }, [el('b', { cls: 'gold', text: 'Upgrade' }), ...ups.map(({ s, label }) => el('div', { cls: 'row' }, [s.n + ' ' + D.CREATURES[s.cr].plural + ' (' + label + ') → ' + D.CREATURES[D.CREATURES[s.cr].up].plural, btn('Upgrade', () => { const r = RU.upgradeStack(st, town, s); if (!r.ok) U.toast(r.why || 'Cannot.'); T.render(); U.refresh(); })]))]));
    /* the farmers' paddock: corralled punks, sold as mounts (for travel, never ridden into battle) */
    body.appendChild(el('div', { cls: 'frame', style: { marginTop: '8px' } }, [el('b', { cls: 'gold', text: 'The paddock' }),
      el('p', { cls: 'small muted', text: (town.punks || 0) + ' punks with the farmers' + (town.labour ? ', ' + town.labour + ' at work' : '') + '. Corral wild herds here to fill it' + (RU.has(town, 'granary') ? '; with a Granary they breed a little each week.' : '; build a Granary and they will breed.') + ' An army with a punk for every stack travels 25% further.' }),
      paddockRow(town, st, P, vis),
      vis ? el('div', { cls: 'row' }, ['The army at the gate has ' + RU.mountsOf(st, vis) + ' mounts for ' + S.stacksIn(S.slotsOf(st, vis)).filter(x => x.n > 0).length + ' stacks' + (RU.mounted(st, vis) ? ' — everyone rides.' : '.'),
        btn('Buy one (' + RU.MOUNT_COST + ' gold)', () => { if (!(town.punks > 0)) { U.toast('The paddock is empty.'); return; } if (P.res.gold < RU.MOUNT_COST) { U.toast('Not enough gold.'); return; } P.res.gold -= RU.MOUNT_COST; town.punks--; RU.addMounts(st, vis, 1); vis.mpMax = RU.mpMax(st, vis); T.render(); U.refresh(); })]) : el('p', { cls: 'small muted', text: 'Bring an army to the gate to buy mounts.' })]));
  }

  function paddockRow(town, st, P, vis) {
    const n = el('input', { cls: 'inp', type: 'number', min: 1, value: Math.min(10, Math.max(1, town.punks || 1)), style: { width: '64px' } });
    const dd = destOf(town, st, vis);
    const go = what => { const r = RU.paddock(st, town, what, +n.value, dd.slots, dd.hero); if (!r.ok) { U.toast(r.why); return; }
      U.toast({ muster: r.n + ' punks join as Domestic Punks.', butcher: r.n + ' punks make ' + r.food + ' food.', work: r.n + ' punks go to work: buildings here cost less.', rest: r.n + ' punks come back from work.' }[what]); T.render(); U.refresh(); };
    return el('div', { cls: 'row', style: { marginTop: '6px' } }, [n, ' punks: ',
      btn('Muster as troops (' + RU.PUNK_MUSTER + ' gold each)', () => go('muster'), '', 'They become a stack of Domestic Punks in ' + (dd.hero ? dd.hero.name + '’s army' : 'the garrison')),
      btn('Butcher for food (+' + RU.PUNK_FOOD + ' each)', () => go('butcher'), '', 'Food for your people and armies'),
      btn('Put to work', () => go('work'), '', 'Every 10 working punks take 10% off wood and stone (and 5% off gold) for buildings in this town, up to 40%'),
      town.labour ? btn('Call them back from work', () => go('rest')) : null]);
  }
  function armyTab(body, town, st, P, vis) {
    const groups = [];
    const vh = vis && S.heroOf(st, vis);
    if (vis) groups.push({ label: vh ? 'At the gate: ' + vh.name : 'At the gate: a squadron', slots: S.slotsOf(st, vis), hero: vh, onlyCaptain: !vh, keepOne: false });
    groups.push({ label: 'Garrison', slots: town.garrison });
    town.heroes.forEach(id => { const h = st.heroes[id]; if (h) groups.push({ label: h.name + ' (inside)' + (town.defender === id ? ' — defending general' : ''), slots: h.slots, hero: h }); });
    body.appendChild(DL.armyEditor(groups, () => U.refresh(), { town }));
    const acts = el('div', { cls: 'row', style: { marginTop: '8px' } });
    if (vis && vh) acts.appendChild(btn('Bring ' + vh.name + ' inside', () => { if (S.isEmptySlots(vh.slots) && false) return; RU.stationHero(st, vis, town); T.render(); U.refresh(); }, '', 'The hero leaves the map and stays in the town. They no longer count toward your ' + D.MAX_FIELD_HEROES + ' heroes on the map.'));
    if (vis && !vh && S.isEmptySlots(vis.slots)) RU.removeArmy(st, vis);
    if (vis && !vh) acts.appendChild(btn('Squadron joins the garrison', () => { const i = town.garrison.findIndex(s => !s); if (i < 0) { U.toast('The garrison is full.'); return; } town.garrison[i] = vis.slots[0]; RU.removeArmy(st, vis); T.render(); U.refresh(); }));
    town.heroes.forEach(id => { const h = st.heroes[id]; if (!h) return;
      acts.appendChild(btn('Send ' + h.name + ' out', () => { if (S.isEmptySlots(h.slots)) { U.toast('Give ' + h.name + ' some troops first.'); return; } const r = RU.sendOut(st, town, h); if (!r.ok) U.toast(r.why); else { U.select(r.army.id); T.close(); } }, 'primary'));
      if (town.defender !== id) acts.appendChild(btn('Make ' + h.name + ' the defending general', () => { town.defender = id; T.render(); }));
    });
    town.garrison.forEach((s, i) => { if (s && s.kind === 'cap' && s.stacks.length) acts.appendChild(btn('Send ' + s.cap.name + '’s squadron out', () => { const r = RU.sendSquadron(st, town, i); if (!r.ok) U.toast(r.why); else { U.select(r.army.id); T.close(); } }, '', 'A squadron with a captain can go out without a hero.')); });
    body.appendChild(acts);
  }

  function heroesTab(body, town, st, P, vis) {
    const heroes = town.heroes.map(id => st.heroes[id]).filter(Boolean);
    if (vis && vis.heroId) heroes.unshift(st.heroes[vis.heroId]);
    if (!heroes.length) { body.appendChild(el('p', { text: 'No hero is in town. Hire one at the tavern.' })); return; }
    const halls = town.built.filter(b => D.BUILDINGS[b].teaches);
    heroes.forEach(h => {
      const n = Object.keys(h.skills).length;
      const row = el('div', { cls: 'frame', style: { marginBottom: '8px' } });
      row.appendChild(el('div', { cls: 'row' }, [U.portrait(h.people, h.look, P.color, 40), el('b', { text: h.name }), el('span', { cls: 'small muted', text: n + ' / 5 basic skills · trained ' + h.trainedToday + ' / 2 today' }), el('span', { cls: 'spacer' }), btn('Hero', () => DL.hero(h))]));
      row.appendChild(el('div', {}, Object.entries(h.skills).map(([id, lv]) => el('span', { cls: 'skillchip act' }, [D.SKILLS[id].name, el('span', { cls: 'pips', text: U.pips(lv) })]))));
      if (n < 5) {
        if (!halls.length) row.appendChild(el('p', { cls: 'warn', text: 'This town has no training hall. Build one (Drill Yard, Road Lodge…) to train heroes.' }));
        halls.forEach(bid => { const opts = RU.trainOffer(st, town, h, bid) || [];
          row.appendChild(el('div', { cls: 'row', style: { marginTop: '4px' } }, [el('span', { style: { width: '150px' }, cls: 'small', text: D.BUILDINGS[bid].name + ':' }), opts.length ? null : el('span', { cls: 'small muted', text: 'Nothing new to learn here.' }),
            ...opts.map(o => btn(D.SKILLS[o.id].name + (o.lv > 1 ? ' (level ' + o.lv + ')' : ''), () => { const r = RU.train(st, town, h, o); if (!r.ok) U.toast(r.why); T.render(); U.refresh(); }, 'primary', D.SKILLS[o.id].desc)),
            opts.length ? el('span', { cls: 'small' }, U.costView({ gold: RU.trainCost(h) }, P)) : null])); });
      }
      const tier = Math.max(0, ...town.built.map(b => D.BUILDINGS[b].songTier || 0));
      if (tier) row.appendChild(el('div', { cls: 'row', style: { marginTop: '6px' } }, [btn('Learn the songs of this town', () => { const l = RU.learnTownSongs(st, town, h); U.toast(l.length ? h.name + ' learned ' + l.map(s => D.SONGS[s].name).join(', ') + '.' : S.skill(st, h, 'songcraft') ? 'Nothing new here for ' + h.name + '.' : h.name + ' has no Songcraft.'); T.render(); }, 'duat'), el('span', { cls: 'small muted', text: 'Songs up to tier ' + tier + ', for heroes with Songcraft.' })]));
      body.appendChild(row);
    });
  }

  function vaultTab(body, town, st, P, vis) {
    if (!RU.has(town, 'vault')) { body.appendChild(el('p', { text: 'Build a Memory Vault to keep memory cores safe and to turn captain cores into new captains.' })); return; }
    const heroes = town.heroes.map(id => st.heroes[id]).filter(Boolean); if (vis && vis.heroId) heroes.unshift(st.heroes[vis.heroId]);
    /* heroes can leave their spare cores in the vault */
    heroes.forEach(h => h.cores.slice().forEach(cid => { const c = st.cores[cid]; if (c && c.kind === 'captain') { h.cores = h.cores.filter(x => x !== cid); P.vault.push(cid); } }));
    body.appendChild(el('p', { cls: 'small muted', text: 'Captain cores that heroes bring here are kept in the vault. Make a new captain from one: they come with all of the fallen captain’s abilities.' }));
    const caps = P.vault.map(id => st.cores[id]).filter(c => c && c.kind === 'captain');
    if (!caps.length) body.appendChild(el('p', { text: 'The vault holds no captain cores.' }));
    body.appendChild(el('div', { cls: 'row', style: { alignItems: 'stretch' } }, caps.map(c => el('div', { cls: 'frame col', style: { width: '190px' }, 'data-tip': DL.captainTip(c.captain) }, [U.coreIcon('captain', 30), el('b', { text: c.name }), el('div', { cls: 'small muted', text: D.CAPTAIN_RANKS[c.captain.rank].name + ' · level ' + c.captain.level + ' · ' + D.CAPTAIN_ABIL[c.captain.abil].name }),
      btn('Make a captain (' + (400 + c.captain.level * 150) + ' gold)', () => { const r = RU.captainFromCore(st, P, town, c.id, town.garrison); if (!r.ok) U.toast(r.why); else U.toast('A new captain joins the garrison.'); T.render(); U.refresh(); }, 'primary')]))));
    const extra = []; heroes.forEach(h => h.cores.forEach(cid => { const c = st.cores[cid]; if (c && c.kind === 'hero') extra.push({ h, c }); }));
    if (extra.length) body.appendChild(el('div', { cls: 'small', style: { marginTop: '8px' } }, 'Hero cores carried outside the pouch: ' + extra.map(e => e.c.name + ' (' + e.h.name + ')').join(', ') + '. Put them in a pouch from the hero window.'));
  }

  function gateTab(body, town, st, P, vis) {
    const others = S.townsOf(st, town.owner).filter(t => t !== town && RU.has(t, 'urverk'));
    const vh = vis && S.heroOf(st, vis);
    body.appendChild(el('p', { text: 'The Duat Gate: once a day, a hero at this town’s gate may step through the Duat to any of your other towns with a Duat Gate.' }));
    if (!vh) { body.appendChild(el('p', { cls: 'muted', text: 'No hero is at the gate.' })); return; }
    if (!others.length) { body.appendChild(el('p', { cls: 'muted', text: 'You have no other town with a Duat Gate.' })); return; }
    body.appendChild(el('div', { cls: 'row' }, others.map(t => btn(t.name + ' (' + D.LAYERS[t.layer].name + ')', () => {
      if (vh.gateDay === st.day) { U.toast('The gate has been used today.'); return; }
      if (S.armyAt(st, t.layer, t.x, t.y)) { U.toast('Someone stands at the gate of ' + t.name + '.'); return; }
      vh.gateDay = st.day; S.moveArmyIndex(st, vis, t.layer, t.x, t.y); S.reveal(st, vis.owner, t.layer, t.x, t.y, RU.sight(st, vis)); U.toast(vh.name + ' steps out of the Duat at ' + t.name + '.'); T.open(t); V.centerOn(t.layer, t.x, t.y);
    }, 'duat'))));
  }
  function shipTab(body, town, st, P, vis) {
    body.appendChild(el('p', { text: 'Build a boat: it waits on the water by the town.' }));
    body.appendChild(btn('Build a boat (1000 gold, 10 wood)', () => DL.shipyard(vis || { owner: town.owner }, { layer: town.layer, x: town.x, y: town.y + 1 }), 'primary'));
  }
})(typeof window !== 'undefined' ? window : globalThis);
