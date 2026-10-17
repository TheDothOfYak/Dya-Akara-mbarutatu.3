/* ============================================================
   CHAPTER II — THE MEGLA AAGAC
   Two years on. A Sniller amulet out of Fyrsti'Vilag pulls north,
   and Tanoc (fifteen) rides after it with his Punk:
     Day 1   up the river through the misted pass, to the clearing at
             the forest's edge — a Rodak pack in the treeline — and a
             night by the fire full of sounds
     Morning on foot into the trees; a thud; the Punk grabs him and
             bolts; he goes back in alone. A stunned Sru Vorn, a drag
             trail, the Rodak walking with him to a line they won't
             cross; the ruins; a purple Relic in a pristine wall —
             and the GYNGE, out of the ground beneath him:
               phase 1  stay off, burning stones into the gaping maw
                        (the wall Relic amplifies the stone partway)
               phase 2  it hauls itself up and chases; when it rears,
                        slide under (Space) and axe the soft belly
             The chip, the rubbing (Akai Gek), the song burned into his
             mind. A night in the ruins talking with the Sniller.
     Day 2   deeper in; wild Punks; Velki eclipses the sun; the dark
             screamers; the Duskareth keep — up a watchtower tree, a
             watcher down, the whole keep knows; a fight he cannot win;
             "shut up and HELP"; the Sniller, vast; the Ver master in the
             little church becomes a Malsti Punk; the ring; one request:
             the keep cleansed, his. A night with the Malsti Punk.
   Then home, where the Carpenter teaches him to make his first token
   (that part happens on the property itself, in main.js).

   A scene of its own, like the road north. main.js lends it the
   renderer, camera, input, dialogue and cards.
   ============================================================ */
import * as THREE from 'three';
import { toon, addOutline, outlineAll, glowSprite, mistSprite, Particles } from './gfx.js';
import { buildEikar, placeWalker, cartoon } from './actors.js';
import { buildDomesticPunk, buildWildPunk, buildRodak, buildGynge, buildMalstiPunk, buildSruVorn } from './esik_land.js';
import { buildVel } from './creatures.js';
import { buildLutut } from './esik_sky.js';
import { buildSniller } from './skyfolk.js';
import { createCine } from './cine.js';
import { latchAlongRay } from './vines.js';
import { clamp, damp, dampAngle, smooth, lerp, mulberry32, fbm } from './util.js';
import * as STORY from './story.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const M = STORY.MEGLA;

/* ---------------- the lay of the land (north is -z) ---------------- */
const RX = z => 14 * Math.sin(z * 0.006) + 6 * Math.sin(z * 0.017);          // the river road up the pass
const FX = z => 9 * Math.sin(z * 0.011) + 4 * Math.sin(z * 0.031);           // the old path through the forest
const pathX = z => (z > -600 ? RX(z) : z > -660 ? lerp(RX(z), FX(z), smooth(-600, -660, z)) : FX(z));
const riverX = z => RX(z) + 11 + 3 * Math.sin(z * 0.02);
const PASS0 = -40, PASS1 = -540, CLEAR = { x: 0, z: -595 }, EDGE_Z = -658, END_Z = -1250;
const FIRE1 = { x: -10, z: -640 }, THUD_Z = -700, ANIMAL = { x: 18, z: -738 }, LINE_Z = -806;
const RUINS = { x: -4, z: -868, r: 42 }, WALL = { x: -4, z: -896 }, GY = { x: -2, z: -864 }, FIRE2 = { x: -26, z: -850 };
const KEEP = { x: 34, z: -1150, h: 30 }, CHURCH = { x: 34, z: -1172 }, TOWER_SW = { x: KEEP.x - 34, z: KEEP.z + 34 };
const zoneOf = z => (z > PASS0 ? 'foot' : z > PASS1 ? 'pass' : z > EDGE_Z ? 'clear' : 'forest');
/* the rockfall across the pass, the mist above it and the walkers' cairns in it, and the patrols round the keep */
const ROCK_Z = -230, MIST_Z0 = -370, MIST_Z1 = -532;
const CAIRNS = [[-26, -392], [22, -432], [-18, -470], [30, -508]].map(([dx, z]) => [pathX(z) + dx, z]);
const SNEAK0 = -1052;
function baseH(z) {
  if (z > PASS0) return 0;
  if (z > PASS1) return lerp(0, 38, smooth(PASS0, PASS1, z));
  if (z > EDGE_Z) return 38;
  return 38 + 4 * Math.sin(z * 0.013) + 2 * Math.sin(z * 0.041);
}
function heightAt(x, z) {
  const zz = zoneOf(z), lat = Math.abs(x - pathX(z));
  let h = baseH(z);
  if (zz === 'pass' || zz === 'foot') h += smooth(20, 85, lat) * 110 * (0.65 + 0.7 * fbm(x * 0.012 + 3, z * 0.012, 3));
  else if (zz === 'clear') h += smooth(70, 140, Math.hypot(x - CLEAR.x, (z - CLEAR.z) * 0.8)) * 60 * fbm(x * 0.01, z * 0.01, 3);
  else h += smooth(55, 120, lat) * 40 * fbm(x * 0.02, z * 0.02, 2) + (fbm(x * 0.06, z * 0.06, 2) - 0.5) * 1.6 * smooth(4, 10, lat);
  if (z > PASS1 - 30) h -= 2.4 * smooth(5, 2, Math.abs(x - riverX(z)));               // the river's channel
  h -= 1.2 * smooth(RUINS.r, RUINS.r - 10, Math.hypot(x - RUINS.x, z - RUINS.z));   // the ruins lie in a hollow
  if (Math.abs(x - KEEP.x) < KEEP.h + 6 && Math.abs(z - KEEP.z) < KEEP.h + 6) h = lerp(h, baseH(KEEP.z) + 1, smooth(KEEP.h + 6, KEEP.h, Math.max(Math.abs(x - KEEP.x), Math.abs(z - KEEP.z))));
  return h;
}

/* ================================================================ */
export function createMegla(ctx) {
  const { camera, keys, touch, CAM, sfx } = ctx;
  const scene = new THREE.Scene();
  const rng = mulberry32(2207);
  const fog = new THREE.Fog(0xb8c4c4, 200, 1400); scene.fog = fog;

  /* ---------------- sky: mist-grey day, Velki's eclipse, blue nights ---------------- */
  const skyU = { uTop: { value: new THREE.Color(0x7a96b0) }, uLow: { value: new THREE.Color(0xd0d8dc) }, uSun: { value: V3(0.3, 0.7, 0.3).normalize() }, uWarm: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 uTop, uLow, uSun; uniform float uWarm;
      void main(){ float h = max(vD.y, 0.0); vec3 c = mix(uLow, uTop, smoothstep(0.0, 0.6, h));
        float s = max(dot(vD, uSun), 0.0); c += vec3(1.0, 0.85, 0.6) * (pow(s, 8.0) * 0.3 + pow(s, 300.0) * 1.2) * (1.0 - uWarm);
        if (vD.y < 0.0) c = uLow * 0.8; gl_FragColor = vec4(c, 1.0); }`,
  }));
  scene.add(sky);
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  { const pts = []; for (let i = 0; i < 900; i++) { const a = Math.random() * TAU, h = 0.08 + Math.random() * 0.92, r = 3600; pts.push(Math.cos(a) * Math.sqrt(1 - h * h) * r, h * r, Math.sin(a) * Math.sqrt(1 - h * h) * r); } const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); sky.add(new THREE.Points(sg, starMat)); }
  const velki = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 20), new THREE.MeshBasicMaterial({ color: 0x8fc4e8, fog: false })); scene.add(velki);
  const velkiGlow = glowSprite(0x9fd6ff, 1500, 0.3); velkiGlow.material.fog = false; scene.add(velkiGlow);
  const hemi = new THREE.HemisphereLight(0xd8e4ec, 0x4a5a3a, 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
  const SUN_DIR = V3(0.3, 0.7, 0.3).normalize();
  // the light: the scene eases toward whichever of these it's told
  const LOOKS = {
    day: { top: 0x7a96b0, low: 0xd0d8dc, sun: 1.6, hemi: 1.1, stars: 0, fogC: 0xb8c4c4, warm: 0 },
    dusk: { top: 0x3a3060, low: 0xe09a7a, sun: 0.7, hemi: 0.7, stars: 0.5, fogC: 0x9a8890, warm: 0.4 },
    night: { top: 0x0e1430, low: 0x2a3a5a, sun: 0.12, hemi: 0.36, stars: 1, fogC: 0x1a2232, warm: 1 },
    grey: { top: 0x8a949c, low: 0xb8c0c4, sun: 0.8, hemi: 1.0, stars: 0, fogC: 0xa8b0b2, warm: 0.6 },
    eclipse: { top: 0x1a1830, low: 0x5a4a6a, sun: 0.15, hemi: 0.42, stars: 0.8, fogC: 0x3a3448, warm: 1 },
  };
  let look = LOOKS.day, eclipseK = 0;
  const lc = { top: new THREE.Color(), low: new THREE.Color(), fogC: new THREE.Color() };
  function setLook(name, snap) {
    look = LOOKS[name];
    if (snap) { skyU.uTop.value.set(look.top); skyU.uLow.value.set(look.low); fog.color.set(look.fogC); sun.intensity = look.sun; hemi.intensity = look.hemi; starMat.opacity = look.stars; skyU.uWarm.value = look.warm; }
  }
  function updateLook(dt) {
    const a = 1 - Math.exp(-1.2 * dt);
    skyU.uTop.value.lerp(lc.top.set(look.top), a); skyU.uLow.value.lerp(lc.low.set(look.low), a); fog.color.lerp(lc.fogC.set(look.fogC), a);
    sun.intensity = lerp(sun.intensity, look.sun, a); hemi.intensity = lerp(hemi.intensity, look.hemi, a);
    starMat.opacity = lerp(starMat.opacity, look.stars, a); skyU.uWarm.value = lerp(skyU.uWarm.value, look.warm, a);
  }

  /* ---------------- colliders ---------------- */
  const solids = [];
  const box = (x, z, hw, hd, y0, y1) => { const s = { kind: 'box', x, z, hw, hd, y0, y1 }; solids.push(s); return s; };
  const cyl = (x, z, r, y0, y1) => { const s = { kind: 'cyl', x, z, r, y0, y1 }; solids.push(s); return s; };
  const STEP = 0.65, PR = 0.4, PH = 1.5;
  const grid = new Map(), CELL = 16;
  function indexSolids() { grid.clear(); for (const s of solids) { const R = s.kind === 'box' ? Math.hypot(s.hw, s.hd) : s.r; for (let cx = Math.floor((s.x - R) / CELL); cx <= Math.floor((s.x + R) / CELL); cx++) for (let cz = Math.floor((s.z - R) / CELL); cz <= Math.floor((s.z + R) / CELL); cz++) { const k = cx + ',' + cz; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(s); } } }
  const near = (x, z) => grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL)) || [];
  const inside = (s, x, z) => (s.kind === 'box' ? Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd : Math.hypot(x - s.x, z - s.z) < s.r);
  function groundAt(x, z, y) {
    let g = heightAt(x, z);
    for (const s of near(x, z)) { if (s.off || s.y1 > y + STEP || s.y1 <= g) continue; if (inside(s, x, z)) g = s.y1; }
    return g;
  }
  function resolve(p, rad = PR) {
    for (const s of near(p.x, p.z)) {
      if (s.off || p.y + PH < s.y0 || p.y >= s.y1 - STEP) continue;
      if (s.kind === 'box') {
        const dx = p.x - s.x, dz = p.z - s.z, ox = s.hw + rad - Math.abs(dx), oz = s.hd + rad - Math.abs(dz);
        if (ox > 0 && oz > 0) { if (ox < oz) p.x += Math.sign(dx || 1) * ox; else p.z += Math.sign(dz || 1) * oz; }
      } else {
        const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), m = s.r + rad;
        if (d < m) { if (d < 1e-4) p.x += m; else { p.x = s.x + dx / d * m; p.z = s.z + dz / d * m; } }
      }
    }
    // the Gynge's bulk (but you can slide under it)
    if (GYN && GYN.alive && GYN.phase >= 1 && !(P.slide && p === P.pos)) {
      const dx = p.x - GYN.pos.x, dz = p.z - GYN.pos.z, d = Math.hypot(dx, dz), m = 0.78 * GYN.s + rad;
      if (d < m && d > 1e-4) { p.x = GYN.pos.x + dx / d * m; p.z = GYN.pos.z + dz / d * m; }
    }
    // the land's own walls: the pass sides, the forest too thick to push through, the ends of the road
    const zz = zoneOf(p.z), px = pathX(p.z), lim = zz === 'pass' || zz === 'foot' ? 26 : zz === 'clear' ? 80 : 74;
    if (Math.abs(p.x - px) > lim) p.x = px + Math.sign(p.x - px) * lim;
    if (p.z > 12) p.z = 12;
    if (p.z < END_Z + 8) p.z = END_Z + 8;
  }
  function solidAt(x, y, z) {
    for (const s of near(x, z)) { if (s.off || y < s.y0 || y > s.y1) continue; if (inside(s, x, z)) return true; }
    return y < heightAt(x, z) + 0.2;
  }

  /* ---------------- the ground ---------------- */
  {
    const W = 360, L = 1300, geo = new THREE.PlaneGeometry(W, L, 150, 540); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, 20 - L / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color();
    const grass = new THREE.Color(0x7aa456), grass2 = new THREE.Color(0x9ab45a), moss = new THREE.Color(0x3a5a34), moss2 = new THREE.Color(0x2a4430), rock = new THREE.Color(0x8a8478),
      dirt = new THREE.Color(0x8a6a48), bed = new THREE.Color(0x5a7a7a), stone = new THREE.Color(0x9a9488);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i) + 0, cx = x + pathX(z), y = heightAt(cx, z);
      pos.setX(i, cx); pos.setY(i, y);
      const zz = zoneOf(z), lat = Math.abs(cx - pathX(z)), n = fbm(cx * 0.05, z * 0.05, 2);
      if (zz === 'forest') c.copy(moss).lerp(moss2, n);
      else c.copy(grass).lerp(grass2, n);
      c.lerp(rock, smooth(16, 40, lat) * (zz === 'pass' || zz === 'foot' ? 0.9 : 0.2));
      c.lerp(dirt, smooth(2.6, 1.0, lat) * 0.75);
      if (z > PASS1 - 30) c.lerp(bed, smooth(4, 2, Math.abs(cx - riverX(z))));
      const dr = Math.hypot(cx - RUINS.x, z - RUINS.z); if (dr < RUINS.r) c.lerp(stone, smooth(RUINS.r, RUINS.r - 14, dr) * 0.6 * (0.5 + n));
      if (Math.abs(cx - KEEP.x) < KEEP.h && Math.abs(z - KEEP.z) < KEEP.h) c.lerp(stone, 0.7);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, toon(0xffffff, { vertexColors: true })); m.receiveShadow = true; scene.add(m);
    // the river: a ribbon of water down the pass
    const pts = [], idx = [], N = 220;
    for (let i = 0; i <= N; i++) { const z = 20 + (PASS1 - 40 - 20) * i / N, x = riverX(z), y = Math.min(heightAt(x - 4, z), heightAt(x + 4, z), heightAt(x, z) + 1.4) - 0.2; pts.push(x - 3.4, y, z, x + 3.4, y, z); if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); rg.setIndex(idx); rg.computeVertexNormals();
    scene.add(new THREE.Mesh(rg, new THREE.MeshToonMaterial({ color: 0x6ab0c8, emissive: 0x1a5a70, emissiveIntensity: 0.5, transparent: true, opacity: 0.85, side: THREE.DoubleSide })));
  }

  /* ---------------- instanced kits ---------------- */
  const kit = (geo, mat, max, shadow = false) => { const m = new THREE.InstancedMesh(geo, mat, max); m.count = 0; m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m; };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();
  const put = (k, x, y, z, sx, sy, sz, rx, ry, rz, color) => { if (k.count >= k.instanceMatrix.count) return; _e.set(rx, ry, rz); _q.setFromEuler(_e); _m.compose(V3(x, y, z), _q, V3(sx, sy, sz)); k.setMatrixAt(k.count, _m); k.setColorAt(k.count, _c.set(color)); k.count++; };
  const trunks = kit(new THREE.CylinderGeometry(0.7, 1, 1, 9, 1, true), toon(0xffffff), 1400);
  const cones = kit(new THREE.ConeGeometry(1, 1, 7, 1, true), toon(0xffffff), 2600);
  const blobs = kit(new THREE.IcosahedronGeometry(1, 1), toon(0xffffff), 1600);
  const rocks = kit(new THREE.DodecahedronGeometry(1, 0), toon(0xffffff), 900);
  const ferns = kit(new THREE.ConeGeometry(1, 1, 5), toon(0xffffff), 4000);
  const stones = kit(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), 1400, true);
  const glowK = kit(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true }), 3000);
  const pick = a => a[Math.floor(rng() * a.length)];
  // pines up the sides of the pass
  for (let i = 0; i < 9000 && cones.count < 1600; i++) {
    const z = 10 - rng() * 600, x = pathX(z) + (rng() - 0.5) * 220, lat = Math.abs(x - pathX(z));
    if (lat < 14 || Math.abs(x - riverX(z)) < 6 || (zoneOf(z) === 'clear' && Math.hypot(x - CLEAR.x, z - CLEAR.z) < 70)) continue;
    const g = heightAt(x, z), s = 0.9 + rng() * 1.2, h = (8 + rng() * 8) * s, c = pick(['#2f5a3a', '#3a6a40', '#2a4a34', '#406a44']);
    put(trunks, x, g + h * 0.2, z, 0.5 * s, h * 0.45, 0.5 * s, 0, rng() * 6, 0, '#4a3426');
    put(cones, x, g + h * 0.5, z, 2.8 * s, h * 0.65, 2.8 * s, 0, rng() * 6, 0, c); put(cones, x, g + h * 0.82, z, 1.8 * s, h * 0.45, 1.8 * s, 0, rng() * 6, 0, c);
    if (lat < 24) cyl(x, z, 0.5 * s, g - 1, g + 8);
  }
  // the Megla Aagac: trees so big their tops are lost in the fog, and the light that lives among them
  const clearOfWorks = (x, z, pad) => Math.hypot(x - RUINS.x, z - RUINS.z) < RUINS.r + pad || (Math.abs(x - KEEP.x) < KEEP.h + 14 + pad && Math.abs(z - KEEP.z) < KEEP.h + 14 + pad) || Math.hypot(x - FIRE1.x, z - FIRE1.z) < 14 + pad;
  for (let i = 0; i < 20000 && trunks.count < 1300; i++) {
    const z = EDGE_Z + 6 - rng() * (EDGE_Z - END_Z), x = pathX(z) + (rng() - 0.5) * 170, lat = Math.abs(x - pathX(z));
    const R = 2.4 + rng() * 4.2;
    if (lat < R + 5 || clearOfWorks(x, z, R)) continue;
    if (Math.hypot(x - ANIMAL.x, z - ANIMAL.z) < 10) continue;
    const g = heightAt(x, z) - 0.6, h = 70 + rng() * 60;
    put(trunks, x, g + h / 2, z, R, h, R, 0, rng() * 6, 0, pick(['#2a2420', '#332a24', '#262220', '#3a2e26']));
    for (let k = 0; k < 4; k++) { const a = rng() * TAU, l = R * (1.4 + rng()); put(trunks, x + Math.cos(a) * (R + l * 0.4), g + R * 0.6, z + Math.sin(a) * (R + l * 0.4), R * 0.3, l * 1.2, R * 0.3, Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0, '#2a2420'); }
    for (let k = 0; k < 3; k++) { const cr = 14 + rng() * 14; put(blobs, x + (rng() - 0.5) * 20, g + h * (0.75 + rng() * 0.3), z + (rng() - 0.5) * 20, cr, cr * 0.5, cr, rng(), rng() * 6, 0, pick(['#1a2a20', '#223226', '#1c2a24'])); }
    cyl(x, z, R * 0.9, g - 1, g + 40);
    // bioluminescent seams and beads, faint by day, bright in the dark
    if (rng() < 0.6) for (let k = 0; k < 4; k++) { const a = rng() * TAU, y = g + 1 + rng() * 14; put(glowK, x + Math.cos(a) * R * 0.98, y, z + Math.sin(a) * R * 0.98, 0.12, 0.6 + rng() * 1.6, 0.12, 0, 0, 0, pick(['#3ae8c8', '#8affb0', '#b48aff', '#5af0ff'])); }
  }
  for (let i = 0; i < 30000 && ferns.count < 3600; i++) {
    const z = EDGE_Z - rng() * (EDGE_Z - END_Z), x = pathX(z) + (rng() - 0.5) * 140;
    if (Math.abs(x - pathX(z)) < 2.4 || clearOfWorks(x, z, -6)) continue;
    const g = heightAt(x, z), s = 0.4 + rng() * 1.1;
    put(ferns, x, g + s * 0.4, z, s * 1.2, s, s * 1.2, (rng() - 0.5) * 0.4, rng() * 6, (rng() - 0.5) * 0.4, pick(['#2f5a34', '#3a6a3a', '#28502e', '#4a7a40']));
  }
  for (let i = 0; i < 2600 && rocks.count < 700; i++) {
    const z = 0 - rng() * 1240, x = pathX(z) + (rng() - 0.5) * 160, lat = Math.abs(x - pathX(z));
    if (lat < 4 || clearOfWorks(x, z, 0) || Math.abs(x - riverX(z)) < 4) continue;
    const g = heightAt(x, z), s = 0.6 + Math.pow(rng(), 2) * 3;
    put(rocks, x, g + s * 0.3, z, s * 1.2, s * 0.8, s, rng() * 3, rng() * 3, rng() * 3, pick(['#8a8478', '#7a766e', '#6a665e']));
    if (s > 0.7 && lat < 70) cyl(x, z, s * 0.9, g - 1, g + s * 0.9);
  }

  /* ---------------- the ruins, and the wall with the Relic in it ---------------- */
  const stoneC = ['#8a8478', '#7e786c', '#9a9284', '#6e6a62'];
  const ruinWalls = [];
  function wall(x0, z0, x1, z1, h, ruin = 1) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 1.6), ang = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n, x = lerp(x0, x1, k), z = lerp(z0, z1, k), g = heightAt(x, z);
      const hh = h * (ruin < 1 ? Math.max(0.15, 1 - ruin * (0.5 + fbm(x * 0.3, z * 0.3, 1))) : 1);
      for (let y = 0; y < hh; y += 1.1) { if (ruin < 1 && rng() < 0.1 * (1 - ruin)) continue; put(stones, x + (rng() - 0.5) * 0.1, g + y + 0.55, z + (rng() - 0.5) * 0.1, 1.55, 1.05, 1.0, 0, ang + (rng() - 0.5) * 0.05 * (1 - ruin), 0, pick(stoneC)); }
      box(x, z, 0.8, 0.8, g - 1, g + hh);
    }
  }
  {
    const { x, z } = RUINS;
    // rings of fallen building around the hollow: the further from the Relic, the more ruined
    for (const [a0, a1, r] of [[0.3, 1.4, 30], [1.9, 2.9, 32], [3.4, 4.3, 28], [4.7, 5.8, 34], [0.6, 1.8, 18], [3.6, 4.6, 20]]) {
      const x0 = x + Math.cos(a0) * r, z0 = z + Math.sin(a0) * r, x1 = x + Math.cos(a1) * r, z1 = z + Math.sin(a1) * r;
      wall(x0, z0, x1, z1, 3 + rng() * 2, 0.75);
    }
    // broken columns
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + 0.2, r = 22 + (k % 3) * 4, cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r, g = heightAt(cx, cz), h = 1 + rng() * 4; put(stones, cx, g + h / 2, cz, 1.2, h, 1.2, 0, rng(), 0, pick(stoneC)); box(cx, cz, 0.7, 0.7, g - 1, g + h); put(stones, cx + 1.4, g + 0.4, cz + 0.6, 1.1, 0.7, 2.2, 0, rng() * 3, 0.3, pick(stoneC)); }
    // the one wall still standing straight: pristine, sharp, new as the day it was cut
    const wg = heightAt(WALL.x, WALL.z);
    for (let i = -5; i <= 5; i++) for (let y = 0; y < 6; y++) put(stones, WALL.x + i * 1.6, wg + 0.55 + y * 1.1, WALL.z, 1.58, 1.08, 1.4, 0, 0, 0, '#c8c0b0');
    box(WALL.x, WALL.z, 8.8, 0.8, wg - 1, wg + 6.6);
  }
  const relic = new THREE.Group();
  {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshToonMaterial({ color: 0x6a3aaa, emissive: 0xa060ff, emissiveIntensity: 1.1 })); gem.scale.y = 1.3; addOutline(gem, 0.04);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.12, 6, 20), toon(0xb8a070)); rim.position.z = -0.05;
    relic.add(gem, rim, glowSprite(0xb070ff, 4, 0.6));
    relic.position.set(WALL.x, heightAt(WALL.x, WALL.z) + 3.6, WALL.z + 0.75); scene.add(relic);
  }

  /* ---------------- the Duskareth keep ---------------- */
  const keepMats = { wall: toon(0x5a5260), trim: toon(0x3a2a5a, { emissive: 0x7a3aff, emissiveIntensity: 0.6 }), leaf: toon(0x3a3a4a), roof: toon(0x2a2236) };
  const keepGlows = [];
  const towers = [];
  {
    const { x, z, h } = KEEP, g = heightAt(x, z), H = 7;
    const mk = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; addOutline(m, 0.04); scene.add(m); return m; };
    for (const [wx, wz, hw, hd] of [[x, z - h, h, 0.9], [x, z + h, h, 0.9], [x - h, z, 0.9, h], [x + h, z, 0.9, h]]) {
      mk(new THREE.BoxGeometry(hw * 2, H, hd * 2), keepMats.wall, wx, g + H / 2, wz);
      // a band of void-purple along the top: the Duskareth's own marks
      const band = mk(new THREE.BoxGeometry(hw * 2 + 0.1, 0.3, hd * 2 + 0.1), keepMats.trim, wx, g + H - 0.6, wz); keepGlows.push(band);
      box(wx, wz, hw, hd, g - 1, g + H);
      for (let k = -hw + 1.5; k < hw; k += 3) mk(new THREE.BoxGeometry(hd > 1 ? 1.8 : 1.2, 1, hd > 1 ? 1.2 : 1.8), keepMats.wall, wx + (hd > 1 ? 0 : k), g + H + 0.5, wz + (hd > 1 ? k : 0));
    }
    // the gate, shut fast
    mk(new THREE.BoxGeometry(6, 5.5, 0.5), toon(0x2a1a2a), x, g + 2.75, z + h + 0.95);
    // watchtower trees at each corner: a living trunk, and a platform up in it
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const tx = x + sx * (h + 4), tz = z + sz * (h + 4), tg = heightAt(tx, tz);
      mk(new THREE.CylinderGeometry(1.3, 2.0, 24, 10), toon(0x3a2e2a), tx, tg + 12, tz);
      const plat = mk(new THREE.CylinderGeometry(3.2, 3.2, 0.4, 12), toon(0x4a3a30), tx, tg + 13, tz);
      for (let k = 0; k < 3; k++) mk(new THREE.IcosahedronGeometry(5 + k, 1), keepMats.leaf, tx + (k - 1) * 3, tg + 19 + k * 2, tz + (k % 2) * 2);
      cyl(tx, tz, 1.8, tg - 1, tg + 12.6); cyl(tx, tz, 3.2, tg + 12.6, tg + 13.2);
      towers.push({ x: tx, z: tz, g: tg, top: tg + 13.2, plat });
    }
    // the little church, built into the north wall
    const cg = heightAt(CHURCH.x, CHURCH.z);
    mk(new THREE.BoxGeometry(10, 6, 9), keepMats.wall, CHURCH.x, cg + 3, CHURCH.z);
    const roof = mk(new THREE.ConeGeometry(7.6, 5, 4), keepMats.roof, CHURCH.x, cg + 8.4, CHURCH.z); roof.rotation.y = Math.PI / 4;
    mk(new THREE.BoxGeometry(3, 4, 0.4), toon(0x0e0a14), CHURCH.x, cg + 2, CHURCH.z + 4.55);
    const cbell = glowSprite(0xb070ff, 3, 0.5); cbell.position.set(CHURCH.x, cg + 5, CHURCH.z + 4.7); scene.add(cbell); keepGlows.push(cbell);
    box(CHURCH.x - 3.6, CHURCH.z, 1.4, 4.5, cg - 1, cg + 6); box(CHURCH.x + 3.6, CHURCH.z, 1.4, 4.5, cg - 1, cg + 6); box(CHURCH.x, CHURCH.z - 3.2, 5, 1.2, cg - 1, cg + 6);
    // barracks lean-tos and braziers round the courtyard
    for (const [bx, bz] of [[x - 18, z - 12], [x + 18, z - 12], [x - 18, z + 14], [x + 18, z + 14]]) {
      const bgy = heightAt(bx, bz); mk(new THREE.BoxGeometry(8, 3.2, 5), keepMats.wall, bx, bgy + 1.6, bz); box(bx, bz, 4, 2.5, bgy - 1, bgy + 3.2);
      const br = glowSprite(0x9a5aff, 3.2, 0.7); br.position.set(bx + (bx < x ? 6 : -6), bgy + 1.6, bz); scene.add(br); keepGlows.push(br);
    }
  }

  /* ---------------- mist that lives among the trunks ---------------- */
  const mists = [];
  for (let k = 0; k < 34; k++) { const m = mistSprite(0xd0d8dc, 26 + rng() * 20, 7 + rng() * 6, 0.32); m.userData.off = V3((rng() - 0.5) * 120, 1 + rng() * 4, (rng() - 0.5) * 120); scene.add(m); mists.push(m); }

  /* ---------------- the rockfall across the pass ---------------- */
  const rockfall = [];
  {
    const z = ROCK_Z, px = pathX(z);
    // four boulders across the road itself: her vines can shift these (the third is split, and wants fire)
    [[-8.5, 3.1], [-2.8, 3.4], [3, 3.2], [8.6, 3.0]].forEach(([lx, r], i) => {
      const x = px + lx, zz = z + (i % 2) * 1.6, g = heightAt(x, zz);
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), toon(i === 2 ? 0x7a6a5a : 0x8a8478)); m.scale.set(1, 0.8, 1); m.rotation.set(rng(), rng() * 3, rng());
      m.position.set(x, g + r * 0.6, zz); m.castShadow = true; m.receiveShadow = true; addOutline(m, 0.04); scene.add(m);
      let crack = null;
      if (i === 2) { crack = glowSprite(0xff8a3a, 2.4, 0.15); crack.position.set(x, g + r * 0.9, zz + r * 0.7); scene.add(crack); }
      rockfall.push({ i, x, z: zz, g, r, m, crack, s: cyl(x, zz, r * 0.95, g - 1, g + r * 1.4), done: false, hits: 0 });
    });
    // and the heap either side, up the walls of the pass: too loose to climb
    for (let k = 0; k < 40; k++) {
      const side = k % 2 ? 1 : -1, lat = 13 + rng() * 45, x = px + side * lat, zz = z + (rng() - 0.5) * 10, g = heightAt(x, zz), sz = 1.2 + rng() * 2.6;
      put(rocks, x, g + sz * 0.4, zz, sz * 1.2, sz * 0.9, sz, rng() * 3, rng() * 3, rng() * 3, pick(['#8a8478', '#7a766e', '#6a665e']));
    }
  }
  /* the old walkers' cairns, up in the mist */
  const cairns = CAIRNS.map(([x, z]) => {
    const g = heightAt(x, z), grp = new THREE.Group();
    for (let k = 0; k < 5; k++) { const sz = 0.75 - k * 0.12, m = new THREE.Mesh(new THREE.DodecahedronGeometry(sz, 0), toon(0x8a8478)); m.position.y = 0.4 + k * 0.48; m.rotation.y = k; m.scale.y = 0.6; addOutline(m, 0.03); grp.add(m); }
    const glow = glowSprite(0x9fe8ff, 3.2, 0); glow.position.y = 3; grp.add(glow);
    grp.position.set(x, g, z); scene.add(grp); cyl(x, z, 0.9, g - 1, g + 2.4);
    return { x, z, g, grp, glow, lit: false, item: null };
  });
  /* the ruin's three carved stones, standing in the gaps of the ring */
  const sealStones = [[1.65, 25], [3.15, 24], [6.05, 25]].map(([a, r], i) => {
    const x = RUINS.x + Math.cos(a) * r, z = RUINS.z + Math.sin(a) * r, g = heightAt(x, z);
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 0.5), toon(0x9a9284)); m.position.set(x, g + 1.1, z); m.rotation.y = Math.atan2(RUINS.x - x, RUINS.z - z); m.rotation.z = (i - 1) * 0.08;
    m.castShadow = true; addOutline(m, 0.04); scene.add(m);
    const rune = glowSprite(0xc890ff, 1.3, 0.35); rune.position.set(x, g + 1.6, z); scene.add(rune);
    box(x, z, 0.8, 0.4, g - 1, g + 2.3);
    return { x, z, g, m, rune, read: false };
  });

  for (const k of [trunks, cones, blobs, rocks, ferns, stones, glowK]) { k.instanceMatrix.needsUpdate = true; if (k.instanceColor) k.instanceColor.needsUpdate = true; k.computeBoundingSphere(); }
  indexSolids();

  /* ---------------- particles, post, film ---------------- */
  const particles = new Particles(scene, 4000);
  const cine = createCine(camera, { blocked: (x, y, z) => solidAt(x, y, z) });
  const composer = ctx.makeComposer(scene);
  function resize() { particles.setScale(innerHeight * Math.min(devicePixelRatio, 1.75) * 0.9); }
  resize();

  /* ---------------- the cast ---------------- */
  const tanoc = buildEikar({
    skin: '#8a5a3a', cap: '#4a3020', marking: 0xffb04a, markColor: 0x2a1208, emblem: 0xc89aff, build: 1.0, capTall: 0.7,
    weapon: 'axe', flasks: false, leg: 0x4a3420, foot: 0x2a1a0c, beltColor: 0x5a3a1c, tunic: 0x6a4a3a, trim: 0xc89a5a, scale: 0.95,
  });
  { const bl = tanoc.weapon.userData.blade; if (bl) { bl.material.color.setHex(0x9a9aa2); bl.material.emissiveIntensity = 0; } if (tanoc.weapon.userData.glow) tanoc.weapon.userData.glow.visible = false; }
  scene.add(tanoc.root);
  // the amulet on his chest, where the Sniller rides
  const amulet = new THREE.Group();
  { const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), toon(0x6af0e0, { emissive: 0x2aa0a0, emissiveIntensity: 0.9 })); amulet.add(gem, glowSprite(0x6af0e0, 0.6, 0.4)); amulet.position.set(0, 1.25, 0.2); tanoc.root.add(amulet); }
  // his Punk: the mutt from Fyrsti'Vilag, two years grown, in Old Ruut's saddle
  const punk = cartoon(buildWildPunk({ seed: 31, saddle: true, blanket: 0x8a5a2a }), 0.6); punk.root.scale.setScalar(1.15); scene.add(punk.root);
  const P = { pos: V3(), vel: V3(), yaw: Math.PI, onGround: true, coyote: 0, jumpBuf: 0, stepPh: 0, hp: 100, swing: 0, hitDone: false, iframes: 0, ride: false, slide: null, down: false };
  const K = { pos: V3(0, -50, 0), yaw: Math.PI, stay: null, on: true };            // the Punk
  const foes = [];
  const camPos = V3(), camTgt = V3();
  let shake = 0, t = 0;
  let stage = '', sub = '', done = false;
  const beacon = glowSprite(0xffd27a, 3, 0.9); scene.add(beacon); beacon.visible = false;
  function setGoal(x, y, z) { beacon.visible = x != null; if (x != null) beacon.position.set(x, y + 3, z); }
  const items = [];
  function addItem(pos, label, act, mesh) { const it = { pos, label, act, mesh }; items.push(it); if (mesh) { mesh.position.copy(pos); scene.add(mesh); } return it; }
  function dropItem(it) { const i = items.indexOf(it); if (i >= 0) items.splice(i, 1); if (it.mesh) scene.remove(it.mesh); }
  function place(o, x, z, yaw = o.yaw) { o.pos.set(x, groundAt(x, z, 80), z); o.yaw = yaw; }
  const ground = (x, z) => groundAt(x, z, heightAt(x, z) + 2);
  const glint = (color = 0xffd27a) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), toon(color, { emissive: color, emissiveIntensity: 0.5 })); addOutline(m, 0.03); g.add(m, glowSprite(color, 1.6, 0.5)); return g; };

  /* ---------------- film helpers ---------------- */
  function cut(shots, cb, opts) { ctx.cutscene(true); cine.play(shots, () => { ctx.cutscene(false); cb && cb(); }, opts); }
  function held(cam, opts = { bars: true }) { cine.play([{ dur: 9999, cam }], null, opts); }
  function sayHeld(lines, cam, cb) { held(cam); ctx.say(lines, () => { cine.stop(); cb && cb(); }); }
  const over = (o, side = 1, up = 1.8, back = 4.5) => (k, tt) => { const f = V3(Math.sin(o.yaw), 0, Math.cos(o.yaw)), r = V3(f.z, 0, -f.x); return { p: V3(o.pos.x - f.x * back + r.x * side * 1.4, o.pos.y + up, o.pos.z - f.z * back + r.z * side * 1.4), l: V3(o.pos.x + f.x * 6, o.pos.y + 1.4, o.pos.z + f.z * 6) }; };
  const orbit = (c, r = 8, h = 3, sp = 0.12, lookY = 1.2) => (k, tt) => ({ p: V3(c.x + Math.cos(tt * sp + 0.5) * r, c.y + h, c.z + Math.sin(tt * sp + 0.5) * r), l: V3(c.x, c.y + lookY, c.z) });
  function objective(text, hint = '', pips = 0, on = 0) { ctx.objective('Chapter II · the Megla Aagac', text, hint, pips, on); }

  /* ---------------- a campfire ---------------- */
  const fires = [FIRE1, FIRE2].map(({ x, z }) => {
    const y = heightAt(x, z);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; put(rocks, x + Math.cos(a) * 1.2, y + 0.15, z + Math.sin(a) * 1.2, 0.35, 0.25, 0.3, 0, a, 0, '#6a665e'); }
    const fire = glowSprite(0xff8a3a, 2.8, 0.95); fire.position.set(x, y + 0.7, z); fire.visible = false; scene.add(fire);
    const light = new THREE.PointLight(0xff8a3a, 0, 22); light.position.set(x, y + 1.3, z); scene.add(light);
    return { x, z, y, fire, light, on: false };
  });
  rocks.instanceMatrix.needsUpdate = true; rocks.instanceColor.needsUpdate = true;
  const fireCam = c => (k, tt) => {
    const ph = Math.floor(tt / 7) % 3, a = tt * 0.09;
    if (ph === 0) return { p: V3(c.x + Math.cos(a) * 6.5, c.y + 2.0, c.z + Math.sin(a) * 6.5), l: V3(c.x, c.y + 1.1, c.z) };
    if (ph === 1) return { p: V3(c.x + 4, c.y + 1.0, c.z + 6), l: V3(c.x - 10, c.y + 26, c.z - 70) };   // up past the flames into the dark of the trees
    return { p: V3(c.x - 12, c.y + 8, c.z + 10), l: V3(c.x, c.y + 1, c.z - 6) };
  };

  /* ---------------- foes: wild Punks (day two), Duskareth (the keep) ---------------- */
  const FOE = {
    wildpunk: { hp: 34, reach: 1.9, dmg: 7, speed: 5.4, cd: 1.5, windup: 0.5, lunge: 7 },
    vel: { hp: 9999, reach: 2.4, dmg: 11, speed: 6.5, cd: 1.0, windup: 0.5, lunge: 7 },
    sru: { hp: 150, reach: 3.6, dmg: 14, speed: 4.6, cd: 2.0, windup: 0.85, lunge: 11 },
  };
  function addFoe(kind, x, z) {
    const a = kind === 'vel' ? buildVel() : kind === 'sru' ? buildSruVorn({ seed: 12 }) : buildWildPunk({ seed: Math.floor(rng() * 999) });
    if (kind === 'wildpunk') a.root.scale.multiplyScalar(0.7);
    if (kind === 'sru') a.root.scale.setScalar(1.5);
    scene.add(a.root);
    const hp = FOE[kind].hp;
    const f = { kind, a, pos: V3(x, ground(x, z), z), vel: V3(), yaw: rng() * TAU, hp, max: hp, state: 'chase', timer: 0, windup: 0, flash: 0, dead: false, cd: 0.5 + rng() * 1.5, out: 0 };
    a.root.position.copy(f.pos); foes.push(f); return f;
  }
  function hitFoe(f, dmg, from) {
    if (f.dead || f.out) return;
    f.flash = 1;
    const d = V3(f.pos.x - from.x, 0, f.pos.z - from.z).normalize();
    if (f.kind === 'vel') {   // trained Duskareth, against a fifteen-year-old with a carpenter's hatchet: they turn every blow
      sfx.hit(); particles.burst(f.pos.x, f.pos.y + 1.2, f.pos.z, 8, { color: 0xb070ff, speed: 5, size: 0.3, life: 0.3 });
      P.vel.addScaledVector(d, -5); return;
    }
    f.hp -= dmg; sfx.hit(); f.vel.addScaledVector(d, f.kind === 'sru' ? 1.5 : 6); f.stun = f.kind === 'sru' ? 0.12 : 0.35;
    particles.burst(f.pos.x, f.pos.y + 0.8, f.pos.z, 10, { color: 0xffb040, speed: 6, size: 0.3, life: 0.4, gravity: -10 });
    if (f.kind === 'sru') { bossBar(Math.max(0, f.hp / f.max * 100)); if (f.hp <= 0) { sruBeaten(f); return; } }
    if (f.hp <= 0) { f.dead = true; f.deadT = 0; sfx.die(); particles.burst(f.pos.x, f.pos.y + 1, f.pos.z, 22, { color: 0xc88a3a, speed: 7, size: 0.45, life: 0.7, gravity: -6 }); }
  }
  function updateFoes(dt, playing) {
    for (const f of foes) {
      if (f.dead) { if (f.deadT != null) { f.deadT += dt; f.a.root.scale.multiplyScalar(Math.max(0.001, 1 - dt * 2)); if (f.deadT > 0.7) { scene.remove(f.a.root); f.deadT = null; } } continue; }
      if (f.out) {   // put down by the Sniller: lying still, breathing
        f.out += dt; f.a.root.rotation.z = damp(f.a.root.rotation.z, Math.PI / 2, 4, dt); f.a.root.position.y = damp(f.a.root.position.y, f.pos.y + 0.3, 4, dt);
        f.a.animate(dt, { speed: 0, t, onGround: true }); continue;
      }
      f.flash = Math.max(0, f.flash - dt * 5); f.a.flash && f.a.flash(f.flash);
      f.stun = Math.max(0, (f.stun || 0) - dt);
      const dx = P.pos.x - f.pos.x, dz = P.pos.z - f.pos.z, d = Math.hypot(dx, dz);
      let want = 0, wy = f.yaw;
      const S = FOE[f.kind], reach = S.reach, dmg = S.dmg;
      if (playing && !P.down) {
        if (f.state === 'windup') {
          f.timer -= dt; wy = Math.atan2(dx, dz); f.windup = 1 - f.timer / S.windup;
          if (f.timer <= 0) { f.state = 'recover'; f.timer = 0.6; f.windup = 0; f.attackA = 1; f.vel.x += Math.sin(f.yaw) * S.lunge; f.vel.z += Math.cos(f.yaw) * S.lunge; if (d < reach + 0.9 && P.iframes <= 0) hurtTanoc(dmg, f.pos); }
        } else if (f.state === 'recover') { f.timer -= dt; f.attackA = Math.max(0, (f.attackA || 0) - dt * 3); if (f.timer <= 0) f.state = 'chase'; }
        else {
          f.cd -= dt; wy = Math.atan2(dx, dz);
          if (d < 5 && f.cd > 0) { wy += Math.PI / 2 * (f.pos.x > P.pos.x ? 1 : -1); want = 3.5; }
          else want = d > reach ? S.speed : 0;
          if (d < reach + 0.4 && f.cd <= 0) { f.state = 'windup'; f.timer = S.windup; f.cd = S.cd + rng(); }
        }
      }
      if (f.stun > 0) want = 0;
      f.yaw = dampAngle(f.yaw, wy, 8, dt);
      f.vel.x = damp(f.vel.x, Math.sin(f.yaw) * want, 8, dt); f.vel.z = damp(f.vel.z, Math.cos(f.yaw) * want, 8, dt);
      f.pos.x += f.vel.x * dt; f.pos.z += f.vel.z * dt;
      resolve(f.pos, 0.6);
      f.pos.y = groundAt(f.pos.x, f.pos.z, f.pos.y + 1);
      f.a.root.position.copy(f.pos); f.a.root.rotation.y = f.yaw;
      f.a.animate(dt, { speed: Math.hypot(f.vel.x, f.vel.z), t, windup: f.windup || 0, attack: f.attackA || 0, onGround: true });
    }
  }
  function hurtTanoc(dmg, from) {
    P.hp -= dmg; P.iframes = 0.6; shake = Math.max(shake, 0.35); sfx.hurt();
    const d = V3(P.pos.x - from.x, 0, P.pos.z - from.z).normalize(); P.vel.addScaledVector(d, 6);
    if (stage === 'keep' && sub === 'fight') { if (P.hp <= 18) knockedDown(); }
    else if (P.hp <= 0) { P.hp = 60; P.iframes = 1.5; ctx.toast('The amulet goes warm against your chest. You’re up again.', 3); }
    ctx.hp(P.hp / 100);
  }

  /* ---------------- the fire-stone: Q, burning stones ---------------- */
  const bolts = [];
  let boltCd = 0, amped = false;
  function useSlot(id) {
    if (id !== 'r_firestone' || boltCd > 0 || P.down || cine.active) return;
    boltCd = amped ? 0.9 : 1.2;
    const from = V3(P.pos.x, P.pos.y + 1.4, P.pos.z);
    let to = null, bd = 34;
    if (GYN && GYN.alive) { const m = mawPoint(); const d = m.distanceTo(from); if (d < 40) { to = m; bd = d; } }
    for (const f of foes) { if (f.dead || f.out) continue; const dx = f.pos.x - P.pos.x, dz = f.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d < bd && (dx * -Math.sin(CAM.yaw) + dz * -Math.cos(CAM.yaw)) / (d || 1) > 0.6) { bd = d; to = V3(f.pos.x, f.pos.y + 0.8, f.pos.z); } }
    const cr = crackRock();
    if (!to && cr) { const dx = cr.x - P.pos.x, dz = cr.z - P.pos.z, d = Math.hypot(dx, dz); if (d < 40 && (dx * -Math.sin(CAM.yaw) + dz * -Math.cos(CAM.yaw)) / (d || 1) > 0.5) to = V3(cr.x, cr.g + cr.r * 0.8, cr.z); }
    const speed = 30, vel = to ? (() => { const dx = to.x - from.x, dz = to.z - from.z, hd = Math.hypot(dx, dz), tt = hd / speed; return V3(dx / tt, (to.y - from.y) / tt + 0.5 * 18 * tt, dz / tt); })() : V3(-Math.sin(CAM.yaw) * speed, 4, -Math.cos(CAM.yaw) * speed);
    P.yaw = Math.atan2(vel.x, vel.z);
    const g = new THREE.Group(); const big = amped ? 1.8 : 1;
    g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 * big, 0), toon(0xffd060, { emissive: 0xff7a20, emissiveIntensity: 1 }))); g.add(glowSprite(amped ? 0xffe0a0 : 0xff8a2a, 2.2 * big, 0.9));
    g.position.copy(from); scene.add(g); bolts.push({ g, vel, life: 2 }); sfx.flare();
  }
  function updateBolts(dt) {
    boltCd = Math.max(0, boltCd - dt);
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i], p = b.g.position; b.life -= dt; b.vel.y -= 18 * dt; p.addScaledVector(b.vel, dt);
      particles.emit(p.x, p.y, p.z, { vx: 0, vy: 0.4, vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: amped ? 0.7 : 0.45, life: 0.35, drag: 1 });
      let hit = false;
      if (GYN && GYN.alive && p.distanceTo(mawPoint()) < (GYN.phase === 1 ? 3.4 : 2.6)) { hit = true; gyngeStruck(); }
      else if (GYN && GYN.alive && p.distanceTo(GYN.pos.clone().setY(GYN.pos.y + 0.5 * GYN.s)) < 0.75 * GYN.s) { hit = true; gyngeBounce(p); }
      const cr = crackRock();
      if (!hit && cr && Math.hypot(p.x - cr.x, p.z - cr.z) < cr.r + 0.8 && p.y < cr.g + cr.r * 1.6) { hit = true; crackHit(cr); }
      if (!hit) hit = b.life <= 0 || solidAt(p.x, p.y, p.z);
      for (const f of foes) { if (hit || f.dead || f.out || f.pos.distanceTo(p) > 1.6) continue; hitFoe(f, 22, P.pos); hit = true; }
      if (hit) { particles.burst(p.x, p.y, p.z, amped ? 30 : 16, { color: 0xff8a2a, speed: amped ? 8 : 5, size: 0.45, life: 0.5 }); scene.remove(b.g); bolts.splice(i, 1); }
    }
  }

  /* ---------------- the GYNGE ---------------- */
  let GYN = null;
  const gyngeBar = (() => {
    const d = document.createElement('div'); d.id = 'gynge-bar';
    d.style.cssText = 'position:fixed;left:40%;top:4.5vh;transform:translateX(-50%);width:min(420px,52vw);z-index:22;display:none;font-family:var(--display,Georgia);letter-spacing:.2em;font-size:12px;color:#e8d8b8;text-align:center;text-shadow:0 1px 4px #000';
    d.innerHTML = '<span id="gynge-name">GYNGE · LIVING ROCK</span><div style="height:9px;margin-top:6px;border:1px solid #c8a060;border-radius:5px;background:rgba(0,0,0,.45);overflow:hidden"><div id="gynge-fill" style="height:100%;width:100%;background:linear-gradient(90deg,#c87a3a,#ffd27a);transition:width .25s"></div></div>';
    document.body.appendChild(d); return d;
  })();
  function mawPoint() { const f = V3(Math.sin(GYN.yaw), 0, Math.cos(GYN.yaw)); return V3(GYN.pos.x + f.x * 0.9 * GYN.s, GYN.pos.y + (GYN.phase === 1 ? 0.62 : 0.8) * GYN.s, GYN.pos.z + f.z * 0.9 * GYN.s); }
  function spawnGynge() {
    const a = cartoon(buildGynge({ seed: 77 })); const s = 4.2; a.root.scale.setScalar(s); scene.add(a.root);
    const g = heightAt(GY.x, GY.z);
    GYN = { a, s, pos: V3(GY.x, g - 4, GY.z), yaw: Math.atan2(P.pos.x - GY.x, P.pos.z - GY.z), hp: 100, phase: 0, alive: true, t: 0, open: 0, cyc: 'rise', ct: 0, hits: 0, spikes: [], rocks: [], rear: 0, slam: 0, tired: 0, rise: 0 };
    gyngeBar.style.display = 'block';
  }
  function setGyngeHp(v) { GYN.hp = Math.max(0, v); document.getElementById('gynge-fill').style.width = GYN.hp + '%'; }
  function gyngeStruck() {
    if (GYN.phase === 1 && GYN.open < 0.45) { gyngeBounce(mawPoint()); return; }
    const dmg = GYN.phase === 1 ? (amped ? 9 : 6) : 3;
    setGyngeHp(GYN.hp - dmg); GYN.a.flash && GYN.a.flash(1); GYN.flash = 1; sfx.roar(); shake = Math.max(shake, 0.4);
    particles.burst(mawPoint().x, mawPoint().y, mawPoint().z, 40, { color: 0xffa040, speed: 9, size: 0.6, life: 0.8, gravity: -4 });
    GYN.hits++;
    if (GYN.phase === 1) { GYN.cyc = 'close'; GYN.ct = 0; }   // it snaps shut on the burn
    if (GYN.phase === 1 && GYN.hits === 3 && !amped) { amped = true; ctx.say(M.amplify); relicPulse = 1; }
    if (GYN.phase === 1 && GYN.hp <= 50) gyngeHalf();
    if (GYN.hp <= 0) gyngeDie();
  }
  function gyngeBounce(p) { sfx.hit(); particles.burst(p.x, p.y, p.z, 10, { color: 0xc8c0b0, speed: 5, size: 0.35, life: 0.4 }); if (!GYN.toldBounce) { GYN.toldBounce = true; ctx.bark('sniller', 'Not the rock — the MOUTH. Wait for it to open.', 3); } }
  let relicPulse = 0;
  function gyngeHalf() {
    GYN.phase = 1.5; GYN.cyc = 'rising'; GYN.ct = 0; sfx.roar(); shake = 1;
    for (const s of GYN.spikes) scene.remove(s.m); GYN.spikes.length = 0;
    cut([{ dur: 4.2, cam: k => ({ p: V3(GYN.pos.x + 16 - k * 4, GYN.pos.y + 3 + k * 5, GYN.pos.z + 14), l: V3(GYN.pos.x, GYN.pos.y + 3 + k * 2, GYN.pos.z) }) }], () => {
      ctx.say(M.half, () => { GYN.phase = 2; GYN.cyc = 'chase'; objective(M.phase2, 'Keep moving — it’s slow to turn. When it rears up, get in close and press Space', 3, 0); });
    });
  }
  function gyngeDie() {
    GYN.alive = false; gyngeBar.style.display = 'none'; sfx.slam(); shake = 1.2;
    for (const s of GYN.spikes) scene.remove(s.m); for (const r of GYN.rocks) scene.remove(r.m); GYN.spikes.length = 0; GYN.rocks.length = 0;
    particles.burst(GYN.pos.x, GYN.pos.y + 3, GYN.pos.z, 80, { color: 0xc8a070, speed: 10, size: 0.8, life: 1.2, gravity: -6 });
    sub = 'dead'; setGoal();
    cut([{ dur: 5, cam: k => ({ p: V3(GYN.pos.x + 14 + k * 4, GYN.pos.y + 5 + k * 4, GYN.pos.z + 12 - k * 2), l: V3(GYN.pos.x, GYN.pos.y + 1.5, GYN.pos.z) }) }], () => {
      ctx.say(M.dead, () => harvest());
    });
  }
  function hazard(x, z) {   // a spike of rock out of the ground where you're standing: a glowing ring first, then the spike
    const g = heightAt(x, z), ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.2, 24), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, g + 0.08, z); scene.add(ring);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(1.4, 5, 6), toon(0x8a7a62)); addOutline(sp, 0.04); sp.position.set(x, g - 5, z); scene.add(sp);
    GYN.spikes.push({ m: ring, sp, x, z, g, t: 0 });
  }
  function throwRock() {
    const from = mawPoint(), to = P.pos.clone(), tt = 1.3;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), toon(0x7a6a58)); addOutline(m, 0.04); m.position.copy(from); scene.add(m);
    GYN.rocks.push({ m, vel: V3((to.x - from.x) / tt, (to.y - from.y) / tt + 0.5 * 20 * tt, (to.z - from.z) / tt), life: tt + 0.3 });
  }
  function updateGynge(dt, playing) {
    if (!GYN) return;
    const a = GYN.a; GYN.t += dt; GYN.flash = Math.max(0, (GYN.flash || 0) - dt * 4); a.flash && a.flash(GYN.flash);
    const g = heightAt(GYN.pos.x, GYN.pos.z);
    if (!GYN.alive) { a.animate(dt, { speed: 0, t, windup: 0, attack: 0 }); a.root.position.copy(GYN.pos); return; }
    const dx = P.pos.x - GYN.pos.x, dz = P.pos.z - GYN.pos.z, d = Math.hypot(dx, dz);
    let windup = 0, attack = 0, speed = 0;
    if (GYN.cyc === 'rise') {   // out of the ground beneath him
      GYN.ct += dt; GYN.pos.y = lerp(g - 4, g - 1.4, smooth(0, 1.6, GYN.ct)); attack = smooth(0, 1, GYN.ct) * (1 - smooth(1.2, 1.8, GYN.ct));
      if (GYN.ct > 1.8) { GYN.cyc = 'shut'; GYN.ct = 0; }
    } else if (GYN.phase === 1 && playing) {
      GYN.pos.y = damp(GYN.pos.y, g - 1.4, 3, dt);
      GYN.yaw = dampAngle(GYN.yaw, Math.atan2(dx, dz), 0.8, dt);
      GYN.ct += dt;
      if (GYN.cyc === 'shut') {
        if (GYN.ct > 2.2) { GYN.cyc = 'gape'; GYN.ct = 0; sfx.roar(); }
        // shut, it fights: spikes under him if he's near, rocks if he's far
        if (Math.floor((GYN.ct - dt) / 1.1) !== Math.floor(GYN.ct / 1.1)) { if (d < 16) hazard(P.pos.x + P.vel.x * 0.4, P.pos.z + P.vel.z * 0.4); else throwRock(); }
      } else if (GYN.cyc === 'gape') { GYN.open = damp(GYN.open, 1, 5, dt); windup = GYN.open; if (GYN.ct > 2.6) { GYN.cyc = 'close'; GYN.ct = 0; } }
      else if (GYN.cyc === 'close') { GYN.open = damp(GYN.open, 0, 7, dt); windup = GYN.open; if (GYN.ct > 0.6) { GYN.cyc = 'shut'; GYN.ct = 0; } }
    } else if (GYN.phase === 1.5) {   // hauling itself up out of the earth
      GYN.ct += dt; GYN.pos.y = lerp(g - 1.4, g, smooth(0, 3, GYN.ct)); attack = 0.6 + Math.sin(GYN.ct * 6) * 0.2; GYN.open = 0;
    } else if (GYN.phase === 2 && playing) {
      GYN.pos.y = damp(GYN.pos.y, g, 4, dt); GYN.tired = Math.max(0, GYN.tired - dt);
      if (GYN.cyc === 'chase') {
        GYN.yaw = dampAngle(GYN.yaw, Math.atan2(dx, dz), 1.3, dt);
        if (GYN.tired <= 0 && d > 6) { speed = 3.4; GYN.pos.x += Math.sin(GYN.yaw) * speed * dt; GYN.pos.z += Math.cos(GYN.yaw) * speed * dt; }
        if (d < 8 && GYN.tired <= 0) { GYN.cyc = 'rear'; GYN.ct = 0; sfx.roar(); ctx.bark('sniller', 'NOW — under it!', 1.6); }
        if (GYN.tired <= 0 && d > 18 && Math.random() < dt * 0.5) throwRock();
      } else if (GYN.cyc === 'rear') {   // up on its hind rock, pale belly showing — then down like a landslide
        GYN.ct += dt; attack = smooth(0, 0.9, GYN.ct); windup = 0.4;
        if (GYN.ct > 1.5) {
          GYN.cyc = 'chase'; GYN.tired = 1.6; sfx.slam(); shake = 1;
          particles.ring(GYN.pos.x, g + 0.3, GYN.pos.z, 60, 9, { color: 0xc8a070, size: 1, life: 0.6 });
          if (d < 7.5 && !P.slide) hurtTanoc(20, GYN.pos);
        }
      }
    }
    // the spikes and the thrown rock
    for (let i = GYN.spikes.length - 1; i >= 0; i--) {
      const s = GYN.spikes[i]; s.t += dt;
      s.m.material.opacity = 0.35 + 0.35 * Math.sin(s.t * 18);
      if (s.t > 1.0 && !s.fired) { s.fired = true; sfx.slam(); if (Math.hypot(P.pos.x - s.x, P.pos.z - s.z) < 2.3 && P.pos.y < s.g + 3) hurtTanoc(14, V3(s.x, 0, s.z)); particles.burst(s.x, s.g + 0.5, s.z, 20, { color: 0x9a8a72, speed: 6, size: 0.5, life: 0.6, gravity: -8 }); }
      s.sp.position.y = s.g - 5 + (s.t > 1 ? Math.min(1, (s.t - 1) * 8) * 6.5 * (s.t > 2 ? Math.max(0, 1 - (s.t - 2) * 2) : 1) : 0);
      if (s.t > 2.6) { scene.remove(s.m); scene.remove(s.sp); GYN.spikes.splice(i, 1); }
    }
    for (let i = GYN.rocks.length - 1; i >= 0; i--) {
      const r = GYN.rocks[i]; r.life -= dt; r.vel.y -= 20 * dt; r.m.position.addScaledVector(r.vel, dt); r.m.rotation.x += dt * 5;
      if (r.m.position.distanceTo(P.pos.clone().setY(P.pos.y + 1)) < 1.8) { hurtTanoc(10, r.m.position); r.life = 0; }
      if (r.life <= 0 || r.m.position.y < heightAt(r.m.position.x, r.m.position.z)) { particles.burst(r.m.position.x, r.m.position.y, r.m.position.z, 14, { color: 0x9a8a72, speed: 5, size: 0.5, life: 0.5, gravity: -8 }); scene.remove(r.m); GYN.rocks.splice(i, 1); }
    }
    a.root.position.copy(GYN.pos); a.root.rotation.y = GYN.yaw;
    a.animate(dt, { speed, t, windup: Math.max(windup, GYN.open), attack });
    if (GYN.open > 0.4 && Math.random() < 0.5) { const m = mawPoint(); particles.emit(m.x, m.y, m.z, { vx: (Math.random() - 0.5), vy: 1.5, vz: (Math.random() - 0.5), color: 0xffb050, size: 0.5, life: 0.6, drag: 1 }); }
  }
  // phase two: slide under the rearing Gynge and drive the axe into its belly
  function trySlide() {
    if (!GYN || !GYN.alive || GYN.phase !== 2 || GYN.cyc !== 'rear' || P.slide) return false;
    const dx = GYN.pos.x - P.pos.x, dz = GYN.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > 9) return false;
    const f = V3(dx / d, 0, dz / d);
    P.slide = { t: 0, from: P.pos.clone(), to: V3(GYN.pos.x + f.x * 3, 0, GYN.pos.z + f.z * 3), hit: false };
    P.yaw = Math.atan2(f.x, f.z); P.iframes = 1; sfx.swing();
    return true;
  }
  function updateSlide(dt) {
    const S = P.slide; S.t += dt; const k = Math.min(1, S.t / 0.55);
    P.pos.x = lerp(S.from.x, S.to.x, k); P.pos.z = lerp(S.from.z, S.to.z, k); P.pos.y = groundAt(P.pos.x, P.pos.z, P.pos.y + 1);
    tanoc.body && (tanoc.body.rotation.x = -Math.sin(k * Math.PI) * 1.1);
    particles.emit(P.pos.x, P.pos.y + 0.1, P.pos.z, { vx: 0, vy: 1, vz: 0, color: 0xc8a070, size: 0.5, life: 0.4, drag: 1 });
    if (!S.hit && k > 0.45) {
      S.hit = true; P.swing = 0.3;
      const n = Math.round((50 - GYN.hp) / 17);
      setGyngeHp(GYN.hp - 17.5); GYN.flash = 1; sfx.heavy(); sfx.roar(); shake = 0.9;
      particles.burst(GYN.pos.x, GYN.pos.y + 1.2, GYN.pos.z, 40, { color: 0xffe0a0, speed: 8, size: 0.6, life: 0.7 });
      ctx.bark('tanoc15', M.slid[Math.min(2, Math.max(0, n))], 2);
      GYN.cyc = 'chase'; GYN.tired = 2.2;
      if (GYN.hp <= 0.5) gyngeDie();
    }
    if (k >= 1) { P.slide = null; if (tanoc.body) tanoc.body.rotation.x = 0; }
  }

  /* ---------------- the walker, and the rider ---------------- */
  function attack() {
    if (P.ride || P.down || P.swing > 0 || P.slide) return;
    P.swing = 0.42; P.hitDone = false; sfx.swing();
  }
  function jump() {
    if (trySlide()) return;
    if (P.ride && heldVines().length) { pumpSwing(); return; }
    P.jumpBuf = 0.15;
  }
  /* ---------------- her vines, as on the Carpenter's land: hand over hand through the trees ----------------
     Left click throws her left vine at whatever is by the X, right click the right one; hold to hang on,
     let go to fly off with all your speed. Space near the bottom of a swing pumps it higher. Shift
     hauls the vine in, C lets it out, X keeps it the length it is. Five vines; they grow back when
     her feet are on something. */
  const SW = { range: 38, hip: 1.35, n: 5 };
  const vines = { L: null, R: null }; let vineN = SW.n, vineGrow = 0;
  const heldVines = () => [vines.L, vines.R].filter(v => v && v.hold);
  const _seatQ = new THREE.Quaternion(), _yawQ = new THREE.Quaternion(), _UP = V3(0, 1, 0);
  const aimRay = new THREE.Raycaster(), AIM_C = new THREE.Vector2(0, 0);
  // what a vine can hold here: the trunks of the pass and of the Megla Aagac, the tops of walls, the land rising ahead
  let vineWorld = null;
  function vineLand() {
    if (vineWorld) return vineWorld;
    const trees = solids.filter(q => q.kind === 'cyl' && q.y1 - q.y0 > 7).map(q => ({ x: q.x, z: q.z, g: q.y0 + 1, h: Math.min(60, q.y1 - q.y0 - 1), r: q.r }));
    const boxes = solids.filter(q => q.kind === 'box');
    vineWorld = { heightAt, trees, col: { nearAll: (x, z, r) => boxes.filter(q => !q.off && Math.abs(q.x - x) < r + q.hw && Math.abs(q.z - z) < r + q.hd).map(q => ({ x: q.x, z: q.z, hw: q.hw, hd: q.hd, c: 1, s: 0, top: q.y1, bot: q.y0 })) } };
    return vineWorld;
  }
  function vineShoot(side) {
    if (!P.ride || P.down || cine.active || !RIDE_STAGES.includes(stage)) return false;
    sfx.swing();
    if (vineN <= 0) { if (t - (P.vineOutT ?? -9) > 3) { P.vineOutT = t; ctx.toast('She’s out of vines. They grow back once her feet touch something.', 2.4); } return true; }
    const hip = V3(P.pos.x, P.pos.y + SW.hip, P.pos.z);
    aimRay.setFromCamera(AIM_C, camera);
    const A = latchAlongRay(vineLand(), hip, aimRay.ray.origin, aimRay.ray.direction, side, { range: SW.range, minUp: P.onGround ? 2.5 : 1.2 });
    if (!A) return true;
    vines[side] = { A: A.clone(), L: hip.distanceTo(A), t: 0, k: 0, hold: false };
    return true;
  }
  function vineLet(side) {
    const S = vines[side]; if (!S) return;
    vines[side] = null;
    if (S.hold && !heldVines().length) {   // let go on the way up the far side of the arc and she flicks you on
      P.onGround = false; P.coyote = 0;
      const off = V3(P.pos.x, P.pos.y + SW.hip, P.pos.z).sub(S.A), hv = Math.hypot(P.vel.x, P.vel.z), lead = hv > 1 ? (off.x * P.vel.x + off.z * P.vel.z) / hv : 0, ang = Math.atan2(Math.abs(lead), -off.y);
      if (P.vel.y > 0 && lead > 0 && ang > 0.4 && ang < 1.35) { P.vel.y += 5; if (hv < 30) { P.vel.x *= 1.12; P.vel.z *= 1.12; } particles.ring(P.pos.x, P.pos.y + 1, P.pos.z, 16, 1.6, { color: 0xb8ff7a, size: 0.4, life: 0.4 }); sfx.jump(); }
      else if (P.vel.y > 0) P.vel.y += 1.5;
    }
  }
  function pumpSwing() {
    if (t < (P.pumpT || 0)) return;
    P.pumpT = t + 0.45;
    const S = heldVines()[0], off = V3(P.pos.x, P.pos.y + SW.hip, P.pos.z).sub(S.A), ol = off.length() || 1;
    const good = clamp(1 - Math.acos(clamp(-off.y / ol, -1, 1)) / 0.6, 0, 1), spd = P.vel.length();
    if (spd < 2) P.vel.add(V3(-Math.sin(CAM.yaw) * 5, 0, -Math.cos(CAM.yaw) * 5));
    else if (good > 0 && spd < 40) P.vel.multiplyScalar(1 + (2 + 5 * good) / spd);
    if (good > 0.5) particles.ring(P.pos.x, P.pos.y + 0.6, P.pos.z, 12, 1.2, { color: 0x9ad86a, size: 0.35, life: 0.35 });
    sfx.swing();
  }
  function vineTick(dt, act) {
    if (!P.ride || !act) { vines.L = vines.R = null; return; }
    if (P.onGround && vineN < SW.n && (vineGrow += dt) > 0.3) { vineGrow = 0; vineN++; }
    for (const side of ['L', 'R']) {
      const S = vines[side]; if (!S || S.hold) continue;
      S.t += dt; S.k = Math.min(1, S.t / (0.06 + S.L * 0.007));   // it takes a moment to reach, longer the further it goes
      if (S.k < 1) continue;
      vineN = Math.max(0, vineN - 1); S.hold = true;
      sfx.hit(); particles.burst(S.A.x, S.A.y, S.A.z, 10, { color: 0x9ad86a, speed: 3, size: 0.35, life: 0.5 });
      // she hauls: you leave the ground and go, even from a standstill
      const fx = S.A.x - P.pos.x, fz = S.A.z - P.pos.z, fd = Math.hypot(fx, fz) || 1, hv = Math.hypot(P.vel.x, P.vel.z);
      if (hv < 15 && !keys.KeyX) { P.vel.x += fx / fd * (15 - hv); P.vel.z += fz / fd * (15 - hv); }
      if (P.onGround || P.pos.y - groundAt(P.pos.x, P.pos.z, P.pos.y) < 1.5) P.vel.y = Math.max(P.vel.y, 7);
      P.onGround = false; P.coyote = 0;
      S.L = V3(P.pos.x, P.pos.y + SW.hip, P.pos.z).distanceTo(S.A);
    }
    const H = heldVines(); if (!H.length) return;
    const hold = keys.KeyX, reelIn = keys.ShiftLeft || keys.ShiftRight, letOut = keys.KeyC;
    for (const S of H) {
      if (reelIn) S.L = Math.max(2.5, S.L - 7 * dt);
      else if (letOut) S.L = Math.min(SW.range, S.L + 7 * dt);
      else if (!hold) { const want = Math.max(4, S.A.y - (heightAt(S.A.x, S.A.z) + 2.5)); S.L = Math.max(4, S.L - Math.min(24, 1.5 + Math.max(0, S.L - want) * 3) * dt); }
    }
    // the rope: no vine lets you get further than its length from where it caught
    const hip = V3(P.pos.x, P.pos.y + SW.hip, P.pos.z), pred = hip.clone().addScaledVector(P.vel, dt);
    for (let it = 0; it < (H.length > 1 ? 3 : 1); it++) for (const S of H) { const d = pred.clone().sub(S.A), len = d.length(); if (len > S.L) pred.copy(S.A).addScaledVector(d, S.L / len); }
    P.vel.copy(pred.sub(hip)).multiplyScalar(1 / dt);
    const spd = P.vel.length();
    if (hold) P.vel.multiplyScalar(1 - 1.2 * dt);
    else if (spd > 0.5 && spd < 38 && P.vel.y < 0) P.vel.multiplyScalar(1 + 0.12 * dt);
    if (Math.random() < 0.35) particles.emit(P.pos.x, P.pos.y + 0.6, P.pos.z, { color: 0x9ad86a, size: 0.3, life: 0.5, speed: 1 });
  }
  /* the mouse, on her back: her two front vines */
  function vineButton(button, down) {
    const side = button === 0 ? 'L' : button === 2 ? 'R' : null; if (!side) return false;
    if (!down) { vineLet(side); return P.ride; }
    return P.ride ? vineShoot(side) : false;
  }
  function updatePlayer(dt, playing) {
    if (P.slide) { updateSlide(dt); poseTanoc(dt, 0); return; }
    let ix = 0, iz = 0;
    if (playing && !P.down) {
      if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1;
      if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
      if (touch && touch.on) { ix += touch.move.x; iz += touch.move.y; }
    }
    const len = Math.hypot(ix, iz);
    const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = -fz, rz = fx;
    let wx = 0, wz = 0;
    if (len > 0.08) { const k = Math.min(1, len) / len; wx = (fx * iz + rx * ix) * k; wz = (fz * iz + rz * ix) * k; }
    const run = keys.ShiftLeft || keys.ShiftRight;
    const sp = P.ride ? (run ? 17 : 10) : (run ? 8.6 : 4.8) * (P.swing > 0 ? 0.35 : 1);
    const swinging = P.ride && heldVines().length > 0, flying = P.ride && !P.onGround && Math.hypot(P.vel.x, P.vel.z) > sp + 1;
    if (swinging || flying) { P.vel.x += wx * 7 * dt; P.vel.z += wz * 7 * dt; }   // on a vine, or flung off one: you keep your speed, and only lean it
    else { P.vel.x = damp(P.vel.x, wx * sp, P.onGround ? (P.ride ? 6 : 14) : 4, dt); P.vel.z = damp(P.vel.z, wz * sp, P.onGround ? (P.ride ? 6 : 14) : 4, dt); }
    if (len > 0.08 && P.swing <= 0) P.yaw = dampAngle(P.yaw, Math.atan2(wx, wz), P.ride ? 6 : 12, dt);
    P.jumpBuf -= dt; P.coyote -= dt; P.iframes = Math.max(0, P.iframes - dt);
    if (P.jumpBuf > 0 && (P.onGround || P.coyote > 0) && playing && !P.down) { P.vel.y = P.ride ? 10 : 9.2; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; sfx.jump(); }
    P.vel.y -= 26 * dt;
    vineTick(dt, playing && !P.down);
    P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
    resolve(P.pos, P.ride ? 0.9 : PR);
    P.pos.y += P.vel.y * dt;
    const g = groundAt(P.pos.x, P.pos.z, P.pos.y);
    if (P.pos.y <= g + 0.02 && P.vel.y <= 0) { P.pos.y = g; P.vel.y = 0; P.onGround = true; P.coyote = 0.12; }
    else if (P.onGround && P.pos.y - g < 1.2 && P.vel.y <= 0) { P.pos.y = g; P.vel.y = 0; }
    else P.onGround = false;
    if (P.swing > 0) {
      P.swing -= dt;
      if (!P.hitDone && P.swing < 0.24) {
        P.hitDone = true;
        for (const f of foes) {
          if (f.dead || f.out) continue;
          const dx = f.pos.x - P.pos.x, dz = f.pos.z - P.pos.z, d = Math.hypot(dx, dz);
          if (d < 2.7 && (dx * Math.sin(P.yaw) + dz * Math.cos(P.yaw)) / (d || 1) > 0.2) hitFoe(f, 14, P.pos);
        }
        if (GYN && GYN.alive && GYN.phase === 2 && Math.hypot(GYN.pos.x - P.pos.x, GYN.pos.z - P.pos.z) < 6) gyngeBounce(P.pos.clone().setY(P.pos.y + 1.2));
      }
    }
    const speed = Math.hypot(P.vel.x, P.vel.z);
    if (P.onGround && speed > 1 && !P.ride) { P.stepPh += dt * speed * 0.55; if (P.stepPh > 1) { P.stepPh = 0; sfx.step(); } }
    poseTanoc(dt, speed);
  }
  function poseTanoc(dt, speed) {
    if (P.ride) {   // in the saddle: his grown Punk under him, vines going
      K.pos.copy(P.pos); K.yaw = P.yaw;
      const R0 = punk.root; R0.rotation.order = 'YXZ';
      R0.position.copy(P.pos); R0.rotation.y = P.yaw; R0.visible = true;
      // in the air she leans into the swing: nose along the way she's going, rolled toward the vine
      const hv = Math.hypot(P.vel.x, P.vel.z), held = heldVines();
      let pitch = 0, roll = 0;
      if (!P.onGround) {
        pitch = clamp(-Math.atan2(P.vel.y, Math.max(hv, 1)) * 0.6, -0.7, 0.7);
        if (held.length) { const ax = held.reduce((q, v) => q + v.A.x, 0) / held.length - P.pos.x, az = held.reduce((q, v) => q + v.A.z, 0) / held.length - P.pos.z; roll = clamp(-(ax * Math.cos(P.yaw) - az * Math.sin(P.yaw)) * 0.04, -0.5, 0.5); }
      }
      R0.rotation.x = damp(R0.rotation.x, pitch, 8, dt); R0.rotation.z = damp(R0.rotation.z, roll, 8, dt);
      R0.updateMatrixWorld(true);
      const grabs = ['L', 'R'].map(k => vines[k]).filter(Boolean).map(v => ({ p: R0.worldToLocal(v.A.clone()), k: v.hold ? 1 : v.k }));
      K.air = damp(K.air || 0, P.onGround ? 0 : 1, 8, dt);
      punk.animate(dt, { speed: P.onGround ? speed : 0, t, air: K.air, grabs: grabs.length ? grabs : null });
      // he sits in the saddle itself, carried by her body as it bobs and rolls
      const T = tanoc.root, b = punk.body, cf = punk.cfg;
      if (b && cf) {
        b.updateMatrixWorld(true);
        T.position.copy(b.localToWorld(V3(0, cf.R * cf.sq + cf.R * 0.07, -cf.R * 0.15)));
        T.position.y -= 0.76 * T.scale.y;
        b.getWorldQuaternion(_seatQ); _yawQ.setFromAxisAngle(_UP, P.yaw); T.quaternion.copy(_yawQ).slerp(_seatQ, 0.65);
        K.gait = clamp((b.position.y - cf.bodyY) / (cf.R * 0.08), 0, 1.2);
      } else { T.position.copy(P.pos).add(V3(0, 1.8, 0)); T.rotation.set(0, P.yaw, 0); }
      tanoc.animate(dt, { speed: 0, onGround: true, t, swing: null, ride: true, rideSpeed: hv, rideBob: K.gait || 0, rideRoll: roll * 0.4 });
      return;
    }
    placeWalker(tanoc.root, P, dt); tanoc.root.rotation.x = 0; tanoc.root.rotation.y = P.yaw;
    if (P.down) { tanoc.root.rotation.z = damp(tanoc.root.rotation.z, 1.35, 5, dt); tanoc.root.position.y += 0.25; }
    else tanoc.root.rotation.z = damp(tanoc.root.rotation.z, 0, 8, dt);
    tanoc.animate(dt, { speed: P.down ? 0 : speed, onGround: P.onGround, t, swing: P.swing > 0 ? { kind: 1, p: 1 - P.swing / 0.42 } : null });
  }
  /* the Punk, afoot: at his heels, or staying where she was told */
  function updatePunk(dt) {
    if (P.ride) return;
    if (!K.on) { punk.root.visible = false; return; }
    punk.root.visible = true;
    let want = K.stay;
    if (!want) { const back = V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), right = V3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); want = P.pos.clone().addScaledVector(back, 3).addScaledVector(right, -2); }
    const dx = want.x - K.pos.x, dz = want.z - K.pos.z, d = Math.hypot(dx, dz), sp = d > 1 ? Math.min(12, d * 2) : 0;
    if (d > 60 && !K.stay) K.pos.set(want.x, 0, want.z);
    else if (sp > 0) { K.pos.x += dx / d * sp * dt; K.pos.z += dz / d * sp * dt; K.yaw = dampAngle(K.yaw, Math.atan2(dx, dz), 6, dt); }
    else K.yaw = dampAngle(K.yaw, Math.atan2(P.pos.x - K.pos.x, P.pos.z - K.pos.z), 3, dt);
    resolve(K.pos, 0.9); K.pos.y = groundAt(K.pos.x, K.pos.z, K.pos.y + 1);
    punk.root.position.copy(K.pos); punk.root.rotation.y = K.yaw;
    punk.animate(dt, { speed: sp, t });
  }
  /* the Rodak: curious, never hostile; they want to be there for what comes after */
  const rodak = [];
  function rodakPack(n, x, z) {
    for (let i = 0; i < n; i++) {
      const a = buildRodak({ seed: 400 + i }); scene.add(a.root);
      const r = { a, pos: V3(x + (i - n / 2) * 5, 0, z - rng() * 4), yaw: 0, mode: 'watch', slot: (i / n) * TAU, home: null };
      r.pos.y = ground(r.pos.x, r.pos.z); r.home = r.pos.clone(); rodak.push(r);
    }
  }
  function updateRodak(dt) {
    for (const r of rodak) {
      let want = null, sp = 0;
      if (r.mode === 'watch') { r.yaw = dampAngle(r.yaw, Math.atan2(P.pos.x - r.pos.x, P.pos.z - r.pos.z), 2, dt); }
      else if (r.mode === 'escort') {   // close enough to touch, all round him, never in the way
        const a = r.slot + t * 0.05; want = V3(P.pos.x + Math.cos(a) * 7, 0, P.pos.z + Math.sin(a) * 7);
        if (want.z < LINE_Z + 1) want.z = LINE_Z + 1;
      } else if (r.mode === 'sit') { want = r.home; }
      if (want) {
        const dx = want.x - r.pos.x, dz = want.z - r.pos.z, d = Math.hypot(dx, dz); sp = d > 0.8 ? Math.min(9, d * 1.6) : 0;
        if (sp > 0) { r.pos.x += dx / d * sp * dt; r.pos.z += dz / d * sp * dt; r.yaw = dampAngle(r.yaw, Math.atan2(dx, dz), 6, dt); }
        else r.yaw = dampAngle(r.yaw, Math.atan2(P.pos.x - r.pos.x, P.pos.z - r.pos.z), 3, dt);
        resolve(r.pos, 0.6);
      }
      r.pos.y = groundAt(r.pos.x, r.pos.z, r.pos.y + 1);
      r.a.root.position.copy(r.pos); r.a.root.rotation.y = r.yaw;
      r.a.animate(dt, { speed: sp, t, windup: 0, attack: 0 });
    }
  }

  /* little lives about the place: things passing over, Malsti Punks in the ruins */
  const critters = [];
  function updateCritters(dt) {
    for (let i = critters.length - 1; i >= 0; i--) { const c = critters[i]; c.t += dt; c.tick(c, dt); if (c.life && c.t > c.life) { scene.remove(c.a.root); critters.splice(i, 1); } }
  }
  function ruinMalsti() {
    for (let i = 0; i < 4; i++) {
      const m = buildMalstiPunk({ seed: 70 + i }); m.root.scale.setScalar(5); scene.add(m.root);
      const home = V3(RUINS.x + Math.cos(i * 1.7) * 24, 0, RUINS.z + Math.sin(i * 1.7) * 24);
      critters.push({ a: m, t: 0, life: 0, home, pos: home.clone(), tgt: home.clone(), blink: 0, tick(c, dt) {
        // scamper about their bit of wall; if he comes close, blink away through the Duat to another
        const d = Math.hypot(P.pos.x - c.pos.x, P.pos.z - c.pos.z);
        if (d < 6 && c.blink <= 0) { particles.burst(c.pos.x, c.pos.y + 0.3, c.pos.z, 14, { color: 0xc88aff, speed: 3, size: 0.3, life: 0.5 }); c.pos.set(c.home.x + (Math.random() - 0.5) * 20, 0, c.home.z + (Math.random() - 0.5) * 20); c.blink = 2; sfx.blink(); }
        c.blink -= dt;
        if (c.pos.distanceTo(c.tgt) < 0.5) c.tgt.set(c.home.x + (Math.random() - 0.5) * 14, 0, c.home.z + (Math.random() - 0.5) * 14);
        const dx = c.tgt.x - c.pos.x, dz = c.tgt.z - c.pos.z, dd = Math.hypot(dx, dz) || 1, sp = 3.5;
        c.pos.x += dx / dd * sp * dt; c.pos.z += dz / dd * sp * dt; c.pos.y = ground(c.pos.x, c.pos.z);
        c.a.root.position.copy(c.pos); c.a.root.rotation.y = Math.atan2(dx, dz); c.a.animate(dt, { speed: sp, t });
      } });
    }
  }
  ruinMalsti();

  /* ================================================================
     THE STORY
     ================================================================ */
  let D = {};   // per-stage state
  const say = (lines, cb) => ctx.say(lines, cb);

  /* ---- Day 1: up the river through the pass ---- */
  function startRide() {
    stage = 'ride'; sub = 'ride'; ctx.save('ride'); setLook('day', true);
    P.ride = true; place(P, pathX(-6), -6, Math.PI); K.on = true;
    D = { said: 0 };
    cut([
      { dur: 6.5, from: { p: [pathX(-300) + 70, 140, -340], l: [pathX(-120), 20, -120] }, to: { p: [pathX(-200) + 40, 80, -230], l: [pathX(-40), 6, -40] }, caption: M.cards },
      { dur: 6, cam: k => ({ p: V3(P.pos.x + 6 - k * 2, P.pos.y + 2.4, P.pos.z - 9 + k * 2), l: V3(P.pos.x, P.pos.y + 1.6, P.pos.z) }), caption: M.ride[0][1], onTick: () => { P.vel.set(0, 0, -6); } },
    ], () => { ctx.location('The river pass', 'Chapter II · north, into the mist'); objective('Ride north up the river pass', 'Shift to gallop · click to throw her vines at the pines — hold to swing, let go to fly'); setGoal(CLEAR.x, heightAt(CLEAR.x, CLEAR.z), CLEAR.z); });
  }
  function rideTick() {
    const prog = clamp(-P.pos.z / -PASS1, 0, 1);
    const marks = [0.15, 0.4, 0.65, 0.85];
    if (D.said < marks.length && prog > marks[D.said]) { const [w, l] = M.rideBarks[D.said]; ctx.bark(w, l, 4.5); D.said++; }
    if (!D.rocks && P.pos.z < ROCK_Z + 34) { startRocks(); return; }
    if (D.rocks === 'done' && !D.mist && P.pos.z < MIST_Z0) { startMist(); return; }
    if (P.pos.z < PASS1 - 20) arriveClearing();
  }
  /* ---- the rockfall: her vines haul three boulders off the road; the split one wants fire ---- */
  const crackRock = () => rockfall.find(r => r.i === 2 && !r.done && stage === 'rocks');
  function clearRock(r) {
    r.done = true; r.s.off = true;
    if (r.crack) scene.remove(r.crack);
    const left = rockfall.filter(q => !q.done).length;
    objective(M.rockObj(4 - left), M.rockHint, 4, 4 - left);
    if (!left) {
      D.rocks = 'done'; stage = 'ride'; setGoal(CLEAR.x, heightAt(CLEAR.x, CLEAR.z), CLEAR.z);
      setTimeout(() => say(M.rockDone, () => { objective('Ride north up the river pass', 'Shift to gallop — follow the river'); ctx.play(); }), 900);
    }
  }
  function startRocks() {
    stage = 'rocks'; D.rocks = 'on'; ctx.save('rocks'); setGoal();
    for (const r of rockfall) {
      if (r.done) continue;
      const at = V3(r.x, ground(r.x, r.z + r.r + 2.4) + 0.4, r.z + r.r + 2.4);
      r.item = addItem(at, r.i === 2 ? 'Look at the split boulder' : M.haul, () => {
        if (r.i === 2) { ctx.bark('tanoc15', M.cracked, 3.5); return; }
        dropItem(r.item); haulRock(r);
      });
    }
    sayHeld(M.rockSee, (k, tt) => ({ p: V3(P.pos.x + 5, P.pos.y + 3.5, P.pos.z + 8), l: V3(pathX(ROCK_Z), heightAt(pathX(ROCK_Z), ROCK_Z) + 2, ROCK_Z) }), () => {
      objective(M.rockObj(0), M.rockHint, 4, 0); ctx.play();
    });
  }
  function haulRock(r) {
    const from = r.m.position.clone(), side = r.x > pathX(r.z) ? 1 : -1, to = V3(r.x + side * 16, 0, r.z + 3); to.y = heightAt(to.x, to.z) + r.r * 0.5;
    sfx.heavy(); shake = 0.5;
    cut([{ dur: 2.6, cam: k => ({ p: V3(r.x - side * 6, r.g + 4, r.z + 10), l: V3(lerp(from.x, to.x, k), r.g + 1.5, r.z) }), caption: M.hauled[(rockfall.filter(q => q.done).length) % M.hauled.length],
      onTick: k => { const e = smooth(0, 1, k); r.m.position.lerpVectors(from, to, e); r.m.rotation.z -= side * 0.05; if (Math.random() < 0.5) particles.emit(r.m.position.x, r.g + 0.3, r.m.position.z, { vx: 0, vy: 1, vz: 0, color: 0xa89a80, size: 0.6, life: 0.6, drag: 1 }); } }], () => { clearRock(r); ctx.play(); });
  }
  function crackHit(r) {
    r.hits++; sfx.flare(); shake = 0.3;
    if (r.crack) { r.crack.material.opacity = 0.15 + r.hits * 0.3; r.crack.scale.setScalar(2.4 + r.hits); }
    if (r.hits < 3) { ctx.bark('tale', M.crackHit[r.hits - 1], 2.5); return; }
    particles.burst(r.x, r.g + r.r * 0.7, r.z, 80, { color: 0xffa040, speed: 10, size: 0.6, life: 0.9, gravity: -8 });
    particles.burst(r.x, r.g + r.r * 0.7, r.z, 40, { color: 0x8a8478, speed: 8, size: 0.8, life: 1.1, gravity: -12 });
    sfx.slam(); shake = 1; r.m.visible = false; if (r.item) dropItem(r.item);
    clearRock(r);
  }
  function rocksTick() {
    if (P.pos.z < ROCK_Z + 6.5 && rockfall.some(r => !r.done)) {
      P.pos.z = ROCK_Z + 6.5; P.vel.z = Math.max(0, P.vel.z);
      if (t - (D.blockT ?? -9) > 6) { D.blockT = t; ctx.bark('tanoc15', M.rockBlock, 3.5); }
    }
  }
  /* ---- the mist: find the walkers' cairns by the amulet's hum ---- */
  function startMist() {
    stage = 'mist'; D.mist = 'on'; D.lit = cairns.filter(c => c.lit).length; ctx.save('mist'); setGoal();
    for (const c of cairns) if (!c.lit) c.item = addItem(V3(c.x, c.g + 0.6, c.z + 1.4), M.cairnUse, () => lightCairn(c));
    say(M.mistIn, () => { objective(M.cairnObj(D.lit), M.cairnHint, 4, D.lit); ctx.play(); });
  }
  function lightCairn(c) {
    dropItem(c.item); c.lit = true; D.lit++; sfx.core(); c.glow.material.opacity = 0.85;
    particles.burst(c.x, c.g + 2.6, c.z, 24, { color: 0x9fe8ff, speed: 3, size: 0.4, life: 0.9 });
    ctx.bark('tale', M.cairnLit[D.lit - 1], 4);
    objective(M.cairnObj(D.lit), M.cairnHint, 4, D.lit);
    if (D.lit >= cairns.length) {
      D.mist = 'done'; stage = 'ride'; D.humK = 0;
      setTimeout(() => say(M.mistOut, () => { objective('Ride on north, out of the mist', 'The clearing is at the top of the pass'); setGoal(CLEAR.x, heightAt(CLEAR.x, CLEAR.z), CLEAR.z); ctx.play(); }), 1600);
    }
  }
  function mistTick(dt) {
    if (P.pos.z < MIST_Z1) {
      P.pos.z = MIST_Z1; P.vel.z = Math.max(0, P.vel.z);
      if (t - (D.blockT ?? -9) > 6) { D.blockT = t; ctx.bark('sniller', M.mistBlock, 3.5); }
    }
    // the amulet hums louder the nearer the next cairn
    let best = 1e9; for (const c of cairns) if (!c.lit) best = Math.min(best, Math.hypot(c.x - P.pos.x, c.z - P.pos.z));
    const band = best < 14 ? 'near' : best < 36 ? 'warm' : 'cold';
    D.humK = band === 'near' ? 0.7 : band === 'warm' ? 0.35 : 0;
    D.humT = (D.humT || 0) - dt;
    if (band !== D.band && D.humT <= 0) { D.band = band; D.humT = 3; ctx.bark('sniller', M.hum[band], 2.5); }
  }
  function arriveClearing() {
    stage = 'clearing'; sub = 'look'; ctx.save('clearing'); setGoal();
    P.vel.set(0, 0, 0);
    rodakPack(6, pathX(EDGE_Z) + 6, EDGE_Z + 2);
    cut([
      { dur: 6, from: { p: [P.pos.x - 3, P.pos.y + 2.5, P.pos.z + 6], l: [CLEAR.x, 60, EDGE_Z - 80] }, to: { p: [P.pos.x - 2, P.pos.y + 3, P.pos.z + 3], l: [CLEAR.x, 90, EDGE_Z - 120] }, caption: M.clearing[0][1] },
      { dur: 5, from: { p: [pathX(EDGE_Z) + 10, heightAt(0, EDGE_Z + 30) + 3, EDGE_Z + 30], l: [pathX(EDGE_Z) + 6, heightAt(0, EDGE_Z) + 2, EDGE_Z] }, to: { p: [pathX(EDGE_Z) + 8, heightAt(0, EDGE_Z + 22) + 2.2, EDGE_Z + 22], l: [pathX(EDGE_Z) + 6, heightAt(0, EDGE_Z) + 1.5, EDGE_Z] }, caption: M.clearing[2][1] },
    ], () => {
      sayHeld([M.clearing[1], M.clearing[3], M.clearing[4]], over(P, 1), () => {
        // deadwood first: four fallen branches round the edge of the clearing
        D.wood = 0;
        objective(M.woodObj(0), M.woodHint, 4, 0);
        for (const [x, z] of [[-30, -606], [24, -598], [32, -632], [-34, -646]]) {
          const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.2 - k * 0.4, 5), toon(0x6a4a2e)); l.rotation.set(Math.PI / 2, 0, k * 0.7); l.position.y = 0.15 + k * 0.12; g.add(l); }
          g.add(glowSprite(0xffd27a, 1.2, 0.35));
          const it = addItem(V3(x, ground(x, z) + 0.3, z), M.woodTake, () => {
            dropItem(it); D.wood++; sfx.ui(); objective(M.woodObj(D.wood), M.woodHint, 4, D.wood);
            if (D.wood >= 4) {
              objective(M.campObj, 'Ride to the stones by the old firepit, and press E');
              setGoal(FIRE1.x, fires[0].y, FIRE1.z);
              D.camp = addItem(V3(FIRE1.x, fires[0].y + 0.5, FIRE1.z), 'Make camp for the night', () => { dropItem(D.camp); night1(); });
            }
          }, g);
        }
        setGoal();
      });
    });
  }
  function night1() {
    setGoal(); P.ride = false; fires[0].on = true; setLook('night');
    place(P, FIRE1.x + 2.2, FIRE1.z + 1.2, -Math.PI * 0.6); place(K, FIRE1.x + 1.2, FIRE1.z + 2.4, -Math.PI * 0.8); K.stay = K.pos.clone();
    for (const r of rodak) r.mode = 'watch';
    const c = fires[0];
    sayHeld(M.night1, fireCam(c), () => {
      // the night sounds — far apart, one at a time
      const play = i => {
        if (i >= M.sounds.length) { morning(); return; }
        if (i === 0) {   // a Lutut, high over the treetops, a dark shape against the stars
          const l = buildLutut({ seed: 5, age: 0.8 }); l.root.scale.setScalar(1.6); scene.add(l.root);
          critters.push({ a: l, t: 0, life: 9, tick(c, dt) { const k = c.t / c.life; c.a.root.position.set(FIRE1.x - 160 + k * 320, fires[0].y + 70 + Math.sin(k * 3) * 6, FIRE1.z - 90 - k * 20); c.a.root.rotation.y = Math.PI / 2; c.a.animate(dt, { speed: 14, t, airborne: true }); } });
        }
        if (i === 1) import('./creatures2.js').then(C => {   // an Api Buta: the bellow, and a glow of fire moving deep among the trunks
          if (!C.buildApiButa) return;
          const a = C.buildApiButa({ seed: 9 }); scene.add(a.root);
          critters.push({ a, t: 0, life: 12, tick(c, dt) { const k = c.t / c.life; c.a.root.position.set(FIRE1.x + 90 - k * 180, fires[0].y + 8, FIRE1.z - 120); c.a.root.rotation.y = -Math.PI / 2; c.a.animate(dt, { speed: 6, t, airborne: true }); c.a.glow && c.a.glow(1); } });
        }).catch(() => {});
        [sfx.flare, sfx.roar, sfx.duat, () => {}][i]();
        setTimeout(() => sayHeld([M.sounds[i]], (k, tt) => ({ p: V3(c.x + 3, c.y + 1.6, c.z + 5), l: V3(c.x - 10 + i * 8, c.y + 6, c.z - 60) }), () => play(i + 1)), 900);
      };
      play(0);
    });
  }
  function morning() {
    stage = 'enter'; sub = 'walk'; ctx.save('enter'); setLook('grey'); fires[0].on = false;
    K.stay = null;
    for (const r of rodak) { r.a.root.visible = false; r.pos.set(0, -80, 0); }
    say(M.morning, () => { objective(M.enterObj, 'The Punk walks with you'); setGoal(pathX(THUD_Z - 10), heightAt(0, THUD_Z), THUD_Z - 10); ctx.play(); });
  }
  function enterTick() {
    if (P.pos.z < THUD_Z) thud();
  }
  function thud() {
    stage = 'thud'; sfx.slam(); shake = 1.2;
    particles.burst(ANIMAL.x, heightAt(ANIMAL.x, ANIMAL.z) + 2, ANIMAL.z, 40, { color: 0x8a7a62, speed: 8, size: 0.7, life: 1, gravity: -6 });
    say(M.thud, () => {
      // the Punk grabs him, puts him in the saddle and bolts back to the clearing
      const from = P.pos.clone(), to = V3(FIRE1.x + 3, 0, FIRE1.z + 3); to.y = ground(to.x, to.z);
      P.ride = true;
      cut([
        { dur: 1.4, cam: k => ({ p: V3(K.pos.x + 4, K.pos.y + 2, K.pos.z + 4), l: V3(K.pos.x, K.pos.y + 1, K.pos.z) }), onTick: k => { P.pos.copy(from); P.vel.set(0, 0, 0); } },
        { dur: 4, cam: k => ({ p: V3(P.pos.x - 4, P.pos.y + 3, P.pos.z - 7), l: V3(P.pos.x, P.pos.y + 1.4, P.pos.z) }), caption: M.grabbed[0][1],
          onTick: k => { const e = smooth(0, 1, k); P.pos.set(lerp(from.x, to.x, e), 0, lerp(from.z, to.z, e)); P.pos.y = ground(P.pos.x, P.pos.z); P.yaw = Math.atan2(to.x - from.x, to.z - from.z); P.vel.set((to.x - from.x) / 4, 0, (to.z - from.z) / 4); } },
      ], () => {
        P.ride = false; P.vel.set(0, 0, 0); place(P, to.x, to.z, Math.PI); place(K, to.x - 1.5, to.z + 2, Math.PI); K.stay = K.pos.clone();
        sayHeld(M.grabbed.slice(1), over(P, -1, 1.6, 4), () => {
          stage = 'alone'; sub = 'animal'; ctx.save('alone');
          objective(M.aloneObj, 'The Punk stays by the fire'); setGoal(ANIMAL.x, heightAt(ANIMAL.x, ANIMAL.z), ANIMAL.z);
          ctx.play();
        });
      });
    });
  }
  /* ---- alone: the animal, the trail, the Rodak, the line, the ruins ---- */
  let animal = null;
  const trail = [];
  function buildAnimal() {
    if (animal) return;
    animal = buildSruVorn({ seed: 12 }); animal.root.scale.setScalar(1.6); scene.add(animal.root);
    const g = heightAt(ANIMAL.x, ANIMAL.z); animal.root.position.set(ANIMAL.x, g + 0.6, ANIMAL.z); animal.root.rotation.set(0, 0.6, Math.PI / 2 * 0.92);
    // the furrow it was dragged along, and drag-marks on to the ruins
    const pts = [];
    for (let i = 0; i <= 40; i++) { const k = i / 40, z = lerp(ANIMAL.z, RUINS.z + RUINS.r - 6, k), x = lerp(ANIMAL.x, RUINS.x + 4, k) + Math.sin(k * 9) * 4; pts.push(V3(x, heightAt(x, z) + 0.06, z)); }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, a.distanceTo(b) + 0.2), new THREE.MeshBasicMaterial({ color: 0x2a2018, transparent: true, opacity: 0.55, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(b.x - a.x, b.z - a.z); m.position.copy(a).lerp(b, 0.5); m.position.y += 0.03; scene.add(m);
      if (i % 5 === 2) { const gl = glowSprite(0xffd27a, 1.4, 0); gl.position.copy(a).setY(a.y + 0.8); scene.add(gl); trail.push(gl); }
    }
  }
  function aloneTick() {
    if (sub === 'animal' && Math.hypot(P.pos.x - ANIMAL.x, P.pos.z - ANIMAL.z) < 7) {
      sub = 'trail';
      sayHeld(M.animal, (k, tt) => ({ p: V3(ANIMAL.x + 6, heightAt(ANIMAL.x, ANIMAL.z) + 3.5, ANIMAL.z + 6), l: V3(ANIMAL.x, heightAt(ANIMAL.x, ANIMAL.z) + 1, ANIMAL.z) }), () => {
        trail.forEach(g => { g.material.opacity = 0.6; });
        objective(M.trailObj, 'The golden marks show the furrow'); setGoal(RUINS.x, heightAt(RUINS.x, RUINS.z), RUINS.z + RUINS.r - 6);
        ctx.play();
      });
    }
    if (sub === 'trail' && P.pos.z < ANIMAL.z - 12 && !D.rodakOn) {
      D.rodakOn = true;
      // the pack comes out of the fog on every side and walks with him
      rodak.forEach((r, i) => { r.a.root.visible = true; const a = r.slot; r.pos.set(P.pos.x + Math.cos(a) * 22, 0, P.pos.z + Math.sin(a) * 22); r.pos.y = ground(r.pos.x, r.pos.z); r.mode = 'escort'; });
      ctx.say(M.rodak, () => ctx.play());
    }
    if (sub === 'trail' && D.rodakOn && P.pos.z < LINE_Z - 2 && !D.line) {
      D.line = true;
      rodak.forEach((r, i) => { r.mode = 'sit'; r.home = V3(P.pos.x + (i - 2.5) * 4, 0, LINE_Z + 1.5); });
      setTimeout(() => sayHeld(M.line, (k, tt) => ({ p: V3(P.pos.x - 4, P.pos.y + 2.4, P.pos.z - 6), l: V3(P.pos.x, P.pos.y + 1, LINE_Z + 2) }), () => ctx.play()), 1200);
    }
    if (sub === 'trail' && Math.hypot(P.pos.x - RUINS.x, P.pos.z - RUINS.z) < RUINS.r - 4) {
      sub = 'gather'; ctx.save('ruins'); D.got = 0;
      trail.forEach(g => { g.material.opacity = 0; });
      say(M.ruins, () => {
        D.seals = 0;
        const ruinObj = () => objective(M.sealObj(D.got, D.seals), 'Things glint among the stones, and three carved stones stand in the ring · E');
        ruinObj();
        const spots = [[RUINS.x - 22, RUINS.z + 8, 'Old stygian ore, in a split block', 'ore'], [RUINS.x + 20, RUINS.z - 4, 'A knot of ember-moss', 'ember'], [RUINS.x + 6, RUINS.z + 22, 'A carved bead of black resin', 'resin']];
        for (const [x, z, label, id] of spots) { const it = addItem(V3(x, ground(x, z) + 0.5, z), label, () => { dropItem(it); D.got++; ctx.give(id, 1); ruinObj(); }, glint()); }
        sealStones.forEach((st, i) => {
          if (st.read) return;
          const it = addItem(V3(st.x, st.g + 0.4, st.z) .add(V3(RUINS.x - st.x, 0, RUINS.z - st.z).normalize().multiplyScalar(1.4)), M.sealUse, () => {
            dropItem(it); st.read = true; D.seals++; st.rune.material.opacity = 0.9; sfx.sense();
            sayHeld(M.seals[D.seals - 1], (k, tt) => ({ p: V3(st.x + (RUINS.x - st.x) * 0.15 + 1.5, st.g + 2.2, st.z + (RUINS.z - st.z) * 0.15 + 1.5), l: V3(st.x, st.g + 1.2, st.z) }), () => {
              ruinObj();
              if (D.seals >= 3) say(M.sealsRead, () => ctx.play()); else ctx.play();
            });
          });
        });
        setGoal(WALL.x, heightAt(WALL.x, WALL.z), WALL.z + 4);
        ctx.play();
      });
    }
    if (sub === 'gather' && !D.saw && Math.hypot(P.pos.x - WALL.x, P.pos.z - WALL.z) < 20) {
      D.saw = true;
      sayHeld(M.relicSeen, (k, tt) => ({ p: V3(WALL.x + 5, relic.position.y + 0.5, WALL.z + 9), l: relic.position }), () => ctx.play());
    }
    if (sub === 'gather' && D.saw && D.seals >= 3 && Math.hypot(P.pos.x - WALL.x, P.pos.z - WALL.z) < 12 && !cine.active) erupt();
  }
  /* ---- the Gynge ---- */
  function erupt() {
    sub = 'erupt'; stage = 'gynge'; ctx.save('gynge'); setGoal();
    for (const it of items.slice()) dropItem(it);
    spawnGynge(); sfx.slam(); shake = 1.4;
    P.vel.set(Math.sin(P.yaw + Math.PI) * 9, 9, Math.cos(P.yaw + Math.PI) * 9); P.onGround = false;   // thrown clear
    cut([
      { dur: 3.4, cam: k => ({ p: V3(GY.x + 18, heightAt(GY.x, GY.z) + 4 + k * 3, GY.z + 16), l: V3(GY.x, heightAt(GY.x, GY.z) + 1 + k * 2, GY.z) }), caption: M.erupt[0][1] },
    ], () => {
      say(M.gyngeIntro, () => { GYN.phase = 1; GYN.cyc = 'shut'; GYN.ct = 0; objective(M.phase1, 'Q throws a burning stone · stay moving — glowing rings mean a spike is coming', 3, 0); ctx.play(); });
    });
  }
  function harvest() {
    stage = 'harvest'; sub = 'harvest'; ctx.save('harvest');
    objective(M.harvestObj, 'E by its open maw');
    const m = mawPoint();
    D.chip = addItem(V3(m.x, ground(m.x, m.z) + 0.6, m.z), 'Work a chip of living rock loose from its maw', () => {
      dropItem(D.chip); ctx.give('gynge_chip', 1); ctx.give('gynge_hide', 2); sfx.core();
      say(M.chip, () => {
        objective(M.relicObj, 'E at the Relic in the wall'); setGoal(WALL.x, heightAt(WALL.x, WALL.z), WALL.z + 2);
        D.relic = addItem(V3(WALL.x, heightAt(WALL.x, WALL.z) + 0.5, WALL.z + 1.6), 'Examine the Relic in the wall', () => {
          dropItem(D.relic); setGoal();
          relicPulse = 1.5;
          sayHeld(M.relic, (k, tt) => ({ p: V3(WALL.x + 3.4 + Math.sin(tt * 0.2), relic.position.y - 0.6, WALL.z + 7.5), l: relic.position.clone().setY(relic.position.y - 0.8) }), () => {
            ctx.give('akai_rubbing', 1); ctx.toast('A song burned into your mind — the Akai Gek Relic’s. Marked on your map.', 4);
            objective(M.campObj2, 'The old hearth-stones on the west side of the ruins · E');
            setGoal(FIRE2.x, fires[1].y, FIRE2.z);
            D.camp2 = addItem(V3(FIRE2.x, fires[1].y + 0.5, FIRE2.z), 'Make camp in the ruins', () => { dropItem(D.camp2); night2(); });
          });
        }, null);
      });
    }, glint(0xffb050));
  }
  function night2() {
    setGoal(); fires[1].on = true; setLook('night');
    place(P, FIRE2.x + 2, FIRE2.z + 1, -Math.PI / 2);
    sayHeld(M.night2, fireCam(fires[1]), () => {
      ctx.fade && ctx.fade(1, 1);
      setTimeout(() => startDay2(), 1100);
    });
  }
  /* ---- Day 2 ---- */
  function startDay2() {
    stage = 'day2'; sub = 'walk'; ctx.save('day2'); setLook('grey', true); fires[1].on = false;
    if (GYN) { GYN.a.root.visible = true; }
    place(P, FIRE2.x + 4, FIRE2.z - 2, Math.PI);
    D = { said: 0, waves: 0 };
    ctx.fade && ctx.fade(0, 1.2);
    cut([{ dur: 5.5, from: { p: [RUINS.x + 30, heightAt(RUINS.x, RUINS.z) + 30, RUINS.z + 20], l: [RUINS.x, heightAt(RUINS.x, RUINS.z), RUINS.z - 30] }, to: { p: [RUINS.x + 10, heightAt(RUINS.x, RUINS.z) + 12, RUINS.z - 10], l: [pathX(-960), heightAt(0, -960) + 8, -960] }, caption: M.day2 }], () => {
      objective(M.day2Obj, 'North, past the ruins'); setGoal(pathX(-960), heightAt(0, -960), -960); ctx.play();
    });
  }
  function day2Tick(dt) {
    if (D.waves === 0 && P.pos.z < -930) { D.waves = 1; for (let i = 0; i < 3; i++) addFoe('wildpunk', pathX(-960) + (i - 1) * 6, -965 - i * 2); ctx.bark(...M.day2Barks[1], 3); }
    if (D.waves === 1 && P.pos.z < -1010 && foes.every(f => f.dead || f.kind !== 'wildpunk')) { D.waves = 2; for (let i = 0; i < 4; i++) addFoe('wildpunk', pathX(-1040) + (i - 1.5) * 5, -1040 - i); ctx.bark(...M.day2Barks[0], 3); }
    if (D.waves === 2 && !D.sru && P.pos.z < -1030 && foes.every(f => f.dead || f.kind !== 'wildpunk')) {
      D.sru = addFoe('sru', pathX(-1062) + 9, -1064); D.sru.yaw = 0; sfx.roar(); shake = 0.8;
      sayHeld(M.sruWake, (k, tt) => ({ p: V3(P.pos.x - 3, P.pos.y + 2.4, P.pos.z + 5), l: V3(D.sru.pos.x, D.sru.pos.y + 1.6, D.sru.pos.z) }), () => { bossBar(100, M.sruName); objective('Fight off the Sru Vorn', 'Q — fire-stone · keep moving when it lowers its tusks'); ctx.play(); });
    }
    if (D.waves === 2 && D.sruDone && P.pos.z < -1050 && !D.eclipse) {
      D.eclipse = true; setLook('eclipse'); eclipseK = 0.001;
      setTimeout(() => sfx.duat(), 2500); setTimeout(() => sfx.duat(), 5200);
      sayHeld(M.eclipse, (k, tt) => ({ p: V3(P.pos.x - 3, P.pos.y + 1.6, P.pos.z + 4), l: V3(P.pos.x + 30, P.pos.y + 60, P.pos.z - 120) }), () => startSneak());
    }
    if (D.sneak === 'on') sneakTick(dt);
    if (D.eclipse && D.sneak === 'done' && !D.seen && Math.hypot(P.pos.x - KEEP.x, P.pos.z - KEEP.z) < KEEP.h + 40) {
      D.seen = true; stage = 'keep'; sub = 'climb'; ctx.save('keep');
      startKeep();
    }
  }
  function bossBar(pct, name) {
    gyngeBar.style.display = pct == null ? 'none' : '';
    if (name) document.getElementById('gynge-name').textContent = name;
    if (pct != null) document.getElementById('gynge-fill').style.width = pct + '%';
  }
  function sruBeaten(f) {
    f.out = 0.001; f.hp = 0; D.sruDone = true; sfx.die(); bossBar(null);
    setTimeout(() => say(M.sruDown, () => { f.dead = true; f.out = 0; scene.remove(f.a.root); objective(M.day2Obj, 'North, past the ruins'); ctx.play(); }), 900);
  }
  /* ---- the patrols round the keep, in the eclipse dark: stay out of their sight ---- */
  const patrols = [];
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xb070ff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const SEE = { r: 13, rRun: 18, half: 0.55 };
  function startSneak() {
    D.sneak = 'on'; ctx.save('sneak');
    for (const p of patrols) { scene.remove(p.a.root); scene.remove(p.cone); }
    patrols.length = 0;
    const routes = [
      [[pathX(-1068) - 26, -1066], [pathX(-1068) + 28, -1070]],
      [[pathX(-1084) + 30, -1082], [pathX(-1084) - 22, -1088]],
      [[pathX(-1100) - 24, -1100], [pathX(-1100) + 32, -1098]],
    ];
    routes.forEach(([a, b], i) => {
      const v = buildVel(); scene.add(v.root);
      const cone = new THREE.Mesh(new THREE.CircleGeometry(SEE.r, 18, -SEE.half, SEE.half * 2), coneMat); cone.geometry.rotateX(-Math.PI / 2); scene.add(cone);
      const pa = V3(a[0], 0, a[1]), pb = V3(b[0], 0, b[1]);
      patrols.push({ a: v, cone, A: pa, B: pb, k: (i * 0.37) % 1, dir: i % 2 ? -1 : 1, pause: 0, look: 0, pos: pa.clone(), yaw: 0 });
    });
    place(P, pathX(SNEAK0), SNEAK0, Math.PI);
    say(M.sneakIn, () => { objective(M.sneakObj, M.sneakHint); setGoal(towers[0].x, towers[0].g, towers[0].z); ctx.play(); });
  }
  function sneakTick(dt) {
    const run = (keys.ShiftLeft || keys.ShiftRight) && Math.hypot(P.vel.x, P.vel.z) > 6;
    for (const p of patrols) {
      // walk the beat; at each end, stop and look about
      if (p.pause > 0) { p.pause -= dt; p.look += dt; p.yaw = p.baseYaw + Math.sin(p.look * 1.4) * 1.1; }
      else {
        const L = p.A.distanceTo(p.B); p.k += p.dir * 2.4 * dt / L;
        if (p.k >= 1 || p.k <= 0) { p.k = clamp(p.k, 0, 1); p.dir *= -1; p.pause = 2.2; p.look = 0; p.baseYaw = p.yaw; }
        const dx = (p.B.x - p.A.x) * p.dir, dz = (p.B.z - p.A.z) * p.dir; p.yaw = dampAngle(p.yaw, Math.atan2(dx, dz), 5, dt);
      }
      p.pos.lerpVectors(p.A, p.B, p.k); p.pos.y = ground(p.pos.x, p.pos.z);
      p.a.root.position.copy(p.pos); p.a.root.rotation.y = p.yaw;
      p.a.animate(dt, { speed: p.pause > 0 ? 0 : 2.4, t, onGround: true });
      p.cone.position.set(p.pos.x, p.pos.y + 0.25, p.pos.z); p.cone.rotation.y = p.yaw - Math.PI / 2;
      // can it see him?
      const dx = P.pos.x - p.pos.x, dz = P.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      const r = run ? SEE.rRun : SEE.r, off = Math.abs(((Math.atan2(dx, dz) - p.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      let seen = d < 2.6 || (d < r && off < SEE.half);
      if (seen && d >= 2.6) for (let k = 1; k < 8; k++) { const q = k / 8; if (solidAt(lerp(p.pos.x, P.pos.x, q), p.pos.y + 1.4, lerp(p.pos.z, P.pos.z, q))) { seen = false; break; } }
      if (seen) { spotted(); return; }
    }
    if (Math.hypot(P.pos.x - towers[0].x, P.pos.z - towers[0].z) < 16) {
      D.sneak = 'done'; for (const p of patrols) { scene.remove(p.a.root); scene.remove(p.cone); }
      say(M.sneakDone, () => ctx.play());
    }
  }
  function spotted() {
    D.caught = (D.caught || 0) + 1; sfx.duat(); shake = 0.6;
    say(D.caught === 1 ? M.spotted : M.spottedAgain, () => {
      ctx.fade && ctx.fade(1, 0.3);
      setTimeout(() => { place(P, pathX(SNEAK0), SNEAK0, Math.PI); P.vel.set(0, 0, 0); for (const p of patrols) { p.k = Math.random(); p.pause = 0; } ctx.fade && ctx.fade(0, 0.6); ctx.play(); }, 350);
    });
  }
  /* ---- the Duskareth keep ---- */
  let guards = [], master = null, malsti = null, bigSn = null;
  function startKeep() {
    // guards in the courtyard, a watcher up the south-west tree
    guards = [];
    for (let i = 0; i < 6; i++) { const f = addFoe('vel', KEEP.x - 14 + (i % 3) * 14, KEEP.z - 8 + Math.floor(i / 3) * 14); f.state = 'idle'; f.idle = true; guards.push(f); }
    D.watcher = buildVel(); scene.add(D.watcher.root);
    const tw = towers[0]; D.watcher.root.position.set(tw.x + 1.2, tw.top, tw.z); D.watcher.root.rotation.y = 0.8;
    cut([
      { dur: 6, from: { p: [KEEP.x - 60, heightAt(KEEP.x, KEEP.z) + 26, KEEP.z + 70], l: [KEEP.x, heightAt(KEEP.x, KEEP.z) + 4, KEEP.z] }, to: { p: [KEEP.x - 50, heightAt(KEEP.x, KEEP.z) + 18, KEEP.z + 60], l: [KEEP.x, heightAt(KEEP.x, KEEP.z) + 4, KEEP.z] }, caption: M.hideout[0][1] },
    ], () => {
      sayHeld(M.hideout.slice(1), over(P, 1), () => {
        objective(M.climbObj, 'E at the foot of the tree');
        setGoal(tw.x, tw.g, tw.z);
        D.climb = addItem(V3(tw.x + 2.4, tw.g + 0.4, tw.z + 1.6), 'Climb the watchtower tree', () => { dropItem(D.climb); climb(); });
        ctx.play();
      });
    });
  }
  function climb() {
    const tw = towers[0];
    cut([{ dur: 3.2, cam: k => ({ p: V3(tw.x + 7, tw.g + 3 + k * 9, tw.z + 7), l: V3(tw.x, tw.g + 2 + k * 11, tw.z) }), onTick: k => { P.pos.set(tw.x + 1.9, tw.g + k * 13, tw.z + 1.4); P.vel.set(0, 0, 0); } }], () => {
      P.pos.set(tw.x - 1.2, tw.top, tw.z + 0.6); P.onGround = true;
      objective(M.watcher, 'E — quietly');
      D.ko = addItem(V3(tw.x + 1.2, tw.top, tw.z), 'Knock out the watcher', () => {
        dropItem(D.ko); sfx.heavy();
        D.watcher.root.rotation.z = Math.PI / 2; D.watcher.root.position.y -= 0.6;
        keepGlows.forEach(g => { if (g.material) g.material.emissiveIntensity !== undefined ? (g.material.emissiveIntensity = 2) : (g.material.opacity = 1); });
        sayHeld(M.noticed, (k, tt) => ({ p: V3(tw.x - 4, tw.top + 3, tw.z + 4), l: V3(KEEP.x, heightAt(KEEP.x, KEEP.z) + 2, KEEP.z) }), () => fumble());
      });
      ctx.play();
    });
  }
  function fumble() {
    const tw = towers[0], from = P.pos.clone(), to = V3(KEEP.x - KEEP.h + 6, 0, KEEP.z + KEEP.h - 6); to.y = ground(to.x, to.z);
    sfx.hit();
    cut([{ dur: 2.2, cam: k => ({ p: V3(to.x + 9, to.y + 5, to.z + 9), l: V3(P.pos.x, P.pos.y + 1, P.pos.z) }), caption: M.fumble[0][1], onTick: k => { const e = k * k; P.pos.set(lerp(from.x, to.x, k), lerp(from.y, to.y, e), lerp(from.z, to.z, k)); } }], () => {
      place(P, to.x, to.z, -Math.PI * 0.75); P.hp = 100; ctx.hp(1); sfx.land(); shake = 0.8;
      sub = 'fight';
      guards.forEach(f => { f.idle = false; f.state = 'chase'; });
      objective(M.fightObj, '');
      ctx.play();
    });
  }
  function knockedDown() {
    if (P.down) return;
    P.down = true; P.hp = 12; ctx.hp(0.12); sub = 'down';
    let i = 0; const bk = setInterval(() => { if (i < M.fightBarks.length && sub === 'down') ctx.bark('tanoc15', M.fightBarks[i++], 1.4); else clearInterval(bk); }, 700);
    guards.forEach(f => { f.state = 'recover'; f.timer = 99; });
    setTimeout(() => {
      sayHeld(M.down, (k, tt) => ({ p: V3(P.pos.x + 2.4, P.pos.y + 1.0, P.pos.z + 2.4), l: V3(P.pos.x, P.pos.y + 0.6, P.pos.z) }), () => emerge());
    }, 2200);
  }
  function emerge() {
    sub = 'emerge'; sfx.core(); sfx.roar(); shake = 1.4;
    bigSn = buildSniller(4.2); bigSn.position.set(P.pos.x, P.pos.y + 1, P.pos.z); scene.add(bigSn); bigSn.userData.setVis(0.1);
    const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.6, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x6af0e0, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(tether); D.tether = tether;
    const c = V3(KEEP.x, heightAt(KEEP.x, KEEP.z), KEEP.z);
    cut([
      { dur: 6, cam: k => ({ p: V3(P.pos.x + 10 - k * 3, P.pos.y + 2 + k * 10, P.pos.z + 12), l: V3(P.pos.x, P.pos.y + 4 + k * 12, P.pos.z) }), caption: M.emerge[0][1], onTick: k => { bigSn.userData.setVis(Math.min(1, 0.1 + k * 1.2)); bigSn.scale.setScalar(0.5 + k * 3.2); } },
      { dur: 7, cam: (k, tt) => ({ p: V3(c.x + Math.cos(tt * 0.3) * 30, c.y + 14, c.z + Math.sin(tt * 0.3) * 30), l: V3(c.x, c.y + 3, c.z) }), caption: M.rout[0][1],
        onTick: k => {
          const n = Math.floor(k * guards.length * 1.1);
          guards.forEach((f, i) => { if (i < n && !f.out) { f.out = 0.001; f.flash = 1; sfx.blink(); particles.burst(f.pos.x, f.pos.y + 1.2, f.pos.z, 30, { color: 0x6af0e0, speed: 8, size: 0.6, life: 0.8 }); } });
          const g = guards[Math.min(guards.length - 1, n)]; if (g) bigSn.position.lerp(V3(g.pos.x, g.pos.y + 6, g.pos.z), 0.08);
        } },
      { dur: 5, cam: k => ({ p: V3(P.pos.x + 4, P.pos.y + 2, P.pos.z + 5), l: V3(P.pos.x, P.pos.y + 1.2, P.pos.z) }), caption: M.rout[1][1],
        onTick: k => { bigSn.position.lerp(V3(P.pos.x, P.pos.y + 7, P.pos.z), 0.06); P.hp = lerp(12, 100, k); ctx.hp(P.hp / 100); if (Math.random() < 0.6) particles.emit(P.pos.x + (Math.random() - 0.5), P.pos.y + 1 + Math.random(), P.pos.z + (Math.random() - 0.5), { vx: 0, vy: 1.5, vz: 0, color: 0x9affe8, size: 0.4, life: 1, drag: 1 }); } },
    ], () => {
      P.down = false; P.hp = 100;
      say([M.rout[2]], () => {
        sub = 'search'; objective(M.searchObj, 'E at the church door'); setGoal(CHURCH.x, heightAt(CHURCH.x, CHURCH.z), CHURCH.z + 5);
        D.door = addItem(V3(CHURCH.x, ground(CHURCH.x, CHURCH.z + 5.4) + 0.3, CHURCH.z + 5.4), 'Go into the little church', () => { dropItem(D.door); church(); });
        ctx.play();
      });
    });
  }
  function church() {
    setGoal(); sub = 'master';
    const cg = heightAt(CHURCH.x, CHURCH.z), inPos = V3(CHURCH.x, cg, CHURCH.z + 1.5);
    place(P, CHURCH.x, CHURCH.z + 2.6, Math.PI);
    if (!D.churchLight) { D.churchLight = new THREE.PointLight(0xc8a0ff, 30, 14); D.churchLight.position.set(CHURCH.x, cg + 4, CHURCH.z + 1); scene.add(D.churchLight); }
    master = buildVel(); master.root.scale.setScalar(1.08); master.root.position.set(CHURCH.x, cg, CHURCH.z - 1.6); scene.add(master.root);
    const ring = new THREE.Group(); ring.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 16), toon(0xd8b860, { emissive: 0xffd27a, emissiveIntensity: 0.6 })), glowSprite(0xffd27a, 0.9, 0.7)); D.ring = ring;
    master.root.add(ring); ring.position.set(0.32, 1.0, 0.25);
    bigSn.position.set(CHURCH.x, cg + 8, CHURCH.z + 6); bigSn.scale.setScalar(2.2);
    const cam = (k, tt) => ({ p: V3(CHURCH.x + 2.6, cg + 2.2, CHURCH.z + 3.6), l: V3(CHURCH.x, cg + 1.3, CHURCH.z - 1) });
    held(cam);
    let i = 0;
    const next = () => {
      if (i >= M.master.length) return transform();
      const line = M.master[i++];
      if (i === 3) { sfx.swing(); particles.burst(CHURCH.x, cg + 1.3, CHURCH.z - 0.6, 30, { color: 0x6af0e0, speed: 6, size: 0.4, life: 0.6 }); }
      if (i === 4) { sfx.duat(); particles.burst(CHURCH.x - 1.6, cg + 1.4, CHURCH.z - 1.4, 50, { color: 0x9a4aff, speed: 6, size: 0.6, life: 0.9 }); }
      ctx.say([line], next);
    };
    next();
  }
  function transform() {
    cine.stop(); sfx.core(); shake = 0.8;
    const p = master.root.position.clone();
    particles.burst(p.x, p.y + 1, p.z, 80, { color: 0x9a4aff, speed: 6, size: 0.6, life: 1.2, gravity: 2 });
    master.root.visible = false;
    malsti = buildMalstiPunk({ seed: 61 }); malsti.root.scale.setScalar(5.5); malsti.root.position.copy(p); scene.add(malsti.root);
    malsti.root.add(D.ring); D.ring.position.set(0, 0.11, 0); D.ring.scale.setScalar(1 / 5.5 * 2.2);
    sub = 'ring'; objective(M.ringObj, 'E');
    D.take = addItem(V3(p.x, p.y + 0.4, p.z + 0.4), 'Take the ring', () => {
      dropItem(D.take);
      const cam = (k, tt) => ({ p: V3(p.x + 3, p.y + 2.4, p.z + 4), l: V3(p.x, p.y + 0.8, p.z) });
      sayHeld(M.cantTouch, cam, () => {
        D.ring.parent && D.ring.parent.remove(D.ring);
        tanoc.root.add(D.ring); D.ring.scale.setScalar(1); D.ring.position.set(0.28, 0.95, 0.2);
        sfx.victory(); bigSn.userData.setVis(1); particles.ring(p.x, p.y + 1, p.z, 80, 10, { color: 0xfff0c0, size: 0.8, life: 0.9 });
        sayHeld(M.ring, cam, () => request());
      });
    });
    ctx.play();
  }
  function request() {
    ctx.ask('sniller', M.askText, [
      { label: M.askOpts[0], act: () => cleanse() },
      { label: M.askOpts[1], act: () => ctx.say(M.thinking, () => request()) },
    ]);
  }
  function cleanse() {
    sub = 'cleansed'; sfx.heal(); sfx.core(); setLook('day'); eclipseK = Math.min(eclipseK, 0.5);
    // the purple goes out of every stone: moss, leaves, the smell of rain
    keepMats.trim.color.setHex(0x5a7a3a); keepMats.trim.emissive.setHex(0x8affb0); keepMats.trim.emissiveIntensity = 0.5;
    keepMats.wall.color.setHex(0x8a8a78); keepMats.leaf.color.setHex(0x4a8a3a); keepMats.roof.color.setHex(0x5a4a3a);
    keepGlows.forEach(g => { if (g.isSprite) g.material.color.setHex(0x9affb0); });
    guards.forEach(f => { f.a.root.visible = false; f.dead = true; });
    const c = V3(KEEP.x, heightAt(KEEP.x, KEEP.z), KEEP.z);
    for (let k = 0; k < 140; k++) { const x = c.x + (rng() - 0.5) * KEEP.h * 2, z = c.z + (rng() - 0.5) * KEEP.h * 2; put(ferns, x, heightAt(x, z) + 0.3, z, 0.6, 0.5, 0.6, 0, rng() * 6, 0, pick(['#4a8a3a', '#6aa848', '#e8d070', '#c890ff'])); }
    ferns.instanceMatrix.needsUpdate = true; ferns.instanceColor.needsUpdate = true;
    cut([{ dur: 7, cam: (k, tt) => ({ p: V3(c.x + Math.cos(0.6 + k * 1.6) * 46, c.y + 22 - k * 6, c.z + Math.sin(0.6 + k * 1.6) * 46), l: V3(c.x, c.y + 3, c.z) }), caption: M.cleanse[0][1],
      onTick: k => { bigSn.position.lerp(V3(c.x, c.y + 20 + k * 30, c.z), 0.05); bigSn.userData.setVis(1 - k * 0.7); if (Math.random() < 0.8) particles.emit(c.x + (Math.random() - 0.5) * 60, c.y + Math.random() * 10, c.z + (Math.random() - 0.5) * 60, { vx: 0, vy: 2, vz: 0, color: Math.random() < 0.5 ? 0x9affb0 : 0xfff0c0, size: 0.5, life: 1.4, drag: 1 }); } }], () => {
      setLook('day');
      say(M.cleanse.slice(1), () => {
        ctx.ring && ctx.ring(); ctx.toast(M.ringGot, 4);
        scene.remove(bigSn); bigSn = null; scene.remove(D.tether);
        ctx.askName('NAME YOUR MALSTI PUNK', 'Mott', name => { ctx.malstiName(name); STORY.SPEAKERS.malsti.name = name; churchNight(); });
      });
    });
  }
  function churchNight() {
    setLook('night');
    const cg = heightAt(CHURCH.x, CHURCH.z);
    place(P, CHURCH.x + 1, CHURCH.z + 1, Math.PI);
    sayHeld(M.churchNight, (k, tt) => ({ p: V3(CHURCH.x + 3.2, cg + 2.6 + Math.sin(tt * 0.2) * 0.2, CHURCH.z + 4), l: V3(CHURCH.x, cg + 1, CHURCH.z) }), () => {
      ctx.fade && ctx.fade(1, 1);
      setTimeout(() => startWayHome(), 1100);
    });
  }
  /* ---- day three: out of the keep, back past the line, to the Punk who waited ---- */
  function startWayHome(resume) {
    stage = 'way'; sub = 'line'; ctx.save('way'); setLook('day', true); eclipseK = 0;
    K.on = false; P.ride = false;
    if (!malsti) { malsti = buildMalstiPunk({ seed: 61 }); malsti.root.scale.setScalar(5.5); scene.add(malsti.root); }
    place(P, KEEP.x - 8, KEEP.z + KEEP.h + 10, 0);
    if (malsti) malsti.root.position.copy(P.pos);
    if (!rodak.length) rodakPack(6, pathX(LINE_Z), LINE_Z + 4);
    rodak.forEach((r, i) => { r.a.root.visible = true; r.mode = 'sit'; r.home = V3(pathX(LINE_Z) + (i - 2.5) * 4.5, 0, LINE_Z + 2.5); r.pos.copy(r.home); r.pos.y = ground(r.pos.x, r.pos.z); });
    ctx.fade && ctx.fade(0, 1.2);
    const go = () => say(M.home1, () => { objective(M.homeObj, 'South — back the way you came'); setGoal(pathX(LINE_Z), heightAt(pathX(LINE_Z), LINE_Z), LINE_Z); ctx.play(); });
    if (resume) go();
    else cut([{ dur: 6, from: { p: [KEEP.x + 40, heightAt(KEEP.x, KEEP.z) + 30, KEEP.z + 60], l: [KEEP.x, heightAt(KEEP.x, KEEP.z), KEEP.z] }, to: { p: [KEEP.x + 20, heightAt(KEEP.x, KEEP.z) + 12, KEEP.z + 70], l: [KEEP.x - 8, heightAt(KEEP.x, KEEP.z) + 2, KEEP.z + KEEP.h + 10] }, caption: M.morning3 }], go);
  }
  function wayTick() {
    if (sub === 'line' && P.pos.z > LINE_Z - 10) {
      sub = 'clearing';
      sayHeld(M.lineBack, (k, tt) => ({ p: V3(P.pos.x - 4, P.pos.y + 2.2, P.pos.z - 7), l: V3(pathX(LINE_Z), heightAt(pathX(LINE_Z), LINE_Z) + 1, LINE_Z + 2) }), () => {
        rodak.forEach(r => { r.mode = 'watch'; });
        setGoal(FIRE1.x, fires[0].y, FIRE1.z); ctx.play();
      });
    }
    if (sub === 'clearing' && Math.hypot(P.pos.x - FIRE1.x, P.pos.z - FIRE1.z) < 22) {
      sub = 'reunion'; setGoal();
      K.on = true; place(K, FIRE1.x + 1.4, FIRE1.z + 1.6, Math.PI); K.stay = K.pos.clone();
      const from = K.pos.clone();
      cut([{ dur: 3, cam: k => ({ p: V3(FIRE1.x + 8, fires[0].y + 3, FIRE1.z + 10), l: V3(K.pos.x, K.pos.y + 1, K.pos.z) }), caption: M.reunion[0][1] },
        { dur: 2.4, cam: k => ({ p: V3(P.pos.x + 5, P.pos.y + 2.5, P.pos.z + 5), l: V3(P.pos.x, P.pos.y + 1, P.pos.z) }), caption: M.reunion[1][1], onTick: k => { K.stay = null; K.pos.lerpVectors(from, P.pos, smooth(0, 1, k)); K.pos.y = ground(K.pos.x, K.pos.z); } }], () => {
        say(M.reunion.slice(2), () => {
          stage = 'downhill'; sub = 'ride'; ctx.save('downhill'); setLook('dusk');
          D.said3 = 0;
          objective(M.rideHomeObj, 'E to climb up on her'); setGoal(pathX(-40), heightAt(pathX(-40), -40), -40); ctx.play();
        });
      });
    }
  }
  function downhillTick() {
    const marks = [-480, -320, -160];
    if (D.said3 < marks.length && P.pos.z > marks[D.said3]) { const [w, l] = M.rideHomeBarks[D.said3]; ctx.bark(w, l, 4.5); D.said3++; }
    if (P.pos.z > -40 && !done) {
      stage = 'home'; done = true; ctx.save('home'); setGoal();
      cut([{ dur: 8, from: { p: [P.pos.x + 30, P.pos.y + 20, P.pos.z + 40], l: [P.pos.x, P.pos.y + 1, P.pos.z] }, to: { p: [P.pos.x + 60, P.pos.y + 60, P.pos.z + 120], l: [P.pos.x, P.pos.y, P.pos.z - 200] }, caption: M.home }], () => ctx.onDone());
    }
  }

  /* ---------------- per frame ---------------- */
  function update(dt, playing) {
    t += dt;
    updatePlayer(dt, playing && !cine.active);
    updatePunk(dt);
    updateRodak(dt);
    updateFoes(dt, playing && !cine.active);
    updateGynge(dt, playing && !cine.active);
    updateBolts(dt);
    updateCritters(dt);
    if (playing && !cine.active) {
      if (stage === 'ride') rideTick();
      else if (stage === 'enter') enterTick();
      else if (stage === 'alone') aloneTick();
      else if (stage === 'day2') day2Tick(dt);
      else if (stage === 'rocks') rocksTick();
      else if (stage === 'mist') mistTick(dt);
      else if (stage === 'way') wayTick();
      else if (stage === 'downhill') downhillTick();
    }
    if (animal) { animal.root.position.y = heightAt(ANIMAL.x, ANIMAL.z) + 0.6 + Math.sin(t * 1.2) * 0.05; }   // breathing
    // the Relic in the wall: humming, and pulsing when it wakes
    relicPulse = Math.max(0, relicPulse - dt * 0.6);
    relic.rotation.z = Math.sin(t * 0.7) * 0.1; relic.children[2].material.opacity = 0.45 + Math.sin(t * 2.2) * 0.15 + relicPulse * 0.5;
    relic.children[2].scale.setScalar(4 + relicPulse * 6);
    if (relicPulse > 0.2 && Math.random() < 0.5) particles.emit(relic.position.x + (Math.random() - 0.5) * 3, relic.position.y + (Math.random() - 0.5) * 3, relic.position.z + 0.4, { vx: 0, vy: 0.6, vz: 0.4, color: 0xc890ff, size: 0.4, life: 1, drag: 1 });
    // the vast Sniller: storm-light, tethered at the base to the little amulet on his chest
    if (bigSn) {
      bigSn.userData.tick(t, 1);
      if (D.tether) {
        const a = V3(P.pos.x, P.pos.y + 1.25, P.pos.z), b = bigSn.position, L = a.distanceTo(b);
        D.tether.position.copy(a).lerp(b, 0.5); D.tether.scale.set(1, L, 1); D.tether.lookAt(b); D.tether.rotateX(Math.PI / 2);
        D.tether.material.opacity = 0.35 + Math.sin(t * 8) * 0.15;
      }
    }
    amulet.children[1].material.opacity = 0.35 + Math.sin(t * (3 + (D.humK || 0) * 10)) * 0.15 + (bigSn ? 0.4 : 0) + (D.humK || 0);
    if (malsti && sub !== 'ring') {   // at his heels, or up on his shoulder
      const tgt = V3(P.pos.x - Math.sin(P.yaw) * 1.2 + Math.cos(P.yaw) * 0.8, 0, P.pos.z - Math.cos(P.yaw) * 1.2 - Math.sin(P.yaw) * 0.8);
      malsti.root.position.lerp(tgt.setY(groundAt(tgt.x, tgt.z, P.pos.y + 1)), 1 - Math.exp(-6 * dt)); malsti.root.rotation.y = P.yaw;
      malsti.animate(dt, { speed: Math.hypot(P.vel.x, P.vel.z), t });
    } else if (malsti) malsti.animate(dt, { speed: 0, t });
    if (master && master.root.visible) master.animate(dt, { speed: 0, t, onGround: true });
    if (D.watcher && D.watcher.root.rotation.z === 0) D.watcher.animate(dt, { speed: 0, t, onGround: true });
    // the fog: thin in the low valley, thick in the pass, a wall of it among the great trees
    const zz = zoneOf(P.pos.z), fNear = zz === 'foot' ? 220 : zz === 'pass' ? lerp(200, 50, clamp(-P.pos.z / -PASS1, 0, 1)) : zz === 'clear' ? 40 : 10;
    const fFar = zz === 'foot' ? 1500 : zz === 'pass' ? lerp(1400, 320, clamp(-P.pos.z / -PASS1, 0, 1)) : zz === 'clear' ? 420 : (stage === 'keep' && sub === 'cleansed' ? 320 : 170);
    const inMist = stage === 'mist' && D.mist === 'on';
    fog.near = damp(fog.near, inMist ? 3 : fNear, 1.5, dt); fog.far = damp(fog.far, inMist ? 24 + (D.lit || 0) * 30 : fFar, 1.5, dt);
    updateLook(dt);
    // mist sheets drift round wherever he is, once he's up in the mist
    const mistOn = zz !== 'foot';
    for (const m of mists) {
      m.visible = mistOn;
      if (!mistOn) continue;
      const o = m.userData.off; o.x += dt * 1.2; if (o.x > 60) o.x -= 120;
      m.position.set(P.pos.x + o.x, heightAt(P.pos.x + o.x, P.pos.z + o.z) + o.y, P.pos.z + o.z);
      if (Math.abs(m.position.z - P.pos.z) > 60) o.z = -o.z;
    }
    // camps
    for (const c of fires) { c.fire.visible = c.on; c.light.intensity = c.on ? 40 + Math.sin(t * 9) * 6 + Math.sin(t * 23) * 3 : 0; if (c.on && Math.random() < 0.5) particles.emit(c.x + (Math.random() - 0.5) * 0.6, c.y + 0.6, c.z + (Math.random() - 0.5) * 0.6, { vx: 0, vy: 2 + Math.random(), vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: 0.35, life: 0.9, drag: 0.5 }); }
    for (const g of trail) if (g.material.opacity > 0) g.material.opacity = 0.4 + Math.sin(t * 3 + g.position.z) * 0.25;
    if (beacon.visible) beacon.material.opacity = 0.6 + Math.sin(t * 4) * 0.3;
    particles.update(dt);
    if (!cine.update(dt)) updateCamera(dt);
    sky.position.copy(camera.position);
    // Velki: high in the south-east — and in the eclipse, slid across the face of the sun
    if (look === LOOKS.eclipse) eclipseK = Math.min(1, eclipseK + dt * 0.25); else eclipseK = Math.max(0, eclipseK - dt * 0.25);
    const vOff = V3(1700, 900, 2300).lerp(SUN_DIR.clone().multiplyScalar(3000), eclipseK);
    velki.position.copy(camera.position).add(vOff); velkiGlow.position.copy(velki.position);
    sun.position.copy(P.pos).addScaledVector(SUN_DIR, 140); sun.target.position.copy(P.pos);
    if (shake > 0) shake = Math.max(0, shake - dt * 1.5);
    ctx.hp(P.hp / 100);
  }
  const camWant = V3(); let camInit = false, camReach = null;
  function updateCamera(dt) {
    camWant.set(P.pos.x, P.pos.y + (P.ride ? 2.4 : 1.5), P.pos.z);
    // follow quickly across the ground, more gently up and down (steps, stairs, landings), and snap back if far behind
    if (!camInit || camTgt.distanceTo(camWant) > 8) { camTgt.copy(camWant); camInit = true; }
    else { const kxz = 1 - Math.exp(-16 * dt), ky = 1 - Math.exp(-9 * dt); camTgt.x += (camWant.x - camTgt.x) * kxz; camTgt.z += (camWant.z - camTgt.z) * kxz; camTgt.y += (camWant.y - camTgt.y) * ky; }
    const want = P.ride ? 8.5 : (GYN && GYN.alive ? 9 : 6.4), cp = Math.cos(CAM.pitch), dir = V3(Math.sin(CAM.yaw) * cp, Math.sin(CAM.pitch), Math.cos(CAM.yaw) * cp);
    let d = want;
    for (let s = 0.6; s <= want; s += 0.3) { const q = camTgt.clone().addScaledVector(dir, s); if (solidAt(q.x, q.y, q.z) || (GYN && GYN.alive && q.distanceTo(GYN.pos.clone().setY(GYN.pos.y + 0.45 * GYN.s)) < 0.95 * GYN.s)) { d = Math.max(0.8, s - 0.4); break; } }
    camReach = Math.min(d, damp(camReach ?? d, d, 3.2, dt)); d = camReach;   // pull in at once, ease back out
    camPos.lerp(camTgt.clone().addScaledVector(dir, d), 1 - Math.exp(-14 * dt));
    camera.position.copy(camPos);
    if (shake > 0) { const T = t * 31; camera.position.x += Math.sin(T * 1.13) * shake * 0.5; camera.position.y += Math.sin(T * 1.71 + 1) * shake * 0.5; }
    camera.lookAt(camTgt);
  }

  const RIDE_STAGES = ['ride', 'rocks', 'mist', 'clearing', 'downhill'];
  function interact() {
    let best = null, bd = 1e9;
    for (const it of items) { const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z); if (d < 3 && Math.abs(it.pos.y - P.pos.y) < 3.5 && d < bd) { bd = d; best = it; } }
    if (best) { sfx.ui(); best.act(); return; }
    if (!P.ride && K.on && K.pos.distanceTo(P.pos) < 3 && !K.stay && RIDE_STAGES.includes(stage)) { P.ride = true; sfx.jump(); return; }
    if (P.ride && RIDE_STAGES.includes(stage) && P.onGround) { P.ride = false; P.pos.addScaledVector(V3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)), 1.8); sfx.land(); return; }
    if (K.stay && K.pos.distanceTo(P.pos) < 3) ctx.bark('punk', '…', 1.5);
  }
  function prompt() {
    for (const it of items) { const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z); if (d < 3 && Math.abs(it.pos.y - P.pos.y) < 3.5) return it.label; }
    if (!P.ride && K.on && !K.stay && K.pos.distanceTo(P.pos) < 3 && RIDE_STAGES.includes(stage)) return 'Climb up on your Punk';
    if (P.ride && RIDE_STAGES.includes(stage)) return null;
    return null;
  }

  /* resume at a checkpoint (a reload mid-chapter starts you at the last one) */
  function start(at) {
    if (ctx.slotsHud) ctx.slotsHud(true);
    D = {};
    const toClearing = () => { place(P, pathX(PASS1 - 30), PASS1 - 30, Math.PI); rodakPack(6, pathX(EDGE_Z) + 6, EDGE_Z + 2); };
    const rideFrom = z => { stage = 'ride'; sub = 'ride'; setLook('day', true); P.ride = true; K.on = true; place(P, pathX(z), z, Math.PI); D = { said: 2 }; objective('Ride north up the river pass', 'Shift to gallop — follow the river'); setGoal(CLEAR.x, heightAt(CLEAR.x, CLEAR.z), CLEAR.z); ctx.play(); };
    const rocksDone = () => { for (const r of rockfall) { r.done = true; r.s.off = true; r.m.visible = false; if (r.crack) scene.remove(r.crack); } };
    const mistDone = () => { for (const c of cairns) { c.lit = true; c.glow.material.opacity = 0.85; } };
    if (at === 'rocks') { rideFrom(ROCK_Z + 50); return; }
    if (at === 'mist') { rocksDone(); rideFrom(MIST_Z0 + 30); D.rocks = 'done'; return; }
    if (at === 'clearing' || at === 'enter' || at === 'alone' || at === 'ruins' || at === 'gynge' || at === 'harvest' || at === 'day2' || at === 'keep' || at === 'sneak' || at === 'way' || at === 'downhill') { rocksDone(); mistDone(); }
    if (at === 'clearing') { toClearing(); P.ride = true; arriveClearing(); return; }
    if (at === 'enter') { toClearing(); place(P, FIRE1.x + 2, FIRE1.z, Math.PI); place(K, FIRE1.x, FIRE1.z + 2, Math.PI); morning(); return; }
    if (at === 'alone' || at === 'ruins') { toClearing(); for (const r of rodak) { r.a.root.visible = false; r.pos.set(0, -80, 0); } place(P, FIRE1.x + 3, FIRE1.z - 4, Math.PI); place(K, FIRE1.x + 1, FIRE1.z + 2, Math.PI); K.stay = K.pos.clone(); buildAnimal(); stage = 'alone'; sub = 'animal'; setLook('grey', true); objective(M.aloneObj); setGoal(ANIMAL.x, heightAt(ANIMAL.x, ANIMAL.z), ANIMAL.z); ctx.play(); return; }
    if (at === 'gynge') { K.on = false; setLook('grey', true); place(P, WALL.x + 2, WALL.z + 26, Math.PI); stage = 'alone'; sub = 'gather'; D.saw = true; D.seals = 3; D.got = 3; sealStones.forEach(st => { st.read = true; }); ctx.play(); return; }
    if (at === 'harvest') { K.on = false; setLook('grey', true); spawnGynge(); GYN.alive = false; GYN.pos.y = heightAt(GY.x, GY.z); gyngeBar.style.display = 'none'; place(P, GY.x + 6, GY.z + 8, Math.PI); harvest(); ctx.play(); return; }
    if (at === 'day2') { K.on = false; spawnGynge(); GYN.alive = false; GYN.pos.y = heightAt(GY.x, GY.z); gyngeBar.style.display = 'none'; amped = true; startDay2(); return; }
    if (at === 'sneak') { K.on = false; amped = true; spawnGynge(); GYN.alive = false; GYN.pos.y = heightAt(GY.x, GY.z); gyngeBar.style.display = 'none'; setLook('eclipse', true); eclipseK = 1; stage = 'day2'; sub = 'walk'; D = { waves: 2, sru: true, sruDone: true, eclipse: true }; startSneak(); return; }
    if (at === 'keep') { K.on = false; amped = true; setLook('eclipse', true); place(P, KEEP.x - 20, KEEP.z + KEEP.h + 36, Math.PI); stage = 'keep'; sub = 'climb'; D.eclipse = true; D.sneak = 'done'; startKeep(); return; }
    if (at === 'way') { amped = true; spawnGynge(); GYN.alive = false; GYN.pos.y = heightAt(GY.x, GY.z); gyngeBar.style.display = 'none'; startWayHome(true); return; }
    if (at === 'downhill') {
      amped = true; stage = 'downhill'; sub = 'ride'; setLook('dusk', true);
      if (!malsti) { malsti = buildMalstiPunk({ seed: 61 }); malsti.root.scale.setScalar(5.5); scene.add(malsti.root); }
      K.on = true; K.stay = null; place(P, FIRE1.x + 4, FIRE1.z + 6, 0); place(K, FIRE1.x + 2, FIRE1.z + 8, 0); malsti.root.position.copy(P.pos);
      D.said3 = 0; objective(M.rideHomeObj, 'E to climb up on her'); setGoal(pathX(-40), heightAt(pathX(-40), -40), -40); ctx.play(); return;
    }
    if (at === 'home') { done = true; ctx.onDone(); return; }
    startRide();
  }
  // the animal is there from the start; it's only noticed when he comes on it
  buildAnimal(); trail.forEach(g => { g.material.opacity = 0; });

  function dispose() {
    gyngeBar.remove();
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
    composer.dispose && composer.dispose();
  }
  return {
    start, update, render: () => composer.render(), interact, prompt, jump, attack, resize, dispose, useSlot, skip: () => cine.skip(), vine: vineButton,
    get cinematic() { return cine.active; }, get stage() { return stage; }, get sub() { return sub; }, get done() { return done; }, P, foes, items,
    debug: { get GYN() { return GYN; }, vines, get vineN() { return vineN; }, tanoc, punk, get boltCd() { return boltCd; }, get cineOn() { return cine.active; }, rockfall, bolts, cairns, patrols, erupt, gyngeHalf, gyngeDie, harvest, startDay2, startKeep, knockedDown, emerge, church, cleanse, arriveClearing, thud, get D() { return D; } },
  };
}
