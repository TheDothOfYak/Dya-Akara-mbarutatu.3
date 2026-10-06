/* ============================================================
   XILIA, on Xikia — the town where Tanoc's shell lay when Noka
   carried his Hurst across, and where the Carpenter, Buhkon Eldi,
   saved the Eikar with no hat. Home. A busy little town of
   acorn-capped cottages on a sunny highland: a market square,
   the Carpenter's yard, farms, a forest, and — out past the
   fields — the Ember Grove and a Duskareth hideout.
   ============================================================ */
import * as THREE from 'three';
import { mulberry32, fbm, smooth, lerp, clamp } from './util.js';
import { toon, ramp, glowSprite, outlineAll, addOutline } from './gfx.js';
import { Colliders, Kit, buildGrass, STEP } from './terrain.js';
export { STEP };

const SQUARE = { x: 0, z: 50 };
const SQ_H = 1.0;
export const YARD = { x: 46, z: 104 };
export const PEN = { x: -46, z: 104 };
export const GROVE = { x: 64, z: -112 };
export const HIDEOUT = { x: -108, z: -74 };
const CLEAR = [
  { x: SQUARE.x, z: SQUARE.z, r: 26 }, { x: YARD.x, z: YARD.z, r: 22 }, { x: PEN.x, z: PEN.z, r: 14 },
  { x: GROVE.x, z: GROVE.z, r: 20 }, { x: HIDEOUT.x, z: HIDEOUT.z, r: 18 }, { x: 96, z: 10, r: 15 }, { x: -62, z: -40, r: 15 },
];

function edgeRadius(x, z) {
  const a = Math.atan2(z, x);
  return 182 + (fbm(Math.cos(a) * 2.1 + 11, Math.sin(a) * 2.1 + 3, 3) - 0.5) * 40;
}

export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  let h = (fbm(x * 0.01 + 9, z * 0.01 - 2, 4) - 0.5) * 18 + (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 1.6;
  h += smooth(10, -160, z) * 9;                                // the north rises into forest hills
  h = lerp(h, SQ_H, smooth(90, 50, Math.hypot(x - SQUARE.x, (z - SQUARE.z) * 0.8)));   // the town sits on a broad flat
  h = lerp(h, SQ_H + 0.4, smooth(28, 18, Math.hypot(x - YARD.x, z - YARD.z)));
  if (z > 120 && Math.abs(x) < 30) h = lerp(h, 0.6, smooth(16, 6, Math.abs(x)) * smooth(120, 150, z));
  const R = edgeRadius(x, z);
  if (r > R - 10) h -= smooth(R - 10, R, r) * 3;
  if (r > R) h -= (r - R) * 5 + 4;
  return Math.max(h, -180);
}

const STONE = ['#e2c9a0', '#d4b88a', '#c9a878', '#ead6b0'];
const LEAF = ['#7ab04a', '#9ac04a', '#e0b03a', '#6a9a3a', '#c8a03a', '#5a8a3a'];

export function buildXilia(scene) {
  const rng = mulberry32(2024);
  const pick = a => a[Math.floor(rng() * a.length)];
  const col = new Colliders(heightAt);
  const roads = [[0, 175, 0, 50], [0, 50, 0, -80], [0, 50, 90, 10], [0, 50, -90, 40], [0, 80, YARD.x, YARD.z], [0, 80, PEN.x, PEN.z], [0, -80, GROVE.x, GROVE.z], [0, -60, HIDEOUT.x, HIDEOUT.z]];
  const roadDist = (x, z) => {
    let best = 1e9;
    for (const [ax, az, bx, bz] of roads) {
      const vx = bx - ax, vz = bz - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
      best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
    }
    return best;
  };
  const FIELDS = [{ x: -100, z: 30, w: 40, d: 50 }, { x: -60, z: -10, w: 30, d: 26 }, { x: 70, z: 60, w: 34, d: 30 }];
  const inField = (x, z) => FIELDS.find(f => Math.abs(x - f.x) < f.w / 2 && Math.abs(z - f.z) < f.d / 2);

  /* ---------- terrain ---------- */
  const SIZE = 460, SEG = 220;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position, tcol = new Float32Array(tp.count * 3);
  const c = new THREE.Color(), gA = new THREE.Color('#8fbf52'), gB = new THREE.Color('#b8c45a'), gC = new THREE.Color('#6aa048'),
    dirt = new THREE.Color('#c9a06a'), pave = new THREE.Color('#e0caa0'), soil = new THREE.Color('#7a5232'), soilB = new THREE.Color('#9a6a3a'),
    rock = new THREE.Color('#b07a52'), rockD = new THREE.Color('#7a4e38');
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), y = heightAt(x, z);
    tp.setY(i, y);
    const R = edgeRadius(x, z), r = Math.hypot(x, z);
    const n = fbm(x * 0.03 + 4, z * 0.03, 3), n2 = fbm(x * 0.12, z * 0.12, 2);
    c.copy(gA).lerp(gB, smooth(0.45, 0.72, n)).lerp(gC, smooth(0.5, 0.25, n2) * 0.6);
    const f = inField(x, z);
    if (f) c.copy(Math.sin((x - f.x) * 1.4) > 0 ? soil : soilB);
    c.lerp(dirt, smooth(5, 2.5, roadDist(x, z)) * 0.9);
    c.lerp(pave, smooth(24, 20, Math.hypot(x - SQUARE.x, z - SQUARE.z)));
    c.lerp(dirt, smooth(20, 16, Math.hypot(x - YARD.x, z - YARD.z)) * 0.8);
    if (r > R - 3) c.lerp(rock, smooth(R - 3, R + 1, r)).lerp(rockD, smooth(R + 4, R + 30, r) * (0.5 + 0.5 * Math.sin(y * 0.6)));
    tcol[i * 3] = c.r; tcol[i * 3 + 1] = c.g; tcol[i * 3 + 2] = c.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, toon(0xffffff, { vertexColors: true }));
  terrain.receiveShadow = true; scene.add(terrain);

  /* the rock root beneath */
  {
    const A = 96, RINGS = 16, pos = [], cols = [], idx = [];
    const strata = ['#c48a5a', '#a86a44', '#d49a6a', '#8a5a3e', '#b87a4a'].map(s => new THREE.Color(s));
    for (let k = 0; k <= RINGS; k++) {
      const t = k / RINGS, y = -8 - Math.pow(t, 1.25) * 300;
      for (let j = 0; j <= A; j++) {
        const a = j / A * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const R = edgeRadius(ca * 170, sa * 170) + 6;
        const rr = R * Math.pow(1 - t, 0.75) * (1 + (fbm(ca * 3 + k * 0.7, sa * 3, 3) - 0.5) * 0.5 * t) + (k === RINGS ? 0 : 2);
        pos.push(ca * rr, y + (fbm(a * 4, k, 2) - 0.5) * 14 * t, sa * rr);
        const sc = strata[Math.floor(Math.abs(y * 0.07 + fbm(a * 2, k, 2) * 2)) % strata.length]; cols.push(sc.r, sc.g, sc.b);
      }
    }
    for (let k = 0; k < RINGS; k++) for (let j = 0; j < A; j++) { const a = k * (A + 1) + j, b = a + A + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setIndex(idx); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide })));
  }

  /* ---------- kits ---------- */
  const blocks = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 2600);
  const trunks = new Kit(scene, new THREE.CylinderGeometry(0.7, 1, 1, 7), toon(0xffffff), 320);
  const crowns = new Kit(scene, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), 1600);
  const crops = new Kit(scene, new THREE.ConeGeometry(0.25, 1, 5), toon(0xffffff), 1600, false);
  const rocks = new Kit(scene, new THREE.DodecahedronGeometry(1, 0), toon(0xffffff), 300);
  const keepOut = (x, z, extra = 0) => CLEAR.some(c => Math.hypot(x - c.x, z - c.z) < c.r + extra) || roadDist(x, z) < 5 + extra || Math.hypot(x, z) > edgeRadius(x, z) - 14 || !!inField(x, z);

  /* ---------- Eikar cottages: round walls under an acorn-cap roof ---------- */
  const capTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
    g.fillStyle = '#7a4a2a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(30,15,5,0.5)'; g.lineWidth = 3;
    for (let y = 0; y < 140; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < 140; x += 14) { g.beginPath(); g.arc(x, y, 8, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); return t;
  })();
  const roofMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: capTex, gradientMap: ramp() });
  const wallMats = ['#f0dcb4', '#e8c89a', '#f4e6c8', '#dcc0a0'].map(c => toon(c));
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffd890 });
  const doorMat = toon(0x6a3a1e);
  const houses = [];
  function cottage(x, z, r, rot, opts = {}) {
    const g = heightAt(x, z), H = opts.h || 3.2 + rng() * 1.2;
    const grp = new THREE.Group(); grp.position.set(x, g, z); grp.rotation.y = rot;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, H, 16), pick(wallMats)); wall.position.y = H / 2 - 0.2; grp.add(wall);
    const roof = new THREE.Mesh(new THREE.SphereGeometry(r * 1.32, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), roofMat); roof.scale.y = 0.75; roof.position.y = H - 0.25; grp.add(roof);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.3, 0.22, 6, 20), roofMat); rim.rotation.x = Math.PI / 2; rim.position.y = H - 0.2; grp.add(rim);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 1.1, 6), toon(0x4a2c18)); stem.position.y = H + r * 0.95; stem.rotation.z = 0.3; grp.add(stem);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.2), doorMat); door.position.set(0, 1.0, r + 0.02); grp.add(door);
    for (const a of [1.2, -1.2, 2.6]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.38, 12), windowMat); w.position.set(Math.sin(a) * (r + 0.03), 2.0, Math.cos(a) * (r + 0.03)); w.rotation.y = a; w.userData.noOutline = true; grp.add(w); }
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.6, 6), toon(0x8a6a50)); chim.position.set(r * 0.6, H + 0.6, -r * 0.3); grp.add(chim);
    outlineAll(grp, 0.05);
    grp.traverse(m => { if (m.isMesh && m.name !== 'outline') { m.castShadow = true; m.receiveShadow = true; } });
    scene.add(grp);
    col.add(x, z, r * 0.85, r * 0.85, 0, g - 1, g + H + 2);
    houses.push({ x, z, r, chim: new THREE.Vector3(x + Math.cos(rot) * r * 0.6 + Math.sin(rot) * -r * 0.3, g + H + 1.4, z) });
    return grp;
  }

  /* the market square: paving, a fountain, stalls */
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(22, 22.5, 0.4, 40), toon(0xe0caa0)); plaza.position.set(SQUARE.x, SQ_H - 0.15, SQUARE.z); plaza.receiveShadow = true; scene.add(plaza);
  const water = new THREE.MeshToonMaterial({ color: 0x5ac0d8, emissive: 0x1a6a80, emissiveIntensity: 0.5, gradientMap: ramp() });
  {
    const basin = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.5, 6, 24), toon(0xcab088)); basin.rotation.x = -Math.PI / 2; basin.position.set(SQUARE.x, SQ_H + 0.4, SQUARE.z - 6); addOutline(basin, 0.05); scene.add(basin);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), water); pool.rotation.x = -Math.PI / 2; pool.position.set(SQUARE.x, SQ_H + 0.45, SQUARE.z - 6); scene.add(pool);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 2.6, 8), toon(0xcab088)); pillar.position.set(SQUARE.x, SQ_H + 1.3, SQUARE.z - 6); addOutline(pillar, 0.04); scene.add(pillar);
    // a little bronze acorn on top — Xilia remembers the Eikar with no hat
    const acorn = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), toon(0xc8902a)); acorn.position.set(SQUARE.x, SQ_H + 3.1, SQUARE.z - 6); acorn.scale.y = 1.2; addOutline(acorn, 0.04); scene.add(acorn);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; col.add(SQUARE.x + Math.cos(a) * 3.4, SQUARE.z - 6 + Math.sin(a) * 3.4, 1.4, 0.5, -a + Math.PI / 2, SQ_H - 1, SQ_H + 0.9); }
    col.add(SQUARE.x, SQUARE.z - 6, 0.6, 0.6, 0, SQ_H - 1, SQ_H + 3.6);
  }
  const awnings = [0xc0392b, 0x2f6f8a, 0xd9a441, 0x5a8a3a, 0x8a3a6a];
  [[-12, 52], [-10, 60], [12, 52], [10, 62], [-4, 66], [6, 40]].forEach(([dx, dz], i) => {
    const x = SQUARE.x + dx, z = SQUARE.z + dz - 50 + 50, g = SQ_H;
    const grp = new THREE.Group(); grp.position.set(SQUARE.x + dx, g, dz); grp.rotation.y = Math.atan2(-dx, -(dz - SQUARE.z));
    const table = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1.4), toon(0x8a5a36)); table.position.y = 0.5; grp.add(table);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 5), toon(0x5a3a20)); p.position.set(s * 1.4, 1.3, -0.6); grp.add(p); }
    const aw = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 2.0), toon(awnings[i % awnings.length])); aw.position.set(0, 2.6, -0.1); aw.rotation.x = 0.2; grp.add(aw);
    for (let k = 0; k < 4; k++) { const good = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), toon(pick([0xe08a3a, 0xd04a3a, 0xe8c84a, 0x6aa04a]))); good.position.set(-1 + k * 0.65, 1.15, 0.1); grp.add(good); }
    outlineAll(grp, 0.03); grp.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; });
    scene.add(grp);
    col.add(SQUARE.x + dx, dz, 1.6, 0.8, grp.rotation.y, g - 1, g + 1.1);
  });
  // the town hearth
  const hearth = { x: SQUARE.x + 8, z: SQUARE.z + 10 };
  {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.28, 5, 12), toon(0x7a6a5a)); ring.rotation.x = -Math.PI / 2; ring.position.set(hearth.x, SQ_H + 0.15, hearth.z); scene.add(ring);
  }
  const hearthFire = glowSprite(0xff8a3a, 3.2, 0.95); hearthFire.position.set(hearth.x, SQ_H + 0.9, hearth.z); scene.add(hearthFire);

  /* cottages around the square and along the roads */
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.2;
    const x = SQUARE.x + Math.cos(a) * 34, z = SQUARE.z + Math.sin(a) * 30;
    if (roadDist(x, z) < 7) continue;
    cottage(x, z, 3 + rng() * 1.2, Math.atan2(SQUARE.x - x, SQUARE.z - z));
  }
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2, r = 48 + rng() * 40, x = SQUARE.x + Math.cos(a) * r, z = SQUARE.z + Math.sin(a) * r * 0.85;
    if (keepOut(x, z, 4) || houses.some(h => Math.hypot(h.x - x, h.z - z) < 11)) continue;
    cottage(x, z, 2.6 + rng() * 1.4, rng() * Math.PI * 2);
  }

  /* ---------- the Carpenter's yard: workshop, glide tower, dummies' posts ---------- */
  {
    const { x, z } = YARD, g = heightAt(x, z);
    cottage(x + 14, z - 6, 5, -Math.PI / 2, { h: 4.5 });
    // a fence ring
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2; if (i % 9 === 4) continue;
      blocks.put(x + Math.cos(a) * 17, g + 0.6, z + Math.sin(a) * 17, 0.2, 1.2, 0.2, 0, 0, 0, '#6a4428');
      blocks.put(x + Math.cos(a + 0.12) * 17, g + 0.9, z + Math.sin(a + 0.12) * 17, 0.12, 0.12, 4.2, 0, -a, 0, '#7a5232');
    }
    // the glide tower: a lookout of fire-tree wood with a stair
    const tx = x - 10, tz = z - 10, H = 10;
    blocks.put(tx, g + H / 2 - 0.5, tz, 4, H + 1, 4, 0, 0, 0, '#8a5a36');
    col.add(tx, tz, 2, 2, 0, g - 1, g + H);
    // a stair winding round three sides of the tower, up to the top
    const path = [];
    for (let i = 0; i < 7; i++) path.push([tx - 3.2, tz + 3.2 - i * 0.92]);
    for (let i = 0; i < 7; i++) path.push([tx - 3.2 + i * 0.92, tz - 3.2]);
    for (let i = 0; i < 7; i++) path.push([tx + 3.2, tz - 3.2 + i * 0.92]);
    path.forEach(([bx, bz], i) => {
      const sy = Math.min(H, (i + 1) * (H / path.length));
      blocks.put(bx, g + sy / 2 - 0.3, bz, 1.3, sy + 0.6, 1.3, 0, 0, 0, i % 2 ? '#9a6a40' : '#a8784a');
      col.add(bx, bz, 0.65, 0.65, 0, g - 1, g + sy);
    });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), toon(0xd9a441, { side: THREE.DoubleSide })); flag.position.set(tx, g + H + 2.2, tz); scene.add(flag);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 5), toon(0x4a2a14)); pole.position.set(tx - 0.9, g + H + 1.5, tz); scene.add(pole);
    // the high post for the far dummy
    blocks.put(x + 6, g + 3, z + 10, 0.8, 6, 0.8, 0, 0, 0, '#6a4428');
    col.add(x + 6, z + 10, 0.4, 0.4, 0, g - 1, g + 6);
  }

  /* ---------- Ruut's pen ---------- */
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2; if (i === 5) continue;
    blocks.put(PEN.x + Math.cos(a) * 11, heightAt(PEN.x + Math.cos(a) * 11, PEN.z + Math.sin(a) * 11) + 0.6, PEN.z + Math.sin(a) * 11, 0.2, 1.2, 0.2, 0, 0, 0, '#6a4428');
  }

  /* ---------- fields of crops ---------- */
  for (const f of FIELDS) for (let i = 0; i < 260; i++) {
    const x = f.x + (rng() - 0.5) * f.w, z = f.z + (rng() - 0.5) * f.d;
    if (Math.sin((x - f.x) * 1.4) < 0.2) continue;
    crops.put(x, heightAt(x, z) + 0.45, z, 1 + rng() * 0.5, 0.9 + rng() * 0.6, 1 + rng() * 0.5, 0, rng() * 3, 0, pick(['#c8b040', '#d8c060', '#8ab04a', '#e0a040']));
  }
  // a windmill by the west fields
  {
    const x = -78, z = 2, g = heightAt(x, z);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.8, 11, 10), toon(0xf0dcb4)); tower.position.set(x, g + 5.5, z); addOutline(tower, 0.06); tower.castShadow = true; scene.add(tower);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), roofMat); cap.position.set(x, g + 11, z); scene.add(cap);
    col.add(x, z, 2.3, 2.3, 0, g - 1, g + 12);
    var mill = new THREE.Group(); mill.position.set(x, g + 9, z + 2.8); scene.add(mill);
    for (let k = 0; k < 4; k++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.1), toon(0xe8d8b0)); blade.position.y = 3; const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2; arm.add(blade); mill.add(arm); }
  }

  /* ---------- forests and trees ---------- */
  function tree(x, z, s) {
    const g = heightAt(x, z), h = 4 + s * 3.5;
    trunks.put(x, g + h / 2 - 0.4, z, 0.35 * s, h, 0.35 * s, 0, rng() * 6, 0, '#6b4128');
    const lc = pick(LEAF);
    for (let k = 0; k < 3 + Math.floor(rng() * 3); k++) {
      const r = (1.6 + rng() * 1.3) * s;
      crowns.put(x + (rng() - 0.5) * 2.4 * s, g + h + (rng() - 0.2) * 1.8 * s, z + (rng() - 0.5) * 2.4 * s, r, r * 0.85, r, rng(), rng(), rng(), new THREE.Color(lc).offsetHSL((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.1).getStyle());
    }
    col.add(x, z, 0.35 * s, 0.35 * s, 0, g - 1, g + h);
  }
  for (let i = 0; i < 1400 && trunks.mesh.count < 290; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 180, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z, -2)) continue;
    const nearTown = Math.hypot(x - SQUARE.x, z - SQUARE.z) < 80;
    if (nearTown && rng() < 0.85) continue;
    if (z > -30 && rng() < 0.55) continue;        // the forest is in the north
    tree(x, z, 0.8 + rng() * 1.0);
  }
  for (let i = 0; i < 120; i++) {
    const a = rng() * Math.PI * 2, r = rng() * 175, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z) || Math.hypot(x - SQUARE.x, z - SQUARE.z) < 70) continue;
    const s = 0.4 + Math.pow(rng(), 3) * 2.4;
    rocks.put(x, heightAt(x, z) + s * 0.3, z, s * (1 + rng() * 0.5), s * 0.7, s, rng() * 3, rng() * 3, rng() * 3, pick(['#b8a080', '#a89070', '#c8b090']));
    if (s > 1.2) col.add(x, z, s * 0.8, s * 0.8, 0, heightAt(x, z) - 1, heightAt(x, z) + s * 0.9);
  }

  /* ---------- the Ember Grove: a young fire tree and its seed ---------- */
  const seedSpot = new THREE.Vector3();
  {
    const { x, z } = GROVE, g = heightAt(x, z);
    const ft = new THREE.Group();
    const barkMat = toon(0x6a2c1c, { emissive: 0x3a0e04, emissiveIntensity: 0.4 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.8, 16, 10), barkMat); trunk.position.y = 8; ft.add(trunk);
    const leaf = new THREE.MeshToonMaterial({ color: 0xff6f22, emissive: 0xff4a10, emissiveIntensity: 0.55, gradientMap: ramp() });
    for (let k = 0; k < 10; k++) { const a = rng() * 6.28, r = rng() * 7; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + rng() * 2.5, 1), leaf); b.position.set(Math.cos(a) * r, 18 + rng() * 6, Math.sin(a) * r); ft.add(b); }
    outlineAll(ft, 0.1); ft.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; });
    ft.position.set(x, g - 0.4, z); scene.add(ft);
    col.add(x, z, 2.2, 2.2, 0, g - 1, g + 18);
    const glow = glowSprite(0xff8a3a, 40, 0.3); glow.position.set(x, g + 20, z); scene.add(glow);
    seedSpot.set(x + 4, g + 0.6, z + 4);
  }

  /* ---------- the Duskareth hideout ---------- */
  {
    const { x, z } = HIDEOUT;
    for (const [dx, dz, r] of [[-6, 4, 0.3], [6, -2, -0.5], [0, -8, 0.1]]) {
      const tg2 = heightAt(x + dx, z + dz);
      const tent = new THREE.Mesh(new THREE.ConeGeometry(3, 3.4, 5, 1, true), toon(0x2a2236, { side: THREE.DoubleSide })); tent.position.set(x + dx, tg2 + 1.6, z + dz); tent.rotation.y = r; tent.castShadow = true; scene.add(tent);
      col.add(x + dx, z + dz, 1.9, 1.9, r, tg2 - 1, tg2 + 3);
    }
    const sig = glowSprite(0x9a4aff, 6, 0.5); sig.position.set(x, heightAt(x, z) + 2, z); scene.add(sig);
  }

  /* ---------- the dock and pier ---------- */
  const dockZ0 = edgeRadius(0, 170) - 6;
  const pierY = 1.2, pierEnd = dockZ0 + 46;
  {
    for (let z = dockZ0 - 8; z < pierEnd; z += 1.6) blocks.put(0, pierY - 0.2, z, 6, 0.32, 1.45, 0, (rng() - 0.5) * 0.03, 0, rng() < 0.5 ? '#8a5a36' : '#9a6a40');
    col.add(0, (dockZ0 - 8 + pierEnd) / 2, 3, (pierEnd - dockZ0 + 8) / 2, 0, pierY - 3, pierY);
    for (let z = dockZ0 - 6; z < pierEnd; z += 6) for (const s of [-1, 1]) { blocks.put(s * 3.1, pierY - 6, z, 0.5, 12, 0.5, 0, 0, 0, '#5a3a24'); blocks.put(s * 3.1, pierY + 0.6, z, 0.3, 1.2, 0.3, 0, 0, 0, '#5a3a24'); }
    for (const s of [-1, 1]) { blocks.put(s * 3.1, pierY + 1.15, (dockZ0 + pierEnd) / 2, 0.18, 0.15, pierEnd - dockZ0, 0, 0, 0, '#5a3a24'); col.add(s * 3.25, (dockZ0 + pierEnd) / 2, 0.25, (pierEnd - dockZ0) / 2, 0, pierY - 1, pierY + 1.3); }
    col.add(0, pierEnd + 0.3, 3.4, 0.3, 0, pierY - 1, pierY + 1.3);
  }

  /* ---------- floating islets ---------- */
  const islets = [];
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2, r = 230 + rng() * 150, s = 4 + rng() * 10;
    const grp = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.9, s * 0.35, 8), toon(0x9ac04a));
    const bottom = new THREE.Mesh(new THREE.ConeGeometry(s * 0.92, s * 2.2, 8), toon(0xb07a52)); bottom.rotation.x = Math.PI; bottom.position.y = -s * 1.25;
    grp.add(top, bottom); outlineAll(grp, 0.12);
    grp.position.set(Math.cos(a) * r, -10 + rng() * 60, Math.sin(a) * r);
    grp.userData = { by: grp.position.y, ph: rng() * 6, sp: 0.2 + rng() * 0.3 };
    scene.add(grp); islets.push(grp);
  }

  blocks.done(); trunks.done(); crowns.done(); crops.done(); rocks.done();
  const grass = buildGrass(scene, rng, (x, z) => !(Math.hypot(x, z) > edgeRadius(x, z) - 3 || roadDist(x, z) < 3 || Math.hypot(x - SQUARE.x, z - SQUARE.z) < 23 || inField(x, z)), heightAt,
    ['#8fbf52', '#a8c45a', '#7ab04a', '#c0c860', '#98b850'], 26000);

  /* Zahreh flowers — plenty, here at home */
  const flowers = [];
  const petal = new THREE.MeshToonMaterial({ color: 0xffb0d0, emissive: 0xff70b0, emissiveIntensity: 0.6, gradientMap: ramp() });
  for (let i = 0; i < 22; i++) {
    const a = rng() * Math.PI * 2, r = 30 + rng() * 140, fx = Math.cos(a) * r, fz = Math.sin(a) * r;
    if (keepOut(fx, fz)) continue;
    const grp = new THREE.Group();
    for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), petal); const pa = k / 5 * Math.PI * 2; p.position.set(Math.cos(pa) * 0.3, 0.9, Math.sin(pa) * 0.3); p.scale.set(1, 0.45, 1.6); p.rotation.y = -pa; grp.add(p); }
    const gl = glowSprite(0xff8ac8, 2.2, 0.6); gl.position.y = 1; grp.add(gl);
    grp.position.set(fx, heightAt(fx, fz), fz); scene.add(grp);
    flowers.push({ grp, x: fx, z: fz, ready: true, timer: 0 });
  }

  const SITES = {
    square: { name: 'Xilia Market Square', x: SQUARE.x, z: SQUARE.z },
    yard: { name: 'The Carpenter’s Yard', x: YARD.x, z: YARD.z },
    grove: { name: 'The Ember Grove', x: GROVE.x, z: GROVE.z },
    hideout: { name: 'The Duskareth Hideout', x: HIDEOUT.x, z: HIDEOUT.z },
    fields: { name: 'The West Fields', x: -100, z: 30 },
  };

  const spawnGroups = [
    // home: herds and families, all friendly
    { at: [PEN.x, PEN.z], kinds: ['punk_d', 'punk_d', 'punk_d', 'punk_d'], tag: 'herd' },
    { at: [-90, 60], kinds: ['kipsu_f', 'kipsu_f', 'kipsu_f', 'kipsu_f'] },
    { at: [60, 20], kinds: ['kipsu_f', 'kipsu_f', 'kipsu_f'] },
    { at: [30, -30], kinds: ['albali', 'albali', 'albali'] },
    { at: [-40, -110], kinds: ['albali', 'albali'] },
    { at: [110, 80], kinds: ['punk_d', 'punk_d'] },
    // the training dummies in the Carpenter's yard
    { at: [YARD.x - 2, YARD.z + 2], kinds: ['dummy', 'dummy', 'dummy'] },
    { at: [YARD.x + 6, YARD.z + 10], kinds: ['dummy_far'] },
    // quest-folk
    { at: [96, -40], kinds: ['punk_d'], unique: 'stray_1', extra: { stray: 1 } },
    { at: [-120, -10], kinds: ['punk_d'], unique: 'stray_2', extra: { stray: 2 } },
    { at: [40, -150], kinds: ['punk_d'], unique: 'stray_3', extra: { stray: 3 } },
    { at: [-30, -130], kinds: ['kipsu_f'], unique: 'fennek', extra: { pet: 'fennek' } },
    // the wilds beyond the fields
    { at: [20, -70], kinds: ['punk', 'punk'] },
    { at: [-60, -80], kinds: ['rodak', 'rodak', 'rodak'] },
    { at: [GROVE.x - 8, GROVE.z + 16], kinds: ['tyndael', 'tyndael', 'punk'] },
    { at: [GROVE.x + 14, GROVE.z - 4], kinds: ['punk', 'punk', 'punk'] },
    { at: [HIDEOUT.x + 4, HIDEOUT.z], kinds: ['vel', 'malsti', 'malsti', 'malsti'], unique: 'vel_hideout' },
    { at: [120, -60], kinds: ['kipsu', 'kipsu', 'kipsu'] },
    { at: [-130, 60], kinds: ['punk', 'punk'] },
  ];

  const lanterns = [
    { id: 'x_pier', name: 'Xilia Docks', x: 5, z: dockZ0 - 10 },
    { id: 'x_square', name: 'Market Square', x: 14, z: 32 },
    { id: 'x_yard', name: 'The Carpenter’s Yard', x: 30, z: 92 },
    { id: 'x_north', name: 'The Forest Road', x: 8, z: -70 },
    { id: 'x_grove', name: 'Ember Grove Road', x: 40, z: -96 },
  ];
  const stones = [
    { key: 'x_square', x: -6, z: 30 }, { key: 'x_yard', x: 58, z: 92 }, { key: 'x_hideout', x: -92, z: -62 },
  ];

  return {
    name: 'xilia', heightAt, col, SITES, PLAZA: { x: SQUARE.x, z: SQUARE.z, y: SQ_H }, hazards: [], pillars: [], camp: null,
    hearth, pen: PEN, yard: YARD, tower: { x: YARD.x - 10, z: YARD.z - 10, y: SQ_H + 0.4 + 10 }, seedSpot, grove: GROVE,
    pier: { y: pierY, start: new THREE.Vector3(0, pierY, pierEnd - 6), end: pierEnd, z0: dockZ0 },
    edgeRadius, flowers, spawnGroups, lanterns, stones, falls: [], clear: CLEAR,
    update(t, dt, particles, camPos) {
      grass.material.userData.shader && (grass.material.userData.shader.uniforms.uTime.value = t);
      islets.forEach(g => { g.position.y = g.userData.by + Math.sin(t * g.userData.sp + g.userData.ph) * 2.5; });
      flowers.forEach(f => { if (f.ready) f.grp.rotation.y = t * 0.5; });
      if (mill) mill.rotation.z = t * 0.6;
      hearthFire.scale.setScalar(3.2 + Math.sin(t * 11) * 0.25);
      if (particles) {
        if (Math.random() < 0.6) particles.emit(hearth.x + (Math.random() - 0.5) * 0.8, SQ_H + 0.8, hearth.z + (Math.random() - 0.5) * 0.8, { vx: 0, vy: 2 + Math.random(), vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: 0.35, life: 0.9, drag: 0.5 });
        // chimney smoke
        const h = houses[Math.floor(Math.random() * houses.length)];
        if (h && Math.random() < 0.5) particles.emit(h.x + (Math.random() - 0.5), h.chim.y + 0.5, h.z + (Math.random() - 0.5), { vx: 0.6, vy: 1.2, vz: 0.2, color: 0xd8d0c8, size: 1.1, life: 2.5, drag: 0.3 });
        if (Math.random() < 0.6) { const g = GROVE; particles.emit(g.x + (Math.random() - 0.5) * 16, heightAt(g.x, g.z) + 20 + (Math.random() - 0.5) * 6, g.z + (Math.random() - 0.5) * 16, { vx: 0, vy: -0.8, vz: 0, color: 0xff8a3a, size: 0.35, life: 5, drag: 0.2 }); }
        if (camPos && Math.random() < 0.4) particles.emit(camPos.x + (Math.random() - 0.5) * 40, camPos.y + (Math.random() - 0.5) * 12, camPos.z + (Math.random() - 0.5) * 40, { vx: 0.4, vy: 0.15, vz: 0.1, color: 0xffe0a0, size: 0.12, life: 5, drag: 0 });
      }
    },
  };
}
