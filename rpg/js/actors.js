/* ============================================================
   Who walks the ruins.
   EIKAR are the acorn people — acorn-textured skin, a body broad
   at the top that comes to a rounded point, markings beneath the
   eyes, and an Aagac (acorn-cap hat) that is part of them, with a
   symbol on it naming what kind of Eikar they are. They have no
   hands: weapons simply float beside them.
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

function skinTexture(base) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(${i % 2 ? '255,240,210' : '40,20,5'},0.06)`; g.lineWidth = 2 + (i % 3);
    const x = (i * 37) % 128; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 40, x - 6, 80, x + 3, 128); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
  return t;
}

/* ---------------- weapons ---------------- */
function makeAxe() {
  const g = new THREE.Group();
  const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 6), toon(0x4a2a18));
  g.add(haft);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.18); shape.quadraticCurveTo(0.35, 0.32, 0.62, 0.52); shape.quadraticCurveTo(0.5, 0, 0.62, -0.5);
  shape.quadraticCurveTo(0.35, -0.3, 0, -0.18); shape.lineTo(0, 0.18);
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }),
    new THREE.MeshToonMaterial({ color: 0x3a3048, emissive: 0x6a2cff, emissiveIntensity: 0.25, gradientMap: ramp() }));
  blade.position.set(0.04, 0.55, -0.03);
  g.add(blade);
  const edge = glowSprite(0xb07aff, 0.9, 0.6); edge.position.set(0.55, 0.55, 0); g.add(edge);
  const back = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4), toon(0x2a2236)); back.rotation.z = Math.PI / 2; back.position.set(-0.15, 0.55, 0); g.add(back);
  g.userData.glow = edge; g.userData.blade = blade;
  return g;
}

function makeSpear() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.1, 6), toon(0x6a4a2a)); g.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), new THREE.MeshToonMaterial({ color: 0x9fd8ee, emissive: 0x2a9ad0, emissiveIntensity: 0.6, gradientMap: ramp() }));
  tip.position.y = 1.3; g.add(tip);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 4, 10), toon(0xe0c070)); tie.rotation.x = Math.PI / 2; tie.position.y = 1.02; g.add(tie);
  const gl = glowSprite(0x6ad0ff, 0.8, 0.7); gl.position.y = 1.35; g.add(gl);
  g.userData.glow = gl;
  return g;
}

/* ================================================================
   EIKAR
   ================================================================ */
export function buildEikar(o) {
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 0.95; root.add(body);
  const skinMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: skinTexture(o.skin), gradientMap: ramp(), emissive: 0x000000 });
  const mats = [skinMat];

  // the acorn body — broad at the top, a rounded point below
  const prof = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, y = -0.62 + t * 1.1;
    const r = t < 0.72 ? 0.07 + Math.pow(t / 0.72, 0.8) * 0.5 : 0.57 * Math.cos((t - 0.72) / 0.28 * Math.PI * 0.42);
    prof.push(new THREE.Vector2(Math.max(0.04, r * (o.build || 1)), y));
  }
  prof.push(new THREE.Vector2(0.001, 0.5));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), skinMat);
  body.add(torso);

  // face: eyes, glints, markings beneath the eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a0f08 });
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xfff6e6 });
  const markMat = new THREE.MeshBasicMaterial({ color: o.marking || 0xf3dca0 });
  const fz = 0.56 * (o.build || 1);   // the face sits on the body's surface
  for (const s of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), whiteMat);
    white.position.set(s * 0.2, 0.17, fz - 0.03); white.scale.set(1, 1.2, 0.55); white.userData.noOutline = true; body.add(white);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), eyeMat);
    eye.position.set(s * 0.19, 0.16, fz + 0.03); eye.scale.set(1, 1.3, 0.5); eye.userData.noOutline = true; body.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(s * 0.19 + 0.025, 0.2, fz + 0.065); glint.userData.noOutline = true; body.add(glint);
    // the markings beneath the eyes
    for (let k = 0; k < 2; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.02), markMat);
      m.position.set(s * (0.21 + k * 0.03), -0.01 - k * 0.055, fz - 0.03 - k * 0.04); m.rotation.z = s * 0.3; m.userData.noOutline = true; body.add(m);
    }
  }

  // the Aagac: acorn-cap hat, with the kind-symbol on its brow
  const capMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: capTexture(o.cap), gradientMap: ramp(), emissive: 0x000000 });
  mats.push(capMat);
  const hat = new THREE.Group(); hat.position.y = 0.42; body.add(hat);
  const capMesh = new THREE.Mesh(new THREE.SphereGeometry(0.64, 22, 12, 0, TAU, 0, Math.PI * 0.5), capMat);
  capMesh.scale.set(1, o.capTall || 0.62, 1); hat.add(capMesh);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 6, 24), capMat); rim.rotation.x = Math.PI / 2; hat.add(rim);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.24, 6), toon(0x4a2c18)); stem.position.y = 0.44; stem.rotation.z = 0.3; hat.add(stem);
  const emb = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), new THREE.MeshBasicMaterial({ color: o.emblem || 0xf3dca0 }));
  emb.position.set(0, 0.17, 0.56); emb.rotation.x = -0.45; emb.userData.noOutline = true; hat.add(emb);
  const embG = glowSprite(o.emblem || 0xf3dca0, 0.4, 0.5); embG.position.copy(emb.position); hat.add(embG);

  // belt and relic
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.42 * (o.build || 1), 0.045, 5, 20), toon(o.beltColor || 0x5a3420));
  belt.rotation.x = Math.PI / 2; belt.position.y = -0.18; body.add(belt);
  let relic = null;
  if (o.relic) {
    relic = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: o.relic }));
    relic.position.set(0, -0.18, 0.44); relic.userData.noOutline = true; body.add(relic);
    const rg = glowSprite(o.relic, 0.55, 0.85); rg.position.copy(relic.position); body.add(rg); relic.userData.glow = rg;
  }

  // a long coat-tail cape, for the swagger
  let cape = null;
  if (o.cape) {
    const cg = new THREE.PlaneGeometry(0.85, 1.05, 3, 6); cg.translate(0, -0.52, 0);
    const pp = cg.attributes.position;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i); pp.setZ(i, -Math.pow(x / 0.43, 2) * 0.12); }
    cg.computeVertexNormals();
    cape = new THREE.Mesh(cg, toon(o.cape, { side: THREE.DoubleSide }));
    cape.position.set(0, 0.32, -0.42); body.add(cape);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.05, 0.05), toon(0xe6b84a)); trim.position.set(0, -1.04, 0); cape.add(trim);
  }

  // short sturdy legs
  const legMat = toon(o.leg || 0x4a2c1a);
  const footMat = toon(o.foot || 0x3a2212);
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.17, 0.48, 0); root.add(hip);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.3, 3, 8), legMat); leg.position.y = -0.2; hip.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), footMat); foot.scale.set(1, 0.55, 1.5); foot.position.set(0, -0.42, 0.05); hip.add(foot);
    legs.push(hip);
  }

  // arms — the right hand keeps hold of the weapon, the left swings as they walk
  const handMat = toon(o.hand || o.leg || 0x4a2c1a);
  const arms = [-1, 1].map(s => {
    const g = new THREE.Group(); g.position.set(s * 0.5 * (o.build || 1), 0.2, 0.04); body.add(g);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.42, 3, 8), skinMat); up.rotation.x = Math.PI / 2; up.position.z = 0.27; g.add(up);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.025, 5, 10), toon(o.beltColor || 0x5a3420)); cuff.position.z = 0.42; g.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), handMat); hand.scale.set(1, 0.9, 1.15); hand.position.z = 0.55; g.add(hand);
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 5), handMat); thumb.position.set(-s * 0.07, 0.05, -0.03); hand.add(thumb);
    return { s, g, up, cuff, hand };
  });
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  const rootScale = o.scale || 1;
  function reach(arm, worldTarget) {
    arm.g.lookAt(worldTarget);
    arm.g.getWorldPosition(tmpB);
    const d = Math.min(1.25, Math.max(0.3, tmpB.distanceTo(worldTarget) / rootScale));
    arm.up.scale.y = d / 0.56; arm.up.position.z = d / 2;
    arm.cuff.position.z = d - 0.13; arm.hand.position.z = d;
  }

  // the weapon, in hand
  const wPivot = new THREE.Group(); wPivot.position.y = 1.0; root.add(wPivot);
  const weapon = o.weapon === 'spear' ? makeSpear() : makeAxe();
  const wHold = new THREE.Group(); wPivot.add(wHold); wHold.add(weapon);

  // Phorus carries a little Nur-light
  let nur = null;
  if (o.nur) { nur = glowSprite(o.nur, 0.9, 0.95); nur.position.set(0.6, 2.0, -0.2); root.add(nur); }

  outlineAll(root, 0.022);
  root.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; });
  root.scale.setScalar(o.scale || 1);

  let phase = 0, swingBlend = 0;
  const A = {
    root, body, hat, weapon, wPivot, wHold, cape, relic, nur, mats,
    /* st: { speed, onGround, vy, t, swing: null | { kind: 1|2|3, p: 0..1 }, cast } */
    animate(dt, st) {
      const moving = st.speed > 0.5;
      phase += dt * (moving ? 2.2 + st.speed * 1.05 : 0);
      const k = clamp(st.speed / 7, 0, 1.3);
      // legs
      legs.forEach((h, i) => {
        const s = i ? 1 : -1;
        let target = moving && st.onGround ? Math.sin(phase + (i ? Math.PI : 0)) * 0.85 * k : 0;
        if (!st.onGround) target = i ? -0.6 : 0.4;
        h.rotation.x = lerp(h.rotation.x, target, 1 - Math.exp(-18 * dt));
        h.position.z = 0;
        h.position.x = s * 0.17;
      });
      const bob = moving && st.onGround ? Math.abs(Math.sin(phase)) * 0.07 * k : Math.sin(st.t * 2.2) * 0.02;
      body.position.y = 0.95 + bob;
      body.rotation.x = lerp(body.rotation.x, (moving ? 0.12 * k : 0) + (st.swing ? 0.12 : 0), 1 - Math.exp(-10 * dt));
      body.rotation.z = moving ? Math.sin(phase) * 0.05 * k : 0;
      hat.rotation.z = Math.sin(st.t * 1.7) * 0.03;
      if (cape) cape.rotation.x = lerp(cape.rotation.x, -0.15 - k * 0.6 - (st.onGround ? 0 : 0.5) + Math.sin(st.t * 6) * 0.05 * (k + 0.3), 1 - Math.exp(-8 * dt));
      if (relic) { relic.rotation.y += dt * 3; relic.userData.glow.scale.setScalar(0.5 + (st.heat || 0) * 0.6 + Math.sin(st.t * 8) * 0.04); }
      if (nur) nur.position.set(0.7 + Math.sin(st.t * 1.3) * 0.15, 2.0 + Math.sin(st.t * 2.1) * 0.15, -0.2);

      // weapon: hover at the side, or whirl through a swing
      swingBlend = lerp(swingBlend, st.swing ? 1 : 0, 1 - Math.exp(-(st.swing ? 30 : 8) * dt));
      const idleY = -1.95, R = o.weapon === 'spear' ? 0.85 : 0.95;
      let py = idleY, px = 0, pz = 0, hx = 0, hz = 0, rad = R, wy = Math.sin(st.t * 2) * 0.08;
      if (st.swing) {
        const p = st.swing.p, e = 1 - Math.pow(1 - p, 2.4);
        if (st.swing.kind === 1) { py = lerp(-2.0, 1.9, e); pz = -0.15; hx = Math.PI / 2; rad = 1.25; }
        else if (st.swing.kind === 2) { py = lerp(1.9, -2.0, e); pz = 0.15; hx = Math.PI / 2; rad = 1.25; }
        else if (st.swing.kind === 3) { py = 0; px = lerp(-2.4, 0.75, e); hx = Math.PI / 2; rad = 1.35; }
        else if (st.swing.kind === 4) { py = 0; px = lerp(-0.3, 0.2, e); hx = Math.PI / 2; rad = lerp(1.0, 2.2, Math.sin(p * Math.PI)); } // a thrust
      }
      wPivot.rotation.set(lerp(0, px, swingBlend), lerp(idleY, py, swingBlend), lerp(0, pz, swingBlend));
      wHold.position.set(0, lerp(wy, 0, swingBlend), lerp(R, rad, swingBlend));
      wHold.rotation.set(lerp(0.15, hx, swingBlend), lerp(0, 0, swingBlend), lerp(-0.2, hz, swingBlend));
      if (weapon.userData.glow) weapon.userData.glow.material.opacity = 0.35 + swingBlend * 0.65;
      // hands: right on the haft, left swinging (or raised to drink)
      root.updateMatrixWorld(true);
      reach(arms[0], weapon.localToWorld(tmpA.set(0, o.weapon === 'spear' ? -0.15 : -0.42, 0)));
      const sw = moving ? Math.sin(phase) * 0.35 * k : Math.sin(st.t * 1.6) * 0.04;
      if (st.drink) body.localToWorld(tmpA.set(0.12, 0.05, 0.62));
      else if (st.swing && st.swing.kind === 3) body.localToWorld(tmpA.set(0.2, 0.75, 0.45));
      else body.localToWorld(tmpA.set(0.62 * (o.build || 1), -0.32, 0.05 - sw));
      reach(arms[1], tmpA);
    },
    flash(v) { mats.forEach(m => m.emissive.setRGB(v + 0.07, v * 0.9 + 0.055, v * 0.8 + 0.04)); },
  };
  return A;
}

export function buildTorcain() {
  return buildEikar({
    skin: '#8a5a3a', cap: '#3d2618', marking: 0xffb04a, emblem: 0xc89aff, build: 1.1, capTall: 0.7,
    cape: 0x7a1e26, relic: 0xff8a2a, weapon: 'axe', leg: 0x3c2414, foot: 0x2a160c, beltColor: 0x2c1a10, scale: 1.12,
  });
}

export function buildPhorus() {
  return buildEikar({
    skin: '#5d6f86', cap: '#2c3d52', marking: 0xbfe8ff, emblem: 0x7ad8ff, build: 1.16, capTall: 0.5,
    weapon: 'spear', leg: 0x34465a, foot: 0xd8e8f0, beltColor: 0xc8a050, nur: 0xbfeaff, scale: 1.1,
  });
}

/* ================================================================
   PUNKS
   ================================================================ */
function pumpkinGeo(r, ribs = 6) {
  const g = new THREE.SphereGeometry(r, 24, 14);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x), k = 1 - 0.09 * Math.pow(Math.abs(Math.cos(a * ribs / 2)), 0.6);
    v.x *= k; v.z *= k; v.y *= 0.78;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export function buildPunk(malsti = false, opts = {}) {
  const tame = !!opts.domestic;
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshToonMaterial({ color: malsti ? 0x5a3a7a : tame ? 0xe8a85a : 0xd9792a, gradientMap: ramp(), emissive: malsti ? 0x2a0a4a : 0x000000 });
  const vineMat = toon(malsti ? 0x3a2a4a : tame ? 0x6a8a3a : 0x5a7a2a);
  const body = new THREE.Group(); body.position.y = 1.0; root.add(body);
  const pump = new THREE.Mesh(pumpkinGeo(0.75, malsti ? 5 : 6), bodyMat); body.add(pump);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.4, 6), toon(malsti ? 0x2a1a3a : 0x4a5a1a)); stem.position.y = 0.66; stem.rotation.z = 0.4; body.add(stem);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), vineMat); leaf.scale.set(1.4, 0.2, 0.8); leaf.position.set(0.18, 0.68, 0); body.add(leaf);
  // a face of embers
  const eyeCol = malsti ? 0xd08aff : tame ? 0xfff2c0 : 0xffd040;
  const eyeMat = new THREE.MeshBasicMaterial({ color: eyeCol });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.18, 3), eyeMat); e.rotation.x = Math.PI / 2; e.rotation.y = s * 0.2;
    e.position.set(s * 0.24, 0.12, 0.68); e.userData.noOutline = true; body.add(e);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.05), eyeMat); mouth.position.set(0, -0.14, 0.7); mouth.userData.noOutline = true; body.add(mouth);
  const eyeGlow = glowSprite(eyeCol, 1.0, 0.6); eyeGlow.position.set(0, 0.05, 0.72); body.add(eyeGlow);
  // vine legs and arms
  const legs = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const hip = new THREE.Group(); hip.position.set(Math.cos(a) * 0.45, 0.75, Math.sin(a) * 0.45); hip.rotation.y = -a; root.add(hip);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.0, 5), vineMat);
    seg.position.set(0.3, -0.35, 0); seg.rotation.z = 0.85; hip.add(seg);
    legs.push(hip);
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.65, 1.15, 0.2); root.add(sh);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 5), vineMat); arm.position.y = -0.1; arm.position.z = 0.35; arm.rotation.x = 1.2; sh.add(arm);
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 4), toon(0x3a2a1a)); claw.position.set(0, 0.12, 0.78); claw.rotation.x = Math.PI / 2; sh.add(claw);
    arms.push(sh);
  }
  let aura = null;
  if (malsti) { aura = glowSprite(0x9a4aff, 3, 0.35); aura.position.y = 1.0; root.add(aura); }
  outlineAll(root, 0.035);
  root.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; });
  if (tame) {
    // a herder's saddle and blanket on its back
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.1), toon(opts.blanket || 0x2f6f8a)); blanket.position.y = 0.66; body.add(blanket);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.7), toon(0x6a3a1e)); saddle.position.y = 0.76; body.add(saddle);
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.25, 6), toon(0x4a2a14)); horn.position.set(0, 0.92, 0.25); body.add(horn);
    outlineAll(blanket, 0.02);
  }
  root.scale.setScalar(malsti ? 0.5 : tame ? 1.35 : 1.0);
  let ph = Math.random() * 6;
  return {
    root, body, mats: [bodyMat],
    animate(dt, st) {
      ph += dt * (2 + st.speed * 2.2);
      legs.forEach((h, i) => { h.rotation.z = st.speed > 0.3 ? Math.sin(ph + i * 1.6) * 0.35 : Math.sin(st.t * 2 + i) * 0.05; });
      const wind = st.windup || 0, atk = st.attack || 0;
      body.position.y = 1.0 + (st.speed > 0.3 ? Math.abs(Math.sin(ph)) * 0.12 : Math.sin(st.t * 3) * 0.03) - wind * 0.2;
      body.scale.set(1 + wind * 0.15, 1 - wind * 0.15, 1 + wind * 0.15);
      body.rotation.x = -wind * 0.3 + atk * 0.5;
      arms.forEach((a, i) => { a.rotation.x = -wind * 1.2 + atk * 1.4 + Math.sin(ph + i * 3) * 0.2; });
      eyeGlow.material.opacity = 0.5 + wind * 0.5;
      if (aura) aura.material.opacity = 0.25 + Math.sin(st.t * 5) * 0.1;
    },
    flash(v) { bodyMat.emissive.setRGB(v + (malsti ? 0.16 : 0), v * 0.9, v * 0.8 + (malsti ? 0.29 : 0)); },
  };
}

/* ================================================================
   THE MEGLA AAGAC OF AAKALAY — the Oath-Rooted
   ================================================================ */
export function buildMegla() {
  const root = new THREE.Group();
  const barkMat = new THREE.MeshToonMaterial({ color: 0x4a4258, gradientMap: ramp(), emissive: 0x000000 });
  // twisted trunk
  const tg = new THREE.CylinderGeometry(1.4, 3.2, 12, 10, 12);
  const p = tg.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = (v.y + 6) * 0.14, c = Math.cos(a), s = Math.sin(a);
    const nx = v.x * c - v.z * s, nz = v.x * s + v.z * c;
    const bump = 1 + Math.sin(v.y * 2.1 + Math.atan2(v.z, v.x) * 3) * 0.08;
    p.setXYZ(i, nx * bump, v.y, nz * bump);
  }
  tg.computeVertexNormals();
  const trunk = new THREE.Mesh(tg, barkMat); trunk.position.y = 6; root.add(trunk);
  // the forced Hurst glowing in its heart
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), new THREE.MeshBasicMaterial({ color: 0xd8a8ff }));
  core.position.set(0, 6.5, 1.65); core.userData.noOutline = true; root.add(core);
  const coreGlow = glowSprite(0xa060ff, 5, 0.9); coreGlow.position.copy(core.position); root.add(coreGlow);
  // face of cracks
  for (const s of [-1, 1]) {
    const eye = glowSprite(0xe0b0ff, 1.2, 1); eye.position.set(s * 0.7, 9.4, 1.35); root.add(eye);
  }
  // great limbs
  const limbs = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 1.3, 10, 0); root.add(sh);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 6, 7), barkMat);
    upper.position.set(s * 2.6, 0.6, 0); upper.rotation.z = s * -1.2; sh.add(upper);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 5, 6), barkMat);
    fore.position.set(s * 5.6, -1.4, 0); fore.rotation.z = s * -0.4; sh.add(fore);
    for (let k = 0; k < 3; k++) {
      const tw = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.6, 4), barkMat);
      tw.position.set(s * (6.4 + k * 0.2), -3.6, (k - 1) * 0.5); tw.rotation.z = s * 0.4; sh.add(tw);
    }
    limbs.push(sh);
  }
  // roots
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU;
    const pts = [new THREE.Vector3(Math.cos(a) * 1.8, 2.2, Math.sin(a) * 1.8), new THREE.Vector3(Math.cos(a) * 4, 0.6, Math.sin(a) * 4), new THREE.Vector3(Math.cos(a) * 6.5, -0.4, Math.sin(a) * 6.5)];
    root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.55, 6), barkMat));
  }
  // a crown of mist
  const mistMat = new THREE.MeshToonMaterial({ color: 0xb8a8d8, transparent: true, opacity: 0.55, gradientMap: ramp(), emissive: 0x4a2a7a, emissiveIntensity: 0.4, depthWrite: false });
  const mist = [];
  for (let k = 0; k < 11; k++) {
    const a = Math.random() * TAU, r = Math.random() * 4.5;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + Math.random() * 2, 1), mistMat);
    m.position.set(Math.cos(a) * r, 13.5 + Math.random() * 3.5, Math.sin(a) * r); m.userData.ph = Math.random() * 6;
    root.add(m); mist.push(m);
  }
  outlineAll(root, 0.07);
  root.traverse(m => { if (m.isMesh && m.name !== 'outline' && !m.material.transparent) m.castShadow = true; });
  return {
    root, core, mats: [barkMat], limbs,
    animate(dt, st) {
      const t = st.t;
      root.children[0].rotation.y = Math.sin(t * 0.4) * 0.05;
      mist.forEach(m => { m.position.y += Math.sin(t * 0.8 + m.userData.ph) * dt * 0.4; m.rotation.y += dt * 0.1; });
      const sweep = st.sweep || 0, slam = st.slam || 0;
      limbs.forEach((l, i) => {
        const s = i ? 1 : -1;
        l.rotation.z = Math.sin(t * 0.9 + i) * 0.08 + slam * s * 0.6;
        l.rotation.y = sweep * s * 1.4 + Math.sin(t * 0.6) * 0.05;
        l.rotation.x = -slam * 0.7;
      });
      coreGlow.scale.setScalar(5 + Math.sin(t * 4) * 0.5 + (st.enraged ? 2 : 0));
      core.rotation.y += dt;
    },
    flash(v) { barkMat.emissive.setRGB(v, v * 0.85, v); },
  };
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
