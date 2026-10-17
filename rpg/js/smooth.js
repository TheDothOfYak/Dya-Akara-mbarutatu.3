/* ============================================================
   The film look — Torcain's Run drawn the way a hand-painted
   animated feature is: painted light, not cartoon bands.
   · light falls off in a soft painted gradient (a wrapped, eased
     ramp) instead of hard cel steps; a gentle sheen where the key
     light glances off, and a rim of light round every silhouette;
   · every surface carries faint oil-paint brushwork (light and dark
     only — no colour is changed), projected in object space so it
     needs no UVs;
   · shapes are softened: boxes are hand-sculpted (rounded, gently
     swelling), round primitives get enough segments to be truly
     round, roofs sweep and flare, leafy puffs become cumulus clusters.
     Rocks, crystals and anything with six sides or fewer keep facets.
   Geometry is softened lazily, the first time a newly added object
   is drawn, and only when its vertices are still exactly what the
   constructor made (moved, at most): anything the game has reshaped
   by hand is left alone.
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ramp } from './gfx.js';
import { mulberry32 } from './util.js';

let installed = false;

/* ---------------- painted light ramp ---------------- */
/* the old 4 bands ran 70 → 255; this keeps those ends but eases between them like paint */
function paintRamp() {
  const W = 256, out = new Uint8Array(W);
  for (let i = 0; i < W; i++) {
    const x = (i + 0.5) / W, t = Math.min(1, Math.max(0, (x - 0.22) / 0.62)), e = t * t * (3 - 2 * t);
    out[i] = Math.round(70 + 185 * Math.pow(e, 0.85));
  }
  const R = ramp();
  R.image = { data: out, width: W, height: 1 };
  R.minFilter = R.magFilter = THREE.LinearFilter;
  R.needsUpdate = true;
}

/* ---------------- brushwork ---------------- */
/* one tileable greyscale texture: R loose oil strokes laid in two directions, G broad mottling */
function brushTexture() {
  const N = 256, rng = mulberry32(1997);
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 700; i++) {
    const x = rng() * N, y = rng() * N, len = 10 + rng() * 44, w = 3 + rng() * 10;
    const a = (rng() < 0.6 ? -0.5 : 0.9) + (rng() - 0.5) * 0.7, l = Math.round(80 + rng() * 100), al = 0.12 + rng() * 0.25;
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      g.save(); g.translate(x + ox, y + oy); g.rotate(a);
      g.globalAlpha = al; g.fillStyle = `rgb(${l},${l},${l})`;
      g.beginPath(); g.ellipse(0, 0, len / 2, w / 2, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  const R = g.getImageData(0, 0, N, N).data, data = new Uint8Array(N * N * 4);
  // G: soft, large blotches (sum of a few periodic waves, so it tiles)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N * Math.PI * 2, v = y / N * Math.PI * 2, k = (y * N + x) * 4;
    const m = Math.sin(u * 2 + Math.sin(v * 3) * 1.3) * 0.35 + Math.sin(v * 2 + Math.sin(u * 3) * 1.1) * 0.35 + Math.sin((u + v) * 3) * 0.15;
    data[k] = R[k]; data[k + 1] = 128 + m * 120; data[k + 2] = 128; data[k + 3] = 255;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
const BRUSH = { value: null };

/* ---------------- shading ---------------- */
const VERT = `#include <begin_vertex>
  vFlP = position; vFlN = normal;
  #ifdef USE_INSTANCING
    vFlP += instanceMatrix[3].xyz * 0.37;
  #endif
  #ifdef FL_PAINT
    vec4 flw = vec4(transformed, 1.0); vec3 flwn = objectNormal;
    #ifdef USE_INSTANCING
      flw = instanceMatrix * flw; flwn = mat3(instanceMatrix) * flwn;
    #endif
    vFlW = (modelMatrix * flw).xyz; vFlWN = normalize(mat3(modelMatrix) * flwn);
  #endif`;
const VERT_PARS = `varying vec3 vFlP; varying vec3 vFlN;
#ifdef FL_PAINT
  varying vec3 vFlW; varying vec3 vFlWN;
#endif
`;
const FRAG_PARS = `varying vec3 vFlP; varying vec3 vFlN; uniform sampler2D uBrush;
vec4 flTri(vec3 p, vec3 w) { return texture2D(uBrush, p.zy) * w.x + texture2D(uBrush, p.xz) * w.y + texture2D(uBrush, p.xy) * w.z; }
#ifdef FL_PAINT
varying vec3 vFlW; varying vec3 vFlWN;
float flH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float flN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(flH(i), flH(i + vec2(1, 0)), f.x), mix(flH(i + vec2(0, 1)), flH(i + vec2(1, 1)), f.x), f.y); }
float flF(vec2 p) { return flN(p) * 0.6 + flN(p * 2.3 + 7.1) * 0.3 + flN(p * 5.1 + 3.3) * 0.1; }
/* courses of dressed stone: per-stone tone, dark mortar, a lit top edge and a shadowed foot */
float flStone(vec2 uv, vec2 sz) {
  vec2 q = uv / sz; float row = floor(q.y); q.x += mod(row, 2.0) * 0.5 + flH(vec2(row, 3.0)) * 0.3;
  vec2 id = floor(q), f = fract(q);
  f += (vec2(flN(uv * 3.0), flN(uv * 3.0 + 5.0)) - 0.5) * 0.08;                  // hand-drawn, wobbly joints
  float tone = 0.86 + 0.24 * flH(id);
  float ex = min(f.x, 1.0 - f.x) * sz.x, ey = min(f.y, 1.0 - f.y) * sz.y, e = min(ex, ey);
  float mortar = smoothstep(0.018, 0.045, e);
  float bevel = 1.0 + 0.12 * smoothstep(0.85, 1.0, f.y) - 0.14 * smoothstep(0.2, 0.0, f.y);
  return mix(0.62, tone * bevel * (0.94 + 0.12 * flF(uv * 4.0)), mortar);
}
float flPlaster(vec2 uv, float y) {
  float b = 0.93 + 0.14 * flF(uv * 0.7);
  float bare = smoothstep(0.66, 0.72, flF(uv * 0.35 + 11.0));                   // plaster fallen away, stone showing
  float st = flStone(uv, vec2(0.55, 0.26));
  float crack = 1.0 - 0.3 * smoothstep(0.012, 0.0, abs(flN(uv * vec2(1.4, 0.6) + 2.0) - 0.5)) * step(0.55, flN(uv * 0.5));
  return mix(b, st * 0.92, bare) * crack;
}
float flWood(vec2 uv) {
  float w = 0.28, k = floor(uv.x / w), f = fract(uv.x / w);
  float gap = smoothstep(0.0, 0.05, f) * smoothstep(1.0, 0.95, f);
  float grain = 0.93 + 0.1 * sin(uv.y * 9.0 + flN(vec2(k * 7.0, uv.y * 0.6)) * 9.0 + f * 3.0);
  float knot = 1.0 - 0.25 * smoothstep(0.06, 0.0, length((fract(uv / vec2(w, 1.3)) - vec2(0.5, flH(vec2(k, 1.0)))) * vec2(w, 1.3)));
  return mix(0.55, (0.86 + 0.24 * flH(vec2(k, 9.0))) * grain * knot, gap);
}
float flShingle(vec2 uv) {
  vec2 sz = vec2(0.42, 0.3); vec2 q = uv / sz; float row = floor(q.y); q.x += mod(row, 2.0) * 0.5;
  vec2 id = floor(q), f = fract(q);
  float edge = length(vec2(f.x - 0.5, (f.y) * 0.8));                              // the rounded lower lip of each tile
  float shade = 0.8 + 0.28 * smoothstep(0.0, 0.7, f.y);
  float lip = smoothstep(0.5, 0.46, edge) * 0.0 + smoothstep(0.08, 0.0, f.y) * 0.3;
  return (0.85 + 0.25 * flH(id)) * shade * (1.0 - lip);
}
float flCobble(vec2 uv) {
  vec2 q = uv / 0.38, i = floor(q), f = fract(q); float d1 = 9.0, d2 = 9.0, idv = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y)), c = o + vec2(flH(i + o), flH(i + o + 4.7)) * 0.8 + 0.1;
    float d = length(c - f); if (d < d1) { d2 = d1; d1 = d; idv = flH(i + o + 2.1); } else if (d < d2) d2 = d;
  }
  float gap = smoothstep(0.03, 0.12, d2 - d1);
  return mix(0.55, (0.82 + 0.3 * idv) * (1.08 - 0.25 * d1), gap);
}
#endif
`;
const FRAG_ALBEDO = `#include <color_fragment>
  {
    vec3 tw = pow(abs(normalize(vFlN)), vec3(4.0)); tw /= dot(tw, vec3(1.0));
    float strokes = flTri(vFlP * 0.9, tw).r, blotch = flTri(vFlP * 0.08 + 0.31, tw).g;
    diffuseColor.rgb *= (0.9 + 0.2 * strokes) * (0.92 + 0.16 * blotch);
  }
  #ifdef FL_PAINT
  {
    // painted surface detail, laid out on whichever world plane the face looks along
    vec3 an = abs(vFlWN);
    vec2 uv = an.y > 0.7 ? vFlW.xz : (an.x > an.z ? vFlW.zy : vFlW.xy);
    float pm = 1.0;
    #if FL_PAINT == 1
      pm = an.y > 0.7 ? flStone(uv, vec2(0.7, 0.55)) : flStone(uv, vec2(0.85, 0.4));
    #elif FL_PAINT == 2
      pm = flPlaster(uv, vFlW.y);
    #elif FL_PAINT == 3
      pm = flWood(an.y > 0.7 ? uv.yx : uv);
    #elif FL_PAINT == 4
      pm = flShingle(uv);
    #elif FL_PAINT == 5
      pm = flCobble(uv);
    #endif
    diffuseColor.rgb *= pm;
  }
  #endif`;
const FRAG_LIGHT = `
  {
    vec3 vd = normalize(vViewPosition);
    float ndv = max(dot(normal, vd), 0.0);
    // a rim of light round the silhouette, as in every painted frame of the film
    outgoingLight += diffuseColor.rgb * smoothstep(0.42, 0.9, 1.0 - ndv) * 0.22;
    #if NUM_DIR_LIGHTS > 0
      // a soft painted sheen where the key light glances off
      vec3 flH = normalize(directionalLights[0].direction + vd);
      float flS = smoothstep(0.86, 0.98, max(dot(normal, flH), 0.0));
      outgoingLight += directionalLights[0].color * flS * 0.09 * (0.4 + 0.6 * max(dot(normal, directionalLights[0].direction), 0.0));
    #endif
  }
  #include <opaque_fragment>`;
/* toon materials without a ramp use three's built-in two-tone step: give them the painted falloff too */
const HARD_STEP = 'return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );';
const SOFT_STEP = 'float flT = smoothstep( 0.22, 0.84, coord.x ); return vec3( 0.55 + 0.45 * flT );';

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

/* install once, before anything is drawn */
export function installSmoothStyle() {
  if (installed) return;
  installed = true;
  paintRamp();
  BRUSH.value = brushTexture();
  THREE.MeshToonMaterial.prototype.onBeforeCompile = function (sh) {
    sh.uniforms.uBrush = BRUSH;
    sh.vertexShader = VERT_PARS + sh.vertexShader.replace('#include <begin_vertex>', VERT);
    sh.fragmentShader = FRAG_PARS + sh.fragmentShader
      .replace('#include <gradientmap_pars_fragment>', THREE.ShaderChunk.gradientmap_pars_fragment.replace(HARD_STEP, SOFT_STEP))
      .replace('#include <color_fragment>', FRAG_ALBEDO)
      .replace('#include <opaque_fragment>', FRAG_LIGHT);
  };
  const add = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function (...objs) {
    for (const o of objs) if (o && !o._smQueued) { o._smQueued = true; pending.push(o); }
    return add.apply(this, objs);
  };
  const render = EffectComposer.prototype.render;
  EffectComposer.prototype.render = function (dt) { flush(); return render.call(this, dt); };
}
