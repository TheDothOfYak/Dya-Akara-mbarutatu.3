/* ============================================================
   SKAAR UVERKHRON — js/sketch.js
   The drawn map. Everyone carries a drawing of the Mbaru Tatu,
   made when the game began: the shape of the land is true, but
   it is old (what has been built or ruined since is not on it),
   and it is rougher the further it gets from any town. Land you
   have not seen is shown as that drawing, in ink on parchment;
   land you have seen is the land itself, and land you saw once
   but cannot see now is shown as you remember it.

   Also here: the hero's map (the Map button: your hands holding
   the drawing of a whole world, with your territories, your
   caravans' roads and the storm), territory borders and names
   on the land, and the worlds view (zoom all the way out: the
   three Tatu and their moons turning, the Urverk between them).
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, A = SU.art, V = SU.mapView;
  const SK = SU.sketch = {};
  const INK = '#3b2a17', INK2 = 'rgba(59,42,23,0.55)', PAPER = '#dccb9f';
  const CH = 12;
  const RL = () => SU.realm;
  const st = () => V.st;
  const viewer = () => V.viewer();

  /* ======================= paper ======================= */
  let paperTex = null;
  function paper() {
    if (paperTex) return paperTex;
    const n = 256, c = A.canvas(n, n), g = c.getContext('2d'), img = g.createImageData(n, n), nz = SU.noise2(4242), nz2 = SU.noise2(99);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      /* tileable: blend four noise lookups */
      const u = x / n, v = y / n, f = (a, b) => nz.fbm(a * 6, b * 6, 4);
      const val = f(u, v) * (1 - u) * (1 - v) + f(u - 1, v) * u * (1 - v) + f(u, v - 1) * (1 - u) * v + f(u - 1, v - 1) * u * v;
      const fib = nz2(x * 0.9, y * 0.08) * 0.5;
      const k = 1 + val * 0.07 + fib * 0.035, o = (y * n + x) * 4;
      img.data[o] = Math.min(255, 220 * k); img.data[o + 1] = Math.min(255, 203 * k); img.data[o + 2] = Math.min(255, 159 * k); img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return (paperTex = c);
  }
  SK.paper = paper;

  /* ======================= how good the drawing is, tile by tile ======================= */
  function detail(stt, li) {
    stt._detail = stt._detail || [];
    if (stt._detail[li]) return stt._detail[li];
    const L = stt.layers[li], out = new Float32Array(L.w * L.h);
    const towns = (stt.sketch || []).filter(o => o.t === 'town' && o.l === li);
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      let d = 99; towns.forEach(t => { d = Math.min(d, Math.hypot(t.x - x, t.y - y)); });
      out[y * L.w + x] = li === 3 ? 0.75 : SU.clamp(1.2 - d / 24, 0.2, 1);
    }
    return (stt._detail[li] = out);
  }
  SK.detail = detail;
  const hash = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + (k || 0) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  /* ======================= ink marks ======================= */
  const G = SK.glyph = {
    peak(g, x, y, s) { g.beginPath(); g.moveTo(x - s * 0.55, y); g.lineTo(x - s * 0.06, y - s * 0.75); g.lineTo(x + s * 0.5, y); g.stroke();
      g.beginPath(); for (let k = 1; k <= 3; k++) { const t = k / 4; g.moveTo(x - s * 0.06 + s * 0.56 * t, y - s * 0.75 * (1 - t)); g.lineTo(x - s * 0.06 + s * 0.56 * t - s * 0.12, y - s * 0.75 * (1 - t) + s * 0.28); } g.stroke(); },
    bump(g, x, y, s) { g.beginPath(); g.arc(x, y, s * 0.3, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); },
    tree(g, x, y, s) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 0.3); g.stroke(); g.beginPath(); g.arc(x, y - s * 0.48, s * 0.22, 0, Math.PI * 2); g.stroke(); },
    pine(g, x, y, s) { g.beginPath(); g.moveTo(x - s * 0.22, y - s * 0.1); g.lineTo(x, y - s * 0.5); g.lineTo(x + s * 0.22, y - s * 0.1); g.moveTo(x - s * 0.17, y - s * 0.32); g.lineTo(x, y - s * 0.7); g.lineTo(x + s * 0.17, y - s * 0.32); g.moveTo(x, y); g.lineTo(x, y - s * 0.1); g.stroke(); },
    tuft(g, x, y, s) { g.beginPath(); g.moveTo(x - s * 0.12, y); g.lineTo(x - s * 0.2, y - s * 0.2); g.moveTo(x, y); g.lineTo(x, y - s * 0.26); g.moveTo(x + s * 0.12, y); g.lineTo(x + s * 0.2, y - s * 0.2); g.stroke(); },
    dots(g, x, y, s) { for (let k = 0; k < 3; k++) { g.fillRect(x + (k - 1) * s * 0.2, y - (k % 2) * s * 0.12, Math.max(1, s * 0.05), Math.max(1, s * 0.05)); } },
    snow(g, x, y, s) { g.beginPath(); g.moveTo(x - s * 0.2, y - s * 0.1); g.lineTo(x - s * 0.1, y); g.lineTo(x, y - s * 0.1); g.lineTo(x + s * 0.1, y); g.lineTo(x + s * 0.2, y - s * 0.1); g.stroke(); },
    town(g, x, y, s) { g.beginPath(); g.rect(x - s * 0.5, y - s * 0.5, s, s * 0.5); g.moveTo(x - s * 0.2, y - s * 0.5); g.lineTo(x - s * 0.2, y - s * 0.95); g.lineTo(x + s * 0.2, y - s * 0.95); g.lineTo(x + s * 0.2, y - s * 0.5);
      for (let k = -2; k <= 2; k++) { g.moveTo(x + k * s * 0.2, y - s * 0.5); g.lineTo(x + k * s * 0.2, y - s * 0.6); } g.moveTo(x, y - s * 0.95); g.lineTo(x, y - s * 1.2); g.lineTo(x + s * 0.18, y - s * 1.12); g.lineTo(x, y - s * 1.05); g.stroke(); },
    keep(g, x, y, s) { g.beginPath(); g.rect(x - s * 0.18, y - s * 0.75, s * 0.36, s * 0.75); g.moveTo(x - s * 0.24, y - s * 0.75); g.lineTo(x, y - s * 1.0); g.lineTo(x + s * 0.24, y - s * 0.75); g.stroke(); },
    village(g, x, y, s) { [[-0.2, 0], [0.18, -0.05]].forEach(([dx, dy]) => { const hx = x + dx * s, hy = y + dy * s; g.beginPath(); g.rect(hx - s * 0.13, hy - s * 0.2, s * 0.26, s * 0.2); g.moveTo(hx - s * 0.17, hy - s * 0.2); g.lineTo(hx, hy - s * 0.38); g.lineTo(hx + s * 0.17, hy - s * 0.2); g.stroke(); }); },
    urverk(g, x, y, s) { g.beginPath(); g.ellipse(x, y - s * 0.4, s * 0.3, s * 0.4, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(x, y - s * 0.4, s * 0.14, s * 0.22, 0, 0, Math.PI * 2); g.stroke(); },
    mine(g, x, y, s) { g.beginPath(); g.moveTo(x - s * 0.25, y); g.lineTo(x + s * 0.25, y - s * 0.5); g.moveTo(x + s * 0.25, y); g.lineTo(x - s * 0.25, y - s * 0.5); g.moveTo(x + s * 0.12, y - s * 0.55); g.lineTo(x + s * 0.34, y - s * 0.42); g.moveTo(x - s * 0.12, y - s * 0.55); g.lineTo(x - s * 0.34, y - s * 0.42); g.stroke(); },
    visit(g, x, y, s) { g.beginPath(); g.arc(x, y - s * 0.25, s * 0.14, 0, Math.PI * 2); g.stroke(); g.beginPath(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.moveTo(x + Math.cos(a) * s * 0.2, y - s * 0.25 + Math.sin(a) * s * 0.2); g.lineTo(x + Math.cos(a) * s * 0.32, y - s * 0.25 + Math.sin(a) * s * 0.32); } g.stroke(); },
    ruin(g, x, y, s) { g.beginPath(); g.moveTo(x - s * 0.3, y); g.lineTo(x - s * 0.3, y - s * 0.35); g.lineTo(x - s * 0.18, y - s * 0.25); g.moveTo(x + s * 0.05, y); g.lineTo(x + s * 0.05, y - s * 0.5); g.lineTo(x + s * 0.2, y - s * 0.35); g.lineTo(x + s * 0.2, y); g.stroke(); },
    post(g, x, y, s) { g.beginPath(); g.moveTo(x - s * 0.15, y); g.lineTo(x - s * 0.08, y - s * 0.6); g.lineTo(x + s * 0.08, y - s * 0.6); g.lineTo(x + s * 0.15, y); g.moveTo(x - s * 0.15, y - s * 0.6); g.lineTo(x, y - s * 0.78); g.lineTo(x + s * 0.15, y - s * 0.6); g.stroke(); },
    chest(g, x, y, s) { g.beginPath(); g.moveTo(x - s * 0.25, y - s * 0.4); g.lineTo(x + s * 0.25, y - s * 0.1); g.moveTo(x + s * 0.25, y - s * 0.4); g.lineTo(x - s * 0.25, y - s * 0.1); g.stroke(); },
  };
  SK.placeGlyph = function (g, t, x, y, s) { (G[t] || G.visit)(g, x, y, s); };

  /* ======================= the drawing, in chunks (for the land you have not seen) ======================= */
  let chunks = {}, coastNoise = null, coastSeed = null;
  SK.reset = function () { chunks = {}; worldTex = {}; bakedMap = {}; visCache = null; borderKey = null; coastNoise = null; };
  function coastN(stt) { if (!coastNoise || coastSeed !== stt.seed) { coastNoise = SU.noise2((stt.seed || 1) + 77); coastSeed = stt.seed; } return coastNoise; }
  /* a wobbly point on a tile corner: the same for every chunk, so lines join up; rougher where the drawing is poor */
  function wob(stt, li, x, y, amp) { const n = coastN(stt); return [x + n(x * 0.71 + li * 13, y * 0.71) * amp, y + n(x * 0.71 + 50, y * 0.71 + li * 7) * amp]; }
  function drawSketchTiles(g, stt, li, x0, y0, x1, y1, ts, ox, oy, opts) {
    const L = stt.layers[li], det = detail(stt, li), P = opts && opts.P;
    const at = (x, y) => S.inside(L, x, y) ? S.TCODES[L.t[y * L.w + x]] : null;
    const wet = t => t === 'water' || t === 'void' || t == null;
    const known = (x, y) => P && P.explored[li][y * L.w + x];
    /* the sea: a faint wash (one shape, so no seams) and a few ripples */
    const wash = (kind, col) => { g.beginPath(); let any = false; for (let y = y0; y <= y1; y++) { let run = -1; for (let x = x0; x <= x1 + 1; x++) { const on = x <= x1 && at(x, y) === kind; if (on && run < 0) run = x; if (!on && run >= 0) { g.rect(ox + run * ts, oy + y * ts, (x - run) * ts, ts); run = -1; any = true; } } } if (any) { g.fillStyle = col; g.fill(); } };
    wash('water', 'rgba(64,112,140,0.24)'); wash('void', 'rgba(28,22,40,0.55)');
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = at(x, y); if (!t) continue; const px = ox + x * ts, py = oy + y * ts;
      if (t === 'water') {
        if (hash(x, y, 1) < 0.18) { g.strokeStyle = 'rgba(59,42,23,0.35)'; g.lineWidth = Math.max(0.6, ts * 0.025); g.beginPath(); g.moveTo(px + ts * 0.15, py + ts * 0.5); g.quadraticCurveTo(px + ts * 0.32, py + ts * 0.38, px + ts * 0.5, py + ts * 0.5); g.quadraticCurveTo(px + ts * 0.68, py + ts * 0.62, px + ts * 0.85, py + ts * 0.5); g.stroke(); } }
      else if (t === 'void') { if (hash(x, y, 2) < 0.12) { g.fillStyle = 'rgba(240,230,200,0.7)'; g.fillRect(px + hash(x, y, 3) * ts, py + hash(x, y, 4) * ts, Math.max(1, ts * 0.04), Math.max(1, ts * 0.04)); } }
    }
    /* the coast, in ink */
    g.strokeStyle = INK; g.lineWidth = Math.max(1, ts * 0.055); g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = at(x, y); if (!t || wet(t)) continue;
      const amp = 0.08 + (1 - (known(x, y) ? 1 : det[y * L.w + x])) * 0.28;
      const seg = (ax, ay, bx, by) => { const p = wob(stt, li, ax, ay, amp), q = wob(stt, li, bx, by, amp); g.moveTo(ox + p[0] * ts, oy + p[1] * ts); g.lineTo(ox + q[0] * ts, oy + q[1] * ts); };
      if (wet(at(x, y - 1))) seg(x, y, x + 1, y); if (wet(at(x, y + 1))) seg(x, y + 1, x + 1, y + 1);
      if (wet(at(x - 1, y))) seg(x, y, x, y + 1); if (wet(at(x + 1, y))) seg(x + 1, y, x + 1, y + 1);
    }
    g.stroke();
    /* roads: dashes */
    g.strokeStyle = 'rgba(90,62,34,0.85)'; g.lineWidth = Math.max(0.8, ts * 0.045); g.setLineDash([ts * 0.16, ts * 0.13]); g.beginPath();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (!S.inside(L, x, y) || !L.road[y * L.w + x]) continue;
      [[1, 0], [0, 1], [1, 1], [-1, 1]].forEach(([dx, dy]) => { const xx = x + dx, yy = y + dy; if (S.inside(L, xx, yy) && L.road[yy * L.w + xx]) { if (dx && dy && (L.road[y * L.w + xx] || L.road[yy * L.w + x])) return; g.moveTo(ox + (x + 0.5) * ts, oy + (y + 0.5) * ts); g.lineTo(ox + (xx + 0.5) * ts, oy + (yy + 0.5) * ts); } }); }
    g.stroke(); g.setLineDash([]);
    /* the land: hills, woods, marsh and sand, sparser where the drawing is poor */
    g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = Math.max(0.7, ts * 0.04);
    for (let y = y0; y <= y1 + 1; y++) for (let x = x0; x <= x1; x++) {
      if (!S.inside(L, x, y)) continue; const i = y * L.w + x, t = S.TCODES[L.t[i]], ob = L.ob[i], d = known(x, y) ? 1 : det[i], h = hash(x, y, 9);
      const px = ox + (x + 0.5) * ts + (hash(x, y, 5) - 0.5) * ts * 0.25, py = oy + (y + 0.82) * ts;
      if (ob === S.OB.mountain) { if (h < 0.55 + d * 0.45) G.peak(g, px, py, ts * 0.95); continue; }
      if (ob === S.OB.ridge || ob === S.OB.rock) { if (h < d) G.bump(g, px, py, ts); continue; }
      if (ob === S.OB.pine) { if (h < d * 0.8) G.pine(g, px, py, ts); continue; }
      if (ob === S.OB.tree || ob === S.OB.glowtree || ob === S.OB.palm || ob === S.OB.deadtree) { if (h < d * 0.75) G.tree(g, px, py, ts); continue; }
      if (ob === S.OB.reeds || t === 'swamp') { if (h < d * 0.35) G.tuft(g, px, py, ts); continue; }
      if (t === 'sand' || t === 'ash') { if (h < d * 0.3) G.dots(g, px, py - ts * 0.2, ts); continue; }
      if (t === 'snow') { if (h < d * 0.3) G.snow(g, px, py - ts * 0.2, ts); continue; }
      if (t === 'rough') { if (h < d * 0.25) G.bump(g, px, py, ts * 0.8); }
    }
    /* territory borders: faint dots */
    if (L.reg) { g.fillStyle = 'rgba(90,40,20,0.55)'; const rr = Math.max(0.8, ts * 0.05);
      const dot = (x, y) => { const p = wob(stt, li, x, y, 0.18); g.beginPath(); g.arc(ox + p[0] * ts, oy + p[1] * ts, rr, 0, Math.PI * 2); g.fill(); };
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (!S.inside(L, x, y)) continue; const a = L.reg[y * L.w + x]; if (!a) continue;
        if (x + 1 < L.w && L.reg[y * L.w + x + 1] && L.reg[y * L.w + x + 1] !== a) { dot(x + 1, y + 0.5); if (ts >= 20) { dot(x + 1, y + 0.1); dot(x + 1, y + 0.9); } }
        if (y + 1 < L.h && L.reg[(y + 1) * L.w + x] && L.reg[(y + 1) * L.w + x] !== a) { dot(x + 0.5, y + 1); if (ts >= 20) { dot(x + 0.1, y + 1); dot(x + 0.9, y + 1); } } } }
  }
  function sketchChunk(stt, li, cx, cy, ts) {
    const k = li + ':' + cx + ':' + cy + ':' + ts; if (chunks[k]) return chunks[k];
    const W = CH * ts, c = A.canvas(W, W), g = c.getContext('2d');
    g.fillStyle = g.createPattern(paper(), 'repeat'); g.save(); g.translate(-cx * W % 256, -cy * W % 256); g.fillRect(cx * W % 256, cy * W % 256, W, W); g.restore();
    /* the paper has aged unevenly: broad light and dark patches, the same wherever you look from */
    { const nz = coastN(stt), sm = A.canvas(CH + 2, CH + 2), sg = sm.getContext('2d'), img = sg.createImageData(CH + 2, CH + 2);
      for (let ty = 0; ty < CH + 2; ty++) for (let tx = 0; tx < CH + 2; tx++) { const v = nz.fbm((cx * CH + tx - 1) * 0.06 + 300, (cy * CH + ty - 1) * 0.06, 3), o4 = (ty * (CH + 2) + tx) * 4;
        if (v > 0) { img.data[o4] = 255; img.data[o4 + 1] = 248; img.data[o4 + 2] = 225; img.data[o4 + 3] = Math.round(v * 0.35 * 255); } else { img.data[o4] = 120; img.data[o4 + 1] = 84; img.data[o4 + 2] = 40; img.data[o4 + 3] = Math.round(-v * 0.3 * 255); } }
      sg.putImageData(img, 0, 0); g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(sm, -ts, -ts, (CH + 2) * ts, (CH + 2) * ts); g.restore(); }
    drawSketchTiles(g, stt, li, cx * CH - 1, cy * CH - 1, cx * CH + CH, cy * CH + CH, ts, -cx * CH * ts, -cy * CH * ts);
    return (chunks[k] = c);
  }

  /* where a territory's name is written: the middle of its land, moved clear of any town or keep */
  SK.labelAt = function (stt, r) {
    if (r._lab) return r._lab;
    const L = stt.layers[r.li]; let sx = 0, sy = 0, n = 0;
    for (let y = 0; y < L.h; y += 2) for (let x = 0; x < L.w; x += 2) if (L.reg[y * L.w + x] === r.k + 1) { sx += x; sy += y; n++; }
    let x = n ? Math.round(sx / n) : r.x, y = n ? Math.round(sy / n) : r.y;
    if (L.reg[y * L.w + x] !== r.k + 1) { x = r.x; y = r.y; }
    const busy = (xx, yy) => Object.values(stt.objects).some(o => o.layer === r.li && (o.type === 'town' || o.type === 'keep') && Math.abs(o.x - xx) <= 2 && yy - o.y >= -3 && yy - o.y <= 2);
    for (let k = 0; k < 6 && busy(x, y); k++) { if (S.inside(L, x, y + 2) && L.reg[(y + 2) * L.w + x] === r.k + 1) y += 2; else if (S.inside(L, x, y - 4) && L.reg[(y - 4) * L.w + x] === r.k + 1) y -= 4; else break; }
    return (r._lab = [x, y]);
  };

  /* ======================= what you can see right now ======================= */
  let visCache = null;
  SK.visible = function (stt, pi) {
    const P = stt.players[pi]; if (!P) return null;
    let key = stt.day + ':' + pi + ':' + stt.current + ':' + Object.keys(stt.objects).length;
    Object.values(stt.armies).forEach(a => { if (!a.dead && (a.owner === pi || S.allies(stt, a.owner, pi))) key += '|' + a.id + a.layer + ',' + a.x + ',' + a.y; });
    if (visCache && visCache.key === key) return visCache.vis;
    const vis = stt.layers.map(L => new Uint8Array(L.w * L.h));
    const mark = (li, cx, cy, r) => { const L = stt.layers[li], E = vis[li], r2 = r * r + r; for (let y = Math.max(0, cy - r); y <= Math.min(L.h - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(L.w - 1, cx + r); x++) if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) E[y * L.w + x] = 1; };
    const mineOrAlly = o => o === pi || (o >= 0 && S.allies(stt, o, pi));
    Object.values(stt.armies).forEach(a => { if (a.dead || !mineOrAlly(a.owner)) return; mark(a.layer, a.x, a.y, a.caravan ? 2 : SU.rules.sight(stt, a)); });
    Object.values(stt.objects).forEach(o => { if (o.gone || !mineOrAlly(o.owner)) return; if (o.type === 'town') mark(o.layer, o.x, o.y, 6); else if (o.type === 'keep' || o.type === 'post') mark(o.layer, o.x, o.y, 5); else if (o.type === 'mine' || o.type === 'village') mark(o.layer, o.x, o.y, 2); });
    /* remember who held what, as last seen */
    P.mem = P.mem || {};
    Object.values(stt.objects).forEach(o => { if (o.owner === undefined || o.gone) return; const L = stt.layers[o.layer]; if (L && vis[o.layer][o.y * L.w + o.x]) P.mem[o.id] = o.owner; });
    RL() && RL().all(stt).forEach(r => { const L = stt.layers[r.li]; if (vis[r.li][r.y * L.w + r.x] || r.owner === pi) (P.memReg = P.memReg || {})[r.id] = r.owner; });
    visCache = { key, vis };
    return vis;
  };
  SK.isVisible = (stt, pi, li, x, y) => { const v = SK.visible(stt, pi); const L = stt.layers[li]; return !!(v && S.inside(L, x, y) && v[li][y * L.w + x]); };

  /* ======================= the overlays on the land ======================= */
  let off = null, maskC = null, maskImg = null, memC = null, memImg = null;
  /* the drawing over the land you have not seen, with a soft torn edge */
  SK.drawOverlay = function (ctx, ox, oy, ts, li) {
    const stt = st(), L = stt.layers[li], P = stt.players[viewer()], E = P.explored[li];
    const dpr = V.dpr, W = Math.round(V.w * dpr), H = Math.round(V.h * dpr);
    if (!off || off.width !== W || off.height !== H) { off = A.canvas(W, H); }
    const g = off.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, V.w, V.h);
    const x0 = Math.floor(-ox / ts) - 1, y0 = Math.floor(-oy / ts) - 1, x1 = Math.ceil((V.w - ox) / ts) + 1, y1 = Math.ceil((V.h - oy) / ts) + 1;
    let any = false;
    for (let y = Math.max(0, y0); y <= Math.min(L.h - 1, y1); y++) { for (let x = Math.max(0, x0); x <= Math.min(L.w - 1, x1); x++) if (!E[y * L.w + x]) { any = true; break; } if (any) break; }
    if (!any) return;
    for (let cy = Math.max(0, Math.floor(y0 / CH)); cy <= Math.min(Math.floor((L.h - 1) / CH), Math.floor(y1 / CH)); cy++)
      for (let cx = Math.max(0, Math.floor(x0 / CH)); cx <= Math.min(Math.floor((L.w - 1) / CH), Math.floor(x1 / CH)); cx++)
        g.drawImage(sketchChunk(stt, li, cx, cy, ts), Math.round(ox + cx * CH * ts), Math.round(oy + cy * CH * ts));
    /* the places on the drawing: everyone's drawing has the towns, and the places near them */
    g.strokeStyle = INK; g.lineWidth = Math.max(1, ts * 0.05); g.lineCap = 'round';
    (stt.sketch || []).forEach(o => { if (o.l !== li || o.x < x0 - 2 || o.x > x1 + 2 || o.y < y0 - 2 || o.y > y1 + 3) return;
      const px = ox + (o.x + 0.5) * ts, py = oy + (o.y + 0.9) * ts;
      SK.placeGlyph(g, o.t, px, py, ts * (o.t === 'town' ? 1.6 : 1));
      if (o.t === 'town' && ts >= 36) { g.font = 'italic ' + Math.round(ts * 0.3) + 'px Georgia'; g.textAlign = 'center'; g.fillStyle = INK; g.fillText('a town', px, py + ts * 0.42); } });
    /* territory names, in a clerk's hand */
    if (stt.regions && ts >= 28) { g.textAlign = 'center'; g.fillStyle = 'rgba(59,42,23,0.85)'; g.font = 'italic ' + Math.max(11, Math.round(ts * 0.36)) + 'px Georgia';
      stt.regions[li].forEach(r => { const p = SK.labelAt(stt, r); if (p[0] < x0 - 6 || p[0] > x1 + 6 || p[1] < y0 - 2 || p[1] > y1 + 2) return; g.fillText(r.name, ox + (p[0] + 0.5) * ts, oy + (p[1] + 0.2) * ts); }); }
    /* cut it to the land you have not seen */
    if (!maskC || maskC.width !== L.w + 2) { maskC = A.canvas(L.w + 2, L.h + 2); maskImg = maskC.getContext('2d').createImageData(L.w + 2, L.h + 2); }
    const d = maskImg.data;
    for (let y = -1; y <= L.h; y++) for (let x = -1; x <= L.w; x++) { const o4 = ((y + 1) * (L.w + 2) + x + 1) * 4; const seen = x >= 0 && y >= 0 && x < L.w && y < L.h && E[y * L.w + x]; d[o4] = 0; d[o4 + 1] = 0; d[o4 + 2] = 0; d[o4 + 3] = seen ? 0 : 255; }
    maskC.getContext('2d').putImageData(maskImg, 0, 0);
    g.globalCompositeOperation = 'destination-in'; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(maskC, 0, 0, maskC.width, maskC.height, ox - ts, oy - ts, maskC.width * ts, maskC.height * ts);
    g.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowColor = 'rgba(30,18,6,0.7)'; ctx.shadowBlur = 10 * dpr; ctx.drawImage(off, 0, 0);
    ctx.restore();
  };
  /* land you have seen but cannot see now: as you remember it, a little faded */
  SK.drawMemory = function (ctx, ox, oy, ts, li) {
    const stt = st(), L = stt.layers[li], P = stt.players[viewer()], E = P.explored[li], vis = SK.visible(stt, viewer()); if (!vis) return;
    const VI = vis[li];
    if (!memC || memC.width !== L.w + 2) { memC = A.canvas(L.w + 2, L.h + 2); memImg = memC.getContext('2d').createImageData(L.w + 2, L.h + 2); }
    const d = memImg.data;
    for (let y = -1; y <= L.h; y++) for (let x = -1; x <= L.w; x++) { const o4 = ((y + 1) * (L.w + 2) + x + 1) * 4, inside = x >= 0 && y >= 0 && x < L.w && y < L.h;
      d[o4] = 70; d[o4 + 1] = 52; d[o4 + 2] = 30; d[o4 + 3] = inside && E[y * L.w + x] && !VI[y * L.w + x] ? 95 : 0; }
    memC.getContext('2d').putImageData(memImg, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(memC, 0, 0, memC.width, memC.height, ox - ts, oy - ts, memC.width * ts, memC.height * ts); ctx.restore();
  };
  /* territory borders on the land: in the holder's colour where someone holds it, a faint line between wild lands */
  let borderKey = null;
  SK.drawBorders = function (ctx, ox, oy, ts, li, x0, y0, x1, y1) {
    const stt = st(), L = stt.layers[li]; if (!L.reg || !stt.regions) return;
    const P = stt.players[viewer()], E = P.explored[li], regs = stt.regions[li];
    const col = r => r && r.owner >= 0 ? stt.players[r.owner].color : null;
    const inset = Math.max(1.5, ts * 0.06);
    ctx.save(); ctx.lineCap = 'round';
    /* gather the edges by colour, then draw each colour in one stroke */
    const owned = new Map(), wild = [];
    for (let y = Math.max(0, y0); y <= Math.min(L.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(L.w - 1, x1); x++) {
      const i = y * L.w + x, a = L.reg[i]; if (!a || !E[i]) continue;
      const c = col(regs[a - 1]), px = ox + x * ts, py = oy + y * ts;
      [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(([dx, dy]) => {
        const xx = x + dx, yy = y + dy; if (!S.inside(L, xx, yy)) return; const b = L.reg[yy * L.w + xx]; if (!b || b === a) return;
        if (c) { let seg; if (dx === 1) seg = [px + ts - inset, py, px + ts - inset, py + ts]; else if (dx === -1) seg = [px + inset, py, px + inset, py + ts]; else if (dy === 1) seg = [px, py + ts - inset, px + ts, py + ts - inset]; else seg = [px, py + inset, px + ts, py + inset];
          if (!owned.has(c)) owned.set(c, []); owned.get(c).push(seg); }
        else if (dx > 0 || dy > 0) { if (col(regs[b - 1])) return; const sx = px + (dx ? ts : 0), sy = py + (dy ? ts : 0); wild.push([sx, sy, sx + (dy ? ts : 0), sy + (dx ? ts : 0)]); }
      });
    }
    const stroke = list => { ctx.beginPath(); list.forEach(q => { ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); }); ctx.stroke(); };
    if (wild.length) { ctx.strokeStyle = 'rgba(255,240,200,0.28)'; ctx.lineWidth = Math.max(1, ts * 0.035); ctx.setLineDash([ts * 0.1, ts * 0.12]); stroke(wild); }
    ctx.setLineDash([]); ctx.lineWidth = Math.max(2, ts * 0.07);
    owned.forEach((list, c) => { ctx.strokeStyle = A.rgba(c, 0.85); stroke(list); });
    ctx.setLineDash([]);
    /* names, where you have seen the land */
    if (ts >= 36) { ctx.textAlign = 'center'; ctx.font = 'italic ' + Math.round(ts * 0.3) + 'px Georgia';
      regs.forEach(r => { const lp = SK.labelAt(stt, r); if (lp[0] < x0 - 4 || lp[0] > x1 + 4 || lp[1] < y0 || lp[1] > y1 || !E[lp[1] * L.w + lp[0]]) return;
        const px = ox + (lp[0] + 0.5) * ts, py = oy + (lp[1] + 0.05) * ts, c = col(r);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(r.name, px + 1, py + 1); ctx.fillStyle = c ? A.mix(c, '#ffffff', 0.55) : 'rgba(255,240,205,0.8)'; ctx.fillText(r.name, px, py); }); }
    ctx.restore();
  };

  /* ======================= the hero's map ======================= */
  let hm = null, bakedMap = {}, hmRaf = 0;
  SK.mapOpen = () => !!(hm && !hm.root.classList.contains('hidden'));
  SK.openMap = function (li) {
    if (!st()) return;
    if (!hm) {
      const r = document.createElement('div'); r.id = 'heromap'; r.className = 'hidden';
      const c = document.createElement('canvas'); r.appendChild(c); document.body.appendChild(r);
      hm = { root: r, cv: c, layer: 0, hover: null };
      c.addEventListener('mousemove', e => { const rr = c.getBoundingClientRect(); hm.mouse = { x: e.clientX - rr.left, y: e.clientY - rr.top }; });
      c.addEventListener('mouseleave', () => { hm.mouse = null; });
      c.addEventListener('click', e => { const rr = c.getBoundingClientRect(); mapClick(e.clientX - rr.left, e.clientY - rr.top); });
      c.addEventListener('contextmenu', e => { e.preventDefault(); SK.closeMap(); });
      window.addEventListener('resize', () => { if (SK.mapOpen()) bakedMap = {}; });
    }
    hm.layer = li != null ? li : V.layer; bakedMap = {};
    hm.root.classList.remove('hidden'); V.hidden = true;
    cancelAnimationFrame(hmRaf); const loop = now => { if (!SK.mapOpen()) return; hmRaf = requestAnimationFrame(loop); drawHeroMap(now / 1000); }; hmRaf = requestAnimationFrame(loop);
  };
  SK.closeMap = function () { if (!hm) return; hm.root.classList.add('hidden'); V.hidden = false; cancelAnimationFrame(hmRaf); };
  SK.mapKey = function (e) {
    if (!SK.mapOpen()) return false;
    const k = e.key.toLowerCase();
    if (k === 'escape' || k === 'm') { SK.closeMap(); return true; }
    if (k >= '1' && k <= '4') { hm.layer = +k - 1; return true; }
    if (k === 'arrowleft') { hm.layer = (hm.layer + 3) % 4; return true; } if (k === 'arrowright') { hm.layer = (hm.layer + 1) % 4; return true; }
    return true;
  };
  /* where the paper sits on the screen */
  function layoutMap(W, H, li) {
    const L = st().layers[li], aspect = L.w / L.h;
    let pw = W * 0.74, ph = pw / aspect; if (ph > H * 0.72) { ph = H * 0.72; pw = ph * aspect; }
    return { x: (W - pw) / 2, y: H * 0.13, w: pw, h: ph, sc: pw / L.w };
  }
  /* the drawing of one world, with your knowledge on it, baked once while the map is open */
  function bakeMap(li, lay) {
    const k = li + ':' + Math.round(lay.w); if (bakedMap[k]) return bakedMap[k];
    const stt = st(), L = stt.layers[li], pi = viewer(), P = stt.players[pi], dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.ceil(lay.w * dpr), H = Math.ceil(lay.h * dpr), c = A.canvas(W, H), g = c.getContext('2d');
    g.scale(dpr, dpr); const sc = lay.sc;
    /* torn paper */
    const R = SU.makeRng(li * 97 + 3); g.beginPath(); const edge = []; const n = 60;
    for (let i = 0; i < n; i++) edge.push([i / n * lay.w, R.range(0, 6)]); for (let i = 0; i < n; i++) edge.push([lay.w - R.range(0, 6), i / n * lay.h]);
    for (let i = 0; i < n; i++) edge.push([lay.w - i / n * lay.w, lay.h - R.range(0, 6)]); for (let i = 0; i < n; i++) edge.push([R.range(0, 6), lay.h - i / n * lay.h]);
    edge.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.save(); g.clip();
    g.fillStyle = g.createPattern(paper(), 'repeat'); g.fillRect(0, 0, lay.w, lay.h);
    const vg = g.createRadialGradient(lay.w / 2, lay.h / 2, Math.min(lay.w, lay.h) * 0.3, lay.w / 2, lay.h / 2, Math.max(lay.w, lay.h) * 0.75); vg.addColorStop(0, 'rgba(120,80,30,0)'); vg.addColorStop(1, 'rgba(110,70,25,0.35)'); g.fillStyle = vg; g.fillRect(0, 0, lay.w, lay.h);
    /* the land, in ink: the drawing everyone has, sharper where you have been */
    drawSketchTiles(g, stt, li, 0, 0, L.w - 1, L.h - 1, sc, 0, 0, { P });
    /* the edges of land you hold, and of rivals' land you know of */
    if (L.reg && stt.regions) {
      const memReg = P.memReg || {}, holder = r => r.owner === pi ? pi : (memReg[r.id] != null ? memReg[r.id] : -1);
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const a = L.reg[y * L.w + x]; if (!a) continue; const ra = stt.regions[li][a - 1], ha = holder(ra); if (ha < 0) continue;
        const c = stt.players[ha].color;
        [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(([dx, dy]) => { const xx = x + dx, yy = y + dy; const b = S.inside(L, xx, yy) ? L.reg[yy * L.w + xx] : 0; if (b === a) return; if (b && holder(stt.regions[li][b - 1]) === ha) return;
          const inset = 1.6, px = x * sc, py = y * sc; g.strokeStyle = A.rgba(c, ha === pi ? 0.95 : 0.8); g.lineWidth = ha === pi ? 2.6 : 2; g.setLineDash(ha === pi ? [] : [5, 3]);
          g.beginPath(); if (dx === 1) { g.moveTo(px + sc - inset, py); g.lineTo(px + sc - inset, py + sc); } else if (dx === -1) { g.moveTo(px + inset, py); g.lineTo(px + inset, py + sc); } else if (dy === 1) { g.moveTo(px, py + sc - inset); g.lineTo(px + sc, py + sc - inset); } else { g.moveTo(px, py + inset); g.lineTo(px + sc, py + inset); } g.stroke(); }); }
      g.setLineDash([]);
      /* the names of the territories */
      g.textAlign = 'center'; g.font = 'italic ' + Math.round(SU.clamp(sc * 1.1, 10, 15)) + 'px Georgia';
      stt.regions[li].forEach(r => { const h = holder(r), lp = SK.labelAt(stt, r); g.fillStyle = h >= 0 ? A.shade(stt.players[h].color, -35) : 'rgba(59,42,23,0.9)'; g.fillText(r.name, (lp[0] + 0.5) * sc, (lp[1] + 0.1) * sc); });
    }
    /* roads and how long they take */
    roadTimes(g, stt, li, sc);
    /* places: what everyone's drawing has, and what you have seen since. Only ownership is in colour */
    const E = P.explored[li], mem = P.mem || {}, drawn = new Set();
    const place = (t, x, y, owner, size) => { const px = (x + 0.5) * sc, py = (y + 0.9) * sc, s = Math.max(7, sc * (size || 1.2));
      g.strokeStyle = INK; g.lineWidth = 1.2; SK.placeGlyph(g, t, px, py, s);
      if (owner != null && owner >= 0 && stt.players[owner]) { const c = stt.players[owner].color; g.fillStyle = c; g.strokeStyle = INK; g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(px + s * 0.3, py - s * 0.95); g.lineTo(px + s * 0.3, py - s * 1.45); g.lineTo(px + s * 0.75, py - s * 1.3); g.lineTo(px + s * 0.3, py - s * 1.15); g.fill(); g.stroke(); } };
    Object.values(stt.objects).forEach(o => { if (o.layer !== li || o.gone || o.hidden) return; const seen = E[o.y * L.w + o.x]; if (!seen) return;
      if (!['town', 'keep', 'village', 'urverk', 'mine', 'visit', 'post', 'ruin', 'chest'].includes(o.type)) return;
      drawn.add(o.x + ',' + o.y); const owner = o.owner === pi ? pi : mem[o.id] != null ? mem[o.id] : -1;
      place(o.type, o.x, o.y, o.type === 'mine' || o.type === 'village' ? null : owner, o.type === 'town' ? 2 : o.type === 'keep' ? 1.5 : 1.1); });
    (stt.sketch || []).forEach(o => { if (o.l !== li || drawn.has(o.x + ',' + o.y)) return; place(o.t, o.x, o.y, null, o.t === 'town' ? 2 : o.t === 'keep' ? 1.5 : 1.1); });
    /* treasure you were told of: an X */
    (P.treasure || []).map(id => stt.objects[id]).filter(o => o && o.layer === li && !o.gone).forEach(o => { g.strokeStyle = '#8a1a10'; g.lineWidth = 2.4; G.chest(g, (o.x + 0.5) * sc, (o.y + 0.9) * sc, Math.max(10, sc * 1.6)); });
    g.restore();
    /* a dark rim */
    g.strokeStyle = 'rgba(70,40,15,0.6)'; g.lineWidth = 2; edge.forEach(([x, y], i) => i ? g.lineTo(x, y) : (g.beginPath(), g.moveTo(x, y))); g.closePath(); g.stroke();
    return (bakedMap[k] = c);
  }
  /* along the roads between places: how many days a hero takes */
  function roadTimes(g, stt, li, sc) {
    const L = stt.layers[li], w = L.w, places = Object.values(stt.objects).filter(o => o.layer === li && !o.gone && (o.type === 'town' || o.type === 'keep' || o.type === 'urverk' || o.type === 'village'));
    const at = new Map(); places.forEach(o => { [[0, 0], [0, 1], [-1, 1], [1, 1]].forEach(([dx, dy]) => { const x = o.x + dx, y = o.y + dy; if (S.inside(L, x, y) && L.road[y * w + x]) at.set(y * w + x, o); }); });
    const done = new Set(); const perDay = 1500 / D.ROAD_COST;
    g.font = 'bold ' + Math.round(SU.clamp(sc * 0.95, 9, 12)) + 'px Georgia'; g.textAlign = 'center';
    places.forEach(o => {
      const starts = [...at.entries()].filter(([, p]) => p === o).map(([i]) => i); if (!starts.length) return;
      const dist = new Map(), q = starts.slice(); starts.forEach(i => dist.set(i, 0));
      while (q.length) { const i = q.shift(), x = i % w, y = (i / w) | 0, d = dist.get(i), other = at.get(i);
        if (other && other !== o) { const key = [o.id, other.id].sort().join('-'); if (!done.has(key)) { done.add(key); const days = Math.max(1, Math.round(d / perDay));
            const mx = ((o.x + other.x) / 2 + 0.5) * sc, my = ((o.y + other.y) / 2 + 1) * sc; const tx = days + (days === 1 ? ' day' : ' days');
            g.fillStyle = 'rgba(220,203,159,0.9)'; const tw = g.measureText(tx).width + 6; g.fillRect(mx - tw / 2, my - 9, tw, 12); g.fillStyle = '#5a2a10'; g.fillText(tx, mx, my); } continue; }
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (!S.inside(L, xx, yy)) continue; const j = yy * w + xx; if (!L.road[j] || dist.has(j)) continue; dist.set(j, d + (dx && dy ? 1.41 : 1)); q.push(j); } }
    });
  }
  function drawHeroMap(t) {
    const stt = st(); if (!stt) return; const cv = hm.cv, dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth, H = window.innerHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; bakedMap = {}; }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const li = hm.layer, lay = layoutMap(W, H, li), pi = viewer(), P = stt.players[pi], col = P.color;
    /* the table, by lamplight */
    g.fillStyle = A.radial(g, W / 2, H * 0.45, Math.max(W, H) * 0.75, '#3a2a1c', '#0a0705'); g.fillRect(0, 0, W, H);
    /* the tabs: one for each world */
    hm.tabs = [];
    const tabW = Math.min(150, lay.w / 4 - 8);
    D.LAYERS.forEach((ld, i) => { const x = lay.x + 14 + i * (tabW + 8), y = lay.y - 34, on = i === li, h = on ? 40 : 32;
      g.fillStyle = on ? '#e6d4a6' : '#b8a477'; g.strokeStyle = 'rgba(70,40,15,0.8)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, y + 40); g.lineTo(x, y + 40 - h + 6); g.quadraticCurveTo(x, y + 40 - h, x + 6, y + 40 - h); g.lineTo(x + tabW - 6, y + 40 - h); g.quadraticCurveTo(x + tabW, y + 40 - h, x + tabW, y + 40 - h + 6); g.lineTo(x + tabW, y + 40); g.fill(); g.stroke();
      g.fillStyle = INK; g.font = (on ? 'bold ' : '') + '15px Georgia'; g.textAlign = 'center'; g.fillText(ld.name, x + tabW / 2, y + 40 - h + 21);
      if (stt.storm && stt.storm.layer === i) { g.strokeStyle = '#3a4a7a'; g.lineWidth = 1.6; spiral(g, x + tabW - 14, y + 40 - h + 15, 7, t); }
      hm.tabs.push({ x, y: y + 40 - h, w: tabW, h, li: i }); });
    /* the paper, and the hands that hold it */
    const baked = bakeMap(li, lay);
    hands(g, lay, col, true, t);
    g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 24; g.drawImage(baked, lay.x, lay.y, lay.w, lay.h); g.restore();
    /* live: your caravans' roads, armies, the storm */
    g.save(); g.translate(lay.x, lay.y); g.beginPath(); g.rect(0, 0, lay.w, lay.h); g.clip();
    const sc = lay.sc, L = stt.layers[li], E = P.explored[li], vis = SK.visible(stt, pi);
    if (RL() && stt.regions) RL().regionsOf(stt, pi).filter(r => r.li === li && r.cv && r.cv.tiles).forEach(r => {
      g.strokeStyle = A.rgba(col, 0.85); g.lineWidth = 2; g.setLineDash([2, 5]); g.lineDashOffset = -t * 12; g.beginPath();
      r.cv.tiles.forEach((i, k) => { const x = (i % L.w + 0.5) * sc, y = (((i / L.w) | 0) + 0.5) * sc; k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]);
      const a = r.cv.army && stt.armies[r.cv.army]; if (a && !a.dead) { g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 1; g.fillRect((a.x + 0.2) * sc, (a.y + 0.3) * sc, Math.max(6, sc * 0.7), Math.max(4, sc * 0.45)); g.strokeRect((a.x + 0.2) * sc, (a.y + 0.3) * sc, Math.max(6, sc * 0.7), Math.max(4, sc * 0.45)); }
      if (r.cv.risk > 0.04) { const mid = r.cv.tiles[Math.floor(r.cv.tiles.length / 2)]; g.fillStyle = '#8a1a10'; g.font = 'bold 12px Georgia'; g.fillText('!', (mid % L.w + 0.5) * sc, (((mid / L.w) | 0)) * sc); } });
    Object.values(stt.armies).forEach(a => { if (a.dead || a.layer !== li || a.caravan || a.temp) return; const mine = a.owner === pi;
      if (!mine && !(a.owner >= 0 && vis && vis[li][a.y * L.w + a.x])) return;
      const x = (a.x + 0.5) * sc, y = (a.y + 0.5) * sc, c = stt.players[a.owner].color, r = a.heroId ? Math.max(4, sc * 0.55) : Math.max(3, sc * 0.4);
      g.fillStyle = c; g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y + r * 1.6); g.arc(x, y, r, Math.PI * 0.8, Math.PI * 2.2); g.closePath(); g.fill(); g.stroke(); });
    /* the storm: where it is now, and where it has been */
    const s = stt.storm;
    if (s) { const trail = (s.trail || []).filter(p => p.layer === li);
      if (trail.length > 1) { g.strokeStyle = 'rgba(40,60,110,0.7)'; g.lineWidth = 1.5; g.setLineDash([3, 4]); g.beginPath(); trail.forEach((p, k) => k ? g.lineTo((p.x + 0.5) * sc, (p.y + 0.5) * sc) : g.moveTo((p.x + 0.5) * sc, (p.y + 0.5) * sc)); g.stroke(); g.setLineDash([]);
        g.fillStyle = 'rgba(40,60,110,0.85)'; g.font = '10px Georgia'; trail.slice(0, -1).forEach(p => { g.beginPath(); g.arc((p.x + 0.5) * sc, (p.y + 0.5) * sc, 2, 0, Math.PI * 2); g.fill(); g.fillText(String(p.day), (p.x + 0.5) * sc, (p.y + 0.5) * sc - 5); }); }
      if (s.layer === li) { const x = (s.x + 0.5) * sc, y = (s.y + 0.5) * sc;
        g.fillStyle = 'rgba(40,60,110,0.12)'; g.beginPath(); g.arc(x, y, s.r * sc, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(40,60,110,0.85)'; g.lineWidth = 1.6; g.setLineDash([4, 3]); g.beginPath(); g.arc(x, y, s.r * sc, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        g.lineWidth = 2; spiral(g, x, y, Math.max(10, s.r * sc * 0.6), t);
        g.fillStyle = '#2a3a6a'; g.font = 'italic bold 13px Georgia'; g.textAlign = 'center'; g.fillText('the Sunear’Zikhron', x, y + s.r * sc + 14); } }
    /* what the pointer is over */
    let hov = null;
    if (hm.mouse) { const mx = (hm.mouse.x - lay.x) / sc, my = (hm.mouse.y - lay.y) / sc; if (mx >= 0 && my >= 0 && mx < L.w && my < L.h) { hov = { x: Math.floor(mx), y: Math.floor(my) };
        g.strokeStyle = 'rgba(138,26,16,0.9)'; g.lineWidth = 1.5; g.strokeRect(hov.x * sc - sc, hov.y * sc - sc, sc * 3, sc * 3); } }
    g.restore();
    hands(g, lay, col, false, t);
    /* words */
    g.textAlign = 'center'; g.fillStyle = '#e8d6a8'; g.font = '13px Georgia';
    let line = 'Click to look there · 1–4 or the tabs for each world · M or Esc to put the map away';
    if (hov) { const r = RL() && RL().regionAt(stt, li, hov.x, hov.y); if (r) { const h = r.owner === pi ? 'yours' : (P.memReg && P.memReg[r.id] >= 0 ? stt.players[P.memReg[r.id]].name + '’s, when last seen' : 'held by nobody you know of');
        line = r.name + ' — ' + h + (E[hov.y * L.w + hov.x] ? '' : ' · not yet seen'); } }
    g.fillText(line, W / 2, lay.y + lay.h + 26);
    g.font = '12px Georgia'; g.fillStyle = '#b8a477';
    g.fillText('Solid line in your colour: your land · dashed lines: rivals’ land you know of · dotted: your caravans’ roads (! = bandits) · spiral: the storm, with the days it was there', W / 2, lay.y + lay.h + 46);
    if (stt.storm && stt.storm.layer !== li) { g.fillStyle = '#c9d4ff'; g.font = 'italic 13px Georgia'; g.fillText('The Sunear’Zikhron is on ' + D.LAYERS[stt.storm.layer].name + '.', W / 2, lay.y - 44); }
    hm.lay = lay;
  }
  function spiral(g, x, y, r, t) { g.beginPath(); for (let k = 0; k <= 40; k++) { const u = k / 40, a = u * Math.PI * 4 - t * 0.8, rr = r * u; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
  /* two gloved hands holding the paper at its sides: the hands and sleeves beyond the edges, the thumbs over the front */
  function hands(g, lay, col, behind, t) {
    const sway = Math.sin(t * 0.8) * 2, my = lay.y + lay.h * 0.58 + sway, H = window.innerHeight;
    const lw = '#6b4a2c', ld = '#33200f', lh = '#9a7448', line = 'rgba(20,10,4,0.75)';
    [[lay.x, 1], [lay.x + lay.w, -1]].forEach(([ex, f]) => {
      g.save(); g.translate(ex, my); g.scale(f, 1); g.lineJoin = 'round'; g.lineCap = 'round';
      if (behind) {
        /* the sleeve, from the wrist down out of sight */
        const down = H - my + 40;
        g.fillStyle = A.lin(g, -260, 0, -20, 0, [[0, A.shade(col, -60)], [0.6, A.shade(col, -25)], [1, A.shade(col, -5)]]);
        g.beginPath(); g.moveTo(-14, 52); g.bezierCurveTo(-24, 150, -70, down * 0.6, -120, down); g.lineTo(-330, down); g.bezierCurveTo(-250, down * 0.55, -150, 150, -100, 60); g.closePath(); g.fill();
        g.strokeStyle = line; g.lineWidth = 2; g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; [0.35, 0.6].forEach(k => { g.beginPath(); g.moveTo(-60 - k * 40, 90 + k * 60); g.quadraticCurveTo(-90 - k * 60, 140 + k * 120, -140 - k * 70, down * (0.7 + k * 0.2)); g.stroke(); });
        /* the cuff */
        g.fillStyle = A.lin(g, -100, 40, -10, 70, [[0, '#7a5a20'], [0.5, '#d9b87a'], [1, '#6a4a18']]);
        g.beginPath(); g.moveTo(-104, 46); g.quadraticCurveTo(-60, 30, -10, 40); g.lineTo(-14, 64); g.quadraticCurveTo(-60, 56, -102, 72); g.closePath(); g.fill(); g.strokeStyle = line; g.lineWidth = 1.8; g.stroke();
        /* the hand beyond the paper's edge (the fingers are behind the paper) */
        g.fillStyle = A.radial(g, -34, -6, 76, lh, ld);
        g.beginPath(); g.moveTo(6, -44); g.bezierCurveTo(-18, -62, -62, -50, -72, -14); g.bezierCurveTo(-82, 18, -66, 44, -38, 48); g.lineTo(-8, 44); g.bezierCurveTo(2, 30, 6, 0, 6, -44); g.closePath(); g.fill();
        g.strokeStyle = line; g.lineWidth = 2; g.stroke();
        g.strokeStyle = 'rgba(255,225,180,0.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-58, -30); g.quadraticCurveTo(-42, -48, -18, -48); g.stroke();
        g.strokeStyle = 'rgba(20,10,4,0.4)'; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(-64, 0); g.quadraticCurveTo(-46, 30, -14, 34); g.stroke(); g.setLineDash([]);
      } else {
        /* the thumb lies flat over the front of the paper, pointing in and a little up */
        g.save(); g.translate(-4, -8); g.rotate(-0.42);
        g.fillStyle = 'rgba(30,18,6,0.3)'; g.beginPath(); g.ellipse(24, 7, 26, 9, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = A.lin(g, 0, -14, 0, 14, [[0.1, lh], [0.5, lw], [1, ld]]);
        g.beginPath(); g.moveTo(-10, -11); g.bezierCurveTo(6, -16, 20, -14, 30, -10); g.bezierCurveTo(43, -5, 43, 8, 30, 9); g.bezierCurveTo(18, 10, 6, 14, -10, 14); g.closePath(); g.fill();
        g.strokeStyle = line; g.lineWidth = 2; g.stroke();
        /* the glove's seam at the tip, a crease at the joint, a gleam on the leather */
        g.strokeStyle = 'rgba(20,10,4,0.45)'; g.lineWidth = 1; g.setLineDash([2, 2]); g.beginPath(); g.moveTo(30, -8); g.bezierCurveTo(40, -6, 40, 6, 30, 8); g.stroke(); g.setLineDash([]);
        g.strokeStyle = 'rgba(20,10,4,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(12, -9); g.quadraticCurveTo(15, 0, 12, 10); g.stroke();
        g.strokeStyle = 'rgba(255,225,180,0.28)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -7); g.lineTo(28, -6); g.stroke();
        g.restore();
      }
      g.restore();
    });
  }
  function mapClick(mx, my) {
    const stt = st(); if (!stt || !hm.lay) return;
    const tab = (hm.tabs || []).find(b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h); if (tab) { hm.layer = tab.li; return; }
    const lay = hm.lay, L = stt.layers[hm.layer], x = Math.floor((mx - lay.x) / lay.sc), y = Math.floor((my - lay.y) / lay.sc);
    if (x < 0 || y < 0 || x >= L.w || y >= L.h) { SK.closeMap(); return; }
    SK.closeMap(); if (V.worlds) V.worlds = false; V.centerOn(hm.layer, x, y); if (SU.ui) SU.ui.refresh();
  }

  /* ======================= the worlds view ======================= */
  let worldTex = {};
  const MINI = { water: '#2a5f86', grass: '#5d8a3a', dirt: '#8a6a44', rough: '#7c7766', sand: '#d1b77a', snow: '#e3ebf2', swamp: '#4f5e3a', ash: '#5a4740', dusk: '#4a3f66', moon: '#b9b6c8', void: '#05050a' };
  /* a world as a ball: the land where you have been, the drawing where you have not */
  function worldTexture(stt, li, pi) {
    const L = stt.layers[li], key = li + ':' + stt.day + ':' + pi; if (worldTex[li] && worldTex[li].key === key) return worldTex[li].c;
    const n = 160, c = A.canvas(n, n), g = c.getContext('2d'), E = stt.players[pi].explored[li], sx = L.w / n, sy = L.h / n;
    const img = g.createImageData(n, n);
    const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const tx = Math.floor(x * sx), ty = Math.floor(y * sy), i = ty * L.w + tx, t = S.TCODES[L.t[i]];
      let rgb = E[i] ? hex(MINI[t] || '#000000') : t === 'water' ? [150, 160, 150] : [214, 198, 156];
      if (E[i] && L.ob[i] === S.OB.mountain) rgb = [106, 101, 90]; else if (E[i] && L.ob[i]) rgb = rgb.map(v => v * 0.8);
      const o = (y * n + x) * 4; img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2]; img.data[o + 3] = 255; }
    g.putImageData(img, 0, 0);
    worldTex[li] = { key, c }; return c;
  }
  function worldPlaces(stt, W, H, t) {
    const m = Math.min(W, H), cx = W / 2, cy = H * 0.5, day = stt.day;
    const out = [];
    const r0 = m * 0.15;
    out.push({ li: 0, x: cx, y: cy, r: r0 });
    const ph1 = S.phase(day, 'xikia') * Math.PI * 2 + t * 0.01, ph2 = S.phase(day, 'leotik') * Math.PI * 2 + t * 0.006;
    out.push({ li: 1, x: cx + Math.cos(ph1) * m * 0.33, y: cy + Math.sin(ph1) * m * 0.33 * 0.5, r: r0 * 0.78, orbit: m * 0.33 });
    out.push({ li: 2, x: cx + Math.cos(ph2) * m * 0.5, y: cy + Math.sin(ph2) * m * 0.5 * 0.5, r: r0 * 0.62, orbit: m * 0.5 });
    (stt.moons || []).forEach((mo, k) => { const host = out[mo.tatu % 3]; const a = (day / 10 + k * 1.7) * Math.PI * 2 / 3 + t * 0.03; out.push({ moon: mo, li: 3, x: host.x + Math.cos(a) * host.r * 1.7, y: host.y + Math.sin(a) * host.r * 1.7 * 0.5, r: Math.max(7, r0 * 0.16), host }); });
    return out;
  }
  SK.drawWorlds = function (ctx, W, H, t) {
    const stt = st(), pi = viewer(), P = stt.players[pi];
    ctx.fillStyle = A.radial(ctx, W / 2, H / 2, Math.max(W, H) * 0.7, '#14102a', '#020106'); ctx.fillRect(0, 0, W, H);
    if (!SK._stars) { const R = SU.makeRng(11); SK._stars = []; for (let i = 0; i < 300; i++) SK._stars.push([R.next(), R.next(), R.range(0.3, 1.5), R.next() * 6]); }
    SK._stars.forEach(([x, y, r, p]) => { ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + Math.sin(t + p) * 0.3) + ')'; ctx.beginPath(); ctx.arc(x * W, y * H, r, 0, Math.PI * 2); ctx.fill(); });
    const pl = worldPlaces(stt, W, H, t);
    /* orbits */
    ctx.strokeStyle = 'rgba(180,170,230,0.18)'; ctx.lineWidth = 1; pl.filter(p => p.orbit).forEach(p => { ctx.beginPath(); ctx.ellipse(W / 2, H * 0.5, p.orbit, p.orbit * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); });
    /* where on a world's ball a place on its land sits */
    const onBall = (p, li, x, y) => { const L = stt.layers[li]; if (p.moon) return [p.x, p.y]; return [p.x + ((x / L.w) - 0.5) * p.r * 1.6, p.y + ((y / L.h) - 0.5) * p.r * 1.6]; };
    const placeFor = (li, x, y) => { if (li < 3) return pl[li]; return pl.find(p => p.moon && Math.hypot(p.moon.x - x, p.moon.y - y) <= p.moon.r + 3) || null; };
    /* the Urverk: threads through the Duat */
    const done = new Set(); SK._threads = [];
    Object.values(stt.objects).forEach(o => { if (o.type !== 'urverk' || !o.link || done.has(o.id)) return; const d = stt.objects[o.link]; if (!d) return; done.add(o.id); done.add(d.id);
      if (o.layer === d.layer) return;
      const pa = placeFor(o.layer, o.x, o.y), pb = placeFor(d.layer, d.x, d.y); if (!pa || !pb) return;
      const [ax, ay] = onBall(pa, o.layer, o.x, o.y), [bx, by] = onBall(pb, d.layer, d.x, d.y);
      const open = SU.rules.urverkOpen(stt, o) && o.triggerKnown, known = (P.knownUrverk || []).includes(o.id) || P.explored[o.layer][o.y * stt.layers[o.layer].w + o.x];
      const mx = (ax + bx) / 2, my = Math.min(ay, by) - Math.hypot(ax - bx, ay - by) * 0.25;
      ctx.save(); ctx.lineWidth = open ? 2.4 : 1.2; ctx.strokeStyle = open ? 'rgba(200,180,255,0.9)' : 'rgba(150,140,200,0.28)'; if (open) { ctx.shadowColor = '#a890ff'; ctx.shadowBlur = 10; ctx.setLineDash([10, 6]); ctx.lineDashOffset = -t * 30; } else ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke(); ctx.restore();
      SK._threads.push({ ax, ay, bx, by, mx, my, o, d, open, known }); });
    /* the worlds, back to front */
    pl.slice().sort((a, b) => a.y - b.y).forEach(p => {
      ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.clip();
      if (p.moon) { ctx.fillStyle = A.radial(ctx, p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 1.4, '#e8e6f0', '#5a5870'); ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
      else { ctx.drawImage(worldTexture(stt, p.li, pi), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        /* the storm, if it is here */
        const s = stt.storm; if (s && s.layer === p.li) { const L = stt.layers[p.li], sx = p.x + (s.x / L.w - 0.5) * p.r * 2, sy = p.y + (s.y / L.h - 0.5) * p.r * 2, sr = s.r / L.w * p.r * 2;
          ctx.fillStyle = 'rgba(40,50,90,0.55)'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(210,225,255,0.8)'; ctx.lineWidth = 1.5; spiral(ctx, sx, sy, sr * 0.9, t * 2); }
        /* your towns and armies */
        const L = stt.layers[p.li];
        Object.values(stt.objects).forEach(o => { if (o.layer !== p.li || o.type !== 'town' || o.owner < 0 || o.gone) return; if (o.owner !== pi && !P.explored[p.li][o.y * L.w + o.x]) return; ctx.fillStyle = stt.players[o.owner].color; ctx.fillRect(p.x + (o.x / L.w - 0.5) * p.r * 2 - 3, p.y + (o.y / L.h - 0.5) * p.r * 2 - 3, 6, 6); });
        Object.values(stt.armies).forEach(a => { if (a.dead || a.layer !== p.li || a.owner !== pi || a.caravan) return; ctx.fillStyle = '#fff4c8'; ctx.beginPath(); ctx.arc(p.x + (a.x / L.w - 0.5) * p.r * 2, p.y + (a.y / L.h - 0.5) * p.r * 2, 2.5, 0, Math.PI * 2); ctx.fill(); }); }
      /* light from the side: a ball, not a disc */
      const sh = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.4, p.r * 0.1, p.x, p.y, p.r * 1.05); sh.addColorStop(0, 'rgba(255,250,230,0.25)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,10,0.65)');
      ctx.fillStyle = sh; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); ctx.restore();
      ctx.strokeStyle = SK._hoverWorld === p ? 'rgba(255,230,150,0.95)' : 'rgba(200,190,255,0.35)'; ctx.lineWidth = SK._hoverWorld === p ? 2.5 : 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
      if (!p.moon) { const mine = RL() ? RL().regionsOf(stt, pi).filter(r => r.li === p.li).length : 0, towns = S.townsOf(stt, pi).filter(o => o.layer === p.li).length;
        ctx.textAlign = 'center'; ctx.fillStyle = '#ffe3a3'; ctx.font = '16px Georgia'; ctx.fillText(D.LAYERS[p.li].name, p.x, p.y + p.r + 20);
        ctx.fillStyle = '#b8a8ff'; ctx.font = '12px Georgia'; ctx.fillText((mine ? mine + (mine === 1 ? ' territory' : ' territories') : 'no land of yours') + (towns ? ' · ' + towns + (towns === 1 ? ' town' : ' towns') : ''), p.x, p.y + p.r + 36); }
      else if (p.r > 9) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,215,240,0.7)'; ctx.font = '10px Georgia'; ctx.fillText(p.moon.name, p.x, p.y + p.r + 11); }
    });
    ctx.textAlign = 'center'; ctx.fillStyle = '#d8ccff'; ctx.font = 'italic 14px Georgia';
    ctx.fillText('The Mbaru Tatu · click a world to go down to it · bright threads are Urverk open today, dim ones are closed', W / 2, 26);
    SK._worldPl = pl;
  };
  SK.worldsHit = function (mx, my) { const pl = SK._worldPl || []; return pl.slice().reverse().find(p => Math.hypot(p.x - mx, p.y - my) <= p.r) || null; };
  SK.worldsHover = function (mx, my) {
    const stt = st(); if (!stt) return null; const p = SK.worldsHit(mx, my); SK._hoverWorld = p;
    if (p) { if (p.moon) return p.moon.name + ', a moon of ' + D.LAYERS[p.moon.tatu].name + '. Reached only through its own Kalo Urverk.'; return D.LAYERS[p.li].name + ' — ' + D.LAYERS[p.li].sub + '. Click to go down to it.'; }
    const th = (SK._threads || []).find(q => { for (let k = 0; k <= 20; k++) { const u = k / 20, x = (1 - u) * (1 - u) * q.ax + 2 * (1 - u) * u * q.mx + u * u * q.bx, y = (1 - u) * (1 - u) * q.ay + 2 * (1 - u) * u * q.my + u * u * q.by; if (Math.hypot(x - mx, y - my) < 7) return true; } return false; });
    if (th) { const n = SU.rules.urverkNext(stt, th.o); return 'An Urverk between ' + D.LAYERS[th.o.layer].name + ' and ' + D.LAYERS[th.d.layer].name + ': ' + (!th.o.triggerKnown ? 'its trigger is lost.' : th.open ? 'open' + (th.o.window ? ' for ' + SU.plural(SU.rules.urverkOpenFor(stt, th.o), 'more day') : '') + '.' : 'closed; it opens in ' + SU.plural(n, 'day') + '.'); }
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
