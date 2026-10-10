/* ============================================================
   More of the Esik of the Mbaru Tatu, from the Rokarvac:
   RODAK  — dark, oily, lean and tall; all the same size; scavengers
            that follow trouble expecting an aftermath.
   KIPSU  — weasel face, fox ears, big paws, a very fluffy tail and
            bioluminescent patterns; small ones love causing trouble.
   ALBALI BYRD — five horns coated in a healing film that stings and
            paralyses; on Leotik a poison has turned the film toxic.
   DUSKARETH VEL — Eikar of the Duskareth who throw things out of
            the Duat with precision.
   TYNDAEL — a spark of fire with legs; spits burning venom.
   SRU VORN — long, low, heavy; matted fur armour, tusks, a spiked
            ball tail, and acid saliva.
   THE MALSTI LORD — the fist-sized Punk that carried the lord of
            Aakalay's memory in its stem, swollen by the Urverk.
   ============================================================ */
import * as THREE from 'three';
import { toon, ramp, glowSprite, outlineAll } from './gfx.js';
import { buildEikar } from './actors.js';

const TAU = Math.PI * 2;
const mat = (c, o = {}) => new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: ramp(), emissive: 0x000000 }, o));

function finish(root, thick = 0.03) {
  outlineAll(root, thick);
  root.traverse(m => { if (m.isMesh && m.name !== 'outline' && !(m.material && m.material.transparent)) m.castShadow = true; });
}

function leg(len, r, m) {
  const g = new THREE.Group();
  const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, len, 6), m);
  seg.position.y = -len / 2; g.add(seg);
  return g;
}

/* ---------------- RODAK ---------------- */
export function buildRodak() {
  const root = new THREE.Group();
  const oil = mat(0x1d1a24, { emissive: 0x0a0612 });
  const sheen = mat(0x2c3a3a);
  const body = new THREE.Group(); body.position.y = 1.55; root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.2, 4, 10), oil); torso.rotation.x = Math.PI / 2; body.add(torso);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1.3), sheen); ridge.position.y = 0.3; body.add(ridge);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, 0.8, 6), oil); neck.position.set(0, 0.35, 0.75); neck.rotation.x = 0.7; body.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.7, 1.05); body.add(head);
  const skull = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.75, 6), oil); skull.rotation.x = Math.PI / 2; skull.position.z = 0.25; head.add(skull);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 4), oil); ear.position.set(s * 0.12, 0.2, -0.05); ear.rotation.z = -s * 0.3; head.add(ear);
    const eye = glowSprite(0xd8f0c0, 0.28, 0.9); eye.position.set(s * 0.1, 0.06, 0.18); head.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.08, 1.1, 5), oil); tail.position.set(0, 0.1, -1.05); tail.rotation.x = -1.1; body.add(tail);
  const legs = [];
  [[-0.2, 0.55], [0.2, 0.55], [-0.2, -0.55], [0.2, -0.55]].forEach(([x, z]) => {
    const l = leg(1.45, 0.07, oil); l.position.set(x, 1.4, z); root.add(l); legs.push(l);
  });
  finish(root, 0.025);
  let ph = Math.random() * 6;
  return {
    root, mats: [oil],
    animate(dt, st) {
      ph += dt * (2 + st.speed * 1.6);
      legs.forEach((l, i) => { l.rotation.x = st.speed > 0.3 ? Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * 0.55 : 0; });
      body.position.y = 1.55 + (st.speed > 0.3 ? Math.abs(Math.sin(ph)) * 0.06 : Math.sin(st.t * 2) * 0.02) - (st.windup || 0) * 0.3;
      head.rotation.x = (st.windup || 0) * 0.5 - (st.attack || 0) * 0.4 + Math.sin(st.t * 1.3) * 0.05;
      head.rotation.y = st.speed < 0.3 ? Math.sin(st.t * 0.7) * 0.5 : 0;
      tail.rotation.z = Math.sin(st.t * 3) * 0.3;
    },
    flash(v) { oil.emissive.setRGB(v + 0.04, v * 0.9 + 0.02, v * 0.8 + 0.07); },
  };
}

/* ---------------- KIPSU ---------------- */
export function buildKipsu(scale = 0.6) {
  const root = new THREE.Group();
  const fur = mat(0xc89a62), belly = mat(0xf0dcb8), dark = mat(0x3a2414);
  const glow = new THREE.MeshBasicMaterial({ color: 0x6af0e0 });
  const body = new THREE.Group(); body.position.y = 0.7; root.add(body);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), fur); torso.scale.set(0.85, 0.8, 1.3); body.add(torso);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), belly); chest.position.set(0, -0.1, 0.35); body.add(chest);
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), glow);
    sp.position.set((i % 2 ? 1 : -1) * 0.3, 0.2 + (i % 3) * 0.06, -0.3 + i * 0.12); sp.userData.noOutline = true; body.add(sp);
  }
  const head = new THREE.Group(); head.position.set(0, 0.35, 0.6); body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), fur); skull.scale.set(0.9, 0.85, 1.1); head.add(skull);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.35, 7), belly); snout.rotation.x = Math.PI / 2; snout.position.z = 0.32; head.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), dark); nose.position.z = 0.5; head.add(nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 4), fur); ear.position.set(s * 0.17, 0.3, -0.02); ear.rotation.z = -s * 0.25; head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), dark); eye.position.set(s * 0.13, 0.08, 0.2); head.add(eye);
    for (let k = 0; k < 2; k++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, 0.008), dark); w.position.set(s * 0.18, -0.02 - k * 0.04, 0.38); w.rotation.y = s * 0.3; w.userData.noOutline = true; head.add(w); }
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.15, -0.55); body.add(tail);
  const tm = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), fur); tm.scale.set(0.8, 0.8, 1.6); tm.position.set(0, 0.25, -0.35); tail.add(tm);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), belly); tip.position.set(0, 0.42, -0.75); tail.add(tip);
  const legs = [];
  [[-0.22, 0.3], [0.22, 0.3], [-0.22, -0.3], [0.22, -0.3]].forEach(([x, z]) => {
    const l = leg(0.45, 0.07, fur); l.position.set(x, 0.55, z); root.add(l);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), dark); paw.scale.set(1, 0.5, 1.3); paw.position.y = -0.46; l.add(paw);
    legs.push(l);
  });
  const gl = glowSprite(0x6af0e0, 1.4, 0.35); gl.position.y = 0.8; root.add(gl);
  finish(root, 0.03);
  root.scale.setScalar(scale);
  let ph = Math.random() * 6;
  return {
    root, mats: [fur],
    animate(dt, st) {
      ph += dt * (3 + st.speed * 2.5);
      legs.forEach((l, i) => { l.rotation.x = st.speed > 0.3 ? Math.sin(ph + (i % 2 ? Math.PI : 0)) * 0.8 : 0; });
      body.position.y = 0.7 + (st.speed > 0.3 ? Math.abs(Math.sin(ph)) * 0.12 : 0);
      tail.rotation.y = Math.sin(st.t * 4) * 0.4; tail.rotation.x = Math.sin(st.t * 2) * 0.1;
      head.rotation.y = Math.sin(st.t * 1.1) * 0.3;
      gl.material.opacity = 0.25 + Math.sin(st.t * 3) * 0.1;
    },
    flash(v) { fur.emissive.setRGB(v, v * 0.9, v * 0.8); },
  };
}

/* ---------------- ALBALI BYRD ---------------- */
export function buildAlbali(toxic = false) {
  const root = new THREE.Group();
  const feather = mat(toxic ? 0xc8d0b0 : 0xf2ead8), wingM = mat(toxic ? 0x8a9a6a : 0xd8c8a8, { side: THREE.DoubleSide });
  const film = new THREE.MeshToonMaterial({ color: toxic ? 0x9aff5a : 0xfff0c0, emissive: toxic ? 0x4aff2a : 0xffd27a, emissiveIntensity: 0.6, gradientMap: ramp() });
  const body = new THREE.Group(); body.position.y = 0; root.add(body);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), feather); torso.scale.set(0.75, 0.7, 1.35); body.add(torso);
  const head = new THREE.Group(); head.position.set(0, 0.35, 0.65); body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), feather); head.add(skull);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, 5), mat(0xe0a040)); beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.05, 0.32); head.add(beak);
  // five horns, filmed
  [[0, 0.3, 0.05, 0], [-0.15, 0.22, 0.1, 0.5], [0.15, 0.22, 0.1, -0.5], [-0.22, 0.12, -0.05, 0.9], [0.22, 0.12, -0.05, -0.9]].forEach(([x, y, z, r]) => {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.42, 5), film); h.position.set(x, y + 0.15, z); h.rotation.z = r; h.rotation.x = -0.4; head.add(h);
  });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: 0x101010 })); e.position.set(s * 0.17, 0.05, 0.2); head.add(e); }
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * 0.3, 0.15, 0); body.add(w);
    const shape = new THREE.Shape(); shape.moveTo(0, 0.4); shape.lineTo(1.6, 0.1); shape.lineTo(1.3, -0.35); shape.lineTo(0, -0.4); shape.lineTo(0, 0.4);
    const wm = new THREE.Mesh(new THREE.ShapeGeometry(shape), wingM); wm.rotation.x = -Math.PI / 2; wm.scale.x = s; w.add(wm);
    wings.push(w);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 5), feather); tail.rotation.x = -Math.PI / 2 - 0.2; tail.position.z = -0.8; body.add(tail);
  const hornGlow = glowSprite(toxic ? 0x7aff4a : 0xffe0a0, 1.2, 0.6); hornGlow.position.set(0, 0.55, 0.7); body.add(hornGlow);
  finish(root, 0.025);
  return {
    root, mats: [feather],
    animate(dt, st) {
      const flap = st.diving ? 0.2 : Math.sin(st.t * 9) * 0.7;
      wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * flap; });
      body.rotation.x = st.diving ? 0.6 : Math.sin(st.t * 2) * 0.1;
    },
    flash(v) { feather.emissive.setRGB(v, v * 0.9, v * 0.8); },
  };
}

/* ---------------- DUSKARETH VEL ---------------- */
export function buildVel() {
  const a = buildEikar({
    skin: '#2a2433', cap: '#120e18', marking: 0xb070ff, emblem: 0x9a4aff, build: 1.0, capTall: 0.85,
    weapon: 'spear', leg: 0x15101c, foot: 0x0c0810, beltColor: 0x3a1a5a, relic: 0x9a4aff, cape: 0x1c1028, scale: 1.05,
  });
  // knives hanging out of the Duat around the Vel
  const knives = [];
  const km = new THREE.MeshToonMaterial({ color: 0x5a4a70, emissive: 0x6a2cff, emissiveIntensity: 0.5, gradientMap: ramp() });
  for (let i = 0; i < 3; i++) {
    const k = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.55, 4), km);
    k.userData.ph = i / 3 * TAU; a.root.add(k); knives.push(k);
  }
  const aura = glowSprite(0x7a3aff, 3.5, 0.35); aura.position.y = 1.2; a.root.add(aura);
  const baseAnim = a.animate;
  a.animate = (dt, st) => {
    baseAnim(dt, st);
    knives.forEach((k, i) => {
      const ang = st.t * 1.6 + k.userData.ph;
      k.position.set(Math.cos(ang) * 0.9, 1.8 + Math.sin(st.t * 3 + i) * 0.15, Math.sin(ang) * 0.9);
      k.rotation.set(Math.PI, 0, 0);
      k.visible = !st.thrown || i > 0;
    });
    aura.material.opacity = 0.25 + (st.windup || 0) * 0.5;
  };
  return a;
}

/* ---------------- TYNDAEL ---------------- */
export function buildTyndael() {
  const root = new THREE.Group();
  const coal = mat(0x2a1a14, { emissive: 0x3a0a00 });
  const fin = new THREE.MeshToonMaterial({ color: 0xff7a2a, emissive: 0xff4a10, emissiveIntensity: 0.9, gradientMap: ramp() });
  const body = new THREE.Group(); body.position.y = 0.55; root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.8, 4, 8), coal); torso.rotation.x = Math.PI / 2; body.add(torso);
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4 - i * 0.04, 4), fin); f.position.set(0, 0.3, 0.35 - i * 0.2); body.add(f);
  }
  const head = new THREE.Group(); head.position.set(0, 0.1, 0.65); body.add(head);
  const skull = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 6), coal); skull.rotation.x = Math.PI / 2; skull.position.z = 0.15; head.add(skull);
  for (const s of [-1, 1]) { const e = glowSprite(0xffd040, 0.3, 1); e.position.set(s * 0.12, 0.1, 0.1); head.add(e); }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.0, 6), coal); tail.rotation.x = -Math.PI / 2; tail.position.z = -0.85; body.add(tail);
  const ember = glowSprite(0xff7a2a, 1.6, 0.5); ember.position.y = 0.4; body.add(ember);
  const legs = [];
  [[-0.25, 0.3], [0.25, 0.3], [-0.25, -0.3], [0.25, -0.3]].forEach(([x, z]) => {
    const l = leg(0.4, 0.06, coal); l.position.set(x, 0.45, z); l.rotation.z = x > 0 ? -0.5 : 0.5; root.add(l); legs.push(l);
  });
  finish(root, 0.03);
  root.scale.setScalar(1.1);
  let ph = Math.random() * 6;
  return {
    root, mats: [coal], fin,
    animate(dt, st) {
      ph += dt * (4 + st.speed * 3);
      legs.forEach((l, i) => { l.rotation.x = st.speed > 0.3 ? Math.sin(ph + i * 1.5) * 0.6 : 0; });
      body.rotation.y = st.speed > 0.3 ? Math.sin(ph) * 0.15 : 0;
      head.rotation.x = -(st.windup || 0) * 0.5;
      ember.material.opacity = 0.4 + Math.sin(st.t * 10) * 0.1 + (st.windup || 0) * 0.5;
      fin.emissiveIntensity = 0.8 + (st.windup || 0);
    },
    flash(v) { coal.emissive.setRGB(v + 0.23, v * 0.9 + 0.04, v * 0.8); },
  };
}

/* ---------------- SRU VORN ---------------- */
export function buildSruVorn() {
  const root = new THREE.Group();
  const fur = mat(0x5a4636), furD = mat(0x3a2c22), tusk = mat(0xf0e4c8);
  const acid = new THREE.MeshBasicMaterial({ color: 0xb0ff4a });
  const body = new THREE.Group(); body.position.y = 1.6; root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 3.4, 6, 12), fur); torso.rotation.x = Math.PI / 2; torso.scale.y = 1; torso.scale.x = 1.15; body.add(torso);
  // matted armour plates
  for (let i = 0; i < 9; i++) for (const s of [-1, 0, 1]) {
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 5), furD);
    p.position.set(s * 0.6, 1.05 - Math.abs(s) * 0.15, -1.8 + i * 0.45); p.rotation.x = -0.6; p.rotation.z = -s * 0.5; body.add(p);
  }
  const head = new THREE.Group(); head.position.set(0, -0.1, 2.6); body.add(head);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 1.4), fur); head.add(skull);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 1.1), furD); jaw.position.set(0, -0.55, 0.2); head.add(jaw);
  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.4, 6), tusk); t.position.set(s * 0.5, -0.45, 0.9); t.rotation.set(1.1, 0, s * 0.45); head.add(t);
    const e = glowSprite(0xffe060, 0.5, 1); e.position.set(s * 0.4, 0.2, 0.72); head.add(e);
  }
  const drool = glowSprite(0xb0ff4a, 1.2, 0.8); drool.position.set(0, -0.8, 0.8); head.add(drool);
  // the tail and its spiked ball
  const tail = new THREE.Group(); tail.position.set(0, 0.2, -2.4); body.add(tail);
  const tseg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 2.6, 7), fur); tseg.rotation.x = Math.PI / 2 + 0.3; tseg.position.set(0, 0.4, -1.2); tail.add(tseg);
  const ball = new THREE.Group(); ball.position.set(0, 0.8, -2.6); tail.add(ball);
  ball.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), furD));
  for (let i = 0; i < 12; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 4), tusk);
    const v = new THREE.Vector3().randomDirection();
    sp.position.copy(v).multiplyScalar(0.6); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v); ball.add(sp);
  }
  const legs = [];
  [[-1.0, 1.3], [1.0, 1.3], [-1.0, -1.3], [1.0, -1.3]].forEach(([x, z]) => {
    const l = leg(1.3, 0.32, fur); l.position.set(x, 1.3, z); root.add(l); legs.push(l);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), furD); foot.scale.y = 0.5; foot.position.y = -1.3; l.add(foot);
  });
  finish(root, 0.06);
  root.scale.setScalar(1.25);
  let ph = 0;
  return {
    root, mats: [fur], acid, head, tail, drool,
    animate(dt, st) {
      ph += dt * (1.5 + st.speed * 0.9);
      legs.forEach((l, i) => { l.rotation.x = st.speed > 0.3 ? Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.4 : 0; });
      body.position.y = 1.6 + (st.speed > 0.3 ? Math.abs(Math.sin(ph)) * 0.1 : Math.sin(st.t * 1.4) * 0.04) - (st.windup || 0) * 0.25;
      head.rotation.x = -(st.windup || 0) * 0.35 + (st.attack || 0) * 0.5;
      tail.rotation.y = (st.tail || 0) * 2.4 + Math.sin(st.t * 1.2) * 0.15;
      tail.rotation.x = -(st.tailUp || 0) * 0.6;
      drool.material.opacity = 0.6 + Math.sin(st.t * 6) * 0.3;
    },
    flash(v) { fur.emissive.setRGB(v, v * 0.9, v * 0.8); },
  };
}

/* ---------------- THE MALSTI LORD ---------------- */
export function buildMalstiLord() {
  const root = new THREE.Group();
  const rind = mat(0x5a2a7a, { emissive: 0x200838 });
  const vine = mat(0x2a1a3a);
  const body = new THREE.Group(); body.position.y = 4.2; root.add(body);
  const g = new THREE.SphereGeometry(3, 32, 20), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x), k = 1 - 0.1 * Math.pow(Math.abs(Math.cos(a * 4)), 0.6);
    p.setXYZ(i, v.x * k, v.y * 0.78, v.z * k);
  }
  g.computeVertexNormals();
  const pump = new THREE.Mesh(g, rind); body.add(pump);
  // the lord's Aagac, still on its head
  const capM = mat(0x3a2414);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.6, 18, 10, 0, TAU, 0, Math.PI / 2), capM); cap.position.y = 2.2; cap.scale.y = 0.7; body.add(cap);
  const crown = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.18, 6, 24), mat(0xd8a840, { emissive: 0x5a3a00 })); crown.rotation.x = Math.PI / 2; crown.position.y = 2.25; body.add(crown);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xe0a8ff });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 3), eyeM); e.rotation.x = Math.PI / 2; e.rotation.y = s * 0.2; e.position.set(s * 0.95, 0.5, 2.7); e.userData.noOutline = true; body.add(e);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 0.2), eyeM); mouth.position.set(0, -0.6, 2.75); mouth.userData.noOutline = true; body.add(mouth);
  const glow = glowSprite(0xb070ff, 12, 0.45); body.add(glow);
  // vine tentacles
  const arms = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU;
    const grp = new THREE.Group(); grp.position.set(Math.cos(a) * 2.2, -1, Math.sin(a) * 2.2); grp.rotation.y = -a; body.add(grp);
    const segs = [];
    let parent = grp;
    for (let k = 0; k < 4; k++) {
      const sg = new THREE.Group(); sg.position.x = k ? 1.1 : 0; parent.add(sg);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18 - k * 0.03, 0.25 - k * 0.03, 1.2, 6), vine);
      m.rotation.z = Math.PI / 2; m.position.x = 0.55; sg.add(m);
      segs.push(sg); parent = sg;
    }
    arms.push(segs);
  }
  finish(root, 0.08);
  return {
    root, mats: [rind], body,
    animate(dt, st) {
      body.position.y = 4.2 + Math.sin(st.t * 1.4) * 0.4;
      body.rotation.y = Math.sin(st.t * 0.5) * 0.15;
      arms.forEach((segs, i) => segs.forEach((s, k) => { s.rotation.z = -0.5 + Math.sin(st.t * 2 + i + k * 0.7) * 0.35 - (st.slam || 0) * 0.6; }));
      glow.material.opacity = 0.35 + Math.sin(st.t * 4) * 0.1 + (st.enraged ? 0.2 : 0);
      crown.rotation.z += dt * 0.5;
    },
    flash(v) { rind.emissive.setRGB(v + 0.12, v * 0.85 + 0.03, v + 0.22); },
  };
}

/* ---------------- a straw training dummy ---------------- */
export function buildDummy() {
  const root = new THREE.Group();
  const sack = mat(0xc8a868), wood = mat(0x6a4428), rope = mat(0x8a6a3a);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), wood); post.position.y = 1.1; root.add(post);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.6, 4, 8), sack); body.position.y = 1.35; root.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), sack); head.position.y = 2.15; root.add(head);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 5), wood); arm.rotation.z = Math.PI / 2; arm.position.y = 1.65; root.add(arm);
  for (const y of [1.15, 1.6]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.03, 4, 14), rope); r.rotation.x = Math.PI / 2; r.position.y = y; root.add(r); }
  const target = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshBasicMaterial({ color: 0xc0392b })); target.position.set(0, 1.45, 0.39); target.userData.noOutline = true; root.add(target);
  finish(root, 0.025);
  let wob = 0;
  return {
    root, mats: [sack],
    animate(dt, st) { wob = Math.max(0, wob - dt * 3); root.rotation.z = Math.sin(st.t * 18) * wob * 0.15; },
    flash(v) { sack.emissive.setRGB(v, v * 0.9, v * 0.8); if (v > 0.5) wob = 1; },
  };
}

/* ---------------- KOFI GALTA ----------------
   A long crescent-shaped body with blade-like spines along the top
   and a fluffy dark tail tuft. Breeds like bunnies and is eaten by
   basically everything, so it runs from basically everything. */
export function buildKofi() {
  const root = new THREE.Group();
  const hide = mat(0xb8a070), spine = mat(0xe8dcc0), dark = mat(0x2a1e18);
  const body = new THREE.Group(); body.position.y = 0.32; root.add(body);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 8, 16, Math.PI * 0.95), hide);
  arc.rotation.set(0, Math.PI / 2, 0); arc.position.y = -0.22; body.add(arc);
  for (let i = 0; i < 6; i++) {
    const a = 0.25 + i / 5 * (Math.PI * 0.95 - 0.5);
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 4), spine);
    b.position.set(0, Math.sin(a) * 0.55 - 0.22, Math.cos(a) * 0.55); b.rotation.x = -(a - Math.PI / 2); body.add(b);
  }
  const head = new THREE.Group(); head.position.set(0, -0.12, 0.42); body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), hide); skull.scale.set(0.9, 0.85, 1.2); head.add(skull);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), dark); eye.position.set(s * 0.08, 0.04, 0.11); head.add(eye);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), hide); ear.position.set(s * 0.07, 0.13, -0.02); head.add(ear);
  }
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), dark); tuft.scale.set(0.8, 0.8, 1.3); tuft.position.set(0, -0.15, -0.5); body.add(tuft);
  const legs = [];
  [[-0.1, 0.25], [0.1, 0.25], [-0.1, -0.25], [0.1, -0.25]].forEach(([x, z]) => { const l = leg(0.22, 0.03, dark); l.position.set(x, 0.22, z); root.add(l); legs.push(l); });
  finish(root, 0.02);
  let ph = Math.random() * 6;
  return {
    root, mats: [hide],
    animate(dt, st) {
      ph += dt * (4 + st.speed * 4);
      legs.forEach((l, i) => { l.rotation.x = st.speed > 0.3 ? Math.sin(ph + (i % 2 ? Math.PI : 0)) * 0.9 : 0; });
      body.position.y = 0.32 + (st.speed > 0.3 ? Math.abs(Math.sin(ph)) * 0.08 : 0);
      tuft.rotation.y = Math.sin(st.t * 5) * 0.5;
      head.rotation.y = st.speed > 0.3 ? 0 : Math.sin(st.t * 1.7) * 0.5;
    },
    flash(v) { hide.emissive.setRGB(v, v * 0.9, v * 0.8); },
  };
}
