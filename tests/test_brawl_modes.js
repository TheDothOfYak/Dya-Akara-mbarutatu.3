/* Headless test: BRAWL — multi-player STANDARD matches with alliances.
   A Brawl is an ordinary standard match (resources, pulses, Relics, deploy)
   but with more than two players, each their own team/hoard/Relic, grouped
   into sides. Team battles (2v2/3v3/5v5) ally teams onto two sides; a
   free-for-all gives every team its own side; a surrounded match puts one
   team in the centre ringed by rivals.

   These checks assert the alliance layer the engine grew for it:
   allied/hostile helpers, side-aware targeting (allies never fight or
   friendly-fire), Relics staying live in multi-team play, a side-based win
   (relic-capture credited to the carrying side, or last-side-standing), and
   concede handing the win to a rival side — while two-team standard is
   untouched. */
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
function fighter(seed) { return TK.mint({ speciesId: FIGHTERS[seed % FIGHTERS.length], rng: new U.Rng(seed) }); }
function pouch(n, seed) { const o = []; for (let i = 0; i < n; i++) o.push(fighter(seed + i * 7)); return o; }

/* build a standard match: sides[i] is team i's alliance id. */
function mk(sides, opts) {
  opts = opts || {};
  const teams = sides.map((s, i) => ({
    name: 'T' + i, side: s, controller: 'ai', aiSkill: 0.7,
    pouch: opts.pouchN ? pouch(opts.pouchN, 100 + i * 50) : [],
    startResources: opts.startRes || 0,
  }));
  const M = new DYAG.match.Match({ seed: opts.seed || 4242, mode: 'standard',
    settings: { pulseInterval: 6, pulseAmount: 3, chaos: false }, teams });
  M.headless = true;
  return M;
}

console.log('== BRAWL MODES: multi-player standard matches with alliances ==');

/* ---- alliance helpers: 2v2 is sides [0,0,1,1] ---- */
{
  const M = mk([0, 0, 1, 1]);
  check('allied(0,1) — same side are allies', M.allied(0, 1) === true);
  check('hostile(0,2) — different sides are foes', M.hostile(0, 2) === true);
  check('allied(0,0) — a team is allied with itself', M.allied(0, 0) === true);
  check('hostile(0,1) is false for allies', M.hostile(0, 1) === false);
  check('a two-team match still defaults side to team index', (function () {
    const M2 = mk([undefined, undefined].map((_, i) => i));   // sides 0,1
    return M2.hostile(0, 1) && !M2.allied(0, 1);
  })());
}

/* ---- side-aware targeting: an ally is never an enemy, a rival always is ---- */
{
  const M = mk([0, 0, 1, 1]);
  const api = M.api();
  const me = M.spawnFromToken(fighter(1), 0, 700, 500);
  const ally = M.spawnFromToken(fighter(2), 1, 760, 500);   // team 1, same side 0
  const foe = M.spawnFromToken(fighter(3), 2, 820, 500);    // team 2, side 1
  check('creature carries its team\'s side', me.side === 0 && ally.side === 0 && foe.side === 1, me.side + '/' + ally.side + '/' + foe.side);
  const near = api.nearestEnemy(me, 1e9);
  check('nearestEnemy skips the ally, targets the rival', near && near === foe, near ? ('team ' + near.team) : 'none');
  check('enemiesNear excludes allies', api.enemiesNear(me, 1e9).every(o => o.side !== me.side));
  check('alliesNear includes the ally, not the foe', (function () {
    const a = api.alliesNear(me, 1e9);
    return a.indexOf(ally) >= 0 && a.indexOf(foe) < 0;
  })());
}

/* ---- allies do not friendly-fire (projectiles + AoE) ---- */
{
  const M = mk([0, 0, 1, 1]);
  const me = M.spawnFromToken(fighter(1), 0, 700, 500);
  const ally = M.spawnFromToken(fighter(2), 1, 720, 500);
  const hp0 = ally.hp;
  /* a projectile from my team passing over an ally must not hit it */
  M.projectiles.push({ x: 720, y: 500, vx: 0, vy: 0, life: 0.2, team: 0, dmg: 999, type: 'arrow', source: me });
  M.stepProjectiles();
  check('an allied projectile does not harm an ally', ally.hp === hp0, 'hp ' + hp0 + '→' + ally.hp);
  /* but a rival projectile DOES harm — a lone team-2 (side 1) target here */
  const foe = M.spawnFromToken(fighter(3), 2, 300, 500);
  const fhp = foe.hp;
  M.projectiles.push({ x: 300, y: 500, vx: 0, vy: 0, life: 0.2, team: 0, dmg: 5, type: 'arrow', source: me });
  M.stepProjectiles();
  check('a rival projectile does harm', foe.hp < fhp, 'hp ' + fhp + '→' + foe.hp);
}

/* ---- Relics stay LIVE in a multi-team standard match ---- */
{
  const M = mk([0, 0, 1, 1]);
  check('every team keeps a live Relic (economy intact)', M.relics.length === 4 && M.relics.every(r => !r.disabled));
  const api = M.api();
  const me = M.spawnFromToken(fighter(1), 0, 700, 500);
  /* the relic a team-0 creature can steal is a HOSTILE side's, never an ally's */
  const target = api.relic(0);
  check('relic() targets a hostile side, never an ally\'s', M.hostile(0, target.ownerTeam), 'owner team ' + target.ownerTeam);
}

/* ---- win is SIDE-based: a captured relic wins for the carrying side ---- */
{
  const M = mk([0, 0, 1, 1]);
  /* team 1 (side 0) carries team 2's relic (side 1) home */
  const rl = M.relics.find(r => r.ownerTeam === 2);
  rl.captured = true; rl.capturedBy = 1;
  M.checkEnd();
  check('capturing a rival Relic ends the match', M.over);
  check('the win is credited to the capturing SIDE (0), not just the team', M.result.winnerSide === 0, 'winnerSide=' + (M.result && M.result.winnerSide));
}

/* ---- elimination: last side standing wins a multi-team match ---- */
{
  const M = mk([0, 0, 1, 1]);
  /* only side 0 has anything left (teams 0,1 have a creature; teams 2,3 empty) */
  M.spawnFromToken(fighter(1), 0, 700, 500);
  M.spawnFromToken(fighter(2), 1, 760, 500);
  M.checkEnd();
  check('a side with the field to itself wins by elimination', M.over && M.result.winnerSide === 0, 'over=' + M.over + ' side=' + (M.result && M.result.winnerSide));
}

/* ---- concede: the whole conceding side forfeits to a rival side ---- */
{
  const M = mk([0, 0, 1, 1]);
  M.spawnFromToken(fighter(3), 2, 820, 500);   // a surviving rival
  M.applyInput(0, { type: 'concede' });
  check('conceding ends the match', M.over);
  check('the conceding side (0) does not win the concede', M.result.winnerSide !== 0, 'winnerSide=' + (M.result && M.result.winnerSide));
}

/* ---- full matches resolve for every shape, without hanging ---- */
function resolves(sides, seeds) {
  let ok = 0, hang = 0;
  seeds.forEach(s => {
    const M = mk(sides, { pouchN: 4, startRes: 6, seed: s });
    let n = 0; const cap = 700 * 20;
    while (!M.over && n < cap) { M.doTick(); n++; }
    if (M.over && M.result && (M.result.winner === -1 || M.result.winnerSide >= 0)) ok++; else hang++;
  });
  return { ok, hang };
}
const seeds = [1, 2, 3, 5, 8];
[['2v2 [0,0,1,1]', [0, 0, 1, 1]],
 ['FFA [0,1,2,3]', [0, 1, 2, 3]],
 ['surrounded [0,1,2,3,4]', [0, 1, 2, 3, 4]]].forEach(([lbl, sides]) => {
  const r = resolves(sides, seeds);
  check(lbl + ': every seed resolves (no hang)', r.hang === 0, JSON.stringify(r));
});

/* ---- a plain 1v1 standard match is unchanged (relic-or-draw, no elimination win) ---- */
{
  const M = mk([0, 1]);
  M.spawnFromToken(fighter(1), 0, 700, 500);   // only team 0 on the field, pouches empty
  M.checkEnd();
  check('1v1: an empty-pouch opponent does NOT hand a bare elimination win', !M.over, 'over=' + M.over);
}

console.log(failures ? 'BRAWL MODES: ' + failures + ' FAILURE(S)' : 'BRAWL MODES: ALL PASS');
process.exit(failures ? 1 : 0);
