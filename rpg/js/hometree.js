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
    root.add(trunk);
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
  for (let i = 0; i < nLimbs; i++) {
    const a = i / nLimbs * TAU + rnd() * 0.5, y0 = H * (0.48 + rnd() * 0.34), len = H * (0.34 + rnd() * 0.16), up = 0.25 + rnd() * 0.4;
    let prev = V3(Math.cos(a) * rAt(y0, a) * 0.6, y0, Math.sin(a) * rAt(y0, a) * 0.6);
    const steps = 6;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, d = rAt(y0, a) * 0.6 + len * t;
      const cur = V3(Math.cos(a + Math.sin(t * 3 + i) * 0.1) * d, y0 + len * up * t + Math.sin(t * Math.PI) * len * 0.12, Math.sin(a + Math.sin(t * 3 + i) * 0.1) * d);
      const rr = R * 0.34 * (1 - t * 0.74);
      limbs.seg(prev, cur, rr, rr, bark);
      if (s >= steps - 2) crowns.push(cur.clone());
      prev = cur;
    }
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

  /* ---- the town on it ---- */
  let decksOut = [], stair = null;
  const deckHouses = [];
  if (town > 0) {
    const wood = 0x8a6040, plank = 0xa87a50, roofs = opts.roofs ?? [0x8a3a2a, 0x6a4a8a, 0x3a6a7a, 0xa8642a, 0x5a7a3a], walls = [0xe8d8b8, 0xd8c098, 0xf0e4c8, 0xc8b090];
    const deckB = batch(root, new THREE.CylinderGeometry(1, 1, 1, 48, 1, true), toon(0xffffff, { side: THREE.DoubleSide }), 20, { shadow: true });
    const floorM = toon(plank, { side: THREE.DoubleSide });
    const houseB = batch(root, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 240);
    const roofB = batch(root, new THREE.ConeGeometry(0.75, 1, 4).rotateY(Math.PI / 4), toon(0xffffff), 240);
    const winB = batch(root, new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffd9a0, side: THREE.DoubleSide }), 700, { shadow: false });
    const postB = batch(root, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 900, { shadow: false });
    const stepB = batch(root, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 700, { shadow: true });
    const ropeB = batch(root, new THREE.CylinderGeometry(1, 1, 1, 5, 1).translate(0, 0.5, 0), toon(0x6a5a40), 400, { shadow: false });

    // decks: rings round the trunk, each wider than the bark there
    const deckYs = (opts.decks ?? [0.08, 0.17, 0.27, 0.38, 0.5]).map(f => H * f).slice(0, Math.max(1, Math.round(5 * town)));
    const decks = [];
    // the great stair's turn (worked out first, so no house is built across its landings)
    const stTop = deckYs[deckYs.length - 1], stTurns = Math.max(2, stTop / 28);
    const stairA = y => (y - 0.5) / stTop * stTurns * TAU + 0.4;
    // (a stairwell is left open in each deck just below where the stair comes through it, so it can go on down)
    const WELL0 = -0.6, WELL1 = 0.05;
    const offStair = (a, y) => { const d = Math.atan2(Math.sin(a - stairA(y)), Math.cos(a - stairA(y))); return d < WELL0 - 0.2 || d > WELL1 + 0.3; };
    for (const y of deckYs) {
      const r0 = rAt(y, 0), w = Math.max(7, opts.deckW ?? R * 0.9), ro = r0 + w;
      {   // the floor: an outer ring all the way round, and the inner ring by the bark with the stairwell left out of it
        // (RingGeometry runs its angle the other way round once it's laid flat, hence the minus signs)
        const sa = stairA(y), rw = r0 + 3.4;
        const outer = new THREE.Mesh(new THREE.RingGeometry(rw, ro, 64, 1).rotateX(-Math.PI / 2), floorM); outer.position.y = y; outer.receiveShadow = true; root.add(outer);
        const inner = new THREE.Mesh(new THREE.RingGeometry(r0 * 0.9, rw, 64, 1, -(sa + WELL0 + TAU), TAU - (WELL1 - WELL0)).rotateX(-Math.PI / 2), floorM); inner.position.y = y; inner.receiveShadow = true; root.add(inner);
      }
      deckB.put(0, y - 0.6, 0, ro, 1.2, ro, 0, 0, 0, wood);
      // the deck's struts down to the bark
      for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; limbs.seg(V3(Math.cos(a) * ro * 0.92, y - 0.8, Math.sin(a) * ro * 0.92), V3(Math.cos(a) * r0 * 0.9, y - w * 0.9, Math.sin(a) * r0 * 0.9), 0.45, 0.45, wood); }
      // a rail
      const nP = Math.round(ro * TAU / 3);
      for (let k = 0; k < nP; k++) { const a = k / nP * TAU; postB.put(Math.cos(a) * (ro - 0.3), y + 0.6, Math.sin(a) * (ro - 0.3), 0.18, 1.2, 0.18, 0, -a, 0, wood); }
      // houses round the deck, backs to the bark, doors out
      const nH = Math.max(5, Math.round(ro * TAU / 11));
      for (let k = 0; k < nH; k++) {
        if (rnd() < 0.15) continue;
        const a = k / nH * TAU + rnd() * 0.15, hw = 3 + rnd() * 2.4, hh = 3.2 + rnd() * 2.6, hd = 3 + rnd() * 1.6, d = r0 + hd * 0.5 + 0.6;
        if (!offStair(a, y)) continue;
        const hx = Math.cos(a) * d, hz = Math.sin(a) * d, ry = -a + Math.PI / 2;
        deckHouses.push({ x: x + hx, z: z + hz, y: g + y, r: Math.max(hw, hd) * 0.62, h: hh + hw * 0.5 });
        houseB.put(hx, y + hh / 2, hz, hw, hh, hd, 0, ry, 0, walls[Math.floor(rnd() * walls.length)]);
        roofB.put(hx, y + hh + hw * 0.32, hz, hw * 1.35, hw * 0.64, hd * 1.35, 0, ry, 0, roofs[Math.floor(rnd() * roofs.length)]);
        // two lit windows and a door on the outward face
        const fx = Math.cos(a), fz = Math.sin(a), sx = -Math.sin(a), sz = Math.cos(a), fo = hd * 0.5 + 0.02;
        for (const s of [-1, 1]) winB.put(hx + fx * fo + sx * s * hw * 0.28, y + hh * 0.62, hz + fz * fo + sz * s * hw * 0.28, 0.7, 0.8, 1, 0, ry + Math.PI / 2, 0);
        postB.put(hx + fx * fo, y + 0.9, hz + fz * fo, 0.9, 1.8, 0.08, 0, ry + Math.PI / 2, 0, 0x5a3a24);
      }
      decks.push({ y, ro, r0 });
    }
    decksOut = decks.map(d => Object.assign(d, { well: [stairA(d.y) + WELL0, stairA(d.y) + WELL1] }));
    // the great stair: round and round the bark from the roots to the top deck
    {
      const top = stTop, turns = stTurns, n = Math.min(650, Math.round(turns * 64));
      stair = { top, turns, a0: 0.4 };
      for (let i = 0; i < n; i++) {
        const t = i / n, a = t * turns * TAU + 0.4, y = 0.5 + t * top, r = rAt(y, a) + 1.6;
        stepB.put(Math.cos(a) * r, y, Math.sin(a) * r, 3.2, 0.35, 1.2, 0, -a, 0, plank);
        if (i % 4 === 0) postB.put(Math.cos(a) * (r + 1.5), y + 0.6, Math.sin(a) * (r + 1.5), 0.14, 1.2, 0.14, 0, -a, 0, wood);
      }
    }
    // rope bridges between decks, and rope-lifts hanging from the limbs
    for (let i = 0; i + 1 < decks.length; i++) {
      const A = decks[i], B = decks[i + 1];
      for (let k = 0; k < 2; k++) {
        const a = rnd() * TAU, p0 = V3(Math.cos(a) * A.ro, A.y + 0.3, Math.sin(a) * A.ro), p1 = V3(Math.cos(a + 0.9) * B.ro, B.y + 0.3, Math.sin(a + 0.9) * B.ro);
        const seg = 10; let prev = p0;
        for (let s = 1; s <= seg; s++) {
          const t = s / seg, q = p0.clone().lerp(p1, t); q.y -= Math.sin(t * Math.PI) * 3;
          ropeB.seg(prev, q, 0.08, 0.08); postB.put(q.x, q.y - 0.15, q.z, 1.6, 0.12, 0.5, 0, -Math.atan2(p1.z - p0.z, p1.x - p0.x), 0, plank);
          prev = q;
        }
      }
    }
    for (let k = 0; k < 6; k++) {
      const a = rnd() * TAU, d = rAt(H * 0.3, a) + R * (1 + rnd()), top = H * (0.45 + rnd() * 0.15);
      ropeB.seg(V3(Math.cos(a) * d, 0, Math.sin(a) * d), V3(Math.cos(a) * d, top, Math.sin(a) * d), 0.12, 0.12);
      postB.put(Math.cos(a) * d, H * (0.1 + rnd() * 0.25), Math.sin(a) * d, 2, 1.4, 2, 0, a, 0, wood);   // a basket on its way up
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
    for (const b of [deckB, houseB, roofB, winB, postB, stepB, ropeB]) b.done();
  }
  limbs.done(); leafB.done();
  // decks ({ y, r0, ro } above the foot), the stair ({ top, turns, a0 }: it climbs from a0 at the foot, anticlockwise) and the
  // houses on the decks ({ x, z, y, r, h } in world terms) let a scene make the tree walkable
  return { x, z, g, R, RB, H, colliders, root, rAt, decks: decksOut, stair, deckHouses };
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
