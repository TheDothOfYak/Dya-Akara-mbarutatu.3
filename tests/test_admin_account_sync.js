/* Headless test for admin→player account propagation.
   The Admin Panel edits a real player's account (e.g. re-statting one of
   their creatures). Those edits must actually reach the player's game:
     • an admin edit is AUTHORITATIVE (bumps adminRev + save clock);
     • an offline player picks it up at their next login;
     • a logged-in player picks it up live (G.pullMyAccountEdits);
     • the player's own routine save NEVER clobbers a newer admin edit —
       it adopts it instead.
   Uses the same mocked-Supabase scaffold as test_cloud_accounts.js. */
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
      if (existing) Object.assign(existing, body); else db[table].push(body);
      return { ok: true, status: 201, json: async () => [body] };
    }
    if (table === 'dya_accounts') {
      const dup = db[table].find(r => r.email === body.email);
      if (dup) return { ok: false, status: 409, json: async () => ({ message: 'duplicate key' }) };
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
const G = global.DYA.state, AC = global.DYA.accountCloud, SP = global.DYA.species;
const cloudRow = id => db.dya_accounts.find(r => r.id === id);
const cloudHp = id => cloudRow(id).data.tokens.tokX.stats.hp;

/* simulate an admin editing this account directly in the cloud, exactly as the
   Admin Panel's authoritative push does (bump adminRev + freshen savedAt) */
function adminEdit(id, mutate) {
  const row = cloudRow(id);
  const acc = JSON.parse(JSON.stringify(row.data));
  acc.adminRev = (acc.adminRev || 0) + 1;
  acc.savedAt = Date.now() + 5000;
  mutate(acc);
  row.data = acc;
  row.updated_at = new Date().toISOString();
}
/* the admin re-stats a creature (editToken marks it adminEdited) */
function adminEditHp(id, hp) { adminEdit(id, a => { a.tokens.tokX.stats.hp = hp; a.tokens.tokX.adminEdited = true; }); }
/* the admin grants resources (recorded as a one-time ledger entry) */
function adminGrant(id, res) { adminEdit(id, a => { a.adminGrants = (a.adminGrants || []).concat([Object.assign({ id: 'agr-' + Math.random().toString(36).slice(2) }, res)]); }); }
/* the admin deletes a creature (tombstoned so the player's merge removes it) */
function adminDeleteToken(id, tokId) { adminEdit(id, a => { delete a.tokens[tokId]; a.adminDeleted = (a.adminDeleted || []).concat([tokId]); }); }

(async function main() {
  console.log('== ADMIN ACCOUNT SYNC: admin edits reach the player ==');

  const spid = SP.list[0].id;

  /* 1) player creates an account with a creature, seeds the cloud */
  G.init();
  const r1 = await G.createAccount('alice@example.com', 'secret123', 'Alice');
  check('sign-up works', !!r1.acc, r1.err);
  const id = r1.acc.id;
  G.me.tokens['tokX'] = { id: 'tokX', speciesId: spid, name: 'Nibbler', rarity: 1, element: 'Fti', stats: { hp: 10, dmg: 1, speed: 40 } };
  G.me.savedAt = Date.now();
  await AC.pushNow(G.me);
  check('creature seeded to cloud at hp 10', cloudHp(id) === 10);

  /* 2) the ADMIN PANEL path: a fresh admin device loads the account, edits the
        creature, and pushes — authoritatively */
  newDevice(); G.init(); G.isAdminSession = true;
  (await AC.fetchAll()).forEach(r => { const a = r.data; a.id = r.id; a.email = r.email; a.passHash = r.pass_hash; G.world.accounts[a.id] = a; });
  const aAcc = G.world.accounts[id];
  check('admin can load the cloud account it never made locally', !!aAcc);
  aAcc.tokens.tokX.stats.hp = 999;
  G.pushAccountToCloud(aAcc);
  await sleep(60);
  check('admin edit bumps the account admin revision', (cloudRow(id).data.adminRev || 0) === 1, 'rev=' + (cloudRow(id).data.adminRev));
  check('admin edit reaches the cloud (hp 999)', cloudHp(id) === 999);
  G.isAdminSession = false;

  /* 3) an OFFLINE player logs in fresh → adopts the admin edit */
  newDevice(); G.init();
  const r3 = await G.login('alice@example.com', 'secret123');
  check('login succeeds after the admin edit', !!r3.acc, r3.err);
  check('offline player picks up the admin edit at login (hp 999)', G.me.tokens.tokX.stats.hp === 999, 'hp=' + G.me.tokens.tokX.stats.hp);

  /* 4) a logged-in player picks up a later admin edit LIVE and MERGES it —
        keeping the progress they made in the meantime */
  const goldBefore = G.me.gold;
  G.me.gold += 100;                                                  // the player earns some gold
  G.me.tokens['tokMine'] = { id: 'tokMine', speciesId: spid, name: 'Homegrown', rarity: 0, element: 'Fti', stats: { hp: 5, dmg: 1, speed: 30 } };  // and crafts a token
  adminEditHp(id, 1234);                                             // admin re-stats the OTHER creature
  check('before live sync the player still shows the old value', G.me.tokens.tokX.stats.hp === 999);
  await G.pullMyAccountEdits();
  await sleep(30);
  check('live merge applies the admin edit (hp 1234)', G.me.tokens.tokX.stats.hp === 1234, 'hp=' + G.me.tokens.tokX.stats.hp);
  check('merge KEEPS the gold the player earned', G.me.gold === goldBefore + 100, 'gold=' + G.me.gold);
  check('merge KEEPS the token the player crafted', !!G.me.tokens.tokMine);
  check('local admin revision advanced to match', (G.me.adminRev || 0) === 2, 'rev=' + G.me.adminRev);

  /* 5) the player's own routine save must NOT clobber a newer admin edit, and
        must preserve the local change being saved */
  adminEditHp(id, 555);            // cloud adminRev 3
  G.me.gold += 50;                 // a local change about to be saved
  const res = await AC.pushSelfGuarded(G.me);
  await sleep(30);
  check('a guarded save yields to (merges) the newer admin edit', res && res.adopted === true);
  check('the admin edit was NOT clobbered in the cloud (hp 555)', cloudHp(id) === 555, 'cloud hp=' + cloudHp(id));
  check('the player merged the admin edit locally (hp 555)', G.me.tokens.tokX.stats.hp === 555, 'hp=' + G.me.tokens.tokX.stats.hp);
  check('the player\'s own +50 gold survived the merge', G.me.gold === goldBefore + 150, 'gold=' + G.me.gold);

  /* 6) a resource grant merges additively — applied once, never lost */
  const goldPreGrant = G.me.gold;
  adminGrant(id, { gold: 500 });
  await G.pullMyAccountEdits();
  await sleep(30);
  check('an admin gold grant is added on top of the player\'s gold', G.me.gold === goldPreGrant + 500, 'gold=' + G.me.gold);
  await G.pullMyAccountEdits();   // a second sync must NOT double-apply it
  await sleep(30);
  check('the grant is applied exactly once (no double-count)', G.me.gold === goldPreGrant + 500, 'gold=' + G.me.gold);

  /* 7) an admin deletion is tombstoned and removed by the merge */
  adminDeleteToken(id, 'tokX');
  await G.pullMyAccountEdits();
  await sleep(30);
  check('the admin-deleted creature is gone locally', !G.me.tokens.tokX);
  check('the player\'s own token is untouched by the deletion', !!G.me.tokens.tokMine);

  console.log(failures ? 'ADMIN ACCOUNT SYNC: ' + failures + ' FAILURE(S)' : 'ADMIN ACCOUNT SYNC: ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
