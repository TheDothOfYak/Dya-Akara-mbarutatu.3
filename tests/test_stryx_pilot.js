/* Stryx Pilot (mini-games/stryx-pilot): the sky, the ship, landing, hazards and jobs.
   node tests/test_stryx_pilot.js */
'use strict';
const path = require('path');
const dir = path.join(__dirname, '..', 'mini-games', 'stryx-pilot', 'js');
require(path.join(dir, 'sp_data.js'));
require(path.join(dir, 'sp_sim.js'));
const SP = globalThis.SP;
require(path.join(dir, 'sp_battle.js'));
/* physics tests fly in an empty sky unless they ask for pirates */
const makeFlight0 = SP.makeFlight;
SP.makeFlight = o => makeFlight0(Object.assign({ pirates: false }, o));

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
  for (let i = 0; i < 120; i++) SP.stepFlight(f, {});
  const pad = SP.portPos(SP.port('rakar'), f.bodies);
  check('sits on the pad without pushing, turning with its world', f.ship.grounded && Math.hypot(f.ship.x - pad.x - pad.nx * SP.SHIP_R, f.ship.y - pad.y - pad.ny * SP.SHIP_R) < 3 && !f.docked);
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

/* skiffs adrift, cargo weight, slingshots, port events */
(function () {
  const f = SP.makeFlight({ day: 0, from: 'rakar', parts: parts(2), seed: 21, skiff: true });
  check('a skiff can be adrift', f.skiffs.length === 1 && f.skiffs.every(k => f.list.every(b => Math.hypot(k.x - b.x, k.y - b.y) > b.r + 300)));
  const k = f.skiffs[0];
  f.ship.grounded = null; f.ship.x = k.x - 40; f.ship.y = k.y; f.ship.vx = k.vx; f.ship.vy = k.vy;
  for (let i = 0; i < 150 && !k.saved; i++) { SP.stepFlight(f, {}); f.ship.x = k.x - 40; f.ship.y = k.y; f.ship.vx = k.vx; f.ship.vy = k.vy; }
  check('holding alongside a skiff takes it in tow', k.saved && f.rescued === 1 && f.rescueCoins === k.reward);
  const g = SP.makeFlight({ day: 0, from: 'rakar', parts: parts(2), seed: 22, skiff: true });
  const j = g.skiffs[0]; g.ship.grounded = null; g.ship.x = j.x - 40; g.ship.y = j.y; g.ship.vx = j.vx + 400; g.ship.vy = j.vy;
  SP.stepFlight(g, {});
  check('racing past a skiff does not rescue it', !j.saved && j.hold === 0);
  /* weight */
  const light = SP.makeFlight({ day: 0, from: 'rakar', parts: parts(2), seed: 23 }), heavy = SP.makeFlight({ day: 0, from: 'rakar', parts: parts(2), seed: 23, weight: 3 });
  [light, heavy].forEach(q => { q.ship.grounded = null; q.ship.x = 40000; q.ship.y = 40000; q.ship.ang = 0; for (let i = 0; i < 60; i++) SP.stepFlight(q, { thrust: true }); });
  check('a heavy hold answers more slowly', heavy.ship.vx < light.ship.vx * 0.85, heavy.ship.vx.toFixed(0) + ' vs ' + light.ship.vx.toFixed(0));
  /* slingshot */
  const sl = SP.makeFlight({ day: 0, from: 'rakar', parts: parts(2), seed: 24 });
  const x = sl.bodies.xikia; sl.ship.grounded = null; sl.ship.x = x.x - 300; sl.ship.y = x.y - x.r - 160; sl.ship.vx = 800; sl.ship.vy = 0;
  for (let i = 0; i < 30; i++) SP.stepFlight(sl, {});
  check('skimming fast past a Tatu is a slingshot', sl.slings === 1);
  for (let i = 0; i < 30; i++) SP.stepFlight(sl, {});
  check('…once per pass, not every moment', sl.slings === 1);
})();
(function () {
  let found = null;
  for (let d = 0; d < 40 && !found; d++) SP.PORTS.forEach(p => { if (!found && SP.portEvent(p.id, d)) found = [p.id, d]; });
  check('some ports have something on some days', !!found);
  check('port events are the same each time they are asked', JSON.stringify(SP.portEvent(found[0], found[1])) === JSON.stringify(SP.portEvent(found[0], found[1])));
  let boosted = 0;
  for (let d = 0; d < 30; d++) SP.makeJobs('rakar', d, 3, d * 13 + 1, 8).forEach(j => { if (j.event) { boosted++; const ev = SP.portEvent(j.to, d); if (!ev || ev.kinds.indexOf(j.kind) < 0) boosted = -999; } });
  check('jobs bound for an event pay more, and only the right kinds', boosted > 0, String(boosted));
})();

/* the sky turns: orbits, spin, the clock, landing on a moving world */
(function () {
  const a = SP.layout(1000), b = SP.layout(1060);
  check('worlds move along their orbits as the sky clock runs', Math.hypot(a.xikia.x - b.xikia.x, a.xikia.y - b.xikia.y) > 500);
  check('worlds spin, and their ports turn with them', Math.abs(SP.angDiff(SP.portPos(SP.port('beuhk'), a).ang, SP.portPos(SP.port('beuhk'), b).ang)) > 0.5);
  check('the worlds are far apart now', Math.hypot(a.leotik.x, a.leotik.y) > 18000 && SP.body('velki').r >= 1700);
  check('the sky clock reads like a clock', /^\d\d:\d\d$/.test(SP.clockOf(12345)) && SP.clockOf(0) === '00:00' && SP.clockOf(SP.DAY / 2) === '12:00');
  /* a ship let down gently onto a spinning, orbiting world docks, matching the ground's own speed */
  const f = SP.makeFlight({ T0: 5000, from: 'velkinovek', parts: parts(1), seed: 31 });
  const pp = SP.portPos(SP.port('beuhk'), f.bodies), gv = SP.groundVel(pp.body, pp.x, pp.y);
  f.ship.grounded = null; f.ship.x = pp.x + pp.nx * 70; f.ship.y = pp.y + pp.ny * 70; f.ship.vx = gv[0]; f.ship.vy = gv[1]; f.ship.ang = Math.atan2(pp.ny, pp.nx);
  for (let i = 0; i < 400 && !f.docked; i++) SP.stepFlight(f, {});
  check('landing gently on a moving world docks', f.docked === 'beuhk' && f.hits === 0, f.docked + ' hits ' + f.hits);
  /* hazards that belong to a world travel with it */
  const g = SP.makeFlight({ T0: 7000, from: 'nekh', parts: parts(1), seed: 32 });
  const st = g.storms[0], v0 = [g.bodies.velki.x, g.bodies.velki.y], d0 = Math.hypot(st.x - v0[0], st.y - v0[1]);
  for (let i = 0; i < 600; i++) SP.stepFlight(g, {});
  check('storms stay with Velki as it turns', Math.abs(Math.hypot(st.x - g.bodies.velki.x, st.y - g.bodies.velki.y) - d0) < 5);
  check('jobs never go to the secret world', SP.makeJobs('rakar', 3, 3, 9, 40).every(j => !SP.port(j.to).secret));
})();

/* ships for hire */
(function () {
  const sh = SP.hireShip('t1', 'rakar', 'velkinovek', 10000, 'a crew');
  const e0 = SP.fleetEarn(sh, 10000);
  check('a new crew has earned nothing yet', e0.trips === 0 && e0.net === 0);
  const e1 = SP.fleetEarn(sh, 10000 + SP.DAY);
  check('a day later they have made trips and drawn wages', e1.trips > 0 && e1.wages === SP.FLEET.wage && e1.coins > 0);
  check('earnings are capped while you are away', SP.fleetEarn(sh, 10000 + SP.DAY * 50).trips === SP.FLEET.maxTrips);
  SP.fleetSettle(sh, 10000 + SP.DAY);
  check('settling up starts their tally again', SP.fleetEarn(sh, 10000 + SP.DAY).trips === 0);
  const q = SP.fleetPos(sh, 10000 + sh.trip * 0.5, SP.layout(10000 + sh.trip * 0.5));
  check('their skiff is out in the sky between the ports', q && isFinite(q.x) && isFinite(q.ang));
  const plan = SP.planRoute({ x: 0, y: 0 }, ['beuhk', 'velkinovek'], 10000);
  check('a planned route gets arrival times, in order', plan.length === 2 && plan[0].eta > 0 && plan[1].eta > plan[0].eta);
})();

/* Mba'Karn: only at the far end of the Waves of Memory */
(function () {
  const f = SP.makeFlight({ T0: 9000, from: 'rakar', parts: parts(5), seed: 33, wave: true });
  const w = f.wave, s = f.ship;
  s.grounded = null;
  let spawned = false;
  for (let i = 0; i < 60 * 700 && !spawned; i++) {
    /* keep the ship in the middle of the band, riding with it */
    const along = s.x * w.flow[0] + s.y * w.flow[1];
    s.x = w.nx * w.off + w.flow[0] * along; s.y = w.ny * w.off + w.flow[1] * along;
    SP.stepFlight(f, { aim: Math.atan2(w.flow[1], w.flow[0]), thrust: true });
    if (f.bodies.karn) spawned = true;
  }
  check('ride the waves far enough and Mba’Karn appears', spawned && f.waveRide >= SP.KARN_RIDE, 'rode ' + Math.round(f.waveRide) + ', ' + Math.round(Math.hypot(SP.KARN.x - s.x, SP.KARN.y - s.y)) + ' px short');
  check('…15,000 m from the heart of the Mbaru Tatu, and massive', Math.round(SP.KARN_DIST / 40) === 15000 && SP.KARN.r >= 6000 && Math.hypot(s.x, s.y) > 400000);
  const k = SP.portPos(SP.port('mbakarn'), f.bodies);
  check('its harbour faces the ship coming in', k && Math.hypot(k.x - s.x, k.y - s.y) < Math.hypot(f.bodies.karn.x - s.x, f.bodies.karn.y - s.y));
  const g = SP.makeFlight({ T0: 9000, from: 'rakar', parts: parts(5), seed: 34, wave: false });
  g.ship.grounded = null; g.ship.x = SP.KARN.x + SP.KARN.r + 3000; g.ship.y = SP.KARN.y;
  for (let i = 0; i < 600; i++) SP.stepFlight(g, { thrust: true, aim: 0 });
  check('flying right up to it without the waves finds nothing', !g.bodies.karn);
})();

/* ---------------- boarding battles ---------------- */
(function () {
  const B = SP.Battle;
  const mk = (mine, theirs, seed) => B.create({ mine, theirs, parts: { vines: 2, seed: 2 }, seed: seed || 5 });
  let S = mk([{ type: 'deckhand', n: 10 }, { type: 'slinger', n: 4 }], [{ type: 'cutthroat', n: 8 }, { type: 'captain', n: 1 }]);
  check('a battle starts on round 1 with someone to act', S.round === 1 && !!B.unit(S, S.turn));
  check('the decks have a gap only planks cross', Object.values(S.cells).some(c => c.t === 'gap') && Object.values(S.cells).some(c => c.t === 'plank'));
  const order = [S.turn].concat(S.queue).map(id => B.speed(B.unit(S, id)));
  check('turns go by speed, fastest first', order.every((v, i) => i === 0 || v <= order[i - 1]), order.join(','));
  /* a slinger shoots across the whole battle while no enemy is beside it */
  const sl = S.units.find(u => u.type === 'slinger');
  check('a slinger can shoot from its own deck', B.canShoot(S, sl));
  /* retaliation: once a round */
  S = mk([{ type: 'deckhand', n: 20 }], [{ type: 'bravo', n: 6 }], 9);
  const a = S.units[0], d = S.units[1];
  a.c = 5; a.r = 2; d.c = 7; d.r = 2; S.cells[B.key(6, 2)].t = 'plank';
  S.turn = a.id;
  const hpD = B.hpTotal(d), hpA = B.hpTotal(a);
  B.act(S, { t: 'attack', target: d.id, c: 6, r: 2 });
  check('a melee attack hurts the defender', B.hpTotal(d) < hpD);
  check('…and the defender strikes back', B.hpTotal(a) < hpA && d.retaliated);
  /* surrender */
  S = mk([{ type: 'arena', n: 6 }, { type: 'deckhand', n: 30 }], [{ type: 'cutthroat', n: 12 }, { type: 'knife', n: 6 }], 3);
  B.autoplay(S);
  check('a hopeless pirate crew loses (or strikes its colours)', S.winner === 'A');
  let surrendered = 0, joined = 0;
  for (let i = 0; i < 30; i++) { const T = mk([{ type: 'arena', n: 5 }, { type: 'shield', n: 6 }, { type: 'deckhand', n: 20 }], [{ type: 'cutthroat', n: 10 }, { type: 'bravo', n: 6 }], 100 + i); B.autoplay(T); if (T.surrendered) { surrendered++; if (T.joiners) joined++; } }
  check('beaten crews sometimes strike their colours, and some offer to sign on', surrendered > 0 && joined > 0, surrendered + ' surrendered');
  /* orders */
  S = mk([{ type: 'deckhand', n: 10 }], [{ type: 'cutthroat', n: 10 }], 4);
  while (B.unit(S, S.turn).side !== 'A') B.aiStep(S);
  const foe = S.units.find(u => u.side === 'B'), w0 = S.will, n0 = foe.n;
  check('your Stryx can lash a pirate stack', B.cast(S, 'lash', foe.id) && foe.n < n0 && S.will === w0 - 3);
  check('…once a round', !B.cast(S, 'lash', foe.id));
  { const R = mk([{ type: 'deckhand', n: 10 }], [{ type: 'cutthroat', n: 10 }], 4); while (B.unit(R, R.turn).side !== 'A') B.aiStep(R);
    const mine = R.units.find(u => u.side === 'A'), theirs = R.units.find(u => u.side === 'B');
    check('orders cannot target the wrong side', !B.cast(R, 'rally', theirs.id) && !B.cast(R, 'lash', mine.id) && B.cast(R, 'roots', theirs.id) && theirs.rootT === 2 && !Object.keys(B.reach(R, theirs)).some(k => R.cells[k] && k !== B.key(theirs.c, theirs.r))); }
  /* retreat */
  S = mk([{ type: 'deckhand', n: 5 }], [{ type: 'cutthroat', n: 5 }], 6); B.retreat(S);
  check('cutting the vines ends it as a loss, fled', S.winner === 'B' && S.fled);
  /* survivors exclude escort marines */
  S = mk([{ type: 'deckhand', n: 8 }, { type: 'deckhand', n: 6, escort: true }], [{ type: 'cutthroat', n: 2 }], 7); B.autoplay(S);
  check('escort marines go home to their own ships', B.survivors(S, 'A').reduce((n, x) => n + x.n, 0) <= 8);
  /* the starting crew against a starting pirate: winnable, not certain */
  let wins = 0;
  for (let i = 0; i < 40; i++) { const T = mk([{ type: 'deckhand', n: 10 }, { type: 'slinger', n: 4 }], B.pirateCrew('dusk', 'sloop', 0, 50 + i * 7), 200 + i); B.autoplay(T); if (T.winner === 'A') wins++; }
  check('a starting crew beats a starting pirate most of the time, but not always', wins >= 20 && wins <= 39, wins + '/40');
  const big = B.power(B.pirateCrew('dusk', 'galleon', 3, 9)), small = B.power(B.pirateCrew('dusk', 'sloop', 0, 9));
  check('a galleon at high rank carries a far bigger crew than a sloop', big > small * 2);
  check('wanted captains have tougher crews', B.power(B.pirateCrew('smug', 'brig', 1, 4, true)) > B.power(B.pirateCrew('smug', 'brig', 1, 4)));
})();

/* ---------------- pirates in the sky ---------------- */
(function () {
  const f = SP.makeFlight({ T0: 5000, from: 'rakar', parts: parts(2), seed: 77, rank: 1, cargo: 2, pirates: true, wanted: [{ id: 'w_x', bountyId: 'x', faction: 'dusk', kind: 'brig', body: 'velki', captain: 'Vesh the Thin', ship: 'Nightseed' }] });
  check('pirates are out in the sky', f.pirates.length >= 2);
  const w = f.pirates.find(p => p.wanted);
  check('the wanted captain is out there, by name', w && w.captain === 'Vesh the Thin' && w.bountyId === 'x');
  /* put the ship next to it and shoot until she strikes */
  const s = f.ship; s.grounded = null; s.x = w.x - 400; s.y = w.y; s.vx = 0; s.vy = 0; s.ang = 0; s.heat = 1e6; f.S.heatMax = 1e6;
  let struck = false, board = false;
  for (let i = 0; i < 60 * 40 && !board; i++) {
    const aim = Math.atan2(w.y - s.y, w.x - s.x);
    const d = Math.hypot(w.x - s.x, w.y - s.y);
    if (!struck) { s.x = w.x - Math.cos(aim) * 380; s.y = w.y - Math.sin(aim) * 380; s.vx = w.vx; s.vy = w.vy; s.hull = f.S.hullMax; }
    else { s.x = w.x - 60; s.y = w.y; s.vx = w.vx; s.vy = w.vy; }
    SP.stepFlight(f, { aim, fire: !struck, thrust: false });
    if (w.state === 'struck') struck = true;
    if (f.events.some(e => e.t === 'board' && e.id === w.id)) board = true;
    f.events.length = 0;
    void d;
  }
  check('the seed cannon wears a pirate down until she strikes', struck, w.state + ' hull ' + Math.round(w.hull));
  check('holding alongside a struck ship starts a boarding', board);
  SP.resolveBoard(f, w.id, true);
  check('a ship taken leaves the sky', w.state === 'gone');
  const g = SP.makeFlight({ T0: 5000, from: 'rakar', parts: parts(2), seed: 78, rank: 1, escorts: [{ id: 'e1', name: 'Thornbark', kind: 'cutter', lvl: 2 }] });
  check('escorts fly with you', g.escorts.length === 1 && g.escorts[0].alive);
})();

console.log('Stryx Pilot: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
