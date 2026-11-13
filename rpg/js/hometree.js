/* ============================================================
   HOME TREES — the great trees of the Tatu that folk live in.
   Each is a town on its own, and the town is INSIDE it: the
   trunk is hollow, wider than a city square at the foot, and
   folk live in the heartwood. Nothing is built on the outside:
   no platforms, ledges, bridges or lifts. All the bark shows is
   the great door at the roots, lit windows set flush in it, and
   openings cut through it that look out over the country.

   Inside: a great hall on the ground with a hearth in the middle
   and the rooms' doors all round its wall; above it floor after
   floor, each a ring round an open well that runs up the middle
   of the tree to the roof of the hollow, with a rail round the
   well and hammocks slung out over it; glowing pods hanging down
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
import { toon, addOutline, paint } from './gfx.js';
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
  const levelYs = (opts.decks ?? [0.08, 0.17, 0.27, 0.38, 0.5]).map(f => H * f).slice(0, Math.max(1, Math.round(5 * town)));
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
  const levels = levelYs.map((y, i) => { const ri = rIn(y), sa = stairA(y); return { i, y, ri, rWell: Math.max(2.4, ri * 0.34), slot: [sa + WELL0, sa + WELL1], next: levelYs[i + 1] ?? ceilY, looks: [] }; });
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
    // broad shading only (the furrows are painted on, bark-fine, by the material): dark in the folds between the
    // buttresses and at the foot, weathered paler up the bole, moss on the damp side low down
    const mossC = new THREE.Color(0x56683a), paleC = bark.clone().lerp(new THREE.Color(0xb09a80), 0.35);
    const barkCol = (y, a) => {
      const yy = Math.max(0, y), fold = 0.5 - 0.5 * Math.sin(a * 7 + 1.3), foldK = fold * fold * Math.exp(-yy / (flareH * 1.2));
      const streak = 0.5 + 0.5 * Math.sin(a * 5 + Math.sin(yy * 0.021 + a * 2) * 1.4);
      c.copy(bark).lerp(paleC, Math.min(0.75, yy / (H * 0.5)) * (0.4 + 0.6 * streak));
      c.lerp(barkDark, Math.min(0.85, foldK * 0.8 + 0.3 * Math.exp(-yy / (R * 0.5)) + 0.16 * streak * streak));
      const moss = Math.max(0, Math.sin(a - 2.1)) * Math.exp(-yy / (R * 1.6)) * (0.35 + 0.65 * fold);
      return c.lerp(mossC, moss * 0.55);
    };
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
    const trunk = new THREE.Mesh(surf(ys, (y, a) => rAt(Math.max(0, y), a), barkCol, false), paint(toon(0xffffff, { vertexColors: true }), 'bark', Math.max(1.2, R * 0.11)));
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

  /* ---- roots and limbs: each one a single limb of wood, swept smooth from its thick end to its tip ---- */
  const woodG = { pos: [], col: [], idx: [] };
  const _c = new THREE.Color(), mossR = new THREE.Color(0x4f6a36);
  /* sweep a limb through pts ([{ p, r, tall? }]): round, or stood up into a fin where tall > 1 (a buttress). */
  const sweep = (pts, { sides = 10, per = 5, c0 = bark, c1 = barkDark, moss = 0, upright = false, seed = 0 } = {}) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(q => q.p), false, 'centripetal'), n = (pts.length - 1) * per;
    const T = V3(), N = V3(), B = V3(), P = V3(), prevN = V3(1, 0, 0), base = woodG.pos.length / 3;
    for (let i = 0; i <= n; i++) {
      const u = i / n, f = u * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f)), t = f - k;
      const r = pts[k].r + (pts[k + 1].r - pts[k].r) * t, tall = (pts[k].tall ?? 1) + ((pts[k + 1].tall ?? 1) - (pts[k].tall ?? 1)) * t;
      curve.getPoint(u, P); curve.getTangent(u, T);
      if (upright) { N.set(-T.z, 0, T.x); if (N.lengthSq() < 1e-6) N.set(1, 0, 0); N.normalize(); B.crossVectors(T, N).normalize(); if (B.y < 0) B.negate(); }
      else { N.copy(prevN).addScaledVector(T, -prevN.dot(T)); if (N.lengthSq() < 1e-6) N.set(T.y, -T.x, 0); N.normalize(); B.crossVectors(T, N).normalize(); prevN.copy(N); }
      for (let j = 0; j < sides; j++) {
        const a = j / sides * TAU, ca = Math.cos(a), sa = Math.sin(a);
        const knot = 1 + 0.07 * Math.sin(a * 3 + u * 9 + seed) + 0.05 * Math.sin(u * 23 + seed * 2);
        const x = ca * r * knot, y = sa * r * tall * knot;
        const px = P.x + N.x * x + B.x * y, py = P.y + N.y * x + B.y * y, pz = P.z + N.z * x + B.z * y;
        woodG.pos.push(px, py, pz);
        const upK = (N.y * ca + B.y * sa) * 0.5 + 0.5, ridge = Math.pow(Math.abs(Math.sin(a * 2.5 + Math.sin(u * 7 + seed) * 0.8)), 3);
        _c.copy(c0).lerp(c1, 0.15 + 0.5 * ridge + 0.3 * (1 - upK));
        if (moss) _c.lerp(mossR, moss * upK * upK * (0.5 + 0.5 * Math.sin(u * 5 + seed)));
        woodG.col.push(_c.r, _c.g, _c.b);
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < sides; j++) {
      const p0 = base + i * sides + j, p1 = base + i * sides + (j + 1) % sides, q0 = p0 + sides, q1 = p1 + sides;
      woodG.idx.push(p0, q0, p1, p1, q0, q1);
    }
    // close the tip
    curve.getPoint(1, P); const tip = woodG.pos.length / 3; woodG.pos.push(P.x, P.y, P.z); woodG.col.push(c1.r, c1.g, c1.b);
    for (let j = 0; j < sides; j++) woodG.idx.push(base + n * sides + j, tip, base + n * sides + (j + 1) % sides);
  };

  /* roots: great buttresses that stand out of the foot of the trunk and run out over the ground like ridges of hill,
     forking as they go and sinking into the earth (none across the great door) */
  const nRoots = opts.roots ?? 9, rootReach = opts.rootReach ?? 2.25, rootAs = [];
  for (let i = 0; i < nRoots; i++) {
    const a = i / nRoots * TAU + rnd() * 0.3;
    if (opts.rootSkip && opts.rootSkip(a)) continue;
    if (Math.abs(angDiff(a, door.a)) < door.hw + 0.45) continue;
    rootAs.push(a);
    const r0 = RB * 0.92, reach = Math.max(RB * 1.3, RB * (rootReach - 0.4 + rnd() * 0.6)), steps = 7;   // (from out in the wall, clear of the hall)
    const pts = [{ p: V3(Math.cos(a) * r0 * 0.8, R * 1.25, Math.sin(a) * r0 * 0.8), r: R * 0.5, tall: 1.9 }];
    let forkAt = null;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, d = r0 + (reach - r0) * t, wob = Math.sin(t * 4 + i) * 0.12;
      const rr = R * 0.42 * (1 - t * 0.75);
      const cur = V3(Math.cos(a + wob) * d, R * 0.9 * Math.pow(1 - t, 1.6) - t * 1.2 - rr * 0.25, Math.sin(a + wob) * d);
      pts.push({ p: cur, r: rr * (s === steps ? 0.5 : 1), tall: 1 + 0.75 * Math.pow(1 - t, 2) });
      // something to walk into: a post at each joint as high as the root is there
      if (s > 0 && s < steps) colliders.push({ kind: 'cyl', x: x + cur.x, z: z + cur.z, r: rr * 0.85, y0: g - 3, y1: g + cur.y + rr * 0.95 });
      if (s === steps - 3) forkAt = { p: cur.clone(), r: rr, d, wob };
    }
    pts.push({ p: pts[pts.length - 1].p.clone().add(V3(Math.cos(a) * R * 0.35, -R * 0.3, Math.sin(a) * R * 0.35)), r: 0.12 });
    sweep(pts, { sides: 12, per: 4, moss: 0.5, upright: true, seed: i * 1.7, c0: bark, c1: barkDark });
    // a lesser root forks off it and goes to ground on its own
    if (forkAt) {
      const sd = rnd() < 0.5 ? -1 : 1, fa = a + forkAt.wob + sd * (0.3 + rnd() * 0.25), L = (reach - forkAt.d) * (0.8 + rnd() * 0.5);
      const f = [{ p: forkAt.p.clone().add(V3(0, -forkAt.r * 0.2, 0)), r: forkAt.r * 0.6, tall: 1.2 }];
      for (let s = 1; s <= 3; s++) { const t = s / 3, d = forkAt.d + L * t; f.push({ p: V3(Math.cos(fa + sd * t * 0.2) * d, forkAt.p.y * (1 - t) - t * 1.4 - forkAt.r * 0.2, Math.sin(fa + sd * t * 0.2) * d), r: forkAt.r * 0.6 * (1 - t * 0.8) + 0.1 }); }
      sweep(f, { sides: 8, per: 4, moss: 0.5, upright: true, seed: i * 2.3 + 5 });
    }
  }

  /* ---- great limbs, out and up into the crown, from above the roof of the hollow: each forks, and forks again,
     and carries its leaves in clouds along its outer boughs — an oak the size of a hill ---- */
  const leafGeo = (() => {   // one bough-end of leaf: a few rounded lobes run together, lit from above, deep green beneath
    const lobes = [[0, 0, 0, 1], [0.62, 0.12, 0.2, 0.62], [-0.55, 0.05, 0.38, 0.66], [0.1, 0.1, -0.66, 0.6], [-0.2, 0.42, -0.1, 0.62], [0.35, -0.1, 0.6, 0.5]];
    const pos = [], nor = [], col = [], unit = new THREE.IcosahedronGeometry(1, 1).toNonIndexed(), up = unit.attributes.position, v = V3(), nn = V3();
    for (const [lx, ly, lz, lr] of lobes) for (let i = 0; i < up.count; i += 3) {
      // drop the faces buried inside the other lobes
      v.set(up.getX(i) + up.getX(i + 1) + up.getX(i + 2), up.getY(i) + up.getY(i + 1) + up.getY(i + 2), up.getZ(i) + up.getZ(i + 1) + up.getZ(i + 2)).multiplyScalar(lr / 3).add(nn.set(lx, ly, lz));
      if (lobes.some(([ox, oy, oz, or]) => (ox !== lx || oy !== ly || oz !== lz) && v.distanceTo(nn.set(ox, oy, oz)) < or * 0.72)) continue;
      for (let k = 0; k < 3; k++) {
        v.set(up.getX(i + k), up.getY(i + k), up.getZ(i + k));
        const bump = 1 + 0.07 * Math.sin(v.x * 9 + v.y * 7) + 0.06 * Math.sin(v.z * 11 - v.y * 5);
        nn.copy(v).normalize();
        pos.push(lx + v.x * lr * bump, (ly + v.y * lr * bump) * 0.74, lz + v.z * lr * bump);
        // the light wraps the whole cloud, not each lobe: normals lean out from the middle of the cluster
        const wx = (lx + v.x * lr) * 0.6 + nn.x * 0.4, wy = (ly + v.y * lr) * 0.6 + nn.y * 0.4 + 0.15, wz = (lz + v.z * lr) * 0.6 + nn.z * 0.4, wl = Math.hypot(wx, wy, wz) || 1;
        nor.push(wx / wl, wy / wl, wz / wl);
        const sh = 0.62 + 0.38 * Math.min(1, Math.max(0, (ly + v.y * lr + 0.75) / 1.5)) + 0.06 * Math.sin(v.x * 13 + v.z * 17);
        col.push(sh * 0.96, sh, sh * 0.9);
      }
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return gg;
  })();
  const leafB = batch(root, leafGeo, toon(0xffffff, { vertexColors: true }), 900, { shadow: true });
  const leafTint = new THREE.Color(), leafAt = (c, s, sun = 0.5) => {
    leafTint.set(leafCols[Math.floor(rnd() * leafCols.length)]).multiplyScalar(0.82 + 0.36 * sun + rnd() * 0.1);
    leafB.put(c.x, c.y, c.z, s * (0.9 + rnd() * 0.3), s * (0.8 + rnd() * 0.25), s * (0.9 + rnd() * 0.3), (rnd() - 0.5) * 0.4, rnd() * TAU, (rnd() - 0.5) * 0.4, leafTint.getHex());
  };
  const nLimbs = opts.limbs ?? 13;
  const limbPaths = [];   // each limb's joints, root to tip, with its radius there: for windows in the thick of it
  const crownY0 = Math.max(H * 0.46, ceilY + R * 0.6), crownR = H * 0.5, crownTop = H * 1.0;
  // how high the roof of leaf is over a point d out from the trunk: a broad dome, wide as the tree is tall
  const domeY = d => crownY0 + (crownTop - crownY0) * Math.sqrt(Math.max(0, 1 - Math.pow(d / (crownR * 1.05), 2)));
  const bough = (from, dir, len, r, depth, sd) => {
    // one bough: curving up as it goes, leaves along its outer half, then two lesser ones
    const pts = [{ p: from.clone(), r }], steps = 4;
    let p = from.clone(); const d = dir.clone();
    for (let s = 1; s <= steps; s++) {
      d.y += 0.12; d.x += (rnd() - 0.5) * 0.3; d.z += (rnd() - 0.5) * 0.3; d.normalize();
      p = p.clone().addScaledVector(d, len / steps);
      pts.push({ p, r: r * (1 - s / steps * 0.55) });
    }
    sweep(pts, { sides: depth ? 6 : 8, per: 3, seed: sd, c0: bark, c1: barkDark });
    const tip = pts[steps];
    if (depth >= 2) { for (let k = 0; k < 3; k++) { const q = pts[2 + Math.min(2, k)].p; leafAt(V3(q.x + (rnd() - 0.5) * len * 0.5, q.y + len * (0.08 + rnd() * 0.16), q.z + (rnd() - 0.5) * len * 0.5), H * (0.05 + rnd() * 0.03), Math.min(1, q.y / H)); } return; }
    for (let k = 0; k < 2; k++) {
      const nd = d.clone(); const ang = (k ? 1 : -1) * (0.45 + rnd() * 0.4), cs = Math.cos(ang), sn = Math.sin(ang);
      nd.set(d.x * cs - d.z * sn, d.y + 0.1 + rnd() * 0.25, d.x * sn + d.z * cs).normalize();
      bough(tip.p, nd, len * (0.62 + rnd() * 0.15), tip.r * 0.8, depth + 1, sd + k * 3 + 1);
    }
    leafAt(V3(tip.p.x, tip.p.y + len * 0.1, tip.p.z), H * (0.05 + rnd() * 0.025), Math.min(1, tip.p.y / H));
  };
  for (let i = 0; i < nLimbs; i++) {
    const a = i / nLimbs * TAU + rnd() * 0.5, y0 = Math.max(H * (0.48 + rnd() * 0.34), ceilY + R * 0.6), len = H * (0.34 + rnd() * 0.16), up = 0.25 + rnd() * 0.4;
    let prev = V3(Math.cos(a) * rAt(y0, a) * 0.6, y0, Math.sin(a) * rAt(y0, a) * 0.6);
    const steps = 6, path = [{ p: prev.clone(), r: R * 0.34 }];
    const pts = [{ p: V3(Math.cos(a) * rAt(y0, a) * 0.2, y0 - R * 0.5, Math.sin(a) * rAt(y0, a) * 0.2), r: R * 0.42 }, { p: prev.clone(), r: R * 0.36 }];
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, d = rAt(y0, a) * 0.6 + len * t;
      const cur = V3(Math.cos(a + Math.sin(t * 3 + i) * 0.1) * d, y0 + len * up * t + Math.sin(t * Math.PI) * len * 0.12, Math.sin(a + Math.sin(t * 3 + i) * 0.1) * d);
      const rr = R * 0.34 * (1 - t * 0.74);
      pts.push({ p: cur, r: rr });
      path.push({ p: cur.clone(), r: rr });
      // boughs off it, alternate sides, from a third of the way out
      if (s >= 2 && s < steps) {
        const sd = (s % 2 ? 1 : -1) * (0.7 + rnd() * 0.5), ba = a + sd;
        bough(cur, V3(Math.cos(ba), 0.3 + rnd() * 0.3, Math.sin(ba)).normalize(), len * (0.42 - t * 0.12), rr * 0.6, 1, i * 7 + s);
      }
      prev = cur;
    }
    sweep(pts, { sides: 10, per: 4, seed: i * 3.1, c0: bark, c1: barkDark });
    bough(prev, prev.clone().sub(path[steps - 1].p).normalize(), len * 0.3, R * 0.09, 1, i * 11);
    limbPaths.push({ a, path });
  }
  // the leader: the trunk itself carries on up into the top of the crown, and forks there
  {
    const top = H * 0.92 - 2, lead = [{ p: V3(0, top - R, 0), r: rAt(top, 0) * 0.95 }, { p: V3(R * 0.3, top + H * 0.03, -R * 0.2), r: R * 0.3 }, { p: V3(R * 0.8, top + H * 0.07, -R * 0.5), r: R * 0.12 }];
    sweep(lead, { sides: 10, per: 4, seed: 99 });
    for (let k = 0; k < 4; k++) { const ba = k / 4 * TAU + rnd(); bough(lead[1].p, V3(Math.cos(ba), 0.55, Math.sin(ba)).normalize(), H * 0.13, R * 0.14, 1, 200 + k); }
  }
  // the roof of leaf: a broad, lumpy dome over all the boughs — from the ground under it, the sky is leaves
  {
    const rings = [[0.0, 1], [0.2, 6], [0.4, 11], [0.6, 15], [0.78, 18], [0.93, 20]];
    for (const [f, n] of rings) for (let k = 0; k < n; k++) {
      const a = k / n * TAU + rnd() * 0.5 + f * 3, d = crownR * (f + (rnd() - 0.5) * 0.12), y = domeY(d) - H * (0.02 + rnd() * 0.05) - (f > 0.9 ? H * 0.05 * rnd() : 0);
      leafAt(V3(Math.cos(a) * d, y, Math.sin(a) * d), H * (0.062 + rnd() * 0.04) * (1 - f * 0.25), 0.75 + 0.25 * (1 - f));
    }
    // and the under-storey of it: darker clouds hanging below the rim, so the crown has depth
    for (let k = 0; k < 26; k++) { const a = k / 26 * TAU + rnd() * 0.4, d = crownR * (0.45 + rnd() * 0.5); leafAt(V3(Math.cos(a) * d, crownY0 + (domeY(d) - crownY0) * (0.25 + rnd() * 0.35), Math.sin(a) * d), H * (0.05 + rnd() * 0.03), 0.1); }
  }
  {
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(woodG.pos, 3)); wg.setAttribute('color', new THREE.Float32BufferAttribute(woodG.col, 3));
    wg.setIndex(woodG.idx); wg.computeVertexNormals();
    const wm = new THREE.Mesh(wg, paint(toon(0xffffff, { vertexColors: true }), 'bark', Math.max(1, R * 0.08)));
    wm.castShadow = wm.receiveShadow = true; root.add(noSolid(wm));
  }

  const wood = 0x8a6040, plank = 0xa87a50, frameC = 0x5a3a24;
  const faceRy = a => Math.PI / 2 - a;   // turned so its face looks along angle a (out from the middle; in, for a two-sided thing)

  /* ---- the outside: no more than the bark shows of the town in it ---- */
  {
    const winB = batch(root, new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffd9a0, side: THREE.DoubleSide }), 900, { shadow: false });
    const postB = batch(root, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 2600, { shadow: false });
    const archB = batch(root, new THREE.TorusGeometry(1, 0.16, 5, 12, Math.PI), toon(0x5a3a24), 500, { shadow: false });
    // a lit window in the bark (a room in the heartwood behind it), its frame set flush in the bark: nothing sticks out
    const barkWindow = (a, y, w = 1.0, h = 1.3) => {
      const r = rAt(y, a) + 0.04, fx = Math.cos(a), fz = Math.sin(a), sx = -Math.sin(a), sz = Math.cos(a), ry = faceRy(a);
      winB.put(fx * r, y, fz * r, w, h, 1, 0, ry, 0);
      archB.put(fx * (r + 0.03), y + h * 0.5, fz * (r + 0.03), w * 0.5, w * 0.5, 0.3, 0, ry, 0);
      for (const q of [-1, 1]) postB.put(fx * (r + 0.02) + sx * q * w * 0.5, y, fz * (r + 0.02) + sz * q * w * 0.5, 0.12, h, 0.08, 0, ry, 0, frameC);
      postB.put(fx * (r + 0.02), y - h * 0.5, fz * (r + 0.02), w + 0.12, 0.1, 0.08, 0, ry, 0, frameC);
    };
    // the rooms in the heartwood show as windows all the way up the trunk, in loose storeys, clear of the openings
    const topW = Math.min(H * 0.62, ceilY + H * 0.08), k1 = Math.max(1, R / 14);
    for (let y = 5; y < topW; y += (3.6 + rnd() * 1.4) * k1) {
      const n = Math.max(2, Math.round(rAt(y, 0) * TAU / 7));
      for (let k = 0; k < n; k++) {
        if (rnd() < 0.42) continue;
        const a = k / n * TAU + rnd() * 0.25 + y * 0.07, w = (1.3 + rnd() * 0.7) * k1, h = (1.8 + rnd() * 0.8) * k1;
        if (openAt(a, y + 1.8, h)) continue;
        barkWindow(a, y + 1.8, w, h);
      }
    }
    // and in the great limbs where they leave the trunk, still thick enough for a room or two
    for (const L of limbPaths) for (let s = 1; s < 3; s++) {
      const A = L.path[s - 1], B = L.path[s]; if (B.r < 2.4 || rnd() < 0.3) continue;
      const m = A.p.clone().lerp(B.p, 0.5), rr = (A.r + B.r) * 0.5, side = rnd() < 0.5 ? -1 : 1;
      const dir = B.p.clone().sub(A.p).normalize(), nrm = V3(-dir.z, 0, dir.x).multiplyScalar(side);
      const q = m.clone().addScaledVector(nrm, rr * 0.92).add(V3(0, rr * 0.25, 0));
      winB.put(q.x, q.y, q.z, 0.8, 1.0, 1, 0, Math.atan2(nrm.x, nrm.z), 0);
      archB.put(q.x + nrm.x * 0.05, q.y + 0.5, q.z + nrm.z * 0.05, 0.4, 0.4, 0.6, 0, Math.atan2(nrm.x, nrm.z), 0);
    }
    // the great door: an opening as tall as a house in the foot of the trunk, framed, its two leaves standing open against the bark
    {
      const a = door.a, ro = rAt(doorH * 0.5, a), fx = Math.cos(a), fz = Math.sin(a), tx = -Math.sin(a), tz = Math.cos(a), hwM = door.hw * ro;
      const lm = toon(0x3a2416);
      for (const s of [-1, 1]) {
        const ea = a + s * door.hw, re = rAt(doorH * 0.5, ea), ex = Math.cos(ea) * re, ez = Math.sin(ea) * re;
        postB.put(ex + fx * 0.3, doorH * 0.5, ez + fz * 0.3, 1.1, doorH + 0.4, 1.0, 0, faceRy(a), 0, 0x4a2c18);
        // the leaf, swung right back against the bark beside the door
        const la = a + s * (door.hw + hwM * 0.52 / ro), lr = Math.max(...[-0.4, 0, 0.4].map(q => rAt(doorH * 0.5, la + q * hwM / ro))) + 0.4;
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(hwM * 0.95, doorH * 0.96, 0.6), lm);
        leaf.position.set(Math.cos(la) * lr, doorH * 0.48, Math.sin(la) * lr); leaf.rotation.y = faceRy(la); addOutline(leaf, 0.06); root.add(leaf);
        for (let k = 0; k < 3; k++) postB.put(Math.cos(la) * (lr + 0.35), doorH * (0.2 + k * 0.3), Math.sin(la) * (lr + 0.35), hwM * 0.8, 0.3, 0.15, 0, faceRy(la), 0, 0x6a6058);   // iron straps
        const na = a + s * (door.hw + (hwM * 1.1 + 1.4) / ro), nr = rAt(doorH * 0.62, na) + 0.2;
        winB.put(Math.cos(na) * nr, doorH * 0.62, Math.sin(na) * nr, 0.5, 0.7, 1, 0, faceRy(na), 0);   // a lantern either side
      }
      archB.put(fx * (rAt(doorH, a) + 0.1), doorH + 0.2, fz * (rAt(doorH, a) + 0.1), hwM + 0.8, hwM * 0.5 + 0.6, 0.5, 0, faceRy(a), 0);
    }
    // banners hung down the bark under the openings of the lower floors
    if (opts.banners) {
      const looks = openings.filter(o => o.kind === 'look').sort((p, q) => p.y0 - q.y0).slice(0, opts.banners.length * 2);
      looks.forEach((o, k) => {
        // from just under the sill, down to clear of whatever is cut through the bark below it
        const top = o.y0 - 0.6, below = Math.max(doorH + 1, 10.5, ...levels.filter(l => l.y + 2 < o.y0).map(l => l.y + 7.6)), L = Math.min(10, top - below);
        if (L < 3) return;
        const r = rAt(top - L / 2, o.a) + 0.12, b = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(4, 2 * o.hw * r * 0.8), L), toon(opts.banners[k % opts.banners.length], { side: THREE.DoubleSide }));
        b.position.set(Math.cos(o.a) * r, top - L / 2, Math.sin(o.a) * r); b.rotation.y = faceRy(o.a); root.add(b);
      });
    }
    for (const b of [winB, postB, archB]) b.done();
  }

  /* ---- the town inside ---- */
  {
    const inner = noSolid(new THREE.Group()); root.add(inner);
    const IN = { shadow: false, recv: false };   // lamp-lit: the bark's shadow doesn't reach in here
    const floorM = toon(plank, { side: THREE.DoubleSide }), fasciaM = toon(wood, { side: THREE.DoubleSide });
    const inBox = batch(inner, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 5200, IN);
    const inStep = batch(inner, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 1200, IN);
    const inRope = batch(inner, new THREE.CylinderGeometry(1, 1, 1, 5, 1).translate(0, 0.5, 0), toon(0x6a5a40), 1600, IN);
    const inRib = batch(inner, new THREE.CylinderGeometry(0.7, 1, 1, 8, 1).translate(0, 0.5, 0), toon(0xffffff), 900, IN);
    const inGlow = batch(inner, new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 700, IN);
    const inLamp = batch(inner, new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), 900, IN);
    const inCloth = batch(inner, new THREE.PlaneGeometry(1, 1), toon(0xffffff, { side: THREE.DoubleSide }), 500, IN);
    const inRug = batch(inner, new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), toon(0xffffff, { side: THREE.DoubleSide }), 200, IN);
    const inPot = batch(inner, new THREE.CylinderGeometry(0.8, 1, 1, 10, 1).translate(0, 0.5, 0), toon(0xffffff), 400, IN);
    // a hammock: a trough of cloth, its length along local z
    const inHam = batch(inner, new THREE.CylinderGeometry(1, 1, 1, 12, 1, true, Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), toon(0xffffff, { side: THREE.DoubleSide }), 160, IN);
    const CLOTH = [0xb8402e, 0x2f6f8a, 0xd9a441, 0x5a7a3a, 0x8a4a8a, 0xe8d8b8], WARM = [0xffc27a, 0xffb060, 0xffd59a];
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
        innerRoom(a, y + 0.02, w, h);
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
      roomsRound(0, null);
    }

    /* the floors: each a ring round the well, a rail round the well, hammocks slung out over it, lamps on the rail */
    for (const L of levels) {
      const y = L.y, band = L.ri - 3.4;
      ring(L.rWell, band, 0, TAU, y);
      ring(band, L.ri + 0.5, L.slot[1], L.slot[0] + TAU, y);                      // (the slot the stair comes up through)
      { const f = new THREE.Mesh(new THREE.CylinderGeometry(L.rWell, L.rWell, 0.8, 40, 1, true), fasciaM); f.position.y = y - 0.4; inner.add(f); }
      const rr = L.rWell + 0.22, nP = Math.max(10, Math.round(rr * TAU / 1.5));
      for (let k = 0; k < nP; k++) {
        const a = k / nP * TAU, b = (k + 0.5) / nP * TAU;
        inBox.put(Math.cos(a) * rr, y + 0.55, Math.sin(a) * rr, 0.16, 1.1, 0.16, 0, -a, 0, wood);
        inBox.put(Math.cos(b) * rr, y + 1.1, Math.sin(b) * rr, 0.14, 0.12, rr * TAU / nP + 0.1, 0, -b, 0, wood);
        if (k % 3 === 0) inLamp.put(Math.cos(a) * rr, y + 1.32, Math.sin(a) * rr, 0.2, 0.24, 0.2, 0, 0, 0, WARM[k % WARM.length]);
      }
      // brackets of heartwood under it, out of the wall (not across the stair)
      for (let k = 0; k < 10; k++) {
        const a = (k + 0.3) / 10 * TAU; if (stairIn(a, y - 6, y + 0.5)) continue;
        inRib.seg(P(a, L.rWell + 0.6, y - 0.4), P(a, rIn(y - 5) - 0.2, y - 5), 0.3, 0.3, 0x7a4e30);
      }
      // hammocks across the edge of the well, hung from the rail
      const nH = Math.max(1, Math.min(5, Math.round(L.rWell / 1.4)));
      for (let k = 0; k < nH; k++) {
        const a = (k + rnd() * 0.5) / nH * TAU, e = 0.5, pa = P(a - e, rr, y + 1.25), pb = P(a + e, rr, y + 1.25);
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
        else { const q = P(a, L.rWell + 0.75, y); inPot.put(q.x, y, q.z, 0.4, 0.7, 0.4, 0, 0, 0, 0xa87a4a); prop(q.x, q.z, y, 0.45, 0.7); }
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
        inRope.seg(P(a, r, yb + s), P(a, r, ceilY), 0.025, 0.025);
        inLamp.put(Math.cos(a) * r, yb, Math.sin(a) * r, s, s * 1.3, s, 0, 0, 0, rnd() < 0.3 ? 0x9af0d8 : WARM[Math.floor(rnd() * WARM.length)]);
      }
    }
    for (const b of [inBox, inStep, inRope, inRib, inGlow, inLamp, inCloth, inRug, inPot, inHam]) b.done();
  }
  leafB.done();

  /* ---- walking it: the bark and the heartwood are a wall all the way round but at the door; the floors and the stair
     are ground; the well has a rail round it on every floor, and off the floors the stair has one on its open side ---- */
  const hallY = 0.04;
  function ground(px, pz, py) {
    const dx = px - x, dz = pz - z, r = Math.hypot(dx, dz), ly = py - g;
    if (ly < -1 || ly > ceilY || r > rIn(Math.min(ly, ceilY)) + 0.4) return -1e9;
    const a = Math.atan2(dz, dx); let best = r < rIn(0) + 0.4 ? hallY : -1e9;
    for (const L of levels) {
      if (L.y > ly + STEP || L.y <= best || r < L.rWell - 0.25 || r > L.ri + 0.4) continue;
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
      if (L) { rMin = L.rWell + 0.3 + rad; fy = L.y; }
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
    for (const L of levels) if (ly < L.y && ly > L.y - 0.5 && r > L.rWell && !(r > L.ri - 3.4 && inSlot(L, a))) return true;
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
