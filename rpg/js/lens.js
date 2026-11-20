/* ============================================================
   The lens — what the camera adds to the painted world:
   · contact shade: where things meet (a foot and the ground, a
     wall and the street, a root and the earth, leaf against
     leaf) the light can't get in, and it darkens, cool. Read
     from the picture's own depth, so everything in every region
     gets it for nothing;
   · shafts: where open sky shows between the camera and the sun,
     its light streams across the picture;
   · the grade: a firmer contrast, a little more colour, cool
     shadows under warm lights, a touch of sharpening after the
     brushwork, and the corners of the frame eased down.
   Add them to a composer, in order:
     withDepth(composer)
     RenderPass → depthTap → [bloom] → shadePass → [paint] → gradePass → OutputPass
   ============================================================ */
import * as THREE from 'three';
import { Pass } from 'three/addons/postprocessing/Pass.js';

const COARSE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
export const LENS = { ao: true, grade: true, shafts: true, brush: false };
const _sv = new THREE.Vector3(), _sp = new THREE.Vector3();

/* give a composer's two buffers a depth picture each to read back (call once the composer is made, before it draws).
   Each gets its own: a cloned target's depth texture would share the first one's, and reading it while drawing loops. */
export function withDepth(composer) {
  for (const rt of [composer.renderTarget1, composer.renderTarget2]) {
    rt.depthTexture = new THREE.DepthTexture(rt.width, rt.height);
    rt.depthTexture.type = THREE.UnsignedIntType;
  }
  return composer;
}

/* remembers which buffer the scene was just drawn into (the composer swaps them about) */
export class DepthTap extends Pass {
  constructor() { super(); this.needsSwap = false; this.depth = null; }
  render(renderer, writeBuffer, readBuffer) { this.depth = readBuffer.depthTexture || null; }
}

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const N_TAPS = COARSE ? 6 : 10;

class ShadePass extends Pass {
  constructor(camera, tap) {
    super();
    this.camera = camera; this.tap = tap;
    this.sun = null;   // { dir: the live direction toward the sun, light: the sun's own light } — set it and its light streams (shafts)
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) },
        uProj: { value: new THREE.Matrix4() }, uProjInv: { value: new THREE.Matrix4() },
        uStrength: { value: 1 }, uRadius: { value: 0.75 }, uShade: { value: new THREE.Color(0.36, 0.38, 0.52) },
        uSunUv: { value: new THREE.Vector2(0.5, 0.5) }, uSunK: { value: 0 }, uSunCol: { value: new THREE.Color(1, 0.85, 0.6) },
      },
      vertexShader: VERT,
      fragmentShader: `
        #define TAPS ${N_TAPS}
        #define RAYS ${COARSE ? 8 : 18}
        uniform vec2 uSunUv; uniform float uSunK; uniform vec3 uSunCol;
        uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform vec2 uTexel; uniform mat4 uProj; uniform mat4 uProjInv;
        uniform float uStrength; uniform float uRadius; uniform vec3 uShade; varying vec2 vUv;
        vec3 vpos(vec2 uv) {
          float d = texture2D(tDepth, uv).x;
          vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
          return v.xyz / v.w;
        }
        float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
        /* shafts of light: where the open sky shows between here and the sun, its light streams across the picture */
        vec3 shafts() {
          if (uSunK <= 0.0) return vec3(0.0);
          vec2 dv = uSunUv - vUv; float asp = uTexel.y / uTexel.x;
          float near = 1.0 - smoothstep(0.15, 1.05, length(dv * vec2(asp, 1.0)));
          if (near <= 0.0) return vec3(0.0);
          vec2 st = dv / float(RAYS) * 0.9; vec2 u = vUv + st * ign(gl_FragCoord.xy + 17.0); float acc = 0.0;
          for (int i = 0; i < RAYS; i++) { acc += step(0.99999, texture2D(tDepth, u).x) * (1.0 - float(i) / float(RAYS)); u += st; }
          float a = acc / float(RAYS);
          return uSunCol * a * (1.0 - a * 0.6) * near * near * near * uSunK;   // strongest where sky and shadow mix (the shafts), never a wash over everything
        }
        void main() {
          vec4 src = texture2D(tDiffuse, vUv);
          vec3 sh = shafts();
          float d = texture2D(tDepth, vUv).x;
          if (d >= 0.99999) { gl_FragColor = vec4(src.rgb + sh * 0.5, src.a); return; }
          vec3 p = vpos(vUv);
          float dist = -p.z;
          float fade = 1.0 - smoothstep(60.0, 220.0, dist);
          if (fade <= 0.0) { gl_FragColor = vec4(src.rgb + sh, src.a); return; }
          // the surface's facing, from the depth round it (the nearer neighbour each way, so edges stay clean)
          vec3 px1 = vpos(vUv + vec2(uTexel.x, 0.0)) - p, px0 = p - vpos(vUv - vec2(uTexel.x, 0.0));
          vec3 py1 = vpos(vUv + vec2(0.0, uTexel.y)) - p, py0 = p - vpos(vUv - vec2(0.0, uTexel.y));
          vec3 dx = abs(px1.z) < abs(px0.z) ? px1 : px0, dy = abs(py1.z) < abs(py0.z) ? py1 : py0;
          vec3 n = normalize(cross(dx, dy));
          float R = uRadius * (1.0 + dist * 0.035);
          float sr = min(0.5 * R * uProj[1][1] / dist, 0.09);                 // the radius on the screen (in v)
          float asp = uTexel.x / uTexel.y, rot = ign(gl_FragCoord.xy) * 6.2831853, occ = 0.0;
          for (int i = 0; i < TAPS; i++) {
            float fi = float(i), r = sqrt((fi + 0.5) / float(TAPS)) * sr, a = rot + fi * 2.3999632;
            vec3 q = vpos(vUv + vec2(cos(a) * asp, sin(a)) * r) - p;
            float l = length(q) + 1e-4;
            occ += max(0.0, dot(n, q) / l - 0.07) * (1.0 - smoothstep(R * 0.8, R * 2.4, l));
          }
          float ao = clamp(1.0 - occ / float(TAPS) * 3.4 * uStrength, 0.0, 1.0);
          ao = mix(1.0, ao * ao * (3.0 - 2.0 * ao) * 0.9 + ao * 0.1, fade);
          ao = mix(ao, 1.0, smoothstep(1.2, 3.0, max(src.r, max(src.g, src.b))));   // glows aren't shaded
          gl_FragColor = vec4(src.rgb * mix(uShade, vec3(1.0), ao) + sh, src.a);
          #ifdef LENS_DEBUG
            gl_FragColor = vec4(vec3(ao), 1.0);
          #endif
        }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize(w, h) { this.material.uniforms.uTexel.value.set(1 / Math.max(1, w), 1 / Math.max(1, h)); }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture; u.tDepth.value = this.tap.depth;
    u.uProj.value.copy(this.camera.projectionMatrix); u.uProjInv.value.copy(this.camera.projectionMatrixInverse);
    u.uSunK.value = 0;
    if (this.sun && this.sun.dir && LENS.shafts) {
      const v = _sv.copy(this.sun.dir).transformDirection(this.camera.matrixWorldInverse);
      if (v.z < -0.08) {   // the sun is ahead of the camera
        _sp.copy(this.camera.position).addScaledVector(this.sun.dir, 1000).project(this.camera);
        u.uSunUv.value.set(_sp.x * 0.5 + 0.5, _sp.y * 0.5 + 0.5);
        const L = this.sun.light;
        u.uSunK.value = 0.22 * Math.min(1, -v.z * 2.5) * (L ? Math.min(1, L.intensity / 2.2) : 1) * Math.min(1, Math.max(0, this.sun.dir.y * 6 + 0.4));
        if (L) u.uSunCol.value.copy(L.color).multiplyScalar(0.9);
      }
    }
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    renderer.render(this.quad, this.qcam);
  }
}
export function shadePass(camera, tap) { return new ShadePass(camera, tap); }

class GradePass extends Pass {
  constructor() {
    super();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) },
        uSharp: { value: COARSE ? 0.2 : 0.38 }, uSat: { value: 1.05 }, uContrast: { value: 1.09 }, uVig: { value: 0.3 },
        uCool: { value: new THREE.Color(0.93, 0.975, 1.09) }, uWarm: { value: new THREE.Color(1.05, 1.012, 0.945) },
      },
      vertexShader: VERT,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uSharp; uniform float uSat; uniform float uContrast; uniform float uVig;
        uniform vec3 uCool; uniform vec3 uWarm; varying vec2 vUv;
        void main() {
          vec4 src = texture2D(tDiffuse, vUv);
          vec3 c = src.rgb;
          // a touch of sharpening, measured in a tamed range so glows don't ring
          vec3 nb = (texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb
                   + texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb) * 0.25;
          vec3 ct = c / (1.0 + c), nt = nb / (1.0 + nb);
          ct = clamp(ct + (ct - nt) * uSharp, 0.0, 0.97); c = ct / (1.0 - ct);
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = max(mix(vec3(l), c, uSat), 0.0);                                   // colour
          { float mxc = max(c.r, max(c.g, c.b)), mnc = min(c.r, min(c.g, c.b)), st = (mxc - mnc) / max(mxc, 1e-3);
            c = mix(c, vec3(l), smoothstep(0.6, 1.0, st) * 0.3); }                // the loudest colours brought back toward what a camera sees
          c *= mix(uCool, uWarm, smoothstep(0.03, 0.75, l));                     // cool shadows, warm lights
          c = mix(pow(c / 0.2, vec3(uContrast)) * 0.2, c, smoothstep(0.5, 1.6, l)); // contrast, about a mid grey (bright haze and glows left as they are)
          vec2 q = (vUv - 0.5) * vec2(1.0, 0.82);
          c *= 1.0 - uVig * smoothstep(0.32, 0.86, length(q));                    // the corners eased down
          gl_FragColor = vec4(c, src.a);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize(w, h) { this.material.uniforms.uTexel.value.set(1 / Math.max(1, w), 1 / Math.max(1, h)); }
  render(renderer, writeBuffer, readBuffer) {
    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    renderer.render(this.quad, this.qcam);
  }
}
export function gradePass() { return new GradePass(); }

/* the whole chain on a composer whose RenderPass is already in: returns { tap, shade, grade } */
export function addLens(composer, camera, { bloom = null, paint = null, output = null } = {}) {
  withDepth(composer);
  const tap = new DepthTap(), shade = shadePass(camera, tap), grade = gradePass();
  composer.addPass(tap);
  if (bloom) composer.addPass(bloom);
  composer.addPass(shade);
  if (paint && LENS.brush) composer.addPass(paint);   // the oil-paint filter: only for the painted look
  composer.addPass(grade);
  if (output) composer.addPass(output);
  return { tap, shade, grade };
}
