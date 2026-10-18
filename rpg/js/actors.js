/* ============================================================
   Who walks the ruins.
   EIKAR are the acorn people — athletic folk of human proportion,
   a little shorter than a human, with acorn-wood skin (warm tan
   with a fine vertical grain), small dark triangles beneath the
   eyes, and an Aagac (acorn-cap hat) that is part of them, stem
   and all, with a symbol on it naming what kind of Eikar they are.
   Their hands hold their weapons: axe, sword, spear, bow, flask.
   KALO'EIK are rounder, cooler-coloured cousins whose markings
   glow faintly; a DUSKARETH VEL's markings burn void-purple when
   the Duat moves through them.
   PUNKS are the pumpkin-and-vine family; MALSTI PUNKS are the
   fist-sized ones sprouted from Duat Seedlings, already at home
   in the Duat. A MEGLA AAGAC is what a Duat Seedling most often
   grows into — and in Aakalay, one grew from the city's lord.
   ============================================================ */
import * as THREE from 'three';
import { toon, ramp, glowSprite, outlineAll, addOutline, paint, celAll } from './gfx.js';
import { lerp, clamp } from './util.js';

const TAU = Math.PI * 2;

/* ---------------- BIOLUMINESCENCE ----------------
   Every living thing on the Mbaru Tatu glows a little. Pattern materials
   come from bioKit(): pale, skin-tinted marks by day that shine at night.
   glow(v) — v = 0 bright day .. 1 full night — sets them all. It touches
   only these materials (never the flash() ones) and allocates nothing. */
export function bioKit() {
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
export function bioDots(list, sx = 1, sy = 1, sz = 1, seg = 6) {
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
export function dotRun(a, b, n, r0, r1 = r0, flat) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0, e = a.map((v, j) => v + (b[j] - v) * t);
    e.push(r0 + (r1 - r0) * t); if (flat !== undefined) e.push(flat); out.push(e);
  }
  return out;
}
export function bioMesh(geo, m, parent, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.userData.noOutline = true; parent.add(o); return o; }

function capTexture(base) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(30,15,5,0.55)'; g.lineWidth = 3;
  for (let y = 0; y < 140; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < 140; x += 14) {
    g.beginPath(); g.arc(x, y, 8, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1.5);
  return t;
}

export function skinTexture(base, repeat = 2) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(${i % 2 ? '255,240,210' : '40,20,5'},0.07)`; g.lineWidth = 2 + (i % 3);
    const x = (i * 37) % 128; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 40, x - 6, 80, x + 3, 128); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, 1);
  return t;
}

/* a limb segment hanging from y = 0 down to y = -L: rounded at both ends, tapering
   from r0 to r1 with a soft muscle swell of `bulge` centred at fraction `at` —
   organic, so arms and legs read as one drawn line instead of tubes and balls */
const limbCache = new Map();
export function limbGeo(L, r0, r1, bulge = 0, at = 0.35) {
  const key = [L, r0, r1, bulge, at].map(v => v.toFixed(4)).join();
  if (limbCache.has(key)) return limbCache.get(key);
  const pts = [], M = 14, C = 5;
  const rad = t => r0 + (r1 - r0) * t + bulge * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (t - at) / 0.95 + 0.5)))), 1.6);
  for (let i = 0; i <= C; i++) { const a = (i / C) * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.sin(a) * rad(0)), Math.cos(a) * r0 * 0.7)); }
  for (let i = 1; i < M; i++) { const t = i / M; pts.push(new THREE.Vector2(rad(t), -t * L)); }
  for (let i = 0; i <= C; i++) { const a = (i / C) * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * rad(1)), -L - Math.sin(a) * r1 * 0.8)); }
  const g = new THREE.LatheGeometry(pts.reverse(), 20);
  limbCache.set(key, g);
  return g;
}

/* ================================================================
   A small shared humanoid rig: two-bone arms solved toward a grip
   target (so hands really hold things), and stepping legs.
   Every pose vector is in the space of the arm's parent (the torso).
   ================================================================ */
const DOWN = new THREE.Vector3(0, -1, 0);
const _d = new THREE.Vector3(), _b = new THREE.Vector3(), _e = new THREE.Vector3(), _t = new THREE.Vector3(), _f = new THREE.Vector3();
const _u = new THREE.Vector3(), _x = new THREE.Vector3(), _z = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4();

/* a rotation whose +y runs along dir and whose +x faces blade */
export function gripQuat(out, dir, blade) {
  _u.copy(dir); if (_u.lengthSq() < 1e-8) _u.set(0, 1, 0); _u.normalize();
  _x.copy(blade).addScaledVector(_u, -blade.dot(_u));
  if (_x.lengthSq() < 1e-6) { _x.set(_u.y, -_u.x, 0); if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0); }
  _x.normalize(); _z.crossVectors(_x, _u);
  _m.makeBasis(_x, _u, _z);
  return out.setFromRotationMatrix(_m);
}

/* build an arm hanging from shoulder S of `parent`: upper → fore → grip */
export function rigArm(parent, s, S, o) {
  const L1 = o.L1, L2 = o.L2;
  const upper = new THREE.Group(); upper.position.copy(S); parent.add(upper);
  const um = new THREE.Mesh(limbGeo(L1, o.ru * 1.02, o.rf * 1.02, o.ru * 0.16, 0.32), o.skin); upper.add(um);
  const fore = new THREE.Group(); fore.position.y = -L1; upper.add(fore);
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(o.rf * 0.98, 16, 12), o.skin); elbow.userData.noOutline = true; fore.add(elbow);
  const fl = L2 - o.rh * 0.9;
  const fm = new THREE.Mesh(limbGeo(fl, o.rf * 1.0, o.rf * 0.72, o.rf * 0.2, 0.22), o.skin); fore.add(fm);
  if (o.cuff) {
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(o.rf * 1.28, o.rf * 1.12, fl * 0.42, 8), o.cuff); cuff.position.y = -fl * 0.62; fore.add(cuff);
  }
  const grip = new THREE.Group(); grip.position.y = -L2; fore.add(grip);
  const fist = new THREE.Mesh(new THREE.SphereGeometry(o.rh, 20, 14), o.hand || o.skin); fist.scale.set(1.2, 1.05, 1.15); fist.position.set(0, 0, 0); grip.add(fist);
  const knuck = new THREE.Mesh(new THREE.CapsuleGeometry(o.rh * 0.42, o.rh * 1.1, 2, 6), o.hand || o.skin);
  knuck.position.set(0, 0, o.rh * 0.75); grip.add(knuck);
  const thumb = new THREE.Mesh(new THREE.SphereGeometry(o.rh * 0.45, 6, 5), o.hand || o.skin); thumb.scale.set(1, 1.5, 1); thumb.position.set(-s * o.rh * 0.25, o.rh * 0.75, o.rh * 0.45); grip.add(thumb);
  return { s, S: S.clone(), L1, L2, upper, fore, grip, fist, pole: new THREE.Vector3(s * 0.75, -0.45, -0.6) };
}

/* solve the arm so its grip sits at T with the held thing along dir (its +x toward blade) */
export function poseArm(arm, T, dir, blade) {
  const L1 = arm.L1, L2 = arm.L2;
  _d.subVectors(T, arm.S); let d = _d.length();
  if (d < 1e-4) { _d.set(0, -1, 0); d = 1e-4; } else _d.divideScalar(d);
  d = clamp(d, Math.abs(L1 - L2) + 0.03, L1 + L2 - 0.002);
  const ca = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sa = Math.sqrt(1 - ca * ca);
  _b.copy(arm.pole).addScaledVector(_d, -arm.pole.dot(_d));
  if (_b.lengthSq() < 1e-6) _b.set(0, 0, -1); _b.normalize();
  _e.copy(arm.S).addScaledVector(_d, ca * L1).addScaledVector(_b, sa * L1);
  _t.copy(arm.S).addScaledVector(_d, d);
  _f.subVectors(_e, arm.S).normalize();
  arm.upper.quaternion.setFromUnitVectors(DOWN, _f);
  _f.subVectors(_t, _e).normalize();
  _q.setFromUnitVectors(DOWN, _f);
  arm.fore.quaternion.copy(arm.upper.quaternion).invert().multiply(_q);
  gripQuat(_q2, dir, blade);
  arm.grip.quaternion.copy(_q).invert().multiply(_q2);
}

/* a leg from the hip: thigh → knee → ankle with a boot */
export function rigLeg(parent, s, hip, o) {
  const thigh = new THREE.Group(); thigh.position.copy(hip); parent.add(thigh);
  const tm = new THREE.Mesh(limbGeo(o.Lt, o.rt * 1.04, o.rs * 1.08, o.rt * 0.12, 0.28), o.leg); thigh.add(tm);
  const knee = new THREE.Group(); knee.position.y = -o.Lt; thigh.add(knee);
  const sm = new THREE.Mesh(limbGeo(o.Ls, o.rs * 1.04, o.rs * 0.74, o.rs * 0.22, 0.26), o.shin || o.leg); knee.add(sm);
  const ankle = new THREE.Group(); ankle.position.y = -o.Ls; knee.add(ankle);
  if (o.bootTop) {
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(o.rs * 1.35, o.rs * 1.25, o.Ls * 0.4, 8), o.boot); cuff.position.y = o.Ls * 0.18; ankle.add(cuff);
  }
  const fl = o.foot;
  const foot = new THREE.Mesh(new THREE.CapsuleGeometry(o.fh * 0.5, fl, 3, 8), o.boot);
  foot.rotation.x = Math.PI / 2; foot.scale.set(o.fw / o.fh, 1, 1); foot.position.set(0, -o.ah + o.fh * 0.5, fl * 0.3); ankle.add(foot);
  return { s, thigh, knee, ankle };
}

/* step the legs: phase in radians, k = stride 0..1.3, air = airborne */
export function strideLegs(legs, phase, k, air, dt, stance = 0) {
  const a = 1 - Math.exp(-18 * dt);
  legs.forEach((L, i) => {
    const ph = phase + (i ? Math.PI : 0);
    let th, kn;
    if (air) { th = i ? -0.55 : 0.25; kn = i ? 0.9 : 0.55; }
    else if (k > 0.02) {
      th = -Math.sin(ph) * 0.62 * k;
      kn = (Math.max(0, Math.sin(ph - 1.1)) * 1.1 + 0.08) * Math.min(1, k * 1.2);
    } else { th = stance * (i ? -0.32 : 0.22); kn = stance * (i ? 0.38 : 0.12); }
    L.thigh.rotation.x = lerp(L.thigh.rotation.x, th, a);
    L.knee.rotation.x = lerp(L.knee.rotation.x, kn, a);
    L.ankle.rotation.x = -(L.thigh.rotation.x + L.knee.rotation.x) * (air ? 0.3 : 0.85);
  });
}

/* ---------------- weapons (grip at the origin, along +y) ---------------- */
function makeAxe() {
  const g = new THREE.Group();
  const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.023, 0.86, 7), toon(0x4a2a18)); haft.position.y = 0.23; g.add(haft);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.12, 7), toon(0x2a1a10)); wrap.position.y = -0.04; g.add(wrap);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.07); shape.quadraticCurveTo(0.14, 0.12, 0.25, 0.21); shape.quadraticCurveTo(0.2, 0, 0.25, -0.2);
  shape.quadraticCurveTo(0.14, -0.12, 0, -0.07); shape.lineTo(0, 0.07);
  const bg = new THREE.ExtrudeGeometry(shape, { depth: 0.024, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1 });
  bg.translate(0, 0, -0.012);
  const blade = new THREE.Mesh(bg, new THREE.MeshToonMaterial({ color: 0x3a3048, emissive: 0x6a2cff, emissiveIntensity: 0.25, gradientMap: ramp() }));
  blade.position.set(0.012, 0.56, 0);
  g.add(blade);
  const edge = glowSprite(0xb07aff, 0.4, 0.6); edge.position.set(0.24, 0.56, 0); g.add(edge);
  const back = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.13, 4), toon(0x2a2236)); back.rotation.z = Math.PI / 2; back.position.set(-0.07, 0.56, 0); g.add(back);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), toon(0x2a2236)); cap.position.y = 0.66; g.add(cap);
  g.userData.glow = edge; g.userData.blade = blade; g.userData.len = 0.66; g.userData.butt = -0.19;
  return g;
}

function makeSpear() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 1.72, 6), toon(0x6a4a2a)); shaft.position.y = 0.31; g.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 4), new THREE.MeshToonMaterial({ color: 0x9fd8ee, emissive: 0x2a9ad0, emissiveIntensity: 0.6, gradientMap: ramp() }));
  tip.position.y = 1.27; tip.scale.z = 0.45; g.add(tip);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.01, 4, 10), toon(0xe0c070)); tie.rotation.x = Math.PI / 2; tie.position.y = 1.14; g.add(tie);
  const gl = glowSprite(0x6ad0ff, 0.35, 0.7); gl.position.y = 1.3; g.add(gl);
  g.userData.glow = gl; g.userData.blade = tip; g.userData.len = 1.36; g.userData.butt = -0.55;
  return g;
}

function makeSword(short) {
  const g = new THREE.Group();
  const L = short ? 0.42 : 0.62;
  const sh = new THREE.Shape();
  sh.moveTo(-0.022, 0); sh.lineTo(-0.026, L * 0.55); sh.quadraticCurveTo(-0.03, L * 0.8, 0, L); sh.quadraticCurveTo(0.03, L * 0.8, 0.026, L * 0.55); sh.lineTo(0.022, 0); sh.lineTo(-0.022, 0);
  const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1 });
  bg.translate(0, 0, -0.004);
  // the flat of the blade faces z, the edges face ±x
  bg.rotateY(Math.PI / 2);
  const blade = new THREE.Mesh(bg, new THREE.MeshToonMaterial({ color: short ? 0xb8d0e0 : 0xc8ccd4, emissive: short ? 0x3a8ab8 : 0x000000, emissiveIntensity: short ? 0.35 : 0, gradientMap: ramp() }));
  blade.position.y = 0.09; g.add(blade);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.14), toon(short ? 0xc8a050 : 0x8a6a3a)); guard.position.y = 0.075; g.add(guard);
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.016, 0.13, 6), toon(0x3a2416)); hilt.position.y = 0.0; g.add(hilt);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), toon(short ? 0xc8a050 : 0x8a6a3a)); pommel.position.y = -0.075; g.add(pommel);
  const gl = glowSprite(short ? 0x9adfff : 0xffffff, 0.3, 0.5); gl.position.y = 0.09 + L * 0.7; g.add(gl);
  g.userData.glow = gl; g.userData.blade = blade; g.userData.len = 0.09 + L; g.userData.butt = -0.08;
  return g;
}

function makeBow() {
  const g = new THREE.Group();
  const R = 0.5, arc = 0.88;
  const lg = new THREE.TorusGeometry(R, 0.013, 4, 16, arc * 2); lg.rotateZ(-arc); lg.translate(-R, 0, 0); lg.rotateY(-Math.PI / 2);
  const limbs = new THREE.Mesh(lg, toon(0x6a4422)); g.add(limbs);
  const ey = R * Math.sin(arc), ez = -(R - R * Math.cos(arc));
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, ey * 2, 3), new THREE.MeshBasicMaterial({ color: 0xe8e0c8 }));
  string.position.z = ez; string.userData.noOutline = true; g.add(string);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6), toon(0x2a3a4a)); g.add(wrap);
  g.userData.len = ey; g.userData.butt = -ey; g.userData.string = string;
  return g;
}

function makeFlask(col = 0xffa040) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), new THREE.MeshToonMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, gradientMap: ramp() }));
  glass.position.y = 0.035; g.add(glass);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.045, 6), toon(0xd8e0e0)); neck.position.y = 0.08; g.add(neck);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.011, 0.018, 6), toon(0x7a5232)); cork.position.y = 0.108; g.add(cork);
  g.userData.len = 0.11; g.userData.butt = 0;
  return g;
}

function makeArrow() {
  const g = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.62, 4), toon(0xc8a878)); sh.position.y = 0.31; g.add(sh);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 4), toon(0x8ab8d0)); tip.position.y = 0.64; g.add(tip);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.003), toon(0xe8e0d0)); fl.position.y = 0.04; g.add(fl);
  return g;
}

/* ================================================================
   EIKAR
   o: skin (css), cap (css), marking (hex, glow colour for Kalo/Duat),
      markColor (hex, the dark under-eye triangles), emblem, build,
      capTall, cape, relic, weapon ('axe'|'spear'|'sword'|'bow'|'flask'|'none'),
      short (short sword), back ('bow' slung, or 'sword'), leg, foot,
      beltColor, tunic, trim, kalo (rounder, glowing markings),
      duat (true or 0..1: void-purple glow under the eyes), satchel,
      flasks (belt flask kit, default true), nur, scale
   ================================================================ */
export function buildEikar(o = {}) {
  const root = new THREE.Group();
  const kalo = !!o.kalo;
  const bw = 1 + ((o.build || 1) - 1) * 0.55 + (kalo ? 0.06 : 0);    // girth
  const HIP = 0.76;
  const body = new THREE.Group(); body.position.y = HIP; root.add(body);        // the pelvis — everything hangs from it
  const torso = new THREE.Group(); body.add(torso);                              // the spine: leans and twists

  const skinMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: skinTexture(o.skin || '#a8743e'), gradientMap: ramp(), emissive: 0x000000 });
  skinMat.userData.ink = o.skin || '#a8743e';
  const tunicMat = paint(toon(o.tunic != null ? o.tunic : new THREE.Color(o.leg || 0x4a2c1a).lerp(new THREE.Color(o.beltColor || 0x5a3420), 0.6).multiplyScalar(1.25).getHex(), { side: THREE.DoubleSide, emissive: 0x000000 }), 'cloth');
  const legMat = paint(toon(o.leg || 0x4a2c1a), 'cloth');
  const bootMat = toon(o.foot || 0x3a2212);
  const beltMat = toon(o.beltColor || 0x5a3420);
  const trimMat = toon(o.trim || 0xc8a050);
  const mats = [skinMat];

  // the tunic-clad torso: hips, a narrow waist, an athlete's chest
  const P = [[0.158, -0.17], [0.152, -0.1], [0.132, -0.01], [0.118, 0.09], [0.13, 0.18], [0.152, 0.26], [0.156, 0.32], [0.13, 0.37], [0.075, 0.405], [0.001, 0.415]];
  const tg = new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r, y)), 18);
  const tunic = new THREE.Mesh(tg, tunicMat); tunic.scale.set(bw, 1, 0.68 * (kalo ? 1.08 : 1)); torso.add(tunic);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.158, 0.012, 4, 18), trimMat); hem.rotation.x = Math.PI / 2; hem.scale.set(bw, 0.68 * (kalo ? 1.08 : 1), 1); hem.position.y = -0.165; torso.add(hem);
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), legMat); hips.scale.set(bw, 0.62, 0.7); hips.position.y = -0.04; body.add(hips);
  // a V of skin at the neckline
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.12, 8), skinMat); neck.position.y = 0.42; torso.add(neck);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 4, 12), trimMat); collar.rotation.x = Math.PI / 2; collar.position.y = 0.395; torso.add(collar);
  // belt, buckle, a strap across the chest
  const DZ = 0.68 * (kalo ? 1.08 : 1);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.017, 4, 20), beltMat); belt.rotation.x = Math.PI / 2; belt.scale.set(bw, DZ * 1.04, 1.4); belt.position.y = 0.035; torso.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.016), trimMat); buckle.position.set(0, 0.035, 0.128 * DZ * 1.04 + 0.01); torso.add(buckle);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.46, 0.152 * 2 * DZ + 0.012), beltMat); strap.position.set(0, 0.2, 0); strap.rotation.z = -0.62; torso.add(strap);

  // shoulders
  const SH = 0.355, SX = 0.168 * bw;
  for (const s of [-1, 1]) {
    const delt = new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 14), skinMat); delt.scale.set(1, 0.85, 0.95); delt.position.set(s * SX, SH, 0); delt.userData.noOutline = true; torso.add(delt);
  }

  // the head
  const head = new THREE.Group(); head.position.y = 0.43; torso.add(head);
  const HR = 0.112;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(HR, 18, 14), skinMat);
  skull.scale.set(kalo ? 1.04 : 0.94, kalo ? 1.0 : 1.07, kalo ? 1.0 : 0.98); skull.position.y = 0.12; head.add(skull);
  // jaw/chin, a touch heavier on the Eikar, softer on the Kalo
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), skinMat); jaw.scale.set(kalo ? 1.15 : 1.0, 0.75, 0.95); jaw.position.set(0, 0.06, 0.03); head.add(jaw);
  const face = new THREE.Group(); face.position.y = 0.12; head.add(face);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a0f08 });
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xfff6e6 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const duat = o.duat === true ? 1 : (o.duat || 0);
  const markGlowCol = duat ? 0x6a18d8 : (o.marking || 0xbfe8ff);
  const markMat = new THREE.MeshBasicMaterial({ color: duat ? 0x1a0628 : kalo ? new THREE.Color(o.marking || 0xbfe8ff).lerp(new THREE.Color(0x203040), 0.35) : (o.markColor || 0x2a140a) });
  const eyeR = (kalo ? 0.03 : 0.027) * 1.18, ex = kalo ? 0.047 : 0.044;   // eyes a little larger: they carry the acting
  const zOn = (x, y, r) => Math.sqrt(Math.max(0, r * r - x * x - y * y));
  const markGlows = [], eyes = [], brows = [];
  // bioluminescence: every Eikar's under-eye markings glow at night (the Kalo's faintly
  // by day too), with a few grain-dots of the same light on the backs of the forearms
  const bio = bioKit();
  const nightMark = duat ? new THREE.Color(0x6a18d8) : new THREE.Color(markMat.color).lerp(new THREE.Color(o.marking || 0xffc46a), kalo ? 1 : 0.85);
  bio.basic(markMat, 1, nightMark);
  for (const s of [-1, 1]) {
    const ez = zOn(ex, 0.005, HR) * (kalo ? 1.0 : 0.98);
    // each eye is its own group, so it can blink and glance
    const eg = new THREE.Group(); eg.position.set(s * ex, 0.008, ez - 0.006); face.add(eg);
    const white = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 20, 14), whiteMat);
    white.scale.set(1, 1.3, 0.45); white.userData.noOutline = true; eg.add(white);
    const pupil = new THREE.Group(); eg.add(pupil);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.64, 16, 12), eyeMat);
    eye.position.set(-s * 0.002, -0.002, 0.009); eye.scale.set(1, 1.35, 0.5); eye.userData.noOutline = true; pupil.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 10, 8), glintMat);
    glint.position.set(-s * 0.002 + 0.008, 0.009, 0.015); glint.userData.noOutline = true; pupil.add(glint);
    const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 8, 6), glintMat);
    glint2.position.set(-s * 0.002 - 0.006, -0.009, 0.0145); glint2.userData.noOutline = true; pupil.add(glint2);
    // a lash line over the eye: the drawn upper lid
    const lid = new THREE.Mesh(new THREE.TorusGeometry(eyeR * 1.02, 0.0034, 6, 16, Math.PI * 0.82), eyeMat);
    lid.rotation.z = Math.PI * 0.09; lid.scale.set(1, 1.28, 1); lid.position.z = 0.004; lid.userData.noOutline = true; eg.add(lid);
    eyes.push({ g: eg, pupil, s });
    // the brow — a curved stroke that rises, knits and falls with the mood
    const bg2 = new THREE.Group(); bg2.position.set(s * ex, 0.052, ez - 0.004); bg2.rotation.y = s * 0.4; face.add(bg2);
    const brow = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0055, 6, 12, Math.PI * 0.6), eyeMat);
    brow.rotation.z = Math.PI * 0.2; brow.position.y = -0.024; brow.userData.noOutline = true; bg2.add(brow);
    const browSet = s * (kalo ? -0.05 : 0.18);
    bg2.rotation.z = browSet; brows.push({ g: bg2, s, z0: browSet });
    // the markings beneath the eyes: small downward triangles
    const my = -0.036, mz = zOn(ex + 0.004, my, HR) + 0.004;
    const tri = new THREE.Mesh(new THREE.CircleGeometry(kalo ? 0.019 : 0.017, 3, -Math.PI / 2), markMat);
    tri.scale.set(0.85, 1.25, 1);
    tri.position.set(s * (ex + 0.004), my, mz); tri.rotation.set(0.32, s * 0.42, 0); tri.userData.noOutline = true; face.add(tri);
    const gl = glowSprite(kalo || duat ? markGlowCol : (o.marking || 0xffc46a), duat ? 0.13 : 0.09, duat ? 0.6 : 0.4); gl.position.set(s * (ex + 0.004), my, mz + 0.008); face.add(gl); markGlows.push(gl);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), skinMat); nose.scale.set(0.9, 1.25, 0.9); nose.position.set(0, -0.018, HR * 0.98); face.add(nose);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0035, 3, 8, Math.PI * 0.8), eyeMat);
  mouth.rotation.z = Math.PI * 1.1; mouth.position.set(0, -0.06, 0.104); mouth.userData.noOutline = true; face.add(mouth);
  // the open mouth behind the smile line, shown only as they talk
  const mouthIn = new THREE.Mesh(new THREE.SphereGeometry(0.016, 14, 10), new THREE.MeshBasicMaterial({ color: 0x3a1410 }));
  mouthIn.scale.set(1.15, 0.05, 0.4); mouthIn.position.set(0, -0.064, 0.1); mouthIn.userData.noOutline = true; face.add(mouthIn);

  // the Aagac: acorn-cap hat that is part of them, with its stem and the kind-symbol on its brow
  const capMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: capTexture(o.cap || '#4a2a14'), gradientMap: ramp(), emissive: 0x000000 });
  capMat.userData.ink = o.cap || '#4a2a14';
  mats.push(capMat, tunicMat);
  const hat = new THREE.Group(); hat.position.set(0, 0.155, -0.004); head.add(hat);
  const CR = kalo ? 0.13 : 0.124, ct = (o.capTall || 0.62) * (kalo ? 1.0 : 1.12);
  const capMesh = new THREE.Mesh(new THREE.SphereGeometry(CR, 20, 10, 0, TAU, 0, Math.PI * 0.5), capMat);
  capMesh.scale.set(1, ct, 1); hat.add(capMesh);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(CR - 0.004, 0.016, 6, 22), capMat); rim.rotation.x = Math.PI / 2; hat.add(rim);
  hat.rotation.x = -0.12;
  const stemMat = toon(o.stem || 0x4a2c18);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.015, 0.06, 6), stemMat); stem.position.set(0.004, CR * ct + 0.025, 0); stem.rotation.z = -0.35; hat.add(stem);
  const stemTip = new THREE.Mesh(new THREE.SphereGeometry(0.01, 5, 4), stemMat); stemTip.position.set(0.016, CR * ct + 0.054, 0); hat.add(stemTip);
  const emb = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), new THREE.MeshBasicMaterial({ color: o.emblem || 0xf3dca0 }));
  emb.position.set(0, CR * ct * 0.42, CR * 0.92); emb.rotation.x = -0.5; emb.userData.noOutline = true; hat.add(emb);

  // the Tukang relic (or any relic) at the belt
  let relic = null;
  if (o.relic) {
    relic = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), new THREE.MeshBasicMaterial({ color: o.relic }));
    relic.position.set(0, 0.035, 0.128 * DZ * 1.04 + 0.04); relic.userData.noOutline = true; torso.add(relic);
    const rg = glowSprite(o.relic, 0.22, 0.85); rg.position.copy(relic.position); torso.add(rg); relic.userData.glow = rg;
  }

  // the flask kit at the left hip
  const flaskCol = o.flaskColor || (kalo ? 0x7ad8ff : 0xffa040);
  if (o.flasks !== false) {
    for (let i = 0; i < 2; i++) {
      const f = makeFlask(flaskCol); f.scale.setScalar(0.8); f.position.set(0.1 * bw + i * 0.035, -0.03 - i * 0.012, 0.07 - i * 0.05); f.rotation.z = 0.15; torso.add(f);
    }
  }
  if (o.satchel) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.16), toon(o.satchel === true ? 0x7a5a3a : o.satchel)); bag.position.set(-0.155 * bw, -0.05, 0.0); torso.add(bag);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.05, 0.165), beltMat); flap.position.set(-0.155 * bw, 0.025, 0); torso.add(flap);
  }

  // a cape from the shoulders, for the swagger (it can be put on and taken off: setCape below)
  let cape = null, capeG = null, capeMat = null, wing = null;
  function makeCape(color) {
    capeG = new THREE.Group(); torso.add(capeG);
    capeMat = paint(toon(color, { side: THREE.DoubleSide }), 'cloth');
    const W = 0.36, LEN = 0.82;
    const cg = new THREE.PlaneGeometry(W, LEN, 4, 8); cg.translate(0, -LEN / 2, 0);
    const pp = cg.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), y = pp.getY(i), tt = -y / LEN;
      const fx = x * (bw + tt * 0.5);
      pp.setX(i, fx); pp.setZ(i, -Math.pow(fx / (W * 0.6), 2) * 0.06 + Math.pow(x / (W / 2), 2) * 0.06 * (1 - tt));
    }
    cg.computeVertexNormals();
    cape = new THREE.Mesh(cg, capeMat);
    cape.position.set(0, 0.39, -0.1); capeG.add(cape);
    for (const s of [-1, 1]) {
      const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), toon(0xe6b84a)); clasp.position.set(s * 0.1, 0.375, 0.07); capeG.add(clasp);
    }
    const mantle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 5, 14, Math.PI), capeMat); mantle.rotation.x = Math.PI / 2; mantle.rotation.z = Math.PI; mantle.scale.set(bw * 1.15, 0.85, 1); mantle.position.set(0, 0.385, -0.0); capeG.add(mantle);
    /* gliding, the cape becomes a wing: arms flung straight out, the cloth stretched from wrist to wrist across the
       shoulders and down to the ankles, scalloped between — drawn in the torso's own space, so it moves with him */
    const HX = SX + 0.5, sh = new THREE.Shape();
    sh.moveTo(-HX - 0.03, SH + 0.01);
    sh.lineTo(-0.12, SH + 0.05); sh.lineTo(0.12, SH + 0.05); sh.lineTo(HX + 0.03, SH + 0.01);
    sh.quadraticCurveTo(HX - 0.06, SH - 0.2, HX - 0.24, SH - 0.32);       // the scallops of the trailing edge, wrist to ankle
    sh.quadraticCurveTo(0.3, -0.12, 0.24, -0.42);
    sh.quadraticCurveTo(0.17, -0.62, 0.1, -0.78); sh.lineTo(0, -0.72); sh.lineTo(-0.1, -0.78);
    sh.quadraticCurveTo(-0.17, -0.62, -0.24, -0.42);
    sh.quadraticCurveTo(-0.3, -0.12, -HX + 0.24, SH - 0.32);
    sh.quadraticCurveTo(-HX + 0.06, SH - 0.2, -HX - 0.03, SH + 0.01);
    const wg = new THREE.ShapeGeometry(sh, 10), wp = wg.attributes.position;
    for (let i = 0; i < wp.count; i++) { const x = wp.getX(i), y = wp.getY(i); wp.setZ(i, -0.12 - 0.07 * Math.cos(x / HX * Math.PI * 0.5) * (1 - Math.abs(y - SH) * 0.3)); }   // filled with wind
    wg.computeVertexNormals();
    wing = new THREE.Mesh(wg, capeMat); wing.visible = false; capeG.add(wing);
    if (built) { capeG.traverse(m => { if (m.isMesh && m.name !== 'outline') { m.castShadow = true; addOutline(m, 0.012); } }); celAll(capeG); }   // (put on later: inked and cel-drawn like the rest)
  }
  let built = false;
  const outfit = {};
  if (o.cape) makeCape(o.cape);

  // arms and hands
  const armOpts = { L1: 0.25, L2: 0.27, ru: 0.043 * (kalo ? 1.08 : 1), rf: 0.036 * (kalo ? 1.08 : 1), rh: 0.04, skin: skinMat, cuff: beltMat };
  const arms = [-1, 1].map(s => rigArm(torso, s, new THREE.Vector3(s * SX, SH - 0.01, 0), armOpts));
  {
    const grainM = bio.mat(duat ? 0x9a5aff : (o.marking || 0xffc46a), new THREE.Color(o.skin || '#a8743e').getHex(), 0.2, 0.0, 1.8);
    for (const a of arms) {
      const rf = armOpts.rf, L = [];
      for (let k = 0; k < 4; k++) L.push([-a.s * rf * 0.55, -0.07 - k * 0.035, -rf * 0.8, -a.s * 0.6, 0, -0.8, 0.0075 - k * 0.0008, 0.5]);
      bioMesh(bioDots(L), grainM, a.fore);
    }
  }
  // legs and boots
  const legOpts = { Lt: 0.36, Ls: 0.34, rt: 0.06 * (kalo ? 1.06 : 1), rs: 0.044, leg: legMat, shin: legMat, boot: bootMat, bootTop: true, foot: 0.1, fh: 0.06, fw: 0.075, ah: 0.06 };
  const legs = [-1, 1].map(s => rigLeg(body, s, new THREE.Vector3(s * 0.08 * bw, -0.02, 0), legOpts));

  // the weapon, in hand. The bow is held in the left hand; everything else in the right.
  const kind = o.weapon || 'axe';
  const W = kind === 'bow' ? arms[1] : arms[0], Fr = kind === 'bow' ? arms[0] : arms[1];
  const weapon = kind === 'spear' ? makeSpear() : kind === 'sword' ? makeSword(!!o.short) : kind === 'bow' ? makeBow() : kind === 'flask' ? makeFlask(flaskCol) : kind === 'none' ? new THREE.Group() : makeAxe();
  const wPivot = W.upper, wHold = W.grip;
  wHold.add(weapon);
  if (kind === 'flask') weapon.position.y = -0.03;
  // a flask in the free hand, only while drinking
  const drinkFlask = makeFlask(flaskCol); drinkFlask.position.y = -0.03; drinkFlask.visible = false; Fr.grip.add(drinkFlask);
  // an arrow to nock, for archers
  let arrow = null;
  if (kind === 'bow') { arrow = makeArrow(); arrow.visible = false; Fr.grip.add(arrow); }

  // gear on the back
  const backItem = o.back || null;
  if (backItem === 'bow') {
    const bb = makeBow(); bb.position.set(0, 0.2, -0.125 * DZ / 0.68); bb.rotation.set(0, Math.PI, 0.62); torso.add(bb);
    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.34, 8), toon(o.quiver || 0x5a3a24)); quiver.position.set(0.09, 0.22, -0.135 * DZ / 0.68); quiver.rotation.z = -0.45; torso.add(quiver);
    for (let i = 0; i < 3; i++) {
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.06, 3), toon(0xe8e0d0)); fl.position.set(0.17 + i * 0.012, 0.39 - i * 0.012, -0.135 * DZ / 0.68 + (i - 1) * 0.015); fl.rotation.z = -0.45; torso.add(fl);
    }
  } else if (backItem === 'sword') {
    const sb = makeSword(false); sb.position.set(0, 0.16, -0.125 * DZ / 0.68); sb.rotation.set(0, 0, Math.PI + 0.6); torso.add(sb);
  }

  // Phorus carries a little Nur-light
  let nur = null;
  if (o.nur) { nur = glowSprite(o.nur, 0.5, 0.95); nur.position.set(0.5, 1.7, -0.2); root.add(nur); }

  outlineAll(root, 0.012);
  celAll(root);   // drawn like the film's cast: crisp two-tone shading
  root.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; });
  const rootScale = o.scale || 1;
  root.scale.setScalar(rootScale);
  const own = new Set(root.children);
  built = true;

  // pose scratch (no per-frame allocation)
  const wT = new THREE.Vector3(), wD = new THREE.Vector3(), wB = new THREE.Vector3();
  const fT = new THREE.Vector3(), fD = new THREE.Vector3(), fB = new THREE.Vector3();
  const iT = new THREE.Vector3(), iD = new THREE.Vector3(), iB = new THREE.Vector3();
  const sT = new THREE.Vector3(), sD = new THREE.Vector3(), sB = new THREE.Vector3();
  const synth = { kind: 1, p: 0 };
  const defKind = kind === 'spear' || kind === 'none' || kind === 'flask' ? 4 : kind === 'axe' ? 3 : 1;
  const s = W.s;                 // weapon-hand side (-1 right, +1 left)
  let phase = 0, swingBlend = 0, glide = 0, twist = 0, lean = 0, glowA = 0, rideK = 0, kS = 0, airK = 0;
  // the hand-drawn acting: squash & stretch, follow-through, blinks, glances, brows, talk
  let sq = 0, sqV = 0, lastY = null, wasAir = false, vyS = 0;
  let headX = 0, headY = 0, headXV = 0, hatX = -0.12, hatXV = 0;
  let blinkT = 1.5 + Math.random() * 3, blink = 0, lookX = 0, lookY = 0, lookT = 1, lookTX = 0, lookTY = 0, browK = 0, talkK = 0;
  const seed = Math.random() * 100;
  bio.glow(0);

  /* ---- the wardrobe's pieces (see setOutfit) ---- */
  const inkG = g => { g.traverse(m => { if (m.isMesh && m.name !== 'outline' && !m.userData.noOutline) { m.castShadow = true; addOutline(m, 0.012); } }); celAll(g); };
  const seamMat = c => new THREE.MeshBasicMaterial({ color: c });
  const DZW = 0.68 * (kalo ? 1.08 : 1);
  function buildPiece(slot, look, glow, key) {
    const m = paint(toon(0xffffff, glow != null ? { emissive: glow, emissiveIntensity: 0.22 } : {}), 'cloth'), metal = toon(0x9a9ca6), dark = toon(0x2a1a10), gs = [];
    const seam = glow != null ? seamMat(glow) : null;
    const glowLine = (g, geo, x, y, z, rx = 0, ry = 0, rz = 0) => { if (!seam) return; const q = new THREE.Mesh(geo, seam); q.position.set(x, y, z); q.rotation.set(rx, ry, rz); q.userData.noOutline = true; g.add(q); };
    if (slot === 'body') {
      const g = new THREE.Group();
      const VP = look === 'robe' ? [[0.17, -0.2], [0.15, -0.05], [0.13, 0.09], [0.14, 0.18], [0.16, 0.26], [0.163, 0.32], [0.136, 0.37]] : [[0.166, -0.12], [0.14, -0.01], [0.126, 0.09], [0.138, 0.18], [0.16, 0.26], [0.162, 0.32], [0.136, 0.365]];
      const vest = new THREE.Mesh(new THREE.LatheGeometry(VP.map(([r, y]) => new THREE.Vector2(r, y)), 18), m); vest.scale.set(bw * 1.04, 1, DZW * 1.08); g.add(vest);
      const padR = look === 'plate' ? 0.09 : look === 'robe' ? 0 : 0.07;
      for (const q of [-1, 1]) if (padR) { const pad = new THREE.Mesh(new THREE.SphereGeometry(padR, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), look === 'vest' ? m : m); pad.scale.set(1.15, look === 'plate' ? 0.8 : 0.6, 1.05); pad.position.set(q * SX, SH + 0.01, 0); pad.rotation.z = -q * 0.35; g.add(pad); }
      if (look === 'chain') for (let k = 0; k < 6; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.152 - Math.abs(k - 3) * 0.004, 0.004, 4, 24), metal); ring.rotation.x = Math.PI / 2; ring.scale.set(bw * 1.06, DZW * 1.1, 1); ring.position.y = -0.06 + k * 0.065; ring.userData.noOutline = true; g.add(ring); }
      if (look === 'plate') for (let row = 0; row < 4; row++) for (let k = -2; k <= 2; k++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.014), m); const a = k * 0.32; pl.position.set(Math.sin(a) * 0.15 * bw, 0.0 + row * 0.07, Math.cos(a) * 0.15 * DZW * 1.12); pl.rotation.y = a; pl.rotation.x = -0.15; g.add(pl); }
      if (look === 'robe') { const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * bw, 0.24 * bw, 0.5, 16, 1, true), m); skirt.material.side = THREE.DoubleSide; skirt.scale.z = DZW * 1.1; skirt.position.y = -0.42; g.add(skirt); gs.push(skirt); const sash = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.016, 5, 20), toon(0xd8b060)); sash.rotation.x = Math.PI / 2; sash.scale.set(bw * 1.05, DZW * 1.12, 1); sash.position.y = 0.0; g.add(sash); }
      if (look === 'vest' || look === 'chain') for (let k = 0; k < 4; k++) { const lace = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01), dark); lace.position.set(0, 0.02 + k * 0.07, 0.118 * DZW * 1.12 + 0.012); lace.rotation.z = (k % 2 ? 0.5 : -0.5); g.add(lace); }
      glowLine(g, new THREE.BoxGeometry(0.012, 0.36, 0.012), 0, 0.12, 0.13 * DZW * 1.12 + 0.01);
      glowLine(g, new THREE.TorusGeometry(0.14, 0.005, 4, 20), 0, 0.27, 0, Math.PI / 2);
      inkG(g); torso.add(g); gs.unshift(g);
      // the robe's skirt hangs from the hips, not the chest (the torso leans; the skirt should hang)
      if (look === 'robe') { const sk = gs.pop(); g.remove(sk); const sg = new THREE.Group(); sg.add(sk); sk.position.y = -0.22; body.add(sg); gs.push(sg); }
    } else if (slot === 'hands') {
      for (const a of arms) {
        const g = new THREE.Group(), fl = armOpts.L2 - armOpts.rh * 0.9, rf = armOpts.rf;
        if (look === 'wrap') for (let k = 0; k < 6; k++) { const w = new THREE.Mesh(new THREE.TorusGeometry(rf * 1.18 - k * 0.002, 0.008, 4, 10), m); w.rotation.x = Math.PI / 2 + 0.2; w.position.y = -fl * (0.45 + k * 0.1); g.add(w); }
        else {
          const big = look === 'gauntlet' ? 1.12 : 1;
          const br = new THREE.Mesh(new THREE.CylinderGeometry(rf * 1.38 * big, rf * 1.22 * big, fl * (look === 'gauntlet' ? 0.75 : 0.62), 10), m); br.position.y = -fl * (look === 'gauntlet' ? 0.6 : 0.55); g.add(br);
          if (look === 'gauntlet') {
            const cuffF = new THREE.Mesh(new THREE.CylinderGeometry(rf * 1.75, rf * 1.4, fl * 0.16, 10), m); cuffF.position.y = -fl * 0.24; g.add(cuffF);
            const kn = new THREE.Mesh(new THREE.BoxGeometry(armOpts.rh * 2.3, armOpts.rh * 0.7, armOpts.rh * 1.2), m); kn.position.set(0, -armOpts.L2, armOpts.rh * 0.75); g.add(kn);
          } else for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(rf * 1.36, 0.004, 4, 10), toon(0xd8c098)); l.rotation.x = Math.PI / 2; l.position.y = -fl * (0.34 + k * 0.2); g.add(l); }
        }
        glowLine(g, new THREE.TorusGeometry(rf * 1.42, 0.006, 4, 12), 0, -fl * 0.62, 0, Math.PI / 2);
        inkG(g); a.fore.add(g); gs.push(g);
      }
    } else {
      for (const L of legs) {
        const g = new THREE.Group(), Ls = legOpts.Ls, rs = legOpts.rs;
        if (look === 'sandal') {
          for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.TorusGeometry(rs * 1.05, 0.006, 4, 10), m); st.rotation.x = Math.PI / 2; st.position.y = -Ls * (0.72 + k * 0.08); g.add(st); }
          const sole = new THREE.Mesh(new THREE.BoxGeometry(legOpts.fw * 1.5, 0.018, legOpts.foot * 1.9), m); sole.position.set(0, -Ls - legOpts.ah + 0.006, legOpts.foot * 0.3); g.add(sole);
        } else {
          const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rs * 1.42, rs * 1.3, Ls * 0.62, 10), m); shaft.position.y = -Ls * 0.62; g.add(shaft);
          const toe = new THREE.Mesh(new THREE.CapsuleGeometry(legOpts.fh * 0.56, legOpts.foot * 1.05, 3, 8), m); toe.rotation.x = Math.PI / 2; toe.scale.set(legOpts.fw / legOpts.fh * 1.08, 1, 1.05); toe.position.set(0, -Ls - legOpts.ah + legOpts.fh * 0.5, legOpts.foot * 0.3); g.add(toe);
          if (look === 'greave') {
            const plate = new THREE.Mesh(new THREE.CylinderGeometry(rs * 1.62, rs * 1.48, Ls * 0.7, 10, 1, true, -1.1, 2.2), m); plate.material.side = THREE.DoubleSide; plate.position.y = -Ls * 0.5; g.add(plate);
            const cop = new THREE.Mesh(new THREE.SphereGeometry(rs * 1.3, 10, 6), m); cop.scale.set(1, 0.8, 0.7); cop.position.set(0, 0, rs * 0.7); g.add(cop);
          } else { const fold = new THREE.Mesh(new THREE.TorusGeometry(rs * 1.45, 0.012, 5, 12), m); fold.rotation.x = Math.PI / 2; fold.position.y = -Ls * 0.31; g.add(fold); }
        }
        glowLine(g, new THREE.BoxGeometry(0.008, Ls * 0.5, 0.008), 0, -Ls * 0.55, rs * 1.6);
        inkG(g); L.knee.add(g); gs.push(g);
      }
    }
    return { gs, m, key };
  }
  /* the cloak's own trim: a fur collar, rows of feathers, and a Relic's glow in the cloth */
  let cloakTrim = null;
  function setCloakLook(look, glow) {
    if (cloakTrim) { capeG.remove(cloakTrim); cloakTrim = null; }
    capeMat.emissive.set(glow ?? 0x000000); capeMat.emissiveIntensity = glow != null ? 0.3 : 0;
    if (!look && glow == null) return;
    cloakTrim = new THREE.Group();
    if (look === 'fur') { const fur = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 6, 16, Math.PI * 1.2), capeMat); fur.rotation.x = Math.PI / 2; fur.rotation.z = Math.PI * 0.9; fur.scale.set(bw * 1.2, 1, 0.9); fur.position.set(0, 0.395, -0.01); cloakTrim.add(fur); }
    if (look === 'feather') for (let row = 0; row < 4; row++) for (let k = -2; k <= 2; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), capeMat); f.rotation.x = Math.PI; f.position.set(k * 0.075 * (1 + row * 0.15), 0.3 - row * 0.17, -0.13 - row * 0.03); cloakTrim.add(f); }
    if (glow != null) { const line = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.7, 0.01), seamMat(glow)); line.position.set(0, 0.03, -0.14); line.userData.noOutline = true; cloakTrim.add(line); }
    inkG(cloakTrim); capeG.add(cloakTrim);
  }

  const A = {
    cartoon: true,   // squash & stretch is built into this rig
    root, body, torso, head, hat, weapon, wPivot, wHold, relic, nur, mats, arms, legs,
    get cape() { return capeG; },
    /* put a cape on (a colour) or take it off (null) */
    setCape(color) {
      if (color == null) { if (capeG) capeG.visible = false; return; }
      if (!capeG) makeCape(color);
      capeMat.color.set(color); capeG.visible = true;
    },
    get hasCape() { return !!(capeG && capeG.visible); },
    /* what else he wears, each shown only while it's on. Each slot takes null (nothing) or { c: colour, look, glow }:
       body — 'vest' (a jerkin, pads), 'chain' (ringmail), 'plate' (scales/plates, big pauldrons), 'robe' (to the knee);
       hands — 'bracer', 'gauntlet' (plated, with knuckle guards), 'wrap'; feet — 'boot', 'greave' (shin plates), 'sandal'.
       glow: a Relic's Hurst in it — the piece glows faintly, with bright seams. */
    setOutfit(o2 = {}) {
      for (const slot of ['body', 'hands', 'feet']) {
        if (!(slot in o2)) continue;
        let spec = o2[slot]; if (spec != null && typeof spec !== 'object') spec = { c: spec };
        const cur = outfit[slot], look = spec ? spec.look || (slot === 'body' ? 'vest' : slot === 'hands' ? 'bracer' : 'boot') : null, key = spec ? look + ':' + (spec.glow ?? '') : null;
        if (cur && cur.key !== key) { cur.gs.forEach(g => g.parent && g.parent.remove(g)); outfit[slot] = null; }
        if (!spec) continue;
        if (!outfit[slot]) outfit[slot] = buildPiece(slot, look, spec.glow, key);
        outfit[slot].m.color.set(spec.c ?? 0x7a5a3a);
      }
      if ('cloakLook' in o2 && capeG) setCloakLook(o2.cloakLook, o2.cloakGlow);
    },
    /* st: { speed, onGround, t, swing: null | { kind: 1|2|3|4, p: 0..1 } | number, windup, attack,
             heat, drink, talking, thrown, duat } */
    animate(dt, st) {
      const t = st.t || 0, spd = st.speed || 0;
      const onGround = st.onGround !== false;
      const air = !onGround;
      // the stride follows a smoothed speed, so starting, stopping and slowing blend instead of snapping between walk and idle
      kS = lerp(kS, onGround ? clamp(spd / 7, 0, 1.3) : 0, 1 - Math.exp(-10 * dt));
      airK = lerp(airK, air ? 1 : 0, 1 - Math.exp(-14 * dt));
      const k = kS, moving = k > 0.035, walkK = clamp(k / 0.15, 0, 1);   // walkK: 0 standing .. 1 properly under way
      phase += dt * (3 + Math.max(spd, k * 7) * 0.95) * walkK;
      let gliding = false;
      for (let i = 0; i < root.children.length; i++) { const c = root.children[i]; if (c.isGroup && c.visible && !own.has(c)) { gliding = true; break; } }
      if (st.glide != null) gliding = !!st.glide;
      glide = lerp(glide, gliding ? 1 : 0, 1 - Math.exp(-(gliding ? 7 : 10) * dt));
      // vertical speed, read off the root, drives stretch going up and the squash on landing
      const ry = root.position.y, vy = lastY === null || dt <= 0 ? 0 : clamp((ry - lastY) / dt, -30, 30); lastY = ry;
      vyS = lerp(vyS, vy, 1 - Math.exp(-12 * dt));
      if (wasAir && onGround && airK > 0.4) sqV -= clamp(0.9 + Math.abs(vyS) * 0.12, 0.9, 2.6);   // land: squash
      if (!wasAir && air) sqV += 1.2;                                                                // take off: stretch
      wasAir = air;

      // which swing (main passes {kind,p}; others pass windup/attack numbers)
      let sw = st.swing && typeof st.swing === 'object' ? st.swing : null;
      const atk = Math.max(st.attack || 0, typeof st.swing === 'number' ? st.swing : 0), wind = st.windup || 0;
      let want = sw ? 1 : 0;
      if (!sw && (atk > 0.02 || wind > 0.02)) { synth.kind = defKind; synth.p = atk > 0.02 ? 0.5 + 0.5 * (1 - atk) : 0; sw = synth; want = atk > 0.02 ? 1 : Math.min(1, wind * 1.6); }
      swingBlend = lerp(swingBlend, want, 1 - Math.exp(-(want > swingBlend ? 30 : 8) * dt));
      const b = swingBlend;

      // ---- the weapon hand at rest ----
      const sway = lerp(Math.sin(t * 1.6) * 0.008, Math.sin(phase) * 0.22 * k, walkK);   // arms swing against the legs
      if (kind === 'spear') { iT.set(s * 0.25, -0.06, 0.11 + sway * 0.5); iD.set(0, 1, 0.1); iB.set(1, 0, 0); }
      else if (kind === 'bow') { iT.set(s * 0.24, -0.12, 0.08 + sway); iD.set(0, 1, 0.5); iB.set(1, 0, 0); }
      else if (kind === 'sword') { iT.set(s * 0.24, -0.15, 0.1 + sway); iD.set(s * 0.12, -0.25, 1); iB.set(0, -1, 0); }
      else if (kind === 'axe') { iT.set(s * 0.2, 0.1 + sway * 0.2, 0.16); iD.set(s * 0.22, 0.72, -0.62); iB.set(s * 0.6, 0.4, 0.6); }
      else { iT.set(s * 0.23, -0.15, 0.04 + sway); iD.set(0, 1, 0.2); iB.set(-s, 0, 0); }

      // ---- the swing ----
      let tw = 0, ln = moving ? 0.16 * k : 0, crouch = 0, stance = 0;
      if (sw) {
        const p = clamp(sw.p, 0, 1), e = 1 - Math.pow(1 - p, 2.4);
        stance = 1;
        if (kind === 'bow') {
          sT.set(0.08, 0.36, 0.46); sD.set(-0.12, 1, 0); sB.set(1, 0, 0); tw = -0.35;
        } else if (sw.kind === 1 || sw.kind === 2) {
          const th = sw.kind === 1 ? lerp(-2.0, 1.9, e) : lerp(1.9, -2.0, e);
          sT.set(-0.06 + Math.sin(th) * 0.46, 0.14, Math.cos(th) * 0.46); sD.set(Math.sin(th), 0.08, Math.cos(th));
          if (sw.kind === 1) sB.set(Math.cos(th), 0, -Math.sin(th)); else sB.set(-Math.cos(th), 0, Math.sin(th));
          tw = th * 0.32; ln = 0.1;
        } else if (sw.kind === 3) {
          const ph = lerp(-2.4, 0.75, e);
          sD.set(0, -Math.sin(ph), Math.cos(ph));
          sT.set(-0.03, 0.42, 0.02).addScaledVector(sD, 0.34);
          sB.set(0, -Math.cos(ph), -Math.sin(ph));
          ln = lerp(-0.15, 0.4, e); crouch = 0.07 * e;
        } else {
          const th = Math.sin(p * Math.PI);
          sT.set(s * 0.1, 0.24, lerp(0.02, 0.5, th)); sD.set(0, 0.03, 1); sB.set(-s, 0, 0);
          if (kind === 'none' || kind === 'flask') sD.set(0, 1, 0.3);
          tw = s * 0.35 * th; ln = 0.15 * th;
        }
        wT.lerpVectors(iT, sT, b); wD.lerpVectors(iD, sD, b); wB.lerpVectors(iB, sB, b);
      } else { wT.copy(iT); wD.copy(iD); wB.copy(iB); }
      if (glide > 0.01) { sT.set(s * (SX + 0.5), SH + 0.01, -0.03); wT.lerp(sT, glide); sD.set(s, 0, 0); wD.lerp(sD, glide); }   // arms flung straight out

      // ---- the free hand ----
      drinkFlask.visible = !!st.drink;
      if (arrow) arrow.visible = !!sw && b > 0.5;
      if (st.drink) { fT.set(-s * 0.03, 0.5, 0.15); fD.set(0, 0.45, -1); fB.set(1, 0, 0); ln = -0.12; }
      else if (sw && kind === 'bow') { fT.set(-0.02, 0.43, 0.1); fD.set(0, 0, 1); fB.set(0, 1, 0); }
      else if (sw && sw.kind === 3 && kind !== 'none' && kind !== 'flask') { fT.copy(wT).addScaledVector(fD.copy(wD).normalize(), -0.12); fD.copy(wD); fB.copy(wB); }
      else if (st.thrown) { fT.set(-s * 0.18, 0.8, 0.22); fD.set(0, 1, 0); fB.set(-s, 0, 0); }
      else if (st.talking) { fT.set(-s * 0.2, 0.08 + Math.sin(t * 4.3) * 0.05, 0.26 + Math.sin(t * 2.7) * 0.04); fD.set(-s * 0.2, 1, 0.4); fB.set(-s, 0, 0); }
      else {
        fT.set(-s * 0.23, -0.15, 0.03 - sway); fD.set(0, 1, 0.2); fB.set(s, 0, 0);
        if (sw) {
          if (sw.kind === 1 || sw.kind === 2) { sT.set(-s * 0.36, 0.08, -0.04); fT.lerp(sT, b); }
          else { sT.set(-s * 0.26, 0.02, -0.12); fT.lerp(sT, b); }
        }
      }
      if (glide > 0.01) { sT.set(-s * (SX + 0.5), SH + 0.01, -0.03); fT.lerp(sT, glide); fD.lerp(sD.set(-s, 0, 0), glide); }
      if ((st.ride || st.reins) && !sw && !st.drink) { sT.set(-s * 0.12, -0.02, 0.3); fT.lerp(sT, 0.85); fD.set(0, 0.4, 1); fB.set(s, 0, 0); }
      if (!gliding && !sw && airK > 0.01) { fT.x += -s * 0.08 * airK; fT.y += 0.12 * airK; }

      // ---- torso, head, legs ----
      twist = lerp(twist, tw * b, 1 - Math.exp(-20 * dt));
      lean = lerp(lean, ln * (sw ? b : 1) * (1 - glide), 1 - Math.exp(-12 * dt));
      // a real walk: the hips turn with each step and the shoulders turn against them
      const hipYaw = Math.sin(phase) * 0.11 * k * walkK;
      body.rotation.y = hipYaw;
      torso.rotation.set(lean, twist - hipYaw * 1.9, Math.sin(phase) * 0.04 * k * walkK);
      body.rotation.x = glide * 1.42;   // gliding: laid out flat along the way he's flying, like a hero in the old songs
      body.rotation.z = -Math.sin(phase) * 0.045 * k * walkK + Math.sin(t * 0.7 + seed) * 0.012 * (1 - walkK);   // hips sway with the stride; idle weight shift
      const bob = lerp(Math.sin(t * 2.2) * 0.006, Math.abs(Math.cos(phase)) * 0.045 * k, walkK);
      body.position.y = HIP + bob - crouch - (sw ? 0.03 * b : 0);
      // squash & stretch: a spring, kicked by landings and take-offs, held long while rising, volume kept
      const sqTarget = air ? clamp(vyS * 0.012, -0.05, 0.08) : 0;
      sqV += ((sqTarget - sq) * 140 - sqV * 13) * dt; sq += sqV * dt; sq = clamp(sq, -0.16, 0.14);
      const breath = Math.sin(t * 2.3 + seed) * 0.012 * (1 - walkK * 0.6);
      torso.scale.set(1 - sq * 0.5 - breath * 0.3, 1 + sq + breath, 1 - sq * 0.5 + breath * 0.4);
      body.position.y -= Math.max(0, -sq) * 0.35;
      // the head lags the body and overshoots it a little: follow-through
      const hxT = (st.drink ? -0.35 : (st.talking ? Math.sin(t * 6) * 0.06 : 0) - lean * 0.5) + Math.sin(phase * 2 - 0.9) * 0.05 * k * walkK + sq * 0.6;
      const hyT = -twist * 0.6 + Math.sin(t * 0.5 + seed) * 0.18 * (1 - walkK) * (1 - b) + lookX * 0.35;
      headXV += ((hxT - headX) * 160 - headXV * 16) * dt; headX += headXV * dt;
      headY = lerp(headY, hyT, 1 - Math.exp(-9 * dt));
      head.rotation.set(headX - glide * 1.15, headY + hipYaw * 0.9, -body.rotation.z * 0.6);   // (flat out, he still looks ahead)   // the head stays on the road ahead
      // the cap rides on the head and trails its motion
      hatXV += ((-0.12 - headXV * 0.035 + sqV * 0.04 - hatX) * 120 - hatXV * 9) * dt; hatX += hatXV * dt;
      hat.rotation.x = clamp(hatX, -0.4, 0.2);
      hat.rotation.z = Math.sin(t * 1.7) * 0.02 - body.rotation.z * 0.5;
      // eyes: blink every few seconds (twice now and then), glance about, settle forward in a fight
      blinkT -= dt;
      if (blinkT <= 0) { blink = 1; blinkT = Math.random() < 0.2 ? 0.22 : 2 + Math.random() * 3.5; }
      blink = Math.max(0, blink - dt * 7);
      const lidK = 1 - Math.sin(Math.min(1, blink) * Math.PI) * 0.92;
      lookT -= dt;
      if (lookT <= 0) { lookT = 0.8 + Math.random() * 2.2; lookTX = sw ? 0 : (Math.random() - 0.5) * 1.4; lookTY = sw ? 0 : (Math.random() - 0.5) * 0.6; }
      lookX = lerp(lookX, lookTX, 1 - Math.exp(-18 * dt)); lookY = lerp(lookY, lookTY, 1 - Math.exp(-18 * dt));
      for (const E of eyes) { E.g.scale.y = lidK; E.pupil.position.set(lookX * 0.006, lookY * 0.005, 0); }
      // brows: knit for a fight, lift as they talk
      browK = lerp(browK, sw ? -1 : st.talking ? 0.6 + Math.sin(t * 3.1) * 0.4 : 0, 1 - Math.exp(-10 * dt));
      for (const B of brows) { B.g.rotation.z = B.z0 + B.s * Math.max(0, -browK) * 0.28 - B.s * Math.max(0, browK) * 0.1; B.g.position.y = 0.052 + browK * 0.006; }
      // talk: the jaw flaps in syllables
      talkK = lerp(talkK, st.talking ? 1 : 0, 1 - Math.exp(-12 * dt));
      const syl = Math.max(0, Math.sin(t * 13 + Math.sin(t * 5.3) * 2)) * talkK;
      mouthIn.scale.y = 0.05 + syl * 0.75; mouthIn.visible = syl > 0.02; mouth.position.y = -0.06 + syl * 0.004;
      strideLegs(legs, phase, moving ? k : 0, air, dt, sw && !moving ? b : 0);
      if (glide > 0.01) {   // tucked for the glide, eased in with it
        const G2 = [[0.04, 0.06], [0.1, 0.12]];   // legs straight out behind, together
        legs.forEach((L, i) => { L.thigh.rotation.x = lerp(L.thigh.rotation.x, G2[i][0], glide); L.knee.rotation.x = lerp(L.knee.rotation.x, G2[i][1], glide); });
      }
      // astride a mount: hips in the saddle, thighs forward and apart round its back, shins down its flanks;
      // a little lean into the going, and the body gives with each stride instead of riding it stiff
      rideK = lerp(rideK, st.ride || st.sit ? 1 : 0, 1 - Math.exp(-12 * dt));   // (sat on a bench or a log: the same fold, knees together)
      if (rideK > 0.01) {
        const rs = st.rideSpeed || 0, gait = st.rideBob || 0;
        legs.forEach(L => {
          const side = Math.sign(L.thigh.position.x) || 1;
          L.thigh.rotation.x = lerp(L.thigh.rotation.x, st.sit ? -1.5 : -1.3, rideK); L.knee.rotation.x = lerp(L.knee.rotation.x, st.sit ? 1.5 : 1.35, rideK);
          L.thigh.rotation.z = side * (st.sit ? 0.08 : 0.42) * rideK; L.ankle.rotation.x = lerp(L.ankle.rotation.x, -0.15, rideK);
        });
        body.position.y = lerp(body.position.y, HIP - gait * 0.05, rideK);
        torso.rotation.x = lerp(torso.rotation.x, 0.1 + Math.min(rs / 20, 1) * 0.28 + gait * 0.06, rideK);
        torso.rotation.z = lerp(torso.rotation.z, st.rideRoll || 0, rideK);
        head.rotation.x = lerp(head.rotation.x, -torso.rotation.x * 0.6, rideK);
      } else legs.forEach(L => { L.thigh.rotation.z = 0; });

      poseArm(W, wT, wD, wB);
      poseArm(Fr, fT, fD, fB);

      if (wing) { wing.visible = glide > 0.08; wing.scale.set(Math.max(0.01, glide), 1, 1); cape.visible = glide < 0.5; if (cloakTrim) cloakTrim.visible = cape.visible; }
      if (cape) cape.rotation.x = lerp(cape.rotation.x, 0.1 + k * 0.75 + airK * 0.45 + glide * 0.4 - lean * 0.6 + Math.sin(t * 6) * 0.04 * (k + 0.3), 1 - Math.exp(-8 * dt));
      if (relic) { relic.rotation.y += dt * 3; relic.userData.glow.scale.setScalar(0.22 + (st.heat || 0) * 0.3 + Math.sin(t * 8) * 0.02); }
      if (nur) nur.position.set(0.55 + Math.sin(t * 1.3) * 0.12, 1.7 + Math.sin(t * 2.1) * 0.12, -0.2);
      if (weapon.userData.glow) weapon.userData.glow.material.opacity = 0.35 + b * 0.65;
      // glowing markings: faint and slow for the Kalo; void-purple when the Duat moves
      // (every Eikar's marks also glow by night: plain Eikar only after dark, the Kalo
      // faintly by day and clearly at night, the Duat-touched whenever the Duat moves)
      if (markGlows.length) {
        const nv = bio.v;
        const g = duat ? Math.max(duat * 0.45, wind, atk, st.thrown ? 1 : 0, st.duat || 0, nv * 0.4)
          : kalo ? (0.35 + Math.sin(t * 1.3) * 0.15) * (0.6 + 0.6 * nv) + (st.duat || 0)
          : (0.3 + Math.sin(t * 1.3) * 0.08) * nv;
        glowA = lerp(glowA, g, 1 - Math.exp(-8 * dt));
        for (const m of markGlows) { m.material.opacity = clamp(glowA, 0, 1); m.visible = glowA > 0.01; m.scale.setScalar((duat ? 0.12 : 0.085) * (0.8 + glowA * 0.6)); }
      }
    },
    flash(v) { mats.forEach(m => m.emissive.setRGB(v + 0.07, v * 0.9 + 0.055, v * 0.8 + 0.04)); },
    /* v = 0 bright day .. 1 full night: the markings (and grain-dots) glow */
    glow(v) { bio.glow(v); },
    bio,
  };
  return A;
}

export function buildTorcain() {
  return buildEikar({
    skin: '#8a5a3a', cap: '#3d2618', marking: 0xffb04a, markColor: 0x2a1208, emblem: 0xc89aff, build: 1.1, capTall: 0.72,
    cape: 0x5e1f3e, relic: 0xff8a2a, weapon: 'axe', leg: 0x3c2414, foot: 0x2a160c, beltColor: 0x2c1a10,
    tunic: 0x3e3150, trim: 0xd8a84a, scale: 1.04,
  });
}

export function buildPhorus() {
  return buildEikar({
    skin: '#7a8ca2', cap: '#2c3d52', marking: 0x9adfff, emblem: 0x7ad8ff, build: 1.12, capTall: 0.5, kalo: true,
    weapon: 'sword', short: true, back: 'bow', leg: 0x34465a, foot: 0x26323e, beltColor: 0x4a5a6a, tunic: 0x2f5a6e, trim: 0xc8d8e8,
    quiver: 0x3a4a5a, nur: 0xbfeaff, scale: 0.98,
  });
}
/* a memory core — a singing shard of stygian */
export function buildCore() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshToonMaterial({ color: 0x3a2a5a, emissive: 0x9a6aff, emissiveIntensity: 0.9, gradientMap: ramp() }));
  m.scale.y = 1.6; g.add(m); addOutline(m, 0.04, 0x150a24);
  const inner = glowSprite(0xc8a0ff, 2.4, 0.9); g.add(inner);
  const halo = glowSprite(0x8a5aff, 6, 0.3); g.add(halo);
  g.userData = { m, inner, halo };
  return g;
}

/* a face that acts, for folk built outside the Eikar rig: blinks (now and then twice),
   glances, brows that knit for a fight and lift in talk, a mouth that flaps in syllables.
   f: { eyes: [meshes squashed shut to blink], pupils: [meshes that glance],
        brows: [meshes], mouth: mesh, glance: how far the pupils move, lift: how far brows rise }
   Returns update(dt, st); st is the same object passed to animate(). */
export function faceActing(f) {
  const eyes = (f.eyes || []).map(m => ({ m, y: m.scale.y })), pupils = (f.pupils || []).map(m => ({ m, p: m.position.clone() }));
  const brows = (f.brows || []).map(m => ({ m, y: m.position.y, rz: m.rotation.z, s: Math.sign(m.position.x) || 1 }));
  const mouth = f.mouth ? { m: f.mouth, y: f.mouth.scale.y } : null, G = f.glance ?? 0.006, LIFT = f.lift ?? 0.008;
  let blinkT = 1 + Math.random() * 3, blink = 0, lx = 0, ly = 0, lt = 0.5, tx = 0, ty = 0, brK = 0, talkK = 0, t = Math.random() * 10;
  return (dt, st = {}) => {
    t += dt;
    const fight = !!(st.attack || st.windup || st.swing);
    blinkT -= dt;
    if (blinkT <= 0) { blink = 1; blinkT = Math.random() < 0.2 ? 0.22 : 2 + Math.random() * 3.5; }
    blink = Math.max(0, blink - dt * 7);
    const lid = 1 - Math.sin(Math.min(1, blink) * Math.PI) * 0.92;
    for (const e of eyes) e.m.scale.y = e.y * lid;
    lt -= dt;
    if (lt <= 0) { lt = 0.8 + Math.random() * 2.2; tx = fight ? 0 : (Math.random() - 0.5) * 2; ty = fight ? 0 : (Math.random() - 0.5) * 0.8; }
    lx = lerp(lx, tx, 1 - Math.exp(-18 * dt)); ly = lerp(ly, ty, 1 - Math.exp(-18 * dt));
    for (const p of pupils) p.m.position.set(p.p.x + lx * G, p.p.y + ly * G * 0.7, p.p.z);
    brK = lerp(brK, fight ? -1 : st.talking ? 0.6 + Math.sin(t * 3.1) * 0.4 : 0, 1 - Math.exp(-10 * dt));
    for (const b of brows) { b.m.position.y = b.y + brK * LIFT; b.m.rotation.z = b.rz - b.s * Math.max(0, -brK) * 0.25; }
    if (mouth) {
      talkK = lerp(talkK, st.talking ? 1 : 0, 1 - Math.exp(-12 * dt));
      mouth.m.scale.y = mouth.y * (1 + Math.max(0, Math.sin(t * 13 + Math.sin(t * 5.3) * 2)) * talkK * 3.5);
    }
  };
}

/* the film's cartoon timing for any creature or folk with its own animate(): the whole body
   squashes when it lands, crouches into a wind-up (anticipation), stretches into the strike and
   a little while rising — a damped spring, so it overshoots and settles. It scales the root
   around whatever scale the game gave it, and leaves the creature's own motion untouched. */
export function cartoon(a, amt = 1) {
  if (!a || !a.animate || !a.root || a.cartoon) return a;
  a.cartoon = true;
  celAll(a.root);
  const inner = a.animate, root = a.root, base = new THREE.Vector3(), applied = new THREE.Vector3();
  let sq = 0, v = 0, lastY = null, vyS = 0, has = false;
  a.animate = function (dt, st = {}) {
    const out = inner.call(this, dt, st);
    if (!(dt > 0)) return out;
    if (!has || !root.scale.equals(applied)) { base.copy(root.scale); has = true; }   // the game rescaled it: that's the new rest shape
    const y = root.position.y, vy = lastY === null ? 0 : clamp((y - lastY) / dt, -30, 30); lastY = y;
    const pv = vyS; vyS = lerp(vyS, vy, 1 - Math.exp(-12 * dt));
    if (pv < -3 && (vyS - pv) / dt > 30) v -= clamp(-pv * 0.07, 0.3, 1.4);            // hit the ground
    const target = clamp(vyS * 0.006, -0.03, 0.05) + (st.attack || 0) * 0.07 - (st.windup || 0) * 0.06;
    v += ((target * amt - sq) * 120 - v * 12) * dt; sq = clamp(sq + v * dt, -0.15, 0.15);
    root.scale.set(base.x * (1 - sq * 0.5), base.y * (1 + sq), base.z * (1 - sq * 0.5));
    applied.copy(root.scale);
    return out;
  };
  return a;
}

/* the body follows the walker's feet, but a stair step is eased instead of popped:
   on the ground, a small jump in height is spread over a few frames; big jumps and air snap */
export function placeWalker(root, P, dt) {
  const y = P.pos.y, prev = P._visY ?? y;
  let vy = y;
  if (P.onGround && Math.abs(y - prev) < 0.9) vy = prev + (y - prev) * (1 - Math.exp(-18 * dt));
  P._visY = vy;
  root.position.set(P.pos.x, vy, P.pos.z);
}
