/* ============================================================
   ESIK OF THE SKY — the flying creatures of the Mbaru Tatu,
   built from the creator's answers (see the Esik model brief).

   ALBALI BYRD  — a very round ball of pale cream feathers that
                  falls from the Albali tree's fruit. Wide wings,
                  tiny legs, and ONE retractable bone-white horn
                  coated in a glossy healing film. The horn sinks
                  into its feathers when calm and slides out to
                  strike. Villtur (feral) birds are dull grey-brown;
                  on Leotik the film has turned toxic green.
   KUNI BYRD    — an absolutely massive raptor shaped like an
                  airplane: streamlined fuselage, long straight
                  wings (~7 m span), a tailplane tail. Rarely lands;
                  glides ~3 m up and dives talons-first.
   TYNDAEL      — a creature made entirely of flame: a round
                  hovering core of layered flame tongues, flame
                  wings, a flame crown, dangling flame legs and two
                  dark eyes. Everything flickers.
   LUTUT        — a Prince Rupert's drop given wings: the round
                  front end IS the face, a circular lamprey mouth
                  ringed with teeth, eyes above it; the body thins
                  into a whip tail ending in a spiked ball. Massive
                  bat wings (~12 m), four legs, grey-violet stony
                  skin carved with patterns that deepen with age.
   RUBBERMCFLY  — a round fluffy baby chick (~10 cm) with a tiny
                  golden beak and two pairs of butterfly wings
                  running pink -> violet -> cyan. Hovers.
   MAKARI       — 2-3 cm floaters: a teardrop with three petal
                  bumps on each side and a long hair-thin stem.
                  They drift in swarms of one or many colours.

   Contract: buildX(opts) -> { root, animate(dt, st), flash(v), mats }
   metres, facing +z, above y = 0. Every builder also accepts
   opts.scale (uniform root scale, default 1) and opts.seed.
   ============================================================ */
import * as THREE from 'three';
import { toon, ramp, glowSprite, outlineAll } from './gfx.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

/* ---------------- shared helpers ---------------- */
const mat = (c, o = {}) => toon(c, Object.assign({ emissive: 0x000000 }, o));

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function finish(root, thick = 0.03) {
  outlineAll(root, thick);
  root.traverse(m => { if (m.isMesh && m.name !== 'outline' && !(m.material && m.material.transparent)) m.castShadow = true; });
}
const noOut = o => { o.userData.noOutline = true; return o; };
const damp = (cur, target, k, dt) => cur + (target - cur) * Math.min(1, k * dt);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => Math.max(0, Math.min(1, v));

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

/* compose a matrix from position / euler / scale */
function M4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
}

/* merge [geometry, matrix] pairs into one geometry (position + normal) */
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

/* a tapered cylinder geometry from point a to point b */
function strutGeo(a, b, r0, r1, seg = 6) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1)));
  return g;
}

/* a thin horizontal slab from a 2D shape given in (x, z) — x outward, z forward */
function slabGeo(shape, depth = 0.03, curveSegments = 6) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments });
  g.translate(0, 0, -depth / 2);
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/* feather-scalloped trailing edge: walk from (x0,z0) to (x1,z1) with n rounded tips sticking back by `dip` */
function scallop(sh, x0, z0, x1, z1, n, dip) {
  for (let i = 0; i < n; i++) {
    const a = i / n, b = (i + 1) / n, m = (a + b) / 2;
    sh.quadraticCurveTo(lerp(x0, x1, m), lerp(z0, z1, m) - dip * 2, lerp(x0, x1, b), lerp(z0, z1, b));
  }
}

/* a teardrop / flame-tongue lathe: round base at y=0, pointed tip at y=h, optional lean of the tip along +x */
function flameGeo(h, w, lean = 0, seg = 8) {
  const pts = [];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const r = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.9) * Math.pow(1 - t, 0.35);
    pts.push(new THREE.Vector2(Math.max(r * w * 1.2, 0.0001), t * h));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = p.getY(i) / h; p.setX(i, p.getX(i) + lean * h * t * t); }
  g.computeVertexNormals();
  return g;
}

/* a little bird / beast foot: `toes` forward toes + one back toe, with claws */
function footGroup(len, r, toeMat, clawMat, toes = 3, spread = 0.45) {
  const g = new THREE.Group();
  const tp = [], cp = [];
  const o = new THREE.Vector3();
  for (let i = 0; i <= toes; i++) {
    const back = i === toes;
    const a = back ? Math.PI : (i - (toes - 1) / 2) * spread;
    const L = back ? len * 0.6 : len;
    const tip = new THREE.Vector3(Math.sin(a) * L, -r * 0.6, Math.cos(a) * L);
    tp.push([strutGeo(o, tip, r, r * 0.7, 5), null]);
    const ct = tip.clone().add(new THREE.Vector3(Math.sin(a) * r * 2.2, -r * 1.4, Math.cos(a) * r * 2.2));
    cp.push([strutGeo(tip, ct, r * 0.7, r * 0.05, 4), null]);
  }
  g.add(new THREE.Mesh(mergeGeos(tp), toeMat));
  g.add(new THREE.Mesh(mergeGeos(cp), clawMat));
  return g;
}

function applyScale(root, opts) { if (opts.scale && opts.scale !== 1) root.scale.setScalar(opts.scale); }

/* =================================================================
   ALBALI BYRD — ~0.9 m tall ball of feathers, ~2.1 m wingspan.
   opts: villtur (feral, dull grey-brown), toxic (green film),
         seed (slight plumage variation), color (override), scale.
   st: speed > 2 or diving -> flies; windup/attack/diving -> horn out.
   ================================================================= */
export function buildAlbaliByrd(opts = {}) {
  const feral = !!opts.villtur, toxic = !!opts.toxic;
  const rnd = mulberry32(opts.seed ?? 7);
  const base = new THREE.Color(opts.color ?? (feral ? 0x8e8170 : 0xf4ecd8));
  if (opts.seed != null) base.offsetHSL((rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.08);
  const root = new THREE.Group();
  const plume = mat(base);
  const bellyM = mat(base.clone().lerp(new THREE.Color(0xffffff), feral ? 0.18 : 0.45));
  const wingM = mat(base.clone().multiplyScalar(feral ? 0.85 : 0.93));
  const tipM = mat(feral ? 0x5a4f42 : 0xd6c6a6);
  const beakM = mat(feral ? 0xb88a48 : 0xeaa846), legM = mat(feral ? 0xa87a40 : 0xe39a3c), clawM = mat(0x3a2a20);
  const boneM = mat(0xf8f3e6);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x1a1210 }), hiM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const filmM = new THREE.MeshPhongMaterial({
    color: toxic ? 0x7dff3a : 0xfff6e0, emissive: toxic ? 0x2f9a10 : 0x3a3020, specular: 0xffffff, shininess: 160,
    transparent: true, opacity: toxic ? 0.45 : 0.38, depthWrite: false,
  });

  // bioluminescence: pearly freckles round the horn collar and under the eyes, dots
  // along the wing-hand's trailing feathers, and a healing film that softly shines
  const bio = bioKit();
  const pearlC = toxic ? 0x8aff4a : feral ? 0xd8c890 : 0xfff0b0;
  const pearl = bio.mat(pearlC, base, 0.3, 0.08, feral ? 1.1 : 1.6);
  bio.reg(filmM, 1.0, toxic ? 3.5 : 3.0);
  const R = 0.38;                                   // the ball
  const body = new THREE.Group(); body.position.y = 0.48; root.add(body);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 20, 16), plume); ball.scale.set(1, 0.97, 1); body.add(ball);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(R * 0.78, 16, 12), bellyM);
  belly.scale.set(0.95, 0.9, 0.55); belly.position.set(0, -0.08, R * 0.6); body.add(belly);
  // a few feather tufts give the ball texture: cheeks, crown curl and a tail puff
  const tuftG = mergeGeos([
    [new THREE.SphereGeometry(0.07, 8, 6), M4(-0.27, -0.02, 0.22, 0, 0, 0, 1, 0.8, 0.8)],
    [new THREE.SphereGeometry(0.07, 8, 6), M4(0.27, -0.02, 0.22, 0, 0, 0, 1, 0.8, 0.8)],
    [new THREE.ConeGeometry(0.05, 0.16, 6), M4(0, 0.38, -0.12, -0.9, 0, 0)],
    [new THREE.ConeGeometry(0.04, 0.12, 6), M4(0.06, 0.36, -0.18, -1.1, 0, -0.4)],
  ]);
  body.add(new THREE.Mesh(tuftG, plume));
  const tailG = mergeGeos([-0.5, 0, 0.5].map(a => [new THREE.SphereGeometry(0.12, 8, 6), M4(Math.sin(a) * 0.1, 0.08 + Math.cos(a) * 0.04, -R - 0.06, -0.5, a, 0, 0.55, 0.25, 1.1)]));
  const tail = new THREE.Mesh(tailG, tipM); body.add(tail);

  // face: big dark eyes with a highlight, small beak
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.15, 0.09, R * 0.9); e.rotation.y = s * 0.35; body.add(e);
    e.add(noOut(new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), eyeM)));
    const h = noOut(new THREE.Mesh(new THREE.SphereGeometry(0.017, 6, 4), hiM)); h.position.set(0.015 * s, 0.02, 0.045); e.add(h);
    eyes.push(e);
  }
  {
    const L = [];
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; L.push([Math.sin(a) * 0.35, 0.93, 0.35 + Math.cos(a) * 0.3, 0.032]); }
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) L.push([sd * (0.3 + k * 0.08), 0.05 - k * 0.05, 0.92 - k * 0.04, 0.02]);
    bioMesh(bioDots(L, R, R, R), pearl, ball).scale.setScalar(R);   // ball geometry is in metres
  }
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 7), beakM);
  beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.03, R + 0.04); beak.scale.set(1, 1, 0.7); body.add(beak);

  // THE horn — one bone-white spike in a glossy film; it slides out of a feather collar
  const hornG = new THREE.Group(); hornG.position.set(0, 0.29, 0.22); hornG.rotation.x = 0.55; body.add(hornG);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.028, 6, 14), plume); collar.rotation.x = Math.PI / 2; hornG.add(collar);
  const hornS = new THREE.Group(); hornG.add(hornS);
  const hornPts = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; hornPts.push(new THREE.Vector2(0.058 * Math.pow(1 - t, 0.9) + 0.002, t * 0.44)); }
  const hornGeo = new THREE.LatheGeometry(hornPts, 10);
  { const p = hornGeo.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getY(i) / 0.44; p.setZ(i, p.getZ(i) + 0.06 * t * t); } hornGeo.computeVertexNormals(); }
  hornS.add(new THREE.Mesh(hornGeo, boneM));
  const film = noOut(new THREE.Mesh(hornGeo, filmM)); film.scale.set(1.28, 1.04, 1.28); film.position.y = -0.005; hornS.add(film);
  const hornGlow = glowSprite(toxic ? 0x8aff4a : 0xfff0c8, 0.22, 0); hornGlow.position.set(0, 0.44, 0.06); hornG.add(hornGlow);

  // wide wings: inner arm panel + outer hand that folds back over it
  const innerSh = new THREE.Shape();
  innerSh.moveTo(0, 0.13); innerSh.lineTo(0.42, 0.15); innerSh.lineTo(0.42, -0.2); scallop(innerSh, 0.42, -0.2, 0, -0.18, 5, 0.025); innerSh.lineTo(0, 0.13);
  const outerSh = new THREE.Shape();
  outerSh.moveTo(0, 0.15); outerSh.quadraticCurveTo(0.38, 0.17, 0.6, 0.02);
  [[0.48, -0.06], [0.44, -0.16], [0.33, -0.15], [0.3, -0.25], [0.18, -0.2], [0.14, -0.27], [0.0, -0.2]].forEach(([x, z], i) => {
    if (i % 2 === 0) outerSh.quadraticCurveTo(x + 0.06, z - 0.03, x, z); else outerSh.lineTo(x, z);
  });
  outerSh.lineTo(0, 0.15);
  const innerGeo = slabGeo(innerSh, 0.025), outerGeo = slabGeo(outerSh, 0.025);
  const wings = [];
  const wingDots = bioDots([[0.5, -0.03], [0.42, -0.12], [0.32, -0.17], [0.22, -0.18], [0.12, -0.19]].flatMap(([x, z]) => [[x, 0.014, z, 0, 1, 0, 0.022, 0.4], [x, -0.014, z, 0, -1, 0, 0.022, 0.4]]));
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(s * 0.355, 0.1, 0.0); shoulder.scale.x = s; body.add(shoulder);
    const arm = new THREE.Group(); arm.rotation.order = 'YXZ'; shoulder.add(arm);
    arm.add(new THREE.Mesh(innerGeo, wingM));
    const hand = new THREE.Group(); hand.position.set(0.4, -0.016, 0); arm.add(hand);
    hand.add(new THREE.Mesh(outerGeo, tipM));
    bioMesh(wingDots, pearl, hand);
    wings.push({ arm, hand });
  }

  // tiny legs
  const legs = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(s * 0.12, -R + 0.04, 0.04); body.add(l);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.12, 6), legM); shin.position.y = -0.05; l.add(shin);
    const f = footGroup(0.07, 0.014, legM, clawM); f.position.y = -0.1; l.add(f);
    legs.push(l);
  }

  finish(root, 0.018);
  applyScale(root, opts);
  bio.glow(0);
  let ph = 0, hop = 0, fly = 0, ext = 0, lunge = 0;
  return {
    root, mats: [plume, wingM], glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, wu = st.windup || 0, at = st.attack || 0;
      const flying = sp > 2 || !!st.diving || !!st.airborne;   // hovering in place still needs wings
      const hover = flying && !st.diving && sp < 3;
      fly = damp(fly, flying ? 1 : 0, 5, dt);
      ext = damp(ext, Math.max(wu, at, st.diving ? 1 : 0) > 0.05 ? 1 : 0, 12, dt);
      // horn: a nub in the collar when calm, full spike when threatened
      hornS.scale.set(1, 0.1 + 0.9 * ext, 1);
      hornGlow.material.opacity = ext * 0.55;
      // body height: hopping on the ground or flying
      if (!flying && sp > 0.1) { hop += dt * (5 + sp * 3); } else hop = damp(hop, Math.round(hop / Math.PI) * Math.PI, 8, dt);
      const hopH = Math.abs(Math.sin(hop)) * 0.14 * Math.min(1, sp + 0.3) * (1 - fly);
      const squash = 1 - (1 - Math.abs(Math.sin(hop))) * 0.08 * Math.min(1, sp) * (1 - fly);
      lunge = damp(lunge, at * 0.3 - wu * 0.08, 14, dt);
      body.position.set(0, 0.48 + hopH + fly * (0.75 + Math.sin(st.t * 3) * 0.08) + Math.sin(st.t * 2.2) * 0.008, lunge);
      body.scale.set(1 / Math.sqrt(squash), squash * (1 + Math.sin(st.t * 2.2) * 0.015), 1 / Math.sqrt(squash));
      body.rotation.x = -wu * 0.35 + at * 0.45 + (st.diving ? 0.75 : 0) + fly * 0.12;
      body.rotation.y = (1 - fly) * Math.sin(st.t * 0.6) * 0.25;
      // wings: folded against the ball / spread & flapping / mantled on wind-up
      ph += dt * (flying ? (st.diving ? 4 : hover ? 16 : 13) : 6);   // quicker, shallower beats to hang in the air
      const open = Math.max(fly, wu * 0.85, at * 0.5);
      const flap = flying ? (st.diving ? 0.15 + Math.sin(ph) * 0.1 : Math.sin(ph) * (hover ? 0.7 : 0.85) + 0.15) : wu * 0.7 + Math.sin(ph) * 0.06 * open;
      wings.forEach(w => {
        w.arm.rotation.x = lerp(-1.3, 0, open);
        w.arm.rotation.y = lerp(1.4, st.diving ? 0.6 : 0.05, open);
        w.arm.rotation.z = lerp(-0.35, flap, open);
        w.arm.scale.setScalar(lerp(0.78, 1, open));
        w.hand.rotation.y = lerp(2.85, st.diving ? 0.5 : -Math.sin(ph - 0.8) * 0.15 * fly, open);
        w.hand.rotation.z = flying ? Math.sin(ph - 0.6) * 0.35 : 0;
      });
      legs.forEach((l, i) => { l.rotation.x = fly * 1.1 + (1 - fly) * Math.sin(hop + i * 0.3) * 0.2 * Math.min(1, sp); });
      tail.rotation.x = Math.sin(st.t * 3) * 0.08 - fly * 0.2;
      // blink every few seconds
      const bl = (st.t % 3.7) < 0.12 ? 0.15 : 1;
      eyes.forEach(e => { e.scale.y = bl; });
    },
    flash(v) { plume.emissive.setRGB(v, v * 0.95, v * 0.85); wingM.emissive.setRGB(v, v * 0.95, v * 0.85); },
  };
}

/* =================================================================
   KUNI BYRD — massive airplane-shaped raptor: ~7.3 m span, ~4.2 m
   long, glides ~3 m above ground.
   opts: saddle (rider's saddle & blanket), seed, scale.
   st: diving -> pitched, swept dive with talons out; st.landed
       (optional) -> stands on its legs with wings half raised.
   ================================================================= */
export function buildKuniByrd(opts = {}) {
  const root = new THREE.Group();
  const rnd = mulberry32(opts.seed ?? 3);
  const bodyC = new THREE.Color(opts.color ?? 0x5c3d24);
  if (opts.seed != null) bodyC.offsetHSL((rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.08);
  const feather = mat(bodyC), covert = mat(bodyC.clone().lerp(new THREE.Color(0xc89a62), 0.35));
  const primary = mat(bodyC.clone().multiplyScalar(0.5)), head = mat(0xeee2c6), beakM = mat(0xe8b23a), clawM = mat(0x221a14);
  const eyeM = mat(0xf0b020, { emissive: 0x3a2000 }), pupilM = new THREE.MeshBasicMaterial({ color: 0x0c0806 });
  // bioluminescence: beads of light along each wing's leading edge and the tail fan's
  // rim, so a Kuni crossing the night sky reads as a moving constellation; eyeshine
  const bio = bioKit();
  const KUNI_GLOW = [0xfff2c0, 0x9ad8ff, 0xffc87a];
  const starC = opts.seed != null ? KUNI_GLOW[Math.floor(rnd() * KUNI_GLOW.length)] : KUNI_GLOW[0];
  const starM = bio.mat(starC, bodyC, 0.2, 0.05, 2.2);
  bio.reg(eyeM, 1.0, 6.0);
  const edge = (x0, x1, z0, z1, n, y, r) => { const L = []; for (let i = 0; i < n; i++) { const t = i / (n - 1), x = lerp(x0, x1, t), z = lerp(z0, z1, t); L.push([x, y, z, 0, 1, 0.2, r, 0.5], [x, -y + 0.02, z, 0, -1, 0.2, r, 0.5]); } return bioDots(L); };
  const armStars = edge(0.25, 1.65, 0.5, 0.46, 6, 0.065, 0.045), handStars = edge(0.15, 1.0, 0.46, 0.4, 4, 0.04, 0.04);

  const body = new THREE.Group(); body.position.y = 3; root.add(body);
  // streamlined fuselage (lathe along z)
  const prof = [[0.06, -2.05], [0.16, -1.8], [0.3, -1.3], [0.44, -0.6], [0.52, 0.1], [0.5, 0.75], [0.42, 1.25], [0.3, 1.6], [0.12, 1.75]];
  const fus = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 14);
  fus.rotateX(Math.PI / 2);
  const fuse = new THREE.Mesh(fus, feather); fuse.scale.set(1, 0.9, 1); body.add(fuse);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), covert); chest.scale.set(0.9, 0.7, 1.6); chest.position.set(0, -0.15, 0.55); body.add(chest);

  // head: pale, fierce brow, hooked beak, opening lower jaw
  const headG = new THREE.Group(); headG.position.set(0, 0.12, 1.72); body.add(headG);
  headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), head)).scale.set(0.88, 0.92, 1.2);
  const ruff = mergeGeos(Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * TAU;
    return [new THREE.ConeGeometry(0.1, 0.42, 5), M4(Math.cos(a) * 0.3, Math.sin(a) * 0.27, -0.28, -Math.PI / 2 + Math.sin(a) * 0.3, 0, Math.cos(a) * -0.3)];
  }));
  headG.add(new THREE.Mesh(ruff, head));
  const beakGeo = new THREE.ConeGeometry(0.15, 0.55, 9);
  beakGeo.rotateX(Math.PI / 2);
  { const p = beakGeo.attributes.position; for (let i = 0; i < p.count; i++) { const t = clamp01((p.getZ(i) + 0.275) / 0.55); p.setY(i, p.getY(i) - 0.26 * Math.pow(t, 2.4)); } beakGeo.computeVertexNormals(); }
  const beak = new THREE.Mesh(beakGeo, beakM); beak.position.set(0, 0.0, 0.52); beak.scale.set(0.9, 1, 1); headG.add(beak);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.1, 0.3); headG.add(jaw);
  const jawM = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.36, 7), beakM); jawM.rotation.x = Math.PI / 2; jawM.position.z = 0.18; jawM.scale.set(1, 1, 0.5); jaw.add(jawM);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), eyeM); e.position.set(s * 0.21, 0.07, 0.2); headG.add(e);
    const p = noOut(new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), pupilM)); p.position.set(s * 0.25, 0.07, 0.24); headG.add(p);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.26), head); brow.position.set(s * 0.19, 0.15, 0.24); brow.rotation.set(0.2, s * 0.25, s * -0.35); headG.add(brow);
  }

  // long straight wings: inner panel + outer panel + slotted primaries
  const inSh = new THREE.Shape();
  inSh.moveTo(0, 0.6); inSh.lineTo(1.75, 0.55); inSh.lineTo(1.75, -0.5); scallop(inSh, 1.75, -0.5, 0, -0.72, 6, 0.04); inSh.lineTo(0, 0.6);
  const outSh = new THREE.Shape();
  outSh.moveTo(0, 0.55); outSh.lineTo(1.05, 0.46); outSh.lineTo(1.05, -0.42); scallop(outSh, 1.05, -0.42, 0, -0.5, 4, 0.035); outSh.lineTo(0, 0.55);
  const covSh = new THREE.Shape();
  covSh.moveTo(0, 0.62); covSh.lineTo(2.75, 0.5); covSh.lineTo(2.75, 0.18); scallop(covSh, 2.75, 0.18, 0, 0.1, 9, 0.025); covSh.lineTo(0, 0.62);
  const fingerSh = new THREE.Shape();
  fingerSh.moveTo(0, 0.08); fingerSh.lineTo(0.5, 0.06); fingerSh.quadraticCurveTo(0.68, 0, 0.5, -0.06); fingerSh.lineTo(0, -0.08); fingerSh.lineTo(0, 0.08);
  const fingerG = slabGeo(fingerSh, 0.03);
  const fingers = mergeGeos([0.36, 0.18, 0, -0.18, -0.34].map((z, i) => [fingerG, M4(1.0, 0, z, 0, -0.1 + i * 0.09, 0, 1 + (i === 1 ? 0.15 : i === 4 ? -0.25 : 0))]));
  const inGeo = slabGeo(inSh, 0.07), outGeo = slabGeo(outSh, 0.05), covGeo = slabGeo(covSh, 0.03);
  const wings = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(s * 0.36, 0.15, 0.3); shoulder.scale.x = s; body.add(shoulder);
    const arm = new THREE.Group(); arm.rotation.order = 'YXZ'; shoulder.add(arm);
    arm.add(new THREE.Mesh(inGeo, feather));
    const cov = new THREE.Mesh(covGeo, covert); cov.position.y = 0.045; arm.add(cov);
    const hand = new THREE.Group(); hand.position.set(1.72, 0, 0); arm.add(hand);
    hand.add(new THREE.Mesh(outGeo, feather));
    hand.add(new THREE.Mesh(fingers, primary));
    bioMesh(armStars, starM, arm); bioMesh(handStars, starM, hand);
    wings.push({ arm, hand });
  }
  // tailplane: a broad fan held flat like a stabiliser
  const tailSh = new THREE.Shape();
  tailSh.moveTo(-0.22, 0.25); tailSh.lineTo(0.22, 0.25); tailSh.lineTo(0.9, -0.5); scallop(tailSh, 0.9, -0.5, -0.9, -0.5, 7, 0.06); tailSh.lineTo(-0.22, 0.25);
  const tail = new THREE.Group(); tail.position.set(0, 0.05, -1.9); body.add(tail);
  tail.add(new THREE.Mesh(slabGeo(tailSh, 0.06), head));
  { const L = []; for (let i = 0; i < 7; i++) { const x = lerp(-0.8, 0.8, i / 6); L.push([x, 0.035, -0.5, 0, 1, 0, 0.05, 0.5]); } bioMesh(bioDots(L), starM, tail); }
  const tailRidge = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 4), feather); tailRidge.rotation.x = -Math.PI / 2; tailRidge.scale.set(1, 1, 0.5); tailRidge.position.set(0, 0.04, -0.1); tail.add(tailRidge);

  // legs: feathered trousers, yellow shanks, black talons
  const legs = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(s * 0.24, -0.28, -0.2); body.add(l);
    const thigh = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 7), feather); thigh.rotation.x = Math.PI; thigh.position.y = -0.2; l.add(thigh);
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.6, 6), beakM); shank.position.y = -0.7; l.add(shank);
    const f = footGroup(0.26, 0.04, beakM, clawM, 3, 0.5); f.position.y = -1.0; l.add(f);
    legs.push(l);
  }

  // rider's saddle
  if (opts.saddle) {
    const sad = new THREE.Group(); sad.position.set(0, 0, -0.45); body.add(sad);
    const blanketM = mat(0xa8382a, { side: THREE.DoubleSide }), leather = mat(0x6e4422), brass = mat(0xd8b048);
    const blanket = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.95, 14, 1, true, -1.15, 2.3), blanketM);
    blanket.rotation.set(Math.PI / 2, 0, 0); blanket.scale.set(1.04, 1, 0.94); blanket.rotation.y = 0; sad.add(blanket);
    blanket.rotation.z = Math.PI; // open arc on the bottom, cloth on top
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.6), leather); seat.position.set(0, 0.5, 0); sad.add(seat);
    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 6), leather); pommel.position.set(0, 0.62, 0.28); sad.add(pommel);
    const cantle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), leather); cantle.position.set(0, 0.6, -0.3); sad.add(cantle);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.03, 5, 20), leather); strap.position.z = -0.05; sad.add(strap);
    for (const s of [-1, 1]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.05), leather); st.position.set(s * 0.32, 0.3, 0.05); st.rotation.z = s * 0.3; sad.add(st);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 10), brass); ring.position.set(s * 0.4, 0.08, 0.05); sad.add(ring);
    }
  }

  finish(root, 0.035);
  applyScale(root, opts);
  bio.glow(0);
  let ph = rnd() * 6, alt = 3, pitch = 0, dive = 0, land = 0, talon = 0;
  return {
    root, mats: [feather, covert], glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, wu = st.windup || 0, at = st.attack || 0;
      dive = damp(dive, st.diving ? 1 : 0, 4, dt);
      land = damp(land, st.landed ? 1 : 0, 3, dt);
      // flap hard when slow / climbing, glide when fast
      const glide = clamp01((sp - 3) / 6);
      const amp = lerp(0.55, 0.1, glide) * (1 - dive * 0.8) * (1 - land) + wu * 0.25;
      ph += dt * TAU * lerp(1.3, 0.6, glide);
      alt = damp(alt, lerp(lerp(3, 1.8, dive), 1.28, land), 3, dt);
      body.position.y = alt + Math.sin(ph - 1.2) * 0.12 * amp * 2 * (1 - land);
      pitch = damp(pitch, dive * 0.5 - wu * 0.3 + at * 0.15, 6, dt);
      body.rotation.x = pitch;
      body.rotation.z = Math.sin(st.t * 0.45) * 0.07 * (1 - land);
      const flap = Math.sin(ph) * amp;
      wings.forEach(w => {
        w.arm.rotation.z = 0.07 + flap + land * 0.6 + wu * 0.5;
        w.arm.rotation.y = dive * 0.45 + land * 0.5 + wu * 0.25;
        w.arm.rotation.x = 0;
        w.hand.rotation.z = Math.sin(ph - 0.7) * amp * 0.6 - land * 0.9;
        w.hand.rotation.y = dive * 0.35 + land * 1.2;
      });
      tail.rotation.x = -dive * 0.3 + Math.sin(st.t * 0.9) * 0.04 + wu * 0.2;
      // talons trail behind in flight, swing forward to strike or land
      talon = damp(talon, Math.max(dive, at, wu * 0.6, land), 6, dt);
      legs.forEach(l => { l.rotation.x = lerp(1.25, at > 0.1 ? -0.8 : -0.1, talon); });
      headG.rotation.x = -pitch * 0.5 + Math.sin(st.t * 0.7) * 0.05 - wu * 0.15;
      headG.rotation.y = Math.sin(st.t * 0.33) * 0.2 * (1 - dive);
      jaw.rotation.x = Math.max(wu, at) * 0.45;
    },
    flash(v) { feather.emissive.setRGB(v, v * 0.9, v * 0.8); covert.emissive.setRGB(v, v * 0.9, v * 0.8); },
  };
}

/* =================================================================
   TYNDAEL — a creature of pure flame, ~1.75 m tall incl. crown,
   ~2 m across the wings, hovering core at ~1.05 m.
   opts: seed (flicker phases), scale.
   ================================================================= */
export function buildTyndael(opts = {}) {
  const root = new THREE.Group();
  const rnd = mulberry32(opts.seed ?? 11);
  const fm = c => mat(c, { emissive: c, emissiveIntensity: 0.85 });
  const white = fm(0xfff3b0), yellow = fm(0xffc83a), orange = fm(0xff8a1e), red = fm(0xf0441a), crimson = fm(0xd82a4a);
  const veil = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x1a0602 });

  const hover = new THREE.Group(); hover.position.y = 1.05; root.add(hover);
  const flames = [];
  const tongue = (parent, h, w, lean, m, x, y, z, rx, rz, flat = 1, ry = 0) => {
    const f = noOut(new THREE.Mesh(flameGeo(h, w, lean), m));
    f.position.set(x, y, z); f.rotation.set(rx, ry, rz); f.scale.set(1, 1, flat);
    parent.add(f);
    flames.push({ f, rx, rz, ph: rnd() * TAU, fr: 9 + rnd() * 8, amp: 0.12 + rnd() * 0.1, flat });
    return f;
  };
  // the core: nested flame drops (red outside, white-hot inside) + a ring of licking tongues
  const coreG = new THREE.Group(); hover.add(coreG);
  tongue(coreG, 0.95, 0.34, 0, orange, 0, -0.33, 0, 0, 0);
  tongue(coreG, 0.7, 0.25, 0, yellow, 0, -0.24, 0.07, 0, 0);
  tongue(coreG, 0.42, 0.15, 0, white, 0, -0.14, 0.13, 0, 0);
  const shell = noOut(new THREE.Mesh(flameGeo(1.1, 0.4, 0), veil)); shell.position.y = -0.4; coreG.add(shell);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.2;
    if (Math.cos(a) > 0.55) continue;            // keep the face clear
    const r = 0.26, h = 0.32 + rnd() * 0.2;
    tongue(coreG, h, 0.09, 0.15, i % 3 === 0 ? yellow : i % 3 === 1 ? red : orange,
      Math.sin(a) * r, -0.15 + rnd() * 0.15, Math.cos(a) * r * 0.85, Math.cos(a) * 0.6, -Math.sin(a) * 0.6);
  }
  // two dark eyes, no mouth
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = noOut(new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), eyeM));
    e.position.set(s * 0.12, 0.03, 0.33); e.scale.set(0.85, 1.35, 0.5); e.rotation.z = s * 0.25; hover.add(e); eyes.push(e);
  }
  // the crown: a ring of flames around a tall central tongue
  const crown = new THREE.Group(); crown.position.y = 0.3; hover.add(crown);
  tongue(crown, 0.6, 0.12, 0.05, yellow, 0, 0, 0, 0, 0);
  tongue(crown, 0.35, 0.07, 0.05, white, 0, 0.02, 0.02, 0, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    tongue(crown, 0.38 + (i % 2) * 0.1, 0.075, 0.1, i % 2 ? orange : yellow, Math.sin(a) * 0.13, -0.04, Math.cos(a) * 0.13, Math.cos(a) * 0.45, -Math.sin(a) * 0.45);
  }
  // flame wings: fans of flat tongues sweeping out from the shoulders
  const wings = [];
  const wingCols = [yellow, orange, orange, red, crimson];
  const wingLen = [1.0, 1.15, 1.05, 0.85, 0.6];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.24, 0.12, -0.12); pivot.scale.x = s; hover.add(pivot);
    for (let i = 0; i < 5; i++) {
      const rz = -0.9 - i * 0.24;
      tongue(pivot, wingLen[i], 0.14, -0.25, wingCols[i], 0, 0, -i * 0.04, -0.3, rz, 0.3);
      tongue(pivot, wingLen[i] * 0.6, 0.06, -0.2, i < 2 ? white : yellow, 0.02, 0, -i * 0.03 + 0.02, -0.25, rz, 0.35);
    }
    wings.push(pivot);
  }
  // dangling flame legs with little flame toes
  const legs = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(s * 0.12, -0.22, 0); hover.add(l);
    tongue(l, 0.55, 0.075, 0.08 * s, orange, 0, 0, 0, Math.PI, 0);
    tongue(l, 0.32, 0.04, 0, yellow, 0, -0.02, 0.01, Math.PI, 0);
    for (const k of [-1, 0, 1]) tongue(l, 0.14, 0.03, 0.1, red, k * 0.03, -0.48, 0.02, Math.PI - 0.5, k * 0.4);
    legs.push(l);
  }
  const halo = glowSprite(0xff7a1a, 2.2, 0.25); hover.add(halo);
  const heart = glowSprite(0xfff0c0, 0.7, 0.5); heart.position.z = 0.1; hover.add(heart);

  finish(root, 0.02);
  applyScale(root, opts);
  let ph = rnd() * 6, heat = 0.5, night = 0;
  const mats = [orange, yellow, red];
  return {
    root, mats,
    /* already a creature of light: at night its halo spreads wider and brighter */
    glow(v) { night = clamp01(v); veil.opacity = 0.35 + night * 0.15; },
    animate(dt, st) {
      const sp = st.speed || 0, wu = st.windup || 0, at = st.attack || 0, t = st.t;
      heat = damp(heat, 0.5 + wu * 0.6 + at * 0.4, 8, dt);
      ph += dt * (6 + sp * 0.8);
      hover.position.y = 1.05 + Math.sin(t * 2.4) * 0.1;
      hover.position.z = at * 0.35 - wu * 0.12;
      hover.rotation.x = -wu * 0.35 + at * 0.3 + Math.min(sp, 6) * 0.04;
      // every tongue flickers on its own rhythm
      for (let i = 0; i < flames.length; i++) {
        const F = flames[i], s = Math.sin(t * F.fr + F.ph) * 0.6 + Math.sin(t * F.fr * 1.7 + F.ph * 2) * 0.4;
        const k = 1 + s * F.amp + (heat - 0.5) * 0.35;
        F.f.scale.set(1 - s * F.amp * 0.4, k, F.flat * (1 - s * F.amp * 0.4));
        F.f.rotation.z = F.rz + Math.sin(t * F.fr * 0.5 + F.ph) * 0.08;
      }
      crown.scale.setScalar(0.8 + heat * 0.5);
      wings.forEach(w => { const k = w.scale.x;   // mirrored pivots: rotate in mirrored sense
        w.rotation.z = k * (Math.sin(ph) * 0.45 + wu * 0.5 - at * 0.3); w.rotation.y = -k * (Math.cos(ph) * 0.15 + at * 0.4); });
      legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 2.6 + i * 1.3) * 0.25 - Math.min(sp, 5) * 0.1; l.rotation.z = Math.sin(t * 1.9 + i) * 0.12; });
      shell.scale.set(1 + Math.sin(t * 13) * 0.05, 1 + Math.sin(t * 9) * 0.08, 1 + Math.sin(t * 11) * 0.05);
      halo.material.opacity = (0.12 + heat * 0.18 + Math.sin(t * 17) * 0.03) * (1 + night * 0.9);
      halo.scale.setScalar(2.2 * (1 + night * 0.35));
      heart.material.opacity = (0.35 + Math.sin(t * 9) * 0.1) * (1 + night * 0.6);
      const bl = (t % 4.3) < 0.1 ? 0.15 : 1;
      eyes.forEach(e => { e.scale.y = 1.3 * bl * (1 - wu * 0.35); });
    },
    flash(v) { mats.forEach(m => { m.emissiveIntensity = 0.85 + v * 1.5; }); },
  };
}

/* =================================================================
   LUTUT — Prince Rupert's drop with bat wings: ~5.7 m long incl.
   tail, ~11.8 m span, ~2.5 m tall standing.
   opts: age 0..1 (how deep the stone carvings read, default 0.5),
         seed, scale.
   st: speed > 1 -> flies (legs tucked); windup -> rears, mouth
       opens; attack -> lunge with spinning tooth rings; swing ->
       tail-ball swipe.
   ================================================================= */
function carvingTexture(age, seed, glowCol) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  g.fillStyle = glowCol ? '#000000' : '#ffffff'; g.fillRect(0, 0, 512, 256);
  const a = 0.08 + 0.85 * age;
  const dark = `rgba(52,38,70,${a})`, light = `rgba(255,250,255,${0.6 * a})`;
  // draw everything twice: a pale bevel offset, then the dark groove
  const pass = (col, off) => {
    g.strokeStyle = col; g.lineWidth = 3; g.lineCap = 'round';
    g.save(); g.translate(off, off);
    [30, 60, 112, 150, 196, 222].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); });
    // row of chevrons
    g.beginPath(); for (let x = 0; x <= 512; x += 32) { g.moveTo(x, 36); g.lineTo(x + 16, 54); g.lineTo(x + 32, 36); } g.stroke();
    // row of spirals / ringed dots
    for (let x = 16; x < 512; x += 42) {
      g.beginPath(); g.arc(x, 86, 13, 0, TAU); g.stroke();
      g.beginPath(); for (let k = 0; k < 24; k++) { const r = k * 0.45, an = k * 0.6; g.lineTo(x + Math.cos(an) * r, 86 + Math.sin(an) * r); } g.stroke();
    }
    // meander key
    g.beginPath(); for (let x = 0; x < 512; x += 32) { g.moveTo(x, 142); g.lineTo(x, 120); g.lineTo(x + 22, 120); g.lineTo(x + 22, 134); g.lineTo(x + 10, 134); } g.stroke();
    // runes
    for (let x = 8; x < 512; x += 28) {
      g.beginPath();
      const k = Math.floor(rnd() * 4);
      g.moveTo(x + 10, 160); g.lineTo(x + 10, 188);
      if (k === 0) { g.moveTo(x + 10, 166); g.lineTo(x + 20, 174); g.lineTo(x + 10, 182); }
      if (k === 1) { g.moveTo(x + 2, 164); g.lineTo(x + 18, 184); }
      if (k === 2) { g.moveTo(x + 10, 172); g.lineTo(x + 2, 164); g.moveTo(x + 10, 172); g.lineTo(x + 18, 164); }
      if (k === 3) { g.moveTo(x + 4, 174); g.lineTo(x + 16, 174); }
      g.stroke();
    }
    // a scatter of crack-like cuts along the thin tail end
    g.beginPath(); for (let x = 10; x < 512; x += 37) { g.moveTo(x, 205); g.lineTo(x + 12, 214); g.lineTo(x + 4, 220); } g.stroke();
    g.restore();
  };
  // glow version: the same grooves (same runes), as light on black
  if (glowCol) { pass('rgba(0,0,0,0)', 2); pass(glowCol, 0); } else { pass(light, 2); pass(dark, 0); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(2, 1);
  return tex;
}

export function buildLutut(opts = {}) {
  const age = clamp01(opts.age ?? 0.5);
  const seed = opts.seed ?? 5;
  const root = new THREE.Group();
  const tex = carvingTexture(age, seed);
  const skinO = { };
  if (tex) { skinO.map = tex; skinO.bumpMap = tex; skinO.bumpScale = 1.5 + 4 * age; }
  const skin = mat(opts.color ?? 0x8a7f9c, skinO);
  const stone = mat(0x6e6582), membrane = mat(0x5a4c6c, { side: THREE.DoubleSide }), boneM = mat(0x786d8c);
  const toothM = mat(0xeee6d4), gullet = mat(0x3a0e1c, { side: THREE.DoubleSide }), lipM = mat(0x9a7a8e);
  const eyeM = mat(0xffc040, { emissive: 0x6a3a00 }), pupilM = new THREE.MeshBasicMaterial({ color: 0x0a0608 });

  const body = new THREE.Group(); body.position.y = 1.65; root.add(body);
  // the drop: open at the very front, where the lamprey mouth sits
  const prof = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(lerp(0.2, 0.95, Math.pow(0.5 - 0.5 * Math.cos(t * Math.PI), 0.8)), lerp(-1.75, 0.85, t))); }
  for (let i = 1; i <= 7; i++) { const a = (i / 7) * 1.1; prof.push(new THREE.Vector2(0.95 * Math.cos(a), 0.85 + 0.95 * Math.sin(a))); }
  const dropGeo = new THREE.LatheGeometry(prof, 22); dropGeo.rotateX(Math.PI / 2);
  const drop = new THREE.Mesh(dropGeo, skin); drop.scale.set(1, 0.92, 1); body.add(drop);
  // bioluminescence: the carvings themselves glow at night (brighter with age) — an
  // additive skin of the same grooves over the drop, kept apart from the flashed skin
  const bio = bioKit();
  const gTex = carvingTexture(age, seed, '#ffffff');
  let carveGlow = null;
  if (gTex) {
    const LUT_GLOW = [0xb48aff, 0x7ad8ff, 0xff8ad8];
    const gm = new THREE.MeshBasicMaterial({ color: LUT_GLOW[seed % 3], map: gTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1 });
    carveGlow = noOut(new THREE.Mesh(dropGeo, gm)); carveGlow.scale.set(1.004, 0.92 * 1.004, 1.004); body.add(carveGlow);
    bio.sprite(carveGlow, 0.35 + 0.65 * age, 0.12);
  }
  bio.reg(eyeM, 1.0, 4.0);
  const mouthZ = 0.85 + 0.95 * Math.sin(1.1), mouthR = 0.95 * Math.cos(1.1);
  const mouth = new THREE.Group(); mouth.position.z = mouthZ - 0.02; body.add(mouth);
  const funnel = noOut(new THREE.Mesh(new THREE.ConeGeometry(mouthR, 0.9, 18, 1, true), gullet)); funnel.rotation.x = Math.PI / 2; funnel.position.z = -0.45; mouth.add(funnel);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(mouthR, 0.09, 8, 24), lipM); lip.scale.z = 1.2; mouth.add(lip);
  const rings = [];
  [[mouthR * 0.95, 18, 0.12, -0.02], [mouthR * 0.68, 14, 0.1, -0.2], [mouthR * 0.42, 10, 0.08, -0.38]].forEach(([r, n, h, z], k) => {
    const parts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      // each tooth leans inward toward the throat
      const m = new THREE.Matrix4().makeRotationZ(a).multiply(M4(0, r - h * 0.3, 0, -0.5, 0, Math.PI, 1));
      parts.push([new THREE.ConeGeometry(h * 0.35, h, 5), m]);
    }
    const ring = new THREE.Mesh(mergeGeos(parts), toothM); ring.position.z = z; mouth.add(ring); rings.push(ring);
  });
  // eyes above the mouth, under heavy stone brows
  for (const s of [-1, 1]) {
    const d = new THREE.Vector3(s * 0.32, 0.62, 0.72).normalize().multiplyScalar(0.92);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), eyeM); e.position.set(d.x, d.y * 0.92, 0.85 + d.z); body.add(e);
    const p = noOut(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), pupilM)); p.scale.set(0.35, 1.1, 0.6); p.position.copy(e.position).add(new THREE.Vector3(s * 0.03, 0, 0.1)); body.add(p);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.22), stone); brow.position.copy(e.position).add(new THREE.Vector3(0, 0.13, -0.02)); brow.rotation.set(-0.5, s * 0.3, s * -0.25); body.add(brow);
  }
  // dorsal stone ridge
  body.add(new THREE.Mesh(mergeGeos([0.5, 0.0, -0.45].map((z, i) => [new THREE.ConeGeometry(0.12 - i * 0.02, 0.3, 4), M4(0, 0.9 - i * 0.15 - (z < 0 ? 0.15 : 0), z, -0.4, 0, 0)])), stone));

  // the tail: a chain of thinning segments with a spiked ball near the tip
  const tailSegs = [];
  let parent = body, z0 = -1.7;
  const N = 6;
  for (let i = 0; i < N; i++) {
    const seg = new THREE.Group(); seg.position.z = i === 0 ? z0 : -0.34; parent.add(seg);
    const r0 = lerp(0.2, 0.06, i / N), r1 = lerp(0.2, 0.06, (i + 1) / N);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 0.36, 7), skin); m.rotation.x = -Math.PI / 2; m.position.z = -0.17; seg.add(m);
    tailSegs.push(seg); parent = seg;
  }
  const ball = new THREE.Group(); ball.position.z = -0.6; parent.add(ball);
  const spikes = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 14; i++) {
    const y = 1 - (i / 13) * 2, r = Math.sqrt(1 - y * y), a = i * ga;
    const v = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    spikes.push([new THREE.ConeGeometry(0.07, 0.3, 5), new THREE.Matrix4().compose(v.clone().multiplyScalar(0.3), new THREE.Quaternion().setFromUnitVectors(UP, v), new THREE.Vector3(1, 1, 1))]);
  }
  ball.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), stone));
  ball.add(new THREE.Mesh(mergeGeos(spikes), toothM));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 6), skin); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.4; ball.add(tip);
  // a short neck of tail between the last segment and the ball
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), skin); neck.rotation.x = Math.PI / 2; neck.position.z = -0.3; parent.add(neck);

  // massive bat wings: arm (humerus + forearm) with inner membrane, hand with fingers and outer membrane
  const elbow = new THREE.Vector3(1.5, 0, 0.45), wrist = new THREE.Vector3(3.0, 0, 0.2);
  const tips = [[2.5, -0.05], [2.1, -1.35], [1.15, -2.35], [-0.3, -2.45]];
  const armSh = new THREE.Shape();
  armSh.moveTo(0, 0.2); armSh.lineTo(elbow.x, elbow.z); armSh.lineTo(wrist.x, wrist.z);
  armSh.lineTo(wrist.x + tips[3][0], wrist.z + tips[3][1]);
  armSh.quadraticCurveTo(1.4, -1.3, 0, -1.6); armSh.lineTo(0, 0.2);
  const handSh = new THREE.Shape();
  handSh.moveTo(0, 0); handSh.lineTo(tips[0][0], tips[0][1]);
  for (let i = 1; i < 4; i++) {
    const [px, pz] = tips[i - 1], [x, z] = tips[i];
    handSh.quadraticCurveTo((px + x) * 0.38, (pz + z) * 0.38, x, z);
  }
  handSh.lineTo(0, 0);
  const armMem = slabGeo(armSh, 0.04, 10), handMem = slabGeo(handSh, 0.04, 10);
  const armBones = mergeGeos([[strutGeo(new THREE.Vector3(0, 0, 0.2), elbow, 0.18, 0.12), null], [strutGeo(elbow, wrist, 0.12, 0.08), null], [new THREE.SphereGeometry(0.14, 8, 6), M4(elbow.x, 0, elbow.z)]]);
  const o = new THREE.Vector3();
  const handBones = mergeGeos([
    ...tips.map(([x, z]) => [strutGeo(o, new THREE.Vector3(x, 0, z), 0.07, 0.025), null]),
    [new THREE.SphereGeometry(0.1, 8, 6), null],
    [new THREE.ConeGeometry(0.06, 0.28, 5), M4(0.05, 0.05, 0.22, Math.PI / 2 - 0.3, 0, 0)],   // thumb claw
  ]);
  const wings = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(s * 0.7, 0.5, 0.35); shoulder.scale.x = s; body.add(shoulder);
    const arm = new THREE.Group(); arm.rotation.order = 'YXZ'; shoulder.add(arm);
    arm.add(new THREE.Mesh(armMem, membrane));
    arm.add(new THREE.Mesh(armBones, boneM));
    const hand = new THREE.Group(); hand.position.copy(wrist); arm.add(hand);
    hand.add(new THREE.Mesh(handMem, membrane));
    hand.add(new THREE.Mesh(handBones, boneM));
    wings.push({ arm, hand });
  }
  // four sturdy legs with stone claws
  const legs = [];
  [[-0.5, 0.45, 0.25], [0.5, 0.45, 0.25], [-0.4, -0.6, 0.2], [0.4, -0.6, 0.2]].forEach(([x, z, r]) => {
    const l = new THREE.Group(); l.position.set(x, -0.45, z); body.add(l);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, 0.7, 7), skin); thigh.position.y = -0.3; thigh.rotation.x = 0.25; l.add(thigh);
    const knee = new THREE.Group(); knee.position.set(0, -0.62, 0.12); l.add(knee);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.75, 0.6, 7), skin); shin.position.y = -0.26; shin.rotation.x = -0.3; knee.add(shin);
    const f = footGroup(0.3, 0.06, stone, toothM, 3, 0.5); f.position.set(0, -0.56, -0.05); knee.add(f);
    legs.push({ l, knee });
  });

  finish(root, 0.04);
  applyScale(root, opts);
  bio.glow(0);
  let ph = mulberry32(seed)() * 6, fly = 0, gape = 0;
  return {
    root, mats: [skin], glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, wu = st.windup || 0, at = st.attack || 0, sw = st.swing || 0, t = st.t;
      fly = damp(fly, sp > 1 || st.diving ? 1 : 0, 2.5, dt);
      ph += dt * TAU * lerp(0.4, 0.85, fly);
      const flap = Math.sin(ph);
      body.position.y = lerp(1.65 + Math.sin(t * 1.3) * 0.03, 4.2 + Math.sin(ph - 1.3) * 0.35, fly) - wu * 0.15 * (1 - fly);
      body.position.z = at * 0.9 - wu * 0.3;
      body.rotation.x = -wu * 0.35 + at * 0.25 + fly * (st.diving ? 0.6 : 0.08);
      // wings: folded tall over the back on the ground, big slow flaps in the air
      wings.forEach(w => {
        w.arm.rotation.z = lerp(0.95 + Math.sin(t * 0.8) * 0.05 + wu * 0.35, flap * 0.7 + 0.1, fly);
        w.arm.rotation.y = lerp(1.0 - wu * 0.5, 0.05, fly);
        w.arm.rotation.x = lerp(-0.25, 0, fly);
        w.hand.rotation.y = lerp(2.1 - wu * 1.0, -Math.sin(ph - 0.9) * 0.15, fly);
        w.hand.rotation.z = lerp(-0.5, Math.sin(ph - 0.8) * 0.45, fly);
      });
      // legs: walk on the ground, tucked back in flight
      legs.forEach(({ l, knee }, i) => {
        const walk = sp > 0.1 && fly < 0.5 ? Math.sin(t * (3 + sp * 2) + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.4 : 0;
        l.rotation.x = lerp(walk, 1.1, fly);
        knee.rotation.x = lerp(Math.max(0, -walk) * 0.6, 0.4, fly);
      });
      // tail: a lazy S-wave, raised behind on the ground, whipping on a swing
      tailSegs.forEach((s, i) => {
        s.rotation.y = Math.sin(t * 1.6 - i * 0.7) * 0.12 + sw * (i < 3 ? 0.5 : 0.25) * Math.sin(sw * Math.PI);
        s.rotation.x = (1 - fly) * (i < 2 ? -0.12 : 0.05) + wu * -0.1;
      });
      // the mouth gapes and the tooth rings rasp on the attack
      gape = damp(gape, Math.max(wu, at), 10, dt);
      mouth.scale.setScalar(1 + gape * 0.15 + Math.sin(t * 2) * 0.01);
      rings.forEach((r, i) => { r.rotation.z += dt * (0.2 + gape * 4) * (i % 2 ? -1 : 1); r.scale.setScalar(1 + gape * 0.2 * (i + 1) / 3); });
    },
    flash(v) { skin.emissive.setRGB(v * 0.9, v * 0.85, v); },
  };
}

/* =================================================================
   RUBBERMCFLY — fluffy baby chick, ~0.1 m tall, ~0.2 m across the
   butterfly wings; hovers ~0.5 m up.
   opts: seed (wing hue shift), scale.
   ================================================================= */
export function buildRubberMcFly(opts = {}) {
  const root = new THREE.Group();
  const rnd = mulberry32(opts.seed ?? 2);
  const fluff = mat(opts.color ?? 0xffe27a), fluffL = mat(0xfff2b8), beakM = mat(0xe8a020, { emissive: 0x3a2000 }), legM = mat(0xf09a30);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x140c08 }), hiM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const hover = new THREE.Group(); hover.position.y = 0.5; root.add(hover);
  const body = new THREE.Group(); hover.add(body);
  const R = 0.045;
  body.add(new THREE.Mesh(new THREE.SphereGeometry(R, 16, 12), fluff));
  const belly = new THREE.Mesh(new THREE.SphereGeometry(R * 0.75, 12, 10), fluffL); belly.scale.set(1, 0.9, 0.55); belly.position.set(0, -0.01, R * 0.6); body.add(belly);
  // a curl of fluff on the head and two cheek puffs
  body.add(new THREE.Mesh(mergeGeos([
    [new THREE.ConeGeometry(0.008, 0.026, 5), M4(0, R + 0.008, 0.005, 0.3, 0, 0)],
    [new THREE.ConeGeometry(0.006, 0.02, 5), M4(0.008, R + 0.004, -0.004, -0.2, 0, -0.5)],
    [new THREE.ConeGeometry(0.006, 0.02, 5), M4(-0.008, R + 0.004, -0.004, -0.2, 0, 0.5)],
    [new THREE.ConeGeometry(0.012, 0.03, 5), M4(0, -0.005, -R - 0.006, -1.9, 0, 0)],
  ]), fluff));
  for (const s of [-1, 1]) {
    const e = noOut(new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), eyeM)); e.position.set(s * 0.018, 0.01, R * 0.88); body.add(e);
    const h = noOut(new THREE.Mesh(new THREE.SphereGeometry(0.0028, 5, 4), hiM)); h.position.set(s * 0.019 + 0.002, 0.013, R * 0.88 + 0.007); body.add(h);
  }
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.016, 6), beakM); beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.004, R + 0.004); body.add(beak);
  // butterfly wings: pink -> violet -> cyan, two pairs
  const shift = opts.seed != null ? (rnd() - 0.5) * 0.08 : 0;
  const cA = new THREE.Color(0xff86c8).offsetHSL(shift, 0, 0), cB = new THREE.Color(0xa070ff).offsetHSL(shift, 0, 0), cC = new THREE.Color(0x58e6ff).offsetHSL(shift, 0, 0);
  const paint = (g, reach) => {
    const p = g.attributes.position, cols = [], c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const t = Math.min(1, Math.hypot(p.getX(i), p.getZ(i)) / reach);
      if (t < 0.5) c.copy(cA).lerp(cB, t * 2); else c.copy(cB).lerp(cC, (t - 0.5) * 2);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    return g;
  };
  const fore = new THREE.Shape();
  fore.moveTo(0, 0.004); fore.bezierCurveTo(0.03, 0.05, 0.1, 0.07, 0.115, 0.035); fore.bezierCurveTo(0.125, 0.0, 0.08, -0.015, 0.0, -0.004); fore.lineTo(0, 0.004);
  const hind = new THREE.Shape();
  hind.moveTo(0, -0.002); hind.bezierCurveTo(0.06, -0.01, 0.09, -0.04, 0.075, -0.07); hind.bezierCurveTo(0.06, -0.09, 0.02, -0.06, 0.0, -0.012); hind.lineTo(0, -0.002);
  const wingM = toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide, emissive: 0x000000 });
  const foreG = paint(slabGeo(fore, 0.0015, 12), 0.12), hindG = paint(slabGeo(hind, 0.0015, 12), 0.09);
  // bioluminescence: the wing eyespots glow cyan-violet at night, and a smaller spot
  // on each hind wing
  const bio = bioKit();
  const spotM = bio.mat(new THREE.Color(0x7ae8ff).offsetHSL(shift, 0, 0).getHex(), 0x4a2a7a, 0.15, 0.1, 2.2), spotG = slabGeo(new THREE.Shape().absarc(0, 0, 0.008, 0, TAU), 0.002, 10);
  const wings = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(s * 0.012, 0.025, -0.005); p.scale.x = s; body.add(p);
    const f = new THREE.Mesh(foreG, wingM); f.rotation.y = -0.15; p.add(f);
    const spot = new THREE.Mesh(spotG, spotM); spot.position.set(0.075, 0.0012, 0.03); f.add(spot);
    const h = new THREE.Mesh(hindG, wingM); h.rotation.y = 0.15; p.add(h);
    const hs = new THREE.Mesh(spotG, spotM); hs.position.set(0.05, 0.0012, -0.045); hs.scale.setScalar(0.6); h.add(hs);
    wings.push(p);
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(s * 0.014, -R + 0.006, 0.006); body.add(l);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.003, 0.018, 5), legM); shin.position.y = -0.008; l.add(shin);
    const f = footGroup(0.01, 0.002, legM, legM); f.position.y = -0.017; l.add(f);
    legs.push(l);
  }
  finish(root, 0.0025);
  applyScale(root, opts);
  bio.glow(0);
  let ph = rnd() * 6;
  return {
    root, mats: [fluff], glow: bio.glow,
    animate(dt, st) {
      const sp = st.speed || 0, wu = st.windup || 0, at = st.attack || 0, t = st.t;
      ph += dt * TAU * (6 + Math.min(sp, 4));
      const f = Math.sin(ph);
      hover.position.y = 0.5 + Math.sin(t * 3) * 0.04 + f * 0.006;
      body.position.z = at * 0.06 - wu * 0.02;
      body.rotation.x = Math.min(sp, 4) * 0.08 + at * 0.4 - wu * 0.3;
      body.rotation.z = Math.sin(t * 1.7) * 0.12;
      wings.forEach(w => { const k = w.scale.x; w.rotation.z = k * (0.4 + f * 0.65 + wu * 0.4); w.rotation.x = -0.15; });
      legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 4 + i * 2) * 0.35; });
    },
    flash(v) { fluff.emissive.setRGB(v, v * 0.9, v * 0.6); },
  };
}

/* =================================================================
   MAKARI — 2-3 cm floating teardrops with three petal bumps per
   side and a hair-thin stem trailing beneath.
   buildMakari(opts):      one Makari (opts.color, seed, scale), floating ~1.2 m up.
   buildMakariSwarm(opts): opts.count (18), opts.colors (array of hex or a
                           single colour), opts.moteScale (enlarge each
                           Makari for readability, default 1 = true size);
                           a drifting cloud ~1.6 m across.
   ================================================================= */
let MAKARI_GEO = null;
function makariGeo() {
  if (MAKARI_GEO) return MAKARI_GEO;
  // teardrop: round top, pointed bottom where the stem leaves
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;   // 0 = point (bottom), 1 = round top
    const r = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.9) * Math.pow(1 - t, 0.35);
    pts.push(new THREE.Vector2(Math.max(0.0001, r * 0.0085), t * 0.024));
  }
  const drop = new THREE.LatheGeometry(pts, 12);
  drop.rotateX(Math.PI); drop.translate(0, 0.024, 0);   // flip: round end up, tip down at y=0
  const parts = [[drop, null]];
  [0.016, 0.011, 0.006].forEach((y, i) => {
    for (const s of [-1, 1]) {
      // petal: a flattened, elongated bump angled up and out
      parts.push([new THREE.SphereGeometry(0.0035, 7, 5), M4(s * (0.0085 - i * 0.0014), y, 0, 0, 0, s * (-1.0 + i * 0.3), 2.1, 0.75, 0.4)]);
    }
  });
  MAKARI_GEO = mergeGeos(parts);
  MAKARI_GEO.computeBoundingSphere();
  const sp = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; sp.push(Math.sin(t * 5) * 0.004 * t, -t * 0.075, Math.sin(t * 3.4) * 0.003 * t); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  MAKARI_GEO.userData.stem = sg;
  return MAKARI_GEO;
}

function makariMats(color) {
  const c = new THREE.Color(color);
  return {
    body: mat(c, { emissive: c.clone(), emissiveIntensity: 0.3 }),
    stem: new THREE.LineBasicMaterial({ color: c.clone().multiplyScalar(0.7) }),
  };
}

function makeMakari(m) {
  const g = new THREE.Group();
  const geo = makariGeo();
  const bodyM = new THREE.Mesh(geo, m.body); g.add(bodyM);
  const stem = new THREE.Line(geo.userData.stem, m.stem); stem.userData.noOutline = true; g.add(stem);
  return { g, body: bodyM, stem };
}

const MAKARI_MIX = [0xff7ab8, 0x6ae8ff, 0xffd84a, 0x9aff6a, 0xb486ff, 0xffffff, 0xff9a5a];

export function buildMakari(opts = {}) {
  const root = new THREE.Group();
  const rnd = mulberry32(opts.seed ?? 4);
  const color = opts.color ?? MAKARI_MIX[Math.floor(rnd() * MAKARI_MIX.length)];
  const m = makariMats(color);
  const k = makeMakari(m); k.g.position.y = 1.2; root.add(k.g);
  finish(root, 0.0009);
  applyScale(root, opts);
  const ph = rnd() * TAU;
  let base = 0.3;
  return {
    root, mats: [m.body],
    /* they are lights already: brighter at night (flash adds on top) */
    glow(v) { base = 0.3 + clamp01(v) * 1.1; m.body.emissiveIntensity = base; },
    animate(dt, st) {
      const t = st.t, wu = st.windup || 0, at = st.attack || 0;
      k.g.position.set(Math.sin(t * 0.9 + ph) * 0.02, 1.2 + Math.sin(t * 1.7 + ph) * 0.02, at * 0.05);
      k.g.rotation.z = Math.sin(t * 1.3 + ph) * 0.2 + wu * 0.3;
      k.g.rotation.y += dt * 0.6;
      k.stem.rotation.x = Math.sin(t * 2.1 + ph) * 0.25;
    },
    flash(v) { m.body.emissiveIntensity = base + v * 1.5; },
  };
}

export function buildMakariSwarm(opts = {}) {
  const count = opts.count ?? 18;
  const rnd = mulberry32(opts.seed ?? 9);
  const palette = Array.isArray(opts.colors) ? opts.colors : opts.colors != null ? [opts.colors] : opts.color != null ? [opts.color] : MAKARI_MIX;
  const matCache = new Map();
  const root = new THREE.Group();
  const cloud = new THREE.Group(); cloud.position.y = 1.25; root.add(cloud);
  const motes = [];
  for (let i = 0; i < count; i++) {
    const col = palette[i % palette.length];
    if (!matCache.has(col)) matCache.set(col, makariMats(col));
    const k = makeMakari(matCache.get(col));
    cloud.add(k.g);
    motes.push({
      k, r: 0.2 + rnd() * 0.6, h: (rnd() - 0.5) * 0.7, w: (0.35 + rnd() * 0.5) * (rnd() < 0.3 ? -1 : 1),
      a: rnd() * TAU, ph: rnd() * TAU, bob: 0.6 + rnd() * 1.2, tilt: (rnd() - 0.5) * 0.8, s: 0.8 + rnd() * 0.45,
    });
    k.g.scale.setScalar(motes[i].s * (opts.moteScale ?? 1));
  }
  const haze = glowSprite(palette.length === 1 ? palette[0] : 0xe8d0ff, 2.2, 0.12); cloud.add(haze);
  finish(root, 0.0009);
  applyScale(root, opts);
  const mats = [...matCache.values()].map(m => m.body);
  let spread = 1, push = 0, base = 0.3, night = 0;
  return {
    root, mats,
    glow(v) { night = clamp01(v); base = 0.3 + night * 1.1; mats.forEach(m => { m.emissiveIntensity = base; }); },
    animate(dt, st) {
      const t = st.t, wu = st.windup || 0, at = st.attack || 0, sp = st.speed || 0;
      // gather tight on wind-up, burst forward on the attack
      spread = damp(spread, 1 - wu * 0.55 + at * 0.35, 6, dt);
      push = damp(push, at * 1.2, 8, dt);
      cloud.position.y = 1.25 + Math.sin(t * 0.7) * 0.08;
      for (let i = 0; i < motes.length; i++) {
        const M = motes[i];
        M.a += dt * M.w * (1 + wu * 2.5 + sp * 0.3);
        const r = M.r * spread * (1 + Math.sin(t * 0.5 + M.ph) * 0.15);
        const x = Math.cos(M.a) * r, z = Math.sin(M.a) * r * 0.8;
        M.k.g.position.set(x, M.h * spread + Math.sin(t * M.bob + M.ph) * 0.07, z + push * (0.6 + 0.4 * Math.sin(M.ph)));
        M.k.g.rotation.set(Math.sin(t * 1.1 + M.ph) * 0.25 - sp * 0.1, M.a, M.tilt + Math.sin(t * 1.4 + M.ph) * 0.2);
        M.k.stem.rotation.x = Math.sin(t * 2 + M.ph) * 0.3;
      }
      haze.material.opacity = (0.1 + wu * 0.12 + at * 0.1) * (1 + night * 1.2);
    },
    flash(v) { mats.forEach(m => { m.emissiveIntensity = base + v * 1.5; }); },
  };
}
