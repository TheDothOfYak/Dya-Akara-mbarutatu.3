/* ============================================================
   Look & feel: hand-painted toon shading, ink outlines, glow
   sprites and a light CPU particle system.
   ============================================================ */
import * as THREE from 'three';

/* a 4-band light ramp — the "painted cel" look */
let RAMP = null;
export function ramp() {
  if (RAMP) return RAMP;
  const data = new Uint8Array([70, 140, 205, 255]);
  RAMP = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  RAMP.minFilter = RAMP.magFilter = THREE.NearestFilter;
  RAMP.needsUpdate = true;
  return RAMP;
}

/* painted surface detail for a toon material (see smooth.js): 'stone' | 'plaster' | 'wood' | 'shingle' | 'cobble' | 'land' */
const PAINT_KINDS = { stone: 1, plaster: 2, wood: 3, shingle: 4, cobble: 5, land: 6 };
export function paint(mat, kind) {
  mat.defines = Object.assign({}, mat.defines, { FL_PAINT: PAINT_KINDS[kind] || 1 });
  mat.needsUpdate = true;
  return mat;
}

export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: ramp() }, opts));
}

/* the film look's coloured ink lines are always on (1); kept as a uniform so a line can still blend */
export const STYLE = { on: { value: 1 } };

/* inverted-hull ink outline that respects fog. With the film style on, the line takes a deep
   shade of the colour it rings (`tint`) instead of plain ink, the way coloured-line cel art does. */
const outlineCache = new Map();
export function outlineMaterial(thickness = 0.04, color = 0x1a1008, tint = null) {
  const key = thickness + ':' + color + ':' + tint;
  if (outlineCache.has(key)) return outlineCache.get(key);
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uColor: { value: new THREE.Color(color) }, uThick: { value: thickness * 0.6 }, uTint: { value: new THREE.Color(tint ?? color) },   // a fine, painted line
    }]),
    vertexShader: `
      uniform float uThick;
      #include <fog_pars_vertex>
      void main() {
        vec3 p = position + normal * uThick;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uTint; uniform float uStyle;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(mix(uColor, uTint, uStyle), 1.0);
        #include <fog_fragment>
      }`,
    side: THREE.BackSide, fog: true,
  });
  m.uniforms.uStyle = STYLE.on;
  outlineCache.set(key, m);
  return m;
}

/* the deep shade of a material's own colour, for its line (null when it has no plain colour) */
function inkFor(mat, color) {
  if (Array.isArray(mat) || !mat || !mat.color) return null;
  const ink = mat.userData && mat.userData.ink;     // a textured material can name the colour its line should follow
  if (ink == null && (mat.map || mat.vertexColors)) return null;   // its colour lives in a texture or the vertices
  const c = new THREE.Color(ink ?? mat.color), base = new THREE.Color(color ?? 0x1a1008);
  c.multiplyScalar(0.28).lerp(base, 0.35);
  return c.getHex();
}

export function addOutline(mesh, thickness = 0.04, color) {
  const o = new THREE.Mesh(mesh.geometry, outlineMaterial(thickness, color, inkFor(mesh.material, color)));
  o.name = 'outline';
  o.castShadow = false; o.receiveShadow = false;
  mesh.add(o);
  return o;
}

/* outline every mesh in a group (skipping glows/transparent bits) */
export function outlineAll(root, thickness = 0.035) {
  const list = [];
  root.traverse(o => { if (o.isMesh && !o.userData.noOutline && !(o.material && o.material.transparent)) list.push(o); });
  list.forEach(m => addOutline(m, thickness));
}

export function shadowAll(root, cast = true, receive = true) {
  root.traverse(o => { if (o.isMesh && o.name !== 'outline') { o.castShadow = cast; o.receiveShadow = receive; } });
}

/* soft round glow, used by sprites and particles */
let GLOW = null;
export function glowTexture() {
  if (GLOW) return GLOW;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  GLOW = new THREE.CanvasTexture(c);
  GLOW.colorSpace = THREE.SRGBColorSpace;
  return GLOW;
}

/* a soft sheet of mist: no glow, no hard centre — it greys the view rather than lighting it */
let MIST = null;
export function mistSprite(color = 0xe8eef4, w = 30, h = 9, opacity = 0.35) {
  if (!MIST) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    for (let i = 0; i < 9; i++) {   // a few overlapping puffs, so it reads as a cloud and not a disc
      const x = 34 + Math.random() * 60, y = 50 + Math.random() * 28, r = 26 + Math.random() * 22;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,0.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    }
    MIST = new THREE.CanvasTexture(c); MIST.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: MIST, color, transparent: true, opacity, depthWrite: false }));
  s.scale.set(w, h, 1); s.userData.noOutline = true;
  return s;
}

export function glowSprite(color, size = 1, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  s.scale.set(size, size, size);
  s.userData.noOutline = true;
  return s;
}

/* ============================================================
   Particles — one Points cloud, CPU-simulated, additive glow.
   ============================================================ */
export class Particles {
  constructor(scene, max = 2500) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.baseSize = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: glowTexture() }, uScale: { value: 400 } },
      vertexShader: `
        attribute float size; attribute float alpha; attribute vec3 color;
        varying vec3 vCol; varying float vA;
        uniform float uScale;
        void main() {
          vCol = color; vA = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uMap; varying vec3 vCol; varying float vA;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vCol * t.rgb, t.a * vA);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    scene.add(this.points);
    this.tmpC = new THREE.Color();
  }

  emit(x, y, z, o = {}) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    const sp = o.speed ?? 2;
    const vx = o.vx ?? (Math.random() - 0.5) * sp, vy = o.vy ?? (Math.random() - 0.2) * sp, vz = o.vz ?? (Math.random() - 0.5) * sp;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.tmpC.set(o.color ?? 0xffa040);
    this.col[i3] = this.tmpC.r; this.col[i3 + 1] = this.tmpC.g; this.col[i3 + 2] = this.tmpC.b;
    this.life[i] = this.maxLife[i] = o.life ?? 1;
    this.baseSize[i] = o.size ?? 0.4;
    this.grav[i] = o.gravity ?? 0;
    this.drag[i] = o.drag ?? 1.5;
    this.alpha[i] = 1;
  }

  burst(x, y, z, n, o = {}) { for (let k = 0; k < n; k++) this.emit(x, y, z, o); }

  /* a flat ring of particles flying outward */
  ring(x, y, z, n, speed, o = {}) {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      this.emit(x, y, z, Object.assign({}, o, { vx: Math.cos(a) * speed, vy: o.vy ?? 0.4, vz: Math.sin(a) * speed }));
    }
  }

  update(dt) {
    const n = this.max;
    for (let i = 0; i < n; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; this.size[i] = 0; continue; }
      this.life[i] -= dt;
      const i3 = i * 3, k = Math.exp(-this.drag[i] * dt);
      this.vel[i3] *= k; this.vel[i3 + 2] *= k;
      this.vel[i3 + 1] = this.vel[i3 + 1] * k + this.grav[i] * dt;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = Math.min(1, t * 2.2);
      this.size[i] = this.baseSize[i] * (0.35 + 0.65 * t);
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = a.color.needsUpdate = a.size.needsUpdate = a.alpha.needsUpdate = true;
  }

  setScale(px) { this.points.material.uniforms.uScale.value = px; }
}
