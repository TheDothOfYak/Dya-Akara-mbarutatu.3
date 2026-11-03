/* ============================================================
   SKAAR UVERKHRON — js/view_map.js
   The adventure map on screen: ground baked in chunks (with
   soft edges where terrains meet), roads, trees and mountains,
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
    V.zoomI = 2; V.ts = ZOOMS[V.zoomI];
    V.cam = { x: 10, y: 10 }; V.layer = 0;
    V.chunks = {}; V.fog = null; V.fogKey = '';
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
  V.setGame = function (st) { V.st = st; V.chunks = {}; V.fog = null; V.miniCache = null; };
  V.viewer = () => V.st ? (SU.ui && SU.ui.viewer != null ? SU.ui.viewer : V.st.current) : 0;
  V.setLayer = function (li) { if (V.layer === li) return; V.layer = li; V.fog = null; V.miniCache = null; V.path = null; SU.emit('layer', li); };
  V.centerOn = function (layer, x, y, instant) { V.setLayer(layer); V.cam.x = x + 0.5; V.cam.y = y + 0.5; };
  V.zoom = function (d, px, py) {
    const ni = SU.clamp(V.zoomI + d, 0, ZOOMS.length - 1); if (ni === V.zoomI) return;
    const before = V.screenToTile(px != null ? px : V.w / 2, py != null ? py : V.h / 2, true);
    V.zoomI = ni; V.ts = ZOOMS[ni]; V.chunks = {};
    const after = V.screenToTile(px != null ? px : V.w / 2, py != null ? py : V.h / 2, true);
    V.cam.x += before.fx - after.fx; V.cam.y += before.fy - after.fy;
  };
  V.screenToTile = function (sx, sy, frac) {
    const fx = V.cam.x + (sx - V.w / 2) / V.ts, fy = V.cam.y + (sy - V.h / 2) / V.ts;
    return frac ? { fx, fy } : { x: Math.floor(fx), y: Math.floor(fy) };
  };
  V.tileToScreen = (x, y) => ({ x: (x - V.cam.x) * V.ts + V.w / 2, y: (y - V.cam.y) * V.ts + V.h / 2 });

  /* ======================= baked ground ======================= */
  const masks = {};
  function edgeMask(dir, ts) {
    const k = dir + '_' + ts; if (masks[k]) return masks[k];
    const c = A.canvas(ts, ts), g = c.getContext('2d'), img = g.createImageData(ts, ts), R = SU.makeRng(dir.length * 99 + ts);
    const n = SU.noise2(dir.charCodeAt(0) + ts);
    for (let y = 0; y < ts; y++) for (let x = 0; x < ts; x++) {
      const u = x / ts, v = y / ts; let d;
      switch (dir) { case 'n': d = v; break; case 's': d = 1 - v; break; case 'w': d = u; break; case 'e': d = 1 - u; break;
        case 'nw': d = Math.hypot(u, v); break; case 'ne': d = Math.hypot(1 - u, v); break; case 'sw': d = Math.hypot(u, 1 - v); break; default: d = Math.hypot(1 - u, 1 - v); }
      const j = n(x / ts * 4, y / ts * 4) * 0.22;
      const a = SU.clamp(1 - (d + j) / 0.42, 0, 1);
      img.data[(y * ts + x) * 4 + 3] = Math.round(a * a * (3 - 2 * a) * 255);
    }
    g.putImageData(img, 0, 0); return (masks[k] = c);
  }
  const blended = {};
  function maskedTex(tid, variant, dir, ts) {
    const k = tid + variant + dir + ts; if (blended[k]) return blended[k];
    const c = A.canvas(ts, ts), g = c.getContext('2d');
    g.drawImage(A.terrainTex(tid, variant, ts), 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(edgeMask(dir, ts), 0, 0);
    return (blended[k] = c);
  }
  const PRI = {}; D.TERRAIN_ORDER.forEach((t, i) => PRI[t] = i);
  /* a wobbly round blob for one tile: neighbours' blobs merge into smooth shapes */
  function blob(g, cxp, cyp, ts, seed) {
    const n = 11, R = SU.makeRng(seed * 7919 + 13);
    g.beginPath();
    const pts = [];
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; const r = ts * (0.66 + R.next() * 0.16); pts.push([cxp + Math.cos(a) * r, cyp + Math.sin(a) * r]); }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m0 = mid(pts[n - 1], pts[0]); g.moveTo(m0[0], m0[1]);
    for (let k = 0; k < n; k++) { const p = pts[k], q = pts[(k + 1) % n], m = mid(p, q); g.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
    g.closePath();
  }
  const patCache = {};
  function terrainPattern(g, tid, ts) {
    const k = tid + ts; if (!patCache[k]) { const c = A.canvas(ts * 3, ts * 3), h = c.getContext('2d'); for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) h.drawImage(A.terrainTex(tid, (x * 2 + y * 3) % 4, ts), x * ts, y * ts); patCache[k] = c; }
    return g.createPattern(patCache[k], 'repeat');
  }
  function bakeChunk(li, cx, cy) {
    const st = V.st, L = st.layers[li], ts = V.ts, W = CH * ts;
    const c = A.canvas(W, W), g = c.getContext('2d');
    const at = (x, y) => S.inside(L, x, y) ? S.TCODES[L.t[y * L.w + x]] : null;
    /* the plain tiles first */
    const present = new Set();
    for (let ty = -1; ty <= CH; ty++) for (let tx = -1; tx <= CH; tx++) {
      const x = cx * CH + tx, y = cy * CH + ty; const tid = at(x, y); if (!tid) continue;
      present.add(tid);
      if (tx >= 0 && ty >= 0 && tx < CH && ty < CH) g.drawImage(A.terrainTex(tid, L.v[y * L.w + x] % 4, ts), tx * ts, ty * ts);
    }
    /* then each terrain, lowest first, as merged blobs that spill over the tile edges */
    const order = [...present].sort((a, b) => PRI[a] - PRI[b]);
    const layer = A.canvas(W, W), lg = layer.getContext('2d');
    order.forEach((tid, oi) => {
      if (oi === 0) return;
      lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, W);
      lg.fillStyle = terrainPattern(lg, tid, ts); lg.fillRect(0, 0, W, W);
      for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) { const x = cx * CH + tx, y = cy * CH + ty; if (at(x, y) === tid) lg.drawImage(A.terrainTex(tid, L.v[y * L.w + x] % 4, ts), tx * ts, ty * ts); }
      lg.globalCompositeOperation = 'destination-in';
      lg.fillStyle = '#fff';
      const mask = A.canvas(W, W), mg = mask.getContext('2d'); mg.fillStyle = '#fff';
      let any = false;
      for (let ty = -1; ty <= CH; ty++) for (let tx = -1; tx <= CH; tx++) {
        const x = cx * CH + tx, y = cy * CH + ty; if (at(x, y) !== tid) continue; any = true;
        /* a tile with every neighbour the same needs no wobble: fill it square */
        blob(mg, tx * ts + ts / 2, ty * ts + ts / 2, ts, x * 92821 + y * 68917 + li);
        mg.fill();
        const same = (dx, dy) => at(x + dx, y + dy) === tid || !at(x + dx, y + dy);
        if (same(1, 0) && same(-1, 0) && same(0, 1) && same(0, -1)) mg.fillRect(tx * ts - 1, ty * ts - 1, ts + 2, ts + 2);
        /* bridge straight runs so long edges don't scallop */
        if (same(1, 0)) mg.fillRect(tx * ts + ts / 2, ty * ts + ts * 0.18, ts, ts * 0.64);
        if (same(0, 1)) mg.fillRect(tx * ts + ts * 0.18, ty * ts + ts / 2, ts * 0.64, ts);
      }
      if (!any) return;
      lg.drawImage(mask, 0, 0);
      /* a soft dark rim where land meets water, lighter where land meets land */
      g.save(); g.shadowColor = tid === 'void' ? 'rgba(0,0,0,0)' : (order[0] === 'water' && oi === 1 ? 'rgba(10,30,50,0.55)' : 'rgba(0,0,0,0.25)'); g.shadowBlur = ts * 0.18;
      g.drawImage(layer, 0, 0); g.restore();
    });
    /* deeper water away from the shore, as one soft shape */
    if (present.has('water')) {
      const dm = A.canvas(W, W), dg = dm.getContext('2d'); dg.fillStyle = '#000'; let any = false;
      for (let ty = -1; ty <= CH; ty++) for (let tx = -1; tx <= CH; tx++) {
        const x = cx * CH + tx, y = cy * CH + ty; if (at(x, y) !== 'water') continue;
        let shore = false; for (let dy = -2; dy <= 2 && !shore; dy++) for (let dx = -2; dx <= 2; dx++) { const t2 = at(x + dx, y + dy); if (t2 && t2 !== 'water') { shore = true; break; } }
        if (!shore) { blob(dg, tx * ts + ts / 2, ty * ts + ts / 2, ts * 1.05, x * 31 + y * 17); dg.fill(); any = true; }
      }
      if (any) { g.save(); g.globalAlpha = 0.24; g.filter = 'blur(' + Math.round(ts * 0.25) + 'px)'; g.drawImage(dm, 0, 0); g.restore(); }
    }
    /* the land is never one flat colour: broad patches of light and shade */
    if (!V._macro || V._macroLayer !== li) { V._macro = SU.noise2(V.st.seed + li * 101); V._macroLayer = li; }
    const nz = V._macro;
    { const sm = A.canvas(CH + 2, CH + 2), sg = sm.getContext('2d'), img = sg.createImageData(CH + 2, CH + 2);
      for (let ty = -1; ty <= CH; ty++) for (let tx = -1; tx <= CH; tx++) {
        const x = cx * CH + tx, y = cy * CH + ty, tid = at(x, y), o4 = ((ty + 1) * (CH + 2) + tx + 1) * 4;
        if (!tid || tid === 'water' || tid === 'void') continue;
        const v = nz.fbm(x * 0.09, y * 0.09, 3);
        if (v > 0) { img.data[o4] = 255; img.data[o4 + 1] = 240; img.data[o4 + 2] = 190; img.data[o4 + 3] = Math.round(v * 0.16 * 255); }
        else { img.data[o4] = 10; img.data[o4 + 1] = 20; img.data[o4 + 2] = 10; img.data[o4 + 3] = Math.round(-v * 0.24 * 255); }
      }
      sg.putImageData(img, 0, 0);
      g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(sm, -ts * 0.5, -ts * 0.5, (CH + 2) * ts, (CH + 2) * ts); g.restore(); }
    /* rocky ground under mountains, dark forest floor under woods (soft shapes, so ranges and forests read as places) */
    const under = (test, col, alpha) => {
      const m = A.canvas(W, W), mg = m.getContext('2d'); mg.fillStyle = col; let any = false;
      for (let ty = -1; ty <= CH; ty++) for (let tx = -1; tx <= CH; tx++) { const x = cx * CH + tx, y = cy * CH + ty; if (!S.inside(L, x, y) || !test(L.ob[y * L.w + x])) continue; any = true; blob(mg, tx * ts + ts / 2, ty * ts + ts * 0.62, ts * 0.95, x * 7 + y * 13 + 5); mg.fill(); }
      if (any) { g.save(); g.globalAlpha = alpha; g.filter = 'blur(' + Math.round(ts * 0.12) + 'px)'; g.drawImage(m, 0, 0); g.restore(); }
    };
    under(o => o === S.OB.mountain || o === S.OB.ridge, '#6a6254', 0.75);
    under(o => o === S.OB.tree || o === S.OB.pine || o === S.OB.glowtree, '#22341a', 0.45);
    /* small things: tufts, flowers, pebbles */
    const RR = SU.makeRng(cx * 7919 + cy * 104729 + li * 31);
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const x = cx * CH + tx, y = cy * CH + ty, tid = at(x, y); if (!tid || L.ob[y * L.w + x] || L.road[y * L.w + x]) continue;
      const n = tid === 'grass' ? 3 : tid === 'dirt' || tid === 'rough' || tid === 'sand' || tid === 'ash' ? 2 : tid === 'swamp' ? 2 : 0;
      for (let k = 0; k < n; k++) { if (!RR.chance(0.55)) continue; const px = tx * ts + RR.range(4, ts - 4), py = ty * ts + RR.range(6, ts - 2);
        if (tid === 'grass') { const kind = RR.next();
          if (kind < 0.6) { g.strokeStyle = RR.chance(0.5) ? 'rgba(52,86,30,0.85)' : 'rgba(120,160,70,0.8)'; g.lineWidth = Math.max(1, ts / 40); for (let b = -2; b <= 2; b++) { g.beginPath(); g.moveTo(px + b * ts * 0.02, py); g.quadraticCurveTo(px + b * ts * 0.04, py - ts * 0.06, px + b * ts * 0.06, py - ts * (0.08 + Math.abs(b) * 0.01)); g.stroke(); } }
          else if (kind < 0.8) { g.fillStyle = RR.pick(['#f1e48a', '#ffffff', '#e8a0c8', '#b5a0ff', '#ffb070']); for (let f = 0; f < 3; f++) { A.ell(g, px + RR.range(-4, 4) * ts / 48, py + RR.range(-2, 2) * ts / 48, ts * 0.022, ts * 0.022); g.fill(); } }
          else { g.fillStyle = 'rgba(120,114,100,0.9)'; A.ell(g, px, py, ts * 0.045, ts * 0.03); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; A.ell(g, px + ts * 0.01, py + ts * 0.02, ts * 0.045, ts * 0.015); g.fill(); } }
        else if (tid === 'swamp') { g.strokeStyle = 'rgba(110,130,60,0.8)'; g.lineWidth = Math.max(1, ts / 44); for (let b = -1; b <= 1; b++) { g.beginPath(); g.moveTo(px + b * 2, py); g.lineTo(px + b * 3, py - ts * 0.14); g.stroke(); } }
        else { g.fillStyle = tid === 'ash' ? 'rgba(40,30,26,0.7)' : 'rgba(90,80,64,0.55)'; A.ell(g, px, py, ts * 0.035, ts * 0.024); g.fill(); }
      }
    }
    /* roads: cobbled paths between neighbouring road tiles */
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) for (let ty = -1; ty <= CH; ty++) for (let tx = -1; tx <= CH; tx++) {
      const x = cx * CH + tx, y = cy * CH + ty; if (!S.inside(L, x, y) || !L.road[y * L.w + x]) continue;
      const px = tx * ts + ts / 2, py = ty * ts + ts / 2;
      g.strokeStyle = pass === 0 ? '#5a4a34' : '#a08a64'; g.lineWidth = ts * (pass === 0 ? 0.42 : 0.3);
      [[1, 0], [0, 1], [1, 1], [-1, 1]].forEach(([dx, dy]) => { const xx = x + dx, yy = y + dy; if (S.inside(L, xx, yy) && L.road[yy * L.w + xx]) { if (dx && dy && (L.road[y * L.w + xx] || L.road[yy * L.w + x])) return; g.beginPath(); g.moveTo(px, py); g.lineTo(px + dx * ts, py + dy * ts); g.stroke(); } });
      g.beginPath(); g.arc(px, py, g.lineWidth / 2, 0, Math.PI * 2); g.fillStyle = g.strokeStyle; g.fill();
    }
    /* cobbles */
    const R = SU.makeRng(cx * 31 + cy * 17 + li);
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) { const x = cx * CH + tx, y = cy * CH + ty; if (!S.inside(L, x, y) || !L.road[y * L.w + x]) continue;
      for (let k = 0; k < 5; k++) { g.fillStyle = A.rgba(R.chance(0.5) ? '#c9b48a' : '#7a6a4a', 0.6); A.ell(g, tx * ts + ts / 2 + R.range(-ts * 0.15, ts * 0.15), ty * ts + ts / 2 + R.range(-ts * 0.15, ts * 0.15), ts * 0.04, ts * 0.03); g.fill(); } }
    return c;
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
    ctx.fillStyle = V.layer === 3 ? '#030308' : '#0b1a2a'; ctx.fillRect(0, 0, V.w, V.h);
    if (V.layer === 3) drawStars(ctx, t);
    const x0 = Math.floor(V.cam.x - V.w / 2 / ts) - 1, y0 = Math.floor(V.cam.y - V.h / 2 / ts) - 1;
    const x1 = Math.ceil(V.cam.x + V.w / 2 / ts) + 1, y1 = Math.ceil(V.cam.y + V.h / 2 / ts) + 3;
    const ox = V.w / 2 - V.cam.x * ts, oy = V.h / 2 - V.cam.y * ts;
    /* ground */
    for (let cy = Math.max(0, Math.floor(y0 / CH)); cy <= Math.min(Math.floor((L.h - 1) / CH), Math.floor(y1 / CH)); cy++)
      for (let cx = Math.max(0, Math.floor(x0 / CH)); cx <= Math.min(Math.floor((L.w - 1) / CH), Math.floor(x1 / CH)); cx++)
        ctx.drawImage(chunk(V.layer, cx, cy), Math.round(ox + cx * CH * ts), Math.round(oy + cy * CH * ts));
    /* water shimmer */
    ctx.strokeStyle = 'rgba(200,235,255,0.16)'; ctx.lineWidth = 1;
    for (let y = Math.max(0, y0); y <= Math.min(L.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(L.w - 1, x1); x++) {
      const i = y * L.w + x; if (L.t[i] !== S.TC.water || (x * 7 + y * 13) % 3) continue;
      const ph = (t * 0.6 + (L.v[i] / 255) * 6) % 6; if (ph > 2) continue;
      const px = ox + x * ts + ts * 0.2 + ph * ts * 0.15, py = oy + y * ts + ts * (0.3 + (L.v[i] % 5) * 0.1);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + ts * 0.15, py - ts * 0.06, px + ts * 0.3, py); ctx.stroke();
    }
    /* reachable path preview, under everything that stands up */
    drawPath(ctx, ox, oy, ts, t);
    /* things that stand up, row by row */
    const P = st.players[V.viewer()], E = P.explored[V.layer];
    const seen = (x, y) => S.inside(L, x, y) && E[y * L.w + x];
    const rows = {};
    const add = (y, fn) => { (rows[y] = rows[y] || []).push(fn); };
    for (let y = Math.max(0, y0); y <= Math.min(L.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(L.w - 1, x1); x++) {
      const ob = L.ob[y * L.w + x]; if (!ob || !seen(x, y)) continue;
      const sp = A.obstacle(S.OB_NAMES[ob], L.v[y * L.w + x], ts);
      add(y, () => ctx.drawImage(sp.c, Math.round(ox + x * ts - sp.ox), Math.round(oy + y * ts - sp.oy)));
    }
    Object.values(st.objects).forEach(o => {
      if (o.layer !== V.layer || o.gone || o.hidden || o.x < x0 - 3 || o.x > x1 + 3 || o.y < y0 || o.y > y1 + 3) return;
      if (!seen(o.x, o.y) && !(o.type === 'town' && seen(o.x, o.y - 1))) return;
      add(o.y, () => A.object(ctx, st, o, ox + o.x * ts, oy + o.y * ts, ts, t));
    });
    Object.values(st.armies).forEach(a => {
      if (a.dead || a.layer !== V.layer || a.x < x0 || a.x > x1 || a.y < y0 || a.y > y1 || a.temp) return;
      if (!seen(a.x, a.y)) return;
      let ax = a.x, ay = a.y;
      if (V.anim && V.anim.army === a.id) { ax = V.anim.fx; ay = V.anim.fy; }
      add(Math.ceil(ay), () => drawArmy(ctx, a, ox + ax * ts, oy + ay * ts, ts, t));
    });
    Object.keys(rows).map(Number).sort((a, b) => a - b).forEach(y => rows[y].forEach(fn => fn()));
    /* the storm */
    drawStorm(ctx, ox, oy, ts, t);
    /* fog */
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const fc = fogCanvas();
    ctx.drawImage(fc, 0, 0, fc.width, fc.height, ox - ts, oy - ts, fc.width * ts, fc.height * ts);
    /* hover */
    if (V.hover && S.inside(L, V.hover.x, V.hover.y)) { ctx.strokeStyle = 'rgba(255,236,190,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(ox + V.hover.x * ts + 1, oy + V.hover.y * ts + 1, ts - 2, ts - 2); }
    drawMini();
  }
  function drawStars(ctx, t) {
    if (!V.stars) { const R = SU.makeRng(5); V.stars = []; for (let i = 0; i < 220; i++) V.stars.push([R.next(), R.next(), R.range(0.3, 1.4), R.next() * 6]); }
    V.stars.forEach(([x, y, r, p]) => { ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + Math.sin(t + p) * 0.3) + ')'; ctx.beginPath(); ctx.arc(x * V.w, y * V.h, r, 0, Math.PI * 2); ctx.fill(); });
  }
  function drawArmy(ctx, a, px, py, ts, t) {
    const st = V.st, cx = px + ts / 2, gy = py + ts * 0.86, col = S.color(st, a.owner);
    const h = S.heroOf(st, a), sel = SU.ui && SU.ui.selected === a.id;
    if (sel) { ctx.strokeStyle = 'rgba(255,230,150,' + (0.6 + Math.sin(t * 4) * 0.3) + ')'; ctx.lineWidth = 2; A.ell(ctx, cx, gy, ts * 0.42, ts * 0.16); ctx.stroke(); }
    if (a.boat) { A.boat(ctx, a, px, py - ts * 0.1, ts, t, col); }
    if (h) { const moving = V.anim && V.anim.army === a.id; A.mountedHero(ctx, cx, gy - (a.boat ? ts * 0.25 : 0), ts * 0.78, Object.assign({ moving }, h), col, t, a.face || 1); }
    else if (a.wild) {
      const stacks = S.stacksIn(a.slots).filter(s => s.n > 0).sort((p, q) => D.CREATURES[q.cr].tier - D.CREATURES[p.cr].tier);
      const c = stacks[0] && D.CREATURES[stacks[0].cr];
      if (c) { const big = c.tier >= 7 ? 0.95 : c.tier >= 4 ? 0.85 : 0.75; A.creature(ctx, c.art, cx, gy, ts * big, { t: t + a.x, f: (a.x + a.y) % 2 ? 1 : -1, tint: c.tint || (c.upgraded ? 1 : 0) }); }
      if (a.herd) { ctx.fillStyle = 'rgba(160,220,120,0.9)'; ctx.font = 'bold ' + Math.round(ts * 0.26) + 'px Georgia'; ctx.textAlign = 'center'; ctx.fillText('♣', cx + ts * 0.32, py + ts * 0.25); }
    } else {
      const cap = S.captainsIn(S.slotsOf(st, a))[0];
      if (cap) A.captain(ctx, cx, gy, ts * 0.62, cap, col, t, a.face || 1);
      A.flag(ctx, cx + ts * 0.2, gy - ts * 0.1, ts * 0.32, col, t);
    }
    if (a.owner >= 0 && !a.wild) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx - ts * 0.38, py + ts * 0.98); ctx.lineTo(cx + ts * 0.38, py + ts * 0.98); ctx.lineTo(cx + ts * 0.3, py + ts * 1.04); ctx.lineTo(cx - ts * 0.3, py + ts * 1.04); ctx.fill(); }
  }
  function drawPath(ctx, ox, oy, ts, t) {
    const p = V.path; if (!p || !p.steps || p.layer !== V.layer) return;
    let mp = p.mp;
    p.steps.forEach((s, i) => {
      mp -= s.cost; const ok = mp >= 0 || i === 0 && p.mp === p.mpMax;
      const cx = ox + s.x * ts + ts / 2, cy = oy + s.y * ts + ts / 2;
      const last = i === p.steps.length - 1;
      ctx.fillStyle = ok ? 'rgba(120,230,110,0.85)' : 'rgba(230,90,70,0.85)';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
      if (last) { ctx.beginPath(); ctx.arc(cx, cy, ts * 0.17, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); if (p.target) { ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(ts * 0.26) + 'px Georgia'; ctx.textAlign = 'center'; ctx.fillText(p.target === 'battle' ? '⚔' : p.target === 'visit' ? '✦' : p.target === 'meet' ? '⇄' : '', cx, cy + ts * 0.09); } }
      else { const n = p.steps[i + 1]; const a = Math.atan2(n.y - s.y, n.x - s.x); ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(ts * 0.14, 0); ctx.lineTo(-ts * 0.08, -ts * 0.09); ctx.lineTo(-ts * 0.08, ts * 0.09); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    });
  }
  function drawStorm(ctx, ox, oy, ts, t) {
    const s = V.st.storm; if (!s || s.layer !== V.layer) return;
    const E = V.st.players[V.viewer()].explored[V.layer];
    const cx = ox + (s.x + 0.5) * ts, cy = oy + (s.y + 0.5) * ts, r = s.r * ts;
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, s.eye * ts, cx, cy, r);
    g.addColorStop(0, 'rgba(30,40,70,0)'); g.addColorStop(0.15, 'rgba(30,40,70,0.45)'); g.addColorStop(0.85, 'rgba(25,35,60,0.35)'); g.addColorStop(1, 'rgba(25,35,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    /* the spiral arms of the Waves of Memory */
    ctx.strokeStyle = 'rgba(170,200,240,0.22)'; ctx.lineWidth = ts * 0.12; ctx.lineCap = 'round';
    for (let arm = 0; arm < 4; arm++) { ctx.beginPath(); for (let k = 0; k < 60; k++) { const u = k / 60, a = arm * Math.PI / 2 + u * 5 - t * 0.35, rr = s.eye * ts + u * (r - s.eye * ts); const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.9; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
    /* rain */
    ctx.strokeStyle = 'rgba(190,215,255,0.35)'; ctx.lineWidth = 1;
    const R = SU.makeRng(17);
    for (let i = 0; i < 160; i++) { const a = R.next() * Math.PI * 2, d = Math.sqrt(R.next()) * r; if (d < s.eye * ts) continue; const px = cx + Math.cos(a) * d, py0 = cy + Math.sin(a) * d * 0.9; const py = py0 + ((t * 300 + i * 37) % (ts * 2)) - ts; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 3, py + 9); ctx.stroke(); }
    /* the eye: calm, lit from within */
    const eg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s.eye * ts * 1.4);
    eg.addColorStop(0, 'rgba(255,245,210,0.35)'); eg.addColorStop(1, 'rgba(255,245,210,0)');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, cy, s.eye * ts * 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,200,' + (0.4 + Math.sin(t * 2) * 0.2) + ')'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, s.eye * ts, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    /* lightning now and then */
    const fl = (t * 0.7) % 7; if (fl < 0.12) { ctx.strokeStyle = 'rgba(230,240,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); let px = cx + R.range(-r, r) * 0.6, py = cy - r * 0.6; ctx.moveTo(px, py); for (let k = 0; k < 6; k++) { px += R.range(-ts, ts); py += ts * 0.8; ctx.lineTo(px, py); } ctx.stroke(); }
    ctx.restore();
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
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const i = y * L.w + x; if (!E[i]) continue; cg.fillStyle = L.ob[i] === S.OB.mountain ? '#6a655a' : L.ob[i] && L.ob[i] !== S.OB.rock ? A.shade(MINI_COL[S.TCODES[L.t[i]]], -25) : MINI_COL[S.TCODES[L.t[i]]]; cg.fillRect(offx + x * sc, offy + y * sc, Math.ceil(sc), Math.ceil(sc)); }
      Object.values(st.objects).forEach(o => { if (o.layer !== V.layer || !E[o.y * L.w + o.x]) return; if (o.type === 'town' || o.type === 'mine') { cg.fillStyle = S.color(st, o.owner); const r = o.type === 'town' ? 2.6 : 1.6; cg.fillRect(offx + (o.x - (o.type === 'town' ? 1 : 0.5)) * sc, offy + (o.y - (o.type === 'town' ? 1.5 : 0.5)) * sc, r * sc, r * sc); } if (o.type === 'urverk') { cg.fillStyle = '#c9b8ff'; cg.fillRect(offx + o.x * sc, offy + o.y * sc, 1.5 * sc, 1.5 * sc); } });
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
      else if (o.type === 'mine') { g.fillStyle = o.owner >= 0 && st.players[o.owner] ? st.players[o.owner].color : '#9a9078'; g.fillRect(offx + (o.x - 0.5) * sc, offy + (o.y - 0.5) * sc, Math.max(2, 1.6 * sc), Math.max(2, 1.6 * sc)); }
      else if (o.type === 'urverk') { g.fillStyle = '#c9b8ff'; g.fillRect(offx + o.x * sc, offy + o.y * sc, Math.max(2, 1.5 * sc), Math.max(2, 1.5 * sc)); } });
    return c;
  };
  V.miniClick = function (mx, my) { const m = V.miniMap; if (!m) return; V.cam.x = (mx - m.offx) / m.sc; V.cam.y = (my - m.offy) / m.sc; };
  V.invalidate = function () { V.miniCache = null; };

  /* ======================= movement animation ======================= */
  /* walk an army along steps, calling onStep(x,y) for each; resolves when it stops */
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
    an.t += dt / (SU.ui && SU.ui.fast ? 60 : 130);
    const k = Math.min(1, an.t);
    an.fx = SU.lerp(an.from[0], an.to[0], k); an.fy = SU.lerp(an.from[1], an.to[1], k);
    const a = V.st.armies[an.army];
    if (a && a.owner === V.viewer()) { V.cam.x += (an.fx + 0.5 - V.cam.x) * 0.15; V.cam.y += (an.fy + 0.5 - V.cam.y) * 0.15; }
    if (k >= 1) { an.fx = an.to[0]; an.fy = an.to[1]; an.to = null; nextStep(); }
  }

  /* ======================= input ======================= */
  function bindInput() {
    const cv = V.cv; let drag = null, moved = false;
    let paintLast = null;
    cv.addEventListener('mousedown', e => {
      drag = { x: e.clientX, y: e.clientY, cx: V.cam.x, cy: V.cam.y, btn: e.button }; moved = false;
      if (V.paintMode && e.button === 0) { const r = cv.getBoundingClientRect(); const tt = V.screenToTile(e.clientX - r.left, e.clientY - r.top); paintLast = tt.x + ',' + tt.y; drag.paint = true; SU.emit('mappaint', { x: tt.x, y: tt.y, first: true }); }
    });
    window.addEventListener('mousemove', e => {
      const r = cv.getBoundingClientRect();
      if (drag && drag.paint) { const r = cv.getBoundingClientRect(); const tt = V.screenToTile(e.clientX - r.left, e.clientY - r.top); const k = tt.x + ',' + tt.y; if (k !== paintLast) { paintLast = k; SU.emit('mappaint', { x: tt.x, y: tt.y, first: false }); } }
      else if (drag && (drag.btn === 0 || (drag.btn === 2 && V.paintMode))) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 6) moved = true; if (moved) { V.cam.x = drag.cx - dx / V.ts; V.cam.y = drag.cy - dy / V.ts; } }
      if (e.target === cv) { const tt = V.screenToTile(e.clientX - r.left, e.clientY - r.top); if (!V.hover || tt.x !== V.hover.x || tt.y !== V.hover.y) { V.hover = tt; SU.emit('hover', tt); } }
    });
    window.addEventListener('mouseup', e => {
      if (!drag) return; const was = drag; drag = null;
      if (moved || was.paint) return;
      const r = cv.getBoundingClientRect(); if (e.target !== cv) return;
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
    cv.addEventListener('touchend', e => { if (!tch) return; const t = tch; tch = null; if (t.moved) return; const r = cv.getBoundingClientRect(); const tt = V.screenToTile(t.x - r.left, t.y - r.top);
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
