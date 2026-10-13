/* ============================================================
   LEOTIK — the wildest and least explored of the three Tatu,
   home to more venomous and poisonous things than anyone can
   count. The Eikar come ashore on an island of ruins in a wide,
   storm-grey ocean: the ruins of Villtur, acid bogs farmed by a
   Sru Vorn, an Albali roost whose film has turned toxic, and a
   ruined keep with three stygian pillars — each inscribed "Klug"
   — and an Urverk that no one can wake.

   Around that old heart the island runs on: beaches and rocky
   shores, two jungle rivers, a glass-green lagoon, sea cliffs,
   and a smoking volcano in the north. The sea is the wall —
   deep water all round — and other islands and a far coast sit
   on the horizon. A few loose islets drift high overhead.
   ============================================================ */
import * as THREE from 'three';
import { mulberry32, fbm, smooth, lerp, clamp } from './util.js';
import { toon, ramp, glowSprite, outlineAll, addOutline } from './gfx.js';
import { Colliders, Kit, buildGrass, STEP } from './terrain.js';
export { STEP };

const KEEP = { x: 0, z: -140 };
const KEEP_H = 9;

/* the sea, and how deep counts as "deep" */
const SEA = -2.8;
const WADE = 1.25;          // deeper than this stops you
const SWIM = 1.5;           // deeper than this is water for swimmers

/* the old island's rim — everything inside it is the original, hand-placed map */
function oldEdge(x, z) {
  const a = Math.atan2(z, x);
  const stretch = 1 + 0.18 * Math.cos(2 * (a - Math.PI / 2));   // longer north-south
  return (178 + (fbm(Math.cos(a) * 2.4 + 2, Math.sin(a) * 2.4 + 9, 3) - 0.5) * 46) * stretch;
}

/* the whole island: an ellipse pushed north of the old heart, with a ragged coast */
const ISLE = { cz: -190, rx: 520, rz: 440 };
function coastR(a) {
  const c = Math.cos(a), s = Math.sin(a);
  const A = c * c / (ISLE.rx * ISLE.rx) + s * s / (ISLE.rz * ISLE.rz);
  const B = -2 * s * ISLE.cz / (ISLE.rz * ISLE.rz), C = ISLE.cz * ISLE.cz / (ISLE.rz * ISLE.rz) - 1;
  const t = (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);
  const south = smooth(0.75, 0.15, Math.abs(a - Math.PI / 2));     // keep the landing shore steady
  return t * (1 + (fbm(c * 2.6 + 4, s * 2.6 - 7, 3) - 0.5) * 0.3 * (1 - 0.85 * south) + south * 0.02);
}
/* the harbour cove the old landing pier runs out into */
const COVE = { x: 0, z: 266, r: 59 };
/* metres inland from the shore (negative = out at sea) */
function coastD(x, z) {
  const d = coastR(Math.atan2(z, x)) - Math.hypot(x, z);
  return Math.min(d, Math.hypot(x - COVE.x, z - COVE.z) - COVE.r);
}
/* "safe ground" radius main.js still asks for: past the farthest you can wade */
function edgeRadius(x, z) { return coastR(Math.atan2(z, x)) + 40; }

const BOGS = [
  { x: -96, z: 6, r: 13 }, { x: -76, z: 28, r: 9 }, { x: -112, z: -18, r: 8 }, { x: -70, z: -8, r: 6 },
  { x: -120, z: 30, r: 7 }, { x: 40, z: 64, r: 6 },
];
const SITES = {
  bog: { name: 'The Acid Bogs', x: -92, z: 14 },
  villtur: { name: 'The Ruins of Villtur', x: 96, z: -4 },
  roost: { name: 'The Albali Roost', x: -78, z: -96 },
  keep: { name: 'The Keep of the Klug Pillars', x: KEEP.x, z: KEEP.z },
};

/* ---------- the new country ---------- */
const VOLC = { x: -60, z: -500, R: 150, H: 185, crater: 24 };
const LAG = { x: 300, z: 30, r: 55 };                 // the Glass Lagoon
const LAG_CH = { x: 410, z: 70 };                      // its channel out to sea
const RIVER_DEFS = [
  { name: 'The Vinewater', pts: [[-150, -318], [-205, -268], [-255, -238], [-300, -185], [-352, -132], [-405, -96], [-450, -76], [-520, -60]] },
  { name: 'The Sunken River', pts: [[38, -318], [92, -292], [140, -262], [190, -205], [228, -140], [250, -75], [272, -18], [292, 22]] },
];
const RIVER_MOUTH = { x: -440, z: -80 };
const PERCH = { x: -60, z: -436 };                    // a basalt ledge on the volcano's south shoulder
const RAMP = { ax: -60, az: -352, bx: -60, bz: -430 };  // the old basalt stair up to it
const ALBALI = [{ x: -220, z: 72 }, { x: 255, z: -300 }, { x: -150, z: -250 }, { x: 150, z: 150 }, { x: -330, z: -40 }];
const JU = [{ x: -64, z: 152, r: 8 }, { x: 16, z: 160, r: 7 }, { x: -30, z: 174, r: 7 }];

function volcanoH(x, z) {
  const d = Math.hypot(x - VOLC.x, z - VOLC.z);
  if (d > VOLC.R) return 0;
  if (d < VOLC.crater) {
    const rim = VOLC.H * Math.pow(1 - VOLC.crater / VOLC.R, 2);
    return rim - (VOLC.crater - d) * 1.15;
  }
  return VOLC.H * Math.pow(1 - d / VOLC.R, 2) * (1 + (fbm(x * 0.05 + 3, z * 0.05, 2) - 0.5) * 0.12);
}

function hOld(x, z) {
  let h = (fbm(x * 0.012 - 5, z * 0.012 + 3, 4) - 0.5) * 22 + (fbm(x * 0.06, z * 0.06, 2) - 0.5) * 2.6;
  // the spine rising to the keep
  h += smooth(40, -150, z) * 8 * smooth(80, 10, Math.abs(x));
  // the roost hill
  h += smooth(34, 6, Math.hypot(x - SITES.roost.x, z - SITES.roost.z)) * 10;
  // flatten the keep courtyard
  h = lerp(h, KEEP_H, smooth(40, 26, Math.hypot(x - KEEP.x, z - KEEP.z)));
  // flatten the landing
  if (z > 120 && Math.abs(x) < 30) h = lerp(h, 0.6, smooth(16, 6, Math.abs(x)) * smooth(120, 150, z));
  // the bog basin sinks
  h -= smooth(50, 20, Math.hypot(x - SITES.bog.x, z - SITES.bog.z)) * 4;
  for (const b of BOGS) h = lerp(h, Math.min(h, -2.2), smooth(b.r + 4, b.r, Math.hypot(x - b.x, z - b.z)));
  return h;
}
function hNew(x, z) {
  let h = 15 + (fbm(x * 0.0045 + 11, z * 0.0045 - 4, 4) - 0.5) * 60 + (fbm(x * 0.022, z * 0.022, 2) - 0.5) * 6;
  h += smooth(-260, -480, z) * 14;                    // the northern heights
  return h + volcanoH(x, z);
}
function stage0(x, z) {
  const r = Math.hypot(x, z), oR = oldEdge(x, z);
  const w = smooth(oR - 15, oR + 60, r) * (1 - smooth(45, 22, Math.abs(x)) * smooth(100, 140, z));   // the landing stays low
  const h = hOld(x, z);
  return w > 0 ? lerp(h, hNew(x, z), w) : h;
}
/* flat plots: Albali glades, Ju fields, the Kuni perch */
const FLATS = [
  ...ALBALI.map(p => ({ x: p.x, z: p.z, r: 9 })),
  ...JU.map(p => ({ x: p.x, z: p.z, r: p.r + 1.5 })),
  { x: PERCH.x, z: PERCH.z, r: 8 },
].map(f => ({ ...f, h: stage0(f.x, f.z) }));
RAMP.ha = stage0(RAMP.ax, RAMP.az); RAMP.hb = FLATS[FLATS.length - 1].h;

function stage1(x, z) {
  let h = stage0(x, z);
  for (const f of FLATS) {
    const d = Math.hypot(x - f.x, z - f.z);
    if (d < f.r + 8) h = lerp(h, f.h, smooth(f.r + 8, f.r, d));
  }
  // the stair up the volcano
  {
    const vx = RAMP.bx - RAMP.ax, vz = RAMP.bz - RAMP.az;
    const t = clamp(((x - RAMP.ax) * vx + (z - RAMP.az) * vz) / (vx * vx + vz * vz), 0, 1);
    const L = Math.hypot(x - RAMP.ax - vx * t, z - RAMP.az - vz * t);
    if (L < 10) h = lerp(h, lerp(RAMP.ha, RAMP.hb, t), smooth(10, 3.5, L));
  }
  return Math.max(h, SEA + 0.4);
}

/* how much the shore is sand (1) or rock (0) */
function beachiness(x, z, a) {
  let b = 0.5 + Math.sin(a) * 0.7 + (fbm(Math.cos(a) * 2.2 + 30, Math.sin(a) * 2.2 + 30, 2) - 0.5) * 1.8;
  b = smooth(0.3, 0.7, b);
  b = Math.max(b, smooth(150, 70, Math.hypot(x - LAG.x, z - LAG.z)), smooth(100, 40, Math.hypot(x - RIVER_MOUTH.x, z - RIVER_MOUTH.z)));
  return b;
}
const cliffTop = a => SEA + 12 + fbm(Math.cos(a) * 4, Math.sin(a) * 4 + 50, 2) * 24;

function stageC(x, z) {
  const a = Math.atan2(z, x);
  const d = coastD(x, z), b = beachiness(x, z, a);
  // the stone quay where the landing meets the cove
  const q = smooth(24, 14, Math.abs(x)) * smooth(150, 175, z);
  if (d >= 0) {
    const h = stage1(x, z);
    if (q >= 1) return h;
    const hb = lerp(SEA + 0.35 + d * 0.045, h, smooth(4, 45, d));
    const top = cliffTop(a);
    let hc = h + Math.max(0, top - h) * smooth(80, 25, d);
    hc = lerp(SEA - 5, hc, smooth(0, 3, d));
    return lerp(lerp(hc, hb, b), h, q);
  }
  const e = -d;
  const beachF = SEA - Math.min(e * 0.1, 1.0) - Math.max(0, e - 10) * 0.75;
  const cliffF = SEA - 6 - e * 1.2;
  let f = lerp(cliffF, beachF, b);
  f = lerp(f, SEA - 7 - e * 0.2, smooth(30, 18, Math.abs(x)) * smooth(185, 200, z));   // the cove under the pier
  return Math.max(f, -75 + (fbm(x * 0.01, z * 0.01, 2) - 0.5) * 10);
}

/* ---------- rivers ---------- */
const RIVERS = RIVER_DEFS.map((def, ri) => {
  const pts = [];
  for (let i = 0; i < def.pts.length - 1; i++) {
    const [ax, az] = def.pts[i], [bx, bz] = def.pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 6));
    const nx = -(bz - az) / len, nz = (bx - ax) / len;
    for (let k = 0; k < n; k++) {
      const t = k / n, m = Math.sin((i + t) * 2.1 + ri * 3) * 7 * Math.sin(t * Math.PI);
      pts.push({ x: ax + (bx - ax) * t + nx * m, z: az + (bz - az) * t + nz * m });
    }
  }
  const last = def.pts[def.pts.length - 1]; pts.push({ x: last[0], z: last[1] });
  let len = 0;
  pts.forEach((p, i) => { if (i) len += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z); p.l = len; });
  let prev = 1e9;
  for (const p of pts) {
    p.t = p.l / len;
    let s = Math.min(stageC(p.x, p.z) - 0.7, prev - 0.03);
    s = lerp(s, SEA + 0.12, smooth(0.82, 1, p.t));
    s = Math.max(s, SEA + 0.12);
    p.s = prev = Math.min(s, prev);
    p.w = lerp(3.5, 9, p.t);
    p.dc = lerp(0.9, 4.6, smooth(0.5, 0.9, p.t));
  }
  let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
  for (const p of pts) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); minz = Math.min(minz, p.z); maxz = Math.max(maxz, p.z); }
  const M = 75;
  return { name: def.name, pts, len, minx: minx - M, maxx: maxx + M, minz: minz - M, maxz: maxz + M };
});
/* nearest river point: fills RQ, no allocation */
const RQ = { L: 1e9, s: 0, w: 0, dc: 0, t: 0, river: null };
function riverAt(x, z) {
  RQ.L = 1e9; RQ.river = null;
  for (const R of RIVERS) {
    if (x < R.minx || x > R.maxx || z < R.minz || z > R.maxz) continue;
    const P = R.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], vx = b.x - a.x, vz = b.z - a.z;
      const t = clamp(((x - a.x) * vx + (z - a.z) * vz) / (vx * vx + vz * vz), 0, 1);
      const L = Math.hypot(x - a.x - vx * t, z - a.z - vz * t);
      const w = lerp(a.w, b.w, t);
      if (L - w < RQ.L - RQ.w) { RQ.L = L; RQ.w = w; RQ.s = lerp(a.s, b.s, t); RQ.dc = lerp(a.dc, b.dc, t); RQ.t = lerp(a.t, b.t, t); RQ.river = R; }
    }
  }
  return RQ.river !== null;
}

export function heightAt(x, z) {
  let h = stageC(x, z);
  // rivers cut their valleys (only out in the new country)
  if (riverAt(x, z) && RQ.L < RQ.w + 80) {
    const { L, w, s, dc } = RQ;
    const carve = L < w ? s - dc * (1 - (L / w) * (L / w)) : s + 0.3 + (L - w) * 0.45 + Math.max(0, L - w - 18) ** 2 * 0.012;
    const r = Math.hypot(x, z), oR = oldEdge(x, z);
    h = lerp(h, Math.min(h, carve), smooth(oR + 5, oR + 40, r));
  }
  // the lagoon and its channel to the sea
  const dl = Math.hypot(x - LAG.x, z - LAG.z);
  if (dl < LAG.r + 140) {
    const lh = dl < LAG.r ? SEA - 22 * smooth(LAG.r, LAG.r * 0.15, dl) : SEA + 0.3 + (dl - LAG.r) * 0.1 + Math.max(0, dl - LAG.r - 25) ** 2 * 0.012;
    h = Math.min(h, lh);
    const vx = LAG_CH.x - LAG.x, vz = LAG_CH.z - LAG.z;
    const t = clamp(((x - LAG.x) * vx + (z - LAG.z) * vz) / (vx * vx + vz * vz), 0, 1);
    const L = Math.hypot(x - LAG.x - vx * t, z - LAG.z - vz * t);
    if (L < 90) h = Math.min(h, L < 9 ? SEA - 5 * (1 - (L / 9) ** 2) : SEA + (L - 9) * 0.15 + Math.max(0, L - 20) ** 2 * 0.015);
  }
  return Math.max(h, -80);
}

/* ---------- water ---------- */
function waterDepth(x, z) {
  const h = heightAt(x, z);
  let d = SEA - h;
  if (riverAt(x, z) && RQ.L < RQ.w + 1) d = Math.max(d, RQ.s - h);
  return d > 0 ? d : 0;
}
const isWater = (x, z) => waterDepth(x, z) > SWIM;
const onPier = (x, z, z0, z1) => Math.abs(x) < 3.6 && z > z0 - 9 && z < z1 + 1;

export const CAMP = { x: -26, z: 130 };
const CLEAR = [{ x: CAMP.x, z: CAMP.z, r: 30 }, { x: 40, z: -60, r: 15 }, { x: -30, z: 70, r: 15 }, { x: 70, z: 50, r: 15 }];

const STONE = ['#7f7a6c', '#6e6a5e', '#8a8474', '#5f5c52', '#777064'];
const MOSS = ['#3f6a34', '#4a7a3a', '#2f5a2e'];
const LEAF = ['#2f6a3a', '#3a7a40', '#24583a', '#4a8a3a', '#2a5048'];

export function buildLeotik(scene) {
  const rng = mulberry32(4409);
  const pick = a => a[Math.floor(rng() * a.length)];
  const col = new Colliders(heightAt);
  const trees = [];   // trunks a Punk can swing round

  /* ---------- the pier's footing (fixed: quests and saves start here) ---------- */
  const dockZ0 = oldEdge(0, 170) - 6;
  const pierY = 1.2, pierEnd = dockZ0 + 46;

  /* ---------- where you can go ---------- */
  function inBounds(x, z) {
    if (onPier(x, z, dockZ0, pierEnd)) return true;
    if (waterDepth(x, z) > WADE) return false;
    const r = Math.hypot(x, z);
    if (r < oldEdge(x, z) - 1) return true;                       // the old heart is all walkable
    if (Math.hypot(x - PERCH.x, z - PERCH.z) < 10) return true;
    if (volcanoH(x, z) > 66) return false;
    const e = 1.5, gx = heightAt(x + e, z) - heightAt(x - e, z), gz = heightAt(x, z + e) - heightAt(x, z - e);
    return Math.hypot(gx, gz) / (2 * e) < 1.5;
  }
  /* deep water you can swim in: rivers, the lagoon, and the sea close in round the island */
  function swimOk(x, z) {
    if (waterDepth(x, z) <= WADE) return false;
    return Math.hypot(x, z) < coastR(Math.atan2(z, x)) + 30;
  }
  function barrierLine(x, z) {
    if (inBounds(x, z)) return '';
    if (waterDepth(x, z) > WADE) return 'That’s open sea past here — the swell would drown us. Back to the island.';
    if (volcanoH(x, z) > 40) return 'The volcano’s flanks are too sheer and too hot to climb.';
    if (coastD(x, z) < 30) return 'The sea cliff is too sheer to climb.';
    return 'The ridge is too sheer to climb.';
  }

  /* ---------- terrain: one mesh, dense in the old heart, coarser toward the sea ---------- */
  const N = 300;
  const mapAxis = (u, A, Bn, Bp) => A * u + (u < 0 ? Bn : Bp) * u * u * u;
  const tg = new THREE.PlaneGeometry(2, 2, N, N); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position, tcol = new Float32Array(tp.count * 3);
  const c = new THREE.Color(), gA = new THREE.Color('#3f6e38'), gB = new THREE.Color('#5a7f3a'), gC = new THREE.Color('#2c5638'),
    mud = new THREE.Color('#5a4a32'), rock = new THREE.Color('#6b6258'), rockD = new THREE.Color('#4a4038'), acidC = new THREE.Color('#7ab83a'), pave = new THREE.Color('#8a8676'),
    sand = new THREE.Color('#cbb68a'), wetSand = new THREE.Color('#8a7a5a'), seabed = new THREE.Color('#3a5250'), basalt = new THREE.Color('#2e2a28'), ash = new THREE.Color('#6a625c'),
    ember = new THREE.Color('#8a3a1a'), soil = new THREE.Color('#5a4028'), jungle = new THREE.Color('#24502e');
  const roads = [[0, 175, 0, 20], [0, 20, 0, -120], [0, 20, -80, 14], [0, 20, 90, -4], [-20, -60, -78, -96],
    [-6, -170, -40, -250], [-40, -250, -60, -352]];   // the new track north to the basalt stair
  const roadDist = (x, z) => {
    let best = 1e9;
    for (const [ax, az, bx, bz] of roads) {
      const vx = bx - ax, vz = bz - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
      best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
    }
    return best;
  };
  for (let i = 0; i < tp.count; i++) {
    const u = tp.getX(i), v = tp.getZ(i);
    const x = mapAxis(u, 300, 400, 400), z = mapAxis(v, 300, 500, 240);
    tp.setX(i, x); tp.setZ(i, z);
    const edge = Math.abs(u) > 0.999 || Math.abs(v) > 0.999;
    const y = edge ? -120 : heightAt(x, z);
    tp.setY(i, y);
    const r = Math.hypot(x, z), oR = oldEdge(x, z), wNew = smooth(oR - 15, oR + 45, r);
    const n = fbm(x * 0.03 + 7, z * 0.03, 3), n2 = fbm(x * 0.1, z * 0.1, 2);
    c.copy(gA).lerp(gB, smooth(0.45, 0.72, n)).lerp(gC, smooth(0.5, 0.25, n2) * 0.7);
    c.lerp(jungle, wNew * smooth(0.55, 0.35, n) * 0.6);
    c.lerp(mud, smooth(5, 2.5, roadDist(x, z)) * 0.75);
    c.lerp(mud, smooth(46, 26, Math.hypot(x - SITES.bog.x, z - SITES.bog.z)) * 0.5);
    for (const b of BOGS) c.lerp(acidC, smooth(b.r + 3, b.r - 1, Math.hypot(x - b.x, z - b.z)) * 0.6);
    c.lerp(pave, smooth(28, 24, Math.hypot(x - KEEP.x, z - KEEP.z)));
    for (const f of JU) c.lerp(soil, smooth(f.r + 1.5, f.r - 0.5, Math.hypot(x - f.x, z - f.z)) * 0.8);
    // steep ground shows rock
    if (!edge && wNew > 0.01) {
      const sl = Math.hypot(heightAt(x + 1.5, z) - heightAt(x - 1.5, z), heightAt(x, z + 1.5) - heightAt(x, z - 1.5)) / 3;
      c.lerp(rock, smooth(0.8, 1.5, sl) * wNew).lerp(rockD, smooth(1.5, 3, sl) * wNew);
    }
    // the volcano: basalt, ash toward the top, ember-red in the crater
    const vh = volcanoH(x, z);
    if (vh > 0) {
      c.lerp(basalt, smooth(4, 40, vh)).lerp(ash, smooth(90, 130, vh) * 0.7);
      c.lerp(ember, smooth(VOLC.crater, VOLC.crater - 10, Math.hypot(x - VOLC.x, z - VOLC.z)));
    }
    // river banks
    if (riverAt(x, z) && RQ.L < RQ.w + 5) c.lerp(mud, smooth(RQ.w + 5, RQ.w, RQ.L) * 0.7);
    // the shore: sand and wet sand, rock where cliffs drop into the sea, seabed below
    const d = coastD(x, z), b = beachiness(x, z, Math.atan2(z, x));
    if (y < SEA + 3.5) c.lerp(sand, smooth(SEA + 3.5, SEA + 1.2, y) * b * smooth(70, 30, d));
    c.lerp(sand, smooth(LAG.r + 22, LAG.r + 4, Math.hypot(x - LAG.x, z - LAG.z)) * smooth(SEA + 5, SEA + 1, y));
    if (y < SEA + 0.7) c.lerp(wetSand, smooth(SEA + 0.7, SEA - 0.3, y));
    if (d < 6 && b < 0.5 && y > SEA - 4) c.lerp(rockD, smooth(6, 1, d) * (1 - b * 2));
    if (y < SEA - 0.5) c.lerp(seabed, smooth(SEA - 0.5, SEA - 12, y));
    tcol[i * 3] = c.r; tcol[i * 3 + 1] = c.g; tcol[i * 3 + 2] = c.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  tg.computeVertexNormals(); tg.computeBoundingSphere();
  const terrain = new THREE.Mesh(tg, toon(0xffffff, { vertexColors: true }));
  terrain.receiveShadow = true; scene.add(terrain);

  /* ---------- the sea: one big plane, tinted by a baked depth map ---------- */
  const DBOX = { x0: -720, z0: -840, sx: 1440, sz: 1460 }, DT = 256;
  const dData = new Uint8Array(DT * DT * 4);
  for (let j = 0; j < DT; j++) for (let i = 0; i < DT; i++) {
    const x = DBOX.x0 + (i + 0.5) / DT * DBOX.sx, z = DBOX.z0 + (j + 0.5) / DT * DBOX.sz;
    const d = SEA - heightAt(x, z), k = (j * DT + i) * 4;
    dData[k] = clamp(Math.round(d / 40 * 255), 0, 255); dData[k + 1] = 0; dData[k + 2] = 0; dData[k + 3] = 255;
  }
  const depthTex = new THREE.DataTexture(dData, DT, DT, THREE.RGBAFormat);
  depthTex.magFilter = depthTex.minFilter = THREE.LinearFilter; depthTex.needsUpdate = true;
  const seaU = {
    uTime: { value: 0 }, uDepth: { value: depthTex }, uBox: { value: new THREE.Vector4(DBOX.x0, DBOX.z0, DBOX.sx, DBOX.sz) },
    uShal: { value: new THREE.Color('#3fa6a0') }, uDeep: { value: new THREE.Color('#0e3448') }, uFoam: { value: new THREE.Color('#e8f4f0') },
    uGlow: { value: new THREE.Color('#2ad8c8') },
  };
  const seaMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: ramp(), transparent: true, depthWrite: false });
  seaMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, seaU);
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = `varying vec3 vWP; uniform float uTime; uniform sampler2D uDepth; uniform vec4 uBox; uniform vec3 uShal, uDeep, uFoam, uGlow;\n` +
      sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        vec2 duv = (vWP.xz - uBox.xy) / uBox.zw;
        float dep = (duv.x < 0.0 || duv.x > 1.0 || duv.y < 0.0 || duv.y > 1.0) ? 1.0 : texture2D(uDepth, duv).r;
        float wv = sin(vWP.x * 0.07 + uTime * 0.8) * sin(vWP.z * 0.06 - uTime * 0.6) * 0.5 + 0.5;
        float wv2 = sin(vWP.x * 0.29 - uTime * 1.6 + vWP.z * 0.21) * 0.5 + 0.5;
        vec3 wc = mix(uShal, uDeep, smoothstep(0.0, 0.3, dep));
        wc *= 0.88 + 0.24 * wv * wv2;
        float foam = 1.0 - smoothstep(0.004, 0.022 + wv * 0.02, dep);
        foam *= step(0.0005, dep) * 0.85;
        wc = mix(wc, uFoam, foam);
        float spark = pow(max(0.0, sin(vWP.x * 1.3 + uTime * 0.7) * sin(vWP.z * 1.1 - uTime * 0.5)), 24.0) * (1.0 - smoothstep(0.05, 0.25, dep));
        vec4 diffuseColor = vec4(wc, mix(0.62, 0.94, smoothstep(0.0, 0.2, dep)) + foam * 0.2);`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uGlow * spark * 0.8 + uDeep * 0.15;');
  };
  const sea = new THREE.Mesh(new THREE.CircleGeometry(9000, 64), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.y = SEA; sea.renderOrder = 1; scene.add(sea);

  /* ---------- rivers: ribbons on their stepped surfaces ---------- */
  const riverU = { uTime: { value: 0 } };
  const riverMat = new THREE.MeshToonMaterial({ color: 0x3a8a8a, gradientMap: ramp(), transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  riverMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = riverU.uTime;
    sh.vertexShader = 'attribute float aFlow; attribute float aSide; varying float vFlow; varying float vSide;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vFlow = aFlow; vSide = aSide;');
    sh.fragmentShader = 'uniform float uTime; varying float vFlow; varying float vSide;\n' + sh.fragmentShader
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        float st = sin(vFlow * 0.9 - uTime * 3.0 + sin(vSide * 3.0) * 1.5) * 0.5 + 0.5;
        vec3 rc = diffuse * (0.85 + 0.3 * st * st);
        rc = mix(rc, vec3(0.85, 0.95, 0.92), smoothstep(0.75, 1.0, abs(vSide)) * 0.5);
        vec4 diffuseColor = vec4(rc, opacity);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(0.05, 0.25, 0.25) * pow(st, 8.0) * 0.6;');
  };
  for (const R of RIVERS) {
    const pos = [], flow = [], side = [], idx = [];
    let n = 0;
    for (let i = 0; i < R.pts.length; i++) {
      const p = R.pts[i];
      if (stageC(p.x, p.z) < SEA - 0.3 || Math.hypot(p.x - LAG.x, p.z - LAG.z) < LAG.r - 4) break;
      const a = R.pts[Math.max(0, i - 1)], b = R.pts[Math.min(R.pts.length - 1, i + 1)];
      const dx = b.x - a.x, dz = b.z - a.z, dl = Math.hypot(dx, dz) || 1, nx = -dz / dl, nz = dx / dl, w = p.w + 0.8;
      pos.push(p.x + nx * w, p.s + 0.02, p.z + nz * w, p.x - nx * w, p.s + 0.02, p.z - nz * w);
      flow.push(p.l * 0.6, p.l * 0.6); side.push(-1, 1);
      if (n) { const k = (n - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      n++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 1));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
    g.setIndex(idx); g.computeVertexNormals();
    // normals point down when the winding flips; force them up
    const nm = g.attributes.normal; for (let i = 0; i < nm.count; i++) nm.setXYZ(i, 0, 1, 0);
    const m = new THREE.Mesh(g, riverMat); m.renderOrder = 2; scene.add(m);
  }

  /* ---------- kits ---------- */
  const blocks = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 3600);
  const trunks = new Kit(scene, new THREE.CylinderGeometry(0.7, 1, 1, 7), toon(0xffffff), 1300);
  const crowns = new Kit(scene, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), 2400);
  const crownsLo = new Kit(scene, new THREE.IcosahedronGeometry(1, 0), toon(0xffffff), 2600, false);
  const fronds = new Kit(scene, new THREE.ConeGeometry(1, 1, 4, 1, true), toon(0xffffff, { side: THREE.DoubleSide }), 2000, false);
  const fronds2 = new Kit(scene, new THREE.ConeGeometry(1, 1, 4, 1, true), toon(0xffffff, { side: THREE.DoubleSide }), 3200, false);
  const shrooms = new Kit(scene, new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshToonMaterial({ color: 0xffffff, emissive: 0x2a4a6a, emissiveIntensity: 0.7, gradientMap: ramp() }), 600, false);
  const stems = new Kit(scene, new THREE.CylinderGeometry(1, 1, 1, 6), toon(0xe8e0d0), 600, false);
  const rocks = new Kit(scene, new THREE.DodecahedronGeometry(1, 0), toon(0xffffff), 1000);
  const lava = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), 400, false);

  function block(x, z, w, d, h, ang = 0, color, opts = {}) {
    const g = opts.base ?? Math.min(heightAt(x - w / 2, z - d / 2), heightAt(x + w / 2, z + d / 2), heightAt(x - w / 2, z + d / 2), heightAt(x + w / 2, z - d / 2), heightAt(x, z));
    const bot = g - (opts.sink ?? 1.2), top = (opts.base ?? heightAt(x, z)) + h;
    blocks.put(x, (bot + top) / 2, z, w, top - bot, d, 0, ang, 0, color || pick(STONE));
    if (rng() < (opts.moss ?? 0.6)) blocks.put(x, top + 0.08, z, w * 1.05, 0.22, d * 1.05, 0, ang, 0, pick(MOSS));
    if (!opts.noCol) col.add(x, z, w / 2, d / 2, ang, bot, top);
    return top;
  }
  function wall(ax, az, bx, bz, hMin, hMax, opts = {}) {
    const len = Math.hypot(bx - ax, bz - az), ang = -Math.atan2(bz - az, bx - ax);
    const n = Math.max(1, Math.round(len / 2.6)), seg = len / n;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      if (opts.door != null && Math.abs(t - opts.door) < 1.8 / len) continue;
      if (rng() < (opts.gaps ?? 0.2)) continue;
      block(ax + (bx - ax) * t, az + (bz - az) * t, seg + 0.02, opts.thick ?? 1.1, hMin + Math.pow(rng(), 1.3) * (hMax - hMin), ang, null, { moss: 0.7 });
    }
  }
  function ruin(cx, cz, w, d, hMax, rot) {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const P = (lx, lz) => [cx + lx * cs + lz * sn, cz - lx * sn + lz * cs];
    const k = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
    const door = Math.floor(rng() * 4);
    for (let s = 0; s < 4; s++) wall(k[s][0], k[s][1], k[(s + 1) % 4][0], k[(s + 1) % 4][1], 0.8, hMax, { door: s === door ? 0.5 : null, gaps: 0.25 });
  }
  const FLAT_KEEP = [...ALBALI.map(p => ({ x: p.x, z: p.z, r: 10 })), ...JU.map(f => ({ x: f.x, z: f.z, r: f.r + 3 })), { x: PERCH.x, z: PERCH.z, r: 10 }];
  const nearRiver = (x, z, m) => riverAt(x, z) && RQ.L < RQ.w + m;
  const rampDist = (x, z) => {
    const vx = RAMP.bx - RAMP.ax, vz = RAMP.bz - RAMP.az, t = clamp(((x - RAMP.ax) * vx + (z - RAMP.az) * vz) / (vx * vx + vz * vz), 0, 1);
    return Math.hypot(x - RAMP.ax - vx * t, z - RAMP.az - vz * t);
  };
  const keepOut = (x, z, extra = 0) => {
    if (CLEAR.some(c => Math.hypot(x - c.x, z - c.z) < c.r + extra)) return true;
    if (FLAT_KEEP.some(c => Math.hypot(x - c.x, z - c.z) < c.r + extra)) return true;
    for (const k in SITES) if (Math.hypot(x - SITES[k].x, z - SITES[k].z) < 30 + extra) return true;
    if (roadDist(x, z) < 7 + extra) return true;
    if (coastD(x, z) < 14) return true;
    for (const b of BOGS) if (Math.hypot(x - b.x, z - b.z) < b.r + 3) return true;
    return false;
  };

  /* ---------- the jungle ---------- */
  function jungleTree(x, z, s, lo) {
    const g = heightAt(x, z), h = 9 + s * 9;
    trees.push({ x, z, g, h, r: 0.5 * s });
    trunks.put(x, g + h / 2 - 0.5, z, 0.5 * s, h, 0.5 * s, (rng() - 0.5) * 0.1, rng() * 6, (rng() - 0.5) * 0.1, pick(['#4a3a2a', '#3a3026', '#5a4630']));
    const lc = pick(LEAF), kit = lo ? crownsLo : crowns;
    for (let k = 0, nk = lo ? 3 : 4 + Math.floor(rng() * 3); k < nk; k++) {
      const r = (2.4 + rng() * 2) * s * (lo ? 1.2 : 1);
      kit.put(x + (rng() - 0.5) * 4 * s, g + h + (rng() - 0.3) * 2.2 * s, z + (rng() - 0.5) * 4 * s, r, r * 0.55, r, rng(), rng(), rng(), new THREE.Color(lc).offsetHSL((rng() - 0.5) * 0.05, 0, (rng() - 0.5) * 0.1).getStyle());
    }
    if (!lo) for (let k = 0; k < 3; k++) {   // hanging vines
      const vl = 3 + rng() * 5;
      blocks.put(x + (rng() - 0.5) * 5 * s, g + h - vl / 2, z + (rng() - 0.5) * 5 * s, 0.08, vl, 0.08, 0, 0, 0, '#2f5a2a');
    }
    col.add(x, z, 0.5 * s, 0.5 * s, 0, g - 1, g + h);
  }
  function fern(x, z, s, kit = fronds) {
    const g = heightAt(x, z);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 + rng();
      kit.put(x + Math.cos(a) * 0.5 * s, g + 0.6 * s, z + Math.sin(a) * 0.5 * s, 0.35 * s, 1.8 * s, 0.05 * s, Math.cos(a) * 1.0, 0, -Math.sin(a) * 1.0, pick(['#3f7a3a', '#2f6a34', '#5a8a3a']));
    }
  }
  function mushroom(x, z, s, color) {
    const g = heightAt(x, z);
    stems.put(x, g + s * 0.6, z, s * 0.12, s * 1.2, s * 0.12, 0, 0, 0, '#d8d0c0');
    shrooms.put(x, g + s * 1.15, z, s * 0.6, s * 0.4, s * 0.6, 0, 0, 0, color);
  }
  function palm(x, z, s) {
    const g = heightAt(x, z), lean = (rng() - 0.5) * 0.5, ry = rng() * 6.28, h = 7 * s;
    let px = x, py = g, pz = z;
    for (let k = 0; k < 3; k++) {            // a curved trunk in three pieces
      const tilt = lean * (k + 1) * 0.6, seg = h / 3;
      const dx = Math.sin(tilt) * Math.cos(ry) * seg, dz = Math.sin(tilt) * Math.sin(ry) * seg, dy = Math.cos(tilt) * seg;
      trunks.put(px + dx / 2, py + dy / 2, pz + dz / 2, 0.28 * s, seg + 0.2, 0.28 * s, Math.sin(ry) * tilt, 0, -Math.cos(ry) * tilt, '#7a6448');
      px += dx; py += dy; pz += dz;
    }
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2 + rng() * 0.4;
      fronds2.put(px + Math.cos(a) * 1.4 * s, py - 0.3 * s, pz + Math.sin(a) * 1.4 * s, 0.45 * s, 3.4 * s, 0.06 * s, Math.cos(a) * 1.9, 0, -Math.sin(a) * 1.9, pick(['#4a8a3a', '#3f7a34', '#5a9a40']));
    }
    col.add(x, z, 0.3 * s, 0.3 * s, 0, g - 1, g + 3);
  }
  // the old heart's jungle (unchanged)
  for (let i = 0; i < 900 && trunks.mesh.count < 300; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 190, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z, -6)) continue;
    jungleTree(x, z, 0.8 + rng() * 0.8);
  }
  for (let i = 0; i < 900; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 190, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (coastD(x, z) < 6 || roadDist(x, z) < 3) continue;
    if (rng() < 0.75) fern(x, z, 0.8 + rng() * 1.2);
    else mushroom(x, z, 0.6 + rng() * 1.8, pick(['#4ad8e0', '#b070ff', '#7aff8a', '#4a9aff']));
  }
  for (let i = 0; i < 160; i++) {
    const a = rng() * Math.PI * 2, r = rng() * 180, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (coastD(x, z) < 4 || roadDist(x, z) < 5 || CLEAR.some(c => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    const s = 0.5 + Math.pow(rng(), 3) * 3;
    rocks.put(x, heightAt(x, z) + s * 0.3, z, s * (1 + rng() * 0.5), s * 0.7, s, rng() * 3, rng() * 3, rng() * 3, pick(STONE));
    if (s > 0.6) col.add(x, z, s * 0.8, s * 0.8, 0, heightAt(x, z) - 1, heightAt(x, z) + s * 0.9);
  }

  /* ---------- the new country: jungle valleys, palms, rocky shores ---------- */
  const r2 = mulberry32(7711);
  const pick2 = a => a[Math.floor(r2() * a.length)];
  const isNew = (x, z) => Math.hypot(x, z) > oldEdge(x, z) - 4;
  for (let i = 0; i < 9000 && trunks.mesh.count < 1050; i++) {
    const x = (r2() - 0.5) * 1120, z = -680 + r2() * 940;
    if (!isNew(x, z) || keepOut(x, z, -4) || nearRiver(x, z, 4) || rampDist(x, z) < 6) continue;
    if (Math.hypot(x - LAG.x, z - LAG.z) < LAG.r + 10) continue;
    const vh = volcanoH(x, z);
    if (vh > 45 || (vh > 12 && r2() < 0.7)) continue;
    if (fbm(x * 0.012 + 40, z * 0.012, 2) < 0.4 && r2() < 0.8) continue;   // glades
    if (!inBounds(x, z)) continue;
    jungleTree(x, z, 0.8 + r2() * 0.9, true);
  }
  for (let i = 0; i < 3000 && trunks.mesh.count < 1290; i++) {
    const a = r2() * Math.PI * 2;
    const R = coastR(a), rr = R - 4 - r2() * 26, px = Math.cos(a) * rr, pz = Math.sin(a) * rr;
    if (beachiness(px, pz, a) < 0.55 || coastD(px, pz) < 3 || heightAt(px, pz) > SEA + 6 || nearRiver(px, pz, 2)) continue;
    if (onPier(px, pz, dockZ0, pierEnd) || Math.abs(px) < 22 && pz > 150) continue;
    palm(px, pz, 0.8 + r2() * 0.5);
  }
  for (let i = 0; i < 2600; i++) {
    const x = (r2() - 0.5) * 1120, z = -680 + r2() * 940;
    if (!isNew(x, z) || coastD(x, z) < 8 || nearRiver(x, z, 1) || volcanoH(x, z) > 30) continue;
    if (r2() < 0.8) fern(x, z, 0.9 + r2() * 1.3, fronds2);
    else mushroom(x, z, 0.6 + r2() * 2.2, pick2(['#4ad8e0', '#b070ff', '#7aff8a', '#4a9aff', '#ff7ad8']));
  }
  // boulders on the rocky shores
  for (let i = 0; i < 2500 && rocks.mesh.count < 700; i++) {
    const a = r2() * Math.PI * 2, R = coastR(a), rr = R - 10 + r2() * 30, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (beachiness(x, z, a) > 0.45 || onPier(x, z, dockZ0, pierEnd)) continue;
    const s = 1 + Math.pow(r2(), 2) * 5, g = heightAt(x, z);
    rocks.put(x, Math.max(g, SEA - 1) + s * 0.2, z, s * (1 + r2() * 0.5), s * 0.8, s, r2() * 3, r2() * 3, r2() * 3, pick2(['#4a4440', '#3a3634', '#5a544c']));
  }
  // sea stacks off the cliffs
  for (let i = 0, n = 0; i < 400 && n < 22; i++) {
    const a = r2() * Math.PI * 2, R = coastR(a), rr = R + 25 + r2() * 70, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (beachiness(x, z, a) > 0.3 || Math.abs(x) < 80 && z > 0) continue;
    const s = 4 + r2() * 6, H = 14 + r2() * 30;
    for (let k = 0; k < 3; k++) rocks.put(x + (r2() - 0.5) * 2, SEA - 8 + (k + 0.5) * (H + 8) / 3, z + (r2() - 0.5) * 2, s * (1 - k * 0.18), (H + 8) / 3 * 0.75, s * (1 - k * 0.18) * 0.9, r2() * 0.3, r2() * 6, r2() * 0.3, pick2(['#4a4440', '#3a3634', '#55504a']));
    crownsLo.put(x, SEA + H + 0.5, z, s * 0.6, s * 0.25, s * 0.6, 0, r2() * 6, 0, '#3f6a34');
    n++;
  }
  // more of Villtur's bones out in the wilds
  for (let i = 0, n = 0; i < 400 && n < 12; i++) {
    const x = (r2() - 0.5) * 1000, z = -620 + r2() * 840;
    if (!isNew(x, z) || keepOut(x, z, 6) || nearRiver(x, z, 12) || volcanoH(x, z) > 8 || Math.hypot(x - LAG.x, z - LAG.z) < LAG.r + 20) continue;
    ruin(x, z, 5 + r2() * 6, 5 + r2() * 6, 1.5 + r2() * 3.5, r2() * Math.PI); n++;
  }

  /* ---------- the volcano: crater fire, lava seams, glints ---------- */
  const lavaGlows = [];
  {
    const floorY = heightAt(VOLC.x, VOLC.z);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(12, 24), new THREE.MeshBasicMaterial({ color: 0xff6a20 }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(VOLC.x, floorY + 1.2, VOLC.z); scene.add(pool);
    const gl = glowSprite(0xff7a30, 70, 0.55); gl.position.set(VOLC.x, floorY + 18, VOLC.z); scene.add(gl); lavaGlows.push(gl);
    // lava seams running down the flanks
    for (let s = 0; s < 7; s++) {
      const a = s / 7 * Math.PI * 2 + r2() * 0.5;
      if (Math.abs(a - Math.PI / 2) < 0.4) continue;    // keep the south stair dark
      let d = VOLC.crater + 2;
      while (d < VOLC.R * 0.62) {
        const wob = Math.sin(d * 0.08 + s) * 0.08, x = VOLC.x + Math.cos(a + wob) * d, z = VOLC.z + Math.sin(a + wob) * d;
        const x2 = VOLC.x + Math.cos(a + wob) * (d + 4), z2 = VOLC.z + Math.sin(a + wob) * (d + 4);
        const y = heightAt(x, z), y2 = heightAt(x2, z2), tilt = Math.atan2(y - y2, 4);
        lava.put((x + x2) / 2, (y + y2) / 2 + 0.25, (z + z2) / 2, 0.9 + (1 - d / VOLC.R) * 0.8, 0.35, 4.4, -tilt, -(a + wob) + Math.PI / 2, 0, pick2(['#ff5a10', '#ff7a20', '#ff9a30']));
        d += 4;
      }
    }
    // obsidian glints scattered on the slopes
    for (let i = 0; i < 120; i++) {
      const a = r2() * Math.PI * 2, d = VOLC.crater + r2() * (VOLC.R - VOLC.crater), x = VOLC.x + Math.cos(a) * d, z = VOLC.z + Math.sin(a) * d;
      const s = 0.3 + r2() * 0.6;
      lava.put(x, heightAt(x, z) + s * 0.3, z, s, s * 1.6, s, r2() * 3, r2() * 3, r2() * 3, pick2(['#ffb040', '#ff6a30', '#ffd070', '#ff8a50']));
    }
  }

  /* ---------- acid bogs ---------- */
  const bogMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
    vertexShader: `varying vec2 vP;
      #include <fog_pars_vertex>
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `varying vec2 vP; uniform float uTime;
      #include <fog_pars_fragment>
      void main(){
        float w = sin(vP.x * 0.6 + uTime * 1.3) * sin(vP.y * 0.5 - uTime) * 0.5 + 0.5;
        vec3 c = mix(vec3(0.35, 0.62, 0.12), vec3(0.75, 1.0, 0.35), w * w);
        gl_FragColor = vec4(pow(c, vec3(2.2)) * 1.6, 1.0);
        #include <fog_fragment>
      }`,
    fog: true,
  });
  const hazards = [];
  for (const b of BOGS) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(b.r + 1, 32), bogMat);
    m.rotation.x = -Math.PI / 2; m.position.set(b.x, -1.7, b.z); scene.add(m);
    hazards.push({ x: b.x, z: b.z, r: b.r, y: -1.7, dps: 9, poison: 3, kind: 'acid' });
  }

  /* ---------- the Ruins of Villtur (east) ---------- */
  {
    const { x, z } = SITES.villtur;
    for (let i = 0; i < 7; i++) {
      const a = rng() * Math.PI * 2, r = 8 + rng() * 22;
      ruin(x + Math.cos(a) * r, z + Math.sin(a) * r, 6 + rng() * 6, 6 + rng() * 6, 2 + rng() * 4, rng() < 0.5 ? 0 : Math.PI / 2);
    }
    // a broken tower
    block(x - 4, z - 12, 6, 6, 11, 0, '#6e6a5e', { moss: 1 });
  }
  // scattered ruins in the wilds
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2, r = 30 + rng() * 140, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z, 4)) continue;
    ruin(x, z, 5 + rng() * 5, 5 + rng() * 5, 1.5 + rng() * 3, rng() * Math.PI);
  }

  /* ---------- the Keep and the Urverk (north) ---------- */
  const kg = KEEP_H;
  const keepDisk = new THREE.Mesh(new THREE.CylinderGeometry(28, 29, 0.6, 48), toon(0x8a8676));
  keepDisk.position.set(KEEP.x, kg - 0.22, KEEP.z); keepDisk.receiveShadow = true; scene.add(keepDisk);
  for (let i = 0; i < 40; i++) {
    const a0 = i / 40 * Math.PI * 2, a1 = (i + 1) / 40 * Math.PI * 2, R = 31;
    const mid = (a0 + a1) / 2;
    if (Math.abs(Math.sin(mid)) > 0.97 && Math.sin(mid) > 0) continue;   // the gate, facing south
    if (rng() < 0.22) continue;
    wall(KEEP.x + Math.cos(a0) * R, KEEP.z + Math.sin(a0) * R, KEEP.x + Math.cos(a1) * R, KEEP.z + Math.sin(a1) * R, 3, 9, { thick: 2.4, gaps: 0.05 });
  }
  // the Urverk: a ring of stygian standing on its edge
  const urverk = new THREE.Group();
  const ringMat = new THREE.MeshToonMaterial({ color: 0x2a2236, emissive: 0x6a2cff, emissiveIntensity: 0.2, gradientMap: ramp() });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.9, 10, 40), ringMat); ring.position.y = 7; addOutline(ring, 0.1); urverk.add(ring);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    const knob = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), ringMat); knob.position.set(Math.cos(a) * 6, 7 + Math.sin(a) * 6, 0); urverk.add(knob);
  }
  const portalMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uOn;
      void main(){
        vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
        float sw = sin(a * 5.0 + r * 12.0 - uTime * 3.0) * 0.5 + 0.5;
        vec3 c = mix(vec3(0.25, 0.05, 0.45), vec3(0.85, 0.6, 1.0), sw * (1.0 - r));
        gl_FragColor = vec4(pow(c, vec3(2.2)) * 2.0, (1.0 - smoothstep(0.85, 1.0, r)) * uOn * 0.9);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const portal = new THREE.Mesh(new THREE.CircleGeometry(5.3, 40), portalMat); portal.position.y = 7; urverk.add(portal);
  const base = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 4), toon(0x5a5650)); base.position.y = 0.3; addOutline(base, 0.06); urverk.add(base);
  urverk.position.set(KEEP.x, kg, KEEP.z - 18);
  scene.add(urverk);
  col.add(KEEP.x, KEEP.z - 18, 7, 2, 0, kg - 1, kg + 13);

  /* ---------- the three Klug pillars ---------- */
  const klugTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 512;
    const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 128, 512);
    g.fillStyle = '#c690ff'; g.font = 'bold 34px Georgia'; g.textAlign = 'center';
    for (let y = 70; y < 512; y += 150) { g.save(); g.translate(64, y); g.fillText('KLUG', 0, 0); g.restore(); }
    g.strokeStyle = '#8a5aff'; g.lineWidth = 3;
    for (let y = 20; y < 512; y += 40) { g.beginPath(); g.moveTo(20, y); g.lineTo(108, y + 8); g.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const pillars = [];
  const pillarSpots = [
    { key: 'bog', x: SITES.bog.x + 2, z: SITES.bog.z - 16 },
    { key: 'villtur', x: SITES.villtur.x + 6, z: SITES.villtur.z + 4 },
    { key: 'roost', x: SITES.roost.x, z: SITES.roost.z },
  ];
  for (const ps of pillarSpots) {
    const g = heightAt(ps.x, ps.z);
    const m = new THREE.MeshToonMaterial({ color: 0x2a2236, emissive: 0xffffff, emissiveMap: klugTex, emissiveIntensity: 0.15, gradientMap: ramp() });
    const grp = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.7, 12, 6), m); p.position.y = 6; addOutline(p, 0.08); grp.add(p);
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), m); tip.position.y = 12.8; addOutline(tip, 0.06); grp.add(tip);
    const glow = glowSprite(0xb48aff, 9, 0.0); glow.position.y = 9; grp.add(glow);
    grp.position.set(ps.x, g - 0.3, ps.z); scene.add(grp);
    col.add(ps.x, ps.z, 1.6, 1.6, 0, g - 1, g + 13);
    pillars.push({ key: ps.key, x: ps.x, z: ps.z, y: g, mat: m, glow, woken: false });
  }

  /* ---------- the landing pier, out into the harbour cove ---------- */
  {
    const wood = '#6a4a30', woodD = '#4a3020';
    for (let z = dockZ0 - 8; z < pierEnd; z += 1.6) blocks.put(0, pierY - 0.2, z, 6, 0.32, 1.45, 0, (rng() - 0.5) * 0.03, 0, rng() < 0.5 ? wood : '#7a5634');
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
    // the old stone quay the pier springs from, and a broken breakwater across the cove
    const qz = COVE.z - COVE.r;
    for (let x = -19; x <= 19; x += 2.6) {
      if (Math.abs(x) < 3.4) continue;
      const zq = COVE.z - Math.sqrt(Math.max(0, COVE.r * COVE.r - x * x));
      blocks.put(x, -4.2, zq + 0.4, 2.62, 10, 1.6, 0, Math.atan2(x, COVE.r) * 0.9, 0, pick(STONE));
    }
    for (const s of [-1, 1]) {
      blocks.put(s * 4.4, 1.2, qz - 1, 0.7, 1.6, 0.7, 0, 0, 0, '#5f5c52');   // bollards
      col.add(s * 4.4, qz - 1, 0.35, 0.35, 0, 0, 2);
    }
    for (let k = 0; k < 14; k++) {
      const a = Math.PI * 0.62 + k * 0.035, x = COVE.x - 58 + Math.cos(a) * 16 + k * 2.2, z = COVE.z - 30 + k * 4.6;
      if (rng() < 0.18) continue;
      blocks.put(x, SEA - 3 + 3.6 + rng() * 0.8, z, 3.4 + rng(), 7 + rng() * 2, 2.6, rng() * 0.1, rng() * 0.5, rng() * 0.1, pick(STONE));
    }
  }

  /* ---------- floating islets: a few, high in the storm ---------- */
  const islets = [];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + 0.4 + r2() * 0.6, r = 280 + r2() * 400, s = 6 + r2() * 10;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const grp = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.9, s * 0.35, 8), toon(0x3f6e38));
    const bottom = new THREE.Mesh(new THREE.ConeGeometry(s * 0.92, s * 2.2, 8), toon(0x5a524a));
    bottom.rotation.x = Math.PI; bottom.position.y = -s * 1.25;
    const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(s * 0.45, 0), toon(0x2f6a3a)); tuft.position.set(s * 0.2, s * 0.45, -s * 0.1);
    grp.add(top, bottom, tuft); outlineAll(grp, 0.12);
    grp.position.set(x, Math.max(0, heightAt(x, z), volcanoH(x, z)) + 130 + r2() * 90, z);
    grp.userData = { by: grp.position.y, ph: r2() * 6, sp: 0.15 + r2() * 0.25 };
    scene.add(grp); islets.push(grp);
  }

  /* ---------- the horizon: other islands and a far coast ---------- */
  const farMats = [];
  const farMat = hex => { const m = toon(hex, { fog: false }); m.userData.base = new THREE.Color(hex); farMats.push(m); return m; };
  {
    const isles = [[0.6, 1500, 260, 120], [1.2, 2300, 420, 210], [2.2, 1300, 180, 70], [2.75, 1900, 380, 160], [3.5, 1650, 240, 230],
      [4.1, 2600, 520, 140], [5.6, 1400, 200, 90], [0.15, 2000, 300, 110]];
    const mIsle = farMat(0x3a4a44);
    for (const [a, d, rad, h] of isles) {
      const g = new THREE.ConeGeometry(rad, h + 30, 14, 4);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (fbm(x * 0.01 + a * 9, z * 0.01, 2) - 0.5) * 0.7;
        p.setXYZ(i, x * k, y * (0.8 + k * 0.3), z * k);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, mIsle);
      m.position.set(Math.cos(a) * d, SEA + (h + 30) / 2 - 30, Math.sin(a) * d); m.scale.set(1.6, 1, 1);
      m.rotation.y = a; scene.add(m);
    }
    // one of them smokes too
    const fg = glowSprite(0xff7a30, 120, 0.25); fg.position.set(Math.cos(3.5) * 1650, SEA + 210, Math.sin(3.5) * 1650); scene.add(fg); lavaGlows.push(fg);
    // the far coast: a mountain wall across the north-east horizon
    const A0 = -2.1, A1 = -0.35, SEG = 70, pos = [], idx = [];
    for (let i = 0; i <= SEG; i++) {
      const a = lerp(A0, A1, i / SEG), R = 3600 + Math.sin(i * 0.7) * 160;
      const hh = (160 + fbm(i * 0.18, 3, 3) * 420) * smooth(0, 6, i) * smooth(SEG, SEG - 6, i);
      pos.push(Math.cos(a) * R, SEA - 20, Math.sin(a) * R, Math.cos(a) * (R + 120), SEA + hh, Math.sin(a) * (R + 120));
      if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setIndex(idx); cg.computeVertexNormals();
    scene.add(new THREE.Mesh(cg, farMat(0x34403e)));
  }

  blocks.done(); trunks.done(); crowns.done(); crownsLo.done(); fronds.done(); fronds2.done(); shrooms.done(); stems.done(); rocks.done(); lava.done();
  const grass = buildGrass(scene, rng, (x, z) => {
    if (coastD(x, z) < 4 || roadDist(x, z) < 3 || heightAt(x, z) < SEA + 1) return false;
    for (const b of BOGS) if (Math.hypot(x - b.x, z - b.z) < b.r + 1) return false;
    return Math.hypot(x - KEEP.x, z - KEEP.z) > 29;
  }, heightAt, ['#3f7a3a', '#4f8a3a', '#2f6a34', '#5a8a40', '#3a6a40'], 30000);

  /* ---------- healing Zahreh (rarer here) ---------- */
  const flowers = [];
  const petal = new THREE.MeshToonMaterial({ color: 0xffb0d0, emissive: 0xff70b0, emissiveIntensity: 0.6, gradientMap: ramp() });
  for (const [fx, fz] of [[6, 110], [-20, 60], [30, 30], [-50, 40], [60, -20], [-40, -40], [20, -80], [-100, -60], [110, 30], [70, 60], [-60, 90]]) {
    const grp = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), petal);
      const a = k / 5 * Math.PI * 2; p.position.set(Math.cos(a) * 0.3, 0.9, Math.sin(a) * 0.3); p.scale.set(1, 0.45, 1.6); p.rotation.y = -a; grp.add(p);
    }
    const gl = glowSprite(0xff8ac8, 2.2, 0.6); gl.position.y = 1; grp.add(gl);
    grp.position.set(fx, heightAt(fx, fz), fz); scene.add(grp);
    flowers.push({ grp, x: fx, z: fz, ready: true, timer: 0 });
  }

  const lanterns = [
    { id: 'l_pier', name: 'The Landing', x: 5, z: dockZ0 - 10 },
    { id: 'l_cross', name: 'The Crossroads', x: 6, z: 22 },
    { id: 'l_bog', name: 'The Bog Edge', x: -58, z: 22 },
    { id: 'l_villtur', name: 'Villtur Gate', x: 64, z: 4 },
    { id: 'l_keep', name: 'Below the Keep', x: 6, z: -100 },
  ];
  const stones = [
    { key: 'l_villtur', x: 84, z: 10 }, { key: 'l_bogs', x: -60, z: 6 }, { key: 'l_roost', x: -60, z: -80 }, { key: 'l_keep', x: -10, z: -118 },
  ];

  const spawnGroups = [
    { at: [-6, 96], kinds: ['tyndael', 'tyndael'] },
    { at: [20, 60], kinds: ['rodak', 'rodak', 'rodak'] },
    { at: [-30, 50], kinds: ['kipsu', 'kipsu', 'kipsu', 'kipsu'] },
    { at: [-80, 30], kinds: ['tyndael', 'malsti', 'malsti'] },
    { at: [-100, -4], kinds: ['sruvorn'], unique: 'sruvorn' },
    { at: [-64, -10], kinds: ['punk', 'punk', 'tyndael'] },
    { at: [80, 8], kinds: ['rodak', 'rodak', 'rodak', 'rodak'] },
    { at: [100, -10], kinds: ['vel'], unique: 'vel_villtur' },
    { at: [104, 10], kinds: ['punk', 'punk', 'malsti', 'malsti'] },
    { at: [60, -40], kinds: ['tyndael', 'tyndael', 'punk'] },
    { at: [-70, -86], kinds: ['albali_t', 'albali_t', 'albali_t'] },
    { at: [-86, -104], kinds: ['albali_t', 'tyndael', 'tyndael'] },
    { at: [-30, -70], kinds: ['rodak', 'rodak', 'rodak'] },
    { at: [0, -112], kinds: ['vel', 'malsti', 'malsti'], unique: 'vel_keep' },
    { at: [30, -110], kinds: ['punk', 'punk', 'tyndael'] },
    { at: [-60, 100], kinds: ['kipsu', 'kipsu'] },
    // friendly Kipsu families, and three lost pups crying in the rain
    { at: [30, 120], kinds: ['kipsu_f', 'kipsu_f', 'kipsu_f'] },
    { at: [60, 90], kinds: ['kofi', 'kofi', 'kofi'] }, { at: [-60, 40], kinds: ['kofi', 'kofi'] }, { at: [90, -90], kinds: ['kofi', 'kofi'] },
    { at: [110, -40], kinds: ['kipsu_f'], unique: 'pup_1', extra: { pup: 1, scale: 0.5 } },
    { at: [-110, -40], kinds: ['kipsu_f'], unique: 'pup_2', extra: { pup: 2, scale: 0.5 } },
    { at: [20, -40], kinds: ['kipsu_f'], unique: 'pup_3', extra: { pup: 3, scale: 0.5 } },
    { at: [50, 100], kinds: ['albali_t', 'albali_t'] },
  ];

  /* ---------- the open world, for main.js and the wilds ---------- */
  const zones = [
    { id: 'l_strand', name: 'The Landing Strand', x: 100, z: 196, r: 40, biome: 'shore' },
    { id: 'l_saltwrack', name: 'Saltwrack Beach', x: -120, z: 196, r: 40, biome: 'shore' },
    { id: 'l_mangrove', name: 'The Brine Mangroves', x: -270, z: 120, r: 60, biome: 'bog' },
    { id: 'l_dripwood', name: 'The Dripwood', x: -330, z: -30, r: 75, biome: 'jungle' },
    { id: 'l_vinewater', name: 'Vinewater Valley', x: -270, z: -215, r: 75, biome: 'jungle' },
    { id: 'l_gullcliffs', name: 'The Gull Cliffs', x: -360, z: -390, r: 60, biome: 'hills' },
    { id: 'l_cinder', name: 'The Cinder Slopes', x: -50, z: -370, r: 45, biome: 'ash' },
    { id: 'l_ashfall', name: 'The Ashfall Shoulder', x: -200, z: -500, r: 50, biome: 'ash' },
    { id: 'l_stormbreak', name: 'Stormbreak Heights', x: 160, z: -470, r: 75, biome: 'hills' },
    { id: 'l_northwood', name: 'The Thunderwood', x: 40, z: -300, r: 60, biome: 'forest' },
    { id: 'l_sunken', name: 'The Sunken Valley', x: 165, z: -235, r: 70, biome: 'jungle' },
    { id: 'l_hookthorn', name: 'The Hookthorn Wilds', x: 330, z: -170, r: 65, biome: 'forest' },
    { id: 'l_lagoon', name: 'The Glass Lagoon', x: LAG.x, z: LAG.z, r: LAG.r - 5, biome: 'lake' },
    { id: 'l_lagoonshore', name: 'The Lagoon Shore', x: 255, z: 110, r: 45, biome: 'shore' },
    { id: 'l_eastreach', name: 'The East Reach', x: 210, z: 40, r: 40, biome: 'jungle' },
  ];
  const CRATER_Y = heightAt(VOLC.x, VOLC.z);
  const kuniPerch = { x: PERCH.x, z: PERCH.z, y: FLATS[FLATS.length - 1].h };

  return {
    board: { x: CAMP.x + 9, z: CAMP.z + 9 },
    name: 'leotik', camp: CAMP, heightAt, col, SITES, trees, PLAZA: { x: KEEP.x, z: KEEP.z, y: kg }, urverk: { group: urverk, ringMat, portalMat },
    pier: { y: pierY, start: new THREE.Vector3(0, pierY, pierEnd - 6), end: pierEnd, z0: dockZ0 },
    edgeRadius, flowers, spawnGroups, hazards, pillars, lanterns, stones, falls: [],
    inBounds, barrierLine, swimOk,
    water: { level: SEA, isWater, depth: waterDepth, rivers: RIVERS.map(R => R.name), lagoon: { x: LAG.x, z: LAG.z, r: LAG.r } },
    zones, albaliSpots: ALBALI.map(p => ({ x: p.x, z: p.z })), juFields: JU.map(f => ({ ...f })), kuniPerch, clear: CLEAR,
    update(t, dt, particles, camPos) {
      bogMat.uniforms.uTime.value = t; portalMat.uniforms.uTime.value = t;
      seaU.uTime.value = t; riverU.uTime.value = t;
      grass.material.userData.shader && (grass.material.userData.shader.uniforms.uTime.value = t);
      islets.forEach(g => { g.position.y = g.userData.by + Math.sin(t * g.userData.sp + g.userData.ph) * 3; });
      flowers.forEach(f => { if (f.ready) f.grp.rotation.y = t * 0.5; });
      pillars.forEach(p => { if (p.woken) { p.glow.material.opacity = 0.5 + Math.sin(t * 3) * 0.15; p.mat.emissiveIntensity = 0.9; } });
      // the horizon takes on the storm's colour
      if (scene.fog) for (const m of farMats) m.color.copy(m.userData.base).lerp(scene.fog.color, 0.55);
      lavaGlows[0].material.opacity = 0.45 + Math.sin(t * 1.7) * 0.1;
      if (particles) {
        for (const b of BOGS) if (Math.random() < 0.25) {
          const a = Math.random() * 6.28, r = Math.random() * b.r;
          particles.emit(b.x + Math.cos(a) * r, -1.5, b.z + Math.sin(a) * r, { vx: 0, vy: 1 + Math.random(), vz: 0, color: 0xb0ff4a, size: 0.6, life: 1.2, drag: 0.5 });
        }
        if (camPos) {
          for (let k = 0; k < 6; k++) {
            // rain
            particles.emit(camPos.x + (Math.random() - 0.5) * 50, camPos.y + 18, camPos.z + (Math.random() - 0.5) * 50,
              { vx: -2, vy: -38, vz: 1, color: 0x9ab8c8, size: 0.09, life: 0.9, drag: 0 });
          }
          // embers from the crater when you are anywhere near
          if (Math.hypot(camPos.x - VOLC.x, camPos.z - VOLC.z) < 600 && Math.random() < 0.5) {
            const a = Math.random() * 6.28, r = Math.random() * 12;
            particles.emit(VOLC.x + Math.cos(a) * r, CRATER_Y + 3, VOLC.z + Math.sin(a) * r, { vx: (Math.random() - 0.5) * 4, vy: 8 + Math.random() * 8, vz: (Math.random() - 0.5) * 4, color: 0xff8a30, size: 1.2, life: 2.5, drag: 0.2 });
          }
        }
      }
    },
  };
}
