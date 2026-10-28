/* Headless tests for the admin "edit everything" tables and the live
   broadcast channel (js/core/broadcast.js) against a fake dya_config. */
const path = require('path');
const ROOT = path.join(__dirname, '..');

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

global.window = global;
global.document = { hidden: false, body: null, createElement: () => ({ style: {} }), addEventListener: () => {} };
const ls = {};
global.localStorage = { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } };
global.sessionStorage = global.localStorage;
global.location = { pathname: '/admin.html' };
global.setInterval = () => 0;
let row = null;
global.fetch = async (url, opts) => {
  const m = (opts && opts.method) || 'GET';
  if (m === 'POST') { const b = JSON.parse(opts.body); if (b.key === 'live') row = b.value; return { ok: true, status: 201, json: async () => null }; }
  return { ok: true, status: 200, json: async () => (/key=eq\.live/.test(url) && row ? [{ value: row }] : []) };
};
global.DYA_CONFIG = { supabase: { url: 'https://fake.supabase.co', anonKey: 'anon' } };
global.DYA = {};

['js/core/util.js', 'js/data/species.js', 'js/data/economy.js', 'js/data/lore.js', 'js/data/abilities.js', 'js/core/mods.js', 'js/core/broadcast.js']
  .forEach(f => require(path.join(ROOT, f)));
const M = DYA.mods, EC = DYA.economy, L = DYA.lore, SP = DYA.species, LV = window.DYA_LIVE;

(async () => {
  console.log('edit everything');
  check('achievements are editable', 'ACHIEVEMENTS' in M.base.economy);
  check('the world encyclopedia is editable', 'WORLD' in M.base.lore);
  check('element colours are editable', 'ELEMENT_COLORS' in M.base.tables);
  check('functions are never in the editable set', !('xpForLevel' in M.base.economy) && !('genName' in M.base.lore));
  const ref = EC.TITLES;
  const t = JSON.parse(JSON.stringify(EC.TITLES)); t[0].name = 'Renamed';
  M.set('economy', 'TITLES', t);
  check('a table edit applies', EC.TITLES[0].name === 'Renamed');
  check('…in place, so held references see it', ref === EC.TITLES && ref[0].name === 'Renamed');
  M.set('economy', 'TITLES', null);
  check('reset restores the shipped value', EC.TITLES[0].name === M.base.economy.TITLES[0].name);
  const c = Object.assign({}, SP.ELEMENT_COLORS); const k0 = Object.keys(c)[0]; c[k0] = '#123456';
  M.set('tables', 'ELEMENT_COLORS', c);
  check('species data tables apply', SP.ELEMENT_COLORS[k0] === '#123456');
  M.set('tables', 'ELEMENT_COLORS', null);
  const arenas = JSON.parse(JSON.stringify(L.ARENAS)); arenas.__test = 'x';
  M.set('lore', 'ARENAS', arenas);
  check('lore objects apply', L.ARENAS.__test === 'x');
  M.set('lore', 'ARENAS', null);
  check('…and reset', !('__test' in L.ARENAS));

  console.log('live broadcast');
  check('the admin page is recognised', LV.APP === 'admin');
  check('"all" reaches every app', ['game', '4bw', 'rpg', 'film'].every(a => LV.forMe('all', a)));
  check('a 4BW post skips the card game', LV.forMe('4bw', '4bw') && !LV.forMe('4bw', 'game'));
  const r1 = await LV.update(d => { d.items.unshift({ id: 'a1', at: Date.now(), kind: 'announcement', title: 'Hi', body: 'there', target: 'all' }); });
  check('publishing writes the live row', r1.ok && row && row.items.length === 1 && row.items[0].title === 'Hi', JSON.stringify(r1));
  const rev1 = row.rev;
  await LV.update(d => { d.banner = { on: true, text: 'Banner' }; });
  check('a second publish keeps the first post', row.items.length === 1 && row.banner.on && row.rev === rev1 + 1);
  LV.doc = null;
  await LV.fetch();
  check('a page reading the row gets everything', LV.doc && LV.doc.items[0].id === 'a1' && LV.doc.banner.text === 'Banner');

  console.log(failures ? '\n' + failures + ' FAILED' : '\nall passed');
  process.exit(failures ? 1 : 0);
})();
