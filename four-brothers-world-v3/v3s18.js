// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 18: items with Terraria's pixel count.
//  * Bag, hotbar and held items are drawn with about as many pixels as a Terraria item: 16 across for ordinary
//    weapons, tools, armour and everything else, 24 across for the Leviathan's gear (and 18 for trinkets).
//    (McKay later asked for 16 across for everything, all centred. The Leviathan's weapons are held 1.5x bigger.)
//    Each picture is shrunk by keeping the colour most of each block shows, then outlined and lit again at the
//    new size, so it stays crisp instead of blurry.
//  * Pickaxes are painted fresh, Terraria style: a thick curved head that tapers to two points, a socket, and a
//    wooden haft.
//  * Held items use the same pictures: one picture pixel per world unit, so they match the heroes.
(function (RW) {
  'use strict';
  const A = RW.art, E = RW.ent, VA = RW.v3art;
  if (!A || !E || !VA) return;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d'); return c; };
  const hexOk = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  const sh = (c, k) => RW.shade(c, k);
  const ramp = (c) => [sh(c, -0.6), sh(c, -0.38), sh(c, -0.16), c, sh(c, 0.25), sh(c, 0.5), sh(c, 0.75)];
  const toHex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

  // ---------------- shrinking: the colour most of each block shows wins (dark outline pixels count for less) ----------------
  function down(src, N) {
    const W = src.width, H = src.height, sd = (src.ctx || src.getContext('2d')).getImageData(0, 0, W, H).data;
    const c = mk(N, N), d = c.ctx.createImageData(N, N), a = d.data, pal = new Set(), fx = W / N, fy = H / N;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const x0 = Math.floor(x * fx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx)), y0 = Math.floor(y * fy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy));
      const votes = new Map(); let clear = 0, tot = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const i = (yy * W + xx) * 4; tot++;
        if (sd[i + 3] < 120) { clear++; continue; }
        const lum = sd[i] * 0.3 + sd[i + 1] * 0.59 + sd[i + 2] * 0.11, k = (sd[i] << 16) | (sd[i + 1] << 8) | sd[i + 2];
        votes.set(k, (votes.get(k) || 0) + (lum < 34 ? 0.45 : 1));
      }
      if (clear / tot > 0.6 || !votes.size) continue;
      let best = 0, bv = -1; votes.forEach((v, k) => { if (v > bv) { bv = v; best = k; } });
      const o = (y * N + x) * 4; a[o] = best >> 16; a[o + 1] = (best >> 8) & 255; a[o + 2] = best & 255; a[o + 3] = 255; pal.add(toHex(a[o], a[o + 1], a[o + 2]));
    }
    // an old outline pixel left on the edge is dropped, so the new outline is one pixel and not two
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const o = (y * N + x) * 4; if (!a[o + 3]) continue;
      if (a[o] * 0.3 + a[o + 1] * 0.59 + a[o + 2] * 0.11 >= 34) continue;
      let open = 0, solid = 0;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N || !a[(yy * N + xx) * 4 + 3]) open++; else solid++; }
      if (open && solid) a[o + 3] = 0;
    }
    c.ctx.putImageData(d, 0, 0);
    VA.finish(c, [...pal].concat(['#0a0810']), {});
    c.__noHD = true; return c;
  }

  // ---------------- pickaxes, Terraria style ----------------
  function pickIcon(it) {
    const c = mk(32, 32), g = c.ctx, a = hexOk(it.icon && it.icon.a) ? it.icon.a : '#9aa3ad', b = hexOk(it.icon && it.icon.b) ? it.icon.b : '#6b5a48', R = ramp(a), B = ramp(b);
    g.imageSmoothingEnabled = true;
    const s = Math.SQRT1_2;
    // u runs along the head (top left to bottom right), v runs up the haft toward the head
    g.setTransform(s, s, s, -s, 18, 14);
    // the haft: wood with a darker grain and a wrapped grip
    g.fillStyle = B[2]; g.fillRect(-2.2, -25, 4.4, 26); g.fillStyle = B[4]; g.fillRect(-2.2, -25, 1.5, 26); g.fillStyle = B[1]; g.fillRect(1.2, -25, 1, 26);
    g.fillStyle = B[0]; for (let v = -25; v < -17; v += 2.6) g.fillRect(-2, v, 4, 1.1);
    // the head: a thick crescent bulging away from the haft, tapering to two points that curl back toward the hand
    const L = 17;
    g.fillStyle = R[2]; g.beginPath(); g.moveTo(-L, -4); g.quadraticCurveTo(-L * 0.55, 7.5, 0, 8.5); g.quadraticCurveTo(L * 0.55, 7.5, L, -4); g.quadraticCurveTo(L * 0.5, 2.4, 0, 1); g.quadraticCurveTo(-L * 0.5, 2.4, -L, -4); g.closePath(); g.fill();
    // lit along the outer curve, dark along the inner curve, a bright glint near the middle
    g.fillStyle = R[4]; g.beginPath(); g.moveTo(-L + 1, -2.8); g.quadraticCurveTo(-L * 0.55, 6.6, 0, 7.6); g.quadraticCurveTo(L * 0.55, 6.6, L - 1, -2.8); g.quadraticCurveTo(L * 0.55, 4.4, 0, 5.2); g.quadraticCurveTo(-L * 0.55, 4.4, -L + 1, -2.8); g.fill();
    g.fillStyle = R[6]; g.beginPath(); g.moveTo(-10, 3.2); g.quadraticCurveTo(-5, 7, 0, 7.4); g.lineTo(0, 6.2); g.quadraticCurveTo(-5, 5.8, -10, 3.2); g.fill();
    g.fillStyle = R[1]; g.beginPath(); g.moveTo(-L + 1.5, -2.6); g.quadraticCurveTo(-L * 0.5, 2.8, 0, 1.6); g.quadraticCurveTo(L * 0.5, 2.8, L - 1.5, -2.6); g.quadraticCurveTo(L * 0.5, 1.6, 0, 0.6); g.quadraticCurveTo(-L * 0.5, 1.6, -L + 1.5, -2.6); g.fill();
    // the socket where head meets haft
    g.fillStyle = R[1]; g.fillRect(-3, -3, 6, 5.5); g.fillStyle = R[3]; g.fillRect(-2.6, -2.6, 5.2, 1.6); g.fillStyle = R[0]; g.fillRect(-3, 1.4, 6, 1.1);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const dk = RW.v3pickDeco && RW.v3pickDeco[it.id]; if (dk) dk(g); // extra decorations (v3s19)
    VA.finish(c, ['#0c0a10', '#ffffff'].concat(R, B, dk && RW.v3pickDeco.pal ? RW.v3pickDeco.pal : [])); return c;
  }
  const isPick = (it) => it && it.icon && it.icon.s === 'pick';

  // the Leviathan's gear: repaint at 48 without the halo, shrink to 24, then give it a one-pixel glow
  const raw48 = (id) => {
    const p = VA.painters[id]; if (!p) return null;
    const c = mk(48, 48); c.ctx.imageSmoothingEnabled = true;
    if (p.fit) { c.ctx.translate(24 + (p.dx || 0), 24 + (p.dy || 0)); c.ctx.scale(p.fit, p.fit); c.ctx.translate(-24, -24); }
    p.fn(c.ctx); if (p.deco) { c.ctx.setTransform(1, 0, 0, 1, 0, 0); p.deco(c.ctx); }
    return VA.finish(c, p.decoPal ? p.pal.concat(p.decoPal) : p.pal);
  };
  function glowRing(c, col) {
    if (!/^#[0-9a-f]{6}$/i.test(col || '') || RW.lum && false) return c;
    { const v = parseInt(col.slice(1), 16), l = ((v >> 16) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11); if (l < 70) return c; } // too dark to glow
    const N = c.width, g = c.ctx, d = g.getImageData(0, 0, N, N), a = d.data, [r, gg, b] = [1, 3, 5].map((k) => parseInt(col.slice(k, k + 2), 16)), add = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (a[(y * N + x) * 4 + 3]) continue; let n = 0; for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < N && yy < N && a[(yy * N + xx) * 4 + 3] === 255) n++; } if (n) add.push((y * N + x) * 4); }
    add.forEach((o) => { a[o] = r; a[o + 1] = gg; a[o + 2] = b; a[o + 3] = 90; });
    g.putImageData(d, 0, 0);
    [[2, 3], [N - 4, N - 9]].forEach(([x, y]) => { if (!a[(y * N + x) * 4 + 3]) { g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); g.fillStyle = col; g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1); } });
    return c;
  }
  // sizes: 16 across for everything (McKay: "make it 16 and 16")
  const SMALL = 16, BIG = 16, TRINK = 16;
  const SIZE = (id) => { const it = RW.ITEMS[id] || {}; if (/^t_/.test(id) || it.v3trinket) return TRINK; if (id === 'abyssite_ore' || id === 'abyssite_bar' || /chest/.test(id)) return SMALL; return BIG; };

  // every picture sits in the middle of its square
  function center(c) {
    const N = c.width, d = c.ctx.getImageData(0, 0, N, N).data; let x0 = N, y0 = N, x1 = -1, y1 = -1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return c;
    const dx = Math.floor((N - (x1 - x0 + 1)) / 2) - x0, dy = Math.floor((N - (y1 - y0 + 1)) / 2) - y0;
    if (!dx && !dy) return c;
    const o = mk(N, N); o.ctx.drawImage(c, dx, dy); return o;
  }
  const made = {}, HELD = new WeakMap(), key0 = (id) => VA.artOf(id);
  function artFor(id, c) {
    if (made[id] !== undefined) return made[id];
    const it = RW.ITEMS[id]; let out = null;
    try {
      const key = VA.artOf(id);
      if (isPick(it) && key) { out = down(pickIcon(it), BIG); if (it.v3glowc) glowRing(out, it.v3glowc); }
      else if (key && VA.painters[key]) {
        const n = SIZE(id), big = raw48(key); out = down(big, n);
        if (it && it.v3glowc) glowRing(out, it.v3glowc);
      } else if (isPick(it)) out = down(pickIcon(it), SMALL);
      else if (c.__big48) out = down(c.__big48, SMALL);
    } catch (e) { out = null; }
    if (out) out = center(out);
    if (out) { out.__noHD = true; out.__iconId = id; HELD.set(out, key0(id) && (RW.ITEMS[id] || {}).kind === 'weapon' ? 24 : 16); }
    made[id] = out; return out;
  }
  RW.v3pickIcon = pickIcon;
  RW.v3pixArt = (id) => { A.icon(id); return made[id] || null; };
  RW.v3pixClear = (id) => { if (id) { delete made[id]; delete A.icons[id]; } else Object.keys(made).forEach((k) => { delete made[k]; delete A.icons[k]; }); };

  const baseIcon = A.icon;
  A.icon = function (id) {
    const c = baseIcon.apply(this, arguments);
    if (!c || c.__v3t) return c;
    const art = artFor(id, c);
    if (art) { c.__big48 = art; c.__hd2 = art; }
    else c.__noHD = true; // plain items are already 16 across: draw them as they are, in the hand too
    c.__v3t = true; return c;
  };
  Object.keys(A.icons || {}).forEach((k) => { delete A.icons[k]; });

  // held: the grip stays in the hand; ordinary items 16 units, the Leviathan's gear 24
  const baseDP = E.drawPlayer;
  E.drawPlayer = function (g) {
    const raw = g.drawImage;
    g.drawImage = function (img, x, y, w, h) {
      if (arguments.length === 5 && x === -3 && y === -13 && w === 16 && h === 16) {
        const art = HELD.has(img) ? img : img && img.__big48 && HELD.has(img.__big48) ? img.__big48 : null;
        if (art) { const S = HELD.get(art) || 16, k = S / 16, sm = this.imageSmoothingEnabled; this.imageSmoothingEnabled = false; const r = raw.call(this, art, -3 * k, -13 * k, S, S); this.imageSmoothingEnabled = sm; return r; }
      }
      return raw.apply(this, arguments);
    };
    try { return baseDP.apply(this, arguments); } finally { g.drawImage = raw; }
  };
})(window.RW);
