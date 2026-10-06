/* ============================================================
   The open sky of the Mbaru Tatu: a golden-hour etherium with
   daylight stars and nebula, the sister Tatu hanging close
   overhead, their Kalo, and a cloud sea far below the highland.
   ============================================================ */
import * as THREE from 'three';
import { fbm, mulberry32 } from './util.js';
import { glowSprite } from './gfx.js';

export const SUN_DIR = new THREE.Vector3(-0.55, 0.32, 0.77).normalize();

const NOISE_GLSL = `
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x){
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += n3(p) * a; p *= 2.02; a *= 0.5; } return s; }
`;

function skyDome() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: SUN_DIR }, uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vDir;
      void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      varying vec3 vDir; uniform vec3 uSun; uniform float uTime;
      ${NOISE_GLSL}
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 zen = vec3(0.045, 0.075, 0.20);
        vec3 mid = vec3(0.22, 0.30, 0.52);
        vec3 hor = vec3(1.00, 0.68, 0.42);
        vec3 low = vec3(0.98, 0.55, 0.45);
        vec3 col;
        if (h > 0.0) col = mix(mix(hor, mid, smoothstep(0.0, 0.28, h)), zen, smoothstep(0.28, 0.95, h));
        else col = mix(hor, low, smoothstep(0.0, -0.35, h));
        float s = max(dot(d, uSun), 0.0);
        col += vec3(1.0, 0.62, 0.30) * pow(s, 6.0) * 0.55;
        col += vec3(1.0, 0.92, 0.75) * pow(s, 900.0) * 6.0;
        // the etherium: nebula wisps and stars, visible even by day
        float up = smoothstep(0.04, 0.55, h) * (1.0 - pow(s, 3.0));
        float neb = fbm3(d * 2.6 + vec3(0.0, uTime * 0.004, 0.0));
        float neb2 = fbm3(d * 5.0 + vec3(9.1, 2.3, uTime * 0.006));
        vec3 nebCol = mix(vec3(0.55, 0.20, 0.55), vec3(0.12, 0.55, 0.62), neb2);
        col += nebCol * smoothstep(0.48, 0.78, neb) * 0.55 * up;
        vec3 sp = floor(d * 380.0);
        float st = h3(sp);
        float tw = 0.6 + 0.4 * sin(uTime * 2.0 + st * 60.0);
        col += vec3(1.0, 0.95, 0.85) * step(0.9965, st) * tw * up * 1.6;
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

/* a painted planet texture: oceans, land, cloud bands */
function planetTexture(seed, pal) {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W * Math.PI * 2, v = y / H * Math.PI;
    const px = Math.sin(v) * Math.cos(u) * 2.2 + seed, pz = Math.sin(v) * Math.sin(u) * 2.2 + seed * 0.7, py = Math.cos(v) * 2.2;
    const land = fbm(px * 1.6 + py * 0.7, pz * 1.6 - py * 0.4, 5);
    const cloud = fbm(px * 3.0 + 40, pz * 1.2 + py * 3.5, 4);
    let col = land > pal.sea ? (land > pal.sea + 0.12 ? pal.high : pal.land) : pal.water;
    const lat = Math.abs(Math.cos(v));
    if (lat > 0.86) col = [235, 240, 245];
    let r = col[0], gg = col[1], b = col[2];
    const cl = Math.max(0, (cloud - 0.55) * 3.2);
    r += (250 - r) * Math.min(1, cl); gg += (245 - gg) * Math.min(1, cl); b += (235 - b) * Math.min(1, cl);
    const i = (y * W + x) * 4; img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function planet(radius, tex, atmo, pos) {
  const grp = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: tex }, uSun: { value: SUN_DIR }, uAtmo: { value: new THREE.Color(atmo) } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uSun; uniform vec3 uAtmo;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        vec3 base = texture2D(uMap, vUv).rgb;
        float l = dot(normalize(vN), uSun);
        float band = l > 0.35 ? 1.0 : l > 0.05 ? 0.72 : l > -0.2 ? 0.42 : 0.24;
        float rim = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.5);
        vec3 col = base * band + uAtmo * rim * 0.9;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), mat);
  grp.add(ball);
  const halo = glowSprite(atmo, radius * 2.9, 0.45); grp.add(halo);
  grp.position.copy(pos);
  grp.userData.ball = ball;
  return grp;
}

function cloudSea() {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uSun: { value: SUN_DIR } }]),
    vertexShader: `
      varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      varying vec3 vW; uniform float uTime;
      ${NOISE_GLSL}
      #include <fog_pars_fragment>
      void main(){
        vec3 p = vec3(vW.x * 0.004 + uTime * 0.006, uTime * 0.01, vW.z * 0.004);
        float c = fbm3(p) * 0.7 + fbm3(p * 3.1) * 0.3;
        vec3 deep = vec3(0.62, 0.38, 0.48), lit = vec3(1.0, 0.86, 0.70);
        vec3 col = mix(deep, lit, smoothstep(0.35, 0.7, c));
        col = mix(col, vec3(1.0, 0.95, 0.85), smoothstep(0.66, 0.8, c) * 0.6);
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
        #include <fog_fragment>
      }`,
    fog: true,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000, 1, 1), mat);
  m.rotation.x = -Math.PI / 2; m.position.y = -230;
  return m;
}

/* little flocks of far-off Albali Byrds wheeling around */
function flock(rng) {
  const grp = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 0, 0, 0.3, 0, 0.12, 0, 0, 0, 0.3, 1, 0, 0, 0, 0.12, 0], 3));
  const mat = new THREE.MeshBasicMaterial({ color: 0x3b2a2a, side: THREE.DoubleSide, fog: true });
  const birds = [];
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(geo, mat);
    b.position.set((rng() - 0.5) * 18, (rng() - 0.5) * 5, (rng() - 0.5) * 18);
    b.scale.setScalar(1.6); b.userData.ph = rng() * 6;
    grp.add(b); birds.push(b);
  }
  grp.userData = { birds, r: 260 + rng() * 260, h: 40 + rng() * 80, sp: (0.04 + rng() * 0.05) * (rng() < 0.5 ? -1 : 1), a: rng() * 6.28 };
  return grp;
}

export function buildSky(scene, buildShip) {
  const rng = mulberry32(77);
  const dome = skyDome(); scene.add(dome);

  // the sister Tatu, hanging huge and close
  const big = planet(520, planetTexture(3.1, { sea: 0.5, water: [50, 110, 165], land: [96, 150, 92], high: [170, 160, 120] }), 0x9fd6ff,
    new THREE.Vector3(-1500, 980, -2300));
  const wild = planet(260, planetTexture(8.7, { sea: 0.44, water: [60, 95, 120], land: [128, 140, 60], high: [150, 82, 52] }), 0xffb38a,
    new THREE.Vector3(1900, 620, -1500));
  scene.add(big, wild);
  // Kalo — the moons
  const kalo = [];
  [[60, -600, 1150, -2600, 0xd8d0c4], [34, 900, 1400, -2100, 0xb7c2d6], [22, 2300, 300, 900, 0xe6c9a8]].forEach(([r, x, y, z, c]) => {
    const tex = planetTexture(r * 0.37, { sea: 0.62, water: [140, 140, 150], land: [190, 184, 170], high: [215, 210, 200] });
    const k = planet(r, tex, c, new THREE.Vector3(x, y, z)); scene.add(k); kalo.push(k);
  });
  // a distant ringed wanderer of Pia'don
  const ringed = planet(90, planetTexture(12.2, { sea: 0.3, water: [200, 140, 90], land: [220, 170, 110], high: [240, 210, 160] }), 0xffd9a0,
    new THREE.Vector3(2600, 1500, 1400));
  const ring = new THREE.Mesh(new THREE.RingGeometry(130, 210, 96, 1), new THREE.MeshBasicMaterial({ color: 0xf0d2a0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false, depthWrite: false }));
  ring.rotation.x = 1.2; ring.rotation.y = 0.3; ringed.add(ring); scene.add(ringed);

  // the sun's disc glow
  const sun = glowSprite(0xffd7a0, 900, 0.9);
  sun.position.copy(SUN_DIR).multiplyScalar(3800); sun.material.fog = false; scene.add(sun);

  [big, wild, ringed, ...kalo].forEach(p => p.traverse(o => { if (o.material) o.material.fog = false; }));

  const sea = cloudSea(); scene.add(sea);

  // puffy cloud banks drifting around the highland's skirts
  const puffs = new THREE.Group();
  const puffMat = new THREE.MeshToonMaterial({ color: 0xffe9d4, emissive: 0x6a3a40, emissiveIntensity: 0.25 });
  for (let i = 0; i < 46; i++) {
    const a = rng() * Math.PI * 2, r = 330 + rng() * 650;
    const bank = new THREE.Group();
    const n = 3 + Math.floor(rng() * 5);
    for (let j = 0; j < n; j++) {
      const s = 14 + rng() * 26;
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), puffMat);
      b.position.set((j - n / 2) * s * 0.9 + rng() * 6, rng() * s * 0.4, (rng() - 0.5) * s);
      b.scale.y = 0.55;
      bank.add(b);
    }
    bank.position.set(Math.cos(a) * r, -150 + rng() * 120, Math.sin(a) * r);
    bank.userData.drift = 0.6 + rng() * 1.4;
    puffs.add(bank);
  }
  scene.add(puffs);

  const flocks = [];
  for (let i = 0; i < 4; i++) { const f = flock(rng); flocks.push(f); scene.add(f); }

  // a far-off fire-tree ship crossing the etherium, solar sails catching the light
  let farShip = null;
  if (buildShip) {
    farShip = buildShip({ scale: 2.2 });
    scene.add(farShip.group);
  }

  return {
    dome,
    update(t, dt, camPos) {
      dome.material.uniforms.uTime.value = t;
      dome.position.copy(camPos);
      sea.material.uniforms.uTime.value = t;
      big.userData.ball.rotation.y = t * 0.004;
      wild.userData.ball.rotation.y = -t * 0.006;
      puffs.children.forEach(b => {
        b.position.x += b.userData.drift * dt;
        if (b.position.x > 1000) b.position.x = -1000;
      });
      flocks.forEach(f => {
        const u = f.userData; u.a += u.sp * dt;
        f.position.set(Math.cos(u.a) * u.r, u.h, Math.sin(u.a) * u.r);
        f.rotation.y = -u.a + (u.sp > 0 ? Math.PI : 0);
        u.birds.forEach(b => { b.scale.y = 1.6 * Math.sin(t * 9 + b.userData.ph) * 0.9; });
      });
      if (farShip) {
        const a = t * 0.012;
        farShip.group.position.set(Math.cos(a) * 900, 140 + Math.sin(t * 0.2) * 6, Math.sin(a) * 900 - 200);
        farShip.group.rotation.y = -a;
        farShip.update(t, dt);
      }
    },
  };
}
