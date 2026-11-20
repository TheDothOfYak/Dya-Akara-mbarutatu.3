/* ============================================================
   Shared building blocks for every region: collision (oriented
   boxes in a spatial grid), instanced "kits" of repeated shapes,
   and wind-swayed grass.
   ============================================================ */
import * as THREE from 'three';
import { fbm, clamp } from './util.js';
import { ramp } from './gfx.js';
import { noSolid } from './solid.js';

export const STEP = 0.6;           // how high a step you can walk up

export class Colliders {
  constructor(heightAt) { this.heightAt = heightAt; this.list = []; this.grid = new Map(); this.cell = 12; }
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
    const i = this.list.indexOf(o); if (i >= 0) this.list.splice(i, 1);
    const R = Math.hypot(o.hw, o.hd), C = this.cell;   // only the cells it was filed in
    for (let cx = Math.floor((o.x - R) / C); cx <= Math.floor((o.x + R) / C); cx++)
      for (let cz = Math.floor((o.z - R) / C); cz <= Math.floor((o.z + R) / C); cz++) {
        const arr = this.grid.get(cx + ',' + cz); if (!arr) continue;
        const j = arr.indexOf(o); if (j >= 0) arr.splice(j, 1);
      }
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
  /* folk (townsfolk, companions, beasts, foes) pass hand = true: they keep to the colliders the regions
     placed by hand, as they always have, and leave the rest (solid.js's: barrels, benches, boughs) to you */
  ground(x, z, feetY, hand = false) {
    let g = this.heightAt(x, z);
    for (const o of this.near(x, z)) {
      if (o.top > feetY + STEP || o.top <= g || (hand && o.auto)) continue;
      const dx = x - o.x, dz = z - o.z;
      const lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
      if (Math.abs(lx) <= o.hw + 0.05 && Math.abs(lz) <= o.hd + 0.05) g = o.top;
    }
    return g;
  }
  /* push a standing cylinder (feet at y, height hgt) out of anything too tall to step on */
  resolve(p, rad, hgt = 1.8, hand = false) {
    for (const o of this.nearAll(p.x, p.z, rad + 1)) {
      if (p.y >= o.top - STEP || p.y + hgt <= o.bot || (hand && o.auto)) continue;
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

export class Kit {
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
    this.mesh.boundingSphere = null;   // re-measured when next drawn: a kit added to after done() must not be culled by its old size
    this.e.set(rx, ry, rz); this.q.setFromEuler(this.e);
    this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(sx, sy, sz));
    this.mesh.setMatrixAt(i, this.m);
    this.mesh.setColorAt(i, this.c.set(color));
    return i;
  }
  done() { this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; this.mesh.computeBoundingSphere(); }
}

export function buildGrass(scene, rng, ok, heightAt, tones = ['#a8b452', '#c4a84a', '#8ea446', '#d2b860', '#b7b04e'], N = 26000, cx = 0, cz = 0, span = 360) {
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
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize(vNormal);');   // lit as the ground is, from either side
    mat.userData.shader = sh;
  };
  const mesh = new THREE.InstancedMesh(g, mat, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color();
  let n = 0;
  for (let i = 0; i < N * 3 && n < N; i++) {
    const x = cx + (rng() - 0.5) * span, z = cz + (rng() - 0.5) * span;
    if (!ok(x, z)) continue;
    const clump = fbm(x * 0.06, z * 0.06, 2);
    if (clump < 0.42 && rng() < 0.7) continue;
    e.set((rng() - 0.5) * 0.4, rng() * Math.PI, (rng() - 0.5) * 0.4); q.setFromEuler(e);
    const s = 0.6 + rng() * 0.9;
    m.compose(new THREE.Vector3(x, heightAt(x, z) - 0.05, z), q, new THREE.Vector3(s * 0.8, s * (0.7 + clump) * 0.62, s * 0.8));
    mesh.setMatrixAt(n, m); mesh.setColorAt(n, cc.set(tones[Math.floor(rng() * tones.length)]));
    n++;
  }
  mesh.count = n; mesh.receiveShadow = true; noSolid(mesh);   // you walk through grass
  mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  scene.add(mesh);
  buildMeadow(scene, ok, heightAt, tones);
  return mesh;
}

/* ------------------------------------------------------------------
   The meadow underfoot. The tufts above are scattered thin over the
   whole region, enough for far country; this is the grass you are
   standing in: thick, blade by blade, wherever the region's own rule
   says grass grows. It is laid in squares round the camera as you go
   (a few squares a frame, reusing the ones left behind), thins away
   with distance so it never ends at an edge, rolls in the wind in long
   waves, and parts round whoever walks through it (MEADOW.who).
   ------------------------------------------------------------------ */
export const MEADOW = { who: new THREE.Vector3(0, -9999, 0), on: true };
function buildMeadow(scene, ok, heightAt, tones) {
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const C = 9, RAD = coarse ? 2 : 3, PER = coarse ? 420 : 1500, FAR = (RAD + 0.5) * C - 2, LOAD = RAD + 1;   // squares are laid a ring further out than the grass reaches, so none ever pops up in sight
  // one blade: three tapering lengths, bowed over a little at the top; dark at the root, bright at the tip
  const g = new THREE.BufferGeometry();
  {
    const P = [], Cc = [], I = [], hs = [0, 0.38, 0.72, 1], ws = [0.055, 0.046, 0.028, 0], bow = [0, 0.03, 0.11, 0.24], sh = [0.74, 0.9, 1.06, 1.2];
    for (let k = 0; k < 3; k++) { P.push(-ws[k], hs[k], bow[k], ws[k], hs[k], bow[k]); Cc.push(sh[k], sh[k], sh[k], sh[k], sh[k], sh[k]); }
    P.push(0, 1, bow[3]); Cc.push(sh[3], sh[3], sh[3] * 0.96);
    I.push(0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6);
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(21).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
    g.setIndex(I);
  }
  const U = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uWho: { value: MEADOW.who }, uFar: { value: FAR } };
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp(), side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'uniform float uTime; uniform vec3 uCam; uniform vec3 uWho; uniform float uFar;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 mwp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float mk = 1.0 - smoothstep(uFar * 0.55, uFar, distance(mwp.xz, uCam.xz));       // thins away with distance
      vec4 mvPosition = instanceMatrix * vec4(transformed * vec3(1.0, mk, 1.0), 1.0);
      float mh = position.y * position.y * mk;
      float gust = sin(uTime * 1.1 + mwp.x * 0.09 + mwp.z * 0.06) * 0.5 + 0.5;          // long waves crossing the field
      float sway = sin(uTime * 2.3 + mwp.x * 0.8 + mwp.z * 0.55) * 0.05 + gust * 0.2 + sin(uTime * 5.1 + mwp.x * 2.1) * 0.02 * gust;
      mvPosition.x += sway * mh; mvPosition.z += sway * 0.6 * mh;
      vec2 md = mwp.xz - uWho.xz; float ml = length(md);
      float press = (1.0 - smoothstep(0.25, 1.25, ml)) * (1.0 - smoothstep(0.5, 2.5, abs(mwp.y - uWho.y)));
      mvPosition.xz += md / max(ml, 0.05) * press * 0.45 * position.y; mvPosition.y -= press * 0.3 * position.y;   // parted and trodden
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`);
    // lit as the ground it grows from is, whichever side of the blade you see
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize(vNormal);');
  };
  mat.customProgramCacheKey = () => 'meadow';
  const cols = tones.map(t => new THREE.Color(t));
  const hash = (x, z, k) => { let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(z | 0, 0x165667b1) ^ Math.imul(k | 0, 0x9e3779b1); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const pool = [], live = new Map();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), cc = new THREE.Color();
  const group = noSolid(new THREE.Group()); scene.add(group);
  function fill(mesh, cx, cz) {
    let n = 0; const fl = mesh.userData.fl = [];
    for (let i = 0; i < PER; i++) {
      const x = (cx + hash(cx, cz, i * 3 + 1)) * C, z = (cz + hash(cx, cz, i * 3 + 2)) * C;
      if (!ok(x, z)) continue;
      const clump = fbm(x * 0.06, z * 0.06, 2), r = hash(cx, cz, i * 3 + 3);
      if (clump < 0.36 && r < 0.55) continue;                                         // thinner in the bare patches
      const patch = fbm(x * 0.21 + 40, z * 0.21 - 17, 2);
      e.set((hash(cx, cz, i + 20000) - 0.5) * 0.5, r * 6.283, (hash(cx, cz, i + 40000) - 0.5) * 0.5); q.setFromEuler(e);
      const w = 0.5 + hash(cz, cx, i + 7777) * 0.55, h = (0.22 + clump * 0.36 + patch * 0.26) * (0.7 + r * 0.6);
      m4.compose(v.set(x, heightAt(x, z) - 0.03, z), q, sc.set(w, h, w));
      mesh.setMatrixAt(n, m4);
      cc.copy(cols[Math.floor(hash(cx, cz, i + 60000) * cols.length) % cols.length]).multiplyScalar(0.86 + patch * 0.3);
      mesh.setColorAt(n, cc);
      n++;
      if (patch > 0.42 && hash(cx, cz, i + 90000) < 0.035) fl.push([x, heightAt(x, z) - 0.03 + h * (0.85 + hash(cx, cz, i + 91000) * 0.3), z, hash(cx, cz, i + 92000)]);   // wildflowers where the grass is lush
    }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.boundingSphere = mesh.boundingSphere || new THREE.Sphere();
    mesh.boundingSphere.center.set((cx + 0.5) * C, heightAt((cx + 0.5) * C, (cz + 0.5) * C), (cz + 0.5) * C); mesh.boundingSphere.radius = C * 1.2 + 6;
    mesh.visible = n > 0;
  }
  function take() {
    if (pool.length) return pool.pop();
    const mesh = new THREE.InstancedMesh(g, mat, PER);
    mesh.receiveShadow = true; mesh.castShadow = false; mesh.setColorAt(0, cc.set(0xffffff));
    group.add(mesh); return mesh;
  }
  /* the wildflowers: one draw for every head and one for every stem, re-laid whenever the squares change */
  const FN = 2400, FCOL = [0xf2d24a, 0xffffff, 0xe86a8a, 0xb48ae8, 0xf0903a, 0x8ab8ff].map(c => new THREE.Color(c));
  const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshToonMaterial({ gradientMap: ramp() }), FN), stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.009, 1, 3).translate(0, -0.5, 0), new THREE.MeshToonMaterial({ color: 0x5a8a3a, gradientMap: ramp() }), FN);
  heads.userData.keepFacets = true; stems.userData.keepFacets = true; heads.count = stems.count = 0; heads.frustumCulled = stems.frustumCulled = false;
  group.add(heads, stems);
  function relayFlowers() {
    let n = 0; const m = new THREE.Matrix4(), sc = new THREE.Vector3(), q = new THREE.Quaternion(), p = new THREE.Vector3();
    for (const c of live.values()) for (const [x, y, z, r] of c.mesh.userData.fl || []) {
      if (n >= FN) break;
      const s = 0.05 + r * 0.04; m.compose(p.set(x, y, z), q, sc.set(s, s * 0.5, s)); heads.setMatrixAt(n, m); heads.setColorAt(n, FCOL[Math.floor(r * 97) % FCOL.length]);
      m.compose(p, q, sc.set(1, y - heightAt(x, z) + 0.03, 1)); stems.setMatrixAt(n, m); n++;
    }
    heads.count = stems.count = n; heads.instanceMatrix.needsUpdate = stems.instanceMatrix.needsUpdate = true; if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  }
  // a thing that is always drawn, so the meadow hears about every frame and knows where the camera is
  const tick = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3)), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
  tick.frustumCulled = false; tick.userData.noOutline = true; group.add(tick);
  /* butterflies over the meadow by day: a dozen or so drifting about ahead of you, wings beating, settling now and then */
  const BN = coarse ? 8 : 16, wingG = new THREE.PlaneGeometry(0.26, 0.2).translate(0.13, 0, 0);
  const bfly = new THREE.InstancedMesh(wingG, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: true }), BN * 2); bfly.frustumCulled = false; bfly.userData.noOutline = true; group.add(bfly);
  const BC = [0xf2c84a, 0xffffff, 0xf08a3a, 0x8ac0ff, 0xd890e8], bs = [];
  for (let i = 0; i < BN; i++) { bs.push({ p: new THREE.Vector3(0, -999, 0), v: new THREE.Vector3(), ph: Math.random() * 9, rest: 0 }); const c = new THREE.Color(BC[i % BC.length]); bfly.setColorAt(i * 2, c); bfly.setColorAt(i * 2 + 1, c); }
  const bm = new THREE.Matrix4(), bq = new THREE.Quaternion(), be = new THREE.Euler(0, 0, 0, 'YXZ'), bS = new THREE.Vector3(1, 1, 1), bfog = new THREE.Color();
  let lastT = 0;
  function butterflies(camera, scene, t) {
    const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
    const day = !scene.fog || (bfog.copy(scene.fog.color), 0.3 * bfog.r + 0.59 * bfog.g + 0.11 * bfog.b) > 0.35;
    bfly.visible = day && MEADOW.on;
    if (!bfly.visible) return;
    for (let i = 0; i < BN; i++) {
      const b = bs[i], d = Math.hypot(b.p.x - fwd.x, b.p.z - fwd.z);
      if (d > 26 || b.p.y < -900) {   // gone too far: a new one, somewhere over grass ahead
        b.p.y = -999; b.v.set(0, 0, 0);
        for (let k = 0; k < 6; k++) { const a = Math.random() * 6.283, r = 4 + Math.random() * 18, x = fwd.x + Math.cos(a) * r, z = fwd.z + Math.sin(a) * r; if (ok(x, z)) { b.p.set(x, heightAt(x, z) + 0.4 + Math.random() * 1.2, z); break; } }
      }
      if (b.p.y < -900) { bm.makeScale(0, 0, 0); bfly.setMatrixAt(i * 2, bm); bfly.setMatrixAt(i * 2 + 1, bm); continue; }   // no grass near enough for this one just now
      b.ph += dt * (b.rest > 0 ? 3 : 22);
      if (b.rest > 0) b.rest -= dt;
      else {
        b.v.x += (Math.sin(t * 0.7 + i * 3) * 1.4 - b.v.x) * dt * 1.5 + (Math.random() - 0.5) * 6 * dt; b.v.z += (Math.cos(t * 0.6 + i * 5) * 1.4 - b.v.z) * dt * 1.5 + (Math.random() - 0.5) * 6 * dt;
        const gy = heightAt(b.p.x, b.p.z); b.v.y += ((gy + 0.6 + Math.sin(t * 1.3 + i) * 0.4 - b.p.y) * 2 - b.v.y) * dt * 2;
        b.p.addScaledVector(b.v, dt);
        if (Math.random() < dt * 0.08 && b.p.y - gy < 0.8) { b.rest = 1.5 + Math.random() * 3; b.p.y = gy + 0.32; }   // settles on a grass head for a moment
      }
      const flap = Math.sin(b.ph) * (b.rest > 0 ? 0.35 : 1.1), yaw = Math.atan2(b.v.x, b.v.z);
      for (const sgn of [-1, 1]) {
        be.set(0, yaw + Math.PI / 2 * sgn + Math.PI / 2, sgn * (0.3 + flap)); bq.setFromEuler(be);
        bm.compose(b.p, bq, bS); bfly.setMatrixAt(i * 2 + (sgn > 0 ? 1 : 0), bm);
      }
    }
    bfly.instanceMatrix.needsUpdate = true;
  }
  const fwd = new THREE.Vector3();
  tick.onBeforeRender = (renderer, sc_, camera) => {
    if (!camera.isPerspectiveCamera) return;
    group.visible = MEADOW.on;
    U.uTime.value = (performance.now() / 1000) % 3600;
    camera.getWorldDirection(fwd);
    const px = camera.position.x + fwd.x * C * 1.2, pz = camera.position.z + fwd.z * C * 1.2;   // a little ahead of the camera: more of it where you look
    U.uCam.value.set(px, camera.position.y, pz);
    fwd.set(px, camera.position.y, pz); butterflies(camera, sc_, U.uTime.value);
    const ccx = Math.floor(px / C), ccz = Math.floor(pz / C);
    let changed = false;
    for (const [k, c] of live) if (Math.abs(c.cx - ccx) > LOAD + 1 || Math.abs(c.cz - ccz) > LOAD + 1) { c.mesh.visible = false; pool.push(c.mesh); live.delete(k); changed = true; }
    let made = 0;
    for (let r = 0; r <= LOAD && made < 4; r++) for (let dz = -r; dz <= r && made < 4; dz++) for (let dx = -r; dx <= r && made < 4; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const k = (ccx + dx) + ',' + (ccz + dz); if (live.has(k)) continue;
      const mesh = take(); fill(mesh, ccx + dx, ccz + dz); live.set(k, { cx: ccx + dx, cz: ccz + dz, mesh }); made++;
    }
    if (changed || made) relayFlowers();
    heads.visible = stems.visible = MEADOW.on;
  };
}

/* ------------------------------------------------------------------
   A mountain pass: a road cut straight out through a region's barrier
   ridge that leads on to another region (walk to the far end and the
   next region loads, the way Hyrule Field's exits work). Pure maths so
   a region's heightAt / inBounds can use it before anything is built.
     def: { id, name, to, toPass, a (bearing out from the centre),
            r0 (where the cut starts), r1 (where the climb tops out),
            w (half-width of the road), rise (how far the road climbs) }
   ------------------------------------------------------------------ */
const sm = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function makePass(def, rawHeight) {
  const cx = Math.cos(def.a), sz = Math.sin(def.a);
  const h0 = rawHeight(cx * def.r0, sz * def.r0);
  const p = { ...def, cx, sz, h0, end: def.r1 + 70 };
  p.along = (x, z) => x * cx + z * sz;
  p.lat = (x, z) => Math.abs(z * cx - x * sz);
  p.floor = s => h0 + def.rise * sm(def.r0, def.r1, s);
  p.point = (s, l = 0) => ({ x: cx * s - sz * l, z: sz * s + cx * l });
  /* blend the land down (or up) to the road, with steep walls either side */
  p.carve = (x, z, h) => {
    const s = p.along(x, z); if (s < def.r0 - 40 || s > p.end + 10) return h;
    const l = p.lat(x, z); if (l > def.w + 22) return h;
    const k = sm(def.w + 20, def.w, l) * sm(def.r0 - 35, def.r0, s) * sm(p.end + 10, p.end - 5, s);
    return h + (p.floor(s) - h) * k;
  };
  /* on the road itself (the region's other rules don't apply here) */
  p.inside = (x, z) => { const s = p.along(x, z); return s > def.r0 - 5 && s < p.end - 6 && p.lat(x, z) < def.w - 0.8; };
  /* keep trees, rocks and scree off the road and its verges */
  p.near = (x, z, extra = 0) => { const s = p.along(x, z); return s > def.r0 - 45 && s < p.end + 20 && p.lat(x, z) < def.w + 10 + extra; };
  p.gate = def.r1 - 12;            // where a closed pass is blocked
  p.trigger = def.r1 + 22;         // walk past this and you're on your way
  p.arrive = def.r1 + 4;           // where you come in from the other side
  return p;
}
