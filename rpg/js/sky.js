/* ============================================================
   The open sky of the Mbaru Tatu: a golden-hour etherium with
   daylight stars and nebula, the sister Tatu hanging close
   overhead, their Kalo, high cloud banks — and, driven by
   daynight.js, dawn, golden day, dusk and a blue-violet night with
   Pia'don's outer cloud as a pale band across the stars.
   ============================================================ */
import * as THREE from 'three';
import { fbm, mulberry32 } from './util.js';
import { glowSprite } from './gfx.js';
import { noSolid } from './solid.js';

/* SUN_DIR is the LIVE direction toward the shadow-casting light (sun by day, Velki-shine by
   night). daynight.js rewrites it every frame; main places the DirectionalLight along it.
   SKY_SUN is the true sun (sky glow, sun disc, planet lighting) — it can sit below the horizon. */
export const SUN_DIR = new THREE.Vector3(-0.55, 0.32, 0.77).normalize();
export const SKY_SUN = SUN_DIR.clone();

const NOISE_GLSL = `
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x){
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += n3(p) * a; p *= 2.02; a *= 0.5; } return s; }
`;

function skyDome(pal) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: SKY_SUN }, uTime: { value: 0 }, uFlash: { value: 0 },
      uSunVis: { value: 1 }, uStars: { value: 1 }, uNeb: { value: 1 }, uBand: { value: 0 }, uNight: { value: 0 },
      uZen: { value: new THREE.Vector3(...pal.zen) }, uMid: { value: new THREE.Vector3(...pal.mid) },
      uHor: { value: new THREE.Vector3(...pal.hor) }, uLow: { value: new THREE.Vector3(...pal.low) },
      uGlow: { value: new THREE.Vector3(...pal.glow) }, uStorm: { value: pal.storm },
    },
    vertexShader: `
      varying vec3 vDir;
      void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      varying vec3 vDir; uniform vec3 uSun; uniform float uTime; uniform float uFlash; uniform float uStorm;
      uniform float uSunVis, uStars, uNeb, uBand, uNight;
      uniform vec3 uZen, uMid, uHor, uLow, uGlow;
      ${NOISE_GLSL}
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 zen = uZen, mid = uMid, hor = uHor, low = uLow;
        vec3 col;
        if (h > 0.0) col = mix(mix(hor, mid, smoothstep(0.0, 0.28, h)), zen, smoothstep(0.28, 0.95, h));
        else col = mix(hor, low, smoothstep(0.0, -0.35, h));
        float s = max(dot(d, uSun), 0.0);
        col += uGlow * pow(s, 6.0) * 0.55 * uSunVis;
        col += vec3(1.0, 0.92, 0.75) * pow(s, 900.0) * 6.0 * uSunVis * step(-0.02, uSun.y);
        // the etherium: nebula wisps and stars, visible even by day
        float up = mix(smoothstep(0.04, 0.55, h), smoothstep(-0.02, 0.25, h), uNight) * (1.0 - pow(s, 3.0) * uSunVis);
        float neb = fbm3(d * 2.6 + vec3(0.0, uTime * 0.004, 0.0));
        float neb2 = fbm3(d * 5.0 + vec3(9.1, 2.3, uTime * 0.006));
        vec3 nebCol = mix(vec3(0.55, 0.20, 0.55), vec3(0.12, 0.55, 0.62), neb2);
        col += nebCol * smoothstep(0.48 - uNight * 0.06, 0.78, neb) * 0.55 * up * uNeb;
        // Pia'don's outer cloud: a pale, lumpy band arching across the night
        vec3 bn = normalize(vec3(0.42, 0.38, -0.82));
        float bd = dot(d, bn);
        float bandN = fbm3(d * 7.0 + vec3(3.0, 1.0, uTime * 0.002));
        float band = exp(-bd * bd / 0.018) * (0.45 + 0.9 * bandN) + exp(-bd * bd / 0.0025) * 0.35;
        col += vec3(0.78, 0.76, 0.92) * band * 0.22 * uBand * up;
        vec3 sp = floor(d * 380.0);
        float st = h3(sp);
        // each star twinkles on its own beat (the old phase came from the same hash that picks which cells are stars,
        // so every star shared it — they all dimmed at once and the sky went out)
        float tw = 0.72 + 0.28 * sin(uTime * (1.1 + 1.9 * h3(sp + 5.0)) + h3(sp + 11.0) * 6.2832);
        float thr = mix(0.9965, 0.9945, uNight) - band * 0.0015 * uBand;
        vec3 stCol = mix(vec3(1.0, 0.95, 0.85), mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.8, 0.7), h3(sp + 7.0)), uNight);
        float pd = length(fract(d * 380.0) - 0.5);
        col += stCol * step(thr, st) * smoothstep(0.5, 0.12, pd) * tw * up * 1.9 * uStars * (0.4 + 0.6 * h3(sp + 3.0)) * (1.0 - uStorm * 0.8);
        // storm banks rolling across the sky, lit by lightning
        if (uStorm > 0.0) {
          float cl = fbm3(vec3(d.x * 3.0 + uTime * 0.01, d.y * 6.0, d.z * 3.0));
          float bank = smoothstep(0.42, 0.7, cl) * smoothstep(-0.05, 0.25, h) * uStorm;
          col = mix(col, vec3(0.16, 0.2, 0.22) + vec3(0.7, 0.75, 0.9) * uFlash * cl, bank * 0.85);
          col += vec3(0.6, 0.65, 0.9) * uFlash * 0.25 * smoothstep(-0.1, 0.4, h);
        }
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

const PLANET_LIFT = { value: 0 };   // shared: planets glow a touch brighter against the night
function planet(radius, tex, atmo, pos) {
  const grp = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: tex }, uSun: { value: SKY_SUN }, uAtmo: { value: new THREE.Color(atmo) }, uLift: PLANET_LIFT },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uSun; uniform vec3 uAtmo; uniform float uLift;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        vec3 base = texture2D(uMap, vUv).rgb;
        float l = dot(normalize(vN), uSun);
        float band = l > 0.35 ? 1.0 : l > 0.05 ? 0.72 : l > -0.2 ? 0.42 : 0.24;
        float rim = pow(clamp(1.0 - dot(normalize(vN), normalize(vV)), 0.0, 1.0), 2.5);   // (clamped: a dot a hair over 1 made pow() NaN, and the bloom smeared it into black squares)
        vec3 col = base * (band + uLift) + uAtmo * rim * (0.9 + uLift);
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

/* little flocks of far-off Albali Byrds wheeling around: a round body and two wings that beat */
function flock(rng) {
  const grp = new THREE.Group();
  const wingGeo = side => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.22, 0, 0, -0.16, side * 1.05, 0, -0.02], 3));
    return g;
  };
  const wR = wingGeo(1), wL = wingGeo(-1), bodyGeo = new THREE.SphereGeometry(0.2, 6, 4);
  const mat = new THREE.MeshBasicMaterial({ color: 0x3b2a2a, side: THREE.DoubleSide, fog: true });
  const birds = [];
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Group();
    const L = new THREE.Mesh(wL, mat), R = new THREE.Mesh(wR, mat);
    b.add(new THREE.Mesh(bodyGeo, mat), L, R);
    b.position.set((rng() - 0.5) * 18, (rng() - 0.5) * 5, (rng() - 0.5) * 18);
    b.scale.setScalar(1.6);
    b.userData = { ph: rng() * 6, rate: 7 + rng() * 3, by: b.position.y, L, R };
    grp.add(b); birds.push(b);
  }
  grp.userData = { birds, r: 260 + rng() * 260, h: 40 + rng() * 80, sp: (0.04 + rng() * 0.05) * (rng() < 0.5 ? -1 : 1), a: rng() * 6.28 };
  return grp;
}

export const SKY_PALETTES = {
  golden: { zen: [0.045, 0.075, 0.2], mid: [0.22, 0.3, 0.52], hor: [1.0, 0.68, 0.42], low: [0.98, 0.55, 0.45], glow: [1.0, 0.62, 0.3], storm: 0,
    puff: 0xffe9d4 },
  storm: { zen: [0.03, 0.06, 0.09], mid: [0.12, 0.22, 0.26], hor: [0.55, 0.62, 0.5], low: [0.3, 0.4, 0.36], glow: [0.75, 0.8, 0.55], storm: 1,
    puff: 0x9aa8a4 },
};

export function buildSky(scene, buildShip, palName = 'golden') {
  const pal = SKY_PALETTES[palName];
  const rng = mulberry32(77);
  const before = new Set(scene.children);
  const dome = skyDome(pal); scene.add(dome);

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
  sun.position.copy(SKY_SUN).multiplyScalar(3800); sun.material.fog = false; scene.add(sun);

  [big, wild, ringed, ...kalo].forEach(p => p.traverse(o => { if (o.material) o.material.fog = false; }));

  // high cloud banks drifting far overhead (no cloud sea below — the Tatu are whole worlds)
  const puffs = new THREE.Group();
  const puffBase = new THREE.Color(pal.puff), puffEmis = new THREE.Color(0x6a3a40);
  const puffMat = new THREE.MeshToonMaterial({ color: pal.puff, emissive: 0x6a3a40, emissiveIntensity: 0.25 });
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI * 2, r = 520 + rng() * 1100;
    const bank = new THREE.Group();
    const n = 3 + Math.floor(rng() * 5);
    for (let j = 0; j < n; j++) {
      const s = 18 + rng() * 32;
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), puffMat);
      b.position.set((j - n / 2) * s * 0.9 + rng() * 6, rng() * s * 0.4, (rng() - 0.5) * s);
      b.scale.y = 0.42;
      bank.add(b);
    }
    bank.position.set(Math.cos(a) * r, 230 + rng() * 260 + r * 0.08, Math.sin(a) * r);
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

  for (const o of scene.children) if (!before.has(o)) noSolid(o);   // the sky: nothing up there to bump into

  let flash = 0, flashT = 3;
  const U = dome.material.uniforms;
  const api = {
    dome, flash: 0, thunder: false, palette: palName,
    /* daynight.js drives the look: sky colours (linear-ish [r,g,b] in the dome's pre-gamma space),
       star / nebula / Pia'don band strength, how visible the sun is, and a 0..1 night factor. */
    setTime(st) {
      U.uZen.value.fromArray(st.zen); U.uMid.value.fromArray(st.mid); U.uHor.value.fromArray(st.hor);
      U.uLow.value.fromArray(st.low); U.uGlow.value.fromArray(st.glow);
      U.uStars.value = st.stars; U.uNeb.value = st.neb; U.uBand.value = st.band; U.uNight.value = st.night;
      U.uSunVis.value = st.sunVis;
      sun.position.copy(SKY_SUN).multiplyScalar(3800);
      sun.material.opacity = 0.9 * st.sunVis;
      sun.visible = st.sunVis > 0.01;
      PLANET_LIFT.value = st.night * 0.35;
      // clouds: lit by the scene lights, plus a little self-tint so they read against the night
      puffMat.color.copy(puffBase).lerp(st.cloudNight, st.night * 0.7);
      puffMat.emissive.copy(puffEmis).lerp(st.cloudGlow, Math.max(st.night, st.twilight));
      puffMat.emissiveIntensity = 0.25 + st.twilight * 0.25 - st.night * 0.05;
    },
    update(t, dt, camPos) {
      dome.material.uniforms.uTime.value = t;
      api.thunder = false;
      if (pal.storm) {
        flashT -= dt;
        if (flashT <= 0) { flashT = 5 + Math.random() * 10; flash = 1; api.thunder = true; }
        flash = Math.max(0, flash - dt * 2.5);
        api.flash = flash * (0.55 + 0.45 * Math.random());
        dome.material.uniforms.uFlash.value = api.flash;
      }
      dome.position.copy(camPos);
      big.userData.ball.rotation.y = t * 0.004;
      wild.userData.ball.rotation.y = -t * 0.006;
      puffs.children.forEach(b => {
        b.position.x += b.userData.drift * dt;
        if (b.position.x > 1700) b.position.x = -1700;
      });
      flocks.forEach(f => {
        const u = f.userData; u.a += u.sp * dt;
        f.position.set(Math.cos(u.a) * u.r, u.h, Math.sin(u.a) * u.r);
        f.rotation.y = -u.a + (u.sp > 0 ? Math.PI : 0);
        u.birds.forEach(b => {
          // a few strong beats, then a short glide with the wings held out
          const d = b.userData, c = (t * 0.35 + d.ph) % 3, beat = c < 2 ? Math.sin(t * d.rate + d.ph) : 0.15;
          d.R.rotation.z = beat * 0.75; d.L.rotation.z = -beat * 0.75;
          b.position.y = d.by - beat * 0.25;
        });
      });
      if (farShip) {
        const a = t * 0.012;
        farShip.group.position.set(Math.cos(a) * 900, 140 + Math.sin(t * 0.2) * 6, Math.sin(a) * 900 - 200);
        farShip.group.rotation.y = -a;
        farShip.update(t, dt);
      }
    },
  };
  return api;
}
