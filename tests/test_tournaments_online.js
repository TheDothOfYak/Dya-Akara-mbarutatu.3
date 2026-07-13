/* Headless test for shared online tournaments (js/core/tournaments_online.js).
   Two "devices" share one mocked Supabase backend (the in-memory `db`).
   Verifies: real players hold the seats, the Dya'kukull only pad empty seats
   (never a whole field), passwords gate joining, an all-AI field is refused,
   the shared bracket advances, and titles are official-only. */
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
global.localStorage = {
  getItem: k => (k in lsData ? lsData[k] : null),
  setItem: (k, v) => { lsData[k] = String(v); },
  removeItem: k => { delete lsData[k]; },
};
global.location = { pathname: '/index.html' };
global.Image = function () { return { onload: null, set src(v) {} }; };
function newDevice() { lsData = {}; }

/* ---------- in-memory PostgREST fake ---------- */
const db = { dya_accounts: [], dya_bans: [], dya_config: [], dya_tournaments: [], dya_tournament_players: [] };
function eqFilters(qs) {
  const filters = [];
  (qs || '').split('&').forEach(part => {
    if (!part) return;
    const eq = part.indexOf('=');
    const k = part.slice(0, eq), v = decodeURIComponent(part.slice(eq + 1));
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) return;
    if (v.startsWith('eq.')) filters.push(row => String(row[k]) === v.slice(3));
    /* in.(...) / neq. / gte. are treated as "match all" here — the tests
       assert on db contents directly, so a looser fake is fine */
  });
  return filters;
}
global.fetch = async function (url, opts) {
  opts = opts || {};
  const m = url.match(/\/rest\/v1\/([a-z_]+)(\?(.*))?$/);
  if (!m) return { ok: false, status: 404, json: async () => ({ message: 'bad path' }) };
  const table = m[1], qs = m[3] || '';
  if (!db[table]) return { ok: false, status: 404, json: async () => ({ message: 'relation "' + table + '" does not exist' }) };
  const filters = eqFilters(qs);
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
      if (existing) Object.assign(existing, body); else db[table].push(body);
      return { ok: true, status: 201, json: async () => [body] };
    }
    if (table === 'dya_accounts') {
      if (db[table].find(r => r.email === body.email)) return { ok: false, status: 409, json: async () => ({ message: 'duplicate key' }) };
    }
    if (table === 'dya_tournament_players') {
      if (db[table].find(r => r.tournament_id === body.tournament_id && r.net_id === body.net_id)) {
        return { ok: false, status: 409, json: async () => ({ message: 'duplicate key value violates unique constraint' }) };
      }
    }
    const row = Object.assign({ created_at: new Date().toISOString(), joined_at: new Date().toISOString() }, body);
    db[table].push(row);
    return { ok: true, status: 201, json: async () => (wantsRep ? [row] : null) };
  }
  if (method === 'PATCH') {
    const hit = db[table].filter(match);
    hit.forEach(r => Object.assign(r, body));
    return wantsRep ? { ok: true, status: 200, json: async () => hit } : { ok: true, status: 204, json: async () => null };
  }
  if (method === 'DELETE') {
    db[table] = db[table].filter(r => !match(r));
    return { ok: true, status: 204, json: async () => null };
  }
  return { ok: false, status: 405, json: async () => ({ message: 'nope' }) };
};

/* ---------- load the game ---------- */
window.DYA_CONFIG = { supabase: { url: 'https://fake.supabase.co', anonKey: 'x'.repeat(40) } };
const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/mods.js', 'js/core/account_cloud.js', 'js/core/token.js',
  'js/core/state.js', 'js/core/tournaments_online.js', 'js/engine/behaviors.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA;
const G = DYAG.state;
const TO = DYAG.tournamentsOnline;

/* the game client normally provides DYA.play.accountPouch; stub it for AI fill */
DYAG.play = DYAG.play || {};
DYAG.play.accountPouch = function (acc) {
  const ids = (acc.pouches && acc.pouches[0]) ? acc.pouches[0].tokenIds : Object.keys(acc.tokens || {});
  return ids.map(id => acc.tokens[id]).filter(Boolean).slice(0, 15);
};

const TK = DYAG.token, SP = DYAG.species;
function giveTokens(n) {
  const rng = new DYAG.util.Rng(DYAG.util.newSeed());
  for (let i = 0; i < n; i++) { const t = TK.mint({ speciesId: rng.pick(SP.craftable), rng, owner: G.me.id }); G.me.tokens[t.id] = t; }
}
function myPouch() { return Object.values(G.me.tokens).slice(0, 5); }

(async function main() {
  console.log('== ONLINE TOURNAMENTS: shared, real-players-first, official-only titles ==');

  /* ---------- device A: Alice creates a shared tournament ---------- */
  G.init();
  const a = await G.createAccount('alice@dya.test', 'secret123', 'Alice');
  check('device A signed up', !!a.acc, a.err);
  G.me.level = 8; giveTokens(6); G.saveNow(); // a real player who enters tournaments

  const cr = await TO.create({ name: 'Friday Night Brawl', size: 4, structure: 'single', pouchFormat: 'single', entryFee: 0, myPouch: myPouch() });
  check('create returns an id', !!cr.id, cr.err);
  const trnId = cr.id;
  check('one tournament row exists', db.dya_tournaments.length === 1);
  check('player-run event is NOT official (no titles)', db.dya_tournaments[0].official === false);
  check('player-run event carries no title pool', (db.dya_tournaments[0].data.titlePool || []).length === 0);
  check('organizer took the only seat so far', db.dya_tournament_players.filter(r => r.tournament_id === trnId).length === 1);

  /* re-joining is refused (atomic seat) */
  await TO.refresh();
  const dupJoin = await TO.join(G.world.tournaments[trnId], myPouch(), null);
  check('cannot double-register', !!dupJoin.err, 'expected an error');
  check('still one seat after a dup attempt', db.dya_tournament_players.filter(r => r.tournament_id === trnId).length === 1);

  /* ---------- device B: Bob joins Alice's tournament ---------- */
  await DYAG.accountCloud.pushNow(G.me); // persist Alice's netId to the cloud before switching devices
  newDevice();
  G.init();
  const b = await G.createAccount('bob@dya.test', 'secret123', 'Bob');
  check('device B signed up', !!b.acc, b.err);
  G.me.level = 8; giveTokens(6); G.saveNow();
  await TO.refresh();
  const seen = G.world.tournaments[trnId];
  check('device B sees Alice’s shared tournament', !!seen && seen.online === true);
  const bobJoin = await TO.join(seen, myPouch(), null);
  check('friend on another device can join', !bobJoin.err, bobJoin.err);
  check('now two real players are seated', db.dya_tournament_players.filter(r => r.tournament_id === trnId).length === 2);

  /* ---------- password gate ---------- */
  const pcr = await TO.create({ name: 'Locked Cup', size: 4, structure: 'single', pouchFormat: 'single', password: 'hunter2', myPouch: myPouch() });
  await TO.refresh(); // Bob's device
  await DYAG.accountCloud.pushNow(G.me);
  newDevice(); G.init();
  const c = await G.createAccount('cara@dya.test', 'secret123', 'Cara');
  G.me.level = 8; giveTokens(6); G.saveNow();
  await TO.refresh();
  const locked = G.world.tournaments[pcr.id];
  check('password-locked tournament is flagged', !!locked && locked.hasPassword === true);
  const wrongPw = await TO.join(locked, myPouch(), 'nope');
  check('wrong password is rejected', !!wrongPw.err, 'expected rejection');
  const rightPw = await TO.join(locked, myPouch(), 'hunter2');
  check('correct password lets you in', !rightPw.err, rightPw.err);

  /* ---------- go live: real players first, Dya'kukull only pad ---------- */
  /* Alice starts her 4-seat event that has 2 real players (Alice + Bob) */
  await DYAG.accountCloud.pushNow(G.me);
  newDevice(); G.init();
  await G.login('alice@dya.test', 'secret123');
  await TO.refresh();
  const start = await TO.start(G.world.tournaments[trnId]);
  check('start succeeds with real players present', !start.err, start.err);
  const row = db.dya_tournaments.find(r => r.id === trnId);
  const roster = row.data.roster;
  const reals = Object.values(roster).filter(x => !x.ai);
  const ais = Object.values(roster).filter(x => x.ai);
  check('all real registrants are seated', reals.length === 2);
  check('Dya’kukull padded the empty seats only', ais.length === 2 && (reals.length + ais.length) === 4);
  check('the field is NOT exclusively Dya’kukull', reals.length >= 1);
  check('state is now running with a bracket', row.state === 'running' && !!row.data.bracket);

  /* ---------- an all-AI field is refused ---------- */
  const empty = await TO.adminCreate({ name: 'Ghosts Only', size: 4, circuit: 'Local' });
  const badStart = await TO.start({ onlineId: empty.id, id: empty.id, size: 4, circuit: 'Local', structure: 'single' });
  check('a tournament with no real players will not start', !!badStart.err, 'expected refusal');

  /* ---------- official events DO carry a title pool ---------- */
  check('admin-created event is official', db.dya_tournaments.find(r => r.id === empty.id).official === true);
  check('official event carries a title pool', (db.dya_tournaments.find(r => r.id === empty.id).data.titlePool || []).length > 0);

  /* ---------- the shared roster carries both players' pouches ----------
     (both devices read identical pouches from here to build the SAME live
     head-to-head match with no hand-exchanged setup) */
  const rosterRow = db.dya_tournaments.find(r => r.id === trnId).data.roster;
  const realSeats = Object.keys(rosterRow).filter(id => !rosterRow[id].ai);
  check('both real seats carry a non-empty pouch', realSeats.length === 2 && realSeats.every(id => Array.isArray(rosterRow[id].pouch) && rosterRow[id].pouch.length > 0));

  /* ---------- the shared bracket advances on a reported result ---------- */
  await TO.refresh();
  const live = G.world.tournaments[trnId];
  check('running mirror exposes the shared roster for live matches', !!live.roster && Object.keys(live.roster).length === 4);
  /* find Alice's first-round match and report her as the winner */
  let ri = -1, mi = -1;
  live.bracket[0].forEach((mt, i) => { if (mt.a === G.me.id || mt.b === G.me.id) { ri = 0; mi = i; } });
  check('Alice has a first-round match', ri === 0 && mi >= 0);
  const winnerId = G.me.id;
  const rep = await TO.reportMatch(live, ri, mi, winnerId);
  check('reporting a match succeeds', !rep.err, rep.err);
  const row2 = db.dya_tournaments.find(r => r.id === trnId);
  check('the shared bracket recorded the winner', !!row2.data.bracket[0][mi].winner);

  console.log(failures ? ('ONLINE TOURNAMENTS: ' + failures + ' FAILURE(S)') : 'ONLINE TOURNAMENTS: ALL PASS');
  process.exit(failures ? 1 : 0);
})();
