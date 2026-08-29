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

/* ---------- done ---------- */
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
