/* ============================================================
   THE ROAD NORTH — Tanoc's first days on Xikia.
   He wakes in Fyrsti'Vilag (Xikia's city of that name) in front of
   the Carpenter's stall; the Angels leave; the amulets fall; and
   then six days on the road north with Buhkon Eldi:
     Day 1  the low country, a Kofi on the road, the fire-stone's trigger
     Day 2  the forest; hunting alone; the Punk that followed them
     Day 3  rain at camp, and the Carpenter talks
     Day 4  the mountain pass, and a Rodak pack that won't wait
   Days 5 and 6 — Beuhk, and the little road up to the Carpenter's
   hill — happen in the Beuhk page itself.

   A scene of its own, like Velki: its own long strip of land from the
   city to the pass, a light walker, simple fights. main.js lends it
   the renderer, camera, input, dialogue and cards.
   ============================================================ */
import * as THREE from 'three';
import { toon, addOutline, outlineAll, glowSprite, Particles } from './gfx.js';
import { buildEikar } from './actors.js';
import { buildWildPunk, buildKofi, buildRodak } from './esik_land.js';
import { NPC_LOOKS } from './npcs.js';
import { buildAngel, buildSniller } from './velki.js';
import { clamp, damp, dampAngle, smooth, lerp, mulberry32, fbm } from './util.js';
import * as STORY from './story.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

/* ---------------- the lay of the land ---------------- */
const CITY = { x: 0, z: 70 }, CITY_R = 56, GATE_Z = CITY.z - CITY_R;     // the north gate
const SQUARE = { x: 0, z: 70 }, STALL = { x: 6, z: 58 };
const CAMP1 = { z: -250 }, CAMP2 = { z: -560 }, PASS0 = -650, AMBUSH = -800, END = -960;
const roadX = z => (z > GATE_Z ? 0 : 16 * Math.sin((GATE_Z - z) * 0.009) + 8 * Math.sin((GATE_Z - z) * 0.023));
const zone = z => (z > GATE_Z ? 'city' : z > -300 ? 'low' : z > PASS0 ? 'forest' : 'pass');
function baseH(z) {
  if (z > GATE_Z) return 0;
  if (z > -300) return lerp(0, 4, smooth(GATE_Z, -300, z));
  if (z > PASS0) return lerp(4, 34, smooth(-300, PASS0, z));
  if (z > -830) return lerp(34, 72, smooth(PASS0, -830, z));
  return lerp(72, 56, smooth(-830, END, z));
}
function heightAt(x, z) {
  if (z > GATE_Z - 4 && Math.hypot(x - CITY.x, z - CITY.z) < CITY_R + 4) return 0;
  const lat = Math.abs(x - roadX(z)), zz = zone(z);
  const walls = zz === 'pass' ? 75 : zz === 'forest' ? 20 : 6;
  let h = baseH(z) + smooth(14, 70, lat) * walls * (0.7 + 0.6 * fbm(x * 0.02 + 3, z * 0.02, 3));
  h += (fbm(x * 0.05, z * 0.05, 2) - 0.5) * (zz === 'pass' ? 3 : 1.4) * smooth(5, 14, lat);
  if (z > GATE_Z - 30) h = lerp(h, 0, smooth(GATE_Z - 30, GATE_Z, z));
  return h;
}

/* ================================================================ */
export function createRoad(ctx) {
  const { camera, keys, touch, CAM, sfx } = ctx;
  const scene = new THREE.Scene();
  const rng = mulberry32(611);
  const fog = new THREE.Fog(0xcfe0f0, 120, 700); scene.fog = fog;

  /* ---------------- sky: Xikia by day, and dusk at the camps ---------------- */
  const skyU = { uTop: { value: new THREE.Color(0x4a8ad8) }, uLow: { value: new THREE.Color(0xd8ecff) }, uSun: { value: V3(0.3, 0.8, 0.2).normalize() }, uWarm: { value: 0 } };
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 uTop, uLow, uSun; uniform float uWarm;
      void main(){ float h = max(vD.y, 0.0); vec3 c = mix(uLow, uTop, smoothstep(0.0, 0.6, h));
        float s = max(dot(vD, uSun), 0.0); c += vec3(1.0, 0.8 - uWarm * 0.3, 0.5 - uWarm * 0.3) * (pow(s, 8.0) * 0.4 + pow(s, 300.0) * 1.5);
        if (vD.y < 0.0) c = uLow * 0.8; gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMat); scene.add(sky);
  // Velki hangs in Xikia's sky — the boy's whole world, up there
  const velki = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 20), new THREE.MeshBasicMaterial({ color: 0x8fc4e8, fog: false }));
  scene.add(velki);
  const velkiGlow = glowSprite(0x9fd6ff, 1500, 0.35); velkiGlow.material.fog = false; scene.add(velkiGlow);
  const kalo = [[700, 1100, -2300, 70, 0xe8e0d0], [-1500, 900, -2100, 50, 0xd8c8b8]].map(([x, y, z, r, c]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshBasicMaterial({ color: c, fog: false })); m.userData.off = V3(x, y, z); scene.add(m); return m; });

  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x5a6a3a, 1.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.3); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
  const SUN_DIR = V3(0.3, 0.8, 0.2).normalize();
  /* how late in the day: 0 noon, 1 dusk */
  let warm = 0;
  function setDusk(k) {
    warm = k;
    skyU.uTop.value.set(0x4a8ad8).lerp(new THREE.Color(0x2a2058), k);
    skyU.uLow.value.set(0xd8ecff).lerp(new THREE.Color(0xffa070), k);
    skyU.uWarm.value = k;
    SUN_DIR.set(lerp(0.3, -0.8, k), lerp(0.8, 0.12, k), lerp(0.2, -0.3, k)).normalize(); skyU.uSun.value.copy(SUN_DIR);
    sun.color.set(0xfff0d8).lerp(new THREE.Color(0xff8a4a), k); sun.intensity = lerp(2.3, 1.2, k);
    hemi.intensity = lerp(1.2, 0.7, k); fog.color.set(0xcfe0f0).lerp(new THREE.Color(0xc07a6a), k);
  }

  /* ---------------- ground: one long strip from the city to the pass ---------------- */
  {
    const W = 300, L = 1260, geo = new THREE.PlaneGeometry(W, L, 120, 504); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, 160 - L / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color();
    const pave = new THREE.Color(0xd8c8a8), dirt = new THREE.Color(0xc9a06a), grass = new THREE.Color(0x8fbf52), grass2 = new THREE.Color(0xb8c45a),
      forest = new THREE.Color(0x4f7a3c), rock = new THREE.Color(0x8e8578), snow = new THREE.Color(0xf2f2f6), soil = new THREE.Color(0x7a5232);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = heightAt(x, z);
      pos.setY(i, y);
      const zz = zone(z), lat = Math.abs(x - roadX(z));
      c.copy(grass).lerp(grass2, fbm(x * 0.03, z * 0.03, 2));
      if (zz === 'low' && Math.sin(x * 0.08) > 0.6 && lat > 16 && lat < 50) c.lerp(soil, 0.6);         // farm strips
      if (zz === 'forest') c.lerp(forest, 0.75);
      if (zz === 'pass') c.lerp(rock, smooth(0, 30, y - 30));
      c.lerp(snow, smooth(85, 110, y));
      if (z > GATE_Z && Math.hypot(x - CITY.x, z - CITY.z) < CITY_R) c.copy(pave);
      else c.lerp(dirt, smooth(4, 2, lat) * 0.9);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true })); ground.receiveShadow = true; scene.add(ground);
  }

  /* ---------------- colliders (boxes and posts with a top and bottom) ---------------- */
  const solids = [];
  const box = (x, z, hw, hd, y0, y1) => { const s = { kind: 'box', x, z, hw, hd, y0, y1 }; solids.push(s); return s; };
  const cyl = (x, z, r, y0, y1) => { const s = { kind: 'cyl', x, z, r, y0, y1 }; solids.push(s); return s; };
  const STEP = 0.65, PR = 0.4, PH = 1.5;
  function groundAt(x, z, y) {
    let g = heightAt(x, z);
    for (const s of solids) {
      if (Math.abs(x - s.x) > 12 || Math.abs(z - s.z) > 12) continue;
      if (s.y1 > y + STEP || s.y1 <= g) continue;
      if (s.kind === 'box' ? Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd : Math.hypot(x - s.x, z - s.z) < s.r) g = s.y1;
    }
    return g;
  }
  function resolve(p, rad = PR) {
    for (const s of solids) {
      if (p.y + PH < s.y0 || p.y >= s.y1 - STEP) continue;
      if (Math.abs(p.x - s.x) > 12 || Math.abs(p.z - s.z) > 12) continue;
      if (s.kind === 'box') {
        const dx = p.x - s.x, dz = p.z - s.z, ox = s.hw + rad - Math.abs(dx), oz = s.hd + rad - Math.abs(dz);
        if (ox > 0 && oz > 0) { if (ox < oz) p.x += Math.sign(dx || 1) * ox; else p.z += Math.sign(dz || 1) * oz; }
      } else {
        const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), m = s.r + rad;
        if (d < m) { if (d < 1e-4) p.x += m; else { p.x = s.x + dx / d * m; p.z = s.z + dz / d * m; } }
      }
    }
    // the city wall, with its north gate; out on the road, the valley sides
    const dc = Math.hypot(p.x - CITY.x, p.z - CITY.z);
    if (dc > CITY_R - 2 && dc < CITY_R + 2 && !(Math.abs(p.x) < 5 && p.z < CITY.z)) { const to = dc < CITY_R ? CITY_R - 2 : CITY_R + 2; p.x = CITY.x + (p.x - CITY.x) * to / dc; p.z = CITY.z + (p.z - CITY.z) * to / dc; }
    if (p.z < GATE_Z - 2) { const rx = roadX(p.z), lim = zone(p.z) === 'pass' ? 30 : 48; if (Math.abs(p.x - rx) > lim) p.x = rx + Math.sign(p.x - rx) * lim; }
    if (p.z > CITY.z + CITY_R - 2) p.z = CITY.z + CITY_R - 2;
    if (p.z < END + 10) p.z = END + 10;
  }
  function solidAt(x, y, z) {
    for (const s of solids) {
      if (Math.abs(x - s.x) > 12 || Math.abs(z - s.z) > 12) continue;
      if (y < s.y0 || y > s.y1) continue;
      if (s.kind === 'box' ? Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd : Math.hypot(x - s.x, z - s.z) < s.r) return true;
    }
    return y < heightAt(x, z) + 0.2;
  }

  /* ---------------- Fyrsti'Vilag, on Xikia ---------------- */
  const stone = [0xf0dcb4, 0xe8c89a, 0xf4e6c8, 0xdcc0a0], caps = [0x7a4a2a, 0x6a3a1c, 0x8a5a2a];
  function house(x, z) {
    const w = 5 + rng() * 3, d = 5 + rng() * 3, h = 4 + rng() * 2.5;
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(stone[Math.floor(rng() * 4)])); b.position.y = h / 2; g.add(b);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(Math.max(w, d) * 0.72, 16, 8, 0, TAU, 0, Math.PI / 2), toon(caps[Math.floor(rng() * 3)])); cap.scale.y = 0.75; cap.position.y = h; g.add(cap);
    g.rotation.y = Math.round(Math.atan2(CITY.x - x, CITY.z - z) / (Math.PI / 2)) * (Math.PI / 2);
    outlineAll(g, 0.035); g.traverse(m => { if (m.isMesh && m.name !== 'outline') { m.castShadow = true; m.receiveShadow = true; } }); scene.add(g);
    const sw = Math.abs(Math.sin(g.rotation.y)) > 0.5;
    box(x, z, (sw ? d : w) / 2, (sw ? w : d) / 2, -1, h + 2);
  }
  for (let ring = 0; ring < 3; ring++) {
    const R = 24 + ring * 10, n = 10 + ring * 4;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + ring * 0.3 + rng() * 0.1, x = CITY.x + Math.cos(a) * R, z = CITY.z + Math.sin(a) * R;
      if (Math.abs(x) < 7 && z < CITY.z) continue;          // the street to the north gate
      house(x, z);
    }
  }
  {
    const wm = toon(0xc8b08a), N = 64;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU, x = CITY.x + Math.cos(a) * CITY_R, z = CITY.z + Math.sin(a) * CITY_R;
      if (Math.abs(x) < 6 && z < CITY.z) continue;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(2.6, 8, CITY_R * TAU / N + 0.3), wm); seg.position.set(x, 4, z); seg.rotation.y = -a; seg.castShadow = true; scene.add(seg);
    }
    for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 12, 12), wm); t.position.set(s * 7.5, 6, GATE_Z + 0.5); addOutline(t, 0.05); scene.add(t); cyl(s * 7.5, GATE_Z + 0.5, 2.5, -1, 14); }
  }
  // the market: a fountain and a ring of stalls round the square
  const stalls = [];
  {
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.8, 24), toon(0xcab088)); pool.position.set(SQUARE.x, 0.4, SQUARE.z + 4); addOutline(pool, 0.04); scene.add(pool); cyl(SQUARE.x, SQUARE.z + 4, 3.5, -1, 0.8);
    const water = new THREE.Mesh(new THREE.CircleGeometry(3.1, 24), toon(0x4aa6c4, { emissive: 0x0e4a62, emissiveIntensity: 0.4 })); water.rotation.x = -Math.PI / 2; water.position.set(SQUARE.x, 0.82, SQUARE.z + 4); scene.add(water);
    const awn = [0xc0392b, 0x2f6f8a, 0xd9a441, 0x5a8a3a, 0x8a3a6a];
    const spots = [[STALL.x, STALL.z], [-10, 62], [-13, 74], [-6, 84], [8, 84], [14, 74], [13, 62]];
    spots.forEach(([x, z], i) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(SQUARE.x - x, SQUARE.z - z);
      const table = new THREE.Mesh(new THREE.BoxGeometry(3, 1.05, 1.4), toon(0x8a5a36)); table.position.y = 0.52; g.add(table);
      for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 5), toon(0x5a3a20)); p.position.set(s * 1.4, 1.3, -0.6); g.add(p); }
      const aw = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 2.0), toon(awn[i % awn.length])); aw.position.set(0, 2.6, -0.1); aw.rotation.x = 0.2; g.add(aw);
      if (i === 0) for (let k = 0; k < 3; k++) { const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), toon(0x9a6a40)); crate.position.set(-1 + k * 0.8, 1.35, 0); g.add(crate); }   // the Carpenter's wares
      else for (let k = 0; k < 4; k++) { const good = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), toon([0xe08a3a, 0xd04a3a, 0xe8c84a, 0x6aa04a][k])); good.position.set(-1 + k * 0.65, 1.15, 0.1); g.add(good); }
      outlineAll(g, 0.03); g.traverse(m => { if (m.isMesh && m.name !== 'outline') m.castShadow = true; }); scene.add(g);
      const sw = Math.abs(Math.sin(g.rotation.y)) > 0.7;
      box(x, z, sw ? 0.7 : 1.5, sw ? 1.5 : 0.7, -1, 1.05);
      stalls.push({ x, z, g });
    });
  }

  /* ---------------- the road: hedges, farms, forest, pass ---------------- */
  {
    const trunkG = new THREE.CylinderGeometry(0.35, 0.5, 1, 6), crownG = new THREE.IcosahedronGeometry(1, 0), coneG = new THREE.ConeGeometry(1, 1, 7);
    const trunks = [], crowns = [], cones = [], rocks = [];
    const tree = (x, z, s, pine) => {
      const g = heightAt(x, z), h = (pine ? 7 : 4.5) * s;
      trunks.push([x, g + h * 0.5 - 0.3, z, s, h]);
      if (pine) { cones.push([x, g + h * 0.75, z, 2.4 * s, h * 0.9]); cones.push([x, g + h * 1.05, z, 1.6 * s, h * 0.6]); }
      else for (let k = 0; k < 3; k++) crowns.push([x + (rng() - 0.5) * 2 * s, g + h + (rng() - 0.3) * 1.4 * s, z + (rng() - 0.5) * 2 * s, (1.6 + rng()) * s]);
      cyl(x, z, 0.45 * s, g - 1, g + h);
    };
    for (let i = 0; i < 2600; i++) {
      const z = GATE_Z - 20 - rng() * (GATE_Z - END + 20), zz = zone(z), rx = roadX(z), side = rng() < 0.5 ? -1 : 1;
      const lat = 6 + Math.pow(rng(), zz === 'forest' ? 0.8 : 1.4) * 60, x = rx + side * lat;
      if (zz === 'low' && rng() > 0.08) continue;
      if (zz === 'pass' && rng() > 0.25) continue;
      if (zz === 'forest' && lat < 7) continue;
      if (Math.abs(z - CAMP1.z) < 14 && lat < 16) continue;
      if (Math.abs(z - CAMP2.z) < 18 && lat < 20) continue;
      tree(x, z, 0.8 + rng() * 0.9, zz !== 'low' && rng() < 0.7);
    }
    // the hedge-oak at the first camp
    tree(roadX(CAMP1.z) + 9, CAMP1.z - 3, 2.2, false);
    for (let i = 0; i < 160; i++) {
      const z = PASS0 + 20 - rng() * (PASS0 - END), x = roadX(z) + (rng() - 0.5) * 70, s = 0.6 + Math.pow(rng(), 2) * 3;
      if (Math.abs(x - roadX(z)) < 5) continue;
      rocks.push([x, heightAt(x, z) + s * 0.3, z, s]); if (s > 1.3) cyl(x, z, s * 0.8, heightAt(x, z) - 1, heightAt(x, z) + s);
    }
    const inst = (geo, mat, list, put) => { const m = new THREE.InstancedMesh(geo, mat, list.length); const o = new THREE.Object3D(); list.forEach((v, i) => { put(o, v); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
    inst(trunkG, toon(0x6b4128), trunks, (o, [x, y, z, s, h]) => { o.position.set(x, y, z); o.scale.set(s, h, s); o.rotation.set(0, 0, 0); });
    inst(crownG, toon(0x6aa040), crowns, (o, [x, y, z, r]) => { o.position.set(x, y, z); o.scale.set(r, r * 0.85, r); o.rotation.set(rng(), rng(), rng()); });
    inst(coneG, toon(0x2f6a3a), cones, (o, [x, y, z, r, h]) => { o.position.set(x, y, z); o.scale.set(r, h, r); o.rotation.set(0, rng() * 6, 0); });
    inst(new THREE.DodecahedronGeometry(1, 0), toon(0x9a9284), rocks, (o, [x, y, z, s]) => { o.position.set(x, y, z); o.scale.set(s * 1.2, s * 0.75, s); o.rotation.set(rng() * 3, rng() * 3, 0); });
  }
  // campfires
  const camps = [CAMP1, CAMP2].map(c => {
    const x = roadX(c.z) + 6, z = c.z, y = heightAt(x, z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.22, 5, 10), toon(0x7a6a5a)); ring.rotation.x = -Math.PI / 2; ring.position.set(x, y + 0.1, z); scene.add(ring);
    const fire = glowSprite(0xff8a3a, 2.6, 0.95); fire.position.set(x, y + 0.7, z); scene.add(fire);
    const light = new THREE.PointLight(0xff8a3a, 0, 18); light.position.set(x, y + 1.2, z); scene.add(light);
    return { x, z, y, fire, light, on: false };
  });

  /* ---------------- particles and post ---------------- */
  const particles = new Particles(scene, 2500);
  const composer = ctx.makeComposer(scene);
  function resize() { particles.setScale(innerHeight * Math.min(devicePixelRatio, 1.75) * 0.9); }
  resize();

  /* ---------------- the cast ---------------- */
  const tanoc = buildEikar({
    skin: '#8a5a3a', cap: '#4a3020', marking: 0xffb04a, markColor: 0x2a1208, emblem: 0xc89aff, build: 0.92, capTall: 0.66,
    weapon: 'axe', flasks: false, leg: 0x4a3420, foot: 0x2a1a0c, beltColor: 0x5a3a1c, tunic: 0x7a5a3a, trim: 0xc89a5a, scale: 0.86,
  });
  { const bl = tanoc.weapon.userData.blade; if (bl) { bl.material.color.setHex(0x9a9aa2); bl.material.emissiveIntensity = 0; } if (tanoc.weapon.userData.glow) tanoc.weapon.userData.glow.visible = false; }
  scene.add(tanoc.root);
  const buhkon = buildEikar(NPC_LOOKS.buhkon); scene.add(buhkon.root);
  const punk = buildWildPunk({ seed: 31 }); punk.root.scale.multiplyScalar(0.6); scene.add(punk.root);
  const P = { pos: V3(), vel: V3(), yaw: 0, onGround: true, coyote: 0, jumpBuf: 0, stepPh: 0, hp: 100, swing: 0, hitDone: false, iframes: 0 };
  const B = { pos: V3(), yaw: 0, stay: null, cd: 0, swing: 0 };                     // the Carpenter
  const K = { pos: V3(0, -50, 0), yaw: 0, on: false, cd: 0, swing: 0 };            // the Punk, once it's with them
  const foes = [];
  const camPos = V3(), camTgt = V3();
  let shake = 0, t = 0;

  /* ---------------- the beat of it ---------------- */
  let stage = '', sub = '', done = false;
  const R = STORY.ROAD, PRO = STORY.ARRIVAL;
  const beacon = glowSprite(0xffd27a, 3, 0.9); scene.add(beacon); beacon.visible = false;
  const goal = V3(); let goalOn = false;
  function setGoal(x, y, z) { goal.set(x, y, z); goalOn = x != null; beacon.visible = goalOn; if (goalOn) beacon.position.set(x, y + 3, z); }
  const items = [];   // things to pick up: { pos, label, act, mesh }
  function addItem(pos, label, act, mesh) { const it = { pos, label, act, mesh }; items.push(it); if (mesh) { mesh.position.copy(pos); scene.add(mesh); } return it; }
  function dropItem(it) { const i = items.indexOf(it); if (i >= 0) items.splice(i, 1); if (it.mesh) scene.remove(it.mesh); }
  const amuletMesh = () => {
    const g = new THREE.Group();
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), toon(0x6af0e0, { emissive: 0x2aa0a0, emissiveIntensity: 0.8 })); addOutline(gem, 0.03); g.add(gem);
    for (const s of [-1, 1]) { const horn = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 5, 10, Math.PI * 0.8), toon(0x9aa8b0)); horn.position.x = s * 0.3; horn.rotation.z = s > 0 ? -0.6 : Math.PI + 0.6; g.add(horn); }
    g.add(glowSprite(0x6af0e0, 1.3, 0.3)); return g;
  };
  let MK = null;   // the market's own state

  function place(o, x, z, yaw = 0) { o.pos.set(x, groundAt(x, z, 60), z); o.yaw = yaw; }

  /* ===== the market, in Fyrsti'Vilag ===== */
  function startMarket() {
    stage = 'market'; sub = 'wake'; ctx.save('market');
    setDusk(0);
    const fx = SQUARE.x - STALL.x, fz = SQUARE.z - STALL.z, fd = Math.hypot(fx, fz), f = { x: fx / fd, z: fz / fd };
    place(P, STALL.x + f.x * 2.6, STALL.z + f.z * 2.6, Math.atan2(-f.x, -f.z));
    place(B, STALL.x - f.x * 1.4, STALL.z - f.z * 1.4, Math.atan2(f.x, f.z)); B.stay = B.pos.clone();
    CAM.yaw = Math.atan2(f.x, f.z); CAM.pitch = 0.22;
    tanoc.hat.visible = false; tanoc.weapon.visible = false;
    MK = { n: 0, punk: null, calmed: false, hat: null, angel: null, sniller: null, leaving: 0, amulets: [], t: 0, folk: [] };
    for (let i = 0; i < 18; i++) {   // the market crowd
      const a = rng() * TAU, r = 7 + rng() * 14, x = SQUARE.x + Math.cos(a) * r, z = SQUARE.z + Math.sin(a) * r;
      if (solidAt(x, 0.5, z)) continue;
      const looks = [{ skin: '#c89a6a', cap: '#6a3a1a', tunic: 0xd8b878 }, { skin: '#a8743e', cap: '#5a3018', tunic: 0x5a6a8a }, { skin: '#9a6a40', cap: '#3a2414', tunic: 0x8a4a3a }];
      const a2 = buildEikar(Object.assign({ weapon: 'none', flasks: false, scale: 0.92 + rng() * 0.14 }, looks[i % 3])); scene.add(a2.root);
      const p = { a: a2, pos: V3(x, 0, z), goal: null, wait: rng() * 3, ph: rng() * 9, panic: false }; MK.folk.push(p);
    }
    ctx.blur(7);
    ctx.cards(PRO.cards, 3400, () => {
      ctx.play();
      ctx.location(...R.loc);
      const W = PRO.wake;
      ctx.say(W.slice(0, 5), () => {
        tanoc.hat.visible = true; ctx.blur(0); sfx.heal();
        ctx.say(W.slice(5).concat(PRO.focus.slice(0, 2), R.wakeExtra, PRO.focus.slice(2)), () => { sub = 'pack'; MK.t = 4; objective('Help the Carpenter pack his stall'); ctx.bark('buhkon', 'Crates first. Then the awning. Quick hands.', 3.5); });
      });
    });
  }
  function marketMaterialize() {
    sub = 'hat';
    MK.angel = buildAngel(1.6); MK.angel.position.set(SQUARE.x - 7, 7, SQUARE.z - 2); scene.add(MK.angel);
    MK.sniller = buildSniller(1.5); MK.sniller.position.set(SQUARE.x + 7, 6, SQUARE.z - 4); scene.add(MK.sniller);
    for (const m of [MK.angel, MK.sniller]) { m.rotation.y = Math.atan2(P.pos.x - m.position.x, P.pos.z - m.position.z); particles.burst(m.position.x, m.position.y + 3, m.position.z, 50, { color: m === MK.angel ? 0xfff0c0 : 0x6af0e0, speed: 16, size: 0.9, life: 0.9 }); }
    particles.ring(P.pos.x, P.pos.y + 0.4, P.pos.z, 48, 14, { color: 0xffffff, size: 0.6, life: 0.7 });
    sfx.duat(); sfx.slam(); shake = 1;
    tanoc.hat.visible = false;
    const hat = tanoc.hat.clone(); const ws = V3(); tanoc.hat.getWorldScale(ws); hat.scale.copy(ws); hat.visible = true;
    const a = P.yaw + 2.3, hp = V3(P.pos.x + Math.sin(a) * 2.6, 0, P.pos.z + Math.cos(a) * 2.6); hp.y = groundAt(hp.x, hp.z, 3) + 0.05;
    hat.rotation.set(0.5, a, 0.3);
    MK.hat = addItem(hp, 'Put your hat back on', () => marketHatOn(), hat);
    ctx.blur(6);
    ctx.say(PRO.materialize.concat(PRO.freeze), () => objective(STORY.PRO_OBJ.hat, 'Walk to it and press E'));
  }
  function marketHatOn() {
    dropItem(MK.hat); MK.hat = null; tanoc.hat.visible = true; ctx.blur(0); sfx.heal();
    const s = MK.sniller.position;
    particles.burst(s.x, s.y + 3, s.z, 70, { color: 0x6af0e0, speed: 12, size: 0.8, life: 1.2, gravity: -4 });
    scene.remove(MK.sniller); MK.sniller = null; sfx.core(); MK.leaving = 0.001;
    // the rain of amulets
    const spots = [[-10, 62], [8, 84]];
    for (let i = 0; spots.length < 8 && i < 40; i++) { const a = i * 2.39996 + 0.7, r = 6 + (i % 4) * 4.5, x = SQUARE.x + Math.cos(a) * r, z = SQUARE.z + Math.sin(a) * r; if (Math.hypot(x - STALL.x, z - STALL.z) < 4 || Math.hypot(x - SQUARE.x, z - SQUARE.z - 4) < 4.5 || solidAt(x, 0.5, z) || spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 5)) continue; spots.push([x, z]); }
    for (const [x, z] of spots) {
      const it = addItem(V3(x, groundAt(x, z, 2.4) + 0.9, z), 'Pick up the Sniller amulet', null, amuletMesh());
      it.act = () => marketAmulet(it); it.y0 = it.pos.y; MK.amulets.push(it);
    }
    MK.folk.forEach(p => { p.panic = true; });
    sub = 'told';
    ctx.say(PRO.hatBack, () => ctx.say(PRO.bag, () => {
      sub = 'amulets'; tanoc.weapon.visible = true; marketObjective();
      ctx.hint('Amulets glow cold teal. Some sit on stall tables — jump up for them.');
    }));
  }
  function marketAmulet(it) {
    dropItem(it); MK.n++;
    particles.burst(it.pos.x, it.pos.y, it.pos.z, 24, { color: 0x6af0e0, speed: 4, size: 0.4, life: 0.8, gravity: 2 });
    sfx.core(); ctx.toast(`Sniller amulet (${Math.min(MK.n, 6)}/6) — into the Relic-bound bag`, 2.2);
    const say = PRO.amuletSay(MK.n); if (say) ctx.bark('tanoc', say, 3);
    if (MK.n === 2 && !MK.punk) {
      const a = Math.atan2(SQUARE.x - P.pos.x, SQUARE.z - P.pos.z);
      MK.punk = addFoe('wildpunk', P.pos.x + Math.sin(a) * 10, P.pos.z + Math.cos(a) * 10);
      ctx.say(PRO.punk, () => { marketObjective(); ctx.hint('Left-click to swing the hatchet.'); });
    }
    marketObjective(); marketCheck();
  }
  function marketObjective() {
    const O = STORY.PRO_OBJ;
    if (MK.punk && !MK.calmed) objective(O.punk, `Amulets gathered: ${MK.n}/6`, 6, MK.n);
    else objective(O.amulets(Math.min(MK.n, 6)), MK.n >= 6 && !MK.calmed ? 'The little Punk is still loose somewhere' : '', 6, Math.min(MK.n, 6));
  }
  function marketCheck() {
    if (sub !== 'amulets' || MK.n < 6 || !MK.calmed) return;
    sub = 'called';
    ctx.say(PRO.called.slice(0, 2).concat([['buhkon', 'North. Home. Six days on foot, and I’ll tell you what I can on the way.']]), () => {
      ctx.amulets(MK.n);
      ctx.cards(R.leave, 3800, () => startDay1());
    });
  }
  function cleanMarket() {
    if (!MK) return;
    for (const it of MK.amulets) dropItem(it);
    if (MK.angel) scene.remove(MK.angel); if (MK.sniller) scene.remove(MK.sniller);
    for (const p of MK.folk) scene.remove(p.a.root);
    for (const f of foes) scene.remove(f.a.root); foes.length = 0;
    MK = null;
  }

  /* ===== Day 1: the low country, and the fire-stone ===== */
  let D1 = null;
  function startDay1() {
    cleanMarket();
    stage = 'day1'; sub = 'walk'; ctx.save('day1'); ctx.blur(0);
    tanoc.hat.visible = true; tanoc.weapon.visible = true;
    place(P, roadX(GATE_Z - 8), GATE_Z - 8, Math.PI); place(B, roadX(GATE_Z - 6) + 2, GATE_Z - 6, Math.PI); B.stay = null;
    CAM.yaw = 0; CAM.pitch = 0.2; setDusk(0.1);
    D1 = { said: 0, kofi: null, pebble: false, tried: {} };
    ctx.cards(R.day1.cards, 3400, () => {
      ctx.play(); ctx.location('The Road North', 'Day one · the low country');
      ctx.say(R.day1.talk, () => { objective(R.obj.day1, 'Follow the road — the Carpenter keeps pace'); setGoal(camps[0].x, camps[0].y, camps[0].z); });
    });
  }
  function day1Tick() {
    if (sub !== 'walk') return;
    const prog = clamp((GATE_Z - P.pos.z) / (GATE_Z - CAMP1.z), 0, 1);
    setDusk(0.1 + prog * 0.85);
    const marks = [0.15, 0.3, 0.45, 0.7];
    if (D1.said < marks.length && prog > marks[D1.said]) {
      const [who, line] = R.day1.barks[D1.said]; ctx.bark(who, line, 4);
      if (D1.said === 2) { const z = P.pos.z - 14; D1.kofi = addFoe('kofi', roadX(z) + 3, z); }
      D1.said++;
    }
    if (P.pos.distanceTo(V3(camps[0].x, camps[0].y, camps[0].z)) < 9) {
      sub = 'camp'; setGoal(); camps[0].on = true; B.stay = V3(camps[0].x + 2.2, 0, camps[0].z - 1.5);
      ctx.say(R.day1.camp, () => {
        sub = 'stone'; ctx.giveFireStone(false);
        for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4, x = camps[0].x + Math.cos(a) * 3.2, z = camps[0].z + Math.sin(a) * 3.2; const peb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), toon(0xb0a898)); const it = addItem(V3(x, heightAt(x, z) + 0.12, z), 'Pick up a pebble', null, peb); it.act = () => { for (const q of items.filter(q => q.label === 'Pick up a pebble')) dropItem(q); D1.pebble = true; sfx.ui(); ctx.toast('A smooth little pebble.', 2); stoneObjective(); }; }
        stoneObjective();
        ctx.hint('Press E anywhere to try the fire-stone.');
      });
    }
  }
  function stoneObjective() { objective(R.obj.stone, D1.pebble ? 'Try the stone again (E)' : 'Press E to try the stone · pebbles lie by the fire', 0, 0); }
  function tryStone() {
    const S = R.day1;
    ctx.ask('tanoc', S.stoneMenu, [
      { label: 'Press the thumb-dip', act: () => ctx.say(S.press) },
      { label: 'Talk to it', act: () => ctx.say(S.talkTo) },
      { label: D1.pebble ? 'Set the pebble in the dip' : 'Set a little thing in the dip <small>(you need a pebble)</small>', act: () => {
        if (!D1.pebble) { ctx.say(S.noPebble); return; }
        sub = 'lit';
        const from = V3(P.pos.x, P.pos.y + 1.3, P.pos.z), to = V3(camps[0].x + 9 - 2, camps[0].y + 2.5, camps[0].z - 3 + 1);
        for (let k = 0; k < 20; k++) { const q = from.clone().lerp(to, k / 20); particles.emit(q.x, q.y, q.z, { vx: 0, vy: 0.5, vz: 0, color: k % 2 ? 0xff8a2a : 0xffd060, size: 0.6, life: 0.7, drag: 1 }); }
        particles.burst(to.x, to.y, to.z, 30, { color: 0xff8a2a, speed: 6, size: 0.5, life: 0.8 }); sfx.flare();
        ctx.say(S.trigger, () => { ctx.giveFireStone(true); ctx.toast('Fire-stone Relic — its trigger found! It’s yours.', 3.5); startDay2(); });
      } },
      { label: 'Put it away for now', act: null },
    ]);
  }

  /* ===== Day 2: the forest, the hunt, the Punk ===== */
  let D2 = null;
  function startDay2() {
    stage = 'day2'; sub = 'walk'; ctx.save('day2');
    for (const it of items.slice()) dropItem(it);
    camps[0].on = false;
    ctx.cards(R.day2.cards, 3400, () => {
      place(P, roadX(CAMP1.z - 6), CAMP1.z - 6, Math.PI); place(B, roadX(CAMP1.z - 4) + 2, CAMP1.z - 4, Math.PI); B.stay = null;
      CAM.yaw = 0; setDusk(0.05); D2 = { caught: false };
      ctx.play(); ctx.location('The Road North', 'Day two · the forest');
      objective('Climb through the forest with the Carpenter', ''); setGoal(camps[1].x, camps[1].y, camps[1].z);
    });
  }
  function day2Tick() {
    if (sub === 'walk' && P.pos.distanceTo(V3(camps[1].x, camps[1].y, camps[1].z)) < 10) {
      sub = 'send'; setGoal(); camps[1].on = true; B.stay = V3(camps[1].x + 2.2, 0, camps[1].z - 1.5);
      ctx.say(R.day2.send, () => {
        sub = 'hunt';
        for (let k = 0; k < 5; k++) { const a = rng() * TAU, r = 22 + rng() * 26, x = camps[1].x + Math.cos(a) * r, z = camps[1].z + Math.sin(a) * r; addFoe('kofi', x, z); }
        objective(R.obj.hunt, 'Kofi Galta run from everything — cut them off');
      });
    }
    if (sub === 'hunt') {
      const near = foes.filter(f => f.kind === 'kofi' && !f.dead).sort((a, b) => a.pos.distanceTo(P.pos) - b.pos.distanceTo(P.pos))[0];
      if (near) setGoal(near.pos.x, near.pos.y, near.pos.z);
      if (P.pos.distanceTo(V3(camps[1].x, P.pos.y, camps[1].z)) > 75 && (D2.warnT = (D2.warnT || 0) - 1 / 60) <= 0) { D2.warnT = 5; ctx.bark('tanoc', 'I can barely see the smoke. Better turn back a bit.', 3); }
    }
  }
  function kofiCaught() {
    if (stage !== 'day2' || sub !== 'hunt') return;
    sub = 'reveal'; setGoal();
    for (const f of foes) if (f.kind === 'kofi' && !f.dead) { f.dead = true; scene.remove(f.a.root); }
    ctx.say(R.day2.caught, () => {
      const a = P.yaw + Math.PI * 0.8; K.on = true; place(K, P.pos.x + Math.sin(a) * 4, P.pos.z + Math.cos(a) * 4, a + Math.PI);
      particles.burst(K.pos.x, K.pos.y + 0.6, K.pos.z, 16, { color: 0x9ad86a, speed: 3, size: 0.35, life: 0.6 });
      ctx.say(R.day2.reveal, () => ctx.askName(name => {
        ctx.punkName(name);
        sub = 'back'; objective(R.obj.back, `${name} trots along beside you`); setGoal(camps[1].x, camps[1].y, camps[1].z);
      }));
    });
  }
  function day2Back() {
    if (sub === 'back' && P.pos.distanceTo(V3(camps[1].x, camps[1].y, camps[1].z)) < 6) {
      sub = 'home'; setGoal();
      ctx.say(R.day2.back, () => startDay3());
    }
  }

  /* ===== Day 3: rain, and the Carpenter talks ===== */
  function startDay3() {
    stage = 'day3'; ctx.save('day3');
    ctx.cards(R.day3.cards, 3400, () => {
      place(P, camps[1].x - 2, camps[1].z + 1.5, -Math.PI / 2); B.stay = V3(camps[1].x + 2.2, 0, camps[1].z - 1.5); place(B, B.stay.x, B.stay.z);
      setDusk(0.75); camps[1].on = true; ctx.play();
      ctx.say(R.day3.talk, () => startDay4());
    });
  }

  /* ===== Day 4: the pass, and the Rodak ===== */
  let D4 = null;
  function startDay4() {
    stage = 'day4'; sub = 'walk'; ctx.save('day4');
    camps[1].on = false;
    ctx.cards(R.day4.cards, 3400, () => {
      place(P, roadX(PASS0 + 10), PASS0 + 10, Math.PI); place(B, roadX(PASS0 + 12) + 2, PASS0 + 12, Math.PI); B.stay = null;
      if (K.on) place(K, roadX(PASS0 + 12) - 2, PASS0 + 12, Math.PI);
      CAM.yaw = 0; setDusk(0.25); P.hp = 100; D4 = { left: 0 };
      ctx.play(); ctx.location('The Mountain Pass', 'Day four');
      objective(R.obj.day4, ''); setGoal(roadX(AMBUSH), heightAt(roadX(AMBUSH), AMBUSH), AMBUSH);
    });
  }
  function day4Tick() {
    if (sub === 'walk' && P.pos.z < AMBUSH + 25) {
      sub = 'fight'; setGoal();
      for (let k = 0; k < 4; k++) { const a = -0.9 + k * 0.6, x = P.pos.x + Math.sin(a) * 18 + (k % 2 ? 6 : -6), z = P.pos.z - Math.cos(a) * 16; addFoe('rodak', x, z); }
      ctx.say(R.day4.warn, () => d4Objective());
    }
    if (sub === 'fight') {
      const left = foes.filter(f => f.kind === 'rodak' && !f.dead && !f.fled).length;
      if (left !== D4.left) { D4.left = left; d4Objective(); }
      if (left === 0) {
        sub = 'won';
        ctx.say(R.day4.won, () => { ctx.save('day5'); ctx.cards(R.day5.cards, 3600, () => { done = true; ctx.onDone(); }); });
      }
    }
  }
  function d4Objective() { objective(R.obj.rodak(D4.left), 'Left-click to swing — the Carpenter and your Punk fight beside you'); }

  /* ---------------- foes and critters ---------------- */
  function addFoe(kind, x, z) {
    const a = kind === 'kofi' ? buildKofi({ seed: Math.floor(rng() * 999) }) : kind === 'rodak' ? buildRodak({ seed: Math.floor(rng() * 999) }) : buildWildPunk({ seed: Math.floor(rng() * 999) });
    if (kind === 'wildpunk') a.root.scale.multiplyScalar(0.62);
    scene.add(a.root);
    const hp = { kofi: 1, rodak: 45, wildpunk: 40 }[kind];
    const f = { kind, a, pos: V3(x, groundAt(x, z, 60), z), vel: V3(), yaw: rng() * TAU, hp, max: hp, state: 'idle', timer: rng() * 2, windup: 0, flash: 0, dead: false, fled: false, cd: 1 + rng() };
    a.root.position.copy(f.pos); foes.push(f); return f;
  }
  function hitFoe(f, dmg, from) {
    if (f.dead || f.fled) return;
    f.hp -= dmg; f.flash = 1; sfx.hit();
    const d = V3(f.pos.x - from.x, 0, f.pos.z - from.z).normalize(); f.vel.addScaledVector(d, 6); f.stun = 0.35;
    particles.burst(f.pos.x, f.pos.y + 0.8, f.pos.z, 10, { color: f.kind === 'rodak' ? 0x9a9ab0 : 0xffb040, speed: 6, size: 0.3, life: 0.4, gravity: -10 });
    if (f.hp > 0) return;
    if (f.kind === 'kofi') { f.dead = true; scene.remove(f.a.root); kofiCaught(); return; }
    if (f.kind === 'wildpunk') {   // knock the fight out of it — it runs off instead of dying
      f.fled = true; f.state = 'flee'; f.timer = 3; MK.calmed = true; sfx.heal();
      ctx.say(PRO.calmed, () => { marketObjective(); marketCheck(); }); return;
    }
    f.dead = true; sfx.die();
    particles.burst(f.pos.x, f.pos.y + 1, f.pos.z, 26, { color: 0x3a3a4a, speed: 8, size: 0.45, life: 0.8, gravity: -6 });
    f.deadT = 0;
    // Rodak never stay to bury their own: past the second, the rest of the pack is gone
    const rodakDown = foes.filter(o => o.kind === 'rodak' && o.dead).length;
    if (rodakDown >= 2) for (const o of foes) if (o.kind === 'rodak' && !o.dead && !o.fled) { o.fled = true; o.state = 'flee'; o.timer = 4; }
  }
  function updateFoes(dt, playing) {
    for (const f of foes) {
      if (f.dead) { if (f.deadT != null) { f.deadT += dt; f.a.root.scale.multiplyScalar(Math.max(0.001, 1 - dt * 2)); if (f.deadT > 0.7) { scene.remove(f.a.root); f.deadT = null; } } continue; }
      f.flash = Math.max(0, f.flash - dt * 5); f.a.flash && f.a.flash(f.flash);
      f.stun = Math.max(0, (f.stun || 0) - dt);
      const dx = P.pos.x - f.pos.x, dz = P.pos.z - f.pos.z, d = Math.hypot(dx, dz);
      let want = 0, wy = f.yaw;
      if (f.state === 'flee') {
        // away from Tanoc, and gone
        wy = Math.atan2(-dx, -dz); want = f.kind === 'rodak' ? 9 : 7; f.timer -= dt;
        if (f.timer <= 0) { f.dead = true; scene.remove(f.a.root); continue; }
      } else if (f.kind === 'kofi') {
        if (d < 11 && playing) { wy = Math.atan2(-dx, -dz) + Math.sin(t * 3 + f.pos.x) * 0.6; want = 5.6; }
        else { f.timer -= dt; if (f.timer <= 0) { f.timer = 2 + rng() * 3; f.wy = rng() * TAU; } wy = f.wy || 0; want = 1; }
      } else if (playing) {
        const reach = f.kind === 'rodak' ? 2.2 : 1.9, dmg = f.kind === 'rodak' ? 9 : 6;
        if (f.state === 'windup') {
          f.timer -= dt; wy = Math.atan2(dx, dz); f.windup = 1 - f.timer / 0.55;
          if (f.timer <= 0) {
            f.state = 'recover'; f.timer = 0.7; f.windup = 0; f.attackA = 1;
            f.vel.x += Math.sin(f.yaw) * 7; f.vel.z += Math.cos(f.yaw) * 7;
            // the Rodak snap at whoever's closest: the boy, the Carpenter, or the Punk
            const tgt = [[P.pos, 'p'], [B.pos, 'b'], [K.on ? K.pos : null, 'k']].filter(q => q[0]).sort((a, b) => a[0].distanceTo(f.pos) - b[0].distanceTo(f.pos))[0];
            if (tgt[1] === 'p' && d < reach + 0.8 && P.iframes <= 0) hurtTanoc(dmg, f.pos);
            else if (tgt[1] !== 'p') sfx.hit();
          }
        } else if (f.state === 'recover') { f.timer -= dt; f.attackA = Math.max(0, (f.attackA || 0) - dt * 3); if (f.timer <= 0) f.state = 'chase'; }
        else {
          f.cd -= dt;
          wy = Math.atan2(dx, dz);
          if (f.kind === 'rodak' && d < 6 && f.cd > 0) { wy += Math.PI / 2; want = 4; }     // circling, waiting for an opening
          else want = d > reach ? (f.kind === 'rodak' ? 7 : 5.4) : 0;
          if (d < reach + 0.4 && f.cd <= 0) { f.state = 'windup'; f.timer = 0.55; f.cd = 1.4 + rng(); }
        }
      }
      if (f.stun > 0) want = 0;
      f.yaw = dampAngle(f.yaw, wy, 8, dt);
      f.vel.x = damp(f.vel.x, Math.sin(f.yaw) * want, 8, dt); f.vel.z = damp(f.vel.z, Math.cos(f.yaw) * want, 8, dt);
      f.pos.x += f.vel.x * dt; f.pos.z += f.vel.z * dt;
      resolve(f.pos, 0.6);
      f.pos.y = groundAt(f.pos.x, f.pos.z, f.pos.y + 1);
      f.a.root.position.copy(f.pos); f.a.root.rotation.y = f.yaw;
      f.a.animate(dt, { speed: Math.hypot(f.vel.x, f.vel.z), t, windup: f.windup || 0, attack: f.attackA || 0 });
    }
  }
  function hurtTanoc(dmg, from) {
    P.hp -= dmg; P.iframes = 0.6; shake = Math.max(shake, 0.35); sfx.hurt();
    const d = V3(P.pos.x - from.x, 0, P.pos.z - from.z).normalize(); P.vel.addScaledVector(d, 6);
    if (P.hp <= 0) { P.hp = 60; P.iframes = 1.5; ctx.toast('Buhkon hauls you up by the collar. “Up. Again.”', 3); }
    ctx.hp(P.hp / 100);
  }

  /* ---------------- the walker, the Carpenter, the Punk ---------------- */
  function attack() {
    if (!tanoc.weapon.visible || P.swing > 0) return;
    P.swing = 0.42; P.hitDone = false; sfx.swing();
  }
  function updatePlayer(dt, playing) {
    let ix = 0, iz = 0;
    if (playing) {
      if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1;
      if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
      if (touch && touch.on) { ix += touch.move.x; iz += touch.move.y; }
    }
    const len = Math.hypot(ix, iz);
    const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = -fz, rz = fx;
    let wx = 0, wz = 0;
    if (len > 0.08) { const k = Math.min(1, len) / len; wx = (fx * iz + rx * ix) * k; wz = (fz * iz + rz * ix) * k; }
    const run = keys.ShiftLeft || keys.ShiftRight, sp = (run ? 8.6 : 4.8) * (P.swing > 0 ? 0.35 : 1);
    P.vel.x = damp(P.vel.x, wx * sp, P.onGround ? 14 : 4, dt); P.vel.z = damp(P.vel.z, wz * sp, P.onGround ? 14 : 4, dt);
    if (len > 0.08 && P.swing <= 0) P.yaw = dampAngle(P.yaw, Math.atan2(wx, wz), 12, dt);
    P.jumpBuf -= dt; P.coyote -= dt; P.iframes = Math.max(0, P.iframes - dt);
    if (P.jumpBuf > 0 && (P.onGround || P.coyote > 0) && playing) { P.vel.y = 9.2; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; sfx.jump(); }
    P.vel.y -= 26 * dt;
    P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
    resolve(P.pos);
    P.pos.y += P.vel.y * dt;
    const g = groundAt(P.pos.x, P.pos.z, P.pos.y);
    if (P.pos.y <= g + 0.02 && P.vel.y <= 0) { P.pos.y = g; P.vel.y = 0; P.onGround = true; P.coyote = 0.12; }
    else if (P.onGround && P.pos.y - g < 1.2 && P.vel.y <= 0) { P.pos.y = g; P.vel.y = 0; }
    else P.onGround = false;
    // the hatchet: a short arc in front of him
    if (P.swing > 0) {
      P.swing -= dt;
      if (!P.hitDone && P.swing < 0.24) {
        P.hitDone = true;
        for (const f of foes) {
          if (f.dead || f.fled) continue;
          const dx = f.pos.x - P.pos.x, dz = f.pos.z - P.pos.z, d = Math.hypot(dx, dz);
          if (d < 2.7 && (dx * Math.sin(P.yaw) + dz * Math.cos(P.yaw)) / (d || 1) > 0.2) hitFoe(f, f.kind === 'kofi' ? 1 : 16, P.pos);
        }
      }
    }
    const speed = Math.hypot(P.vel.x, P.vel.z);
    if (P.onGround && speed > 1) { P.stepPh += dt * speed * 0.55; if (P.stepPh > 1) { P.stepPh = 0; sfx.step(); } }
    tanoc.root.position.copy(P.pos); tanoc.root.rotation.y = P.yaw;
    tanoc.animate(dt, { speed, onGround: P.onGround, t, swing: P.swing > 0 ? { kind: 1, p: 1 - P.swing / 0.42 } : null });
  }
  function follow(o, actor, dt, side, dist, speedCap, fight) {
    let want = o.stay ? o.stay : null;
    // fighters go for the nearest foe in the fight
    let foe = null;
    if (fight) { let bd = 14; for (const f of foes) { if (f.dead || f.fled || f.kind === 'kofi') continue; const d = f.pos.distanceTo(o.pos); if (d < bd) { bd = d; foe = f; } } }
    if (foe) want = foe.pos;
    else if (!want) { const back = V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), right = V3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); want = P.pos.clone().addScaledVector(back, dist).addScaledVector(right, side); }
    const dx = want.x - o.pos.x, dz = want.z - o.pos.z, d = Math.hypot(dx, dz);
    const stop = foe ? 1.8 : 0.8, sp = d > stop ? Math.min(speedCap, d * 2.2) : 0;
    if (d > 45 && !o.stay) { o.pos.set(want.x, 0, want.z); }
    else if (sp > 0) { o.pos.x += dx / d * sp * dt; o.pos.z += dz / d * sp * dt; o.yaw = dampAngle(o.yaw, Math.atan2(dx, dz), 8, dt); }
    else if (foe || o.stay) o.yaw = dampAngle(o.yaw, foe ? Math.atan2(dx, dz) : Math.atan2(P.pos.x - o.pos.x, P.pos.z - o.pos.z), 4, dt);
    resolve(o.pos, 0.5);
    o.pos.y = groundAt(o.pos.x, o.pos.z, o.pos.y + 1);
    o.cd -= dt; o.swing = Math.max(0, o.swing - dt);
    if (foe && d < 2.4 && o.cd <= 0) { o.cd = 1.1; o.swing = 0.4; hitFoe(foe, actor === buhkon ? 20 : 12, o.pos); }
    actor.root.position.copy(o.pos); actor.root.rotation.y = o.yaw;
    actor.animate(dt, { speed: sp, onGround: true, t, swing: o.swing > 0 ? { kind: 1, p: 1 - o.swing / 0.4 } : null, attack: o.swing > 0 ? o.swing / 0.4 : 0 });
  }
  function updateCamera(dt) {
    camTgt.set(P.pos.x, P.pos.y + 1.5, P.pos.z);
    const want = 6.2, cp = Math.cos(CAM.pitch), dir = V3(Math.sin(CAM.yaw) * cp, Math.sin(CAM.pitch), Math.cos(CAM.yaw) * cp);
    let d = want;
    for (let s = 0.6; s <= want; s += 0.3) { const q = camTgt.clone().addScaledVector(dir, s); if (solidAt(q.x, q.y, q.z)) { d = Math.max(0.8, s - 0.4); break; } }
    camPos.lerp(camTgt.clone().addScaledVector(dir, d), 1 - Math.exp(-14 * dt));
    camera.position.copy(camPos);
    if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; shake = Math.max(0, shake - dt * 1.5); }
    camera.lookAt(camTgt);
  }

  function objective(text, hint = '', pips = 0, on = 0) { ctx.objective(stage === 'market' ? 'The Beginning · Xikia' : 'The Road North', text, hint, pips, on); }

  /* ---------------- per frame ---------------- */
  function update(dt, playing) {
    t += dt;
    updatePlayer(dt, playing);
    follow(B, buhkon, dt, 1.8, 2.6, 9.5, stage === 'day4');
    if (K.on) follow(K, punk, dt, -1.8, 2.2, 11, stage === 'day4'); else punk.root.visible = false;
    if (K.on) punk.root.visible = true;
    updateFoes(dt, playing);
    // the market's own business
    if (MK) {
      for (const m of [MK.angel, MK.sniller]) if (m && sub !== 'hat') m.userData.tick(t);
      if (MK.leaving && MK.angel) { MK.leaving += dt; MK.angel.position.y += dt * (4 + MK.leaving * 10); if (MK.leaving > 4) { particles.burst(MK.angel.position.x, MK.angel.position.y + 3, MK.angel.position.z, 40, { color: 0xfff0c0, speed: 10, size: 1, life: 1 }); scene.remove(MK.angel); MK.angel = null; } }
      for (const it of MK.amulets) if (it.mesh) { it.mesh.rotation.y = t * 1.5; it.mesh.position.y = it.y0 + Math.sin(t * 2 + it.pos.x) * 0.12; }
      for (const p of MK.folk) {
        let sp = 0;
        if (p.panic || p.goal) {
          if (!p.goal || p.pos.distanceTo(p.goal) < 0.8) { const a = rng() * TAU, r = 6 + rng() * 18; p.goal = V3(SQUARE.x + Math.cos(a) * r, 0, SQUARE.z + Math.sin(a) * r); if (!p.panic) { p.wait = 2 + rng() * 4; } }
          if (p.wait > 0 && !p.panic) p.wait -= dt;
          else { const dx = p.goal.x - p.pos.x, dz = p.goal.z - p.pos.z, d = Math.hypot(dx, dz) || 1; sp = p.panic ? 6 : 1.4; p.pos.x += dx / d * sp * dt; p.pos.z += dz / d * sp * dt; resolve(p.pos, 0.4); p.a.root.rotation.y = Math.atan2(dx, dz); }
        } else { p.wait -= dt; if (p.wait <= 0) p.goal = V3(); }
        if (sub === 'hat') sp = 0;      // everything stops and stares
        if (sub === 'hat') p.a.root.rotation.y = dampAngle(p.a.root.rotation.y, Math.atan2(P.pos.x - p.pos.x, P.pos.z - p.pos.z), 4, dt);
        p.pos.y = groundAt(p.pos.x, p.pos.z, 2); p.a.root.position.copy(p.pos);
        p.a.animate(dt, { speed: sp, onGround: true, t: t + p.ph });
      }
      if (playing && sub === 'pack') { MK.t -= dt; if (MK.t <= 0) marketMaterialize(); }
    }
    if (playing) { if (stage === 'day1') day1Tick(); if (stage === 'day2') { day2Tick(); day2Back(); } if (stage === 'day4') day4Tick(); }
    // camps glow at night
    for (const c of camps) { c.fire.visible = c.on; c.light.intensity = c.on ? 1.6 + Math.sin(t * 9) * 0.3 : 0; if (c.on && Math.random() < 0.5) particles.emit(c.x + (Math.random() - 0.5) * 0.6, c.y + 0.6, c.z + (Math.random() - 0.5) * 0.6, { vx: 0, vy: 2 + Math.random(), vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: 0.35, life: 0.9, drag: 0.5 }); }
    if (stage === 'day4' && Math.random() < 0.3) particles.emit(camPos.x + (Math.random() - 0.5) * 40, camPos.y + (Math.random() - 0.3) * 6, camPos.z + (Math.random() - 0.5) * 40, { vx: 0.6, vy: 0, vz: 0, color: 0xe8eef4, size: 2.4, life: 3, drag: 0.2 });   // mist in the pass
    if (beacon.visible) beacon.material.opacity = 0.6 + Math.sin(t * 4) * 0.3;
    particles.update(dt);
    updateCamera(dt);
    // the sky follows: Velki low in the south-east, the sun and its shadows on the boy
    sky.position.copy(camera.position);
    velki.position.set(camera.position.x + 1700, camera.position.y + 900, camera.position.z + 2300); velkiGlow.position.copy(velki.position);
    for (const k of kalo) k.position.copy(camera.position).add(k.userData.off);
    sun.position.copy(P.pos).addScaledVector(SUN_DIR, 140); sun.target.position.copy(P.pos);
    ctx.hp(P.hp / 100);
  }

  function interact() {
    let best = null, bd = 1e9;
    for (const it of items) { const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z); if (d < 2.6 && Math.abs(it.pos.y - P.pos.y) < 3 && d < bd) { bd = d; best = it; } }
    if (best) { sfx.ui(); best.act(); return; }
    if (stage === 'day1' && sub === 'stone') { tryStone(); return; }
    if (B.pos.distanceTo(P.pos) < 3.2) ctx.say([['buhkon', stage === 'market' ? 'Crates, Tanoc. Questions after.' : stage === 'day2' && sub === 'hunt' ? 'Kofi. One. Off you go.' : 'Keep walking. I’m right behind you.']]);
  }
  function prompt() {
    for (const it of items) { const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z); if (d < 2.6 && Math.abs(it.pos.y - P.pos.y) < 3) return it.label; }
    if (stage === 'day1' && sub === 'stone') return 'Try the fire-stone';
    if (B.pos.distanceTo(P.pos) < 3.2) return 'Talk to Buhkon <small style="opacity:.7">the Carpenter</small>';
    return null;
  }

  function start(at) {
    if (at === 'day1') startDay1(); else if (at === 'day2') { D1 = { pebble: true }; startDay2(); } else if (at === 'day3') { K.on = true; startDay3(); } else if (at === 'day4') { K.on = true; startDay4(); } else startMarket();
  }
  function dispose() {
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
    composer.dispose && composer.dispose();
  }
  return {
    start, update, render: () => composer.render(), interact, prompt, jump: () => { P.jumpBuf = 0.15; }, attack, resize, dispose,
    get stage() { return stage; }, get sub() { return sub; }, get done() { return done; }, P, foes, items, B, camps, debug: { kofiCaught, startDay2, startDay3, startDay4, marketHatOn, get MK() { return MK; } },
  };
}
