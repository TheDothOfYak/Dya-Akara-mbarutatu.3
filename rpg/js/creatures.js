/* ============================================================
   The last of the old creature builders: the Duskareth Vel (an
   Eikar whose marks show the Duat's void-purple when he uses it)
   and the Carpenter's training dummy. Every Esik creature now lives
   in esik_land.js, esik_sky.js and esik_sea.js.
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

/* ---------------- DUSKARETH VEL ---------------- */
export function buildVel() {
  const a = buildEikar({ duat: true,
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
    aura.material.opacity = (0.25 + (st.windup || 0) * 0.5) * (0.8 + 0.5 * night);
  };
  // bioluminescence (on top of the Eikar's own marks): at night the Duat-knives smoulder
  // and the void aura spreads
  let night = 0;
  const baseGlow = a.glow;
  a.glow = v => { night = Math.max(0, Math.min(1, v)); baseGlow(night); km.emissiveIntensity = 0.5 + night * 0.9; };
  a.glow(0);
  return a;
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
