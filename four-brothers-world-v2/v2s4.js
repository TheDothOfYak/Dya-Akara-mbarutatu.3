// V2 stage 4: every hero moves its own way, and swimming works in strokes instead of "hold jump to rise".
//  * Rock: heavy. Slow to start, skids to a stop, barely steers in the air. A run-up charge smashes through dirt and sand and rams
//    monsters. Landing from a height thuds. He can't swim: he sinks, walks the bottom, hops, and crawls up walls underwater.
//  * Ghost: light. Falls slowly and drifts on his own momentum (hover still works).
//  * Fuzzy: bounces when he lands (tap jump just as you land for a big one, hold S to stick it) and sucks in air to float down.
//  * Acorn: clings to walls and climbs them, kicks off them (which refreshes his double jump), and glides on a leaf.
//  * Water: every jump press is a stroke in the direction you hold. Fuzzies drift up to the surface, acorns float, ghosts hang neutral.
// Nothing here changes the save format. It wraps the player's update and the physics step only for the player.
(function (RW) {
  const E = RW.ent, U = RW.ui, P = RW.player, TS = RW.TILE;
  const now = () => performance.now() / 1000;
  const W = () => RW.world;
  const approach = (v, to, d) => (v < to ? Math.min(to, v + d) : Math.max(to, v - d));
  const S = (P.mv = { t: 0, in: false, tgt: 0, mm: 1, vx0: 0, vy0: 0, k: null, air: 0, strokeCd: 0, jbuf: 0, kickT: 0, kickVx: 0, said: {} });
  const say = (id, title, text) => { if (S.said[id]) return; S.said[id] = 1; U.toast(title + ': ' + text); };

  // ---- hero data (the blurbs and the "can't fall-damage" flags live in RW.HEROES) ----
  const H = RW.HEROES;
  if (H.rock) { H.rock.noFall = true; H.rock.blurb = 'Rocks start in their cave on Rock World with bare fists. They are heavy: slow to start, hard to stop, and a run-up smashes through dirt. They cannot swim. They sink, but never drown.'; }
  if (H.ghost) { H.ghost.jump = -250; H.ghost.blurb = 'Ghosts start in the Pale Keep on the Ghost World. They float and drift, never drown, take no fall damage, and other ghosts leave them alone until provoked.'; }
  if (H.fuzzy) { H.fuzzy.noFall = true; H.fuzzy.blurb = 'Fuzzies start in Tuftwood on Fuzzy World with a little wood sword and two spells. They bounce when they land, puff up with air to float down, and swim in strokes, but need air.'; }
  if (H.acorn) H.acorn.blurb = 'Acorns start in Capstead on Acorn World with a spear and a slingshot. They jump twice, cling to and climb walls, glide on a leaf, and float like wood.';

  // ---- how heavy or light each hero is on land ----
  // g: gravity multiplier, fall: fastest fall. up/brake/turn: seconds to reach top speed / to stop / to turn round on the ground.
  // aup/abrake: the same in the air. creep: the first little step you take from standing.
  const MOVE = {
    rock: { g: 1.35, fall: 640, up: 1.15, brake: 0.7, turn: 0.32, aup: 3.2, abrake: 5, creep: 16 },
    ghost: { g: 0.6, fall: 230, up: 0.5, brake: 0.6, turn: 0.4, aup: 0.85, abrake: 2.6, creep: 20 },
  };
  // swimmers: buoy: how hard the water pushes you up (0 = hangs where you stop). drag: how fast you slow down. stroke: a jump press.
  const WATER = {
    fuzzy: { buoy: 95, drag: 2.2, stroke: 110, dive: 280 },
    acorn: { buoy: 150, drag: 2.6, stroke: 85, dive: 230 },
    ghost: { buoy: 0, drag: 1.3, stroke: 100, dive: 200 },
  };
  const KNOCK = { rock: 0.5, ghost: 1.35 }; // how much a hit shoves you
  const RAM_V = 118; // fast enough to smash through blocks and monsters

  // ---- reading the keys once per frame ----
  function keys() {
    const i = RW.input, typing = !!(U.blocking && U.blocking());
    const f = (a) => !typing && i.act(a), h = (a) => !typing && i.actHit(a);
    const up = f('up');
    return { typing, t: (f('right') ? 1 : 0) - (f('left') ? 1 : 0), up, down: f('down'), jump: f('jump') || up, jumpSpace: h('jump'), jumpHit: h('jump') || h('up') };
  }
  // what the base game decided this frame's walking speed was (it asks moveMul every frame)
  const baseMM = P.moveMul;
  P.moveMul = function (t) { const m = baseMM ? baseMM.apply(this, arguments) : 1; S.tgt = t || 0; S.mm = m; return m; };
  const topSpd = () => { const SS = P.sst(); return SS.spd * P.spdMul() * (P.water ? SS.swim : 1) * S.mm; };
  const wallAt = (o, dir) => {
    const tx = Math.floor((dir > 0 ? o.x + o.w + 1.5 : o.x - 1.5) / TS), y1 = Math.floor((o.y + 8) / TS), y2 = Math.floor((o.y + o.h - 8) / TS);
    for (let ty = y1; ty <= y2; ty++) if (W().solid(tx, ty)) return true;
    return false;
  };
  const dust = (x, y, n, vx) => { for (let i = 0; i < n; i++) RW.fx.spawn({ x: x + RW.rand(-6, 6), y, vx: (vx || 0) + RW.rand(-30, 30), vy: -RW.rand(10, 40), life: 0.45, color: RW.pick(['#a89880', '#8a7a68', '#c8b898']), size: 2, kind: 'smoke' }); };

  // ====================== ON LAND ======================
  function gravity(o, dt, M) { if (M.g !== 1) o.vy += (M.g - 1) * 900 * dt; o.vy = Math.min(o.vy, M.fall); }
  // heavy or drifting walking: speed builds and fades over time instead of snapping
  function runX(o, dt, M) {
    const SS = P.sst(), ref = SS.spd * P.spdMul(), want = S.tgt * topSpd(), ground = P.ground;
    let vx = S.vx0; const mag = Math.max(Math.abs(vx), ref);
    if (S.tgt) {
      if (vx * S.tgt < -8) { vx = approach(vx, 0, mag / (ground ? M.turn : M.aup) * dt); if (ground && Math.abs(S.vx0) > 50 && Math.random() < 0.5) dust(o.x + o.w / 2, o.y + o.h - 1, 1, -S.tgt * 40); }
      else if (Math.abs(vx) < Math.abs(want)) { vx = approach(vx, want, Math.abs(want) / (ground ? M.up : M.aup) * dt); if (ground && Math.abs(vx) < M.creep) vx = S.tgt * Math.min(M.creep, Math.abs(want)); }
      else vx = approach(vx, want, mag / (ground ? M.brake : M.abrake) * dt);
    } else vx = approach(vx, 0, mag / (ground ? M.brake : M.abrake) * dt);
    o.vx = Math.abs(vx) < 2 ? 0 : vx;
  }

  function fuzzyAir(o, dt, k) { // hold jump while falling: suck in air and float down slowly
    if (P.ground || P.water || !k.jump || o.vy <= 30) { S.infl = Math.max(0, (S.infl || 0) - dt * 3); return; }
    if (!P.tire(9 * dt, true)) return;
    S.infl = Math.min(1, (S.infl || 0) + dt * 2.5);
    o.vy = Math.max(26, o.vy - 1800 * dt);
    if (Math.random() < dt * 24) { const c = P.center(), a = Math.random() * 6.28, r = RW.rand(14, 26); RW.fx.spawn({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 3, vy: -Math.sin(a) * r * 3, life: 0.28, color: '#fff6e0', add: true, kind: 'glow' }); }
    say('inflate', 'Puffed up', 'You sucked in air and float down slowly. It costs stamina.');
  }

  function acornAir(o, dt, k, SS) { // cling, climb and kick off walls; glide on a leaf
    let clinging = false; const d = k.t;
    if (S.kickT > 0) { S.kickT -= dt; o.vx = S.kickVx; }
    else if (d && wallAt(o, d) && (!P.ground || k.up) && !P.exhausted && P.stamina > 0) {
      clinging = true; P.airJumps = SS.doubleJump ? 1 : 0;
      if (k.jumpSpace) {
        if (P.tire(6)) { o.vy = -330; S.kickVx = -d * 175; S.kickT = 0.2; o.vx = S.kickVx; P.face = -d; clinging = false; dust(o.x + (d > 0 ? o.w : 0), o.y + o.h * 0.6, 4, -d * 40); RW.audio.sfx('swing'); say('kick', 'Wall kick', 'Space against a wall kicks you off it, and you can jump again in the air.'); }
      } else if (k.up) { o.vy = -62; P.tire(9 * dt, true); say('climb', 'Climbing', 'Hold toward a wall and W to climb it. S lets go. It costs stamina.'); }
      else { if (o.vy > 38) o.vy = 38; if (k.down) o.vy = 90; P.tire(2 * dt, true); }
    }
    if (!clinging && !P.ground && k.jump && o.vy > 50 && S.air > 0.2 && S.kickT <= 0 && P.tire(6 * dt, true)) {
      o.vy = Math.max(48, o.vy - 1500 * dt);
      if (k.t) o.vx = approach(o.vx, k.t * topSpd() * 1.35, 500 * dt);
      if (Math.random() < dt * 10) RW.fx.spawn({ x: o.x + o.w / 2 + RW.rand(-8, 8), y: o.y + 2, vx: RW.rand(-20, 20), vy: RW.rand(-10, 20), life: 0.7, color: RW.pick(['#7fbf4a', '#a8d85a', '#5f9a3a']), size: 2, kind: 'smoke' });
      say('glide', 'Gliding', 'Hold jump while you fall and you glide on a leaf. It costs stamina.');
    }
  }

  // ====================== IN WATER ======================
  function swim(o, dt, k, M) {
    const top = topSpd(), headWet = W().isWaterAt(o.x + o.w / 2, o.y + 4);
    let vx = S.vx0, vy = S.vy0;
    if (P.ground) vx = approach(vx, k.t * top, top / 0.15 * dt); // walking along the bottom is just walking
    else vx = k.t * top + (vx - k.t * top) * Math.exp(-M.drag * dt);
    const a = (headWet ? -M.buoy : 140) + (k.down ? M.dive : 0) + (P.species === 'ghost' ? Math.sin(S.t * 1.3) * 18 : 0);
    vy = (vy + a * dt) * Math.exp(-M.drag * dt);
    if ((k.jumpHit && S.strokeCd <= 0) || (k.jump && S.strokeCd <= -0.15)) { // a stroke: tap to swim in the direction you hold
      let dx = k.t * 0.85, dy = k.down ? 0.8 : -1; if (k.t) dy = k.down ? 0.5 : -0.5;
      const L = Math.hypot(dx, dy), mag = M.stroke * (P.tire(2) ? 1 : 0.5);
      vx += dx / L * mag; vy += dy / L * mag; S.strokeCd = 0.4;
      if (!headWet && dy < 0) vy = Math.min(vy, -310); // a stroke at the surface leaps you out
      const c = P.center(); RW.fx.spawn({ x: c.x + RW.rand(-5, 5), y: c.y, vy: -25, life: 0.8, color: '#e8faff', kind: 'bubble', add: true });
      say('stroke', 'Swimming', 'Tap jump to stroke through the water in the direction you hold, then glide. S dives. A stroke at the surface leaps you out.');
    }
    o.vx = RW.clamp(vx, -240, 240); o.vy = RW.clamp(vy, -260, 260);
  }
  function sink(o, dt, k) { // the rock can't swim: he sinks, walks the bottom, hops, and crawls up walls
    const top = topSpd(); let vx = S.vx0, vy = S.vy0;
    vx = approach(vx, k.t * top, top / 0.45 * dt);
    vy = Math.min(vy + 760 * dt, 170);
    if (P.ground && k.jumpHit) vy = -190;
    if (k.jump && k.t && wallAt(o, k.t)) { vy = -58; vx = k.t * 10; say('crawl', 'Crawling', 'Rocks can\'t swim, but you can crawl up a wall underwater: hold toward it and jump. Or punch your way out.'); }
    o.vx = vx; o.vy = vy;
  }

  // ====================== the physics step, for the player only ======================
  const baseMove = E.move;
  E.move = function (o, dt, opts) {
    if (o !== P || !S.in || P.climbing) return baseMove.apply(this, arguments);
    const k = S.k, sp = P.species, SS = P.sst(), M = MOVE[sp];
    if (P.water) { if (sp === 'rock') sink(o, dt, k); else if (WATER[sp]) swim(o, dt, k, WATER[sp]); }
    else {
      if (M) { gravity(o, dt, M); runX(o, dt, M); }
      if (sp === 'fuzzy') fuzzyAir(o, dt, k);
      else if (sp === 'acorn') acornAir(o, dt, k, SS);
    }
    const impact = o.vy, vxPre = o.vx;
    const res = baseMove.apply(this, arguments);
    land(o, dt, k, res, impact, vxPre, sp);
    return res;
  };

  // rock: smash through soft blocks at a run
  const smashable = (id) => { const t = RW.TILES[id]; return !!t && t.solid && (t.hard == null ? 0 : t.hard) <= 1 && !t.element && !t.tree && !t.crop && !t.loot && !t.storage && !t.toggle && !t.lockedMsg; };
  function ram(o, dir, vxPre) {
    const w = W(), tx = Math.floor((dir > 0 ? o.x + o.w + 1 : o.x - 1) / TS), y1 = Math.floor((o.y + 2) / TS), y2 = Math.floor((o.y + o.h - 1) / TS);
    let blocked = false, n = 0;
    for (let ty = y1; ty <= y2; ty++) if (w.solid(tx, ty)) { if (smashable(w.get(tx, ty))) n++; else blocked = true; }
    if (blocked || !n || !P.tire(8)) { RW.fx.shake(2, 0.12); RW.audio.sfx('slam'); return; }
    for (let ty = y1; ty <= y2; ty++) for (let c = 0; c < 2; c++) { const x = tx + dir * c; if (w.solid(x, ty) && smashable(w.get(x, ty))) P.breakTile(x, ty); }
    o.vx = vxPre * 0.7; RW.fx.shake(4, 0.2); RW.audio.sfx('slam'); dust(o.x + (dir > 0 ? o.w : 0), o.y + o.h * 0.6, 8, dir * 80);
    say('charge', 'Charge', 'A run-up smashes through dirt and sand and rams monsters. Hold sprint to build speed.');
  }
  function land(o, dt, k, res, impact, vxPre, sp) {
    if (res.ground) S.air = 0; else S.air += dt;
    if (sp === 'rock') {
      if ((res.wallL || res.wallR) && P.sprinting && Math.abs(vxPre) >= RAM_V) ram(o, res.wallR ? 1 : -1, vxPre);
      if (res.ground && impact > 300 && !P.water) { // a heavy landing: a thud that knocks monsters about
        const s = RW.clamp((impact - 280) / 240, 0, 1.5), c = P.center(); RW.fx.shake(2 + 3 * s, 0.25); RW.audio.sfx('slam'); dust(c.x, o.y + o.h, 6 + Math.round(6 * s), 0);
        RW.fx.ring(c.x, o.y + o.h, '#c8b898', 26 + 22 * s, 0.3, 2);
        E.enemies.forEach((e) => { if (e.dead || e.dummy || e.friendly) return; const ce = E.center(e); if (Math.abs(ce.x - c.x) < 30 + 34 * s && Math.abs(ce.y - c.y) < 34) E.damage(e, Math.round((6 + 14 * s) * P.dmgMul()), Math.sign(ce.x - c.x) || 1, 5, false, '#c8b898'); });
      }
    } else if (sp === 'fuzzy' && res.ground && impact > 240 && !k.down && !P.water) { // bounce
      const big = S.jbuf > 0; o.vy = -Math.min(impact * (big ? 0.85 : 0.42), big ? 400 : 300); res.ground = false;
      dust(o.x + o.w / 2, o.y + o.h, 5, 0); RW.audio.sfx('swing'); if (big) say('bounce', 'Big bounce', 'Tap jump just as you land for a big bounce. Hold S to stick the landing.');
    }
  }

  // ====================== every frame ======================
  const baseUpdate = P.update;
  P.update = function (dt) {
    if (P.dead) return baseUpdate.apply(this, arguments);
    S.t += dt; S.k = keys(); S.vx0 = P.vx; S.vy0 = P.vy; S.in = true; S.strokeCd -= dt;
    S.jbuf = S.k.jumpHit ? 0.14 : Math.max(0, S.jbuf - dt);
    try { return baseUpdate.apply(this, arguments); }
    finally {
      S.in = false;
      if (P.species === 'rock' && P.sprinting && Math.abs(P.vx) >= RAM_V && !P.dead) { // ram monsters at a run
        const t = now();
        E.enemies.forEach((e) => {
          if (e.dead || e.dummy || e.friendly || (e.ramT || 0) > t || !E.overlap(P, e.hitbox ? e.hitbox() : e)) return;
          e.ramT = t + 0.6; E.damage(e, Math.round((8 + Math.abs(P.vx) * 0.1) * P.dmgMul()), Math.sign(P.vx) || 1, 7, false, '#d8c8a0');
          P.vx *= 0.8; RW.fx.shake(3, 0.15); RW.audio.sfx('slam'); say('ram', 'Ram', 'Running into monsters at speed hurts them.');
        });
      }
    }
  };

  // being hit shoves a rock less and a ghost more
  const baseHurt = P.hurt;
  P.hurt = function () {
    const vx0 = P.vx, r = baseHurt.apply(this, arguments), k = KNOCK[P.species];
    if (k && P.vx !== vx0) P.vx = vx0 + (P.vx - vx0) * k;
    return r;
  };
})(window.RW);
