/* Headless test: a species the organizer marks "not obtainable by players"
   (notCraftable, the Admin → Creatures toggle) must not reach players through
   the MARKET either — not just the random-grant rolls. Reproduces the report
   "a player got a Sprengju Relic Shaving even though I turned it off": AI stock
   minted before the toggle was still listed and buyable. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
const lsData = {};
global.localStorage = { getItem: k => (k in lsData ? lsData[k] : null), setItem: (k, v) => { lsData[k] = String(v); }, removeItem: k => { delete lsData[k]; } };
global.location = { pathname: '/index.html' };
global.Image = function () { return { onload: null, set src(v) {} }; };
global.fetch = async function () { return { ok: true, status: 200, json: async () => [] }; };

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

window.DYA_CONFIG = { supabase: {} };
for (const f of ['js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/mods.js', 'js/core/account_cloud.js', 'js/core/token.js', 'js/core/state.js']) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA, G = DYAG.state, SP = DYAG.species, TK = DYAG.token, U = DYAG.util;
const SPECIES = 'sprengju_shaving';

/* list a token of `species` for sale from an AI seller; returns the listing id */
function aiList(species) {
  const ai = Object.values(G.world.accounts).find(a => a.ai);
  const t = TK.mint({ speciesId: species, rng: new U.Rng(U.newSeed()), owner: ai.id, aiOwner: true });
  ai.tokens[t.id] = t; t.status = 'market';
  const lst = { id: U.uid('lst'), tokenId: t.id, sellerId: ai.id, price: 40, status: 'sale', at: Date.now(), featured: false };
  G.world.market.listings[lst.id] = lst;
  return { lstId: lst.id, ai, tok: t };
}

(async function main() {
  console.log('== UNOBTAINABLE MARKET: a pulled species cannot be bought/listed/sold ==');

  G.init();
  await G.createAccount('player@example.com', 'passpass', 'Player');
  G.me.gold = 100000;

  /* baseline: while the species is normal, an AI listing is buyable */
  const pre = aiList(SPECIES);
  check('by default the species is obtainable', !G.isUnobtainable(SPECIES));
  const preBuy = G.buyListing(pre.lstId);
  check('it can be bought before being turned off', preBuy.ok === true, JSON.stringify(preBuy));

  /* organizer turns it OFF (Admin → Creatures → "Craftable / obtainable") */
  DYAG.mods.data.species[SPECIES] = { notCraftable: true };
  DYAG.mods.apply();
  check('species is now flagged unobtainable', G.isUnobtainable(SPECIES));
  check('removed from the craftable roster (random grants)', !SP.craftable.includes(SPECIES));

  /* pre-existing AI listings of it are pulled from the market */
  const stale = aiList(SPECIES);
  const pulled = G.delistUnobtainable();
  check('delistUnobtainable pulls existing listings', pulled >= 1 && !G.world.market.listings[stale.lstId], 'pulled=' + pulled);
  check('the pulled token returns to the seller\'s collection', stale.ai.tokens[stale.tok.id].status === 'collection');

  /* even a fresh listing can no longer be bought or offered on */
  const fresh = aiList(SPECIES);
  const buy = G.buyListing(fresh.lstId);
  check('a pulled species cannot be bought', !!buy.err && /circulation/i.test(buy.err), JSON.stringify(buy));
  const offer = G.makeOffer(fresh.lstId, 30);
  check('a pulled species cannot be offered on', !!offer.err && /circulation/i.test(offer.err), JSON.stringify(offer));

  /* a player cannot list one they still hold, and AI never stocks it */
  const owned = TK.mint({ speciesId: SPECIES, rng: new U.Rng(U.newSeed()), owner: G.me.id });
  G.me.tokens[owned.id] = owned;
  const listAttempt = G.createListing(owned, 50, 'sale');
  check('a player cannot list a pulled species', !!listAttempt.err && /circulation/i.test(listAttempt.err), JSON.stringify(listAttempt));

  /* a normal species is completely unaffected */
  const normal = aiList('kipsu');
  const buyNormal = G.buyListing(normal.lstId);
  check('normal species still buy/sell freely', buyNormal.ok === true, JSON.stringify(buyNormal));

  console.log(failures ? 'UNOBTAINABLE MARKET: ' + failures + ' FAILURE(S)' : 'UNOBTAINABLE MARKET: ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
