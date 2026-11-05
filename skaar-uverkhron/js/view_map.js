/* ============================================================
   SKAAR UVERKHRON — js/view_map.js
   The adventure map on screen: ground painted as an old map (watercolour on parchment, inked coasts)
   and baked in chunks, roads, trees and mountains,
   objects and armies in depth order, the storm, soft fog of war,
   the path preview, panning and zooming.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, A = SU.art, RU = SU.rules;
  const V = SU.mapView = {};
  const CH = 12;                 // tiles per baked chunk
  const ZOOMS = [28, 36, 44, 54];

  V.init = function (canvas, mini) {
    V.cv = canvas; V.ctx = canvas.getContext('2d');
    V.mini = mini; V.mctx = mini ? mini.getContext('2d') : null;
    V.zoomI = 2; V.ts = ZOOMS[V.zoomI]; V._lastTs = V.ts;
    V.cam = { x: 10, y: 10 }; V.layer = 0;
    V.chunks = {}; V.fields = {}; V.fog = null; V.fogKey = '';
    V.path = null; V.hover = null; V.anim = null; V.t0 = performance.now();
    V.resize();
    window.addEventListener('resize', V.resize);
    if (window.ResizeObserver) new ResizeObserver(() => V.resize()).observe(canvas);
    bindInput();
    requestAnimationFrame(frame);
  };
  V.resize = function () {
    const r = V.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    V.dpr = dpr; V.cv.width = Math.max(1, Math.round(r.width * dpr)); V.cv.height = Math.max(1, Math.round(r.height * dpr));
    V.w = r.width; V.h = r.height;
  };
  V.setGame = function (st) { V.st = st; V.chunks = {}; V.fields = {}; V.fog = null; V.miniCache = null; V.worlds = false; if (SU.sketch) SU.sketch.reset(); };
  SU.on('washout', () => { V.chunks = {}; V.fields = {}; V.miniCache = null; });
  V.viewer = () => V.st ? (SU.ui && SU.ui.viewer != null ? SU.ui.viewer : V.st.current) : 0;
  V.setLayer = function (li) { if (V.layer === li) return; V.layer = li; V.fog = null; V.miniCache = null; V.path = null; SU.emit('layer', li); };
  /* zoomed all the way out: the worlds themselves, turning */
  V.showWorlds = function (on) { V.worlds = on; V.path = null; SU.emit('worlds', on); };
  /* go down from the worlds view to one world (or moon) */
  V.enterWorld = function (p) {
    V.showWorlds(false); V.setLayer(p.li); V.zoomI = 0; V.ts = ZOOMS[0]; pruneChunks();
    if (p.moon) { V.cam.x = p.moon.x + 0.5; V.cam.y = p.moon.y + 0.5; }
    else { const st = V.st, me = V.viewer(); const t = S.townsOf(st, me).find(o => o.layer === p.li) || Object.values(st.armies).find(a => !a.dead && a.owner === me && a.layer === p.li); const L = st.layers[p.li];
      if (t) { V.cam.x = t.x + 0.5; V.cam.y = t.y + 0.5; } else { V.cam.x = L.w / 2; V.cam.y = L.h / 2; } }
    SU.emit('layer', p.li); if (SU.ui) SU.ui.refresh();
  };
  V.centerOn = function (layer, x, y, instant) { V.setLayer(layer); V.cam.x = x + 0.5; V.cam.y = y + 0.5; };
  V.zoom = function (d, px, py) {
    if (V.worlds) { if (d > 0) V.showWorlds(false); return; }
    if (d < 0 && V.zoomI === 0 && !V.paintMode && SU.sketch) { V.showWorlds(true); return; }
    const ni = SU.clamp(V.zoomI + d, 0, ZOOMS.length - 1); if (ni === V.zoomI) return;
    const before = V.screenToTile(px != null ? px : V.w / 2, py != null ? py : V.h / 2, true);
    V.zoomI = ni; V.ts = ZOOMS[ni]; pruneChunks();
    const after = V.screenToTile(px != null ? px : V.w / 2, py != null ? py : V.h / 2, true);
    V.cam.x += before.fx - after.fx; V.cam.y += before.fy - after.fy;
  };
  V.screenToTile = function (sx, sy, frac) {
    const fx = V.cam.x + (sx - V.w / 2) / V.ts, fy = V.cam.y + (sy - V.h / 2) / V.ts;
    return frac ? { fx, fy } : { x: Math.floor(fx), y: Math.floor(fy) };
  };
  V.tileToScreen = (x, y) => ({ x: (x - V.cam.x) * V.ts + V.w / 2, y: (y - V.cam.y) * V.ts + V.h / 2 });

  /* ======================= baked ground =======================
     The land is painted as one continuous relief, not as tiles: every terrain is a
     smooth field that wins where it is strongest (so borders run in soft organic
     lines), a height field lit from the north-west gives hills, ranges and valleys,
     water darkens with depth and lightens into shallows and a line of surf, and a
     fine brush grain sits over everything. */
  const SPT = 14;                // paint samples per tile (independent of zoom)
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  /* each land: a low, mid and high tone mixed by broad noise, then a speckle tone */
  /* faded watercolour washes, as on an old painted map */
  const PAL = {
    grass: { a: '#8e9a58', b: '#a6ab68', c: '#c0bc80', h: 0.10, rough: 0.05 },
    dirt:  { a: '#b08c5a', b: '#c09e6a', c: '#cfb17e', h: 0.14, rough: 0.06 },
    rough: { a: '#968b70', b: '#a89c80', c: '#bbae91', h: 0.34, rough: 0.16 },
    sand:  { a: '#d2bb88', b: '#ddc898', c: '#e7d6aa', h: 0.03, rough: 0.04 },
    snow:  { a: '#d8d2c0', b: '#e6e0ce', c: '#f1ecdc', h: 0.46, rough: 0.12 },
    swamp: { a: '#6c7150', b: '#7b805a', c: '#8b8c64', h: 0.00, rough: 0.02 },
    ash:   { a: '#6b5a4e', b: '#7c6a5c', c: '#8e7b6a', h: 0.20, rough: 0.10 },
    dusk:  { a: '#55476a', b: '#65577e', c: '#7c6c96', h: 0.12, rough: 0.05 },
    moon:  { a: '#b2ab9b', b: '#c2bba9', c: '#d1cab8', h: 0.18, rough: 0.12 },
    void:  { a: '#040409', b: '#07070f', c: '#0c0c18', h: -0.6, rough: 0 },
    water: { a: '#4f7680', b: '#6a8e8f', c: '#9db5a6', h: -0.3, rough: 0 },
  };
  const PALRGB = {}; Object.keys(PAL).forEach(k => PALRGB[k] = { a: hex(PAL[k].a), b: hex(PAL[k].b), c: hex(PAL[k].c) });
  const WOODCOL = { tree: hex('#4f5a33'), glowtree: hex('#43625a'), pine: hex('#3f4c3a'), palm: hex('#66703f'), deadtree: hex('#5e5244'), reeds: hex('#6b6c44') };
  const MROCK = hex('#8f7a5c'), MSNOW = hex('#ece3cc'), MR0 = hex('#4a3a28'), MR1 = hex('#8c7656'), MR2 = hex('#d6c49c');
  const ROCK = hex('#9a8c72'), FOREST = hex('#5c6640'), REED = hex('#7b7c50'), SURF = hex('#c9c3a4'), WET = hex('#6c776a'), INK = hex('#4a3826'), PAPER = hex('#e8d9b4');
  const TOFF = {}; Object.keys(PAL).forEach((k, i) => TOFF[k] = i * 37.31 + 11.7);
  const sstep = (a, b, x) => { const t = SU.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  /* the paper: fine fibres and speckle, tileable, laid over the paint */
  let grain = null;
  function grainTex() {
    if (grain) return grain;
    const N = 256, c = A.canvas(N, N), g = c.getContext('2d'), R = SU.makeRng(4242);
    g.fillStyle = '#808080'; g.fillRect(0, 0, N, N);
    const wrap = fn => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) fn(ox, oy); };
    for (let i = 0; i < 900; i++) {          /* fibres */
      const x = R.range(0, N), y = R.range(0, N), l = R.range(4, 14), a = R.range(0, Math.PI * 2), bend = R.range(-3, 3);
      g.strokeStyle = R.chance(0.55) ? 'rgba(255,250,235,0.13)' : 'rgba(60,40,20,0.11)'; g.lineWidth = R.range(0.5, 1.2); g.lineCap = 'round';
      wrap((ox, oy) => { g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + Math.cos(a) * l / 2 + bend, y + oy + Math.sin(a) * l / 2 - bend, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); });
    }
    for (let i = 0; i < 2600; i++) {         /* speckle */
      const x = R.range(0, N), y = R.range(0, N), r = R.range(0.3, 1.1);
      g.fillStyle = R.chance(0.6) ? 'rgba(70,48,24,' + R.range(0.08, 0.22).toFixed(2) + ')' : 'rgba(255,248,230,0.18)';
      wrap((ox, oy) => { g.beginPath(); g.arc(x + ox, y + oy, r, 0, Math.PI * 2); g.fill(); });
    }
    return (grain = c);
  }
  function noises(li) {
    if (!V._nz || V._nzKey !== V.st.seed + ':' + li) {
      const s = (V.st.seed | 0) + li * 101;
      V._nz = { warp: SU.noise2(s + 1), warp2: SU.noise2(s + 2), tone: SU.noise2(s + 3), tone2: SU.noise2(s + 4), hill: SU.noise2(s + 5), edge: SU.noise2(s + 6) };
      V._nzKey = V.st.seed + ':' + li;
    }
    return V._nz;
  }
  /* the painted field for one chunk, as a small image (SPT samples per tile, two samples of margin) */
  function paintField(li, cx, cy) {
    const st = V.st, L = st.layers[li], NZ = noises(li);
    const M = 4, TW = CH + M * 2;                     // tiles held around the chunk
    const bx = cx * CH - M, by = cy * CH - M;
    const tid = new Array(TW * TW), th = new Float32Array(TW * TW), land = new Float32Array(TW * TW);
    const mtn = new Float32Array(TW * TW), wood = new Float32Array(TW * TW), reed = new Float32Array(TW * TW);
    const mtnM = new Float32Array(TW * TW), woodM = new Float32Array(TW * TW), wcol = new Float32Array(TW * TW * 3);
    const clampIn = (x, y) => [SU.clamp(x, 0, L.w - 1), SU.clamp(y, 0, L.h - 1)];
    for (let j = 0; j < TW; j++) for (let i = 0; i < TW; i++) {
      const [x, y] = clampIn(bx + i, by + j), k = y * L.w + x, t = S.TCODES[L.t[k]], ob = L.ob[k], o = j * TW + i;
      tid[o] = t; land[o] = t === 'water' || t === 'void' ? 0 : 1;
      th[o] = (PAL[t] || PAL.grass).h;
      if (ob === S.OB.mountain) { mtn[o] = 1; th[o] += 0.9; } else if (ob === S.OB.ridge) { mtn[o] = 0.8; th[o] += 0.5; } else if (ob === S.OB.rock || ob === S.OB.crystal) { mtn[o] = 0.35; th[o] += 0.12; }
      if (ob === S.OB.tree || ob === S.OB.pine || ob === S.OB.glowtree || ob === S.OB.palm || ob === S.OB.deadtree) { wood[o] = ob === S.OB.deadtree || ob === S.OB.palm ? 0.4 : 1; th[o] += 0.04; }
      if (ob === S.OB.reeds) reed[o] = 1;
      /* the solid masses: ranges and woods (what cannot be walked through) */
      if (ob === S.OB.mountain || ob === S.OB.ridge) { mtnM[o] = 1; th[o] -= ob === S.OB.mountain ? 0.6 : 0.3; }
      const wc = WOODCOL[S.OB_NAMES[ob]]; if (wc) { woodM[o] = 1; wcol[o * 3] = wc[0]; wcol[o * 3 + 1] = wc[1]; wcol[o * 3 + 2] = wc[2]; }
    }
    /* how deep into a range each tile is (the spine of a wide range is far from its edge) */
    const mdist = new Float32Array(TW * TW), mq = [];
    for (let o = 0; o < TW * TW; o++) { mdist[o] = mtnM[o] ? 99 : 0; if (!mtnM[o]) mq.push(o); }
    for (let qi = 0; qi < mq.length; qi++) { const o = mq[qi], i = o % TW, j = (o / TW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const ii = i + dx, jj = j + dy; if ((!dx && !dy) || ii < 0 || jj < 0 || ii >= TW || jj >= TW) continue; const p = jj * TW + ii; if (mdist[p] > mdist[o] + 1) { mdist[p] = mdist[o] + 1; mq.push(p); } } }
    for (let o = 0; o < TW * TW; o++) if (mdist[o] > 50) mdist[o] = 4;
    /* the peaks: two or three on every mountain tile, set by the tile itself (so neighbouring chunks agree),
       taller and broader deep inside a range; the range's height is the highest cone at each point */
    const PK = new Array(TW * TW);
    for (let j = 0; j < TW; j++) for (let i = 0; i < TW; i++) { const o = j * TW + i; if (!mtnM[o]) continue;
      const x = bx + i, y = by + j, R = SU.makeRng(x * 73856093 ^ y * 19349663 ^ (li + 1) * 83492791), md = Math.min(mdist[o], 4), ridge = L.ob[SU.clamp(y, 0, L.h - 1) * L.w + SU.clamp(x, 0, L.w - 1)] === S.OB.ridge;
      const list = []; const n = 2 + (R.chance(0.5) ? 1 : 0);
      for (let k = 0; k < n; k++) list.push([x + R.range(0.15, 0.85), y + R.range(0.15, 0.85), (0.5 + 0.32 * (md - 1)) * R.range(0.75, 1.2) * (ridge ? 0.65 : 1), (0.8 + 0.2 * Math.min(md - 1, 2)) * R.range(0.85, 1.2)]);
      PK[o] = list; }
    /* water deepens away from the shore */
    const dist = new Float32Array(TW * TW).fill(9), q = [];
    for (let o = 0; o < TW * TW; o++) if (land[o]) { dist[o] = 0; q.push(o); }
    for (let qi = 0; qi < q.length; qi++) { const o = q[qi], i = o % TW, j = (o / TW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + dx, jj = j + dy; if (ii < 0 || jj < 0 || ii >= TW || jj >= TW) continue; const p = jj * TW + ii; if (dist[p] > dist[o] + 1) { dist[p] = dist[o] + 1; q.push(p); } } }
    for (let o = 0; o < TW * TW; o++) if (tid[o] === 'water') th[o] = -0.12 - Math.min(4, dist[o]) * 0.16;
    /* soften the heights a little so ranges swell out of the land */
    const sm = new Float32Array(TW * TW);
    for (let j = 0; j < TW; j++) for (let i = 0; i < TW; i++) { let s = 0, w = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const ii = SU.clamp(i + dx, 0, TW - 1), jj = SU.clamp(j + dy, 0, TW - 1), ww = dx || dy ? (dx && dy ? 0.5 : 1) : 3; s += th[jj * TW + ii] * ww; w += ww; }
      sm[j * TW + i] = s / w; }
    const tw = new Map();
    /* samples */
    const N = CH * SPT + 4, s0x = cx * CH - 2 / SPT, s0y = cy * CH - 2 / SPT;
    const H = new Float32Array(N * N), col = new Float32Array(N * N * 3), isW = new Float32Array(N * N), wet = new Float32Array(N * N), alpha = new Float32Array(N * N).fill(1), MA = new Float32Array(N * N), SN = new Float32Array(N * N), FA = new Float32Array(N * N), LD = new Float32Array(N * N), LB = new Float32Array(N * N), EG = new Float32Array(N * N);
    for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
      const fx = s0x + (sx + 0.5) / SPT, fy = s0y + (sy + 0.5) / SPT, o = sy * N + sx;
      /* everything is read through a round, warped kernel over the nearby tiles, so no shape follows the grid */
      const qx = fx + NZ.warp.fbm(fx * 0.45, fy * 0.45, 3) * 0.55, qy = fy + NZ.warp2.fbm(fx * 0.45, fy * 0.45, 3) * 0.55;
      const gx = qx - bx - 0.5, gy = qy - by - 0.5, i0 = Math.floor(gx), j0 = Math.floor(gy);
      let sLb = 0, sW = 0, sL = 0, sH = 0, sM = 0, sF = 0, sR = 0, sWl = 0; tw.clear();
      for (let dj = -1; dj <= 2; dj++) for (let di = -1; di <= 2; di++) {
        const ii = SU.clamp(i0 + di, 0, TW - 1), jj = SU.clamp(j0 + dj, 0, TW - 1), p = jj * TW + ii;
        const ddx = gx - (i0 + di), ddy = gy - (j0 + dj), d2 = ddx * ddx + ddy * ddy;
        const w = Math.exp(-d2 * 1.9), wl = Math.exp(-d2 * 3.2);       // broad for height and cover, tighter for the lands
        sW += w; sLb += land[p] * w; sH += sm[p] * w; sM += mtn[p] * w; sF += wood[p] * w; sR += reed[p] * w;
        sWl += wl; sL += land[p] * wl; tw.set(tid[p], (tw.get(tid[p]) || 0) + wl);
      }
      /* the masses read straight off the tiles (no warp), so their edges are where the blocked tiles are */
      let ma = 0, fa = 0, bm = 0, wr0 = 0, wg0 = 0, wb0 = 0;
      { const hx = fx - bx - 0.5, hy = fy - by - 0.5, h0i = Math.floor(hx), h0j = Math.floor(hy); let sT = 0, sMm = 0, sWd = 0, sB = 0, sBw = 0;
        for (let dj = -1; dj <= 2; dj++) for (let di = -1; di <= 2; di++) {
          const ii = SU.clamp(h0i + di, 0, TW - 1), jj = SU.clamp(h0j + dj, 0, TW - 1), p = jj * TW + ii, ddx = hx - (h0i + di), ddy = hy - (h0j + dj), d2 = ddx * ddx + ddy * ddy;
          const wl = Math.exp(-d2 * 1.7), wb = Math.exp(-d2 * 0.9);
          sT += wl; sMm += mtnM[p] * wl; sB += mdist[p] * wb; sBw += wb;
          if (woodM[p]) { sWd += wl; wr0 += wcol[p * 3] * wl; wg0 += wcol[p * 3 + 1] * wl; wb0 += wcol[p * 3 + 2] * wl; } }
        const wob = NZ.edge(fx * 0.9, fy * 0.9) * 0.07 + NZ.tone(fx * 3, fy * 3) * 0.02;
        ma = sstep(0.4, 0.5, sMm / sT + wob); fa = sstep(0.4, 0.5, sWd / sT + wob); bm = sB / sBw;
        /* true to the tiles: a blocked tile is always covered in its middle, an open tile always clear in its middle
           (so a narrow way through never looks closed, and a mass never looks open) */
        { const ti = SU.clamp(Math.floor(fx) - bx, 0, TW - 1), tj = SU.clamp(Math.floor(fy) - by, 0, TW - 1), tp = tj * TW + ti;
          const e = Math.min(fx - Math.floor(fx), 1 - (fx - Math.floor(fx)), fy - Math.floor(fy), 1 - (fy - Math.floor(fy))), core = sstep(0.08, 0.22, e);
          if (mtnM[tp]) ma = Math.max(ma, core); else ma = Math.min(ma, 1 - core);
          if (woodM[tp]) fa = Math.max(fa, core); else fa = Math.min(fa, 1 - core); }
        fa *= 1 - ma;
        if (sWd > 0) { wr0 /= sWd; wg0 /= sWd; wb0 /= sWd; } }
      MA[o] = ma; FA[o] = fa;
      const wn = NZ.edge.fbm(fx * 0.7, fy * 0.7, 3);
      const ld = sL / sWl + wn * 0.2;
      let t = null, t2 = null, w1 = -9, w2 = -9;
      tw.forEach((w, tt) => { if (tt === 'water' || tt === 'void') return; w = w / sWl + NZ.tone.fbm(fx * 0.8 + TOFF[tt], fy * 0.8 - TOFF[tt], 2) * 0.22;
        if (w > w1) { t2 = t; w2 = w1; t = tt; w1 = w; } else if (w > w2) { t2 = tt; w2 = w; } });
      const blendK = t2 ? 0.5 + 0.5 * sstep(0, 0.12, w1 - w2) : 1;
      LD[o] = ld; LB[o] = sLb / sW + wn * 0.04; EG[o] = t2 ? 1 - sstep(0, 0.07, w1 - w2) : 0;
      const isVoid = (tw.get('void') || 0) > (tw.get('water') || 0);
      if (!t) t = isVoid ? 'moon' : 'sand';
      const P = PALRGB[t] || PALRGB.grass, pr = PAL[t] || PAL.grass, PW = PALRGB.water;
      const h0 = sH / sW, la = sstep(0.47, 0.53, ld);           // how much of this point is land (soft, so coasts are smooth at any zoom)
      let r = 0, g = 0, b = 0, h = h0, wr = 0, wg = 0, wb = 0;
      if (la < 1 && !isVoid) {
        let r, g, b; const h = h0;
        const deep = SU.clamp((-h - 0.1) / 0.6, 0, 1), sh = sstep(0.5, 0.3, ld);
        const mix1 = SU.clamp(1 - deep + (1 - sh) * 0.6, 0, 1);
        const tn = NZ.tone.fbm(fx * 0.18, fy * 0.18, 3) * 0.12;
        r = PW.a[0] + (PW.b[0] - PW.a[0]) * mix1; g = PW.a[1] + (PW.b[1] - PW.a[1]) * mix1; b = PW.a[2] + (PW.b[2] - PW.a[2]) * mix1;
        const shal = sstep(0.36, 0.49, ld);                          // bright shallows by the shore
        r += (PW.c[0] - r) * shal * 0.85; g += (PW.c[1] - g) * shal * 0.85; b += (PW.c[2] - b) * shal * 0.85;
        r *= 1 + tn; g *= 1 + tn; b *= 1 + tn;
        const surf = Math.max(0, 1 - Math.abs(ld - 0.475) / 0.022) * 0.55 + Math.max(0, 1 - Math.abs(ld - 0.43) / 0.012) * 0.18 * (NZ.tone2(fx * 3, fy * 3) > 0 ? 1 : 0);
        r += (SURF[0] - r) * surf; g += (SURF[1] - g) * surf; b += (SURF[2] - b) * surf;
        wr = r; wg = g; wb = b;
      }
      if (la > 0) {
        const n1 = NZ.tone.fbm(fx * 0.16, fy * 0.16, 4), n2 = NZ.tone2.fbm(fx * 0.7, fy * 0.7, 3);
        const m1 = sstep(-0.35, 0.35, n1), m2 = sstep(0.05, 0.5, n2);
        r = P.a[0] + (P.b[0] - P.a[0]) * m1; g = P.a[1] + (P.b[1] - P.a[1]) * m1; b = P.a[2] + (P.b[2] - P.a[2]) * m1;
        r += (P.c[0] - r) * m2 * 0.6; g += (P.c[1] - g) * m2 * 0.6; b += (P.c[2] - b) * m2 * 0.6;
        if (blendK < 1) { const Q = PALRGB[t2] || PALRGB.grass, k2 = 1 - blendK; const qr = Q.a[0] + (Q.b[0] - Q.a[0]) * m1, qg = Q.a[1] + (Q.b[1] - Q.a[1]) * m1, qb = Q.a[2] + (Q.b[2] - Q.a[2]) * m1; r += (qr - r) * k2; g += (qg - g) * k2; b += (qb - b) * k2; }
        /* the ground under ranges goes to bare rock, under woods to dark leaf litter */
        const mk = sM / sW * 1.35;
        if (mk > 0.05 && t !== 'snow' && t !== 'moon') { const k = sstep(0.1, 0.75, mk) * 0.35; r += (ROCK[0] - r) * k; g += (ROCK[1] - g) * k; b += (ROCK[2] - b) * k; }   /* stony foothills */
        /* marsh pools, ember seams in the ash, the dusk's violet veins */
        if (t === 'swamp') { const p = sstep(0.12, 0.2, NZ.tone2.fbm(fx * 1.1, fy * 1.1, 3)); wet[o] = p; r += (WET[0] - r) * p; g += (WET[1] - g) * p; b += (WET[2] - b) * p; }
        if (t === 'ash') { const v = 1 - Math.abs(NZ.hill(fx * 0.9, fy * 0.9)) * 14; if (v > 0) { const k = v * 0.4; r += (190 - r) * k; g += (104 - g) * k * 0.8; b += (60 - b) * k * 0.4; } }
        if (t === 'dusk') { const v = 1 - Math.abs(NZ.hill(fx * 0.8 + 50, fy * 0.8)) * 16; if (v > 0) { const k = v * 0.3; r += (160 - r) * k; g += (140 - g) * k; b += (200 - b) * k; } }
        if (t === 'moon') { const v = NZ.tone2(fx * 1.6, fy * 1.6); if (v > 0.32) { r *= 0.82; g *= 0.82; b *= 0.86; } else if (v > 0.26) { r *= 1.12; g *= 1.12; b *= 1.1; } }
        /* woods: the canopy's dark floor (the crowns are drawn on top, sharp) */
        if (fa > 0) { r += (wr0 - r) * fa; g += (wg0 - g) * fa; b += (wb0 - b) * fa; }
        /* sea-washed sand at the very edge of the land */
        const beach = isVoid ? 0 : sstep(0.62, 0.5, ld) * (t === 'snow' ? 0.3 : 0.75);
        if (isVoid) { const rim = 0.62 + 0.38 * sstep(0.5, 0.66, ld); r *= rim; g *= rim; b *= rim * 1.04; }   /* a moon's edge falls away into the dark */
        if (beach > 0) { const B = PALRGB.sand.b; r += (B[0] - r) * beach; g += (B[1] - g) * beach; b += (B[2] - b) * beach; }
        h += NZ.hill.fbm(fx * 0.32, fy * 0.32, 4) * (0.03 + pr.rough * 0.7) + (t === 'sand' ? Math.sin(fx * 2.2 + NZ.warp(fx * 0.3, fy * 0.3) * 4) * 0.03 : 0);
        /* a range: one massif rising from its edge, with sharp ridges running through it and snow on the high crests */
        if (ma > 0) {
          const ci = Math.floor(fx) - bx, cj = Math.floor(fy) - by; let hc = 0;
          for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= TW || jj >= TW) continue; const list = PK[jj * TW + ii]; if (!list) continue;
            for (let q = 0; q < list.length; q++) { const P_ = list[q], v = 1 - Math.hypot(fx - P_[0], fy - P_[1]) / P_[3]; if (v > 0) { const c_ = P_[2] * v * v * (3 - 2 * v) * (0.55 + 0.45 * v); if (c_ > hc) hc = c_; } } }
          /* gullies and spurs carved down the slopes */
          const q1 = 1 - Math.abs(NZ.hill(fx * 1.6 + 200, fy * 1.6 - 40)), q2 = NZ.hill(fx * 4, fy * 4);
          hc *= 0.86 + 0.14 * q1 * q1; hc += q2 * 0.012;
          h = h * (1 - ma) + (0.05 + hc) * ma;
          let mr = MROCK[0], mg = MROCK[1], mb = MROCK[2];
          SN[o] = sstep(0.95, 1.25, hc) * 0.9 * ma;
          r += (mr - r) * ma; g += (mg - g) * ma; b += (mb - b) * ma;
        }
      }
      if (isVoid) { alpha[o] = la; }
      else { r = r * la + wr * (1 - la); g = g * la + wg * (1 - la); b = b * la + wb * (1 - la); h = h * la + Math.min(h0, -0.05) * (1 - la); isW[o] = 1 - la; }
      H[o] = h; col[o * 3] = r; col[o * 3 + 1] = g; col[o * 3 + 2] = b;
    }
    /* soft light from the north-west; then the old map's ink and paper over it */
    const c = A.canvas(N, N), g2 = c.getContext('2d'), img = g2.createImageData(N, N), d = img.data;
    const k = SPT * 1.6;
    const band = (x, at, w) => Math.max(0, 1 - Math.abs(x - at) / w);
    for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
      const o = sy * N + sx, xl = sx ? o - 1 : o, xr = sx < N - 1 ? o + 1 : o, yu = sy ? o - N : o, yd = sy < N - 1 ? o + N : o;
      const fx = s0x + (sx + 0.5) / SPT, fy = s0y + (sy + 0.5) / SPT;
      const dx = (H[xr] - H[xl]) * k, dy = (H[yd] - H[yu]) * k;
      let lit = SU.clamp(1 + (-dx - dy) * (0.42 - isW[o] * 0.32), 0.76, 1.22);
      lit *= 1 + (1 - isW[o]) * (SU.clamp(H[o], -0.1, 0.9) * 0.08 - 0.04);
      if (wet[o]) lit = lit * (1 - wet[o]) + wet[o];
      let r = col[o * 3] * lit, g = col[o * 3 + 1] * lit, b = col[o * 3 + 2] * lit;
      /* ranges: rock coloured by how it faces the light, dark umber to pale ochre, snow kept pale */
      if (MA[o] > 0) { const sl = SU.clamp(0.55 + (-dx - dy) * 0.11, 0, 1), m = MA[o], ao = 0.74 + 0.26 * sstep(0.08, 0.7, H[o]);
        const rr = sl < 0.5 ? MR0[0] + (MR1[0] - MR0[0]) * sl * 2 : MR1[0] + (MR2[0] - MR1[0]) * (sl - 0.5) * 2,
          rg = sl < 0.5 ? MR0[1] + (MR1[1] - MR0[1]) * sl * 2 : MR1[1] + (MR2[1] - MR1[1]) * (sl - 0.5) * 2,
          rb = sl < 0.5 ? MR0[2] + (MR1[2] - MR0[2]) * sl * 2 : MR1[2] + (MR2[2] - MR1[2]) * (sl - 0.5) * 2;
        const sn = SN[o], kr = rr + (Math.max(rr, MSNOW[0] * (0.7 + sl * 0.3)) - rr) * sn, kg = rg + (Math.max(rg, MSNOW[1] * (0.7 + sl * 0.3)) - rg) * sn, kb = rb + (Math.max(rb, MSNOW[2] * (0.72 + sl * 0.3)) - rb) * sn;
        r += (kr * ao - r) * m; g += (kg * ao - g) * m; b += (kb * ao - b) * m;
      }
      /* the wash pools darker where one colour meets the next */
      if (EG[o] > 0) { const e = 1 - EG[o] * 0.14; r *= e; g *= e; b *= e * 1.02; }
      /* faded: drawn towards the paper, and towards sepia */
      const lum = r * 0.3 + g * 0.59 + b * 0.11;
      r = r * 0.74 + (lum * 1.06) * 0.1 + PAPER[0] * 0.16; g = g * 0.74 + (lum * 0.98) * 0.1 + PAPER[1] * 0.16; b = b * 0.74 + (lum * 0.82) * 0.1 + PAPER[2] * 0.16;
      /* old stains and foxing in the paper */
      const stn = NZ.edge.fbm(fx * 0.09 + 31, fy * 0.09 - 7, 4), fox = NZ.tone2(fx * 1.3 + 77, fy * 1.3);
      const sk = sstep(0.18, 0.45, stn) * 0.1 + sstep(0.5, 0.56, fox) * 0.08;
      if (sk > 0) { r *= 1 - sk * 0.6; g *= 1 - sk * 0.75; b *= 1 - sk; }
      /* ink: a firm coastline and the old water-lines running out from it */
      if (alpha[o] > 0.99) {
        /* distance to the coast in samples, from the land field and its slope, so lines keep one width */
        const ld = LD[o], gl = Math.hypot(LD[xr] - LD[xl], LD[yd] - LD[yu]) / 2, ds = gl > 0.004 ? (ld - 0.5) / gl : (ld - 0.5) * 250;
        let ink = band(ds, 0, 0.95) * 0.9;
        if (ds < -1.6) { const lb = LB[o], gb = Math.hypot(LB[xr] - LB[xl], LB[yd] - LB[yu]) / 2;
          if (gb > 0.002) [[0.3, 0.5], [0.17, 0.38], [0.07, 0.26]].forEach(([lv, a]) => { ink = Math.max(ink, band((lb - lv) / gb, 0, 0.7) * a); }); }
        if (ink > 0) { r += (INK[0] - r) * ink; g += (INK[1] - g) * ink; b += (INK[2] - b) * ink; }
      } else if (alpha[o] > 0) { r = r * 0.8 + INK[0] * 0.2; g = g * 0.8 + INK[1] * 0.2; b = b * 0.8 + INK[2] * 0.2; }
      d[o * 4] = SU.clamp(r, 0, 255); d[o * 4 + 1] = SU.clamp(g, 0, 255); d[o * 4 + 2] = SU.clamp(b, 0, 255); d[o * 4 + 3] = alpha[o] * 255;
    }
    g2.putImageData(img, 0, 0);
    /* the masses as masks, for the crisp ink drawn over them at full size */
    const mask = (A_) => { const m = A.canvas(N, N), mg = m.getContext('2d'), mi = mg.createImageData(N, N), md = mi.data; let any = false;
      for (let o = 0; o < N * N; o++) { md[o * 4] = md[o * 4 + 1] = md[o * 4 + 2] = 255; md[o * 4 + 3] = A_[o] * 255; if (A_[o] > 0.01) any = true; }
      mg.putImageData(mi, 0, 0); return any ? m : null; };
    c.mtn = mask(MA); c.wood = mask(FA); c.H = H; c.N = N;
    return c;
  }
  /* a road tile's links to its neighbours */
  function roadLinks(L, x, y) {
    const on = (xx, yy) => S.inside(L, xx, yy) && L.road[yy * L.w + xx];
    const out = [];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { if (on(x + dx, y + dy)) out.push([dx, dy]); });
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([dx, dy]) => { if (on(x + dx, y + dy) && !on(x + dx, y) && !on(x, y + dy)) out.push([dx, dy]); });
    return out;
  }
  const MASS = { mountain: 1, ridge: 1, tree: 2, pine: 2, glowtree: 2, palm: 2, deadtree: 2, reeds: 2 };
  V.MASS = MASS;
  function drawMasses(g, f, li, cx, cy, ts, W, sp) {
    const L = V.st.layers[li];
    /* every layer here carries a margin of P px on each side (the paint reaches past the chunk), so outlines don't break at chunk edges */
    const P = Math.max(2, Math.floor(2 * sp) - 1), WP = W + 2 * P;
    const lay = () => { const m = A.canvas(WP, WP), mg = m.getContext('2d'); mg.translate(P, P); return [m, mg]; };
    const up = src => { const [m, mg] = lay(); mg.imageSmoothingEnabled = true; mg.imageSmoothingQuality = 'high'; mg.drawImage(src, -2 * sp, -2 * sp, src.width * sp, src.height * sp); return m; };
    const put = (dst, src, a) => { dst.globalAlpha = a == null ? 1 : a; dst.drawImage(src, -P, -P); dst.globalAlpha = 1; };
    const fillAs = (mg, col) => { mg.save(); mg.setTransform(1, 0, 0, 1, 0, 0); mg.globalCompositeOperation = 'source-in'; mg.fillStyle = col; mg.fillRect(0, 0, WP, WP); mg.restore(); };
    const shadowOf = (mask, dx, dy, col) => { const [m, mg] = lay(); mg.globalAlpha = 0.5; mg.drawImage(mask, dx * 0.5 - P, dy * 0.5 - P); mg.drawImage(mask, dx - P, dy - P); mg.globalAlpha = 1;
      fillAs(mg, col); mg.globalCompositeOperation = 'destination-out'; mg.drawImage(mask, -P, -P); return m; };
    const ring = (mask, r, col) => { const [e, eg] = lay(); eg.drawImage(mask, -P, -P); eg.globalCompositeOperation = 'destination-in';
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; eg.drawImage(mask, Math.cos(a) * r - P, Math.sin(a) * r - P); }
      const [m, mg] = lay(); mg.drawImage(mask, -P, -P); fillAs(mg, col); mg.globalCompositeOperation = 'destination-out'; mg.drawImage(e, -P, -P); return m; };
    const tilesOf = cls => { const out = []; for (let ty = -1; ty <= CH; ty++) for (let tx = -1; tx <= CH; tx++) { const x = cx * CH + tx, y = cy * CH + ty; if (!S.inside(L, x, y)) continue; const ob = S.OB_NAMES[L.ob[y * L.w + x]]; if (MASS[ob] === cls) out.push({ tx, ty, x, y, ob }); } return out; };
    const inkW = Math.max(1.3, ts * 0.045);
    /* ---- woods: a canopy of many small crowns, cut to the wood's edge ---- */
    if (f.wood) {
      const mask = up(f.wood), [cl, cg] = lay(), crowns = [];
      /* crowns scattered loosely (a few big, more small), and the wood's edge made of the outer crowns themselves */
      tilesOf(2).forEach(t => { const R = SU.makeRng(t.x * 92821 + t.y * 68917 + li * 7 + 3), n = 6 + R.int(0, 2);
        for (let i = 0; i < n; i++) { const big = i < 2; crowns.push({ ob: t.ob, x: t.tx * ts + R.range(0.14, 0.86) * ts, y: t.ty * ts + R.range(0.14, 0.86) * ts, r: ts * (big ? R.range(0.24, 0.3) : R.range(0.15, 0.21)), v: R.next() }); } });
      crowns.sort((a, b) => a.y - b.y);
      { const mg = mask.getContext('2d'); mg.fillStyle = '#fff'; crowns.forEach(c => { if (c.ob === 'reeds' || c.ob === 'deadtree') return; mg.beginPath(); mg.arc(c.x, c.y, c.r * 0.92, 0, Math.PI * 2); mg.fill(); }); }
      cg.lineCap = 'round'; cg.lineJoin = 'round';
      crowns.forEach(c => {
        const r = c.r, x = c.x, y = c.y;
        if (c.ob === 'pine') {
          cg.fillStyle = 'rgba(30,34,24,0.45)'; cg.beginPath(); cg.moveTo(x + r * 0.2, y - r * 1.1); cg.lineTo(x + r * 1.0, y + r * 0.75); cg.lineTo(x - r * 0.6, y + r * 0.75); cg.closePath(); cg.fill();
          cg.fillStyle = c.v < 0.5 ? '#55654a' : '#4c5c44'; cg.beginPath(); cg.moveTo(x, y - r * 1.2); cg.lineTo(x + r * 0.8, y + r * 0.6); cg.lineTo(x - r * 0.8, y + r * 0.6); cg.closePath(); cg.fill();
          cg.fillStyle = 'rgba(214,214,180,0.35)'; cg.beginPath(); cg.moveTo(x, y - r * 1.2); cg.lineTo(x - r * 0.8, y + r * 0.6); cg.lineTo(x - r * 0.15, y + r * 0.35); cg.closePath(); cg.fill();
          cg.strokeStyle = 'rgba(52,40,28,0.6)'; cg.lineWidth = Math.max(0.8, ts / 60); cg.beginPath(); cg.moveTo(x, y - r * 1.2); cg.lineTo(x + r * 0.8, y + r * 0.6); cg.lineTo(x - r * 0.8, y + r * 0.6); cg.stroke();
        } else if (c.ob === 'deadtree') {
          cg.strokeStyle = 'rgba(70,52,38,0.75)'; cg.lineWidth = Math.max(1, ts / 50);
          cg.beginPath(); cg.moveTo(x, y + r * 0.7); cg.lineTo(x, y - r * 0.6); cg.moveTo(x, y - r * 0.1); cg.lineTo(x - r * 0.6, y - r * 0.7); cg.moveTo(x, y - r * 0.3); cg.lineTo(x + r * 0.6, y - r * 0.9); cg.stroke();
        } else if (c.ob === 'reeds') {
          cg.strokeStyle = 'rgba(70,72,40,0.7)'; cg.lineWidth = Math.max(0.8, ts / 64);
          cg.beginPath(); for (let k = -2; k <= 2; k++) { cg.moveTo(x + k * r * 0.3, y + r * 0.6); cg.lineTo(x + k * r * 0.4, y - r * (0.5 + (k & 1) * 0.3)); } cg.stroke();
        } else {
          const glow = c.ob === 'glowtree', palm = c.ob === 'palm';
          const base = glow ? '#5c8a7c' : palm ? '#7f8a4c' : c.v < 0.33 ? '#6a7440' : c.v < 0.66 ? '#717a45' : '#646d3d';
          cg.fillStyle = 'rgba(28,30,16,0.5)'; cg.beginPath(); cg.arc(x + r * 0.22, y + r * 0.26, r, 0, Math.PI * 2); cg.fill();
          const gr = cg.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
          gr.addColorStop(0, glow ? '#a6d8c4' : A.shade(base, 30)); gr.addColorStop(0.55, base); gr.addColorStop(1, A.shade(base, -30));
          cg.fillStyle = gr; cg.beginPath(); cg.arc(x, y, r, 0, Math.PI * 2); cg.fill();
          /* a few leaf-ticks, so a crown is foliage and not a ball */
          cg.strokeStyle = 'rgba(40,40,20,0.35)'; cg.lineWidth = Math.max(0.7, ts / 80); cg.beginPath();
          for (let q = 0; q < 3; q++) { const a = (c.v * 7 + q * 2.1) % (Math.PI * 2), rr = r * (0.35 + q * 0.15); cg.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); cg.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.22, a + 0.6, a + 2.2); } cg.stroke();
          cg.strokeStyle = 'rgba(40,36,20,0.28)'; cg.lineWidth = Math.max(0.7, ts / 70); cg.beginPath(); cg.arc(x, y, r * 0.96, Math.PI * 0.1, Math.PI * 0.9); cg.stroke();
          if (glow) { cg.fillStyle = 'rgba(220,255,245,0.9)'; cg.beginPath(); cg.arc(x + r * 0.2, y - r * 0.1, Math.max(0.8, r * 0.12), 0, Math.PI * 2); cg.fill(); }
        }
      });
      cg.globalCompositeOperation = 'destination-in'; cg.drawImage(mask, -P, -P);
      put(g, shadowOf(mask, ts * 0.06, ts * 0.08, 'rgba(40,30,18,0.32)'));
      put(g, cl);
    }
    /* ranges need nothing drawn here: they are painted into the land as relief */
  }
  function bakeChunk(li, cx, cy) {
    const st = V.st, L = st.layers[li], ts = V.ts, W = CH * ts;
    const c = A.canvas(W, W), g = c.getContext('2d');
    const at = (x, y) => S.inside(L, x, y) ? S.TCODES[L.t[y * L.w + x]] : null;
    /* the paint, scaled up smoothly */
    const fk = li + ':' + cx + ':' + cy, f = V.fields[fk] || (V.fields[fk] = paintField(li, cx, cy)), sp = ts / SPT;   /* the paint does not change with zoom */
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(f, -2 * sp, -2 * sp, f.width * sp, f.height * sp);
    /* the paper's grain */
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.85;
    const gp = g.createPattern(grainTex(), 'repeat'); g.translate(-(cx * W) % 256, -(cy * W) % 256); g.fillStyle = gp; g.fillRect(0, 0, W + 256, W + 256); g.restore();
    /* keep the void open, so the stars show through */
    g.save(); g.globalCompositeOperation = 'destination-in'; g.drawImage(f, -2 * sp, -2 * sp, f.width * sp, f.height * sp); g.restore();
    /* a few small things on open ground: dabs of grass, stones, marsh rushes */
    const RR = SU.makeRng(cx * 7919 + cy * 104729 + li * 31);
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const x = cx * CH + tx, y = cy * CH + ty, tid = at(x, y); if (!tid || L.ob[y * L.w + x] || L.road[y * L.w + x]) continue;
      const n = tid === 'grass' ? 2 : tid === 'swamp' || tid === 'rough' || tid === 'dirt' ? 1 : 0;
      for (let k = 0; k < n; k++) { if (!RR.chance(0.45)) continue; const px = tx * ts + RR.range(5, ts - 5), py = ty * ts + RR.range(7, ts - 3);
        if (tid === 'grass' || tid === 'swamp') { g.strokeStyle = tid === 'swamp' ? 'rgba(80,76,48,0.6)' : 'rgba(74,64,38,' + (RR.chance(0.5) ? 0.45 : 0.3) + ')'; g.lineWidth = Math.max(1, ts / 46); g.lineCap = 'round';
          for (let b = -1; b <= 1; b++) { g.beginPath(); g.moveTo(px + b * ts * 0.025, py); g.quadraticCurveTo(px + b * ts * 0.04, py - ts * 0.05, px + b * ts * 0.06, py - ts * (tid === 'swamp' ? 0.13 : 0.08)); g.stroke(); }
          if (tid === 'grass' && RR.chance(0.12)) { g.fillStyle = RR.pick(['rgba(190,150,80,0.7)', 'rgba(150,90,70,0.6)', 'rgba(120,110,70,0.6)']); A.ell(g, px + ts * 0.08, py - ts * 0.03, ts * 0.018, ts * 0.018); g.fill(); } }
        else { g.strokeStyle = 'rgba(74,56,38,0.5)'; g.lineWidth = Math.max(1, ts / 60); A.ell(g, px, py, ts * 0.032, ts * 0.022); g.stroke(); }
      }
    }
    /* roads: drawn in red-brown ink as on old maps, bending smoothly from tile to tile */
    const segs = [];
    for (let ty = -1; ty <= CH; ty++) for (let tx = -1; tx <= CH; tx++) {
      const x = cx * CH + tx, y = cy * CH + ty; if (!S.inside(L, x, y) || !L.road[y * L.w + x]) continue;
      const px = tx * ts + ts / 2, py = ty * ts + ts / 2, ln = roadLinks(L, x, y);
      const ends = ln.map(([dx, dy]) => [px + dx * ts / 2, py + dy * ts / 2]);
      if (ends.length === 2) segs.push({ a: ends[0], c: [px, py], b: ends[1] });
      else if (ends.length === 0) segs.push({ dot: [px, py] });
      else ends.forEach(e => segs.push({ a: [px, py], c: [px, py], b: e }));
    }
    const strokeRoads = (w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
      segs.forEach(s => { if (s.dot) { g.moveTo(s.dot[0] + 0.01, s.dot[1]); g.lineTo(s.dot[0], s.dot[1]); return; } g.moveTo(s.a[0], s.a[1]); g.quadraticCurveTo(s.c[0], s.c[1], s.b[0], s.b[1]); }); g.stroke(); };
    if (segs.length) {
      strokeRoads(ts * 0.26, 'rgba(226,206,160,0.55)');
      strokeRoads(ts * 0.075, 'rgba(84,56,34,0.55)');
      g.save(); g.setLineDash([ts * 0.16, ts * 0.11]); strokeRoads(ts * 0.06, '#8a3a24'); g.restore();
    }
    /* the masses: ranges and woods, solid, inked round, casting a shadow, so it is plain where you cannot go */
    drawMasses(g, f, li, cx, cy, ts, W, sp);
    return c;
  }
  /* keep only this zoom's chunks and the last zoom's (shown scaled while the new ones are drawn) */
  function pruneChunks() { const keep = V.ts, prev = V._lastTs; Object.keys(V.chunks).forEach(k => { const z = +k.split(':')[3]; if (z !== keep && z !== prev) delete V.chunks[k]; }); V._lastTs = keep; }
  /* a chunk to draw now: baked if this frame still has time, else an older zoom's, scaled */
  function chunkNow(li, cx, cy) {
    const k = li + ':' + cx + ':' + cy + ':' + V.ts; if (V.chunks[k]) return [V.chunks[k], 1];
    if (performance.now() < V._bakeUntil) return [chunk(li, cx, cy), 1];
    for (const z of ZOOMS) { const c = V.chunks[li + ':' + cx + ':' + cy + ':' + z]; if (c) return [c, V.ts / z]; }
    return null;
  }
  function chunk(li, cx, cy) { const k = li + ':' + cx + ':' + cy + ':' + V.ts; if (!V.chunks[k]) V.chunks[k] = bakeChunk(li, cx, cy); return V.chunks[k]; }

  /* ======================= fog ======================= */
  function fogCanvas() {
    const st = V.st, L = st.layers[V.layer], P = st.players[V.viewer()];
    if (!V.fog || V.fog.width !== L.w + 2) { V.fog = A.canvas(L.w + 2, L.h + 2); V.fogImg = V.fog.getContext('2d').createImageData(L.w + 2, L.h + 2); }
    const E = P.explored[V.layer], d = V.fogImg.data;
    for (let y = -1; y <= L.h; y++) for (let x = -1; x <= L.w; x++) {
      const o = ((y + 1) * (L.w + 2) + x + 1) * 4;
      const seen = x >= 0 && y >= 0 && x < L.w && y < L.h && E[y * L.w + x];
      d[o] = 5; d[o + 1] = 4; d[o + 2] = 10; d[o + 3] = seen ? 0 : 255;
    }
    V.fog.getContext('2d').putImageData(V.fogImg, 0, 0);
    return V.fog;
  }

  /* ======================= drawing ======================= */
  function frame(now) {
    requestAnimationFrame(frame);
    if (!V.st || V.hidden) return;
    const t = (now - V.t0) / 1000; V.t = t;
    stepAnim(now);
    const ctx = V.ctx, st = V.st, L = st.layers[V.layer], ts = V.ts;
    ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    if (V.worlds && SU.sketch) { SU.sketch.drawWorlds(ctx, V.w, V.h, t); drawMini(); return; }
    const SK = !V.paintMode && st.regions && SU.sketch ? SU.sketch : null;
    ctx.fillStyle = V.layer === 3 ? '#030308' : '#6a8484'; ctx.fillRect(0, 0, V.w, V.h);
    if (V.layer === 3) drawStars(ctx, t);
    const x0 = Math.floor(V.cam.x - V.w / 2 / ts) - 1, y0 = Math.floor(V.cam.y - V.h / 2 / ts) - 1;
    const x1 = Math.ceil(V.cam.x + V.w / 2 / ts) + 1, y1 = Math.ceil(V.cam.y + V.h / 2 / ts) + 3;
    const ox = V.w / 2 - V.cam.x * ts, oy = V.h / 2 - V.cam.y * ts;
    /* ground (a little drawing time each frame; what is not ready yet shows as the last zoom's picture) */
    V._bakeUntil = performance.now() + 30;
    for (let cy = Math.max(0, Math.floor(y0 / CH)); cy <= Math.min(Math.floor((L.h - 1) / CH), Math.floor(y1 / CH)); cy++)
      for (let cx = Math.max(0, Math.floor(x0 / CH)); cx <= Math.min(Math.floor((L.w - 1) / CH), Math.floor(x1 / CH)); cx++)
        { const cs = chunkNow(V.layer, cx, cy); if (cs) ctx.drawImage(cs[0], Math.round(ox + cx * CH * ts), Math.round(oy + cy * CH * ts), cs[0].width * cs[1], cs[0].height * cs[1]); }
    /* water shimmer */
    ctx.strokeStyle = 'rgba(74,56,38,0.22)'; ctx.lineWidth = 1;
    for (let y = Math.max(0, y0); y <= Math.min(L.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(L.w - 1, x1); x++) {
      const i = y * L.w + x; if (L.t[i] !== S.TC.water || (x * 7 + y * 13) % 3) continue;
      const ph = (t * 0.6 + (L.v[i] / 255) * 6) % 6; if (ph > 2) continue;
      const px = ox + x * ts + ts * 0.2 + ph * ts * 0.15, py = oy + y * ts + ts * (0.3 + (L.v[i] % 5) * 0.1);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + ts * 0.15, py - ts * 0.06, px + ts * 0.3, py); ctx.stroke();
    }
    /* floods the storm left behind */
    if (st.floods && st.floods.length) { ctx.fillStyle = 'rgba(90,140,170,0.32)'; st.floods.forEach(f => { if (f.l !== V.layer || f.until < st.day || f.x < x0 || f.x > x1 || f.y < y0 || f.y > y1) return; ctx.beginPath(); ctx.ellipse(ox + (f.x + 0.5) * ts, oy + (f.y + 0.55) * ts, ts * 0.62, ts * 0.42, 0, 0, Math.PI * 2); ctx.fill(); }); }
    /* territory borders and names */
    if (SK) SK.drawBorders(ctx, ox, oy, ts, V.layer, x0, y0, x1, y1);
    /* reachable path preview, under everything that stands up */
    drawPath(ctx, ox, oy, ts, t);
    /* things that stand up, row by row */
    const P = st.players[V.viewer()], E = P.explored[V.layer];
    const seen = (x, y) => S.inside(L, x, y) && E[y * L.w + x];
    const rows = {};
    const add = (y, fn) => { (rows[y] = rows[y] || []).push(fn); };
    for (let y = Math.max(0, y0); y <= Math.min(L.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(L.w - 1, x1); x++) {
      const ob = L.ob[y * L.w + x]; if (!ob || !seen(x, y) || (!V.spriteObstacles && MASS[S.OB_NAMES[ob]])) continue;
      const sp = A.obstacle(S.OB_NAMES[ob], L.v[y * L.w + x], ts);
      add(y, () => ctx.drawImage(sp.c, Math.round(ox + x * ts - sp.ox), Math.round(oy + y * ts - sp.oy)));
    }
    const VP = V.st.players[V.viewer()], elshEye = !!(VP && VP.faction === 'elsharyn');
    const vis = SK ? SK.visible(st, V.viewer()) : null, VI = vis && vis[V.layer];
    const inSight = (x, y) => !VI || (S.inside(L, x, y) && VI[y * L.w + x]);
    const mem = VP && VP.mem || {};
    /* treasure you were told of: an X where to dig */
    (VP && VP.treasure || []).forEach(id => { const o = st.objects[id]; if (!o || !o.buried || o.layer !== V.layer || o.x < x0 || o.x > x1 || o.y < y0 || o.y > y1) return;
      add(o.y, () => { const cx = ox + (o.x + 0.5) * ts, cy = oy + (o.y + 0.6) * ts, k = ts * 0.22; ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = ts * 0.12; ctx.beginPath(); ctx.moveTo(cx - k, cy - k); ctx.lineTo(cx + k, cy + k); ctx.moveTo(cx + k, cy - k); ctx.lineTo(cx - k, cy + k); ctx.stroke();
        ctx.strokeStyle = '#c02a1a'; ctx.lineWidth = ts * 0.08; ctx.stroke(); ctx.restore(); }); });
    Object.values(st.objects).forEach(o => {
      if (o.layer !== V.layer || o.gone || (o.hidden && !(o.type === 'core' && elshEye)) || (o.type === 'glimmer' && o.owner !== V.viewer()) || o.x < x0 - 3 || o.x > x1 + 3 || o.y < y0 || o.y > y1 + 3) return;
      if (!seen(o.x, o.y) && !(o.type === 'town' && seen(o.x, o.y - 1))) return;
      /* out of sight: as you remember it (who held it when you last looked) */
      const shown = !inSight(o.x, o.y) && o.owner !== undefined && o.owner !== V.viewer() && mem[o.id] !== undefined && mem[o.id] !== o.owner ? Object.assign({}, o, { owner: mem[o.id] }) : o;
      add(o.y, () => A.object(ctx, st, shown, ox + o.x * ts, oy + o.y * ts, ts, t));
    });
    Object.values(st.armies).forEach(a => {
      if (a.dead || a.layer !== V.layer || a.x < x0 || a.x > x1 || a.y < y0 || a.y > y1 || a.temp) return;
      if (!seen(a.x, a.y)) return;
      /* armies that move about are only seen where you can see now; guards and settled bands stay where you saw them */
      if (a.owner !== V.viewer() && !inSight(a.x, a.y) && (a.owner >= 0 || a.roam || a.travellers || a.mcfly)) return;
      let ax = a.x, ay = a.y;
      if (V.anim && V.anim.army === a.id) { ax = V.anim.fx; ay = V.anim.fy; }
      add(Math.ceil(ay), () => drawArmy(ctx, a, ox + ax * ts, oy + ay * ts, ts, t));
    });
    Object.keys(rows).map(Number).sort((a, b) => a - b).forEach(y => rows[y].forEach(fn => fn()));
    /* land you remember but cannot see now */
    if (SK) SK.drawMemory(ctx, ox, oy, ts, V.layer);
    /* the storm */
    drawStorm(ctx, ox, oy, ts, t);
    /* land you have not seen: the old drawing everyone carries (the editor shows everything) */
    if (SK) SK.drawOverlay(ctx, ox, oy, ts, V.layer);
    else if (!V.paintMode) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      const fc = fogCanvas(); ctx.drawImage(fc, 0, 0, fc.width, fc.height, ox - ts, oy - ts, fc.width * ts, fc.height * ts); }
    /* the old map's edges, browned with age */
    if (V.layer !== 3) { if (!V._vig || V._vig.w !== V.w || V._vig.h !== V.h) { const vg = ctx.createRadialGradient(V.w / 2, V.h / 2, Math.min(V.w, V.h) * 0.45, V.w / 2, V.h / 2, Math.hypot(V.w, V.h) * 0.62); vg.addColorStop(0, 'rgba(70,44,18,0)'); vg.addColorStop(1, 'rgba(70,44,18,0.32)'); V._vig = { w: V.w, h: V.h, g: vg }; }
      ctx.fillStyle = V._vig.g; ctx.fillRect(0, 0, V.w, V.h); }
    /* the storm on the horizon when it is off the screen, and its lightning lighting the sky */
    stormFar(ctx, ox, oy, ts, t);
    /* where the picked army can go today, and what blocks it */
    if (V.showWay) drawWay(ctx, ox, oy, ts, x0, y0, x1, y1, t);
    /* the pointer: reachable (green), later (gold), through a fight (orange), or not at all (red cross) */
    const hm = V.hoverMark;
    if (V.hover && S.inside(L, V.hover.x, V.hover.y)) {
      const kind = hm && hm.kind, col = { ok: '120,230,110', later: '240,200,90', fight: '255,150,60', no: '235,80,70' }[kind] || '255,236,190';
      const hx = hm && kind ? hm.x : V.hover.x, hy = hm && kind ? hm.y : V.hover.y;
      ctx.strokeStyle = 'rgba(' + col + ',0.9)'; ctx.lineWidth = 2; ctx.strokeRect(ox + hx * ts + 2, oy + hy * ts + 2, ts - 4, ts - 4);
      if (kind === 'no' && hm.why !== 'unexplored') { ctx.lineWidth = Math.max(2, ts * 0.06); ctx.lineCap = 'round'; const k = ts * 0.22, cx = ox + hx * ts + ts / 2, cy = oy + hy * ts + ts / 2;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth += 2; ctx.beginPath(); ctx.moveTo(cx - k, cy - k); ctx.lineTo(cx + k, cy + k); ctx.moveTo(cx + k, cy - k); ctx.lineTo(cx - k, cy + k); ctx.stroke();
        ctx.strokeStyle = 'rgba(' + col + ',1)'; ctx.lineWidth -= 2; ctx.stroke(); ctx.lineCap = 'butt'; }
      if (kind === 'fight' && hm.at) markTile(ctx, ox, oy, ts, hm.at.x, hm.at.y, '255,150,60', '⚔', t);
      if (kind === 'no' && hm.block) markTile(ctx, ox, oy, ts, hm.block.x, hm.block.y, '235,80,70', '!', t);
    }
    if (V.blockMark && performance.now() < V.blockMark.until) markTile(ctx, ox, oy, ts, V.blockMark.x, V.blockMark.y, '235,80,70', '!', t);
    drawMini();
  }
  /* a pulsing ring on a tile with a sign in it */
  function markTile(ctx, ox, oy, ts, x, y, col, sign, t) {
    const cx = ox + x * ts + ts / 2, cy = oy + y * ts + ts / 2, r = ts * (0.42 + Math.sin(t * 5) * 0.04);
    ctx.strokeStyle = 'rgba(' + col + ',0.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(cx, cy - ts * 0.48, ts * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(' + col + ',1)'; ctx.font = 'bold ' + Math.round(ts * 0.22) + 'px Georgia'; ctx.textAlign = 'center'; ctx.fillText(sign, cx, cy - ts * 0.4);
  }
  /* the way overlay: green where the picked army can walk today, orange beside guards, red stripes where nobody walks */
  function drawWay(ctx, ox, oy, ts, x0, y0, x1, y1, t) {
    const st = V.st, L = st.layers[V.layer], a = SU.ui && SU.ui.selectedArmy && SU.ui.selectedArmy(), E = st.players[V.viewer()].explored[V.layer];
    let R = null;
    if (a && a.layer === V.layer && !a.dead) { const key = a.id + ':' + a.x + ',' + a.y + ':' + a.mp + ':' + st.day + ':' + Object.keys(st.armies).length + ':' + Object.keys(st.objects).length;
      if (V._reachKey !== key) { V._reachKey = key; V._reach = SU.rules.reach(st, a); } R = V._reach; }
    if (!V._hatch) { const c = A.canvas(16, 16), g = c.getContext('2d'); g.strokeStyle = 'rgba(235,80,70,0.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-4, 4); g.lineTo(4, -4); g.moveTo(-4, 20); g.lineTo(20, -4); g.moveTo(12, 20); g.lineTo(20, 12); g.stroke(); V._hatch = ctx.createPattern(c, 'repeat'); }
    for (let y = Math.max(0, y0); y <= Math.min(L.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(L.w - 1, x1); x++) {
      const i = y * L.w + x; if (!E[i]) continue;
      const px = ox + x * ts, py = oy + y * ts;
      const thing = S.objAt(st, V.layer, x, y) || S.armyAt(st, V.layer, x, y);
      if (!thing && SU.rules.blockedBy(st, V.layer, x, y, a && a.layer === V.layer ? a : null)) { ctx.fillStyle = 'rgba(120,20,20,0.22)'; ctx.fillRect(px, py, ts, ts); ctx.save(); ctx.translate(px, py); ctx.fillStyle = V._hatch; ctx.fillRect(0, 0, ts, ts); ctx.restore(); continue; }
      if (R && R.cost[i] < Infinity) { ctx.fillStyle = R.stop[i] ? 'rgba(255,150,60,0.38)' : thing ? 'rgba(140,255,120,0.16)' : 'rgba(140,255,120,0.3)'; ctx.fillRect(px, py, ts, ts);
        /* the edge of today's reach, drawn as a line */
        ctx.strokeStyle = 'rgba(170,255,150,0.95)'; ctx.lineWidth = 2; ctx.beginPath();
        const out = (dx, dy) => { const xx = x + dx, yy = y + dy; return !S.inside(L, xx, yy) || !(R.cost[yy * L.w + xx] < Infinity); };
        if (out(0, -1)) { ctx.moveTo(px, py); ctx.lineTo(px + ts, py); } if (out(0, 1)) { ctx.moveTo(px, py + ts); ctx.lineTo(px + ts, py + ts); }
        if (out(-1, 0)) { ctx.moveTo(px, py); ctx.lineTo(px, py + ts); } if (out(1, 0)) { ctx.moveTo(px + ts, py); ctx.lineTo(px + ts, py + ts); }
        ctx.stroke(); }
    }
  }
  function drawStars(ctx, t) {
    if (!V.stars) { const R = SU.makeRng(5); V.stars = []; for (let i = 0; i < 220; i++) V.stars.push([R.next(), R.next(), R.range(0.3, 1.4), R.next() * 6]); }
    V.stars.forEach(([x, y, r, p]) => { ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + Math.sin(t + p) * 0.3) + ')'; ctx.beginPath(); ctx.arc(x * V.w, y * V.h, r, 0, Math.PI * 2); ctx.fill(); });
  }
  function drawArmy(ctx, a, px, py, ts, t) {
    const st = V.st, cx = px + ts / 2, gy = py + ts * 0.86, col = S.color(st, a.owner);
    const h = S.heroOf(st, a), sel = SU.ui && SU.ui.selected === a.id;
    /* at the feet: the owner's ring (as in battle), and a pulsing gold ring when picked */
    if (a.owner >= 0 && !a.wild && !a.boat) { ctx.strokeStyle = A.rgba(col, 0.9); ctx.lineWidth = 2; A.ell(ctx, cx, gy, ts * 0.36, ts * 0.13); ctx.stroke(); }
    if (sel) { ctx.strokeStyle = 'rgba(255,230,150,' + (0.6 + Math.sin(t * 4) * 0.3) + ')'; ctx.lineWidth = 2.5; A.ell(ctx, cx, gy, ts * 0.43, ts * 0.17); ctx.stroke(); }
    if (a.caravan) { A.caravan(ctx, a, px, py, ts, t, col, false); return; }
    if (a.boat) { A.boat(ctx, a, px, py - ts * 0.1, ts, t, col); }
    if (h) { const moving = V.anim && V.anim.army === a.id; A.mountedHero(ctx, cx, gy - (a.boat ? ts * 0.25 : 0), ts * 0.78, Object.assign({ moving }, h), col, t, a.face || 1); }
    else if (a.wild) {
      const stacks = S.stacksIn(a.slots).filter(s => s.n > 0).sort((p, q) => D.CREATURES[q.cr].tier - D.CREATURES[p.cr].tier);
      const c = stacks[0] && D.CREATURES[stacks[0].cr];
      if (c) { const big = c.tier >= 7 ? 0.95 : c.tier >= 4 ? 0.85 : 0.75; A.creature(ctx, c.art, cx, gy, ts * big, { t: t + a.x, f: (a.x + a.y) % 2 ? 1 : -1, tint: c.tint || (c.upgraded ? 1 : 0) }); }
      if (a.herd) { ctx.fillStyle = 'rgba(160,220,120,0.9)'; ctx.font = 'bold ' + Math.round(ts * 0.26) + 'px Georgia'; ctx.textAlign = 'center'; ctx.fillText('♣', cx + ts * 0.32, py + ts * 0.25); }
      if (a.travellers) { ctx.strokeStyle = '#4a3220'; ctx.lineWidth = Math.max(1, ts * 0.04); ctx.beginPath(); ctx.moveTo(cx + ts * 0.3, gy); ctx.lineTo(cx + ts * 0.3, gy - ts * 0.55); ctx.stroke(); ctx.fillStyle = '#efe2c0'; ctx.beginPath(); ctx.moveTo(cx + ts * 0.3, gy - ts * 0.55); ctx.lineTo(cx + ts * 0.48, gy - ts * 0.48); ctx.lineTo(cx + ts * 0.3, gy - ts * 0.4); ctx.fill(); }
    } else {
      const cap = S.captainsIn(S.slotsOf(st, a))[0];
      if (cap) A.captain(ctx, cx, gy, ts * 0.62, cap, col, t, a.face || 1);
      else { const s0 = S.stacksIn(a.slots).find(x => x.n > 0); if (s0) A.creature(ctx, D.CREATURES[s0.cr].art, cx, gy, ts * 0.7, { t, f: a.face || 1 }); }
      A.flag(ctx, cx + ts * 0.2, gy - ts * 0.1, ts * 0.32, col, t);
      if (a.merc) { ctx.fillStyle = '#ffd24a'; ctx.font = 'bold ' + Math.round(ts * 0.22) + 'px Georgia'; ctx.textAlign = 'center'; ctx.fillText('¤', cx - ts * 0.3, py + ts * 0.3); }
    }

  }
  function drawPath(ctx, ox, oy, ts, t) {
    const p = V.path; if (!p || !p.steps || p.layer !== V.layer) return;
    /* which day each step is walked on, and where each night falls */
    let mp = p.mp, day = 0; const dayOf = [];
    p.steps.forEach(s => { if (mp < s.cost && mp < p.mpMax) { day++; mp = p.mpMax; } mp -= s.cost; dayOf.push(day); });
    const nights = [];
    p.steps.forEach((s, i) => {
      const ok = dayOf[i] === 0;
      const cx = ox + s.x * ts + ts / 2, cy = oy + s.y * ts + ts / 2;
      const last = i === p.steps.length - 1;
      if (!last && dayOf[i + 1] !== dayOf[i]) nights.push({ cx, cy, n: dayOf[i] + 1 });
      ctx.fillStyle = ok ? 'rgba(120,230,110,0.85)' : 'rgba(240,200,90,0.9)';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
      if (last) { ctx.beginPath(); ctx.arc(cx, cy, ts * 0.17, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); if (p.target) { ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(ts * 0.26) + 'px Georgia'; ctx.textAlign = 'center'; ctx.fillText(p.target === 'battle' ? '⚔' : p.target === 'talk' ? '❝' : p.target === 'visit' ? '✦' : p.target === 'meet' ? '⇄' : '', cx, cy + ts * 0.09); } }
      else { const n = p.steps[i + 1]; const a = Math.atan2(n.y - s.y, n.x - s.x); ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(ts * 0.14, 0); ctx.lineTo(-ts * 0.08, -ts * 0.09); ctx.lineTo(-ts * 0.08, ts * 0.09); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    });
    /* the end of each day's march: a numbered camp */
    const tag = (cx, cy, txt, col) => { ctx.font = 'bold ' + Math.round(ts * 0.24) + 'px Georgia'; const w = Math.max(ts * 0.34, ctx.measureText(txt).width + ts * 0.14);
      ctx.fillStyle = 'rgba(20,14,8,0.85)'; ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - w / 2, cy - ts * 0.62, w, ts * 0.3, ts * 0.08) : ctx.rect(cx - w / 2, cy - ts * 0.62, w, ts * 0.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.fillText(txt, cx, cy - ts * 0.4); };
    nights.forEach(nt => tag(nt.cx, nt.cy, 'day ' + nt.n, '#f0c85a'));
    const end = p.steps[p.steps.length - 1]; if (end && dayOf[dayOf.length - 1] > 0) tag(ox + end.x * ts + ts / 2, oy + end.y * ts + ts / 2, SU.plural(dayOf[dayOf.length - 1] + 1, 'day'), '#ffe3a3');
  }
  /* the Sunear'Zikhron: a turning monster of weather. It darkens the land for miles around,
     its cloud arms wheel round a calm, lit eye, rain sweeps under it, and its lightning lights the sky */
  let puff = null;
  function puffSprite() {
    if (puff) return puff; const c = A.canvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(205,212,232,0.55)'); gr.addColorStop(0.5, 'rgba(120,128,160,0.35)'); gr.addColorStop(1, 'rgba(60,66,96,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (puff = c);
  }
  function drawStorm(ctx, ox, oy, ts, t) {
    const s = V.st.storm; if (!s || s.layer !== V.layer) return;
    const cx = ox + (s.x + 0.5) * ts, cy = oy + (s.y + 0.5) * ts, r = s.r * ts, eye = (s.eye || 1.6) * ts;
    if (cx + r * 2 < 0 || cy + r * 2 < 0 || cx - r * 2 > V.w || cy - r * 2 > V.h) return;
    ctx.save();
    /* the land darkens and greys as you come near */
    const dk = ctx.createRadialGradient(cx, cy, eye, cx, cy, r * 1.9);
    dk.addColorStop(0, 'rgba(12,16,34,0.18)'); dk.addColorStop(0.2, 'rgba(12,16,34,0.48)'); dk.addColorStop(0.52, 'rgba(14,18,36,0.42)'); dk.addColorStop(1, 'rgba(14,18,36,0)');
    ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2); ctx.fill();
    /* the cloud arms */
    const P = puffSprite(), R = SU.makeRng(23);
    for (let arm = 0; arm < 5; arm++) for (let k = 0; k < 24; k++) {
      const u = k / 24, a = arm * Math.PI * 2 / 5 + u * 4.2 - t * 0.22, rr = eye * 1.2 + u * (r * 1.05 - eye);
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.86, sz = ts * (1.2 + u * 1.6) * (0.8 + R.next() * 0.5);
      ctx.globalAlpha = 0.42 + (1 - u) * 0.28; ctx.drawImage(P, px - sz, py - sz, sz * 2, sz * 2);
    }
    ctx.globalAlpha = 1;
    /* rain under the clouds */
    ctx.strokeStyle = 'rgba(190,215,255,0.32)'; ctx.lineWidth = 1;
    for (let i = 0; i < 220; i++) { const a = R.next() * Math.PI * 2, d = Math.sqrt(R.next()) * r; if (d < eye) continue; const px = cx + Math.cos(a) * d, py0 = cy + Math.sin(a) * d * 0.9; const py = py0 + ((t * 320 + i * 37) % (ts * 2)) - ts; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 3, py + 10); ctx.stroke(); }
    /* the eye: calm, lit from within */
    const eg = ctx.createRadialGradient(cx, cy, 0, cx, cy, eye * 1.6);
    eg.addColorStop(0, 'rgba(255,245,210,0.42)'); eg.addColorStop(0.6, 'rgba(255,245,210,0.14)'); eg.addColorStop(1, 'rgba(255,245,210,0)');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, cy, eye * 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,200,' + (0.4 + Math.sin(t * 2) * 0.2) + ')'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, eye, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    /* lightning */
    const fl = (t * 0.6) % 6; if (fl < 0.14) { const B = SU.makeRng(Math.floor(t * 0.6 / 6) + 3); ctx.strokeStyle = 'rgba(235,242,255,0.95)'; ctx.shadowColor = '#cfe0ff'; ctx.shadowBlur = 14; ctx.lineWidth = 2.2; ctx.beginPath(); let px = cx + B.range(-r, r) * 0.7, py = cy - r * 0.7; ctx.moveTo(px, py); for (let k = 0; k < 7; k++) { px += B.range(-ts, ts); py += ts * 0.8; ctx.lineTo(px, py); } ctx.stroke(); ctx.shadowBlur = 0; V._flash = 1; }
    ctx.restore();
  }
  /* from far away: a dark smudge on the edge of the view, an arrow and how far; or a word if it is on another world */
  function stormFar(ctx, ox, oy, ts, t) {
    const s = V.st.storm; if (!s) return;
    if (V._flash > 0) { ctx.fillStyle = 'rgba(220,230,255,' + (V._flash * 0.12) + ')'; ctx.fillRect(0, 0, V.w, V.h); V._flash = Math.max(0, V._flash - 0.12); }
    if (s.layer !== V.layer) { const txt = 'The Sunear’Zikhron is on ' + D.LAYERS[s.layer].name; ctx.font = 'italic 12px Georgia'; const w = ctx.measureText(txt).width + 16;
      ctx.fillStyle = 'rgba(14,12,24,0.75)'; ctx.fillRect(V.w - w - 8, V.h - 26, w, 20); ctx.fillStyle = 'rgba(210,220,255,0.95)'; ctx.textAlign = 'right'; ctx.fillText(txt, V.w - 16, V.h - 12); return; }
    const cx = ox + (s.x + 0.5) * ts, cy = oy + (s.y + 0.5) * ts;
    if (cx > -s.r * ts * 0.3 && cy > -s.r * ts * 0.3 && cx < V.w + s.r * ts * 0.3 && cy < V.h + s.r * ts * 0.3) return;
    const mx = V.w / 2, my = V.h / 2, a = Math.atan2(cy - my, cx - mx);
    const k = Math.min(Math.abs((V.w / 2 - 24) / (Math.cos(a) || 1e-6)), Math.abs((V.h / 2 - 24) / (Math.sin(a) || 1e-6)));
    const ex = mx + Math.cos(a) * k, ey = my + Math.sin(a) * k;
    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 140); g.addColorStop(0, 'rgba(14,18,36,0.6)'); g.addColorStop(1, 'rgba(14,18,36,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, 140, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = 'rgba(200,215,255,0.9)'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -9); ctx.lineTo(-2, 0); ctx.lineTo(-6, 9); ctx.closePath(); ctx.fill(); ctx.restore();
    const dist = Math.round(Math.hypot(s.x - V.cam.x, s.y - V.cam.y));
    ctx.fillStyle = 'rgba(220,228,255,0.9)'; ctx.font = 'italic 12px Georgia'; ctx.textAlign = Math.cos(a) > 0.3 ? 'right' : Math.cos(a) < -0.3 ? 'left' : 'center';
    ctx.fillText('the storm · ' + dist + ' tiles', ex - Math.cos(a) * 26, ey - Math.sin(a) * 26 + 4);
  }

  /* ======================= minimap ======================= */
  const MINI_COL = { water: '#2a5f86', grass: '#5d8a3a', dirt: '#8a6a44', rough: '#7c7766', sand: '#d1b77a', snow: '#e3ebf2', swamp: '#4f5e3a', ash: '#5a4740', dusk: '#4a3f66', moon: '#b9b6c8', void: '#05050a' };
  function drawMini() {
    if (!V.mctx || !V.st) return;
    const st = V.st, L = st.layers[V.layer], m = V.mini, g = V.mctx;
    const W = m.width, H = m.height, sc = Math.min(W / L.w, H / L.h), offx = (W - L.w * sc) / 2, offy = (H - L.h * sc) / 2;
    const P = st.players[V.viewer()], E = P.explored[V.layer];
    if (!V.miniCache || V.miniFrame++ % 20 === 0) {
      const c = V.miniCache || A.canvas(W, H); const cg = c.getContext('2d');
      cg.fillStyle = '#05040a'; cg.fillRect(0, 0, W, H);
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const i = y * L.w + x, tc = S.TCODES[L.t[i]];
        /* land you have not seen: the old drawing, in parchment and ink */
        if (!E[i]) { cg.fillStyle = tc === 'void' ? '#1c1828' : tc === 'water' ? '#8c9a92' : L.ob[i] === S.OB.mountain ? '#8a7a58' : '#cdb98a'; cg.fillRect(offx + x * sc, offy + y * sc, Math.ceil(sc), Math.ceil(sc)); continue; }
        cg.fillStyle = L.ob[i] === S.OB.mountain ? '#6a655a' : L.ob[i] && L.ob[i] !== S.OB.rock ? A.shade(MINI_COL[tc], -25) : MINI_COL[tc]; cg.fillRect(offx + x * sc, offy + y * sc, Math.ceil(sc), Math.ceil(sc)); }
      /* the edges of land someone holds */
      if (L.reg && st.regions) for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const i = y * L.w + x, a = L.reg[i]; if (!a || !E[i]) continue; const r = st.regions[V.layer][a - 1]; if (!r || r.owner < 0) continue;
        if ([[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => { const xx = x + dx, yy = y + dy; return S.inside(L, xx, yy) && L.reg[yy * L.w + xx] && L.reg[yy * L.w + xx] !== a; })) { cg.fillStyle = st.players[r.owner].color; cg.fillRect(offx + x * sc, offy + y * sc, Math.ceil(sc), Math.ceil(sc)); } }
      Object.values(st.objects).forEach(o => { if (o.layer !== V.layer || !E[o.y * L.w + o.x]) return; if (o.type === 'town' || o.type === 'mine' || o.type === 'village') { cg.fillStyle = S.color(st, o.owner); const r = o.type === 'town' ? 2.6 : 1.6; cg.fillRect(offx + (o.x - (o.type === 'town' ? 1 : 0.5)) * sc, offy + (o.y - (o.type === 'town' ? 1.5 : 0.5)) * sc, r * sc, r * sc); } if (o.type === 'urverk') { cg.fillStyle = '#c9b8ff'; cg.fillRect(offx + o.x * sc, offy + o.y * sc, 1.5 * sc, 1.5 * sc); } });
      V.miniCache = c; V.miniFrame = V.miniFrame || 1;
    }
    g.drawImage(V.miniCache, 0, 0);
    Object.values(st.armies).forEach(a => { if (a.dead || a.layer !== V.layer || a.temp || !E[a.y * L.w + a.x] || a.wild) return; g.fillStyle = S.color(st, a.owner); g.fillRect(offx + a.x * sc - 1, offy + a.y * sc - 1, Math.max(3, sc * 1.2), Math.max(3, sc * 1.2)); });
    const s = st.storm; if (s && s.layer === V.layer) { g.strokeStyle = 'rgba(190,210,255,0.7)'; g.lineWidth = 1; g.beginPath(); g.arc(offx + s.x * sc, offy + s.y * sc, s.r * sc, 0, Math.PI * 2); g.stroke(); }
    g.strokeStyle = '#ffe9b0'; g.lineWidth = 1;
    g.strokeRect(offx + (V.cam.x - V.w / 2 / V.ts) * sc, offy + (V.cam.y - V.h / 2 / V.ts) * sc, V.w / V.ts * sc, V.h / V.ts * sc);
    V.miniMap = { offx, offy, sc };
  }
  /* a small picture of a whole layer, all of it seen: for the new-game screen and the saves */
  V.thumb = function (st, li, W, H) {
    const L = st.layers[li], c = A.canvas(W, H), g = c.getContext('2d');
    const sc = Math.min(W / L.w, H / L.h), offx = (W - L.w * sc) / 2, offy = (H - L.h * sc) / 2;
    g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const i = y * L.w + x; const base = MINI_COL[S.TCODES[L.t[i]]] || '#000';
      g.fillStyle = L.ob[i] === S.OB.mountain ? '#6a655a' : L.ob[i] && L.ob[i] !== S.OB.rock ? A.shade(base, -25) : base; g.fillRect(offx + x * sc, offy + y * sc, Math.ceil(sc), Math.ceil(sc)); }
    Object.values(st.objects).forEach(o => { if (o.layer !== li || o.hidden) return;
      if (o.type === 'town') { g.fillStyle = o.owner >= 0 && st.players[o.owner] ? st.players[o.owner].color : o.start ? '#ffe3a3' : '#cfc6b0'; g.fillRect(offx + (o.x - 1.5) * sc, offy + (o.y - 2) * sc, Math.max(4, 3.5 * sc), Math.max(4, 3.5 * sc)); g.strokeStyle = '#000'; g.lineWidth = 1; g.strokeRect(offx + (o.x - 1.5) * sc, offy + (o.y - 2) * sc, Math.max(4, 3.5 * sc), Math.max(4, 3.5 * sc)); }
      else if (o.type === 'mine' || o.type === 'village') { g.fillStyle = o.owner >= 0 && st.players[o.owner] ? st.players[o.owner].color : '#9a9078'; g.fillRect(offx + (o.x - 0.5) * sc, offy + (o.y - 0.5) * sc, Math.max(2, 1.6 * sc), Math.max(2, 1.6 * sc)); }
      else if (o.type === 'urverk') { g.fillStyle = '#c9b8ff'; g.fillRect(offx + o.x * sc, offy + o.y * sc, Math.max(2, 1.5 * sc), Math.max(2, 1.5 * sc)); } });
    return c;
  };
  V.miniClick = function (mx, my) { const m = V.miniMap; if (!m) return; V.cam.x = (mx - m.offx) / m.sc; V.cam.y = (my - m.offy) / m.sc; };
  V.invalidate = function () { V.miniCache = null; };

  /* ======================= movement animation ======================= */
  /* walk an army along steps, calling onStep(x,y) for each; resolves when it stops */
  /* show one step of another player's army; resolves when it has been drawn */
  V.watchStep = function (a, x, y) {
    return new Promise(res => { let sent = false;
      V.walk(a, () => { if (sent) return { stop: true }; sent = true; return { next: [x, y] }; }, () => res());
      if (V.anim) { V.anim.follow = true; V.anim.speed = SU.ui && SU.ui.fast ? 45 : 95; } });
  };
  V.walk = function (a, onStep, onDone) {
    V.anim = { army: a.id, fx: a.x, fy: a.y, from: [a.x, a.y], to: null, t: 0, onStep, onDone, last: performance.now() };
    nextStep();
  };
  function nextStep() {
    const an = V.anim; if (!an) return;
    const r = an.onStep();
    if (!r || r.stop || !r.next) { const done = an.onDone; V.anim = null; if (done) done(r); return; }
    an.from = [an.fx, an.fy]; an.to = r.next; an.t = 0;
  }
  function stepAnim(now) {
    const an = V.anim; if (!an || !an.to) return;
    const dt = Math.min(64, now - an.last); an.last = now;
    an.t += dt / (an.speed || (SU.ui && SU.ui.fast ? 60 : 130));
    const k = Math.min(1, an.t);
    an.fx = SU.lerp(an.from[0], an.to[0], k); an.fy = SU.lerp(an.from[1], an.to[1], k);
    const a = V.st.armies[an.army];
    if (a && (a.owner === V.viewer() || an.follow)) { V.cam.x += (an.fx + 0.5 - V.cam.x) * 0.15; V.cam.y += (an.fy + 0.5 - V.cam.y) * 0.15; }
    if (k >= 1) { an.fx = an.to[0]; an.fy = an.to[1]; an.to = null; nextStep(); }
  }

  /* ======================= input ======================= */
  function bindInput() {
    const cv = V.cv; let drag = null, moved = false;
    let paintLast = null;
    cv.addEventListener('mousedown', e => {
      drag = { x: e.clientX, y: e.clientY, cx: V.cam.x, cy: V.cam.y, btn: e.button }; moved = false;
      if (V.worlds) return;
      if (V.paintMode && e.button === 0) { const r = cv.getBoundingClientRect(); const tt = V.screenToTile(e.clientX - r.left, e.clientY - r.top); paintLast = tt.x + ',' + tt.y; drag.paint = true; SU.emit('mappaint', { x: tt.x, y: tt.y, first: true }); }
    });
    window.addEventListener('mousemove', e => {
      const r = cv.getBoundingClientRect();
      if (drag && drag.paint) { const r = cv.getBoundingClientRect(); const tt = V.screenToTile(e.clientX - r.left, e.clientY - r.top); const k = tt.x + ',' + tt.y; if (k !== paintLast) { paintLast = k; SU.emit('mappaint', { x: tt.x, y: tt.y, first: false }); } }
      if (V.worlds && e.target === cv) { const txt = SU.sketch.worldsHover(e.clientX - r.left, e.clientY - r.top); SU.emit('worldshover', txt); drag = null; return; }
      else if (drag && (drag.btn === 0 || (drag.btn === 2 && V.paintMode))) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 6) moved = true; if (moved) { V.cam.x = drag.cx - dx / V.ts; V.cam.y = drag.cy - dy / V.ts; } }
      if (e.target === cv) { const tt = V.screenToTile(e.clientX - r.left, e.clientY - r.top); if (!V.hover || tt.x !== V.hover.x || tt.y !== V.hover.y) { V.hover = tt; SU.emit('hover', tt); } }
    });
    window.addEventListener('mouseup', e => {
      if (!drag) return; const was = drag; drag = null;
      if (moved || was.paint) return;
      const r = cv.getBoundingClientRect(); if (e.target !== cv) return;
      if (V.worlds) { const p = SU.sketch.worldsHit(e.clientX - r.left, e.clientY - r.top); if (p) V.enterWorld(p); return; }
      const tt = V.screenToTile(e.clientX - r.left, e.clientY - r.top);
      if (was.btn === 2) SU.emit('mapinfo', { x: tt.x, y: tt.y, sx: e.clientX, sy: e.clientY });
      else SU.emit('mapclick', Object.assign(tt, { shift: e.shiftKey || e.ctrlKey || e.metaKey }));
    });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); V.zoom(e.deltaY < 0 ? 1 : -1, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    /* touch: one finger pans or taps, long press for info */
    let tch = null;
    cv.addEventListener('touchstart', e => { if (e.touches.length !== 1) return; const t0 = e.touches[0]; tch = { x: t0.clientX, y: t0.clientY, cx: V.cam.x, cy: V.cam.y, moved: false, at: Date.now() }; }, { passive: true });
    cv.addEventListener('touchmove', e => { if (!tch || e.touches.length !== 1) return; const t0 = e.touches[0]; const dx = t0.clientX - tch.x, dy = t0.clientY - tch.y; if (Math.abs(dx) + Math.abs(dy) > 10) tch.moved = true; if (tch.moved) { V.cam.x = tch.cx - dx / V.ts; V.cam.y = tch.cy - dy / V.ts; } e.preventDefault(); }, { passive: false });
    cv.addEventListener('touchend', e => { if (!tch) return; const t = tch; tch = null; if (t.moved) return; const r = cv.getBoundingClientRect();
      if (V.worlds) { const p = SU.sketch.worldsHit(t.x - r.left, t.y - r.top); if (p) V.enterWorld(p); return; }
      const tt = V.screenToTile(t.x - r.left, t.y - r.top);
      if (Date.now() - t.at > 550) SU.emit('mapinfo', { x: tt.x, y: tt.y, sx: t.x, sy: t.y }); else SU.emit('mapclick', tt); });
    if (V.mini) { const mc = e => { const r = V.mini.getBoundingClientRect(); V.miniClick((e.clientX - r.left) * V.mini.width / r.width, (e.clientY - r.top) * V.mini.height / r.height); };
      let md = false; V.mini.addEventListener('mousedown', e => { md = true; mc(e); }); window.addEventListener('mousemove', e => { if (md) mc(e); }); window.addEventListener('mouseup', () => md = false); }
    window.addEventListener('keydown', e => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (V.hidden) { SU.emit('key', e); return; }
      const k = e.key; const sp = 1.2;
      if (k === 'ArrowLeft') V.cam.x -= sp; else if (k === 'ArrowRight') V.cam.x += sp; else if (k === 'ArrowUp') V.cam.y -= sp; else if (k === 'ArrowDown') V.cam.y += sp;
      else if (k === '+' || k === '=') V.zoom(1); else if (k === '-') V.zoom(-1);
      else SU.emit('key', e);
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
