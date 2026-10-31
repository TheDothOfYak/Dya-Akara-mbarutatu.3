// V2 — what makes 4 Brothers World its own game. Loaded after every other module and before main.js; it adds to and wraps
// the older systems instead of rewriting them.
//  * Ghosts are cloud blobs that fade in and out. Each haunted area holds a set number; clear them and it stays quiet for a while.
//  * The ghost hero is a cloud blob too, and can turn invisible (V).
//  * The rock hero has no spells: elemental crystals he eats grow on his body and power his punches; F slams the ground.
//    His hits smash through dirt and stone a few blocks deep.
//  * Rare elites that need a trick to beat: Ghost Tank, Lütut, Thornback, Canopy Stalker, Geode Golem.
//  * Cyitors, the Empire's elite peacekeepers, drawn from the brothers' sketch.
//  * Lava blocks (Fuzzy World's mountains).
(function (RW) {
  const A = RW.art, E = RW.ent, U = RW.ui, N = RW.net, P = RW.player, TS = RW.TILE;
  const { px, rect, ell, line } = A; const mk = A.canvas;
  const ec = E.center, overlap = E.overlap;
  const now = () => performance.now() / 1000;
  const onScreen = (e) => { const c = RW.cam, v = RW.view; return e.x + e.w > c.x - 24 && e.x < c.x + v.w + 24 && e.y + e.h > c.y - 24 && e.y < c.y + v.h + 24; };
  const hashStr = (s) => { s = String(s || ''); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0) / 4294967296; };
  const disc = (g, cx, cy, r, col, light, shade) => { // a pixel-crisp filled circle, lit from the top left
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r * 0.6) continue;
      let c = col; if (light && dy < -r * 0.35 && dx < r * 0.2) c = light; else if (shade && dy > r * 0.45) c = shade;
      px(g, Math.round(cx + dx), Math.round(cy + dy), c);
    }
  };
  const hue = (hex, look, sat) => {
    if (!look || (!look.hue && !look.tone)) return hex;
    const [h, s, l] = RW.rgbToHsl(...RW.hexToRgb(hex));
    return RW.shade(RW.hslToHex(h + (look.hue || 0), Math.min(1, s + Math.abs(look.hue || 0) * (sat || 0.004)), l), look.tone || 0);
  };

  // ====================== LAVA ======================
  if (RW.T.lava == null) {
    const id = RW.TILES.length;
    RW.TILES.push({ id, key: 'lava', name: 'Lava', decor: 'lava', light: [1.0, 0.45, 0.12], hard: 99, lockedMsg: 'You can\'t dig lava. It digs you.' });
    RW.T.lava = id;
  }
  const baseDecor = A.drawDecor;
  A.drawDecor = function (g, t, sx, sy, time, stage, x, y) {
    if (t.decor !== 'lava') return baseDecor.apply(this, arguments);
    const W = RW.world, top = W.get(x, y - 1) !== RW.T.lava;
    g.fillStyle = '#a8240c'; g.fillRect(sx, sy, TS, TS);
    for (let k = 0; k < 6; k++) { // slow glowing blobs
      const fx = (RW.hash2(x, y, k) * TS + time * (6 + k * 2)) % TS, fy = (RW.hash2(y, x, k + 9) * TS + Math.sin(time * 0.8 + k) * 2) % TS;
      g.fillStyle = k % 2 ? '#ff7a1e' : '#ffb347'; g.fillRect(sx + Math.floor(fx), sy + Math.floor(fy), 3, 2);
    }
    if (top) { // a bright crust that ripples
      for (let i = 0; i < TS; i += 2) { const h = 2 + Math.round(Math.sin(time * 2.4 + (x * TS + i) * 0.3)); g.fillStyle = '#ffd36a'; g.fillRect(sx + i, sy, 2, h); }
      if (Math.random() < 0.012) RW.fx.spawn({ x: x * TS + Math.random() * TS, y: y * TS, vx: RW.rand(-10, 10), vy: -RW.rand(30, 60), life: 0.8, color: RW.pick(['#ffb347', '#ff7a1e', '#ffe08a']), add: true, kind: 'ember' });
    }
  };
  const inLava = (o) => {
    const W = RW.world, L = RW.T.lava;
    for (let ty = Math.floor(o.y / TS); ty <= Math.floor((o.y + o.h - 1) / TS); ty++) for (let tx = Math.floor(o.x / TS); tx <= Math.floor((o.x + o.w - 1) / TS); tx++) if (W.get(tx, ty) === L) return true;
    return false;
  };

  // ====================== GHOSTS: cloud blobs ======================
  const cloudPuffs = (W2, H2, f, big) => { // puff layout for an enemy ghost (f: animation frame 0..3)
    const cx = W2 / 2, s = big ? 1.25 : 1, w = Math.sin(f * 1.57);
    return [
      [cx - 6 * s, H2 - 9 * s + w, 4 * s, 0.55], [cx + 5 * s, H2 - 8 * s - w, 4 * s, 0.55], [cx + w, H2 - 6 * s, 3 * s, 0.4], // wisps, fading out at the bottom
      [cx - 5 * s, 13 * s, 6 * s, 1], [cx + 5 * s, 13 * s + w * 0.5, 6 * s, 1], [cx, 9 * s, 7 * s, 1], [cx, 15 * s, 7 * s, 1],
    ];
  };
  A.drawers.ghost = function (o) {
    const wail = o && o.v === 'wailer'; const frames = [];
    const W2 = wail ? 30 : 24, H2 = wail ? 30 : 26, body = wail ? '#b8c8f0' : '#dfe6f4', light = '#ffffff', shade = wail ? '#8c9cd0' : '#aeb8d4';
    for (let f = 0; f < 4; f++) {
      const c = mk(W2, H2), g = c.ctx;
      cloudPuffs(W2, H2, f, wail).forEach(([x, y, r, a]) => { g.globalAlpha = a; disc(g, x, y, Math.round(r), body, light, shade); });
      g.globalAlpha = 1; const s = wail ? 1.25 : 1, cx = W2 / 2;
      ell(g, cx - 3 * s, 12 * s, 1, 2, '#1a1a2a'); ell(g, cx + 3 * s, 12 * s, 1, 2, '#1a1a2a');
      if (wail) ell(g, cx, 18 * s, 2, 2 + (f % 2), '#1a1a2a'); else rect(g, cx - 1, 16, 2, 1 + (f % 2), '#2a2a3a');
      frames.push(c);
    }
    return frames;
  };
  const isGhostMob = (id) => { const s = RW.SPECIES[id]; return !!s && s.role === 'enemy' && s.art && s.art.draw === 'ghost'; };

  // ---- haunts: each area holds a set number of ghosts. Clear them and it's quiet until they drift back. ----
  const HAUNT = { cw: 48, ch: 32, refill: 7 * 60 };
  const haunts = {}; // world id -> { cellKey: { left, spawned, killed, total, clearedAt } }
  const cellOf = (x, y) => Math.floor(x / TS / HAUNT.cw) + ',' + Math.floor(y / TS / HAUNT.ch);
  const hauntCell = (key) => {
    const wid = RW.world.def.id, H = haunts[wid] || (haunts[wid] = {});
    let c = H[key];
    const total = wid === 'duat' ? 9 : 7;
    if (!c || (c.clearedAt && now() - c.clearedAt > HAUNT.refill)) c = H[key] = { left: total, spawned: 0, killed: 0, total, clearedAt: 0 };
    return c;
  };
  RW.haunts = { cellOf, hauntCell, HAUNT, all: haunts };

  // ---- rare elites: at most one at a time, and a long gap between them ----
  const ELITES = new Set(['ghost_tank', 'lutut', 'thornback', 'canopy_stalker', 'geode_golem']);
  const ELITE_GAP = 100; let lastElite = -1e9;
  const dummy = () => ({ sp: 'ghost', x: -1e6, y: -1e6, w: 1, h: 1, dead: true, dummy: true });
  const baseSpawnEnemy = E.spawnEnemy;
  let spawning = false;
  const baseTrySpawn = E.trySpawn;
  E.trySpawn = function (dt) { spawning = true; try { return baseTrySpawn(dt); } finally { spawning = false; } };
  E.spawnEnemy = function (id, x, y) {
    if (spawning && isGhostMob(id)) {
      const key = cellOf(x, y), c = hauntCell(key);
      if (c.left <= 0) return dummy();
      const e = baseSpawnEnemy(id, x, y); c.left--; c.spawned++; e.haunt = key; e.hauntW = RW.world.def.id; return e;
    }
    if (spawning && ELITES.has(id)) {
      if (now() - lastElite < ELITE_GAP || E.enemies.some((e) => ELITES.has(e.sp) && !e.dead)) return dummy();
      lastElite = now();
      const e = baseSpawnEnemy(id, x, y); eliteIntro(id); return e;
    }
    return baseSpawnEnemy(id, x, y);
  };
  const baseKill = E.kill;
  E.kill = function (e) {
    if (e.haunt && !e.killedCounted) {
      e.killedCounted = true; const H = haunts[e.hauntW]; const c = H && H[e.haunt];
      if (c) { c.killed++; if (c.left <= 0 && c.killed >= c.spawned && !c.clearedAt) { c.clearedAt = now(); setTimeout(() => U.banner('The haunting fades', 'You cleared the ghosts here. It will stay quiet for a while.'), 700); } }
    }
    return baseKill(e);
  };
  // ghosts that drift too far away and vanish go back to their area
  let hauntT = 0;
  function hauntTick(dt) {
    if ((hauntT -= dt) > 0) return; hauntT = 1;
    const H = haunts[RW.world.def.id]; if (!H) return;
    const alive = {}; E.enemies.forEach((e) => { if (e.haunt && !e.dead) alive[e.haunt] = (alive[e.haunt] || 0) + 1; });
    for (const k in H) { const c = H[k]; if (c.clearedAt) continue; const lost = c.spawned - c.killed - (alive[k] || 0); if (lost > 0) { c.spawned -= lost; c.left += lost; } }
  }

  // ====================== GHOST HERO: a cloud blob that can turn invisible ======================
  const ghostFrame = function (look, frame) {
    const c = mk(26, 30), g = c.ctx; look = look || A.DEFAULT_GHOST;
    const sheet = hue(RW.SHEETS[look.sheet] || RW.SHEETS.white, look), light = RW.shade(sheet, 0.3), shade = RW.shade(sheet, -0.22);
    const shape = look.shape || 'round', cx = 13;
    const bob = Math.round(Math.sin(frame * 1.3)) - (frame === 5 ? 2 : 0);
    const walk = frame >= 1 && frame <= 4 ? frame : 0; const trail = walk ? -2 - (walk % 2) : 0;
    let puffs;
    if (shape === 'tall') puffs = [[cx, 8, 5], [cx - 1, 14, 6], [cx + 1, 19, 6], [cx - 4 + trail, 23, 4], [cx + 3 + trail, 24, 3]];
    else if (shape === 'tattered') puffs = [[cx, 11, 7], [cx - 5, 15, 5], [cx + 5, 15, 5], [cx + trail - 6, 22, 3], [cx + trail, 24, 3], [cx + trail + 6, 21, 2], [cx + trail - 9, 19, 2]];
    else puffs = [[cx, 11, 7], [cx - 6, 15, 5], [cx + 6, 15, 5], [cx, 17, 7], [cx - 4 + trail, 23, 4], [cx + 4 + trail, 23, 3]];
    puffs.forEach(([x, y, r], i) => { g.globalAlpha = y > 21 ? 0.6 : 1; disc(g, x, y + bob, r, sheet, light, shade); });
    g.globalAlpha = 1;
    // little puff arms; the front one holds things
    const ay = 15 + bob;
    if (frame === 6) { disc(g, cx + 10, ay - 2, 2, sheet, light, shade); c.hand = { x: cx + 11, y: ay - 2 }; }
    else if (frame === 7) { disc(g, cx - 10, ay - 2, 2, sheet, light, shade); disc(g, cx + 10, ay - 2, 2, sheet, light, shade); c.hand = { x: cx + 10, y: ay - 2 }; }
    else { disc(g, cx + 9, ay + (frame % 2), 2, sheet, light, shade); c.hand = { x: cx + 10, y: ay + (frame % 2) + 1 }; }
    // face
    const ey = (shape === 'tall' ? 9 : 10) + bob, eyes = look.eyes || 'hollow';
    if (eyes === 'cyclops') { ell(g, cx + 1, ey + 1, 2, 2, '#14121e'); px(g, cx + 1, ey + 1, '#c8a6ff'); px(g, cx, ey, '#ffffff'); }
    else [-3, 3].forEach((dx) => {
      const x = cx + dx + 1;
      if (eyes === 'hollow') rect(g, x - 1, ey, 2, 3, '#14121e');
      else if (eyes === 'glowing') { rect(g, x - 1, ey, 2, 3, '#14121e'); px(g, x, ey + 1, '#9ad8ff'); }
      else rect(g, x - 1, ey + 2, 3, 1, '#14121e');
    });
    const mo = look.mouth || 'o', my = ey + 5;
    if (mo === 'o') rect(g, cx, my, 2, 2, '#14121e');
    else if (mo === 'smile') { px(g, cx - 1, my, '#14121e'); rect(g, cx, my + 1, 2, 1, '#14121e'); px(g, cx + 2, my, '#14121e'); }
    else if (mo === 'fangs') { rect(g, cx - 1, my, 4, 1, '#14121e'); px(g, cx - 1, my + 1, '#ffffff'); px(g, cx + 2, my + 1, '#ffffff'); }
    // extras
    const ex = look.extra || 'none';
    if (ex === 'crown') { const ty = (shape === 'tall' ? 2 : 3) + bob; rect(g, cx - 3, ty + 1, 7, 2, '#f2c94c'); [cx - 3, cx, cx + 3].forEach((x) => px(g, x, ty, '#f2c94c')); px(g, cx, ty + 1, '#e0525a'); }
    else if (ex === 'chain') { for (let k = 0; k < 4; k++) px(g, cx - 6 + trail - k, 24 + bob + (k % 2), k % 2 ? '#9aa3ad' : '#6a7380'); }
    else if (ex === 'lantern') { const lx = c.hand.x, ly = c.hand.y + 1; rect(g, lx, ly, 3, 4, '#5a4a3a'); rect(g, lx + 1, ly + 1, 1, 2, '#ffd36a'); }
    return c;
  };
  const ghostCache = {};
  A.ghostSprites = (look) => {
    const key = JSON.stringify(look || A.DEFAULT_GHOST); if (ghostCache[key]) return ghostCache[key];
    const frames = []; for (let f = 0; f < 8; f++) { const r = ghostFrame(look || A.DEFAULT_GHOST, f); frames.push([r, A.flip(r)]); }
    return (ghostCache[key] = frames);
  };

  // ---- invisibility ----
  P.vanishT = 0; P.vanishCd = 0; P.ambushT = 0;
  const VANISH = { time: 6, cd: 16 };
  P.ability = function () {
    if (P.dead) return;
    if (P.species === 'ghost') {
      if (P.vanishT > 0) { P.vanishT = 0; U.toast('You are visible again.'); return; }
      if (P.vanishCd > 0) { U.toast('You can turn invisible again in ' + Math.ceil(P.vanishCd) + 's.'); RW.audio.sfx('deny'); return; }
      P.vanishT = VANISH.time; P.vanishCd = VANISH.cd + VANISH.time;
      const c = P.center(); RW.fx.burst(c.x, c.y, ['#ffffff', '#c8d4f0'], 18, 70, { add: true, kind: 'glow', grav: -20 });
      RW.audio.sfx('rift'); U.toast('Invisible for ' + VANISH.time + 's. Monsters lose track of you. Attacking makes you visible, and your first hit lands twice as hard.');
      E.enemies.forEach((e) => { if (!e.isBoss) { e.cs = null; e.state = null; } });
    } else if (P.species === 'rock') P.rockSlam();
    else U.toast('Your hero\'s ability is coming in the next update.');
    U.dirty();
  };
  const breakStealth = () => { if (P.vanishT > 0) { P.vanishT = 0; P.ambushT = 0.8; } };
  const baseSwing = P.startSwing; P.startSwing = function () { breakStealth(); return baseSwing.apply(this, arguments); };
  const baseCast = P.cast; P.cast = function (m) { if (P.species === 'rock') return P.rockSlam(); breakStealth(); return baseCast.apply(this, arguments); };
  const baseDamage = E.damage;
  E.damage = function (e, d, dir, knock, crit, color) {
    if (P.ambushT > 0 && d > 0) { P.ambushT = 0; d = Math.round(d * 2); crit = true; color = '#c8d4f0'; }
    if (e.sp === 'ghost_tank') { d = Math.max(1, Math.round(d * (e.tstate === 'stuck' ? 1.6 : 0.35))); knock = 0; }
    else if (e.sp === 'geode_golem') { d = Math.max(1, Math.round(d * (e.core > 0 ? 2 : 0.25))); knock = 0; }
    else if (e.sp === 'lutut' && e.ls === 'rest') d = Math.round(d * 1.5);
    else if (e.sp === 'thornback' && e.tb === 'under') return; // can't hit what's underground
    return baseDamage.call(this, e, d, dir, knock, crit, color);
  };
  // monsters can't see an invisible player: for their update, the player counts as gone
  const baseUpdateEnemies = E.updateEnemies;
  E.updateEnemies = function (dt) {
    v2Tick(dt);
    const hide = P.vanishT > 0 && !P.dead;
    if (hide) P.dead = true;
    try { return baseUpdateEnemies(dt); } finally { if (hide) P.dead = false; }
  };
  const baseTry2 = E.trySpawn; // no new monsters appear right beside someone invisible
  E.trySpawn = function (dt) { if (P.vanishT > 0) return; return baseTry2(dt); };

  // ---- drawing: whole-hero fading (ghosts) and invisibility, the rock's crystals ----
  let off = null;
  const baseDrawPlayer = E.drawPlayer;
  E.drawPlayer = function (g, cam, p, look, opts) {
    const me = p === P;
    const vanish = me ? P.vanishT > 0 : !!opts.vanish;
    let a = 1;
    if (opts.species === 'ghost') a = 0.72 + 0.2 * Math.sin(now() * 1.7 + (me ? 0 : hashStr(opts.name) * 6));
    if (vanish) a = me ? 0.28 + 0.06 * Math.sin(now() * 6) : 0.07;
    if (a >= 0.999) { baseDrawPlayer.call(this, g, cam, p, look, opts); }
    else {
      const cv = g.canvas;
      if (!off || off.width !== cv.width || off.height !== cv.height) { off = document.createElement('canvas'); off.width = cv.width; off.height = cv.height; }
      const og = off.getContext('2d'); og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, off.width, off.height); og.imageSmoothingEnabled = false;
      og.setTransform(g.getTransform()); baseDrawPlayer.call(this, og, cam, p, look, opts);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.drawImage(off, 0, 0); g.restore();
    }
    if (opts.species === 'rock' && !opts.dead) drawRockCrystals(g, cam, p, me ? P.rockEl : unpackEl(opts.rx), opts.scale || 1, vanish ? a : 1);
  };

  // ====================== ROCK HERO: crystals that grow on him, elemental punches, a ground slam ======================
  const EL = { fire: { c: '#ff7a2e', hi: '#ffd08a', name: 'Fire' }, lightning: { c: '#7fe3ff', hi: '#ffffff', name: 'Lightning' }, poison: { c: '#8be04a', hi: '#d8ff9a', name: 'Poison' } };
  const EL_MAX = 5;
  P.rockEl = { fire: 0, lightning: 0, poison: 0 }; P.rockAct = 'fire';
  const elTotal = (el) => (el ? (el.fire || 0) + (el.lightning || 0) + (el.poison || 0) : 0);
  P.rockElemCode = () => (P.species === 'rock' ? 'f' + (P.rockEl.fire || 0) + 'l' + (P.rockEl.lightning || 0) + 'p' + (P.rockEl.poison || 0) : '');
  function unpackEl(s) { const m = /^f(\d)l(\d)p(\d)$/.exec(s || ''); return m ? { fire: +m[1], lightning: +m[2], poison: +m[3] } : null; }
  // where crystals sit on his body (sprite pixels from his feet, facing right), in the order they grow
  const SLOTS = { fire: [[-6, -16], [-5, -22], [-7, -10], [-3, -26], [-8, -19]], lightning: [[2, -27], [-1, -29], [5, -24], [-2, -24], [6, -20]], poison: [[-4, -12], [-9, -14], [-6, -27], [-9, -8], [-2, -18]] };
  function drawRockCrystals(g, cam, p, el, sc, alpha) {
    if (!el || !elTotal(el)) return;
    const f = (p.face || 1) > 0 ? 1 : -1, bx = p.x + 6 - cam.x, by = p.y + 28 - cam.y, t = now();
    g.save(); g.globalAlpha = alpha;
    Object.keys(EL).forEach((k) => {
      const n = Math.min(EL_MAX, el[k] || 0);
      for (let i = 0; i < n; i++) {
        const [sx, sy] = SLOTS[k][i]; const x = Math.round(bx + sx * f * sc), y = Math.round(by + sy * sc);
        const h = Math.round((3 + n * 0.8 - i * 0.4) * sc), w = Math.max(2, Math.round(h * 0.45));
        g.fillStyle = EL[k].c; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + w, y); g.lineTo(x - w, y); g.closePath(); g.fill();
        g.fillStyle = EL[k].hi; g.fillRect(x - 1, y - h + 2, 1, Math.max(1, h - 3));
        if ((t * 2 + i) % 3 < 0.08) { g.fillStyle = '#ffffff'; g.fillRect(x, y - h, 1, 1); }
        if (p === P && i === 0) RW.fx.light(p.x + 6 + sx * f * sc, p.y + 28 + sy * sc, 0.08 * n * (k === 'fire'), 0.04 * n + 0.05 * n * (k === 'lightning'), 0.06 * n * (k !== 'fire'));
      }
    });
    g.restore();
  }
  const baseUse = P.useItem;
  P.useItem = function (it) {
    if (P.species === 'rock' && it.kind === 'crystal' && it.spell && EL[it.spell]) {
      const k = it.spell; if ((P.rockEl[k] || 0) >= EL_MAX) { U.toast('Your body can\'t hold any more ' + EL[k].name + ' crystals.'); return; }
      P.rockEl[k] = (P.rockEl[k] || 0) + 1; P.rockAct = k; P.remove(it.id, 1);
      const c = P.center(); RW.fx.element.crystal(c.x, c.y, EL[k].c); RW.fx.element[k] && RW.fx.element[k](c.x, c.y, 2); RW.fx.shake(4, 0.5); RW.audio.sfx('crystal');
      U.banner(EL[k].name + ' crystals grow on you', P.rockEl[k] === 1 ? 'Your punches carry ' + EL[k].name.toLowerCase() + ' now. F or right-click slams the ground. Q switches crystal.' : 'Bigger crystals: stronger ' + EL[k].name.toLowerCase() + ' punches.');
      P.flags.ate_crystal = 1; U.dirty(); RW.game.saveSoon(); return;
    }
    return baseUse.apply(this, arguments);
  };
  const baseGold = P.goldMagic;
  P.goldMagic = function () {
    if (P.species !== 'rock') return baseGold.apply(this, arguments);
    setTimeout(() => U.banner('Gold crystal', 'You grow bigger, and every punch hits harder.'), 600); P.mana = P.maxMana(); U.dirty();
  };
  P.fistDmg = () => (P.species === 'rock' ? 5 + 3 * elTotal(P.rockEl) + 3 * ((P.stats && P.stats.gold) || 0) : 3);
  P.punchFx = function (e, dmg) {
    if (P.species !== 'rock') return; const k = P.rockAct, n = P.rockEl[k] || 0; if (!n) return;
    E.applyFx(e, k, Math.round(dmg * (0.35 + 0.15 * n)));
  };
  P.rockSlam = function () {
    if (P.dead) return; const k = P.rockAct, n = P.rockEl[k] || 0;
    if (!n) { U.toast('Eat a fire, lightning or poison crystal and it grows on you. Then you can slam.'); RW.audio.sfx('deny'); return; }
    if (P.slamCd > 0) { U.toast('Your crystals are recharging (' + Math.ceil(P.slamCd) + 's).'); return; }
    if (!P.tire(14)) return;
    P.slamCd = 2.5; P.swingT = 0.25; P.swingDur = 0.25; P.swingHit = new Set();
    const c = P.center(), R = 52 + 10 * n, dmg = (14 + 7 * n) * P.dmgMul();
    RW.fx.ring(c.x, P.y + P.h, EL[k].c, R, 0.45, 2); RW.fx.shake(6, 0.35); RW.audio.sfx('slam');
    for (let i = 0; i < 24; i++) RW.fx.spawn({ x: c.x + RW.rand(-R, R), y: P.y + P.h - 2, vx: RW.rand(-30, 30), vy: -RW.rand(40, 120), life: 0.6, color: RW.pick([EL[k].c, EL[k].hi]), add: true, kind: 'glow' });
    RW.fx.element[k] && RW.fx.element[k](c.x, c.y, 1.5);
    E.enemies.concat(E.boss ? [E.boss] : []).forEach((e) => {
      if (e.dead) return; const ce = ec(e); if (RW.dist(ce.x, ce.y, c.x, c.y) > R) return;
      E.damage(e, Math.round(dmg), Math.sign(ce.x - c.x) || 1, 6, false, EL[k].c); E.applyFx(e, k, dmg * 0.5);
    });
    U.dirty();
  };
  // a rock's hits smash dirt and stone, the block hit and a couple behind it
  const SMASH_MAX_HARD = 3;
  // things people build (planks, bricks, doors, benches...) are never smashed in a line: only dirt, sand and stone are
  let builtIds = null;
  RW.v2Built = (i) => {
    if (!builtIds) { builtIds = new Set(); RW.RECIPES.forEach((r) => { const it = RW.ITEMS[r.out]; if (it && it.kind === 'place' && it.place && !['dirt', 'stone', 'sand', 'mud'].includes(it.place) && RW.T[it.place] != null) builtIds.add(RW.T[it.place]); }); ['log', 'stump'].forEach((k) => { if (RW.T[k] != null) builtIds.add(RW.T[k]); }); }
    return builtIds.has(i) || (RW.T.log != null && i === RW.T.log);
  };
  let smashCd = 0;
  const baseMine = P.mineTile;
  P.mineTile = function (tx, ty, dt) {
    if (P.species !== 'rock') return baseMine.apply(this, arguments);
    const W = RW.world, id = W.get(tx, ty), t = RW.TILES[id];
    const smashable = (i) => { const tt = RW.TILES[i]; return tt && tt.solid && (tt.hard == null ? 0 : tt.hard) <= SMASH_MAX_HARD && !tt.element && !RW.v2Built(i); };
    if (!smashable(id)) return baseMine.apply(this, arguments);
    P.mine = null;
    if (smashCd > 0) return; smashCd = 0.32;
    const ptx = Math.floor((P.x + P.w / 2) / TS), pty = Math.floor((P.y + P.h / 2) / TS);
    const dx = tx - ptx, dy = ty - pty; const sx = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0, sy = Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0;
    const depth = 3 + Math.min(2, Math.floor(elTotal(P.rockEl) / 4));
    let n = 0;
    for (let k = 0; k < depth; k++) { const x = tx + sx * k, y = ty + sy * k; if (!smashable(W.get(x, y))) break; P.breakTile(x, y); n++; }
    P.swingT = 0.2; P.swingDur = 0.2; RW.fx.shake(n > 1 ? 3 : 1.5, 0.15);
    if (P.rockEl[P.rockAct] > 0) RW.fx.burst(tx * TS + 8, ty * TS + 8, [EL[P.rockAct].c, EL[P.rockAct].hi], 6, 70, { add: true, kind: 'glow' });
  };

  // ---- save and load (main.js calls this at boot, before any save loads) ----
  RW.v2Game = function (G) {
  const baseSnap = G.snapshot;
  G.snapshot = function () { const s = baseSnap.apply(this, arguments); if (s && typeof s === 'object') { s.rockEl = Object.assign({}, P.rockEl); s.rockAct = P.rockAct; } return s; };
  const baseLoad = G.load;
  G.load = function (s) {
    const r = baseLoad.apply(this, arguments);
    P.rockEl = Object.assign({ fire: 0, lightning: 0, poison: 0 }, (s && s.rockEl) || {}); P.rockAct = (s && s.rockAct) || 'fire';
    if (P.species === 'rock') { // older saves: spells a rock learned become crystals on his body
      (P.spells || []).forEach((k) => { if (EL[k] && !P.rockEl[k]) P.rockEl[k] = 1; });
      P.spells = []; P.spell = 0;
      if (!P.rockEl[P.rockAct]) P.rockAct = Object.keys(EL).find((k) => P.rockEl[k]) || 'fire';
    }
    P.vanishT = 0; P.vanishCd = 0;
    return r;
  };
  const baseNew = G.newCharacter;
  if (baseNew) G.newCharacter = function () { const r = baseNew.apply(this, arguments); P.rockEl = { fire: 0, lightning: 0, poison: 0 }; P.rockAct = 'fire'; P.vanishT = 0; P.vanishCd = 0; return r; };
  };

  // ---- controls: the hero ability key, and Q for the rock's crystals ----
  if (!RW.ACTIONS.some((a) => a[0] === 'ability')) {
    const at = RW.ACTIONS.findIndex((a) => a[0] === 'give');
    RW.ACTIONS.splice(at + 1, 0, ['ability', 'Hero ability (ghost: turn invisible · rock: ground slam)', ['KeyV']]);
    if (!RW.binds.ability) RW.binds.ability = ['KeyV'];
  }
  const baseActions = P.actions;
  P.actions = function (dt, m) {
    const I = RW.input;
    if (P.species === 'rock') {
      const held = P.held();
      const useHit = I.actHit('use') && !(held && (held.kind === 'food' || held.kind === 'crystal' || held.kind === 'armor'));
      if (I.actHit('spell')) { const have = Object.keys(EL).filter((k) => P.rockEl[k] > 0); if (have.length) { P.rockAct = have[(have.indexOf(P.rockAct) + 1) % have.length]; U.toast('Punching with ' + EL[P.rockAct].name.toLowerCase() + '.'); U.dirty(); } }
      if (useHit || I.actHit('cast')) P.rockSlam();
    }
    const r = baseActions.apply(this, arguments);
    if (I.actHit('ability')) P.ability();
    return r;
  };
  // the chip above the hotbar: the rock's crystal, or the ghost's invisibility
  P.chipText = function (el) {
    if (P.species === 'rock') {
      const n = P.rockEl[P.rockAct] || 0; if (!elTotal(P.rockEl)) return false;
      el.textContent = EL[P.rockAct].name + ' punches (' + n + ' crystal' + (n > 1 ? 's' : '') + ') · ' + (P.slamCd > 0 ? 'slam in ' + Math.ceil(P.slamCd) + 's' : 'F slam') + ' · Q switch'; el.style.borderColor = EL[P.rockAct].c; return true;
    }
    if (P.species === 'ghost') {
      const key = RW.keyName((RW.binds.ability || [])[0]);
      el.textContent = P.vanishT > 0 ? 'Invisible: ' + Math.ceil(P.vanishT) + 's' : P.vanishCd > 0 ? 'Invisible again in ' + Math.ceil(P.vanishCd) + 's' : key + ': turn invisible';
      el.style.borderColor = '#c8d4f0'; return true;
    }
    return false;
  };

  P.chipExtra = function () { // the ghost's invisibility, shown next to its spell
    if (P.species !== 'ghost') return '';
    return P.vanishT > 0 ? ' · Invisible ' + Math.ceil(P.vanishT) + 's' : P.vanishCd > 0 ? ' · Invisible again in ' + Math.ceil(P.vanishCd) + 's' : ' · ' + RW.keyName((RW.binds.ability || [])[0]) + ' invisible';
  };

  // ====================== every frame ======================
  let chipT = 0, lavaT = 0;
  function v2Tick(dt) {
    hauntTick(dt);
    smashCd -= dt; if (P.slamCd > 0) P.slamCd -= dt;
    if (P.ambushT > 0) P.ambushT -= dt;
    if (P.vanishT > 0) { P.vanishT -= dt; if (P.vanishT <= 0) { P.vanishT = 0; U.toast('You are visible again.'); } }
    if (P.vanishCd > 0) P.vanishCd -= dt;
    if ((chipT -= dt) <= 0) { chipT = 0.5; if ((P.species === 'ghost' && (P.vanishT > 0 || P.vanishCd > 0)) || P.slamCd > 0) U.dirty(); }
    // lava burns (a rock takes half)
    if ((lavaT -= dt) <= 0 && !P.dead && inLava(P)) {
      lavaT = 0.45; P.hurt(P.species === 'rock' ? 7 : 14, 0, 'lava');
      RW.fx.element.fire(P.x + 6, P.y + 20, 0.6);
    }
    E.enemies.forEach((e) => { if (e.dead || e.sp === 'ghost' || !inLava(e) || (e.lavaT = (e.lavaT || 0) - dt) > 0) return; e.lavaT = 0.5; e.burn = 3; });
  }

  // ====================== RARE ELITES ======================
  const S = RW.register.species;
  S({ id: 'ghost_tank', type: 'ghosts', name: 'Ghost Tank', world: 'ghost', role: 'enemy', status: 'active', art: { draw: 'ghosttank' },
    w: 46, h: 22, hp: 1100, dmg: 34, speed: 55, behavior: 'ghosttank', elite: true,
    spawn: { worlds: ['ghost', 'duat'], medium: 'air', zones: ['mist', 'caves', 'arena', 'depths', 'river', 'hall'], weight: 1 },
    drops: [['ectoplasm', 1, 4, 7], ['wraith_essence', 0.35, 1, 1], ['stygian_ore', 0.6, 2, 4], ['soul_shard', 0.5, 3, 6]],
    tip: 'Its body fades, but the drill horn never does. Watch the horn. When it charges into a wall the horn sticks: hit it then.',
    blurb: 'A long spiked beast whose scaled body fades out of sight. Only its drill horn always shows. Scales and spikes shrug off most hits.' });
  S({ id: 'lutut', type: 'ghosts', name: 'Lütut', world: 'ghost', role: 'enemy', status: 'active', art: { draw: 'lutut' },
    w: 36, h: 22, hp: 820, dmg: 26, speed: 70, behavior: 'lutut', elite: true,
    spawn: { worlds: ['ghost', 'duat'], medium: 'ground', zones: ['mist', 'caves', 'arena', 'depths', 'river', 'hall'], weight: 1 },
    drops: [['ectoplasm', 1, 3, 5], ['living_vine', 0.5, 1, 3], ['soul_shard', 0.6, 2, 5], ['crystal_gold', 0.08, 1, 1]],
    tip: 'When it breathes in, it pulls you toward its teeth. Get a block between you and its mouth. After its air blast it has to rest: that\'s your moment. Stay away from its tail.',
    blurb: 'Sucks in everything in front of it, then blasts it away with its breath. The spiky tail guards its back.' });
  S({ id: 'thornback', type: 'monsters', name: 'Thornback', world: 'fuzzy', role: 'enemy', status: 'active', art: { draw: 'thornback' },
    w: 32, h: 20, hp: 520, dmg: 30, speed: 120, behavior: 'thornback', elite: true,
    spawn: { worlds: ['fuzzy'], medium: 'ground', zones: ['forest', 'mountains', 'desert'], weight: 1 },
    drops: [['warthog_hide', 1, 2, 4], ['scorpion_stinger', 0.6, 1, 3], ['iron_ore', 0.7, 3, 6], ['crystal_red', 0.25, 1, 1]],
    tip: 'It swims through the ground. Keep moving and watch for the dust: when the ground shakes under you, jump aside. It can only be hit while it is up.',
    blurb: 'A spiked burrower that tunnels beneath you and bursts up where you stand.' });
  S({ id: 'canopy_stalker', type: 'monsters', name: 'Canopy Stalker', world: 'acorn', role: 'enemy', status: 'active', art: { draw: 'stalker' },
    w: 22, h: 24, hp: 460, dmg: 32, speed: 150, behavior: 'stalker', elite: true,
    spawn: { worlds: ['acorn', 'fuzzy'], medium: 'ground', zones: ['jungle', 'canopy'], weight: 1 },
    drops: [['living_vine', 1, 2, 4], ['heartwood', 0.3, 1, 2], ['crystal_green', 0.3, 1, 1]],
    tip: 'It hides in the leaves above. When a shadow appears at your feet, move: it drops right there. It climbs back up after a few lunges.',
    blurb: 'Waits in the leaves for something to walk underneath, then drops.' });
  S({ id: 'geode_golem', type: 'monsters', name: 'Geode Golem', world: 'rock', role: 'enemy', status: 'active', art: { draw: 'geodegolem' },
    w: 34, h: 38, hp: 1300, dmg: 36, speed: 34, behavior: 'golem', elite: true,
    spawn: { worlds: ['rock'], medium: 'ground', zones: ['crystal', 'caves'], weight: 1 },
    drops: [['crystal_shard', 1, 8, 14], ['platinum_ore', 0.5, 2, 4], ['crystal_purple', 0.4, 1, 1], ['crystal_gold', 0.12, 1, 1]],
    tip: 'Its crystal shell takes almost nothing. Jump over its shockwave, and when it slams, its core cracks open for a moment: hit the glowing core.',
    blurb: 'A walking geode. Slams the ground hard enough to split its own shell.' });
  function eliteIntro(id) {
    const sp = RW.SPECIES[id]; if (!sp) return;
    setTimeout(() => { U.banner(sp.name + ' nearby', P.seen[id] ? 'Something strong is close.' : sp.tip); }, 400);
  }
  const B = E.behaviors;
  const pcOf = () => P.center();
  const solidAt = (x, y) => RW.world.solid(Math.floor(x / TS), Math.floor(y / TS));
  const clearLine = (x0, y0, x1, y1) => { const n = Math.ceil(RW.dist(x0, y0, x1, y1) / 6); for (let i = 1; i < n; i++) if (solidAt(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false; return true; };

  // Ghost Tank: drifts through walls with its body fading in and out; aims, then charges horn-first. Missing into a wall gets it stuck.
  B.ghosttank = function (e, dt, sp) {
    const pc = pcOf(), c = ec(e); const see = !P.dead && RW.dist(pc.x, pc.y, c.x, c.y) < 34 * TS;
    e.tstate = e.tstate || 'drift'; e.tt = (e.tt || 0) - dt;
    if (e.tstate === 'drift') {
      const a = Math.atan2(pc.y - c.y, pc.x - c.x), d = RW.dist(pc.x, pc.y, c.x, c.y), want = see ? (d > 150 ? 1 : -0.4) : 0.2;
      e.vx = RW.lerp(e.vx, Math.cos(a) * sp.speed * want, dt * 2); e.vy = RW.lerp(e.vy, Math.sin(a) * sp.speed * want + Math.sin(e.t * 1.5) * 15, dt * 2);
      e.face = pc.x > c.x ? 1 : -1;
      if (see && d < 240 && e.tt <= 0) { e.tstate = 'aim'; e.tt = 0.95; }
    } else if (e.tstate === 'aim') {
      e.vx *= 0.85; e.vy *= 0.85; e.face = pc.x > c.x ? 1 : -1; e.aim = Math.atan2(pc.y - c.y, pc.x - c.x);
      if (Math.random() < dt * 30) RW.fx.spawn({ x: c.x + e.face * 26, y: c.y - 2, life: 0.3, color: '#c8a6ff', add: true, kind: 'glow' });
      if (e.tt <= 0) { e.tstate = 'charge'; e.tt = 0.8; e.cvx = Math.cos(e.aim) * 330; e.cvy = Math.sin(e.aim) * 330; RW.audio.sfx('roar'); }
    } else if (e.tstate === 'charge') {
      e.vx = e.cvx; e.vy = e.cvy; e.face = e.vx >= 0 ? 1 : -1;
      const hx = c.x + e.face * 28, hy = c.y - 2;
      if (solidAt(hx, hy) && e.tt < 0.65) { e.tstate = 'stuck'; e.tt = 1.8; e.vx = e.vy = 0; RW.fx.shake(5, 0.3); RW.audio.sfx('slam'); RW.fx.debris(hx, hy, ['#5d5a60', '#9b6cff'], 10); U.toast('Its horn is stuck: hit it now!'); }
      else if (e.tt <= 0) { e.tstate = 'drift'; e.tt = 2.2; }
    } else if (e.tstate === 'stuck') { e.vx = 0; e.vy = 0; if (e.tt <= 0) { e.tstate = 'drift'; e.tt = 1.8; } }
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.fr = Math.floor(e.t * 3) % 2;
  };
  const tankAlpha = (e) => e.tstate === 'stuck' ? 1 : e.tstate === 'charge' ? 0.05 : e.tstate === 'aim' ? 0.45 : 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(now() * 1.3 + hashStr(e.nid || e.x) * 6));

  // Lütut: walks up, breathes in (pulls you toward its mouth unless a block is in the way), blasts you away, then rests. Tail guards its back.
  B.lutut = function (e, dt, sp) {
    const pc = pcOf(), c = ec(e); const d = RW.dist(pc.x, pc.y, c.x, c.y), see = !P.dead && d < 30 * TS;
    e.vy += 900 * dt; e.ls = e.ls || 'prowl'; e.lt = (e.lt || 0) - dt;
    const front = (pc.x - c.x) * e.face > 0; const mouth = { x: c.x + e.face * 18, y: c.y - 2 };
    if (e.ls === 'prowl') {
      e.face = pc.x > c.x ? 1 : -1; e.vx = see && d > 90 ? e.face * sp.speed : RW.lerp(e.vx, 0, dt * 6);
      if (see && !front && d < 46 && e.lt <= 0) { e.ls = 'tail'; e.lt = 0.55; }
      else if (see && d < 170 && e.lt <= 0) { e.ls = 'suck'; e.lt = 2.1; RW.audio.sfx('fire'); }
    } else if (e.ls === 'suck') {
      e.vx = 0;
      for (let k = 0; k < 3; k++) { const a = RW.rand(-0.6, 0.6) + (e.face > 0 ? 0 : Math.PI), r = RW.rand(40, 150); RW.fx.spawn({ x: mouth.x + Math.cos(a) * r, y: mouth.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.2, vy: -Math.sin(a) * r * 2.2, life: 0.45, color: '#d8e4f0', kind: 'glow', add: true }); }
      if (front && d < 170 && !P.dead && clearLine(mouth.x, mouth.y, pc.x, pc.y)) { const pull = 520 * (1 - d / 190); P.vx += -e.face * pull * dt; P.vy += Math.sign(mouth.y - pc.y) * pull * 0.3 * dt; }
      if (overlap({ x: mouth.x - 8, y: mouth.y - 8, w: 16, h: 16 }, P)) P.hurt(sp.dmg + 10, e.face, e.sp);
      if (e.lt <= 0) { e.ls = 'blast'; e.lt = 0.5; RW.audio.sfx('slam'); }
    } else if (e.ls === 'blast') {
      for (let k = 0; k < 4; k++) RW.fx.spawn({ x: mouth.x, y: mouth.y, vx: e.face * RW.rand(200, 340), vy: RW.rand(-60, 60), life: 0.4, color: '#eef4ff', kind: 'glow', add: true });
      if (front && d < 150 && clearLine(mouth.x, mouth.y, pc.x, pc.y) && !e.blew) { e.blew = true; P.vx += e.face * 520; P.vy = Math.min(P.vy, -220); P.hurt(18, e.face, e.sp); }
      if (e.lt <= 0) { e.ls = 'rest'; e.lt = 1.8; e.blew = false; }
    } else if (e.ls === 'rest') { e.vx = RW.lerp(e.vx, 0, dt * 8); if (Math.random() < dt * 6) RW.fx.spawn({ x: mouth.x, y: mouth.y, vy: -20, life: 0.5, color: '#b8c8e0', kind: 'smoke' }); if (e.lt <= 0) { e.ls = 'prowl'; e.lt = 0.6; } }
    else if (e.ls === 'tail') {
      e.vx = 0; const tx = c.x - e.face * 30;
      if (e.lt < 0.3 && !e.swung) { e.swung = true; if (overlap({ x: tx - 16, y: c.y - 16, w: 32, h: 28 }, P)) P.hurt(sp.dmg + 6, -e.face, e.sp); RW.fx.burst(tx, c.y, ['#ffffff', '#d8c8a0'], 8, 90, { kind: 'spark', add: true }); }
      if (e.lt <= 0) { e.ls = 'prowl'; e.lt = 0.9; e.swung = false; }
    }
    const r = E.move(e, dt, { step: true, grounded: e.ground }); e.ground = r.ground;
    if ((r.wallL || r.wallR) && e.ground && e.ls === 'prowl') e.vy = -300;
    e.fr = e.ls === 'prowl' && Math.abs(e.vx) > 5 ? Math.floor(e.t * 6) % 2 : 0;
  };

  // Thornback: tunnels toward you under the ground (only dust shows), shakes the ground under you, then bursts up and is exposed.
  B.thornback = function (e, dt, sp) {
    const pc = pcOf(); e.tb = e.tb || 'under'; e.tt = (e.tt || 0) - dt;
    const see = !P.dead && RW.dist(pc.x, pc.y, e.x, e.y) < 36 * TS;
    if (e.tb === 'under') {
      const tx = pc.x - e.w / 2; e.x += RW.clamp(tx - e.x, -sp.speed * dt, sp.speed * dt); e.y = RW.lerp(e.y, P.y + P.h - e.h + 26, dt * 3);
      if (Math.random() < dt * 14) RW.fx.spawn({ x: e.x + e.w / 2 + RW.rand(-8, 8), y: P.ground ? P.y + P.h : e.y, vx: RW.rand(-20, 20), vy: -RW.rand(20, 60), life: 0.5, color: '#8a6a4a', size: 2, kind: 'smoke' });
      if (see && Math.abs(e.x + e.w / 2 - pc.x) < 14 && e.tt <= 0) { e.tb = 'rumble'; e.tt = 0.85; e.rx = pc.x; e.ry = P.y + P.h; }
    } else if (e.tb === 'rumble') {
      RW.fx.shake(1.5, 0.1);
      if (Math.random() < dt * 30) RW.fx.spawn({ x: e.rx + RW.rand(-14, 14), y: e.ry, vx: RW.rand(-30, 30), vy: -RW.rand(60, 140), life: 0.6, color: RW.pick(['#8a6a4a', '#5a4a3a']), size: 2, kind: 'smoke' });
      if (e.tt <= 0) { e.tb = 'up'; e.tt = 2.2; e.x = e.rx - e.w / 2; e.y = e.ry - e.h; e.vy = -360; e.vx = (Math.random() < 0.5 ? -1 : 1) * 140; RW.audio.sfx('break'); RW.fx.debris(e.rx, e.ry, ['#6a4a34', '#8a6a4a'], 14); if (overlap({ x: e.rx - 14, y: e.ry - 30, w: 28, h: 30 }, P)) P.hurt(sp.dmg + 8, 0, e.sp); }
    } else if (e.tb === 'up') {
      e.vy += 900 * dt; e.face = pc.x > e.x + e.w / 2 ? 1 : -1; if (e.ground) e.vx = RW.lerp(e.vx, 0, dt * 4);
      const r = E.move(e, dt, { grounded: e.ground }); e.ground = r.ground;
      if (e.tt <= 0 && e.ground) { e.tb = 'under'; e.tt = 1.6; RW.fx.debris(e.x + e.w / 2, e.y + e.h, ['#6a4a34', '#8a6a4a'], 10); }
    }
    e.harmless = !(e.tb === 'up' && e.tt > 1.9); e.fr = Math.floor(e.t * 5) % 2; // only the burst itself hurts; then it's exposed
  };

  // Canopy Stalker: hidden above you; a shadow marks where it will land; it drops, lunges, then climbs back up.
  B.stalker = function (e, dt, sp) {
    const pc = pcOf(); e.cs = e.cs || 'hide'; e.ct = (e.ct || 0) - dt;
    const see = !P.dead && RW.dist(pc.x, pc.y, e.x, e.y) < 40 * TS;
    if (e.cs === 'hide') {
      const tx = pc.x - e.w / 2 + Math.sin(e.t * 0.7) * 40; e.x = RW.lerp(e.x, tx, dt * 1.2); e.y = RW.lerp(e.y, P.y - 9 * TS, dt * 2); e.vx = e.vy = 0;
      if (see && e.ct <= 0 && Math.abs(e.x + e.w / 2 - pc.x) < 40) { e.cs = 'mark'; e.ct = 0.85; e.mx = pc.x; e.my = P.ground ? P.y + P.h : P.y + P.h; }
    } else if (e.cs === 'mark') { e.x = e.mx - e.w / 2; if (e.ct <= 0) { e.cs = 'drop'; e.vy = 200; } }
    else if (e.cs === 'drop' || e.cs === 'hunt') {
      e.vy += 900 * dt;
      if (e.cs === 'hunt') { e.face = pc.x > e.x ? 1 : -1; if (e.ground && e.ct <= 0) { e.vx = e.face * sp.speed * 1.6; e.vy = -220; e.ct = 0.9; e.lunges = (e.lunges || 0) + 1; } else if (e.ground) e.vx *= 0.8; }
      const r = E.move(e, dt, { grounded: e.ground }); const landed = r.ground && !e.ground; e.ground = r.ground;
      if (e.cs === 'drop' && landed) { e.cs = 'hunt'; e.ct = 0.6; e.lunges = 0; RW.fx.shake(3, 0.2); RW.audio.sfx('slam'); }
      if (e.cs === 'hunt' && e.lunges >= 3 && e.ground && e.ct <= 0.3) { e.cs = 'climb'; e.vy = -520; e.ct = 0.8; }
    } else if (e.cs === 'climb') { e.y += -420 * dt; if (e.ct <= 0) { e.cs = 'hide'; e.ct = 3; } }
    e.harmless = e.cs === 'hide' || e.cs === 'mark'; e.fr = e.cs === 'hunt' ? Math.floor(e.t * 8) % 2 : 0;
  };

  // Geode Golem: plods toward you, slams (a shockwave runs along the ground both ways), and its core is open right after.
  B.golem = function (e, dt, sp) {
    const pc = pcOf(), c = ec(e); e.vy += 900 * dt; e.gs = e.gs || 'walk'; e.gt = (e.gt || 0) - dt; e.core = Math.max(0, (e.core || 0) - dt);
    const d = RW.dist(pc.x, pc.y, c.x, c.y), see = !P.dead && d < 28 * TS;
    if (e.gs === 'walk') { e.face = pc.x > c.x ? 1 : -1; e.vx = see ? e.face * sp.speed : 0; if (see && d < 120 && e.gt <= 0) { e.gs = 'rise'; e.gt = 0.7; e.vy = -360; e.vx = 0; } }
    else if (e.gs === 'rise') { e.vx = 0; if (e.gt <= 0 && e.ground) { e.gs = 'slam'; } }
    if (e.gs === 'slam') {
      e.gs = 'open'; e.gt = 2.3; e.core = 2.3; RW.fx.shake(7, 0.4); RW.audio.sfx('slam');
      [-1, 1].forEach((dir) => E.shots.push({ x: c.x + dir * 18, y: e.y + e.h - 6, vx: dir * 210, vy: 0, life: 1.4, owner: 'e', dmg: 24, kind: 'shard', color: '#a86ef0' }));
      RW.fx.debris(c.x, e.y + e.h, ['#3a5a6e', '#a86ef0'], 16);
    } else if (e.gs === 'open') { e.vx = 0; if (e.gt <= 0) { e.gs = 'walk'; e.gt = 1.4; } }
    const r = E.move(e, dt, { step: true, grounded: e.ground }); e.ground = r.ground;
    e.fr = e.gs === 'walk' && Math.abs(e.vx) > 2 ? Math.floor(e.t * 3) % 2 : 0;
  };

  // ---- drawings for the elites (also used for Field Guide cards) ----
  const D = A.drawers;
  D.ghosttank = function () { // field-guide picture: body and horn together
    const c = mk(64, 30), g = c.ctx; tankBody(g, 4, 6, 1); tankHorn(g, 44, 15); A.outline(c, '#1a1424'); return [c];
  };
  function tankBody(g, ox, oy, fr) {
    const body = '#9fb2c8', dark = '#6a7c94';
    for (let x = 0; x < 42; x++) { const top = Math.round(10 - Math.sin(x / 42 * Math.PI) * 7 + (x > 34 ? (x - 34) * 0.4 : 0)); for (let y = top; y <= 18; y++) px(g, ox + x, oy + y, y > 15 ? dark : body); }
    for (let k = 0; k < 9; k++) { const x = ox + 2 + k * 4, top = Math.round(oy + 10 - Math.sin((k * 4 + 2) / 42 * Math.PI) * 7); line(g, x, top, x + 2, top - 4 - (k > 3 && k < 7 ? 1 : 0), '#e8e0f0'); line(g, x + 2, top - 4, x + 3, top, '#c8c0d8'); }
    ell(g, ox + 36, oy + 9, 1, 1, '#14121e');
    for (let k = 0; k < 4; k++) line(g, ox + 8 + k * 6, oy + 18, ox + 7 + k * 6 + fr, oy + 21, dark);
  }
  function tankHorn(g, ox, oy) { // the drill: striped and always solid
    for (let x = 0; x < 18; x++) { const h = Math.max(1, Math.round(4 - x * 0.2)); for (let y = -h; y <= h; y++) px(g, ox + x, oy + y, (x + y) % 3 === 0 ? '#3a3248' : '#d8d0e8'); }
    px(g, ox + 18, oy, '#ffffff');
  }
  const tankCache = {};
  const tankSprites = () => tankCache.s || (tankCache.s = [0, 1].map((fr) => { const b = mk(52, 30); tankBody(b.ctx, 2, 6, fr); A.outline(b, '#2a2438'); const h = mk(22, 12); tankHorn(h.ctx, 1, 6); A.outline(h, '#14121e'); return { body: [b, A.flip(b)], horn: [h, A.flip(h)] }; }));

  D.lutut = function () {
    const frames = [];
    for (let f = 0; f < 2; f++) {
      const c = mk(52, 34), g = c.ctx; const body = '#7a6a8a', belly = '#a898b8', dark = '#4a3a5a';
      // tail curling back with a spiky puff
      for (let k = 0; k < 14; k++) px(g, 12 - k * 0.6, 20 + Math.sin(k / 14 * Math.PI) * 8, dark);
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; line(g, 3, 27, 3 + Math.cos(a) * 3, 27 + Math.sin(a) * 3, '#d8c8a0'); }
      ell(g, 26, 18, 14, 7, body); ell(g, 27, 21, 11, 3, belly);
      // the sail on its back
      line(g, 18, 12, 14, 2, dark); line(g, 30, 11, 34, 1, dark); line(g, 14, 2, 22, 5, '#b8a8c8'); line(g, 22, 5, 27, 3, '#b8a8c8'); line(g, 27, 3, 34, 1, '#b8a8c8');
      for (let y = 4; y < 12; y++) line(g, 17 + (y - 4) * 0.2, y, 31 - (y - 4) * 0.2, y, 'rgba(184,168,200,0.55)');
      // legs
      line(g, 18, 24, 15 + f, 31, dark); line(g, 15 + f, 31, 19 + f, 31, dark); line(g, 32, 24, 35 - f, 31, dark); line(g, 35 - f, 31, 39 - f, 31, dark);
      // round toothy mouth with whiskers
      ell(g, 41, 16, 5, 5, '#2a1a24'); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; px(g, 41 + Math.cos(a) * 4, 16 + Math.sin(a) * 4, '#f0e8d8'); }
      for (let k = 0; k < 4; k++) line(g, 44, 14 + k * 2, 51, 11 + k * 3, '#e8e0f0');
      px(g, 37, 11, '#14121e');
      A.outline(c, '#1a1424'); frames.push(c);
    }
    return frames;
  };
  D.thornback = function () {
    const frames = [];
    for (let f = 0; f < 2; f++) {
      const c = mk(36, 24), g = c.ctx;
      ell(g, 18, 15, 14, 7, '#6a4a34'); ell(g, 18, 18, 11, 3, '#8a6a4a');
      for (let k = 0; k < 7; k++) line(g, 8 + k * 3, 10 - (k % 2), 7 + k * 3, 3 + (k % 2), '#d8c8a0');
      line(g, 30, 16, 35, 15, '#3a2a1c'); line(g, 31, 18, 35, 19, '#3a2a1c'); px(g, 28, 13, '#ff5a3a');
      line(g, 10, 20, 8 + f, 23, '#3a2a1c'); line(g, 24, 20, 26 - f, 23, '#3a2a1c');
      A.outline(c, '#140c08'); frames.push(c);
    }
    return frames;
  };
  D.stalker = function () {
    const frames = [];
    for (let f = 0; f < 2; f++) {
      const c = mk(28, 28), g = c.ctx; const body = '#3a5a2a', leaf = '#4a8a3a';
      ell(g, 14, 15, 8, 9, body); for (let k = 0; k < 6; k++) ell(g, 6 + k * 3, 8 + (k % 2) * 3, 2, 3, leaf);
      px(g, 11, 13, '#ffe36a'); px(g, 17, 13, '#ffe36a');
      line(g, 8, 20, 4 - f, 27, body); line(g, 20, 20, 24 + f, 27, body); line(g, 11, 23, 10, 27, body); line(g, 17, 23, 18, 27, body);
      A.outline(c, '#0c1608'); frames.push(c);
    }
    return frames;
  };
  D.geodegolem = function () {
    const frames = [];
    for (let f = 0; f < 2; f++) {
      const c = mk(40, 42), g = c.ctx;
      ell(g, 20, 20, 15, 16, '#4d4a52'); ell(g, 20, 18, 13, 13, '#5d5a60');
      for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; line(g, 20 + Math.cos(a) * 8, 18 + Math.sin(a) * 8, 20 + Math.cos(a) * 14, 18 + Math.sin(a) * 14, '#3a5a6e'); }
      ell(g, 20, 19, 5, 6, '#2c4656'); px(g, 15, 10, '#a86ef0'); px(g, 25, 10, '#a86ef0');
      rect(g, 4, 16, 5, 14, '#4d4a52'); rect(g, 31, 16, 5, 14, '#4d4a52');
      rect(g, 11 + f, 34, 6, 7, '#3d3a47'); rect(g, 23 - f, 34, 6, 7, '#3d3a47');
      A.outline(c, '#141218'); frames.push(c);
    }
    return frames;
  };

  // in-game drawing: the parts that change with state (the tank's fading body, the stalker's shadow, the golem's core)
  const baseDraw = E.draw;
  E.draw = function (g, cam, time) {
    const t = now();
    E.enemies.forEach((e) => {
      if (isGhostMob(e.sp)) e.alpha = 0.1 + 0.78 * (0.5 + 0.5 * Math.sin(t * 1.5 + hashStr(e.nid || e.haunt || e.x) * 9)); // ghosts fade in and out
      if (e.sp === 'ghost_tank') e.customDraw = true;
      if (e.sp === 'thornback') e.alpha = e.tb === 'up' || e.mirror ? 1 : 0;
      if (e.sp === 'canopy_stalker') e.alpha = e.cs === 'hide' || e.cs === 'mark' ? 0 : 1;
    });
    baseDraw.call(this, g, cam, time);
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y);
    E.enemies.forEach((e) => {
      if (e.dead) return;
      if (e.sp === 'ghost_tank') {
        const s = tankSprites()[e.frame % 2], dir = e.face > 0 ? 0 : 1, x = Math.round(e.x + ox + e.w / 2 - 26), y = Math.round(e.y + oy + e.h - 26);
        g.globalAlpha = tankAlpha(e); g.drawImage(e.hitT > 0 ? A.tint(s.body[dir], '#ffffff', 0.7) : s.body[dir], x, y); g.globalAlpha = 1;
        const hx = e.face > 0 ? x + 44 : x - 14; g.drawImage(s.horn[dir], hx, y + 9);
        if (e.tstate === 'aim') { g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 30); g.fillStyle = '#c8a6ff'; g.fillRect(e.face > 0 ? hx + 18 : hx, y + 14, 3, 3); g.globalAlpha = 1; }
        RW.fx.light(e.x + e.w / 2 + e.face * 28, e.y + e.h / 2, 0.2, 0.15, 0.35);
        if (e.showBar > 0 && e.hp < e.maxhp) { g.fillStyle = '#0c0a10'; g.fillRect(e.x + ox, e.y + oy - 8, e.w, 3); g.fillStyle = '#e0525a'; g.fillRect(e.x + ox, e.y + oy - 8, e.w * Math.max(0, e.hp / e.maxhp), 3); }
      } else if (e.sp === 'canopy_stalker' && (e.cs === 'mark' || e.cs === 'hide')) {
        if (e.cs === 'mark') { g.fillStyle = 'rgba(10,8,14,' + (0.25 + 0.35 * (1 - (e.ct || 0) / 0.85)) + ')'; g.beginPath(); g.ellipse(e.mx + ox, e.my + oy - 1, 14, 3, 0, 0, 6.29); g.fill(); }
        if (Math.sin(t * 2 + e.x) > 0.96) { g.fillStyle = '#ffe36a'; g.fillRect(Math.round(e.x + ox + 8), Math.round(e.y + oy + 12), 1, 1); g.fillRect(Math.round(e.x + ox + 14), Math.round(e.y + oy + 12), 1, 1); }
      } else if (e.sp === 'geode_golem' && e.core > 0) {
        const cx = e.x + ox + e.w / 2, cy = e.y + oy + e.h / 2 - 2; g.fillStyle = '#ffe36a'; g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 20); g.beginPath(); g.ellipse(cx, cy, 5, 6, 0, 0, 6.29); g.fill(); g.globalAlpha = 1;
        RW.fx.light(e.x + e.w / 2, e.y + e.h / 2, 0.7, 0.55, 0.2);
      }
    });
  };

  // ====================== CYITORS: the Empire's elite peacekeepers ======================
  D.cyator = function (o) {
    const guard = o && o.v === 'guard'; const frames = [];
    for (let f = 0; f < 2; f++) {
      const c = mk(40, 34), g = c.ctx; const body = guard ? '#e8e0f0' : '#f4eefa', dark = '#b8b0c8', blade = '#d8dce8';
      // a hooked head on top of a body that tapers to a split tail
      for (let y = 4; y <= 30; y++) { const t = (y - 4) / 26; const w = y < 12 ? 3 + (y - 4) * 0.6 : 8 - t * 5; for (let x = -Math.round(w); x <= Math.round(w); x++) px(g, 20 + x + (y < 10 ? 2 : 0), y, x > w - 2 ? dark : body); }
      line(g, 20, 30, 16, 33, dark); line(g, 20, 30, 24, 33, dark);
      // the single eye
      ell(g, 23, 9, 2, 2, '#ffffff'); px(g, 23, 9, guard ? '#14121e' : '#c03050');
      // arms ending in long curved blades, swept down
      const lift = f ? -1 : 0;
      line(g, 14, 15, 7, 15 + lift, dark); line(g, 26, 15, 33, 15 + lift, dark);
      for (let k = 0; k < 9; k++) { px(g, 7 - k * 0.6, 15 + lift + k * 1.6, blade); px(g, 6 - k * 0.6, 16 + lift + k * 1.6, '#ffffff'); px(g, 33 + k * 0.6, 15 + lift + k * 1.6, blade); px(g, 34 + k * 0.6, 16 + lift + k * 1.6, '#ffffff'); }
      if (!guard) { rect(g, 18, 2, 6, 1, '#f2c94c'); px(g, 19, 1, '#f2c94c'); px(g, 22, 1, '#f2c94c'); } // the commander's band
      A.outline(c, '#1a1424'); frames.push(c);
    }
    return frames;
  };
  const cyGuard = RW.SPECIES.cyator; if (cyGuard) { cyGuard.name = 'Cyitor'; cyGuard.blurb = 'One of the Empire\'s elite peacekeepers. One eye, blade arms, and no patience for trouble. On your side.'; }
  const vexa = RW.SPECIES.vexa; if (vexa) vexa.blurb = 'Commander of the Pale Keep and of its Cyitors, the Empire\'s elite peacekeepers. Will forge stygian for you.';
  const ty = RW.TYPES && RW.TYPES.cyators; if (ty) { ty.name = 'Cyitors'; ty.blurb = 'The Empire\'s elite peacekeepers. One eye and two blade arms. They keep the peace on the Ghost World.'; }
  A._rockCache = {}; // rebuild any cached sprites so the new drawings are used
  // ====================== (unused) the old medium-size fuzzy (1.5x), who turned to run sideways ======================
  // The medium fuzzy (42x45, 1.5x today's sprite), drawn the way the in-game fuzzy always looked:
  // his own fur palette, dithered 4-tone shading, a scalloped fur edge, a lighter muzzle, fur curls, a sheen on top,
  // rosy cheeks and a little smile. Kept from the newer requests: the round eye with the red rim, feet on the ground row,
  // and a true side view where only the near arm shows.
  A.fuzzyMed = function (look, view, frame) {
    const A = RW.art, { px, rect, ell } = A; const c = A.canvas(42, 45), g = c.ctx; const C = A.furColors(look);
    const mid = RW.mix(C.base, C.dark, 0.5), deep = RW.mix(C.dark, '#000000', 0.3), muzzle = RW.mix(C.base, C.light, 0.3);
    const blush = RW.mix(C.base, '#ff7a8a', 0.5), ink = '#1a0e0a', red = '#c8302a', lip = '#5a2a1a';
    const BAYER = [[0, 0.5], [0.75, 0.25]];
    frame = frame || 0; const side = view === 'side';
    const run = side && frame >= 1 && frame <= 4;
    const bob = run && frame % 2 ? -1 : 0, jump = side && frame === 5 ? -3 : 0;
    const GROUND = 44, R0 = 14;
    const cx = side ? 20 : 21, cy = 25 + bob + jump;
    const fo = side ? 6 : view === 'three' ? 3 : 0; // how far the face has turned toward the way he's facing
    const fl = look.fluff || 'round';
    const rad = (a) => {
      if (fl === 'shaggy') return R0 + 0.9 + 2.5 * Math.abs(Math.sin(a * 6 + 0.4)) * (Math.sin(a) > -0.4 ? 1 : 0.55);
      if (fl === 'spiky') { const s2 = Math.abs(Math.sin(a * 5 + 0.3)); return R0 + (Math.sin(a) < 0.1 ? Math.pow(s2, 5) * 5.4 : 0.6 + s2 * 0.9); }
      return R0 + 0.4 + 1.5 * Math.abs(Math.sin(a * 7));
    };
    const shade = (x, y) => { const d = Math.hypot(x, y); return 0.58 - x / R0 * 0.32 - y / R0 * 0.42 - Math.max(0, d - R0 + 2) * 0.07 + (BAYER[(y + 40) & 1][(x + 40) & 1] - 0.375) * 0.12; };
    const tone = (l) => (l > 0.8 ? C.light : l > 0.42 ? C.base : l > 0.12 ? mid : C.dark);
    // feet: little dark pads standing on the ground row
    const foot = (x, lift) => { const y = GROUND - 2 - lift; rect(g, x - 3, y, 8, 3, C.dark); rect(g, x - 2, y - 1, 6, 1, mid); px(g, x - 2, y + 2, deep); px(g, x, y + 2, deep); px(g, x + 2, y + 2, deep); };
    if (side) {
      if (frame === 5) { foot(cx - 5, 2 - jump); foot(cx + 6, 1 - jump); }
      else if (run) { const st = [[-8, 0, 9, 1], [-3, 1, 4, 0], [9, 0, -8, 1], [4, 0, -3, 1]][frame - 1]; foot(cx + st[0], st[1]); foot(cx + st[2], st[3]); }
      else { foot(cx - 5, 0); foot(cx + 6, 0); }
    } else { foot(cx - 6, 0); foot(cx + 6, 0); }
    // the far paw peeks out behind him in three-quarter view only
    const paw = (x, y) => { rect(g, x - 1, y, 7, 4, C.dark); rect(g, x, y - 1, 5, 6, C.dark); rect(g, x, y, 5, 4, mid); rect(g, x + 1, y - 1, 3, 1, mid); px(g, x + 1, y, C.base); px(g, x + 2, y, C.base); px(g, x + 1, y + 1, C.base); };
    if (view === 'three') paw(cx - 18, cy + 4);
    // the fur ball
    for (let y = -21; y <= 20; y++) for (let x = -21; x <= 20; x++) {
      const d = Math.hypot(x, y); if (d > rad(Math.atan2(y, x))) continue;
      let col = tone(shade(x, y));
      const mx = x - (3 + fo), my = y - 5;
      if ((mx * mx) / (side ? 12 : 16) + (my * my) / 7 < 1 && col !== C.dark) col = muzzle;
      px(g, cx + x, cy + y, col);
    }
    // fur curls, kept off the face
    for (let i = 0; i < 46; i++) {
      const a = RW.hash2(i, 5, 3) * Math.PI * 2, r = 4 + RW.hash2(i, 9, 3) * (R0 - 5);
      const x = Math.round(Math.cos(a) * r), y = Math.round(Math.sin(a) * r);
      if (Math.abs(x - (2 + fo)) < 11 && y > -10 && y < 10) continue;
      const l = shade(x, y); const col = l > 0.42 ? mid : l > 0.12 ? C.base : mid;
      const ox = Math.round(Math.cos(a + 0.6)), oy = Math.round(Math.sin(a + 0.6));
      px(g, cx + x, cy + y, col); px(g, cx + x + ox, cy + y + oy, col); if (i % 3 === 0) px(g, cx + x + ox * 2, cy + y + oy * 2 + 1, col);
    }
    // the sheen on the top-left fur
    const sh = RW.mix(C.light, '#ffffff', 0.25);
    for (let k = 0; k < 8; k++) { px(g, cx - 9 + k, cy - 12 + Math.round(Math.abs(k - 3.5) * 0.6), sh); if (k > 1 && k < 6) px(g, cx - 9 + k, cy - 11 + Math.round(Math.abs(k - 3.5) * 0.6), RW.mix(C.light, sh, 0.5)); }
    // eyes: the round eye with highlights and a red rim underneath
    const eyes = look.eyes || 'big'; const ey = cy - 4;
    const eye = (x) => {
      if (eyes === 'happy') { px(g, x - 2, ey + 1, ink); px(g, x - 1, ey, ink); px(g, x, ey - 1, ink); px(g, x + 1, ey, ink); px(g, x + 2, ey + 1, ink); return; }
      if (eyes === 'sleepy') { rect(g, x - 2, ey + 1, 5, 1, ink); rect(g, x - 1, ey, 3, 1, mid); return; }
      if (eyes === 'tiny') { rect(g, x - 1, ey - 1, 3, 3, ink); px(g, x - 1, ey - 1, '#ffffff'); return; }
      rect(g, x - 1, ey - 4, 3, 1, ink); rect(g, x - 2, ey - 3, 5, 1, ink); rect(g, x - 3, ey - 2, 7, 5, ink); rect(g, x - 2, ey + 3, 5, 1, ink); rect(g, x - 1, ey + 4, 3, 1, ink);
      rect(g, x - 2, ey + 2, 5, 1, red); rect(g, x - 1, ey + 3, 3, 1, red);
      rect(g, x - 2, ey - 3, 3, 2, '#ffffff'); px(g, x - 2, ey - 1, '#ffffff'); px(g, x + 2, ey + 1, '#e8dcd4');
    };
    const mo = look.mouth || 'smile';
    const mouth = (m) => {
      const my = cy + 5;
      if (mo === 'smile') { px(g, m - 2, my, lip); px(g, m - 1, my + 1, lip); px(g, m, my + 1, lip); px(g, m + 1, my + 1, lip); px(g, m + 2, my, lip); }
      else if (mo === 'open') { rect(g, m - 2, my, 5, 1, lip); rect(g, m - 1, my + 1, 3, 2, '#e87a8a'); px(g, m - 2, my + 1, lip); px(g, m + 2, my + 1, lip); }
      else if (mo === 'fangs') { rect(g, m - 2, my, 5, 1, lip); px(g, m - 2, my + 1, '#ffffff'); px(g, m + 2, my + 1, '#ffffff'); }
    };
    if (side) {
      eye(cx + 10); rect(g, cx + 5, ey + 7, 3, 1, blush); mouth(cx + 12);
      // only the near arm: a round paw on his side that swings as he runs
      const sw = run ? [0, 3, 0, -3][frame - 1] : 0;
      if (frame === 6) { paw(cx + 13, cy + 1); c.hand = { x: cx + 17, y: cy + 2 }; }
      else if (frame === 5 || frame === 7) { paw(cx - 9, cy - 1); c.hand = { x: cx - 6, y: cy + 3 }; }
      else { paw(cx - 7 + sw, cy + 6); c.hand = { x: cx - 4 + sw, y: cy + 11 }; }
    } else {
      eye(cx - 5 + fo); eye(cx + 7 + fo);
      rect(g, cx - 11 + fo, ey + 6, 3, 1, blush); rect(g, cx + 10 + fo, ey + 6, 3, 1, blush);
      mouth(cx + 1 + fo);
      if (view === 'three') { paw(cx + 13, cy + 4); c.hand = { x: cx + 16, y: cy + 5 }; }
      else { paw(cx - 19, cy + 4); paw(cx + 15, cy + 4); c.hand = { x: cx + 17, y: cy + 5 }; }
    }
    A.outline(c, '#1a100a');
    return c;
  };
  // The Ghost World's bigger generator (v2s8.js) plugs in here, underneath the legendary-chest and town-portal steps
  // that v2s2.js and v2s3.js wrap around every world's generator.
  { const gd = RW.WORLDS.ghost; if (gd && gd.generate) { const g0 = gd.generate; gd.generate = function () { return (RW.v2GhostGen || g0).apply(this, arguments); }; } }
  // The fuzzy hero is the original main-game sprite again (same size, same look). A.fuzzyMed above is the old 1.5x
  // version, kept here unused in case it comes back; nothing installs it into A.fuzzySprites any more.
})(window.RW);
