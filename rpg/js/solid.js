/* ============================================================
   Everything you can see is something you can bump into.

   The regions place their colliders by hand (walls, posts, trunks,
   stairs), and that misses things: a barrel beside a stall, a heap
   of logs, a pot on a sill, a rock the scatter dropped, the bench a
   room was furnished with. This goes over a scene once it is built
   and makes every visible thing in it solid, using the same oriented
   boxes the regions already use (terrain.js Colliders):

   · a plain shape (a box, a post, a ball, a cone, a trunk, a bough)
     gets one box round it, turned the way the shape is turned, or, if
     it's big, a stack of them that narrows as the shape does;
   · anything else (merged furniture, a roof, an arch, a rail) is cut
     into cells from its own triangles (half a metre, coarser for big
     things), so a doorway or an arch stays open and only the parts
     that are there are solid;
   · what a region's own colliders (or the land) already cover is
     left alone, so nothing is solid twice, and so is anything out
     past where you can ever go.

   Not solid: the sky, water, anything see-through or glowing (mist,
   light, glass, holograms, sparks), grass, crops and reeds, flat
   things lying on the ground, and anything that moves — folk,
   beasts, boats, carts, pickups — which look after their own
   collisions. Anything marked noSolid(o) (and all under it) is left
   out too. Folk bump into all of it just as you do; they feel their
   way round (terrain.js stepAround) instead of walking through.

   It keeps watching: a thing that turns up later (a room furnished
   the first time you step in, a tent pitched) is made solid once it
   has sat still a moment; a thing that is hidden stops being solid
   until it is shown again; and a thing that starts moving stops
   being solid (and is never counted again if it keeps on moving).
   ============================================================ */
import * as THREE from 'three';

export const noSolid = o => { o.userData.noSolid = true; return o; };

const CELL = 0.5;            // metres: the finest a shape is cut into (bigger shapes, coarser: up to CELL_MAX)
const CELL_MAX = 2;
const FLAT = 0.08;           // thinner than this and level, it's a decal, a rug, a puddle
const LOW = 0.25;            // this little above the ground is stepped over anyway
const BIG = 400;             // bigger than this across is land, sea or sky
const PLAIN = 6;             // plain shapes up to this across are one box each
const SLABS = 8, SLAB = 1.2; // a bigger plain shape: a stack of boxes (this tall, at most this many), narrowing as the shape does
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
    case 'SphereGeometry': return small || (!(p.thetaLength < Math.PI * 0.9) && !(p.phiLength < Math.PI * 1.9));
    default: return false;
  }
}

/* see-through, glowing, or not drawn: not a thing you can bump into */
function ghostly(m) {
  if (!m || m.visible === false || m.colorWrite === false) return true;
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
/* a big plain shape as a stack of boxes up its own height, each as wide as the shape is there */
function slabs(geo, n) {
  return cached(geo, 's' + n, () => {
    const bb = geo.boundingBox, h = (bb.max.y - bb.min.y) / n || 1, out = [];
    sample(geo, Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) / 24, (x, y, z) => {
      const i = Math.min(n - 1, Math.max(0, Math.floor((y - bb.min.y) / h)));
      const q = out[i] || (out[i] = { x0: x, x1: x, y0: bb.min.y + i * h, y1: bb.min.y + (i + 1) * h, z0: z, z1: z });
      if (x < q.x0) q.x0 = x; if (x > q.x1) q.x1 = x; if (z < q.z0) q.z0 = z; if (z > q.z1) q.z1 = z;
    });
    return out.filter(Boolean);
  });
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
    const g = o.userData.smFrom || o.geometry;   // smooth.js's softened copy keeps the shape it was made from
    if (!g.boundingBox) g.computeBoundingBox();
    M.copy(o.matrixWorld);
    if (inst != null) { o.getMatrixAt(inst, IM); M.multiply(IM); }
    const e = M.elements, scale = Math.max(1e-4, Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
    const bb = g.boundingBox;
    if (bb.isEmpty()) return [];
    const whole = worldBox({ x0: bb.min.x, x1: bb.max.x, y0: bb.min.y, y1: bb.max.y, z0: bb.min.z, z1: bb.max.z }, M);
    if (Math.max(whole.hw, whole.hd) * 2 > BIG) return [];                                        // land, sea, sky
    if (whole.top - whole.bot < FLAT && Math.min(whole.hw, whole.hd) * 2 > FLAT) return [];       // lying flat: a decal, water, a rug
    if (whole.bot > heightAt(whole.x, whole.z) + HIGH) return [];                                  // up in the sky
    if (opts.reach && !reachable(whole)) return [];                                                // out past where you can ever go
    // a small plain shape is its own box, a big one a stack of them; anything else is cut up, in case it's
    // a shell you go into or under (an arch, a room, a roof on posts)
    const size = Math.max(whole.hw * 2, whole.hd * 2, whole.top - whole.bot);
    // how thick it is across its own axis (a leaning bough is still only a bough), and how long along it
    const girth = Math.max((bb.max.x - bb.min.x) * Math.hypot(e[0], e[1], e[2]), (bb.max.z - bb.min.z) * Math.hypot(e[8], e[9], e[10]));
    const length = (bb.max.y - bb.min.y) * Math.hypot(e[4], e[5], e[6]);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    // too thin to be a shell you could go into: a trunk, a bough, a vine, a pipe, a pillar
    const plain = plainShape(g, girth < PLAIN || (length > girth * 2.5 && girth < 12)) && !mats.some(m => m.side === THREE.BackSide);
    const parts = plain && size < PLAIN ? [whole]
      : plain ? slabs(g, Math.min(SLABS, Math.ceil((whole.top - whole.bot) / SLAB))).map(b => worldBox(b, M))
      : cut(g, Math.min(CELL_MAX, Math.max(CELL, size / 30)) / scale).map(b => worldBox(b, M));
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
      for (const w of boxesOf(o, o.isInstancedMesh ? e.next : null)) e.handles.push(col.add(w.x, w.z, w.hw, w.hd, w.ang, w.bot, w.top));
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
      const e = { obj: o, handles: null, moves: 0, since: clock, off: false, ready: false, queued: false };
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
