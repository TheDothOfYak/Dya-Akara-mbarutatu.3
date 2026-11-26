// 4 Brothers World V3 — part 9: the drowned-soul guardians.
//  * The Leviathan's four guardians are drowned souls now, two and a half times as tall as a hero, in tattered robes:
//    the Knight (a skull under its hood, crab-shell pauldrons, a bone cleaver; fire),
//    the Archer (only two cold eyes in a dark hood, a narwhal-horn bow; ice),
//    the Mage (an empty hood pouring mist, jellyfish tendrils trailing below; lightning),
//    the Healer (hood down: a pale drowned face, a tarnished circlet, floating hair, a frond staff; healing).
//  * Same fight as before (v3s4 runs them). Each always drops its core (a trapped soul) for crafting.
//  * Sprites are painted once per class and pose at one pixel per game unit (the Leviathan's grid), shaded and outlined.
(function (RW) {
  'use strict';
  const L = RW.v3lev, VA = RW.v3art; if (!L || !VA) return;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d'); return c; };
  const poly = (g, pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const circ = (g, x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); };
  const ellip = (g, x, y, rx, ry, rot, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.283); g.fill(); };
  const line = (g, x0, y0, x1, y1, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const rect = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const px = (g, x, y, col) => rect(g, Math.round(x), Math.round(y), 1, 1, col);
  const BON = ['#3e3a30', '#5e5848', '#857e66', '#ada488', '#d8d0b4'];
  const CL = {
    knight: { robe: ['#1c1012', '#2c1a1c', '#40262a', '#56343a'], glow: ['#6a1e14', '#b04428', '#ff9060'], name: 'Drowned Knight', core: 'core_knight' },
    archer: { robe: ['#0c1420', '#14202e', '#1e3044', '#2a425a'], glow: ['#1a4868', '#4a90c8', '#c8ecff'], name: 'Drowned Archer', core: 'core_archer' },
    mage: { robe: ['#141418', '#1e1e26', '#2c2c38', '#3c3e4c'], glow: ['#3a3a46', '#80849a', '#c8ccdc'], name: 'Drowned Mage', core: 'core_mage' },
    healer: { robe: ['#0c1a16', '#142a22', '#1e3c30', '#2a5242'], glow: ['#185040', '#5ab894', '#c0f8dc'], name: 'Drowned Healer', core: 'core_healer' },
  };
  const W = 56, H = 72, OX = 28, OY = 40; // sprite size; (OX, OY) is the monster's centre
  // a tattered robe hanging from the shoulders; sway shifts the hem
  function robe(g, R, sway, wide) {
    const w = wide || 11, x = OX, y = OY - 14;
    g.fillStyle = (() => { const gr = g.createLinearGradient(x - 16, 0, x + 16, 0); gr.addColorStop(0, R[3]); gr.addColorStop(0.45, R[2]); gr.addColorStop(1, R[0]); return gr; })();
    g.beginPath(); g.moveTo(x - w, y); g.lineTo(x + w, y);
    const hem = [[16, 34], [12, 31], [8, 36], [3, 32], [-2, 37], [-7, 32], [-11, 36], [-16, 33]];
    hem.forEach(([dx, dy], i) => g.lineTo(x + dx + sway * (dy - 28) / 8, y + dy + (i % 2 ? sway * 0.6 : 0)));
    g.closePath(); g.fill();
    // folds
    for (let k = -2; k <= 2; k++) line(g, x + k * 4.6, y + 6, x + k * 6 + sway, y + 30, 0.9, k < 0 ? R[3] : R[0]);
    poly(g, [[x - w, y], [x + w, y], [x + w - 1, y + 5], [x - w + 1, y + 5]], R[3]);
    for (let k = 0; k < 6; k++) px(g, x - 14 + k * 5.4 + sway, y + 37 + (k % 2) * 2, R[1]); // drifting rags
  }
  function hood(g, R, up) { const x = OX, y = OY - 24; poly(g, [[x - 10, y + 12], [x - 9, y - 1], [x - 4, y - 9 + up], [x + 4, y - 9 + up], [x + 9, y - 1], [x + 10, y + 12]], R[2]); poly(g, [[x - 9, y - 1], [x - 4, y - 9 + up], [x + 2, y - 9 + up], [x - 5, y + 4]], R[3]); ellip(g, x + 1, y + 3, 6, 7, 0, '#06050a'); }
  const P = {
    knight(g, f, atk) {
      const R = CL.knight.robe, G = CL.knight.glow, sw = [0, 1, 0, -1][f];
      robe(g, R, sw, 12); hood(g, R, 0);
      const x = OX, y = OY - 24;
      circ(g, x + 1, y + 2, 5, BON[3]); circ(g, x + 0.4, y + 1, 4, BON[4]); rect(g, x - 2.5, y + 5, 7, 3.4, BON[3]);
      rect(g, x - 2.4, y + 0.6, 2.4, 2.4, '#06050a'); rect(g, x + 1.8, y + 0.6, 2.4, 2.4, '#06050a'); px(g, x - 1.4, y + 1.4, G[2]); px(g, x + 2.8, y + 1.4, G[2]);
      for (let k = 0; k < 3; k++) px(g, x - 1.5 + k * 2, y + 7.4, '#06050a');
      [-1, 1].forEach((s) => { poly(g, [[x + s * 6, y + 9], [x + s * 18, y + 11], [x + s * 16, y + 19], [x + s * 7, y + 16]], G[0]); poly(g, [[x + s * 6, y + 9], [x + s * 18, y + 11], [x + s * 17, y + 13], [x + s * 7, y + 12]], G[1]); for (let k = 0; k < 3; k++) px(g, x + s * (9 + k * 3), y + 15, '#2a0a06'); });
      // the bone cleaver: raised for an attack, lowered otherwise
      g.save(); g.translate(x + 15, y + 18); g.rotate(atk ? -2.2 : -0.35);
      rect(g, -1.4, -2, 2.8, 10, '#241418'); poly(g, [[-3, -2], [3, -2], [5, -28], [0, -33], [-5, -28]], BON[2]); poly(g, [[-3, -2], [0, -2], [0, -32], [-5, -28]], BON[4]); line(g, 1.4, -4, 2.6, -27, 1, G[1]); g.restore();
      for (let k = 0; k < 5; k++) px(g, x - 15 + k * 7, y + 30 - k * 5 + f, k % 2 ? G[2] : G[1]); // embers
    },
    archer(g, f, atk) {
      const R = CL.archer.robe, G = CL.archer.glow, sw = [0, 1, 0, -1][f];
      robe(g, R, sw, 11);
      for (let k = 0; k < 4; k++) { line(g, OX - 8 + k * 2, OY - 10, OX - 13 + k * 2, OY - 27, 1, BON[2]); poly(g, [[OX - 14 + k * 2, OY - 28], [OX - 12 + k * 2, OY - 28], [OX - 13 + k * 2, OY - 31]], G[1]); }
      hood(g, R, -1);
      const x = OX, y = OY - 24; rect(g, x - 3, y + 2, 2.4, 1.6, G[2]); rect(g, x + 2, y + 2, 2.4, 1.6, G[2]); px(g, x - 2, y + 4, G[1]); px(g, x + 3, y + 4, G[1]);
      // the horn bow, drawn at full stretch when shooting
      const bx = x + 9, by = OY - 6, r = 19, pull = atk ? 6 : 0;
      g.lineCap = 'round'; g.strokeStyle = BON[1]; g.lineWidth = 3; g.beginPath(); g.arc(bx, by, r, -1.25, 1.25); g.stroke(); g.strokeStyle = BON[3]; g.lineWidth = 1.2; g.beginPath(); g.arc(bx - 0.6, by, r - 0.6, -1.15, -0.2); g.stroke();
      for (let k = -4; k <= 4; k++) { const a = k * 0.27; px(g, bx + Math.cos(a) * r, by + Math.sin(a) * r, BON[0]); }
      const ex = bx + Math.cos(1.25) * r, ey = Math.sin(1.25) * r; line(g, ex, by - ey, bx - pull, by, 0.8, G[2]); line(g, bx - pull, by, ex, by + ey, 0.8, G[2]);
      if (atk) { line(g, bx - pull, by, bx + 24, by, 1.2, G[2]); poly(g, [[bx + 22, by - 2], [bx + 26, by], [bx + 22, by + 2]], G[2]); }
      for (let k = 0; k < 5; k++) px(g, x - 14 + k * 7, y + 46 + (k % 2) * 3 - f, G[0]);
    },
    mage(g, f, atk) {
      const R = CL.mage.robe, G = CL.mage.glow, sw = [0, 1, 0, -1][f];
      g.lineCap = 'round'; for (let k = -2; k <= 2; k++) { g.strokeStyle = k % 2 ? '#2c2c38' : '#3c3e4c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(OX + k * 5, OY + 18); g.bezierCurveTo(OX + k * 5 + 4 + sw * 2, OY + 24, OX + k * 5 - 4 - sw * 2, OY + 29, OX + k * 5 + 2 + sw, OY + 31); g.stroke(); }
      robe(g, R, sw, 11); hood(g, R, -3);
      const x = OX, y = OY - 24; ellip(g, x + 1, y + 3, 5.4, 6.4, 0, '#000000');
      for (let k = 0; k < 14; k++) px(g, x - 2 + Math.sin(k + f) * 3 + k * 0.3, y + 9 + k * 2.1, k % 3 ? G[1] : G[2]); // mist pouring out
      // the floating dark orb, held high while casting
      const ox = x + 17, oy = y + (atk ? -6 : 4);
      line(g, x + 10, y + 16, ox - 3, oy + 4, 2.2, R[2]); circ(g, ox, oy, 5, '#06050a'); circ(g, ox, oy, 3.8, '#24243a'); circ(g, ox - 1.2, oy - 1.4, 1.2, G[2]);
      for (let k = 0; k < 8; k++) { const a = k * 0.785 + f * 0.4; px(g, ox + Math.cos(a) * 7.5, oy + Math.sin(a) * 7.5, atk ? G[2] : G[1]); }
    },
    healer(g, f, atk) {
      const R = CL.healer.robe, G = CL.healer.glow, sw = [0, 1, 0, -1][f];
      robe(g, R, sw, 11);
      const x = OX, y = OY - 24;
      // a god's aureole behind the head: a tall carved ring with rays reaching up and down
      const GO = ['#4a3e1c', '#7a6630', '#a8904a', '#d8c078'], hy = y + 2;
      for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, long = Math.abs(Math.sin(a)) > 0.92 ? 1.9 : Math.abs(Math.sin(a)) > 0.6 ? 1.45 : 1.15; line(g, x + Math.cos(a) * 9, hy + Math.sin(a) * 12, x + Math.cos(a) * 9 * long, hy + Math.sin(a) * 12 * long, k % 2 ? 1 : 1.6, k % 2 ? GO[1] : GO[2]); }
      g.strokeStyle = GO[1]; g.lineWidth = 3; g.beginPath(); g.ellipse(x, hy, 9, 12, 0, 0, 6.283); g.stroke();
      g.strokeStyle = GO[3]; g.lineWidth = 1; g.beginPath(); g.ellipse(x, hy, 9, 12, 0, 3.6, 5.4); g.stroke();
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; px(g, x + Math.cos(a) * 9, hy + Math.sin(a) * 12, k % 2 ? G[2] : GO[0]); }
      poly(g, [[x, hy - 25], [x + 2, hy - 20], [x, hy - 16], [x - 2, hy - 20]], GO[2]); px(g, x, hy - 20, G[2]);
      poly(g, [[x, hy + 25], [x + 2, hy + 20], [x, hy + 16], [x - 2, hy + 20]], GO[1]);
      poly(g, [[x - 11, y + 10], [x + 11, y + 10], [x + 9, y + 16], [x - 9, y + 16]], R[3]); // the hood, down on the shoulders
      for (let k = -4; k <= 4; k++) line(g, x + k * 1.6, y - 2, x + k * 2.8 + sw, y - 12 + Math.abs(k) * 0.9, 1.4, k % 2 ? '#2a3238' : '#3a444c'); // hair floating up
      circ(g, x, y + 3, 5.6, '#7a8a92'); circ(g, x - 0.6, y + 2.4, 4.4, '#94a4ac'); rect(g, x - 4, y + 5, 8, 3.6, '#7a8a92');
      line(g, x - 6, y - 1, x + 6, y - 1, 1.2, '#a8904a'); px(g, x, y - 1, G[2]);
      line(g, x - 3, y + 3, x - 1, y + 3, 0.8, '#3a4448'); line(g, x + 1, y + 3, x + 3, y + 3, 0.8, '#3a4448'); px(g, x, y + 6.6, '#4a5458');
      // the frond staff
      const sx = x - 16; line(g, sx, y - 6, sx, OY + 30, 2, '#2a2236'); for (let k = 0; k < 7; k++) { const a = Math.PI + k * (Math.PI / 6); line(g, sx, y - 6, sx + Math.cos(a) * 7, y - 6 + Math.sin(a) * 7, 1.2, G[0]); px(g, sx + Math.cos(a) * 7, y - 6 + Math.sin(a) * 7, atk ? G[2] : G[1]); }
      if (atk) circ(g, sx, y - 6, 3, G[2]);
      for (let k = 0; k < 5; k++) px(g, x + 9 + k * 3, y + 14 - k * 4 - f, G[1]);
    },
  };
  const cache = {};
  function sprite(cls, f, atk) {
    const key = cls + f + (atk ? 'a' : ''); if (cache[key]) return cache[key];
    const c = mk(W, H); c.ctx.imageSmoothingEnabled = true; P[cls](c.ctx, f, atk);
    const R = CL[cls]; VA.finish(c, ['#06050a', '#000000', '#241418', '#2a2236', '#2a0a06', '#2a3238', '#3a444c', '#7a8a92', '#94a4ac', '#3a4448', '#4a5458', '#8a7a40', '#c8b060', '#4a3e1c', '#7a6630', '#a8904a', '#d8c078', '#24243a', '#2c2c38', '#3c3e4c'].concat(R.robe, R.glow, BON));
    const fl = mk(W, H); fl.ctx.translate(W, 0); fl.ctx.scale(-1, 1); fl.ctx.drawImage(c, 0, 0);
    cache[key] = [c, fl]; return cache[key];
  }
  const clsOf = (e) => (L.GCLASS[e.sp] || {}).cls || 'knight';
  // drawn by v3s4 (its drawGuardian hands over to this)
  RW.v3soul = function (g, x, y, e, time) {
    const cls = clsOf(e), t = e.t || time || 0, bob = Math.round(Math.sin(t * 2.4) * 1.5), f = Math.floor(t * 5) % 4, atk = !!(e.act && e.act !== 'ward');
    const sp = sprite(cls, f, atk)[(e.face || 1) > 0 ? 0 : 1];
    if (e.ward > 0) { g.save(); g.globalAlpha = 0.5 + 0.2 * Math.sin(t * 8); g.strokeStyle = '#c0f8dc'; g.lineWidth = 1; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), 22, 34, 0, 0, 6.283); g.stroke(); g.restore(); }
    g.drawImage(sp, Math.round(x - OX), Math.round(y + bob - OY));
    if (e.hitT > 0) { g.save(); g.globalAlpha = 0.5; g.globalCompositeOperation = 'lighter'; g.drawImage(sp, Math.round(x - OX), Math.round(y + bob - OY)); g.restore(); }
    if (e.showBar > 0 && e.hp < e.maxhp) { g.fillStyle = '#0c0a10'; g.fillRect(x - 14, y - 42, 28, 3); g.fillStyle = CL[cls].glow[1]; g.fillRect(x - 14, y - 42, 28 * Math.max(0, e.hp / e.maxhp), 3); }
  };
  RW.v3soul.sprite = sprite; RW.v3soul.CL = CL;
  // names, sizes, blurbs and drops
  const BLURB = {
    knight: 'A drowned knight, a skull under its hood and crab-shell on its shoulders. Slashes with a bone cleaver, charges, and sends a wave of drowned fire along the floor. Always drops its Knight Core.',
    archer: 'A drowned archer: nothing in the hood but two cold eyes. Looses horn arrows, rains a volley and fires a frost arrow that slows you. Always drops its Archer Core.',
    mage: 'A drowned mage with an empty hood that pours mist. Throws dark orbs, calls chain lightning, blinks beside you and bursts into a ring of orbs. Always drops its Mage Core.',
    healer: 'A drowned healer, hood down, a pale face under a tarnished circlet. It never attacks and can\'t heal the Leviathan, but mends and wards the other souls. It hides at the back. Always drops its Healer Core.',
  };
  Object.keys(L.GCLASS).forEach((id) => {
    const G = L.GCLASS[id], sp = RW.SPECIES[id]; G.name = CL[G.cls].name; G.blurb = BLURB[G.cls];
    if (sp) Object.assign(sp, { name: G.name, blurb: G.blurb, w: 28, h: 54, drops: [[CL[G.cls].core, 1, 1, 1], ['crystal_dust', 0.8, 1, 3], ['leviathan_scale', 0.4, 1, 2]] });
  });
  const A = RW.art; const D = A.drawers || (A.drawers = {});
  Object.keys(L.GCLASS).forEach((id) => { const cls = L.GCLASS[id].cls; D['v3guardian_' + cls] = () => [sprite(cls, 0, false)[0], sprite(cls, 2, true)[0]]; });
  if (A._spCache) Object.keys(L.GCLASS).forEach((id) => delete A._spCache[id]);
})(window.RW);
