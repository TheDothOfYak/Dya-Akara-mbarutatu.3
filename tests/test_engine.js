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
const m1 = runMatch(777, 2000); /* tanky pouch draws can grind ~25 min before the relic lands */
console.log('  finished in', Date.now() - t0, 'ms real;', m1.time.toFixed(1), 's sim; over=', m1.over, 'result=', JSON.stringify(m1.result && { winner: m1.result.winner, how: m1.result.how }));
console.log('  creatures spawned:', m1.idCounter - 1, ' log inputs:', m1.log.length);
console.log('  team stats:', m1.teams.map(T => ({ played: T.stats.tokensPlayed.length, elim: T.stats.eliminations, res: Math.round(T.resources.Fti + T.resources.Su + T.resources.Eldi + T.resources.Ular) })));

const m2 = runMatch(777, 2000);
const same = m1.tick === m2.tick && JSON.stringify(m1.result) === JSON.stringify(m2.result) && m1.log.length === m2.log.length;
console.log('Determinism check (same seed):', same ? 'PASS' : 'FAIL', m1.tick, 'vs', m2.tick);

/* --- replay test --- */
if (m1.over) {
  const rep = m1.serializeReplay();
  const mr = DYAG.match.Match.fromReplay(JSON.parse(JSON.stringify(rep)));
  mr.headless = true;
  let ticks = 0;
  while (!mr.over && ticks < 2000 * 20) { mr.doTick(); ticks++; }
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

/* --- duel rules (July fixes) --- */
/* 1. canDuel: non-fighters are never duel-legal for random/AI selection */
const nonFighters = ['albali_fruit', 'sprengju_shaving', 'ju_field', 'rubbermcfly', 'mikolo_moko', 'kofi', 'karnen', 'stonefruit', 'ember_root'];
const fighters = ['harkal', 'raf_krabbi', 'tyndael', 'sword_eikar', 'gynge', 'su_naga'];
const cdBad = nonFighters.filter(id => DYAG.species.canDuel(id));
const cdGood = fighters.filter(id => !DYAG.species.canDuel(id));
console.log('canDuel filter:', (!cdBad.length && !cdGood.length) ? 'PASS' : 'FAIL', cdBad.length ? 'non-fighters passed: ' + cdBad : '', cdGood.length ? 'fighters rejected: ' + cdGood : '');

/* 2. a fighter-vs-fighter duel never draws (winner is 0 or 1) */
let duelDraws = 0, duelRuns = 0;
for (let s = 1; s <= 8; s++) {
  const dd = new DYAG.match.Match({
    seed: s * 1013, mode: 'duel',
    teams: [
      { name: 'A', controller: 'ai', pouch: [DYAG.token.mint({ speciesId: fighters[s % fighters.length], rng })] },
      { name: 'B', controller: 'ai', pouch: [DYAG.token.mint({ speciesId: fighters[(s + 3) % fighters.length], rng })] },
    ],
  });
  dd.headless = true;
  let n = 0;
  while (!dd.over && n < 600 * 20) { dd.doTick(); n++; }
  if (dd.over) { duelRuns++; if (dd.result.winner === -1) duelDraws++; }
}
console.log('No-McFly duels never draw:', (duelRuns === 8 && duelDraws === 0) ? 'PASS' : 'FAIL', '(' + duelRuns + '/8 finished, ' + duelDraws + ' draws)');

/* 3. RubberMcFly duel: the fighter kills the McFly, the ShurgrEdan answers → the one legal draw */
const md = new DYAG.match.Match({
  seed: 4242, mode: 'duel',
  teams: [
    { name: 'A', controller: 'ai', pouch: [DYAG.token.mint({ speciesId: 'rubbermcfly', rng })] },
    { name: 'B', controller: 'ai', pouch: [DYAG.token.mint({ speciesId: 'harkal', rng })] },
  ],
});
md.headless = true;
let mn = 0;
while (!md.over && mn < 600 * 20) { md.doTick(); mn++; }
console.log('McFly duel → draw:', (md.over && md.result.winner === -1 && md.result.how === 'draw') ? 'PASS' : 'FAIL', JSON.stringify(md.result && { winner: md.result.winner, how: md.result.how, t: md.time.toFixed(1) }));

/* 4. non-fighter standoff (Pick-mode fruit vs fruit): the Guild calls it — a winner, not a draw */
const sd = new DYAG.match.Match({
  seed: 777, mode: 'duel',
  teams: [
    { name: 'A', controller: 'ai', pouch: [DYAG.token.mint({ speciesId: 'stonefruit', rng })] },
    { name: 'B', controller: 'ai', pouch: [DYAG.token.mint({ speciesId: 'ember_root', rng })] },
  ],
});
sd.headless = true;
let sn = 0;
while (!sd.over && sn < 600 * 20) { sd.doTick(); sn++; }
console.log('Fruit standoff resolves:', (sd.over && sd.result.winner !== -1) ? 'PASS' : 'FAIL', JSON.stringify(sd.result && { winner: sd.result.winner, how: sd.result.how, t: sd.time.toFixed(1) }));

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
