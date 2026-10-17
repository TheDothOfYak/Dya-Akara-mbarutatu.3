/* ============================================================
   Folk of Beuhk and the Leotik camp. Eikar of every sort, a Kalo'Eik trader,
   KEILIA like Venkin and Orrin — taller than the Eikar, darker
   pinecone-wood skin, a single eye, and "hair" of overlapping
   pinecone scales growing from the head and falling thick over the
   shoulders and back to the calf like a cape. The Kalo make the
   Keilia's hammers (a cyan stygian inlay in the head); a Keilia never
   fights with one. KARNEN are their own small, quick, angular folk
   in worn triangular hats.
   ============================================================ */
import * as THREE from 'three';
import { toon, ramp, glowSprite, outlineAll } from './gfx.js';
import { buildEikar, cartoon, rigArm, poseArm, rigLeg, strideLegs, bioKit, bioDots, bioMesh } from './actors.js';
import { mulberry32, lerp, clamp } from './util.js';

const TAU = Math.PI * 2;

/* pinecone-wood: dark, with a faint lattice of scale-shapes and grain */
function pineTexture(base) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(20,10,4,0.22)'; g.lineWidth = 2;
  for (let y = -16; y < 144; y += 16) for (let x = ((y / 16) & 1) ? 8 : -8; x < 144; x += 16) {
    g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x, y + 9); g.lineTo(x + 8, y); g.stroke();
  }
  for (let i = 0; i < 24; i++) {
    g.strokeStyle = `rgba(${i % 2 ? '255,220,170' : '30,15,5'},0.07)`; g.lineWidth = 2;
    const x = (i * 53) % 128; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 5, 40, x - 5, 90, x + 2, 128); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  return t;
}

/* many woody scales merged into one vertex-coloured mesh */
const _dummy = new THREE.Object3D(), _tgt = new THREE.Vector3(), _col = new THREE.Color();
function scaleMesh(items, mat) {
  const proto = new THREE.SphereGeometry(1, 7, 4, 0, TAU, 0, Math.PI).toNonIndexed();
  proto.translate(0, -0.85, 0);
  const pos = [], nor = [], col = [];
  const pp = proto.attributes.position, pn = proto.attributes.normal;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const it of items) {
    _dummy.position.copy(it.p); _dummy.up.set(0, 1, 0);
    _tgt.copy(it.p).add(it.n); _dummy.lookAt(_tgt);
    _dummy.rotateX(-(it.tilt ?? 0.45));
    _dummy.scale.set(it.w, it.l, it.th);
    _dummy.updateMatrix(); nm.getNormalMatrix(_dummy.matrix);
    _col.setHex(it.c);
    for (let i = 0; i < pp.count; i++) {
      v.fromBufferAttribute(pp, i).applyMatrix4(_dummy.matrix); n.fromBufferAttribute(pn, i).applyMatrix3(nm).normalize();
      // the tip of each scale a touch lighter, the root darker
      const k = 0.78 + Math.max(0, -pp.getY(i) - 0.85) * 0.3;
      pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z); col.push(_col.r * k, _col.g * k, _col.b * k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(g, mat);
}

/* the Kalo-made builder's hammer: grip at the origin, head up +y, cyan stygian inlay */
function makeHammer() {
  const g = new THREE.Group();
  const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.62, 7), toon(0x6a4a2a)); haft.position.y = 0.22; g.add(haft);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 7), toon(0x3a2a1a)); wrap.position.y = -0.01; g.add(wrap);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.24), toon(0x6a6a78)); head.position.y = 0.52; g.add(head);
  for (const s of [-1, 1]) {
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.03, 8), toon(0x8a8a98)); face.rotation.x = Math.PI / 2; face.position.set(0, 0.52, s * 0.13); g.add(face);
  }
  const inlayMat = new THREE.MeshBasicMaterial({ color: 0x5ff0ff });
  for (const s of [-1, 1]) {
    const inlay = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.022, 0.17), inlayMat); inlay.position.set(s * 0.051, 0.52, 0); inlay.userData.noOutline = true; g.add(inlay);
  }
  const gl = glowSprite(0x4fe8ff, 0.32, 0.55); gl.position.y = 0.52; g.add(gl);
  g.userData.glow = gl;
  return g;
}

/* ---------------- a Keilia ---------------- */
export function buildKeilia(o = {}) {
  const root = new THREE.Group();
  const rng = mulberry32(o.seed || 11);
  const HIP = 0.98;
  const body = new THREE.Group(); body.position.y = HIP; root.add(body);
  const torso = new THREE.Group(); body.add(torso);
  // pinecone wood is darker than an Eikar's acorn; a passed skin colour only tints it
  const skinHex = new THREE.Color(o.skin != null ? o.skin : 0xffffff).lerp(new THREE.Color(0xffffff), 0.35);
  const skin = new THREE.MeshToonMaterial({ color: skinHex, map: pineTexture('#5a3a24'), gradientMap: ramp(), emissive: 0x000000 });
  skin.userData.ink = new THREE.Color(skinHex).multiply(new THREE.Color('#5a3a24')).getHex();
  const hairA = o.hair || 0x5a3822, hairB = o.hair2 || 0x7a5232, moss = o.moss || 0x55663a;
  const scaleMat = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: ramp(), emissive: 0x000000 });
  const cloth = toon(o.cloth || 0x4a5a34, { side: THREE.DoubleSide, emissive: 0x000000 });
  const trousers = toon(o.trousers || 0x4a3a28);
  const leather = toon(0x3a2414);
  const pick = (r, i) => { const u = rng(); return u < 0.18 ? moss : (r + i) % 2 ? hairA : hairB; };

  // torso in a wrapped tunic
  const P = [[0.2, -0.22], [0.19, -0.12], [0.165, 0.0], [0.155, 0.12], [0.18, 0.26], [0.205, 0.38], [0.2, 0.46], [0.15, 0.52], [0.08, 0.55], [0.001, 0.556]];
  const tun = new THREE.Mesh(new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r, y)), 18), cloth); tun.scale.set(1, 1, 0.7); torso.add(tun);
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), trousers); hips.scale.set(1, 0.6, 0.72); hips.position.y = -0.05; body.add(hips);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.022, 4, 20), leather); belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.74, 1.4); belt.position.y = 0.04; torso.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.02), toon(0x8a7a5a)); buckle.position.set(0, 0.04, 0.125); torso.add(buckle);
  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.12), toon(0x6a4a2a)); pouch.position.set(0.17, -0.04, 0.03); torso.add(pouch);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.14, 8), skin); neck.position.y = 0.57; torso.add(neck);

  // head with ONE eye
  const head = new THREE.Group(); head.position.y = 0.6; torso.add(head);
  const HR = 0.135;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(HR, 18, 14), skin); skull.scale.set(0.95, 1.12, 1.0); skull.position.y = 0.15; head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 8), skin); jaw.scale.set(1.0, 0.7, 0.95); jaw.position.set(0, 0.07, 0.035); head.add(jaw);
  const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.12, 3, 8), skin); brow.rotation.z = Math.PI / 2; brow.position.set(0, 0.215, 0.115); head.add(brow);
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.046, 12, 10), new THREE.MeshBasicMaterial({ color: 0xf6eedc })); white.scale.set(1.25, 1, 0.5); white.position.set(0, 0.17, 0.122); white.userData.noOutline = true; head.add(white);
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.029, 10, 8), new THREE.MeshBasicMaterial({ color: o.eye || 0x7a8a2a })); iris.scale.set(1, 1, 0.45); iris.position.set(0, 0.168, 0.136); iris.userData.noOutline = true; head.add(iris);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: 0x120a04 })); pupil.scale.set(1, 1.2, 0.4); pupil.position.set(0, 0.168, 0.145); pupil.userData.noOutline = true; head.add(pupil);
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.007, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(0.012, 0.182, 0.15); glint.userData.noOutline = true; head.add(glint);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 6, 0, TAU, 0, Math.PI * 0.42), skin); lid.scale.set(1.25, 0.9, 0.62); lid.position.set(0, 0.172, 0.118); lid.rotation.x = 0.35; head.add(lid);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 4), skin); nose.rotation.x = Math.PI / 2 + 0.5; nose.position.set(0, 0.105, 0.14); head.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.006, 0.01), new THREE.MeshBasicMaterial({ color: 0x1a0e06 })); mouth.position.set(0, 0.062, 0.122); mouth.userData.noOutline = true; head.add(mouth);
  // minor hidden markings: faint pale lines at the sides of the neck, mostly under the scales
  const markMat = new THREE.MeshBasicMaterial({ color: o.marking || 0xa89068 });
  // bioluminescence: the hidden markings glow moss-green at night — the neck lines, a
  // few freckles at the temple, and a line down each inner wrist; mostly under the scales
  const bio = bioKit();
  const KEI_GLOW = [0x9affb8, 0x8ae0ff, 0xd8ff8a];
  const kGlow = o.bioColor ?? KEI_GLOW[Math.floor(mulberry32((o.seed || 11) + 101)() * KEI_GLOW.length)];
  bio.basic(markMat, 1, kGlow);
  const freckM = bio.mat(kGlow, 0x5a3a24, 0.15, 0.0, 1.8);
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.004), markMat); m.position.set(s * 0.062, 0.56 - k * 0.025, 0.02 + k * 0.012); m.rotation.set(0, s * 1.2, s * 0.4); m.userData.noOutline = true; torso.add(m);
  }

  // pinecone-scale "hair" on the head: crown and back of the skull
  const hs = [];
  for (let r = 0; r < 6; r++) {
    const lat = 0.12 + r * 0.33;                    // from the crown downward
    const n = Math.max(5, Math.round(Math.sin(lat) * 15) + 3);
    for (let i = 0; i < n; i++) {
      const az = (i + (r % 2) * 0.5) / n * TAU;
      if (lat > 0.95 && Math.cos(az) > -0.25) continue;     // keep the face clear
      if (lat > 0.55 && Math.cos(az) > 0.45) continue;
      const nx = Math.sin(lat) * Math.sin(az), ny = Math.cos(lat), nz = Math.sin(lat) * Math.cos(az);
      const p = new THREE.Vector3(nx * HR * 0.98, 0.15 + ny * HR * 1.1 + 0.015, nz * HR);
      hs.push({ p, n: new THREE.Vector3(nx, ny * 0.6 + 0.25, nz).normalize(), w: 0.045, l: 0.05, th: 0.016, tilt: 0.5, c: pick(r, i) });
    }
  }
  const crest = scaleMesh(hs, scaleMat); head.add(crest);
  bioMesh(bioDots([-1, 1].flatMap(s => [0, 1, 2].map(k => { const n = new THREE.Vector3(s * 0.85, 0.32 - k * 0.12, 0.3 + k * 0.08).normalize(); return [n.x * HR * 0.97, 0.15 + n.y * HR * 1.1, n.z * HR, n.x, n.y, n.z, 0.006 - k * 0.001, 0.5]; }))), freckM, head);

  // the thick scale-cape: from the head and shoulders down the back to the calves
  const cape = new THREE.Group(); cape.position.set(0, 0.6, -0.02); torso.add(cape);
  const cs = [];
  const ROWS = 17;
  for (let r = 0; r < ROWS; r++) {
    const tt = r / (ROWS - 1);
    const y = 0.02 - tt * 1.18;                         // down to the calf
    const X = r < 2 ? 0.17 + r * 0.08 : r < 4 ? 0.27 : 0.29 + tt * 0.07, Z = r < 2 ? 0.12 + r * 0.04 : 0.2 + tt * 0.06;
    const span = r < 2 ? 1.25 : r < 4 ? 1.6 : 1.32;    // wraps over the shoulders near the top
    const n = r < 2 ? 9 : 11;
    for (let i = 0; i < n; i++) {
      const a = -span + (i + (r % 2) * 0.5) / (n - 0.5) * span * 2;
      if (Math.abs(a) > span) continue;
      const nx = Math.sin(a), nz = -Math.cos(a);
      const lift = r >= 2 && r < 4 ? Math.max(0, Math.abs(a) - 1.0) * 0.06 : 0;
      const p = new THREE.Vector3(nx * X, y + lift - (r < 2 ? 0 : 0.03), nz * Z - (r >= 4 ? tt * 0.04 : 0));
      const nrm = new THREE.Vector3(nx, r < 4 ? 0.7 - r * 0.12 : 0.05, nz * (Z / X)).normalize();
      const big = r < 4 ? 1.12 : 1 - tt * 0.15;
      cs.push({ p, n: nrm, w: 0.075 * big, l: 0.1 * big, th: 0.022 * big, tilt: r < 4 ? 0.7 : 0.38, c: pick(r, i) });
    }
  }
  const capeMesh = scaleMesh(cs, scaleMat); cape.add(capeMesh);

  // arms and hands (hands of bare wood; wrapped forearms)
  const armOpts = { L1: 0.33, L2: 0.36, ru: 0.06, rf: 0.05, rh: 0.055, skin, cuff: toon(0x6a5a3a) };
  const arms = [-1, 1].map(s => rigArm(torso, s, new THREE.Vector3(s * 0.235, 0.47, 0), armOpts));
  for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skin); d.position.set(s * 0.235, 0.47, 0); torso.add(d); }
  for (const a of arms) { const L = []; for (let k = 0; k < 4; k++) L.push([a.s * 0.045, -0.12 - k * 0.035, 0.02, a.s, 0, 0.3, 0.0065, 0.5]); bioMesh(bioDots(L), freckM, a.fore); }
  const legOpts = { Lt: 0.47, Ls: 0.44, rt: 0.08, rs: 0.06, leg: trousers, shin: trousers, boot: leather, bootTop: true, foot: 0.14, fh: 0.075, fw: 0.1, ah: 0.07 };
  const legs = [-1, 1].map(s => rigLeg(body, s, new THREE.Vector3(s * 0.1, -0.03, 0), legOpts));

  // builders carry the Kalo-made hammer — in hand, never swung at anyone
  const R = arms[0], L = arms[1];
  let hammer = null;
  if (o.hammer !== false) { hammer = makeHammer(); R.grip.add(hammer); }

  outlineAll(root, 0.015);
  root.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; });
  root.scale.setScalar(o.scale || 1);
  bio.glow(0);

  const rT = new THREE.Vector3(), rD = new THREE.Vector3(), rB = new THREE.Vector3();
  const lT = new THREE.Vector3(), lD = new THREE.Vector3(), lB = new THREE.Vector3();
  let ph = 0, act = 0;
  return {
    root, body, head, hammer, cape, arms, legs, mats: [skin, cloth, scaleMat], glow: bio.glow,
    animate(dt, st) {
      const t = st.t || 0, spd = st.speed || 0;
      const k = clamp(spd / 5, 0, 1.2), moving = k > 0.06;
      ph += dt * (moving ? 2.6 + spd * 0.9 : 0);
      act = lerp(act, Math.max(st.attack || 0, typeof st.swing === 'number' ? st.swing : st.swing ? 1 : 0, st.windup || 0), 1 - Math.exp(-12 * dt));
      const sway = moving ? Math.sin(ph) * 0.14 * k : Math.sin(t * 1.4) * 0.01;
      strideLegs(legs, ph, moving ? k * 0.85 : 0, st.onGround === false, dt);
      body.position.y = HIP + (moving ? Math.abs(Math.cos(ph)) * 0.035 * k : Math.sin(t * 1.8) * 0.006);
      torso.rotation.set(moving ? 0.06 * k : 0.02, 0, moving ? Math.sin(ph) * 0.03 : 0);
      head.rotation.set(st.talking ? Math.sin(t * 5) * 0.05 : 0, st.look ?? Math.sin(t * 0.4) * 0.3, 0);
      // the hammer hangs at the right side, head down
      rT.set(-0.27, -0.16, 0.08 - sway); rD.set(-0.06, -1, 0.3); rB.set(0, 0, 1);
      poseArm(R, rT, rD, rB);
      if (st.talking) { lT.set(0.24, 0.14 + Math.sin(t * 4) * 0.05, 0.3); lD.set(0.2, 1, 0.4); lB.set(1, 0, 0); }
      else if (act > 0.05) { lT.set(0.2, 0.3, 0.12 + act * 0.4); lD.set(0, 1, 0.2); lB.set(1, 0, 0); }   // a shove, never a hammer blow
      else { lT.set(0.27, -0.18, 0.06 + sway); lD.set(0, 1, 0.2); lB.set(1, 0, 0); }
      poseArm(L, lT, lD, lB);
      cape.rotation.x = 0.02 + k * 0.12 + Math.sin(t * 1.2) * 0.015;
      if (hammer) hammer.userData.glow.material.opacity = 0.45 + Math.sin(t * 2.3) * 0.15;
    },
    flash(v) { [skin, cloth, scaleMat].forEach(m => m.emissive.setRGB(v, v * 0.9, v * 0.8)); },
  };
}

/* ---------------- a Karnen ---------------- */
export function buildKarnen(o = {}) {
  const root = new THREE.Group();
  const rng = mulberry32(o.seed || 5);
  const HIP = 0.6;
  const body = new THREE.Group(); body.position.y = HIP; root.add(body);
  const torso = new THREE.Group(); body.add(torso);
  const skin = new THREE.MeshToonMaterial({ color: o.skin || 0xb49a68, gradientMap: ramp(), emissive: 0x000000 });
  const vest = toon(o.cloth || 0x5a6e44, { emissive: 0x000000 });
  const hatMat = toon(o.hat || 0x5a4634, { emissive: 0x000000 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x140c06 });
  // bioluminescence: angular marks of light — a triangle on the brow, a little chevron
  // under each eye, and the knobbly knees glint at night
  const bio = bioKit();
  const KAR_GLOW = [0xffd27a, 0x9affe0, 0xff9ad8];
  const kGlow = o.bioColor ?? KAR_GLOW[Math.floor(mulberry32((o.seed || 5) + 101)() * KAR_GLOW.length)];
  const markM = bio.mat(kGlow, o.skin || 0xb49a68, 0.2, 0.0, 1.9);

  // an inverted-triangle torso in a three-cornered vest
  const chest = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 3), vest); chest.rotation.set(Math.PI, Math.PI / 3, 0); chest.scale.set(1, 1, 0.75); chest.position.y = 0.16; torso.add(chest);
  const hips = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.12, 3), toon(o.trousers || 0x4a3a2a)); hips.position.y = -0.02; hips.rotation.y = Math.PI / 3; body.add(hips);
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.15), toon(o.sash || 0xa8442a)); sash.position.set(0, 0.17, 0); sash.rotation.z = 0.55; torso.add(sash);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 5), skin); neck.position.y = 0.35; torso.add(neck);

  // the angular head: a downward wedge, a ridge of a nose, triangular ears
  const head = new THREE.Group(); head.position.y = 0.37; torso.add(head);
  const skull = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.25, 3), skin); skull.rotation.x = Math.PI; skull.position.y = 0.13; skull.scale.set(1, 1, 0.9); head.add(skull);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 3), skin); top.position.y = 0.27; top.scale.set(1, 1, 0.9); head.add(top);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.11, 3), skin); ear.rotation.z = -s * 1.25; ear.position.set(s * 0.12, 0.2, -0.04); head.add(ear);
    // triangular eyes on the two front faces
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.026, 3, Math.PI / 2 + (s > 0 ? 0.25 : -0.25)), new THREE.MeshBasicMaterial({ color: 0xf2e6c8 }));
    eye.position.set(s * 0.043, 0.2, 0.082); eye.rotation.y = s * 0.55; eye.userData.noOutline = true; head.add(eye);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.012, 3, Math.PI / 2), dark); pupil.position.set(s * 0.043, 0.195, 0.086); pupil.rotation.y = s * 0.55; pupil.userData.noOutline = true; head.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.008), dark); brow.position.set(s * 0.045, 0.232, 0.08); brow.rotation.set(0, s * 0.55, s * 0.35); brow.userData.noOutline = true; head.add(brow);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 3), skin); nose.rotation.x = Math.PI / 2 + 0.35; nose.position.set(0, 0.16, 0.1); head.add(nose);
  { const brow = new THREE.Mesh(new THREE.CircleGeometry(0.017, 3, -Math.PI / 2), markM); brow.position.set(0, 0.245, 0.074); brow.rotation.x = -0.3; brow.userData.noOutline = true; head.add(brow);
    for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CircleGeometry(0.009, 3, -Math.PI / 2), markM); ch.position.set(s * 0.05, 0.168, 0.078); ch.rotation.y = s * 0.55; ch.userData.noOutline = true; head.add(ch); } }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.006, 0.006), dark); mouth.position.set(0, 0.095, 0.062); mouth.rotation.z = 0.12; mouth.userData.noOutline = true; head.add(mouth);

  // the worn triangular hat (worn, not grown): a three-cornered brim, a bent crown, a patch
  const hat = new THREE.Group(); hat.position.set(0, 0.3, -0.01); hat.rotation.set(-0.08, 0.15, 0.1); head.add(hat);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.23, 0.025, 3), hatMat); brim.rotation.y = Math.PI / 3 * (0.5 + rng() * 0.2); hat.add(brim);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.17, 3), hatMat); crown.position.y = 0.09; crown.rotation.y = brim.rotation.y; hat.add(crown);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 3), hatMat); tip.position.set(0.035, 0.19, 0); tip.rotation.z = -0.9; hat.add(tip);
  const patch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.01), toon(o.patch || 0x8a6a42)); patch.position.set(0.035, 0.075, 0.07); patch.rotation.set(-0.4, 0.3, 0.2); hat.add(patch);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.11, 0.025, 3), toon(o.sash || 0xa8442a)); band.position.y = 0.025; band.rotation.y = brim.rotation.y; hat.add(band);

  // quick stick-like limbs with knobbly joints
  const armOpts = { L1: 0.21, L2: 0.22, ru: 0.02, rf: 0.018, rh: 0.03, skin };
  const arms = [-1, 1].map(s => rigArm(torso, s, new THREE.Vector3(s * 0.13, 0.3, 0), armOpts));
  const legOpts = { Lt: 0.28, Ls: 0.27, rt: 0.024, rs: 0.021, leg: skin, shin: skin, boot: toon(o.shoes || 0x3a2a1a), foot: 0.07, fh: 0.04, fw: 0.05, ah: 0.05 };
  const legs = [-1, 1].map(s => rigLeg(body, s, new THREE.Vector3(s * 0.05, -0.02, 0), legOpts));
  for (const L of legs) { const kn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), skin); L.knee.add(kn); bioMesh(bioDots([[0, 0, 0.03, 0, 0, 1, 0.008, 0.6]]), markM, L.knee); }
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), toon(0x8a7a5a)); sack.scale.set(0.8, 1, 0.7); sack.position.set(0.1, -0.03, -0.05); torso.add(sack);

  outlineAll(root, 0.01);
  root.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; });
  root.scale.setScalar(o.scale || 1);
  bio.glow(0);

  const T = new THREE.Vector3(), D = new THREE.Vector3(), B = new THREE.Vector3();
  let ph = rng() * 6, act = 0;
  return {
    root, body, head, hat, arms, legs, mats: [skin, vest, hatMat], glow: bio.glow,
    animate(dt, st) {
      const t = st.t || 0, spd = st.speed || 0;
      const k = clamp(spd / 4, 0, 1.3), moving = k > 0.06;
      ph += dt * (moving ? 5 + spd * 1.6 : 0);         // quick little steps
      act = lerp(act, Math.max(st.attack || 0, typeof st.swing === 'number' ? st.swing : st.swing ? 1 : 0, st.windup || 0), 1 - Math.exp(-14 * dt));
      strideLegs(legs, ph, moving ? k : 0, st.onGround === false, dt);
      body.position.y = HIP + (moving ? Math.abs(Math.cos(ph)) * 0.04 * k : Math.sin(t * 3) * 0.006);
      torso.rotation.set(moving ? 0.15 * k : 0, 0, moving ? Math.sin(ph) * 0.06 : 0);
      head.rotation.set(st.talking ? Math.sin(t * 7) * 0.08 : 0, st.look ?? Math.sin(t * 0.9) * 0.35, Math.sin(t * 1.3) * 0.06);
      arms.forEach((a, i) => {
        const s = a.s, sw = moving ? Math.sin(ph + (i ? 0 : Math.PI)) * 0.16 * k : Math.sin(t * 2 + i) * 0.01;
        if (st.talking && i === 1) T.set(0.16, 0.18 + Math.sin(t * 6) * 0.04, 0.2);
        else if (act > 0.05 && i === 0) T.set(-0.08, 0.25, 0.08 + act * 0.3);
        else T.set(s * 0.15, -0.09, 0.03 + sw);
        D.set(0, 1, 0.3); B.set(-s, 0, 0);
        poseArm(a, T, D, B);
      });
    },
    flash(v) { [skin, vest, hatMat].forEach(m => m.emissive.setRGB(v, v * 0.9, v * 0.8)); },
  };
}

/* ---------------- who lives where ---------------- */
export const NPC_LOOKS = {
  buhkon: { skin: '#b8804a', cap: '#5a3018', emblem: 0xff9a3a, build: 1.12, weapon: 'axe', leg: 0x5a3420, foot: 0x3a2010, beltColor: 0x8a5a2a, tunic: 0x7a5a32, trim: 0xe0b060, relic: 0xffb050, scale: 1.04, capTall: 0.75 },
  v1: { skin: '#c89a6a', cap: '#6a3a1a', emblem: 0xd8c070, build: 1.0, weapon: 'none', satchel: 0xd8c8a0, leg: 0x5a3a20, foot: 0x3a2412, beltColor: 0x2f6f8a, tunic: 0xd8b878, trim: 0x2f6f8a, scale: 0.97 },
  v2: { skin: '#a8784a', cap: '#3a2a1a', emblem: 0xc89070, build: 1.1, weapon: 'axe', leg: 0x4a3a2a, foot: 0x2a1a0a, beltColor: 0x8a3a2a, tunic: 0x6a7a3a, trim: 0x8a3a2a, scale: 1.0 },
  v3: { skin: '#d8b080', cap: '#7a4a2a', emblem: 0xff9ac8, build: 0.92, weapon: 'spear', leg: 0x6a4a30, foot: 0x3a2a1a, beltColor: 0x5a8a3a, tunic: 0x8a4a6a, trim: 0xffd27a, scale: 0.95 },
  v4: { skin: '#9a7050', cap: '#4a2a14', emblem: 0xb0d070, build: 1.15, weapon: 'axe', leg: 0x3a2a1a, foot: 0x2a1a0a, beltColor: 0xc28b2c, tunic: 0x3a5a7a, trim: 0xc28b2c, scale: 1.03 },
  hemla: { skin: '#7a8aa0', cap: '#334458', marking: 0xbfeaff, emblem: 0x7ad8ff, build: 1.05, kalo: true, weapon: 'none', satchel: 0x4a5a6a, leg: 0x3a4a5a, foot: 0x2a3440, beltColor: 0xc8a050, tunic: 0x3a6a7a, trim: 0xc8a050, cape: 0x2a5a6a, scale: 0.98 },
  duro: { skin: '#9a6a3a', cap: '#4a2a14', emblem: 0xff8a3a, build: 1.2, weapon: 'axe', leg: 0x4a2c1a, foot: 0x2a160c, beltColor: 0x2a1a10, tunic: 0x5a3a2a, trim: 0xff8a3a, relic: 0xff7a2a, scale: 1.04 },
  ruut: { skin: '#a08050', cap: '#5a4a2a', emblem: 0xb0d070, build: 1.15, weapon: 'spear', leg: 0x5a4a30, foot: 0x3a2a14, beltColor: 0x6a5a2a, tunic: 0x7a8a5a, trim: 0x6a5a2a, scale: 0.95, capTall: 0.5 },
  sefa: { skin: '#b08a5a', cap: '#6a3a2a', emblem: 0xff8ac8, build: 0.85, weapon: 'none', flasks: false, leg: 0x6a4a30, foot: 0x3a2a1a, beltColor: 0x8a3a5a, tunic: 0xd87a5a, trim: 0xffe0a0, scale: 0.72 },
  ila: { skin: '#7a9a6a', cap: '#2a4a2a', emblem: 0x9aff6a, build: 0.95, weapon: 'flask', flaskColor: 0x9aff6a, satchel: 0x5a6a3a, leg: 0x2a3a2a, foot: 0x1a2a1a, beltColor: 0x4a6a3a, tunic: 0x4a6a4a, trim: 0xc8ff9a, cape: 0x3a5a2a, scale: 1.0 },
  kesh: { skin: '#3a3444', cap: '#1a1420', marking: 0xb070ff, emblem: 0x6a3aaa, build: 1.0, weapon: 'sword', duat: 0.5, leg: 0x1a1420, foot: 0x0c0810, beltColor: 0x3a1a5a, tunic: 0x2a2236, trim: 0x6a3aaa, cape: 0x221630, scale: 1.03 },
};

export const NPCS = {
  /* Aakalay is abandoned — nobody lives there now */
  aakalay: [],
  /* Beuhk, the home town (positions are absolute here) */
  xilia: [
    { id: 'buhkon', name: 'Buhkon Eldi', title: 'the Carpenter', look: 'buhkon', pos: [10, 64], roles: [], quests: [],
      hello: ['Calm first, then quick. Calm first.', 'You wore that hat the day I found you. It still suits you, little one.'] },
    { id: 'hemla', name: 'Hemla', title: 'Kalo\u2019Eik trader', look: 'hemla', pos: [-8, 60], roles: ['shop'], quests: ['q_vel'],
      hello: ['Shards for goods, goods for shards. The Kalo keep fair books, little Stamijan.', 'You smell like Punk. That\u2019s not a complaint — it\u2019s a sales opportunity.'] },
    { id: 'duro', name: 'Duro', title: 'Eikar smith', look: 'duro', pos: [16, 44], roles: ['forge'], quests: ['q_ore'],
      hello: ['A smith keeps his cauldron on the fire tree\u2019s branch. Mine came with me in a sack.', 'Bring me ore and bark and I\u2019ll grow you a blade that bites.'] },
    { id: 'venkin', name: 'Venkin', title: 'Keilia builder', look: 'keilia', pos: [-16, 40], roles: ['cook'], quests: ['q_camp'],
      hello: ['I build. Walls, roofs, bridges. Weapons? Passable, at best — ask Duro.', 'Half of Beuhk\u2019s roofs are mine. The good half.'] },
    { id: 'ruut', name: 'Old Ruut', title: 'Punk herder', look: 'ruut', pos: [-34, 98], roles: ['stable'], quests: ['q_strays'],
      hello: ['Domestic Punks. Gentle as sheep, if sheep had vines.', 'Three of my herd wandered off into the countryside. Brainless, the lot of them. Bless them.'] },
    { id: 'sefa', name: 'Sefa', title: 'a young Eikar', look: 'sefa', pos: [4, 70], roles: [], quests: ['q_fennek'],
      hello: ['Have you seen Fennek? He\u2019s a Kipsu. He\u2019s THIS big. Okay, maybe this big.'] },
    { id: 'v1', name: 'Ama', title: 'a baker', look: 'v1', pos: [-24, 52], wander: true, roles: [], quests: ['q_bake'],
      hello: ['Fresh Zahreh buns! Well. Fresh-ish.', 'They say Aakalay swore itself away. My gran says it was the stone that drank it.'] },
    { id: 'v2', name: 'Teodr', title: 'a farmer', look: 'v2', pos: [-60, 40], wander: true, roles: [], quests: ['q_rodak'],
      hello: ['Rodak in the north wood again. They never bother you — till you\u2019re bleeding.', 'Mind the crops, Stamijan.'] },
    { id: 'v3', name: 'Lirra', title: 'a lamplighter', look: 'v3', pos: [20, 30], wander: true, roles: [], quests: ['q_lamps'],
      hello: ['The old Nur Lanterns only wake for a Nur. Lucky you\u2019ve got Phorus.', 'Glide off the Carpenter\u2019s tower sometime. Everyone does it once. Most people only once.'] },
    { id: 'v4', name: 'Bosk', title: 'a dockhand', look: 'v4', pos: [8, 120], wander: true, roles: [], quests: ['q_crates'],
      hello: ['The Stryx won\u2019t fly without a hot seed in the stern. Ask it yourself.', 'Fire trees never burn. Their seeds, though — whoosh.'] },
    { id: 'kw1', name: 'Orrin', title: 'a Keilia builder', look: 'keilia', pos: [30, 70], wander: true, roles: [], quests: ['q_scaffold'],
      hello: ['Mind the scaffold.', 'We build. The Kalo make our hammers. Never the other way round.'] },
  ],
  /* the Carpenter's own land, out along the forest path */
  property: [
    { id: 'buhkon', name: 'Buhkon Eldi', title: 'the Carpenter', look: 'buhkon', pos: [252, 34], roles: [], quests: [],
      hello: ['Calm first, then quick. Calm first.', 'You wore that hat the day I found you. It still suits you, little one.'] },
  ],
  leotik: [
    { id: 'venkin', name: 'Venkin', title: 'Keilia builder', look: 'keilia', at: [-12, -8], roles: ['cook'], quests: ['q_pups'],
      hello: ['Leotik. Everything here wants to bite you, and the wood is excellent.', 'I’ll have a keep standing here within the year. You watch.'] },
    { id: 'hemla', name: 'Hemla', title: 'Kalo’Eik trader', look: 'hemla', at: [-6, 4], roles: ['shop'], quests: [],
      hello: ['Prices are higher on Leotik. Everything here is trying to kill my stock.'] },
    { id: 'duro', name: 'Duro', title: 'Eikar smith', look: 'duro', at: [8, -6], roles: ['forge'], quests: ['q_sru'],
      hello: ['A Sru Vorn tusk. Bring me one and I’ll make you something the Duskareth will write songs about.'] },
    { id: 'ila', name: 'Ila Vos', title: 'Elsha’ryn herbalist', look: 'ila', at: [14, 10], roles: [], quests: ['q_antidote'],
      hello: ['The byrds’ film has turned. The bogs bite. I’m making something for both.'] },
    { id: 'kesh', name: 'Kesh', title: 'Duskareth deserter', look: 'kesh', at: [2, 16], roles: [], quests: ['q_vels'],
      hello: ['I was a Vel. I know how they move. I also know they’d like me dead.'] },
  ],
};

export function buildNpc(def) {
  if (def.look === 'keilia') return cartoon(buildKeilia({ seed: def.id === 'kw1' ? 23 : 11, cloth: def.id === 'kw1' ? 0x5a4a2a : 0x4a5a34, eye: def.id === 'kw1' ? 0x8a6a2a : 0x7a8a2a }));
  if (def.look === 'karnen') return cartoon(buildKarnen({ seed: def.id ? def.id.length : 5 }));
  return buildEikar(NPC_LOOKS[def.look] || {});
}

/* tents, a cookfire, crates, a smith's cauldron — the camp itself */
export function buildCamp(scene, world, cx, cz, opts = {}) {
  const rng = mulberry32(opts.seed || 3);
  const g = new THREE.Group();
  const H = (x, z) => world.heightAt(cx + x, cz + z);
  const add = (m, x, z, y = 0) => { m.position.set(cx + x, H(x, z) + y, cz + z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const tentCols = [0x8a3a2a, 0x2f6f8a, 0xc28b2c, 0x5a6a3a];
  [[-14, 4, 0.4], [16, -8, -0.6], [-4, -16, 0.1], [20, 14, 2.4]].forEach(([x, z, r], i) => {
    const tent = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.6, 4, 1, true), toon(tentCols[i % 4], { side: THREE.DoubleSide }));
    tent.rotation.y = r + Math.PI / 4; add(tent, x, z, 1.7);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 5), toon(0x4a2a14)); add(pole, x, z, 2.1);
    world.col.add(cx + x, cz + z, 2, 2, r, H(x, z) - 1, H(x, z) + 3.4);
  });
  // the cookfire
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.25, 5, 12), toon(0x6a6050)); ring.rotation.x = -Math.PI / 2; add(ring, 0, 0, 0.15);
  for (let i = 0; i < 4; i++) { const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), toon(0x5a3a20)); log.rotation.z = Math.PI / 2; log.rotation.y = i * Math.PI / 4; add(log, 0, 0, 0.25); }
  const fire = glowSprite(0xff8a3a, 3.2, 0.95); add(fire, 0, 0, 0.9);
  // the smith's cauldron
  const caul = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8, 0, TAU, Math.PI * 0.35, Math.PI * 0.65), toon(0x3a3a40, { side: THREE.DoubleSide }));
  add(caul, 10, -9, 0.9);
  const caulGlow = glowSprite(0xffa040, 2.4, 0.8); add(caulGlow, 10, -9, 1.3);
  world.col.add(cx + 10, cz - 9, 0.8, 0.8, 0, H(10, -9) - 1, H(10, -9) + 1.2);
  // crates, sacks, a trader's mat
  for (let i = 0; i < 9; i++) {
    const x = -10 + rng() * 6, z = 2 + rng() * 6;
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), toon(rng() < 0.5 ? 0x8a5a36 : 0x6a4a2a)); c.rotation.y = rng() * 3; add(c, x, z, 0.45 + (i > 5 ? 0.9 : 0));
  }
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), toon(0x8a2a3a)); mat.rotation.x = -Math.PI / 2; add(mat, -6, 6, 0.06);
  // a hutch for the rescued Kipsu pups
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * TAU; if (i === 3) continue;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 5), toon(0x5a3a20)); add(post, 22 + Math.cos(a) * 7, 22 + Math.sin(a) * 7, 0.6);
  }
  // lanterns on poles
  const lamps = [];
  [[-8, -4], [6, 6], [-2, 10], [12, -2]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.8, 5), toon(0x3e2818)); add(p, x, z, 1.4);
    const l = glowSprite(0xffc070, 1.8, 0.9); add(l, x, z, 2.9); lamps.push(l);
  });
  if (opts.banner) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 7, 5), toon(0x3e2818)); add(pole, -2, -4, 3.5);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), toon(0xd9a441, { side: THREE.DoubleSide })); add(flag, -0.9, -4, 6.2);
  }
  scene.add(g);
  return {
    group: g, fire: { x: cx, z: cz }, cauldron: { x: cx + 10, z: cz - 9 }, pen: { x: cx + 22, z: cz + 22 },
    update(t, particles) {
      fire.scale.setScalar(3.2 + Math.sin(t * 11) * 0.25 + Math.sin(t * 7) * 0.2);
      lamps.forEach((l, i) => { l.material.opacity = 0.8 + Math.sin(t * 5 + i) * 0.15; });
      if (particles && Math.random() < 0.6) particles.emit(cx + (Math.random() - 0.5) * 0.8, H(0, 0) + 0.8, cz + (Math.random() - 0.5) * 0.8, { vx: 0, vy: 2 + Math.random(), vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: 0.35, life: 0.9, drag: 0.5 });
      if (particles && Math.random() < 0.3) particles.emit(cx + 10, H(10, -9) + 1.4, cz - 9, { vy: 1.5, speed: 0.5, color: 0xffa040, size: 0.3, life: 0.8 });
    },
  };
}
