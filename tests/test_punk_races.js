/* Punk Races (mini-games/punk-races): the course, the physics and the rival riders.
   node tests/test_punk_races.js */
'use strict';
const path = require('path');
const dir = path.join(__dirname, '..', 'mini-games', 'punk-races', 'js');
require(path.join(dir, 'pr_data.js'));
require(path.join(dir, 'pr_sim.js'));
const PR = globalThis.PR;

let pass = 0, fail = 0;
function check(name, ok, extra) { if (ok) pass++; else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }
const stats = n => ({ speed: n, grip: n, spring: n, nerve: n });

/* the same seed builds the same course */
PR.TRACKS.forEach(tr => {
  const a = PR.makeCourse(tr), b = PR.makeCourse(tr);
  check(tr.id + ': built the same every time', JSON.stringify(a.anchors) === JSON.stringify(b.anchors) && a.gaps.length === b.gaps.length);
  check(tr.id + ': has trees and branch tips', a.trees.length > 20 && a.anchors.length > a.trees.length);
  check(tr.id + ': gaps sit inside the course', a.gaps.every(g => g.x0 > 600 && g.x1 < tr.length - 300));
  check(tr.id + ': no hazard patch inside a gap', a.zones.every(z => !a.gaps.some(g => z.x1 > g.x0 && z.x0 < g.x1)));
  check(tr.id + ': every gap has a branch above it to swing from', a.gaps.every(g => a.anchors.some(an => an.x > g.x0 - 160 && an.x < g.x1 + 160)));
  check(tr.id + ': fruit hangs above the ground', a.fruit.every(f => f.y < a.surface(f.x) - 60));
});

/* every track can be finished, by riders good and poor, without getting stuck */
let bestWins = 0;
PR.TRACKS.forEach(tr => {
  const ents = [0.2, 0.5, 0.9].map((sk, i) => ({ id: 'r' + i, name: 'n' + i, skill: sk, stats: stats(3 + i * 3) }));
  const race = PR.simulate(tr, ents, 200);
  const natural = race.runners.filter(u => u.finished && u.x >= race.course.finish);
  check(tr.id + ': all three got home on their own', natural.length === 3, race.runners.map(u => Math.round(u.x) + '/' + race.course.finish).join(' '));
  check(tr.id + ': times are sane', race.runners.every(u => isFinite(u.time) && u.time > 8 && u.time < 200), race.runners.map(u => u.time.toFixed(1)).join(' '));
  check(tr.id + ': the poorest rider on the poorest Punk does not win', race.order[0].id !== 'r0', race.order.map(u => u.id).join(','));
  if (race.order[0].id === 'r2') bestWins++;
  check(tr.id + ': nothing went NaN', race.runners.every(u => isFinite(u.x) && isFinite(u.y) && isFinite(u.vx) && isFinite(u.vy)));
});

check('the best rider on the best Punk wins most tracks', bestWins >= 6, bestWins + ' of 8');

/* stats matter: over several tracks a strong Punk beats the same rider on a weak one */
let strongWins = 0;
PR.TRACKS.forEach(tr => {
  const race = PR.simulate(tr, [{ id: 'weak', skill: 0.6, stats: stats(2) }, { id: 'strong', skill: 0.6, stats: stats(9) }]);
  if (race.order[0].id === 'strong') strongWins++;
});
check('a strong Punk beats a weak one on most tracks', strongWins >= 7, strongWins + ' of 8');

/* the vine: catching, swinging, a clean release */
(function () {
  const tr = PR.track('beuhk'), c = PR.makeCourse(tr);
  const u = PR.makeRunner(c, { id: 'me', stats: stats(5) });
  let t = 0;
  for (let i = 0; i < 240; i++) PR.stepRunner(c, u, { hold: false }, t += PR.STEP);
  check('runs along the ground', u.mode === 'ground' && u.x > c.startX + 200 && u.vx > 200, u.mode + ' ' + u.x);
  const a = PR.pickAnchor(c, u);
  check('finds a branch ahead and above', a && a.x > u.x - 60 && a.y < u.y - 40);
  PR.stepRunner(c, u, { hold: true }, t += PR.STEP);
  check('holding catches it', u.mode === 'swing' && u.anchor === a);
  let maxLen = 0;
  for (let i = 0; i < 600 && u.mode === 'swing'; i++) {
    PR.stepRunner(c, u, { hold: true }, t += PR.STEP);
    if (u.mode === 'swing') maxLen = Math.max(maxLen, Math.hypot(u.x - a.x, u.y - a.y) - u.len);
  }
  check('the vine never stretches', maxLen <= 2, 'stretched ' + maxLen.toFixed(1));
  /* a release while rising forward is clean */
  const v = PR.makeRunner(c, { id: 'x', stats: stats(5) });
  v.mode = 'swing'; v.anchor = { x: 0, y: 0 }; v.len = 200; v.vx = 500; v.vy = -400; v.boost = 0;
  PR.release(v);
  check('a release rising forward is clean and fills the boost', v.clean === 1 && v.boost > 0.1 && v.mode === 'air');
  const w = PR.makeRunner(c, { id: 'y', stats: stats(5) });
  w.mode = 'swing'; w.anchor = { x: 0, y: 0 }; w.len = 200; w.vx = 500; w.vy = 300; w.boost = 0;
  PR.release(w);
  check('a release falling is not', w.clean === 0 && w.boost === 0);
})();

/* falling into a chasm costs a climb, then you go on from the far side */
(function () {
  const tr = PR.track('spires'), c = PR.makeCourse(tr);
  const g = c.gaps.find(x => x.kind === 'chasm');
  const u = PR.makeRunner(c, { id: 'me', stats: stats(5) });
  u.x = (g.x0 + g.x1) / 2; u.y = c.surface(g.x0) + 100; u.mode = 'air'; u.vx = 0; u.vy = 300;
  let t = 0;
  for (let i = 0; i < 120; i++) PR.stepRunner(c, u, { hold: false }, t += PR.STEP);
  check('a fall into a chasm counts', u.falls === 1);
  check('…and comes out past the far edge', u.x > g.x1);
})();

/* money: odds, foals, pairing */
const odds = PR.odds([10, 20, 30, 40]);
check('better Punks get shorter odds', odds[0] > odds[1] && odds[1] > odds[2] && odds[2] > odds[3], odds.join(' '));
check('odds are never under 1.2', odds.every(o => o >= 1.2));
const r = PR.rng(42);
for (let i = 0; i < 50; i++) {
  const p = PR.newPunk(r, { grade: i % 3 });
  if (!(PR.statTotal(p) <= p.pot && Object.values(p.stats).every(s => s >= 1 && s <= 10))) { check('a foal is within its potential', false, JSON.stringify(p)); break; }
}
check('foals are within their potential', true);
const kid = PR.pair(r, PR.newPunk(r, { grade: 2 }), PR.newPunk(r, { grade: 2 }));
check('a paired foal starts young', Object.values(kid.stats).every(s => s >= 1 && s <= 6) && kid.parents.length === 2);
check('training stops at potential', (() => { const p = PR.newPunk(r); p.pot = PR.statTotal(p); return !PR.canTrain(p, 'speed'); })());

console.log('Punk Races: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
