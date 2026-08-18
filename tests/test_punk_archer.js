/* Punk dodge + smart Malsti raiding, garrisoned-archer fixes (infinite quiver,
   faster, biggest-threat), tower camo limit, creatures attacking walls, and a
   mounted rider carrying the relic home. */
const fs = require('fs'), path = require('path'); const ROOT = path.join(__dirname, '..');
global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
for (const f of ['js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js', 'js/data/lore.js', 'js/core/token.js', 'js/engine/behaviors.js', 'js/engine/match.js']) {
  eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f);
}
const D = global.DYA, U = D.util;
const ELS = ['Fti', 'Su', 'Eldi', 'Ular'];
let fails = 0; const ok = (n, c, x) => { console.log('  ' + (c ? 'PASS' : 'FAIL'), n, x || ''); if (!c) fails++; };
const mint = (id, seed) => D.token.mint({ speciesId: id, rng: new U.Rng(seed) });
function mk() {
  const m = new D.match.Match({ seed: 5, mode: 'standard', terrain: 'plain', settings: { pulseInterval: 5, pulseAmount: 3, chaos: false },
    teams: [{ name: 'A', controller: 'ai', pouch: [mint('harkal', 1)] }, { name: 'B', controller: 'ai', pouch: [mint('harkal', 2)] }] });
  m.headless = true; return m;
}

console.log('== DODGE: Malsti 90%, Wild Punk ≤50% ==');
{ const m = mk(); const punk = m.spawnFromToken(mint('malsti_punk', 1), 0, 500, 500);
  ok('Malsti dodge stat is 90%', Math.abs(punk.vars.dodge - 0.9) < 0.001, 'dodge=' + punk.vars.dodge);
  punk.hp = punk.maxHp = 100000;
  let landed = 0; for (let i = 0; i < 500; i++) { const before = punk.hp; m.damage(punk, 10, null); if (punk.hp < before) landed++; }
  ok('~90% of hits are dodged', landed < 500 * 0.25, landed + '/500 landed (expect ~50)');
  const wp = m.spawnFromToken(mint('wild_punk', 2), 0, 400, 500);
  ok('Wild Punk has dodge, ≤50%', wp.vars.dodge > 0 && wp.vars.dodge <= 0.5, 'dodge=' + wp.vars.dodge);
  // OLD token minted before dodge existed: no vars.dodge → species floor still applies
  const old = m.spawnFromToken(mint('malsti_punk', 20), 0, 600, 500); delete old.vars.dodge;
  old.hp = old.maxHp = 100000;
  let oldLanded = 0; for (let i = 0; i < 500; i++) { const b = old.hp; m.damage(old, 10, null); if (old.hp < b) oldLanded++; }
  ok('a pre-dodge Malsti token still dodges ~90%', oldLanded < 500 * 0.25, oldLanded + '/500 landed');
}

console.log('== MALSTI: one resource (Torcain hauls more), pouch-weighted, faster teleport ==');
{ const m = mk();
  ok('Malsti teleports more often (cooldown ≤5s)', mint('malsti_punk', 9).vars.teleportCooldown <= 5);
  // victim pouch heavy Ular; resources plentiful
  const pou = []; for (let i = 0; i < 8; i++) { const t = mint('rodak', 100 + i); t.element = 'Ular'; pou.push({ tok: t }); }
  m.teams[1].pouch = pou;
  // a common (non-Torcain) Malsti grabs ONE at a time
  const punk = m.spawnFromToken(D.token.mint({ speciesId: 'malsti_punk', rng: new U.Rng(3), rarity: 3 }), 0, m.teams[1].hoard.x, m.teams[1].hoard.y);
  const api = m.api(); api._c = punk;
  m.teams[1].resources = { Fti: 50, Su: 50, Eldi: 50, Ular: 50 };
  api.stealResource(punk);
  ok('a non-Torcain grabs only ONE resource', punk.mem.stolen === 1, 'grabbed ' + punk.mem.stolen);
  // a Torcain Malsti hauls a full Duat-load
  const tor = m.spawnFromToken(D.token.mint({ speciesId: 'malsti_punk', rng: new U.Rng(4), rarity: 6 }), 0, m.teams[1].hoard.x, m.teams[1].hoard.y);
  api._c = tor; m.teams[1].resources = { Fti: 50, Su: 50, Eldi: 50, Ular: 50 };
  api.stealResource(tor);
  ok('a Torcain hauls a whole Duat-load', tor.mem.stolen === Math.round(tor.vars.duatCapacity) && tor.mem.stolen > 1, 'grabbed ' + tor.mem.stolen + '/' + Math.round(tor.vars.duatCapacity));
  // over many raids it steals the pouch-heavy colour most (use the Torcain for volume)
  const cnt = { Fti: 0, Su: 0, Eldi: 0, Ular: 0 };
  for (let k = 0; k < 40; k++) { tor.mem.stolen = 0; tor.mem.stolenVec = null; m.teams[1].resources = { Fti: 50, Su: 50, Eldi: 50, Ular: 50 }; api.stealResource(tor); ELS.forEach(e => cnt[e] += (tor.mem.stolenVec ? tor.mem.stolenVec[e] : 0)); }
  ok('steals the enemy pouch’s dominant colour most', cnt.Ular > cnt.Fti && cnt.Ular > cnt.Su && cnt.Ular > cnt.Eldi, JSON.stringify(cnt));
  // the raid skims the SURPLUS but never zeroes the opponent (fixes "AI slowly stops playing")
  m.teams[1].resources = { Fti: 1, Su: 1, Eldi: 1, Ular: 0 };  // total 3, below the floor
  const floorPunk = m.spawnFromToken(D.token.mint({ speciesId: 'malsti_punk', rng: new U.Rng(8), rarity: 6 }), 0, m.teams[1].hoard.x, m.teams[1].hoard.y);
  api._c = floorPunk;
  for (let k = 0; k < 20; k++) { floorPunk.mem.stolen = 0; floorPunk.mem.stolenVec = null; api.stealResource(floorPunk); }
  const left = ['Fti', 'Su', 'Eldi', 'Ular'].reduce((a, e) => a + m.teams[1].resources[e], 0);
  ok('leaves a working floor — never drains the opponent to nothing', left >= 3, 'opponent left with ' + left);
}

console.log('== BUILDER SPEC: dimensioned by the best Builder in the POUCH ==');
{ const m = mk();
  // a strong Builder sits UN-deployed in the pouch; a weak one is on the field
  const strong = D.token.mint({ speciesId: 'builder_keilia', rng: new U.Rng(70) });
  strong.vars = Object.assign({}, strong.vars, { towerQuality: 1.7, structureQuality: 1.7 }); strong.sizeIdx = 3;
  m.teams[0].pouch = [{ tok: strong, state: 'pouch', readiedAtPulse: -1, deaths: 0 }];
  const weak = D.token.mint({ speciesId: 'builder_keilia', rng: new U.Rng(71) });
  weak.vars = Object.assign({}, weak.vars, { towerQuality: 0.9, structureQuality: 0.9 }); weak.sizeIdx = 2;
  m.spawnFromToken(weak, 0, 300, 500);
  const sp = m.builderSpec(0);
  // spec should reflect the STRONG pouch builder (bigger close range than the weak one alone)
  const weakOnly = (() => { const q = 0.9, size = 2; return U.clamp(Math.round(46 + q * 30 + size * 4), 30, 100); })();
  ok('spec uses the strong pouch builder, not the weak fielded one', sp.close > weakOnly, 'close=' + sp.close + ' vs weak-only ' + weakOnly);
}

console.log('== TOWER ARCHER: never runs dry, fires faster, hits the biggest threat ==');
{ const m = mk(); const b = m.spawnFromToken(mint('builder_keilia', 5), 0, 400, 500);
  const tower = m.raiseStructure(b, { role: 'tower1', kind: 'tower', x: 400, y: 500, spec: m.builderSpec(0) });
  const ar = m.spawnFromToken(mint('archer_keilia', 6), 0, 400, 500);
  const api = m.api(); api.mountTower(ar, tower); ar.quiver = 4;
  const tgt = { x: tower.x + tower.close - 5, y: tower.y, sp: { tags: [] }, element: 'Ular', intent: {} };
  for (let i = 0; i < 30; i++) { ar.attackCd = 0; api.shoot(ar, tgt); }
  ok('a garrisoned archer never runs out of arrows', ar.quiver >= 4, 'quiver=' + ar.quiver);
  const ds = ar.vars.drawSpeed || 1;
  ar.attackCd = 0; api.shoot(ar, tgt);
  ok('fires slightly faster from the tower (×0.82)', Math.abs(ar.attackCd - (1.6 / ds) * 0.82) < 0.02, 'cd=' + ar.attackCd.toFixed(2));
  // biggest threat: a big Su Naga to +x, a small Kipsu to -x, both in range
  ar.attackCd = 0; ar.quiver = 30;
  m.spawnFromToken(mint('su_naga', 10), 1, tower.x + tower.far * 0.5, 500);
  m.spawnFromToken(mint('kipsu', 11), 1, tower.x - tower.far * 0.4, 500);
  api._c = ar; D.behaviors.archer_unit(ar, api);
  ok('aims at the biggest threat (Su Naga to the +x)', ar.facing === 1, 'facing=' + ar.facing);
}

console.log('== TOWER SIGHT: reveals light camo (<50) only ==');
{ const m = mk(); const b = m.spawnFromToken(mint('builder_keilia', 12), 0, 400, 500);
  m.raiseStructure(b, { role: 'tower1', kind: 'tower', x: 400, y: 500, spec: m.builderSpec(0) });
  const sneaky = m.spawnFromToken(mint('mikolo_moko', 13), 1, 412, 500); sneaky.vars.camo = 0.8; sneaky.vars.stealth = 0.8; sneaky.camoUntil = m.tick + 100;
  const seen = m.spawnFromToken(mint('mikolo_moko', 14), 1, 412, 512); seen.vars.camo = 0.2; seen.vars.stealth = 0.2; seen.camoUntil = m.tick + 100;
  m.stepMisc();
  ok('heavy camo (≥50) stays hidden from towers', sneaky.camoUntil > m.tick);
  ok('light camo (<50) is revealed', seen.camoUntil <= m.tick);
}

console.log('== WALLS: a blocked creature attacks the wall to break through ==');
{ const m = mk();
  m.structures.push({ id: 'w', type: 'wall', kind: 'wall', team: 0, x: 800, y: 500, w: 24, h: 84, hp: 400, maxHp: 400, quality: 1, vertical: true, face: 1 });
  const foe = m.spawnFromToken(mint('rodak', 15), 1, 800, 500); foe.rooted = false;   // a GROUND creature (a flyer would pass over)
  const hp0 = 400;
  let breached = false;
  for (let i = 0; i < 60 && !breached; i++) { foe.attackCd = 0; foe.x = 800; foe.y = 500; m.stepMisc(); if (!m.structures.some(s => s.id === 'w')) breached = true; }
  const wall = m.structures.find(s => s.id === 'w');
  ok('a blocked ground creature hacks the wall down fast', breached || wall.hp < hp0 * 0.5, 'wall hp ' + (wall ? wall.hp.toFixed(0) : 'BREACHED'));
}

console.log('== MOUNTED RELIC: a mount carries its rider + the relic home to score ==');
{ const m = mk();
  const mount = m.spawnFromToken(mint('domestic_punk', 16), 0, 320, 500);
  const rider = m.spawnFromToken(mint('sword_eikar', 17), 0, 320, 500);
  m.mountRider(rider, mount);
  ok('the rider is mounted up', mount.riderUnit === rider && rider.riding === true);
  const rl = m.relics.find(r => r.ownerTeam === 1);
  rl.carrier = rider.id; rl.carrierTeam = 0; rider.carryingRelic = true;
  const api = m.api(); api._c = mount; D.behaviors.mounted_eikar(mount, api);
  const home = m.teams[0].hoard;
  ok('the pair breaks for home with the relic', !!mount.intent.move && Math.abs(mount.intent.move.x - home.x) < Math.abs(320 - home.x));
  // arrive home; the scoring tick captures it
  mount.x = home.x; mount.y = home.y; rider.x = home.x; rider.y = home.y; m.tick = 10;
  m.stepMisc();
  ok('the relic is delivered (captured at home)', rl.captured === true);
}

console.log(fails ? ('\nPUNK/ARCHER: ' + fails + ' FAILURE(S)') : '\nPUNK/ARCHER: ALL PASS');
process.exit(fails ? 1 : 0);
