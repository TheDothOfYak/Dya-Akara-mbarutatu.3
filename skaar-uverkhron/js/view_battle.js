/* ============================================================
   SKAAR UVERKHRON — js/view_battle.js
   The battle on screen: a hex field seen at a slant, painted
   for the ground it is fought on, the town walls in a siege,
   creatures that move, strike, shoot and fall, the hero's songs,
   and the controls for whoever's turn it is.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, RU = SU.rules, A = SU.art, BT = SU.battle, HX = SU.hex;
  const U = SU.ui, el = U.el, btn = U.btn;
  const BV = SU.battleView = {};
  const YS = 0.74;   // the slant: hexes are squashed so the field reads as ground
  const rgba = A.rgba;

  /* control(side) → 'human' | 'ai' | 'remote'; done(report).
     net (online battles): { send(cmd), next() → cmd or null }. Both devices run the same
     battle from the same state; only a person's choices travel, the dice agree. */
  BV.start = function (B, control, done, net) {
    BV.net = net || null;
    BV.B = B; BV.control = control; BV.done = done; BV.anims = []; BV.pos = {}; BV.off = {}; BV.mode = null; BV.hover = null; BV.over = false;
    B.units.forEach(u => { u._n = u.n; u._hp = u.hpTop; u._dying = 0; });
    const scr = document.getElementById('battle'); scr.innerHTML = ''; scr.classList.remove('hidden');
    SU.mapView.hidden = true;
    BV.cv = el('canvas', { cls: 'bg' }); scr.appendChild(BV.cv);
    BV.sideL = el('div', { cls: 'bside l panel' }); BV.sideR = el('div', { cls: 'bside r panel' }); scr.appendChild(BV.sideL); scr.appendChild(BV.sideR);
    BV.logEl = el('div', { cls: 'blog' }); scr.appendChild(BV.logEl);
    BV.bar = el('div', { cls: 'bbar' }); scr.appendChild(BV.bar);
    BV.card = el('div', { cls: 'panel unitcard hidden' }); scr.appendChild(BV.card);
    BV.cv.onmousemove = e => { const r = BV.cv.getBoundingClientRect(); BV.mx = e.clientX - r.left; BV.my = e.clientY - r.top; BV.hover = pick(BV.mx, BV.my); hoverCard(e); };
    BV.cv.onmouseleave = () => { BV.hover = null; BV.card.classList.add('hidden'); };
    BV.cv.onclick = e => { const r = BV.cv.getBoundingClientRect(); click(pick(e.clientX - r.left, e.clientY - r.top), e.clientX - r.left, e.clientY - r.top); };
    BV.cv.oncontextmenu = e => { e.preventDefault(); const B = BV.B, h = BV.hover; const u = B && h && BT.unitAt(B, h.c, h.r); if (!u) return;
      if (u.kind === 'cap') SU.dialogs.captainCard(u.cap); else SU.dialogs.creatureCard(u.cr, { stack: { cr: u.cr, n: u.n, hpTop: u.hpTop } }); };
    drainAnims();
    renderBar();
    if (!BV.raf) { const loop = now => { BV.raf = requestAnimationFrame(loop); if (!document.getElementById('battle').classList.contains('hidden')) frame(now); }; BV.raf = requestAnimationFrame(loop); }
    BV.t0 = performance.now(); BV.last = BV.t0;
    setTimeout(tick, 300);
  };
  SU.on('screenkey', e => {
    if (document.getElementById('battle').classList.contains('hidden') || !BV.B) return;
    const k = e.key.toLowerCase(); if (!humanTurn()) return;
    if (k === 'w') act({ type: 'wait' }); else if (k === 'd' || k === ' ') act({ type: 'defend' }); else if (k === 's') songMenu(); else if (k === 'escape') { BV.mode = null; renderBar(); }
  });

  /* ======================= geometry ======================= */
  function geo() {
    const r = BV.cv.getBoundingClientRect(), B = BV.B;
    const top = 70, bottom = 70, availW = r.width - 40, availH = r.height - top - bottom;
    const R = Math.min(availW / (Math.sqrt(3) * (B.cols + 0.5)), availH / ((1.5 * (B.rows - 1) + 2) * YS));
    const fw = Math.sqrt(3) * R * (B.cols + 0.5), fh = (1.5 * R * (B.rows - 1) + 2 * R) * YS;
    return { R, ox: (r.width - fw) / 2 + Math.sqrt(3) * R / 2, oy: top + (availH - fh) / 2 + R * YS, w: r.width, h: r.height };
  }
  function center(c, r, G) { G = G || geo(); return { x: G.ox + Math.sqrt(3) * G.R * (c + 0.5 * (r & 1)), y: G.oy + 1.5 * G.R * r * YS }; }
  function pick(mx, my) {
    const G = geo(), B = BV.B; let best = null, bd = 1e9;
    for (let r = 0; r < B.rows; r++) for (let c = 0; c < B.cols; c++) { const p = center(c, r, G); const d = Math.hypot(mx - p.x, (my - p.y) / YS); if (d < bd) { bd = d; best = { c, r }; } }
    return bd < G.R ? best : null;
  }
  /* the middle of a unit's whole footprint (big creatures cover several hexes) */
  function footOffset(u, G) {
    const cells = BT.cellsOf(u, u.c, u.r); if (cells.length === 1) return { x: 0, y: 0 };
    const h = center(u.c, u.r, G); let x = 0, y = 0;
    cells.forEach(([c, r]) => { const q = center(c, r, G); x += q.x; y += q.y; });
    return { x: x / cells.length - h.x, y: y / cells.length - h.y };
  }
  function unitCenter(u, G) {
    G = G || geo();
    const p = BV.pos[u.uid] || center(u.c, u.r, G), o = footOffset(u, G), d = BV.off && BV.off[u.uid];
    return { x: p.x + o.x + (d ? d.x : 0), y: p.y + o.y + (d ? d.y : 0) };
  }

  /* ======================= animation queue ======================= */
  function drainAnims() { const B = BV.B; while (B.anim.length) BV.anims.push(B.anim.shift()); }
  function animating() { return BV.anims.length > 0 || BV.cur; }
  function stepAnims(now) {
    const G = geo();
    if (!BV.cur && BV.anims.length) { BV.cur = BV.anims.shift(); BV.cur.t0 = now; BV.cur.dur = { move: 260, hit: 520, shoot: 460, dmg: 160, blink: 300, song: 450, tower: 360, wall: 300, boulder: 420, luck: 200, chaos: 380, rise: 700 }[BV.cur.kind] || 200; if (SU.ui.fast) BV.cur.dur *= 0.5; }
    const a = BV.cur; if (!a) return;
    const k = Math.min(1, (now - a.t0) / a.dur);
    const u = a.uid != null && BV.B.units.find(x => x.uid === a.uid);
    if (a.kind === 'move' && u) { const p = center(a.from[0], a.from[1], G), q = center(a.to[0], a.to[1], G); BV.pos[u.uid] = { x: SU.lerp(p.x, q.x, k), y: SU.lerp(p.y, q.y, k) - (a.fly ? Math.sin(k * Math.PI) * G.R * 1.2 : Math.abs(Math.sin(k * Math.PI * 3)) * G.R * 0.12) }; if (k >= 1) delete BV.pos[u.uid]; }
    if (a.kind === 'blink' && u) { u._alpha = k < 0.5 ? 1 - k * 2 : (k - 0.5) * 2; if (k >= 1) u._alpha = 1; }
    if ((a.kind === 'hit' || a.kind === 'shoot' || a.kind === 'boulder' || a.kind === 'wall') && u) { u._pose = 'attack'; u._poseT = k; if (k >= 1) u._pose = null; }
    if (a.kind === 'hit' && u) { const tu = BV.B.units.find(x => x.uid === a.target);
      if (tu) { const p = center(u.c, u.r, G), q = center(tu.c, tu.r, G), L = Math.max(1, Math.hypot(q.x - p.x, q.y - p.y)), dx = (q.x - p.x) / L, dy = (q.y - p.y) / L;
        const lunge = k < 0.55 ? Math.sin(k / 0.55 * Math.PI / 2) : Math.cos((k - 0.55) / 0.45 * Math.PI / 2);
        BV.off[u.uid] = { x: dx * G.R * 0.75 * lunge, y: dy * G.R * 0.75 * lunge - Math.sin(k * Math.PI) * G.R * 0.12 };
        if (k >= 0.5 && !a._struck) { a._struck = true; tu._flash = 1; tu._reel = 1; tu._reelDir = [dx, dy]; spark(q.x - dx * G.R * 0.3, q.y - G.R * 0.7, now); }
        if (k >= 1) delete BV.off[u.uid]; } }
    if (a.kind === 'shoot' && k >= 0.95 && !a._struck) { a._struck = true; const tu = BV.B.units.find(x => x.uid === a.target); if (tu) { tu._flash = 1; tu._reel = 0.6; const p = u ? center(u.c, u.r, G) : center(tu.c, tu.r, G), q = center(tu.c, tu.r, G), L = Math.max(1, Math.hypot(q.x - p.x, q.y - p.y)); tu._reelDir = [(q.x - p.x) / L, (q.y - p.y) / L]; spark(q.x, q.y - G.R * 0.7, now); } }
    if (a.kind === 'rise' && u) { if (!a._seen) { a._seen = true; u._n = a.nAfter; u._hp = a.hpAfter; u._dying = 0; u._rise = 0; } u._rise = k; if (k >= 1) u._rise = null; }
    if (a.kind === 'chaos' && u) { u._pose = 'chaos'; if (k >= 1) u._pose = null; }
    if (a.kind === 'dmg' && !a._seen) { a._seen = true; const t = BV.B.units.find(x => x.uid === a.uid); if (t) { t._flash = 1; if (a.nAfter != null) { t._n = a.nAfter; t._hp = a.hpAfter; if (a.nAfter <= 0) t._dying = 1; } (BV.floats = BV.floats || []).push({ uid: a.uid, text: '-' + a.amount + (a.killed ? '  ☠' + a.killed : ''), t0: now }); } }
    if (a.kind === 'luck') (BV.floats = BV.floats || []).push({ uid: a.uid, text: '✦ luck', t0: now, col: '#9ff0a0' });
    if (k >= 1) BV.cur = null;
  }

  /* ======================= drawing ======================= */
  function frame(now) {
    const B = BV.B; if (!B) return;
    const dt = Math.min(64, now - BV.last); BV.last = now; const t = (now - BV.t0) / 1000;
    stepAnims(now);
    if (!animating()) B.units.forEach(u => { if (!(u._dying > 0)) { u._n = u.n; u._hp = u.hpTop; } });
    B.units.forEach(u => { if (u._dying > 0) u._dying = Math.max(0, u._dying - dt / 750); if (u._reel > 0) u._reel = Math.max(0, u._reel - dt / 260); });
    const r = BV.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (BV.cv.width !== Math.round(r.width * dpr)) { BV.cv.width = Math.round(r.width * dpr); BV.cv.height = Math.round(r.height * dpr); BV.bgKey = null; }
    const g = BV.cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const G = geo();
    drawBackground(g, G);
    /* hexes */
    const act = !animating() && BT.activeUnit(B), reach = act && humanTurn() ? BT.reach(B, act) : null;
    for (let rr = 0; rr < B.rows; rr++) for (let c = 0; c < B.cols; c++) {
      const p = center(c, rr, G), k = c + ',' + rr;
      hexPath(g, p.x, p.y, G.R * 0.97);
      if (reach && reach.has(k)) { g.fillStyle = 'rgba(255,230,160,0.13)'; g.fill(); }
      g.strokeStyle = 'rgba(255,240,210,0.13)'; g.lineWidth = 1; g.stroke();
    }
    if (BV.hover && reach) { const p = center(BV.hover.c, BV.hover.r, G); hexPath(g, p.x, p.y, G.R * 0.97); g.strokeStyle = 'rgba(255,236,190,0.7)'; g.lineWidth = 2; g.stroke(); }
    /* things on the field, back to front */
    const items = [];
    B.obstacles.forEach(k => { const [c, rr] = k.split(',').map(Number); items.push({ y: center(c, rr, G).y, fn: () => drawObstacle(g, B.obstacleKind, center(c, rr, G), G.R) }); });
    if (B.siege) drawSiege(g, G, t, items);
    const raising = BV.mode && BV.mode.kind === 'song' && D.SONGS[BV.mode.song].target === 'body';
    B.units.forEach(u => {
      const shownDead = (u._n != null ? u._n : u.n) <= 0;
      if (shownDead && !(u._dying > 0)) { const p = unitCenter(u, G); items.push({ y: p.y - G.h, fn: () => drawBody(g, u, p, G, raising && BT.canRaise(B, u, BT.activeUnit(B) && BT.activeUnit(B).side), t) }); return; }
      const p = unitCenter(u, G);
      items.push({ y: p.y, fn: () => drawUnit(g, u, p, G, t, act) });
    });
    items.sort((a, b) => a.y - b.y).forEach(i => i.fn());
    /* projectiles */
    const a = BV.cur;
    if (a && (a.kind === 'shoot' || a.kind === 'tower' || a.kind === 'boulder')) {
      const k = Math.min(1, (now - a.t0) / a.dur);
      const from = a.kind === 'tower' ? center(a.from[0], a.from[1], G) : unitCenter(B.units.find(x => x.uid === a.uid), G);
      const tu = a.kind === 'boulder' ? null : B.units.find(x => x.uid === a.target);
      const to = a.kind === 'boulder' ? center(a.to[0], a.to[1], G) : unitCenter(tu, G);
      const x = SU.lerp(from.x, to.x, k), y = SU.lerp(from.y - G.R, to.y - G.R * 0.6, k) - Math.sin(k * Math.PI) * G.R * (a.kind === 'boulder' ? 3 : 1.2);
      const cr = a.cr && D.CREATURES[a.cr];
      g.save();
      if (a.kind === 'boulder') { g.fillStyle = A.radial(g, x, y, G.R * 0.35, '#a8a395', '#4a4640'); A.ell(g, x, y, G.R * 0.3, G.R * 0.26); g.fill(); }
      else if (cr && cr.art === 'tyndael') { g.shadowColor = '#ff8a3a'; g.shadowBlur = 16; g.fillStyle = A.radial(g, x, y, G.R * 0.3, '#fff2b0', '#ff6a10'); A.ell(g, x, y, G.R * 0.26, G.R * 0.26); g.fill(); }
      else if (cr && cr.art === 'ver') { g.strokeStyle = 'rgba(200,180,255,0.8)'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x - i * 8, y, G.R * (0.2 + i * 0.12), -0.8, 0.8); g.stroke(); } }
      else { g.strokeStyle = '#e8e0d0'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - (to.x - from.x) * 0.06, y - (to.y - from.y) * 0.06); g.stroke(); }
      g.restore();
    }
    if (a && a.kind === 'song') { const k = Math.min(1, (now - a.t0) / a.dur); const tu = a.target != null && B.units.find(x => x.uid === a.target); const p = tu ? unitCenter(tu, G) : { x: G.w / 2, y: G.h / 2 };
      g.save(); g.globalAlpha = 1 - k; g.strokeStyle = '#c9b8ff'; g.shadowColor = '#8e7cff'; g.shadowBlur = 20; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y - G.R * 0.6, G.R * (0.5 + k * 2.5), 0, Math.PI * 2); g.stroke(); g.restore(); }
    /* sparks where blows land */
    BV.sparks = (BV.sparks || []).filter(s => now - s.t0 < 320);
    BV.sparks.forEach(s => { const k = (now - s.t0) / 320; g.save(); g.globalAlpha = 1 - k; g.strokeStyle = '#fff2c0'; g.shadowColor = '#ffcf6a'; g.shadowBlur = 12; g.lineWidth = 2.2;
      for (let i = 0; i < 7; i++) { const an = i * 0.9 + s.t0 % 7, r0 = G.R * (0.1 + k * 0.3), r1 = G.R * (0.3 + k * 0.6); g.beginPath(); g.moveTo(s.x + Math.cos(an) * r0, s.y + Math.sin(an) * r0); g.lineTo(s.x + Math.cos(an) * r1, s.y + Math.sin(an) * r1); g.stroke(); } g.restore(); });
    /* floating numbers */
    BV.floats = (BV.floats || []).filter(f => now - f.t0 < 1100);
    BV.floats.forEach(f => { const u = B.units.find(x => x.uid === f.uid); if (!u) return; const p = unitCenter(u, G), k = (now - f.t0) / 1100;
      g.save(); g.globalAlpha = 1 - k; g.font = 'bold ' + Math.round(G.R * 0.42) + 'px Georgia'; g.textAlign = 'center'; g.fillStyle = f.col || '#ff8a7a'; g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeText(f.text, p.x, p.y - G.R * 1.6 - k * G.R); g.fillText(f.text, p.x, p.y - G.R * 1.6 - k * G.R); g.restore(); });
    B.units.forEach(u => { if (u._flash) u._flash = Math.max(0, u._flash - dt / 260); });
    /* hover: what would happen */
    if (BV.hover && humanTurn() && act) drawIntent(g, G, act);
  }
  function hexPath(g, x, y, R) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R * YS; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); }
  const GROUND = { grass: ['#4f7a32', '#36561f'], dirt: ['#7a5c3a', '#56402a'], rough: ['#6c675a', '#4a463c'], sand: ['#c2a66a', '#9a8048'], snow: ['#d8e2ea', '#a8b8c8'], swamp: ['#45543a', '#2c3826'], ash: ['#4a3a34', '#2c201c'], dusk: ['#3a3150', '#221c30'], moon: ['#a8a6b8', '#78768a'], water: ['#6a8a5a', '#4a6a3a'] };
  function drawBackground(g, G) {
    const B = BV.B, key = B.terrain + G.w + 'x' + G.h + (B.siege ? 's' : '');
    if (BV.bgKey !== key) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const c = A.canvas(G.w * dpr, G.h * dpr), h = c.getContext('2d'); h.scale(dpr, dpr);
      const [c0, c1] = GROUND[B.terrain] || GROUND.grass;
      const horizon = G.oy - G.R * 2.2;
      h.fillStyle = A.lin(h, 0, 0, 0, horizon, [[0, B.layer === 3 ? '#05050c' : '#20283a'], [1, B.layer === 3 ? '#1a1830' : '#6a7a8a']]); h.fillRect(0, 0, G.w, horizon + 2);
      if (B.layer === 3) for (let i = 0; i < 120; i++) { h.fillStyle = 'rgba(255,255,255,0.7)'; h.fillRect((i * 173) % G.w, (i * 61) % horizon, 1.5, 1.5); }
      h.fillStyle = A.shade(c1, -30); h.beginPath(); h.moveTo(0, horizon); for (let x = 0; x <= G.w; x += 40) h.lineTo(x, horizon - 20 - Math.abs(Math.sin(x * 0.013)) * 50); h.lineTo(G.w, horizon); h.fill();
      h.fillStyle = A.lin(h, 0, horizon, 0, G.h, [[0, c1], [0.25, c0], [1, A.shade(c0, -40)]]); h.fillRect(0, horizon, G.w, G.h - horizon);
      const tex = A.terrainTex(B.terrain === 'water' ? 'grass' : B.terrain, 1, 96);
      h.globalAlpha = 0.35; for (let y = horizon; y < G.h; y += 96 * YS) for (let x = 0; x < G.w; x += 96) h.drawImage(tex, x, y, 96, 96 * YS); h.globalAlpha = 1;
      const vg = h.createRadialGradient(G.w / 2, G.h * 0.55, G.h * 0.3, G.w / 2, G.h * 0.55, G.w * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); h.fillStyle = vg; h.fillRect(0, 0, G.w, G.h);
      BV.bg = c; BV.bgKey = key;
    }
    g.drawImage(BV.bg, 0, 0, G.w, G.h);
    if (BV.B.inEye) { g.fillStyle = 'rgba(255,245,210,0.06)'; g.fillRect(0, 0, G.w, G.h); }
  }
  function drawObstacle(g, kind, p, R) {
    const map = { tree: 'tree', rock: 'rock', cactus: 'palm', pine: 'pine', reeds: 'reeds', deadtree: 'deadtree', shard: 'crystal', crystal: 'crystal' };
    const sp = A.obstacle(map[kind] || 'rock', 3, Math.round(R * 1.5));
    g.drawImage(sp.c, p.x - sp.c.width / 2, p.y - sp.c.height + R * 1.5 * 0.55 + R * 0.2);
  }
  function drawSiege(g, G, t, items) {
    const S_ = BV.B.siege;
    S_.cells.forEach(w => { const p = center(w.c, w.r, G);
      items.push({ y: p.y - 1, fn: () => {
        if (w.hp <= 0) { g.fillStyle = 'rgba(80,74,90,0.9)'; for (let i = 0; i < 4; i++) { A.ell(g, p.x + (i - 1.5) * G.R * 0.4, p.y + Math.sin(i) * 4, G.R * 0.28, G.R * 0.18); g.fill(); } return; }
        const h = G.R * (w.gate ? 1.5 : 1.9), wd = G.R * 1.75;
        g.fillStyle = A.lin(g, p.x - wd / 2, 0, p.x + wd / 2, 0, [[0, '#6a6480'], [1, '#3a3450']]); g.fillRect(p.x - wd / 2, p.y - h, wd, h);
        g.strokeStyle = 'rgba(10,8,14,0.6)'; g.lineWidth = 1; for (let y = p.y - h + 8; y < p.y; y += 8) { g.beginPath(); g.moveTo(p.x - wd / 2, y); g.lineTo(p.x + wd / 2, y); g.stroke(); }
        g.fillStyle = '#5a5470'; for (let k = 0; k < 3; k++) g.fillRect(p.x - wd / 2 + k * wd / 3 + 2, p.y - h - 6, wd / 3 - 6, 6);
        if (w.gate) { g.fillStyle = '#2a1a10'; g.beginPath(); g.moveTo(p.x - wd * 0.3, p.y); g.lineTo(p.x - wd * 0.3, p.y - h * 0.6); g.arc(p.x, p.y - h * 0.6, wd * 0.3, Math.PI, 0); g.lineTo(p.x + wd * 0.3, p.y); g.fill(); }
        if (w.hp < w.max) { g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x - wd * 0.2, p.y - h * 0.9); g.lineTo(p.x, p.y - h * 0.5); g.lineTo(p.x - wd * 0.1, p.y - h * 0.2); g.stroke(); }
        g.strokeStyle = 'rgba(10,8,14,0.9)'; g.lineWidth = 1.5; g.strokeRect(p.x - wd / 2, p.y - h, wd, h);
      } });
    });
    S_.towers.forEach(tw => { const p = center(tw.c, tw.r, G); items.push({ y: p.y, fn: () => {
      const h = G.R * 3.2, wd = G.R * 1.4;
      g.fillStyle = A.lin(g, p.x - wd / 2, 0, p.x + wd / 2, 0, [[0, '#6a6480'], [1, '#2a2440']]); g.fillRect(p.x - wd / 2, p.y - h, wd, h);
      g.fillStyle = '#2a2440'; g.beginPath(); g.moveTo(p.x - wd * 0.7, p.y - h); g.lineTo(p.x, p.y - h - G.R * 1.4); g.lineTo(p.x + wd * 0.7, p.y - h); g.fill();
      g.save(); g.shadowColor = '#b9a8ff'; g.shadowBlur = 10; g.fillStyle = '#d9ccff'; g.fillRect(p.x - 3, p.y - h * 0.7, 6, 10); g.restore();
    } }); });
  }
  function drawUnit(g, u, p, G, t, act) {
    const B = BV.B, sd = B.sides[u.side], col = sd.owner >= 0 ? U.st.players[sd.owner].color : D.NEUTRAL_COLOR;
    const isAct = act && act.uid === u.uid;
    /* the base: a coloured ring under each stack */
    const sw = (u.shape || [1, 1])[0], sh = (u.shape || [1, 1])[1];
    g.save(); g.fillStyle = rgba(col, isAct ? 0.55 : 0.3); A.ell(g, p.x, p.y, G.R * (0.8 + (sw - 1) * 0.85), G.R * 0.36 * (1 + (sh - 1) * 1.6)); g.fill();
    if (isAct) { g.strokeStyle = 'rgba(255,236,160,' + (0.6 + Math.sin(t * 5) * 0.3) + ')'; g.lineWidth = 2; g.stroke(); }
    g.restore();
    const f = u.side === 0 ? 1 : -1;
    g.save();
    if (u._reel > 0 && u._reelDir) g.translate(u._reelDir[0] * G.R * 0.22 * u._reel, u._reelDir[1] * G.R * 0.22 * u._reel);
    if (u._dying > 0) { const k = 1 - u._dying; g.globalAlpha = Math.max(0.35, 1 - k * 0.5); g.translate(p.x, p.y); g.rotate(-f * k * 1.35); g.translate(-p.x, -p.y); }
    if (u._rise != null) { g.globalAlpha = Math.min(1, 0.2 + u._rise); g.translate(p.x, p.y); g.rotate(-f * (1 - u._rise) * 1.35); g.translate(-p.x, -p.y); }
    if (u.kind === 'cap') A.captain(g, p.x, p.y, G.R * 1.75, u.cap, col, t + u.uid, f, u._pose);
    else {
      const C = D.CREATURES[u.cr]; const sc = G.R * ({ malsti: 2.3, punk: 1.7, uff: 2.1, velnur: 1.9, ver: 1.75, harkal: 1.45, kaloeik: 1.55, tyndael: 1.6, xiweik: 2.5, lutut: 2.1, nekh: 2.7, kuni: 1.5, naga: 1.5, ularnaga: 1.9, mcfly: 2 }[C.art] || 1.6);
      const extra = C.art === 'nekh' ? { flat: true, stretch: 3.9 } : {};
      A.creature(g, C.art, p.x + (C.art === 'nekh' ? f * G.R * 3.9 : 0), p.y + (C.art === 'nekh' ? G.R * 0.9 : sh > 1 ? G.R * 0.35 : 0), sc, Object.assign({ t: t + u.uid * 0.7, f, tint: C.tint || (C.upgraded ? 1 : 0), pose: u._pose, poseT: u._poseT, flash: u._flash, alpha: u._alpha != null ? u._alpha : (u.temp ? 0.85 : 1), color: col }, extra));
    }
    g.restore();
    if (u._dying > 0) return;
    /* count badge */
    const txt = u.kind === 'cap' ? '★' : String(u._n != null ? u._n : u.n);
    g.font = 'bold ' + Math.round(G.R * 0.38) + 'px Georgia'; const tw = g.measureText(txt).width + 10;
    const bx = p.x + (u.side === 0 ? G.R * 0.35 : -G.R * 0.35 - tw), by = p.y + G.R * 0.12;
    g.fillStyle = u.kind === 'cap' ? '#3a2a5a' : (u.side === 0 ? '#3a2a14' : '#2a1414'); g.strokeStyle = col; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect ? g.roundRect(bx, by, tw, G.R * 0.5, 4) : g.rect(bx, by, tw, G.R * 0.5); g.fill(); g.stroke();
    g.fillStyle = '#ffe9b8'; g.textAlign = 'left'; g.fillText(txt, bx + 5, by + G.R * 0.4);
    if (u.kind === 'cap' || (u._n != null ? u._n : u.n) === 1) { const hpw = G.R * 0.9, frac = (u._hp != null ? u._hp : u.hpTop) / u.hp; g.fillStyle = '#000'; g.fillRect(p.x - hpw / 2, p.y + G.R * 0.7, hpw, 3); g.fillStyle = frac > 0.5 ? '#8fd06a' : frac > 0.25 ? '#e8b84a' : '#e0665a'; g.fillRect(p.x - hpw / 2, p.y + G.R * 0.7, hpw * frac, 3); }
    const icons = []; if (u.fx.stun) icons.push('✶'); if (u.fx.slow) icons.push('⇣'); if (u.fx.quick) icons.push('⇡'); if (u.fx.shroud) icons.push('☁'); if (u.fx.burn) icons.push('🔥'); if (u.defending) icons.push('⛨'); if (u.fx.ward) icons.push('◈');
    if (icons.length) { g.font = Math.round(G.R * 0.32) + 'px Georgia'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(icons.join(' '), p.x, p.y - G.R * 1.9); }
  }
  /* where a stack fell: its bodies stay on the field */
  function drawBody(g, u, p, G, canRaise, t) {
    const f = u.side === 0 ? 1 : -1, sw = (u.shape || [1, 1])[0];
    g.save();
    g.fillStyle = 'rgba(60,8,8,0.35)'; A.ell(g, p.x, p.y + G.R * 0.05, G.R * (0.75 + (sw - 1) * 0.8), G.R * 0.28); g.fill();
    if (canRaise) { g.strokeStyle = 'rgba(200,184,255,' + (0.5 + Math.sin(t * 5) * 0.3) + ')'; g.lineWidth = 2; g.shadowColor = '#8e7cff'; g.shadowBlur = 12; g.stroke(); g.shadowBlur = 0; }
    g.globalAlpha = 0.62; if ('filter' in g) g.filter = 'grayscale(0.75) brightness(0.55)';
    g.translate(p.x, p.y); g.rotate(-f * 1.35); g.translate(-p.x, -p.y);
    if (u.kind === 'cap') A.captain(g, p.x, p.y, G.R * 1.6, u.cap, '#3a3a3a', 0, f);
    else { const C = D.CREATURES[u.cr]; const sc = G.R * ({ malsti: 2.1, velnur: 1.7, ver: 1.6, harkal: 1.3, kaloeik: 1.4, tyndael: 1.4, xiweik: 2.2, lutut: 1.9, nekh: 2.2, ularnaga: 1.7, mcfly: 1.8 }[C.art] || 1.5);
      A.creature(g, C.art, p.x, p.y, sc, { t: 0, f, tint: C.tint || (C.upgraded ? 1 : 0), noShadow: true, flat: C.art === 'nekh' }); }
    g.restore();
  }
  /* a burst where a blow lands */
  function spark(x, y, now) { (BV.sparks = BV.sparks || []).push({ x, y, t0: now }); }
  function drawIntent(g, G, act) {
    const B = BV.B, h = BV.hover, tgt = BT.unitAt(B, h.c, h.r);
    if (tgt && tgt.side !== act.side) {
      const shoot = BT.canShoot(B, act);
      const p = unitCenter(tgt, G);
      g.save(); g.font = Math.round(G.R * 0.6) + 'px Georgia'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(shoot ? '➶' : '⚔', p.x, p.y - G.R * 1.2); g.restore();
      if (!shoot) { const spot = bestSpot(act, tgt); if (spot) { const q = center(spot.c, spot.r, G); hexPath(g, q.x, q.y, G.R * 0.8); g.strokeStyle = 'rgba(255,120,90,0.9)'; g.lineWidth = 2; g.stroke(); } }
    }
  }
  function bestSpot(u, t) {
    const B = BV.B, spots = BT.attackSpots(B, u, t); if (!spots.length) return null;
    if (BV.mx == null) return spots[0];
    const G = geo(); let best = spots[0], bd = 1e9;
    spots.forEach(s => { const p = center(s.c, s.r, G); const d = Math.hypot(p.x - BV.mx, p.y - BV.my) + s.d * 4; if (d < bd) { bd = d; best = s; } });
    return best;
  }
  function hoverCard(e) {
    const B = BV.B, h = BV.hover; const u = h && BT.unitAt(B, h.c, h.r);
    const body = !u && h && BT.bodyAt(B, h.c, h.r);
    if (body) { const C = D.CREATURES[body.cr]; BV.card.innerHTML = '<b>Here lie ' + body.startN + ' ' + U.esc(C.plural) + '</b> (' + U.esc(B.sides[body.side].label) + ')<br><span class="muted">A song of Rekindling could raise some of them.</span>'; BV.card.classList.remove('hidden'); BV.card.style.left = Math.min(window.innerWidth - 240, e.clientX + 16) + 'px'; BV.card.style.top = Math.max(10, e.clientY - 80) + 'px'; return; }
    if (!u) { BV.card.classList.add('hidden'); return; }
    const sd = B.sides[u.side], act = BT.activeUnit(B);
    const lines = [];
    if (u.kind === 'cap') lines.push('<b>Captain ' + U.esc(u.name) + '</b> — ' + D.CAPTAIN_RANKS[u.cap.rank].name, 'Health ' + u.hpTop + ' / ' + u.hp + ' · Attack ' + u.atk + ' · Defense ' + u.def, D.CAPTAIN_ABIL[u.cap.abil].name + ': ' + D.CAPTAIN_ABIL[u.cap.abil].desc);
    else { const C = D.CREATURES[u.cr]; lines.push('<b>' + u.n + ' ' + C.plural + '</b> (' + U.esc(sd.label) + ')', 'Attack ' + u.atk + ' · Defense ' + u.def + ' · Damage ' + C.dmg[0] + '–' + C.dmg[1], 'Health ' + u.hpTop + ' / ' + u.hp + ' · Speed ' + u.spd + (u.ranged ? ' · Shots ' + u.shots : ''), 'Morale ' + (u.morale == null ? 60 : u.morale) + ' (' + BT.moraleWord(u.morale == null ? 60 : u.morale) + ')' + (B.el === C.el ? ' · comfortable here' : '')); }
    if (act && act.side !== u.side && humanTurn()) { const shoot = BT.canShoot(B, act); const est = BT.estimate(U.st, B, act, u, shoot); lines.push('<span class="gold">' + (shoot ? 'Shoot' : 'Attack') + ': about ' + est + ' damage, ' + Math.min(u.n, Math.floor(est / u.hp)) + '–' + Math.min(u.n, Math.ceil(est / u.hp)) + ' fall</span>'); }
    BV.card.innerHTML = lines.join('<br>'); BV.card.classList.remove('hidden');
    BV.card.style.left = Math.min(window.innerWidth - 240, e.clientX + 16) + 'px'; BV.card.style.top = Math.max(10, e.clientY - 80) + 'px';
  }

  /* ======================= controls ======================= */
  function humanTurn() { const B = BV.B, u = BT.activeUnit(B); return !!(u && !B.over && BV.control(u.side) === 'human' && !animating()); }
  BV._act = a => act(a);   /* for the tests */
  BV._sing = (song, target, c, r) => doSing(song, target, c, r);
  function act(a) { if (!humanTurn()) return; const r = BT.act(U.st, BV.B, a); if (!r.ok) { if (r.why) U.toast(r.why); return; } send({ k: 'act', a: { type: a.type, t: a.target ? a.target.uid : null, c: a.c, r: a.r } }); BV.mode = null; after(); }
  function send(cmd) { if (BV.net) BV.net.send(cmd); }
  /* a move made on the other player's device */
  function applyRemote(cmd) {
    const B = BV.B, U_ = uid => uid == null ? null : B.units.find(x => x.uid === uid) || null;
    if (cmd.k === 'act') return BT.act(U.st, B, Object.assign({}, cmd.a, { target: U_(cmd.a.t) }));
    if (cmd.k === 'sing') return BT.sing(U.st, B, cmd.side, cmd.song, U_(cmd.t), cmd.c, cmd.r);
    if (cmd.k === 'surr') return BT.surrender(U.st, B, cmd.side, cmd.cost);
    return { ok: false };
  }
  function after() { drainAnims(); renderBar(); setTimeout(tick, 60); }
  function click(h, mx, my) {
    const B = BV.B; if (!h || !humanTurn()) return;
    const u = BT.activeUnit(B), t = BT.unitAt(B, h.c, h.r);
    if (BV.mode) return modeClick(h, t);
    if (t && t.side !== u.side) { if (BT.canShoot(B, u)) act({ type: 'shoot', target: t }); else { const s = bestSpot(u, t); if (s) act({ type: 'attack', target: t, c: s.c, r: s.r }); else U.toast('Out of reach.'); } return; }
    if (B.siege && u.side === 0) { const w = B.siege.cells.get(h.c + ',' + h.r); if (w && w.hp > 0) { act({ type: 'wall', c: h.c, r: h.r }); return; } }
    if (!t || t === u) { if (!t) act({ type: 'move', c: h.c, r: h.r }); }
  }
  function modeClick(h, t) {
    const B = BV.B, m = BV.mode, sd = BT.activeUnit(B).side;
    if (m.kind === 'song') {
      const S_ = D.SONGS[m.song];
      if (S_.target === 'body') { const bd = BT.bodyAt(BV.B, h.c, h.r); if (!bd) { U.toast('Click where one of your fallen stacks lies.'); return; } doSing(m.song, bd); return; }
      if (S_.target === 'allyMove') { if (!m.target) { if (t && t.side === sd) { m.target = t; U.toast('Now click where they should go.'); } return; } doSing(m.song, m.target, h.c, h.r); return; }
      doSing(m.song, t); return;
    }
    if (m.kind === 'shift') { if (!m.target) { if (t && t.side === sd && t.shape[0] * t.shape[1] === 1 && t.uid !== BT.activeUnit(B).uid) { m.target = t; U.toast('Now click where they should go.'); } return; } act({ type: 'shift', target: m.target, c: h.c, r: h.r }); return; }
    if (m.kind === 'boulder') { const w = B.siege && B.siege.cells.get(h.c + ',' + h.r); if (w && w.hp > 0) act({ type: 'boulder', c: h.c, r: h.r }); return; }
  }
  function doSing(song, target, c, r) {
    const B = BV.B, side = BT.activeUnit(B).side;
    const res = BT.sing(U.st, B, side, song, target, c, r);
    if (!res.ok) { U.toast(res.why || 'That song cannot go there.'); return; }
    send({ k: 'sing', side, song, t: target ? target.uid : null, c, r });
    BV.mode = null; after();
  }
  function songMenu() {
    const B = BV.B, u = BT.activeUnit(B); if (!u) return;
    if (!BT.canSingNow(U.st, B, u.side)) { U.toast(B.sides[u.side].hushed ? 'You are hushed this round.' : 'You have sung this round already.'); return; }
    const h = U.st.heroes[B.sides[u.side].heroId];
    const songs = h.songs.filter(s => D.SONGS[s].where === 'battle');
    const m = U.modal([el('h2', { text: h.name + ' sings' }), el('p', { cls: 'small muted', text: 'Breath ' + Math.round(h.breath) + '. One song a round.' }),
      el('div', { cls: 'col' }, songs.map(sid => { const s = D.SONGS[sid]; const ok = h.breath >= s.breath && RU.canSing(U.st, h, sid);
        return el('div', { cls: 'row frame' }, [el('div', { style: { flex: 1 } }, [el('b', { text: s.name }), el('div', { cls: 'small muted', text: s.desc })]), el('span', { cls: 'small', text: s.breath + ' Breath' }), btn('Sing', () => { m.close(); if (s.target === 'none') doSing(sid, null); else { BV.mode = { kind: 'song', song: sid }; U.toast({ ally: 'Click one of your stacks.', allyMove: 'Click one of your stacks.', enemy: 'Click an enemy stack.', enemyArea: 'Click an enemy stack.', captain: 'Click one of your captains.', body: 'Click where one of your fallen stacks lies.' }[s.target]); renderBar(); } }, 'duat', null)].map(x => { if (x && x.tagName === 'BUTTON' && !ok) x.disabled = true; return x; })); })),
      el('div', { cls: 'acts' }, [btn('Close', () => m.close())])]);
  }
  function renderBar() {
    const B = BV.B, u = BT.activeUnit(B), st = U.st;
    const side = i => { const s = B.sides[i], h = s.heroId && st.heroes[s.heroId], col = s.owner >= 0 ? st.players[s.owner].color : D.NEUTRAL_COLOR;
      return [h ? U.portrait(h.people, h.look, col, 40) : null, el('div', {}, [el('b', { text: s.label }), el('div', { cls: 'small muted', text: h ? 'Breath ' + Math.round(h.breath) + (s.sung ? ' · sang this round' : '') : (s.owner < 0 ? 'The wilds' : '') })])]; };
    BV.sideL.innerHTML = ''; side(0).forEach(x => x && BV.sideL.appendChild(x));
    BV.sideR.innerHTML = ''; side(1).forEach(x => x && BV.sideR.appendChild(x));
    BV.logEl.innerHTML = B.log.slice(-40).map(l => '<div>' + U.esc(l) + '</div>').join(''); BV.logEl.scrollTop = 1e6;
    BV.bar.innerHTML = '';
    if (B.over) return;
    const mine = u && BV.control(u.side) === 'human';
    BV.bar.appendChild(el('div', { cls: 'gold', style: { minWidth: '260px' } }, u ? (mine ? 'Your move: ' : BV.control(u.side) === 'remote' ? (st.players[B.sides[u.side].owner] || {}).name + ' is choosing: ' : 'Waiting: ') + (u.kind === 'cap' ? 'Captain ' + u.name : u.n + ' ' + u.name) + ' (round ' + B.round + ')' : ''));
    if (!mine) return;
    BV.bar.appendChild(btn('Wait (W)', () => act({ type: 'wait' }), '', 'Act later this round'));
    BV.bar.appendChild(btn('Defend (D)', () => act({ type: 'defend' }), '', '+30% defense until its next turn'));
    const sd = B.sides[u.side], h = sd.heroId && st.heroes[sd.heroId];
    if (h && h.songs.some(s => D.SONGS[s].where === 'battle')) BV.bar.appendChild(btn('Sing (S)', songMenu, 'duat'));
    if (BT.canShift(B, u)) BV.bar.appendChild(btn('Shift an ally', () => { BV.mode = { kind: 'shift' }; U.toast('Click one of your single-hex stacks.'); }, 'duat', 'Kalo’Eik with a Naelst Velki: move an ally through the Duat'));
    if (B.siege && u.side === 0 && u.abil && u.abil.includes('boulder')) BV.bar.appendChild(btn('Hurl a boulder', () => { BV.mode = { kind: 'boulder' }; U.toast('Click a piece of wall.'); }));
    if (BV.mode) BV.bar.appendChild(btn('Cancel', () => { BV.mode = null; renderBar(); }));
    BV.bar.appendChild(el('span', { cls: 'spacer' }));
    if (h && sd.owner >= 0) BV.bar.appendChild(btn('Surrender', () => surrender(u.side), 'danger', 'Pay to leave the field with your hero and army'));
  }
  function surrender(side) {
    const B = BV.B, st = U.st, other = B.sides[1 - side];
    const base = BT.surrenderCost(st, B, side);
    const go = cost => { const r = BT.surrender(st, B, side, cost); if (!r.ok) { U.toast(r.why); return; } send({ k: 'surr', side, cost }); after(); };
    if (BV.net) { U.confirm('Surrender?', 'Pay ' + base + ' gold to leave the field. Your hero and army go home.', () => go(base)); return; }
    if (other.owner >= 0 && st.players[other.owner].kind === 'human' && other.owner !== B.sides[side].owner) {
      /* the other player names the price */
      const inp = el('input', { cls: 'inp', type: 'number', value: base, min: 0, step: 100 });
      const m = U.modal([el('h2', { text: B.sides[side].label + ' wishes to surrender' }), el('p', { text: st.players[other.owner].name + ', name your price.' }), inp, el('div', { cls: 'acts' }, [btn('Refuse', () => m.close()), btn('Accept', () => { m.close(); const c = Math.max(0, +inp.value || 0); if (st.players[B.sides[side].owner].res.gold < c) { U.toast('They cannot pay that much.'); return; } go(c); }, 'primary')])], { dismiss: false });
    } else U.confirm('Surrender?', 'Pay ' + base + ' gold to leave the field. Your hero and army go home.', () => go(base));
  }

  /* ======================= the loop ======================= */
  BV.kick = () => setTimeout(tick, 30);
  function tick() {
    const B = BV.B; if (!B || BV.over) return;
    if (animating()) { setTimeout(tick, 60); return; }
    if (B.over) return finish();
    const u = BT.activeUnit(B); if (!u) return finish();
    renderBar();
    if (BV.control(u.side) === 'remote') {
      const cmd = BV.net && BV.net.next();
      if (!cmd) { setTimeout(tick, 400); return; }
      const r = applyRemote(cmd); if (!r || !r.ok) console.warn('A move from the other device did not fit', cmd);
      drainAnims(); renderBar(); setTimeout(tick, 60); return;
    }
    if (BV.control(u.side) === 'ai') { setTimeout(() => { if (BV.over || !BT.activeUnit(B) || animating()) { setTimeout(tick, 60); return; } BT.aiMove(U.st, B); drainAnims(); renderBar(); setTimeout(tick, 60); }, SU.ui.fast ? 80 : 260); }
  }
  function finish() {
    if (BV.over) return; BV.over = true;
    const B = BV.B; renderBar();
    setTimeout(() => {
      const rep = BT.finish(U.st, B);
      SU.dialogs.battleReport(rep, B, () => { document.getElementById('battle').classList.add('hidden'); SU.mapView.hidden = !document.getElementById('town').classList.contains('hidden'); BV.B = null; if (BV.done) BV.done(rep, B); });
    }, 700);
  }
})(typeof window !== 'undefined' ? window : globalThis);
