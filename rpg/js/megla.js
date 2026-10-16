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

   CHAPTER III — THE LONG WAY runs in the same world (ctx.chapter === 3):
   the keep already cleansed and his, the Gynge a mossy hill in the ruins.
     Ride    up the pass at dusk with the Carpenter on the old barn Punk;
             Vel keeping pace along the ridges
     Night   the firepit, the Right of Holding — and the Vel step out of
             the air: a fight beside Buhkon (they blink, they throw knives;
             beaten, they leave through the Duat)
     Morning into the trees together; the Rodak's line; the ruins, and the
             Akai Gek linked to the ring (hold E) — fire-stones burn twice
             as hot from now on; another test in the trees
     The keep  who he lets in; at dusk a ring of Vel, and Nekhra, a Thar
             Norvek, names him at his own door: the DUEL —
               her scream rolls out in a ring (jump it), she steps into the
               Duat and out under you (get off the mark), she is winded
               after a scream (hit her); past half, Duat knives ring him
             Held. A night in the little church, and home.
   ============================================================ */
import * as THREE from 'three';
import { toon, addOutline, outlineAll, glowSprite, mistSprite, Particles } from './gfx.js';
import { buildEikar } from './actors.js';
import { NPC_LOOKS } from './npcs.js';
import { buildDomesticPunk, buildWildPunk, buildRodak, buildGynge, buildMalstiPunk, buildSruVorn } from './esik_land.js';
import { buildVel } from './creatures.js';
import { buildLutut } from './esik_sky.js';
import { buildSniller } from './skyfolk.js';
import { createCine } from './cine.js';
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
const ARENA = { x: KEEP.x, z: KEEP.z + KEEP.h + 22, r: 21 };   // Chapter III: the moss before the gate, where the Right is fought
const zoneOf = z => (z > PASS0 ? 'foot' : z > PASS1 ? 'pass' : z > EDGE_Z ? 'clear' : 'forest');
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
  const CH3 = ctx.chapter === 3, L3 = STORY.LONGWAY;
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
  const clearOfWorks = (x, z, pad) => (CH3 && Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r + 8 + pad) || Math.hypot(x - RUINS.x, z - RUINS.z) < RUINS.r + pad || (Math.abs(x - KEEP.x) < KEEP.h + 14 + pad && Math.abs(z - KEEP.z) < KEEP.h + 14 + pad) || Math.hypot(x - FIRE1.x, z - FIRE1.z) < 14 + pad;
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
    if (rng() < 0.08) put(glowK, x, g + 0.2, z, 0.14, 0.14, 0.14, 0, 0, 0, pick(['#5af0ff', '#8affb0', '#b48aff']));
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
    // in Chapter III the gate stands open: the south wall is two lengths with the gateway between
    const GW = 3.4, halfS = (h - GW) / 2;
    const walls = CH3 ? [[x, z - h, h, 0.9], [x - GW - halfS, z + h, halfS, 0.9], [x + GW + halfS, z + h, halfS, 0.9], [x - h, z, 0.9, h], [x + h, z, 0.9, h]]
      : [[x, z - h, h, 0.9], [x, z + h, h, 0.9], [x - h, z, 0.9, h], [x + h, z, 0.9, h]];
    for (const [wx, wz, hw, hd] of walls) {
      mk(new THREE.BoxGeometry(hw * 2, H, hd * 2), keepMats.wall, wx, g + H / 2, wz);
      // a band of void-purple along the top: the Duskareth's own marks
      const band = mk(new THREE.BoxGeometry(hw * 2 + 0.1, 0.3, hd * 2 + 0.1), keepMats.trim, wx, g + H - 0.6, wz); keepGlows.push(band);
      box(wx, wz, hw, hd, g - 1, g + H);
      for (let k = -hw + 1.5; k < hw; k += 3) mk(new THREE.BoxGeometry(hd > 1 ? 1.8 : 1.2, 1, hd > 1 ? 1.2 : 1.8), keepMats.wall, wx + (hd > 1 ? 0 : k), g + H + 0.5, wz + (hd > 1 ? k : 0));
    }
    // the gate: shut fast — or, once the keep is his, standing open
    if (!CH3) mk(new THREE.BoxGeometry(6, 5.5, 0.5), toon(0x2a1a2a), x, g + 2.75, z + h + 0.95);
    else for (const sx of [-1, 1]) { const leaf = mk(new THREE.BoxGeometry(3.3, 5.5, 0.4), toon(0x4a3a2a), x + sx * (GW + 0.2), g + 2.75, z + h + 2.6); leaf.rotation.y = sx * 1.35; }
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
  const punk = buildWildPunk({ seed: 31, saddle: true, blanket: 0x8a5a2a }); punk.root.scale.setScalar(1.15); scene.add(punk.root);
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
  function objective(text, hint = '', pips = 0, on = 0) { ctx.objective(CH3 ? L3.head : 'Chapter II · the Megla Aagac', text, hint, pips, on); }

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
  function addFoe(kind, x, z) {
    const a = kind === 'vel' || kind === 'vel3' ? buildVel() : buildWildPunk({ seed: Math.floor(rng() * 999) });
    if (kind === 'wildpunk') a.root.scale.multiplyScalar(0.7);
    scene.add(a.root);
    const hp = kind === 'vel' ? 9999 : kind === 'vel3' ? 40 : 34;
    const f = { kind, a, pos: V3(x, ground(x, z), z), vel: V3(), yaw: rng() * TAU, hp, max: hp, state: 'chase', timer: 0, windup: 0, flash: 0, dead: false, cd: 0.5 + rng() * 1.5, out: 0, blinkCd: 3 + rng() * 4, knifeCd: 2 + rng() * 3 };
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
    f.hp -= dmg; sfx.hit(); f.vel.addScaledVector(d, 6); f.stun = 0.35;
    particles.burst(f.pos.x, f.pos.y + 0.8, f.pos.z, 10, { color: 0xffb040, speed: 6, size: 0.3, life: 0.4, gravity: -10 });
    if (f.kind === 'vel3' && f.hp <= 0) {   // beaten, a Vel doesn't die: it leaves, back through the Duat
      f.dead = true; f.deadT = 0; f.state = 'gone'; sfx.duat(); if (f.mark) { scene.remove(f.mark); f.mark = null; }
      particles.burst(f.pos.x, f.pos.y + 1, f.pos.z, 40, { color: 0x9a4aff, speed: 6, size: 0.55, life: 0.9, gravity: 1 });
      if (CH3 && !D.toldFlee) { D.toldFlee = true; ctx.bark(...L3.barks.flee, 2.6); }
      return;
    }
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
      const reach = f.kind === 'wildpunk' ? 1.9 : 2.4, dmg = f.kind === 'vel' ? 11 : f.kind === 'vel3' ? 9 : 7;
      if (playing && !P.down && f.kind === 'vel3' && f.state === 'blink') {   // gone into the Duat: out again on the mark
        f.timer -= dt; f.a.root.visible = false;
        if (f.timer <= 0) {
          f.a.root.visible = true; f.pos.copy(f.to); sfx.duat(); if (f.mark) { scene.remove(f.mark); f.mark = null; }
          particles.burst(f.pos.x, f.pos.y + 1, f.pos.z, 26, { color: 0x9a4aff, speed: 5, size: 0.45, life: 0.6 });
          f.state = 'windup'; f.timer = 0.32; f.cd = 1.2 + rng();
        } else if (f.mark) f.mark.material.opacity = 0.35 + 0.35 * Math.sin(f.timer * 22);
        continue;
      }
      if (playing && !P.down && f.kind === 'vel3' && f.state === 'chase' && !f.stun) {
        f.blinkCd -= dt; f.knifeCd -= dt;
        if (f.blinkCd <= 0 && d > 4) {   // a ring of purple on the ground, and out of it, a moment later, the Vel
          f.blinkCd = 5 + rng() * 4; f.state = 'blink'; f.timer = 0.85; sfx.blink();
          particles.burst(f.pos.x, f.pos.y + 1, f.pos.z, 20, { color: 0x9a4aff, speed: 4, size: 0.4, life: 0.5 });
          const a = rng() * TAU; f.to = V3(P.pos.x + Math.cos(a) * 1.8 + P.vel.x * 0.5, 0, P.pos.z + Math.sin(a) * 1.8 + P.vel.z * 0.5); f.to.y = ground(f.to.x, f.to.z);
          f.mark = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.6, 24), new THREE.MeshBasicMaterial({ color: 0xb070ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
          f.mark.rotation.x = -Math.PI / 2; f.mark.position.set(f.to.x, f.to.y + 0.08, f.to.z); scene.add(f.mark);
          if (!D.toldBlink) { D.toldBlink = true; ctx.bark(...L3.barks.blink, 2.6); }
          continue;
        }
        if (f.knifeCd <= 0 && d > 6 && d < 22) {   // a knife out of the Duat, thrown from far off
          f.knifeCd = 3.5 + rng() * 3;
          throwKnife(V3(f.pos.x, f.pos.y + 1.8, f.pos.z), P.pos.clone().addScaledVector(P.vel, 0.35), 8);
          if (!D.toldKnife) { D.toldKnife = true; ctx.bark(...L3.barks.knife, 2.4); }
        }
      }
      if (playing && !P.down) {
        if (f.state === 'windup') {
          f.timer -= dt; wy = Math.atan2(dx, dz); f.windup = 1 - f.timer / 0.5;
          if (f.timer <= 0) { f.state = 'recover'; f.timer = 0.6; f.windup = 0; f.attackA = 1; f.vel.x += Math.sin(f.yaw) * 7; f.vel.z += Math.cos(f.yaw) * 7; if (d < reach + 0.9 && P.iframes <= 0) hurtTanoc(dmg, f.pos); }
        } else if (f.state === 'recover') { f.timer -= dt; f.attackA = Math.max(0, (f.attackA || 0) - dt * 3); if (f.timer <= 0) f.state = 'chase'; }
        else {
          f.cd -= dt; wy = Math.atan2(dx, dz);
          if (d < 5 && f.cd > 0) { wy += Math.PI / 2 * (f.pos.x > P.pos.x ? 1 : -1); want = 3.5; }
          else want = d > reach ? (f.kind === 'vel' ? 6.5 : 5.4) : 0;
          if (d < reach + 0.4 && f.cd <= 0) { f.state = 'windup'; f.timer = 0.5; f.cd = (f.kind === 'vel' ? 1.0 : 1.5) + rng(); }
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
    else if (CH3 && stage === 'duel') { if (P.hp <= 0) duelDown(); }
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
    for (const f of foes) { if (f.dead || f.out || f.state === 'blink') continue; const dx = f.pos.x - P.pos.x, dz = f.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d < bd && (dx * -Math.sin(CAM.yaw) + dz * -Math.cos(CAM.yaw)) / (d || 1) > 0.6) { bd = d; to = V3(f.pos.x, f.pos.y + 0.8, f.pos.z); } }
    if (NK && NK.hp > 0 && NK.state !== 'blinkOut') { const dx = NK.pos.x - P.pos.x, dz = NK.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d < 40 && (dx * -Math.sin(CAM.yaw) + dz * -Math.cos(CAM.yaw)) / (d || 1) > 0.4) to = V3(NK.pos.x, NK.pos.y + 1.4, NK.pos.z); }
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
      if (!hit) hit = b.life <= 0 || solidAt(p.x, p.y, p.z);
      for (const f of foes) { if (hit || f.dead || f.out || f.state === 'blink' || f.pos.distanceTo(p) > 1.6) continue; hitFoe(f, amped ? 30 : 22, P.pos); hit = true; }
      if (!hit && NK && NK.hp > 0 && NK.state !== 'blinkOut' && p.distanceTo(NK.pos.clone().setY(NK.pos.y + 1.3)) < 1.9) { hitNekhra(amped ? 4.5 : 3, p); hit = true; }
      if (hit) { particles.burst(p.x, p.y, p.z, amped ? 30 : 16, { color: 0xff8a2a, speed: amped ? 8 : 5, size: 0.45, life: 0.5 }); scene.remove(b.g); bolts.splice(i, 1); }
    }
  }

  /* ---------------- the GYNGE ---------------- */
  let GYN = null;
  const gyngeBar = (() => {
    const d = document.createElement('div'); d.id = 'gynge-bar';
    d.style.cssText = 'position:fixed;left:40%;top:4.5vh;transform:translateX(-50%);width:min(420px,52vw);z-index:22;display:none;font-family:var(--display,Georgia);letter-spacing:.2em;font-size:12px;color:#e8d8b8;text-align:center;text-shadow:0 1px 4px #000';
    d.innerHTML = 'GYNGE · LIVING ROCK<div style="height:9px;margin-top:6px;border:1px solid #c8a060;border-radius:5px;background:rgba(0,0,0,.45);overflow:hidden"><div id="gynge-fill" style="height:100%;width:100%;background:linear-gradient(90deg,#c87a3a,#ffd27a);transition:width .25s"></div></div>';
    document.body.appendChild(d); return d;
  })();
  function mawPoint() { const f = V3(Math.sin(GYN.yaw), 0, Math.cos(GYN.yaw)); return V3(GYN.pos.x + f.x * 0.9 * GYN.s, GYN.pos.y + (GYN.phase === 1 ? 0.62 : 0.8) * GYN.s, GYN.pos.z + f.z * 0.9 * GYN.s); }
  function spawnGynge() {
    const a = buildGynge({ seed: 77 }); const s = 4.2; a.root.scale.setScalar(s); scene.add(a.root);
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
    P.jumpBuf = 0.15;
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
    P.vel.x = damp(P.vel.x, wx * sp, P.onGround ? (P.ride ? 6 : 14) : 4, dt); P.vel.z = damp(P.vel.z, wz * sp, P.onGround ? (P.ride ? 6 : 14) : 4, dt);
    if (len > 0.08 && P.swing <= 0) P.yaw = dampAngle(P.yaw, Math.atan2(wx, wz), P.ride ? 6 : 12, dt);
    P.jumpBuf -= dt; P.coyote -= dt; P.iframes = Math.max(0, P.iframes - dt);
    if (P.jumpBuf > 0 && (P.onGround || P.coyote > 0) && playing && !P.down) { P.vel.y = P.ride ? 10 : 9.2; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; sfx.jump(); }
    P.vel.y -= 26 * dt;
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
        if (NK && NK.hp > 0 && NK.state !== 'blinkOut') { const dx = NK.pos.x - P.pos.x, dz = NK.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d < 3.1 && (dx * Math.sin(P.yaw) + dz * Math.cos(P.yaw)) / (d || 1) > 0.1) hitNekhra(4, NK.pos.clone().setY(NK.pos.y + 1.2)); }
      }
    }
    const speed = Math.hypot(P.vel.x, P.vel.z);
    if (P.onGround && speed > 1 && !P.ride) { P.stepPh += dt * speed * 0.55; if (P.stepPh > 1) { P.stepPh = 0; sfx.step(); } }
    poseTanoc(dt, speed);
  }
  function poseTanoc(dt, speed) {
    if (P.ride) {   // in the saddle: Brindle-grown Punk under him, vines going
      K.pos.copy(P.pos); K.yaw = P.yaw;
      punk.root.position.copy(P.pos); punk.root.rotation.y = P.yaw; punk.root.visible = true;
      punk.animate(dt, { speed, t, air: P.onGround ? 0 : 1 });
      const seat = V3(0, 1.15 * 1.85 - 0.3, -0.05).applyAxisAngle(V3(0, 1, 0), P.yaw).add(P.pos);
      tanoc.root.position.copy(seat); tanoc.root.rotation.y = P.yaw;
      tanoc.animate(dt, { speed: 0, onGround: true, t, swing: null });
      return;
    }
    tanoc.root.position.copy(P.pos); tanoc.root.rotation.y = P.yaw;
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
    ], () => { ctx.location('The river pass', 'Chapter II · north, into the mist'); objective('Ride north up the river pass', 'Shift to gallop — follow the river'); setGoal(CLEAR.x, heightAt(CLEAR.x, CLEAR.z), CLEAR.z); });
  }
  function rideTick() {
    const prog = clamp(-P.pos.z / -PASS1, 0, 1);
    const marks = [0.15, 0.4, 0.65, 0.85];
    if (D.said < marks.length && prog > marks[D.said]) { const [w, l] = M.rideBarks[D.said]; ctx.bark(w, l, 4.5); D.said++; }
    if (P.pos.z < PASS1 - 20) arriveClearing();
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
        objective(M.campObj, 'Ride to the stones by the old firepit, and press E');
        setGoal(FIRE1.x, fires[0].y, FIRE1.z);
        D.camp = addItem(V3(FIRE1.x, fires[0].y + 0.5, FIRE1.z), 'Make camp for the night', () => { dropItem(D.camp); night1(); });
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
        objective(M.gatherObj(0), 'Things glint among the stones · E to take');
        const spots = [[RUINS.x - 22, RUINS.z + 8, 'Old stygian ore, in a split block', 'ore'], [RUINS.x + 20, RUINS.z - 4, 'A knot of ember-moss', 'ember'], [RUINS.x + 6, RUINS.z + 22, 'A carved bead of black resin', 'resin']];
        for (const [x, z, label, id] of spots) { const it = addItem(V3(x, ground(x, z) + 0.5, z), label, () => { dropItem(it); D.got++; ctx.give(id, 1); objective(M.gatherObj(D.got), 'Things glint among the stones · E to take', 3, D.got); }, glint()); }
        setGoal(WALL.x, heightAt(WALL.x, WALL.z), WALL.z + 4);
        ctx.play();
      });
    }
    if (sub === 'gather' && !D.saw && Math.hypot(P.pos.x - WALL.x, P.pos.z - WALL.z) < 20) {
      D.saw = true;
      sayHeld(M.relicSeen, (k, tt) => ({ p: V3(WALL.x + 5, relic.position.y + 0.5, WALL.z + 9), l: relic.position }), () => ctx.play());
    }
    if (sub === 'gather' && D.saw && Math.hypot(P.pos.x - WALL.x, P.pos.z - WALL.z) < 12 && !cine.active) erupt();
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
  function day2Tick() {
    if (D.waves === 0 && P.pos.z < -930) { D.waves = 1; for (let i = 0; i < 3; i++) addFoe('wildpunk', pathX(-960) + (i - 1) * 6, -965 - i * 2); ctx.bark(...M.day2Barks[1], 3); }
    if (D.waves === 1 && P.pos.z < -1010 && foes.every(f => f.dead || f.kind !== 'wildpunk')) { D.waves = 2; for (let i = 0; i < 4; i++) addFoe('wildpunk', pathX(-1040) + (i - 1.5) * 5, -1040 - i); ctx.bark(...M.day2Barks[0], 3); }
    if (D.waves === 2 && P.pos.z < -1050 && !D.eclipse) {
      D.eclipse = true; setLook('eclipse'); eclipseK = 0.001;
      setTimeout(() => sfx.duat(), 2500); setTimeout(() => sfx.duat(), 5200);
      sayHeld(M.eclipse, (k, tt) => ({ p: V3(P.pos.x - 3, P.pos.y + 1.6, P.pos.z + 4), l: V3(P.pos.x + 30, P.pos.y + 60, P.pos.z - 120) }), () => {
        objective(M.hideoutObj, 'North-east'); setGoal(KEEP.x, heightAt(KEEP.x, KEEP.z), KEEP.z + KEEP.h + 14); ctx.play();
      });
    }
    if (D.eclipse && !D.seen && Math.hypot(P.pos.x - KEEP.x, P.pos.z - KEEP.z) < KEEP.h + 40) {
      D.seen = true; stage = 'keep'; sub = 'climb'; ctx.save('keep');
      startKeep();
    }
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
      stage = 'home'; done = true; ctx.save('home');
      cut([{ dur: 8, from: { p: [KEEP.x + 40, heightAt(KEEP.x, KEEP.z) + 30, KEEP.z + 60], l: [KEEP.x, heightAt(KEEP.x, KEEP.z), KEEP.z] }, to: { p: [KEEP.x + 80, heightAt(KEEP.x, KEEP.z) + 90, KEEP.z + 140], l: [KEEP.x, heightAt(KEEP.x, KEEP.z), KEEP.z] }, caption: M.home }], () => ctx.onDone());
    });
  }

  /* ================================================================
     CHAPTER III — THE LONG WAY
     ================================================================ */
  // the Carpenter: up the pass on the old barn Punk, at Tanoc's shoulder on foot — and a hard man in a fight
  let B = null;
  function makeBuhkon() {
    if (B) return;
    const a = buildEikar(NPC_LOOKS.buhkon); scene.add(a.root);
    const mount = buildWildPunk({ seed: 12, saddle: true, blanket: 0x2a4a7a }); mount.root.scale.setScalar(1.1); scene.add(mount.root);
    B = { a, mount, pos: V3(), yaw: Math.PI, ride: false, stay: null, mountAt: null, cd: 1, swing: 0, on: true };
  }
  function updateBuhkon(dt, playing) {
    if (!B) return;
    const A = B.a;
    if (!B.on) { A.root.visible = false; B.mount.root.visible = false; return; }
    A.root.visible = true;
    B.cd -= dt; B.swing = Math.max(0, B.swing - dt);
    // in a fight he makes for the nearest Vel on its feet
    let foe = null, fd = 30;
    if (!B.ride && playing) for (const f of foes) { if (f.dead || f.out || f.state === 'blink') continue; const d = f.pos.distanceTo(B.pos); if (d < fd) { fd = d; foe = f; } }
    let want = foe ? foe.pos : B.stay;
    if (!want) { const back = V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), right = V3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); want = P.pos.clone().addScaledVector(back, B.ride ? 5 : 2.6).addScaledVector(right, B.ride ? 4 : 2.2); }
    const dx = want.x - B.pos.x, dz = want.z - B.pos.z, d = Math.hypot(dx, dz);
    const stopAt = foe ? 1.9 : 1.0, top = B.ride ? 18 : foe ? 7.5 : 9.5;
    let sp = d > stopAt ? Math.min(top, (d - stopAt) * 2.4 + 1) : 0;
    if (d > 60 && !foe && !B.stay) { B.pos.set(want.x, 0, want.z); sp = 0; }
    else if (sp > 0) { B.pos.x += dx / d * sp * dt; B.pos.z += dz / d * sp * dt; B.yaw = dampAngle(B.yaw, Math.atan2(dx, dz), 8, dt); }
    else B.yaw = dampAngle(B.yaw, foe ? Math.atan2(dx, dz) : Math.atan2(P.pos.x - B.pos.x, P.pos.z - B.pos.z), 4, dt);
    resolve(B.pos, B.ride ? 0.9 : 0.5); B.pos.y = groundAt(B.pos.x, B.pos.z, B.pos.y + 1);
    if (foe && fd < 2.6 && B.cd <= 0) {   // the Carpenter's axe, and the weight behind it
      B.cd = 1.15 + rng() * 0.4; B.swing = 0.42; sfx.heavy();
      hitFoe(foe, 15, B.pos); foe.vel.addScaledVector(V3(foe.pos.x - B.pos.x, 0, foe.pos.z - B.pos.z).normalize(), 8);
      if (!D.toldToss && foe.hp > 0) { D.toldToss = true; ctx.bark(...L3.barks.toss, 2); }
    }
    if (B.ride) {
      B.mount.root.visible = true; B.mount.root.position.copy(B.pos); B.mount.root.rotation.y = B.yaw;
      B.mount.animate(dt, { speed: sp, t });
      const seat = V3(0, 1.1 * 1.85 - 0.3, -0.05).applyAxisAngle(V3(0, 1, 0), B.yaw).add(B.pos);
      A.root.position.copy(seat); A.root.rotation.y = B.yaw; A.animate(dt, { speed: 0, onGround: true, t, swing: null });
      return;
    }
    if (B.mountAt) { B.mount.root.visible = true; B.mount.root.position.copy(B.mountAt); B.mount.animate(dt, { speed: 0, t }); } else B.mount.root.visible = false;
    A.root.position.copy(B.pos); A.root.rotation.y = B.yaw;
    A.animate(dt, { speed: sp, onGround: true, t, swing: B.swing > 0 ? { kind: 1, p: 1 - B.swing / 0.42 } : null });
  }
  // Duat knives: thrown out of thin air, from far off
  const darts = [];
  function throwKnife(from, to, dmg) {
    const g = new THREE.Group(), m = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xd8a8ff }));
    m.rotation.x = Math.PI / 2; g.add(m, glowSprite(0x9a4aff, 1.2, 0.8)); g.position.copy(from); scene.add(g);
    const v = to.clone().setY(to.y + 1).sub(from), tt = Math.max(0.45, v.length() / 20); v.divideScalar(tt);
    darts.push({ g, vel: v, life: tt + 0.6, dmg }); sfx.swing();
  }
  function updateDarts(dt) {
    for (let i = darts.length - 1; i >= 0; i--) {
      const k = darts[i], p = k.g.position; k.life -= dt; p.addScaledVector(k.vel, dt); k.g.lookAt(p.clone().add(k.vel));
      let hit = k.life <= 0 || p.y < heightAt(p.x, p.z);
      if (!hit && P.iframes <= 0 && !P.down && Math.hypot(p.x - P.pos.x, p.z - P.pos.z) < 0.8 && p.y > P.pos.y && p.y < P.pos.y + 2.2) { hurtTanoc(k.dmg, p); hit = true; }
      if (hit) { particles.burst(p.x, p.y, p.z, 8, { color: 0xb070ff, speed: 3, size: 0.3, life: 0.3 }); scene.remove(k.g); darts.splice(i, 1); }
    }
  }
  const velOut = (f, quiet) => { if (!quiet) { sfx.duat(); particles.burst(f.pos.x, f.pos.y + 1, f.pos.z, 26, { color: 0x9a4aff, speed: 5, size: 0.45, life: 0.6 }); } };
  function velWave(n, cx, cz, r) {
    for (let i = 0; i < n; i++) { const a = i / n * TAU + rng() * 0.4, f = addFoe('vel3', cx + Math.cos(a) * r, cz + Math.sin(a) * r); f.yaw = Math.atan2(P.pos.x - f.pos.x, P.pos.z - f.pos.z); f.cd = 1 + rng() * 1.5; velOut(f); }
  }
  const velsLeft = () => foes.filter(f => f.kind === 'vel3' && !f.dead).length;
  // the keep is already his: moss and leaves and the smell of rain, the gate open
  function keepIsHis() {
    keepMats.trim.color.setHex(0x5a7a3a); keepMats.trim.emissive.setHex(0x8affb0); keepMats.trim.emissiveIntensity = 0.5;
    keepMats.wall.color.setHex(0x8a8a78); keepMats.leaf.color.setHex(0x4a8a3a); keepMats.roof.color.setHex(0x5a4a3a);
    keepGlows.forEach(g => { if (g.isSprite) g.material.color.setHex(0x9affb0); });
    for (let k = 0; k < 140; k++) { const x = KEEP.x + (rng() - 0.5) * KEEP.h * 2, z = KEEP.z + (rng() - 0.5) * KEEP.h * 2; put(ferns, x, heightAt(x, z) + 0.3, z, 0.6, 0.5, 0.6, 0, rng() * 6, 0, pick(['#4a8a3a', '#6aa848', '#e8d070', '#c890ff'])); }
    ferns.instanceMatrix.needsUpdate = true; ferns.instanceColor.needsUpdate = true;
  }
  // the Gynge: a hill of grey rock in the hollow, furred green already
  function gyngeHill() {
    spawnGynge(); GYN.alive = false; GYN.pos.y = heightAt(GY.x, GY.z) - 0.5; gyngeBar.style.display = 'none';
    GYN.a.root.traverse(o => { if (o.material && o.material.color) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color(0x5a7a4a), 0.45); } });
    const g = heightAt(GY.x, GY.z); cyl(GY.x, GY.z, 0.75 * GYN.s, g - 1, g + 2.6); indexSolids();
  }
  function makeMalsti() {
    if (malsti) return;
    malsti = buildMalstiPunk({ seed: 61 }); malsti.root.scale.setScalar(5.5); malsti.root.position.copy(P.pos); scene.add(malsti.root);
  }
  const PN = () => STORY.SPEAKERS.punk.name, MN = () => STORY.SPEAKERS.malsti.name;
  // Vel along the ridge, keeping pace: left side, high up, never closer
  const ridge = [];
  function ridgeWatchers() {
    for (let i = 0; i < 4; i++) { const a = buildVel(); a.glow && a.glow(1); scene.add(a.root); ridge.push({ a, lead: 26 + i * 11, side: -(36 + (i % 2) * 8) }); }
  }
  function updateRidge(dt) {
    for (const r of ridge) {
      const z = P.pos.z - r.lead, x = pathX(z) + r.side, g = heightAt(x, z);
      r.a.root.position.set(x, g, z); r.a.root.rotation.y = Math.atan2(P.pos.x - x, P.pos.z - z);
      r.a.animate(dt, { speed: Math.hypot(P.vel.x, P.vel.z) > 2 ? 6 : 0, t, onGround: true });
    }
  }
  function ridgeGone() { for (const r of ridge) { particles.burst(r.a.root.position.x, r.a.root.position.y + 1, r.a.root.position.z, 20, { color: 0x9a4aff, speed: 4, size: 0.5, life: 0.6 }); scene.remove(r.a.root); } ridge.length = 0; }
  // the ring of Vel that watch the Right being fought; they never lift a hand
  const watchers = [];
  function ringOfVel() {
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + 0.13, x = ARENA.x + Math.cos(a) * (ARENA.r + 3), z = ARENA.z + Math.sin(a) * (ARENA.r + 3);
      if (z < KEEP.z + KEEP.h + 3) continue;   // not inside the walls; the keep won't have them
      const v = buildVel(); v.glow && v.glow(1); scene.add(v.root); v.root.position.set(x, ground(x, z), z); v.root.rotation.y = Math.atan2(ARENA.x - x, ARENA.z - z);
      particles.burst(x, v.root.position.y + 1, z, 16, { color: 0x9a4aff, speed: 4, size: 0.45, life: 0.6 });
      watchers.push(v);
    }
    sfx.duat();
  }
  function updateWatchers(dt) { for (const v of watchers) v.animate(dt, { speed: 0, t, onGround: true }); }

  /* ---- the ride: up the pass at the day's end, the Carpenter at his side ---- */
  function startRide3() {
    stage = 'ride'; sub = 'ride'; ctx.save('ride'); setLook('day', true);
    P.ride = true; place(P, pathX(-6), -6, Math.PI); K.on = true;
    B.ride = true; place(B, pathX(-6) + 4, -1, Math.PI);
    D = { said: 0 }; ridgeWatchers();
    cut([
      { dur: 6.5, from: { p: [pathX(-300) + 70, 140, -340], l: [pathX(-120), 20, -120] }, to: { p: [pathX(-200) + 40, 80, -230], l: [pathX(-40), 6, -40] }, caption: L3.cards },
      { dur: 6, cam: k => ({ p: V3(P.pos.x + 7 - k * 2, P.pos.y + 2.6, P.pos.z - 10 + k * 2), l: V3(P.pos.x + 2, P.pos.y + 1.6, P.pos.z) }), caption: L3.ride[0][1], onTick: () => { P.vel.set(0, 0, -6); } },
    ], () => { ctx.location('The river pass', L3.head + ' · north again'); objective(L3.rideObj, 'Shift to gallop · follow the river'); setGoal(CLEAR.x, heightAt(CLEAR.x, CLEAR.z), CLEAR.z); });
  }
  function ride3Tick() {
    const prog = clamp(-P.pos.z / -PASS1, 0, 1);
    const marks = [0.18, 0.38, 0.6, 0.8];
    if (D.said < marks.length && prog > marks[D.said]) { const [w, l] = L3.rideBarks[D.said]; ctx.bark(w, l, 4.5); D.said++; }
    if (prog > 0.5 && !D.dusk) { D.dusk = true; setLook('dusk'); }
    if (P.pos.z < PASS1 - 20) arriveClearing3();
  }
  function arriveClearing3() {
    stage = 'clearing'; sub = 'look'; setGoal(); ridgeGone();
    P.vel.set(0, 0, 0);
    rodakPack(6, pathX(EDGE_Z) + 6, EDGE_Z + 2);
    cut([
      { dur: 5.5, from: { p: [pathX(EDGE_Z) + 10, heightAt(0, EDGE_Z + 30) + 3, EDGE_Z + 30], l: [pathX(EDGE_Z) + 6, heightAt(0, EDGE_Z) + 2, EDGE_Z] }, to: { p: [pathX(EDGE_Z) + 8, heightAt(0, EDGE_Z + 22) + 2.2, EDGE_Z + 22], l: [pathX(EDGE_Z) + 6, heightAt(0, EDGE_Z) + 1.5, EDGE_Z] }, caption: L3.clearing[0][1] },
    ], () => {
      sayHeld(L3.clearing.slice(1), over(P, 1), () => {
        objective(L3.campObj, 'Ride to the stones by the old firepit, and press E');
        setGoal(FIRE1.x, fires[0].y, FIRE1.z);
        D.camp = addItem(V3(FIRE1.x, fires[0].y + 0.5, FIRE1.z), 'Make camp for the night', () => { dropItem(D.camp); night3(); });
        ctx.play();
      });
    });
  }
  /* ---- night: the Right of Holding, and the Vel step out of the air ---- */
  function night3() {
    stage = 'camp'; sub = 'talk'; ctx.save('camp');
    setGoal(); P.ride = false; B.ride = false; fires[0].on = true; setLook('night');
    place(P, FIRE1.x + 2.2, FIRE1.z + 1.2, -Math.PI * 0.6); place(K, FIRE1.x + 1.2, FIRE1.z + 3.4, -Math.PI * 0.8); K.stay = K.pos.clone();
    place(B, FIRE1.x - 2.2, FIRE1.z + 0.6, Math.PI * 0.6); B.stay = B.pos.clone(); B.mountAt = V3(FIRE1.x - 3.4, ground(FIRE1.x - 3.4, FIRE1.z + 4), FIRE1.z + 4);
    if (!rodak.length) rodakPack(6, pathX(EDGE_Z) + 6, EDGE_Z + 2);
    for (const r of rodak) r.mode = 'watch';
    const c = fires[0];
    sayHeld(L3.night, fireCam(c), () => ambush3());
  }
  function ambush3() {
    const c = fires[0];
    sfx.duat(); shake = 0.5;
    velWave(4, c.x, c.z, 11);
    sayHeld(L3.ambush, (k, tt) => ({ p: V3(c.x + 7, c.y + 4, c.z + 8), l: V3(c.x, c.y + 1, c.z) }), () => {
      sub = 'fight'; B.stay = null; D.total = 6; D.second = false;
      objective(L3.ambushObj, L3.ambushHint, 6, 0); ctx.play();
    });
  }
  function ambush3Tick() {
    const gone = D.total - velsLeft() - (D.second ? 0 : 2);
    if (gone !== D.shown) { D.shown = gone; objective(L3.ambushObj, L3.ambushHint, 6, gone); }
    if (!D.second && velsLeft() <= 2) { D.second = true; velWave(2, P.pos.x, P.pos.z, 13); }
    if (D.second && velsLeft() === 0 && !D.over) {
      D.over = true; sub = 'after'; const c = fires[0];
      for (const r of rodak) r.mode = 'watch';
      setTimeout(() => sayHeld(L3.ambushEnd, fireCam(c), () => {
        ctx.fade && ctx.fade(1, 1);
        setTimeout(() => morning3(), 1100);
      }), 900);
    }
  }
  /* ---- morning: into the trees, all of them together ---- */
  function morning3() {
    stage = 'forest'; sub = 'walk'; ctx.save('forest'); setLook('grey', true); fires[0].on = false;
    if (!B.mountAt) B.mountAt = V3(FIRE1.x - 3.4, ground(FIRE1.x - 3.4, FIRE1.z + 4), FIRE1.z + 4);
    P.ride = false; B.ride = false; B.stay = null; K.on = true; K.stay = null;
    place(P, FIRE1.x + 2, FIRE1.z - 1, Math.PI); place(B, FIRE1.x - 1, FIRE1.z, Math.PI); place(K, FIRE1.x + 1, FIRE1.z + 2.4, Math.PI);
    if (!rodak.length) rodakPack(6, pathX(EDGE_Z) + 6, EDGE_Z + 2);
    for (const r of rodak) { r.mode = 'watch'; r.a.root.visible = true; }
    D = {};
    ctx.fade && ctx.fade(0, 1.2);
    say(L3.morning, () => { objective(L3.forestObj, 'The Carpenter and your Punk walk with you'); setGoal(RUINS.x, heightAt(RUINS.x, RUINS.z), RUINS.z + RUINS.r - 6); ctx.play(); });
  }
  function forest3Tick() {
    if (!D.esc && P.pos.z < EDGE_Z - 6) { D.esc = true; rodak.forEach(r => { r.mode = 'escort'; }); }
    if (!D.thud && P.pos.z < THUD_Z) { D.thud = true; ctx.bark('tale', L3.thud(PN())[0][1], 4.5); }
    if (D.esc && !D.line && P.pos.z < LINE_Z - 2) {
      D.line = true;
      rodak.forEach((r, i) => { r.mode = 'sit'; r.home = V3(P.pos.x + (i - 2.5) * 4, 0, LINE_Z + 1.5); });
      setTimeout(() => sayHeld(L3.line, (k, tt) => ({ p: V3(P.pos.x - 4, P.pos.y + 2.4, P.pos.z - 6), l: V3(P.pos.x, P.pos.y + 1, LINE_Z + 2) }), () => ctx.play()), 1000);
    }
    if (Math.hypot(P.pos.x - RUINS.x, P.pos.z - RUINS.z) < RUINS.r - 4) ruins3();
  }
  /* ---- the ruins: the Akai Gek, linked to the ring ---- */
  function ruins3() {
    stage = 'ruins'; sub = 'look'; ctx.save('ruins'); setGoal();
    const g = heightAt(GY.x, GY.z);
    sayHeld(L3.ruins, (k, tt) => ({ p: V3(GY.x + 14 + Math.sin(tt * 0.15) * 2, g + 6, GY.z + 14), l: V3(GY.x, g + 2, GY.z) }), () => linkSetup());
  }
  function linkSetup() {
    sub = 'link'; D.link = 0;
    objective(L3.linkObj, L3.linkHint); setGoal(WALL.x, heightAt(WALL.x, WALL.z), WALL.z + 2);
    D.linkItem = addItem(V3(WALL.x, heightAt(WALL.x, WALL.z) + 0.5, WALL.z + 1.6), 'Hold E: link the Relic to your ring', () => {
      if (D.taught) return;
      D.taught = true; say(L3.linkTeach, () => ctx.play());
    });
    ctx.play();
  }
  let beam = null;
  function updateLink(dt, playing) {
    if (stage !== 'ruins' || sub !== 'link') { if (beam) beam.visible = false; return; }
    const near = Math.hypot(P.pos.x - WALL.x, P.pos.z - (WALL.z + 1.6)) < 4;
    const holding = playing && D.taught && near && (keys.KeyE || (touch && touch.on));
    D.link = holding ? D.link + dt : Math.max(0, D.link - dt * 0.6);
    if (!beam) { beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xc890ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(beam); }
    const a = relic.position, b = V3(P.pos.x, P.pos.y + 0.95, P.pos.z), L = a.distanceTo(b);
    beam.visible = D.link > 0; beam.position.copy(a).lerp(b, 0.5); beam.scale.set(1, L, 1); beam.lookAt(b); beam.rotateX(Math.PI / 2);
    beam.material.opacity = Math.min(0.9, D.link * 0.4) * (0.7 + Math.sin(t * 20) * 0.3);
    relicPulse = Math.max(relicPulse, D.link * 0.5);
    if (holding && Math.random() < 0.7) { const q = a.clone().lerp(b, Math.random()); particles.emit(q.x, q.y, q.z, { vx: 0, vy: 0.3, vz: 0, color: 0xc890ff, size: 0.3, life: 0.5, drag: 1 }); }
    const n = Math.min(5, Math.floor(D.link / 0.6));
    if (n !== D.pip) { D.pip = n; objective(L3.linkObj, L3.linkHint, 5, n); if (n > 0) sfx.core(); }
    if (D.link >= 3) linkDone();
  }
  function linkDone() {
    sub = 'linked'; dropItem(D.linkItem); setGoal(); beam.visible = false;
    amped = true; ctx.akaiLink && ctx.akaiLink(); relicPulse = 2.5; sfx.victory(); shake = 0.4;
    particles.ring(P.pos.x, P.pos.y + 1, P.pos.z, 60, 4, { color: 0xc890ff, size: 0.6, life: 0.8 });
    sayHeld(L3.linked, (k, tt) => ({ p: V3(WALL.x + 3.4 + Math.sin(tt * 0.2), relic.position.y - 0.6, WALL.z + 7.5), l: relic.position.clone().setY(relic.position.y - 0.8) }), () => {
      ctx.toast(L3.linkGot, 5);
      toKeep();
    });
  }
  /* ---- north to the keep; another test in the trees ---- */
  function toKeep() {
    stage = 'tokeep'; sub = 'walk'; ctx.save('keep');
    objective(L3.keepObj, 'Q throws a fire-stone · north, then east, to the keep');
    setGoal(KEEP.x, heightAt(KEEP.x, KEEP.z + KEEP.h + 20), KEEP.z + KEEP.h + 20);
    ctx.play();
  }
  function tokeepTick() {
    if (!D.amb2 && P.pos.z < -975) {
      D.amb2 = true; sub = 'fight';
      velWave(3, P.pos.x, P.pos.z - 4, 12);
      ctx.say(L3.forestAmbush, () => { objective(L3.ambushObj, L3.ambushHint); ctx.play(); });
    }
    if (D.amb2 && !D.amb2done && velsLeft() === 0) {
      D.amb2done = true; sub = 'walk';
      ctx.bark(...L3.forestAmbushEnd[0], 4);
      objective(L3.keepObj, 'North, then east, to the keep');
    }
    if (D.amb2done && Math.hypot(P.pos.x - KEEP.x, P.pos.z - (KEEP.z + KEEP.h)) < 42) keepArrive3();
  }
  /* ---- the keep: who he lets in ---- */
  function keepArrive3() {
    stage = 'keep'; sub = 'arrive'; setGoal(); setLook('grey');
    const c = V3(KEEP.x, heightAt(KEEP.x, KEEP.z), KEEP.z);
    cut([{ dur: 6, from: { p: [KEEP.x - 50, c.y + 22, KEEP.z + KEEP.h + 50], l: [KEEP.x, c.y + 4, KEEP.z] }, to: { p: [KEEP.x - 26, c.y + 10, KEEP.z + KEEP.h + 30], l: [KEEP.x, c.y + 3, KEEP.z + KEEP.h] }, caption: L3.keepArrive[0][1] }], () => {
      say([L3.keepArrive[1]], () => {
        ctx.ask('tale', L3.allowText, L3.allowOpts.map((label, i) => ({ label, act: () => allowIn(i === 1) })));
      });
    });
  }
  function allowIn(withRodak) {
    D.rodakIn = withRodak; sfx.heal();
    particles.ring(KEEP.x, heightAt(KEEP.x, KEEP.z + KEEP.h) + 1, KEEP.z + KEEP.h, 60, 4, { color: 0x9affb0, size: 0.6, life: 1 });
    if (withRodak) rodak.forEach((r, i) => { r.mode = 'sit'; r.a.root.visible = true; r.pos.set(KEEP.x - 12 + i * 5, 0, KEEP.z + KEEP.h + 30); r.home = V3(KEEP.x - KEEP.h + 4, 0, KEEP.z - 14 + i * 6); });
    say(L3.allowed(withRodak), () => {
      sub = 'in'; objective(L3.inObj, 'Through the gate'); setGoal(KEEP.x, heightAt(KEEP.x, KEEP.z), KEEP.z + 6);
      ctx.play();
    });
  }
  function keep3Tick() {
    if (sub === 'in' && Math.abs(P.pos.x - KEEP.x) < KEEP.h - 3 && Math.abs(P.pos.z - KEEP.z) < KEEP.h - 3) dusk3();
  }
  /* ---- dusk: Nekhra at the door ---- */
  function dusk3() {
    stage = 'keep'; sub = 'dusk'; ctx.save('duel'); setGoal(); setLook('dusk');
    const gz = KEEP.z + KEEP.h, gy = heightAt(KEEP.x, gz);
    place(P, KEEP.x, gz - 5, 0); place(B, KEEP.x - 3, gz - 7, 0); B.stay = B.pos.clone(); place(K, KEEP.x + 3.5, gz - 8, 0); K.stay = K.pos.clone();
    D.malstiAt = V3(KEEP.x - 1.2, 0, gz - 6.5);
    ringOfVel();
    makeNekhra(); NK.pos.set(KEEP.x, 0, ARENA.z + 16); NK.pos.y = ground(NK.pos.x, NK.pos.z); NK.yaw = Math.PI; NK.state = 'walkIn';
    cut([
      { dur: 6, from: { p: [KEEP.x + 4, gy + 3, gz - 8], l: [KEEP.x, gy + 2, ARENA.z] }, to: { p: [KEEP.x + 2, gy + 2.6, gz - 4], l: [KEEP.x, gy + 2, ARENA.z + 4] }, caption: L3.dusk[0][1] },
      { dur: 6, cam: k => ({ p: V3(NK.pos.x + 5, NK.pos.y + 2.4, NK.pos.z - 7), l: V3(NK.pos.x, NK.pos.y + 1.7, NK.pos.z) }), caption: L3.dusk[1][1], onTick: k => { NK.pos.z = lerp(ARENA.z + 16, ARENA.z + 6, smooth(0, 1, k)); NK.walking = k < 0.95; } },
    ], () => {
      NK.walking = false; NK.state = 'idle';
      const cam = (k, tt) => ({ p: V3(KEEP.x + 3, gy + 2.4, gz - 6), l: V3(NK.pos.x, NK.pos.y + 1.6, NK.pos.z) });
      sayHeld(L3.dusk.slice(2).concat(L3.malstiSeen(MN())), cam, () => answer());
    });
  }
  function answer() {
    ctx.ask('tale', L3.answerText, [
      { label: L3.answerOpts[0], act: () => ctx.say(L3.accept, () => duelStart()) },
      { label: L3.answerOpts[1], act: () => ctx.say(L3.buhkonLook, () => answer()) },
    ]);
  }

  /* ---------------- NEKHRA, a Thar Norvek: the Right of Holding ---------------- */
  let NK = null;
  const nkBar = (() => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:40%;top:4.5vh;transform:translateX(-50%);width:min(420px,52vw);z-index:22;display:none;font-family:var(--display,Georgia);letter-spacing:.2em;font-size:12px;color:#ecd8ff;text-align:center;text-shadow:0 1px 4px #000';
    d.innerHTML = 'NEKHRA · THAR NORVEK<div style="height:9px;margin-top:6px;border:1px solid #b080e0;border-radius:5px;background:rgba(0,0,0,.45);overflow:hidden"><div class="fill" style="height:100%;width:100%;background:linear-gradient(90deg,#6a2ac8,#d8a0ff);transition:width .25s"></div></div>';
    document.body.appendChild(d); return d;
  })();
  function makeNekhra() {
    if (NK) return;
    const a = buildVel(); a.root.scale.setScalar(1.3); a.glow && a.glow(1);
    const seam = glowSprite(0xe0a0ff, 0.7, 0.9); seam.position.set(0, 1.42, 0.3); a.root.add(seam);   // her mouth: a seam of violet light
    const aura = glowSprite(0x7a3aff, 5, 0.35); aura.position.y = 1.2; a.root.add(aura);
    scene.add(a.root);
    NK = { a, seam, aura, pos: V3(), vel: V3(), yaw: Math.PI, hp: 100, state: 'idle', timer: 0, phase: 1, flash: 0, waves: [], drops: [], mark: null, windup: 0, attackA: 0, walking: false, said: {} };
  }
  function setNkHp(v) { NK.hp = Math.max(0, v); nkBar.querySelector('.fill').style.width = NK.hp + '%'; }
  function hitNekhra(dmg, at) {
    if (!NK || NK.hp <= 0 || stage !== 'duel' || sub !== 'duel') return;
    const mul = NK.state === 'winded' ? 1.9 : NK.state === 'recover' ? 1.3 : 1;
    setNkHp(NK.hp - dmg * mul); NK.flash = 1; sfx.hit();
    particles.burst(at.x, at.y, at.z, mul > 1.5 ? 26 : 12, { color: mul > 1.5 ? 0xffe0a0 : 0xc890ff, speed: 6, size: 0.4, life: 0.5 });
    if (NK.phase === 1 && NK.hp <= 50) nekhraHalf();
    else if (NK.hp <= 0) win3();
  }
  function nkScreamWave(delay = 0) {
    const g = ground(NK.pos.x, NK.pos.z);
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 6, 48), new THREE.MeshBasicMaterial({ color: 0xd8a0ff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = Math.PI / 2; m.position.set(NK.pos.x, g + 0.5, NK.pos.z); m.visible = false; scene.add(m);
    NK.waves.push({ m, c: NK.pos.clone(), r: 1.2, t: -delay, hit: false });
  }
  function nkKnives() {   // knives out of the Duat, hanging in a ring over him — then down
    const c = P.pos.clone(), g = ground(c.x, c.z);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.7, 40), new THREE.MeshBasicMaterial({ color: 0xb070ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(c.x, g + 0.08, c.z); scene.add(ring);
    const ks = [];
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, k = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 4), new THREE.MeshBasicMaterial({ color: 0xd8a8ff })); k.rotation.x = Math.PI; k.position.set(c.x + Math.cos(a) * 2.6, g + 4.5, c.z + Math.sin(a) * 2.6); scene.add(k); ks.push(k); }
    NK.drops.push({ c, g, ring, ks, t: 0 }); sfx.duat();
  }
  function nkChoose(d) {
    const r = rng();
    if (d < 3.4) { NK.state = 'melee'; NK.timer = 0.55; return; }
    if (NK.phase === 2 && r < 0.3) { NK.state = 'knivesUp'; NK.timer = 0.7; return; }
    if (r < (NK.phase === 2 ? 0.62 : 0.5)) { NK.state = 'screamUp'; NK.timer = 1.0; sfx.duat(); if (!NK.said.scream) { NK.said.scream = 1; ctx.bark(...L3.duelBarks.scream, 3); } return; }
    if (r < 0.82) {
      NK.state = 'blinkOut'; NK.timer = 1.0; sfx.blink();
      particles.burst(NK.pos.x, NK.pos.y + 1.2, NK.pos.z, 30, { color: 0x9a4aff, speed: 5, size: 0.5, life: 0.6 });
      const to = P.pos.clone().addScaledVector(P.vel, 0.45); to.y = ground(to.x, to.z); NK.to = to;
      NK.mark = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.2, 32), new THREE.MeshBasicMaterial({ color: 0xb070ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
      NK.mark.rotation.x = -Math.PI / 2; NK.mark.position.set(to.x, to.y + 0.08, to.z); scene.add(NK.mark);
      if (!NK.said.blink) { NK.said.blink = 1; ctx.bark(...L3.duelBarks.blink, 2.4); }
      return;
    }
    NK.state = 'close'; NK.timer = 2.4;
  }
  function updateNekhra(dt, playing) {
    nkBar.style.display = NK && stage === 'duel' && NK.hp > 0 ? 'block' : 'none';
    if (!NK) return;
    if (NK.state === 'gone') { NK.a.root.visible = false; return; }
    const a = NK.a; NK.flash = Math.max(0, NK.flash - dt * 4); a.flash && a.flash(NK.flash);
    const dx = P.pos.x - NK.pos.x, dz = P.pos.z - NK.pos.z, d = Math.hypot(dx, dz);
    let want = 0, wy = NK.yaw, windup = 0;
    if (NK.state === 'walkIn') { want = 0; }
    else if (NK.state === 'kneel') { a.root.position.y = damp(a.root.position.y, NK.pos.y - 0.45, 3, dt); a.animate(dt, { speed: 0, t, onGround: true }); NK.seam.material.opacity = damp(NK.seam.material.opacity, 0, 2, dt); return; }
    else if (playing && stage === 'duel' && sub === 'duel' && !P.down) {
      NK.timer -= dt; wy = Math.atan2(dx, dz);
      if (NK.state === 'idle') { NK.state = 'circle'; NK.timer = 1.2; }
      if (NK.state === 'circle') {   // round him, at her distance
        const tang = Math.atan2(dx, dz) + Math.PI / 2 * (NK.dir || 1);
        want = 4.2; wy = d > 9 ? Math.atan2(dx, dz) : d < 5 ? Math.atan2(-dx, -dz) : tang;
        if (NK.timer <= 0) { NK.dir = rng() < 0.5 ? -1 : 1; nkChoose(d); }
      } else if (NK.state === 'close') {
        want = 8.5; if (d < 2.8) { NK.state = 'melee'; NK.timer = 0.5; } else if (NK.timer <= 0) { NK.state = 'circle'; NK.timer = 1; }
      } else if (NK.state === 'melee') {
        windup = 1 - NK.timer / 0.55;
        if (NK.timer <= 0) { NK.state = 'recover'; NK.timer = 0.75; NK.attackA = 1; NK.vel.x += Math.sin(NK.yaw) * 9; NK.vel.z += Math.cos(NK.yaw) * 9; sfx.swing(); if (d < 3.2 && P.iframes <= 0) hurtTanoc(13, NK.pos); }
      } else if (NK.state === 'recover') {
        NK.attackA = Math.max(0, NK.attackA - dt * 3); if (NK.timer <= 0) { NK.state = 'circle'; NK.timer = 1 + rng() * 1.2; }
      } else if (NK.state === 'screamUp') {   // she draws breath; the seam of her mouth burns wide
        windup = 1 - NK.timer / 1.0;
        if (NK.timer <= 0) { nkScreamWave(); if (NK.phase === 2) nkScreamWave(0.5); sfx.roar(); shake = Math.max(shake, 0.5); NK.state = 'winded'; NK.timer = NK.phase === 2 ? 1.7 : 2.1; NK.toldWind = false; }
      } else if (NK.state === 'winded') {   // spent: bent over, breathing hard
        if (!NK.said.winded && NK.timer < (NK.phase === 2 ? 1.2 : 1.6)) { NK.said.winded = 1; ctx.bark(...L3.duelBarks.winded, 2); }
        if (NK.timer <= 0) { NK.state = 'circle'; NK.timer = 0.9 + rng(); }
      } else if (NK.state === 'blinkOut') {
        a.root.visible = false; if (NK.mark) NK.mark.material.opacity = 0.35 + 0.35 * Math.sin(NK.timer * 24);
        if (NK.timer <= 0) {   // out of the Duat, right on the mark, blade first
          a.root.visible = true; NK.pos.copy(NK.to); sfx.duat(); sfx.swing(); shake = Math.max(shake, 0.4);
          if (NK.mark) { scene.remove(NK.mark); NK.mark = null; }
          particles.burst(NK.pos.x, NK.pos.y + 1.2, NK.pos.z, 40, { color: 0x9a4aff, speed: 7, size: 0.55, life: 0.7 });
          if (Math.hypot(P.pos.x - NK.pos.x, P.pos.z - NK.pos.z) < 2.3 && P.iframes <= 0) hurtTanoc(16, NK.pos);
          NK.attackA = 1; NK.state = 'recover'; NK.timer = 1.0;
        }
      } else if (NK.state === 'knivesUp') {
        windup = 1 - NK.timer / 0.7;
        if (NK.timer <= 0) { nkKnives(); NK.state = 'circle'; NK.timer = 2.2; if (!NK.said.knives) { NK.said.knives = 1; ctx.bark(...L3.duelBarks.knives, 2.6); } }
      }
    }
    if (NK.state !== 'blinkOut') a.root.visible = true;
    NK.yaw = dampAngle(NK.yaw, wy, 7, dt);
    NK.vel.x = damp(NK.vel.x, Math.sin(wy) * want, 7, dt); NK.vel.z = damp(NK.vel.z, Math.cos(wy) * want, 7, dt);
    NK.pos.x += NK.vel.x * dt; NK.pos.z += NK.vel.z * dt;
    if (stage === 'duel') { const ox = NK.pos.x - ARENA.x, oz = NK.pos.z - ARENA.z, od = Math.hypot(ox, oz); if (od > ARENA.r - 1) { NK.pos.x = ARENA.x + ox / od * (ARENA.r - 1); NK.pos.z = ARENA.z + oz / od * (ARENA.r - 1); } }
    resolve(NK.pos, 0.6); NK.pos.y = groundAt(NK.pos.x, NK.pos.z, NK.pos.y + 1);
    a.root.position.copy(NK.pos); a.root.rotation.y = NK.yaw;
    const bent = NK.state === 'winded' ? 0.5 : 0;
    a.root.rotation.x = damp(a.root.rotation.x, bent, 6, dt);
    a.animate(dt, { speed: NK.state === 'walkIn' && NK.walking ? 2.2 : Math.hypot(NK.vel.x, NK.vel.z), t, windup: Math.max(windup, NK.state === 'screamUp' ? 1 : 0), attack: NK.attackA, onGround: true });
    NK.seam.scale.setScalar(NK.state === 'screamUp' ? 0.7 + windup * 2.6 : NK.state === 'winded' ? 0.35 : 0.7);
    NK.seam.material.opacity = NK.state === 'winded' ? 0.35 : 0.9;
    NK.aura.material.opacity = 0.25 + windup * 0.5 + NK.flash * 0.3;
    if (NK.state === 'screamUp' && Math.random() < 0.6) particles.emit(NK.pos.x, NK.pos.y + 1.8, NK.pos.z, { vx: (Math.random() - 0.5) * 2, vy: 1, vz: (Math.random() - 0.5) * 2, color: 0xd8a0ff, size: 0.4, life: 0.5, drag: 1 });
    // the scream, rolling out across the moss: clear it with a jump
    for (let i = NK.waves.length - 1; i >= 0; i--) {
      const w = NK.waves[i]; w.t += dt; if (w.t < 0) continue;
      if (!w.m.visible) { w.m.visible = true; w.c.copy(NK.pos); w.m.position.set(NK.pos.x, ground(NK.pos.x, NK.pos.z) + 0.5, NK.pos.z); }
      w.r += 12 * dt; w.m.scale.set(w.r, w.r, 1); w.m.material.opacity = 0.85 * (1 - w.r / (ARENA.r + 8));
      const pd = Math.hypot(P.pos.x - w.c.x, P.pos.z - w.c.z), air = P.pos.y - groundAt(P.pos.x, P.pos.z, P.pos.y + 0.5);
      if (!w.hit && Math.abs(pd - w.r) < 0.9 && air < 0.6 && P.iframes <= 0 && !P.down) { w.hit = true; hurtTanoc(14, w.c); }
      if (w.r > ARENA.r + 8) { scene.remove(w.m); NK.waves.splice(i, 1); }
    }
    for (let i = NK.drops.length - 1; i >= 0; i--) {
      const k = NK.drops[i]; k.t += dt;
      k.ring.material.opacity = 0.35 + 0.35 * Math.sin(k.t * 18);
      if (k.t > 1.2) for (const m of k.ks) m.position.y = Math.max(k.g + 0.3, m.position.y - dt * 30);
      if (k.t > 1.2 && !k.fired) {
        k.fired = true; sfx.slam();
        if (Math.hypot(P.pos.x - k.c.x, P.pos.z - k.c.z) < 3.7 && P.iframes <= 0 && !P.down) hurtTanoc(17, k.c);
        particles.ring(k.c.x, k.g + 0.3, k.c.z, 40, 3, { color: 0xb070ff, size: 0.5, life: 0.5 });
      }
      if (k.t > 1.8) { scene.remove(k.ring); k.ks.forEach(m => scene.remove(m)); NK.drops.splice(i, 1); }
    }
  }
  function clearNkAttacks() {
    for (const w of NK.waves) scene.remove(w.m); NK.waves.length = 0;
    for (const k of NK.drops) { scene.remove(k.ring); k.ks.forEach(m => scene.remove(m)); } NK.drops.length = 0;
    if (NK.mark) { scene.remove(NK.mark); NK.mark = null; }
    NK.a.root.visible = true;
  }
  function duelStart() {
    stage = 'duel'; sub = 'duel';
    place(P, ARENA.x, ARENA.z - 9, 0); P.hp = 100; P.iframes = 0; ctx.hp(1); CAM.yaw = Math.PI;
    NK.pos.set(ARENA.x, 0, ARENA.z + 7); NK.pos.y = ground(NK.pos.x, NK.pos.z); NK.yaw = Math.PI; NK.state = 'idle'; NK.timer = 1.5;
    setNkHp(NK.hp);
    objective(NK.phase === 2 ? L3.phase2 : L3.duelObj, L3.duelHint);
    ctx.play();
  }
  function nekhraHalf() {
    NK.phase = 1.5; sub = 'half'; clearNkAttacks(); NK.state = 'idle';
    sayHeld(L3.half, (k, tt) => ({ p: V3(NK.pos.x + 4, NK.pos.y + 2.2, NK.pos.z + 5), l: V3(NK.pos.x, NK.pos.y + 1.6, NK.pos.z) }), () => {
      NK.phase = 2; sub = 'duel'; NK.timer = 1.2; objective(L3.phase2, L3.duelHint); ctx.play();
    });
  }
  function duelDown() {
    if (P.down) return;
    P.down = true; P.hp = 0; sub = 'down'; clearNkAttacks(); NK.state = 'idle';
    setTimeout(() => {
      sayHeld(L3.down, (k, tt) => ({ p: V3(P.pos.x + 2.6, P.pos.y + 1.4, P.pos.z + 2.6), l: V3(P.pos.x, P.pos.y + 0.6, P.pos.z) }), () => {
        P.down = false; setNkHp(Math.min(100, NK.hp + 10)); if (NK.phase === 2 && NK.hp > 50) setNkHp(50);
        duelStart();
      });
    }, 1400);
  }
  function win3() {
    sub = 'won'; clearNkAttacks(); NK.state = 'kneel'; setGoal(); sfx.victory(); shake = 0.6;
    particles.burst(NK.pos.x, NK.pos.y + 1.4, NK.pos.z, 60, { color: 0xd8a0ff, speed: 6, size: 0.5, life: 1 });
    const cam = (k, tt) => ({ p: V3(NK.pos.x + 5 + Math.sin(tt * 0.1), NK.pos.y + 2.6, NK.pos.z - 6), l: V3(NK.pos.x, NK.pos.y + 1.0, NK.pos.z) });
    let i = 0;
    const next = () => {
      if (i >= L3.win.length) return night3End();
      const line = L3.win[i++];
      if (i === 2) watchers.forEach((v, j) => setTimeout(() => { if (v.glow) v.glow(0.1); particles.burst(v.root.position.x, v.root.position.y + 1.6, v.root.position.z, 8, { color: 0xd8a0ff, speed: 2, size: 0.3, life: 0.4 }); }, j * 40));
      if (i === L3.win.length) {   // a dozen doors in the air, opening and closing
        sfx.duat();
        for (const v of watchers) { particles.burst(v.root.position.x, v.root.position.y + 1, v.root.position.z, 24, { color: 0x9a4aff, speed: 5, size: 0.5, life: 0.7 }); scene.remove(v.root); }
        watchers.length = 0; particles.burst(NK.pos.x, NK.pos.y + 1, NK.pos.z, 40, { color: 0x9a4aff, speed: 6, size: 0.6, life: 0.8 }); NK.a.root.visible = false; NK.state = 'gone';
      }
      if (i === 1) held(cam);
      ctx.say([line], next);
    };
    next();
  }
  function night3End() {
    cine.stop(); setLook('night'); stage = 'night'; sub = 'church';
    if (NK) { scene.remove(NK.a.root); }
    const cg = heightAt(CHURCH.x, CHURCH.z);
    place(P, CHURCH.x + 1, CHURCH.z + 1, Math.PI); place(B, CHURCH.x - 1.6, CHURCH.z + 0.4, Math.PI * 0.8); B.stay = B.pos.clone();
    place(K, CHURCH.x, CHURCH.z + 5.6, Math.PI); K.stay = K.pos.clone(); D.malstiAt = V3(CHURCH.x + 1, 0, CHURCH.z + 1.6);
    if (!D.churchLight) { D.churchLight = new THREE.PointLight(0xffc890, 26, 14); D.churchLight.position.set(CHURCH.x, cg + 4, CHURCH.z + 1); scene.add(D.churchLight); }
    sayHeld(L3.church(MN()), (k, tt) => ({ p: V3(CHURCH.x + 3.2, cg + 2.6 + Math.sin(tt * 0.2) * 0.2, CHURCH.z + 4), l: V3(CHURCH.x, cg + 1, CHURCH.z) }), () => {
      stage = 'home'; done = true; ctx.save('home');
      cut([{ dur: 8, from: { p: [KEEP.x + 40, heightAt(KEEP.x, KEEP.z) + 30, KEEP.z + 60], l: [KEEP.x, heightAt(KEEP.x, KEEP.z), KEEP.z] }, to: { p: [KEEP.x + 80, heightAt(KEEP.x, KEEP.z) + 90, KEEP.z + 140], l: [KEEP.x, heightAt(KEEP.x, KEEP.z), KEEP.z] }, caption: L3.home }], () => ctx.onDone());
    });
  }
  function tick3() {
    if (stage === 'ride') ride3Tick();
    else if (stage === 'camp' && sub === 'fight') ambush3Tick();
    else if (stage === 'forest') forest3Tick();
    else if (stage === 'tokeep') tokeepTick();
    else if (stage === 'keep') keep3Tick();
  }
  /* resume Chapter III at a checkpoint */
  function start3(at) {
    if (ctx.slotsHud) ctx.slotsHud(true);
    D = {};
    makeBuhkon(); makeMalsti(); keepIsHis(); gyngeHill();
    amped = !!ctx.linked;   // the Akai Gek, if it's already on his ring
    const toClearing = () => { place(P, pathX(PASS1 - 30), PASS1 - 30, Math.PI); place(B, pathX(PASS1 - 30) + 3, PASS1 - 27, Math.PI); };
    if (at === 'camp') { toClearing(); night3(); return; }
    if (at === 'forest') { morning3(); return; }
    if (at === 'ruins') { setLook('grey', true); K.on = true; B.mountAt = V3(FIRE1.x - 3.4, ground(FIRE1.x - 3.4, FIRE1.z + 4), FIRE1.z + 4); place(P, RUINS.x + 4, RUINS.z + RUINS.r - 8, Math.PI); place(B, RUINS.x + 1, RUINS.z + RUINS.r - 6, Math.PI); place(K, RUINS.x + 6, RUINS.z + RUINS.r - 5, Math.PI); ruins3(); return; }
    if (at === 'keep') { setLook('grey', true); K.on = true; amped = true; place(P, WALL.x + 4, WALL.z + 8, Math.PI); place(B, WALL.x + 1, WALL.z + 10, Math.PI); place(K, WALL.x + 6, WALL.z + 11, Math.PI); D.amb2 = false; toKeep(); return; }
    if (at === 'duel') { setLook('dusk', true); K.on = true; amped = true; if (!rodak.length) rodakPack(6, KEEP.x - 12, KEEP.z + KEEP.h + 30); rodak.forEach(r => { r.a.root.visible = false; r.pos.set(0, -80, 0); }); dusk3(); return; }
    if (at === 'home') { done = true; ctx.onDone(); return; }
    startRide3();
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
    if (CH3) {
      updateBuhkon(dt, playing && !cine.active); updateDarts(dt); updateNekhra(dt, playing && !cine.active); updateWatchers(dt); updateLink(dt, playing && !cine.active);
      if (stage === 'ride') updateRidge(dt);
      if (stage === 'duel') { const ox = P.pos.x - ARENA.x, oz = P.pos.z - ARENA.z, od = Math.hypot(ox, oz); if (od > ARENA.r) { P.pos.x = ARENA.x + ox / od * ARENA.r; P.pos.z = ARENA.z + oz / od * ARENA.r; } }   // the ring of Vel: nobody leaves the Right half-fought
      if (playing && !cine.active) tick3();
    } else if (playing && !cine.active) {
      if (stage === 'ride') rideTick();
      else if (stage === 'enter') enterTick();
      else if (stage === 'alone') aloneTick();
      else if (stage === 'day2') day2Tick();
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
    amulet.children[1].material.opacity = 0.35 + Math.sin(t * 3) * 0.15 + (bigSn ? 0.4 : 0);
    if (malsti && sub !== 'ring') {   // at his heels, or up on his shoulder (or kept back, out of a fight that isn't his)
      const tgt = CH3 && D.malstiAt && (stage === 'keep' || stage === 'duel' || stage === 'night') ? D.malstiAt.clone() : V3(P.pos.x - Math.sin(P.yaw) * 1.2 + Math.cos(P.yaw) * 0.8, 0, P.pos.z - Math.cos(P.yaw) * 1.2 - Math.sin(P.yaw) * 0.8);
      malsti.root.position.lerp(tgt.setY(groundAt(tgt.x, tgt.z, P.pos.y + 1)), 1 - Math.exp(-6 * dt)); malsti.root.rotation.y = P.yaw;
      malsti.animate(dt, { speed: Math.hypot(P.vel.x, P.vel.z), t });
    } else if (malsti) malsti.animate(dt, { speed: 0, t });
    if (master && master.root.visible) master.animate(dt, { speed: 0, t, onGround: true });
    if (D.watcher && D.watcher.root.rotation.z === 0) D.watcher.animate(dt, { speed: 0, t, onGround: true });
    // the fog: thin in the low valley, thick in the pass, a wall of it among the great trees
    const zz = zoneOf(P.pos.z), fNear = zz === 'foot' ? 220 : zz === 'pass' ? lerp(200, 50, clamp(-P.pos.z / -PASS1, 0, 1)) : zz === 'clear' ? 40 : 10;
    const fFar = zz === 'foot' ? 1500 : zz === 'pass' ? lerp(1400, 320, clamp(-P.pos.z / -PASS1, 0, 1)) : zz === 'clear' ? 420 : (stage === 'keep' && sub === 'cleansed' ? 320 : CH3 && (stage === 'keep' || stage === 'duel' || stage === 'night') ? 260 : 170);
    fog.near = damp(fog.near, fNear, 1.5, dt); fog.far = damp(fog.far, fFar, 1.5, dt);
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
    // spores and flickers in the forest; brighter in the dark
    if (zz === 'forest' && Math.random() < 0.7) particles.emit(P.pos.x + (Math.random() - 0.5) * 40, P.pos.y + Math.random() * 10, P.pos.z + (Math.random() - 0.5) * 40, { vx: (Math.random() - 0.5) * 0.3, vy: 0.15, vz: (Math.random() - 0.5) * 0.3, color: 0xbfeee6, size: 0.16, life: 4, drag: 0 });
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
  function updateCamera(dt) {
    camTgt.set(P.pos.x, P.pos.y + (P.ride ? 2.4 : 1.5), P.pos.z);
    const want = P.ride ? 8.5 : (GYN && GYN.alive ? 9 : stage === 'duel' ? 8 : 6.4), cp = Math.cos(CAM.pitch), dir = V3(Math.sin(CAM.yaw) * cp, Math.sin(CAM.pitch), Math.cos(CAM.yaw) * cp);
    let d = want;
    for (let s = 0.6; s <= want; s += 0.3) { const q = camTgt.clone().addScaledVector(dir, s); if (solidAt(q.x, q.y, q.z) || (GYN && GYN.alive && q.distanceTo(GYN.pos.clone().setY(GYN.pos.y + 0.45 * GYN.s)) < 0.95 * GYN.s)) { d = Math.max(0.8, s - 0.4); break; } }
    camPos.lerp(camTgt.clone().addScaledVector(dir, d), 1 - Math.exp(-14 * dt));
    camera.position.copy(camPos);
    if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; }
    camera.lookAt(camTgt);
  }

  function interact() {
    let best = null, bd = 1e9;
    for (const it of items) { const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z); if (d < 3 && Math.abs(it.pos.y - P.pos.y) < 3.5 && d < bd) { bd = d; best = it; } }
    if (best) { sfx.ui(); best.act(); return; }
    if (!P.ride && K.on && K.pos.distanceTo(P.pos) < 3 && !K.stay && (stage === 'ride' || stage === 'clearing')) { P.ride = true; sfx.jump(); return; }
    if (P.ride && (stage === 'ride' || stage === 'clearing') && P.onGround) { P.ride = false; P.pos.addScaledVector(V3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)), 1.8); sfx.land(); return; }
    if (K.stay && K.pos.distanceTo(P.pos) < 3) ctx.bark('punk', '…', 1.5);
  }
  function prompt() {
    for (const it of items) { const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z); if (d < 3 && Math.abs(it.pos.y - P.pos.y) < 3.5) return it.label; }
    if (!P.ride && K.on && !K.stay && K.pos.distanceTo(P.pos) < 3 && (stage === 'ride' || stage === 'clearing')) return 'Climb up on your Punk';
    if (P.ride && (stage === 'ride' || stage === 'clearing')) return null;
    return null;
  }

  /* resume at a checkpoint (a reload mid-chapter starts you at the last one) */
  function start(at) {
    if (ctx.slotsHud) ctx.slotsHud(true);
    D = {};
    const toClearing = () => { place(P, pathX(PASS1 - 30), PASS1 - 30, Math.PI); rodakPack(6, pathX(EDGE_Z) + 6, EDGE_Z + 2); };
    if (at === 'clearing') { toClearing(); P.ride = true; arriveClearing(); return; }
    if (at === 'enter') { toClearing(); place(P, FIRE1.x + 2, FIRE1.z, Math.PI); place(K, FIRE1.x, FIRE1.z + 2, Math.PI); morning(); return; }
    if (at === 'alone' || at === 'ruins') { toClearing(); for (const r of rodak) { r.a.root.visible = false; r.pos.set(0, -80, 0); } place(P, FIRE1.x + 3, FIRE1.z - 4, Math.PI); place(K, FIRE1.x + 1, FIRE1.z + 2, Math.PI); K.stay = K.pos.clone(); buildAnimal(); stage = 'alone'; sub = 'animal'; setLook('grey', true); objective(M.aloneObj); setGoal(ANIMAL.x, heightAt(ANIMAL.x, ANIMAL.z), ANIMAL.z); ctx.play(); return; }
    if (at === 'gynge') { K.on = false; setLook('grey', true); place(P, WALL.x + 2, WALL.z + 26, Math.PI); stage = 'alone'; sub = 'gather'; D.saw = true; ctx.play(); return; }
    if (at === 'harvest') { K.on = false; setLook('grey', true); spawnGynge(); GYN.alive = false; GYN.pos.y = heightAt(GY.x, GY.z); gyngeBar.style.display = 'none'; place(P, GY.x + 6, GY.z + 8, Math.PI); harvest(); ctx.play(); return; }
    if (at === 'day2') { K.on = false; spawnGynge(); GYN.alive = false; GYN.pos.y = heightAt(GY.x, GY.z); gyngeBar.style.display = 'none'; amped = true; startDay2(); return; }
    if (at === 'keep') { K.on = false; amped = true; setLook('eclipse', true); place(P, KEEP.x - 20, KEEP.z + KEEP.h + 36, Math.PI); stage = 'keep'; sub = 'climb'; D.eclipse = true; startKeep(); return; }
    if (at === 'home') { done = true; ctx.onDone(); return; }
    startRide();
  }
  // the animal is there from the start; it's only noticed when he comes on it (Chapter II only)
  if (!CH3) { buildAnimal(); trail.forEach(g => { g.material.opacity = 0; }); }

  function dispose() {
    gyngeBar.remove(); nkBar.remove();
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
    composer.dispose && composer.dispose();
  }
  return {
    start: at => (CH3 ? start3(at) : start(at)), update, render: () => composer.render(), interact, prompt, jump, attack, resize, dispose, useSlot, skip: () => cine.skip(),
    get cinematic() { return cine.active; }, get stage() { return stage; }, get sub() { return sub; }, get done() { return done; }, P, foes, items,
    debug: { get GYN() { return GYN; }, erupt, gyngeHalf, gyngeDie, harvest, startDay2, startKeep, knockedDown, emerge, church, cleanse, arriveClearing, thud, get D() { return D; },
      get NK() { return NK; }, get B() { return B; }, night3, ambush3, morning3, ruins3, linkDone, toKeep, keepArrive3, dusk3, duelStart, win3, hitNekhra, nekhraHalf, velsLeft },
  };
}
