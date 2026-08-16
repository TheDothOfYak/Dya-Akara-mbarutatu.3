/* Dynamic mounting: a "mount"-tagged creature (Domestic Punk, Kuni Byrd) spawns
   RIDERLESS and is mounted on the field by a friendly Eikar/Keilia. The pair
   then hits harder, shields part of every blow, grows stronger the longer they
   ride, and the rider is thrown clear if the mount falls. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/data/abilities.js', 'js/core/token.js', 'js/core/state.js',
  'js/engine/behaviors.js', 'js/engine/match.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DYAG = global.DYA, U = DYAG.util, TK = DYAG.token;

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

console.log('== EIKAR MOUNTING ==');

const rng = new U.Rng(7);
function newMatch(seed) {
  const mm = new DYAG.match.Match({
    seed, mode: 'standard', terrain: 'plains',
    settings: { pulseInterval: 5, pulseAmount: 2, chaos: false },
    /* empty pouches so nothing auto-deploys — we place the creatures by hand */
    teams: [{ name: 'A', controller: 'ai', pouch: [] }, { name: 'B', controller: 'ai', pouch: [] }],
  });
  mm.headless = true;
  return mm;
}

const m = newMatch(7);
/* a Domestic Punk and a Sword Eikar side by side on team 0; an enemy far away */
const punk = m.spawnFromToken(TK.mint({ speciesId: 'domestic_punk', rng, rarity: 3 }), 0, 300, 300);
const eikar = m.spawnFromToken(TK.mint({ speciesId: 'sword_eikar', rng, rarity: 3 }), 0, 312, 300);
const enemy = m.spawnFromToken(TK.mint({ speciesId: 'harkal', rng, rarity: 3 }), 1, 1200, 300);
check('a domestic_punk spawned', !!punk);
check('a sword_eikar spawned', !!eikar);

/* before any Eikar reaches it, the mount is RIDERLESS */
check('a mount-tagged punk is mountable', punk && punk.mountable === true);
check('the punk starts with NO rider', punk && punk.hasRider === false && !punk.riderUnit);
check('a non-mount (harkal) is not mountable', enemy && !enemy.mountable);

/* the Eikar is in contact → it mounts on the next mounting pass */
m.updateMounting();
check('the Eikar mounts the punk', punk && punk.hasRider === true && punk.riderUnit === eikar);
check('the rider is now riding (hidden as its own actor)', eikar && eikar.riding === true && eikar.mountedOn === punk.id);
check('mounting sets a protection fraction', punk && punk.riderProtect > 0 && punk.riderProtect <= 0.5, 'protect=' + (punk && punk.riderProtect));

/* the rider shields part of every blow: a raw hit lands softer on the mount */
function damageDealt(target) {
  const before = target.hp;
  const src = { dead: false, x: target.x, y: target.y, sp: target.sp, vars: {}, quirks: {}, team: 1 - target.team };
  m.damage(target, 100, src, { noAnim: true });
  return before - target.hp;
}
const punkTaken = damageDealt(punk);
check('the ridden mount takes reduced damage', punkTaken < 100, 'took ' + punkTaken.toFixed(1) + ' of 100');
check('the reduction roughly matches riderProtect', Math.abs(punkTaken - 100 * (1 - punk.riderProtect)) < 2.5,
  'took ' + punkTaken.toFixed(1) + ' expected ~' + (100 * (1 - punk.riderProtect)).toFixed(1));

/* a rider up on its mount cannot be hit directly */
const eikarBefore = eikar.hp;
m.damage(eikar, 100, { dead: false, x: eikar.x, y: eikar.y, sp: eikar.sp, vars: {}, quirks: {}, team: 1 }, { noAnim: true });
check('the rider cannot be struck directly while mounted', eikar.hp === eikarBefore);

/* the bond deepens over time → the pair gets stronger */
punk.hp = punk.maxHp;
const dmg0 = punk.dmg, hp0 = punk.maxHp, prot0 = punk.riderProtect;
for (let s = 0; s < 6; s++) { m.tick += Math.round(1 / (1 / 20)); m.updateMounting(); }  // ~6 seconds of bonding
check('bond builds up over time', punk.bond >= 5, 'bond=' + punk.bond);
check('the mounted pair grows stronger — more damage', punk.dmg > dmg0, dmg0 + ' → ' + punk.dmg);
check('the mounted pair grows tougher — more max HP', punk.maxHp > hp0, hp0 + ' → ' + punk.maxHp);
check('protection deepens with the bond', punk.riderProtect >= prot0);

/* if the mount falls, the rider is thrown clear and fights on foot */
m.kill(punk, enemy, 'combat');
check('the mount losing frees the rider', !punk.riderUnit && punk.hasRider === false);
check('the rider is thrown clear, still alive, back on its own feet', eikar && !eikar.dead && eikar.riding === false && eikar.mountedOn == null);
check('the thrown rider is shaken (reduced HP)', eikar.hp < eikar.maxHp && eikar.hp <= Math.round(eikar.maxHp * 0.5));

/* the Kuni Byrd is now field-mountable the same way — no built-in rider */
const byrdSp = DYAG.species.get('kuni_byrd_ridden');
check('the ridden Byrd no longer has an inherent rider feature', byrdSp && !(byrdSp.features && byrdSp.features.rider));
check('the Byrd carries the mount tag', byrdSp && byrdSp.tags.includes('mount'));
const m2 = newMatch(9);
const byrd = m2.spawnFromToken(TK.mint({ speciesId: 'kuni_byrd_ridden', rng, rarity: 5 }), 0, 300, 300);
check('a Byrd spawns riderless and mountable', byrd && byrd.mountable === true && byrd.hasRider === false);
const keilia = m2.spawnFromToken(TK.mint({ speciesId: 'sword_keilia', rng, rarity: 5 }), 0, 314, 300);
m2.updateMounting();
check('a Keilia can mount the Byrd', byrd && byrd.hasRider === true && byrd.riderUnit === keilia);
check('the mounted Byrd flies its ridden brain', byrd && byrd.riddenBehavior === 'kuni_byrd_ridden');

/* a lone Eikar with no mount simply fights on foot */
const m3 = newMatch(11);
const soloEikar = m3.spawnFromToken(TK.mint({ speciesId: 'spear_eikar', rng, rarity: 3 }), 0, 300, 300);
m3.updateMounting();
check('a lone Eikar with no mount never enters a riding state', soloEikar && !soloEikar.riding && !soloEikar.mountedOn);

console.log(failures ? ('\nMOUNTING: ' + failures + ' FAILURE(S)') : '\nMOUNTING: ALL PASS');
process.exit(failures ? 1 : 0);
