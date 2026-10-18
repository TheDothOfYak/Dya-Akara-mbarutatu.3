/* ============================================================
   Detail by screen size — the crowds, carts and gardens are built
   from thousands of little parts (eyes, knuckles, buttons, glow
   dots), most with an ink-outline shell, and every round one is
   cut finely enough for a close-up. None of that changes how the
   picture looks; it only decides what the GPU is asked to draw:
   · a part far enough off to be well under a pixel, or an outline
     far thinner than one, is parked on a layer no camera draws;
   · a round part only a few pixels across is drawn from a lighter
     cut of the same shape (at that size the two differ by less than
     a quarter of a pixel), and gets its full cut back as it nears.
   · a big instanced field (a forest of pines, a sky of glow-orbs) is
     drawn through two stand-ins, near copies at full cut and far
     ones in the lighter cut, re-sorted as the camera moves; the
     game's own instanced mesh and its numbering are left as they are.
   The game's own .visible flags are never touched. All parts are
   re-measured a slice per frame; anything parked or lightened is
   re-measured every frame, so a camera cut or a teleport always
   finds the full detail ready on its first frame.
   ============================================================ */
import * as THREE from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { lowTwin } from './smooth.js';

const DRAWN = 1, PARKED = 2;   // layer masks: layer 0 is what cameras draw, layer 1 is never drawn
const MAX_R = 1.2;             // bigger parts (metres) are left alone: they stay above a pixel for kilometres
const PER_FRAME = 2500;        // parts re-measured each frame
const RESCAN_MS = 2500;
// in pixels on screen: a part's radius, a glow's radius, an outline's width below which it is parked;
// and the radius below which a round part takes its lighter cut
const PART_PX = 0.15, GLOW_PX = 0.08, LINE_PX = 0.08, LOW_PX = 4;
const BACK = 1.25;
const FIELD_MIN = 200;         // instanced meshes with at least this many copies are split near/far
const FIELD_MOVE = 1.5;        // metres the camera moves before a field is re-sorted
const CUT = 8;                 // a camera jump this far in one frame is a cut: everything is re-measured at once             // hysteresis: a part comes back a little before it would have gone

const states = new WeakMap();
let scanId = 0;

function setGeometry(o, from, to) {
  o.geometry = to;
  for (const c of o.children) if (c.name === 'outline' && c.geometry === from) c.geometry = to;
}
/* full detail again, if the game hasn't since given it a geometry of its own */
function restore(o) {
  const u = o.userData;
  if (u._hi) { if (o.geometry === u._lo) setGeometry(o, u._lo, u._hi); u._hi = u._lo = null; }
  if (o.layers.mask === PARKED) o.layers.mask = DRAWN;
  u._dcR = false;
}

function scan(st, scene) {
  const id = ++scanId, list = [];
  const fields = [];
  scene.traverse(o => {
    if (o.isInstancedMesh && !o.userData._proxy && o.instanceMatrix.count >= FIELD_MIN && !Array.isArray(o.material) && lowTwin(o.geometry)
        && !Object.values(o.geometry.attributes).some(a => a.isInstancedBufferAttribute) && !o.morphTexture) { o.userData._dc = id; fields.push(o); return; }
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.frustumCulled || !o.geometry) return;
    if (o.layers.mask !== DRAWN && o.layers.mask !== PARKED) return;   // someone else's layers: leave them be
    if (o.name !== 'outline') {
      const g = o.userData._hi || o.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      if (g.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() > MAX_R) return;
    }
    o.userData._dc = id;
    list.push(o);
  });
  // anything reduced that has since left the scene goes back to full, in case it is added again
  for (const o of st.reduced) if (o.userData._dc !== id) restore(o);
  st.reduced = st.reduced.filter(o => o.userData._dc === id);
  for (const f of st.fields) if (f.userData._dc !== id) unsplit(f);
  st.fields = fields; st.fi = 0;
  st.list = list; st.i = 0; st.at = performance.now();
}

/* ---------------- instanced fields: near copies at full cut, far ones in the lighter cut ---------------- */
function standIn(src, geo) {
  const m = new THREE.InstancedMesh(geo, src.material, src.instanceMatrix.count);
  m.userData._proxy = true; m.userData.keepFacets = true;   // its shape is already decided: don't let smooth.js touch it
  m.castShadow = src.castShadow; m.receiveShadow = src.receiveShadow; m.renderOrder = src.renderOrder;
  m.frustumCulled = src.frustumCulled; m.name = src.name;
  if (src.instanceColor) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(src.instanceColor.array.length), 3);
  src.add(m);   // a child with no transform of its own: it sits exactly where the field does, and shares its visibility
  return m;
}
function unsplit(f) {
  const L = f.userData._lod;
  if (!L) return;
  f.remove(L.near, L.far); L.near.dispose(); L.far.dispose();
  f.userData._lod = null;
  if (f.layers.mask === PARKED) f.layers.mask = DRAWN;
}
const _m = new THREE.Matrix4(), _w = new THREE.Matrix4();
/* sort a field's copies into near and far for where the camera is now */
function split(f, cx, cy, cz, k) {
  let L = f.userData._lod;
  const cap = f.instanceMatrix.count;
  if (L && L.cap !== cap) { unsplit(f); L = null; }
  if (!L) {
    const lo = lowTwin(f.geometry);
    if (!lo) { f.userData._busy = true; return; }
    L = f.userData._lod = { cap, hi: f.geometry, near: standIn(f, f.geometry), far: standIn(f, lo), farAt: new Uint8Array(cap) };
    f.layers.mask = PARKED;   // from now on the stand-ins draw it
  }
  if (f.geometry !== L.hi || f.material !== L.near.material) { unsplit(f); return; }   // the game has re-shaped it: hand it back
  const g = L.hi, bs = g.boundingSphere || (g.computeBoundingSphere(), g.boundingSphere);
  const src = f.instanceMatrix.array, col = f.instanceColor && f.instanceColor.array;
  const nA = L.near.instanceMatrix.array, fA = L.far.instanceMatrix.array;
  const nC = L.near.instanceColor && L.near.instanceColor.array, fC = L.far.instanceColor && L.far.instanceColor.array;
  const W = f.matrixWorld.elements, ws = Math.sqrt(Math.max(W[0] * W[0] + W[1] * W[1] + W[2] * W[2], W[4] * W[4] + W[5] * W[5] + W[6] * W[6], W[8] * W[8] + W[9] * W[9] + W[10] * W[10]));
  let n = 0, m = 0;
  for (let i = 0, c = f.count; i < c; i++) {
    const o = i * 16;
    const x = src[o + 12], y = src[o + 13], z = src[o + 14];
    const px0 = W[0] * x + W[4] * y + W[8] * z + W[12], py0 = W[1] * x + W[5] * y + W[9] * z + W[13], pz0 = W[2] * x + W[6] * y + W[10] * z + W[14];
    const s = ws * Math.sqrt(Math.max(src[o] * src[o] + src[o + 1] * src[o + 1] + src[o + 2] * src[o + 2], src[o + 4] * src[o + 4] + src[o + 5] * src[o + 5] + src[o + 6] * src[o + 6], src[o + 8] * src[o + 8] + src[o + 9] * src[o + 9] + src[o + 10] * src[o + 10]));
    const dx = px0 - cx, dy = py0 - cy, dz = pz0 - cz;
    const d = Math.max(0.05, Math.sqrt(dx * dx + dy * dy + dz * dz) - bs.radius * s);
    const px = bs.radius * s * k / d, wasFar = L.farAt[i];
    const far = px < (wasFar ? LOW_PX * BACK : LOW_PX);
    L.farAt[i] = far ? 1 : 0;
    if (far) { fA.set(src.subarray(o, o + 16), m * 16); if (col) fC.set(col.subarray(i * 3, i * 3 + 3), m * 3); m++; }
    else { nA.set(src.subarray(o, o + 16), n * 16); if (col) nC.set(col.subarray(i * 3, i * 3 + 3), n * 3); n++; }
  }
  L.near.count = n; L.far.count = m;
  L.near.castShadow = L.far.castShadow = f.castShadow; L.near.receiveShadow = L.far.receiveShadow = f.receiveShadow;
  L.near.instanceMatrix.needsUpdate = L.far.instanceMatrix.needsUpdate = true;
  if (col) L.near.instanceColor.needsUpdate = L.far.instanceColor.needsUpdate = true;
  if (f.frustumCulled) { L.near.computeBoundingSphere(); L.far.computeBoundingSphere(); }
  L.ver = f.instanceMatrix.version; L.cver = f.instanceColor ? f.instanceColor.version : 0; L.count = f.count;
  L.cx = cx; L.cy = cy; L.cz = cz;
}
/* re-sort a field when the game has moved its copies, or the camera has gone far enough to change the picture */
function fieldDue(f, cx, cy, cz) {
  const L = f.userData._lod;
  if (!L) return true;
  if (L.ver !== f.instanceMatrix.version || L.count !== f.count || (f.instanceColor && L.cver !== f.instanceColor.version)) return 'game';
  const dx = cx - L.cx, dy = cy - L.cy, dz = cz - L.cz;
  return dx * dx + dy * dy + dz * dz > FIELD_MOVE * FIELD_MOVE;
}

/* measure one part; returns true while it is parked or lightened */
function check(o, cx, cy, cz, k) {
  const u = o.userData, e = o.matrixWorld.elements;
  const s = Math.sqrt(Math.max(e[0] * e[0] + e[1] * e[1] + e[2] * e[2], e[4] * e[4] + e[5] * e[5] + e[6] * e[6], e[8] * e[8] + e[9] * e[9] + e[10] * e[10]));
  const g = u._hi || o.geometry, bs = g.boundingSphere || (g.computeBoundingSphere(), g.boundingSphere);
  const dx = e[12] - cx, dy = e[13] - cy, dz = e[14] - cz;
  const d = Math.max(0.05, Math.sqrt(dx * dx + dy * dy + dz * dz) - bs.radius * s);
  if (o.name === 'outline') {
    const p = o.parent;
    if (p && p.layers.mask === PARKED) { o.layers.mask = PARKED; return true; }
    const un = o.material.uniforms, thick = un && un.uThick ? un.uThick.value : 0.04;
    const px = thick * s * k / d;
    o.layers.mask = px < (o.layers.mask === PARKED ? LINE_PX * BACK : LINE_PX) ? PARKED : DRAWN;
    return o.layers.mask === PARKED;
  }
  const px = bs.radius * s * k / d;
  const limit = o.material && o.material.isMeshBasicMaterial ? GLOW_PX : PART_PX, parked = o.layers.mask === PARKED;
  o.layers.mask = px < (parked ? limit * BACK : limit) ? PARKED : DRAWN;
  // back in view: its outline comes back in the same frame, not whenever its own turn comes
  if (parked && o.layers.mask === DRAWN) for (const ch of o.children) if (ch.name === 'outline' && ch.layers.mask === PARKED) check(ch, cx, cy, cz, k);
  // the lighter cut, for round parts a few pixels across
  const wantLow = px < (u._hi ? LOW_PX * BACK : LOW_PX);
  if (wantLow && !u._hi) {
    const lo = lowTwin(o.geometry);
    if (lo) { u._hi = o.geometry; u._lo = lo; setGeometry(o, u._hi, lo); }
  } else if (!wantLow && u._hi) {
    if (o.geometry === u._lo) setGeometry(o, u._lo, u._hi);
    u._hi = u._lo = null;
  }
  return o.layers.mask === PARKED || !!u._hi;
}

function cull(scene, camera, renderer) {
  if (!enabled || !scene || !camera || !camera.isPerspectiveCamera) return;
  let st = states.get(scene);
  if (!st) { st = { list: [], reduced: [], fields: [], fi: 0, i: 0, at: -1e9, cx: 0, cy: 0, cz: 0 }; states.set(scene, st); seen.add(scene); }
  if (performance.now() - st.at > RESCAN_MS) scan(st, scene);
  const list = st.list, n = list.length;
  const k = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / (camera.zoom || 1));
  const c = camera.matrixWorld.elements, cx = c[12], cy = c[13], cz = c[14];
  // instanced fields: any the game changed this frame, or all of them after a camera cut, are re-sorted now,
  // so no copy is ever drawn from stale data; as the camera travels they are re-sorted one a frame
  const cut = (cx - st.cx) ** 2 + (cy - st.cy) ** 2 + (cz - st.cz) ** 2 > CUT * CUT;
  st.cx = cx; st.cy = cy; st.cz = cz;
  const F = st.fields, rr = F.length ? F[st.fi = (st.fi + 1) % F.length] : null;
  for (const f of F) {
    if (!f.parent || f.userData._busy) continue;
    const due = fieldDue(f, cx, cy, cz);
    if (due === 'game') {
      // a field the game moves every frame (a flock, a sway) is handed back: sorting it each frame would cost more than it saves
      if ((f.userData._chg = (f.userData._chg || 0) + 1) > 4) { unsplit(f); f.userData._busy = true; continue; }
      split(f, cx, cy, cz, k);
    } else {
      f.userData._chg = 0;
      if (due && (cut || f === rr || !f.userData._lod)) split(f, cx, cy, cz, k);
    }
  }
  if (!n) return;
  // everything reduced is re-measured every frame, so it is back to full the moment it would show
  let w = 0;
  for (let j = 0; j < st.reduced.length; j++) {
    const o = st.reduced[j];
    if (check(o, cx, cy, cz, k)) st.reduced[w++] = o; else o.userData._dcR = false;
  }
  st.reduced.length = w;
  // and a slice of the rest, to find what has shrunk
  for (let j = 0, m = Math.min(n, PER_FRAME); j < m; j++) {
    if (st.i >= n) st.i = 0;
    const o = list[st.i++];
    if (o.userData._dcR) continue;
    if (check(o, cx, cy, cz, k)) { o.userData._dcR = true; st.reduced.push(o); }
  }
}

/* a switch for the console (window.__torcain.detailCull): off puts everything back to full detail */
let enabled = true;
export function setDetailCull(on) {
  enabled = !!on;
  if (!enabled) for (const sc of seen) { const st = states.get(sc); if (st) { for (const o of st.reduced) restore(o); st.reduced.length = 0; for (const f of st.fields) unsplit(f); st.at = -1e9; } }
}
const seen = new Set();

let installed = false;
export function installDetailCull() {
  if (installed) return;
  installed = true;
  const render = RenderPass.prototype.render;
  RenderPass.prototype.render = function (renderer, ...rest) {
    const scene = this.scene, camera = this.camera;
    if (!scene || !camera || !scene.matrixWorldAutoUpdate) return render.call(this, renderer, ...rest);
    // measure against where everything is this frame (a camera cut, a teleport), then let the
    // renderer skip the update it would otherwise repeat
    scene.updateMatrixWorld();
    if (camera.parent === null && camera.matrixWorldAutoUpdate) camera.updateMatrixWorld();
    cull(scene, camera, renderer);
    scene.matrixWorldAutoUpdate = false;
    try { return render.call(this, renderer, ...rest); } finally { scene.matrixWorldAutoUpdate = true; }
  };
}
