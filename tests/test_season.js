/* Headless test for the official season ladder (js/core/season.js + economy).
   Verifies: rating maps to the right circuit, promotion awards an official
   title once per tier, and the shared matchmaking queue pairs two searchers
   atomically (exactly one pairing, both sides agree on room + roles). */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

/* ---------- browser stubs ---------- */
global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
let lsData = {};
global.localStorage = { getItem: k => (k in lsData ? lsData[k] : null), setItem: (k, v) => { lsData[k] = String(v); }, removeItem: k => { delete lsData[k]; } };
global.location = { pathname: '/index.html' };
global.Image = function () { return { onload: null, set src(v) {} }; };

/* ---------- in-memory PostgREST fake (supports eq. and is.null) ---------- */
const db = { dya_accounts: [], dya_bans: [], dya_config: [], dya_players: [], dya_season_queue: [] };
function filtersFor(qs) {
  const fs2 = [];
  (qs || '').split('&').forEach(part => {
    if (!part) return;
    const eq = part.indexOf('=');
    const k = part.slice(0, eq), v = decodeURIComponent(part.slice(eq + 1));
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) return;
    if (v === 'is.null') fs2.push(row => row[k] == null);
    else if (v.startsWith('eq.')) fs2.push(row => String(row[k]) === v.slice(3));
  });
  return fs2;
}
global.fetch = async function (url, opts) {
  opts = opts || {};
  const m = url.match(/\/rest\/v1\/([a-z_]+)(\?(.*))?$/);
  if (!m) return { ok: false, status: 404, json: async () => ({ message: 'bad path' }) };
  const table = m[1], qs = m[3] || '';
  if (!db[table]) return { ok: false, status: 404, json: async () => ({ message: 'relation "' + table + '" does not exist' }) };
  const filters = filtersFor(qs);
  const match = row => filters.every(f => f(row));
  const method = (opts.method || 'GET').toUpperCase();
  const body = opts.body ? JSON.parse(opts.body) : null;
  const wantsRep = /return=representation/.test((opts.headers || {})['Prefer'] || '');
  if (method === 'GET') return { ok: true, status: 200, json: async () => db[table].filter(match) };
  if (method === 'POST') {
    const upsert = /on_conflict=/.test(qs);
    if (upsert) {
      const keyCol = qs.match(/on_conflict=([a-z_]+)/)[1];
      const existing = db[table].find(r => r[keyCol] === body[keyCol]);
      if (existing) { Object.assign(existing, body); return { ok: true, status: 200, json: async () => [existing] }; }
      const row = Object.assign({ status: 'seeking', opponent_net_id: null, room_code: null }, body); // column defaults
      db[table].push(row);
      return { ok: true, status: 201, json: async () => [row] };
    }
    const row = Object.assign({ created_at: new Date().toISOString() }, body);
    db[table].push(row);
    return { ok: true, status: 201, json: async () => (wantsRep ? [row] : null) };
  }
  if (method === 'PATCH') {
    const hit = db[table].filter(match);
    hit.forEach(r => Object.assign(r, body));
    return wantsRep ? { ok: true, status: 200, json: async () => hit } : { ok: true, status: 204, json: async () => null };
  }
  if (method === 'DELETE') { db[table] = db[table].filter(r => !match(r)); return { ok: true, status: 204, json: async () => null }; }
  return { ok: false, status: 405, json: async () => ({ message: 'nope' }) };
};

/* ---------- load the game ---------- */
window.DYA_CONFIG = { supabase: { url: 'https://fake.supabase.co', anonKey: 'x'.repeat(40) } };
const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/mods.js', 'js/core/account_cloud.js', 'js/core/token.js',
  'js/core/state.js', 'js/core/season.js', 'js/engine/behaviors.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA, G = DYAG.state, S = DYAG.season, EC = DYAG.economy, TK = DYAG.token, SP = DYAG.species;
function giveTokens(n) { const rng = new DYAG.util.Rng(DYAG.util.newSeed()); for (let i = 0; i < n; i++) { const t = TK.mint({ speciesId: rng.pick(SP.craftable), rng, owner: G.me.id }); G.me.tokens[t.id] = t; } }
function pouchOf(acc) { return Object.values(acc.tokens).slice(0, 5); }

(async function main() {
  console.log('== SEASON LADDER: circuits, promotion, atomic matchmaking ==');

  /* ---------- rating → circuit ---------- */
  check('a fresh 1000 rating is Local', EC.circuitForRank(1000) === 'Local');
  check('1150 promotes to Regional', EC.circuitForRank(1150) === 'Regional');
  check('1600 is Whole Planet', EC.circuitForRank(1600) === 'Whole Planet');
  check('1800 is Interplanetary', EC.circuitForRank(1800) === 'Interplanetary');
  check('next floor above Local is Regional’s', EC.nextCircuitFloor(1000) === EC.CIRCUIT_RANK_FLOOR.Regional);
  check('no next floor at the top', EC.nextCircuitFloor(1800) === null);

  /* ---------- promotion awards a title once per tier ---------- */
  G.init();
  const a = await G.createAccount('alice@dya.test', 'secret123', 'Alice');
  check('signed up', !!a.acc, a.err);
  G.me.rank = 1160; // just climbed past the Regional floor
  const promo = S.checkPromotion(1100); // was Local, now Regional
  check('crossing the floor promotes', promo && promo.promoted && promo.toCircuit === 'Regional', JSON.stringify(promo));
  check('an official title is offered on promotion', promo && promo.titlePool.length > 0);
  const promo2 = S.checkPromotion(1100); // same tier again
  check('the same tier does not re-award a title', promo2 && promo2.promoted && promo2.titlePool.length === 0);

  /* ---------- atomic matchmaking: two searchers pair exactly once ---------- */
  giveTokens(6);
  const bob = await G.createAccount('bob@dya.test', 'secret123', 'Bob'); // G.me now Bob
  check('second player signed up', !!bob.acc, bob.err);
  giveTokens(6);
  const bobAcc = G.me, aliceAcc = G.world.accounts[a.acc.id];
  aliceAcc.rank = 1000; bobAcc.rank = 1000; // both in Local

  G.me = aliceAcc; // "device A"
  const rA = await S.poll(pouchOf(aliceAcc));
  check('first searcher waits in queue', rA.waiting === true, JSON.stringify(rA));
  check('a seeking row was created', db.dya_season_queue.filter(r => r.status === 'seeking').length === 1);

  G.me = bobAcc; // "device B"
  const rB = await S.poll(pouchOf(bobAcc));
  check('second searcher gets paired', !!(rB.pairing), JSON.stringify(rB));
  check('B was paired with A', rB.pairing && rB.pairing.oppNet === aliceAcc.netId);
  check('the pairing carries a room code', rB.pairing && !!rB.pairing.roomCode);

  G.me = aliceAcc; // device A polls again and discovers it was claimed
  const rA2 = await S.poll(pouchOf(aliceAcc));
  check('A discovers the pairing', !!(rA2.pairing), JSON.stringify(rA2));
  check('A was paired with B', rA2.pairing && rA2.pairing.oppNet === bobAcc.netId);
  check('both sides share the same room', rA2.pairing && rB.pairing && rA2.pairing.roomCode === rB.pairing.roomCode);
  check('both sides agree who hosts', rA2.pairing && rB.pairing && rA2.pairing.hostNet === rB.pairing.hostNet && rA2.pairing.guestNet === rB.pairing.guestNet);
  check('exactly one pairing formed (no extra claims)', db.dya_season_queue.filter(r => r.status === 'matched').length === 2);

  /* ---------- the season is closed until the organizer opens it ---------- */
  const M = DYAG.mods;
  check('online season starts CLOSED until opened', S.isOpen() === false);
  M.setSeasonLive(true);
  check('opening the season makes it live', S.isOpen() === true && M.seasonLive() === true);
  M.setSeasonLive(false);
  check('closing the season shuts the ladder', S.isOpen() === false);

  console.log(failures ? ('SEASON LADDER: ' + failures + ' FAILURE(S)') : 'SEASON LADDER: ALL PASS');
  process.exit(failures ? 1 : 0);
})();
