/* Regression: relic defenders must actually HIT the thief.

   Bug: when an enemy stole your relic, the sentient Eikar/Keilia units
   (sword_unit / spear_unit via sentientCommon) and Mikolo Moko only ever
   `moveToward` the carrier — shadowing it without ever setting an attack
   intent — so the thief walked the relic home completely unopposed. The
   fix chases the carrier down and STRIKES it, forcing a drop. */
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
const DYAG = global.DYA, U = DYAG.util, TK = DYAG.token, B = DYAG.behaviors;

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

console.log('== RELIC DEFENSE: defenders strike the thief carrying our relic ==');

const rng = new U.Rng(31);
function newMatch(seed) {
  const mm = new DYAG.match.Match({
    seed, mode: 'standard', terrain: 'plains',
    settings: { pulseInterval: 5, pulseAmount: 2, chaos: false },
    teams: [
      { name: 'Us',    controller: 'ai', pouch: [TK.mint({ speciesId: 'sword_eikar', rng, rarity: 3 })] },
      { name: 'Them',  controller: 'ai', pouch: [TK.mint({ speciesId: 'harkal', rng, rarity: 3 })] },
    ],
  });
  mm.headless = true;
  return mm;
}

/* Arrange a theft of OUR (team 0) relic: an enemy creature is hauling it. */
function stageTheft(m, thief) {
  const ours = m.relics.find(r => r.ownerTeam === 0);
  ours.carrier = thief.id;
  ours.carrierTeam = thief.team;
  ours.captured = false;
  ours.x = thief.x; ours.y = thief.y;
  thief.carryingRelic = true;
  return ours;
}

/* ---------- 1) a Sword Eikar (sentientCommon) targets the thief ---------- */
{
  const m = newMatch(31);
  const api = m.api();
  const defender = m.spawnFromToken(TK.mint({ speciesId: 'sword_eikar', rng, rarity: 3 }), 0, 500, 300);
  const thief = m.spawnFromToken(TK.mint({ speciesId: 'harkal', rng, rarity: 3 }), 1, 560, 300);
  stageTheft(m, thief);

  defender.intent = {};
  B.sword_unit(defender, api);
  check('Sword Eikar sets an attack on the relic thief (not a bare move)',
    defender.intent.attackTarget === thief, 'attackTarget=' + (defender.intent.attackTarget && defender.intent.attackTarget.speciesId));
}

/* ---------- 2) Mikolo Moko runs the thief down and strikes ---------- */
{
  const m = newMatch(32);
  const api = m.api();
  const moko = m.spawnFromToken(TK.mint({ speciesId: 'mikolo_moko', rng, rarity: 3 }), 0, 500, 300);
  const thief = m.spawnFromToken(TK.mint({ speciesId: 'harkal', rng, rarity: 3 }), 1, 640, 300);
  stageTheft(m, thief);

  moko.intent = {};
  B.mikolo_moko(moko, api);
  check('Mikolo Moko sets an attack on the relic thief',
    moko.intent.attackTarget === thief, 'attackTarget=' + (moko.intent.attackTarget && moko.intent.attackTarget.speciesId));
}

/* ---------- 3) end to end: the defender runs down the thief and recovers
   the relic. The relic is only released when the carrier dies (the drop is
   part of kill()), so we hand the thief a thin sliver of health — enough to
   isolate the "defender applies lethal pressure → relic drops" path that the
   bug used to make impossible (a shadowing defender never landed a blow, so
   the carrier could never be killed and just strolled it home). ---------- */
{
  const m = newMatch(33);
  const defender = m.spawnFromToken(TK.mint({ speciesId: 'sword_eikar', rng, rarity: 4 }), 0, 500, 300);
  const thief = m.spawnFromToken(TK.mint({ speciesId: 'harkal', rng, rarity: 1 }), 1, 560, 300);
  const ours = stageTheft(m, thief);
  const startHp = thief.hp = 10;   // a sliver — a couple of clean blows ends it

  let dropped = false;
  for (let i = 0; i < 600 && !m.over; i++) {
    m.doTick();
    if (ours.carrier == null) { dropped = true; break; }
  }
  check('the thief carrying our relic takes damage from the defender', thief.hp < startHp || thief.dead,
    'thief hp ' + thief.hp.toFixed(1) + ' / ' + startHp.toFixed(1));
  check('the defender kills the thief and the relic is released', dropped && thief.dead,
    'dropped=' + dropped + ' thiefDead=' + thief.dead + ' carrier=' + ours.carrier);
}

/* ---------- 4) a stunned carrier drops the relic ---------- */
{
  const m = newMatch(34);
  const thief = m.spawnFromToken(TK.mint({ speciesId: 'harkal', rng, rarity: 3 }), 1, 700, 300);
  const ours = stageTheft(m, thief);
  thief.stunnedUntil = m.tick + 20;
  m.doTick();
  check('a stunned carrier drops the relic', ours.carrier == null && !thief.carryingRelic,
    'carrier=' + ours.carrier + ' carrying=' + thief.carryingRelic);
}

/* ---------- 5) a heavy single blow (>=45% max HP) knocks it loose ---------- */
{
  const m = newMatch(35);
  const thief = m.spawnFromToken(TK.mint({ speciesId: 'harkal', rng, rarity: 3 }), 1, 700, 300);
  const ours = stageTheft(m, thief);
  const src = m.spawnFromToken(TK.mint({ speciesId: 'sword_eikar', rng, rarity: 3 }), 0, 690, 300);
  thief.maxHp = 200; thief.hp = 200;

  // a modest hit (under 45%) must NOT drop it
  m.damage(thief, 40, src, { noAnim: true }); // 20% of maxHp
  check('a light hit does NOT drop the relic', ours.carrier === thief.id && thief.carryingRelic,
    'carrier=' + ours.carrier);

  // a heavy hit (>=45%) knocks it loose, and the carrier survives it
  const before = thief.hp;
  m.damage(thief, 150, src, { noAnim: true }); // 75% of maxHp
  check('a 45%+ single hit knocks the relic loose', ours.carrier == null && !thief.carryingRelic,
    'carrier=' + ours.carrier);
  check('the heavy-hit carrier survives the blow (not a kill-drop)', !thief.dead && thief.hp < before,
    'dead=' + thief.dead + ' hp=' + thief.hp.toFixed(1));
}

console.log(failures ? ('\nRELIC DEFENSE: ' + failures + ' FAILURE(S)') : '\nRELIC DEFENSE: ALL PASS');
process.exit(failures ? 1 : 0);
