// © 2026 Isaac Flake. All Rights Reserved.
/* Lútut Rider (mini-games/lutut-rider): the land, flight, landings, the tail, hunting and pay.
   node tests/test_lutut_rider.js */
'use strict';
const path = require('path');
const dir = path.join(__dirname, '..', 'mini-games', 'lutut-rider', 'js');
require(path.join(dir, 'lr_data.js'));
require(path.join(dir, 'lr_sim.js'));
const LR = globalThis.LR;

let pass = 0, fail = 0;
function check(name, ok, extra) { if (ok) pass++; else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }
const ride = (o, pilot, maxT) => {
  const run = LR.makeRun(o);
  while (!(run.over && run.overT > 1) && run.t < (maxT || 300)) LR.step(run, pilot ? pilot(run) : LR.autopilot(run));
  return run;
};
/* a run hung in the air over flat-enough land, for testing one landing */
function drop(o) {
  const run = LR.makeRun({ stage: 'downs', kind: o.kind || 'adult', up: o.up });
  const x = o.x || 400, gh = run.land.h(x), sl = run.land.slope(x);
  Object.assign(run, { x, y: gh + run.r + (o.h || 0.3) + 0.05, vx: o.vx || 0, vy: o.vy || 0, ang: sl + (o.diff || 0), av: 0, grounded: false, air: 2 });
  for (let i = 0; i < 40 && !run.grounded && !run.over; i++) LR.step(run, {});
  return run;
}
/* find a stretch of gentle land with nothing on it */
const calm = (() => {
  const land = LR.makeLand('downs');
  for (let x = 300; x < 3000; x += 7) {
    const sg = land.seg(Math.floor(x / LR.SEG));
    const busy = sg.rocks.concat(sg.trees).some(o => Math.abs(o.x - x) < 14) || sg.prey.some(p => Math.abs(p.x - x) < 14);
    if (!busy && Math.abs(land.slope(x)) < 0.12 && Math.abs(land.slope(x - 6)) < 0.15 && Math.abs(land.slope(x + 6)) < 0.15) return x;
  }
  return 400;
})();

/* ---------- the numbers ---------- */
check('every kind has stats', LR.KIND_ORDER.every(k => LR.stats(k).gullet > 0 && LR.stats(k).cracks >= 2));
check('the young Lútut is free, the others cost', LR.KINDS.young.cost === 0 && LR.KINDS.adult.cost > 0 && LR.KINDS.old.cost > LR.KINDS.adult.cost);
check('upgrades cost more each level', LR.upgCost('young', 3) > LR.upgCost('young', 2) && LR.upgCost('old', 0) > LR.upgCost('young', 0));
check('a full gullet upgrade holds more meat', LR.stats('young', { gullet: 10 }).gullet > LR.stats('young').gullet);
check('the tail upgrade adds cracks at 3, 6 and 9', LR.stats('adult', { tail: 9 }).cracks === LR.stats('adult').cracks + 3 && LR.stats('adult', { tail: 2 }).cracks === LR.stats('adult').cracks);
check('the saddle lets the rider take harder landings', LR.stats('adult', { saddle: 5 }).hardHit > LR.stats('adult').hardHit);
check('the old Lútut breaks stones at a lower speed', LR.stats('old').smashV < LR.stats('young').smashV);
check('the first region is open, the rest cost more and more', LR.STAGES[0].cost === 0 && LR.STAGES.every((s, i) => i === 0 || s.cost > LR.STAGES[i - 1].cost));
check('the Lútut hunts meat only', Object.keys(LR.PREY).every(k => LR.PREY[k].food > 0) && !Object.keys(LR.PREY).some(k => /berr|fruit|seed|leaf/i.test(k + LR.PREY[k].name)));
check('teeth are worth more further out', LR.toothValue(100) < LR.toothValue(1000) && LR.toothValue(1000) < LR.toothValue(5000));
check('the seeded random repeats', LR.rng(5)() === LR.rng(5)());

/* ---------- the land ---------- */
LR.STAGES.forEach(S => {
  const a = LR.makeLand(S.id), b = LR.makeLand(S.id);
  let same = true, finite = true;
  for (let x = -20; x < 3000; x += 3.7) { const h = a.h(x); if (h !== b.h(x)) same = false; if (!isFinite(h)) finite = false; }
  check(S.name + ': the land is the same every time', same);
  check(S.name + ': the land has no holes', finite);
  check(S.name + ': you start on the flat roost ledge', a.h(0) === a.H0 && a.h(LR.START_FLAT - 1) === a.H0 && a.h(LR.START_FLAT + 60) < a.H0);
  const segs = a.segsIn(0, 3000);
  check(S.name + ': there is prey to hunt', segs.reduce((n, s) => n + s.prey.length, 0) > 10);
  check(S.name + ': there are teeth to pick up', segs.reduce((n, s) => n + s.teeth.length, 0) > 30);
  check(S.name + ': nothing stands in a chasm or a pool', segs.every(s => !s.cut || s.rocks.concat(s.trees).every(o => o.x < s.cut.a - 3 || o.x > s.cut.b + 3)));
});
{
  const can = LR.makeLand('canyon').segsIn(0, 3000), mar = LR.makeLand('marsh').segsIn(0, 3000), down = LR.makeLand('downs').segsIn(0, 3000);
  check('the canyons have chasms', can.some(s => s.cut && s.cut.kind === 'chasm'));
  check('the marsh has pools', mar.some(s => s.cut && s.cut.kind === 'pool'));
  check('the downs have neither', down.every(s => !s.cut));
  check('only the ridge has wind', LR.makeLand('ridge').wind(500, 30) !== 0 && LR.makeLand('downs').wind(500, 30) === 0);
}

/* ---------- flying ---------- */
{
  const run = LR.makeRun({ stage: 'downs', kind: 'adult' });
  for (let i = 0; i < 120; i++) LR.step(run, {});
  check('a Lútut left alone stays on the ledge', run.grounded && Math.abs(run.x) < 0.5 && !run.over);
  const full = run.hunger;
  for (let i = 0; i < 300; i++) LR.step(run, { beat: true });
  check('beating runs it along and takes it off', run.x > 20 && !run.over, 'x ' + run.x.toFixed(1));
  check('beating costs meat', run.hunger < full - 10);
}
{
  const a = LR.makeRun({ stage: 'downs' }), b = LR.makeRun({ stage: 'downs' });
  for (let i = 0; i < 900; i++) { LR.step(a, LR.autopilot(a)); LR.step(b, LR.autopilot(b)); }
  check('the same inputs give the same ride', a.x === b.x && a.y === b.y && a.hunger === b.hunger);
}
{
  /* a glide from high up, wings out, against a dive with the wings tucked */
  const set = run => Object.assign(run, { x: 600, y: run.land.h(600) + 60, vx: 16, vy: 0, ang: 0.05, grounded: false, air: 1 });
  const g = set(LR.makeRun({ stage: 'downs', kind: 'adult' })), d = set(LR.makeRun({ stage: 'downs', kind: 'adult' }));
  for (let i = 0; i < 90; i++) { LR.step(g, {}); LR.step(d, { tuck: true }); }
  check('tucking dives: it drops faster than a glide', d.y < g.y - 5, 'glide ' + g.y.toFixed(1) + ' dive ' + d.y.toFixed(1));
  check('tucking picks up speed', Math.hypot(d.vx, d.vy) > Math.hypot(g.vx, g.vy));
  check('a glide holds the air for a while', g.y > g.land.h(g.x) + g.r + 30);
}
{
  const run = LR.makeRun({ stage: 'downs', kind: 'young' });
  Object.assign(run, { x: 600, y: run.land.h(600) + 40, vx: 16, vy: 0, ang: 0, grounded: false, air: 1, hunger: 0 });
  const y0 = run.y;
  for (let i = 0; i < 60; i++) LR.step(run, { beat: true });
  check('with an empty gullet it cannot beat', !run.beating && run.y < y0);
}
{
  const run = LR.makeRun({ stage: 'downs', kind: 'adult' });
  Object.assign(run, { x: 600, y: run.land.h(600) + 40, vx: 6, vy: 0, ang: 0.3, grounded: false, air: 1 });
  for (let i = 0; i < 60; i++) LR.step(run, { beat: true });
  const slowClimb = run.vy;
  check('beating while slow stalls it rather than climbing for ever', slowClimb < 8, 'vy ' + slowClimb.toFixed(1));
}

/* ---------- landings ---------- */
{
  const r = drop({ x: calm, vx: 12, vy: -2 });
  check('a soft level landing keeps the rider and the tail', r.grounded && !r.over && r.cracks === 0, r.over || '');
  check('a soft landing after a long flight counts as clean', r.tally.clean === 1 && r.teeth > 0);
}
{
  const r = drop({ x: calm, vx: 6, vy: -30 });
  check('landing far too hard throws the rider', r.over === 'thrown' && !!r.rider);
}
{
  const r = drop({ x: calm, vx: 8, vy: -3, diff: Math.PI });
  check('landing on its back throws the rider', r.over === 'thrown');
}
{
  const st = LR.stats('adult');
  const r = drop({ x: calm, vx: 8, vy: -(st.tailHit * 0.9), diff: 0.5, h: 0.05 });
  check('landing nose-up cracks the tail', r.cracks >= 1 && r.over !== 'thrown', 'cracks ' + r.cracks + ' ' + r.over);
  const n = drop({ x: calm, vx: 8, vy: -(st.tailHit * 0.9), diff: -0.4, h: 0.05 });
  check('the same knock head first does not crack it', n.cracks === 0 && n.over !== 'thrown', 'cracks ' + n.cracks + ' ' + n.over);
}
{
  const run = LR.makeRun({ stage: 'downs', kind: 'young' });
  run.cracks = run.st.cracks - 1; run.tailCool = 0;
  Object.assign(run, { x: calm, y: run.land.h(calm) + run.r + 0.1, vx: 8, vy: -(run.st.tailHit * 0.9), ang: run.land.slope(calm) + 0.5, grounded: false, air: 2 });
  for (let i = 0; i < 30 && !run.over; i++) LR.step(run, {});
  check('one crack too many shatters the tail', run.over === 'shattered');
}

/* ---------- stones ---------- */
{
  const land = LR.makeLand('road');
  let rock = null;
  for (const sg of land.segsIn(200, 4000)) for (const o of sg.rocks) if (!rock && o.h < 3) rock = o;
  const hit = (kind, v) => {
    const run = LR.makeRun({ stage: 'road', kind, land: LR.makeLand('road') });
    const o = run.land.segsIn(rock.x, rock.x).flatMap(s => s.rocks).find(q => q.x === rock.x);
    Object.assign(run, { x: o.x - o.w / 2 - run.r * 1.6, y: o.y + 1.2 + run.r * 0.2, vx: v, vy: 0, ang: 0, grounded: false, air: 0.05 });
    for (let i = 0; i < 40; i++) LR.step(run, {});
    return { run, o };
  };
  const fast = hit('old', 30), slow = hit('young', 3);
  check('head first and fast, the old Lútut breaks a stone', fast.o.broken && fast.run.tally.smashed >= 1);
  check('slow, the stone stands and the Lútut bounces off', !slow.o.broken && slow.run.vx < 3);
}

/* ---------- hunting ---------- */
{
  const run = LR.makeRun({ stage: 'downs', kind: 'adult' });
  const sg = run.land.segsIn(300, 3000).find(s => s.prey.some(p => p.kind === 'hopper'));
  const p = sg.prey.find(q => q.kind === 'hopper');
  run.hunger = 20;
  Object.assign(run, { x: p.x - run.r * 1.5, y: p.y + run.r * 0.6, vx: 12, vy: 0, ang: 0, grounded: false, air: 0.1 });
  LR.step(run, {});
  check('flying into a Rock Hopper sucks it in', p.eaten && run.eaten === 1 && run.tally.eaten.hopper === 1);
  check('eating fills the gullet', run.hunger > 30);
  check('the suck shows', run.suckT > 0);
}
{
  const run = LR.makeRun({ stage: 'downs', kind: 'adult' });
  const sg = run.land.segsIn(120, 6000).find(s => s.prey.some(p => p.kind === 'byrd'));
  const p = sg.prey.find(q => q.kind === 'byrd');
  Object.assign(run, { x: p.x - run.r * 1.4, y: p.y, vx: 14, vy: 0, ang: 0, grounded: false, air: 0.1 });
  LR.step(run, {});
  check('a Byrd stings: the wings go numb', p.eaten && run.numb > 0.5);
  LR.step(run, { beat: true });
  check('numb wings cannot beat', !run.beating);
}
{
  const run = LR.makeRun({ stage: 'road', kind: 'adult' });
  const sg = run.land.segsIn(120, 8000).find(s => s.prey.some(p => p.kind === 'shellback'));
  const p = sg.prey.find(q => q.kind === 'shellback');
  Object.assign(run, { x: p.x - run.r * 1.5, y: p.y + run.r * 0.7, vx: 3, vy: 0, ang: 0, grounded: false, air: 0.1 });
  LR.step(run, {});
  check('too slow, a Shellback is not sucked in', !p.eaten);
  Object.assign(run, { x: p.x - run.r * 1.5, y: p.y + run.r * 0.7, vx: 20, vy: 0 });
  LR.step(run, {});
  check('fast, it is', p.eaten);
}
{
  const run = LR.makeRun({ stage: 'downs', kind: 'adult' });
  const sg = run.land.segsIn(120, 3000).find(s => s.teeth.length);
  const t = sg.teeth[0];
  Object.assign(run, { x: t.x, y: t.y, vx: 10, vy: 0, grounded: false, air: 0.1 });
  LR.step(run, {});
  check('flying through a tooth picks it up', t.got && run.teeth >= 1 && run.tally.teethPicked >= 1);
}

/* ---------- water, chasms, hunger ---------- */
{
  const run = LR.makeRun({ stage: 'marsh', kind: 'adult' });
  const c = run.land.segsIn(100, 5000).find(s => s.cut).cut, mid = (c.a + c.b) / 2;
  Object.assign(run, { x: mid, y: c.rim + run.r, vx: 0, vy: -5, grounded: false, air: 1 });
  for (let i = 0; i < 30; i++) LR.step(run, {});
  check('into the marsh water: it sinks', run.over === 'sank');
}
{
  const run = LR.makeRun({ stage: 'canyon', kind: 'adult' });
  const c = run.land.segsIn(100, 5000).find(s => s.cut).cut, mid = (c.a + c.b) / 2;
  Object.assign(run, { x: mid, y: c.rim - 2, vx: 0, vy: -5, grounded: false, air: 1 });
  for (let i = 0; i < 200 && !run.over; i++) LR.step(run, {});
  check('down a chasm: the ride ends', run.over === 'fell');
}
{
  const run = LR.makeRun({ stage: 'downs', kind: 'young' });
  run.hunger = 0;
  for (let i = 0; i < 400 && !run.over; i++) LR.step(run, { beat: true });
  check('out of meat and stopped: it lands to rest', run.over === 'hungry');
}

/* ---------- whole rides ---------- */
LR.STAGES.forEach(S => LR.KIND_ORDER.forEach(k => {
  const run = ride({ stage: S.id, kind: k });
  check(S.name + ', ' + k + ': a ride ends', !!run.over, 'still going at ' + run.dist.toFixed(0) + ' m');
  check(S.name + ', ' + k + ': and goes somewhere', run.dist > 100, run.dist.toFixed(0) + ' m');
  const R = LR.finish(run);
  check(S.name + ', ' + k + ': the pay adds up', R.total === run.teeth + R.distPay && R.total >= 0 && R.picked + R.prey + R.tricks === run.teeth);
}));
{
  const plain = ride({ stage: 'downs', kind: 'young' }), up = ride({ stage: 'downs', kind: 'young', up: { wings: 10, gullet: 10, tail: 10, saddle: 10 } });
  check('upgrades carry you further', up.dist > plain.dist, plain.dist.toFixed(0) + ' → ' + up.dist.toFixed(0));
}
{
  const S = { runs: 1, eatenAll: 30, eaten: { byrd: 21, shellback: 5 }, smashed: 20, clean: 30, airMax: 13, loops: 1, skimMax: 6, dist: 12000 };
  check('every feat can be earned', LR.FEATS.every(f => f.test(S, { eaten: 16, dist: 2100, cracks: 0 })));
  check('no feat comes for nothing', LR.FEATS.every(f => !f.test({ runs: 0, eatenAll: 0, eaten: {}, smashed: 0, clean: 0, airMax: 0, loops: 0, skimMax: 0, dist: 0 }, { eaten: 0, dist: 0, cracks: 1 })));
}

console.log('Lútut Rider: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
