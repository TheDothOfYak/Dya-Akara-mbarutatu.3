// 4 Brothers World V3 — part 12: realistic lighting in Rock World.
//  * Smooth light: the light grid is blown up in two cheap bilinear steps (2x then 4x), so light fades softly instead of in squares.
//  * Coloured light: torches, crystals and glowstones tint the rock their colour (the light grid is coloured).
//  * Block shading: faces of blocks that look toward the light are lit, faces turned away are dark, and rock deep inside
//    a wall fades into shadow; air beside walls gets soft corner shadows (ambient occlusion).
//  * Shadows: heroes, monsters, townsfolk and the Leviathan's head drop soft shadows on the floor, pushed away from the light.
//  * Settings > Lighting: "Fancy lighting" (on by default). If the game drops below 45 fps for a while it turns itself down
//    (first shading and shadows, then smoothing) and says so.
(function (RW) {
  'use strict';
  const WD = RW.world, E = RW.ent, P = RW.player, U = RW.ui, TS = RW.TILE;
  if (!WD || !E) return;
  const KEY = 'v3_fancylight';
  let pref = RW.store ? RW.store.get(KEY, true) !== false : true, level = 2; // 2 full, 1 smooth only, 0 off
  const on = () => pref && level > 0 && WD.def && WD.def.id === 'rock';
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d'); return c; };
  const SUB = 2;
  let A1 = mk(4, 4), A2 = mk(4, 4), SH = mk(4, 4), HL = mk(4, 4), shImg = null, hlImg = null, frame = 0;

  // ---------------- smooth, coloured light (replaces the light picture the base game draws) ----------------
  const baseDrawLight = WD.drawLight;
  WD.drawLight = function (g, cam) {
    if (!on()) return baseDrawLight.apply(this, arguments);
    try { if (level >= 2) shade(g, cam); } catch (e) { /* only a look */ }
    const raw = g.drawImage; let caught = false;
    g.drawImage = function (img, x, y, w, h) {
      if (!caught && arguments.length === 5 && img && img.width < 400) {
        caught = true;
        // two cheap bilinear steps (2x, then 4x) instead of a blur filter: soft, and quick
        const W1 = img.width * 2, H1 = img.height * 2, W2 = img.width * 4, H2 = img.height * 4;
        if (A1.width !== W1 || A1.height !== H1) { A1 = mk(W1, H1); A2 = mk(W2, H2); }
        A1.ctx.imageSmoothingEnabled = true; A1.ctx.drawImage(img, 0, 0, W1, H1);
        A2.ctx.imageSmoothingEnabled = true; A2.ctx.drawImage(A1, 0, 0, W2, H2);
        g.imageSmoothingEnabled = true; raw.call(this, A2, x, y, w, h);
        return;
      }
      return raw.apply(this, arguments);
    };
    try { return baseDrawLight.apply(this, arguments); } finally { g.drawImage = raw; }
  };

  // ---------------- block shading and corner shadows ----------------
  const solidAt = (x, y) => { const t = RW.TILES[WD.get(x, y)]; return !!(t && t.solid && !t.decor); };
  const L = (x, y) => (WD.lightAt ? WD.lightAt(x * TS + 8, y * TS + 8) : 0.5);
  function shade(g, cam) {
    const tx0 = Math.floor(cam.x / TS) - 1, ty0 = Math.floor(cam.y / TS) - 1, tw = Math.ceil(RW.view.w / TS) + 3, th = Math.ceil(RW.view.h / TS) + 3;
    const W2 = tw * SUB, H2 = th * SUB;
    if (SH.width !== W2 || SH.height !== H2) { SH = mk(W2, H2); HL = mk(W2, H2); shImg = SH.ctx.createImageData(W2, H2); hlImg = HL.ctx.createImageData(W2, H2); frame = 0; }
    if ((frame++ % 3) === 0 || SH.__x !== tx0 || SH.__y !== ty0) {
      SH.__x = tx0; SH.__y = ty0;
      const s = shImg.data, h = hlImg.data; s.fill(255); for (let i = 3; i < h.length; i += 4) h[i] = 0;
      const put = (px, py, v, hl) => { if (px < 0 || py < 0 || px >= W2 || py >= H2) return; const o = (py * W2 + px) * 4; const m = Math.max(0, Math.min(255, Math.round(255 * v))); if (m < s[o]) { s[o] = s[o + 1] = s[o + 2] = m; } if (hl) { h[o] = 255; h[o + 1] = 245; h[o + 2] = 225; h[o + 3] = Math.max(h[o + 3], Math.round(hl * 255)); } };
      for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) {
        const x = tx0 + i, y = ty0 + j; if (!WD.inb(x, y)) continue;
        const sol = solidAt(x, y), bx = i * SUB, by = j * SUB;
        if (sol) {
          const up = !solidAt(x, y - 1), dn = !solidAt(x, y + 1), lf = !solidAt(x - 1, y), rt = !solidAt(x + 1, y);
          if (!up && !dn && !lf && !rt) { // inside a wall: the deeper, the darker
            let near = 3; for (let r = 2; r <= 3 && near === 3; r++) for (let dy = -r; dy <= r && near === 3; dy++) for (let dx = -r; dx <= r; dx++) if (!solidAt(x + dx, y + dy)) { near = r - 1; break; }
            const v = [0.82, 0.68, 0.55][Math.min(2, near)];
            for (let a = 0; a < SUB; a++) for (let b = 0; b < SUB; b++) put(bx + a, by + b, v); continue;
          }
          // faces toward the light get a rim of light, faces away a band of shade
          const lc = L(x, y), lu = up ? L(x, y - 1) : 0, ld = dn ? L(x, y + 1) : 0, ll = lf ? L(x - 1, y) : 0, lr = rt ? L(x + 1, y) : 0, mx = Math.max(lu, ld, ll, lr, 0.001);
          const face = (open, lv, fn) => { if (!open) return; const k = lv / mx; for (let a = 0; a < SUB; a++) { if (k > 0.75 && lv > 0.12) fn(a, 0, 1, Math.min(0.5, (lv - 0.08) * 0.8)); else fn(a, 0, 0.78, 0); fn(a, 1, k > 0.75 ? 0.97 : 0.86, 0); } };
          face(up, lu, (a, d, v, hl) => put(bx + a, by + d, v, hl));
          face(dn, ld, (a, d, v, hl) => put(bx + a, by + SUB - 1 - d, v * 0.96, hl * 0.6));
          face(lf, ll, (a, d, v, hl) => put(bx + d, by + a, v, hl));
          face(rt, lr, (a, d, v, hl) => put(bx + SUB - 1 - d, by + a, v, hl));
          if (lc < 0.04) for (let a = 0; a < SUB; a++) for (let b = 0; b < SUB; b++) put(bx + a, by + b, 0.86);
        } else {
          // air: soft shadow in corners where walls meet
          const u = solidAt(x, y - 1), d = solidAt(x, y + 1), l = solidAt(x - 1, y), r = solidAt(x + 1, y);
          const ul = solidAt(x - 1, y - 1), ur = solidAt(x + 1, y - 1), dl = solidAt(x - 1, y + 1), dr = solidAt(x + 1, y + 1);
          for (let a = 0; a < SUB; a++) for (let b = 0; b < SUB; b++) {
            const fx = (a + 0.5) / SUB, fy = (b + 0.5) / SUB; let v = 1;
            if (u) v -= 0.16 * (1 - fy); if (d) v -= 0.22 * fy; if (l) v -= 0.14 * (1 - fx); if (r) v -= 0.14 * fx;
            if (ul && !u && !l) v -= 0.1 * Math.max(0, 1 - Math.hypot(fx, fy) * 1.6); if (ur && !u && !r) v -= 0.1 * Math.max(0, 1 - Math.hypot(1 - fx, fy) * 1.6);
            if (dl && !d && !l) v -= 0.12 * Math.max(0, 1 - Math.hypot(fx, 1 - fy) * 1.6); if (dr && !d && !r) v -= 0.12 * Math.max(0, 1 - Math.hypot(1 - fx, 1 - fy) * 1.6);
            if (v < 1) put(bx + a, by + b, v);
          }
        }
      }
      SH.ctx.putImageData(shImg, 0, 0); HL.ctx.putImageData(hlImg, 0, 0);
    }
    const dx = tx0 * TS - cam.x, dy = ty0 * TS - cam.y;
    g.save(); g.imageSmoothingEnabled = true;
    g.globalCompositeOperation = 'multiply'; g.drawImage(SH, dx, dy, tw * TS, th * TS);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(HL, dx, dy, tw * TS, th * TS);
    g.restore();
  }

  // ---------------- soft shadows on the floor, pushed away from the light ----------------
  const baseTiles = WD.drawTiles;
  WD.drawTiles = function (g, cam) {
    const r = baseTiles.apply(this, arguments);
    if (on() && level >= 2) try { shadows(g, cam); } catch (e) { /* only a look */ }
    return r;
  };
  function floorBelow(x, y) { const tx = Math.floor(x / TS); let ty = Math.floor(y / TS); for (let k = 0; k < 7; k++, ty++) if (solidAt(tx, ty)) return ty * TS; return null; }
  function dropShadow(g, cam, x, yFeet, w, hgt) {
    const fy = floorBelow(x, yFeet); if (fy == null) return;
    const lift = Math.max(0, fy - yFeet), k = Math.max(0, 1 - lift / 90); if (k <= 0) return;
    const tx = Math.floor(x / TS), ty = Math.floor(fy / TS) - 1, gl = L(tx - 2, ty), gr = L(tx + 2, ty), lv = Math.max(gl, gr, L(tx, ty));
    const push = RW.clamp((gl - gr) * 40, -14, 14), stretch = 1 + Math.min(1.2, Math.abs(gl - gr) * 6);
    const cx = x - cam.x + push * 0.5, cy = fy - cam.y, rx = w * 0.6 * stretch * (0.7 + 0.3 * k), ry = Math.max(1.5, 2.6 * k);
    const a = 0.45 * k * Math.min(1, 0.4 + lv * 2.2);
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, rx); grd.addColorStop(0, 'rgba(0,0,0,' + a + ')'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.translate(cx, cy); g.scale(1, ry / rx); g.translate(-cx, -cy); g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, rx, 0, 6.283); g.fill(); g.restore();
  }
  function shadows(g, cam) {
    const vis = (x, y) => x > cam.x - 40 && x < cam.x + RW.view.w + 40 && y > cam.y - 40 && y < cam.y + RW.view.h + 60;
    if (RW.game && RW.game.playing && !P.dead) dropShadow(g, cam, P.x + 6, P.y + P.h, 16 * (P.scale ? P.scale() : 1), P.h);
    if (RW.net && RW.net.peers) RW.net.peers.forEach((p) => { if (p.target && p.target.w === WD.def.id && vis(p.x, p.y)) dropShadow(g, cam, p.x + 6, p.y + 28, 16, 28); });
    let n = 0; E.enemies.forEach((e) => { if (n < 12 && !e.dead && vis(e.x, e.y)) { n++; dropShadow(g, cam, e.x + e.w / 2, e.y + e.h, Math.max(10, e.w), e.h); } });
    (E.npcs || []).forEach((n) => { if (vis(n.x, n.y)) dropShadow(g, cam, n.x + n.w / 2, n.y + n.h, Math.max(10, n.w), n.h); });
    const b = E.boss; if (b && !b.dead && vis(b.x, b.y)) dropShadow(g, cam, b.x + b.w / 2, b.y + b.h, b.w, b.h);
  }

  // ---------------- settings and the automatic turn-down ----------------
  const baseOpts = U.renderOpts;
  if (baseOpts) U.renderOpts = function () {
    const r = baseOpts.apply(this, arguments);
    try {
      const box = document.getElementById('optbody'); if (!box) return r;
      const h = document.createElement('div'); h.className = 'label opt-h'; h.textContent = 'Lighting';
      const row = document.createElement('label'); row.className = 'opt-row'; const t = document.createElement('span'); t.textContent = 'Fancy lighting in Rock World: smooth coloured light, shaded blocks and soft shadows' + (pref && level < 2 ? ' (turned down to keep the game smooth)' : '');
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = pref;
      cb.onchange = () => { pref = cb.checked; level = 2; slow = 0; if (RW.store) RW.store.set(KEY, pref); U.toast(pref ? 'Fancy lighting on.' : 'Fancy lighting off.'); };
      row.append(t, cb);
      const first = box.querySelector('.opt-h'); const after = first && first.nextElementSibling;
      if (after) { after.after(h); h.after(row); } else box.prepend(h, row);
    } catch (e) { /* settings still work without it */ }
    return r;
  };
  let lastT = 0, avg = 60, slow = 0, told = false;
  const tick = (t) => {
    if (lastT) { const dt = Math.min(0.25, (t - lastT) / 1000); if (dt > 0) avg = avg * 0.95 + (1 / dt) * 0.05; }
    lastT = t;
    if (on() && RW.game && RW.game.playing && !document.hidden) {
      if (avg < 45) slow += 1 / 60; else slow = Math.max(0, slow - 1 / 120);
      if (slow > 3 && level > 0) { level--; slow = 0; avg = 60; if (!told) { told = true; U.toast('Lighting turned down to keep the game smooth. You can switch it in Settings.'); } }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  RW.v3light = { get level() { return level; }, set level(v) { level = v; }, get pref() { return pref; } };
})(window.RW);
