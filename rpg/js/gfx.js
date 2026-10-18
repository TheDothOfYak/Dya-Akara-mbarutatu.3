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

/* painted surface detail for a toon material (see smooth.js): 'stone' | 'plaster' | 'wood' | 'shingle' | 'cobble' | 'land' | 'cloth' | 'brick' */
const PAINT_KINDS = { stone: 1, plaster: 2, wood: 3, shingle: 4, cobble: 5, land: 6, cloth: 7, brick: 8 };
export function paint(mat, kind) {
  mat.defines = Object.assign({}, mat.defines, { FL_PAINT: PAINT_KINDS[kind] || 1 });
  mat.needsUpdate = true;
  return mat;
}

/* draw a whole model like the film's hand-animated cast: crisp two-tone shading (see smooth.js) */
export function celAll(root) {
  root.traverse(o => {
    if (!o.isMesh || o.name === 'outline') return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m && m.isMeshToonMaterial && !(m.defines && m.defines.FL_CEL)) { m.defines = Object.assign({}, m.defines, { FL_CEL: 1 }); m.needsUpdate = true; }
    }
  });
  return root;
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

/* a teardrop flame tongue: round base at y=0, pointed tip at y=h, the tip leaning along +x */
function flameTongue(h, w, lean = 0, seg = 8) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, r = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.9) * Math.pow(1 - t, 0.35);
    pts.push(new THREE.Vector2(Math.max(r * w * 1.2, 0.0001), t * h));
  }
  const g = new THREE.LatheGeometry(pts, seg), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = p.getY(i) / h; p.setX(i, p.getX(i) + lean * h * t * t); }
  g.computeVertexNormals();
  return g;
}
/* a real campfire: a ring of stones, a teepee of logs (charred where they meet), and flames that lick and
   flicker — red outside, orange, a yellow-white heart — with a soft glow over it. update(t) makes it burn;
   set the group's visible to put it out. */
export function buildCampfire(scale = 1) {
  const g = new THREE.Group(); g.scale.setScalar(scale);
  const stone = toon(0x8a8278), stone2 = toon(0x6e675e), log = toon(0x5a3a22), ash = toon(0x2a1c14);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.19, 0), i % 3 ? stone : stone2);
    s.position.set(Math.cos(a) * 0.78, 0.09, Math.sin(a) * 0.78); s.scale.set(1.25, 0.75, 1); s.rotation.set(i, i * 2.3, 0); g.add(s);
  }
  const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.06, 14), ash); bed.position.y = 0.03; g.add(bed);
  const top = new THREE.Vector3(0, 0.78, 0);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.3, foot = new THREE.Vector3(Math.cos(a) * 0.5, 0.04, Math.sin(a) * 0.5), len = foot.distanceTo(top);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, len, 6).rotateX(Math.PI / 2), log);
    m.position.copy(foot).lerp(top, 0.5); m.lookAt(top); g.add(m);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), ash); tip.position.copy(foot).lerp(top, 0.82); g.add(tip);
  }
  const flameM = (c, op, add) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
  const outer = flameM(0xe8501a, 0.92), mid = flameM(0xff9a2a, 0.95), core = flameM(0xffe7a0, 0.9, true);
  const tongues = [];
  const tongue = (h, w, x, z, lean, ry, mat) => {
    const m = new THREE.Mesh(flameTongue(h, w, lean), mat); m.position.set(x, 0.06, z); m.rotation.y = ry; m.renderOrder = 2; m.userData.noOutline = true; g.add(m);
    tongues.push({ m, ph: Math.random() * 6.3, f: 7 + Math.random() * 7, h0: 1 }); return m;
  };
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; tongue(0.75 + (i % 2) * 0.3, 0.2, Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0.25, -a, outer); }
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.6; tongue(0.85 + (i % 2) * 0.25, 0.15, Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0.18, -a, mid); }
  tongue(1.25, 0.16, 0, 0, 0.05, 0, mid);
  tongue(0.7, 0.1, 0, 0, 0.04, 0, core);
  const glow = glowSprite(0xff8a3a, 3.2, 0.55); glow.position.y = 0.7; g.add(glow);
  g.userData.update = t => {
    for (const T of tongues) {
      const s = 0.82 + Math.sin(t * T.f + T.ph) * 0.14 + Math.sin(t * T.f * 2.3 + T.ph * 1.7) * 0.08;
      T.m.scale.set(1 + (1 - s) * 0.4, s, 1 + (1 - s) * 0.4);
      T.m.rotation.z = Math.sin(t * 3.1 + T.ph) * 0.08; T.m.rotation.x = Math.sin(t * 2.7 + T.ph * 2) * 0.08;
    }
    glow.material.opacity = 0.45 + Math.sin(t * 9) * 0.06 + Math.sin(t * 23) * 0.04;
  };
  return g;
}
