/* Headless smoke test for the Dya'Akara match engine */
const fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '..');

global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/token.js', 'js/core/state.js',
  'js/engine/behaviors.js', 'js/engine/match.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message, e.stack.split('\n')[1]); process.exit(1); }
}
console.log('All files loaded OK');
const DYAG = global.DYA;

/* mint a pouch for each side */
function mkPouch(rng, n) {
  const ids = DYAG.species.craftable;
  const pouch = [];
  for (let i = 0; i < n; i++) {
    pouch.push(DYAG.token.mint({ speciesId: ids[Math.floor(rng.next() * ids.length)], rng }));
  }
  return pouch;
}
const rng = new DYAG.util.Rng(42);
const pouchA = mkPouch(rng, 25), pouchB = mkPouch(rng, 25);

/* --- determinism test: run the same match twice --- */
function runMatch(seed, maxSec) {
  const m = new DYAG.match.Match({
    seed, mode: 'standard', terrain: 'forest',
    settings: { pulseInterval: 5, pulseAmount: 3, chaos: false },
    teams: [
      { name: 'A', controller: 'ai', aiSkill: 0.9, pouch: JSON.parse(JSON.stringify(pouchA)) },
      { name: 'B', controller: 'ai', aiSkill: 0.9, pouch: JSON.parse(JSON.stringify(pouchB)) },
    ],
  });
  m.headless = true;
  let ticks = 0;
  while (!m.over && ticks < maxSec * 20) { m.doTick(); ticks++; }
  return m;
}
console.log('Running AI vs AI match (seed 777)...');
const t0 = Date.now();
const m1 = runMatch(777, 1200);
console.log('  finished in', Date.now() - t0, 'ms real;', m1.time.toFixed(1), 's sim; over=', m1.over, 'result=', JSON.stringify(m1.result && { winner: m1.result.winner, how: m1.result.how }));
console.log('  creatures spawned:', m1.idCounter - 1, ' log inputs:', m1.log.length);
console.log('  team stats:', m1.teams.map(T => ({ played: T.stats.tokensPlayed.length, elim: T.stats.eliminations, res: Math.round(T.resources) })));

const m2 = runMatch(777, 1200);
const same = m1.tick === m2.tick && JSON.stringify(m1.result) === JSON.stringify(m2.result) && m1.log.length === m2.log.length;
console.log('Determinism check (same seed):', same ? 'PASS' : 'FAIL', m1.tick, 'vs', m2.tick);

/* --- replay test --- */
if (m1.over) {
  const rep = m1.serializeReplay();
  const mr = DYAG.match.Match.fromReplay(JSON.parse(JSON.stringify(rep)));
  mr.headless = true;
  let ticks = 0;
  while (!mr.over && ticks < 1200 * 20) { mr.doTick(); ticks++; }
  const repOk = mr.over && mr.result.winner === m1.result.winner && Math.abs(mr.time - m1.time) < 1;
  console.log('Replay determinism:', repOk ? 'PASS' : 'FAIL', 'replay result:', JSON.stringify(mr.result && { winner: mr.result.winner, how: mr.result.how, t: mr.time.toFixed(1) }), 'vs original t=', m1.time.toFixed(1));
}

/* --- duel test --- */
const d = new DYAG.match.Match({
  seed: 99, mode: 'duel',
  teams: [
    { name: 'A', controller: 'ai', pouch: [DYAG.token.mint({ speciesId: 'harkal', rng })] },
    { name: 'B', controller: 'ai', pouch: [DYAG.token.mint({ speciesId: 'raf_krabbi', rng })] },
  ],
});
d.headless = true;
let dt2 = 0;
while (!d.over && dt2 < 600 * 20) { d.doTick(); dt2++; }
console.log('Duel:', d.over ? 'finished' : 'TIMEOUT', JSON.stringify(d.result && { winner: d.result.winner, how: d.result.how, t: d.time.toFixed(1) }));

/* --- hunt test --- */
const huntPouch = mkPouch(rng, 10);
const h = new DYAG.match.Match({
  seed: 5, mode: 'hunt', terrain: 'forest',
  settings: { pulseInterval: 5, pulseAmount: 3 },
  teams: [
    { name: 'Hunter', controller: 'ai', aiSkill: 1, pouch: huntPouch, startResources: 10 },
    { name: 'Wild', controller: 'wild', pouch: [] },
  ],
  hunt: { enemies: [{ speciesId: 'sru_vorn', boss: true }, { speciesId: 'kofi' }, { speciesId: 'kofi' }] },
});
h.headless = true;
let ht = 0;
while (!h.over && ht < 900 * 20) { h.doTick(); ht++; }
console.log('Hunt:', h.over ? 'finished' : 'TIMEOUT', JSON.stringify(h.result && { winner: h.result.winner, how: h.result.how, t: h.time.toFixed(1) }));

/* --- token/economy sanity --- */
const tok = DYAG.token.mint({ speciesId: 'su_naga', rng });
const card = DYAG.token.descriptionCard(tok);
console.log('Sample token:', tok.name, '| rarity', DYAG.species.RARITIES[tok.rarity], '| heads', tok.picks.headCount, '| behaviorValue', tok.behaviorValue);
console.log('XP lv1→2:', DYAG.economy.xpForLevel(1), 'lv10:', DYAG.economy.xpForLevel(10), 'lv50:', DYAG.economy.xpForLevel(50), 'lv51:', DYAG.economy.xpForLevel(51));
const chest = DYAG.economy.levelChest(10, new DYAG.util.Rng(1));
console.log('Level 10 chest:', JSON.stringify(chest));
console.log('DONE');
