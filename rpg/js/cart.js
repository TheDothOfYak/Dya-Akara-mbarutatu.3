// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   THE CARPENTER'S CART — and the two Punks that pull it. It goes
   the whole way home with them: the market, the road north, every
   camp, Beuhk, and at last the yard on the Carpenter's land.
   ============================================================ */
import * as THREE from 'three';
import { toon, outlineAll, paint } from './gfx.js';
import { buildDomesticPunk } from './esik_land.js';

/* a cartwheel: an iron-shod rim, felloes, ten spokes and a hub — in the yz plane, so it turns about x */
export function makeWheel(r = 0.75, wood = paint(toon(0x6a4428), 'wood'), iron = toon(0x3a3638)) {
  const w = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 6, 28), iron); tyre.rotation.y = Math.PI / 2; w.add(tyre);
  const fel = new THREE.Mesh(new THREE.TorusGeometry(r - 0.07, 0.065, 6, 28), wood); fel.rotation.y = Math.PI / 2; fel.scale.set(1, 1, 1.5); w.add(fel);
  for (let k = 0; k < 10; k++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, r - 0.1, 6), wood); const a = k / 10 * Math.PI * 2; sp.position.set(0, Math.cos(a) * (r - 0.1) / 2, Math.sin(a) * (r - 0.1) / 2); sp.rotation.x = a; w.add(sp); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.3, 12), wood); hub.rotation.z = Math.PI / 2; w.add(hub);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.34, 8), iron); cap.rotation.z = Math.PI / 2; w.add(cap);
  return w;
}
/* a farm wagon of planks: a bed with board sides, two axles, four spoked wheels. Pass { lose: n } to leave wheel n
   off (it lies wherever you put it), and { goods } for a load of sacks and baskets. Returns { g, wheels }. */
export function buildWagon({ lose = -1, goods = true, len = 3.6 } = {}) {
  const g = new THREE.Group(), wood = paint(toon(0x8a5a36), 'wood'), dark = paint(toon(0x5a3a20), 'wood'), iron = toon(0x3a3638);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, len), wood); bed.position.y = 0.95; g.add(bed);
  for (const sx of [-1, 1]) for (let b = 0; b < 3; b++) { const bd = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.17, len), b % 2 ? wood : dark); bd.position.set(sx * 1.05, 1.13 + b * 0.18, 0); g.add(bd); }
  for (const sz of [-1, 1]) for (let b = 0; b < 3; b++) { const bd = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.17, 0.06), b % 2 ? wood : dark); bd.position.set(0, 1.13 + b * 0.18, sz * len / 2); g.add(bd); }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), dark); st.position.set(sx * 1.07, 1.3, sz * len / 2); g.add(st); }
  const wheels = [];
  for (const [i, sz] of [[0, -len * 0.3], [1, len * 0.3]]) {
    const ax = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), dark); ax.position.set(0, 0.62, sz); g.add(ax);
    for (const sx of [-1, 1]) { const k = i * 2 + (sx > 0 ? 1 : 0); if (k === lose) { wheels.push(null); continue; } const w = makeWheel(0.62, dark, iron); w.position.set(sx * 1.25, 0.62, sz); g.add(w); wheels.push(w); }
  }
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.2), dark); tongue.position.set(0, 0.7, len / 2 + 1.05); tongue.rotation.x = 0.25; g.add(tongue);
  if (goods) {
    const sack = toon(0xc8b080), basket = paint(toon(0xa87a40), 'wood');
    for (let k = 0; k < 4; k++) { const sk = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), sack); sk.scale.set(1, 0.75, 1.3); sk.position.set((k % 2 - 0.5) * 0.9, 1.25, -len / 2 + 0.6 + Math.floor(k / 2) * 0.85); g.add(sk); }
    for (let k = 0; k < 2; k++) { const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.36, 12), basket); bk.position.set((k - 0.5) * 0.9, 1.22, len / 2 - 0.55); g.add(bk);
      for (let f = 0; f < 4; f++) { const fr = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 5), toon([0xe08a3a, 0xd04a3a, 0xe8c84a][f % 3])); fr.position.set(bk.position.x + (f % 2 - 0.5) * 0.18, 1.44, bk.position.z + (f > 1 ? 0.09 : -0.09)); g.add(fr); } }
  }
  outlineAll(g, 0.03); g.traverse(m => { if (m.isMesh && m.name !== 'outline') { m.castShadow = true; m.receiveShadow = true; } });
  return { g, wheels };
}

export function buildCart() {
  const g = new THREE.Group(), wood = paint(toon(0x8a5a36), 'wood'), dark = paint(toon(0x5a3a20), 'wood'), canvas = toon(0xe8dcc0, { side: THREE.DoubleSide });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 4.2), wood); bed.position.y = 1.0; g.add(bed);
  for (const sx of [-1, 1]) { const sd = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 4.2), dark); sd.position.set(sx * 1.2, 1.45, 0); g.add(sd); }
  const backB = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.12), dark); backB.position.set(0, 1.45, -2.1); g.add(backB);
  const wheels = [];
  for (const sz of [-1.3, 1.3]) {
    const ax = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 0.14), dark); ax.position.set(0, 0.8, sz); g.add(ax);
    for (const sx of [-1, 1]) { const w = makeWheel(0.75, dark); w.position.set(sx * 1.36, 0.8, sz); g.add(w); wheels.push(w); }
  }
  // the tailgate, let down on its chains so the back of the bed is open for loading
  { const tg = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.5, 0.08), dark); tg.position.set(0, 1.0, -2.36); tg.rotation.x = -1.2; g.add(tg); }
  // the canvas cover over the back half, on three hoops
  for (const z of [-0.1, 0.6, 1.3]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 5, 16, Math.PI), dark); hoop.position.set(0, 1.45, z); g.add(hoop); }
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 1.6, 16, 1, true, -Math.PI / 2, Math.PI), canvas); cover.position.set(0, 1.45, 0.6);
  cover.rotation.set(-Math.PI / 2, 0, 0); g.add(cover);
  // wares: planks, a chair, a tool chest, a cradle
  for (let k = 0; k < 4; k++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 1.7), paint(toon([0xb8844e, 0xa87440][k % 2]), 'wood')); pl.position.set(-0.75 + k * 0.08, 1.2 + k * 0.08, 0.55); g.add(pl); }
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.6), paint(toon(0x6a3a1c), 'wood')); chest.position.set(0.5, 1.42, 0.15); g.add(chest);
  const chair = new THREE.Group(); chair.position.set(0.5, 1.15, 0.95);
  { const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), wood); seat.position.set(0, 0.45, 0); chair.add(seat); const bk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.08), wood); bk.position.set(0, 0.8, -0.26); chair.add(bk); }
  g.add(chair);
  const load = new THREE.Group(); g.add(load);   // the crates Tanoc carries over: in a row across the open back of the bed (loadSpot)
  // the driver's bench, the shafts, the harness
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 0.6), wood); bench.position.set(0, 1.95, 1.75); g.add(bench);
  const benchBack = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.1), wood); benchBack.position.set(0, 2.25, 1.45); g.add(benchBack);
  for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.8), dark); sh.position.set(sx * 0.55, 1.0, 3.9); g.add(sh); }
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.12), dark); yoke.position.set(0, 1.25, 5.3); g.add(yoke);
  outlineAll(g, 0.03); g.traverse(m => { if (m.isMesh && m.name !== 'outline') { m.castShadow = true; m.receiveShadow = true; } });
  const punks = [-1, 1].map((sx, i) => { const pk = buildDomesticPunk({ saddle: false, blanket: i ? 0x2f6f8a : 0x8a3a2a, seed: 40 + i }); pk.root.scale.setScalar(0.62); pk.root.position.set(sx * 1.25, 0, 5.6); g.add(pk.root); return pk; });
  const straps = punks.map(pk => { const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), toon(0x3a2414)); strap.position.set(pk.root.position.x * 0.7, 1.2, 4.9); g.add(strap); return strap; });
  /* home at last: the Punks out of the shafts and off to the herd, the shafts resting on a trestle */
  function unhitch() {
    for (const pk of punks) g.remove(pk.root);
    for (const st of straps) g.remove(st);
    const wood = toon(0x6a4428);
    for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.1), wood); leg.position.set(sx * 0.55, 0.6, 5.0); leg.rotation.z = sx * 0.25; g.add(leg); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.14), wood); bar.position.set(0, 1.18 - 0.12, 5.0); g.add(bar);
    punks.length = 0;
  }
  const loadSpot = k => new THREE.Vector3(-0.72 + (k % 3) * 0.72, 1.41 + Math.floor(k / 3) * 0.53, -1.6);
  return { g, wheels, punks, load, unhitch, loadSpot };
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
