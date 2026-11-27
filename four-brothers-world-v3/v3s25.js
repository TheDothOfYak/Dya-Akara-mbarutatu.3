// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 25: the ring bosses.
//  * Each lives in its lair cave (meta.v3lairs from v3s22) and wakes when you swim in. Beaten, it drops its ring's
//    boss ore (the next rune is carved from it) and coins, and comes back after four minutes for anyone who needs more.
//      Grindmaw, the Stonehide Shark (Coral Caverns): bite and tail swipe; burrows into the cave wall and bursts out
//        somewhere else in a spray of rubble; spits a chum cloud that calls reef fish; below half health a blood
//        frenzy: circling faster and faster, then a lunge.
//      The Frondwraith (Kelp Grottos), a slate sea dragon: snap and leaf blades; hides in plain sight and strikes from
//        nowhere; tangles you in kelp; regrows from kelp walls nearby (cut them!); whips a kelp stalk across the cave;
//        calls a school of fish.
//      Scaldjaw (Scald Vents), an eel in a basalt shell: bite and tail slap; shells up and can't be hurt until one of
//        its geysers flips it over; boils the water around it; hops from vent to vent; spits magma.
//      The Gravekeeper (Boneyard Hollows), the mid boss: a seated rock titan with a lantern hand and an anchor hand,
//        like a temple golem. The hands slam, flare, swing the anchor on its chain, pull you in, call bone spikes and
//        lantern souls. Its head can't be hurt until both hands are broken; then it rises bigger from the bones.
//        Break the lantern and the hollow goes dark.
//  * Bosses are pixel sprites (one sprite pixel = 2 units) drawn after the water.
(function (RW) {
  'use strict';
  const P = RW.player, E = RW.ent, WD = RW.world, U = RW.ui, R = RW.register, VA = RW.v3art, TS = RW.TILE, A = RW.art;
  if (!P || !E || !WD || !R || !VA) return;
  const PX = 2;
  const sh = (c, k) => RW.shade(c, k);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); c.ctx = c.getContext('2d'); c.ctx.imageSmoothingEnabled = true; return c; };
  const poly = (g, pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const px = (g, x, y, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const line = (g, x0, y0, x1, y1, col, w) => { g.strokeStyle = col; g.lineWidth = w || 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };

  // ======================= sprites =======================
  const STONE = ['#22242a', '#363a42', '#4c525a', '#666c74', '#8a9098'], BELLY = ['#6a6a62', '#8e8c80', '#b0ac9c'];
  function shark(frame, open, frenzy) {
    const c = mk(56, 26), g = c.ctx, sw = frame ? 2 : -2, S = frenzy ? ['#2a1a1c', '#4a2a2c', '#6a3a3a', '#8a5048', '#a87060'] : STONE;
    poly(g, [[4, 13 + sw], [0, 3 + sw], [6, 9], [11, 12], [6, 15], [1, 23 + sw]], S[1]); // tail
    poly(g, [[22, 6], [28, 0], [33, 7]], S[2]); // dorsal fin
    poly(g, [[9, 12], [16, 7], [34, 5], [46, 8], [54, 12], [50, 14], [40, 16], [24, 18], [12, 16]], S[2]); // body
    poly(g, [[16, 8], [34, 6], [46, 9], [34, 10], [18, 11]], S[3]); // lit back plates
    poly(g, [[14, 15], [30, 16], [44, 14], [40, 17], [24, 18]], BELLY[1]); // belly
    poly(g, [[26, 16], [32, 22], [36, 16]], S[1]); // pectoral fin
    for (const x of [20, 27, 34, 41]) line(g, x, 7, x - 1, 15, S[0]); // seams between the stone plates
    line(g, 23, 9, 26, 12, S[0]); line(g, 38, 8, 40, 11, S[0]); // cracks
    for (const x of [42, 44, 46]) line(g, x, 10, x, 13, S[0]); // gills
    if (open) { poly(g, [[44, 13], [55, 11], [52, 19], [44, 16]], '#1a0606'); for (let x = 45; x < 54; x += 2) { px(g, x, 13, '#e8e0c8'); px(g, x + 1, 17, '#e8e0c8'); } }
    else { line(g, 44, 14, 54, 12, S[0]); for (let x = 46; x < 54; x += 3) px(g, x, 14, '#e8e0c8'); }
    px(g, 49, 10, frenzy ? '#ff3a2a' : '#e04030'); px(g, 50, 10, '#ffd0a0');
    VA.finish(c, [].concat(S, BELLY, ['#1a0606', '#e8e0c8', '#e04030', '#ff3a2a', '#ffd0a0', '#0a0808'])); return c;
  }
  const SLATE = ['#1a2620', '#2a3a30', '#3e5244', '#56705a', '#78907a'], FROND = ['#2a4a1e', '#4a7a2e', '#7aa84a', '#a8d070'];
  function dragon(frame, open) {
    const c = mk(64, 34), g = c.ctx, sw = frame ? 1 : -1;
    poly(g, [[2, 20], [8, 16], [14, 18], [10, 24], [4, 26]], SLATE[1]); // curled tail
    poly(g, [[8, 17], [20, 12], [36, 11], [46, 13], [50, 16], [40, 20], [24, 21], [12, 21]], SLATE[2]); // body
    poly(g, [[20, 13], [36, 12], [44, 14], [34, 15], [22, 15]], SLATE[3]);
    poly(g, [[46, 13], [52, 9], [62, 11], [63, 13], [54, 15], [48, 17]], SLATE[2]); // long snout
    poly(g, [[50, 10], [60, 11], [56, 12]], SLATE[4]);
    if (open) { poly(g, [[52, 14], [63, 13], [58, 18]], '#140c08'); px(g, 56, 14, '#d8d0b4'); px(g, 59, 14, '#d8d0b4'); }
    px(g, 51, 11, '#e8c040'); px(g, 52, 11, '#fff0a0');
    // leafy fronds: the kelp it pretends to be
    [[14, 21, 4], [20, 21, 6], [27, 21, 8], [34, 20, 6], [40, 19, 5], [18, 12, -6], [26, 11, -8], [33, 11, -6], [44, 12, -5]].forEach(([x, y, L], k) => {
      const s = Math.sign(L), n = Math.abs(L); for (let i = 0; i < n; i++) { const xx = x + Math.round(Math.sin(i * 0.8 + k + sw) * 1.5), yy = y + i * s; px(g, xx, yy, FROND[(i + k) % 2 ? 1 : 2]); if (i % 2) px(g, xx + 1, yy, FROND[0]); }
      px(g, x + Math.round(Math.sin(n * 0.8 + k + sw) * 1.5), y + n * s, FROND[3]);
    });
    VA.finish(c, [].concat(SLATE, FROND, ['#140c08', '#d8d0b4', '#e8c040', '#fff0a0'])); return c;
  }
  const BASALT = ['#141012', '#221c1e', '#342a2c', '#4a3c3a'], HOT = ['#6a1e10', '#c84a20', '#ff8a3a', '#ffd0a0'], EEL = ['#3a1a14', '#6a3020', '#9a5030', '#c88060'];
  function shell(headOut, flipped, frame) {
    const c = mk(70, 40), g = c.ctx;
    g.save(); if (flipped) { g.translate(35, 20); g.rotate(Math.PI); g.translate(-35, -20); }
    // the basalt shell: a coiled cone, cracked with fire
    poly(g, [[6, 32], [4, 20], [12, 8], [24, 4], [36, 8], [42, 18], [40, 32]], BASALT[2]);
    poly(g, [[10, 26], [12, 14], [22, 9], [32, 12], [36, 20], [32, 28]], BASALT[3]);
    poly(g, [[16, 22], [18, 15], [26, 13], [30, 18], [26, 24]], BASALT[1]);
    for (const [a, b, d, e] of [[12, 10, 18, 18], [30, 8, 28, 16], [38, 22, 30, 26], [8, 28, 16, 24]]) { line(g, a, b, d, e, HOT[1]); }
    px(g, 15, 14, HOT[2]); px(g, 29, 12, HOT[2]); px(g, 33, 25, HOT[3]);
    poly(g, [[4, 32], [42, 32], [40, 36], [6, 36]], BASALT[1]);
    if (headOut) { // the eel, out of the shell's mouth, jaw working
      const y0 = 22 + (frame ? 1 : 0);
      poly(g, [[38, y0 - 6], [52, y0 - 7], [64, y0 - 4], [68, y0], [60, y0 + 4], [46, y0 + 5], [38, y0 + 4]], EEL[1]);
      poly(g, [[40, y0 - 5], [56, y0 - 6], [64, y0 - 3], [52, y0 - 2]], EEL[2]);
      poly(g, [[56, y0 + 1], [68, y0], [62, y0 + 6]], '#1a0606'); for (let x = 58; x < 67; x += 2) px(g, x, y0 + 1, '#e8e0c8');
      px(g, 58, y0 - 4, '#ffd040'); px(g, 59, y0 - 4, '#fff0b0');
      for (let k = 0; k < 4; k++) px(g, 44 + k * 4, y0 - 6, HOT[2]);
    } else poly(g, [[38, 18], [42, 18], [42, 26], [38, 26]], '#0a0606'); // the dark mouth of the shell
    g.restore();
    VA.finish(c, [].concat(BASALT, HOT, EEL, ['#0a0606', '#1a0606', '#e8e0c8', '#ffd040', '#fff0b0'])); return c;
  }
  const ROCK = ['#26221e', '#3a342e', '#52483e', '#6e6252', '#8e8068'], BONE = ['#8a8470', '#b8ae90', '#e8e0c8'];
  function titan(risen, dark) {
    const c = mk(66, 70), g = c.ctx;
    // the seated titan: legs folded under, a broad chest of stone slabs, bones strapped to it, a heavy head
    poly(g, [[8, 66], [10, 52], [24, 48], [42, 48], [56, 52], [58, 66]], ROCK[1]); // folded legs
    poly(g, [[12, 50], [10, 26], [18, 18], [48, 18], [56, 26], [54, 50]], ROCK[2]); // chest
    poly(g, [[16, 46], [14, 28], [22, 22], [44, 22], [50, 28], [48, 46]], ROCK[3]);
    for (const y of [30, 36, 42]) { line(g, 18, y, 30, y + 2, BONE[1], 2); line(g, 48, y, 36, y + 2, BONE[1], 2); } // ribs strapped on
    line(g, 33, 22, 33, 46, ROCK[0]); line(g, 14, 34, 52, 34, ROCK[0]); // slab seams
    poly(g, [[20, 20], [22, 6], [28, 2], [38, 2], [44, 6], [46, 20]], ROCK[2]); // head
    poly(g, [[24, 18], [25, 8], [30, 5], [36, 5], [41, 8], [42, 18]], ROCK[3]);
    poly(g, [[22, 4], [18, 0], [26, 2]], BONE[2]); poly(g, [[44, 4], [48, 0], [40, 2]], BONE[2]); // bone horns
    const eye = dark ? '#c8f0ff' : risen ? '#ff5a3a' : '#7ae0ff';
    poly(g, [[26, 11], [31, 10], [31, 13], [26, 13]], '#08060a'); poly(g, [[35, 10], [40, 11], [40, 13], [35, 13]], '#08060a');
    px(g, 28, 11, eye); px(g, 29, 11, eye); px(g, 37, 11, eye); px(g, 38, 11, eye);
    line(g, 27, 16, 39, 16, ROCK[0]); for (let x = 28; x < 39; x += 2) px(g, x, 17, BONE[2]); // a grim mouth of bone teeth
    VA.finish(c, [].concat(ROCK, BONE, ['#08060a', eye])); return c;
  }
  function lanternHand(lit) {
    const c = mk(24, 28), g = c.ctx, glow = lit ? ['#5ab894', '#c0f8dc'] : ['#2a2a30', '#3a3a40'];
    poly(g, [[3, 4], [16, 2], [20, 8], [18, 14], [6, 14], [2, 10]], ROCK[2]); for (const x of [6, 10, 14]) line(g, x, 4, x, 12, ROCK[0]); // stone fist
    line(g, 11, 14, 11, 17, '#3a3a40', 2);
    poly(g, [[6, 17], [16, 17], [17, 26], [5, 26]], '#2a2420'); poly(g, [[8, 19], [14, 19], [14, 24], [8, 24]], glow[0]); poly(g, [[10, 20], [12, 20], [12, 23], [10, 23]], glow[1]);
    VA.finish(c, [].concat(ROCK, ['#3a3a40', '#2a2420'], glow)); return c;
  }
  function anchorHand() {
    const c = mk(28, 30), g = c.ctx;
    poly(g, [[6, 2], [20, 2], [24, 8], [22, 14], [8, 14], [4, 8]], ROCK[2]); for (const x of [9, 13, 17]) line(g, x, 4, x, 12, ROCK[0]);
    line(g, 14, 14, 14, 26, '#4a4650', 2); line(g, 8, 18, 20, 18, '#4a4650', 2);
    poly(g, [[4, 22], [14, 28], [24, 22], [22, 26], [14, 30], [6, 26]], '#5a5660'); px(g, 4, 21, '#8a8690'); px(g, 24, 21, '#8a8690');
    VA.finish(c, [].concat(ROCK, ['#4a4650', '#5a5660', '#8a8690'])); return c;
  }
  const cache = {};
  const spr = (k, fn) => cache[k] || (cache[k] = fn());

  // ======================= the bosses =======================
  const B = {
    v3b_grindmaw: { name: 'Grindmaw', title: 'the Stonehide Shark', hp: 6500, dmg: 30, w: 100, h: 44, ore: 'fangstone', n: [3, 5], coins: 120, ring: 'r_coral' },
    v3b_frondwraith: { name: 'The Frondwraith', title: 'Who Hides in the Kelp', hp: 8500, dmg: 34, w: 110, h: 54, ore: 'leafscale', n: [3, 5], coins: 200, ring: 'r_kelp' },
    v3b_scaldjaw: { name: 'Scaldjaw', title: 'the Boiling Shell', hp: 10500, dmg: 38, w: 78, h: 60, ore: 'magmashell', n: [3, 5], coins: 320, ring: 'r_heat' },
    v3b_gravekeeper: { name: 'The Gravekeeper', title: 'Warden of the Old Bones', hp: 16000, dmg: 44, w: 110, h: 130, ore: 'gravesteel', n: [6, 9], coins: 600, ring: 'r_bone' },
    v3b_gk_lantern: { name: 'Lantern Hand', hp: 4500, dmg: 30, w: 44, h: 52, part: true },
    v3b_gk_anchor: { name: 'Anchor Hand', hp: 5000, dmg: 34, w: 52, h: 56, part: true },
  };
  RW.v3ringBosses = ['v3b_grindmaw', 'v3b_frondwraith', 'v3b_scaldjaw', 'v3b_gravekeeper'];
  const D = A.drawers || (A.drawers = {});
  const guide = { v3b_grindmaw: () => shark(0, 1, 0), v3b_frondwraith: () => dragon(0, 1), v3b_scaldjaw: () => shell(1, 0, 0), v3b_gravekeeper: () => titan(0, 0), v3b_gk_lantern: () => lanternHand(1), v3b_gk_anchor: () => anchorHand() };
  Object.keys(B).forEach((id) => {
    const b = B[id];
    D['v3rb_' + id] = () => { const s = guide[id](), f = mk(s.width, s.height); f.ctx.translate(s.width, 0); f.ctx.scale(-1, 1); f.ctx.drawImage(s, 0, 0); return [[s, f]]; };
    R.species({ id, type: 'monsters', name: b.name, world: 'rock', role: 'enemy', status: 'active', art: { draw: 'v3rb_' + id }, w: b.w, h: b.h, hp: b.hp, dmg: b.dmg, speed: 140, behavior: 'v3rb', drops: [], blurb: b.title ? b.name + ', ' + b.title + '. Lives in its lair in ' + ((RW.v3ringsLib && RW.v3ringsLib.NAMES[b.ring]) || 'the rings') + '.' : 'Part of the Gravekeeper.' });
  });
  if (RW.SPECIES.creepy_fish && !RW.SPECIES.v3_skelfish) R.species(Object.assign({}, RW.SPECIES.creepy_fish, { id: 'v3_skelfish', name: 'Skeleton Fish', hp: 140, dmg: 18, spawn: null, drops: [['bone', 0.5, 1, 2]], blurb: 'Old fish bones the Boneyard will not let rest.' }));

  // ======================= helpers =======================
  const ctr = (e) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
  const pc = () => P.center();
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const toward = (e, tx, ty, spd, dt, k) => { const c = ctr(e), a = Math.atan2(ty - c.y, tx - c.x); e.vx = RW.lerp(e.vx, Math.cos(a) * spd, Math.min(1, dt * (k || 3))); e.vy = RW.lerp(e.vy, Math.sin(a) * spd, Math.min(1, dt * (k || 3))); };
  const shot = (o) => E.shots.push(Object.assign({ life: 4, owner: 'e', kind: 'bshard' }, o));
  const lairOf = (id) => ((WD.meta && WD.meta.v3lairs) || []).find((l) => l.boss === id);
  const inLair = (l, x, y, k) => l && ((x / TS - l.x) / (l.rx * (k || 1))) ** 2 + ((y / TS - l.y) / (l.ry * (k || 1))) ** 2 <= 1;
  const say = (t) => U.toast && U.toast(t);
  function spawnFish(x, y, n, sp) { for (let k = 0; k < n; k++) { const e = E.spawnEnemy(sp || RW.pick(['creepy_fish', 'spiky_fish']), x + RW.rand(-50, 50), y + RW.rand(-30, 30)); if (e) e.provoked = true; } }
  const special = (e, list) => { e.state = RW.pick(list); e.st = 0; e.did = 0; e.k = 0; };

  // ======================= behaviours =======================
  E.behaviors.v3rb = function (e, dt, sp) {
    e.t = (e.t || 0) + dt; e.st = (e.st || 0) + dt; e.cd = (e.cd == null ? 2 : e.cd) - dt; e.scd = (e.scd == null ? 5 : e.scd) - dt;
    const c = ctr(e), p = pc(), d = dist(c, p); e.face = p.x > c.x ? 1 : -1;
    const fn = AI[e.sp]; if (fn) fn(e, dt, c, p, d);
    e.x += e.vx * dt; e.y += e.vy * dt;
    // stay inside the lair
    const l = lairOf(e.v3lair || e.sp); if (l && !B[e.sp].part) { const cx = l.x * TS + 8, cy = l.y * TS + 8, rx = l.rx * TS * 0.92, ry = l.ry * TS * 0.92, dx = (c.x - cx) / rx, dy = (c.y - cy) / ry, q = Math.hypot(dx, dy); if (q > 1) { e.x -= (c.x - cx) * (1 - 1 / q); e.y -= (c.y - cy) * (1 - 1 / q); e.vx *= 0.5; e.vy *= 0.5; } }
  };
  const AI = {
    // ----- Grindmaw -----
    v3b_grindmaw(e, dt, c, p, d) {
      const frenzy = e.hp < e.maxhp * 0.5; e.frenzy = frenzy; e.open = 0; e.alpha = null;
      if (!e.state || e.state === 'cruise') {
        e.oa = (e.oa || 0) + dt * (frenzy ? 1.6 : 1.0); const r = 190;
        toward(e, p.x + Math.cos(e.oa) * r, p.y + Math.sin(e.oa) * r * 0.6, frenzy ? 230 : 150, dt);
        if (e.cd <= 0) { e.cd = frenzy ? 1.6 : 2.4; e.state = d < 90 && Math.sign(p.x - c.x) !== Math.sign(e.vx || 1) ? 'tail' : 'bite'; e.st = 0; e.did = 0; }
        if (e.scd <= 0) { e.scd = 7 + Math.random() * 3; special(e, frenzy ? ['burrow', 'chum', 'frenzy', 'frenzy'] : ['burrow', 'chum']); }
      } else if (e.state === 'bite') {
        e.open = 1;
        if (e.st < 0.35) toward(e, p.x, p.y, 40, dt); else if (!e.did) { e.did = 1; const a = Math.atan2(p.y - c.y, p.x - c.x); e.vx = Math.cos(a) * 480; e.vy = Math.sin(a) * 480; RW.audio.sfx('roar'); }
        if (e.st > 0.95) e.state = 'cruise';
      } else if (e.state === 'tail') {
        if (!e.did && e.st > 0.3) { e.did = 1; if (d < 110) { P.hurt(22, Math.sign(p.x - c.x) || 1, 'tail'); P.vx = (Math.sign(p.x - c.x) || 1) * 380; P.vy = -150; } RW.fx.burst(c.x - e.face * 40, c.y, ['#c8e8ff', '#ffffff'], 14, 140, { kind: 'bubble' }); }
        if (e.st > 0.7) e.state = 'cruise';
      } else if (e.state === 'burrow') {
        if (!e.did) { e.did = 1; e.hidden = true; e.v3immune = true; say('Grindmaw dives into the rock!'); RW.fx.debris(c.x, c.y, STONE, 20); RW.fx.shake(5, 0.4); const a = Math.random() * 6.283; e.bx = p.x + Math.cos(a) * 160; e.by = p.y + Math.sin(a) * 90; }
        e.vx = 0; e.vy = 0; e.alpha = 0;
        if (e.st > 0.4 && e.st < 1.6 && Math.random() < dt * 30) RW.fx.debris(e.bx + RW.rand(-20, 20), e.by + RW.rand(-10, 10), STONE, 1);
        if (e.st > 1.6) { e.hidden = false; e.v3immune = false; e.x = e.bx - e.w / 2; e.y = e.by - e.h / 2; RW.fx.shake(9, 0.5); RW.audio.sfx('slam'); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; shot({ x: e.bx, y: e.by, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260 - 60, grav: 300, dmg: 16, kind: 'rain', color: RW.pick(STONE) }); } e.state = 'bite'; e.st = 0.3; e.did = 0; }
      } else if (e.state === 'chum') {
        if (!e.did) { e.did = 1; RW.fx.burst(c.x + e.face * 40, c.y, ['#8a2a2a', '#c84a3a', '#5a1a1a'], 40, 120, { life: 1.6, drag: 0.94 }); spawnFish(c.x, c.y, 5); say('Grindmaw spits a chum cloud. The reef fish come.'); }
        toward(e, c.x - e.face * 100, c.y, 60, dt); if (e.st > 1.2) e.state = 'cruise';
      } else if (e.state === 'frenzy') {
        const T = 3; e.oa = (e.oa || 0) + dt * (2 + e.st * 1.5); const r = RW.lerp(220, 70, Math.min(1, e.st / T));
        toward(e, p.x + Math.cos(e.oa) * r, p.y + Math.sin(e.oa) * r * 0.7, 320 + e.st * 60, dt, 6);
        if (Math.random() < dt * 20) RW.fx.spawn({ x: c.x, y: c.y, vx: -e.vx * 0.1, vy: -e.vy * 0.1, life: 0.7, color: '#8a2a2a', size: 2 });
        if (e.st > T) { e.state = 'bite'; e.st = 0.34; e.did = 0; }
      }
    },
    // ----- The Frondwraith -----
    v3b_frondwraith(e, dt, c, p, d) {
      e.open = 0; if (e.state !== 'camo') e.alpha = null;
      if (!e.state || e.state === 'drift') {
        const want = 170, k = d > want + 30 ? 1 : d < want - 30 ? -0.8 : 0, a = Math.atan2(p.y - c.y, p.x - c.x);
        e.vx = RW.lerp(e.vx, Math.cos(a) * 120 * k + Math.cos(a + 1.57) * 40 * Math.sin(e.t), dt * 2); e.vy = RW.lerp(e.vy, Math.sin(a) * 120 * k + Math.sin(e.t * 1.3) * 30, dt * 2);
        if (e.cd <= 0) { e.cd = 2.2; e.state = d < 110 ? 'snap' : 'blades'; e.st = 0; e.did = 0; }
        if (e.scd <= 0) { e.scd = 6.5 + Math.random() * 3; special(e, ['camo', 'tangle', 'regrow', 'whip', 'school']); }
      } else if (e.state === 'snap') {
        e.open = 1; if (!e.did && e.st > 0.3) { e.did = 1; const a = Math.atan2(p.y - c.y, p.x - c.x); e.vx = Math.cos(a) * 420; e.vy = Math.sin(a) * 420; } if (e.st > 0.8) e.state = 'drift';
      } else if (e.state === 'blades') {
        if (e.k < 3 && e.st > 0.25 + e.k * 0.25) { e.k++; const a = Math.atan2(p.y - c.y, p.x - c.x) + (e.k - 2) * 0.22; shot({ x: c.x + e.face * 40, y: c.y, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, dmg: 18, color: RW.pick(FROND) }); RW.audio.sfx('swing'); }
        if (e.st > 1.2) e.state = 'drift';
      } else if (e.state === 'camo') { // fades into the kelp, slides close, then the ambush
        e.alpha = Math.max(0.05, 1 - e.st * 2); e.v3immune = e.st > 0.4;
        toward(e, p.x - e.face * 70, p.y - 10, 110, dt);
        if (Math.random() < dt * 6) RW.fx.spawn({ x: c.x + RW.rand(-30, 30), y: c.y + RW.rand(-20, 20), vy: -15, life: 0.8, color: FROND[1], size: 1 }); // the rustle
        if (e.st > 3) { e.alpha = null; e.v3immune = false; say('The Frondwraith strikes from the kelp!'); e.state = 'snap'; e.st = 0.3; e.did = 0; }
      } else if (e.state === 'tangle') {
        if (!e.did) { e.did = 1; P.v3slowT = 3.5; say('Kelp wraps round you! You are slowed.'); for (let k = 0; k < 24; k++) RW.fx.spawn({ x: p.x + RW.rand(-14, 14), y: p.y + RW.rand(-18, 18), life: 3, color: RW.pick(FROND), size: 2 }); }
        e.vx *= 0.9; e.vy *= 0.9; if (e.st > 0.8) e.state = 'drift';
      } else if (e.state === 'regrow') { // draws life from kelp walls nearby: cut them to stop it
        let n = 0; const tx = Math.floor(c.x / TS), ty = Math.floor(c.y / TS), KW = RW.T.v3kelpwall;
        for (let yy = ty - 14; yy <= ty + 14; yy++) for (let xx = tx - 14; xx <= tx + 14; xx++) if (WD.get(xx, yy) === KW) n++;
        if (!e.did) { e.did = 1; say(n ? 'The Frondwraith drinks from the kelp walls. Cut them!' : 'The Frondwraith looks for kelp to heal from, and finds none.'); }
        if (n) { e.hp = Math.min(e.maxhp, e.hp + e.maxhp * 0.012 * Math.min(1, n / 20) * dt * 10); if (Math.random() < dt * 16) RW.fx.spawn({ x: c.x + RW.rand(-40, 40), y: c.y + RW.rand(-20, 20), vy: -30, life: 0.8, color: '#7aff9a', add: true, kind: 'glow', size: 2 }); }
        e.vx *= 0.92; e.vy *= 0.92; if (e.st > 4 || !n) e.state = 'drift';
      } else if (e.state === 'whip') { // a long kelp stalk lashed across the cave: watch the line
        if (!e.did) { e.did = 1; e.wa = Math.atan2(p.y - c.y, p.x - c.x); }
        e.vx *= 0.8; e.vy *= 0.8; e.whip = { a: e.wa, warn: e.st < 0.7, len: 300 };
        if (e.st > 0.7 && !e.k) { e.k = 1; const ex2 = c.x + Math.cos(e.wa) * 300, ey2 = c.y + Math.sin(e.wa) * 300, dx = ex2 - c.x, dy = ey2 - c.y, t = RW.clamp(((p.x - c.x) * dx + (p.y - c.y) * dy) / (dx * dx + dy * dy), 0, 1); if (Math.hypot(p.x - (c.x + dx * t), p.y - (c.y + dy * t)) < 22) { P.hurt(28, Math.sign(dx) || 1, 'kelp whip'); P.vx = Math.cos(e.wa) * 300; } RW.audio.sfx('swing'); RW.fx.shake(4, 0.2); }
        if (e.st > 1.1) { e.whip = null; e.state = 'drift'; }
      } else if (e.state === 'school') {
        if (!e.did) { e.did = 1; spawnFish(c.x, c.y, 6, 'spiky_fish'); say('A school of fish pours out of the kelp to shield it.'); } e.vx *= 0.9; e.vy *= 0.9; if (e.st > 0.8) e.state = 'drift';
      }
    },
    // ----- Scaldjaw -----
    v3b_scaldjaw(e, dt, c, p, d) {
      const l = lairOf('v3b_scaldjaw'); e.headOut = 0;
      if (!e.vents && l) { e.vents = [-0.55, 0, 0.55].map((k) => ({ x: (l.x + k * l.rx) * TS + 8, y: (l.y + l.ry - 3) * TS })); }
      const vents = e.vents || [], now = e.t;
      e.geyser = vents.map((v, i) => ((now + i * 1.7) % 5.1) < 1.0);
      vents.forEach((v, i) => { if (e.geyser[i] && Math.abs(p.x - v.x) < 22 && p.y < v.y && p.y > v.y - 12 * TS) P.vy = Math.min(P.vy, -460); });
      // it creeps along the floor
      e.vy = RW.lerp(e.vy, 60, dt); // heavy: it sinks
      if (!e.state || e.state === 'creep') {
        e.vx = RW.lerp(e.vx, Math.sign(p.x - c.x) * 40, dt * 2); e.headOut = d < 220 ? 1 : 0;
        if (e.cd <= 0) { e.cd = 2.4; e.state = Math.sign(p.x - c.x) === e.face && d < 140 ? 'bite' : d < 100 ? 'slap' : 'spit'; e.st = 0; e.did = 0; }
        if (e.scd <= 0) { e.scd = 7 + Math.random() * 3; special(e, ['shell', 'boil', 'hop', 'spit']); }
      } else if (e.state === 'bite') {
        e.headOut = 1; e.vx *= 0.8; if (!e.did && e.st > 0.45) { e.did = 1; if (d < 140 && Math.sign(p.x - c.x) === e.face) P.hurt(30, e.face, 'Scaldjaw'); RW.audio.sfx('slam'); } if (e.st > 0.9) e.state = 'creep';
      } else if (e.state === 'slap') {
        if (!e.did && e.st > 0.3) { e.did = 1; if (d < 120) { P.hurt(22, Math.sign(p.x - c.x) || 1, 'tail'); P.vx = (Math.sign(p.x - c.x) || 1) * 340; P.vy = -200; } } if (e.st > 0.7) e.state = 'creep';
      } else if (e.state === 'shell') { // safe in its shell until a geyser flips it
        e.v3immune = true; e.vx *= 0.8;
        if (!e.did) { e.did = 1; say('Scaldjaw shuts itself in its shell. Only a geyser can flip it.'); }
        const flip = vents.some((v, i) => e.geyser[i] && Math.abs(c.x - v.x) < 50);
        if (flip) { e.v3immune = false; e.state = 'flipped'; e.st = 0; say('A geyser flips Scaldjaw over! Hit it now!'); RW.fx.shake(6, 0.4); e.vy = -300; }
        else if (e.st > 6) { e.v3immune = false; e.state = 'hop'; e.st = 0; e.did = 0; } // gives up and moves to a vent
      } else if (e.state === 'flipped') { e.flipped = true; e.v3vuln = 2; e.vx *= 0.9; if (e.st > 3.2) { e.flipped = false; e.v3vuln = 0; e.state = 'creep'; } }
      else if (e.state === 'boil') {
        if (!e.did) { e.did = 1; say('The water round Scaldjaw starts to boil!'); }
        e.boil = { x: c.x, y: c.y, r: 130 }; e.vx *= 0.9; e.headOut = 1;
        e.boilCd = (e.boilCd || 0) - dt; if (d < 130 && e.boilCd <= 0) { e.boilCd = 0.6; P.hurt(9, 0, 'boiling water'); }
        if (Math.random() < dt * 40) RW.fx.spawn({ x: c.x + RW.rand(-130, 130), y: c.y + RW.rand(-60, 60), vy: -60, life: 0.7, color: '#ffd0a0', kind: 'bubble' });
        if (e.st > 4) { e.boil = null; e.state = 'creep'; }
      } else if (e.state === 'hop') { // dives into one vent, comes up out of another
        if (!e.did) { e.did = 1; e.hidden = true; e.v3immune = true; RW.fx.burst(c.x, c.y, HOT, 24, 160, { add: true, kind: 'glow', life: 0.6 }); const v = RW.pick(vents.filter((q) => Math.abs(q.x - c.x) > 40)) || vents[0]; e.hx = v ? v.x : c.x; e.hy = v ? v.y - e.h / 2 : c.y; }
        e.alpha = 0; e.vx = 0; e.vy = 0;
        if (e.st > 1.1) { e.hidden = false; e.v3immune = false; e.alpha = null; e.x = e.hx - e.w / 2; e.y = e.hy - e.h / 2; RW.fx.burst(e.hx, e.hy, HOT, 30, 200, { add: true, kind: 'glow', life: 0.7 }); RW.fx.shake(6, 0.4); e.state = 'creep'; }
      } else if (e.state === 'spit') {
        e.headOut = 1; e.vx *= 0.85;
        if (e.k < 3 && e.st > 0.35 + e.k * 0.3) { e.k++; const dx = p.x - c.x, T2 = 1.1; shot({ x: c.x + e.face * 40, y: c.y - 10, vx: dx / T2 + RW.rand(-40, 40), vy: -260, grav: 420, dmg: 20, kind: 'rain', color: RW.pick(HOT), life: 3 }); RW.audio.sfx('fire'); }
        if (e.st > 1.4) e.state = 'creep';
      }
    },
    // ----- The Gravekeeper: a seated titan; its hands fight -----
    v3b_gravekeeper(e, dt, c, p, d) {
      const hands = (e.hands || []).filter((h) => !h.dead);
      if (!e.risen && e.hands && !hands.length) { // both hands broken: it rises from the bones, bigger
        e.risen = true; e.v3immune = false; e.scale = 1.25; say('The Gravekeeper rises from the bones!'); RW.fx.shake(12, 1); RW.audio.sfx('roar'); RW.fx.debris(c.x, c.y + e.h / 2, BONE, 40);
      }
      e.v3immune = !e.risen;
      if (!e.risen) { e.vx = 0; e.vy = 0; } // seated, it barely moves
      else { toward(e, p.x, c.y, 50, dt, 1); e.vy = 0; if (e.cd <= 0) { e.cd = 2.6; e.state = d < 160 ? 'stomp' : 'pillars'; e.st = 0; e.did = 0; } }
      if (e.scd <= 0 && hands.length) { e.scd = 5.5 + Math.random() * 2.5; const lan = hands.find((h) => h.sp === 'v3b_gk_lantern'), anc = hands.find((h) => h.sp === 'v3b_gk_anchor'); const opts = ['pillars', 'pull']; if (lan) opts.push('souls', 'flare'); if (anc) opts.push('swing', 'slam'); if (lan) opts.push('slam'); special(e, opts); }
      if (e.risen && e.scd <= 0) { e.scd = 6; special(e, ['pillars', 'pull', 'dark']); }
      // the dark: when the lantern is broken the hollow goes black but for its eyes, every so often
      if (e.lanternGone && !e.dark && (e.darkCd = (e.darkCd == null ? 3 : e.darkCd) - dt) <= 0) { e.dark = 6; e.darkCd = 14; say('The lantern is gone. The hollow goes dark...'); }
      if (e.dark) { e.dark = Math.max(0, e.dark - dt); }
      const st = e.state;
      if (st === 'pillars') { // bone spikes erupt along the floor toward you
        if (!e.did) { e.did = 1; const l = lairOf('v3b_gravekeeper'); const fy = l ? (l.y + l.ry - 3) * TS : c.y + e.h / 2; e.pil = []; for (let k = 1; k <= 7; k++) e.pil.push({ x: c.x + Math.sign(p.x - c.x) * k * 46, y: fy, t: 0.5 + k * 0.12 }); }
        (e.pil || []).forEach((q) => { if (!q.hit && e.st > q.t) { q.hit = 1; q.up = 1; RW.fx.debris(q.x, q.y, BONE, 6); if (Math.abs(p.x - q.x) < 26 && p.y > q.y - 110 && p.y < q.y + 10) { P.hurt(30, 0, 'bone spikes'); P.vy = -300; } } });
        if (e.st > 2.2) { e.pil = null; e.state = null; }
      } else if (st === 'pull') { // drags you toward it on a chain of souls
        if (!e.did) { e.did = 1; say('The Gravekeeper pulls you in!'); }
        if (e.st < 1.6) { const a = Math.atan2(c.y - p.y, c.x - p.x); P.vx += Math.cos(a) * 900 * dt; P.vy += Math.sin(a) * 700 * dt; e.chain = true; } else { e.chain = false; e.state = null; }
      } else if (st === 'stomp') {
        if (!e.did && e.st > 0.5) { e.did = 1; RW.fx.shake(10, 0.5); RW.audio.sfx('slam'); for (const s of [-1, 1]) for (let k = 0; k < 6; k++) shot({ x: c.x + s * 40, y: c.y + e.h * 0.4, vx: s * (160 + k * 40), vy: -40, grav: 200, dmg: 18, kind: 'rain', color: RW.pick(BONE) }); if (d < 180) P.hurt(26, Math.sign(p.x - c.x) || 1, 'stomp'); }
        if (e.st > 1.1) e.state = null;
      } else if (st === 'dark') { if (!e.did) { e.did = 1; e.dark = 6; } e.state = null; }
      else if (st === 'souls' || st === 'flare' || st === 'swing' || st === 'slam') { e.order = st; e.state = null; } // the hands carry these out
      else e.state = null;
    },
    v3b_gk_lantern(e, dt, c, p, d) { hand(e, dt, c, p, d, -1); },
    v3b_gk_anchor(e, dt, c, p, d) { hand(e, dt, c, p, d, 1); },
  };
  // the hands: hover beside the titan, and do what it orders
  function hand(e, dt, c, p, d, side) {
    const body = e.body; if (!body || body.dead) { e.hp = 0; E.kill(e); return; }
    const bc = ctr(body), homeX = bc.x + side * 95, homeY = bc.y + 10 + Math.sin(e.t * 1.5 + side) * 8;
    const isLan = e.sp === 'v3b_gk_lantern';
    if (body.order && !e.task && ((body.order === 'souls' || body.order === 'flare') ? isLan : body.order === 'swing' ? !isLan : (body.order === 'slam' && (Math.random() < 0.5 || !(body.hands || []).some((h) => h !== e && !h.dead))))) { e.task = body.order; e.tt = 0; e.done = 0; body.order = null; }
    if (!e.task) { toward(e, homeX, homeY, 220, dt, 4); return; }
    e.tt += dt;
    if (e.task === 'slam') { // rise over you, then come down hard
      if (e.tt < 0.9) toward(e, p.x, p.y - 140, 340, dt, 5);
      else if (!e.done) { e.vx = 0; e.vy = 620; if (ctr(e).y > p.y - 10 || e.tt > 1.6) { e.done = 1; RW.fx.shake(9, 0.4); RW.audio.sfx('slam'); RW.fx.debris(ctr(e).x, ctr(e).y + 20, ROCK, 14); if (Math.abs(p.x - ctr(e).x) < 60 && Math.abs(p.y - ctr(e).y) < 70) P.hurt(32, Math.sign(p.x - ctr(e).x) || 1, 'stone fist'); } }
      else if (e.tt > 2.2) e.task = null;
    } else if (e.task === 'flare') {
      e.vx *= 0.85; e.vy *= 0.85; e.flare = e.tt < 0.6 ? e.tt / 0.6 : 0;
      if (!e.done && e.tt > 0.6) { e.done = 1; RW.fx.flash('#c0f8dc', 0.25); RW.fx.ring(c.x, c.y, '#7ae0b0', 110, 0.4, 3); if (d < 110) P.hurt(24, Math.sign(p.x - c.x) || 1, 'lantern flare'); }
      if (e.tt > 1) { e.flare = 0; e.task = null; }
    } else if (e.task === 'souls') {
      e.vx *= 0.85; e.vy *= 0.85; if (!e.done && e.tt > 0.5) { e.done = 1; spawnFish(c.x, c.y, 4, RW.SPECIES.v3_skelfish ? 'v3_skelfish' : 'creepy_fish'); say('Souls pour out of the lantern.'); }
      if (e.tt > 1) e.task = null;
    } else if (e.task === 'swing') { // the anchor swings round the titan on its chain
      const bc2 = ctr(body), a = -Math.PI / 2 + side * (e.tt / 1.4) * Math.PI * 1.6, R0 = 170;
      e.x = bc2.x + Math.cos(a) * R0 - e.w / 2; e.y = bc2.y + Math.sin(a) * R0 * 0.8 - e.h / 2; e.vx = 0; e.vy = 0; e.chainTo = bc2;
      if (dist(ctr(e), p) < 46 && !e.done) { e.done = 1; P.hurt(34, Math.sign(p.x - bc2.x) || 1, 'anchor'); P.vx = Math.cos(a + 1.57 * side) * 380; P.vy = -220; }
      if (e.tt > 1.4) { e.chainTo = null; e.task = null; }
    }
  }

  // ======================= damage, death, drops =======================
  const baseDamage = E.damage;
  E.damage = function (e, dmg) {
    if (e && B[e.sp] && e.v3immune) { if (!e._imT || performance.now() - e._imT > 500) { e._imT = performance.now(); const c = ctr(e); RW.fx.text(c.x, e.y - 8, e.sp === 'v3b_gravekeeper' ? 'Break its hands first' : 'No effect', '#c8c0d8'); } return; }
    if (e && e.v3vuln) arguments[1] = Math.round(dmg * e.v3vuln);
    return baseDamage.apply(this, arguments);
  };
  const wkey = (id) => 'v3bossT_' + id + '@w' + ((RW.v3slots && RW.v3slots.world) || 'none');
  const baseKill = E.kill;
  E.kill = function (e) {
    const b = e && B[e.sp];
    if (b && !b.part) {
      const c = ctr(e), n = RW.randi(b.n[0], b.n[1]);
      E.dropItem(b.ore, n, c.x, c.y); E.dropItem('coin', b.coins, c.x, c.y - 6);
      // a piece of the ring's own set sometimes
      const sets = RW.v3ringItems && RW.v3ringItems.SETS, idx = RW.v3ringBosses.indexOf(e.sp);
      if (sets && sets[idx] && Math.random() < 0.35) { const S = sets[idx]; E.dropItem(RW.pick([S.melee[0], S.bow[0], S.staff[0]]), 1, c.x, c.y); }
      if (e.sp === 'v3b_gravekeeper') (e.hands || []).forEach((h) => { if (!h.dead) { h.dead = true; } });
      RW.store.set(wkey(e.sp), Date.now()); P.flags['v3beat_' + e.sp] = 1;
      RW.fx.shake(10, 1); RW.fx.flash('#ffffff', 0.3); RW.audio.sfx('roar');
      U.banner && U.banner(b.name + ' is beaten', 'It dropped ' + n + ' ' + (RW.ITEMS[b.ore] ? RW.ITEMS[b.ore].name : b.ore) + '. The rune keeper can carve your next rune from it.');
      if (cur === e) cur = null;
    }
    if (b && b.part && e.body) { if (e.sp === 'v3b_gk_lantern') { e.body.lanternGone = true; } U.toast && U.toast((b.name || 'A hand') + ' shatters!'); RW.fx.debris(ctr(e).x, ctr(e).y, ROCK, 24); }
    return baseKill.apply(this, arguments);
  };

  // ======================= waking in the lairs =======================
  let cur = null, checkT = 0;
  function spawnBoss(id) {
    const l = lairOf(id); if (!l) return null;
    const b = B[id], x = l.x * TS + 8, y = (l.y + (id === 'v3b_gravekeeper' || id === 'v3b_scaldjaw' ? l.ry - 4 : 0)) * TS - b.h / 2;
    const e = E.spawnEnemy(id, x - b.w / 2, y - (id === 'v3b_gravekeeper' ? b.h / 2 : 0)); if (!e) return null;
    e.customDraw = true; e.provoked = true; e.v3lair = id; e.isRingBoss = true;
    const fighters = 1 + ((RW.net && RW.net.peers && RW.net.peers.size) || 0); e.hp = e.maxhp = Math.round(b.hp * (1 + 0.35 * (fighters - 1)));
    if (id === 'v3b_gravekeeper') {
      e.hands = ['v3b_gk_lantern', 'v3b_gk_anchor'].map((hid, k) => { const h = E.spawnEnemy(hid, x + (k ? 95 : -95) - B[hid].w / 2, y); h.customDraw = true; h.provoked = true; h.body = e; h.hp = h.maxhp = Math.round(B[hid].hp * (1 + 0.35 * (fighters - 1))); return h; });
    }
    cur = e; RW.audio.sfx('roar'); RW.fx.shake(8, 1); U.banner && U.banner(b.name, b.title); return e;
  }
  RW.v3callBoss = (id) => { E.enemies.filter((q) => q.sp === id || (q.body && q.body.sp === id)).forEach((q) => { q.dead = true; }); return spawnBoss(id); };
  const baseUpd = P.update;
  P.update = function (dt) {
    const r = baseUpd.apply(this, arguments);
    if ((checkT -= dt) > 0 || !WD.meta || !WD.meta.v3lairs || P.dead || !(RW.game && RW.game.playing)) return r;
    checkT = 0.5; const p = pc();
    WD.meta.v3lairs.forEach((l) => {
      const alive = E.enemies.find((q) => q.sp === l.boss && !q.dead);
      if (alive) { cur = alive; return; }
      if (!inLair(l, p.x, p.y, 0.8)) return;
      const t = RW.store.get(wkey(l.boss), 0); if (t && Date.now() - t < 4 * 60 * 1000) return; // it comes back after four minutes
      spawnBoss(l.boss);
    });
    if (cur && (cur.dead || !E.enemies.includes(cur))) cur = null;
    return r;
  };

  // ======================= drawing =======================
  const bar = document.createElement('div'); bar.id = 'v3rbbar';
  bar.style.cssText = 'position:fixed;left:50%;top:118px;transform:translateX(-50%);width:420px;display:none;z-index:30;font:12px monospace;color:#f0e8ff;text-align:center;text-shadow:0 1px 2px #000';
  bar.innerHTML = '<div class="n"></div><div style="height:9px;background:#1a1420;border:1px solid #6a5a8a;margin-top:2px"><div class="f" style="height:100%;width:100%;background:linear-gradient(90deg,#c84a3a,#f0a040)"></div></div>';
  document.body.appendChild(bar);
  const baseWater = WD.drawWater;
  WD.drawWater = function (g, cam, vw, vh, time) {
    const r = baseWater.apply(this, arguments);
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y), sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
    E.enemies.forEach((e) => {
      const b = B[e.sp]; if (!b || e.dead || e.hidden) return;
      const c = ctr(e), f = Math.floor((e.t || 0) * 4) % 2; let s, scale = (e.scale || 1);
      if (e.sp === 'v3b_grindmaw') s = spr('gm' + f + (e.open ? 1 : 0) + (e.frenzy ? 1 : 0), () => shark(f, e.open, e.frenzy));
      else if (e.sp === 'v3b_frondwraith') s = spr('fw' + f + (e.open ? 1 : 0), () => dragon(f, e.open));
      else if (e.sp === 'v3b_scaldjaw') s = spr('sj' + (e.headOut ? 1 : 0) + (e.flipped ? 1 : 0) + f, () => shell(e.headOut, e.flipped, f));
      else if (e.sp === 'v3b_gravekeeper') s = spr('gk' + (e.risen ? 1 : 0) + (e.dark ? 1 : 0), () => titan(e.risen, e.dark));
      else if (e.sp === 'v3b_gk_lantern') s = spr('gl', () => lanternHand(true));
      else s = spr('ga', () => anchorHand());
      g.save(); if (e.alpha != null) g.globalAlpha = e.alpha;
      // chains, whips, boiling water, bone pillars, under the sprite
      if (e.chainTo) { g.strokeStyle = '#5a5660'; g.lineWidth = 3; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(Math.round(e.chainTo.x + ox), Math.round(e.chainTo.y + oy)); g.lineTo(Math.round(c.x + ox), Math.round(c.y + oy)); g.stroke(); g.setLineDash([]); }
      if (e.chain) { const p = pc(); g.strokeStyle = 'rgba(160,230,255,0.7)'; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(Math.round(c.x + ox), Math.round(c.y + oy)); g.lineTo(Math.round(p.x + ox), Math.round(p.y + oy)); g.stroke(); g.setLineDash([]); }
      if (e.whip) { const ex2 = c.x + Math.cos(e.whip.a) * e.whip.len, ey2 = c.y + Math.sin(e.whip.a) * e.whip.len; g.strokeStyle = e.whip.warn ? 'rgba(255,80,60,0.5)' : '#4a7a2e'; g.lineWidth = e.whip.warn ? 2 : 6; g.beginPath(); g.moveTo(c.x + ox, c.y + oy); g.lineTo(ex2 + ox, ey2 + oy); g.stroke(); }
      if (e.boil) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,120,60,0.12)'; g.beginPath(); g.ellipse(e.boil.x + ox, e.boil.y + oy, e.boil.r, e.boil.r * 0.6, 0, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over'; }
      (e.pil || []).forEach((q) => { if (!q.up) { g.fillStyle = 'rgba(255,80,60,0.5)'; g.fillRect(Math.round(q.x - 14 + ox), Math.round(q.y - 2 + oy), 28, 3); } else for (let yy = 0; yy < 110; yy += 4) { const w2 = Math.max(4, (1 - yy / 110) * 26); g.fillStyle = yy % 8 ? BONE[1] : BONE[2]; g.fillRect(Math.round(q.x - w2 / 2 + ox), Math.round(q.y - yy - 4 + oy), Math.round(w2), 4); } });
      if (e.sp === 'v3b_scaldjaw' && e.vents) e.vents.forEach((v, i) => { if (e.geyser && e.geyser[i]) { g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 16; k++) { const yy = v.y - ((k * 17 + time * 320) % (12 * TS)); g.fillStyle = 'rgba(255,200,150,0.3)'; g.fillRect(Math.round(v.x - 6 + Math.sin(k + time * 10) * 5 + ox), Math.round(yy + oy), 10, 8); } g.globalCompositeOperation = 'source-over'; } });
      // the sprite itself, facing the way it swims
      const w2 = s.width * PX * scale, h2 = s.height * PX * scale;
      g.translate(Math.round(c.x + ox), Math.round(c.y + oy)); if ((e.face || 1) < 0) g.scale(-1, 1);
      g.drawImage(s, -Math.round(w2 / 2), -Math.round(h2 / 2), Math.round(w2), Math.round(h2));
      if (e.hitT > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.4; g.drawImage(s, -Math.round(w2 / 2), -Math.round(h2 / 2), Math.round(w2), Math.round(h2)); }
      if (e.flare) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(160,255,200,' + (0.4 * e.flare).toFixed(2) + ')'; g.beginPath(); g.arc(0, 0, 40 + e.flare * 40, 0, 6.283); g.fill(); }
      g.restore();
      if (e.sp === 'v3b_gk_lantern' && !e.dead) RW.fx.light(c.x, c.y, 0.3, 0.8, 0.55);
      else if (!B[e.sp].part) RW.fx.light(c.x, c.y, 0.35, 0.32, 0.3); // a faint glow so you can see what you are fighting
      if (B[e.sp].part && e.hp < e.maxhp) { g.fillStyle = '#0c0a10'; g.fillRect(Math.round(c.x - 22 + ox), Math.round(e.y - 10 + oy), 44, 4); g.fillStyle = '#c84a3a'; g.fillRect(Math.round(c.x - 22 + ox), Math.round(e.y - 10 + oy), Math.round(44 * Math.max(0, e.hp / e.maxhp)), 4); }
    });
    g.imageSmoothingEnabled = sm;
    // the boss bar
    if (cur && !cur.dead) { bar.style.display = 'block'; bar.querySelector('.n').textContent = B[cur.sp].name + (cur.v3immune && cur.sp === 'v3b_gravekeeper' ? ' (break its hands first)' : ''); bar.querySelector('.f').style.width = Math.max(0, 100 * cur.hp / cur.maxhp).toFixed(1) + '%'; }
    else bar.style.display = 'none';
    return r;
  };
  // the Gravekeeper's dark: black over everything but its eyes
  const baseOver = RW.fx.drawOver;
  RW.fx.drawOver = function (g, cam) {
    const r = baseOver.apply(this, arguments);
    const gk = E.enemies.find((q) => q.sp === 'v3b_gravekeeper' && !q.dead && q.dark > 0);
    if (gk) { const v = RW.view, a = Math.min(0.94, gk.dark * 0.5); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(2,2,4,' + a.toFixed(2) + ')'; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.restore(); const c = ctr(gk), s = gk.scale || 1; g.fillStyle = '#c8f0ff'; for (const dx of [-9, 9]) g.fillRect(Math.round(c.x + dx * s * PX - cam.x - 2), Math.round(c.y - 50 * s - cam.y), 4, 3); void v; }
    return r;
  };
})(window.RW);
