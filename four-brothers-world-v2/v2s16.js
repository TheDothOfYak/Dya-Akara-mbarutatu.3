// 4 Brothers World V2 — part 16: busier Fuzzy World caves, more chests, and fall damage for every hero.
//  1. Fuzzy World's caves get more than bats: crystal crawlers and scorpions in the caves, ember crawlers deeper down,
//     and spiky fish in cave water.
//  2. More chests: Fuzzy World gets 20 more Old Chests hidden in its caves, Rock World 12, the Ghost World 8.
//  3. Every hero takes fall damage now (the rock, the fuzzy and the ghost used to take none). Up to 7 blocks is safe.
//     Past that it hurts, more for every block, and much more from really high up (past 20 blocks, and again past 40).
//     Floating down (the fuzzy's float, the acorn's leaf, the ghost's hover, a vine, a cloud) is always safe:
//     you only count the drop from wherever you were last moving slowly.
(function (RW) {
  'use strict';
  const P = RW.player, U = RW.ui, TS = RW.TILE;
  if (!P) return;

  // ====================== 1. cave creatures ======================
  const addTo = (id, world, zones, weight) => {
    const s = RW.SPECIES[id]; if (!s || !s.spawn) return;
    s.spawn.worlds = Array.from(new Set((s.spawn.worlds || [s.world]).concat(world)));
    s.spawn.zones = Array.from(new Set((s.spawn.zones || []).concat(zones)));
    if (weight) s.spawn.weight = Math.max(s.spawn.weight || 1, weight);
  };
  addTo('crystal_crawler', 'fuzzy', ['caves', 'deep'], 8);
  addTo('scorpion', 'fuzzy', ['caves'], 9);
  addTo('ember_crawler', 'fuzzy', ['deep'], 6);
  addTo('spiky_fish', 'fuzzy', ['caves', 'deep'], 5);
  addTo('jungle_slime', 'fuzzy', ['deep'], 5);
  // bats can appear at any open spot, so they used to crowd out everything else underground: in Fuzzy World's caves
  // most bats now give way to whatever lives on the cave floor
  const E = RW.ent, baseTry = E.trySpawn;
  E.trySpawn = function (dt) {
    for (let i = 0; i < 3; i++) {
      const n = E.enemies.length;
      const r = baseTry.apply(this, arguments);
      const e = E.enemies.length > n ? E.enemies[E.enemies.length - 1] : null;
      if (!e || e.sp !== 'bat' || RW.world.def.id !== 'fuzzy') return r;
      const z = RW.world.zoneAt(Math.floor(e.x / TS), Math.floor(e.y / TS));
      if ((z !== 'caves' && z !== 'deep') || Math.random() < 0.3) return r;
      E.enemies.pop(); E.spawnT = 0;   // try again for something else
    }
  };

  // ====================== 2. more chests ======================
  const MORE = { fuzzy: 20, rock: 12, ghost: 8 };
  Object.keys(MORE).forEach((id) => {
    const def = RW.WORLDS[id]; if (!def || !def.generate) return;
    const base = def.generate;
    def.generate = function () {
      const gen = base.apply(this, arguments);
      try { chests(def, gen, MORE[id]); } catch (e) { console.warn('chests', e); }
      return gen;
    };
  });
  function chests(def, gen, n) {
    const T = RW.T, W = gen.W, fg = gen.fg, H = fg.length / W, M = gen.meta || {}, surf = M.surf, sp = def.spawn || { x: 0, y: 0 };
    if (T.woodchest == null) return;
    let seed = 99173 + W * 7 + H;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    const tl = (x, y) => RW.TILES[fg[y * W + x]] || {};
    const air = (x, y) => fg[y * W + x] === T.air;
    const placed = [];
    for (let tries = 0; tries < 40000 && placed.length < n; tries++) {
      const x = 6 + Math.floor(rnd() * (W - 12)), y = 6 + Math.floor(rnd() * (H - 14));
      if (surf && y < surf[x] + 10) continue;                 // underground only, in worlds that have a surface
      if (Math.abs(x - sp.x) < 40 && Math.abs(y - sp.y) < 30) continue;
      const below = tl(x, y + 1);
      if (!air(x, y) || !air(x, y - 1) || !below.solid || below.decor || below.platform || below.loot) continue;
      if (!air(x - 1, y) && !air(x + 1, y)) continue;         // room to reach it from the side
      if (placed.some(([a, b]) => Math.abs(a - x) < 26 && Math.abs(b - y) < 18)) continue;
      fg[y * W + x] = T.woodchest; placed.push([x, y]);
    }
    M.v2chests = placed.length;
  }

  // ====================== 3. fall damage for everyone ======================
  // the old rule (fast landings hurt, some heroes immune) is switched off for everyone; this one replaces it
  ['fuzzy', 'acorn', 'rock', 'ghost'].forEach((h) => { if (RW.HEROES[h]) RW.HEROES[h].noFall = true; });
  if (RW.HEROES.ghost) RW.HEROES.ghost.blurb = RW.HEROES.ghost.blurb.replace(', take no fall damage', '');
  const SAFE = 7;
  const fallDamage = (h) => {
    if (h <= SAFE) return 0;
    let d = (h - SAFE) * 1.2;
    if (h > 20) d += (h - 20) * 0.6;   // really high: half as much again for every block past 20
    if (h > 40) d += (h - 40) * 0.6;   // and more again past 40
    return Math.round(d);
  };
  RW.v2fall = { SAFE, damage: fallDamage };
  let startY = null;
  const onGround = () => { const W = RW.world, y = Math.floor((P.y + P.h + 2) / TS); return W.solid(Math.floor((P.x + 1) / TS), y) || W.solid(Math.floor((P.x + P.w - 1) / TS), y); };
  const baseUpd = P.update;
  P.update = function (dt) {
    const vy0 = P.vy;
    const r = baseUpd.apply(this, arguments);
    if (P.dead || !RW.game.playing) { startY = null; return r; }
    const floating = P.water || P.climbing || (P.vine && P.vine.state === 'on') || (P.cloud && P.cloud.on);
    const landed = startY != null && vy0 > 150 && !P.water && (P.ground || (P.vy <= 20 && onGround()));
    if (landed) {
      const h = (P.y - startY) / TS, d = fallDamage(h);
      if (d > 0) {
        P.hurt(d, 0, 'fall');
        if (h > 20) { RW.fx.shake(Math.min(8, 2 + h / 8), 0.3); if (!P.flags.tipFall) { P.flags.tipFall = 1; U && U.toast && U.toast('That was a long way down. Falls past about 7 blocks hurt, and really high ones hurt a lot more.'); } }
      }
    }
    if (startY == null || landed || P.ground || floating || P.vy < 100) startY = P.y;   // slow, rising, or held up: the drop starts here
    return r;
  };
})(window.RW);
