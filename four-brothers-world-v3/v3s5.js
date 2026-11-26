// 4 Brothers World V3 — part 5: sharper heroes, armour, tools and effects.
//  * Every hero, monster, villager and dropped item is drawn from a doubled-up copy of its pixel art (the Scale2x
//    method: each pixel becomes four, and diagonal edges are smoothed), so outlines are finer on the new screen.
//  * Armour reads as metal: a bright top edge, a dark lower rim and a row of rivets on every plate, on top of the
//    armour's colour.
//  * Weapons and tools in your hand are painted fresh at twice the detail: polished blades with a fuller and an edge
//    highlight, wrapped grips and crossguards, picks, axes, hammers, maces, clubs and spears with real heads.
//    (Bows, staffs and the rest use the smoothed copy.) Swings leave a curved trail in the weapon's colour.
//  * Effects: glows are soft round lights instead of squares, sparks streak, lightning bolts have a wide halo and a
//    hot core, and rings fade from a bright edge.
(function (RW) {
  'use strict';
  const E = RW.ent, A = RW.art, FX = RW.fx, P = RW.player;
  if (!E || !A || !FX) return;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d'); c.ctx.imageSmoothingEnabled = false; return c; };

  // ================================= 1. Scale2x =================================
  const big = new WeakMap();
  function scale2x(src) {
    let c = big.get(src); if (c) return c;
    const w = src.width, h = src.height; let d;
    try { d = new Uint32Array(src.getContext('2d').getImageData(0, 0, w, h).data.buffer); } catch (e) { return null; }
    c = mk(w * 2, h * 2); const out = c.ctx.createImageData(w * 2, h * 2), o = new Uint32Array(out.data.buffer);
    const at = (x, y) => d[RW.clamp(y, 0, h - 1) * w + RW.clamp(x, 0, w - 1)];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = d[y * w + x], a = at(x, y - 1), b = at(x + 1, y), cc = at(x - 1, y), dd = at(x, y + 1);
      let e0 = p, e1 = p, e2 = p, e3 = p;
      if (a !== dd && cc !== b) { if (cc === a) e0 = a; if (a === b) e1 = b; if (cc === dd) e2 = cc; if (dd === b) e3 = b; }
      const i = (y * 2) * (w * 2) + x * 2; o[i] = e0; o[i + 1] = e1; o[i + w * 2] = e2; o[i + w * 2 + 1] = e3;
    }
    if (src.__armor) metal(out.data, w * 2, h * 2, src.__armor);
    c.ctx.putImageData(out, 0, 0);
    big.set(src, c); return c;
  }
  // plates: lit top edge, dark rim, rivets, inside the armour bands of a dressed frame
  function metal(px, W2, H2, bands) {
    const op = (x, y) => x >= 0 && y >= 0 && x < W2 && y < H2 && px[(y * W2 + x) * 4 + 3] > 40;
    const mul = (x, y, k, add) => { const i = (y * W2 + x) * 4; px[i] = RW.clamp(px[i] * k + (add || 0), 0, 255); px[i + 1] = RW.clamp(px[i + 1] * k + (add || 0), 0, 255); px[i + 2] = RW.clamp(px[i + 2] * k + (add || 0), 0, 255); };
    bands.forEach(([y0, y1]) => {
      const a = y0 * 2, b = y1 * 2;
      for (let x = 0; x < W2; x++) {
        let top = -1, bot = -1; for (let y = a; y <= b; y++) if (op(x, y)) { if (top < 0) top = y; bot = y; }
        if (top < 0) continue;
        mul(x, top, 1.35, 18); if (top + 1 <= bot) mul(x, top + 1, 1.15, 6);
        mul(x, bot, 0.6); if (bot - 1 > top + 1) mul(x, bot - 1, 0.8);
        const ry = top + Math.round((bot - top) * 0.4);
        if (x % 5 === 2 && op(x - 1, ry) && op(x + 1, ry)) { mul(x, ry, 1.5, 30); mul(x, ry + 1, 0.7); }
      }
    });
  }
  // dressed frames carry where their armour sits
  const baseDressed = A.dressed;
  A.dressed = function (species, look, armor) {
    const fr = baseDressed.apply(this, arguments);
    const head = armor && RW.ITEMS[armor[0]], body = armor && RW.ITEMS[armor[1]];
    if ((head || body) && fr && !fr.__v3) {
      fr.__v3 = true;
      fr.forEach((pair) => pair.forEach((c) => {
        if (!c || c.__armor) return;
        let t0 = c.height, b0 = 0; try { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 40) { t0 = Math.min(t0, y); b0 = Math.max(b0, y); } } catch (e) { return; }
        const h = b0 - t0 + 1, bands = [];
        if (head) bands.push([t0, t0 + Math.round(h * 0.34)]);
        if (body) bands.push([t0 + Math.round(h * 0.46), t0 + Math.round(h * 0.86)]);
        c.__armor = bands;
      }));
    }
    return fr;
  };

  // ================================= 2. tools painted at twice the detail =================================
  const baseIcon = A.icon;
  A.icon = function (id) { const c = baseIcon.apply(this, arguments); if (c && !c.__iconId) c.__iconId = id; return c; };
  const hdIcons = {};
  function metalGrad(g, x0, y0, x1, y1, col) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, RW.shade(col, 0.55)); gr.addColorStop(0.45, RW.shade(col, 0.15)); gr.addColorStop(0.55, RW.shade(col, -0.15)); gr.addColorStop(1, RW.shade(col, -0.45)); return gr; }
  function grip(g, len, col) {
    g.fillStyle = '#0c0a10'; g.fillRect(-1, -2.2, len + 1, 4.4);
    g.fillStyle = col; g.fillRect(0, -1.6, len, 3.2);
    g.fillStyle = RW.shade(col, -0.4); for (let x = 1; x < len; x += 2.2) { g.beginPath(); g.moveTo(x, -1.6); g.lineTo(x + 1.2, 1.6); g.lineTo(x + 0.4, 1.6); g.lineTo(x - 0.8, -1.6); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, -1.4, len, 0.6);
  }
  function hdIcon(id) {
    if (hdIcons[id] !== undefined) return hdIcons[id];
    const it = RW.ITEMS[id]; let c = null;
    if (it && it.icon && it.kind === 'weapon') {
      const s = it.icon.s, a = it.icon.a, b = it.icon.b || '#6b5a48';
      c = mk(32, 32); const g = c.ctx; g.imageSmoothingEnabled = true;
      g.translate(5, 27); g.rotate(-Math.PI / 4); // grip at the bottom left, pointing up and right
      const ok = {
        sword() { grip(g, 9, b); g.fillStyle = '#0c0a10'; g.beginPath(); g.arc(-1, 0, 2.8, 0, 6.283); g.fill(); g.fillStyle = RW.shade(a, -0.1); g.beginPath(); g.arc(-1, 0, 2, 0, 6.283); g.fill();
          g.fillStyle = '#0c0a10'; g.fillRect(8, -6, 3.6, 12); g.fillStyle = metalGrad(g, 0, -6, 0, 6, RW.shade(a, -0.2)); g.fillRect(8.6, -5.4, 2.4, 10.8);
          g.fillStyle = '#0c0a10'; g.beginPath(); g.moveTo(11, -3.2); g.lineTo(33, -2); g.lineTo(37, 0); g.lineTo(33, 2); g.lineTo(11, 3.2); g.fill();
          g.fillStyle = metalGrad(g, 0, -2.6, 0, 2.6, a); g.beginPath(); g.moveTo(11.5, -2.5); g.lineTo(33, -1.4); g.lineTo(36, 0); g.lineTo(33, 1.4); g.lineTo(11.5, 2.5); g.fill();
          g.strokeStyle = RW.shade(a, -0.4); g.lineWidth = 0.7; g.beginPath(); g.moveTo(13, 0); g.lineTo(30, 0); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(12, -2.1); g.lineTo(33, -1.1); g.stroke(); },
        spear() { g.fillStyle = '#0c0a10'; g.fillRect(-3, -1.8, 34, 3.6); g.fillStyle = metalGrad(g, 0, -1.4, 0, 1.4, b); g.fillRect(-2.5, -1.3, 33, 2.6);
          g.fillStyle = RW.shade(b, -0.45); for (let x = 26; x < 30; x += 1.4) g.fillRect(x, -1.6, 0.7, 3.2);
          g.fillStyle = '#0c0a10'; g.beginPath(); g.moveTo(29, -3.6); g.lineTo(39, 0); g.lineTo(29, 3.6); g.lineTo(31, 0); g.fill();
          g.fillStyle = metalGrad(g, 0, -3, 0, 3, a); g.beginPath(); g.moveTo(29.8, -3); g.lineTo(38, 0); g.lineTo(29.8, 3); g.lineTo(31.6, 0); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(31, -1.9); g.lineTo(37.4, -0.2); g.stroke(); },
        pick() { g.fillStyle = '#0c0a10'; g.fillRect(-2, -2, 30, 4); g.fillStyle = metalGrad(g, 0, -1.5, 0, 1.5, b); g.fillRect(-1.5, -1.5, 29, 3);
          g.save(); g.translate(26, 0); g.fillStyle = '#0c0a10'; g.beginPath(); g.moveTo(-3, -15); g.quadraticCurveTo(5, -4, 4, 0); g.quadraticCurveTo(5, 4, -3, 15); g.lineTo(-1, 15.5); g.quadraticCurveTo(9, 3, 1, -3); g.quadraticCurveTo(9, -3, -1, -15.5); g.fill();
          g.fillStyle = metalGrad(g, -3, 0, 6, 0, a); g.beginPath(); g.moveTo(-2.4, -14); g.quadraticCurveTo(4.4, -4, 3.4, 0); g.quadraticCurveTo(4.4, 4, -2.4, 14); g.quadraticCurveTo(7.6, 3, 1.6, 0); g.quadraticCurveTo(7.6, -3, -2.4, -14); g.fill();
          g.fillStyle = '#0c0a10'; g.fillRect(-1.5, -3, 4, 6); g.fillStyle = RW.shade(a, -0.3); g.fillRect(-1, -2.5, 3, 5); g.restore(); },
        axe() { g.fillStyle = '#0c0a10'; g.fillRect(-2, -2, 31, 4); g.fillStyle = metalGrad(g, 0, -1.5, 0, 1.5, b); g.fillRect(-1.5, -1.5, 30, 3);
          g.save(); g.translate(25, 0); g.fillStyle = '#0c0a10'; g.beginPath(); g.moveTo(-3, -3); g.lineTo(-1, -12); g.quadraticCurveTo(7, -11, 9, -1); g.lineTo(9, 1); g.quadraticCurveTo(7, 11, -1, 12); g.lineTo(-3, 3); g.fill();
          g.fillStyle = metalGrad(g, -2, 0, 9, 0, a); g.beginPath(); g.moveTo(-2.2, -2.4); g.lineTo(-0.6, -11); g.quadraticCurveTo(6.2, -10, 8.2, -1); g.lineTo(8.2, 1); g.quadraticCurveTo(6.2, 10, -0.6, 11); g.lineTo(-2.2, 2.4); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(7.4, -6); g.quadraticCurveTo(8.6, 0, 7.4, 6); g.stroke(); g.restore(); },
        hammer() { g.fillStyle = '#0c0a10'; g.fillRect(-2, -2, 28, 4); g.fillStyle = metalGrad(g, 0, -1.5, 0, 1.5, b); g.fillRect(-1.5, -1.5, 27, 3);
          g.save(); g.translate(26, 0); g.fillStyle = '#0c0a10'; g.fillRect(-5, -9, 10, 18); g.fillStyle = metalGrad(g, -4.5, 0, 4.5, 0, a); g.fillRect(-4.4, -8.4, 8.8, 16.8);
          g.fillStyle = RW.shade(a, 0.45); g.fillRect(-4.4, -8.4, 8.8, 1.2); g.fillStyle = RW.shade(a, -0.45); g.fillRect(-4.4, 7.2, 8.8, 1.2); g.fillStyle = RW.shade(a, -0.25); g.fillRect(-4.4, -2, 8.8, 0.8); g.fillRect(-4.4, 1.4, 8.8, 0.8); g.restore(); },
        mace() { grip(g, 22, b); g.save(); g.translate(28, 0);
          for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4; g.fillStyle = '#0c0a10'; g.beginPath(); g.moveTo(Math.cos(an - 0.35) * 5, Math.sin(an - 0.35) * 5); g.lineTo(Math.cos(an) * 10, Math.sin(an) * 10); g.lineTo(Math.cos(an + 0.35) * 5, Math.sin(an + 0.35) * 5); g.fill(); g.fillStyle = RW.shade(a, 0.2); g.beginPath(); g.moveTo(Math.cos(an - 0.25) * 5, Math.sin(an - 0.25) * 5); g.lineTo(Math.cos(an) * 9, Math.sin(an) * 9); g.lineTo(Math.cos(an + 0.25) * 5, Math.sin(an + 0.25) * 5); g.fill(); }
          const rg = g.createRadialGradient(-2, -2, 1, 0, 0, 7); rg.addColorStop(0, RW.shade(a, 0.6)); rg.addColorStop(1, RW.shade(a, -0.4)); g.fillStyle = '#0c0a10'; g.beginPath(); g.arc(0, 0, 7, 0, 6.283); g.fill(); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 6.2, 0, 6.283); g.fill(); g.restore(); },
        club() { g.fillStyle = '#0c0a10'; g.beginPath(); g.moveTo(-2, -2.4); g.lineTo(30, -6.5); g.quadraticCurveTo(36, 0, 30, 6.5); g.lineTo(-2, 2.4); g.fill();
          g.fillStyle = metalGrad(g, 0, -6, 0, 6, a); g.beginPath(); g.moveTo(-1.4, -1.8); g.lineTo(29.6, -5.8); g.quadraticCurveTo(35, 0, 29.6, 5.8); g.lineTo(-1.4, 1.8); g.fill();
          g.fillStyle = RW.shade(a, -0.45); [[14, -1.5], [21, 2], [26, -2.6]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 1.6, 1, 0, 0, 6.283); g.fill(); }); },
      };
      ok.handaxe = ok.axe;
      if (ok[s]) ok[s](); else c = null;
    }
    hdIcons[id] = c; return c;
  }
  RW.v3hdIcon = hdIcon;

  // ================================= 3. drawing through the sharper copies =================================
  function sharpen(g, fn, self, args) {
    if (g.__v3sharp) return fn.apply(self, args);
    const raw = g.drawImage; g.__v3sharp = true;
    g.drawImage = function (img, x, y, w, h) {
      const n = arguments.length;
      if ((n === 3 || n === 5) && img && img.getContext && img.width <= 256 && img.height <= 256 && !img.__noHD) {
        const hd = img.__hd2 || (img.__iconId && hdIcon(img.__iconId)) || scale2x(img);
        if (hd) return n === 3 ? raw.call(this, hd, x, y, img.width, img.height) : raw.call(this, hd, x, y, w, h);
      }
      return raw.apply(this, arguments);
    };
    try { return fn.apply(self, args); } finally { g.drawImage = raw; g.__v3sharp = false; }
  }
  const baseDP = E.drawPlayer;
  E.drawPlayer = function (g, cam, p, look, opts) {
    const r = sharpen(g, baseDP, this, arguments);
    if (opts && opts.item && opts.swing > 0 && !opts.dead) swingTrail(g, cam, p, opts);
    return r;
  };
  const baseDraw = E.draw;
  E.draw = function (g) { return sharpen(g, baseDraw, this, arguments); };
  if (RW.net && RW.net.drawPeers) { const bp = RW.net.drawPeers; RW.net.drawPeers = function (g) { return sharpen(g, bp, this, arguments); }; }

  // a curved trail behind a swing, in the weapon's own colour
  function swingTrail(g0, cam, p, opts) { if (RW.v3pix && !g0.__inPix) { RW.v3pix(g0, (q) => { q.__inPix = true; swingTrail(q, cam, p, opts); q.__inPix = false; }, { add: true, soft: true }); return; } const g = g0;
    const it = RW.ITEMS[opts.item]; if (!it || it.ranged || it.kind !== 'weapon') return;
    const prog = 1 - opts.swing / (opts.swingDur || 0.3); if (prog < 0.12 || prog > 0.9) return;
    const f = p.face || 1, sc = opts.scale || 1, cx = p.x + 6 - cam.x + f * 3 * sc, cy = p.y + 14 - cam.y - 2 * sc, R = (it.reach || 18) * 0.85 * sc + 6;
    const col = it.fx === 'fire' ? '255,150,60' : it.fx === 'poison' ? '140,230,80' : it.fx === 'lightning' ? '140,230,255' : it.fx === 'shards' ? '210,160,255' : '235,240,255';
    const a1 = -2.2 + prog * 3.0, a0 = Math.max(-2.2, a1 - 1.3);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 10; k++) {
      const t0 = a0 + (a1 - a0) * k / 10, t1 = a0 + (a1 - a0) * (k + 1) / 10, al = (k / 10) * 0.85 * (1 - Math.abs(prog - 0.5));
      g.fillStyle = 'rgba(' + col + ',' + al + ')'; g.beginPath();
      const A0 = f > 0 ? t0 : Math.PI - t0, A1 = f > 0 ? t1 : Math.PI - t1;
      g.arc(cx, cy, R, A0, A1, f < 0); g.arc(cx, cy, R - 6 * sc, A1, A0, f > 0); g.closePath(); g.fill();
    }
    g.restore();
  }

  // ================================= 4. softer, brighter effects =================================
  const dots = {};
  function dot(color) {
    let c = dots[color]; if (c) return c;
    c = mk(32, 32); const g = c.ctx, rgb = RW.hexToRgb ? RW.hexToRgb(color) : [255, 255, 255];
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.95)');
    gr.addColorStop(0.5, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); c.__noHD = true;
    dots[color] = c; return c;
  }
  const baseOver = FX.drawOver;
  FX.drawOver = function (g, cam) {
    const mine = [], bolts = FX.bolts;
    for (const p of FX.parts) if (p.add && (p.kind === 'glow' || p.kind === 'ember' || p.kind === 'spark') && typeof p.color === 'string' && p.color[0] === '#') { mine.push(p); p.add = false; }
    FX.bolts = [];
    let r;
    try {
      const paint = (g) => {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const p of mine) {
        const t = p.life / p.max, x = p.x - cam.x, y = p.y - cam.y; g.globalAlpha = Math.min(1, t * 1.4);
        if (p.kind === 'spark') { g.strokeStyle = p.color; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x - p.vx * 0.03, y - p.vy * 0.03); g.stroke(); g.globalAlpha *= 0.6; g.drawImage(dot(p.color), x - 1.5, y - 1.5, 3, 3); }
        else { const s = (p.size || 1) * 2 + 3; g.drawImage(dot(p.color), x - s / 2, y - s / 2, s, s); }
      }
      for (const b of bolts) {
        const t = b.life / b.max, n = Math.max(3, Math.round(Math.hypot(b.bx - b.ax, b.by - b.ay) / 8)), pts = [[b.ax, b.ay]];
        for (let i = 1; i < n; i++) { const k = i / n; pts.push([b.ax + (b.bx - b.ax) * k + (Math.random() - 0.5) * 12, b.ay + (b.by - b.ay) * k + (Math.random() - 0.5) * 12]); }
        pts.push([b.bx, b.by]);
        [[7, b.color, 0.18], [3, b.color, 0.5], [1, '#ffffff', 1]].forEach(([w, c, al]) => { g.globalAlpha = t * al; g.strokeStyle = c; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x - cam.x, y - cam.y) : g.moveTo(x - cam.x, y - cam.y))); g.stroke(); });
      }
      g.restore();
      };
      if (RW.v3pix && (mine.length || bolts.length)) RW.v3pix(g, paint, { add: true, soft: true }); else paint(g);
      r = baseOver.apply(this, arguments);
    } finally { mine.forEach((p) => { p.add = true; }); FX.bolts = bolts; }
    return r;
  };
})(window.RW);
