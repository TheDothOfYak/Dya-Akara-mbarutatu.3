/* Headless tests for the admin-panel feature additions:
   - per-species base cost range (token.js deriveCostVec)
   - craft-by-Okid stat mapping (state.craftToken)
   - combine 3 Okid → 1 next tier (state.combineOkid)
   - rich tournament placement rewards (state.grantTournamentReward)
   - auto-generated token tagging + purge (state.admin)
   - admin password persisted in its own storage key */
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

/* ---------- load the game (offline: no supabase config) ---------- */
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
const U = DYAG.util, SP = DYAG.species, TK = DYAG.token, G = DYAG.state, EC = DYAG.economy;

G.init();

console.log('== ADMIN FEATURES ==');

/* ---------- per-species base cost range ---------- */
(function () {
  const sp = U.deepCopy(SP.get('gynge'));
  sp.costRange = [40, 40]; // fixed total 40
  SP.all.gynge.costRange = [40, 40];
  const vec = TK.deriveCostVec(SP.get('gynge'), 0 /* Buri rarity, normally cost 1 */, new U.Rng(123));
  const total = vec.Fti + vec.Su + vec.Eldi + vec.Ular;
  check('cost range overrides rarity cost table', total === 40, 'got ' + total);
  delete SP.all.gynge.costRange;
  const vec2 = TK.deriveCostVec(SP.get('gynge'), 0, new U.Rng(123));
  const total2 = vec2.Fti + vec2.Su + vec2.Eldi + vec2.Ular;
  check('without range, falls back to rarity cost', total2 === SP.RARITY_COST[0], 'got ' + total2);
})();

/* ---------- combine Okid ---------- */
(function () {
  const me = Object.values(G.world.accounts).find(a => a.ai);
  G.me = me;
  me.okid = [3, 0, 0, 0, 0, 0, 0];
  const r = G.combineOkid(0);
  check('combine 3 Buri consumes them', me.okid[0] === 0, 'buri=' + me.okid[0]);
  check('combine yields 1 Tui', me.okid[1] === 1, 'tui=' + me.okid[1]);
  check('combine returns tier move', r.ok && r.from === 0 && r.to === 1);
  me.okid = [2, 0, 0, 0, 0, 0, 0];
  check('cannot combine with too few', G.canCombineOkid(0) === false);
  me.okid = [0, 0, 0, 0, 0, 0, 3];
  check('cannot combine Torcain (top tier)', G.combineOkid(6).err != null);
})();

/* ---------- craft-by-Okid ---------- */
(function () {
  const me = G.me;
  // enable an override: Onnar(4) okid -> token rarity 5 with 3x hp
  EC.CRAFT_BY_OKID = EC.defaultCraftByOkid();
  EC.CRAFT_BY_OKID[4] = { rarity: 5, hpMul: 3, dmgMul: 1, speedMul: 1 };
  me.ngakara = 99999;
  // single sample: correct rarity + a token comes out
  me.okid = [0, 0, 0, 0, 9, 0, 0];
  me.pieces = [{ speciesId: 'gynge', material: 'x', from: 'test' }];
  const res = G.craftToken(me.pieces[0], 0, 4 /* spend Onnar */);
  check('craft-by-okid produces a token', !!res.tok, res.err);
  check('craft-by-okid target rarity from mapping', res.tok && res.tok.rarity === 5, 'rarity=' + (res.tok && res.tok.rarity));
  // multiplier check: average hp with 3x mapping vs 1x mapping over N crafts
  // (mint has size/vigor variance, so compare averages, not single rolls)
  function avgHp(mul, N) {
    EC.CRAFT_BY_OKID[4] = { rarity: 5, hpMul: mul, dmgMul: 1, speedMul: 1 };
    let sum = 0;
    for (let i = 0; i < N; i++) {
      me.okid = [0, 0, 0, 0, 9, 0, 0];
      me.pieces = [{ speciesId: 'gynge', material: 'x', from: 'test' }];
      const r = G.craftToken(me.pieces[0], 0, 4);
      sum += r.tok.stats.hp;
    }
    return sum / N;
  }
  const a1 = avgHp(1, 60), a3 = avgHp(3, 60);
  const ratio = a3 / a1;
  check('craft-by-okid hp multiplier scales stats (~3x)', ratio > 2.6 && ratio < 3.4, 'ratio=' + ratio.toFixed(2));
  EC.CRAFT_BY_OKID = null;
})();

/* ---------- tournament placement rewards ---------- */
(function () {
  const me = G.me;
  me.okid = [0, 0, 0, 0, 0, 0, 0];
  me.ngakara = 0; me.huntSlots = [];
  const before = Object.keys(me.tokens).length;
  const sum = G.grantTournamentReward(me.id, {
    gold: 500, ngakara: 3, huntSlots: 2,
    okid: [{ rarity: 2, qty: 4 }],
    tokens: [{ speciesId: 'gynge', rarity: 1, qty: 2 }],
  });
  check('reward grants ngakara', me.ngakara === 3, 'ng=' + me.ngakara);
  check('reward grants okid', me.okid[2] === 4, 'okid2=' + me.okid[2]);
  check('reward grants hunt privileges', me.huntSlots.length === 2, 'slots=' + me.huntSlots.length);
  check('reward mints tokens', Object.keys(me.tokens).length === before + 2, 'delta=' + (Object.keys(me.tokens).length - before));
  check('reward summary reports tokens', sum && sum.tokens.length === 2);
})();

/* ---------- auto-gen tagging + purge ---------- */
(function () {
  const aiTok = TK.mint({ speciesId: 'gynge', rng: new U.Rng(2), aiOwner: true });
  check('aiOwner mint is tagged autoGen', aiTok.autoGen === true);
  const playerTok = TK.mint({ speciesId: 'gynge', rng: new U.Rng(3) });
  check('plain mint is not autoGen', !playerTok.autoGen);

  // seed a fresh AI with a known auto-gen token and purge
  const ai = Object.values(G.world.accounts).find(a => a.ai);
  const t = TK.mint({ speciesId: 'gynge', rng: new U.Rng(4), owner: ai.id, aiOwner: true });
  ai.tokens[t.id] = t;
  const cnt = G.admin.countAutoGenTokens();
  check('countAutoGenTokens sees auto-gen tokens', cnt > 0, 'count=' + cnt);
  const pr = G.admin.purgeAutoGenTokens();
  check('purge removes auto-gen tokens', pr.removed >= 1 && G.admin.countAutoGenTokens() === 0, 'removed=' + pr.removed + ' left=' + G.admin.countAutoGenTokens());
})();

/* ---------- admin password persists in its own key ---------- */
(function () {
  G.admin.setPass('secret123');
  check('setPass writes dedicated storage key', !!lsData['dyaakara_admin_pass_v1']);
  check('hasPass true after set', G.admin.hasPass() === true);
  check('checkPass validates', G.admin.checkPass('secret123') === true && G.admin.checkPass('wrong') === false);
  // simulate a world reset (version bump / fresh world) — pass must survive
  const savedWorld = G.world;
  G.world = null;
  check('hasPass survives world loss (reads dedicated key)', G.admin.hasPass() === true);
  G.world = savedWorld;
})();

console.log(failures ? ('\nADMIN FEATURES: ' + failures + ' FAILURE(S)') : '\nADMIN FEATURES: ALL PASS');
process.exit(failures ? 1 : 0);
