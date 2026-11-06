/* Stryx Pilot (mini-games/stryx-pilot): the sky, the ship, landing, hazards and jobs.
   node tests/test_stryx_pilot.js */
'use strict';
const path = require('path');
const dir = path.join(__dirname, '..', 'mini-games', 'stryx-pilot', 'js');
require(path.join(dir, 'sp_data.js'));
require(path.join(dir, 'sp_sim.js'));
const SP = globalThis.SP;

let pass = 0, fail = 0;
function check(name, ok, extra) { if (ok) pass++; else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }
const parts = n => ({ seed: n, sails: n, hull: n, vines: n, hold: Math.min(3, n) });
function flyTo(o, to, maxT) {
  const f = SP.makeFlight(o);
  const inp = {};
  while (!f.docked && !f.wrecked && f.t < (maxT || 120)) { Object.assign(inp, SP.autopilot(f, to)); SP.stepFlight(f, inp); }
  return f;
}

/* the sky */
for (let day = 0; day < 30; day += 3) {
  const L = SP.layout(day);
  const bodies = Object.values(L);
  let overlap = false;
  bodies.forEach(a => bodies.forEach(b => { if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + 200) overlap = true; }));
  check('day ' + day + ': no two bodies touch', !overlap);
}
check('the Tatu move from day to day', SP.layout(0).xikia.x !== SP.layout(1).xikia.x);
check('Velki holds the centre', SP.layout(5).velki.x === 0 && SP.layout(5).velki.y === 0);
SP.PORTS.forEach(p => check(p.id + ': its port is on a real body', !!SP.body(p.body)));
check('every port has its own pad (no two pads share a spot)', SP.PORTS.every(a => SP.PORTS.every(b => a === b || a.body !== b.body || Math.abs(SP.angDiff(a.ang, b.ang)) * SP.body(a.body).r > 300)));

/* a ship on the pad stays put until it pushes */
(function () {
  const f = SP.makeFlight({ day: 0, from: 'rakar', parts: parts(1), seed: 1 });
  const x0 = f.ship.x;
  for (let i = 0; i < 120; i++) SP.stepFlight(f, {});
  check('sits on the pad without pushing', f.ship.grounded && Math.abs(f.ship.x - x0) < 0.01 && !f.docked);
  for (let i = 0; i < 60; i++) SP.stepFlight(f, { thrust: true });
  check('pushing lifts it off', !f.ship.grounded && f.ship.heat < f.S.heatMax);
})();

/* gravity pulls a drifting ship down; a gentle landing docks; a hard one hurts */
(function () {
  const f = SP.makeFlight({ day: 0, from: 'rakar', parts: parts(1), seed: 2 });
  const L = f.bodies, x = L.xikia, port = SP.port('beuhk'), pp = SP.portPos(port, L);
  /* hold the ship just over Beuhk's pad, nose up, and let it settle */
  f.ship.grounded = null; f.ship.x = pp.x + pp.nx * 80; f.ship.y = pp.y + pp.ny * 80; f.ship.vx = 0; f.ship.vy = 0; f.ship.ang = Math.atan2(pp.ny, pp.nx);
  for (let i = 0; i < 600 && !f.docked; i++) SP.stepFlight(f, {});
  check('a ship let fall gently onto a pad docks there', f.docked === 'beuhk', f.docked);
  check('…without a knock', f.hits === 0);
  const g = SP.makeFlight({ day: 0, from: 'rakar', parts: parts(1), seed: 3 });
  g.ship.grounded = null; g.ship.x = x.x; g.ship.y = x.y - x.r - 400; g.ship.vx = 0; g.ship.vy = 700;
  const hull0 = g.ship.hull;
  for (let i = 0; i < 60; i++) SP.stepFlight(g, {});
  check('slamming into the ground knocks the hull', g.ship.hull < hull0 && !g.docked);
})();

/* heat runs out, and the sails win it back */
(function () {
  const f = SP.makeFlight({ day: 0, from: 'rakar', parts: parts(1), seed: 4 });
  f.ship.grounded = null; f.ship.x = 30000; f.ship.y = 30000;   // far out in the empty sky
  for (let i = 0; i < 60 * 20; i++) SP.stepFlight(f, { thrust: true });
  check('pushing burns the seed down to nothing', f.ship.heat < 1);
  const v = Math.hypot(f.ship.vx, f.ship.vy);
  for (let i = 0; i < 60 * 5; i++) SP.stepFlight(f, {});
  check('the sails win heat back while coasting', f.ship.heat > 5);
  check('the empty sky barely slows you', Math.hypot(f.ship.vx, f.ship.vy) > v * 0.75);
})();

/* the autopilot can fly real routes (so the routes are flyable) */
[['rakar', 'beuhk'], ['rakar', 'highlands'], ['rakar', 'velkinovek'], ['beuhk', 'fyrsti'], ['velkinovek', 'nekh'], ['sukry', 'rakar'], ['ulark', 'villtur']].forEach(([a, b]) => {
  const f = flyTo({ day: 0, from: a, parts: parts(3), rank: 1, seed: 11 }, b);
  check(a + ' → ' + b + ': the autopilot docks', f.docked === b, (f.docked || (f.wrecked ? 'wrecked' : 'timeout')) + ' after ' + f.t.toFixed(1) + ' s');
});

/* hazards */
(function () {
  const f = SP.makeFlight({ day: 0, from: 'ulark', parts: parts(3), rank: 2, seed: 12 });
  check('Leotik has Tyndael and a Lutut', f.tyndael.length > 8 && f.lutut.length >= 1);
  /* a Tyndael that reaches the ship hurts it and is spent */
  const t = f.tyndael[0]; f.ship.grounded = null; f.ship.x = t.x + 200; f.ship.y = t.y;
  const h0 = f.ship.hull;
  for (let i = 0; i < 240 && t.alive; i++) SP.stepFlight(f, {});
  check('a Tyndael chases you down and burns the hull', !t.alive && f.ship.hull < h0);
  /* the vine-lash knocks them out of the sky */
  const others = f.tyndael.filter(x => x.alive && x.flock === f.tyndael[1].flock);
  const o = others[0]; f.ship.x = o.x + 60; f.ship.y = o.y; f.ship.lashCd = 0;
  SP.stepFlight(f, { lash: true });
  check('the vine-lash pops a Tyndael close by', !o.alive);
  check('…and then needs a moment', f.ship.lashCd > 0);
  /* a Lutut screeches, then dives */
  const l = f.lutut[0]; f.ship.x = l.x + 500; f.ship.y = l.y; f.ship.vx = 0; f.ship.vy = 0; f.ship.hull = 999;
  let saw = {};
  for (let i = 0; i < 240; i++) { SP.stepFlight(f, {}); saw[l.state] = 1; }
  check('a Lutut screeches before it dives', saw.screech && saw.dive);
})();
(function () {
  const f = SP.makeFlight({ day: 0, from: 'ashen', parts: parts(1), rank: 1, seed: 13 });
  const m = f.mists[0];
  f.ship.grounded = null; f.ship.x = m.x; f.ship.y = m.y; f.ship.heat = 50;
  for (let i = 0; i < 120; i++) SP.stepFlight(f, {});
  check('the oath-mist chills the seed', f.ship.heat < 40 && f.inMist);
})();
(function () {
  const f = SP.makeFlight({ day: 0, from: 'rakar', parts: parts(1), seed: 14, wave: true });
  check('the Waves of Memory come when asked', !!f.wave && f.flies.length > 0);
  const w = f.wave;
  f.ship.grounded = null; f.ship.x = w.nx * w.off + 40000 * w.flow[0]; f.ship.y = w.ny * w.off + 40000 * w.flow[1];
  f.ship.vx = 0; f.ship.vy = 0; f.ship.heat = 10;
  for (let i = 0; i < 120; i++) SP.stepFlight(f, {});
  const along = f.ship.vx * w.flow[0] + f.ship.vy * w.flow[1];
  check('riding the wave carries you along it', along > 100, along.toFixed(0));
  check('…and the sails drink in its light', f.ship.heat > 30);
})();

/* wrecks */
(function () {
  const f = SP.makeFlight({ day: 0, from: 'rakar', parts: parts(1), seed: 15, hull: 3 });
  const x = f.bodies.xikia;
  f.ship.grounded = null; f.ship.x = x.x; f.ship.y = x.y - x.r - 300; f.ship.vy = 800;
  for (let i = 0; i < 120 && !f.wrecked; i++) SP.stepFlight(f, {});
  check('a ship with no hull left is wrecked', f.wrecked && f.ship.hull === 0);
})();

/* jobs */
const jobs = SP.makeJobs('rakar', 0, 0, 42, 6);
check('the board has jobs', jobs.length >= 3);
check('a new pilot is only offered ports they may fly to', jobs.every(j => SP.port(j.to).rank === 0 && j.to !== 'rakar'));
check('jobs pay and have a par', jobs.every(j => j.pay > 0 && j.par > 5));
check('no fire seeds for a fledgling', jobs.every(j => j.kind !== 'seeds'));
check('far ports appear for an elder', SP.makeJobs('rakar', 0, 3, 7, 40).some(j => SP.port(j.to).rank >= 2));
const job = { kind: 'fragile', pay: 100, par: 20 };
check('fragile: a clean, quick flight pays a bonus', SP.settle(job, { damage: 0, hits: 0, hardHits: 0 }, 10).pay === 125);
check('fragile: knocks cost pay', SP.settle(job, { damage: 30, hits: 2, hardHits: 0 }, 30).pay < 100);
check('mail: very late mail is paid half', SP.settle({ kind: 'mail', pay: 100, par: 20 }, { damage: 0, hits: 0 }, 40).pay === 50);
check('passengers tip for a smooth flight', SP.settle({ kind: 'folk', pay: 100, par: 20 }, { damage: 0, hits: 0, hardHits: 0 }, 30).pay === 130);
check('ranks climb with deliveries', SP.rankOf(0) === 0 && SP.rankOf(6) === 1 && SP.rankOf(100) === SP.RANKS.length - 1);
check('better parts make a better ship', SP.ship(parts(5)).thrust > SP.ship(parts(1)).thrust && SP.ship(parts(5)).hullMax > SP.ship(parts(1)).hullMax);

console.log('Stryx Pilot: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
