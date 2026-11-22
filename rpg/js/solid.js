/* ============================================================
   Everything you can see is something you can bump into.

   The regions place their colliders by hand (walls, posts, trunks,
   stairs), and that misses things: a barrel beside a stall, a heap
   of logs, a pot on a sill, a rock the scatter dropped, the bench a
   room was furnished with. This goes over a scene once it is built
   and makes every visible thing in it solid, using the same oriented
   boxes the regions already use (terrain.js Colliders):

   Every box stays inside what you can see: nothing is solid where
   nothing is drawn.

   · an upright box is its own collider, exactly;
   · a bough (long and thin, lying more along than up) is a row of
     short boxes along it, topped on the bark;
   · any other plain shape (a ball, a cone, a rock, a post, a trunk)
     is filled from the inside, band by band up its height, with
     boxes whose corners just touch its surface;
   · anything else (merged furniture, a roof, an arch, a rail) is cut
     into cells from its own triangles (half a metre, coarser for big
     things), so a doorway or an arch stays open and only the parts
     that are there are solid;
   · what a region's own colliders (or the land) already cover is
     left alone, so nothing is solid twice, and so is anything out
     past where you can ever go.

   Not solid: the sky, water, anything see-through or glowing (mist,
   light, glass, holograms, sparks), leaves and hanging vines, grass,
   crops and reeds, flat
   things lying on the ground, and anything that moves — folk,
   beasts, boats, carts, pickups — which look after their own
   collisions. Anything marked noSolid(o) (and all under it) is left
   out too. The boxes are marked .auto, and folk keep to the hand-
   placed colliders as they always have (Colliders' `hand` flag), so
   these are for you: no townsfolk route jams on a new barrel.

   It keeps watching: a thing that turns up later (a room furnished
   the first time you step in, a tent pitched) is made solid once it
   has sat still a moment; a thing that is hidden stops being solid
   until it is shown again; and a thing that starts moving stops
   being solid (and is never counted again if it keeps on moving).
   ============================================================ */
import * as THREE from 'three';

export const noSolid = o => { o.userData.noSolid = true; return o; };
/* a thing folk keep clear of too (a trunk, a boulder, a wall): its boxes are made here, fitted to it like any other,
   but not marked .auto, so townsfolk and beasts walk round it as they would a box placed by hand. Use it instead of
   placing a box by hand round something drawn: a hand-placed box never quite matches what you see. */
export const folkSolid = o => { o.userData.folkSolid = true; return o; };

const CELL = 0.5;            // metres: the finest a shape is cut into (bigger shapes, coarser: up to CELL_MAX)
const CELL_MAX = 1;
const FLAT = 0.08;           // thinner than this and level, it's a decal, a rug, a puddle
const LOW = 0.25;            // this little above the ground is stepped over anyway
const BIG = 400;             // bigger than this across is land, sea or sky
const PLAIN = 6;             // plain shapes thinner than this are solid through (a trunk, a post, a rock), not shells
const HIGH = 90;             // further above the land than this, it's sky (clouds, ships, planets)
const MOST = 1500;           // boxes one shape may be cut into; more, and it's cut coarser
const STILL = 0.5;           // seconds a newcomer must sit still before it is solid
const RESTLESS = 6;          // seen moving this many times: it moves, and that's that
const PER_FRAME = 400;       // things re-checked each frame
const BUDGET = 3;            // milliseconds a frame may spend making things solid (nearest first)
const RESCAN = 2.5;          // seconds between looks for newcomers

/* shapes that are their own box: convex, closed. A big part-sphere or open-ended tube is a shell
   (a dome over a room, a ring of wall) and gets cut up like anything else; a small one (a trunk,
   a bush, a pipe) is as good as solid. */
function plainShape(g, small) {
  const p = g.parameters || {};
  switch (g.type) {
    case 'BoxGeometry': case 'ConeGeometry': case 'DodecahedronGeometry': case 'IcosahedronGeometry':
    case 'OctahedronGeometry': case 'TetrahedronGeometry': case 'CapsuleGeometry':
      return true;
    case 'LatheGeometry': return small;
    case 'CylinderGeometry': return small || (!p.openEnded && !(p.thetaLength < Math.PI * 1.9));
    // (a dome — the top of a ball, all the way round — is a cap on what's under it: solid through. A bowl isn't, unless small)
    case 'SphereGeometry': return small || (!(p.phiLength < Math.PI * 1.9) && (!(p.thetaLength < Math.PI * 0.9) || !((p.thetaStart || 0) > 0.01)));
    default: return false;
  }
}

/* leaves (a crown, a bush, a spray of leaf cards: smooth.js marks them as it softens them) and things that hang and
   sway (vines, strands, threads): you brush through them */
const SOFT = ['FL_LEAF', 'FL_CARD', 'FL_HANG'];
const soft = m => !!(m && m.defines && SOFT.some(k => m.defines[k]));

/* see-through, glowing, or not drawn: not a thing you can bump into */
function ghostly(m) {
  if (!m || m.visible === false || m.colorWrite === false) return true;
  if (soft(m)) return true;
  if (m.isMeshBasicMaterial) return true;   // unlit: a glow (a lamp, a lit window, a crack of lava, a spark of fungus), not a thing
  if (m.blending !== THREE.NormalBlending) return true;
  if (m.transparent && (m.opacity < 0.95 || !m.depthWrite || m.isShaderMaterial)) return true;
  if (m.wireframe) return true;
  return false;
}

/* ---------------- a shape cut into cells, in its own space (cached per geometry) ---------------- */
const cache = new WeakMap();
const cached = (geo, key, make) => {
  let m = cache.get(geo);
  if (!m) cache.set(geo, m = new Map());
  if (!m.has(key)) m.set(key, make());
  return m.get(key);
};
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _p = new THREE.Vector3(), _ab = new THREE.Vector3(), _ac = new THREE.Vector3();
/* points over every triangle of the shape, no further apart than step */
function sample(geo, step, fn) {
  const pos = geo.attributes.position, idx = geo.index, n = idx ? idx.count : pos.count;
  for (let t = 0; t + 2 < n; t += 3) {
    _a.fromBufferAttribute(pos, idx ? idx.getX(t) : t); _b.fromBufferAttribute(pos, idx ? idx.getX(t + 1) : t + 1); _c.fromBufferAttribute(pos, idx ? idx.getX(t + 2) : t + 2);
    const e = Math.max(_a.distanceTo(_b), _b.distanceTo(_c), _c.distanceTo(_a));
    const k = Math.min(64, Math.max(1, Math.ceil(e / step)));
    _ab.subVectors(_b, _a); _ac.subVectors(_c, _a);
    for (let i = 0; i <= k; i++) for (let j = 0; j <= k - i; j++) {
      _p.copy(_a).addScaledVector(_ab, i / k).addScaledVector(_ac, j / k);
      fn(_p.x, _p.y, _p.z);
    }
  }
}
/* a convex shape filled from the inside: cut into bands up its height (in the world, however it is turned), and in
   each band two squares, square on and turned an eighth, whose corners just touch its narrowest girth there. Their
   outline is an eight-pointed star that never reaches outside the shape. The very top, where it rounds off to a
   point, is left out: you stand a hand's breadth down into the crown of a boulder, never on air over it. */
const _ip = new THREE.Vector3();
function surfacePoints(geo) {
  return cached(geo, 'pts', () => {
    const bb = geo.boundingBox, all = [];
    sample(geo, Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) / 14, (x, y, z) => all.push(x, y, z));
    const n = all.length / 3, keep = Math.min(n, 420), out = new Float32Array(keep * 3);
    for (let i = 0; i < keep; i++) { const k = Math.floor(i * n / keep) * 3; out[i * 3] = all[k]; out[i * 3 + 1] = all[k + 1]; out[i * 3 + 2] = all[k + 2]; }
    return out;
  });
}
function insideBoxes(geo, M) {
  if (!geo.boundingBox) geo.computeBoundingBox();
  const P = surfacePoints(geo), n = P.length / 3, W = new Float32Array(P.length);
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) { _ip.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(M); W[i * 3] = _ip.x; W[i * 3 + 1] = _ip.y; W[i * 3 + 2] = _ip.z; if (_ip.y < y0) y0 = _ip.y; if (_ip.y > y1) y1 = _ip.y; }
  const h = y1 - y0, nb = Math.max(2, Math.min(8, Math.ceil(h / 0.25))), bh = h / nb, out = [];
  for (let b = 0; b < nb; b++) {
    const lo = y0 + b * bh, hi = lo + bh;
    let sx = 0, sz = 0, c = 0;
    for (let i = 0; i < n; i++) { const y = W[i * 3 + 1]; if (y >= lo - 1e-4 && y <= hi + 1e-4) { sx += W[i * 3]; sz += W[i * 3 + 2]; c++; } }
    if (c < 4) continue;
    const cx = sx / c, cz = sz / c;
    let r = Infinity;
    for (let i = 0; i < n; i++) { const y = W[i * 3 + 1]; if (y >= lo - 1e-4 && y <= hi + 1e-4) r = Math.min(r, Math.hypot(W[i * 3] - cx, W[i * 3 + 2] - cz)); }
    const a = r * 0.92 * Math.SQRT1_2;
    if (!(a > 0.05)) continue;
    // (and no higher than the surface over it, nor lower than the surface under it: a rounded top — a cap, a dome, a
    // softened rim — comes down toward its edge)
    const foot = a * Math.SQRT2 + 0.02, mid = (lo + hi) / 2;
    let top = hi, bot = lo;
    for (let i = 0; i < n; i++) {
      const y = W[i * 3 + 1]; if (y < lo - bh || y > hi + bh) continue;
      if (Math.hypot(W[i * 3] - cx, W[i * 3 + 2] - cz) > foot) continue;
      if (y >= mid) top = Math.min(top, y); else bot = Math.max(bot, y);
    }
    if (top - bot < 0.02) continue;
    for (const ang of [0, Math.PI / 4]) out.push({ x: cx, z: cz, hw: a, hd: a, ang, bot, top });
  }
  return out;
}

/* a length of round tube (a bough, a root, a ring, a rail) from (x0,y0,z0) to (x1,y1,z1), radius r, filled from the
   inside: two boxes crossed in its round section (a tall narrow one, a wide low one, their corners on the surface),
   each as long as the length runs over the ground, its flat top at or under the surface at both ends. A length
   standing more up than along is a pillar: two squares, square on and turned an eighth, inside it. */
function segBoxes(x0, y0, z0, x1, y1, z1, r, out) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dx, dy, dz);
  if (L < 1e-4 || r < 0.02) return;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, mz = (z0 + z1) / 2, ay = Math.abs(dy) / L, flat = Math.sqrt(Math.max(0, 1 - ay * ay));
  if (flat < 0.45) {
    const a = r * Math.SQRT1_2 * 0.97;
    for (const ang of [0, Math.PI / 4]) out.push({ x: mx, z: mz, hw: a, hd: a, ang, bot: Math.min(y0, y1), top: Math.max(y0, y1) });
    return;
  }
  const uh = Math.hypot(dx, dz), ang = Math.atan2(-dz / uh, dx / uh), hw = L * flat / 2, rise = Math.abs(dy) / 2;
  for (const [across, up] of [[0.5, 0.86], [0.86, 0.5]]) {
    const v = r * up / flat, bot = my - v + rise, top = my + v - rise;
    if (top - bot > 0.02) out.push({ x: mx, z: mz, hw, hd: r * across, ang, bot, top });
  }
}
/* a run of points with a radius at each: lengths of tube between them, each cut short enough to stay on the surface.
   An open end is cut square across the tube, so where the tube leans, a box reaching up or down from the axis near the
   end would reach past it: the run is trimmed back from each open end by as much (none for a closed ring). */
const _sa = new THREE.Vector3(), _sb = new THREE.Vector3();
function tubeBoxes(pts, rad, out = []) {
  const n = pts.length - 1;
  if (n < 1) return out;
  const closed = pts[0].distanceTo(pts[n]) < 1e-3;
  const len = []; let total = 0;
  for (let i = 1; i <= n; i++) { len.push(pts[i - 1].distanceTo(pts[i])); total += len[i - 1]; }
  const trimAt = (a, b, r) => { const L = a.distanceTo(b) || 1, ay = Math.abs(b.y - a.y) / L, flat = Math.sqrt(Math.max(0, 1 - ay * ay)); return flat < 0.45 ? 0 : r * ay / flat; };
  const t0 = closed ? 0 : trimAt(pts[0], pts[1], rad[0]), t1 = closed ? 0 : trimAt(pts[n - 1], pts[n], rad[n]);
  let s0 = 0;
  for (let i = 1; i <= n; i++) {
    const a = pts[i - 1], b = pts[i], L = len[i - 1], r = Math.min(rad[i - 1], rad[i]) * 0.9;   // (a margin: softened by smooth.js, a tube's surface comes in a little)
    const f0 = Math.max(0, (t0 - s0) / (L || 1)), f1 = Math.min(1, (total - t1 - s0) / (L || 1));
    s0 += L;
    if (f1 <= f0) continue;
    const k = Math.max(1, Math.min(16, Math.ceil(Math.abs(b.y - a.y) * (f1 - f0) / 0.16)));   // short enough up a slope that a flat top never stands off it
    for (let q = 0; q < k; q++) {
      _sa.lerpVectors(a, b, f0 + (f1 - f0) * q / k); _sb.lerpVectors(a, b, f0 + (f1 - f0) * (q + 1) / k);
      segBoxes(_sa.x, _sa.y, _sa.z, _sb.x, _sb.y, _sb.z, r, out);
    }
  }
  return out;
}
/* a bough (a cylinder lying more along than up): along its own y */
function boughBoxes(g, bb, M, n) {
  const e = M.elements, s = Math.min(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[8], e[9], e[10]));
  // (a cylinder of few sides is narrower across its flats than at its corners: the circle inside the polygon; anything
  // else lying along (a stretched octahedron, a capsule): the circle inside a diamond of its width, to be safe)
  const p = g.parameters || {}, poly = Math.cos(Math.PI / Math.max(3, p.radialSegments || 32));
  const cylR = g.type === 'CylinderGeometry' ? t => ((p.radiusBottom ?? 1) + ((p.radiusTop ?? 1) - (p.radiusBottom ?? 1)) * t) * poly : null;
  const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, pts = [], rad = [];
  // (anything but a cylinder — a stretched octahedron, a hull, a capsule — narrows along its length its own way: how
  // far its surface comes in toward the axis, measured from its own points, near each step along it)
  const P = cylR ? null : surfacePoints(g), sx = Math.hypot(e[0], e[1], e[2]), sz = Math.hypot(e[8], e[9], e[10]), H = bb.max.y - bb.min.y;
  const near = t => {
    let r = Infinity; const y = bb.min.y + H * t, w = H / n * 0.75 + 1e-6;
    for (let i = 0; i < P.length; i += 3) if (Math.abs(P[i + 1] - y) <= w) r = Math.min(r, Math.hypot((P[i] - cx) * sx, (P[i + 2] - cz) * sz));
    return r === Infinity ? 0 : r * 0.95;
  };
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector3(cx, bb.min.y + H * t, cz).applyMatrix4(M));
    rad.push(cylR ? cylR(t) * s : near(t));
  }
  return tubeBoxes(pts, rad);
}
/* a ring (TorusGeometry) or a tube along a curve (TubeGeometry): along its centreline */
function ringBoxes(g, M) {
  const p = g.parameters, e = M.elements, s = Math.min(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
  const pts = [], rad = [], poly = Math.cos(Math.PI / Math.max(3, (g.userData.tube ? g.userData.tube.radial : p.radialSegments) || 8));
  if (g.userData.tube) {   // a tube that says where its centreline runs (esik_sea.js taperTube)
    const T = g.userData.tube, n = T.pts.length - 1;
    T.pts.forEach(([x, y, z], i) => { pts.push(new THREE.Vector3(x, y, z).applyMatrix4(M)); rad.push((T.r0 + (T.r1 - T.r0) * i / n) * s * poly); });
  } else if (g.type === 'TorusGeometry') {
    const r = p.tube * s * poly, arc = p.arc ?? Math.PI * 2, n = Math.max(6, Math.min(128, Math.ceil(arc * p.radius * s / Math.max(0.25, Math.min(1.2, r * 1.5)))));
    for (let i = 0; i <= n; i++) { const a = arc * i / n; pts.push(new THREE.Vector3(Math.cos(a) * p.radius, Math.sin(a) * p.radius, 0).applyMatrix4(M)); rad.push(r); }
  } else {
    const r = p.radius * s * poly, len = p.path.getLength() * s, n = Math.max(4, Math.min(96, Math.ceil(len / Math.max(0.25, Math.min(1.2, r * 1.5)))));
    for (let i = 0; i <= n; i++) { pts.push(p.path.getPointAt(i / n, new THREE.Vector3()).applyMatrix4(M)); rad.push(r); }
  }
  return tubeBoxes(pts, rad);
}
/* a box turned off the upright (a tilted slab, a leaning plank): tiles across its face, small enough that each one's
   top stands no more than a few centimetres off the slope */
function tiledBoxes(bb, M) {
  const e = M.elements, sx = Math.hypot(e[0], e[1], e[2]), sy = Math.hypot(e[4], e[5], e[6]), sz = Math.hypot(e[8], e[9], e[10]);
  const ay = Math.abs(e[5]) / sy, slope = Math.sqrt(Math.max(0, 1 - ay * ay)) / Math.max(ay, 0.05);
  // (and through its height, for a tall one leaning: the bounding box of a leaning board holds a wedge of air each side)
  const lean = Math.sqrt(Math.max(0, 1 - ay * ay));
  const tile = Math.max(0.15, Math.min(1, 0.06 / Math.max(slope, 0.01)));
  let nx = Math.max(1, Math.ceil((bb.max.x - bb.min.x) * sx / tile)), nz = Math.max(1, Math.ceil((bb.max.z - bb.min.z) * sz / tile)), ny = Math.max(1, Math.ceil((bb.max.y - bb.min.y) * sy * lean / 0.08));
  nx = Math.min(nx, 24); nz = Math.min(nz, 24); ny = Math.min(ny, 24);
  while (nx * ny * nz > 900) { if (nx >= ny && nx >= nz) nx--; else if (ny >= nz) ny--; else nz--; }
  const out = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) for (let k = 0; k < ny; k++) {
    const x0 = bb.min.x + (bb.max.x - bb.min.x) * i / nx, x1 = bb.min.x + (bb.max.x - bb.min.x) * (i + 1) / nx;
    const z0 = bb.min.z + (bb.max.z - bb.min.z) * j / nz, z1 = bb.min.z + (bb.max.z - bb.min.z) * (j + 1) / nz;
    const y0 = bb.min.y + (bb.max.y - bb.min.y) * k / ny, y1 = bb.min.y + (bb.max.y - bb.min.y) * (k + 1) / ny;
    out.push(worldBox({ x0, x1, y0, y1, z0, z1 }, M));
  }
  return out;
}
function cut(geo, cell) {
  return cached(geo, 'c' + Math.round(Math.log2(cell) * 2), () => cutNow(geo, cell));
}
function cutNow(geo, cell) {
  const cells = new Map();
  sample(geo, cell * 0.5, (x, y, z) => {
    const ix = Math.floor(x / cell), iy = Math.floor(y / cell), iz = Math.floor(z / cell), k = ix + ',' + iy + ',' + iz;
    let c = cells.get(k);
    if (!c) cells.set(k, c = { ix, iy, iz, x0: x, x1: x, y0: y, y1: y, z0: z, z1: z });
    else { if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y; if (z < c.z0) c.z0 = z; if (z > c.z1) c.z1 = z; }
  });
  // stack each column's cells into runs, then lay runs side by side along x where they match
  const cols = new Map();
  for (const c of cells.values()) { const k = c.ix + ',' + c.iz; if (!cols.has(k)) cols.set(k, []); cols.get(k).push(c); }
  const runs = [];
  for (const list of cols.values()) {
    list.sort((p, q) => p.iy - q.iy);
    let r = null;
    for (const c of list) {
      if (r && c.iy === r.iy1 + 1) { r.iy1 = c.iy; grow(r, c); }
      else { r = { ix: c.ix, iz: c.iz, iy0: c.iy, iy1: c.iy, x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1, z0: c.z0, z1: c.z1 }; runs.push(r); }
    }
  }
  runs.sort((p, q) => p.iz - q.iz || p.iy0 - q.iy0 || p.iy1 - q.iy1 || p.ix - q.ix);
  const boxes = [];
  let b = null;
  for (const r of runs) {
    if (b && r.iz === b.iz && r.iy0 === b.iy0 && r.iy1 === b.iy1 && r.ix === b.ix1 + 1 && Math.abs(r.y1 - b.y1) < cell * 0.3) { b.ix1 = r.ix; grow(b, r); }
    else { b = { ...r, ix1: r.ix }; boxes.push(b); }
  }
  if (boxes.length > MOST && cells.size > 8) return cut(geo, cell * 2);   // too fine for its size
  const pad = cell * 0.05;
  return boxes.map(q => ({ x0: q.x0 - pad, x1: q.x1 + pad, y0: q.y0, y1: q.y1, z0: q.z0 - pad, z1: q.z1 + pad }));
}
function grow(r, c) {
  if (c.x0 < r.x0) r.x0 = c.x0; if (c.x1 > r.x1) r.x1 = c.x1; if (c.y0 < r.y0) r.y0 = c.y0; if (c.y1 > r.y1) r.y1 = c.y1; if (c.z0 < r.z0) r.z0 = c.z0; if (c.z1 > r.z1) r.z1 = c.z1;
}

/* ---------------- a box in a shape's own space, out into the world as a turned box ---------------- */
const _v = new THREE.Vector3();
function worldBox(b, M) {
  const e = M.elements;
  // the turn: from whichever of the shape's own axes lies flattest
  const hx = Math.hypot(e[0], e[2]), hz = Math.hypot(e[8], e[10]);
  const ang = hx >= hz ? Math.atan2(-e[2], e[0]) : Math.atan2(e[8], e[10]);
  const c = Math.cos(ang), s = Math.sin(ang);
  let lx0 = Infinity, lx1 = -Infinity, lz0 = Infinity, lz1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? b.x1 : b.x0, i & 2 ? b.y1 : b.y0, i & 4 ? b.z1 : b.z0).applyMatrix4(M);
    const lx = _v.x * c - _v.z * s, lz = _v.x * s + _v.z * c;
    if (lx < lx0) lx0 = lx; if (lx > lx1) lx1 = lx; if (lz < lz0) lz0 = lz; if (lz > lz1) lz1 = lz;
    if (_v.y < y0) y0 = _v.y; if (_v.y > y1) y1 = _v.y;
  }
  const cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2;
  return { x: cx * c + cz * s, z: -cx * s + cz * c, hw: (lx1 - lx0) / 2, hd: (lz1 - lz0) / 2, ang, bot: y0, top: y1 };
}

/* ---------------- the watcher ----------------
   opts: { col: a Colliders to add to, heightAt(x, z), solidAt(x, y, z) → already solid (the region's own
           colliders, the land)?, reach(x, z) → somewhere you can go? (what's beyond it is never bumped into),
           focus() → where you are (what's nearest is made solid first) } */
export function createSolids(scene, opts) {
  const { col, heightAt } = opts;
  const covered = opts.solidAt || ((x, y, z) => y < heightAt(x, z));
  const seen = new WeakSet(), list = [];
  const M = new THREE.Matrix4(), IM = new THREE.Matrix4();
  let cursor = 0, rescanT = 0, clock = 0;

  const skipped = o => { for (let q = o; q; q = q.parent) if (q.userData.noSolid) return true; return false; };
  const forFolk = o => { for (let q = o; q; q = q.parent) if (q.userData.folkSolid) return true; return false; };
  const shown = o => { for (let q = o; q; q = q.parent) { if (!q.visible) return false; if (q === scene) return true; } return false; };
  const sameAs = (a, b) => { for (let i = 0; i < 16; i++) if (Math.abs(a[i] - b[i]) > 0.01) return false; return true; };

  function candidate(o) {
    if (!o.isMesh || o.isSkinnedMesh || !o.geometry || !o.geometry.attributes.position) return false;
    if (o.name === 'outline' || o.userData._proxy) return false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.every(ghostly)) return false;
    if (mats.some(m => m.side === THREE.BackSide) && mats.every(m => m.side === THREE.BackSide) && o.geometry.type === 'SphereGeometry') return false;   // a sky dome
    return true;
  }

  /* the turned boxes this mesh (or one copy of an instanced mesh) stands for, in the world */
  function boxesOf(o, inst) {
    // smooth.js's softened copy keeps the shape it was made from (but a .clone() turns that into plain JSON — the knocked-off hat)
    const g = o.userData.smFrom && o.userData.smFrom.isBufferGeometry ? o.userData.smFrom : o.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    M.copy(o.matrixWorld);
    if (inst != null) { o.getMatrixAt(inst, IM); M.multiply(IM); }
    const e = M.elements, scale = Math.max(1e-4, Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
    const bb = g.boundingBox;
    if (bb.isEmpty()) return [];
    if (skipped(o)) return [];   // (marked not solid since it was first seen: smooth.js finds the leaves and needles as it softens them)
    if ((Array.isArray(o.material) ? o.material : [o.material]).every(m => ghostly(m))) return [];   // (leaves are known for leaves only once smooth.js has been over them)
    const whole = worldBox({ x0: bb.min.x, x1: bb.max.x, y0: bb.min.y, y1: bb.max.y, z0: bb.min.z, z1: bb.max.z }, M);
    if (Math.max(whole.hw, whole.hd) * 2 > BIG) return [];                                        // land, sea, sky
    if (whole.top - whole.bot < FLAT && Math.min(whole.hw, whole.hd) * 2 > FLAT) return [];       // lying flat: a decal, water, a rug
    if (whole.bot > heightAt(whole.x, whole.z) + HIGH) return [];                                  // up in the sky
    if (opts.reach && !reachable(whole)) return [];                                                // out past where you can ever go
    // every box fits inside what's drawn: a plain shape is filled from the inside (by its own kind: a box exactly, a ring
    // or tube along its centreline, a bough along its length, anything else band by band); anything else is cut up,
    // in case it's a shell you go into or under (an arch, a room, a roof on posts)
    const size = Math.max(whole.hw * 2, whole.hd * 2, whole.top - whole.bot);
    // how thick it is across its own axis (a leaning bough is still only a bough), and how long along it
    const girth = Math.max((bb.max.x - bb.min.x) * Math.hypot(e[0], e[1], e[2]), (bb.max.z - bb.min.z) * Math.hypot(e[8], e[9], e[10]));
    const length = (bb.max.y - bb.min.y) * Math.hypot(e[4], e[5], e[6]);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    // too thin to be a shell you could go into: a trunk, a bough, a vine, a pipe, a pillar
    const plain = plainShape(g, girth < PLAIN || (length > girth * 2.5 && girth < 12)) && !mats.some(m => m.side === THREE.BackSide);
    // a bough (long, thin, lying more along than up): short boxes one after another along it, each turned the way it
    // runs, so you stand on the bark all the way along — one box round the whole of a sloping bough stood you on
    // air over its low end
    const ay = Math.abs(e[5]) / Math.max(1e-6, Math.hypot(e[4], e[5], e[6]));
    const bough = plain && length > girth * 2.5 && length > 1.2 && ay < 0.9;
    // (each length no longer than the bough is thick, and rising no more than a step: up a steep one, they're stairs)
    const seg = Math.max(0.5, Math.min(girth, 0.5 / Math.max(ay, 0.05)));
    // (never its bounding box, whose corners stood out past a round thing into thin air)
    const upright = g.type === 'BoxGeometry' && Math.abs(e[5]) / Math.max(1e-6, Math.hypot(e[4], e[5], e[6])) > 0.995;
    const ring = g.type === 'TorusGeometry' || (g.type === 'TubeGeometry' && g.parameters && g.parameters.path) || !!g.userData.tube;
    const box = g.type === 'BoxGeometry';
    const how = ring ? 'ring' : box && upright ? 'exact' : box ? 'tiles' : bough ? 'bough' : plain ? 'inside' : 'cut';   // (kept on each box: how it was fitted)
    const parts = ring ? ringBoxes(g, M)
      : box && upright ? [whole]
      : box ? tiledBoxes(bb, M)
      : bough ? boughBoxes(g, bb, M, Math.min(64, Math.ceil(length / seg)))
      : plain ? insideBoxes(o.geometry.attributes.position ? o.geometry : g, M)   // (the shape as drawn: smooth.js may have softened it, or swapped a plain rock for a lumpier one)
      : cut(g, Math.min(CELL_MAX, Math.max(CELL, size / 30)) / scale).map(b => worldBox(b, M));
    for (const w of parts) w.how = how;
    const out = [];
    for (const w of parts) {
      if (w.top - w.bot < 0.02) continue;
      const gy = heightAt(w.x, w.z);
      if (w.top < gy + LOW && Math.max(w.hw, w.hd) < 1.5) continue;     // small and low: stepped over
      if (w.top < gy - 0.05) continue;                                    // under the ground
      if (isCovered(w)) continue;
      out.push(w);
    }
    return out;
  }

  /* anywhere near it you could stand? (its middle and its corners, a little way out) */
  function reachable(w) {
    const c = Math.cos(w.ang), s = Math.sin(w.ang), hw = w.hw + 2, hd = w.hd + 2;
    if (opts.reach(w.x, w.z)) return true;
    for (const [fx, fz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) if (opts.reach(w.x + fx * hw * c + fz * hd * s, w.z - fx * hw * s + fz * hd * c)) return true;
    return false;
  }

  /* already solid? (try a few points through the box; mostly inside something already, or the land) */
  function isCovered(w) {
    const c = Math.cos(w.ang), s = Math.sin(w.ang);
    let hit = 0, n = 0;
    for (const fx of [-0.6, 0, 0.6]) for (const fz of [-0.6, 0, 0.6]) for (const fy of [0.2, 0.5, 0.85]) {
      const lx = fx * w.hw, lz = fz * w.hd, x = w.x + lx * c + lz * s, z = w.z - lx * s + lz * c, y = w.bot + (w.top - w.bot) * fy;
      n++; if (covered(x, y, z)) hit++;
    }
    return hit / n > 0.6;
  }

  /* making a thing solid can take a while (a field of a thousand rocks): it goes a copy at a time,
     a few milliseconds a frame, whatever is nearest first */
  function build(e, until) {
    const o = e.obj, n = o.isInstancedMesh ? o.count : 1;
    if (!e.handles) { e.handles = []; e.next = 0; }
    for (; e.next < n; e.next++) {
      if (performance.now() > until) return false;
      for (const w of boxesOf(o, o.isInstancedMesh ? e.next : null)) { const h = col.add(w.x, w.z, w.hw, w.hd, w.ang, w.bot, w.top); h.auto = !e.folk; h.fitted = true; h.how = w.how; e.handles.push(h); }
    }
    e.ready = true; e.off = false;
    return true;
  }
  function dropBoxes(e) { if (e.handles) for (const h of e.handles) col.remove(h); e.handles = null; e.ready = false; }
  // switching off without a full removal (cheap, for hiding and showing)
  function park(e, off) {
    if (!e.handles) return;
    for (const h of e.handles) {
      if (off) { if (h._bot == null) { h._bot = h.bot; h._top = h.top; h.bot = h.top = -1e6; } }
      else if (h._bot != null) { h.bot = h._bot; h.top = h._top; h._bot = h._top = null; }
    }
  }
  const stamp = e => { e.m = e.obj.matrixWorld.elements.slice(); e.v = e.obj.isInstancedMesh ? e.obj.instanceMatrix.version + ':' + e.obj.count : ''; };
  const changed = e => !sameAs(e.m, e.obj.matrixWorld.elements) || (e.obj.isInstancedMesh && e.v !== e.obj.instanceMatrix.version + ':' + e.obj.count);
  const inScene = o => { for (let q = o; q; q = q.parent) if (q === scene) return true; return false; };

  function look(now) {
    scene.updateMatrixWorld();
    const fresh = [];
    scene.traverse(o => {
      if (seen.has(o)) return;
      seen.add(o);
      if (!candidate(o) || skipped(o)) return;
      const e = { obj: o, handles: null, moves: 0, since: clock, off: false, ready: false, queued: false, folk: forFolk(o) };
      stamp(e);
      list.push(e); fresh.push(e);
    });
    if (now) for (const e of fresh) if (shown(e.obj)) build(e, Infinity);   // otherwise: once it has sat still a moment
  }

  function check(e) {
    const o = e.obj;
    if (e.gone) return;
    if (!inScene(o)) { if (e.handles) dropBoxes(e); e.since = clock; return; }   // taken away (for now)
    if (changed(e)) {
      e.moves++; if (e.handles) dropBoxes(e); e.since = clock; stamp(e);
      if (e.moves >= RESTLESS) e.gone = true;          // it moves: it sees to itself
      return;
    }
    const vis = shown(o);
    if (!e.ready) { if (vis && clock - e.since >= STILL && !e.queued) { e.queued = true; todo.push(e); } return; }
    if (vis === e.off) { park(e, !vis); e.off = !vis; }
  }

  const todo = [];
  const at = e => { const m = e.obj.matrixWorld.elements, f = opts.focus && opts.focus(); return f ? (m[12] - f.x) ** 2 + (m[14] - f.z) ** 2 : 0; };
  function work() {
    if (!todo.length) return;
    const until = performance.now() + BUDGET;
    todo.sort((p, q) => at(p) - at(q));
    while (todo.length && performance.now() < until) {
      const e = todo[0];
      if (e.gone || e.ready || !inScene(e.obj) || changed(e)) { todo.shift(); e.queued = false; continue; }
      if (build(e, until)) { todo.shift(); e.queued = false; }
    }
  }

  look(false);
  return {
    col,
    /* a room just furnished, a thing just put down: solid at once */
    scan() { look(true); },
    update(dt) {
      clock += dt; rescanT -= dt;
      if (rescanT <= 0) { rescanT = RESCAN; look(false); }
      const n = Math.min(list.length, PER_FRAME);
      for (let i = 0; i < n; i++) { cursor = (cursor + 1) % list.length; check(list[cursor]); }
      work();
      if (cursor === 0 && list.some(e => e.gone)) for (let i = list.length - 1; i >= 0; i--) if (list[i].gone && !list[i].queued) list.splice(i, 1);
    },
    /* everything made solid now, whatever it costs (for tests) */
    settle() { for (const e of list) if (!e.gone && !e.ready && inScene(e.obj) && shown(e.obj)) build(e, Infinity); },
    list,
    stats() { let boxes = 0, on = 0; for (const e of list) if (e.handles) { boxes += e.handles.length; on++; } return { things: list.length, solid: on, boxes, waiting: todo.filter(e => !e.ready && !e.gone).length }; },
  };
}

/* a point inside any of a Colliders' boxes? */
export function inColliders(col, x, y, z) {
  for (const o of col.near(x, z)) {
    if (y < o.bot || y > o.top) continue;
    const dx = x - o.x, dz = z - o.z, lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
    if (Math.abs(lx) <= o.hw && Math.abs(lz) <= o.hd) return true;
  }
  return false;
}
