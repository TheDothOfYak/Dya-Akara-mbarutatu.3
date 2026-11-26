// 4 Brothers World V2 — part 7: the Warthog King can't be cheesed from the cliff any more.
// 1. The cliff on the west side of King's Clearing is cut into a gentle slope, and the slope counts as part of the
//    arena, so there's no ledge to stand on where he can't charge.
// 2. If you're above him and out of reach (a ledge, a tree, a tower you built), he leaps up at you and lands with a
//    stomp, the same shockwave as his normal stomp.
(function (RW) {
  'use strict';
  const E = RW.ent, P = RW.player, TS = RW.TILE;
  const def = RW.WORLDS && RW.WORLDS.acorn;
  if (!E || !P || !def || !def.boss || !def.boss.arena) return;

  // ---------- 1. the slope ----------
  const RAMP = 18; // blocks of slope west of the arena floor
  const A = def.boss.arena, GY = def.boss.at.y, X0 = A.x0;
  A.x0 = X0 - RAMP - 10; // the slope (and the rim above it) is arena too: his charge runs up it instead of stopping at the bottom
  const baseGen = def.generate;
  def.generate = function () {
    const gen = baseGen.apply(this, arguments);
    try { ramp(gen); } catch (e) { console.warn('king slope', e); }
    return gen;
  };
  function ramp(gen) {
    const T = RW.T, W = gen.W, fg = gen.fg, bg = gen.bg;
    const get = (x, y) => fg[y * W + x], set = (x, y, t) => { fg[y * W + x] = t; };
    const ground = new Set(['dirt', 'grass', 'jgrass', 'mud', 'stone', 'mossstone', 'soil', 'sand', 'gravel']);
    const soft = new Set(['air', 'leaves', 'oakleaves', 'trunk', 'vines', 'tallgrass', 'flower', 'berrybush']);
    const isGround = (t) => ground.has(RW.TILES[t].key);
    // the height of the land just past the top of the slope
    const top = (x) => { for (let y = GY - 40; y < GY + 6; y++) if (isGround(get(x, y))) return y; return GY; };
    const L = Math.min(top(X0 - RAMP - 1), top(X0 - RAMP - 2));
    if (L >= GY - 1) return; // already level here
    // the King's Clearing waystone stood on the cliff edge; it moves back onto the flat ground above the slope
    const M = gen.meta || {}, ws = (M.waystones || []).find((w) => w.x >= X0 - RAMP - 1 && w.x < X0);
    if (ws) {
      set(ws.x, ws.y, T.air);
      const nx = X0 - RAMP - 12, ny = top(nx) - 1;
      for (let y = ny - 3; y <= ny; y++) for (let x = nx - 1; x <= nx + 1; x++) if (!RW.TILES[get(x, y)].solid || soft.has(RW.TILES[get(x, y)].key)) set(x, y, T.air);
      set(nx, ny, T.waystone); M.wayMoved = { from: ws.x + '_' + ws.y, to: nx + '_' + ny }; ws.x = nx; ws.y = ny;
    }
    for (let x = X0 - RAMP; x < X0; x++) {
      const k = (X0 - x) / (RAMP + 1); const h = Math.round(GY + (L - GY) * k);
      for (let y = Math.max(0, L - 30); y < h; y++) { const key = RW.TILES[get(x, y)].key; if (ground.has(key) || soft.has(key)) { set(x, y, T.air); if (bg) bg[y * W + x] = 0; } }
      set(x, h, T.jgrass);
      for (let y = h + 1; y <= GY + 3; y++) if (!RW.TILES[get(x, y)].solid) set(x, y, T.dirt);
      if (gen.meta && gen.meta.surf) gen.meta.surf[x] = h;
    }
  }

  // if you had woken that waystone where it used to stand, it stays woken
  let wayT = 0;
  const baseUpd = E.updateEnemies;
  E.updateEnemies = function (dt) {
    if ((wayT -= dt) <= 0) {
      wayT = 1; const W = RW.world, mv = W && W.def && W.def.id === 'acorn' && W.meta && W.meta.wayMoved;
      if (mv && P.flags && P.flags['way_acorn_' + mv.from] && !P.flags['way_acorn_' + mv.to]) P.flags['way_acorn_' + mv.to] = 1;
    }
    return baseUpd.apply(this, arguments);
  };

  // ---------- 2. the leap ----------
  const baseAI = E.bossAI && E.bossAI.hogking;
  if (baseAI) {
    E.bossAI.hogking = function (b, dt, sp) {
      b.leapCd = Math.max(0, (b.leapCd || 0) - dt);
      const pc = P.center(), feet = b.y + b.h, pFeet = P.y + P.h, dx = pc.x - (b.x + b.w / 2);
      const above = feet - pFeet; // how far above his feet yours are
      const ready = b.ground && b.leapCd <= 0 && (b.state === 'idle' || (b.state === 'stun' && b.st < 0.2) || b.state === 'wind');
      if (ready && above > TS * 2.5 && above < TS * 16 && Math.abs(dx) < TS * 22 && !P.dead) {
        const h = above + TS * 1.5, vy = Math.sqrt(2 * 900 * h), t = (vy + Math.sqrt(Math.max(0, vy * vy - 2 * 900 * (above - TS)))) / 900;
        b.state = 'stomp'; b.did = true; b.st = 0.45; b.leapCd = 3.2;
        b.vy = -vy; b.vx = RW.clamp(dx / Math.max(0.4, t), -340, 340); b.face = Math.sign(dx) || b.face;
        RW.audio.sfx('roar'); RW.fx.shake(4, 0.3);
        RW.fx.debris(b.x + b.w / 2, feet, ['#5a4034', '#7d5a40'], 18);
      }
      // he climbs one-block steps while charging (so the slope, or a step you dug, doesn't stop him dead)
      if (b.state === 'charge' && b.ground && b.dir) {
        const W = RW.world, tx = Math.floor((b.dir > 0 ? b.x + b.w + 1 : b.x - 1) / TS), foot = Math.floor((b.y + b.h - 1) / TS), rows = Math.ceil(b.h / TS);
        if (W.solid(tx, foot)) {
          // room for his whole body one block higher: the column he steps into, and the row above his head
          let clear = true;
          for (let ty = foot - rows; ty < foot && clear; ty++) if (W.solid(tx, ty)) clear = false;
          for (let x = Math.floor(b.x / TS); x <= Math.floor((b.x + b.w - 1) / TS) && clear; x++) if (W.solid(x, foot - rows)) clear = false;
          if (clear) b.y = foot * TS - b.h - 0.01;
        }
      }
      return baseAI.call(this, b, dt, sp);
    };
  }
})(window.RW);
