/* Headless test: the field refinement pass.
   - TOKENS: shots aimed from where they're loosed actually land on a level
     target; archers re-fletch and fight hand-to-hand when empty; the Hvaleia
     clubs small foes; nothing walks itself into the border tether; a bare
     point's "enemies near" never counts allies.
   - BUILDER WALLS: every fort (1v1, free-for-all corners, camps stacked above
     each other, crowded 5v5, shared camps, the king's castle) is laid out with
     NO overlapping pieces, inside the arena, and its finished ring seals.
   - BRAWL: a side that loses every Relic it owns is knocked out (creatures
     gone, nothing more to field, hoard plundered); the last side holding a
     Relic wins; conceding hands the win to a side still in it.
   - MAPS: terrain is real — rock blocks walkers (not flyers) and sight, sand
     slows, the oasis mends, Su creatures swim the channel, a creature knocked
     into a chasm falls, and nothing is ever deployed inside rock. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global; global.DYA = {};
global.document = { createElement: () => ({ getContext: () => null, style: {} }), addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
for (const f of ['js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js', 'js/data/lore.js',
  'js/core/token.js', 'js/engine/parts.js', 'js/engine/behaviors.js', 'js/engine/match.js']) {
  eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f);
}
const D = global.DYA, U = D.util, TK = D.token, SP = D.species;
let fails = 0;
const ok = (n, c, x) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (c ? '' : '   ← ' + (x || ''))); if (!c) fails++; };
const mint = (id, seed) => TK.mint({ speciesId: id, rng: new U.Rng(seed) });
function mk(opts) {
  opts = opts || {};
  const L = opts.layout || [[240, 500, 0], [1360, 500, 1]];
  const M = new D.match.Match({ seed: opts.seed || 11, mode: 'standard', terrain: opts.terrain || 'plains',
    settings: { pulseInterval: 6, pulseAmount: 3, chaos: false }, kingHill: opts.kingHill || null,
    teams: L.map((p, i) => ({ name: 'T' + i, side: p[2], king: !!(opts.kingHill && i === 0), hoard: { x: p[0], y: p[1] }, controller: opts.controller || 'x', aiSkill: 0.7, pouch: (opts.pouch && opts.pouch(i)) || [] })) });
  M.headless = true;
  return M;
}
/* a still, unkillable practice target */
function dummy(M, team, x, y, id) {
  const d = M.spawnFromToken(mint(id || 'rodak', 5), team, x, y);
  d.behaviorOverride = 'inert'; d.rooted = true; d.maxHp = d.hp = 50000; d.vars.dodge = 0;
  return d;
}

console.log('== TOKENS ==');
{ /* an archer level with its target hits it (shots used to leave from above
     the feet but be aimed from the feet, sailing over every level target) */
  const M = mk(); const a = M.spawnFromToken(mint('archer_keilia', 3), 0, 650, 500); const t = dummy(M, 1, 800, 500);
  for (let i = 0; i < 200; i++) M.doTick();
  ok('a level archer shot lands', t.hp < 50000, 'target hp ' + t.hp);
  const q0 = a.quiver;
  ok('the archer spent arrows doing it', q0 < Math.round(a.vars.quiver || 20));
}
{ const M = mk(); const a = M.spawnFromToken(mint('archer_eikar', 4), 0, 400, 500);
  a.quiver = 0; for (let i = 0; i < 20 * 12; i++) M.doTick();
  ok('an empty quiver re-fletches over time', a.quiver >= 3, 'quiver ' + a.quiver);
}
{ const M = mk(); const a = M.spawnFromToken(mint('archer_eikar', 6), 0, 700, 500); a.quiver = 0; a.mem.lastShotTick = 1e9;   // no re-fletch in this window
  const foe = dummy(M, 1, 730, 500);
  for (let i = 0; i < 80; i++) { a.quiver = 0; M.doTick(); }
  ok('an archer with no arrows fights what closes in', foe.hp < 50000);
}
{ const M = mk(); M.spawnFromToken(mint('hvaleia', 7), 0, 760, 500); const small = dummy(M, 1, 800, 500, 'rodak');
  for (let i = 0; i < 20 * 15; i++) M.doTick();
  ok('the Hvaleia strikes a small foe beside it', small.hp < 50000, 'hp ' + small.hp);
}
{ const M = mk(); const k = M.spawnFromToken(mint('kofi', 8), 0, 60, 500);
  /* chase it toward the left edge with something big */
  const h = M.spawnFromToken(mint('sru_vorn', 9), 1, 140, 500); h.behaviorOverride = 'inert';
  for (let i = 0; i < 20 * 20; i++) M.doTick();
  ok('a fleeing creature never runs itself into the border tether', !k.dead || M.events.every(e => !/faded at the arena border/.test(e.msg)));
}
{ const M = mk({ layout: [[240, 500, 0], [1360, 500, 1]] }); const api = M.api();
  M.spawnFromToken(mint('sword_eikar', 10), 0, 800, 500); M.spawnFromToken(mint('sword_eikar', 11), 0, 820, 500);
  ok('a bare point never counts its own allies as enemies', api.enemiesNear({ x: 800, y: 500, team: 0 }, 140).length === 0);
  ok('…but does count real rivals', (M.spawnFromToken(mint('rodak', 12), 1, 790, 500), api.enemiesNear({ x: 800, y: 500, team: 0 }, 140).length === 1));
}

console.log('== BUILDER WALLS ==');
function raiseAll(M, team) {
  const own = M.teams[team].hoard;
  const b = M.spawnFromToken(mint('builder_keilia', 900 + team), team, own.x, own.y);
  M.spawnFromToken(mint('spear_keilia', 950 + team), team, own.x, own.y);
  M.spawnFromToken(mint('spear_keilia', 960 + team), team, own.x, own.y);
  const ft = M.fortTeam(team);
  for (let pass = 0; pass < 2; pass++) {
    for (const bp of M.builderBlueprints(team)) if (!M.structures.some(s => s.team === ft && s.role === bp.role)) M.raiseStructure(b, bp);
    const hut = M.structures.find(s => s.team === ft && s.isHut); if (hut) hut.level = 2;
  }
}
function overlaps(M) {
  const S = M.structures.filter(s => s.w && s.h), out = [];
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const a = S[i], b = S[j];
    if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.5 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 0.5) out.push(a.role + '×' + b.role);
  }
  return out;
}
const W = 1600, H = 1000;
const LAYOUTS = {
  '1v1': [[240, 500, 0], [1360, 500, 1]],
  'free-for-all corners': [[320, 280, 0], [W - 320, 280, 1], [320, H - 280, 2], [W - 320, H - 280, 3]],
  'camps stacked vertically': [[800, 200, 0], [800, 800, 1]],
  'crowded 5v5': [[300, 500], [250, 180], [350, 820], [300, 340], [280, 660]].map(p => [p[0], p[1], 0]).concat([[300, 500], [250, 180], [350, 820], [300, 340], [280, 660]].map(p => [W - p[0], p[1], 1])),
  'shared 3v3 camps': [[340, 500, 0], [340, 500, 0], [340, 500, 0], [1260, 500, 1], [1260, 500, 1], [1260, 500, 1]],
};
for (const [name, L] of Object.entries(LAYOUTS)) {
  const M = mk({ layout: L });
  L.forEach((_, i) => raiseAll(M, i));
  const ov = overlaps(M);
  ok(name + ': no two pieces of any fort overlap', ov.length === 0, ov.slice(0, 3).join(', '));
  ok(name + ': every piece inside the arena', M.structures.every(s => !s.w || (s.x - s.w / 2 >= 0 && s.x + s.w / 2 <= W && s.y - s.h / 2 >= 0 && s.y + s.h / 2 <= H)));
  ok(name + ': every finished ring seals', L.every((_, i) => !!M.wallEnclosure(M.fortTeam(i))));
}
{ const M = mk({ layout: LAYOUTS['shared 3v3 camps'] }); LAYOUTS['shared 3v3 camps'].forEach((_, i) => raiseAll(M, i));
  ok('a shared camp raises ONE fort, not one per ally', M.structures.filter(s => s.role === 'tower1').length === 2);
}
{ const L = [[800, 500, 0]].concat([0, 1, 2, 3].map(i => { const a = -Math.PI / 2 + i / 4 * Math.PI * 2; return [800 + Math.cos(a) * 590, 500 + Math.sin(a) * 340, i + 1]; }));
  const M = mk({ layout: L, kingHill: { protect: 300 } });
  ok('the king’s castle walls are tiled with no overlaps', overlaps(M).length === 0, overlaps(M).slice(0, 3).join(', '));
  raiseAll(M, 0);
  ok('a king’s Builder adds only its Hut inside the castle (no second fort)', M.structures.filter(s => s.team === 0 && !/^castle/.test(s.role)).every(s => s.isHut));
  ok('…and the castle still has no overlaps and still seals', overlaps(M).length === 0 && !!M.wallEnclosure(0));
}
{ const M = mk({ layout: [[800, 200, 0], [800, 800, 1]] }); raiseAll(M, 0);
  const front = M.structures.filter(s => s.team === 0 && /^wall\d$/.test(s.role));
  ok('a fort faces a rival camp below it (front wall runs across, facing down)', front.length && front.every(s => !s.vertical && s.face === 1 && s.y > 200));
}

console.log('== BRAWL KNOCKOUTS ==');
function ffa3() {
  const M = mk({ layout: [[300, 300, 0], [1300, 300, 1], [800, 760, 2]], pouch: (i) => [mint('sword_eikar', 70 + i), mint('rodak', 80 + i)] });
  M.teams.forEach(T => { T.resources = { Fti: 10, Su: 10, Eldi: 10, Ular: 10 }; });
  return M;
}
function capture(M, owner, by) { const r = M.relics[owner]; r.captured = true; r.capturedBy = by; r.capturedBySide = M.sideOf(by); r.capturedAt = M.time; }
{ const M = ffa3();
  M.spawnFromToken(M.teams[2].pouch[0].tok, 2, 800, 700); M.teams[2].pouch[0].state = 'played';
  capture(M, 2, 0); M.checkEnd();
  ok('losing your only Relic knocks you out', M.teams[2].out === true && !M.over);
  ok('…your creatures leave the field', !M.creatures.some(c => !c.dead && c.team === 2));
  ok('…nothing is left to field', !M.teams[2].pouch.some(e => e.state === 'pouch'));
  ok('…and the thief plunders half your hoard', M.teams[0].resources.Fti === 15 && M.teams[2].resources.Fti === 0, JSON.stringify(M.teams[0].resources));
  const before = M.teams[2].resources.Fti; M.doPulse();
  ok('a knocked-out band draws no pulse', M.teams[2].resources.Fti === before);
  M.teams[2].pouch[1].state = 'pouch'; M.applyInput(2, { type: 'ready', pouchIdx: 1 });
  ok('a knocked-out band cannot ready tokens', M.teams[2].readied.length === 0);
  capture(M, 1, 0); M.checkEnd();
  ok('the last side still holding a Relic wins', M.over && M.result.winnerSide === 0 && M.result.how === 'relic', JSON.stringify(M.result && M.result.how));
}
{ const M = mk({ layout: [[300, 300, 0], [300, 700, 0], [1300, 300, 1], [1300, 700, 1]], pouch: (i) => [mint('sword_eikar', 90 + i)] });
  capture(M, 2, 0); M.checkEnd();
  ok('team battle: one ally robbed does not knock the side out', !M.teams[2].out && !M.over);
  M.teams.forEach(T => { T.resources = { Fti: 0, Su: 0, Eldi: 0, Ular: 0 }; }); M.doPulse();
  const r = (T) => T.resources.Fti + T.resources.Su + T.resources.Eldi + T.resources.Ular;
  ok('…but the robbed player draws only half a pulse', r(M.teams[2]) < r(M.teams[3]), r(M.teams[2]) + ' vs ' + r(M.teams[3]));
  capture(M, 3, 1); M.checkEnd();
  ok('team battle: all of a side’s Relics taken → that side loses', M.over && M.result.winnerSide === 0);
}
{ const M = ffa3(); capture(M, 2, 1); M.checkEnd();
  M.concede(0);
  ok('conceding a brawl hands the win to a side still in it (never a knocked-out one)', M.over && M.result.winnerSide === 1);
}
{ /* a full AI free-for-all finishes on Relics, not on the 15-minute clock */
  const pouch = (i) => { const r = new U.Rng(300 + i); const o = []; for (let k = 0; k < 13; k++) o.push(mint(r.pick(SP.craftable), 400 + i * 20 + k)); o.push(mint('sword_eikar', 500 + i)); o.push(mint('mikolo_moko', 520 + i)); return o; };
  let relicEnds = 0;
  for (let s = 1; s <= 3; s++) {
    const M = mk({ seed: s * 31, controller: 'ai', layout: [[320, 280, 0], [W - 320, 280, 1], [320, H - 280, 2], [W - 320, H - 280, 3]], pouch });
    M.settings.pulseInterval = 8; M.settings.pulseAmount = 2;
    while (!M.over && M.tick < 20 * 900) M.doTick();
    if (M.over && M.result.how === 'relic') relicEnds++;
  }
  ok('AI free-for-alls are decided by Relics, not the time cap', relicEnds >= 2, relicEnds + '/3');
}

console.log('== MAPS ==');
{ const a = mk({ terrain: 'mountain', seed: 77 }), b = mk({ terrain: 'mountain', seed: 77 });
  ok('terrain is laid out from the seed (lockstep/replay safe)', a.obstacles.length > 0 && JSON.stringify(a.obstacles) === JSON.stringify(b.obstacles) && JSON.stringify(a.zones) === JSON.stringify(b.zones));
  ok('plains stays open ground', mk({ terrain: 'plains' }).obstacles.length === 0);
}
for (const terr of ['forest', 'mountain', 'desert', 'ocean', 'spire_cliffs', 'arpeggio', 'eldi_aagac', 'elsharyn']) {
  const M = mk({ terrain: terr, layout: [[320, 280, 0], [W - 320, 280, 1], [320, H - 280, 2], [W - 320, H - 280, 3]] });
  const feats = M.obstacles.concat(M.zones.filter(z => z.type !== 'water' || terr === 'ocean'));
  ok(terr + ': has real features, all clear of every camp', feats.length > 0 && M.teams.every(T => M.obstacles.every(o => U.dist(o.x, o.y, T.hoard.x, T.hoard.y) > o.r + 200)));
}
{ const M = mk({ terrain: 'mountain' }); const o = M.obstacles[0];
  const walker = M.spawnFromToken(mint('rodak', 20), 0, o.x - o.r - 40, o.y); walker.behaviorOverride = 'inert';
  for (let i = 0; i < 60; i++) { walker.intent = { move: { x: o.x + o.r + 60, y: o.y } }; M.execIntent(walker); M.stepMisc(); }
  ok('a walker never ends up inside rock', U.dist(walker.x, walker.y, o.x, o.y) >= o.r);
  const flyer = M.spawnFromToken(mint('harkal', 21), 0, o.x, o.y);
  M.stepMisc();
  ok('a flyer passes over rock', U.dist(flyer.x, flyer.y, o.x, o.y) < 2);
  ok('rock blocks a shot across it', M.losBlocked(o.x - o.r - 30, o.y, o.x + o.r + 30, o.y, 0));
  const dep = M.spawnFromToken(mint('sword_eikar', 22), 0, o.x, o.y);
  ok('nothing that walks is deployed inside rock', U.dist(dep.x, dep.y, o.x, o.y) >= o.r);
  /* walking around: a walker sent to the far side gets there */
  const M2 = mk({ terrain: 'mountain' }); const o2 = M2.obstacles[0];
  const w2 = M2.spawnFromToken(mint('sword_eikar', 23), 0, o2.x - o2.r - 30, o2.y + 3); w2.behaviorOverride = 'inert';
  for (let i = 0; i < 20 * 12; i++) { w2.intent = { move: { x: o2.x + o2.r + 40, y: o2.y } }; M2.execIntent(w2); M2.stepMisc(); }
  ok('a walker steers round an outcrop to the far side', U.dist(w2.x, w2.y, o2.x + o2.r + 40, o2.y) < 30, 'ended ' + w2.x.toFixed(0) + ',' + w2.y.toFixed(0));
}
{ const M = mk({ terrain: 'spire_cliffs' }); const ch = M.obstacles.find(o => o.kind === 'chasm');
  const c = M.spawnFromToken(mint('sword_eikar', 30), 1, ch.x - ch.r - 20, ch.y); c.behaviorOverride = 'inert';
  c.x = ch.x; c.y = ch.y;   // knocked in
  M.stepMisc();
  ok('a creature knocked into a chasm falls', c.dead === true);
  ok('chasms do not block sight', !M.losBlocked(ch.x - ch.r - 30, ch.y, ch.x + ch.r + 30, ch.y, 0) || M.obstacles.some(o => o !== ch && o.blocksSight));
}
{ const M = mk({ terrain: 'desert' });
  const sand = M.zones.find(z => z.type === 'sand'), oasis = M.zones.find(z => z.type === 'oasis');
  const c = M.spawnFromToken(mint('sword_eikar', 40), 0, sand.x, sand.y);
  ok('deep sand slows a walker', M.terrainSpeedMul(c) < 0.8);
  ok('…but not a flyer', M.terrainSpeedMul(M.spawnFromToken(mint('harkal', 41), 0, sand.x, sand.y)) === 1);
  const h = M.spawnFromToken(mint('sword_eikar', 42), 0, oasis.x, oasis.y); h.behaviorOverride = 'inert'; h.hp = h.maxHp * 0.5;
  for (let i = 0; i < 20 * 10; i++) M.stepMisc();
  ok('the oasis mends whoever holds it', h.hp > h.maxHp * 0.55, (h.hp / h.maxHp).toFixed(2));
}
{ const M = mk({ terrain: 'ocean' });
  const water = M.zones.find(z => z.type === 'water');
  const su = M.spawnFromToken(mint('raf_krabbi', 50), 0, water.x, water.y), land = M.spawnFromToken(mint('rodak', 51), 0, water.x, water.y);
  ok('the channel slows a land walker', M.terrainSpeedMul(land) < 0.6);
  ok('…and a Su creature swims it faster', M.terrainSpeedMul(su) > 1);
  const ys = M.zones.filter(z => z.type === 'water' && Math.abs(z.x - W / 2) < 1).map(z => z.y).sort((a, b) => a - b);
  ok('the channel leaves a ford across the middle', ys.length >= 4 && !ys.some(y => Math.abs(y - H / 2) < 130));
}
{ const M = mk({ terrain: 'eldi_aagac' });
  const fires0 = M.zones.filter(z => z.type === 'fire').length; M.doPulse();
  ok('Eldi Aagac fire-trees drop embers each pulse', M.zones.filter(z => z.type === 'fire').length > fires0);
}

console.log(fails ? '\nFIELD REFINE: ' + fails + ' FAILURE(S)' : '\nFIELD REFINE: ALL PASS');
process.exit(fails ? 1 : 0);
