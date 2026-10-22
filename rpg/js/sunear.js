/* ============================================================
   The Sunear'Zikhron — the Waves of Memory.

   A storm that has always existed and has never been weak. It
   circles the Mbaru Tatu carrying memory itself, and it must
   touch every inch of a Tatu before it passes through the Duat
   to the next. When it rolls over a region:
     - bands of memory-light pour across the sky and the land dims;
     - RubberMcFly gather and glow (the only time they ever do);
     - echoes of folk who once walked here walk past again;
     - somewhere the storm has an eye. Find it and keep pace with
       it, and what lives there gives a true prophecy.
   This file owns the look of it (sky, eye, motes, echoes); main.js
   decides when it comes and what the eye says.
   ============================================================ */
import * as THREE from 'three';
import { smooth, damp, dampAngle } from './util.js';
import { buildNpc } from './npcs.js';
import { noSolid } from './solid.js';

const RAMP_IN = 22, RAMP_OUT = 24;

function wavesMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 0 }, uDir: { value: new THREE.Vector2(1, 0) } },
    vertexShader: `varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uT, uK; uniform vec2 uDir; varying vec3 vD;
      void main() {
        vec3 d = normalize(vD);
        float along = dot(d.xz, uDir), across = dot(d.xz, vec2(-uDir.y, uDir.x));
        float up = smoothstep(-0.04, 0.22, d.y) * (1.0 - smoothstep(0.75, 1.0, d.y) * 0.6);
        // long rolling waves travelling with the storm, folded by slower crosswise swells
        float s = along * 7.0 + d.y * 3.5 + sin(across * 5.0 + uT * 0.21) * 0.9;
        float w1 = smoothstep(0.55, 1.0, sin(s * 2.0 - uT * 0.85));
        float w2 = smoothstep(0.7, 1.0, sin(s * 3.3 - uT * 1.3 + across * 2.0)) * 0.6;
        float shimmer = 0.6 + 0.4 * sin(across * 40.0 + along * 23.0 + uT * 3.0);
        vec3 gold = vec3(1.0, 0.86, 0.55), violet = vec3(0.72, 0.56, 1.0), cyan = vec3(0.55, 0.9, 1.0);
        vec3 col = mix(mix(violet, gold, 0.5 + 0.5 * sin(s * 0.7 + uT * 0.3)), cyan, w2);
        float a = (w1 * shimmer + w2) * up * 0.55 + up * 0.07;
        gl_FragColor = vec4(col * a * uK, 1.0);
      }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
}

function eyeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 0 } },
    vertexShader: `varying vec2 vU; void main() { vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uT, uK; varying vec2 vU;
      void main() {
        float fadeUp = smoothstep(0.0, 0.04, vU.y) * (1.0 - smoothstep(0.35, 1.0, vU.y));
        float streak = 0.55 + 0.45 * sin(vU.x * 6.2832 * 9.0 + vU.y * 18.0 - uT * 1.6);
        float a = fadeUp * streak * 0.42 * uK;
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.78) * a, 1.0);
      }`,
    side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
}

/* an echo: one of the folk who once walked here, made of memory-light */
function echoActor(look, seed) {
  const a = buildNpc({ id: 'echo' + seed, look });
  const mat = new THREE.MeshBasicMaterial({ color: 0xbfe2ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  a.root.traverse(o => {
    if (!o.isMesh && !o.isSprite) return;
    if (o.name === 'outline' || o.isSprite) { o.visible = false; return; }
    o.material = mat; o.castShadow = false; o.receiveShadow = false;
  });
  return { a, mat };
}

export function createSunear({ scene, particles, world, region }) {
  const R = 760;
  const waves = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 24), wavesMaterial());
  waves.frustumCulled = false; waves.renderOrder = -1; waves.visible = false; scene.add(noSolid(waves));   // the storm is light and memory: nothing in it to bump

  const EYE_R = 9;
  const eye = noSolid(new THREE.Group()); eye.visible = false; scene.add(eye);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(EYE_R, EYE_R * 1.6, 220, 40, 1, true), eyeMaterial());
  column.position.y = 110; column.frustumCulled = false; eye.add(column);
  const ring = new THREE.Mesh(new THREE.RingGeometry(EYE_R - 0.4, EYE_R, 48), new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; eye.add(ring);

  const looks = region === 'aakalay' ? ['keilia', 'keilia', 'duro', 'hemla'] : region === 'leotik' ? ['keilia', 'duro', 'ruut', 'hemla'] : ['buhkon', 'ruut', 'hemla', 'duro'];
  const echoes = [];

  const S = { active: false, t: 0, dur: 0, k: 0, dir: 0, eyeOn: false, eyePos: new THREE.Vector3(), eyeYaw: 0, echoT: 6, seed: 1 };
  const okLand = (x, z) => !world.inBounds || world.inBounds(x, z);

  function placeEye(near) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 50, x = near.x + Math.cos(a) * d, z = near.z + Math.sin(a) * d;
      if (!okLand(x, z) || (world.water && world.water.isWater(x, z))) continue;
      S.eyePos.set(x, world.heightAt(x, z), z); S.eyeYaw = Math.atan2(-x, -z) + (Math.random() - 0.5); return;
    }
    S.eyePos.set(near.x + 40, world.heightAt(near.x + 40, near.z), near.z);
  }

  function spawnEcho(cam) {
    if (echoes.length >= 4) return;
    const a = Math.random() * Math.PI * 2, d = 14 + Math.random() * 16;
    const x = cam.x + Math.cos(a) * d, z = cam.z + Math.sin(a) * d;
    if (!okLand(x, z) || (world.water && world.water.isWater(x, z))) return;
    const e = echoActor(looks[Math.floor(Math.random() * looks.length)], S.seed++);
    e.pos = new THREE.Vector3(x, world.col.ground(x, z, world.heightAt(x, z) + 2), z);
    e.yaw = Math.random() * Math.PI * 2; e.life = 7 + Math.random() * 4; e.age = 0;
    e.a.root.position.copy(e.pos); scene.add(e.a.root); echoes.push(e);
  }

  const api = {
    EYE_R,
    get active() { return S.active; },
    get k() { return S.k; },
    get eyeOn() { return S.eyeOn && S.k > 0.6; },
    get eyePos() { return S.eyePos; },
    get remaining() { return S.active ? S.dur - S.t : 0; },
    /* the storm arrives from a direction and stays for `dur` seconds */
    start(near, dur = 160) {
      if (S.active) return;
      S.active = true; S.t = 0; S.dur = dur; S.dir = Math.random() * Math.PI * 2;
      waves.material.uniforms.uDir.value.set(Math.cos(S.dir), Math.sin(S.dir));
      waves.visible = true; S.eyeOn = false; S.echoT = 8;
      placeEye(near);
    },
    end() { if (S.active && S.t < S.dur - RAMP_OUT) S.t = S.dur - RAMP_OUT; },
    inEye(p) { return api.eyeOn && Math.hypot(p.x - S.eyePos.x, p.z - S.eyePos.z) < EYE_R; },
    update(dt, t, cam) {
      if (!S.active && !echoes.length && !eye.visible && !waves.visible) return;
      if (S.active) {
        S.t += dt;
        S.k = smooth(0, RAMP_IN, S.t) * (1 - smooth(S.dur - RAMP_OUT, S.dur, S.t));
        if (S.t >= S.dur) { S.active = false; S.k = 0; }
      }
      waves.position.copy(cam); waves.visible = S.k > 0.002;
      waves.material.uniforms.uT.value = t; waves.material.uniforms.uK.value = S.k;

      // the eye drifts at a walking pace, turning back from anywhere you couldn't follow it
      S.eyeOn = S.active && S.t > RAMP_IN + 6 && S.t < S.dur - RAMP_OUT;
      if (S.eyeOn) {
        S.eyeYaw += (Math.sin(t * 0.23) * 0.12 + Math.sin(t * 0.071 + 2) * 0.08) * dt;
        const lx = S.eyePos.x + Math.sin(S.eyeYaw) * 14, lz = S.eyePos.z + Math.cos(S.eyeYaw) * 14;
        if (!okLand(lx, lz) || (world.water && world.water.isWater(lx, lz))) S.eyeYaw = dampAngle(S.eyeYaw, Math.atan2(-S.eyePos.x, -S.eyePos.z), 1.5, dt);
        const sp = 2.7;
        S.eyePos.x += Math.sin(S.eyeYaw) * sp * dt; S.eyePos.z += Math.cos(S.eyeYaw) * sp * dt;
        S.eyePos.y = damp(S.eyePos.y, world.heightAt(S.eyePos.x, S.eyePos.z), 4, dt);
      }
      const ek = S.eyeOn ? S.k : damp(column.material.uniforms.uK.value, 0, 3, dt);
      eye.visible = ek > 0.01; eye.position.copy(S.eyePos);
      column.material.uniforms.uT.value = t; column.material.uniforms.uK.value = ek;
      ring.material.opacity = ek * (0.35 + 0.15 * Math.sin(t * 2));
      ring.rotation.z = t * 0.2;

      // motes of memory-light blowing through, thicker at the storm's height
      const n = S.k * 3;
      for (let i = 0; i < n; i++) if (Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2, d = 4 + Math.random() * 26;
        particles.emit(cam.x + Math.cos(a) * d, cam.y - 1 + Math.random() * 6, cam.z + Math.sin(a) * d,
          { vx: Math.cos(S.dir) * 4, vy: 0.4 + Math.random(), vz: Math.sin(S.dir) * 4, color: Math.random() < 0.5 ? 0xfff0c0 : 0xc8b4ff, size: 0.25, life: 1.6, speed: 0.6 });
      }

      // echoes of the folk who walked here, walking it again
      if (S.k > 0.7 && (S.echoT -= dt) <= 0) { S.echoT = 5 + Math.random() * 6; spawnEcho(cam); }
      for (let i = echoes.length - 1; i >= 0; i--) {
        const e = echoes[i]; e.age += dt;
        const vis = smooth(0, 1.2, e.age) * (1 - smooth(e.life - 1.6, e.life, e.age)) * Math.max(S.k, 0.2);
        e.mat.opacity = vis * 0.42;
        e.pos.x += Math.sin(e.yaw) * 1.3 * dt; e.pos.z += Math.cos(e.yaw) * 1.3 * dt;
        e.pos.y = world.col.ground(e.pos.x, e.pos.z, e.pos.y + 1);
        e.a.root.position.copy(e.pos); e.a.root.rotation.y = e.yaw;
        e.a.animate(dt, { speed: 1.3, onGround: true, t: t + i });
        if (e.age >= e.life) { scene.remove(e.a.root); echoes.splice(i, 1); }
      }
    },
  };
  return api;
}
