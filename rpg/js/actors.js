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
import { toon, ramp, glowSprite, outlineAll, addOutline } from './gfx.js';
import { lerp, clamp } from './util.js';

const TAU = Math.PI * 2;

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
  const um = new THREE.Mesh(new THREE.CapsuleGeometry(o.ru, L1 - o.ru * 1.2, 3, 8), o.skin); um.position.y = -L1 / 2; upper.add(um);
  const fore = new THREE.Group(); fore.position.y = -L1; upper.add(fore);
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(o.rf * 1.05, 8, 6), o.skin); fore.add(elbow);
  const fl = L2 - o.rh * 0.9;
  const fm = new THREE.Mesh(new THREE.CapsuleGeometry(o.rf, fl - o.rf * 1.6, 3, 8), o.skin); fm.position.y = -fl / 2; fore.add(fm);
  if (o.cuff) {
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(o.rf * 1.28, o.rf * 1.12, fl * 0.42, 8), o.cuff); cuff.position.y = -fl * 0.62; fore.add(cuff);
  }
  const grip = new THREE.Group(); grip.position.y = -L2; fore.add(grip);
  const fist = new THREE.Mesh(new THREE.SphereGeometry(o.rh, 10, 8), o.hand || o.skin); fist.scale.set(1.15, 1.0, 1.1); fist.position.set(0, 0, 0); grip.add(fist);
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
  const tm = new THREE.Mesh(new THREE.CapsuleGeometry(o.rt, o.Lt - o.rt * 1.2, 3, 8), o.leg); tm.position.y = -o.Lt / 2; thigh.add(tm);
  const knee = new THREE.Group(); knee.position.y = -o.Lt; thigh.add(knee);
  const sm = new THREE.Mesh(new THREE.CapsuleGeometry(o.rs, o.Ls - o.rs * 1.4, 3, 8), o.shin || o.leg); sm.position.y = -o.Ls / 2; knee.add(sm);
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
  const tunicMat = toon(o.tunic != null ? o.tunic : new THREE.Color(o.leg || 0x4a2c1a).lerp(new THREE.Color(o.beltColor || 0x5a3420), 0.6).multiplyScalar(1.25).getHex(), { side: THREE.DoubleSide, emissive: 0x000000 });
  const legMat = toon(o.leg || 0x4a2c1a);
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
    const delt = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8), skinMat); delt.position.set(s * SX, SH, 0); torso.add(delt);
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
  const eyeR = kalo ? 0.03 : 0.027, ex = kalo ? 0.046 : 0.043;
  const zOn = (x, y, r) => Math.sqrt(Math.max(0, r * r - x * x - y * y));
  const markGlows = [];
  for (const s of [-1, 1]) {
    const ez = zOn(ex, 0.005, HR) * (kalo ? 1.0 : 0.98);
    const white = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 10, 8), whiteMat);
    white.position.set(s * ex, 0.008, ez - 0.006); white.scale.set(1, 1.3, 0.45); white.userData.noOutline = true; face.add(white);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.62, 8, 6), eyeMat);
    eye.position.set(s * (ex - 0.002), 0.006, ez + 0.003); eye.scale.set(1, 1.35, 0.5); eye.userData.noOutline = true; face.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 5, 4), glintMat);
    glint.position.set(s * (ex - 0.002) + 0.007, 0.016, ez + 0.009); glint.userData.noOutline = true; face.add(glint);
    // the brow — gives the face its set
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.012), eyeMat); brow.position.set(s * ex, 0.05, ez - 0.004); brow.rotation.z = s * (kalo ? -0.05 : 0.18); brow.rotation.y = s * 0.4; brow.userData.noOutline = true; face.add(brow);
    // the markings beneath the eyes: small downward triangles
    const my = -0.036, mz = zOn(ex + 0.004, my, HR) + 0.004;
    const tri = new THREE.Mesh(new THREE.CircleGeometry(kalo ? 0.019 : 0.017, 3, -Math.PI / 2), markMat);
    tri.scale.set(0.85, 1.25, 1);
    tri.position.set(s * (ex + 0.004), my, mz); tri.rotation.set(0.32, s * 0.42, 0); tri.userData.noOutline = true; face.add(tri);
    if (kalo || duat) {
      const gl = glowSprite(markGlowCol, duat ? 0.13 : 0.09, duat ? 0.6 : 0.4); gl.position.set(s * (ex + 0.004), my, mz + 0.008); face.add(gl); markGlows.push(gl);
    }
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), skinMat); nose.scale.set(0.9, 1.25, 0.9); nose.position.set(0, -0.018, HR * 0.98); face.add(nose);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0035, 3, 8, Math.PI * 0.8), eyeMat);
  mouth.rotation.z = Math.PI * 1.1; mouth.position.set(0, -0.06, 0.104); mouth.userData.noOutline = true; face.add(mouth);

  // the Aagac: acorn-cap hat that is part of them, with its stem and the kind-symbol on its brow
  const capMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: capTexture(o.cap || '#4a2a14'), gradientMap: ramp(), emissive: 0x000000 });
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

  // a cape from the shoulders, for the swagger
  let cape = null;
  if (o.cape) {
    const W = 0.36, LEN = 0.82;
    const cg = new THREE.PlaneGeometry(W, LEN, 4, 8); cg.translate(0, -LEN / 2, 0);
    const pp = cg.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), y = pp.getY(i), tt = -y / LEN;
      const fx = x * (bw + tt * 0.5);
      pp.setX(i, fx); pp.setZ(i, -Math.pow(fx / (W * 0.6), 2) * 0.06 + Math.pow(x / (W / 2), 2) * 0.06 * (1 - tt));
    }
    cg.computeVertexNormals();
    cape = new THREE.Mesh(cg, toon(o.cape, { side: THREE.DoubleSide }));
    cape.position.set(0, 0.39, -0.1); torso.add(cape);
    for (const s of [-1, 1]) {
      const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), toon(0xe6b84a)); clasp.position.set(s * 0.1, 0.375, 0.07); torso.add(clasp);
    }
    const mantle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 5, 14, Math.PI), toon(o.cape)); mantle.rotation.x = Math.PI / 2; mantle.rotation.z = Math.PI; mantle.scale.set(bw * 1.15, 0.85, 1); mantle.position.set(0, 0.385, -0.0); torso.add(mantle);
  }

  // arms and hands
  const armOpts = { L1: 0.25, L2: 0.27, ru: 0.043 * (kalo ? 1.08 : 1), rf: 0.036 * (kalo ? 1.08 : 1), rh: 0.04, skin: skinMat, cuff: beltMat };
  const arms = [-1, 1].map(s => rigArm(torso, s, new THREE.Vector3(s * SX, SH - 0.01, 0), armOpts));
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
  root.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; });
  const rootScale = o.scale || 1;
  root.scale.setScalar(rootScale);
  const own = new Set(root.children);

  // pose scratch (no per-frame allocation)
  const wT = new THREE.Vector3(), wD = new THREE.Vector3(), wB = new THREE.Vector3();
  const fT = new THREE.Vector3(), fD = new THREE.Vector3(), fB = new THREE.Vector3();
  const iT = new THREE.Vector3(), iD = new THREE.Vector3(), iB = new THREE.Vector3();
  const sT = new THREE.Vector3(), sD = new THREE.Vector3(), sB = new THREE.Vector3();
  const synth = { kind: 1, p: 0 };
  const defKind = kind === 'spear' || kind === 'none' || kind === 'flask' ? 4 : kind === 'axe' ? 3 : 1;
  const s = W.s;                 // weapon-hand side (-1 right, +1 left)
  let phase = 0, swingBlend = 0, glide = 0, twist = 0, lean = 0, glowA = 0;

  const A = {
    root, body, torso, head, hat, weapon, wPivot, wHold, cape, relic, nur, mats, arms, legs,
    /* st: { speed, onGround, t, swing: null | { kind: 1|2|3|4, p: 0..1 } | number, windup, attack,
             heat, drink, talking, thrown, duat } */
    animate(dt, st) {
      const t = st.t || 0, spd = st.speed || 0;
      const onGround = st.onGround !== false;
      const air = !onGround;
      const k = onGround ? clamp(spd / 7, 0, 1.3) : 0;
      const moving = k > 0.07;
      phase += dt * (moving ? 3 + spd * 0.95 : 0);
      let gliding = false;
      for (let i = 0; i < root.children.length; i++) { const c = root.children[i]; if (c.isGroup && c.visible && !own.has(c)) { gliding = true; break; } }
      glide = lerp(glide, gliding ? 1 : 0, 1 - Math.exp(-10 * dt));

      // which swing (main passes {kind,p}; others pass windup/attack numbers)
      let sw = st.swing && typeof st.swing === 'object' ? st.swing : null;
      const atk = Math.max(st.attack || 0, typeof st.swing === 'number' ? st.swing : 0), wind = st.windup || 0;
      let want = sw ? 1 : 0;
      if (!sw && (atk > 0.02 || wind > 0.02)) { synth.kind = defKind; synth.p = atk > 0.02 ? 0.5 + 0.5 * (1 - atk) : 0; sw = synth; want = atk > 0.02 ? 1 : Math.min(1, wind * 1.6); }
      swingBlend = lerp(swingBlend, want, 1 - Math.exp(-(want > swingBlend ? 30 : 8) * dt));
      const b = swingBlend;

      // ---- the weapon hand at rest ----
      const sway = moving ? Math.sin(phase) * 0.16 * k : Math.sin(t * 1.6) * 0.008;
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
      if (glide > 0.01) { sT.set(s * 0.17, 0.86, 0.06); wT.lerp(sT, glide); sD.set(0, -0.4, -1); wD.lerp(sD, glide); }

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
      if (glide > 0.01) { sT.set(-s * 0.17, 0.86, 0.06); fT.lerp(sT, glide); }
      if (air && !gliding && !sw) { fT.x += -s * 0.08; fT.y += 0.12; }

      // ---- torso, head, legs ----
      twist = lerp(twist, tw * b, 1 - Math.exp(-20 * dt));
      lean = lerp(lean, ln * (sw ? b : 1) + glide * 0.25, 1 - Math.exp(-12 * dt));
      torso.rotation.set(lean, twist, moving ? Math.sin(phase) * 0.04 * k : 0);
      body.rotation.x = 0;
      const bob = moving ? Math.abs(Math.cos(phase)) * 0.045 * k : Math.sin(t * 2.2) * 0.006;
      body.position.y = HIP + bob - crouch - (sw ? 0.03 * b : 0);
      head.rotation.set(st.drink ? -0.35 : (st.talking ? Math.sin(t * 6) * 0.06 : 0) - lean * 0.5, -twist * 0.6 + (moving || sw ? 0 : Math.sin(t * 0.5) * 0.18), 0);
      hat.rotation.z = Math.sin(t * 1.7) * 0.02;
      strideLegs(legs, phase, moving ? k : 0, air, dt, sw && !moving ? b : 0);
      if (glide > 0.5) { legs[0].thigh.rotation.x = 0.25; legs[1].thigh.rotation.x = 0.4; legs[0].knee.rotation.x = 0.5; legs[1].knee.rotation.x = 0.7; }

      poseArm(W, wT, wD, wB);
      poseArm(Fr, fT, fD, fB);

      if (cape) cape.rotation.x = lerp(cape.rotation.x, 0.1 + k * 0.75 + (air ? 0.45 : 0) + glide * 0.4 - lean * 0.6 + Math.sin(t * 6) * 0.04 * (k + 0.3), 1 - Math.exp(-8 * dt));
      if (relic) { relic.rotation.y += dt * 3; relic.userData.glow.scale.setScalar(0.22 + (st.heat || 0) * 0.3 + Math.sin(t * 8) * 0.02); }
      if (nur) nur.position.set(0.55 + Math.sin(t * 1.3) * 0.12, 1.7 + Math.sin(t * 2.1) * 0.12, -0.2);
      if (weapon.userData.glow) weapon.userData.glow.material.opacity = 0.35 + b * 0.65;
      // glowing markings: faint and slow for the Kalo; void-purple when the Duat moves
      if (markGlows.length) {
        const g = duat ? Math.max(duat * 0.45, wind, atk, st.thrown ? 1 : 0, st.duat || 0) : 0.35 + Math.sin(t * 1.3) * 0.15 + (st.duat || 0);
        glowA = lerp(glowA, g, 1 - Math.exp(-8 * dt));
        for (const m of markGlows) { m.material.opacity = clamp(glowA, 0, 1); m.scale.setScalar((duat ? 0.12 : 0.085) * (0.8 + glowA * 0.6)); }
      }
    },
    flash(v) { mats.forEach(m => m.emissive.setRGB(v + 0.07, v * 0.9 + 0.055, v * 0.8 + 0.04)); },
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
