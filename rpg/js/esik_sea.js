/* ============================================================
   Esik of the sea (that swim through the air) and the flora of
   the Mbaru Tatu — toon models built to the creator's brief.

   Every builder returns { root, animate(dt, st), flash(v), mats }
   at real-life metres, standing on / above y = 0, facing +z.
   st = { speed, t, onGround, windup 0..1, attack 0..1, diving, swing }

   WATER (they swim through the AIR, hovering 1–2 m up)
   HVALEIA     — an ~8 m sky-whale: hump with a row of blowholes, an
                 eye for every blowhole clustered on top of the head,
                 a body that thins to a club tail, five fins (two each
                 side + one underneath on the last third), pale belly.
   SU NAGA     — the biggest species (~21 m): a plesiosaur/Lapras body
                 with two pairs of massive flippers, 2–5 heads on long
                 necks going straight out in front (tendrils where the
                 eyes are, no ridges behind the heads), three ridges
                 down the back (big centre, smaller sides), whale
                 flukes with an upright fin, lots of cool/purple
                 bioluminescence. opts.heads, setHeads(n).
   HARKAL      — a ~2.5 m air-shark: big head, underbite with one big
                 tooth jutting up past the upper lip, scars. Grey-blue.
   RAF KRABBI  — a ~0.4 m crab: four legs (two a side), craggy claws
                 that snap, thick plate armour, crackling cyan arcs;
                 any colour (opts.seed / opts.color, default #c14953).
   GROTHYN     — a ~1.2 m round barnacle cone with a top opening, no
                 face, four petals lying flush that fan out to attack,
                 and one very long vine that lashes forward.
                 opts.element 'Ular' (green) | 'Su' (blue) | 'Eldi'.

   FLORA (static or gently moving)
   ALBALI AAGAC  — ~12 m oak-like tree, broad round canopy, red fruit.
   ALBALI BUD    — the small green bud that grows on it.
   ALBALI FRUIT  — round reddish fruit, stem, two lines from the top.
   JU FIELD      — ~1.2 m soil bed with seven carrots.
   SPRENGJU      — a carrot woken by the Relic: hovers, spins, sparks,
                   swells to burst on st.attack.
   SPRENGJU SHAVING — floating grey crystal shard with glowing
                   red/orange/yellow lines and runes.
   SKITH GRASS   — a ~0.5 m tuft of green blades with white tips.
   MEGLA AAGAC   — a single giant ~20 m dark-wood tree, faint dark aura.
   ============================================================ */
import * as THREE from 'three';
import { toon, ramp, glowSprite, outlineAll } from './gfx.js';
import { noSolid } from './solid.js';

const TAU = Math.PI * 2;
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
const mat = (c, o = {}) => toon(c, Object.assign({ emissive: 0x000000 }, o));
const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c });
const noOut = (m) => { m.userData.noOutline = true; return m; };
function add(parent, geo, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o;
}
function finish(root, thick = 0.03) {
  outlineAll(root, thick);
  root.traverse(m => { if (m.isMesh && m.name !== 'outline' && !(m.material && m.material.transparent)) m.castShadow = true; });
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
const _bUP = new THREE.Vector3(0, 1, 0), _bq = new THREE.Quaternion(), _bn = new THREE.Vector3(), _bp = new THREE.Vector3(), _bsc = new THREE.Vector3(), _bm4 = new THREE.Matrix4(), _bS = new THREE.Matrix4();
function bioDots(list, sx = 1, sy = 1, sz = 1, seg = 6) {
  const unit = new THREE.SphereGeometry(1, seg, Math.max(3, seg - 2)).toNonIndexed();
  const n = unit.attributes.position.count, pos = new Float32Array(n * 3 * list.length), nor = new Float32Array(n * 3 * list.length);
  _bS.makeScale(1 / sx, 1 / sy, 1 / sz);
  list.forEach((e, i) => {
    let r, fl;
    if (e.length >= 6) { _bp.set(e[0], e[1], e[2]); _bn.set(e[3], e[4], e[5]).normalize(); r = e[6] ?? 0.02; fl = e[7] ?? 0.4; }
    else { _bn.set(e[0], e[1], e[2]).normalize(); _bp.set(_bn.x * sx, _bn.y * sy, _bn.z * sz); _bn.set(_bn.x / sx, _bn.y / sy, _bn.z / sz).normalize(); r = e[3]; fl = e[4] ?? 0.4; }
    _bm4.compose(_bp, _bq.setFromUnitVectors(_bUP, _bn), _bsc.set(r, r * fl, r)).premultiply(_bS);
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
function bioMesh(geo, m, parent, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.userData.noOutline = true; parent.add(o); return o; }

/* a glow sprite that darkens instead of adding light (for auras) */
function darkSprite(color, size, opacity) {
  const s = glowSprite(color, size, opacity);
  s.material.blending = THREE.NormalBlending;
  return s;
}

/* smooth a sparse [z, r] profile into a dense one (Catmull-Rom) */
function smoothProfile(P, n = 64) {
  const c = new THREE.SplineCurve(P.map(([z, r]) => new THREE.Vector2(z, r)));
  return c.getSpacedPoints(n).map(p => [p.x, Math.max(0, p.y)]);
}
function profR(D, z) {
  if (z <= D[0][0]) return D[0][1];
  for (let i = 1; i < D.length; i++) if (z <= D[i][0]) {
    const [z0, r0] = D[i - 1], [z1, r1] = D[i];
    return r0 + (r1 - r0) * (z - z0) / Math.max(1e-6, z1 - z0);
  }
  return D[D.length - 1][1];
}
/* lathe a slice [zA, zB] of a dense profile around the z axis, relative to z0 */
function latheZ(D, zA, zB, z0, segs = 16) {
  const pts = [new THREE.Vector2(profR(D, zA), zA - z0)];
  for (const [z, r] of D) if (z > zA + 1e-4 && z < zB - 1e-4) pts.push(new THREE.Vector2(r, z - z0));
  pts.push(new THREE.Vector2(profR(D, zB), zB - z0));
  const g = new THREE.LatheGeometry(pts, segs);
  g.rotateX(Math.PI / 2);
  return g;
}
/* top / belly vertex colours by normal direction (countershading) */
function countershade(geo, top, belly, thr = -0.25) {
  geo.computeVertexNormals();
  const n = geo.attributes.normal, cols = new Float32Array(n.count * 3), c = new THREE.Color();
  for (let i = 0; i < n.count; i++) {
    const t = THREE.MathUtils.clamp((thr - n.getY(i)) / 0.12 + 0.5, 0, 1);
    c.copy(top).lerp(belly, t); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}
/* a body built as a chain of lathe slices hinged at `cuts` (descending z),
   each slice a child of the one in front of it so it can undulate. */
function buildChain(parent, D, cuts, m, o = {}) {
  const sx = o.sx || 1, sy = o.sy || 1, segs = o.segs || 16;
  const bounds = [D[D.length - 1][0], ...cuts, D[0][0]];
  const out = []; let par = parent, prev = 0;
  for (let i = 0; i < bounds.length - 1; i++) {
    const zB = bounds[i], zA = bounds[i + 1], pivot = i === 0 ? 0 : zB;
    const g = new THREE.Group(); g.position.z = pivot - prev; par.add(g);
    const geo = latheZ(D, zA, zB, pivot, segs); geo.scale(sx, sy, 1);
    if (o.colors) countershade(geo, o.colors[0], o.colors[1], o.colors[2]);
    add(g, geo, m);
    if (i > 0) {
      const r = profR(D, pivot) * 0.985;
      const sg = new THREE.SphereGeometry(r, segs, 10); sg.scale(sx, sy, Math.min(1, 0.9));
      if (o.colors) countershade(sg, o.colors[0], o.colors[1], o.colors[2]);
      add(g, sg, m);
    }
    out.push({ g, zA, zB, pivot }); par = g; prev = pivot;
  }
  return out;
}
const segAt = (chain, z) => chain.find(s => z >= s.zA && z <= s.zB) || chain[0];
/* rows of glowing photophores on a lathe-chain body: rows = [[th, z0, z1, step, r]],
   one merged mesh per body slice so the dots ride the undulation */
function chainDots(chain, D, SX, SY, rows, m) {
  const per = chain.map(() => []);
  for (const [th, z0, z1, step, r] of rows) for (let z = z0; z >= z1; z -= step) {
    if (profR(D, z) < r * 2) continue;
    const si = chain.indexOf(segAt(chain, z)), p = surf(D, z, th, SX, SY, 1.0);
    per[si].push([p.x, p.y, z - chain[si].pivot, Math.sin(th) / SX, Math.cos(th) / SY, 0, r * (0.75 + 0.25 * Math.min(1, profR(D, z))), 0.45]);
  }
  per.forEach((L, i) => { if (L.length) bioMesh(bioDots(L), m, chain[i].g); });
}
/* point on a lathe body: th = 0 on top, +PI/2 on +x side */
function surf(D, z, th, sx = 1, sy = 1, off = 1) {
  const r = profR(D, z) * off;
  return V3(Math.sin(th) * r * sx, Math.cos(th) * r * sy, z);
}
/* tapered tube along a Catmull-Rom curve (tentacles, vines, branches) */
function taperTube(pts, r0, r1, tubular = 16, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => (p.isVector3 ? p : V3(p[0], p[1], p[2]))));
  const fr = curve.computeFrenetFrames(tubular, false);
  const pos = [], idx = [], P = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular, r = r0 + (r1 - r0) * t; curve.getPointAt(t, P);
    const N = fr.normals[i], B = fr.binormals[i];
    for (let j = 0; j < radial; j++) {
      const v = j / radial * TAU, cx = Math.cos(v) * r, sy = Math.sin(v) * r;
      pos.push(P.x + N.x * cx + B.x * sy, P.y + N.y * cx + B.y * sy, P.z + N.z * cx + B.z * sy);
    }
  }
  curve.getPointAt(1, P); const tipI = pos.length / 3; pos.push(P.x, P.y, P.z);
  for (let i = 0; i < tubular; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial;
    idx.push(a, c, b, b, c, d);
  }
  for (let j = 0; j < radial; j++) idx.push(tubular * radial + j, tipI, tubular * radial + (j + 1) % radial);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/* rounded tapered capsule from y=0 to y=L (r0 at the base, r1 at the tip) */
function taperCapsule(r0, r1, L, segs = 10) {
  const pts = [];
  for (let i = 0; i <= 4; i++) { const a = -Math.PI / 2 + i / 4 * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r0 + 1e-4, Math.sin(a) * r0)); }
  for (let i = 0; i <= 4; i++) { const a = i / 4 * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r1 + 1e-4, L + Math.sin(a) * r1)); }
  return new THREE.LatheGeometry(pts, segs);
}
const capsuleZ = (r0, r1, L, s) => taperCapsule(r0, r1, L, s).rotateX(Math.PI / 2);
const capsuleX = (r0, r1, L, s) => taperCapsule(r0, r1, L, s).rotateZ(-Math.PI / 2);
/* paddle fin / flipper lying in the xz plane, root at x=0, tip at x=len, swept back */
function finGeo(len, wid, thick, sweep = 0.25, taper = 0.6) {
  const g = new THREE.SphereGeometry(1, 16, 8), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getX(i) + 1) / 2;
    p.setXYZ(i, t * len, p.getY(i) * thick * (1 - 0.5 * t), p.getZ(i) * wid * (1 - taper * t) - sweep * t * t * len);
  }
  g.computeVertexNormals();
  return g;
}
/* flat extruded shape (fins, petals, flukes); thickness centred on z=0 */
function slab(points, depth, bevel = 0.5) {
  const sh = new THREE.Shape(); sh.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) sh.lineTo(points[i][0], points[i][1]);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: depth * bevel, bevelSize: depth * bevel, bevelSegments: 1, curveSegments: 4 });
  g.translate(0, 0, -depth / 2); g.computeVertexNormals();
  return g;
}
/* smooth curved shape version (quadratic through midpoints) */
function smoothSlab(points, depth, bevel = 0.5) {
  const sh = new THREE.Shape(), n = points.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(points[n - 1], points[0]); sh.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const p = points[i], m = mid(p, points[(i + 1) % n]); sh.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: depth * bevel, bevelSize: depth * bevel, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -depth / 2); g.computeVertexNormals();
  return g;
}
/* lumpy blob (foliage, rocks): smooth sphere with deterministic waves */
function blobGeo(r, rnd, amt = 0.15, ws = 16, hs = 12) {
  const g = new THREE.SphereGeometry(r, ws, hs), p = g.attributes.position;
  const ph = [rnd() * 6, rnd() * 6, rnd() * 6, rnd() * 6], f = 2.2 / r;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + amt * (Math.sin(x * f + ph[0]) * Math.sin(y * f * 1.3 + ph[1]) + 0.6 * Math.sin(z * f * 1.7 + ph[2]) * Math.sin(x * f * 0.7 + ph[3]));
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}
/* jittered low-poly rock-like shape (craggy claws, knobs) */
function craggy(r, rnd, amt = 0.25, detail = 1) {
  // welded (indexed) so outlines stay closed; facets come from the low-poly geometry
  const src = new THREE.DodecahedronGeometry(r, detail), p = src.attributes.position;
  const map = new Map(), pos = [], idx = [];
  for (let i = 0; i < p.count; i++) {
    const key = p.getX(i).toFixed(4) + ',' + p.getY(i).toFixed(4) + ',' + p.getZ(i).toFixed(4);
    if (!map.has(key)) {
      const k = 1 + (rnd() - 0.5) * 2 * amt;
      map.set(key, pos.length / 3); pos.push(p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    idx.push(map.get(key));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ============================================================
   HVALEIA — the sky whale (~8 m)
   ============================================================ */
export function buildHvaleia(opts = {}) {
  const root = noSolid(new THREE.Group());   // it moves, and sees to its own bumps
  const swim = new THREE.Group(); swim.position.y = 2.9; root.add(swim);
  const top = new THREE.Color(opts.color ?? 0x3f7fc4), belly = new THREE.Color(0xe2ebee);
  const bodyM = mat(0xffffff, { vertexColors: true });
  const finM = mat(top.clone().multiplyScalar(0.85));
  const darkM = mat(0x14202c), rimM = mat(0xb9d4ea), eyeW = mat(0xf4f0e2), pupilM = mat(0x0c0c14);
  const SX = 1, SY = 0.88;
  // bioluminescence: two rows of photophores down each flank, a scatter along the pale
  // belly line, and blowhole rims that glow
  const bio = bioKit(), rndB = mulberry32(opts.seed ?? 1);
  const HV_GLOW = [0x8af0ff, 0xa8b8ff, 0x7affd8];
  const bioC = opts.seed != null ? HV_GLOW[Math.floor(rndB() * HV_GLOW.length)] : HV_GLOW[0];
  const photoM = bio.mat(bioC, top, 0.3, 0.1, 2.0);
  rimM.emissive.set(bioC); bio.reg(rimM, 0.0, 1.2);
  const D = smoothProfile([[-4.25, 0], [-4.12, 0.26], [-3.85, 0.43], [-3.55, 0.42], [-3.3, 0.28], [-3.0, 0.26], [-2.4, 0.42],
    [-1.4, 0.72], [-0.4, 1.0], [0.6, 1.2], [1.6, 1.3], [2.5, 1.28], [3.15, 1.12], [3.6, 0.82], [3.85, 0.4], [3.92, 0]], 90);
  const chain = buildChain(swim, D, [-0.6, -2.3, -3.2], bodyM, { segs: 22, sx: SX, sy: SY, colors: [top, belly, -0.3] });
  const head = chain[0].g;
  // knobbly club on the tail tip
  const club = chain[3].g;
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU; const k = add(club, new THREE.SphereGeometry(0.14, 8, 6), finM, Math.cos(a) * 0.36, Math.sin(a) * 0.32, -0.62 + (i % 2) * 0.12);
    k.scale.set(1, 1, 1.4);
  }
  // the hump with its row of blowholes
  const humpG = new THREE.SphereGeometry(1, 18, 12); humpG.scale(0.66, 0.62, 1.3); countershade(humpG, top, belly, -0.9);
  add(head, humpG, bodyM, 0, 0.9, 1.3);
  const holes = [];
  const NH = 4;
  for (let i = 0; i < NH; i++) {
    const z = 0.68 + i * 0.42, t = (z - 1.3) / 1.3, y = 0.9 + 0.62 * Math.sqrt(Math.max(0, 1 - t * t));
    const rim = add(head, new THREE.TorusGeometry(0.1, 0.035, 6, 12), rimM, 0, y - 0.005, z); rim.rotation.x = Math.PI / 2 - t * 0.5; rim.scale.set(1, 1.5, 1);
    const hole = add(head, new THREE.SphereGeometry(0.1, 8, 6), darkM, 0, y - 0.02, z); hole.scale.set(0.8, 0.35, 1.3);
    const spout = glowSprite(0xdff4ff, 1.2, 0); spout.position.set(0, y + 0.5, z); head.add(spout);
    holes.push(spout);
  }
  // an eye for every blowhole, clustered on top of the head
  const eyeSpots = [[3.2, -0.2], [3.2, 0.2], [2.92, -0.4], [2.92, 0.4]];
  const eyes = [];
  for (const [z, th] of eyeSpots) {
    const p = surf(D, z, th, SX, SY, 0.98);
    const e = add(head, new THREE.SphereGeometry(0.13, 10, 8), eyeW, p.x, p.y, p.z);
    const pu = add(e, new THREE.SphereGeometry(0.075, 8, 6), pupilM, Math.sin(th) * 0.08, 0.08, 0.04);
    eyes.push(e); void pu;
  }
  // mouth line wrapping round the snout
  const mouthPts = [];
  for (const s of [-1, 1]) {
    const side = [2.15, 2.7, 3.25, 3.65].map(z => surf(D, z, s * (Math.PI / 2 + 0.42 - (z - 2.15) * 0.18), SX, SY, 1.005));
    if (s < 0) mouthPts.push(...side); else { mouthPts.push(V3(0, -0.2, 3.9)); mouthPts.push(...side.reverse()); }
  }
  add(head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouthPts), 40, 0.035, 5), darkM);
  chainDots(chain, D, SX, SY, [[1.55, 2.6, -3.0, 0.42, 0.08], [-1.55, 2.6, -3.0, 0.42, 0.08], [1.95, 2.4, -2.4, 0.55, 0.06], [-1.95, 2.4, -2.4, 0.55, 0.06], [0.8, 0.4, -2.0, 0.6, 0.05], [-0.8, 0.4, -2.0, 0.6, 0.05]], photoM);
  // five fins: two each side, one underneath on the last third
  const fins = [];
  const sideFin = (seg, z, th, len, wid, droop) => {
    for (const s of [-1, 1]) {
      const mir = new THREE.Group(); mir.scale.x = s; seg.g.add(mir);
      const p = surf(D, z, th, SX, SY, 0.92);
      const f = new THREE.Group(); f.position.set(p.x, p.y, z - seg.pivot); f.rotation.set(0, 0.45, droop); mir.add(f);
      add(f, finGeo(len, wid, 0.12, 0.35), finM);
      fins.push({ f, droop, ph: z * 0.4 });
    }
  };
  sideFin(chain[0], 2.0, 1.95, 2.0, 0.42, -0.45);
  sideFin(chain[0], -0.1, 2.0, 1.4, 0.32, -0.5);
  const vf = new THREE.Group(); const vp = surf(D, -1.5, Math.PI, SX, SY, 0.9);
  vf.position.set(0, vp.y, -1.5 - chain[1].pivot); vf.rotation.set(0.75, 0, -Math.PI / 2); chain[1].g.add(vf);
  add(vf, finGeo(1.1, 0.36, 0.1, 0.25), finM);
  fins.push({ f: vf, droop: -Math.PI / 2, ph: 2, ventral: true });

  finish(root, 0.05);
  bio.glow(0);
  let ph = 0;
  return {
    root, mats: [bodyM, finM], glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, w = st.windup || 0, a = st.attack || 0;
      ph += dt * (1.1 + sp * 0.35);
      swim.position.y = 2.9 + Math.sin(st.t * 0.8) * 0.15 + w * 0.4 - a * 0.3;
      swim.position.z = -w * 0.6 + a * 1.4;
      swim.rotation.x = Math.sin(ph) * 0.03 - w * 0.22 + a * 0.28;
      for (let i = 1; i < chain.length; i++) chain[i].g.rotation.x = Math.sin(ph - i * 0.9) * (0.1 + sp * 0.02) + w * 0.22 - a * 0.25;
      fins.forEach(fn => {
        if (fn.ventral) fn.f.rotation.x = 0.75 + Math.sin(ph + fn.ph) * 0.1;
        else fn.f.rotation.z = fn.droop + Math.sin(ph * 1.2 + fn.ph) * 0.22 + w * 0.3;
      });
      holes.forEach((h, i) => { h.material.opacity = a * 0.55 * (0.7 + 0.3 * Math.sin(st.t * 12 + i)); h.scale.setScalar(0.4 + a * 0.6); });
    },
    flash(v) { bodyM.emissive.setRGB(v, v, v); finM.emissive.setRGB(v, v, v); },
  };
}

/* ============================================================
   HARKAL — the air shark (~2.5 m)
   ============================================================ */
export function buildHarkal(opts = {}) {
  const rnd = mulberry32(opts.seed ?? 7);
  const root = noSolid(new THREE.Group());   // it moves, and sees to its own bumps
  const swim = new THREE.Group(); swim.position.y = 1.6; root.add(swim);
  const top = new THREE.Color(opts.color ?? 0x5b7488), belly = new THREE.Color(0xd9dfe2);
  const bodyM = mat(0xffffff, { vertexColors: true });
  const finM = mat(top.clone().multiplyScalar(0.9));
  const toothM = mat(0xf4ecd6), darkM = mat(0x2a1418), scarM = new THREE.MeshToonMaterial({ color: 0xd8c4bc, gradientMap: ramp() });
  const gumM = mat(0x8a3a44), bellyM = mat(0xd9dfe2);
  const SX = 0.86, SY = 1;
  // bioluminescence (a lantern shark's): a lateral line of dots, a glowing belly
  // scatter, and a lit tip on THE tooth
  const bio = bioKit();
  const HK_GLOW = [0x7ab8ff, 0x8affe8, 0xc89aff];
  const bioC = opts.seed != null ? HK_GLOW[Math.floor(rnd() * HK_GLOW.length)] : HK_GLOW[0];
  const photoM = bio.mat(bioC, top, 0.25, 0.1, 2.0);
  const D = smoothProfile([[-1.1, 0], [-1.05, 0.05], [-0.85, 0.09], [-0.5, 0.17], [-0.1, 0.3], [0.3, 0.4], [0.65, 0.44],
    [0.95, 0.42], [1.12, 0.33], [1.22, 0.18], [1.26, 0]], 70);
  const chain = buildChain(swim, D, [-0.15, -0.62], bodyM, { segs: 18, sx: SX, sy: SY, colors: [top, belly, -0.15] });
  const head = chain[0].g;
  // lift the snout a touch above the jaw line
  { const p = head.children[0].geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z > 0.6) p.setY(i, p.getY(i) + (z - 0.6) * 0.18); }
    head.children[0].geometry.computeVertexNormals(); }
  // the underbite: a heavy lower jaw that juts past the snout
  const jaw = new THREE.Group(); jaw.position.set(0, -0.24, 0.5); head.add(jaw);
  const jg = new THREE.SphereGeometry(1, 16, 10, 0, TAU, Math.PI * 0.35, Math.PI * 0.65); jg.scale(0.31, 0.2, 0.5);
  add(jaw, jg, bellyM, 0, 0.12, 0.42);
  add(jaw, new THREE.SphereGeometry(1, 12, 6, 0, TAU, 0, Math.PI / 2).scale(0.25, 0.05, 0.42), gumM, 0, 0.1, 0.42);
  // THE tooth, jutting up from the underbite past the upper lip
  const big = add(jaw, new THREE.ConeGeometry(0.06, 0.4, 7), toothM, 0.08, 0.3, 0.8); big.rotation.set(0.3, 0, -0.12);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
    if (s > 0 && i === 0) continue;
    const a = 0.4 + i * 0.28, t = add(jaw, new THREE.ConeGeometry(0.018, 0.06, 4), toothM, s * Math.sin(a) * 0.21, 0.15, 0.42 + Math.cos(a) * 0.36);
    t.rotation.x = 0.2;
  }
  // upper teeth & dark mouth interior
  add(head, new THREE.SphereGeometry(1, 12, 8).scale(0.26, 0.1, 0.35), darkM, 0, -0.14, 0.86);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const a = 0.35 + i * 0.3, t = add(head, new THREE.ConeGeometry(0.016, 0.06, 4), toothM, s * Math.sin(a) * 0.22, -0.13, 0.78 + Math.cos(a) * 0.32);
    t.rotation.x = Math.PI;
  }
  add(big, new THREE.SphereGeometry(0.03, 8, 6), photoM, 0, 0.17, 0).userData.noOutline = true;
  chainDots(chain, D, SX, SY, [[1.5, 0.9, -0.95, 0.12, 0.022], [-1.5, 0.9, -0.95, 0.12, 0.022], [2.55, 0.7, -0.5, 0.16, 0.026], [-2.55, 0.7, -0.5, 0.16, 0.026], [Math.PI, 0.6, -0.4, 0.2, 0.024]], photoM);
  // eyes and gills
  const eyeM = mat(0x0a0a10);
  for (const s of [-1, 1]) {
    const p = surf(D, 0.95, s * 1.15, SX, SY, 0.96);
    add(head, new THREE.SphereGeometry(0.045, 8, 6), eyeM, p.x, p.y + 0.03, p.z);
    for (let k = 0; k < 3; k++) {
      const z = 0.42 - k * 0.09, p0 = surf(D, z, s * 1.35, SX, SY, 1.0), p1 = surf(D, z - 0.03, s * 1.95, SX, SY, 1.0);
      add(head, new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 1, 0.012, 4), darkM);
    }
  }
  // scars: pale slashes, one with stitch-like crossings
  const scarG = [];
  for (let k = 0; k < 4; k++) {
    const s = k % 2 ? 1 : -1, z0 = 0.15 + rnd() * 0.8, th0 = s * (0.4 + rnd() * 0.7);
    const pts = [0, 0.5, 1].map(t => surf(D, z0 - t * (0.25 + rnd() * 0.1), th0 + s * t * 0.6, SX, SY, 1.01));
    const m = noOut(add(head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.014, 4), scarM)); scarG.push(m);
  }
  // fins: tall dorsal, pectorals, small 2nd dorsal + anal, heterocercal tail
  const dors = slab([[0.25, 0], [-0.05, 0.28], [-0.22, 0.46], [-0.28, 0.44], [-0.24, 0.2], [-0.35, 0]], 0.05).rotateY(-Math.PI / 2);
  add(head, dors, finM, 0, 0.32, 0.25);
  const mid = chain[1].g;
  add(mid, slab([[0.08, 0], [-0.06, 0.1], [-0.1, 0.1], [-0.12, 0]], 0.03).rotateY(-Math.PI / 2), finM, 0, 0.1, -0.5 + 0.15);
  add(mid, slab([[0.08, 0], [-0.06, -0.1], [-0.1, -0.1], [-0.12, 0]], 0.03).rotateY(-Math.PI / 2), finM, 0, -0.1, -0.45 + 0.15);
  const pecs = [];
  for (const s of [-1, 1]) {
    const mir = new THREE.Group(); mir.scale.x = s; head.add(mir);
    const p = surf(D, 0.5, 2.05, SX, SY, 0.9);
    const f = new THREE.Group(); f.position.set(p.x, p.y, 0.5); f.rotation.set(0, 0.5, -0.55); mir.add(f);
    add(f, finGeo(0.6, 0.16, 0.05, 0.6, 0.75), finM); pecs.push(f);
  }
  const tailSeg = chain[2].g;
  const tail = new THREE.Group(); tail.position.z = -1.0 - chain[2].pivot; tailSeg.add(tail);
  add(tail, smoothSlab([[0.12, 0], [-0.2, 0.3], [-0.42, 0.62], [-0.36, 0.64], [-0.2, 0.25], [-0.2, 0], [-0.32, -0.32], [-0.24, -0.34], [0.05, -0.04]], 0.05).rotateY(-Math.PI / 2), finM);

  finish(root, 0.022);
  bio.glow(0);
  let ph = 0;
  return {
    root, mats: [bodyM, finM], glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, w = st.windup || 0, a = st.attack || 0;
      ph += dt * (2.2 + sp * 0.8);
      swim.position.y = 1.6 + Math.sin(st.t * 1.1) * 0.08 + w * 0.1;
      swim.position.z = -w * 0.35 + a * 0.6;
      swim.rotation.x = -w * 0.25 + a * 0.15;
      swim.rotation.y = Math.sin(ph) * 0.06;
      for (let i = 1; i < chain.length; i++) chain[i].g.rotation.y = -Math.sin(ph - i * 1.1) * (0.18 + sp * 0.03) * (1 - a * 0.5);
      jaw.rotation.x = 0.12 + w * 0.3 + a * 0.3 + Math.sin(st.t * 1.7) * 0.03;
      pecs.forEach(p => { p.rotation.z = -0.55 + Math.sin(ph * 0.7) * 0.08; });
    },
    flash(v) { bodyM.emissive.setRGB(v, v, v); finM.emissive.setRGB(v, v, v); },
  };
}

/* ============================================================
   SU NAGA — the biggest species (~21 m nose to flukes)
   ============================================================ */
export function buildSuNaga(opts = {}) {
  const root = noSolid(new THREE.Group());   // it moves, and sees to its own bumps
  const swim = new THREE.Group(); swim.position.y = 3.9; root.add(swim);
  const top = new THREE.Color(opts.color ?? 0x1d5468), belly = new THREE.Color(0x7fb4bd);
  const bodyM = mat(0xffffff, { vertexColors: true });
  const finM = mat(0x1a4a5e), ridgeM = mat(0x16384c, { emissive: 0x3a1a78, emissiveIntensity: 0.6 });
  const darkM = mat(0x0c1420), jawM = mat(0x6fa2ab);
  const GLOW = [0x5ff4ff, 0x6a8cff, 0xb46aff, 0x8af0d8];
  const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  // its lots-of-bioluminescence: everything below is dimmer by day and full at night
  const bio = bioKit();
  const spotGeo = new THREE.SphereGeometry(1, 8, 6);
  const SX = 1.15, SY = 0.9;
  const D = smoothProfile([[-10.2, 0], [-10.0, 0.3], [-9, 0.42], [-7.6, 0.66], [-6, 1.1], [-4.5, 1.75], [-3, 2.25], [-1, 2.5],
    [1, 2.4], [2.6, 2.0], [3.8, 1.35], [4.5, 0.6], [4.7, 0]], 110);
  const chain = buildChain(swim, D, [-3.5, -6.0, -8.0], bodyM, { segs: 24, sx: SX, sy: SY, colors: [top, belly, -0.35] });

  // bioluminescent spots, one instanced cloud per body slice
  const spotSets = [];
  const spots = (seg, list) => {
    const im = noOut(new THREE.InstancedMesh(spotGeo, spotMat, list.length));
    const M = new THREE.Matrix4(), c = new THREE.Color();
    list.forEach(([p, s, col], i) => { M.makeScale(s, s * 0.6, s).setPosition(p.x, p.y, p.z - seg.pivot); im.setMatrixAt(i, M); im.setColorAt(i, c.set(col)); });
    im.frustumCulled = false; seg.g.add(im); spotSets.push(im);
  };
  chain.forEach((seg, si) => {
    const L = [];
    for (let z = seg.zA + 0.3; z < seg.zB - 0.2; z += 0.75) {
      const r = profR(D, z); if (r < 0.35) continue;
      for (const s of [-1, 1]) {
        L.push([surf(D, z, s * 1.05, SX, SY, 1.0), 0.12 + r * 0.04, GLOW[(Math.round(z * 2) + 4) % 2]]);
        L.push([surf(D, z + 0.35, s * 1.5, SX, SY, 1.0), 0.1 + r * 0.035, GLOW[2]]);
        if (r > 1) L.push([surf(D, z + 0.2, s * 0.62, SX, SY, 1.0), 0.09, GLOW[3]]);
      }
    }
    if (L.length) spots(seg, L);
    void si;
  });

  // three ridges down the back: one big centre ridge, two smaller beside it
  const ridge = (seg, th, z0, z1, H, thick) => {
    const a = Math.max(z0, seg.zA), b = Math.min(z1, seg.zB); if (b - a < 0.05) return;
    const steps = Math.max(4, Math.round((b - a) / 0.12)), pos = [], idx = [];
    for (let i = 0; i <= steps; i++) {
      const z = a + (b - a) * i / steps, u = (z - z0) / (z1 - z0);
      const saw = (z * 1.3) % 1, h = H * Math.pow(Math.sin(Math.PI * u), 0.6) * (0.45 + 0.55 * (saw < 0.75 ? saw / 0.75 : (1 - saw) / 0.25));
      const B = surf(D, z, th, SX, SY, 0.96), n = V3(Math.sin(th) / SX, Math.cos(th) / SY, 0).normalize(), sd = V3(n.y, -n.x, 0).multiplyScalar(thick);
      const lz = z - seg.pivot;
      pos.push(B.x - sd.x, B.y - sd.y, lz, B.x + sd.x, B.y + sd.y, lz, B.x + n.x * (h + 0.08), B.y + n.y * (h + 0.08), lz);
    }
    for (let i = 0; i < steps; i++) {
      const o = i * 3, q = o + 3;
      idx.push(o, q, o + 2, q, q + 2, o + 2);           // -side face
      idx.push(o + 1, o + 2, q + 1, q + 1, o + 2, q + 2); // +side face
      idx.push(o, o + 1, q, q, o + 1, q + 1);           // base
    }
    idx.push(0, 2, 1); const e = steps * 3; idx.push(e, e + 1, e + 2);
    let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    g = g.toNonIndexed(); g.computeVertexNormals();
    add(seg.g, g, ridgeM);
  };
  chain.forEach(seg => {
    ridge(seg, 0, -7.4, 3.4, 1.9, 0.14);
    ridge(seg, -0.6, -5.6, 2.4, 0.85, 0.1);
    ridge(seg, 0.6, -5.6, 2.4, 0.85, 0.1);
  });
  // ridge-line glow
  for (let i = 0; i < 6; i++) {
    const z = -5.5 + i * 1.6, seg = segAt(chain, z), p = surf(D, z, 0, SX, SY, 1.15);
    const gs = glowSprite(GLOW[i % 3], 2.4, 0.35); gs.position.set(0, p.y + 0.4, z - seg.pivot); seg.g.add(gs);
    bio.sprite(gs, 0.5, 0.3);
  }

  // massive flippers, two pairs
  const flippers = [];
  const flipper = (z, len, wid, droop, ph) => {
    const seg = segAt(chain, z);
    for (const s of [-1, 1]) {
      const mir = new THREE.Group(); mir.scale.x = s; seg.g.add(mir);
      const p = surf(D, z, 1.95, SX, SY, 0.9);
      const f = new THREE.Group(); f.position.set(p.x, p.y, z - seg.pivot); f.rotation.set(0, 0.35, droop); mir.add(f);
      add(f, finGeo(len, wid, 0.26, 0.3, 0.45), finM);
      const L = [];
      for (let k = 1; k < 6; k++) { const x = len * k / 6.3; L.push([V3(x, 0.17 * (1 - 0.5 * x / len), -0.3 * (x / len) * (x / len) * len), 0.13 * (1 - 0.4 * k / 6), GLOW[k % 3]]); }
      const im = noOut(new THREE.InstancedMesh(spotGeo, spotMat, L.length)), M = new THREE.Matrix4(), c = new THREE.Color();
      L.forEach(([q, sc, col], i) => { M.makeScale(sc, sc * 0.5, sc).setPosition(q.x, q.y, q.z); im.setMatrixAt(i, M); im.setColorAt(i, c.set(col)); });
      im.frustumCulled = false; f.add(im);
      flippers.push({ f, droop, ph, s });
    }
  };
  flipper(1.8, 6.2, 1.5, -0.32, 0);
  flipper(-3.3, 4.6, 1.1, -0.38, 1.6);

  // whale flukes with an upright fin in the middle
  const tail = chain[3];
  const fl = new THREE.Group(); fl.position.z = -9.85 - tail.pivot; tail.g.add(fl);
  const flG = smoothSlab([[0, 0.5], [1.2, 0.1], [2.5, -0.45], [2.7, -1.05], [1.7, -0.75], [0.5, -0.95], [0, -0.55],
    [-0.5, -0.95], [-1.7, -0.75], [-2.7, -1.05], [-2.5, -0.45], [-1.2, 0.1]], 0.16).rotateX(Math.PI / 2).scale(1.3, 1, 1.3);
  add(fl, flG, finM);
  add(fl, smoothSlab([[0.6, 0], [0.1, 0.7], [-0.45, 1.5], [-0.75, 1.45], [-0.85, 0.5], [-0.9, 0]], 0.1).rotateY(-Math.PI / 2), finM, 0, 0.05, -0.1);
  const fGlow = glowSprite(GLOW[2], 3, 0.4); fGlow.position.set(0, 0.2, -0.5); fl.add(fGlow);
  bio.sprite(fGlow, 0.6, 0.3);
  // purple beads along the fluke's trailing edge
  bioMesh(bioDots([[0.5, -0.95], [1.1, -0.82], [1.7, -0.75], [2.3, -0.92], [2.7, -1.05]].flatMap(([x, z]) => [-1, 1].map(s => [s * x * 1.3, 0.11, z * 1.3, 0, 1, 0, 0.13, 0.4]))), bio.mat(GLOW[2], 0x1a4a5e, 0.35, 0.15, 2.2), fl);

  // necks & heads — five built, opts.heads shown
  const necks = [];
  const tendBall = bio.basic(glowMat(GLOW[0]), 0.55);
  const NSEG = 5, NL = 1.25;
  const neckR = [0.9, 0.8, 0.7, 0.62, 0.56, 0.52];
  for (let n = 0; n < 5; n++) {
    const base = new THREE.Group(); swim.add(base);
    const segs = []; let par = base;
    for (let i = 0; i < NSEG; i++) {
      const g = new THREE.Group(); g.position.z = i === 0 ? 0 : NL; par.add(g);
      const geo = countershade(capsuleZ(neckR[i], neckR[i + 1], NL, 16).scale(1, 0.92, 1), top, belly, -0.35);
      add(g, geo, bodyM);
      if (i % 2 === 0) { const sp = noOut(add(g, spotGeo, spotMat, 0, neckR[i] * 0.86, NL * 0.5)); sp.scale.set(0.13, 0.08, 0.18); }
      segs.push(g); par = g;
    }
    const head = new THREE.Group(); head.position.z = NL; par.add(head);
    const hg = countershade(new THREE.SphereGeometry(0.8, 18, 12).scale(1, 0.78, 1.35), top, belly, -0.3);
    add(head, hg, bodyM, 0, 0.08, 0.7);
    const snout = countershade(new THREE.SphereGeometry(0.52, 14, 10).scale(1, 0.62, 1.1), top, belly, -0.3);
    add(head, snout, bodyM, 0, -0.02, 1.5);
    const jaw = new THREE.Group(); jaw.position.set(0, -0.24, 0.25); head.add(jaw);
    add(jaw, new THREE.SphereGeometry(1, 14, 8, 0, TAU, Math.PI / 2, Math.PI / 2).scale(0.55, 0.28, 1.3), jawM, 0, 0.06, 0.75);
    add(head, new THREE.SphereGeometry(1, 12, 6).scale(0.46, 0.14, 1.05), darkM, 0, -0.22, 1.05);
    const mglow = glowSprite(GLOW[2], 1.4, 0.0); mglow.position.set(0, -0.26, 1.5); head.add(mglow);
    // tendrils where the eyes would be
    const tends = [];
    for (const s of [-1, 1]) {
      const tg = new THREE.Group(); tg.position.set(s * 0.6, 0.28, 1.15); head.add(tg);
      noOut(add(tg, new THREE.SphereGeometry(0.13, 8, 6), tendBall));
      add(tg, taperTube([[0, 0, 0], [s * 0.45, 0.12, -0.12], [s * 0.85, -0.25, -0.45], [s * 0.95, -0.95, -0.75]], 0.09, 0.02, 12, 5), finM);
      add(tg, taperTube([[0, 0, 0], [s * 0.35, 0.2, -0.3], [s * 0.6, 0.0, -0.95], [s * 0.55, -0.45, -1.5]], 0.07, 0.015, 12, 5), finM);
      for (const [x, y, z, c] of [[0.95, -0.95, -0.75, 0], [0.55, -0.45, -1.5, 2]]) {
        const tip = glowSprite(GLOW[c], 0.6, 0.95); tip.position.set(s * x, y, z); tg.add(tip);
        bio.sprite(tip, 0.95, 0.35);
      }
      tends.push(tg);
    }
    necks.push({ base, segs, head, jaw, tends, mglow, ph: n * 1.3 });
  }
  let heads = 3;
  function setHeads(k) {
    heads = THREE.MathUtils.clamp(Math.round(k || 3), 2, 5);
    const sp = Math.min(2.0, 3.8 / (heads - 1));
    necks.forEach((nk, i) => {
      nk.base.visible = i < heads;
      const x = (i - (heads - 1) / 2) * sp;
      nk.base.position.set(x, 0.55 - Math.abs(x) * 0.18, 3.35);
      nk.base.rotation.y = x * 0.07;
      nk.x = x;
    });
  }
  setHeads(opts.heads ?? 3);

  finish(root, 0.09);
  bio.glow(0);
  let ph = 0;
  return {
    root, mats: [bodyM, finM], setHeads, glow: bio.glow,
    get heads() { return heads; },
    animate(dt, st) {
      const sp = st.speed || 0, w = st.windup || 0, a = st.attack || 0;
      ph += dt * (0.7 + sp * 0.12);
      swim.position.y = 3.9 + Math.sin(ph) * 0.25;
      swim.position.z = -w * 0.8 + a * 1.6;
      swim.rotation.x = Math.sin(ph + 0.6) * 0.02 - w * 0.06 + a * 0.05;
      for (let i = 1; i < chain.length; i++) chain[i].g.rotation.x = Math.sin(ph - i * 0.8) * 0.09 + w * 0.06;
      flippers.forEach(fp => {
        fp.f.rotation.z = fp.droop + Math.sin(ph * 1.2 + fp.ph) * 0.3;
        fp.f.rotation.y = 0.35 + Math.cos(ph * 1.2 + fp.ph) * 0.18;
      });
      necks.forEach(nk => {
        if (!nk.base.visible) return;
        nk.segs.forEach((g, i) => {
          g.rotation.y = Math.sin(st.t * 0.9 + nk.ph - i * 0.7) * 0.07 * (1 - a * 0.7);
          g.rotation.x = (i === 0 ? -0.12 : 0.03) + Math.sin(st.t * 0.7 + nk.ph + i) * 0.03
            - w * (i < 2 ? 0.25 : -0.12) + a * (i < 2 ? 0.1 : 0.05);
        });
        nk.head.rotation.x = -w * 0.3 + a * 0.15;
        nk.jaw.rotation.x = 0.05 + w * 0.15 + a * 0.55;
        nk.mglow.material.opacity = a * 0.8;
        nk.tends.forEach((tg, k) => { tg.rotation.x = Math.sin(st.t * 1.6 + nk.ph + k) * 0.15; tg.rotation.y = Math.sin(st.t * 1.1 + k * 2) * 0.12; });
      });
      const pulse = 0.85 + Math.sin(st.t * 1.8) * 0.2;
      const nf = 0.45 + 0.55 * bio.v;
      spotMat.color.setScalar(pulse * nf);
      ridgeM.emissiveIntensity = (0.45 + Math.sin(st.t * 1.8 + 1) * 0.2 + w * 0.4) * (0.5 + 0.9 * bio.v);
    },
    flash(v) { bodyM.emissive.setRGB(v, v, v); finM.emissive.setRGB(v, v, v); },
  };
}

/* ============================================================
   RAF KRABBI — the four-legged electric crab (~0.4 m)
   ============================================================ */
function krabbiColour(opts) {
  if (opts.color !== undefined) return new THREE.Color(opts.color);
  if (opts.seed === undefined || opts.seed === null) return new THREE.Color(0xc14953);
  const r = mulberry32(Math.floor(opts.seed * 9973) + 11); r();
  const pick = r();
  if (pick < 0.06) return new THREE.Color().setHSL(r(), 0.1, 0.12 + r() * 0.08); // near-black
  if (pick < 0.12) return new THREE.Color().setHSL(r(), 0.15, 0.85 + r() * 0.08); // pale / white
  return new THREE.Color().setHSL(r(), 0.35 + r() * 0.6, 0.3 + r() * 0.35);
}
export function buildRafKrabbi(opts = {}) {
  const rnd = mulberry32((opts.seed ?? 3) * 131 + 5);
  const root = noSolid(new THREE.Group());   // it moves, and sees to its own bumps
  const col = krabbiColour(opts), hsl = {}; col.getHSL(hsl);
  const shellM = mat(col), plateM = mat(col.clone().offsetHSL(0, 0, -0.1)), legM = mat(col.clone().offsetHSL(0, -0.05, -0.05));
  const bellyM = mat(col.clone().lerp(new THREE.Color(0xf2e6d0), 0.6)), tipM = mat(0x241c1c), eyeM = mat(0x111111);
  // bioluminescence: a row of lamps round the carapace rim and glowing eye-stalk tips,
  // in a colour opposite its shell's hue (on top of its electric charge)
  const bio = bioKit();
  const glowC = new THREE.Color().setHSL((hsl.h + 0.5) % 1, 0.9, 0.65);
  const rimGlow = bio.mat(glowC.getHex(), col, 0.3, 0.1, 2.0);
  const body = new THREE.Group(); body.position.y = 0.095; root.add(body);
  // thick plate armour: dome, stacked top plate, rear bands, craggy rim knobs
  add(body, new THREE.SphereGeometry(1, 22, 12).scale(0.13, 0.06, 0.1), shellM);
  add(body, new THREE.SphereGeometry(1, 16, 8).scale(0.115, 0.045, 0.08), bellyM, 0, -0.02, 0);
  add(body, new THREE.SphereGeometry(1, 18, 10, 0, TAU, 0, Math.PI / 2).scale(0.095, 0.035, 0.07), plateM, 0, 0.038, 0.01);
  for (let k = 0; k < 2; k++) {
    const b = add(body, new THREE.TorusGeometry(0.1 - k * 0.022, 0.013, 5, 16, Math.PI * 0.8), plateM, 0, 0.03 + k * 0.008, -0.02 - k * 0.012);
    b.rotation.set(Math.PI / 2 - 0.35, 0, Math.PI * 1.1);
  }
  for (let i = 0; i < 9; i++) {
    const a = -1.0 + i * 0.25, k = add(body, craggy(0.017, rnd, 0.3, 0), plateM, Math.sin(a) * 0.12, 0.032 + rnd() * 0.01, Math.cos(a) * 0.085);
    k.rotation.set(rnd() * 3, rnd() * 3, 0);
  }
  for (let i = 0; i < 4; i++) { const k = add(body, craggy(0.014, rnd, 0.3, 0), plateM, (rnd() - 0.5) * 0.12, 0.07, (rnd() - 0.5) * 0.08); k.rotation.y = rnd() * 3; }
  { const L = []; for (let i = 0; i < 12; i++) { const a = Math.PI * 0.25 + i / 11 * Math.PI * 1.5; L.push([Math.sin(a), -0.05, Math.cos(a), 0.012]); } bioMesh(bioDots(L, 0.13, 0.06, 0.1), rimGlow, body).scale.set(0.13, 0.06, 0.1); }
  // eyes on stalks
  for (const s of [-1, 1]) {
    const st = add(body, new THREE.CylinderGeometry(0.007, 0.009, 0.05, 5), legM, s * 0.03, 0.055, 0.075); st.rotation.x = 0.3;
    add(st, new THREE.SphereGeometry(0.011, 8, 6), eyeM, 0, 0.028, 0);
    bioMesh(bioDots([[0, 0.038, 0, 0, 1, 0, 0.006, 0.8]]), rimGlow, st);
  }
  // four legs — two each side
  const legs = [];
  for (const s of [-1, 1]) {
    const mir = new THREE.Group(); mir.scale.x = s; body.add(mir);
    [[0.012, -0.25], [-0.06, 0.35]].forEach(([z, yaw], k) => {
      const hip = new THREE.Group(); hip.position.set(0.11, -0.012, z); hip.rotation.set(0, yaw - 0.0, 0.45); mir.add(hip);
      add(hip, capsuleX(0.019, 0.016, 0.09, 7), legM);
      const knee = new THREE.Group(); knee.position.x = 0.09; knee.rotation.z = -1.55; hip.add(knee);
      add(knee, capsuleX(0.016, 0.006, 0.115, 7), legM);
      add(knee, new THREE.ConeGeometry(0.006, 0.02, 4).rotateZ(-Math.PI / 2), tipM, 0.118, 0, 0);
      legs.push({ hip, knee, ph: k * Math.PI + (s > 0 ? Math.PI / 2 : 0), yaw });
    });
  }
  // craggy claws on short arms
  const claws = [], tips = [];
  for (const s of [-1, 1]) {
    const mir = new THREE.Group(); mir.scale.x = s; body.add(mir);
    const sh = new THREE.Group(); sh.position.set(0.085, -0.005, 0.07); sh.rotation.set(0, 0.75, 0); mir.add(sh);
    add(sh, capsuleZ(0.016, 0.019, 0.065, 7), legM);
    const el = new THREE.Group(); el.position.z = 0.065; el.rotation.y = -1.2; sh.add(el);
    add(el, capsuleZ(0.019, 0.024, 0.05, 7), legM);
    const hand = new THREE.Group(); hand.position.z = 0.055; hand.rotation.y = -0.15; el.add(hand);
    const palm = add(hand, craggy(0.05, rnd, 0.18, 1), plateM, 0, 0.005, 0.03); palm.scale.set(0.8, 0.75, 1.15);
    for (let i = 0; i < 3; i++) { const k = add(hand, craggy(0.012, rnd, 0.3, 0), plateM, (rnd() - 0.2) * 0.04, 0.035, 0.0 + i * 0.025); k.rotation.y = rnd() * 3; }
    const fixed = add(hand, new THREE.ConeGeometry(0.019, 0.075, 6).rotateX(Math.PI / 2), shellM, 0.004, -0.014, 0.1);
    fixed.rotation.x = -0.15;
    add(fixed, new THREE.ConeGeometry(0.008, 0.025, 4).rotateX(Math.PI / 2), tipM, 0, 0, 0.035);
    const dac = new THREE.Group(); dac.position.set(0.004, 0.02, 0.06); hand.add(dac);
    const df = add(dac, new THREE.ConeGeometry(0.016, 0.07, 6).rotateX(Math.PI / 2), shellM, 0, 0, 0.035); df.rotation.x = 0.15;
    add(df, new THREE.ConeGeometry(0.007, 0.022, 4).rotateX(Math.PI / 2), tipM, 0, 0, 0.032);
    const tip = new THREE.Object3D(); tip.position.set(0, -0.02, 0.1); hand.add(tip); tips.push(tip);
    const g = glowSprite(0x8ff6ff, 0.09, 0.8); g.position.set(0, 0, 0.1); hand.add(g);
    claws.push({ sh, el, hand, dac, g });
  }
  // the electric arcs (jittered polylines rebuilt in-place each frame)
  const arcMat = new THREE.LineBasicMaterial({ color: 0xaaffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const arcMat2 = new THREE.LineBasicMaterial({ color: 0x3ad8ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const NP = 9, arcs = [];
  for (let i = 0; i < 4; i++) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
    const ln = new THREE.Line(geo, i % 2 ? arcMat2 : arcMat); ln.frustumCulled = false; body.add(ln); arcs.push(ln);
    ln.userData.beads = [2, 4, 6].map(() => { const b = glowSprite(0x9ffaff, 0.035, 0.9); body.add(b); return b; });
  }
  const shellTop = V3(0, 0.085, 0), A = new THREE.Vector3(), B = new THREE.Vector3();
  const halo = glowSprite(0x6af0ff, 0.3, 0.2); halo.position.y = 0.06; body.add(halo);
  const setArc = (ln, p, q, amp) => {
    const arr = ln.geometry.attributes.position.array;
    for (let i = 0; i < NP; i++) {
      const t = i / (NP - 1), j = (i === 0 || i === NP - 1) ? 0 : amp;
      arr[i * 3] = p.x + (q.x - p.x) * t + (Math.random() - 0.5) * j;
      arr[i * 3 + 1] = p.y + (q.y - p.y) * t + (Math.random() - 0.5) * j + Math.sin(t * Math.PI) * amp * 0.8;
      arr[i * 3 + 2] = p.z + (q.z - p.z) * t + (Math.random() - 0.5) * j;
    }
    ln.geometry.attributes.position.needsUpdate = true;
    ln.userData.beads.forEach((b, k) => { const i = 2 + k * 2; b.position.set(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]); });
  };

  finish(root, 0.006);
  bio.glow(0);
  root.scale.setScalar(0.8 * (opts.size ? opts.size / 0.4 : 1));
  let ph = Math.random() * 6, flick = 0;
  return {
    root, mats: [shellM, plateM, legM], glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, w = st.windup || 0, a = st.attack || 0;
      ph += dt * (2 + sp * 30);
      const walking = sp > 0.05;
      legs.forEach(l => {
        const s = Math.sin(ph + l.ph);
        l.hip.rotation.y = l.yaw + (walking ? s * 0.35 : 0);
        l.hip.rotation.z = 0.45 + (walking ? Math.max(0, Math.cos(ph + l.ph)) * 0.3 : 0);
      });
      body.position.y = 0.095 + (walking ? Math.abs(Math.sin(ph * 2)) * 0.006 : Math.sin(st.t * 2) * 0.002) - w * 0.012;
      body.rotation.z = walking ? Math.sin(ph) * 0.04 : 0;
      claws.forEach((c, i) => {
        c.sh.rotation.x = -w * 0.6 + a * 0.25 + Math.sin(st.t * 1.5 + i) * 0.05;
        c.el.rotation.y = -1.2 + w * 0.3 - a * 0.25;
        c.hand.rotation.x = -w * 0.3;
        // snap: wide open on the wind-up, slammed shut on the attack
        const open = a > 0.25 ? 0 : Math.max(w * 0.8, 0.12 + Math.max(0, Math.sin(st.t * 2.3 + i * 2)) * 0.25);
        c.dac.rotation.x = -open;
        c.g.material.opacity = 0.5 + Math.random() * 0.5;
        c.g.scale.setScalar(0.07 + a * 0.12 + Math.random() * 0.03);
      });
      // arcs crackle
      flick -= dt;
      if (flick <= 0) {
        flick = 0.04 + Math.random() * 0.06;
        root.updateMatrixWorld(true);
        tips[0].getWorldPosition(A); body.worldToLocal(A);
        tips[1].getWorldPosition(B); body.worldToLocal(B);
        const amp = 0.025 + a * 0.03 + w * 0.02, on = 0.45 + w * 0.3 + a * 0.5;
        setArc(arcs[0], A, B, amp); arcs[0].visible = Math.random() < on;
        setArc(arcs[1], A, B, amp * 1.4); arcs[1].visible = Math.random() < on * 0.8;
        setArc(arcs[2], A, shellTop, amp); arcs[2].visible = Math.random() < on * 0.6;
        setArc(arcs[3], B, shellTop, amp); arcs[3].visible = Math.random() < on * 0.6;
        arcs.forEach(l => l.userData.beads.forEach(b => { b.visible = l.visible; b.scale.setScalar(0.025 + Math.random() * 0.03 + a * 0.03); }));
      }
      halo.material.opacity = (0.15 + Math.random() * 0.15 + a * 0.3) * (0.7 + 0.6 * bio.v);
    },
    flash(v) { shellM.emissive.setRGB(v, v, v); plateM.emissive.setRGB(v, v, v); },
  };
}

/* ============================================================
   GROTHYN — barnacle cone, four petals, one very long vine (~1.2 m)
   ============================================================ */
const GROTHYN_EL = {
  Ular: { shell: 0x5d9446, petal: 0x8fc860, vine: 0x2f6a2a, glow: 0x9aff6a },
  Su: { shell: 0x3d78b8, petal: 0x6fb0e8, vine: 0x1f4f7a, glow: 0x6ae0ff },
  Eldi: { shell: 0xc9542a, petal: 0xf08a3a, vine: 0x7a2a18, glow: 0xffb04a },
};
export function buildGrothyn(opts = {}) {
  const E = GROTHYN_EL[opts.element] || GROTHYN_EL.Ular;
  const root = noSolid(new THREE.Group());   // it moves, and sees to its own bumps
  const shellM = mat(E.shell), petalM = mat(E.petal), vineM = mat(E.vine), innerM = mat(new THREE.Color(E.vine).multiplyScalar(0.45));
  const thornM = mat(0xe8dcc0);
  // bioluminescence: the petal veins glow, beads of light ring the cone's growth lines,
  // and the opening and vine tip shine brighter at night
  const bio = bioKit();
  const veinM = bio.mat(E.glow, E.shell, 0.3, 0.1, 2.0);
  // the cone shell: six wall plates with grooves and growth lines, open at the top
  const prof = [[0.82, 0], [0.82, 0.06], [0.74, 0.3], [0.62, 0.62], [0.5, 0.95], [0.43, 1.13], [0.39, 1.2], [0.33, 1.2], [0.3, 1.13], [0.28, 1.0], [0.0, 0.95]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const cone = new THREE.LatheGeometry(new THREE.SplineCurve(prof).getSpacedPoints(40), 48);
  { const p = cone.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z);
      if (y > 1.13) continue;
      const k = 1 - 0.1 * Math.pow(Math.abs(Math.cos(a * 3)), 16) + 0.03 * Math.pow(Math.abs(Math.sin(a * 6)), 0.5) * (1 - y) + 0.008 * Math.sin(y * 30) * (y < 1.05 ? 1 : 0);
      p.setXYZ(i, x * k, y, z * k);
    }
    cone.computeVertexNormals(); }
  add(root, cone, shellM);
  { const L = []; for (const [y, r] of [[0.3, 0.74], [0.62, 0.62]]) for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * TAU + y; L.push([Math.sin(a) * (r + 0.012), y, Math.cos(a) * (r + 0.012), Math.sin(a), 0.35, Math.cos(a), 0.03, 0.45]); } bioMesh(bioDots(L), veinM, root); }
  add(root, new THREE.CircleGeometry(0.29, 20).rotateX(-Math.PI / 2), innerM, 0, 1.0, 0);
  const hole = glowSprite(E.glow, 0.7, 0.35); hole.position.y = 1.05; root.add(hole);
  // four petals lying flush against the cone, hinged at the rim
  const petalG = smoothSlab([[0, 0.02], [0.13, -0.12], [0.17, -0.42], [0.1, -0.68], [0, -0.8], [-0.1, -0.68], [-0.17, -0.42], [-0.13, -0.12]], 0.035);
  const veinG = new THREE.BoxGeometry(0.025, 0.62, 0.02);
  const petals = [];
  for (let i = 0; i < 4; i++) {
    const az = Math.PI / 4 + i * Math.PI / 2;
    const hinge = new THREE.Group(); hinge.position.set(Math.sin(az) * 0.42, 1.13, Math.cos(az) * 0.42); hinge.rotation.y = az; root.add(hinge);
    const leaf = new THREE.Group(); hinge.add(leaf);
    add(leaf, petalG, petalM, 0, 0, 0.03);
    noOut(add(leaf, veinG, veinM, 0, -0.36, 0.055));
    petals.push(leaf);
  }
  // the vine: a chain of tapered segments that lengthen as it lashes
  const N = 14, SL = 0.32, vine = [];
  let par = new THREE.Group(); par.position.y = 0.98; root.add(par);
  const vineBase = par;
  for (let i = 0; i < N; i++) {
    const g = new THREE.Group(); g.position.y = i === 0 ? 0 : SL; par.add(g);
    const body = new THREE.Group(); g.add(body); g.userData.body = body;   // only the body stretches
    const r0 = 0.07 - i * 0.0035, r1 = r0 - 0.0035;
    add(body, taperCapsule(r0, r1, SL, 8), vineM);
    if (i % 2 === 1) { const t = add(body, new THREE.ConeGeometry(0.018, 0.07, 4), thornM, r0 * 0.9, SL * 0.5, 0); t.rotation.z = -1.2; }
    if (i % 2 === 0 && i > 1) { const t = add(body, new THREE.ConeGeometry(0.016, 0.06, 4), thornM, -r0 * 0.9, SL * 0.4, 0); t.rotation.z = 1.2; }
    vine.push(g); par = g;
  }
  // barbed, leafy tip
  const tip = new THREE.Group(); tip.position.y = SL; par.add(tip); vine.tip = tip;
  add(tip, new THREE.ConeGeometry(0.05, 0.22, 6), vineM, 0, 0.1, 0);
  for (const s of [-1, 1]) { const l = add(tip, new THREE.SphereGeometry(1, 8, 6).scale(0.08, 0.02, 0.035), petalM, s * 0.07, 0.04, 0); l.rotation.z = s * 0.6; }
  const tipGlow = glowSprite(E.glow, 0.35, 0.6); tipGlow.position.y = 0.15; tip.add(tipGlow);

  finish(root, 0.018);
  bio.sprite(tipGlow, 0.85, 0.6);
  bio.glow(0);
  return {
    root, mats: [shellM, petalM], glow: bio.glow,
    animate(dt, st) {
      const w = st.windup || 0, a = st.attack || 0, t = st.t || 0;
      const fan = Math.max(w, a);
      petals.forEach((p, i) => { p.rotation.x = -0.38 - fan * 1.75 + Math.sin(t * 1.3 + i) * 0.03; });
      // pose blend: idle (short swaying curl) → windup (coiled back) → attack (lash straight ahead)
      const wi = w * (1 - a), id = Math.max(0, 1 - wi - a);
      const len = id * 0.5 + wi * 0.8 + a * 1.3;
      vineBase.rotation.x = id * (0.15 + Math.sin(t * 0.9) * 0.1) + wi * -0.35 + a * 1.42;
      vine.forEach((g, i) => {
        const k = i / N;
        const idle = 0.12 + k * 0.25 + Math.sin(t * 1.6 - i * 0.55) * 0.1;
        const coil = -0.2 - k * 0.12;
        const lash = 0.015 + Math.sin(t * 9 - i * 0.9) * 0.05 * (1 - k * 0.5) - (i === 0 ? 0.05 : 0);
        g.rotation.x = (i === 0 ? 0 : 1) * (id * idle + wi * coil + a * lash);
        g.rotation.z = id * Math.sin(t * 0.8 - i * 0.4) * 0.06;
        g.userData.body.scale.y = len;
        if (i > 0) g.position.y = SL * len;
      });
      vine.tip.position.y = SL * len;
      hole.material.opacity = (0.3 + fan * 0.4) * (0.6 + 0.6 * bio.v);
      root.position.y = 0;
      root.scale.y = 1 + Math.sin(t * 1.2) * 0.008;
    },
    flash(v) { shellM.emissive.setRGB(v, v, v); petalM.emissive.setRGB(v, v, v); },
  };
}

/* ============================================================
   FLORA
   ============================================================ */

/* ALBALI AAGAC — the ~12 m tree the byrds come from */
export function buildAlbaliAagac(opts = {}) {
  const rnd = mulberry32(opts.seed ?? 21);
  const root = new THREE.Group();
  const barkM = mat(0x7a5a3e), leafM = mat(0xffffff, { vertexColors: true }), fruitM = mat(0xc4473b), budM = mat(0x8ab84e), stemM = mat(0x4a3424);
  const leafTop = new THREE.Color(0x6ea446), leafBot = new THREE.Color(0x3e6a30);
  // faint glow: the fruit (where the byrds sleep) and the buds twinkle at night
  const bio = bioKit();
  fruitM.emissive.set(0xff6a4a); bio.reg(fruitM, 0.0, 0.75);
  budM.emissive.set(0xb8ff6a); bio.reg(budM, 0.0, 0.8);
  // trunk with root flare
  const tp = [[1.4, 0], [1.0, 0.3], [0.78, 1.0], [0.7, 2.5], [0.66, 4.2], [0.6, 5.0], [0.0, 5.3]].map(([r, y]) => new THREE.Vector2(r, y));
  const trunkG = new THREE.LatheGeometry(new THREE.SplineCurve(tp).getSpacedPoints(24), 14);
  { const p = trunkG.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(x, z), k = 1 + 0.08 * Math.sin(a * 5 + y * 0.6) + (y < 0.6 ? 0.25 * Math.pow(Math.abs(Math.sin(a * 2.5)), 3) * (0.6 - y) / 0.6 : 0); p.setXYZ(i, x * k, y, z * k); }
    trunkG.computeVertexNormals(); }
  add(root, trunkG, barkM);
  // main limbs
  const limbs = [[0.4, 4.2, 1.0], [2.3, 4.0, 0.9], [4.2, 4.4, 0.85], [5.4, 4.1, 0.9]];
  limbs.forEach(([a, y, l]) => {
    const dx = Math.sin(a), dz = Math.cos(a);
    add(root, taperTube([[0, y, 0], [dx * 1.6 * l, y + 1.4, dz * 1.6 * l], [dx * 3.0 * l, y + 2.9, dz * 3.0 * l]], 0.36, 0.14, 10, 7), barkM);
  });
  add(root, taperTube([[0, 4.8, 0], [0.2, 6.5, -0.2], [0, 7.8, 0.1]], 0.38, 0.16, 8, 7), barkM);
  // broad round canopy of lumpy blobs
  const canopy = new THREE.Group(); root.add(canopy);
  const blobs = [[0, 8.4, 0, 3.7]];
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.3; blobs.push([Math.sin(a) * 3.9, 7.4 + rnd() * 0.8, Math.cos(a) * 3.9, 2.6 + rnd() * 0.5]); }
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 1; blobs.push([Math.sin(a) * 1.8, 10.1, Math.cos(a) * 1.8, 2.0]); }
  blobs.forEach(([x, y, z, r]) => {
    const g = blobGeo(r, rnd, 0.1).scale(1, 0.82, 1); countershade(g, leafTop, leafBot, -0.2);
    add(canopy, g, leafM, x, y, z);
  });
  // reddish fruit (and a few green buds) dotted over the canopy surface
  const fruitG = new THREE.SphereGeometry(0.28, 10, 8), budG = new THREE.SphereGeometry(0.12, 8, 6).scale(0.8, 1.2, 0.8);
  const fstemG = new THREE.CylinderGeometry(0.02, 0.025, 0.2, 4);
  for (let i = 0; i < 46; i++) {
    const [x, y, z, r] = blobs[1 + (i % 7)];
    const a = rnd() * TAU, e = (rnd() - 0.45) * 1.3;
    const d = V3(Math.cos(e) * Math.sin(a), Math.sin(e) * 0.82, Math.cos(e) * Math.cos(a));
    const ok = i % 6 !== 5;
    const f = add(canopy, ok ? fruitG : budG, ok ? fruitM : budM, x + d.x * r * 1.04, y + d.y * r * 1.04 - 0.15, z + d.z * r * 1.04);
    if (ok) add(f, fstemG, stemM, 0, 0.32, 0);
  }

  finish(root, 0.05);
  bio.glow(0);
  return {
    root, mats: [leafM, barkM], glow: bio.glow,
    animate(dt, st) {
      const t = st.t || 0;
      canopy.rotation.z = Math.sin(t * 0.6) * 0.008; canopy.rotation.x = Math.sin(t * 0.47 + 1) * 0.006;
    },
    flash(v) { leafM.emissive.setRGB(v, v, v); },
  };
}

/* ALBALI BUD — small green bud (~0.15 m) */
export function buildAlbaliBud(opts = {}) {
  const root = noSolid(new THREE.Group());   // it moves, and sees to its own bumps
  const budM = mat(opts.color ?? 0x86b84a), sepM = mat(0x4f7f2f), stemM = mat(0x5a4a2a);
  const sway = new THREE.Group(); root.add(sway);
  add(sway, new THREE.CylinderGeometry(0.008, 0.012, 0.04, 6), stemM, 0, 0.02, 0);
  const bp = [[0.001, 0], [0.03, 0.01], [0.045, 0.035], [0.042, 0.07], [0.028, 0.1], [0.01, 0.125], [0.0, 0.135]].map(([r, y]) => new THREE.Vector2(r, y));
  const budG = new THREE.LatheGeometry(new THREE.SplineCurve(bp).getSpacedPoints(16), 12);
  { const p = budG.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(x, z), k = 1 - 0.08 * Math.pow(Math.abs(Math.cos(a * 2.5)), 6); p.setX(i, x * k); p.setZ(i, z * k); }
    budG.computeVertexNormals(); }
  add(sway, budG, budM, 0, 0.035, 0);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU, s = add(sway, new THREE.ConeGeometry(0.02, 0.075, 4).scale(1, 1, 0.4), sepM, Math.sin(a) * 0.038, 0.07, Math.cos(a) * 0.038);
    s.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35); s.rotation.y = a;
  }
  const leaf = add(sway, new THREE.SphereGeometry(1, 8, 6).scale(0.03, 0.006, 0.06), sepM, 0.035, 0.022, 0); leaf.rotation.set(0, 0.8, -0.3);
  // faint glow: a bright tip and five seams of light up the bud
  const bio = bioKit(), seamM = bio.mat(0xc8ff7a, 0x86b84a, 0.15, 0.03, 1.6);
  { const L = [[0, 0.17, 0, 0, 1, 0, 0.012, 0.8]]; for (let i = 0; i < 5; i++) { const a = (i + 0.5) / 5 * TAU; for (const [y, r] of [[0.11, 0.043], [0.14, 0.03]]) L.push([Math.sin(a) * r, y, Math.cos(a) * r, Math.sin(a), 0.3, Math.cos(a), 0.006, 0.5]); } bioMesh(bioDots(L), seamM, sway); }
  finish(root, 0.004);
  bio.glow(0);
  return {
    root, mats: [budM], glow: bio.glow,
    animate(dt, st) { sway.rotation.z = Math.sin((st.t || 0) * 1.3) * 0.05; },
    flash(v) { budM.emissive.setRGB(v, v, v); },
  };
}

/* ALBALI FRUIT — round, reddish, a stem, two lines down from the top (~0.3 m) */
export function buildAlbaliFruit(opts = {}) {
  const root = noSolid(new THREE.Group());   // it moves, and sees to its own bumps
  const R = 0.15;
  const fruitM = mat(opts.color ?? 0xc8463c), stemM = mat(0x5a3e24), leafM = mat(0x5f9a3e);
  // faint glow: the two lines down from the top shine warm at night (a byrd stirring)
  const bio = bioKit();
  const lineM = bio.reg(mat(0x7a1f22, { emissive: 0xffa06a }), 0.0, 1.4);
  const body = new THREE.Group(); body.position.y = R * 0.92; root.add(body);
  const fg = new THREE.SphereGeometry(R, 22, 16); fg.scale(1, 0.92, 1);
  { const p = fg.attributes.position; // a soft dimple at the top where the stem sits
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / (R * 0.92); if (y > 0.85) p.setY(i, p.getY(i) - (y - 0.85) * 0.12); }
    fg.computeVertexNormals(); }
  add(body, fg, fruitM);
  // the two lines coming down from the top
  for (const az of [-0.55, 0.55]) {
    const g = new THREE.Group(); g.rotation.y = az - Math.PI / 2; body.add(g);
    const tor = new THREE.TorusGeometry(R * 1.0, 0.009, 5, 20, Math.PI / 2 + 0.15); tor.scale(1, 0.92, 1);
    const l = add(g, tor, lineM); l.rotation.z = -0.15;
    void l;
  }
  const stem = add(body, taperTube([[0, R * 0.75, 0], [0.005, R + 0.04, 0], [0.03, R + 0.08, 0.01]], 0.013, 0.008, 6, 5), stemM);
  void stem;
  const leaf = add(body, new THREE.SphereGeometry(1, 10, 6).scale(0.055, 0.008, 0.025), leafM, -0.04, R * 0.95 + 0.02, 0); leaf.rotation.set(0, 0.3, 0.35);
  finish(root, 0.005);
  bio.glow(0);
  return {
    root, mats: [fruitM], glow: bio.glow,
    animate(dt, st) { body.rotation.z = Math.sin((st.t || 0) * 0.9) * 0.015; },
    flash(v) { fruitM.emissive.setRGB(v, v, v); },
  };
}

/* JU FIELD — soil bed (~1.2 m) with seven carrots */
export function buildJuField(opts = {}) {
  const rnd = mulberry32(opts.seed ?? 5);
  const root = new THREE.Group();
  const soilM = mat(0x5a3d26), soilD = mat(0x3e2a1a), carrotM = mat(0xe8782a), leafM = mat(0x4f9a38), leafM2 = mat(0x6ab84a);
  const bed = blobGeo(0.62, rnd, 0.05, 20, 10); bed.scale(1, 0.2, 0.9);
  add(root, bed, soilM, 0, 0, 0);
  for (let i = 0; i < 6; i++) { const c = add(root, craggy(0.05, rnd, 0.3, 0), soilD, (rnd() - 0.5) * 1.0, 0.07, (rnd() - 0.5) * 0.8); c.scale.y = 0.5; }
  const shoulderG = new THREE.SphereGeometry(0.06, 10, 6, 0, TAU, 0, Math.PI * 0.6).scale(1, 1.5, 1);
  const moundG = new THREE.SphereGeometry(0.07, 10, 6, 0, TAU, 0, Math.PI / 2).scale(1, 0.35, 1);
  const frondG = new THREE.ConeGeometry(0.03, 0.3, 4).translate(0, 0.15, 0).scale(1, 1, 0.3);
  const spots = [[0, 0], [0.3, 0.12], [-0.3, 0.14], [0.16, -0.25], [-0.18, -0.24], [0.4, -0.18], [-0.42, -0.08]];
  const tufts = [];
  // faint glow: a ring of tiny lights round each carrot's shoulder
  const bio = bioKit(), juM = bio.mat(0xffc86a, 0xe8782a, 0.3, 0.0, 2.4), juDots = [];
  spots.forEach(([x, z], i) => {
    const y = 0.115 * Math.sqrt(Math.max(0, 1 - (x / 0.62) ** 2 - (z / 0.56) ** 2)) - 0.005;
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rnd() * TAU; root.add(g);
    add(g, moundG, soilD, 0, 0.0, 0);
    add(g, shoulderG, carrotM, 0, 0.0, 0);
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + i; juDots.push([x + Math.sin(a) * 0.05, y + 0.05, z + Math.cos(a) * 0.05, Math.sin(a), 0.6, Math.cos(a), 0.012, 0.6]); }
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * TAU, f = add(g, frondG, k % 2 ? leafM : leafM2, 0, 0.04, 0);
      f.rotation.set(Math.cos(a) * 0.4, a, Math.sin(a) * 0.4); f.scale.setScalar(0.85 + rnd() * 0.4);
    }
    tufts.push({ g, ph: i });
  });
  bioMesh(bioDots(juDots), juM, root);
  finish(root, 0.006);
  bio.glow(0);
  return {
    root, mats: [soilM, carrotM], glow: bio.glow,
    animate(dt, st) { const t = st.t || 0; tufts.forEach(tf => { tf.g.rotation.z = Math.sin(t * 1.4 + tf.ph) * 0.05; }); },
    flash(v) { carrotM.emissive.setRGB(v, v, v); },
  };
}

/* SPRENGJU — a carrot woken by the Relic: hovers, spins, sparks, swells to burst */
export function buildSprengju(opts = {}) {
  const root = noSolid(new THREE.Group());   // it moves, and sees to its own bumps
  const carrotM = mat(0xec7a28), leafM = mat(0x55a83c), leafM2 = mat(0x3f8a2e);
  const crackM = new THREE.MeshBasicMaterial({ color: 0xffc84a });
  const hover = new THREE.Group(); hover.position.y = 1.0; root.add(hover);   // tilt toward the target
  const spin = new THREE.Group(); hover.add(spin);                             // spins about its axis
  const swell = new THREE.Group(); spin.add(swell);
  const cp = [[0.0, -0.3], [0.02, -0.25], [0.05, -0.1], [0.07, 0.04], [0.075, 0.1], [0.06, 0.13], [0.0, 0.14]].map(([r, y]) => new THREE.Vector2(r, y));
  const cg = new THREE.LatheGeometry(new THREE.SplineCurve(cp).getSpacedPoints(30), 14);
  { const p = cg.attributes.position;  // carrot rings
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 - 0.07 * Math.pow(Math.max(0, Math.sin(y * 70)), 10); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
    cg.computeVertexNormals(); }
  add(swell, cg, carrotM);
  // glowing relic cracks spiralling round it
  const rOf = y => { const D = cp.map(v => [v.y, v.x]); return profR(D, y); };
  for (let k = 0; k < 2; k++) {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const y = -0.22 + i * 0.028, a = k * Math.PI + i * 0.7, r = rOf(y) + 0.002; pts.push(V3(Math.sin(a) * r, y, Math.cos(a) * r)); }
    noOut(add(swell, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.006, 4), crackM));
  }
  // leafy fronds
  const frondG = new THREE.ConeGeometry(0.025, 0.24, 4).translate(0, 0.12, 0).scale(1, 1, 0.35);
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * TAU, f = add(swell, frondG, k % 2 ? leafM : leafM2, 0, 0.12, 0);
    f.rotation.set(Math.cos(a) * 0.35, a, Math.sin(a) * 0.35);
  }
  const core = glowSprite(0xffa040, 0.5, 0.35); swell.add(core);
  const sparks = [];
  for (let i = 0; i < 7; i++) { const s = glowSprite(i % 2 ? 0xffe070 : 0xff7a2a, 0.07, 1); hover.add(s); sparks.push({ s, ph: i / 7 * TAU, r: 0.13 + (i % 3) * 0.03, y: -0.2 + (i % 4) * 0.1 }); }
  finish(root, 0.006);
  let rot = 0, night = 0;
  return {
    root, mats: [carrotM],
    /* the relic-cracks and sparks burn brighter in the dark */
    glow(v) { night = Math.max(0, Math.min(1, v)); },
    animate(dt, st) {
      const sp = st.speed || 0, w = st.windup || 0, a = st.attack || 0, t = st.t || 0;
      rot += dt * (4 + sp * 2 + a * 10);
      spin.rotation.y = rot;
      hover.position.y = 1.0 + Math.sin(t * 3) * 0.06;
      hover.rotation.x = -Math.min(1.35, sp * 0.25 + w * 0.6 + a * 1.2);  // point-first toward +z
      // swell as if about to burst
      const sw = 1 + a * 0.55 + w * 0.15, jit = a * 0.04 * Math.sin(t * 60);
      swell.scale.set(sw + jit, 1 + a * 0.25 - jit, sw + jit);
      const nk = 0.7 + 0.3 * night;
      crackM.color.setRGB(nk, (0.7 + a * 0.3) * nk, (0.25 + a * 0.6) * nk);
      core.material.opacity = (0.3 + a * 0.3 + Math.sin(t * 15) * 0.05) * (0.8 + 0.7 * night);
      core.scale.setScalar(0.5 + a * 0.25);
      carrotM.emissive.setRGB(a * 0.45, a * 0.2, 0);
      sparks.forEach((s, i) => {
        const ang = t * 5 + s.ph;
        s.s.position.set(Math.cos(ang) * s.r * sw, s.y + Math.sin(t * 7 + i) * 0.03, Math.sin(ang) * s.r * sw);
        s.s.material.opacity = Math.max(0, Math.sin(t * 13 + i * 2.1)) * (0.7 + a * 0.3) * (0.75 + 0.25 * night);
      });
    },
    flash(v) { carrotM.emissive.setRGB(v, v * 0.8, v * 0.6); },
  };
}

/* SPRENGJU RELIC SHAVING — floating grey crystal shard with glowing runes (~0.3 m) */
let RUNE_TEX = null;
function runeTexture() {
  if (RUNE_TEX) return RUNE_TEX;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 128);
  const r = mulberry32(99), cols = ['#ff3a2a', '#ff8a1a', '#ffd23a'];
  g.lineCap = 'round';
  // flowing lines
  for (let i = 0; i < 5; i++) {
    g.strokeStyle = cols[i % 3]; g.lineWidth = 5; g.beginPath();
    let x = 0, y = 15 + i * 24; g.moveTo(x, y);
    while (x < 256) { x += 16 + r() * 20; y += (r() - 0.5) * 22; g.lineTo(x, y); }
    g.stroke();
  }
  // runes
  for (let i = 0; i < 10; i++) {
    const cx = 14 + r() * 228, cy = 14 + r() * 100, s = 9 + r() * 6;
    g.strokeStyle = cols[Math.floor(r() * 3)]; g.lineWidth = 4; g.beginPath();
    g.moveTo(cx - s, cy - s); g.lineTo(cx, cy + s); g.lineTo(cx + s, cy - s);
    if (r() < 0.5) { g.moveTo(cx - s, cy); g.lineTo(cx + s, cy); } else { g.moveTo(cx, cy - s); g.lineTo(cx, cy + s * 0.3); }
    if (r() < 0.4) { g.moveTo(cx + s * 0.6, cy + s); g.arc(cx, cy + s, s * 0.6, 0, Math.PI); }
    g.stroke();
  }
  RUNE_TEX = new THREE.CanvasTexture(c); RUNE_TEX.colorSpace = THREE.SRGBColorSpace;
  RUNE_TEX.wrapS = RUNE_TEX.wrapT = THREE.RepeatWrapping;
  return RUNE_TEX;
}
export function buildSprengjuShaving(opts = {}) {
  const root = noSolid(new THREE.Group());   // it moves, and sees to its own bumps
  const tex = runeTexture();
  const crysM = toon(0x75777d, { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.0 });
  const float = new THREE.Group(); float.position.y = 0.8; root.add(float);
  const shard = new THREE.Group(); float.add(shard);
  // hexagonal body with two uneven points (UVs wrap the runes around it)
  const midG = new THREE.CylinderGeometry(0.055, 0.07, 0.17, 6, 1);
  const topG = new THREE.ConeGeometry(0.055, 0.12, 6).translate(0, 0.145, 0);
  const botG = new THREE.ConeGeometry(0.07, 0.08, 6).rotateX(Math.PI).translate(0, -0.125, 0);
  add(shard, midG, crysM); add(shard, topG, crysM); add(shard, botG, crysM);
  shard.rotation.z = 0.35; shard.scale.set(1.25, 1.25, 0.8);
  const chips = [];
  for (let i = 0; i < 3; i++) {
    const c = add(float, new THREE.OctahedronGeometry(0.022, 0), crysM); c.scale.set(0.7, 1.4, 0.7); chips.push({ c, ph: i / 3 * TAU });
  }
  const glow = glowSprite(0xff8a2a, 0.55, 0.45); float.add(glow);
  finish(root, 0.004);
  let night = 0;
  return {
    root, mats: [crysM],
    glow(v) { night = Math.max(0, Math.min(1, v)); },
    animate(dt, st) {
      const t = st.t || 0;
      float.position.y = 0.8 + Math.sin(t * 1.6) * 0.05;
      shard.rotation.y = t * 0.6;
      crysM.emissiveIntensity = (0.75 + Math.sin(t * 2.4) * 0.25) * (0.85 + 0.4 * night);
      glow.material.opacity = (0.35 + Math.sin(t * 2.4) * 0.12) * (0.8 + 0.6 * night);
      chips.forEach((c, i) => { const a = t * 0.9 + c.ph; c.c.position.set(Math.cos(a) * 0.17, Math.sin(t * 2 + i) * 0.05, Math.sin(a) * 0.17); c.c.rotation.y = t * 2; });
    },
    flash(v) { crysM.color.setRGB(0.55 + v * 0.45, 0.56 + v * 0.44, 0.58 + v * 0.42); },
  };
}

/* SKITH GRASS — tuft of green blades with white tips (~0.5 m) */
export function buildSkithGrass(opts = {}) {
  const rnd = mulberry32(opts.seed ?? 13);
  const root = noSolid(new THREE.Group());   // it moves, and sees to its own bumps
  const bladeM = mat(0xffffff, { vertexColors: true });
  const g = new THREE.ConeGeometry(0.034, 0.5, 3, 6).translate(0, 0.25, 0).scale(1, 1, 0.35);
  { const p = g.attributes.position, cols = new Float32Array(p.count * 3), green = new THREE.Color(0x4f9a36), dark = new THREE.Color(0x2f6a28), white = new THREE.Color(0xf4f6ee), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), u = y / 0.5;
      p.setZ(i, p.getZ(i) + u * u * 0.12);                       // bend
      if (u > 0.68) c.copy(white); else c.copy(dark).lerp(green, u / 0.68);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals(); }
  const blades = [];
  for (let i = 0; i < 15; i++) {
    const a = rnd() * TAU, r = rnd() * 0.07;
    const b = add(root, g, bladeM, Math.sin(a) * r, 0, Math.cos(a) * r);
    b.rotation.set(-(0.05 + rnd() * 0.2), a, 0);
    b.scale.setScalar(0.65 + rnd() * 0.45);
    blades.push({ b, rx: b.rotation.x, ph: rnd() * 6 });
  }
  finish(root, 0.003);
  return {
    root, mats: [bladeM],
    glow() {},   // just grass: no light of its own
    animate(dt, st) { const t = st.t || 0; blades.forEach(bl => { bl.b.rotation.x = bl.rx + Math.sin(t * 1.8 + bl.ph) * 0.06; }); },
    flash(v) { bladeM.emissive.setRGB(v, v, v); },
  };
}

/* MEGLA AAGAC — a single giant dark tree (~20 m); scenery, no face */
export function buildMeglaAagac(opts = {}) {
  const rnd = mulberry32(opts.seed ?? 77);
  const root = new THREE.Group();
  const woodM = mat(0x3b2d22), woodD = mat(0x2a2019), leafM = mat(0xffffff, { vertexColors: true });
  const leafTop = new THREE.Color(0x2c3a2c), leafBot = new THREE.Color(0x141b16);
  // massive gnarled trunk
  const tp = [[3.0, 0], [2.0, 0.6], [1.55, 2.0], [1.35, 5], [1.25, 8], [1.05, 10.5], [0.6, 12], [0, 12.4]].map(([r, y]) => new THREE.Vector2(r, y));
  const trunkG = new THREE.LatheGeometry(new THREE.SplineCurve(tp).getSpacedPoints(36), 18);
  { const p = trunkG.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(x, z);
      const k = 1 + 0.14 * Math.sin(a * 5 + y * 0.35) + 0.06 * Math.sin(a * 11 - y * 0.9);
      const tw = y * 0.04, ca = Math.cos(tw), sa = Math.sin(tw);
      p.setXYZ(i, (x * ca - z * sa) * k, y, (x * sa + z * ca) * k);
    }
    trunkG.computeVertexNormals(); }
  add(root, trunkG, woodM);
  // roots spreading over the ground
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU + rnd() * 0.3, L = 3.5 + rnd() * 2.0;
    add(root, taperTube([[Math.sin(a) * 1.2, 1.4, Math.cos(a) * 1.2], [Math.sin(a) * (L * 0.5), 0.45, Math.cos(a) * (L * 0.5)], [Math.sin(a + 0.2) * L, 0.05, Math.cos(a + 0.2) * L]], 0.75, 0.08, 10, 6), woodD);
  }
  // twisted limbs
  const tips = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + 0.4, y0 = 8 + rnd() * 3, L = 5 + rnd() * 2;
    const p = [[0, y0, 0], [Math.sin(a) * L * 0.4, y0 + 1.8, Math.cos(a) * L * 0.4], [Math.sin(a + 0.4) * L * 0.75, y0 + 3.2, Math.cos(a + 0.4) * L * 0.75], [Math.sin(a + 0.25) * L, y0 + 4.6, Math.cos(a + 0.25) * L]];
    add(root, taperTube(p, 0.65, 0.12, 14, 7), woodM);
    tips.push(p[3]);
  }
  // dark canopy masses
  const canopy = new THREE.Group(); root.add(canopy);
  const blobs = [[0, 16.5, 0, 4.8]];
  tips.forEach(([x, y, z]) => blobs.push([x * 1.15, y + 0.4, z * 1.15, 3.2 + rnd() * 0.8]));
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.8; blobs.push([Math.sin(a) * 3, 18.4, Math.cos(a) * 3, 2.4]); }
  blobs.forEach(([x, y, z, r]) => { const g = blobGeo(r, rnd, 0.14).scale(1, 0.75, 1); countershade(g, leafTop, leafBot, -0.15); add(canopy, g, leafM, x, y, z); });
  // a little light: pale fungus-lamps scattered over the trunk and roots
  const bio = bioKit(), fungM = bio.mat(0xa8b8ff, 0x3b2d22, 0.25, 0.0, 2.0);
  {
    const p = trunkG.attributes.position, nm = trunkG.attributes.normal, L = [];
    for (let i = 0; i < p.count && L.length < 40; i += 7) {
      const y = p.getY(i); if (y > 7 || y < 0.3 || rnd() < 0.55) continue;
      const k = 0.1 + rnd() * 0.1; L.push([p.getX(i), y, p.getZ(i), nm.getX(i), nm.getY(i), nm.getZ(i), k, 0.5]);
    }
    bioMesh(bioDots(L), fungM, root);
  }
  // the faint dark aura
  const aura = [];
  [[0, 6, 0, 13, 0.22], [0, 15, 0, 22, 0.18], [4, 10, 3, 9, 0.12], [-4, 11, -3, 9, 0.12]].forEach(([x, y, z, s, o]) => {
    const d = darkSprite(0x0a0810, s, o); d.position.set(x, y, z); root.add(d); aura.push({ d, o, ph: x + y });
  });
  const wisps = [];
  for (let i = 0; i < 8; i++) { const d = darkSprite(0x120e18, 4.5, 0.12); root.add(d); wisps.push({ d, a: i / 8 * TAU, r: 5 + rnd() * 4, y: 2 + rnd() * 14 }); }
  finish(root, 0.08);
  bio.glow(0);
  return {
    root, mats: [woodM, leafM], glow: bio.glow,
    animate(dt, st) {
      const t = st.t || 0;
      canopy.rotation.z = Math.sin(t * 0.35) * 0.005;
      aura.forEach(a => { a.d.material.opacity = a.o * (0.8 + 0.2 * Math.sin(t * 0.5 + a.ph)); });
      wisps.forEach((w, i) => { const a = w.a + t * 0.05; w.d.position.set(Math.cos(a) * w.r, w.y + Math.sin(t * 0.3 + i) * 0.8, Math.sin(a) * w.r); });
    },
    flash(v) { woodM.emissive.setRGB(v, v, v); },
  };
}
