/* ============================================================
   HOME TREES — the great trees of the Tatu that folk live in.
   Each is a town on its own, and the town is INSIDE it: the
   trunk is hollow, wider than a city square at the foot, and
   folk live in the heartwood, a whole village stacked up in it.
   Nothing is built on the outside of the trunk at all: the bark
   shows only the light of the windows, the openings cut through
   it, and the great door at the roots standing open. Up in the
   crown, plank bridges run from limb to limb with hammocks
   slung under them.

   Inside: a great hall on the ground with a hearth in the middle,
   a ring of market stalls round it, bunting overhead and the
   rooms' doors all round its wall; above it floor after
   floor, each a ring round an open well that runs up the middle
   of the tree to the roof of the hollow, with a rail round the
   well, a rope bridge straight across the well, and hammocks
   slung out over it; flags and washing strung across the well
   between the floors; glowing pods hanging down
   the well on long ropes; rooms off every floor, their doorways
   lit and curtained; and the great stair winding round and round
   up the inside of the wall from the hall to the top floor,
   coming up through a gap in each floor on its way.

   buildHomeTree(scene, x, z, g, opts) adds one and hands back
   { x, z, g, R, RB, H, rAt, rIn, levels, stair, openings, door,
     ceilY, roots, reach, colliders, root } and its walking rules,
   ground(x, z, y) / resolve(p, rad) / solid(x, y, z), so any scene
   can walk in at the door, round the floors and up the stair —
   plus levelSpot(i, a), stairPoint(y), doorPoint() and inside(),
   for placing things and finding the way. colliders are plain
   records ({ kind:'cyl', x, z, r, y0, y1 }): the roots, the hearth.
   ============================================================ */
import * as THREE from 'three';
import { toon } from './gfx.js';
import { mulberry32 } from './util.js';
import { noSolid } from './solid.js';

const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const angDiff = (p, q) => Math.atan2(Math.sin(p - q), Math.cos(p - q));
const STEP = 0.65, PH = 1.5;   // what a walker steps up without trying; how tall one is (the scenes use the same)

/* one InstancedMesh, filled as you go, trimmed when done */
function batch(parent, geo, mat, max, { shadow = true, recv = true } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, max); m.count = 0;
  m.castShadow = shadow; m.receiveShadow = recv;
  const o = new THREE.Object3D(), col = new THREE.Color();
  o.rotation.order = 'YXZ';   // turned round first, then tipped: so a thing can lean with a wall it's set against
  parent.add(m);
  return {
    mesh: m,
    put(x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, c = null) {
      if (m.count >= max) return;
      o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); o.updateMatrix();
      m.setMatrixAt(m.count, o.matrix);
      if (c != null) m.setColorAt(m.count, col.set(c));
      m.count++;
    },
    // a segment from a to b (a unit cylinder along +y, base at 0)
    seg(a, b, r0, _r1, c = null) {
      if (m.count >= max) return;
      const d = V3().subVectors(b, a), len = d.length();
      o.position.copy(a); o.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); o.scale.set(r0, len, r0); o.updateMatrix();
      m.setMatrixAt(m.count, o.matrix);
      if (c != null) m.setColorAt(m.count, col.set(c));
      m.count++;
    },
    done() { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); },
  };
}

export function buildHomeTree(scene, x, z, g, opts = {}) {
  const rnd = mulberry32(opts.seed ?? 7);
  const R = opts.R ?? 12, H = opts.H ?? 260, RB = R * 1.75;              // trunk radius, height, flared base
  const town = opts.town ?? 1;                                          // how lived-in (how many floors)
  const bark = new THREE.Color(opts.bark ?? 0x6a4a34), barkDark = new THREE.Color(opts.barkDark ?? 0x3e2a1e);
  const heart = new THREE.Color(0xa06c46), heartDark = new THREE.Color(0x6e4529), heartCut = new THREE.Color(0x8e5c3a);
  const leafCols = opts.leaves ?? [0x3e6a34, 0x47763a, 0x355e30, 0x52823f];
  const colliders = [];
  const root = new THREE.Group(); root.position.set(x, g, z); scene.add(root);

  /* ---- its shape ---- */
  // the trunk's radius at height y, round angle a: a wide flare into buttresses at the foot, tapering up
  const flareH = R * 1.8;
  const baseR = y => R * (1 - 0.42 * y / H) + (RB - R) * Math.exp(-y / (flareH * 0.55));
  const rAt = (y, a) => {
    const lobes = 1 + 0.16 * Math.sin(a * 7 + 1.3) * Math.exp(-y / (flareH * 1.2)) + 0.04 * Math.sin(a * 13 + y * 0.05);
    return baseR(y) * lobes;
  };
  // the hollow inside: round, a wall's thickness in from the bark at its thinnest, flaring out into the hall at the foot
  const WALL = Math.max(1.6, R * 0.12);
  const rIn = y => { const q = Math.max(0, y); return baseR(q) * (1 - 0.16 * Math.exp(-q / (flareH * 1.2)) - 0.04) - WALL; };
  let rOutMax = 0; for (let k = 0; k < 96; k++) rOutMax = Math.max(rOutMax, rAt(0, k / 96 * TAU));

  // the floors, and the roof of the hollow a good way over the top one
  const levelYs = opts.decks ? opts.decks.map(f => H * f) : [0.08, 0.17, 0.27, 0.38, 0.5].map(f => H * f).slice(0, Math.max(1, Math.round(5 * town)));
  const topY = levelYs[levelYs.length - 1], ceilY = topY + Math.max(9, R * 0.7);
  // the great door at the roots, facing where the folk come from
  const doorA = opts.doorAt ?? 0, doorH = Math.min(14, levelYs[0] - 1.4, R * 1.05), doorW = Math.min(9, R * 0.62);
  // the great stair: up the inside of the wall from the hall to the top floor, anticlockwise, no steeper than a hill road,
  // starting just to the side of the door so that it is well over the door's head by the time it comes round again
  let rMean = 0; for (let k = 0; k <= 16; k++) rMean += (rIn(topY * k / 16) - 1.6) / 17;
  const S0 = 0.3, turns = Math.max(1.2, topY / (0.42 * rMean * TAU)), span = turns * TAU, risePerRad = (topY - S0) / span;
  const doorHw = doorW * 0.5 / rAt(doorH * 0.5, doorA), a0 = doorA + doorHw + 0.55;
  const stairA = y => a0 + (y - S0) / (topY - S0) * span;
  // the heights at which the stair passes round angle a
  const stairYs = a => { const out = [], b = ((a - a0) % TAU + TAU) % TAU; for (let k = 0; k <= Math.ceil(turns) + 1; k++) { const t = (b + k * TAU) / span; if (t <= 1) out.push(S0 + t * (topY - S0)); } return out; };
  const stairIn = (a, y0, y1) => stairYs(a).some(s => s > y0 && s < y1);
  // where the stair comes up through a floor, a slot is left open behind it, long enough to pass under the floor upright
  const WELL0 = -Math.max(0.5, 2.7 / risePerRad), WELL1 = 0.08;
  const levels = levelYs.map((y, i) => { const ri = rIn(y), sa = stairA(y); return { i, y, ri, rWell: Math.max(2.4, ri * 0.34), slot: [sa + WELL0, sa + WELL1], next: levelYs[i + 1] ?? ceilY, looks: [], bA: doorA + 0.6 + i * 1.9, bw: 0.9 }; });
  // how far (x, z) (local) is to the side of floor L's bridge across the well
  const across = (L, lx, lz) => -lx * Math.sin(L.bA) + lz * Math.cos(L.bA);
  const inSlot = (L, a) => { const k = angDiff(a, L.slot[0]); return k >= 0 && k <= L.slot[1] - L.slot[0]; };

  // the openings through the wall: the great door (the only one you can walk through), tall windows high in the hall,
  // and on every floor a few wide openings looking out over the country, a sill's height off the floor
  const openings = [];
  const addOpening = (a, y0, y1, wM, kind) => { const o = { a, hw: wM * 0.5 / rAt(Math.max(0, (y0 + y1) / 2), a), y0, y1, kind, pass: kind === 'door' }; openings.push(o); return o; };
  const door = addOpening(doorA, -2, doorH, doorW, 'door');
  const clearOfStair = (a, hwI, y0, y1) => [-hwI, 0, hwI].every(q => !stairIn(a + q, y0, y1));
  const fits = (a, hwI, y0, y1) => clearOfStair(a, hwI, y0, y1) && openings.every(o => o.y1 < y0 - 0.5 || o.y0 > y1 + 0.5 || Math.abs(angDiff(a, o.a)) > o.hw + hwI + 0.1);
  {
    const wM = Math.min(3.2, R * 0.25), y0 = 3.4, y1 = Math.min(levelYs[0] - 2.2, 10);
    if (y1 - y0 > 2) for (const off of [2.2, -2.2, Math.PI]) for (const j of [0, 0.3, -0.3, 0.6, -0.6]) {
      const a = doorA + off + j, hwI = wM * 0.5 / rIn(y0) + 0.1;
      if (fits(a, hwI, y0 - 3.8, y1 + 0.6)) { addOpening(a, y0, y1, wM, 'hall'); break; }
    }
  }
  for (const L of levels) {
    const y0 = L.y + 0.95, y1 = L.y + Math.min(6.5, L.next - L.y - 3);
    if (y1 - y0 < 2) continue;
    const n = Math.max(3, Math.min(7, Math.round(L.ri * TAU / 16))), wM = Math.min(5.5, R * 0.42), hwI = wM * 0.5 / L.ri + 0.12;
    for (let k = 0; k < n; k++) for (const j of [0, 0.22, -0.22, 0.45, -0.45]) {
      const a = doorA + (k + (L.i % 2) * 0.5) / n * TAU + j;
      if (Math.abs(angDiff(a, (L.slot[0] + L.slot[1]) / 2)) < (L.slot[1] - L.slot[0]) / 2 + hwI + 0.2) continue;
      if (fits(a, hwI, y0 - 3.8, y1 + 0.6)) { addOpening(a, y0, y1, wM, 'look'); L.looks.push(a); break; }
    }
  }
  // the bark is cut on a grid of columns round the trunk: snap each opening's sides to them
  const SA = 96, dA = TAU / SA;
  for (const o of openings) {
    const c0 = Math.round((o.a - o.hw) / dA), c1 = Math.max(c0 + 1, Math.round((o.a + o.hw) / dA));
    Object.assign(o, { c0, c1, a: (c0 + c1) / 2 * dA, hw: (c1 - c0) / 2 * dA });
  }
  for (const L of levels) L.looks = openings.filter(o => o.kind === 'look' && o.y0 > L.y && o.y0 < L.y + 2).map(o => o.a);
  const cellOpen = (c, y) => openings.some(o => y > o.y0 && y < o.y1 && ((c - o.c0) % SA + SA) % SA < o.c1 - o.c0);
  const openAt = (a, y, pad = 0) => openings.find(o => y > o.y0 - pad && y < o.y1 + pad && Math.abs(angDiff(a, o.a)) < o.hw + pad / 6);

  /* ---- the trunk: the bark outside, the heartwood in, and the cut faces where the openings go through ---- */
  {
    const TOPY = H * 0.92 - 2, SY = 56, brk = [-2, -0.5, ceilY];
    for (const o of openings) brk.push(o.y0, o.y1);
    let ys = [];
    for (let j = 0; j <= SY; j++) ys.push(-2 + j / SY * (TOPY + 2));
    ys = ys.filter(y => !brk.some(b => Math.abs(b - y) < 0.35)).concat(brk.filter(b => b >= -2 && b <= TOPY));
    ys = [...new Set(ys)].sort((p, q) => p - q);
    const c = new THREE.Color();
    const barkCol = (y, a) => { const groove = Math.pow(Math.abs(Math.sin(a * 11 + y * 0.012)), 6); return c.copy(bark).lerp(barkDark, groove * 0.7 + 0.15 * Math.sin(y * 0.03 + a * 3) ** 2); };
    const heartCol = (y, a) => { const ring = 0.5 + 0.5 * Math.sin(y * 0.55 + Math.sin(a * 3) * 1.5), grain = Math.pow(Math.abs(Math.sin(a * 23 + y * 0.04)), 8); return c.copy(heart).lerp(heartDark, ring * 0.35 + grain * 0.4); };
    const surf = (rows, rFn, colFn, inward) => {
      const pos = [], col = [], idx = [], NC = SA + 1;
      for (const y of rows) for (let i = 0; i <= SA; i++) { const a = i * dA, r = rFn(y, a), q = colFn(y, a); pos.push(Math.cos(a) * r, y, Math.sin(a) * r); col.push(q.r, q.g, q.b); }
      for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < SA; i++) {
        if (cellOpen(i, (rows[j] + rows[j + 1]) / 2)) continue;
        const p00 = j * NC + i, p10 = p00 + 1, p01 = p00 + NC, p11 = p01 + 1;
        if (inward) idx.push(p00, p10, p11, p00, p11, p01); else idx.push(p00, p11, p10, p00, p01, p11);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(idx); geo.computeVertexNormals(); return geo;
    };
    const trunk = new THREE.Mesh(surf(ys, (y, a) => rAt(Math.max(0, y), a), barkCol, false), toon(0xffffff, { vertexColors: true }));
    trunk.castShadow = trunk.receiveShadow = true;
    root.add(noSolid(trunk));   // the walls are the tree's own walking rules (below), true to its swell
    // the heartwood, lit by the lamps in it rather than shadowed by the bark
    const inMat = toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide });
    const hollow = new THREE.Mesh(surf(ys.filter(y => y <= ceilY + 1e-6), y => rIn(y), heartCol, true), inMat);
    root.add(noSolid(hollow));
    // the cut faces: the sides, sill and head of every opening, through the thickness of the wall
    const rv = [], rc = [];
    const quad = (A, B, C, D) => { for (const p of [A, B, C, A, C, D]) { rv.push(p.x, p.y, p.z); rc.push(heartCut.r, heartCut.g, heartCut.b); } };
    const O = (a, y) => { const r = rAt(Math.max(0, y), a); return V3(Math.cos(a) * r, y, Math.sin(a) * r); };
    const I = (a, y) => { const r = rIn(y); return V3(Math.cos(a) * r, y, Math.sin(a) * r); };
    for (const o of openings) {
      const aL = o.c0 * dA, aR = o.c1 * dA, rows = ys.filter(y => y >= o.y0 - 1e-6 && y <= o.y1 + 1e-6);
      for (let j = 0; j < rows.length - 1; j++) for (const aa of [aL, aR]) quad(O(aa, rows[j]), I(aa, rows[j]), I(aa, rows[j + 1]), O(aa, rows[j + 1]));
      for (let k = o.c0; k < o.c1; k++) for (const yy of [o.y0, o.y1]) if (yy > -0.4) quad(O(k * dA, yy), O((k + 1) * dA, yy), I((k + 1) * dA, yy), I(k * dA, yy));
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3)); rg.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3)); rg.computeVertexNormals();
    root.add(noSolid(new THREE.Mesh(rg, inMat)));
    // the roof of the hollow, and the floor of the hall
    const roof = new THREE.Mesh(new THREE.CircleGeometry(rIn(ceilY) + 0.4, 48).rotateX(Math.PI / 2), toon(0x5e3c26, { side: THREE.DoubleSide })); roof.position.y = ceilY; root.add(noSolid(roof));
    const hallFloor = new THREE.Mesh(new THREE.CircleGeometry(rIn(0) + 0.6, 64).rotateX(-Math.PI / 2), toon(0x7a5838, { side: THREE.DoubleSide })); hallFloor.position.y = 0.04; root.add(noSolid(hallFloor));
  }

  /* ---- roots: out over the ground like ridges of hill (none across the great door) ---- */
  const limbs = batch(root, new THREE.CylinderGeometry(0.7, 1, 1, 9, 1).translate(0, 0.5, 0), toon(0xffffff), 900);
  const nRoots = opts.roots ?? 9, rootReach = opts.rootReach ?? 2.25, rootAs = [];
  for (let i = 0; i < nRoots; i++) {
    const a = i / nRoots * TAU + rnd() * 0.3;
    if (opts.rootSkip && opts.rootSkip(a)) continue;
    if (Math.abs(angDiff(a, door.a)) < door.hw + 0.45) continue;
    rootAs.push(a);
    const r0 = RB * 0.92, reach = Math.max(RB * 1.3, RB * (rootReach - 0.4 + rnd() * 0.6)), steps = 7;   // (from out in the wall, clear of the hall)
    let prev = V3(Math.cos(a) * r0, R * 0.9, Math.sin(a) * r0);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, d = r0 + (reach - r0) * t, wob = Math.sin(t * 4 + i) * 0.12;
      const cur = V3(Math.cos(a + wob) * d, R * 0.9 * Math.pow(1 - t, 1.6) - t * 1.2, Math.sin(a + wob) * d);
      const rr = R * 0.42 * (1 - t * 0.75);
      limbs.seg(prev, cur, rr, rr, barkDark.clone().lerp(bark, 0.5));
      // something to walk into: a post at each joint as high as the root is there
      if (s < steps) colliders.push({ kind: 'cyl', x: x + cur.x, z: z + cur.z, r: rr * 0.85, y0: g - 3, y1: g + cur.y + rr * 0.7 });
      prev = cur;
    }
  }

  /* ---- great limbs, out and up into the crown, from above the roof of the hollow ---- */
  const leafB = batch(root, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), 420, { shadow: true });
  const crowns = [];
  const nLimbs = opts.limbs ?? 13;
  const limbPaths = [];   // each limb's joints, root to tip, with its radius there: for windows in the thick of it
  for (let i = 0; i < nLimbs; i++) {
    const a = i / nLimbs * TAU + rnd() * 0.5, y0 = Math.max(H * (0.48 + rnd() * 0.34), ceilY + R * 0.6), len = H * (0.34 + rnd() * 0.16), up = 0.25 + rnd() * 0.4;
    let prev = V3(Math.cos(a) * rAt(y0, a) * 0.6, y0, Math.sin(a) * rAt(y0, a) * 0.6);
    const steps = 6, path = [{ p: prev.clone(), r: R * 0.34 }];
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, d = rAt(y0, a) * 0.6 + len * t;
      const cur = V3(Math.cos(a + Math.sin(t * 3 + i) * 0.1) * d, y0 + len * up * t + Math.sin(t * Math.PI) * len * 0.12, Math.sin(a + Math.sin(t * 3 + i) * 0.1) * d);
      const rr = R * 0.34 * (1 - t * 0.74);
      limbs.seg(prev, cur, rr, rr, bark);
      path.push({ p: cur.clone(), r: rr });
      if (s >= steps - 2) crowns.push(cur.clone());
      prev = cur;
    }
    limbPaths.push({ a, path });
    // a few smaller boughs off each limb
    for (let b = 0; b < 3; b++) {
      const from = prev.clone().multiplyScalar(0.55 + b * 0.15); from.y = y0 + (prev.y - y0) * (0.55 + b * 0.15);
      const ba = a + (rnd() - 0.5) * 1.6, bl = len * 0.35;
      const to = from.clone().add(V3(Math.cos(ba) * bl, bl * 0.45, Math.sin(ba) * bl));
      limbs.seg(from, to, R * 0.1, R * 0.1, bark); crowns.push(to);
    }
  }
  crowns.push(V3(0, H * 0.96, 0), V3(R * 2, H * 0.9, -R * 1.5), V3(-R * 2, H * 0.92, R * 1.2));
  // a broad dome over it all, so from below it's a roof of leaf
  for (let k = 0; k < 18; k++) { const a = k / 18 * TAU + rnd() * 0.3, d = H * (0.2 + rnd() * 0.25); crowns.push(V3(Math.cos(a) * d, H * (0.8 + rnd() * 0.12) - d * 0.25, Math.sin(a) * d)); }
  // the crown: leaf-clouds round every bough end, big and soft
  for (const c of crowns) {
    for (let k = 0; k < 3; k++) {
      const s = H * (0.075 + rnd() * 0.055);
      leafB.put(c.x + (rnd() - 0.5) * s * 1.4, c.y + (rnd() - 0.2) * s * 0.7, c.z + (rnd() - 0.5) * s * 1.4, s, s * 0.62, s, rnd(), rnd() * 6, 0, leafCols[Math.floor(rnd() * leafCols.length)]);
    }
  }

  const wood = 0x8a6040, plank = 0xa87a50, frameC = 0x5a3a24;
  const faceRy = a => Math.PI / 2 - a;   // turned so its face looks along angle a (out from the middle; in, for a two-sided thing)

  /* ---- the outside: bare bark. All it shows of the town inside is the light in its windows, the openings cut
     through it, and the great door, standing open ---- */
  {
    const winB = batch(root, new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffd9a0, side: THREE.DoubleSide }), 900, { shadow: false });
    // the rooms in the heartwood show as lit windows all the way up the trunk, in loose storeys, clear of the openings
    const topW = Math.min(H * 0.62, ceilY + H * 0.08), k1 = Math.max(1, R / 14);
    for (let y = 5; y < topW; y += (3.6 + rnd() * 1.4) * k1) {
      const n = Math.max(2, Math.round(rAt(y, 0) * TAU / 7));
      for (let k = 0; k < n; k++) {
        if (rnd() < 0.42) continue;
        const a = k / n * TAU + rnd() * 0.25 + y * 0.07, w = (1.3 + rnd() * 0.7) * k1, h = (1.8 + rnd() * 0.8) * k1, yy = y + 1.8;
        if (openAt(a, yy, h)) continue;
        const r = rAt(yy, a) + 0.03; winB.put(Math.cos(a) * r, yy, Math.sin(a) * r, w, h, 1, 0, faceRy(a), 0);
      }
    }
    // and in the great limbs where they leave the trunk, still thick enough for a room or two
    for (const L of limbPaths) for (let s = 1; s < 3; s++) {
      const A = L.path[s - 1], B = L.path[s]; if (B.r < 2.4 || rnd() < 0.3) continue;
      const m = A.p.clone().lerp(B.p, 0.5), rr = (A.r + B.r) * 0.5, side = rnd() < 0.5 ? -1 : 1;
      const dir = B.p.clone().sub(A.p).normalize(), nrm = V3(-dir.z, 0, dir.x).multiplyScalar(side);
      const q = m.clone().addScaledVector(nrm, rr * 0.92).add(V3(0, rr * 0.25, 0));
      winB.put(q.x, q.y, q.z, 0.8, 1.0, 1, 0, Math.atan2(nrm.x, nrm.z), 0);
    }
    winB.done();
  }

  /* ---- up in the crown: plank bridges from limb to limb, high in the leaves, and hammocks slung under the limbs ---- */
  {
    const postB = batch(root, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 2400, { shadow: false });
    const ropeB = batch(root, new THREE.CylinderGeometry(1, 1, 1, 5, 1).translate(0, 0.5, 0), toon(0x6a5a40), 900, { shadow: false });
    const hamB = batch(root, new THREE.CylinderGeometry(1, 1, 1, 12, 1, true, Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), toon(0xffffff, { side: THREE.DoubleSide }), 60, { shadow: false });
    const lampB = batch(root, new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd59a }), 200, { shadow: false });
    const CL = [0xb8402e, 0x2f6f8a, 0xd9a441, 0x5a7a3a, 0x8a4a8a, 0xe8d8b8];
    const byA = limbPaths.slice().sort((p, q) => p.a - q.a);
    // each limb to the next one round, from the joints of the two nearest level with each other (in under the leaves)
    for (let k = 0; k < byA.length; k++) {
      const A = byA[k], B = byA[(k + 1) % byA.length];
      let best = null;
      for (const ja of [1, 2, 3]) for (const jb of [1, 2, 3]) {
        const pa = A.path[ja].p, pb = B.path[jb].p, dy = Math.abs(pa.y - pb.y), d = pa.distanceTo(pb), cost = dy + d * 0.15;
        if (dy < 12 && d > 6 && d < H * 0.4 && (!best || cost < best.cost)) best = { ja, jb, cost };
      }
      if (!best) continue;
      const pa = A.path[best.ja].p.clone(), pb = B.path[best.jb].p.clone(); pa.y += A.path[best.ja].r * 0.9; pb.y += B.path[best.jb].r * 0.9;
      const d = pa.distanceTo(pb);
      plankBridge(postB, ropeB, pa, pb, 0.06, 1.0, 0xa87a50, 0x8a6040);
      for (const t of [0.25, 0.5, 0.75]) { const q = pa.clone().lerp(pb, t); lampB.put(q.x, q.y - Math.sin(t * Math.PI) * d * 0.06 + 1.5, q.z, 0.22, 0.28, 0.22); }
    }
    for (const L of limbPaths) for (const j of [1, 2, 3]) {
      if (rnd() < 0.4) continue;
      const A = L.path[j], B = L.path[j + 1], dir = B.p.clone().sub(A.p); dir.y = 0;
      const len = Math.min(4, dir.length() * 0.55), c = A.p.clone().lerp(B.p, 0.5); c.y -= (A.r + B.r) * 0.5 + 1.6;
      const yaw = Math.atan2(dir.x, dir.z), t = dir.normalize();
      hamB.put(c.x, c.y, c.z, 0.65, 0.55, len, 0, yaw, 0, CL[Math.floor(rnd() * CL.length)]);
      for (const s of [-1, 1]) { const e = c.clone().addScaledVector(t, s * len / 2), top = A.p.clone().lerp(B.p, 0.5 + s * 0.28); ropeB.seg(e, top, 0.04, 0.04); }
    }
    for (const b of [postB, ropeB, hamB, lampB]) b.done();
  }

  /* ---- the town inside ---- */
  {
    const inner = noSolid(new THREE.Group()); root.add(inner);
    const IN = { shadow: false, recv: false };   // lamp-lit: the bark's shadow doesn't reach in here
    const floorM = toon(plank, { side: THREE.DoubleSide }), fasciaM = toon(wood, { side: THREE.DoubleSide });
    const inBox = batch(inner, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 9000, IN);
    const inStep = batch(inner, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 1200, IN);
    const inRope = batch(inner, new THREE.CylinderGeometry(1, 1, 1, 5, 1).translate(0, 0.5, 0), toon(0x6a5a40), 2600, IN);
    const inRib = batch(inner, new THREE.CylinderGeometry(0.7, 1, 1, 8, 1).translate(0, 0.5, 0), toon(0xffffff), 900, IN);
    const inGlow = batch(inner, new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 1400, IN);
    const inLamp = batch(inner, new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), 1800, IN);
    const inCloth = batch(inner, new THREE.PlaneGeometry(1, 1), toon(0xffffff, { side: THREE.DoubleSide }), 2400, IN);
    const inRug = batch(inner, new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), toon(0xffffff, { side: THREE.DoubleSide }), 200, IN);
    const inPot = batch(inner, new THREE.CylinderGeometry(0.8, 1, 1, 10, 1).translate(0, 0.5, 0), toon(0xffffff), 700, IN);
    // a hammock: a trough of cloth, its length along local z
    const inHam = batch(inner, new THREE.CylinderGeometry(1, 1, 1, 12, 1, true, Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), toon(0xffffff, { side: THREE.DoubleSide }), 160, IN);
    const inLeaf = batch(inner, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), 300, IN);
    const CLOTH = [0xb8402e, 0x2f6f8a, 0xd9a441, 0x5a7a3a, 0x8a4a8a, 0xe8d8b8], WARM = [0xffc27a, 0xffb060, 0xffd59a], GREEN = [0x4a7a3a, 0x5a8a40, 0x3e6a34];
    const BANNER = opts.banners ?? [0xb8402e, 0xd9a441];
    const P = (a, r, y) => V3(Math.cos(a) * r, y, Math.sin(a) * r);
    const prop = (lx, lz, ly, r, h) => colliders.push({ kind: 'cyl', x: x + lx, z: z + lz, r, y0: g + ly - 0.5, y1: g + ly + h });
    const ring = (ri, rO, a0, a1, y) => { if (a1 - a0 < 0.01) return; const m = new THREE.Mesh(new THREE.RingGeometry(ri, rO, Math.max(6, Math.round((a1 - a0) * 24)), 1, -a1, a1 - a0).rotateX(-Math.PI / 2), floorM); m.position.y = y; inner.add(m); };

    // a room off the wall: its doorway lit from inside, a curtain half across it, a frame, and a lamp by it — all leaning
    // with the wall it's cut into (the hall's wall slopes in as it rises)
    const innerRoom = (a, y, w = 1.8, h = 2.7) => {
      const fx = Math.cos(a), fz = Math.sin(a), tx = -Math.sin(a), tz = Math.cos(a), ry = faceRy(a), tilt = -Math.atan2(rIn(y) - rIn(y + h), h);
      const at = (yy, inset, side = 0) => { const r = rIn(yy) - inset; return [fx * r + tx * side, yy, fz * r + tz * side]; };
      inGlow.put(...at(y + h / 2, 0.08), w, h, 1, tilt, ry, 0, WARM[Math.floor(rnd() * WARM.length)]);
      const cw = w * (0.35 + rnd() * 0.3), side = rnd() < 0.5 ? -1 : 1, co = (w - cw) / 2 * side;
      inCloth.put(...at(y + h / 2, 0.2, co), cw, h * 0.98, 1, tilt, ry, 0, CLOTH[Math.floor(rnd() * CLOTH.length)]);
      for (const q of [-1, 1]) inBox.put(...at(y + h / 2, 0.22, q * (w / 2 + 0.12)), 0.26, h + 0.2, 0.4, tilt, ry, 0, frameC);
      inBox.put(...at(y + h + 0.15, 0.22), w + 0.7, 0.3, 0.45, tilt, ry, 0, frameC);
      if (rnd() < 0.6) inLamp.put(...at(y + h * 0.8, 0.5, -side * (w / 2 + 0.6)), 0.2, 0.27, 0.2, 0, 0, 0, 0xffd27a);
      if (rnd() < 0.4) inGlow.put(...at(y + h + 1.1, 0.08), 0.7, 0.7, 1, tilt, ry, 0, 0xffd9a0);   // a window into the loft over it
    };
    const roomsRound = (y, L) => {
      const rw = rIn(y + 1.4), w = L ? 1.8 : 2.2, h = L ? 2.7 : 3.2, n = Math.floor(rw * TAU / (w + 3.4)), half = (w * 0.5 + 0.8) / rw;
      for (let k = 0; k < n; k++) {
        const a = k / n * TAU + y * 0.13 + rnd() * 0.06;
        if (rnd() < 0.12) continue;
        if ([-half, 0, half].some(q => stairIn(a + q, y - 0.6, y + h + 1.6))) continue;          // the stair runs past here
        if (openings.some(o => o.y1 > y - 0.5 && o.y0 < y + h + 1.8 && Math.abs(angDiff(a, o.a)) < o.hw + half + 0.05)) continue;
        if (L && Math.abs(angDiff(a, (L.slot[0] + L.slot[1]) / 2)) < (L.slot[1] - L.slot[0]) / 2 + half + 0.1) continue;
        if (!L && Math.abs(angDiff(a, door.a)) < door.hw * 2.2 + half) continue;                 // (the door's leaves, swung back inside)
        innerRoom(a, y + 0.02, w, h);
      }
    };

    // a line strung from A to B, sagging, with flags (or washing) hung all along it
    const flagLine = (A, B, sag, washing) => {
      const n = Math.max(3, Math.round(A.distanceTo(B) / 0.9)), ry = -Math.atan2(B.z - A.z, B.x - A.x);
      let prev = A;
      for (let k = 1; k <= n; k++) {
        const t = k / n, q = A.clone().lerp(B, t); q.y -= Math.sin(t * Math.PI) * sag;
        inRope.seg(prev, q, 0.025, 0.025); prev = q;
        if (k < n) { const w = washing ? 0.5 + rnd() * 0.4 : 0.45, h = washing ? 0.6 + rnd() * 0.5 : 0.55; inCloth.put(q.x, q.y - h / 2 - 0.03, q.z, w, h, 1, 0, ry, 0, CLOTH[Math.floor(rnd() * CLOTH.length)]); }
      }
    };

    // ribs of heartwood running up the inside of the wall, from the hall floor to the roof
    for (let k = 0; k < 10; k++) {
      const a = (k + 0.5) / 10 * TAU + door.a;
      for (let y = 0; y < ceilY - 0.5; y += 3.5) {
        const y2 = Math.min(ceilY, y + 3.5); if (openAt(a, (y + y2) / 2, 1.5)) continue;
        inRib.seg(P(a, rIn(y) - 0.2, y), P(a, rIn(y2) - 0.2, y2), 0.4, 0.4, 0x7a4e30);
      }
    }

    /* the hall: a hearth in the middle under the well, benches round it, rugs, tables and stores by the wall, rooms all round */
    {
      const rh = rIn(0);
      inRug.put(0, 0.07, 0, Math.min(7, rh * 0.42), 1, Math.min(7, rh * 0.42), 0, 0, 0, 0x8a3a2a);
      inRug.put(0, 0.08, 0, Math.min(5.4, rh * 0.32), 1, Math.min(5.4, rh * 0.32), 0, 0, 0, 0xd9a441);
      const hearth = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.3, 0.7, 16, 1, true), toon(0x8a8478, { side: THREE.DoubleSide })); hearth.position.y = 0.35; inner.add(hearth);
      const embers = new THREE.Mesh(new THREE.CircleGeometry(1.9, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7a2a })); embers.position.y = 0.3; inner.add(embers);
      for (const [rr, hh, c] of [[0.85, 2.2, 0xffa040], [0.5, 1.6, 0xffe080]]) { const f = new THREE.Mesh(new THREE.ConeGeometry(rr, hh, 7), new THREE.MeshBasicMaterial({ color: c })); f.position.y = 0.3 + hh / 2; inner.add(f); }
      prop(0, 0, 0, 2.4, 0.8);
      const nB = 6;
      for (let k = 0; k < nB; k++) {
        const a = (k + 0.5) / nB * TAU, p = P(a, Math.min(5.4, rh * 0.32), 0);
        inBox.put(p.x, 0.32, p.z, 2.6, 0.18, 0.8, 0, faceRy(a), 0, 0x7a5232);
        for (const q of [-1, 1]) inBox.put(p.x - Math.sin(a) * q * 1.0, 0.14, p.z + Math.cos(a) * q * 1.0, 0.2, 0.28, 0.6, 0, faceRy(a), 0, 0x5a3a24);
        prop(p.x, p.z, 0, 0.9, 0.42);
      }
      // by the wall: long tables, baskets and jars, a loom — out of the way of the door and the foot of the stair
      for (let k = 0; k < 14; k++) {
        const a = door.a + (k + 0.5) / 14 * TAU, rr = rh - 3.6;
        if (Math.abs(angDiff(a, door.a)) < door.hw + 0.35 || stairIn(a, -1, 3.5) || stairIn(a + 0.15, -1, 3.5) || stairIn(a - 0.15, -1, 3.5)) continue;
        const p = P(a, rr, 0), kind = k % 3;
        if (kind === 0) { inBox.put(p.x, 0.9, p.z, 3.2, 0.14, 1.2, 0, faceRy(a), 0, 0x8a6040); inBox.put(p.x, 0.42, p.z, 0.5, 0.84, 0.5, 0, 0, 0, 0x5a3a24); inPot.put(p.x + 0.6, 0.97, p.z, 0.18, 0.3, 0.18, 0, 0, 0, 0xc8a070); inLamp.put(p.x - 0.7, 1.12, p.z, 0.16, 0.2, 0.16, 0, 0, 0, 0xffd27a); prop(p.x, p.z, 0, 1.4, 1); }
        else if (kind === 1) { for (let q = 0; q < 3; q++) { const qp = P(a + (q - 1) * 0.07, rr + 1.5, 0); inPot.put(qp.x, 0, qp.z, 0.55 + q * 0.1, 0.8 + q * 0.2, 0.55 + q * 0.1, 0, 0, 0, [0xb08850, 0x9a6a3a, 0xc89a60][q]); } prop(P(a, rr + 1.5, 0).x, P(a, rr + 1.5, 0).z, 0, 1.1, 1.2); }
        else { inBox.put(p.x, 1.1, p.z, 0.2, 2.2, 0.2, 0, faceRy(a), 0, 0x5a3a24); inCloth.put(p.x - Math.cos(a) * 0.05, 1.3, p.z - Math.sin(a) * 0.05, 1.8, 1.4, 1, 0, faceRy(a), 0, CLOTH[k % CLOTH.length]); inRug.put(p.x, 0.06, p.z, 1.4, 1, 1.4, 0, 0, 0, CLOTH[(k + 2) % CLOTH.length]); }
      }
      // a little market round the hall, between the hearth and the wall, clear of the way in from the door
      {
        const rs = Math.min(rh - 6, Math.max(8.4, rh * 0.56)), nS = Math.max(4, Math.min(9, Math.round(rs * TAU / 9)));
        for (let k = 0; k < nS; k++) {
          const a = door.a + (k + 0.5) / nS * TAU; if (Math.abs(angDiff(a, door.a)) < 0.55) continue;
          const p = P(a, rs, 0), ry = faceRy(a), tx = -Math.sin(a), tz = Math.cos(a), c1 = CLOTH[k % CLOTH.length], c2 = 0xf0e4c8;
          inBox.put(p.x, 0.5, p.z, 2.6, 1.0, 0.9, 0, ry, 0, 0x8a6040);                                    // the counter, facing the hearth
          for (const q of [-1, 1]) inBox.put(p.x + tx * q * 1.25 + Math.cos(a) * 0.35, 1.25, p.z + tz * q * 1.25 + Math.sin(a) * 0.35, 0.14, 2.5, 0.14, 0, ry, 0, 0x5a3a24);
          for (let st = 0; st < 4; st++) inCloth.put(p.x + tx * (st - 1.5) * 0.7 - Math.cos(a) * 0.15, 2.45, p.z + tz * (st - 1.5) * 0.7 - Math.sin(a) * 0.15, 0.7, 1.5, 1, -1.1, ry, 0, st % 2 ? c2 : c1);   // a striped awning
          for (let g2 = 0; g2 < 3; g2++) inPot.put(p.x + tx * (g2 - 1) * 0.7, 1.0, p.z + tz * (g2 - 1) * 0.7, 0.22, 0.28, 0.22, 0, 0, 0, [0xd8604a, 0xe8c048, 0x9ac858, 0xc87ad8][(k + g2) % 4]);   // wares
          prop(p.x, p.z, 0, 1.5, 1.0);
        }
      }
      // bunting across the hall, wall to wall, under the first floor
      const yb = Math.min(levels[0].y - 2, 7.5);
      for (let k = 0; k < 4; k++) { const a = door.a + 0.4 + k * 0.8; flagLine(P(a, rIn(yb) - 0.3, yb), P(a + Math.PI * 0.85, rIn(yb) - 0.3, yb), 1.4, false); }
      // the great door's two leaves, swung right back against the wall inside
      {
        const ri = rIn(doorH * 0.5), hwIn = door.hw * ri, tilt = -Math.atan2(rIn(0) - rIn(doorH), doorH);
        for (const s of [-1, 1]) {
          const la = door.a + s * (door.hw + hwIn * 0.52 / ri), r = rIn(doorH * 0.48) - 0.22;
          inBox.put(Math.cos(la) * r, doorH * 0.48, Math.sin(la) * r, hwIn * 0.95, doorH * 0.96, 0.25, tilt, faceRy(la), 0, 0x3a2416);
          for (let k = 0; k < 3; k++) { const yy = doorH * (0.2 + k * 0.3), rr = rIn(yy) - 0.38; inBox.put(Math.cos(la) * rr, yy, Math.sin(la) * rr, hwIn * 0.8, 0.3, 0.06, tilt, faceRy(la), 0, 0x6a6058); }   // iron straps
          const na = door.a + s * (door.hw * 2.2 + 0.5 / ri); inLamp.put(...P(na, rIn(doorH * 0.6) - 0.4, doorH * 0.6).toArray(), 0.22, 0.3, 0.22, 0, 0, 0, 0xffd27a);
        }
      }
      roomsRound(0, null);
    }

    /* the floors: each a ring round the well, a rail round the well, hammocks slung out over it, lamps on the rail */
    for (const L of levels) {
      const y = L.y, band = L.ri - 3.4;
      ring(L.rWell, band, 0, TAU, y);
      ring(band, L.ri + 0.5, L.slot[1], L.slot[0] + TAU, y);                      // (the slot the stair comes up through)
      { const f = new THREE.Mesh(new THREE.CylinderGeometry(L.rWell, L.rWell, 0.8, 40, 1, true), fasciaM); f.position.y = y - 0.4; inner.add(f); }
      const rr = L.rWell + 0.22, nP = Math.max(10, Math.round(rr * TAU / 1.5));
      const atBridge = a => Math.abs(across(L, Math.cos(a) * rr, Math.sin(a) * rr)) < L.bw + 0.15;   // (the rail opens where the bridge meets it)
      for (let k = 0; k < nP; k++) {
        const a = k / nP * TAU, b = (k + 0.5) / nP * TAU;
        if (!atBridge(a)) inBox.put(Math.cos(a) * rr, y + 0.55, Math.sin(a) * rr, 0.16, 1.1, 0.16, 0, -a, 0, wood);
        if (!atBridge(b)) inBox.put(Math.cos(b) * rr, y + 1.1, Math.sin(b) * rr, 0.14, 0.12, rr * TAU / nP + 0.1, 0, -b, 0, wood);
        if (k % 3 === 0 && !atBridge(a)) inLamp.put(Math.cos(a) * rr, y + 1.32, Math.sin(a) * rr, 0.2, 0.24, 0.2, 0, 0, 0, WARM[k % WARM.length]);
      }
      // the bridge straight across the well, rail to rail, with rope rails along it on posts
      {
        const ux = Math.cos(L.bA), uz = Math.sin(L.bA), vx = -uz, vz = ux, len = 2 * (L.rWell + 0.35), n = Math.max(6, Math.round(len / 0.6));
        for (let k = 0; k < n; k++) { const t = (k + 0.5) / n * len - len / 2; inBox.put(ux * t, y - 0.06, uz * t, 0.5, 0.12, L.bw * 2, 0, -L.bA, 0, k % 2 ? plank : 0x9a6c44); }
        for (const s of [-1, 1]) {
          inBox.put(vx * s * L.bw * 0.7, y - 0.18, vz * s * L.bw * 0.7, len, 0.16, 0.16, 0, -L.bA, 0, wood);      // its stringers
          let prev = null;
          for (let k = 0; k <= 6; k++) {
            const t = k / 6 * len - len / 2, px = ux * t + vx * s * L.bw, pz = uz * t + vz * s * L.bw;
            inBox.put(px, y + 0.5, pz, 0.12, 1.0, 0.12, 0, 0, 0, wood);
            const top = V3(px, y + 1.0, pz); if (prev) inRope.seg(prev, top, 0.045, 0.045); prev = top;
          }
        }
      }
      // across the well over the bridge: a line of flags, and a line of somebody's washing
      {
        const yA = y + (L.next - y) * 0.55, yB = y + (L.next - y) * 0.75, ra = L.rWell + 0.2;
        if (L.next - y > 4.5) {
          flagLine(P(L.bA + 1.0, ra, yA), P(L.bA + 1.0 + Math.PI, ra, yA), 0.7, false);
          flagLine(P(L.bA - 0.9, ra, yB), P(L.bA - 0.9 + Math.PI * 0.8, ra, yB), 0.5, true);
        }
      }
      // banners hung from the rail, down into the well
      for (let k = 0; k < 2; k++) {
        const a = L.bA + Math.PI / 2 + k * Math.PI + 0.3, Lb = Math.min(7, (y - (levels[L.i - 1]?.y ?? 0)) * 0.6);
        if (Lb < 2.5) continue;
        const p = P(a, L.rWell - 0.05, y + 1.0 - Lb / 2);
        inCloth.put(p.x, p.y, p.z, Math.min(1.6, L.rWell * 0.5), Lb, 1, 0, faceRy(a), 0, BANNER[(L.i + k) % BANNER.length]);
      }
      // brackets of heartwood under it, out of the wall (not across the stair)
      for (let k = 0; k < 10; k++) {
        const a = (k + 0.3) / 10 * TAU; if (stairIn(a, y - 6, y + 0.5)) continue;
        inRib.seg(P(a, L.rWell + 0.6, y - 0.4), P(a, rIn(y - 5) - 0.2, y - 5), 0.3, 0.3, 0x7a4e30);
      }
      // hammocks across the edge of the well, hung from the rail (clear of the bridge's ends and the banners)
      const nH = Math.max(1, Math.min(5, Math.round(L.rWell / 1.4)));
      for (let k = 0; k < nH; k++) {
        const a = (k + rnd() * 0.5) / nH * TAU, e = 0.5, pa = P(a - e, rr, y + 1.25), pb = P(a + e, rr, y + 1.25);
        if ([0, Math.PI].some(q => Math.abs(angDiff(a, L.bA + q)) < e + 0.45) || [0.3, Math.PI + 0.3].some(q => Math.abs(angDiff(a, L.bA + Math.PI / 2 + q)) < e + 0.3)) continue;
        const len = pa.distanceTo(pb) * 0.8, c = P(a, rr * Math.cos(e) - 0.1, y + 0.95);
        inHam.put(c.x, c.y, c.z, 0.5, 0.45, len, 0, -a, 0, CLOTH[Math.floor(rnd() * CLOTH.length)]);
        const ta = V3(-Math.sin(a), 0, Math.cos(a));
        inRope.seg(pa, c.clone().addScaledVector(ta, -len / 2), 0.04, 0.04); inRope.seg(pb, c.clone().addScaledVector(ta, len / 2), 0.04, 0.04);
      }
      // rugs and stores on the open floor, by the rail
      for (let k = 0; k < 5; k++) {
        const a = rnd() * TAU, r0 = L.rWell + 0.9, r1 = band - 0.2; if (r1 - r0 < 1) break;
        if (Math.abs(angDiff(a, (L.slot[0] + L.slot[1]) / 2)) < (L.slot[1] - L.slot[0]) / 2 + 0.4) continue;
        const p = P(a, r0 + (r1 - r0) * 0.5, y);
        if (k % 2) inRug.put(p.x, y + 0.03, p.z, Math.min(1.4, (r1 - r0) * 0.5), 1, Math.min(1.4, (r1 - r0) * 0.5), 0, 0, 0, CLOTH[Math.floor(rnd() * CLOTH.length)]);
        else {
          const q = P(a, L.rWell + 0.75, y); if (Math.abs(across(L, q.x, q.z)) < L.bw + 0.8) continue;
          inPot.put(q.x, y, q.z, 0.4, 0.7, 0.4, 0, 0, 0, 0xa87a4a); prop(q.x, q.z, y, 0.45, 0.7);
          inLeaf.put(q.x, y + 1.15, q.z, 0.75, 0.65, 0.75, rnd(), rnd() * 6, 0, GREEN[Math.floor(rnd() * GREEN.length)]);   // something growing in it
        }
      }
      roomsRound(y, L);
    }

    /* the great stair, round and round the inside of the wall, a rope rail on its open side */
    {
      const n = Math.min(1150, Math.round(span * rMean / 0.95));
      let prevPost = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = a0 + t * span, y = S0 + t * (topY - S0), r = rIn(y) - 1.6;
        inStep.put(Math.cos(a) * r, y, Math.sin(a) * r, 3.1, 0.35, 1.25, 0, -a, 0, plank);
        if (i % 4 === 0) {
          const atFloor = y < 1.6 || levels.some(L => y > L.y - 0.3 && y < L.y + 2.2);
          const pp = P(a, r - 1.45, y + 1.15);
          if (!atFloor) { inBox.put(pp.x, y + 0.6, pp.z, 0.14, 1.2, 0.14, 0, -a, 0, wood); if (prevPost) inRope.seg(prevPost, pp, 0.06, 0.06); prevPost = pp; }
          else prevPost = null;
        }
        // brackets under it into the wall, now and then
        if (i % 12 === 6) inRib.seg(P(a, r - 1.2, y - 0.2), P(a, rIn(y - 3) + 0.1, y - 3), 0.22, 0.22, wood);
      }
    }

    /* glowing pods down the well, on ropes from the roof of the hollow: the tree's own light, seen from every floor */
    {
      const rw = Math.min(...levels.map(L => L.rWell)) * 0.6;
      for (let k = 0; k < 8 + levels.length * 2; k++) {
        const a = rnd() * TAU, r = (0.25 + 0.75 * Math.sqrt(rnd())) * rw, yb = 7 + rnd() * (ceilY - 9), s = 0.3 + rnd() * 0.35;
        if (levels.some(L => L.y > yb - 1 && Math.abs(across(L, Math.cos(a) * r, Math.sin(a) * r)) < L.bw + 0.5)) continue;   // (none through a bridge)
        inRope.seg(P(a, r, yb + s), P(a, r, ceilY), 0.025, 0.025);
        inLamp.put(Math.cos(a) * r, yb, Math.sin(a) * r, s, s * 1.3, s, 0, 0, 0, rnd() < 0.3 ? 0x9af0d8 : WARM[Math.floor(rnd() * WARM.length)]);
      }
    }
    for (const b of [inBox, inStep, inRope, inRib, inGlow, inLamp, inCloth, inRug, inPot, inHam, inLeaf]) b.done();
  }
  limbs.done(); leafB.done();

  /* ---- walking it: the bark and the heartwood are a wall all the way round but at the door; the floors and the stair
     are ground; the well has a rail round it on every floor, and off the floors the stair has one on its open side ---- */
  const hallY = 0.04;
  function ground(px, pz, py) {
    const dx = px - x, dz = pz - z, r = Math.hypot(dx, dz), ly = py - g;
    if (ly < -1 || ly > ceilY || r > rIn(Math.min(ly, ceilY)) + 0.4) return -1e9;
    const a = Math.atan2(dz, dx); let best = r < rIn(0) + 0.4 ? hallY : -1e9;
    for (const L of levels) {
      if (L.y > ly + STEP || L.y <= best || r > L.ri + 0.4) continue;
      if (r < L.rWell - 0.25 && !(r < L.rWell + 0.4 && Math.abs(across(L, dx, dz)) < L.bw)) continue;   // the well (but for its bridge)
      if (r > L.ri - 3.4 && inSlot(L, a)) continue;                    // the stairwell
      best = L.y;
    }
    for (const ys of stairYs(a)) {
      const s = ys + 0.17; if (s > ly + STEP || s <= best) continue;
      const rb = rIn(ys); if (r < rb - 3.25 || r > rb + 0.1) continue;
      best = s;
    }
    return best > -1e9 ? g + best : -1e9;
  }
  function resolve(p, rad) {
    const dx = p.x - x, dz = p.z - z, r = Math.hypot(dx, dz), ly = p.y - g;
    if (r > rOutMax + rad + 0.5 || r < 1e-4 || ly > H * 0.9 || ly < -3) return;
    const a = Math.atan2(dz, dx), yq = Math.max(0, ly + 0.8), ro = rAt(yq, a);
    const put = (rr, aa = a) => { p.x = x + Math.cos(aa) * rr; p.z = z + Math.sin(aa) * rr; };
    if (ly + 0.8 >= ceilY) { if (r < ro + rad) put(ro + rad); return; }
    const ri = rIn(yq);
    if (r < ri - rad) {
      // inside: the wall, the rail round the well, the stair's rail, and never under the stair where it's too low to stand
      let rMin = 0, rMax = ri - rad, fy = null;
      const L = levels.find(L => ly >= L.y - 0.4 && ly < L.y + 3.5);
      if (L) {
        fy = L.y;
        const c = across(L, dx, dz), w = L.bw - rad;
        if (r < L.rWell + 0.3 + rad && Math.abs(c) < L.bw) {
          // on the bridge across the well: kept between its rope rails
          if (Math.abs(c) > w) { const al = dx * Math.cos(L.bA) + dz * Math.sin(L.bA), cc = Math.sign(c) * Math.max(0, w); p.x = x + Math.cos(L.bA) * al - Math.sin(L.bA) * cc; p.z = z + Math.sin(L.bA) * al + Math.cos(L.bA) * cc; }
          return;
        }
        rMin = L.rWell + 0.3 + rad;
      }
      else if (ly < 2.2) fy = hallY;
      else rMin = ri - 3.2 + rad;
      if (fy != null && ly < fy + 0.6 && r > ri - 3.4 - rad && stairYs(a).some(s => s > fy + STEP + 0.05 && s < fy + 2.6)) rMax = Math.min(rMax, ri - 3.4 - rad);
      if (rMin > rMax) rMin = rMax;
      if (r < rMin) put(rMin); else if (r > rMax) put(rMax);
      return;
    }
    if (r > ro + rad) return;
    // in the thickness of the wall: through the door, between its sides; anywhere else, back out the way you came
    const d = openings.find(o => o.pass && ly > o.y0 - 0.6 && ly + PH < o.y1 && Math.abs(angDiff(a, o.a)) < o.hw + rad / r);
    if (d) { const s = angDiff(a, d.a), lim = Math.max(0, d.hw - rad / r); if (Math.abs(s) > lim) put(r, d.a + Math.sign(s) * lim); return; }
    put(r < (ri + ro) / 2 ? ri - rad : ro + rad);
  }
  function solid(px, py, pz) {
    const dx = px - x, dz = pz - z, r = Math.hypot(dx, dz), ly = py - g;
    if (r > rOutMax || ly < 0 || ly > H * 0.9) return false;
    const a = Math.atan2(dz, dx);
    if (r >= rAt(ly, a)) return false;
    if (ly >= ceilY) return true;
    if (r > rIn(ly)) return !openings.some(o => ly > o.y0 && ly < o.y1 && Math.abs(angDiff(a, o.a)) < o.hw);
    for (const L of levels) if (ly < L.y && ly > L.y - 0.5 && (r > L.rWell ? !(r > L.ri - 3.4 && inSlot(L, a)) : Math.abs(across(L, dx, dz)) < L.bw)) return true;
    return false;
  }
  const inside = (px, pz, py) => { const ly = py - g; return ly > -1 && ly < ceilY && Math.hypot(px - x, pz - z) < rIn(Math.max(0, ly)) + 0.2; };
  // a place on a floor (i < 0: the hall) round by angle a, k of the way across the open floor from the well's rail
  // towards the stair along the wall
  function levelSpot(i, a, k = 0.5) {
    if (i < 0) { const rr = Math.max(3.5, rIn(0) * k); return V3(x + Math.cos(a) * rr, g + hallY, z + Math.sin(a) * rr); }
    const L = levels[Math.min(i, levels.length - 1)], r0 = L.rWell + 0.7, r1 = L.ri - 3.6, rr = r1 > r0 ? r0 + (r1 - r0) * k : r0;
    return V3(x + Math.cos(a) * rr, g + L.y, z + Math.sin(a) * rr);
  }
  function stairPoint(y) {
    const yy = Math.min(topY, Math.max(S0, y)), a = stairA(yy), r = rIn(yy) - 1.6;
    return V3(x + Math.cos(a) * r, g + yy + 0.2, z + Math.sin(a) * r);
  }
  const doorPoint = (out = 4) => { const r = rAt(0.5, door.a) + out; return V3(x + Math.cos(door.a) * r, g, z + Math.sin(door.a) * r); };

  return {
    x, z, g, R, RB, H, root, rAt, rIn, levels, ceilY, openings, door: { a: door.a, hw: door.hw, h: doorH },
    stair: { a0, top: topY, turns }, roots: rootAs, reach: rOutMax + 1, colliders,
    ground, resolve, solid, inside, levelSpot, stairPoint, doorPoint,
  };
}

/* a plank bridge from a to b (local points), sagging in the middle, rope rails either side on posts */
function plankBridge(postB, ropeB, a, b, sagK, wd, plank, wood) {
  const len = a.distanceTo(b), n = Math.max(4, Math.round(len / 1.1)), sag = len * sagK, ang = Math.atan2(b.x - a.x, b.z - a.z);
  const side = V3(Math.cos(ang), 0, -Math.sin(ang));
  let prevL = null, prevR = null;
  for (let k = 0; k <= n; k++) {
    const t = k / n, q = a.clone().lerp(b, t); q.y -= Math.sin(t * Math.PI) * sag;
    if (k < n) { const t2 = (k + 0.5) / n, q2 = a.clone().lerp(b, t2); q2.y -= Math.sin(t2 * Math.PI) * sag; postB.put(q2.x, q2.y, q2.z, wd * 2, 0.12, len / n * 0.82, 0, ang, 0, plank); }
    if (k % 3 === 0 || k === n) {
      const L = q.clone().addScaledVector(side, wd).add(V3(0, 1.1, 0)), Rr = q.clone().addScaledVector(side, -wd).add(V3(0, 1.1, 0));
      postB.put(L.x, q.y + 0.55, L.z, 0.1, 1.1, 0.1, 0, ang, 0, wood); postB.put(Rr.x, q.y + 0.55, Rr.z, 0.1, 1.1, 0.1, 0, ang, 0, wood);
      if (prevL) { ropeB.seg(prevL, L, 0.05, 0.05); ropeB.seg(prevR, Rr, 0.05, 0.05); }
      prevL = L; prevR = Rr;
    }
  }
}

/* ---------------- a plain forest: pines and broadleaf, instanced ---------------- */
export function buildForest(scene, list, { rng, heightAt }) {
  const trunks = [], cones = [], crowns = [];
  for (const [x, z, s, pine] of list) {
    const g = heightAt(x, z), h = (pine ? 11 : 7) * s;
    trunks.push([x, g + h * 0.5 - 0.4, z, s, h]);
    if (pine) { cones.push([x, g + h * 0.62, z, 3.4 * s, h * 0.85]); cones.push([x, g + h * 0.95, z, 2.3 * s, h * 0.6]); }
    else for (let k = 0; k < 3; k++) crowns.push([x + (rng() - 0.5) * 2.4 * s, g + h + (rng() - 0.3) * 1.6 * s, z + (rng() - 0.5) * 2.4 * s, (2 + rng() * 1.2) * s]);
  }
  const inst = (geo, mat, arr, put) => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, arr.length)); m.count = arr.length;
    const o = new THREE.Object3D(); arr.forEach((v, i) => { put(o, v); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  };
  inst(new THREE.CylinderGeometry(0.35, 0.5, 1, 6), toon(0x5a3a26), trunks, (o, [x, y, z, s, h]) => { o.position.set(x, y, z); o.scale.set(s, h, s); o.rotation.set(0, 0, 0); });
  inst(new THREE.ConeGeometry(1, 1, 7), toon(0x2e5a36), cones, (o, [x, y, z, r, h]) => { o.position.set(x, y, z); o.scale.set(r, h, r); o.rotation.set(0, rng() * 6, 0); });
  inst(new THREE.IcosahedronGeometry(1, 0), toon(0x5a8a3a), crowns, (o, [x, y, z, r]) => { o.position.set(x, y, z); o.scale.set(r, r * 0.85, r); o.rotation.set(rng(), rng(), rng()); });
}
