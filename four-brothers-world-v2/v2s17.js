// 4 Brothers World V2 — part 17: three hero moves.
//  1. Acorn roll: while running on the ground, press S (down) and he tucks into a ball and rolls. Rolling builds up speed,
//     much faster than running, and faster still going downhill. Bowling into monsters hurts them. Jump to hop out of it,
//     press S again or let go of left/right to stop. It uses a little stamina.
//  2. Ghost slip: walk into a thin wall (one or two blocks thick) and keep pushing, and the ghost fades and slips through
//     to the other side. Not through locked doors, unbreakable blocks or anywhere he's not allowed to be.
//  3. Wind: outdoors, the wind blows in gusts that change direction now and then (you see the streaks). It shoves the
//     fuzzy around, a lot in the air (more when he's puffed up) and a little on the ground. His runes help him hold
//     steady. Underground, underwater and on a vine or cloud there's no wind.
(function (RW) {
  'use strict';
  const P = RW.player, E = RW.ent, U = RW.ui, TS = RW.TILE;
  if (!P || !E) return;
  const I = () => RW.input;
  const blocked = () => !!(U && U.blocking && U.blocking());
  const act = (a) => !blocked() && I().act(a), hit = (a) => !blocked() && I().actHit(a);
  const tip = (flag, text) => { if (P.flags && !P.flags[flag]) { P.flags[flag] = 1; U && U.toast && U.toast(text); } };
  const runSpd = () => { const SS = P.sst(); return SS.spd * (P.spdMul ? P.spdMul() : 1); };

  // ====================== 1. ACORN ROLL ======================
  const R = (P.roll = { on: false, v: 0, dir: 1, ang: 0, lastY: 0, histY: 0, histT: 0, hitT: new Map() });
  function stopRoll() { if (R.on) { R.on = false; R.v = 0; } }
  function rollTick(dt) {
    if (P.species !== 'acorn' || P.dead || P.water || P.climbing || (P.vine && P.vine.state === 'on')) { stopRoll(); return; }
    const L = act('left'), Rt = act('right'), want = (Rt ? 1 : 0) - (L ? 1 : 0);
    if (!R.on) {
      if (P.ground && hit('down') && want && Math.abs(P.vx) >= runSpd() * 0.6 && P.stamina > 5) {
        R.on = true; R.dir = want; R.v = Math.max(Math.abs(P.vx), runSpd()); R.lastY = R.histY = P.y; R.histT = 0;
        RW.audio.sfx('swing'); tip('tipRoll', 'Rolling! It builds up speed, faster downhill, and bowls over monsters. Jump to hop out, S or letting go stops you.');
      }
      return;
    }
    if (hit('down') || P.stamina <= 0) { stopRoll(); return; }
    if (want && want !== R.dir) { R.v = Math.max(0, R.v - 900 * dt); if (R.v < 20) R.dir = want; }
    const top = runSpd() * 2.1;
    // downhill means he's lower now than a moment ago (steps and slopes count, not just smooth ground)
    if ((R.histT -= dt) <= 0) { R.down = P.y > R.histY + 2; R.histY = P.y; R.histT = 0.25; }
    const uphill = P.ground && P.y < R.lastY - 0.5;
    if (P.ground || P.vy > 0) {
      if (want === R.dir) R.v = Math.min(top * (R.down ? 1.3 : 1), R.v + (R.down ? 520 : 170) * dt);
      else if (P.ground) R.v = Math.max(0, R.v - 260 * dt);
    }
    if (uphill) R.v = Math.max(0, R.v - 140);
    R.lastY = P.y;
    if (R.v < 25 && P.ground) { stopRoll(); return; }
    P.tire && P.tire(3 * dt, true);
    R.ang += (R.v * R.dir * dt) / 9;
    // bowling into monsters
    const t = performance.now() / 1000;
    if (R.v > runSpd() * 1.1) E.enemies.forEach((e) => {
      if (e.dead || e.dummy || e.friendly || (R.hitT.get(e) || 0) > t) return;
      const hb = e.hitbox ? e.hitbox() : e;
      if (P.x < hb.x + hb.w && P.x + P.w > hb.x && P.y < hb.y + hb.h && P.y + P.h > hb.y) {
        R.hitT.set(e, t + 0.5); E.damage(e, Math.round((5 + R.v * 0.06) * P.dmgMul()), R.dir, 6, false, '#c88a4a');
        R.v *= 0.75; RW.fx.shake(2, 0.12); RW.audio.sfx('slam');
      }
    });
    if (Math.random() < dt * 20 && P.ground) RW.fx.spawn({ x: P.x + P.w / 2 - R.dir * 6, y: P.y + P.h - 1, vx: -R.dir * RW.rand(10, 40), vy: -RW.rand(10, 30), life: 0.4, color: RW.pick(['#a89880', '#8a7a68']), size: 2, kind: 'smoke' });
  }

  // ====================== 3. WIND ======================
  // one wind for the whole world: a slow drift that swings from side to side, with gusts on top
  const WD = { t: Math.random() * 100, dir: 1, flipT: 25, s: 0 };
  function windTick(dt) {
    WD.t += dt; WD.flipT -= dt;
    if (WD.flipT <= 0) { WD.flipT = 20 + Math.random() * 25; WD.dir = -WD.dir; }
    const gust = Math.max(0, Math.sin(WD.t * 0.45) * 0.6 + Math.sin(WD.t * 1.3 + 1) * 0.4);
    WD.s = 0.25 + 0.75 * gust; // 0.25 .. 1
  }
  const outdoors = (o) => {
    const W = RW.world; if (!W.skyTop || !W.def || W.def.id === 'rock' || W.def.id === 'duat') return false;
    const tx = Math.floor((o.x + o.w / 2) / TS), ty = Math.floor(o.y / TS);
    return ty < W.skyTop[tx] && !P.water;
  };
  const STREAKS = [];
  RW.v2wind = { now: () => WD.dir * WD.s, outdoors: () => outdoors(P), state: WD };
  const windPush = () => {
    if (P.species !== 'fuzzy' || P.dead || P.water || P.climbing || (P.vine && P.vine.state === 'on') || (P.cloud && P.cloud.on) || !outdoors(P)) return 0;
    const t = RW.v2runes ? RW.v2runes.tier() : 0, hold = 1 - Math.min(0.5, t * 0.07);  // runes help him hold steady
    const puffed = P.puff ? P.puff.size : 0;
    return WD.dir * WD.s * (P.ground ? 15 : 50 + 40 * puffed) * hold;
  };

  // ====================== 2. GHOST SLIP ======================
  const G = (P.slip = { push: 0, cd: 0, fade: 0 });
  const boxFree = (x, y, w, h) => {
    const W = RW.world;
    for (let ty = Math.floor(y / TS); ty <= Math.floor((y + h - 0.01) / TS); ty++) for (let tx = Math.floor(x / TS); tx <= Math.floor((x + w - 0.01) / TS); tx++) if (W.solid(tx, ty)) return false;
    return true;
  };
  function slipTick(dt) {
    G.cd = Math.max(0, G.cd - dt); G.fade = Math.max(0, G.fade - dt);
    if (P.species !== 'ghost' || P.dead || G.cd > 0) { G.push = 0; return; }
    const want = (act('right') ? 1 : 0) - (act('left') ? 1 : 0);
    if (!want) { G.push = 0; return; }
    const W = RW.world, edge = want > 0 ? P.x + P.w + 1 : P.x - 1, tx = Math.floor(edge / TS);
    const ty0 = Math.floor((P.y + 2) / TS), ty1 = Math.floor((P.y + P.h - 2) / TS);
    let wall = false;
    for (let ty = ty0; ty <= ty1; ty++) if (W.solid(tx, ty)) wall = true;
    if (!wall) { G.push = 0; return; }
    // what's in the way must be breakable, not a locked door, and not somewhere off-limits
    for (let k = 0; k < 3; k++) for (let ty = ty0; ty <= ty1; ty++) {
      const t = RW.TILES[W.get(tx + want * k, ty)];
      if (t && t.solid && ((t.hard != null && t.hard >= 99) || t.locked || t.lockedMsg)) { G.push = 0; return; }
    }
    G.push += dt;
    if (G.push > 0.08 && Math.random() < dt * 30) RW.fx.spawn({ x: edge, y: P.y + RW.rand(4, P.h - 4), vx: -want * 20, vy: RW.rand(-10, 10), life: 0.3, color: '#c8d4ff', add: true, kind: 'glow' });
    if (G.push < 0.35) return;
    // find where his body fits on the far side: at most two blocks of wall
    for (let k = 1; k <= 2; k++) {
      const nx = want > 0 ? (tx + k) * TS + 0.5 : (tx - k + 1) * TS - P.w - 0.5;
      if (!boxFree(nx, P.y, P.w, P.h)) continue;
      const ntx = Math.floor((nx + P.w / 2) / TS), nty = Math.floor((P.y + P.h / 2) / TS);
      if (E.restrictedAt && E.restrictedAt(ntx, nty)) { G.push = 0; G.cd = 1; return; }
      if (P.tire && !P.tire(6)) { G.push = 0; return; }
      const c0 = P.center();
      P.x = nx; P.vx = want * 40; P.invulnT = Math.max(P.invulnT || 0, 0.3);
      const c1 = P.center();
      for (let j = 0; j < 14; j++) RW.fx.spawn({ x: c0.x + (c1.x - c0.x) * j / 14, y: c0.y + RW.rand(-8, 8), life: 0.45, color: RW.pick(['#c8d4ff', '#ffffff', '#9b9cff']), add: true, kind: 'glow' });
      RW.audio.sfx('rift'); G.cd = 0.9; G.fade = 0.4; G.push = 0;
      tip('tipSlip', 'Ghosts slip through thin walls: push into a wall one or two blocks thick and you pass through.');
      return;
    }
    G.push = 0.2; // too thick: keep trying gently, nothing happens
  }

  // ====================== every frame ======================
  const baseUpd = P.update;
  P.update = function (dt) {
    windTick(dt);
    const r = baseUpd.apply(this, arguments);
    try { rollTick(dt); slipTick(dt); } catch (e) { console.warn('hero moves', e); }
    // wind streaks you can see, for everyone outdoors
    if (outdoors(P) && WD.s > 0.45 && Math.random() < dt * 22 * WD.s && STREAKS.length < 30) {
      const v = RW.view || { w: 480, h: 270 }, cam = RW.cam;
      STREAKS.push({ x: cam.x + Math.random() * v.w, y: cam.y + Math.random() * v.h * 0.8, vx: WD.dir * RW.rand(180, 280) * WD.s, len: RW.rand(10, 22), life: 0.7, max: 0.7, wob: Math.random() * 6 });
    }
    for (let i = STREAKS.length - 1; i >= 0; i--) { const k = STREAKS[i]; k.x += k.vx * dt; k.life -= dt; if (k.life <= 0) STREAKS.splice(i, 1); }
    return r;
  };
  const baseMove = E.move;
  E.move = function (o, dt) {
    if (o !== P) return baseMove.apply(this, arguments);
    if (R.on) {
      o.vx = R.dir * R.v;
      const res = baseMove.apply(this, arguments);
      if ((R.dir > 0 && res.wallR) || (R.dir < 0 && res.wallL)) { if (R.v > runSpd() * 1.4) { RW.fx.shake(2, 0.1); RW.audio.sfx('slam'); } stopRoll(); }
      return res;
    }
    const wv = windPush();
    if (!wv) return baseMove.apply(this, arguments);
    o.vx += wv;
    const res = baseMove.apply(this, arguments);
    o.vx -= wv;
    return res;
  };
  // a jump hops out of a roll, keeping the speed
  const baseUpd2 = P.update;
  P.update = function (dt) {
    if (R.on && (hit('jump') || hit('up'))) { const v = R.v * R.dir; stopRoll(); const r = baseUpd2.apply(this, arguments); P.vx = v * 0.8; return r; }
    return baseUpd2.apply(this, arguments);
  };

  // a new world (or a fresh hero) never starts mid-roll
  const baseInit = RW.world.init;
  RW.world.init = function () { stopRoll(); G.push = 0; G.fade = 0; return baseInit.apply(this, arguments); };

  // ====================== drawing ======================
  const baseDraw = E.drawPlayer; let off = null;
  E.drawPlayer = function (g, cam, p, look, opts) {
    if (p !== P || !opts) return baseDraw.apply(this, arguments);
    if (STREAKS.length) {   // wind streaks: thin white lines blowing past
      g.save(); g.strokeStyle = '#ffffff'; g.lineWidth = 1;
      STREAKS.forEach((k) => { const a = Math.min(1, k.life / k.max * 2) * Math.min(1, (k.max - k.life) * 6); g.globalAlpha = 0.6 * a; const x = Math.round(k.x - cam.x), y = Math.round(k.y - cam.y) + 0.5, d = Math.sign(k.vx) || 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x - d * k.len, y + Math.sin(k.wob + k.life * 8)); g.stroke(); });
      g.restore();
    }
    if (R.on && opts.species === 'acorn') {
      // tucked into a ball: the acorn spins around his middle
      const cx = Math.round(P.x + P.w / 2 - cam.x), cy = Math.round(P.y + P.h - 9 - cam.y);
      g.save(); g.translate(cx, cy); g.rotate(R.ang); g.translate(-cx, -cy);
      const q = Object.assign({}, p, { anim: 0, y: P.y + 4 });
      let out; try { out = baseDraw.call(this, g, cam, q, look, Object.assign({}, opts, { item: null, swing: 0, scale: (opts.scale || 1) * 0.8 })); } finally { g.restore(); }
      return out;
    }
    // the ghost fades as he presses into a wall, and fades back in after slipping through
    const fade = opts.species === 'ghost' ? (G.fade > 0 ? 0.25 + 0.75 * (1 - G.fade / 0.4) : G.push > 0.08 ? Math.max(0.25, 1 - G.push * 2) : 1) : 1;
    if (fade < 0.999) {
      const cv = g.canvas;
      if (!off || off.width !== cv.width || off.height !== cv.height) { off = document.createElement('canvas'); off.width = cv.width; off.height = cv.height; }
      const og = off.getContext('2d'); og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, off.width, off.height); og.imageSmoothingEnabled = false;
      og.setTransform(g.getTransform());
      const out = baseDraw.call(this, og, cam, p, look, opts);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = fade; g.drawImage(off, 0, 0); g.restore();
      return out;
    }
    return baseDraw.apply(this, arguments);
  };
})(window.RW);
