/* ============================================================
   CREATURES II — six more beasts of the Pia'don lore, built as
   procedural toon models in the same hand-painted look as the
   Esik builders (shared ramp, ink outlines, bioluminescence).

   API BUTA (the Blind Beast) — a long, flat, manta-like glider of
            charred basalt hide veined with embers. NO eyes. Fire
            tentacles: two cephalic ones curling in front of its
            wide mouth and a fringe trailing beneath, all flame,
            shedding sparks. Wrapped in a shimmering heatwave
            armour. Fireproof; it bellows. Only predator: Su Naga.
   CYITOR (the Fuzzies, from Katkan) — a ghost-shaped, frost-pale
            fuzzy body with a fluttering scalloped hem, ONE great
            forward-facing eye, and two huge sword-blade arms held
            straight out to the sides. Unknowable.
   XIW'KATKAN (the Fuzzy Devil, from Katkan) — a round ball of
            crimson fluff with big golden eyes, bat wings, devil
            horns, a spade tail and a hell-fire trident.
   VYRENALUR ("light shadow") — the ancient one hidden deep in the
            forest across the Carpenter's lake: a vast, slender
            stag-like beast whose hide is shadow dappled with moving
            light, crowned by branching antlers of pure light that
            trail threads of light like sunbeams through a canopy.
   AEROLHORN — a vast sky leviathan (≈150 m span) that reads as a
            silhouette from far below: a whale-like body, a long
            spiral horn and swept crown horns, huge fingered wings,
            a long tail fan and a beard of tendrils trailing beneath
            (Noka's form — the tendrils snake down when it reaches).
   GREAT NEKH'VORRAN ("darkness" + "forceful wanderer") — one of
            the ancient worms that came through the Duat to Velki:
            a colossal ringed worm of near-black armour, dorsal
            plates and fins, Duat-violet photophores, a three-jawed
            maw around a glowing throat, mind-pits on its brow.
            Eikar bonded with and rode them (opts.saddle).

   Contract: buildX(opts) -> { root, animate(dt, st), flash(v), glow(v), mats }
   metres, facing +z, feet / base on y = 0 (flyers: root origin is the
   body; place it at altitude). opts: seed, scale (+ per-builder extras).
   st = { speed, t, windup 0..1, attack 0..1, airborne }.
   ============================================================ */
import * as THREE from 'three';
import { toon, glowSprite, outlineAll } from './gfx.js';
import { bioKit, bioDots, bioMesh } from './actors.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = v => clamp(v, 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (cur, target, k, dt) => cur + (target - cur) * Math.min(1, k * dt);
const sstep = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------------- shared helpers ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rngFor = (opts, def) => mulberry32(((opts.seed ?? def) * 2654435761) >>> 0);
const mat = (c, o = {}) => toon(c, Object.assign({ emissive: 0x000000 }, o));
const basicM = (c, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o));
const addM = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
const noOut = o => { o.userData.noOutline = true; return o; };
function mesh(geo, m, parent, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (parent) parent.add(o); return o;
}
function finish(root, thick) {
  outlineAll(root, thick);
  root.traverse(m => { if (m.isMesh && m.name !== 'outline' && !(m.material && m.material.transparent)) m.castShadow = true; });
}
function applyScale(root, opts) { if (opts.scale && opts.scale !== 1) root.scale.setScalar(opts.scale); }
function M4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(sx, sy, sz));
}
/* merge [geometry, matrix] pairs into one non-indexed geometry (position + normal) */
function mergeGeos(parts) {
  const list = parts.map(([g, m]) => { const n = g.index ? g.toNonIndexed() : g.clone(); if (m) n.applyMatrix4(m); return n; });
  let total = 0; list.forEach(g => { total += g.attributes.position.count; });
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
  let o = 0;
  list.forEach(g => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; });
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  r.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return r;
}
/* tapered cylinder from point a to point b */
function strutGeo(a, b, r0, r1, seg = 6) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg);
  g.translate(0, len / 2, 0);
  g.applyMatrix4(new THREE.Matrix4().compose(a, new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), V3(1, 1, 1)));
  return g;
}
/* a horn: cone along +y, base at y=0, tip bent toward +x by `curl` (and twisted by `twist`) */
function hornGeo(len, r, curl = 0, seg = 7, twist = 0) {
  const g = new THREE.ConeGeometry(r, len, seg, 8); g.translate(0, len / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / len; let x = p.getX(i), z = p.getZ(i);
    if (twist) { const a = twist * t, c = Math.cos(a), s = Math.sin(a); const nx = x * c - z * s; z = x * s + z * c; x = nx; }
    p.setXYZ(i, x + curl * len * t * t, p.getY(i) - Math.abs(curl) * len * 0.25 * t * t * t, z);
  }
  g.computeVertexNormals();
  return g;
}
/* teardrop / flame tongue: round base at y=0, tip at y=h */
function flameGeo(h, w, lean = 0, seg = 8) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, r = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.9) * Math.pow(1 - t, 0.35);
    pts.push(new THREE.Vector2(Math.max(r * w * 1.2, 0.0001), t * h));
  }
  const g = new THREE.LatheGeometry(pts, seg), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = p.getY(i) / h; p.setX(i, p.getX(i) + lean * h * t * t); }
  g.computeVertexNormals();
  return g;
}
/* flat extruded slab from a THREE.Shape in the xy plane, thickness centred on z = 0 */
function slabGeo(shape, depth, bevel = 0.4, curveSegments = 6) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: depth * bevel, bevelSize: depth * bevel, bevelSegments: 1, curveSegments });
  g.translate(0, 0, -depth / 2); g.computeVertexNormals();
  return g;
}
/* top / belly vertex colours from the normal (countershading) */
function countershade(geo, top, belly, thr = -0.1, soft = 0.25) {
  geo.computeVertexNormals();
  const n = geo.attributes.normal, cols = new Float32Array(n.count * 3), c = new THREE.Color();
  top = new THREE.Color(top); belly = new THREE.Color(belly);
  for (let i = 0; i < n.count; i++) {
    const t = clamp01((thr - n.getY(i)) / soft + 0.5);
    c.copy(top).lerp(belly, t); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}
/* hit flash: emissive add for plain mats, colour boost for textured ones */
function makeFlash(mats) {
  mats.forEach(m => { m.userData.e0 = m.emissive ? m.emissive.clone() : null; m.userData.c0 = m.color.clone(); });
  return v => mats.forEach(m => {
    if (m.map || m.vertexColors || !m.userData.e0) m.color.copy(m.userData.c0).multiplyScalar(1 + v * 2.2);
    else { const e = m.userData.e0; m.emissive.setRGB(e.r + v, e.g + v * 0.9, e.b + v * 0.8); }
  });
}
/* tiny value noise for painted textures */
function hash2(x, y, s) { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
function noise2(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
const fbm2 = (x, y, s) => noise2(x, y, s) * 0.6 + noise2(x * 2.1, y * 2.1, s + 3) * 0.28 + noise2(x * 4.3, y * 4.3, s + 7) * 0.12;
/* paint a canvas texture per pixel: fn(u, v) -> [r, g, b] in 0..255 */
function paintTex(w, h, fn, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const col = fn((x + 0.5) / w, 1 - (y + 0.5) / h), i = (y * w + x) * 4;
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/* ---------------- DeformTube ----------------
   A tube mesh whose spine is rewritten every frame (tentacles, tendrils,
   tails, a worm's whole body). n spine points, `radial` sides, radius
   profile radiusFn(t). Normals are analytic (radial), both ends capped so
   the ink outline stays closed. frame: 'transport' (parallel transport,
   for hanging things) or 'up' (side vector from world up — a body that
   stays roughly level, so texture "top" stays on top). */
const _T = new THREE.Vector3(), _N = new THREE.Vector3(), _B = new THREE.Vector3(), _R = new THREE.Vector3();
class DeformTube {
  constructor(n, radial, radiusFn, o = {}) {
    this.n = n; this.radial = radial; this.frame = o.frame || 'transport';
    this.rad = new Float32Array(n); for (let i = 0; i < n; i++) this.rad[i] = radiusFn(i / (n - 1));
    this.rscale = 1;
    const R1 = radial + 1, vc = n * R1 + 2;
    const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2);
    for (let i = 0; i < n; i++) for (let j = 0; j <= radial; j++) { const k = i * R1 + j; uv[k * 2] = i / (n - 1); uv[k * 2 + 1] = j / radial; }
    const s0 = n * R1, s1 = s0 + 1; uv[s0 * 2 + 1] = 0.5; uv[s1 * 2] = 1; uv[s1 * 2 + 1] = 0.5;
    const idx = [];
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) {
      const a = i * R1 + j, b = a + 1, c = a + R1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    for (let j = 0; j < radial; j++) { idx.push(s0, j + 1, j); const e = (n - 1) * R1; idx.push(s1, e + j, e + j + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    this.geo = g;
    this.pts = Array.from({ length: n }, () => new THREE.Vector3());
    this.N = Array.from({ length: n }, () => new THREE.Vector3());
    this.Bn = Array.from({ length: n }, () => new THREE.Vector3());
    this.T = Array.from({ length: n }, () => new THREE.Vector3());
  }
  /* call after writing this.pts */
  update() {
    const { n, radial, pts } = this, R1 = radial + 1;
    const pos = this.geo.attributes.position.array, nor = this.geo.attributes.normal.array;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      _T.subVectors(b, a); if (_T.lengthSq() < 1e-10) _T.set(0, -1, 0); _T.normalize();
      this.T[i].copy(_T);
      if (this.frame === 'up' || i === 0) {
        _N.crossVectors(UP, _T); if (_N.lengthSq() < 1e-6) _N.set(1, 0, 0); _N.normalize();
        if (this.frame !== 'up' && i === 0) { _N.crossVectors(Math.abs(_T.z) < 0.9 ? _R.set(0, 0, 1) : _R.set(1, 0, 0), _T).normalize(); }
      } else {
        _N.copy(this.N[i - 1]).addScaledVector(_T, -_T.dot(this.N[i - 1])).normalize();
      }
      _B.crossVectors(_T, _N);
      this.N[i].copy(_N); this.Bn[i].copy(_B);
      const r = this.rad[i] * this.rscale, P = pts[i];
      for (let j = 0; j <= radial; j++) {
        const v = j / radial * TAU, c = Math.cos(v), s = Math.sin(v), k = (i * R1 + j) * 3;
        const nx = _N.x * c + _B.x * s, ny = _N.y * c + _B.y * s, nz = _N.z * c + _B.z * s;
        pos[k] = P.x + nx * r; pos[k + 1] = P.y + ny * r; pos[k + 2] = P.z + nz * r;
        nor[k] = nx; nor[k + 1] = ny; nor[k + 2] = nz;
      }
    }
    const s0 = n * R1 * 3, s1 = s0 + 3, T0 = this.T[0], Tn = this.T[n - 1], P0 = pts[0], Pn = pts[n - 1];
    const r0 = this.rad[0] * this.rscale, rn = this.rad[n - 1] * this.rscale;
    pos[s0] = P0.x - T0.x * r0 * 0.6; pos[s0 + 1] = P0.y - T0.y * r0 * 0.6; pos[s0 + 2] = P0.z - T0.z * r0 * 0.6;
    nor[s0] = -T0.x; nor[s0 + 1] = -T0.y; nor[s0 + 2] = -T0.z;
    pos[s1] = Pn.x + Tn.x * rn * 0.6; pos[s1 + 1] = Pn.y + Tn.y * rn * 0.6; pos[s1 + 2] = Pn.z + Tn.z * rn * 0.6;
    nor[s1] = Tn.x; nor[s1 + 1] = Tn.y; nor[s1 + 2] = Tn.z;
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.normal.needsUpdate = true;
  }
  mesh(m, parent) { const o = new THREE.Mesh(this.geo, m); o.frustumCulled = false; if (parent) parent.add(o); this.obj = o; return o; }
}

/* a small pool of rising spark / ember sprites */
function sparkPool(parent, n, colors, size) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const s = glowSprite(colors[i % colors.length], size, 0); s.visible = false; parent.add(s);
    list.push({ s, life: 0, max: 1, v: new THREE.Vector3(), size: size * (0.6 + (i % 5) * 0.15) });
  }
  let next = 0;
  return {
    emit(p, vx, vy, vz, life) { const e = list[next]; next = (next + 1) % n; e.s.position.copy(p); e.v.set(vx, vy, vz); e.life = e.max = life; e.s.visible = true; },
    update(dt, gain = 1) {
      for (const e of list) {
        if (e.life <= 0) continue;
        e.life -= dt; if (e.life <= 0) { e.s.visible = false; continue; }
        const k = e.life / e.max;
        e.s.position.addScaledVector(e.v, dt); e.v.y += dt * 0.6; e.v.multiplyScalar(1 - dt * 0.8);
        e.s.material.opacity = Math.min(1, k * 1.6) * 0.9 * gain;
        e.s.scale.setScalar(e.size * (0.4 + k * 0.8));
      }
    },
  };
}

/* =================================================================
   API BUTA — the Blind Beast. ≈9.6 m wingspan, ≈8 m body + 5 m tail,
   glides with its body ≈3 m up (opts.hover), fire tentacles hanging
   to ~0.3 m. No eyes anywhere.
   st: speed (faster = deeper wingbeats), airborne (rides higher),
       windup = rear up and BELLOW (mouth gapes, heat armour flares),
       attack = lunge and breathe a burst of fire.
   ================================================================= */
export function buildApiButa(opts = {}) {
  const root = new THREE.Group();
  const rnd = rngFor(opts, 5);
  const bio = bioKit();
  const hover0 = opts.hover ?? 3.0;
  const body = new THREE.Group(); body.position.y = hover0; root.add(body);

  // --- planform: R(a) = outline radius at angle a from the nose (+z) ---
  const tipA = 1.85 + (rnd() - 0.5) * 0.08, span = 1 + (rnd() - 0.5) * 0.08;
  const Rf = a => 2.25 + 1.25 * span * Math.sin(a) ** 2 + 1.45 * span * Math.exp(-(((a - tipA) / 0.21) ** 2)) + 0.55 * Math.exp(-((a / 0.3) ** 2)) + 0.25 * Math.exp(-(((a - Math.PI) / 0.5) ** 2));
  const ZOFF = -0.2;
  const surf = (ux, uy, uz) => {
    const h = Math.min(1, Math.hypot(ux, uz)), a = Math.atan2(ux, uz), R = Rf(Math.abs(a));
    const X = Math.sin(a) * h * R, Z = Math.cos(a) * h * R + ZOFF;
    const core = Math.exp(-(X * X) / 2.2) * Math.exp(-((Z + 0.3) ** 2) / 9);       // the thick central body
    const th = 0.16 + 0.8 * core;
    let Y = Math.sign(uy) * Math.pow(Math.abs(uy), 1.25) * (uy > 0 ? th : th * 0.62);
    Y += 0.18 * core - 0.22 * Math.pow(Math.abs(X) / 4.8, 2);                          // dome + drooping tips
    return [X, Y, Z];
  };
  const bodyGeo = new THREE.SphereGeometry(1, 56, 28);
  const bp = bodyGeo.attributes.position, base = new Float32Array(bp.count * 3);
  for (let i = 0; i < bp.count; i++) {
    const s = surf(bp.getX(i), bp.getY(i), bp.getZ(i));
    base[i * 3] = s[0]; base[i * 3 + 1] = s[1]; base[i * 3 + 2] = s[2];
    bp.setXYZ(i, s[0], s[1], s[2]);
  }
  bodyGeo.computeVertexNormals();
  // painted hide: charred basalt above with ember veins, ash belly with glowing gill slits
  const SEED = (opts.seed ?? 5) * 1.37;
  const hide = (u, v) => {
    const phi = u * TAU, th = (1 - v) * Math.PI;
    const ux = -Math.cos(phi) * Math.sin(th), uz = Math.sin(phi) * Math.sin(th), uy = Math.cos(th);
    const [X, , Z] = surf(ux, uy, uz);
    return { X, Z, top: uy > 0, edge: Math.sin(th) };
  };
  const veinAt = (X, Z) => {
    const n = fbm2(X * 0.55 + 10, Z * 0.55, SEED), m = fbm2(X * 1.3, Z * 1.3 + 5, SEED + 2);
    return Math.max(0, 1 - Math.abs(n - 0.5) / 0.02) * 0.9 + Math.max(0, 1 - Math.abs(m - 0.5) / 0.012) * 0.4;
  };
  const gillAt = (X, Z) => {
    const ax = Math.abs(X); if (ax < 0.75 || ax > 1.35 || Z > 0.9 || Z < -0.9) return 0;
    const k = (Z + 0.9) / 1.8 * 5, f = k - Math.floor(k);
    return f > 0.35 && f < 0.6 ? 1 : 0;
  };
  const mapT = paintTex(256, 128, (u, v) => {
    const { X, Z, top, edge } = hide(u, v);
    if (top) {
      const n = fbm2(X * 1.6, Z * 1.6, SEED + 9), vein = veinAt(X, Z), spine = Math.exp(-X * X * 6) * 0.25;
      const k = 0.75 + n * 0.5 - spine;
      return [lerp(44 * k, 210, Math.min(1, vein)), lerp(34 * k, 90, Math.min(1, vein)), lerp(32 * k, 40, Math.min(1, vein))];
    }
    const n = fbm2(X * 2, Z * 2, SEED + 4), g = gillAt(X, Z), rim = (1 - edge) > 0.92 ? 0 : 0;
    const k = 0.85 + n * 0.3 + rim;
    return [lerp(120 * k, 255, g), lerp(86 * k, 120, g), lerp(74 * k, 40, g)];
  });
  const emT = paintTex(256, 128, (u, v) => {
    const { X, Z, top } = hide(u, v);
    const e = top ? Math.min(1, veinAt(X, Z)) : gillAt(X, Z) * 0.9 + Math.max(0, 1 - Math.abs(fbm2(X * 0.8, Z * 0.8, SEED + 6) - 0.5) / 0.03) * 0.35;
    return [255 * e, 200 * e, 160 * e];
  });
  const hideM = mat(0xffffff, { map: mapT, emissive: 0xff5a14, emissiveMap: emT });
  bio.reg(hideM, 0.3, 2.2);
  const bodyMesh = mesh(bodyGeo, hideM, body); bodyMesh.frustumCulled = false;
  // heatwave armour: a shimmering additive skin over the same (rippling) geometry
  const heatM = addM(0xff7a2a, 0.08);
  const heat = noOut(mesh(bodyGeo, heatM, body)); heat.scale.set(1.06, 1.9, 1.05); heat.frustumCulled = false;
  const heat2 = noOut(mesh(bodyGeo, addM(0xffc060, 0.05), body)); heat2.scale.set(1.12, 1.5, 1.1); heat2.frustumCulled = false;

  // obsidian scutes down the spine (fireproof armour)
  const scuteM = mat(0x241a1e, { emissive: 0x000000 });
  const scutes = [];
  for (let i = 0; i < 7; i++) {
    const z = 1.6 - i * 0.62, s = 1 - i * 0.09;
    scutes.push([new THREE.ConeGeometry(0.22 * s, 0.42 * s, 4), M4(0, 0.86 - i * 0.05 - (i === 0 ? 0.05 : 0), z, -0.75, Math.PI / 4, 0, 1, 1, 1.8)]);
  }
  mesh(mergeGeos(scutes), scuteM, body);
  // blind head: a smooth brow (no eyes), heat pits, and a wide mouth slot on the leading edge
  const front = Rf(0) + ZOFF;
  const mouthG = new THREE.Group(); mouthG.position.set(0, -0.08, front - 0.12); body.add(mouthG);
  const lipM = mat(0x2c201c);
  const maw = noOut(mesh(new THREE.SphereGeometry(1, 20, 10), basicM(0x1a0604), mouthG)); maw.scale.set(0.82, 0.07, 0.28);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.04, -0.15); mouthG.add(jaw);
  const jawM = mesh(new THREE.SphereGeometry(1, 20, 8, 0, TAU, Math.PI / 2, Math.PI / 2), lipM, jaw); jawM.scale.set(0.72, 0.12, 0.36); jawM.position.z = 0.12;
  const throat = glowSprite(0xff8a2a, 1.6, 0); throat.position.set(0, 0, 0.1); mouthG.add(throat);
  const pitM = bio.mat(0xff9a40, 0x3a2620, 0.4, 0.4, 2.4);
  const pits = []; for (const s of [-1, 1]) for (let i = 0; i < 4; i++) pits.push([s * (0.3 + i * 0.16), 0.36 - i * 0.04, front - 0.55 - i * 0.12, s * 0.2, 1, 0.4, 0.045, 0.35]);
  bioMesh(bioDots(pits), pitM, body);

  // fire tentacles: 2 cephalic (front, curling forward) + a trailing fringe beneath
  const fireMap = paintTex(64, 8, (u) => {
    const a = clamp01(u * 2), b = clamp01(u * 2 - 1);
    return [lerp(lerp(120, 255, a), 255, b), lerp(lerp(24, 110, a), 225, b), lerp(lerp(8, 16, a), 110, b)];
  });
  const fireM = mat(0xffffff, { map: fireMap, emissive: 0xffffff, emissiveMap: fireMap, emissiveIntensity: 1.0 });
  const tongueM = addM(0xff8a24, 0.75), tongueM2 = addM(0xffe080, 0.8);
  const tents = [];
  const mkTent = (x, y, z, len, r0, kind) => {
    const tube = new DeformTube(14, 7, t => r0 * (1 - t * 0.82) + 0.015);
    tube.mesh(fireM, body);
    const sprites = [0.2, 0.45, 0.7, 1].map((t, i) => { const s = glowSprite(i === 3 ? 0xffe090 : 0xff7a20, (0.8 + i * 0.25) * (kind === 'head' ? 1.1 : 1), 0.55); body.add(s); return { s, t }; });
    const tongues = [0.3, 0.55, 0.8].map((t, i) => { const f = noOut(new THREE.Mesh(flameGeo(0.5 + i * 0.1, 0.1, 0.05), i % 2 ? tongueM2 : tongueM)); body.add(f); return { f, t, ph: rnd() * TAU }; });
    const tip = noOut(new THREE.Mesh(flameGeo(0.55, 0.13, 0.1), addM(0xffb040, 0.85))); body.add(tip);
    tents.push({ tube, x, y, z, len, kind, ph: rnd() * TAU, fr: 0.8 + rnd() * 0.5, sprites, tongues, tip, side: Math.sign(x) || 1 });
  };
  for (const s of [-1, 1]) mkTent(s * 0.62, -0.05, front - 0.25, 1.8, 0.15, 'head');
  const fringe = opts.tentacles ?? 7;
  for (let i = 0; i < fringe; i++) {
    const f = fringe > 1 ? i / (fringe - 1) : 0.5, x = (f - 0.5) * 2.6, z = -0.6 - Math.abs(f - 0.5) * 1.2 - rnd() * 0.3;
    mkTent(x, -0.32, z, 2.6 + (1 - Math.abs(f - 0.5) * 2) * 0.6 + rnd() * 0.3, 0.13, 'fringe');
  }
  // the long whip tail with an ember tip
  const tailLen = 5.2;
  const tail = new DeformTube(18, 7, t => 0.24 * (1 - t) + 0.025);
  const tailM = mat(0x2a201e, { emissive: 0xff5a14, emissiveIntensity: 0.0 });
  tail.mesh(tailM, body);
  const tailTip = glowSprite(0xff8030, 0.9, 0.7); body.add(tailTip);
  const tailZ = -(Rf(Math.PI) - ZOFF) + 0.2;

  const sparks = sparkPool(root, 36, [0xffd070, 0xff8a2a, 0xff5a1a], 0.35);
  const halo = bio.sprite(glowSprite(0xff7020, 9, 0.22), 0.22, 0.25); halo.position.set(0, 0, -0.3); body.add(halo);

  finish(root, 0.035);
  applyScale(root, opts);
  bio.glow(0);
  const flashF = makeFlash([hideM, lipM, scuteM, tailM]);
  let T = rnd() * 10, ph = rnd() * TAU, hov = hover0, pitch = 0, wu = 0, at = 0, emitAcc = 0;
  const pos = bodyGeo.attributes.position.array, cnt = bodyGeo.attributes.position.count;
  const _p = new THREE.Vector3(), _w = new THREE.Vector3();
  const anim = {
    root, mats: [hideM, lipM, scuteM], glow: bio.glow,
    flash: flashF,
    animate(dt, st = {}) {
      T += dt;
      const sp = st.speed || 0;
      wu = damp(wu, st.windup || 0, 10, dt); at = damp(at, st.attack || 0, 14, dt);
      const beat = 0.35 + Math.min(sp, 10) * 0.05 + wu * 0.15;
      ph += dt * (0.9 + Math.min(sp, 10) * 0.08 + at * 2);
      hov = damp(hov, st.airborne ? hover0 + 4 : hover0, 1.5, dt);
      // ripple the wings: a wave running nose → tail, growing toward the tips
      for (let i = 0; i < cnt; i++) {
        const X = base[i * 3], Z = base[i * 3 + 2], ax = Math.abs(X);
        const k = Math.pow(sstep((ax - 0.9) / 3.9), 1.25);
        pos[i * 3 + 1] = base[i * 3 + 1] + k * (beat * 0.95 * Math.sin(ph - Z * 0.32) + 0.12 * Math.sin(ph * 2.3 + ax * 1.7 - Z * 0.9))
          + Math.sin(ph * 0.5 - Z * 0.6) * 0.06;
      }
      bodyGeo.attributes.position.needsUpdate = true; bodyGeo.computeVertexNormals();
      body.position.y = hov - Math.sin(ph) * beat * 0.35 + wu * 1.2;
      pitch = damp(pitch, -wu * 0.42 + at * 0.28 + Math.min(sp, 10) * 0.012, 6, dt);
      body.rotation.x = pitch + Math.sin(T * 0.4) * 0.03;
      body.rotation.z = Math.sin(T * 0.31) * 0.05;
      body.position.z = at * 1.2 - wu * 0.4;
      // the bellow: the mouth gapes wide, the throat glows
      jaw.rotation.x = 0.06 + Math.max(wu, at) * 0.75 + Math.sin(T * 1.3) * 0.03;
      maw.scale.y = 0.07 + Math.max(wu, at) * 0.22;
      throat.material.opacity = Math.max(wu * 0.6, at) * (0.85 + Math.sin(T * 23) * 0.15);
      throat.scale.setScalar(1.4 + at * 3.5);
      throat.position.z = 0.1 + at * 1.5;
      // heatwave armour shimmers, flares on a bellow
      const hk = 0.06 + bio.v * 0.04 + wu * 0.05 + at * 0.1;
      heatM.opacity = hk * (0.8 + Math.sin(T * 9) * 0.2);
      heat2.material.opacity = hk * 0.35 * (0.8 + Math.sin(T * 6.3 + 1) * 0.2);
      heat.scale.set(1.06 + Math.sin(T * 7) * 0.01, 1.9 + wu * 0.25, 1.05);
      // tentacles
      const fl = 0.9 + wu * 0.6 + at * 0.8;
      fireM.emissiveIntensity = fl * (0.9 + Math.sin(T * 17) * 0.08);
      for (const tn of tents) {
        const P = tn.tube.pts, n = P.length;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1), d = t * tn.len, w = Math.sin(T * 2.2 * tn.fr + tn.ph - t * 4.5) * (0.25 + t * 0.5);
          if (tn.kind === 'head') {
            // cephalic: forward and down, curling inward, lifting on a bellow
            const lift = wu * 0.9 + at * 0.6;
            const curl = t * t * (1.6 - lift);
            P[i].set(tn.x + tn.side * (t * 0.35 - curl * 0.35) + w * 0.25 * tn.side, tn.y - d * (0.3 - lift * 0.6) + Math.sin(T * 1.7 + tn.ph + t * 3) * 0.15 * t, tn.z + d * 0.75 - curl * 0.5);
          } else {
            const drag = 0.62 + Math.min(sp, 10) * 0.05 + at * 0.3;
            P[i].set(tn.x + w * 0.6, tn.y - d * (1 - drag * 0.45) + Math.sin(T * 1.3 + tn.ph) * 0.1 * t, tn.z - d * drag + Math.cos(T * 1.9 + tn.ph + t * 3) * 0.2 * t);
          }
        }
        tn.tube.rscale = 1 + Math.sin(T * 11 + tn.ph) * 0.06 + at * 0.25;
        tn.tube.update();
        for (const S of tn.sprites) {
          const k = S.t * (n - 1), i0 = Math.floor(k), i1 = Math.min(n - 1, i0 + 1);
          S.s.position.lerpVectors(P[i0], P[i1], k - i0);
          S.s.material.opacity = (0.35 + 0.2 * Math.sin(T * 13 + tn.ph + S.t * 5)) * (0.7 + bio.v * 0.5) * fl * 0.75;
        }
        for (const G of tn.tongues) {   // flame licks rise off the tentacle
          const k = G.t * (n - 1), i0 = Math.floor(k), i1 = Math.min(n - 1, i0 + 1);
          G.f.position.lerpVectors(P[i0], P[i1], k - i0);
          G.f.rotation.set(Math.sin(T * 9 + G.ph) * 0.2 - pitch, 0, Math.sin(T * 7 + G.ph) * 0.25);
          G.f.scale.setScalar(fl * 0.8 * (0.8 + 0.35 * Math.sin(T * 14 + G.ph)));
        }
        const tp = P[n - 1], tq = P[n - 2];
        tn.tip.position.copy(tp); _w.subVectors(tp, tq).normalize();
        tn.tip.quaternion.setFromUnitVectors(UP, _w);
        tn.tip.scale.set(1, 1 + Math.sin(T * 15 + tn.ph) * 0.25 + at * 0.8, 1);
      }
      // tail: trails and whips
      { const P = tail.pts, n = P.length;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1), d = t * tailLen;
          P[i].set(Math.sin(T * 1.1 - t * 3.5) * 0.5 * t, 0.1 + Math.sin(ph - 1 - t * 2.5) * 0.4 * t - t * t * 0.4, tailZ - d);
        }
        tail.update(); tailTip.position.copy(P[n - 1]);
        tailTip.material.opacity = 0.5 + 0.3 * Math.sin(T * 8); }
      // sparks shed from the tentacle tips; a burst on attack
      emitAcc += dt * (5 + wu * 10 + at * 40);
      while (emitAcc > 1) {
        emitAcc -= 1;
        const tn = tents[Math.floor(Math.random() * tents.length)], P = tn.tube.pts;
        _p.copy(P[Math.floor(P.length * (0.5 + Math.random() * 0.5)) - 1 + 0]).applyMatrix4(body.matrix);
        if (at > 0.2 && Math.random() < 0.6) { _p.set(0, -0.1, front + 0.4).applyMatrix4(body.matrix); sparks.emit(_p, (Math.random() - 0.5) * 3, Math.random() * 1.5, 6 + Math.random() * 5, 0.6 + Math.random() * 0.4); }
        else sparks.emit(_p, (Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 0.9, -Math.min(sp, 8) * 0.3 - Math.random() * 0.4, 0.7 + Math.random() * 0.8);
      }
      sparks.update(dt, 0.7 + bio.v * 0.4);
      body.updateMatrix();
    },
  };
  anim.animate(0.016, {});
  return anim;
}

/* =================================================================
   CYITOR — a Fuzzy from Katkan: ≈2.1 m tall ghost-shaped body that
   hovers (hem ≈0.35 m off the ground), ONE forward eye, and two
   sword-blade arms out to the sides (≈4.4 m tip to tip).
   st: windup = blades draw back, body coils; attack = both blades
       scissor forward across the front.
   ================================================================= */
export function buildCyitor(opts = {}) {
  const root = new THREE.Group();
  const rnd = rngFor(opts, 9);
  const bio = bioKit();
  const furC = new THREE.Color(opts.color ?? 0xd6d0ec);
  if (opts.seed != null) furC.offsetHSL((rnd() - 0.5) * 0.06, 0, (rnd() - 0.5) * 0.08);
  const furM = mat(furC), shadeM = mat(furC.clone().multiplyScalar(0.72));
  const glowC = opts.glow ?? 0x7cecff;
  const body = new THREE.Group(); root.add(body);

  // ghost body: a lathe from the underside up over the dome, fuzzy-jittered
  const prof = [[0.001, 0.62], [0.28, 0.56], [0.52, 0.44], [0.66, 0.33], [0.66, 0.5], [0.62, 0.8], [0.6, 1.12], [0.59, 1.42], [0.55, 1.68], [0.45, 1.88], [0.3, 2.0], [0.12, 2.06], [0.001, 2.07]];
  const W = [0, 0.25, 0.65, 1, 0.65, 0.25, 0.05, 0, 0, 0, 0, 0, 0];
  const SEG = 36;
  const lathe = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), SEG);
  const lp = lathe.attributes.position, base = new Float32Array(lp.count * 3), wts = new Float32Array(lp.count), ths = new Float32Array(lp.count);
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), y = lp.getY(i), z = lp.getZ(i), r = Math.hypot(x, z);
    const pi = i % prof.length, th = Math.atan2(x, z);
    const fz = r > 0.01 ? 1 + (noise2(th * 6 + 20, y * 9, 3) - 0.5) * 0.09 + (noise2(th * 14, y * 20, 5) - 0.5) * 0.05 : 1;   // fuzz
    base[i * 3] = x * fz; base[i * 3 + 1] = y; base[i * 3 + 2] = z * fz; wts[i] = W[pi]; ths[i] = th;
  }
  const bodyGeo = lathe;
  const bodyMesh = mesh(bodyGeo, furM, body); bodyMesh.frustumCulled = false;
  // tufts: a cowlick of fuzz on top, fluff at the shoulders
  const tuft = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; tuft.push([hornGeo(0.22 + (i % 2) * 0.08, 0.06, 0.4, 5), M4(Math.sin(a) * 0.12, 1.98, Math.cos(a) * 0.12 - 0.04, Math.cos(a) * 0.5, a, 0)]); }
  mesh(mergeGeos(tuft), furM, body);

  // the single eye, facing forward
  const eyeG = new THREE.Group(); eyeG.position.set(0, 1.42, 0.5); eyeG.scale.setScalar(1.15); body.add(eyeG);
  const socket = mesh(new THREE.TorusGeometry(0.25, 0.07, 8, 24), shadeM, eyeG); socket.position.z = 0.04;
  const sclera = mesh(new THREE.SphereGeometry(0.25, 20, 14), mat(0xf4f6ff), eyeG); sclera.scale.set(1, 1, 0.62); sclera.position.z = 0.02;
  const irisM = bio.mat(glowC, 0x5a9ab8, 0.45, 0.5, 2.6);
  const iris = new THREE.Group(); eyeG.add(iris);
  const irisMesh = noOut(mesh(new THREE.SphereGeometry(0.15, 18, 10, 0, TAU, 0, Math.PI / 2.6), irisM, iris)); irisMesh.rotation.x = Math.PI / 2; irisMesh.position.z = 0.02;
  const pupil = noOut(mesh(new THREE.SphereGeometry(0.06, 10, 8), basicM(0x05060a), iris)); pupil.scale.set(0.45, 1.5, 0.3); pupil.position.z = 0.165;
  const glint = noOut(mesh(new THREE.SphereGeometry(0.025, 6, 4), basicM(0xffffff), iris)); glint.position.set(0.05, 0.06, 0.175);
  const lid = mesh(new THREE.SphereGeometry(0.29, 18, 10, 0, TAU, 0, Math.PI / 2), furM, eyeG); lid.scale.set(1, 1, 0.66); lid.rotation.x = -1.6;
  const eyeGlow = bio.sprite(glowSprite(glowC, 0.9, 0.5), 0.5, 0.1); eyeGlow.position.z = 0.12; eyeG.add(eyeGlow);
  // frost markings: a ring of dots round the socket and a band above the hem
  const dotM = bio.mat(glowC, furC, 0.35, 0.1, 2.2);
  const ring = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ring.push([Math.sin(a) * 0.36, 1.42 + Math.cos(a) * 0.36, 0.53 - Math.abs(Math.sin(a)) * 0.08, Math.sin(a) * 0.3, Math.cos(a) * 0.3, 1, 0.03 + (i % 2) * 0.012, 0.35]); }
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, y = 0.86 + (i % 2) * 0.1, r = 0.625; ring.push([Math.sin(a) * r, y, Math.cos(a) * r, Math.sin(a), 0, Math.cos(a), 0.035, 0.35]); }
  bioMesh(bioDots(ring), dotM, body);

  // sword-blade arms out to the sides
  const bladeM = mat(0x9aa6c4), edgeM = bio.mat(glowC, 0xc8d4ee, 0.5, 0.2, 2.4), guardM = mat(0x4a4668);
  const bsh = new THREE.Shape();
  bsh.moveTo(0, -0.1); bsh.lineTo(0.3, -0.15); bsh.lineTo(1.2, -0.13); bsh.quadraticCurveTo(1.42, -0.1, 1.58, 0.0); bsh.quadraticCurveTo(1.42, 0.1, 1.2, 0.14);
  bsh.lineTo(0.3, 0.16); bsh.lineTo(0, 0.1); bsh.lineTo(0, -0.1);
  const bladeGeo = slabGeo(bsh, 0.05, 0.5);
  { const p = bladeGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) * (1 - Math.min(1, Math.abs(y) / 0.17) * 0.75)); } bladeGeo.computeVertexNormals(); }
  const fuller = new THREE.BoxGeometry(1.0, 0.022, 0.045);
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.6, 1.08, 0.02); sh.scale.x = s; body.add(sh);
    const pivot = new THREE.Group(); pivot.rotation.order = 'YZX'; sh.add(pivot);
    const nub = mesh(new THREE.SphereGeometry(0.2, 14, 10), furM, pivot); nub.scale.set(1.3, 0.9, 0.9); nub.position.x = 0.08;
    const guard = mesh(new THREE.TorusGeometry(0.11, 0.045, 6, 12), guardM, pivot); guard.rotation.y = Math.PI / 2; guard.position.x = 0.3;
    const blade = mesh(bladeGeo, bladeM, pivot); blade.position.x = 0.32;
    bioMesh(fuller, edgeM, blade, 0.72, 0, 0);
    arms.push({ sh, pivot, s });
  }

  finish(root, 0.03);
  applyScale(root, opts);
  bio.glow(0);
  const flashF = makeFlash([furM, bladeM, shadeM]);
  let T = rnd() * 10, wu = 0, at = 0, lookY = 0, lookX = 0, nextLook = 1, blink = 0, nextBlink = 2;
  const pos = bodyGeo.attributes.position.array, cnt = bodyGeo.attributes.position.count;
  const anim = {
    root, mats: [furM, bladeM], glow: bio.glow, flash: flashF,
    animate(dt, st = {}) {
      T += dt;
      const sp = st.speed || 0;
      wu = damp(wu, st.windup || 0, 10, dt); at = damp(at, st.attack || 0, 16, dt);
      // hem flutter: five drips that sway and trail behind when moving
      const drag = Math.min(sp, 6) * 0.06;
      for (let i = 0; i < cnt; i++) {
        const w = wts[i], th = ths[i];
        let x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
        if (w > 0) {
          const scal = Math.pow(0.5 + 0.5 * Math.cos(5 * th + Math.sin(T * 1.1) * 0.8 + T * 0.6), 2.5);
          y -= w * (0.24 * scal - 0.04 * Math.sin(T * 2.4 + th * 3));
          const fl = 1 + w * (0.07 * Math.sin(3 * th - T * 2.6) + 0.05);
          x *= fl; z = z * fl - w * drag * 1.5;
        }
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      }
      bodyGeo.attributes.position.needsUpdate = true; bodyGeo.computeVertexNormals();
      body.position.y = 0.06 + Math.sin(T * 1.6) * 0.08 + (st.airborne ? 1.2 : 0);
      body.rotation.x = Math.min(sp, 6) * 0.04 - wu * 0.12 + at * 0.18;
      body.rotation.z = Math.sin(T * 0.9) * 0.04;
      body.rotation.y = -wu * 0.25 + at * 0.35 + Math.sin(T * 0.5) * 0.05;
      body.position.z = at * 0.6 - wu * 0.15;
      // blades: held level, drift; windup draws back, attack scissors forward
      for (const A of arms) {
        const k = A.s;
        A.pivot.rotation.y = 0.05 + wu * 0.95 - at * 1.75 + Math.sin(T * 1.3 + k) * 0.04;
        A.pivot.rotation.z = Math.sin(T * 1.6 + k * 0.7) * 0.06 + wu * 0.12 - at * 0.05 + (k > 0 ? at * 0.08 : -at * 0.08);
        A.pivot.rotation.x = Math.sin(T * 0.8 + k) * 0.1;
      }
      // the eye: looks about, blinks, fixes on its target in a fight
      nextLook -= dt; if (nextLook < 0) { nextLook = 1 + rnd() * 2.5; lookY = (rnd() - 0.5) * 0.7; lookX = (rnd() - 0.5) * 0.4; }
      const focus = Math.max(wu, at);
      iris.rotation.y = damp(iris.rotation.y, lookY * (1 - focus), 6, dt);
      iris.rotation.x = damp(iris.rotation.x, lookX * (1 - focus), 6, dt);
      nextBlink -= dt; if (nextBlink < 0) { blink = 1; nextBlink = 2.5 + rnd() * 3; }
      blink = Math.max(0, blink - dt * 7);
      lid.rotation.x = -1.6 + Math.sin(blink * Math.PI) * 1.45 + wu * 0.35;
      pupil.scale.set(0.45 - focus * 0.25, 1.5, 0.3);
    },
  };
  anim.animate(0.016, {});
  return anim;
}

/* =================================================================
   XIW'KATKAN — the Fuzzy Devil: ≈1 m tall (≈1.25 m to the trident
   tip), round ball of crimson fluff, big golden eyes, devil horns,
   bat wings (≈1.6 m span), spade tail, hell-fire trident.
   st: airborne / speed > 3 = hovers on fast wingbeats; windup = the
       trident rears back and its prongs catch hell-fire; attack =
       thrust.
   ================================================================= */
export function buildXiwKatkan(opts = {}) {
  const root = new THREE.Group();
  const rnd = rngFor(opts, 13);
  const bio = bioKit();
  const furC = new THREE.Color(opts.color ?? 0xa3222e);
  if (opts.seed != null) furC.offsetHSL((rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.1);
  const furM = mat(furC), tipM = mat(furC.clone().lerp(new THREE.Color(0xff7a5a), 0.18)), bellyM = mat(furC.clone().lerp(new THREE.Color(0xffc0a0), 0.5));
  const hornM = mat(0x2a1418), memM = mat(0x5a1626, { side: THREE.DoubleSide }), boneM = mat(0x2c0e14), ironM = mat(0x2e2830);
  const hellC = 0xff5a1a;
  const R = 0.36;
  const hopG = new THREE.Group(); root.add(hopG);
  const body = new THREE.Group(); body.position.y = 0.5; hopG.add(body);

  // the fluff: a ball with a pelt of short fat tufts (belly lighter)
  mesh(new THREE.SphereGeometry(R, 20, 16), furM, body);
  const pelt = [], peltTip = [], bellyT = [];
  const tuft = new THREE.SphereGeometry(0.085, 7, 5); tuft.scale(1, 0.75, 1); tuft.translate(0, 0.03, 0);
  const n = 110, q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    const y = 1 - (i + 0.5) / n * 2, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
    const d = V3(Math.cos(a) * rr, y, Math.sin(a) * rr);
    if (d.z > 0.55 && d.y > -0.1 && d.y < 0.6 && Math.abs(d.x) < 0.55) continue;     // keep the face clear
    q.setFromUnitVectors(UP, d.clone().add(V3((rnd() - 0.5) * 0.6, -0.25 - (rnd()) * 0.2, (rnd() - 0.5) * 0.6)).normalize());
    const m = new THREE.Matrix4().compose(d.clone().multiplyScalar(R * 0.93), q, V3(0.8 + rnd() * 0.5, 0.8 + rnd() * 0.6, 0.8 + rnd() * 0.5));
    (d.z > 0.45 && d.y < -0.15 ? bellyT : i % 4 === 0 ? peltTip : pelt).push([tuft, m]);
  }
  mesh(mergeGeos(pelt), furM, body); mesh(mergeGeos(peltTip), tipM, body); mesh(mergeGeos(bellyT), bellyM, body);
  // face: a soft lighter mask, big eyes, wicked brows, fanged grin
  const face = mesh(new THREE.SphereGeometry(0.25, 16, 12), bellyM, body); face.scale.set(1.25, 0.95, 0.55); face.position.set(0, 0.08, 0.2);
  const eyeM = mat(0xfffaf0), irisM = bio.mat(0xffc020, 0xe0a020, 0.5, 0.35, 2.6), pupilM = basicM(0x0a0406), shineM = basicM(0xffffff);
  const eyes = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * 0.12, 0.1, 0.3); g.rotation.y = s * 0.25; body.add(g);
    mesh(new THREE.SphereGeometry(0.105, 16, 12), eyeM, g).scale.set(1, 1.15, 0.7);
    const ir = noOut(mesh(new THREE.SphereGeometry(0.075, 14, 10), irisM, g)); ir.scale.set(1, 1.15, 0.5); ir.position.z = 0.04;
    const pu = noOut(mesh(new THREE.SphereGeometry(0.05, 12, 8), pupilM, g)); pu.scale.set(0.55, 1.2, 0.4); pu.position.z = 0.068;
    noOut(mesh(new THREE.SphereGeometry(0.018, 6, 4), shineM, g)).position.set(-0.025, 0.04, 0.09);
    const brow = mesh(new THREE.BoxGeometry(0.15, 0.035, 0.05), hornM, g); brow.position.set(s * 0.01, 0.12, 0.06); brow.rotation.z = s * -0.45;
    eyes.push(g);
  }
  const grin = mesh(new THREE.TorusGeometry(0.085, 0.014, 5, 14, Math.PI * 0.9), basicM(0x2a0608), body); grin.position.set(0, -0.06, 0.335); grin.rotation.set(0.15, 0, Math.PI + Math.PI * 0.05);
  for (const s of [-1, 1]) { const f = mesh(new THREE.ConeGeometry(0.014, 0.045, 5), mat(0xfff8ee), body); f.position.set(s * 0.045, -0.105, 0.335); f.rotation.x = Math.PI; }
  // devil horns
  const hornTipList = [];
  for (const s of [-1, 1]) {
    const h = mesh(hornGeo(0.36, 0.075, -0.3, 7), hornM, body); h.position.set(s * 0.17, 0.3, 0.06); h.rotation.set(-0.15, 0, s * -0.55); h.scale.x = s;
    hornTipList.push(h);
  }
  const hornTips = bio.mat(hellC, 0x2a1418, 0.2, 0.2, 2.2);
  hornTipList.forEach(h => bioMesh(bioDots([[-0.104, 0.33, 0, -0.3, 1, 0, 0.024, 1]]), hornTips, h));
  // ember freckles on the belly
  const frM = bio.mat(hellC, furC, 0.3, 0.12, 2.0);
  const fr = []; for (let i = 0; i < 9; i++) { const a = -0.6 + (i % 3) * 0.6, y = -0.25 - Math.floor(i / 3) * 0.12; fr.push([Math.sin(a) * 0.7, y, Math.cos(a) * 0.9, 0.035, 0.4]); }
  bioMesh(bioDots(fr, R * 1.02, R * 1.02, R * 1.02), frM, body).scale.setScalar(R * 1.02);

  // bat wings
  const wsh = new THREE.Shape();
  wsh.moveTo(0, 0.06); wsh.lineTo(0.3, 0.32); wsh.lineTo(0.8, 0.36);
  wsh.quadraticCurveTo(0.66, 0.2, 0.74, 0.04); wsh.quadraticCurveTo(0.56, -0.02, 0.56, -0.16); wsh.quadraticCurveTo(0.38, -0.12, 0.3, -0.26);
  wsh.quadraticCurveTo(0.16, -0.08, 0, -0.08); wsh.lineTo(0, 0.06);
  const memGeo = slabGeo(wsh, 0.012, 0);
  const bones = mergeGeos([[V3(0, 0, 0), V3(0.3, 0.32, 0)], [V3(0.3, 0.32, 0), V3(0.8, 0.36, 0)], [V3(0.3, 0.32, 0), V3(0.74, 0.04, 0)], [V3(0.3, 0.32, 0), V3(0.56, -0.16, 0)], [V3(0.3, 0.32, 0), V3(0.3, -0.26, 0)]]
    .map(([a, b], i) => [strutGeo(a, b, i === 0 ? 0.03 : 0.018, 0.008, 5), null]));
  const claw = new THREE.ConeGeometry(0.02, 0.07, 5);
  const wings = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.2, 0.12, -0.24); sh.scale.x = s; body.add(sh);
    const w = new THREE.Group(); w.rotation.order = 'YXZ'; sh.add(w);
    mesh(memGeo, memM, w); mesh(bones, boneM, w);
    const c = mesh(claw, hornM, w); c.position.set(0.32, 0.38, 0); c.rotation.z = -0.3;
    wings.push(w);
  }
  // tail with a spade tip
  const tailG = new THREE.Group(); tailG.position.set(0, -0.15, -0.32); body.add(tailG);
  const tpts = [V3(0, 0, 0), V3(0, -0.12, -0.15), V3(0, -0.1, -0.32), V3(0, 0.05, -0.45)];
  const tailCurve = new THREE.CatmullRomCurve3(tpts);
  mesh(new THREE.TubeGeometry(tailCurve, 12, 0.022, 6), boneM, tailG);
  const spSh = new THREE.Shape(); spSh.moveTo(0, -0.02); spSh.quadraticCurveTo(0.09, 0.0, 0.0, 0.14); spSh.quadraticCurveTo(-0.09, 0.0, 0, -0.02);
  const spade = mesh(slabGeo(spSh, 0.025, 0.5), hornM, tailG); spade.position.copy(tpts[3]); spade.rotation.set(-0.5, 0, 0);
  // stubby feet and arms
  const feet = [];
  for (const s of [-1, 1]) {
    const f = mesh(new THREE.SphereGeometry(0.085, 12, 8), furM, hopG); f.scale.set(1, 0.6, 1.35); f.position.set(s * 0.15, 0.05, 0.05);
    for (const k of [-1, 0, 1]) { const c = mesh(new THREE.ConeGeometry(0.014, 0.05, 4), hornM, f); c.position.set(k * 0.04, -0.02, 0.1); c.rotation.x = Math.PI / 2; c.scale.set(1, 1, 1.6); }
    feet.push(f);
  }
  const armL = new THREE.Group(); armL.position.set(-0.32, 0.0, 0.08); body.add(armL);
  mesh(new THREE.SphereGeometry(0.075, 10, 8), furM, armL).scale.set(1, 1.3, 1);
  const armR = new THREE.Group(); armR.position.set(0.38, 0.0, 0.1); body.add(armR);
  mesh(new THREE.SphereGeometry(0.075, 10, 8), furM, armR).scale.set(1, 1.3, 1);
  // the trident
  const tri = new THREE.Group(); tri.position.set(0.04, -0.03, 0.03); armR.add(tri);
  mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.15, 6), ironM, tri).position.y = 0.17;
  const head = new THREE.Group(); head.position.y = 0.75; tri.add(head);
  const pr = [[strutGeo(V3(-0.13, 0, 0), V3(0.13, 0, 0), 0.02, 0.02, 5), null]];
  for (const x of [-0.12, 0, 0.12]) {
    pr.push([strutGeo(V3(x * (x ? 1 : 0), 0, 0), V3(x * 1.1, x ? 0.2 : 0.26, 0), 0.016, 0.014, 5), null]);
    const c = new THREE.ConeGeometry(0.035, 0.1, 4); pr.push([c, M4(x * 1.1, (x ? 0.2 : 0.26) + 0.05, 0, 0, 0, -x * 0.6)]);
    const b = new THREE.ConeGeometry(0.02, 0.05, 4); pr.push([b, M4(x * 1.1 + 0.022, (x ? 0.2 : 0.26) + 0.01, 0, 0, 0, Math.PI - 0.5)]);
  }
  mesh(mergeGeos(pr), ironM, head);
  const hellM = bio.mat(hellC, 0x5a1a10, 0.6, 0.6, 2.4);
  bioMesh(bioDots([[-0.132, 0.18, 0, -0.5, 1, 0, 0.02, 1], [0, 0.24, 0, 0, 1, 0, 0.02, 1], [0.132, 0.18, 0, 0.5, 1, 0, 0.02, 1]]), hellM, head);
  const flames = [];
  const fMat = addM(0xff7020, 0.9), fMat2 = addM(0xffd060, 0.9);
  for (const x of [-0.132, 0, 0.132]) {
    const f = noOut(mesh(flameGeo(0.22, 0.045, 0.05), fMat, head)); f.position.set(x, (x ? 0.24 : 0.31), 0);
    const f2 = noOut(mesh(flameGeo(0.13, 0.025, 0.03), fMat2, f)); f2.position.y = 0.01;
    flames.push(f);
  }
  const hellGlow = bio.sprite(glowSprite(hellC, 0.8, 0.6), 0.6, 0.25); hellGlow.position.y = 0.28; head.add(hellGlow);

  finish(root, 0.012);
  applyScale(root, opts);
  bio.glow(0);
  const flashF = makeFlash([furM, tipM, bellyM, memM]);
  let T = rnd() * 10, ph = rnd() * TAU, wu = 0, at = 0, fly = 0, blink = 0, nextBlink = 1.5, flapBurst = 0;
  const anim = {
    root, mats: [furM, tipM, bellyM], glow: bio.glow, flash: flashF,
    animate(dt, st = {}) {
      T += dt;
      const sp = st.speed || 0;
      wu = damp(wu, st.windup || 0, 10, dt); at = damp(at, st.attack || 0, 16, dt);
      fly = damp(fly, st.airborne || sp > 3 ? 1 : 0, 4, dt);
      flapBurst = Math.max(0, flapBurst - dt); if (fly < 0.1 && rnd() < dt * 0.25) flapBurst = 0.9;
      const fast = Math.max(fly, flapBurst > 0 ? 0.6 : 0);
      ph += dt * lerp(2.2, 13, fast);
      const flap = Math.sin(ph);
      wings.forEach(w => {
        w.rotation.y = 0.55 - fast * 0.35 + flap * lerp(0.12, 0.5, fast) - wu * 0.2;
        w.rotation.z = 0.25 + flap * lerp(0.08, 0.6, fast) + wu * 0.2;
        w.rotation.x = -0.25;
      });
      // hop along the ground; hover when flying
      const hop = (1 - fly) * (sp > 0.2 ? Math.abs(Math.sin(T * 7)) * 0.12 : Math.abs(Math.sin(T * 2.2)) * 0.015);
      hopG.position.y = hop + fly * (0.55 + Math.sin(ph) * 0.06);
      body.scale.set(1 + (hop > 0.01 ? 0 : 0.02), 1 - (1 - fly) * 0.03 * Math.cos(T * 4.4), 1);
      body.rotation.x = Math.min(sp, 6) * 0.03 + at * 0.25 - wu * 0.15;
      body.rotation.z = Math.sin(T * 1.1) * 0.05;
      feet.forEach((f, i) => { f.position.y = 0.05 + fly * (0.12 + Math.sin(ph + i) * 0.03); f.position.z = 0.05 + (sp > 0.2 ? Math.sin(T * 7 + i * Math.PI) * 0.06 : 0); });
      tailG.rotation.y = Math.sin(T * 2.3) * 0.5; tailG.rotation.x = Math.sin(T * 1.7) * 0.15 - fly * 0.3;
      // trident: idle upright, windup raised back, attack thrust forward
      armR.rotation.x = lerp(0, -1.0, wu) + at * 2.2 + Math.sin(T * 1.4) * 0.05;
      armR.position.z = 0.1 + at * 0.15;
      armL.rotation.x = Math.sin(T * 1.2) * 0.2 - wu * 0.4;
      // hell-fire: a lick at rest, roaring when it means it
      const heat = 0.25 + wu * 0.9 + at * 0.9;
      flames.forEach((f, i) => { const s = heat * (1 + Math.sin(T * 17 + i * 2) * 0.2); f.scale.set(0.8 + heat * 0.4, s, 0.8 + heat * 0.4); f.visible = heat > 0.05; });
      fMat.opacity = 0.5 + 0.4 * clamp01(heat); fMat2.opacity = fMat.opacity;
      hellGlow.scale.setScalar(0.6 + heat * 0.9);
      // blink, and a wicked squint when winding up
      nextBlink -= dt; if (nextBlink < 0) { blink = 1; nextBlink = 2 + rnd() * 3; }
      blink = Math.max(0, blink - dt * 8);
      eyes.forEach(g => { g.scale.y = (1 - Math.sin(blink * Math.PI) * 0.9) * (1 - wu * 0.3); });
    },
  };
  anim.animate(0.016, {});
  return anim;
}

/* =================================================================
   VYRENALUR — "light shadow": ≈4 m at the shoulder, ≈7.5 m long,
   ≈10 m to the antler crown. A body of shadow whose hide is dappled
   with drifting light, antlers of pure light trailing sunbeam threads.
   opts.fade (0..1) — how far it has slipped into the shadows (also
   settable live via st.fade). st: windup = lowers the crown to charge,
   antlers blaze; attack = lunge with a burst of light.
   ================================================================= */
export function buildVyrenalur(opts = {}) {
  const root = new THREE.Group();
  const rnd = rngFor(opts, 21);
  const bio = bioKit();
  const shadowC = new THREE.Color(opts.color ?? 0x1e1c34);
  const lightC = opts.light ?? 0xffe8a8;
  const hideM = mat(shadowC, { emissive: 0x241c48, emissiveIntensity: 0.25 });
  const deepM = mat(shadowC.clone().multiplyScalar(0.6), { emissive: 0x241c48, emissiveIntensity: 0.15 });
  const hoofM = mat(0x121020);
  const antlerM = bio.basic(basicM(lightC), 0.9, 0xfff4d0);
  const body = new THREE.Group(); body.position.y = 4.1; root.add(body);

  // torso, shoulders, haunches
  const SX = 1.05, SY = 1.15, SZ = 2.6;
  const torso = mesh(new THREE.SphereGeometry(1, 24, 16), hideM, body); torso.scale.set(SX, SY, SZ);
  const chest = mesh(new THREE.SphereGeometry(1, 20, 14), hideM, body); chest.scale.set(1.15, 1.35, 1.2); chest.position.set(0, 0.25, 1.7);
  const hips = mesh(new THREE.SphereGeometry(1, 20, 14), hideM, body); hips.scale.set(1.05, 1.15, 1.1); hips.position.set(0, 0.15, -1.75);
  // dappled light: discs of sunlight on the hide that drift as if under a moving canopy
  const dapM = [0, 1, 2].map(i => bio.mat(lightC, shadowC, 0.75, 0.55, 2.0));
  const dapples = [];
  const addDapples = (part, sx, sy, sz, count) => {
    for (let k = 0; k < 3; k++) {
      const L = [];
      for (let i = 0; i < count; i++) {
        const y = rnd() * 1.6 - 0.45, a = rnd() * TAU, rr = Math.sqrt(Math.max(0, 1 - y * y));
        L.push([Math.cos(a) * rr, y, Math.sin(a) * rr, 0.03 + Math.pow(rnd(), 2) * 0.14, 0.2]);
      }
      const holder = new THREE.Group(); part.add(holder);
      bioMesh(bioDots(L, sx, sy, sz, 8), dapM[k], holder);
      dapples.push({ holder, sp: (rnd() - 0.5) * 0.12, ph: rnd() * TAU, axis: k });
    }
  };
  addDapples(torso, SX, SY, SZ, 11); addDapples(chest, 1.15, 1.35, 1.2, 6); addDapples(hips, 1.05, 1.15, 1.1, 6);

  // neck & head
  const neckBase = V3(0, 0.6, 2.1), headPos = V3(0, 2.5, 3.75);
  const neck = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([neckBase, V3(0, 1.4, 2.75), V3(0, 2.1, 3.35), headPos]), 12, 0.72, 12), hideM, body);
  neck.geometry.computeVertexNormals();
  const { array: na } = neck.geometry.attributes.position; // taper the neck toward the head
  for (let i = 0; i < na.length; i += 3) {
    const t = clamp01((na[i + 1] - 0.6) / 1.9), c = new THREE.Vector3(0, na[i + 1], 0);
    const cz = lerp(2.1, 3.75, t), k = lerp(1.15, 0.7, t);
    na[i] *= k; na[i + 2] = cz + (na[i + 2] - cz) * k; c.set(0, 0, 0);
  }
  neck.geometry.computeVertexNormals();
  const headG = new THREE.Group(); headG.position.copy(headPos); headG.scale.setScalar(1.2); body.add(headG);
  const skull = mesh(new THREE.SphereGeometry(1, 20, 14), hideM, headG); skull.scale.set(0.5, 0.55, 0.92); skull.position.set(0, 0.1, 0.2);
  const snout = mesh(new THREE.SphereGeometry(1, 16, 12), deepM, headG); snout.scale.set(0.3, 0.33, 0.85); snout.position.set(0, -0.22, 0.95); snout.rotation.x = 0.4;
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.16, 0.7, 6), hideM, headG); ear.position.set(s * 0.48, 0.45, -0.1); ear.rotation.set(-0.4, 0, s * -1.0); ear.scale.z = 0.5;
  }
  // eyes of light, no pupils
  const eyeM = bio.basic(basicM(0xfff6d8), 0.95);
  for (const s of [-1, 1]) {
    const e = noOut(mesh(new THREE.SphereGeometry(0.1, 10, 8), eyeM, headG)); e.scale.set(0.6, 0.8, 1.4); e.position.set(s * 0.46, 0.18, 0.5); e.rotation.y = s * 0.3;
    const g = bio.sprite(glowSprite(0xfff0c0, 0.8, 0.8), 0.8, 0.3); g.position.set(s * 0.52, 0.18, 0.55); headG.add(g);
  }
  // a stripe of light down the face, a line along the spine
  const lineM = bio.mat(lightC, shadowC, 0.75, 0.6, 2.2);
  const face = []; for (let i = 0; i < 6; i++) face.push([0, 0.62 - i * 0.12, 0.6 + i * 0.14, 0, 1, 0.3 + i * 0.1, 0.06 - i * 0.005, 0.3]);
  bioMesh(bioDots(face), lineM, headG);
  const spine = []; for (let i = 0; i < 16; i++) { const z = 1.9 - i * 0.26, y = Math.sqrt(Math.max(0, 1 - (z / SZ) ** 2)) * SY + (z > 1.0 ? 0.3 : z < -1.2 ? 0.1 : 0.05); spine.push([0, y, z, 0, 1, 0, 0.07, 0.3]); }
  bioMesh(bioDots(spine), lineM, body);

  // the antler crown: branching light, mirrored
  const tips = [];
  const branch = (list, p, dir, len, r, depth) => {
    const end = p.clone().addScaledVector(dir, len);
    list.push([strutGeo(p, end, r, r * 0.7, 5), null]);
    if (depth === 0) { tips.push(end); return; }
    const kids = depth > 2 ? 2 : 2 + (rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < kids; i++) {
      const d = dir.clone();
      const ang = (i - (kids - 1) / 2) * 0.75 + (rnd() - 0.5) * 0.3;
      d.applyAxisAngle(V3(0, 0, 1), ang * 0.9 - 0.15).applyAxisAngle(V3(1, 0, 0), (rnd() - 0.5) * 0.7 - 0.15).normalize();
      d.y += 0.12; d.normalize();
      branch(list, end, d, len * (0.68 + rnd() * 0.12), r * 0.68, depth - 1);
    }
  };
  const antlerList = [];
  branch(antlerList, V3(0.22, 0.5, 0.0), V3(1.0, 0.8, -0.3).normalize(), 1.3, 0.13, 4);
  const antlerGeo = mergeGeos(antlerList);
  const antlerTips = tips.slice();
  const crowns = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.scale.x = s; headG.add(g);
    noOut(mesh(antlerGeo, antlerM, g));
    crowns.push(g);
  }
  // sunbeam threads hanging from the tips and halos on them
  const threads = [], halos = [];
  const threadM = addM(lightC, 0.35);
  antlerTips.forEach((p, i) => {
    for (const s of [-1, 1]) {
      if (i % 2 === 0) {
        const len = 1.5 + rnd() * 2.5;
        const t = noOut(new THREE.Mesh(new THREE.PlaneGeometry(0.06, len), threadM)); t.geometry.translate(0, -len / 2, 0);
        t.position.set(p.x * s, p.y, p.z); headG.add(t);
        threads.push({ t, ph: rnd() * TAU });
      }
      const h = bio.sprite(glowSprite(lightC, 0.7 + rnd() * 0.4, 0.8), 0.8, 0.35); h.position.set(p.x * s, p.y, p.z); headG.add(h); halos.push(h);
    }
  });
  const crownGlow = bio.sprite(glowSprite(lightC, 6, 0.35), 0.35, 0.15); crownGlow.position.set(0, 2.6, -0.3); headG.add(crownGlow);

  // long legs: upper + lower + hoof with a ring of light at the fetlock
  const legs = [];
  const legDefs = [[-0.62, 0.0, 1.75, 0], [0.62, 0.0, 1.75, 1], [-0.6, 0.0, -1.85, 2], [0.6, 0.0, -1.85, 3]];
  const ringM = bio.mat(lightC, shadowC, 0.7, 0.5, 2.2);
  const GAIT = [0.5 * Math.PI, 1.5 * Math.PI, 0, Math.PI];
  for (const [x, y, z, i] of legDefs) {
    const hip = new THREE.Group(); hip.position.set(x, y - 0.2, z); body.add(hip);
    const hind = i >= 2;
    const up = mesh(new THREE.CylinderGeometry(hind ? 0.42 : 0.36, 0.2, 2.0, 10), hideM, hip); up.position.y = -1.0;
    const knee = new THREE.Group(); knee.position.y = -2.0; hip.add(knee);
    mesh(new THREE.SphereGeometry(0.21, 10, 8), hideM, knee);
    const lo = mesh(new THREE.CylinderGeometry(0.17, 0.12, 1.75, 8), deepM, knee); lo.position.y = -0.875;
    const hoof = mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.22, 8), hoofM, knee); hoof.position.y = -1.8;
    bioMesh(new THREE.TorusGeometry(0.16, 0.04, 5, 14).rotateX(Math.PI / 2), ringM, knee, 0, -1.6, 0);
    legs.push({ hip, knee, ph: GAIT[i], hind });
  }
  // tail of shadow and light
  const tailG = new THREE.Group(); tailG.position.set(0, 0.6, -2.6); body.add(tailG);
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0, -0.4, -0.7), V3(0, -1.4, -1.1), V3(0, -2.4, -1.2)]), 10, 0.16, 6), deepM, tailG);
  const tailTip = bio.sprite(glowSprite(lightC, 1.0, 0.6), 0.6, 0.2); tailTip.position.set(0, -2.5, -1.2); tailG.add(tailTip);
  // shadow wisps: soft dark smoke peeling off its back and legs
  const wisps = [];
  for (let i = 0; i < 12; i++) {
    const s = glowSprite(0x0a0818, 1.6 + rnd() * 1.6, 0.4); s.material.blending = THREE.NormalBlending; body.add(s);
    wisps.push({ s, x: (rnd() - 0.5) * 1.6, y: 0.6 + rnd() * 1.0, z: 2 - rnd() * 4.6, ph: rnd() * TAU, base: 0.25 + rnd() * 0.2 });
  }
  // motes of light drifting round it
  const motes = [];
  for (let i = 0; i < 14; i++) {
    const s = bio.sprite(glowSprite(lightC, 0.25 + rnd() * 0.2, 0.9), 0.9, 0.4); root.add(s);
    motes.push({ s, r: 2.5 + rnd() * 3.5, y: 1 + rnd() * 7, ph: rnd() * TAU, sp: 0.1 + rnd() * 0.25 });
  }

  finish(root, 0.05);
  applyScale(root, opts);
  bio.glow(0);
  const flashF = makeFlash([hideM, deepM]);
  let T = rnd() * 10, gait = 0, wu = 0, at = 0, fade = opts.fade ?? 0, burst = 0;
  const anim = {
    root, mats: [hideM, deepM], glow: bio.glow, flash: flashF,
    animate(dt, st = {}) {
      T += dt;
      const sp = st.speed || 0;
      wu = damp(wu, st.windup || 0, 8, dt); at = damp(at, st.attack || 0, 14, dt);
      if (st.fade !== undefined) fade = damp(fade, st.fade, 3, dt);
      if ((st.attack || 0) > 0.6) burst = 1; burst = Math.max(0, burst - dt * 2);
      // stately walk
      const walk = clamp01(sp / 2);
      gait += dt * (0.6 + sp * 0.55);
      for (const L of legs) {
        const p = gait * 1.0 + L.ph, s = Math.sin(p) * 0.38 * walk;
        L.hip.rotation.x = s + (L.hind ? -0.08 : 0.04) + (L.hind ? wu * 0.25 : -wu * 0.15);
        L.knee.rotation.x = (L.hind ? -1 : 1) * Math.max(0, Math.cos(p)) * 0.55 * walk + (L.hind ? -0.12 : 0.1) + (L.hind ? -wu * 0.25 : wu * 0.3);
      }
      body.position.y = 4.1 - Math.abs(Math.sin(gait)) * 0.08 * walk + Math.sin(T * 0.9) * 0.03 - wu * 0.05;
      body.rotation.x = wu * 0.08 - at * 0.06;
      body.position.z = at * 1.6;
      // head: grazes and listens; lowers the crown to charge
      headG.rotation.x = Math.sin(T * 0.37) * 0.08 + wu * 1.0 - at * 0.15;
      headG.rotation.y = Math.sin(T * 0.23) * 0.25 * (1 - wu);
      headG.position.y = 3.0 - wu * 1.1; headG.position.z = 3.9 + wu * 0.4 + at * 0.4;
      tailG.rotation.x = Math.sin(T * 0.8) * 0.12; tailG.rotation.y = Math.sin(T * 0.55) * 0.3;
      // dappled light drifts over the hide, each set on its own pulse
      for (const D of dapples) {
        D.holder.rotation.x = Math.sin(T * 0.11 + D.ph) * 0.25;
        D.holder.rotation.y = T * D.sp + D.ph;
      }
      const v = bio.v, lit = 1 - fade * 0.85;
      dapM.forEach((m, i) => { const b = m.userData.bio; m.emissiveIntensity = (b[0] + (b[1] - b[0]) * v) * (0.55 + 0.45 * Math.sin(T * 0.7 + i * 2.1)) * lit; });
      // the crown of light breathes, blazes on a charge
      const blaze = 1 + wu * 0.7 + at * 0.6 + burst;
      crownGlow.material.opacity = (0.15 + v * 0.25) * blaze * lit * (0.85 + Math.sin(T * 1.3) * 0.15);
      crownGlow.scale.setScalar(6 * (0.8 + blaze * 0.3));
      halos.forEach((h, i) => { h.material.opacity = h.userData.op * (h.userData.day + (1 - h.userData.day) * v) * (0.7 + 0.3 * Math.sin(T * 2 + i)) * blaze * lit; });
      threads.forEach(t => { t.t.rotation.z = Math.sin(T * 0.7 + t.ph) * 0.08; t.t.rotation.x = Math.sin(T * 0.5 + t.ph) * 0.06; });
      threadM.opacity = (0.18 + 0.2 * v) * (0.7 + 0.3 * Math.sin(T * 0.9)) * lit;
      antlerM.color.copy(antlerM.userData.c0).multiplyScalar(antlerM.userData.lo).lerp(antlerM.userData.c1, v).multiplyScalar(lerp(1, 0.35, fade) * (1 + burst * 0.3));
      // shadow wisps peel away and re-form
      for (const w of wisps) {
        const k = (T * 0.25 + w.ph / TAU) % 1;
        w.s.position.set(w.x * (1 + k * 0.5), w.y + k * 1.4, w.z - k * 1.2 - Math.min(sp, 4) * k * 0.5);
        w.s.material.opacity = Math.sin(k * Math.PI) * w.base * (0.35 + bio.v * 0.4 + fade * 0.9);
        w.s.scale.setScalar(1.6 + k * 2.4 + fade * 1.5);
      }
      for (const m of motes) {
        const a = T * m.sp + m.ph;
        m.s.position.set(Math.cos(a) * m.r, m.y + Math.sin(T * 0.5 + m.ph) * 0.6, Math.sin(a) * m.r + 1);
      }
    },
  };
  anim.animate(0.016, {});
  return anim;
}

/* =================================================================
   AEROLHORN — vast sky leviathan, the form Noka wears: ≈150 m span,
   ≈75 m body + ≈60 m tail, a ≈30 m spiral horn, tendrils trailing
   50–90 m below (they snake down further with st.reach / windup /
   attack). Root origin = the body; place it high (300 m+) and let fog
   turn it to a silhouette. st.reach 0..1 = tendrils reach for the ground.
   ================================================================= */
export function buildAerolhorn(opts = {}) {
  const root = new THREE.Group();
  const rnd = rngFor(opts, 31);
  const bio = bioKit();
  const top = new THREE.Color(opts.color ?? 0x2c3654), belly = new THREE.Color(opts.belly ?? 0x6a7494);
  const skinM = mat(0xffffff, { vertexColors: true });
  const hornM = mat(0xe6dcc2), crownM = mat(0xb8ad94);
  const starC = opts.glow ?? 0xbfeaff;
  const starM = bio.mat(starC, top, 0.35, 0.15, 2.6);
  const body = new THREE.Group(); root.add(body);

  // the body: a long whale-like lathe along z
  const prof = [[0.3, -42], [3.5, -36], [7.5, -24], [10.5, -10], [11.5, 2], [10.6, 14], [8.6, 23], [6.2, 29], [3.6, 32.5], [0.4, 34]];
  const bodyGeo = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), 24);
  bodyGeo.rotateX(Math.PI / 2); bodyGeo.scale(1.15, 0.78, 1);
  countershade(bodyGeo, top, belly, -0.1, 0.4);
  mesh(bodyGeo, skinM, body);
  // a keel ridge of plates down the back
  const ridge = [];
  for (let i = 0; i < 9; i++) { const z = 22 - i * 6.5, s = 1 - i * 0.07; ridge.push([new THREE.ConeGeometry(1.6 * s, 4.5 * s, 4), M4(0, 8.4 - Math.abs(z + 2) * 0.06 - (z > 12 ? (z - 12) * 0.18 : 0), z, -1.0, Math.PI / 4, 0, 1, 1, 2)]); }
  mesh(mergeGeos(ridge), crownM, body);
  // the great horn: long, spiral, slightly rising; crown horns swept back
  const horn = mesh(hornGeo(30, 2.6, 0, 8, 5.5), hornM, body); horn.rotation.x = Math.PI / 2 - 0.12; horn.position.set(0, 1.0, 32.5);
  for (const s of [-1, 1]) {
    const c = mesh(hornGeo(20, 1.6, 0.35, 7, 2), crownM, body);
    c.position.set(s * 4.5, 4.5, 26); c.rotation.set(-Math.PI / 2 + 0.25, 0, s * -0.45); c.scale.x = -s;
    const c2 = mesh(hornGeo(11, 1.0, 0.3, 6, 1), crownM, body);
    c2.position.set(s * 6.5, 1.5, 22); c2.rotation.set(-Math.PI / 2 + 0.05, 0, s * -0.9); c2.scale.x = -s;
  }
  // small pale eyes
  for (const s of [-1, 1]) {
    const e = bio.sprite(glowSprite(starC, 4, 0.9), 0.9, 0.35); e.position.set(s * 6.4, 1.5, 27); body.add(e);
    mesh(new THREE.SphereGeometry(0.9, 8, 6), basicM(0xe8f6ff), body).position.set(s * 6.3, 1.5, 27);
  }

  // wings: inner panel + outer hand with long fingered vanes
  const wingGeo = (pts, depth) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => sh.lineTo(p[0], p[1])); const g = slabGeo(sh, depth, 0.3, 2); g.rotateX(Math.PI / 2); return countershade(g, top, belly, -0.1, 0.3); };
  // shapes in (x out, -z back) → after rotateX(-90°) a shape y maps to world -z… use +y = forward
  const inGeo = wingGeo([[0, 16], [18, 13], [34, 8], [34, -3], [24, -9], [12, -15], [0, -20]], 1.4);
  const handGeo = wingGeo([[0, 7], [12, 5], [18, 2], [16, -4], [6, -5], [0, -3]], 1.0);
  const vane = (len, w) => wingGeo([[0, w], [len * 0.7, w * 0.8], [len, 0], [len * 0.7, -w * 0.8], [0, -w]], 0.7);
  const vanes = [[36, 2.3, -0.08, 4], [40, 2.3, 0.06, 2.5], [38, 2.2, 0.2, 1], [34, 2.1, 0.36, -0.5], [29, 2.0, 0.52, -2], [24, 1.9, 0.7, -3], [19, 1.8, 0.9, -3.5]];
  const handParts = [[handGeo, null]];
  vanes.forEach(([len, w, ang, z]) => handParts.push([vane(len, w), M4(12, 0, z, 0, ang, 0)]));
  const handAll = mergeGeos(handParts);
  { // re-shade the merged hand (mergeGeos dropped colours)
    countershade(handAll, top, belly, -0.1, 0.3); }
  const wings = [];
  const edgeDots = (x0, z0, x1, z1, n, r, y) => { const L = []; for (let i = 0; i < n; i++) { const t = i / (n - 1); L.push([lerp(x0, x1, t), y, lerp(z0, z1, t), 0, -1, 0, r, 0.4], [lerp(x0, x1, t), -y, lerp(z0, z1, t), 0, 1, 0, r, 0.4]); } return bioDots(L); };
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 9.5, 1.5, 4); sh.scale.x = s; body.add(sh);
    const arm = new THREE.Group(); arm.rotation.order = 'YXZ'; sh.add(arm);
    mesh(inGeo, skinM, arm);
    bioMesh(edgeDots(3, -17, 30, -8, 9, 0.7, 0.75), starM, arm);
    bioMesh(edgeDots(4, 14, 32, 6.5, 9, 0.55, 0.75), starM, arm);
    const hand = new THREE.Group(); hand.position.set(33, 0, 0); arm.add(hand);
    mesh(handAll, skinM, hand);
    { const L = []; vanes.forEach(([len, w, ang, z]) => { for (let k = 1; k <= 3; k++) { const d = 12 + Math.cos(ang) * len * k / 4, zz = z - Math.sin(ang) * len * k / 4; L.push([d, -0.45, zz, 0, -1, 0, 0.55, 0.4]); } }); bioMesh(bioDots(L), starM, hand); }
    wings.push({ arm, hand });
  }
  // the tail: a long undulating tube with a fan of three flukes
  const tailLen = 62;
  const tail = new DeformTube(24, 12, t => 3.6 * Math.pow(1 - t, 1.2) + 0.5, { frame: 'up' });
  tail.mesh(mat(0xffffff, { color: top.clone().lerp(belly, 0.25) }), body);
  const fan = new THREE.Group(); body.add(fan);
  const fl = wingGeo([[0, 1.5], [7, 3], [16, 0], [7, -3], [0, -1.5]], 0.7);
  const flukes = mergeGeos([[fl, M4(0, 0, 0, 0, -Math.PI / 2, 0)], [fl, M4(0, 0, 0, 0, -Math.PI / 2 - 0.55, 0)], [fl, M4(0, 0, 0, 0, -Math.PI / 2 + 0.55, 0)]]);
  countershade(flukes, top, belly);
  mesh(flukes, skinM, fan);
  // the tendrils: a beard beneath the body, glowing at the tips
  const tendrilM = mat(0xffffff, { color: belly.clone().lerp(top, 0.35), emissive: starC, emissiveIntensity: 0.0 });
  const tipM = bio.mat(starC, belly, 0.5, 0.25, 2.4);
  const tendrils = [];
  const nT = opts.tendrils ?? 12;
  for (let i = 0; i < nT; i++) {
    const a = i / nT * TAU, x = Math.cos(a) * 5.5, z = 4 + Math.sin(a) * 14 + (rnd() - 0.5) * 3;
    const len = 50 + rnd() * 40, r0 = 1.0 + rnd() * 0.5;
    const tube = new DeformTube(22, 6, t => r0 * (1 - t * 0.85) + 0.12);
    tube.mesh(tendrilM, body);
    const tip = bio.sprite(glowSprite(starC, 6, 0.9), 0.9, 0.25); body.add(tip);
    const bead = bioMesh(new THREE.SphereGeometry(0.5, 6, 5), tipM, body);
    tendrils.push({ tube, x, y: -7.5, z, len, ph: rnd() * TAU, fr: 0.25 + rnd() * 0.2, tip, bead, side: Math.sign(x) || 1 });
  }
  // stars along the back
  { const L = []; for (let i = 0; i < 18; i++) { const z = 30 - i * 3.6; for (const s of [-1, 1]) L.push([s * (3.5 + Math.sin(i * 0.9) * 1.2), 8.2 - Math.abs(z) * 0.06 - (z > 20 ? (z - 20) * 0.3 : 0), z, s * 0.5, 1, 0, 0.6, 0.4]); } bioMesh(bioDots(L), starM, body); }

  finish(root, opts.outline ?? 0.4);
  applyScale(root, opts);
  bio.glow(0);
  const flashF = makeFlash([skinM, hornM]);
  let T = rnd() * 50, ph = rnd() * TAU, reach = 0, wu = 0, at = 0;
  const _q = new THREE.Vector3();
  const anim = {
    root, mats: [skinM, hornM], glow: bio.glow, flash: flashF,
    animate(dt, st = {}) {
      T += dt;
      const sp = st.speed || 0;
      wu = damp(wu, st.windup || 0, 3, dt); at = damp(at, st.attack || 0, 4, dt);
      reach = damp(reach, Math.max(st.reach || 0, wu * 0.7, at), 0.8, dt);
      // slow, enormous wingbeats
      ph += dt * TAU / 9;
      const beat = Math.sin(ph);
      wings.forEach(w => {
        w.arm.rotation.z = 0.05 + beat * 0.26;
        w.arm.rotation.y = Math.sin(ph + 0.6) * 0.04;
        w.hand.rotation.z = Math.sin(ph - 0.9) * 0.22 + 0.04;
        w.hand.rotation.y = 0.02;
      });
      body.position.y = -beat * 3.2;
      body.rotation.x = Math.sin(ph - 0.4) * 0.025 + reach * 0.12;
      body.rotation.z = Math.sin(T * 0.07) * 0.04;
      // tail undulates on the beat
      { const P = tail.pts, n = P.length;
        for (let i = 0; i < n; i++) { const t = i / (n - 1); P[i].set(Math.sin(T * 0.25 - t * 2.5) * 4 * t, 0.5 + Math.sin(ph - 1.2 - t * 3) * 6 * t, -38 - t * tailLen); }
        tail.update();
        const a = P[n - 1], b = P[n - 2]; fan.position.copy(a); _q.subVectors(a, b).normalize();
        fan.quaternion.setFromUnitVectors(V3(0, 0, -1), _q); }
      // tendrils trail, sway, snake down when it reaches
      const drag = 0.25 + Math.min(sp, 40) * 0.01;
      for (const tn of tendrils) {
        const P = tn.tube.pts, n = P.length, L = tn.len * (1 + reach * 1.3);
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1), d = t * L;
          const sw = Math.sin(T * tn.fr * 2 + tn.ph - t * 5) * (2 + t * 7);
          const coil = reach * Math.sin(T * 0.8 + tn.ph - t * 9) * 3 * t;
          P[i].set(tn.x + sw * 0.6 + coil + tn.side * t * 4, tn.y - d * (1 - drag * 0.3), tn.z - d * drag * (1 - reach * 0.8) + Math.cos(T * tn.fr + tn.ph - t * 4) * 3 * t + reach * t * 12);
        }
        tn.tube.update();
        tn.tip.position.copy(P[n - 1]); tn.bead.position.copy(P[n - 1]);
      }
      tendrilM.emissiveIntensity = reach * 0.5 + bio.v * 0.12;
    },
  };
  anim.animate(0.016, {});
  return anim;
}

/* =================================================================
   GREAT NEKH'VORRAN — a colossal ancient worm of darkness: ≈45 m
   long, body ≈3.8 m thick, the head rearing 4–14 m. Root origin is
   under the neck (head ahead to ≈+9 m, tail back to ≈−36 m).
   opts.saddle — Eikar riding saddle behind the head (bonded worms).
   opts.length — body length (default 45).
   st: speed = travelling S-wave; windup = rears high, jaws part,
       mind-pits blaze; attack = strikes down with the maw wide open.
   ================================================================= */
export function buildNekhVorran(opts = {}) {
  const root = new THREE.Group();
  const rnd = rngFor(opts, 41);
  const bio = bioKit();
  const L = opts.length ?? 45, RMAX = 1.9, SEGL = 1.7;
  const voidC = opts.glow ?? 0xa060ff;
  const darkC = new THREE.Color(opts.color ?? 0x221a2e);
  const radiusAt = t => {
    const s = t * L;
    const env = Math.min(1, 0.86 + s / 14 * 0.14) * Math.pow(1 - t, 0.55) * (t < 0.98 ? 1 : 0.6);
    const f = (s / SEGL) % 1, groove = 0.9 + 0.1 * Math.pow(Math.sin(Math.PI * f), 0.6);
    return RMAX * env * groove + 0.12;
  };
  const NS = Math.round(L / SEGL * 5);
  const tube = new DeformTube(NS, 16, radiusAt, { frame: 'up' });
  // painted skin: dark armoured back, banded paler belly, violet flank photophores
  const segs = L / SEGL;
  const skinMap = paintTex(1024, 64, (u, v) => {
    const ang = v * TAU, up = Math.sin(ang), side = Math.cos(ang);
    const sf = (u * segs) % 1, ring = Math.pow(Math.abs(Math.sin(Math.PI * sf)), 0.25);
    const n = fbm2(u * 120, v * 9, 4);
    let c = [34, 26, 46];
    if (up < -0.35) { const b = 0.75 + 0.25 * Math.abs(Math.sin(sf * Math.PI * 3)); c = [74 * b, 62 * b, 82 * b]; }
    else if (up < 0.1) c = [46, 36, 58];
    const k = (0.75 + n * 0.45) * (0.55 + 0.45 * ring);
    return [c[0] * k, c[1] * k, c[2] * k];
  });
  const emMap = paintTex(1024, 64, (u, v) => {
    const ang = v * TAU, up = Math.sin(ang), side = Math.cos(ang);
    const sf = (u * segs) % 1;
    let e = 0;
    // a photophore on each flank of each segment
    const dz = (sf - 0.5) * 3.0, dv = (Math.abs(up) - 0.0) * 4.5;
    if (Math.abs(side) > 0.6) e = Math.max(e, 1 - Math.hypot(dz, dv) / 0.75);
    // fine violet seam where the rings meet, on the belly
    if (up < -0.5 && (sf < 0.04 || sf > 0.96)) e = Math.max(e, 0.5);
    // duat cracks on the back
    const cr = Math.abs(fbm2(u * 40, v * 5, 11) - 0.5);
    if (up > 0.2 && cr < 0.006) e = Math.max(e, 0.6);
    e = clamp01(e * 1.2);
    return [255 * e, 255 * e, 255 * e];
  }, false);
  skinMap.repeat.set(1, 1); emMap.wrapS = THREE.RepeatWrapping;
  const skinM = mat(0xffffff, { map: skinMap, emissive: voidC, emissiveMap: emMap });
  bio.reg(skinM, 0.35, 2.4);
  tube.mesh(skinM, root);

  // dorsal armour: overlapping plates each with a back-swept fin-spine
  const plateM = mat(0x2a2236), finM = mat(0x3a2c4a);
  const plateEdgeM = bio.mat(voidC, 0x2a2236, 0.3, 0.2, 2.2);
  const plateGeo = (() => { const g = new THREE.SphereGeometry(1, 14, 8, 0, TAU, 0, Math.PI / 2); g.scale(1.25, 0.42, 0.95); return g; })();
  const finGeo = (() => { const sh = new THREE.Shape(); sh.moveTo(-0.5, 0); sh.quadraticCurveTo(-0.2, 1.0, -0.9, 2.1); sh.quadraticCurveTo(0.2, 1.0, 0.6, 0); sh.lineTo(-0.5, 0); const g = slabGeo(sh, 0.16, 0.5); g.rotateY(Math.PI / 2); return g; })();
  const plateDots = bioDots([[-0.9, 0.18, 0.55, -0.6, 1, 0.3, 0.07, 0.4], [0.9, 0.18, 0.55, 0.6, 1, 0.3, 0.07, 0.4], [-1.1, 0.08, 0.1, -0.8, 1, 0, 0.06, 0.4], [1.1, 0.08, 0.1, 0.8, 1, 0, 0.06, 0.4]]);
  const plates = [];
  for (let s = 4.5; s < L - 4; s += 2.2) {
    const g = new THREE.Group(); root.add(g);
    const r = radiusAt(s / L) / RMAX;
    const inner = new THREE.Group(); inner.scale.setScalar(Math.max(0.35, r) * 1.45); g.add(inner);
    mesh(plateGeo, plateM, inner);
    const fh = 0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, s / (L * 0.8)));
    const fin = mesh(finGeo, finM, inner); fin.position.y = 0.3; fin.scale.set(1, fh, fh);
    bioMesh(plateDots, plateEdgeM, inner);
    plates.push({ g, s });
  }
  // the head: an armoured wedge, three jaws round a ring of teeth and a glowing throat
  const head = new THREE.Group(); root.add(head);
  const hp = [[0.001, -0.5], [1.85, -0.2], [2.15, 1.0], [2.0, 2.2], [1.6, 3.1], [1.2, 3.5], [0.001, 3.55]];
  const hg = new THREE.LatheGeometry(hp.map(([r, z]) => new THREE.Vector2(r, z)), 18); hg.rotateX(Math.PI / 2); hg.scale(1.05, 0.9, 1);
  const headM = mat(0x1e1828);
  mesh(hg, headM, head);
  const crest = mesh(hornGeo(4.5, 1.1, 0.0, 5), plateM, head); crest.rotation.x = -Math.PI / 2 - 0.35; crest.position.set(0, 1.4, 2.2); crest.scale.set(1.6, 1, 0.5);
  for (const s of [-1, 1]) { const h = mesh(hornGeo(3.2, 0.5, 0.3, 6), plateM, head); h.position.set(s * 1.3, 1.1, 1.4); h.rotation.set(-Math.PI / 2 - 0.25, 0, s * -0.4); h.scale.x = -s; }
  // mind-pits: rows of glowing sensory pits along the brow (no eyes)
  const pitM = bio.mat(voidC, 0x1e1828, 0.5, 0.6, 3.0);
  const pits = [];
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) pits.push([s * (1.25 - i * 0.12), 1.15 - i * 0.05, 2.7 - i * 0.55, s * 0.6, 0.8, 0.4, 0.13 - i * 0.015, 0.35]);
  pits.push([0, 1.65, 2.6, 0, 1, 0.5, 0.2, 0.3]);
  bioMesh(bioDots(pits), pitM, head);
  const mindGlow = bio.sprite(glowSprite(voidC, 3.5, 0.6), 0.6, 0.15); mindGlow.position.set(0, 1.9, 2.6); head.add(mindGlow);
  const mawG = new THREE.Group(); mawG.position.z = 3.3; head.add(mawG);
  const throatM = bio.basic(basicM(0x6a2aa8), 0.7, 0xb070ff);
  const throat = noOut(mesh(new THREE.CircleGeometry(1.15, 18), throatM, mawG)); throat.position.z = 0.05;
  const throatGlow = bio.sprite(glowSprite(voidC, 4, 0.7), 0.7, 0.3); throatGlow.position.z = 0.4; mawG.add(throatGlow);
  const teeth = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; teeth.push([new THREE.ConeGeometry(0.11, 0.55, 5), M4(Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0.25, 0, 0, a + Math.PI / 2)]); }
  for (let i = 0; i < 10; i++) { const a = (i + 0.5) / 10 * TAU; teeth.push([new THREE.ConeGeometry(0.08, 0.4, 5), M4(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.1, 0, 0, a + Math.PI / 2)]); }
  mesh(mergeGeos(teeth), mat(0xe8dcc8), mawG);
  const jawM = mat(0x2a2236);
  const jaws = [];
  const jawGeo = hornGeo(3.4, 1.1, 0.28, 8); jawGeo.scale(1, 1, 0.55);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU + Math.PI / 2;
    const hinge = new THREE.Group(); hinge.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.05, -0.1); hinge.rotation.z = a - Math.PI / 2; mawG.add(hinge);
    const j = new THREE.Group(); hinge.add(j);
    const jm = mesh(jawGeo, jawM, j); jm.rotation.x = Math.PI / 2; jm.rotation.y = Math.PI / 2;
    jaws.push(j);
  }
  // optional saddle for a bonded rider
  let saddle = null;
  if (opts.saddle) {
    saddle = new THREE.Group(); root.add(saddle);
    const leather = mat(0x5a3a22), cloth = mat(0x4a2a6a), brass = mat(0xc8a048);
    const blanket = mesh(new THREE.BoxGeometry(2.6, 0.12, 2.0), cloth, saddle); blanket.position.y = 0.05;
    const seat = mesh(new THREE.BoxGeometry(0.8, 0.3, 1.2), leather, saddle); seat.position.y = 0.3;
    const pommel = mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.45, 6), leather, saddle); pommel.position.set(0, 0.6, 0.55);
    const cantle = mesh(new THREE.BoxGeometry(0.8, 0.35, 0.12), leather, saddle); cantle.position.set(0, 0.55, -0.6);
    for (const s of [-1, 1]) { const rg = mesh(new THREE.TorusGeometry(0.15, 0.04, 4, 10), brass, saddle); rg.position.set(s * 1.3, -0.05, 0); rg.rotation.y = Math.PI / 2; }
  }

  finish(root, opts.outline ?? 0.09);
  applyScale(root, opts);
  bio.glow(0);
  const flashF = makeFlash([skinM, headM, plateM, jawM]);
  const S_ORIGIN = 9;  // root origin sits under the spine at s = 9 m (the neck)
  let T = rnd() * 20, wph = 0, wu = 0, at = 0, rear = 0;
  const _a = new THREE.Vector3(), _f = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _m = new THREE.Matrix4();
  const frameAt = (i, obj, lift) => {   // place obj on the spine point i, on top of the body
    const P = tube.pts[i], Tg = tube.T[i], B = tube.Bn[i], N = tube.N[i];
    obj.position.copy(P).addScaledVector(B, tube.rad[i] * lift);
    _f.copy(Tg).negate(); _y.copy(B); _x.crossVectors(_y, _f).normalize();
    _m.makeBasis(_x, _y, _f); obj.quaternion.setFromRotationMatrix(_m);
  };
  const anim = {
    root, mats: [skinM, headM, plateM], glow: bio.glow, flash: flashF,
    animate(dt, st = {}) {
      T += dt;
      const sp = st.speed || 0;
      wu = damp(wu, st.windup || 0, 4, dt); at = damp(at, st.attack || 0, 8, dt);
      wph += dt * (0.5 + Math.min(sp, 20) * 0.22);
      const amp = 1.6 + Math.min(sp, 20) * 0.04 - wu * 0.6, k = TAU / 15;
      rear = damp(rear, Math.max(0.6, 3.2 + wu * 9 - at * 2.6 + Math.sin(T * 0.4) * 0.6), 3, dt);
      const P = tube.pts, n = P.length;
      // the spine: head forward, an S-wave travelling down the body, the fore-body reared
      let z = S_ORIGIN, prevX = 0, prevY = 0;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), s = t * L;
        const env = sstep(s / 9) * (0.7 + 0.3 * Math.sin(t * Math.PI));
        const x = amp * env * Math.sin(k * s - wph * 2.2) + Math.sin(T * 0.3) * 0.5 * (1 - env);
        const rr = radiusAt(t);
        const rl = Math.max(0, 1 - s / 13); const y = rr * 0.92 + rear * rl * rl * (3 - 2 * rl) + Math.max(0, Math.sin(k * 0.6 * s - wph * 1.3)) * 0.4 * env * (1 - rl);
        if (i > 0) { const ds = L / (n - 1), dx = x - prevX, dy = y - prevY; z -= Math.sqrt(Math.max(ds * ds * 0.25, ds * ds - dx * dx - dy * dy)); }
        P[i].set(x, y, z); prevX = x; prevY = y;
      }
      // keep root origin under the neck: shift so spine point at s=S_ORIGIN sits at z=0
      const io = Math.round(S_ORIGIN / L * (n - 1)), z0 = P[io].z;
      for (let i = 0; i < n; i++) P[i].z -= z0;
      tube.update();
      // head on the front of the spine, nosing down on a strike
      frameAt(0, head, 0);
      head.position.addScaledVector(tube.T[0], 0.3);
      head.rotateX(-wu * 0.25 + at * 0.3 + Math.sin(T * 0.6) * 0.05);
      head.rotateY(Math.sin(T * 0.35) * 0.12);
      for (const p of plates) frameAt(Math.round(p.s / L * (n - 1)), p.g, 0.82);
      if (saddle) frameAt(Math.round(5.5 / L * (n - 1)), saddle, 0.95);
      // jaws part when it rears, gape on the strike
      const open = clamp01(0.08 + wu * 0.45 + at * 1.0 + Math.max(0, Math.sin(T * 0.5)) * 0.06);
      jaws.forEach(j => { j.rotation.x = -open * 1.05; });
      const blaze = 1 + wu * 1.2 + at * 1.5;
      mindGlow.material.opacity = mindGlow.userData.op * (mindGlow.userData.day + (1 - mindGlow.userData.day) * bio.v) * blaze * (0.75 + Math.sin(T * 1.7) * 0.25);
      throatGlow.material.opacity = throatGlow.userData.op * (throatGlow.userData.day + (1 - throatGlow.userData.day) * bio.v) * (0.4 + open);
    },
  };
  anim.animate(0.016, {});
  return anim;
}
