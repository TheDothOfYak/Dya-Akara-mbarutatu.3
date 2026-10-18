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

/* what comes off the back of the cart each night: an A-frame tent of oilcloth on two poles, and the little
   folding workbench Buhkon never travels without (a vice, a plane, a mallet, shavings) */
export function buildCampKit() {
  const tent = new THREE.Group(), cloth = toon(0xd8c8a0, { side: THREE.DoubleSide }), cloth2 = toon(0xb8a478, { side: THREE.DoubleSide }), pole = toon(0x5a3a20), rope = toon(0x8a7a5a);
  const L = 2.8, W = 2.4, H = 1.7, slope = Math.hypot(W / 2, H);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(slope, L), s > 0 ? cloth : cloth2);
    side.rotation.set(-Math.PI / 2, 0, 0); side.rotation.order = 'ZXY'; side.rotation.z = -s * Math.atan2(H, W / 2);
    side.position.set(s * W / 4, H / 2, 0); tent.add(side);
  }
  const back = new THREE.Shape(); back.moveTo(-W / 2, 0); back.lineTo(W / 2, 0); back.lineTo(0, H); back.closePath();
  const bk = new THREE.Mesh(new THREE.ShapeGeometry(back), cloth2); bk.position.z = -L / 2; tent.add(bk);
  for (const s of [-1, 1]) {   // the door flaps, tied back
    const f = new THREE.Shape(); f.moveTo(0, 0); f.lineTo(s * W * 0.18, 0); f.lineTo(0, H); f.closePath();
    const fm = new THREE.Mesh(new THREE.ShapeGeometry(f), cloth); fm.position.set(s * W * 0.32, 0, L / 2); tent.add(fm);
  }
  for (const z of [-L / 2 - 0.05, L / 2 + 0.05]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, H + 0.25, 6), pole); p.position.set(0, (H + 0.25) / 2, z); tent.add(p); }
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, L + 0.2, 6), pole); ridge.rotation.x = Math.PI / 2; ridge.position.y = H; tent.add(ridge);
  for (const z of [-1, 1]) { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 4), rope); g.position.set(0, H * 0.55, z * (L / 2 + 0.55)); g.rotation.x = z * 0.85; tent.add(g); }
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.6, 10), toon(0x6a3a2a)); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.22, -0.4); tent.add(roll);
  outlineAll(tent, 0.025);

  const bench = new THREE.Group(), wood = toon(0xb8844e), dark = toon(0x6a4428), iron = toon(0x6a6a72);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.6), wood); top.position.y = 0.82; bench.add(top);
  for (const x of [-0.62, 0.62]) for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.86, 0.07), dark); leg.position.set(x, 0.41, s * 0.2); leg.rotation.x = s * 0.18; bench.add(leg); }
  const vice = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.14), iron); vice.position.set(0.62, 0.92, 0.32); bench.add(vice);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 5), iron); screw.rotation.x = Math.PI / 2; screw.position.set(0.62, 0.9, 0.48); bench.add(screw);
  const plane = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.1), dark); plane.position.set(-0.3, 0.92, 0.05); plane.rotation.y = 0.3; bench.add(plane);
  const mallet = new THREE.Group(); { const h = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.12), wood); mallet.add(h); const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 5), dark); hd.rotation.z = Math.PI / 2; hd.position.x = 0.22; mallet.add(hd); }
  mallet.position.set(0.15, 0.93, -0.12); mallet.rotation.y = -0.6; bench.add(mallet);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.16), toon(0xd8b07a)); plank.position.set(-0.1, 0.89, -0.15); bench.add(plank);
  for (let k = 0; k < 6; k++) { const sh = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 8, Math.PI * 1.4), toon(0xe8c890)); sh.position.set(-0.5 + Math.random() * 1, 0.02, -0.4 + Math.random() * 0.8); sh.rotation.set(Math.PI / 2, 0, Math.random() * 6); bench.add(sh); }
  outlineAll(bench, 0.02);
  for (const o of [tent, bench]) o.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; });
  return { tent, bench };
}
