// 4 Brothers World V2 — part 10: the acorn's vine.
// Press C (rebindable: "Acorn: shoot a vine") to throw a vine toward the mouse. It sticks to any solid block or
// tree it reaches (up to 15 blocks away) and you swing from it: left/right pump the swing, W reels you in, S lets
// out more vine, Space lets go with a hop (and your double jump comes back), C lets go too.
(function (RW) {
  'use strict';
  const P = RW.player, E = RW.ent, U = RW.ui, TS = RW.TILE;
  if (!P || !E || !RW.ACTIONS) return;

  // ---- the key ----
  if (!RW.ACTIONS.some((a) => a[0] === 'vine')) {
    const at = RW.ACTIONS.findIndex((a) => a[0] === 'ability');
    RW.ACTIONS.splice(at + 1, 0, ['vine', 'Acorn: shoot a vine to grapple and swing', ['KeyC']]);
    if (!RW.binds.vine) RW.binds.vine = ['KeyC'];
  }

  const RANGE = 15 * TS, SPEED = 1100, MIN_L = 20, REEL = 170, PUMP = 380;
  const V = (P.vine = { state: 'off', ax: 0, ay: 0, tx: 0, ty: 0, dx: 0, dy: 0, went: 0, L: 0, vx: 0, vy: 0, cd: 0, ground: false });
  const blocked = () => !!(U && U.blocking && U.blocking());
  const I = () => RW.input;
  const hand = () => ({ x: P.x + P.w / 2 + (P.face || 1) * 4, y: P.y + 10 });
  const grips = (tx, ty) => { const W = RW.world, t = RW.TILES[W.get(tx, ty)]; return !!t && t.key !== 'water' && (t.solid || t.tree || t.key === 'vines' || t.key === 'trunk' || t.key === 'paletrunk'); };
  const stillThere = () => grips(Math.floor(V.ax / TS), Math.floor(V.ay / TS));

  function shoot() {
    const m = RW.mouseWorld(), h = hand(); let dx = m.x - h.x, dy = m.y - h.y; const d = Math.hypot(dx, dy) || 1;
    V.dx = dx / d; V.dy = dy / d; V.tx = h.x; V.ty = h.y; V.went = 0; V.state = 'fly'; V.cd = 0.25;
    RW.audio.sfx('swing');
    if (!P.flags.tipVine) { P.flags.tipVine = 1; U && U.toast && U.toast('Vine: it sticks to blocks and trees. Left/right to swing, W to climb up it, S to let out vine, Space to let go.'); }
  }
  function hook(x, y) {
    V.state = 'on'; V.ax = x; V.ay = y; const c = P.center(); V.L = Math.max(MIN_L, Math.hypot(c.x - x, c.y - y));
    V.vx = P.vx; V.vy = P.vy; RW.audio.sfx('break'); RW.fx.burst(x, y, ['#5a8a3a', '#7ab84a', '#3a5a2a'], 8, 50, { kind: 'smoke', size: 2, life: 0.35 });
  }
  function letGo(hop) {
    if (V.state === 'on') {
      P.vx = V.vx * 1.05; P.vy = hop ? Math.min(V.vy, 0) - 190 : V.vy;
      if (hop) { const SS = P.sst(); P.airJumps = SS.doubleJump ? 1 : 0; }
    }
    V.state = 'off';
  }

  // ---- every frame: shoot, fly, let go ----
  const baseUpdate = P.update;
  P.update = function (dt) {
    V.cd = Math.max(0, V.cd - dt);
    if (P.species !== 'acorn' || P.dead) { V.state = 'off'; return baseUpdate.apply(this, arguments); }
    const i = I(), free = !blocked();
    if (free && i.actHit('vine') && V.cd <= 0) { if (V.state === 'off') { if (P.tire(4)) shoot(); } else { letGo(false); V.cd = 0.15; } }
    if (V.state === 'fly') {
      const step = Math.min(SPEED * dt, RANGE - V.went);
      for (let s = 0; s < step; s += 4) {
        V.tx += V.dx * 4; V.ty += V.dy * 4; V.went += 4;
        if (grips(Math.floor(V.tx / TS), Math.floor(V.ty / TS))) { hook(V.tx, V.ty); break; }
      }
      if (V.state === 'fly' && V.went >= RANGE) V.state = 'back';
    } else if (V.state === 'back') {
      const h = hand(), dx = h.x - V.tx, dy = h.y - V.ty, d = Math.hypot(dx, dy);
      if (d < 20) V.state = 'off'; else { V.tx += dx / d * SPEED * 1.5 * dt; V.ty += dy / d * SPEED * 1.5 * dt; }
    } else if (V.state === 'on') {
      if (P.water || !stillThere()) letGo(false);
      else if (free && i.actHit('jump')) {
        // let go with a hop; the same press must not also spend the double jump
        letGo(true); const aj = P.airJumps; const out = baseUpdate.apply(this, arguments); P.airJumps = aj; return out;
      }
    }
    if (V.state === 'on') {
      // the base step would spend the double jump and stamina on W; keep them for after the swing
      const aj = P.airJumps, st = P.stamina; const out = baseUpdate.apply(this, arguments);
      P.airJumps = aj; if (P.stamina < st) P.stamina = st;
      return out;
    }
    return baseUpdate.apply(this, arguments);
  };

  // ---- the swing itself: a pendulum on the vine, instead of the normal walking and falling ----
  const baseMove = E.move;
  E.move = function (o, dt, opts) {
    if (o !== P || V.state !== 'on') return baseMove.apply(this, arguments);
    const i = I(), free = !blocked();
    const left = free && i.act('left'), right = free && i.act('right'), up = free && i.act('up'), down = free && i.act('down');
    const SS = P.sst(), dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (up) V.L = Math.max(MIN_L, V.L - REEL * dt);
    if (down) V.L = Math.min(RANGE, V.L + REEL * dt);
    const c = P.center(); let nx = c.x - V.ax, ny = c.y - V.ay; const dist = Math.hypot(nx, ny) || 1; nx /= dist; ny /= dist;
    if (V.ground) { V.vx = RW.lerp(V.vx, dir * SS.spd, Math.min(1, dt * 10)); if (V.vy > 0) V.vy = 0; }
    else {
      V.vy += 900 * dt;
      if (dir) { let tx = ny, ty = -nx; if (tx * dir < 0) { tx = -tx; ty = -ty; } V.vx += tx * PUMP * dt; V.vy += ty * PUMP * dt; } // pump the swing the way you hold
    }
    // keep to the vine's length: no moving outward, and a pull back in when stretched (reeling in)
    const vr = V.vx * nx + V.vy * ny;
    if (dist >= V.L - 0.5 && vr > 0) { V.vx -= nx * vr; V.vy -= ny * vr; }
    if (dist > V.L) { const k = Math.min(dist - V.L, 40) * 9; V.vx -= nx * k; V.vy -= ny * k; }
    const sp = Math.hypot(V.vx, V.vy); if (sp > 560) { V.vx *= 560 / sp; V.vy *= 560 / sp; }
    o.vx = V.vx; o.vy = V.vy;
    const climbing = P.climbing; P.climbing = true; // the hero-movement step stands aside while swinging
    let r; try { r = baseMove.apply(this, arguments); } finally { P.climbing = climbing; }
    V.vx = o.vx; V.vy = o.vy; V.ground = !!(r && r.ground);
    if (dir) P.face = dir;
    return r;
  };

  // ---- drawing the vine ----
  const baseDraw = E.drawPlayer;
  E.drawPlayer = function (g, cam, p) {
    if (p === P && V.state !== 'off') {
      const h = hand(), ex = V.state === 'on' ? V.ax : V.tx, ey = V.state === 'on' ? V.ay : V.ty;
      const dx = ex - h.x, dy = ey - h.y, d = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(d / 2));
      const t0 = (RW.game && RW.game.time) || 0;
      for (let k = 0; k <= n; k++) {
        const f = k / n, x = h.x + dx * f, y = h.y + dy * f;
        const w = Math.sin(k * 0.9 + t0 * 3) > 0 ? 1 : 0;
        g.fillStyle = k % 3 ? '#4a7a32' : '#2e5222'; g.fillRect(Math.round(x - cam.x) - 1, Math.round(y - cam.y) - 1, 3, 3); if (w) { g.fillStyle = '#6a9a44'; g.fillRect(Math.round(x - cam.x), Math.round(y - cam.y) - 1, 1, 1); }
        if (k % 6 === 3) { g.fillStyle = '#7ab84a'; g.fillRect(Math.round(x - cam.x) + 1, Math.round(y - cam.y) - 2, 2, 1); }
      }
      g.fillStyle = '#2a4a1e'; g.fillRect(Math.round(ex - cam.x) - 2, Math.round(ey - cam.y) - 2, 4, 4); // the tip, curled round what it holds
    }
    return baseDraw.apply(this, arguments);
  };

  const H = RW.HEROES && RW.HEROES.acorn;
  if (H) H.blurb = (H.blurb || '').replace(/\s*$/, '') + ' Press C to shoot a vine that grabs blocks and trees, and swing from it.';
})(window.RW);
