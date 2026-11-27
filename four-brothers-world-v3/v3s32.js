// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 32: keeper waystones and Portkeys (Rock World).
//  * Waystones are stone arches with a shimmering gate. One stands by the rune keeper in Stalagmere's guesthouse, and
//    one in a keeper's camp in every deep layer (new worlds), where the same rune keeper waits to carve your runes.
//  * A waystone wakes the first time you come near it. Woken ones show on the map (M). Like Terraria's pylons: when
//    you stand by a waystone, open the map and click another woken one to step out of it.
//  * Portkey: a small rune-cut stone key (stacks to 10; 20 stone + 5 glow mushrooms + a platinum bar at the forge).
//    Use it (right click) anywhere and it takes you to the nearest woken waystone, leaving a portal there. Step into
//    the portal to go back to where you were; then it closes.
(function (RW) {
  'use strict';
  const P = RW.player, E = RW.ent, WD = RW.world, U = RW.ui, R = RW.register, A = RW.art, TS = RW.TILE;
  const L = RW.v3ringsLib, def = RW.WORLDS && RW.WORLDS.rock;
  if (!P || !WD || !R || !def) return;
  function addTile(d) { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; }
  const GATE = addTile({ key: 'v3waygate', name: 'Waystone Gate', solid: false, hard: 99, time: 99, drop: null, decor: 'v3gate', light: [0.25, 0.4, 0.6] });
  const ARCH = addTile({ key: 'v3waystone', name: 'Waystone', solid: true, hard: 99, time: 99, drop: null, colors: ['#5a5e70', '#7a8098', '#3a3e4e'], tex: 'brick', light: [0.05, 0.08, 0.14] });
  if (A.buildTiles) { try { A.buildTiles(); } catch (e) { /* plain */ } }
  R.item({ id: 'v3_portkey', name: 'Portkey', kind: 'material', stack: 10, icon: { s: 'key', a: '#8a90a8', b: '#6ac8ff' }, desc: 'A small stone key cut with a rune. Use it (right click) to step to the nearest woken waystone; a portal there takes you back once.' });
  R.recipes([{ out: 'v3_portkey', in: { stone: 20, glow_mushroom: 5, platinum_bar: 1 }, at: 'forge' }]);

  const NAMES = ['Stalagmere Waystone', 'Coral Waystone', 'Kelp Waystone', 'Scald Waystone', 'Bone Waystone', 'Void Waystone'];
  const on = () => WD.def && WD.def.id === 'rock' && WD.meta;
  const worldKey = () => (RW.v3slots && RW.v3slots.world) || 'none';
  const woken = () => new Set(RW.store.get('v3ways@w' + worldKey(), []));
  const wake = (id) => { const s = woken(); if (s.has(id)) return false; s.add(id); RW.store.set('v3ways@w' + worldKey(), Array.from(s)); return true; };

  // ---------------- building them ----------------
  function arch(fg, W, x, y, brick) { // x: the gate's middle column; y: the floor row under it
    for (let dx = -3; dx <= 3; dx++) fg[y * W + x + dx] = brick; // the step
    for (let k = 1; k <= 6; k++) { fg[(y - k) * W + x - 2] = ARCH; fg[(y - k) * W + x + 2] = ARCH; }
    for (let dx = -2; dx <= 2; dx++) fg[(y - 7) * W + x + dx] = ARCH;
    fg[(y - 8) * W + x] = ARCH;
    for (let k = 1; k <= 6; k++) for (const dx of [-1, 0, 1]) fg[(y - k) * W + x + dx] = GATE;
  }
  function build(out) {
    const W = out.W, H = out.H, fg = out.fg, m = out.meta, T = RW.T, ways = [];
    // Stalagmere: beside the guesthouse
    if (m.npcs && m.npcs.guesthouse) { const q = m.npcs.guesthouse; ways.push({ id: 0, name: NAMES[0], x: q.x, y: q.y + 1, small: true }); }
    // a keeper's camp in every deep layer
    if (m.v3rings && m.v3rings.bands && L) {
      const avoid = []; (m.v3lairs || []).forEach((l) => avoid.push([l.x - l.rx - 14, l.x + l.rx + 14])); (m.v3structs || []).forEach((q) => avoid.push([q.x - 14, q.x + q.w + 14]));
      if (m.v3shaft) avoid.push([m.v3shaft.x - 14, m.v3shaft.x + 14]);
      for (let b = 0; b < 5; b++) {
        const j = 5 - b, ym = L.midOf(j) - 10; let x = Math.round(W * (0.12 + 0.19 * b)), tries = 0;
        while (avoid.some((a) => x >= a[0] && x <= a[1]) && tries++ < 60) x += 9;
        const brick = T['v3k_' + b + '_bricks'] || L.ROCK[j];
        // the camp: a room 24 wide, 11 tall, floored with the layer's bricks
        for (let yy = ym - 10; yy <= ym; yy++) for (let xx = x - 12; xx <= x + 12; xx++) { const r = L.regionAt(xx, yy); if (r.seal) continue; fg[yy * W + xx] = T.water; }
        for (let xx = x - 13; xx <= x + 13; xx++) { fg[(ym + 1) * W + xx] = brick; fg[(ym + 2) * W + xx] = L.ROCK[j]; }
        arch(fg, W, x - 5, ym + 1, brick);
        const lamp = T['v3k_' + b + '_lamp']; if (lamp != null) { fg[ym * W + x + 9] = lamp; fg[ym * W + x - 11] = lamp; }
        ways.push({ id: b + 1, name: NAMES[b + 1], x: x - 5, y: ym + 1, keeper: { x: x + 3, y: ym } });
      }
    }
    m.v3ways = ways;
  }
  const prevGen = def.generate;
  def.generate = function () {
    const out = prevGen.apply(this, arguments);
    try { if (out && out.meta && out.meta.v3rings && !(out.fg instanceof Uint8Array)) build(out); } catch (e) { console.warn('v3 waystones', e); }
    return out;
  };
  // the Stalagmere one is small: a gate beside the keeper, drawn as a standing stone (no blocks changed in town)
  // keepers at every camp (the same rune keeper)
  const baseInit = E.initNpcs;
  E.initNpcs = function () {
    const r = baseInit.apply(this, arguments);
    try { if (on() && RW.SPECIES.v2_runekeeper) (WD.meta.v3ways || []).forEach((w) => { if (!w.keeper) return; const q = w.keeper; E.npcs.push({ id: 'v2_runekeeper', x: q.x * TS - 1, y: (q.y + 1) * TS - 34, w: 18, h: 34, home: q.x * TS, face: -1, t: Math.random() * 4, vx: 0, vy: 0, v3camp: w.id }); }); } catch (e) { console.warn(e); }
    return r;
  };

  // ---------------- waking, standing near, portals ----------------
  const wayPos = (w) => ({ x: (w.small ? w.x - 2 : w.x) * TS + 8, y: w.y * TS - 2 }); // where you stand
  const nearWay = (r) => { const c = P.center(); return (WD.meta.v3ways || []).find((w) => { const p = wayPos(w); return Math.abs(p.x - c.x) < (r || 4) * TS && Math.abs(p.y - 20 - c.y) < (r || 4) * TS; }); };
  function jump(x, y) {
    const c = P.center(); RW.fx.burst(c.x, c.y, ['#6ac8ff', '#ffffff', '#3a6aa8'], 24, 140, { add: true, kind: 'glow', life: 0.6 });
    P.x = x - P.w / 2; P.y = y - P.h; P.vx = P.vy = 0;
    if (RW.fx.ring) RW.fx.ring(x, y - P.h / 2, '#6ac8ff', 40, 0.5, 3); RW.audio && RW.audio.sfx && RW.audio.sfx('portal');
    RW.fx.burst(x, y - P.h / 2, ['#6ac8ff', '#ffffff'], 24, 140, { add: true, kind: 'glow', life: 0.6 });
  }
  let wakeT = 0, portalCd = 0;
  const baseUpd = P.update;
  P.update = function (dt) {
    const r = baseUpd.apply(this, arguments);
    if (!on() || P.dead) return r;
    if ((wakeT -= dt) <= 0) { wakeT = 0.4; const w = nearWay(6); if (w && wake(w.id)) { U.banner && U.banner(w.name + ' wakes', 'Stand by a waystone and open the map (M) to travel to any woken one.'); RW.fx.flash('#6ac8ff', 0.2); } }
    // the portal home
    const pt = P.flags.v3portal; portalCd -= dt;
    if (pt && pt.w === worldKey() && portalCd <= 0) { const c = P.center(); if (Math.hypot(c.x - pt.x, c.y - (pt.y - 16)) < 14) { P.flags.v3portal = null; jump(pt.bx, pt.by); U.toast('The portal folds shut behind you.'); portalCd = 2; } }
    return r;
  };
  RW.v3useItem = RW.v3useItem || {};
  RW.v3useItem.v3_portkey = () => {
    if (!on()) { U.toast('The key is cold. It only works in Rock World.'); return true; }
    const s = woken(), c = P.center(), list = (WD.meta.v3ways || []).filter((w) => s.has(w.id));
    if (!list.length) { U.toast('The key is cold. Wake a waystone first (walk up to one).'); return true; }
    let best = null, bd = 1e12; list.forEach((w) => { const p = wayPos(w), d = Math.hypot(p.x - c.x, p.y - c.y); if (d < bd) { bd = d; best = w; } });
    P.remove('v3_portkey', 1); U.renderInv && U.renderInv();
    const back = { bx: c.x, by: P.y + P.h }, p = wayPos(best);
    jump(p.x, p.y); P.flags.v3portal = { w: worldKey(), x: p.x + 3 * TS, y: p.y, bx: back.bx, by: back.by }; portalCd = 1.5;
    U.toast('The key crumbles. A portal back waits beside the ' + best.name + '.'); return true;
  };

  // ---------------- drawing: gate shimmer, the Stalagmere stone, the portal ----------------
  const baseDecor = A.drawDecor;
  A.drawDecor = function (g, t, sx, sy, time) {
    if (t && t.decor === 'v3gate') {
      const tt = (time || performance.now() / 1000);
      g.fillStyle = 'rgba(60,120,200,0.35)'; g.fillRect(sx, sy, 16, 16);
      for (let k = 0; k < 6; k++) { const yy = (k * 5 + tt * 18) % 16, xx = (k * 7 + Math.floor(tt * 3)) % 14; g.fillStyle = k % 2 ? 'rgba(160,220,255,0.6)' : 'rgba(255,255,255,0.45)'; g.fillRect(sx + xx, sy + Math.floor(yy), 2, 2); }
      return;
    }
    return baseDecor.apply(this, arguments);
  };
  const baseTiles = WD.drawTiles;
  WD.drawTiles = function (g, cam, vw, vh, time) {
    const r = baseTiles.apply(this, arguments);
    if (!on() || (RW.v3zoom && RW.v3zoom.far())) return r;
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y), tt = time || performance.now() / 1000;
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    (WD.meta.v3ways || []).forEach((w) => { // Stalagmere's waystone: a carved standing stone with a glowing rune
      if (!w.small) return; const x = (w.x - 2) * TS + ox, y = w.y * TS + oy;
      if (x < -40 || y < -60 || x > vw + 40 || y > vh + 60) return;
      g.fillStyle = '#3a3e4e'; g.fillRect(x + 2, y - 30, 12, 30); g.fillStyle = '#5a5e70'; g.fillRect(x + 3, y - 29, 10, 28); g.fillStyle = '#7a8098'; g.fillRect(x + 3, y - 29, 10, 2);
      const a = 0.6 + 0.4 * Math.sin(tt * 2); g.fillStyle = 'rgba(106,200,255,' + a.toFixed(2) + ')'; g.fillRect(x + 6, y - 22, 4, 1); g.fillRect(x + 7, y - 22, 1, 8); g.fillRect(x + 8, y - 18, 2, 1);
    });
    const pt = P.flags.v3portal; // the portal home
    if (pt && pt.w === worldKey()) {
      const x = pt.x + ox, y = pt.y + oy;
      for (let k = 0; k < 10; k++) { const a = tt * 3 + k * 0.63, rr = 7 + (k % 3); g.fillStyle = k % 2 ? 'rgba(106,200,255,0.8)' : 'rgba(255,255,255,0.7)'; g.fillRect(Math.round(x + Math.cos(a) * rr * 0.7) - 1, Math.round(y - 14 + Math.sin(a) * rr) - 1, 2, 2); }
      g.fillStyle = 'rgba(40,90,170,0.35)'; g.fillRect(x - 5, y - 24, 10, 20);
    }
    g.restore();
    return r;
  };

  // ---------------- the map: woken waystones, and travel from one ----------------
  const MV = () => U.mapView;
  const toMap = (c, wx, wy) => [(wx - MV().cx) * MV().z + c.width / 2, (wy - MV().cy) * MV().z + c.height / 2];
  const baseDM = U.drawMap;
  if (baseDM) U.drawMap = function () {
    const r = baseDM.apply(this, arguments);
    try {
      const c = document.getElementById('mapc'); if (!c || !on() || !MV()) return r;
      const g = c.getContext('2d'), s = woken(), here = nearWay(4);
      (WD.meta.v3ways || []).forEach((w) => {
        if (!s.has(w.id)) return; const [x, y] = toMap(c, w.x + 0.5, w.y - 3);
        g.fillStyle = '#0a0c14'; g.fillRect(x - 7, y - 9, 14, 16); g.fillStyle = here && here.id !== w.id ? '#6ac8ff' : '#8a90a8';
        g.fillRect(x - 6, y - 8, 3, 14); g.fillRect(x + 3, y - 8, 3, 14); g.fillRect(x - 6, y - 8, 12, 3); g.fillStyle = 'rgba(106,200,255,0.6)'; g.fillRect(x - 3, y - 5, 6, 11);
        if (here && here.id === w.id) { g.strokeStyle = '#ffd860'; g.lineWidth = 2; g.strokeRect(x - 9, y - 11, 18, 20); }
      });
      if (here) { g.fillStyle = 'rgba(8,8,14,0.75)'; g.fillRect(8, 8, 330, 22); g.fillStyle = '#cfe8ff'; g.font = '14px monospace'; g.fillText('At the ' + here.name + ': click a waystone to travel.', 14, 24); }
    } catch (e) { /* map only */ }
    return r;
  };
  let down = null;
  document.addEventListener('pointerdown', (e) => { if (e.target && e.target.id === 'mapc') down = { x: e.clientX, y: e.clientY }; }, true);
  document.addEventListener('click', (e) => {
    const c = e.target; if (!c || c.id !== 'mapc' || !on() || !MV()) return;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return; // that was a drag
    const here = nearWay(4); if (!here) return;
    const rct = c.getBoundingClientRect(), mx = (e.clientX - rct.left) * c.width / rct.width, my = (e.clientY - rct.top) * c.height / rct.height, s = woken();
    const hit = (WD.meta.v3ways || []).find((w) => { if (!s.has(w.id) || w.id === here.id) return false; const [x, y] = toMap(c, w.x + 0.5, w.y - 3); return Math.abs(mx - x) < 12 && Math.abs(my - y) < 12; });
    if (!hit) return;
    U.closeModal && U.closeModal(); const p = wayPos(hit); jump(p.x, p.y); U.toast('You step out of the ' + hit.name + '.');
  }, true);

  RW.v3ways = { woken, wake, wayPos, nearWay, NAMES };
})(window.RW);
