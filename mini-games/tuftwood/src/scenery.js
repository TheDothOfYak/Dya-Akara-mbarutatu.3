// 4 Brothers World V3: the painted place itself. Ground, trees, cottages, the Hollow, the pond.
// Style target (McKay's references): smooth shapes, clean dark-brown outlines, soft gradients, warm palette.
(function () {
  'use strict';
  const V3 = window.V3, U = V3.util, P = V3.paint, W = V3.world, S = V3.sky, TAU = U.TAU;
  const SC = (V3.scenery = {});
  const INK = P.INK;
  SC.trees = []; SC.houses = []; SC.deco = []; SC.signs = [];

  // ================= placement =================
  SC.init = () => {
    const r = U.mulberry(2026);
    const noTree = (x) => (x > 860 && x < 2130) || (x > 3560 && x < 5080) || (x > 6560 && x < 7780) || (x > 5790 && x < 6270) || x > 9150 || x < 120 || Math.abs(W.slope(x)) > 0.75;
    let x = 160;
    while (x < 9200) {
      x += 150 + r() * 210;
      if (noTree(x)) continue;
      const big = r() < 0.4, h = big ? 430 + r() * 150 : 250 + r() * 130;
      const t = { x, y: W.groundY(x) + 6, h, w: big ? 46 + r() * 14 : 30 + r() * 10, seed: Math.floor(r() * 1e6), hue: r() < 0.12 ? 'pink' : r() < 0.1 ? 'gold' : 'green', poms: [], limbs: [] };
      const n = big ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + r(), d = i === 0 ? 0 : h * (0.16 + r() * 0.1);
        t.poms.push({ dx: Math.cos(a) * d * 1.25, dy: -h - 10 + Math.sin(a) * d * 0.7, r: (big ? 96 : 70) * (i === 0 ? 1.15 : 0.7 + r() * 0.3), k: Math.floor(r() * 3), ph: r() * 6 });
      }
      t.poms.sort((a, b) => a.dy - b.dy);
      if (big || r() < 0.5) { // climbable limbs
        const cnt = big ? 2 : 1;
        for (let i = 0; i < cnt; i++) {
          const side = (i + (t.seed & 1)) % 2 ? 1 : -1, ly = t.y - h * (0.38 + i * 0.24) - r() * 20, len = 100 + r() * 50;
          t.limbs.push({ side, y: ly, len });
          W.platforms.push({ x1: side > 0 ? x + 8 : x - len, x2: side > 0 ? x + len : x - 8, y: ly, kind: 'branch' });
        }
      }
      SC.trees.push(t);
    }
    // Old Snagroot's glade keeps one hand-placed tree out; the owl tree and the willow are hand-placed
    SC.owlTree = SC.trees.reduce((b, t) => (Math.abs(t.x - 2750) < Math.abs(b.x - 2750) ? t : b), SC.trees[0]);
    // cottages: {x, door colour, who}
    [[3720, '#3f9c94', 'burr'], [4040, '#d9694f', 'tuft'], [4620, '#e2a93b', 'empty'], [4930, '#7a79c9', 'keeper']].forEach((h, i) => {
      const hx = h[0], gy = W.groundY(hx);
      SC.houses.push({ x: hx, y: gy + 4, door: h[1], who: h[2], k: i });
      W.platforms.push({ x1: hx - 96, x2: hx + 96, y: gy - 236, kind: 'roof' });
    });
    // little things: bushes, stones, flowers, toadstools
    for (let dx = 80; dx < 9500; dx += 46 + r() * 90) {
      const sl = Math.abs(W.slope(dx)); if (sl > 0.9) continue;
      const cave = dx > 890 && dx < 1960, pond = dx > 6690 && dx < 7680;
      const k = r();
      if (cave) { if (k < 0.55) SC.deco.push({ t: 'glowcap', x: dx, s: 0.6 + r() * 0.9, seed: r() * 99 }); else if (k < 0.8) SC.deco.push({ t: 'stone', x: dx, s: 0.6 + r(), seed: r() * 99 }); continue; }
      if (pond) { if (k < 0.3) SC.deco.push({ t: 'stone', x: dx, s: 0.5 + r() * 0.8, seed: r() * 99 }); else if (k < 0.6) SC.deco.push({ t: 'weed', x: dx, s: 0.7 + r() * 0.8, seed: r() * 99 }); continue; }
      if (k < 0.3) SC.deco.push({ t: 'flower', x: dx, s: 0.7 + r() * 0.6, c: ['#ffd166', '#ff8fa3', '#fff3e6', '#b79cff', '#ff9f5a'][Math.floor(r() * 5)], seed: r() * 99 });
      else if (k < 0.48 && !(dx > 3600 && dx < 5050)) SC.deco.push({ t: 'bush', x: dx, s: 0.7 + r() * 0.7, seed: Math.floor(r() * 3), back: r() < 0.6 });
      else if (k < 0.6) SC.deco.push({ t: 'stone', x: dx, s: 0.5 + r() * 0.8, seed: r() * 99 });
      else if (k < 0.68) SC.deco.push({ t: 'toad', x: dx, s: 0.6 + r() * 0.6, seed: r() * 99 });
      else if (k < 0.8) SC.deco.push({ t: 'fern', x: dx, s: 0.7 + r() * 0.6, seed: r() * 99 });
    }
    for (const d of SC.deco) d.y = W.groundY(d.x);
    for (let rx = 6660; rx < 7720; rx += 26 + r() * 40) if (rx < 6790 || rx > 7570) SC.deco.push({ t: 'reed', x: rx, y: W.groundY(rx), s: 0.8 + r() * 0.6, seed: r() * 99 });
    SC.deco.sort((a, b) => a.x - b.x);
    SC.signs = [
      { x: 640, text: ['Sunbake Desert', 'west of here', '(not in this sample)'] },
      { x: 9080, text: ['Tall Peaks', 'up and east', '(not in this sample)'] },
      { x: 5240, text: ["Snagroot's Glade", 'MIND THE VINES', ''] },
    ];
    for (const s of SC.signs) s.y = W.groundY(s.x);
  };

  // ================= sprites =================
  const POM = { dark: ['#3a7446', '#28583a', '#1b4130', '#122c20'], green: ['#cfe86a', '#7cbf45', '#3c8540', '#27533a'], pink: ['#ffd9df', '#f59bb4', '#c95f86', '#7a3a5c'], gold: ['#ffe9a0', '#f2b544', '#c9782c', '#7a4320'] };
  const pomSpr = (hue, k) => P.sprite('pom' + hue + k, [-125, -125, 125, 125], (g) => {
    const c = POM[hue], r = U.mulberry(100 + k * 7), R = 100;
    const pts = []; const n = 22;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, rr = R * (i % 2 ? 1.07 + r() * 0.07 : 0.92 + r() * 0.05); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    P.blobPath(g, pts);
    const gr = g.createRadialGradient(-38, -46, 8, 0, 0, R * 1.15); gr.addColorStop(0, c[0]); gr.addColorStop(0.5, c[1]); gr.addColorStop(1, c[2]);
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    P.glow(g, 46, 60, 90, c[3], 0.55);                    // shade low right
    // layered tufts, like soft fur
    for (let i = 0; i < 46; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * R * 0.86, x = Math.cos(a) * d, y = Math.sin(a) * d, s = 9 + r() * 9;
      const lit = x + y < -10;
      g.strokeStyle = lit ? U.rgba('#ffffff', 0.33) : U.rgba(c[3], 0.42); g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - s, y - s * 0.2); g.quadraticCurveTo(x, y + s * 0.8, x + s, y - s * 0.2); g.stroke();
    }
    g.restore();
    P.blobPath(g, pts); g.strokeStyle = c[3]; g.lineWidth = 3.2; g.stroke();
  });
  SC.pom = pomSpr;
  const trunkSpr = (t) => P.sprite('trunk' + t.seed, [-110, -t.h - 30, 110, 40], (g) => {
    const r = U.mulberry(t.seed), w = t.w, h = t.h, lean = (r() - 0.5) * 40;
    const path = () => {
      g.beginPath(); g.moveTo(-w * 1.25, 30); g.quadraticCurveTo(-w * 0.62, -10, -w * 0.5, -h * 0.4);
      g.quadraticCurveTo(-w * 0.42 + lean * 0.5, -h * 0.8, -w * 0.3 + lean, -h - 10); g.lineTo(w * 0.3 + lean, -h - 10);
      g.quadraticCurveTo(w * 0.42 + lean * 0.5, -h * 0.8, w * 0.5, -h * 0.4); g.quadraticCurveTo(w * 0.62, -10, w * 1.3, 30); g.closePath();
    };
    path(); g.fillStyle = P.lin(g, -w, 0, w, 0, [[0, '#c98f5a'], [0.45, '#9a6238'], [1, '#5c3721']]); g.fill();
    g.save(); g.clip();
    for (let i = 0; i < h / 22; i++) { const y = -r() * h, x = (r() - 0.5) * w * 0.8; g.strokeStyle = U.rgba('#3a2216', 0.35); g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 5, y + 16, x - 2, y + 34); g.stroke(); }
    for (let i = 0; i < 8; i++) P.ell(g, -w * 0.3 + (r() - 0.5) * 8, -r() * h, 4, 14, U.rgba('#ffe2b0', 0.16));
    g.restore();
    path(); g.strokeStyle = INK; g.lineWidth = 3.4; g.lineJoin = 'round'; g.stroke();
    t.lean = lean;
    for (const L of t.limbs) { // limbs you can stand on
      const y = L.y - t.y, d = L.side;
      g.beginPath(); g.moveTo(d * w * 0.25, y + 24); g.quadraticCurveTo(d * L.len * 0.5, y + 19, d * (L.len - 6), y + 13); g.quadraticCurveTo(d * (L.len + 7), y + 6, d * (L.len - 4), y - 1); g.quadraticCurveTo(d * L.len * 0.5, y - 1, d * w * 0.25, y - 4); g.closePath();
      g.fillStyle = P.lin(g, 0, y - 12, 0, y + 24, [[0, '#c08752'], [1, '#6b4127']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    }
  });
  const houseSpr = (h) => P.sprite('house' + h.k, [-190, -330, 190, 30], (g) => {
    const r = U.mulberry(60 + h.k);
    // wall: a plump round cottage
    g.beginPath(); g.moveTo(-128, 8); g.bezierCurveTo(-150, -70, -140, -170, -96, -190); g.lineTo(96, -190); g.bezierCurveTo(140, -170, 150, -70, 128, 8); g.closePath();
    g.fillStyle = P.lin(g, -130, 0, 130, 0, [[0, '#fff0cf'], [0.55, '#f2d7a4'], [1, '#c99f6c']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
    P.dabs(g, r, 0, -90, 110, 80, 26, 9, ['#e0bd86', '#fff6de'], 0.35);
    // timber
    g.strokeStyle = '#7a4a2a'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-118, -60); g.lineTo(118, -60); g.stroke();
    // door
    g.beginPath(); g.moveTo(-34, 8); g.lineTo(-34, -52); g.arc(0, -52, 34, Math.PI, 0); g.lineTo(34, 8); g.closePath();
    g.fillStyle = P.lin(g, -34, 0, 34, 0, [[0, U.mixHex(h.door, '#ffffff', 0.25)], [1, U.mixHex(h.door, '#000000', 0.25)]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 3.5; g.stroke();
    P.ell(g, 20, -40, 4.5, 4.5, '#f6d36b'); g.strokeStyle = U.rgba('#000000', 0.18); g.lineWidth = 2; g.beginPath(); g.moveTo(0, -84); g.lineTo(0, 6); g.stroke();
    // round window (the warm light is drawn live at night)
    for (const wx of [-84, 84]) { P.ell(g, wx, -112, 25, 25, '#6b4127'); P.ell(g, wx, -112, 20, 20, '#9fd4e6'); P.ell(g, wx - 6, -119, 8, 6, 'rgba(255,255,255,.6)'); g.strokeStyle = '#6b4127'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(wx - 20, -112); g.lineTo(wx + 20, -112); g.moveTo(wx, -132); g.lineTo(wx, -92); g.stroke(); g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.arc(wx, -112, 25, 0, TAU); g.stroke(); }
    // chimney
    g.fillStyle = '#b5654a'; P.rr(g, 64, -318, 30, 70, 5); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    // thatch roof: a big tufty mop, like a fuzzy's fur
    const pts = [[-172, -176]]; for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; pts.push([Math.cos(a) * 168, -196 + Math.sin(a) * 118]); } pts.push([172, -176]);
    for (let i = 11; i >= 0; i--) pts.push([-160 + i * 29 + 14, -160 + (i % 2) * 18]);
    P.blobPath(g, pts); g.fillStyle = P.lin(g, -150, -320, 150, -160, [[0, '#f6d27a'], [0.5, '#dfa648'], [1, '#a66a2c']]); g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 70; i++) { const x = -160 + r() * 320, y = -310 + r() * 150; g.strokeStyle = r() < 0.5 ? U.rgba('#fff0b8', 0.5) : U.rgba('#7a4a1e', 0.4); g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (x > 0 ? 5 : -5), y + 14, x + (x > 0 ? 9 : -9), y + 30); g.stroke(); }
    g.restore(); P.blobPath(g, pts); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
    // flower box
    g.fillStyle = '#8a5530'; P.rr(g, -110, -86, 52, 12, 4); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
    for (let i = 0; i < 5; i++) { P.ell(g, -104 + i * 10, -92 - (i % 2) * 4, 5, 5, ['#ff8fa3', '#ffd166', '#fff'][i % 3]); }
  });
  const decoSpr = (d) => {
    if (d.t === 'bush') return P.sprite('bush' + d.seed, [-90, -90, 90, 14], (g) => {
      const r = U.mulberry(d.seed + 5);
      for (let i = 0; i < 5; i++) { const x = -52 + i * 26 + r() * 8, rr = 26 + r() * 16, y = -rr * 0.8; P.ball(g, x, y, rr, rr, '#b9de62', '#5fa544', '#2f6e3c'); g.strokeStyle = '#27533a'; g.lineWidth = 2.6; g.beginPath(); g.arc(x, y, rr, Math.PI * 0.95, TAU * 1.02); g.stroke(); }
      for (let i = 0; i < 6; i++) P.ell(g, -50 + r() * 100, -52 + r() * 34, 4.5, 4.5, d.seed === 1 ? '#e6506a' : '#3f7fd0');
    });
    if (d.t === 'stone') return P.sprite('stone' + Math.floor(d.seed % 4), [-34, -34, 34, 8], (g) => {
      const r = U.mulberry(Math.floor(d.seed % 4) + 30), pts = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; pts.push([Math.cos(a) * (24 + r() * 7), -12 + Math.sin(a) * (13 + r() * 5)]); }
      P.blobPath(g, pts); g.fillStyle = P.lin(g, -20, -30, 20, 6, [[0, '#d8d2c8'], [0.6, '#9b948c'], [1, '#6c655f']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      P.ell(g, -8, -18, 8, 3.5, 'rgba(255,255,255,.4)', -0.3);
    });
    if (d.t === 'toad') return P.sprite('toad' + Math.floor(d.seed % 2), [-26, -44, 26, 6], (g) => {
      const red = Math.floor(d.seed % 2);
      g.fillStyle = '#fff1d6'; P.rr(g, -6, -22, 12, 26, 5); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
      g.beginPath(); g.moveTo(-22, -18); g.quadraticCurveTo(-20, -42, 0, -42); g.quadraticCurveTo(20, -42, 22, -18); g.quadraticCurveTo(0, -12, -22, -18); g.closePath();
      g.fillStyle = P.lin(g, -20, -42, 20, -16, red ? [[0, '#ff8a70'], [1, '#c8402f']] : [[0, '#f3c98a'], [1, '#b0733a']]); g.fill(); g.stroke();
      P.ell(g, -8, -30, 4, 3, '#fff7e8'); P.ell(g, 7, -26, 3, 2.4, '#fff7e8'); P.ell(g, 1, -36, 2.4, 2, '#fff7e8');
    });
    if (d.t === 'glowcap') return P.sprite('glowcap', [-26, -44, 26, 6], (g) => {
      g.fillStyle = '#cfeee8'; P.rr(g, -4, -22, 8, 26, 4); g.fill();
      g.beginPath(); g.moveTo(-18, -18); g.quadraticCurveTo(-16, -40, 0, -40); g.quadraticCurveTo(16, -40, 18, -18); g.quadraticCurveTo(0, -13, -18, -18); g.closePath();
      g.fillStyle = P.lin(g, -16, -40, 16, -16, [[0, '#b8fff0'], [1, '#3fc7c0']]); g.fill(); g.strokeStyle = '#1f6f78'; g.lineWidth = 2.2; g.stroke();
    });
    return null;
  };

  // ================= terrain chunks =================
  const CH = 512, chunks = new Map();
  SC.flush = () => chunks.clear();
  const chunk = (ci) => {
    let c = chunks.get(ci); if (c) { c.used = S.time; return c; }
    const x0 = ci * CH; let mn = 1e9, mx = -1e9;
    for (let x = x0 - 8; x <= x0 + CH + 8; x += 8) { const y = W.groundY(x); if (y < mn) mn = y; if (y > mx) mx = y; }
    const top = mn - 40, bot = mx + 300, cv = document.createElement('canvas');
    cv.width = Math.ceil(CH * P.S); cv.height = Math.ceil((bot - top) * P.S);
    const g = cv.getContext('2d'); g.scale(P.S, P.S); g.translate(-x0, -top);
    const r = U.mulberry(ci * 13 + 1);
    const curve = (off) => { g.beginPath(); g.moveTo(x0 - 10, W.groundY(x0 - 10) + off); for (let x = x0 - 6; x <= x0 + CH + 10; x += 4) g.lineTo(x, W.groundY(x) + off); };
    curve(0); g.lineTo(x0 + CH + 10, bot + 10); g.lineTo(x0 - 10, bot + 10); g.closePath();
    g.save(); g.clip();
    // earth: warm, darker with depth below the surface
    for (let x = x0 - 4; x < x0 + CH + 4; x += 4) {
      const y = W.groundY(x), cave = x > 930 && x < 1940, pond = x > 6710 && x < 7650;
      const pb = pond ? U.clamp(Math.min(x - 6710, 7650 - x) / 70, 0, 1) : 0;
      const cb = cave ? U.clamp((x - 1700) / 240, 0, 1) : 0;
      g.fillStyle = P.lin(g, 0, y, 0, y + 300, cave ? [[0, U.mix('#6f5a52', '#a8703f', cb)], [0.3, U.mix('#4a3a38', '#7d4c2c', cb)], [1, U.mix('#2a2026', '#3b2319', cb)]] : pond ? [[0, U.mix('#a8703f', '#b99a6a', pb)], [0.25, U.mix('#7d4c2c', '#7a5c40', pb)], [1, '#3b2a22']] : [[0, '#a8703f'], [0.22, '#7d4c2c'], [1, '#3b2319']]);
      g.fillRect(x, y - 2, 4.5, bot - y + 14);
    }
    // painted strata, pebbles and roots
    for (let i = 0; i < 60; i++) { const x = x0 + r() * CH, y = W.groundY(x) + 30 + r() * 250; P.ell(g, x, y, 14 + r() * 30, 3 + r() * 5, r() < 0.5 ? 'rgba(255,214,160,.10)' : 'rgba(30,14,10,.16)', (r() - 0.5) * 0.3); }
    for (let i = 0; i < 9; i++) {
      const x = x0 + 34 + r() * (CH - 68), y = W.groundY(x) + 40 + r() * 200, rr = 5 + r() * 9;
      P.ball(g, x, y, rr * 1.25, rr, '#cbb9a4', '#8f7c6c', '#5a4a42'); g.strokeStyle = U.rgba('#2a1a14', 0.7); g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, rr * 1.25, rr, 0, 0, TAU); g.stroke();
    }
    for (let i = 0; i < 5; i++) { const x = x0 + r() * CH, y = W.groundY(x) + 12; g.strokeStyle = U.rgba('#3a2216', 0.55); g.lineWidth = 3 + r() * 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 10, y + 30, x - 22 + r() * 40, y + 60, x - 30 + r() * 60, y + 90 + r() * 40); g.stroke(); }
    g.restore();
    // the surface: grass, cave stone, or pond sand; drawn in short runs so each kind gets its own paint
    const kind = (x) => (x > 935 && x < 1930 ? 'cave' : x > 6712 && x < 7650 ? 'sand' : Math.abs(W.slope(x)) > 1.15 ? 'rock' : 'grass');
    const run = (off, width, cols) => {
      g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = width;
      let cur = null;
      for (let x = x0 - 8; x <= x0 + CH + 8; x += 4) {
        const k = kind(x);
        if (k !== cur) { if (cur) g.stroke(); cur = k; g.strokeStyle = cols[k]; g.beginPath(); g.moveTo(x - 4, W.groundY(x - 4) + off); }
        g.lineTo(x, W.groundY(x) + off);
      }
      g.stroke();
    };
    // scallops of turf hanging over the earth
    for (let x = x0 - 12; x < x0 + CH + 12; x += 15) { if (kind(x) !== 'grass') continue; const y = W.groundY(x); P.ell(g, x + r() * 4, y + 9, 10.5, 9 + r() * 6, '#3f8a3c'); }
    run(4, 17, { grass: '#2c5c30', cave: '#2a2026', sand: '#5c452f', rock: '#4d463f' });
    run(2, 11.5, { grass: '#58a844', cave: '#75625a', sand: '#d1b481', rock: '#a59c90' });
    run(-1.5, 4.5, { grass: '#b6de63', cave: '#9a867a', sand: '#efd9a8', rock: '#d6cfc2' });
    c = { cv, x: x0, y: top, w: CH, h: bot - top, used: S.time };
    chunks.set(ci, c);
    if (chunks.size > 9) { let old = null; for (const [k, v] of chunks) if (!old || v.used < old[1].used) old = [k, v]; chunks.delete(old[0]); }
    return c;
  };

  // ================= drawing =================
  // everything behind the ground line: cave backing, trees, cottages, bushes
  SC.drawBack = (g, v) => {
    // the Hollow's back wall, so the pit reads as a cave and not open sky
    if (v.x1 > 860 && v.x0 < 1990) {
      g.fillStyle = P.lin(g, 0, -14, 0, 460, [[0, '#4a3830'], [0.4, '#30252a'], [1, '#1d1820']]);
      g.beginPath(); g.moveTo(884, W.groundY(884)); for (let x = 890; x <= 1130; x += 20) g.lineTo(x, W.groundY(x) < 30 ? W.groundY(x) : 30 + (x - 900) * 0.1); g.lineTo(1130, -14); g.lineTo(1770, -14); g.lineTo(1960, W.groundY(1960) - 4); g.lineTo(1960, 520); g.lineTo(884, 520); g.closePath(); g.fill();
      const r = U.mulberry(4);
      for (let i = 0; i < 40; i++) { const x = 940 + r() * 950, y = 70 + r() * 340; P.ell(g, x, y, 30 + r() * 50, 8 + r() * 12, 'rgba(120,96,90,.10)'); }
      for (let i = 0; i < 16; i++) { const x = 1150 + r() * 600, len = 50 + r() * 130; g.strokeStyle = '#3d2b24'; g.lineWidth = 4 + r() * 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, 60); g.bezierCurveTo(x + 14, 60 + len * 0.4, x - 16, 60 + len * 0.7, x + (r() - 0.5) * 30, 60 + len); g.stroke(); }
    }
    for (const d of SC.deco) { if (!d.back || d.x < v.x0 - 100 || d.x > v.x1 + 100) continue; P.put(g, decoSpr(d), d.x, d.y + 6, S.sway(d.x) * 0.02, d.s, d.s); }
    for (const t of SC.trees) {
      if (t.x < v.x0 - 320 || t.x > v.x1 + 320) continue;
      P.ell(g, t.x, t.y + 2, t.w * 2.2, 10, 'rgba(30,20,10,.22)');
      P.put(g, trunkSpr(t), t.x, t.y);
      for (const L of t.limbs) P.put(g, pomSpr(t.hue, 0), t.x + L.side * (L.len + 6), L.y - 22 + S.sway(t.x, 2) * 3, S.sway(t.x + 40) * 0.05, 0.42, 0.42);
      const shake = t.shake > 0 ? Math.sin(t.shake * 40) * t.shake * 12 : 0;
      for (const p of t.poms) {
        const sw = S.sway(t.x + p.dx, p.ph);
        P.put(g, pomSpr(t.hue, p.k), t.x + (t.lean || 0) + p.dx + sw * 9 + shake, t.y + p.dy + Math.abs(sw) * 2, sw * 0.045, p.r / 100, p.r / 100);
      }
    }
    for (const h of SC.houses) {
      if (h.x < v.x0 - 220 || h.x > v.x1 + 220) continue;
      P.ell(g, h.x, h.y + 2, 150, 12, 'rgba(30,20,10,.25)');
      P.put(g, houseSpr(h), h.x, h.y);
      if (S.night > 0.25 && h.who !== 'empty') { g.globalCompositeOperation = 'lighter'; for (const wx of [-84, 84]) { P.ell(g, h.x + wx, h.y - 112, 19, 19, U.rgba('#ffc45a', S.night * 0.8)); P.glow(g, h.x + wx, h.y - 112, 58, '#ffb84a', S.night * 0.55); } g.globalCompositeOperation = 'source-over'; }
      // chimney smoke
      if (h.who !== 'empty' && U.chance(0.05)) P.emit({ x: h.x + 79, y: h.y - 322, vx: 6 + S.wind * 30, vy: -26, life: 3.2, r: 9, grow: 1.6, col: '#f1ece6', a: 0.35, kind: 'dot', layer: -1 });
    }
    for (const s of SC.signs) {
      if (s.x < v.x0 - 100 || s.x > v.x1 + 100) continue;
      g.fillStyle = '#8a5a34'; P.rr(g, s.x - 5, s.y - 96, 10, 100, 3); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = P.lin(g, 0, s.y - 132, 0, s.y - 70, [[0, '#e9c58d'], [1, '#c2935a']]); P.rr(g, s.x - 78, s.y - 132, 156, 60, 9); g.fill(); g.stroke();
      g.fillStyle = '#4a2f1e'; g.textAlign = 'center'; g.font = '700 19px Gaegu, cursive'; g.fillText(s.text[0], s.x, s.y - 110);
      g.font = '400 14px Gaegu, cursive'; g.fillText(s.text[1], s.x, s.y - 94); g.fillText(s.text[2], s.x, s.y - 80);
    }
  };
  SC.drawTerrain = (g, v) => {
    for (let ci = Math.floor(v.x0 / CH); ci <= Math.floor(v.x1 / CH); ci++) {
      if (ci < 0 || ci * CH > W.X1) continue;
      const c = chunk(ci);
      g.drawImage(c.cv, c.x, c.y, c.w + 0.5, c.h);
      if (c.y + c.h < v.y1) { g.fillStyle = c.x > 900 && c.x < 1500 ? '#2a2026' : c.x > 1500 && c.x < 1600 ? U.mix('#2a2026', '#3b2319', 0.5) : '#3b2319'; g.fillRect(c.x, c.y + c.h - 1, c.w + 0.5, v.y1 - c.y - c.h + 2); }
    }
    // the earth shelf over the Hollow, with turf on top and roots below
    for (const s of W.solids) {
      if (s.x > v.x1 || s.x + s.w < v.x0) continue;
      if (s.kind === 'shelf') {
        P.rr(g, s.x - 6, s.y, s.w + 12, s.h, 16); g.fillStyle = P.lin(g, 0, s.y, 0, s.y + s.h, [[0, '#a8703f'], [0.4, '#7d4c2c'], [1, '#452a1e']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 3.5; g.stroke();
        g.lineCap = 'round'; g.strokeStyle = '#2c5c30'; g.lineWidth = 17; g.beginPath(); g.moveTo(s.x, s.y + 4); g.lineTo(s.x + s.w, s.y + 4); g.stroke();
        g.strokeStyle = '#58a844'; g.lineWidth = 11.5; g.beginPath(); g.moveTo(s.x, s.y + 2); g.lineTo(s.x + s.w, s.y + 2); g.stroke();
        g.strokeStyle = '#b6de63'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(s.x, s.y - 1.5); g.lineTo(s.x + s.w, s.y - 1.5); g.stroke();
      } else {
        P.rr(g, s.x, s.y, s.w, s.h, 14); g.fillStyle = P.lin(g, 0, s.y, 0, s.y + s.h, [[0, '#d6cfc2'], [1, '#7c746c']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 3.5; g.stroke();
      }
    }
    for (const p of W.platforms) {
      if (p.gone || p.x2 < v.x0 || p.x1 > v.x1) continue;
      if (p.kind === 'ledge') { P.rr(g, p.x1 - 4, p.y - 3, p.x2 - p.x1 + 8, 24, 10); g.fillStyle = P.lin(g, 0, p.y, 0, p.y + 22, [[0, '#d6cfc2'], [1, '#857c72']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); P.rr(g, p.x1, p.y - 6, p.x2 - p.x1, 8, 4); g.fillStyle = '#6fb04a'; g.fill(); }
      else if (p.kind === 'twig') { const sag = 8; g.strokeStyle = INK; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x1 - 10, p.y + 2); g.quadraticCurveTo((p.x1 + p.x2) / 2, p.y + sag + 6, p.x2 + 8, p.y + 2); g.stroke(); g.strokeStyle = '#b98a58'; g.lineWidth = 7; g.stroke(); }
    }
    for (const wl of W.walls) {
      if (wl.x < v.x0 - 80 || wl.x > v.x1 + 80) continue;
      const r = U.mulberry(wl.x);
      if (wl.broken) { for (let i = 0; i < 5; i++) P.ell(g, wl.x - 40 + r() * 80, wl.y2 - 6 - r() * 10, 12, 6, wl.kind === 'root' ? '#5a3a28' : '#3d6b3a', r() * 3); continue; }
      if (wl.kind === 'root') {
        for (let i = 0; i < 6; i++) { const x = wl.x - 22 + i * 9; g.strokeStyle = INK; g.lineWidth = 15; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, wl.y1); g.bezierCurveTo(x + 16, wl.y1 + 120, x - 18, wl.y2 - 120, x + (r() - 0.5) * 24, wl.y2); g.stroke(); g.strokeStyle = i % 2 ? '#8a5c3a' : '#6e452b'; g.lineWidth = 10; g.stroke(); }
        g.strokeStyle = 'rgba(255,230,170,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(wl.x - 6, wl.y1 + 120); g.lineTo(wl.x + 4, wl.y1 + 150); g.lineTo(wl.x - 4, wl.y1 + 176); g.lineTo(wl.x + 6, wl.y1 + 200); g.stroke(); // the crack
      } else {
        for (let y = wl.y2; y > wl.y1; y -= 34) { const x = wl.x + Math.sin(y * 0.05) * 14; P.ball(g, x, y - 14, 34, 28, '#7fbf55', '#3f8a3c', '#21502e'); g.strokeStyle = '#1e3d24'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y - 14, 34, 28, 0, 0, TAU); g.stroke(); }
        for (let i = 0; i < 26; i++) { const y = wl.y1 + r() * (wl.y2 - wl.y1), x = wl.x + (r() - 0.5) * 70; g.fillStyle = '#5a2f3c'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7, y - 13); g.lineTo(x + 10, y + 2); g.fill(); if (i % 5 === 0) P.ell(g, x, y + 8, 5, 5, '#c9305a'); }
      }
    }
  };
  // small things standing on the ground, and swaying grass in front of everyone's feet
  SC.drawDeco = (g, v) => {
    for (const d of SC.deco) {
      if (d.back || d.x < v.x0 - 80 || d.x > v.x1 + 80) continue;
      const sw = S.sway(d.x, d.seed);
      if (d.t === 'flower') {
        const h = 26 * d.s; g.strokeStyle = '#3f8a3c'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(d.x, d.y + 2); g.quadraticCurveTo(d.x + sw * 4, d.y - h * 0.6, d.x + sw * 9, d.y - h); g.stroke();
        const fx = d.x + sw * 9, fy = d.y - h; for (let i = 0; i < 5; i++) P.ell(g, fx + Math.cos(i * 1.257 + sw) * 5 * d.s, fy + Math.sin(i * 1.257 + sw) * 5 * d.s, 4.2 * d.s, 4.2 * d.s, d.c); P.ell(g, fx, fy, 3 * d.s, 3 * d.s, '#f2a12e');
      } else if (d.t === 'fern') {
        g.strokeStyle = '#2f7a3c'; g.lineWidth = 3; g.lineCap = 'round';
        for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(d.x, d.y + 3); g.quadraticCurveTo(d.x + i * 9 * d.s + sw * 3, d.y - 24 * d.s, d.x + i * 20 * d.s + sw * 8, d.y - (30 - Math.abs(i) * 8) * d.s); g.stroke(); }
      } else if (d.t === 'reed') {
        g.strokeStyle = '#4c8a3e'; g.lineWidth = 3.2; g.lineCap = 'round'; const h = 70 * d.s; g.beginPath(); g.moveTo(d.x, d.y + 4); g.quadraticCurveTo(d.x + sw * 6, d.y - h * 0.5, d.x + sw * 16, d.y - h); g.stroke();
        P.ell(g, d.x + sw * 14.5, d.y - h * 0.92, 4.5, 11, '#7a4a2a', sw * 0.2);
      } else if (d.t === 'weed') {
        g.strokeStyle = '#2f8f6e'; g.lineWidth = 4; g.lineCap = 'round'; const h = 60 * d.s, k = Math.sin(S.time * 1.2 + d.seed); g.beginPath(); g.moveTo(d.x, d.y + 3); g.bezierCurveTo(d.x + k * 10, d.y - h * 0.3, d.x - k * 12, d.y - h * 0.6, d.x + k * 8, d.y - h); g.stroke();
      } else {
        const sp = decoSpr(d); if (!sp) continue;
        if (d.t === 'glowcap') { g.globalCompositeOperation = 'lighter'; P.glow(g, d.x, d.y - 26 * d.s, 46 * d.s, '#59f0de', 0.28 + 0.1 * Math.sin(S.time * 2 + d.seed)); g.globalCompositeOperation = 'source-over'; }
        P.put(g, sp, d.x, d.y + 5, d.t === 'bush' ? sw * 0.02 : 0, d.s, d.s);
      }
    }
  };
  SC.drawGrass = (g, v) => {
    const a = Math.floor(v.x0 / 13) - 1, b = Math.ceil(v.x1 / 13) + 1;
    for (let pass = 0; pass < 2; pass++) {
      g.strokeStyle = pass ? '#a9d85e' : '#3f8f3c'; g.lineWidth = pass ? 2.2 : 3.2; g.lineCap = 'round'; g.beginPath();
      for (let i = a; i < b; i++) {
        if ((i & 1) !== pass) continue;
        const x = i * 13 + U.hash(i) * 9; if ((x > 932 && x < 1932) || (x > 6705 && x < 7655)) continue;
        if (Math.abs(W.slope(x)) > 1.15) continue;
        const y = W.groundY(x) + 3, h = 11 + U.hash(i * 3.3) * 13, sw = S.sway(x, i) * 7 + (SC.bend ? SC.bend(x) : 0);
        g.moveTo(x - 4, y); g.quadraticCurveTo(x - 3 + sw * 0.4, y - h * 0.6, x - 5 + sw, y - h * 0.8);
        g.moveTo(x, y); g.quadraticCurveTo(x + sw * 0.5, y - h * 0.7, x + 1 + sw * 1.2, y - h);
        g.moveTo(x + 4, y); g.quadraticCurveTo(x + 4 + sw * 0.4, y - h * 0.5, x + 7 + sw, y - h * 0.7);
      }
      g.stroke();
    }
  };
  // the pond, painted over whatever is under the surface
  SC.drawWater = (g, v) => {
    for (const w of W.waters) {
      if (w.x1 > v.x1 || w.x2 < v.x0) continue;
      const wave = (x) => w.y + Math.sin(x * 0.03 + S.time * 1.6) * 2.2 + Math.sin(x * 0.011 - S.time) * 1.8;
      g.beginPath(); g.moveTo(w.x1, wave(w.x1));
      for (let x = w.x1; x <= w.x2; x += 12) g.lineTo(x, wave(x));
      for (let x = w.x2; x >= w.x1; x -= 16) g.lineTo(x, W.groundY(x) + 6);
      g.closePath();
      const top = U.mixHex(S.pal.mid, '#3fb7b0', 0.45);
      g.fillStyle = P.lin(g, 0, w.y, 0, w.y + 210, [[0, U.rgba(top, 0.62)], [0.35, 'rgba(36,128,150,.62)'], [1, 'rgba(14,52,92,.84)']]); g.fill();
      // sky glints and the sun's or moon's road on the water
      g.save(); g.clip(); g.globalCompositeOperation = 'lighter';
      const r = U.mulberry(12);
      for (let i = 0; i < 26; i++) { const x = w.x1 + r() * (w.x2 - w.x1), y = w.y + 6 + r() * 40, l = 14 + r() * 40; g.globalAlpha = (0.12 + 0.12 * Math.sin(S.time * 2 + i)) * (1 - S.night * 0.5); P.ell(g, x + Math.sin(S.time + i) * 6, y, l, 1.6, '#ffffff'); }
      const gx = v.x0 + (S.night > 0.5 ? (v.x1 - v.x0) - S.sunX : S.sunX);
      for (let i = 0; i < 7; i++) { g.globalAlpha = 0.22 - i * 0.025; P.ell(g, gx + Math.sin(S.time * 1.4 + i) * 8, w.y + 8 + i * 12, 46 - i * 4, 3, S.night > 0.5 ? '#cfd8ff' : '#fff0b0'); }
      g.restore(); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.4; g.beginPath(); for (let x = w.x1; x <= w.x2; x += 12) g.lineTo(x, wave(x)); g.stroke();
    }
  };
  // dark out-of-focus leaves close to the eye, at the top and sides
  SC.drawFront = (g, cam, vw, vh) => {
    const z = V3.world.zoneAt(cam.x).id; if (z === 'village' || z === 'pond' || z === 'ridge') return;
    const sp = pomSpr('dark', 1);
    for (let i = 0; i < 5; i++) {
      const wx = i * 760 + 140, sx = ((wx - cam.x * 1.45) % 3800 + 3800) % 3800 - 500;
      if (sx < -260 || sx > vw + 260) continue;
      g.globalAlpha = 0.92;
      P.put(g, sp, sx, -78 + (i % 2) * 26 + Math.sin(S.time + i) * 4, S.sway(wx) * 0.06, 1.7, 1.15);
    }
    g.globalAlpha = 1;
  };
  SC.lights = (out, v) => {
    for (const d of SC.deco) if (d.t === 'glowcap' && d.x > v.x0 - 200 && d.x < v.x1 + 200) out.push({ x: d.x, y: d.y - 26, r: 130 * d.s, a: 0.75 });
    if (S.night > 0.2) for (const h of SC.houses) if (h.who !== 'empty' && h.x > v.x0 - 400 && h.x < v.x1 + 400) { out.push({ x: h.x - 84, y: h.y - 100, r: 170, a: 0.7 }); out.push({ x: h.x + 84, y: h.y - 100, r: 170, a: 0.7 }); }
  };
})();
