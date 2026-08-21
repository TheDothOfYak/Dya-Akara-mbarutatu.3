/* Headless test: BRAWL — multi-token, multi-team elimination battles.
   2v2 / 3v3 / 5v5 team battles and a 4-player free-for-all. Like a duel there
   is no economy, pulse or Relic; every token takes the field at once and the
   last team standing wins. Targeting is team-relative, so the free-for-all
   needs no special casing — any other team is a foe.

   These checks assert the engine wiring: the right number of creatures spawn
   per side, relics are disabled, no pulses tick, distinct team colours/stands
   are assigned, and every brawl resolves to exactly one winning team (or a
   legal draw) rather than hanging. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global; global.DYA = {};
global.document = { createElement: () => ({ getContext: () => null, style: {} }), addEventListener: () => {} };
global.performance = { now: () => Date.now() };
for (const f of ['js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/token.js', 'js/engine/parts.js', 'js/engine/behaviors.js', 'js/engine/match.js']) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA, U = DYAG.util, TK = DYAG.token, SP = DYAG.species;

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

const FIGHTERS = SP.list.filter(sp => SP.canDuel(sp.id)).map(sp => sp.id);
function squad(n, seed) {
  const rng = new U.Rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) out.push(TK.mint({ speciesId: rng.pick(FIGHTERS), rng }));
  return out;
}

/* Build a brawl: `teamSizes` is an array — one entry per team, its token count.
   [2,2] = 2v2, [1,1,1,1] = a 4-player free-for-all. */
function makeBrawl(teamSizes, seed) {
  const teams = teamSizes.map((n, i) => ({
    name: 'T' + i, controller: 'ai', aiSkill: 0.6, pouch: squad(n, seed + i * 101),
  }));
  const M = new DYAG.match.Match({ seed, mode: 'brawl', teams });
  M.headless = true;
  return M;
}
function run(M, maxSec) {
  let n = 0; const cap = (maxSec || 400) * 20;
  while (!M.over && n < cap) { M.doTick(); n++; }
  return n;
}

console.log('== BRAWL MODES: 2v2/3v3/5v5 + 4-player free-for-all ==');

/* ---- spawn counts: every token in every side is fielded at once ---- */
[[2, 2], [3, 3], [5, 5], [1, 1, 1, 1]].forEach(sizes => {
  const M = makeBrawl(sizes, 12345);
  const label = sizes.length > 2 ? sizes.length + '-player FFA' : sizes.join('v');
  const total = sizes.reduce((a, b) => a + b, 0);
  check(label + ': all ' + total + ' fighters spawn at once', M.creatures.length === total, 'spawned=' + M.creatures.length);
  sizes.forEach((n, i) => {
    const onTeam = M.creatures.filter(c => c.team === i).length;
    check(label + ': team ' + i + ' fields ' + n, onTeam === n, 'got=' + onTeam);
  });
});

/* ---- no economy: relics disabled, no pulses ---- */
{
  const M = makeBrawl([2, 2], 777);
  check('2v2: relics are disabled (no Relic objective)', M.relics.every(r => r.disabled));
  run(M, 400);
  check('2v2: no pulse ever ticks (resource-free)', M.pulseIndex === 0, 'pulseIndex=' + M.pulseIndex);
}

/* ---- distinct team colours and separated stands ---- */
{
  const M = makeBrawl([1, 1, 1, 1], 42);
  const cols = new Set(M.teams.map(t => t.color));
  check('FFA: four distinct team colours', cols.size === 4, [...cols].join(','));
  let minGap = 1e9;
  for (let i = 0; i < M.teams.length; i++) for (let j = i + 1; j < M.teams.length; j++) {
    minGap = Math.min(minGap, U.dist(M.teams[i].hoard.x, M.teams[i].hoard.y, M.teams[j].hoard.x, M.teams[j].hoard.y));
  }
  check('FFA: teams start well apart', minGap > 300, 'minGap=' + Math.round(minGap));
}

/* ---- resolution: every brawl ends with exactly one winner (or a legal draw),
        never hangs, and the winner is a real team index ---- */
function assertResolves(sizes, seeds) {
  let wins = 0, draws = 0, hangs = 0;
  seeds.forEach(s => {
    const M = makeBrawl(sizes, s);
    const ticks = run(M, 600);
    if (!M.over) { hangs++; return; }
    if (M.result.winner === -1) { draws++; return; }
    const w = M.result.winner;
    const ok = w >= 0 && w < sizes.length;
    if (!ok) { hangs++; return; }
    /* the winning side must be the ONLY one with living creatures (or the
       condition/stalemate caller picked a still-standing team) */
    const winnerAlive = M.creatures.some(c => !c.dead && c.team === w);
    if (winnerAlive) wins++; else hangs++;
  });
  return { wins, draws, hangs };
}

const seeds = [1, 2, 3, 7, 11, 19, 23, 31];
['2v2 [2,2]', '3v3 [3,3]', 'FFA [1,1,1,1]'].forEach((lbl, idx) => {
  const sizes = [[2, 2], [3, 3], [1, 1, 1, 1]][idx];
  const r = assertResolves(sizes, seeds);
  check(lbl + ': every seed resolves cleanly (no hangs)', r.hangs === 0, JSON.stringify(r));
  check(lbl + ': produces real winners', r.wins > 0, JSON.stringify(r));
});

/* ---- a free-for-all really is every-team-for-itself: a creature will strike
        a member of ANY other team, not just "team 1" ---- */
{
  const M = makeBrawl([1, 1, 1, 1], 5);
  const api = M.api();
  const c0 = M.creatures.find(c => c.team === 0);
  /* nearestEnemy must be willing to return a foe from any rival team */
  const foundTeams = new Set();
  M.creatures.forEach(c => {
    const foe = api.nearestEnemy(c, 1e9);
    if (foe) foundTeams.add(foe.team);
  });
  check('FFA: creatures can target more than one rival team', foundTeams.size >= 2, 'targeted teams=' + [...foundTeams].join(','));
}

/* ---- concede in a free-for-all credits a surviving rival, not the player ---- */
{
  const M = makeBrawl([1, 1, 1, 1], 9);
  M.applyInput(0, { type: 'concede' });
  check('FFA: conceding ends the match', M.over);
  check('FFA: the conceding player (team 0) is NOT the winner', M.result.winner !== 0, 'winner=' + (M.result && M.result.winner));
}

console.log(failures ? 'BRAWL MODES: ' + failures + ' FAILURE(S)' : 'BRAWL MODES: ALL PASS');
process.exit(failures ? 1 : 0);
