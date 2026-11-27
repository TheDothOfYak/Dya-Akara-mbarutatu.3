// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 11: Terraria-style items everywhere.
//  * Every weapon, tool and armour piece (not only the Leviathan's) gets a crisp 32x32 picture: its colours snapped
//    to shaded ramps, each part outlined in a deep shade of its own colour, and lit along its upper-left edges.
//  * Armour icons are painted fresh: a helmet or a chestplate in the piece's own metal, with rivets and trim.
//    (Worn armour on a rock is painted as real pieces in v3s6.)
//  * Melee swings draw a crisp crescent in the weapon's colours; hits throw coloured dust.
(function (RW) {
  'use strict';
  const A = RW.art, E = RW.ent, P = RW.player, VA = RW.v3art;
  if (!A || !VA || !E) return;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d'); return c; };
  const sh = (c, k) => RW.shade(c, k);
  const ramp = (c) => [sh(c, -0.6), sh(c, -0.38), sh(c, -0.16), c, sh(c, 0.25), sh(c, 0.5), sh(c, 0.75)];
  const hexOk = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  // soft black outlines inside a picture become the deep shade of whatever they touch
  function deblack(c) {
    const g = c.ctx, W = c.width, H = c.height, d = g.getImageData(0, 0, W, H), a = d.data, out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (a[i + 3] > 100 && a[i] + a[i + 1] + a[i + 2] < 60) { let best = -1, bl = 0; for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = (yy * W + xx) * 4; const l = a[j] + a[j + 1] + a[j + 2]; if (a[j + 3] > 100 && l > bl) { bl = l; best = j; } } if (best >= 0) out.push([i, best]); else a[i + 3] = 0; } }
    out.forEach(([i, j]) => { a[i] = a[j] * 0.3; a[i + 1] = a[j + 1] * 0.28; a[i + 2] = a[j + 2] * 0.34 + 6; });
    g.putImageData(d, 0, 0); return c;
  }
  function terrarify(src, cols) {
    const c = mk(32, 32); c.ctx.imageSmoothingEnabled = src.width >= 32; c.ctx.drawImage(src, 0, 0, 32, 32);
    const pal = ['#0c0a10'].concat(...cols.filter(hexOk).map(ramp), ['#ffffff']);
    VA.finish(c, pal, { noOutline: true }); deblack(c); VA.finish(c, pal.concat([]), {}); return c;
  }
  // a fresh armour icon: helmet or chestplate in the piece's own metal
  function armorIcon(it) {
    const c = mk(32, 32), g = c.ctx, base = (it.tint && hexOk(it.tint) ? it.tint : it.icon && hexOk(it.icon.a) ? it.icon.a : '#9aa3ad'), R = ramp(base), gl = it.glow;
    g.imageSmoothingEnabled = true;
    const lin = (x0, y0, x1, y1, st) => { const gr = g.createLinearGradient(x0, y0, x1, y1); st.forEach((s, i) => gr.addColorStop(i / (st.length - 1), s)); return gr; };
    if (it.slot === 'head') {
      g.fillStyle = lin(6, 0, 26, 0, [R[5], R[4], R[3], R[2], R[1]]); g.beginPath(); g.moveTo(5, 26); g.lineTo(5, 15); g.quadraticCurveTo(6, 5, 16, 4); g.quadraticCurveTo(26, 5, 27, 15); g.lineTo(27, 26); g.lineTo(21, 26); g.lineTo(21, 18); g.lineTo(11, 18); g.lineTo(11, 26); g.closePath(); g.fill();
      g.fillStyle = R[1]; g.fillRect(5, 24, 6, 3); g.fillRect(21, 24, 6, 3); g.fillStyle = R[0]; g.fillRect(11, 17, 10, 2);
      g.fillStyle = R[2]; g.fillRect(15, 4, 2, 14); g.fillStyle = R[5]; g.fillRect(8, 9, 3, 2);
      [[7, 21], [25, 21]].forEach(([x, y]) => { g.fillStyle = R[5]; g.fillRect(x, y, 1.5, 1.5); });
      if (gl) { g.fillStyle = gl; g.fillRect(13, 18.5, 2, 1); g.fillRect(18, 18.5, 2, 1); g.fillRect(15.5, 2, 1, 2); }
    } else if (it.slot === 'body') {
      g.fillStyle = lin(0, 5, 0, 30, [R[4], R[3], R[2], R[1]]); g.beginPath(); g.moveTo(3, 10); g.lineTo(10, 5); g.lineTo(22, 5); g.lineTo(29, 10); g.lineTo(27, 17); g.lineTo(24, 16); g.lineTo(24, 29); g.lineTo(8, 29); g.lineTo(8, 16); g.lineTo(5, 17); g.closePath(); g.fill();
      g.fillStyle = R[0]; g.beginPath(); g.moveTo(11, 5); g.lineTo(21, 5); g.lineTo(19, 9); g.lineTo(13, 9); g.fill();
      g.fillStyle = R[5]; g.beginPath(); g.moveTo(3, 10); g.lineTo(10, 5); g.lineTo(10, 9); g.lineTo(5, 13); g.fill();
      for (let k = 0; k < 4; k++) { g.fillStyle = R[4]; g.fillRect(9, 12 + k * 4, 14, 1); g.fillStyle = R[1]; g.fillRect(9, 14 + k * 4, 14, 1); }
      g.fillStyle = gl || R[5]; g.beginPath(); g.moveTo(16, 11); g.lineTo(18, 14); g.lineTo(16, 17); g.lineTo(14, 14); g.fill();
      g.fillStyle = R[0]; g.fillRect(8, 27, 16, 2);
    } else return null;
    VA.finish(c, ['#0c0a10', '#ffffff'].concat(R, gl && hexOk(gl) ? ramp(gl) : []));
    return c;
  }
  function bowIcon(it) { // a recurve bow, limbs shaded, a wrapped grip, a taut string, tips capped
    const c = mk(32, 32), g = c.ctx, a = hexOk(it.icon.a) ? it.icon.a : '#9a6a44', b = hexOk(it.icon.b) ? it.icon.b : '#5a3a24', R = ramp(a), B = ramp(b);
    g.imageSmoothingEnabled = true; g.translate(16, 16); g.rotate(-Math.PI / 4); g.lineCap = 'round';
    g.strokeStyle = R[1]; g.lineWidth = 3.6; g.beginPath(); g.arc(-7, 0, 14, -1.2, 1.2); g.stroke();
    g.strokeStyle = R[4]; g.lineWidth = 1.2; g.beginPath(); g.arc(-7.6, 0, 13.4, -1.1, -0.2); g.stroke(); g.beginPath(); g.arc(-7.6, 0, 13.4, 0.25, 1.0); g.stroke();
    const tx = -7 + Math.cos(1.2) * 14, ty = Math.sin(1.2) * 14;
    g.strokeStyle = '#e8e0d0'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(tx, -ty); g.lineTo(tx, ty); g.stroke();
    [[tx, -ty], [tx, ty]].forEach(([x, y]) => { g.fillStyle = R[5]; g.beginPath(); g.arc(x, y, 1.6, 0, 6.283); g.fill(); });
    g.fillStyle = B[2]; g.fillRect(5.4, -3, 3, 6); g.fillStyle = B[4]; for (let y = -3; y < 3; y += 1.6) g.fillRect(5.4, y, 3, 0.6);
    g.setTransform(1, 0, 0, 1, 0, 0);
    VA.finish(c, ['#0c0a10', '#ffffff', '#e8e0d0'].concat(R, B)); return c;
  }
  function axeIcon(it) { // a woodcutter's axe: a long haft, a single bearded blade, a little back spike
    const c = mk(32, 32), g = c.ctx, a = hexOk(it.icon.a) ? it.icon.a : '#9aa3ad', b = hexOk(it.icon.b) ? it.icon.b : '#6b5a48', R = ramp(a), B = ramp(b);
    g.imageSmoothingEnabled = true; g.translate(5, 27); g.rotate(-Math.PI / 4);
    g.fillStyle = B[2]; g.fillRect(-2, -1.6, 32, 3.2); g.fillStyle = B[4]; g.fillRect(-2, -1.6, 32, 1); g.fillStyle = B[1]; for (let x = 0; x < 8; x += 2.2) g.fillRect(x, -1.6, 0.8, 3.2);
    g.save(); g.translate(24, 0);
    g.fillStyle = R[2]; g.beginPath(); g.moveTo(-4, -1.5); g.lineTo(-5, -6); g.quadraticCurveTo(-7, -13, -1, -15); g.quadraticCurveTo(7, -14, 7, -6); g.lineTo(4, -1.5); g.closePath(); g.fill();
    g.fillStyle = R[4]; g.beginPath(); g.moveTo(-1, -15); g.quadraticCurveTo(-6.4, -12.6, -4.6, -6.2); g.lineTo(-3, -6.4); g.quadraticCurveTo(-4.4, -12, -0.6, -13.6); g.fill();
    g.strokeStyle = R[6]; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-6.2, -11); g.quadraticCurveTo(-6, -14.6, -1, -15); g.stroke();
    g.fillStyle = R[1]; g.fillRect(-3.4, -3, 6.8, 6); g.fillStyle = R[3]; g.fillRect(-3, -2.6, 6, 1.4);
    g.fillStyle = R[2]; g.beginPath(); g.moveTo(-2, 2.5); g.lineTo(0, 7); g.lineTo(2, 2.5); g.fill();
    g.restore(); g.setTransform(1, 0, 0, 1, 0, 0);
    VA.finish(c, ['#0c0a10', '#ffffff'].concat(R, B)); return c;
  }
  const done = {};
  function bigFor(id, small) {
    if (done[id] !== undefined) return done[id];
    const it = RW.ITEMS[id]; let big = null;
    try {
      if (it && it.kind === 'weapon' && it.icon && it.icon.s === 'bow') big = bowIcon(it);
      else if (it && it.kind === 'weapon' && it.icon && (it.icon.s === 'axe' || it.icon.s === 'handaxe')) big = axeIcon(it);
      else if (it && (it.kind === 'weapon' || it.kind === 'tool')) {
        const hd = RW.v3hdIcon && RW.v3hdIcon(id), cols = [it.icon && it.icon.a, it.icon && it.icon.b].filter(Boolean);
        if (hd) big = terrarify(hd, cols);
        else { const up = mk(32, 32); up.ctx.imageSmoothingEnabled = false; up.ctx.drawImage(small, 0, 0, 32, 32); big = terrarify(up, cols); }
      } else if (it && it.kind === 'armor' && (it.slot === 'head' || it.slot === 'body')) big = armorIcon(it);
    } catch (e) { big = null; }
    if (big) big.__noHD = true;
    done[id] = big; return big;
  }
  const baseIcon = A.icon;
  A.icon = function (id) {
    const c = baseIcon.apply(this, arguments);
    if (!c || c.__big48 || VA.has(id)) return c;
    const big = bigFor(id, c); if (big) { c.__big48 = big; c.__hd2 = big; }
    return c;
  };
  Object.keys(A.icons || {}).forEach((k) => { if (!VA.has(k)) delete A.icons[k]; });

  // ---- crisp swing crescents and coloured hit dust ----
  const baseDP = E.drawPlayer;
  E.drawPlayer = function (g, cam, p, look, opts) {
    const r = baseDP.apply(this, arguments);
    try {
      const it = opts && opts.item && RW.ITEMS[opts.item];
      if (it && it.kind === 'weapon' && !it.ranged && !it.v3shot && !it.v3lantern && opts.swing > 0 && !opts.dead && RW.v3pix) {
        const prog = 1 - opts.swing / (opts.swingDur || 0.3); if (prog > 0.12 && prog < 0.9) {
          const a1 = it.v3glowc || (it.icon && hexOk(it.icon.a) ? it.icon.a : '#e8e0d0'), f = p.face || 1, sc = opts.scale || 1;
          const cx = p.x + 6 - cam.x, cy = p.y + 12 - cam.y, R0 = ((it.reach || 24) * 0.75 + 8) * sc;
          RW.v3pix(g, (q) => {
            const end = -2.2 + prog * 3.0, start = Math.max(-2.2, end - 1.4);
            for (let k = 0; k < 18; k++) { const t = k / 17, an = start + (end - start) * t, w = Math.max(1, Math.round(t * 4 * (1 - Math.abs(prog - 0.5)))), col = t > 0.85 ? '#ffffff' : t > 0.5 ? sh(a1, 0.45) : sh(a1, 0.05);
              for (let j = 0; j < w; j++) { const rr = R0 - j; q.fillStyle = col; q.fillRect(Math.round(cx + f * Math.cos(an) * rr), Math.round(cy + Math.sin(an) * rr), 1, 1); } }
          });
        }
      }
    } catch (e) { /* only a look */ }
    return r;
  };
  const baseDamage = E.damage;
  E.damage = function (e, d) {
    const r = baseDamage.apply(this, arguments);
    try { const h = P.held && P.held(); if (e && h && h.kind === 'weapon' && RW.fx && RW.fx.burst) { const a1 = h.v3glowc || (h.icon && hexOk(h.icon.a) ? h.icon.a : '#e8e0d0'), b = e.hitbox ? e.hitbox() : e; RW.fx.burst(b.x + b.w / 2, b.y + b.h / 2, [a1, sh(a1, 0.4), sh(a1, -0.3)], 7, 150, { grav: 420, life: 0.4 }); } } catch (x) { }
    return r;
  };
  // a townsfolk timer can go negative or NaN (then its frame index is undefined and the whole draw stops): keep it sane
  const baseDraw = E.draw;
  E.draw = function () { (E.npcs || []).forEach((n) => { if (!(n.t >= 0) || !isFinite(n.t)) n.t = 0; }); return baseDraw.apply(this, arguments); };
  RW.v3terraria = { terrarify, armorIcon };
})(window.RW);
