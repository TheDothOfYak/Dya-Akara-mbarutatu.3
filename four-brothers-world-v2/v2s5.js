// V2 stage 5: living trees, and a fix for the rock smashing what he builds.
//  * Shake the leaves (hit them) for nuts and berries. Leaves aren't destroyed, and a tree needs a minute and a half before it gives again.
//  * Chop a tree and it doesn't vanish: it topples away from you, hurts anything it lands on (you too), and lies down as logs.
//    Fallen logs are solid: walk on them, or fell a tree across a gap for a bridge. Saw logs up for wood.
//  * The stump stays and, after a few minutes, grows a sapling and then a whole new tree.
//  * Rock: never smashes while a block, torch or seed is in his hand (building), has to wind up on a block before he smashes it,
//    and never smashes player-built blocks (planks, bricks, doors, logs). Right-clicking a door or chest no longer slams the ground.
// Saves: stumps keep their growth timer the same way crops do. Nothing else changes the save format.
(function (RW) {
  const A = RW.art, E = RW.ent, U = RW.ui, P = RW.player, TS = RW.TILE, R = RW.register;
  const { px, rect, ell } = A;
  const W = () => RW.world;
  const now = () => performance.now() / 1000;
  const wall = () => Date.now() / 1000;
  const say = (id, title, text) => { S.said = S.said || {}; if (S.said[id]) return; S.said[id] = 1; U.toast(title + ': ' + text); };
  const S = (P.trees = { said: {}, shakeT: 0, aim: null, falls: [], scanT: 0, grow: 240, noSlam: false });

  // ====================== ITEMS AND TILES ======================
  A.iconExtra.nut = (g, a, b) => { ell(g, 8, 9, 4, 5, a); rect(g, 5, 4, 6, 3, b); rect(g, 6, 3, 4, 1, b); px(g, 8, 2, b); px(g, 6, 8, '#fff0c8'); px(g, 6, 9, '#fff0c8'); };
  if (!RW.ITEMS.tree_nut) R.items([
    { id: 'tree_nut', name: 'Tree Nut', kind: 'food', heal: 9, icon: { s: 'nut', a: '#b8843c', b: '#6a4a2e' }, desc: 'Shaken out of the leaves of a tree. Hit the leaves, not the trunk, and the tree keeps growing. Rich and filling.' },
  ]);
  const addTile = (def) => { if (RW.T[def.key] != null) return RW.T[def.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({ id }, def)); RW.T[def.key] = id; return id; };
  const T_LOG = addTile({ key: 'log', name: 'Fallen Log', solid: true, hard: 1, time: 0.5, drop: ['wood', 1, 2], decor: 'log', colors: ['#6a4a30', '#8a6440', '#4a3220'] });
  const T_STUMP = addTile({ key: 'stump', name: 'Tree Stump', hard: 1, time: 0.6, drop: ['wood', 1, 1], decor: 'stump', colors: ['#6a4a30', '#8a6440', '#4a3220'] });

  const baseDecor = A.drawDecor;
  A.drawDecor = function (g, t, sx, sy, time, stage, x, y) {
    if (t.decor === 'log') {
      const w = W(), L = w.get(x - 1, y) === T_LOG, Rr = w.get(x + 1, y) === T_LOG;
      g.fillStyle = '#4a3220'; g.fillRect(sx, sy + 2, TS, TS - 2);
      g.fillStyle = '#6a4a30'; g.fillRect(sx, sy + 3, TS, TS - 5);
      g.fillStyle = '#8a6440'; g.fillRect(sx, sy + 4, TS, 3);
      g.fillStyle = '#a07a52'; g.fillRect(sx, sy + 4, TS, 1);
      g.fillStyle = '#3a2618'; for (let i = 0; i < 4; i++) g.fillRect(sx + ((x * 5 + i * 5) % 15), sy + 8 + (i % 2) * 3, 2, 1);
      g.fillStyle = '#563a24'; g.fillRect(sx, sy + TS - 3, TS, 1);
      if (!L) { g.fillStyle = '#c8a070'; g.fillRect(sx, sy + 3, 3, TS - 4); g.fillStyle = '#8a6440'; g.fillRect(sx + 1, sy + 6, 1, 5); }
      if (!Rr) { g.fillStyle = '#c8a070'; g.fillRect(sx + TS - 3, sy + 3, 3, TS - 4); g.fillStyle = '#8a6440'; g.fillRect(sx + TS - 2, sy + 6, 1, 5); }
      return;
    }
    if (t.decor === 'stump') {
      const p = W().plant.get(W().idx(x, y)), age = p == null ? 1 : Math.min(1, (wall() - p) / S.grow);
      g.fillStyle = '#3a2618'; g.fillRect(sx + 2, sy + 5, 12, 11); g.fillStyle = '#6a4a30'; g.fillRect(sx + 3, sy + 6, 10, 10);
      g.fillStyle = '#4a3220'; g.fillRect(sx + 2, sy + 15, 12, 1); g.fillRect(sx + 1, sy + 14, 2, 2); g.fillRect(sx + 13, sy + 14, 2, 2);
      g.fillStyle = '#c8a070'; g.fillRect(sx + 3, sy + 4, 10, 3); g.fillStyle = '#a07a52'; g.fillRect(sx + 5, sy + 5, 6, 1); g.fillStyle = '#8a6440'; g.fillRect(sx + 7, sy + 4, 2, 2);
      if (age >= 0.45) { const hgt = age >= 0.8 ? 7 : 4; g.fillStyle = '#4a8a3a'; g.fillRect(sx + 7, sy + 4 - hgt, 2, hgt); g.fillStyle = '#6ab84a'; g.fillRect(sx + 5, sy + 3 - hgt, 3, 2); g.fillRect(sx + 8, sy + 2 - hgt, 3, 2); }
      return;
    }
    return baseDecor.apply(this, arguments);
  };

  // ====================== SHAKING LEAVES ======================
  const cool = new Map(); // a patch of canopy -> the time it gives again
  const isLeaf = (t) => !!t && !!t.tree && t.decor !== 'trunk';
  function shake(tx, ty, dt) {
    P.mine = null;
    if ((S.shakeT -= dt) > 0) return; S.shakeT = 0.45;
    const cx = tx * TS + 8, cy = ty * TS + 8;
    for (let i = 0; i < 5; i++) RW.fx.spawn({ x: cx + RW.rand(-7, 7), y: cy + RW.rand(-5, 5), vx: RW.rand(-25, 25), vy: RW.rand(-5, 30), life: 0.8, color: RW.pick(['#3f8a32', '#5aaa42', '#2a5a22']), size: 2, kind: 'smoke' });
    RW.audio.sfx('swing'); P.swingT = 0.2; P.swingDur = 0.2;
    const key = Math.floor(tx / 6) + ',' + Math.floor(ty / 6) + ',' + W().def.id, ready = cool.get(key) || 0;
    if (now() < ready) { say('bare', 'Bare branches', 'This tree needs a minute and a half before it gives more.'); return; }
    cool.set(key, now() + 90);
    const nuts = RW.randi(1, 2) + (P.species === 'acorn' ? 1 : 0);
    E.dropItem('tree_nut', nuts, cx, cy);
    if (Math.random() < 0.3) E.dropItem('berry', 1, cx + 4, cy);
    say('shake', 'Shaken', 'Hit the leaves and nuts fall out. The tree keeps growing. Chop the trunk to fell it.');
  }

  // ====================== FELLING ======================
  const isTrunk = (x, y) => { const q = RW.TILES[W().get(x, y)]; return q.tree && q.decor === 'trunk'; };
  const isCanopy = (x, y) => { const q = RW.TILES[W().get(x, y)]; return (q.tree && q.decor !== 'trunk') || q.key === 'vines'; };
  const baseBreak = P.breakTile;
  P.breakTile = function (tx, ty) {
    const t = RW.TILES[W().get(tx, ty)];
    if (t && t.tree && t.decor === 'trunk' && fell(tx, ty, t)) return;
    return baseBreak.apply(this, arguments);
  };
  function fell(tx, ty, t) {
    const w = W(), T = RW.T, TL = RW.TILES;
    // this tree's trunk: the blocks joined to the cut, at or above it
    const mine = new Set(), cols = new Set(), tq = [[tx, ty - 1], [tx - 1, ty], [tx + 1, ty]];
    while (tq.length && mine.size < 60) {
      const [x, y] = tq.shift(), k = x + ',' + y; if (mine.has(k) || y > ty || !isTrunk(x, y)) continue;
      mine.add(k); cols.add(x); tq.push([x, y - 1], [x - 1, y], [x + 1, y]);
    }
    // only a single slim tree topples: giant trees and the big trunks the villages are built in come down the old way
    if (!mine.size || mine.size > 20 || cols.size !== 1 || !cols.has(tx)) return false;
    const pc = P.center(), cutX = tx * TS + 8;
    const dir = Math.sign(cutX - pc.x) || P.face || 1;
    // its leaves: canopy joined to that trunk, nearer this trunk than any other tree's
    const ownsLeaf = (x, y) => {
      const dMine = Math.abs(x - tx); let dOther = 99;
      for (let dx = -12; dx <= 12; dx++) { const cx = x + dx; if (cx === tx) continue; for (let dy = -2; dy <= 16; dy++) if (isTrunk(cx, y + dy)) { dOther = Math.min(dOther, Math.abs(dx)); break; } }
      return dMine <= dOther;
    };
    const px0 = (dir > 0 ? tx + 1 : tx) * TS, py0 = ty * TS; // the hinge: the top corner of the cut, on the side it falls to
    const tiles = [], trunk = [], seen = new Set(), q = []; let n = 0;
    mine.forEach((k) => { const [x, y] = k.split(',').map(Number); q.push([x, y]); });
    const take = (x, y, isT) => {
      const id = w.get(x, y), tt = TL[id];
      const rec = { rx: x * TS + 8 - px0, ry: y * TS + 8 - py0, leaf: !isT, tx: x, ty: y, c: isT ? (tt.key === 'paletrunk' ? '#b8b0a0' : '#6a4a30') : (tt.key === 'vines' ? '#4a7a3a' : tt.key === 'oakleaves' ? '#3a7a30' : '#3f8a32'), h: RW.hash2(x, y, 7) };
      tiles.push(rec); if (isT) trunk.push(rec);
      w.setTile(x, y, T.air); n++;
    };
    while (q.length && n < 400) {
      const [x, y] = q.shift(), k = x + ',' + y; if (seen.has(k)) continue; seen.add(k);
      if (mine.has(k)) take(x, y, true); else if (isCanopy(x, y) && ownsLeaf(x, y)) take(x, y, false); else continue;
      q.push([x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]);
    }
    // the cut itself: a stump if it stands on ground and is an ordinary tree, otherwise just gone
    const cx = tx * TS + 8, cy = ty * TS + 8;
    RW.audio.sfx('break'); RW.fx.debris(cx, cy, ['#6a4a30', '#8a6440'], 8);
    E.dropItem('wood', RW.randi(1, 2), cx, cy);
    const below = TL[w.get(tx, ty + 1)];
    if (t.key === 'trunk' && below.solid && !below.tree) w.setTile(tx, ty, T_STUMP, { plant: wall() }); else w.setTile(tx, ty, T.air);
    w.settleWater(tx, ty);
    const L = trunk.length;
    S.falls.push({ wid: w.def.id, px: px0, py: py0, dir, t: 0, dur: Math.min(1.4, 0.75 + L * 0.05), tiles, trunk, hitE: new Set(), hitP: false, thudded: false });
    say('timber', 'Timber', 'Trees fall away from you and hurt anything they land on. They land as logs you can walk across.');
    return true;
  }
  const ease = (f) => f * f;
  function fallTick(f, dt) {
    f.t += dt; const k = Math.min(1, f.t / f.dur), a = (Math.PI / 2) * ease(k), s = Math.sin(a * f.dir), c = Math.cos(a), drop = TS * k * k;
    if (k > 0.25) f.trunk.forEach((r) => {
      const x = f.px + r.rx * c - r.ry * s, y = f.py + r.rx * s + r.ry * c + drop;
      const box = { x: x - 7, y: y - 7, w: 14, h: 14 };
      E.enemies.forEach((e) => { if (e.dead || e.dummy || e.friendly || f.hitE.has(e) || !E.overlap(box, e.hitbox ? e.hitbox() : e)) return; f.hitE.add(e); E.damage(e, 16 + 3 * f.trunk.length, f.dir, 7, false, '#a0784a'); RW.fx.shake(3, 0.2); });
      if (!f.hitP && !P.dead && E.overlap(box, P)) { f.hitP = true; P.hurt(10 + 2 * f.trunk.length, f.dir, 'tree'); U.toast('A tree fell on you.'); }
    });
    if (k >= 1) landLogs(f);
    return k >= 1;
  }
  function landLogs(f) {
    const w = W(), TL = RW.TILES; let logs = 0, wood = 0, last = null;
    const free = (x, y) => { const id = w.get(x, y), tt = TL[id]; return id === RW.T.air || (tt && !tt.solid && id !== RW.T.water && !tt.crop && !tt.loot && !tt.storage && !tt.use && !tt.toggle && (tt.soft || tt.decor === 'tallgrass' || tt.decor === 'flower' || tt.tree || tt.decor === 'stump')); };
    f.trunk.forEach((r) => {
      const x = Math.floor((f.px - r.ry * f.dir) / TS), y = Math.floor((f.py + r.rx * f.dir + TS) / TS), box = { x: x * TS, y: y * TS, w: TS, h: TS };
      const blocked = !w.inb(x, y) || !free(x, y) || (!P.dead && E.overlap(box, P)) || E.enemies.some((e) => !e.dead && E.overlap(box, e.hitbox ? e.hitbox() : e));
      if (blocked) { wood += RW.randi(1, 2); E.dropItem('wood', RW.randi(1, 2), x * TS + 8, y * TS); return; }
      w.setTile(x, y, T_LOG); logs++; last = [x, y];
      RW.fx.debris(x * TS + 8, y * TS + 12, ['#6a4a30', '#8a6440', '#a09070'], 4);
    });
    const leaves = f.tiles.filter((r) => r.leaf).length;
    if (leaves > 6) { const nn = Math.min(3, Math.floor(leaves / 8)); if (nn) E.dropItem('tree_nut', nn, f.px - f.dir * 4 + f.dir * 40, f.py - 8); }
    const lx = f.px + f.dir * 24, ly = f.py + TS;
    for (let i = 0; i < 10; i++) RW.fx.spawn({ x: lx + RW.rand(-30, 30) * f.dir, y: ly - 2, vx: RW.rand(-20, 20), vy: -RW.rand(10, 40), life: 0.5, color: RW.pick(['#a8988a', '#8a7a68', '#c8b898']), size: 2, kind: 'smoke' });
    RW.fx.shake(4, 0.25); RW.audio.sfx('slam');
    if (logs) say('log', 'Fallen log', 'Logs are solid: walk across them, or fell a tree over a gap for a bridge. Chop a log up for wood.');
  }
  function drawFalls(g, cam) {
    S.falls.forEach((f) => {
      const k = Math.min(1, f.t / f.dur), a = (Math.PI / 2) * ease(k) * f.dir, drop = TS * k * k;
      g.save(); g.translate(Math.round(f.px - cam.x), Math.round(f.py - cam.y + drop)); g.rotate(a);
      f.tiles.forEach((r) => { if (r.leaf) return; const x = Math.round(r.rx - 8), y = Math.round(r.ry - 8); g.fillStyle = r.c; g.fillRect(x + 2, y, 12, 16); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 11, y, 3, 16); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(x + 3, y, 2, 16); });
      f.tiles.forEach((r) => {
        if (!r.leaf) return; const x = Math.round(r.rx - 8), y = Math.round(r.ry - 8);
        g.fillStyle = r.c; g.fillRect(x, y, 16, 16); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + ((r.h * 11) | 0) % 10, y + ((r.h * 97) | 0) % 10, 5, 4);
        g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x + ((r.h * 53) | 0) % 11, y + ((r.h * 31) | 0) % 11, 4, 3);
      });
      g.restore();
    });
  }
  const baseDrawPlayer = E.drawPlayer;
  E.drawPlayer = function (g, cam, p) {
    if (p === P && S.falls.length) drawFalls(g, cam);
    return baseDrawPlayer.apply(this, arguments);
  };

  // ====================== REGROWTH ======================
  function growTree(x, y) {
    const w = W(), T = RW.T, TL = RW.TILES, gk = TL[w.get(x, y + 1)].key;
    const kind = gk === 'snow' ? 'pine' : gk === 'jgrass' || gk === 'mud' ? 'jungle' : 'oak';
    const r = (k) => RW.hash2(x, k, w.W);
    let h = kind === 'jungle' ? 8 + Math.floor(r(1) * 5) : kind === 'pine' ? 7 + Math.floor(r(1) * 5) : 6 + Math.floor(r(1) * 4);
    const clear = (xx, yy) => { const id = w.get(xx, yy), tt = TL[id]; return id === T.air || (!tt.solid && id !== T.water && (tt.soft || tt.tree || tt.decor === 'tallgrass' || tt.decor === 'flower' || tt.decor === 'stump')); };
    while (h > 4) { let ok = true; for (let yy = y - h + 1; yy < y; yy++) if (!clear(x, yy)) { ok = false; break; } if (ok) break; h--; }
    for (let yy = y - h + 1; yy < y; yy++) if (!clear(x, yy)) return false;
    for (let yy = y; yy > y - h; yy--) w.setTile(x, yy, T.trunk);
    const top = y - h, put = (xx, yy) => { if (w.get(xx, yy) === T.air) w.setTile(xx, yy, T.leaves); };
    if (kind === 'pine') { for (let k = 0; k < 6; k++) { const ww = Math.max(0, 3 - Math.floor(k / 2)); for (let dx = -ww; dx <= ww; dx++) put(x + dx, top + 2 - k); } }
    else { const rad = kind === 'jungle' ? 3.6 + r(2) * 1.2 : 2.8 + r(2); for (let dy = -4; dy <= 4; dy++) for (let dx = -5; dx <= 5; dx++) if (dx * dx + dy * dy <= rad * rad) put(x + dx, top + dy); }
    RW.fx.burst(x * TS + 8, y * TS, ['#5aaa42', '#a8d85a'], 8, 50, { grav: 40 });
    return true;
  }
  function regrow() {
    const w = W(); if (!w || !w.fg) return; const pcx = Math.floor((P.x + 6) / TS), pcy = Math.floor((P.y + 14) / TS);
    for (let y = Math.max(1, pcy - 40); y <= Math.min(w.H - 2, pcy + 40); y++) for (let x = Math.max(1, pcx - 70); x <= Math.min(w.W - 2, pcx + 70); x++) {
      if (w.fg[y * w.W + x] !== T_STUMP) continue;
      const p = w.plant.get(y * w.W + x);
      if (p == null) { w.plant.set(y * w.W + x, wall()); continue; }
      if (wall() - p >= S.grow) growTree(x, y);
    }
  }

  // ====================== every frame ======================
  const baseUpdateEnemies = E.updateEnemies;
  E.updateEnemies = function (dt) {
    for (let i = S.falls.length - 1; i >= 0; i--) { const f = S.falls[i]; if (f.wid !== W().def.id) { S.falls.splice(i, 1); continue; } if (fallTick(f, dt)) S.falls.splice(i, 1); }
    if ((S.scanT -= dt) <= 0) { S.scanT = 2; try { regrow(); } catch (e) { /* never let a tree stop the game */ } }
    return baseUpdateEnemies.apply(this, arguments);
  };

  // ====================== mining: shaking, and the rock ======================
  const baseMine = P.mineTile;
  P.mineTile = function (tx, ty, dt) {
    const t = RW.TILES[W().get(tx, ty)];
    if (isLeaf(t)) return shake(tx, ty, dt);
    if (P.species === 'rock') {
      const held = P.held();
      if (held && (held.kind === 'place' || held.kind === 'torch' || held.plant)) { P.mine = null; S.aim = null; return; } // building: never smash
      if (t && t.solid && !(RW.v2Built && RW.v2Built(W().get(tx, ty)))) { // a smash has to wind up on the block first
        if (!S.aim || S.aim.tx !== tx || S.aim.ty !== ty) S.aim = { tx, ty, t: 0 };
        S.aim.t += dt; if (S.aim.t < 0.16) return;
      } else S.aim = null;
    }
    return baseMine.apply(this, arguments);
  };

  // the rock's slam must not fire when the right click was meant for a door or a chest
  const baseActions = P.actions;
  P.actions = function (dt, m) {
    S.noSlam = false; if (!RW.input.act('attack')) S.aim = null;
    if (P.species === 'rock' && RW.input.actHit('use')) {
      const tx = Math.floor(m.x / TS), ty = Math.floor(m.y / TS), pc = P.center();
      const reach = RW.dist(pc.x, pc.y, tx * TS + 8, ty * TS + 8) <= 5.2 * TS * P.scale(), t = W().tile(tx, ty);
      if (reach && (t.toggle || t.use || t.loot || t.storage || t.key === 'runestone' || t.key === 'runestone_lit')) S.noSlam = true;
    }
    try { return baseActions.apply(this, arguments); } finally { S.noSlam = false; }
  };
  const baseSlam = P.rockSlam;
  if (baseSlam) P.rockSlam = function () { if (S.noSlam) return; return baseSlam.apply(this, arguments); };
})(window.RW);
