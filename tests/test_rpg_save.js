/* Headless test for the RPG's save versioning and chapter clocks
   (rpg/js/progress.js). A long run must survive updates: saves at or
   above MIN_SAVE_V load (migrated if older), runs from before it are
   still reset, and each chapter keeps its own playtime. */
const path = require('path'), { pathToFileURL } = require('url');

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

let ls = {};
global.localStorage = { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } };

(async () => {
  const P = await import(pathToFileURL(path.join(__dirname, '..', 'rpg', 'js', 'progress.js')).href);
  console.log('RPG save versioning');

  const s = P.freshSave('easy');
  check('a fresh save is on the current version', s.v === P.SAVE_V);
  check('a fresh save has chapter clocks', s.chTime && typeof s.chTime === 'object');
  P.writeSave(s, 'k');
  check('a current save loads back', P.loadSave('k') && P.loadSave('k').runId === s.runId);

  ls.k = JSON.stringify({ v: P.MIN_SAVE_V - 1, time: 99 });
  check('a save from before MIN_SAVE_V is not loaded', P.loadSave('k') === null);
  check('…and is reported as an old run', P.isOldSave('k') === true);

  ls.k = JSON.stringify({ v: P.SAVE_V + 1 });
  check('a save from a newer build is not loaded', P.loadSave('k') === null);
  check('…and is not reported as an old run', P.isOldSave('k') === false);

  check('migrateSave(null) is null', P.migrateSave(null) === null);
  check('migrateSave keeps a current save', P.migrateSave({ v: P.SAVE_V, a: 1 }).a === 1);
  for (let v = P.MIN_SAVE_V; v <= P.SAVE_V; v++) {
    const m = P.migrateSave({ v, flags: {}, time: 0 });
    check(`a v${v} save migrates to v${P.SAVE_V}`, m && m.v === P.SAVE_V);
  }

  const pastII = P.migrateSave({ v: 3, flags: { young: true, pro: 'done', yq: 5, megla: 'done', ch2: true } });
  check('v3→v4: a run past Chapter II skips the two summers', pastII.flags.ap === 9);
  const inI = P.migrateSave({ v: 3, flags: { young: true, pro: 'done', yq: 5 } });
  check('v3→v4: a run still in Chapter I picks them up', inI.flags.ap === undefined);
  const noFlags = P.migrateSave({ v: 3 });
  check('v3→v4: a save with no flags still migrates', noFlags && noFlags.v === P.SAVE_V);

  console.log('Chapter clocks');
  const at = flags => P.chapterOf(flags);
  check('Velki', at({ young: true, pro: 'velki' }) === 'velki');
  check('the road', at({ young: true, pro: 'road' }) === 'road');
  check('days 5–6 in Beuhk count as the road', at({ young: true, pro: 'beuhk', bk: 'climb' }) === 'road');
  check('Chapter I after the crest', at({ young: true, pro: 'done', yq: 2 }) === 'ch1');
  check('Chapter II', at({ young: true, pro: 'megla' }) === 'ch2');
  check('the first token', at({ young: true, pro: 'token' }) === 'token');
  check('after Chapter II', at({ young: true, pro: 'done', ch2: true }) === 'after2');
  check('the older Torcain chapters', at({ tut: 3 }) === 'torcain');
  check('every chapter has a name', ['velki', 'road', 'ch1', 'ch2', 'token', 'after2', 'torcain'].every(k => P.CHAPTERS.some(([c]) => c === k)));

  const run = P.freshSave('easy'); run.flags = { young: true, pro: 'road' };
  P.tickTime(run, 10); run.flags.pro = 'megla'; P.tickTime(run, 5); P.tickTime(run, 5);
  check('total time adds up', run.time === 20);
  check('each chapter keeps its own time', run.chTime.road === 10 && run.chTime.ch2 === 10);
  const old = { v: P.SAVE_V, time: 3, flags: { young: true, pro: 'velki' } };
  P.tickTime(old, 2);
  check('a save without chapter clocks grows them', old.chTime.velki === 2 && old.time === 5);

  console.log(failures ? `\n${failures} FAILED` : '\nall passed');
  process.exit(failures ? 1 : 0);
})();
