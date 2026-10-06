/* ============================================================
   Folk of the camps. Eikar of every sort, a Kalo'Eik trader,
   and Venkin — a Keilia: far larger than the Eikar and built for
   building, hair overlapping like armour from the head and
   falling thick from the shoulders to the calf like a cape. The
   Kalo make the Keilia's hammers; a Keilia never fights with one.
   ============================================================ */
import * as THREE from 'three';
import { toon, ramp, glowSprite, outlineAll } from './gfx.js';
import { buildEikar } from './actors.js';
import { mulberry32 } from './util.js';

const TAU = Math.PI * 2;

/* ---------------- a Keilia ---------------- */
export function buildKeilia(o = {}) {
  const root = new THREE.Group();
  const skin = new THREE.MeshToonMaterial({ color: o.skin || 0xc8a070, gradientMap: ramp(), emissive: 0x000000 });
  const hair = new THREE.MeshToonMaterial({ color: o.hair || 0x5a3a2a, gradientMap: ramp(), side: THREE.DoubleSide });
  const hair2 = new THREE.MeshToonMaterial({ color: o.hair2 || 0x7a5232, gradientMap: ramp(), side: THREE.DoubleSide });
  const cloth = toon(o.cloth || 0x4a5a3a);
  const body = new THREE.Group(); body.position.y = 1.55; root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.8, 4, 10), cloth); torso.scale.set(1.1, 1, 0.8); body.add(torso);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.06, 5, 18), toon(0x3a2414)); belt.rotation.x = Math.PI / 2; belt.position.y = -0.38; belt.scale.set(1.1, 0.8, 1); body.add(belt);
  const head = new THREE.Group(); head.position.y = 0.95; body.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), skin); face.scale.set(0.9, 1.05, 0.95); head.add(face);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a120a })); eye.position.set(s * 0.11, 0.04, 0.26); head.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 5), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.04, 0.3); head.add(nose);
  // hair: overlapping shingles over the crown and down the back
  for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 1.3 - Math.PI * 0.15 + Math.PI;   // round the back and sides
    const lock = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.34), r % 2 ? hair : hair2);
    lock.position.set(Math.sin(a) * 0.3, 0.22 - r * 0.16, Math.cos(a) * 0.3);
    lock.rotation.y = a; lock.rotation.x = -0.25; head.add(lock);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.31, 12, 8, 0, TAU, 0, Math.PI * 0.42), hair); crown.position.y = 0.04; head.add(crown);
  // the shoulder-cape of hair, shingled to the calf
  const cape = new THREE.Group(); cape.position.set(0, 0.55, -0.28); body.add(cape);
  for (let r = 0; r < 7; r++) for (let i = 0; i < 6; i++) {
    const w = 0.24 - r * 0.005;
    const lock = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.42), (r + i) % 2 ? hair : hair2);
    lock.position.set((i - 2.5) * 0.19 * (1 + r * 0.04), -r * 0.3, -r * 0.03);
    lock.rotation.x = 0.12; cape.add(lock);
  }
  for (const s of [-1, 1]) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), hair); pad.scale.set(1.2, 0.7, 1); pad.position.set(s * 0.5, 0.5, -0.05); body.add(pad);
  }
  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.55, 0.42, 0); body.add(sh);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.55, 3, 8), skin); up.position.y = -0.35; sh.add(up);
    const fore = new THREE.Group(); fore.position.y = -0.7; sh.add(fore);
    const lo = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.45, 3, 8), skin); lo.position.y = -0.28; fore.add(lo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), skin); hand.position.y = -0.58; fore.add(hand);
    arms.push({ sh, fore });
  }
  // legs
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.22, 0.95, 0); root.add(hip);
    const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.65, 3, 8), cloth); l.position.y = -0.45; hip.add(l);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.36), toon(0x3a2414)); boot.position.set(0, -0.9, 0.06); hip.add(boot);
    legs.push(hip);
  }
  // the Kalo-made hammer, floating at the hip — a tool, never a weapon
  const hammer = new THREE.Group();
  const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 6), toon(0x6a4a2a)); hammer.add(haft);
  const head2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.18), new THREE.MeshToonMaterial({ color: 0x8a8a9a, emissive: 0x2a3a6a, emissiveIntensity: 0.4, gradientMap: ramp() })); head2.position.y = 0.45; hammer.add(head2);
  hammer.position.set(0.85, 1.3, 0.1); hammer.rotation.z = 0.3; root.add(hammer);
  outlineAll(root, 0.03);
  root.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; });
  root.scale.setScalar(o.scale || 1.25);
  let ph = 0;
  return {
    root, mats: [skin],
    animate(dt, st) {
      const moving = st.speed > 0.3;
      ph += dt * (moving ? 6 : 0);
      legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(ph + i * Math.PI) * 0.5 : 0; });
      body.position.y = 1.55 + Math.sin(st.t * 1.8) * 0.02;
      head.rotation.y = st.look ?? Math.sin(st.t * 0.4) * 0.3;
      arms.forEach((a, i) => {
        a.sh.rotation.x = moving ? Math.sin(ph + i * Math.PI + Math.PI) * 0.4 : (st.talking && i === 0 ? -0.6 + Math.sin(st.t * 3) * 0.25 : 0.05);
        a.fore.rotation.x = st.talking && i === 0 ? -0.8 : -0.15;
      });
      cape.rotation.x = 0.05 + Math.sin(st.t * 1.2) * 0.03;
      hammer.position.y = 1.3 + Math.sin(st.t * 2) * 0.05; hammer.rotation.y += dt * 0.4;
    },
    flash(v) { skin.emissive.setRGB(v, v * 0.9, v * 0.8); },
  };
}

/* ---------------- who lives in the camps ---------------- */
export const NPC_LOOKS = {
  buhkon: { skin: '#b8804a', cap: '#5a3018', marking: 0xfff0c8, emblem: 0xff9a3a, build: 1.12, weapon: 'axe', leg: 0x5a3420, foot: 0x3a2010, beltColor: 0x8a5a2a, relic: 0xffb050, scale: 1.08, capTall: 0.75 },
  v1: { skin: '#c89a6a', cap: '#6a3a1a', marking: 0xffe0a0, emblem: 0xd8c070, build: 1.0, weapon: 'spear', leg: 0x5a3a20, foot: 0x3a2412, beltColor: 0x2f6f8a, scale: 0.95 },
  v2: { skin: '#a8784a', cap: '#3a2a1a', marking: 0xffc0a0, emblem: 0xc89070, build: 1.1, weapon: 'axe', leg: 0x4a3a2a, foot: 0x2a1a0a, beltColor: 0x8a3a2a, scale: 1.0 },
  v3: { skin: '#d8b080', cap: '#7a4a2a', marking: 0xffd0e0, emblem: 0xff9ac8, build: 0.92, weapon: 'spear', leg: 0x6a4a30, foot: 0x3a2a1a, beltColor: 0x5a8a3a, scale: 0.9 },
  v4: { skin: '#9a7050', cap: '#4a2a14', marking: 0xe0e0a0, emblem: 0xb0d070, build: 1.15, weapon: 'axe', leg: 0x3a2a1a, foot: 0x2a1a0a, beltColor: 0xc28b2c, scale: 1.05 },
  hemla: { skin: '#6a7a90', cap: '#334458', marking: 0xd8f0ff, emblem: 0x7ad8ff, build: 1.05, weapon: 'spear', leg: 0x3a4a5a, foot: 0xe0e8f0, beltColor: 0xc8a050, cape: 0x2a5a6a, scale: 1.0 },
  duro: { skin: '#9a6a3a', cap: '#4a2a14', marking: 0xffc060, emblem: 0xff8a3a, build: 1.2, weapon: 'axe', leg: 0x4a2c1a, foot: 0x2a160c, beltColor: 0x2a1a10, relic: 0xff7a2a, scale: 1.05 },
  ruut: { skin: '#a08050', cap: '#5a4a2a', marking: 0xe0d0a0, emblem: 0xb0d070, build: 1.15, weapon: 'spear', leg: 0x5a4a30, foot: 0x3a2a14, beltColor: 0x6a5a2a, scale: 0.95, capTall: 0.5 },
  sefa: { skin: '#b08a5a', cap: '#6a3a2a', marking: 0xffb0d0, emblem: 0xff8ac8, build: 0.85, weapon: 'spear', leg: 0x6a4a30, foot: 0x3a2a1a, beltColor: 0x8a3a5a, scale: 0.7 },
  ila: { skin: '#7a9a6a', cap: '#2a4a2a', marking: 0xc8ff9a, emblem: 0x9aff6a, build: 0.95, weapon: 'spear', leg: 0x2a3a2a, foot: 0x1a2a1a, beltColor: 0x4a6a3a, cape: 0x3a5a2a, scale: 1.0 },
  kesh: { skin: '#3a3444', cap: '#1a1420', marking: 0xb070ff, emblem: 0x6a3aaa, build: 1.0, weapon: 'axe', leg: 0x1a1420, foot: 0x0c0810, beltColor: 0x3a1a5a, cape: 0x221630, scale: 1.05 },
};

export const NPCS = {
  /* Aakalay is abandoned — nobody lives there now */
  aakalay: [],
  /* Xilia, the home town (positions are absolute here) */
  xilia: [
    { id: 'buhkon', name: 'Buhkon Eldi', title: 'the Carpenter', look: 'buhkon', pos: [52, 98], roles: [], quests: [],
      hello: ['Calm first, then quick. Calm first.', 'You wore that hat the day I found you. It still suits you, little one.'] },
    { id: 'hemla', name: 'Hemla', title: 'Kalo\u2019Eik trader', look: 'hemla', pos: [-8, 60], roles: ['shop'], quests: ['q_vel'],
      hello: ['Shards for goods, goods for shards. The Kalo keep fair books, little Stamijan.', 'You smell like Punk. That\u2019s not a complaint — it\u2019s a sales opportunity.'] },
    { id: 'duro', name: 'Duro', title: 'Eikar smith', look: 'duro', pos: [16, 44], roles: ['forge'], quests: ['q_ore'],
      hello: ['A smith keeps his cauldron on the fire tree\u2019s branch. Mine came with me in a sack.', 'Bring me ore and bark and I\u2019ll grow you a blade that bites.'] },
    { id: 'venkin', name: 'Venkin', title: 'Keilia builder', look: 'keilia', pos: [-16, 40], roles: ['cook'], quests: ['q_camp'],
      hello: ['I build. Walls, roofs, bridges. Weapons? Passable, at best — ask Duro.', 'Half of Xilia\u2019s roofs are mine. The good half.'] },
    { id: 'ruut', name: 'Old Ruut', title: 'Punk herder', look: 'ruut', pos: [-34, 98], roles: ['stable'], quests: ['q_strays'],
      hello: ['Domestic Punks. Gentle as sheep, if sheep had vines.', 'Three of my herd wandered off into the countryside. Brainless, the lot of them. Bless them.'] },
    { id: 'sefa', name: 'Sefa', title: 'a young Eikar', look: 'sefa', pos: [4, 70], roles: [], quests: ['q_fennek'],
      hello: ['Have you seen Fennek? He\u2019s a Kipsu. He\u2019s THIS big. Okay, maybe this big.'] },
    { id: 'v1', name: 'Ama', title: 'a baker', look: 'v1', pos: [-24, 52], wander: true, roles: [], quests: [],
      hello: ['Fresh Zahreh buns! Well. Fresh-ish.', 'They say Aakalay swore itself away. My gran says it was the stone that drank it.'] },
    { id: 'v2', name: 'Teodr', title: 'a farmer', look: 'v2', pos: [-60, 40], wander: true, roles: [], quests: [],
      hello: ['Rodak in the north wood again. They never bother you — till you\u2019re bleeding.', 'Mind the crops, Stamijan.'] },
    { id: 'v3', name: 'Lirra', title: 'a lamplighter', look: 'v3', pos: [20, 30], wander: true, roles: [], quests: [],
      hello: ['The old Nur Lanterns only wake for a Nur. Lucky you\u2019ve got Phorus.', 'Glide off the Carpenter\u2019s tower sometime. Everyone does it once. Most people only once.'] },
    { id: 'v4', name: 'Bosk', title: 'a dockhand', look: 'v4', pos: [8, 120], wander: true, roles: [], quests: [],
      hello: ['The Stryx won\u2019t fly without a hot seed in the stern. Ask it yourself.', 'Fire trees never burn. Their seeds, though — whoosh.'] },
    { id: 'kw1', name: 'Orrin', title: 'a Keilia builder', look: 'keilia', pos: [30, 70], wander: true, roles: [], quests: [],
      hello: ['Mind the scaffold.', 'We build. The Kalo make our hammers. Never the other way round.'] },
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
  if (def.look === 'keilia') return buildKeilia({});
  return buildEikar(NPC_LOOKS[def.look]);
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
  // a little fence for Ruut's herd
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
