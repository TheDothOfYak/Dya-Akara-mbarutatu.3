/* ============================================================
   Smooth style — the soft, rounded, hand-animated-film look,
   without changing any design or colour:
   · every box gets rounded edges and every round primitive
     (sphere, cylinder, cone, capsule, torus, disc) enough segments
     to read as a smooth curve, not a polygon. Intentionally faceted
     shapes (prisms of 6 sides or fewer, crystals, rocks) are kept;
   · the cel bands of the toon light ramp get soft painted edges
     instead of hard steps, and a faint rim of light picks out every
     silhouette.
   Geometry is softened lazily, the first time a newly added object
   is drawn, and only when its vertices are still exactly what the
   constructor made (moved, at most): anything the game has reshaped
   by hand is left alone.
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ramp } from './gfx.js';

const ON = { value: 1 };
let installed = false, shapes = true;

/* ---------------- soft cel ramp ---------------- */
const HARD = new Uint8Array([70, 140, 205, 255]);
const SOFT = (() => {
  const W = 128, out = new Uint8Array(W), lv = [70, 140, 205, 255];
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < W; i++) {
    const x = (i + 0.5) / W;
    let v = lv[0];
    for (let k = 1; k < 4; k++) v += (lv[k] - lv[k - 1]) * ss(k / 4 - 0.055, k / 4 + 0.055, x);
    out[i] = Math.round(v);
  }
  return out;
})();
function setRamp(soft) {
  const R = ramp(), d = soft ? SOFT : HARD;
  R.image = { data: d, width: d.length, height: 1 };
  R.minFilter = R.magFilter = soft ? THREE.LinearFilter : THREE.NearestFilter;
  R.needsUpdate = true;
}

/* ---------------- shading ---------------- */
const FRAG_PARS = 'uniform float uSmOn;\n';
const FRAG_LIGHT = `
  if (uSmOn > 0.001) {
    float smRim = 1.0 - max(dot(normal, normalize(vViewPosition)), 0.0);
    outgoingLight += diffuseColor.rgb * smoothstep(0.58, 0.9, smRim) * 0.16 * uSmOn;
  }
  #include <opaque_fragment>`;
/* toon materials without a ramp use three's built-in two-tone step: soften its edge too */
const HARD_STEP = 'smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x )';
const SOFT_STEP = 'mix( smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ), smoothstep( 0.6, 0.8, coord.x ), uSmOn )';

/* ---------------- geometry ---------------- */
const TAU = Math.PI * 2;
const done = new WeakMap();          // original geometry → its smooth twin (or itself)
const cache = new Map();             // param key → shared smooth geometry

function roundedBox(w, h, d) {
  const r = Math.min(Math.min(w, h, d) * 0.14, 0.22), k = 3, n = 2 * k + 1;
  const g = new THREE.BoxGeometry(w, h, d, n, n, n);
  if (r <= 1e-5) return g;
  const half = [w / 2, h / 2, d / 2], size = [w, h, d];
  const pos = g.attributes.position, nor = g.attributes.normal, p = [0, 0, 0], inner = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    p[0] = pos.getX(i); p[1] = pos.getY(i); p[2] = pos.getZ(i);
    for (let a = 0; a < 3; a++) {
      // the uniform grid → k slices across each rounded edge, one flat span between
      const idx = Math.round((p[a] + half[a]) / size[a] * n);
      p[a] = idx <= k ? -half[a] + r * (idx / k) : half[a] - r + r * ((idx - k - 1) / k);
      inner[a] = Math.min(Math.max(p[a], -half[a] + r), half[a] - r);
    }
    const dx = p[0] - inner[0], dy = p[1] - inner[1], dz = p[2] - inner[2], L = Math.hypot(dx, dy, dz);
    if (L > 1e-7) {
      pos.setXYZ(i, inner[0] + dx / L * r, inner[1] + dy / L * r, inner[2] + dz / L * r);
      nor.setXYZ(i, dx / L, dy / L, dz / L);
    } else pos.setXYZ(i, p[0], p[1], p[2]);
  }
  return g;
}

/* what each kind becomes; null = leave it */
const RULES = {
  BoxGeometry: q => ['box', [q.width, q.height, q.depth], () => roundedBox(q.width, q.height, q.depth)],
  SphereGeometry: q => q.widthSegments < 5 || (q.widthSegments >= 28 && q.heightSegments >= 18) ? null
    : [null, null, () => new THREE.SphereGeometry(q.radius, Math.max(q.widthSegments, 28), Math.max(q.heightSegments, 18), q.phiStart, q.phiLength, q.thetaStart, q.thetaLength)],
  CylinderGeometry: q => q.radialSegments < 7 || q.radialSegments >= 28 ? null
    : [null, null, () => new THREE.CylinderGeometry(q.radiusTop, q.radiusBottom, q.height, 28, q.heightSegments, q.openEnded, q.thetaStart, q.thetaLength)],
  ConeGeometry: q => q.radialSegments < 7 || q.radialSegments >= 28 ? null
    : [null, null, () => new THREE.ConeGeometry(q.radius, q.height, 28, q.heightSegments, q.openEnded, q.thetaStart, q.thetaLength)],
  CapsuleGeometry: q => q.radialSegments < 6 || (q.radialSegments >= 20 && q.capSegments >= 6) ? null
    : [null, null, () => new THREE.CapsuleGeometry(q.radius, q.length, Math.max(q.capSegments, 6), Math.max(q.radialSegments, 20))],
  TorusGeometry: q => {
    const tub = q.tubularSegments < 8 ? q.tubularSegments : Math.max(q.tubularSegments, Math.round(44 * q.arc / TAU) + 6), rad = Math.max(q.radialSegments, 10);
    return tub === q.tubularSegments && rad === q.radialSegments ? null : [null, null, () => new THREE.TorusGeometry(q.radius, q.tube, rad, tub, q.arc)];
  },
  CircleGeometry: q => q.segments < 8 || q.segments >= 40 ? null
    : [null, null, () => new THREE.CircleGeometry(q.radius, 40, q.thetaStart, q.thetaLength)],
};
const CTORS = { BoxGeometry: THREE.BoxGeometry, SphereGeometry: THREE.SphereGeometry, CylinderGeometry: THREE.CylinderGeometry, ConeGeometry: THREE.ConeGeometry, CapsuleGeometry: THREE.CapsuleGeometry, TorusGeometry: THREE.TorusGeometry, CircleGeometry: THREE.CircleGeometry };

/* has anything moved the vertices since the constructor? returns the offset if only translated, else null */
function untouchedOffset(geo) {
  const q = geo.parameters, ref = new CTORS[geo.type](...Object.values(q));
  const a = geo.attributes.position, b = ref.attributes.position;
  if (!a || a.count !== b.count || a.itemSize !== 3 || geo.morphAttributes.position) return null;
  const ox = a.getX(0) - b.getX(0), oy = a.getY(0) - b.getY(0), oz = a.getZ(0) - b.getZ(0);
  for (let i = 1; i < a.count; i++) {
    if (Math.abs(a.getX(i) - b.getX(i) - ox) > 1e-4 || Math.abs(a.getY(i) - b.getY(i) - oy) > 1e-4 || Math.abs(a.getZ(i) - b.getZ(i) - oz) > 1e-4) return null;
  }
  return [ox, oy, oz];
}

function smoothGeometry(geo) {
  if (done.has(geo)) return done.get(geo);
  let out = geo;
  const rule = RULES[geo.type];
  const plan = rule && geo.parameters && rule(geo.parameters);
  if (plan && !geo.userData.keepFacets && !geo.attributes.color && !geo.attributes.uv1) {
    const off = untouchedOffset(geo);
    if (off) {
      const key = geo.type + ':' + JSON.stringify(geo.parameters);
      let base = cache.get(key);
      if (!base) { base = plan[2](); cache.set(key, base); }
      if (off[0] || off[1] || off[2]) { out = base.clone(); out.translate(off[0], off[1], off[2]); }
      else out = base;
    }
  }
  done.set(geo, out);
  return out;
}

const pending = [];
function flush() {
  if (!pending.length) return;
  const list = pending.splice(0);
  for (const root of list) root.traverse(o => {
    if ((o.isMesh || o.isInstancedMesh) && !o.isSkinnedMesh && o.geometry && !o.userData.keepFacets) {
      const g = smoothGeometry(o.geometry);
      if (g !== o.geometry) o.geometry = g;
    }
  });
}

/* install once, before the first frame. `on` switches the shading live;
   the shapes follow the setting the page was loaded with. */
export function installSmoothStyle(on = true) {
  ON.value = on ? 1 : 0; shapes = on;
  setRamp(on);
  if (installed) return;
  installed = true;
  THREE.MeshToonMaterial.prototype.onBeforeCompile = function (sh) {
    sh.uniforms.uSmOn = ON;
    sh.fragmentShader = FRAG_PARS + sh.fragmentShader
      .replace('#include <gradientmap_pars_fragment>', THREE.ShaderChunk.gradientmap_pars_fragment.replace(HARD_STEP, SOFT_STEP))
      .replace('#include <opaque_fragment>', FRAG_LIGHT);
  };
  if (!shapes) return;
  const add = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function (...objs) {
    for (const o of objs) if (o && !o._smQueued) { o._smQueued = true; pending.push(o); }
    return add.apply(this, objs);
  };
  const render = EffectComposer.prototype.render;
  EffectComposer.prototype.render = function (dt) { flush(); return render.call(this, dt); };
}

export function setSmoothStyle(on) { ON.value = on ? 1 : 0; setRamp(on); }
