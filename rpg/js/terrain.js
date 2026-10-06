/* ============================================================
   Shared building blocks for every region: collision (oriented
   boxes in a spatial grid), instanced "kits" of repeated shapes,
   and wind-swayed grass.
   ============================================================ */
import * as THREE from 'three';
import { fbm, clamp } from './util.js';
import { ramp } from './gfx.js';

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
    let g = this.heightAt(x, z);
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
    this.e.set(rx, ry, rz); this.q.setFromEuler(this.e);
    this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(sx, sy, sz));
    this.mesh.setMatrixAt(i, this.m);
    this.mesh.setColorAt(i, this.c.set(color));
    return i;
  }
  done() { this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; this.mesh.computeBoundingSphere(); }
}

export function buildGrass(scene, rng, ok, heightAt, tones = ['#a8b452', '#c4a84a', '#8ea446', '#d2b860', '#b7b04e'], N = 26000) {
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
