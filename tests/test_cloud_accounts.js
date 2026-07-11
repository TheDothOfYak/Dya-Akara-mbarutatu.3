/* Headless test for cross-device accounts (js/core/account_cloud.js).
   Simulates two separate computers sharing one mocked Supabase
   backend: clearing localStorage and re-running G.init() between
   "devices" mimics a fresh browser with no local data, while the
   in-memory `db` object plays the role of the persistent cloud. */
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
function newDevice() { lsData = {}; } // fresh browser, empty localStorage — shared `db` (cloud) untouched

/* ---------- in-memory PostgREST fake (the shared "cloud") ---------- */
const db = { dya_accounts: [], dya_bans: [], dya_config: [] };
function parseFilters(qs) {
  const filters = [];
  (qs || '').split('&').forEach(part => {
    if (!part) return;
    const eq = part.indexOf('=');
    const k = part.slice(0, eq), v = decodeURIComponent(part.slice(eq + 1));
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) return;
    if (v.startsWith('eq.')) filters.push(row => String(row[k]) === v.slice(3));
  });
  return filters;
}
global.fetch = async function (url, opts) {
  opts = opts || {};
  const m = url.match(/\/rest\/v1\/([a-z_]+)(\?(.*))?$/);
  if (!m) return { ok: false, status: 404, json: async () => ({ message: 'bad path' }) };
  const table = m[1], qs = m[3] || '';
  if (!db[table]) return { ok: false, status: 404, json: async () => ({ message: 'relation "' + table + '" does not exist' }) };
  const filters = parseFilters(qs);
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
      const dup = db[table].find(r => r.email === body.email);
      if (dup) return { ok: false, status: 409, json: async () => ({ message: 'duplicate key value violates unique constraint "dya_accounts_email_key"' }) };
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
  if (method === 'DELETE') {
    db[table] = db[table].filter(r => !match(r));
    return { ok: true, status: 204, json: async () => null };
  }
  return { ok: false, status: 405, json: async () => ({ message: 'nope' }) };
};

/* ---------- load the game (fresh device #1) ---------- */
window.DYA_CONFIG = { supabase: { url: 'https://fake.supabase.co', anonKey: 'x'.repeat(40) } };
const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/mods.js', 'js/core/account_cloud.js', 'js/core/token.js',
  'js/core/state.js', 'js/engine/behaviors.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA;
let G = DYAG.state;

(async function main() {
  console.log('== CLOUD ACCOUNTS: cross-device login, no local trap ==');

  /* ---------- device A: sign up ---------- */
  G.init();
  const r1 = await G.createAccount('alice@example.com', 'secret123', 'Alice');
  check('sign-up succeeds', !!r1.acc, r1.err);
  const aliceId = r1.acc.id;
  check('sign-up pushes a cloud row', db.dya_accounts.length === 1 && db.dya_accounts[0].email === 'alice@example.com');
  check('starting resources applied', r1.acc.gold === DYAG.economy.START.gold);

  /* mutate on device A, confirm it reaches the cloud. The push is
     debounced ~1s, and sign-up's own G.save() (400ms local debounce)
     can still be pending too — its deferred callback also triggers a
     cloud push and resets the 1s timer, so worst case is ~1.4s before
     it actually lands. Wait comfortably past that. */
  G.me.gold += 250;
  G.saveNow();
  await new Promise(r => setTimeout(r, 1700));
  check('a save on device A updates the cloud row', db.dya_accounts[0].data.gold === r1.acc.gold);

  /* duplicate email is rejected, from the SAME device */
  const dupSame = await G.createAccount('alice@example.com', 'whatever', 'AliceTwo');
  check('duplicate email rejected locally', !!dupSame.err);

  /* ---------- device B: a completely different computer ---------- */
  newDevice();
  G.init(); // fresh, empty local world — nothing carried over except the shared cloud
  check('device B starts with no local accounts', Object.keys(G.world.accounts).filter(id => !G.world.accounts[id].ai).length === 0);

  const badLogin = await G.login('alice@example.com', 'wrongpassword');
  check('wrong password rejected on a fresh device', !!badLogin.err);

  const r2 = await G.login('alice@example.com', 'secret123');
  check('login on device B finds the SAME account', !r2.err && r2.acc.id === aliceId, r2.err);
  check('device B sees the gold device A saved', r2.acc.gold === r1.acc.gold);
  check('no duplicate account rows were created', db.dya_accounts.length === 1);

  /* duplicate email rejected from a DIFFERENT device too */
  const dupOther = await G.createAccount('alice@example.com', 'newpass', 'AliceThree');
  check('duplicate email rejected across devices', !!dupOther.err);

  /* device B makes its own edit */
  G.me.level = 7;
  G.saveNow();
  check('device B\'s edit reaches the cloud', db.dya_accounts[0].data.level === 7);

  /* ---------- device A again: sees device B's change ---------- */
  newDevice();
  G.init();
  const r3 = await G.login('alice@example.com', 'secret123');
  check('device A (fresh) sees the level device B set', r3.acc.level === 7);

  /* ---------- bans travel too ---------- */
  G.admin.ban(aliceId, 'testing the ban pipeline', 3);
  check('ban is recorded in the cloud', db.dya_bans.length === 1 && db.dya_bans[0].account_id === aliceId);

  newDevice();
  G.init();
  const r4 = await G.login('alice@example.com', 'secret123');
  check('a fresh device picks up the ban on login', !!r4.acc && G.isBanned(r4.acc.id), JSON.stringify(G.world.bans));
  check('ban is temporary as specified (not permanent)', G.world.bans[r4.acc.id] && !G.world.bans[r4.acc.id].permanent);

  G.admin.unban(aliceId);
  check('unban clears the cloud ban row', db.dya_bans.length === 0);

  newDevice();
  G.init();
  const r5 = await G.login('alice@example.com', 'secret123');
  check('a fresh device no longer sees the ban after unban', !!r5.acc && !G.isBanned(r5.acc.id));

  /* ---------- offline fallback: cloud not configured behaves exactly as before ---------- */
  delete window.DYA_CONFIG.supabase.url;
  newDevice();
  G.init();
  const localOnly = await G.createAccount('bob@example.com', 'passpass', 'Bob');
  check('offline: account creation still works without cloud config', !!localOnly.acc);
  const localLogin = await G.login('bob@example.com', 'passpass');
  check('offline: login still works locally without cloud config', !localLogin.err && localLogin.acc.displayName === 'Bob');
  check('offline: nothing was pushed to the cloud', db.dya_accounts.length === 1); // still just Alice from before

  console.log(failures ? 'CLOUD ACCOUNTS: ' + failures + ' FAILURE(S)' : 'CLOUD ACCOUNTS: ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
