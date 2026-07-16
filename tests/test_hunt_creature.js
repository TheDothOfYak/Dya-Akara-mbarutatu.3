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

/* ---- permadeath: a fallen party token is retired and reported ---- */
console.log('  -- hunt permadeath --');
const party = TK.mint({ speciesId: 'harkal', rng, rarity: 1 });
const pm = new DYAG.match.Match({
  seed: 20, mode: 'hunt', terrain: 'plains',
  settings: { pulseInterval: 5, pulseAmount: 2, chaos: false },
  hunt: { enemies: [{ speciesId: 'lutut', boss: true }] },
  teams: [
    { name: 'Hunter', controller: 'ai', pouch: [party] },
    { name: 'Wild', controller: 'wild', pouch: [] },
  ],
});
pm.headless = true;
const pc = pm.spawnFromToken(party, 0, 300, 300);
const entry = pm.teams[0].pouch.find(e => e.tok.id === party.id);
entry.state = 'played';
pm.damage(pc, 99999, { dead: false, x: pc.x, y: pc.y, sp: pc.sp, vars: {}, quirks: {} }, { noAnim: true });
check('a fallen hunt token does NOT return to the pouch (permadeath)', entry.state === 'dead', 'state=' + entry.state);
pm.finish(1, 'test');
check('result reports the fallen player token', (pm.result.playerDeadTokIds || []).indexOf(party.id) >= 0);
check('result survivors exclude the fallen token', (pm.result.playerAliveTokIds || []).indexOf(party.id) < 0);

/* a standard (non-hunt) match still lets a downed token return to the pouch */
const sTok = TK.mint({ speciesId: 'harkal', rng, rarity: 1 });
const sm = new DYAG.match.Match({
  seed: 21, mode: 'standard', terrain: 'plains',
  settings: { pulseInterval: 5, pulseAmount: 2, chaos: false },
  teams: [
    { name: 'A', controller: 'ai', pouch: [sTok] },
    { name: 'B', controller: 'ai', pouch: [TK.mint({ speciesId: 'lutut', rng, rarity: 1 })] },
  ],
});
sm.headless = true;
const sc = sm.spawnFromToken(sTok, 0, 300, 300);
const sEntry = sm.teams[0].pouch.find(e => e.tok.id === sTok.id); sEntry.state = 'played';
sm.damage(sc, 99999, { dead: false, x: sc.x, y: sc.y, sp: sc.sp, vars: {}, quirks: {} }, { noAnim: true });
check('a downed token in a STANDARD match returns to the pouch (not permadeath)', sEntry.state === 'pouch', 'state=' + sEntry.state);

/* ---- hunt economy: free/anytime readying, pulses grant no resources ---- */
console.log('  -- hunt ready/pulse economy --');
(function () {
  const t1 = TK.mint({ speciesId: 'harkal', rng, rarity: 2 });
  const hm = new DYAG.match.Match({
    seed: 30, mode: 'hunt', terrain: 'plains',
    settings: { pulseInterval: 5, pulseAmount: 2, chaos: false },
    hunt: { enemies: [{ speciesId: 'lutut', boss: true }] },
    teams: [
      { name: 'Hunter', controller: 'ai', pouch: [t1] },
      { name: 'Wild', controller: 'wild', pouch: [] },
    ],
  });
  hm.headless = true;
  const HT = hm.teams[0];
  // strip all resources: readying must still succeed (it's free in a hunt)
  HT.resources = { Fti: 0, Su: 0, Eldi: 0, Ular: 0 };
  const before = HT.readied.length;
  hm.applyInput(0, { type: 'ready', pouchIdx: 0 });
  check('hunt readying is free (no resources needed)', HT.readied.length === before + 1, 'readied=' + HT.readied.length);
  check('hunt readying spends no resources', HT.resources.Fti + HT.resources.Su + HT.resources.Eldi + HT.resources.Ular === 0);

  // deploy in the SAME pulse it was readied — allowed in a hunt
  const readiedEntry = HT.readied[0];
  hm.applyInput(0, { type: 'trigger', slot: 0, x: 400, y: 400 });
  check('hunt lets you deploy the same pulse you readied', readiedEntry.state === 'played', 'state=' + readiedEntry.state);

  // a pulse grants NO team resources in a hunt, but still advances the index
  HT.resources = { Fti: 0, Su: 0, Eldi: 0, Ular: 0 };
  const pi0 = hm.pulseIndex;
  hm.doPulse();
  check('hunt pulse still ticks (index advances) for time-based abilities', hm.pulseIndex === pi0 + 1, 'pi=' + hm.pulseIndex);
  check('hunt pulse grants no team resources', HT.resources.Fti + HT.resources.Su + HT.resources.Eldi + HT.resources.Ular === 0);
})();

/* re-ready tax and pulse resources STILL apply in a standard match */
(function () {
  const t1 = TK.mint({ speciesId: 'harkal', rng, rarity: 1 });
  const sm2 = new DYAG.match.Match({
    seed: 31, mode: 'standard', terrain: 'plains',
    settings: { pulseInterval: 5, pulseAmount: 2, chaos: false },
    teams: [
      { name: 'A', controller: 'ai', pouch: [t1] },
      { name: 'B', controller: 'ai', pouch: [TK.mint({ speciesId: 'lutut', rng, rarity: 1 })] },
    ],
  });
  sm2.headless = true;
  const ST = sm2.teams[0];
  ST.resources = { Fti: 0, Su: 0, Eldi: 0, Ular: 0 };
  sm2.applyInput(0, { type: 'ready', pouchIdx: 0 });
  check('standard readying still requires resources (denied when broke)', ST.readied.length === 0, 'readied=' + ST.readied.length);
  const pi0 = ST.resources.Fti + ST.resources.Su + ST.resources.Eldi + ST.resources.Ular;
  sm2.doPulse();
  const pi1 = ST.resources.Fti + ST.resources.Su + ST.resources.Eldi + ST.resources.Ular;
  check('standard pulse still grants team resources', pi1 > pi0, 'gained=' + (pi1 - pi0));
})();

console.log(failures ? ('\nHUNT CREATURE: ' + failures + ' FAILURE(S)') : '\nHUNT CREATURE: ALL PASS');
process.exit(failures ? 1 : 0);
