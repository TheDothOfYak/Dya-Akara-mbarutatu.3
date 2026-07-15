/* Cross-device persistence of admin curation.
   Simulates TWO devices sharing one Supabase (mocked dya_config table):
   - Device A (admin) deletes/edits Dya'kukull tokens and publishes.
   - Device B boots fresh, fetches the shared world, and must see the SAME
     curation — deleted AI tokens stay gone — while its own real player is
     left untouched. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

/* ---------- shared in-memory dya_config table across both "devices" ---------- */
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
      items.forEach(it => {
        const ex = rows.find(r => r.key === it.key);
        if (ex) Object.assign(ex, it); else rows.push(Object.assign({}, it));
      });
      return { ok: true, status: 201, json: async () => items };
    }
    return { ok: false, status: 405, json: async () => ({ message: 'nope' }) };
  };
}

/* ---------- a fresh, isolated "device" (its own globals + localStorage) ---------- */
function bootDevice(seedTag) {
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
  for (const f of files) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    vm.runInContext(code + '\n//# sourceURL=' + f, sandbox);
  }
  sandbox.DYA.state.init();
  return sandbox.DYA;
}

(async function main() {
  console.log('== SHARED ADMIN WORLD (cross-device) ==');

  /* ---- Device A: the admin ---- */
  const A = bootDevice('A');
  const GA = A.state;
  GA.isAdminSession = true;

  // a real player on device A (must survive on B only via account_cloud, not this)
  const anAi = Object.values(GA.world.accounts).find(a => a.ai);
  check('device A generated a local Dya’kukull world', !!anAi);

  // delete ALL tokens from one AI account, and remember the account id
  const aiId = anAi.id;
  const beforeCount = Object.keys(anAi.tokens).length;
  Object.keys(anAi.tokens).forEach(tid => delete anAi.tokens[tid]);
  check('device A emptied an AI collection', Object.keys(GA.world.accounts[aiId].tokens).length === 0, 'had ' + beforeCount);

  // publish the curated world
  const pub = await GA.publishAdminWorld();
  check('device A published the shared world', pub.ok, pub.err);
  check('shared world row exists in dya_config', db.dya_config.some(r => r.key === 'adminworld'));

  /* ---- Device B: a different device, boots fresh, then pulls ---- */
  const B = bootDevice('B');
  const GB = B.state;
  // B has its OWN freshly-generated AI world; the same-id account starts full
  const bHadTokens = GB.world.accounts[aiId] ? Object.keys(GB.world.accounts[aiId].tokens).length : -1;
  check('device B starts with the same AI id present & populated (local gen)', bHadTokens > 0 || bHadTokens === -1);

  // give device B a real player that must be preserved through adoption
  const realId = 'real_B_1';
  GB.world.accounts[realId] = { id: realId, ai: false, displayName: 'RealPlayerB', tokens: { t1: { id: 't1' } }, gold: 500, okid: [0,0,0,0,0,0,0], ngakara: 0, pouches: [] };

  const fr = await GB.fetchAdminWorld();
  check('device B adopted the shared world', fr.adopted, fr.err || 'not adopted');

  // the curated deletion is now global: that AI account exists and is empty
  const bAcc = GB.world.accounts[aiId];
  check('device B sees the AI account from the shared world', !!bAcc);
  check('device B sees the emptied AI collection (deletion stuck)', bAcc && Object.keys(bAcc.tokens).length === 0,
    bAcc ? Object.keys(bAcc.tokens).length + ' tokens' : 'missing');

  // real player on device B is untouched
  check('device B real player preserved', !!GB.world.accounts[realId] && GB.world.accounts[realId].displayName === 'RealPlayerB');
  check('device B real player keeps their token', GB.world.accounts[realId] && !!GB.world.accounts[realId].tokens.t1);

  // idempotent: fetching again with no newer push does not re-adopt
  const fr2 = await GB.fetchAdminWorld();
  check('device B does not re-adopt an unchanged shared world', fr2.adopted === false);

  /* ---- mods (creature/economy edits) adopt by timestamp, not stuck rev ---- */
  // device A edits an economy value and pushes it to the shared config
  A.economy.LISTING_FEE = 777;
  A.mods.set('economy', 'LISTING_FEE', 777);
  const mpush = await A.mods.pushRemote();
  check('device A pushed a creature/economy edit', mpush.ok, mpush.err);
  // device B has a HIGHER local rev (as if it edited more times) but an OLDER
  // timestamp — the old code would ignore the remote; the new code adopts it
  B.mods.data.rev = 99999;
  B.mods.data.updatedAt = 1;
  const mfetch = await B.mods.fetchRemote();
  check('device B adopts newer edit despite higher local rev', mfetch.adopted === true, JSON.stringify(mfetch));
  check('device B economy value updated across devices', B.economy.LISTING_FEE === 777, 'got ' + B.economy.LISTING_FEE);

  console.log(failures ? ('\nSHARED WORLD: ' + failures + ' FAILURE(S)') : '\nSHARED WORLD: ALL PASS');
  process.exit(failures ? 1 : 0);
})();
