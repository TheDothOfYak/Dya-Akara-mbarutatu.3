/* The AI world (the Dya'kukull + their market) must never silently vanish.
   A bug let an empty/blank shared snapshot wipe every device's Dya'kukull,
   leaving no one online and a market with only real players' listings. These
   tests lock in the three guards that fix it:
     1. ensureAiPopulation() reseeds a world whose AI was wiped.
     2. fetchAdminWorld() refuses to adopt an AI-less shared snapshot.
     3. publishAdminWorld() refuses to publish an empty world (heals first). */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

/* ---------- shared in-memory dya_config table across "devices" ---------- */
const db = { dya_config: [] };
function makeFetch() {
  return async function (url, opts) {
    opts = opts || {};
    const method = opts.method || 'GET';
    const u = new URL(url);
    const table = u.pathname.split('/rest/v1/')[1].split('?')[0];
    const rows = db[table] || (db[table] = []);
    if (method === 'GET') {
      const keyEq = (u.searchParams.get('key') || '').replace(/^eq\./, '');
      const out = rows.filter(r => !keyEq || r.key === keyEq).map(r => ({ value: r.value }));
      return { ok: true, status: 200, json: async () => out };
    }
    if (method === 'POST') {
      const body = JSON.parse(opts.body);
      const items = Array.isArray(body) ? body : [body];
      items.forEach(it => { const ex = rows.find(r => r.key === it.key); if (ex) Object.assign(ex, it); else rows.push(Object.assign({}, it)); });
      return { ok: true, status: 201, json: async () => items };
    }
    return { ok: false, status: 405, json: async () => ({ message: 'nope' }) };
  };
}

function bootDevice() {
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
  const ls = {};
  sandbox.localStorage = { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } };
  sandbox.location = { pathname: '/index.html' };
  sandbox.Image = function () { return { onload: null, set src(v) {} }; };
  sandbox.fetch = makeFetch();
  sandbox.DYA_CONFIG = { supabase: { url: 'https://fake.supabase.co', anonKey: 'x'.repeat(40) } };
  sandbox.console = console;
  sandbox.setTimeout = setTimeout; sandbox.clearTimeout = clearTimeout;
  sandbox.setInterval = () => 0; sandbox.clearInterval = () => {};
  const files = [
    'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
    'js/data/lore.js', 'js/core/mods.js', 'js/core/account_cloud.js', 'js/core/token.js', 'js/core/state.js',
    'js/engine/behaviors.js',
  ];
  const vm = require('vm');
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f, sandbox);
  sandbox.DYA.state.init();
  return sandbox.DYA;
}

const aiAccounts = (G) => Object.values(G.world.accounts).filter(a => a.ai);
const aiListings = (G) => Object.values(G.world.market.listings).filter(l => { const s = G.world.accounts[l.sellerId]; return s && s.ai; });

(async function main() {
  console.log('== AI WORLD HEAL (no ghost town) ==');

  /* ---- 1. a fresh device generates the Dya'kukull world ---- */
  const A = bootDevice().state;
  const born = aiAccounts(A).length;
  check('a fresh device generated the Dya’kukull', born >= 90, 'got ' + born);
  check('and stocked their market', aiListings(A).length > 0, aiListings(A).length + ' AI listings');

  /* ---- 2. a wipe self-heals ---- */
  Object.keys(A.world.accounts).forEach(id => { if (A.world.accounts[id].ai) delete A.world.accounts[id]; });
  Object.values(A.world.market.listings).forEach(l => { if (!A.world.accounts[l.sellerId]) delete A.world.market.listings[l.id]; });
  A.world.elbergiId = null;
  check('wipe emptied the AI world', aiAccounts(A).length === 0, 'still ' + aiAccounts(A).length);
  const healed = A.ensureAiPopulation();
  check('ensureAiPopulation() reports it healed', healed === true);
  check('the Dya’kukull are back', aiAccounts(A).length >= 90, 'got ' + aiAccounts(A).length);
  check('Elbergi the merchant is restored', !!(A.world.elbergiId && A.world.accounts[A.world.elbergiId]));
  check('the market is repopulated', aiListings(A).length > 0, aiListings(A).length + ' AI listings');
  check('a healthy world is left alone (no-op)', A.ensureAiPopulation() === false);

  /* ---- 3. a device must NOT adopt an AI-less shared snapshot ---- */
  db.dya_config.length = 0;
  const now = Date.now();
  db.dya_config.push({ key: 'adminworld', value: { rev: 9, updatedAt: now, accounts: {}, market: { listings: {} } } });
  db.dya_config.push({ key: 'adminworld_meta', value: { rev: 9, updatedAt: now } });
  const B = bootDevice().state;
  const beforeB = aiAccounts(B).length;
  const r = await B.fetchAdminWorld();
  check('empty shared snapshot is not adopted', r && r.adopted === false, JSON.stringify(r));
  check('device kept its Dya’kukull (no wipe)', aiAccounts(B).length === beforeB && beforeB >= 90, 'now ' + aiAccounts(B).length);

  /* ---- 4. publishing an empty world is refused (and heals first) ---- */
  db.dya_config.length = 0;
  const C = bootDevice().state;
  Object.keys(C.world.accounts).forEach(id => { if (C.world.accounts[id].ai) delete C.world.accounts[id]; });
  Object.values(C.world.market.listings).forEach(l => { if (!C.world.accounts[l.sellerId]) delete C.world.market.listings[l.id]; });
  C.world.elbergiId = null;
  const pub = await C.publishAdminWorld();
  const shared = db.dya_config.find(r => r.key === 'adminworld');
  const sharedCount = shared ? Object.keys(shared.value.accounts || {}).length : 0;
  check('publish never writes an empty world', sharedCount > 0, 'shared has ' + sharedCount + ' accounts');
  check('publish healed then succeeded', pub && pub.ok === true, JSON.stringify(pub));

  console.log(failures ? ('\nAI WORLD HEAL: ' + failures + ' FAILURE(S)') : '\nAI WORLD HEAL: ALL PASS');
  process.exit(failures ? 1 : 0);
})();
