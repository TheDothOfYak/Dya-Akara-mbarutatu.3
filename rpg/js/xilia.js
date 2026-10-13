/* ============================================================
   XILIA, on Xikia — the town where Tanoc's shell lay when Noka
   carried his Hurst across, and where the Carpenter, Buhkon Eldi,
   saved the Eikar with no hat. Home. A busy little town of
   acorn-capped cottages on a sunny highland: a market square,
   farms, a forest, and — out past the fields — the Ember Grove
   and a Duskareth hideout. West of town the little road crosses
   the Brightwater and runs into the trees: the forest path to the
   Carpenter's property, which is a land of its own (property.js).
   Most of the cottages can be gone into (interiors.js).
   ============================================================ */
import * as THREE from 'three';
import { mulberry32, fbm, smooth, lerp, clamp } from './util.js';
import { toon, ramp, glowSprite, outlineAll, addOutline } from './gfx.js';
import { Colliders, Kit, buildGrass, STEP, makePass } from './terrain.js';
export { STEP };

const SQUARE = { x: 0, z: 50 };
const SQ_H = 1.0;
/* the little road west out of town, over the river and into the trees: the forest path to the Carpenter's */
const WEST_ROAD = [[-168, 58], [-205, 40], [-250, 12], [-292, -10], [-338, -26]];
const WEST_EXIT = { x: -338, z: -26 };
const WEST_N = (() => { const dx = -338 + 292, dz = -26 + 10, l = Math.hypot(dx, dz); return { x: dx / l, z: dz / l }; })();
function westRoadDist(x, z) {
  let best = 1e9;
  for (let i = 0; i < WEST_ROAD.length - 1; i++) {
    const [ax, az] = WEST_ROAD[i], [bx, bz] = WEST_ROAD[i + 1], vx = bx - ax, vz = bz - az;
    const t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return best;
}
export const PEN = { x: -46, z: 104 };
export const GROVE = { x: 64, z: -112 };
export const HIDEOUT = { x: -108, z: -74 };
const CLEAR = [
  { x: SQUARE.x, z: SQUARE.z, r: 26 }, { x: PEN.x, z: PEN.z, r: 14 },
  { x: GROVE.x, z: GROVE.z, r: 20 }, { x: HIDEOUT.x, z: HIDEOUT.z, r: 18 }, { x: 96, z: 10, r: 15 }, { x: -62, z: -40, r: 15 },
];

/* the old island's rim — everything inside it is the town's home ground and stays exactly as it was */
function oldEdge(x, z) {
  const a = Math.atan2(z, x);
  return 182 + (fbm(Math.cos(a) * 2.1 + 11, Math.sin(a) * 2.1 + 3, 3) - 0.5) * 40;
}
function oldHeight(x, z) {
  let h = (fbm(x * 0.01 + 9, z * 0.01 - 2, 4) - 0.5) * 18 + (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 1.6;
  h += smooth(10, -160, z) * 9;                                // the north rises into forest hills
  h = lerp(h, SQ_H, smooth(90, 50, Math.hypot(x - SQUARE.x, (z - SQUARE.z) * 0.8)));   // the town sits on a broad flat
  if (z > 120 && Math.abs(x) < 30) h = lerp(h, 0.6, smooth(16, 6, Math.abs(x)) * smooth(120, 150, z));
  return h;
}

/* ============================================================
   The northern Xikia highlands around the town: rolling meadows,
   pine forest, a river into Mirrormere (the big lake under the
   docks), ponds, hills — all ringed by the Crown Ridge, the
   Greyfang cliffs and the Sundered Gorge. Ranges run on to the
   horizon. One water level for every lake and river.
   ============================================================ */
export const WATER_LEVEL = -5.5;
const DEEP = 1.6;                                              // deeper than this is swimming, not wading
const LAKES = [
  { id: 'mirrormere', x: 0, z: 295, rx: 150, rz: 112, d: 30 },   // the big lake under the pier
  { id: 'highmere', x: 300, z: -255, rx: 72, rz: 56, d: 18 },
  { id: 'pond_e', x: 235, z: 112, rx: 20, rz: 17, d: 4.5 },
  { id: 'pond_nw', x: -178, z: -258, rx: 18, rz: 16, d: 4 },
  { id: 'pond_n', x: 150, z: -332, rx: 16, rz: 15, d: 4 },
  { id: 'fen', x: -300, z: 190, rx: 26, rz: 20, d: 2.6 },
];
const RIVER = [[-318, -392], [-292, -270], [-258, -150], [-240, -20], [-226, 100], [-178, 200], [-110, 262], [-50, 292]];
const RIVER_W = 8, RIVER_D = 4.2;
/* the barrier ring: where the walkable highlands meet the ranges */
function barrierR(a) { return 480 + (fbm(Math.cos(a) * 1.7 + 5, Math.sin(a) * 1.7 - 7, 3) - 0.5) * 90; }
const inArc = (a, a0, a1, f = 0.15) => smooth(a0 - f, a0, a) * smooth(a1 + f, a1, a);
const gorgeW = a => inArc(a, -0.5, 0.38);                       // east: the Sundered Gorge
const cliffW = a => inArc(a, -2.75, -1.95);                     // north-west: the Greyfang cliffs
const KUNI_A = -1.25;
const KUNI = { x: Math.cos(KUNI_A) * (barrierR(KUNI_A) + 22), z: Math.sin(KUNI_A) * (barrierR(KUNI_A) + 22) };

function riverDist(x, z) {
  let best = 1e9;
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1], vx = bx - ax, vz = bz - az;
    const t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return best;
}
/* the wild land, before water and mountains */
function wildBase(x, z, r) {
  let h = (fbm(x * 0.01 + 9, z * 0.01 - 2, 4) - 0.5) * 18 + (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 1.6 + smooth(10, -160, z) * 9;
  const meadow = smooth(0.42, 0.62, fbm(x * 0.004 + 50, z * 0.004 - 12, 2));
  h += (fbm(x * 0.0065 + 3, z * 0.0065 + 8, 4) - 0.42) * 34 * smooth(170, 300, r) * (1 - meadow * 0.6);   // rolling hills
  h += smooth(-200, -420, z) * 10;                              // the northern highlands climb toward the Crown Ridge
  return Math.max(h, WATER_LEVEL + 1.5);
}
function mountains(x, z, r, a) {
  const Rb = barrierR(a), gw = gorgeW(a), cw = cliffW(a);
  const rg = 1 - Math.abs(2 * fbm(x * 0.006 + 31, z * 0.006 - 17, 4) - 1);
  const R0 = Rb + gw * 45;                                      // past the gorge the ranges start further out
  let m = smooth(R0 - 40 + cw * 18, R0 + 12, r) * (40 + 80 * rg) + cw * smooth(Rb - 26, Rb - 18, r) * 34;
  const out = Math.max(0, r - R0);
  m += Math.min(out * 0.45, 230) * (0.45 + rg) * (0.75 + 0.5 * fbm(x * 0.0015 - 4, z * 0.0015 + 9, 3));
  const dk = Math.hypot(x - KUNI.x, z - KUNI.z);
  if (dk < 60) m += 88 * Math.exp(-dk * dk / (2 * 13 * 13));   // the Kuni spire
  return m;
}
function water(x, z, h, wc) {
  for (const L of LAKES) {
    const dx = (x - L.x) / L.rx, dz = (z - L.z) / L.rz, rm = Math.min(L.rx, L.rz);
    if (Math.abs(dx) > 1 + 70 / rm || Math.abs(dz) > 1 + 70 / rm) continue;
    const e = Math.hypot(dx, dz) * (1 + (fbm(x * 0.02 + L.x, z * 0.02, 2) - 0.5) * 0.22);
    const t = e < 1 ? WATER_LEVEL - L.d * smooth(1, 0.5, e) - 0.4 * smooth(1, 0.9, e) : WATER_LEVEL - 0.4 + (e - 1) * rm * 0.3;
    if (t < h) h = lerp(h, t, wc);
  }
  if (x < 0) {
    const d = riverDist(x, z);
    if (d < 70) {
      const t = d < RIVER_W ? WATER_LEVEL - RIVER_D * smooth(RIVER_W, RIVER_W * 0.3, d) - 0.4 : WATER_LEVEL - 0.4 + (d - RIVER_W) * 0.3;
      if (t < h) h = lerp(h, t, wc);
    }
  }
  return h;
}
function heightRaw(x, z) {
  const r = Math.hypot(x, z), R = oldEdge(x, z);
  if (r < R - 10) return oldHeight(x, z);                       // home ground: untouched
  const a = Math.atan2(z, x);
  const b = smooth(R - 10, R + 30, r);
  let h = b < 1 ? lerp(oldHeight(x, z), wildBase(x, z, r), b) : wildBase(x, z, r);
  if (r > 360) h += mountains(x, z, r, a);
  const gw = gorgeW(a);
  if (gw > 0) {                                                 // the Sundered Gorge: a chasm with the river-water far below
    const rc = barrierR(a) - 10, dg = Math.abs(r - rc);
    h += gw * 14 * smooth(rc - 110, rc - 30, r) * smooth(rc + 40, rc + 10, r);   // the land lifts to a rim before it drops
    if (dg < 26) h = lerp(h, -34, gw * smooth(25, 13, dg));
  }
  return water(x, z, h, smooth(R - 10, R + 2, r));
}
/* flat pads for the Albali Aagac */
const ALBALI = [{ x: 215, z: 35 }, { x: -120, z: -235 }, { x: 160, z: -215 }, { x: -320, z: -40 }, { x: 150, z: 192 }];
const PADS = ALBALI.map(p => ({ x: p.x, z: p.z, r: 10, h: heightRaw(p.x, p.z) }));

/* the Megla Pass (Megla: mist): the old road west — Eldi — over the Crown Ridge, the long way round to Aakalay on foot */
const PASS_A = 2.85;
export const PASS = makePass({ id: 'x_ashroad', name: 'The Megla Pass', dir: 'Eldi', to: 'aakalay', toPass: 'a_ashroad', a: PASS_A,
  r0: barrierR(PASS_A) - 75, r1: barrierR(PASS_A) + 28, w: 9, rise: 16 }, heightRaw);

export function heightAt(x, z) {
  let h = heightRaw(x, z);
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r + 10) h = lerp(h, p.h, smooth(p.r + 10, p.r, d));
  }
  h = PASS.carve(x, z, h);
  return Math.max(h, -180);
}

/* the region's edge for the old "safe ground" logic: just past the barrier everywhere */
function edgeRadius(x, z) { return barrierR(Math.atan2(z, x)) + 10; }
const waterDepth = (x, z) => Math.max(0, WATER_LEVEL - heightAt(x, z));
function barrierKind(x, z) {
  const r = Math.hypot(x, z), a = Math.atan2(z, x), Rb = barrierR(a);
  const gw = gorgeW(a);
  if (gw > 0.5 && r > Rb - 36) return 'gorge';
  if (r > Rb - 26) return cliffW(a) > 0.5 ? 'cliff' : 'ridge';
  if (waterDepth(x, z) > DEEP) return 'water';
  return null;
}

/* Ju (carrot) plots beside the farms, and the high crag where a Kuni Byrd might nest */
const JU = [{ x: -103, z: -6, r: 7 }, { x: -33, z: -4, r: 8 }, { x: 100, z: 54, r: 7 }];

/* the natural barrier: the ridge, the cliffs, the gorge, and water too deep to wade */
const PIER_BOX = { x0: -3.6, x1: 3.6 };
function inBounds(x, z) {
  if (Math.abs(x) < PIER_BOX.x1 && z > 150 && z < PIER_END + 1.5) return true;     // the pier runs out over Mirrormere
  if (PASS.inside(x, z)) return true;                                               // the Megla Pass through the ridge
  return barrierKind(x, z) === null;
}
/* deep water you can swim in: every lake and river, but not the gorge or out past the ridge */
function swimOk(x, z) {
  return Math.hypot(x, z) < barrierR(Math.atan2(z, x)) - 40 && waterDepth(x, z) > DEEP;
}
const BARRIER_LINES = {
  ridge: ['The ridge is too sheer to climb.', 'Too steep — the Crown Ridge won’t let us up here.'],
  cliff: ['The Greyfang cliffs are sheer here — no handholds.', 'Straight rock wall. We go round.'],
  gorge: ['The gorge drops away — no way across.', 'That’s the Sundered Gorge. A long fall to the water.'],
  water: ['The current’s too strong out here. Back the way we came.', 'Not past the ridge — swim back.'],
};
function barrierLine(x, z) {
  const k = barrierKind(x, z) || 'ridge', l = BARRIER_LINES[k];
  return l[(Math.floor(x / 23) + Math.floor(z / 31)) & 1];
}
const PIER_END = oldEdge(0, 170) - 6 + 46;

/* the wilderness around the town, for wildlife spawning and tree cover */
const ZONES = [
  { id: 'x_sunfall', name: 'Sunfall Meadows', x: 230, z: 30, r: 85, biome: 'meadow' },
  { id: 'x_downs', name: 'The Rolling Downs', x: 245, z: 235, r: 85, biome: 'hills' },
  { id: 'x_reedmouth', name: 'Reedmouth', x: -115, z: 262, r: 50, biome: 'shore' },
  { id: 'x_mirrormere', name: 'Mirrormere', x: 0, z: 295, r: 125, biome: 'lake' },
  { id: 'x_mere_shore', name: 'Mirrormere Strand', x: 140, z: 315, r: 45, biome: 'shore' },
  { id: 'x_tallpines', name: 'The Tall Pines', x: -40, z: -320, r: 120, biome: 'forest' },
  { id: 'x_eastwood', name: 'Eastwood', x: 210, z: -150, r: 85, biome: 'forest' },
  { id: 'x_westwood', name: 'Westwood', x: -340, z: 60, r: 85, biome: 'forest' },
  { id: 'x_highmere', name: 'Highmere', x: 300, z: -255, r: 70, biome: 'lake' },
  { id: 'x_riverlands', name: 'The Brightwater Banks', x: -250, z: -90, r: 70, biome: 'meadow' },
  { id: 'x_mossfen', name: 'Mossfen', x: -300, z: 190, r: 40, biome: 'bog' },
  { id: 'x_crown', name: 'Crown Ridge Foothills', x: 60, z: -430, r: 55, biome: 'mountain' },
  { id: 'x_greyfang', name: 'Greyfang Scree', x: -300, z: -320, r: 50, biome: 'mountain' },
  { id: 'x_gorge_rim', name: 'Sundered Gorge Rim', x: 395, z: -40, r: 45, biome: 'hills' },
  { id: 'x_southdowns', name: 'Southdown Hills', x: -250, z: 330, r: 60, biome: 'hills' },
];
const FORESTS = ZONES.filter(z => z.biome === 'forest');
function treeDensity(x, z) {
  let d = 0;
  for (const f of FORESTS) { const k = smooth(f.r * 1.15, f.r * 0.45, Math.hypot(x - f.x, z - f.z)); if (k > d) d = k; }
  const r = Math.hypot(x, z);
  d = Math.max(d, 0.14 * smooth(170, 260, r), smooth(-120, -330, z) * 0.55);          // scattered trees; the north is wooded
  d = Math.max(d, 0.5 * smooth(barrierR(Math.atan2(z, x)) - 50, barrierR(Math.atan2(z, x)) + 30, r) * smooth(1300, 700, r)); // pines up the lower slopes
  if (x < -200) d = Math.max(d, 0.95 * smooth(9, 18, westRoadDist(x, z)) * smooth(-235, -275, x) * smooth(150, 60, westRoadDist(x, z)));   // the trees close in round the forest path
  return d * (0.55 + 0.6 * fbm(x * 0.02 + 7, z * 0.02 - 3, 2));
}

const STONE = ['#e2c9a0', '#d4b88a', '#c9a878', '#ead6b0'];
const LEAF = ['#7ab04a', '#9ac04a', '#e0b03a', '#6a9a3a', '#c8a03a', '#5a8a3a'];

export function buildXilia(scene) {
  const rng = mulberry32(2024);
  const trees = [];   // trunks a Punk can swing round
  const pick = a => a[Math.floor(rng() * a.length)];
  const col = new Colliders(heightAt);
  const roads = [[0, 175, 0, 50], [0, 50, 0, -80], [0, 50, 90, 10], [0, 50, -90, 40],
    [0, 80, PEN.x, PEN.z], [0, -80, GROVE.x, GROVE.z], [0, -60, HIDEOUT.x, HIDEOUT.z],
    [-90, 40, -132, 50], [-132, 50, -168, 58],          // the little road west out of town …
    ...WEST_ROAD.slice(0, -1).map((p, i) => [p[0], p[1], WEST_ROAD[i + 1][0], WEST_ROAD[i + 1][1]])];   // … over the river and into the forest
  const roadDist = (x, z) => {
    let best = 1e9;
    for (const [ax, az, bx, bz] of roads) {
      const vx = bx - ax, vz = bz - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
      best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
    }
    return best;
  };
  const FIELDS = [{ x: -100, z: 30, w: 40, d: 50 }, { x: -60, z: -10, w: 30, d: 26 }, { x: 70, z: 60, w: 34, d: 30 }];
  const inField = (x, z) => FIELDS.find(f => Math.abs(x - f.x) < f.w / 2 && Math.abs(z - f.z) < f.d / 2);

  /* ---------- terrain: the town's fine mesh, a wider mid mesh, and a far ring of ranges out to the horizon ---------- */
  const c = new THREE.Color(), cw = new THREE.Color(), gA = new THREE.Color('#8fbf52'), gB = new THREE.Color('#b8c45a'), gC = new THREE.Color('#6aa048'),
    dirt = new THREE.Color('#c9a06a'), pave = new THREE.Color('#e0caa0'), soil = new THREE.Color('#7a5232'), soilB = new THREE.Color('#9a6a3a'),
    forestFloor = new THREE.Color('#4f8a3c'), meadowY = new THREE.Color('#c4cc62'), sand = new THREE.Color('#d6c48e'), bed = new THREE.Color('#5a7a62'),
    rock = new THREE.Color('#8e8578'), rockD = new THREE.Color('#6a6470'), snow = new THREE.Color('#f2f2f6'), distantPine = new THREE.Color('#3c6a40');
  const wildColor = (x, z, y, ny, out) => {
    const n = fbm(x * 0.03 + 4, z * 0.03, 3);
    out.copy(gA).lerp(gB, smooth(0.45, 0.72, n)).lerp(gC, smooth(0.5, 0.3, fbm(x * 0.09, z * 0.09, 2)) * 0.6);
    out.lerp(meadowY, smooth(0.5, 0.7, fbm(x * 0.004 + 50, z * 0.004 - 12, 2)) * 0.45);
    const td = treeDensity(x, z);
    out.lerp(td > 0.4 && y > 60 ? distantPine : forestFloor, smooth(0.15, 0.6, td) * 0.85);
    out.lerp(sand, smooth(WATER_LEVEL + 1.8, WATER_LEVEL + 0.5, y));
    out.lerp(bed, smooth(WATER_LEVEL - 0.5, WATER_LEVEL - 6, y));
    out.lerp(rock, smooth(0.86, 0.66, ny)).lerp(rockD, smooth(0.6, 0.4, ny) * 0.7);
    out.lerp(rock, smooth(90, 150, y) * 0.5);
    out.lerp(snow, smooth(150, 205, y + n * 30) * smooth(0.5, 0.72, ny));
    out.lerp(dirt, smooth(3.6, 1.8, westRoadDist(x, z)) * 0.85);
    if (PASS.near(x, z, 6)) out.lerp(dirt, smooth(PASS.w - 1, PASS.w - 4, PASS.lat(x, z)) * smooth(PASS.r0 - 30, PASS.r0, PASS.along(x, z)) * smooth(3, 1, Math.abs(y - PASS.floor(PASS.along(x, z)))) * 0.85);   // the road
    return out;
  };
  const terrainMat = toon(0xffffff, { vertexColors: true });
  const finish = (g, colorFn) => {
    g.computeVertexNormals();
    const P = g.attributes.position, N = g.attributes.normal, col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { colorFn(P.getX(i), P.getZ(i), P.getY(i), N.getY(i), c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, terrainMat); m.receiveShadow = true; scene.add(m); return m;
  };
  {
    const SIZE = 460, SEG = 220;
    const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position;
    for (let i = 0; i < tp.count; i++) tp.setY(i, heightAt(tp.getX(i), tp.getZ(i)));
    finish(tg, (x, z, y, ny, out) => {
      const r = Math.hypot(x, z), R = oldEdge(x, z);
      const n = fbm(x * 0.03 + 4, z * 0.03, 3), n2 = fbm(x * 0.12, z * 0.12, 2);
      out.copy(gA).lerp(gB, smooth(0.45, 0.72, n)).lerp(gC, smooth(0.5, 0.25, n2) * 0.6);
      const f = inField(x, z);
      if (f) out.copy(Math.sin((x - f.x) * 1.4) > 0 ? soil : soilB);
      out.lerp(dirt, smooth(5, 2.5, roadDist(x, z)) * 0.9);
      out.lerp(pave, smooth(24, 20, Math.hypot(x - SQUARE.x, z - SQUARE.z)));
      const b = smooth(R - 12, R + 25, r);
      if (b > 0) out.lerp(wildColor(x, z, y, ny, cw), b);
      // the little road shows through, out past the town too
      out.lerp(dirt, smooth(4, 2, roadDist(x, z)) * 0.85 * b);
    });
    // the mid mesh (6.2 m cells) with a hole under the town mesh; its overlap rim is tucked just below
    const MS = 1240, MSEG = 200, HOLE = 226;
    const mg = new THREE.PlaneGeometry(MS, MS, MSEG, MSEG); mg.rotateX(-Math.PI / 2);
    const mp = mg.attributes.position;
    for (let i = 0; i < mp.count; i++) {
      const x = mp.getX(i), z = mp.getZ(i);
      mp.setY(i, heightAt(x, z) - (Math.abs(x) < 231 && Math.abs(z) < 231 ? 0.6 : 0));
    }
    const src = mg.index.array, keep = [];
    const inside = i => Math.abs(mp.getX(i)) < HOLE && Math.abs(mp.getZ(i)) < HOLE;
    for (let t = 0; t < src.length; t += 3) if (!(inside(src[t]) && inside(src[t + 1]) && inside(src[t + 2]))) keep.push(src[t], src[t + 1], src[t + 2]);
    mg.setIndex(keep);
    finish(mg, wildColor);
    // the far ring: ranges to the horizon (tucked under the mid mesh where they overlap)
    const RADII = [560, 600, 650, 710, 780, 860, 950, 1050, 1170, 1300, 1450, 1650, 1900, 2200, 2600, 3000, 3500], A = 128;
    const pos = [], idx = [];
    for (const rr of RADII) for (let j = 0; j <= A; j++) {
      const an = j / A * Math.PI * 2, x = Math.cos(an) * rr, z = Math.sin(an) * rr;
      pos.push(x, heightAt(x, z) - (Math.abs(x) < 618 && Math.abs(z) < 618 ? 6 : 0), z);
    }
    for (let k = 0; k < RADII.length - 1; k++) for (let j = 0; j < A; j++) { const p0 = k * (A + 1) + j, p1 = p0 + A + 1; idx.push(p0, p0 + 1, p1, p1, p0 + 1, p1 + 1); }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setIndex(idx);
    finish(fg, wildColor);
  }

  /* one water level for every lake, pond and river (and the far valleys) */
  {
    const wg = new THREE.CircleGeometry(3600, 72); wg.rotateX(-Math.PI / 2);
    const wm = new THREE.MeshToonMaterial({ color: 0x4aa6c4, emissive: 0x0e4a62, emissiveIntensity: 0.35, gradientMap: ramp(), transparent: true, opacity: 0.86 });
    const wmesh = new THREE.Mesh(wg, wm); wmesh.position.y = WATER_LEVEL; wmesh.receiveShadow = true; wmesh.renderOrder = 1; scene.add(wmesh);
  }

  /* ---------- kits ---------- */
  const blocks = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 2600);
  const trunks = new Kit(scene, new THREE.CylinderGeometry(0.7, 1, 1, 7), toon(0xffffff), 320);
  const crowns = new Kit(scene, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), 1600);
  const crops = new Kit(scene, new THREE.ConeGeometry(0.25, 1, 5), toon(0xffffff), 1600, false);
  const rocks = new Kit(scene, new THREE.DodecahedronGeometry(1, 0), toon(0xffffff), 300);
  const keepOut = (x, z, extra = 0) => CLEAR.some(c => Math.hypot(x - c.x, z - c.z) < c.r + extra) || roadDist(x, z) < 5 + extra || Math.hypot(x, z) > oldEdge(x, z) - 14 || !!inField(x, z);

  /* ---------- Eikar cottages: round walls under an acorn-cap roof ---------- */
  const capTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
    g.fillStyle = '#7a4a2a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(30,15,5,0.5)'; g.lineWidth = 3;
    for (let y = 0; y < 140; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < 140; x += 14) { g.beginPath(); g.arc(x, y, 8, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); return t;
  })();
  const roofMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: capTex, gradientMap: ramp() });
  const wallMats = ['#f0dcb4', '#e8c89a', '#f4e6c8', '#dcc0a0'].map(c => toon(c));
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffd890 });
  const doorMat = toon(0x6a3a1e);
  const houses = [];
  const doors = [];
  function cottage(x, z, r, rot, opts = {}) {
    const g = heightAt(x, z), H = opts.h || 3.2 + rng() * 1.2;
    const grp = new THREE.Group(); grp.position.set(x, g, z); grp.rotation.y = rot;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, H, 16), pick(wallMats)); wall.position.y = H / 2 - 0.2; grp.add(wall);
    const roof = new THREE.Mesh(new THREE.SphereGeometry(r * 1.32, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), roofMat); roof.scale.y = 0.75; roof.position.y = H - 0.25; grp.add(roof);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.3, 0.22, 6, 20), roofMat); rim.rotation.x = Math.PI / 2; rim.position.y = H - 0.2; grp.add(rim);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 1.1, 6), toon(0x4a2c18)); stem.position.y = H + r * 0.95; stem.rotation.z = 0.3; grp.add(stem);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.2), doorMat); door.position.set(0, 1.0, r + 0.02); grp.add(door);
    for (const a of [1.2, -1.2, 2.6]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.38, 12), windowMat); w.position.set(Math.sin(a) * (r + 0.03), 2.0, Math.cos(a) * (r + 0.03)); w.rotation.y = a; w.userData.noOutline = true; grp.add(w); }
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.6, 6), toon(0x8a6a50)); chim.position.set(r * 0.6, H + 0.6, -r * 0.3); grp.add(chim);
    outlineAll(grp, 0.05);
    grp.traverse(m => { if (m.isMesh && m.name !== 'outline') { m.castShadow = true; m.receiveShadow = true; } });
    scene.add(grp);
    col.add(x, z, r * 0.85, r * 0.85, 0, g - 1, g + H + 2);
    houses.push({ x, z, r, chim: new THREE.Vector3(x + Math.cos(rot) * r * 0.6 + Math.sin(rot) * -r * 0.3, g + H + 1.4, z) });
    // most of the cottages open: walk up to the door and press E
    if (opts.door !== false && rng() < 0.85) doors.push({ id: 'x_c' + houses.length, name: opts.name || 'a cottage', kind: 'cottage', seed: 7000 + houses.length * 31, x: x + Math.sin(rot) * (r + 0.9), z: z + Math.cos(rot) * (r + 0.9), yaw: rot });
    return grp;
  }

  /* the market square: paving, a fountain, stalls */
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(22, 22.5, 0.4, 40), toon(0xe0caa0)); plaza.position.set(SQUARE.x, SQ_H - 0.15, SQUARE.z); plaza.receiveShadow = true; scene.add(plaza);
  const water = new THREE.MeshToonMaterial({ color: 0x5ac0d8, emissive: 0x1a6a80, emissiveIntensity: 0.5, gradientMap: ramp() });
  {
    const basin = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.5, 6, 24), toon(0xcab088)); basin.rotation.x = -Math.PI / 2; basin.position.set(SQUARE.x, SQ_H + 0.4, SQUARE.z - 6); addOutline(basin, 0.05); scene.add(basin);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), water); pool.rotation.x = -Math.PI / 2; pool.position.set(SQUARE.x, SQ_H + 0.45, SQUARE.z - 6); scene.add(pool);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 2.6, 8), toon(0xcab088)); pillar.position.set(SQUARE.x, SQ_H + 1.3, SQUARE.z - 6); addOutline(pillar, 0.04); scene.add(pillar);
    // a little bronze acorn on top — Beuhk remembers the Eikar with no hat
    const acorn = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), toon(0xc8902a)); acorn.position.set(SQUARE.x, SQ_H + 3.1, SQUARE.z - 6); acorn.scale.y = 1.2; addOutline(acorn, 0.04); scene.add(acorn);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; col.add(SQUARE.x + Math.cos(a) * 3.4, SQUARE.z - 6 + Math.sin(a) * 3.4, 1.4, 0.5, -a + Math.PI / 2, SQ_H - 1, SQ_H + 0.9); }
    col.add(SQUARE.x, SQUARE.z - 6, 0.6, 0.6, 0, SQ_H - 1, SQ_H + 3.6);
  }
  const awnings = [0xc0392b, 0x2f6f8a, 0xd9a441, 0x5a8a3a, 0x8a3a6a];
  [[-12, 52], [-10, 60], [12, 52], [10, 62], [-4, 66], [6, 40]].forEach(([dx, dz], i) => {
    const x = SQUARE.x + dx, z = SQUARE.z + dz - 50 + 50, g = SQ_H;
    const grp = new THREE.Group(); grp.position.set(SQUARE.x + dx, g, dz); grp.rotation.y = Math.atan2(-dx, -(dz - SQUARE.z));
    const table = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1.4), toon(0x8a5a36)); table.position.y = 0.5; grp.add(table);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 5), toon(0x5a3a20)); p.position.set(s * 1.4, 1.3, -0.6); grp.add(p); }
    const aw = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 2.0), toon(awnings[i % awnings.length])); aw.position.set(0, 2.6, -0.1); aw.rotation.x = 0.2; grp.add(aw);
    for (let k = 0; k < 4; k++) { const good = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), toon(pick([0xe08a3a, 0xd04a3a, 0xe8c84a, 0x6aa04a]))); good.position.set(-1 + k * 0.65, 1.15, 0.1); grp.add(good); }
    outlineAll(grp, 0.03); grp.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; });
    scene.add(grp);
    col.add(SQUARE.x + dx, dz, 1.6, 0.8, grp.rotation.y, g - 1, g + 1.1);
  });
  // the town hearth
  const hearth = { x: SQUARE.x + 8, z: SQUARE.z + 10 };
  {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.28, 5, 12), toon(0x7a6a5a)); ring.rotation.x = -Math.PI / 2; ring.position.set(hearth.x, SQ_H + 0.15, hearth.z); scene.add(ring);
  }
  const hearthFire = glowSprite(0xff8a3a, 3.2, 0.95); hearthFire.position.set(hearth.x, SQ_H + 0.9, hearth.z); scene.add(hearthFire);

  /* cottages around the square and along the roads */
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.2;
    const x = SQUARE.x + Math.cos(a) * 34, z = SQUARE.z + Math.sin(a) * 30;
    if (roadDist(x, z) < 7) continue;
    cottage(x, z, 3 + rng() * 1.2, Math.atan2(SQUARE.x - x, SQUARE.z - z));
  }
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2, r = 48 + rng() * 40, x = SQUARE.x + Math.cos(a) * r, z = SQUARE.z + Math.sin(a) * r * 0.85;
    if (keepOut(x, z, 4) || houses.some(h => Math.hypot(h.x - x, h.z - z) < 11)) continue;
    cottage(x, z, 2.6 + rng() * 1.4, rng() * Math.PI * 2);
  }

  /* ---------- the west road: a bridge over the Brightwater, and an arch of old trees where the forest path begins ---------- */
  {
    // the bridge, where the road crosses the river
    const ax = -205, az = 40, bx = -250, bz = 12, ang = Math.atan2(bx - ax, bz - az);
    let cx = 0, cz = 0, best = 1e9;
    for (let t = 0; t <= 1; t += 0.01) { const x = ax + (bx - ax) * t, z = az + (bz - az) * t, d = riverDist(x, z); if (d < best) { best = d; cx = x; cz = z; } }
    const dy = WATER_LEVEL + 1.6, L = 24;
    for (let k = -L / 2; k <= L / 2; k += 1.2) blocks.put(cx + Math.sin(ang) * k, dy, cz + Math.cos(ang) * k, 3.4, 0.28, 1.1, 0, ang, 0, k % 2.4 ? '#8a5a36' : '#9a6a40');
    col.add(cx, cz, 1.7, L / 2, ang, dy - 4, dy + 0.14);
    for (const s of [-1, 1]) {
      const ox = Math.cos(ang) * s * 1.7, oz = -Math.sin(ang) * s * 1.7;
      blocks.put(cx + ox, dy + 0.9, cz + oz, 0.14, 0.14, L, 0, ang, 0, '#6a4428');
      col.add(cx + ox, cz + oz, 0.12, L / 2, ang, dy, dy + 1.1);
      for (let k = -L / 2; k <= L / 2; k += 4) blocks.put(cx + ox + Math.sin(ang) * k, dy + 0.45, cz + oz + Math.cos(ang) * k, 0.18, 0.9, 0.18, 0, 0, 0, '#6a4428');
    }
    for (let k = -L / 2 + 2; k <= L / 2 - 2; k += 4) for (const s of [-1, 1]) blocks.put(cx + Math.sin(ang) * k + Math.cos(ang) * s * 1.6, dy - 3, cz + Math.cos(ang) * k - Math.sin(ang) * s * 1.6, 0.4, 6, 0.4, 0, 0, 0, '#4a3020');
    // the arch: two old pines leaning together over the path, and a signpost
    const { x: ex, z: ez } = WEST_EXIT, px = -WEST_N.z, pz = WEST_N.x;
    for (const s of [-1, 1]) {
      const tx = ex - WEST_N.x * 6 + px * s * 5.5, tz = ez - WEST_N.z * 6 + pz * s * 5.5, tg = heightAt(tx, tz);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 16, 7), toon(0x5a3a26)); trunk.position.set(tx - px * s * 1.6, tg + 7.4, tz - pz * s * 1.6);
      trunk.rotation.set(pz * s * 0.22, 0, -px * s * 0.22); addOutline(trunk, 0.05); trunk.castShadow = true; scene.add(trunk);
      for (let k = 0; k < 3; k++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4 - k * 0.8, 4.4, 7), toon(0x2f6a3a)); cone.position.set(tx - px * s * (3.2 + k * 0.4), tg + 12 + k * 2.6, tz - pz * s * (3.2 + k * 0.4)); addOutline(cone, 0.05); cone.castShadow = true; scene.add(cone); }
      col.add(tx, tz, 0.9, 0.9, 0, tg - 1, tg + 10);
    }
    const sx = ex - WEST_N.x * 12 + px * 4.6, sz = ez - WEST_N.z * 12 + pz * 4.6, sg = heightAt(sx, sz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3, 6), toon(0x5a3a22)); post.position.set(sx, sg + 1.5, sz); scene.add(post);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const cg = cv.getContext('2d');
    cg.fillStyle = '#6b4a2c'; cg.fillRect(0, 0, 256, 128); cg.strokeStyle = '#3a2614'; cg.lineWidth = 8; cg.strokeRect(4, 4, 248, 120);
    cg.fillStyle = '#f4e2b8'; cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.font = 'bold 28px Georgia, serif'; cg.fillText('The Forest Path', 128, 46); cg.font = 'italic 21px Georgia, serif'; cg.fillText('→ Buhkon Eldi’s', 128, 88);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshToonMaterial({ map: tex, side: THREE.DoubleSide })); board.position.set(sx, sg + 2.5, sz); board.rotation.y = Math.atan2(-WEST_N.x, -WEST_N.z) + Math.PI / 2; scene.add(board);
    col.add(sx, sz, 0.25, 0.25, 0, sg - 1, sg + 3);
  }

  /* ---------- Ruut's pen ---------- */
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2; if (i === 5) continue;
    blocks.put(PEN.x + Math.cos(a) * 11, heightAt(PEN.x + Math.cos(a) * 11, PEN.z + Math.sin(a) * 11) + 0.6, PEN.z + Math.sin(a) * 11, 0.2, 1.2, 0.2, 0, 0, 0, '#6a4428');
  }

  /* ---------- fields of crops ---------- */
  for (const f of FIELDS) for (let i = 0; i < 260; i++) {
    const x = f.x + (rng() - 0.5) * f.w, z = f.z + (rng() - 0.5) * f.d;
    if (Math.sin((x - f.x) * 1.4) < 0.2) continue;
    crops.put(x, heightAt(x, z) + 0.45, z, 1 + rng() * 0.5, 0.9 + rng() * 0.6, 1 + rng() * 0.5, 0, rng() * 3, 0, pick(['#c8b040', '#d8c060', '#8ab04a', '#e0a040']));
  }
  // a windmill by the west fields
  {
    const x = -78, z = 2, g = heightAt(x, z);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.8, 11, 10), toon(0xf0dcb4)); tower.position.set(x, g + 5.5, z); addOutline(tower, 0.06); tower.castShadow = true; scene.add(tower);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), roofMat); cap.position.set(x, g + 11, z); scene.add(cap);
    col.add(x, z, 2.3, 2.3, 0, g - 1, g + 12);
    var mill = new THREE.Group(); mill.position.set(x, g + 9, z + 2.8); scene.add(mill);
    for (let k = 0; k < 4; k++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.1), toon(0xe8d8b0)); blade.position.y = 3; const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2; arm.add(blade); mill.add(arm); }
  }

  /* ---------- forests and trees ---------- */
  function tree(x, z, s) {
    const g = heightAt(x, z), h = 4 + s * 3.5;
    trees.push({ x, z, g, h, r: 0.35 * s });
    trunks.put(x, g + h / 2 - 0.4, z, 0.35 * s, h, 0.35 * s, 0, rng() * 6, 0, '#6b4128');
    const lc = pick(LEAF);
    for (let k = 0; k < 3 + Math.floor(rng() * 3); k++) {
      const r = (1.6 + rng() * 1.3) * s;
      crowns.put(x + (rng() - 0.5) * 2.4 * s, g + h + (rng() - 0.2) * 1.8 * s, z + (rng() - 0.5) * 2.4 * s, r, r * 0.85, r, rng(), rng(), rng(), new THREE.Color(lc).offsetHSL((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.1).getStyle());
    }
    col.add(x, z, 0.35 * s, 0.35 * s, 0, g - 1, g + h);
  }
  for (let i = 0; i < 1400 && trunks.mesh.count < 290; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 180, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z, -2)) continue;
    const nearTown = Math.hypot(x - SQUARE.x, z - SQUARE.z) < 80;
    if (nearTown && rng() < 0.85) continue;
    if (z > -30 && rng() < 0.55) continue;        // the forest is in the north
    tree(x, z, 0.8 + rng() * 1.0);
  }
  for (let i = 0; i < 120; i++) {
    const a = rng() * Math.PI * 2, r = rng() * 175, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z) || Math.hypot(x - SQUARE.x, z - SQUARE.z) < 70) continue;
    const s = 0.4 + Math.pow(rng(), 3) * 2.4;
    rocks.put(x, heightAt(x, z) + s * 0.3, z, s * (1 + rng() * 0.5), s * 0.7, s, rng() * 3, rng() * 3, rng() * 3, pick(['#b8a080', '#a89070', '#c8b090']));
    if (s > 0.6) col.add(x, z, s * 0.8, s * 0.8, 0, heightAt(x, z) - 1, heightAt(x, z) + s * 0.9);
  }

  /* ---------- the Ember Grove: a young fire tree and its seed ---------- */
  const seedSpot = new THREE.Vector3();
  {
    const { x, z } = GROVE, g = heightAt(x, z);
    const ft = new THREE.Group();
    const barkMat = toon(0x6a2c1c, { emissive: 0x3a0e04, emissiveIntensity: 0.4 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.8, 16, 10), barkMat); trunk.position.y = 8; ft.add(trunk);
    const leaf = new THREE.MeshToonMaterial({ color: 0xff6f22, emissive: 0xff4a10, emissiveIntensity: 0.55, gradientMap: ramp() });
    for (let k = 0; k < 10; k++) { const a = rng() * 6.28, r = rng() * 7; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + rng() * 2.5, 1), leaf); b.position.set(Math.cos(a) * r, 18 + rng() * 6, Math.sin(a) * r); ft.add(b); }
    outlineAll(ft, 0.1); ft.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; });
    ft.position.set(x, g - 0.4, z); scene.add(ft);
    col.add(x, z, 2.2, 2.2, 0, g - 1, g + 18);
    const glow = glowSprite(0xff8a3a, 40, 0.3); glow.position.set(x, g + 20, z); scene.add(glow);
    seedSpot.set(x + 4, g + 0.6, z + 4);
  }

  /* ---------- the Duskareth hideout ---------- */
  {
    const { x, z } = HIDEOUT;
    for (const [dx, dz, r] of [[-6, 4, 0.3], [6, -2, -0.5], [0, -8, 0.1]]) {
      const tg2 = heightAt(x + dx, z + dz);
      const tent = new THREE.Mesh(new THREE.ConeGeometry(3, 3.4, 5, 1, true), toon(0x2a2236, { side: THREE.DoubleSide })); tent.position.set(x + dx, tg2 + 1.6, z + dz); tent.rotation.y = r; tent.castShadow = true; scene.add(tent);
      col.add(x + dx, z + dz, 1.9, 1.9, r, tg2 - 1, tg2 + 3);
    }
    const sig = glowSprite(0x9a4aff, 6, 0.5); sig.position.set(x, heightAt(x, z) + 2, z); scene.add(sig);
  }

  /* ---------- the dock and pier ---------- */
  const dockZ0 = oldEdge(0, 170) - 6;
  const pierY = 1.2, pierEnd = dockZ0 + 46;
  {
    for (let z = dockZ0 - 8; z < pierEnd; z += 1.6) blocks.put(0, pierY - 0.2, z, 6, 0.32, 1.45, 0, (rng() - 0.5) * 0.03, 0, rng() < 0.5 ? '#8a5a36' : '#9a6a40');
    col.add(0, (dockZ0 - 8 + pierEnd) / 2, 3, (pierEnd - dockZ0 + 8) / 2, 0, pierY - 3, pierY);
    for (let z = dockZ0 - 6; z < pierEnd; z += 6) for (const s of [-1, 1]) { blocks.put(s * 3.1, pierY - 6, z, 0.5, 12, 0.5, 0, 0, 0, '#5a3a24'); blocks.put(s * 3.1, pierY + 0.6, z, 0.3, 1.2, 0.3, 0, 0, 0, '#5a3a24'); }
    for (const s of [-1, 1]) { blocks.put(s * 3.1, pierY + 1.15, (dockZ0 + pierEnd) / 2, 0.18, 0.15, pierEnd - dockZ0, 0, 0, 0, '#5a3a24'); col.add(s * 3.25, (dockZ0 + pierEnd) / 2, 0.25, (pierEnd - dockZ0) / 2, 0, pierY - 1, pierY + 1.3); }
    col.add(0, pierEnd + 0.3, 3.4, 0.3, 0, pierY - 1, pierY + 1.3);
  }

  /* ---------- floating islets ---------- */
  const islets = [];
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2, r = 230 + rng() * 150, s = 4 + rng() * 10;
    const grp = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.9, s * 0.35, 8), toon(0x9ac04a));
    const bottom = new THREE.Mesh(new THREE.ConeGeometry(s * 0.92, s * 2.2, 8), toon(0xb07a52)); bottom.rotation.x = Math.PI; bottom.position.y = -s * 1.25;
    grp.add(top, bottom); outlineAll(grp, 0.12);
    { const ix = Math.cos(a) * r, iz = Math.sin(a) * r; grp.position.set(ix, Math.max(heightAt(ix, iz), WATER_LEVEL) + 75 + rng() * 60, iz); }   // high over the meadows, out of reach
    grp.userData = { by: grp.position.y, ph: rng() * 6, sp: 0.2 + rng() * 0.3 };
    scene.add(grp); islets.push(grp);
  }

  /* ---------- the wild highlands: pine forest, broadleaf stands, boulders, scree under the ridges ---------- */
  const wrng = mulberry32(7331);            // its own stream, so the town's placements never shift
  const wTrunks = new Kit(scene, new THREE.CylinderGeometry(0.55, 0.8, 1, 5, 1, true), toon(0xffffff), 3400, false);
  const wCones = new Kit(scene, new THREE.ConeGeometry(1, 1, 7, 1, true), toon(0xffffff), 6000, false);
  const wCrowns = new Kit(scene, new THREE.IcosahedronGeometry(1, 0), toon(0xffffff), 1800, false);
  const wRocks = new Kit(scene, new THREE.DodecahedronGeometry(1, 0), toon(0xffffff), 700, false);
  const PINE = ['#2f6a3a', '#3a7a40', '#2a5a34', '#467f44', '#356e3c'], BROAD = ['#6aa040', '#7ab04a', '#5a9a3a', '#8ab84a', '#c8a03a'];
  const WILD_KEEP = [...ALBALI.map(p => ({ x: p.x, z: p.z, r: 14 })), ...JU.map(j => ({ x: j.x, z: j.z, r: j.r + 3 })), { x: 0, z: 200, r: 30 }];
  const wildOK = (x, z) => {
    const r = Math.hypot(x, z);
    if (r < oldEdge(x, z) + 6) return false;
    if (PASS.near(x, z)) return false;
    if (WILD_KEEP.some(k => Math.hypot(x - k.x, z - k.z) < k.r)) return false;
    if (roadDist(x, z) < 6) return false;
    return true;
  };
  for (let i = 0; i < 26000 && wTrunks.mesh.count < 3300; i++) {
    const a = wrng() * Math.PI * 2, r = 150 + Math.sqrt(wrng()) * 900, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (wrng() > treeDensity(x, z)) continue;
    if (!wildOK(x, z)) continue;
    const g = heightAt(x, z);
    if (g < WATER_LEVEL + 0.8 || g > 135) continue;
    const s = 0.8 + wrng() * 0.9, walk = inBounds(x, z);
    if (wrng() < 0.8 || !walk) {                     // a Xikia pine
      const h = (6 + wrng() * 5) * s;
      wTrunks.put(x, g + h * 0.2, z, 0.5 * s, h * 0.45, 0.5 * s, 0, wrng() * 6, 0, '#5a3a26');
      const pc = PINE[Math.floor(wrng() * PINE.length)];
      wCones.put(x, g + h * 0.5, z, 2.6 * s, h * 0.6, 2.6 * s, 0, wrng() * 6, 0, pc);
      wCones.put(x, g + h * 0.82, z, 1.8 * s, h * 0.45, 1.8 * s, 0, wrng() * 6, 0, pc);
    } else {                                         // a broadleaf
      const h = (4 + wrng() * 3) * s;
      wTrunks.put(x, g + h / 2 - 0.4, z, 0.4 * s, h, 0.4 * s, 0, wrng() * 6, 0, '#6b4128');
      const lc = BROAD[Math.floor(wrng() * BROAD.length)];
      for (let k = 0; k < 3; k++) { const rr = (1.8 + wrng() * 1.2) * s; wCrowns.put(x + (wrng() - 0.5) * 2.4 * s, g + h + (wrng() - 0.2) * 1.6 * s, z + (wrng() - 0.5) * 2.4 * s, rr, rr * 0.85, rr, wrng(), wrng(), wrng(), lc); }
    }
    if (walk) col.add(x, z, 0.45 * s, 0.45 * s, 0, g - 1, g + 8);
  }
  for (let i = 0; i < 4000 && wRocks.mesh.count < 680; i++) {
    const a = wrng() * Math.PI * 2, r = 190 + wrng() * 420, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!wildOK(x, z)) continue;
    const Rb = barrierR(a), g = heightAt(x, z);
    if (g < WATER_LEVEL - 2) continue;
    const scree = r > Rb - 45 && r < Rb + 20;          // big fallen blocks under the ridges
    if (!scree && wrng() < 0.55) continue;
    const s = scree ? 2 + wrng() * 6 : 0.5 + Math.pow(wrng(), 3) * 3;
    wRocks.put(x, g + s * 0.25, z, s * (1 + wrng() * 0.5), s * 0.75, s, wrng() * 3, wrng() * 3, wrng() * 3, ['#9a9284', '#8a8478', '#a8a090', '#7e7a74'][Math.floor(wrng() * 4)]);
    if (s > 0.6 && inBounds(x, z)) col.add(x, z, s * 0.8, s * 0.8, 0, g - 1, g + s * 0.9);
  }
  wTrunks.done(); wCones.done(); wCrowns.done(); wRocks.done();

  blocks.done(); trunks.done(); crowns.done(); crops.done(); rocks.done();
  const grass = buildGrass(scene, rng, (x, z) => !(Math.hypot(x, z) > oldEdge(x, z) - 3 || roadDist(x, z) < 3 || Math.hypot(x - SQUARE.x, z - SQUARE.z) < 23 || inField(x, z)), heightAt,
    ['#8fbf52', '#a8c45a', '#7ab04a', '#c0c860', '#98b850'], 26000);

  /* Zahreh flowers — plenty, here at home */
  const flowers = [];
  const petal = new THREE.MeshToonMaterial({ color: 0xffb0d0, emissive: 0xff70b0, emissiveIntensity: 0.6, gradientMap: ramp() });
  for (let i = 0; i < 22; i++) {
    const a = rng() * Math.PI * 2, r = 30 + rng() * 140, fx = Math.cos(a) * r, fz = Math.sin(a) * r;
    if (keepOut(fx, fz)) continue;
    const grp = new THREE.Group();
    for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), petal); const pa = k / 5 * Math.PI * 2; p.position.set(Math.cos(pa) * 0.3, 0.9, Math.sin(pa) * 0.3); p.scale.set(1, 0.45, 1.6); p.rotation.y = -pa; grp.add(p); }
    const gl = glowSprite(0xff8ac8, 2.2, 0.6); gl.position.y = 1; grp.add(gl);
    grp.position.set(fx, heightAt(fx, fz), fz); scene.add(grp);
    flowers.push({ grp, x: fx, z: fz, ready: true, timer: 0 });
  }

  const SITES = {
    square: { name: 'Beuhk Market Square', x: SQUARE.x, z: SQUARE.z },
    westroad: { name: 'The West Road', x: -250, z: 12 },
    grove: { name: 'The Ember Grove', x: GROVE.x, z: GROVE.z },
    hideout: { name: 'The Duskareth Hideout', x: HIDEOUT.x, z: HIDEOUT.z },
    fields: { name: 'The West Fields', x: -100, z: 30 },
  };

  const spawnGroups = [
    // home: herds and families, all friendly
    { at: [PEN.x, PEN.z], kinds: ['punk_d', 'punk_d', 'punk_d', 'punk_d'], tag: 'herd' },
    { at: [-90, 60], kinds: ['kipsu_f', 'kipsu_f', 'kipsu_f', 'kipsu_f'] },
    { at: [60, 20], kinds: ['kipsu_f', 'kipsu_f', 'kipsu_f'] },
    { at: [30, -30], kinds: ['albali', 'albali', 'albali'] },
    { at: [-40, -110], kinds: ['albali', 'albali'] },
    { at: [110, 80], kinds: ['punk_d', 'punk_d'] },
    // quest-folk
    { at: [96, -40], kinds: ['punk_d'], unique: 'stray_1', extra: { stray: 1 } },
    { at: [-120, -10], kinds: ['punk_d'], unique: 'stray_2', extra: { stray: 2 } },
    { at: [40, -150], kinds: ['punk_d'], unique: 'stray_3', extra: { stray: 3 } },
    { at: [-30, -130], kinds: ['kipsu_f'], unique: 'fennek', extra: { pet: 'fennek' } },
    // the wilds beyond the fields
    { at: [20, -70], kinds: ['punk', 'punk'] },
    { at: [-60, -80], kinds: ['rodak', 'rodak', 'rodak'] },
    { at: [GROVE.x - 8, GROVE.z + 16], kinds: ['tyndael', 'tyndael', 'punk'] },
    { at: [GROVE.x + 14, GROVE.z - 4], kinds: ['punk', 'punk', 'punk'] },
    { at: [HIDEOUT.x + 4, HIDEOUT.z], kinds: ['vel', 'malsti', 'malsti', 'malsti'], unique: 'vel_hideout' },
    { at: [120, -60], kinds: ['kipsu', 'kipsu', 'kipsu'] },
    // Duat seedlings sprout near the hideout: Malsti Punks that come back
    { at: [-84, -100], kinds: ['malsti', 'malsti', 'malsti'] },
    { at: [-130, -40], kinds: ['malsti', 'malsti'] },
    // Kofi Galta: everywhere, and running from everything
    { at: [-70, 70], kinds: ['kofi', 'kofi', 'kofi'] }, { at: [80, 40], kinds: ['kofi', 'kofi'] },
    { at: [-20, -40], kinds: ['kofi', 'kofi', 'kofi'] }, { at: [100, -100], kinds: ['kofi', 'kofi'] },
    { at: [-130, 60], kinds: ['punk', 'punk'] },
  ];

  const lanterns = [
    { id: 'x_pier', name: 'Beuhk Docks', x: 5, z: dockZ0 - 10 },
    { id: 'x_square', name: 'Market Square', x: 14, z: 32 },
    { id: 'x_west', name: 'The West Road', x: -282, z: -2 },
    { id: 'x_north', name: 'The Forest Road', x: 8, z: -70 },
    { id: 'x_grove', name: 'Ember Grove Road', x: 40, z: -96 },
  ];
  const stones = [
    { key: 'x_square', x: -6, z: 30 }, { key: 'x_hideout', x: -92, z: -62 },
  ];

  return {
    name: 'xilia', heightAt, col, SITES, trees, propShore: null, PLAZA: { x: SQUARE.x, z: SQUARE.z, y: SQ_H }, hazards: [], pillars: [], camp: null,
    board: { x: -18, z: 32 },
    crates: [0.35, 2.5, 4.0].map(a => { const c = Math.cos(a), sn = Math.sin(a), r = oldEdge(c * 100, sn * 100) - 9; return { x: c * r, z: sn * r }; }),
    hearth, pen: PEN, yard: null, tower: null, seedSpot, grove: GROVE, doors,
    // the forest path west to the Carpenter's: walk on past the arch of pines and the property loads
    exits: [{ id: 'x_west', to: 'property', toExit: 'p_east', name: 'The Forest Path', dest: 'Buhkon’s property', x: WEST_EXIT.x, z: WEST_EXIT.z, nx: WEST_N.x, nz: WEST_N.z, w: 12, arrive: { x: WEST_EXIT.x - WEST_N.x * 16, z: WEST_EXIT.z - WEST_N.z * 16 } }],
    westGoal: new THREE.Vector3(WEST_EXIT.x, heightAt(WEST_EXIT.x, WEST_EXIT.z), WEST_EXIT.z),
    pier: { y: pierY, start: new THREE.Vector3(0, pierY, pierEnd - 6), end: pierEnd, z0: dockZ0 },
    edgeRadius, flowers, spawnGroups, lanterns, stones, falls: [], clear: CLEAR,
    inBounds, barrierLine, swimOk, passes: [PASS], homeRadius: oldEdge,   // homeRadius = the old town rim (for anything that must keep its old placement, e.g. amulet rolls)
    water: { level: WATER_LEVEL, isWater: (x, z) => waterDepth(x, z) > DEEP, depth: waterDepth, lakes: LAKES.map(l => ({ id: l.id, x: l.x, z: l.z, rx: l.rx, rz: l.rz, maxDepth: l.d })) },
    zones: ZONES.map(z => ({ ...z })), albaliSpots: ALBALI.map(p => ({ x: p.x, z: p.z })), juFields: JU.map(j => ({ ...j })),
    kuniPerch: { x: KUNI.x, z: KUNI.z, y: heightAt(KUNI.x, KUNI.z) },
    update(t, dt, particles, camPos) {
      grass.material.userData.shader && (grass.material.userData.shader.uniforms.uTime.value = t);
      islets.forEach(g => { g.position.y = g.userData.by + Math.sin(t * g.userData.sp + g.userData.ph) * 2.5; });
      flowers.forEach(f => { if (f.ready) f.grp.rotation.y = t * 0.5; });
      if (mill) mill.rotation.z = t * 0.6;
      hearthFire.scale.setScalar(3.2 + Math.sin(t * 11) * 0.25);
      if (particles) {
        if (Math.random() < 0.6) particles.emit(hearth.x + (Math.random() - 0.5) * 0.8, SQ_H + 0.8, hearth.z + (Math.random() - 0.5) * 0.8, { vx: 0, vy: 2 + Math.random(), vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: 0.35, life: 0.9, drag: 0.5 });
        // chimney smoke
        const h = houses[Math.floor(Math.random() * houses.length)];
        if (h && Math.random() < 0.5) particles.emit(h.x + (Math.random() - 0.5), h.chim.y + 0.5, h.z + (Math.random() - 0.5), { vx: 0.6, vy: 1.2, vz: 0.2, color: 0xd8d0c8, size: 1.1, life: 2.5, drag: 0.3 });
        if (Math.random() < 0.6) { const g = GROVE; particles.emit(g.x + (Math.random() - 0.5) * 16, heightAt(g.x, g.z) + 20 + (Math.random() - 0.5) * 6, g.z + (Math.random() - 0.5) * 16, { vx: 0, vy: -0.8, vz: 0, color: 0xff8a3a, size: 0.35, life: 5, drag: 0.2 }); }
        if (camPos && Math.random() < 0.4) particles.emit(camPos.x + (Math.random() - 0.5) * 40, camPos.y + (Math.random() - 0.5) * 12, camPos.z + (Math.random() - 0.5) * 40, { vx: 0.4, vy: 0.15, vz: 0.1, color: 0xffe0a0, size: 0.12, life: 5, drag: 0 });
      }
    },
  };
}
