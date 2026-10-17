/* ============================================================
   The Etherium texture pack — a Treasure Planet look laid over
   every toon material: oil-paint brushwork, planked wood grain,
   etched brass, cool violet shadows against warm amber light, a
   hot rim of backlight, and a painted-canvas grade over the frame.
   Nothing is loaded from disk: the brushwork is baked once into a
   tileable texture and projected in object space (triplanar), so
   it lands on every primitive whatever its UVs. Toggled live by
   one shared uniform; no shader recompiles.
   ============================================================ */
import * as THREE from 'three';
import { mulberry32 } from './util.js';

const N = 512;
const PACK = { on: { value: 1 }, tex: { value: null } };

/* four greyscale layers packed into one RGBA texture:
   R brush strokes · G canvas weave · B wood grain · A brass filigree */
function bake() {
  const rng = mulberry32(1997);
  const layer = draw => {
    const c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'); draw(g);
    return g.getImageData(0, 0, N, N).data;
  };
  /* draw at the nine wrapped offsets so the tile has no seams */
  const wrap = (g, x, y, fn) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { g.save(); g.translate(x + ox, y + oy); fn(g); g.restore(); } };

  // R: loose oil-paint strokes laid in two crossing directions, each with bristle streaks
  const R = layer(g => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 1100; i++) {
      const x = rng() * N, y = rng() * N, len = 18 + rng() * 80, w = 5 + rng() * 18;
      const a = (rng() < 0.6 ? -0.5 : 0.9) + (rng() - 0.5) * 0.7, l = Math.round(70 + rng() * 120), al = 0.12 + rng() * 0.3;
      const bristles = [];
      for (let k = 0; k < 4; k++) bristles.push([(rng() - 0.5) * w * 0.8, Math.round(l + (rng() - 0.5) * 70)]);
      wrap(g, x, y, s => {
        s.rotate(a);
        s.globalAlpha = al; s.fillStyle = `rgb(${l},${l},${l})`;
        s.beginPath(); s.ellipse(0, 0, len / 2, w / 2, 0, 0, Math.PI * 2); s.fill();
        s.globalAlpha = al * 0.8; s.lineWidth = 1 + w * 0.08;
        for (const [o, bl] of bristles) { s.strokeStyle = `rgb(${bl},${bl},${bl})`; s.beginPath(); s.moveTo(-len * 0.45, o); s.lineTo(len * 0.45, o * 0.6); s.stroke(); }
      });
    }
  });

  // G: the canvas the whole world is painted on — a fine weave with grain
  const G = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const weave = Math.sin(x * Math.PI / 2) * Math.sin(y * Math.PI / 2);
    G[(y * N + x) * 4] = 128 + weave * 30 + (rng() - 0.5) * 50;
  }

  // B: ship-deck wood — long wavy grain lines, darker rings and a few knots (all periodic, so it tiles)
  const knots = [...Array(5)].map(() => [rng() * N, rng() * N, 10 + rng() * 14]);
  const B = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, T = Math.PI * 2;
    let f = v * 22 + Math.sin(u * T * 2 + Math.sin(v * T * 3) * 1.5) * 0.9 + Math.sin(u * T * 5) * 0.25;
    for (const [kx, ky, kr] of knots) {
      const dx = ((x - kx + N * 1.5) % N) - N / 2, dy = ((y - ky + N * 1.5) % N) - N / 2, d = Math.hypot(dx, dy * 1.8);
      f += Math.max(0, 1 - d / (kr * 3)) * 3 * Math.sin(d * 0.6);
    }
    const ring = 0.5 + 0.5 * Math.sin(f * T), fine = 0.5 + 0.5 * Math.sin(f * T * 7 + u * 40);
    B[(y * N + x) * 4] = 255 * (0.25 + 0.45 * Math.pow(ring, 3) + 0.2 * fine + 0.1 * rng());
  }

  // A: engraved brass — scrolling filigree, banded borders and rivets
  const A = layer(g => {
    g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = rng() * N, y = rng() * N, r0 = 10 + rng() * 22, turns = 1.4 + rng() * 1.3, dir = rng() < 0.5 ? 1 : -1, rot = rng() * 6.28;
      wrap(g, x, y, s => {
        s.rotate(rot); s.lineWidth = 2.2; s.globalAlpha = 0.9; s.beginPath();
        for (let t = 0; t <= turns * 6.28; t += 0.08) { const r = r0 * (1 - t / (turns * 7.5)); const px = Math.cos(t * dir) * r + t * 3, py = Math.sin(t * dir) * r; t ? s.lineTo(px, py) : s.moveTo(px, py); }
        s.stroke();
        s.lineWidth = 1.4; s.beginPath(); s.ellipse(r0 * 1.6, -r0 * 0.5, r0 * 0.5, r0 * 0.2, 0.6, 0, Math.PI * 2); s.stroke();   // a leaf off the scroll
      });
    }
    g.globalAlpha = 1; g.lineWidth = 3;
    for (const b of [0, N / 2]) { g.beginPath(); g.moveTo(0, b + 6); g.lineTo(N, b + 6); g.moveTo(0, b + 16); g.lineTo(N, b + 16); g.stroke(); }
    for (let x = 16; x < N; x += 32) for (const b of [0, N / 2]) { g.beginPath(); g.arc(x, b + 11, 3.2, 0, Math.PI * 2); g.fill(); }
  });

  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N * 4; i += 4) { data[i] = R[i]; data[i + 1] = G[i]; data[i + 2] = B[i]; data[i + 3] = A[i]; }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}

const VERT_PARS = 'varying vec3 vTpP; varying vec3 vTpN;\n';
const VERT = `#include <begin_vertex>
  vTpP = position; vTpN = normal;
  #ifdef USE_INSTANCING
    vTpP += instanceMatrix[3].xyz * 0.37;   // instanced rocks and trees each get their own patch of brushwork
  #endif`;

const FRAG_PARS = `varying vec3 vTpP; varying vec3 vTpN;
uniform sampler2D uTpTex; uniform float uTpOn;
vec4 tpSample(vec3 p, vec3 w) {
  return texture2D(uTpTex, p.zy) * w.x + texture2D(uTpTex, p.xz) * w.y + texture2D(uTpTex, p.xy) * w.z;
}
vec3 tpHsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-5)), d / (q.x + 1e-5), q.x);
}
float tpBand(float x, float a, float b, float s) { return smoothstep(a - s, a + s, x) * (1.0 - smoothstep(b - s, b + s, x)); }
`;

/* paint the surface: what it is made of is read from its own colour */
const FRAG_ALBEDO = `#include <color_fragment>
  float tpBrass = 0.0;
  if (uTpOn > 0.001) {
    vec3 tw = pow(abs(normalize(vTpN)), vec3(4.0)); tw /= dot(tw, vec3(1.0));
    vec4 near = tpSample(vTpP * 0.42, tw);
    vec4 far = tpSample(vTpP * 0.055 + 0.31, tw);
    vec3 hsv = tpHsv(pow(max(diffuseColor.rgb, 0.0), vec3(1.0 / 2.2)));
    float wood = tpBand(hsv.x, 0.025, 0.12, 0.02) * smoothstep(0.25, 0.4, hsv.y) * tpBand(hsv.z, 0.12, 0.72, 0.06);
    tpBrass = tpBand(hsv.x, 0.09, 0.17, 0.015) * smoothstep(0.5, 0.62, hsv.y) * smoothstep(0.55, 0.7, hsv.z);
    float leaf = tpBand(hsv.x, 0.17, 0.46, 0.03) * smoothstep(0.18, 0.3, hsv.y);
    float stone = 1.0 - smoothstep(0.1, 0.22, hsv.y);
    wood *= 1.0 - tpBrass;
    // oil paint everywhere: strokes, broad mottling, the canvas showing through
    float m = mix(1.0, 0.74 + 0.52 * near.r, 0.6 + 0.25 * leaf) * (0.86 + 0.28 * far.r) * (0.95 + 0.1 * near.g);
    m = mix(m, m * (0.82 + 0.36 * far.g), stone * 0.6);
    m *= mix(1.0, 0.7 + 0.45 * near.b, wood);                       // planks and spars
    m *= mix(1.0, 1.0 - 0.45 * near.a, tpBrass);                    // engraved brass
    vec3 c = diffuseColor.rgb * m;
    // warm and cool brushwork against each other, the way the painted backgrounds do it
    c *= mix(vec3(1.06, 0.99, 0.9), vec3(0.92, 0.98, 1.08), smoothstep(0.35, 0.65, far.r) * 0.8 + leaf * 0.2 * near.r);
    c = mix(c, c * vec3(0.9, 1.04, 0.86), leaf * smoothstep(0.5, 0.8, near.r) * 0.5);   // yellow-green and blue-green dabs in leaves
    c *= mix(vec3(1.0), vec3(1.08, 0.94, 0.82), wood * 0.6);         // rich, oiled timber
    diffuseColor.rgb = mix(diffuseColor.rgb, c, uTpOn);
  }`;

/* light it like a Brandywine painting: violet shadows, amber light, a hot backlit rim, cel glints on brass */
const FRAG_LIGHT = `
  if (uTpOn > 0.001) {
    float tpL = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
    vec3 graded = outgoingLight * mix(vec3(0.84, 0.86, 1.12), vec3(1.07, 1.0, 0.88), smoothstep(0.04, 0.55, tpL));
    vec3 vd = normalize(vViewPosition);
    float rim = 1.0 - max(dot(normal, vd), 0.0);
    float floorish = smoothstep(0.55, 0.9, normalize(vTpN).y);
    float rimBand = smoothstep(0.62, 0.7, rim) * (1.0 - floorish);
    graded += diffuseColor.rgb * vec3(1.0, 0.72, 0.42) * rimBand * 0.32;
    float glint = smoothstep(0.82, 0.86, dot(normal, normalize(vec3(0.35, 0.75, 0.55))));
    graded += vec3(1.0, 0.86, 0.55) * tpBrass * (0.35 * glint + 0.12 * rimBand);
    outgoingLight = mix(outgoingLight, graded, uTpOn);
  }
  #include <opaque_fragment>`;

let installed = false;
/* patch every MeshToonMaterial (call once, before the first frame). Materials that bring their
   own onBeforeCompile — the seas, rivers and grass — keep their own look. */
export function installTexturePack(on = true) {
  PACK.on.value = on ? 1 : 0;
  if (installed) return;
  installed = true;
  PACK.tex.value = bake();
  THREE.MeshToonMaterial.prototype.onBeforeCompile = function (sh) {
    sh.uniforms.uTpTex = PACK.tex; sh.uniforms.uTpOn = PACK.on;
    sh.vertexShader = VERT_PARS + sh.vertexShader.replace('#include <begin_vertex>', VERT);
    sh.fragmentShader = FRAG_PARS + sh.fragmentShader
      .replace('#include <color_fragment>', FRAG_ALBEDO)
      .replace('#include <opaque_fragment>', FRAG_LIGHT);
  };
}

export function setTexturePack(on) { PACK.on.value = on ? 1 : 0; }

/* ---------------- the grade over the whole frame ---------------- */
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uOn: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uOn; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 c = src.rgb;
      float L = dot(c, vec3(0.299, 0.587, 0.114));
      c += vec3(0.010, 0.004, 0.028) * (1.0 - smoothstep(0.0, 0.3, L));                  // shadows lift into deep indigo
      c *= mix(vec3(0.93, 0.95, 1.08), vec3(1.06, 1.0, 0.9), smoothstep(0.03, 0.7, L));   // cool shade, golden light
      c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.12);                          // a richer palette
      vec2 q = vUv - 0.5; q.x *= uRes.x / max(uRes.y, 1.0);
      float vig = smoothstep(0.42, 1.05, length(q) * 1.15);
      c = mix(c, c * vec3(0.62, 0.52, 0.72), vig * 0.55);                                 // a violet vignette, like an old plate
      vec2 px = floor(vUv * uRes / 2.0);
      c *= 0.985 + 0.03 * h(px);                                                          // the canvas grain, still, so it never crawls
      gl_FragColor = vec4(mix(src.rgb, max(c, 0.0), uOn), src.a);
    }`,
};

/* a pass to slot in before the OutputPass of any composer; it follows the pack's toggle */
export function gradePass(ShaderPass) {
  const p = new ShaderPass(GradeShader);
  p.uniforms.uOn = PACK.on;
  const setSize = p.setSize.bind(p);
  p.setSize = (w, h) => { setSize(w, h); p.uniforms.uRes.value.set(w, h); };
  return p;
}
