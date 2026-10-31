// 4 Brothers World V2 — part 9: the fuzzy's puff jumps, and trees drawn the way they look while they fall.
// 1. Fuzzy: a normal jump, then in the air he sucks in air and jumps again, higher, up to two more times
//    (each puff jump is higher than the one before). They come back when he lands or swims. While he's puffed up
//    he swells, and holding jump while falling still lets him float down.
// 2. Trees: standing trunks and leaves use the same full-square, blotchy look as a tree that's falling.
(function (RW) {
  'use strict';
  const P = RW.player, E = RW.ent, A = RW.art, U = RW.ui, TS = RW.TILE;
  if (!P || !E || !A) return;

  // ====================== FUZZY PUFF JUMPS ======================
  const PUFFS = [-390, -430];          // the two air jumps (the ground jump is -360)
  const F = (P.puff = { left: 2, t: 0, size: 0 });
  const blocked = () => !!(U && U.blocking && U.blocking());
  const hitJump = () => { const i = RW.input; return !blocked() && (i.actHit('jump') || i.actHit('up')); };
  const holdJump = () => { const i = RW.input; return !blocked() && (i.act('jump') || i.act('up')); };
  const inhale = () => {
    const c = P.center();
    for (let k = 0; k < 14; k++) { const a = Math.random() * 6.28, r = RW.rand(16, 30); RW.fx.spawn({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 4, vy: -Math.sin(a) * r * 4, life: 0.22, color: '#fff6e0', add: true, kind: 'glow' }); }
    RW.fx.ring(c.x, P.y + P.h, '#f0e8d8', 18, 0.25, 2);
  };
  const baseUpdate = P.update;
  P.update = function (dt) {
    if (P.species === 'fuzzy' && !P.dead) {
      if (P.ground || P.water || P.climbing) F.left = PUFFS.length;
      else if (hitJump() && F.left > 0 && !P.wasWater && P.tire(5)) {
        P.vy = PUFFS[PUFFS.length - F.left]; F.left--; F.t = 0.35;
        inhale(); RW.audio.sfx('swing');
        if (!P.flags.tipPuff) { P.flags.tipPuff = 1; U && U.toast && U.toast('Puff jump: press jump in the air to suck in air and jump higher. Twice!'); }
      }
      // how puffed up he looks: a quick swell on each puff jump, and fully round while floating down
      const floating = !P.ground && !P.water && holdJump() && P.vy > 0 && P.vy <= 60;
      F.t = Math.max(0, F.t - dt);
      const want = F.t > 0 ? 1 : floating ? 0.8 : 0;
      F.size += (want - F.size) * Math.min(1, dt * (want > F.size ? 18 : 6));
    } else F.size = 0;
    return baseUpdate.apply(this, arguments);
  };
  const baseDraw = E.drawPlayer;
  E.drawPlayer = function (g, cam, p, look, opts) {
    if (p === P && opts && opts.species === 'fuzzy' && F.size > 0.02) {
      opts = Object.assign({}, opts, { scale: (opts.scale || 1) * (1 + 0.28 * F.size) });
      return baseDraw.call(this, g, cam, p, look, opts);
    }
    return baseDraw.apply(this, arguments);
  };
  const H = RW.HEROES && RW.HEROES.fuzzy;
  if (H) H.blurb = 'Fuzzies start in Tuftwood on Fuzzy World with a little wood sword and two spells. After a jump they can suck in air and jump twice more, higher each time. They bounce when they land, puff up to float down, and swim in strokes, but need air.';

  // ====================== TREES ======================
  // the same drawing the falling tree uses, so a tree looks the same standing, shaken and falling
  const LEAF_C = { leaves: '#3f8a32', oakleaves: '#3a7a30', albalileaves: '#c8b06a' };
  const leafSquare = (g, col, sx, sy, x, y) => {
    const h = RW.hash2(x, y, 7);
    g.fillStyle = col; g.fillRect(sx, sy, TS, TS);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(sx + ((h * 11) | 0) % 10, sy + ((h * 97) | 0) % 10, 5, 4);
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(sx + ((h * 53) | 0) % 11, sy + ((h * 31) | 0) % 11, 4, 3);
  };
  const trunkColumn = (g, col, sx, sy) => {
    g.fillStyle = col; g.fillRect(sx + 2, sy, 12, TS);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(sx + 11, sy, 3, TS);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(sx + 3, sy, 2, TS);
  };
  const baseDecor = A.drawDecor;
  A.drawDecor = function (g, t, sx, sy, time, stage, x, y) {
    if (t && LEAF_C[t.decor]) { leafSquare(g, LEAF_C[t.decor], sx, sy, x, y); return; }
    if (t && t.decor === 'trunk' && t.tree) {
      const w = RW.world, side = [RW.TILES[w.get(x - 1, y)], RW.TILES[w.get(x + 1, y)]].find((q) => q && LEAF_C[q.decor]);
      if (side && !t.pale) leafSquare(g, LEAF_C[side.decor], sx, sy, x, y); // inside the canopy, leaves fill in round the trunk
      trunkColumn(g, t.pale ? '#b8b0a0' : '#6a4a30', sx, sy);
      return;
    }
    return baseDecor.apply(this, arguments);
  };
})(window.RW);
