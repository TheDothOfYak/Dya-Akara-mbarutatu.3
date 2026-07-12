/* Headless tests for merging the 100 Dya'kukull AI into the REAL
   shared market: deterministic cross-device identity, AI listing/
   buying through the exact same atomic path a human uses, shared
   offer/haggle negotiation with an AI seller, concurrent-"browser"
   race safety on AI offer resolution, and offline fallback. */
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

/* ---------- in-memory PostgREST fake (extended: or=, not.is.null, lte.) ---------- */
const db = { dya_listings: [], dya_config: [], dya_offers: [], dya_species_supply: [] };
let idCounter = 1;
function matchOp(row, col, op, val) {
  if (op === 'eq') return String(row[col]) === val;
  return false;
}
function supplyRow(species, rarity) {
  let row = db.dya_species_supply.find(r => r.species_id === species && r.rarity === rarity);
  if (!row) { row = { species_id: species, rarity, cap: null, count: 0 }; db.dya_species_supply.push(row); }
  return row;
}
function parseFilters(qs) {
  const filters = [];
  (qs || '').split('&').forEach(part => {
    if (!part) return;
    const eqIdx = part.indexOf('=');
    const k = part.slice(0, eqIdx), v = decodeURIComponent(part.slice(eqIdx + 1));
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) return;
    if (k === 'or') {
      const inner = v.slice(1, -1);
      const conds = inner.split(',').map(c => {
        const bits = c.split('.');
        const col = bits[0], op = bits[1], val = bits.slice(2).join('.');
        return row => matchOp(row, col, op, val);
      });
      filters.push(row => conds.some(c => c(row)));
      return;
    }
    if (v === 'not.is.null') { filters.push(row => row[k] != null); return; }
    if (v.startsWith('eq.')) { filters.push(row => String(row[k]) === v.slice(3)); return; }
    if (v.startsWith('in.(')) {
      const list = v.slice(4, -1).split(',');
      filters.push(row => list.includes(String(row[k])));
      return;
    }
    if (v.startsWith('lte.')) {
      const val = v.slice(4);
      filters.push(row => {
        const da = Date.parse(row[k]), db2 = Date.parse(val);
        if (!isNaN(da) && !isNaN(db2)) return da <= db2;
        return row[k] <= val;
      });
      return;
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
  /* every response returns an independent deep copy, exactly like a real
     HTTP round-trip would (JSON over the wire) — this matters for the
     concurrency tests below, where two "browsers" each hold their OWN
     snapshot of a row rather than a shared in-process object reference */
  const clone = v => JSON.parse(JSON.stringify(v));
  if (method === 'GET') {
    return { ok: true, status: 200, json: async () => clone(db[table].filter(match)) };
  }
  if (method === 'POST') {
    const row = Object.assign({ id: 'row-' + (idCounter++), claimed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, body);
    if (table === 'dya_listings') {
      const dup = db[table].find(r => r.token_id === row.token_id && r.status === 'active');
      if (dup) return { ok: false, status: 409, json: async () => ({ message: 'duplicate key value violates unique constraint' }) };
      if (row.mode == null) row.mode = 'sale';
    }
    if (table === 'dya_offers') {
      if (row.version == null) row.version = 0;
      if (row.state == null) row.state = 'pending';
    }
    db[table].push(row);
    return { ok: true, status: 201, json: async () => (wantsRep ? clone([row]) : null) };
  }
  if (method === 'PATCH') {
    const hit = db[table].filter(match);
    hit.forEach(r => Object.assign(r, body));
    return wantsRep
      ? { ok: true, status: 200, json: async () => clone(hit) }
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
const U = DYAG.util, M = DYAG.mods, G = DYAG.state, MO = DYAG.marketOnline;

(async function main() {
  console.log('== DETERMINISTIC AI IDENTITY (cross-device) ==');
  G.init(); // "browser #1" boots a fresh world
  const a7 = G.world.accounts['ai_7'];
  check('ai_7 exists with a deterministic, index-based id', !!a7 && a7.ai === true);
  check('ai_elbergi is the preset merchant, referenced by world.elbergiId', G.world.elbergiId === 'ai_elbergi' && G.world.accounts['ai_elbergi'].aiCfg.merchant === true);
  check('an AI\'s netId equals its stable id (usable directly as a shared-table seller id)', a7.netId === 'ai_7' && G.world.accounts['ai_elbergi'].netId === 'ai_elbergi');
  const snap1 = { id: a7.id, name: a7.displayName, level: a7.level, gold: a7.gold, tokenIds: Object.keys(a7.tokens).sort() };

  for (const k of Object.keys(lsData)) delete lsData[k]; // wipe "local storage" — simulate a second, independent device
  G.init(); // "browser #2" boots its OWN fresh world from the same fixed seed
  const a7b = G.world.accounts['ai_7'];
  const snap2 = { id: a7b.id, name: a7b.displayName, level: a7b.level, gold: a7b.gold, tokenIds: Object.keys(a7b.tokens).sort() };
  check('two independently-booted worlds produce the IDENTICAL ai_7 (id, name, level, gold, tokens)',
    JSON.stringify(snap1) === JSON.stringify(snap2), JSON.stringify(snap1) + ' vs ' + JSON.stringify(snap2));

  console.log('== AI LISTS AND BUYS THROUGH THE SAME ATOMIC PATH AS A HUMAN ==');
  const aiSeller = G.world.accounts['ai_3'];
  const aiTok = Object.values(aiSeller.tokens).find(t => t.status === 'collection');
  const listRes = await MO.listAs(aiSeller, aiTok, 450, { mode: 'sale' });
  check('an AI can list a token through MO.listAs', !!listRes.row, listRes.err);
  check('the AI\'s token is escrowed exactly like a human\'s would be', aiTok.status === 'market' && !!aiTok.onlineListingId);
  const dupRes = await MO.listAs(aiSeller, aiTok, 900, { mode: 'sale' });
  check('the same AI-owned token cannot be double-listed', !!dupRes.err);

  await MO.refresh();
  const aiRow = MO.state.listings.find(r => r.id === listRes.row.id);
  check('the AI\'s listing is visible in the shared browse feed, indistinguishable from a human\'s', !!aiRow && aiRow.seller_net_id === 'ai_3');

  const human = (await G.createAccount('human@x', 'passpass', 'HumanHank')).acc;
  human.gold = 5000;
  G.me = human;
  const buyRes = await MO.buy(aiRow); // MO.buy() == MO.buyAs(me(), row) — the ordinary human path
  check('a human buys an AI\'s listing through the ordinary buy path', !!buyRes.ok, buyRes.err);
  check('buyer pays and owns the token', human.gold === 5000 - 450 && !!human.tokens[aiTok.id]);

  /* an AI buying a listing (human or AI) — same atomic guarantee */
  const human2 = (await G.createAccount('human2@x', 'passpass', 'HumanHelga')).acc;
  human2.gold = 2000;
  const tokForSale = DYAG.token.mint({ speciesId: 'kipsu', rng: new U.Rng(101), rarity: 0, owner: human2.id });
  human2.tokens[tokForSale.id] = tokForSale;
  G.me = human2;
  const humanListRes = await MO.listAs(human2, tokForSale, 150, { mode: 'sale' });
  await MO.refresh();
  const rowForAi = MO.state.listings.find(r => r.id === humanListRes.row.id);
  const aiBuyer = G.world.accounts['ai_4'];
  aiBuyer.gold = 1000;
  const aiBuyRes = await MO.buyAs(aiBuyer, rowForAi);
  check('an AI can buy a human\'s listing through MO.buyAs', !!aiBuyRes.ok, aiBuyRes.err);
  check('the AI paid gold and now owns the unique token', aiBuyer.gold === 850 && !!aiBuyer.tokens[tokForSale.id]);

  /* race: two buyers (a human and an AI) contend for the SAME row */
  const contested = DYAG.token.mint({ speciesId: 'uff', rng: new U.Rng(102), rarity: 0, owner: aiSeller.id });
  aiSeller.tokens[contested.id] = contested;
  const cListRes = await MO.listAs(aiSeller, contested, 60, { mode: 'sale' });
  await MO.refresh();
  const cRow = MO.state.listings.find(r => r.id === cListRes.row.id);
  const raceHuman = (await G.createAccount('racer@x', 'passpass', 'Racer')).acc;
  raceHuman.gold = 500;
  const raceAi = G.world.accounts['ai_5'];
  raceAi.gold = 500;
  const [rHuman, rAi] = await Promise.all([MO.buyAs(raceHuman, cRow), MO.buyAs(raceAi, cRow)]);
  const winners = [rHuman, rAi].filter(r => r.ok).length;
  check('exactly one side wins a contested token — no duplicates', winners === 1, JSON.stringify([rHuman, rAi]));

  console.log('== SIMTICK ROUTES AI MARKET ACTIVITY TO THE SHARED TABLE WHEN CONFIGURED ==');
  M.set('ai', 'actionsPerBeat', 40);
  M.set('ai', 'marketActivityMul', 5); // clamped to 1 per-AI, but guarantees near-max activity
  const listingsBefore = db.dya_listings.filter(r => r.status === 'active').length;
  G.me = human; // simTick only runs while a human is "logged in", per ui.js
  G.simTick();
  const listingsAfter = db.dya_listings.filter(r => r.status === 'active').length;
  check('a simTick with the shared market configured adds rows to the REAL shared table (not the local one)',
    listingsAfter > listingsBefore, listingsBefore + ' → ' + listingsAfter);

  console.log('== OFFLINE FALLBACK: simTick still uses the local market when not configured ==');
  const savedCfg = window.DYA_CONFIG;
  window.DYA_CONFIG = {}; // "not configured"
  const localListingsBefore = Object.keys(G.world.market.listings).length;
  const cloudListingsBefore2 = db.dya_listings.filter(r => r.status === 'active').length;
  /* bypass the 45s throttle by advancing the clock the module already saw */
  const realNow = Date.now;
  Date.now = () => realNow() + 200000;
  G.simTick();
  Date.now = realNow;
  const localListingsAfter = Object.keys(G.world.market.listings).length;
  const cloudListingsAfter2 = db.dya_listings.filter(r => r.status === 'active').length;
  check('offline, AI activity still lands in the LOCAL market table', localListingsAfter >= localListingsBefore);
  check('offline, nothing new reaches the cloud table', cloudListingsAfter2 === cloudListingsBefore2);
  window.DYA_CONFIG = savedCfg; // restore for the remaining tests

  console.log('== SHARED HAGGLING: a human offers, an AI seller answers, the buyer claims ==');
  const negoSeller = G.world.accounts['ai_9'];
  const negoTok = DYAG.token.mint({ speciesId: 'rodak', rng: new U.Rng(201), rarity: 1, owner: negoSeller.id });
  negoSeller.tokens[negoTok.id] = negoTok;
  const negoListRes = await MO.listAs(negoSeller, negoTok, 1000, { mode: 'sale' });
  await MO.refresh();
  const negoRow = MO.state.listings.find(r => r.id === negoListRes.row.id);
  const buyer3 = (await G.createAccount('buyer3@x', 'passpass', 'Haggler')).acc;
  buyer3.gold = 2000;
  /* offer near the top of the ask — guaranteed to clear the AI's reserve
     (reserve tops out at 0.9× list price) regardless of the RNG draw */
  const offerAmount = Math.round(negoRow.price * 0.95);
  const offerRes = await MO.makeOfferAs(buyer3, negoRow, offerAmount, 'Take it, please.');
  check('a human can open a haggle thread against an AI seller', !!offerRes.off);
  check('the offer schedules an AI response window (respond_at)', !!offerRes.off.respond_at);

  /* force the AI's reply window into the past — time has "passed" */
  const dbOffer = db.dya_offers.find(r => r.id === offerRes.off.id);
  dbOffer.respond_at = new Date(Date.now() - 1000).toISOString();

  /* race: two browsers' polls both notice it's due and answer at once —
     only one write should land (version-gated), and it must be a real
     state change (deterministic reply, so both would have written the
     same thing anyway) */
  await Promise.all([MO.processDueAiOffers(), MO.processDueAiOffers()]);
  const afterOffer = db.dya_offers.find(r => r.id === offerRes.off.id);
  check('the AI seller answered exactly once despite two concurrent pollers', afterOffer.version === 1, 'version=' + afterOffer.version);
  check('a strong offer against a high asking price gets accepted', afterOffer.state === 'accepted', afterOffer.state);

  const soldListing = db.dya_listings.find(r => r.id === negoRow.id);
  check('accepting the offer atomically resolves the underlying listing too', soldListing.status === 'sold' && soldListing.buyer_net_id === buyer3.netId);

  G.me = buyer3;
  const goldBeforeClaim = buyer3.gold;
  await MO.claimAcceptedOffers();
  check('the buyer\'s own device claims the token once the offer is accepted', !!buyer3.tokens[negoTok.id]);
  check('the buyer pays the NEGOTIATED price, not the listing price', buyer3.gold === goldBeforeClaim - offerAmount);
  const claimedOffer = db.dya_offers.find(r => r.id === offerRes.off.id);
  check('the accepted offer is marked claimed so it is never settled twice', claimedOffer.claimed === true);
  const goldAfterFirstClaim = buyer3.gold;
  await MO.claimAcceptedOffers();
  check('re-polling does not pay twice', buyer3.gold === goldAfterFirstClaim);

  console.log(failures ? 'SHARED AI MARKET: ' + failures + ' FAILURE(S)' : 'SHARED AI MARKET: ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
