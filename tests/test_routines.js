/* Headless test for everyone's day (rpg/js/routines.js): the Carpenter sleeps at night, gardens at
   sunrise, cooks dinner in the evening and reads in his study after it — except every third night,
   when he's in the workshop till past one. The folk of Beuhk keep hours of their own. */
const path = require('path'), { pathToFileURL } = require('url');

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const R = await import(pathToFileURL(path.join(__dirname, '..', 'rpg', 'js', 'routines.js')).href);
  console.log('Daily routines');
  const bk = (h, day) => R.routineFor('buhkon', 'property', h, day);
  // day 0: an ordinary night (night 0 % 3 = 0)
  check('at 2am he is asleep', bk(2, 1).place === 'bed' && bk(2, 1).act === 'sleep', JSON.stringify(bk(2, 1)));
  check('at sunrise he is in the garden', bk(6.5, 0).act === 'garden' && bk(6.5, 0).place === 'garden');
  check('at 5pm he is making dinner', bk(17.5, 0).place === 'kitchen' && bk(17.5, 0).act === 'cook');
  check('after dinner he reads in the study', bk(20.5, 0).place === 'study');
  check('late evening, bed', bk(23, 0).act === 'sleep');
  // every third night: night 2, 5, 8 …
  check('every third night he stays up in the workshop', bk(20.5, 2).place === 'workshop' && bk(20.5, 2).late);
  check('…still at it past midnight', bk(0.5, 3).place === 'workshop');
  check('…and in bed by two', bk(2, 3).act === 'sleep');
  check('…and dinner that night is as ever', bk(17.5, 2).place === 'kitchen');
  check('the other nights are not late', !bk(20.5, 0).late && !bk(20.5, 1).late && !bk(20.5, 3).late && bk(20.5, 5).late);
  check('the morning after a late night, the garden as usual', bk(6.5, 3).act === 'garden');
  let changes = 0, prev = null;
  for (let h = 0; h < 24; h += 0.1) { const s = bk(h, 0); if (prev && s.place !== prev) changes++; prev = s.place; }
  check('he really goes about his day (many places)', changes >= 8, changes);
  for (const id of R.ROUTINE_FOLK.xilia) {
    const night = R.routineFor(id, 'xilia', 2, 1), noon = R.routineFor(id, 'xilia', id === 'v3' ? 15 : 10.5, 1);   // (the lamplighter sleeps late)
    check(`${id}: home at night, out by day`, night.place === 'home' && noon.place !== 'home', JSON.stringify([night, noon]));
  }
  check('the baker is at the ovens before dawn', R.routineFor('v1', 'xilia', 5, 1).place === 'post');
  check('the lamplighter is out at dusk', R.routineFor('v3', 'xilia', 19, 1).place === 'lamps');
  check('folk elsewhere keep no routine', R.routineFor('venkin', 'leotik', 12, 0) === null && R.routineFor('buhkon', 'xilia', 12, 0) === null);
  check('indoor places are known', R.isIndoor('bed') && R.isIndoor('home') && !R.isIndoor('garden'));
  console.log(failures ? `\n${failures} failed` : '\nall passed');
  process.exit(failures ? 1 : 0);
})();
