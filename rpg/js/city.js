/* ============================================================
   CITY — the bits both Fyrsti'Vilags are made of (Velki's and
   Xikia's): houses of three or four kinds, with windows that glow
   and flower boxes and balconies and lanterns by the door;
   bunting strung across the streets; lamp-posts; barrels and
   crates; paving rings — and a Stryx mud fountain.

   And the people: a crowd that keeps to the streets. Everyone
   has somewhere to be — a stall to buy at (and the stallkeeper
   serves them), a friend to fetch and talk with, home for a
   while, the fountain's rim, a place to stare at the sky from —
   and walks there by the streets, round whatever's in the way.
   When the city panics they run for the roads and the doorways
   instead of into the walls.

   A scene hands it its own collision (box/cyl), height and
   ground functions; everything here is in that scene's terms.
   ============================================================ */
import * as THREE from 'three';
import { toon, ramp, addOutline, outlineAll, glowSprite, paint } from './gfx.js';
import { buildEikar } from './actors.js';
import { buildStryx } from './esik_land.js';
import { damp, dampAngle, clamp } from './util.js';
import { stepAround } from './terrain.js';
import { avoid, angDiff } from './ai.js';

const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export const PALETTES = {
  velki: { walls: [0xe8c8a0, 0xd8b088, 0xf0d8b8, 0xc89a78, 0xe0b890], roofs: [0x7a3420, 0x6a2a18, 0x8a4a28, 0x5a2414], trim: 0x5a3420, door: [0x6a2a3a, 0x3a4a6a, 0x5a3a1c], awn: [0xc0392b, 0xd9a441, 0x8a3a6a, 0x2f6f8a] },
  xikia: { walls: [0xf4e6c8, 0xf0dcb4, 0xe8d0a8, 0xfaf0dc, 0xe8dcc0], roofs: [0x7a4a2a, 0x2f5a5a, 0x6a3a1c, 0x3a6a5a], trim: 0x6a4428, door: [0x2f6f8a, 0x8a3a3a, 0x4a7a3a], awn: [0xc0392b, 0x2f6f8a, 0xd9a441, 0x5a8a3a, 0x8a3a6a] },
};
export const FOLK_LOOKS = [
  { skin: '#a8743e', cap: '#5a3018', tunic: 0x5a6a8a }, { skin: '#c08a52', cap: '#3a2414', tunic: 0x8a4a3a },
  { skin: '#9a6a40', cap: '#6a4020', tunic: 0x4a7a5a }, { skin: '#b07a48', cap: '#4a2a18', tunic: 0x7a6a4a },
  { skin: '#c89a6a', cap: '#6a3a1a', tunic: 0xd8b878 }, { skin: '#8a5a3a', cap: '#2a1a0c', tunic: 0x6a3a6a },
  { skin: '#b8844e', cap: '#4a2a14', tunic: 0x3a6a8a, cape: 0x8a3a2a }, { skin: '#a06a3a', cap: '#5a3a1a', tunic: 0xa88a4a },
];

let roofTexCache = null;
function roofTex() {
  if (roofTexCache) return roofTexCache;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(30,15,5,0.4)'; g.lineWidth = 3;
  for (let y = 0; y < 140; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < 140; x += 14) { g.beginPath(); g.arc(x, y, 8, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2);
  roofTexCache = t; return t;
}

/* ================================================================
   buildings and street furniture
   ================================================================ */
export function createCityKit(scene, o) {
  const { rng, heightAt, box, cyl } = o, PAL = PALETTES[o.palette || 'velki'];
  const pick = a => a[Math.floor(rng() * a.length)];
  const lamps = [], smokes = [], flags = [], windows = [];
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffc878 });
  const frameMat = paint(toon(0x4a2a14), 'wood'), boxMat = paint(toon(0x6a4428), 'wood');
  const flowerMats = [0xe05a6a, 0xf0c040, 0xc060d0, 0xffffff, 0xe08a3a].map(c => toon(c));
  const leafMat = toon(0x4a8a3a);
  const roofMats = PAL.roofs.map(c => new THREE.MeshToonMaterial({ color: c, map: roofTex(), gradientMap: ramp() }));
  const finish = grp => { outlineAll(grp, 0.035); grp.traverse(m => { if (m.isMesh && m.name !== 'outline' && !m.userData.noShadow) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(grp); return grp; };

  function windowAt(grp, x, y, z, ry, w = 1.0, h = 1.25, flowers = true) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), winMat); pane.position.set(x, y, z); pane.rotation.y = ry; pane.userData.noOutline = true; pane.userData.noShadow = true; grp.add(pane); windows.push(pane);
    const nx = Math.sin(ry) * 0.06, nz = Math.cos(ry) * 0.06;
    for (const [dx, dy, ww, hh] of [[0, h / 2, w + 0.2, 0.12], [0, -h / 2, w + 0.3, 0.14], [w / 2, 0, 0.1, h], [-w / 2, 0, 0.1, h], [0, 0, 0.06, h]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, 0.1), frameMat);
      f.position.set(x + Math.cos(ry) * dx + nx, y + dy, z - Math.sin(ry) * dx + nz); f.rotation.y = ry; grp.add(f);
    }
    if (flowers && rng() < 0.6) {   // a flower box under it
      const bx = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.25, 0.35), boxMat); bx.position.set(x + nx * 4, y - h / 2 - 0.15, z + nz * 4); bx.rotation.y = ry; grp.add(bx);
      for (let k = 0; k < 4; k++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), pick(flowerMats)); const dx = (k / 3 - 0.5) * w; fl.position.set(x + Math.cos(ry) * dx + nx * 4, y - h / 2 + 0.03, z - Math.sin(ry) * dx + nz * 4); grp.add(fl); }
    }
  }
  /* quoins: dressed corner stones, long and short in turn, standing a hand proud of the wall up
     every corner — the way real masonry houses are finished (one instanced batch for the town) */
  const quoins = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 9000);
  quoins.count = 0; quoins.castShadow = quoins.receiveShadow = true; quoins.frustumCulled = false; scene.add(quoins);
  const qm = new THREE.Matrix4(), qp = new THREE.Vector3(), qs = new THREE.Vector3(), qq = new THREE.Quaternion(), qc = new THREE.Color();
  function addQuoins(grp, w, d, h, wallColor, cz = 0) {
    grp.updateMatrix();
    const base = new THREE.Color(wallColor).lerp(new THREE.Color(0xd8ccb4), 0.55);
    for (let y = 0.24, k = 0; y < h - 0.15; y += 0.5, k++) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      if (quoins.count >= 9000) return;
      const longX = (k + (sx * sz > 0 ? 0 : 1)) % 2 === 0, lx = longX ? 0.9 : 0.46, lz = longX ? 0.46 : 0.9;
      qp.set(sx * (w / 2 + 0.06 - lx / 2), y, cz + sz * (d / 2 + 0.06 - lz / 2)); qs.set(lx, 0.44, lz);
      qm.compose(qp, qq, qs).premultiply(grp.matrix);
      quoins.setMatrixAt(quoins.count, qm);
      quoins.setColorAt(quoins.count, qc.copy(base).offsetHSL(0, 0, (rng() - 0.5) * 0.08));
      quoins.count++;
    }
    quoins.instanceMatrix.needsUpdate = true; if (quoins.instanceColor) quoins.instanceColor.needsUpdate = true;
  }
  function lantern(x, y, z, color = 0xffb060, size = 1.5) {
    const l = glowSprite(color, size, 0.85); l.position.set(x, y, z); scene.add(l); lamps.push(l);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.36, 6), toon(0x3a2a1a)); cage.position.set(x, y + 0.05, z); scene.add(cage);
    return l;
  }
  /* a house: kind cottage | tall | tower | arcade; front (the door side) faces local +z, turned to `ry` */
  function house(x, z, ry, kind) {
    kind = kind || (rng() < 0.42 ? 'cottage' : rng() < 0.7 ? 'tall' : rng() < 0.85 ? 'tower' : 'arcade');
    const g = heightAt(x, z), grp = new THREE.Group(); grp.position.set(x, g, z); grp.rotation.y = ry;
    const wall = paint(toon(pick(PAL.walls)), kind === 'tower' ? 'stone' : 'plaster'), roof = pick(roofMats), trim = paint(toon(PAL.trim), 'wood');
    let hw = 3, hd = 3, top = 6;
    const doorAt = (dz, h = 2.3) => {
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, h, 0.2), paint(toon(pick(PAL.door)), 'wood')); door.position.set(0, h / 2 + 0.1, dz); grp.add(door);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.1, 5, 12, Math.PI), trim); arch.position.set(0, h + 0.1, dz + 0.02); grp.add(arch);
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.7), paint(toon(0x9a8a78), 'stone')); step.position.set(0, 0.1, dz + 0.4); grp.add(step);
      if (rng() < 0.7) { const wx = x + Math.sin(ry) * (dz + 0.3) + Math.cos(ry) * 1.1, wz = z + Math.cos(ry) * (dz + 0.3) - Math.sin(ry) * 1.1; lantern(wx, g + 2.3, wz); }
    };
    if (kind === 'cottage') {
      const w = 5 + rng() * 2.5, d = 5 + rng() * 2.5, h = 3.8 + rng() * 1.6; hw = w / 2; hd = d / 2; top = h + 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall); b.position.y = h / 2; grp.add(b);
      addQuoins(grp, w, d, h, wall.color);
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.25, d + 0.15), trim); band.position.y = h; grp.add(band);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(Math.max(w, d) * 0.72, 18, 9, 0, TAU, 0, Math.PI / 2), roof); cap.scale.y = 0.72; cap.position.y = h; grp.add(cap);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(Math.max(w, d) * 0.7, 0.2, 6, 22), roof); rim.rotation.x = Math.PI / 2; rim.position.y = h + 0.05; grp.add(rim);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.4, 6), toon(0x4a2a14)); stem.position.y = h + Math.max(w, d) * 0.52 + 0.4; stem.rotation.z = 0.25; grp.add(stem);
      top = h + Math.max(w, d) * 0.55;
      doorAt(d / 2);
      for (const sx of [-1, 1]) windowAt(grp, sx * w * 0.28, h * 0.55, d / 2 + 0.02, 0);
      for (const sx of [-1, 1]) windowAt(grp, sx * (w / 2 + 0.02), h * 0.55, 0, sx * Math.PI / 2, 0.9, 1.1, false);
      if (rng() < 0.6) smokes.push(V3(x - Math.sin(ry) * d * 0.2, g + top + 0.5, z));
    } else if (kind === 'tall') {
      const w = 5.5 + rng() * 2, d = 5.5 + rng() * 2, floors = 2 + (rng() < 0.4 ? 1 : 0), fh = 3.2; hw = w / 2 + 0.3; hd = d / 2 + 0.3;
      for (let f = 0; f < floors; f++) {
        const ow = w + (f ? 0.6 : 0), od = d + (f ? 0.6 : 0);
        const b = new THREE.Mesh(new THREE.BoxGeometry(ow, fh, od), f % 2 ? paint(toon(new THREE.Color(wall.color).offsetHSL(0, 0, -0.04).getHex()), 'plaster') : f === 0 ? paint(toon(wall.color.getHex()), 'stone') : wall); b.position.y = fh * f + fh / 2; grp.add(b);
        const band = new THREE.Mesh(new THREE.BoxGeometry(ow + 0.2, 0.28, od + 0.2), trim); band.position.y = fh * (f + 1); grp.add(band);
        // timber framing on the upper floors
        if (f) for (const sx of [-1, -0.33, 0.33, 1]) { const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, fh, 0.12), trim); beam.position.set(sx * ow / 2, fh * f + fh / 2, od / 2 + 0.04); grp.add(beam); }
        if (f === 0) { doorAt(od / 2); addQuoins(grp, ow, od, fh, wall.color); }
        else for (const sx of [-1, 1]) windowAt(grp, sx * ow * 0.25, fh * f + fh * 0.5, od / 2 + 0.03, 0);
        for (const sx of [-1, 1]) windowAt(grp, sx * (ow / 2 + 0.03), fh * f + fh * 0.5, 0, sx * Math.PI / 2, 0.9, 1.1, false);
      }
      const H = floors * fh; top = H + 3;
      // a balcony on the top floor
      if (rng() < 0.7) {
        const by = fh * (floors - 1) + 0.1, bd = d / 2 + 0.3 + 0.7;
        const slab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.18, 1.4), trim); slab.position.set(0, by, bd); grp.add(slab);
        for (let k = 0; k <= 6; k++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 5), trim); p.position.set((k / 6 - 0.5) * w * 0.68, by + 0.5, bd + 0.65); grp.add(p); }
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.1, 0.1), trim); rail.position.set(0, by + 0.95, bd + 0.65); grp.add(rail);
        if (rng() < 0.6) { const pot = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), leafMat); pot.position.set(w * 0.25, by + 0.5, bd); grp.add(pot); }
      }
      const cap = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.82, 3.4, 4), roof); cap.rotation.y = Math.PI / 4; cap.position.y = H + 1.7; grp.add(cap);
      if (rng() < 0.6) smokes.push(V3(x, g + H + 3.5, z));
    } else if (kind === 'tower') {
      const r = 2.6 + rng() * 0.8, h = 9 + rng() * 5; hw = hd = r * 0.9; top = h + 4;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 14), wall); b.position.y = h / 2; grp.add(b);
      for (let k = 1; k < 3; k++) { const band = new THREE.Mesh(new THREE.TorusGeometry(r + 0.05, 0.12, 5, 20), trim); band.rotation.x = Math.PI / 2; band.position.y = h * k / 3; grp.add(band); }
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 1.35, 4.2, 14), roof); cap.position.y = h + 2.1; grp.add(cap);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 5), trim); pole.position.y = h + 5.3; grp.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.7), toon(pick(PAL.awn), { side: THREE.DoubleSide })); flag.position.set(0.65, h + 6.2, 0); grp.add(flag); flags.push(flag);
      doorAt(r - 0.02);
      for (let k = 0; k < 4; k++) { const a = k * 1.7 + 0.8, yy = 3 + k * (h - 4) / 4; windowAt(grp, Math.sin(a) * (r + 0.02), yy, Math.cos(a) * (r + 0.02), a, 0.8, 1.1, false); }
    } else {   // an arcade: a long building with an open colonnade along its front
      const w = 9 + rng() * 3, d = 5, h = 5.2; hw = w / 2; hd = d / 2 + 1.3; top = h + 3;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall); b.position.set(0, h / 2, -1); grp.add(b);
      addQuoins(grp, w, d, h, wall.color, -1);
      const roofS = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.35, d + 3), trim); roofS.position.set(0, h + 0.1, 0.3); grp.add(roofS);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.62, 2.4, 4), roof); cap.rotation.y = Math.PI / 4; cap.scale.z = 0.55; cap.position.set(0, h + 1.3, -0.4); grp.add(cap);
      for (let k = 0; k < 5; k++) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, h, 8), toon(0xf0e0c0)); col.position.set((k / 4 - 0.5) * (w - 0.6), h / 2, d / 2 + 0.8); grp.add(col); }
      for (let k = 0; k < 3; k++) { const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.2), paint(toon(pick(PAL.door)), 'wood')); door.position.set((k - 1) * w * 0.3, 1.2, d / 2 - 0.95); grp.add(door); windowAt(grp, (k - 1) * w * 0.3, 3.8, d / 2 - 0.97, 0, 1, 1, false); }
      for (let k = 0; k < 3; k++) lantern(x + Math.sin(ry) * (d / 2 + 0.6) + Math.cos(ry) * (k - 1) * w * 0.3, g + 4.2, z + Math.cos(ry) * (d / 2 + 0.6) - Math.sin(ry) * (k - 1) * w * 0.3);
    }
    // barrels and crates by the door now and then
    if (rng() < 0.45) {
      const sx = (rng() < 0.5 ? -1 : 1) * (hw - 0.6), lz = hd + 0.7, px = x + Math.cos(ry) * sx + Math.sin(ry) * lz, pz = z - Math.sin(ry) * sx + Math.cos(ry) * lz;
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.0, 10), paint(toon(0x7a4e2c), 'wood')); br.position.set(px, g + 0.5, pz); addOutline(br, 0.025); br.castShadow = true; scene.add(br);
      cyl(px, pz, 0.48, g - 1, g + 1.0);
    }
    finish(grp);
    const swap = Math.abs(Math.sin(ry)) > 0.5;
    if (Math.abs(Math.sin(ry * 2)) < 0.2) box(x, z, (swap ? hd : hw), (swap ? hw : hd), g - 1, g + top);
    else cyl(x, z, Math.max(hw, hd) * 1.0, g - 1, g + top);
    return { x, z, ry, hw, hd, top, kind, door: V3(x + Math.sin(ry) * (hd + 1.2), g, z + Math.cos(ry) * (hd + 1.2)) };
  }
  function lampPost(x, z) {
    const g = heightAt(x, z);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.4, 6), toon(0x3a2a1a)); p.position.set(x, g + 1.7, z); p.castShadow = true; addOutline(p, 0.02); scene.add(p);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.07), toon(0x3a2a1a)); arm.position.set(x + 0.32, g + 3.3, z); scene.add(arm);
    lantern(x + 0.62, g + 3.0, z, 0xffc070, 1.8);
    cyl(x, z, 0.18, g - 1, g + 3.4);
  }
  /* bunting: a sagging string of little flags between two points */
  const flagGeo = new THREE.BufferGeometry(); flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.5, 0], 3)); flagGeo.computeVertexNormals();
  const flagMats = PAL.awn.map(c => toon(c, { side: THREE.DoubleSide }));
  const buntings = [];
  function bunting(a, b, sag = 1.6) {
    const pts = []; for (let i = 0; i <= 16; i++) { const k = i / 16; pts.push(new THREE.Vector3().lerpVectors(a, b, k).add(V3(0, -Math.sin(k * Math.PI) * sag, 0))); }
    const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 4), toon(0x3a2a1a)); scene.add(rope);
    const n = Math.max(4, Math.floor(a.distanceTo(b) / 0.9)), grp = new THREE.Group(); scene.add(grp);
    for (let i = 1; i < n; i++) {
      const k = i / n, p = new THREE.Vector3().lerpVectors(a, b, k).add(V3(0, -Math.sin(k * Math.PI) * sag, 0));
      const f = new THREE.Mesh(flagGeo, flagMats[i % flagMats.length]); f.position.copy(p); f.lookAt(p.clone().add(V3(-(b.z - a.z), 0, b.x - a.x))); f.userData.ph = i; grp.add(f);
    }
    buntings.push(grp);
  }
  function paving(cx, cz, rings, color = 0xb89878) {
    const m = paint(toon(color), 'cobble');
    for (const r of rings) { const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.25, r + 0.25, 64), m); ring.rotation.x = -Math.PI / 2; ring.position.set(cx, heightAt(cx, cz) + 0.03, cz); ring.receiveShadow = true; scene.add(ring); }
  }
  function stall(x, z, ry, i, goods = true) {
    const g = heightAt(x, z), grp = new THREE.Group(); grp.position.set(x, g, z); grp.rotation.y = ry;
    const table = new THREE.Mesh(new THREE.BoxGeometry(3, 1.0, 1.4), paint(toon(0x8a5a36), 'wood')); table.position.y = 0.5; grp.add(table);
    for (const s of [-1, 1]) for (const zz of [-0.6, 0.6]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.7, 5), toon(0x5a3a20)); p.position.set(s * 1.4, 1.35, zz); grp.add(p); }
    const awn = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 2.2), toon(PAL.awn[i % PAL.awn.length])); awn.position.set(0, 2.7, 0); awn.rotation.x = 0.18; grp.add(awn);
    for (let k = 0; k < 5; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 2.22), toon(0xf4ead4)); st.position.set(-1.36 + k * 0.68, 2.76, 0); st.rotation.x = 0.18; grp.add(st); }
    if (goods) for (let k = 0; k < 6; k++) { const gd = new THREE.Mesh(k % 2 ? new THREE.SphereGeometry(0.2, 8, 6) : new THREE.BoxGeometry(0.34, 0.26, 0.34), toon([0xe08a3a, 0xd04a3a, 0xe8c84a, 0x6aa04a, 0x8a5ad0, 0xc8a070][(k + i) % 6])); gd.position.set(-1.1 + k * 0.44, 1.14, (k % 2 - 0.5) * 0.4); grp.add(gd); }
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.4, 10), toon(0xb8904a)); basket.position.set(1.8, 0.2, 0.4); grp.add(basket);
    finish(grp);
    const sw = Math.abs(Math.sin(ry)) > 0.7;
    box(x, z, sw ? 0.75 : 1.55, sw ? 1.55 : 0.75, g - 1, g + 1.0);
    return grp;
  }
  return {
    house, lampPost, bunting, paving, stall, lantern, lamps, smokes, flags, windows, buntings,
    update(t, dt, particles, night = 0) {
      lamps.forEach((l, i) => { l.material.opacity = 0.7 + Math.sin(t * 5 + i) * 0.12; });
      flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 2.4 + i) * 0.4; });
      buntings.forEach(b => b.children.forEach(f => { f.rotation.z = Math.sin(t * 3 + f.userData.ph) * 0.25; }));
      if (particles && smokes.length && Math.random() < 0.6) { const s = smokes[Math.floor(Math.random() * smokes.length)]; particles.emit(s.x + (Math.random() - 0.5) * 0.4, s.y, s.z + (Math.random() - 0.5) * 0.4, { vx: 0.5, vy: 1.3, vz: 0.2, color: 0xd8d0c8, size: 1.2, life: 2.8, drag: 0.3 }); }
    },
  };
}

/* ================================================================
   THE STRYX MUD FOUNTAIN
   A round basin of bog-mud full of dissolved stygian, a Stryx grown
   up out of the middle and trained to throw the mud. It lobs balls
   high into the air and they come down back into the basin — or it
   catches them on a vine — and the mud never stays one colour, and
   the bits that fly off go up in little showers of sparks. Sit on
   the rim and touch the mud all you like; step in, and the Stryx
   wants its mud back.
   ================================================================ */
const MUD_COLS = [0x8a4ad8, 0x2ad0c8, 0xe0702a, 0x5ac04a, 0xd84a8a, 0xe8c040, 0x4a7ae0];
export function buildMudFountain(scene, x, z, g, opts = {}) {
  const S = opts.scale || 1, R = 4.4 * S;
  const grp = new THREE.Group(); grp.position.set(x, g, z); scene.add(grp);
  const stone = toon(0xcab088), stoneD = toon(0x9a8468);
  // the basin: a wide lip you can sit on, and a lower inner wall
  const lip = new THREE.Mesh(new THREE.TorusGeometry(R, 0.55 * S, 8, 40), stone); lip.rotation.x = Math.PI / 2; lip.position.y = 0.75 * S; lip.scale.z = 0.8; addOutline(lip, 0.04); grp.add(lip);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.2 * S, 0.8 * S, 40, 1, true), stoneD); wall.position.y = 0.4 * S; grp.add(wall);
  for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; const b = new THREE.Mesh(new THREE.BoxGeometry(0.5 * S, 0.9 * S, 0.3 * S), stoneD); b.position.set(Math.cos(a) * (R + 0.45 * S), 0.45 * S, Math.sin(a) * (R + 0.45 * S)); b.rotation.y = -a; grp.add(b); }
  // the mud: a canvas that swirls and changes colour
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const cg = cv.getContext('2d');
  const mudTex = new THREE.CanvasTexture(cv); mudTex.colorSpace = THREE.SRGBColorSpace;
  const mud = new THREE.Mesh(new THREE.CircleGeometry(R - 0.1 * S, 40), new THREE.MeshToonMaterial({ map: mudTex, gradientMap: ramp(), emissive: 0x2a1a3a, emissiveIntensity: 0.5 }));
  mud.rotation.x = -Math.PI / 2; mud.position.y = 0.6 * S; grp.add(mud);
  const blobs = Array.from({ length: 14 }, () => ({ x: Math.random() * 128, y: Math.random() * 128, r: 14 + Math.random() * 26, c: MUD_COLS[Math.floor(Math.random() * MUD_COLS.length)], vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.5) * 9, ph: Math.random() * TAU }));
  function paintMud(t) {
    cg.fillStyle = '#3a2a2a'; cg.fillRect(0, 0, 128, 128);
    cg.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      const c = new THREE.Color(b.c).offsetHSL(Math.sin(t * 0.3 + b.ph) * 0.12, 0, 0);
      const grd = cg.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); grd.addColorStop(0, `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},0.75)`); grd.addColorStop(1, 'rgba(0,0,0,0)');
      cg.fillStyle = grd; cg.beginPath(); cg.arc(b.x, b.y, b.r, 0, TAU); cg.fill();
    }
    cg.globalCompositeOperation = 'source-over';
    mudTex.needsUpdate = true;
  }
  paintMud(0);
  // the territorial circle set into the paving round it
  const circle = new THREE.Mesh(new THREE.RingGeometry(R + 2.6 * S, R + 2.9 * S, 64), toon(0x7a6a8a, { emissive: 0x2a1a4a, emissiveIntensity: 0.3 })); circle.rotation.x = -Math.PI / 2; circle.position.y = 0.04; grp.add(circle);
  // the Stryx itself, grown up out of a stone pedestal in the middle
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.0 * S, 1.4 * S, 1.4 * S, 12), stone); ped.position.y = 0.7 * S; addOutline(ped, 0.04); grp.add(ped);
  const stryx = buildStryx({ seed: opts.seed || 31 }); stryx.root.scale.setScalar(1.7 * S); stryx.root.position.y = 1.35 * S; grp.add(stryx.root);
  const balls = [];
  const ballGeo = new THREE.SphereGeometry(0.32 * S, 10, 8);
  let throwT = 0.6, atk = 0, wind = 0, poked = 0;
  function throwBall(target, hard) {
    const c = MUD_COLS[Math.floor(Math.random() * MUD_COLS.length)];
    const m = new THREE.Mesh(ballGeo, new THREE.MeshToonMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, gradientMap: ramp() })); grp.add(m);
    const from = V3((Math.random() - 0.5) * 0.6, 3.6 * S, (Math.random() - 0.5) * 0.6);
    const to = target || V3((Math.random() - 0.5) * (R - 1.2) * 1.6, 0.7 * S, (Math.random() - 0.5) * (R - 1.2) * 1.6);
    const flight = hard ? 0.7 : 1.6 + Math.random() * 0.8;
    const vel = V3((to.x - from.x) / flight, 0, (to.z - from.z) / flight); vel.y = (to.y - from.y) / flight + 0.5 * 18 * flight;
    m.position.copy(from); balls.push({ m, vel, c, t: 0, catchT: !hard && Math.random() < 0.3 ? flight * 0.82 : -1, hard });
    atk = 1;
  }
  let held = null;   // a world point its vines are wrapped round (someone who stepped in after something)
  return {
    group: grp, R: R, center: V3(x, g, z), ring: R + 2.75 * S,
    /* hold whoever's at p in its vines (null lets go) */
    hold(p) { held = p ? p.clone() : null; },
    /* call every frame. who: [{pos}] — anyone standing in the basin gets a ball in the face */
    update(dt, t, particles, who) {
      if (Math.floor(t * 8) !== Math.floor((t - dt) * 8)) { for (const b of blobs) { b.x = (b.x + b.vx * 0.125 + 128) % 128; b.y = (b.y + b.vy * 0.125 + 128) % 128; } paintMud(t); }
      throwT -= dt; poked = Math.max(0, poked - dt);
      if (throwT <= 0) { throwT = 0.9 + Math.random() * 1.4; throwBall(); }
      if (who && poked <= 0) for (const p of who) {
        const dx = p.x - x, dz = p.z - z;
        if (Math.hypot(dx, dz) < R - 0.4) { poked = 1.4; throwBall(V3(dx, p.y - g + 1.2, dz), true); break; }
      }
      atk = Math.max(0, atk - dt * 2.5); wind = Math.max(0, Math.sin(t * 1.3) * 0.3);
      let grab = null;
      if (held) { stryx.root.updateMatrixWorld(true); grab = { p: stryx.root.worldToLocal(held.clone().add(V3(0, 1, 0))), k: 1 }; throwT = Math.max(throwT, 0.5); }
      stryx.animate(dt, { t, speed: 0, windup: held ? 0.4 : wind * (1 - atk), attack: held ? 0 : atk, grab });
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i]; b.t += dt; b.vel.y -= 18 * dt; b.m.position.addScaledVector(b.vel, dt); b.m.rotation.x += dt * 4;
        if (Math.random() < 0.35 && particles) { const wp = b.m.getWorldPosition(V3()); particles.emit(wp.x, wp.y, wp.z, { vx: (Math.random() - 0.5) * 2, vy: 1, vz: (Math.random() - 0.5) * 2, color: b.c, size: 0.25, life: 0.5, drag: 1 }); }
        if (b.catchT > 0 && b.t >= b.catchT) {   // caught on a vine, and tossed straight back up
          const wp = b.m.getWorldPosition(V3()); if (particles) particles.burst(wp.x, wp.y, wp.z, 10, { color: 0xffe08a, speed: 4, size: 0.3, life: 0.4 });
          grp.remove(b.m); balls.splice(i, 1); throwBall(); continue;
        }
        if (b.m.position.y <= 0.65 * S && b.vel.y < 0) {
          const wp = b.m.getWorldPosition(V3());
          if (particles) { particles.burst(wp.x, wp.y + 0.2, wp.z, 14, { color: b.c, speed: 4, size: 0.4, life: 0.6, gravity: 8 }); if (Math.random() < 0.6) particles.burst(wp.x, wp.y + 0.5, wp.z, 18, { color: Math.random() < 0.5 ? 0xffffff : 0xffe08a, speed: 7, size: 0.22, life: 0.5 }); }
          grp.remove(b.m); b.m.material.dispose(); balls.splice(i, 1);
          if (b.hard && opts.onSplat) opts.onSplat(wp);
        }
      }
    },
  };
}

/* ================================================================
   THE CROWD — folk who keep to the streets, each on an errand.
   streets: [{ r }] ring streets round a centre (radius), and
   roads: [{ a }] radial roads (angle) you can cross between rings on.
   spots: named places folk go and stand: { x, z, look: [x,z], kind }
     'shop'  — in front of a stall: the stallkeeper (spot.vendor, set
               once the keepers are spawned) turns and serves them;
     'chat'  — a ring of spots round one point: whoever goes there
               fetches a friend, and they talk once both have come;
     'sit'   — the fountain's rim: a rest, watching the water;
     'watch' — somewhere to see the sky from.
   homes: the doors folk live behind: they go in a while, and come out.
   exits: places to run to when the city panics (doorways, the gate).
   blocked(x, z): is that spot taken up by something solid?
   likes: how much the town goes in for each errand ({ shop: 3, … }).
   Nobody wanders: every walk is to somewhere, for something.

   And each of them is somebody: quick or slow on their feet, chatty
   or not, nosy or not, patient or not — it shows in what they choose
   to do and how long they'll wait. A stall with a customer at it gets
   a little queue behind (the impatient give up and go); friends who
   have had their talk sometimes go on together, side by side; in a
   chat one speaks at a time while the others look at them and nod;
   walkers pass each other on the right and wait for someone crossing;
   and everyone glances at you as you go by (and the stallkeepers try
   to catch your eye). opts.player = { pos, vel } in update.
   ================================================================ */
const LIKES = { shop: 3, chat: 2.5, watch: 3, sit: 1.5, home: 2 };
const QUEUE = 2;   // how many wait behind a stall's customer
export function createCrowd(o) {
  const { scene, rng, groundAt, resolve, C } = o;
  const people = [];
  const streets = o.streets, roads = o.roads || [], spots = o.spots || [], homes = o.homes || [];
  const likes = Object.assign({}, LIKES, o.likes || {});
  const toPolar = (x, z) => [Math.hypot(x - C.x, z - C.z), Math.atan2(z - C.z, x - C.x)];
  const atPolar = (r, a) => V3(C.x + Math.cos(a) * r, 0, C.z + Math.sin(a) * r);
  const nearestRoad = a => roads.reduce((b, rd) => Math.abs(Math.atan2(Math.sin(rd.a - a), Math.cos(rd.a - a))) < Math.abs(Math.atan2(Math.sin(b.a - a), Math.cos(b.a - a))) ? rd : b, roads[0]);
  const spotsTaken = new Set();
  // the chat spots come in rings round a point: those are the meeting places
  const circles = new Map();
  for (const s of spots) if (s.kind === 'chat') { const k = s.look[0] + ',' + s.look[1]; if (!circles.has(k)) circles.set(k, []); circles.get(k).push(s); s.circle = circles.get(k); }

  function spawn(look, at, behaviour) {
    const a = buildEikar(Object.assign({ weapon: 'none', flasks: false, scale: 0.9 + rng() * 0.16 }, look)); scene.add(a.root);
    // who they are: quick or slow, chatty or quiet, nosy or not, patient or not
    const me = { pace: 0.8 + rng() * 0.45, social: rng(), curious: rng(), patient: rng() };
    const p = { a, pos: at.clone(), yaw: rng() * TAU, plan: [], state: 'idle', wait: rng() * 3, ph: rng() * 9, speed: (1.2 + rng() * 0.3) * me.pace, lane: (rng() - 0.5) * 2.4, b: behaviour || 'stroll', spot: null, run: false, gone: false, look: null,
      errand: null, last: null, home: homes.length ? homes[Math.floor(rng() * homes.length)] : null, inside: 0, me, vx: 0, vz: 0, glanceT: 0, nodT: 0 };
    p.pos.y = groundAt(p.pos.x, p.pos.z, 3); a.root.position.copy(p.pos); people.push(p);
    return p;
  }
  /* nothing solid along the way from a to b? (looked at every 0.6 m: a fountain's rim is narrow) */
  const clear = (ax, az, bx, bz) => {
    if (!o.blocked) return false;
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 0.6);
    for (let i = 1; i < n; i++) if (o.blocked(ax + (bx - ax) * i / n, az + (bz - az) * i / n)) return false;
    return true;
  };
  /* a route from where you are to (r1, a1): straight there if the way is clear; else round your ring
     to a road, along the road, round the new ring — with every corner cut that can be cut */
  function route(p, r1, a1) {
    const [r0, a0] = toPolar(p.pos.x, p.pos.z), plan = [], end = atPolar(r1, a1);
    p.best = null; p.stuck = 0;
    if (clear(p.pos.x, p.pos.z, end.x, end.z)) { p.plan = [end]; return; }
    const ring0 = streets.reduce((b, s) => Math.abs(s.r - r0) < Math.abs(b.r - r0) ? s : b, streets[0]).r;
    const ring1 = streets.reduce((b, s) => Math.abs(s.r - r1) < Math.abs(b.r - r1) ? s : b, streets[0]).r;
    const arc = (r, from, to) => { let d = Math.atan2(Math.sin(to - from), Math.cos(to - from)); const n = Math.max(1, Math.ceil(Math.abs(d * r) / 5)); for (let i = 1; i <= n; i++) plan.push(atPolar(r + p.lane * 0.5, from + d * i / n)); };
    if (Math.abs(ring0 - ring1) < 3 || !roads.length) { arc(ring0, a0, a1); plan.push(end); }
    else {
      const rd = nearestRoad(Math.atan2(Math.sin(a0) + Math.sin(a1), Math.cos(a0) + Math.cos(a1)));   // (the way between them, not the far side round)
      arc(ring0, a0, rd.a);
      const n = Math.ceil(Math.abs(ring1 - ring0) / 5); for (let i = 1; i <= n; i++) plan.push(atPolar(ring0 + (ring1 - ring0) * i / n, rd.a + p.lane * 0.012));
      arc(ring1, rd.a, a1); plan.push(end);
    }
    // cut the corners: from each point, on to the furthest one it can see
    const out = []; let from = p.pos;
    for (let i = 0; i < plan.length;) {
      let j = plan.length - 1;
      while (j > i && !clear(from.x, from.z, plan[j].x, plan[j].z)) j--;
      out.push(plan[j]); from = plan[j]; i = j + 1;
    }
    p.plan = out;
  }
  const goTo = (p, x, z) => { const [r, a] = toPolar(x, z); route(p, r, a); p.plan.push(V3(x, 0, z)); };
  const open = s => !spotsTaken.has(s) && !(o.blocked && o.blocked(s.x, s.z));
  function take(p, s, errand) {
    if (p.spot) spotsTaken.delete(p.spot);
    p.spot = s; spotsTaken.add(s); p.errand = errand; goTo(p, s.x, s.z);
  }
  /* someone free to be fetched: not busy, not minding a stall, not indoors, not far */
  function freeNear(p, max) {
    let best = null, bd = max;
    for (const q of people) {
      if (q === p || q.gone || q.fixed || q.run || q.inside > 0 || q.frozen || (q.errand && q.errand !== 'idle')) continue;
      const d = q.pos.distanceTo(p.pos); if (d < bd) { bd = d; best = q; }
    }
    return best;
  }
  const pickOf = list => list[Math.floor(rng() * list.length)];
  function think(p) {
    if (p.spot) { spotsTaken.delete(p.spot); p.spot = null; }
    if (p.queueAt) leaveQueue(p);
    p.leader = null; p.look = null;
    const kinds = [];
    const me = p.me || { social: 0.5, curious: 0.5, patient: 0.5 };
    const taste = { chat: 0.4 + me.social * 1.4, watch: 0.4 + me.curious * 1.4, shop: 0.7 + me.curious * 0.6, sit: 1.4 - me.social * 0.6, home: 1.3 - me.social * 0.5 };
    const offer = (k, ok) => { if (ok && likes[k] > 0 && k !== p.last) kinds.push([k, likes[k] * (taste[k] || 1)]); };
    offer('shop', spots.some(s => s.kind === 'shop' && (open(s) || (s.queue || []).length < QUEUE)));
    offer('chat', [...circles.values()].some(c => c.filter(open).length >= 2));
    offer('sit', spots.some(s => s.kind === 'sit' && open(s)));
    offer('watch', spots.some(s => s.kind === 'watch' && open(s)));
    offer('home', !!p.home);
    if (!kinds.length) { p.errand = 'idle'; p.wait = 2 + rng() * 3; return; }   // everything's taken: wait a moment where you are
    let roll = rng() * kinds.reduce((t, k) => t + k[1], 0), kind = kinds[0][0];
    for (const [k, w] of kinds) { if ((roll -= w) <= 0) { kind = k; break; } }
    p.last = kind;
    if (kind === 'home') { p.errand = 'home'; goTo(p, p.home.x, p.home.z); return; }
    if (kind === 'chat') {
      const c = pickOf([...circles.values()].filter(c => c.filter(open).length >= 2)), free = c.filter(open);
      take(p, free[0], 'chat');
      const q = freeNear(p, 40);   // and fetch a friend to talk to
      if (q) { take(q, free[1], 'chat'); q.wait = rng() * 0.6; }
      return;
    }
    if (kind === 'shop') {
      const free = spots.filter(s => s.kind === 'shop' && open(s));
      if (free.length) { take(p, pickOf(free), 'shop'); return; }
      // every stall busy: wait your turn behind one
      const s = pickOf(spots.filter(s => s.kind === 'shop' && (s.queue || []).length < QUEUE));
      (s.queue || (s.queue = [])).push(p); p.queueAt = s; p.errand = 'queue'; p.patience = 8 + p.me.patient * 30;
      const q = queueSpot(s, s.queue.length - 1); goTo(p, q.x, q.z);
      return;
    }
    take(p, pickOf(spots.filter(s => s.kind === kind && open(s))), kind);
  }
  /* the place in a stall's queue: back from the customer's spot, away from the stall */
  function queueSpot(s, i) {
    const bx = s.x - s.look[0], bz = s.z - s.look[1], L = Math.hypot(bx, bz) || 1;
    return V3(s.x + bx / L * 1.1 * (i + 1) + (i % 2 ? 0.25 : -0.25), 0, s.z + bz / L * 1.1 * (i + 1));
  }
  function leaveQueue(p) { const s = p.queueAt; if (s && s.queue) { const i = s.queue.indexOf(p); if (i >= 0) s.queue.splice(i, 1); } p.queueAt = null; }
  /* two friends done talking, sometimes off on together: one leads, the other walks alongside */
  function goTogether(p, q) {
    think(p);
    if (p.errand === 'home' || p.errand === 'idle' || p.errand === 'queue') return false;
    if (q.spot) { spotsTaken.delete(q.spot); q.spot = null; }
    q.errand = 'with'; q.leader = p; q.plan = []; q.side = rng() < 0.5 ? 1 : -1; q.wait = 0;
    return true;
  }
  /* panic: everyone makes for a way out and vanishes through it */
  function panic() {
    for (const p of people) {
      if (p.gone || p.fixed) continue;
      if (p.inside > 0) { p.inside = 0; p.gone = true; p.a.root.visible = false; continue; }   // indoors already: they stay there
      p.run = true; p.state = 'go'; p.speed = 5 + rng() * 2; p.wait = rng() * 0.8;
      const ex = (o.exits || []).slice().sort((a, b) => a.distanceTo(p.pos) - b.distanceTo(p.pos))[Math.floor(rng() * 2)] || (o.exits || [])[0];
      if (!ex) continue;
      const [r, a] = toPolar(ex.x, ex.z); route(p, Math.max(streets[0].r, Math.min(streets[streets.length - 1].r, r)), a); p.plan.push(ex.clone()); p.exit = ex;
    }
  }
  /* there: what they do on arriving, and for how long */
  function arrive(p) {
    const s = p.spot;
    if (p.errand === 'home') { p.inside = 15 + rng() * 30; p.a.root.visible = false; p.errand = null; return; }   // in at the door
    p.look = s && s.look ? V3(s.look[0], 0, s.look[1]) : null; p.hold = 0;
    if (p.errand === 'shop') { p.wait = 6 + rng() * 8; if (s.vendor) p.look = s.vendor.pos.clone(); }
    else if (p.errand === 'chat') p.wait = 10 + rng() * 14;
    else if (p.errand === 'watch') p.wait = 12 + rng() * 14;
    else p.wait = 6 + rng() * 10;
  }
  const here = p => !p.plan.length && p.spot && p.pos.distanceTo(V3(p.spot.x, p.pos.y, p.spot.z)) < 2.5;
  const others = []; let you = null;
  return {
    people, spawn, panic, think, route,
    update(dt, t, opts = {}) {
      you = opts.player ? { pos: opts.player.pos, vx: opts.player.vel ? opts.player.vel.x : 0, vz: opts.player.vel ? opts.player.vel.z : 0 } : null;
      // who's at a stall: the keeper turns to serve them
      for (const p of people) { if (p.fixed) p.customer = null; if (p.spot && !p.gone) { spotsTaken.add(p.spot); if (!p.errand) p.errand = p.spot.kind; } }   // (those set down at a spot to begin with)
      for (const p of people) if (!p.gone && p.errand === 'shop' && p.spot && p.spot.vendor && here(p)) p.spot.vendor.customer = p;
      for (const p of people) {
        if (p.gone) continue;
        let sp = 0, talking = false;
        if (p.inside > 0) {             // at home a while, then out of the door again on the next errand
          if (opts.freeze) continue;
          p.inside -= dt;
          if (p.inside <= 0) { p.inside = 0; p.a.root.visible = true; p.wait = 0.5 + rng(); think(p); }
          continue;
        }
        if (!p.frozen && !opts.freeze && !p.run && p.errand === 'queue' && !p.plan.length) {
          // waiting in line: shuffle up as it moves, give up if it takes too long
          const s = p.queueAt, i = s && s.queue ? s.queue.indexOf(p) : -1;
          p.patience -= dt;
          if (!s || i < 0 || p.patience <= 0) { p.wait = 0.5; think(p); }
          else if (i === 0 && open(s)) { leaveQueue(p); take(p, s, 'shop'); }
          else { const q = queueSpot(s, i); if (Math.hypot(q.x - p.pos.x, q.z - p.pos.z) > 0.5) p.plan = [q]; p.look = V3(s.look[0], 0, s.look[1]); }
        }
        if (!p.frozen && !opts.freeze && !p.run && p.errand === 'with') {
          // walking alongside a friend; when they stop, stop by them and keep talking; when they go in, find your own way
          const L = p.leader;
          if (!L || L.gone || L.inside > 0 || L.errand === 'home' || L.errand === 'with') { p.leader = null; think(p); }
          else {
            const ly = L.yaw, sx = Math.cos(ly) * p.side * 0.9, sz = -Math.sin(ly) * p.side * 0.9;
            const tx = L.pos.x + sx - Math.sin(ly) * 0.3, tz = L.pos.z + sz - Math.cos(ly) * 0.3;
            p.plan = Math.hypot(tx - p.pos.x, tz - p.pos.z) > 0.6 ? [V3(tx, 0, tz)] : [];
            p.speed = Math.max(p.speed, L.speed * 1.15);
            if (!L.plan.length) { p.look = L.pos; p.withT = (p.withT || 0) + dt; if (p.withT > 6 + rng() * 6) { p.withT = 0; p.leader = null; p.speed = (1.2 + rng() * 0.3) * p.me.pace; think(p); } }
          }
        }
        if (p.frozen || opts.freeze) {   // everyone stops and stares
          if (opts.stare) p.yaw = dampAngle(p.yaw, Math.atan2(opts.stare.x - p.pos.x, opts.stare.z - p.pos.z), 5, dt);
        } else if (p.fixed) {          // a vendor behind a stall, a guard at a post
          const c = p.customer, at = c ? c.pos : p.look;
          if (at) p.yaw = dampAngle(p.yaw, Math.atan2(at.x - p.pos.x, at.z - p.pos.z), c ? 5 : 3, dt);
          if (c) talking = Math.sin(t * 0.9 + p.ph) > 0;   // the price, the weather, the sky
          else {   // nobody buying: an eye on whoever's passing, and a word to catch them
            let near = null, nd = 6;
            for (const q of people) { if (q === p || q.gone || q.fixed || q.inside > 0) continue; const d2 = q.pos.distanceTo(p.pos); if (d2 < nd) { nd = d2; near = q; } }
            if (you && you.pos.distanceTo(p.pos) < 7) near = you;
            if (near) { p.gazeAt = near.pos; talking = Math.sin(t * 1.3 + p.ph) > 0.75; }
          }
        } else if (p.plan.length) {
          if (p.wait > 0) p.wait -= dt;
          else {
            const g = p.plan[0], dx = g.x - p.pos.x, dz = g.z - p.pos.z, d = Math.hypot(dx, dz);
            if (d < (p.run ? 1.2 : 0.8)) {
              p.plan.shift(); p.best = null; p.stuck = 0; p.vx = p.vz = 0; p.fails = 0;
              if (!p.plan.length && (p.errand === 'queue' || p.errand === 'with')) continue;   // in line / beside a friend: nothing more to it
              if (!p.plan.length) {
                if (p.run && p.exit) { p.gone = true; p.a.root.visible = false; continue; }   // in through a door, or out of the gate
                arrive(p);
              }
            } else {
              sp = p.speed * (p.errand === 'with' && d < 1.2 ? 0.6 : 1);
              // make way: pass oncoming folk on the right, ease off for someone crossing (and for you)
              others.length = 0;
              for (const q of people) if (q !== p && !q.gone && q.inside <= 0 && q !== p.leader && q.leader !== p && Math.abs(q.pos.x - p.pos.x) < 6 && Math.abs(q.pos.z - p.pos.z) < 6) others.push(q);
              if (you) others.push(you);
              const av = p.run ? { k: 1, vx: dx / d * sp, vz: dz / d * sp } : avoid({ pos: p.pos, vx: dx / d * sp, vz: dz / d * sp }, others, 0.8);
              p.vx = av.vx * av.k; p.vz = av.vz * av.k; sp *= av.k;
              stepAround(p.pos, p.vx * dt, p.vz * dt, resolve, p);   // round the barrels and the stalls, not through them
              // don't walk through other folk
              for (const q of people) { if (q === p || q.gone || q.inside > 0) continue; const ox = p.pos.x - q.pos.x, oz = p.pos.z - q.pos.z, od = Math.hypot(ox, oz); if (od < 0.7 && od > 1e-3) { p.pos.x += ox / od * (0.7 - od) * 0.5; p.pos.z += oz / od * (0.7 - od) * 0.5; } }
              resolve(p.pos);
              // getting no nearer (pinned, or shuffling on the spot): give up on this corner and make for the next
              const nd = Math.hypot(g.x - p.pos.x, g.z - p.pos.z);
              if (p.best == null || nd < p.best - 0.3) { p.best = nd; p.stuck = 0; } else p.stuck = (p.stuck || 0) + dt;
              if (p.stuck > 1.5) {
                p.plan.shift(); p.stuck = 0; p.best = null;
                // boxed into a corner, over and over: back out the way that's open — and if even that fails
                // with nobody looking, they're simply back out on the street
                p.fails = (p.fails || 0) + 1;
                if (p.fails >= 3) {
                  let out = null;
                  for (let k = 0; k < 12 && !out; k++) { const a = k / 12 * TAU + p.ph, r = 1.2 + (k % 3) * 0.8, q = V3(p.pos.x + Math.sin(a) * r, 0, p.pos.z + Math.cos(a) * r); if (!o.blocked || !o.blocked(q.x, q.z)) out = q; }
                  if (out && p.fails < 6) p.plan.unshift(out);
                  else if (!you || you.pos.distanceTo(p.pos) > 25) { const [r, a] = toPolar(p.pos.x, p.pos.z), ring = streets.reduce((b, st) => Math.abs(st.r - r) < Math.abs(b.r - r) ? st : b, streets[0]).r; p.pos.copy(atPolar(ring, a)); p.fails = 0; }
                }
                if (!p.plan.length && !p.run && p.errand !== 'queue' && p.errand !== 'with') { if (p.spot && Math.hypot(p.spot.x - p.pos.x, p.spot.z - p.pos.z) > 2.5) { p.wait = 1 + rng() * 2; think(p); } else arrive(p); }   // can't get there: something else to do
              }
              p.yaw = dampAngle(p.yaw, Math.atan2(p.vx || dx, p.vz || dz), 8, dt);
            }
          }
        } else {
          // at the errand: serve, be served, talk, rest, watch
          if (p.errand === 'shop' && p.spot && p.spot.vendor) { p.look = p.spot.vendor.pos; talking = Math.sin(t * 0.9 + p.spot.vendor.ph) < 0; }
          if (p.errand === 'chat' && p.spot) {
            const friend = people.find(q => q !== p && !q.gone && q.inside <= 0 && q.spot && q.spot.circle === p.spot.circle);
            if (friend && here(friend)) {
              // one speaks at a time: the circle passes the talk round every few breaths
              const c = p.spot.circle, sp_ = c.talker;
              if (!sp_ || sp_.gone || !sp_.spot || sp_.spot.circle !== c || (c.talkT -= dt / Math.max(1, c.n || 1)) <= 0) {
                const mates = people.filter(q => !q.gone && q.spot && q.spot.circle === c && here(q));
                c.n = mates.length; c.talker = mates.filter(q => q !== sp_)[Math.floor(rng() * Math.max(1, mates.length - 1))] || p;
                c.talkT = 2 + rng() * 3.5 * (0.5 + c.talker.me.social);
              }
              talking = c.talker === p;
              if (!talking) { p.look = c.talker.pos; if ((p.nodT -= dt) < -2 && rng() < dt * 0.6) p.nodT = 1; }
            }
            else if (friend && (p.hold = (p.hold || 0) + dt) < 25) p.wait = Math.max(p.wait, 1);   // the friend's on the way: wait for them
          }
          if (p.errand === 'with' && p.leader) talking = Math.sin(t * 0.6 + p.ph) > 0.3;   // the talk goes on
          if (p.look) p.yaw = dampAngle(p.yaw, Math.atan2(p.look.x - p.pos.x, p.look.z - p.pos.z), 3, dt);
          p.wait -= dt;
          if (p.wait <= 0 && !p.run) {
            const mate = p.errand === 'chat' && p.spot ? people.find(q => q !== p && !q.gone && q.spot && q.spot.circle === p.spot.circle && here(q) && !q.leader) : null;
            if (mate && rng() < 0.25 + (p.me.social + mate.me.social) * 0.2 && goTogether(p, mate)) { /* off together */ }
            else think(p);
          }
        }
        // the sky draws every eye now and then
        if (opts.sky && !p.run && !sp && !talking && rng() < 0.002) p.look = opts.sky;
        // glances: at you as you go by (the nosy longer), at whoever's speaking, at the stallkeeper's passer-by
        let gaze = null;
        const g = p.gazeAt || (you && !p.run && you.pos.distanceTo(p.pos) < 4 + p.me.curious * 6 ? you.pos : null);
        if (g) { const rel = angDiff(p.yaw, Math.atan2(g.x - p.pos.x, g.z - p.pos.z)); if (Math.abs(rel) < 1.9) gaze = rel; }
        else if (p.look && !sp) gaze = angDiff(p.yaw, Math.atan2(p.look.x - p.pos.x, p.look.z - p.pos.z));
        p.gazeAt = null;
        p.pos.y = groundAt(p.pos.x, p.pos.z, p.pos.y + 1);
        p.a.root.position.copy(p.pos); p.a.root.rotation.y = p.yaw;
        p.a.animate(dt, { speed: sp, onGround: true, t: t + p.ph, talking, gaze, nod: p.nodT > 0 ? 1 : 0 });
      }
    },
  };
}
