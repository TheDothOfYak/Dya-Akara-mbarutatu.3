/* Headless test for the lockstep netplay core (js/core/netplay.js):
   two independent Match instances — a "host" and a "guest" computer —
   exchange input frames through a loopback channel with simulated
   latency. They must stay perfectly in sync and reach the identical
   result, tick for tick. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {}, head: { appendChild: () => {} } };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/token.js',
  'js/engine/behaviors.js', 'js/engine/match.js', 'js/core/netplay.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA;
const NP = DYAG.netplay;

/* identical pouches on both machines, as the room handshake guarantees */
const rng = new DYAG.util.Rng(2026);
function mkPouch(n) {
  const ids = DYAG.species.craftable;
  const p = [];
  for (let i = 0; i < n; i++) p.push(DYAG.token.mint({ speciesId: ids[Math.floor(rng.next() * ids.length)], rng }));
  return p;
}
const pouchHost = mkPouch(20), pouchGuest = mkPouch(20);
function mkMatch() {
  const m = new DYAG.match.Match({
    seed: 313373, mode: 'standard', terrain: 'plains',
    settings: { pulseInterval: 5, pulseAmount: 3, chaos: false },
    teams: [
      { name: 'Host', controller: 'human', pouch: JSON.parse(JSON.stringify(pouchHost)) },
      { name: 'Guest', controller: 'human', pouch: JSON.parse(JSON.stringify(pouchGuest)) },
    ],
  });
  m.headless = true;
  return m;
}

const mA = mkMatch(), mB = mkMatch();

/* loopback transport with ~3-iteration delivery latency */
let iter = 0;
const wireToB = [], wireToA = [];
const LAT = 3;
const netA = new NP.Lockstep(mA, 0, msg => wireToB.push({ at: iter + LAT, msg: JSON.parse(JSON.stringify(msg)) }));
const netB = new NP.Lockstep(mB, 1, msg => wireToA.push({ at: iter + LAT, msg: JSON.parse(JSON.stringify(msg)) }));
function deliver() {
  while (wireToB.length && wireToB[0].at <= iter) netB.onRemote(wireToB.shift().msg);
  while (wireToA.length && wireToA[0].at <= iter) netA.onRemote(wireToA.shift().msg);
}

/* scripted player actions on both sides — issued by ITERATION so the
   two machines act at (slightly) different sim moments, like real play */
const script = [];
for (let k = 0; k < 40; k++) {
  script.push({ at: 120 + k * 90, side: k % 2 ? netB : netA, input: { type: 'ready', pouchIdx: k % 20 } });
  script.push({ at: 240 + k * 90, side: k % 2 ? netB : netA, input: { type: 'trigger', slot: 0, x: 400 + (k * 53) % 800, y: 200 + (k * 31) % 600 } });
}
script.push({ at: 5200, side: netA, input: { type: 'chat', msg: 'Well fought.' } });
/* the guest eventually concedes — a deterministic end both sims must agree on */
script.push({ at: 9000, side: netB, input: { type: 'concede' } });

const MAX_ITERS = 20000;
let scriptIdx = 0;
while ((!mA.over || !mB.over) && iter < MAX_ITERS) {
  iter++;
  deliver();
  while (scriptIdx < script.length && script[scriptIdx].at <= iter) {
    const s = script[scriptIdx++];
    if (!s.side.M.over) s.side.queueLocal(s.input);
  }
  netA.step(0.05);
  netB.step(0.05);
}
deliver();
/* let the trailing side catch up on the final frames */
for (let k = 0; k < 400 && (!mA.over || !mB.over); k++) { iter++; deliver(); netA.step(0.05); netB.step(0.05); }

console.log('Netplay lockstep loopback:');
console.log('  host  over=', mA.over, 'tick=', mA.tick, 'result=', JSON.stringify(mA.result && { winner: mA.result.winner, how: mA.result.how }));
console.log('  guest over=', mB.over, 'tick=', mB.tick, 'result=', JSON.stringify(mB.result && { winner: mB.result.winner, how: mB.result.how }));

let fails = 0;
function check(name, cond, extra) {
  console.log('  ' + name + ':', cond ? 'PASS' : 'FAIL', extra || '');
  if (!cond) fails++;
}
check('both matches finished', mA.over && mB.over, mA.over ? '' : 'host stuck at tick ' + mA.tick + '/' + netA.maxSafeTick());
check('same final tick', mA.tick === mB.tick, mA.tick + ' vs ' + mB.tick);
check('same winner & cause', !!(mA.result && mB.result) && mA.result.winner === mB.result.winner && mA.result.how === mB.result.how,
  JSON.stringify(mA.result && { w: mA.result.winner, how: mA.result.how }) + ' vs ' + JSON.stringify(mB.result && { w: mB.result.winner, how: mB.result.how }));
check('identical input logs', JSON.stringify(mA.log) === JSON.stringify(mB.log), mA.log.length + ' vs ' + mB.log.length + ' entries');
check('identical state hash', NP.stateHash(mA) === NP.stateHash(mB));
check('no desync flagged', !netA.desynced && !netB.desynced);
check('inputs actually flowed', mA.log.length >= 30, mA.log.length + ' applied');

/* --- out-of-order & duplicate delivery: frames must be idempotent --- */
const mC = mkMatch(), mD = mkMatch();
let iter2 = 0;
const toD = [], toC = [];
const netC = new NP.Lockstep(mC, 0, msg => { const cp = JSON.parse(JSON.stringify(msg)); toD.push({ at: iter2 + 2, msg: cp }); toD.push({ at: iter2 + 7, msg: cp }); });
const netD = new NP.Lockstep(mD, 1, msg => { const cp = JSON.parse(JSON.stringify(msg)); toC.push({ at: iter2 + 5, msg: cp }); });
while ((!mC.over || !mD.over) && iter2 < MAX_ITERS) {
  iter2++;
  while (toD.length && toD[0].at <= iter2) netD.onRemote(toD.shift().msg);
  while (toC.length && toC[0].at <= iter2) netC.onRemote(toC.shift().msg);
  if (iter2 === 150) netC.queueLocal({ type: 'ready', pouchIdx: 0 });
  if (iter2 === 300) netC.queueLocal({ type: 'trigger', slot: 0, x: 800, y: 500 });
  if (iter2 === 200) netD.queueLocal({ type: 'ready', pouchIdx: 1 });
  if (iter2 === 350) netD.queueLocal({ type: 'trigger', slot: 0, x: 900, y: 400 });
  if (iter2 === 900) netC.queueLocal({ type: 'concede' });
  netC.step(0.05);
  netD.step(0.05);
}
check('duplicate/uneven delivery stays in sync', mC.over && mD.over && mC.tick === mD.tick && JSON.stringify(mC.log) === JSON.stringify(mD.log) && NP.stateHash(mC) === NP.stateHash(mD));

/* ===================================================================
   N-PLAYER lockstep: a multi-seat Brawl. Four teams (a 4-player
   free-for-all, sides 0/1/2/3); three are HUMAN seats on separate
   devices, the fourth is a Dya'kukull (AI) that every client simulates
   identically from the seeded brain — so only the three humans network.
   All three clients must stay byte-identical and reach one result. */
const brawlPouches = [mkPouch(16), mkPouch(16), mkPouch(16), mkPouch(16)];
const HUMANS = [0, 1, 2];          // teams 0,1,2 are human; team 3 is AI
function mkBrawl() {
  const m = new DYAG.match.Match({
    seed: 0xBEEF, mode: 'standard', terrain: 'plains',
    settings: { pulseInterval: 5, pulseAmount: 3, chaos: false },
    teams: [0, 1, 2, 3].map(i => ({
      name: 'P' + i, side: i,
      controller: HUMANS.indexOf(i) >= 0 ? 'human' : 'ai', aiSkill: 0.7,
      pouch: JSON.parse(JSON.stringify(brawlPouches[i])),
      hoard: { x: i % 2 ? 1300 : 300, y: i < 2 ? 300 : 700 },
    })),
  });
  m.headless = true;
  return m;
}

const N_CLIENTS = HUMANS.length;
const bMatches = HUMANS.map(mkBrawl);
const bWires = [];                 // {at, to, msg}
let bIter = 0;
const BLAT = 3;
const bNets = HUMANS.map((seat, ci) => new NP.Lockstep(bMatches[ci], seat, (msg) => {
  const cp = JSON.parse(JSON.stringify(msg));
  for (let j = 0; j < N_CLIENTS; j++) if (j !== ci) bWires.push({ at: bIter + BLAT, to: j, msg: cp });
}, HUMANS));
function bDeliver() {
  for (let i = bWires.length - 1; i >= 0; i--) {
    if (bWires[i].at <= bIter) { const w = bWires.splice(i, 1)[0]; bNets[w.to].onRemote(w.msg); }
  }
}
/* each human client scripts inputs for ITS OWN seat */
const bScript = [];
for (let k = 0; k < 24; k++) {
  const ci = k % N_CLIENTS;
  bScript.push({ at: 100 + k * 70, ci, input: { type: 'ready', pouchIdx: k % 16 } });
  bScript.push({ at: 210 + k * 70, ci, input: { type: 'trigger', slot: 0, x: 300 + (k * 61) % 1000, y: 200 + (k * 37) % 600 } });
}
bScript.push({ at: 7000, ci: 0, input: { type: 'concede' } });   // seat 0 bows out → decisive end
let bIdx = 0;
while (bMatches.some(m => !m.over) && bIter < MAX_ITERS) {
  bIter++;
  bDeliver();
  while (bIdx < bScript.length && bScript[bIdx].at <= bIter) {
    const s = bScript[bIdx++];
    if (!bMatches[s.ci].over) bNets[s.ci].queueLocal(s.input);
  }
  bNets.forEach(n => n.step(0.05));
}
bDeliver();
for (let k = 0; k < 600 && bMatches.some(m => !m.over); k++) { bIter++; bDeliver(); bNets.forEach(n => n.step(0.05)); }

const allOver = bMatches.every(m => m.over);
const sameTick = bMatches.every(m => m.tick === bMatches[0].tick);
const sameLog = bMatches.every(m => JSON.stringify(m.log) === JSON.stringify(bMatches[0].log));
const sameHash = bMatches.every(m => NP.stateHash(m) === NP.stateHash(bMatches[0]));
const sameResult = bMatches.every(m => m.result && bMatches[0].result && m.result.winner === bMatches[0].result.winner && m.result.winnerSide === bMatches[0].result.winnerSide);
const noDesync = bNets.every(n => !n.desynced);
console.log('N-player brawl lockstep (3 humans + 1 AI):');
console.log('  ticks=', bMatches.map(m => m.tick).join('/'), 'winnerSide=', bMatches.map(m => m.result && m.result.winnerSide).join('/'));
check('all three clients finished', allOver, bMatches.map(m => m.over).join('/'));
check('all three at the same tick', sameTick, bMatches.map(m => m.tick).join('/'));
check('identical input logs across clients', sameLog, bMatches.map(m => m.log.length).join('/'));
check('identical state hash across clients', sameHash);
check('same winning side across clients', sameResult);
check('no desync flagged on any client', noDesync);
check('the AI seat played without any of its own frames on the wire (it was never networked)', bMatches[0].log.some(e => e.team === 3), 'AI seat inputs present in the synced log');

/* a solo human whose rivals are ALL AI never waits on the wire */
const solo = mkBrawl();
const soloNet = new NP.Lockstep(solo, 0, () => {}, [0]);   // only seat 0 is human
check('solo human (all-AI rivals) runs free — maxSafeTick is unbounded', soloNet.maxSafeTick() === Infinity);

if (fails) { console.log('NETPLAY: ' + fails + ' FAILURE(S)'); process.exit(1); }
console.log('NETPLAY: ALL PASS');
