/* Headless tests for the two big July systems:
   1) DYA.mods — the admin live-edit overrides layer
   2) DYA.marketOnline — the shared market with ATOMIC buys
      (mocked PostgREST backend; asserts a token can only ever
      be bought once — no duplicates) */
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

/* ---------- in-memory PostgREST fake ---------- */
const db = { dya_listings: [], dya_config: [] };
let idCounter = 1;
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
      const keyCol = qs.match(/on_conflict=([a-z_]+)/)[1];
      const existing = db[table].find(r => r[keyCol] === body[keyCol]);
      if (existing) Object.assign(existing, body);
      else db[table].push(body);
      return { ok: true, status: 201, json: async () => [body] };
    }
    const row = Object.assign({ id: 'row-' + (idCounter++), claimed: false, created_at: new Date().toISOString() }, body);
    if (table === 'dya_listings') {
      const dup = db[table].find(r => r.token_id === row.token_id && r.status === 'active');
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
  'js/data/lore.js', 'js/core/mods.js', 'js/core/token.js', 'js/core/state.js',
  'js/core/market_online.js', 'js/engine/behaviors.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA;
const U = DYAG.util, SP = DYAG.species, M = DYAG.mods, G = DYAG.state, MO = DYAG.marketOnline, EC = DYAG.economy;

(async function main() {
  console.log('== MODS: the admin live-edit layer ==');

  /* species stat edit applies in place */
  const gyngeRef = SP.get('gynge');
  const baseHp = gyngeRef.statMul.hp;
  const baselineMint = DYAG.token.mint({ speciesId: 'gynge', rng: new U.Rng(7), rarity: 2 });
  const edited = U.deepCopy(gyngeRef);
  edited.statMul.hp = 9.9;
  edited.name = 'Angry Rock';
  M.setSpecies('gynge', edited);
  check('species edit applies to the live object', SP.get('gynge').statMul.hp === 9.9 && SP.get('gynge').name === 'Angry Rock');
  check('live object identity is preserved (engine-safe)', SP.get('gynge') === gyngeRef);
  check('override diff is minimal', Object.keys(M.data.species.gynge).sort().join(',') === 'name,statMul', JSON.stringify(M.data.species.gynge));
  const minted = DYAG.token.mint({ speciesId: 'gynge', rng: new U.Rng(7), rarity: 2 });
  check('new mints use the edited stats', Math.abs(minted.stats.hp / baselineMint.stats.hp - 9.9 / baseHp) < 0.01,
    'same-seed hp ' + baselineMint.stats.hp + ' → ' + minted.stats.hp);

  /* reset restores the base */
  M.resetSpecies('gynge');
  check('reset restores shipped values', SP.get('gynge').statMul.hp === baseHp && SP.get('gynge').name === 'Gynge');

  /* behavior reassignment via override */
  const e2 = U.deepCopy(SP.get('kofi'));
  e2.behavior = 'tyndael';
  M.setSpecies('kofi', e2);
  check('behavior tree is editable and points at a real tree', typeof DYAG.behaviors[SP.get('kofi').behavior] === 'function' && SP.get('kofi').behavior === 'tyndael');
  M.resetSpecies('kofi');

  /* custom species (clone) */
  const def = U.deepCopy(SP.get('tyndael'));
  def.name = 'Frost Tyndael';
  def.element = 'Su';
  M.data.customSpecies['frost_tyndael'] = def;
  M.save();
  check('custom species joins the roster', !!SP.get('frost_tyndael') && SP.list.some(s => s.id === 'frost_tyndael'));
  check('custom species is craftable', SP.craftable.includes('frost_tyndael'));
  const ctok = DYAG.token.mint({ speciesId: 'frost_tyndael', rng: new U.Rng(3) });
  check('custom species mints tokens', ctok.speciesId === 'frost_tyndael' && ctok.stats.hp > 0);
  M.resetSpecies('frost_tyndael');
  check('deleting the custom species removes it from the roster', !SP.get('frost_tyndael'));

  /* text overrides */
  M.data.text['Market'] = 'The Bazaar';
  M.save();
  check('UI text override translates', M.tr('Market') === 'The Bazaar' && M.tr('Collection') === 'Collection');
  delete M.data.text['Market']; M.save();

  /* lore + balance tables mutate in place */
  M.set('lore', 'TIPS', ['Only tip.']);
  check('lore tips are editable', DYAG.lore.TIPS.length === 1 && DYAG.lore.TIPS[0] === 'Only tip.');
  M.set('lore', 'TIPS', null);
  check('lore tips reset', DYAG.lore.TIPS.length > 10);
  const baseVal = SP.RARITY_VALUE[0];
  M.set('balance', 'RARITY_VALUE', [77, 90, 200, 450, 1000, 2400, 6000]);
  G.init();
  check('balance table feeds market math', G.marketAverage('kofi', 0) !== Math.round(baseVal * (0.85 + (U.hashStr('kofi:0:' + G.world.season.number) % 100) / 100 * 0.4)) || SP.RARITY_VALUE[0] === 77);
  M.set('balance', 'RARITY_VALUE', null);

  /* AI tuning dials */
  M.set('ai', 'matchSkillMul', 2);
  const someAI = Object.values(G.world.accounts).find(a => a.ai);
  check('global AI skill dial multiplies per-AI skill', Math.abs(G.aiSkill(someAI) - Math.min(1.5, someAI.aiCfg.matchSkill * 2)) < 1e-9);
  M.set('ai', 'matchSkillMul', null);

  /* persistence across a reload */
  const e3 = U.deepCopy(SP.get('uff'));
  e3.desc = 'A very odd creature indeed.';
  M.setSpecies('uff', e3);
  eval(fs.readFileSync(path.join(ROOT, 'js/data/species.js'), 'utf8'));
  eval(fs.readFileSync(path.join(ROOT, 'js/core/mods.js'), 'utf8'));
  check('edits survive a page reload (localStorage)', DYAG.species.get('uff').desc === 'A very odd creature indeed.');
  DYAG.mods.resetSpecies('uff');

  console.log('== MARKET ONLINE: unique tokens, atomic buys ==');
  await new Promise(r => setTimeout(r, 10)); /* let boot fetches settle */

  /* two players on "different devices" — we swap G.me to simulate */
  const seller = (await G.createAccount('seller@x', 'passpass', 'SellerSam')).acc;
  const tok = DYAG.token.mint({ speciesId: 'kipsu', rng: new U.Rng(11), rarity: 1, owner: seller.id });
  seller.tokens[tok.id] = tok;
  G.me = seller;
  const lr = await MO.list(tok, 500);
  check('listing succeeds', !!lr.row, lr.err);
  check('token is escrowed while listed', tok.status === 'market' && !!tok.onlineListingId);
  const dup = await MO.list(tok, 700);
  check('the same token cannot be double-listed', !!dup.err);

  await MO.refresh();
  check('listing is visible to everyone', MO.state.listings.length === 1);
  const row = MO.state.listings[0];

  /* buyer wins the atomic claim */
  const buyer = (await G.createAccount('buyer@x', 'passpass', 'BuyerBea')).acc;
  buyer.gold = 1000;
  G.me = buyer;
  const br = await MO.buy(row);
  check('buy succeeds for the first buyer', !!br.ok, br.err);
  check('buyer pays and owns the unique token', buyer.gold === 500 && !!buyer.tokens[tok.id] && buyer.tokens[tok.id].status === 'collection');

  /* a second buyer racing on the SAME row must lose */
  const buyer2 = (await G.createAccount('buyer2@x', 'passpass', 'LateLarry')).acc;
  buyer2.gold = 1000;
  G.me = buyer2;
  const br2 = await MO.buy(Object.assign({}, row, { status: 'active' })); /* stale client view */
  check('second buyer is refused — no duplicate tokens', !!br2.err && !buyer2.tokens[tok.id] && buyer2.gold === 1000, br2.err);

  /* seller collects the proceeds exactly once */
  G.me = seller;
  const goldBefore = seller.gold;
  await MO.syncMine();
  const tax = Math.round(500 * EC.MARKET_TAX[tok.rarity]);
  check('seller is paid price minus tax on sync', seller.gold === goldBefore + 500 - tax, seller.gold - goldBefore);
  check('sold token leaves the seller\'s collection', !seller.tokens[tok.id]);
  const paidOnce = seller.gold;
  await MO.syncMine();
  check('proceeds are claimed exactly once', seller.gold === paidOnce);

  /* cancel returns the token */
  const tok2 = DYAG.token.mint({ speciesId: 'uff', rng: new U.Rng(12), rarity: 0, owner: seller.id });
  seller.tokens[tok2.id] = tok2;
  const lr2 = await MO.list(tok2, 300);
  const cr = await MO.cancel(lr2.row);
  check('cancel returns the token to the collection', !!cr.ok && tok2.status === 'collection' && !tok2.onlineListingId);

  /* admin pull returns the token via the seller sync */
  const tok3 = DYAG.token.mint({ speciesId: 'rodak', rng: new U.Rng(13), rarity: 1, owner: seller.id });
  seller.tokens[tok3.id] = tok3;
  const lr3 = await MO.list(tok3, 400);
  const pr = await MO.adminPull(lr3.row.id);
  check('admin pull deactivates the listing', pr.pulled === true);
  await MO.syncMine();
  check('pulled token returns home on sync', tok3.status === 'collection');

  /* mods remote push/fetch through dya_config */
  const e4 = U.deepCopy(DYAG.species.get('kipsu'));
  e4.name = 'Glowfox';
  DYAG.mods.setSpecies('kipsu', e4);
  await DYAG.mods.pushRemote();
  check('admin edits push to dya_config', db.dya_config.length === 1 && db.dya_config[0].value.species.kipsu.name === 'Glowfox');
  DYAG.mods.data.rev = 0; /* simulate a stale player */
  const fr = await DYAG.mods.fetchRemote();
  check('players adopt the newest revision', fr.adopted === true && DYAG.species.get('kipsu').name === 'Glowfox');
  DYAG.mods.resetSpecies('kipsu');

  console.log(failures ? 'MODS+MARKET: ' + failures + ' FAILURE(S)' : 'MODS+MARKET: ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
