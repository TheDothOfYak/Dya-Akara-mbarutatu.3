/* ============================================================
   HOME TREES — the great trees of the Tatu that folk live in.
   Each is a town on its own: a trunk wider than a city street,
   roots like hills, and up its sides ring after ring of decks
   with houses on them, a stair winding round the bark from the
   roots to the crown, rope bridges between the decks, lit
   windows, and a crown of leaf so high it is half in the cloud.

   buildHomeTree(scene, x, z, g, opts) adds one and hands back
   { x, z, R, RB, H, colliders, rAt, decks, stair, deckHouses } —
   colliders are plain records ({ kind:'cyl', x, z, r, y0, y1 }) for
   the caller's own physics; the rest is enough to walk the decks
   and the stair (road.js does).
   ============================================================ */
import * as THREE from 'three';
import { toon, addOutline } from './gfx.js';
import { mulberry32 } from './util.js';
import { noSolid } from './solid.js';

const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* one InstancedMesh, filled as you go, trimmed when done */
function batch(scene, geo, mat, max, { shadow = true, outline = 0 } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, max); m.count = 0;
  m.castShadow = shadow; m.receiveShadow = true;
  const o = new THREE.Object3D(), col = new THREE.Color();
  scene.add(m);
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
  const town = opts.town ?? 1;                                          // how lived-in (decks, houses)
  const bark = new THREE.Color(opts.bark ?? 0x6a4a34), barkDark = new THREE.Color(opts.barkDark ?? 0x3e2a1e);
  const leafCols = opts.leaves ?? [0x3e6a34, 0x47763a, 0x355e30, 0x52823f];
  const colliders = [];
  const root = new THREE.Group(); root.position.set(x, g, z); scene.add(root);

  // the trunk's radius at height y, round angle a: a wide flare into buttresses at the foot, tapering up
  const flareH = R * 1.8;
  const rAt = (y, a) => {
    const k = y / H;
    const base = R * (1 - 0.42 * k) + (RB - R) * Math.exp(-y / (flareH * 0.55));
    const lobes = 1 + 0.16 * Math.sin(a * 7 + 1.3) * Math.exp(-y / (flareH * 1.2)) + 0.04 * Math.sin(a * 13 + y * 0.05);
    return base * lobes;
  };

  /* ---- the trunk ---- */
  {
    const SA = 48, SY = 40;
    const geo = new THREE.CylinderGeometry(1, 1, 1, SA, SY, true);
    const p = geo.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const v = p.getY(i) + 0.5, a = Math.atan2(p.getZ(i), p.getX(i)), y = v * H * 0.92 - 2;
      const r = rAt(Math.max(0, y), a);
      p.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r);
      // grooves of darker bark running up it
      const groove = Math.pow(Math.abs(Math.sin(a * 11 + y * 0.012)), 6);
      c.copy(bark).lerp(barkDark, groove * 0.7 + 0.15 * Math.sin(y * 0.03 + a * 3) ** 2);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const trunk = new THREE.Mesh(geo, toon(0xffffff, { vertexColors: true })); trunk.castShadow = trunk.receiveShadow = true;
    root.add(noSolid(trunk));   // the trunk has its own collider (below, and the road's treeResolve), true to its swell
    colliders.push({ kind: 'cyl', x, z, r: RB * 0.92, y0: g - 5, y1: g + H });
  }

  /* ---- roots: out over the ground like ridges of hill ---- */
  const limbs = batch(root, new THREE.CylinderGeometry(0.7, 1, 1, 9, 1).translate(0, 0.5, 0), toon(0xffffff), 900);
  const nRoots = opts.roots ?? 9, rootReach = opts.rootReach ?? 2.25;
  for (let i = 0; i < nRoots; i++) {
    const a = i / nRoots * TAU + rnd() * 0.3;
    if (opts.rootSkip && opts.rootSkip(a)) continue;
    const reach = RB * (rootReach - 0.4 + rnd() * 0.6), steps = 7;
    let prev = V3(Math.cos(a) * RB * 0.7, R * 0.9, Math.sin(a) * RB * 0.7);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, d = RB * 0.7 + (reach - RB * 0.7) * t, wob = Math.sin(t * 4 + i) * 0.12;
      const cur = V3(Math.cos(a + wob) * d, R * 0.9 * Math.pow(1 - t, 1.6) - t * 1.2, Math.sin(a + wob) * d);
      const rr = R * 0.42 * (1 - t * 0.75);
      limbs.seg(prev, cur, rr, rr, barkDark.clone().lerp(bark, 0.5));
      // something to walk into: a post at each joint as high as the root is there
      if (s < steps) colliders.push({ kind: 'cyl', x: x + cur.x, z: z + cur.z, r: rr * 0.85, y0: g - 3, y1: g + cur.y + rr * 0.7 });
      prev = cur;
    }
  }

  /* ---- great limbs, out and up into the crown ---- */
  const leafB = batch(root, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), 420, { shadow: true });
  const crowns = [];
  const nLimbs = opts.limbs ?? 13;
  const limbPaths = [];   // each limb's joints, root to tip, with its radius there: for windows in the thick of it, and cabins out at the thin end
  for (let i = 0; i < nLimbs; i++) {
    const a = i / nLimbs * TAU + rnd() * 0.5, y0 = H * (0.48 + rnd() * 0.34), len = H * (0.34 + rnd() * 0.16), up = 0.25 + rnd() * 0.4;
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

  /* ---- the town in it ----
     Folk live inside the tree: its rooms are hollowed out of the trunk and the great limbs, and all you see of them
     from outside is windows and doors set into the bark, lit at dusk. Round the outside the great stair winds up the
     trunk; where it reaches a level, a balcony juts from the bark with doors in. Out where the branches are too thin
     to live inside, cabins perch on them, and long plank bridges hang between those, high in the boughs. */
  let decksOut = [], stair = null;
  const deckHouses = [], perches = [];
  if (town > 0) {
    const wood = 0x8a6040, plank = 0xa87a50, roofs = opts.roofs ?? [0x8a3a2a, 0x6a4a8a, 0x3a6a7a, 0xa8642a, 0x5a7a3a], walls = [0xe8d8b8, 0xd8c098, 0xf0e4c8, 0xc8b090];
    const floorM = toon(plank, { side: THREE.DoubleSide }), fasciaM = toon(wood, { side: THREE.DoubleSide });
    const houseB = batch(root, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 160);
    const roofB = batch(root, new THREE.ConeGeometry(0.75, 1, 4).rotateY(Math.PI / 4), toon(0xffffff), 160);
    const winB = batch(root, new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffd9a0, side: THREE.DoubleSide }), 900, { shadow: false });
    const postB = batch(root, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 3600, { shadow: false });
    const stepB = batch(root, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 700, { shadow: true });
    const ropeB = batch(root, new THREE.CylinderGeometry(1, 1, 1, 5, 1).translate(0, 0.5, 0), toon(0x6a5a40), 1400, { shadow: false });
    const archB = batch(root, new THREE.TorusGeometry(1, 0.16, 5, 12, Math.PI), toon(0x5a3a24), 220, { shadow: false });
    // a door set into the bark, round-topped, with a frame; facing out along angle a, base at height y
    const barkDoor = (a, y, w = 2.0, h = 3.0) => {
      const r = rAt(y + h * 0.5, a) - 0.05, fx = Math.cos(a), fz = Math.sin(a), ry = -a + Math.PI / 2;
      postB.put(fx * r, y + h * 0.5, fz * r, w, h, 0.25, 0, ry, 0, 0x4a2c18);
      archB.put(fx * (r + 0.1), y + h, fz * (r + 0.1), w * 0.55, w * 0.55, 1, 0, ry, 0);
      postB.put(fx * (r + 0.12), y + h * 0.5, fz * (r + 0.12), 0.14, h, 0.3, 0, ry + Math.PI / 2, 0, 0x5a3a24);
      winB.put(fx * (r + 0.2), y + h * 0.55, fz * (r + 0.2) + 0, 0.22, 0.22, 1, 0, ry + Math.PI / 2, 0);   // a little lit pane in it
    };
    // a lit window in the bark with a frame and a sill (and sometimes a box of flowers)
    const barkWindow = (a, y, w = 1.0, h = 1.3) => {
      const r = rAt(y, a) + 0.04, fx = Math.cos(a), fz = Math.sin(a), sx = -Math.sin(a), sz = Math.cos(a), ry = -a + Math.PI / 2;
      winB.put(fx * r, y, fz * r, w, h, 1, 0, ry + Math.PI / 2, 0);
      archB.put(fx * (r + 0.05), y + h * 0.5, fz * (r + 0.05), w * 0.5, w * 0.5, 0.6, 0, ry, 0);
      for (const q of [-1, 1]) postB.put(fx * (r + 0.05) + sx * q * w * 0.5, y, fz * (r + 0.05) + sz * q * w * 0.5, 0.12, h, 0.14, 0, ry, 0, 0x5a3a24);
      postB.put(fx * (r + 0.12), y - h * 0.5 - 0.05, fz * (r + 0.12), w + 0.3, 0.12, 0.35, 0, ry + Math.PI / 2, 0, 0x6a4428);
      if (rnd() < 0.35) postB.put(fx * (r + 0.3), y - h * 0.5 + 0.1, fz * (r + 0.3), w + 0.1, 0.3, 0.3, 0, ry + Math.PI / 2, 0, [0xd8604a, 0xe8c048, 0xc87ad8][Math.floor(rnd() * 3)]);
    };

    // the levels the stair reaches, each with its balcony (a partial deck, on the side the stair arrives)
    const deckYs = (opts.decks ?? [0.08, 0.17, 0.27, 0.38, 0.5]).map(f => H * f).slice(0, Math.max(1, Math.round(5 * town)));
    const decks = [];
    const stTop = deckYs[deckYs.length - 1], stTurns = Math.max(2, stTop / 28);
    const stairA = y => (y - 0.5) / stTop * stTurns * TAU + 0.4;
    // (the stair comes up through the inner edge of each balcony, so a slot is left open just behind where it arrives)
    const WELL0 = -0.6, WELL1 = 0.05;
    const span = opts.balcony ?? 1.7;
    for (let di = 0; di < deckYs.length; di++) {
      const y = deckYs[di], sa = stairA(y), r0 = rAt(y, sa), w = Math.max(6, (opts.deckW ?? R * 0.9) * (di === deckYs.length - 1 ? 0.85 : 0.6)), ro = r0 + w, rw = r0 + 3.4;
      const A0 = sa - span * 0.42, A1 = sa + span * 0.58;
      const ring = (ri, rO, a0, a1) => { if (a1 - a0 < 0.01) return; const m = new THREE.Mesh(new THREE.RingGeometry(ri, rO, Math.max(6, Math.round((a1 - a0) * 20)), 1, -a1, a1 - a0).rotateX(-Math.PI / 2), floorM); m.position.y = y; m.receiveShadow = true; root.add(m); };
      ring(rw, ro, A0, A1);
      ring(r0 * 0.9, rw, A0, sa + WELL0); ring(r0 * 0.9, rw, sa + WELL1, A1);
      // its edge, its brackets down into the bark, its rail (round the front and down both ends)
      { const f = new THREE.Mesh(new THREE.CylinderGeometry(ro, ro, 1.0, Math.max(8, Math.round(span * 16)), 1, true, Math.PI / 2 - A1, A1 - A0), fasciaM); f.position.y = y - 0.5; root.add(f); }
      for (let k = 0; k <= 5; k++) { const a = A0 + (A1 - A0) * k / 5; limbs.seg(V3(Math.cos(a) * ro * 0.95, y - 0.8, Math.sin(a) * ro * 0.95), V3(Math.cos(a) * r0 * 0.92, y - w * 1.1, Math.sin(a) * r0 * 0.92), 0.4, 0.4, wood); }
      const nP = Math.max(4, Math.round(ro * (A1 - A0) / 1.8));
      for (let k = 0; k <= nP; k++) { const a = A0 + (A1 - A0) * k / nP; postB.put(Math.cos(a) * (ro - 0.3), y + 0.6, Math.sin(a) * (ro - 0.3), 0.18, 1.2, 0.18, 0, -a, 0, wood); }
      for (const a of [A0, A1]) for (let q = rw; q < ro; q += 1.5) postB.put(Math.cos(a) * q, y + 0.6, Math.sin(a) * q, 0.18, 1.2, 0.18, 0, -a, 0, wood);
      // a top rail along the front
      for (let k = 0; k < nP; k++) { const a = A0 + (A1 - A0) * (k + 0.5) / nP; postB.put(Math.cos(a) * (ro - 0.3), y + 1.2, Math.sin(a) * (ro - 0.3), 0.14, 0.12, ro * (A1 - A0) / nP + 0.1, 0, -a, 0, wood); }
      // doors into the rooms behind the bark, off the balcony (clear of where the stair comes up)
      const nd = 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < nd; k++) { const a = sa + 0.35 + (A1 - sa - 0.5) * (k + 0.5) / nd; barkDoor(a, y + 0.02); postB.put(Math.cos(a + 0.12) * (rAt(y + 2.4, a) + 0.4), y + 2.8, Math.sin(a + 0.12) * (rAt(y + 2.4, a) + 0.4), 0.3, 0.4, 0.3, 0, 0, 0, 0xffc870); }
      decks.push({ y, ro, r0, a0: A0, a1: A1 });
    }
    decksOut = decks.map(d => Object.assign(d, { well: [stairA(d.y) + WELL0, stairA(d.y) + WELL1] }));
    // the rooms inside the trunk: windows all the way up it, in loose storeys, avoiding the stair and the balconies
    {
      const topW = Math.min(H * 0.62, stTop + H * 0.22);
      for (let y = 5; y < topW; y += (3.6 + rnd() * 1.4) * Math.max(1, R / 14)) {
        const n = Math.max(2, Math.round(rAt(y, 0) * TAU / 7));
        for (let k = 0; k < n; k++) {
          if (rnd() < 0.42) continue;
          const a = k / n * TAU + rnd() * 0.25 + y * 0.07;
          const sd = Math.atan2(Math.sin(a - stairA(Math.min(y, stTop))), Math.cos(a - stairA(Math.min(y, stTop))));
          if (y < stTop + 3 && Math.abs(sd) < 0.35) continue;                                   // the stair runs past here
          if (decks.some(d => y > d.y - 1 && y < d.y + 3.6 && Math.atan2(Math.sin(a - (d.a0 + d.a1) / 2), Math.cos(a - (d.a0 + d.a1) / 2)) * 2 < (d.a1 - d.a0) + 0.2 && Math.abs(Math.atan2(Math.sin(a - (d.a0 + d.a1) / 2), Math.cos(a - (d.a0 + d.a1) / 2))) * 2 < (d.a1 - d.a0) + 0.2)) continue;
          barkWindow(a, y + 1.8, (1.3 + rnd() * 0.7) * Math.max(1, R / 14), (1.8 + rnd() * 0.8) * Math.max(1, R / 14));
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
    }
    // the great stair: round and round the outside of the bark from the roots to the top level, railed on the open side
    {
      const top = stTop, turns = stTurns, n = Math.min(650, Math.round(turns * 64));
      stair = { top, turns, a0: 0.4 };
      let prevPost = null;
      for (let i = 0; i < n; i++) {
        const t = i / n, a = t * turns * TAU + 0.4, y = 0.5 + t * top, r = rAt(y, a) + 1.6;
        stepB.put(Math.cos(a) * r, y, Math.sin(a) * r, 3.2, 0.35, 1.2, 0, -a, 0, plank);
        if (i % 4 === 0) {
          const pp = V3(Math.cos(a) * (r + 1.5), y + 1.15, Math.sin(a) * (r + 1.5));
          postB.put(pp.x, y + 0.6, pp.z, 0.14, 1.2, 0.14, 0, -a, 0, wood);
          if (prevPost) ropeB.seg(prevPost, pp, 0.06, 0.06);
          prevPost = pp;
        }
        // brackets under it into the bark, now and then
        if (i % 12 === 6) limbs.seg(V3(Math.cos(a) * (r + 1.2), y - 0.2, Math.sin(a) * (r + 1.2)), V3(Math.cos(a) * (r - 1.8), y - 3, Math.sin(a) * (r - 1.8)), 0.22, 0.22, wood);
      }
    }
    // out on the thin ends of the limbs, too thin to live inside: cabins perched on platforms
    for (let li = 0; li < limbPaths.length; li++) {
      if (li % 2 && rnd() < 0.6) continue;
      const L = limbPaths[li], j = L.path.length - 2 - Math.floor(rnd() * 2), J = L.path[j], N = L.path[j + 1];
      const pos = J.p.clone().lerp(N.p, 0.3); pos.y += J.r * 0.8;
      const ang = Math.atan2(N.p.z - J.p.z, N.p.x - J.p.x), ry = -ang + Math.PI / 2, pw = 7 + rnd() * 3, pd = 6 + rnd() * 2;
      postB.put(pos.x, pos.y, pos.z, pw, 0.4, pd, 0, ry, 0, plank);
      for (const [qx, qz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {   // posts at the corners, struts down to the limb
        const cx = pos.x + (Math.cos(ry) * qx * pw * 0.48 + Math.sin(ry) * qz * pd * 0.48), cz = pos.z + (-Math.sin(ry) * qx * pw * 0.48 + Math.cos(ry) * qz * pd * 0.48);
        postB.put(cx, pos.y + 0.6, cz, 0.16, 1.2, 0.16, 0, ry, 0, wood);
        limbs.seg(V3(cx, pos.y - 0.2, cz), V3(pos.x, pos.y - J.r * 1.2, pos.z), 0.2, 0.2, wood);
      }
      const hw = 3.6 + rnd() * 1.4, hh = 2.8 + rnd() * 1.2, hd = 3.2 + rnd();
      houseB.put(pos.x, pos.y + 0.2 + hh / 2, pos.z, hw, hh, hd, 0, ry, 0, walls[Math.floor(rnd() * walls.length)]);
      roofB.put(pos.x, pos.y + 0.2 + hh + hw * 0.3, pos.z, hw * 1.35, hw * 0.6, hd * 1.35, 0, ry, 0, roofs[Math.floor(rnd() * roofs.length)]);
      const fx = Math.sin(ry), fz = Math.cos(ry);
      for (const q of [-1, 1]) winB.put(pos.x + fx * (hd * 0.5 + 0.03) + Math.cos(ry) * q * hw * 0.27, pos.y + 0.2 + hh * 0.6, pos.z + fz * (hd * 0.5 + 0.03) - Math.sin(ry) * q * hw * 0.27, 0.7, 0.8, 1, 0, ry, 0);
      perches.push({ p: pos.clone(), ry, a: L.a, w: pw, d: pd });
      deckHouses.push({ x: x + pos.x, z: z + pos.z, y: g + pos.y, r: Math.max(hw, hd) * 0.62, h: hh + hw * 0.5 });
      // a rope ladder down to the limb's joint below, the way home
      const Jb = L.path[Math.max(1, j - 1)];
      ropeB.seg(V3(Jb.p.x, Jb.p.y + Jb.r, Jb.p.z), V3(pos.x, pos.y, pos.z), 0.07, 0.07);
    }
    // long plank bridges strung between the perches, high in the boughs, each to the next one round
    perches.sort((p, q) => p.a - q.a);
    const bridge = (a, b, sagK = 0.05, wd = 1.4) => plankBridge(postB, ropeB, a, b, sagK, wd, plank, wood);
    for (let k = 0; k < perches.length; k++) {
      const A = perches[k], B = perches[(k + 1) % perches.length];
      if (perches.length < 3 && k) break;
      const d = A.p.distanceTo(B.p); if (d < 8 || d > H * 0.9) continue;
      bridge(V3(A.p.x, A.p.y + 0.2, A.p.z), V3(B.p.x, B.p.y + 0.2, B.p.z));
    }
    // rope lifts hanging from the limbs, with a basket on its way up
    for (let k = 0; k < 6; k++) {
      const a = rnd() * TAU, d = rAt(H * 0.3, a) + R * (1 + rnd()), top = H * (0.45 + rnd() * 0.15);
      ropeB.seg(V3(Math.cos(a) * d, 0, Math.sin(a) * d), V3(Math.cos(a) * d, top, Math.sin(a) * d), 0.12, 0.12);
      postB.put(Math.cos(a) * d, H * (0.1 + rnd() * 0.25), Math.sin(a) * d, 2, 1.4, 2, 0, a, 0, wood);
    }
    // banners down the bark
    if (opts.banners) for (let k = 0; k < opts.banners.length * 2; k++) {
      const a = k / (opts.banners.length * 2) * TAU + 0.2, y = H * 0.12 + (k % 2) * H * 0.1, r = rAt(y, a) + 0.4;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(4, 14), toon(opts.banners[k % opts.banners.length], { side: THREE.DoubleSide }));
      b.position.set(Math.cos(a) * r, y, Math.sin(a) * r); b.rotation.y = -a + Math.PI / 2; root.add(b);
    }
    // a great door in the foot of the trunk, facing where the folk come from
    if (opts.doorAt != null) {
      const a = opts.doorAt, r = rAt(3, a);
      const door = new THREE.Mesh(new THREE.BoxGeometry(9, 14, 1.2), toon(0x3a2416)); door.position.set(Math.cos(a) * (r - 0.2), 7, Math.sin(a) * (r - 0.2)); door.rotation.y = -a + Math.PI / 2; addOutline(door, 0.08); root.add(door);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.8, 6, 16, Math.PI), toon(0x8a6a4a)); arch.position.set(Math.cos(a) * (r + 0.2), 14, Math.sin(a) * (r + 0.2)); arch.rotation.y = -a + Math.PI / 2; root.add(arch);
      for (const s of [-1, 1]) { const sa = a + s * 6 / r; winB.put(Math.cos(sa) * (r + 0.3), 9, Math.sin(sa) * (r + 0.3), 1.1, 1.4, 1, 0, -sa + Math.PI / 2, 0); }
    }
    for (const b of [houseB, roofB, winB, postB, stepB, ropeB, archB]) b.done();
  }
  limbs.done(); leafB.done();
  // decks: the balconies ({ y, r0, ro, a0, a1, well } above the foot — each a partial deck from a0 to a1, anticlockwise),
  // the stair ({ top, turns, a0 }: it climbs from a0 at the foot, anticlockwise), the houses perched in the branches
  // ({ x, z, y, r, h } in world terms), and the perches themselves (local), so a scene can walk the lower tree and
  // string bridges to the next tree along (see buildTreeBridge)
  return { x, z, g, R, RB, H, colliders, root, rAt, decks: decksOut, stair, deckHouses, perches };
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

/* a long bridge between two home trees, high up, from a landing jutting off one trunk to a landing on the other.
   f: how far up the shorter tree (0..1). Returns the two landings in world terms. */
export function buildTreeBridge(scene, A, B, f = 0.4) {
  const g = new THREE.Group(); scene.add(g);
  const postB = batch(g, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 900, { shadow: false });
  const ropeB = batch(g, new THREE.CylinderGeometry(1, 1, 1, 5, 1).translate(0, 0.5, 0), toon(0x6a5a40), 400, { shadow: false });
  const strut = batch(g, new THREE.CylinderGeometry(0.7, 1, 1, 7, 1).translate(0, 0.5, 0), toon(0x8a6040), 40);
  const y = Math.min(A.H, B.H) * f, dx = B.x - A.x, dz = B.z - A.z, aA = Math.atan2(dz, dx), aB = aA + Math.PI;
  const end = (T, a) => { const r = T.rAt(y, a); return { p: V3(T.x + Math.cos(a) * (r + 5.5), T.g + y, T.z + Math.sin(a) * (r + 5.5)), r, T, a }; };
  const EA = end(A, aA), EB = end(B, aB);
  // a landing off each trunk, with a door into it
  for (const E of [EA, EB]) {
    const { T, a, r } = E, ly = T.g + y;
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.92, r + 6.5, 12, 1, -(a + 0.32), 0.64).rotateX(-Math.PI / 2), toon(0xa87a50, { side: THREE.DoubleSide }));
    ring.position.set(T.x, ly, T.z); ring.receiveShadow = true; g.add(ring);
    for (const q of [-0.28, 0, 0.28]) strut.seg(V3(T.x + Math.cos(a + q) * (r + 6), ly - 0.6, T.z + Math.sin(a + q) * (r + 6)), V3(T.x + Math.cos(a + q) * r * 0.95, ly - 7, T.z + Math.sin(a + q) * r * 0.95), 0.35, 0.35, 0x8a6040);
    const dr = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.3), toon(0x4a2c18)); dr.position.set(T.x + Math.cos(a) * (T.rAt(y + 1.4, a) - 0.05), ly + 1.4, T.z + Math.sin(a) * (T.rAt(y + 1.4, a) - 0.05)); dr.rotation.y = -a + Math.PI / 2; g.add(dr);
  }
  plankBridge(postB, ropeB, EA.p, EB.p, 0.035, 1.6, 0xa87a50, 0x8a6040);
  postB.done(); ropeB.done(); strut.done();
  return { a: EA.p, b: EB.p, y };
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
