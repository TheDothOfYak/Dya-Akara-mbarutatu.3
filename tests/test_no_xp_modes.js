/* Headless test for the no-XP modes (js/core/state.js G.recordMatch).
   Practice against the machine (Quick Play vs AI) and Duels award gold and
   record stats, but MUST NOT grant XP or advance the player's level, so the
   AI can't be farmed for progression. A normal casual/ranked match still
   levels the player as before. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

/* ---------- browser stubs (offline, purely local) ---------- */
global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
let lsData = {};
global.localStorage = {
  getItem: k => (k in lsData ? lsData[k] : null),
  setItem: (k, v) => { lsData[k] = String(v); },
  removeItem: k => { delete lsData[k]; },
};
global.location = { pathname: '/index.html' };
global.Image = function () { return { onload: null, set src(v) {} }; };
global.fetch = async function () { return { ok: true, status: 200, json: async () => [] }; };

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
const G = global.DYA.state;

(async function main() {
  console.log('== NO-XP MODES: Quick Play vs AI & Duels give no XP ==');

  G.init();
  const r = await G.createAccount('yak@example.com', 'passpass', 'Yak');
  check('sign-up works', !!r.acc, r.err);
  const me = G.me;

  /* baseline */
  const lvl0 = me.level, xp0 = me.xp, gold0 = me.gold, wins0 = me.stats.wins;

  /* ---- a Quick Play vs AI win: gold + stats, but NO XP ---- */
  const rw1 = G.recordMatch({ win: true, ranked: false, noXp: true, opponentName: 'Dya’kukull', duration: 200, stats: { eliminations: 2, tokensPlayed: [] } });
  check('no-XP match returns 0 XP', rw1.xp === 0, 'xp=' + rw1.xp);
  check('no-XP match shows no XP bonuses', rw1.bonuses.length === 0, JSON.stringify(rw1.bonuses));
  check('no-XP match awards no level events', (rw1.lvlEvents || []).length === 0);
  check('player XP unchanged after no-XP match', me.xp === xp0, 'xp=' + me.xp);
  check('player level unchanged after no-XP match', me.level === lvl0, 'level=' + me.level);
  check('no-XP match STILL pays gold', rw1.gold > 0 && me.gold > gold0, 'gold=' + rw1.gold);
  check('no-XP match STILL records the win stat', me.stats.wins === wins0 + 1);

  /* even a huge pile of AI wins can never level the player */
  for (let i = 0; i < 200; i++) G.recordMatch({ win: true, ranked: false, noXp: true, opponentName: 'AI', duration: 100, stats: { tokensPlayed: [] } });
  check('200 AI wins later, still level ' + lvl0 + ' with 0 XP', me.level === lvl0 && me.xp === 0, 'level=' + me.level + ' xp=' + me.xp);

  /* the daily "first win of the day" bonus was NOT consumed by AI play */
  check('first-win-of-day not burned by no-XP matches', me.lastWinDay !== new Date().toDateString());

  /* ---- a normal casual win DOES award XP and can level up ---- */
  const rw2 = G.recordMatch({ win: true, ranked: false, opponentName: 'Rival', duration: 200, stats: { tokensPlayed: [] } });
  check('a normal casual win awards XP', rw2.xp > 0, 'xp=' + rw2.xp);
  check('the first real win of the day grants its bonus', rw2.bonuses.some(b => /first win/i.test(b[0])));
  check('player XP/level advanced by the real match', me.xp > 0 || me.level > lvl0);

  console.log(failures ? 'NO-XP MODES: ' + failures + ' FAILURE(S)' : 'NO-XP MODES: ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
