/* ============================================================
   Detail culling — the crowds, carts and gardens are built from
   thousands of little parts (eyes, knuckles, buttons, glow dots)
   and an ink-outline shell on most of them. Up close every one
   matters; a few dozen metres off they are smaller than a pixel,
   but each still costs the GPU a draw call. This parks any part
   that has shrunk below about a pixel on a layer the camera does
   not draw, and any outline thinner than a quarter of a pixel,
   and brings them back the moment they would show again.
   The game's own .visible flags are never touched.
   A slice of the parts is checked each frame, so it costs almost
   nothing; the scene is re-read every couple of seconds for parts
   that have come and gone.
   ============================================================ */
import * as THREE from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

const DRAWN = 1, PARKED = 2;   // layer masks: layer 0 is what cameras draw, layer 1 is never drawn
const MAX_R = 1.2;             // parts bigger than this (metres) are never parked: they matter for minutes of distance
const PER_FRAME = 2500;        // parts checked each frame
const RESCAN_MS = 2500;
const TINY_SHADOW = 0.06;      // parts smaller than this (metres) cast no shadow
const PART_PX = 0.5, GLOW_PX = 0.25, LINE_PX = 0.25;   // radius / line width, in pixels, below which a thing is parked

const states = new WeakMap();
let scanId = 0;

function scan(st, scene) {
  const id = ++scanId, list = [];
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.frustumCulled || !o.geometry) return;
    if (o.layers.mask !== DRAWN && o.layers.mask !== PARKED) return;   // someone else's layers: leave them be
    const line = o.name === 'outline';
    if (!line) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const r = o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
      if (r > MAX_R) return;
      // a part only a few centimetres across throws a shadow smaller than one texel of the sun's shadow map,
      // but it is still drawn into it: let the body it is part of cast the shadow
      if (r > 0 && r < TINY_SHADOW && o.castShadow) o.castShadow = false;
    }
    o.userData._dc = id;
    list.push(o);
  });
  // anything parked that has since left the scene goes back to normal, in case it is added again
  for (const o of st.list) if (o.userData._dc !== id && o.layers.mask === PARKED) o.layers.mask = DRAWN;
  st.list = list; st.i = 0; st.at = performance.now();
}

function check(o, cx, cy, cz, k) {
  const e = o.matrixWorld.elements;
  const s = Math.sqrt(Math.max(e[0] * e[0] + e[1] * e[1] + e[2] * e[2], e[4] * e[4] + e[5] * e[5] + e[6] * e[6], e[8] * e[8] + e[9] * e[9] + e[10] * e[10]));
  const g = o.geometry, bs = g.boundingSphere || (g.computeBoundingSphere(), g.boundingSphere);
  const dx = e[12] - cx, dy = e[13] - cy, dz = e[14] - cz;
  const d = Math.max(0.05, Math.sqrt(dx * dx + dy * dy + dz * dz) - bs.radius * s);
  let px, limit;
  if (o.name === 'outline') {
    if (o.parent && o.parent.layers.mask === PARKED) { o.layers.mask = PARKED; return; }
    const u = o.material.uniforms, thick = u && u.uThick ? u.uThick.value : 0.04;
    px = thick * s * k / d; limit = LINE_PX;
  } else {
    px = bs.radius * s * k / d; limit = o.material && o.material.isMeshBasicMaterial ? GLOW_PX : PART_PX;
  }
  const parked = o.layers.mask === PARKED;
  o.layers.mask = px < (parked ? limit * 1.2 : limit) ? PARKED : DRAWN;   // a little hysteresis, so nothing flickers on the line
}

function cull(scene, camera, renderer) {
  if (!scene || !camera || !camera.isPerspectiveCamera) return;
  let st = states.get(scene);
  if (!st) { st = { list: [], i: 0, at: -1e9 }; states.set(scene, st); }
  if (performance.now() - st.at > RESCAN_MS) scan(st, scene);
  const list = st.list, n = list.length;
  if (!n) return;
  const k = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / (camera.zoom || 1));
  const c = camera.matrixWorld.elements, cx = c[12], cy = c[13], cz = c[14];
  for (let j = 0, m = Math.min(n, PER_FRAME); j < m; j++) {
    if (st.i >= n) st.i = 0;
    check(list[st.i++], cx, cy, cz, k);
  }
}

let installed = false;
export function installDetailCull() {
  if (installed) return;
  installed = true;
  const render = RenderPass.prototype.render;
  RenderPass.prototype.render = function (renderer, ...rest) {
    cull(this.scene, this.camera, renderer);
    return render.call(this, renderer, ...rest);
  };
}
