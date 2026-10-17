/* ============================================================
   The painted frame: a Kuwahara oil-paint filter over the whole
   picture. Each pixel takes the average colour of whichever of
   its four neighbouring patches is the most even, so flat areas
   settle into daubs of paint while edges (faces, silhouettes,
   rooflines) stay crisp — the hand-painted backgrounds of a
   classic animated feature. Slot it in before the OutputPass.
   ============================================================ */
import * as THREE from 'three';

const R = matchMedia('(pointer: coarse)').matches ? 1 : 2;   // patch radius in pixels: lighter on phones

const PaintShader = {
  uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    #define R ${R}
    uniform sampler2D tDiffuse; uniform vec2 uTexel; varying vec2 vUv;
    void quad(vec2 o, inout vec3 best, inout float bestV, float a) {
      vec3 m = vec3(0.0), s = vec3(0.0);
      for (int j = 0; j <= R; j++) for (int i = 0; i <= R; i++) {
        vec3 c = texture2D(tDiffuse, vUv + (o * vec2(float(i), float(j))) * uTexel).rgb;
        c = c / (1.0 + c);            // compare in a tamed range, so bright glows don't dominate
        m += c; s += c * c;
      }
      float n = float((R + 1) * (R + 1));
      m /= n; s = abs(s / n - m * m);
      float v = s.r + s.g + s.b;
      if (v < bestV) { bestV = v; best = m; }
    }
    void main(){
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 best = vec3(0.0); float bestV = 1e9;
      quad(vec2(-1.0, -1.0), best, bestV, 0.0);
      quad(vec2( 1.0, -1.0), best, bestV, 0.0);
      quad(vec2(-1.0,  1.0), best, bestV, 0.0);
      quad(vec2( 1.0,  1.0), best, bestV, 0.0);
      vec3 painted = best / max(vec3(1e-4), 1.0 - best);
      gl_FragColor = vec4(painted, src.a);
    }`,
};

export function paintPass(ShaderPass) {
  const p = new ShaderPass(PaintShader);
  const setSize = p.setSize.bind(p);
  p.setSize = (w, h) => { setSize(w, h); p.uniforms.uTexel.value.set(1 / Math.max(1, w), 1 / Math.max(1, h)); };
  return p;
}
