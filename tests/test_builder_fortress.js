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

console.log('== HUT UPGRADE: after a full pulse, towers ×2 range/×3 hp, walls ×4 hp ==');
{ const m = mk(); const b = m.spawnFromToken(mint('builder_keilia', 24), 0, 300, 500);
  const spec = m.builderSpec(0);
  const tower = m.raiseStructure(b, { role: 'tower1', kind: 'tower', x: 300, y: 500, spec });
  const wall = m.raiseStructure(b, { role: 'wallFront', kind: 'wall', x: 360, y: 500, spec });
  const hut = m.raiseStructure(b, { role: 'hut', kind: 'hut', x: 240, y: 500, spec });
  const towerHp0 = tower.maxHp, close0 = tower.close, wallHp0 = wall.maxHp;
  const api = m.api(); api.enterHut(b, hut);
  b.mem.hutSincePulse = m.pulseIndex; m.pulseIndex += 1;   // a full pulse elapses in the hut
  m.stepMisc();
  ok('tower power & range doubled', tower.upgraded && tower.close === close0 * 2);
  ok('tower health tripled', tower.maxHp === towerHp0 * 3);
  ok('wall health quadrupled', wall.maxHp === wallHp0 * 4);
}

console.log('== SPEARMEN: 2+ add a cone tower and a full wall ring ==');
{ const m = mk();
  m.spawnFromToken(mint('builder_keilia', 25), 0, 300, 500);
  m.spawnFromToken(mint('spear_keilia', 251), 0, 320, 500);
  m.spawnFromToken(mint('spear_keilia', 252), 0, 340, 500);
  const bps = m.builderBlueprints(0);
  ok('a cone tower is planned', bps.some(bp => bp.kind === 'cone'));
  ok('a full wall ring is planned', bps.filter(bp => bp.kind === 'wall').length >= 5, bps.filter(bp => bp.kind === 'wall').length + ' walls');
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

console.log(fails ? ('\nBUILDER FORTRESS: ' + fails + ' FAILURE(S)') : '\nBUILDER FORTRESS: ALL PASS');
process.exit(fails ? 1 : 0);
