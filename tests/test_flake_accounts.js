/* Headless test for the one Flake Games account (js/flake/account.js):
   signing in on the home page with an existing Dya'Akara account,
   making a new account there that Dya'Akara then fills in, bans for one
   game or every game, and the home page's editable text. (The 4 Brothers
   Worlds save on the account is tests/test_fbw_cloud.js.) */
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
function makeStorage() {
  let d = {};
  return {
    getItem: k => (k in d ? d[k] : null),
    setItem: (k, v) => { d[k] = String(v); },
    removeItem: k => { delete d[k]; },
    key: i => Object.keys(d)[i] || null,
    get length() { return Object.keys(d).length; },
    _clear: () => { d = {}; },
  };
}
global.localStorage = makeStorage();
global.location = { pathname: '/dya-akara.html' };
global.Image = function () { return { onload: null, set src(v) {} }; };

/* ---------- in-memory PostgREST fake ---------- */
const db = { dya_accounts: [], dya_bans: [], dya_config: [] };
const KEYS = { dya_accounts: 'id', dya_bans: 'account_id', dya_config: 'key' };
function filtersOf(qs) {
  const out = [];
  (qs || '').split('&').forEach(part => {
    if (!part) return;
    const i = part.indexOf('='); const k = part.slice(0, i), v = decodeURIComponent(part.slice(i + 1));
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) return;
    if (v.startsWith('eq.')) out.push(r => String(r[k]) === v.slice(3));
    if (v.startsWith('like.')) { const re = new RegExp('^' + v.slice(5).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'); out.push(r => re.test(String(r[k]))); }
  });
  return out;
}
function project(row, qs) {
  const m = (qs || '').match(/(?:^|&)select=([^&]*)/);
  const sel = m ? decodeURIComponent(m[1]) : '*';
  if (sel === '*') return JSON.parse(JSON.stringify(row));
  const o = {};
  sel.split(',').forEach(p => {
    const c = p.indexOf(':'); const alias = c > 0 ? p.slice(0, c) : null; const pathStr = c > 0 ? p.slice(c + 1) : p;
    const j = pathStr.match(/^(\w+)->>(\w+)$/);
    const v = j ? (row[j[1]] || {})[j[2]] : row[pathStr];
    o[alias || pathStr] = v === undefined ? null : JSON.parse(JSON.stringify(v));
  });
  return o;
}
global.fetch = async function (url, opts) {
  opts = opts || {};
  const m = url.match(/\/rest\/v1\/([a-z_]+)(\?(.*))?$/);
  const table = m[1], qs = m[3] || '';
  const match = r => filtersOf(qs).every(f => f(r));
  const method = (opts.method || 'GET').toUpperCase();
  const body = opts.body ? JSON.parse(opts.body) : null;
  const res = (status, data) => ({ ok: status < 400, status, json: async () => data, headers: { get: () => null } });
  if (method === 'GET') return res(200, db[table].filter(match).map(r => project(r, qs)));
  if (method === 'POST') {
    const key = KEYS[table];
    const ex = db[table].find(r => r[key] === body[key]);
    if (/on_conflict=/.test(qs)) { if (ex) Object.assign(ex, body); else db[table].push(body); return res(201, null); }
    if (ex || (table === 'dya_accounts' && db[table].some(r => r.email === body.email))) return res(409, { message: 'duplicate key value' });
    db[table].push(Object.assign({ created_at: new Date().toISOString() }, body));
    return res(201, null);
  }
  if (method === 'PATCH') { db[table].filter(match).forEach(r => Object.assign(r, body)); return res(204, null); }
  if (method === 'DELETE') { db[table] = db[table].filter(r => !match(r)); return res(204, null); }
  return res(405, {});
};

/* ---------- load ---------- */
window.DYA_CONFIG = { supabase: { url: 'https://fake.supabase.co', anonKey: 'x'.repeat(40) } };
const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/mods.js', 'js/core/account_cloud.js', 'js/core/online_gate.js',
  'js/core/token.js', 'js/core/state.js', 'js/engine/behaviors.js', 'js/flake/account.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const F = window.FLAKE, G = DYA.state, EC = DYA.economy;
const wait = ms => new Promise(r => setTimeout(r, ms));

(async function main() {
  console.log('== FLAKE GAMES: one account for every game ==');
  G.init();

  /* an existing Dya'Akara player, from before Flake Games */
  const old = await G.createAccount('old@example.com', 'oldpass', 'OldTimer');
  check('a Dya’Akara account exists to start with', !!old.acc, old.err);
  G.me.gold = 4321; G.me.tutorial.done = true; G.saveNow();
  await wait(1700);
  G.logout();

  check('the home page hashes passwords the same way', db.dya_accounts[0].pass_hash === F.hashPass('oldpass'));
  const bad = await F.signIn('old@example.com', 'nope');
  check('a wrong password is refused', bad.err === 'Incorrect password.', bad.err);
  const none = await F.signIn('nobody@example.com', 'x');
  check('an unknown email is refused', !!none.err);
  const ok = await F.signIn('OLD@example.com ', 'oldpass');
  check('the old account signs in on the home page', !!ok.who && ok.who.id === old.acc.id, ok.err);
  check('…with its display name', ok.who && ok.who.name === 'OldTimer');
  check('the session is remembered in this browser', F.session() && F.session().id === old.acc.id);
  check('the session keeps no password, only the account’s hash', !/oldpass/.test(localStorage.getItem('flake-session')));
  check('the remembered session verifies', (await F.verify()).ok === true);

  /* Dya'Akara picks the session up */
  const s = F.session();
  const r = await G.loginHash(s.email, s.passHash);
  check('Dya’Akara signs in from the session', !r.err && G.me.id === old.acc.id, r.err);
  check('…and the old progress is all there', G.me.gold === 4321 && G.me.tutorial.done === true);
  check('…with no first-visit setup for an old account', !G.me.dyaSetupPending);
  const badHash = await G.loginHash(s.email, 'not-the-hash');
  check('a wrong hash is refused', !!badHash.err);
  G.logout();

  /* a new account made on the home page */
  F.signOut();
  check('signing out forgets the session', F.session() === null);
  const dup = await F.createAccount('old@example.com', 'whatever', 'Copycat');
  check('an email already in use is refused', /already exists/.test(dup.err || ''), dup.err);
  check('a too-short name is refused', !!(await F.createAccount('a@b.c', 'pass', 'x')).err);
  const made = await F.createAccount('new@example.com', 'newpass', 'Newbie');
  check('a new account is made', !!made.who, made.err);
  const row = db.dya_accounts.find(x => x.email === 'new@example.com');
  check('…as a bare row marked new', row && row.data.flakeNew === true && row.data.displayName === 'Newbie');
  check('…and is signed in', F.session() && F.session().id === made.who.id);
  check('Torcain’s Run’s sign-in reads it (name from data)', (await F.signIn('new@example.com', 'newpass')).who.name === 'Newbie');

  G.init();
  const r2 = await G.loginHash('new@example.com', F.session().passHash);
  check('Dya’Akara opens the new account', !r2.err, r2.err);
  check('…fills in every field it needs', G.me && G.me.tokens && Array.isArray(G.me.okid) && G.me.settings && G.me.tutorial);
  check('…gives the starting resources once', G.me.gold === EC.START.gold && G.me.okid[0] === EC.START.okid);
  check('…and asks for appearance and region first', G.me.dyaSetupPending === true && !G.me.flakeNew);
  G.me.gold += 5; delete G.me.dyaSetupPending; G.saveNow();
  await wait(1700);
  G.logout(); G.init();
  await G.loginHash('new@example.com', F.session().passHash);
  check('the starting resources are not given twice', G.me.gold === EC.START.gold + 5, G.me.gold);
  check('a completed account is left alone', G.completeAccount(G.me).gold === EC.START.gold + 5);

  /* password changed elsewhere → the remembered session no longer verifies */
  const hold = row.pass_hash;
  row.pass_hash = F.hashPass('changed');
  check('a changed password ends the remembered session', (await F.verify()).ok === false);
  row.pass_hash = hold;

  /* bans: one game, every game, and Dya'Akara's own */
  const id = made.who.id;
  check('no bans to start', F.banFor(await F.fetchBans(id), 'rpg') === null);
  await F.setBan(id, 'rpg', { reason: 'testing', permanent: true, at: Date.now() });
  let bans = await F.fetchBans(id);
  check('a Torcain’s Run ban stops Torcain’s Run', !!F.banFor(bans, 'rpg'));
  check('…but not the 4 Brothers Worlds', F.banFor(bans, '4bw') === null);
  check('…and not the home page', F.banFor(bans, null) === null);
  await F.setBan(id, 'all', { reason: 'everything', permanent: false, until: Date.now() + 864e5, at: Date.now() });
  bans = await F.fetchBans(id);
  check('an every-game ban stops every game', ['game', 'rpg', '4bw', 'ld'].every(g => F.banFor(bans, g) && F.banFor(bans, g).scope === 'all'));
  check('…and the home page', !!F.banFor(bans, null));
  check('the ban text names it', /every Flake Games game/.test(F.banText(F.banFor(bans, null))));
  const listed = await F.fetchAllBans();
  check('the Admin Panel lists both', listed[id] && listed[id].rpg && listed[id].all);
  await F.setBan(id, 'all', null); await F.setBan(id, 'rpg', null);
  check('lifting both clears the record', !db.dya_config.some(x => x.key === 'ban:' + id));
  await F.setBan(id, 'ld', { reason: 'old', permanent: false, until: Date.now() - 1000 });
  check('an expired ban stops nothing', F.banFor(await F.fetchBans(id), 'ld') === null);
  db.dya_bans.push({ account_id: id, reason: 'guild', permanent: true, until: null });
  bans = await F.fetchBans(id);
  check('Dya’Akara’s own ban shows as a Dya’Akara ban', bans.game && bans.game.reason === 'guild');
  check('…and does not stop the other games', F.banFor(bans, 'rpg') === null && F.banFor(bans, null) === null);

  /* the home page's editable text */
  check('the studio is Flake Games by default', F.hubConfig().studio === 'Flake Games');
  await F.saveHubConfig({ studio: 'Yak Games', games: { rpg: { tagline: 'Sail on' } } });
  localStorage.removeItem('flake-hub-cache');
  const hub = await F.fetchHubConfig();
  check('the studio name can be changed', hub.studio === 'Yak Games');
  const rpg = F.GAMES.find(g => g.id === 'rpg');
  check('a game’s tagline can be changed', F.gameText(rpg, hub).tagline === 'Sail on');
  check('…and its name keeps the default', F.gameText(rpg, hub).name === rpg.name);
  check('a blank studio name falls back to Flake Games', (await F.saveHubConfig({ studio: '  ' }), F.hubConfig().studio === 'Flake Games'));

  console.log(failures ? '\n' + failures + ' FAILED' : '\nall passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
