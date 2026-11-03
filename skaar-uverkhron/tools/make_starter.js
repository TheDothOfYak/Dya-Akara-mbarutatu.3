/* Builds maps/starter.json: "The First Dusk", the map the title screen
   offers first. Run:  node skaar-uverkhron/tools/make_starter.js
   It tries seeds until both starting towns share Velki, can reach each
   other over land, and stand a fair way apart; then it turns the game
   into a map (no heroes, towns marked as starts). */
const path = require('path'), fs = require('fs');
const base = path.join(__dirname, '..', 'js');
['core', 'data', 'state', 'make', 'rules', 'mapgen'].forEach(f => require(path.join(base, f + '.js')));
const SU = globalThis.SU, S = SU.state, RU = SU.rules;

function good(st) {
  const towns = Object.values(st.objects).filter(o => o.type === 'town' && o.owner >= 0);
  if (towns.length !== 2 || towns[0].layer !== 0 || towns[1].layer !== 0) return false;
  const d = Math.hypot(towns[0].x - towns[1].x, towns[0].y - towns[1].y);
  if (d < 22) return false;
  const a = Object.values(st.armies).find(x => x.owner === 0);
  st.players[0].explored.forEach(E => E.fill(1));
  const p = RU.path(st, a, towns[1].x, towns[1].y, { throughWild: true });
  return !!p && d;
}
let st = null, seed = 0, best = null;
for (seed = 1000; seed < 1400; seed++) {
  const s = SU.mapgen.newGame({ size: 'M', spread: false, wild: 'normal', name: 'The First Dusk', seed, players: [{ kind: 'human', name: 'A' }, { kind: 'ai', name: 'B' }] });
  const d = good(s); if (d && (!best || Math.abs(d - 32) < Math.abs(best.d - 32))) best = { s, seed, d };
  if (best && Math.abs(best.d - 32) < 4) break;
}
st = best.s; console.log('seed', best.seed, 'distance', best.d.toFixed(1));

/* a few gifts by each start, the same for both */
const R = SU.makeRng(best.seed);
Object.values(st.objects).filter(o => o.type === 'town' && o.owner >= 0).forEach(t => {
  [['gold', 1500], ['wood', 10], ['stone', 10], ['food', 20]].forEach(([res, amt]) => {
    for (let k = 0; k < 60; k++) { const x = t.x + R.int(-4, 4), y = t.y + R.int(2, 5);
      if (S.passable(st, t.layer, x, y) && !S.objAt(st, t.layer, x, y) && !S.armyAt(st, t.layer, x, y) && !RU.guardNear(st, t.layer, x, y)) { const o = { id: SU.uid(st, 'o'), type: 'pile', layer: t.layer, x, y, res, amt }; st.objects[o.id] = o; S.place(st, o); break; } }
  });
});
/* into a map */
Object.values(st.objects).forEach(o => { if (o.type === 'town') { if (o.owner >= 0) o.start = true; o.owner = -1; } if (o.type === 'mine') o.owner = -1; });
Object.values(st.armies).forEach(a => { if (!a.wild) delete st.armies[a.id]; });
st.heroes = {}; st.cores = {};
const packed = JSON.parse(S.serialize(Object.assign({}, st, { players: [] })));
const objects = {}; Object.values(st.objects).forEach(o => { const c = JSON.parse(JSON.stringify(o)); delete c._k; objects[o.id] = c; });
const starts = Object.values(st.objects).filter(o => o.type === 'town' && o.start).sort((a, b) => a.x - b.x).map(o => o.id);
const wild = Object.values(st.armies).filter(a => a.wild && !a.dead).map(a => ({ layer: a.layer, x: a.x, y: a.y, power: Math.round(a.power0 || S.power(a.slots)), cr: null, guard: a.guard || null, roam: !!a.roam, herd: !!a.herd }));
const map = { id: 'starter', builtin: true, name: 'The First Dusk', desc: 'A first map: you and one rival share Velki. Xikia, Leotik and the moons wait beyond the Urverk.', size: 'M',
  layers: packed.layers, objects, wild, starts, moons: st.moons || [], nextId: st.nextId, at: Date.now(), win: { kind: 'conquer' }, players: 2 };
const out = path.join(__dirname, '..', 'maps', 'starter.json');
fs.writeFileSync(out, JSON.stringify(map));
fs.writeFileSync(path.join(__dirname, '..', 'maps', 'index.json'), JSON.stringify([{ id: 'starter', file: 'starter.json', name: map.name, desc: map.desc, size: map.size, players: 2 }]));
console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB');
