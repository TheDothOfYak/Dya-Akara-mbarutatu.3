/* Headless test for split world storage (js/core/state.js).
   The ~100 AI accounts (~2.8 MB) live in their own localStorage key and
   are only rewritten when they actually change, so ordinary player saves
   write just the small player blob. Verifies the split round-trips, that
   the AI blob is skipped when unchanged, and that old single-blob saves
   migrate transparently. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

/* ---------- browser stubs, with per-key write counting ---------- */
global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
let lsData = {};
const writes = {};                       // key -> number of setItem calls
global.localStorage = {
  getItem: k => (k in lsData ? lsData[k] : null),
  setItem: (k, v) => { lsData[k] = String(v); writes[k] = (writes[k] || 0) + 1; },
  removeItem: k => { delete lsData[k]; },
};
global.location = { pathname: '/index.html' };
global.Image = function () { return { onload: null, set src(v) {} }; };
global.fetch = async function () { return { ok: true, status: 200, json: async () => [] }; };

window.DYA_CONFIG = { supabase: {} };    // offline: purely local
const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/mods.js', 'js/core/account_cloud.js', 'js/core/token.js',
  'js/core/state.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const G = global.DYA.state;
const KEY = 'dyaakara_world_v1', AI_KEY = 'dyaakara_aiworld_v1';
const humanCount = accts => Object.values(accts).filter(a => !a.ai).length;
const aiCount = accts => Object.values(accts).filter(a => a.ai).length;

(async function main() {
  console.log('== STORAGE SPLIT: AI world in its own key, written only when changed ==');

  G.init();
  await G.createAccount('yak@example.com', 'passpass', 'Yak Fiskr');
  G.saveNow();

  /* ---- 1) the two keys carry the right halves ---- */
  const mainBlob = JSON.parse(lsData[KEY]);
  const aiBlob = JSON.parse(lsData[AI_KEY]);
  check('AI key exists and holds the AI accounts', aiCount(aiBlob) > 50, 'ai=' + aiCount(aiBlob));
  check('player key holds the human account', humanCount(mainBlob.accounts) === 1, 'humans=' + humanCount(mainBlob.accounts));
  check('player key carries NO AI accounts (the heavy part is split out)', aiCount(mainBlob.accounts) === 0, 'ai-in-main=' + aiCount(mainBlob.accounts));
  check('player key is much smaller than the AI key', lsData[KEY].length < lsData[AI_KEY].length, 'main=' + lsData[KEY].length + ' ai=' + lsData[AI_KEY].length);

  /* ---- 2) load merges both halves back into one world ---- */
  G.init();  // reload from disk
  check('reload restores the human account', humanCount(G.world.accounts) === 1);
  check('reload restores the AI world', aiCount(G.world.accounts) > 50, 'ai=' + aiCount(G.world.accounts));
  const me = Object.values(G.world.accounts).find(a => !a.ai);
  check('human data survives the round-trip', me && me.email === 'yak@example.com');

  /* ---- 3) player-only saves never rewrite the AI key ---- */
  G.me = me;
  writes[KEY] = 0; writes[AI_KEY] = 0;
  for (let i = 0; i < 10; i++) { G.me.gold += 100; G.saveNow(); }
  check('player saves wrote the player key', writes[KEY] === 10, 'main writes=' + writes[KEY]);
  check('player saves did NOT rewrite the AI key', writes[AI_KEY] === 0, 'ai writes=' + writes[AI_KEY]);

  /* a genuine AI change does rewrite the AI key (exactly once) */
  const anAi = Object.values(G.world.accounts).find(a => a.ai);
  anAi.gold += 12345;
  G.saveNow();
  check('an AI-world change rewrites the AI key', writes[AI_KEY] === 1, 'ai writes=' + writes[AI_KEY]);
  G.saveNow();
  check('...but only once — a repeat save skips it again', writes[AI_KEY] === 1, 'ai writes=' + writes[AI_KEY]);

  /* ---- 4) an OLD single-blob save migrates transparently ---- */
  // reconstruct a pre-split save: everything (incl AI) in one key, no AI key
  const merged = Object.assign({}, JSON.parse(lsData[KEY]));
  merged.accounts = {};
  Object.values(G.world.accounts).forEach(a => merged.accounts[a.id] = a);
  lsData[KEY] = JSON.stringify(merged);
  delete lsData[AI_KEY];
  const humansBefore = humanCount(merged.accounts), aisBefore = aiCount(merged.accounts);

  G.init();  // load old format
  check('old single-blob save still loads everything', humanCount(G.world.accounts) === humansBefore && aiCount(G.world.accounts) === aisBefore);
  G.me = Object.values(G.world.accounts).find(a => !a.ai);
  G.saveNow();  // first save after upgrade migrates
  check('migration creates the AI key', !!lsData[AI_KEY] && aiCount(JSON.parse(lsData[AI_KEY])) === aisBefore);
  check('migration removes AI from the player key', aiCount(JSON.parse(lsData[KEY]).accounts) === 0);
  check('no accounts lost in migration', humanCount(JSON.parse(lsData[KEY]).accounts) === humansBefore);

  console.log(failures ? 'STORAGE SPLIT: ' + failures + ' FAILURE(S)' : 'STORAGE SPLIT: ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
