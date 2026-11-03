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
  /* footprints: Harkal 1 slot 2 hexes; Xiw'Eik 2 slots 2 hexes; Lutut 2 slots 2×2; Nekh'Vorran 6×2 */
  { const D = SU.data; const st2 = SU.mapgen.newGame({ size: 'S', players: [{ kind: 'human', name: 'A' }, { kind: 'human', name: 'B' }], seed: 6 });
    const a2 = Object.values(st2.armies).find(x => x.owner === 0), b2 = Object.values(st2.armies).find(x => x.owner === 1);
    const h2 = st2.heroes[a2.heroId]; h2.slots = [{ kind: 'stack', cr: 'nekh', n: 1 }, { kind: 'stack', cr: 'lutut', n: 2 }, { kind: 'stack', cr: 'xiweik', n: 3 }, { kind: 'stack', cr: 'harkal', n: 4 }, null];
    const B2 = BT.create(st2, { owner: 0, army: a2, hero: h2, slots: h2.slots }, { owner: 1, army: b2, hero: st2.heroes[b2.heroId], slots: st2.heroes[b2.heroId].slots });
    const hexes = cr => { const u = B2.units.find(x => x.cr === cr); return u ? BT.cellsOf(u).length : 0; };
    ok(hexes('nekh') === 12, 'the Nekh’Vorran covers 6×2 hexes (' + hexes('nekh') + ')');
    ok(hexes('lutut') === 4, 'a Lutut covers 2×2 hexes');
    ok(hexes('xiweik') === 2 && hexes('harkal') === 2, 'Xiw’Eik and Harkal cover 2 hexes');
    ok((D.CREATURES.harkal.capSlots || 1) === 1 && D.CREATURES.xiweik.capSlots === 2 && D.CREATURES.lutut.capSlots === 2, 'captain places: Harkal 1, Xiw’Eik 2, Lutut 2');
    const cells = new Set(); let overlap = false; B2.units.forEach(u => BT.cellsOf(u).forEach(([c, r]) => { const k = c + ',' + r; if (cells.has(k)) overlap = true; cells.add(k); if (c < 0 || r < 0 || c >= B2.cols || r >= B2.rows) overlap = true; }));
    ok(!overlap, 'nobody stands on anyone else, and everyone is on the field');
    BT.autoRun(st2, B2); ok(!!B2.over, 'a battle with the big creatures finishes'); }
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
  SU.data.RES.forEach(r => P.res[r] = 999999);
  const before = Object.keys(h.skills).length, c1 = RU.kahizCost(h).ngakara;
  const kr = RU.kahizecvar(st, h, shrine, core.id, [0, 1, 2]);
  ok(kr.ok, 'the Kahizecvar works: ' + (kr.why || ''));
  ok(Object.keys(h.skills).length >= before, 'skills kept');
  ok(RU.kahizCost(h).ngakara === c1 * 2, 'the next Kahizecvar costs twice as much');
  ok(!RU.kahizecvar(st, h, shrine, core.id, [0, 1, 2]).ok, 'only once per shrine');
  /* Urverk windows */
  const al = Object.values(st.objects).find(o => o.type === 'urverk' && o.window);
  if (al) { const n = RU.urverkNext(st, al); ok(n >= 0, 'an aligned Urverk opens again'); }
  /* the rules asked for */
  { const D = SU.data, RU2 = SU.rules;
    const kc = RU2.kahizCost({ kahizCount: 0 }); ok(kc.gold === 5000 && D.RES.filter(r => r !== 'gold').every(r => kc[r] === 10), 'the Kahizecvar costs 5000 gold and 10 of everything');
    ok(RU2.kahizCost({ kahizCount: 2 }).gold === 20000, 'and doubles each time');
    const elite = SU.make.captain(st, { elite: true }); ok(RU2.capCapacity(st, elite, null) === 1, 'a peerless captain leads one stack');
    ok(RU2.capCapacity(st, SU.make.captain(st, { abil: 'drillmaster' }), null) === 2, 'an ordinary captain leads two');
    ok(RU2.stackMorale(st, {}, null, null, {}) === 60, 'morale is 60 out of 100 by default');
    /* morale moves the damage roll */
    const st3 = SU.mapgen.newGame({ size: 'S', players: [{ kind: 'human', name: 'A' }, { kind: 'human', name: 'B' }], seed: 9 });
    const a3 = Object.values(st3.armies).find(x => x.owner === 0), b3 = Object.values(st3.armies).find(x => x.owner === 1);
    const B3 = BT.create(st3, { owner: 0, army: a3, hero: null, slots: [{ kind: 'stack', cr: 'velnur', n: 20 }, null, null, null, null] }, { owner: 1, army: b3, hero: null, slots: [{ kind: 'stack', cr: 'kaloeik', n: 5 }, null, null, null, null] });
    const att = B3.units.find(u => u.cr === 'velnur'), tgt = B3.units.find(u => u.cr === 'kaloeik');
    att.morale = 95; const hi = BT.estimate(st3, B3, att, tgt, false); att.morale = 15; const lo = BT.estimate(st3, B3, att, tgt, false); att.morale = 60;
    ok(hi > lo * 1.3, 'high morale hits nearer the top of the damage range (' + hi + ' vs ' + lo + ')');
    /* the eye gives a vision */
    const P3 = st3.players[0]; const s3 = st3.storm; S.moveArmyIndex(st3, a3, s3.layer, s3.x, s3.y); st3.current = 0;
    const v = RU2.eyeVision(st3, 0); ok(!!v && P3.vision === v.id, 'ending a turn in the eye gives a vision of the Rokarvac');
    const t3 = S.townsOf(st3, 0)[0]; t3.built.push('fort3', 'd8'); st3.players[0].res = Object.fromEntries(D.RES.map(r => [r, 1e6]));
    ok(!RU2.canBuild(st3, t3, 'd9').ok, 'no Nekh Hollow without the Rokarvac in town');
    const h3 = st3.heroes[a3.heroId]; RU2.giveRelic(st3, h3, 'nekhprint'); S.moveArmyIndex(st3, a3, t3.layer, t3.x, t3.y);
    ok(RU2.canBuild(st3, t3, 'd9').ok, 'the Rokarvac at the gate lets the town build the Nekh Hollow');
    /* mounts */
    a3.mpMax = RU2.mpMax(st3, a3); const before = a3.mpMax; RU2.addMounts(st3, a3, 9); ok(RU2.mpMax(st3, a3) > before * 1.2, 'a punk for every stack: the army travels further');
  }
  console.log(fails ? fails + ' failure(s)' : 'all good');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
