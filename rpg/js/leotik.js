/* ============================================================
   LEOTIK — the wildest and least explored of the three Tatu,
   home to more venomous and poisonous things than anyone can
   count. This isle in its south-east holds the ruins of Villtur,
   acid bogs farmed by a Sru Vorn, an Albali roost whose film has
   turned toxic, and a ruined keep with three stygian pillars —
   each inscribed "Klug" — and an Urverk that no one can wake.
   ============================================================ */
import * as THREE from 'three';
import { mulberry32, fbm, smooth, lerp, clamp } from './util.js';
import { toon, ramp, glowSprite, outlineAll, addOutline } from './gfx.js';
import { Colliders, Kit, buildGrass, STEP } from './terrain.js';
export { STEP };

const KEEP = { x: 0, z: -140 };
const KEEP_H = 9;

function edgeRadius(x, z) {
  const a = Math.atan2(z, x);
  const stretch = 1 + 0.18 * Math.cos(2 * (a - Math.PI / 2));   // longer north-south
  return (178 + (fbm(Math.cos(a) * 2.4 + 2, Math.sin(a) * 2.4 + 9, 3) - 0.5) * 46) * stretch;
}

const BOGS = [
  { x: -96, z: 6, r: 13 }, { x: -76, z: 28, r: 9 }, { x: -112, z: -18, r: 8 }, { x: -70, z: -8, r: 6 },
  { x: -120, z: 30, r: 7 }, { x: 40, z: 64, r: 6 },
];
const SITES = {
  bog: { name: 'The Acid Bogs', x: -92, z: 14 },
  villtur: { name: 'The Ruins of Villtur', x: 96, z: -4 },
  roost: { name: 'The Albali Roost', x: -78, z: -96 },
  keep: { name: 'The Keep of the Klug Pillars', x: KEEP.x, z: KEEP.z },
};

export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  let h = (fbm(x * 0.012 - 5, z * 0.012 + 3, 4) - 0.5) * 22 + (fbm(x * 0.06, z * 0.06, 2) - 0.5) * 2.6;
  // the spine rising to the keep
  h += smooth(40, -150, z) * 8 * smooth(80, 10, Math.abs(x));
  // the roost hill
  h += smooth(34, 6, Math.hypot(x - SITES.roost.x, z - SITES.roost.z)) * 10;
  // flatten the keep courtyard
  h = lerp(h, KEEP_H, smooth(40, 26, Math.hypot(x - KEEP.x, z - KEEP.z)));
  // flatten the landing
  if (z > 120 && Math.abs(x) < 30) h = lerp(h, 0.6, smooth(16, 6, Math.abs(x)) * smooth(120, 150, z));
  // the bog basin sinks
  h -= smooth(50, 20, Math.hypot(x - SITES.bog.x, z - SITES.bog.z)) * 4;
  for (const b of BOGS) h = lerp(h, Math.min(h, -2.2), smooth(b.r + 4, b.r, Math.hypot(x - b.x, z - b.z)));
  const R = edgeRadius(x, z);
  if (r > R - 10) h -= smooth(R - 10, R, r) * 3;
  if (r > R) h -= (r - R) * 5 + 4;
  return Math.max(h, -180);
}

export const CAMP = { x: -26, z: 130 };
const CLEAR = [{ x: CAMP.x, z: CAMP.z, r: 30 }, { x: 40, z: -60, r: 15 }, { x: -30, z: 70, r: 15 }, { x: 70, z: 50, r: 15 }];

const STONE = ['#7f7a6c', '#6e6a5e', '#8a8474', '#5f5c52', '#777064'];
const MOSS = ['#3f6a34', '#4a7a3a', '#2f5a2e'];
const LEAF = ['#2f6a3a', '#3a7a40', '#24583a', '#4a8a3a', '#2a5048'];

export function buildLeotik(scene) {
  const rng = mulberry32(4409);
  const pick = a => a[Math.floor(rng() * a.length)];
  const col = new Colliders(heightAt);

  /* ---------- terrain ---------- */
  const SIZE = 470, SEG = 230;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position, tcol = new Float32Array(tp.count * 3);
  const c = new THREE.Color(), gA = new THREE.Color('#3f6e38'), gB = new THREE.Color('#5a7f3a'), gC = new THREE.Color('#2c5638'),
    mud = new THREE.Color('#5a4a32'), rock = new THREE.Color('#6b6258'), rockD = new THREE.Color('#4a4038'), acidC = new THREE.Color('#7ab83a'), pave = new THREE.Color('#8a8676');
  const roads = [[0, 175, 0, 20], [0, 20, 0, -120], [0, 20, -80, 14], [0, 20, 90, -4], [-20, -60, -78, -96]];
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
    const n = fbm(x * 0.03 + 7, z * 0.03, 3), n2 = fbm(x * 0.1, z * 0.1, 2);
    c.copy(gA).lerp(gB, smooth(0.45, 0.72, n)).lerp(gC, smooth(0.5, 0.25, n2) * 0.7);
    c.lerp(mud, smooth(5, 2.5, roadDist(x, z)) * 0.75);
    c.lerp(mud, smooth(46, 26, Math.hypot(x - SITES.bog.x, z - SITES.bog.z)) * 0.5);
    for (const b of BOGS) c.lerp(acidC, smooth(b.r + 3, b.r - 1, Math.hypot(x - b.x, z - b.z)) * 0.6);
    c.lerp(pave, smooth(28, 24, Math.hypot(x - KEEP.x, z - KEEP.z)));
    if (r > R - 3) c.lerp(rock, smooth(R - 3, R + 1, r)).lerp(rockD, smooth(R + 4, R + 30, r) * (0.5 + 0.5 * Math.sin(y * 0.6)));
    tcol[i * 3] = c.r; tcol[i * 3 + 1] = c.g; tcol[i * 3 + 2] = c.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, toon(0xffffff, { vertexColors: true }));
  terrain.receiveShadow = true; scene.add(terrain);

  /* the rock root beneath the isle */
  {
    const A = 96, RINGS = 16, pos = [], cols = [], idx = [];
    const strata = ['#5a524a', '#4a443c', '#6b6054', '#3c3630', '#56584a'].map(s => new THREE.Color(s));
    for (let k = 0; k <= RINGS; k++) {
      const t = k / RINGS, y = -8 - Math.pow(t, 1.25) * 320;
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
    for (let k = 0; k < RINGS; k++) for (let j = 0; j < A; j++) { const a = k * (A + 1) + j, b = a + A + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setIndex(idx); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide })));
  }

  /* ---------- kits ---------- */
  const blocks = new Kit(scene, new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 3000);
  const trunks = new Kit(scene, new THREE.CylinderGeometry(0.7, 1, 1, 7), toon(0xffffff), 500);
  const crowns = new Kit(scene, new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), 2400);
  const fronds = new Kit(scene, new THREE.ConeGeometry(1, 1, 4, 1, true), toon(0xffffff, { side: THREE.DoubleSide }), 2000, false);
  const shrooms = new Kit(scene, new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshToonMaterial({ color: 0xffffff, emissive: 0x2a4a6a, emissiveIntensity: 0.7, gradientMap: ramp() }), 400, false);
  const stems = new Kit(scene, new THREE.CylinderGeometry(1, 1, 1, 6), toon(0xe8e0d0), 400, false);
  const rocks = new Kit(scene, new THREE.DodecahedronGeometry(1, 0), toon(0xffffff), 400);

  function block(x, z, w, d, h, ang = 0, color, opts = {}) {
    const g = opts.base ?? Math.min(heightAt(x - w / 2, z - d / 2), heightAt(x + w / 2, z + d / 2), heightAt(x - w / 2, z + d / 2), heightAt(x + w / 2, z - d / 2), heightAt(x, z));
    const bot = g - (opts.sink ?? 1.2), top = (opts.base ?? heightAt(x, z)) + h;
    blocks.put(x, (bot + top) / 2, z, w, top - bot, d, 0, ang, 0, color || pick(STONE));
    if (rng() < (opts.moss ?? 0.6)) blocks.put(x, top + 0.08, z, w * 1.05, 0.22, d * 1.05, 0, ang, 0, pick(MOSS));
    if (!opts.noCol) col.add(x, z, w / 2, d / 2, ang, bot, top);
    return top;
  }
  function wall(ax, az, bx, bz, hMin, hMax, opts = {}) {
    const len = Math.hypot(bx - ax, bz - az), ang = -Math.atan2(bz - az, bx - ax);
    const n = Math.max(1, Math.round(len / 2.6)), seg = len / n;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      if (opts.door != null && Math.abs(t - opts.door) < 1.8 / len) continue;
      if (rng() < (opts.gaps ?? 0.2)) continue;
      block(ax + (bx - ax) * t, az + (bz - az) * t, seg + 0.02, opts.thick ?? 1.1, hMin + Math.pow(rng(), 1.3) * (hMax - hMin), ang, null, { moss: 0.7 });
    }
  }
  function ruin(cx, cz, w, d, hMax, rot) {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const P = (lx, lz) => [cx + lx * cs + lz * sn, cz - lx * sn + lz * cs];
    const k = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
    const door = Math.floor(rng() * 4);
    for (let s = 0; s < 4; s++) wall(k[s][0], k[s][1], k[(s + 1) % 4][0], k[(s + 1) % 4][1], 0.8, hMax, { door: s === door ? 0.5 : null, gaps: 0.25 });
  }
  const keepOut = (x, z, extra = 0) => {
    if (CLEAR.some(c => Math.hypot(x - c.x, z - c.z) < c.r + extra)) return true;
    for (const k in SITES) if (Math.hypot(x - SITES[k].x, z - SITES[k].z) < 30 + extra) return true;
    if (roadDist(x, z) < 7 + extra) return true;
    if (Math.hypot(x, z) > edgeRadius(x, z) - 14) return true;
    for (const b of BOGS) if (Math.hypot(x - b.x, z - b.z) < b.r + 3) return true;
    return false;
  };

  /* ---------- the jungle ---------- */
  function jungleTree(x, z, s) {
    const g = heightAt(x, z), h = 9 + s * 9;
    trunks.put(x, g + h / 2 - 0.5, z, 0.5 * s, h, 0.5 * s, (rng() - 0.5) * 0.1, rng() * 6, (rng() - 0.5) * 0.1, pick(['#4a3a2a', '#3a3026', '#5a4630']));
    const lc = pick(LEAF);
    for (let k = 0; k < 4 + Math.floor(rng() * 3); k++) {
      const r = (2.4 + rng() * 2) * s;
      crowns.put(x + (rng() - 0.5) * 4 * s, g + h + (rng() - 0.3) * 2.2 * s, z + (rng() - 0.5) * 4 * s, r, r * 0.55, r, rng(), rng(), rng(), new THREE.Color(lc).offsetHSL((rng() - 0.5) * 0.05, 0, (rng() - 0.5) * 0.1).getStyle());
    }
    // hanging vines
    for (let k = 0; k < 3; k++) {
      const vl = 3 + rng() * 5;
      blocks.put(x + (rng() - 0.5) * 5 * s, g + h - vl / 2, z + (rng() - 0.5) * 5 * s, 0.08, vl, 0.08, 0, 0, 0, '#2f5a2a');
    }
    col.add(x, z, 0.5 * s, 0.5 * s, 0, g - 1, g + h);
  }
  function fern(x, z, s) {
    const g = heightAt(x, z);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 + rng();
      fronds.put(x + Math.cos(a) * 0.5 * s, g + 0.6 * s, z + Math.sin(a) * 0.5 * s, 0.35 * s, 1.8 * s, 0.05 * s, Math.cos(a) * 1.0, 0, -Math.sin(a) * 1.0, pick(['#3f7a3a', '#2f6a34', '#5a8a3a']));
    }
  }
  function mushroom(x, z, s, color) {
    const g = heightAt(x, z);
    stems.put(x, g + s * 0.6, z, s * 0.12, s * 1.2, s * 0.12, 0, 0, 0, '#d8d0c0');
    shrooms.put(x, g + s * 1.15, z, s * 0.6, s * 0.4, s * 0.6, 0, 0, 0, color);
  }
  for (let i = 0; i < 900 && trunks.mesh.count < 300; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 190, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z, -6)) continue;
    jungleTree(x, z, 0.8 + rng() * 0.8);
  }
  for (let i = 0; i < 900; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 190, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) > edgeRadius(x, z) - 6 || roadDist(x, z) < 3) continue;
    if (rng() < 0.75) fern(x, z, 0.8 + rng() * 1.2);
    else mushroom(x, z, 0.6 + rng() * 1.8, pick(['#4ad8e0', '#b070ff', '#7aff8a', '#4a9aff']));
  }
  for (let i = 0; i < 160; i++) {
    const a = rng() * Math.PI * 2, r = rng() * 180, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) > edgeRadius(x, z) - 4 || roadDist(x, z) < 5 || CLEAR.some(c => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    const s = 0.5 + Math.pow(rng(), 3) * 3;
    rocks.put(x, heightAt(x, z) + s * 0.3, z, s * (1 + rng() * 0.5), s * 0.7, s, rng() * 3, rng() * 3, rng() * 3, pick(STONE));
    if (s > 1.2) col.add(x, z, s * 0.8, s * 0.8, 0, heightAt(x, z) - 1, heightAt(x, z) + s * 0.9);
  }

  /* ---------- acid bogs ---------- */
  const bogMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
    vertexShader: `varying vec2 vP;
      #include <fog_pars_vertex>
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `varying vec2 vP; uniform float uTime;
      #include <fog_pars_fragment>
      void main(){
        float w = sin(vP.x * 0.6 + uTime * 1.3) * sin(vP.y * 0.5 - uTime) * 0.5 + 0.5;
        vec3 c = mix(vec3(0.35, 0.62, 0.12), vec3(0.75, 1.0, 0.35), w * w);
        gl_FragColor = vec4(pow(c, vec3(2.2)) * 1.6, 1.0);
        #include <fog_fragment>
      }`,
    fog: true,
  });
  const hazards = [];
  for (const b of BOGS) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(b.r + 1, 32), bogMat);
    m.rotation.x = -Math.PI / 2; m.position.set(b.x, -1.7, b.z); scene.add(m);
    hazards.push({ x: b.x, z: b.z, r: b.r, y: -1.7, dps: 9, poison: 3, kind: 'acid' });
  }

  /* ---------- the Ruins of Villtur (east) ---------- */
  {
    const { x, z } = SITES.villtur;
    for (let i = 0; i < 7; i++) {
      const a = rng() * Math.PI * 2, r = 8 + rng() * 22;
      ruin(x + Math.cos(a) * r, z + Math.sin(a) * r, 6 + rng() * 6, 6 + rng() * 6, 2 + rng() * 4, rng() < 0.5 ? 0 : Math.PI / 2);
    }
    // a broken tower
    block(x - 4, z - 12, 6, 6, 11, 0, '#6e6a5e', { moss: 1 });
  }
  // scattered ruins in the wilds
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2, r = 30 + rng() * 140, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepOut(x, z, 4)) continue;
    ruin(x, z, 5 + rng() * 5, 5 + rng() * 5, 1.5 + rng() * 3, rng() * Math.PI);
  }

  /* ---------- the Keep and the Urverk (north) ---------- */
  const kg = KEEP_H;
  const keepDisk = new THREE.Mesh(new THREE.CylinderGeometry(28, 29, 0.6, 48), toon(0x8a8676));
  keepDisk.position.set(KEEP.x, kg - 0.22, KEEP.z); keepDisk.receiveShadow = true; scene.add(keepDisk);
  for (let i = 0; i < 40; i++) {
    const a0 = i / 40 * Math.PI * 2, a1 = (i + 1) / 40 * Math.PI * 2, R = 31;
    const mid = (a0 + a1) / 2;
    if (Math.abs(Math.sin(mid)) > 0.97 && Math.sin(mid) > 0) continue;   // the gate, facing south
    if (rng() < 0.22) continue;
    wall(KEEP.x + Math.cos(a0) * R, KEEP.z + Math.sin(a0) * R, KEEP.x + Math.cos(a1) * R, KEEP.z + Math.sin(a1) * R, 3, 9, { thick: 2.4, gaps: 0.05 });
  }
  // the Urverk: a ring of stygian standing on its edge
  const urverk = new THREE.Group();
  const ringMat = new THREE.MeshToonMaterial({ color: 0x2a2236, emissive: 0x6a2cff, emissiveIntensity: 0.2, gradientMap: ramp() });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.9, 10, 40), ringMat); ring.position.y = 7; addOutline(ring, 0.1); urverk.add(ring);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    const knob = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), ringMat); knob.position.set(Math.cos(a) * 6, 7 + Math.sin(a) * 6, 0); urverk.add(knob);
  }
  const portalMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uOn;
      void main(){
        vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
        float sw = sin(a * 5.0 + r * 12.0 - uTime * 3.0) * 0.5 + 0.5;
        vec3 c = mix(vec3(0.25, 0.05, 0.45), vec3(0.85, 0.6, 1.0), sw * (1.0 - r));
        gl_FragColor = vec4(pow(c, vec3(2.2)) * 2.0, (1.0 - smoothstep(0.85, 1.0, r)) * uOn * 0.9);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const portal = new THREE.Mesh(new THREE.CircleGeometry(5.3, 40), portalMat); portal.position.y = 7; urverk.add(portal);
  const base = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 4), toon(0x5a5650)); base.position.y = 0.3; addOutline(base, 0.06); urverk.add(base);
  urverk.position.set(KEEP.x, kg, KEEP.z - 18);
  scene.add(urverk);
  col.add(KEEP.x, KEEP.z - 18, 7, 2, 0, kg - 1, kg + 13);

  /* ---------- the three Klug pillars ---------- */
  const klugTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 512;
    const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 128, 512);
    g.fillStyle = '#c690ff'; g.font = 'bold 34px Georgia'; g.textAlign = 'center';
    for (let y = 70; y < 512; y += 150) { g.save(); g.translate(64, y); g.fillText('KLUG', 0, 0); g.restore(); }
    g.strokeStyle = '#8a5aff'; g.lineWidth = 3;
    for (let y = 20; y < 512; y += 40) { g.beginPath(); g.moveTo(20, y); g.lineTo(108, y + 8); g.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const pillars = [];
  const pillarSpots = [
    { key: 'bog', x: SITES.bog.x + 2, z: SITES.bog.z - 16 },
    { key: 'villtur', x: SITES.villtur.x + 6, z: SITES.villtur.z + 4 },
    { key: 'roost', x: SITES.roost.x, z: SITES.roost.z },
  ];
  for (const ps of pillarSpots) {
    const g = heightAt(ps.x, ps.z);
    const m = new THREE.MeshToonMaterial({ color: 0x2a2236, emissive: 0xffffff, emissiveMap: klugTex, emissiveIntensity: 0.15, gradientMap: ramp() });
    const grp = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.7, 12, 6), m); p.position.y = 6; addOutline(p, 0.08); grp.add(p);
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), m); tip.position.y = 12.8; addOutline(tip, 0.06); grp.add(tip);
    const glow = glowSprite(0xb48aff, 9, 0.0); glow.position.y = 9; grp.add(glow);
    grp.position.set(ps.x, g - 0.3, ps.z); scene.add(grp);
    col.add(ps.x, ps.z, 1.6, 1.6, 0, g - 1, g + 13);
    pillars.push({ key: ps.key, x: ps.x, z: ps.z, y: g, mat: m, glow, woken: false });
  }

  /* ---------- the landing pier ---------- */
  const dockZ0 = edgeRadius(0, 170) - 6;
  const pierY = 1.2, pierEnd = dockZ0 + 46;
  {
    const wood = '#6a4a30', woodD = '#4a3020';
    for (let z = dockZ0 - 8; z < pierEnd; z += 1.6) blocks.put(0, pierY - 0.2, z, 6, 0.32, 1.45, 0, (rng() - 0.5) * 0.03, 0, rng() < 0.5 ? wood : '#7a5634');
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

  /* ---------- floating islets ---------- */
  const islets = [];
  for (let i = 0; i < 12; i++) {
    const a = rng() * Math.PI * 2, r = 230 + rng() * 150, s = 4 + rng() * 10;
    const grp = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.9, s * 0.35, 8), toon(0x3f6e38));
    const bottom = new THREE.Mesh(new THREE.ConeGeometry(s * 0.92, s * 2.2, 8), toon(0x5a524a));
    bottom.rotation.x = Math.PI; bottom.position.y = -s * 1.25;
    grp.add(top, bottom); outlineAll(grp, 0.12);
    grp.position.set(Math.cos(a) * r, -10 + rng() * 60, Math.sin(a) * r);
    grp.userData = { by: grp.position.y, ph: rng() * 6, sp: 0.2 + rng() * 0.3 };
    scene.add(grp); islets.push(grp);
  }

  blocks.done(); trunks.done(); crowns.done(); fronds.done(); shrooms.done(); stems.done(); rocks.done();
  const grass = buildGrass(scene, rng, (x, z) => {
    if (Math.hypot(x, z) > edgeRadius(x, z) - 3 || roadDist(x, z) < 3) return false;
    for (const b of BOGS) if (Math.hypot(x - b.x, z - b.z) < b.r + 1) return false;
    return Math.hypot(x - KEEP.x, z - KEEP.z) > 29;
  }, heightAt, ['#3f7a3a', '#4f8a3a', '#2f6a34', '#5a8a40', '#3a6a40'], 30000);

  /* ---------- healing Zahreh (rarer here) ---------- */
  const flowers = [];
  const petal = new THREE.MeshToonMaterial({ color: 0xffb0d0, emissive: 0xff70b0, emissiveIntensity: 0.6, gradientMap: ramp() });
  for (const [fx, fz] of [[6, 110], [-20, 60], [30, 30], [-50, 40], [60, -20], [-40, -40], [20, -80], [-100, -60], [110, 30], [70, 60], [-60, 90]]) {
    const grp = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), petal);
      const a = k / 5 * Math.PI * 2; p.position.set(Math.cos(a) * 0.3, 0.9, Math.sin(a) * 0.3); p.scale.set(1, 0.45, 1.6); p.rotation.y = -a; grp.add(p);
    }
    const gl = glowSprite(0xff8ac8, 2.2, 0.6); gl.position.y = 1; grp.add(gl);
    grp.position.set(fx, heightAt(fx, fz), fz); scene.add(grp);
    flowers.push({ grp, x: fx, z: fz, ready: true, timer: 0 });
  }

  const lanterns = [
    { id: 'l_pier', name: 'The Landing', x: 5, z: dockZ0 - 10 },
    { id: 'l_cross', name: 'The Crossroads', x: 6, z: 22 },
    { id: 'l_bog', name: 'The Bog Edge', x: -58, z: 22 },
    { id: 'l_villtur', name: 'Villtur Gate', x: 64, z: 4 },
    { id: 'l_keep', name: 'Below the Keep', x: 6, z: -100 },
  ];
  const stones = [
    { key: 'l_villtur', x: 84, z: 10 }, { key: 'l_bogs', x: -60, z: 6 }, { key: 'l_roost', x: -60, z: -80 }, { key: 'l_keep', x: -10, z: -118 },
  ];

  const spawnGroups = [
    { at: [-6, 96], kinds: ['tyndael', 'tyndael'] },
    { at: [20, 60], kinds: ['rodak', 'rodak', 'rodak'] },
    { at: [-30, 50], kinds: ['kipsu', 'kipsu', 'kipsu', 'kipsu'] },
    { at: [-80, 30], kinds: ['tyndael', 'malsti', 'malsti'] },
    { at: [-100, -4], kinds: ['sruvorn'], unique: 'sruvorn' },
    { at: [-64, -10], kinds: ['punk', 'punk', 'tyndael'] },
    { at: [80, 8], kinds: ['rodak', 'rodak', 'rodak', 'rodak'] },
    { at: [100, -10], kinds: ['vel'], unique: 'vel_villtur' },
    { at: [104, 10], kinds: ['punk', 'punk', 'malsti', 'malsti'] },
    { at: [60, -40], kinds: ['tyndael', 'tyndael', 'punk'] },
    { at: [-70, -86], kinds: ['albali_t', 'albali_t', 'albali_t'] },
    { at: [-86, -104], kinds: ['albali_t', 'tyndael', 'tyndael'] },
    { at: [-30, -70], kinds: ['rodak', 'rodak', 'rodak'] },
    { at: [0, -112], kinds: ['vel', 'malsti', 'malsti'], unique: 'vel_keep' },
    { at: [30, -110], kinds: ['punk', 'punk', 'tyndael'] },
    { at: [-60, 100], kinds: ['kipsu', 'kipsu'] },
    // friendly Kipsu families, and three lost pups crying in the rain
    { at: [30, 120], kinds: ['kipsu_f', 'kipsu_f', 'kipsu_f'] },
    { at: [110, -40], kinds: ['kipsu_f'], unique: 'pup_1', extra: { pup: 1, scale: 0.5 } },
    { at: [-110, -40], kinds: ['kipsu_f'], unique: 'pup_2', extra: { pup: 2, scale: 0.5 } },
    { at: [20, -40], kinds: ['kipsu_f'], unique: 'pup_3', extra: { pup: 3, scale: 0.5 } },
    { at: [50, 100], kinds: ['albali_t', 'albali_t'] },
  ];

  return {
    board: { x: CAMP.x + 9, z: CAMP.z + 9 },
    name: 'leotik', camp: CAMP, heightAt, col, SITES, PLAZA: { x: KEEP.x, z: KEEP.z, y: kg }, urverk: { group: urverk, ringMat, portalMat },
    pier: { y: pierY, start: new THREE.Vector3(0, pierY, pierEnd - 6), end: pierEnd, z0: dockZ0 },
    edgeRadius, flowers, spawnGroups, hazards, pillars, lanterns, stones, falls: [],
    update(t, dt, particles, camPos) {
      bogMat.uniforms.uTime.value = t; portalMat.uniforms.uTime.value = t;
      grass.material.userData.shader && (grass.material.userData.shader.uniforms.uTime.value = t);
      islets.forEach(g => { g.position.y = g.userData.by + Math.sin(t * g.userData.sp + g.userData.ph) * 2.5; });
      flowers.forEach(f => { if (f.ready) f.grp.rotation.y = t * 0.5; });
      pillars.forEach(p => { if (p.woken) { p.glow.material.opacity = 0.5 + Math.sin(t * 3) * 0.15; p.mat.emissiveIntensity = 0.9; } });
      if (particles) {
        for (const b of BOGS) if (Math.random() < 0.25) {
          const a = Math.random() * 6.28, r = Math.random() * b.r;
          particles.emit(b.x + Math.cos(a) * r, -1.5, b.z + Math.sin(a) * r, { vx: 0, vy: 1 + Math.random(), vz: 0, color: 0xb0ff4a, size: 0.6, life: 1.2, drag: 0.5 });
        }
        if (camPos) for (let k = 0; k < 6; k++) {
          // rain
          particles.emit(camPos.x + (Math.random() - 0.5) * 50, camPos.y + 18, camPos.z + (Math.random() - 0.5) * 50,
            { vx: -2, vy: -38, vz: 1, color: 0x9ab8c8, size: 0.09, life: 0.9, drag: 0 });
        }
      }
    },
  };
}
