/* ============================================================
   THE CARPENTER'S CART — and the two Punks that pull it. It goes
   the whole way home with them: the market, the road north, every
   camp, Beuhk, and at last the yard on the Carpenter's land.
   ============================================================ */
import * as THREE from 'three';
import { toon, outlineAll } from './gfx.js';
import { buildDomesticPunk } from './esik_land.js';

export function buildCart() {
  const g = new THREE.Group(), wood = toon(0x8a5a36), dark = toon(0x5a3a20), canvas = toon(0xe8dcc0, { side: THREE.DoubleSide });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 4.2), wood); bed.position.y = 1.0; g.add(bed);
  for (const sx of [-1, 1]) { const sd = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 4.2), dark); sd.position.set(sx * 1.2, 1.45, 0); g.add(sd); }
  const backB = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.12), dark); backB.position.set(0, 1.45, -2.1); g.add(backB);
  const wheels = [];
  for (const sx of [-1, 1]) for (const sz of [-1.3, 1.3]) {
    const w = new THREE.Group(); w.position.set(sx * 1.32, 0.8, sz); g.add(w); wheels.push(w);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.08, 6, 16), dark); rim.rotation.y = Math.PI / 2; w.add(rim);
    for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.08), wood); sp.rotation.x = k * Math.PI / 4; w.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 8), dark); hub.rotation.z = Math.PI / 2; w.add(hub);
  }
  // the canvas cover over the back half, on three hoops
  for (const z of [-1.8, -0.9, 0]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 5, 16, Math.PI), dark); hoop.position.set(0, 1.45, z); g.add(hoop); }
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 2.1, 16, 1, true, -Math.PI / 2, Math.PI), canvas); cover.position.set(0, 1.45, -0.9);
  cover.rotation.set(-Math.PI / 2, 0, 0); g.add(cover);
  // wares: planks, a chair, a tool chest, a cradle
  for (let k = 0; k < 4; k++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 3.6), toon([0xb8844e, 0xa87440][k % 2])); pl.position.set(-0.7 + k * 0.08, 1.2 + k * 0.08, -0.2); g.add(pl); }
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.6), toon(0x6a3a1c)); chest.position.set(0.55, 1.42, -1.4); g.add(chest);
  const chair = new THREE.Group(); chair.position.set(0.5, 1.15, 0.9);
  { const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), wood); seat.position.set(0, 0.45, 0); chair.add(seat); const bk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.08), wood); bk.position.set(0, 0.8, -0.26); chair.add(bk); }
  g.add(chair);
  const load = new THREE.Group(); g.add(load);   // the crates Tanoc carries over
  // the driver's bench, the shafts, the harness
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 0.6), wood); bench.position.set(0, 1.95, 1.75); g.add(bench);
  const benchBack = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.1), wood); benchBack.position.set(0, 2.25, 1.45); g.add(benchBack);
  for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.8), dark); sh.position.set(sx * 0.55, 1.0, 3.9); g.add(sh); }
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.12), dark); yoke.position.set(0, 1.25, 5.3); g.add(yoke);
  outlineAll(g, 0.03); g.traverse(m => { if (m.isMesh && m.name !== 'outline') { m.castShadow = true; m.receiveShadow = true; } });
  const punks = [-1, 1].map((sx, i) => { const pk = buildDomesticPunk({ saddle: false, blanket: i ? 0x2f6f8a : 0x8a3a2a, seed: 40 + i }); pk.root.scale.setScalar(0.62); pk.root.position.set(sx * 1.25, 0, 5.6); g.add(pk.root); return pk; });
  for (const pk of punks) { const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), toon(0x3a2414)); strap.position.set(pk.root.position.x * 0.7, 1.2, 4.9); g.add(strap); }
  return { g, wheels, punks, load };
}
