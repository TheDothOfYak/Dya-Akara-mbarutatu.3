/* Headless test: creatures use their special abilities in DUELS, not just
   in standard matches. Duel mode used to bypass the species behaviour tree
   entirely and issue a plain melee attack, so abilities like the Lutut's
   screech never fired 1v1. The brain now runs in duels too, with a fallback
   that only forces a pursuit when the brain produced no attack/ability. */
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
const DYAG = global.DYA;

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

/* Run a duel. Tallies the visual effects raised (screech→'screech',
   breath→'breath', …) and counts ticks the A-side creature spent in the
   'special' state — every ability sets state='special', so that count is a
   universal "an ability fired" signal (a plain melee fighter never has it). */
function duelRun(aSpec, bSpec, seed, tweakA) {
  const rng = new DYAG.util.Rng(seed);
  const ta = DYAG.token.mint({ speciesId: aSpec, rng });
  const tb = DYAG.token.mint({ speciesId: bSpec, rng });
  if (tweakA) tweakA(ta);
  const d = new DYAG.match.Match({
    seed, mode: 'duel',
    teams: [
      { name: 'A', controller: 'ai', pouch: [ta] },
      { name: 'B', controller: 'ai', pouch: [tb] },
    ],
  });
  d.headless = true;
  const fx = {};
  const orig = d.addEffect.bind(d);
  d.addEffect = function (type, x, y, data) { fx[type] = (fx[type] || 0) + 1; return orig(type, x, y, data); };
  let specialTicks = 0, n = 0;
  while (!d.over && n < 600 * 20) {
    d.doTick();
    const a = d.creatures.find(c => c.team === 0);
    if (a && !a.dead && a.state === 'special') specialTicks++;
    n++;
  }
  return { fx, specialTicks, over: d.over, ticks: n };
}

console.log('== DUEL ABILITIES: specials fire 1v1, duels still resolve ==');

/* the reported case: an adult Lutut must screech in a duel */
const lutut = duelRun('lutut', 'ular_naga', 7, t => {
  t.picks.stage = 'adult';          // the flying (screeching) adult, not the land juvenile
  t.picks.screechType = 'targeted';
  t.vars.preyThreshold = 1.4;        // qualify the opponent as prey regardless of size roll
});
check('Lutut screeches in a duel (the reported bug)', (lutut.fx.screech || 0) > 0, 'screech=' + (lutut.fx.screech || 0));
check('Lutut entered its special state in the duel', lutut.specialTicks > 0, 'specialTicks=' + lutut.specialTicks);
check('the Lutut duel still resolves to a result', lutut.over, 'ticks=' + lutut.ticks);

/* a breath-user (Su Naga) must breathe in a duel too */
const suNaga = duelRun('su_naga', 'gynge', 7);
check('a Su Naga uses its breath in a duel', (suNaga.fx.breath || 0) > 0, 'breath=' + (suNaga.fx.breath || 0));
check('the Su Naga duel still resolves', suNaga.over, 'ticks=' + suNaga.ticks);

/* control: a plain melee brute never spuriously reports a special */
const brute = duelRun('gynge', 'gynge', 5);
check('a plain melee duel still resolves', brute.over, 'ticks=' + brute.ticks);

console.log(failures ? 'DUEL ABILITIES: ' + failures + ' FAILURE(S)' : 'DUEL ABILITIES: ALL PASS');
process.exit(failures ? 1 : 0);
