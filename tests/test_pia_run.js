/* ============================================================
   tests/test_pia_run.js — LEGENDS OF PIA'DON
   Headless checks: data integrity, the battle engine (cards,
   summons, statuses, enemy turns), co-op scaling, map generation,
   and a full run to the Quarry driven by a trivial auto-player.
   ============================================================ */
'use strict';
global.window = {};
global.DYA = {};
// minimal localStorage stub for run persistence paths
global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };

require('../js/core/util.js');
require('../js/data/species.js');
require('../js/data/pia_run.js');
require('../js/core/pia_engine.js');
require('../js/core/pia_run.js');

const D = DYA.piaData, EN = DYA.piaEngine, R = DYA.piaRun, U = DYA.util;
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; } else { fail++; console.error('  ✗ ' + m); } }

/* ---------- 1. data integrity ---------- */
console.log('1. Data integrity');
ok(D.GUARDIANS.length >= 3, 'at least 3 Guardians');
D.GUARDIANS.forEach(g => {
  ok(DYA.species.get(g.avatar), g.name + ' avatar species exists: ' + g.avatar);
  D.expandDeck(g.deck).forEach(cid => ok(D.card(cid), g.name + ' deck card exists: ' + cid));
});
// every card referencing a summon points at a real summon + real species
Object.keys(D.CARDS).forEach(cid => {
  const c = D.CARDS[cid];
  const keys = Array.isArray(c.summon) ? c.summon : (c.summon ? [c.summon] : []);
  keys.forEach(k => { const s = D.summonDef(k); ok(s, cid + ' summon key exists: ' + k); ok(s && DYA.species.get(s.species), cid + ' summon species exists'); });
});
// every enemy/boss references a real species and its summon moves resolve
Object.keys(D.ENEMIES).concat(Object.keys(D.BOSSES)).forEach(k => {
  const e = D.enemyDef(k);
  ok(DYA.species.get(e.species), k + ' species exists: ' + e.species);
  (e.moves || []).forEach(m => { if (m.summon) ok(D.enemyDef(m.summon), k + ' summon-move target exists: ' + m.summon); });
});

/* ---------- 2. basic solo battle ---------- */
console.log('2. Solo battle engine');
function soloBattle(guardianId, enemies, seed) {
  return EN.create({
    seed: seed || 123, planet: 'velki', node: { type: 'battle', enemies },
    playerCount: 1,
    players: [{ id: 'p1', name: 'Tester', guardianId, deck: null, relics: (D.guardian(guardianId).startRelic ? [D.guardian(guardianId).startRelic] : []), hp: D.guardian(guardianId).maxHp, maxHp: D.guardian(guardianId).maxHp }],
  });
}
let b = soloBattle('tanoc', ['e_krabbi'], 42);
ok(b.players[0].hand.length === D.TUNE.handSize, 'draws a full opening hand (' + b.players[0].hand.length + ')');
ok(b.players[0].energy >= 3, 'has energy at turn start');
ok(b.enemies.length === 1 && b.enemies[0].intent, 'enemy present with a telegraphed intent');
ok(b.players[0].block >= 6, 'Okid Charm granted start block (' + b.players[0].block + ')');

/* play every attack card in hand at the enemy, then end turn */
function autoTurn(battle, pid) {
  let guard = 0;
  while (guard++ < 40) {
    const p = EN.playerById(battle, pid); if (!p || p.ended || p.dead) break;
    // find a playable card
    let idx = -1;
    for (let i = 0; i < p.hand.length; i++) {
      const card = EN.mergedCard(p.hand[i]);
      if (EN.cardCost(battle, pid, card) <= p.energy) { idx = i; break; }
    }
    if (idx < 0) { EN.endTurn(battle, pid); break; }
    const enemy = EN.aliveEnemies(battle)[0];
    const res = EN.playCard(battle, pid, idx, enemy ? enemy.uid : null);
    if (!res.ok) { EN.endTurn(battle, pid); break; }
    if (battle.over) break;
  }
}
// run the fight to a conclusion
let turns = 0;
while (!b.over && turns++ < 60) autoTurn(b, 'p1');
ok(b.over, 'solo battle resolves');
ok(b.victory === true, 'auto-player beats a single Raf Krabbi');

/* ---------- 3. summons appear and act ---------- */
console.log('3. Summons');
b = soloBattle('buhkon', ['e_grothyn_su'], 7);
// force a Kindle-Call: give the player the card in hand
const p = b.players[0];
p.hand = [{ id: 'kindle_call', upg: false }, { id: 'strike_eldi', upg: false }];
p.energy = 3;
EN.playCard(b, 'p1', 0, null);
ok(EN.aliveAllies(b).length === 1, 'summon creates an ally');
ok(b.allies[0].species === 'call_tyndael' || DYA.species.get(b.allies[0].species), 'ally has a real species');
const enemyHpBefore = b.enemies[0].hp;
EN.endTurn(b, 'p1'); // triggers ally phase (ally should hit the enemy) then enemy phase
ok(b.enemies[0].hp < enemyHpBefore || b.enemies[0].hp === 0, 'summoned ally dealt damage in the ally phase');

/* ---------- 4. poison ticks ---------- */
console.log('4. Poison / statuses');
b = soloBattle('buhkon', ['e_grothyn_su'], 9);
b.players[0].hand = [{ id: 'ember', upg: false }];
b.players[0].energy = 3;
const en0 = b.enemies[0];
en0.st.poison = 0; // isolate Ember from the Ember Seed relic's start-of-battle poison
EN.playCard(b, 'p1', 0, en0.uid);
ok(en0.st.poison === 4, 'ember applies 4 poison (' + en0.st.poison + ')');
const hpBeforePoison = en0.hp;
EN.endTurn(b, 'p1');
ok(en0.hp <= hpBeforePoison - 4 || en0.hp === 0, 'poison ticked at enemy phase');
ok(en0.hp === 0 || en0.st.poison === 3, 'poison decremented by 1');

/* ---------- 4b. Phorus (Su) mechanics ---------- */
console.log('4b. Phorus / Su');
ok(D.guardian('phorus') && D.guardian('phorus').element === 'Su', 'Phorus exists and is a Su Guardian');
b = soloBattle('phorus', ['e_krabbi', 'e_harkal'], 21);
// Chillwater: block self + Weak to all enemies
b.players[0].hand = [{ id: 'chillwater', upg: false }]; b.players[0].energy = 3; b.players[0].block = 0;
EN.playCard(b, 'p1', 0, null);
ok(b.players[0].block >= 8, 'Chillwater grants self Block (' + b.players[0].block + ')');
ok(EN.aliveEnemies(b).every(e => e.st.weak >= 3), 'Chillwater applies Weak to ALL enemies');
// Tidal Bulwark power: gain block whenever a Skill is played
b = soloBattle('phorus', ['e_krabbi'], 22);
b.players[0].hand = [{ id: 'tidal_bulwark', upg: false }, { id: 'deepdraw', upg: false }]; b.players[0].energy = 3; b.players[0].block = 0;
EN.playCard(b, 'p1', 0, null); // play the power
const blkBefore = b.players[0].block;
EN.playCard(b, 'p1', 0, null); // play a Skill (deepdraw) -> +3 block from the power (plus the card's own block)
ok(b.players[0].block >= blkBefore + 3 + 5, 'Tidal Bulwark adds Block on playing a Skill');
// Leviathan Call: a big taunt guard summon
b = soloBattle('phorus', ['e_krabbi'], 23);
b.players[0].hand = [{ id: 'leviathan_call', upg: false }]; b.players[0].energy = 3;
EN.playCard(b, 'p1', 0, null);
ok(EN.aliveAllies(b).length === 1 && b.allies[0].taunt, 'Leviathan Call summons a taunting guard');

/* ---------- 5. co-op scaling ---------- */
console.log('5. Co-op scaling');
function party(n, enemies) {
  const players = [];
  for (let i = 0; i < n; i++) players.push({ id: 'p' + i, name: 'G' + i, guardianId: D.GUARDIANS[i % D.GUARDIANS.length].id, deck: null, relics: [], hp: 70, maxHp: 70 });
  return EN.create({ seed: 55, planet: 'xikia', node: { type: 'battle', enemies }, playerCount: n, players });
}
const b1 = party(1, ['e_wildpunk']);
const b3 = party(3, ['e_wildpunk']);
ok(b3.enemies.length > b1.enemies.length, '3-player battle has more enemies (' + b1.enemies.length + ' -> ' + b3.enemies.length + ')');
const totalHp1 = b1.enemies.reduce((a, e) => a + e.maxHp, 0);
const totalHp3 = b3.enemies.reduce((a, e) => a + e.maxHp, 0);
ok(totalHp3 > totalHp1 * 1.5, 'total enemy HP scales up for 3 players (' + totalHp1 + ' -> ' + totalHp3 + ')');
// boss battle with 3 players spawns guard minions
const bossB = EN.create({ seed: 5, planet: 'velki', node: { type: 'boss', boss: 'velki' }, playerCount: 3, players: [0, 1, 2].map(i => ({ id: 'p' + i, name: 'G', guardianId: 'tanoc', deck: null, relics: [], hp: 80, maxHp: 80 })) });
ok(bossB.enemies.length >= 3, 'boss fight seats guard minions for a 3-player party (' + bossB.enemies.length + ')');
ok(bossB.enemies.find(e => e.boss), 'the Quarry is present');

/* ---------- 6. map generation ---------- */
console.log('6. Map generation');
const map = R.genMap(2024, 'velki');
ok(map.floors.length === 10, 'map has 10 floors');
ok(map.floors[9][0].type === 'boss', 'final floor is the Quarry');
// reachability: BFS from start must reach the boss
const reach = new Set(map.start);
const queue = map.start.slice();
while (queue.length) { const id = queue.shift(); (map.byId[id].to || []).forEach(t => { if (!reach.has(t)) { reach.add(t); queue.push(t); } }); }
ok(reach.has('f9n0'), 'the Quarry is reachable from the start');
// every non-final node has an outgoing edge
let dead = 0; Object.values(map.byId).forEach(n => { if (n.f < 9 && (!n.to || !n.to.length)) dead++; });
ok(dead === 0, 'no dead-end nodes before the Quarry');

/* ---------- 7. full solo run to the Quarry ---------- */
console.log('7. Full run traversal');
const run = R.create({ seed: 99, planet: 'velki', mode: 'solo', players: [{ id: 'p1', name: 'Tester', guardianId: 'tanoc' }] });
ok(run.available && run.available.length >= 1, 'run starts with reachable nodes');
let steps = 0, reachedNodes = 0;
function autoResolveRun(run) {
  let guard = 0;
  while (guard++ < 200) {
    if (run.phase === 'map') {
      if (!run.available || !run.available.length) break;
      R.enterNode(run, run.available[0]);
    } else if (run.phase === 'battle') {
      let t = 0; while (!run.battle.over && t++ < 120) autoTurn(run.battle, 'p1');
      R.syncBattleResult(run);
      reachedNodes++;
    } else if (run.phase === 'reward') {
      run.players.forEach(pl => R.takeReward(run, pl.id, pl.rewardChoices ? pl.rewardChoices[0] : null));
    } else if (run.phase === 'rest') {
      run.players.forEach(pl => R.restHeal(run, pl.id));
    } else if (run.phase === 'shop') {
      R.leaveShop(run);
    } else if (run.phase === 'treasure') {
      run.players.forEach(pl => R.takeTreasure(run, pl.id, true));
    } else if (run.phase === 'legcomplete') {
      R.applyAction(run, { type: 'nextLeg', playerId: 'p1' });
    } else if (run.phase === 'gameover' || run.phase === 'win') {
      break;
    } else break;
  }
}
autoResolveRun(run);
ok(reachedNodes > 0, 'auto-player fought at least one battle (' + reachedNodes + ')');
ok(run.phase === 'win' || run.phase === 'gameover', 'run reaches a conclusion: ' + run.phase);
// deck grew from rewards along the way (unless it died immediately)
if (run.phase === 'win') ok(run.players[0].deck.length > D.expandDeck(D.guardian('tanoc').deck).length, 'deck grew from card rewards on a winning run');

/* ---------- 8. determinism ---------- */
console.log('8. Determinism');
function fingerprint(seed) {
  const bb = soloBattle('kiet', ['e_albali', 'e_kuni'], seed);
  let t = 0; while (!bb.over && t++ < 80) autoTurn(bb, 'p1');
  return [bb.victory, bb.turn, bb.players[0].hp, bb.enemies.map(e => e.hp).join(',')].join('|');
}
ok(fingerprint(31337) === fingerprint(31337), 'same seed => identical battle outcome');

/* ---------- 9. difficulty scaling + affixes ---------- */
console.log('9. Difficulty + affixes');
function battleWithDiff(diffId, enemies, seed) {
  return EN.create({ seed: seed || 5, planet: 'velki', node: { type: 'battle', enemies }, playerCount: 1, diff: D.difficulty(diffId),
    players: [{ id: 'p1', name: 'T', guardianId: 'tanoc', deck: null, relics: [], hp: 80, maxHp: 80 }] });
}
ok(D.DIFFICULTIES.length >= 5, 'at least 5 difficulty tiers');
const hpHunter = battleWithDiff('hunter', ['e_krabbi'], 5).enemies[0].maxHp;
const hpTorcain = battleWithDiff('torcain', ['e_krabbi'], 5).enemies[0].maxHp;
ok(hpTorcain > hpHunter * 1.5, 'Torcain enemies are far tougher (' + hpHunter + ' -> ' + hpTorcain + ')');
// Torcain: affixChance 1 + affixOnFodder => the fodder carries an affix
const bt = battleWithDiff('torcain', ['e_krabbi'], 9);
ok(bt.enemies[0].affix, 'a Torcain foe carries an affix (' + bt.enemies[0].affix + ')');
ok(bt.enemies[0].block >= 8, 'Torcain foes enter with a starting shield (' + bt.enemies[0].block + ')');
// Thorns retaliation: give an enemy thorns and attack it
const bthorn = battleWithDiff('hunter', ['e_grothyn_su'], 3);
const en = bthorn.enemies[0]; en.thorns = 4;
const p1 = bthorn.players[0]; const hpBefore = p1.hp;
p1.hand = [{ id: 'strike_ular', upg: false }]; p1.energy = 3; p1.block = 0;
EN.playCard(bthorn, 'p1', 0, en.uid);
ok(p1.hp < hpBefore, 'Thorned foe retaliates when struck (' + hpBefore + ' -> ' + p1.hp + ')');

/* ---------- 10. Pilgrimage (multi-run) ---------- */
console.log('10. Pilgrimage multi-run');
const camp = R.create({ seed: 12345, planet: 'velki', mode: 'solo', difficulty: 'fledgling', campaignLen: 3, players: [{ id: 'p1', name: 'T', guardianId: 'tanoc' }] });
ok(camp.campaign && camp.campaign.total === 3, 'campaign has 3 legs');
ok(camp.campaign.worlds.length === 3, 'pilgrimage spans 3 worlds');
ok(camp.campaign.worlds[0] === 'velki', 'pilgrimage starts on the chosen world');
// simulate: drive until the first world Quarry falls, verify leg-complete then advance
let cg = 0, sawLeg = false, startPlanet = camp.planet;
while (cg++ < 400 && camp.phase !== 'win' && camp.phase !== 'gameover') {
  if (camp.phase === 'legcomplete') { sawLeg = true; }
  const before = camp.campaign.leg, planetBefore = camp.planet, deckBefore = camp.players[0].deck.length, goldBefore = camp.players[0].gold;
  if (camp.phase === 'map') { if (!camp.available.length) break; R.enterNode(camp, camp.available[0]); }
  else if (camp.phase === 'battle') { let t = 0; while (!camp.battle.over && t++ < 200) autoTurn(camp.battle, 'p1'); R.syncBattleResult(camp); if (!camp.battle) {} }
  else if (camp.phase === 'reward') { camp.players.forEach(pl => R.takeReward(camp, pl.id, pl.rewardChoices ? pl.rewardChoices[0] : null)); }
  else if (camp.phase === 'rest') { camp.players.forEach(pl => R.restHeal(camp, pl.id)); }
  else if (camp.phase === 'shop') { R.leaveShop(camp); }
  else if (camp.phase === 'treasure') { camp.players.forEach(pl => R.takeTreasure(camp, pl.id, true)); }
  else if (camp.phase === 'legcomplete') {
    R.applyAction(camp, { type: 'nextLeg', playerId: 'p1' });
    ok(camp.campaign.leg === before + 1, 'nextLeg advances the leg (' + before + ' -> ' + camp.campaign.leg + ')');
    ok(camp.planet !== planetBefore, 'the world changes between legs (' + planetBefore + ' -> ' + camp.planet + ')');
    ok(camp.players[0].deck.length >= deckBefore, 'deck carries across the world (' + deckBefore + ' -> ' + camp.players[0].deck.length + ')');
    ok(camp.players[0].gold >= goldBefore, 'gold carries across the world');
  }
  else break;
}
if (camp.phase === 'win') { ok(sawLeg, 'a winning pilgrimage passed through a leg-complete beat'); ok(camp.campaign.leg === 3, 'a winning pilgrimage reached the final world'); }
else ok(camp.phase === 'gameover', 'pilgrimage concluded: ' + camp.phase);

/* ---------- 11. temporary ward abilities (any foe, not just Torcain) ---------- */
console.log('11. Ward abilities');
// every enemy ward move points at a real affix
Object.keys(D.ENEMIES).forEach(k => (D.ENEMIES[k].moves || []).forEach(m => { if (m.intent === 'ward') ok(D.affix(m.ward), k + ' ward targets a real affix: ' + m.ward); }));
// several ordinary (non-Torcain) enemies can ward
const warders = Object.keys(D.ENEMIES).filter(k => (D.ENEMIES[k].moves || []).some(m => m.intent === 'ward'));
ok(warders.length >= 4, 'multiple ordinary foes can ward (' + warders.length + ')');
// a Thorned ward retaliates for a turn, then fades
const bw = battleWithDiff('hunter', ['e_wildpunk'], 11);
const ew = bw.enemies[0];
ew.intent = ew.moves.find(m => m.intent === 'ward' && m.ward === 'thorned');
EN.resolveEnemyTurn(bw);
ok(ew.temp && ew.temp.thorns > 0, 'enemy raised a temporary Thorned ward (' + (ew.temp && ew.temp.key) + ')');
ok(!ew.affix, 'the ward is temporary, not a permanent affix');
// attacking it while warded retaliates
const pw = bw.players[0], hpBw = pw.hp;
pw.hand = [{ id: 'strike_ular', upg: false }]; pw.energy = 3;
EN.playCard(bw, 'p1', 0, ew.uid);
ok(pw.hp < hpBw, 'temporary Thorned ward retaliates when struck (' + hpBw + ' -> ' + pw.hp + ')');
// after the enemy's next turn the ward fades
ew.intent = ew.moves.find(m => m.intent === 'attack');
EN.resolveEnemyTurn(bw);
ok(!ew.temp, 'temporary ward fades after a turn');
// Venomous ward makes the NEXT attack apply poison
const bv = battleWithDiff('hunter', ['e_makari'], 21);
const evn = bv.enemies[0];
evn.intent = evn.moves.find(m => m.intent === 'ward' && m.ward === 'venomous');
EN.resolveEnemyTurn(bv);
const pv = bv.players[0]; pv.st.poison = 0;
evn.intent = evn.moves.find(m => m.intent === 'attack');
EN.resolveEnemyTurn(bv);
ok(pv.st.poison > 0 || pv.dead, 'a Venomous-warded foe poisons on its next strike (' + pv.st.poison + ')');

/* ---------- 12. cards, world pools, relics ---------- */
console.log('12. Cards / world pools / relics');
// world cards exist and are keyed to a planet
const worldCards = Object.keys(D.CARDS).filter(id => D.CARDS[id].cls === 'world');
ok(worldCards.length >= 12, 'a set of world cards exists (' + worldCards.length + ')');
D.PLANETS.forEach(pl => ok(worldCards.some(id => D.CARDS[id].world === pl.id), pl.id + ' has world cards'));
// rewardPool mixes in world cards for the current planet, and only that planet's
const velkiCommons = D.rewardPool('tanoc', 'common', 'velki');
ok(velkiCommons.some(id => D.CARDS[id].world === 'velki'), 'reward pool on Velki includes Velki world cards');
ok(!velkiCommons.some(id => D.CARDS[id].world === 'xikia'), 'reward pool on Velki excludes other worlds');
ok(!D.rewardPool('tanoc', 'common').some(id => D.CARDS[id].cls === 'world'), 'no world tag => no world cards');
// every card is valid (effects/summons resolve); a quick play of each doesn't throw
Object.keys(D.CARDS).forEach(id => {
  const b2 = soloBattle('tanoc', ['e_grothyn_su', 'e_krabbi'], 3);
  const p2 = b2.players[0]; p2.energy = 9; p2.st.dex = 1; p2.st.str = 1;
  p2.hand = [{ id: id, upg: false }];
  const en2 = EN.aliveEnemies(b2)[0];
  let threw = false; try { EN.playCard(b2, 'p1', 0, en2 ? en2.uid : null); } catch (e) { threw = true; console.error('   card threw: ' + id + ' :: ' + e.message); }
  ok(!threw, 'card plays without error: ' + id);
});
// upgrade merge works for every upgradeable card
Object.keys(D.CARDS).forEach(id => { if (D.CARDS[id].upgrade) { const m = EN.mergedCard({ id: id, upg: true }); ok(m && m.upg, 'upgrade merges: ' + id); } });

// relics: elite/boss victory auto-collects (no click), duplicates allowed
const rr = R.create({ seed: 5, planet: 'velki', mode: 'solo', difficulty: 'hunter', players: [{ id: 'p1', name: 'T', guardianId: 'tanoc' }] });
const relBefore = rr.players[0].relics.length;
R.grantVictory(rr, { type: 'elite', id: 'f2n0' });
ok(rr.players[0].relics.length === relBefore + 1, 'elite victory auto-collects a relic (' + relBefore + ' -> ' + rr.players[0].relics.length + ')');
ok(rr.players[0].gainedRelic, 'gainedRelic is recorded for the reward screen');
// shop: can buy a relic you can afford (the reported bug), and a second one (no cap)
rr.currentNodeId = 'f3n0'; R.rollShop(rr);
const sp = rr.players[0]; sp.gold = 1000;
ok(rr.shop.relics.length >= 2, 'shop offers relics');
ok(R.buyRelic(rr, 'p1', 0) === true, 'a relic you can afford actually buys');
ok(R.buyRelic(rr, 'p1', 1) === true, 'a second relic buys too (no ownership cap)');
// treasure auto-collects
const tBefore = sp.relics.length; rr.currentNodeId = 'f4n0'; R.rollTreasure(rr);
ok(sp.relics.length > tBefore, 'treasure relic is collected automatically');
// War Drum grows strength each turn
const bd = soloBattle('tanoc', ['e_grothyn_su'], 8);
bd.players[0].hand = [{ id: 'war_drum', upg: false }]; bd.players[0].energy = 3;
EN.playCard(bd, 'p1', 0, null);
const strB = bd.players[0].st.str;
EN.endTurn(bd, 'p1');
ok(bd.players[0].dead || bd.players[0].st.str > strB, 'War Drum grows Strength on the next turn (' + strB + ' -> ' + bd.players[0].st.str + ')');

/* ---------- 13. ally buffs reach teammates in co-op ---------- */
console.log('13. Co-op ally buffs');
const bt2 = party(2, ['e_wildpunk']);
const A = EN.playerById(bt2, 'p0'), Bp = EN.playerById(bt2, 'p1');
A.hand = [{ id: 'relic_ward', upg: false }]; A.energy = 3; Bp.block = 0;
EN.playCard(bt2, 'p0', 0, null);
ok(Bp.block >= 6, 'blockAllies also shields the other Guardian in co-op (' + Bp.block + ')');
const strBefore2 = Bp.st.str;
A.hand = [{ id: 'warcall', upg: false }]; A.energy = 3;
EN.playCard(bt2, 'p0', 0, null);
ok(Bp.st.str > strBefore2, 'strAllies also strengthens the other Guardian in co-op (' + strBefore2 + ' -> ' + Bp.st.str + ')');
// solo is unchanged: no phantom teammate to buff
const bs1 = soloBattle('tanoc', ['e_krabbi'], 4);
bs1.players[0].hand = [{ id: 'relic_ward', upg: false }]; bs1.players[0].energy = 3;
ok(EN.playCard(bs1, 'p1', 0, null).ok, 'ally-buff card still plays fine in solo');

/* ---------- 14. powers stay on the field (exhaust, never redrawn) ---------- */
console.log('14. Powers exhaust like enchantments');
const bp1 = soloBattle('tanoc', ['e_krabbi'], 7);
const pp = bp1.players[0];
pp.hand = [{ id: 'war_drum', upg: false }]; pp.energy = 3;
const exhaustBefore = pp.exhaust.length, discardBefore = pp.discard.length;
EN.playCard(bp1, 'p1', 0, null);
ok(pp.exhaust.some(c => c.id === 'war_drum'), 'a Power goes to exhaust when played');
ok(!pp.discard.some(c => c.id === 'war_drum'), 'a Power does NOT go to the discard pile');
ok(!pp.draw.some(c => c.id === 'war_drum') && !pp.hand.some(c => c.id === 'war_drum'), 'a played Power can never be drawn again');
ok(pp.exhaust.length === exhaustBefore + 1 && pp.discard.length === discardBefore, 'Power lands only in exhaust');

/* ---------- 15. summon cap gates creature draws ---------- */
console.log('15. Creature draw cap (4 on the field)');
const bc = soloBattle('tanoc', ['e_krabbi'], 9);
const cp = bc.players[0];
// fill the field to the cap
for (let i = 0; i < D.TUNE.maxSummons; i++) EN.summon(bc, cp, 'call_eikar');
ok(EN.aliveAllies(bc).filter(a => a.ownerId === cp.id).length === D.TUNE.maxSummons, 'field is full at ' + D.TUNE.maxSummons + ' creatures');
// stack the draw pile with creature cards + one non-creature and draw
cp.hand = []; cp.discard = [];
cp.draw = [{ id: 'summon_eikar', upg: false }, { id: 'summon_eikar', upg: false }, { id: 'strike_ular', upg: false }];
EN._draw(bc, cp, 1);
ok(cp.hand.length === 1 && cp.hand[0].id === 'strike_ular', 'with the field full, draw skips creatures and takes a non-creature (' + (cp.hand[0] && cp.hand[0].id) + ')');
ok(cp.draw.filter(c => c.id === 'summon_eikar').length === 2, 'skipped creature cards are left in the deck');
// drop below the cap -> creatures can be drawn again
EN.aliveAllies(bc).filter(a => a.ownerId === cp.id).slice(0, 2).forEach(a => { a.hp = 0; });
cp.hand = [];
EN._draw(bc, cp, 1);
ok(cp.hand.length === 1 && cp.hand[0].id === 'summon_eikar', 'once down to 3 or fewer, creatures are drawn again');

/* ---------- done ---------- */
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
