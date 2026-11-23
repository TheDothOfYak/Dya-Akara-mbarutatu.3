// 4 Brothers World V3: Tuftwood's creatures. Enemies have tells and weak spots; nothing drops loot.
// Beaten creatures are "sent packing" (they scamper off in a puff), and come back later.
(function () {
  'use strict';
  const V3 = window.V3, U = V3.util, P = V3.paint, W = V3.world, S = V3.sky, HS = V3.heroes, TAU = U.TAU;
  const INK = '#3b1f12';
  const C = (V3.creatures = { list: [], homes: [], sent: 0 });
  const PT = () => V3.party, A = () => V3.audio;

  const DEF = {
    slime: { w: 44, h: 34, hp: 3, canHost: true, name: 'Dew Slime' },
    warthog: { w: 78, h: 54, hp: 5, canHost: true, name: 'Warthog' },
    bat: { w: 40, h: 34, hp: 2, canHost: true, name: 'Dusk Bat', fly: true },
    eater: { w: 64, h: 44, hp: 4, canHost: false, name: 'Eater Rock' },
    snail: { w: 40, h: 30, hp: 99, canHost: true, critter: true, name: 'Snail' },
    frog: { w: 36, h: 28, hp: 99, canHost: true, critter: true, name: 'Pond Frog' },
    snag: { w: 150, h: 430, hp: 3, canHost: false, name: 'Old Snagroot' },
  };
  C.DEF = DEF;
  C.spawn = (kind, x, o) => {
    const d = DEF[kind]; if (!d) return null;
    const c = Object.assign({ kind, x, y: W.groundY(x), vx: 0, vy: 0, w: d.w, h: d.h, hp: d.hp, f: U.chance(0.5) ? 1 : -1, state: 'idle', t: U.rand(0, 2), dazed: 0, spooked: 0, snared: 0, possessed: false, canHost: d.canHost, critter: !!d.critter, fly: !!d.fly, grounded: true, flash: 0, hitCd: 0, homeX: x, anim: U.rand(0, 9), lastOnce: -1 }, o || {});
    if (kind === 'snail' && !c.route) c.route = [x, x];
    if (kind === 'snag') initSnag(c);
    C.list.push(c); return c;
  };
  C.init = () => {
    C.list.length = 0; C.sent = 0;
    for (let i = W.platforms.length - 1; i >= 0; i--) if (W.platforms[i].kind === 'pad') W.platforms.splice(i, 1);
    const homes = [['slime', 2250], ['slime', 2960], ['slime', 5460], ['slime', 5720], ['slime', 8010], ['slime', 3230],
      ['warthog', 2640], ['warthog', 3080], ['warthog', 5500], ['eater', 1500], ['eater', 2360], ['eater', 6420],
      ['bat', 1260, { y: 64 + 34, hang: true }], ['bat', 1460, { y: 64 + 34, hang: true }], ['bat', 1640, { y: 64 + 34, hang: true }], ['bat', 2420, { nightOnly: true }], ['bat', 5560, { nightOnly: true }],
      ['snail', 3900, { route: [3860, 4180] }], ['snail', 4520, { route: [4420, 4800], shell: '#e58fb0' }], ['snail', 2180, { route: [2150, 2240], golden: true }],
      ['frog', 6690], ['frog', 6905, { y: 48 }], ['frog', 7262, { y: 48 }], ['frog', 7700], ['snag', 6000]];
    C.homes = homes.map((h) => ({ kind: h[0], x: h[1], o: h[2], c: null, respawn: 0 }));
    for (const h of C.homes) h.c = C.spawn(h.kind, h.x, h.o);
    for (const px of [6905, 7085, 7262, 7435]) W.platforms.push({ x1: px - 44, x2: px + 44, y: 48, kind: 'pad' });
  };

  // ---------- queries and effects used by the heroes ----------
  const centre = (c) => [c.x, c.y - c.h / 2];
  C.nearest = (x, y, r, filter) => {
    let best = null, bd = r;
    for (const c of C.list) {
      if (c.dead || (filter && !filter(c))) continue;
      let d;
      if (c.kind === 'snag' && !c.calm) { d = 1e9; for (const v of c.vines) if (v.state === 'rear' || v.state === 'stuck') d = Math.min(d, U.dist(x, y, v.tx, v.ty)); }
      else { const p = centre(c); d = U.dist(x, y, p[0], p[1]) - c.w * 0.3; }
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };
  C.damage = (c, d, o) => {
    o = o || {};
    if (c.dead || c.critter) { if (c.critter) startle(c, o.from); return false; }
    if (c.kind === 'snag') return false;
    const behind = o.from !== undefined && Math.sign(c.x - o.from) === c.f;   // hit in the back
    if (c.kind === 'warthog' && !c.dazed && !c.snared && !behind && !o.heavy && o.src !== 'slam' && o.src !== 'roll' && o.src !== 'chill' && d > 0) {
      A().sfx('thud'); P.say(c.x, c.y - c.h - 20, 'tusks!', '#fff', 20); c.vx += Math.sign(c.x - o.from) * 60; V3.bus.emit('hint', 'tusks'); return false;
    }
    if (c.kind === 'eater' && c.state !== 'chew' && !c.dazed && !o.heavy && o.src !== 'slam' && o.src !== 'roll' && d > 0) { A().sfx('thud'); P.say(c.x, c.y - c.h - 16, 'clunk', '#ddd', 20); V3.bus.emit('hint', 'eater'); return false; }
    if ((c.dazed > 0 || c.snared > 0 || behind) && d > 0) { d *= 2; P.say(c.x, c.y - c.h - 24, behind && !c.dazed ? 'back hit!' : 'ouch!', '#ffe08a', 22); }
    c.hp -= d; c.flash = 0.16;
    if (o.kx !== undefined && c.kind !== 'eater') { c.vx = o.kx; c.vy = o.ky || -200; c.grounded = false; }
    else if (o.radial && c.kind !== 'eater') { c.vx = Math.sign(c.x - o.from || 1) * o.radial; c.vy = o.ky || -300; c.grounded = false; }
    if (o.daze) c.dazed = Math.max(c.dazed, o.daze);
    if (c.state === 'charge' || c.state === 'tell') { c.state = 'idle'; c.t = 0; }
    if (c.hang) { c.hang = false; c.state = 'fly'; }
    if (c.hp <= 0) sendPacking(c); else A().sfx('squish', { pitch: c.kind === 'warthog' ? 0.7 : 1.2 });
    return true;
  };
  const sendPacking = (c) => {
    c.dead = true; C.sent++;
    A().sfx('squish', { pitch: 0.8 }); A().sfx('chime', { vol: 0.4 });
    P.burst(c.x, c.y - c.h / 2, 18, { kind: 'fluff', col: '#fff3dc', speed: 220, life: 0.6, r: 10 });
    P.burst(c.x, c.y - c.h / 2, 6, { kind: 'star', col: '#ffe08a', speed: 260, life: 0.5, r: 7 });
    P.say(c.x, c.y - c.h - 20, U.pick(['sent packing!', 'off it goes!', 'and stay out!', 'scram!']), '#fff3c0', 22);
    if (PT().host === c) PT().unpossess();
    V3.bus.emit('packed', c.kind, c);
  };
  const startle = (c, from) => {
    if (c.kind === 'snail') { c.hide = 3; A().sfx('plop', { pitch: 1.6, vol: 0.5 }); }
    if (c.kind === 'frog' && c.grounded) { c.f = from !== undefined && from > c.x ? -1 : 1; c.vx = c.f * 260; c.vy = -560; c.grounded = false; A().sfx('ribbit'); }
    V3.bus.emit('startle', c);
  };
  C.hitCircle = (x, y, r, dmg, o) => {
    o = o || {}; let n = 0;
    for (const c of C.list) {
      if (c.dead || c.possessed) continue;
      if (c.kind === 'snag') { if (dmg > 0 && snagHit(c, x, y, r, o)) n++; continue; }
      const p = centre(c); if (U.dist(x, y, p[0], p[1]) > r + c.w * 0.45) continue;
      if (o.once !== undefined) { if (c.lastOnce === o.once) continue; c.lastOnce = o.once; }
      if (o.cd) { if (c.hitCd > 0) continue; c.hitCd = o.cd; }
      if (o.push) { if (!c.critter && c.kind !== 'eater' && c.kind !== 'warthog') { c.vx = Math.sign(c.x - o.from || 1) * o.kx; c.vy = o.ky; c.grounded = false; } else if (c.critter) startle(c, o.from); continue; }
      if (C.damage(c, dmg, o) || c.critter) n++;
    }
    return n;
  };
  C.chain = (x, y, r, count, dmg) => {
    let n = 0, px = x, py = y; const done = new Set();
    for (let i = 0; i < count; i++) {
      const c = C.nearest(px, py, r, (c) => !c.critter && !done.has(c) && c.kind !== 'snag'); if (!c) break;
      done.add(c); const p = centre(c); bolt(px, py, p[0], p[1]); C.damage(c, dmg, { src: 'zap', from: px, kx: Math.sign(c.x - px) * 240, ky: -260, daze: 1.2, heavy: true }); px = p[0]; py = p[1]; n++;
    }
    for (const c of C.list) if (c.kind === 'snag' && !c.calm) for (const v of c.vines) if ((v.state === 'stuck' || v.state === 'rear') && U.dist(x, y, v.tx, v.ty) < r) { bolt(x, y, v.tx, v.ty); vineHurt(c, v, 6); n++; break; }
    return n;
  };
  const bolt = (x0, y0, x1, y1) => { for (let i = 0; i <= 10; i++) { const k = i / 10; P.emit({ kind: 'spark', x: U.lerp(x0, x1, k) + U.rand(-14, 14), y: U.lerp(y0, y1, k) + U.rand(-14, 14), vx: U.rand(-160, 160), vy: U.rand(-160, 160), col: '#fff6b0', life: 0.3, r: 7 }); } };
  C.spook = (x, y, r, t) => { for (const c of C.list) { if (c.dead || c.kind === 'snag' || c.kind === 'eater') continue; const p = centre(c); if (U.dist(x, y, p[0], p[1]) < r) { if (c.critter) startle(c, x); else { c.spooked = t; c.f = c.x < x ? -1 : 1; c.state = 'idle'; if (c.hang) { c.hang = false; c.state = 'fly'; } P.say(c.x, c.y - c.h - 16, '!!', '#fff', 26); } } } };
  C.snare = (c, t, x, y) => {
    if (c.kind === 'snag') { let bv = null, bd = 1e9; for (const v of c.vines) { const d = U.dist(x, y, v.tx, v.ty); if ((v.state === 'rear' || v.state === 'stuck') && d < bd) { bd = d; bv = v; } } if (bv) { bv.state = 'stuck'; bv.t = 0; bv.tangled = true; bv.stuckFor = 4.2; P.say(bv.tx, bv.ty - 30, 'tangled!', '#b5e06a', 22); V3.bus.emit('tangle'); } return; }
    if (c.critter) { startle(c); return; }
    c.snared = t; c.vx = 0; if (c.state === 'charge' || c.state === 'tell') c.state = 'idle'; if (c.kind !== 'eater') C.damage(c, 1, { src: 'snare' }); else { c.state = 'chew'; c.t = 0; }
  };

  // ---------- the Ghost drives a borrowed body ----------
  C.drive = (c, dt, ax, ay, jump, act) => {
    c.rideT = (c.rideT || 0) + dt; if (ax) c.f = ax;
    if (c.kind === 'slime') { c.vx = U.approach(c.vx, ax * 190, 1400 * dt); if (jump && c.grounded) { c.vy = -860; c.grounded = false; A().sfx('squish'); } }
    else if (c.kind === 'warthog') {
      if (c.state === 'charge') { c.vx = c.f * 700; c.t += dt; if (c.t > 1.1) c.state = 'idle'; if (C.hitCircle(c.x + c.f * 40, c.y - 28, 44, 2, { src: 'roll', from: c.x - c.f * 50, kx: c.f * 600, ky: -400, cd: 0.6 })) { HS.hitFx(c.x + c.f * 50, c.y - 30); V3.game.shake(7); A().sfx('punch'); } }
      else { c.vx = U.approach(c.vx, ax * 230, 1600 * dt); if (act) { c.state = 'charge'; c.t = 0; c.run = 0; A().sfx('snort'); } if (jump && c.grounded) { c.vy = -520; c.grounded = false; } }
    } else if (c.kind === 'bat') { c.vx = U.damp(c.vx, ax * 330, 6, dt); c.vy = U.damp(c.vy, ay * 330, 6, dt); c.hang = false; c.state = 'fly'; if (act) { C.spook(c.x, c.y, 220, 3); A().sfx('boo', { pitch: 2 }); P.emit({ kind: 'ring', x: c.x, y: c.y - 16, R: 200, r: 5, col: '#e6d0ff', life: 0.4 }); } }
    else if (c.kind === 'frog') { if (c.grounded) c.vx = U.approach(c.vx, 0, 2000 * dt); if (jump && c.grounded) { c.vx = c.f * 330; c.vy = -720; c.grounded = false; A().sfx('ribbit'); } }
    else if (c.kind === 'snail') { c.hide = 0; c.vx = ax * 15; if (c.rideT > 3.5 && !c.said) { c.said = true; P.say(c.x, c.y - 70, '...this was a mistake', '#dfe8ff', 20); V3.bus.emit('found', 'snailride'); } }
    physics(c, dt);
  };
  const physics = (c, dt) => {
    if (c.fly) { c.x += c.vx * dt; c.y += c.vy * dt; const gy = W.groundY(c.x); if (c.y > gy) { c.y = gy; c.vy = -Math.abs(c.vy) * 0.4; } c.x = U.clamp(c.x, 100, W.X1 - 150); return; }
    const water = W.waterAt(c.x, c.y - 4);
    c.vy += (water ? 300 : 2000) * dt; if (water) { c.vy = Math.min(c.vy, 90); if (c.kind === 'frog') c.vy -= 700 * dt; }
    const sp = Math.abs(c.vx);
    W.moveBody(c, dt, { onWall: (wl) => { if (c.kind === 'warthog' && c.possessed && c.state === 'charge' && sp > 400) { HS.breakWall(wl); V3.bus.emit('found', 'hogwall'); return true; } return false; } });
    if (c.grounded && !c.possessed && c.state !== 'charge') c.vx = U.approach(c.vx, 0, 900 * dt);
    if (!c.critter && !c.possessed && c.x > 3470 && c.x < 5190) { const out = c.x < 4330 ? -1 : 1; c.x += out * 260 * dt; c.vx = out * 200; c.f = out; if (c.state === 'charge' || c.state === 'tell') { c.state = 'tired'; c.t = 0; } c.spooked = 0; }
  };

  // ---------- behaviour ----------
  C.update = (dt) => {
    const p = PT(), px = p.x, py = p.y, hidden = (p.id === 'ghost' && p.solidT <= 0) || p.host;
    for (const h of C.homes) { // come back after a while, when nobody is looking
      if (h.c && h.c.dead && h.kind !== 'snag') { h.respawn += dt; if (h.respawn > 100 && Math.abs(px - h.x) > 1100) { C.list.splice(C.list.indexOf(h.c), 1); h.c = C.spawn(h.kind, h.x, h.o); h.respawn = 0; } }
    }
    for (let i = C.list.length - 1; i >= 0; i--) { const c = C.list[i]; if (c.dead && !C.homes.some((h) => h.c === c)) C.list.splice(i, 1); }
    for (const c of C.list) {
      if (c.dead) continue;
      c.anim += dt; c.flash -= dt; c.hitCd -= dt;
      if (Math.abs(c.x - px) > 1500 && c.kind !== 'snail') continue;
      if (c.kind === 'snag') { updSnag(c, dt, p, hidden); continue; }
      if (c.possessed) continue;
      if (!c.met && Math.abs(c.x - px) < 380 && Math.abs(c.y - py) < 300) { c.met = true; V3.bus.emit('met', c.kind); }
      if (c.snared > 0) { c.snared -= dt; c.vx = 0; if (!c.fly) physics(c, dt); continue; }
      if (c.dazed > 0) { c.dazed -= dt; if (!c.fly) physics(c, dt); else { c.vy += 600 * dt; physics(c, dt); } continue; }
      const dx = px - c.x, adx = Math.abs(dx), near = adx < 460 && Math.abs(py - c.y) < 220 && !hidden;
      if (c.spooked > 0) { // runs blindly; blunders hurt
        c.spooked -= dt; c.f = dx > 0 ? -1 : 1; c.vx = c.f * (c.kind === 'warthog' ? 430 : 260);
        if (c.fly) { c.vy = -120; physics(c, dt); continue; }
        if (c.grounded && c.kind === 'slime' && U.chance(dt * 4)) { c.vy = -420; c.grounded = false; }
        physics(c, dt);
        if (c.hitWall || W.waterAt(c.x, c.y - 4)) { C.damage(c, 2, { src: 'blunder', heavy: true, daze: 2 }); c.spooked = 0; P.say(c.x, c.y - c.h - 20, 'bonk!', '#fff', 22); V3.bus.emit('found', 'spookbonk'); }
        const t = treeNear(c.x, 26); if (t && c.kind === 'warthog') { treeBonk(c, t); c.spooked = 0; }
        continue;
      }
      c.t += dt;
      if (c.kind === 'slime') {
        if (c.grounded) {
          if (c.state === 'squash') { if (c.t > 0.38) { c.state = 'idle'; c.t = 0; c.vx = c.f * (near ? 250 : 120); c.vy = near ? -560 : -380; c.grounded = false; A().sfx('squish', { vol: 0.35, pitch: 1.3 }); } }
          else if (c.t > (near ? 0.7 : 2.2)) { c.state = 'squash'; c.t = 0; c.f = near ? Math.sign(dx) || 1 : (Math.abs(c.x - c.homeX) > 200 ? Math.sign(c.homeX - c.x) : U.pick([-1, 1])); }
        }
        physics(c, dt); touch(c, p, 1, 26);
      } else if (c.kind === 'warthog') {
        if (c.state === 'idle') { // grazing
          c.vx = U.approach(c.vx, Math.sin(c.anim * 0.4) > 0.6 ? c.f * 40 : 0, 300 * dt);
          if (Math.abs(c.x - c.homeX) > 260) c.f = Math.sign(c.homeX - c.x);
          if (near && c.t > 1.2) { c.state = 'tell'; c.t = 0; c.f = Math.sign(dx) || 1; A().sfx('snort'); }
        } else if (c.state === 'tell') { // paws the ground, snorts steam: you have this long to pick a spot
          c.vx = 0; if (U.chance(dt * 14)) P.emit({ x: c.x + c.f * 44, y: c.y - 26, vx: c.f * 70, vy: -20, col: '#fff', life: 0.5, r: 6, grow: 1.5, a: 0.6 });
          if (U.chance(dt * 9)) P.emit({ x: c.x - c.f * 30, y: c.y, vx: -c.f * 120, vy: -90, g: 500, col: '#c9a878', life: 0.4, r: 5 });
          if (c.t > 0.85) { c.state = 'charge'; c.t = 0; c.run = 0; }
        } else if (c.state === 'charge') {
          c.vx = c.f * 640; c.run += Math.abs(c.vx) * dt;
          const t = treeNear(c.x + c.f * 30, 24);
          if (t && c.run > 160) treeBonk(c, t);
          else if (c.run > 900) { c.state = 'tired'; c.t = 0; }
        } else if (c.state === 'tired') { c.vx = U.approach(c.vx, 0, 1400 * dt); if (c.t > 1.1) { c.state = 'idle'; c.t = 0; } }
        physics(c, dt);
        if (c.state === 'charge' && c.hitWall) { c.dazed = 3; c.state = 'idle'; c.vx = -c.f * 160; c.vy = -260; A().sfx('thud'); V3.game.shake(6); P.burst(c.x + c.f * 40, c.y - 30, 8, { kind: 'star', col: '#ffe08a', speed: 200, r: 7 }); }
        if (c.state === 'charge') { for (const o of C.list) if (o !== c && !o.dead && o.kind === 'snag' && !o.calm && Math.abs(o.x - c.x) < 80) { snagKnot(o, true); c.dazed = 3; c.state = 'idle'; c.vx = -c.f * 200; c.vy = -300; V3.bus.emit('found', 'hogram'); } }
        touch(c, p, c.state === 'charge' ? 2 : 1, 34, c.state !== 'charge');
      } else if (c.kind === 'bat') {
        const awake = S.night > 0.5 || W.caveAt(c.x, c.y) > 0.3;
        if (c.nightOnly && S.night < 0.4) { c.y = -2000; continue; }
        if (c.nightOnly && c.y < -1500) { c.y = W.groundY(c.homeX) - 260; c.x = c.homeX; c.state = 'fly'; }
        if (c.hang) { if (near && adx < 260 && c.t > 1 && awake && py > c.y - 40) { c.hang = false; c.state = 'fly'; c.t = 0; } continue; }
        if (c.state === 'swoop') { c.vx = c.sx; c.vy = c.sy; if (c.t > 0.55) { c.state = 'fly'; c.t = 0; } }
        else if (c.state === 'tell') { c.vx *= 0.9; c.vy = -40; if (c.t > 0.5) { const d = Math.hypot(dx, py - 34 - c.y) || 1; c.sx = (dx / d) * 560; c.sy = ((py - 34 - c.y) / d) * 560; c.state = 'swoop'; c.t = 0; A().sfx('glide', { pitch: 1.8 }); } }
        else {
          const tx = near ? px + Math.sin(c.anim * 1.3) * 150 : c.homeX + Math.sin(c.anim * 0.5) * 200, ty = (near ? py : W.groundY(c.x)) - 190 + Math.sin(c.anim * 2.3) * 30;
          c.vx = U.damp(c.vx, U.clamp(tx - c.x, -1, 1) * 200, 2, dt); c.vy = U.damp(c.vy, U.clamp((ty - c.y) / 60, -1, 1) * 170, 3, dt); if (Math.abs(c.vx) > 20) c.f = Math.sign(c.vx);
          if (near && c.t > 2.4 && adx < 330) { c.state = 'tell'; c.t = 0; A().sfx('hoot', { pitch: 2.4, vol: 0.4 }); }
        }
        physics(c, dt); touch(c, p, 1, 24);
      } else if (c.kind === 'eater') {
        if (c.state === 'idle') { if (!hidden && adx < 74 && Math.abs(py - c.y) < 60 && c.t > 0.5) { c.state = 'tell'; c.t = 0; A().sfx('crack', { vol: 0.5, pitch: 1.4 }); } }
        else if (c.state === 'tell') { if (c.t > 0.3) { c.state = 'chew'; c.t = 0; A().sfx('squish', { pitch: 0.5 }); if (adx < 84 && Math.abs(py - c.y) < 70) { const r = p.hurt(2, c.x, 'eater'); if (r === 'parry') c.dazed = 3; } V3.game.shake(5); } }
        else if (c.state === 'chew') { if (c.t > 1.9) { c.state = 'idle'; c.t = 0; } }
        // a slime that hops in gets eaten, and the Eater is busy burping
        for (const o of C.list) if (o.kind === 'slime' && !o.dead && Math.abs(o.x - c.x) < 46 && Math.abs(o.y - c.y) < 40 && c.state !== 'chew') { sendPacking(o); c.state = 'chew'; c.t = -1.5; P.say(c.x, c.y - 70, 'BURP', '#c9f5a8', 26); A().sfx('ribbit', { pitch: 0.4 }); V3.bus.emit('found', 'burp'); }
      } else if (c.kind === 'snail') {
        c.hide = Math.max(0, (c.hide || 0) - dt);
        if (adx < 90 && Math.abs(p.vx) > 240 && !hidden) c.hide = 2;
        if (!c.hide) { const goal = c.route[(S.t > 0.5) ? 1 : 0]; const d = goal - c.x; c.f = Math.sign(d) || 1; c.vx = Math.abs(d) > 6 ? c.f * (8 + S.rain * 10) : 0; } else c.vx = 0;
        physics(c, dt);
      } else if (c.kind === 'frog') {
        if (c.grounded) { c.vx = 0; if (c.t > 3 + U.hash(c.homeX) * 4) { c.t = 0; c.croak = 0.5; if (adx < 700) A().sfx('ribbit', { vol: 0.4, pitch: 0.8 + U.hash(c.homeX) * 0.6 }); } if (adx < 70 && !hidden && Math.abs(p.vx) > 120) startle(c, px); if (Math.abs(c.x - c.homeX) > 150 && c.t > 2) { c.f = Math.sign(c.homeX - c.x); c.vx = c.f * 230; c.vy = -520; c.grounded = false; } }
        c.croak = Math.max(0, (c.croak || 0) - dt);
        physics(c, dt);
      }
    }
  };
  const touch = (c, p, dmg, reach, frontOnly) => {
    if (p.host || U.dist(c.x, c.y - c.h / 2, p.x, p.y - p.h / 2) > reach + p.w * 0.5) return;
    if (frontOnly && Math.sign(p.x - c.x) !== c.f) return;
    if (p.id === 'fuzzy' && p.puffing) { c.vx = Math.sign(c.x - p.x) * 300; c.vy = -260; c.grounded = false; return; }
    const r = p.hurt(dmg, c.x, c.kind);
    if (r === 'parry') { c.dazed = 2.6; c.vx = Math.sign(c.x - p.x) * 320; c.vy = -300; c.grounded = false; if (c.state === 'charge' || c.state === 'swoop') c.state = 'idle'; }
  };
  const treeNear = (x, r) => { for (const t of V3.scenery.trees) if (Math.abs(t.x - x) < r) return t; return null; };
  const treeBonk = (c, t) => {
    c.dazed = 3.2; c.state = 'idle'; c.t = 0; c.vx = -c.f * 180; c.vy = -280; c.grounded = false; t.shake = 0.6;
    A().sfx('thud'); V3.game.shake(8); P.burst(c.x + c.f * 36, c.y - 30, 10, { kind: 'star', col: '#ffe08a', speed: 220, r: 7 });
    for (let i = 0; i < 14; i++) P.emit({ kind: 'leaf', x: t.x + U.rand(-90, 90), y: t.y - t.h + U.rand(-60, 60), vx: U.rand(-40, 40), vy: U.rand(20, 90), g: 60, col: U.pick(['#7cbf45', '#cfe86a', '#f2b544']), life: 2.2, r: 8, windy: 60 });
    P.say(c.x, c.y - c.h - 30, 'BONK', '#fff3c0', 28); V3.bus.emit('found', 'treebonk');
  };

  // ---------- Old Snagroot: the fight you think your way through ----------
  const initSnag = (c) => {
    c.vines = [0, 1, 2].map((i) => ({ i, state: 'rest', t: 0, tx: c.x + (i - 1) * 150, ty: c.y - 150, ax: c.x + (i - 1) * 40, ay: c.y - 300 + i * 20, wig: i * 2 }));
    c.knots = 0; c.knotOpen = 0; c.awake = false; c.calm = false; c.cool = 2; c.limp = 0; c.roar = 0; c.rideX = c.x;
  };
  const knotPos = (c) => [c.x + 6, c.y - 150];
  const snagKnot = (c, open) => { if (c.calm) return; c.knotOpen = open ? 4.5 : 0; if (open) { A().sfx('crack', { pitch: 0.8 }); P.say(knotPos(c)[0], knotPos(c)[1] - 70, 'the knot is open!', '#ffd27a', 24); } };
  const vineHurt = (c, v, openFor) => {
    if (c.calm) return; v.state = 'recoil'; v.t = 0; v.tangled = false; c.canHost = false;
    A().sfx('vine'); HS.hitFx(v.tx, v.ty, '#b5e06a'); snagKnot(c, true); if (openFor) c.knotOpen = openFor;
    if (PT().host === c) PT().unpossess();
  };
  const snagHit = (c, x, y, r, o) => {
    if (c.calm || !c.awake) return false;
    const k = knotPos(c);
    if (c.knotOpen > 0 && U.dist(x, y, k[0], k[1]) < r + 70) { knotBurst(c); return true; }
    for (const v of c.vines) if (v.state === 'stuck' && U.dist(x, y, v.tx, v.ty - 40) < r + 60) { vineHurt(c, v); return true; }
    if (o.src === 'slam' && Math.abs(x - c.x) < 260) { c.limp = 2.4; for (const v of c.vines) if (v.state !== 'rest') { v.state = 'stuck'; v.t = 0; v.stuckFor = 2.4; v.ty = W.groundY(v.tx); } P.say(c.x, c.y - 330, 'whoa!', '#fff', 26); V3.bus.emit('found', 'snagslam'); return true; }
    if (U.dist(x, y, k[0], k[1]) < r + 60) { P.say(k[0], k[1] - 60, 'bark like iron', '#ddd', 20); V3.bus.emit('hint', 'snag'); A().sfx('thud'); }
    return false;
  };
  const knotBurst = (c) => {
    c.knots++; c.knotOpen = 0; c.roar = 1.2; c.cool = 2.2; c.flash = 0.25;
    const k = knotPos(c); A().sfx('zapbig', { pitch: 0.6 }); A().sfx('hoot', { pitch: 0.35 }); V3.game.shake(14); V3.game.hitStop(0.12);
    P.burst(k[0], k[1], 26, { kind: 'drop', col: '#ffc24a', speed: 380, g: 700, life: 0.9, r: 4 }); P.emit({ kind: 'ring', x: k[0], y: k[1], R: 220, r: 10, col: '#ffd27a', life: 0.5 });
    for (const v of c.vines) { v.state = 'recoil'; v.t = 0; }
    V3.bus.emit('knot', c.knots);
    if (c.knots >= 3) {
      c.calm = true; c.calmT = 0; c.canHost = false; if (PT().host === c) PT().unpossess(); A().sfx('bloom');
      if (c.spar) { c.spar = false; P.say(c.x, c.y - 330, 'good round, little ones', '#ffe9c0', 26); } // a friendly rematch: no second reward
      else { A().sfx('discover'); V3.bus.emit('snagcalm', c); }
    }
  };
  // Once he is calm, poke him twice for a gentle rematch: same fight, vines bump instead of hurt.
  // It keeps the Snagroot-only surprises (Hog vs Tree, Stop Hitting Yourself, Scarecrow Sprout, Rattled) findable.
  C.sparPoke = (p) => {
    const c = C.list.find((o) => o.kind === 'snag' && o.calm && Math.abs(p.x - o.x) < 260 && Math.abs(p.y - o.y) < 400);
    if (!c) return false;
    if (!(c.sparAsk > 0)) { c.sparAsk = 4; P.say(c.x, c.y - 330, 'stretch my roots again? poke once more', '#ffe9c0', 22); A().sfx('hoot', { pitch: 0.5, vol: 0.5 }); return true; }
    c.sparAsk = 0; c.spar = true; c.calm = false; c.knots = 0; c.knotOpen = 0; c.awake = true; c.cool = 2.2; c.roar = 1; c.limp = 0;
    for (const v of c.vines) { v.state = 'rest'; v.t = 0; v.decoy = null; }
    P.say(c.x, c.y - 330, 'gently now!', '#ffe9c0', 26); A().sfx('hoot', { pitch: 0.4 });
    return true;
  };
  const updSnag = (c, dt, p, hidden) => {
    const dx = p.x - c.x, adx = Math.abs(dx);
    c.roar = Math.max(0, c.roar - dt); c.knotOpen = Math.max(0, c.knotOpen - dt); c.limp = Math.max(0, c.limp - dt);
    if (c.calm) { c.calmT += dt; if (c.sparAsk > 0) c.sparAsk -= dt; for (const v of c.vines) { v.state = 'rest'; v.tx = U.damp(v.tx, c.x + (v.i - 1) * 170, 2, dt); v.ty = U.damp(v.ty, c.y - 120 + Math.sin(S.time * 1.4 + v.i) * 26, 2, dt); } if (c.calmT < 4 && U.chance(dt * 20)) P.emit({ kind: 'leaf', x: c.x + U.rand(-200, 200), y: c.y - 380 + U.rand(-80, 80), vy: 50, g: 20, windy: 60, col: U.pick(['#ffc2d0', '#ff9db5', '#fff']), life: 3, r: 7 }); return; }
    if (!c.awake) { if (adx < 520 && Math.abs(p.y - c.y) < 400) { c.awake = true; c.cool = 1.6; c.roar = 1; A().sfx('hoot', { pitch: 0.4 }); V3.game.shake(8); V3.bus.emit('snagwake', c); V3.bus.emit('met', 'snag'); } return; }
    if (adx > 1000 && c.spar) { c.spar = false; c.calm = true; c.calmT = 9; c.knots = 3; c.knotOpen = 0; for (const v of c.vines) v.state = 'rest'; return; } // walked off mid-rematch: back to calm
    if (adx > 1000) { c.awake = false; c.knots = Math.max(0, c.knots); for (const v of c.vines) v.state = 'rest'; V3.bus.emit('snagsleep'); return; }
    c.cool -= dt;
    const busy = c.vines.filter((v) => v.state !== 'rest').length, maxBusy = c.knots >= 1 ? 2 : 1;
    if (c.cool <= 0 && busy < maxBusy && c.limp <= 0 && !c.possessed) {
      const v = c.vines.find((v) => v.state === 'rest'); if (v) {
        // aims where you are standing; a sproutstalk nearby makes a tempting decoy
        let tx = U.clamp(p.x, c.x - 470, c.x + 470); const decoy = V3.plants.list.find((q) => q.kind === 'stalk' && Math.abs(q.x - c.x) < 470);
        if (decoy && (hidden || U.chance(0.6))) { tx = decoy.x; v.decoy = decoy; } else { v.decoy = null; if (hidden) tx = c.x + U.rand(-400, 400); }
        v.state = 'rear'; v.t = 0; v.aimX = tx; v.sweep = c.knots >= 2 && U.chance(0.4); c.cool = c.knots >= 2 ? 1.5 : c.knots === 1 ? 1.9 : 2.5; A().sfx('vine', { pitch: 0.7 });
      }
    }
    for (const v of c.vines) {
      v.t += dt; v.wig += dt;
      if (v.state === 'rest') { v.tx = U.damp(v.tx, c.x + (v.i - 1) * 150 + Math.sin(v.wig) * 20, 3, dt); v.ty = U.damp(v.ty, c.y - 170 + Math.cos(v.wig * 1.3) * 20, 3, dt); }
      else if (v.state === 'rear') { // the tell: the vine lifts and its shadow marks the spot
        const tell = c.knots >= 2 ? 0.7 : 0.95;
        v.tx = U.damp(v.tx, v.aimX + (v.sweep ? Math.sign(c.x - v.aimX) * -40 : 0), 6, dt); v.ty = U.damp(v.ty, W.groundY(v.aimX) - (v.sweep ? 60 : 280), 6, dt);
        if (v.t > tell) { v.state = 'lash'; v.t = 0; v.x0 = v.tx; v.y0 = v.ty; A().sfx('dash', { pitch: 0.7 }); }
      } else if (v.state === 'lash') {
        const k = Math.min(1, v.t / 0.13), gx = v.aimX, gy = W.groundY(v.aimX);
        if (v.sweep) { v.tx = v.x0 + (c.x - v.x0) * k * 0.8; v.ty = gy - 30; } else { v.tx = U.lerp(v.x0, gx, k); v.ty = U.lerp(v.y0, gy, k * k); }
        if (!p.host && U.dist(v.tx, v.ty - 20, p.x, p.y - p.h / 2) < 62) { const r = p.hurt(c.spar ? 0 : 1, v.tx - Math.sign(dx), 'snag'); if (r === 'parry') { vineHurt(c, v); continue; } }
        if (k >= 1) { v.state = 'stuck'; v.t = 0; v.stuckFor = v.sweep ? 1.2 : 2.3; v.tangled = false; if (!v.sweep) { A().sfx('thud'); V3.game.shake(6); P.burst(v.tx, v.ty, 10, { col: '#c9a878', speed: 200, flat: 0.3, vy: -60, life: 0.5, r: 8 }); if (v.decoy) { if (V3.plants.list.includes(v.decoy)) { V3.plants.remove(v.decoy); V3.bus.emit('found', 'decoy'); } v.decoy = null; } } }
      } else if (v.state === 'stuck') { // wedged in the dirt: this is your opening
        c.canHost = true; c.rideX = v.tx; c.rideY = v.ty - 30;
        if (v.t > v.stuckFor) { v.state = 'recoil'; v.t = 0; v.tangled = false; }
      } else if (v.state === 'recoil') { v.tx = U.damp(v.tx, c.x + (v.i - 1) * 150, 5, dt); v.ty = U.damp(v.ty, c.y - 200, 5, dt); if (v.t > 0.7) v.state = 'rest'; }
    }
    if (!c.vines.some((v) => v.state === 'stuck')) c.canHost = false;
    // no camping at the trunk
    if (adx < 120 && Math.abs(p.y - c.y) < 200 && c.knotOpen <= 0 && !hidden && c.limp <= 0 && (c.shove = (c.shove || 0) + dt) > 0.6) { c.shove = 0; p.hurt(c.spar ? 0 : 1, c.x, 'snag'); P.emit({ kind: 'ring', x: c.x, y: c.y - 20, R: 150, r: 7, col: '#c9a878', life: 0.3, squash: 0.3 }); A().sfx('thud'); }
    if (c.possessed) { c.x0 = c.x; }
  };
  // ghost inside a stuck vine: act = slap the old tree with his own arm
  const driveSnag = (c, act) => {
    const v = c.vines.find((v) => v.state === 'stuck'); if (!v) { PT().unpossess(); return; }
    v.t = Math.min(v.t, v.stuckFor - 0.5); v.ty = W.groundY(v.tx) - 60 - Math.abs(Math.sin(S.time * 6)) * 30;
    if (act) { P.say(c.x, c.y - 300, 'SLAP!', '#fff3c0', 34); A().sfx('punch'); c.possessed = false; PT().host = null; PT().x = v.tx; PT().y = v.ty - 40; v.state = 'recoil'; v.t = 0; c.knotOpen = 1; knotBurst(c); V3.bus.emit('found', 'selfslap'); }
  };
  const baseDrive = C.drive;
  C.drive = (c, dt, ax, ay, jump, act) => { if (c.kind === 'snag') { driveSnag(c, act); return; } baseDrive(c, dt, ax, ay, jump, act); };

  // ---------- drawings ----------
  const eye = HS.eye;
  const stars = (g, c) => { for (let i = 0; i < 3; i++) { const a = S.time * 5 + i * 2.1; g.fillStyle = '#ffe08a'; g.save(); g.translate(c.x + Math.cos(a) * 22, c.y - c.h - 14 + Math.sin(a) * 6); g.rotate(a); g.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? 2.4 : 6; g.lineTo(Math.cos(j * TAU / 8) * rr, Math.sin(j * TAU / 8) * rr); } g.fill(); g.restore(); } };
  const draw = {
    slime(g, c) {
      const sq = c.state === 'squash' ? 0.72 + Math.sin(c.t * 30) * 0.03 : c.grounded ? 1 + Math.sin(c.anim * 3) * 0.04 : 1.18, w = 24 / Math.sqrt(sq), h = 34 * sq;
      g.beginPath(); g.moveTo(-w, 0); g.bezierCurveTo(-w * 1.15, -h * 0.9, -w * 0.5, -h, 0, -h); g.bezierCurveTo(w * 0.5, -h, w * 1.15, -h * 0.9, w, 0); g.quadraticCurveTo(0, 5, -w, 0); g.closePath();
      g.fillStyle = P.lin(g, 0, -h, 0, 4, [[0, 'rgba(190,245,160,.95)'], [0.6, 'rgba(110,205,110,.92)'], [1, 'rgba(60,150,90,.95)']]); g.fill(); g.strokeStyle = '#1f5a36'; g.lineWidth = 2.8; g.stroke();
      P.ell(g, -w * 0.4, -h * 0.72, w * 0.26, h * 0.12, 'rgba(255,255,255,.7)', -0.4);
      eye(g, -8 + c.f * 3, -h * 0.45, 5.6, c.dazed > 0 ? 0 : 1); eye(g, 8 + c.f * 3, -h * 0.45, 5.6, c.dazed > 0 ? 0 : 1);
      HS.mouth(g, c.f * 3, -h * 0.26, 3.6, c.spooked > 0 ? 2 : 1);
    },
    warthog(g, c) {
      const run = c.state === 'charge' || Math.abs(c.vx) > 60, st = Math.sin(c.anim * (run ? 22 : 6)), tell = c.state === 'tell';
      g.scale(c.f, 1); if (tell) g.translate(Math.sin(c.t * 50) * 1.5 - 4, 0);
      for (const lx of [-22, -10, 12, 24]) { const l = (lx % 4 ? st : -st) * (run ? 7 : 2); g.fillStyle = '#5c4034'; P.rr(g, lx - 5 + l, -14, 10, 15, 4); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke(); }
      g.strokeStyle = INK; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-36, -34); g.bezierCurveTo(-50, -44, -50, -26, -43, -30); g.stroke();
      P.ball(g, -4, -32, 36, 25, '#c9a68c', '#9b7660', '#5f4335'); g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.ellipse(-4, -32, 36, 25, 0, 0, TAU); g.stroke();
      for (let i = 0; i < 6; i++) { g.fillStyle = '#4a2e22'; g.beginPath(); g.moveTo(-22 + i * 8, -54); g.lineTo(-17 + i * 8, -66 - (i % 2) * 4); g.lineTo(-13 + i * 8, -54); g.fill(); }
      // head
      P.ball(g, 27, -30, 21, 19, '#d0ad94', '#a27d66', '#6a4b3b'); g.strokeStyle = INK; g.beginPath(); g.ellipse(27, -30, 21, 19, 0, 0, TAU); g.stroke();
      g.fillStyle = '#7a5646'; g.beginPath(); g.moveTo(14, -46); g.lineTo(11, -60); g.lineTo(24, -50); g.fill(); g.stroke();
      P.ell(g, 44, -24, 9.5, 8, '#e9a9a0'); g.beginPath(); g.ellipse(44, -24, 9.5, 8, 0, 0, TAU); g.stroke(); P.ell(g, 41, -24, 1.8, 2.6, '#7a3a36'); P.ell(g, 47, -24, 1.8, 2.6, '#7a3a36');
      g.fillStyle = '#fff6e0'; g.beginPath(); g.moveTo(34, -17); g.quadraticCurveTo(44, -12, 43, -28 + 2); g.quadraticCurveTo(39, -17, 31, -20); g.closePath(); g.fill(); g.lineWidth = 2.2; g.stroke();
      eye(g, 28, -36, 5.4, c.dazed > 0 ? 0 : 1, c.state === 'charge' || tell ? '#ff5a3a' : null);
      g.strokeStyle = INK; g.lineWidth = 2.6; g.beginPath(); g.moveTo(21, -44); g.lineTo(34, -40); g.stroke();
    },
    bat(g, c) {
      if (c.hang) { g.scale(1, -1); g.translate(0, c.h); }
      const flap = c.hang ? 0.2 : Math.sin(c.anim * 18) * 0.7, fold = c.state === 'tell' ? 0.3 : 1;
      for (const s of [-1, 1]) { g.save(); g.translate(s * 10, -20); g.scale(s * fold, 1); g.rotate(-flap * 0.6); g.beginPath(); g.moveTo(0, -4); g.quadraticCurveTo(22, -24, 40, -8); g.quadraticCurveTo(33, -2, 30, 6); g.quadraticCurveTo(24, 0, 19, 8); g.quadraticCurveTo(13, 2, 0, 8); g.closePath(); g.fillStyle = P.lin(g, 0, -20, 30, 8, [[0, '#9a7ac0'], [1, '#5a3f84']]); g.fill(); g.strokeStyle = '#2e1f4a'; g.lineWidth = 2.4; g.stroke(); g.restore(); }
      P.ball(g, 0, -18, 15, 15, '#b79ad8', '#8463b0', '#4f3678'); g.strokeStyle = '#2e1f4a'; g.lineWidth = 2.6; g.beginPath(); g.arc(0, -18, 15, 0, TAU); g.stroke();
      for (const s of [-1, 1]) { g.fillStyle = '#8463b0'; g.beginPath(); g.moveTo(s * 5, -30); g.lineTo(s * 11, -42); g.lineTo(s * 14, -27); g.fill(); g.stroke(); }
      const sleeping = c.hang && !(S.night > 0.5); eye(g, -6, -19, 4.6, c.dazed > 0 || sleeping ? 0 : 1, c.state === 'tell' || c.state === 'swoop' ? '#ff7ad0' : null); eye(g, 6, -19, 4.6, c.dazed > 0 || sleeping ? 0 : 1, c.state === 'tell' || c.state === 'swoop' ? '#ff7ad0' : null);
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-3, -11); g.lineTo(-1.5, -7); g.lineTo(0, -11); g.lineTo(1.5, -7); g.lineTo(3, -11); g.fill();
    },
    eater(g, c) {
      const open = c.state === 'chew' ? 1 : c.state === 'tell' ? c.t / 0.3 : 0, sh = c.state === 'tell' ? Math.sin(c.t * 80) * 2 : 0, ghostSees = PT().id === 'ghost';
      g.translate(sh, 0);
      const top = () => { g.beginPath(); g.moveTo(-34, -14); g.bezierCurveTo(-36, -40, -14, -46, 2, -45); g.bezierCurveTo(22, -44, 36, -36, 34, -14); g.closePath(); };
      // lower jaw
      g.beginPath(); g.moveTo(-34, -12); g.quadraticCurveTo(-36, 4, -20, 4); g.lineTo(22, 4); g.quadraticCurveTo(36, 4, 34, -12); g.closePath(); g.fillStyle = P.lin(g, 0, -14, 0, 6, [[0, '#9b948c'], [1, '#6c655f']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      if (open > 0.05) { g.fillStyle = '#7a1f2a'; g.beginPath(); g.ellipse(0, -13, 30, 5 + open * 9, 0, 0, TAU); g.fill(); g.fillStyle = '#fff6e0'; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 8 - 4, -11); g.lineTo(i * 8, -11 - open * 9); g.lineTo(i * 8 + 4, -11); g.fill(); } }
      g.save(); g.translate(0, -open * 16); g.rotate(-open * 0.12);
      top(); g.fillStyle = P.lin(g, -20, -46, 20, -12, [[0, '#d8d2c8'], [0.6, '#9b948c'], [1, '#6c655f']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
      P.ell(g, -12, -36, 9, 3.5, 'rgba(255,255,255,.4)', -0.3);
      if (open > 0.05) { g.fillStyle = '#fff6e0'; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 8 - 4, -15); g.lineTo(i * 8, -15 + open * 9); g.lineTo(i * 8 + 4, -15); g.fill(); } }
      // the tell: every few seconds it blinks. The Ghost's spirit sight sees the eyes all the time.
      const blink = ((c.anim % 4.2) > 3.95) || open > 0.05 || ghostSees || c.dazed > 0;
      if (blink) { eye(g, -10, -30, 4.6, c.dazed > 0 ? 0 : 1, open > 0.05 ? '#ff5a3a' : null); eye(g, 10, -30, 4.6, c.dazed > 0 ? 0 : 1, open > 0.05 ? '#ff5a3a' : null); }
      g.restore();
      if (ghostSees && !open) { g.globalCompositeOperation = 'lighter'; P.glow(g, 0, -24, 60, '#9fb8ff', 0.22); g.globalCompositeOperation = 'source-over'; }
    },
    snail(g, c) {
      g.scale(c.f, 1); const hide = c.hide > 0 ? 1 : 0, sh = c.golden ? '#ffd24a' : c.shell || '#e2a25a';
      if (!hide) { g.beginPath(); g.moveTo(-20, 0); g.quadraticCurveTo(-4, -8, 14, -6); g.quadraticCurveTo(24, -22, 22, -4); g.quadraticCurveTo(22, 2, 14, 2); g.lineTo(-20, 2); g.closePath(); g.fillStyle = '#f6e3b8'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
        for (const ex of [16, 23]) { g.beginPath(); g.moveTo(ex, -12); g.lineTo(ex + 2 + Math.sin(c.anim * 2 + ex) * 1.5, -24); g.stroke(); P.ell(g, ex + 2 + Math.sin(c.anim * 2 + ex) * 1.5, -25, 3, 3, '#1c0e09'); P.ell(g, ex + 1.3, -26, 1, 1, '#fff'); } }
      P.ball(g, -4, -15, 16, 15, U.mixHex(sh, '#ffffff', 0.4), sh, U.mixHex(sh, '#3b1f12', 0.45)); g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.arc(-4, -15, 15.5, 0, TAU); g.stroke();
      g.beginPath(); for (let a = 0; a < 9; a += 0.3) { const rr = 12 - a * 1.25; g.lineTo(-4 + Math.cos(a) * rr, -15 + Math.sin(a) * rr); } g.lineWidth = 1.8; g.stroke();
      if (c.golden) { g.globalCompositeOperation = 'lighter'; P.glow(g, -4, -15, 34, '#ffe27a', 0.35 + 0.15 * Math.sin(c.anim * 3)); g.globalCompositeOperation = 'source-over'; }
    },
    frog(g, c) {
      g.scale(c.f, 1); const air = !c.grounded, cr = c.croak > 0 ? Math.sin(c.croak * Math.PI * 2) : 0;
      if (air) { g.fillStyle = '#4f9a3c'; P.rr(g, -22, -6, 16, 7, 3); g.fill(); }
      if (cr > 0) { P.ell(g, 8, -6, 9 * cr, 8 * cr, '#e8f5c0'); }
      P.ball(g, 0, -11, 17, 12, '#b5e06a', '#6fb04a', '#3c7a34'); g.strokeStyle = '#1e4d2e'; g.lineWidth = 2.4; g.beginPath(); g.ellipse(0, -11, 17, 12, 0, 0, TAU); g.stroke();
      for (const ex of [-2, 10]) { P.ell(g, ex, -22, 6.5, 6.5, '#8fcf5a'); g.beginPath(); g.arc(ex, -22, 6.5, 0, TAU); g.stroke(); eye(g, ex, -22, 4.2, 1); }
      g.strokeStyle = '#1e4d2e'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-4, -8); g.quadraticCurveTo(6, -3, 15, -9); g.stroke();
    },
  };
  const drawSnag = (g, c) => {
    const k = knotPos(c), sway = c.roar > 0 ? Math.sin(c.roar * 50) * 6 : S.sway(c.x) * 3;
    P.ell(g, c.x, c.y + 4, 150, 16, 'rgba(30,20,10,.3)');
    // trunk
    g.save(); g.translate(c.x + sway, c.y);
    const trunk = () => { g.beginPath(); g.moveTo(-104, 12); g.bezierCurveTo(-56, -30, -62, -160, -50, -300); g.bezierCurveTo(-90, -360, -50, -420, 0, -400); g.bezierCurveTo(60, -430, 96, -360, 52, -300); g.bezierCurveTo(62, -160, 60, -30, 110, 12); g.closePath(); };
    trunk(); g.fillStyle = P.lin(g, -70, 0, 80, 0, [[0, '#b98458'], [0.5, '#8a5a38'], [1, '#52301e']]); g.fill();
    g.save(); g.clip(); for (let i = 0; i < 26; i++) { const y = -U.hash(i * 2.3) * 390, x = (U.hash(i * 5.1) - 0.5) * 100; g.strokeStyle = 'rgba(50,28,16,.4)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y + 22, x - 3, y + 44); g.stroke(); } g.restore();
    trunk(); g.strokeStyle = c.flash > 0 ? '#fff' : INK; g.lineWidth = 4; g.stroke();
    // face: grumpy until calmed
    const ey = -250, calm = c.calm;
    if (!c.awake && !calm) { for (const s of [-1, 1]) P.ink(g, [[s * 24 - 12, ey], [s * 24, ey + 6], [s * 24 + 12, ey]], 4, '#2a140c'); P.say; }
    else { for (const s of [-1, 1]) { eye(g, s * 24, ey, 13, 1, calm ? null : '#ffb13a'); if (!calm) { g.strokeStyle = '#2a140c'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(s * 42, ey - 22); g.lineTo(s * 10, ey - 10); g.stroke(); } } }
    if (calm) HS.mouth(g, 0, ey + 22, 12, 1); else { g.strokeStyle = '#2a140c'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-22, ey + 44); g.quadraticCurveTo(0, ey + 30 - c.roar * 14, 22, ey + 44); g.stroke(); if (c.roar > 0) P.ell(g, 0, ey + 44, 18, 12 * c.roar, '#3a1410'); }
    // sap knots: three, one glows when it is open
    for (let i = 0; i < 3; i++) { const done = i < c.knots, kx = 6 + (i - 1) * 4, ky = -150 + (i - 1) * 0; if (i !== Math.min(c.knots, 2) && !done) continue; }
    const kx = k[0] - c.x, ky = k[1] - c.y;
    if (calm) { for (let i = 0; i < 6; i++) P.ell(g, kx + Math.cos(i * 1.05) * 20, ky + Math.sin(i * 1.05) * 20, 15, 10, '#ffb3c6', i * 1.05); P.ell(g, kx, ky, 12, 12, '#ffd166'); }
    else {
      const open = c.knotOpen > 0;
      if (open) { g.globalCompositeOperation = 'lighter'; P.glow(g, kx, ky, 110, '#ffb13a', 0.5 + 0.3 * Math.sin(S.time * 14)); g.globalCompositeOperation = 'source-over'; }
      P.ell(g, kx, ky, 34, 40, '#3d2416'); P.ell(g, kx, ky, open ? 26 : 9, open ? 32 : 30, open ? '#ffc24a' : '#24130b'); if (open) P.ell(g, kx - 8, ky - 10, 8, 10, '#fff3c0');
      g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.ellipse(kx, ky, 34, 40, 0, 0, TAU); g.stroke();
    }
    g.restore();
    // crown
    const hue = calm ? 'pink' : 'green';
    for (const o of [[-150, -400, 0.95], [150, -410, 0.95], [-70, -470, 1.15], [80, -480, 1.2], [0, -420, 1.3]]) { const sw = S.sway(c.x + o[0]); P.put(g, V3.scenery.pom(hue, (o[0] & 3) % 3), c.x + o[0] + sw * 10 + sway, c.y + o[1], sw * 0.05, o[2], o[2]); }
    // vines reach out in front of everything, so their tells are never hidden by the crown
    for (const v of c.vines) {
      if (v.state === 'rear') { // the marked spot
        const gy = W.groundY(v.aimX), t = Math.min(1, v.t / 0.9); g.fillStyle = 'rgba(220,50,40,' + (0.12 + t * 0.2 + Math.sin(S.time * 18) * 0.05) + ')'; g.beginPath(); g.ellipse(v.aimX, gy + 2, 62 - t * 14, 12, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(200,40,40,' + (0.45 + t * 0.5) + ')'; g.lineWidth = 3.5; g.setLineDash([9, 7]); g.stroke(); g.setLineDash([]);
        g.font = '700 ' + (44 + t * 12) + 'px Gaegu, cursive'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(46,26,16,.8)'; g.strokeText('!', v.aimX, gy - 150 + t * 30); g.fillStyle = '#ff6a4a'; g.fillText('!', v.aimX, gy - 150 + t * 30);
      }
      const hx = c.x + (v.i - 1) * 34, hy = c.y - 300 + v.i * 26, mx = (hx + v.tx) / 2 + Math.sin(v.wig * 2) * 30, my = Math.min(hy, v.ty) - 90 + (v.state === 'stuck' ? 60 : 0);
      for (let s = 0; s < 2; s++) { g.strokeStyle = s ? (c.calm ? '#7cc04a' : '#5f8a3a') : '#1e3d24'; g.lineWidth = s ? 13 : 19; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(mx, my, v.tx, v.ty - 14); g.stroke(); }
      // the tip: a leafy fist (or a flower once he is calm)
      g.save(); g.translate(v.tx, v.ty - 16); if (v.state === 'stuck') g.rotate(Math.sin(v.t * 22) * 0.18);
      if (c.calm) { for (let i = 0; i < 6; i++) P.ell(g, Math.cos(i * 1.05) * 13, Math.sin(i * 1.05) * 13, 10, 7, '#ffb3c6', i * 1.05); P.ell(g, 0, 0, 8, 8, '#ffd166'); }
      else { P.ball(g, 0, 0, 22, 19, '#a6d86a', '#5f9a3c', '#2c5c30'); g.strokeStyle = '#1e3d24'; g.lineWidth = 2.8; g.beginPath(); g.ellipse(0, 0, 22, 19, 0, 0, TAU); g.stroke(); for (const a of [-0.8, 0, 0.8]) { g.fillStyle = '#5a2f3c'; g.beginPath(); g.moveTo(Math.sin(a) * 16 - 5, 12); g.lineTo(Math.sin(a) * 20, 28); g.lineTo(Math.sin(a) * 16 + 5, 12); g.fill(); } if (v.tangled) { g.strokeStyle = '#b5e06a'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.stroke(); } if (v.state === 'stuck' && PT().id === 'ghost') { g.globalCompositeOperation = 'lighter'; P.glow(g, 0, 0, 60, '#bcd0ff', 0.5); g.globalCompositeOperation = 'source-over'; } }
      g.restore();
    }
    // boss bar: three knots drawn over his head while the fight is on
    if (c.awake && !calm) { for (let i = 0; i < 3; i++) { const x = c.x - 44 + i * 44, y = c.y - 590; P.ell(g, x, y, 15, 17, '#3d2416'); P.ell(g, x, y, 10, 12, i < c.knots ? '#ffb3c6' : '#ffc24a'); g.strokeStyle = INK; g.lineWidth = 2.6; g.beginPath(); g.ellipse(x, y, 15, 17, 0, 0, TAU); g.stroke(); } }
  };
  C.draw = (g, v) => {
    for (const c of C.list) {
      if (c.dead || c.x < v.x0 - 500 || c.x > v.x1 + 500) continue;
      if (c.kind === 'snag') { drawSnag(g, c); continue; }
      if (!c.fly) HS.shadow(g, c.x, c.y, c.w * 0.5, 0.22);
      g.save(); g.translate(c.x, c.y);
      if (c.flash > 0) g.filter = 'brightness(2.2)';
      if (c.dazed > 0 && !c.fly) g.rotate(Math.sin(S.time * 9) * 0.07);
      draw[c.kind](g, c); g.restore(); g.filter = 'none';
      if (c.dazed > 0) stars(g, c);
      if (c.snared > 0) { g.strokeStyle = '#27533a'; g.lineWidth = 7; g.lineCap = 'round'; for (let s = 0; s < 2; s++) { if (s) { g.strokeStyle = '#7cc04a'; g.lineWidth = 4; } g.beginPath(); g.moveTo(c.x - c.w * 0.5, c.y); g.quadraticCurveTo(c.x, c.y - c.h * 1.3, c.x + c.w * 0.5, c.y); g.moveTo(c.x - c.w * 0.3, c.y); g.quadraticCurveTo(c.x + 6, c.y - c.h * 0.9, c.x + c.w * 0.3, c.y); g.stroke(); } }
      if (c.possessed) { g.globalCompositeOperation = 'lighter'; P.glow(g, c.x, c.y - c.h / 2, c.w * 1.2, '#bcd0ff', 0.45); g.globalCompositeOperation = 'source-over'; HS.eye(g, c.x - 7, c.y - c.h - 14, 5, 1); HS.eye(g, c.x + 7, c.y - c.h - 14, 5, 1); }
    }
  };
  C.drawOne = (g, kind, o) => { const c = Object.assign({ kind, x: 0, y: 0, w: DEF[kind].w, h: DEF[kind].h, f: 1, state: 'idle', t: 0, anim: 1, dazed: 0, grounded: true }, o || {}); draw[kind](g, c); };
  C.lights = (out) => { for (const c of C.list) { if (c.dead) continue; if (c.golden) out.push({ x: c.x, y: c.y - 16, r: 90, a: 0.6 }); if (c.kind === 'snag' && c.knotOpen > 0) out.push({ x: c.x, y: c.y - 150, r: 260, a: 0.9 }); if (c.possessed) out.push({ x: c.x, y: c.y - 20, r: 260, a: 0.9 }); } };
})();
