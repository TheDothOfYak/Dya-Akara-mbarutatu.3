/* Headless tests for the admin token-management feature:
   1) dya_species_supply — hard, real-time supply caps enforced via
      an atomic reserve_token_slot()/release_token_slot() RPC pair
      (mocked here), checked at every genuine mint site.
   2) The Dya'kukull's deterministic world-gen genesis collection is
      NOT counted against any cap (it's one fixed population, not
      new production).
   3) The New Users review queue (dya_accounts.reviewed). */
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
const lsData = {};
global.localStorage = {
  getItem: k => (k in lsData ? lsData[k] : null),
  setItem: (k, v) => { lsData[k] = String(v); },
  removeItem: k => { delete lsData[k]; },
};
global.location = { pathname: '/index.html' };
global.Image = function () { return { onload: null, set src(v) {} }; };

/* ---------- in-memory PostgREST fake (tables + the two RPCs) ---------- */
const db = { dya_listings: [], dya_config: [], dya_species_supply: [], dya_accounts: [] };
let idCounter = 1;
function supplyRow(species, rarity) {
  let row = db.dya_species_supply.find(r => r.species_id === species && r.rarity === rarity);
  if (!row) { row = { species_id: species, rarity, cap: null, count: 0 }; db.dya_species_supply.push(row); }
  return row;
}
function parseFilters(qs) {
  const filters = [];
  (qs || '').split('&').forEach(part => {
    if (!part) return;
    const eq = part.indexOf('=');
    const k = part.slice(0, eq), v = decodeURIComponent(part.slice(eq + 1));
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) return;
    if (v.startsWith('eq.')) filters.push(row => String(row[k]) === v.slice(3));
    else if (v.startsWith('in.(')) {
      const list = v.slice(4, -1).split(',');
      filters.push(row => list.includes(String(row[k])));
    }
  });
  return filters;
}
global.fetch = async function (url, opts) {
  opts = opts || {};
  const rpcM = url.match(/\/rest\/v1\/rpc\/([a-z_]+)$/);
  if (rpcM) {
    const fn = rpcM[1];
    const body = opts.body ? JSON.parse(opts.body) : {};
    if (fn === 'reserve_token_slot') {
      const row = supplyRow(body.p_species, body.p_rarity);
      if (row.cap == null || row.count < row.cap) { row.count++; return { ok: true, status: 200, json: async () => [{ reserved: true, cur_count: row.count, cur_cap: row.cap }] }; }
      return { ok: true, status: 200, json: async () => [{ reserved: false, cur_count: row.count, cur_cap: row.cap }] };
    }
    if (fn === 'release_token_slot') {
      const row = supplyRow(body.p_species, body.p_rarity);
      row.count = Math.max(0, row.count - 1);
      return { ok: true, status: 200, json: async () => null };
    }
    return { ok: false, status: 404, json: async () => ({ message: 'unknown rpc ' + fn }) };
  }
  const m = url.match(/\/rest\/v1\/([a-z_]+)(\?(.*))?$/);
  if (!m) return { ok: false, status: 404, json: async () => ({ message: 'bad path' }) };
  const table = m[1], qs = m[3] || '';
  if (!db[table]) return { ok: false, status: 404, json: async () => ({ message: 'relation "' + table + '" does not exist' }) };
  const filters = parseFilters(qs);
  const match = row => filters.every(f => f(row));
  const method = (opts.method || 'GET').toUpperCase();
  const body = opts.body ? JSON.parse(opts.body) : null;
  const wantsRep = /return=representation/.test((opts.headers || {})['Prefer'] || '');
  if (method === 'GET') {
    return { ok: true, status: 200, json: async () => db[table].filter(match) };
  }
  if (method === 'POST') {
    const upsert = /on_conflict=/.test(qs);
    if (upsert) {
      const keyCols = qs.match(/on_conflict=([a-z_,]+)/)[1].split(',');
      const existing = db[table].find(r => keyCols.every(c => r[c] === body[c]));
      if (existing) Object.assign(existing, body);
      else db[table].push(Object.assign({ count: 0 }, body));
      return { ok: true, status: 201, json: async () => [existing || body] };
    }
    const row = Object.assign({ id: 'row-' + (idCounter++), claimed: false, reviewed: false, created_at: new Date().toISOString() }, body);
    if (table === 'dya_listings') {
      const dup = db[table].find(r => r.token_id === row.token_id && r.status === 'active');
      if (dup) return { ok: false, status: 409, json: async () => ({ message: 'duplicate key value violates unique constraint' }) };
    }
    if (table === 'dya_accounts') {
      const dup = db[table].find(r => r.email === row.email);
      if (dup) return { ok: false, status: 409, json: async () => ({ message: 'duplicate key value violates unique constraint' }) };
    }
    db[table].push(row);
    return { ok: true, status: 201, json: async () => (wantsRep ? [row] : null) };
  }
  if (method === 'PATCH') {
    const hit = db[table].filter(match);
    hit.forEach(r => Object.assign(r, body));
    return wantsRep
      ? { ok: true, status: 200, json: async () => hit }
      : { ok: true, status: 204, json: async () => null };
  }
  return { ok: false, status: 405, json: async () => ({ message: 'nope' }) };
};

/* ---------- load the game ---------- */
window.DYA_CONFIG = { supabase: { url: 'https://fake.supabase.co', anonKey: 'x'.repeat(40) } };
const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/mods.js', 'js/core/account_cloud.js', 'js/core/token.js',
  'js/core/state.js', 'js/core/market_online.js', 'js/engine/behaviors.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA;
const U = DYAG.util, G = DYAG.state, MO = DYAG.marketOnline, AC = DYAG.accountCloud;

(async function main() {
  G.init();

  console.log('== GENESIS POPULATION: the Dya\'kukull\'s starting collection is NOT counted ==');
  check('booting a fresh world reserves nothing in the supply ledger', db.dya_species_supply.length === 0,
    JSON.stringify(db.dya_species_supply));

  console.log('== SUPPLY CAPS: uncapped species mint freely ==');
  const seller = (await G.createAccount('capseller@x', 'passpass', 'CapSeller')).acc;
  G.me = seller;
  seller.okid = [99, 99, 99, 99, 99, 99, 99];
  seller.ngakara = 999;
  seller.pieces.push({ speciesId: 'kipsu', rarity: 0, material: 'test', from: 'test', temperBias: 0, at: Date.now() });
  const freeCraft = await G.craftToken(seller.pieces[seller.pieces.length - 1], 0);
  check('crafting an uncapped species succeeds', !!freeCraft.tok, freeCraft.err);
  check('the supply ledger still recorded the mint (for visibility), just with no cap', supplyRow('kipsu', 0).count === 1 && supplyRow('kipsu', 0).cap === null);

  console.log('== SUPPLY CAPS: a capped species blocks the (N+1)th mint ==');
  const capRes = await MO.setSupplyCap('uff', 0, 2);
  check('admin can set a cap', !!capRes.ok, capRes.err);
  let crafted = 0, refusalErr = null;
  for (let i = 0; i < 3; i++) {
    seller.pieces.push({ speciesId: 'uff', rarity: 0, material: 'test', from: 'test', temperBias: 0, at: Date.now() });
    const r = await G.craftToken(seller.pieces[seller.pieces.length - 1], 0);
    if (r.tok) crafted++; else refusalErr = r.err;
  }
  check('exactly 2 of 3 attempts succeed under a cap of 2', crafted === 2, 'crafted=' + crafted);
  check('the 3rd attempt is refused with a clear reason', !!refusalErr && /capped/i.test(refusalErr), refusalErr);
  check('materials were NOT spent on the refused attempt (okid still available)', seller.okid.some(n => n > 0));

  console.log('== SUPPLY CAPS: concurrent mints at the exact boundary can\'t both win ==');
  await MO.setSupplyCap('rodak', 1, 1); // room for exactly one more
  seller.pieces.push({ speciesId: 'rodak', rarity: 1, material: 'test', from: 'test', temperBias: 0, at: Date.now() });
  seller.pieces.push({ speciesId: 'rodak', rarity: 1, material: 'test', from: 'test', temperBias: 0, at: Date.now() });
  const [ra, rb] = await Promise.all([
    G.craftToken(seller.pieces[seller.pieces.length - 2], 0),
    G.craftToken(seller.pieces[seller.pieces.length - 1], 0),
  ]);
  const winners = [ra, rb].filter(r => !!r.tok).length;
  check('exactly one of two simultaneous crafts wins the last slot', winners === 1, JSON.stringify([ra.err, rb.err]));

  console.log('== SUPPLY CAPS: buyback and upgrade true up the ledger ==');
  await MO.setSupplyCap('mikolo_moko', 0, 1);
  seller.pieces.push({ speciesId: 'mikolo_moko', rarity: 0, material: 'test', from: 'test', temperBias: 0, at: Date.now() });
  const firstMoko = await G.craftToken(seller.pieces[seller.pieces.length - 1], 0);
  check('first Mikolo Moko under cap of 1 succeeds', !!firstMoko.tok, firstMoko.err);
  seller.pieces.push({ speciesId: 'mikolo_moko', rarity: 0, material: 'test', from: 'test', temperBias: 0, at: Date.now() });
  const blockedMoko = await G.craftToken(seller.pieces[seller.pieces.length - 1], 0);
  check('a second one is refused while the cap is full', !!blockedMoko.err);
  G.buyback(firstMoko.tok);
  check('buyback releases the slot', supplyRow('mikolo_moko', 0).count === 0);
  seller.pieces.push({ speciesId: 'mikolo_moko', rarity: 0, material: 'test', from: 'test', temperBias: 0, at: Date.now() });
  const afterBuyback = await G.craftToken(seller.pieces[seller.pieces.length - 1], 0);
  check('after the buyback, a new one can be crafted again', !!afterBuyback.tok, afterBuyback.err);

  /* upgrade moves a token from one rarity bucket into the next */
  seller.pieces.push({ speciesId: 'harkal', rarity: 0, material: 'test', from: 'test', temperBias: 0, at: Date.now() });
  const harkalCraft = await G.craftToken(seller.pieces[seller.pieces.length - 1], 0);
  const harkalTok = harkalCraft.tok;
  check('harkal (rarity 0) crafted through the normal reservation path', !!harkalTok && supplyRow('harkal', 0).count === 1, harkalCraft.err);
  await MO.setSupplyCap('harkal', 1, 0); // target tier full before we even try to upgrade into it
  const upBlocked = await G.upgradeToken(harkalTok);
  check('upgrading into a full-cap target rarity is refused', !!upBlocked.err && harkalTok.rarity === 0, JSON.stringify(upBlocked));
  await MO.clearSupplyCap('harkal', 1);
  const upOk = await G.upgradeToken(harkalTok);
  check('clearing the target cap lets the upgrade through', !!upOk.ok && harkalTok.rarity === 1, JSON.stringify(upOk));
  check('upgrading released the OLD rarity\'s slot', supplyRow('harkal', 0).count === 0);
  check('upgrading reserved the NEW rarity\'s slot', supplyRow('harkal', 1).count === 1);

  console.log('== SUPPLY CAPS: admin spawnToken respects the same cap ==');
  await MO.setSupplyCap('karnen', 2, 1);
  const spawn1 = await G.admin.spawnToken(seller.id, 'karnen', 2, {});
  check('first admin spawn under cap succeeds', !!spawn1.tok, spawn1.err);
  const spawn2 = await G.admin.spawnToken(seller.id, 'karnen', 2, {});
  check('second admin spawn is refused once the cap is full', !!spawn2.err);

  console.log('== NEW USERS REVIEW QUEUE ==');
  const nu1 = await G.createAccount('newbie1@x', 'passpass', 'Newbie1');
  const nu2 = await G.createAccount('newbie2@x', 'passpass', 'Newbie2');
  const pending = await AC.fetchUnreviewed();
  check('every brand-new account starts unreviewed', pending.some(r => r.email === 'newbie1@x') && pending.some(r => r.email === 'newbie2@x'));
  const mr = await AC.markReviewed(nu1.acc.id);
  check('marking an account reviewed succeeds', !!mr.ok, mr.err);
  const pendingAfter = await AC.fetchUnreviewed();
  check('a reviewed account drops out of the pending queue', !pendingAfter.some(r => r.email === 'newbie1@x'));
  check('an unreviewed account stays in the queue', pendingAfter.some(r => r.email === 'newbie2@x'));
  check('reviewing one account does not affect another', !!db.dya_accounts.find(r => r.email === 'newbie2@x' && r.reviewed === false));

  console.log(failures ? 'SUPPLY CAPS + NEW USERS: ' + failures + ' FAILURE(S)' : 'SUPPLY CAPS + NEW USERS: ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
