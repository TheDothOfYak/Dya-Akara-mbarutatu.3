/* ============================================================
   THE ASHEN REACH — AAKALAY. A dead city of sandstone on the
   planet Xikia: stygian shards in the dust, a fire tree in the
   north grove, the Oath Stone in the old Zahreh plaza. Around
   the broken walls the Reach runs on — abandoned outskirts, the
   russet and ember woods, the ash flats, old garden plots gone
   to seed, the Oath Mere below the pier, and hills that climb
   to ash-grey ridges, a chasm and sheer cliffs. A few islets
   still drift in the sky.
   ============================================================ */
import * as THREE from 'three';
import { mulberry32, fbm, smooth, lerp, clamp } from './util.js';
import { toon, ramp, glowSprite, outlineAll, addOutline } from './gfx.js';
import { Colliders, Kit, buildGrass, STEP } from './terrain.js';
export { STEP };

const PLAZA = { x: 0, z: -10 };
const PLAZA_H = 1.2;
const TAU = Math.PI * 2;
const LEVEL = 0;                         // the water table of the Reach
const WADE = 1.4;                        // deeper than this and you can't wade
const SWIM = 1.6;                        // deep enough for swimmers

/* the old island rim — the city was laid out inside it, and the pier still hangs off it */
function oldEdge(x, z) {
  const a = Math.atan2(z, x);
  return 174 + (fbm(Math.cos(a) * 2.2 + 5, Math.sin(a) * 2.2 + 5, 3) - 0.5) * 42 + (fbm(Math.cos(a) * 9 + 1, Math.sin(a) * 9, 2) - 0.5) * 10;
}

/* ---------------- the barrier ring: ridges, the Rend (a chasm), the Western Scarp ---------------- */
const angDist = (a, b) => { let d = Math.abs(a - b) % TAU; return d > Math.PI ? TAU - d : d; };
const LIM_N = 720, LIM = new Float32Array(LIM_N + 1), W_CH = new Float32Array(LIM_N + 1), W_CL = new Float32Array(LIM_N + 1);
for (let i = 0; i <= LIM_N; i++) {
  const a = i / LIM_N * TAU - Math.PI, ca = Math.cos(a), sa = Math.sin(a);
  LIM[i] = 466 + (fbm(ca * 1.8 + 9, sa * 1.8 + 9, 3) - 0.5) * 70 + smooth(0.95, 0.35, angDist(a, Math.PI / 2)) * 50;
  W_CH[i] = smooth(0.8, 0.45, angDist(a, -0.45));           // the Rend, east / north-east
  W_CL[i] = smooth(0.95, 0.6, angDist(a, Math.PI));        // the Western Scarp
}
function lut(arr, a) { const f = (a + Math.PI) / TAU * LIM_N, i = Math.max(0, Math.min(LIM_N - 1, Math.floor(f))), t = f - i; return arr[i] + (arr[i + 1] - arr[i]) * t; }
const limitR = (x, z) => lut(LIM, Math.atan2(z, x));
function edgeRadius(x, z) { return limitR(x, z); }

/* ---------------- zones ---------------- */
const ZONES = [
  { id: 'outskirts', name: 'The Western Outskirts', x: -245, z: 40, r: 75, biome: 'ruins' },
  { id: 'flooded', name: 'The Flooded Quarter', x: 212, z: 96, r: 55, biome: 'lake' },
  { id: 'russet', name: 'The Russet Wood', x: -235, z: -190, r: 105, biome: 'forest' },
  { id: 'emberwood', name: 'The Ember Wood', x: 275, z: 262, r: 90, biome: 'forest' },
  { id: 'ashflats', name: 'The Ash Flats', x: 245, z: -185, r: 105, biome: 'ash' },
  { id: 'greyback', name: 'The Greyback Hills', x: -40, z: -330, r: 110, biome: 'hills' },
  { id: 'allotments', name: 'The Old Allotments', x: -205, z: 238, r: 72, biome: 'meadow' },
  { id: 'mere', name: 'The Oath Mere', x: 20, z: 306, r: 125, biome: 'lake' },
  { id: 'reeds', name: 'The Reed Shore', x: -150, z: 345, r: 55, biome: 'shore' },
  { id: 'palemeadow', name: 'The Pale Meadow', x: -305, z: -28, r: 60, biome: 'meadow' },
  { id: 'crags', name: 'The Kuni Crags', x: 118, z: -298, r: 70, biome: 'mountain' },
];
const ZI = Object.fromEntries(ZONES.map(z => [z.id, z]));
const zw = (id, x, z) => { const Z = ZI[id]; return smooth(Z.r, Z.r * 0.45, Math.hypot(x - Z.x, z - Z.z)); };

const SPIRE = { x: 150, z: -330 };       // the Kuni Spire, a needle of ash-grey rock
const DIPS = [{ x: -54, z: 82, r: 26, depth: 3.2 }];   // the Sunken Zahreh Garden

/* ---------------- water ---------------- */
const NORTH_A = -Math.PI / 2 + 0.09, WEST_A = Math.PI - 0.16;
const tarnR = lut(LIM, NORTH_A) - 34, poolR = lut(LIM, WEST_A) - 26;
const BODIES = [
  { kind: 'ell', x: 20, z: 306, rx: 150, rz: 126, deep: 24, name: 'The Oath Mere' },
  { kind: 'disc', x: 212, z: 96, r: 44, deep: 6 },                                  // the flooded quarter
  { kind: 'seg', ax: 212, az: 96, bx: 158, bz: 198, r: 6, deep: 1.25 },              // the old canal, silted to the knee
  { kind: 'seg', ax: 158, az: 198, bx: 112, bz: 262, r: 6, deep: 1.25 },
  { kind: 'disc', x: -282, z: -58, r: 24, deep: 4.5 },                              // the Pale Meadow pool
  { kind: 'disc', x: -205, z: -238, r: 14, deep: 3 },                               // a pond in the Russet Wood
  { kind: 'disc', x: Math.cos(NORTH_A) * tarnR, z: Math.sin(NORTH_A) * tarnR, r: 22, deep: 7 },   // the Ashfall Tarn under the north falls
  { kind: 'disc', x: Math.cos(WEST_A) * poolR, z: Math.sin(WEST_A) * poolR, r: 16, deep: 3.5 },   // the pool under the Scarp falls
];
function bodyE(b, x, z) {
  if (b.kind === 'ell') {
    const dx = (x - b.x) / b.rx, dz = (z - b.z) / b.rz;
    if (Math.abs(dx) > 1.6 || Math.abs(dz) > 1.6) return 9;
    return Math.hypot(dx, dz) + (fbm(x * 0.01 + 40, z * 0.01 - 3, 2) - 0.5) * 0.22;
  }
  if (b.kind === 'disc') return Math.hypot(x - b.x, z - b.z) / b.r;
  const vx = b.bx - b.ax, vz = b.bz - b.az, t = clamp(((x - b.ax) * vx + (z - b.az) * vz) / (vx * vx + vz * vz), 0, 1);
  return Math.hypot(x - b.ax - vx * t, z - b.az - vz * t) / b.r;
}
function minE(x, z) { let m = 9; for (const b of BODIES) { const e = bodyE(b, x, z); if (e < m) m = e; } return m; }

/* flat places kept for Ju plots and Albali trees (target heights filled in below) */
const JU = [{ x: -215, z: 222, r: 8 }, { x: -186, z: 252, r: 7 }, { x: -234, z: 262, r: 7 }];
const ALBALI = [{ x: -166, z: 210 }, { x: -312, z: -4 }, { x: -72, z: -272 }, { x: 290, z: 212 }, { x: 212, z: -150 }];
const FLATS = [];

/* ---------------- the landform ---------------- */
function baseH(x, z) {
  const r = Math.hypot(x, z);
  let h = (fbm(x * 0.011 + 3, z * 0.011 - 7, 4) - 0.5) * 16 + (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 2.2;
  // the north rises toward the grove and the cliff shrine
  h += smooth(20, -150, z) * 6;
  // out past the old walls the Reach rolls on
  const w = smooth(170, 260, r);
  if (w > 0) {
    h += (fbm(x * 0.006 + 21, z * 0.006 - 4, 3) - 0.5) * 22 * w;
    const g = zw('greyback', x, z);
    if (g > 0) h += g * fbm(x * 0.022 + 5, z * 0.022 + 5, 3) * 30;
    const cr = zw('crags', x, z);
    if (cr > 0) h += cr * fbm(x * 0.03 + 1, z * 0.03 + 9, 2) * 22;
    const ash = zw('ashflats', x, z);
    if (ash > 0) h = lerp(h, 3 + (fbm(x * 0.04, z * 0.04, 2) - 0.5) * 1.6, ash * 0.85);
    const mead = Math.max(zw('allotments', x, z), zw('palemeadow', x, z));
    if (mead > 0) h = lerp(h, 2 + (fbm(x * 0.02 + 7, z * 0.02, 2) - 0.5) * 3, mead * 0.6);
    // the Kuni Spire
    const ds = Math.hypot(x - SPIRE.x, z - SPIRE.z);
    if (ds < 34) h += 78 * Math.pow(smooth(34, 3.5, ds), 1.3) + smooth(30, 8, ds) * (fbm(x * 0.2, z * 0.2, 2) - 0.5) * 8;
    // the barrier
    const L = limitR(x, z), d = r - L;
    if (d > -10) {
      const a = Math.atan2(z, x), wC = lut(W_CH, a), wW = lut(W_CL, a);
      const n = fbm(x * 0.02 + 7, z * 0.02 + 3, 3);
      const rid = 1 - Math.abs(fbm(x * 0.004 + 2, z * 0.004 + 8, 4) * 2 - 1);
      const far = smooth(40, 700, d) * (50 + rid * 250) + (n - 0.5) * 30 * smooth(0, 60, d);
      const ridge = smooth(-10, 42, d) * (58 + n * 34) + far;
      const cliff = smooth(-1, 8, d) * (44 + n * 16) + far;
      const chasm = -smooth(-3, 5, d) * smooth(46, 34, d) * 110 + smooth(34, 48, d) * (36 + n * 20) + far;
      h += wC * chasm + wW * cliff + (1 - wC - wW) * ridge;
    }
  }
  // flatten the plaza
  const dp = Math.hypot(x - PLAZA.x, z - PLAZA.z);
  h = lerp(h, PLAZA_H, smooth(44, 28, dp));
  // flatten the dock approach
  const dd = Math.abs(x) < 30 ? Math.abs(x) : 99;
  if (z > 120) h = lerp(h, 0.6, smooth(16, 6, dd) * smooth(120, 150, z));
  for (const dp of DIPS) { const k = smooth(dp.r, dp.r * 0.55, Math.hypot(x - dp.x, z - dp.z)); h -= k * dp.depth; }
  return h;
}
for (const f of JU) FLATS.push({ x: f.x, z: f.z, r: f.r + 3, h: baseH(f.x, f.z) });
for (const f of ALBALI) FLATS.push({ x: f.x, z: f.z, r: 9, h: baseH(f.x, f.z) });

export function heightAt(x, z) {
  let h = baseH(x, z);
  for (const f of FLATS) { const dx = x - f.x, dz = z - f.z; if (dx * dx + dz * dz < (f.r + 9) * (f.r + 9)) h = lerp(h, f.h, smooth(f.r + 9, f.r, Math.hypot(dx, dz))); }
  // water beds
  let out = null;
  for (const b of BODIES) {
    const e = bodyE(b, x, z);
    if (e >= 1.35) continue;
    let target;
    if (e < 1) target = LEVEL + 1.0 - (b.deep + 1.0) * Math.pow(smooth(1, 0.3, e), 1.3);
    else target = LEVEL + 1.0 + (e - 1) * 6;
    const c = lerp(h, target, smooth(1.35, 1.0, e));
    out = out === null ? c : Math.min(out, c);
  }
  if (out !== null) h = out;
  return Math.max(h, -180);
}

/* ---------------- the rules of the land (pure) ---------------- */
let PIER_BOX = null;      // set once the pier is laid
function waterDepth(x, z) { return minE(x, z) < 1 ? Math.max(0, LEVEL - heightAt(x, z)) : 0; }
function onPier(x, z) { return PIER_BOX && Math.abs(x) < PIER_BOX.hw && z > PIER_BOX.z0 && z < PIER_BOX.z1; }
function inBounds(x, z) {
  if (onPier(x, z)) return true;
  if (Math.hypot(x, z) > limitR(x, z) - 3) return false;
  if (Math.hypot(x - SPIRE.x, z - SPIRE.z) < 22) return false;
  return waterDepth(x, z) <= WADE;
}
function barrierLine(x, z) {
  if (Math.hypot(x - SPIRE.x, z - SPIRE.z) < 24) return 'The crag goes straight up. Only wings get up there.';
  if (Math.hypot(x, z) <= limitR(x, z) - 3 && waterDepth(x, z) > WADE) return 'The water’s too deep to wade.';
  const a = Math.atan2(z, x), wC = lut(W_CH, a), wW = lut(W_CL, a);
  if (wC > 0.5) return 'The Rend drops away into nothing. No way across.';
  if (wW > 0.5) return 'The scarp is sheer. Nothing to climb, nowhere to go.';
  return 'The ridge is too sheer to climb.';
}


const STONE = ['#dcbd8c', '#cfa977', '#c39a68', '#e6cba0', '#b98e60', '#d6b07d'];
const MOSS = ['#7f8f3a', '#6d7f34', '#93a046'];

/* open ground kept clear for the camp and the Kalo Trials */
export const CAMP = { x: -28, z: 108 };
const CLEAR = [{ x: CAMP.x, z: CAMP.z, r: 30 }, { x: -36, z: -100, r: 15 }, { x: 100, z: -40, r: 15 }, { x: -100, z: 40, r: 15 }];

/* ================================================================= */
export function buildWorld(scene) {
  const rng = mulberry32(1307);
  const pick = a => a[Math.floor(rng() * a.length)];
  const col = new Colliders(heightAt);

  /* places that matter */
  const SITES = {
    library: { name: 'The Drowned Library', x: -84, z: 14 },
    tower: { name: 'The Watch of Aakalay', x: 90, z: 36 },
    grove: { name: 'The Fire Tree Grove', x: 70, z: -92 },
    shrine: { name: 'The Cliff Shrine', x: -104, z: -96 },
    garden: { name: 'The Sunken Zahreh Garden', x: -54, z: 82 },
  };

  /* ---------- terrain ---------- */
  const c = new THREE.Color(), grassA = new THREE.Color('#a3ad4f'), grassB = new THREE.Color('#c6a14a'), grassC = new THREE.Color('#7f9a45'),
    dirt = new THREE.Color('#c99f6a'), pave = new THREE.Color('#d8bf94');
  const TC = Object.fromEntries(Object.entries({
    litter: '#b5652c', litter2: '#8f4c26', ash: '#a29d95', ash2: '#7e7973', meadow: '#bdb65a', sand: '#d2bb8c', bed: '#6a7864', bed2: '#3c5560',
    rock: '#938e87', rockD: '#6b6762', ridge: '#8a857f', ridgeD: '#5f5b57', abyss: '#2e2a28', snow: '#ebe7df', soil: '#6a4630', foot: '#8a6a3c',
  }).map(([k, v]) => [k, new THREE.Color(v)]));
  const segDist = (list, x, z) => {
    let best = 1e9;
    for (const [ax, az, bx, bz] of list) {
      const vx = bx - ax, vz = bz - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
      best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
    }
    return best;
  };
  const roads = [[0, 175, 0, 20], [0, -40, 0, -150], [-96, 16, 96, 36], [-54, 82, 0, 90], [70, -92, 22, -30], [-104, -96, -22, -30]];
  const roadDist = (x, z) => segDist(roads, x, z);
  /* old tracks running out into the Reach */
  const TRAILS = [[-96, 16, -245, 40], [-54, 82, -205, 235], [0, -150, -40, -330], [96, 36, 200, 80], [70, -92, 235, -180],
    [-20, 175, -140, 330], [100, 120, 270, 262], [-104, -96, -235, -190], [-245, 40, -290, -45]];
  const trailDist = (x, z) => segDist(TRAILS, x, z);

  function paint(x, z, y, ny) {
    const r = Math.hypot(x, z);
    const n = fbm(x * 0.03 + 11, z * 0.03, 3), n2 = fbm(x * 0.12, z * 0.12, 2);
    c.copy(grassA).lerp(grassB, smooth(0.45, 0.7, n)).lerp(grassC, smooth(0.5, 0.25, n2) * 0.6);
    const w = smooth(165, 240, r);
    if (w > 0) {
      const fo = Math.max(zw('russet', x, z), zw('emberwood', x, z));
      if (fo > 0) c.lerp(n2 > 0.5 ? TC.litter : TC.litter2, fo * 0.7 * w);
      const me = Math.max(zw('allotments', x, z), zw('palemeadow', x, z));
      if (me > 0) c.lerp(TC.meadow, me * 0.45 * w);
      const as = zw('ashflats', x, z);
      if (as > 0) c.lerp(n2 > 0.5 ? TC.ash : TC.ash2, Math.min(1, as * 1.3) * 0.92 * w);
      c.lerp(dirt, smooth(5, 2.5, trailDist(x, z)) * 0.7 * w);
    }
    c.lerp(dirt, smooth(6, 3, roadDist(x, z)) * 0.85);
    c.lerp(pave, smooth(30, 26, Math.hypot(x - PLAZA.x, z - PLAZA.z)));
    for (const f of JU) { const d = Math.hypot(x - f.x, z - f.z); if (d < f.r + 2) c.lerp(TC.soil, smooth(f.r + 1.5, f.r - 0.5, d) * 0.85 * (0.75 + 0.25 * Math.sin((x - f.x) * 2.2))); }
    if (y < LEVEL + 1.6) {
      c.lerp(TC.sand, smooth(LEVEL + 1.6, LEVEL + 0.5, y) * 0.8);
      c.lerp(TC.bed, smooth(LEVEL - 0.3, LEVEL - 3, y)); c.lerp(TC.bed2, smooth(LEVEL - 3, LEVEL - 14, y));
    }
    c.lerp(n > 0.5 ? TC.rock : TC.rockD, smooth(0.8, 0.55, ny));
    const d = r - limitR(x, z);
    if (d > -8) {
      c.lerp(n2 > 0.45 ? TC.ridge : TC.ridgeD, smooth(-8, 16, d) * (0.6 + 0.4 * smooth(0.9, 0.6, ny)));
      if (d > 50) {
        c.lerp(TC.foot, smooth(0.8, 0.95, ny) * smooth(120, 40, y) * 0.55);
        c.lerp(TC.snow, smooth(190, 260, y + n * 40) * smooth(0.55, 0.8, ny));
      }
      if (y < -8) c.lerp(TC.abyss, smooth(-8, -60, y));
    }
  }

  /* the land is two meshes: a fine 2 m grid over the old city and the pier, and a graded grid
     (4 m near the city, 9 m at the barrier, stretching out to the horizon) around it.
     The two share every coarse vertex on their seam, so there are no cracks. */
  const IN = { x0: -184, x1: 184, z0: -184, z1: 232 };
  function axis(lo, hi) {
    const a = [];
    for (let p = lo; p <= hi + 1e-6; p += 8) a.push(p);
    const grow = (start, dir) => {
      const o = []; let p = start, s = 4;
      while (Math.abs(p) < 2400) { const ap = Math.abs(p); s = ap < 600 ? lerp(4.5, 10, clamp((ap - 190) / 410, 0, 1)) : s * 1.14; p += dir * s; o.push(p); }
      return o;
    };
    return [...grow(lo, -1).reverse(), ...a, ...grow(hi, 1)];
  }
  const landMat = toon(0xffffff, { vertexColors: true });
  function gridMesh(xs, zs, skip, yAt) {
    const nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3), idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = (j * nx + i) * 3; pos[k] = xs[i]; pos[k + 1] = yAt(xs[i], zs[j], i, j); pos[k + 2] = zs[j];
    }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      if (skip && skip(xs[i], xs[i + 1], zs[j], zs[j + 1])) continue;
      const a = j * nx + i, b = a + 1, cc = a + nx, d = cc + 1;
      idx.push(a, cc, b, b, cc, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const nrm = g.attributes.normal, col3 = new Float32Array(nx * nz * 3);
    for (let v = 0; v < nx * nz; v++) {
      paint(pos[v * 3], pos[v * 3 + 2], pos[v * 3 + 1], nrm.getY(v));
      col3[v * 3] = c.r; col3[v * 3 + 1] = c.g; col3[v * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col3, 3));
    const m = new THREE.Mesh(g, landMat); m.receiveShadow = true; scene.add(m);
    return m;
  }
  const fineX = [], fineZ = [];
  for (let x = IN.x0; x <= IN.x1; x += 2) fineX.push(x);
  for (let z = IN.z0; z <= IN.z1; z += 2) fineZ.push(z);
  const terrain = gridMesh(fineX, fineZ, null, (x, z, i, j) => {
    // seam vertices that fall between coarse ones take the coarse edge's straight line
    const edgeZ = j === 0 || j === fineZ.length - 1, edgeX = i === 0 || i === fineX.length - 1;
    if (edgeZ && (x - IN.x0) % 8) { const xa = IN.x0 + Math.floor((x - IN.x0) / 8) * 8; return lerp(heightAt(xa, z), heightAt(xa + 8, z), (x - xa) / 8); }
    if (edgeX && (z - IN.z0) % 8) { const za = IN.z0 + Math.floor((z - IN.z0) / 8) * 8; return lerp(heightAt(x, za), heightAt(x, za + 8), (z - za) / 8); }
    return heightAt(x, z);
  });
  const terrainOuter = gridMesh(axis(IN.x0, IN.x1), axis(IN.z0, IN.z1),
    (x0, x1, z0, z1) => x0 >= IN.x0 && x1 <= IN.x1 && z0 >= IN.z0 && z1 <= IN.z1, (x, z) => heightAt(x, z));

  /* ---------- water: the Oath Mere, the flooded quarter, the canal, pools and the tarn ---------- */
  const ripTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d'); g.fillStyle = '#9fd0dc'; g.fillRect(0, 0, 128, 128);
    const r2 = mulberry32(77);
    for (let k = 0; k < 70; k++) {
      g.strokeStyle = r2() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(40,90,110,0.25)'; g.lineWidth = 1 + r2() * 1.5;
      const x = r2() * 128, y = r2() * 128, l = 6 + r2() * 14;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 2, x + l, y); g.stroke();
      g.beginPath(); g.moveTo(x - 128, y); g.quadraticCurveTo(x - 128 + l / 2, y - 2, x - 128 + l, y); g.stroke();
    }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  let waterMesh = null;
  const waterMat = new THREE.MeshToonMaterial({ color: 0x4f98b0, emissive: 0x0c3c4c, emissiveIntensity: 0.5, gradientMap: ramp(), map: ripTex });
  {
    const pos = [], idx = [];
    const addGeo = (g) => {
      const base = pos.length / 3, p = g.attributes.position;
      for (let i = 0; i < p.count; i++) pos.push(p.getX(i), LEVEL, p.getZ(i));
      const ix = g.index.array; for (let i = 0; i < ix.length; i++) idx.push(base + ix[i]);
    };
    for (const b of BODIES) {
      let g;
      if (b.kind === 'ell') { g = new THREE.CircleGeometry(1, 96); g.rotateX(-Math.PI / 2); g.scale(b.rx * 1.16, 1, b.rz * 1.16); g.translate(b.x, 0, b.z); }
      else if (b.kind === 'disc') { g = new THREE.CircleGeometry(b.r * 1.03, 40); g.rotateX(-Math.PI / 2); g.translate(b.x, 0, b.z); }
      else {
        const len = Math.hypot(b.bx - b.ax, b.bz - b.az);
        g = new THREE.PlaneGeometry(len + b.r * 1.5, b.r * 2.05); g.rotateX(-Math.PI / 2);
        g.rotateY(-Math.atan2(b.bz - b.az, b.bx - b.ax)); g.translate((b.ax + b.bx) / 2, 0, (b.az + b.bz) / 2);
      }
      addGeo(g); g.dispose();
    }
    const uv = [];
    for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] / 22, pos[i + 2] / 22);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    waterMesh = new THREE.Mesh(g, waterMat); waterMesh.receiveShadow = true; scene.add(waterMesh);
  }

  /* ---------- kits ---------- */
  const blocks = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 6500);
  const columns = new Kit(scene, new THREE.CylinderGeometry(1, 1.08, 1, 10), toon(0xffffff), 600);
  const trunks = new Kit(scene, new THREE.CylinderGeometry(0.7, 1, 1, 7), toon(0xffffff), 300);
  const crowns = new Kit(scene, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff, {}), 1600);
  const rocks = new Kit(scene, new THREE.DodecahedronGeometry(1, 0), toon(0xffffff, {}), 500);

  /* a solid block standing on the ground; registers a collider */
  function block(x, z, w, d, h, ang = 0, color, opts = {}) {
    const g = opts.base ?? Math.min(heightAt(x - w / 2, z - d / 2), heightAt(x + w / 2, z + d / 2), heightAt(x - w / 2, z + d / 2), heightAt(x + w / 2, z - d / 2), heightAt(x, z));
    const bot = g - (opts.sink ?? 1.2), top = (opts.base ?? heightAt(x, z)) + h;
    blocks.put(x, (bot + top) / 2, z, w, top - bot, d, 0, ang, 0, color || pick(STONE));
    if (opts.moss && rng() < opts.moss) blocks.put(x, top + 0.08, z, w * 1.04, 0.2, d * 1.04, 0, ang, 0, pick(MOSS));
    if (!opts.noCol) col.add(x, z, w / 2, d / 2, ang, bot, top);
    return top;
  }
  function column(x, z, r, h, opts = {}) {
    const g = heightAt(x, z) - 0.5, top = (opts.base ?? heightAt(x, z)) + h;
    columns.put(x, (g + top) / 2, z, r, top - g, r, 0, rng() * 6, 0, opts.color || pick(STONE));
    blocks.put(x, g + 0.6, z, r * 2.6, 1.2, r * 2.6, 0, 0, 0, pick(STONE));
    if (!opts.broken) blocks.put(x, top + 0.25, z, r * 2.5, 0.5, r * 2.5, 0, 0, 0, pick(STONE));
    col.add(x, z, r * 0.95, r * 0.95, 0, g, top + 0.5);
    return top;
  }

  /* a wall from (ax,az) to (bx,bz), made of broken segments */
  function wall(ax, az, bx, bz, hMin, hMax, opts = {}) {
    const len = Math.hypot(bx - ax, bz - az), ang = -Math.atan2(bz - az, bx - ax);
    const n = Math.max(1, Math.round(len / 2.4)), seg = len / n;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      if (opts.door != null && Math.abs(t - opts.door) < 1.6 / len) continue;
      if (rng() < (opts.gaps ?? 0.12)) continue;
      const h = hMin + Math.pow(rng(), 1.4) * (hMax - hMin);
      block(ax + (bx - ax) * t, az + (bz - az) * t, seg + 0.02, opts.thick ?? 0.9, h, ang, null, { moss: 0.35 });
    }
  }

  function house(cx, cz, w, d, hMax, rot) {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const P = (lx, lz) => [cx + lx * cs + lz * sn, cz - lx * sn + lz * cs];
    const corners = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
    const doorSide = Math.floor(rng() * 4);
    for (let s = 0; s < 4; s++) {
      const [ax, az] = corners[s], [bx, bz] = corners[(s + 1) % 4];
      wall(ax, az, bx, bz, 0.8, hMax, { door: s === doorSide ? 0.5 : null, gaps: 0.18 });
    }
    // a floor of worn slabs
    const fp = P(0, 0);
    blocks.put(fp[0], heightAt(fp[0], fp[1]) + 0.05, fp[1], w - 0.6, 0.18, d - 0.6, 0, rot, 0, '#bfa27a');
    // rubble inside
    for (let k = 0; k < 3; k++) {
      const q = P((rng() - 0.5) * w * 0.6, (rng() - 0.5) * d * 0.6);
      rocks.put(q[0], heightAt(q[0], q[1]) + 0.2, q[1], 0.4 + rng() * 0.5, 0.3 + rng() * 0.4, 0.4 + rng() * 0.5, rng() * 3, rng() * 3, rng() * 3, pick(STONE));
    }
  }

  const keepOut = (x, z, extra = 0) => {
    if (CLEAR.some(c => Math.hypot(x - c.x, z - c.z) < c.r + extra)) return true;
    if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < 40 + extra) return true;
    for (const k in SITES) if (Math.hypot(x - SITES[k].x, z - SITES[k].z) < 30 + extra) return true;
    if (roadDist(x, z) < 9 + extra) return true;
    if (Math.hypot(x, z) > oldEdge(x, z) - 22) return true;
    return false;
  };

  /* ---------- the city ---------- */
  for (let gx = -120; gx <= 120; gx += 19) for (let gz = -130; gz <= 120; gz += 19) {
    const x = gx + (rng() - 0.5) * 6, z = gz + (rng() - 0.5) * 6;
    if (Math.hypot(x, z) > 128 || keepOut(x, z) || rng() < 0.25) continue;
    house(x, z, 7 + rng() * 6, 7 + rng() * 6, 2 + rng() * 4.5, rng() < 0.5 ? 0 : Math.PI / 2 + (rng() - 0.5) * 0.3);
  }

  /* the old city wall, a broken ring */
  for (let i = 0; i < 64; i++) {
    const a0 = i / 64 * Math.PI * 2, a1 = (i + 1) / 64 * Math.PI * 2, R = 138;
    const mid = (a0 + a1) / 2, mx = Math.cos(mid) * R, mz = Math.sin(mid) * R;
    if (Math.abs(mx) < 14 && mz > 0) continue;            // the south gate
    if (rng() < 0.3 || Math.hypot(mx, mz) > oldEdge(mx, mz) - 8) continue;
    wall(Math.cos(a0) * R, Math.sin(a0) * R, Math.cos(a1) * R, Math.sin(a1) * R, 2, 7.5, { thick: 2.2, gaps: 0.1 });
  }
  /* the great gate */
  const gateZ = 138;
  for (const s of [-1, 1]) {
    block(s * 9, gateZ, 5, 5, 13, 0, '#d4b27e', { moss: 1 });
    column(s * 5.5, gateZ - 4, 1, 9);
  }
  {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(9, 1.3, 8, 20, Math.PI * 0.62), toon(0xd8b582));
    arch.position.set(0, heightAt(0, gateZ) + 11, gateZ); arch.rotation.z = Math.PI * 0.12;
    arch.castShadow = true; scene.add(arch);
  }

  /* ---------- the Zahreh plaza and the Oath Stone ---------- */
  const plazaY = PLAZA_H;
  const plazaDisk = new THREE.Mesh(new THREE.CylinderGeometry(30, 31, 0.6, 48), toon(0xcfb48a));
  plazaDisk.position.set(PLAZA.x, plazaY - 0.22, PLAZA.z); plazaDisk.receiveShadow = true; scene.add(plazaDisk);
  const ringMat = toon(0xa8865e);
  for (const r of [12, 22]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.3, 4, 64), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(PLAZA.x, plazaY + 0.08, PLAZA.z); scene.add(ring);
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    if (rng() < 0.3) continue;
    column(PLAZA.x + Math.cos(a) * 33, PLAZA.z + Math.sin(a) * 33, 1.1, rng() < 0.45 ? 2 + rng() * 3 : 8 + rng() * 2, { broken: rng() < 0.5, base: plazaY });
  }
  // fallen columns
  for (let i = 0; i < 3; i++) {
    const a = rng() * Math.PI * 2, r = 26 + rng() * 6, x = PLAZA.x + Math.cos(a) * r, z = PLAZA.z + Math.sin(a) * r;
    if (Math.hypot(x - 21, z + 31) < 9) continue;          // the Megla Aagac's ground
    columns.put(x, plazaY + 0.9, z, 1, 7, 1, 0, a, Math.PI / 2, pick(STONE));
    col.add(x, z, 3.5, 0.9, a, plazaY - 1, plazaY + 1.9);
  }

  /* the Oath Stone itself: stygian, runed, five sockets for five memories */
  const oath = new THREE.Group();
  const runeTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 512;
    const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 128, 512);
    g.strokeStyle = '#c690ff'; g.lineWidth = 4; const r2 = mulberry32(9);
    for (let y = 30; y < 500; y += 36) {
      g.beginPath(); let x = 30 + r2() * 20; g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += 10 + r2() * 14; g.lineTo(x, y + (r2() - 0.5) * 22); }
      g.stroke();
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const stygMat = new THREE.MeshToonMaterial({ color: 0x2a2236, emissive: 0xffffff, emissiveMap: runeTex, emissiveIntensity: 0.25, gradientMap: ramp() });
  const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 10, 4, 1), stygMat);
  obelisk.position.y = 5; obelisk.rotation.y = Math.PI / 4; obelisk.castShadow = true;
  addOutline(obelisk, 0.08); oath.add(obelisk);
  const cap = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), stygMat); cap.position.y = 10.6; cap.scale.y = 1.4; addOutline(cap, 0.06); oath.add(cap);
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7.2, 0.9, 5), toon(0x8a7058)); dais.position.y = 0.05; dais.receiveShadow = true; addOutline(dais, 0.06); oath.add(dais);
  const sockets = [];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + Math.PI / 2;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.4, 6), toon(0x5b4a5e));
    ped.position.set(Math.cos(a) * 5, 1.2, Math.sin(a) * 5); addOutline(ped, 0.04); oath.add(ped);
    const lit = glowSprite(0xb47cff, 2.4, 0); lit.position.set(Math.cos(a) * 5, 2.4, Math.sin(a) * 5); oath.add(lit);
    sockets.push({ ped, lit, filled: false });
  }
  const oathGlow = glowSprite(0x9a5cff, 14, 0.25); oathGlow.position.y = 7; oath.add(oathGlow);
  oath.position.set(PLAZA.x, plazaY, PLAZA.z);
  scene.add(oath);
  col.add(PLAZA.x, PLAZA.z, 1.9, 1.9, Math.PI / 4, plazaY - 1, plazaY + 11);
  col.add(PLAZA.x, PLAZA.z, 6, 6, 0, plazaY - 1, plazaY + 0.5);

  /* ---------- site: the Drowned Library (west) ---------- */
  {
    const { x, z } = SITES.library, W = 26, D = 18;
    wall(x - W / 2, z - D / 2, x + W / 2, z - D / 2, 4, 8.5, { gaps: 0.06, thick: 1.2 });
    wall(x - W / 2, z + D / 2, x + W / 2, z + D / 2, 4, 8.5, { gaps: 0.06, thick: 1.2 });
    wall(x - W / 2, z - D / 2, x - W / 2, z + D / 2, 5, 9, { gaps: 0.04, thick: 1.2 });
    wall(x + W / 2, z - D / 2, x + W / 2, z + D / 2, 3, 7, { door: 0.5, gaps: 0.06, thick: 1.2 });
    for (let i = -2; i <= 2; i++) for (const s of [-1, 1]) column(x + i * 4.6, z + s * 4.5, 0.7, rng() < 0.35 ? 3 + rng() * 2 : 7.5, { broken: rng() < 0.3 });
    // shelves of dark wood and fallen tomes
    for (let i = -2; i <= 2; i++) for (const s of [-1, 1]) block(x + i * 4.6, z + s * 7.6, 3, 0.8, 2.6 + rng() * 1.5, 0, '#5a3524');
    for (let k = 0; k < 18; k++) blocks.put(x + (rng() - 0.5) * 20, heightAt(x, z) + 0.15, z + (rng() - 0.5) * 12, 0.5, 0.15, 0.7, 0, rng() * 3, 0, pick(['#7a2e2a', '#2e4a6a', '#6a5a2a', '#3d5d3a']));
    SITES.library.coreAt = new THREE.Vector3(x - 8, heightAt(x - 8, z) + 1.6, z);
    block(x - 8, z, 1.6, 1.6, 1.0, 0, '#8a7058');
  }

  /* ---------- site: the Watch (east) — a tower you climb ---------- */
  {
    const { x, z } = SITES.tower, base = heightAt(x, z), H = 9;
    block(x, z, 9, 9, H, 0, '#d1ae7c', { base, moss: 1 });
    // parapet on the south and east faces (the north edge is open to the stair)
    for (const [dx, dz, w, d] of [[0, 4.2, 9, 0.6], [4.2, 0, 0.6, 9]]) {
      for (let k = -1; k <= 1; k++) if (rng() < 0.8) {
        const px = x + dx + (w > 1 ? k * 3 : 0), pz = z + dz + (d > 1 ? k * 3 : 0);
        block(px, pz, w > 1 ? 2.6 : w, d > 1 ? 2.6 : d, H + 1.3 + rng() * 0.8, 0, null, { base, sink: -H + 0.1 });
      }
    }
    // first flight up the west face, a landing, then up the north face onto the top
    let sy = 0;
    for (let i = 0; i < 9; i++) { sy += 0.5; block(x - 6, z + 5 - i * 1.2, 3, 1.2, sy, 0, null, { base }); }
    sy += 0.5; block(x - 6, z - 6.2, 3, 3, sy, 0, null, { base });
    for (let i = 0; i < 8; i++) { sy += 0.5; block(x - 3.3 + i * 1.2, z - 6.2, 1.2, 3, Math.min(sy, H), 0, null, { base }); }
    SITES.tower.coreAt = new THREE.Vector3(x + 1, base + H + 1.6, z + 1);
    SITES.tower.top = base + H;
  }

  /* ---------- site: the Fire Tree Grove (north-east) ---------- */
  let fireTree;
  {
    const { x, z } = SITES.grove, g = heightAt(x, z);
    fireTree = new THREE.Group();
    const barkMat = toon(0x6a2c1c, { emissive: 0x3a0e04, emissiveIntensity: 0.4 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.6, 26, 12), barkMat);
    trunk.position.y = 12; fireTree.add(trunk);
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2 + 0.3;
      const pts = [new THREE.Vector3(Math.cos(a) * 2.5, 4, Math.sin(a) * 2.5), new THREE.Vector3(Math.cos(a) * 6, 1.4, Math.sin(a) * 6), new THREE.Vector3(Math.cos(a) * 9.5, -0.6, Math.sin(a) * 9.5)];
      const root = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 1.1, 7), barkMat);
      fireTree.add(root);
      col.add(x + Math.cos(a) * 6.5, z + Math.sin(a) * 6.5, 1.0, 2.8, -a + Math.PI / 2, g - 1, g + 1.4);
    }
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2;
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.1, 12, 6), barkMat);
      br.position.set(Math.cos(a) * 5, 26, Math.sin(a) * 5); br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      fireTree.add(br);
    }
    const leaf = new THREE.MeshToonMaterial({ color: 0xff6f22, emissive: 0xff4a10, emissiveIntensity: 0.55, gradientMap: ramp() });
    const leaf2 = new THREE.MeshToonMaterial({ color: 0xffb03a, emissive: 0xff7a10, emissiveIntensity: 0.5, gradientMap: ramp() });
    for (let k = 0; k < 16; k++) {
      const a = rng() * Math.PI * 2, r = rng() * 11;
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + rng() * 3.5, 1), rng() < 0.5 ? leaf : leaf2);
      blob.position.set(Math.cos(a) * r, 29 + rng() * 9, Math.sin(a) * r);
      fireTree.add(blob);
    }
    outlineAll(fireTree, 0.12);
    fireTree.traverse(o => { if (o.isMesh && o.name !== 'outline') o.castShadow = true; });
    fireTree.position.set(x, g - 0.5, z);
    scene.add(fireTree);
    const glow = glowSprite(0xff8a3a, 60, 0.35); glow.position.set(x, g + 33, z); scene.add(glow);
    col.add(x, z, 3.3, 3.3, 0, g - 2, g + 30);
    SITES.grove.coreAt = new THREE.Vector3(x - 2, g + 1.5, z + 8.5);
    SITES.grove.emberSrc = new THREE.Vector3(x, g + 30, z);
  }

  /* ---------- site: the Cliff Shrine (north-west) ---------- */
  {
    const { x, z } = SITES.shrine, g = heightAt(x, z);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      if (i === 4) continue;
      block(x + Math.cos(a) * 9, z + Math.sin(a) * 9, 1.8, 1.2, 4 + rng() * 3.5, -a, '#b9a58e', { moss: 0.7 });
    }
    block(x, z, 3, 3, 1.1, Math.PI / 4, '#8d7a66');
    SITES.shrine.coreAt = new THREE.Vector3(x, g + 2.7, z);
  }

  /* ---------- site: the Sunken Zahreh Garden (south-west) ---------- */
  let gardenWater;
  {
    const { x, z } = SITES.garden, g = heightAt(x, z);
    const basin = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.7, 6, 28), toon(0xcdb08a));
    basin.rotation.x = -Math.PI / 2; basin.position.set(x, g + 0.5, z); addOutline(basin, 0.05); scene.add(basin);
    gardenWater = new THREE.Mesh(new THREE.CircleGeometry(5, 28), new THREE.MeshToonMaterial({ color: 0x4fb6c8, emissive: 0x1a5a70, emissiveIntensity: 0.5, gradientMap: ramp() }));
    gardenWater.rotation.x = -Math.PI / 2; gardenWater.position.set(x, g + 0.55, z); scene.add(gardenWater);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      col.add(x + Math.cos(a) * 5.2, z + Math.sin(a) * 5.2, 1.5, 0.6, -a + Math.PI / 2, g - 1, g + 1.1);
    }
    column(x, z, 0.6, 3.2, { broken: true });
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      if (rng() < 0.4) continue;
      wall(x + Math.cos(a) * 20, z + Math.sin(a) * 20, x + Math.cos(a + 0.6) * 20, z + Math.sin(a + 0.6) * 20, 0.6, 2.4, { gaps: 0.3 });
    }
    SITES.garden.coreAt = new THREE.Vector3(x, g + 4.4, z);
  }

  /* ---------- stygian shards in the dust ---------- */
  const shardMat = new THREE.MeshToonMaterial({ color: 0x3a2a52, emissive: 0x7a3cff, emissiveIntensity: 0.55, gradientMap: ramp() });
  const shards = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), shardMat, 160);
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let n = 0;
    for (let i = 0; i < 400 && n < 160; i++) {
      const a = rng() * Math.PI * 2, r = rng() * 150, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x, z) > oldEdge(x, z) - 10) continue;
      const s = 0.25 + rng() * 0.6;
      e.set((rng() - 0.5) * 0.8, rng() * 3, (rng() - 0.5) * 0.8); q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, heightAt(x, z) + s * 0.6, z), q, new THREE.Vector3(s * 0.6, s * 1.8, s * 0.6));
      shards.setMatrixAt(n++, m);
    }
    shards.count = n; shards.castShadow = true; scene.add(shards);
  }

  /* ---------- trees: autumn-gold highland trees ---------- */
  const LEAF = ['#e0a33a', '#d98a2c', '#c9612a', '#e8c04a', '#b9a23a', '#a8b04a'];
  function tree(x, z, s) {
    const g = heightAt(x, z), h = 4 + s * 3.5;
    trunks.put(x, g + h / 2 - 0.4, z, 0.35 * s, h, 0.35 * s, (rng() - 0.5) * 0.15, rng() * 6, (rng() - 0.5) * 0.15, '#6b4128');
    const lc = pick(LEAF);
    const n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const r = (1.6 + rng() * 1.3) * s;
      crowns.put(x + (rng() - 0.5) * 2.4 * s, g + h + (rng() - 0.2) * 1.8 * s, z + (rng() - 0.5) * 2.4 * s, r, r * 0.85, r, rng(), rng(), rng(), new THREE.Color(lc).offsetHSL((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.1).getStyle());
    }
    col.add(x, z, 0.35 * s, 0.35 * s, 0, g - 1, g + h);
  }
  for (let i = 0; i < 520 && trunks.mesh.count < 240; i++) {
    const a = rng() * Math.PI * 2, r = 30 + Math.sqrt(rng()) * 150, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z, -10)) continue;
    if (Math.abs(x) < 10 && z > 100) continue;
    if (Math.hypot(x - 21, z + 31) < 9) continue;      // the Megla Aagac's ground
    tree(x, z, 0.8 + rng() * 0.9);
  }
  // boulders
  for (let i = 0; i < 220; i++) {
    const a = rng() * Math.PI * 2, r = rng() * 175, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) > oldEdge(x, z) - 4 || Math.hypot(x - 21, z + 31) < 8 || roadDist(x, z) < 5 || Math.hypot(x - PLAZA.x, z - PLAZA.z) < 32 || CLEAR.some(c => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    const s = 0.4 + Math.pow(rng(), 3) * 2.6;
    rocks.put(x, heightAt(x, z) + s * 0.3, z, s * (1 + rng() * 0.5), s * 0.7, s, rng() * 3, rng() * 3, rng() * 3, pick(['#a98a6a', '#9a7a5c', '#b8977a', '#8b6e55']));
    if (s > 1.2) col.add(x, z, s * 0.8, s * 0.8, 0, heightAt(x, z) - 1, heightAt(x, z) + s * 0.9);
  }

  /* ---------- the dock and its pier ---------- */
  const dockZ0 = oldEdge(0, 170) - 6;
  const pierY = 1.2, pierEnd = dockZ0 + 46;
  {
    const wood = '#8a5a36', woodD = '#5a3a24';
    for (let z = dockZ0 - 8; z < pierEnd; z += 1.6) {
      blocks.put(0, pierY - 0.2, z, 6, 0.32, 1.45, 0, (rng() - 0.5) * 0.03, 0, rng() < 0.5 ? wood : '#9a6a40');
    }
    col.add(0, (dockZ0 - 8 + pierEnd) / 2, 3, (pierEnd - dockZ0 + 8) / 2, 0, pierY - 3, pierY);
    for (let z = dockZ0 - 6; z < pierEnd; z += 6) for (const s of [-1, 1]) {
      blocks.put(s * 3.1, pierY - 6, z, 0.5, 12, 0.5, 0, 0, 0, woodD);
      blocks.put(s * 3.1, pierY + 0.6, z, 0.3, 1.2, 0.3, 0, 0, 0, woodD);
    }
    for (const s of [-1, 1]) {
      blocks.put(s * 3.1, pierY + 1.15, (dockZ0 + pierEnd) / 2, 0.18, 0.15, pierEnd - dockZ0, 0, 0, 0, woodD);
      col.add(s * 3.25, (dockZ0 + pierEnd) / 2, 0.25, (pierEnd - dockZ0) / 2, 0, pierY - 1, pierY + 1.3);
    }
    col.add(0, pierEnd + 0.3, 3.4, 0.3, 0, pierY - 1, pierY + 1.3);
  }
  PIER_BOX = { hw: 3.6, z0: dockZ0 - 9, z1: pierEnd + 0.6 };
  const lamps = [];
  for (let z = dockZ0; z < pierEnd; z += 12) for (const s of [-1, 1]) {
    blocks.put(s * 3.1, pierY + 1.6, z, 0.25, 3.2, 0.25, 0, 0, 0, '#3e2818');
    const l = glowSprite(0xffb85a, 2.6); l.position.set(s * 3.1, pierY + 3.4, z); scene.add(l); lamps.push(l);
  }

  /* ---------- a few floating islets, high in the sky ---------- */
  const islets = [];
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2, r = 240 + rng() * 460, s = 6 + rng() * 12;
    const grp = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.9, s * 0.35, 8), toon(0x9aa54c, {}));
    const bottom = new THREE.Mesh(new THREE.ConeGeometry(s * 0.92, s * 2.2, 8), toon(0xa0674a, {}));
    bottom.rotation.x = Math.PI; bottom.position.y = -s * 1.25;
    grp.add(top, bottom);
    if (rng() < 0.6) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, s * 0.8, 6), toon(0x6b4128)); t.position.y = s * 0.5; grp.add(t);
      const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(s * 0.35, 1), toon(new THREE.Color(pick(LEAF)), {})); cr.position.y = s; grp.add(cr);
    }
    outlineAll(grp, 0.12);
    grp.position.set(Math.cos(a) * r, 130 + rng() * 110, Math.sin(a) * r);
    grp.userData = { by: grp.position.y, ph: rng() * 6, sp: 0.2 + rng() * 0.3 };
    scene.add(grp); islets.push(grp);
  }

  /* ---------- waterfalls pouring off the rim ---------- */
  const fallMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
    vertexShader: `varying vec2 vUv;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime;
      #include <fog_pars_fragment>
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        float col = floor(vUv.x * 14.0);
        float streak = fract(vUv.y * 3.0 + uTime * (0.6 + h(col) * 0.5) + h(col + 3.0));
        vec3 c = mix(vec3(0.55, 0.82, 0.95), vec3(1.0), smoothstep(0.55, 1.0, streak));
        float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        float a = edge * smoothstep(0.0, 0.5, vUv.y) * 0.85;
        gl_FragColor = vec4(pow(c, vec3(2.2)), a);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
  });
  const falls = [];
  /* two falls: off the north ridge into the Ashfall Tarn, and off the Western Scarp into its pool */
  for (const b of [BODIES[6], BODIES[7]]) {
    const a = Math.atan2(b.z, b.x), ca = Math.cos(a), sa = Math.sin(a);
    let tx = b.x, tz = b.z, top = LEVEL;
    for (let s = b.r * 0.5; s < b.r + 90; s += 1) {
      tx = b.x + ca * s; tz = b.z + sa * s; top = heightAt(tx, tz);
      if (top > LEVEL + 34) break;
    }
    // a cascade laid down the face of the rock, from the lip to the pool
    const N = 28, fx0 = b.x + ca * b.r * 0.55, fz0 = b.z + sa * b.r * 0.55;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, x = lerp(fx0, tx + ca * 3, t), z = lerp(fz0, tz + sa * 3, t);
      const y = i === 0 ? LEVEL + 0.15 : Math.max(heightAt(x, z) + 0.7, LEVEL + 0.15), w = lerp(7, 4.5, t);
      pos.push(x - sa * w, y, z + ca * w, x + sa * w, y, z - ca * w);
      uv.push(0, t * 4, 1, t * 4);
      if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    fg.setIndex(idx);
    const f = new THREE.Mesh(fg, fallMat);
    scene.add(f);
    falls.push({ x: tx - ca * 4, y: LEVEL + 1, z: tz - sa * 4, a: a + Math.PI, top });
  }

  /* ---------- banners on tall walls ---------- */
  const banners = [];
  const bannerMat = [toon(0xa8323a, { side: THREE.DoubleSide }), toon(0x2f6f8a, { side: THREE.DoubleSide }), toon(0xc28b2c, { side: THREE.DoubleSide })];
  for (let i = 0; i < 18; i++) {
    const a = rng() * Math.PI * 2, r = 20 + rng() * 110, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z, -20) || Math.hypot(x - 21, z + 31) < 7) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 7, 5), toon(0x3e2818));
    const g = heightAt(x, z); pole.position.set(x, g + 3.5, z); scene.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.4, 1, 6), pick(bannerMat));
    flag.geometry.translate(0.8, -1.7, 0);
    flag.position.set(x + 0.1, g + 6.8, z); flag.castShadow = true;
    flag.userData.ph = rng() * 6; scene.add(flag); banners.push(flag);
  }

  /* ================= the wider Reach ================= */
  const rng2 = mulberry32(8821);
  const pick2 = a => a[Math.floor(rng2() * a.length)];
  const wTrunks = new Kit(scene, new THREE.CylinderGeometry(0.6, 1, 1, 6), toon(0xffffff), 1500);
  const wCrowns = new Kit(scene, new THREE.IcosahedronGeometry(1, 0), toon(0xffffff), 2800);
  const wCones = new Kit(scene, new THREE.ConeGeometry(1, 1, 6), toon(0xffffff), 400);
  const wRocks = new Kit(scene, new THREE.DodecahedronGeometry(1, 0), toon(0xffffff), 900);
  const farTrees = new Kit(scene, new THREE.ConeGeometry(1, 1, 5), toon(0xffffff), 1600, false);
  const reeds = new Kit(scene, new THREE.CylinderGeometry(0.035, 0.07, 1, 3), toon(0xffffff), 1000, false);
  const slopeAt = (x, z) => { const h = heightAt(x, z); return Math.max(Math.abs(heightAt(x + 1.5, z) - h), Math.abs(heightAt(x, z + 1.5) - h)) / 1.5; };
  const reserved = [...JU.map(f => ({ x: f.x, z: f.z, r: f.r + 4 })), ...ALBALI.map(a => ({ x: a.x, z: a.z, r: 10 })), { x: SPIRE.x, z: SPIRE.z, r: 24 }, { x: 21, z: -31, r: 8 }];
  const wildOk = (x, z, gap = 0) => {
    const r = Math.hypot(x, z);
    if (r < oldEdge(x, z) - 6 || r > limitR(x, z) - 4) return false;
    if (minE(x, z) < 1.1) return false;
    if (trailDist(x, z) < 4 + gap) return false;
    if (reserved.some(q => Math.hypot(x - q.x, z - q.z) < q.r + gap)) return false;
    if (Math.abs(x) < 14 && z > 140 && z < 240) return false;     // the pier approach
    return true;
  };
  const WLEAF = ['#d9822c', '#c9612a', '#e0a33a', '#b8452a', '#e8c04a', '#a8572a', '#c4a03a', '#9a3a22'];
  function wtree(x, z, s) {
    const g = heightAt(x, z), h = 4.5 + s * 4;
    wTrunks.put(x, g + h / 2 - 0.4, z, 0.36 * s, h, 0.36 * s, (rng2() - 0.5) * 0.12, rng2() * 6, (rng2() - 0.5) * 0.12, '#5e3a24');
    const lc = pick2(WLEAF), n = 2 + (rng2() < 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const r = (2 + rng2() * 1.4) * s;
      wCrowns.put(x + (rng2() - 0.5) * 2.4 * s, g + h + (rng2() - 0.1) * 1.6 * s, z + (rng2() - 0.5) * 2.4 * s, r, r * 0.8, r, rng2() * 3, rng2() * 3, rng2() * 3,
        c.set(lc).offsetHSL((rng2() - 0.5) * 0.03, 0, (rng2() - 0.5) * 0.1).getStyle());
    }
    col.add(x, z, 0.36 * s, 0.36 * s, 0, g - 1, g + h);
  }
  function pine(x, z, s) {
    const g = heightAt(x, z);
    wTrunks.put(x, g + 1.2, z, 0.3 * s, 3, 0.3 * s, 0, 0, 0, '#4a3020');
    wCones.put(x, g + 2 + 4.5 * s, z, 2.2 * s, 9 * s, 2.2 * s, 0, rng2() * 3, 0, pick2(['#55602e', '#6a5a28', '#4a5530', '#7a6a2a']));
    col.add(x, z, 0.3 * s, 0.3 * s, 0, g - 1, g + 8 * s);
  }
  function deadTree(x, z, s) {
    const g = heightAt(x, z), h = 4 + s * 3.5;
    wTrunks.put(x, g + h / 2 - 0.4, z, 0.3 * s, h, 0.3 * s, (rng2() - 0.5) * 0.2, 0, (rng2() - 0.5) * 0.2, '#4d4844');
    for (let k = 0; k < 3; k++) {
      const a = rng2() * TAU, l = (1.6 + rng2() * 2) * s;
      wTrunks.put(x + Math.cos(a) * l * 0.35, g + h * (0.55 + k * 0.15), z + Math.sin(a) * l * 0.35, 0.12 * s, l, 0.12 * s, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9, '#55504b');
    }
    col.add(x, z, 0.3 * s, 0.3 * s, 0, g - 1, g + h);
  }
  /* woods, copses and the dead of the ash flats */
  for (let i = 0; i < 14000 && wTrunks.mesh.count < 1300; i++) {
    const u = rng2(), r = Math.sqrt(lerp(165 * 165, 545 * 545, u)), a = rng2() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const forest = Math.max(zw('russet', x, z), zw('emberwood', x, z)), ash = zw('ashflats', x, z);
    const dens = 0.12 + forest * 0.85 + zw('greyback', x, z) * 0.2 + zw('outskirts', x, z) * 0.1 - Math.max(zw('allotments', x, z), zw('palemeadow', x, z)) * 0.1 - ash * 0.12;
    if (rng2() > dens || !wildOk(x, z)) continue;
    if (slopeAt(x, z) > 0.75) continue;
    const s = 0.8 + rng2() * 0.9;
    if (ash > 0.25) { if (rng2() < 0.35) deadTree(x, z, s); continue; }
    if ((zw('greyback', x, z) > 0.2 || zw('crags', x, z) > 0.1 || Math.hypot(x, z) > limitR(x, z) - 50) && rng2() < 0.55) pine(x, z, s);
    else wtree(x, z, s);
  }
  /* boulders and scree, thickest under the ridges */
  for (let i = 0; i < 6000 && wRocks.mesh.count < 880; i++) {
    const u = rng2(), r = Math.sqrt(lerp(165 * 165, 560 * 560, u)), a = rng2() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const d = r - limitR(x, z);
    const p = 0.12 + smooth(-60, -6, d) * 0.6 + zw('crags', x, z) * 0.5 + zw('greyback', x, z) * 0.2;
    if (rng2() > p || d > 30 || r < oldEdge(x, z) - 4 || minE(x, z) < 1.0 || trailDist(x, z) < 3) continue;
    if (reserved.some(q => Math.hypot(x - q.x, z - q.z) < q.r)) continue;
    const s = 0.5 + Math.pow(rng2(), 2.5) * (d > -40 ? 4.5 : 2.6), g = heightAt(x, z);
    wRocks.put(x, g + s * 0.25, z, s * (1 + rng2() * 0.5), s * 0.75, s, rng2() * 3, rng2() * 3, rng2() * 3, pick2(['#8f8a84', '#7d7873', '#a39e97', '#6e6a66', '#9a8a74']));
    if (s > 1.2 && d < -3) col.add(x, z, s * 0.8, s * 0.8, 0, g - 1, g + s * 0.9);
  }

  /* the abandoned outskirts — houses where the city spilled past its walls */
  const nearHouses = [];
  const houseOk = (x, z, rad) => wildOk(x, z, 3) && slopeAt(x, z) < 0.3 && !nearHouses.some(h => Math.hypot(h.x - x, h.z - z) < h.r + rad + 3);
  const scatterHouses = (cx, cz, R, n) => {
    for (let i = 0, k = 0; i < 400 && k < n; i++) {
      const a = rng2() * TAU, r = Math.sqrt(rng2()) * R, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const w = 6 + rng2() * 6, d = 6 + rng2() * 6;
      if (!houseOk(x, z, Math.max(w, d) * 0.7)) continue;
      house(x, z, w, d, 1.6 + rng2() * 4, rng2() < 0.5 ? 0 : Math.PI / 2 + (rng2() - 0.5) * 0.4);
      nearHouses.push({ x, z, r: Math.max(w, d) * 0.7 }); k++;
    }
  };
  scatterHouses(ZI.outskirts.x, ZI.outskirts.z, 72, 18);
  scatterHouses(-150, 120, 40, 5);            // between the camp and the allotments
  scatterHouses(150, 40, 35, 4);              // the road to the flooded quarter
  scatterHouses(150, -150, 40, 4);            // the road to the ash flats
  scatterHouses(-205, 238, 70, 3);            // garden sheds
  /* the outskirts' own broken wall */
  for (let i = 0; i < 14; i++) {
    const a0 = 2.6 + i * 0.06, a1 = a0 + 0.06, R = 320;
    const ax = Math.cos(a0) * R, az = Math.sin(a0) * R, bx = Math.cos(a1) * R, bz = Math.sin(a1) * R;
    if (rng2() < 0.3 || !wildOk((ax + bx) / 2, (az + bz) / 2, 1)) continue;
    wall(ax, az, bx, bz, 1.5, 5, { thick: 1.8, gaps: 0.15 });
  }

  /* the flooded quarter — roofs and walls standing up out of the water */
  {
    const B = BODIES[1];
    const fwall = (ax, az, bx, bz, hMin, hMax) => {
      const len = Math.hypot(bx - ax, bz - az), ang = -Math.atan2(bz - az, bx - ax), n = Math.max(1, Math.round(len / 2.4));
      for (let i = 0; i < n; i++) {
        if (rng2() < 0.2) continue;
        const t = (i + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        block(x, z, len / n + 0.02, 0.9, hMin + rng2() * (hMax - hMin), ang, null, { base: Math.max(heightAt(x, z), LEVEL - 0.6), moss: 0.5, sink: 8 });
      }
    };
    for (let i = 0; i < 12; i++) {
      const a = rng2() * TAU, r = 8 + rng2() * 46, x = B.x + Math.cos(a) * r, z = B.z + Math.sin(a) * r;
      if (segDist([[212, 96, 158, 198]], x, z) < 8) continue;
      const w = 6 + rng2() * 5, d = 6 + rng2() * 5, rot = rng2() < 0.5 ? 0 : Math.PI / 2;
      const cs = Math.cos(rot), sn = Math.sin(rot), P = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
      const cn = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
      for (let s = 0; s < 4; s++) if (rng2() < 0.8) fwall(cn[s][0], cn[s][1], cn[(s + 1) % 4][0], cn[(s + 1) % 4][1], 0.8, 4.5);
    }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + 0.2, x = B.x + Math.cos(a) * 30, z = B.z + Math.sin(a) * 30, base = Math.max(heightAt(x, z), LEVEL - 0.8);
      const top = base + 2 + rng2() * 6, bot = heightAt(x, z) - 0.5;
      columns.put(x, (bot + top) / 2, z, 0.9, top - bot, 0.9, 0, rng2() * 6, 0, pick(STONE));
      col.add(x, z, 0.9, 0.9, 0, bot, top);
    }
  }

  /* the old allotments: low stone borders round the garden plots, rotten posts */
  for (const f of JU) {
    const hs = f.r + 1.2;
    for (const [ax, az, bx, bz] of [[-hs, -hs, hs, -hs], [hs, -hs, hs, hs], [hs, hs, -hs, hs], [-hs, hs, -hs, -hs]]) {
      const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 1.6), ang = -Math.atan2(bz - az, bx - ax);
      for (let i = 0; i < n; i++) {
        if (rng2() < 0.25) continue;
        const t = (i + 0.5) / n, x = f.x + ax + (bx - ax) * t, z = f.z + az + (bz - az) * t;
        blocks.put(x, heightAt(x, z) + 0.1, z, 1.4, 0.5, 0.5, 0, ang + (rng2() - 0.5) * 0.15, 0, pick(['#a89070', '#9a8466', '#b49c78']));
      }
    }
    for (let k = 0; k < 4; k++) {
      const x = f.x + (k % 2 ? hs : -hs) + 0.6, z = f.z + (k < 2 ? hs : -hs);
      blocks.put(x, heightAt(x, z) + 0.6, z, 0.18, 1.6 + rng2() * 0.5, 0.18, (rng2() - 0.5) * 0.3, 0, (rng2() - 0.5) * 0.3, '#5a3e28');
    }
  }

  /* reeds along the shallows */
  for (let i = 0; i < 9000 && reeds.mesh.count < 960; i++) {
    const b = BODIES[i % 3 === 0 ? 0 : i % 3 === 1 ? 4 : Math.floor(rng2() * BODIES.length)];
    const a = rng2() * TAU, e = 0.75 + rng2() * 0.35;
    const x = b.kind === 'seg' ? lerp(b.ax, b.bx, rng2()) + Math.cos(a) * b.r : (b.x + Math.cos(a) * (b.rx || b.r) * e), z = b.kind === 'seg' ? lerp(b.az, b.bz, rng2()) + Math.sin(a) * b.r : (b.z + Math.sin(a) * (b.rz || b.r) * e);
    const dep = LEVEL - heightAt(x, z);
    if (dep < -0.2 || dep > 0.9 || onPier(x, z) || Math.abs(x) < 8 && z > 160 && z < 240) continue;
    for (let k = 0; k < 6; k++) {
      const rx = x + (rng2() - 0.5) * 1.8, rz = z + (rng2() - 0.5) * 1.8, h = 1.2 + rng2() * 1.4, g = heightAt(rx, rz);
      reeds.put(rx, g + h / 2, rz, 1, h, 1, (rng2() - 0.5) * 0.25, 0, (rng2() - 0.5) * 0.25, pick2(['#8a8a3a', '#a08a40', '#6e7a34', '#b29a50']));
    }
  }

  /* low forests and ranges out to the horizon */
  for (let i = 0; i < 20000 && farTrees.mesh.count < 1580; i++) {
    const r = Math.sqrt(lerp(480 * 480, 1500 * 1500, rng2())), a = rng2() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (r < limitR(x, z) + 25) continue;
    const g = heightAt(x, z);
    if (g > 170 || g < 4 || slopeAt(x, z) > 0.9) continue;
    const s = 3 + rng2() * 3.5;
    farTrees.put(x, g + s * 1.2, z, s, s * 3, s, 0, rng2() * 3, 0, pick2(['#7a4a24', '#8a5a2a', '#5a5a2c', '#6a3a20', '#9a6a30']));
  }
  wTrunks.done(); wCrowns.done(); wCones.done(); wRocks.done(); farTrees.done(); reeds.done();

  blocks.done(); columns.done(); trunks.done(); crowns.done(); rocks.done();

  /* ---------- grass ---------- */
  const grass = buildGrass(scene, rng, (x, z) => {
    if (Math.hypot(x, z) > oldEdge(x, z) + 12 || minE(x, z) < 1.08) return false;
    if (roadDist(x, z) < 3.5 || Math.abs(x) < 4 && z > 165) return false;
    if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < 31) return false;
    return true;
  }, heightAt);

  /* ---------- Zahreh flowers that heal ---------- */
  const flowers = [];
  const petal = new THREE.MeshToonMaterial({ color: 0xffb0d0, emissive: 0xff70b0, emissiveIntensity: 0.6, gradientMap: ramp() });
  const heart = new THREE.MeshToonMaterial({ color: 0xfff0a0, emissive: 0xffd060, emissiveIntensity: 0.8, gradientMap: ramp() });
  const fspots = [[-6, 120], [8, 70], [-30, 40], [40, -40], [-40, -50], [60, 10], [-70, 50], [100, 60], [70, -60], [-90, -70], [-52, 70], [-60, 92], [20, -70], [-14, 96], [110, -10], [-120, 20]];
  for (const [fx, fz] of fspots) {
    const grp = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), petal);
      const a = k / 5 * Math.PI * 2; p.position.set(Math.cos(a) * 0.3, 0.9, Math.sin(a) * 0.3); p.scale.set(1, 0.45, 1.6); p.rotation.y = -a;
      grp.add(p);
    }
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), heart); h.position.y = 0.95; grp.add(h);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 4), toon(0x5a8a3a)); stem.position.y = 0.45; grp.add(stem);
    const gl = glowSprite(0xff8ac8, 2.2, 0.6); gl.position.y = 1; grp.add(gl);
    grp.position.set(fx, heightAt(fx, fz), fz);
    scene.add(grp);
    flowers.push({ grp, x: fx, z: fz, ready: true, timer: 0 });
  }

  /* where trouble waits */
  /* Aakalay is dead — no folk at all, and only a few beasts left picking through the ruins */
  const spawnGroups = [
    { at: [14, 70], kinds: ['punk', 'punk'] },
    { at: [SITES.library.x + 8, SITES.library.z + 4], kinds: ['punk', 'malsti', 'malsti'] },
    { at: [SITES.tower.x + 2, SITES.tower.z - 14], kinds: ['albali', 'albali'] },
    { at: [SITES.grove.x - 6, SITES.grove.z + 16], kinds: ['punk', 'malsti', 'malsti'] },
    { at: [SITES.shrine.x + 6, SITES.shrine.z + 12], kinds: ['punk', 'punk', 'malsti'] },
    { at: [SITES.garden.x - 12, SITES.garden.z + 10], kinds: ['kipsu', 'kipsu'] },
    { at: [40, 100], kinds: ['rodak', 'rodak'] },
    { at: [-60, -30], kinds: ['malsti', 'malsti'] },
    { at: [60, 60], kinds: ['kofi', 'kofi'] }, { at: [-90, 50], kinds: ['kofi', 'kofi', 'kofi'] }, { at: [20, -90], kinds: ['kofi', 'kofi'] },
    // the Rodak that shadow Skor'Thal around its den in the far north wood
    { at: [-14, -122], kinds: ['rodak', 'rodak', 'rodak'], tag: 'skorden' },
    { at: [-32, -126], kinds: ['rodak', 'rodak', 'punk'], tag: 'skorden' },
  ];

  let time = 0;
  return {
    name: 'aakalay', hazards: [], pillars: [], camp: null,
    skorthal: { x: -22, z: -136 },
    /* where Skor'Thal has rubbed its rind — only Nur'Hlyst shows them */
    scars: [
      { id: 'scar_1', x: 46, z: 106 },
      { id: 'scar_2', x: -66, z: -36 },
      { id: 'scar_3', x: -8, z: -98 },
    ],
    pages: [
      { id: 'page_1', x: SITES.library.x + 6, z: SITES.library.z - 8 },
      { id: 'page_2', x: SITES.tower.x - 8, z: SITES.tower.z + 8 },
      { id: 'page_3', x: SITES.garden.x + 10, z: SITES.garden.z - 6 },
      { id: 'page_4', x: SITES.shrine.x + 10, z: SITES.shrine.z + 8 },
    ],
    lanterns: [
      { id: 'a_pier', name: 'The Pier', x: 5, z: dockZ0 - 10 },
      { id: 'a_gate', name: 'The Great Gate', x: 10, z: 126 },
      { id: 'a_west', name: 'The Library Road', x: -54, z: 28 },
      { id: 'a_plaza', name: 'The Zahreh Plaza', x: 6, z: 30 },
      { id: 'a_north', name: 'The Grove Road', x: 34, z: -56 },
    ],
    stones: [
      { key: 'a_gate', x: -12, z: 128 }, { key: 'a_library', x: -68, z: 24 }, { key: 'a_tower', x: 78, z: 46 },
      { key: 'a_grove', x: 58, z: -78 }, { key: 'a_plaza', x: 26, z: -2 },
    ],
    heightAt, col, SITES, PLAZA: { x: PLAZA.x, z: PLAZA.z, y: plazaY }, oath: { group: oath, sockets, glow: oathGlow, mat: stygMat },
    pier: { y: pierY, start: new THREE.Vector3(0, pierY, pierEnd - 6), end: pierEnd, z0: dockZ0 },
    edgeRadius, flowers, spawnGroups, falls,
    /* the open Reach */
    inBounds, barrierLine,
    water: { level: LEVEL, isWater: (x, z) => waterDepth(x, z) > SWIM, depth: waterDepth, mesh: waterMesh },
    zones: ZONES.map(z => ({ ...z })),
    albaliSpots: ALBALI.map(a => ({ x: a.x, z: a.z })),
    juFields: JU.map(f => ({ ...f })),
    kuniPerch: { x: SPIRE.x, z: SPIRE.z, y: heightAt(SPIRE.x, SPIRE.z) },
    update(t, dt, particles, camPos) {
      time = t;
      fallMat.uniforms.uTime.value = t;
      grass.material.userData.shader && (grass.material.userData.shader.uniforms.uTime.value = t);
      banners.forEach(b => { b.rotation.y = Math.sin(t * 1.7 + b.userData.ph) * 0.35 + 0.5; b.rotation.x = Math.sin(t * 2.3 + b.userData.ph) * 0.05; });
      islets.forEach(g => { g.position.y = g.userData.by + Math.sin(t * g.userData.sp + g.userData.ph) * 2.5; g.rotation.y += dt * 0.01; });
      lamps.forEach((l, i) => l.material.opacity = 0.8 + Math.sin(t * 6 + i) * 0.15);
      ripTex.offset.set(t * 0.012, t * 0.007);
      gardenWater.material.emissiveIntensity = 0.45 + Math.sin(t * 2) * 0.1;
      flowers.forEach(f => { if (f.ready) f.grp.rotation.y = t * 0.5; });
      if (particles) {
        // embers drifting off the fire tree
        const e = SITES.grove.emberSrc;
        if (Math.random() < 0.8) particles.emit(e.x + (Math.random() - 0.5) * 22, e.y + (Math.random() - 0.5) * 8, e.z + (Math.random() - 0.5) * 22,
          { vx: (Math.random() - 0.5) * 0.8, vy: -0.6 - Math.random(), vz: (Math.random() - 0.5) * 0.8, color: Math.random() < 0.5 ? 0xff7a2a : 0xffc04a, size: 0.35, life: 6, drag: 0.2 });
        // mist at the feet of the falls
        for (const f of falls) if (Math.random() < 0.35) particles.emit(f.x + (Math.random() - 0.5) * 8, f.y + Math.random() * 2, f.z + (Math.random() - 0.5) * 8,
          { vx: Math.cos(f.a) * 1.5, vy: 1.2, vz: Math.sin(f.a) * 1.5, color: 0xcfe8ff, size: 3, life: 2.5, drag: 0.4 });
        // golden motes in the air near the camera
        if (camPos && Math.random() < 0.5) particles.emit(camPos.x + (Math.random() - 0.5) * 40, camPos.y + (Math.random() - 0.5) * 12, camPos.z + (Math.random() - 0.5) * 40,
          { vx: 0.4, vy: 0.15, vz: 0.1, color: 0xffe0a0, size: 0.12, life: 5, drag: 0 });
      }
    },
  };
}

