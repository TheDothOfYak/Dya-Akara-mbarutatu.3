/* Headless test for single-session enforcement (js/core/session_guard.js).
   One account may be active in only one place at a time. Reuses the same
   mocked-Supabase scaffolding as test_cloud_accounts.js:
     • the in-memory `db` plays the shared cloud,
     • claiming the account's session_id from a "second device" must make
       the first device's session check sign itself out,
     • a routine save must NOT clobber the session claim (it lives in its
       own column, not inside `data`),
     • a same-browser second tab (a 'storage' event) kicks the first tab. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- browser stubs ---------- */
global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
/* capture window-level listeners so we can fire a synthetic cross-tab 'storage' event */
const winListeners = {};
global.addEventListener = (type, fn) => { (winListeners[type] = winListeners[type] || []).push(fn); };
let lsData = {};
global.localStorage = {
  getItem: k => (k in lsData ? lsData[k] : null),
  setItem: (k, v) => { lsData[k] = String(v); },
  removeItem: k => { delete lsData[k]; },
};
global.location = { pathname: '/index.html' };
global.Image = function () { return { onload: null, set src(v) {} }; };
/* BroadcastChannel intentionally left undefined → the guard falls back to
   the localStorage 'storage' event path, which is what we exercise below. */

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
  const matchRow = row => filters.every(f => f(row));
  const method = (opts.method || 'GET').toUpperCase();
  const body = opts.body ? JSON.parse(opts.body) : null;
  const wantsRep = /return=representation/.test((opts.headers || {})['Prefer'] || '');
  if (method === 'GET') return { ok: true, status: 200, json: async () => db[table].filter(matchRow) };
  if (method === 'POST') {
    const upsert = /on_conflict=/.test(qs);
    if (upsert) {
      const keyCol = qs.match(/on_conflict=([a-z_]+)/)[1];
      const existing = db[table].find(r => r[keyCol] === body[keyCol]);
      if (existing) Object.assign(existing, body); else db[table].push(body); // merge-duplicates: only overwrites columns PRESENT in body
      return { ok: true, status: 201, json: async () => [body] };
    }
    if (table === 'dya_accounts') {
      const dup = db[table].find(r => r.email === body.email);
      if (dup) return { ok: false, status: 409, json: async () => ({ message: 'duplicate key value violates unique constraint' }) };
    }
    const row = Object.assign({ created_at: new Date().toISOString() }, body);
    db[table].push(row);
    return { ok: true, status: 201, json: async () => (wantsRep ? [row] : null) };
  }
  if (method === 'PATCH') {
    const hit = db[table].filter(matchRow);
    hit.forEach(r => Object.assign(r, body));
    return wantsRep ? { ok: true, status: 200, json: async () => hit } : { ok: true, status: 204, json: async () => null };
  }
  if (method === 'DELETE') { db[table] = db[table].filter(r => !matchRow(r)); return { ok: true, status: 204, json: async () => null }; }
  return { ok: false, status: 405, json: async () => ({ message: 'nope' }) };
};

/* ---------- load the game ---------- */
window.DYA_CONFIG = { supabase: { url: 'https://fake.supabase.co', anonKey: 'x'.repeat(40) } };
const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/mods.js', 'js/core/account_cloud.js', 'js/core/session_guard.js',
  'js/core/token.js', 'js/core/state.js', 'js/engine/behaviors.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA;
const G = DYAG.state, AC = DYAG.accountCloud, SG = DYAG.sessionGuard;

(async function main() {
  console.log('== SINGLE SESSION: one account, one tab, one device ==');

  let kickedReason = null;
  SG.onKicked = (reason) => { kickedReason = reason; };

  /* ---------- sign-up claims the single session slot ---------- */
  G.init();
  const r1 = await G.createAccount('alice@example.com', 'secret123', 'Alice');
  check('sign-up succeeds', !!r1.acc, r1.err);
  const id = r1.acc.id;
  await sleep(60); // let the fire-and-forget claim PATCH land
  const tokenA = SG.token;
  check('sign-in generates a session token', !!tokenA);
  check('the cloud row records THIS session', db.dya_accounts[0].session_id === tokenA, 'cloud=' + db.dya_accounts[0].session_id);
  check('the claim is announced to sibling tabs (localStorage)', lsData['dya:session:' + id] === tokenA);

  /* ---------- a routine save must NOT clobber the session claim ---------- */
  G.me.gold += 500;
  G.saveNow();
  await sleep(1700); // debounced account push (~1.4s) lands
  check('a normal save leaves session_id intact (own column, not in data)', db.dya_accounts[0].session_id === tokenA, 'cloud=' + db.dya_accounts[0].session_id);
  check('the save itself still reached the cloud', db.dya_accounts[0].data.gold === r1.acc.gold);

  /* ---------- another DEVICE signs in → this one is kicked ---------- */
  await AC.claimSession(id, 'DEVICE-B-TOKEN');            // a second device claims the slot
  check('still holding the session before the check', SG.token === tokenA && kickedReason === null);
  SG.check();                                             // our periodic cross-device check
  await sleep(60);
  check('a takeover on another device signs this session out', kickedReason !== null, 'reason=' + kickedReason);
  check('the local session token is cleared on kick', SG.token === null);

  /* a check while already kicked is a harmless no-op */
  kickedReason = null;
  SG.check();
  await sleep(40);
  check('no double-kick once the session is already gone', kickedReason === null);

  /* ---------- a fresh sign-in re-claims the slot ---------- */
  const r2 = await G.login('alice@example.com', 'secret123');
  check('re-login succeeds', !!r2.acc, r2.err);
  await sleep(60);
  const tokenC = SG.token;
  check('re-login claims a NEW session token', !!tokenC && tokenC !== tokenA && tokenC !== 'DEVICE-B-TOKEN');
  check('the cloud now records the newest session', db.dya_accounts[0].session_id === tokenC);

  /* ---------- a second TAB in the same browser kicks this one ---------- */
  kickedReason = null;
  const fire = winListeners.storage || [];
  check('the guard is listening for cross-tab claims', fire.length > 0);
  fire.forEach(fn => fn({ key: 'dya:session:' + id, newValue: 'ANOTHER-TAB-TOKEN' }));
  check('a second tab in the same browser signs this tab out', kickedReason !== null, 'reason=' + kickedReason);
  check('session token cleared after the cross-tab kick', SG.token === null);

  /* ---------- voluntary logout frees the slot ---------- */
  const r3 = await G.login('alice@example.com', 'secret123');
  await sleep(40);
  check('logged back in for the logout test', !!SG.token);
  G.logout();
  check('logout releases the single-session slot', SG.token === null && SG.accountId === null);

  console.log(failures ? 'SINGLE SESSION: ' + failures + ' FAILURE(S)' : 'SINGLE SESSION: ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
