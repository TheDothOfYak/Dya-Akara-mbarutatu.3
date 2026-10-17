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
import { ramp, STYLE } from './gfx.js';

const ON = STYLE.on;
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

/* a box, sculpted the way a hand-painted film builds things: rounded edges, faces that swell
   gently like plaster or packed earth, and (for anything building-sized) walls that lean in a
   touch toward the top. Normals are worked out analytically so the bands stay smooth. */
function organicBox(w, h, d) {
  const size = [w, h, d], half = [w / 2, h / 2, d / 2], mn = Math.min(w, h, d);
  const r = Math.min(mn * 0.2, 0.55), k = 3, m = mn > 0.5 ? 4 : 1, n = 2 * k + m;
  const g = new THREE.BoxGeometry(w, h, d, n, n, n);
  if (r <= 1e-5) return g;
  const bulge = mn > 0.5 ? mn * 0.035 : 0, taper = h > 1.8 && Math.min(w, d) > 1 ? 0.035 : 0;
  const pos = g.attributes.position, nor = g.attributes.normal, p = [0, 0, 0], inner = [0, 0, 0], N = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    p[0] = pos.getX(i); p[1] = pos.getY(i); p[2] = pos.getZ(i);
    for (let a = 0; a < 3; a++) {
      // the uniform grid → k slices round each edge, m across the flat of the face
      const idx = Math.round((p[a] + half[a]) / size[a] * n);
      p[a] = idx <= k ? -half[a] + r * (idx / k)
        : idx >= k + m ? half[a] - r + r * ((idx - k - m) / k)
        : -half[a] + r + (idx - k) / m * (size[a] - 2 * r);
      inner[a] = Math.min(Math.max(p[a], -half[a] + r), half[a] - r);
    }
    const dx = p[0] - inner[0], dy = p[1] - inner[1], dz = p[2] - inner[2], L = Math.hypot(dx, dy, dz) || 1;
    N[0] = dx / L; N[1] = dy / L; N[2] = dz / L;
    for (let a = 0; a < 3; a++) p[a] = inner[a] + N[a] * r;
    // the swell: strongest mid-face, fading to nothing (flat and level) by the rounded edge
    if (bulge) for (let a = 0; a < 3; a++) {
      const w2 = Math.abs(N[a]); if (w2 < 1e-3) continue;
      const b = (a + 1) % 3, c = (a + 2) % 3;
      const U = half[b] - r, V = half[c] - r;
      const u = U > 1e-4 ? inner[b] / U : 0, v = V > 1e-4 ? inner[c] / V : 0;
      const fu = (1 - u * u) ** 2, fv = (1 - v * v) ** 2, s = Math.sign(N[a]) * w2;
      p[a] += s * bulge * fu * fv;
      if (U > 1e-4) N[b] -= s * bulge * (-4 * u * (1 - u * u) / U) * fv;
      if (V > 1e-4) N[c] -= s * bulge * (-4 * v * (1 - v * v) / V) * fu;
    }
    if (taper) { const f = 1 - taper * (p[1] + half[1]) / h; p[0] *= f; p[2] *= f; N[1] += taper * 0.5 * (Math.abs(N[0]) + Math.abs(N[2])); }
    const nl = Math.hypot(N[0], N[1], N[2]) || 1;
    pos.setXYZ(i, p[0], p[1], p[2]); nor.setXYZ(i, N[0] / nl, N[1] / nl, N[2] / nl);
  }
  return g;
}

/* a roof or spire: the straight cone swept into a concave curve that flares out at the eaves.
   A 4-sided roof stays 4-sided (it still fits its square house), just curved. */
function sweptCone(q) {
  const radial = q.radialSegments <= 6 ? q.radialSegments : 28;
  const g = new THREE.ConeGeometry(q.radius, q.height, radial, 10, q.openEnded, q.thetaStart, q.thetaLength);
  const pos = g.attributes.position, H = q.height;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) + H / 2) / H));
    const e = Math.min(1, t / 0.14), flare = 1 + 0.12 * (1 - e * e * (3 - 2 * e));
    const f = t < 1 ? Math.pow(1 - t, 0.75) * flare : 1;   // radius (1-t)^1.75: a concave sweep up to the point
    pos.setX(i, pos.getX(i) * f); pos.setZ(i, pos.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g;
}

/* what each kind becomes; null = leave it */
const RULES = {
  BoxGeometry: q => ['box', [q.width, q.height, q.depth], () => organicBox(q.width, q.height, q.depth)],
  SphereGeometry: q => q.widthSegments < 5 || (q.widthSegments >= 28 && q.heightSegments >= 18) ? null
    : [null, null, () => new THREE.SphereGeometry(q.radius, Math.max(q.widthSegments, 28), Math.max(q.heightSegments, 18), q.phiStart, q.phiLength, q.thetaStart, q.thetaLength)],
  CylinderGeometry: q => q.radialSegments < 7 || q.radialSegments >= 28 ? null
    : [null, null, () => new THREE.CylinderGeometry(q.radiusTop, q.radiusBottom, q.height, 28, q.heightSegments, q.openEnded, q.thetaStart, q.thetaLength)],
  ConeGeometry: q => q.radius >= 0.9 && q.height >= 0.9 && q.radialSegments >= 4 ? [null, null, () => sweptCone(q)]   // roofs, spires, pines
    : q.radialSegments < 7 || q.radialSegments >= 28 ? null
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
/* leafy puffs (crowns, bushes, clumps) become soft cumulus clusters of rounded lobes — the
   painted cauliflower foliage of a hand-drawn film. The light wraps round the whole cluster, not
   each lobe, so it reads as one soft mass. Very large instanced fields (thousands) keep their
   single shape and only get the soft light, to stay quick. */
const LOBES = [[0, 0.12, 0, 0.78], [0.5, -0.05, 0.22, 0.58], [-0.42, -0.02, 0.32, 0.56], [0.1, -0.08, -0.52, 0.6], [-0.3, 0.38, -0.2, 0.5], [0.34, 0.42, -0.06, 0.46], [-0.08, -0.32, 0.05, 0.6]];
function softPuff(radius, detail, cluster) {
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  if (!cluster) {
    const g = new THREE.IcosahedronGeometry(radius, detail), p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
    return g;
  }
  const lobes = cluster === 'lo' ? LOBES.slice(0, 4) : LOBES, unit = new THREE.IcosahedronGeometry(1, cluster === 'lo' ? 1 : 2);
  const up = unit.attributes.position, per = up.count;
  const P = new Float32Array(per * 3 * lobes.length), Nn = new Float32Array(per * 3 * lobes.length);
  lobes.forEach(([x, y, z, r], L) => {
    c.set(x, y, z);
    for (let i = 0; i < per; i++) {
      v.fromBufferAttribute(up, i);
      const px = (x + v.x * r) * radius, py = (y + v.y * r) * radius, pz = (z + v.z * r) * radius, o = (L * per + i) * 3;
      P[o] = px; P[o + 1] = py; P[o + 2] = pz;
      const w = new THREE.Vector3(px, py - 0.1 * radius, pz).normalize().multiplyScalar(0.6).addScaledVector(v, 0.4).normalize();
      Nn[o] = w.x; Nn[o + 1] = w.y; Nn[o + 2] = w.z;
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
  g.computeBoundingSphere();
  return g;
}
const gemLike = m => !m || Array.isArray(m) || (m.emissive && m.emissiveIntensity > 0.3 && m.emissive.getHex() !== 0) || m.transparent;

const CTORS = { IcosahedronGeometry: THREE.IcosahedronGeometry, BoxGeometry: THREE.BoxGeometry, SphereGeometry: THREE.SphereGeometry, CylinderGeometry: THREE.CylinderGeometry, ConeGeometry: THREE.ConeGeometry, CapsuleGeometry: THREE.CapsuleGeometry, TorusGeometry: THREE.TorusGeometry, CircleGeometry: THREE.CircleGeometry };

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

function smoothPuff(geo, cluster) {
  const key = 'puff:' + cluster + ':' + geo.parameters.radius + ':' + geo.parameters.detail;
  if (done.has(geo) && done.get(geo).key === key) return done.get(geo).g;
  let out = geo;
  const off = geo.parameters && untouchedOffset(geo);
  if (off) {
    let base = cache.get(key);
    if (!base) { base = softPuff(geo.parameters.radius, geo.parameters.detail, cluster); cache.set(key, base); }
    out = off[0] || off[1] || off[2] ? base.clone().translate(off[0], off[1], off[2]) : base;
  }
  done.set(geo, { key, g: out });
  return out;
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
      // an ink outline always takes the very shape its mesh ended up with
      if (o.name === 'outline' && o.parent && o.parent.isMesh) { if (o.parent.userData.smFrom === o.geometry) o.geometry = o.parent.geometry; return; }
      const from = o.geometry;
      const g = o.geometry.type === 'IcosahedronGeometry'
        ? (o.geometry.parameters.detail <= 1 && !gemLike(o.material) ? smoothPuff(o.geometry, !o.isInstancedMesh ? 'hi' : o.instanceMatrix.count <= 3000 ? 'lo' : false) : o.geometry)
        : smoothGeometry(o.geometry);
      if (g !== o.geometry) { o.geometry = g; o.userData.smFrom = from; }
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
