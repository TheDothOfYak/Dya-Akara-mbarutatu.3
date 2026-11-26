// 4 Brothers World V2 — part 14: the Duat Stone.
// Something is amiss in the Duat: the elites are souls climbing back out of it, and they grow (and carry more) as your
// gear gets better. A carved Duat Stone stands near where you arrive in every world. Read it (R) to see how restless
// the Duat is right now, and a banner tells you when it gets worse.
(function (RW) {
  'use strict';
  const P = RW.player, U = RW.ui;
  if (!P || !U || !RW.v2elite) return;

  const LINES = [
    'The Duat is quiet. Its great beasts sleep under the dead. Carry a weapon of iron and they will smell it, and wake.',
    'Something is amiss in the Duat. Souls that should rest are climbing back out, wearing the shapes of great beasts. For now they are weak and slow, and carry little.',
    'The Duat stirs. The beasts that climb out grow as you grow, and they bring more back with them: coins, bars and Star Embers.',
    'The Duat is restless. The beasts walk at their full strength now, and so does their treasure. Platinum clings to them.',
    'The Duat is overflowing. The beasts come back stronger than they ever were alive, and richer. Stygian and soul shards fall from them. They are Duat-touched.',
    'The Duat is breaking. What climbs out now is crowned by it. Beat one and it may give up soulsteel, or a shard of the Mirror itself.',
  ];
  const STONE = { title: 'The Duat Stone', get text() { const t = RW.v2elite.tier(); return LINES[t] + (t < 5 ? ' (The better your weapon, the stronger they get.)' : ''); } };

  // one stone per carving list (Rock World and the Ghost World share a list)
  const indexFor = (def) => { const name = def.carvings || 'CARVINGS', list = RW[name] || (RW[name] = []); let i = list.indexOf(STONE); if (i < 0) { list.push(STONE); i = list.length - 1; } return i; };

  ['fuzzy', 'acorn', 'rock', 'ghost'].forEach((id) => {
    const def = RW.WORLDS[id]; if (!def || !def.generate) return;
    const base = def.generate;
    def.generate = function () {
      const gen = base.apply(this, arguments);
      try { place(def, gen); } catch (e) { console.warn('duat stone', e); }
      return gen;
    };
  });
  function place(def, gen) {
    const T = RW.T, W = gen.W, fg = gen.fg, sp = def.spawn; if (!sp || T.tablet == null) return;
    const get = (x, y) => (x >= 0 && y >= 0 && x < W && y < fg.length / W ? fg[y * W + x] : T.stone);
    const tl = (x, y) => RW.TILES[get(x, y)] || {};
    const free = (x, y) => { const t = tl(x, y); return !t.solid && !t.climb && !t.platform && !t.decor && get(x, y) !== T.water; };
    const M = gen.meta || (gen.meta = {}); M.carvings = M.carvings || {};
    // beside where you arrive: on solid ground, with room above, away from doors, ladders and the trader's spot
    for (const dx of [4, -4, 5, -5, 3, -3, 6, -6, 11, -11, 13, -13]) {
      const x = sp.x + dx;
      for (let y = sp.y - 4; y <= sp.y + 4; y++) {
        const below = tl(x, y + 1);
        if (free(x, y) && free(x, y - 1) && below.solid && !below.decor && !below.platform && free(x - 1, y) && free(x + 1, y)) {
          fg[y * W + x] = T.tablet; M.carvings[x + ',' + y] = indexFor(def); M.duatStone = { x, y };
          return;
        }
      }
    }
  }

  // tell the player when the Duat gets worse (once per step, per hero)
  let checkT = 0;
  const baseUpd = P.update;
  P.update = function (dt) {
    const r = baseUpd.apply(this, arguments);
    if ((checkT -= dt) <= 0 && P.flags) {
      checkT = 2;
      const t = RW.v2elite.tier(), seen = P.flags.duatTier || 0;
      if (t > seen) {
        P.flags.duatTier = t;
        U.banner(seen === 0 ? 'Something is amiss in the Duat' : 'The Duat grows restless', seen === 0 ? 'Great beasts are climbing out of it, and they grow as you grow. Read the Duat Stone where you arrive.' : 'The elites will be stronger now, and carry more.');
      }
    }
    return r;
  };
})(window.RW);
