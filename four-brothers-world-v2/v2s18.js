// 4 Brothers World V2 — part 18: the Geodling, a little geode guy who lives in Rock World's crystal caves.
// A round rock on two stubby feet, with his front cracked open like a geode: a ring of white quartz, purple crystal
// points, and two shiny eyes looking out from the middle. He wanders about and never hurts anyone.
// Come close and he snaps shut into a plain rock (shut, he's very hard to hurt, and a hit sends him rolling away).
// Stand still and after a moment he peeks out through the crack, and then opens up again. If he opens up while you're
// right beside him, he likes you, and leaves you a crystal shard (once each).
(function (RW) {
  'use strict';
  const P = RW.player, E = RW.ent, A = RW.art, TS = RW.TILE;
  if (!P || !E || !A || !A.drawers || !E.behaviors) return;
  const D = A.drawers, B = E.behaviors; const { px, rect, ell, line } = A; const mk = A.canvas;
  const ID = 'geodling';

  RW.register.species({ id: ID, type: 'monsters', name: 'Geodling', world: 'rock', role: 'enemy', status: 'active', art: { draw: 'geodling' },
    w: 14, h: 13, hp: 26, dmg: 0, speed: 34, behavior: 'geodling', temper: 'critter',
    spawn: { worlds: ['rock'], medium: 'ground', zones: ['crystal', 'caves'], weight: 5 },
    drops: [['crystal_shard', 1, 2, 4], ['crystal_purple', 0.06, 1, 1]],
    blurb: 'A little geode guy. Cracked open he shows purple crystals and two shiny eyes. Get close and he snaps shut into a plain rock. Stand still and he peeks out again. Leaves a shard for anyone patient enough to make friends.' });

  // ====================== the drawing ======================
  // frames: 0-1 open and walking, 2 shut (just a rock), 3 shut but peeking out through the crack, 4 blinking
  const STONE = ['#a49a90', '#8a8178', '#736b64', '#5c554f', '#47413c'], QUARTZ = ['#f6f0ff', '#d8cce8'];
  const AM = ['#e6d0ff', '#c098ff', '#9a62ec', '#7238c4', '#4c1e8a'], CORE = '#24103a', INK = '#16120f';
  const hash = (x, y) => { const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return n - Math.floor(n); };
  function body(g, cx, cy, rx, ry) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      const r = (x / (rx + 0.5)) ** 2 + (y / (ry + 0.5)) ** 2; if (r > 1) continue;
      // light from the upper left, a few darker and lighter flecks in the stone
      let k = 2 + (y > ry * 0.35 ? 1 : 0) + (y > ry * 0.75 ? 1 : 0) - (x + y < -rx * 0.6 ? 1 : 0) - (x + y < -rx * 1.1 ? 1 : 0);
      const h = hash(cx + x, cy + y); if (h > 0.9) k++; else if (h < 0.07) k--;
      px(g, cx + x, cy + y, STONE[Math.max(0, Math.min(4, k))]);
    }
  }
  function face(g, cx, cy, rx, ry, blink) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      const r = Math.sqrt((x / (rx + 0.4)) ** 2 + (y / (ry + 0.4)) ** 2); if (r > 1) continue;
      let col;
      if (r > 0.82) col = QUARTZ[(x + y) & 1];                                  // the white quartz rim
      else if (r > 0.5) {                                                       // a ring of crystal points around the hollow
        const a = Math.atan2(y, x), facet = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 9) & 1;
        let k = (facet ? 1 : 2) + (y > 0 ? 1 : 0) + (r < 0.62 ? 1 : 0); col = AM[Math.max(0, Math.min(4, k))];
      } else col = CORE;                                                        // the dark hollow in the middle
      px(g, cx + x, cy + y, col);
    }
    // two big shiny eyes in the hollow, looking the way he walks
    if (blink) { rect(g, cx - 2, cy, 2, 1, '#ffffff'); rect(g, cx + 1, cy, 2, 1, '#ffffff'); return; }
    rect(g, cx - 2, cy - 1, 2, 2, '#ffffff'); rect(g, cx + 1, cy - 1, 2, 2, '#ffffff');
    px(g, cx - 1, cy, '#120a1c'); px(g, cx + 2, cy, '#120a1c');
  }
  D.geodling = function () {
    const frames = [];
    for (let f = 0; f < 5; f++) {
      const c = mk(20, 18), g = c.ctx; const open = f < 2 || f === 4, cx = 9, cy = open ? 8 - (f === 1 ? 1 : 0) : 10;
      if (open) { // stubby feet, one lifts as he toddles
        rect(g, 5, f === 1 ? 14 : 15, 3, 2, STONE[3]); rect(g, 11, 15, 3, 2, STONE[3]);
        px(g, 5, f === 1 ? 15 : 16, STONE[4]); px(g, 11, 16, STONE[4]);
      }
      body(g, cx, cy, 8, open ? 7 : 6);
      px(g, cx - 3, cy - 7 + (open ? 0 : 1), STONE[1]); px(g, cx + 4, cy - 6 + (open ? 0 : 1), STONE[2]); // little lumps on top
      if (open) face(g, cx + 1, cy, 6, 5, f === 4);
      else {
        const zig = [[0, -5], [1, -4], [0, -3], [1, -2], [0, -1], [1, 0], [0, 1], [1, 2], [0, 3], [1, 4], [0, 5]];
        zig.forEach(([dx, dy]) => { if (cy + dy >= cy - 6 && cy + dy <= cy + 6) px(g, cx + 1 + dx, cy + dy, '#2a2522'); });
        if (f === 3) { // peeking: the crack opens a little, a purple glint and two eyes
          for (let dy = -2; dy <= 2; dy++) { px(g, cx + 1, cy + dy, CORE); px(g, cx + 2, cy + dy, CORE); }
          px(g, cx + 1, cy - 1, '#ffffff'); px(g, cx + 2, cy - 1, '#ffffff'); px(g, cx + 1, cy + 1, AM[1]); px(g, cx + 2, cy - 3, AM[0]); px(g, cx + 1, cy + 2, AM[2]);
        }
      }
      A.outline(c, INK); frames.push(c);
    }
    return frames;
  };
  if (A._spCache) delete A._spCache[ID];

  // ====================== what he does ======================
  const ec = E.center;
  const near = (e, r) => { if (P.dead) return false; const a = P.center(), b = ec(e); return Math.abs(a.x - b.x) < r * TS && Math.abs(a.y - b.y) < r * TS * 0.7; };
  const W = () => RW.world;
  B.geodling = function (e, dt, sp) {
    const wet = W().isWaterAt(e.x + e.w / 2, e.y + e.h / 2);
    e.vy += (wet ? 250 : 900) * dt; if (wet) e.vy = Math.min(e.vy, 80);
    e.gs = e.gs || 'open'; e.gT = (e.gT || 0) + dt;
    const close = near(e, 5), still = Math.abs(P.vx) < 8 && !(P.swingT > 0);
    if (e.gs === 'open') {
      if (close && !(e.trustT > 0)) { e.gs = 'shut'; e.gT = 0; e.calmT = 0; RW.audio.sfx('place'); RW.fx.burst(ec(e).x, ec(e).y, ['#8a827a', '#5a534e'], 4, 30); }
      else {
        if ((e.wt = (e.wt || 0) - dt) <= 0) { e.wt = 1.5 + Math.random() * 3; e.wd = Math.random() < 0.4 ? 0 : Math.random() < 0.5 ? -1 : 1; }
        e.vx = RW.lerp(e.vx, (e.wd || 0) * sp.speed, dt * 5);
      }
      e.trustT = Math.max(0, (e.trustT || 0) - dt);
    } else {
      e.vx = e.rollT > 0 ? e.vx : RW.lerp(e.vx, 0, dt * 6);
      e.rollT = Math.max(0, (e.rollT || 0) - dt);
      // calms down when you keep your distance or stand still
      if (!near(e, 7) || (still && e.rollT <= 0)) e.calmT = (e.calmT || 0) + dt; else e.calmT = 0;
      if (e.gs === 'shut' && e.calmT > 2.2) { e.gs = 'peek'; e.gT = 0; }
      else if (e.gs === 'peek') {
        if (e.calmT === 0) { e.gs = 'shut'; e.gT = 0; }
        else if (e.gT > 1.4) {
          e.gs = 'open'; e.gT = 0; e.trustT = close ? 6 : 0; RW.audio.sfx('crystal');
          const c = ec(e); RW.fx.burst(c.x, c.y - 2, ['#d4b4ff', '#a86ef0', '#ffffff'], 8, 40, { add: true, kind: 'glow', grav: -20 });
          if (close && !e.gift) { // he likes you
            e.gift = true; E.dropItem('crystal_shard', 1, c.x, c.y - 6);
            if (P.flags && !P.flags.tipGeodling) { P.flags.tipGeodling = 1; RW.ui.toast('The Geodling likes you. He left you a crystal shard.'); }
          }
        }
      }
    }
    const r = E.move(e, dt, { step: true, grounded: e.ground }); e.ground = r.ground;
    if (e.gs === 'open' && e.ground && e.wd && (r.wallL || r.wallR)) { if (Math.random() < 0.5) e.vy = -220; else e.wd = -e.wd; }
    if (e.gs === 'open' && e.wd) e.face = e.wd;
    e.fr = e.gs === 'open' ? (Math.abs(e.vx) > 4 ? Math.floor(e.t * 6) % 2 : (e.t % 3.2 < 0.14 ? 4 : 0)) : e.gs === 'peek' ? 3 : 2;
    e.harmless = true;
    if (e.gs === 'open') { const c = ec(e); RW.fx.light(c.x, c.y, 0.4, 0.22, 0.6); if (Math.random() < dt * 1.5) RW.fx.spawn({ x: c.x + RW.rand(-4, 4), y: c.y + RW.rand(-3, 3), vy: -12, life: 0.6, color: '#d4b4ff', add: true, kind: 'glow' }); }
  };

  // shut, he's a rock: hits barely scratch him and send him rolling away
  const baseDamage = E.damage;
  E.damage = function (e, d, dir, knock, crit, color) {
    if (e && e.sp === ID) {
      if (e.gs === 'open') { e.gs = 'shut'; e.gT = 0; e.calmT = 0; e.trustT = 0; }
      else d = Math.max(1, Math.round(d * 0.3));
      const away = dir || (ec(e).x < P.center().x ? -1 : 1);
      e.rollT = 0.7; e.vx = away * 150; if (e.ground) e.vy = -150; e.calmT = 0;
      knock = 0;
    }
    return baseDamage.call(this, e, d, dir, knock, crit, color);
  };
})(window.RW);
