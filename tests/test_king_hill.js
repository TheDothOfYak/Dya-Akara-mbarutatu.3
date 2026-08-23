/* Headless test: SURROUNDED — King of the Hill.
   One team holds the centre as the king and must protect its Relic for a set
   number of minutes; the ring of attackers races to steal it. The king's
   castle is pre-built (a sealing wall ring, a level-1 manned archer tower on
   each corner, and a permanently-manned Level-2 keep), and the king draws +50%
   resources a pulse. Attackers hold no relic of their own. */
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

const W = 1600, H = 1000;
/* one king at the centre (side 0), three attackers ringed around (sides 1,2,3) */
function mkKing(protect, opts) {
  opts = opts || {};
  const ring = [[W / 2, H / 2 - 300], [W / 2 - 300, H / 2 + 200], [W / 2 + 300, H / 2 + 200]];
  const teams = [
    { name: 'King', side: 0, king: true, controller: 'ai', aiSkill: 0.6, hoard: { x: W / 2, y: H / 2 }, pouch: opts.kingPouch || [] },
  ];
  ring.forEach((xy, i) => teams.push({ name: 'Atk' + i, side: i + 1, controller: 'ai', aiSkill: 0.6, hoard: { x: xy[0], y: xy[1] }, pouch: opts.atkPouch ? [fighter(i + 20)] : [] }));
  const M = new DYAG.match.Match({ seed: opts.seed || 99, mode: 'standard', terrain: 'plains',
    settings: { pulseInterval: 6, pulseAmount: 3, chaos: false }, kingHill: { protect }, teams });
  M.headless = true;
  return M;
}

console.log('== KING OF THE HILL: Surrounded castle + protect timer ==');

/* ---- castle is seeded ---- */
{
  const M = mkKing(600);
  const st = M.structures.filter(s => s.team === 0);
  const corners = st.filter(s => /castleCorner/.test(s.role));
  const keep = st.find(s => s.role === 'castleKeep');
  const walls = st.filter(s => s.type === 'wall');
  check('four corner archer towers are raised', corners.length === 4, 'corners=' + corners.length);
  check('each corner tower holds exactly one archer (capacity 1)', corners.every(s => s.capacity === 1));
  check('corner towers start at level 1 (not upgraded)', corners.every(s => !s.upgraded));
  check('a permanently-manned keep exists', !!keep && keep.permManned === 2, 'permManned=' + (keep && keep.permManned));
  check('the keep is a Level-2 structure (upgraded)', !!keep && keep.upgraded === true);
  check('the castle has a wall ring', walls.length >= 8, 'walls=' + walls.length);
  check('the wall ring completely seals the hoard', !!M.wallEnclosure(0), 'enclosure=' + JSON.stringify(M.wallEnclosure(0)));
}

/* ---- attackers hold no relic; only the king's is live ---- */
{
  const M = mkKing(600);
  const live = M.relics.filter(r => !r.disabled);
  check('only ONE relic is live — the king’s', live.length === 1 && live[0].ownerTeam === 0, 'live=' + live.length);
}

/* ---- the king draws +50% resources a pulse ---- */
{
  const M = mkKing(600);
  const king = M.teams[0], atk = M.teams[1];
  const before = { k: total(king.resources), a: total(atk.resources) };
  M.doPulse();
  const gainK = total(king.resources) - before.k, gainA = total(atk.resources) - before.a;
  check('king gains ~50% more than an attacker on a pulse', gainK >= gainA * 1.35, 'king+' + gainK + ' atk+' + gainA);
}
function total(v) { return v.Fti + v.Su + v.Eldi + v.Ular; }

/* ---- the keep fires on its own (no garrison) ---- */
{
  const M = mkKing(600);
  const keep = M.structures.find(s => s.role === 'castleKeep');
  M.spawnFromToken(fighter(3), 1, keep.x + 40, keep.y);   // an attacker right next to the keep
  let fired = false;
  for (let i = 0; i < 60 && !fired; i++) { M.doTick(); if (M.projectiles.some(p => p.team === 0)) fired = true; }
  check('the permanently-manned keep looses arrows with no garrison', fired);
}

/* ---- the king wins if the relic survives the protect timer ---- */
{
  const M = mkKing(300, { atkPouch: true });   // attackers stay in the queue so the hill is contested
  M.time = 100; M.checkEnd();
  check('before the timer, the hill is still contested (no draw)', !M.over, 'over=' + M.over + ' how=' + (M.result && M.result.how));
  M.time = 300; M.checkEnd();
  check('king wins when the protect timer elapses', M.over && M.result.winnerSide === 0 && M.result.how === 'defended',
    'over=' + M.over + ' side=' + (M.result && M.result.winnerSide) + ' how=' + (M.result && M.result.how));
}

/* ---- the king also wins if every attacker is spent ---- */
{
  const M = mkKing(600);   // attackers have empty pouches — nothing to bring
  M.checkEnd();
  check('king holds the hill once no attacker is left in play', M.over && M.result.winnerSide === 0 && M.result.how === 'defended',
    'over=' + M.over + ' side=' + (M.result && M.result.winnerSide));
}

/* ---- an attacker who captures the king's relic wins at once ---- */
{
  const M = mkKing(600);
  const kr = M.relics[0];
  kr.captured = true; kr.capturedBy = 1; kr.capturedBySide = M.sideOf(1);
  M.checkEnd();
  check('capturing the king’s relic hands an attacker the win', M.over && M.result.winnerSide === M.sideOf(1) && M.result.how === 'relic',
    'over=' + M.over + ' side=' + (M.result && M.result.winnerSide));
}

console.log(failures ? 'KING OF THE HILL: ' + failures + ' FAILURE(S)' : 'KING OF THE HILL: ALL PASS');
process.exit(failures ? 1 : 0);
