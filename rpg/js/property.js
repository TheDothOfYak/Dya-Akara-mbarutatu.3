/* ============================================================
   THE CARPENTER'S PROPERTY — Buhkon Eldi's land, a region of its
   own, west of Beuhk in the high north of Xikia.

   You leave Beuhk by the little road west and walk the forest
   path: a long, green, winding way under old pines, over a brook,
   past a waystone. At the top of the path the trees open, and
   there it all is — the land falling away below you, slow and
   wide, down to a great lake shining all the way to a dark forest
   on the far shore. The big house sits partway down the slope, not
   on any summit: barn, workshop, tower, woodshed, fenced fields,
   pasture, and a lane down to the old dock. Far to the south, and
   only there, a line of blue mountains. Everywhere else the forest
   simply goes on (the edges are just where you stop being able to
   push through).
   ============================================================ */
import * as THREE from 'three';
import { mulberry32, fbm, smooth, lerp, clamp } from './util.js';
import { toon, ramp, glowSprite, outlineAll, addOutline } from './gfx.js';
import { Colliders, Kit, buildGrass, STEP } from './terrain.js';
export { STEP };

export const WATER_LEVEL = 0;
const DEEP = 1.6;
export const LAKE = { x: -660, z: 40, rx: 380, rz: 440, d: 18 };
export const CREST = { x: 540, z: -14 };                 // where the forest path tops out and the land opens
export const HOUSE = { x: 210, z: -24 };                 // the big house, partway down the slope
export const YARD = { x: 236, z: 18 };                   // the yard between house, workshop and barn
const TOWER = { x: 150, z: -96 };
const WORKSHOP = { x: 262, z: 52 };
const BARN = { x: 150, z: 82 };
const WOODSHED = { x: 300, z: -62 };
const OUTCROP = { x: 330, z: -560 };                     // the rocky lookout on the north hill
const HOLLOW = { x: -140, z: -560 };                     // the forest-edge hollow
const PASTURE = { x: 30, z: -190, w: 110, d: 80 };
const FIELDS = [
  { x: 360, z: 130, w: 90, d: 60 }, { x: 230, z: 190, w: 80, d: 54 }, { x: 80, z: 170, w: 70, d: 50 }, { x: 380, z: -150, w: 70, d: 56 },
];
const EAST_END = 1190;                                   // where the path leaves, back to Beuhk
const PATH = [[1240, 26], [1150, 30], [1060, -18], [930, 30], [820, 6], [700, -34], [610, -14], [CREST.x, CREST.z], [440, -16], [340, -14], [YARD.x + 22, YARD.z - 6]];
const BROOK_X = z => 862 + 16 * Math.sin(z * 0.011);
const LANE = [[YARD.x - 30, YARD.z + 20], [140, 40], [20, 60], [-120, 58], [-300, 54]];
const SHORE_LANE = LANE;

function segDist(x, z, pts) {
  let best = 1e9, along = 0, acc = 0, bestAlong = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz, L = Math.sqrt(L2);
    const t = clamp(((x - ax) * vx + (z - az) * vz) / L2, 0, 1), d = Math.hypot(x - ax - vx * t, z - az - vz * t);
    if (d < best) { best = d; bestAlong = acc + t * L; }
    acc += L;
  }
  return [best, bestAlong];
}
const pathDist = (x, z) => segDist(x, z, PATH)[0];
const laneDist = (x, z) => segDist(x, z, LANE)[0];

/* ---------------- the lie of the land ---------------- */
function slope(x) {   // the long fall from the top of the path down to the lake
  const k = smooth(-300, 560, x);
  return lerp(2.4, 62, Math.pow(k, 1.15));
}
function baseHeight(x, z) {
  let h = slope(x);
  h += (fbm(x * 0.006 + 3, z * 0.006 - 5, 4) - 0.5) * 14 * smooth(-200, 80, x);          // rolling meadow
  h += (fbm(x * 0.03, z * 0.03, 2) - 0.5) * 1.4;
  h += (fbm(x * 0.004 - 9, z * 0.004 + 4, 3) - 0.45) * 8 * smooth(-150, -300, x);         // the lakeside flats, a little uneven
  // east of the crest the forest hills the path winds through
  if (x > 520) h = lerp(h, 58 + (fbm(x * 0.008 + 1, z * 0.008 + 7, 4) - 0.5) * 34, smooth(540, 640, x));
  // the land across the lake rises into old forest
  h += smooth(-980, -1450, x) * 52 * (0.6 + 0.8 * fbm(x * 0.005, z * 0.005 + 2, 3));
  // north: wooded hills climb toward the Megla Aagac a day away
  h += smooth(-420, -980, z) * 78 * (0.65 + 0.7 * fbm(x * 0.006 + 4, z * 0.006, 3));
  // south: a broad vale, then wooded downs
  h += smooth(420, 900, z) * 22 * (fbm(x * 0.007 - 3, z * 0.007 + 5, 3) - 0.25);
  // the north hill with its rocky lookout
  const dO = Math.hypot(x - OUTCROP.x, z - OUTCROP.z);
  h += 46 * Math.exp(-dO * dO / (2 * 90 * 90)) + smooth(30, 8, dO) * 5 * fbm(x * 0.2, z * 0.2, 2);
  // the forest-edge hollow: a soft dip in the trees
  const dH = Math.hypot(x - HOLLOW.x, z - HOLLOW.z); h -= smooth(26, 6, dH) * 3.5;
  return h;
}
const TERRACE = { x: 205, z: 25 };
const TERRACE_H = baseHeight(TERRACE.x, TERRACE.z);
function farMountains(x, z) {
  // only the south has mountains, and they are a long way off
  const r = smooth(2300, 3300, z) * smooth(-5600, -3200, x) * smooth(5600, 3400, x);
  if (r <= 0) return 0;
  const rg = 1 - Math.abs(2 * fbm(x * 0.0012 + 31, z * 0.0012 - 17, 4) - 1);
  return r * (220 + 460 * rg * (0.6 + 0.6 * fbm(x * 0.0006, z * 0.0006, 3)));
}
function heightRaw(x, z) {
  let h = baseHeight(x, z);
  // the house terrace and the yard, levelled long ago
  const dT = Math.hypot(x - TERRACE.x, z - TERRACE.z) * 0.85;
  h = lerp(h, TERRACE_H, smooth(100, 68, dT));
  // distant country: low forested hills everywhere, mountains to the south
  const r = Math.hypot(x, z);
  h += smooth(1500, 2600, r) * 40 * fbm(x * 0.002 + 5, z * 0.002 - 5, 3);
  h += farMountains(x, z);
  // the brook the path crosses
  const db = Math.abs(x - BROOK_X(z));
  if (db < 9 && Math.abs(z) < 700) h -= 2.6 * smooth(9, 2, db);
  // the lake
  const e = Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz) * (1 + (fbm(x * 0.008 + 7, z * 0.008, 2) - 0.5) * 0.16);
  if (e < 1.6) {
    const rm = Math.min(LAKE.rx, LAKE.rz);
    const t = e < 1 ? WATER_LEVEL - LAKE.d * smooth(1, 0.38, e) - 0.6 * smooth(1, 0.94, e) : WATER_LEVEL - 0.6 + (e - 1) * rm * 0.22;
    if (t < h) h = t;
  }
  return h;
}
/* a little shallow cave in the north shore the Carpenter knows about — and the lake bed beyond */
export const SHALLOW_CAVE = { x: -560, z: -380 };
export function heightAt(x, z) {
  let h = heightRaw(x, z);
  // paths are worn a little smooth
  const [pd] = segDist(x, z, PATH);
  if (pd < 6) h -= 0.12 * smooth(6, 2, pd);
  return Math.max(h, -60);
}

/* ---------------- edges: just where you stop being able to push through ---------------- */
const BOUND = { x0: -1240, x1: 545, z0: -940, z1: 880 };
const waterDepth = (x, z) => Math.max(0, WATER_LEVEL - heightAt(x, z));
function onLand(x, z) {
  if (x >= BOUND.x0 && x <= BOUND.x1 && z >= BOUND.z0 && z <= BOUND.z1) return true;
  if (x > 500 && x < EAST_END + 30 && pathDist(x, z) < 20) return true;          // the forest path itself
  return false;
}
function inBounds(x, z) { return onLand(x, z) && waterDepth(x, z) <= DEEP; }
function swimOk(x, z) { return onLand(x, z) && waterDepth(x, z) > DEEP; }
function barrierLine(x, z) {
  if (x > 500 && x < EAST_END + 30) return ['The trees close in thick either side — stay on the path.', 'Brambles and old pine, too thick to push through. Back to the path.'][(Math.floor(x / 37) + Math.floor(z / 29)) & 1];
  if (x < -1100) return 'The far forest is too dark and too thick to go any deeper. Not yet.';
  if (z < -800) return 'The woods climb north toward the mist, thick as a wall. Another day.';
  if (z > 800) return 'The southern woods grow too dense to push through. The mountains are farther than they look.';
  return 'Too thick to push through here.';
}
function edgeRadius(x, z) { const r = Math.hypot(x, z); return onLand(x, z) ? r + 50 : r - 50; }

/* the biomes, for the wilds */
const ZONES = [
  { id: 'p_slope', name: 'The Long Slope', x: 60, z: 20, r: 140, biome: 'meadow' },
  { id: 'p_shore', name: 'The Lakeshore', x: -300, z: 60, r: 70, biome: 'shore' },
  { id: 'p_lake', name: 'The Carpenter’s Lake', x: LAKE.x, z: LAKE.z, r: 300, biome: 'lake' },
  { id: 'p_farwood', name: 'The Far Forest', x: -1130, z: 40, r: 110, biome: 'forest' },
  { id: 'p_northwood', name: 'The North Woods', x: -200, z: -740, r: 160, biome: 'forest' },
  { id: 'p_outcrop', name: 'The Lookout Hill', x: OUTCROP.x, z: OUTCROP.z, r: 90, biome: 'hills' },
  { id: 'p_southvale', name: 'The South Vale', x: 80, z: 600, r: 160, biome: 'meadow' },
  { id: 'p_southwood', name: 'The Southern Woods', x: -500, z: 720, r: 140, biome: 'forest' },
  { id: 'p_eastmeadow', name: 'The High Meadow', x: 420, z: 380, r: 110, biome: 'hills' },
  { id: 'p_pasture', name: 'The Pasture', x: PASTURE.x, z: PASTURE.z, r: 60, biome: 'meadow' },
];
const SITES = {
  yard: { name: 'The Carpenter’s Yard', x: YARD.x, z: YARD.z },
  house: { name: 'The Big House', x: HOUSE.x, z: HOUSE.z },
  crest: { name: 'The Top of the Path', x: CREST.x, z: CREST.z },
  dock: { name: 'The Old Dock', x: -300, z: 54 },
  outcrop: { name: 'The Lookout Rocks', x: OUTCROP.x, z: OUTCROP.z },
  hollow: { name: 'The Forest Hollow', x: HOLLOW.x, z: HOLLOW.z },
  path: { name: 'The Forest Path', x: 900, z: 20 },
  farshore: { name: 'The Far Shore', x: -1060, z: 40 },
};

function treeDensity(x, z) {
  let d = 0;
  if (x > 520) d = smooth(9, 22, pathDist(x, z)) * 0.95;                               // the path's walls of trees
  d = Math.max(d, smooth(-960, -1060, x) * 0.9);                                         // the far forest
  d = Math.max(d, smooth(-460, -620, z) * 0.85);                                         // north woods
  d = Math.max(d, smooth(640, 760, z) * 0.8);                                            // southern woods
  d = Math.max(d, smooth(500, 560, x) * smooth(-120, -260, z) * 0.7, smooth(500, 560, x) * smooth(120, 260, z) * 0.7);   // woods either side of the crest
  d = Math.max(d, 0.03 + 0.42 * smooth(0.6, 0.76, fbm(x * 0.012 + 9, z * 0.012, 2)));    // copses and stands across the open land
  d = Math.max(d, 0.5 * smooth(5, 3, Math.abs(laneDist(x, z) - 7)) * smooth(0.4, 0.6, fbm(x * 0.05, z * 0.05, 1)));   // trees along the lane down to the lake
  return d;
}

export function buildProperty(scene) {
  const rng = mulberry32(1307);
  const col = new Colliders(heightAt);
  const trees = [];
  const doors = [];
  const inField = (x, z) => FIELDS.find(f => Math.abs(x - f.x) < f.w / 2 && Math.abs(z - f.z) < f.d / 2);
  const inPasture = (x, z) => Math.abs(x - PASTURE.x) < PASTURE.w / 2 && Math.abs(z - PASTURE.z) < PASTURE.d / 2;
  const nearBuildings = (x, z, pad = 0) => Math.hypot(x - TERRACE.x, z - TERRACE.z) < 95 + pad || Math.hypot(x - TOWER.x, z - TOWER.z) < 20 + pad;

  /* ---------------- the ground: a fine mesh over the property, a wide one under everything, a far ring ---------------- */
  const c = new THREE.Color(), gA = new THREE.Color('#8fbf52'), gB = new THREE.Color('#b8c45a'), gC = new THREE.Color('#6aa048'),
    dirt = new THREE.Color('#c9a06a'), soil = new THREE.Color('#7a5232'), soilB = new THREE.Color('#9a6a3a'), forestFloor = new THREE.Color('#4a7a38'),
    meadowY = new THREE.Color('#c4cc62'), sand = new THREE.Color('#d6c48e'), bed = new THREE.Color('#4a6a62'), rock = new THREE.Color('#8e8578'),
    rockD = new THREE.Color('#6a6470'), snow = new THREE.Color('#f2f2f6'), farPine = new THREE.Color('#2f5a3a'), haze = new THREE.Color('#8aa0b8');
  const colorAt = (x, z, y, ny, out) => {
    const n = fbm(x * 0.03 + 4, z * 0.03, 3);
    out.copy(gA).lerp(gB, smooth(0.45, 0.72, n)).lerp(gC, smooth(0.5, 0.3, fbm(x * 0.09, z * 0.09, 2)) * 0.6);
    out.lerp(meadowY, smooth(0.56, 0.72, fbm(x * 0.004 + 50, z * 0.004 - 12, 2)) * 0.25);
    out.lerp(forestFloor, smooth(0.45, 0.3, fbm(x * 0.008 - 20, z * 0.008 + 6, 2)) * 0.35);
    const td = treeDensity(x, z);
    out.lerp(forestFloor, smooth(0.2, 0.6, td) * 0.85);
    const f = inField(x, z);
    if (f) out.copy(Math.sin((x - f.x) * 1.2) > 0 ? soil : soilB);
    if (inPasture(x, z)) out.lerp(gB, 0.4);
    out.lerp(dirt, smooth(3.4, 1.6, pathDist(x, z)) * 0.9);
    out.lerp(dirt, smooth(2.8, 1.2, laneDist(x, z)) * 0.8);
    out.lerp(dirt, smooth(30, 18, Math.hypot(x - YARD.x, z - YARD.z)) * 0.55);
    out.lerp(sand, smooth(WATER_LEVEL + 2, WATER_LEVEL + 0.4, y));
    out.lerp(bed, smooth(WATER_LEVEL - 0.6, WATER_LEVEL - 6, y));
    out.lerp(rock, smooth(0.84, 0.64, ny)).lerp(rockD, smooth(0.6, 0.4, ny) * 0.7);
    out.lerp(rock, smooth(30, 5, Math.hypot(x - OUTCROP.x, z - OUTCROP.z)) * 0.7);
    out.lerp(farPine, smooth(1300, 1900, Math.hypot(x, z)) * smooth(260, 120, y) * 0.8);
    out.lerp(rock, smooth(260, 420, y) * 0.6);
    out.lerp(snow, smooth(480, 600, y + n * 60) * smooth(0.45, 0.7, ny));
    out.lerp(haze, smooth(2600, 5200, Math.hypot(x, z)) * 0.35);
    return out;
  };
  const terrainMat = toon(0xffffff, { vertexColors: true });
  const finish = (g, fn = colorAt) => {
    g.computeVertexNormals();
    const P = g.attributes.position, N = g.attributes.normal, cc = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { fn(P.getX(i), P.getZ(i), P.getY(i), N.getY(i), c); cc[i * 3] = c.r; cc[i * 3 + 1] = c.g; cc[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    const m = new THREE.Mesh(g, terrainMat); m.receiveShadow = true; scene.add(m); return m;
  };
  const RECTS = [{ x0: -760, x1: 560, z0: -620, z1: 620 }, { x0: 500, x1: 1290, z0: -130, z1: 130 }];
  const inRect = (x, z, r, pad = 0) => x > r.x0 + pad && x < r.x1 - pad && z > r.z0 + pad && z < r.z1 - pad;
  {
    // the fine meshes: the property, and the path
    for (const [r, sx, sz] of [[RECTS[0], 330, 300], [RECTS[1], 260, 86]]) {
      const tg = new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0, sx, sz); tg.rotateX(-Math.PI / 2); tg.translate((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2);
      const tp = tg.attributes.position;
      for (let i = 0; i < tp.count; i++) tp.setY(i, heightAt(tp.getX(i), tp.getZ(i)));
      finish(tg);
    }
    // the wide mesh, with holes under the fine ones (tucked a touch below where they overlap)
    const MS = 3600, MSEG = 260;
    const mg = new THREE.PlaneGeometry(MS, MS, MSEG, MSEG); mg.rotateX(-Math.PI / 2);
    const mp = mg.attributes.position;
    for (let i = 0; i < mp.count; i++) { const x = mp.getX(i), z = mp.getZ(i); mp.setY(i, heightAt(x, z) - (RECTS.some(r => inRect(x, z, r, -16)) ? 0.8 : 0)); }
    const src = mg.index.array, keep = [];
    const inside = i => RECTS.some(r => inRect(mp.getX(i), mp.getZ(i), r, 6));
    for (let t = 0; t < src.length; t += 3) if (!(inside(src[t]) && inside(src[t + 1]) && inside(src[t + 2]))) keep.push(src[t], src[t + 1], src[t + 2]);
    mg.setIndex(keep);
    finish(mg);
    // the far ring out to the horizon: low forest everywhere, the mountains in the south
    const RADII = [1700, 1800, 1950, 2150, 2400, 2700, 3050, 3450, 3900, 4400, 5000, 5800], A = 160;
    const pos = [], idx = [];
    for (const rr of RADII) for (let j = 0; j <= A; j++) { const an = j / A * Math.PI * 2, x = Math.cos(an) * rr, z = Math.sin(an) * rr; pos.push(x, heightAt(x, z) - (rr < 1800 ? 3 : 0), z); }
    for (let k = 0; k < RADII.length - 1; k++) for (let j = 0; j < A; j++) { const p0 = k * (A + 1) + j, p1 = p0 + A + 1; idx.push(p0, p0 + 1, p1, p1, p0 + 1, p1 + 1); }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setIndex(idx);
    finish(fg);
  }

  /* ---------------- the lake, and the brook ---------------- */
  const lakeMat = new THREE.MeshToonMaterial({ color: 0x4aa6c4, emissive: 0x0e4a62, emissiveIntensity: 0.35, gradientMap: ramp(), transparent: true, opacity: 0.86 });
  {
    const wg = new THREE.CircleGeometry(620, 72); wg.rotateX(-Math.PI / 2);
    const w = new THREE.Mesh(wg, lakeMat); w.position.set(LAKE.x, WATER_LEVEL, LAKE.z); w.receiveShadow = true; w.renderOrder = 1; scene.add(w);
  }
  {
    const pts = [], idx = [];
    const Z0 = -420, Z1 = 420, N = 120;
    for (let i = 0; i <= N; i++) {
      const z = Z0 + (Z1 - Z0) * i / N, bx = BROOK_X(z), y = Math.min(heightRaw(bx - 7, z), heightRaw(bx + 7, z)) - 1.5;
      pts.push(bx - 3.2, y, z, bx + 3.2, y, z);
      if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); bg.setIndex(idx); bg.computeVertexNormals();
    const brook = new THREE.Mesh(bg, new THREE.MeshToonMaterial({ color: 0x5ac0d8, emissive: 0x1a6a80, emissiveIntensity: 0.45, gradientMap: ramp(), transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    scene.add(brook);
  }

  /* ---------------- kits ---------------- */
  const blocks = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 5200);
  const trunks = new Kit(scene, new THREE.CylinderGeometry(0.55, 0.8, 1, 6, 1, true), toon(0xffffff), 6200, false);
  const cones = new Kit(scene, new THREE.ConeGeometry(1, 1, 7, 1, true), toon(0xffffff), 11000, false);
  const crowns = new Kit(scene, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), 3400, false);
  const crops = new Kit(scene, new THREE.ConeGeometry(0.25, 1, 5), toon(0xffffff), 4200, false);
  const rocks = new Kit(scene, new THREE.DodecahedronGeometry(1, 0), toon(0xffffff), 1400, false);
  const pick = a => a[Math.floor(rng() * a.length)];

  /* ---------------- trees ---------------- */
  const PINE = ['#2f6a3a', '#3a7a40', '#2a5a34', '#467f44', '#356e3c', '#24502e'], BROAD = ['#6aa040', '#7ab04a', '#5a9a3a', '#8ab84a', '#c8a03a', '#4a8a3a'];
  const clearOf = (x, z) => pathDist(x, z) < 6.5 || laneDist(x, z) < 5 || nearBuildings(x, z) || !!inField(x, z) || (inPasture(x, z)) || Math.hypot(x - OUTCROP.x, z - OUTCROP.z) < 22
    || Math.hypot(x - HOLLOW.x, z - HOLLOW.z) < 14 || Math.abs(x - BROOK_X(z)) < 5 && Math.abs(z) < 420;
  function pine(x, z, s, walk) {
    const g = heightAt(x, z), h = (7 + rng() * 6) * s;
    trunks.put(x, g + h * 0.2, z, 0.5 * s, h * 0.45, 0.5 * s, 0, rng() * 6, 0, '#5a3a26');
    const pc = pick(PINE);
    cones.put(x, g + h * 0.5, z, 2.7 * s, h * 0.62, 2.7 * s, 0, rng() * 6, 0, pc);
    cones.put(x, g + h * 0.82, z, 1.8 * s, h * 0.45, 1.8 * s, 0, rng() * 6, 0, pc);
    if (walk) { col.add(x, z, 0.45 * s, 0.45 * s, 0, g - 1, g + 8); trees.push({ x, z, g, h, r: 0.45 * s }); }
  }
  function broad(x, z, s, walk, lc) {
    const g = heightAt(x, z), h = (4.5 + rng() * 3) * s;
    trunks.put(x, g + h / 2 - 0.4, z, 0.42 * s, h, 0.42 * s, 0, rng() * 6, 0, '#6b4128');
    lc = lc || pick(BROAD);
    for (let k = 0; k < 4; k++) { const rr = (1.8 + rng() * 1.3) * s; crowns.put(x + (rng() - 0.5) * 2.6 * s, g + h + (rng() - 0.2) * 1.8 * s, z + (rng() - 0.5) * 2.6 * s, rr, rr * 0.85, rr, rng(), rng(), rng(), new THREE.Color(lc).offsetHSL((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.08).getStyle()); }
    if (walk) { col.add(x, z, 0.4 * s, 0.4 * s, 0, g - 1, g + h); trees.push({ x, z, g, h, r: 0.4 * s }); }
  }
  // the path's own walls of trees, close and tall
  for (let i = 0; i < 26000 && trunks.mesh.count < 2400; i++) {
    const x = 500 + rng() * (EAST_END + 60 - 500), z = (rng() - 0.5) * 300;
    const pd = pathDist(x, z);
    if (pd < 7.5 || pd > 140 || rng() > treeDensity(x, z)) continue;
    if (Math.abs(x - BROOK_X(z)) < 5) continue;
    const s = 0.9 + rng() * 0.8;
    if (rng() < 0.82) pine(x, z, s, pd < 26); else broad(x, z, s * 0.9, pd < 26);
  }
  // everywhere else: the far forest, the north and south woods, stands across the slope
  for (let i = 0; i < 90000 && trunks.mesh.count < 5900; i++) {
    const x = -1700 + rng() * 2300, z = -1250 + rng() * 2450;
    if (rng() > treeDensity(x, z) || clearOf(x, z)) continue;
    const g = heightAt(x, z);
    if (g < WATER_LEVEL + 0.8 || g > 260) continue;
    const walk = onLand(x, z), s = 0.8 + rng() * 0.9, dense = treeDensity(x, z) > 0.4;
    if (dense ? rng() < 0.75 : rng() < 0.3) pine(x, z, s, walk); else broad(x, z, s, walk);
  }
  // hedgerows of round bushes along the field fences
  for (const f of FIELDS) for (let k = 0; k < 24; k++) {
    const side = k % 4, t = rng() - 0.5;
    const x = side === 0 ? f.x + t * f.w : side === 1 ? f.x + f.w / 2 + 2.5 : side === 2 ? f.x + t * f.w : f.x - f.w / 2 - 2.5;
    const z = side === 0 ? f.z - f.d / 2 - 2.5 : side === 1 ? f.z + t * f.d : side === 2 ? f.z + f.d / 2 + 2.5 : f.z + t * f.d;
    if (pathDist(x, z) < 6 || laneDist(x, z) < 4) continue;
    const g = heightAt(x, z), r = 1.3 + rng() * 1.1;
    crowns.put(x, g + r * 0.6, z, r * 1.3, r, r * 1.1, rng(), rng(), rng(), pick(['#4a8a3a', '#5a9a3a', '#3a7a34']));
  }
  // an orchard below the house
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
    const x = HOUSE.x - 48 - i * 9 + (j % 2) * 4, z = HOUSE.z - 30 + j * 9;
    if (inField(x, z) || laneDist(x, z) < 5) continue;
    broad(x, z, 0.75, true, pick(['#7ab04a', '#8ab84a', '#e0a040']));
  }
  // the old tree by the yard, with its plank platform — a fort, if you like
  const FORT_TREE = { x: 96, z: 30 };
  {
    const { x, z } = FORT_TREE, g = heightAt(x, z);
    trunks.put(x, g + 4, z, 1.3, 9, 1.3, 0, 0, 0, '#6b4128');
    for (let k = 0; k < 7; k++) { const rr = 3.4 + rng() * 1.6; crowns.put(x + (rng() - 0.5) * 6, g + 11 + rng() * 2.5, z + (rng() - 0.5) * 6, rr, rr * 0.85, rr, rng(), rng(), rng(), pick(['#5a9a3a', '#6aa040', '#7ab04a'])); }
    col.add(x, z, 1.0, 1.0, 0, g - 1, g + 9); trees.push({ x, z, g, h: 9, r: 1 });
    blocks.put(x, g + 5.2, z, 5, 0.3, 5, 0, 0.3, 0, '#9a6a40'); col.add(x, z, 2.5, 2.5, 0.3, g + 4.9, g + 5.35);
    for (let k = 0; k < 9; k++) { const ly = g + 0.45 + k * 0.56; blocks.put(x + 3.1, ly, z - 1.4, 0.9, 0.14, 0.14, 0, 0.3, 0, '#6a4428'); col.add(x + 3.1, z - 1.4 - 0.0, 0.5, 0.35, 0.3, g - 1, ly); }
    for (const [dx, dz] of [[-2.4, 0], [2.4, 0], [0, -2.4], [0, 2.4]]) blocks.put(x + dx, g + 5.8, z + dz, Math.abs(dx) ? 0.12 : 4.8, 0.12, Math.abs(dz) ? 0.12 : 4.8, 0, 0.3, 0, '#6a4428');
  }

  /* ---------------- buildings ---------------- */
  const capTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
    g.fillStyle = '#6a3a22'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(30,15,5,0.5)'; g.lineWidth = 3;
    for (let y = 0; y < 140; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < 140; x += 14) { g.beginPath(); g.arc(x, y, 8, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 2); return t;
  })();
  const roofMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: capTex, gradientMap: ramp() });
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffd890 });
  const glowWindows = [];
  function finishGroup(grp) {
    outlineAll(grp, 0.05);
    grp.traverse(m => { if (m.isMesh && m.name !== 'outline') { m.castShadow = true; m.receiveShadow = true; } });
    scene.add(grp);
  }
  /* a building block: walls, a roof, windows, and its collider. Door on local +z. */
  function hall(x, z, rot, w, d, h, wallC, opts = {}) {
    const g = heightAt(x, z), grp = new THREE.Group(); grp.position.set(x, g, z); grp.rotation.y = rot;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 1.6, d + 0.8), toon(0x9a8a78)); foot.position.y = -0.4; grp.add(foot);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(wallC)); wall.position.y = h / 2; grp.add(wall);
    // timber framing
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), toon(0x5a3a22)); p.position.set(sx * w / 2, h / 2, sz * d / 2); grp.add(p); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.4, d + 0.2), toon(0x5a3a22)); beam.position.y = h; grp.add(beam);
    if (opts.roof !== 'none') {
      if (opts.roof === 'cap') {
        const r = new THREE.Mesh(new THREE.SphereGeometry(Math.max(w, d) * 0.72, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), roofMat); r.scale.set(w / Math.max(w, d), 0.62, d / Math.max(w, d)); r.position.y = h; grp.add(r);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(Math.max(w, d) * 0.7, 0.3, 6, 26), roofMat); rim.rotation.x = Math.PI / 2; rim.scale.set(w / Math.max(w, d), d / Math.max(w, d), 1); rim.position.y = h + 0.05; grp.add(rim);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.6, 6), toon(0x4a2c18)); stem.position.y = h + Math.max(w, d) * 0.45; stem.rotation.z = 0.3; grp.add(stem);
      } else {
        // a pitched roof of two slabs
        const pitch = opts.pitch || 0.62, half = d / 2 + 0.8, slab = half / Math.cos(pitch);
        for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.35, slab), opts.roofC ? toon(opts.roofC) : roofMat); r.rotation.x = s * pitch; r.position.set(0, h + Math.sin(pitch) * slab / 2, s * half / 2); grp.add(r); }
        const gable = new THREE.Shape(); gable.moveTo(-d / 2, 0); gable.lineTo(d / 2, 0); gable.lineTo(0, Math.tan(pitch) * d / 2); gable.lineTo(-d / 2, 0);
        for (const s of [-1, 1]) { const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), toon(wallC, { side: THREE.DoubleSide })); gm.rotation.y = Math.PI / 2; gm.position.set(s * w / 2, h, 0); grp.add(gm); }
      }
    }
    // windows (they glow at night), all round
    const nx = Math.max(1, Math.floor(w / 4)), nz = Math.max(1, Math.floor(d / 4));
    const winY = opts.winY || [h * 0.55];
    for (const wy of winY) {
      for (let i = 0; i < nx; i++) for (const s of [-1, 1]) { const wx = (i - (nx - 1) / 2) * (w / nx); if (s > 0 && Math.abs(wx) < 1.6) continue; const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), winMat); m.position.set(wx, wy, s * (d / 2 + 0.03)); m.rotation.y = s > 0 ? 0 : Math.PI; m.userData.noOutline = true; grp.add(m); glowWindows.push(m); }
      for (let i = 0; i < nz; i++) for (const s of [-1, 1]) { const wz = (i - (nz - 1) / 2) * (d / nz); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), winMat); m.position.set(s * (w / 2 + 0.03), wy, wz); m.rotation.y = s * Math.PI / 2; m.userData.noOutline = true; grp.add(m); glowWindows.push(m); }
    }
    // the door
    const dw = opts.doorW || 1.6, dh = opts.doorH || 2.6;
    if (!opts.noDoor) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(dw, dh, 0.25), toon(0x5a3018)); door.position.set(opts.doorX || 0, dh / 2, d / 2 + 0.06); grp.add(door);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(dw + 0.6, 0.35, 0.4), toon(0x4a2a14)); lintel.position.set(opts.doorX || 0, dh + 0.15, d / 2 + 0.1); grp.add(lintel);
      const lampG = glowSprite(0xffc070, 1.4, 0.8); lampG.position.set((opts.doorX || 0) + dw / 2 + 0.5, dh + 0.2, d / 2 + 0.35); grp.add(lampG);
    }
    finishGroup(grp);
    col.add(x, z, w / 2, d / 2, rot, g - 2, g + h + 3);
    const dx = (opts.doorX || 0), lz = d / 2 + 1.0;
    return { grp, g, door: { x: x + Math.cos(rot) * dx + Math.sin(rot) * lz, z: z - Math.sin(rot) * dx + Math.cos(rot) * lz, yaw: rot } };
  }
  function addDoor(d, id, name, kind) { doors.push({ id, name, kind, x: d.x, z: d.z, yaw: d.yaw }); }

  // the big house: a rich family's house, and it shows without a word said. It faces east, up the slope toward the drive
  const ROT_E = Math.PI / 2;
  {
    const main = hall(HOUSE.x, HOUSE.z, ROT_E, 26, 16, 8.5, '#efe0c0', { roof: 'pitch', roofC: 0x6a3a22, winY: [2.6, 6.2], doorW: 2.2, doorH: 3.2 });
    addDoor(main.door, 'p_house', 'The Big House', 'manor');
    hall(HOUSE.x - 2, HOUSE.z - 19, ROT_E, 14, 12, 6.5, '#e8d4b0', { roof: 'cap', winY: [2.6], noDoor: true });               // north wing
    hall(HOUSE.x - 2, HOUSE.z + 19, ROT_E, 14, 12, 6.5, '#e8d4b0', { roof: 'cap', winY: [2.6], noDoor: true });               // south wing
    // the porch: columns and steps up to the door, and a back terrace looking at the lake
    const g = main.g;
    for (let k = 0; k < 6; k++) { const pz = HOUSE.z - 7 + k * 2.8, px = HOUSE.x + 11; blocks.put(px, g + 2.4, pz, 0.6, 4.8, 0.6, 0, 0, 0, '#f4ead4'); col.add(px, pz, 0.3, 0.3, 0, g - 1, g + 4.8); }
    blocks.put(HOUSE.x + 10, g + 4.9, HOUSE.z, 3.6, 0.4, 16, 0, 0, 0, '#6a3a22');
    blocks.put(HOUSE.x + 10.2, g + 0.15, HOUSE.z, 3.6, 0.3, 16, 0, 0, 0, '#c8b8a0'); col.add(HOUSE.x + 10.2, HOUSE.z, 1.8, 8, 0, g - 1, g + 0.3);
    blocks.put(HOUSE.x - 10.5, g + 0.2, HOUSE.z, 5, 0.4, 22, 0, 0, 0, '#c8b8a0'); col.add(HOUSE.x - 10.5, HOUSE.z, 2.5, 11, 0, g - 1, g + 0.4);
    for (let k = 0; k < 8; k++) blocks.put(HOUSE.x - 12.8, g + 0.9, HOUSE.z - 10 + k * 2.85, 0.2, 1.1, 0.2, 0, 0, 0, '#6a4428');
    // chimneys
    for (const dz of [-8, 8]) { blocks.put(HOUSE.x - 4, g + 14, HOUSE.z + dz, 1.4, 4, 1.4, 0, 0, 0, '#9a8a78'); }
  }
  const work = hall(WORKSHOP.x, WORKSHOP.z, Math.PI, 15, 10, 5.5, '#d8b888', { roof: 'pitch', roofC: 0x7a4a2a, doorW: 2.6, doorH: 3 });
  addDoor(work.door, 'p_workshop', 'The Workshop', 'workshop');
  const barn = hall(BARN.x, BARN.z, Math.PI, 18, 14, 8, '#8a3a2a', { roof: 'pitch', roofC: 0x4a2a1a, pitch: 0.8, doorW: 3.4, doorH: 4, winY: [5.5] });
  addDoor(barn.door, 'p_barn', 'The Barn', 'barn');
  const shed = hall(WOODSHED.x, WOODSHED.z, ROT_E, 7, 5, 3.4, '#8a6a4a', { roof: 'pitch', roofC: 0x5a3a24, doorW: 1.4, doorH: 2.2 });
  addDoor(shed.door, 'p_woodshed', 'The Woodshed', 'woodshed');
  // the tower: tall, fire-tree wood, with a stair winding round the outside to the lookout (and a door at its foot)
  const TOWER_H = 16;
  const towerTop = new THREE.Vector3();
  {
    const { x, z } = TOWER, g = heightAt(x, z);
    blocks.put(x, g + TOWER_H / 2 - 0.5, z, 5, TOWER_H + 1, 5, 0, 0, 0, '#8a5a36');
    blocks.put(x, g + TOWER_H + 0.3, z, 6.4, 0.6, 6.4, 0, 0, 0, '#6a4428');
    for (const [dx, dz] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) blocks.put(x + dx, g + TOWER_H + 1.1, z + dz, Math.abs(dx) ? 0.2 : 6.2, 1, Math.abs(dz) ? 0.2 : 6.2, 0, 0, 0, '#5a3a22');
    const cap = new THREE.Mesh(new THREE.ConeGeometry(4.4, 3.4, 8), roofMat); cap.position.set(x, g + TOWER_H + 4.6, z); addOutline(cap, 0.05); cap.castShadow = true; scene.add(cap);
    for (const [dx, dz] of [[-2.9, -2.9], [2.9, -2.9], [2.9, 2.9], [-2.9, 2.9]]) blocks.put(x + dx, g + TOWER_H + 2.4, z + dz, 0.3, 3.6, 0.3, 0, 0, 0, '#5a3a22');
    col.add(x, z, 2.5, 2.5, 0, g - 1, g + TOWER_H);
    col.add(x, z, 3.2, 3.2, 0, g + TOWER_H - 0.2, g + TOWER_H + 0.6);
    // a stair winding round all four sides, up to the top
    const path = [];
    const side = 4.3, n = 9;
    for (let i = 0; i < n; i++) path.push([x + side, z + side - i * (2 * side / n)]);
    for (let i = 0; i < n; i++) path.push([x + side - i * (2 * side / n), z - side]);
    for (let i = 0; i < n; i++) path.push([x - side, z - side + i * (2 * side / n)]);
    for (let i = 0; i < n; i++) path.push([x - side + i * (2 * side / n), z + side]);
    path.forEach(([bx, bz], i) => {
      const sy = Math.min(TOWER_H, (i + 1) * (TOWER_H / path.length));
      blocks.put(bx, g + sy - 0.2, bz, 1.5, 0.4, 1.5, 0, 0, 0, i % 2 ? '#9a6a40' : '#a8784a');
      blocks.put(bx, g + (sy - 0.4) / 2, bz, 0.3, Math.max(0.2, sy - 0.4), 0.3, 0, 0, 0, '#6a4428');
      col.add(bx, bz, 0.75, 0.75, 0, g + sy - 0.5, g + sy);
    });
    towerTop.set(x, g + TOWER_H, z);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), toon(0xd9a441, { side: THREE.DoubleSide })); flag.position.set(x + 1.2, g + TOWER_H + 7.2, z); scene.add(flag);
    blocks.put(x, g + TOWER_H + 6.5, z, 0.12, 4, 0.12, 0, 0, 0, '#4a2a14');
    // the door at its foot, on the north side, where the stair runs high overhead
    blocks.put(x, g + 1.3, z - 2.55, 1.5, 2.6, 0.2, 0, 0, 0, '#5a3018');
    doors.push({ id: 'p_tower', name: 'The Tower', kind: 'tower', x, z: z - 3.4, yaw: Math.PI });
  }

  /* ---------------- the yard: firepit, well, dummies' posts, a cart ---------------- */
  const hearth = { x: YARD.x + 4, z: YARD.z - 2 };
  const fire = glowSprite(0xff8a3a, 3, 0.9);
  {
    const g = heightAt(hearth.x, hearth.z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.3, 5, 12), toon(0x7a6a5a)); ring.rotation.x = -Math.PI / 2; ring.position.set(hearth.x, g + 0.15, hearth.z); scene.add(ring);
    fire.position.set(hearth.x, g + 0.9, hearth.z); scene.add(fire);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; blocks.put(hearth.x + Math.cos(a) * 3, g + 0.25, hearth.z + Math.sin(a) * 3, 2, 0.5, 0.5, 0, -a, 0, '#7a5232'); }
    // the well
    const wx = YARD.x - 16, wz = YARD.z + 4, wg = heightAt(wx, wz);
    const well = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 1.2, 14), toon(0x9a8a78)); well.position.set(wx, wg + 0.6, wz); addOutline(well, 0.04); scene.add(well);
    col.add(wx, wz, 1.3, 1.3, 0, wg - 1, wg + 1.2);
    for (const s of [-1, 1]) blocks.put(wx + s * 1.3, wg + 1.8, wz, 0.2, 2.4, 0.2, 0, 0, 0, '#6a4428');
    blocks.put(wx, wg + 3.1, wz, 3.2, 0.3, 1.8, 0, 0, 0.0, '#6a3a22');
    // the high post for the far dummy
    blocks.put(YARD.x + 14, heightAt(YARD.x + 14, YARD.z + 18) + 3, YARD.z + 18, 0.8, 6, 0.8, 0, 0, 0, '#6a4428');
    col.add(YARD.x + 14, YARD.z + 18, 0.4, 0.4, 0, heightAt(YARD.x + 14, YARD.z + 18) - 1, heightAt(YARD.x + 14, YARD.z + 18) + 6);
    // a cart, a woodpile, sawhorses
    const cx = WORKSHOP.x - 12, cz = WORKSHOP.z - 12, cg = heightAt(cx, cz);
    blocks.put(cx, cg + 1, cz, 2.2, 0.3, 3.6, 0, 0.4, 0, '#8a5a36'); col.add(cx, cz, 1.1, 1.8, 0.4, cg - 1, cg + 1.2);
    for (const s of [-1, 1]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.2, 12), toon(0x5a3a22)); wh.rotation.z = Math.PI / 2; wh.rotation.y = 0.4; wh.position.set(cx + Math.cos(0.4) * s * 1.2, cg + 0.7, cz - Math.sin(0.4) * s * 1.2); addOutline(wh, 0.03); scene.add(wh); }
    for (let k = 0; k < 14; k++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2, 6), toon(0x7a4e2c)); lg.rotation.x = Math.PI / 2; lg.position.set(WOODSHED.x + 5 + (k % 5) * 0.46, heightAt(WOODSHED.x + 5, WOODSHED.z) + 0.25 + Math.floor(k / 5) * 0.42, WOODSHED.z + 4); scene.add(lg); }
    col.add(WOODSHED.x + 6, WOODSHED.z + 4, 1.3, 1, 0, heightAt(WOODSHED.x + 5, WOODSHED.z) - 1, heightAt(WOODSHED.x + 5, WOODSHED.z) + 1.4);
    for (const [sx, sz] of [[WORKSHOP.x + 10, WORKSHOP.z - 9], [WORKSHOP.x + 13, WORKSHOP.z - 9]]) { const sg = heightAt(sx, sz); blocks.put(sx, sg + 0.8, sz, 0.2, 0.2, 1.6, 0, 0, 0, '#6a4428'); for (const s of [-1, 1]) blocks.put(sx + s * 0.4, sg + 0.4, sz, 0.12, 0.8, 0.12, 0, 0, s * 0.3, '#6a4428'); }
  }

  /* ---------------- fences: the fields, the pasture, a garden by the house ---------------- */
  function fence(f, gate) {
    const per = 2 * (f.w + f.d), n = Math.round(per / 3.2);
    for (let i = 0; i < n; i++) {
      const t = i / n * per;
      let px, pz;
      if (t < f.w) { px = f.x - f.w / 2 + t; pz = f.z - f.d / 2; } else if (t < f.w + f.d) { px = f.x + f.w / 2; pz = f.z - f.d / 2 + (t - f.w); }
      else if (t < 2 * f.w + f.d) { px = f.x + f.w / 2 - (t - f.w - f.d); pz = f.z + f.d / 2; } else { px = f.x - f.w / 2; pz = f.z + f.d / 2 - (t - 2 * f.w - f.d); }
      if (gate && Math.hypot(px - gate.x, pz - gate.z) < 3) continue;
      const g = heightAt(px, pz);
      blocks.put(px, g + 0.6, pz, 0.2, 1.2, 0.2, 0, 0, 0, '#6a4428');
    }
    const rails = [[f.x, f.z - f.d / 2, f.w, 0.12], [f.x + f.w / 2, f.z, 0.12, f.d], [f.x, f.z + f.d / 2, f.w, 0.12], [f.x - f.w / 2, f.z, 0.12, f.d]];
    for (const [rx, rz, rw, rd] of rails) {
      const segs = Math.ceil(Math.max(rw, rd) / 6);
      for (let k = 0; k < segs; k++) {
        const t0 = (k + 0.5) / segs - 0.5, sx = rx + (rw > 1 ? t0 * rw : 0), sz = rz + (rd > 1 ? t0 * rd : 0);
        if (gate && Math.hypot(sx - gate.x, sz - gate.z) < 3.5) continue;
        const g = heightAt(sx, sz);
        for (const ry of [0.55, 1.0]) blocks.put(sx, g + ry, sz, rw > 1 ? rw / segs : 0.1, 0.1, rd > 1 ? rd / segs : 0.1, 0, 0, 0, '#7a5232');
        col.add(sx, sz, rw > 1 ? rw / segs / 2 : 0.12, rd > 1 ? rd / segs / 2 : 0.12, 0, g - 1, g + 1.1);
      }
    }
  }
  for (const f of FIELDS) {
    fence(f, { x: f.x, z: f.z - f.d / 2 });
    for (let k = 0; k < Math.floor(f.w * f.d / 6); k++) {
      const cx = f.x + (rng() - 0.5) * (f.w - 2), cz = f.z + (rng() - 0.5) * (f.d - 2);
      if (Math.sin((cx - f.x) * 1.2) < 0.25) continue;
      crops.put(cx, heightAt(cx, cz) + 0.45, cz, 1 + rng() * 0.5, 0.9 + rng() * 0.7, 1 + rng() * 0.5, 0, rng() * 3, 0, pick(['#c8b040', '#d8c060', '#8ab04a', '#e0a040', '#a8c050']));
    }
  }
  fence(PASTURE, { x: PASTURE.x + PASTURE.w / 2, z: PASTURE.z });
  const GARDEN = { x: HOUSE.x - 28, z: HOUSE.z + 26, w: 18, d: 14 };
  fence(GARDEN, { x: GARDEN.x + GARDEN.w / 2, z: GARDEN.z });
  for (let k = 0; k < 90; k++) { const cx = GARDEN.x + (rng() - 0.5) * 16, cz = GARDEN.z + (rng() - 0.5) * 12; crops.put(cx, heightAt(cx, cz) + 0.35, cz, 1.2, 0.7, 1.2, 0, rng() * 3, 0, pick(['#e05a5a', '#e8c84a', '#7ab04a', '#c060a0'])); }

  /* ---------------- the old dock, the boathouse, the shallow cave ---------------- */
  let shoreX = -150; while (shoreX > -700 && heightAt(shoreX, 54) > WATER_LEVEL + 0.4) shoreX -= 1;
  const DOCK = { x: shoreX, z: 54 };
  const propShore = new THREE.Vector3(shoreX + 4, heightAt(shoreX + 4, 49), 49);
  {
    const dy = WATER_LEVEL + 0.9;
    for (let k = -3; k < 14; k++) blocks.put(DOCK.x - k * 1.6, dy, DOCK.z, 1.45, 0.25, 3.4, 0, 0.02 * (k % 3), 0, k % 2 ? '#7a5232' : '#8a6040');
    for (let k = 0; k < 14; k += 2) for (const sd of [-1, 1]) blocks.put(DOCK.x - k * 1.6, dy - 2.5, DOCK.z + sd * 1.6, 0.3, 5, 0.3, 0, 0, 0, '#4a3020');
    col.add(DOCK.x - 8 * 1.6 + 3.2, DOCK.z, 13, 1.7, 0, dy - 3, dy + 0.12);
    // the boathouse beside the dock
    const bh = hall(shoreX + 14, DOCK.z + 16, Math.PI, 10, 9, 4.4, '#7a6a5a', { roof: 'pitch', roofC: 0x4a3a2a, doorW: 1.6, doorH: 2.4 });
    addDoor(bh.door, 'p_boathouse', 'The Boathouse', 'boathouse');
  }
  {
    // a dark mouth in the rocks on the north shore, half under the water
    const { x, z } = SHALLOW_CAVE, g = Math.max(WATER_LEVEL, heightAt(x, z));
    for (let k = 0; k < 9; k++) { const a = Math.PI + (k / 8 - 0.5) * 2.4, s = 3 + rng() * 3; rocks.put(x + Math.cos(a) * 8, g + s * 0.4, z + Math.sin(a) * 8 - 6, s * 1.3, s, s, rng() * 3, rng() * 3, rng() * 3, pick(['#8a8478', '#7e7a74', '#9a9284'])); }
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(3.4, 18, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x0a1418 })); mouth.position.set(x, WATER_LEVEL - 1.2, z - 9); scene.add(mouth);
  }

  /* ---------------- the forest path: waystone, brook and bridge, an old gate at the top ---------------- */
  let bridgeY = 0;
  {
    // the bridge over the brook
    const bz = 3.4, bx = BROOK_X(bz);
    bridgeY = Math.max(heightAt(bx - 8, bz), heightAt(bx + 8, bz)) + 0.35;
    for (let k = -6; k <= 6; k++) blocks.put(bx + k * 1.0, bridgeY - 0.12, bz, 0.95, 0.24, 3.4, 0, 0.0, 0, k % 2 ? '#8a5a36' : '#9a6a40');
    col.add(bx, bz, 6.5, 1.7, 0, bridgeY - 3, bridgeY);
    for (const s of [-1, 1]) { blocks.put(bx, bridgeY + 0.9, bz + s * 1.7, 13, 0.14, 0.14, 0, 0, 0, '#6a4428'); col.add(bx, bz + s * 1.8, 6.5, 0.15, 0, bridgeY, bridgeY + 1.1); for (let k = -6; k <= 6; k += 3) blocks.put(bx + k, bridgeY + 0.45, bz + s * 1.7, 0.16, 0.9, 0.16, 0, 0, 0, '#6a4428'); }
    // the old gateposts at the top of the path, where the land opens
    for (const s of [-1, 1]) {
      const gx = CREST.x + 6, gz = CREST.z + s * 5, gg = heightAt(gx, gz);
      blocks.put(gx, gg + 2.2, gz, 1.2, 4.4, 1.2, 0, 0, 0, '#9a8a78'); col.add(gx, gz, 0.6, 0.6, 0, gg - 1, gg + 4.4);
      const acorn = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), toon(0xc8902a)); acorn.scale.y = 1.25; acorn.position.set(gx, gg + 5, gz); addOutline(acorn, 0.04); scene.add(acorn);
    }
    blocks.put(CREST.x + 6, heightAt(CREST.x + 6, CREST.z) + 4.6, CREST.z, 0.5, 0.5, 10.6, 0, 0, 0, '#6a4428');
    // a fallen log arching over the path, deep in the trees
    const lx = 990, lg = heightAt(lx, 4) + 3.6;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 26, 10), toon(0x5a3a22)); log.rotation.x = Math.PI / 2; log.rotation.z = 0.12; log.position.set(lx, lg, 0); addOutline(log, 0.04); log.castShadow = true; scene.add(log);
  }
  // glowing toadstools along the path, the forest edges and the shore (they come up at night)
  const shrooms = [];
  {
    const capMat = new THREE.MeshToonMaterial({ color: 0x6ae8ff, emissive: 0x2ad0ff, emissiveIntensity: 0.15, gradientMap: ramp() });
    const capMat2 = new THREE.MeshToonMaterial({ color: 0xc8a0ff, emissive: 0x9a6aff, emissiveIntensity: 0.15, gradientMap: ramp() });
    const stemMat = toon(0xe8e0d0);
    const capG = new THREE.SphereGeometry(0.35, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), stemG = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6);
    const spots = [];
    for (let i = 0; i < 4000 && spots.length < 260; i++) {
      const x = -1100 + rng() * 2300, z = -800 + rng() * 1500;
      const nearPath = x > 520 && pathDist(x, z) > 4 && pathDist(x, z) < 16;
      const edge = treeDensity(x, z) > 0.35 && treeDensity(x, z) < 0.8 && onLand(x, z);
      const shore = Math.abs(heightAt(x, z) - WATER_LEVEL - 1.2) < 0.8;
      if (!(nearPath || (edge && rng() < 0.3) || (shore && rng() < 0.4))) continue;
      spots.push([x, z]);
    }
    for (const [x, z] of spots) {
      const g = heightAt(x, z), grp = new THREE.Group(), n = 1 + Math.floor(rng() * 3), m = rng() < 0.7 ? capMat : capMat2;
      for (let k = 0; k < n; k++) { const s = 0.6 + rng() * 0.9; const st = new THREE.Mesh(stemG, stemMat); st.position.set((rng() - 0.5) * 0.8, 0.25 * s, (rng() - 0.5) * 0.8); st.scale.setScalar(s); grp.add(st); const cp = new THREE.Mesh(capG, m); cp.position.set(st.position.x, 0.5 * s, st.position.z); cp.scale.setScalar(s); grp.add(cp); }
      const gl = glowSprite(m === capMat ? 0x6ae8ff : 0xc8a0ff, 2.2, 0); gl.position.y = 0.6; grp.add(gl);
      grp.position.set(x, g, z); scene.add(grp); shrooms.push(gl);
    }
    var shroomMats = [capMat, capMat2];
  }

  /* ---------------- the lookout rocks, and the forest hollow ---------------- */
  {
    const { x, z } = OUTCROP, g = heightAt(x, z);
    for (let k = 0; k < 14; k++) { const a = rng() * Math.PI * 2, d = 6 + rng() * 14, s = 2 + rng() * 4, rx = x + Math.cos(a) * d, rz = z + Math.sin(a) * d, rg = heightAt(rx, rz); rocks.put(rx, rg + s * 0.3, rz, s * 1.3, s * 0.8, s, rng() * 3, rng() * 3, rng() * 3, pick(['#9a9284', '#8a8478', '#a8a090'])); col.add(rx, rz, s * 0.9, s * 0.9, 0, rg - 1, rg + s * 0.9); }
    // the flat lookout slab at the very top
    blocks.put(x, g + 0.6, z, 7, 1.2, 5, 0, 0.3, 0, '#9a9284'); col.add(x, z, 3.5, 2.5, 0.3, g - 1, g + 1.2);
    const { x: hx, z: hz } = HOLLOW, hg = heightAt(hx, hz);
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, lx = hx + Math.cos(a) * 9, lz = hz + Math.sin(a) * 9; const lgm = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 5, 7), toon(0x5a3a22)); lgm.rotation.z = Math.PI / 2; lgm.rotation.y = -a + Math.PI / 2; lgm.position.set(lx, heightAt(lx, lz) + 0.4, lz); addOutline(lgm, 0.03); scene.add(lgm); }
  }
  // boulders scattered across the slope and the far shore
  for (let i = 0; i < 900; i++) {
    const x = -1200 + rng() * 1750, z = -900 + rng() * 1750;
    if (clearOf(x, z) || rng() < 0.6) continue;
    const g = heightAt(x, z); if (g < WATER_LEVEL - 1) continue;
    const s = 0.5 + Math.pow(rng(), 3) * 3.4;
    rocks.put(x, g + s * 0.25, z, s * (1 + rng() * 0.5), s * 0.75, s, rng() * 3, rng() * 3, rng() * 3, pick(['#9a9284', '#8a8478', '#a8a090', '#b8a080']));
    if (s > 1.2 && onLand(x, z)) col.add(x, z, s * 0.8, s * 0.8, 0, g - 1, g + s * 0.9);
  }

  blocks.done(); trunks.done(); cones.done(); crowns.done(); crops.done(); rocks.done();
  const grass = buildGrass(scene, rng, (x, z) => onLand(x, z) && heightAt(x, z) > WATER_LEVEL + 0.6 && pathDist(x, z) > 2.5 && laneDist(x, z) > 2 && Math.hypot(x - YARD.x, z - YARD.z) > 20 && !inField(x, z) && !nearBuildings(x, z, -60),
    heightAt, ['#8fbf52', '#a8c45a', '#7ab04a', '#c0c860', '#98b850'], 30000, 60, 0, 560);

  /* Zahreh flowers in the meadows */
  const flowers = [];
  const petal = new THREE.MeshToonMaterial({ color: 0xffb0d0, emissive: 0xff70b0, emissiveIntensity: 0.6, gradientMap: ramp() });
  for (let i = 0; i < 30; i++) {
    const fx = -250 + rng() * 700, fz = -350 + rng() * 700;
    if (clearOf(fx, fz) || !onLand(fx, fz) || heightAt(fx, fz) < WATER_LEVEL + 1) continue;
    const grp = new THREE.Group();
    for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), petal); const pa = k / 5 * Math.PI * 2; p.position.set(Math.cos(pa) * 0.3, 0.9, Math.sin(pa) * 0.3); p.scale.set(1, 0.45, 1.6); p.rotation.y = -pa; grp.add(p); }
    const gl = glowSprite(0xff8ac8, 2.2, 0.6); gl.position.y = 1; grp.add(gl);
    grp.position.set(fx, heightAt(fx, fz), fz); scene.add(grp);
    flowers.push({ grp, x: fx, z: fz, ready: true, timer: 0 });
  }

  /* where creatures live */
  const spawnGroups = [
    { at: [PASTURE.x - 20, PASTURE.z], kinds: ['punk_d', 'punk_d', 'punk_d', 'punk_d', 'punk_d'], tag: 'herd' },
    { at: [PASTURE.x + 25, PASTURE.z + 10], kinds: ['punk_d', 'punk_d', 'punk_d'], tag: 'herd' },
    { at: [YARD.x - 4, YARD.z + 14], kinds: ['dummy', 'dummy', 'dummy'] },
    { at: [YARD.x + 14, YARD.z + 18], kinds: ['dummy_far'] },
    { at: [-80, -320], kinds: ['kipsu_f', 'kipsu_f', 'kipsu_f'] },
    { at: [320, 300], kinds: ['kipsu_f', 'kipsu_f'] },
    { at: [-20, 90], kinds: ['kofi', 'kofi', 'kofi'] }, { at: [380, -40], kinds: ['kofi', 'kofi'] },
    { at: [760, 10], kinds: ['kofi', 'kofi'] },
    { at: [-940, 260], kinds: ['albali', 'albali'] }, { at: [-300, -500], kinds: ['albali', 'albali'] },
    { at: [-1120, -120], kinds: ['punk', 'punk', 'punk'] },
    { at: [-200, -760], kinds: ['rodak', 'rodak', 'rodak'] },
    { at: [-1100, 260], kinds: ['kipsu', 'kipsu', 'kipsu'] },
  ];

  const lanterns = [
    { id: 'p_pathfoot', name: 'The Forest Path', x: 1130, z: 34 },
    { id: 'p_gate', name: 'The Top of the Path', x: CREST.x - 6, z: CREST.z + 9 },
    { id: 'p_yard', name: 'The Carpenter’s Yard', x: YARD.x + 12, z: YARD.z - 14 },
    { id: 'p_dock', name: 'The Old Dock', x: DOCK.x + 8, z: DOCK.z - 6 },
  ];
  const stones = [
    { key: 'p_yard', x: WORKSHOP.x - 6, z: WORKSHOP.z - 8 },
    { key: 'p_path', x: 1000, z: 4 },
    { key: 'p_lookout', x: OUTCROP.x + 4, z: OUTCROP.z + 4 },
  ];
  // the way back to Beuhk: walk on east along the path, out of the trees
  const exits = [{ id: 'p_east', to: 'xilia', toExit: 'x_west', name: 'The Forest Path', dest: 'Beuhk', x: EAST_END, z: 30, nx: 1, nz: 0, w: 20, arrive: { x: 1120, z: 32 } }];

  const t0 = { night: 0 };
  return {
    name: 'property', heightAt, col, SITES, trees, propShore, PLAZA: { x: YARD.x, z: YARD.z, y: heightAt(YARD.x, YARD.z) }, hazards: [], pillars: [], camp: null,
    hearth, pen: { x: PASTURE.x, z: PASTURE.z }, yard: YARD, house: HOUSE, crest: CREST, tower: { x: TOWER.x, z: TOWER.z, y: towerTop.y }, seedSpot: null, grove: null,
    pier: { y: WATER_LEVEL + 0.9, start: new THREE.Vector3(YARD.x, heightAt(YARD.x, YARD.z), YARD.z), end: DOCK.z, z0: DOCK.z },
    edgeRadius, flowers, spawnGroups, lanterns, stones, falls: [], clear: [{ x: YARD.x, z: YARD.z, r: 30 }, { x: HOUSE.x, z: HOUSE.z, r: 30 }],
    inBounds, barrierLine, swimOk, passes: [], exits, doors, homeRadius: (x, z) => edgeRadius(x, z),
    water: { level: WATER_LEVEL, isWater: (x, z) => waterDepth(x, z) > DEEP, depth: waterDepth, lakes: [{ id: 'eldimere', x: LAKE.x, z: LAKE.z, rx: LAKE.rx, rz: LAKE.rz, maxDepth: LAKE.d }] },
    zones: ZONES.map(z => ({ ...z })), albaliSpots: [{ x: -880, z: 380 }, { x: 420, z: 300 }, { x: -60, z: -420 }], juFields: [{ x: 300, z: 260, r: 7 }],
    kuniPerch: { x: OUTCROP.x, z: OUTCROP.z, y: heightAt(OUTCROP.x, OUTCROP.z) },
    map: { cx: -300, cz: -20, span: 2000 },
    path: PATH, crestPoint: new THREE.Vector3(CREST.x, heightAt(CREST.x, CREST.z), CREST.z), dockPoint: new THREE.Vector3(DOCK.x, WATER_LEVEL + 1, DOCK.z),
    pathStart: new THREE.Vector3(1120, heightAt(1120, 32), 32),
    update(t, dt, particles, camPos, night = 0) {
      grass.material.userData.shader && (grass.material.userData.shader.uniforms.uTime.value = t);
      flowers.forEach(f => { if (f.ready) f.grp.rotation.y = t * 0.5; });
      fire.scale.setScalar(3 + Math.sin(t * 11) * 0.25);
      // the bioluminescence comes up with the dark: toadstools, the lake, fireflies
      const n = night;
      if (Math.abs(n - t0.night) > 0.01) {
        t0.night = n;
        for (const s of shrooms) s.material.opacity = n * 0.75;
        shroomMats.forEach(m => { m.emissiveIntensity = 0.15 + n * 1.4; });
        lakeMat.emissive.setHex(n > 0.3 ? 0x1a8aa8 : 0x0e4a62); lakeMat.emissiveIntensity = 0.35 + n * 0.55;
        for (const w of glowWindows) w.material.color.setHex(n > 0.4 ? 0xffc870 : 0xffd890);
      }
      if (particles) {
        if (Math.random() < 0.6) particles.emit(hearth.x + (Math.random() - 0.5) * 0.8, heightAt(hearth.x, hearth.z) + 0.8, hearth.z + (Math.random() - 0.5) * 0.8, { vx: 0, vy: 2 + Math.random(), vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: 0.35, life: 0.9, drag: 0.5 });
        if (Math.random() < 0.3) particles.emit(HOUSE.x - 4, TERRACE_H + 16.5, HOUSE.z + (Math.random() < 0.5 ? -8 : 8), { vx: 0.6, vy: 1.2, vz: 0.2, color: 0xd8d0c8, size: 1.2, life: 2.5, drag: 0.3 });
        if (camPos) {
          if (Math.random() < 0.35) particles.emit(camPos.x + (Math.random() - 0.5) * 40, camPos.y + (Math.random() - 0.5) * 12, camPos.z + (Math.random() - 0.5) * 40, { vx: 0.4, vy: 0.15, vz: 0.1, color: 0xffe0a0, size: 0.12, life: 5, drag: 0 });
          if (n > 0.3 && Math.random() < n) particles.emit(camPos.x + (Math.random() - 0.5) * 50, camPos.y - 1 + Math.random() * 4, camPos.z + (Math.random() - 0.5) * 50, { vx: (Math.random() - 0.5) * 0.5, vy: 0.2, vz: (Math.random() - 0.5) * 0.5, color: Math.random() < 0.6 ? 0xc8ff6a : 0x6ae8ff, size: 0.22, life: 3, drag: 0 });
        }
      }
    },
  };
}
