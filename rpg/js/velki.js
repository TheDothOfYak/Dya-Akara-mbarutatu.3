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
import { buildEikar } from './actors.js';
import { clamp, damp, dampAngle, smooth, mulberry32 } from './util.js';
import * as STORY from './story.js';
import { createCityKit, createCrowd, buildMudFountain, FOLK_LOOKS } from './city.js';
import { createCine } from './cine.js';

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
  function heightAt(x, z) {
    const r = Math.hypot(x, z);
    return smooth(WALL_R + 6, 130, r) * (2.2 * Math.sin(x * 0.021) + 1.8 * Math.cos(z * 0.017 + 1) + 1.2 * Math.sin((x + z) * 0.033) + 1.5);
  }
  {
    const geo = new THREE.PlaneGeometry(1400, 1400, 180, 180); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color();
    const pave = new THREE.Color(0xc8a888), road = new THREE.Color(0xb89878), grass = new THREE.Color(0x7a7a48), dry = new THREE.Color(0x9a7a50);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
      pos.setY(i, heightAt(x, z));
      c.copy(grass).lerp(dry, (Math.sin(x * 0.05) * Math.cos(z * 0.04) + 1) * 0.3);
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
      if (!s.on || s.y1 > y + STEP || s.y1 <= g) continue;
      if (s.kind === 'box' ? Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd : Math.hypot(x - s.x, z - s.z) < s.r) g = s.y1;
    }
    return g;
  }
  function resolve(p) {
    for (const s of solids) {
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
    // the edge of the world we built
    if (r > 320) { p.x *= 320 / r; p.z *= 320 / r; }
  }
  function solidAt(x, y, z) {
    for (const s of solids) {
      if (!s.on || y < s.y0 || y > s.y1) continue;
      if (s.kind === 'box' ? Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd : Math.hypot(x - s.x, z - s.z) < s.r) return true;
    }
    return y < heightAt(x, z) + 0.2;
  }

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
      kit.house(x, z, Math.atan2(-x, -z), ring === 0 && i % 3 === 0 ? 'tall' : null);
    }
  }
  // street furniture: lamps round the ring streets, bunting across them, paving rings
  const STREETS = [12, 23.2, 33.8, 44.3, 56];
  for (const r of STREETS.slice(1)) for (let k = 0; k < Math.round(r / 5); k++) { const a = k / Math.round(r / 5) * TAU + 0.2, x = Math.cos(a) * (r + 2.4), z = Math.sin(a) * (r + 2.4); if (Math.abs(x) < 9 && z < 0) continue; if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < 7) continue; kit.lampPost(x, z); }
  for (const r of [23.2, 33.8, 44.3]) for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + 0.5; kit.bunting(V3(Math.cos(a) * (r - 4.5), 6.2, Math.sin(a) * (r - 4.5)), V3(Math.cos(a + 0.12) * (r + 4.5), 6.2, Math.sin(a + 0.12) * (r + 4.5)), 1.2); }
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
  for (const r of [44.3, 56]) for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k / 8 - 0.5) * 1.6; if (Math.abs(Math.cos(a) * r) < 9) continue; spots.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, look: BATTLE_LOOK, kind: 'watch' }); }
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; spots.push({ x: PLAZA.x + Math.cos(a) * 4.8, z: PLAZA.z + Math.sin(a) * 4.8, look: [PLAZA.x, PLAZA.z], kind: 'sit' }); }
  for (const [x, z] of [[-6, 27], [7, 38], [-4, 44]]) for (let k = 0; k < 3; k++) { const a = k / 3 * TAU; spots.push({ x: x + Math.cos(a) * 0.9, z: z + Math.sin(a) * 0.9, look: [x, z], kind: 'chat' }); }
  const crowd = createCrowd({
    scene, rng, groundAt, C: { x: 0, z: 0 },
    resolve: q => { const y = q.y; q.y = 0.2; resolve(q); q.y = y; },
    streets: STREETS.slice(1).map(r => ({ r })), roads: [{ a: -Math.PI / 2 }, { a: Math.PI / 2 }], spots,
  });
  for (let i = 0; i < 34; i++) {
    const r = STREETS[1 + (i % 4)], a = rng() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
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
  let stage = 'spire', t = 0, outT = 0, said = 0, barkI = 0, shake = 0, done = false, caughtT = -1, tear = null;
  const beacon = glowSprite(0xffd27a, 3, 0.9); scene.add(beacon);
  function setBeacon() {
    if (stage === 'spire') beacon.position.set(0, SPIRE_TOP + 1.6, 0);
    else if (stage === 'gate') beacon.position.set(0, 3, -WALL_R - 6);
    beacon.visible = stage === 'spire' || stage === 'gate';
  }
  setBeacon();
  ctx.objective(STORY.PRO_OBJ.spire, 'WASD to move · Shift to run · Space to jump');

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
    if (warden.pos.distanceTo(P.pos) < 3.5) { ctx.say(STORY.PROLOGUE.guard); return; }
    for (const c of crew) if (!c.run && c.pos.distanceTo(P.pos) < 3.2) { ctx.say(STORY.PROLOGUE.ahoac); return; }
  }
  function prompt() {
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
    tanoc.root.position.copy(P.pos); tanoc.root.rotation.y = P.yaw;
    tanoc.animate(dt, { speed, onGround: P.onGround, t });
    return sp;
  }

  function updateCamera(dt) {
    const onSpire = Math.hypot(P.pos.x, P.pos.z) < 8 && P.pos.y > 2;
    const want = onSpire ? 5.2 : 6.5;
    camTgt.set(P.pos.x, P.pos.y + 1.5, P.pos.z);
    let d = want;
    const cp = Math.cos(CAM.pitch), dir = V3(Math.sin(CAM.yaw) * cp, Math.sin(CAM.pitch), Math.cos(CAM.yaw) * cp);
    for (let s = 0.6; s <= want; s += 0.3) { const q = camTgt.clone().addScaledVector(dir, s); if (solidAt(q.x, q.y, q.z)) { d = Math.max(0.8, s - 0.4); break; } }
    const goal = camTgt.clone().addScaledVector(dir, d);
    camPos.lerp(goal, 1 - Math.exp(-14 * dt));
    camera.position.copy(camPos);
    if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; shake = Math.max(0, shake - dt * 1.5); }
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
    lamps.forEach((l, i) => { l.material.opacity = 0.75 + Math.sin(t * 5 + i) * 0.12; });
    beacon.material.opacity = 0.6 + Math.sin(t * 4) * 0.3;
    particles.update(dt);
    // wind-blown dust near the camera
    if (Math.random() < 0.4) particles.emit(camPos.x + (Math.random() - 0.5) * 40, camPos.y + (Math.random() - 0.5) * 12, camPos.z + (Math.random() - 0.5) * 40, { vx: 0.2, vy: 0.1, vz: -0.6, color: 0xffc890, size: 0.14, life: 5, drag: 0 });

    if (playing) {
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

  return { intro, skip: () => cine.skip(), get cinematic() { return cine.active; }, scene, update, render, interact, prompt, jump, resize, dispose, get stage() { return stage; }, P, debug: { topReached, startGateStage, caught } };
}
