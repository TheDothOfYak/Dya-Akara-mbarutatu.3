/* 4 Brothers World: the hero and world saved to the Flake Games account (the Dya'Akara account).
   Runs the game's own core.js + cloud.js (pulled out of four-brothers-world/index.html)
   on several simulated computers that share one mocked Supabase dya_config table:
   - the first computer's hero goes up to the account; a second computer gets it
   - a computer's saves go up; an old tab elsewhere stops instead of writing over them
   - a browser hero from before accounts asks which hero to keep
   - another account's hero in the browser is never uploaded to yours
   - nobody signed in on the Flake Games home page: the game waits (there is no sign-in of its own)
   - this computer's controls/settings stay on this computer */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

const html = fs.readFileSync(path.join(ROOT, 'four-brothers-world', 'index.html'), 'utf8');
const block = (name) => { const m = html.match(new RegExp('<script>/\\* ' + name.replace(/[.\/]/g, '\\$&') + ' \\*/([\\s\\S]*?)</script>')); if (!m) throw new Error('no ' + name + ' in index.html'); return m[1]; };
const CORE = block('js/core.js'), CLOUD = block('js/cloud.js');

const db = { dya_config: [] };
let requests = [];
async function fetchMock(url, opts) {
  opts = opts || {}; const method = opts.method || 'GET';
  const u = new URL(url); const table = u.pathname.split('/rest/v1/')[1];
  requests.push({ method, table, keepalive: !!opts.keepalive });
  const ok = (data, status) => ({ ok: true, status: status || 200, json: async () => data, headers: { get: () => null } });
  const key = u.searchParams.get('key') || '';
  if (table !== 'dya_config') throw new Error('unexpected table ' + table);
  const rows = db.dya_config;
  if (method === 'GET') {
    let out = rows;
    if (key.startsWith('eq.')) out = rows.filter((r) => r.key === key.slice(3));
    if (key.startsWith('like.')) { const re = new RegExp('^' + key.slice(5).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/_/g, '.').replace(/\*/g, '.*') + '$'); out = rows.filter((r) => re.test(r.key)); }
    return ok(out.map((r) => ({ key: r.key, value: r.value })));
  }
  if (method === 'POST') {
    [].concat(JSON.parse(opts.body)).forEach((row) => { const i = rows.findIndex((r) => r.key === row.key); if (i >= 0) rows[i] = row; else rows.push(row); });
    return ok(null, 201);
  }
  if (method === 'DELETE') {
    const ks = key.replace(/^in\.\(|\)$/g, '').split(',').map((k) => k.replace(/^"|"$/g, ''));
    db.dya_config = rows.filter((r) => !ks.includes(r.key));
    return ok(null, 204);
  }
  throw new Error('unexpected ' + method);
}

function storage(init) {
  const m = new Map(Object.entries(init || {}));
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _m: m,
  };
}
/* one computer: its own browser storage, the shared Supabase. reload() just counts.
   `signIn` is who signed in on the home page: js/flake/account.js keeps that session in
   localStorage ('flake-session'); FLAKE here is a stand-in that reads it. */
function computer(local, signIn) {
  const ls = local || storage();
  if (signIn) ls.setItem('flake-session', JSON.stringify(signIn));
  const FLAKE = {
    session: () => { const v = JSON.parse(ls.getItem('flake-session') || 'null'); return v && v.id ? v : null; },
    gate: async () => FLAKE.session(),
  };
  const ctx = {
    localStorage: ls, sessionStorage: storage(), fetch: fetchMock, console, FLAKE,
    setTimeout: () => 0, clearTimeout: () => {},          // pushes are driven by the test, not timers
    addEventListener: () => {}, location: { reloads: 0, reload() { this.reloads++; }, href: '' },
    document: { readyState: 'complete', getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} },
  };
  ctx.window = ctx;
  ctx.window.DYA_CONFIG = { supabase: { url: 'https://x.supabase.co', anonKey: 'anon' } };
  vm.createContext(ctx);
  vm.runInContext(CORE + '\n' + CLOUD, ctx);
  ctx.RW.HEROES = { acorn: { name: 'Acorn' }, rock: { name: 'Rock' } };
  return ctx;
}
const hero = (name, species, extra) => JSON.stringify(Object.assign({ name, species, look: {}, savedAt: 1 }, extra || {}));
const cloudKeys = () => db.dya_config.map((r) => r.key).sort();
const cloudVal = (k) => (db.dya_config.find((r) => r.key === k) || {}).value;
/* gate() never resolves when it reloads the page (the reload starts the game afresh), so wait on ticks */
const ticks = async (n) => { for (let i = 0; i < (n || 10); i++) await new Promise((r) => setImmediate(r)); };
const gate = async (c) => { c.RW.cloud.gate(); await ticks(); };
const signedIn = (c) => { c.RW.cloud.who = c.RW.cloud.identity(); return c; };
const KO = { id: 'acc_ko_1', email: 'ko@example.com', name: 'Ko' };

(async () => {
  console.log('4 Brothers World cloud save');

  /* ---- nobody signed in: no sign-in here, just a way back to the home page ---- */
  const loneLS = storage({ rw_save_rock: hero('Nobody', 'rock') });
  const lone = computer(loneLS);
  let started = false; lone.RW.cloud.gate().then(() => (started = true)); await ticks();
  check('with nobody signed in the game doesn\u2019t start', !started && lone.RW.cloud.state.mode === 'login');
  check('…and nothing is sent anywhere', !db.dya_config.length);

  /* ---- home computer: a hero from before accounts, opened after signing in on the home page ---- */
  const homeLS = storage({ rw_save_rock: hero('Bramble', 'acorn'), rw_edits_acorn: '{"a":1}', rw_binds: '{"left":["KeyJ"]}', rw_settings: '{}', rw_version: '"1.8"' });
  let home = computer(homeLS, KO);
  await gate(home);
  check('the game plays as whoever signed in on the home page', home.RW.cloud.who && home.RW.cloud.who.id === 'acc_ko_1');
  check('an empty account takes this computer\u2019s hero', cloudVal('fbw:acc_ko_1:rw_save_rock') === hero('Bramble', 'acorn'));
  check('…and its world edits', cloudVal('fbw:acc_ko_1:rw_edits_acorn') === '{"a":1}');
  check('controls, settings and version stay on this computer', !cloudKeys().some((k) => /rw_(binds|settings|version)$/.test(k)), cloudKeys().join(' '));
  check('the game is told to carry on (no reload)', home.location.reloads === 0);
  check('saving is on', home.RW.cloud.state.mode === 'on');

  /* ---- laptop: empty browser, signs in → gets the same hero ---- */
  const lapLS = storage({ rw_binds: '{"left":["KeyA"]}' });
  let lap = computer(lapLS, KO);
  await gate(lap);
  check('a second computer loads the account\u2019s hero and reloads to play it', lap.location.reloads === 1 && lapLS.getItem('rw_save_rock') === hero('Bramble', 'acorn'));
  check('…with the world edits too', lapLS.getItem('rw_edits_acorn') === '{"a":1}');
  check('…and keeps its own controls', lapLS.getItem('rw_binds') === '{"left":["KeyA"]}');
  lap = computer(lapLS);        // the reload
  let done = false; lap.RW.cloud.gate().then(() => (done = true)); await ticks();
  check('after the reload it plays straight away (remembered sign-in, nothing to fetch twice)', done && lap.location.reloads === 0 && lap.RW.cloud.state.mode === 'on');

  /* ---- play on the laptop ---- */
  lap.RW.store.set('save_rock', { name: 'Bramble', species: 'acorn', look: {}, level: 5 });
  lap.RW.store.set('binds', { left: ['KeyQ'] });
  await lap.RW.cloud.push();
  check('the laptop\u2019s progress goes up to the account', JSON.parse(cloudVal('fbw:acc_ko_1:rw_save_rock')).level === 5);
  check('…but its key changes don\u2019t', !cloudKeys().some((k) => /rw_binds/.test(k)));

  /* ---- the home tab, still open from earlier, autosaves its older hero ---- */
  home.RW.store.set('save_rock', { name: 'Bramble', species: 'acorn', look: {}, level: 2 });
  await home.RW.cloud.push();
  check('an old tab doesn\u2019t write over newer progress', JSON.parse(cloudVal('fbw:acc_ko_1:rw_save_rock')).level === 5);
  check('…it stops and asks to load the newer save', home.RW.cloud.state.mode === 'conflict');
  home = computer(homeLS);      // "Load the newer save"
  await gate(home);
  check('reopening at home loads the laptop\u2019s progress', JSON.parse(homeLS.getItem('rw_save_rock')).level === 5 && home.location.reloads === 1);
  home = computer(homeLS); await gate(home);
  check('…and then plays it', home.RW.cloud.state.mode === 'on' && home.location.reloads === 0);

  /* ---- changes that never made it up (offline, tab killed) go up next time on the same computer ---- */
  home.RW.store.set('save_rock', { name: 'Bramble', species: 'acorn', look: {}, level: 6 });
  home = computer(homeLS); await gate(home); await home.RW.cloud.push();
  check('unsent changes on this computer go up when it opens again', JSON.parse(cloudVal('fbw:acc_ko_1:rw_save_rock')).level === 6 && home.location.reloads === 0);

  /* ---- a save sent as the tab closed (keepalive) is still recognised as this computer's ---- */
  home.RW.store.set('save_rock', { name: 'Bramble', species: 'acorn', look: {}, level: 7 });
  requests = [];
  home.RW.cloud.flush(); await ticks();
  check('closing the tab sends the save with keepalive', requests.some((q) => q.method === 'POST' && q.keepalive));
  const m = JSON.parse(homeLS.getItem('fbw-cloud'));
  m.stamp = 'old-one'; m.sent = cloudVal('fbw:acc_ko_1:~stamp'); homeLS.setItem('fbw-cloud', JSON.stringify(m));   // as if the page died before hearing back
  home = computer(homeLS); await gate(home);
  check('…and next time that save is known as this computer\u2019s (no reload)', home.location.reloads === 0 && home.RW.cloud.state.mode === 'on');

  /* ---- work computer: its own hero from before accounts → asks which to keep ---- */
  const workLS = storage({ rw_save_rock: hero('Pebblet', 'rock'), rw_explored_rock: '"x"' });
  let work = signedIn(computer(workLS, KO));
  const r = await work.RW.cloud.reconcile();
  check('a different hero from before accounts asks which to keep', r && r.choose && r.choose.here.name === 'Pebblet' && r.choose.account.name === 'Bramble', JSON.stringify(r));
  check('…naming both heroes\u2019 kinds', r.choose.here.kind === 'Rock' && r.choose.account.kind === 'Acorn');
  check('…and nothing changes until you pick', workLS.getItem('rw_save_rock') === hero('Pebblet', 'rock') && JSON.parse(cloudVal('fbw:acc_ko_1:rw_save_rock')).level === 7);
  work = signedIn(computer(workLS, KO));
  check('keeping this computer\u2019s hero carries on without a reload', (await work.RW.cloud.reconcile('here')) === false);
  check('…and it becomes the account\u2019s hero', cloudVal('fbw:acc_ko_1:rw_save_rock') === hero('Pebblet', 'rock') && cloudVal('fbw:acc_ko_1:rw_explored_rock') === '"x"');
  check('…with the old hero\u2019s world edits removed from the account', !cloudKeys().includes('fbw:acc_ko_1:rw_edits_acorn'), cloudKeys().join(' '));

  const work2LS = storage({ rw_save_rock: hero('Gravel', 'rock') });
  const work2 = signedIn(computer(work2LS, KO));
  check('playing the account\u2019s hero instead reloads into it', (await work2.RW.cloud.reconcile('account')) === true && work2LS.getItem('rw_save_rock') === hero('Pebblet', 'rock'));
  check('…and keeps this computer\u2019s hero as a spare in the browser', work2LS.getItem('rw_save_backup_before-account') === hero('Gravel', 'rock'));
  check('…which isn\u2019t uploaded', !cloudKeys().some((k) => /backup/.test(k)));

  /* ---- a shared computer: Ny signs in where Ko's hero is ---- */
  const NY = { id: 'acc_ny_2', email: 'ny@example.com', name: 'Ny' };
  const shared = computer(work2LS, NY);
  await gate(shared);
  check('another account\u2019s hero is never uploaded to yours', !cloudKeys().some((k) => k.startsWith('fbw:acc_ny_2:rw_save')), cloudKeys().join(' '));
  check('…and is cleared from the browser for the new player', work2LS.getItem('rw_save_rock') === null);
  check('Ko\u2019s account is untouched', cloudVal('fbw:acc_ko_1:rw_save_rock') === hero('Pebblet', 'rock'));

  /* ---- no site settings (a downloaded copy): browser only, as before ---- */
  const offLS = storage({ rw_save_rock: hero('Solo', 'rock') });
  const off = computer(offLS); off.window.DYA_CONFIG = {};
  await gate(off);
  off.RW.store.set('save_rock', { name: 'Solo' });
  check('a downloaded copy plays from the browser without a login', off.RW.cloud.state.mode === 'off' && JSON.parse(offLS.getItem('rw_save_rock')).name === 'Solo');

  console.log(failures ? `\n${failures} FAILED` : '\nall passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
