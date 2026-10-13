/* ============================================================
   ESIK OF THE LAND — 3D models built from the creator's answers.
   All sizes are real-life metres, standing on y = 0, facing +z.
   Every builder returns { root, animate(dt, st), flash(v), mats }.

   PUNKS — a pumpkin with NO eyes and NO mouth. All of their vines
            grow from the top, around the stem, and drape down; any
            vine can be a leg or an arm (5–9 of them). Curled tips,
            a few leaves, a fine water-breath mist when they strike.
     DOMESTIC PUNK — horse-sized (body ~2 m across), orange, gentle;
            may wear a blanket and saddle (the stem is the pommel).
     WILD PUNK — smaller, quicker, leaner, darker, with long spidery
            vine-legs.
     MALSTI PUNK — hand-sized, violet with near-black vines and Duat
            cracks on the rind that flare when it blinks. A gremlin.
     SKOR'THAL — the Old Punk: a huge scarred wild Punk with thorny,
            overgrown vines; its stem was cut off flat long ago, so
            the tree rings show, and bioluminescence runs through
            the rings and the rind.
   KIPSU   — fox/weasel: weasel face, big paws, cute short ears, a
            very fluffy plume tail, whiskers; fur mostly brown, and
            glowing patterns anywhere, in a colour of its own.
   RODAK   — wolf-like scavenger: lean, tall, short oily dark fur,
            long thin tail, yellow slit eyes, head held low.
   KOFI GALTA — a long, crescent-shaped furry body (both ends curving
            up), blade-like spines along the top, a fluffy dark tail
            tuft trailing whisker-hairs, two little horns on the head
            and lots of tiny legs.
   BIG MOMMA KOFI — a plumper Kofi with babies clinging on.
   SRU VORN — a hairy, active komodo in an upright "high walk",
            two tusks, a spiked mace tail and green acid drool.
   ULAR NAGA — a huge earth hydra: four sturdy legs, armoured body,
            long necks with rounded heads, tendrils where eyes would
            be, a sail behind each head, and a spike-club tail.
   GYNGE   — living rock with no eyes; a craggy dome whose cave-maw
            yawns open with stone teeth over a pale fleshy belly.
   STRYX   — a stepped plateau of rock with whipping vines on top;
            rooted, eyeless.
   TONGUATJIS — a domed turtle with craggy alligator jaws, a neck as
            long as its shell, and a pink tongue twice its length.
   MIKOLO MOKO — a long ferret with kangaroo hind legs, long squiggly
            front legs, an Arlo-like furry head, a fun hairdo, and
            three eyes on each side of its face.
   UFF     — a walking rose-plant: a thorny stalk, two leaf feet,
            long thorny leaf arms and an eyeless flower head.
   ============================================================ */
import * as THREE from 'three';
import { toon, ramp, glowSprite, outlineAll } from './gfx.js';

const TAU = Math.PI * 2;
/* lateral-sequence walk phase offsets for legs [front L, front R, hind L, hind R] */
const GAIT4 = [0.5 * Math.PI, 1.5 * Math.PI, 0, Math.PI];
const UP = new THREE.Vector3(0, 1, 0);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

/* ---------------- shared helpers ---------------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* a seeded generator, or null when the canonical look is wanted */
const seeded = opts => (opts.seed === undefined || opts.seed === null ? null : mulberry32((opts.seed * 2654435761) >>> 0));

const M = (c, o = {}) => toon(c, o);
const basic = c => new THREE.MeshBasicMaterial({ color: c });
function noOut(m) { m.userData.noOutline = true; return m; }
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m); return m;
}
function finish(root, thick) {
  outlineAll(root, thick);
  root.traverse(m => { if (m.isMesh && m.name !== 'outline' && !(m.material && m.material.transparent)) m.castShadow = true; });
}
/* hit flash that respects a material's own base emissive */
function makeFlash(mats) {
  mats.forEach(m => { m.userData.e0 = m.emissive.clone(); });
  return v => mats.forEach(m => { const e = m.userData.e0; m.emissive.setRGB(e.r + v, e.g + v * 0.9, e.b + v * 0.8); });
}

/* ---------------- BIOLUMINESCENCE ----------------
   Every living thing on the Mbaru Tatu glows a little. Pattern materials
   come from bioKit(): pale, skin-tinted marks by day that shine at night.
   glow(v) — v = 0 bright day .. 1 full night — sets them all. It touches
   only these materials (never the flash() ones) and allocates nothing. */
function bioKit() {
  const tm = [], bm = [], sp = [];
  const k = {
    v: 0,
    /* a pattern material: skin-tinted by day, shining colour c at night */
    mat(c, skin = c, mix = 0.5, lo = 0.12, hi = 1.6) {
      return k.reg(toon(new THREE.Color(skin).lerp(new THREE.Color(c), mix), { emissive: c }), lo, hi);
    },
    /* an existing lit material whose emissive rises at night */
    reg(m, lo, hi) { m.userData.bio = [lo, hi]; m.emissiveIntensity = lo; tm.push(m); return m; },
    /* an existing unlit glow: dimmer by day (lo), full (or `night`) at night */
    basic(m, lo = 0.5, night) {
      m.userData.c0 = m.color.clone(); m.userData.c1 = night !== undefined ? new THREE.Color(night) : m.color.clone(); m.userData.lo = lo; bm.push(m); return m;
    },
    /* a glow sprite: `day` fraction of its opacity by day, all of it at night */
    sprite(s, op, day = 0) { s.userData.op = op ?? s.material.opacity; s.userData.day = day; sp.push(s); return s; },
    glow(v) {
      v = v < 0 ? 0 : v > 1 ? 1 : v; k.v = v;
      for (let i = 0; i < tm.length; i++) { const b = tm[i].userData.bio; tm[i].emissiveIntensity = b[0] + (b[1] - b[0]) * v; }
      for (let i = 0; i < bm.length; i++) { const u = bm[i].userData; bm[i].color.copy(u.c0).multiplyScalar(u.lo).lerp(u.c1, v); }
      for (let i = 0; i < sp.length; i++) { const s = sp[i], o = s.userData.op * (s.userData.day + (1 - s.userData.day) * v); s.material.opacity = o; s.visible = o > 0.01; }
    },
  };
  return k;
}
/* glowing dots merged into one geometry. Each entry is either
   [dx, dy, dz, r, flat]                — a direction on an ellipsoid part of radii
                                          (sx, sy, sz); the geometry is in the part's
                                          unit space (add it to a sphere scaled sx,sy,sz)
   [px, py, pz, nx, ny, nz, r, flat]    — an explicit surface point and normal. */
const _bq = new THREE.Quaternion(), _bn = new THREE.Vector3(), _bp = new THREE.Vector3(), _bsc = new THREE.Vector3(), _bm4 = new THREE.Matrix4(), _bS = new THREE.Matrix4();
function bioDots(list, sx = 1, sy = 1, sz = 1, seg = 6) {
  const unit = new THREE.SphereGeometry(1, seg, Math.max(3, seg - 2)).toNonIndexed();
  const n = unit.attributes.position.count, pos = new Float32Array(n * 3 * list.length), nor = new Float32Array(n * 3 * list.length);
  _bS.makeScale(1 / sx, 1 / sy, 1 / sz);
  list.forEach((e, i) => {
    let r, fl;
    if (e.length >= 6) { _bp.set(e[0], e[1], e[2]); _bn.set(e[3], e[4], e[5]).normalize(); r = e[6] ?? 0.02; fl = e[7] ?? 0.4; }
    else { _bn.set(e[0], e[1], e[2]).normalize(); _bp.set(_bn.x * sx, _bn.y * sy, _bn.z * sz); _bn.set(_bn.x / sx, _bn.y / sy, _bn.z / sz).normalize(); r = e[3]; fl = e[4] ?? 0.4; }
    _bm4.compose(_bp, _bq.setFromUnitVectors(UP, _bn), _bsc.set(r, r * fl, r)).premultiply(_bS);
    const g = unit.clone().applyMatrix4(_bm4);
    pos.set(g.attributes.position.array, i * n * 3); nor.set(g.attributes.normal.array, i * n * 3);
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}
/* n dots evenly from entry a to entry b (same form), radius r0 → r1 */
function dotRun(a, b, n, r0, r1 = r0, flat) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0, e = a.map((v, j) => v + (b[j] - v) * t);
    e.push(r0 + (r1 - r0) * t); if (flat !== undefined) e.push(flat); out.push(e);
  }
  return out;
}
/* dots on a geometry's own vertices where a noise field is high (lichen,
   mineral patches): pick(x, y, z, nx, ny, nz) filters candidates */
function patchDots(geo, rnd, max, r, thr, freq, pick) {
  const p = geo.attributes.position, nm = geo.attributes.normal, out = [], seen = new Set();
  for (let i = 0; i < p.count && out.length < max * 4; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), key = (x * 97 | 0) + ',' + (y * 97 | 0) + ',' + (z * 97 | 0);
    if (seen.has(key)) continue; seen.add(key);
    if (noise3(x * freq + 7.1, y * freq, z * freq - 3.3) < thr) continue;
    if (pick && !pick(x, y, z, nm.getX(i), nm.getY(i), nm.getZ(i))) continue;
    out.push([x, y, z, nm.getX(i), nm.getY(i), nm.getZ(i), r * (0.6 + rnd() * 0.7), 0.45]);
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = out[i]; out[i] = out[j]; out[j] = t; }
  return out.slice(0, max);
}
const bioMesh = (geo, mat, parent, x = 0, y = 0, z = 0) => noOut(mesh(geo, mat, parent, x, y, z));

/* smooth 3D value noise in [0,1] (deterministic) */
function h3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => h3(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
/* push vertices in/out along their direction from the origin: craggy rock, shaggy fur */
function displace(geo, amp, freq, off = 0, sharp = 1) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let n = noise3(v.x * freq + off, v.y * freq + off * 1.7, v.z * freq - off) * 0.7
      + noise3(v.x * freq * 2.3 - off, v.y * freq * 2.3, v.z * freq * 2.3 + off) * 0.3;
    n = Math.sign(n - 0.5) * Math.pow(Math.abs(n - 0.5) * 2, sharp);
    v.multiplyScalar(1 + amp * n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
/* bend a +y geometry (base at y=0) into an arc curling toward +z; k = radians per metre */
function bendGeo(geo, k) {
  if (!k) return geo;
  const p = geo.attributes.position, R = 1 / k;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const th = y * k, r = R - z;
    p.setXYZ(i, x, r * Math.sin(th), R - r * Math.cos(th));
  }
  geo.computeVertexNormals();
  return geo;
}
/* tapered horn/claw/thorn: cone from base (y=0) to tip, curled */
function hornGeo(len, r, curl = 0, seg = 6) {
  const g = new THREE.CylinderGeometry(0, r, len, seg, 6); g.translate(0, len / 2, 0);
  return bendGeo(g, curl / len);
}
/* merge several geometries into one (positions + normals) */
function merge(geos) {
  let n = 0; const list = geos.map(g => { const q = g.index ? g.toNonIndexed() : g; n += q.attributes.position.count; return q; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, o * 3);
    if (!g.attributes.normal) g.computeVertexNormals();
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
/* copy of a geometry, placed (position, euler rotation, scale) */
function placed(geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _m4.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
  return geo.clone().applyMatrix4(_m4);
}
/* copy of a geometry with its +y axis turned to point along dir, base at p */
function along(geo, p, dir, s = 1) {
  _q.setFromUnitVectors(UP, dir.clone().normalize());
  _m4.compose(p, _q, _s.set(s, s, s));
  return geo.clone().applyMatrix4(_m4);
}
/* a flat-ish leaf pointing +y, lying in the xy plane */
function leafGeo(len, wid) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.quadraticCurveTo(wid, len * 0.35, 0, len); s.quadraticCurveTo(-wid, len * 0.35, 0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: wid * 0.12, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -wid * 0.06);
  return g;
}

/* ---------------- ROPE: a chain of capsules laid along a cubic Bézier ----------------
   Used for Punk/Stryx vines: the animation moves the four control points
   every frame (no allocation) and the segments follow. */
class Rope {
  constructor(parent, n, r0, r1, mat, extra) {
    this.n = n; this.segs = []; this.pts = [];
    for (let i = 0; i <= n; i++) this.pts.push(new THREE.Vector3());
    for (let i = 0; i < n; i++) {
      const r = lerp(r0, r1, (i + 0.5) / n);
      const g = extra ? extra(i, r) : new THREE.CapsuleGeometry(r, 1, 2, 6);
      const m = new THREE.Mesh(g, mat); parent.add(m); this.segs.push(m);
    }
    this.dir = new THREE.Vector3(); this._d = new THREE.Vector3();
  }
  set(p0, p1, p2, p3) {
    const n = this.n;
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      this.pts[i].set(
        a * p0.x + b * p1.x + c * p2.x + d * p3.x,
        a * p0.y + b * p1.y + c * p2.y + d * p3.y,
        a * p0.z + b * p1.z + c * p2.z + d * p3.z);
    }
    for (let i = 0; i < n; i++) {
      const s = this.segs[i], A = this.pts[i], B = this.pts[i + 1];
      const d = this._d.subVectors(B, A); const len = d.length() || 1e-4;
      s.position.addVectors(A, B).multiplyScalar(0.5);
      s.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len));
      s.scale.set(1, len, 1);
    }
    this.dir.copy(this._d);
  }
}
/* orient obj so local +y follows dir and its local -x leans toward `toward` (for curls) */
const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3(), _bm = new THREE.Matrix4();
function orientCurl(obj, dir, toward) {
  _by.copy(dir).normalize();
  _bx.copy(toward).addScaledVector(_by, -toward.dot(_by));
  if (_bx.lengthSq() < 1e-6) _bx.set(1, 0, 0);
  _bx.normalize().multiplyScalar(-1);
  _bz.crossVectors(_bx, _by);
  _bm.makeBasis(_bx, _by, _bz);
  obj.quaternion.setFromRotationMatrix(_bm);
}
/* a curled vine tip: an arc that starts at the origin heading +y and curls toward -x */
function curlGeo(R, tube, arc = Math.PI * 1.6) {
  const g = new THREE.TorusGeometry(R, tube, 5, 12, arc);
  g.translate(-R, 0, 0);
  return g;
}

/* ================================================================
   PUNKS
   ================================================================ */
/* ribbed pumpkin, deep creases, dimpled top and bottom (unit radius) */
function pumpkinGeo(ribs = 8, sq = 0.78, depth = 0.13) {
  const g = new THREE.SphereGeometry(1, 40, 22);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x), s = Math.abs(Math.sin(a * ribs / 2));
    const k = 1 - depth + depth * Math.sqrt(s);
    const rxz = Math.sqrt(v.x * v.x + v.z * v.z);
    v.x *= k; v.z *= k;
    v.y = v.y * sq - Math.sign(v.y) * 0.13 * Math.pow(1 - rxz, 3);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
/* concentric tree rings (with glowing rings) for Skor'Thal's cut stem */
function ringTextures() {
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = 128; return c; };
  const a = mk(), b = mk(), g = a.getContext('2d'), e = b.getContext('2d');
  g.fillStyle = '#c9a46a'; g.fillRect(0, 0, 128, 128); e.fillStyle = '#000'; e.fillRect(0, 0, 128, 128);
  for (let r = 60, i = 0; r > 2; r -= 4 + (i % 3), i++) {
    g.strokeStyle = i % 2 ? 'rgba(90,55,25,0.85)' : 'rgba(150,105,55,0.7)'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(64 + Math.sin(i) * 1.5, 64, r, r * 0.96, 0, 0, TAU); g.stroke();
    if (i % 3 === 1) { e.strokeStyle = i % 2 ? '#3fe6c8' : '#ffc94a'; e.lineWidth = 3; e.beginPath(); e.ellipse(64 + Math.sin(i) * 1.5, 64, r, r * 0.96, 0, 0.3 * i, 0.3 * i + 4.2); e.stroke(); }
  }
  g.fillStyle = '#5a3a1e'; g.beginPath(); g.arc(64, 64, 3, 0, TAU); g.fill();
  // a crack from the heart
  g.strokeStyle = 'rgba(50,30,12,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 64); g.lineTo(90, 80); g.lineTo(104, 108); g.stroke();
  const t1 = new THREE.CanvasTexture(a), t2 = new THREE.CanvasTexture(b);
  t1.colorSpace = t2.colorSpace = THREE.SRGBColorSpace;
  return [t1, t2];
}

/* polyline crack/vein on the pumpkin surface: a thin tube following the rind */
function rindLine(R, sq, pts, tube) {
  const v = pts.map(([lon, lat]) => {
    const rx = Math.cos(lat), y = Math.sin(lat) * sq;
    return new THREE.Vector3(Math.cos(lon) * rx * R * 1.01, y * R * 1.01, Math.sin(lon) * rx * R * 1.01);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), pts.length * 6, tube, 4, false);
}

/* the shared Punk body + vines. cfg describes one kind of Punk. */
function buildPunkKind(cfg, opts) {
  const rnd = seeded(opts);
  const R = cfg.R, sq = cfg.sq, bodyY = cfg.bodyY;
  const root = new THREE.Group();
  // bioluminescence: glowing vine tips, and (most Punks) glowing rib stripes or spots
  const bio = bioKit();
  const bioPal = cfg.bioPal || [0xd8ff6a];
  const bioC = rnd ? bioPal[Math.floor(rnd() * bioPal.length)] : bioPal[0];
  const tipM = bio.mat(bioC, cfg.vine, 0.25, 0.08, 1.8);
  const rind = M(cfg.rind, cfg.rindOpts || {}), vineM = M(cfg.vine), stemM = M(cfg.stem), leafM = M(cfg.leaf || cfg.vine);
  leafM.side = THREE.DoubleSide;
  const body = new THREE.Group(); body.position.y = bodyY; root.add(body);
  const pump = mesh(pumpkinGeo(cfg.ribs, sq), rind, body); pump.scale.setScalar(R);
  const top = R * (sq - 0.13);

  // the stem — curved and ribbed (or cut flat, for the Old Punk)
  const stemZ = cfg.stemZ || 0;
  let stem;
  if (cfg.cutStem) {
    const [map, emap] = ringTextures();
    const capM = new THREE.MeshToonMaterial({ color: 0xffffff, map, gradientMap: ramp(), emissive: 0xffffff, emissiveMap: emap, emissiveIntensity: 0.9 });
    const sg = new THREE.CylinderGeometry(cfg.stemR, cfg.stemR * 1.35, cfg.stemH, 9, 1);
    stem = new THREE.Mesh(sg, [stemM, capM, stemM]); stem.position.set(0, top + cfg.stemH / 2 - R * 0.04, stemZ); body.add(stem);
    stem.rotation.x = 0.25; // a slight tilt so the cut face reads from the front
    cfg.capM = capM;
  } else {
    const sg = hornGeo(cfg.stemH, cfg.stemR, -1.1, 7); sg.scale(1, 1, 1);
    const g2 = new THREE.CylinderGeometry(cfg.stemR * 0.55, cfg.stemR, cfg.stemH, 7, 6); g2.translate(0, cfg.stemH / 2, 0); bendGeo(g2, -1.0 / cfg.stemH);
    stem = mesh(g2, stemM, body, 0, top - R * 0.05, stemZ);
    const cap = mesh(new THREE.SphereGeometry(cfg.stemR * 0.62, 7, 5), stemM, stem);
    cap.position.set(0, cfg.stemH * 0.86, -cfg.stemH * 0.42);
  }
  // leaves around the stem
  const lg = leafGeo(R * 0.42, R * 0.36);
  const nLeaves = cfg.leaves ?? 3;
  for (let i = 0; i < nLeaves; i++) {
    const a = i / nLeaves * TAU + 0.6;
    const l = mesh(lg, leafM, body, Math.sin(a) * R * 0.18, top + R * 0.02, stemZ + Math.cos(a) * R * 0.18);
    l.rotation.set(0, a, 0, 'YXZ'); l.rotateX(1.15);
  }

  // vines: n of them, evenly around the stem; the two nearest the front are arms
  const n = cfg.nVines ?? (rnd ? 5 + Math.floor(rnd() * 5) : 7);
  const vines = [], riders = [];
  const thornGeo = cfg.thorns ? hornGeo(cfg.vineR * 1.6, cfg.vineR * 0.55, 0.4, 4) : null;
  const curlG = curlGeo(cfg.vineR * 2.2, cfg.vineR * 0.55);
  const footCurlG = curlGeo(cfg.vineR * 1.5, cfg.vineR * 0.5, Math.PI * 1.4);
  const tendrilG = curlGeo(cfg.vineR * 1.6, cfg.vineR * 0.3, Math.PI * 1.9);
  const order = [];
  for (let i = 0; i < n; i++) {
    let th = (i + 0.5) / n * TAU; if (th > Math.PI) th -= TAU;
    order.push({ i, th });
  }
  const sorted = order.slice().sort((a, b) => Math.abs(a.th) - Math.abs(b.th));
  const armSet = new Set([sorted[0].i, sorted[1].i]);
  let legK = 0;
  for (const { i, th } of order) {
    const arm = armSet.has(i);
    const radial = new THREE.Vector3(Math.sin(th), 0, Math.cos(th));
    const segExtra = cfg.thorns ? (k, r) => {
      const parts = [new THREE.CapsuleGeometry(r, 1, 2, 6)];
      for (let j = 0; j < 3; j++) { const a = j * 2.1 + k; parts.push(placed(thornGeo, Math.cos(a) * r * 0.8, -0.3 + j * 0.3, Math.sin(a) * r * 0.8, Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3)); }
      return merge(parts);
    } : null;
    const rope = new Rope(root, cfg.segs || 6, cfg.vineR, cfg.vineR * 0.55, vineM, segExtra);
    const tip = noOut(mesh(arm ? curlG : footCurlG, tipM, root));
    const v = {
      arm, th, radial, rope, tip,
      side: Math.sign(Math.sin(th)) || 1,
      group: arm ? 0 : (legK++ % 2),
      attach: new THREE.Vector3(Math.sin(th) * cfg.ring, top + R * 0.04, stemZ + Math.cos(th) * cfg.ring),
      jitter: rnd ? rnd() : (i * 0.37) % 1,
      // foot curls lie mostly flat, rolling sideways and a little up
      curlTo: new THREE.Vector3(Math.cos(th), 0.5, -Math.sin(th)).normalize(),
    };
    // a little tendril curl and an occasional leaf partway down (they ride on
    // the segments but are not parented to them, so the stretch does not skew them)
    const tz = mesh(tendrilG, vineM, root);
    riders.push({ obj: tz, seg: rope.segs[3], off: new THREE.Vector3(cfg.vineR * 0.8, 0, 0), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.6)) });
    if (i % 2 === 0) {
      const lf = mesh(lg, leafM, root); lf.scale.setScalar(0.9);
      riders.push({ obj: lf, seg: rope.segs[2], off: new THREE.Vector3(cfg.vineR, 0, 0), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, -0.9)) });
    }
    // water-breath mist from the arm tips
    if (arm) {
      const mg = new THREE.ConeGeometry(R * 0.35, R * 1.2, 10, 1, true); mg.translate(0, -R * 0.6, 0); mg.rotateX(Math.PI);
      v.mist = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      v.mist.visible = false; root.add(v.mist);
    }
    vines.push(v);
  }
  const nLegs = legK;

  // optional blanket + saddle (domestic); the stem stands in for the pommel
  if (opts.saddle) {
    const bl = M(opts.blanket ?? 0x2f6f8a), trim = M(0xe8c060), leather = M(0x6a3a1e), dark = M(0x3a2414);
    const wrap = (w, d, zc, lift) => {
      const g = new THREE.PlaneGeometry(1, 1, 14, 6); const p = g.attributes.position, d3 = new THREE.Vector3();
      for (let k = 0; k < p.count; k++) {
        const al = p.getX(k) * w, zz = zc + p.getY(k) * d;
        d3.set(Math.sin(al), Math.cos(al), zz / R).normalize();
        p.setXYZ(k, d3.x * R * lift, d3.y * R * sq * lift + R * 0.02, d3.z * R * lift);
      }
      g.computeVertexNormals(); return g;
    };
    const blanket = mesh(wrap(2.0, R * 0.8, -R * 0.15, 1.03), bl, body); blanket.material.side = THREE.DoubleSide;
    mesh(wrap(2.04, R * 0.12, -R * 0.55, 1.035), trim, body).material.side = THREE.DoubleSide;
    mesh(wrap(2.04, R * 0.12, R * 0.25, 1.035), trim, body);
    const seat = mesh(new THREE.SphereGeometry(1, 14, 8), leather, body, 0, R * sq * 1.0, -R * 0.15); seat.scale.set(R * 0.3, R * 0.08, R * 0.38);
    const cantle = mesh(new THREE.TorusGeometry(R * 0.2, R * 0.05, 6, 12, Math.PI), leather, body, 0, R * sq * 1.02, -R * 0.45); cantle.rotation.x = -0.3;
    for (const s of [-1, 1]) {
      const strap = mesh(new THREE.BoxGeometry(R * 0.04, R * 0.7, R * 0.08), dark, body, s * R * 0.62, R * sq * 0.45, -R * 0.15); strap.rotation.z = s * 0.75;
      const st = mesh(new THREE.TorusGeometry(R * 0.07, R * 0.018, 4, 10), dark, body, s * R * 0.92, R * 0.05, -R * 0.15); st.rotation.y = Math.PI / 2;
    }
  }

  // bioluminescent patterns on the rind: stripes along rib crowns, or spots
  if (cfg.bioRibs) {
    const ribM = bio.mat(bioC, cfg.rind, 0.3, 0.08, 2.4);
    const style = rnd ? Math.floor(rnd() * 3) : 0, nr = cfg.ribs;
    const crown = k => ((2 * k + 1) * Math.PI) / nr;
    if (style < 2) {
      // stripes down some rib crowns (style 1: broken into dashes)
      const lines = [];
      for (let k = 0; k < nr; k++) {
        if (rnd ? rnd() > 0.55 : k % 2) continue;
        const a = crown(k), top0 = 0.55 + (rnd ? rnd() * 0.2 : 0.1), bot = -0.45 - (rnd ? rnd() * 0.2 : 0.1);
        const segsL = style === 1 ? [[top0, 0.15], [0.05, bot]] : [[top0, bot]];
        for (const [l0, l1] of segsL) lines.push(rindLine(R * 1.005, sq, [[a, l0], [a + 0.03, (l0 + l1) / 2], [a, l1]], cfg.bioTube ?? R * 0.032));
      }
      if (lines.length) bioMesh(merge(lines), ribM, body);
    } else {
      // spots in a ring around the shoulders of the rind
      const pts = [];
      for (let k = 0; k < nr; k++) {
        const a = crown(k);
        for (const lat of [0.42, 0.05, -0.32]) {
          if (rnd() < 0.45) continue;
          const rx = Math.cos(lat), y = Math.sin(lat) * sq;
          pts.push([Math.cos(a) * rx * R, y * R, Math.sin(a) * rx * R, Math.cos(a) * rx, Math.sin(lat) / sq, Math.sin(a) * rx, R * (0.045 + rnd() * 0.04), 0.35]);
        }
      }
      if (pts.length) bioMesh(bioDots(pts), ribM, body);
    }
  }
  // glow (Duat for the Malsti, bioluminescence for the Old Punk)
  const glows = [];
  if (cfg.lines) {
    const lm = new THREE.MeshBasicMaterial({ color: cfg.lineColor });
    for (const L of cfg.lines) glows.push(noOut(mesh(rindLine(R, sq, L, cfg.lineTube), lm, body)));
    cfg.lineMat = lm;
  }
  if (cfg.scars) {
    const sm = M(cfg.scarColor);
    for (const L of cfg.scars) mesh(rindLine(R * 1.01, sq, L, cfg.scarTube), sm, body);
  }
  let aura = null;
  if (cfg.aura) { aura = glowSprite(cfg.aura, R * 4, 0.25); aura.position.y = bodyY; root.add(aura); }

  finish(root, cfg.outline);

  // ------------ animation ------------
  const P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), P3 = new THREE.Vector3();
  const tmp = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
  let ph = Math.random() * TAU, walkW = 0, t0 = Math.random() * 10;
  let lastGrab = null;
  const Rf = R * cfg.footR, kneeH = cfg.kneeH;
  const stride0 = R * cfg.stride;

  function animate(dt, st) {
    const sp = st.speed || 0, wind = st.windup || 0, atk = st.attack || 0, t = (st.t || 0) + t0;
    walkW += (clamp(sp / 0.5, 0, 1) - walkW) * Math.min(1, dt * 6);
    const stride = stride0 * (0.6 + 0.4 * clamp(sp / cfg.runSpeed, 0, 1.4));
    // feet stay planted: phase speed from ground speed and stride
    ph += dt * TAU * Math.max(sp / (2 * stride), 0.0);
    // body: bob twice a cycle, sway, breathe, squash on wind-up
    const bob = walkW * Math.abs(Math.cos(ph)) * R * 0.08;
    const breathe = Math.sin(t * 1.6) * R * 0.015;
    body.position.y = bodyY + bob + breathe - wind * R * 0.12 * (1 - atk);
    body.rotation.z = walkW * Math.sin(ph) * 0.06;
    body.rotation.x = walkW * 0.06 - wind * 0.15 * (1 - atk) + atk * 0.12;
    const s = 1 + (wind * (1 - atk)) * 0.06;
    body.scale.set(s, 1 / s, s);
    body.updateMatrix();
    // a leg-vine reaching out to grab something (st.grab = { p: point in root space, k: 0..1 how far it has shot out })
    // — the leg on the side nearest the target is the one that goes; the rest tuck up while she's off the ground
    const grab = st.grab, air = clamp(st.air || 0, 0, 1);
    let gv = null;
    if (grab) {
      let bd = -9; tmp.set(grab.p.x, 0, grab.p.z).normalize();
      for (const v of vines) if (!v.arm) { const d = v.radial.dot(tmp) - (v === lastGrab ? -0.25 : 0); if (d > bd) { bd = d; gv = v; } }
      lastGrab = gv;
    }
    for (const v of vines) {
      P0.copy(v.attach).applyMatrix4(body.matrix);
      if (v === gv) {
        const k = clamp(grab.k, 0, 1), e = 1 - Math.pow(1 - k, 3);
        tmp.subVectors(grab.p, P0); const L = tmp.length() || 1;
        P3.copy(P0).addScaledVector(tmp, e);
        // while it is still flying out the vine whips in an S; once it holds it pulls nearly straight, sagging a touch
        const wob = (1 - e) * L * 0.18 * Math.sin(t * 30);
        P1.copy(v.radial).multiplyScalar(R * 0.9).add(P0); P1.y += R * 0.6;
        P2.copy(P0).addScaledVector(tmp, e * 0.66); P2.x += v.radial.z * wob; P2.z -= v.radial.x * wob; P2.y -= (k >= 1 ? L * 0.04 : -wob * 0.5);
        P1.lerp(tmp.copy(P0).addScaledVector(grab.p.clone().sub(P0), e * 0.33), 0.6);
        v.rope.set(P0, P1, P2, P3);
        v.tip.position.copy(P3); orientCurl(v.tip, v.rope.dir, v.curlTo);
        v.tip.scale.setScalar(1 + k * 0.6);   // the curl clenches round what it caught
        continue;
      }
      if (!v.arm && air > 0) {
        // off the ground: legs trail and curl up under the rind
        const sway = Math.sin(t * 5 + v.jitter * 6) * R * 0.15;
        P3.copy(v.radial).multiplyScalar(R * (0.8 + 0.3 * (1 - air))); P3.y = bodyY * (0.25 + 0.35 * air) + sway; P3.z -= R * 0.6 * air;
        P1.copy(v.radial).multiplyScalar(R * cfg.shoulder).add(P0); P1.y = P0.y + R * 0.2;
        P2.copy(v.radial).multiplyScalar(R * 1.2); P2.y = P3.y - R * 0.3; P2.z -= R * 0.5 * air;
        tmp.copy(P3);
        // blend from the walking pose so landing isn't a snap
        let u = ((ph + v.group * Math.PI) / TAU) % 1; if (u < 0) u += 1;
        const wz = (u < 0.5 ? 1 - 4 * u : -1 + 2 * sstep((u - 0.5) * 2)) * walkW * stride * 0.5;
        const W3 = new THREE.Vector3().copy(v.radial).multiplyScalar(Rf); W3.y = R * 0.03; W3.z += wz;
        P3.lerpVectors(W3, tmp, air);
        v.rope.set(P0, P1, P2, P3);
        v.tip.position.copy(P3); orientCurl(v.tip, v.radial, v.curlTo); v.tip.scale.setScalar(1);
        continue;
      }
      v.tip.scale.setScalar(v.arm ? v.tip.scale.x : 1);
      if (!v.arm) {
        // gait: stance slides back under the body, swing lifts forward
        let u = ((ph + v.group * Math.PI) / TAU) % 1; if (u < 0) u += 1;
        let z, lift;
        if (u < 0.5) { z = 1 - 4 * u; lift = 0; } else { const w = (u - 0.5) * 2; z = -1 + 2 * sstep(w); lift = Math.sin(w * Math.PI); }
        z *= walkW * stride * 0.5; lift *= walkW * R * cfg.lift;
        const idleCurl = Math.sin(t * 1.3 + v.jitter * 6) * R * 0.02;
        P3.copy(v.radial).multiplyScalar(Rf + idleCurl); P3.y = R * 0.03 + lift; P3.z += z;
        P1.copy(v.radial).multiplyScalar(R * cfg.shoulder).add(P0); P1.y = P0.y + R * (0.25 + kneeH);
        P2.copy(v.radial).multiplyScalar(-R * 0.25).add(P3); P2.y = P3.y + bodyY * 0.55 + R * kneeH;
        v.rope.set(P0, P1, P2, P3);
        v.tip.position.copy(P3); orientCurl(v.tip, v.radial, v.curlTo);
      } else {
        // arms: hang forward, cock up and back on wind-up, lash forward on attack
        const a = clamp(atk * 1.25 - (v.side > 0 ? 0 : 0.2), 0, 1);
        const sway = Math.sin(t * 1.7 + v.jitter * 5) * R * 0.08 + walkW * Math.sin(ph + (v.side > 0 ? 0 : Math.PI)) * R * 0.15;
        P3.set(v.side * R * 0.6, bodyY + R * 0.15 + sway, R * 1.5 + sway * 0.5);
        tmp.set(v.side * R * 0.9, bodyY + R * 1.25, -R * 0.1); P3.lerp(tmp, wind * (1 - a));
        tmp.set(v.side * R * 0.3, bodyY * 0.75, R * cfg.reach); P3.lerp(tmp, a);
        P1.copy(v.radial).multiplyScalar(R * 0.7).add(P0); P1.y = P0.y + R * 0.45;
        P2.set(P3.x * 0.8, P3.y + R * (0.5 - a * 0.4), P3.z - R * (0.4 + a * 0.6));
        v.rope.set(P0, P1, P2, P3);
        v.tip.position.copy(P3); orientCurl(v.tip, v.rope.dir, UP);
        v.tip.scale.setScalar(1 - a * 0.5);
        if (v.mist) {
          v.mist.visible = a > 0.3;
          v.mist.material.opacity = (a - 0.3) * 0.6;
          v.mist.position.copy(P3); v.mist.quaternion.copy(v.rope.segs[v.rope.n - 1].quaternion);
          v.mist.scale.setScalar(0.5 + a * 0.8);
        }
      }
    }
    for (const r of riders) {
      r.obj.position.copy(r.off).applyQuaternion(r.seg.quaternion).add(r.seg.position);
      r.obj.quaternion.multiplyQuaternions(r.seg.quaternion, r.q);
    }
    if (aura) aura.material.opacity = 0.18 + Math.sin(t * 2) * 0.06;
    if (cfg.capM) cfg.capM.emissiveIntensity = (0.7 + Math.sin(t * 1.4) * 0.25) * (0.6 + 0.7 * bio.v);
  }
  animate(0, { speed: 0, t: 0 });
  const flash = makeFlash([rind]);
  bio.glow(0);
  return { root, animate, flash, glow: bio.glow, bio, mats: [rind], body, vines, nVines: n, nLegs, cfg };
}

/* ---------------- DOMESTIC PUNK ---------------- */
export function buildDomesticPunk(opts = {}) {
  return buildPunkKind({
    R: 1.0, sq: 0.74, bodyY: 1.35, ribs: 10,
    rind: 0xd97c2b, vine: 0x3f7d3a, stem: 0x5c6b2a, leaf: 0x4f8f3e,
    stemR: 0.11, stemH: 0.42, stemZ: opts.saddle ? 0.3 : 0, ring: 0.2,
    vineR: 0.09, segs: 7, footR: 1.55, shoulder: 1.1, kneeH: -0.05, lift: 0.3, stride: 0.75, runSpeed: 4, reach: 2.6,
    outline: 0.03, bioRibs: true, bioPal: [0xffe27a, 0xd8ff6a, 0x8affd0, 0xffb86a],
  }, opts);
}

/* ---------------- WILD PUNK ---------------- */
export function buildWildPunk(opts = {}) {
  return buildPunkKind({
    R: 0.7, sq: 0.86, bodyY: 1.25, ribs: 8,
    rind: 0xb8641f, vine: 0x2e5c2a, stem: 0x3a4a1a, leaf: 0x386a30,
    stemR: 0.07, stemH: 0.32, ring: 0.14,
    vineR: 0.045, segs: 8, footR: 2.4, shoulder: 1.5, kneeH: 0.9, lift: 0.5, stride: 1.1, runSpeed: 6, reach: 3.2,
    leaves: 2, outline: 0.025, bioRibs: true, bioPal: [0x9aff5a, 0x5affc8, 0xffd84a, 0xff8a4a],
  }, opts);
}

/* ---------------- MALSTI PUNK ---------------- */
export function buildMalstiPunk(opts = {}) {
  // Duat cracks: thin zig-zags across the rind (lon, lat pairs)
  const cracks = [
    [[0.2, 0.5], [0.35, 0.2], [0.25, -0.1], [0.45, -0.35]],
    [[2.0, 0.6], [2.2, 0.3], [1.95, 0.0], [2.15, -0.3]],
    [[4.0, 0.4], [3.8, 0.1], [4.1, -0.2]],
    [[5.2, 0.55], [5.35, 0.15], [5.1, -0.15], [5.3, -0.45]],
    [[1.2, -0.1], [1.4, -0.4]],
    [[3.0, 0.2], [3.2, -0.05], [3.0, -0.3]],
  ];
  const k = buildPunkKind({
    R: 0.05, sq: 0.8, bodyY: 0.085, ribs: 6,
    rind: 0x5a3a75, rindOpts: { emissive: 0x1a0830 }, vine: 0x1c1424, stem: 0x241830, leaf: 0x2a1c36,
    stemR: 0.007, stemH: 0.035, ring: 0.012,
    vineR: 0.0036, segs: 6, footR: 1.55, shoulder: 1.15, kneeH: 0.3, lift: 0.4, stride: 0.9, runSpeed: 0.6, reach: 2.4,
    leaves: 1, outline: 0.0025,
    lines: cracks, lineColor: 0x8a52c0, lineTube: 0.0012, aura: 0x9a4aff, bioPal: [0xff7ae8, 0xc88aff, 0x7ab8ff],
  }, opts);
  const lm = k.cfg.lineMat, dim0 = new THREE.Color(0x8a52c0), dim = dim0.clone(), hot = new THREE.Color(0xe6b0ff);
  const base = k.flash, baseGlow = k.glow;
  let bl = 0;
  k.blink = v => { bl = clamp(v, 0, 1); lm.color.copy(dim).lerp(hot, bl); };
  k.flash = v => { base(v); lm.color.copy(dim).lerp(hot, Math.max(bl, v)); };
  // by day the cracks are a dull violet; at night they smoulder brighter even unblinking
  k.glow = v => { baseGlow(v); dim.copy(dim0).multiplyScalar(0.55 + 0.6 * clamp(v, 0, 1)); lm.color.copy(dim).lerp(hot, bl); };
  k.glow(0);
  return k;
}

/* ---------------- SKOR'THAL, the Old Punk ---------------- */
export function buildSkorThal(opts = {}) {
  // bioluminescent veins over the rind, and old scars
  const veins = [];
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU + 0.3;
    veins.push([[a, 0.75], [a + 0.12, 0.4], [a - 0.05, 0.1], [a + 0.15, -0.2], [a + 0.05, -0.5]]);
  }
  const scars = [
    [[0.1, 0.35], [0.5, 0.1], [0.8, -0.15]],
    [[2.6, 0.5], [2.9, 0.3], [3.3, 0.25]],
    [[4.4, -0.1], [4.7, 0.1], [4.9, 0.4]],
  ];
  const k = buildPunkKind({
    R: 2.0, sq: 0.8, bodyY: 2.55, ribs: 10,
    rind: 0xa85a22, vine: 0x2f4a22, stem: 0x5a4a2a, leaf: 0x3d5c2a,
    stemR: 0.55, stemH: 0.9, cutStem: true, ring: 0.62,
    vineR: 0.17, segs: 7, footR: 1.55, shoulder: 1.1, kneeH: 0.25, lift: 0.3, stride: 0.6, runSpeed: 4, reach: 2.3,
    nVines: opts.nVines ?? 9, thorns: true, leaves: 4, outline: 0.06, bioPal: [0x5ff0c8, 0xffc94a],
    lines: veins, lineColor: 0x5ff0c8, lineTube: 0.03,
    scars, scarColor: 0xe0b070, scarTube: 0.045,
  }, opts);
  // the cut face glows softly
  const cg = glowSprite(0xffd870, 1.6, 0.5); cg.position.set(0, 2.0 * (0.8 - 0.13) + 0.95, 0.2); k.body.add(cg);
  k.bio.sprite(cg, 0.7, 0.55);
  // gold glints along the veins
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU + 0.3, g = glowSprite(i % 2 ? 0xffc94a : 0x5ff0c8, 1.2, 0.45);
    g.position.set(Math.cos(a) * 2.0, 0.3, Math.sin(a) * 2.0); k.body.add(g);
    k.bio.sprite(g, 0.6, 0.25);
  }
  // the veins: dimmer by day, blazing teal at night
  k.bio.basic(k.cfg.lineMat, 0.5, 0x7affe0);
  k.glow(0);
  return k;
}

/* ---------------- FK chain: nested joints, each carrying one tapered segment along +y ---------------- */
function chain(parent, n, len, r0, r1, mat, opts = {}) {
  const joints = [];
  let p = parent;
  for (let i = 0; i < n; i++) {
    const j = new THREE.Group();
    if (i > 0) j.position.y = len;
    p.add(j); joints.push(j);
    const ra = lerp(r0, r1, i / n), rb = lerp(r0, r1, (i + 1) / n);
    const g = opts.geo ? opts.geo(i, ra, rb) : new THREE.CylinderGeometry(rb, ra, len, opts.radial || 7, 1);
    if (!opts.geo) g.translate(0, len / 2, 0);
    // a ball at each joint hides the seams between segments
    const m = mesh(g, mat, j);
    if (!opts.noBalls && i > 0) mesh(new THREE.SphereGeometry(ra, opts.radial || 7, 5), mat, j);
    j.userData.seg = m;
    p = j;
  }
  const end = new THREE.Group(); end.position.y = len; p.add(end);
  return { joints, end };
}
/* simple glossy eye: dark ball with a white glint */
function eye(parent, r, x, y, z, color = 0x14100c) {
  const e = noOut(mesh(new THREE.SphereGeometry(r, 10, 8), basic(color), parent, x, y, z));
  const g = noOut(mesh(new THREE.SphereGeometry(r * 0.32, 6, 4), basic(0xffffff), e, r * 0.35 * Math.sign(x || 1) * 0.3, r * 0.4, r * 0.65));
  return e;
}
const hsl = (h, s, l) => new THREE.Color().setHSL(((h % 1) + 1) % 1, clamp(s, 0, 1), clamp(l, 0, 1));

/* ================================================================
   KIPSU
   ================================================================ */
const KIPSU_FUR = [
  [0.5, 0x9a6538, 0xf0dcbc], [0.2, 0xc4582a, 0xf6e4cc], [0.12, 0x8c8a90, 0xe4e2e6],
  [0.1, 0xeeeae2, 0xffffff], [0.08, 0x2c2723, 0x7a7068]];
export function buildKipsu(opts = {}) {
  const rnd = seeded(opts);
  let furC = KIPSU_FUR[0][1], bellyC = KIPSU_FUR[0][2], glowC = 0x5ff0e0;
  if (rnd) {
    let r = rnd(), k = 0; while (k < KIPSU_FUR.length - 1 && r > KIPSU_FUR[k][0]) { r -= KIPSU_FUR[k][0]; k++; }
    furC = hsl(0, 0, 0).set(KIPSU_FUR[k][1]).offsetHSL((rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.08).getHex();
    bellyC = KIPSU_FUR[k][2];
    glowC = hsl(rnd(), 0.85, 0.62).getHex();
  }
  if (opts.color !== undefined) furC = opts.color;
  const root = new THREE.Group();
  const fur = M(furC), belly = M(bellyC), dark = M(0x2a1a12), pink = M(0xe8a0a0);
  const bio = bioKit();
  const glowM = bio.mat(glowC, furC, 0.4, 0.15, 1.9);
  const body = new THREE.Group(); body.position.y = 0.2; root.add(body);
  const torso = mesh(new THREE.SphereGeometry(1, 16, 12), fur, body); torso.scale.set(0.105, 0.1, 0.22);
  const chest = mesh(new THREE.SphereGeometry(1, 12, 10), fur, body, 0, 0.0, 0.13); chest.scale.set(0.1, 0.1, 0.1);
  const bib = mesh(new THREE.SphereGeometry(1, 12, 10), belly, body, 0, -0.025, 0.17); bib.scale.set(0.075, 0.08, 0.07);
  const hips = mesh(new THREE.SphereGeometry(1, 12, 10), fur, body, 0, 0.01, -0.13); hips.scale.set(0.105, 0.105, 0.11);

  // head: a weasel's blunt face with short, cute rounded ears
  const head = new THREE.Group(); head.position.set(0, 0.09, 0.26); body.add(head);
  const skull = mesh(new THREE.SphereGeometry(1, 14, 12), fur, head); skull.scale.set(0.085, 0.075, 0.085);
  const cheeks = mesh(new THREE.SphereGeometry(1, 12, 10), belly, head, 0, -0.03, 0.035); cheeks.scale.set(0.075, 0.045, 0.06);
  const snout = mesh(new THREE.SphereGeometry(1, 12, 10), belly, head, 0, -0.018, 0.075); snout.scale.set(0.038, 0.032, 0.05);
  mesh(new THREE.SphereGeometry(0.013, 8, 6), dark, head, 0, -0.008, 0.123);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.04, 0.04); head.add(jaw);
  const jm = mesh(new THREE.SphereGeometry(1, 10, 8), belly, jaw, 0, 0, 0.035); jm.scale.set(0.03, 0.014, 0.04);
  const whiskG = new THREE.CylinderGeometry(0.0012, 0.0012, 0.1, 3); whiskG.translate(0, 0.05, 0);
  for (const s of [-1, 1]) {
    eye(head, 0.017, s * 0.042, 0.016, 0.068);
    const ear = mesh(new THREE.ConeGeometry(0.032, 0.055, 8), fur, head, s * 0.05, 0.068, -0.012);
    ear.scale.set(1, 1, 0.55); ear.rotation.z = -s * 0.35;
    const inner = mesh(new THREE.ConeGeometry(0.02, 0.035, 6), pink, ear, 0, -0.004, 0.01); inner.scale.set(1, 1, 0.4);
    for (let k = 0; k < 3; k++) {
      const w = noOut(mesh(whiskG, dark, head, s * 0.03, -0.012 - k * 0.006, 0.1));
      w.rotation.set(0.15 + k * 0.1 - 0.1, 0, -s * (1.35 + k * 0.12));
    }
  }

  // big paws on short legs
  const legs = [], pawG = new THREE.SphereGeometry(1, 10, 8), legG = new THREE.CapsuleGeometry(0.024, 0.09, 3, 8);
  [[0.06, 0.13], [-0.06, 0.13], [0.065, -0.14], [-0.065, -0.14]].forEach(([x, z], i) => {
    const hip = new THREE.Group(); hip.position.set(x, -0.03, z); body.add(hip);
    mesh(legG, i < 2 ? fur : fur, hip, 0, -0.07, 0);
    const paw = mesh(pawG, i < 2 ? belly : fur, hip, 0, -0.152, 0.015); paw.scale.set(0.038, 0.024, 0.05);
    legs.push(hip);
  });

  // the plume tail: three fluffy puffs, the last one pale-tipped
  const puffG = displace(new THREE.IcosahedronGeometry(1, 2), 0.12, 2.5, 3);
  const tail = new THREE.Group(); tail.position.set(0, 0.04, -0.27); body.add(tail);
  const tj = []; let tp = tail;
  [[0.06, 0.0], [0.095, 0.1], [0.1, 0.13], [0.075, 0.12]].forEach(([r, d], i) => {
    const j = new THREE.Group(); j.position.y = d; tp.add(j); tj.push(j); tp = j;
    const p = mesh(puffG, i === 3 ? belly : fur, j); p.scale.set(r, r * 1.25, r);
  });
  tail.rotation.x = -2.0;

  // bioluminescent patches: anywhere on the body, not always many
  const spots = [];
  const anchors = [
    [body, 0.09, 0.05, 0.02], [body, -0.09, 0.05, 0.02], [body, 0.08, 0.03, -0.1], [body, -0.08, 0.03, -0.1],
    [body, 0, 0.1, -0.05], [body, 0, 0.1, 0.08], [head, 0.05, 0.05, 0.03], [head, -0.05, 0.05, 0.03],
    [body, 0.1, -0.02, 0.12], [body, -0.1, -0.02, 0.12], [tj[2], 0.06, 0.03, 0], [tj[1], -0.07, 0.02, 0.02],
    [legs[0], 0.02, -0.06, 0.02], [legs[3], -0.02, -0.06, 0.02], [head, 0, 0.07, 0.0], [body, 0, 0.1, -0.15]];
  let pick = [0, 1, 2, 3, 11, 4];
  if (rnd) { pick = []; const cnt = 1 + Math.floor(rnd() * rnd() * 7); while (pick.length < cnt) { const k = Math.floor(rnd() * anchors.length); if (!pick.includes(k)) pick.push(k); } }
  const spotG = new THREE.SphereGeometry(1, 8, 6);
  for (const k of pick) {
    const [par, x, y, z] = anchors[k];
    const sp = noOut(mesh(spotG, glowM, par, x, y, z)); const r = rnd ? 0.012 + rnd() * 0.012 : 0.016;
    sp.scale.set(r, r * 0.8, r * 1.5);
    spots.push(sp);
  }
  // a second pattern on some: a dotted stripe down the spine, or glowing ear tips and tail tip
  const style = rnd ? Math.floor(rnd() * 3) : 1;
  if (style === 1) bioMesh(bioDots(dotRun([0, 1, 0.75], [0, 0.85, -0.85], 7, 0.012, 0.007), 0.105, 0.1, 0.22), glowM, torso);
  else if (style === 2) {
    for (const s of [-1, 1]) bioMesh(bioDots([[s * 0.05 + s * 0.012, 0.068 + 0.022, -0.012, s * 0.4, 1, 0, 0.009, 0.6]]), glowM, head);
    const tipP = tj[3].children[0]; bioMesh(bioDots([[0, 1, 0, 0.5], [0.7, 0.5, 0.4, 0.35], [-0.7, 0.5, -0.3, 0.35]]), glowM, tipP);
  }
  const halo = glowSprite(glowC, 0.5, 0.25); halo.position.y = 0.22; root.add(halo);

  finish(root, 0.0055);
  bio.glow(0); halo.visible = false;
  const sc = 1 * (opts.scale || 1); root.scale.setScalar(sc);
  let ph = Math.random() * TAU, walkW = 0;
  const flash = makeFlash([fur]);
  return {
    root, mats: [fur], flash, head, tail,
    animate(dt, st) {
      const sp = st.speed || 0, wind = st.windup || 0, atk = st.attack || 0, t = st.t || 0;
      walkW += (clamp(sp / 0.4, 0, 1) - walkW) * Math.min(1, dt * 6);
      ph += dt * (sp / sc) * 9;
      // a bounding gait: front pair, then hind pair, the back flexing between
      const b = Math.sin(ph);
      legs.forEach((l, i) => { l.rotation.x = walkW * (i < 2 ? b : -b) * 0.9; });
      body.rotation.x = walkW * Math.cos(ph) * 0.12 + wind * 0.15 * (1 - atk) - atk * 0.2;
      body.position.y = 0.2 + walkW * Math.abs(Math.cos(ph)) * 0.04 + Math.sin(t * 2.4) * 0.003 - wind * (1 - atk) * 0.05 + atk * 0.06;
      body.position.z = atk * 0.14;
      head.rotation.x = -wind * 0.25 + atk * 0.1 + Math.sin(t * 1.3) * 0.04;
      head.rotation.y = (1 - walkW) * Math.sin(t * 0.8) * 0.35;
      jaw.rotation.x = atk * 0.6;
      tail.rotation.x = -2.15 + wind * 0.5 - walkW * 0.3;
      tj.forEach((j, i) => { j.rotation.z = Math.sin(t * 2.2 - i * 0.7) * 0.18 * (1 + walkW); j.rotation.x = i ? 0.28 : 0; });
      halo.material.opacity = (0.2 + Math.sin(t * 2.5) * 0.08) * bio.v; halo.visible = bio.v > 0.02;
    },
    glow(v) { bio.glow(v); halo.visible = bio.v > 0.02; },
  };
}

/* ================================================================
   RODAK
   ================================================================ */
export function buildRodak(opts = {}) {
  const rnd = seeded(opts);
  const root = new THREE.Group();
  const oil = M(0x1d1c24, { emissive: 0x07060c }), sheen = M(0x2e3850, { emissive: 0x080c14 }), dark = M(0x0c0b10);
  const blackEyes = opts.eyes === 'black' || (rnd && rnd() < 0.25);
  const bio = bioKit();
  const RODAK_GLOW = [0x6a9cff, 0x7affc0, 0xb07aff, 0x5ae0ff];
  const bioC = rnd ? RODAK_GLOW[Math.floor(rnd() * RODAK_GLOW.length)] : RODAK_GLOW[0];
  const lineM = bio.mat(bioC, 0x1d1c24, 0.3, 0.12, 2.0);
  const body = new THREE.Group(); body.position.y = 1.0; root.add(body);
  // deep chest, tucked waist, narrow hips — lean
  const chest = mesh(new THREE.SphereGeometry(1, 16, 12), oil, body, 0, -0.04, 0.33); chest.scale.set(0.2, 0.27, 0.3);
  const waist = mesh(new THREE.CapsuleGeometry(0.12, 0.5, 4, 10), oil, body, 0, 0.03, -0.08); waist.rotation.x = Math.PI / 2;
  const hips = mesh(new THREE.SphereGeometry(1, 14, 10), oil, body, 0, 0.02, -0.42); hips.scale.set(0.16, 0.18, 0.2);
  // an oily sheen down the spine and over the shoulders
  const spine = mesh(new THREE.CapsuleGeometry(0.06, 0.95, 3, 8), sheen, body, 0, 0.13, -0.05); spine.rotation.x = Math.PI / 2 - 0.05; spine.scale.set(1, 1, 0.5);
  for (const s of [-1, 1]) { const sh = mesh(new THREE.SphereGeometry(1, 10, 8), sheen, body, s * 0.12, 0.08, 0.38); sh.scale.set(0.05, 0.09, 0.12); }

  // bioluminescence: a dotted lateral line down each flank, like a deep-sea fish, and a
  // few dots along the spine; some Rodak carry a second broken row lower down
  {
    const sxAt = (y, z) => {
      const ch = 1 - ((y + 0.04) / 0.27) ** 2 - ((z - 0.33) / 0.3) ** 2, hp = 1 - ((y - 0.02) / 0.18) ** 2 - ((z + 0.42) / 0.2) ** 2;
      return Math.max(ch > 0 ? 0.2 * Math.sqrt(ch) : 0, hp > 0 ? 0.16 * Math.sqrt(hp) : 0, z > -0.42 && z < 0.3 ? Math.sqrt(Math.max(0, 0.0144 - (y - 0.03) ** 2)) : 0);
    };
    const pts = [], rows = [[0.02, 1]];
    if (!rnd || rnd() < 0.5) rows.push([-0.07, 0]);
    for (const [y, full] of rows) for (let i = 0; i < 11; i++) {
      const z = lerp(0.52, -0.5, i / 10); if (!full && i % 3 === 2) continue;
      for (const s of [-1, 1]) pts.push([s * (sxAt(y, z) + 0.004), y, z, s, 0, 0, full ? 0.014 : 0.01, 0.5]);
    }
    for (let i = 0; i < 6; i++) pts.push([0, 0.205, lerp(0.35, -0.42, i / 5), 0, 1, 0, 0.012, 0.5]);
    bioMesh(bioDots(pts), lineM, body);
  }
  // a neck reaching forward and down: the head is carried low and watchful
  const neck = mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.42, 9), oil, body, 0, 0.0, 0.66); neck.rotation.x = 1.9;
  const head = new THREE.Group(); head.position.set(0, -0.12, 0.88); body.add(head);
  const skull = mesh(new THREE.SphereGeometry(1, 14, 10), oil, head); skull.scale.set(0.1, 0.095, 0.13);
  const muzzle = mesh(new THREE.CylinderGeometry(0.035, 0.07, 0.26, 8), oil, head, 0, -0.03, 0.17); muzzle.rotation.x = Math.PI / 2;
  mesh(new THREE.SphereGeometry(0.03, 8, 6), dark, head, 0, -0.02, 0.3);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.06, 0.05); head.add(jaw);
  const jm = mesh(new THREE.CylinderGeometry(0.025, 0.05, 0.22, 7), oil, jaw, 0, -0.01, 0.12); jm.rotation.x = Math.PI / 2;
  const fangG = hornGeo(0.04, 0.009, 0, 4);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.04, 0.14, 5), oil, head, s * 0.06, 0.1, -0.04); ear.rotation.set(-0.35, 0, -s * 0.2); ear.scale.z = 0.6;
    const f = mesh(fangG, M(0xe8e0c8), head, s * 0.03, -0.06, 0.25); f.rotation.x = Math.PI;
    if (blackEyes) eye(head, 0.022, s * 0.062, 0.03, 0.09);
    else {
      const e = noOut(mesh(new THREE.SphereGeometry(1, 10, 8), basic(0xf2cf2a), head, s * 0.062, 0.03, 0.09)); e.scale.set(0.024, 0.016, 0.014);
      noOut(mesh(new THREE.BoxGeometry(0.006, 0.026, 0.01), basic(0x050505), head, s * 0.064, 0.03, 0.102));
      const g = glowSprite(0xffe060, 0.09, 0.6); g.position.set(s * 0.064, 0.03, 0.1); head.add(g);
      bio.sprite(g, 0.85, 0.65);  // eyeshine at night
    }
  }

  // long, lean legs with digitigrade hocks
  const legs = [], upG = new THREE.CapsuleGeometry(0.05, 0.36, 3, 8), loG = new THREE.CapsuleGeometry(0.035, 0.36, 3, 8), pawG = new THREE.SphereGeometry(1, 8, 6);
  const mkLeg = (x, y, z, hind) => {
    const hip = new THREE.Group(); hip.position.set(x, y, z); body.add(hip);
    const u = mesh(upG, oil, hip, 0, -0.2, 0); if (hind) u.scale.set(1.5, 1, 1.5);
    const knee = new THREE.Group(); knee.position.y = -0.42; hip.add(knee);
    mesh(loG, oil, knee, 0, -0.2, 0);
    const ankle = new THREE.Group(); ankle.position.y = -0.4; knee.add(ankle);
    if (hind) mesh(loG, oil, ankle, 0, -0.09, 0).scale.set(0.8, 0.45, 0.8);
    const paw = mesh(pawG, dark, ankle, 0, hind ? -0.17 : -0.02, 0.03); paw.scale.set(0.045, 0.025, 0.07);
    legs.push({ hip, knee, ankle, hind });
  };
  mkLeg(0.11, -0.08, 0.38, false); mkLeg(-0.11, -0.08, 0.38, false);
  mkLeg(0.1, -0.02, -0.44, true); mkLeg(-0.1, -0.02, -0.44, true);

  // long thin tail
  const tail = new THREE.Group(); tail.position.set(0, 0.06, -0.58); body.add(tail);
  const tc = chain(tail, 7, 0.13, 0.035, 0.008, oil, { radial: 6 });
  tail.rotation.x = -2.3;

  finish(root, 0.012);
  bio.glow(0);
  let ph = Math.random() * TAU, walkW = 0;
  const flash = makeFlash([oil]);
  return {
    root, mats: [oil], flash, head, glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, wind = st.windup || 0, atk = st.attack || 0, t = st.t || 0;
      walkW += (clamp(sp / 0.5, 0, 1) - walkW) * Math.min(1, dt * 6);
      ph += dt * (sp / 1.4) * TAU;
      // trot: diagonal pairs move together
      legs.forEach((l, i) => {
        const p = ph + ((i === 0 || i === 3) ? 0 : Math.PI);
        const s = Math.sin(p), lift = Math.max(0, Math.cos(p));
        if (l.hind) {
          l.hip.rotation.x = -0.45 + walkW * s * 0.45 - wind * 0.3 * (1 - atk);
          l.knee.rotation.x = 1.0 + walkW * lift * 0.5 + wind * 0.4 * (1 - atk);
          l.ankle.rotation.x = -0.55 - walkW * lift * 0.2;
        } else {
          l.hip.rotation.x = walkW * s * 0.5 + atk * -0.4;
          l.knee.rotation.x = -walkW * lift * 0.9;
          l.ankle.rotation.x = walkW * lift * 0.4;
        }
      });
      body.position.y = 1.0 + walkW * Math.abs(Math.cos(ph)) * 0.04 + Math.sin(t * 1.8) * 0.006 - wind * (1 - atk) * 0.15;
      body.position.z = atk * 0.25;
      body.rotation.x = -wind * (1 - atk) * 0.08 + atk * 0.1;
      head.rotation.x = 0.15 + wind * 0.3 * (1 - atk) - atk * 0.35 + Math.sin(t * 1.1) * 0.03;
      head.rotation.y = (1 - walkW) * Math.sin(t * 0.6) * 0.45;
      jaw.rotation.x = atk * 0.55 + wind * 0.15;
      tc.joints.forEach((j, i) => { j.rotation.x = i ? 0.06 : 0; j.rotation.z = Math.sin(t * 1.6 - i * 0.6) * 0.12 * (0.5 + walkW); });
    },
  };
}

/* ================================================================
   KOFI GALTA — and BIG MOMMA KOFI
   ================================================================ */
function kofiCore(opts, mode) {
  const rnd = seeded(opts);
  let c = opts.color ?? 0xb08a5a;
  if (rnd && opts.color === undefined) c = hsl(0.05 + rnd() * 0.08, 0.25 + rnd() * 0.35, 0.3 + rnd() * 0.35).getHex();
  const baby = mode === 'baby', momma = mode === 'momma';
  const root = new THREE.Group();
  const hair = M(c), hairD = M(new THREE.Color(c).multiplyScalar(0.72).getHex()), horn = M(0xeee2c4), dark = M(0x2a1e16);
  const bladeM = M(new THREE.Color(c).multiplyScalar(0.5).lerp(new THREE.Color(0x5a5866), 0.55).getHex());
  const tuftM = M(new THREE.Color(c).multiplyScalar(0.26).getHex());
  // bioluminescence: the tips of the long tail-whiskers glow like fibre-optic threads,
  // and a bead of light sits at the root of every blade
  const bio = bioKit();
  const glowC = opts.glowColor ?? (rnd ? hsl(0.45 + rnd() * 0.45, 0.85, 0.65).getHex() : 0x8ae8ff);
  const tipM = bio.mat(glowC, c, 0.35, 0.1, 2.0);
  const fat = momma ? 1.18 : 1;
  const body = new THREE.Group(); body.position.y = momma ? 0.2 : 0.19; root.add(body);
  // the long crescent body: a furry tube bent along an arc, both ends curving up
  // (tail end behind, head end in front); u = 0 at the tail, 1 at the head
  const Rc = 0.27, th0 = -1.1, th1 = 1.1;
  const arcPt = u => { const th = lerp(th0, th1, u); return new THREE.Vector3(0, Rc * (1 - Math.cos(th)), Rc * Math.sin(th)); };
  const arcN = u => { const th = lerp(th0, th1, u); return new THREE.Vector3(0, Math.cos(th), -Math.sin(th)); };   // the inner (top) side
  const rad = u => (0.022 + 0.098 * Math.pow(Math.sin(Math.PI * (0.08 + u * 0.86)), 0.6)) * fat;
  const T = baby ? 16 : 26, RS = baby ? 7 : 10;
  const path = new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => arcPt(i / 12)));
  const tg = new THREE.TubeGeometry(path, T, 1, RS, false);
  {
    const p = tg.attributes.position, P = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i <= T; i++) {
      const u = i / T; path.getPointAt(u, P); const r = rad(u);
      for (let j = 0; j <= RS; j++) {
        const k = i * (RS + 1) + j; v.fromBufferAttribute(p, k).sub(P);
        const n = noise3(v.x * 9 + 3, (P.y + v.y) * 9, (P.z + v.z) * 9 - 1);
        const fur = 1 + (n - 0.5) * 0.3;
        p.setXYZ(k, P.x + v.x * r * 0.86 * fur, P.y + v.y * r * fur, P.z + v.z * r * fur);
      }
    }
    tg.computeVertexNormals();
  }
  const ball = mesh(tg, hair, body);
  // the head: a round furry knob on the raised front end, two little horns, eyes, a dark nose
  const hp = arcPt(1).add(new THREE.Vector3(0, 0.025, 0.035)), hr = 0.075 * (momma ? 1.08 : 1);
  const head = mesh(displace(new THREE.IcosahedronGeometry(1, baby ? 1 : 2), 0.1, 6, 5, 0.6), hair, body, hp.x, hp.y, hp.z);
  head.scale.set(hr * 0.95, hr * 0.9, hr * 1.1);
  const hornG = hornGeo(0.1, 0.019, -0.8, 6);
  for (const s of [-1, 1]) {
    const h = mesh(hornG, horn, body, hp.x + s * 0.035, hp.y + hr * 0.7, hp.z - 0.005); h.rotation.set(-0.35, 0, -s * 0.4);
    eye(body, 0.014, hp.x + s * 0.04, hp.y + 0.012, hp.z + hr * 0.92);
  }
  mesh(new THREE.SphereGeometry(0.014, 6, 4), dark, body, hp.x, hp.y - 0.012, hp.z + hr * 1.08);
  // a cap of fur closing the tail end, then the fluffy dark tuft
  const tp = arcPt(0), tdir = new THREE.Vector3(0, -Math.sin(th0), -Math.cos(th0));   // pointing out of the tail end
  mesh(new THREE.SphereGeometry(rad(0) * 1.1, 8, 6), hair, body, tp.x, tp.y, tp.z);
  const tuft = [], tfr = mulberry32(7);
  const nT = baby ? 4 : 7;
  for (let i = 0; i < nT; i++) {
    const a = i / nT * TAU, rr = i ? 0.035 : 0;
    const q = tp.clone().addScaledVector(tdir, 0.035 + (i ? 0.02 : 0.05) + tfr() * 0.02);
    q.x += Math.cos(a) * rr; q.y += Math.sin(a) * rr * 0.7; q.z += Math.sin(a) * rr * 0.4;
    tuft.push(placed(displace(new THREE.IcosahedronGeometry(1, 1), 0.3, 4, i + 2, 0.5), q.x, q.y, q.z, 0, 0, 0, (0.05 + tfr() * 0.02) * (baby ? 0.9 : 1) * fat));
  }
  mesh(merge(tuft), tuftM, body);
  // blade-like spines along the top of the crescent, each leaning back a little
  const bladeSh = new THREE.Shape();
  bladeSh.moveTo(-0.02, 0); bladeSh.quadraticCurveTo(-0.022, 0.55, -0.045, 1); bladeSh.quadraticCurveTo(0.006, 0.5, 0.02, 0); bladeSh.lineTo(-0.02, 0);
  const bladeG = new THREE.ExtrudeGeometry(bladeSh, { depth: 0.006, bevelEnabled: false, curveSegments: 4 });
  bladeG.translate(0, 0, -0.003); bladeG.rotateY(-Math.PI / 2);   // blade in the y-z plane, tip leaning to -z (back)
  const blades = [], beads = [], nB = baby ? 4 : 7;
  for (let i = 0; i < nB; i++) {
    const u = lerp(0.16, 0.84, i / (nB - 1)), pt = arcPt(u), nn = arcN(u), r = rad(u);
    const h = (0.085 + 0.075 * Math.sin(Math.PI * u)) * fat;
    const at = pt.clone().addScaledVector(nn, r * 0.88);
    const th = lerp(th0, th1, u);
    const g = bladeG.clone(); g.scale(1.2, h, fat);
    blades.push(placed(g, at.x, at.y, at.z, -th, 0, 0));
    if (!baby) for (const s of [-1, 1]) beads.push([at.x + s * 0.006, at.y, at.z, s, 0.4, 0, 0.009, 0.6]);
  }
  mesh(merge(blades), bladeM, body);
  if (!baby) bioMesh(bioDots(beads), tipM, body);
  // lots of tiny legs underneath (wave gait), hung along the belly of the crescent
  const legs = [], nL = baby ? 6 : (opts.legs || 10);
  const legG = merge([placed(new THREE.CylinderGeometry(0.007, 0.01, 0.08, 5), 0, -0.04, 0), placed(new THREE.SphereGeometry(0.013, 6, 4), 0, -0.08, 0.006, 0, 0, 0, 1, 0.6, 1.3)]);
  for (let i = 0; i < nL; i++) {
    const s = i % 2 ? 1 : -1, k = Math.floor(i / 2), n2 = nL / 2;
    const u = lerp(0.7, 0.3, n2 > 1 ? k / (n2 - 1) : 0.5), pt = arcPt(u);
    const hip = new THREE.Group(); hip.position.set(s * 0.05 * fat, pt.y - rad(u) * 0.55, pt.z); hip.rotation.z = s * 0.3; body.add(hip);
    // legs reach to the same ground line wherever they hang from
    const sc = (body.position.y + hip.position.y - 0.005) / (0.093 * Math.cos(0.3));
    mesh(legG, dark, hip).scale.y = clamp(sc, 0.8, 1.8);
    legs.push({ hip, k, s });
  }
  // long whisker-hairs streaming back out of the tail tuft
  const strands = [], nS = baby ? 3 : 6, segs = baby ? 2 : 4;
  for (let i = 0; i < nS; i++) {
    const a = (i / (nS - 1) - 0.5) * 2.0;
    const base = new THREE.Group(); body.add(base);
    base.position.copy(tp).addScaledVector(tdir, 0.05); base.position.x += Math.sin(a) * 0.03; base.position.y += Math.cos(a) * 0.02;
    base.rotation.set(-2.25 - Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.5);
    const ch = chain(base, segs, 0.075, 0.005, 0.0015, i % 2 ? hairD : tuftM, { radial: 4, noBalls: true });
    const last = ch.joints[segs - 1].userData.seg; last.material = tipM; noOut(last);
    strands.push({ base, joints: ch.joints, ph: i * 0.9 });
  }
  bio.glow(0);
  return { root, body, ball, legs, strands, hair, nL, bio };
}
function animateKofi(k, dt, st, ph) {
  const sp = st.speed || 0, wind = st.windup || 0, atk = st.attack || 0, t = st.t || 0;
  const w = clamp(sp / 0.3, 0, 1);
  for (const l of k.legs) l.hip.rotation.x = w * Math.sin(ph + l.k * 1.1 + (l.s > 0 ? Math.PI : 0)) * 0.7;
  k.body.position.y = k.y0 + w * Math.abs(Math.sin(ph * 2)) * 0.012 + Math.sin(t * 3) * 0.004 - wind * (1 - atk) * 0.03;
  k.body.rotation.x = -wind * (1 - atk) * 0.25 + atk * 0.35; // horns down to butt
  k.body.position.z = atk * 0.1;
  for (const s of k.strands) s.joints.forEach((j, i) => {
    j.rotation.x = Math.sin(t * 3 + s.ph - i * 1.3) * (0.22 + w * 0.15) + (i ? 0.22 : 0) - w * 0.2;
    j.rotation.z = Math.sin(t * 2.2 + s.ph * 1.3 - i * 1.1) * 0.25;
  });
}
export function buildKofi(opts = {}) {
  const k = kofiCore(opts, 'kofi'); k.y0 = k.body.position.y;
  finish(k.root, 0.006);
  let ph = Math.random() * TAU;
  return {
    root: k.root, mats: [k.hair], flash: makeFlash([k.hair]), glow: k.bio.glow,
    animate(dt, st) { ph += dt * (st.speed || 0) * 40; animateKofi(k, dt, st, ph); },
  };
}
export function buildBigMommaKofi(opts = {}) {
  const k = kofiCore(opts, 'momma'); k.y0 = k.body.position.y;
  // babies: two clinging to her back, one tagging along beside her
  const babies = [];
  [[0.075, 0.135, -0.03, 0.32, 0.4], [-0.08, 0.12, -0.1, 0.3, -0.5], [0.3, 0, 0.05, 0.36, 0.2]].forEach(([x, y, z, s, ry], i) => {
    const b = kofiCore({ color: opts.color, seed: opts.seed !== undefined ? opts.seed + i + 1 : undefined }, 'baby'); b.y0 = b.body.position.y;
    b.root.position.set(x, y, z); b.root.scale.setScalar(s); b.root.rotation.y = ry; k.body.add(b.root);
    if (i === 2) { k.root.add(b.root); b.root.position.set(x, 0, z); }
    babies.push(b);
  });
  finish(k.root, 0.006);
  let ph = Math.random() * TAU;
  return {
    root: k.root, mats: [k.hair], flash: makeFlash([k.hair]), babies,
    glow(v) { k.bio.glow(v); for (let i = 0; i < babies.length; i++) babies[i].bio.glow(v); },
    animate(dt, st) {
      ph += dt * (st.speed || 0) * 36; animateKofi(k, dt, st, ph);
      for (let i = 0; i < babies.length; i++) animateKofi(babies[i], dt, { speed: i === 2 ? st.speed : 0, t: (st.t || 0) * 1.3 + i }, ph * 1.4 + i);
    },
  };
}

/* ================================================================
   SRU VORN
   ================================================================ */
/* a mace-ball: sphere studded with spikes (merged) */
function maceGeo(r, n, spikeLen, spikeR) {
  const parts = [new THREE.IcosahedronGeometry(r, 1)];
  const cone = hornGeo(spikeLen, spikeR, 0, 5), d = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    // golden-spiral directions spread the spikes evenly
    const y = 1 - (i + 0.5) / n * 2, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
    d.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
    parts.push(along(cone, d.clone().multiplyScalar(r * 0.85), d));
  }
  return merge(parts);
}
/* a fringe of hair tufts: cones hanging from a line of points */
function fringeGeo(pts, len, r, dir, jitter, rnd) {
  const cone = hornGeo(len, r, 0.3, 4), parts = [];
  for (const p of pts) {
    const d = dir.clone(); d.x += (rnd() - 0.5) * jitter; d.z += (rnd() - 0.5) * jitter;
    parts.push(along(cone, p, d, 0.75 + rnd() * 0.5));
  }
  return merge(parts);
}
export function buildSruVorn(opts = {}) {
  const rnd = seeded(opts), fr = mulberry32(77);
  let c = 0x6a5038;
  if (rnd) c = hsl(rnd(), 0.15 + rnd() * 0.35, 0.18 + rnd() * 0.32).getHex();
  if (opts.color !== undefined) c = opts.color;
  const furC = new THREE.Color(c);
  const fur = M(c), furD = M(furC.clone().multiplyScalar(0.62).getHex());
  const skin = M(furC.clone().lerp(new THREE.Color(0x3a2a22), 0.5).getHex()), tusk = M(0xf0e4c8), claw = M(0x2a2018);
  const acid = basic(0x9cff3a);
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 1.32; root.add(body);
  // bioluminescence: two staggered rows of rosettes along each flank and a glowing mace
  const bio = bioKit();
  const SRU_GLOW = [0xc8ff4a, 0x5affd0, 0xffb44a, 0x9a8aff];
  const bioC = rnd ? SRU_GLOW[Math.floor(rnd() * SRU_GLOW.length)] : SRU_GLOW[0];
  const rosM = bio.mat(bioC, c, 0.3, 0.1, 1.9);
  {
    const pts = [];
    for (let i = 0; i < 9; i++) for (const [y, off] of [[0.24, 0], [0.08, 0.5]]) {
      const z = lerp(0.8, -0.85, (i + off) / 9), x = 1.05 * Math.sqrt(0.3025 - y * y) + 0.03;
      for (const s of [-1, 1]) pts.push([s * x, y, z, s * x / 1.1, y, 0, 0.06 - Math.abs(z) * 0.015, 0.4]);
    }
    bioMesh(bioDots(pts), rosM, body);
  }
  // long, deep, hairy torso
  const tg = displace(new THREE.CapsuleGeometry(0.55, 1.15, 6, 14), 0.07, 4, 1, 0.7); tg.rotateX(Math.PI / 2);
  const torso = mesh(tg, fur, body); torso.scale.set(1.05, 1.0, 1);
  // dense shaggy hair: a mane down the back and fringes hanging off the flanks
  const back = [], flankL = [], flankR = [];
  for (let i = 0; i < 60; i++) { const z = lerp(-0.95, 0.95, (i + fr()) / 60), x = (fr() - 0.5) * 0.85; back.push(new THREE.Vector3(x, Math.sqrt(0.3 - x * x) * 0.95, z)); }
  for (let i = 0; i < 22; i++) { const z = lerp(-0.9, 0.8, i / 21); flankL.push(new THREE.Vector3(0.5, -0.08 + fr() * 0.1, z)); flankR.push(new THREE.Vector3(-0.5, -0.08 + fr() * 0.1, z)); }
  mesh(fringeGeo(back, 0.26, 0.08, new THREE.Vector3(0, 0.45, -1), 0.9, fr), furD, body);
  mesh(fringeGeo(flankL, 0.42, 0.1, new THREE.Vector3(0.35, -1, -0.15), 0.4, fr), furD, body);
  mesh(fringeGeo(flankR, 0.42, 0.1, new THREE.Vector3(-0.35, -1, -0.15), 0.4, fr), furD, body);

  // komodo head: long, flat and broad, on a thick neck; tusks from the lower jaw
  const neck = mesh(new THREE.CylinderGeometry(0.34, 0.46, 0.5, 10), fur, body, 0, 0.0, 1.05); neck.rotation.x = 1.75;
  const head = new THREE.Group(); head.position.set(0, -0.12, 1.3); body.add(head);
  const skull = mesh(new THREE.SphereGeometry(1, 16, 10), skin, head, 0, 0.02, 0.3); skull.scale.set(0.36, 0.24, 0.62);
  const brow = mesh(displace(new THREE.SphereGeometry(1, 12, 8), 0.12, 4, 2), fur, head, 0, 0.14, 0.02); brow.scale.set(0.38, 0.2, 0.36);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.08, 0.0); head.add(jaw);
  const jm = mesh(new THREE.SphereGeometry(1, 14, 8), skin, jaw, 0, -0.06, 0.32); jm.scale.set(0.32, 0.13, 0.56);
  const nT = clamp(opts.tusks ?? 2, 0, 6), tuskG = hornGeo(0.55, 0.075, 1.2, 7);
  for (let i = 0; i < nT; i++) {
    const s = i % 2 ? -1 : 1, k = Math.floor(i / 2);
    const t = mesh(tuskG, tusk, jaw, s * (0.27 - k * 0.03), -0.04, 0.62 - k * 0.22);
    t.rotation.set(-0.2, 0, -s * 0.35); t.scale.setScalar(1 - k * 0.25);
  }
  for (const s of [-1, 1]) {
    const e = noOut(mesh(new THREE.SphereGeometry(0.04, 8, 6), basic(0xff9a20), head, s * 0.25, 0.13, 0.3));
    const g = glowSprite(0xffa030, 0.18, 0.7); g.position.copy(e.position); head.add(g);
    bio.sprite(g, 0.9, 0.7);
    mesh(new THREE.SphereGeometry(0.025, 6, 4), claw, head, s * 0.08, 0.1, 0.88);
  }
  // acid drool: drips hanging from the jaw
  const dripG = merge([new THREE.SphereGeometry(0.04, 8, 6), placed(new THREE.ConeGeometry(0.03, 0.12, 6), 0, 0.07, 0)]);
  const drips = [];
  [[0.17, 0.45], [-0.15, 0.52], [0.05, 0.62]].forEach(([x, z], i) => {
    const d = noOut(mesh(dripG, acid, jaw, x, -0.2, z)); drips.push(d);
  });
  const drool = glowSprite(0x9cff3a, 0.9, 0.6); drool.position.set(0, -0.25, 0.55); jaw.add(drool);

  // legs held upright under the body (a "high walk")
  const legs = [], upG = new THREE.CylinderGeometry(0.15, 0.2, 0.62, 9), loG = new THREE.CylinderGeometry(0.12, 0.15, 0.6, 9);
  const footG = merge([placed(new THREE.SphereGeometry(1, 10, 6), 0, 0, 0.06, 0, 0, 0, 0.18, 0.09, 0.25),
    ...[-0.1, 0, 0.1].map(x => placed(hornGeo(0.14, 0.035, 0.6, 5), x, 0, 0.26, 1.35, 0, 0))]);
  [[0.55, 0.7], [-0.55, 0.7], [0.55, -0.62], [-0.55, -0.62]].forEach(([x, z], i) => {
    const hip = new THREE.Group(); hip.position.set(x, -0.12, z); body.add(hip);
    mesh(upG, fur, hip, 0, -0.31, 0).geometry;
    const knee = new THREE.Group(); knee.position.y = -0.6; hip.add(knee);
    mesh(new THREE.SphereGeometry(0.15, 8, 6), fur, knee);
    mesh(loG, skin, knee, 0, -0.3, 0);
    const foot = mesh(footG, claw, knee, 0, -0.6, 0);
    legs.push({ hip, knee, foot, i });
  });

  // heavy tail ending in a spiked mace-ball
  const tail = new THREE.Group(); tail.position.set(0, 0.1, -1.0); body.add(tail);
  tail.rotation.x = -2.05;
  const tc = chain(tail, 3, 0.34, 0.4, 0.16, fur, { radial: 9 });
  const mace = mesh(maceGeo(0.3, 18, 0.28, 0.08), bio.mat(bioC, 0x3a3028, 0.1, 0.0, 0.7), tc.end, 0, 0.2, 0);

  finish(root, 0.03);
  bio.glow(0);
  let ph = Math.random() * TAU, walkW = 0;
  const flash = makeFlash([fur, skin]);
  return {
    root, mats: [fur], flash, head, tail, acid, glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, wind = st.windup || 0, atk = st.attack || 0, t = st.t || 0;
      walkW += (clamp(sp / 0.5, 0, 1) - walkW) * Math.min(1, dt * 5);
      ph += dt * (sp / 2.4) * TAU;
      // lateral-sequence walk: LH, LF, RH, RF
      legs.forEach((l, i) => {
        const p = ph + GAIT4[i], s = Math.sin(p), lift = Math.max(0, Math.cos(p));
        l.hip.rotation.x = walkW * s * 0.38;
        l.knee.rotation.x = -walkW * lift * 0.5 * (i < 2 ? 1 : -1) * -1;
        l.foot.rotation.x = -l.hip.rotation.x - l.knee.rotation.x;
      });
      // a body that rolls with each step; head swings low side to side
      body.position.y = 1.32 + walkW * Math.abs(Math.sin(ph)) * 0.05 + Math.sin(t * 1.3) * 0.015 - wind * (1 - atk) * 0.12;
      body.rotation.z = walkW * Math.sin(ph) * 0.04;
      body.rotation.y = walkW * Math.sin(ph) * 0.05;
      body.position.z = atk * 0.35;
      head.rotation.y = -walkW * Math.sin(ph) * 0.15 + (1 - walkW) * Math.sin(t * 0.5) * 0.25;
      head.rotation.x = 0.05 - wind * (1 - atk) * 0.3 + atk * 0.25;
      jaw.rotation.x = 0.06 + wind * 0.5 * (1 - atk) + atk * 0.15 + Math.max(0, Math.sin(t * 0.7)) * 0.05;
      tc.joints.forEach((j, i) => { j.rotation.z = Math.sin(t * 1.2 - i * 0.6) * 0.1 + walkW * Math.sin(ph - i) * 0.08; j.rotation.x = i ? 0.22 + wind * 0.15 : 0; });
      for (let i = 0; i < drips.length; i++) { const k = ((t * 0.6 + i * 0.33) % 1); drips[i].scale.set(1, 0.6 + k * 1.4, 1); drips[i].position.y = -0.2 - k * 0.12; }
      drool.material.opacity = 0.45 + Math.sin(t * 5) * 0.2;
    },
  };
}

/* ================================================================
   ULAR NAGA — the earth hydra
   ================================================================ */
/* armour scales laid over an ellipsoid (radii rx, ry, rz) above a latitude */
function scalesGeo(rx, ry, rz, rows, perRow, minLat, size, rnd) {
  const plate = new THREE.CylinderGeometry(size, size * 1.15, size * 0.35, 6), parts = [], n = new THREE.Vector3(), p = new THREE.Vector3();
  for (let r = 0; r < rows; r++) {
    const lat = lerp(minLat, 1.45, r / (rows - 1));
    const cnt = Math.max(3, Math.round(perRow * Math.cos(lat)));
    for (let i = 0; i < cnt; i++) {
      const lon = (i + (r % 2) * 0.5) / cnt * TAU;
      const cx = Math.cos(lat) * Math.cos(lon), cy = Math.sin(lat), cz = Math.cos(lat) * Math.sin(lon);
      if (cy < -0.1) continue;
      p.set(cx * rx, cy * ry, cz * rz);
      n.set(cx / rx, cy / ry, cz / rz).normalize();
      parts.push(along(plate, p, n, 0.85 + rnd() * 0.3));
    }
  }
  return merge(parts);
}
export function buildUlarNaga(opts = {}) {
  const nHeads = clamp(Math.round(opts.heads ?? 3), 1, 5);
  const fr = mulberry32(31);
  const root = new THREE.Group();
  const rig = new THREE.Group(); rig.scale.setScalar(0.72); root.add(rig); // modelled large, scaled to ~10 m
  const hide = M(0x4f6b34), plate = M(0x6b5a32), belly = M(0xb7a56a), dark = M(0x2a2418);
  const sailM = M(0xa8743a, { side: THREE.DoubleSide }), horn = M(0xd8caa0);
  // bioluminescence: lure-like glowing tendrils, beaded light along each sail's edge,
  // and a row of lamps down each flank under the armour
  const bio = bioKit(), rndB = seeded(opts);
  const ULAR_GLOW = [0xd8ff6a, 0xffc85a, 0x6affb0];
  const bioC = rndB ? ULAR_GLOW[Math.floor(rndB() * ULAR_GLOW.length)] : ULAR_GLOW[0];
  const tendM = bio.mat(bioC, 0x7a8a4a, 0.3, 0.1, 1.8), lampM = bio.mat(bioC, 0x4f6b34, 0.3, 0.08, 2.0);
  const body = new THREE.Group(); body.position.y = 3.0; rig.add(body);
  const torso = mesh(new THREE.SphereGeometry(1, 24, 16), hide, body); torso.scale.set(1.55, 1.35, 2.6);
  const under = mesh(new THREE.SphereGeometry(1, 20, 12), belly, body, 0, -0.35, 0.1); under.scale.set(1.35, 1.05, 2.35);
  mesh(scalesGeo(1.55, 1.35, 2.6, 7, 22, 0.05, 0.42, fr), plate, body);
  // a row of spikes down the spine
  const spikeG = hornGeo(0.55, 0.2, -0.4, 5), sp = [];
  for (let i = 0; i < 9; i++) { const z = lerp(-2.2, 1.9, i / 8); sp.push(placed(spikeG, 0, Math.sqrt(Math.max(0, 1 - (z / 2.6) ** 2)) * 1.35 + 0.05, z, -0.35, 0, 0, 1 - Math.abs(z) * 0.12)); }
  mesh(merge(sp), horn, body);
  { const L = []; for (let i = 0; i < 9; i++) for (const s of [-1, 1]) L.push([s * 0.97, -0.17, lerp(0.72, -0.72, i / 8), 0.075 - Math.abs(i - 4) * 0.005]); bioMesh(bioDots(L, 1.55, 1.35, 2.6), lampM, torso); }

  // four sturdy pillar legs
  const legs = [], upG = new THREE.CylinderGeometry(0.5, 0.62, 1.5, 12), loG = new THREE.CylinderGeometry(0.42, 0.5, 1.4, 12);
  const footG = merge([placed(new THREE.SphereGeometry(1, 12, 6), 0, 0.05, 0.15, 0, 0, 0, 0.6, 0.3, 0.75),
    ...[-0.3, 0, 0.3].map(x => placed(hornGeo(0.35, 0.1, 0.6, 5), x, 0.05, 0.75, 1.4, 0, 0))]);
  [[1.25, 1.5], [-1.25, 1.5], [1.25, -1.5], [-1.25, -1.5]].forEach(([x, z]) => {
    const hip = new THREE.Group(); hip.position.set(x, -0.3, z); body.add(hip);
    mesh(new THREE.SphereGeometry(0.7, 12, 8), hide, hip);
    mesh(upG, hide, hip, 0, -0.75, 0);
    const knee = new THREE.Group(); knee.position.y = -1.45; hip.add(knee);
    mesh(loG, hide, knee, 0, -0.65, 0);
    const foot = mesh(footG, dark, knee, 0, -1.3, 0);
    legs.push({ hip, knee, foot });
  });

  // necks: rising from the shoulders, then reaching forward; a rounded head on each
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0); sailShape.quadraticCurveTo(0.1, 1.1, 0.7, 1.25); sailShape.quadraticCurveTo(1.25, 0.8, 1.15, 0); sailShape.lineTo(0, 0);
  const sailG = new THREE.ExtrudeGeometry(sailShape, { depth: 0.05, bevelEnabled: false, curveSegments: 8 }); sailG.translate(0, 0, -0.025); sailG.rotateY(Math.PI / 2);
  // stiff spines in the sail, fanning back
  const spinesG = merge([0.12, 0.42, 0.72, 0.98].map((z, i) => placed(new THREE.CylinderGeometry(0.018, 0.035, 1.25 - Math.abs(i - 1.2) * 0.22, 5).translate(0, 0.6 - Math.abs(i - 1.2) * 0.1, 0), 0, 0, -z, -0.25 - i * 0.12)));
  const tend1 = merge([new THREE.SphereGeometry(0.1, 8, 6), ...[0, 1, 2].map(i => placed(bendGeo(new THREE.CylinderGeometry(0.014, 0.055, 0.65, 5, 5).translate(0, 0.33, 0), 2.2), 0, 0, 0, Math.PI - 0.4 + i * 0.25, (i - 1) * 0.5, 0))]);
  const tendG = merge([-1, 1].map(s => placed(tend1, s * 0.42, 0.32, 0.32, 0, 0, s * 0.5)));
  // beads of light just inside the sail's curved edge, on both faces
  const sailDotsG = (() => {
    const L = [];
    for (const p of sailShape.getPoints(6)) {
      if (p.y < 0.12) continue;
      const x = 0.55 + (p.x - 0.55) * 0.86, y = 0.5 + (p.y - 0.5) * 0.86;
      for (const s of [-1, 1]) L.push([s * 0.03, y, -x, s, 0, 0, 0.045, 0.4]);
    }
    return bioDots(L);
  })();
  const skullG = merge([placed(new THREE.SphereGeometry(1, 16, 12), 0, 0.2, 0.1, 0, 0, 0, 0.5, 0.48, 0.55), placed(new THREE.SphereGeometry(1, 14, 10), 0, 0.1, 0.5, 0, 0, 0, 0.38, 0.3, 0.42)]);
  // neck segments: tube + joint ball + a dorsal plate, merged
  const neckSeg = (i, ra, rb) => merge([new THREE.CylinderGeometry(rb, ra, 0.62, 10).translate(0, 0.31, 0), new THREE.SphereGeometry(ra, 10, 6), placed(new THREE.ConeGeometry(0.12, 0.3, 4), 0, 0.3, -ra + 0.05, -0.5)]);
  const necks = [];
  const spread = [0, -1, 1, -2, 2];
  for (let h = 0; h < 5; h++) {
    const k = spread[h], yaw = k * 0.42 * (nHeads > 3 ? 0.8 : 1);
    const base = new THREE.Group(); base.position.set(k * 0.6 * (nHeads > 3 ? 0.75 : 1), 0.4, 2.1); body.add(base);
    base.rotation.set(0.75, yaw, 0, 'YXZ');
    const ch = chain(base, 7, 0.62, 0.48, 0.3, hide, { geo: neckSeg, noBalls: true });
    const head = new THREE.Group(); ch.end.add(head);
    mesh(skullG, hide, head);
    const jaw = new THREE.Group(); jaw.position.set(0, 0.0, 0.15); head.add(jaw);
    const jm = mesh(new THREE.SphereGeometry(1, 12, 8), belly, jaw, 0, -0.08, 0.3); jm.scale.set(0.33, 0.15, 0.42);
    // tendrils where eyes would be (no eyes)
    mesh(tendG, tendM, head);
    // the sail behind the head
    const sail = mesh(sailG, sailM, head, 0, 0.5, -0.05); sail.rotation.x = -0.15;
    mesh(spinesG, M(0x5a3a1a), sail);
    bioMesh(sailDotsG, lampM, sail);
    necks.push({ base, joints: ch.joints, head, jaw, yaw, h });
  }
  function setHeads(n) {
    n = clamp(Math.round(n), 0, 5);
    necks.forEach((nk, i) => { nk.base.visible = i < n; });
  }
  setHeads(nHeads);

  // the spike-club tail
  const tail = new THREE.Group(); tail.position.set(0, 0.3, -2.4); body.add(tail); tail.rotation.x = -1.85;
  const tc = chain(tail, 6, 0.65, 0.8, 0.22, hide, { radial: 10 });
  mesh(maceGeo(0.55, 16, 0.6, 0.16), horn, tc.end, 0, 0.35, 0);

  finish(root, 0.06);
  bio.glow(0);
  let ph = Math.random() * TAU, walkW = 0;
  const flash = makeFlash([hide]);
  return {
    root, mats: [hide], flash, setHeads, necks, glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, wind = st.windup || 0, atk = st.attack || 0, t = st.t || 0;
      walkW += (clamp(sp / 0.6, 0, 1) - walkW) * Math.min(1, dt * 4);
      ph += dt * (sp / 5) * TAU;
      legs.forEach((l, i) => {
        const p = ph + GAIT4[i], s = Math.sin(p), lift = Math.max(0, Math.cos(p));
        l.hip.rotation.x = walkW * s * 0.3;
        l.knee.rotation.x = walkW * lift * 0.35;
        l.foot.rotation.x = -l.hip.rotation.x - l.knee.rotation.x;
      });
      body.position.y = 3.0 + walkW * Math.abs(Math.sin(ph)) * 0.08 + Math.sin(t * 0.9) * 0.03 - wind * (1 - atk) * 0.15;
      body.rotation.z = walkW * Math.sin(ph) * 0.03;
      // each neck sways on its own; on attack they strike forward and down
      for (const nk of necks) {
        const o = nk.h * 1.7;
        let pitch = nk.base.rotation.x;
        nk.joints.forEach((j, i) => {
          const up = i < 3 ? -0.1 : 0.2;  // rise, then arc forward
          j.rotation.x = up + Math.sin(t * 0.9 + o - i * 0.5) * 0.05 + wind * (1 - atk) * (i < 3 ? -0.12 : -0.05) + atk * (i < 3 ? 0.12 : 0.1);
          j.rotation.z = Math.sin(t * 0.7 + o + i * 0.4) * 0.05;
          pitch += j.rotation.x;
        });
        // keep the head level whatever the neck does (then nod for wind-up/strike)
        nk.head.rotation.x = -pitch + 0.15 - wind * (1 - atk) * 0.35 + atk * 0.35;
        nk.jaw.rotation.x = 0.05 + wind * (1 - atk) * 0.45 + atk * 0.2;
      }
      tc.joints.forEach((j, i) => { j.rotation.x = i ? 0.1 : 0; j.rotation.z = Math.sin(t * 0.8 - i * 0.5) * 0.06 + walkW * Math.sin(ph - i * 0.6) * 0.05; });
    },
  };
}

/* ================================================================
   GYNGE — living rock with a cave-maw
   ================================================================ */
/* craggy rock: displaced icosahedron, faceted */
function rockGeo(detail, amp, freq, off) {
  return displace(new THREE.IcosahedronGeometry(1, detail), amp, freq, off, 0.8);
}
export function buildGynge(opts = {}) {
  const root = new THREE.Group();
  const rock = M(0x7a7066), rockD = M(0x5a524a), moss = M(0x5f6e3a);
  const flesh = M(0xe8c4b4), gum = M(0x8a3a40), tooth = M(0xcfc6b2);
  // bioluminescence: patches of glowing lichen on the dome, and an ember-red glow deep
  // in the throat that shows when the maw yawns at night
  const bio = bioKit(), rndB = seeded(opts) || mulberry32(41);
  const GYNGE_GLOW = [0x7affc0, 0x8ad0ff, 0xd0ff7a];
  const bioC = seeded(opts) ? GYNGE_GLOW[Math.floor(rndB() * GYNGE_GLOW.length)] : GYNGE_GLOW[0];
  const throat = bio.reg(M(0x3a1418, { emissive: 0xc8401a }), 0.0, 0.3), lichenM = bio.mat(bioC, 0x7a7066, 0.3, 0.1, 1.8);
  const body = new THREE.Group(); root.add(body);
  // pale fleshy underbelly (seen when it heaves up)
  const belly = mesh(new THREE.SphereGeometry(1, 20, 10, 0, TAU, Math.PI * 0.45, Math.PI * 0.55), flesh, body, 0, 0.55, 0);
  belly.scale.set(2.3, 0.75, 2.3);
  // lower jaw: a craggy rock lip ringing the front
  const lowG = rockGeo(2, 0.16, 1.6, 4); lowG.scale(2.45, 0.6, 2.45);
  const low = mesh(lowG, rockD, body, 0, 0.5, 0);
  // the throat inside
  const th = mesh(new THREE.SphereGeometry(1, 16, 10), throat, body, 0, 0.85, 0.5); th.scale.set(1.5, 0.55, 1.4);
  const tongue = mesh(new THREE.SphereGeometry(1, 14, 8), gum, body, 0, 0.75, 0.9); tongue.scale.set(0.9, 0.25, 1.0);
  // lower teeth around the front rim
  const tG = hornGeo(0.45, 0.16, 0, 5), lt = [], ut = [];
  for (let i = 0; i < 9; i++) {
    const a = lerp(-1.15, 1.15, i / 8), r = 2.05;
    lt.push(placed(tG, Math.sin(a) * r, 0.75, Math.cos(a) * r, 0, 0, 0, 0.8 + (i % 3) * 0.25));
    ut.push(placed(tG, Math.sin(a + 0.07) * r, -0.05, Math.cos(a + 0.07) * r, Math.PI, 0, 0, 0.9 + ((i + 1) % 3) * 0.25));
  }
  mesh(merge(lt), tooth, body);
  // the dome (upper jaw) hinges at the back
  const hinge = new THREE.Group(); hinge.position.set(0, 0.95, -1.9); body.add(hinge);
  const dome = new THREE.Group(); dome.position.set(0, 0, 1.9); hinge.add(dome);
  const dg = rockGeo(3, 0.13, 1.3, 9);
  { const p = dg.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, p.getY(i) * 0.15); dg.computeVertexNormals(); }
  dg.scale(2.55, 1.75, 2.55);
  mesh(dg, rock, dome);
  bioMesh(bioDots(patchDots(dg, rndB, 46, 0.13, 0.6, 1.1, (x, y) => y > 0.15)), lichenM, dome);
  mesh(merge(ut), tooth, dome);
  const palate = mesh(new THREE.SphereGeometry(1, 16, 8, 0, TAU, Math.PI / 2, Math.PI / 2), throat, dome, 0, 0.02, 0.3); palate.scale.set(1.9, 0.35, 1.7);
  // crags and boulders on the dome, a little moss
  const crag = rockGeo(1, 0.25, 2, 3);
  const cr = [];
  [[0.8, 1.45, -0.3, 0.55], [-1.1, 1.2, 0.2, 0.5], [0.2, 1.65, 0.6, 0.45], [1.6, 0.8, 0.8, 0.45], [-1.5, 0.9, -0.9, 0.6], [-0.3, 1.5, -1.1, 0.5]]
    .forEach(([x, y, z, s]) => cr.push(placed(crag, x, y, z, x, z, y, s, s * 0.8, s)));
  mesh(merge(cr), rockD, dome);
  const mg = [];
  [[-0.6, 1.7, 0.1], [1.0, 1.4, -0.9], [-1.4, 1.2, 0.9]].forEach(([x, y, z]) => mg.push(placed(new THREE.SphereGeometry(0.35, 7, 5), x, y, z, 0, 0, 0, 1, 0.3, 1)));
  mesh(merge(mg), moss, dome);
  finish(root, 0.05);
  bio.glow(0);
  // the maw parts that only show when open
  const t0 = Math.random() * 10;
  let slide = 0;
  const flash = makeFlash([rock, rockD]);
  return {
    root, mats: [rock], flash, glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, wind = st.windup || 0, atk = st.attack || 0, t = (st.t || 0) + t0;
      slide += dt * sp;
      // breathing, a slow grinding wobble as it slides
      const open = clamp(wind * 0.55 + atk, 0, 1);
      hinge.rotation.x = -open * 0.75 - Math.max(0, Math.sin(t * 0.6)) * 0.03;
      // heaving up on the strike shows the pale underbelly
      body.position.y = open * 0.55 + Math.sin(t * 0.8) * 0.03;
      body.rotation.x = -open * 0.22 + Math.sin(slide * 1.5) * 0.02 * clamp(sp, 0, 1);
      body.rotation.z = Math.sin(slide * 1.1) * 0.025 * clamp(sp, 0, 1);
      belly.scale.y = 0.75 + open * 0.2 + Math.sin(t * 1.6) * 0.02;
    },
    // alias for the open animation (the maw yawns): v 0..1
    open(v) { hinge.rotation.x = -clamp(v, 0, 1) * 0.75; },
  };
}

/* ================================================================
   STRYX — a stepped plateau of rock, vines on top
   ================================================================ */
export function buildStryx(opts = {}) {
  const rnd = seeded(opts) || mulberry32(5);
  const root = new THREE.Group();
  const rock = M(0x8a7a62), rockD = M(0x6a5c4a), topM = M(0x7d8a4a);
  const vineM = M(0x3d6a32), root2 = M(0x4a3a28);
  // bioluminescence: mineral seams glowing in the tiers' flanks, and glowing vine tips
  const bio = bioKit();
  const STRYX_GLOW = [0xb8ff7a, 0xffc86a, 0x7ad8ff];
  const bioC = seeded(opts) ? STRYX_GLOW[Math.floor(rnd() * STRYX_GLOW.length)] : STRYX_GLOW[0];
  const seamM = bio.mat(bioC, 0x8a7a62, 0.3, 0.1, 1.9), tipM = bio.mat(bioC, 0x3d6a32, 0.3, 0.1, 1.9);
  const body = new THREE.Group(); root.add(body);
  // three stepped tiers, slightly irregular; the top is flat (a mesa)
  const tiers = [[1.02, 1.12, 0.4, 0], [0.9, 0.97, 0.36, 0.4], [0.8, 0.86, 0.32, 0.76]];
  const tg = [];
  tiers.forEach(([rt, rb, h, y], i) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, 9, 2);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), z = p.getZ(k), yy = p.getY(k), a = Math.atan2(z, x);
      const n = 1 + (noise3(Math.cos(a) * 2 + i, yy * 2, Math.sin(a) * 2) - 0.5) * 0.35;
      p.setXYZ(k, x * n, yy, z * n * 0.85);
    }
    g.translate(0, y + h / 2, 0); g.computeVertexNormals(); tg.push(g);
  });
  mesh(merge(tg.slice(0, 2)), rock, body);
  mesh(tg[2], rockD, body);
  { const all = merge(tg); bioMesh(bioDots(patchDots(all, rnd, 34, 0.05, 0.58, 2.2, (x, y, z, nx, ny) => Math.abs(ny) < 0.5 && y > 0.08)), seamM, body); }
  const cap = mesh(new THREE.CylinderGeometry(0.74, 0.8, 0.06, 9), topM, body, 0, 1.08, 0); cap.scale.z = 0.85;
  // loose boulders and ledges
  const bl = [];
  for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4; bl.push(placed(rockGeo(1, 0.3, 2, i), Math.cos(a) * 1.05, 0.12, Math.sin(a) * 0.95, a, i, 0, 0.22 + (i % 2) * 0.1)); }
  mesh(merge(bl), rockD, body);
  // roots running out over the ground and diving in
  const rootG = hornGeo(0.85, 0.09, 0.9, 5); rootG.rotateZ(-Math.PI / 2); rootG.rotateX(Math.PI / 2);
  const rg = [];
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.2; rg.push(placed(rootG, Math.cos(a) * 1.0, 0.18, Math.sin(a) * 0.88, 0, -a, 0, 0.8 + (i % 3) * 0.2)); }
  mesh(merge(rg), root2, body);
  // whipping vines on top: a Rope each, curled tips
  const n = 5, vines = [], curlG = curlGeo(0.08, 0.025);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + 0.3;
    const rope = new Rope(root, 8, 0.07, 0.022, vineM);
    const tip = noOut(mesh(curlG, tipM, root));
    vines.push({ rope, tip, a, base: new THREE.Vector3(Math.cos(a) * 0.4, 1.1, Math.sin(a) * 0.34), ph: rnd() * TAU, len: 1.0 + rnd() * 0.5 });
  }
  // a tuft of grass and a couple of leaves on the top
  const leaf = leafGeo(0.22, 0.12), lf = [];
  for (let i = 0; i < 6; i++) { const a = i * 1.1; lf.push(placed(leaf, Math.cos(a) * 0.1, 1.1, Math.sin(a) * 0.1, Math.cos(a) * 0.6, a, Math.sin(a) * 0.6)); }
  mesh(merge(lf), vineM, body);
  finish(root, 0.025);
  const P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), P3 = new THREE.Vector3(), tmp = new THREE.Vector3();
  const t0 = Math.random() * 10;
  const flash = makeFlash([rock, rockD]);
  function animate(dt, st) {
    const sp = st.speed || 0, wind = st.windup || 0, atk = st.attack || 0, t = (st.t || 0) + t0;
    // when it moves it heaves itself along on its vines
    body.position.y = Math.abs(Math.sin(t * 3)) * 0.05 * clamp(sp, 0, 1);
    body.rotation.z = Math.sin(t * 3) * 0.03 * clamp(sp, 0, 1);
    for (let i = 0; i < vines.length; i++) {
      const v = vines[i], ca = Math.cos(v.a), sa = Math.sin(v.a);
      if (st.grab && i === 0) {   // a vine thrown out onto something solid, hauling the whole mesa after it
        const k = clamp(st.grab.k, 0, 1), e = 1 - Math.pow(1 - k, 3), G = st.grab.p;
        P3.copy(v.base).lerp(G, e);
        P1.set(v.base.x * 1.1, v.base.y + 0.8, v.base.z * 1.1);
        P2.copy(v.base).lerp(G, e * 0.7); P2.y += (1 - e) * 0.8 + 0.2;
        v.rope.set(v.base, P1, P2, P3);
        v.tip.position.copy(P3); orientCurl(v.tip, v.rope.dir, UP);
        continue;
      }
      const a = clamp(atk * 1.3 - i * 0.08, 0, 1);
      const w = Math.sin(t * 1.4 + v.ph);
      // idle: rising and swaying; wind-up: coiled back; attack: whipped forward
      // idle: arching out like a fountain (the "horns"), swaying
      P3.set(ca * (0.75 + v.len * 0.5) + Math.sin(t * 0.9 + v.ph) * 0.12, 1.1 + v.len * 0.45 + w * 0.12, sa * (0.65 + v.len * 0.45) + Math.cos(t * 0.8 + v.ph) * 0.12);
      tmp.set(ca * 0.4, 1.1 + v.len * 1.1, -0.5 + sa * 0.3); P3.lerp(tmp, wind * (1 - a));
      tmp.set(ca * 0.35, 0.5 + i * 0.12, 1.9 + v.len * 0.7); P3.lerp(tmp, a);
      if (sp > 0.2 && i % 2 === 0) { tmp.set(ca * 1.6, 0.05, sa * 1.2 + 0.8); P3.lerp(tmp, clamp(sp, 0, 1) * 0.8); }
      P1.set(v.base.x * 1.1, v.base.y + 0.55 + v.len * 0.3, v.base.z * 1.1);
      P2.set(P3.x * 0.85, P3.y + 0.5 - a * 0.45, P3.z * 0.85 - a * 0.6);
      v.rope.set(v.base, P1, P2, P3);
      v.tip.position.copy(P3); orientCurl(v.tip, v.rope.dir, UP);
    }
  }
  animate(0, { t: 0 });
  bio.glow(0);
  return { root, mats: [rock], flash, animate, glow: bio.glow };
}

/* ================================================================
   TONGUATJIS — turtle with a stretching neck and a long tongue
   ================================================================ */
export function buildTonguatjis(opts = {}) {
  const fr = mulberry32(13);
  const root = new THREE.Group();
  const shellM = M(0x6e6a3a), scute = M(0x8a7a44), rim = M(0x4e4a2a);
  const skin = M(0x7a8058), skinD = M(0x5a6040), plast = M(0xd2c088), pink = M(0xf08aa8), tooth = M(0xeee4cc), dark = M(0x1e1a12);
  // bioluminescence: a ring of lamps round the shell's rim, a spot on each neck ring
  // (they spread apart as the neck stretches) and a glowing lure-ball on the tongue
  const bio = bioKit(), rndB = seeded(opts);
  const TON_GLOW = [0x8affe0, 0xb8ff8a, 0xffd07a];
  const bioC = rndB ? TON_GLOW[Math.floor(rndB() * TON_GLOW.length)] : TON_GLOW[0];
  const rimGlow = bio.mat(bioC, 0x4e4a2a, 0.3, 0.1, 1.9), lureM = bio.mat(0xff7ad0, 0xf08aa8, 0.4, 0.15, 1.8);
  const body = new THREE.Group(); body.position.y = 0.0; root.add(body);
  // the dome and its scutes, a rim and the pale plastron underneath
  const shell = mesh(new THREE.SphereGeometry(1, 24, 12, 0, TAU, 0, Math.PI / 2), shellM, body, 0, 0.5, 0); shell.scale.set(0.78, 0.78, 0.95);
  mesh(scalesGeo(0.78, 0.78, 0.95, 4, 10, 0.15, 0.2, fr), scute, body, 0, 0.5, 0);
  const rimM = mesh(new THREE.TorusGeometry(0.8, 0.07, 6, 28), rim, body, 0, 0.5, 0); rimM.rotation.x = Math.PI / 2; rimM.scale.set(1, 1.18, 1);
  const pl = mesh(new THREE.SphereGeometry(1, 18, 8, 0, TAU, Math.PI / 2, Math.PI / 2), plast, body, 0, 0.5, 0); pl.scale.set(0.74, 0.22, 0.9);
  { const L = []; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + 0.17; if (Math.sin(a) > 0.93) continue; L.push([Math.cos(a) * 0.865, 0.5, Math.sin(a) * 0.865 * 1.18, Math.cos(a), 0, Math.sin(a) / 1.18, 0.032, 0.5]); } bioMesh(bioDots(L), rimGlow, body); }
  // stumpy legs and claws
  const legs = [], legG = new THREE.CylinderGeometry(0.15, 0.17, 0.42, 9), footG = merge([placed(new THREE.SphereGeometry(1, 9, 6), 0, 0, 0.04, 0, 0, 0, 0.18, 0.08, 0.2),
    ...[-0.08, 0, 0.08].map(x => placed(hornGeo(0.08, 0.025, 0.5, 4), x, 0, 0.18, 1.4, 0, 0))]);
  [[0.55, 0.5], [-0.55, 0.5], [0.55, -0.5], [-0.55, -0.5]].forEach(([x, z]) => {
    const hip = new THREE.Group(); hip.position.set(x, 0.48, z); body.add(hip);
    mesh(legG, skinD, hip, 0, -0.21, 0); mesh(footG, dark, hip, 0, -0.44, 0);
    hip.rotation.z = Math.sign(x) * 0.15; legs.push(hip);
  });
  const tailM = mesh(new THREE.ConeGeometry(0.08, 0.3, 6), skinD, body, 0, 0.42, -0.95); tailM.rotation.x = -1.9;
  // the neck: wrinkled rings that slide apart as it stretches (up to the shell's length)
  const neck = new THREE.Group(); neck.position.set(0, 0.55, 0.78); body.add(neck);
  const rings = [], ringG = new THREE.CylinderGeometry(0.15, 0.17, 0.3, 10); ringG.rotateX(Math.PI / 2);
  const ringDot = bioDots([[0, 0.16, 0.02, 0, 1, 0.1, 0.035, 0.5], [0.12, 0.1, 0.02, 0.8, 0.6, 0, 0.022, 0.5], [-0.12, 0.1, 0.02, -0.8, 0.6, 0, 0.022, 0.5]]);
  for (let i = 0; i < 6; i++) { const r = mesh(ringG, i % 2 ? skin : skinD, neck); r.scale.setScalar(1 - i * 0.04); rings.push(r); bioMesh(ringDot, rimGlow, r); }
  // craggy alligator head
  const head = new THREE.Group(); head.scale.setScalar(1.3); neck.add(head);
  const upG = rockGeo(2, 0.12, 3, 7); upG.scale(0.2, 0.12, 0.42); upG.translate(0, 0.04, 0.3);
  mesh(upG, skinD, head);
  const brow = mesh(rockGeo(1, 0.15, 3, 2), skinD, head, 0, 0.11, 0.05); brow.scale.set(0.2, 0.09, 0.14);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.05, 0.0); head.add(jaw);
  const loG = rockGeo(2, 0.1, 3, 11); loG.scale(0.18, 0.06, 0.4); loG.translate(0, -0.03, 0.3);
  mesh(loG, skin, jaw);
  const tG = hornGeo(0.06, 0.018, 0, 4), ut = [], lt = [];
  for (let i = 0; i < 7; i++) for (const s of [-1, 1]) {
    const z = 0.08 + i * 0.075, x = s * (0.15 - i * 0.012);
    ut.push(placed(tG, x, -0.02, z, Math.PI, 0, 0)); lt.push(placed(tG, x * 0.95, 0.0, z + 0.03, 0, 0, 0));
  }
  mesh(merge(ut), tooth, head); mesh(merge(lt), tooth, jaw);
  for (const s of [-1, 1]) eye(head, 0.025, s * 0.12, 0.12, 0.12, 0x2a2010);
  // the tongue: twice the body's length, with a ball on the end
  const tongue = new THREE.Group(); tongue.position.set(0, -0.02, 0.15); head.add(tongue);
  const tgeo = new THREE.CylinderGeometry(0.05, 0.07, 1, 8); tgeo.rotateX(Math.PI / 2); tgeo.translate(0, 0, 0.5);
  const tStrip = mesh(tgeo, pink, tongue); tStrip.scale.z = 0.01;
  const tBall = noOut(mesh(new THREE.SphereGeometry(0.15, 12, 8), lureM, tongue));
  const TONGUE = 5.0;
  finish(root, 0.02);
  bio.glow(0);
  let ph = Math.random() * TAU, walkW = 0;
  const flash = makeFlash([skin, skinD, shellM]);
  return {
    root, mats: [shellM, skin], flash, head, tongue, glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, wind = st.windup || 0, atk = st.attack || 0, t = st.t || 0;
      walkW += (clamp(sp / 0.3, 0, 1) - walkW) * Math.min(1, dt * 4);
      ph += dt * (sp / 0.7) * TAU;
      legs.forEach((l, i) => { const p = ph + ((i === 0 || i === 3) ? 0 : Math.PI); l.rotation.x = walkW * Math.sin(p) * 0.4; });
      body.position.y = walkW * Math.abs(Math.sin(ph)) * 0.03 + Math.sin(t * 1.2) * 0.005;
      body.rotation.z = walkW * Math.sin(ph) * 0.03;
      // neck: tucked at rest, stretches the full length of the shell to strike
      const ext = clamp(Math.max(wind * 0.6, atk), 0, 1) + Math.sin(t * 0.7) * 0.03;
      const gap = lerp(0.05, 0.3, ext);
      rings.forEach((r, i) => { r.position.z = i * gap; });
      head.position.z = 5 * gap + 0.1;
      neck.position.y = 0.55 + ext * 0.05;
      neck.rotation.x = lerp(0.12, -0.05, ext) + Math.sin(t * 0.9) * 0.03;
      head.rotation.x = -wind * (1 - atk) * 0.2;
      jaw.rotation.x = wind * 0.35 + atk * 0.55;
      // tongue shoots out on attack
      const L = Math.max(0.01, (atk > 0 ? Math.pow(atk, 0.6) : 0) * TONGUE);
      tStrip.scale.z = L; tBall.position.z = L; tBall.visible = tStrip.visible = atk > 0.02;
    },
  };
}

/* ================================================================
   MIKOLO MOKO
   ================================================================ */
export function buildMikoloMoko(opts = {}) {
  const rnd = seeded(opts);
  let c = 0x5f9a4a;
  if (rnd) c = hsl(0.2 + rnd() * 0.2, 0.3 + rnd() * 0.35, 0.3 + rnd() * 0.25).getHex();
  if (opts.color !== undefined) c = opts.color;
  const furC = new THREE.Color(c);
  const fur = M(c), belly = M(furC.clone().lerp(new THREE.Color(0xf0f0c8), 0.55).getHex());
  const hairC = rnd ? hsl(rnd(), 0.6, 0.55).getHex() : 0xe8b040;
  // bioluminescence: the fun hairdo glows at night, with a dotted line down the spine
  // and a dot above each set of eyes
  const bio = bioKit();
  const glowC = new THREE.Color(hairC).offsetHSL(0, 0.25, 0.12).getHex();
  const hair = bio.reg(M(hairC, { emissive: glowC }), 0.05, 1.3), dark = M(0x1a1410);
  const spotM = bio.mat(glowC, c, 0.35, 0.12, 1.9);
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 0.17; root.add(body);
  // a long ferret body, deep haunches at the back
  const torso = mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 12), fur, body); torso.rotation.x = Math.PI / 2;
  const tum = mesh(new THREE.CapsuleGeometry(0.05, 0.24, 4, 10), belly, body, 0, -0.018, 0.01); tum.rotation.x = Math.PI / 2;
  { const L = []; for (let i = 0; i < 7; i++) { const z = lerp(0.15, -0.16, i / 6); L.push([0, 0.059, z, 0, 1, 0, 0.0085 - i * 0.0005, 0.5]); if (i % 2) for (const s of [-1, 1]) L.push([s * 0.042, 0.042, z, s, 1, 0, 0.006, 0.5]); } bioMesh(bioDots(L), spotM, body); }
  // kangaroo hind legs: big haunch, long foot flat on the ground
  const hinds = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.055, -0.01, -0.15); body.add(hip);
    const haunch = mesh(new THREE.SphereGeometry(1, 12, 10), fur, hip, 0, 0.01, 0); haunch.scale.set(0.045, 0.065, 0.075);
    const knee = new THREE.Group(); knee.position.set(0, -0.06, 0.04); hip.add(knee);
    const shin = mesh(new THREE.CapsuleGeometry(0.018, 0.08, 3, 8), fur, knee, 0, -0.04, -0.03); shin.rotation.x = 0.7;
    const ankle = new THREE.Group(); ankle.position.set(0, -0.085, -0.06); knee.add(ankle);
    const foot = mesh(new THREE.CapsuleGeometry(0.016, 0.12, 3, 8), fur, ankle, 0, -0.012, 0.06); foot.rotation.x = Math.PI / 2;
    hinds.push({ hip, knee, ankle, s });
  }
  // long squiggly front legs
  const fronts = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.045, -0.035, 0.15); body.add(sh);
    sh.rotation.x = Math.PI; // hang down
    const ch = chain(sh, 5, 0.034, 0.014, 0.01, fur, { radial: 6 });
    mesh(new THREE.SphereGeometry(0.016, 6, 5), dark, ch.end).scale.set(1, 0.6, 1.4);
    fronts.push({ sh, joints: ch.joints, s });
  }
  // neck and an Arlo-like head: a big rounded bean with a broad, rounded snout
  const neckG = new THREE.Group(); neckG.position.set(0, 0.02, 0.19); body.add(neckG); neckG.rotation.x = 0.55;
  const nch = chain(neckG, 3, 0.045, 0.04, 0.032, fur, { radial: 8 });
  const head = new THREE.Group(); nch.end.add(head);
  const hG = new THREE.SphereGeometry(1, 18, 14); {
    // bean shape: wider snout end, smaller cranium
    const p = hG.attributes.position;
    for (let i = 0; i < p.count; i++) { const z = p.getZ(i); const k = 1 + z * 0.18; p.setXYZ(i, p.getX(i) * k, p.getY(i) * (1 + z * 0.08), z); }
    hG.computeVertexNormals();
  }
  const skull = mesh(hG, fur, head, 0, 0.0, 0.05); skull.scale.set(0.05, 0.05, 0.085);
  const chin = mesh(new THREE.SphereGeometry(1, 12, 8), belly, head, 0, -0.03, 0.08); chin.scale.set(0.045, 0.022, 0.06);
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.006, 5, 4), dark, head, s * 0.018, 0.012, 0.135);
    // three eyes on each side of the face
    for (let k = 0; k < 3; k++) eye(head, 0.009 - k * 0.0008, s * (0.046 + k * 0.002 - (k === 1 ? 0 : 0.002)), 0.022 + (k === 1 ? 0.01 : 0), 0.075 - k * 0.022);
  }
  bioMesh(bioDots([-1, 1].map(s => [s * 0.044, 0.04, 0.05, s * 0.6, 1, 0.2, 0.0055, 0.5])), spotM, head);
  // the fun hairdo: a swept mohawk with a curl
  const hd = [];
  for (let i = 0; i < 6; i++) hd.push(placed(hornGeo(0.06 - i * 0.004, 0.012, -1.2, 5), 0, 0.045, 0.06 - i * 0.02, -0.3 - i * 0.12, 0, (i % 2 - 0.5) * 0.3));
  hd.push(placed(curlGeo(0.018, 0.006), 0, 0.07, 0.09, 0, Math.PI / 2, 0));
  mesh(merge(hd), hair, head);
  head.rotation.x = -0.55 - 0.1;
  // ferret tail
  const tail = new THREE.Group(); tail.position.set(0, 0.02, -0.2); body.add(tail); tail.rotation.x = -1.9;
  const tc = chain(tail, 4, 0.05, 0.03, 0.012, fur, { radial: 7 });
  finish(root, 0.0045);
  bio.glow(0);
  let ph = Math.random() * TAU, walkW = 0;
  const flash = makeFlash([fur]);
  return {
    root, mats: [fur], flash, head, glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, wind = st.windup || 0, atk = st.attack || 0, t = st.t || 0;
      walkW += (clamp(sp / 0.3, 0, 1) - walkW) * Math.min(1, dt * 6);
      ph += dt * (sp / 0.35) * TAU;
      // hops: both hind legs push together, the body arcs up
      const hop = Math.max(0, Math.sin(ph)) * walkW;
      for (const h of hinds) { h.hip.rotation.x = -hop * 0.6 + wind * (1 - atk) * 0.4; h.knee.rotation.x = hop * 0.5 - wind * (1 - atk) * 0.3; h.ankle.rotation.x = hop * 0.4; }
      body.position.y = 0.17 + hop * 0.07 + Math.sin(t * 2) * 0.002 - wind * (1 - atk) * 0.03;
      body.rotation.x = -hop * 0.15 + atk * 0.15;
      body.position.z = atk * 0.08;
      // squiggly front legs: a travelling wave down each leg
      for (const f of fronts) f.joints.forEach((j, i) => {
        j.rotation.x = (i ? 0.1 : -0.3) + Math.sin(t * (3 + walkW * 6) - i * 1.2 + (f.s > 0 ? 0 : 1.5)) * (0.25 + walkW * 0.2) - atk * (i ? 0.25 : 0.6);
        j.rotation.z = Math.sin(t * 2.3 - i * 1.4 + f.s) * 0.25;
      });
      nch.joints.forEach((j, i) => { j.rotation.x = Math.sin(t * 1.1 - i) * 0.05 - wind * 0.1 + atk * 0.2; });
      head.rotation.y = Math.sin(t * 0.9) * 0.25 * (1 - walkW);
      tc.joints.forEach((j, i) => { j.rotation.x = i ? 0.15 : 0; j.rotation.z = Math.sin(t * 2 - i * 0.8) * 0.2; });
    },
  };
}

/* ================================================================
   UFF — a walking rose-plant
   ================================================================ */
export function buildUff(opts = {}) {
  const rnd = seeded(opts);
  let pc = 0xd8486a;
  if (rnd) pc = hsl([0.97, 0.0, 0.9, 0.12, 0.8][Math.floor(rnd() * 5)] + (rnd() - 0.5) * 0.04, 0.6 + rnd() * 0.3, 0.55 + rnd() * 0.15).getHex();
  if (opts.color !== undefined) pc = opts.color;
  const root = new THREE.Group();
  // bioluminescence: a glowing heart in the bloom, glowing petal edges and thorn tips
  const bio = bioKit();
  const glowC = new THREE.Color(pc).offsetHSL(0.04, 0.2, 0.15).getHex();
  const stalkM = M(0x4f8a3a), leafM = M(0x5aa040), petal = M(pc), petalD = bio.mat(glowC, new THREE.Color(pc).multiplyScalar(0.75).getHex(), 0.2, 0.15, 1.8);
  const thornM = bio.mat(0xff6a8a, 0x8a3a2a, 0.15, 0.05, 1.2), edgeM = bio.mat(glowC, pc, 0.4, 0.1, 2.0);
  leafM.side = THREE.DoubleSide;
  const body = new THREE.Group(); root.add(body);
  // the thorny stalk (a gentle S-curve)
  const sg = new THREE.CylinderGeometry(0.009, 0.014, 0.17, 8, 8); sg.translate(0, 0.085, 0);
  { const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) + Math.sin(y * 30) * 0.006); } sg.computeVertexNormals(); }
  const stalk = mesh(sg, stalkM, body, 0, 0.012, 0);
  const th = [], thG = hornGeo(0.014, 0.004, 0.6, 4);
  for (let i = 0; i < 9; i++) { const y = 0.025 + i * 0.016, a = i * 2.4; th.push(along(thG, new THREE.Vector3(Math.cos(a) * 0.011, y, Math.sin(a) * 0.011 + Math.sin(y * 30) * 0.006), new THREE.Vector3(Math.cos(a), 0.5, Math.sin(a)))); }
  mesh(merge(th), thornM, stalk);
  // two little leaf feet
  const footLeaf = leafGeo(0.06, 0.05), feet = [];
  for (const s of [-1, 1]) {
    const f = new THREE.Group(); f.position.set(s * 0.012, 0.004, 0.0); body.add(f);
    const l = mesh(footLeaf, leafM, f); l.rotation.set(-Math.PI / 2, 0, -s * 0.5);
    feet.push(f);
  }
  // long thorny leaf arms
  const armLeaf = merge([leafGeo(0.15, 0.055), ...[0.03, 0.06, 0.09].flatMap(y => [-1, 1].map(s => placed(thG, s * 0.012 * (1 - y * 4), y, 0, 0, 0, -s * 1.2, 0.8)))]);
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.01, 0.12, 0.0); stalk.add(sh);
    const a = mesh(armLeaf, leafM, sh); a.rotation.set(0, Math.PI / 2, 0);
    arms.push({ sh, s });
  }
  // the flower head: a rose bloom over green sepals; no eyes
  const headG = new THREE.Group(); headG.position.set(0, 0.18, 0); stalk.add(headG);
  const sepal = merge([0, 1, 2, 3, 4].map(i => placed(leafGeo(0.035, 0.022), 0, 0, 0, 0.9, i / 5 * TAU, 0)));
  mesh(sepal, stalkM, headG, 0, 0.0, 0);
  const pg = new THREE.SphereGeometry(1, 10, 8, 0, Math.PI, 0, Math.PI);
  const ptl = [];
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 5; i++) {
    const a = (i + ring * 0.5) / 5 * TAU, r = ring ? 0.018 : 0.026;
    ptl.push(placed(pg, Math.cos(a) * r, 0.028 + ring * 0.008, Math.sin(a) * r, 0.25 + ring * 0.2, -a + Math.PI / 2, 0, 0.028 - ring * 0.006, 0.034 - ring * 0.004, 0.012));
  }
  mesh(merge(ptl), petal, headG);
  { const L = []; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; L.push([Math.cos(a) * 0.03, 0.06, Math.sin(a) * 0.03, Math.cos(a), 0.6, Math.sin(a), 0.0055, 0.6]); } bioMesh(bioDots(L), edgeM, headG); }
  const bud = mesh(new THREE.SphereGeometry(1, 10, 8), petalD, headG, 0, 0.04, 0); bud.scale.set(0.016, 0.024, 0.016);
  finish(root, 0.0028);
  bio.glow(0);
  root.scale.setScalar(opts.scale || 1);
  let ph = Math.random() * TAU, walkW = 0;
  const flash = makeFlash([stalkM, petal]);
  return {
    root, mats: [stalkM, petal], flash, glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, wind = st.windup || 0, atk = st.attack || 0, t = st.t || 0;
      walkW += (clamp(sp / 0.1, 0, 1) - walkW) * Math.min(1, dt * 5);
      ph += dt * (sp / 0.06) * TAU;
      // little shuffling steps on its leaf feet, a relaxed sway
      feet.forEach((f, i) => { const p = ph + i * Math.PI; f.position.y = 0.004 + Math.max(0, Math.sin(p)) * 0.012 * walkW; f.position.z = Math.cos(p) * 0.012 * walkW; });
      body.position.y = walkW * Math.abs(Math.sin(ph)) * 0.006;
      stalk.rotation.z = Math.sin(t * 0.9) * 0.06 + walkW * Math.sin(ph) * 0.06;
      stalk.rotation.x = Math.sin(t * 0.7) * 0.03 - wind * (1 - atk) * 0.15 + atk * 0.2;
      headG.rotation.y = Math.sin(t * 0.4) * 0.4;
      arms.forEach(a => {
        a.sh.rotation.z = a.s * (1.95 + Math.sin(t * 1.2 + a.s) * 0.12);
        a.sh.rotation.x = walkW * Math.sin(ph + (a.s > 0 ? Math.PI : 0)) * 0.3 - wind * (1 - atk) * 0.8 + atk * 1.4;
      });
    },
  };
}
