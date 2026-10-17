/* ============================================================
   VELKI — the true beginning. Fyrsti'Vilag at sunset, in the year
   307A: the last Skyfall. Young Tanoc climbs the spire to watch the
   Angels and the Snillers fight, walks out of the north gate toward
   it, and is caught in it.

   A small scene of its own, played before the Beuhk page's world:
   its own sky, ground, colliders and a light third-person walker.
   main.js hands it the renderer, the camera and the input, and
   takes the run back when the air tears open.
   ============================================================ */
import * as THREE from 'three';
import { toon, ramp, addOutline, outlineAll, glowSprite, Particles } from './gfx.js';
import { buildEikar, placeWalker } from './actors.js';
import { clamp, damp, dampAngle, smooth, lerp, mulberry32 } from './util.js';
import * as STORY from './story.js';
import { createCityKit, createCrowd, buildMudFountain, FOLK_LOOKS } from './city.js';
import { createCine } from './cine.js';
import { buildHomeTree, buildForest } from './hometree.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

/* the folk of the sky live in skyfolk.js now; these stay importable from here */
export { buildAngel, buildSniller } from './skyfolk.js';
import { createSkyWar } from './skyfolk.js';

/* young Tanoc, thirteen, in his own first hat, with nothing in his hands */
export function buildYoungTanoc() {
  return buildEikar({
    skin: '#8a5a3a', cap: '#4a3020', marking: 0xffb04a, markColor: 0x2a1208, emblem: 0xc89aff, build: 0.92, capTall: 0.66,
    weapon: 'none', flasks: false, leg: 0x4a3420, foot: 0x2a1a0c, beltColor: 0x5a3a1c, tunic: 0x7a5a3a, trim: 0xc89a5a, scale: 0.86,
  });
}

/* ================================================================ */
export function createVelki(ctx) {
  const { camera, keys, touch, CAM, sfx } = ctx;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd08a78, 280, 2600);
  const SUN = V3(-0.9, 0.12, -0.42).normalize();

  /* ---------------- sky: the sun going down, the sky on fire ---------------- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: SUN }, uT: { value: 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 uSun; uniform float uT;
      void main(){
        float h = vD.y;
        vec3 top = vec3(0.16,0.09,0.28), mid = vec3(0.78,0.36,0.46), low = vec3(1.0,0.66,0.36);
        vec3 c = mix(low, mid, smoothstep(0.0, 0.22, h)); c = mix(c, top, smoothstep(0.18, 0.75, h));
        float s = max(dot(vD, uSun), 0.0);
        c += vec3(1.0,0.62,0.3) * pow(s, 6.0) * 0.6 + vec3(1.0,0.85,0.6) * pow(s, 180.0) * 2.0;
        float north = smoothstep(0.2, 0.9, -vD.z) * smoothstep(-0.05, 0.35, h);
        c += vec3(0.15,0.55,0.55) * north * (0.12 + 0.06 * sin(uT * 2.0 + vD.x * 9.0));
        if (h < 0.0) c = mix(low, vec3(0.3,0.16,0.2), smoothstep(0.0, -0.2, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMat));
  // Xikia and two Kalo low in the east, pale in the dusk
  for (const [x, y, z, r, c] of [[1500, 520, 900, 230, 0x9fc8e8], [1300, 900, -500, 60, 0xe8e0d0], [900, 700, 1400, 40, 0xd8c8b8]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color: c, fog: false, transparent: true, opacity: 0.7 }));
    m.position.set(x, y, z); scene.add(m);
  }

  const hemi = new THREE.HemisphereLight(0xffc0a0, 0x40243a, 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xff9a5a, 2.4); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const north = new THREE.DirectionalLight(0x7af0e0, 0.5); north.position.set(0, 60, -200); scene.add(north);

  /* ---------------- ground ---------------- */
  const WALL_R = 62, GATE_A = -Math.PI / 2, GATE_W = 0.07;
  /* the land round the city: the sea to the west where the sun goes down, the forest east and south,
     the open plain north where the battle is — and the home trees. The city's own stands in the
     north-east of the wall, half in and half out: the city was built round it, and it is the city's castle. */
  const SEA_Y = -0.8, seaBits = {};
  const SHORE = z => -140 + 18 * Math.sin(z * 0.011) + 10 * Math.sin(z * 0.031 + 1);
  const HOME = { x: 66, z: -40, R: 24, H: 300 };
  const HOMES_OUT = [{ x: 250, z: -30, R: 19, H: 260, seed: 3 }, { x: 205, z: 205, R: 20, H: 280, seed: 5 }, { x: 0, z: 285, R: 18, H: 245, seed: 9 }, { x: 400, z: 340, R: 19, H: 265, seed: 11 }];
  function rawHeight(x, z) {
    const r = Math.hypot(x, z);
    let h = smooth(WALL_R + 6, 130, r) * (2.2 * Math.sin(x * 0.021) + 1.8 * Math.cos(z * 0.017 + 1) + 1.2 * Math.sin((x + z) * 0.033) + 1.5);
    h = Math.max(h, -0.3);
    const sd = x - SHORE(z);                          // the beach, then down under the sea
    if (sd < 40) { const b = smooth(40, 6, sd); h = h * (1 - b) + 0.35 * b; }
    if (sd < 8) h = 0.35 + (-7 - 0.35) * smooth(8, -45, sd);
    return h;
  }
  for (const T of HOMES_OUT) T.g = rawHeight(T.x, T.z);
  function heightAt(x, z) {
    let h = rawHeight(x, z);
    for (const T of HOMES_OUT) { const d = Math.hypot(x - T.x, z - T.z), RB = T.R * 1.75; if (d < RB * 3) h += (T.g - h) * (1 - smooth(RB * 1.4, RB * 3, d)); }
    return h;
  }
  function forestAt(x, z) {
    const r = Math.hypot(x, z);
    if (r < 92 || x - SHORE(z) < 75 || fieldAt(x, z)) return 0;
    if (z < -55 && x < 150) return 0;                                  // the open plain north, where the battle is
    const k = Math.max(smooth(80, 135, x), smooth(90, 145, z));
    return k * (0.75 + 0.35 * Math.sin(x * 0.019 + 1) * Math.cos(z * 0.023));
  }
  const FIELDS = [];
  {
    const frng = mulberry32(41), C = [0xc8a84a, 0x8aa040, 0xb89a5a, 0x9a8ab8, 0x7a9a3a, 0xd8b860];
    for (let i = 0; FIELDS.length < 16 && i < 400; i++) {
      const a = frng() * TAU, r = 80 + frng() * 120, x = Math.cos(a) * r, z = Math.sin(a) * r, w = 14 + frng() * 16, d = 10 + frng() * 14, ry = frng() * Math.PI;
      if (z < -50 && Math.abs(x) < 170) continue;                                       // not on the battle plain
      if (x - SHORE(z) < 45 || Math.abs(z - 8) < 8 && x < 0) continue;                  // not on the beach or the harbour road
      if (Math.hypot(x - HOME.x, z - HOME.z) < 70) continue;
      if (FIELDS.some(f => Math.hypot(f.x - x, f.z - z) < (f.w + w) * 0.7)) continue;
      FIELDS.push({ x, z, w, d, ry, c: C[i % C.length] });
    }
  }
  function fieldAt(x, z) {
    for (const f of FIELDS) { const dx = x - f.x, dz = z - f.z, c = Math.cos(f.ry), s2 = Math.sin(f.ry), lx = dx * c - dz * s2, lz = dx * s2 + dz * c; if (Math.abs(lx) < f.w && Math.abs(lz) < f.d) return f; }
    return null;
  }
  const inHomeZone = (x, z, pad = 0) => Math.hypot(x - HOME.x, z - HOME.z) < HOME.R * 1.75 + 8 + pad;
  {
    const geo = new THREE.PlaneGeometry(1400, 1400, 180, 180); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color();
    const pave = new THREE.Color(0xc8a888), road = new THREE.Color(0xb89878), grass = new THREE.Color(0x7a7a48), dry = new THREE.Color(0x9a7a50);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
      pos.setY(i, heightAt(x, z));
      c.copy(grass).lerp(dry, (Math.sin(x * 0.05) * Math.cos(z * 0.04) + 1) * 0.3);
      const sd = x - SHORE(z);
      if (sd < 34) c.lerp(new THREE.Color(0xd8c09a), smooth(34, 12, sd));
      if (x < -WALL_R && x > SHORE(z) && Math.abs(z - 8) < 3.6) c.lerp(road, 0.85);          // the road down to the harbour
      if (fieldAt(x, z)) c.lerp(new THREE.Color(fieldAt(x, z).c), 0.75);
      if (sd < 4) c.lerp(new THREE.Color(0x8a7a62), smooth(4, -20, sd));
      if (forestAt(x, z) > 0.2) c.lerp(new THREE.Color(0x4a5a30), Math.min(1, forestAt(x, z)) * 0.7);
      if (r < WALL_R + 2) c.copy(pave);
      if (Math.abs(x) < 4.5 && z < 0 && z > -260) c.lerp(road, 0.8);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true })); ground.receiveShadow = true; scene.add(ground);
  }

  /* ---------------- colliders: boxes and posts with a top and a bottom ---------------- */
  const solids = [];   // { kind:'box', x, z, hw, hd, y0, y1 } | { kind:'cyl', x, z, r, y0, y1 }
  const box = (x, z, hw, hd, y0, y1) => { const s = { kind: 'box', x, z, hw, hd, y0, y1, on: true }; solids.push(s); return s; };
  const cyl = (x, z, r, y0, y1) => { const s = { kind: 'cyl', x, z, r, y0, y1, on: true }; solids.push(s); return s; };
  const STEP = 0.65, PR = 0.4, PH = 1.5;
  function groundAt(x, z, y) {
    let g = heightAt(x, z);
    for (const s of solids) {
      if (Math.abs(x - s.x) > 30 || Math.abs(z - s.z) > 30) continue;
      if (!s.on || s.y1 > y + STEP || s.y1 <= g) continue;
      if (s.kind === 'box' ? Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd : Math.hypot(x - s.x, z - s.z) < s.r) g = s.y1;
    }
    return g;
  }
  function resolve(p) {
    for (const s of solids) {
      if (Math.abs(p.x - s.x) > 30 || Math.abs(p.z - s.z) > 30) continue;
      if (!s.on || p.y + PH < s.y0 || p.y >= s.y1 - STEP) continue;
      if (s.kind === 'box') {
        const dx = p.x - s.x, dz = p.z - s.z, ox = s.hw + PR - Math.abs(dx), oz = s.hd + PR - Math.abs(dz);
        if (ox > 0 && oz > 0) { if (ox < oz) p.x += Math.sign(dx || 1) * ox; else p.z += Math.sign(dz || 1) * oz; }
      } else {
        const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), m = s.r + PR;
        if (d < m) { const k = d > 1e-4 ? m / d : 0; p.x = s.x + (d > 1e-4 ? dx * k : m); p.z = s.z + dz * k; }
      }
    }
    // the city wall, a ring with one gap
    const r = Math.hypot(p.x, p.z), a = Math.atan2(p.z, p.x);
    const inGap = Math.abs(Math.atan2(Math.sin(a - GATE_A), Math.cos(a - GATE_A))) < GATE_W && !(gateBar.on);
    if (!inGap && p.y < 9 && r > WALL_R - 1.5 - PR && r < WALL_R + 1.5 + PR) {
      const to = r < WALL_R ? WALL_R - 1.5 - PR : WALL_R + 1.5 + PR;
      p.x *= to / r; p.z *= to / r;
    }
    // the edge of the world we built, and the sea's
    if (r > 320) { p.x *= 320 / r; p.z *= 320 / r; }
    if (p.x < SHORE(p.z) + 1) p.x = SHORE(p.z) + 1;
  }
  function solidAt(x, y, z) {
    for (const s of solids) {
      if (Math.abs(x - s.x) > 30 || Math.abs(z - s.z) > 30) continue;
      if (!s.on || y < s.y0 || y > s.y1) continue;
      if (s.kind === 'box' ? Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd : Math.hypot(x - s.x, z - s.z) < s.r) return true;
    }
    return y < heightAt(x, z) + 0.2;
  }

  /* ---------------- the sea, the far country, the forest, and the home trees ---------------- */
  {
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(4200, 6400), new THREE.MeshToonMaterial({ color: 0x3a5a86, gradientMap: ramp() }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(-2190, SEA_Y, 0); sea.receiveShadow = true; scene.add(sea);
    // the sun's road across the water, and a lip of surf along the beach
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(2600, 70), new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.32, depthWrite: false }));
    glint.rotation.x = -Math.PI / 2; glint.rotation.z = Math.atan2(SUN.z, SUN.x); glint.position.set(-1450, SEA_Y + 0.05, -650); scene.add(glint);
    const surfPts = []; for (let z = -700; z <= 700; z += 10) surfPts.push(new THREE.Vector3(SHORE(z) + 2, SEA_Y + 0.08, z));
    const surf = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(surfPts), 160, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xf4e8d8, transparent: true, opacity: 0.7 }));
    surf.scale.y = 0.2; surf.position.y = SEA_Y * 0.8; scene.add(surf); seaBits.surf = surf;
    const far = new THREE.Mesh(new THREE.PlaneGeometry(4100, 6400), toon(0x3e5a32)); far.rotation.x = -Math.PI / 2; far.position.set(1950, -1.6, 0); scene.add(far);
  }
  {
    const frng = mulberry32(911), list = [];
    for (let gx = -700; gx <= 900; gx += 10) for (let gz = -900; gz <= 900; gz += 10) {
      const x = gx + (frng() - 0.5) * 9, z = gz + (frng() - 0.5) * 9, d = forestAt(x, z);
      if (d <= 0 || frng() > d * 0.85) continue;
      if (Math.hypot(x - HOME.x, z - HOME.z) < HOME.R * 4) continue;
      if (HOMES_OUT.some(T => Math.hypot(x - T.x, z - T.z) < T.R * 4.2)) continue;
      const sc = 0.8 + frng() * 0.9, pine = frng() < 0.55;
      list.push([x, z, sc, pine]);
      if (Math.hypot(x, z) < 340) cyl(x, z, 0.5 * sc, heightAt(x, z) - 1, heightAt(x, z) + 10 * sc);
    }
    buildForest(scene, list, { rng: frng, heightAt });
  }
  /* the harbour: two piers, boats at them and out on the water, fishing huts on the sand */
  {
    const wood = toon(0x7a5a3a), hullM = toon(0x8a4a2a), sailM = toon(0xf0e4cc, { side: THREE.DoubleSide });
    for (const [pz, len] of [[-6, 46], [24, 34]]) {
      const sx = SHORE(pz) + 6, deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 4), wood); deck.position.set(sx - len / 2, 1.0, pz); deck.castShadow = deck.receiveShadow = true; addOutline(deck, 0.04); scene.add(deck);
      box(sx - len / 2, pz, len / 2, 2, -3, 1.25);
      for (let k = 0; k <= len; k += 6) for (const s2 of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 6, 6), wood); p.position.set(sx - k, -1.6, pz + s2 * 2); scene.add(p); }
    }
    const boat = (x, z, ry, s2 = 1, sail = false) => {
      const g = new THREE.Group(); g.position.set(x, SEA_Y + 0.1, z); g.rotation.y = ry; g.scale.setScalar(s2); scene.add(g);
      const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6, 0, TAU, Math.PI / 2, Math.PI / 2), hullM); hull.scale.set(1.5, 1.1, 4.2); hull.rotation.x = Math.PI; hull.position.y = 0.6; g.add(hull); addOutline(hull, 0.05);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 4, 16), wood); rim.scale.set(1.5, 4.2, 1); rim.rotation.x = Math.PI / 2; rim.position.y = 0.6; g.add(rim);
      if (sail) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 5), wood); m.position.y = 4; g.add(m); const sl = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5), sailM); sl.position.set(0, 4.4, 0.2); sl.rotation.y = Math.PI / 2; g.add(sl); }
      seaBits.boats = seaBits.boats || []; seaBits.boats.push(g);
    };
    boat(SHORE(-10) - 14, -10.5, 0.1, 1, true); boat(SHORE(-2) - 26, -1.5, -0.2); boat(SHORE(28) - 18, 28.5, 0.3, 1, true); boat(SHORE(19) - 10, 19.5, 0);
    boat(SHORE(-120) - 150, -120, 1.2, 1.4, true); boat(SHORE(90) - 240, 90, -0.8, 1.6, true); boat(SHORE(-260) - 90, -260, 0.4, 1.2, true);
    const hutM = toon(0xc8a878), roofM = toon(0x5a6a7a);
    for (const [z, k] of [[-30, 0], [-18, 1], [44, 2], [56, 3], [70, 4]]) {
      const x = SHORE(z) + 22 + (k % 2) * 5, hb = new THREE.Mesh(new THREE.BoxGeometry(5, 3.4, 4.4), hutM); hb.position.set(x, heightAt(x, z) + 1.7, z); hb.castShadow = true; addOutline(hb, 0.04); scene.add(hb);
      const rf = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.4, 4), roofM); rf.rotation.y = Math.PI / 4; rf.position.set(x, heightAt(x, z) + 4.6, z); addOutline(rf, 0.04); scene.add(rf);
      box(x, z, 2.5, 2.2, heightAt(x, z) - 1, heightAt(x, z) + 3.4);
      // nets drying on poles
      const net = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), toon(0x9a8a6a, { side: THREE.DoubleSide, transparent: true, opacity: 0.8 })); net.position.set(x - 5, heightAt(x, z) + 1.4, z + 2); net.rotation.y = 0.4; scene.add(net);
    }
  }
  /* the countryside: crops in rows, hedges and odd trees, rocks, haystacks, a farmstead or two */
  {
    const crng = mulberry32(77), rows = [], stacks = [], scatter = [], rocks = [];
    for (const f of FIELDS) {
      const c = Math.cos(f.ry), s2 = Math.sin(f.ry);
      for (let lz = -f.d + 1; lz < f.d; lz += 1.6) { const x = f.x + lz * s2, z = f.z + lz * c; rows.push([x, heightAt(x, z) + 0.35, z, f.w * 2 - 1, f.ry, f.c]); }
      if (crng() < 0.6) for (let k = 0; k < 3; k++) { const x = f.x + (crng() - 0.5) * f.w, z = f.z + (crng() - 0.5) * f.d; stacks.push([x, heightAt(x, z), z]); }
    }
    for (let gx = -400; gx <= 420; gx += 14) for (let gz = -320; gz <= 420; gz += 14) {
      const x = gx + (crng() - 0.5) * 12, z = gz + (crng() - 0.5) * 12, r = Math.hypot(x, z);
      if (r < WALL_R + 10 || x - SHORE(z) < 10 || forestAt(x, z) > 0 || fieldAt(x, z) || Math.hypot(x - HOME.x, z - HOME.z) < HOME.R * 3) continue;
      if (Math.abs(x) < 7 && z < 0) continue;
      const north = z < -55 && Math.abs(x) < 150;
      const q = crng();
      if (!north && q < 0.07) scatter.push([x, z, 0.8 + crng() * 0.8, crng() < 0.3]);
      else if (q < (north ? 0.05 : 0.1)) rocks.push([x, heightAt(x, z), z, 0.6 + Math.pow(crng(), 2) * 2.4]);
    }
    const inst = (geo, mat, arr, put) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, arr.length)); m.count = arr.length; const o = new THREE.Object3D(); arr.forEach((v, i) => { put(o, v, m, i); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
    const cc = new THREE.Color();
    inst(new THREE.BoxGeometry(1, 0.7, 0.8), toon(0xffffff), rows, (o, [x, y, z, w, ry, c], m, i) => { o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.scale.set(w, 1, 1); m.setColorAt(i, cc.set(c)); });
    inst(new THREE.CylinderGeometry(1.1, 1.4, 1.8, 8), toon(0xd8b860), stacks, (o, [x, y, z]) => { o.position.set(x, y + 0.9, z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); });
    inst(new THREE.DodecahedronGeometry(1, 0), toon(0x9a8a7a), rocks, (o, [x, y, z, sc]) => { o.position.set(x, y + sc * 0.25, z); o.rotation.set(crng() * 3, crng() * 3, 0); o.scale.set(sc * 1.3, sc * 0.7, sc); });
    buildForest(scene, scatter, { rng: crng, heightAt });
    for (const [x, z, sc] of scatter) if (Math.hypot(x, z) < 330) cyl(x, z, 0.5 * sc, heightAt(x, z) - 1, heightAt(x, z) + 8 * sc);
    for (const [x, y, z, sc] of rocks) if (sc > 1) cyl(x, z, sc, y - 1, y + sc * 0.6);
  }
  const homeTrees = [];
  for (const T of HOMES_OUT) homeTrees.push(buildHomeTree(scene, T.x, T.z, T.g, { R: T.R, H: T.H, seed: T.seed, town: 0.8, doorAt: Math.atan2(-T.z, -T.x) }));
  // the city's own: its roots never reach in over the streets, and its door faces the spire
  const toCity = Math.atan2(-HOME.z, -HOME.x);
  homeTrees.push(buildHomeTree(scene, HOME.x, HOME.z, 0, {
    R: HOME.R, H: HOME.H, seed: 307, town: 1, decks: [0.07, 0.15, 0.24, 0.34, 0.45], doorAt: toCity,
    banners: [0x8a2a3a, 0xd8a040], rootSkip: a => Math.abs(Math.atan2(Math.sin(a - toCity), Math.cos(a - toCity))) < 1.1,
  }));
  for (const T of homeTrees) for (const c of T.colliders) cyl(c.x, c.z, c.r, c.y0, c.y1);

  /* ---------------- Fyrsti'Vilag ---------------- */
  const rng = mulberry32(307);
  const lamps = [];
  const PLAZA = { x: 0, z: 34 };                      // the little fountain square in the south of the city, where Tanoc starts
  const kit = createCityKit(scene, { rng, heightAt, box, cyl, palette: 'velki' });
  const RINGS = [18, 28.5, 39, 49.5];
  for (let ring = 0; ring < RINGS.length; ring++) {
    const R = RINGS[ring], n = 9 + ring * 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + ring * 0.37 + rng() * 0.12, x = Math.cos(a) * R, z = Math.sin(a) * R;
      if (Math.abs(x) < 8.5 && z < 0) continue;              // the north road to the gate
      if (Math.abs(x) < 6.5 && z > 0) continue;              // and the south lane
      if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < 13) continue;
      if (inHomeZone(x, z, 6)) continue;                     // the home tree's roots
      kit.house(x, z, Math.atan2(-x, -z), ring === 0 && i % 3 === 0 ? 'tall' : null);
    }
  }
  // farmsteads by the fields
  for (const f of FIELDS.slice(0, 5)) {
    const x = f.x + Math.cos(f.ry) * (f.w + 6), z = f.z - Math.sin(f.ry) * (f.w + 6);
    if (forestAt(x, z) > 0 || x - SHORE(z) < 30) continue;
    kit.house(x, z, Math.atan2(-x, -z));
  }
  // street furniture: lamps round the ring streets, bunting across them, paving rings
  const STREETS = [12, 23.2, 33.8, 44.3, 56];
  for (const r of STREETS.slice(1)) for (let k = 0; k < Math.round(r / 5); k++) { const a = k / Math.round(r / 5) * TAU + 0.2, x = Math.cos(a) * (r + 2.4), z = Math.sin(a) * (r + 2.4); if (Math.abs(x) < 9 && z < 0) continue; if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < 7) continue; if (inHomeZone(x, z, 3)) continue; kit.lampPost(x, z); }
  for (const r of [23.2, 33.8, 44.3]) for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + 0.5; if (inHomeZone(Math.cos(a) * r, Math.sin(a) * r, 8)) continue; kit.bunting(V3(Math.cos(a) * (r - 4.5), 6.2, Math.sin(a) * (r - 4.5)), V3(Math.cos(a + 0.12) * (r + 4.5), 6.2, Math.sin(a + 0.12) * (r + 4.5)), 1.2); }
  for (let k = 0; k < 6; k++) kit.bunting(V3(-7, 7.5, -10 - k * 8), V3(7, 7.5, -14 - k * 8), 1.4);     // across the north road, to the gate
  kit.paving(0, 0, STREETS, 0xb8987a); kit.paving(PLAZA.x, PLAZA.z, [4.6, 8.8, 12.2], 0xa88868);
  // the fountain square: a Stryx mud fountain, three stalls, benches
  const fountain = buildMudFountain(scene, PLAZA.x, PLAZA.z, heightAt(PLAZA.x, PLAZA.z), { scale: 0.8, seed: 12 });
  cyl(PLAZA.x, PLAZA.z, 3.9, -1, 0.9);
  [[-9.5, 30, 1.2], [9.5, 31, -1.3], [-7, 42.5, 2.5]].forEach(([x, z, ry], i) => kit.stall(x, z, ry, i));
  for (const [x, z, ry] of [[6, 41, 0.6], [-10, 37, -0.4]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.7), toon(0x8a6a4a)); b.position.set(x, 0.45, z); b.rotation.y = ry; addOutline(b, 0.03); scene.add(b); box(x, z, 1.2, 0.5, -1, 0.5); }
  // potted trees here and there
  for (const [x, z] of [[11, 21], [-11, 21], [13, 46], [-13, 46], [4, -18], [-4, -18], [20, 2], [-20, -4]]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 0.9, 10), toon(0xa86a3a)); pot.position.set(x, 0.45, z); addOutline(pot, 0.03); scene.add(pot);
    const tr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), toon(0x6a9a3a)); tr.position.set(x, 2.6, z); tr.scale.y = 1.15; addOutline(tr, 0.04); tr.castShadow = true; scene.add(tr);
    const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 6), toon(0x5a3a22)); tk.position.set(x, 1.5, z); scene.add(tk);
    cyl(x, z, 0.75, -1, 0.9);
  }

  /* the spire: a stone needle with a stair winding up its outside */
  const SPIRE_TOP = 27, STEP_R = 4.5, NSTEPS = 48;
  {
    const sm = toon(0xd0b090), dark = toon(0x8a6a50);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.8, 0.6, 32), dark); plinth.position.y = 0.3; plinth.receiveShadow = true; addOutline(plinth, 0.04); scene.add(plinth);
    cyl(0, 0, 6.4, -1, 0.6);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.7, SPIRE_TOP, 24), sm); core.position.y = SPIRE_TOP / 2; core.castShadow = core.receiveShadow = true; addOutline(core, 0.05); scene.add(core);
    cyl(0, 0, 3.6, -1, SPIRE_TOP);
    for (let k = 1; k < 6; k++) { const band = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.12, 5, 28), dark); band.rotation.x = Math.PI / 2; band.position.y = k * 4.8; scene.add(band); }
    const rail = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.1, 5, 28), dark); rail.rotation.x = Math.PI / 2; rail.position.y = SPIRE_TOP + 0.9; scene.add(rail);
    // a slim lamp-post at the very top, so nothing stands between you and the battle
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 4, 8), dark); pin.position.y = SPIRE_TOP + 2; pin.castShadow = true; addOutline(pin, 0.03); scene.add(pin);
    cyl(0, 0, 0.25, SPIRE_TOP - 1, SPIRE_TOP + 4);
    const tip = glowSprite(0xffd890, 3, 0.9); tip.position.y = SPIRE_TOP + 4.3; scene.add(tip); lamps.push(tip);
    const stepGeo = new THREE.BoxGeometry(1.9, 0.5, 1.9);
    for (let i = 0; i < NSTEPS; i++) {
      const a = Math.PI / 2 + i * 0.33, x = Math.cos(a) * STEP_R, z = Math.sin(a) * STEP_R, top = 0.6 + 0.55 * (i + 1);
      const st = new THREE.Mesh(stepGeo, dark); st.position.set(x, top - 0.25, z); st.rotation.y = -a; st.castShadow = st.receiveShadow = true; addOutline(st, 0.03); scene.add(st);
      box(x, z, 0.95, 0.95, top - 0.5, top);
    }
  }
  /* the wall, its gate, and the gate's towers */
  const gateBar = { on: true };   // the warden keeps you inside until you've seen it from the top
  {
    const wm = toon(0xb8987a), N = 80;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU, da = Math.atan2(Math.sin(a - GATE_A), Math.cos(a - GATE_A));
      if (Math.abs(da) < GATE_W + 0.02) continue;
      if (Math.hypot(Math.cos(a) * WALL_R - HOME.x, Math.sin(a) * WALL_R - HOME.z) < HOME.R * 1.6) continue;   // the wall runs into the tree and stops
      const seg = new THREE.Mesh(new THREE.BoxGeometry(3, 9, WALL_R * TAU / N + 0.3), wm);
      seg.position.set(Math.cos(a) * WALL_R, 4.5, Math.sin(a) * WALL_R); seg.rotation.y = -a; seg.castShadow = seg.receiveShadow = true; scene.add(seg);
      if (i % 2 === 0) { const cr = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 1.2), wm); cr.position.set(Math.cos(a) * WALL_R, 9.6, Math.sin(a) * WALL_R); cr.rotation.y = -a; scene.add(cr); }
    }
    for (const s of [-1, 1]) {
      const a = GATE_A + s * (GATE_W + 0.045), x = Math.cos(a) * WALL_R, z = Math.sin(a) * WALL_R;
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 14, 14), wm); tw.position.set(x, 7, z); tw.castShadow = true; addOutline(tw, 0.05); scene.add(tw);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4, 14), toon(0x5a2a14)); cap.position.set(x, 16, z); addOutline(cap, 0.04); scene.add(cap);
      cyl(x, z, 2.7, -1, 16);
      const lamp = glowSprite(0xffa050, 3, 0.9); lamp.position.set(x - s * 2.8, 6, z + 3); scene.add(lamp); lamps.push(lamp);
    }
    const arch = new THREE.Mesh(new THREE.BoxGeometry(11, 2.4, 3.2), wm); arch.position.set(0, 10.2, -WALL_R); addOutline(arch, 0.04); scene.add(arch);
  }
  /* banners on the wall, streaming toward the battle */
  const banners = [];
  for (let i = 0; i < 10; i++) {
    const a = GATE_A + (i - 4.5) * 0.18; if (Math.abs(a - GATE_A) < 0.1) continue;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), toon(i % 2 ? 0x8a2a3a : 0xd8a040, { side: THREE.DoubleSide }));
    b.position.set(Math.cos(a) * (WALL_R - 1.7), 7, Math.sin(a) * (WALL_R - 1.7)); b.rotation.y = -a + Math.PI / 2; b.userData.ph = i; scene.add(b); banners.push(b);
  }

  /* ---------------- people: the watching city, the warden, the Ahoac ---------------- */
  const LOOKS = [
    { skin: '#a8743e', cap: '#5a3018', tunic: 0x5a6a8a }, { skin: '#c08a52', cap: '#3a2414', tunic: 0x8a4a3a },
    { skin: '#9a6a40', cap: '#6a4020', tunic: 0x4a7a5a }, { skin: '#b07a48', cap: '#4a2a18', tunic: 0x7a6a4a },
  ];
  const folk = [];
  function person(x, z, look, o = {}) {
    const a = buildEikar(Object.assign({ weapon: 'none', flasks: false, scale: 0.95 + rng() * 0.12 }, look, o));
    a.root.position.set(x, groundAt(x, z, 50), z); a.root.rotation.y = Math.atan2(-x * 0.2, -1 - z * 0.002); scene.add(a.root);
    const p = { a, pos: a.root.position, ph: rng() * 10, look: rng() < 0.7 };
    folk.push(p); return p;
  }
  /* the city's own folk, out to watch the sky: they keep to the streets, gather where they can see north, sit on the fountain, mind stalls */
  const BATTLE_LOOK = [0, -160];
  const spots = [];
  for (const r of [44.3, 56]) for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k / 8 - 0.5) * 1.6; if (Math.abs(Math.cos(a) * r) < 9 || inHomeZone(Math.cos(a) * r, Math.sin(a) * r, 4)) continue; spots.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, look: BATTLE_LOOK, kind: 'watch' }); }
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; spots.push({ x: PLAZA.x + Math.cos(a) * 4.8, z: PLAZA.z + Math.sin(a) * 4.8, look: [PLAZA.x, PLAZA.z], kind: 'sit' }); }
  for (const [x, z] of [[-6, 27], [7, 38], [-4, 44]]) for (let k = 0; k < 3; k++) { const a = k / 3 * TAU; spots.push({ x: x + Math.cos(a) * 0.9, z: z + Math.sin(a) * 0.9, look: [x, z], kind: 'chat' }); }
  const crowd = createCrowd({
    scene, rng, groundAt, C: { x: 0, z: 0 },
    resolve: q => { const y = q.y; q.y = 0.2; resolve(q); q.y = y; },
    streets: STREETS.slice(1, 3).map(r => ({ r })), roads: [{ a: -Math.PI / 2 }, { a: Math.PI / 2 }], spots,
  });
  for (let i = 0; i < 34; i++) {
    const r = STREETS[1 + (i % 2)], a = rng() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const p = crowd.spawn(FOLK_LOOKS[i % FOLK_LOOKS.length], V3(x, 0, z));
    if (i < 12) { const sp = spots[i]; p.pos.set(sp.x, 0, sp.z); p.spot = sp; p.wait = 4 + rng() * 10; p.look = V3(sp.look[0], 0, sp.look[1]); }
  }
  // stallkeepers
  for (const [x, z, ry] of [[-9.5, 30, 1.2], [9.5, 31, -1.3], [-7, 42.5, 2.5]]) { const p = crowd.spawn(FOLK_LOOKS[(x * 7 | 0) & 7], V3(x - Math.sin(ry) * 1.3, 0, z - Math.cos(ry) * 1.3)); p.fixed = true; p.look = V3(PLAZA.x, 0, PLAZA.z); }
  const warden = person(6.5, -54, { skin: '#9a6a40', cap: '#3a2a1a', tunic: 0x4a4a5a, trim: 0xb8a070 }, { weapon: 'spear', build: 1.15, scale: 1.05 });
  warden.look = false;
  const crew = [-2.5, 0, 2.5].map((x, i) => {
    const p = person(x, -30 - i * 2, { skin: '#b07a48', cap: '#3a2414', tunic: 0xb87a2a, trim: 0xffd060, leg: 0x6a4a20 }, { build: 1.1, cape: 0x9a3a1a });
    p.look = false; p.run = false; p.delay = i * 0.5; return p;
  });

  /* ---------------- the battle in the north ---------------- */
  const BATTLE = V3(0, 0, -160);
  let war = null;   // made once the particles exist, below
  const flash = (x, y, z, size, color, life) => war && war.flash(V3(x, y, z), size, color, life);

  /* ---------------- particles and post ---------------- */
  const particles = new Particles(scene, 4500);
  war = createSkyWar({ scene, particles, center: V3(BATTLE.x, 46, BATTLE.z), spread: [230, 44, 150], count: 12, size: [2.6, 4.2], vis: 0.1,
    onBlink: p => { if (Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < 160) sfx.blink(); } });
  const cine = createCine(camera, { blocked: (x, y, z) => solidAt(x, y, z) });
  const composer = ctx.makeComposer(scene);
  function resize() { particles.setScale(innerHeight * Math.min(devicePixelRatio, 1.75) * 0.9); }
  resize();

  /* ---------------- Tanoc ---------------- */
  const tanoc = buildYoungTanoc(); scene.add(tanoc.root);
  const P = { pos: V3(2.5, 0, 46), vel: V3(), yaw: Math.PI, onGround: true, coyote: 0, jumpBuf: 0, stepPh: 0 };
  P.pos.y = groundAt(P.pos.x, P.pos.z, 5);
  CAM.yaw = 0; CAM.pitch = 0.18;
  const camPos = V3(2.5, 4, 54), camTgt = V3();

  /* ---------------- the beat of it ---------------- */
  /* the afternoon first (unless a reload already saw it): supper for the gate crew, and their drill */
  let stage = ctx.at === 'spire' ? 'spire' : 'home', t = 0, outT = 0, said = 0, barkI = 0, shake = 0, done = false, caughtT = -1, tear = null;
  const B4 = STORY.PROLOGUE.before;
  const beacon = glowSprite(0xffd27a, 3, 0.9); scene.add(beacon);
  const captain = crew[1];
  function setBeacon() {
    if (stage === 'spire') beacon.position.set(0, SPIRE_TOP + 1.6, 0);
    else if (stage === 'gate') beacon.position.set(0, 3, -WALL_R - 6);
    else if (stage === 'home') beacon.position.set(captain.pos.x, captain.pos.y + 2.4, captain.pos.z);
    beacon.visible = stage === 'spire' || stage === 'gate' || stage === 'home';
  }
  setBeacon();
  if (stage === 'spire') ctx.objective(STORY.PRO_OBJ.spire, 'WASD to move · Shift to run · Space to jump');
  else ctx.objective(B4.basketObj, 'WASD to move · Shift to run · Space to jump');
  // his mother, by their door; and the basket he carries up to the gate
  const mother = person(5.2, 49.5, { skin: '#9a6a40', cap: '#3a2414', tunic: 0x8a5a6a, trim: 0xd8b080 }, { scale: 1.0 });
  mother.look = false; mother.a.root.rotation.y = Math.atan2(P.pos.x - 5.2, P.pos.z - 49.5);
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.3, 10), toon(0xb8884a)); basket.position.set(0.32, 0.95, 0.22); addOutline(basket, 0.02);
  if (stage === 'home') tanoc.root.add(basket);
  /* the drill: practice sparks dropped from the gate tower, each landing where its shadow is */
  const DR = { n: 0, thrown: 0, next: 1.2, sparks: [], told: 0 };
  function startDrill() {
    stage = 'drill'; setBeacon(); tanoc.root.remove(basket);
    DR.n = 0; DR.thrown = 0; DR.next = 1.5;
    ctx.objective(B4.drillObj(0), B4.drillHint);
  }
  function drillTick(dt) {
    DR.next -= dt;
    if (DR.next <= 0 && DR.thrown < 8) {
      DR.next = 1.9; DR.thrown++;
      const a = rng() * TAU, r = 2.5 + rng() * 4.5, x = clamp(P.pos.x + P.vel.x * 0.6 + Math.cos(a) * r, -7, 7), z = clamp(P.pos.z + P.vel.z * 0.6 + Math.sin(a) * r, -27, -12), g = groundAt(x, z, 5);
      const ball = glowSprite(0xffc070, 1.6, 0.95); ball.position.set(x, g + 22, z); scene.add(ball);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 20), new THREE.MeshBasicMaterial({ color: 0x1a0c08, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, g + 0.06, z); scene.add(ring);
      DR.sparks.push({ ball, ring, x, z, g, t: 0, fall: 2.1 });
    }
    for (let i = DR.sparks.length - 1; i >= 0; i--) {
      const sp = DR.sparks[i]; sp.t += dt; const k = Math.min(1, sp.t / sp.fall);
      sp.ball.position.y = lerp(sp.g + 22, sp.g + 1.5, k * k); sp.ring.scale.setScalar(1.4 - k * 0.5); sp.ring.material.opacity = 0.25 + k * 0.5;
      if (k >= 1) {
        const got = Math.hypot(P.pos.x - sp.x, P.pos.z - sp.z) < 1.7;
        if (got) { DR.n++; sfx.core(); particles.burst(sp.x, sp.g + 1.5, sp.z, 24, { color: 0xffd080, speed: 4, size: 0.4, life: 0.6 }); ctx.bark('tanoc', B4.caught[Math.min(4, DR.n - 1)], 1.8); }
        else { sfx.slam(); particles.burst(sp.x, sp.g + 0.2, sp.z, 18, { color: 0xffa040, speed: 5, size: 0.35, life: 0.5, gravity: -8 }); ctx.bark('captain', B4.missed[DR.told++ % B4.missed.length], 2); }
        scene.remove(sp.ball); scene.remove(sp.ring); DR.sparks.splice(i, 1);
        ctx.objective(B4.drillObj(DR.n), B4.drillHint);
        if (DR.n >= 5) {
          for (const q of DR.sparks) { scene.remove(q.ball); scene.remove(q.ring); } DR.sparks.length = 0;
          stage = 'drilled'; ctx.save && ctx.save('spire');
          ctx.say(B4.done, () => { stage = 'spire'; said = 0; setBeacon(); ctx.objective(STORY.PRO_OBJ.spire, 'Shift to run · Space to jump'); });
          return;
        }
      }
    }
    if (DR.thrown >= 8 && !DR.sparks.length && DR.n < 5) { DR.n = 0; DR.thrown = 0; DR.next = 2.5; ctx.say(B4.again, () => ctx.objective(B4.drillObj(0), B4.drillHint)); }
  }

  function startGateStage() {
    stage = 'gate'; gateBar.on = false; setBeacon();
    crew.forEach(c => { c.run = true; });
    ctx.objective(STORY.PRO_OBJ.gate, 'Walk out of the north gate. Nobody can make you.');
  }
  function topReached() {
    stage = 'top';
    // turn him to face the north gate and the battle beyond it
    P.pos.x = 0; P.pos.z = -2.6; P.yaw = Math.PI; CAM.yaw = 0; CAM.pitch = 0.08;   // round to the north rail, so nothing stands in the way
    // while he looks, the camera does too: round the spire's crown, out over the city, at the war in the air
    const top = V3(0, SPIRE_TOP + 1.6, -2.6);
    cine.play([{ dur: 999, cam: (k, tt) => {
      const a = -Math.PI / 2 + Math.sin(tt * 0.12) * 0.9, r = 7 + Math.sin(tt * 0.2) * 2;
      return { p: V3(Math.cos(a) * r, SPIRE_TOP + 3 + Math.sin(tt * 0.3), Math.sin(a) * r * -1 + 4), l: V3(BATTLE.x + Math.sin(tt * 0.15) * 40, 40, BATTLE.z) };
    } }], null, { bars: false });
    war.fighters.forEach((f, i) => setTimeout(() => war.reveal(f, 0.9), 1500 + i * 1700));
    ctx.say(STORY.PROLOGUE.top, () => { cine.stop(); startGateStage(); });
  }

  function interact() {
    if (stage === 'home' && captain.pos.distanceTo(P.pos) < 4) { ctx.say(B4.crew, () => startDrill()); return; }
    if (mother.pos.distanceTo(P.pos) < 3) { ctx.say([['mother', stage === 'home' ? 'Straight there, straight back. Go on.' : 'Home before the first spark, Tanoc.']]); return; }
    if (warden.pos.distanceTo(P.pos) < 3.5) { ctx.say(STORY.PROLOGUE.guard); return; }
    for (const c of crew) if (!c.run && c.pos.distanceTo(P.pos) < 3.2) { ctx.say(STORY.PROLOGUE.ahoac); return; }
  }
  function prompt() {
    if (stage === 'home' && captain.pos.distanceTo(P.pos) < 4) return B4.talkCrew;
    if (mother.pos.distanceTo(P.pos) < 3) return 'Talk to your mother';
    if (warden.pos.distanceTo(P.pos) < 3.5) return 'Talk to the gate warden';
    for (const c of crew) if (!c.run && c.pos.distanceTo(P.pos) < 3.2) return 'Talk to the Ahoac';
    return null;
  }
  function jump() { P.jumpBuf = 0.15; }

  function caught() {
    if (stage === 'caught') return;
    stage = 'caught'; caughtT = 0; beacon.visible = false;
    tear = glowSprite(0xffffff, 1, 1); tear.position.set(P.pos.x - Math.sin(P.yaw) * -2, P.pos.y + 1.4, P.pos.z - Math.cos(P.yaw) * -2); scene.add(tear);
    sfx.duat(); sfx.roar();
  }

  /* ---------------- per-frame ---------------- */
  function updatePlayer(dt, playing) {
    // input, relative to the camera
    let ix = 0, iz = 0;
    if (playing && stage !== 'caught') {
      if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1;
      if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
      if (touch && touch.on) { ix += touch.move.x; iz += touch.move.y; }
    }
    const len = Math.hypot(ix, iz);
    const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = -fz, rz = fx;
    let wx = 0, wz = 0;
    if (len > 0.08) { const k = Math.min(1, len) / len; wx = (fx * iz + rx * ix) * k; wz = (fz * iz + rz * ix) * k; }
    const run = keys.ShiftLeft || keys.ShiftRight;
    const sp = (run ? 8.6 : 4.8) * Math.min(1, Math.hypot(wx, wz) || 0);
    const acc = P.onGround ? 14 : 4;
    P.vel.x = damp(P.vel.x, wx * (run ? 8.6 : 4.8), acc, dt); P.vel.z = damp(P.vel.z, wz * (run ? 8.6 : 4.8), acc, dt);
    if (len > 0.08) P.yaw = dampAngle(P.yaw, Math.atan2(wx, wz), 12, dt);
    // jump and fall
    P.jumpBuf -= dt; P.coyote -= dt;
    if (P.jumpBuf > 0 && (P.onGround || P.coyote > 0) && playing && stage !== 'caught') { P.vel.y = 9.2; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; sfx.jump(); }
    P.vel.y -= 26 * dt;
    P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
    resolve(P.pos);
    P.pos.y += P.vel.y * dt;
    const g = groundAt(P.pos.x, P.pos.z, P.pos.y);
    if (P.pos.y <= g + 0.02 && P.vel.y <= 0) {
      if (!P.onGround && P.vel.y < -8) sfx.land();
      P.pos.y = g; P.vel.y = 0; P.onGround = true; P.coyote = 0.12;
    } else if (P.onGround && P.pos.y - g < STEP && P.vel.y <= 0) { P.pos.y = g; P.vel.y = 0; }   // walking down a stair
    else P.onGround = false;
    const speed = Math.hypot(P.vel.x, P.vel.z);
    if (P.onGround && speed > 1) { P.stepPh += dt * speed * 0.55; if (P.stepPh > 1) { P.stepPh = 0; sfx.step(); } }
    placeWalker(tanoc.root, P, dt); tanoc.root.rotation.y = P.yaw;
    tanoc.animate(dt, { speed, onGround: P.onGround, t });
    return sp;
  }

  const camWant = V3(); let camInit = false, camReach = null;
  function updateCamera(dt) {
    const onSpire = Math.hypot(P.pos.x, P.pos.z) < 8 && P.pos.y > 2;
    const want = onSpire ? 5.2 : 6.5;
    camWant.set(P.pos.x, P.pos.y + 1.5, P.pos.z);
    // follow quickly across the ground, more gently up and down (steps, stairs, landings), and snap back if far behind
    if (!camInit || camTgt.distanceTo(camWant) > 8) { camTgt.copy(camWant); camInit = true; }
    else { const kxz = 1 - Math.exp(-16 * dt), ky = 1 - Math.exp(-9 * dt); camTgt.x += (camWant.x - camTgt.x) * kxz; camTgt.z += (camWant.z - camTgt.z) * kxz; camTgt.y += (camWant.y - camTgt.y) * ky; }
    let d = want;
    const cp = Math.cos(CAM.pitch), dir = V3(Math.sin(CAM.yaw) * cp, Math.sin(CAM.pitch), Math.cos(CAM.yaw) * cp);
    for (let s = 0.6; s <= want; s += 0.3) { const q = camTgt.clone().addScaledVector(dir, s); if (solidAt(q.x, q.y, q.z)) { d = Math.max(0.8, s - 0.4); break; } }
    camReach = Math.min(d, damp(camReach ?? d, d, 3.2, dt)); d = camReach;   // pull in at once, ease back out
    const goal = camTgt.clone().addScaledVector(dir, d);
    camPos.lerp(goal, 1 - Math.exp(-14 * dt));
    camera.position.copy(camPos);
    if (shake > 0) { const T = t * 31; camera.position.x += Math.sin(T * 1.13) * shake * 0.5; camera.position.y += Math.sin(T * 1.71 + 1) * shake * 0.5; shake = Math.max(0, shake - dt * 1.5); }
    camera.lookAt(camTgt);
  }

  function updateBattle(dt) {
    const near = Math.max(0, 1 - Math.max(0, -P.pos.z - WALL_R) / 50);   // 1 at the gate, 0 well outside
    war.update(dt, t, P.pos);
    // sparks where nothing was — anomalies in the air; closer to Tanoc the further out he goes
    G_spark -= dt;
    if (G_spark <= 0) {
      G_spark = 0.15 + rng() * 0.5;
      let x, y, z;
      if (P.pos.z < -WALL_R - 2 && rng() < 0.6) { const a = rng() * TAU, r = 6 + rng() * 22 * (1 - Math.min(1, outT / 14)) + 4; x = P.pos.x + Math.cos(a) * r; z = P.pos.z - Math.abs(Math.sin(a)) * r; y = heightAt(x, z) + rng() * 6; }
      else { x = BATTLE.x + (rng() - 0.5) * 220; z = BATTLE.z + (rng() - 0.5) * 160; y = heightAt(x, z) + rng() * 40; }
      flash(x, y, z, 5 + rng() * 9, rng() < 0.5 ? 0xbfe8ff : 0xffe0a0, 0.35);
      particles.burst(x, y, z, 14, { color: rng() < 0.5 ? 0x9af0ff : 0xffd080, speed: 9, size: 0.5, life: 0.6, gravity: -6 });
      if (Math.hypot(x - P.pos.x, z - P.pos.z) < 40) { sfx.blink(); shake = Math.max(shake, 0.15); }
    }
    // the Firefall: embers raining out of the battle
    for (let k = 0; k < 3; k++) particles.emit(BATTLE.x + (rng() - 0.5) * 260, 60 + rng() * 40, BATTLE.z + (rng() - 0.5) * 200, { vx: (rng() - 0.5) * 2, vy: -14 - rng() * 8, vz: 4, color: rng() < 0.5 ? 0xff9a3a : 0xffe08a, size: 1.1, life: 4, drag: 0 });
    // the distant thunder of it
    G_boom -= dt;
    if (G_boom <= 0) { G_boom = 2.5 + rng() * 4; if (near > 0.2 || P.pos.y > 15) sfx.slam(); }
  }
  let G_spark = 0, G_boom = 1;

  function updateFolk(dt) {
    for (const p of folk) {
      let speed = 0;
      if (p.run && p.delay > 0) p.delay -= dt;
      else if (p.run) {
        const tx = p.pos.z > -WALL_R - 4 ? 0 : p.pos.x, tz = p.pos.z - 10;
        const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz) || 1;
        p.pos.x += dx / d * 7.5 * dt; p.pos.z += dz / d * 7.5 * dt; p.pos.y = groundAt(p.pos.x, p.pos.z, p.pos.y + 1);
        p.a.root.rotation.y = Math.atan2(dx, dz); speed = 7.5;
        if (p.pos.z < -150) { p.run = false; p.a.root.visible = false; }
      } else if (p.look) {
        const want = Math.atan2(-p.pos.x * 0.15, -WALL_R - 100 - p.pos.z);
        p.a.root.rotation.y = dampAngle(p.a.root.rotation.y, want, 2, dt);
      } else if (p === warden) {
        const want = stage === 'spire' ? Math.atan2(P.pos.x - p.pos.x, P.pos.z - p.pos.z) : Math.PI;
        p.a.root.rotation.y = dampAngle(p.a.root.rotation.y, want, 3, dt);
      }
      p.a.animate(dt, { speed, onGround: true, t: t + p.ph });
    }
  }

  function update(dt, playing) {
    t += dt;
    skyMat.uniforms.uT.value = t;
    updatePlayer(dt, playing);
    updateFolk(dt);
    crowd.update(dt, t, { sky: V3(BATTLE.x, 40, BATTLE.z) });
    kit.update(t, dt, particles);
    fountain.update(dt, t, particles, [P.pos]);
    updateBattle(dt);
    banners.forEach(b => { b.rotation.x = Math.sin(t * 2 + b.userData.ph) * 0.12; });
    if (seaBits.boats) seaBits.boats.forEach((b, i) => { b.position.y = SEA_Y + 0.1 + Math.sin(t * 1.2 + i * 1.7) * 0.12; b.rotation.z = Math.sin(t * 0.9 + i) * 0.04; });
    lamps.forEach((l, i) => { l.material.opacity = 0.75 + Math.sin(t * 5 + i) * 0.12; });
    beacon.material.opacity = 0.6 + Math.sin(t * 4) * 0.3;
    particles.update(dt);
    // wind-blown dust near the camera
    if (Math.random() < 0.4) particles.emit(camPos.x + (Math.random() - 0.5) * 40, camPos.y + (Math.random() - 0.5) * 12, camPos.z + (Math.random() - 0.5) * 40, { vx: 0.2, vy: 0.1, vz: -0.6, color: 0xffc890, size: 0.14, life: 5, drag: 0 });

    if (playing) {
      if (stage === 'home' && said === 0) { said = -1; ctx.say(B4.mom, () => ctx.objective(B4.basketObj, B4.basketHint)); }
      if (stage === 'home' && P.pos.z < -WALL_R + 5 && Math.abs(P.pos.x) < 6 && !G_warned) { G_warned = true; ctx.say([STORY.PROLOGUE.guard[0]]); }
      if (stage === 'drill') drillTick(dt);
      if (stage === 'spire') {
        if (said === 0) { said = 1; ctx.say(STORY.PROLOGUE.start); }
        if (P.pos.y > 6 && barkI === 0) { barkI = 1; ctx.bark('tanoc', STORY.PROLOGUE.barks[0], 3.5); }
        if (P.pos.y > 14 && barkI === 1) { barkI = 2; ctx.bark('tanoc', STORY.PROLOGUE.barks[1], 3.5); }
        if (P.pos.y > 22 && barkI === 2) { barkI = 3; ctx.bark('tanoc', STORY.PROLOGUE.barks[2], 3.5); }
        if (P.pos.y > SPIRE_TOP - 0.3 && P.onGround) topReached();
        // the warden turns you back at the gate until you've seen it from the top
        if (P.pos.z < -WALL_R + 5 && Math.abs(P.pos.x) < 6 && !G_warned) { G_warned = true; ctx.say([STORY.PROLOGUE.guard[0]], () => ctx.hint('The spire, then — nobody’s guarding that.')); }
      } else if (stage === 'gate' || stage === 'out') {
        if (P.pos.z < -WALL_R - 3) {
          if (stage === 'gate') { stage = 'out'; ctx.objective(STORY.PRO_OBJ.gate, ''); }
          outT += dt;
          const steps = [-WALL_R - 4, -WALL_R - 16, -WALL_R - 28];
          steps.forEach((z, i) => { if (P.pos.z < z && said < i + 2) { said = i + 2; ctx.bark('tale', STORY.PROLOGUE.outside[i], 4); } });
          if (P.pos.z < -WALL_R - 38 || outT > 40) caught();
        }
      }
    }
    if (stage === 'caught') {
      caughtT += dt;
      shake = Math.max(shake, 0.5);
      tear.scale.setScalar(2 + caughtT * caughtT * 30);
      tear.material.opacity = 1;
      particles.burst(tear.position.x, tear.position.y, tear.position.z, 6, { color: 0xffffff, speed: 14, size: 0.8, life: 0.6 });
      ctx.whiteness(clamp((caughtT - 0.6) / 1.4, 0, 1));
      if (caughtT > 2.4 && !done) { done = true; ctx.onCaught(); }
    }
    if (!cine.update(dt)) updateCamera(dt);
    // the sun follows the boy around for its shadows
    sun.position.copy(P.pos).addScaledVector(SUN, 140); sun.target.position.copy(P.pos);
  }
  let G_warned = false;

  function render() { composer.render(); }
  /* the opening, before you have him: over the city at sunset, out to the war, the Ahoac at the gate, down to the boy */
  function intro(done) {
    const C = STORY.PROLOGUE.cards;
    cine.play([
      { dur: 7, from: { p: [80, 84, 150], l: [0, 22, -30] }, to: { p: [46, 64, 104], l: [0, 34, -90] }, caption: [C[0], C[1]] },
      { dur: 6, from: { p: [-70, 38, -80], l: [0, 46, -160] }, to: { p: [-24, 54, -96], l: [24, 50, -170] }, caption: C[2], onStart: () => { war.reveal(war.fighters[0], 1.5); setTimeout(() => war.reveal(war.fighters[1], 1.2), 2600); } },
      { dur: 5, from: { p: [15, 5, -40], l: [0, 2.2, -31] }, to: { p: [9, 3.6, -43], l: [0, 2.4, -32] }, caption: C[3] },
      { dur: 6, from: { p: [16, 11, 70], l: [PLAZA.x, 1.5, PLAZA.z] }, to: { p: [5, 3.3, 54], l: [P.pos.x, 1.6, P.pos.z] }, caption: C[4] },
    ], () => { camPos.copy(camera.position); done && done(); });
  }

  function dispose() {
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
    composer.dispose && composer.dispose();
  }

  return { intro, skip: () => cine.skip(), get cinematic() { return cine.active; }, scene, update, render, interact, prompt, jump, resize, dispose, get stage() { return stage; }, P, debug: { topReached, startGateStage, caught, cine, solidAt, heightAt, DR, captain } };
}
