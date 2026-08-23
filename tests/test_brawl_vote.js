/* Headless test: the multi-player Brawl pulse-settings vote.
   Every real player votes; the Dya'kukull only vote when there are fewer
   than two real players (with 2+ real people, the AI abstain). Votes combine
   deterministically (mean of the numeric dials snapped to a legal option;
   Chaos only on a strict majority) so every lockstep client agrees. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global; global.DYA = {};
for (const f of ['js/core/util.js', 'js/data/economy.js', 'js/core/matchvote.js']) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const MV = global.DYA.matchvote, EC = global.DYA.economy;

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

console.log('== BRAWL VOTE: multi-player pulse-settings vote ==');

const lo = { interval: EC.PULSE_INTERVALS[0], amount: EC.PULSE_AMOUNTS[0], mode: 'Standard' };
const hi = { interval: EC.PULSE_INTERVALS[EC.PULSE_INTERVALS.length - 1], amount: EC.PULSE_AMOUNTS[EC.PULSE_AMOUNTS.length - 1], mode: 'Standard' };

/* ---- combineMany ---- */
{
  const one = MV.combineMany([{ interval: 8, amount: 3, mode: 'Chaos' }]);
  check('a single vote reduces to itself', one.pulseInterval === 8 && one.pulseAmount === 3 && one.chaos === true, JSON.stringify(one));

  const s = MV.combineMany([lo, hi]);
  check('two votes land on a legal interval option', EC.PULSE_INTERVALS.indexOf(s.pulseInterval) >= 0, 'interval=' + s.pulseInterval);
  check('two votes land on a legal amount option', EC.PULSE_AMOUNTS.indexOf(s.pulseAmount) >= 0, 'amount=' + s.pulseAmount);

  check('empty vote list yields safe defaults', (function () { const d = MV.combineMany([]); return d.pulseInterval === 8 && d.pulseAmount === 2 && d.chaos === false; })());

  check('determinism — same votes, same settings', JSON.stringify(MV.combineMany([lo, hi, lo])) === JSON.stringify(MV.combineMany([lo, hi, lo])));
}

/* ---- Chaos only on a strict majority ---- */
{
  const C = { interval: 8, amount: 2, mode: 'Chaos' }, S = { interval: 8, amount: 2, mode: 'Standard' };
  check('Chaos loses on a tie (2 of 4)', MV.combineMany([C, C, S, S]).chaos === false);
  check('Chaos wins on a majority (3 of 4)', MV.combineMany([C, C, C, S]).chaos === true);
  check('Chaos wins when unanimous', MV.combineMany([C, C]).chaos === true);
  check('Standard when nobody asks for Chaos', MV.combineMany([S, S, S]).chaos === false);
}

/* ---- the AI abstain with 2+ real players ---- */
{
  check('1 real player → Dya’kukull DO vote', MV.shouldAIVote(1) === true);
  check('0 real players → Dya’kukull DO vote', MV.shouldAIVote(0) === true);
  check('2 real players → Dya’kukull do NOT vote', MV.shouldAIVote(2) === false);
  check('5 real players → Dya’kukull do NOT vote', MV.shouldAIVote(5) === false);
}

console.log(failures ? 'BRAWL VOTE: ' + failures + ' FAILURE(S)' : 'BRAWL VOTE: ALL PASS');
process.exit(failures ? 1 : 0);
