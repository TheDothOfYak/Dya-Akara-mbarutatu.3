/* ============================================================
   SKAAR UVERKHRON — js/ai.js
   The computer players. Each turn: build and recruit in every
   town, hire and train heroes, then send each army after the
   best thing it can reach — treasure, mines, weaker enemies,
   towns — while keeping clear of fights it would lose.

   takeTurn(st, hooks) is async: hooks.battle(spec) must resolve
   with the battle report (a person may be fighting back).
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, RU = SU.rules, M = SU.make, BT = SU.battle;
  const AI = SU.ai = {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  let STYLE = null;
  /* as the old computer players did: the money buildings first, then the dwellings climbing the tiers */
  const BUILD_DUSK = ['market', 'hall2', 'd3', 'd4', 't_road', 'granary', 'fort2', 'd5', 'd1u', 'd2u', 'd6', 'hall3', 't_capt', 'terraces', 'd3u', 'd7', 'songs1', 't_duat', 'vault', 'd4u', 'farms', 'fort3', 'd8', 'terraces2', 'stygwell', 'songs2', 't_count', 't_pens', 'sanctum', 'd9', 'urverk', 'songs3', 'choir'];

  /* the Elsha'ryn build the same way, with their own dwellings and wonders */
  const SWAP = { urverk: 'grove', stygwell: 'mossbed', sanctum: 'oathtree' };
  const BUILD_ELSH = BUILD_DUSK.map(b => SWAP[b] || b.replace(/^d(\d)(u?)$/, 'e$1$2')).concat(['memtree', 'altar']);
  const priorityFor = t => D.factionOf(t.faction) === 'elsharyn' ? BUILD_ELSH : BUILD_DUSK;
  AI.takeTurn = async function (st, hooks) {
    const pi = st.current, P = st.players[pi], lvl = D.AI_LEVELS[P.ai] || D.AI_LEVELS.normal;
    P.explored.forEach(E => E.fill(1));   /* the computer knows the land */
    /* each computer player has a personality for the whole game */
    if (!P.style) P.style = SU.rng(st).pick(Object.keys(D.AI_STYLES));
    STYLE = D.AI_STYLES[P.style] || D.AI_STYLES.conqueror;
    Object.values(st.heroes).forEach(h => { if (h.owner === pi && !h.dead) while (h.levelUps.length) RU.resolveLevelUp(st, h); });
    /* a little help (or hindrance) by difficulty */
    if (lvl.bonus !== 1 && S.cal(st.day).dow === 1) P.res.gold += Math.round(1500 * (lvl.bonus - 1));
    /* build first, then heroes, as the old computer players did */
    for (const t of S.townsOf(st, pi)) manageTown(st, P, t);
    hireAndTrain(st, P);
    const armies = () => Object.values(st.armies).filter(a => !a.dead && a.owner === pi);
    for (let pass = 0; pass < 2; pass++) {
      for (const a of armies()) {
        if (a.dead || a.mp < 80) continue;
        await moveArmy(st, P, a, hooks, lvl);
        if (st.over) return;
        await sleep(0);
      }
    }
    /* heroes back in town pick up the garrison */
    for (const a of armies()) { const t = S.townAtArmy(st, a); if (t && a.heroId) collectGarrison(st, t, st.heroes[a.heroId]); }
    SU.syncRng(st);
  };

  function manageTown(st, P, t) {
    const R = SU.rng(st);
    /* build */
    /* one building a day, and never at the cost of the army */
    const keep = st.day < 4 ? 0 : (2500 + Math.min(4000, st.day * 60)) * (STYLE ? STYLE.keep : 1);
    /* the next thing wanted: short of wood, stone or a rare for it? trade spare stores or gold at the market */
    const next = priorityFor(t).find(b => { const c = RU.canBuild(st, t, b); return c.ok || c.poor; });
    if (next && RU.canBuild(st, t, next).poor) shopFor(st, P, t, next, D.BUILDINGS[next].gold ? 300 : keep);
    /* a hall pays for itself within the week, so it never waits on the army's money */
    const keepFor = b => D.BUILDINGS[b].gold ? 300 : keep;
    const bid = priorityFor(t).find(b => RU.canBuild(st, t, b).ok && P.res.gold - (RU.buildCost(t, b).gold || 0) > keepFor(b));
    if (bid) RU.build(st, t, bid);
    /* recruit: best creatures first, into the garrison, keeping money for heroes we still want,
       and (until the week's end, when the dwellings are full) for the next building */
    const field = S.fieldHeroes(st, P.idx).length + S.townsOf(st, P.idx).reduce((n, x) => n + x.heroes.length, 0);
    const saving = next && !t.built.includes(next) && (D.BUILDINGS[next].gold || S.cal(st.day).dow < D.WEEK - 1) && st.day > 2 ? (RU.buildCost(t, next).gold || 0) : 0;
    const reserve = (field < Math.min(D.MAX_FIELD_HEROES, 1 + Math.floor(st.day / 18), 1 + S.townsOf(st, P.idx).length) ? M.heroCost + 500 : 300) + saving;
    const dws = RU.townDwellings(t).sort((a, b) => b.tier - a.tier);
    dws.forEach(d => { const cr = d.up || d.base; const C = D.CREATURES[cr];
      let n = RU.maxRecruit(st, t, cr, d.base); n = Math.min(n, Math.floor(Math.max(0, P.res.gold - reserve) / (C.cost.gold || 1)));
      if (n > 0) RU.recruit(st, t, cr, d.base, n, t.garrison, null); });
    /* upgrade what we can */
    S.stacksIn(t.garrison).forEach(s => RU.upgradeStack(st, t, s));
    /* a captain for the garrison now and then */
    if (P.tavern.captains.length && P.res.gold > 6000 && S.captainsIn(t.garrison).length < 2 && t.garrison.some(s => !s)) RU.hireCaptain(st, P, t, 0, t.garrison);
    /* captain cores become captains */
    if (RU.has(t, 'vault')) P.vault.slice().forEach(cid => { if (t.garrison.some(s => !s)) RU.captainFromCore(st, P, t, cid, t.garrison); });
    /* a hero visiting takes the troops */
    const vis = S.armyAt(st, t.layer, t.x, t.y); if (vis && vis.owner === P.idx && vis.heroId) collectGarrison(st, t, st.heroes[vis.heroId]);
  }
  /* trade for what a building lacks: surplus food or other stores first, then gold */
  function shopFor(st, P, t, bid, keep) {
    if (!S.townsOf(st, P.idx).some(x => RU.has(x, 'market'))) return;
    const cost = RU.buildCost(t, bid);
    const spare = r => Math.max(0, (P.res[r] || 0) - (cost[r] || 0) - (r === 'food' ? 150 : 5));
    for (const [r, need] of Object.entries(cost)) {
      if (r === 'gold') continue;
      let short = need - (P.res[r] || 0);
      for (const from of D.RES) {
        if (short <= 0) break;
        if (from === r || from === 'gold' || !spare(from)) continue;
        const rate = RU.tradeRate(st, P, from, r); if (rate <= 0) continue;
        const give = Math.min(spare(from), Math.ceil(short / rate));
        const got = RU.trade(st, P, from, r, give); if (got.ok) short -= got.get;
      }
      if (short > 0) {
        const rate = RU.tradeRate(st, P, 'gold', r), give = Math.ceil((short + 0.5) / rate);
        if (P.res.gold - give - (cost.gold || 0) > keep) RU.trade(st, P, 'gold', r, give);
      }
    }
  }
  function collectGarrison(st, t, h) {
    if (!h) return;
    /* keep a little for defence once the town is big */
    const keep = STYLE && STYLE.garrison ? STYLE.garrison : S.townsOf(st, h.owner).length > 1 ? 0.2 : 0.1;
    t.garrison.forEach((s, i) => {
      if (!s) return;
      if (s.kind === 'cap') { const j = h.slots.findIndex(x => !x); if (j >= 0) { h.slots[j] = s; t.garrison[i] = null; } return; }
      const n = Math.floor(s.n * (1 - keep)); if (n <= 0) return;
      if (RU.addToSlots(st, h.slots, s.cr, n, h)) { s.n -= n; if (s.n <= 0) t.garrison[i] = null; }
    });
  }
  function hireAndTrain(st, P) {
    const towns = S.townsOf(st, P.idx).filter(t => RU.has(t, 'tavern'));
    const field = S.fieldHeroes(st, P.idx).length;
    const inside = towns.reduce((n, t) => n + t.heroes.length, 0);
    const want = Math.max(1, Math.min(D.MAX_FIELD_HEROES, 1 + Math.floor(st.day / 18), 1 + S.townsOf(st, P.idx).length + (P.res.gold > 20000 ? 2 : 0) + (STYLE ? STYLE.heroes : 0)));
    if (towns.length && field + inside < want && P.res.gold > M.heroCost + 300) {
      const t = towns[0]; if (P.tavern.heroes.length) RU.hireHero(st, P, t, P.tavern.heroes[0]);
    }
    S.townsOf(st, P.idx).forEach(t => {
      t.heroes.slice().forEach(id => {
        const h = st.heroes[id]; if (!h) return;
        for (let k = 0; k < 2 && Object.keys(h.skills).length < 5; k++) {
          const halls = t.built.filter(b => D.BUILDINGS[b].teaches);
          const hall = halls.find(b => (RU.trainOffer(st, t, h, b) || []).length); if (!hall) break;
          const opts = RU.trainOffer(st, t, h, hall); RU.train(st, t, h, opts[0]);
        }
        if (RU.readyToLeave(h) && !(t.defender === id && t.heroes.length === 1 && S.townsOf(st, P.idx).length > 2)) {
          collectGarrison(st, t, h);
          if (S.power(h.slots, h) > 1500) RU.sendOut(st, t, h);
        }
      });
    });
  }

  /* ---------- choosing where to go ---------- */
  function guardOf(st, o) { return Object.values(st.armies).find(w => !w.dead && w.wild && w.guard === o.id); }
  function targets(st, P, a) {
    const h = S.heroOf(st, a), out = [];
    const myPow = S.power(S.slotsOf(st, a), h);
    Object.values(st.objects).forEach(o => {
      if (o.layer !== a.layer || o.gone) return;
      let v = 0;
      if (o.type === 'pile') v = (o.res === 'gold' ? o.amt / 100 : D.RES_INFO[o.res].common ? o.amt * 1.2 : o.amt * 4) * (STYLE ? STYLE.treasure : 1);
      else if (o.type === 'vision' && h) v = 70;
      else if (o.type === 'relic' && o.relic === 'nekhprint' && h) v = 90;
      else if (o.type === 'chest') v = 14;
      else if (o.type === 'relic' && h) v = { common: 14, rare: 24, great: 40, skaar: 60 }[D.RELICS[o.relic].rare];
      else if (o.type === 'mine' && o.owner !== a.owner && !(o.owner >= 0 && S.allies(st, o.owner, a.owner))) v = o.kind === 'gold' ? 30 : D.RES_INFO[D.MINES[o.kind].res].common ? 16 : 22;
      else if (o.type === 'visit' && h && D.VISIT[o.kind].stat && !o.visited[h.id]) v = 12;
      else if (o.type === 'core' && h) v = 30;
      else if (o.type === 'scroll' && h && RU.canSing(st, h, o.song)) v = 10;
      else if (o.type === 'urverk' && h && myPow > 14000 && o.triggerKnown && RU.urverkNext(st, o) <= 3 && RU.urverkNext(st, o) >= 0 && (o.kind !== 'danger' || myPow > 25000)) {
        /* strong enough to go looking for rivals on another world */
        const dest = st.objects[o.link];
        if (dest && dest.layer !== a.layer && Object.values(st.objects).some(t => t.type === 'town' && t.layer === dest.layer && t.owner !== a.owner && !(t.owner >= 0 && S.allies(st, t.owner, a.owner)))) v = 40 + myPow / 2000;
      }
      else if (o.type === 'town' && o.owner === a.owner && h && (o.x !== a.x || o.y !== a.y)) { const gp = S.power(o.garrison); if (gp > myPow * 0.3 && gp > 1200) v = 10 + gp / 600;
        /* carrying the worm's Rokarvac: bring it to a town that is ready for the Nekh Hollow */
        if (RU.carries(h, 'nekhprint') && !o.built.includes('d9') && RU.has(o, 'fort3') && o.built.includes('d8')) v = Math.max(v, 60); }
      else if (o.type === 'town' && o.owner !== a.owner && h && !(o.owner >= 0 && S.allies(st, o.owner, a.owner))) {
        const def = RU.townDefense(st, o); const dp = def ? S.power(def.slots, def.hero) * 1.3 + (def.hero ? S.power(def.hero.slots, def.hero) : 0) : 0;
        if (dp < myPow * 0.75) v = 80;
      }
      if (!v) return;
      const g = guardOf(st, o); if (g) { const gp = S.power(g.slots); if (gp > myPow * 0.7) return; v *= 1.2; }
      out.push({ x: o.x, y: o.y, v, o, far: o.type === 'urverk' || o.type === 'town' });
    });
    Object.values(st.armies).forEach(e => {
      if (e.dead || e.layer !== a.layer || e.owner === a.owner || e.temp || (e.owner >= 0 && S.allies(st, e.owner, a.owner))) return;
      const ep = S.power(S.slotsOf(st, e), S.heroOf(st, e));
      if (e.wild && e.mcfly) return;
      if (ep < myPow * (e.wild ? 0.55 : 0.65)) out.push({ x: e.x, y: e.y, v: e.wild ? 10 + ep / 2500 : 40 + ep / 1500, army: e });
    });
    return out;
  }
  /* the war plan: a strong hero marches on the weakest rival town it can beat,
     through an Urverk toward that town's world if it must */
  function warPath(st, P, a, danger) {
    const h = S.heroOf(st, a); if (!h || st.day < 18) return null;
    const myPow = S.power(S.slotsOf(st, a), h);
    /* walls and towers make a town much harder than its garrison looks */
    const def = t => { const d = RU.townDefense(st, t); const walls = t.built.reduce((m, b) => Math.max(m, D.BUILDINGS[b].walls || 0), 0); return d ? (S.power(d.slots, d.hero) + (d.hero ? S.power(d.hero.slots, d.hero) : 0)) * (1.4 + walls * 0.35) + walls * 1500 : 0; };
    const towns = Object.values(st.objects).filter(t => t.type === 'town' && t.owner !== a.owner && !(t.owner >= 0 && S.allies(st, t.owner, a.owner)) && def(t) < myPow * (0.5 + 0.2 * (STYLE ? STYLE.war : 1)))
      .sort((p, q) => ((p.layer !== a.layer) - (q.layer !== a.layer)) || ((q.owner >= 0) - (p.owner >= 0)) || Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y));
    for (const t of towns.slice(0, 4)) {
      if (t.layer === a.layer) {
        const p = RU.path(st, a, t.x, t.y, { avoid: danger }); if (p && p.length) return { t: { x: t.x, y: t.y, o: t }, p };
        /* the road is blocked by wild creatures: clear the first one we can beat */
        const p2 = RU.path(st, a, t.x, t.y, { throughWild: true });
        if (p2) { const blk = p2.map(s => S.armyAt(st, a.layer, s.x, s.y) || RU.guardNear(st, a.layer, s.x, s.y)).find(w => w && w.wild);
          if (blk && S.power(blk.slots) < myPow * 0.6) { const p3 = RU.path(st, a, blk.x, blk.y); if (p3 && p3.length) return { t: { x: blk.x, y: blk.y, army: blk }, p: p3 }; } }
        continue;
      }
      const gates = Object.values(st.objects).filter(o => o.type === 'urverk' && o.layer === a.layer && o.triggerKnown && st.objects[o.link] && (st.objects[o.link].layer === t.layer || st.objects[o.link].layer !== a.layer && st.objects[o.link].layer !== 3) && (o.kind !== 'danger' || myPow > 25000) && RU.urverkNext(st, o) >= 0 && RU.urverkNext(st, o) <= 6)
        .sort((p, q) => ((st.objects[p.link].layer !== t.layer) - (st.objects[q.link].layer !== t.layer)) || Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y));
      for (const g of gates) { const p = RU.path(st, a, g.x, g.y, { avoid: danger }); if (p && p.length) return { t: { x: g.x, y: g.y, o: g }, p, war: true }; }
    }
    return null;
  }
  async function moveArmy(st, P, a, hooks, lvl) {
    const h = S.heroOf(st, a);
    let best = null, bestScore = 0;
    const cands = targets(st, P, a).filter(t => t.far || Math.max(Math.abs(t.x - a.x), Math.abs(t.y - a.y)) < 26).sort((p, q) => (q.v / (1 + Math.hypot(q.x - a.x, q.y - a.y))) - (p.v / (1 + Math.hypot(p.x - a.x, p.y - a.y)))).slice(0, 10);
    const myPow = S.power(S.slotsOf(st, a), h);
    const danger = (x, y) => { const g = RU.guardNear(st, a.layer, x, y); return g && S.power(g.slots) > myPow * 0.7; };
    for (const t of cands) {
      const p = RU.path(st, a, t.x, t.y, { avoid: (x, y) => danger(x, y) && !(Math.abs(x - t.x) <= 1 && Math.abs(y - t.y) <= 1 && !danger(t.x, t.y)) }); if (!p || !p.length) continue;
      const cost = p[p.length - 1].g; const days = cost / Math.max(1, a.mpMax);
      const score = t.v * lvl.aggression / (0.6 + days);
      if (score > bestScore) { bestScore = score; best = { t, p }; }
    }
    /* the strongest hero goes to war when it can win */
    if (h && S.fieldHeroes(st, a.owner).every(o => o === a || S.power(S.slotsOf(st, o)) <= S.power(S.slotsOf(st, a)))) {
      const w = warPath(st, P, a, danger); if (w && (!best || bestScore < 40 || w.t.army || (w.t.o && w.t.o.type === 'town'))) best = w;
    }
    /* nothing to do: go home and gather troops, or try an Urverk */
    if (!best) {
      const home = S.townsOf(st, a.owner).filter(t => t.layer === a.layer).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
      if (home && h && (home.x !== a.x || home.y !== a.y) && S.armySize(home.garrison) > 0) { const p = RU.path(st, a, home.x, home.y, { avoid: danger }); if (p) best = { t: { x: home.x, y: home.y, o: home }, p }; }
      if (!best) { const u = Object.values(st.objects).filter(o => o.type === 'urverk' && o.layer === a.layer && RU.urverkOpen(st, o) && o.triggerKnown && !guardOf(st, o) && (o.kind !== 'danger' || myPow > 15000)).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
        if (u && h && SU.rng(st).chance(0.5)) { const p = RU.path(st, a, u.x, u.y, { avoid: danger }); if (p) best = { t: { x: u.x, y: u.y, o: u }, p }; } }
      if (!best) return;
    }
    for (const s of best.p) {
      if (a.dead) return;
      /* where a person can see, they watch the army walk */
      if (hooks.watch) await hooks.watch(a, s.x, s.y);
      const r = RU.step(st, a, s.x, s.y);
      if (!r.moved && !r.event && !r.need) break;
      if (r.event || r.need) { await handle(st, P, a, r, hooks); break; }
      if (r.stop) break;
    }
  }
  async function handle(st, P, a, r, hooks) {
    const h = S.heroOf(st, a), ev = r.event;
    if (r.need) {
      const o = r.obj;
      if (r.need === 'chest') { if (h && (st.day > 20 || h.level < 3) && SU.rng(st).chance(0.5)) RU.giveXp(st, h, o.xp); else P.res.gold += o.gold; o.gone = true; S.unplace(st, o); delete st.objects[o.id]; }
      else if (r.need === 'join') RU.addToSlots(st, S.slotsOf(st, a), r.offer.cr, r.offer.n, h);
      else if (r.need === 'shrine' && h) { const q = RU.shrineQuest(st, o, h); if (q && !q.done) { if (q.kind === 'gold' && P.res.gold > q.amt + 3000) { P.res.gold -= q.amt; q.done = true; } else if (q.kind === 'bring' && P.res[q.res] >= q.amt) { P.res[q.res] -= q.amt; q.done = true; } }
        if (!q || q.done) { const c = h.pouch.map(id => st.cores[id]).find(c => c && c.kind === 'hero'); if (c) RU.kahizecvar(st, h, o, c.id, [0, 1, 2].filter(i => i < c.offer.length)); } }
      return;
    }
    if (!ev) return;
    if (ev.kind === 'battle') await fight(st, hooks, ev.attacker, ev.defender, null);
    else if (ev.kind === 'siege') {
      const def = RU.townDefense(st, ev.town);
      await fight(st, hooks, a, null, ev.town, def);
    }
    else if (ev.kind === 'town') { collectGarrison(st, ev.obj, h); manageTown(st, P, ev.obj); }
    else if (ev.kind === 'urverk' && h && !(ev.obj.kind === 'danger' && S.power(h.slots, h) < 15000)) {
      const res = RU.crossUrverk(st, a, ev.obj);
      if (res.need === 'toll' && P.res.gold > res.price + 3000) { const r2 = RU.crossUrverk(st, a, ev.obj, 'pay'); if (r2.event) await fight(st, hooks, r2.event.attacker, r2.event.defender, null); }
      else if (res.event) await fight(st, hooks, res.event.attacker, res.event.defender, null);
    }
    else if (ev.kind === 'herd') {
      const ws = S.stacksIn(ev.other.slots)[0];
      if (h && S.skill(st, h, 'beasts') && ws && P.res.food > ws.n && RU.addToSlots(st, S.slotsOf(st, a), ws.cr, ws.n, h)) { P.res.food -= Math.ceil(ws.n * 0.8); RU.removeArmy(st, ev.other); }
      else if (S.power(ev.other.slots) < S.power(S.slotsOf(st, a), h) * 0.6) await fight(st, hooks, a, ev.other, null);   /* drive them off */
    }
    else if (ev.kind === 'meet') {
      /* a squadron meeting a hero joins the hero's army, captain and all */
      const other = ev.other, j = h ? h.slots.findIndex(x => !x) : -1;
      if (h && !other.heroId && j >= 0 && other.slots[0]) { h.slots[j] = other.slots[0]; RU.removeArmy(st, other); }
    }
  }
  /* run a battle: through the hooks, so a person on the other side can fight it */
  async function fight(st, hooks, attacker, defender, town, def) {
    const spec = { attacker, defender, town, def };
    return hooks.battle(spec);
  }
  AI._targets = targets; AI._warPath = warPath; AI._moveArmy = moveArmy;
})(typeof window !== 'undefined' ? window : globalThis);
