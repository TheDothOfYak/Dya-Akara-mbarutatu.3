/* ============================================================
   THE ROAD NORTH — Tanoc's first days on Xikia.
   He wakes in Fyrsti'Vilag (Xikia's city of that name) in front of
   the Carpenter's stall; the Angels leave; the amulets fall; and
   then six days on the road north with Buhkon Eldi:
     Day 1  the low country: a family's cart in the ditch, an amulet in a
            hedge, a Kofi on the road, a Sniller far off over the fields —
            and at the hedge-oak camp, the fire-stone's trigger
     Day 2  the forest: a fallen pine to chop through, the ford's stepping
            stones; hunting alone; the Punk that followed them
     Day 3  rain at camp, the Carpenter talks — and at night a pale Sniller
            leads Tanoc off into the trees
     Day 4  the mountain pass: a rockslide, then a Rodak pack and its leader
   Days 5 and 6 — Beuhk, and the little road up to the Carpenter's
   hill — happen in the Beuhk page itself.

   A scene of its own, like Velki: its own long strip of land from the
   city to the pass, a light walker, simple fights. main.js lends it
   the renderer, camera, input, dialogue and cards.
   ============================================================ */
import * as THREE from 'three';
import { toon, addOutline, outlineAll, glowSprite, Particles, paint, buildCampfire } from './gfx.js';
import { buildHomeTree, buildForest, buildTreeBridge } from './hometree.js';
import { buildEikar, placeWalker, cartoon } from './actors.js';
import { buildWildPunk, buildKofi, buildRodak, buildDomesticPunk, buildKipsu } from './esik_land.js';
import { buildVel } from './creatures.js';
import { createCityKit, createCrowd, buildMudFountain, FOLK_LOOKS } from './city.js';
import { createCine } from './cine.js';
import { buildCart as buildCartModel, buildCampKit } from './cart.js';
import { NPC_LOOKS } from './npcs.js';
import { buildAngel, buildSniller } from './velki.js';
import { clamp, damp, dampAngle, smooth, lerp, mulberry32, fbm, orbitPitch, tiltUp } from './util.js';
import * as STORY from './story.js';
import { Colliders } from './terrain.js';
import { createSolids, inColliders, noSolid } from './solid.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

/* ---------------- the lay of the land ---------------- */
/* Fyrsti'Vilag is big: the old market quarter (CORE, the square at its heart) sits just inside the north gate,
   and the city runs on south for the best part of a quarter-league, street after street, to the home tree */
const GATE_Z = 14, CITY_R = 132, CITY = { x: 0, z: GATE_Z + CITY_R };   // the wall, and its north gate
const CORE = { x: 0, z: 70 }, CORE_R = 52;                                // the market quarter
const SQUARE = { x: 0, z: 70 }, STALL = { x: 6, z: 58 };
const TREE = { x: -38, z: 212, R: 13, H: 230 };                           // the city's home tree, in the south-west
const TREE2 = { x: 40, z: 214, R: 10, H: 175 };                           // and a younger one east of it, inside the walls too, a bridge between them
const CAMP1 = { z: -250 }, CAMP2 = { z: -560 }, PASS0 = -650, AMBUSH = -800, END = -960;
const CART_Z = -135, HEDGE_Z = -195, LOG_Z = -330, FORD_Z = -430, ROCK0 = -672, ROCK1 = -762;
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
  h -= 2.6 * smooth(7, 3, Math.abs(z - FORD_Z));                                         // the ford's stream
  return h;
}

/* the ink outline for instanced meshes: each copy by its own matrix, pushed out after its scale so the line stays even */
const outlineInstCache = {};
function outlineInst(th) {
  return outlineInstCache[th] || (outlineInstCache[th] = new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: new THREE.Color(0x1a1008) }, uThick: { value: th } }]),
    vertexShader: `uniform float uThick;
      #include <fog_pars_vertex>
      void main() {
        vec4 ip = instanceMatrix * vec4(position, 1.0);
        ip.xyz += normalize(mat3(instanceMatrix) * normal) * uThick;
        vec4 mvPosition = modelViewMatrix * ip;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uColor;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
        #include <fog_fragment>
      }`,
  }));
}

/* ================================================================ */
export function createRoad(ctx) {
  const { camera, keys, touch, CAM, sfx } = ctx;
  const scene = new THREE.Scene();
  const rng = mulberry32(611);
  const fog = new THREE.Fog(0xcfe0f0, 260, 3400); scene.fog = fog;

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
  // stars, coming out as the day goes
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  { const pts = []; for (let i = 0; i < 900; i++) { const a = Math.random() * TAU, h = 0.08 + Math.random() * 0.92, r = 3600; pts.push(Math.cos(a) * Math.sqrt(1 - h * h) * r, h * r, Math.sin(a) * Math.sqrt(1 - h * h) * r); } const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); sky.add(new THREE.Points(sg, starMat)); }
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
    sun.color.set(0xfff0d8).lerp(new THREE.Color(0xff8a4a), k); sun.intensity = lerp(2.3, 0.5, Math.pow(k, 1.4));
    hemi.intensity = lerp(1.2, 0.48, k);   // by the fire it is properly evening: the flames light the faces, the sky does the rest fog.color.set(0xcfe0f0).lerp(new THREE.Color(0xc07a6a), k);
    starMat.opacity = smooth(0.55, 1, k);
  }

  /* ---------------- ground: one long strip from the city to the pass ---------------- */
  {
    const W = 330, L = 1420, geo = new THREE.PlaneGeometry(W, L, 132, 568); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, CITY.z + CITY_R + 20 - L / 2);
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
    const ground = new THREE.Mesh(geo, paint(new THREE.MeshToonMaterial({ vertexColors: true }), 'land')); ground.receiveShadow = true; scene.add(ground);
  }

  /* ---------------- colliders (boxes and posts with a top and bottom) ---------------- */
  const solids = [];
  const box = (x, z, hw, hd, y0, y1) => { const s = { kind: 'box', x, z, hw, hd, y0, y1 }; solids.push(s); return s; };
  const cyl = (x, z, r, y0, y1) => { const s = { kind: 'cyl', x, z, r, y0, y1 }; solids.push(s); return s; };
  const STEP = 0.65, PR = 0.4, PH = 1.5;
  /* the home trees are walkable inside: in at the great door, round the hall and the floors, up the great stair round the
     inside of the wall. Their shapes and their walking rules come from the trees themselves (hometree.js); TREES is filled
     once they're built, and HT is the city's own. */
  let HT = null;
  const TREES = [];
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  function treeGround(x, z, y) { let best = -1e9; for (const T of TREES) best = Math.max(best, T.ground(x, z, y)); return best; }
  function treeResolve(p, rad) { for (const T of TREES) T.resolve(p, rad); }
  function treeSolid(x, y, z) { return TREES.some(T => T.solid(x, y, z)); }
  const auto = new Colliders(heightAt);   // and everything else you can see (solid.js), filled once it's all built
  function groundAt(x, z, y, skip) {
    let g = Math.max(heightAt(x, z), treeGround(x, z, y));
    for (const s of solids) {
      if (s === skip) continue;
      if (Math.abs(x - s.x) > 12 + (s.r || 0) || Math.abs(z - s.z) > 12 + (s.r || 0)) continue;
      if (s.y1 > y + STEP || s.y1 <= g) continue;
      if (s.kind === 'box' ? Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd : Math.hypot(x - s.x, z - s.z) < s.r) g = s.y1;
    }
    return g;
  }
  function resolve(p, rad = PR) {
    if (p === P.pos) auto.resolve(p, rad, PH);   // you, not the folk: they keep to the colliders placed by hand
    for (const s of solids) {
      if (p.y + PH < s.y0 || p.y >= s.y1 - STEP) continue;
      if (Math.abs(p.x - s.x) > 12 + (s.r || 0) || Math.abs(p.z - s.z) > 12 + (s.r || 0)) continue;
      if (s.kind === 'box') {
        const dx = p.x - s.x, dz = p.z - s.z, ox = s.hw + rad - Math.abs(dx), oz = s.hd + rad - Math.abs(dz);
        if (ox > 0 && oz > 0) { if (ox < oz) p.x += Math.sign(dx || 1) * ox; else p.z += Math.sign(dz || 1) * oz; }
      } else {
        const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), m = s.r + rad;
        if (d < m) { if (d < 1e-4) p.x += m; else { p.x = s.x + dx / d * m; p.z = s.z + dz / d * m; } }
      }
    }
    treeResolve(p, rad);
    // the city wall, with its north gate; out on the road, the valley sides
    const dc = Math.hypot(p.x - CITY.x, p.z - CITY.z);
    if (dc > CITY_R - 2 && dc < CITY_R + 2 && !(Math.abs(p.x) < 5 && p.z < CITY.z)) { const to = dc < CITY_R ? CITY_R - 2 : CITY_R + 2; p.x = CITY.x + (p.x - CITY.x) * to / dc; p.z = CITY.z + (p.z - CITY.z) * to / dc; }
    if (p.z < GATE_Z - 2) { const rx = roadX(p.z), lim = zone(p.z) === 'pass' ? 30 : 48; if (Math.abs(p.x - rx) > lim) p.x = rx + Math.sign(p.x - rx) * lim; }
    if (p.z > CITY.z + CITY_R - 2) p.z = CITY.z + CITY_R - 2;
    if (p.z < END + 10) p.z = END + 10;
  }
  function solidAt(x, y, z) {
    for (const s of solids) {
      if (Math.abs(x - s.x) > 12 + (s.r || 0) || Math.abs(z - s.z) > 12 + (s.r || 0)) continue;
      if (y < s.y0 || y > s.y1) continue;
      if (s.kind === 'box' ? Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd : Math.hypot(x - s.x, z - s.z) < s.r) return true;
    }
    return treeSolid(x, y, z) || y < heightAt(x, z) + 0.2 || inColliders(auto, x, y, z);
  }

  /* ---------------- Fyrsti'Vilag, on Xikia ---------------- */
  const kit = createCityKit(scene, { rng, heightAt, box, cyl, palette: 'xikia' });
  // the old market quarter, round the square: rings of houses with streets between
  const doors = [];
  for (let ring = 0; ring < 3; ring++) {
    const Rr = 24 + ring * 10, n = 10 + ring * 4;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + ring * 0.3 + rng() * 0.1, x = CORE.x + Math.cos(a) * Rr, z = CORE.z + Math.sin(a) * Rr;
      if (Math.abs(x) < 7.5 && z < CORE.z) continue;          // the street to the north gate
      doors.push(kit.house(x, z, Math.atan2(CORE.x - x, CORE.z - z)).door);
    }
  }
  const XSTREETS = [19, 29, 39, 49];
  for (const r of XSTREETS.slice(1)) { const n = Math.round(r / 5); for (let k = 0; k < n; k++) { const a = k / n * TAU + 0.3, x = CORE.x + Math.cos(a) * (r + 2.3), z = CORE.z + Math.sin(a) * (r + 2.3); if (Math.abs(x) < 8 && z < CORE.z) continue; if (x > -3 && x < 19 && z > 26 && z < 56) continue; kit.lampPost(x, z); } }   // (none in the cart's way out)
  for (const r of XSTREETS.slice(1)) for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.8; kit.bunting(V3(CORE.x + Math.cos(a) * (r - 4.4), 6, CORE.z + Math.sin(a) * (r - 4.4)), V3(CORE.x + Math.cos(a + 0.1) * (r + 4.4), 6, CORE.z + Math.sin(a + 0.1) * (r + 4.4)), 1.2); }
  for (let k = 0; k < 4; k++) kit.bunting(V3(-7, 7.2, 46 - k * 9), V3(7, 7.2, 42 - k * 9), 1.4);
  // the square's own bunting, from the fountain out to the stalls
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; kit.bunting(V3(SQUARE.x, 6.5, SQUARE.z + 4), V3(SQUARE.x + Math.cos(a) * 15, 4.2, SQUARE.z + 4 + Math.sin(a) * 15), 0.8); }
  kit.paving(CORE.x, CORE.z, XSTREETS, 0xc8b08a); kit.paving(SQUARE.x, SQUARE.z + 4, [7, 10.5], 0xb8a07a);
  // the city wall, all the way round, and the north gate's towers
  {
    const wm = toon(0xc8b08a), N = Math.round(CITY_R * TAU / 6.5);
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU, x = CITY.x + Math.cos(a) * CITY_R, z = CITY.z + Math.sin(a) * CITY_R;
      if (Math.abs(x) < 6 && z < CITY.z) continue;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(2.6, 8, CITY_R * TAU / N + 0.3), wm); seg.position.set(x, 4, z); seg.rotation.y = -a; seg.castShadow = true; scene.add(seg);
      if (i % 2 === 0) { const cr = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 1.1), wm); cr.position.set(x, 8.5, z); cr.rotation.y = -a; scene.add(cr); }
      if (i % 24 === 12) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 11, 10), wm); tw.position.set(x, 5.5, z); addOutline(tw, 0.05); scene.add(tw); const tc = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3.2, 10), toon(0x2f5a5a)); tc.position.set(x, 12.6, z); addOutline(tc, 0.04); scene.add(tc); }
    }
    for (const sd of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 12, 12), wm); t.position.set(sd * 7.5, 6, GATE_Z + 0.5); addOutline(t, 0.05); scene.add(t); cyl(sd * 7.5, GATE_Z + 0.5, 2.5, -1, 14);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(3, 3.6, 12), toon(0x2f5a5a)); cap.position.set(sd * 7.5, 13.8, GATE_Z + 0.5); addOutline(cap, 0.04); scene.add(cap);
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.4), toon(0x2f6f8a, { side: THREE.DoubleSide })); ban.position.set(sd * 7.5, 7, GATE_Z - 2.3); scene.add(ban);
      kit.lantern(sd * 4.6, 5.5, GATE_Z - 1.5, 0xffb060, 2);
    }
    const arch = new THREE.Mesh(new THREE.BoxGeometry(12, 2.2, 3), wm); arch.position.set(0, 10, GATE_Z + 0.5); addOutline(arch, 0.04); scene.add(arch);
  }
  // the home tree: the city grew up round it, in the south-west, and lives in it. Its great door faces the market
  const toCore = Math.atan2(CORE.z - TREE.z, CORE.x - TREE.x);
  {
    const T = buildHomeTree(scene, TREE.x, TREE.z, 0, {
      R: TREE.R, H: TREE.H, seed: 41, town: 1, decks: [0.05, 0.1, 0.16, 0.23], roots: 8, rootReach: 1.75, doorAt: toCore, banners: [0x2f6f8a, 0xd9a441],
    });
    // the younger tree, lived in too: in at its door and up its own stair
    const T2 = buildHomeTree(scene, TREE2.x, TREE2.z, 0, { R: TREE2.R, H: TREE2.H, seed: 77, town: 0.6, decks: [0.07, 0.14, 0.22], roots: 7, rootReach: 1.5, doorAt: Math.atan2(CORE.z - TREE2.z, CORE.x - TREE2.x), banners: [0xd9a441] });
    for (const t of [T, T2]) { t.colliders.forEach(c => cyl(c.x, c.z, c.r, c.y0, c.y1)); TREES.push(t); }   // the roots, the hearth (the walls are the tree's own)
    HT = T;
    buildTreeBridge(scene, T, T2, 0.42);
  }
  /* the rest of the city: block after block of houses on a grid of streets, from the market quarter
     south to the wall and round the home tree — instanced, so a whole quarter costs a handful of draws */
  const districtTrees = [];
  {
    const PAL = { walls: [0xf4e6c8, 0xf0dcb4, 0xe8d0a8, 0xfaf0dc, 0xe8dcc0, 0xd8c8b0], roofs: [0x7a4a2a, 0x2f5a5a, 0x6a3a1c, 0x3a6a5a, 0x8a5a3a], door: [0x2f6f8a, 0x8a3a3a, 0x4a7a3a] };
    const homes = [];
    const clearOf = (x, z) => Math.hypot(x - CORE.x, z - CORE.z) > CORE_R + 6 && Math.hypot(x - TREE.x, z - TREE.z) > TREE.R * 1.75 * 1.75 + 6 && Math.hypot(x - TREE2.x, z - TREE2.z) > TREE2.R * 1.75 * 1.6 + 6
      && Math.hypot(x - CITY.x, z - CITY.z) < CITY_R - 9 && !(Math.abs(x) < 10 && z < CORE.z);
    const STREET = 22;
    for (let gx = -6; gx < 6; gx++) for (let gz = 0; gz < 12; gz++) {
      const x0 = gx * STREET, z0 = GATE_Z + 2 + gz * STREET;
      for (const [ox, oz] of [[7.5, 7.5], [14.5, 7.5], [7.5, 14.5], [14.5, 14.5]]) {
        const x = x0 + ox + (rng() - 0.5) * 0.8, z = z0 + oz + (rng() - 0.5) * 0.8;
        if (!clearOf(x, z)) continue;
        if (rng() < 0.12) { districtTrees.push([x, z, 0.8 + rng() * 0.5, false]); continue; }   // a yard with a tree in it
        // face the nearer street
        const faceX = rng() < 0.5, ry = faceX ? (ox < 11 ? -Math.PI / 2 : Math.PI / 2) : (oz < 11 ? Math.PI : 0);
        const w = 5 + rng() * 1.6, d = 5 + rng() * 1.4, floors = rng() < 0.45 ? 2 : 1, h = floors * 3.3 + rng() * 0.6;
        homes.push({ x, z, w, d, h, ry, roof: rng() < 0.5 ? 'cone' : 'dome', wall: PAL.walls[Math.floor(rng() * PAL.walls.length)], roofC: PAL.roofs[Math.floor(rng() * PAL.roofs.length)], door: PAL.door[Math.floor(rng() * PAL.door.length)], floors });
      }
    }
    const inst = (geo, mat, n, outline) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.count = 0; m.castShadow = m.receiveShadow = true; scene.add(m); if (outline) { const o = new THREE.InstancedMesh(geo, outlineInst(0.07), Math.max(1, n)); o.count = 0; m.userData.o = o; scene.add(o); } return m; };
    const body = inst(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), toon(0xffffff), homes.length, true);
    const cone = inst(new THREE.ConeGeometry(0.78, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), toon(0xffffff), homes.length, true);
    const dome = inst(new THREE.SphereGeometry(0.72, 14, 7, 0, TAU, 0, Math.PI / 2), toon(0xffffff), homes.length, true);
    const band = inst(new THREE.BoxGeometry(1, 1, 1), toon(0x6a4428), homes.length * 2, false);
    const door = inst(new THREE.BoxGeometry(1.2, 2.3, 0.2).translate(0, 1.15, 0), toon(0xffffff), homes.length, false);
    const win = inst(new THREE.PlaneGeometry(0.95, 1.2), new THREE.MeshBasicMaterial({ color: 0xffc878, side: THREE.DoubleSide }), homes.length * 8, false);
    const o = new THREE.Object3D(), col = new THREE.Color();
    const put = (m, x, y, z, sx, sy, sz, ry, c) => {
      o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.scale.set(sx, sy, sz); o.updateMatrix();
      m.setMatrixAt(m.count, o.matrix); if (c != null) m.setColorAt(m.count, col.set(c)); m.count++;
      const ol = m.userData.o; if (ol) { ol.setMatrixAt(ol.count, o.matrix); ol.count++; }
    };
    for (const hm of homes) {
      const { x, z, w, d, h, ry } = hm, fx = Math.sin(ry), fz = Math.cos(ry), sx = Math.cos(ry), sz = -Math.sin(ry);
      put(body, x, 0, z, w, h, d, ry, hm.wall);
      put(band, x, h, z, w + 0.18, 0.26, d + 0.18, ry);
      if (hm.floors > 1) put(band, x, 3.3, z, w + 0.14, 0.22, d + 0.14, ry);
      if (hm.roof === 'cone') put(cone, x, h, z, Math.max(w, d) * 1.05, 2.6 + rng() * 0.8, Math.max(w, d) * 1.05, ry, hm.roofC);
      else put(dome, x, h, z, Math.max(w, d), Math.max(w, d) * 0.72, Math.max(w, d), ry, hm.roofC);
      put(door, x + fx * (d / 2 + 0.02), 0, z + fz * (d / 2 + 0.02), 1, 1, 1, ry, hm.door);
      for (let f = 0; f < hm.floors; f++) for (const s of [-1, 1]) {
        const wy = 1.9 + f * 3.3, side = f ? s * w * 0.27 : s * w * 0.3;
        if (f || Math.abs(side) > 1.0) put(win, x + fx * (d / 2 + 0.04) + sx * side, wy, z + fz * (d / 2 + 0.04) + sz * side, 1, 1, 1, ry);
        put(win, x + sx * s * (w / 2 + 0.04), wy, z + sz * s * (w / 2 + 0.04), 1, 1, 1, ry + Math.PI / 2);
      }
      const swap = Math.abs(Math.sin(ry)) > 0.5;
      box(x, z, (swap ? d : w) / 2, (swap ? w : d) / 2, -1, h + 2.5);
    }
    for (const m of [body, cone, dome, band, door, win]) { for (const mm of [m, m.userData.o]) if (mm) { mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }
    buildForest(scene, districtTrees, { rng, heightAt });
    for (const [x, z, sc] of districtTrees) cyl(x, z, 0.5 * sc, -1, 8 * sc);
    // lamps at some of the corners, and a few strings of bunting over the streets
    for (let gx = -5; gx < 6; gx++) for (let gz = 1; gz < 12; gz++) {
      const x = gx * STREET + 2.6, z = GATE_Z + 2 + gz * STREET + 2.6;
      if ((gx + gz) % 2 || !clearOf(x, z)) continue;
      kit.lampPost(x, z);
      if ((gx * 7 + gz * 3) % 5 === 0) kit.bunting(V3(x - 1.6, 6, z - 2.6), V3(x - 1.6, 6, z + STREET - 5), 1.2);
    }
    kit.paving(CITY.x, CITY.z, [CITY_R - 4], 0xc8b08a);
  }
  // the square: a ring of stalls round a Stryx mud fountain
  const fountain = buildMudFountain(scene, SQUARE.x, SQUARE.z + 4, 0, { scale: 0.85, seed: 5, onSplat: wp => { if (Math.hypot(P.pos.x - wp.x, P.pos.z - wp.z) < 2.5) { const d = V3(P.pos.x - SQUARE.x, 0, P.pos.z - SQUARE.z - 4).normalize(); P.vel.addScaledVector(d, 9); P.vel.y = 5; ctx.bark('tanoc', 'Hey! — all right, all right, it’s your mud!', 2.5); } } });
  cyl(SQUARE.x, SQUARE.z + 4, 4.1, -1, 0.9);
  const stalls = [];
  {
    const spots = [[STALL.x, STALL.z], [-10, 62], [-13, 74], [-6, 84], [8, 84], [14, 74], [13, 62]];
    spots.forEach(([x, z], i) => {
      const ry = Math.atan2(SQUARE.x - x, SQUARE.z - z);
      const g = kit.stall(x, z, ry, i, i !== 0);
      if (i === 0) {   // the Carpenter's own: carved boxes, a stool, a little chair, a cradle
        for (let k = 0; k < 3; k++) { const crate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), toon([0x9a6a40, 0xb8844e, 0x8a5a36][k])); crate.position.set(-1 + k * 0.85, 1.25, 0); addOutline(crate, 0.02); g.add(crate); }
        const cradle = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 6, 0, TAU, Math.PI / 2, Math.PI / 2), toon(0xb8844e, { side: THREE.DoubleSide })); cradle.scale.set(1.4, 0.6, 0.8); cradle.position.set(-1.9, 0.5, 0.9); addOutline(cradle, 0.02); g.add(cradle);
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 10), toon(0x8a5a36)); stool.position.set(1.9, 0.6, 0.8); g.add(stool);
        for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [0, 0.22]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), toon(0x6a4428)); leg.position.set(1.9 + lx, 0.3, 0.8 + lz); g.add(leg); }
      }
      stalls.push({ x, z, g, ry });
    });
  }

  /* ---------------- the Carpenter's cart, and the two Punks that pull it ----------------
     It goes the whole way north with them: in the market by his stall, out of the
     gate, along the road behind Buhkon, parked by every camp. */
  const CART0 = { x: 13, z: 52.5 };
  function buildCart() { const c = buildCartModel(); noSolid(c.g); scene.add(c.g); return c; }   // it rolls: CART.solid is its bulk
  const CART = Object.assign(buildCart(), { pos: V3(CART0.x, 0, CART0.z), yaw: Math.PI, speed: 0, roll: 0, path: null, driver: false, loose: null });
  CART.home = CART.punks.map(pk => ({ p: pk.root.position.clone(), s: pk.root.scale.clone() }));
  CART.solid = box(CART.pos.x, CART.pos.z, 1.4, 3.2, -1, 2.4);
  function placeCart(x, z, yaw) { CART.pos.set(x, groundAt(x, z, 60, CART.solid), z); CART.yaw = yaw; CART.speed = 0; }
  placeCart(CART0.x, CART0.z, Math.PI);
  /* out on the road the cart drives itself — Buhkon on the bench with the reins — along the road and never off it.
     It keeps pace with the boy when he walks (he can climb up into it any time: E) and halts at DRIVE.stopZ,
     where onArrive fires once (a fallen pine, the ford, a family in the ditch, the night's camp) */
  const DRIVE = { on: false, sp: 0, stopZ: null, onArrive: null, block: null };
  const SEAT_B = V3(0, 1.25, 1.82), SEAT_P = V3(-1.22, 1.1, 0.9);   // the bench; the boy on the side-board, legs over the edge
  function setStop(z, onArrive = null) { DRIVE.stopZ = z; DRIVE.onArrive = onArrive; }
  function drive(on = true) { DRIVE.on = on; CART.driver = on; if (on) { DRIVE.sp = 0; B.stay = null; } }
  function nearCart() { return Math.hypot(P.pos.x - CART.pos.x, P.pos.z - CART.pos.z) < 4.2 && Math.abs(P.pos.y - CART.pos.y) < 3; }
  function boardCart() {
    if (DRIVE.block) { ctx.bark('buhkon', DRIVE.block, 3); return; }
    P.inCart = true; P.vel.set(0, 0, 0); P.swing = 0; sfx.jump();
  }
  function hopDown() {
    if (!P.inCart) return;
    P.inCart = false; CART.g.updateMatrixWorld();
    const q = CART.g.localToWorld(V3(-2.7, 0, 0.6)), sp = freeSpot(q.x, q.z, 0.6);
    place(P, sp.x, sp.z, CART.yaw - Math.PI / 2); P.vel.set(0, 0, 0); P.onGround = true; sfx.step();
  }
  /* the two cart Punks: let off the shafts at camp to graze, put back in harness in the morning */
  function unhitch(c) {
    if (CART.loose) return;
    CART.g.updateMatrixWorld();
    CART.loose = CART.punks.map((pk, i) => { scene.attach(pk.root); return { pk, pos: pk.root.position.clone(), yaw: CART.yaw, tgt: null, wait: 0.4 + i * 0.8, c }; });
  }
  function hitch() {
    if (!CART.loose) return;
    CART.punks.forEach((pk, i) => { CART.g.add(pk.root); pk.root.position.copy(CART.home[i].p); pk.root.rotation.set(0, 0, 0); pk.root.scale.copy(CART.home[i].s); });
    CART.loose = null;
  }
  function grazeTick(dt) {
    if (!CART.loose) return;
    for (const L of CART.loose) {
      const c = L.c; let sp = 0;
      if (L.wait > 0) L.wait -= dt;
      else {
        if (!L.tgt) { const a = rng() * TAU, r = 2 + rng() * 6; L.tgt = V3(c.graze.x + Math.cos(a) * r, 0, c.graze.z + Math.sin(a) * r); }
        const dx = L.tgt.x - L.pos.x, dz = L.tgt.z - L.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.4) { L.tgt = null; L.wait = 3 + rng() * 6; }
        else { sp = Math.min(1.6, d); L.pos.x += dx / d * sp * dt; L.pos.z += dz / d * sp * dt; L.yaw = dampAngle(L.yaw, Math.atan2(dx, dz), 3, dt); }
      }
      resolve(L.pos, 1.0); L.pos.y = groundAt(L.pos.x, L.pos.z, L.pos.y + 1);
      L.pk.root.position.copy(L.pos); L.pk.root.rotation.set(L.wait > 0 ? 0.14 + Math.sin(t * 1.3 + L.yaw) * 0.05 : 0, L.yaw, 0);   // nose down in the grass while it stands
      L.pk.animate(dt, { speed: sp, t: t + L.yaw });
    }
  }

  /* ---------------- far country: mountains, cloud, and a town at the end of it ---------------- */
  {
    const base = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000, 1, 1), toon(0x6a8a4a)); base.rotation.x = -Math.PI / 2; base.position.set(0, -2.5, -600); base.receiveShadow = true; scene.add(base);
    const peakM = toon(0xffffff, { vertexColors: true }), pineM = toon(0x3a5a3a);
    const rockC = [new THREE.Color(0x8a8a9a), new THREE.Color(0x6e6e80)], snowC = new THREE.Color(0xf4f6fa), cc = new THREE.Color();
    /* one cone per mountain, its snow painted onto its own faces — a ragged cap down the top quarter or so,
       reaching further down the gullies than the ridges — never a second, smaller mountain sat on top */
    const peak = (x, z, h, r, snow) => {
      const seg = 7 + Math.floor(rng() * 4), geo = new THREE.ConeGeometry(r, h, seg, 6).toNonIndexed(), pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
      const rc = rockC[rng() < 0.5 ? 0 : 1], line = 0.7 + rng() * 0.08, ph = rng() * 6;
      for (let i = 0; i < pos.count; i += 3) {   // face by face, so the cap has a crisp painted edge
        let yy = 0, ax = 0, az = 0; for (let k = 0; k < 3; k++) { yy += pos.getY(i + k) / 3; ax += pos.getX(i + k) / 3; az += pos.getZ(i + k) / 3; }
        const hk = yy / h + 0.5, a = Math.atan2(az, ax), edge = line + Math.sin(a * 3 + ph) * 0.06 + Math.sin(a * 7 + ph * 2) * 0.03;
        cc.copy(snow && hk > edge ? snowC : rc);
        for (let k = 0; k < 3; k++) cols.set([cc.r, cc.g, cc.b], (i + k) * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, peakM); m.position.set(x, h / 2 - 3, z); m.rotation.y = rng() * 6; m.scale.z = 0.6 + rng() * 0.6; scene.add(m);
      const skirt = new THREE.Mesh(new THREE.ConeGeometry(r * 1.04, h * 0.2, seg), pineM); skirt.position.set(x, h * 0.1 - 3, z); skirt.rotation.y = m.rotation.y; skirt.scale.z = m.scale.z; scene.add(skirt);
    };
    for (const sd of [-1, 1]) for (let k = 0; k < 26; k++) { const z = 260 - k * 70 - rng() * 40, x = sd * (520 + rng() * 520); peak(x, z, 180 + rng() * 300, 120 + rng() * 120, rng() < 0.7); }
    for (let k = 0; k < 18; k++) peak(-1600 + k * 190 + rng() * 60, -1900 - rng() * 400, 380 + rng() * 300, 180 + rng() * 140, true);
    // a town far below at the end of the pass, chimney smoke going up
    for (let k = 0; k < 34; k++) {
      const a = rng() * TAU, r = rng() * 46, x = roadX(END) + 30 + Math.cos(a) * r, z = -1480 + Math.sin(a) * r * 0.7, h = 3 + rng() * 2;
      const hb = new THREE.Mesh(new THREE.BoxGeometry(4, h, 4), toon(0xf0dcb4)); hb.position.set(x, -2.5 + h / 2, z); scene.add(hb);
      const cp = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 6, 0, TAU, 0, Math.PI / 2), toon(0x7a4a2a)); cp.scale.y = 0.75; cp.position.set(x, -2.5 + h, z); scene.add(cp);
    }
    var townSmoke = V3(roadX(END) + 30, 4, -1480);
    // clouds, soft and slow
    var clouds = [];
    const cloudTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); for (let i = 0; i < 9; i++) { const x = 30 + Math.random() * 68, y = 40 + Math.random() * 48, r = 18 + Math.random() * 26, grd = g.createRadialGradient(x, y, 0, x, y, r); grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    for (let k = 0; k < 40; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, fog: false }));
      sp.position.set((rng() - 0.5) * 3000, 260 + rng() * 220, 300 - rng() * 2600); sp.scale.set(260 + rng() * 260, 110 + rng() * 80, 1); scene.add(sp); clouds.push(sp);
    }
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
      rocks.push([x, heightAt(x, z) + s * 0.3, z, s]); if (s > 0.55) cyl(x, z, s * 1.05, heightAt(x, z) - 1, heightAt(x, z) + s * 0.95);
    }
    const inst = (geo, mat, list, put) => { const m = new THREE.InstancedMesh(geo, mat, list.length); const o = new THREE.Object3D(); list.forEach((v, i) => { put(o, v); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
    inst(trunkG, toon(0x6b4128), trunks, (o, [x, y, z, s, h]) => { o.position.set(x, y, z); o.scale.set(s, h, s); o.rotation.set(0, 0, 0); });
    inst(crownG, toon(0x6aa040), crowns, (o, [x, y, z, r]) => { o.position.set(x, y, z); o.scale.set(r, r * 0.85, r); o.rotation.set(rng(), rng(), rng()); });
    inst(coneG, toon(0x2f6a3a), cones, (o, [x, y, z, r, h]) => { o.position.set(x, y, z); o.scale.set(r, h, r); o.rotation.set(0, rng() * 6, 0); });
    inst(new THREE.DodecahedronGeometry(1, 0), toon(0x9a9284), rocks, (o, [x, y, z, s]) => { o.position.set(x, y, z); o.scale.set(s * 1.2, s * 0.75, s); o.rotation.set(rng() * 3, rng() * 3, 0); });
  }
  /* the camps: a fire in a clearing by the road. The tent and the little workbench come off the cart each
     night (see makeCamp); the cart itself stands on the road, a few paces short of the fire */
  const camps = [CAMP1, CAMP2].map(c => {
    const x = roadX(c.z) + 6, z = c.z, y = heightAt(x, z);
    const fire = buildCampfire(1.05); fire.position.set(x, y, z); fire.visible = false; scene.add(fire);
    const light = new THREE.PointLight(0xff8a3a, 0, 18); light.position.set(x, y + 1.2, z); scene.add(light);
    const kit = buildCampKit(), at = (o, ox, oz) => { const q = V3(x + ox, 0, z + oz); q.y = heightAt(q.x, q.z); o.position.copy(q); o.rotation.y = Math.atan2(x - q.x, z - q.z); o.visible = false; scene.add(o); return q; };
    const tentAt = at(kit.tent, 4.2, 4.6), benchAt = at(kit.bench, 1.2, -4.4);
    kit.bench.rotation.y += Math.PI;   // (its vice faces the fire, the worker's back to the wood)
    return { x, z, y, fire, light, on: false, kit, tentAt, benchAt, park: c.z + 7, graze: V3(roadX(c.z) - 13, 0, c.z + 3), solids: [] };
  });

  /* ---------------- particles and post ---------------- */
  const particles = new Particles(scene, 4000);
  const cine = createCine(camera, { blocked: (x, y, z) => solidAt(x, y, z) });
  const mists = [];
  {
    const mt = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, 'rgba(255,255,255,0.55)'); grd.addColorStop(0.6, 'rgba(255,255,255,0.18)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; })();
    for (let k = 0; k < 26; k++) {
      const z = PASS0 - 10 - k * 12 - Math.random() * 8, x = roadX(z) + (Math.random() - 0.5) * 70;
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, color: 0xe8eef4, transparent: true, opacity: 0.35, depthWrite: false }));
      m.position.set(x, heightAt(x, z) + 2 + Math.random() * 3, z); m.scale.set(34 + Math.random() * 24, 9 + Math.random() * 6, 1); m.visible = false; scene.add(m); mists.push(m);
    }
  }
  const composer = ctx.makeComposer(scene);
  function resize() { particles.setScale(innerHeight * Math.min(devicePixelRatio, 1.75) * 0.9); }
  resize();

  /* ---------------- the cast ---------------- */
  const tanoc = buildEikar({
    skin: '#8a5a3a', cap: '#4a3020', marking: 0xffb04a, markColor: 0x2a1208, emblem: 0xc89aff, build: 0.92, capTall: 0.66,
    weapon: 'axe', flasks: false, leg: 0x4a3420, foot: 0x2a1a0c, beltColor: 0x5a3a1c, tunic: 0x7a5a3a, trim: 0xc89a5a, scale: 0.86,
  });
  { const bl = tanoc.weapon.userData.blade; if (bl) { bl.material.color.setHex(0x9a9aa2); bl.material.emissiveIntensity = 0; } if (tanoc.weapon.userData.glow) tanoc.weapon.userData.glow.visible = false; }
  tanoc.setCape(0x9a3a1a);   // the Ahoac cloak, from the gate captain on Velki
  scene.add(tanoc.root);
  const buhkon = buildEikar(NPC_LOOKS.buhkon); scene.add(buhkon.root);
  const punk = cartoon(buildWildPunk({ seed: 31 }), 0.6); punk.root.scale.multiplyScalar(0.6); scene.add(punk.root);
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
  const give = (id, n) => ctx.give && ctx.give(id, n);
  const fold = (o, op) => o.traverse(m => { if (m.material) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = op; m.material.depthWrite = false; } });

  /* ---------------- the road's own bits: a cart in the ditch, a fallen pine, the ford ---------------- */
  const EV = { cart: null, log: null, ford: null };
  {
    // the cart, tipped in the ditch, and its family
    const cx = roadX(CART_Z) + 6, cz = CART_Z, cg = heightAt(cx, cz);
    const cart = new THREE.Group(); cart.position.set(cx, cg + 0.5, cz); cart.rotation.set(0, 0.2, -0.32);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 3.8), toon(0x8a5a36)); cart.add(bed);
    for (const sd of [-1, 1]) { const sideB = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 3.8), toon(0x7a4e2c)); sideB.position.set(sd * 1.2, 0.45, 0); cart.add(sideB); }
    for (let k = 0; k < 5; k++) { const bx = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), toon([0x9a6a40, 0x8a3a2a, 0xd8b878][k % 3])); bx.position.set((k % 2 - 0.5) * 0.9, 0.45, -1.2 + k * 0.6); cart.add(bx); }
    const wheelL = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 14), toon(0x5a3a22)); wheelL.rotation.z = Math.PI / 2; wheelL.position.set(-1.3, -0.2, 0.9); cart.add(wheelL);
    const wheelR = wheelL.clone(); wheelR.position.x = 1.3; wheelR.visible = false; cart.add(wheelR);
    outlineAll(cart, 0.03); scene.add(cart); box(cx, cz, 1.4, 2.1, cg - 1, cg + 1.2);
    const fam = [{ skin: '#b8844e', cap: '#4a2a14', tunic: 0x6a8a4a }, { skin: '#c89a6a', cap: '#6a3a1a', tunic: 0xd8b878, scale: 0.7 }].map((lk, i) => {
      const a = buildEikar(Object.assign({ weapon: 'none', flasks: false }, lk)); a.root.position.set(cx + 2.4 + i * 1.1, heightAt(cx + 2.4, cz - 2), cz - 2 - i); a.root.rotation.y = -Math.PI / 2; scene.add(a.root); return a;
    });
    const wx = roadX(CART_Z - 26) + 30, wz = CART_Z - 26;
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 14), toon(0x5a3a22)); wheel.rotation.set(Math.PI / 2, 0, 0.3); addOutline(wheel, 0.03);
    EV.cart = { x: cx, z: cz, g: cg, cart, wheelR, fam, wx, wz, wheel, state: 'idle' };
    // the fallen pine across the forest road: two heavy ends and a thinner middle you can chop
    const lx = roadX(LOG_Z), lz = LOG_Z, lg = heightAt(lx, lz);
    const logs = [];
    for (const [ox, len, r] of [[-12, 16, 1.25], [0, 8, 0.95], [12, 16, 1.25]]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, len, 10), toon(0x5a3a22)); m.rotation.z = Math.PI / 2; m.position.set(lx + ox, heightAt(lx + ox, lz) + r * 0.9, lz);
      addOutline(m, 0.04); m.castShadow = true; scene.add(m); logs.push({ m, s: box(lx + ox, lz, len / 2, r, heightAt(lx + ox, lz) - 1, heightAt(lx + ox, lz) + r * 2.2) });
    }
    const roots = new THREE.Mesh(new THREE.DodecahedronGeometry(3.4, 0), toon(0x6a4a2e)); roots.position.set(lx - 21, lg + 2.4, lz); roots.scale.set(0.6, 1, 1); addOutline(roots, 0.05); scene.add(roots); cyl(lx - 21, lz, 3.4, lg - 1, lg + 6);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(4.2, 9, 7), toon(0x2f6a3a)); crown.rotation.z = -Math.PI / 2; crown.position.set(lx + 24, lg + 2.5, lz); addOutline(crown, 0.05); scene.add(crown); cyl(lx + 24, lz, 4.2, lg - 1, lg + 5);
    for (const sd of [-1, 1]) for (let k = 0; k < 9; k++) {   // brambles the rest of the way across
      const bx = lx + sd * (26 + k * 3), bz = lz + (Math.random() - 0.5) * 2, bg = heightAt(bx, bz);
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 0), toon(0x3a5a2a)); b.position.set(bx, bg + 1.2, bz); addOutline(b, 0.04); scene.add(b); cyl(bx, bz, 1.8, bg - 1, bg + 3);
    }
    EV.log = { x: lx, z: lz, logs, hits: 0, open: false };
    // the ford: a cold stream right across the valley, and stepping stones over it
    const fy = baseH(FORD_Z) - 1.5;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(150, 9), toon(0x5ac0d8, { emissive: 0x1a6a80, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 }));
    water.rotation.x = -Math.PI / 2; water.position.set(roadX(FORD_Z), fy, FORD_Z); scene.add(water);
    const stones = [];
    [-3.4, -1.2, 1.1, 3.3].forEach((dz, i) => {
      const sx = roadX(FORD_Z) + (i % 2 ? 0.8 : -0.6), sz = FORD_Z + dz, top = fy + 0.45;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 2.2, 8), toon(0x9a9284)); st.position.set(sx, top - 1.1, sz); addOutline(st, 0.04); scene.add(st);
      cyl(sx, sz, 0.85, top - 3, top); stones.push(st);
    });
    EV.ford = { y: fy, water, stones, crossed: false };
  }

  function place(o, x, z, yaw = 0) { o.pos.set(x, groundAt(x, z, 60), z); o.yaw = yaw; }

  /* ===== the market, in Fyrsti'Vilag ===== */
  let crowd = null;
  function makeCrowd() {
    const spots = [];
    stalls.forEach((st, i) => { if (!i) return; for (let k = 0; k < 2; k++) { const f = 2.2, x = st.x + Math.sin(st.ry) * f + (k - 0.5) * 1.3 * Math.cos(st.ry), z = st.z + Math.cos(st.ry) * f - (k - 0.5) * 1.3 * Math.sin(st.ry); spots.push({ x, z, look: [st.x, st.z], kind: 'chat' }); } });
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + 0.3; spots.push({ x: SQUARE.x + Math.cos(a) * 4.7, z: SQUARE.z + 4 + Math.sin(a) * 4.7, look: [SQUARE.x, SQUARE.z + 4], kind: 'sit' }); }
    crowd = createCrowd({
      scene, rng, groundAt, C: CORE,
      resolve: q => { const y = q.y; q.y = 0.2; resolve(q, 0.4); q.y = y; },
      streets: [{ r: 9.5 }, { r: 19 }, { r: 29 }, { r: 39 }, { r: 49 }], roads: [{ a: -Math.PI / 2 }], spots,
      exits: doors.concat([V3(0, 0, GATE_Z - 6)]),
    });
    for (let i = 0; i < 30; i++) {
      const r = [9.5, 19, 19, 29, 39][i % 5], a = rng() * TAU;
      const p = crowd.spawn(FOLK_LOOKS[i % FOLK_LOOKS.length], V3(CORE.x + Math.cos(a) * r, 0, CORE.z + Math.sin(a) * r));
      if (i < spots.length && i < 14) { const sp = spots[i]; p.pos.set(sp.x, 0, sp.z); p.spot = sp; p.wait = 3 + rng() * 9; p.look = V3(sp.look[0], 0, sp.look[1]); }
    }
    stalls.forEach((st, i) => { if (!i) return; const p = crowd.spawn(FOLK_LOOKS[(i * 3) % FOLK_LOOKS.length], V3(st.x - Math.sin(st.ry) * 1.3, 0, st.z - Math.cos(st.ry) * 1.3)); p.fixed = true; p.look = V3(SQUARE.x, 0, SQUARE.z); p.vendor = true; });
  }
  function cut(shots, done, opts) { ctx.cutscene(true); cine.play(shots, () => { ctx.cutscene(false); done && done(); }, opts); }
  /* a held shot that runs as long as a conversation does */
  function held(cam, opts = { bars: true }) { cine.play([{ dur: 9999, cam }], null, opts); }
  function sayHeld(lines, cam, cb) { held(cam); ctx.say(lines, () => { cine.stop(); cb && cb(); }); }
  const sqF = () => { const fx = SQUARE.x - STALL.x, fz = SQUARE.z - STALL.z, fd = Math.hypot(fx, fz); return { x: fx / fd, z: fz / fd }; };
  function startMarket() {
    stage = 'market'; sub = 'wake'; ctx.save('market');
    setDusk(0);
    const f = sqF(), side = { x: -f.z, z: f.x };
    place(P, STALL.x + f.x * 2.4, STALL.z + f.z * 2.4, Math.atan2(-f.x, -f.z));
    // Buhkon steps round the end of his stall to him: in plain sight, not hidden behind it
    place(B, STALL.x + f.x * 1.6 + side.x * 2.3, STALL.z + f.z * 1.6 + side.z * 2.3, Math.atan2(P.pos.x - (STALL.x + side.x * 2.3), P.pos.z - (STALL.z + side.z * 2.3))); B.stay = B.pos.clone();
    CAM.yaw = Math.atan2(f.x, f.z); CAM.pitch = 0.22;
    tanoc.hat.visible = false; tanoc.weapon.visible = false;
    placeCart(CART0.x, CART0.z, Math.PI);
    MK = { n: 0, punk: null, calmed: false, hat: null, angel: null, sniller: null, leaving: 0, amulets: [], t: 0, loaded: 0, carrying: null, crates: [] };
    makeCrowd();
    ctx.blur(5);
    // a whole Tatu away: up past Velki in the sky, and down into a market at midday
    const tp = P.pos.clone(), two = () => ({ p: V3(tp.x + f.x * 4.2 - side.x * 2.6, 2.2, tp.z + f.z * 4.2 - side.z * 2.6), l: V3((tp.x + B.pos.x) / 2, 1.3, (tp.z + B.pos.z) / 2) });
    cut([
      { dur: 5.5, cam: (k, tt) => ({ p: V3(tp.x + 6, 3 + k * 2, tp.z + 8), l: V3(tp.x + 1700 * 0.2, 900 * 0.2 + 3 - k * 60, tp.z + 2300 * 0.2) }), caption: PRO.cards[0], onStart: () => ctx.blur(5) },
      { dur: 6, from: { p: [SQUARE.x + 26, 30, SQUARE.z + 30], l: [SQUARE.x, 0, SQUARE.z] }, to: { p: [tp.x + f.x * 7, 4, tp.z + f.z * 7 + 2], l: [tp.x, 1.2, tp.z] }, caption: PRO.cards[1], onStart: () => ctx.blur(3) },
    ], () => {
      ctx.play();
      ctx.location(...R.loc);
      const W = PRO.wake;
      sayHeld(W.slice(0, 5), two, () => {
        tanoc.hat.visible = true; ctx.blur(0); sfx.heal();
        sayHeld(W.slice(5).concat(PRO.focus.slice(0, 2), R.wakeExtra, PRO.focus.slice(2)), (k, tt) => {
          const a = Math.atan2(f.x, f.z) + Math.sin(tt * 0.15) * 0.6;   // drifting round the two of them, Velki above
          return { p: V3(tp.x + Math.sin(a) * 5.5, 2.4 + Math.sin(tt * 0.2) * 0.4, tp.z + Math.cos(a) * 5.5), l: V3((tp.x + B.pos.x) / 2, 1.6, (tp.z + B.pos.z) / 2) };
        }, startPacking);
      });
    });
  }
  /* pack the stall: three crates from the stall to the back of the cart */
  function startPacking() {
    sub = 'pack';
    const st = stalls[0];
    for (let k = 0; k < 3; k++) {
      const off = (k - 1) * 0.9, x = st.x + Math.cos(st.ry) * off, z = st.z - Math.sin(st.ry) * off;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.52, 0.62), toon([0x9a6a40, 0xb8844e, 0x8a5a36][k])); addOutline(m, 0.02);
      const it = addItem(V3(x, 1.28, z), 'Pick up a crate', null, m); it.act = () => takeCrate(it); MK.crates.push(it);
    }
    // the stall's own crates go (they're the ones you carry now)
    st.g.children.filter(c => c.isMesh && c.geometry.type === 'BoxGeometry' && c.position.y > 1.2 && c.position.y < 1.4).forEach(c => { c.visible = false; });
    packObjective();
    ctx.bark('buhkon', 'Crates into the back of the cart. Then we’re gone. Quick hands.', 3.5);
  }
  function packObjective() { objective(MK.carrying ? 'Load the crate onto the back of the cart' : 'Help the Carpenter pack: carry his crates to the cart', `Crates loaded: ${MK.loaded}/3`, 3, MK.loaded); }
  function cartBack() { const x = CART.pos.x - Math.sin(CART.yaw) * 2.8, z = CART.pos.z - Math.cos(CART.yaw) * 2.8; return V3(x, groundAt(x, z, 3, CART.solid), z); }   // (the ground behind it, not the top of the cart's own box)
  function takeCrate(it) {
    if (MK.carrying) return;
    dropItem(it); MK.crates.splice(MK.crates.indexOf(it), 1);
    MK.carrying = it.mesh; it.mesh.position.set(0, 2.05 / 0.86, 0.15); it.mesh.rotation.set(0, 0, 0); tanoc.root.add(it.mesh); sfx.ui();
    const back = cartBack();
    MK.loadItem = addItem(V3(back.x, back.y + 1, back.z), 'Load the crate onto the cart', () => loadCrate());
    setGoal(back.x, back.y, back.z); packObjective();
  }
  function loadCrate() {
    dropItem(MK.loadItem); MK.loadItem = null;
    const m = MK.carrying; tanoc.root.remove(m); MK.carrying = null;
    m.position.set(-0.5 + MK.loaded * 0.55, 1.42, -1.55 + (MK.loaded % 2) * 0.4); CART.load.add(m);
    MK.loaded++; sfx.slam(); setGoal(); packObjective();
    if (MK.loaded >= 3) { sub = 'packed'; ctx.bark('buhkon', 'Good lad. That’s the lot. Now — ', 2.5); setTimeout(() => { if (MK && sub === 'packed') marketMaterialize(); }, 1500); }
  }
  function marketMaterialize() {
    sub = 'hat';
    MK.angel = buildAngel(1.7); MK.angel.position.set(SQUARE.x - 7, 7, SQUARE.z - 2); scene.add(MK.angel);
    MK.sniller = buildSniller(1.6); MK.sniller.position.set(SQUARE.x + 7, 6, SQUARE.z - 4); scene.add(MK.sniller);
    MK.angel.userData.setVis(1); MK.sniller.userData.setVis(1);   // up close, and whole: nobody has ever seen them like this
    for (const m of [MK.angel, MK.sniller]) { m.userData.base = m.position.clone(); m.rotation.y = Math.atan2(P.pos.x - m.position.x, P.pos.z - m.position.z); particles.burst(m.position.x, m.position.y + 3, m.position.z, 80, { color: m === MK.angel ? 0xfff0c0 : 0x6af0e0, speed: 18, size: 1.1, life: 1.1 }); }
    particles.ring(P.pos.x, P.pos.y + 0.4, P.pos.z, 64, 16, { color: 0xffffff, size: 0.7, life: 0.8 });
    sfx.duat(); sfx.slam(); shake = 1.2;
    tanoc.hat.visible = false;
    const hat = tanoc.hat.clone(); const ws = V3(); tanoc.hat.getWorldScale(ws); hat.scale.copy(ws); hat.visible = true;
    // (a clone copies userData as plain JSON, so smooth.js's and detail.js's notes on each part are no longer geometry:
    // give every part its full-detail shape and forget the notes)
    { const src = []; tanoc.hat.traverse(o => src.push(o)); let i = 0; hat.traverse(o => { const s = src[i++], u = s && s.userData; if (o.isMesh && u && u._hi && u._hi.isBufferGeometry) o.geometry = u._hi; delete o.userData._hi; delete o.userData._lo; delete o.userData.smFrom; o.layers.mask = 1; }); }
    // knocked off onto open cobbles a few paces away — never up on the cart or a stall, where he couldn't reach it
    const a = P.yaw + 2.3, sp = freeSpot(P.pos.x + Math.sin(a) * 2.6, P.pos.z + Math.cos(a) * 2.6, 1.2), hp = V3(sp.x, heightAt(sp.x, sp.z) + 0.05, sp.z);
    hat.rotation.set(0.5, a, 0.3);
    MK.hat = addItem(hp, 'Put your hat back on', () => marketHatOn(), hat);
    { const gl = glowSprite(0xffe0a0, 1.6, 0.6); gl.position.set(0, 0.4 / Math.max(0.01, ws.y), 0); hat.add(gl); setGoal(hp.x, hp.y, hp.z); }   // (and easy to find in the blur)
    ctx.blur(4);
    MK.frozen = true;
    // the frozen moment: low behind the boy up at the two of them, then the Sniller's one eye, then the Angel's burning face
    const tp = P.pos.clone(), mid = () => V3((MK.angel.position.x + MK.sniller.position.x) / 2, 8, (MK.angel.position.z + MK.sniller.position.z) / 2);
    sayHeld(PRO.materialize.concat(PRO.freeze), (k, tt) => {
      const ph = Math.floor(tt / 5.5) % 3, sn = MK.sniller.position, an = MK.angel.position;
      if (ph === 0) { const back = V3(tp.x - mid().x, 0, tp.z - mid().z).normalize(); return { p: V3(tp.x + back.x * 3.2, 1.1, tp.z + back.z * 3.2), l: mid() }; }
      if (ph === 1) return { p: V3(sn.x + (tp.x - sn.x) * 0.3, sn.y + 5.4, sn.z + (tp.z - sn.z) * 0.3), l: V3(sn.x, sn.y + 6.4, sn.z) };
      return { p: V3(an.x + (tp.x - an.x) * 0.3, an.y + 5.6, an.z + (tp.z - an.z) * 0.3 + 1), l: V3(an.x, an.y + 6.2, an.z) };
    }, () => { ctx.blur(3); objective(STORY.PRO_OBJ.hat, 'Walk over to it'); });
  }
  function marketHatOn() {
    dropItem(MK.hat); MK.hat = null; setGoal(); tanoc.hat.visible = true; ctx.blur(0); sfx.heal();
    MK.frozen = false;
    // the Angels curse the Snillers: this one comes apart into amulets, and they rain on the square
    const s = MK.sniller.position.clone().add(V3(0, 4, 0));
    MK.dying = 0.001; sfx.core(); MK.leaving = 0.001;
    const spots = squareSpots();
    spots.forEach(([x, z], i) => {
      const it = addItem(V3(x, groundAt(x, z, 2.4) + 0.9, z), 'Pick up the Sniller amulet', null, amuletMesh());
      it.act = () => marketAmulet(it); it.y0 = it.pos.y; MK.amulets.push(it);
      it.fall = { from: s.clone(), t: -i * 0.12, dur: 1.4 + rng() * 0.6 };     // flung out of the storm, falling to where it lands
      it.mesh.position.copy(s);
    });
    crowd.panic();
    sub = 'told';
    const tp = P.pos.clone();
    sayHeld(PRO.hatBack, (k, tt) => ({ p: V3(tp.x + 9 + Math.sin(tt * 0.2) * 3, 3 + tt * 0.6, tp.z + 10), l: MK.angel ? V3(MK.angel.position.x, MK.angel.position.y + 4, MK.angel.position.z) : V3(SQUARE.x, 20, SQUARE.z) }),
      () => ctx.say(PRO.bag.concat(STORY.ESCAPE.plan), () => {
        sub = 'amulets'; tanoc.weapon.visible = true; marketObjective();
        ctx.hint('Amulets glow cold teal. Some sit on stall tables — jump up for them.');
      }));
  }
  /* where the cursed storm's amulets land round the square */
  function squareSpots() {
    const spots = [[-10, 62], [8, 84]];
    for (let i = 0; spots.length < 8 && i < 40; i++) { const a = i * 2.39996 + 0.7, r = 6 + (i % 4) * 4.5, x = SQUARE.x + Math.cos(a) * r, z = SQUARE.z + Math.sin(a) * r; if (Math.hypot(x - STALL.x, z - STALL.z) < 4 || Math.hypot(x - SQUARE.x, z - SQUARE.z - 4) < 6.5 || Math.hypot(x - CART.pos.x, z - CART.pos.z) < 5 || solidAt(x, 0.5, z) || spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 5)) continue; spots.push([x, z]); }
    return spots;
  }
  /* a reload mid-escape: back at the south wall, the rest of the square's amulets still lying where they fell */
  function resumeEscape() {
    stage = 'market'; sub = 'amulets'; setDusk(0);
    MK = { n: 1, punk: null, calmed: false, hat: null, angel: null, sniller: null, leaving: 0, amulets: [], t: 0, loaded: 3, carrying: null, crates: [] };
    makeCrowd(); crowd.panic();
    tanoc.hat.visible = true; tanoc.weapon.visible = true;
    squareSpots().slice(1).forEach(([x, z]) => { const it = addItem(V3(x, groundAt(x, z, 2.4) + 0.9, z), 'Pick up the Sniller amulet', null, amuletMesh()); it.act = () => marketAmulet(it); it.y0 = it.pos.y; MK.amulets.push(it); });
    ctx.play(); ctx.location(...R.loc);
    escBlink();
  }
  function marketAmulet(it) {
    if (it.fall) return;
    if (MK.esc) { it.act = null; dropItem(it); MK.amulets.splice(MK.amulets.indexOf(it), 1); particles.burst(it.pos.x, it.pos.y, it.pos.z, 24, { color: 0x6af0e0, speed: 4, size: 0.4, life: 0.8, gravity: 2 }); escAdd(1); return; }
    dropItem(it); MK.amulets.splice(MK.amulets.indexOf(it), 1); MK.n++;
    if (MK.n === 1) { escBlink(); return; }
    particles.burst(it.pos.x, it.pos.y, it.pos.z, 24, { color: 0x6af0e0, speed: 4, size: 0.4, life: 0.8, gravity: 2 });
    sfx.core(); ctx.toast(`Sniller amulet (${Math.min(MK.n, 6)}/6) — into the Relic-bound bag`, 2.2);
    const say = PRO.amuletSay(MK.n); if (say) ctx.bark('tanoc', say, 3);
    if (MK.n === 2 && !MK.punk) {
      const a = Math.atan2(SQUARE.x - P.pos.x, SQUARE.z - P.pos.z);
      const sp = freeSpot(P.pos.x + Math.sin(a) * 10, P.pos.z + Math.cos(a) * 10, 2.4);
      MK.punk = addFoe('wildpunk', sp.x, sp.z);
      ctx.say(PRO.punk, () => { marketObjective(); ctx.hint('Left-click to swing the hatchet.'); });
    }
    marketObjective(); marketCheck();
  }
  function marketObjective() {
    if (MK.esc) { escObjective(); return; }
    const O = STORY.PRO_OBJ;
    if (MK.punk && !MK.calmed) objective(O.punk, `Amulets gathered: ${MK.n}/6`, 6, MK.n);
    else objective(O.amulets(Math.min(MK.n, 6)), MK.n >= 6 && !MK.calmed ? 'The little Punk is still loose somewhere' : '', 6, Math.min(MK.n, 6));
  }
  function marketCheck() {
    if (MK.esc) return;   // the gate decides, now
    if (sub !== 'amulets' || MK.n < 6 || !MK.calmed) return;
    sub = 'called';
    ctx.say(PRO.called.slice(0, 2).concat([['buhkon', 'North. Home. Six days on foot, and I’ll tell you what I can on the way. Up on the cart — go!']]), () => {
      ctx.amulets(MK.n);
      leaveCity();
    });
  }
  /* out of the city: up on the cart, through the screaming streets, out of the north gate, and the road */
  function leaveCity() {
    // round the stall's crates and benches (not through them), then up the street to the gate
    const pts = CART.pos.z < 30
      ? [V3(CART.pos.x, 0, CART.pos.z), V3(1.5, 0, GATE_Z + 6), V3(0, 0, GATE_Z + 1), V3(0, 0, GATE_Z - 4), V3(roadX(-14), 0, -14), V3(roadX(-30), 0, -30), V3(roadX(-46), 0, -46), V3(roadX(-62), 0, -62), V3(roadX(-80), 0, -80)]
      : [V3(CART.pos.x, 0, CART.pos.z), V3(13.8, 0, 45), V3(9, 0, 37.5), V3(3, 0, 30), V3(0, 0, 22), V3(0, 0, GATE_Z - 2), V3(roadX(-14), 0, -14), V3(roadX(-46), 0, -46), V3(roadX(-80), 0, -80)];
    const curve = new THREE.CatmullRomCurve3(pts);
    CART.driver = true; P.inCart = true; CART.path = curve; CART.pathK = 0;
    tanoc.weapon.visible = false;
    const at = k => { const q = curve.getPointAt(Math.min(1, k)); q.y = groundAt(q.x, q.z, 3); return q; };
    cut([
      // (the camera keeps to the street itself — ahead of the cart, then trailing it high — so it never goes into a wall)
      { dur: 4, cam: k => { const c = CART.pos, f = V3(Math.sin(CART.yaw), 0, Math.cos(CART.yaw)); return { p: V3(c.x + f.x * (7 - k * 1.5), 2.2 + k * 0.6, c.z + f.z * (7 - k * 1.5)), l: V3(c.x, 1.9, c.z) }; }, caption: R.leave[0], onTick: k => { CART.pathK = k * 0.08; } },
      { dur: 5.5, cam: () => { const c = CART.pos, f = V3(Math.sin(CART.yaw), 0, Math.cos(CART.yaw)); return { p: V3(c.x - f.x * 8, 7.5, c.z - f.z * 8), l: V3(c.x + f.x * 10, 1.6, c.z + f.z * 10) }; }, onTick: k => { CART.pathK = 0.08 + k * 0.42; } },
      { dur: 4, from: { p: [5, 1.0, GATE_Z - 9], l: [0, 3, GATE_Z + 6] }, to: { p: [5.5, 1.2, GATE_Z - 10], l: [0, 2.5, GATE_Z - 2] }, onTick: k => { CART.pathK = 0.5 + k * 0.25; } },
      { dur: 6.5, cam: (k) => { const c = CART.pos; return { p: V3(c.x - 6 + k * 4, 6 + k * 26, c.z + 16 + k * 22), l: V3(c.x, 2, c.z - 30 - k * 40) }; }, caption: R.leave[1], onTick: k => { CART.pathK = 0.75 + k * 0.25; } },
    ], () => { CART.path = null; startDay1(true); });   // (and on they roll: no jump back to the gate)
  }
  function cleanMarket() {
    if (!MK) return;
    for (const it of MK.amulets) dropItem(it);
    for (const it of MK.crates || []) dropItem(it);
    if (MK.carrying) tanoc.root.remove(MK.carrying);
    if (MK.angel) scene.remove(MK.angel); if (MK.sniller) scene.remove(MK.sniller);
    if (crowd) for (const p of crowd.people) p.a.root.visible = false;
    for (const f of foes) scene.remove(f.a.root); foes.length = 0;
    MK = null;
  }

  /* ===== the escape: blinked across the city, and the long way back to the north gate =====
     The first amulet he touches throws him to the south wall. Buhkon waits with the cart at
     the north gate. On the way: amulets on the cobbles, one in a Kipsu's mouth, one driven
     into a garden wall, one a frightened mother gives him for finding her boy, one snatched
     from a looter (and his friends after it), one in the Stryx's mud fountain — past city
     guards taking them, and a Duskareth agent who wants the bag. */
  const ESC = STORY.ESCAPE;
  const ringAt = (r, a) => V3(CORE.x + Math.cos(a) * r, 0, CORE.z + Math.sin(a) * r);   // round the market quarter: a = +π/2 is its south side, −π/2 the gate
  const GATE_SPOT = V3(0, 0, GATE_Z + 8);
  function escAdd(n, why) { MK.n = Math.max(0, MK.n + n); if (n > 0) { sfx.core(); ctx.toast(`Sniller amulet (${MK.n}/${ESC.need}) — into the Relic-bound bag`, 2.2); } escObjective(); }
  function escAmuletItem(p, label = 'Pick up the Sniller amulet', onTree = false) {
    const q = onTree ? p : freeSpot(p.x, p.z, 0.8), it = addItem(V3(q.x, (onTree ? p.y : groundAt(q.x, q.z, 2.4)) + 0.9, q.z), label, null, amuletMesh());
    it.y0 = it.pos.y; it.act = () => { dropItem(it); MK.amulets.splice(MK.amulets.indexOf(it), 1); particles.burst(it.pos.x, it.pos.y, it.pos.z, 24, { color: 0x6af0e0, speed: 4, size: 0.4, life: 0.8, gravity: 2 }); escAdd(1); };
    MK.amulets.push(it); return it;
  }
  function escPerson(look, p, yaw, o = {}) {
    const a = buildEikar(Object.assign({ weapon: 'none', flasks: false }, look, o)); const q = freeSpot(p.x, p.z, 0.8);
    a.root.position.set(q.x, groundAt(q.x, q.z, 3), q.z); a.root.rotation.y = yaw ?? 0; scene.add(a.root);
    return { a, pos: a.root.position };
  }
  function escGlow(parent, y = 1.2) { const g = new THREE.Group(); g.add(amuletMesh()); g.scale.setScalar(0.7); g.position.set(0.35, y, 0.25); parent.add(g); return g; }
  function escBlink() {
    const E = MK.esc = { stage: 'cross', guards: [], looters: [], held: null, cuts: 0, agent: null, warnT: 0, told: {} };
    ctx.save('escape');
    sfx.duat(); shake = 0.8; particles.burst(P.pos.x, P.pos.y + 1, P.pos.z, 60, { color: 0x6af0e0, speed: 10, size: 0.7, life: 0.8 });
    ctx.whiteFlash && ctx.whiteFlash();
    // ...onto the top floor inside the home tree, facing out of the opening there that looks over the city to the gate
    const top = HT.levels.length - 1, looks = HT.levels[top].looks;
    const look = looks.length ? looks.reduce((b, q) => Math.abs(angDiff(q, toCore)) < Math.abs(angDiff(b, toCore)) ? q : b) : toCore;
    const to = HT.levelSpot(top, look, 0.75), dir = V3(Math.cos(look), 0, Math.sin(look));
    P.pos.set(to.x, to.y, to.z); P.yaw = Math.atan2(dir.x, dir.z); P.vel.set(0, 0, 0); CAM.yaw = Math.atan2(-dir.x, -dir.z); CAM.pitch = 0.1;
    particles.burst(P.pos.x, P.pos.y + 1, P.pos.z, 60, { color: 0x6af0e0, speed: 10, size: 0.7, life: 0.8 });
    // the cart's at the gate, and Buhkon with it
    CART.path = null; placeCart(GATE_SPOT.x + 3, GATE_SPOT.z + 3, Math.PI); B.stay = V3(GATE_SPOT.x - 1.5, 0, GATE_SPOT.z); place(B, B.stay.x, B.stay.z, 0);
    escSpawn();
    sayHeld(ESC.blink, (k, tt) => ({ p: V3(P.pos.x - dir.x * 2.6 + dir.z * 0.9, P.pos.y + 2.1, P.pos.z - dir.z * 2.6 - dir.x * 0.9), l: V3(P.pos.x + dir.x * 60, P.pos.y - 8, P.pos.z + dir.z * 60) }), () => { escObjective(); ctx.hint(ESC.hint); });
  }
  function escSpawn() {
    const E = MK.esc, S = Math.PI / 2, top = HT.levels.length - 1;
    // round the home tree's floors inside, all the way down to the hall, and out in among its roots
    escAmuletItem(HT.levelSpot(top, toCore + 1.9), 'Pick up the Sniller amulet', true);
    escAmuletItem(HT.levelSpot(top, toCore - 2.3, 0.85), 'Pick up the Sniller amulet', true);
    escAmuletItem(HT.levelSpot(2, toCore + 0.7), 'Pick up the Sniller amulet', true);
    escAmuletItem(HT.levelSpot(1, toCore - 1.1, 0.85), 'Pick up the Sniller amulet', true);
    escAmuletItem(HT.levelSpot(0, toCore + 2.7), 'Pick up the Sniller amulet', true);
    escAmuletItem(HT.levelSpot(-1, toCore + 1.5, 0.55), 'Pick up the Sniller amulet', true);
    { const ra = HT.roots.reduce((b, q) => Math.abs(angDiff(q, toCore + 1.2)) < Math.abs(angDiff(b, toCore + 1.2)) ? q : b), a = ra + 0.3, r = HT.RB * 1.25; escAmuletItem(V3(HT.x + Math.cos(a) * r, 0, HT.z + Math.sin(a) * r), ESC.rootsAmulet); }
    // on the cobbles of the long streets north
    for (const [x, z] of [[0, 196], [22, 160], [-22, 140]]) escAmuletItem(V3(x, 0, z));
    // a market cart tipped over in the street, a well with its bucket left up, a garden bench
    {
      const c = V3(44, 0, 182), wood = toon(0x8a5a36);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 3.6), wood); bed.position.set(c.x, 0.9, c.z); bed.rotation.z = 1.2; addOutline(bed, 0.03); scene.add(bed);
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 14), toon(0x5a3a20)); wh.position.set(c.x - 0.4, 1.9, c.z + 1.1); wh.rotation.z = -0.4; addOutline(wh, 0.03); scene.add(wh);
      for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), toon([0xe08a3a, 0xd04a3a, 0xe8c84a][k % 3])); f.position.set(c.x + 1.3 + (k % 3) * 0.4, 0.2, c.z - 1 + k * 0.5); scene.add(f); }
      box(c.x, c.z, 1.1, 1.9, -1, 1.8);
      escAmuletItem(V3(c.x + 2.6, 0, c.z + 0.4), ESC.cartAmulet);
    }
    {
      const c = V3(-44, 0, 148), stone = toon(0xa89a88);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 1.0, 16, 1, true), stone); ring.position.set(c.x, 0.5, c.z); addOutline(ring, 0.03); scene.add(ring);
      const water = new THREE.Mesh(new THREE.CircleGeometry(1.25, 16), toon(0x2a4a5a)); water.rotation.x = -Math.PI / 2; water.position.set(c.x, 0.6, c.z); scene.add(water);
      for (const sd of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), toon(0x5a3a20)); post.position.set(c.x + sd * 1.25, 1.2, c.z); scene.add(post); }
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 4), toon(0x7a4a2a)); roof.rotation.y = Math.PI / 4; roof.position.set(c.x, 2.75, c.z); addOutline(roof, 0.03); scene.add(roof);
      cyl(c.x, c.z, 1.45, -1, 1.0);
      const it = escAmuletItem(V3(c.x + 1.9, 0, c.z), ESC.wellAmulet); it.pos.y = 1.2; it.y0 = 1.2;
    }
    {
      const c = V3(66, 0, 140), wood = toon(0x9a6a40);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.6), wood); seat.position.set(c.x, 0.55, c.z); addOutline(seat, 0.02); scene.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.1), wood); back.position.set(c.x, 0.95, c.z - 0.3); scene.add(back);
      box(c.x, c.z, 1.2, 0.35, -1, 0.6);
      escAmuletItem(V3(c.x, 0, c.z + 1.1), ESC.benchAmulet);
    }
    // a Kipsu with one in its mouth
    { const p = freeSpot(22, 202, 1); E.kipsu = addFoe('kipsu', p.x, p.z); E.kipsu.amulet = escGlow(E.kipsu.a.root, 0.6); }
    // one blown right into a garden wall along the avenue
    {
      const p = { x: -2.6, z: 176 }, g = heightAt(p.x, p.z);
      const m = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.2, 0.7), toon(0xb8a07a)); m.position.set(p.x, g + 1.1, p.z); m.rotation.y = Math.PI / 2; m.castShadow = true; addOutline(m, 0.04); scene.add(m);
      const crack = glowSprite(0x6af0e0, 1.6, 0.8); crack.position.set(p.x, g + 1.4, p.z); scene.add(crack);
      const s = box(p.x, p.z, 0.4, 2.2, g - 1, g + 2.2);
      E.wall = { m, crack, s, x: p.x, z: p.z, g, hits: 0, done: false };
    }
    // a frightened mother, and her boy hiding behind barrels two streets over
    {
      const mp = V3(22, 0, 150); E.mother = escPerson({ skin: '#b07a48', cap: '#5a3018', tunic: 0x8a5a6a }, mp, 0, { scale: 0.98 });
      const kp = V3(66, 0, 192); E.kid = escPerson({ skin: '#a8743e', cap: '#3a7a3a', tunic: 0x6a7a4a }, kp, 0, { scale: 0.55 });
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 10), toon(0x7a5a3a)); b.position.set(E.kid.pos.x + Math.cos(k * 2.1) * 1.1, E.kid.pos.y + 0.55, E.kid.pos.z + Math.sin(k * 2.1) * 1.1); addOutline(b, 0.03); scene.add(b); cyl(b.position.x, b.position.z, 0.45, E.kid.pos.y - 1, E.kid.pos.y + 1.1); }
      E.kidState = 'lost';
      E.motherItem = addItem(V3(E.mother.pos.x, E.mother.pos.y + 0.5, E.mother.pos.z), ESC.motherAsk, () => { dropItem(E.motherItem); ctx.say(ESC.mother, () => { E.kidState = 'search'; E.kidItem = addItem(V3(E.kid.pos.x, E.kid.pos.y + 0.4, E.kid.pos.z), ESC.kidSee, () => { dropItem(E.kidItem); ctx.say(ESC.kidTalk, () => { E.kidState = 'follow'; escObjective(); }); }); escObjective(); }); });
    }
    // a looter with one in his fist, and two friends
    {
      const lp = V3(-20, 0, 124); E.looter = escPerson({ skin: '#9a6a40', cap: '#2a2a2a', tunic: 0x4a4a3a }, lp, 0, { scale: 1.05, build: 1.15 });
      E.looterGlow = escGlow(E.looter.a.root, 1.15);
      E.looterItem = addItem(V3(E.looter.pos.x, E.looter.pos.y + 0.5, E.looter.pos.z), ESC.looterSee, () => {
        dropItem(E.looterItem); E.looter.a.root.remove(E.looterGlow); escAdd(1);
        ctx.say(ESC.snatched, () => {
          const at = E.looter.pos.clone(); scene.remove(E.looter.a.root);
          for (let k = 0; k < 3; k++) { const f = addFoe('looter', at.x + (k - 1) * 2.2, at.z + 1.5); f.state = 'chase'; }
          ctx.hint('Knock them down — left-click — or run.');
        });
      });
    }
    // the city guards, at the mouth of the street into the middle, taking amulets off anyone who has them
    for (const a of [S - 0.18, S + 0.22]) {
      const gp = ringAt(30, a), gd = escPerson({ skin: '#9a6a40', cap: '#3a2a1a', tunic: 0x4a4a5a, trim: 0xb8a070 }, gp, a, { weapon: 'spear', build: 1.15, scale: 1.05 });
      const cone = new THREE.Mesh(new THREE.CircleGeometry(11, 18, -0.6, 1.2), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      cone.geometry.rotateX(-Math.PI / 2); scene.add(cone);
      E.guards.push({ ...gd, cone, base: a, yaw: a, ph: Math.random() * 6 });
    }
    // the Stryx's fountain in the square has one in its mud
    E.fountainItem = { taken: false, mesh: amuletMesh() };
    E.fountainItem.mesh.position.set(SQUARE.x + 1.6, 0.9, SQUARE.z + 4 + 1.2); scene.add(E.fountainItem.mesh);
    // the young Punk, frightened half wild, somewhere on the way
    if (!MK.punk) { const a = S - 2.3, sp = freeSpot(ringAt(39, a).x, ringAt(39, a).z, 2.4); MK.punk = addFoe('wildpunk', sp.x, sp.z); MK.punk.waitT = 0; MK.punk.state = 'idle'; }
  }
  function escObjective() {
    const E = MK.esc; if (!E) { marketObjective(); return; }
    let hint = ESC.hint;
    if (E.held) { objective(ESC.fountainObj(E.cuts), 'Left-click to hack at the vines', 4, E.cuts); return; }
    if (E.kidState === 'search') hint = ESC.kidFind;
    else if (E.kidState === 'follow') hint = ESC.kidBack;
    else if (MK.punk && !MK.calmed && MK.punk.state !== 'idle') hint = STORY.PRO_OBJ.punk;
    else if (E.agent && E.agent.on) hint = ESC.agentHint;
    objective(ESC.obj(MK.n), hint, ESC.need, Math.min(MK.n, ESC.need));
  }
  function escGoal() {
    const E = MK.esc; if (!E) return null;
    if (E.kidState === 'search') return E.kid.pos;
    if (E.kidState === 'follow') return E.mother.pos;
    let best = null, bd = 1e9;
    for (const it of MK.amulets) { if (it.fall || Math.abs(it.pos.y - P.pos.y) > 4) continue; const d = it.pos.distanceTo(P.pos); if (d < bd && d < 30) { bd = d; best = it.pos; } }
    if (best) return best;
    // inside the home tree with nothing left on this floor: the way down is the great stair, then out of the great door
    if (HT.inside(P.pos.x, P.pos.z, P.pos.y)) { const ly = P.pos.y - HT.g; return ly > 2 ? HT.stairPoint(ly - 5) : HT.doorPoint(4); }
    return GATE_SPOT;
  }
  function escTick(dt) {
    const E = MK.esc; if (!E || E.stage !== 'cross') return;
    const g = escGoal(); if (g) setGoal(g.x, groundAt(g.x, g.z, 3), g.z);
    // the Kipsu: one bound away whenever you come close
    if (E.kipsu && !E.kipsu.dead && !E.told.kipsu && E.kipsu.pos.distanceTo(P.pos) < 14) { E.told.kipsu = true; ctx.bark('tanoc', ESC.kipsuSee, 3); }
    // the boy, once found, holds your hand and trots after you
    if (E.kidState === 'follow') {
      const k = E.kid, back = V3(P.pos.x - Math.sin(P.yaw) * 1.4, 0, P.pos.z - Math.cos(P.yaw) * 1.4), dx = back.x - k.pos.x, dz = back.z - k.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.5) { const v = Math.min(9, d * 3); k.pos.x += dx / d * v * dt; k.pos.z += dz / d * v * dt; k.a.root.rotation.y = Math.atan2(dx, dz); }
      const q = k.pos.clone(); resolve(q, 0.3); k.pos.x = q.x; k.pos.z = q.z; k.pos.y = groundAt(k.pos.x, k.pos.z, k.pos.y + 1);
      k.a.animate(dt, { speed: d > 0.5 ? Math.min(9, d * 3) : 0, onGround: true, t });
      if (E.mother.pos.distanceTo(P.pos) < 4) { E.kidState = 'home'; ctx.say(ESC.kidHome, () => { escAdd(1); escObjective(); }); }
    } else if (E.kid) E.kid.a.animate(dt, { speed: 0, onGround: true, t });
    if (E.mother) { E.mother.a.root.rotation.y = Math.atan2(P.pos.x - E.mother.pos.x, P.pos.z - E.mother.pos.z); E.mother.a.animate(dt, { speed: 0, onGround: true, t, talking: E.kidState === 'lost' }); }
    if (E.looter && E.looter.a.root.parent) E.looter.a.animate(dt, { speed: 0, onGround: true, t });
    // the guards: they look up and down the street; if they see you, they take one and send you back
    for (const gd of E.guards) {
      gd.yaw = gd.base + Math.sin(t * 0.5 + gd.ph) * 0.9;
      gd.a.root.rotation.y = gd.yaw; gd.a.animate(dt, { speed: 0, onGround: true, t });
      gd.cone.position.set(gd.pos.x, gd.pos.y + 0.2, gd.pos.z); gd.cone.rotation.y = gd.yaw - Math.PI / 2;
      const dx = P.pos.x - gd.pos.x, dz = P.pos.z - gd.pos.z, d = Math.hypot(dx, dz), off = Math.abs(((Math.atan2(dx, dz) - gd.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      let seen = MK.n > 0 && (d < 2.2 || (d < 11 && off < 0.6));
      if (seen && d >= 2.2) for (let k = 1; k < 8; k++) { const q = k / 8; if (solidAt(lerp(gd.pos.x, P.pos.x, q), gd.pos.y + 1.4, lerp(gd.pos.z, P.pos.z, q))) { seen = false; break; } }
      if (seen && t > (E.seenT || 0)) {
        E.seenT = t + 4;
        ctx.say(ESC.guardSeen, () => { escAdd(-1); ctx.toast(ESC.guardTook, 3); const away = V3(P.pos.x - gd.pos.x, 0, P.pos.z - gd.pos.z).normalize(); const q = freeSpot(gd.pos.x + away.x * 14, gd.pos.z + away.z * 14, 1); place(P, q.x, q.z, P.yaw); if (!E.told.guards) { E.told.guards = true; ctx.hint(ESC.guardHint); } });
        return;
      }
    }
    // the Stryx's fountain: step in after the amulet, and its vines have you
    const F0 = V3(SQUARE.x, 0, SQUARE.z + 4), fd = Math.hypot(P.pos.x - F0.x, P.pos.z - F0.z);
    if (!E.fountainItem.taken) {
      E.fountainItem.mesh.rotation.y = t * 1.5;
      if (!E.told.fountain && fd < 12) { E.told.fountain = true; ctx.bark('tanoc', ESC.fountainSee, 3); }
      if (!E.held && fd < fountain.R - 0.6) {
        E.held = { at: P.pos.clone() }; E.cuts = 0; P.vel.set(0, 0, 0); fountain.hold(P.pos);
        ctx.say(ESC.fountainGrab, () => escObjective());
      }
    }
    if (E.held) { fountain.hold(P.pos); P.vel.set(0, 0, 0); if (Math.random() < 0.3) particles.emit(P.pos.x, P.pos.y + 0.5, P.pos.z, { color: 0x6a8a3a, size: 0.35, life: 0.5, speed: 1.5 }); }
    // the Duskareth agent, in the north street: too strong to fight — outrun it
    if (!E.agent && P.pos.z < CORE.z - 6 && Math.abs(P.pos.x) < 10) {
      const v = buildVel(); scene.add(v.root); const p = freeSpot(P.pos.x + 2, P.pos.z - 12, 1); v.root.position.set(p.x, groundAt(p.x, p.z, 3), p.z);
      E.agent = { a: v, pos: v.root.position, on: true, yaw: 0, gone: false };
      particles.burst(p.x, groundAt(p.x, p.z, 3) + 1, p.z, 40, { color: 0x9a4aff, speed: 6, size: 0.6, life: 0.8 }); sfx.duat();
      ctx.say(ESC.agentSee, () => escObjective());
    }
    if (E.agent && E.agent.on) {
      const A = E.agent, dx = P.pos.x - A.pos.x, dz = P.pos.z - A.pos.z, d = Math.hypot(dx, dz);
      A.yaw = Math.atan2(dx, dz); const v = 7.6; A.pos.x += dx / d * v * dt; A.pos.z += dz / d * v * dt;
      const q = A.pos.clone(); resolve(q, 0.5); A.pos.x = q.x; A.pos.z = q.z; A.pos.y = groundAt(A.pos.x, A.pos.z, A.pos.y + 1);
      A.a.root.rotation.y = A.yaw; A.a.animate(dt, { speed: v, onGround: true, t });
      if (d < 1.8 && t > (E.agentT || 0)) {
        // it can take two at the most: after that its hand closes on nothing, and it only shoves him off
        const take = MK.n > 0 && (E.stolen || 0) < 2;
        E.agentT = t + 3; if (take) { E.stolen = (E.stolen || 0) + 1; escAdd(-1); }
        hurtTanoc(8, A.pos); P.vel.addScaledVector(V3(dx / d, 0, dz / d), 10); ctx.toast(take ? ESC.agentCaught : ESC.agentMiss, 3);
        particles.burst(A.pos.x, A.pos.y + 1.2, A.pos.z, 30, { color: 0x9a4aff, speed: 6, size: 0.5, life: 0.7 });
        const back = freeSpot(A.pos.x - dx / d * 8, A.pos.z - dz / d * 8, 1); A.pos.set(back.x, groundAt(back.x, back.z, 3), back.z);   // it blinks back a few paces, and comes again
      }
      if (P.pos.z < GATE_Z + 18) {
        A.on = false; scene.remove(A.a.root); particles.burst(A.pos.x, A.pos.y + 1, A.pos.z, 40, { color: 0x9a4aff, speed: 6, size: 0.6, life: 0.8 });
        // and what it took falls out of nothing as it goes, ringing on the cobbles
        for (let k = 0; k < (E.stolen || 0); k++) { const a = k * 2.4; escAmuletItem(V3(A.pos.x + Math.cos(a) * 1.6, 0, A.pos.z + Math.sin(a) * 1.6)); }
        ctx.toast(E.stolen ? ESC.agentDrop : ESC.agentLost, 3.5); E.stolen = 0;
      }
    }
    // never stuck: if what's left in the city can't make up the count (guards, the Vel), another turns up near him
    if (t > (E.netT || 0)) {
      E.netT = t + 1.5;
      const left = MK.amulets.length + (E.kipsu && E.kipsu.amulet ? 1 : 0) + (E.wall && !E.wall.done ? 1 : 0) + (E.kidState === 'home' ? 0 : 1)
        + (E.looterItem && items.includes(E.looterItem) ? 1 : 0) + (E.fountainItem.taken ? 0 : 1) + (E.agent && E.agent.on ? E.stolen || 0 : 0);
      if (MK.n + left < ESC.need) {
        const up = HT.inside(P.pos.x, P.pos.z, P.pos.y);   // (still in the tree: one turns up in the hall, on the way out)
        const to = up ? HT.levelSpot(-1, HT.door.a + 0.7, 0.6) : V3(P.pos.x + (GATE_SPOT.x - P.pos.x) * 0.1, 0, P.pos.z + (GATE_SPOT.z - P.pos.z) * 0.1);
        const it = escAmuletItem(to); particles.burst(it.pos.x, it.pos.y, it.pos.z, 20, { color: 0x6af0e0, speed: 4, size: 0.4, life: 0.7 });
        ctx.bark('tanoc', ESC.stray, 3);
      }
    }
    // at the gate: Buhkon and the cart — but only with enough of them, and the little Punk seen to
    if (P.pos.distanceTo(GATE_SPOT) < 7) {
      if (MK.n >= ESC.need && MK.calmed) { E.stage = 'gate'; setGoal(); ctx.say(ESC.gate, () => { ctx.amulets(MK.n); leaveCity(); }); }
      else if (t > E.warnT) { E.warnT = t + 6; ctx.bark('buhkon', MK.n < ESC.need ? ESC.short(MK.n) : 'The little Punk, Tanoc — it’s still loose and frightened somewhere back there. Calm it.', 4.5); }
    }
    if (P.pos.z < GATE_Z + 3) { P.pos.z = GATE_Z + 3; P.vel.z = Math.max(0, P.vel.z); }   // not out of the gate without the cart
  }
  /* hits that aren't at foes: the cracked wall, and the vines that hold you in the fountain */
  function escSwing() {
    const E = MK && MK.esc; if (!E) return;
    if (E.held) {
      E.cuts++; sfx.hit(); shake = 0.25; particles.burst(P.pos.x, P.pos.y + 1, P.pos.z, 14, { color: 0x6a9a3a, speed: 5, size: 0.4, life: 0.5, gravity: -6 });
      if (E.cuts >= 4) {
        E.held = null; fountain.hold(null); E.fountainItem.taken = true; scene.remove(E.fountainItem.mesh);
        const away = V3(P.pos.x - SQUARE.x, 0, P.pos.z - SQUARE.z - 4).normalize(); P.vel.set(away.x * 9, 6, away.z * 9); P.onGround = false;
        ctx.toast(ESC.fountainFree, 3.5); escAdd(1);
      } else escObjective();
      return;
    }
    const W = E.wall;
    if (W && !W.done && Math.hypot(P.pos.x - W.x, P.pos.z - W.z) < 3.4) {
      W.hits++; sfx.hit(); shake = 0.3; particles.burst(W.x, W.g + 1.4, W.z, 18, { color: 0xc8b08a, speed: 5, size: 0.4, life: 0.6, gravity: -8 });
      if (W.hits < 3) { ctx.bark('tanoc', ESC.wallHits[W.hits - 1], 1.6); return; }
      W.done = true; scene.remove(W.m); scene.remove(W.crack); solids.splice(solids.indexOf(W.s), 1); sfx.slam(); shake = 0.6;
      particles.burst(W.x, W.g + 1.1, W.z, 40, { color: 0xb8a07a, speed: 8, size: 0.6, life: 0.9, gravity: -10 });
      ctx.toast(ESC.wallBroke, 3); escAdd(1);
    }
  }

  /* a new day: a few shots of the land with its words over them, the three of them walking on under it */
  function dayCine(cards, shots, done) {
    shots.forEach((sh, i) => { if (!sh.caption && cards[i]) sh.caption = cards[i]; });
    if (cards.length > shots.length) shots[shots.length - 1].caption = cards.slice(shots.length - 1);
    P.auto = true;
    cut(shots, () => { P.auto = false; done && done(); });
  }
  /* at the fire: round the flames, then up past them at the sky and the mountains, then wide over the camp */
  function fireCam(c) {
    return (k, tt) => {
      const ph = Math.floor(tt / 7.5) % 3, a = tt * 0.1;
      if (ph === 0) return { p: V3(c.x + Math.cos(a) * 6.5, c.y + 2.2, c.z + Math.sin(a) * 6.5), l: V3(c.x, c.y + 1.2, c.z) };
      if (ph === 1) return { p: V3(c.x - 8, c.y + 1.0, c.z + 7), l: V3(c.x + 40, c.y + 34, c.z - 90) };
      return { p: V3(c.x + 16, c.y + 11, c.z + 12), l: V3(c.x - 14, c.y + 6, c.z - 40) };
    };
  }
  function fireSay(ci, lines, cb) { sayHeld(lines, fireCam(camps[ci]), cb); }

  /* making camp, each night: the boy hops down, Buhkon climbs off the bench, lets the Punks out of the shafts to
     graze, pitches the tent, sets out his little workbench, and lights the fire — then supper and talk */
  let SET = null;
  function pitch(c, what) {
    const o = c.kit[what], at = what === 'tent' ? c.tentAt : c.benchAt;
    o.visible = true;
    if (!c.solids.some(q => q.what === what)) { const q = what === 'tent' ? cyl(at.x, at.z, 1.5, at.y - 1, at.y + 1.8) : cyl(at.x, at.z, 0.8, at.y - 1, at.y + 0.95); q.what = what; c.solids.push(q); }
  }
  function campUp(c) { pitch(c, 'tent'); pitch(c, 'bench'); c.kit.tent.scale.set(1, 1, 1); c.kit.bench.scale.set(1, 1, 1); c.on = true; unhitch(c); }
  function campDown(c) {
    c.kit.tent.visible = c.kit.bench.visible = false; c.on = false;
    for (const q of c.solids) { const i = solids.indexOf(q); if (i >= 0) solids.splice(i, 1); }
    c.solids.length = 0; hitch();
  }
  function makeCamp(ci, then) {
    const c = camps[ci];
    hopDown(); DRIVE.on = false; CART.driver = false; DRIVE.sp = 0;
    CART.g.updateMatrixWorld(); const off = CART.g.localToWorld(V3(1.9, 0, 1.6)); place(B, off.x, off.z, CART.yaw);
    B.stay = V3(off.x + 0.5, 0, off.z + 3.4);   // round to the Punks' heads first
    SET = { c, then, step: 0, t: 0, pop: null };
    objective('Make camp with the Carpenter', 'He lets the Punks graze, pitches the tent and sets out his bench — then the fire');
    ctx.bark('buhkon', ci ? 'This’ll do. Punks out, tent up, fire going — and then we eat.' : 'Here’s our oak. Punks out, tent up, fire going.', 3.5);
  }
  function setTick(dt) {
    if (!SET) return;
    const S = SET, c = S.c, near = q => Math.hypot(B.pos.x - q.x, B.pos.z - q.z) < 1.9, by = (q, d) => { const dx = q.x - c.x, dz = q.z - c.z, l = Math.hypot(dx, dz) || 1; return V3(q.x - dx / l * d, 0, q.z - dz / l * d); };
    S.t += dt;
    if (S.pop) { S.pop.k = Math.min(1, S.pop.k + dt / 0.7); const k = S.pop.k, e = 1 - Math.pow(1 - k, 3); S.pop.o.scale.set(1, Math.max(0.02, e * (1 + Math.sin(k * Math.PI) * 0.12)), 1); if (k >= 1) S.pop = null; }
    if (S.step === 0 && (near(B.stay) || S.t > 5)) {
      S.step = 1; S.t = 0; unhitch(c); sfx.ui();
      ctx.bark('buhkon', 'Off you go, the pair of you. Grass, not the boy’s hat.', 2.6);
      B.stay = by(c.tentAt, 2.3);
    } else if (S.step === 1 && (near(B.stay) || S.t > 9)) {
      S.step = 2; S.t = 0; pitch(c, 'tent'); S.pop = { o: c.kit.tent, k: 0 }; sfx.slam();
      particles.burst(c.tentAt.x, c.tentAt.y + 0.5, c.tentAt.z, 16, { color: 0xd8c8a0, speed: 3, size: 0.4, life: 0.5 });
      B.stay = by(c.benchAt, 1.3);
    } else if (S.step === 2 && !S.pop && (near(B.stay) || S.t > 9)) {
      S.step = 3; S.t = 0; pitch(c, 'bench'); S.pop = { o: c.kit.bench, k: 0 }; sfx.slam();
      B.stay = V3(c.x - 1.4, 0, c.z + 0.4);
    } else if (S.step === 3 && !S.pop && (near(B.stay) || S.t > 9)) {
      S.step = 4; S.t = 0; c.on = true; sfx.flare();
      particles.burst(c.x, c.y + 0.6, c.z, 30, { color: 0xff8a2a, speed: 4, size: 0.5, life: 0.7, gravity: -3 });
      B.stay = V3(c.x + 2.2, 0, c.z - 1.5);
    } else if (S.step === 4 && S.t > 1.2) { SET = null; S.then(); }
  }

  /* ===== Day 1: the low country, and the fire-stone ===== */
  let D1 = null;
  function startDay1(rolling) {
    cleanMarket();
    stage = 'day1'; sub = 'walk'; ctx.save('day1'); ctx.blur(0);
    tanoc.hat.visible = true; tanoc.weapon.visible = true;
    if (!rolling) {   // (a reload: the cart waits just outside the gate, Buhkon up on the bench)
      P.inCart = false; placeCart(roadX(GATE_Z - 10), GATE_Z - 10, Math.PI);
      place(P, roadX(GATE_Z - 7) - 2.6, GATE_Z - 7, Math.PI);
    }
    drive(); setStop(CART_Z + 12, () => familyAsk());
    CAM.yaw = 0; CAM.pitch = 0.2; setDusk(0.1);
    D1 = { said: 0, kofi: null, pebble: false, tried: {} };
    dayCine(R.day1.cards, [
      { dur: 6.5, from: { p: [roadX(-160) + 80, 60, -230], l: [roadX(-60), 2, -50] }, to: { p: [roadX(-110) + 46, 34, -160], l: [roadX(-20), 2, -10] } },
      { dur: 5.5, cam: () => ({ p: V3(P.pos.x + 3.2, P.pos.y + 1.6, P.pos.z - 9.5), l: V3(P.pos.x, P.pos.y + 1.4, P.pos.z) }) },
    ], () => {
      ctx.play(); ctx.location('The Road North', 'Day one · the low country');
      ctx.say(R.day1.talk, () => { objective(R.obj.day1, P.inCart ? 'Riding in the cart · E to hop down and walk' : 'Walk beside the cart, or climb up into it (E)'); setGoal(camps[0].x, camps[0].y, camps[0].z); });
    });
  }
  function day1Tick() {
    if (sub !== 'walk') return;
    const prog = clamp((GATE_Z - P.pos.z) / (GATE_Z - CAMP1.z), 0, 1);
    setDusk(0.1 + prog * 0.85);
    const marks = [0.12, 0.5, 0.62, 0.8];
    if (D1.said < marks.length && prog > marks[D1.said]) {
      const [who, line] = R.day1.barks[D1.said]; ctx.bark(who, line, 4);
      if (D1.said === 2) { const z = P.pos.z - 14; D1.kofi = addFoe('kofi', roadX(z) + 3, z); }
      D1.said++;
    }
    cartTick();
    // the amulet in the hedge
    if (!D1.hedge && P.pos.z < HEDGE_Z + 30) {
      D1.hedge = true; const hx = roadX(HEDGE_Z) - 7.5, hz = HEDGE_Z;
      const it = addItem(V3(hx, heightAt(hx, hz) + 1.1, hz), 'Pry the amulet out of the hedge', null, amuletMesh()); it.y0 = it.pos.y;
      it.act = () => { dropItem(it); ctx.amulets(1); sfx.core(); ctx.toast('Sniller amulet — into the Relic-bound bag', 2.2); };
      for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + Math.random() * 0.5, 0), toon(0x4a7a34)); b.position.set(hx + (k - 2.5) * 1.6, heightAt(hx, hz) + 0.9, hz + (Math.random() - 0.5)); scene.add(b); }
      ctx.say(R.day1.hedge);
    }
    // far off over the fields, at dusk: a Sniller, half there
    if (!D1.sn && prog > 0.86) {
      D1.sn = buildSniller(2.6); fold(D1.sn, 0.55); D1.sn.position.set(roadX(P.pos.z) - 110, heightAt(roadX(P.pos.z) - 110, P.pos.z - 60) + 18, P.pos.z - 60); scene.add(D1.sn); D1.snT = 0;
      ctx.say(R.day1.sniller);
    }
    if (P.pos.distanceTo(V3(camps[0].x, camps[0].y, camps[0].z)) < 12 && Math.abs(CART.pos.z - camps[0].park) < 2) {
      sub = 'camp'; setGoal();
      makeCamp(0, () => fireSay(0, R.day1.camp, () => {
        sub = 'stone'; ctx.giveFireStone(false);
        for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4, x = camps[0].x + Math.cos(a) * 3.2, z = camps[0].z + Math.sin(a) * 3.2; const peb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), toon(0xb0a898)); const it = addItem(V3(x, heightAt(x, z) + 0.12, z), 'Pick up a pebble', null, peb); it.act = () => { for (const q of items.filter(q => q.label === 'Pick up a pebble')) dropItem(q); D1.pebble = true; sfx.ui(); ctx.toast('A smooth little pebble.', 2); stoneObjective(); }; }
        stoneObjective();
        ctx.hint('Press E anywhere to try the fire-stone.');
      }));
    }
  }
  function cartTick() {
    const C = EV.cart; if (!C || C.state === 'done') return;
    const d = Math.hypot(P.pos.x - C.x, P.pos.z - C.z);
    if (C.state === 'idle' && d < 16) familyAsk();
  }
  /* the family in the ditch: the cart pulls up, Buhkon sends the boy down to help, and won't drive on till the wheel's back on */
  function familyAsk() {
    const C = EV.cart; if (!C || C.state !== 'idle') return;
    hopDown(); setStop(Math.min(CART.pos.z, CART_Z + 12)); DRIVE.block = R.day1.cartWait;
    {
      C.state = 'ask'; ctx.say(R.day1.cartSee, () => {
        C.state = 'find'; C.item = addItem(V3(C.wx, heightAt(C.wx, C.wz) + 0.8, C.wz), 'Take the cart wheel', () => { dropItem(C.item); C.state = 'carry'; carryWheel(C); ctx.toast(R.day1.wheelGot, 2.6); sfx.ui(); objective(R.obj.cartBack, 'The family will thank you'); setGoal(C.x, C.g, C.z); C.back = addItem(V3(C.x - 1.4, C.g + 0.6, C.z), 'Fit the wheel back on', () => fixCart()); }, C.wheel);
        if (!C.glow) { C.glow = glowSprite(0xffe0a0, 1.8, 0.55); C.wheel.add(C.glow); }   // (easy to spot out in the long grass)
        objective(R.obj.cart, 'Out in the field, east of the road'); setGoal(C.wx, heightAt(C.wx, C.wz), C.wz);
      });
    }
  }
  /* he rolls it back beside him, a hand on the rim — it doesn't just vanish into his pockets */
  function carryWheel(C) {
    const w = C.wheel; if (C.glow) { w.remove(C.glow); C.glow = null; }
    w.position.set(0.62 / 0.86, 0.6 / 0.86, 0.25 / 0.86); w.rotation.set(0, 0, Math.PI / 2); w.scale.setScalar(0.8 / 0.86); tanoc.root.add(w);
  }
  function fixCart() {
    const C = EV.cart; dropItem(C.back); if (C.wheel.parent) C.wheel.parent.remove(C.wheel); C.state = 'done'; setGoal(camps[0].x, camps[0].y, camps[0].z);
    C.cart.rotation.set(0, 0.2, 0); C.cart.position.y = C.g + 0.9; C.wheelR.visible = true;
    particles.burst(C.x, C.g + 1, C.z, 20, { color: 0xd8c098, speed: 4, size: 0.5, life: 0.6 }); sfx.slam();
    DRIVE.block = null; setStop(camps[0].park);
    ctx.say(R.day1.cartFixed, () => { give('bun', 1); objective(R.obj.day1, 'Back up into the cart (E) — or walk alongside'); });
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
        fireSay(0, S.trigger, () => { ctx.giveFireStone(true); hasStone = true; ctx.slotsHud && ctx.slotsHud(true); ctx.toast('Fire-stone Relic — its trigger found! It’s yours, and it’s on a quick slot.', 3.5); startDay2(); });
      } },
      { label: 'Put it away for now', act: null },
    ]);
  }

  /* ===== Day 2: the forest, the hunt, the Punk ===== */
  let D2 = null;
  function startDay2() {
    stage = 'day2'; sub = 'walk'; ctx.save('day2');
    for (const it of items.slice()) dropItem(it);
    campDown(camps[0]); P.inCart = false;
    placeCart(roadX(camps[0].park - 4), camps[0].park - 4, Math.PI); drive(); setStop(LOG_Z + 10, () => hopDown());
    place(P, roadX(CAMP1.z - 2) - 2.6, CAMP1.z - 2, Math.PI);
    CAM.yaw = 0; setDusk(0.05); D2 = { caught: false };
    dayCine(R.day2.cards, [
      // down out of the sky, through the tops of the pines, to the two of them on the road
      { dur: 7, ease: 'out', cam: k => ({ p: V3(P.pos.x + 26 - k * 20, P.pos.y + 34 - k * 30, P.pos.z - 34 + k * 22), l: V3(P.pos.x - 4 * (1 - k), P.pos.y + 1.2, P.pos.z - 10 * (1 - k)) }) },
      { dur: 5, cam: () => ({ p: V3(P.pos.x + 7, P.pos.y + 2, P.pos.z + 2), l: V3(P.pos.x, P.pos.y + 1.4, P.pos.z - 3) }) },
    ], () => {
      ctx.play(); ctx.location('The Road North', 'Day two · the forest');
      objective('Climb through the forest with the Carpenter', 'Ride in the cart (E), or walk alongside'); setGoal(EV.log.x, heightAt(EV.log.x, EV.log.z) + 1, EV.log.z);
    });
  }
  function day2Tick() {
    const L = EV.log, F = EV.ford;
    if (sub === 'walk' && !L.open && P.pos.z < LOG_Z + 14) {
      sub = 'log'; setGoal(L.x, heightAt(L.x, L.z) + 1, L.z); hopDown();
      ctx.say(R.day2.log, () => { objective(R.obj.log, 'Left-click to swing the hatchet at the middle of the trunk'); ctx.hint('Swing at the thin middle of the trunk.'); });
    }
    if (sub === 'log' && L.open) { sub = 'walk'; objective('Climb through the forest with the Carpenter', ''); setGoal(roadX(FORD_Z), F.y, FORD_Z + 6); setStop(FORD_Z + 10, () => hopDown()); }
    if (sub === 'walk' && L.open && !F.told && P.pos.z < FORD_Z + 16) { F.told = true; hopDown(); ctx.say(R.day2.stream, () => plankQuest()); }
    if (F.told && !F.crossed) {
      // in the water? Out, back to the near bank, and very cold
      if (Math.abs(P.pos.z - FORD_Z) < 4.4 && P.pos.y < F.y + 0.1 && P.onGround) {
        particles.burst(P.pos.x, F.y + 0.2, P.pos.z, 30, { color: 0xd8f4ff, speed: 5, size: 0.5, life: 0.7, gravity: 6 }); sfx.hurt();
        ctx.bark('tanoc', R.day2.splash[(F.dunk = (F.dunk || 0) + 1) % R.day2.splash.length], 2.5);
        place(P, roadX(FORD_Z + 7), FORD_Z + 7, Math.PI); P.vel.set(0, 0, 0);
      }
      if (P.pos.z < FORD_Z - 5 && F.planks >= 2) { F.crossed = true; ctx.say(R.day2.across, () => { objective('Climb through the forest with the Carpenter', ''); setGoal(camps[1].x, camps[1].y, camps[1].z); }); }
    }
    if (sub === 'walk' && F.crossed && P.pos.distanceTo(V3(camps[1].x, camps[1].y, camps[1].z)) < 12 && Math.abs(CART.pos.z - camps[1].park) < 2) {
      sub = 'send'; setGoal();
      makeCamp(1, () => fireSay(1, R.day2.send, () => {
        sub = 'hunt';
        for (let k = 0; k < 5; k++) { const a = rng() * TAU, r = 22 + rng() * 26, x = camps[1].x + Math.cos(a) * r, z = camps[1].z + Math.sin(a) * r; addFoe('kofi', x, z); }
        objective(R.obj.hunt, 'Q — set a pebble in the fire-stone and throw it. Kofi run from everything.');
      }));
    }
    if (sub === 'hunt') {
      const near = foes.filter(f => f.kind === 'kofi' && !f.dead).sort((a, b) => a.pos.distanceTo(P.pos) - b.pos.distanceTo(P.pos))[0];
      if (near) setGoal(near.pos.x, near.pos.y, near.pos.z);
      if (P.pos.distanceTo(V3(camps[1].x, P.pos.y, camps[1].z)) > 75 && (D2.warnT = (D2.warnT || 0) - 1 / 60) <= 0) { D2.warnT = 5; ctx.bark('tanoc', 'I can barely see the smoke. Better turn back a bit.', 3); }
    }
  }
  /* the ford: stones for feet, but not for wheels. Two long planks off the old footbridge washed up on the near
     bank, laid across the stream for the cart's wheels to run on */
  function plankQuest() {
    const F = EV.ford; F.planks = 0;
    if (!F.pile) {
      const sp = freeSpot(roadX(FORD_Z + 12) - 15, FORD_Z + 12, 3), g = heightAt(sp.x, sp.z);
      F.pile = V3(sp.x, g, sp.z);
      const wood = toon(0x7a5a3a), wet = toon(0x5a4630);
      for (let k = 0; k < 3; k++) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 1.4, 6), wet); post.position.set(sp.x - 2 + k * 2, g + 0.3, sp.z + 2.2); post.rotation.z = (k - 1) * 0.4; addOutline(post, 0.03); scene.add(post); }
      for (let k = 0; k < 3; k++) { const br = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 1.6 + k * 0.5), wood); br.position.set(sp.x + 2.4, g + 0.05 + k * 0.08, sp.z - 1 + k * 0.4); br.rotation.set(0, 0.5 + k * 0.7, 0.06); addOutline(br, 0.02); scene.add(br); }
      F.pileItems = [0, 1].map(k => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 11), wood); addOutline(m, 0.025);
        const it = addItem(V3(sp.x - 0.4 + k * 0.6, g + 0.06 + k * 0.1, sp.z), 'Pick up a long plank', null, m);
        m.rotation.y = 0.15 - k * 0.1; it.act = () => takePlank(it); return it;
      });
    }
    plankObjective();
  }
  function plankObjective() {
    const F = EV.ford;
    if (F.planks >= 2) { objective(R.obj.stream, 'Over the planks with the cart, or stone to stone — Space'); setGoal(roadX(FORD_Z - 6), heightAt(roadX(FORD_Z - 6), FORD_Z - 6), FORD_Z - 6); return; }
    objective(R.obj.planks(F.planks), F.carry ? 'Lay it across the stream where the wheels will run' : 'The old footbridge, washed up on the bank to the left of the road', 2, F.planks);
    if (F.carry) setGoal(roadX(FORD_Z + 6), heightAt(roadX(FORD_Z + 6), FORD_Z + 6), FORD_Z + 6); else setGoal(F.pile.x, F.pile.y, F.pile.z);
  }
  function takePlank(it) {
    const F = EV.ford; if (F.carry) return;
    dropItem(it); F.carry = it.mesh; it.mesh.position.set(0.22 / 0.86, 1.62 / 0.86, 0); it.mesh.rotation.set(0, 0, 0.08); it.mesh.scale.setScalar(1 / 0.86); tanoc.root.add(it.mesh); sfx.ui();
    const lx = roadX(FORD_Z + 6.5);
    F.layItem = addItem(V3(lx, heightAt(lx, FORD_Z + 6.5) + 0.5, FORD_Z + 6.5), 'Lay the plank across the stream', () => layPlank());
    tanoc.weapon.visible = false; plankObjective();
  }
  function layPlank() {
    const F = EV.ford; dropItem(F.layItem); F.layItem = null;
    tanoc.root.remove(F.carry); F.carry = null; tanoc.weapon.visible = true;
    const side = F.planks ? 1.32 : -1.32, top = baseH(FORD_Z) - 0.75, x = roadX(FORD_Z) + side;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 11.2), toon(0x7a5a3a)); m.position.set(x, top - 0.06, FORD_Z);
    m.rotation.y = Math.atan2(roadX(FORD_Z - 1) - roadX(FORD_Z + 1), -2) + Math.PI; addOutline(m, 0.025); m.castShadow = true; scene.add(m);
    box(x, FORD_Z, 0.32, 5.6, top - 0.6, top);
    F.planks++; sfx.slam(); particles.burst(x, top, FORD_Z + 4, 14, { color: 0xd8f4ff, speed: 3, size: 0.4, life: 0.5, gravity: 6 });
    if (F.planks < 2) { ctx.bark('buhkon', 'One. Now its brother — same width apart as the wheels.', 3); plankObjective(); return; }
    ctx.say(R.day2.planksDone, () => { setStop(camps[1].park); plankObjective(); });
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
      fireSay(1, R.day2.back, () => startDay3());
    }
  }

  /* ===== Day 3: rain, and the Carpenter talks ===== */
  let D3 = null;
  function startDay3() {
    stage = 'day3'; sub = 'rain'; ctx.save('day3'); D3 = { rain: true };
    P.inCart = false; drive(false); setStop(null);
    place(P, camps[1].x - 2, camps[1].z + 1.5, -Math.PI / 2); B.stay = V3(camps[1].x + 2.2, 0, camps[1].z - 1.5); place(B, B.stay.x, B.stay.z);
    placeCart(roadX(camps[1].park), camps[1].park, Math.PI);
    setDusk(0.75); campUp(camps[1]);
    // rain: the light goes grey and close, the sky low
    D3.fog = [fog.near, fog.far]; fog.near = 30; fog.far = 420; fog.color.set(0x6a7078); sun.intensity *= 0.35; hemi.intensity *= 0.8;
    skyU.uTop.value.set(0x4a5260); skyU.uLow.value.set(0x8a9098); skyU.uWarm.value = 0.15;
    const c3 = camps[1];
    cut([{ dur: 9, cam: (k, tt) => { const a = 0.6 + k * 1.6; return { p: V3(c3.x + Math.cos(a) * 12, c3.y + 4 - k * 1.5, c3.z + Math.sin(a) * 12), l: V3(c3.x, c3.y + 1, c3.z) }; }, caption: R.day3.cards }], () => {
      ctx.play();
      ctx.say(R.day3.axle, () => axleJob(() => fireSay(1, R.day3.talk, () => {
        // night. The rain stops; the amulets hum; something pale waits in the trees
        D3.rain = false; setDusk(1); sub = 'wisp'; if (D3.fog) [fog.near, fog.far] = D3.fog;
        const a = -0.6, wx = camps[1].x + Math.cos(a) * 16, wz = camps[1].z + Math.sin(a) * 16;
        D3.w = buildSniller(0.75); fold(D3.w, 0.5); D3.w.position.set(wx, heightAt(wx, wz) + 1.2, wz); scene.add(D3.w);
        // the stone ring it leads him to, off the road in the trees
        D3.ring = V3(roadX(CAMP2.z) - 38, 0, CAMP2.z - 40);
        for (let k = 0; k < 60 && trees3(D3.ring).length; k++) D3.ring.set(roadX(CAMP2.z) - 30 - Math.random() * 14, 0, CAMP2.z - 28 - Math.random() * 26);   // a clearing
        D3.ring.y = heightAt(D3.ring.x, D3.ring.z);
        for (const t of trees3(D3.ring)) solids.splice(solids.indexOf(t), 1);
        for (let k = 0; k < 7; k++) { const ang = k / 7 * TAU, sx = D3.ring.x + Math.cos(ang) * 4.2, sz = D3.ring.z + Math.sin(ang) * 4.2, st = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8 + Math.random(), 0.7), toon(0x6a7a62)); st.position.set(sx, heightAt(sx, sz) + 0.8, sz); st.rotation.y = -ang; addOutline(st, 0.04); scene.add(st); cyl(sx, sz, 0.5, heightAt(sx, sz) - 1, heightAt(sx, sz) + 1.8); }
        const wv = D3.w.position;
        sayHeld(R.day3.hum, (k, tt) => ({ p: V3(P.pos.x - (wv.x - P.pos.x) * 0.25, P.pos.y + 1.9, P.pos.z - (wv.z - P.pos.z) * 0.25), l: V3(wv.x, wv.y + 1.6, wv.z) }), () => { objective(R.obj.wisp, 'It keeps just ahead of you'); setGoal(D3.w.position.x, D3.w.position.y - 1, D3.w.position.z); });
      })));
    });
  }
  /* the cart's axle, mended in the rain: three straight ash saplings from round the camp */
  /* (cut with the hatchet: two good swings each, and down it goes) */
  function axleJob(then) {
    const c = camps[1]; let n = 0;
    objective(R.day3.axleObj(0), R.day3.axleHint, 3, 0);
    D3.saps = [];
    for (let k = 0; k < 3; k++) {
      const a = 0.9 + k * 2.1, r = 11 + k * 3, sp = freeSpot(c.x + Math.cos(a) * r, c.z + Math.sin(a) * r, 1.2), x = sp.x, z = sp.z, g = heightAt(x, z);
      const tree = new THREE.Group(); tree.position.set(x, g, z); scene.add(tree);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.4, 6), toon(0xd8d0b8)); trunk.position.y = 1.7; addOutline(trunk, 0.02); tree.add(trunk);
      const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0), toon(0x6a9a4a)); top.position.y = 3.6; addOutline(top, 0.03); tree.add(top);
      const glow = glowSprite(0xffd27a, 1.2, 0.35); tree.add(glow);
      const sap = { x, z, g, tree, hits: 0, cut: false, fall: null, it: null };
      sap.it = addItem(V3(x, g, z), R.day3.axleCut, () => ctx.hint('Swing the hatchet at it — left-click.'));
      D3.saps.push(sap);
      sap.chop = () => {
        sap.hits++; sfx.hit(); particles.burst(x, g + 0.8, z, 10, { color: 0xd8c098, speed: 4, size: 0.3, life: 0.4, gravity: -8 });
        tree.rotation.z = 0.06 * (sap.hits % 2 ? 1 : -1);
        if (sap.hits < 2) return;
        sap.cut = true; dropItem(sap.it); glow.visible = false; n++;
        sap.fall = { k: 0, a: Math.atan2(x - P.pos.x, z - P.pos.z) };   // it falls away from the boy
        particles.burst(x, g + 1, z, 14, { color: 0xd8c098, speed: 4, size: 0.35, life: 0.5, gravity: -8 });
        ctx.bark('tanoc', R.day3.axleCuts[n - 1], 2.5);
        if (n < 3) { objective(R.day3.axleObj(n), R.day3.axleHint, 3, n); return; }
        objective(R.day3.axleBring, ''); setGoal(CART.pos.x, CART.pos.y, CART.pos.z);
        const back = addItem(V3(CART.pos.x - 1.6, CART.pos.y + 0.4, CART.pos.z), 'Give the Carpenter the saplings', () => {
          dropItem(back); setGoal(); sfx.slam();
          ctx.say(R.day3.axleMend, () => { objective('Shelter from the rain', ''); then(); });
        });
      };
    }
  }
  function sapTick(dt) {
    if (!D3 || !D3.saps) return;
    for (const s of D3.saps) if (s.fall) {
      s.fall.k = Math.min(1, s.fall.k + dt * 1.6); const e = s.fall.k * s.fall.k;
      s.tree.rotation.set(Math.cos(s.fall.a) * e * 1.45, 0, -Math.sin(s.fall.a) * e * 1.45);
      if (s.fall.k >= 1 && !s.fall.gone) { s.fall.gone = true; sfx.slam(); setTimeout(() => { s.tree.visible = false; }, 1600); }
    }
  }
  /* clear any tree trunks out of the stone ring so the boy can walk in */
  function trees3(c) { return solids.filter(t => t.kind === 'cyl' && Math.hypot(t.x - c.x, t.z - c.z) < 7 && t.r < 1.6); }
  function day3Tick(dt) {
    if (!D3) return;
    if (sub === 'wisp' && D3.w) {
      const w = D3.w.position, d = Math.hypot(P.pos.x - w.x, P.pos.z - w.z), to = D3.ring;
      const rem = Math.hypot(to.x - w.x, to.z - w.z);
      if (d < 11 && rem > 1) {   // drifts on ahead, toward the ring
        const k = Math.min(1, 4.2 * dt / rem); w.x += (to.x - w.x) * k; w.z += (to.z - w.z) * k;
        if (!D3.told) { D3.told = true; ctx.bark('tale', R.day3.wispNear, 3.5); }
      }
      w.y = heightAt(w.x, w.z) + 1.2 + Math.sin(t * 2) * 0.2;
      D3.w.rotation.y = Math.atan2(P.pos.x - w.x, P.pos.z - w.z);
      setGoal(w.x, w.y - 1, w.z);
      if (rem < 1.2 && d < 9) {
        sub = 'wispGone'; particles.burst(w.x, w.y + 2, w.z, 60, { color: 0x6af0e0, speed: 5, size: 0.6, life: 1.2, gravity: -2 }); sfx.core();
        scene.remove(D3.w); D3.w = null;
        ctx.say(R.day3.wispGone, () => {
          const it = addItem(V3(to.x, to.y + 1.3, to.z), 'Pry loose the amulet in the stone', () => {
            dropItem(it); ctx.amulets(1); sfx.core(); ctx.toast('Sniller amulet — into the Relic-bound bag', 2.2);
            ctx.say(R.day3.wispAmulet, () => { sub = 'back'; objective(R.obj.wispBack, ''); setGoal(camps[1].x, camps[1].y, camps[1].z); });
          }, amuletMesh());
          const st = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 1.2), toon(0x5a6a52)); st.position.set(to.x, to.y + 1, to.z - 0.6); addOutline(st, 0.04); scene.add(st);
          objective(R.obj.wispAmulet, ''); setGoal(to.x, to.y, to.z);
        });
      }
    }
    if (sub === 'back' && P.pos.distanceTo(V3(camps[1].x, P.pos.y, camps[1].z)) < 6) { sub = 'slept'; setGoal(); fireSay(1, R.day3.back, () => startDay4()); }
  }

  /* ===== Day 4: the pass, and the Rodak ===== */
  let D4 = null;
  function startDay4() {
    stage = 'day4'; sub = 'walk'; ctx.save('day4');
    campDown(camps[1]); P.inCart = false; if (D3 && D3.saps) for (const s of D3.saps) s.tree.visible = false;
    placeCart(roadX(PASS0 + 14), PASS0 + 14, Math.PI); drive();
    setStop(ROCK0 + 14, () => { if (P.inCart) { hopDown(); ctx.bark('buhkon', R.day4.offCart, 3.5); } });
    place(P, roadX(PASS0 + 10) - 2.6, PASS0 + 10, Math.PI);
    if (K.on) place(K, roadX(PASS0 + 12) - 4, PASS0 + 12, Math.PI);
    CAM.yaw = 0; setDusk(0.25); P.hp = 100; D4 = { left: 0, rocks: [], rockT: 1, alpha: null };
    fog.near = 120; fog.far = 1600;
    dayCine(R.day4.cards, [
      { dur: 7.5, cam: k => ({ p: V3(P.pos.x + 6 - k * 3, P.pos.y + 2 + k * 26, P.pos.z + 10 + k * 18), l: V3(P.pos.x, P.pos.y + 1.5 + k * 70, P.pos.z - 60 - k * 140) }) },
      { dur: 4.5, cam: () => ({ p: V3(P.pos.x - 11, P.pos.y + 1.2, P.pos.z - 14), l: V3(P.pos.x, P.pos.y + 2.5, P.pos.z) }) },
    ], () => {
      ctx.play(); ctx.location('The Mountain Pass', 'Day four');
      objective(R.obj.day4, ''); setGoal(roadX(AMBUSH), heightAt(roadX(AMBUSH), AMBUSH), AMBUSH);
    });
  }
  function rockTick(dt) {
    // falling rocks: a shadow first, then the rock
    for (let i = D4.rocks.length - 1; i >= 0; i--) {
      const r = D4.rocks[i]; r.t += dt;
      const k = Math.min(1, r.t / r.fall); r.m.position.y = lerp(r.y0, r.g + r.s * 0.6, k * k); r.m.rotation.x += dt * 5;
      r.sh.scale.setScalar(0.4 + k * 0.8); r.sh.material.opacity = 0.25 + k * 0.4;
      if (k >= 1 && !r.hit) {
        r.hit = true; particles.burst(r.x, r.g + 0.5, r.z, 22, { color: 0x9a9284, speed: 6, size: 0.5, life: 0.6, gravity: -10 }); sfx.slam(); shake = Math.max(shake, 0.3);
        if (Math.hypot(P.pos.x - r.x, P.pos.z - r.z) < r.s + 0.9 && P.iframes <= 0) hurtTanoc(12, V3(r.x, r.g, r.z));
      }
      if (r.t > r.fall + 2.5) { scene.remove(r.m); scene.remove(r.sh); D4.rocks.splice(i, 1); }
    }
    if (sub !== 'rocks') return;
    D4.rockT -= dt;
    if (D4.rockT <= 0) {
      D4.rockT = 0.55 + Math.random() * 0.5;
      const lead = 2.5 + Math.random() * 4, x = P.pos.x + P.vel.x * 0.9 + (Math.random() - 0.5) * 6, z = P.pos.z + P.vel.z * 0.9 - lead * 0.3 + (Math.random() - 0.5) * 5;
      const g = heightAt(x, z), sz = 0.8 + Math.random() * 0.9;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(sz, 0), toon(0x8a8478)); m.position.set(x, g + 26, z); addOutline(m, 0.04); scene.add(m);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(sz + 0.6, 16), new THREE.MeshBasicMaterial({ color: 0x1a1008, transparent: true, opacity: 0.25, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(x, g + 0.08, z); scene.add(sh);
      D4.rocks.push({ m, sh, x, z, g, s: sz, y0: g + 26, t: 0, fall: 1.15 });
    }
    if (P.pos.z < ROCK1) { sub = 'walk'; setStop(AMBUSH + 34, () => hopDown()); ctx.say(R.day4.rocksDone, () => objective(R.obj.day4, '')); }
  }
  function day4Tick(dt) {
    rockTick(dt);
    if (sub === 'walk' && !D4.rocked && P.pos.z < ROCK0) { D4.rocked = true; sub = 'rocks'; hopDown(); ctx.say(R.day4.rocks, () => objective(R.obj.rocks, 'Keep moving — a shadow means a rock')); }
    if (sub === 'walk' && D4.rocked && P.pos.z < AMBUSH + 25) {
      sub = 'fight'; setGoal(); hopDown();
      if (CART.driver) { setStop(CART.pos.z); CART.driver = false; CART.g.updateMatrixWorld(); const off = CART.g.localToWorld(V3(2.2, 0, 1.6)); place(B, off.x, off.z, CART.yaw); B.stay = null; }   // down off the bench, hatchet out
      for (let k = 0; k < 4; k++) { const a = -0.9 + k * 0.6, x = P.pos.x + Math.sin(a) * 18 + (k % 2 ? 6 : -6), z = P.pos.z - Math.cos(a) * 16; addFoe('rodak', x, z); }
      ctx.say(R.day4.warn, () => d4Objective());
    }
    if (sub === 'fight') {
      const left = foes.filter(f => f.kind === 'rodak' && !f.dead && !f.fled && !f.alpha).length + (D4.alpha && !D4.alpha.dead ? 1 : 0);
      if (left !== D4.left) { D4.left = left; d4Objective(); }
      if (left === 0 && !D4.alpha) {   // the leader comes for the boy himself
        const a = P.yaw + Math.PI, ax = P.pos.x + Math.sin(a) * 14, az = P.pos.z + Math.cos(a) * 14;
        D4.alpha = addFoe('rodak', ax, az); D4.alpha.alpha = true; D4.alpha.a.root.scale.multiplyScalar(1.4); D4.alpha.hp = D4.alpha.max = 95;
        particles.burst(ax, D4.alpha.pos.y + 1, az, 30, { color: 0x3a3a4a, speed: 6, size: 0.5, life: 0.8 });
        ctx.say(R.day4.alpha, () => d4Objective()); return;
      }
      if (left === 0) {
        sub = 'won';
        ctx.say(R.day4.won, () => {
          ctx.save('day5');
          const ez = END + 30, ex = roadX(ez), ey = heightAt(ex, ez);
          setDusk(0.15);
          cut([
            { dur: 8, from: { p: [ex + 4, ey + 6, ez + 6], l: [townSmoke.x, townSmoke.y, townSmoke.z] }, to: { p: [ex - 6, ey + 22, ez - 30], l: [townSmoke.x, townSmoke.y - 4, townSmoke.z] }, caption: R.day5.cards },
          ], () => { done = true; ctx.onDone(); });
        });
      }
    }
  }
  function d4Objective() { objective(D4.alpha && !D4.alpha.dead ? 'Bring down the pack’s leader' : R.obj.rodak(D4.left), D4.alpha ? 'Q — the fire-stone, if it’s on a quick slot · left-click to swing' : 'Left-click to swing — the Carpenter and your Punk fight beside you'); }

  /* ---------------- foes and critters ---------------- */
  /* the nearest bit of open ground to (x, z): nothing solid within rad, inside the walls if it started there */
  function freeSpot(x, z, rad) {
    const inCity = Math.hypot(x - CITY.x, z - CITY.z) < CITY_R;
    const clear = (qx, qz) => {
      if (inCity && Math.hypot(qx - CITY.x, qz - CITY.z) > CITY_R - 3 - rad) return false;
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; const ax = qx + Math.cos(a) * rad, az = qz + Math.sin(a) * rad; if (solidAt(ax, heightAt(ax, az) + 0.6, az)) return false; }
      return !solidAt(qx, heightAt(qx, qz) + 0.6, qz);
    };
    if (clear(x, z)) return { x, z };
    for (let r = 1.5; r < 30; r += 1.5) for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, qx = x + Math.cos(a) * r, qz = z + Math.sin(a) * r; if (clear(qx, qz)) return { x: qx, z: qz }; }
    return { x, z };
  }
  function addFoe(kind, x, z) {
    const sd = Math.floor(rng() * 999);
    const a = kind === 'kofi' ? buildKofi({ seed: sd }) : kind === 'rodak' ? buildRodak({ seed: sd }) : kind === 'kipsu' ? buildKipsu({ seed: sd })
      : kind === 'looter' ? buildEikar({ skin: ['#9a6a40', '#b07a48', '#8a5a3a'][sd % 3], cap: '#2a2a2a', tunic: [0x4a4a3a, 0x5a3a2a, 0x3a4a4a][sd % 3], weapon: 'none', flasks: false, build: 1.1 }) : buildWildPunk({ seed: sd });
    if (kind === 'wildpunk') a.root.scale.multiplyScalar(0.62);
    if (kind === 'kipsu') a.root.scale.multiplyScalar(1.3);
    scene.add(a.root);
    const hp = { kofi: 1, rodak: 45, wildpunk: 40, kipsu: 1, looter: 24 }[kind];
    const f = { kind, a, pos: V3(x, groundAt(x, z, 60), z), vel: V3(), yaw: rng() * TAU, hp, max: hp, state: 'idle', timer: rng() * 2, windup: 0, flash: 0, dead: false, fled: false, cd: 1 + rng() };
    a.root.position.copy(f.pos); foes.push(f); return f;
  }
  function hitFoe(f, dmg, from) {
    if (f.dead || f.fled) return;
    f.hp -= dmg; f.flash = 1; sfx.hit();
    const d = V3(f.pos.x - from.x, 0, f.pos.z - from.z).normalize(); f.vel.addScaledVector(d, 6); f.stun = 0.35;
    particles.burst(f.pos.x, f.pos.y + 0.8, f.pos.z, 10, { color: f.kind === 'rodak' ? 0x9a9ab0 : 0xffb040, speed: 6, size: 0.3, life: 0.4, gravity: -10 });
    if (f.hp > 0) return;
    if (f.kind === 'kofi' && !(from && from.bolt) && stage === 'day2') {   // far too quick for a hatchet
      f.hp = f.max; f.vel.addScaledVector(d, 8);
      if (!D2.toldStone) { D2.toldStone = true; ctx.bark('buhkon', 'You’ll never catch a Kofi with a hatchet. The stone, Tanoc — a pebble’s quicker than any Kofi. (Q)', 4.5); }
      return;
    }
    if (f.kind === 'kofi') { f.dead = true; scene.remove(f.a.root); kofiCaught(); return; }
    if (f.kind === 'kipsu') {   // it spits out what it was carrying, and is off
      f.fled = true; f.state = 'flee'; f.timer = 2.5; sfx.heal();
      if (f.amulet) { f.a.root.remove(f.amulet); f.amulet = null; escAmuletItem(f.pos); ctx.bark('tale', STORY.ESCAPE.kipsuDrop, 2.5); }
      return;
    }
    if (f.kind === 'looter') {   // knocked down, he decides it isn't worth it
      f.fled = true; f.state = 'flee'; f.timer = 3;
      const n = foes.filter(o => o.kind === 'looter' && o.fled).length; ctx.bark('tale', STORY.ESCAPE.looterDown[Math.min(2, n - 1)], 2.2);
      return;
    }
    if (f.kind === 'wildpunk') {   // knock the fight out of it — it runs off instead of dying
      f.fled = true; f.state = 'flee'; f.timer = 3; MK.calmed = true; sfx.heal();
      ctx.say(PRO.calmed, () => { marketObjective(); marketCheck(); }); return;
    }
    f.dead = true; sfx.die();
    particles.burst(f.pos.x, f.pos.y + 1, f.pos.z, 26, { color: 0x3a3a4a, speed: 8, size: 0.45, life: 0.8, gravity: -6 });
    f.deadT = 0;
    // Rodak never stay to bury their own: past the second, the rest of the pack is gone — and the leader comes
    const rodakDown = foes.filter(o => o.kind === 'rodak' && o.dead && !o.alpha).length;
    if (rodakDown >= 2 && !f.alpha) for (const o of foes) if (o.kind === 'rodak' && !o.dead && !o.fled && !o.alpha) { o.fled = true; o.state = 'flee'; o.timer = 4; }
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
      } else if (f.kind === 'kofi' || f.kind === 'kipsu') {
        if (d < (f.kind === 'kipsu' ? 9 : 11) && playing) { wy = Math.atan2(-dx, -dz) + Math.sin(t * 3 + f.pos.x) * 0.6; want = f.kind === 'kipsu' ? 6.2 : 5.6; }
        else { f.timer -= dt; if (f.timer <= 0) { f.timer = 2 + rng() * 3; f.wy = rng() * TAU; } wy = f.wy || 0; want = 1; }
      } else if (playing && f.waitT != null && !f.roused) {   // (the frightened young Punk in the escape: it waits, wild, until he comes near)
        f.timer -= dt; if (f.timer <= 0) { f.timer = 0.8 + rng(); f.wy = rng() * TAU; } wy = f.wy || 0; want = 2.5;
        if (d < 13) { f.roused = true; f.state = 'chase'; ctx.say(PRO.punk, () => { marketObjective(); ctx.hint('Left-click to swing the hatchet.'); }); }
      } else if (playing) {
        const reach = f.alpha ? 2.8 : f.kind === 'rodak' ? 2.2 : 1.9, dmg = f.alpha ? 13 : f.kind === 'rodak' ? 9 : 6;
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
      resolve(f.pos, f.kind === 'wildpunk' ? 1.3 : 0.6);   // a Punk's legs reach well out from its body: keep all of them out of the walls
      f.pos.y = groundAt(f.pos.x, f.pos.z, f.pos.y + 1);
      f.a.root.position.copy(f.pos); f.a.root.rotation.y = f.yaw;
      f.a.animate(dt, { speed: Math.hypot(f.vel.x, f.vel.z), t, windup: f.windup || 0, attack: f.attackA || 0, onGround: true, swing: f.kind === 'looter' && f.attackA > 0 ? { kind: 1, p: 1 - f.attackA } : null });
    }
  }
  function chopLog() {
    const L = EV.log, mid = L.logs[1];
    L.hits++; sfx.hit(); shake = Math.max(shake, 0.25);
    particles.burst(mid.m.position.x + (P.pos.x - L.x) * 0.3, mid.m.position.y + 0.4, L.z, 18, { color: 0xc8a070, speed: 5, size: 0.35, life: 0.6, gravity: -8 });
    if (L.hits < 3) { ctx.bark('buhkon', L.hits === 1 ? 'One.' : 'Two. Put your back in it.', 1.6); return; }
    L.open = true; scene.remove(mid.m); const i = solids.indexOf(mid.s); if (i >= 0) solids.splice(i, 1);
    particles.burst(L.x, mid.m.position.y, L.z, 50, { color: 0xb8905a, speed: 8, size: 0.5, life: 0.9, gravity: -8 }); sfx.slam();
    ctx.say(R.day2.logDone);
  }
  function hurtTanoc(dmg, from) {
    P.hp -= dmg; P.iframes = 0.6; shake = Math.max(shake, 0.35); sfx.hurt();
    const d = V3(P.pos.x - from.x, 0, P.pos.z - from.z).normalize(); P.vel.addScaledVector(d, 6);
    if (P.hp <= 0) { P.hp = 60; P.iframes = 1.5; ctx.toast('Buhkon hauls you up by the collar. “Up. Again.”', 3); }
    ctx.hp(P.hp / 100);
  }

  /* ---------------- the fire-stone, once its trigger is found: Q (or wherever it's slotted) ---------------- */
  const bolts = [];
  let boltCd = 0, hasStone = false;
  function useSlot(id) {
    if (id !== 'r_firestone' || !hasStone || boltCd > 0 || stage === 'market') return;
    boltCd = 1.4;
    let tgt = null, bd = 30;
    for (const f of foes) { if (f.dead || f.fled) continue; const dx = f.pos.x - P.pos.x, dz = f.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d < bd && (dx * -Math.sin(CAM.yaw) + dz * -Math.cos(CAM.yaw)) / (d || 1) > 0.6) { bd = d; tgt = f; } }
    const from = V3(P.pos.x, P.pos.y + 1.3, P.pos.z);
    const vel = tgt ? V3(tgt.pos.x, tgt.pos.y + 0.8, tgt.pos.z).sub(from).normalize().multiplyScalar(32) : V3(-Math.sin(CAM.yaw) * 32, 1, -Math.cos(CAM.yaw) * 32);
    P.yaw = Math.atan2(vel.x, vel.z);
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), toon(0xffd060, { emissive: 0xff7a20, emissiveIntensity: 1 }))); g.add(glowSprite(0xff8a2a, 1.8, 0.9));
    g.position.copy(from); scene.add(g); bolts.push({ g, vel, life: 1.1 }); sfx.flare();
  }
  function updateBolts(dt) {
    boltCd = Math.max(0, boltCd - dt);
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i], p = b.g.position; b.life -= dt; p.addScaledVector(b.vel, dt);
      particles.emit(p.x, p.y, p.z, { vx: 0, vy: 0.4, vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: 0.45, life: 0.35, drag: 1 });
      let hit = b.life <= 0 || solidAt(p.x, p.y, p.z);
      for (const f of foes) { if (hit || f.dead || f.fled || f.pos.distanceTo(p) > 1.6) continue; hitFoe(f, f.kind === 'kofi' ? 1 : 22, { x: P.pos.x, z: P.pos.z, bolt: true }); hit = true; }
      if (hit) { particles.burst(p.x, p.y, p.z, 16, { color: 0xff8a2a, speed: 5, size: 0.4, life: 0.5 }); scene.remove(b.g); bolts.splice(i, 1); }
    }
  }

  /* ---------------- the walker, the Carpenter, the Punk ---------------- */
  function attack() {
    if (P.inCart || !tanoc.weapon.visible || P.swing > 0) return;
    P.swing = 0.42; P.hitDone = false; sfx.swing();
  }
  function updatePlayer(dt, playing) {
    let ix = 0, iz = 0;
    if (playing && !(MK && MK.esc && MK.esc.held)) {
      if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1;
      if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
      if (touch && touch.on) { ix += touch.move.x; iz += touch.move.y; }
    }
    const len = Math.hypot(ix, iz);
    const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = -fz, rz = fx;
    let wx = 0, wz = 0;
    if (len > 0.08) { const k = Math.min(1, len) / len; wx = (fx * iz + rx * ix) * k; wz = (fz * iz + rz * ix) * k; }
    if (P.auto) { const tz = P.pos.z - 8, tx = roadX(tz), dx = tx - P.pos.x, dz = tz - P.pos.z, dl = Math.hypot(dx, dz) || 1; wx = dx / dl * 0.7; wz = dz / dl * 0.7; }
    const run = keys.ShiftLeft || keys.ShiftRight, sp = (run ? 8.6 : 4.8) * (P.swing > 0 ? 0.35 : 1);
    P.vel.x = damp(P.vel.x, wx * sp, P.onGround ? 14 : 4, dt); P.vel.z = damp(P.vel.z, wz * sp, P.onGround ? 14 : 4, dt);
    if ((len > 0.08 || P.auto) && P.swing <= 0) P.yaw = dampAngle(P.yaw, Math.atan2(wx, wz), 12, dt);
    P.jumpBuf -= dt; P.coyote -= dt; P.iframes = Math.max(0, P.iframes - dt);
    if (P.jumpBuf > 0 && (P.onGround || P.coyote > 0) && playing) { P.vel.y = 9.2; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; sfx.jump(); }
    P.vel.y -= 26 * dt;
    P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
    resolve(P.pos);
    P.pos.y += P.vel.y * dt;
    const g = Math.max(groundAt(P.pos.x, P.pos.z, P.pos.y), auto.ground(P.pos.x, P.pos.z, P.pos.y));
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
        const L = EV.log;
        if (L && !L.open && Math.abs(P.pos.x - L.x) < 4.2 && Math.abs(P.pos.z - L.z) < 2.8) chopLog();
        if (D3 && D3.saps) for (const s of D3.saps) { if (s.cut) continue; const dx = s.x - P.pos.x, dz = s.z - P.pos.z, d = Math.hypot(dx, dz); if (d < 2.3 && (dx * Math.sin(P.yaw) + dz * Math.cos(P.yaw)) / (d || 1) > 0.1) s.chop(); }
        escSwing();
      }
    }
    const speed = Math.hypot(P.vel.x, P.vel.z);
    if (P.onGround && speed > 1) { P.stepPh += dt * speed * 0.55; if (P.stepPh > 1) { P.stepPh = 0; sfx.step(); } }
    placeWalker(tanoc.root, P, dt); tanoc.root.rotation.y = P.yaw;
    tanoc.animate(dt, { speed, onGround: P.onGround, t, swing: P.swing > 0 ? { kind: 1, p: 1 - P.swing / 0.42 } : null });
  }
  /* the cart: parked, driven along the road by Buhkon, or driven out of the city with the two of them aboard */
  function updateCart(dt) {
    let sp = 0;
    const was = CART.pos.clone();
    if (CART.path) {
      const k = clamp(CART.pathK || 0, 0, 1), q = CART.path.getPointAt(k), q2 = CART.path.getPointAt(Math.min(1, k + 0.01));
      CART.pos.set(q.x, groundAt(q.x, q.z, 60, CART.solid), q.z); CART.yaw = Math.atan2(q2.x - q.x, q2.z - q.z);
    } else if (DRIVE.on && stage !== 'market') {
      // Buhkon drives: down the middle of the road, keeping pace with the boy, and no further than the next stop
      let want = 0;
      if (CART.driver) {
        if (P.inCart) want = 5.6;
        else { const lead = CART.pos.z - P.pos.z;   // > 0: the boy is out ahead (north is -z)
          want = lead > 4 ? Math.min(8.5, 3.6 + lead * 0.45) : lead > -9 ? 3.6 : lead > -17 ? 1.4 : 0; }
        if (DRIVE.stopZ != null) want = Math.min(want, Math.max(0, CART.pos.z - DRIVE.stopZ) * 1.1 + (CART.pos.z > DRIVE.stopZ + 0.05 ? 0.3 : 0));
      }
      DRIVE.sp = damp(DRIVE.sp, want, 2.2, dt);
      if (DRIVE.sp > 0.01 && (DRIVE.stopZ == null || CART.pos.z > DRIVE.stopZ)) {
        let nz = CART.pos.z - DRIVE.sp * dt; if (DRIVE.stopZ != null) nz = Math.max(nz, DRIVE.stopZ);
        CART.pos.x = roadX(nz); CART.pos.z = nz;
      }
      CART.yaw = dampAngle(CART.yaw, Math.atan2(roadX(CART.pos.z - 2) - roadX(CART.pos.z), -2), 5, dt);
      if (DRIVE.onArrive && DRIVE.stopZ != null && CART.pos.z <= DRIVE.stopZ + 0.3) { const f = DRIVE.onArrive; DRIVE.onArrive = null; f(); }
    }
    sp = CART.pos.distanceTo(was) / Math.max(dt, 1e-4);
    // it sits on its four wheels: height from where they touch, nose up or down the slope, and a lean across it
    // (never counting its own box — that's how it used to climb into the sky)
    const f = V3(Math.sin(CART.yaw), 0, Math.cos(CART.yaw)), r = V3(f.z, 0, -f.x);
    const wh = (a, b) => groundAt(CART.pos.x + f.x * a + r.x * b, CART.pos.z + f.z * a + r.z * b, CART.pos.y + 1.5, CART.solid);
    const fl = wh(1.3, -1.32), fr = wh(1.3, 1.32), bl = wh(-1.3, -1.32), br = wh(-1.3, 1.32);
    const gy = (fl + fr + bl + br) / 4;
    CART.pos.y = CART.path ? gy : damp(CART.pos.y, gy, 12, dt);
    const pitch = clamp(Math.atan2((fl + fr) / 2 - (bl + br) / 2, 2.6), -0.35, 0.35), roll = clamp(Math.atan2((fr + br) / 2 - (fl + bl) / 2, 2.64), -0.3, 0.3);
    CART.pitch = damp(CART.pitch ?? pitch, pitch, 8, dt); CART.roll = damp(CART.roll ?? roll, roll, 8, dt);
    CART.g.rotation.order = 'YXZ';   // turn first, then tip on its own axles
    CART.g.position.copy(CART.pos); CART.g.rotation.set(-CART.pitch, CART.yaw, CART.roll + Math.sin(t * 6) * 0.01 * Math.min(1, sp));
    CART.wheels.forEach(w => { w.rotation.x += sp * dt / 0.8; });
    if (!CART.loose) CART.punks.forEach((pk, i) => pk.animate(dt, { speed: sp * 1.4, t: t + i }));
    CART.solid.x = CART.pos.x; CART.solid.z = CART.pos.z;
    const ax = Math.abs(Math.sin(CART.yaw)) > 0.7, off = CART.path; CART.solid.hw = ax ? 4.2 : 1.4; CART.solid.hd = ax ? 1.4 : 4.2; CART.solid.y0 = off ? -99 : CART.pos.y - 1; CART.solid.y1 = off ? -98 : CART.pos.y + 2.4;
    // Buhkon sat on the bench with the reins; the boy on the side-board among the wares, legs over the edge
    if (CART.driver || P.inCart) CART.g.updateMatrixWorld();
    if (CART.driver) { const seat = CART.g.localToWorld(SEAT_B.clone()); B.pos.copy(seat); B.yaw = CART.yaw; buhkon.root.position.copy(seat); buhkon.root.rotation.y = CART.yaw; }
    if (P.inCart) { const seat = CART.g.localToWorld(SEAT_P.clone()); P.pos.copy(seat); P.vel.set(0, 0, 0); P.yaw = CART.yaw - Math.PI / 2; tanoc.root.position.copy(seat); tanoc.root.rotation.y = P.yaw; }
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
    const rad = actor === punk ? 1.3 : 0.5;
    if (d > 45 && !o.stay) { const q = freeSpot(want.x, want.z, rad + 0.6); o.pos.set(q.x, 0, q.z); }
    else if (sp > 0) { o.pos.x += dx / d * sp * dt; o.pos.z += dz / d * sp * dt; o.yaw = dampAngle(o.yaw, Math.atan2(dx, dz), 8, dt); }
    else if (foe || o.stay) o.yaw = dampAngle(o.yaw, foe ? Math.atan2(dx, dz) : Math.atan2(P.pos.x - o.pos.x, P.pos.z - o.pos.z), 4, dt);
    resolve(o.pos, rad);
    o.pos.y = groundAt(o.pos.x, o.pos.z, o.pos.y + 1);
    o.cd -= dt; o.swing = Math.max(0, o.swing - dt);
    if (foe && d < 2.4 && o.cd <= 0) { o.cd = 1.1; o.swing = 0.4; hitFoe(foe, actor === buhkon ? 20 : 12, o.pos); }
    actor.root.position.copy(o.pos); actor.root.rotation.y = o.yaw;
    actor.animate(dt, { speed: sp, onGround: true, t, swing: o.swing > 0 ? { kind: 1, p: 1 - o.swing / 0.4 } : null, attack: o.swing > 0 ? o.swing / 0.4 : 0 });
  }
  const camWant = V3(); let camInit = false, camReach = null;
  function updateCamera(dt) {
    camWant.set(P.pos.x, P.pos.y + 1.5, P.pos.z);
    // follow quickly across the ground, more gently up and down (steps, stairs, landings), and snap back if far behind
    if (!camInit || camTgt.distanceTo(camWant) > 8) { camTgt.copy(camWant); camInit = true; }
    else { const kxz = 1 - Math.exp(-16 * dt), ky = 1 - Math.exp(-9 * dt); camTgt.x += (camWant.x - camTgt.x) * kxz; camTgt.z += (camWant.z - camTgt.z) * kxz; camTgt.y += (camWant.y - camTgt.y) * ky; }
    const want = 6.2, op = orbitPitch(CAM.pitch), cp = Math.cos(op), dir = V3(Math.sin(CAM.yaw) * cp, Math.sin(op), Math.cos(CAM.yaw) * cp);
    let d = want;
    for (let s = 0.6; s <= want; s += 0.3) { const q = camTgt.clone().addScaledVector(dir, s); if (solidAt(q.x, q.y, q.z)) { d = Math.max(0.8, s - 0.4); break; } }
    camReach = Math.min(d, damp(camReach ?? d, d, 3.2, dt)); d = camReach;   // pull in at once, ease back out
    camPos.lerp(camTgt.clone().addScaledVector(dir, d), 1 - Math.exp(-14 * dt));
    { const gy = heightAt(camPos.x, camPos.z) + 0.45; if (camPos.y < gy) camPos.y = gy; }   // never down in the ground
    camera.position.copy(camPos);
    if (shake > 0) { const T = t * 31; camera.position.x += Math.sin(T * 1.13) * shake * 0.5; camera.position.y += Math.sin(T * 1.71 + 1) * shake * 0.5; shake = Math.max(0, shake - dt * 1.5); }
    camera.lookAt(camTgt); tiltUp(camera, CAM.pitch);
  }

  function objective(text, hint = '', pips = 0, on = 0) { ctx.objective(stage === 'market' ? 'The Beginning · Xikia' : 'The Road North', text, hint, pips, on); }

  /* ---------------- per frame ---------------- */
  function update(dt, playing) {
    t += dt;
    allSolid.update(dt);
    if (P.inCart) { P.swing = 0; tanoc.animate(dt, { speed: 0, onGround: true, t, sit: true }); } else updatePlayer(dt, playing);
    if (CART.driver) buhkon.animate(dt, { speed: 0, onGround: true, t, sit: true, reins: true, talking: false });
    else follow(B, buhkon, dt, 1.8, 2.6, 9.5, stage === 'day4');
    setTick(dt); grazeTick(dt); sapTick(dt);
    if (K.on) follow(K, punk, dt, -1.8, 2.2, 11, stage === 'day4'); else punk.root.visible = false;
    if (K.on) punk.root.visible = true;
    updateFoes(dt, playing);
    // the market's own business
    if (MK) {
      const slow = MK.frozen ? 0.25 : 1;
      for (const m of [MK.angel, MK.sniller]) if (m) {
        m.userData.tick(t * slow, slow);
        if (m.userData.base && !(m === MK.angel && MK.leaving)) m.position.set(m.userData.base.x + Math.sin(t * 0.7 + (m === MK.angel ? 0 : 2)) * 0.6, m.userData.base.y + Math.sin(t * 1.1 + (m === MK.angel ? 1 : 0)) * 0.5, m.userData.base.z + Math.cos(t * 0.6) * 0.4);
      }
      if (MK.frozen && Math.random() < 0.5) { const m = Math.random() < 0.5 ? MK.angel : MK.sniller; if (m) particles.emit(m.position.x + (Math.random() - 0.5) * 4, m.position.y + 2 + Math.random() * 6, m.position.z + (Math.random() - 0.5) * 4, { vx: 0, vy: 0.2, vz: 0, color: m === MK.angel ? 0xffe8a8 : 0x6af0e0, size: 0.6, life: 2.5, drag: 2 }); }
      if (MK.dying && MK.sniller) {   // the curse: the storm folds in on itself and bursts into amulets
        MK.dying += dt; const k = MK.dying / 1.2, sn = MK.sniller;
        sn.scale.setScalar(1.6 * Math.max(0.02, 1 - k * k)); sn.rotation.y += dt * (4 + k * 20); sn.userData.setVis(Math.max(0, 1 - k));
        particles.emit(sn.position.x, sn.position.y + 3, sn.position.z, { vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.3) * 10, vz: (Math.random() - 0.5) * 12, color: 0x6af0e0, size: 0.9, life: 0.8, drag: 1 });
        if (k >= 1) { particles.burst(sn.position.x, sn.position.y + 3, sn.position.z, 90, { color: 0x6af0e0, speed: 16, size: 1, life: 1.2, gravity: -4 }); sfx.core(); shake = 0.8; scene.remove(sn); MK.sniller = null; }
      }
      if (MK.leaving && MK.angel) { MK.leaving += dt; MK.angel.position.y += dt * (3 + MK.leaving * 9); MK.angel.rotation.y += dt * 0.5; if (MK.leaving > 4.5) { particles.burst(MK.angel.position.x, MK.angel.position.y + 3, MK.angel.position.z, 60, { color: 0xfff0c0, speed: 12, size: 1.2, life: 1.1 }); scene.remove(MK.angel); MK.angel = null; } }
      for (const it of MK.amulets) if (it.mesh) {
        it.mesh.rotation.y = t * 1.5;
        if (it.fall) {   // flung out of the dying storm, arcing down to where it lands
          it.fall.t += dt; const k = clamp(it.fall.t / it.fall.dur, 0, 1);
          it.mesh.position.lerpVectors(it.fall.from, it.pos, k); it.mesh.position.y += Math.sin(k * Math.PI) * 6;
          if (Math.random() < 0.4) particles.emit(it.mesh.position.x, it.mesh.position.y, it.mesh.position.z, { vx: 0, vy: 0.5, vz: 0, color: 0x6af0e0, size: 0.35, life: 0.5, drag: 1 });
          if (k >= 1) { it.fall = null; particles.burst(it.pos.x, it.pos.y, it.pos.z, 12, { color: 0x6af0e0, speed: 3, size: 0.35, life: 0.5 }); }
        } else it.mesh.position.y = it.y0 + Math.sin(t * 2 + it.pos.x) * 0.12;
      }
    }
    if (EV.cart && EV.cart.state === 'carry') EV.cart.wheel.rotation.x += Math.hypot(P.vel.x, P.vel.z) * dt / 0.6;   // turning as he rolls it
    // the hat: walking up to it is enough — no button to find in the blur
    if (MK && sub === 'hat' && MK.hat && playing && ((MK.hatT = (MK.hatT || 0) + dt) > 45 || Math.hypot(MK.hat.pos.x - P.pos.x, MK.hat.pos.z - P.pos.z) < 1.6)) { sfx.ui(); marketHatOn(); }   // (and if he never gets there, the moment passes anyway)
    if (crowd && stage === 'market') crowd.update(dt, t, { freeze: MK && MK.frozen, stare: P.pos });
    kit.update(t, dt, particles);
    if (stage === 'market') fountain.update(dt, t, particles, MK && MK.esc ? [] : [P.pos]);
    if (stage === 'market' && MK && MK.esc && playing) escTick(dt);
    updateCart(dt);
    for (const c of clouds) c.position.x += dt * 2;
    if (playing) { if (stage === 'day1') day1Tick(); if (stage === 'day2') { day2Tick(); day2Back(); } if (stage === 'day3') day3Tick(dt); if (stage === 'day4') day4Tick(dt); }
    updateBolts(dt);
    if (D1 && D1.sn) { D1.snT += dt; D1.sn.userData.tick(t); D1.sn.position.x += dt * 3; if (D1.snT > 9) { particles.burst(D1.sn.position.x, D1.sn.position.y + 4, D1.sn.position.z, 40, { color: 0x6af0e0, speed: 8, size: 1, life: 1 }); scene.remove(D1.sn); D1.sn = null; } }
    if (D3 && D3.w) D3.w.userData.tick(t);
    if (D3 && D3.rain) for (let k = 0; k < 16; k++) particles.emit(camPos.x + (Math.random() - 0.5) * 30, camPos.y + 8 + Math.random() * 4, camPos.z + (Math.random() - 0.5) * 30, { vx: 0.5, vy: -22, vz: 0, color: 0xc8d8e8, size: 0.18, life: 0.6, drag: 0 });
    // camps glow at night
    for (const c of camps) { c.fire.visible = c.on; if (c.on) c.fire.userData.update(t); c.light.intensity = c.on ? 40 + Math.sin(t * 9) * 6 + Math.sin(t * 23) * 3 : 0; if (c.on && Math.random() < 0.5) particles.emit(c.x + (Math.random() - 0.5) * 0.6, c.y + 0.6, c.z + (Math.random() - 0.5) * 0.6, { vx: 0, vy: 2 + Math.random(), vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: 0.35, life: 0.9, drag: 0.5 }); }
    // mist in the pass: soft sheets of it drifting low over the stones (not those glowing orbs any more)
    mists.forEach((m, i) => { m.visible = stage === 'day4'; if (m.visible) { m.position.x += dt * (0.8 + (i % 3) * 0.3); if (m.position.x > roadX(m.position.z) + 60) m.position.x = roadX(m.position.z) - 60; } });
    if (beacon.visible) beacon.material.opacity = 0.6 + Math.sin(t * 4) * 0.3;
    particles.update(dt);
    if (!cine.update(dt)) updateCamera(dt);
    // the sky follows: Velki low in the south-east, the sun and its shadows on the boy
    sky.position.copy(camera.position);
    velki.position.set(camera.position.x + 1700, camera.position.y + 900, camera.position.z + 2300); velkiGlow.position.copy(velki.position);
    for (const k of kalo) k.position.copy(camera.position).add(k.userData.off);
    sun.position.copy(P.pos).addScaledVector(SUN_DIR, 140); sun.target.position.copy(P.pos);
    ctx.hp(P.hp / 100);
  }

  function interact() {
    if (P.inCart) { hopDown(); return; }
    let best = null, bd = 1e9;
    for (const it of items) { const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z); if (d < 2.6 && Math.abs(it.pos.y - P.pos.y) < 3 && d < bd) { bd = d; best = it; } }
    if (best) { sfx.ui(); best.act(); return; }
    if (stage === 'day1' && sub === 'stone') { tryStone(); return; }
    if (DRIVE.on && CART.driver && nearCart()) { boardCart(); return; }
    if (B.pos.distanceTo(P.pos) < 3.2) ctx.say([['buhkon', stage === 'market' ? 'Crates, Tanoc. Questions after.' : stage === 'day2' && sub === 'hunt' ? 'Kofi. One. Off you go.' : 'Keep walking. I’m right behind you.']]);
  }
  function prompt() {
    if (P.inCart) return 'Hop down from the cart';
    for (const it of items) { const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z); if (d < 2.6 && Math.abs(it.pos.y - P.pos.y) < 3) return it.label; }
    if (stage === 'day1' && sub === 'stone') return 'Try the fire-stone';
    if (DRIVE.on && CART.driver && nearCart()) return 'Climb up into the cart';
    if (B.pos.distanceTo(P.pos) < 3.2) return 'Talk to Buhkon <small style="opacity:.7">the Carpenter</small>';
    return null;
  }

  function start(at) {
    hasStone = at === 'day2' || at === 'day3' || at === 'day4' || at === 'day5';
    if (ctx.slotsHud) ctx.slotsHud(hasStone);
    if (at === 'day3' || at === 'day4') {   // the road behind is already cleared
      const L = EV.log, mid = L.logs[1]; L.open = true; scene.remove(mid.m); const i = solids.indexOf(mid.s); if (i >= 0) solids.splice(i, 1);
      EV.ford.crossed = true; EV.ford.told = true;
    }
    if (at === 'escape') { resumeEscape(); return; }
    if (at === 'day1') startDay1(); else if (at === 'day2') { D1 = { pebble: true }; startDay2(); } else if (at === 'day3') { K.on = true; startDay3(); } else if (at === 'day4') { K.on = true; startDay4(); } else startMarket();
  }
  const allSolid = createSolids(scene, {
    col: auto, heightAt, solidAt, focus: () => P.pos,
    // where resolve lets you go: the city, then the valley either side of the road, as far as its end
    reach: (x, z) => z > END + 5 && z < CITY.z + CITY_R + 2 && (z >= GATE_Z - 2 || Math.abs(x - roadX(z)) < (zone(z) === 'pass' ? 30 : 48) + 3),
  });

  function dispose() {
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
    composer.dispose && composer.dispose();
  }
  return { solids: allSolid,
    start, update, render: () => composer.render(), interact, prompt, jump: () => { if (P.inCart) hopDown(); else P.jumpBuf = 0.15; }, attack, resize, dispose, useSlot, skip: () => cine.skip(),
    get cinematic() { return cine.active; }, get stage() { return stage; }, get sub() { return sub; }, get done() { return done; }, P, foes, items, B, camps, debug: { solidAt, groundAt, get HT() { return HT; }, marketMaterialize, CART, hitFoe, escSwing, get fountain() { return fountain; }, kofiCaught, startDay2, startDay3, startDay4, marketHatOn, chopLog, fixCart, get MK() { return MK; }, get EV() { return EV; }, get D3() { return D3; }, get D4() { return D4; } },
  };
}
