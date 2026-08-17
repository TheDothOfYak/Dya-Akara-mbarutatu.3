/* The Keilia Builder fortress overhaul: variable towers dimensioned off the
   best builder, garrisoned archers that can't be touched until the tower falls,
   the 2.5×/1.5× range bands, auto-firing wall-towers, the Builder's Hut upgrade
   after a full pulse, the spearmen cone tower + ring, and the storm halt. */
const fs = require('fs'), path = require('path'); const ROOT = path.join(__dirname, '..');
global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
for (const f of ['js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js', 'js/data/lore.js', 'js/core/token.js', 'js/engine/behaviors.js', 'js/engine/match.js']) {
  eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f);
}
const D = global.DYA, U = D.util;
let fails = 0; const ok = (n, c, x) => { console.log('  ' + (c ? 'PASS' : 'FAIL'), n, x || ''); if (!c) fails++; };
function mk() {
  const m = new D.match.Match({ seed: 5, mode: 'standard', terrain: 'plain', settings: { pulseInterval: 5, pulseAmount: 3, chaos: false },
    teams: [{ name: 'A', controller: 'ai', pouch: [D.token.mint({ speciesId: 'harkal', rng: new U.Rng(1) })] },
            { name: 'B', controller: 'ai', pouch: [D.token.mint({ speciesId: 'harkal', rng: new U.Rng(2) })] }] });
  m.headless = true; return m;
}
const mint = (id, seed) => D.token.mint({ speciesId: id, rng: new U.Rng(seed) });

console.log('== SPEC: fortifications dimensioned off the best builder ==');
{ const m = mk(); m.spawnFromToken(mint('builder_keilia', 20), 0, 300, 500);
  const sp = m.builderSpec(0);
  ok('close range within [30,100]', sp.close >= 30 && sp.close <= 100, 'close=' + sp.close);
  ok('far range is 3× close', sp.far === sp.close * 3, 'far=' + sp.far);
  ok('capacity is 1–3 archers', sp.capacity >= 1 && sp.capacity <= 3, 'cap=' + sp.capacity);
}

console.log('== GARRISON: archers untargetable until the tower is destroyed ==');
{ const m = mk(); const b = m.spawnFromToken(mint('builder_keilia', 21), 0, 300, 500);
  const tower = m.raiseStructure(b, { role: 'tower1', kind: 'tower', x: 300, y: 500, spec: m.builderSpec(0) });
  const arch = m.spawnFromToken(mint('archer_keilia', 210), 0, 300, 500);
  const api = m.api(); api.mountTower(arch, tower);
  ok('archer garrisons the tower', arch.onTower === tower.id && tower.occupants.length === 1);
  const hp0 = arch.hp; m.damage(arch, 9999, null);
  ok('a garrisoned archer cannot be struck', arch.hp === hp0);
  tower.hp = 0; m.freeOccupants(tower);
  ok('collapse frees the archer', arch.onTower === null);
  m.damage(arch, 5, null);
  ok('a freed archer can be struck again', arch.hp < hp0);
}

console.log('== RANGE BANDS: 2.5× close, 1.5× far, nothing beyond ==');
{ const m = mk(); const b = m.spawnFromToken(mint('builder_keilia', 22), 0, 300, 500);
  const spec = m.builderSpec(0);
  const tower = m.raiseStructure(b, { role: 'tower1', kind: 'tower', x: 300, y: 500, spec });
  const arch = m.spawnFromToken(mint('archer_keilia', 220), 0, 300, 500);
  const api = m.api(); api.mountTower(arch, tower);
  const base = arch.dmg * (arch.vars.bowQuality || 1);
  const tgt = (dx) => ({ x: tower.x + dx, y: tower.y, sp: { tags: [] }, element: 'Ular', intent: {} });
  arch.attackCd = 0; arch.quiver = 30; m.projectiles.length = 0;
  api.shoot(arch, tgt(tower.close - 10));
  const closeDmg = m.projectiles.length ? m.projectiles[m.projectiles.length - 1].dmg : 0;
  ok('close-range shot ≈ 2.5×', Math.abs(closeDmg - base * 2.5) < 0.6, 'got ' + closeDmg.toFixed(1) + ' vs base ' + base.toFixed(1));
  arch.attackCd = 0; m.projectiles.length = 0;
  api.shoot(arch, tgt(tower.close + 30));
  const farDmg = m.projectiles.length ? m.projectiles[m.projectiles.length - 1].dmg : 0;
  ok('far-range shot ≈ 1.5×', Math.abs(farDmg - base * 1.5) < 0.6, 'got ' + farDmg.toFixed(1));
  arch.attackCd = 0; m.projectiles.length = 0;
  api.shoot(arch, tgt(tower.far + 50));
  ok('beyond far range → no shot', m.projectiles.length === 0);
}

console.log('== WALL-TOWER: unmanned, auto-fires within range 50 ==');
{ const m = mk(); const b = m.spawnFromToken(mint('builder_keilia', 23), 0, 300, 500);
  const wt = m.raiseStructure(b, { role: 'wallTowerA', kind: 'wallTower', x: 300, y: 500, spec: m.builderSpec(0) });
  ok('wall-tower holds no garrison', wt.capacity === 0 && wt.range === 50);
  m.spawnFromToken(mint('rodak', 230), 1, 322, 500); // enemy 22px away, inside range
  wt.fireCd = 0; m.projectiles.length = 0; m.stepMisc();
  ok('wall-tower fires on a foe in range', m.projectiles.some(p => p.team === 0), '(' + m.projectiles.length + ' proj)');
}

console.log('== REPAIR: a builder mends a damaged structure over time ==');
{ const m = mk(); const b = m.spawnFromToken(mint('builder_keilia', 240), 0, 300, 500);
  const wall = m.raiseStructure(b, { role: 'wall0', kind: 'wall', x: 320, y: 500, spec: m.builderSpec(0) });
  wall.hp = wall.maxHp * 0.4; const hp0 = wall.hp;
  const api = m.api();
  for (let i = 0; i < 60; i++) { b.x = wall.x; b.y = wall.y; api.repair(b, wall); }
  ok('repair raises the structure hp', wall.hp > hp0, 'hp ' + hp0.toFixed(0) + '->' + wall.hp.toFixed(0));
}

console.log('== UPGRADE: unlocked by a hut pulse, then a TIMED job (not instant) ==');
{ const m = mk(); const b = m.spawnFromToken(mint('builder_keilia', 24), 0, 300, 500);
  const spec = m.builderSpec(0);
  const tower = m.raiseStructure(b, { role: 'tower1', kind: 'tower', x: 300, y: 500, spec });
  const wall = m.raiseStructure(b, { role: 'wall0', kind: 'wall', x: 360, y: 500, spec });
  const hut = m.raiseStructure(b, { role: 'hut', kind: 'hut', x: 240, y: 500, spec });
  const towerHp0 = tower.maxHp, close0 = tower.close, wallHp0 = wall.maxHp;
  const api = m.api(); api.enterHut(b, hut);
  b.mem.hutSincePulse = m.pulseIndex; m.pulseIndex += 1;
  m.stepMisc();
  ok('a hut pulse UNLOCKS upgrading (not instant)', m.upgradeReady(0) && !tower.upgraded);
  ok('fort still Level 1 before the job runs', m.fortLevel(0) === 1);
  // run the timed upgrade job on the tower
  api.startUpgrade(b, tower); b.inHut = null;
  for (let i = 0; i < 400 && !tower.upgraded; i++) { b.x = tower.x; b.y = tower.y; api.continueBuild(b); if (!b.mem.building) break; }
  ok('tower power & range doubled', tower.upgraded && tower.close === close0 * 2);
  ok('tower health tripled', tower.maxHp === towerHp0 * 3);
  api.startUpgrade(b, wall);
  for (let i = 0; i < 400 && !wall.upgraded; i++) { b.x = wall.x; b.y = wall.y; api.continueBuild(b); if (!b.mem.building) break; }
  ok('wall health quadrupled', wall.maxHp === wallHp0 * 4);
  ok('Hut advances to Level 2 when the works are done', m.fortLevel(0) === 2 && hut.level === 2);
}

console.log('== LEVEL-2 GATE: cone + ring only planned once the works are Level 2 ==');
{ const m = mk();
  m.spawnFromToken(mint('builder_keilia', 25), 0, 300, 500);
  m.spawnFromToken(mint('spear_keilia', 251), 0, 320, 500);
  m.spawnFromToken(mint('spear_keilia', 252), 0, 340, 500);
  const before = m.builderBlueprints(0);
  ok('no cone tower at Level 1', !before.some(bp => bp.kind === 'cone'));
  ok('no full ring at Level 1', before.filter(bp => bp.kind === 'wall').length <= 3, before.filter(bp => bp.kind === 'wall').length + ' walls');
  // stand up a Level-2 hut, then the ring/cone should appear
  const hut = m.raiseStructure(m.creatures[0], { role: 'hut', kind: 'hut', x: 240, y: 500, spec: m.builderSpec(0) });
  hut.level = 2;
  const after = m.builderBlueprints(0);
  ok('a cone tower is planned at Level 2', after.some(bp => bp.kind === 'cone'));
  ok('a full wall ring is planned at Level 2', after.filter(bp => bp.kind === 'wall').length >= 6, after.filter(bp => bp.kind === 'wall').length + ' walls');
}

console.log('== FRONT LINE: wall–tower–wall–tower–wall, towers behind the wall ==');
{ const m = mk(); m.spawnFromToken(mint('builder_keilia', 27), 0, 300, 500);
  const bps = m.builderBlueprints(0);
  const wt = bps.filter(bp => bp.kind === 'wallTower');
  ok('two wall-towers on the front line', wt.length === 2);
  ok('wall-towers spaced well apart', Math.abs(wt[0].y - wt[1].y) >= 100, 'gap ' + Math.abs(wt[0].y - wt[1].y).toFixed(0));
  const towers = bps.filter(bp => bp.kind === 'tower');
  const wallX = bps.find(bp => bp.kind === 'wallTower').x;
  ok('main towers sit behind the wall line', towers.every(t => Math.abs(t.x - 240) < Math.abs(wallX - 240)));
}

console.log('== NO MOUNT: a Builder never rides, but a normal Keilia/Eikar does ==');
{ const m = mk();
  const b = m.spawnFromToken(mint('builder_keilia', 500), 0, 500, 500);
  const mount1 = m.spawnFromToken(mint('domestic_punk', 501), 0, 502, 500);
  const sword = m.spawnFromToken(mint('sword_eikar', 502), 0, 800, 500);
  const mount2 = m.spawnFromToken(mint('domestic_punk', 503), 0, 802, 500);
  for (let i = 0; i < 20; i++) m.updateMounting();
  ok('the Builder does not mount', b.riding !== true && mount1.riderUnit == null);
  ok('a Sword Eikar DOES mount (control)', sword.riding === true || mount2.riderUnit != null);
}

console.log('== REPAIR IS HAMMER-WORK: swings (state attack) and mends in chunks ==');
{ const m = mk(); const b = m.spawnFromToken(mint('builder_keilia', 510), 0, 320, 500);
  const wall = m.raiseStructure(b, { role: 'wall0', kind: 'wall', x: 320, y: 500, spec: m.builderSpec(0) });
  wall.hp = wall.maxHp * 0.4; const hp0 = wall.hp;
  const api = m.api(); b.x = wall.x; b.y = wall.y;
  for (let i = 0; i < 40; i++) { b.attackCd = 0; api.repair(b, wall); }
  ok('builder swings its hammer while repairing', b.state === 'attack');
  ok('repair mends the structure', wall.hp > hp0, 'hp ' + hp0.toFixed(0) + '->' + wall.hp.toFixed(0));
}

console.log('== CLOSED RING: only a 100%-complete wall seals the interior ==');
// build the REAL blueprint fort (Level-2 ring included) for a team
function buildRing(m, team) {
  const own = m.teams[team].hoard;
  const b = m.spawnFromToken(mint('builder_keilia', 900 + team), team, own.x, own.y);
  m.spawnFromToken(mint('spear_keilia', 950 + team), team, own.x + 20, own.y);
  m.spawnFromToken(mint('spear_keilia', 960 + team), team, own.x + 20, own.y + 20);
  for (const bp of m.builderBlueprints(team)) if (!m.structures.some(s => s.team === team && s.role === bp.role)) m.raiseStructure(b, bp);
  const hut = m.structures.find(s => s.team === team && s.isHut); hut.level = 2;
  for (const bp of m.builderBlueprints(team)) if (!m.structures.some(s => s.team === team && s.role === bp.role)) m.raiseStructure(b, bp);
  return b;
}
{ const m = mk();
  // an open front line is NOT sealed
  const b = m.spawnFromToken(mint('builder_keilia', 520), 0, 300, 500);
  const sp = m.builderSpec(0);
  for (let dy = -120; dy <= 120; dy += 60) m.raiseStructure(b, { role: 'f' + dy, kind: 'wall', x: 360, y: 500 + dy, spec: sp });
  ok('an open front line is NOT a sealed enclosure', m.wallEnclosure(0) === null);
  // a full ring seals it
  const m2 = mk(); buildRing(m2, 0);
  ok('a completed ring reports a sealed interior', !!m2.wallEnclosure(0));
  // removing ONE wall segment breaks the seal — must be 100% complete
  const wall = m2.structures.find(s => s.team === 0 && s.type === 'wall');
  m2.structures = m2.structures.filter(s => s !== wall);
  ok('one missing wall segment breaks the seal (100% required)', m2.wallEnclosure(0) === null);
}

console.log('== REBUILD: builders rebuild a destroyed structure ==');
{ const m = mk(); const h0 = m.teams[0].hoard;
  m.spawnFromToken(mint('builder_keilia', 600), 0, h0.x, h0.y);
  m.spawnFromToken(mint('sword_keilia', 601), 0, h0.x + 120, h0.y);                 // a screen
  m.spawnFromToken(mint('rodak', 602), 1, m.teams[1].hoard.x, m.teams[1].hoard.y);  // keep the match alive, far off
  let built = false;
  for (let i = 0; i < 2500 && !m.over; i++) { m.doTick(); if (m.structures.some(s => s.team === 0 && s.role === 'tower1')) { built = true; break; } }
  ok('a tower was first built', built);
  const t = m.structures.find(s => s.team === 0 && s.role === 'tower1');
  m.freeOccupants(t); m.structures = m.structures.filter(s => s !== t);
  ok('the tower is destroyed', !m.structures.some(s => s.team === 0 && s.role === 'tower1'));
  let rebuilt = false;
  for (let i = 0; i < 4000 && !m.over; i++) { m.doTick(); if (m.structures.some(s => s.team === 0 && s.role === 'tower1')) { rebuilt = true; break; } }
  ok('builders rebuild the destroyed tower', rebuilt);
}

console.log('== NO DEPLOY INSIDE: enemy blocked from a sealed ring, Malsti blinks in ==');
{ const m = mk(); buildRing(m, 1);                    // team 1 fully walled
  const enc = m.wallEnclosure(1);
  const inX = m.teams[1].hoard.x - 150, inY = m.teams[1].hoard.y;   // a point inside the ring, clear of the hoard
  const T0 = m.teams[0];
  // team 0 tries to deploy a rodak inside the enemy ring
  T0.readied = [{ tok: mint('rodak', 530), state: 'ready', readiedAtPulse: -5, deaths: 0 }];
  const n0 = m.creatures.length;
  m.applyInput(0, { type: 'trigger', slot: 0, x: inX, y: inY });
  const placed = m.creatures[m.creatures.length - 1];
  const inside = (c) => c.x > enc.minX && c.x < enc.maxX && c.y > enc.minY && c.y < enc.maxY;
  ok('a normal creature is pushed OUT of the sealed ring', m.creatures.length === n0 + 1 && !inside(placed), 'at ' + placed.x.toFixed(0) + ',' + placed.y.toFixed(0));
  // a Malsti Punk is allowed to blink inside
  T0.readied = [{ tok: mint('malsti_punk', 531), state: 'ready', readiedAtPulse: -5, deaths: 0 }];
  m.applyInput(0, { type: 'trigger', slot: 0, x: inX, y: inY });
  const punk = m.creatures[m.creatures.length - 1];
  ok('a Malsti Punk CAN deploy inside the ring', punk.speciesId === 'malsti_punk' && inside(punk), 'at ' + punk.x.toFixed(0) + ',' + punk.y.toFixed(0));
}

console.log('== MALSTI PHASES: not shoved by an enemy wall ==');
{ const m = mk();
  m.structures.push({ id: 'w', type: 'wall', kind: 'wall', team: 0, x: 800, y: 500, w: 24, h: 84, hp: 200, maxHp: 200, quality: 1, vertical: true });
  const punk = m.spawnFromToken(mint('malsti_punk', 540), 1, 800, 500);
  punk.rooted = false; const px = punk.x, py = punk.y;
  m.stepMisc();
  ok('a Malsti Punk is not shoved out of the wall', Math.abs(punk.x - px) < 1 && Math.abs(punk.y - py) < 1);
}

console.log('== STORM: Builders down tools during the Sunear’Zikhron ==');
{ const m = mk(); const h = m.teams[0].hoard;
  const b = m.spawnFromToken(mint('builder_keilia', 26), 0, h.x, h.y);
  m.time = 4 * 60 + 10;   // last minute of a five-minute cycle
  ok('it is storming', m.zikhron() === true);
  const api = m.api(); api._c = b; D.behaviors.builder(b, api);
  ok('no construction starts during the storm', !b.mem.building);
}

console.log('== END-TO-END: a Builder raises the full works and garrisons archers ==');
{ const m = mk(); const rng = new U.Rng(30); const h0 = m.teams[0].hoard;
  const bt = mint('builder_keilia', 300); bt.picks = Object.assign({}, bt.picks, { relicIntegration: 0, trapIntegration: 1, siegeProficiency: 1 });
  m.spawnFromToken(bt, 0, h0.x, h0.y);
  m.spawnFromToken(mint('archer_keilia', 301), 0, h0.x, h0.y + 30);
  m.spawnFromToken(mint('archer_eikar', 302), 0, h0.x, h0.y - 30);
  m.spawnFromToken(mint('sword_keilia', 303), 0, h0.x + 120, h0.y);
  const foeH = m.teams[1].hoard;
  m.spawnFromToken(mint('mikolo_moko', 304), 1, foeH.x, foeH.y);
  m.spawnFromToken(mint('harkal', 305), 1, h0.x + 320, h0.y);
  let sawTower = false, sawWallTower = false, sawHut = false, sawGarrison = false;
  for (let i = 0; i < 3000 && !m.over; i++) {
    m.doTick();
    for (const s of m.structures) {
      if (s.kind === 'tower') sawTower = true;
      if (s.kind === 'wallTower') sawWallTower = true;
      if (s.isHut) sawHut = true;
      if ((s.kind === 'tower' || s.kind === 'cone') && s.occupants && s.occupants.length) sawGarrison = true;
    }
  }
  ok('a manned tower was raised', sawTower);
  ok('a wall-tower was raised', sawWallTower);
  ok('the Builder’s Hut was raised', sawHut);
  ok('an archer garrisoned a tower', sawGarrison);
}

console.log('== THREE BUILDERS: all stay productive (none left idle) & reach Level 2 ==');
{ const m = mk(); const h0 = m.teams[0].hoard;
  for (let i = 0; i < 3; i++) m.spawnFromToken(mint('builder_keilia', 400 + i), 0, h0.x, h0.y + (i - 1) * 24);
  m.spawnFromToken(mint('spear_keilia', 410), 0, h0.x + 40, h0.y);
  m.spawnFromToken(mint('spear_keilia', 411), 0, h0.x + 40, h0.y + 30);
  m.spawnFromToken(mint('sword_keilia', 412), 0, h0.x + 120, h0.y);   // a screen
  m.spawnFromToken(mint('rodak', 420), 1, m.teams[1].hoard.x, m.teams[1].hoard.y);
  const builders = m.creatures.filter(c => c.sp.behavior === 'builder');
  let maxIdleStreak = 0, idleStreak = 0, reachedL2 = false, sawInHut = false;
  for (let i = 0; i < 8000 && !m.over; i++) {
    m.doTick();
    if (m.fortLevel(0) === 2) reachedL2 = true;
    if (builders.some(b => b.inHut)) sawInHut = true;
    // an idle builder = alive, not in the hut, no job, and loitering away from
    // any structure while a hut already exists (i.e. nothing to do but standing)
    if (i > 400) {
      const anyIdle = builders.some(b => {
        if (b.dead || b.inHut || b.mem.building) return false;
        const nearStruct = m.structures.some(s => s.team === 0 && U.dist(b.x, b.y, s.x, s.y) < 44);
        const hut = m.structures.find(s => s.team === 0 && s.isHut);
        return hut && !nearStruct;   // hut exists but this builder is loitering away from any structure
      });
      idleStreak = anyIdle ? idleStreak + 1 : 0;
      maxIdleStreak = Math.max(maxIdleStreak, idleStreak);
    }
  }
  ok('the works reach Level 2 with 3 builders + 2 spearmen', reachedL2);
  ok('at least one builder shelters in the Hut', sawInHut);
  ok('no builder is left idle for long', maxIdleStreak < 240, 'max idle streak ' + maxIdleStreak + ' ticks');
}

console.log(fails ? ('\nBUILDER FORTRESS: ' + fails + ' FAILURE(S)') : '\nBUILDER FORTRESS: ALL PASS');
process.exit(fails ? 1 : 0);
