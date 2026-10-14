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
import { toon, ramp, glowSprite, mistSprite, outlineAll, addOutline } from './gfx.js';
import { Colliders, Kit, buildGrass, STEP } from './terrain.js';
import { MANOR_SPOTS } from './interiors.js';
export { STEP };

export const WATER_LEVEL = 0;
const DEEP = 1.6;
export const LAKE = { x: -660, z: 40, rx: 380, rz: 440, d: 18 };
export const CREST = { x: 540, z: -14 };                 // where the forest path tops out and the land opens
export const HOUSE = { x: 210, z: -24 };                 // the big house, partway down the slope
export const YARD = { x: 236, z: 18 };                   // the yard between house, workshop and barn
const TOWER = { x: 150, z: -96 };
const WORKSHOP = { x: 209, z: 17 };                     // the workshop, joined to the house's south wing by a covered way
const TIMBER = { x: 262, z: 52 };                       // the timber yard, where the old workshop stood
const WELL = { x: 252, z: -6 };
const GREENHOUSE = { x: 178, z: 25 };
const POND = { x: 112, z: -8, r: 11 };
const HIVES = { x: 168, z: -66 };
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
/* the two colossi: trees of the old world, eight times the height of the deepwood's giants — one
   on the far shore of the lake, one rising out of the north woods. You see them from everywhere. */
export const COLOSSI = [
  { id: 'elder', name: 'The Elder Tree', x: -1100, z: 120, H: 520, R: 34, seed: 71, mound: 10, lean: 0.6,
    leaf: ['#2c6234', '#346e3a', '#3e7a3c', '#28562e', '#46823e'], tip: ['#5e9a44', '#6aa64a', '#7ab04e'], glow: ['#bfeee6'] },
  { id: 'warden', name: 'The North Warden', x: -560, z: -730, H: 452, R: 28, seed: 113, mound: 8, lean: -0.5,
    leaf: ['#24543a', '#2c6040', '#346a48', '#204a34', '#3a7450'], tip: ['#5a9a6a', '#4e8e62', '#6aa878'], glow: ['#bfeee6'] },
];
const colossusNear = (x, z, pad = 0) => COLOSSI.some(C => Math.hypot(x - C.x, z - C.z) < C.R * 4.6 + pad);
// the hush under their roofs: a little of the deepwood's dimness, out in the open land
const canopyShade = (x, z) => { let s = 0; for (const C of COLOSSI) s = Math.max(s, 0.42 * smooth(C.R * 6.4, C.R * 2.2, Math.hypot(x - C.x, z - C.z))); return s; };

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
// how deep under the deepwood's roof a point is: 0 out in the open, 1 in the heart of the wood
const shadeAt = (x, z) => x < 560 || x > 1250 ? 0 : smooth(560, 640, x) * smooth(1250, 1215, x) * smooth(110, 70, pathDist(x, z));

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
  // each colossus sits on a low hill of its own making, centuries of roots and leaf-fall
  for (const C of COLOSSI) { const dC = Math.hypot(x - C.x, z - C.z); if (dC < 300) h += C.mound * Math.exp(-dC * dC / (2 * 75 * 75)); }
  return h;
}
const TERRACE = { x: 205, z: 25 };
const TERRACE_H = baseHeight(TERRACE.x, TERRACE.z);
const POND_H = lerp(baseHeight(POND.x, POND.z), TERRACE_H, smooth(100, 68, Math.hypot(POND.x - TERRACE.x, POND.z - TERRACE.z) * 0.85));
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
  // the little pond below the orchard: a level shelf of meadow, and a dish in it
  const dP = Math.hypot(x - POND.x, z - POND.z);
  if (dP < POND.r + 16) { h = lerp(h, POND_H, smooth(POND.r + 15, POND.r + 5, dP)); h -= 1.4 * smooth(POND.r + 2, POND.r - 4, dP); }
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
  elder: { name: COLOSSI[0].name, x: COLOSSI[0].x, z: COLOSSI[0].z },
  warden: { name: COLOSSI[1].name, x: COLOSSI[1].x, z: COLOSSI[1].z },
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
    rockD = new THREE.Color('#6a6470'), snow = new THREE.Color('#f2f2f6'), farPine = new THREE.Color('#2f5a3a'), haze = new THREE.Color('#8aa0b8'), deepFloor = new THREE.Color('#2a3a26');
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
    const sh = shadeAt(x, z); if (sh > 0) out.lerp(deepFloor, sh * 0.6);   // leaf-litter and moss under the giants
    const csh = canopyShade(x, z); if (csh > 0) out.lerp(forestFloor, csh * 1.6).lerp(deepFloor, csh * 0.7);   // and under the colossi
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
  const RECTS = [{ x0: -760, x1: 560, z0: -620, z1: 620 }, { x0: 500, x1: 1290, z0: -130, z1: 130 },
    { x0: -1260, x1: -940, z0: -100, z1: 340 }, { x0: -720, x1: -400, z0: -900, z1: -620 }];   // fine ground round the colossi's roots
  const inRect = (x, z, r, pad = 0) => x > r.x0 + pad && x < r.x1 - pad && z > r.z0 + pad && z < r.z1 - pad;
  {
    // the fine meshes: the property, and the path
    for (const [r, sx, sz] of [[RECTS[0], 330, 300], [RECTS[1], 260, 86], [RECTS[2], 80, 110], [RECTS[3], 80, 70]]) {
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
  const blocks = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 15000);
  const trunks = new Kit(scene, new THREE.CylinderGeometry(0.55, 0.8, 1, 6, 1, true), toon(0xffffff), 6200, false);
  const cones = new Kit(scene, new THREE.ConeGeometry(1, 1, 7, 1, true), toon(0xffffff), 11000, false);
  const crowns = new Kit(scene, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), 9500, false);
  const tufts = new Kit(scene, new THREE.IcosahedronGeometry(1, 0), toon(0xffffff), 4000, false);   // small leafy and flowery bits: boxes, ivy, moss, the garden
  const crops = new Kit(scene, new THREE.ConeGeometry(0.25, 1, 5), toon(0xffffff), 4200, false);
  const rocks = new Kit(scene, new THREE.DodecahedronGeometry(1, 0), toon(0xffffff), 1400, false);
  const pick = a => a[Math.floor(rng() * a.length)];

  /* ---------------- trees ---------------- */
  const PINE = ['#2f6a3a', '#3a7a40', '#2a5a34', '#467f44', '#356e3c', '#24502e'], BROAD = ['#6aa040', '#7ab04a', '#5a9a3a', '#8ab84a', '#c8a03a', '#4a8a3a'];
  const clearOf = (x, z) => pathDist(x, z) < 6.5 || laneDist(x, z) < 5 || nearBuildings(x, z) || !!inField(x, z) || (inPasture(x, z)) || Math.hypot(x - OUTCROP.x, z - OUTCROP.z) < 22
    || Math.hypot(x - HOLLOW.x, z - HOLLOW.z) < 14 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 7 || Math.hypot(x - HIVES.x, z - HIVES.z) < 9 || Math.abs(x - BROOK_X(z)) < 5 && Math.abs(z) < 420 || colossusNear(x, z);
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
  /* ---------------- the deepwood: the forest path under the old giants ----------------
     Trunks wider than a cart is long, going up and up into one roof of leaves that
     shuts the sky out entirely. Down here it is dim and blue-green, and the light
     is the wood's own: seams of it running up the bark, beads along the branches,
     specks among the leaves, moss glowing on the stones and toadstools in the litter. */
  const giants = [];
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  const GLOWS = ['#bfeee6'];   // one soft colour for everything that glows in here
  const ceilY = (x, z) => (heightAt(x, z) * 0.4 + (heightAt(x - 24, z) + heightAt(x + 24, z) + heightAt(x, z - 24) + heightAt(x, z + 24)) * 0.15) + 44;
  {
    // the roof: one sheet of leaf-dark over the whole corridor, sagging down into the walls at its edges
    const X0 = 584, X1 = 1250, Z0 = -170, Z1 = 170, SX = 112, SZ = 56;
    const cg = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, SX, SZ); cg.rotateX(Math.PI / 2); cg.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    const cp = cg.attributes.position, cc = new Float32Array(cp.count * 3), tc = new THREE.Color();
    const keepV = [];
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i), z = cp.getZ(i), pd = pathDist(x, z);
      const lump = (fbm(x * 0.03, z * 0.03, 2) - 0.5) * 9;
      cp.setY(i, ceilY(x, z) + lump - 34 * smooth(80, 150, pd));
      keepV[i] = pd < 160;
      const spark = fbm(x * 0.21 + 3, z * 0.21, 1);
      tc.set('#0d2016').lerp(new THREE.Color('#1a3a22'), fbm(x * 0.05, z * 0.05, 1));
      if (spark > 0.72) tc.lerp(new THREE.Color(GLOWS[(Math.floor(x * 7 + z * 3) >>> 0) % GLOWS.length]), smooth(0.72, 0.85, spark) * 0.6);
      cc[i * 3] = tc.r; cc[i * 3 + 1] = tc.g; cc[i * 3 + 2] = tc.b;
    }
    const src = cg.index.array, keep = [];
    for (let t = 0; t < src.length; t += 3) if (keepV[src[t]] || keepV[src[t + 1]] || keepV[src[t + 2]]) keep.push(src[t], src[t + 1], src[t + 2]);
    cg.setIndex(keep); cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    const roof = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true }));
    scene.add(roof);
  }
  const gTrunks = new Kit(scene, new THREE.CylinderGeometry(0.72, 1, 1, 12, 1, true), toon(0xffffff), 260, false);
  const gLimbs = new Kit(scene, new THREE.CylinderGeometry(0.55, 1, 1, 7, 1, true), toon(0xffffff), 1900, false);
  const gLeaves = new Kit(scene, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), 1500, false);
  const seams = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), glowMat, 3400, false);
  const beads = new Kit(scene, new THREE.OctahedronGeometry(1, 0), glowMat, 17000, false);
  const shelfG = new THREE.CylinderGeometry(1, 0.6, 0.18, 9, 1, false, 0, Math.PI); 
  const shelves = new Kit(scene, shelfG, glowMat, 1200, false);
  const mossCaps = new Kit(scene, new THREE.IcosahedronGeometry(1, 1), glowMat, 500, false);
  const floorGlow = new Kit(scene, new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2), glowMat, 700, false);
  const stems = new Kit(scene, new THREE.CylinderGeometry(0.08, 0.11, 1, 5), toon(0xe8e0d0), 2400, false);
  const caps = new Kit(scene, new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), glowMat, 2400, false);
  const halos = [];
  const glowCol = () => new THREE.Color(pick(GLOWS)).multiplyScalar(0.55 + rng() * 0.2);
  const V = new THREE.Vector3(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  // a limb from (ax,ay,az) out to (bx,by,bz), for any cylinder-shaped kit
  const limb = (kit, ax, ay, az, bx, by, bz, r, col) => {
    V.set(bx - ax, by - ay, bz - az); const L = V.length(); V.normalize(); Q.setFromUnitVectors(UP, V);
    const e = new THREE.Euler().setFromQuaternion(Q);
    kit.put((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, r, L, r, e.x, e.y, e.z, col);
  };
  // walk the path, planting giants either side
  {
    let acc = 0;
    for (let i = 0; i < PATH.length - 1; i++) {
      const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (let d = 0; d < L; d += 4) {
        acc += 4; if (acc < 15 + rng() * 6) continue; acc = 0;
        const px = ax + (bx - ax) * d / L, pz = az + (bz - az) * d / L;
        if (px < 600 || px > 1236) continue;
        for (const side of [-1, 1]) {
          if (rng() < 0.18) continue;
          const off = 11 + rng() * 12 + (rng() < 0.3 ? 14 + rng() * 20 : 0), x = px + nx * off * side + (rng() - 0.5) * 6, z = pz + nz * off * side + (rng() - 0.5) * 6;
          const R = 1.9 + rng() * 1.8;
          if (pathDist(x, z) < R + 6.5 || Math.abs(x - BROOK_X(z)) < R + 6 || giants.some(gt => Math.hypot(gt.x - x, gt.z - z) < gt.R + R + 5)) continue;
          giants.push({ x, z, R });
        }
      }
    }
    // a second rank, further back, so the walls are giants too and not just the first row
    for (let i = 0; i < 1400 && giants.length < 150; i++) {
      const x = 600 + rng() * 640, z = (rng() - 0.5) * 220, pd = pathDist(x, z), R = 2.2 + rng() * 2.2;
      if (pd < 30 || pd > 95 || Math.abs(x - BROOK_X(z)) < R + 6 || giants.some(gt => Math.hypot(gt.x - x, gt.z - z) < gt.R + R + 9)) continue;
      giants.push({ x, z, R });
    }
    for (const gt of giants) {
      const { x, z, R } = gt, g = heightAt(x, z) - 0.6, top = ceilY(x, z) - 2, h = top - g;
      gt.g = g;
      const bark = new THREE.Color('#3e3228').offsetHSL((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.06).getStyle();
      gTrunks.put(x, g + h / 2, z, R, h, R, 0, rng() * 6, 0, bark);
      col.add(x, z, R * 0.85, R * 0.85, 0, g - 1, g + 30);
      trees.push({ x, z, g, h, r: R });   // Brindle can swing from these
      // buttress roots fanning out over the ground
      const nr = 5 + Math.floor(rng() * 3);
      for (let k = 0; k < nr; k++) {
        const a = k / nr * Math.PI * 2 + rng() * 0.5, len = R * (1.6 + rng() * 1.2), ex = x + Math.cos(a) * (R + len), ez = z + Math.sin(a) * (R + len);
        limb(gLimbs, x + Math.cos(a) * R * 0.6, g + R * 2.2, z + Math.sin(a) * R * 0.6, ex, heightAt(ex, ez) - 0.3, ez, R * 0.32, bark);
      }
      // seams of light up the bark
      const ns = 4 + Math.floor(rng() * 4);
      for (let k = 0; k < ns; k++) {
        const a = rng() * Math.PI * 2, y0 = g + 1 + rng() * h * 0.5, len = 3 + rng() * h * 0.35, rr = R * (1 - 0.28 * ((y0 + len / 2 - g) / h)) * 0.99;
        seams.put(x + Math.cos(a) * rr, y0 + len / 2, z + Math.sin(a) * rr, 0.16, len, 0.16, 0, -a, (rng() - 0.5) * 0.12, glowCol());
        for (let b = 0; b < 3; b++) { const by = y0 + rng() * len; beads.put(x + Math.cos(a + 0.06) * (rr + 0.05), by, z + Math.sin(a + 0.06) * (rr + 0.05), 0.12, 0.12, 0.12, 0, 0, 0, glowCol()); }
      }
      // shelf fungus, glowing, in little stairs up one side
      if (rng() < 0.7) {
        const a = rng() * Math.PI * 2, y0 = g + 1.5 + rng() * 5, n = 3 + Math.floor(rng() * 4), c = glowCol();
        for (let k = 0; k < n; k++) { const aa = a + (rng() - 0.5) * 0.6, yy = y0 + k * (0.7 + rng() * 0.5), rr = R * (1 - 0.28 * (yy - g) / h); shelves.put(x + Math.cos(aa) * rr, yy, z + Math.sin(aa) * rr, 0.5 + rng() * 0.5, 1, 0.5 + rng() * 0.5, 0, -aa + Math.PI / 2, 0, c); }
      }
      // great limbs, out and up into the roof, with beads of light along them and leaf-clouds at the ends
      const nl = 3 + Math.floor(rng() * 3);
      for (let k = 0; k < nl; k++) {
        const a = rng() * Math.PI * 2, y0 = g + h * (0.45 + rng() * 0.35), reach = 12 + rng() * 14;
        const ex = x + Math.cos(a) * reach, ez = z + Math.sin(a) * reach, ey = Math.min(ceilY(ex, ez) - 4, y0 + 6 + rng() * 10);
        const rr = R * (0.28 + rng() * 0.12);
        limb(gLimbs, x + Math.cos(a) * R * 0.5, y0, z + Math.sin(a) * R * 0.5, ex, ey, ez, rr, bark);
        const c = glowCol();
        for (let b = 1; b < 7; b++) { const t = b / 7 + (rng() - 0.5) * 0.04, bx = x + (ex - x) * t, by = y0 + (ey - y0) * t + rr * (1 - t * 0.5) + 0.1, bz = z + (ez - z) * t; beads.put(bx, by, bz, 0.16, 0.16, 0.16, 0, 0, 0, c); }
        const lc = new THREE.Color('#183a24').offsetHSL((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.05).getStyle();
        const cr = 6 + rng() * 5;
        gLeaves.put(ex, ey + 2, ez, cr, cr * 0.5, cr, rng(), rng() * 6, rng() * 0.2, lc);
        // specks of light among the leaves, and threads hanging from them
        for (let b = 0; b < 12; b++) { const u = rng() * Math.PI * 2, v = Math.sqrt(rng()); beads.put(ex + Math.cos(u) * cr * v * 0.95, ey + 2 - cr * 0.5 * Math.sqrt(1 - v * v) * 0.95 - 0.1, ez + Math.sin(u) * cr * v * 0.95, 0.13, 0.13, 0.13, 0, 0, 0, glowCol()); }
        for (let b = 0; b < 3; b++) {
          const u = rng() * Math.PI * 2, v = rng() * cr * 0.8, hx = ex + Math.cos(u) * v, hz = ez + Math.sin(u) * v, hl = 4 + rng() * 9, hy = ey + 1 - cr * 0.3;
          seams.put(hx, hy - hl / 2, hz, 0.05, hl, 0.05, 0, 0, 0, new THREE.Color('#1f4a3a'));
          beads.put(hx, hy - hl, hz, 0.22, 0.3, 0.22, 0, 0, 0, glowCol());
        }
      }
    }
    // the roof's underside, hung with leaf-clouds and their specks, so there is never a gap to see sky through
    for (let i = 0, n0 = gLeaves.mesh.count; i < 4000 && gLeaves.mesh.count < n0 + 640; i++) {
      const x = 590 + rng() * 650, z = (rng() - 0.5) * 300, pd = pathDist(x, z);
      if (pd > 120) continue;
      const cy = ceilY(x, z) - 34 * smooth(80, 150, pd), cr = 9 + rng() * 9;
      gLeaves.put(x, cy - cr * 0.15, z, cr, cr * 0.45, cr, rng(), rng() * 6, 0, new THREE.Color('#14301e').offsetHSL(0, 0, (rng() - 0.5) * 0.05).getStyle());
      if (pd < 50) for (let b = 0; b < 8; b++) { const u = rng() * Math.PI * 2, v = Math.sqrt(rng()); beads.put(x + Math.cos(u) * cr * v * 0.9, cy - cr * 0.15 - cr * 0.45 * Math.sqrt(1 - v * v) * 0.92, z + Math.sin(u) * cr * v * 0.9, 0.15, 0.15, 0.15, 0, 0, 0, glowCol()); }
    }
    // the floor: mossy stones that glow, toadstools in rings and clusters, pools of glowing moss
    for (let i = 0; i < 6000 && mossCaps.mesh.count < 160; i++) {
      const x = 600 + rng() * 640, z = (rng() - 0.5) * 120, pd = pathDist(x, z);
      if (pd < 4.5 || pd > 40 || Math.abs(x - BROOK_X(z)) < 4 || giants.some(gt => Math.hypot(gt.x - x, gt.z - z) < gt.R + 2)) continue;
      const g = heightAt(x, z), s = 0.6 + Math.pow(rng(), 2) * 2.6, ry = rng() * 6;
      rocks.put(x, g + s * 0.3, z, s * 1.2, s * 0.8, s, 0, ry, 0, pick(['#5a5a54', '#4e504a', '#62605a']));
      mossCaps.put(x, g + s * 0.3 + s * 0.6, z, s * 1.0, s * 0.26, s * 0.86, (rng() - 0.5) * 0.3, ry, (rng() - 0.5) * 0.3, new THREE.Color(pick(['#2ad890', '#3ae8a8', '#5af0c8', '#4ac8e8'])).multiplyScalar(0.3 + rng() * 0.22));
      col.add(x, z, s * 0.95, s * 0.85, ry, g - 1, g + s * 0.95);
    }
    for (let i = 0; i < 9000 && caps.mesh.count < 2300; i++) {
      const x = 600 + rng() * 640, z = (rng() - 0.5) * 140, pd = pathDist(x, z);
      if (pd < 3.2 || pd > 50 || Math.abs(x - BROOK_X(z)) < 3.5) continue;
      const g = heightAt(x, z), c = glowCol(), n = 2 + Math.floor(rng() * 6), ring = rng() < 0.15;
      for (let k = 0; k < n; k++) {
        const a = ring ? k / n * Math.PI * 2 : rng() * Math.PI * 2, d = ring ? 1.6 : rng() * 0.9, sx = x + Math.cos(a) * d, sz = z + Math.sin(a) * d, s = 0.4 + rng() * (rng() < 0.1 ? 1.6 : 0.7);
        stems.put(sx, g + s * 0.3, sz, s, s * 0.6, s, 0, 0, 0, '#e0d8c8');
        caps.put(sx, g + s * 0.58, sz, s * 0.36, s * 0.26, s * 0.36, 0, 0, 0, c);
      }
    }
    for (const k of [gTrunks, gLimbs, gLeaves, seams, beads, shelves, mossCaps, floorGlow, stems, caps]) k.done();
  }
  /* ---------------- the colossi ----------------
     Two trees out of the old world, eight times the height of the deepwood's giants: trunks you
     could stand a manor inside, buttress roots that run out over the land like ridges of hill (you
     can walk up them), limbs reaching out a hundred and fifty metres and more, and a roof of leaves
     the size of a village hanging in the sky. Ropes of vine fall from it all the way down — Brindle
     can swing from those — and at night the wood's own light comes up in them, as in the deepwood. */
  const colGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true }); colGlowMat.color.setScalar(0.16);   // scaled with the dark in update()
  const colHalos = [];
  const colMists = [];
  const colossi = [];
  {
    const barkMat = toon(0xffffff, { vertexColors: true });
    const cLeaves = new Kit(scene, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), 1100, false);
    const cVines = new Kit(scene, new THREE.CylinderGeometry(1, 0.6, 1, 5, 1, true), toon(0xffffff), 2600, false);
    const cSeams = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), colGlowMat, 1800, false);
    const cBeads = new Kit(scene, new THREE.OctahedronGeometry(1, 0), colGlowMat, 15000, false);
    const cShelves = new Kit(scene, shelfG, colGlowMat, 420, false);
    const cCaps = new Kit(scene, new THREE.SphereGeometry(1, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), colGlowMat, 1600, false);
    const cStems = new Kit(scene, new THREE.CylinderGeometry(0.08, 0.11, 1, 5), toon(0xe8e0d0), 1600, false);
    const cPads = new Kit(scene, new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2), colGlowMat, 300, false);
    const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), XR = new THREE.Vector3(1, 0, 0), cc = new THREE.Color();
    /* sweep a tube along a centreline: rad(t, a) gives [half-width, half-height] of the section */
    function sweep(M, pts, S, rad, colAt, ref = UP) {
      const base = M.p.length / 3, n = pts.length;
      for (let k = 0; k < n; k++) {
        const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)];
        T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
        N.crossVectors(T, Math.abs(T.dot(ref)) > 0.97 ? XR : ref).normalize(); B.crossVectors(N, T).normalize();
        const t = k / (n - 1);
        for (let s = 0; s <= S; s++) {
          const an = s / S * Math.PI * 2, [ra, rb] = rad(t, an, k), ca = Math.cos(an), sa = Math.sin(an);
          const x = pts[k][0] + N.x * ca * ra + B.x * sa * rb, y = pts[k][1] + N.y * ca * ra + B.y * sa * rb, z = pts[k][2] + N.z * ca * ra + B.z * sa * rb;
          M.p.push(x, y, z); colAt(t, an, x, y, z, sa, cc); M.c.push(cc.r, cc.g, cc.b);
        }
      }
      for (let k = 0; k < n - 1; k++) for (let s = 0; s < S; s++) { const i0 = base + k * (S + 1) + s, i1 = i0 + S + 1; M.i.push(i0, i1, i0 + 1, i0 + 1, i1, i1 + 1); }
    }
    const airC = new THREE.Color('#9ab8cc');   // a little of the sky's own blue in them: they are a long way off, and very tall
    const barkA = new THREE.Color('#4e3e30'), barkB = new THREE.Color('#6e5a46'), barkD = new THREE.Color('#2e241c'), mossC = new THREE.Color('#4e7a36'), mossB = new THREE.Color('#6a8e40'), lichen = new THREE.Color('#8a9478');
    for (const C of COLOSSI) {
      const R = mulberry32(C.seed), rp = a => a[Math.floor(R() * a.length)];
      const { x: cx, z: cz, H, R: TR } = C, g0 = heightAt(cx, cz);
      const M = { p: [], c: [], i: [] };
      const glowC = () => new THREE.Color(rp(C.glow)).multiplyScalar(0.55 + R() * 0.2);
      const nRoots = 9, rootA = [];
      for (let k = 0; k < nRoots; k++) rootA.push(k / nRoots * Math.PI * 2 + (R() - 0.5) * 0.45);
      const lobe = phi => { let m = 0; for (const a of rootA) m = Math.max(m, Math.pow(Math.max(0, Math.cos(phi - a)), 5)); return 0.3 + 0.7 * m; };
      const leanX = Math.cos(C.lean * 3) * TR * 0.7, leanZ = Math.sin(C.lean * 3) * TR * 0.7;
      const trunkAt = y => { const t = clamp((y - g0) / H, 0, 1), k = Math.sin(t * Math.PI * 0.85); return [cx + leanX * k, cz + leanZ * k]; };
      const trunkR = (t, phi) => {
        const y = t * H;
        const core = TR * (1 - 0.66 * Math.pow(t, 0.7));
        const flare = TR * 1.25 * Math.exp(-Math.max(0, y - 4) / (TR * 0.95)) * lobe(phi);
        return (core + flare) * (1 + 0.075 * Math.sin(9 * phi + t * 16) + 0.035 * Math.sin(23 * phi - t * 40));
      };
      C.g = g0; C.trunkR = trunkR; C.trunkAt = trunkAt;
      /* the trunk */
      {
        const pts = [], NK = 70;
        for (let k = 0; k < NK; k++) { const t = Math.pow(k / (NK - 1), 1.5), y = g0 - 8 + t * (H + 8), [px, pz] = trunkAt(y); pts.push([px, y, pz]); }
        sweep(M, pts, 64, (t, an, k) => { const r = trunkR(clamp((pts[k][1] - g0) / H, 0, 1), an - Math.PI / 2); return [r, r]; }, (t, an, x, y, z, sa, out) => {
          const phi = an - Math.PI / 2, rel = y - g0, ridge = Math.sin(9 * phi + (rel / H) * 16);
          out.copy(barkA).lerp(barkB, smooth(0.2, 0.9, ridge) * 0.7).lerp(barkD, smooth(-0.3, -0.9, ridge) * 0.8);
          out.lerp(lichen, smooth(0.62, 0.8, fbm(x * 0.05 + y * 0.03, z * 0.05, 2)) * 0.5);
          out.lerp(mossC, smooth(30, 2, rel) * 0.75 * (0.6 + 0.4 * fbm(x * 0.1, z * 0.1 + y * 0.05, 2)));
          out.lerp(mossB, smooth(0.66, 0.78, fbm(x * 0.03 - y * 0.02, z * 0.03 + 5, 2)) * smooth(H * 0.3, H * 0.15, rel) * 0.7);
        }, XR);
      }
      // colliders round the trunk: three turned squares per band make a twelve-sided pillar
      for (const [y0, y1] of [[-2, 8], [8, 20], [20, 45], [45, 90], [90, H]]) {
        let r = 0; for (let k = 0; k < 24; k++) r = Math.max(r, trunkR(clamp((y0 + y1) / 2 / H, 0, 1), k / 24 * Math.PI * 2));
        const [px, pz] = trunkAt(g0 + (y0 + y1) / 2);
        for (let k = 0; k < 3; k++) col.add(px, pz, r * 0.86, r * 0.86, k * Math.PI / 6, g0 + y0 - 1, g0 + y1);
      }
      /* buttress roots: fins of wood running out over the hill, and down into the lake on the Elder's side */
      const rootTops = [];
      for (let j = 0; j < nRoots; j++) {
        const phi = rootA[j], L = TR * (2.6 + R() * 1.4), wig = (R() - 0.5) * 0.5, ph = R() * 6, Htop = TR * (1.35 + R() * 0.4);
        const make = (ox, oz, oy, dir, len, htop, w0, sub) => {
          const pts = [], tops = [], NK = Math.max(10, Math.round(len / 2.2));
          for (let k = 0; k < NK; k++) {
            const s = k / (NK - 1), d = s * len, w = Math.sin(s * Math.PI * 1.3 + ph) * len * 0.07 * s + wig * d * d / len * 0.4;
            const x = ox + Math.cos(dir) * d - Math.sin(dir) * w, z = oz + Math.sin(dir) * d + Math.cos(dir) * w;
            const gd = heightAt(x, z), top = Math.max(gd + 0.3, (sub ? oy : gd) + htop * Math.pow(1 - s, sub ? 1.4 : 2.1) + 0.3);
            const rb = (top - gd) * 0.5 + 2, ra = lerp(w0, 1.3, Math.pow(s, 0.65));
            pts.push([x, top - rb, z]); tops.push([x, z, top, ra, rb, gd]);
          }
          sweep(M, pts, 14, (t, an, k) => [tops[k][3], tops[k][4]], (t, an, x, y, z, sa, out) => {
            out.copy(barkA).lerp(barkB, 0.3 + 0.3 * Math.sin(an * 3 + t * 9)).lerp(barkD, smooth(0, -0.8, sa) * 0.6);
            out.lerp(mossC, smooth(0.2, 0.9, sa) * (0.55 + 0.35 * fbm(x * 0.08, z * 0.08, 2)));   // moss on the upper faces
            out.lerp(mossB, smooth(0.55, 0.7, fbm(x * 0.04 + 3, z * 0.04, 2)) * smooth(0.3, 0.9, sa) * 0.6);
          });
          // walk-up colliders along the crest
          for (let k = 1; k < tops.length; k++) {
            const [x0, z0, t0, ra0] = tops[k - 1], [x1, z1, t1, ra1] = tops[k], len2 = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
            const ns = Math.max(1, Math.ceil(len2 / 0.75)), bot = Math.min(tops[k][5], tops[k - 1][5]) - 1;   // short pieces, so each is a step you can take
            for (let q = 0; q < ns; q++) { const f = (q + 0.5) / ns; col.add(lerp(x0, x1, f), lerp(z0, z1, f), lerp(ra0, ra1, f) * 0.78, len2 / ns / 2 + 0.15, ang, bot, lerp(t0, t1, f)); }
          }
          return tops;
        };
        const sx = cx + Math.cos(phi) * TR * 0.3, sz = cz + Math.sin(phi) * TR * 0.3;
        const tops = make(sx, sz, g0, phi, L + TR * 0.7, Htop, TR * 0.42, false);
        rootTops.push(tops);
        // a fork near the end
        const fk = tops[Math.floor(tops.length * (0.45 + R() * 0.15))], side = R() < 0.5 ? -1 : 1;
        make(fk[0], fk[1], fk[5], phi + side * (0.5 + R() * 0.4), L * (0.35 + R() * 0.2), (fk[2] - fk[5]) * 0.8, fk[3] * 0.7, true);
      }
      /* great limbs, and branches off them, and the roof of leaves */
      const nLimbs = 9, limbs = [];
      for (let i = 0; i < nLimbs; i++) {
        const phi = rootA[i % nRoots] + Math.PI / nRoots + (R() - 0.5) * 0.4 + i * 0.18, f = i / (nLimbs - 1);
        const y0 = g0 + H * (0.38 + 0.4 * ((i * 4) % nLimbs) / (nLimbs - 1)) + (R() - 0.5) * 10;
        const reach = (175 - ((y0 - g0) / H) * 80) * (H / 380) * (0.85 + R() * 0.3), rise = reach * (0.42 + R() * 0.2);
        const [ox, oz] = trunkAt(y0), pts = [], NK = 26, droop = 0.12 + R() * 0.1;
        for (let k = 0; k < NK; k++) {
          const s = k / (NK - 1), d = s * reach, w = Math.sin(s * Math.PI * 1.6 + i) * reach * 0.08;
          pts.push([ox + Math.cos(phi) * d - Math.sin(phi) * w, y0 + rise * (s * 1.5 - s * s * (0.5 + droop)) , oz + Math.sin(phi) * d + Math.cos(phi) * w]);
        }
        const r0 = TR * 0.4;
        sweep(M, pts, 16, t => { const r = r0 * (1 - 0.8 * Math.pow(t, 0.8)) + 0.5 + (t < 0.08 ? r0 * 0.6 * (1 - t / 0.08) : 0); return [r, r]; }, (t, an, x, y, z, sa, out) => {
          out.copy(barkA).lerp(barkB, 0.35 + 0.3 * Math.sin(an * 5 + t * 20)).lerp(barkD, smooth(0, -0.9, sa) * 0.55);
          out.lerp(mossC, smooth(0.45, 0.95, sa) * 0.6);
        });
        limbs.push({ pts, phi, r0 });
      }
      // the crown: the trunk's own top, splitting into a few leaders
      {
        const [tx, tz] = trunkAt(g0 + H * 0.88);
        for (let k = 0; k < 4; k++) {
          const a = k / 4 * Math.PI * 2 + R(), y0 = g0 + H * (0.8 + R() * 0.06), pts = [];
          for (let q = 0; q < 12; q++) { const s = q / 11; pts.push([tx + Math.cos(a) * s * 60 * H / 380, y0 + s * (H * 0.2), tz + Math.sin(a) * s * 60 * H / 380]); }
          sweep(M, pts, 12, t => { const r = TR * 0.22 * (1 - 0.85 * t) + 0.4; return [r, r]; }, (t, an, x, y, z, sa, out) => out.copy(barkA).lerp(barkB, 0.4).lerp(mossC, smooth(0.5, 1, sa) * 0.5));
          limbs.push({ pts, phi: a, r0: TR * 0.22, crown: true });
        }
      }
      const clumps = [];
      const SC = H / 380;
      const clump = (x, y, z, r) => {
        r *= SC;
        const lc = new THREE.Color(rp(C.leaf)).offsetHSL((R() - 0.5) * 0.03, 0, (R() - 0.5) * 0.05).lerp(airC, 0.16 + 0.1 * (y - g0) / H);
        cLeaves.put(x, y, z, r, r * 0.5, r, R() * 0.3, R() * 6, R() * 0.3, lc);
        // the sunlit top of it, a lighter tuft
        const r2 = r * (0.55 + R() * 0.2), tc = new THREE.Color(rp(C.tip)).offsetHSL((R() - 0.5) * 0.03, 0, (R() - 0.5) * 0.05).lerp(airC, 0.14 + 0.1 * (y - g0) / H);
        cLeaves.put(x + (R() - 0.5) * r * 0.4, y + r * 0.3, z + (R() - 0.5) * r * 0.4, r2, r2 * 0.5, r2, R() * 0.3, R() * 6, 0, tc);
        clumps.push([x, y, z, r]);
      };
      for (const Lb of limbs) {
        const { pts } = Lb, n = pts.length;
        const subs = Lb.crown ? 2 : 4;
        for (let b = 0; b < subs; b++) {
          const k0 = Math.floor(n * (0.3 + 0.6 * (b + R() * 0.6) / subs)), [ax, ay, az] = pts[Math.min(n - 1, k0)], s0 = k0 / (n - 1);
          const dir = Lb.phi + (b % 2 ? 1 : -1) * (0.55 + R() * 0.45), reach = (Lb.crown ? 40 : 34 + R() * 34) * (H / 380), rise = reach * (0.3 + R() * 0.35);
          const bp = []; for (let q = 0; q < 9; q++) { const s = q / 8; bp.push([ax + Math.cos(dir) * s * reach, ay + rise * (s * 1.4 - s * s * 0.4), az + Math.sin(dir) * s * reach]); }
          const rr = Lb.r0 * (1 - 0.8 * s0) * 0.55 + 0.4;
          sweep(M, bp, 8, t => { const r = rr * (1 - 0.8 * t) + 0.3; return [r, r]; }, (t, an, x, y, z, sa, out) => out.copy(barkA).lerp(barkB, 0.45).lerp(mossC, smooth(0.5, 1, sa) * 0.45));
          const [ex, ey, ez] = bp[8];
          clump(ex, ey + 6, ez, 22 + R() * 14);
          for (let q = 0; q < 2; q++) clump(ex + (R() - 0.5) * 40, ey + (R() - 0.3) * 14, ez + (R() - 0.5) * 40, 15 + R() * 12);
        }
        const [ex, ey, ez] = pts[n - 1];
        clump(ex, ey + 8, ez, 28 + R() * 14);
        for (let q = 0; q < 3; q++) clump(ex + (R() - 0.5) * 50, ey + (R() - 0.5) * 16, ez + (R() - 0.5) * 50, 16 + R() * 14);
        // along the limb too, so the roof is one roof and not a ring of islands
        for (let q = 0; q < 3; q++) { const [mx, my, mz] = pts[Math.floor(n * (0.45 + q * 0.17))]; clump(mx + (R() - 0.5) * 20, my + 14 + R() * 8, mz + (R() - 0.5) * 20, 18 + R() * 12); }
      }
      { const [tx, tz] = trunkAt(g0 + H); for (let q = 0; q < 8; q++) { const a = q / 8 * Math.PI * 2, d = (q ? 35 + R() * 20 : 0) * SC; clump(tx + Math.cos(a) * d, g0 + H - 6 + R() * 12 - d * 0.2, tz + Math.sin(a) * d, 30 + R() * 14); } }
      /* vines: curtains of them from the leaves, and long ropes off the lower limbs that Brindle can catch */
      for (const [x, y, z, r] of clumps) for (let b = 0; b < 3; b++) {
        const u = R() * Math.PI * 2, v = Math.sqrt(R()) * r * 0.8, hx = x + Math.cos(u) * v, hz = z + Math.sin(u) * v, top = y - r * 0.3, len = 18 + R() * 70;
        cVines.put(hx, top - len / 2, hz, 0.3, len, 0.3, 0, R() * 6, 0, new THREE.Color('#2a4a30').offsetHSL(0, 0, (R() - 0.5) * 0.06));
      }
      let ropes = 0;
      for (const Lb of limbs) {
        if (Lb.crown) continue;
        for (let k = 5; k < Lb.pts.length; k += 3) {
          const [lx, ly, lz] = Lb.pts[k], hx = lx + (R() - 0.5) * 6, hz = lz + (R() - 0.5) * 6, gd = heightAt(hx, hz);
          if (gd < WATER_LEVEL + 0.5) continue;
          const end = gd + 23 + R() * 5, len = ly - end;
          if (len < 20) continue;
          cVines.put(hx, end + len / 2, hz, 0.55, len, 0.55, 0, R() * 6, 0, '#2e5236');
          cVines.put(hx + 0.6, end + len / 2 + 6, hz + 0.4, 0.3, len - 12, 0.3, 0, R() * 6, 0, '#3a6040');
          cBeads.put(hx, end - 0.6, hz, 1.1, 1.6, 1.1, 0, 0, 0, glowC());
          for (let q = 1; q < 6; q++) cBeads.put(hx, end + len * q / 6, hz, 0.5, 0.5, 0.5, 0, 0, 0, glowC());
          trees.push({ x: hx, z: hz, g: gd, h: (end - gd) / 0.95, r: 0 });   // Brindle swings from the ropes of the old trees
          ropes++;
        }
      }
      // and the bark itself: latch points round the trunk, a good way up
      for (let k = 0; k < 14; k++) {
        const a = k / 14 * Math.PI * 2, y = 26, rr = trunkR(y / H, a) + 0.5, [px, pz] = trunkAt(g0 + y), gx = px + Math.cos(a) * rr, gz = pz + Math.sin(a) * rr;
        trees.push({ x: gx, z: gz, g: g0, h: 29.5, r: 0 });
      }
      /* the light: seams up the furrows, beads along them, shelf fungus in stairs, glowing pools among the roots */
      for (let k = 0; k < 14; k++) {
        let phi = R() * Math.PI * 2, y = 3 + R() * 30;
        const top = y + 40 + R() * H * 0.45, gc = glowC();
        while (y < top) {
          const t = y / H, len = 7;
          // follow the furrow: nudge phi to the nearest valley of the ridges
          const v0 = Math.round((9 * phi + t * 16 + Math.PI / 2) / (Math.PI * 2)) * Math.PI * 2 - Math.PI / 2;
          const ph2 = (v0 - t * 16) / 9, rr = trunkR(t, ph2) - 0.15, [px, pz] = trunkAt(g0 + y + len / 2);
          cSeams.put(px + Math.cos(ph2) * rr, g0 + y + len / 2, pz + Math.sin(ph2) * rr, 0.5, len + 0.3, 0.5, 0, -ph2, 0, gc);
          if (R() < 0.7) cBeads.put(px + Math.cos(ph2 + 0.012) * (rr + 0.3), g0 + y + R() * len, pz + Math.sin(ph2 + 0.012) * (rr + 0.3), 0.4, 0.4, 0.4, 0, 0, 0, gc);
          phi = ph2 + 0.02; y += len;
        }
      }
      for (let k = 0; k < 11; k++) {
        const a = R() * Math.PI * 2, y0 = 4 + R() * 60, n = 3 + Math.floor(R() * 5), gc = glowC();
        for (let q = 0; q < n; q++) {
          const aa = a + (R() - 0.5) * 0.25, yy = y0 + q * (2.4 + R() * 1.6), rr = trunkR(yy / H, aa) - 0.3, [px, pz] = trunkAt(g0 + yy), s = 2.2 + R() * 2.6;
          cShelves.put(px + Math.cos(aa) * rr, g0 + yy, pz + Math.sin(aa) * rr, s, 2.2, s, 0, -aa + Math.PI / 2, 0, gc);
        }
      }
      // toadstools and glowing moss in the hollows between the roots
      for (let q = 0; q < 700 && cCaps.mesh.count < (colossi.length + 1) * 600; q++) {
        const a = R() * Math.PI * 2, d = TR * (1.9 + R() * 2.4), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, gd = heightAt(x, z);
        if (gd < WATER_LEVEL + 0.4) continue;
        const gc = glowC(), n = 2 + Math.floor(R() * 6), ring = R() < 0.2;
        for (let k = 0; k < n; k++) {
          const aa = ring ? k / n * Math.PI * 2 : R() * Math.PI * 2, dd = ring ? 2 : R() * 1.2, sx = x + Math.cos(aa) * dd, sz = z + Math.sin(aa) * dd, s = 0.6 + R() * (R() < 0.15 ? 3.2 : 1);
          cStems.put(sx, gd + s * 0.3, sz, s, s * 0.6, s, 0, 0, 0, '#e0d8c8');
          cCaps.put(sx, gd + s * 0.58, sz, s * 0.38, s * 0.26, s * 0.38, 0, 0, 0, gc);
        }
      }
      /* bake it: high up, the bark takes on the blue of the air between */
      for (let i = 0; i < M.c.length; i += 3) { const k = clamp((M.p[i + 1] - g0) / H, 0, 1) * 0.3; M.c[i] += (airC.r - M.c[i]) * k; M.c[i + 1] += (airC.g - M.c[i + 1]) * k; M.c[i + 2] += (airC.b - M.c[i + 2]) * k; }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(M.p, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(M.c, 3)); geo.setIndex(M.i);
      geo.computeVertexNormals(); geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, barkMat); mesh.castShadow = false; mesh.receiveShadow = true; scene.add(mesh);   // too big for the sun's shadow map: it would only cost
      addOutline(mesh, 0.22);
      // banks of mist caught round the trunk and under the roof of leaves: you can tell how tall it is by the weather it wears
      const mists = [];
      for (let k = 0; k < 9; k++) {
        const a = R() * Math.PI * 2, y = g0 + H * (k < 5 ? 0.12 + R() * 0.22 : 0.5 + R() * 0.25), d = (k < 5 ? TR * (2.2 + R() * 1.5) : 60 + R() * 110) * (H / 450);
        const m = mistSprite(0xeef4f8, 150 + R() * 120, 34 + R() * 26, k < 5 ? 0.42 : 0.3); m.position.set(cx + Math.cos(a) * d, y, cz + Math.sin(a) * d); scene.add(m);
        mists.push({ m, a, d, y, sp: (R() - 0.5) * 0.02, o0: m.material.opacity });
      }
      colMists.push(...mists.map(o => Object.assign(o, { cx, cz })));
      colossi.push({ id: C.id, name: C.name, x: cx, z: cz, g: g0, H, R: TR, ropes, mesh, roots: rootTops.map(t => t.map(p => [p[0], p[1], p[2]])) });   // roots: crest lines [x, z, topY], tip last
    }
    for (const k of [cLeaves, cVines, cSeams, cBeads, cShelves, cCaps, cStems, cPads]) k.done();
  }
  // the path's own walls of trees, close and tall
  for (let i = 0; i < 26000 && trunks.mesh.count < 2400; i++) {
    const x = 500 + rng() * (EAST_END + 60 - 500), z = (rng() - 0.5) * 300;
    const pd = pathDist(x, z);
    if (pd < 7.5 || pd > 140 || rng() > treeDensity(x, z)) continue;
    if (Math.abs(x - BROOK_X(z)) < 5 || giants.some(gt => Math.hypot(gt.x - x, gt.z - z) < gt.R + 2.5)) continue;
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
  /* small-detail kits for the buildings: boxes turned in YXZ order (so a slab can pitch and then turn), cylinders,
     pyramids, gable prisms, window panes that share the windows' glow, lantern glass that lights at night */
  const prismG = (() => {
    const v = [], a = [-0.5, 0, -0.5], b = [-0.5, 0, 0.5], cpt = [-0.5, 1, 0], A = [0.5, 0, -0.5], Bq = [0.5, 0, 0.5], Cq = [0.5, 1, 0];
    for (const t of [[a, cpt, b], [A, Bq, Cq], [a, A, Cq], [a, Cq, cpt], [b, cpt, Cq], [b, Cq, Bq], [a, b, Bq], [a, Bq, A]]) for (const p of t) v.push(...p);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
  })();
  const pBox = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 9000);
  const pCyl = new Kit(scene, new THREE.CylinderGeometry(1, 1, 1, 10), toon(0xffffff), 4200);
  const pPyr = new Kit(scene, new THREE.ConeGeometry(1, 1, 4, 1, false, Math.PI / 4), toon(0xffffff), 300);
  const pCone = new Kit(scene, new THREE.ConeGeometry(1, 1, 10), toon(0xffffff), 900);
  const pPrism = new Kit(scene, prismG, toon(0xffffff), 500);
  const pPane = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), winMat, 1400, false);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true }); lampMat.color.setScalar(0.45);
  const pLamp = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), lampMat, 400, false);
  const pGlass = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: ramp(), transparent: true, opacity: 0.32, depthWrite: false }), 300, false);
  const pDome = new Kit(scene, new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffffff), 300);
  const lampGlows = [];
  const E2 = new THREE.Euler(0, 0, 0, 'YXZ'), Q2 = new THREE.Quaternion(), M2 = new THREE.Matrix4(), S2 = new THREE.Vector3(), P2 = new THREE.Vector3(), C2 = new THREE.Color();
  function put2(kit, x, y, z, sx, sy, sz, rx, ry, rz, color) {
    if (kit.mesh.count >= kit.max) return -1;
    const i = kit.mesh.count++; E2.set(rx, ry, rz); Q2.setFromEuler(E2);
    M2.compose(P2.set(x, y, z), Q2, S2.set(sx, sy, sz)); kit.mesh.setMatrixAt(i, M2); kit.mesh.setColorAt(i, C2.set(color)); return i;
  }
  // a building's own frame: local x across its face, local +z out of its door
  const frame = (ox, oy, oz, rot) => ({ ox, oy, oz, rot, c: Math.cos(rot), s: Math.sin(rot) });
  const W = (F, lx, lz) => [F.ox + lx * F.c + lz * F.s, F.oz - lx * F.s + lz * F.c];
  function bp(F, kit, lx, ly, lz, sx, sy, sz, color, rx = 0, lry = 0, rz = 0) { const [x, z] = W(F, lx, lz); return put2(kit, x, F.oy + ly, z, sx, sy, sz, rx, F.rot + lry, rz, color); }
  function bc(F, lx, lz, hw, hd, y0, y1, lry = 0) { const [x, z] = W(F, lx, lz); col.add(x, z, hw, hd, F.rot + lry, F.oy + y0, F.oy + y1); }
  function lantern(x, y, z, size = 1) {   // a hanging lantern: frame, warm glass, and a glow that wakes at dusk
    put2(pBox, x, y + 0.42 * size, z, 0.5 * size, 0.1 * size, 0.5 * size, 0, 0, 0, '#3a2a1a');
    put2(pLamp, x, y, z, 0.36 * size, 0.6 * size, 0.36 * size, 0, 0, 0, '#ffc870');
    put2(pBox, x, y - 0.34 * size, z, 0.44 * size, 0.08 * size, 0.44 * size, 0, 0, 0, '#3a2a1a');
    const s = glowSprite(0xffb860, 3.4 * size, 0); s.position.set(x, y, z); scene.add(s); lampGlows.push(s);
  }
  function finishGroup(grp) {
    outlineAll(grp, 0.05);
    grp.traverse(m => { if (m.isMesh && m.name !== 'outline') { m.castShadow = true; m.receiveShadow = true; } });
    scene.add(grp);
  }
  /* a building block: walls, a roof, windows, and its collider. Door on local +z. */
  function hall(x, z, rot, w, d, h, wallC, opts = {}) {
    const g = heightAt(x, z), grp = new THREE.Group(); grp.position.set(x, g, z); grp.rotation.y = rot;
    const F = frame(x, g, z, rot);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 1.6, d + 0.8), toon(opts.footC || 0x9a8a78)); foot.position.y = -0.4; grp.add(foot);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(wallC)); wall.position.y = h / 2; grp.add(wall);
    // timber framing
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), toon(0x5a3a22)); p.position.set(sx * w / 2, h / 2, sz * d / 2); grp.add(p); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.4, d + 0.2), toon(0x5a3a22)); beam.position.y = h; grp.add(beam);
    if (opts.band) for (const by of opts.band) { bp(F, pBox, 0, by, d / 2 + 0.06, w + 0.1, 0.28, 0.14, '#5a3a22'); bp(F, pBox, 0, by, -d / 2 - 0.06, w + 0.1, 0.28, 0.14, '#5a3a22'); bp(F, pBox, w / 2 + 0.06, by, 0, 0.14, 0.28, d + 0.1, '#5a3a22'); bp(F, pBox, -w / 2 - 0.06, by, 0, 0.14, 0.28, d + 0.1, '#5a3a22'); }
    const pitch = opts.pitch || 0.62;
    if (opts.roof !== 'none') {
      if (opts.roof === 'cap') {
        const r = new THREE.Mesh(new THREE.SphereGeometry(Math.max(w, d) * 0.72, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), roofMat); r.scale.set(w / Math.max(w, d), 0.62, d / Math.max(w, d)); r.position.y = h; grp.add(r);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(Math.max(w, d) * 0.7, 0.3, 6, 26), roofMat); rim.rotation.x = Math.PI / 2; rim.scale.set(w / Math.max(w, d), d / Math.max(w, d), 1); rim.position.y = h + 0.05; grp.add(rim);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.6, 6), toon(0x4a2c18)); stem.position.y = h + Math.max(w, d) * 0.45; stem.rotation.z = 0.3; grp.add(stem);
      } else {
        // a pitched roof of two slabs, with a ridge beam and brackets under the eaves
        const half = d / 2 + 0.8, slab = half / Math.cos(pitch);
        for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.35, slab), opts.roofC ? toon(opts.roofC) : roofMat); r.rotation.x = s * pitch; r.position.set(0, h + Math.sin(pitch) * slab / 2, s * half / 2); grp.add(r); }
        const gable = new THREE.Shape(); gable.moveTo(-d / 2, 0); gable.lineTo(d / 2, 0); gable.lineTo(0, Math.tan(pitch) * d / 2); gable.lineTo(-d / 2, 0);
        for (const s of [-1, 1]) { const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), toon(opts.gableC || wallC, { side: THREE.DoubleSide })); gm.rotation.y = Math.PI / 2; gm.position.set(s * w / 2, h, 0); grp.add(gm); }
        bp(F, pBox, 0, h + Math.tan(pitch) * half + 0.1, 0, w + 1.6, 0.35, 0.45, '#4a2a14');
        for (let bx = -w / 2 + 1; bx <= w / 2 - 0.9; bx += 2.2) for (const s of [-1, 1]) bp(F, pBox, bx, h - 0.35, s * (d / 2 + 0.35), 0.22, 0.5, 0.7, '#5a3a22');
        // a round vent high in each gable
        for (const s of [-1, 1]) { bp(F, pCyl, s * (w / 2 + 0.05), h + Math.tan(pitch) * d / 2 * 0.45, 0, 0.42, 0.1, 0.42, '#4a2a14', 0, 0, Math.PI / 2); }
      }
    }
    // windows (they glow at night), all round, with shutters and boxes of flowers if the house wants them
    const nx = Math.max(1, Math.floor(w / 4)), nz = Math.max(1, Math.floor(d / 4));
    const winY = opts.winY || [h * 0.55], sh = opts.shutters, fb = opts.flowers;
    const dx0 = opts.doorX || 0, skip = opts.skip || (() => false), dw = opts.doorW || 1.6, dh = opts.doorH || 2.6;
    const decorate = (lx, ly, lz, alongX, first) => {
      bp(F, pBox, lx, ly + 0.74, lz, alongX ? 1.5 : 0.16, 0.16, alongX ? 0.16 : 1.5, '#5a3a22');
      if (sh) for (const q of [-1, 1]) bp(F, pBox, lx + (alongX ? q * 0.86 : 0), ly, lz + (alongX ? 0 : q * 0.86), alongX ? 0.56 : 0.08, 1.4, alongX ? 0.08 : 0.56, sh);
      if (fb && first) {
        const ox = alongX ? 0 : Math.sign(lx) * 0.2, oz = alongX ? Math.sign(lz) * 0.2 : 0;
        bp(F, pBox, lx + ox, ly - 0.86, lz + oz, alongX ? 1.4 : 0.36, 0.3, alongX ? 0.36 : 1.4, '#7a4e2c');
        for (let q = -1; q <= 1; q++) { const [fx, fz] = W(F, lx + ox + (alongX ? q * 0.42 : 0), lz + oz + (alongX ? 0 : q * 0.42)); tufts.put(fx, g + ly - 0.6, fz, 0.26, 0.2, 0.26, rng(), rng(), 0, pick(fb)); }
      }
    };
    winY.forEach((wy, wi) => {
      for (let i = 0; i < nx; i++) for (const s of [-1, 1]) { const wx = (i - (nx - 1) / 2) * (w / nx); if (s > 0 && !opts.noDoor && Math.abs(wx - dx0) < dw / 2 + 0.9) continue; if (skip(wx, s * d / 2, wy)) continue; const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), winMat); m.position.set(wx, wy, s * (d / 2 + 0.03)); m.rotation.y = s > 0 ? 0 : Math.PI; m.userData.noOutline = true; grp.add(m); glowWindows.push(m); decorate(wx, wy, s * (d / 2 + 0.07), true, wi === 0); }
      for (let i = 0; i < nz; i++) for (const s of [-1, 1]) { const wz = (i - (nz - 1) / 2) * (d / nz); if (skip(s * w / 2, wz, wy)) continue; const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), winMat); m.position.set(s * (w / 2 + 0.03), wy, wz); m.rotation.y = s * Math.PI / 2; m.userData.noOutline = true; grp.add(m); glowWindows.push(m); decorate(s * (w / 2 + 0.07), wy, wz, false, wi === 0); }
    });
    // the door
    if (!opts.noDoor) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(dw, dh, 0.25), toon(0x5a3018)); door.position.set(dx0, dh / 2, d / 2 + 0.06); grp.add(door);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(dw + 0.6, 0.35, 0.4), toon(0x4a2a14)); lintel.position.set(dx0, dh + 0.15, d / 2 + 0.1); grp.add(lintel);
      for (const q of [-1, 1]) bp(F, pBox, dx0 + q * (dw / 2 + 0.15), dh / 2, d / 2 + 0.12, 0.25, dh, 0.3, '#4a2a14');
      for (let q = 0; q < Math.max(2, Math.round(dw / 0.7)); q++) bp(F, pBox, dx0 - dw / 2 + 0.3 + q * (dw - 0.6) / Math.max(1, Math.round(dw / 0.7) - 1), dh / 2, d / 2 + 0.2, 0.06, dh - 0.3, 0.04, '#3a2010');
      bp(F, pBox, dx0, 0.12, d / 2 + 0.75, dw + 1.2, 0.24, 1.0, '#9a8a78');   // a stone step
      lantern(...(() => { const [lx, lz] = W(F, dx0 + dw / 2 + 0.6, d / 2 + 0.45); return [lx, g + dh + 0.1, lz]; })(), 0.9);
    }
    finishGroup(grp);
    col.add(x, z, w / 2, d / 2, rot, g - 2, g + h + 3);
    const lz = d / 2 + 1.0;
    return { grp, g, F, door: { x: x + Math.cos(rot) * dx0 + Math.sin(rot) * lz, z: z - Math.sin(rot) * dx0 + Math.cos(rot) * lz, yaw: rot } };
  }
  function addDoor(d, id, name, kind, extra) { const o = { id, name, kind, x: d.x, z: d.z, yaw: d.yaw }; doors.push(Object.assign(o, extra || {})); return o; }
  const WOOD_TONES = ['#c8a070', '#b8905a', '#d8b080', '#a87848'];
  const FLOWERS = ['#e85a6a', '#f2d24a', '#ffffff', '#c87ae8', '#ff9a4a', '#ff8ac8'];
  const chimneys = [];
  function chimney(x, z, y0, y1, c = '#9a8a78') {   // a stone stack with a cap and two pots, and smoke from it
    put2(pBox, x, (y0 + y1) / 2, z, 1.6, y1 - y0, 1.6, 0, 0, 0, c);
    put2(pBox, x, y1 + 0.15, z, 2.0, 0.3, 2.0, 0, 0, 0, '#7a6a5a');
    for (const q of [-1, 1]) put2(pCyl, x + q * 0.4, y1 + 0.6, z, 0.25, 0.7, 0.25, 0, 0, 0, '#a8603a');
    chimneys.push([x, y1 + 1, z]);
  }

  // the big house: a rich family's house, and it shows without a word said. It faces east, up the slope toward the drive
  const ROT_E = Math.PI / 2;
  const houseG = heightAt(HOUSE.x, HOUSE.z);
  {
    const main = hall(HOUSE.x, HOUSE.z, ROT_E, 26, 16, 8.5, '#efe0c0', { roof: 'pitch', roofC: 0x6a3a22, winY: [2.6, 6.2], doorW: 2.2, doorH: 3.2, shutters: '#3a6a7a', flowers: FLOWERS, band: [4.4],
      skip: (wx, wz, wy) => wz < 0 && Math.abs(Math.abs(wx) - 7) < 2.3 && wy < 4 });   // the bay windows stand where those would be
    addDoor(main.door, 'p_house', 'The Big House', 'manor');
    hall(HOUSE.x - 2, HOUSE.z - 19, ROT_E, 14, 12, 6.5, '#e8d4b0', { roof: 'cap', winY: [2.6], noDoor: true, shutters: '#3a6a7a', flowers: FLOWERS });               // north wing
    hall(HOUSE.x - 2, HOUSE.z + 19, ROT_E, 14, 12, 6.5, '#e8d4b0', { roof: 'cap', winY: [2.6], noDoor: true, shutters: '#3a6a7a', flowers: FLOWERS });               // south wing
    const F = main.F, g = main.g;
    // the porch: columns and steps up to the door, a balcony on its roof, a pediment over the steps
    for (let k = 0; k < 6; k++) { const pz = HOUSE.z - 7 + k * 2.8, px = HOUSE.x + 11; blocks.put(px, g + 2.4, pz, 0.6, 4.8, 0.6, 0, 0, 0, '#f4ead4'); put2(pBox, px, g + 0.25, pz, 0.9, 0.5, 0.9, 0, 0, 0, '#d8ccb4'); put2(pBox, px, g + 4.65, pz, 0.85, 0.3, 0.85, 0, 0, 0, '#d8ccb4'); col.add(px, pz, 0.3, 0.3, 0, g - 1, g + 4.8); }
    blocks.put(HOUSE.x + 10, g + 4.9, HOUSE.z, 3.6, 0.4, 16, 0, 0, 0, '#6a3a22');
    blocks.put(HOUSE.x + 10.2, g + 0.15, HOUSE.z, 3.6, 0.3, 16, 0, 0, 0, '#c8b8a0'); col.add(HOUSE.x + 10.2, HOUSE.z, 1.8, 8, 0, g - 1, g + 0.3);
    for (let k = 0; k < 2; k++) { put2(pBox, HOUSE.x + 12.4 + k * 0.7, g + 0.1 - k * 0.1, HOUSE.z, 0.7, 0.2, 5.2 - k * 0.6, 0, 0, 0, '#c8b8a0'); }
    // the balcony over the porch, off the upstairs
    for (let k = 0; k <= 16; k++) if (Math.abs(k - 8) > 3) put2(pBox, HOUSE.x + 11.6, g + 5.55, HOUSE.z - 8 + k, 0.12, 0.9, 0.12, 0, 0, 0, '#f4ead4');
    put2(pBox, HOUSE.x + 11.6, g + 6.05, HOUSE.z, 0.22, 0.14, 16.2, 0, 0, 0, '#6a4428');
    for (const s of [-1, 1]) put2(pBox, HOUSE.x + 10, g + 6.05, HOUSE.z + s * 8, 3.4, 0.14, 0.22, 0, 0, 0, '#6a4428');
    put2(pPrism, HOUSE.x + 11.2, g + 5.1, HOUSE.z, 6.4, 2.2, 1.4, 0, Math.PI / 2, 0, '#6a3a22');   // the pediment
    put2(pPrism, HOUSE.x + 11.5, g + 5.25, HOUSE.z, 5.2, 1.6, 0.4, 0, Math.PI / 2, 0, '#f4ead4');
    put2(pCyl, HOUSE.x + 11.75, g + 5.85, HOUSE.z, 0.45, 0.08, 0.45, 0, 0, Math.PI / 2, '#c8a040');   // the house's seal, in the pediment
    // the back terrace looking at the lake, with its rail and a table
    blocks.put(HOUSE.x - 10.5, g + 0.2, HOUSE.z, 5, 0.4, 22, 0, 0, 0, '#c8b8a0'); col.add(HOUSE.x - 10.5, HOUSE.z, 2.5, 11, 0, g - 1, g + 0.4);
    for (let k = 0; k < 8; k++) blocks.put(HOUSE.x - 12.8, g + 0.9, HOUSE.z - 10 + k * 2.85, 0.2, 1.1, 0.2, 0, 0, 0, '#6a4428');
    put2(pBox, HOUSE.x - 12.8, g + 1.45, HOUSE.z, 0.2, 0.12, 20, 0, 0, 0, '#6a4428');
    put2(pCyl, HOUSE.x - 10.5, g + 1.2, HOUSE.z + 6, 0.9, 0.08, 0.9, 0, 0, 0, '#8a5a36'); put2(pCyl, HOUSE.x - 10.5, g + 0.8, HOUSE.z + 6, 0.1, 0.8, 0.1, 0, 0, 0, '#5a3a22');
    for (const q of [-1, 1]) put2(pBox, HOUSE.x - 10.5 + q * 1.3, g + 0.85, HOUSE.z + 6, 0.5, 0.08, 0.5, 0, 0, 0, '#7a4e2c');
    // bay windows on the lake side, two storeys of glass with little roofs
    for (const q of [-1, 1]) {
      bp(F, pBox, q * 7, 2.4, -8.8, 4.2, 4.8, 1.8, '#efe0c0'); bc(F, q * 7, -8.8, 2.1, 0.9, -1, 4.8);
      bp(F, pBox, q * 7, 0.2, -8.85, 4.6, 0.4, 2.0, '#9a8a78');
      for (const [lx, lz, sx, sz] of [[q * 7, -9.72, 2.8, 0.06], [q * 7 - 2.13, -8.8, 0.06, 1.0], [q * 7 + 2.13, -8.8, 0.06, 1.0]]) { bp(F, pPane, lx, 2.5, lz, sx, 1.9, sz, '#ffffff'); bp(F, pBox, lx, 2.5, lz + (sz < 0.1 ? -0.02 : 0), sz < 0.1 ? sx : 0.08, 0.1, sz < 0.1 ? 0.08 : sz, '#5a3a22'); }
      bp(F, pPyr, q * 7, 5.4, -8.6, 3.4, 1.3, 1.85, '#6a3a22');
    }
    // dormers in the roof, front and back
    for (const s of [-1, 1]) for (const lx of [-8.5, 0, 8.5]) {
      if (s > 0 && lx === 0) continue;
      const lz = s * 4.2, y = 8.5 + (8 - 4.2) * Math.tan(0.62);
      bp(F, pBox, lx, y + 0.6, lz, 2.4, 2.6, 2.6, '#efe0c0');
      bp(F, pPrism, lx, y + 1.9, lz + s * 0.2, 3.0, 1.3, 3.4, '#6a3a22', 0, Math.PI / 2);
      bp(F, pPane, lx, y + 0.7, lz + s * 1.32, 1.1, 1.3, 0.05, '#ffffff');
      bp(F, pBox, lx, y + 0.7, lz + s * 1.34, 0.08, 1.4, 0.06, '#5a3a22'); bp(F, pBox, lx, y + 0.7, lz + s * 1.34, 1.2, 0.08, 0.06, '#5a3a22');
    }
    // chimneys, tall and capped
    for (const dz of [-8, 8]) chimney(HOUSE.x - 4, HOUSE.z + dz, g + 10, g + 16.2);
    // a weathervane on the ridge, and lanterns either side of the porch steps
    put2(pCyl, HOUSE.x, g + 15.6, HOUSE.z, 0.06, 2.2, 0.06, 0, 0, 0, '#3a2a1a');
    put2(pBox, HOUSE.x, g + 16.5, HOUSE.z, 0.08, 0.5, 1.4, 0, 0.3, 0, '#c8a040');
    for (const s of [-1, 1]) { put2(pBox, HOUSE.x + 13.2, g + 0.9, HOUSE.z + s * 3.4, 0.3, 1.8, 0.3, 0, 0, 0, '#3a2a1a'); lantern(HOUSE.x + 13.2, g + 2.2, HOUSE.z + s * 3.4); }
    // climbing roses up the porch columns and the front
    for (let k = 0; k < 40; k++) { const pz = HOUSE.z - 7 + Math.floor(rng() * 6) * 2.8, py = g + 0.5 + rng() * 4.2; tufts.put(HOUSE.x + 11 + (rng() - 0.5) * 0.8, py, pz + (rng() - 0.5) * 0.8, 0.45, 0.4, 0.45, rng(), rng(), 0, rng() < 0.35 ? pick(['#e85a6a', '#ff8ac8', '#ffffff']) : pick(['#4a8a3a', '#3a7a34'])); }
  }
  /* the workshop, joined to the south wing by a covered way so he can go from his bench to his supper without his hat */
  const work = hall(WORKSHOP.x, WORKSHOP.z, ROT_E, 16, 11, 5.8, '#d8b888', { roof: 'pitch', roofC: 0x7a4a2a, doorW: 3.2, doorH: 3.4, winY: [2.4], shutters: '#6a4a2a', band: [3.2] });
  const workDoor = addDoor(work.door, 'p_workshop', 'The Workshop', 'workshop', { room: 'p_house', entry: 'workshop' });
  {
    const F = work.F, g = work.g;
    // the covered way between the house and the workshop
    const link = hall(WORKSHOP.x, (HOUSE.z + 19 + 6 + WORKSHOP.z - 8) / 2, ROT_E, 9, 7.2, 4.2, '#e8d4b0', { roof: 'pitch', roofC: 0x6a3a22, winY: [2.2], noDoor: true, shutters: '#3a6a7a', flowers: FLOWERS });
    // a canopy over the big doors, on brackets, and a bench under it
    bp(F, pBox, 0, 4.1, 6.4, 7, 0.25, 2.2, '#7a4a2a', -0.18);
    for (const q of [-1, 1]) { bp(F, pBox, q * 3.2, 3.6, 6.2, 0.18, 0.9, 1.6, '#5a3a22', 0.6); }
    bp(F, pBox, -5.2, 0.9, 6.5, 2.8, 0.14, 0.8, '#9a6a40'); for (const q of [-1, 1]) bp(F, pBox, -5.2 + q * 1.2, 0.45, 6.5, 0.14, 0.9, 0.7, '#6a4428'); bc(F, -5.2, 6.5, 1.4, 0.4, -1, 0.95);
    // the forge chimney at the south gable, and a skylight
    { const [fx, fz] = W(F, -8.9, -2); chimney(fx, fz, g, g + 10.5, '#8a7a6a'); }
    bc(F, -8.9, -2, 0.8, 0.8, -1, 10.5);
    bp(F, pPane, 3, 5.8 + 2.78, 2.7, 3, 0.05, 1.8, '#ffffff', 0.62);
    // a hoist arm over the doors for lifting timber
    bp(F, pBox, 4.5, 6.0, 6.2, 0.25, 0.25, 2.8, '#5a3a22'); bp(F, pBox, 4.5, 5.0, 7.5, 0.04, 2, 0.04, '#d8c8a0'); bp(F, pBox, 4.5, 3.9, 7.5, 0.3, 0.3, 0.3, '#4a4a50');
    void link;
  }
  /* the barn: a hay hood and hoist, a cupola, X-braced doors, and a stone silo */
  const barn = hall(BARN.x, BARN.z, Math.PI, 18, 14, 8, '#8a3a2a', { roof: 'pitch', roofC: 0x4a2a1a, pitch: 0.8, doorW: 3.4, doorH: 4, winY: [5.5], shutters: '#e8d8b8' });
  addDoor(barn.door, 'p_barn', 'The Barn', 'barn');
  {
    const F = barn.F;
    for (const q of [-1, 1]) { bp(F, pBox, 0, 2, 7.2, 0.2, 5.4, 0.08, '#e8d8b8', 0, 0, q * 0.62); }
    bp(F, pBox, 0, 4.1, 7.2, 3.6, 0.2, 0.08, '#e8d8b8'); bp(F, pBox, 0, 0.1, 7.2, 3.6, 0.2, 0.08, '#e8d8b8');
    bp(F, pBox, 0, 9.0, 6.2, 2.8, 3.0, 2.6, '#8a3a2a'); bp(F, pBox, 0, 8.9, 7.52, 1.8, 2.0, 0.06, '#2a1a10');
    bp(F, pPrism, 0, 10.5, 6.6, 3.6, 1.4, 3.4, '#4a2a1a', 0, Math.PI / 2);
    bp(F, pBox, 0, 11.0, 8.2, 0.25, 0.25, 3.0, '#5a3a22'); bp(F, pBox, 0, 9.9, 9.5, 0.04, 2.2, 0.04, '#d8c8a0'); bp(F, pBox, 0, 8.8, 9.5, 0.3, 0.3, 0.3, '#4a4a50');
    // the cupola on the ridge
    bp(F, pBox, 0, 8 + 7 * Math.tan(0.8) + 0.9, 0, 2, 1.8, 2, '#e8d8b8'); bp(F, pPyr, 0, 8 + 7 * Math.tan(0.8) + 2.4, 0, 1.9, 1.6, 1.9, '#4a2a1a');
    bp(F, pCyl, 0, 8 + 7 * Math.tan(0.8) + 3.8, 0, 0.05, 1.6, 0.05, '#3a2a1a'); bp(F, pBox, 0, 8 + 7 * Math.tan(0.8) + 4.3, 0, 1.2, 0.3, 0.06, '#c8a040');
    // the silo
    const sx = BARN.x - 12.5, sz = BARN.z + 4, sg = heightAt(sx, sz);
    put2(pCyl, sx, sg + 6, sz, 3.6, 12, 3.6, 0, 0, 0, '#a89888'); col.add(sx, sz, 3.2, 3.2, 0, sg - 1, sg + 12); col.add(sx, sz, 3.2, 3.2, Math.PI / 4, sg - 1, sg + 12);
    for (let k = 1; k < 6; k++) put2(pCyl, sx, sg + k * 2, sz, 3.7, 0.18, 3.7, 0, 0, 0, '#7a6a5a');
    put2(pCone, sx, sg + 13.6, sz, 4.2, 3.2, 4.2, 0, 0, 0, '#5a3a24'); put2(pCyl, sx, sg + 15.6, sz, 0.06, 1.4, 0.06, 0, 0, 0, '#3a2a1a');
    // bales stacked by the door, and a water trough
    for (let k = 0; k < 7; k++) { const [x, z] = W(F, 5 + (k % 3) * 1.25, 8.6 + Math.floor(k / 3) * 0); put2(pBox, x, barn.g + 0.45 + (k > 2 ? 0.9 : 0) + (k > 5 ? 0.9 : 0), z + (k % 2) * 0.1, 1.2, 0.9, 0.9, 0, (rng() - 0.5) * 0.2, 0, '#d8b85a'); }
    bc(F, 6.2, 8.6, 2, 0.5, -1, 1.8);
    bp(F, pBox, -6, 0.4, 8.6, 3, 0.8, 1, '#7a5232'); bp(F, pPane, -6, 0.75, 8.6, 2.6, 0.04, 0.7, '#ffffff'); bc(F, -6, 8.6, 1.5, 0.5, -1, 0.8);
  }
  const shed = hall(WOODSHED.x, WOODSHED.z, ROT_E, 7, 5, 3.4, '#8a6a4a', { roof: 'pitch', roofC: 0x5a3a24, doorW: 1.4, doorH: 2.2 });
  addDoor(shed.door, 'p_woodshed', 'The Woodshed', 'woodshed');
  {
    // an open lean-to off the shed, stacked to the eaves with split logs
    const F = shed.F;
    bp(F, pBox, 0, 2.9, -4.4, 7.4, 0.2, 3.8, '#5a3a24', 0.3);
    for (const q of [-1, 1]) bp(F, pBox, q * 3.4, 1.4, -6.1, 0.25, 2.8, 0.25, '#5a3a22');
    for (let row = 0; row < 5; row++) for (let k = 0; k < 16; k++) bp(F, pCyl, -3 + k * 0.4 + (row % 2) * 0.2, 0.22 + row * 0.38, -4.6, 0.19, 2.4, 0.19, rng() < 0.5 ? '#9a6a40' : '#b07a48', Math.PI / 2);
    bc(F, 0, -4.6, 3.4, 1.3, -1, 2);
    const [cx, cz] = W(F, 2.6, 4.2), cg = heightAt(cx, cz);
    put2(pCyl, cx, cg + 0.4, cz, 0.6, 0.8, 0.6, 0, 0, 0, '#8a5a36'); put2(pCyl, cx, cg + 0.81, cz, 0.55, 0.02, 0.55, 0, 0, 0, '#c8a070');
    put2(pBox, cx + 0.1, cg + 1.15, cz, 0.06, 0.7, 0.06, 0, 0, 0.5, '#6a4428'); put2(pBox, cx - 0.05, cg + 0.92, cz, 0.3, 0.2, 0.05, 0, 0, 0.5, '#9aa0a8');
    col.add(cx, cz, 0.6, 0.6, 0, cg - 1, cg + 0.8);
  }
  // the tower: tall, fire-tree wood on a stone foot, with a stair winding round the outside to the lookout (and a door at its foot)
  const TOWER_H = 16;
  const towerTop = new THREE.Vector3();
  {
    const { x, z } = TOWER, g = heightAt(x, z);
    blocks.put(x, g + TOWER_H / 2 - 0.5, z, 5, TOWER_H + 1, 5, 0, 0, 0, '#8a5a36');
    // the stone foot, with quoins
    put2(pBox, x, g + 1.6, z, 5.8, 4.2, 5.8, 0, 0, 0, '#9a9284');
    for (let k = 0; k < 6; k++) for (const [qx, qz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) put2(pBox, x + qx * 2.95, g + 0.3 + k * 0.7, z + qz * 2.95, (k % 2 ? 0.7 : 1.1), 0.6, (k % 2 ? 1.1 : 0.7), 0, 0, 0, '#b8b0a0');
    // timber bands and narrow lit windows up the faces
    for (const by of [5.5, 10.5, 15.2]) put2(pBox, x, g + by, z, 5.25, 0.3, 5.25, 0, 0, 0, '#5a3a22');
    for (const [fx, fz, ry] of [[2.52, 0, Math.PI / 2], [-2.52, 0, -Math.PI / 2], [0, -2.52, Math.PI]]) for (const wy of [7.8, 12.8]) {
      put2(pPane, x + fx, g + wy, z + fz, 0.7, 1.5, 0.06, 0, ry, 0, '#ffffff');
      put2(pBox, x + fx * 1.01, g + wy + 0.85, z + fz * 1.01, 1.1, 0.2, 0.12, 0, ry, 0, '#5a3a22');
    }
    blocks.put(x, g + TOWER_H + 0.3, z, 6.4, 0.6, 6.4, 0, 0, 0, '#6a4428');
    for (const [dx, dz] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) blocks.put(x + dx, g + TOWER_H + 1.1, z + dz, Math.abs(dx) ? 0.2 : 6.2, 1, Math.abs(dz) ? 0.2 : 6.2, 0, 0, 0, '#5a3a22');
    for (let k = 0; k < 4; k++) for (let q = -2; q <= 2; q++) { const a = k * Math.PI / 2; put2(pBox, x + Math.cos(a) * 3 - Math.sin(a) * q * 1.2, g + TOWER_H + 0.95, z + Math.sin(a) * 3 + Math.cos(a) * q * 1.2, 0.12, 0.7, 0.12, 0, 0, 0, '#6a4428'); }
    // the belvedere roof: a broad flared pyramid, a lantern cupola, a spire
    put2(pPyr, x, g + TOWER_H + 4.2 + 1.2, z, 5.6, 2.4, 5.6, 0, 0, 0, '#7a3a22');
    put2(pPyr, x, g + TOWER_H + 4.2 + 0.25, z, 6.2, 0.5, 6.2, 0, 0, 0, '#6a3020');
    put2(pBox, x, g + TOWER_H + 6.9, z, 1.8, 1.4, 1.8, 0, 0, 0, '#e8d8b8');
    put2(pLamp, x, g + TOWER_H + 6.9, z, 1.9, 0.9, 0.6, 0, 0, 0, '#ffc870'); put2(pLamp, x, g + TOWER_H + 6.9, z, 0.6, 0.9, 1.9, 0, 0, 0, '#ffc870');
    put2(pPyr, x, g + TOWER_H + 8.8, z, 1.6, 2.4, 1.6, 0, 0, 0, '#7a3a22');
    const tl = glowSprite(0xffb860, 9, 0); tl.position.set(x, g + TOWER_H + 6.9, z); scene.add(tl); lampGlows.push(tl);
    for (const [dx, dz] of [[-2.9, -2.9], [2.9, -2.9], [2.9, 2.9], [-2.9, 2.9]]) { blocks.put(x + dx, g + TOWER_H + 2.4, z + dz, 0.3, 3.6, 0.3, 0, 0, 0, '#5a3a22'); put2(pBox, x + dx * 0.88, g + TOWER_H + 3.9, z + dz * 0.88, 0.2, 0.9, 0.2, 0, Math.atan2(dx, dz), 0.7, '#5a3a22'); }
    lantern(x, g + TOWER_H + 3.4, z, 1.2);
    col.add(x, z, 2.5, 2.5, 0, g - 1, g + TOWER_H); col.add(x, z, 2.9, 2.9, 0, g - 1, g + 3.6);
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
      // a hand-rail on the outer edge
      const ox = Math.sign(bx - x) * (Math.abs(bx - x) > 4 ? 0.7 : 0), oz = Math.sign(bz - z) * (Math.abs(bz - z) > 4 ? 0.7 : 0);
      put2(pBox, bx + ox, g + sy + 0.45, bz + oz, 0.08, 0.9, 0.08, 0, 0, 0, '#5a3a22');
      col.add(bx, bz, 0.75, 0.75, 0, g + sy - 0.5, g + sy);
    });
    towerTop.set(x, g + TOWER_H, z);
    // ivy up the north face
    for (let k = 0; k < 60; k++) { const yy = g + 3 + Math.pow(rng(), 1.4) * 11, zz = z + (rng() - 0.5) * 4.6; tufts.put(x - 2.6 - rng() * 0.2, yy, zz, 0.25, 0.45, 0.5 + rng() * 0.4, rng(), rng(), 0, pick(['#3a7a34', '#4a8a3a', '#2f6a30'])); }
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), toon(0xd9a441, { side: THREE.DoubleSide })); flag.position.set(x + 1.4, g + TOWER_H + 12.4, z); scene.add(flag);
    blocks.put(x, g + TOWER_H + 11.6, z, 0.12, 4.2, 0.12, 0, 0, 0, '#4a2a14');
    var towerFlag = flag;
    // the door at its foot, on the north side, where the stair runs high overhead
    blocks.put(x, g + 1.3, z - 2.95, 1.5, 2.6, 0.2, 0, 0, 0, '#5a3018');
    put2(pBox, x, g + 2.75, z - 3.0, 2.1, 0.35, 0.3, 0, 0, 0, '#7a6a5a');
    doors.push({ id: 'p_tower', name: 'The Tower', kind: 'tower', x, z: z - 3.6, yaw: Math.PI });
  }

  /* ---------------- the yard: firepit, well, the dummies' post, a cart, a washing line, tools ---------------- */
  const hearth = { x: YARD.x + 4, z: YARD.z - 2 };
  const fire = glowSprite(0xff8a3a, 3, 0.9);
  const washing = [];
  {
    const g = heightAt(hearth.x, hearth.z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.3, 5, 12), toon(0x7a6a5a)); ring.rotation.x = -Math.PI / 2; ring.position.set(hearth.x, g + 0.15, hearth.z); scene.add(ring);
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; rocks.put(hearth.x + Math.cos(a) * 1.35, g + 0.2, hearth.z + Math.sin(a) * 1.35, 0.4, 0.3, 0.35, rng(), rng(), rng(), '#8a8478'); }
    fire.position.set(hearth.x, g + 0.9, hearth.z); scene.add(fire);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; blocks.put(hearth.x + Math.cos(a) * 3, g + 0.25, hearth.z + Math.sin(a) * 3, 2, 0.5, 0.5, 0, -a, 0, '#7a5232'); }
    // a spit over the fire
    for (const q of [-1, 1]) put2(pBox, hearth.x + q * 1.2, g + 0.8, hearth.z, 0.1, 1.6, 0.1, 0, 0, q * 0.15, '#4a3a2a');
    put2(pBox, hearth.x, g + 1.55, hearth.z, 2.6, 0.06, 0.06, 0, 0, 0, '#4a4a50');
    // the well, with a roof, a winch and a bucket
    const wx = WELL.x, wz = WELL.z, wg = heightAt(wx, wz);
    const well = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 1.2, 14), toon(0x9a8a78)); well.position.set(wx, wg + 0.6, wz); addOutline(well, 0.04); scene.add(well);
    put2(pCyl, wx, wg + 1.22, wz, 1.5, 0.12, 1.5, 0, 0, 0, '#b8b0a0'); put2(pCyl, wx, wg + 1.2, wz, 1.15, 0.1, 1.15, 0, 0, 0, '#1a2a30');
    col.add(wx, wz, 1.3, 1.3, 0, wg - 1, wg + 1.2);
    for (const s of [-1, 1]) blocks.put(wx + s * 1.3, wg + 1.8, wz, 0.2, 2.4, 0.2, 0, 0, 0, '#6a4428');
    put2(pPrism, wx, wg + 2.9, wz, 3.4, 1.2, 2.4, 0, 0, 0, '#6a3a22');
    put2(pCyl, wx, wg + 2.2, wz, 0.18, 2.4, 0.18, 0, 0, Math.PI / 2, '#7a5232'); put2(pBox, wx + 1.5, wg + 2.0, wz, 0.08, 0.5, 0.08, 0, 0, 0, '#4a3a2a');
    put2(pCyl, wx + 0.9, wg + 1.45, wz + 0.9, 0.28, 0.4, 0.28, 0, 0, 0, '#7a5232');
    // the high post for the far dummy
    blocks.put(YARD.x + 14, heightAt(YARD.x + 14, YARD.z + 18) + 3, YARD.z + 18, 0.8, 6, 0.8, 0, 0, 0, '#6a4428');
    col.add(YARD.x + 14, YARD.z + 18, 0.4, 0.4, 0, heightAt(YARD.x + 14, YARD.z + 18) - 1, heightAt(YARD.x + 14, YARD.z + 18) + 6);
    // a hay cart, with sides and shafts and a load on
    const cx = TIMBER.x - 12, cz = TIMBER.z - 12, cg = heightAt(cx, cz), CF = frame(cx, cg, cz, 0.4);
    bp(CF, pBox, 0, 1, 0, 2.2, 0.3, 3.6, '#8a5a36'); col.add(cx, cz, 1.1, 1.8, 0.4, cg - 1, cg + 1.2);
    for (const q of [-1, 1]) { bp(CF, pBox, q * 1.08, 1.45, 0, 0.1, 0.6, 3.6, '#7a4e2c'); for (let k = -1; k <= 1; k++) bp(CF, pBox, q * 1.1, 1.45, k * 1.6, 0.14, 0.7, 0.14, '#5a3a22'); bp(CF, pBox, q * 0.7, 0.75, 3.1, 0.12, 0.12, 3, '#6a4428', 0.25); }
    for (let k = 0; k < 5; k++) { const [hx, hz] = W(CF, (rng() - 0.5) * 1.2, (rng() - 0.5) * 2.6); tufts.put(hx, cg + 1.6 + rng() * 0.4, hz, 0.9, 0.55, 0.9, rng(), rng(), 0, pick(['#d8b85a', '#e0c068', '#c8a848'])); }
    for (const s of [-1, 1]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.2, 12), toon(0x5a3a22)); wh.rotation.z = Math.PI / 2; wh.rotation.y = 0.4; wh.position.set(cx + Math.cos(0.4) * s * 1.2, cg + 0.7, cz - Math.sin(0.4) * s * 1.2); addOutline(wh, 0.03); scene.add(wh); }
    for (let k = 0; k < 14; k++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2, 6), toon(0x7a4e2c)); lg.rotation.x = Math.PI / 2; lg.position.set(WOODSHED.x + 5 + (k % 5) * 0.46, heightAt(WOODSHED.x + 5, WOODSHED.z) + 0.25 + Math.floor(k / 5) * 0.42, WOODSHED.z + 4); scene.add(lg); }
    col.add(WOODSHED.x + 6, WOODSHED.z + 4, 1.3, 1, 0, heightAt(WOODSHED.x + 5, WOODSHED.z) - 1, heightAt(WOODSHED.x + 5, WOODSHED.z) + 1.4);
    for (const [sx, sz] of [[TIMBER.x + 10, TIMBER.z - 9], [TIMBER.x + 13, TIMBER.z - 9]]) { const sg = heightAt(sx, sz); blocks.put(sx, sg + 0.8, sz, 0.2, 0.2, 1.6, 0, 0, 0, '#6a4428'); for (const s of [-1, 1]) blocks.put(sx + s * 0.4, sg + 0.4, sz, 0.12, 0.8, 0.12, 0, 0, s * 0.3, '#6a4428'); }
    put2(pBox, TIMBER.x + 11.5, heightAt(TIMBER.x + 11.5, TIMBER.z - 9) + 0.98, TIMBER.z - 9, 4.2, 0.12, 0.5, 0, 0, 0.03, '#c8a070');
    // the timber yard: a long lean-to over stacked, stickered boards, a sawpit, a pile of great logs
    {
      const tx = TIMBER.x + 4, tz = TIMBER.z + 2, tg = heightAt(tx, tz), TF = frame(tx, tg, tz, 0);
      bp(TF, pBox, 0, 3.6, 0, 14, 0.25, 6.4, '#5a3a24', 0.22);
      for (const lx of [-6.6, 0, 6.6]) for (const lz of [-2.8, 2.8]) { bp(TF, pBox, lx, (lz < 0 ? 4.25 : 3.0) / 2, lz, 0.3, lz < 0 ? 4.25 : 3.0, 0.3, '#5a3a22'); bc(TF, lx, lz, 0.2, 0.2, -1, 3); }
      for (let st = 0; st < 3; st++) for (let row = 0; row < 7; row++) {
        const sx2 = -4.4 + st * 4.4;
        bp(TF, pBox, sx2, 0.2 + row * 0.26, 0, 3.6, 0.16, 4.6, WOOD_TONES[(row + st) % 4]);
        for (const q of [-1, 0, 1]) bp(TF, pBox, sx2, 0.31 + row * 0.26, q * 1.9, 3.7, 0.06, 0.12, '#5a3a22');
      }
      bc(TF, 0, 0, 6.4, 2.4, -1, 2);
      for (let k = 0; k < 5; k++) put2(pCyl, tx - 2 + (k % 3) * 1.4 + (k > 2 ? 0.7 : 0), tg + 0.6 + (k > 2 ? 1.1 : 0), tz + 7.5, 0.62, 6, 0.62, Math.PI / 2, 0, 0, '#7a5232');
      col.add(tx - 0.6, tz + 7.5, 2.4, 3, 0, tg - 1, tg + 2.2);
      put2(pBox, tx + 9, tg + 0.02, tz + 7, 1.6, 0.06, 5, 0, 0, 0, '#3a2a1a');   // the sawpit
      put2(pBox, tx + 9, tg + 0.6, tz + 7, 0.35, 0.35, 5.4, 0, 0, 0, '#9a6a40');
      put2(pBox, tx + 9, tg + 1.5, tz + 7, 0.04, 1.8, 0.5, 0, 0, 0.1, '#9aa0a8');
    }
    // a grindstone and a wheelbarrow by the workshop doors, a rake against the wall
    {
      const [gx, gz] = W(work.F, 5.2, 7.2), gg = heightAt(gx, gz);
      put2(pCyl, gx, gg + 0.9, gz, 0.55, 0.16, 0.55, 0, 0.2, Math.PI / 2, '#a8a094');
      for (const q of [-1, 1]) put2(pBox, gx, gg + 0.45, gz + q * 0.3, 0.12, 0.9, 0.08, 0, 0.2, 0, '#6a4428');
      put2(pBox, gx + 0.6, gg + 0.4, gz, 0.5, 0.5, 0.5, 0, 0.2, 0, '#7a5232');
      col.add(gx, gz, 0.6, 0.5, 0.2, gg - 1, gg + 1.4);
      const [bx2, bz2] = W(work.F, -7.6, 7.4), bg = heightAt(bx2, bz2);
      put2(pBox, bx2, bg + 0.6, bz2, 0.9, 0.4, 1.3, 0.1, 1.1, 0, '#7a4e2c'); put2(pCyl, bx2 + 0.6, bg + 0.3, bz2 + 0.2, 0.3, 0.08, 0.3, 0, 1.1, Math.PI / 2, '#4a3a2a');
      for (const q of [-1, 1]) put2(pBox, bx2 - 0.5 + q * 0.3, bg + 0.55, bz2 - 0.3, 0.06, 0.06, 1.5, 0.2, 1.1, 0, '#6a4428');
      const [rx2, rz2] = W(work.F, 7.4, 5.65);
      put2(pBox, rx2, work.g + 1.1, rz2, 0.05, 2.3, 0.05, 0, 0, 0.18, '#7a5232'); put2(pBox, rx2 + 0.2, work.g + 2.25, rz2, 0.05, 0.08, 0.8, 0, 0, 0, '#5a5a5a');
    }
    // the washing line behind the north wing: shirts, a quilt, Tanoc's spare hat-scarf
    {
      const ax = HOUSE.x - 20, az0 = HOUSE.z - 38, az1 = HOUSE.z - 20, lg = heightAt(ax, (az0 + az1) / 2);
      for (const az of [az0, az1]) { put2(pBox, ax, heightAt(ax, az) + 1.3, az, 0.18, 2.6, 0.18, 0, 0, 0, '#6a4428'); put2(pBox, ax, heightAt(ax, az) + 2.5, az, 0.8, 0.1, 0.1, 0, 0, 0, '#6a4428'); col.add(ax, az, 0.2, 0.2, 0, lg - 1, lg + 2.6); }
      put2(pBox, ax, lg + 2.5, (az0 + az1) / 2, 0.03, 0.03, az1 - az0, 0, 0, 0, '#e8e0d0');
      const clothMat = toon(0xffffff, { side: THREE.DoubleSide });
      const CL = ['#f4f0e8', '#8a3a4a', '#3a6a8a', '#e8c84a', '#f4f0e8', '#6a8a4a', '#d87a5a'];
      for (let k = 0; k < 7; k++) {
        const w = 0.8 + rng() * 0.9, h = 0.7 + rng() * 0.6, cz2 = az0 + 1.4 + k * (az1 - az0 - 2.8) / 6;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).translate(0, -h / 2, 0).rotateY(Math.PI / 2), clothMat.clone()); m.material.color.set(CL[k]);
        m.position.set(ax, lg + 2.48, cz2); scene.add(m); washing.push(m);
        for (const q of [-1, 1]) put2(pBox, ax, lg + 2.5, cz2 + q * w * 0.4, 0.06, 0.12, 0.04, 0, 0, 0, '#c8a070');
      }
    }
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
    // the dock's T-head, bollards, a lantern at the end, a rowboat tied up, crates and a rope coil
    const tx = DOCK.x - 13 * 1.6 - 2.2;
    for (let k = -3; k <= 3; k++) put2(pBox, tx, dy, DOCK.z + k * 1.5, 3.4, 0.25, 1.4, 0, 0, 0, k % 2 ? '#7a5232' : '#8a6040');
    for (const q of [-4.4, 4.4]) for (const r of [-1.4, 1.4]) put2(pBox, tx + r, dy - 2.5, DOCK.z + q, 0.3, 5, 0.3, 0, 0, 0, '#4a3020');
    col.add(tx, DOCK.z, 1.7, 5.2, 0, dy - 3, dy + 0.12);
    for (const k of [1, 5, 9, 12]) for (const sd of [-1, 1]) { put2(pCyl, DOCK.x - k * 1.6, dy + 0.4, DOCK.z + sd * 1.55, 0.17, 0.7, 0.17, 0, 0, 0, '#3a2a1a'); put2(pCyl, DOCK.x - k * 1.6, dy + 0.78, DOCK.z + sd * 1.55, 0.22, 0.08, 0.22, 0, 0, 0, '#2a1a10'); }
    for (const q of [-4.4, 4.4]) { put2(pBox, tx - 1.4, dy + 1.6, DOCK.z + q, 0.22, 3, 0.22, 0, 0, 0, '#4a3420'); put2(pBox, tx - 1.0, dy + 3.05, DOCK.z + q, 1.0, 0.12, 0.12, 0, 0, 0, '#4a3420'); lantern(tx - 0.6, dy + 2.6, DOCK.z + q, 0.85); col.add(tx - 1.4, DOCK.z + q, 0.2, 0.2, 0, dy - 1, dy + 3); }
    // the rowboat, riding a little low, tied to the third bollard
    const rbx = DOCK.x - 9 * 1.6, rbz = DOCK.z + 3.6;
    put2(pDome, rbx, WATER_LEVEL + 0.55, rbz, 1.0, 0.6, 2.7, Math.PI, 0.05, 0, '#8a5a36');
    put2(pBox, rbx, WATER_LEVEL + 0.52, rbz, 2.0, 0.08, 5.0, 0, 0.05, 0, '#6a4428');
    for (const q of [-0.9, 0.7]) put2(pBox, rbx, WATER_LEVEL + 0.42, rbz + q, 1.8, 0.08, 0.4, 0, 0.05, 0, '#9a6a40');
    for (const q of [-1, 1]) put2(pBox, rbx + q * 0.7, WATER_LEVEL + 0.62, rbz - 0.2, 0.06, 0.06, 3.2, 0, 0.05 + q * 0.12, 0, '#c8a070');
    put2(pBox, rbx, dy + 0.1, rbz - 1.8, 0.04, 0.04, 2.2, 0.35, 0, 0, '#d8c8a0');
    for (const [cx, cz, s2] of [[DOCK.x + 2, DOCK.z - 1, 0.8], [DOCK.x + 2.9, DOCK.z - 0.9, 0.6], [DOCK.x + 2.4, DOCK.z - 1, 0.55]]) put2(pBox, cx, dy + 0.12 + s2 / 2 + (s2 < 0.6 ? 0.8 : 0), cz, s2, s2, s2, 0, rng(), 0, '#9a6a40');
    put2(pCyl, DOCK.x + 1.2, dy + 0.6, DOCK.z + 1, 0.4, 1.0, 0.4, 0, 0, 0, '#7a4e2c');
    put2(pCyl, DOCK.x - 3, dy + 0.2, DOCK.z + 0.9, 0.5, 0.14, 0.5, 0, 0, 0, '#c8b080');
    put2(pBox, DOCK.x - 6, dy + 0.5, DOCK.z - 1.3, 0.05, 0.05, 3.4, 0.35, 0.6, 0, '#7a5232');   // somebody's fishing rod
    col.add(DOCK.x + 2.3, DOCK.z - 1, 0.9, 0.5, 0, dy - 1, dy + 0.9);
    // the boathouse: a slipway down into the water, an upturned canoe on trestles, nets drying on a frame
    {
      const F = bh.F;
      for (let k = 0; k < 12; k++) { const [x, z] = W(F, 5.4 + k * 1.2, 0); const y = Math.max(heightAt(x, z), WATER_LEVEL - 0.6) + 0.12; put2(pBox, x, y, z, 1.1, 0.16, 3.6, 0, F.rot, 0, k % 2 ? '#7a5232' : '#6a4a2e'); }
      for (const q of [-1.6, 1.6]) { const [x, z] = W(F, 11, q); put2(pBox, x, Math.max(heightAt(x, z), WATER_LEVEL - 0.6) + 0.02, z, 13, 0.18, 0.2, 0, F.rot, 0, '#4a3020'); }
      const [cx2, cz2] = W(F, -2, -7.4), cg2 = heightAt(cx2, cz2);
      for (const q of [-1.2, 1.2]) { const [x, z] = W(F, -2 + q, -7.4); put2(pBox, x, cg2 + 0.4, z, 0.12, 0.8, 1.2, 0, F.rot, 0, '#6a4428'); }
      put2(pDome, cx2, cg2 + 0.85, cz2, 0.6, 0.35, 2.2, 0, F.rot + Math.PI / 2, 0, '#c8783a'); col.add(cx2, cz2, 2.2, 0.7, F.rot, cg2 - 1, cg2 + 1.2);
      const [nx2, nz2] = W(F, 3.5, -7.2), ng = heightAt(nx2, nz2);
      for (const q of [-1.4, 1.4]) { const [x, z] = W(F, 3.5 + q, -7.2); put2(pBox, x, ng + 1.2, z, 0.14, 2.4, 0.14, 0, F.rot, 0, '#5a3a22'); }
      put2(pBox, nx2, ng + 2.35, nz2, 3.1, 0.1, 0.1, 0, F.rot, 0, '#5a3a22');
      put2(pGlass, nx2, ng + 1.55, nz2, 2.8, 1.6, 0.05, 0, F.rot, 0, '#6a5a3a');
      put2(pBox, nx2, ng + 1.5, nz2, 0.05, 1.7, 0.08, 0, F.rot, 0, '#4a3a2a');
    }
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
    if (s > 0.6 && onLand(x, z)) col.add(x, z, s * 0.8, s * 0.8, 0, g - 1, g + s * 0.9);
  }

  /* ---------------- the grounds: flagstone walks, edged lanes and lanterns, dry-stone walls, the greenhouse,
     beehives, the pond, reeds and lilies on the shore, wildflowers, a swing, the outcrops, birds ---------------- */
  const pebbles = new Kit(scene, new THREE.IcosahedronGeometry(1, 0), toon(0xffffff), 7000, false);
  const blooms = new Kit(scene, new THREE.OctahedronGeometry(1, 0), toon(0xffffff), 12000, false);
  const reeds = new Kit(scene, new THREE.ConeGeometry(0.12, 1, 4), toon(0xffffff), 9000, false);
  const padG = new THREE.CircleGeometry(1, 12, 0.35, Math.PI * 2 - 0.7).rotateX(-Math.PI / 2);
  const pads = new Kit(scene, padG, toon(0xffffff, { side: THREE.DoubleSide }), 1600, false);
  const GREENHOUSE_DOOR = { x: GREENHOUSE.x, z: GREENHOUSE.z - 3 };
  const ok = (x, z) => !nearBuildings(x, z, -40) && pathDist(x, z) > 3 && laneDist(x, z) > 3 && !inField(x, z) && !inPasture(x, z);
  // flagstone walks: porch to yard, yard to the workshop doors, the back terrace to the garden gate, the garden to the greenhouse
  const flagWalk = pts => {
    const L = pts.reduce((a, p, i) => i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
    for (let d = 0; d < L; d += 1.15) {
      let acc = 0, x = pts[0][0], z = pts[0][1], nx = 0, nz = 1;
      for (let i = 1; i < pts.length; i++) { const sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + sl >= d) { const t = (d - acc) / sl; x = lerp(pts[i - 1][0], pts[i][0], t); z = lerp(pts[i - 1][1], pts[i][1], t); nx = -(pts[i][1] - pts[i - 1][1]) / sl; nz = (pts[i][0] - pts[i - 1][0]) / sl; break; } acc += sl; }
      for (const q of [-0.6, 0.6]) { const fx = x + nx * q + (rng() - 0.5) * 0.25, fz = z + nz * q + (rng() - 0.5) * 0.25, s = 0.45 + rng() * 0.2; put2(pCyl, fx, heightAt(fx, fz) + 0.03, fz, s * 1.15, 0.12, s, 0, rng() * 6, 0, pick(['#b8b0a0', '#a8a094', '#c8bca8', '#9a9488'])); }
    }
  };
  flagWalk([[HOUSE.x + 13.6, HOUSE.z], [HOUSE.x + 20, HOUSE.z + 6], [YARD.x - 4, YARD.z - 10], [YARD.x, YARD.z - 2]]);
  flagWalk([[YARD.x - 6, YARD.z], [WORKSHOP.x + 8.5, WORKSHOP.z]]);
  flagWalk([[HOUSE.x - 13, HOUSE.z + 10], [192.6, 2]]);
  flagWalk([[GREENHOUSE_DOOR.x, GREENHOUSE_DOOR.z - 1.5], [GREENHOUSE_DOOR.x + 6, 12], [192.6, 4]]);
  // the lane and the path, edged with white stones and lit with lanterns on posts
  const edge = (pts, from, to, off) => {
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (let d = 0; d < L; d += 1.7) {
        const x0 = ax + (bx - ax) * d / L, z0 = az + (bz - az) * d / L; acc += 1.7;
        if (x0 > from || x0 < to) continue;
        for (const s of [-1, 1]) { const x = x0 + nx * off * s + (rng() - 0.5) * 0.3, z = z0 + nz * off * s + (rng() - 0.5) * 0.3, gg = heightAt(x, z); if (gg < WATER_LEVEL + 0.3 || nearBuildings(x, z, -70)) continue; const sz = 0.12 + rng() * 0.1; pebbles.put(x, gg + sz * 0.15, z, sz * 1.3, sz * 0.7, sz, rng(), rng(), rng(), pick(['#e8e4d8', '#d8d4c8', '#c8c4b8', '#f0ece0'])); }
      }
    }
  };
  edge(LANE, 400, -320, 3.1); edge(PATH, 545, 250, 3.3);
  const lanePosts = [];
  const postsAlong = (pts, from, to, every, off) => {
    let acc = every * 0.5, side = 1;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (let d = 0; d < L; d += 1) {
        acc += 1; if (acc < every) continue;
        const x0 = ax + (bx - ax) * d / L, z0 = az + (bz - az) * d / L;
        if (x0 > from || x0 < to) continue;
        acc = 0; side = -side;
        const x = x0 + nx * off * side, z = z0 + nz * off * side, gg = heightAt(x, z);
        if (gg < WATER_LEVEL + 0.5 || nearBuildings(x, z, -66)) continue;
        put2(pBox, x, gg + 1.7, z, 0.24, 3.4, 0.24, 0, 0, 0, '#4a3420');
        put2(pBox, x, gg + 0.2, z, 0.5, 0.4, 0.5, 0, 0, 0, '#8a8478');
        const ax2 = x - nx * side * 0.55, az2 = z - nz * side * 0.55;
        put2(pBox, (x + ax2) / 2, gg + 3.3, (z + az2) / 2, Math.abs(nx) > 0.5 ? 1.1 : 0.12, 0.12, Math.abs(nx) > 0.5 ? 0.12 : 1.1, 0, 0, 0, '#4a3420');
        lantern(ax2, gg + 2.85, az2, 0.85);
        col.add(x, z, 0.2, 0.2, 0, gg - 1, gg + 3.4);
        lanePosts.push([x, z]);
      }
    }
  };
  postsAlong(LANE, 210, -300, 30, 3.9); postsAlong(PATH, 536, 262, 30, 4.2);
  // dry-stone walls: a curved ha-ha round the west of the house grounds, and old walls along the lane
  const wallSeg = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 0.85));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t), gg = heightAt(x, z);
      for (const q of [-0.32, 0.32]) { const s = 0.42 + rng() * 0.16; pebbles.put(x + Math.cos(ang) * q, gg + 0.28, z - Math.sin(ang) * q, s * 1.2, s * 0.85, s, rng() * 0.3, ang + rng() * 0.4, rng() * 0.3, pick(['#9a9284', '#8a8478', '#a8a090', '#b0a48c'])); }
      { const s = 0.38 + rng() * 0.14; pebbles.put(x, gg + 0.82, z, s * 1.25, s * 0.8, s, rng() * 0.3, ang, rng() * 0.3, pick(['#9a9284', '#a8a090', '#8a8478'])); }
      if (rng() < 0.55) tufts.put(x + (rng() - 0.5) * 0.4, gg + 1.12, z + (rng() - 0.5) * 0.4, 0.42, 0.14, 0.4, 0, rng() * 6, 0, pick(['#5a8a3a', '#6a9a40', '#7aa84a']));
    }
    col.add((x0 + x1) / 2, (z0 + z1) / 2, 0.5, L / 2, ang, heightAt((x0 + x1) / 2, (z0 + z1) / 2) - 1, heightAt((x0 + x1) / 2, (z0 + z1) / 2) + 1.1);
  };
  const wallRun = pts => { for (let i = 0; i < pts.length - 1; i++) wallSeg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); };
  {
    let run = [];
    for (let a = 155; a <= 216; a += 2.5) {
      const r = a * Math.PI / 180, x = TERRACE.x + Math.cos(r) * 74, z = TERRACE.z + Math.sin(r) * 74;
      if (laneDist(x, z) < 6 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 6) { if (run.length > 1) wallRun(run); run = []; continue; }
      run.push([x, z]);
    }
    if (run.length > 1) wallRun(run);
    // along the lane, north side, with gaps where it has tumbled
    let acc = 0; run = [];
    for (let i = 1; i < LANE.length - 1; i++) {
      const [ax, az] = LANE[i], [bx, bz] = LANE[i + 1], L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (let d = 0; d < L; d += 4) {
        acc += 4; const x = ax + (bx - ax) * d / L - nx * 4.6, z = az + (bz - az) * d / L - nz * 4.6;
        const broken = Math.sin(acc * 0.045) > 0.55 || x < -240;
        if (broken || !ok(x, z) && laneDist(x, z) < 4) { if (run.length > 1) wallRun(run); run = []; continue; }
        run.push([x, z]);
      }
    }
    if (run.length > 1) wallRun(run);
  }
  // the kitchen garden: raised beds, beans up poles, a scarecrow, flowers along the fence
  {
    const GF = frame(GARDEN.x, heightAt(GARDEN.x, GARDEN.z), GARDEN.z, 0);
    for (const bx of [-5.6, 0, 5.6]) {
      bp(GF, pBox, bx, 0.25, 0.5, 3.0, 0.5, 10.5, '#7a4e2c'); bp(GF, pBox, bx, 0.48, 0.5, 2.7, 0.06, 10.2, '#4a3020');
      bc(GF, bx, 0.5, 1.5, 5.25, -1, 0.5);
      for (let k = 0; k < 9; k++) {
        const lz = -4 + k * 1.12, kind = (bx === 0) ? 2 : bx < 0 ? 0 : 1;
        for (const q of [-0.6, 0.6]) {
          const [x, z] = W(GF, bx + q, lz), y = GF.oy + 0.5;
          if (kind === 0) tufts.put(x, y + 0.25, z, 0.42, 0.32, 0.42, rng(), rng(), 0, pick(['#6a9a4a', '#7aa858', '#5a8a3e']));          // cabbages
          else if (kind === 1) { crops.put(x, y + 0.3, z, 0.8, 0.7, 0.8, 0, rng() * 3, 0, pick(['#7ab04a', '#8ab858'])); if (rng() < 0.4) tufts.put(x, y + 0.1, z, 0.12, 0.12, 0.12, 0, 0, 0, '#e8762a'); }   // carrots, the tops of them showing
          else { put2(pBox, x, y + 1.0, z, 0.05, 2.0, 0.05, 0, 0, (q > 0 ? -0.12 : 0.12), '#8a6a40'); for (let b = 0; b < 3; b++) tufts.put(x + (rng() - 0.5) * 0.3, y + 0.5 + b * 0.55, z + (rng() - 0.5) * 0.3, 0.28, 0.32, 0.28, rng(), rng(), 0, pick(['#4a8a3a', '#5a9a40'])); if (rng() < 0.5) tufts.put(x, y + 0.9 + rng(), z, 0.09, 0.09, 0.09, 0, 0, 0, '#ff6a5a'); }   // runner beans
        }
      }
    }
    // the scarecrow, in one of Buhkon's old hats
    const [sx, sz] = W(GF, 3, -5.8), sg = heightAt(sx, sz);
    put2(pBox, sx, sg + 1.1, sz, 0.12, 2.2, 0.12, 0, 0, 0, '#6a4428'); put2(pBox, sx, sg + 1.7, sz, 1.8, 0.1, 0.1, 0, 0.2, 0, '#6a4428');
    put2(pBox, sx, sg + 1.55, sz, 0.6, 0.8, 0.35, 0, 0.2, 0, '#8a3a2a'); put2(pDome, sx, sg + 2.15, sz, 0.28, 0.32, 0.28, 0, 0, 0, '#e8d8a8');
    put2(pCone, sx, sg + 2.6, sz, 0.42, 0.6, 0.42, 0.1, 0, 0.15, '#5a3018'); put2(pCyl, sx, sg + 2.32, sz, 0.55, 0.05, 0.55, 0, 0, 0, '#5a3018');
    for (let k = 0; k < 80; k++) { const t = rng(), side = Math.floor(rng() * 4), x = side < 2 ? GARDEN.x + (t - 0.5) * (GARDEN.w - 1) : GARDEN.x + (side === 2 ? -1 : 1) * (GARDEN.w / 2 - 0.6), z = side >= 2 ? GARDEN.z + (t - 0.5) * (GARDEN.d - 1) : GARDEN.z + (side === 0 ? -1 : 1) * (GARDEN.d / 2 - 0.6); if (Math.hypot(x - GARDEN.x - GARDEN.w / 2, z - GARDEN.z) < 2.4) continue; blooms.put(x, heightAt(x, z) + 0.4 + rng() * 0.3, z, 0.18, 0.15, 0.18, rng(), rng(), 0, pick(FLOWERS)); }
  }
  // the greenhouse: white frames and glass, benches of pots, a lemon tree in a tub
  {
    const { x, z } = GREENHOUSE, g = heightAt(x, z), F = frame(x, g, z, 0), w = 10, d = 6, h = 2.6, rh = 1.7;
    bp(F, pBox, 0, 0.25, 0, w + 0.3, 0.5, d + 0.3, '#9a9284');
    for (let lx = -w / 2; lx <= w / 2 + 0.01; lx += 1.25) for (const s of [-1, 1]) bp(F, pBox, lx, 0.5 + h / 2, s * d / 2, 0.12, h, 0.12, '#f4f0e8');
    for (let lz = -d / 2; lz <= d / 2 + 0.01; lz += 1.5) for (const s of [-1, 1]) bp(F, pBox, s * w / 2, 0.5 + h / 2, lz, 0.12, h, 0.12, '#f4f0e8');
    for (const s of [-1, 1]) { bp(F, pBox, 0, 0.5 + h, s * d / 2, w + 0.2, 0.14, 0.14, '#f4f0e8'); bp(F, pBox, s * w / 2, 0.5 + h, 0, 0.14, 0.14, d + 0.2, '#f4f0e8'); }
    const slab = Math.hypot(d / 2, rh), pit = Math.atan2(rh, d / 2);
    for (const s of [-1, 1]) {
      bp(F, pGlass, 0, 0.5 + h + rh / 2, s * d / 4, w, 0.05, slab, '#dff4ff', s * pit);
      for (let lx = -w / 2; lx <= w / 2 + 0.01; lx += 1.25) bp(F, pBox, lx, 0.5 + h + rh / 2, s * d / 4, 0.1, 0.1, slab, '#f4f0e8', s * pit);
      bp(F, pGlass, 0, 0.5 + h / 2, s * d / 2, w, h, 0.05, '#dff4ff');
      bp(F, pGlass, s * w / 2, 0.5 + h / 2, 0, 0.05, h, d, '#dff4ff');
      const gab = (lz0) => bp(F, pGlass, s * w / 2, 0.5 + h + rh / 2 - 0.2, lz0, 0.05, rh * 0.6, d * 0.5, '#dff4ff'); gab(0);
    }
    bp(F, pBox, 0, 0.5 + h + rh + 0.05, 0, w + 0.4, 0.16, 0.18, '#f4f0e8');
    for (const s of [-1, 1]) { bp(F, pBox, 0, 1.3, s * 1.9, w - 1.4, 0.1, 1.1, '#9a6a40'); for (let k = 0; k < 12; k++) { const [px, pz] = W(F, -4 + k * 0.72, s * 1.9); put2(pCyl, px, g + 1.5, pz, 0.2, 0.3, 0.16, 0, 0, 0, '#b8643a'); tufts.put(px, g + 1.85, pz, 0.26, 0.3, 0.26, rng(), rng(), 0, rng() < 0.3 ? pick(FLOWERS) : pick(['#4a8a3a', '#6aa848', '#5a9a40'])); } }
    { const [tx, tz] = W(F, w / 2 - 1.2, 0); put2(pCyl, tx, g + 0.9, tz, 0.45, 0.8, 0.45, 0, 0, 0, '#8a5a36'); put2(pBox, tx, g + 1.7, tz, 0.12, 1.2, 0.12, 0, 0, 0, '#6a4428'); tufts.put(tx, g + 2.6, tz, 0.9, 0.8, 0.9, 0, 0, 0, '#3a7a34'); for (let k = 0; k < 6; k++) tufts.put(tx + (rng() - 0.5) * 1.2, g + 2.3 + rng() * 0.8, tz + (rng() - 0.5) * 1.2, 0.12, 0.14, 0.12, 0, 0, 0, '#f2d24a'); }
    // walls you can't walk through, and a door in the north side you can
    bc(F, 0, d / 2, w / 2, 0.15, -1, 4); bc(F, -w / 2, 0, 0.15, d / 2, -1, 4); bc(F, w / 2, 0, 0.15, d / 2, -1, 4);
    bc(F, -2.9, -d / 2, 2.1, 0.15, -1, 4); bc(F, 2.9, -d / 2, 2.1, 0.15, -1, 4);
    bp(F, pBox, 0, 1.6, -d / 2 - 0.02, 1.4, 0.12, 0.08, '#f4f0e8'); bp(F, pBox, 0, 0.5 + 2.2, -d / 2, 1.5, 0.12, 0.12, '#f4f0e8');
  }
  // the beehives below the orchard: straw skeps on a bench, lavender round about
  const hivePts = [];
  {
    const { x, z } = HIVES, g = heightAt(x, z), F = frame(x, g, z, 0.3);
    bp(F, pBox, 0, 0.62, 0, 5.2, 0.12, 0.9, '#8a5a36'); for (const q of [-2.3, 0, 2.3]) bp(F, pBox, q, 0.3, 0, 0.14, 0.6, 0.7, '#6a4428');
    bc(F, 0, 0, 2.6, 0.5, -1, 1.4);
    for (let k = 0; k < 4; k++) {
      const [hx, hz] = W(F, -1.9 + k * 1.27, 0);
      put2(pDome, hx, g + 0.68, hz, 0.52, 0.8, 0.52, 0, rng() * 6, 0, '#d8a84a');
      for (let b = 0; b < 4; b++) put2(pCyl, hx, g + 0.78 + b * 0.16, hz, 0.5 - b * 0.07, 0.04, 0.5 - b * 0.07, 0, 0, 0, '#a87830');
      const [ex, ez] = W(F, -1.9 + k * 1.27, 0.48); put2(pBox, ex, g + 0.74, ez, 0.16, 0.1, 0.06, 0, F.rot, 0, '#2a1a10');
      hivePts.push([hx, g + 1, hz]);
    }
    for (let k = 0; k < 160; k++) { const a = rng() * Math.PI * 2, r = 2 + rng() * 6, lx = x + Math.cos(a) * r, lz = z + Math.sin(a) * r; if (Math.abs(lz - z) < 1.2 && Math.abs(lx - x) < 3) continue; const gg = heightAt(lx, lz); for (let b = 0; b < 3; b++) blooms.put(lx + (rng() - 0.5) * 0.4, gg + 0.35 + b * 0.12, lz + (rng() - 0.5) * 0.4, 0.09, 0.16, 0.09, 0, 0, 0, pick(['#9a6ad8', '#8a5ac8', '#b07ae0'])); crops.put(lx, gg + 0.25, lz, 0.6, 0.5, 0.6, 0, 0, 0, '#6a8a5a'); }
  }
  // the pond: a dish of still water, lilies, reeds, stones round the rim, a bench to sit on
  {
    const wy = POND_H - 0.35;
    const pw = new THREE.Mesh(new THREE.CircleGeometry(POND.r + 0.6, 40).rotateX(-Math.PI / 2), lakeMat); pw.position.set(POND.x, wy, POND.z); pw.renderOrder = 1; scene.add(pw);
    for (let k = 0; k < 46; k++) { const a = k / 46 * Math.PI * 2 + rng() * 0.1, r = POND.r + 0.8 + rng() * 1.4, x = POND.x + Math.cos(a) * r, z = POND.z + Math.sin(a) * r, s = 0.4 + rng() * 0.7; pebbles.put(x, heightAt(x, z) + s * 0.2, z, s * 1.3, s * 0.7, s, rng(), rng(), rng(), pick(['#9a9284', '#8a8478', '#b0a898'])); }
    for (let k = 0; k < 28; k++) { const a = rng() * Math.PI * 2, r = rng() * (POND.r - 2), x = POND.x + Math.cos(a) * r, z = POND.z + Math.sin(a) * r, s = 0.5 + rng() * 0.5; pads.put(x, wy + 0.04, z, s, 1, s, 0, rng() * 6, 0, pick(['#4a8a3a', '#5a9a44', '#3e7a34'])); if (rng() < 0.35) blooms.put(x, wy + 0.18, z, 0.2, 0.14, 0.2, 0, 0, 0, pick(['#ffd0e0', '#ffffff', '#ffb0c8'])); }
    for (let k = 0; k < 22; k++) { const a = rng() * Math.PI * 2, r = POND.r - 1 + rng() * 2.4, cx = POND.x + Math.cos(a) * r, cz = POND.z + Math.sin(a) * r; for (let b = 0; b < 7; b++) { const x = cx + (rng() - 0.5) * 1.4, z = cz + (rng() - 0.5) * 1.4, hh = 1.2 + rng() * 1.2; reeds.put(x, Math.max(wy, heightAt(x, z)) + hh / 2, z, 1, hh, 1, (rng() - 0.5) * 0.2, 0, (rng() - 0.5) * 0.2, pick(['#6a8a3a', '#7a9a44', '#5a7a34'])); if (rng() < 0.3) put2(pCyl, x, Math.max(wy, heightAt(x, z)) + hh, z, 0.07, 0.35, 0.07, 0, 0, 0, '#6a4428'); } }
    const bx = POND.x + POND.r + 4, bz = POND.z - 3, bg = heightAt(bx, bz);
    put2(pBox, bx, bg + 0.5, bz, 0.7, 0.1, 2.2, 0, 0.3, 0, '#8a5a36'); put2(pBox, bx + 0.3, bg + 0.85, bz - 0.1, 0.08, 0.6, 2.2, 0, 0.3, -0.15, '#8a5a36');
    for (const q of [-0.9, 0.9]) put2(pBox, bx + Math.sin(0.3) * q, bg + 0.25, bz + Math.cos(0.3) * q, 0.6, 0.5, 0.1, 0, 0.3, 0, '#6a4428');
    col.add(bx, bz, 0.4, 1.1, 0.3, bg - 1, bg + 0.55);
  }
  // reeds and lilies along the lake shore
  for (let i = 0; i < 40000 && reeds.mesh.count < 8200; i++) {
    const x = -1080 + rng() * 830, z = -440 + rng() * 940, h = heightAt(x, z);
    if (h > -0.7 && h < 0.4 && rng() < 0.5) {
      const n = 5 + Math.floor(rng() * 8);
      for (let b = 0; b < n; b++) { const rx = x + (rng() - 0.5) * 2.2, rz = z + (rng() - 0.5) * 2.2, hh = 1.3 + rng() * 1.6, base = Math.max(WATER_LEVEL - 0.3, heightAt(rx, rz)); reeds.put(rx, base + hh / 2, rz, 1, hh, 1, (rng() - 0.5) * 0.25, 0, (rng() - 0.5) * 0.25, pick(['#6a8a3a', '#7a9a44', '#5a7a34', '#8aa04a'])); if (rng() < 0.25) put2(pCyl, rx, base + hh * 0.92, rz, 0.08, 0.4, 0.08, 0, 0, 0, '#6a4428'); }
    } else if (h > -3.2 && h < -0.9 && rng() < 0.3 && pads.mesh.count < 1500) {
      const n = 3 + Math.floor(rng() * 6);
      for (let b = 0; b < n; b++) { const px = x + (rng() - 0.5) * 5, pz = z + (rng() - 0.5) * 5, s = 0.5 + rng() * 0.7; pads.put(px, WATER_LEVEL + 0.04, pz, s, 1, s, 0, rng() * 6, 0, pick(['#4a8a3a', '#5a9a44', '#3e7a34', '#6aa04a'])); if (rng() < 0.18) blooms.put(px, WATER_LEVEL + 0.18, pz, 0.22, 0.15, 0.22, 0, 0, 0, pick(['#ffd0e0', '#ffffff', '#ffb0c8', '#ffe070'])); }
    }
  }
  // wildflowers: drifts of one colour or two across the meadows, the way they grow
  {
    const PAL = [['#f2e85a', '#ffffff'], ['#c87ae8', '#9a6ad8'], ['#5a8ae8', '#8ab0ff'], ['#ff6a4a', '#ff9a5a'], ['#ffb0d0', '#ffffff'], ['#ffffff', '#f2e85a'], ['#ff6a4a', '#f2e85a']];
    for (let i = 0; i < 160000 && blooms.mesh.count < 11000; i++) {
      const x = -320 + rng() * 860, z = -520 + rng() * 1100;
      const patch = fbm(x * 0.022 + 77, z * 0.022 - 31, 2);
      if (patch < 0.56 || rng() > smooth(0.56, 0.7, patch)) continue;
      if (!onLand(x, z) || clearOf(x, z) || !ok(x, z) || treeDensity(x, z) > 0.5) continue;
      const g = heightAt(x, z); if (g < WATER_LEVEL + 1) continue;
      const pal = PAL[Math.floor(fbm(x * 0.006 - 9, z * 0.006 + 40, 2) * 17) % PAL.length], s = 0.12 + rng() * 0.1;
      blooms.put(x, g + 0.3 + rng() * 0.45, z, s, s * 0.7, s, rng(), rng(), 0, rng() < 0.8 ? pal[0] : pal[1]);
    }
  }
  // a rope swing from the old tree by the yard
  {
    const sx = FORT_TREE.x - 2.6, sz = FORT_TREE.z + 1.5, sg = heightAt(sx, sz);
    put2(pBox, FORT_TREE.x - 1.6, sg + 7.6, sz, 3.4, 0.4, 0.4, 0, 0, -0.15, '#6b4128');
    for (const q of [-0.4, 0.4]) put2(pBox, sx, sg + 4.25, sz + q, 0.04, 6.6, 0.04, 0, 0, 0, '#d8c8a0');
    put2(pBox, sx, sg + 0.95, sz, 0.5, 0.08, 1.1, 0, 0, 0, '#8a5a36');
  }
  // the lookout and three tors on the slopes: stacked slabs, moss on their shoulders
  const tor = (x, z, n, big) => {
    const g = heightAt(x, z); let y = g - 0.6, ry = rng() * 6;
    for (let k = 0; k < n; k++) {
      const w = (big - k * big * 0.14) * (0.8 + rng() * 0.4), hh = 1.4 + rng() * 1.6, d2 = w * (0.6 + rng() * 0.3), ox = (rng() - 0.5) * w * 0.3, oz = (rng() - 0.5) * w * 0.3;
      put2(pBox, x + ox, y + hh / 2, z + oz, w, hh, d2, (rng() - 0.5) * 0.12, ry + (rng() - 0.5) * 0.5, (rng() - 0.5) * 0.12, pick(['#9a9284', '#8a8478', '#a8a090', '#948c80']));
      col.add(x + ox, z + oz, w / 2, d2 / 2, ry, g - 1, y + hh);
      if (rng() < 0.7) tufts.put(x + ox, y + hh + 0.05, z + oz, w * 0.36, 0.22, d2 * 0.36, 0, ry, 0, pick(['#5a8a3a', '#6a9a40', '#7aa84a']));
      y += hh * 0.92; ry += (rng() - 0.5) * 0.6;
    }
    for (let k = 0; k < 8; k++) { const a = rng() * Math.PI * 2, r = big * (0.8 + rng()), s = 0.6 + rng() * 1.6, rx = x + Math.cos(a) * r, rz = z + Math.sin(a) * r; rocks.put(rx, heightAt(rx, rz) + s * 0.25, rz, s * 1.3, s * 0.7, s, rng(), rng(), rng(), pick(['#9a9284', '#8a8478', '#a8a090'])); }
  };
  tor(OUTCROP.x - 14, OUTCROP.z + 10, 4, 6.5); tor(OUTCROP.x + 16, OUTCROP.z - 8, 3, 5);
  tor(430, -310, 4, 6); tor(-60, -390, 3, 5.5); tor(300, 340, 5, 6.5); tor(-180, 300, 3, 4.5);
  // birds: a few over the lake and the slope, and a wheeling flock of great birds round the Elder's crown
  const birdW = new THREE.BufferGeometry();
  birdW.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.25, 0, 0, 0.3, 1, 0, -0.05, 0, 0, 0.3, 0, 0, -0.25, 1, 0, -0.05], 3)); birdW.computeVertexNormals();
  const birdMesh = new THREE.InstancedMesh(birdW, toon(0xffffff, { side: THREE.DoubleSide }), 120); birdMesh.frustumCulled = false; scene.add(birdMesh);
  const birds = [];
  for (let i = 0; i < 16; i++) birds.push({ cx: -260 + rng() * 420, cz: -160 + rng() * 360, r: 40 + rng() * 70, y: 40 + rng() * 40, sp: 0.18 + rng() * 0.12, ph: rng() * 6, s: 0.9 + rng() * 0.4, c: rng() < 0.6 ? '#f4f4f0' : '#3a3a40', dir: rng() < 0.5 ? 1 : -1 });
  for (const C of colossi) for (let i = 0; i < 12; i++) birds.push({ cx: C.x, cz: C.z, r: 140 + rng() * 120, y: C.g + C.H * (0.55 + rng() * 0.4), sp: 0.05 + rng() * 0.04, ph: rng() * 6, s: 3.5 + rng() * 2, c: rng() < 0.5 ? '#2a2a34' : '#f0e8d8', dir: C.id === 'elder' ? 1 : -1 });
  birds.forEach((b, i) => { birdMesh.setColorAt(i * 2, C2.set(b.c)); birdMesh.setColorAt(i * 2 + 1, C2.set(b.c)); });
  birdMesh.count = birds.length * 2;
  for (const k of [pBox, pCyl, pPyr, pCone, pPrism, pPane, pLamp, pGlass, pDome, pebbles, blooms, reeds, pads]) k.done();

  blocks.done(); trunks.done(); cones.done(); crowns.done(); tufts.done(); crops.done(); rocks.done();
  const grass = buildGrass(scene, rng, (x, z) => onLand(x, z) && heightAt(x, z) > WATER_LEVEL + 0.6 && pathDist(x, z) > 2.5 && laneDist(x, z) > 2 && Math.hypot(x - YARD.x, z - YARD.z) > 20 && !inField(x, z) && !nearBuildings(x, z, -60) && Math.hypot(x - POND.x, z - POND.z) > POND.r + 0.5,
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
    { key: 'p_yard', x: TIMBER.x - 6, z: TIMBER.z - 8 },
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
    shadeAt: (x, z) => Math.max(shadeAt(x, z), canopyShade(x, z)), path: PATH, colossi,
    // the token bench in the workshop wing (a room of the big house's interior): room-space coordinates, relative to the
    // interior's group; interiors.spot('tokenBench') gives the same in world space once you're inside
    tokenBench: { doorId: 'p_workshop', roomId: 'p_house', stand: { ...MANOR_SPOTS.tokenBench.stand }, top: { ...MANOR_SPOTS.tokenBench.top }, buhkon: { ...MANOR_SPOTS.tokenBench.buhkon }, yaw: MANOR_SPOTS.tokenBench.yaw },
    workshop: { x: WORKSHOP.x, z: WORKSHOP.z, door: { x: workDoor.x, z: workDoor.z } }, crestPoint: new THREE.Vector3(CREST.x, heightAt(CREST.x, CREST.z), CREST.z), dockPoint: new THREE.Vector3(DOCK.x, WATER_LEVEL + 1, DOCK.z),
    pathStart: new THREE.Vector3(1120, heightAt(1120, 32), 32),
    update(t, dt, particles, camPos, night = 0) {
      grass.material.userData.shader && (grass.material.userData.shader.uniforms.uTime.value = t);
      flowers.forEach(f => { if (f.ready) f.grp.rotation.y = t * 0.5; });
      fire.scale.setScalar(3 + Math.sin(t * 11) * 0.25);
      for (let i = 0; i < washing.length; i++) washing[i].rotation.z = Math.sin(t * 1.6 + i * 0.9) * 0.16 + 0.08;
      if (towerFlag) towerFlag.rotation.y = Math.sin(t * 2.1) * 0.35;
      for (const o of colMists) { const a = o.a + t * o.sp; o.m.position.set(o.cx + Math.cos(a) * o.d, o.y + Math.sin(t * 0.05 + o.a) * 6, o.cz + Math.sin(a) * o.d); }
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i], a = b.ph + t * b.sp * b.dir, x = b.cx + Math.cos(a) * b.r, z = b.cz + Math.sin(a) * b.r, y = b.y + Math.sin(t * 0.4 + b.ph) * 4;
        const yaw = Math.atan2(-Math.sin(a) * b.dir, Math.cos(a) * b.dir), big = b.s > 2, beat = Math.sin(t * (big ? 2.2 : 7.5) + b.ph * 3);
        const flap = big ? (Math.sin(t * 0.3 + b.ph) > 0.3 ? beat * 0.55 : 0.12) : beat * 0.6, bank = -b.dir * (big ? 0.25 : 0.35);
        for (const side of [1, -1]) {
          E2.set(0, yaw, bank + side * flap); Q2.setFromEuler(E2);
          M2.compose(P2.set(x, y, z), Q2, S2.set(side * b.s, b.s, b.s)); birdMesh.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), M2);
        }
      }
      birdMesh.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < halos.length; i += 1) halos[i].material.opacity = 0.28 + 0.14 * Math.sin(t * 0.9 + i * 1.7);
      for (let i = 0; i < colHalos.length; i++) colHalos[i].material.opacity = (colHalos[i].userData.base || 0) * (0.75 + 0.25 * Math.sin(t * 0.7 + i * 2.3));
      // the bioluminescence comes up with the dark: toadstools, the lake, fireflies
      const n = night;
      if (Math.abs(n - t0.night) > 0.01) {
        t0.night = n;
        for (const s of shrooms) s.material.opacity = n * 0.75;
        shroomMats.forEach(m => { m.emissiveIntensity = 0.15 + n * 1.4; });
        lakeMat.emissive.setHex(n > 0.3 ? 0x1a8aa8 : 0x0e4a62); lakeMat.emissiveIntensity = 0.35 + n * 0.55;
        for (const w of glowWindows) w.material.color.setHex(n > 0.4 ? 0xffc870 : 0xffd890);
        colGlowMat.color.setScalar(0.16 + 0.84 * n);   // the colossi's light: lichen-dim by day, bright by night
        lampMat.color.setScalar(0.45 + 0.8 * n);
        for (const s of lampGlows) s.material.opacity = n * 0.85;
        for (const o of colMists) { o.m.material.opacity = o.o0 * (1 - 0.7 * n); o.m.material.color.setHex(n > 0.5 ? 0x8a9ab8 : 0xeef4f8); }
        for (let i = 0; i < colHalos.length; i++) colHalos[i].userData.base = n * 0.55;
      }
      if (particles) {
        if (Math.random() < 0.6) particles.emit(hearth.x + (Math.random() - 0.5) * 0.8, heightAt(hearth.x, hearth.z) + 0.8, hearth.z + (Math.random() - 0.5) * 0.8, { vx: 0, vy: 2 + Math.random(), vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: 0.35, life: 0.9, drag: 0.5 });
        for (const [cx, cy, cz] of chimneys) if (Math.random() < 0.22) particles.emit(cx + (Math.random() - 0.5) * 0.4, cy, cz + (Math.random() - 0.5) * 0.4, { vx: 0.5 + Math.random() * 0.3, vy: 1.1 + Math.random() * 0.5, vz: 0.2, color: 0xd8d0c8, size: 1.1 + Math.random() * 0.5, life: 3, drag: 0.25 });
        if (camPos) {
          if (Math.abs(camPos.x - HIVES.x) < 40 && Math.abs(camPos.z - HIVES.z) < 40 && Math.random() < 0.5) { const h = hivePts[Math.floor(Math.random() * hivePts.length)]; particles.emit(h[0] + (Math.random() - 0.5) * 3, h[1] + Math.random() * 1.5, h[2] + (Math.random() - 0.5) * 3, { vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 0.6, vz: (Math.random() - 0.5) * 2, color: 0xffd040, size: 0.08, life: 1.6, drag: 0.2 }); }
          const sh = shadeAt(camPos.x, camPos.z);   // spores drifting in the deepwood's own light
          if (sh > 0.2 && Math.random() < sh * 1.6) particles.emit(camPos.x + (Math.random() - 0.5) * 36, camPos.y - 2 + Math.random() * 10, camPos.z + (Math.random() - 0.5) * 36, { vx: (Math.random() - 0.5) * 0.3, vy: 0.1 + Math.random() * 0.2, vz: (Math.random() - 0.5) * 0.3, color: 0xbfeee6, size: 0.14 + Math.random() * 0.14, life: 4 + Math.random() * 3, drag: 0 });
          if (Math.random() < 0.35) particles.emit(camPos.x + (Math.random() - 0.5) * 40, camPos.y + (Math.random() - 0.5) * 12, camPos.z + (Math.random() - 0.5) * 40, { vx: 0.4, vy: 0.15, vz: 0.1, color: 0xffe0a0, size: 0.12, life: 5, drag: 0 });
          if (n > 0.3 && Math.random() < n) particles.emit(camPos.x + (Math.random() - 0.5) * 50, camPos.y - 1 + Math.random() * 4, camPos.z + (Math.random() - 0.5) * 50, { vx: (Math.random() - 0.5) * 0.5, vy: 0.2, vz: (Math.random() - 0.5) * 0.5, color: Math.random() < 0.6 ? 0xc8ff6a : 0x6ae8ff, size: 0.22, life: 3, drag: 0 });
        }
      }
    },
  };
}
