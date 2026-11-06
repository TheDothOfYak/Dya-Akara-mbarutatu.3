/* js/flake/mini_save.js: saves for the canvas mini games (Punk Races, Stryx Pilot).
   node tests/test_mini_save.js */
'use strict';
const path = require('path');
let pass = 0, fail = 0;
function check(name, ok, extra) { if (ok) pass++; else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }

/* a browser, just enough of one */
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.window = global;
const listeners = {};
window.addEventListener = (n, fn) => { (listeners[n] = listeners[n] || []).push(fn); };
/* the account service, kept in memory */
const rows = {};
let session = null, bans = {};
window.FLAKE = {
  session: () => session,
  configured: () => true,
  fetchBans: async () => bans,
  banFor: (b, g) => b[g] || b.all || null,
  banText: b => 'banned: ' + b.reason,
  rest: async (method, p, body) => {
    if (method === 'GET') { const key = decodeURIComponent(p.match(/key=eq\.([^&]+)/)[1]); return rows[key] ? [{ value: JSON.parse(JSON.stringify(rows[key])) }] : []; }
    if (method === 'POST') { rows[body.key] = JSON.parse(JSON.stringify(body.value)); return null; }
    return null;
  },
};
require(path.join(__dirname, '..', 'js', 'flake', 'mini_save.js'));
const M = window.FLAKE_MINI;
const blank = () => ({ coins: 100, punks: ['starter'], newField: 'x' });
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  /* a guest */
  let S = M.open('pr', blank);
  let d = await S.ready;
  check('a guest starts with a new save', d.coins === 100 && !S.who);
  d.coins = 250; S.save();
  check('a guest’s save is kept in the browser', JSON.parse(store['mini-pr-guest']).coins === 250);
  S = M.open('pr', blank); d = await S.ready;
  check('…and comes back next time', d.coins === 250);
  /* new fields added later get their defaults */
  const old = JSON.parse(store['mini-pr-guest']); delete old.newField; store['mini-pr-guest'] = JSON.stringify(old);
  S = M.open('pr', blank); d = await S.ready;
  check('an old save gets fields added since', d.newField === 'x' && d.coins === 250);

  /* the guest signs in: the save goes onto the account */
  session = { id: 'acc_1', email: 'a@b', name: 'Ama' };
  S = M.open('pr', blank); d = await S.ready;
  check('signing in carries the guest’s save onto the account', d.coins === 250 && !!d.fromGuest);
  await wait(20);
  check('…the account row has it', rows['mini:pr:acc_1'] && rows['mini:pr:acc_1'].coins === 250);
  check('…and the guest copy is gone', !store['mini-pr-guest']);
  d.coins = 400; S.save(true); await wait(20);
  check('saves go to the account', rows['mini:pr:acc_1'].coins === 400);

  /* a new browser: the account's save wins */
  delete store['mini-pr-acc_1'];
  S = M.open('pr', blank); d = await S.ready;
  check('another browser loads the account’s save', d.coins === 400);
  /* each game has its own row */
  const T = M.open('sp', blank); const e = await T.ready;
  check('each game has its own save', e.coins === 100);

  /* an admin reset starts the player over */
  rows['mini:pr:acc_1'] = { adminReset: Date.now(), savedAt: Date.now() + 1000 };
  S = M.open('pr', blank); d = await S.ready;
  check('an admin reset starts the player over', d.coins === 100 && !d.adminReset);
  await wait(20);
  check('…and the new save replaces the marker', rows['mini:pr:acc_1'].coins === 100 && !rows['mini:pr:acc_1'].adminReset);

  /* bans */
  bans = { pr: { reason: 'cheating' } };
  S = M.open('pr', blank); await S.ready;
  check('a ban for the game is noticed', S.banned === 'banned: cheating');
  bans = {};
  S = M.open('pr', blank); await S.ready;
  check('…and only when there is one', S.banned === '');

  console.log('Mini game saves: ' + pass + ' passed, ' + fail + ' failed');
  if (fail) process.exit(1);
})();
