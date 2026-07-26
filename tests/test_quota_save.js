/* Headless test for storage-quota resilience (js/core/state.js).
   Reproduces the "game stopped saving / reset my progress" bug: heavy
   replay history grows the world blob past localStorage's quota, so
   every save silently fails and a reload drops back to the last save
   that fit. Verifies replay history is bounded, and that when the disk
   is genuinely full the save sheds replays instead of losing progress. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

/* ---------- browser stubs with a HARD localStorage quota ---------- */
global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
let lsData = {};
let QUOTA = Infinity;               // bytes; setItem throws past this
global.localStorage = {
  getItem: k => (k in lsData ? lsData[k] : null),
  setItem: (k, v) => {
    v = String(v);
    // total size of the store with this key replaced
    let total = v.length;
    for (const kk in lsData) if (kk !== k) total += lsData[kk].length;
    if (total > QUOTA) { const e = new Error('exceeded the quota'); e.name = 'QuotaExceededError'; e.code = 22; throw e; }
    lsData[k] = v;
  },
  removeItem: k => { delete lsData[k]; },
};
global.location = { pathname: '/index.html' };
global.Image = function () { return { onload: null, set src(v) {} }; };
global.fetch = async function () { return { ok: true, status: 200, json: async () => [] }; };

/* offline: no supabase configured, purely local like a normal single device */
window.DYA_CONFIG = { supabase: {} };
const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/mods.js', 'js/core/account_cloud.js', 'js/core/token.js',
  'js/core/state.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA;
const G = DYAG.state;

function bigReplay(tournament) {
  // ~40 KB of input log, like a full-length match
  const log = [];
  for (let i = 0; i < 1200; i++) log.push({ t: i, team: i % 2, i: 'input-' + i });
  return { seed: 12345, settings: { size: 3 }, log, meta: { foo: 'bar' }, tournament: tournament || null };
}
function replayBytes(acc) { return JSON.stringify(acc.replays || []).length; }

(async function main() {
  console.log('== QUOTA SAVE: replay history can never starve out progress ==');

  G.init();
  const r = await G.createAccount('yak@example.com', 'passpass', 'Yak Fiskr');
  check('sign-up works', !!r.acc, r.err);

  /* ---- 1) replay history stays bounded no matter how many matches ---- */
  for (let i = 0; i < 80; i++) {
    G.recordMatch({ win: i % 2 === 0, ranked: false, opponentName: 'Foe', duration: 300, replay: bigReplay(false) });
  }
  const bytes = replayBytes(G.me);
  check('replay history is byte-bounded after 80 matches', bytes <= 520 * 1024, 'bytes=' + bytes);
  check('but recent replays are still kept', G.me.replays.length > 0, 'count=' + G.me.replays.length);

  /* tournament replays are preferentially retained */
  G.recordMatch({ win: true, ranked: true, tournament: { id: 'tourneyX' }, opponentName: 'Champ', duration: 300, replay: bigReplay(true) });
  for (let i = 0; i < 40; i++) G.recordMatch({ win: false, ranked: false, opponentName: 'Foe', duration: 300, replay: bigReplay(false) });
  check('a tournament (permanent) replay survives a flood of casual ones', G.me.replays.some(x => x.permanent), 'perms=' + G.me.replays.filter(x => x.permanent).length);

  /* ---- 2) a genuinely full disk sheds replays but KEEPS progress ---- */
  G.me.level = 9; G.me.rank = 1400; G.me.gold = 55555;
  // pin the quota just below the current world size so the next save must shed
  const worldSize = JSON.stringify(G.world).length;
  QUOTA = worldSize - 60 * 1024;               // 60 KB too small — only replays can give that back
  const okSave = require('fs') && (function () { G.saveNow(); return true; })();
  const persisted = JSON.parse(localStorage.getItem('dyaakara_world_v1'));
  const savedMe = Object.values(persisted.accounts).find(a => !a.ai && a.email === 'yak@example.com');
  check('save succeeds under a full disk (did not silently fail)', !!savedMe, 'no persisted account');
  check('progress (level 9) actually reached disk', savedMe && savedMe.level === 9, 'level=' + (savedMe && savedMe.level));
  check('rank + gold reached disk too', savedMe && savedMe.rank === 1400 && savedMe.gold === 55555);
  check('the persisted blob now fits under quota', JSON.stringify(persisted).length <= QUOTA, 'size=' + JSON.stringify(persisted).length + ' quota=' + QUOTA);

  /* ---- 3) the on-load migration reclaims space from an old bloated save ---- */
  // hand-craft a stored world whose human carries oversized replay history
  QUOTA = Infinity;
  const bloated = JSON.parse(localStorage.getItem('dyaakara_world_v1'));
  const human = Object.values(bloated.accounts).find(a => !a.ai);
  human.replays = []; for (let i = 0; i < 60; i++) human.replays.push(Object.assign({ id: 'r' + i, permanent: false }, bigReplay(false)));
  localStorage.setItem('dyaakara_world_v1', JSON.stringify(bloated));
  const before = replayBytes(human);
  G.init();  // reload → migration trims
  const reloaded = Object.values(G.world.accounts).find(a => !a.ai);
  check('bloated replay history is trimmed on load', replayBytes(reloaded) < before, 'before=' + before + ' after=' + replayBytes(reloaded));
  check('trimmed save is bounded', replayBytes(reloaded) <= 520 * 1024, 'bytes=' + replayBytes(reloaded));

  console.log(failures ? 'QUOTA SAVE: ' + failures + ' FAILURE(S)' : 'QUOTA SAVE: ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
