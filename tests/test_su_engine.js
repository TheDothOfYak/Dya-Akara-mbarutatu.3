/* Skaar Uverkhron: the rules without a screen. Generates maps, plays
   computer-vs-computer games for many days, checks battles, sieges,
   saving and loading, and that nothing breaks along the way. */
const path = require('path');
const base = path.join(__dirname, '..', 'skaar-uverkhron', 'js');
['core', 'data', 'state', 'make', 'rules', 'mapgen', 'battle', 'ai'].forEach(f => require(path.join(base, f + '.js')));
const SU = globalThis.SU, S = SU.state, RU = SU.rules, BT = SU.battle;
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.error('FAIL: ' + msg); } };

async function playGame(seed, size, nPlayers, days) {
  const players = []; for (let i = 0; i < nPlayers; i++) players.push({ kind: 'ai', name: 'AI ' + i, ai: ['easy', 'normal', 'hard'][i % 3], team: 0, color: SU.data.PLAYER_COLORS[i].c });
  const st = SU.mapgen.newGame({ size, players, seed, spread: true, wild: 'normal', name: 'test' });
  ok(st.layers.length === 4, 'four layers');
  ok(Object.values(st.objects).filter(o => o.type === 'town').length >= nPlayers, 'a town each');
  ok(Object.values(st.objects).some(o => o.type === 'visit' && o.kind === 'shrine' && o.layer === 3), 'Kalo shrines on the moons');
  ok(Object.values(st.objects).filter(o => o.type === 'urverk').every(o => st.objects[o.link]), 'every Urverk leads somewhere');
  RU.startTurn(st);
  const hooks = { battle: async spec => {
    let B;
    if (spec.town) { const d = spec.def || RU.townDefense(st, spec.town); const h = d && d.hero;
      B = BT.create(st, { owner: spec.attacker.owner, army: spec.attacker, hero: S.heroOf(st, spec.attacker), slots: S.slotsOf(st, spec.attacker) }, { owner: spec.town.owner, hero: h, slots: h ? h.slots : spec.town.garrison, town: spec.town }, { town: spec.town, layer: spec.town.layer, x: spec.town.x, y: spec.town.y, extraDefSlots: h ? spec.town.garrison : null }); }
    else B = BT.create(st, { owner: spec.attacker.owner, army: spec.attacker, hero: S.heroOf(st, spec.attacker), slots: S.slotsOf(st, spec.attacker) }, { owner: spec.defender.owner, army: spec.defender, hero: S.heroOf(st, spec.defender), slots: S.slotsOf(st, spec.defender) }, { layer: spec.defender.temp ? spec.attacker.layer : spec.defender.layer, x: spec.defender.temp ? spec.attacker.x : spec.defender.x, y: spec.defender.temp ? spec.attacker.y : spec.defender.y });
    BT.autoRun(st, B); battles++; return BT.finish(st, B);
  } };
  let battles = 0;
  const startDay = st.day;
  while (st.day < startDay + days && !st.over) {
    await SU.ai.takeTurn(st, hooks);
    RU.endTurn(st);
  }
  /* sanity: no negative stacks, armies in the index */
  Object.values(st.armies).forEach(a => { if (a.dead) return; S.stacksIn(S.slotsOf(st, a)).forEach(s => ok(s.n >= 0, 'no negative stacks')); });
  st.players.forEach(P => Object.entries(P.res).forEach(([k, v]) => ok(v >= 0 && isFinite(v), P.name + ' has sane ' + k + ' (' + v + ')')));
  const json = S.serialize(st), back = S.deserialize(json);
  ok(back.day === st.day && Object.keys(back.armies).length === Object.keys(st.armies).length, 'save and load round-trip');
  const heroes = Object.values(st.heroes).filter(h => h.owner >= 0 && !h.dead).length;
  console.log('  seed ' + seed + ' ' + size + ' ×' + nPlayers + ': day ' + st.day + ', ' + battles + ' battles, ' + heroes + ' heroes, towns ' + st.players.map(P => S.townsOf(st, P.idx).length).join('/') + (st.over ? ', won by ' + st.over.winners.join(',') : '') + ', save ' + Math.round(json.length / 1024) + ' KB');
  return st;
}

(async () => {
  console.log('Skaar Uverkhron engine:');
  await playGame(11, 'S', 2, 60);
  await playGame(22, 'M', 3, 50);
  await playGame(33, 'L', 4, 30);
  /* a battle by hand: thieves steal, captains fall and leave cores */
  const st = SU.mapgen.newGame({ size: 'S', players: [{ kind: 'human', name: 'A' }, { kind: 'human', name: 'B' }], seed: 5 });
  const a = Object.values(st.armies).find(x => x.owner === 0), b = Object.values(st.armies).find(x => x.owner === 1);
  const ha = st.heroes[a.heroId], hb = st.heroes[b.heroId];
  ha.slots = [{ kind: 'stack', cr: 'lutut', n: 4 }, { kind: 'stack', cr: 'malsti', n: 50 }, null, null, null];
  const goldAB = st.players[0].res.gold + st.players[1].res.gold;
  const B = BT.create(st, { owner: 0, army: a, hero: ha, slots: ha.slots }, { owner: 1, army: b, hero: hb, slots: hb.slots });
  BT.autoRun(st, B);
  const rep = BT.finish(st, B);
  ok(rep.winner === 0, 'the stronger army wins');
  ok(hb.dead, 'a beaten hero dies for good');
  ok(rep.cores.length >= 1 && ha.pouch.length + ha.cores.length >= 1, 'the victor takes the memory core');
  ok(st.players[0].res.gold + st.players[1].res.gold === goldAB, 'stolen gold changes hands, none appears from nowhere');
  /* training: a new hero can't leave until they have five skills */
  const t = S.townsOf(st, 0)[0]; st.players[0].res.gold = 99999;
  const P = st.players[0]; RU.refreshTavern(st, P);
  const hire = RU.hireHero(st, P, t, P.tavern.heroes[0]); ok(hire.ok, 'hire a hero');
  const h = hire.hero; h.slots[0] = { kind: 'stack', cr: 'malsti', n: 5 };
  ok(!RU.sendOut(st, t, h).ok, 'an untrained hero stays in town');
  let guard = 0; while (Object.keys(h.skills).length < 5 && guard++ < 20) { h.trainedToday = 0; t.built.filter(x => SU.data.BUILDINGS[x].teaches).concat(['t_road', 't_count', 't_capt', 't_duat', 't_pens']).forEach(bid => { if (!t.built.includes(bid)) t.built.push(bid); const o = RU.trainOffer(st, t, h, bid); if (o && o.length && h.trainedToday < 2) RU.train(st, t, h, o[0]); }); }
  ok(Object.keys(h.skills).length === 5, 'training fills five skills');
  /* the Kahizecvar keeps three skills and costs twice as much next time */
  const shrine = Object.values(st.objects).find(o => o.type === 'visit' && o.kind === 'shrine'); shrine.quest = false;
  const core = SU.make.wildCore(st, 60000); RU.takeCore(st, h, core.id);
  P.res.ngakara = 999; P.res.stygian = 999;
  const before = Object.keys(h.skills).length, c1 = RU.kahizCost(h).ngakara;
  const kr = RU.kahizecvar(st, h, shrine, core.id, [0, 1, 2]);
  ok(kr.ok, 'the Kahizecvar works: ' + (kr.why || ''));
  ok(Object.keys(h.skills).length >= before, 'skills kept');
  ok(RU.kahizCost(h).ngakara === c1 * 2, 'the next Kahizecvar costs twice as much');
  ok(!RU.kahizecvar(st, h, shrine, core.id, [0, 1, 2]).ok, 'only once per shrine');
  /* Urverk windows */
  const al = Object.values(st.objects).find(o => o.type === 'urverk' && o.window);
  if (al) { const n = RU.urverkNext(st, al); ok(n >= 0, 'an aligned Urverk opens again'); }
  console.log(fails ? fails + ' failure(s)' : 'all good');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
