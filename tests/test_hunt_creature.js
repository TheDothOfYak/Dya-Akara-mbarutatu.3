/* Fully-authored hunt creatures: every per-enemy override the admin can set
   (exact stats, size, Naga head count via picks.headCount, behavior-tree
   override, element, individual variables) must actually take effect when the
   quarry spawns in a hunt match. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/data/abilities.js', 'js/core/token.js', 'js/core/state.js',
  'js/engine/behaviors.js', 'js/engine/match.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA, U = DYAG.util, TK = DYAG.token;

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

console.log('== HUNT CREATURE OVERRIDES ==');

const rng = new U.Rng(11);
const hunt = {
  enemies: [{
    speciesId: 'su_naga',
    boss: true,
    sizeIdx: 4,
    element: 'Eldi',
    behavior: 'harkal',                 // decision-tree override
    behaviorValue: 2500,
    stats: { hp: 1234, dmg: 77, speed: 42 },
    picks: { headCount: 5 },            // Naga heads — the thing that couldn't be set before
    vars: { aggressionThreshold: 0.9 },
  }],
};
const m = new DYAG.match.Match({
  seed: 11, mode: 'hunt', terrain: 'plains',
  settings: { pulseInterval: 5, pulseAmount: 2, chaos: false },
  hunt,
  teams: [
    { name: 'Hunter', controller: 'ai', pouch: [TK.mint({ speciesId: 'harkal', rng, rarity: 3 })] },
    { name: 'Wild', controller: 'wild', pouch: [] },
  ],
});
m.headless = true;

const naga = m.creatures.find(c => c.speciesId === 'su_naga');
check('the authored quarry spawned', !!naga);
check('exact HP override applied', naga && naga.maxHp === 1234, 'hp=' + (naga && naga.maxHp));
check('exact damage override applied', naga && naga.dmg === 77, 'dmg=' + (naga && naga.dmg));
check('exact speed override applied', naga && naga.speed === 42, 'speed=' + (naga && naga.speed));
check('size override applied', naga && naga.sizeIdx === 4, 'size=' + (naga && naga.sizeIdx));
check('NAGA HEAD COUNT set via picks.headCount', naga && naga.headCount === 5, 'heads=' + (naga && naga.headCount));
check('behavior-value override applied', naga && naga.tok.behaviorValue === 2500, 'bv=' + (naga && naga.tok && naga.tok.behaviorValue));
check('element override applied', naga && naga.tok.element === 'Eldi', 'el=' + (naga && naga.tok && naga.tok.element));
check('variable override applied', naga && Math.abs(naga.vars.aggressionThreshold - 0.9) < 1e-6, 'agg=' + (naga && naga.vars.aggressionThreshold));
check('behavior-tree override recorded', naga && naga.behaviorOverride === 'harkal', 'beh=' + (naga && naga.behaviorOverride));
check('boss did NOT double an explicit HP', naga && naga.maxHp === 1234 && naga.isBoss === true);

/* a plain enemy (no overrides) still rolls normally */
const m2 = new DYAG.match.Match({
  seed: 12, mode: 'hunt', terrain: 'plains',
  settings: { pulseInterval: 5, pulseAmount: 2, chaos: false },
  hunt: { enemies: [{ speciesId: 'lutut', boss: true }] },
  teams: [
    { name: 'Hunter', controller: 'ai', pouch: [TK.mint({ speciesId: 'harkal', rng, rarity: 3 })] },
    { name: 'Wild', controller: 'wild', pouch: [] },
  ],
});
m2.headless = true;
const lutut = m2.creatures.find(c => c.speciesId === 'lutut');
check('a plain quarry still spawns and rolls', !!lutut && lutut.maxHp > 0 && !lutut.behaviorOverride);

console.log(failures ? ('\nHUNT CREATURE: ' + failures + ' FAILURE(S)') : '\nHUNT CREATURE: ALL PASS');
process.exit(failures ? 1 : 0);
