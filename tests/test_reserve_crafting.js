/* Headless tests for the Crafting Station / Reserve feature (built on top of
   the universal token designer + Guild Market from the sibling PR):
   - mods.js Reserve CRUD (designed specs owned by no one yet)
   - admin.pushReserveToStall / admin.grantReserveEntry move a Reserve
     entry onto the Guild stall (as a one-of-a-kind listing) or straight
     into a player's collection, minted true via TK.mintSpec
   - tournament placement rewards can grant an EXACT Reserve entry
   - level-up milestone chests can be curated to a manual species/rarity
     pool instead of rolling any craftable species */
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
global.fetch = async () => ({ ok: false, status: 405, json: async () => ({ message: 'offline' }) });

const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/mods.js', 'js/core/token.js', 'js/core/state.js',
  'js/engine/behaviors.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA;
const U = DYAG.util, SP = DYAG.species, TK = DYAG.token, G = DYAG.state, M = DYAG.mods, EC = DYAG.economy;

G.init();

console.log('== CRAFTING STATION / RESERVE ==');

/* ---------- Reserve CRUD ---------- */
(function () {
  check('reserve starts empty', M.reserveEntries().length === 0);
  const entry = { id: U.uid('rsv'), spec: { speciesId: 'gynge', rarity: 2, name: 'The Test Relic' }, createdAt: Date.now() };
  M.setReserveEntry(entry);
  check('setReserveEntry adds it', M.reserveEntries().length === 1);
  check('getReserveEntry finds it by id', M.getReserveEntry(entry.id) && M.getReserveEntry(entry.id).spec.name === 'The Test Relic');
  M.deleteReserveEntry(entry.id);
  check('deleteReserveEntry removes it', M.reserveEntries().length === 0 && M.getReserveEntry(entry.id) == null);
})();

/* ---------- push a reserve entry to the Guild stall ---------- */
(function () {
  const entry = { id: U.uid('rsv'), spec: { speciesId: 'gynge', rarity: 1 }, createdAt: Date.now() };
  M.setReserveEntry(entry);
  const listingsBefore = M.guildListings().length;
  const r = G.admin.pushReserveToStall(entry.id, 275);
  check('pushReserveToStall succeeds', r.ok === true, r.err);
  check('entry leaves the Reserve', M.getReserveEntry(entry.id) == null);
  check('a Guild listing is created', M.guildListings().length === listingsBefore + 1);
  const lst = M.guildListings().find(l => l.spec.speciesId === 'gynge' && l.spec.rarity === 1);
  check('the listing sells for the admin-set price', lst && lst.price === 275, 'price=' + (lst && lst.price));
  check('the listing is not sold yet', lst && !lst.sold);
})();

/* ---------- grant a reserve entry directly to a player ---------- */
(function () {
  const entry = { id: U.uid('rsv'), spec: { speciesId: 'gynge', rarity: 3, name: 'The Direct Grant' }, createdAt: Date.now() };
  M.setReserveEntry(entry);
  const ai = Object.values(G.world.accounts).find(a => a.ai);
  const before = Object.keys(ai.tokens).length;
  const r = G.admin.grantReserveEntry(entry.id, ai.id);
  check('grantReserveEntry succeeds', r.ok === true, r.err);
  check('entry leaves the Reserve', M.getReserveEntry(entry.id) == null);
  check('token lands in the recipient collection', Object.keys(ai.tokens).length === before + 1 && !!ai.tokens[r.tok.id]);
  check('the granted token honors the designed name and rarity', ai.tokens[r.tok.id].name === 'The Direct Grant' && ai.tokens[r.tok.id].rarity === 3);
  /* granting an entry that's no longer in the reserve fails cleanly */
  const r2 = G.admin.grantReserveEntry(entry.id, ai.id);
  check('re-granting an already-granted entry errors', !!r2.err);
})();

/* ---------- tournament reward: exact reserve entry, not a fresh roll ---------- */
(function () {
  const entry = { id: U.uid('rsv'), spec: { speciesId: 'gynge', rarity: 5, name: 'The Champion’s Prize' }, createdAt: Date.now() };
  M.setReserveEntry(entry);
  const ai = Object.values(G.world.accounts).find(a => a.ai);
  const before = Object.keys(ai.tokens).length;
  const summary = G.grantTournamentReward(ai.id, { tokens: [{ reserveId: entry.id }] });
  check('tournament reward grants the exact reserve entry', Object.keys(ai.tokens).length === before + 1);
  const granted = summary.tokens[0];
  check('the granted token keeps its authored name', granted && granted.name === 'The Champion’s Prize');
  check('the entry left the Reserve', M.getReserveEntry(entry.id) == null);
  check('the reward summary reports it', summary.tokens.length === 1);
  /* a reserveId that no longer resolves is just skipped, not a crash */
  const summary2 = G.grantTournamentReward(ai.id, { tokens: [{ reserveId: entry.id }] });
  check('a stale reserveId is silently skipped', summary2.tokens.length === 0);
})();

/* ---------- tournament reward: designed-spec / mint-fresh tokens still work ---------- */
(function () {
  const ai = Object.values(G.world.accounts).find(a => a.ai);
  const before = Object.keys(ai.tokens).length;
  const summary = G.grantTournamentReward(ai.id, { tokens: [{ spec: { speciesId: 'gynge', rarity: 2 }, qty: 2 }] });
  check('mint-fresh tournament tokens still work', Object.keys(ai.tokens).length === before + 2 && summary.tokens.length === 2);
})();

/* ---------- level chest pools: manual curation of the milestone token ---------- */
(function () {
  const me = Object.values(G.world.accounts).find(a => a.ai);
  G.me = me;
  M.setLevelChestPool(10, [{ speciesId: 'gynge', rarity: 4 }]);
  check('setLevelChestPool stores the pool', M.levelChestPoolLevels().indexOf(10) >= 0);
  check('getLevelChestPool returns it', M.getLevelChestPool(10) && M.getLevelChestPool(10)[0].speciesId === 'gynge');

  function xpTo(acc, targetLevel) {
    let need = 0;
    for (let lv = acc.level; lv < targetLevel; lv++) need += EC.xpForLevel(lv + 1);
    return need;
  }

  me.level = 9; me.xp = 0; me.tokens = {};
  G.addXP(xpTo(me, 10));
  check('leveling into a milestone with a pool set grants exactly one token', me.level === 10 && Object.keys(me.tokens).length === 1);
  check('the milestone token is the curated species/rarity', !!Object.values(me.tokens).find(t => t.speciesId === 'gynge' && t.rarity === 4));

  M.deleteLevelChestPool(10);
  check('deleteLevelChestPool clears it', M.levelChestPoolLevels().indexOf(10) < 0);

  /* without a pool, milestone 20 still rolls (any craftable species) */
  me.level = 19; me.xp = 0; me.tokens = {};
  G.addXP(xpTo(me, 20));
  check('a milestone with no pool set still grants a bonus token (random roll)', me.level === 20 && Object.keys(me.tokens).length === 1);
})();

console.log(failures ? ('\nCRAFTING STATION / RESERVE: ' + failures + ' FAILURE(S)') : '\nCRAFTING STATION / RESERVE: ALL PASS');
process.exit(failures ? 1 : 0);
