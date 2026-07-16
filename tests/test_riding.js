/* Functional riding: a mount (features.rider or the "mount" tag) fights with an
   Eikar rider — tougher, hits harder, shields part of every blow, and targets
   intelligently. Also checks a non-mount is unaffected. */
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

console.log('== EIKAR RIDING ==');

/* domestic_punk carries the "mount" tag → ridden */
const rng = new U.Rng(7);
function newMatch(seed) {
  const mm = new DYAG.match.Match({
    seed, mode: 'standard', terrain: 'plains',
    settings: { pulseInterval: 5, pulseAmount: 2, chaos: false },
    teams: [
      { name: 'A', controller: 'ai', pouch: [TK.mint({ speciesId: 'domestic_punk', rng, rarity: 3 })] },
      { name: 'B', controller: 'ai', pouch: [TK.mint({ speciesId: 'harkal', rng, rarity: 3 })] },
    ],
  });
  mm.headless = true;
  return mm;
}
const m = newMatch(7);
/* spawn the pair directly so the test doesn't depend on AI deploy timing */
const punk = m.spawnFromToken(TK.mint({ speciesId: 'domestic_punk', rng, rarity: 3 }), 0, 300, 300);
const harkal = m.spawnFromToken(TK.mint({ speciesId: 'harkal', rng, rarity: 3 }), 1, 900, 300);
check('a domestic_punk spawned', !!punk);
check('a harkal spawned', !!harkal);
check('the ridden punk has a rider', punk && punk.hasRider === true);
check('a non-mount (harkal) has NO rider', harkal && !harkal.hasRider);
check('rider sets a protection fraction', punk && punk.riderProtect > 0 && punk.riderProtect <= 0.5, 'protect=' + (punk && punk.riderProtect));

/* the rider shields part of every blow: same raw hit lands softer on the mount */
function damageDealt(target) {
  const before = target.hp;
  const src = { dead: false, x: target.x, y: target.y, sp: target.sp, vars: {}, quirks: {} };
  m.damage(target, 100, src, { noAnim: true });
  return before - target.hp;
}
const punkTaken = damageDealt(punk);
const harkalTaken = damageDealt(harkal);
check('the ridden mount takes reduced damage', punkTaken < 100, 'took ' + punkTaken.toFixed(1) + ' of 100');
check('the rider protection roughly matches riderProtect', punk && Math.abs(punkTaken - 100 * (1 - punk.riderProtect)) < 2.5, 'took ' + punkTaken.toFixed(1) + ' expected ~' + (100 * (1 - (punk ? punk.riderProtect : 0))).toFixed(1));

/* toggling rider OFF on the species removes all of it */
const sp = DYAG.species.get('domestic_punk');
const savedTags = sp.tags.slice();
sp.tags = sp.tags.filter(t => t !== 'mount');
delete sp.features.rider;
const m2 = newMatch(9);
const punk2 = m2.spawnFromToken(TK.mint({ speciesId: 'domestic_punk', rng, rarity: 3 }), 0, 300, 300);
check('removing the mount tag/rider feature stops riding', punk2 && !punk2.hasRider);
sp.tags = savedTags; // restore for any later tests in the suite process

console.log(failures ? ('\nRIDING: ' + failures + ' FAILURE(S)') : '\nRIDING: ALL PASS');
process.exit(failures ? 1 : 0);
