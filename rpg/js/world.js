/* ============================================================
   THE RUINS OF AAKALAY — a broken highland floating above the
   cloud sea. A dead city of sandstone, stygian shards in the
   dust, a fire tree in the north grove, and the Oath Stone in
   the old Zahreh plaza where the city swore itself away.
   ============================================================ */
import * as THREE from 'three';
import { mulberry32, fbm, smooth, lerp, clamp } from './util.js';
import { toon, ramp, glowSprite, outlineAll, addOutline } from './gfx.js';

export const STEP = 0.6;           // how high a step you can walk up
const PLAZA = { x: 0, z: -10 };
const PLAZA_H = 1.2;

/* ---------------- the landform ---------------- */
function edgeRadius(x, z) {
  const a = Math.atan2(z, x);
  return 174 + (fbm(Math.cos(a) * 2.2 + 5, Math.sin(a) * 2.2 + 5, 3) - 0.5) * 42 + (fbm(Math.cos(a) * 9 + 1, Math.sin(a) * 9, 2) - 0.5) * 10;
}

const DIPS = [];  // { x, z, r, depth } — sunken places
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  let h = (fbm(x * 0.011 + 3, z * 0.011 - 7, 4) - 0.5) * 16 + (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 2.2;
  // the north rises toward the grove and the cliff shrine
  h += smooth(20, -150, z) * 6;
  // flatten the plaza
  const dp = Math.hypot(x - PLAZA.x, z - PLAZA.z);
  h = lerp(h, PLAZA_H, smooth(44, 28, dp));
  // flatten the dock approach
  const dd = Math.abs(x) < 30 ? Math.abs(x) : 99;
  if (z > 120) h = lerp(h, 0.6, smooth(16, 6, dd) * smooth(120, 150, z));
  for (const d of DIPS) { const k = smooth(d.r, d.r * 0.55, Math.hypot(x - d.x, z - d.z)); h -= k * d.depth; }
  const R = edgeRadius(x, z);
  if (r > R - 10) h -= smooth(R - 10, R, r) * 3;
  if (r > R) h -= (r - R) * 5 + 4;
  return Math.max(h, -180);
}

/* ---------------- collision ---------------- */
class Colliders {
  constructor() { this.list = []; this.grid = new Map(); this.cell = 12; }
  add(x, z, hw, hd, angle, bot, top) {
    const o = { x, z, hw, hd, c: Math.cos(angle), s: Math.sin(angle), bot, top };
    this.list.push(o);
    const R = Math.hypot(hw, hd), C = this.cell;
    for (let cx = Math.floor((x - R) / C); cx <= Math.floor((x + R) / C); cx++)
      for (let cz = Math.floor((z - R) / C); cz <= Math.floor((z + R) / C); cz++) {
        const k = cx + ',' + cz; if (!this.grid.has(k)) this.grid.set(k, []); this.grid.get(k).push(o);
      }
    return o;
  }
  remove(o) {
    this.list = this.list.filter(c => c !== o);
    for (const arr of this.grid.values()) { const i = arr.indexOf(o); if (i >= 0) arr.splice(i, 1); }
  }
  near(x, z) { return this.grid.get(Math.floor(x / this.cell) + ',' + Math.floor(z / this.cell)) || []; }
  nearAll(x, z, rad) {
    const C = this.cell, out = new Set();
    for (let cx = Math.floor((x - rad) / C); cx <= Math.floor((x + rad) / C); cx++)
      for (let cz = Math.floor((z - rad) / C); cz <= Math.floor((z + rad) / C); cz++) {
        const a = this.grid.get(cx + ',' + cz); if (a) a.forEach(o => out.add(o));
      }
    return out;
  }
  ground(x, z, feetY) {
    let g = heightAt(x, z);
    for (const o of this.near(x, z)) {
      if (o.top > feetY + STEP || o.top <= g) continue;
      const dx = x - o.x, dz = z - o.z;
      const lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
      if (Math.abs(lx) <= o.hw + 0.05 && Math.abs(lz) <= o.hd + 0.05) g = o.top;
    }
    return g;
  }
  /* push a standing cylinder (feet at y, height hgt) out of anything too tall to step on */
  resolve(p, rad, hgt = 1.8) {
    for (const o of this.nearAll(p.x, p.z, rad + 1)) {
      if (p.y >= o.top - STEP || p.y + hgt <= o.bot) continue;
      const dx = p.x - o.x, dz = p.z - o.z;
      const lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
      const cx = clamp(lx, -o.hw, o.hw), cz = clamp(lz, -o.hd, o.hd);
      let ex = lx - cx, ez = lz - cz, d = Math.hypot(ex, ez);
      if (d >= rad) continue;
      let px, pz;
      if (d > 1e-4) { const push = rad - d; px = ex / d * push; pz = ez / d * push; }
      else {
        const ox = o.hw - Math.abs(lx), oz = o.hd - Math.abs(lz);
        if (ox < oz) { px = Math.sign(lx || 1) * (ox + rad); pz = 0; } else { px = 0; pz = Math.sign(lz || 1) * (oz + rad); }
      }
      p.x += px * o.c + pz * o.s; p.z += -px * o.s + pz * o.c;
    }
  }
  /* first hit along a segment, as a 0..1 fraction (camera collision) */
  ray(a, b) {
    let best = 1;
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, rad = Math.hypot(b.x - a.x, b.z - a.z) / 2 + 1;
    for (const o of this.nearAll(mx, mz, rad)) {
      const t = slab(o, a, b); if (t < best) best = t;
    }
    return best;
  }
}

function slab(o, a, b) {
  const tl = (x, z) => [(x - o.x) * o.c - (z - o.z) * o.s, (x - o.x) * o.s + (z - o.z) * o.c];
  const [ax, az] = tl(a.x, a.z), [bx, bz] = tl(b.x, b.z);
  const d = [bx - ax, b.y - a.y, bz - az], s = [ax, a.y, az];
  const mn = [-o.hw, o.bot, -o.hd], mx = [o.hw, o.top, o.hd];
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-6) { if (s[i] < mn[i] || s[i] > mx[i]) return 1; continue; }
    let ta = (mn[i] - s[i]) / d[i], tb = (mx[i] - s[i]) / d[i];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 > t1) return 1;
  }
  return t0;
}

/* ---------------- instanced kit ---------------- */
class Kit {
  constructor(scene, geo, mat, max, shadow = true) {
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.count = 0; this.max = max;
    this.mesh.castShadow = shadow; this.mesh.receiveShadow = true;
    this.mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    scene.add(this.mesh);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.c = new THREE.Color();
  }
  put(x, y, z, sx, sy, sz, rx, ry, rz, color) {
    if (this.mesh.count >= this.max) return -1;   // never draw past the buffer
    const i = this.mesh.count++;
    this.e.set(rx, ry, rz); this.q.setFromEuler(this.e);
    this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(sx, sy, sz));
    this.mesh.setMatrixAt(i, this.m);
    this.mesh.setColorAt(i, this.c.set(color));
    return i;
  }
  done() { this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; this.mesh.computeBoundingSphere(); }
}

const STONE = ['#dcbd8c', '#cfa977', '#c39a68', '#e6cba0', '#b98e60', '#d6b07d'];
const MOSS = ['#7f8f3a', '#6d7f34', '#93a046'];

/* ================================================================= */
export function buildWorld(scene) {
  const rng = mulberry32(1307);
  const pick = a => a[Math.floor(rng() * a.length)];
  const col = new Colliders();

  /* places that matter */
  const SITES = {
    library: { name: 'The Drowned Library', x: -84, z: 14 },
    tower: { name: 'The Watch of Aakalay', x: 90, z: 36 },
    grove: { name: 'The Fire Tree Grove', x: 70, z: -92 },
    shrine: { name: 'The Cliff Shrine', x: -104, z: -96 },
    garden: { name: 'The Sunken Zahreh Garden', x: -54, z: 82 },
  };
  DIPS.length = 0;
  DIPS.push({ x: SITES.garden.x, z: SITES.garden.z, r: 26, depth: 3.2 });

  /* ---------- terrain ---------- */
  const SIZE = 440, SEG = 220;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position, tcol = new Float32Array(tp.count * 3);
  const c = new THREE.Color(), grassA = new THREE.Color('#a3ad4f'), grassB = new THREE.Color('#c6a14a'), grassC = new THREE.Color('#7f9a45'),
    dirt = new THREE.Color('#c99f6a'), rock = new THREE.Color('#a86f4a'), rockD = new THREE.Color('#7a4a36'), pave = new THREE.Color('#d8bf94');
  const roads = [[0, 175, 0, 20], [0, -40, 0, -150], [-96, 16, 96, 36], [-54, 82, 0, 90], [70, -92, 22, -30], [-104, -96, -22, -30]];
  const roadDist = (x, z) => {
    let best = 1e9;
    for (const [ax, az, bx, bz] of roads) {
      const vx = bx - ax, vz = bz - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
      best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
    }
    return best;
  };
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), y = heightAt(x, z);
    tp.setY(i, y);
    const R = edgeRadius(x, z), r = Math.hypot(x, z);
    const n = fbm(x * 0.03 + 11, z * 0.03, 3), n2 = fbm(x * 0.12, z * 0.12, 2);
    c.copy(grassA).lerp(grassB, smooth(0.45, 0.7, n)).lerp(grassC, smooth(0.5, 0.25, n2) * 0.6);
    const rd = roadDist(x, z);
    c.lerp(dirt, smooth(6, 3, rd) * 0.85);
    c.lerp(pave, smooth(30, 26, Math.hypot(x - PLAZA.x, z - PLAZA.z)));
    if (r > R - 3) c.lerp(rock, smooth(R - 3, R + 1, r)).lerp(rockD, smooth(R + 4, R + 30, r) * (0.5 + 0.5 * Math.sin(y * 0.6)));
    tcol[i * 3] = c.r; tcol[i * 3 + 1] = c.g; tcol[i * 3 + 2] = c.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, toon(0xffffff, { vertexColors: true }));
  terrain.receiveShadow = true;
  scene.add(terrain);

  /* the rock root hanging beneath the floating highland */
  {
    const A = 96, RINGS = 16, pos = [], cols = [], idx = [];
    const strata = ['#b5784e', '#94573c', '#c98d5c', '#7d4a36', '#a8673f'].map(s => new THREE.Color(s));
    for (let k = 0; k <= RINGS; k++) {
      const t = k / RINGS, y = -8 - Math.pow(t, 1.25) * 300;
      for (let j = 0; j <= A; j++) {
        const a = j / A * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const R = edgeRadius(ca * 170, sa * 170) + 6;
        const jag = 1 + (fbm(ca * 3 + k * 0.7, sa * 3 + k * 0.4, 3) - 0.5) * 0.5 * t;
        const rr = R * Math.pow(1 - t, 0.75) * jag + (k === RINGS ? 0 : 2);
        pos.push(ca * rr, y + (fbm(a * 4, k, 2) - 0.5) * 14 * t, sa * rr);
        const sc = strata[Math.floor(Math.abs(y * 0.07 + fbm(a * 2, k, 2) * 2)) % strata.length];
        cols.push(sc.r, sc.g, sc.b);
      }
    }
    for (let k = 0; k < RINGS; k++) for (let j = 0; j < A; j++) {
      const a = k * (A + 1) + j, b = a + A + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const under = new THREE.Mesh(g, toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide }));
    scene.add(under);
  }

  /* ---------- kits ---------- */
  const blocks = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 4200);
  const columns = new Kit(scene, new THREE.CylinderGeometry(1, 1.08, 1, 10), toon(0xffffff), 600);
  const trunks = new Kit(scene, new THREE.CylinderGeometry(0.7, 1, 1, 7), toon(0xffffff), 300);
  const crowns = new Kit(scene, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff, {}), 1600);
  const rocks = new Kit(scene, new THREE.DodecahedronGeometry(1, 0), toon(0xffffff, {}), 500);

  /* a solid block standing on the ground; registers a collider */
  function block(x, z, w, d, h, ang = 0, color, opts = {}) {
    const g = opts.base ?? Math.min(heightAt(x - w / 2, z - d / 2), heightAt(x + w / 2, z + d / 2), heightAt(x - w / 2, z + d / 2), heightAt(x + w / 2, z - d / 2), heightAt(x, z));
    const bot = g - (opts.sink ?? 1.2), top = (opts.base ?? heightAt(x, z)) + h;
    blocks.put(x, (bot + top) / 2, z, w, top - bot, d, 0, ang, 0, color || pick(STONE));
    if (opts.moss && rng() < opts.moss) blocks.put(x, top + 0.08, z, w * 1.04, 0.2, d * 1.04, 0, ang, 0, pick(MOSS));
    if (!opts.noCol) col.add(x, z, w / 2, d / 2, ang, bot, top);
    return top;
  }
  function column(x, z, r, h, opts = {}) {
    const g = heightAt(x, z) - 0.5, top = (opts.base ?? heightAt(x, z)) + h;
    columns.put(x, (g + top) / 2, z, r, top - g, r, 0, rng() * 6, 0, opts.color || pick(STONE));
    blocks.put(x, g + 0.6, z, r * 2.6, 1.2, r * 2.6, 0, 0, 0, pick(STONE));
    if (!opts.broken) blocks.put(x, top + 0.25, z, r * 2.5, 0.5, r * 2.5, 0, 0, 0, pick(STONE));
    col.add(x, z, r * 0.95, r * 0.95, 0, g, top + 0.5);
    return top;
  }

  /* a wall from (ax,az) to (bx,bz), made of broken segments */
  function wall(ax, az, bx, bz, hMin, hMax, opts = {}) {
    const len = Math.hypot(bx - ax, bz - az), ang = -Math.atan2(bz - az, bx - ax);
    const n = Math.max(1, Math.round(len / 2.4)), seg = len / n;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      if (opts.door != null && Math.abs(t - opts.door) < 1.6 / len) continue;
      if (rng() < (opts.gaps ?? 0.12)) continue;
      const h = hMin + Math.pow(rng(), 1.4) * (hMax - hMin);
      block(ax + (bx - ax) * t, az + (bz - az) * t, seg + 0.02, opts.thick ?? 0.9, h, ang, null, { moss: 0.35 });
    }
  }

  function house(cx, cz, w, d, hMax, rot) {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const P = (lx, lz) => [cx + lx * cs + lz * sn, cz - lx * sn + lz * cs];
    const corners = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
    const doorSide = Math.floor(rng() * 4);
    for (let s = 0; s < 4; s++) {
      const [ax, az] = corners[s], [bx, bz] = corners[(s + 1) % 4];
      wall(ax, az, bx, bz, 0.8, hMax, { door: s === doorSide ? 0.5 : null, gaps: 0.18 });
    }
    // a floor of worn slabs
    const fp = P(0, 0);
    blocks.put(fp[0], heightAt(fp[0], fp[1]) + 0.05, fp[1], w - 0.6, 0.18, d - 0.6, 0, rot, 0, '#bfa27a');
    // rubble inside
    for (let k = 0; k < 3; k++) {
      const q = P((rng() - 0.5) * w * 0.6, (rng() - 0.5) * d * 0.6);
      rocks.put(q[0], heightAt(q[0], q[1]) + 0.2, q[1], 0.4 + rng() * 0.5, 0.3 + rng() * 0.4, 0.4 + rng() * 0.5, rng() * 3, rng() * 3, rng() * 3, pick(STONE));
    }
  }

  const keepOut = (x, z, extra = 0) => {
    if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < 40 + extra) return true;
    for (const k in SITES) if (Math.hypot(x - SITES[k].x, z - SITES[k].z) < 30 + extra) return true;
    if (roadDist(x, z) < 9 + extra) return true;
    if (Math.hypot(x, z) > edgeRadius(x, z) - 22) return true;
    return false;
  };

  /* ---------- the city ---------- */
  for (let gx = -120; gx <= 120; gx += 19) for (let gz = -130; gz <= 120; gz += 19) {
    const x = gx + (rng() - 0.5) * 6, z = gz + (rng() - 0.5) * 6;
    if (Math.hypot(x, z) > 128 || keepOut(x, z) || rng() < 0.25) continue;
    house(x, z, 7 + rng() * 6, 7 + rng() * 6, 2 + rng() * 4.5, rng() < 0.5 ? 0 : Math.PI / 2 + (rng() - 0.5) * 0.3);
  }

  /* the old city wall, a broken ring */
  for (let i = 0; i < 64; i++) {
    const a0 = i / 64 * Math.PI * 2, a1 = (i + 1) / 64 * Math.PI * 2, R = 138;
    const mid = (a0 + a1) / 2, mx = Math.cos(mid) * R, mz = Math.sin(mid) * R;
    if (Math.abs(mx) < 14 && mz > 0) continue;            // the south gate
    if (rng() < 0.3 || Math.hypot(mx, mz) > edgeRadius(mx, mz) - 8) continue;
    wall(Math.cos(a0) * R, Math.sin(a0) * R, Math.cos(a1) * R, Math.sin(a1) * R, 2, 7.5, { thick: 2.2, gaps: 0.1 });
  }
  /* the great gate */
  const gateZ = 138;
  for (const s of [-1, 1]) {
    block(s * 9, gateZ, 5, 5, 13, 0, '#d4b27e', { moss: 1 });
    column(s * 5.5, gateZ - 4, 1, 9);
  }
  {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(9, 1.3, 8, 20, Math.PI * 0.62), toon(0xd8b582));
    arch.position.set(0, heightAt(0, gateZ) + 11, gateZ); arch.rotation.z = Math.PI * 0.12;
    arch.castShadow = true; scene.add(arch);
  }

  /* ---------- the Zahreh plaza and the Oath Stone ---------- */
  const plazaY = PLAZA_H;
  const plazaDisk = new THREE.Mesh(new THREE.CylinderGeometry(30, 31, 0.6, 48), toon(0xcfb48a));
  plazaDisk.position.set(PLAZA.x, plazaY - 0.22, PLAZA.z); plazaDisk.receiveShadow = true; scene.add(plazaDisk);
  const ringMat = toon(0xa8865e);
  for (const r of [12, 22]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.3, 4, 64), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(PLAZA.x, plazaY + 0.08, PLAZA.z); scene.add(ring);
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    if (rng() < 0.3) continue;
    column(PLAZA.x + Math.cos(a) * 33, PLAZA.z + Math.sin(a) * 33, 1.1, rng() < 0.45 ? 2 + rng() * 3 : 8 + rng() * 2, { broken: rng() < 0.5, base: plazaY });
  }
  // fallen columns
  for (let i = 0; i < 3; i++) {
    const a = rng() * Math.PI * 2, r = 26 + rng() * 6, x = PLAZA.x + Math.cos(a) * r, z = PLAZA.z + Math.sin(a) * r;
    columns.put(x, plazaY + 0.9, z, 1, 7, 1, 0, a, Math.PI / 2, pick(STONE));
    col.add(x, z, 3.5, 0.9, a, plazaY - 1, plazaY + 1.9);
  }

  /* the Oath Stone itself: stygian, runed, five sockets for five memories */
  const oath = new THREE.Group();
  const runeTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 512;
    const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 128, 512);
    g.strokeStyle = '#c690ff'; g.lineWidth = 4; const r2 = mulberry32(9);
    for (let y = 30; y < 500; y += 36) {
      g.beginPath(); let x = 30 + r2() * 20; g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += 10 + r2() * 14; g.lineTo(x, y + (r2() - 0.5) * 22); }
      g.stroke();
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const stygMat = new THREE.MeshToonMaterial({ color: 0x2a2236, emissive: 0xffffff, emissiveMap: runeTex, emissiveIntensity: 0.25, gradientMap: ramp() });
  const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 10, 4, 1), stygMat);
  obelisk.position.y = 5; obelisk.rotation.y = Math.PI / 4; obelisk.castShadow = true;
  addOutline(obelisk, 0.08); oath.add(obelisk);
  const cap = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), stygMat); cap.position.y = 10.6; cap.scale.y = 1.4; addOutline(cap, 0.06); oath.add(cap);
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7.2, 0.9, 5), toon(0x8a7058)); dais.position.y = 0.05; dais.receiveShadow = true; addOutline(dais, 0.06); oath.add(dais);
  const sockets = [];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + Math.PI / 2;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.4, 6), toon(0x5b4a5e));
    ped.position.set(Math.cos(a) * 5, 1.2, Math.sin(a) * 5); addOutline(ped, 0.04); oath.add(ped);
    const lit = glowSprite(0xb47cff, 2.4, 0); lit.position.set(Math.cos(a) * 5, 2.4, Math.sin(a) * 5); oath.add(lit);
    sockets.push({ ped, lit, filled: false });
  }
  const oathGlow = glowSprite(0x9a5cff, 14, 0.25); oathGlow.position.y = 7; oath.add(oathGlow);
  oath.position.set(PLAZA.x, plazaY, PLAZA.z);
  scene.add(oath);
  col.add(PLAZA.x, PLAZA.z, 1.9, 1.9, Math.PI / 4, plazaY - 1, plazaY + 11);
  col.add(PLAZA.x, PLAZA.z, 6, 6, 0, plazaY - 1, plazaY + 0.5);

  /* ---------- site: the Drowned Library (west) ---------- */
  {
    const { x, z } = SITES.library, W = 26, D = 18;
    wall(x - W / 2, z - D / 2, x + W / 2, z - D / 2, 4, 8.5, { gaps: 0.06, thick: 1.2 });
    wall(x - W / 2, z + D / 2, x + W / 2, z + D / 2, 4, 8.5, { gaps: 0.06, thick: 1.2 });
    wall(x - W / 2, z - D / 2, x - W / 2, z + D / 2, 5, 9, { gaps: 0.04, thick: 1.2 });
    wall(x + W / 2, z - D / 2, x + W / 2, z + D / 2, 3, 7, { door: 0.5, gaps: 0.06, thick: 1.2 });
    for (let i = -2; i <= 2; i++) for (const s of [-1, 1]) column(x + i * 4.6, z + s * 4.5, 0.7, rng() < 0.35 ? 3 + rng() * 2 : 7.5, { broken: rng() < 0.3 });
    // shelves of dark wood and fallen tomes
    for (let i = -2; i <= 2; i++) for (const s of [-1, 1]) block(x + i * 4.6, z + s * 7.6, 3, 0.8, 2.6 + rng() * 1.5, 0, '#5a3524');
    for (let k = 0; k < 18; k++) blocks.put(x + (rng() - 0.5) * 20, heightAt(x, z) + 0.15, z + (rng() - 0.5) * 12, 0.5, 0.15, 0.7, 0, rng() * 3, 0, pick(['#7a2e2a', '#2e4a6a', '#6a5a2a', '#3d5d3a']));
    SITES.library.coreAt = new THREE.Vector3(x - 8, heightAt(x - 8, z) + 1.6, z);
    block(x - 8, z, 1.6, 1.6, 1.0, 0, '#8a7058');
  }

  /* ---------- site: the Watch (east) — a tower you climb ---------- */
  {
    const { x, z } = SITES.tower, base = heightAt(x, z), H = 9;
    block(x, z, 9, 9, H, 0, '#d1ae7c', { base, moss: 1 });
    // parapet on the south and east faces (the north edge is open to the stair)
    for (const [dx, dz, w, d] of [[0, 4.2, 9, 0.6], [4.2, 0, 0.6, 9]]) {
      for (let k = -1; k <= 1; k++) if (rng() < 0.8) {
        const px = x + dx + (w > 1 ? k * 3 : 0), pz = z + dz + (d > 1 ? k * 3 : 0);
        block(px, pz, w > 1 ? 2.6 : w, d > 1 ? 2.6 : d, H + 1.3 + rng() * 0.8, 0, null, { base, sink: -H + 0.1 });
      }
    }
    // first flight up the west face, a landing, then up the north face onto the top
    let sy = 0;
    for (let i = 0; i < 9; i++) { sy += 0.5; block(x - 6, z + 5 - i * 1.2, 3, 1.2, sy, 0, null, { base }); }
    sy += 0.5; block(x - 6, z - 6.2, 3, 3, sy, 0, null, { base });
    for (let i = 0; i < 8; i++) { sy += 0.5; block(x - 3.3 + i * 1.2, z - 6.2, 1.2, 3, Math.min(sy, H), 0, null, { base }); }
    SITES.tower.coreAt = new THREE.Vector3(x + 1, base + H + 1.6, z + 1);
    SITES.tower.top = base + H;
  }

  /* ---------- site: the Fire Tree Grove (north-east) ---------- */
  let fireTree;
  {
    const { x, z } = SITES.grove, g = heightAt(x, z);
    fireTree = new THREE.Group();
    const barkMat = toon(0x6a2c1c, { emissive: 0x3a0e04, emissiveIntensity: 0.4 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.6, 26, 12), barkMat);
    trunk.position.y = 12; fireTree.add(trunk);
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2 + 0.3;
      const pts = [new THREE.Vector3(Math.cos(a) * 2.5, 4, Math.sin(a) * 2.5), new THREE.Vector3(Math.cos(a) * 6, 1.4, Math.sin(a) * 6), new THREE.Vector3(Math.cos(a) * 9.5, -0.6, Math.sin(a) * 9.5)];
      const root = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 1.1, 7), barkMat);
      fireTree.add(root);
      col.add(x + Math.cos(a) * 6.5, z + Math.sin(a) * 6.5, 1.0, 2.8, -a + Math.PI / 2, g - 1, g + 1.4);
    }
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2;
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.1, 12, 6), barkMat);
      br.position.set(Math.cos(a) * 5, 26, Math.sin(a) * 5); br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      fireTree.add(br);
    }
    const leaf = new THREE.MeshToonMaterial({ color: 0xff6f22, emissive: 0xff4a10, emissiveIntensity: 0.55, gradientMap: ramp() });
    const leaf2 = new THREE.MeshToonMaterial({ color: 0xffb03a, emissive: 0xff7a10, emissiveIntensity: 0.5, gradientMap: ramp() });
    for (let k = 0; k < 16; k++) {
      const a = rng() * Math.PI * 2, r = rng() * 11;
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + rng() * 3.5, 1), rng() < 0.5 ? leaf : leaf2);
      blob.position.set(Math.cos(a) * r, 29 + rng() * 9, Math.sin(a) * r);
      fireTree.add(blob);
    }
    outlineAll(fireTree, 0.12);
    fireTree.traverse(o => { if (o.isMesh && o.name !== 'outline') o.castShadow = true; });
    fireTree.position.set(x, g - 0.5, z);
    scene.add(fireTree);
    const glow = glowSprite(0xff8a3a, 60, 0.35); glow.position.set(x, g + 33, z); scene.add(glow);
    col.add(x, z, 3.3, 3.3, 0, g - 2, g + 30);
    SITES.grove.coreAt = new THREE.Vector3(x - 2, g + 1.5, z + 8.5);
    SITES.grove.emberSrc = new THREE.Vector3(x, g + 30, z);
  }

  /* ---------- site: the Cliff Shrine (north-west) ---------- */
  {
    const { x, z } = SITES.shrine, g = heightAt(x, z);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      if (i === 4) continue;
      block(x + Math.cos(a) * 9, z + Math.sin(a) * 9, 1.8, 1.2, 4 + rng() * 3.5, -a, '#b9a58e', { moss: 0.7 });
    }
    block(x, z, 3, 3, 1.1, Math.PI / 4, '#8d7a66');
    SITES.shrine.coreAt = new THREE.Vector3(x, g + 2.7, z);
  }

  /* ---------- site: the Sunken Zahreh Garden (south-west) ---------- */
  let gardenWater;
  {
    const { x, z } = SITES.garden, g = heightAt(x, z);
    const basin = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.7, 6, 28), toon(0xcdb08a));
    basin.rotation.x = -Math.PI / 2; basin.position.set(x, g + 0.5, z); addOutline(basin, 0.05); scene.add(basin);
    gardenWater = new THREE.Mesh(new THREE.CircleGeometry(5, 28), new THREE.MeshToonMaterial({ color: 0x4fb6c8, emissive: 0x1a5a70, emissiveIntensity: 0.5, gradientMap: ramp() }));
    gardenWater.rotation.x = -Math.PI / 2; gardenWater.position.set(x, g + 0.55, z); scene.add(gardenWater);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      col.add(x + Math.cos(a) * 5.2, z + Math.sin(a) * 5.2, 1.5, 0.6, -a + Math.PI / 2, g - 1, g + 1.1);
    }
    column(x, z, 0.6, 3.2, { broken: true });
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      if (rng() < 0.4) continue;
      wall(x + Math.cos(a) * 20, z + Math.sin(a) * 20, x + Math.cos(a + 0.6) * 20, z + Math.sin(a + 0.6) * 20, 0.6, 2.4, { gaps: 0.3 });
    }
    SITES.garden.coreAt = new THREE.Vector3(x, g + 4.4, z);
  }

  /* ---------- stygian shards in the dust ---------- */
  const shardMat = new THREE.MeshToonMaterial({ color: 0x3a2a52, emissive: 0x7a3cff, emissiveIntensity: 0.55, gradientMap: ramp() });
  const shards = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), shardMat, 160);
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let n = 0;
    for (let i = 0; i < 400 && n < 160; i++) {
      const a = rng() * Math.PI * 2, r = rng() * 150, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x, z) > edgeRadius(x, z) - 10) continue;
      const s = 0.25 + rng() * 0.6;
      e.set((rng() - 0.5) * 0.8, rng() * 3, (rng() - 0.5) * 0.8); q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, heightAt(x, z) + s * 0.6, z), q, new THREE.Vector3(s * 0.6, s * 1.8, s * 0.6));
      shards.setMatrixAt(n++, m);
    }
    shards.count = n; shards.castShadow = true; scene.add(shards);
  }

  /* ---------- trees: autumn-gold highland trees ---------- */
  const LEAF = ['#e0a33a', '#d98a2c', '#c9612a', '#e8c04a', '#b9a23a', '#a8b04a'];
  function tree(x, z, s) {
    const g = heightAt(x, z), h = 4 + s * 3.5;
    trunks.put(x, g + h / 2 - 0.4, z, 0.35 * s, h, 0.35 * s, (rng() - 0.5) * 0.15, rng() * 6, (rng() - 0.5) * 0.15, '#6b4128');
    const lc = pick(LEAF);
    const n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const r = (1.6 + rng() * 1.3) * s;
      crowns.put(x + (rng() - 0.5) * 2.4 * s, g + h + (rng() - 0.2) * 1.8 * s, z + (rng() - 0.5) * 2.4 * s, r, r * 0.85, r, rng(), rng(), rng(), new THREE.Color(lc).offsetHSL((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.1).getStyle());
    }
    col.add(x, z, 0.35 * s, 0.35 * s, 0, g - 1, g + h);
  }
  for (let i = 0; i < 520 && trunks.mesh.count < 240; i++) {
    const a = rng() * Math.PI * 2, r = 30 + Math.sqrt(rng()) * 150, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z, -10)) continue;
    if (Math.abs(x) < 10 && z > 100) continue;
    tree(x, z, 0.8 + rng() * 0.9);
  }
  // boulders
  for (let i = 0; i < 220; i++) {
    const a = rng() * Math.PI * 2, r = rng() * 175, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) > edgeRadius(x, z) - 4 || roadDist(x, z) < 5 || Math.hypot(x - PLAZA.x, z - PLAZA.z) < 32) continue;
    const s = 0.4 + Math.pow(rng(), 3) * 2.6;
    rocks.put(x, heightAt(x, z) + s * 0.3, z, s * (1 + rng() * 0.5), s * 0.7, s, rng() * 3, rng() * 3, rng() * 3, pick(['#a98a6a', '#9a7a5c', '#b8977a', '#8b6e55']));
    if (s > 1.2) col.add(x, z, s * 0.8, s * 0.8, 0, heightAt(x, z) - 1, heightAt(x, z) + s * 0.9);
  }

  /* ---------- the dock and its pier ---------- */
  const dockZ0 = edgeRadius(0, 170) - 6;
  const pierY = 1.2, pierEnd = dockZ0 + 46;
  {
    const wood = '#8a5a36', woodD = '#5a3a24';
    for (let z = dockZ0 - 8; z < pierEnd; z += 1.6) {
      blocks.put(0, pierY - 0.2, z, 6, 0.32, 1.45, 0, (rng() - 0.5) * 0.03, 0, rng() < 0.5 ? wood : '#9a6a40');
    }
    col.add(0, (dockZ0 - 8 + pierEnd) / 2, 3, (pierEnd - dockZ0 + 8) / 2, 0, pierY - 3, pierY);
    for (let z = dockZ0 - 6; z < pierEnd; z += 6) for (const s of [-1, 1]) {
      blocks.put(s * 3.1, pierY - 6, z, 0.5, 12, 0.5, 0, 0, 0, woodD);
      blocks.put(s * 3.1, pierY + 0.6, z, 0.3, 1.2, 0.3, 0, 0, 0, woodD);
    }
    for (const s of [-1, 1]) {
      blocks.put(s * 3.1, pierY + 1.15, (dockZ0 + pierEnd) / 2, 0.18, 0.15, pierEnd - dockZ0, 0, 0, 0, woodD);
      col.add(s * 3.25, (dockZ0 + pierEnd) / 2, 0.25, (pierEnd - dockZ0) / 2, 0, pierY - 1, pierY + 1.3);
    }
    col.add(0, pierEnd + 0.3, 3.4, 0.3, 0, pierY - 1, pierY + 1.3);
  }
  const lamps = [];
  for (let z = dockZ0; z < pierEnd; z += 12) for (const s of [-1, 1]) {
    blocks.put(s * 3.1, pierY + 1.6, z, 0.25, 3.2, 0.25, 0, 0, 0, '#3e2818');
    const l = glowSprite(0xffb85a, 2.6); l.position.set(s * 3.1, pierY + 3.4, z); scene.add(l); lamps.push(l);
  }

  /* ---------- floating islets drifting near the edge ---------- */
  const islets = [];
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2, r = 215 + rng() * 140, s = 4 + rng() * 10;
    const grp = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.9, s * 0.35, 8), toon(0x9aa54c, {}));
    const bottom = new THREE.Mesh(new THREE.ConeGeometry(s * 0.92, s * 2.2, 8), toon(0xa0674a, {}));
    bottom.rotation.x = Math.PI; bottom.position.y = -s * 1.25;
    grp.add(top, bottom);
    if (rng() < 0.6) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, s * 0.8, 6), toon(0x6b4128)); t.position.y = s * 0.5; grp.add(t);
      const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(s * 0.35, 1), toon(new THREE.Color(pick(LEAF)), {})); cr.position.y = s; grp.add(cr);
    }
    outlineAll(grp, 0.12);
    grp.position.set(Math.cos(a) * r, -10 + rng() * 60, Math.sin(a) * r);
    grp.userData = { by: grp.position.y, ph: rng() * 6, sp: 0.2 + rng() * 0.3 };
    scene.add(grp); islets.push(grp);
  }

  /* ---------- waterfalls pouring off the rim ---------- */
  const fallMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
    vertexShader: `varying vec2 vUv;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime;
      #include <fog_pars_fragment>
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        float col = floor(vUv.x * 14.0);
        float streak = fract(vUv.y * 3.0 + uTime * (0.6 + h(col) * 0.5) + h(col + 3.0));
        vec3 c = mix(vec3(0.55, 0.82, 0.95), vec3(1.0), smoothstep(0.55, 1.0, streak));
        float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        float a = edge * smoothstep(0.0, 0.5, vUv.y) * 0.85;
        gl_FragColor = vec4(pow(c, vec3(2.2)), a);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
  });
  const falls = [];
  [-0.9, 2.2, 3.6].forEach(a => {
    const R = edgeRadius(Math.cos(a) * 170, Math.sin(a) * 170);
    const x = Math.cos(a) * (R - 1), z = Math.sin(a) * (R - 1), y = heightAt(x, z);
    const fg = new THREE.PlaneGeometry(8, 170, 1, 24);
    const p = fg.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = (85 - p.getY(i)) / 170; p.setZ(i, Math.pow(v, 0.6) * 18); }
    const f = new THREE.Mesh(fg, fallMat);
    f.position.set(x, y - 85 + 0.5, z); f.rotation.y = -a + Math.PI / 2;
    // spin so the curve bows outward
    f.lookAt(x * 2, y - 85, z * 2);
    scene.add(f); falls.push({ x, y, z, a });
    // the pool it pours from
    const pool = new THREE.Mesh(new THREE.CircleGeometry(5, 20), gardenWater.material);
    pool.rotation.x = -Math.PI / 2; pool.position.set(x - Math.cos(a) * 5, heightAt(x - Math.cos(a) * 5, z - Math.sin(a) * 5) + 0.2, z - Math.sin(a) * 5);
    scene.add(pool);
  });

  /* ---------- banners on tall walls ---------- */
  const banners = [];
  const bannerMat = [toon(0xa8323a, { side: THREE.DoubleSide }), toon(0x2f6f8a, { side: THREE.DoubleSide }), toon(0xc28b2c, { side: THREE.DoubleSide })];
  for (let i = 0; i < 18; i++) {
    const a = rng() * Math.PI * 2, r = 20 + rng() * 110, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z, -20)) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 7, 5), toon(0x3e2818));
    const g = heightAt(x, z); pole.position.set(x, g + 3.5, z); scene.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.4, 1, 6), pick(bannerMat));
    flag.geometry.translate(0.8, -1.7, 0);
    flag.position.set(x + 0.1, g + 6.8, z); flag.castShadow = true;
    flag.userData.ph = rng() * 6; scene.add(flag); banners.push(flag);
  }

  blocks.done(); columns.done(); trunks.done(); crowns.done(); rocks.done();

  /* ---------- grass ---------- */
  const grass = buildGrass(scene, rng, (x, z) => {
    if (Math.hypot(x, z) > edgeRadius(x, z) - 3) return false;
    if (roadDist(x, z) < 3.5) return false;
    if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < 31) return false;
    return true;
  });

  /* ---------- Zahreh flowers that heal ---------- */
  const flowers = [];
  const petal = new THREE.MeshToonMaterial({ color: 0xffb0d0, emissive: 0xff70b0, emissiveIntensity: 0.6, gradientMap: ramp() });
  const heart = new THREE.MeshToonMaterial({ color: 0xfff0a0, emissive: 0xffd060, emissiveIntensity: 0.8, gradientMap: ramp() });
  const fspots = [[-6, 120], [8, 70], [-30, 40], [40, -40], [-40, -50], [60, 10], [-70, 50], [100, 60], [70, -60], [-90, -70], [-52, 70], [-60, 92], [20, -70], [-14, 96], [110, -10], [-120, 20]];
  for (const [fx, fz] of fspots) {
    const grp = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), petal);
      const a = k / 5 * Math.PI * 2; p.position.set(Math.cos(a) * 0.3, 0.9, Math.sin(a) * 0.3); p.scale.set(1, 0.45, 1.6); p.rotation.y = -a;
      grp.add(p);
    }
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), heart); h.position.y = 0.95; grp.add(h);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 4), toon(0x5a8a3a)); stem.position.y = 0.45; grp.add(stem);
    const gl = glowSprite(0xff8ac8, 2.2, 0.6); gl.position.y = 1; grp.add(gl);
    grp.position.set(fx, heightAt(fx, fz), fz);
    scene.add(grp);
    flowers.push({ grp, x: fx, z: fz, ready: true, timer: 0 });
  }

  /* where trouble waits */
  const spawnGroups = [
    { at: [0, 92], kinds: ['punk', 'punk'] },
    { at: [-30, 46], kinds: ['punk', 'malsti', 'malsti'] },
    { at: [SITES.library.x + 4, SITES.library.z], kinds: ['punk', 'punk', 'malsti'] },
    { at: [SITES.tower.x - 10, SITES.tower.z + 8], kinds: ['punk', 'punk', 'punk'] },
    { at: [SITES.grove.x - 6, SITES.grove.z + 16], kinds: ['punk', 'malsti', 'malsti', 'malsti'] },
    { at: [SITES.shrine.x + 6, SITES.shrine.z + 12], kinds: ['punk', 'punk', 'malsti', 'malsti'] },
    { at: [SITES.garden.x + 6, SITES.garden.z - 6], kinds: ['punk', 'malsti'] },
    { at: [56, -20], kinds: ['punk', 'punk'] },
    { at: [-60, -30], kinds: ['punk', 'malsti', 'malsti'] },
    { at: [40, 100], kinds: ['punk'] },
  ];

  let time = 0;
  return {
    heightAt, col, SITES, PLAZA: { x: PLAZA.x, z: PLAZA.z, y: plazaY }, oath: { group: oath, sockets, glow: oathGlow, mat: stygMat },
    pier: { y: pierY, start: new THREE.Vector3(0, pierY, pierEnd - 6), end: pierEnd, z0: dockZ0 },
    edgeRadius, flowers, spawnGroups, falls,
    update(t, dt, particles, camPos) {
      time = t;
      fallMat.uniforms.uTime.value = t;
      grass.material.userData.shader && (grass.material.userData.shader.uniforms.uTime.value = t);
      banners.forEach(b => { b.rotation.y = Math.sin(t * 1.7 + b.userData.ph) * 0.35 + 0.5; b.rotation.x = Math.sin(t * 2.3 + b.userData.ph) * 0.05; });
      islets.forEach(g => { g.position.y = g.userData.by + Math.sin(t * g.userData.sp + g.userData.ph) * 2.5; g.rotation.y += dt * 0.01; });
      lamps.forEach((l, i) => l.material.opacity = 0.8 + Math.sin(t * 6 + i) * 0.15);
      gardenWater.material.emissiveIntensity = 0.45 + Math.sin(t * 2) * 0.1;
      flowers.forEach(f => { if (f.ready) f.grp.rotation.y = t * 0.5; });
      if (particles) {
        // embers drifting off the fire tree
        const e = SITES.grove.emberSrc;
        if (Math.random() < 0.8) particles.emit(e.x + (Math.random() - 0.5) * 22, e.y + (Math.random() - 0.5) * 8, e.z + (Math.random() - 0.5) * 22,
          { vx: (Math.random() - 0.5) * 0.8, vy: -0.6 - Math.random(), vz: (Math.random() - 0.5) * 0.8, color: Math.random() < 0.5 ? 0xff7a2a : 0xffc04a, size: 0.35, life: 6, drag: 0.2 });
        // mist at the feet of the falls
        for (const f of falls) if (Math.random() < 0.35) particles.emit(f.x + (Math.random() - 0.5) * 6, f.y - 4 - Math.random() * 30, f.z + (Math.random() - 0.5) * 6,
          { vx: Math.cos(f.a) * 1.5, vy: -2, vz: Math.sin(f.a) * 1.5, color: 0xcfe8ff, size: 3, life: 2.5, drag: 0.4 });
        // golden motes in the air near the camera
        if (camPos && Math.random() < 0.5) particles.emit(camPos.x + (Math.random() - 0.5) * 40, camPos.y + (Math.random() - 0.5) * 12, camPos.z + (Math.random() - 0.5) * 40,
          { vx: 0.4, vy: 0.15, vz: 0.1, color: 0xffe0a0, size: 0.12, life: 5, drag: 0 });
      }
    },
  };
}

function buildGrass(scene, rng, ok) {
  const N = 26000;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.09, 0, 0, 0.09, 0, 0, 0, 1, 0.02], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute([0.55, 0.55, 0.45, 0.55, 0.55, 0.45, 1.05, 1.0, 0.85], 3));
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp(), side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = { value: 0 };
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float sway = sin(uTime * 1.8 + ip.x * 0.35 + ip.z * 0.22) * 0.18 + sin(uTime * 3.1 + ip.x) * 0.05;
      transformed.x += sway * position.y; transformed.z += sway * 0.6 * position.y;`);
    mat.userData.shader = sh;
  };
  const mesh = new THREE.InstancedMesh(g, mat, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color();
  const tones = ['#a8b452', '#c4a84a', '#8ea446', '#d2b860', '#b7b04e'];
  let n = 0;
  for (let i = 0; i < N * 3 && n < N; i++) {
    const x = (rng() - 0.5) * 360, z = (rng() - 0.5) * 360;
    if (!ok(x, z)) continue;
    const clump = fbm(x * 0.06, z * 0.06, 2);
    if (clump < 0.42 && rng() < 0.7) continue;
    e.set((rng() - 0.5) * 0.4, rng() * Math.PI, (rng() - 0.5) * 0.4); q.setFromEuler(e);
    const s = 0.6 + rng() * 0.9;
    m.compose(new THREE.Vector3(x, heightAt(x, z) - 0.05, z), q, new THREE.Vector3(s, s * (0.7 + clump), s));
    mesh.setMatrixAt(n, m); mesh.setColorAt(n, cc.set(tones[Math.floor(rng() * tones.length)]));
    n++;
  }
  mesh.count = n; mesh.receiveShadow = true;
  mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  scene.add(mesh);
  return mesh;
}
