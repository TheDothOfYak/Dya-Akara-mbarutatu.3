/* ============================================================
   A STORY SCENE KIT — the pieces every one of Tanoc's set-piece
   places shares: a sky (or the dark of a cave), a ground mesh,
   colliders with tops and bottoms, a light third-person walker who
   swims and dives, a hatchet and a fire-stone, companions who walk
   with him, creatures to fight or flee, things to pick up, and a
   camera. The caves under the lake, the Megla Aagac, the meteor
   crater and the night the Sniller woke are each built on this.

   main.js lends a scene the renderer, camera, input, dialogue and
   cards (the ctx); the scene file lays out its own land and beats.
   ============================================================ */
import * as THREE from 'three';
import { toon, addOutline, glowSprite, Particles } from './gfx.js';
import { buildEikar } from './actors.js';
import { buildWildPunk, buildKofi, buildRodak, buildGynge, buildMalstiPunk, buildDomesticPunk } from './esik_land.js';
import { buildHarkal, buildGrothyn } from './esik_sea.js';
import { buildVel } from './creatures.js';
import { NPC_LOOKS } from './npcs.js';
import { clamp, damp, dampAngle, lerp, mulberry32, fbm } from './util.js';

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const TAU = Math.PI * 2;
export { toon, addOutline, glowSprite, clamp, lerp, mulberry32, fbm };

/* what each kind of creature is, in a story scene */
const FOES = {
  kofi: { build: s => buildKofi({ seed: s }), hp: 1, speed: 5.6, dmg: 0, reach: 0, ai: 'flee', col: 0xc8a070 },
  rodak: { build: s => buildRodak({ seed: s }), hp: 45, speed: 7, dmg: 9, reach: 2.2, ai: 'circle', col: 0x3a3a4a },
  wildpunk: { build: s => { const a = buildWildPunk({ seed: s }); return a; }, hp: 40, speed: 5.4, dmg: 6, reach: 1.9, ai: 'melee', col: 0xffb040 },
  vel: { build: () => buildVel(), hp: 60, speed: 6, dmg: 10, reach: 2.2, ai: 'melee', col: 0xb070ff },
  malsti: { build: s => buildMalstiPunk({ seed: s }), hp: 14, speed: 6.5, dmg: 0, reach: 0, ai: 'flee', col: 0xb070ff },
  gynge: { build: () => buildGynge(), hp: 420, speed: 3.6, dmg: 18, reach: 4.0, ai: 'boss', col: 0x8a8070, rad: 2.4 },
  harkal: { build: s => buildHarkal({ seed: s }), hp: 50, speed: 7.5, dmg: 8, reach: 2.2, ai: 'melee', swim: true, col: 0x6a8aa0 },
  grothyn: { build: s => buildGrothyn({ seed: s }), hp: 80, speed: 2, dmg: 0, reach: 0, ai: 'idle', swim: true, col: 0x8aa0a0 },
  shard: { build: () => buildShard(), hp: 40, speed: 0, dmg: 0, reach: 0, ai: 'idle', col: 0xff7a7a, rad: 0.8 },
};
/* a splinter of a broken Relic, glowing where it's weak */
function buildShard() {
  const root = new THREE.Group();
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), toon(0x3a1a2a, { emissive: 0xff4a5a, emissiveIntensity: 0.8 })); m.scale.y = 2.2; m.position.y = 1.6; addOutline(m, 0.05); root.add(m);
  const g = glowSprite(0xff6a6a, 4, 0.6); g.position.y = 1.6; root.add(g);
  return { root, animate(dt, st) { m.rotation.y += dt; g.material.opacity = 0.4 + Math.sin((st.t || 0) * 6) * 0.25; }, flash(v) { m.material.emissiveIntensity = 0.8 + v; } };
}

export function createMini(ctx, opt) {
  const { camera, keys, touch, CAM, sfx } = ctx;
  const scene = new THREE.Scene();
  const rng = mulberry32(opt.seed || 77);
  const heightAt = opt.heightAt;
  const fog = new THREE.Fog(opt.fog != null ? opt.fog : 0xcfe0f0, opt.fogNear || 90, opt.fogFar || 600); scene.fog = fog;

  /* ---------------- sky, or the dark ---------------- */
  const skyU = { uTop: { value: new THREE.Color(opt.skyTop || 0x4a8ad8) }, uLow: { value: new THREE.Color(opt.skyLow || 0xd8ecff) }, uSun: { value: V3(0.3, 0.8, 0.2).normalize() }, uDim: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 uTop, uLow, uSun; uniform float uDim;
      void main(){ float h = max(vD.y, 0.0); vec3 c = mix(uLow, uTop, smoothstep(0.0, 0.6, h));
        float s = max(dot(vD, uSun), 0.0); c += vec3(1.0, 0.85, 0.6) * (pow(s, 8.0) * 0.35 + pow(s, 300.0) * 1.4) * (1.0 - uDim);
        if (vD.y < 0.0) c = uLow * 0.8; gl_FragColor = vec4(c * (1.0 - uDim * 0.85), 1.0); }`,
  }));
  if (!opt.dark) scene.add(sky);
  const hemi = new THREE.HemisphereLight(opt.hemiSky || 0xcfe6ff, opt.hemiGround || 0x5a6a3a, opt.dark ? 0.35 : 1.15); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, opt.dark ? 0.25 : 2.2); sun.castShadow = !opt.dark;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
  const SUN_DIR = V3(0.3, 0.8, 0.2).normalize();
  const torch = new THREE.PointLight(opt.torchColor || 0xffc890, opt.torch ? 2.4 : 0, opt.torchRange || 22); scene.add(torch);
  /* sky colours: { top, low, sun:[x,y,z], dim, fog, sunColor, sunI, hemiI } */
  function setSky(o) {
    if (o.top != null) skyU.uTop.value.set(o.top);
    if (o.low != null) skyU.uLow.value.set(o.low);
    if (o.sun) { SUN_DIR.set(...o.sun).normalize(); skyU.uSun.value.copy(SUN_DIR); }
    if (o.dim != null) skyU.uDim.value = o.dim;
    if (o.fog != null) fog.color.set(o.fog);
    if (o.fogNear != null) fog.near = o.fogNear; if (o.fogFar != null) fog.far = o.fogFar;
    if (o.sunColor != null) sun.color.set(o.sunColor);
    if (o.sunI != null) sun.intensity = o.sunI;
    if (o.hemiI != null) hemi.intensity = o.hemiI;
  }

  /* ---------------- the ground ---------------- */
  if (opt.ground) {
    const G = opt.ground, w = G.x1 - G.x0, l = G.z1 - G.z0;
    const geo = new THREE.PlaneGeometry(w, l, G.segX || Math.ceil(w / 2.4), G.segZ || Math.ceil(l / 2.4)); geo.rotateX(-Math.PI / 2); geo.translate((G.x0 + G.x1) / 2, 0, (G.z0 + G.z1) / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), y = heightAt(x, z); pos.setY(i, y); G.color(x, z, y, c); cols.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, side: opt.dark ? THREE.DoubleSide : THREE.FrontSide })); m.receiveShadow = true; scene.add(m);
  }
  /* water: one level everywhere it's below; a flat sheet */
  if (opt.waterLevel != null) {
    const wm = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshToonMaterial({ color: opt.waterColor || 0x3a8ab0, emissive: 0x0e3a52, emissiveIntensity: 0.35, transparent: true, opacity: 0.78 }));
    wm.rotation.x = -Math.PI / 2; wm.position.y = opt.waterLevel; wm.renderOrder = 1; scene.add(wm);
  }
  const waterAt = (x, z) => (opt.waterLevel != null && heightAt(x, z) < opt.waterLevel ? opt.waterLevel : null);

  /* ---------------- colliders ---------------- */
  const solids = [];
  const box = (x, z, hw, hd, y0, y1) => { const s = { kind: 'box', x, z, hw, hd, y0, y1, on: true }; solids.push(s); return s; };
  const cyl = (x, z, r, y0, y1) => { const s = { kind: 'cyl', x, z, r, y0, y1, on: true }; solids.push(s); return s; };
  const STEP = 0.65, PR = 0.4, PH = 1.5;
  const near = (s, x, z) => Math.abs(x - s.x) < 14 && Math.abs(z - s.z) < 14;
  function groundAt(x, z, y) {
    let g = heightAt(x, z);
    for (const s of solids) {
      if (!s.on || !near(s, x, z) || s.y1 > y + STEP || s.y1 <= g) continue;
      if (s.kind === 'box' ? Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd : Math.hypot(x - s.x, z - s.z) < s.r) g = s.y1;
    }
    return g;
  }
  function resolve(p, rad = PR) {
    for (const s of solids) {
      if (!s.on || !near(s, p.x, p.z) || p.y + PH < s.y0 || p.y >= s.y1 - STEP) continue;
      if (s.kind === 'box') {
        const dx = p.x - s.x, dz = p.z - s.z, ox = s.hw + rad - Math.abs(dx), oz = s.hd + rad - Math.abs(dz);
        if (ox > 0 && oz > 0) { if (ox < oz) p.x += Math.sign(dx || 1) * ox; else p.z += Math.sign(dz || 1) * oz; }
      } else {
        const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), m = s.r + rad;
        if (d < m) { if (d < 1e-4) p.x += m; else { p.x = s.x + dx / d * m; p.z = s.z + dz / d * m; } }
      }
    }
    if (opt.bounds) opt.bounds(p);
  }
  function solidAt(x, y, z) {
    for (const s of solids) {
      if (!s.on || !near(s, x, z) || y < s.y0 || y > s.y1) continue;
      if (s.kind === 'box' ? Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd : Math.hypot(x - s.x, z - s.z) < s.r) return true;
    }
    if (opt.ceilingAt) { const c = opt.ceilingAt(x, z); if (c != null && y > c - 0.3) return true; }
    return y < heightAt(x, z) + 0.2;
  }

  /* ---------------- particles and post ---------------- */
  const particles = new Particles(scene, 2500);
  const composer = ctx.makeComposer(scene);
  function resize() { particles.setScale(innerHeight * Math.min(devicePixelRatio, 1.75) * 0.9); }
  resize();

  /* ---------------- Tanoc ---------------- */
  const tanoc = buildEikar({
    skin: '#8a5a3a', cap: opt.newHat ? '#2e1c10' : '#4a3020', marking: 0xffb04a, markColor: 0x2a1208, emblem: 0xc89aff, build: 0.92 + (ctx.age || 0) * 0.04, capTall: opt.newHat ? 0.74 : 0.66,
    weapon: 'axe', flasks: false, leg: 0x4a3420, foot: 0x2a1a0c, beltColor: 0x5a3a1c, tunic: 0x7a5a3a, trim: 0xc89a5a, scale: 0.86 + (ctx.age || 0) * 0.035,
  });
  { const bl = tanoc.weapon.userData.blade; if (bl) { bl.material.color.setHex(0x9a9aa2); bl.material.emissiveIntensity = 0; } if (tanoc.weapon.userData.glow) tanoc.weapon.userData.glow.visible = false; }
  scene.add(tanoc.root);
  const P = { pos: V3(), vel: V3(), yaw: 0, onGround: true, coyote: 0, jumpBuf: 0, stepPh: 0, hp: 100, swing: 0, hitDone: false, iframes: 0, swim: false, under: false, breath: 1, fsCd: 0 };
  const camPos = V3(), camTgt = V3();
  let shake = 0, t = 0;

  /* ---------------- things to pick up or use ---------------- */
  const items = [];
  function addItem(pos, label, act, mesh, far = 2.6) { const it = { pos, label, act, mesh, far }; items.push(it); if (mesh) { mesh.position.copy(pos); scene.add(mesh); } return it; }
  function dropItem(it) { const i = items.indexOf(it); if (i >= 0) items.splice(i, 1); if (it.mesh) scene.remove(it.mesh); }
  const beacon = glowSprite(0xffd27a, 3, 0.9); scene.add(beacon); beacon.visible = false;
  function setGoal(x, y, z) { beacon.visible = x != null; if (x != null) beacon.position.set(x, y + 3, z); }

  /* ---------------- companions ---------------- */
  const friends = [];
  function addFriend(actor, o = {}) {
    scene.add(actor.root);
    const f = Object.assign({ actor, pos: V3(), yaw: 0, stay: null, on: true, side: 1.8, dist: 2.6, speed: 9.5, fight: false, dmg: 14, cd: 0, swing: 0 }, o);
    friends.push(f); return f;
  }
  const buildBuhkon = () => buildEikar(NPC_LOOKS.buhkon);
  const buildPunk = scale => { const a = buildDomesticPunk({ seed: 31 }); a.root.scale.multiplyScalar(scale || 0.55); return a; };
  const buildMalsti = () => { const a = buildMalstiPunk({ seed: 5 }); return a; };

  /* ---------------- creatures ---------------- */
  const foes = [];
  function addFoe(kind, x, z, o = {}) {
    const D = FOES[kind], a = D.build(Math.floor(rng() * 999));
    if (o.scale) a.root.scale.multiplyScalar(o.scale);
    scene.add(a.root);
    const hp = o.hp || D.hp;
    const f = Object.assign({ kind, D, a, pos: V3(x, groundAt(x, z, 60), z), vel: V3(), yaw: rng() * TAU, hp, max: hp, state: o.passive ? 'idle' : 'chase', timer: rng() * 2, windup: 0, flash: 0, dead: false, fled: false, cd: 1 + rng(), passive: !!o.passive, home: V3(x, 0, z) }, o);
    if (D.swim) f.pos.y = (waterAt(x, z) || 0) - 2.5;
    a.root.position.copy(f.pos); foes.push(f); return f;
  }
  function hitFoe(f, dmg, from, opts = {}) {
    if (f.dead || f.fled || f.immune) return;
    f.hp -= dmg; f.flash = 1; sfx.hit();
    if (f.passive) { f.passive = false; f.state = 'chase'; }
    if (!f.heavy) { const d = V3(f.pos.x - from.x, 0, f.pos.z - from.z).normalize(); f.vel.addScaledVector(d, opts.kb || 6); f.stun = 0.35; }
    particles.burst(f.pos.x, f.pos.y + 0.8, f.pos.z, 10, { color: f.D.col, speed: 6, size: 0.3, life: 0.4, gravity: -10 });
    if (f.onHit) f.onHit(f, dmg, opts);
    if (f.hp > 0) return;
    if (f.spare) { f.fled = true; f.state = 'flee'; f.timer = 3; f.hp = 1; if (f.onSpare) f.onSpare(f); return; }
    f.dead = true; f.deadT = 0; sfx.die();
    particles.burst(f.pos.x, f.pos.y + 1, f.pos.z, 26, { color: f.D.col, speed: 8, size: 0.45, life: 0.8, gravity: -6 });
    if (f.onDeath) f.onDeath(f);
  }
  function updateFoes(dt, playing) {
    for (const f of foes) {
      if (f.dead) { if (f.deadT != null) { f.deadT += dt; f.a.root.scale.multiplyScalar(Math.max(0.001, 1 - dt * 2)); if (f.deadT > 0.7) { scene.remove(f.a.root); f.deadT = null; } } continue; }
      f.flash = Math.max(0, f.flash - dt * 5); f.a.flash && f.a.flash(f.flash);
      f.stun = Math.max(0, (f.stun || 0) - dt);
      const dx = P.pos.x - f.pos.x, dz = P.pos.z - f.pos.z, d = Math.hypot(dx, dz);
      let want = 0, wy = f.yaw;
      const D = f.D;
      if (f.tick && f.tick(f, dt, d) === true) { /* the scene drives it */ }
      else if (f.state === 'flee') { wy = Math.atan2(-dx, -dz); want = D.speed * 1.2; f.timer -= dt; if (f.timer <= 0) { f.dead = true; scene.remove(f.a.root); continue; } }
      else if (f.passive || D.ai === 'idle' || !playing) {
        f.timer -= dt; if (f.timer <= 0) { f.timer = 2 + rng() * 3; f.wy = rng() * TAU; f.walk = rng() < 0.6; }
        const hx = f.home.x - f.pos.x, hz = f.home.z - f.pos.z;
        wy = Math.hypot(hx, hz) > 12 ? Math.atan2(hx, hz) : (f.wy || 0); want = f.walk && !f.still ? D.speed * 0.25 : 0;
        if (f.watch && d < 16) { wy = Math.atan2(dx, dz); want = 0; }
      } else if (D.ai === 'flee') {
        if (d < 11) { wy = Math.atan2(-dx, -dz) + Math.sin(t * 3 + f.pos.x) * 0.6; want = D.speed; }
        else { f.timer -= dt; if (f.timer <= 0) { f.timer = 2 + rng() * 3; f.wy = rng() * TAU; } wy = f.wy || 0; want = 1; }
      } else {
        const reach = D.reach + (D.rad || 0);
        if (f.state === 'windup') {
          f.timer -= dt; wy = Math.atan2(dx, dz); f.windup = 1 - f.timer / (f.wind || 0.55);
          if (f.timer <= 0) {
            f.state = 'recover'; f.timer = 0.7; f.windup = 0; f.attackA = 1;
            if (!f.heavy) { f.vel.x += Math.sin(f.yaw) * 7; f.vel.z += Math.cos(f.yaw) * 7; }
            const tgt = [[P.pos, null]].concat(friends.filter(q => q.on && q.fight).map(q => [q.pos, q])).sort((a, b) => a[0].distanceTo(f.pos) - b[0].distanceTo(f.pos))[0];
            if (!tgt[1] && d < reach + 0.8 && P.iframes <= 0) hurt(f.dmg != null ? f.dmg : D.dmg, f.pos);
            else if (tgt[1]) sfx.hit();
            if (f.onStrike) f.onStrike(f);
          }
        } else if (f.state === 'recover') { f.timer -= dt; f.attackA = Math.max(0, (f.attackA || 0) - dt * 3); if (f.timer <= 0) f.state = 'chase'; }
        else {
          f.cd -= dt; wy = Math.atan2(dx, dz);
          if (D.ai === 'circle' && d < 6 && f.cd > 0) { wy += Math.PI / 2; want = D.speed * 0.6; }
          else want = d > reach ? (f.speed || D.speed) : 0;
          if (d < reach + 0.4 && f.cd <= 0) { f.state = 'windup'; f.timer = f.wind || 0.55; f.cd = (f.rate || 1.4) + rng(); }
        }
      }
      if (f.stun > 0) want = 0;
      f.yaw = dampAngle(f.yaw, wy, 8, dt);
      f.vel.x = damp(f.vel.x, Math.sin(f.yaw) * want, 8, dt); f.vel.z = damp(f.vel.z, Math.cos(f.yaw) * want, 8, dt);
      f.pos.x += f.vel.x * dt; f.pos.z += f.vel.z * dt;
      resolve(f.pos, (D.rad || 0.6));
      if (D.swim) { const w = waterAt(f.pos.x, f.pos.z); if (w == null) { f.pos.x -= f.vel.x * dt; f.pos.z -= f.vel.z * dt; } else f.pos.y = clamp(lerp(f.pos.y, Math.min(P.under ? P.pos.y : w - 1.5, w - 0.8), 1 - Math.exp(-2 * dt)), heightAt(f.pos.x, f.pos.z) + 0.6, w - 0.6); }
      else if (!f.float) f.pos.y = groundAt(f.pos.x, f.pos.z, f.pos.y + 1) + (f.sink || 0);
      f.a.root.position.copy(f.pos); f.a.root.rotation.y = f.yaw;
      f.a.animate(dt, { speed: Math.hypot(f.vel.x, f.vel.z), t, windup: f.windup || 0, attack: f.attackA || 0 });
    }
  }
  function hurt(dmg, from) {
    P.hp -= dmg; P.iframes = 0.6; shake = Math.max(shake, 0.35); sfx.hurt();
    if (from) { const d = V3(P.pos.x - from.x, 0, P.pos.z - from.z).normalize(); P.vel.addScaledVector(d, 6); }
    if (P.hp <= 0) { if (opt.onDown) opt.onDown(); else { P.hp = 60; P.iframes = 1.5; ctx.toast('You drag yourself up. “Again.”', 3); } }
    ctx.hp(Math.max(0, P.hp) / 100);
  }

  /* ---------------- the fire-stone: a pebble in the dip, and it flies ---------------- */
  const shots = [];
  function fireStone() {
    if (!ctx.hasFireStone || !ctx.hasFireStone() || P.fsCd > 0 || P.under) return;
    P.fsCd = 1.1;
    const dir = V3(-Math.sin(CAM.yaw), 0, -Math.cos(CAM.yaw));
    let tgt = null, bd = 30;
    for (const f of foes) { if (f.dead || f.fled) continue; const v = V3(f.pos.x - P.pos.x, 0, f.pos.z - P.pos.z), d = v.length(); if (d < bd && v.normalize().dot(dir) > 0.75) { bd = d; tgt = f; } }
    const s = glowSprite(0xff8a2a, 1.1, 1); s.position.set(P.pos.x, P.pos.y + 1.3, P.pos.z); scene.add(s);
    const v = tgt ? V3(tgt.pos.x - P.pos.x, (tgt.pos.y + 0.8) - (P.pos.y + 1.3), tgt.pos.z - P.pos.z).normalize().multiplyScalar(26) : dir.multiplyScalar(26);
    shots.push({ s, v, life: 1.4 }); sfx.flare(); P.yaw = Math.atan2(v.x, v.z);
  }
  function updateShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const sh = shots[i]; sh.s.position.addScaledVector(sh.v, dt); sh.life -= dt;
      particles.emit(sh.s.position.x, sh.s.position.y, sh.s.position.z, { vx: 0, vy: 0.4, vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: 0.4, life: 0.4, drag: 1 });
      let hit = null;
      for (const f of foes) { if (f.dead || f.fled) continue; const r = (f.D.rad || 0.7) + 0.6; if (sh.s.position.distanceTo(V3(f.pos.x, f.pos.y + 0.9, f.pos.z)) < r + (f.mouth ? 1 : 0)) { hit = f; break; } }
      if (hit) { hitFoe(hit, hit.D.hp <= 1 ? 1 : 12, P.pos, { fire: true, kb: 3 }); particles.burst(sh.s.position.x, sh.s.position.y, sh.s.position.z, 20, { color: 0xff8a2a, speed: 6, size: 0.4, life: 0.5 }); }
      if (hit || sh.life <= 0 || solidAt(sh.s.position.x, sh.s.position.y, sh.s.position.z)) { scene.remove(sh.s); shots.splice(i, 1); }
    }
  }

  /* ---------------- the walker ---------------- */
  function attack() {
    if (!tanoc.weapon.visible || P.swing > 0 || P.under) return;
    P.swing = 0.42; P.hitDone = false; sfx.swing();
  }
  const breathBar = (() => {
    let el = document.getElementById('mini-breath');
    if (!el) { el = document.createElement('div'); el.id = 'mini-breath'; el.style.cssText = 'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);width:220px;height:8px;border:1px solid #9adfff;border-radius:6px;background:rgba(10,30,50,.6);z-index:15;display:none'; el.innerHTML = '<i style="display:block;height:100%;width:100%;background:#9adfff;border-radius:6px"></i>'; document.body.appendChild(el); }
    return el;
  })();
  function updatePlayer(dt, playing) {
    let ix = 0, iz = 0;
    if (playing) {
      if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1;
      if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
      if (touch && touch.on) { ix += touch.move.x; iz += touch.move.y; }
    }
    const len = Math.hypot(ix, iz);
    const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = -fz, rz = fx;
    let wx = 0, wz = 0;
    if (len > 0.08) { const k = Math.min(1, len) / len; wx = (fx * iz + rx * ix) * k; wz = (fz * iz + rz * ix) * k; }
    const run = keys.ShiftLeft || keys.ShiftRight;
    const w = waterAt(P.pos.x, P.pos.z);
    P.swim = w != null && P.pos.y < w - 0.9;
    const sp = P.swim ? (run ? 5.5 : 3.6) : (run ? 8.6 : 4.8) * (P.swing > 0 ? 0.35 : 1) * (opt.slow || 1);
    P.vel.x = damp(P.vel.x, wx * sp, P.onGround || P.swim ? 12 : 4, dt); P.vel.z = damp(P.vel.z, wz * sp, P.onGround || P.swim ? 12 : 4, dt);
    if (len > 0.08 && P.swing <= 0) P.yaw = dampAngle(P.yaw, Math.atan2(wx, wz), 12, dt);
    P.jumpBuf -= dt; P.coyote -= dt; P.iframes = Math.max(0, P.iframes - dt); P.fsCd = Math.max(0, P.fsCd - dt);
    if (P.swim) {
      // swimming: Space rises, C dives; under the surface the breath runs down
      const up = playing && keys.Space, down = playing && (keys.KeyC || keys.ControlLeft);
      const surf = w - 1.15;
      let vy = down ? -3.2 : up ? 3.2 : (P.pos.y < surf - 0.2 && !P.under ? 2 : P.pos.y < surf ? 0.6 : 0);
      if (!down && !up && P.pos.y >= surf - 0.25) { P.pos.y = lerp(P.pos.y, surf, 1 - Math.exp(-6 * dt)); vy = 0; }
      P.vel.y = damp(P.vel.y, vy, 6, dt);
      if (P.pos.y > surf) P.pos.y = surf;
    } else {
      if (P.jumpBuf > 0 && (P.onGround || P.coyote > 0) && playing) { P.vel.y = 9.2; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; sfx.jump(); }
      P.vel.y -= 26 * dt;
    }
    P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
    resolve(P.pos);
    P.pos.y += P.vel.y * dt;
    if (opt.ceilingAt) { const c = opt.ceilingAt(P.pos.x, P.pos.z); if (c != null && P.pos.y + 1.6 > c) { P.pos.y = c - 1.6; P.vel.y = Math.min(0, P.vel.y); } }
    const g = groundAt(P.pos.x, P.pos.z, P.pos.y);
    if (P.pos.y <= g + 0.02 && P.vel.y <= 0) { P.pos.y = g; P.vel.y = 0; P.onGround = true; P.coyote = 0.12; }
    else if (!P.swim && P.onGround && P.pos.y - g < 1.2 && P.vel.y <= 0) { P.pos.y = g; P.vel.y = 0; }
    else P.onGround = false;
    // breath
    P.under = P.swim && w != null && P.pos.y + 1.45 < w;
    const maxB = ctx.breath ? ctx.breath() : 12;
    if (P.under) { P.breath -= dt / maxB; if (P.breath <= 0) { P.breath = 0; if ((P.drownT = (P.drownT || 0) - dt) <= 0) { P.drownT = 1; hurt(12); } } }
    else P.breath = Math.min(1, P.breath + dt * 0.5);
    breathBar.style.display = P.under || P.breath < 1 ? 'block' : 'none'; breathBar.firstChild.style.width = (P.breath * 100) + '%';
    // the hatchet
    if (P.swing > 0) {
      P.swing -= dt;
      if (!P.hitDone && P.swing < 0.24) {
        P.hitDone = true;
        for (const f of foes) {
          if (f.dead || f.fled) continue;
          const dx = f.pos.x - P.pos.x, dz = f.pos.z - P.pos.z, d = Math.hypot(dx, dz), reach = 2.7 + (f.D.rad || 0) * 0.6;
          if (d < reach && Math.abs((f.pos.y + 0.6) - (P.pos.y + 0.8)) < 2.5 + (f.D.rad || 0) && (dx * Math.sin(P.yaw) + dz * Math.cos(P.yaw)) / (d || 1) > 0.2) hitFoe(f, f.D.hp <= 1 ? 1 : (ctx.axeDmg || 16), P.pos, { axe: true });
        }
        if (opt.onSwing) opt.onSwing();
      }
    }
    const speed = Math.hypot(P.vel.x, P.vel.z);
    if (P.onGround && speed > 1) { P.stepPh += dt * speed * 0.55; if (P.stepPh > 1) { P.stepPh = 0; sfx.step(); } }
    tanoc.root.position.copy(P.pos); tanoc.root.rotation.y = P.yaw;
    tanoc.animate(dt, { speed: P.swim ? speed * 0.5 : speed, onGround: P.onGround || P.swim, t, swing: P.swing > 0 ? { kind: 1, p: 1 - P.swing / 0.42 } : null });
  }
  function updateFriend(o, dt) {
    const actor = o.actor;
    if (!o.on) { actor.root.visible = false; return; }
    actor.root.visible = true;
    let want = o.stay;
    let foe = null;
    if (o.fight) { let bd = 14; for (const f of foes) { if (f.dead || f.fled || f.passive || f.D.ai === 'flee' || f.D.ai === 'idle') continue; const d = f.pos.distanceTo(o.pos); if (d < bd) { bd = d; foe = f; } } }
    if (foe) want = foe.pos;
    else if (!want) { const back = V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), right = V3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); want = P.pos.clone().addScaledVector(back, o.dist).addScaledVector(right, o.side); }
    const dx = want.x - o.pos.x, dz = want.z - o.pos.z, d = Math.hypot(dx, dz);
    const stop = foe ? 1.8 + (foe.D.rad || 0) : 0.8, sp = d > stop ? Math.min(o.speed, d * 2.2) : 0;
    if (d > 45 && !o.stay) o.pos.set(want.x, 0, want.z);
    else if (sp > 0) { o.pos.x += dx / d * sp * dt; o.pos.z += dz / d * sp * dt; o.yaw = dampAngle(o.yaw, Math.atan2(dx, dz), 8, dt); }
    else o.yaw = dampAngle(o.yaw, foe ? Math.atan2(dx, dz) : Math.atan2(P.pos.x - o.pos.x, P.pos.z - o.pos.z), 4, dt);
    resolve(o.pos, 0.5);
    const w = waterAt(o.pos.x, o.pos.z);
    o.pos.y = Math.max(groundAt(o.pos.x, o.pos.z, o.pos.y + 1), w != null ? w - 1.1 : -1e9);
    o.cd -= dt; o.swing = Math.max(0, o.swing - dt);
    if (foe && d < 2.4 + (foe.D.rad || 0) && o.cd <= 0) { o.cd = 1.1; o.swing = 0.4; hitFoe(foe, o.dmg, o.pos); }
    actor.root.position.copy(o.pos); actor.root.rotation.y = o.yaw;
    actor.animate(dt, { speed: sp, onGround: true, t, swing: o.swing > 0 ? { kind: 1, p: 1 - o.swing / 0.4 } : null, attack: o.swing > 0 ? o.swing / 0.4 : 0 });
  }
  function updateCamera(dt) {
    camTgt.set(P.pos.x, P.pos.y + 1.5, P.pos.z);
    const want = opt.camDist || 6.2, cp = Math.cos(CAM.pitch), dir = V3(Math.sin(CAM.yaw) * cp, Math.sin(CAM.pitch), Math.cos(CAM.yaw) * cp);
    let d = want;
    for (let s = 0.6; s <= want; s += 0.3) { const q = camTgt.clone().addScaledVector(dir, s); if (solidAt(q.x, q.y, q.z)) { d = Math.max(0.8, s - 0.4); break; } }
    camPos.lerp(camTgt.clone().addScaledVector(dir, d), 1 - Math.exp(-14 * dt));
    camera.position.copy(camPos);
    if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; shake = Math.max(0, shake - dt * 1.5); }
    camera.lookAt(camTgt);
  }
  function place(o, x, z, yaw = 0, y) { o.pos.set(x, y != null ? y : groundAt(x, z, 80), z); o.yaw = yaw; if (o === P) { P.vel.set(0, 0, 0); camPos.set(x + Math.sin(CAM.yaw) * 6, P.pos.y + 3, z + Math.cos(CAM.yaw) * 6); } }

  /* ---------------- the kit ---------------- */
  const K = {
    scene, rng, P, tanoc, friends, foes, items, particles, heightAt, groundAt, resolve, solidAt, waterAt, box, cyl, setSky, sun, hemi, fog, torch,
    addItem, dropItem, setGoal, addFriend, addFoe, hitFoe, hurt, place, buildBuhkon, buildPunk, buildMalsti,
    shake: v => { shake = Math.max(shake, v); }, get t() { return t; },
    update(dt, playing) {
      t += dt;
      updatePlayer(dt, playing);
      for (const f of friends) updateFriend(f, dt);
      updateFoes(dt, playing);
      updateShots(dt);
      if (beacon.visible) beacon.material.opacity = 0.6 + Math.sin(t * 4) * 0.3;
      if (opt.tick) opt.tick(dt, playing);
      particles.update(dt);
      updateCamera(dt);
      sky.position.copy(camera.position);
      if (!opt.dark) { sun.position.copy(P.pos).addScaledVector(SUN_DIR, 140); sun.target.position.copy(P.pos); }
      torch.position.set(P.pos.x, P.pos.y + 2.4, P.pos.z);
      ctx.hp(Math.max(0, P.hp) / 100);
    },
    render: () => composer.render(),
    interact() {
      let best = null, bd = 1e9;
      for (const it of items) { const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z); if (d < it.far && Math.abs(it.pos.y - P.pos.y) < 3.5 && d < bd) { bd = d; best = it; } }
      if (best) { sfx.ui(); best.act(); return true; }
      return false;
    },
    prompt() {
      let best = null, bd = 1e9;
      for (const it of items) { const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z); if (d < it.far && Math.abs(it.pos.y - P.pos.y) < 3.5 && d < bd) { bd = d; best = it; } }
      return best ? best.label : null;
    },
    jump: () => { P.jumpBuf = 0.15; }, attack, fireStone, resize,
    dispose() {
      breathBar.style.display = 'none';
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
      composer.dispose && composer.dispose();
    },
  };
  return K;
}

/* instanced scenery: trees, pines, rocks — a list of [x, y, z, ...] and how to place each */
export function scatter(scene, geo, mat, list, put) {
  if (!list.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D();
  list.forEach((v, i) => { o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); put(o, v); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
export function forest(K, list, opts = {}) {
  // list: [x, z, s, pine]
  const trunks = [], crowns = [], cones = [];
  for (const [x, z, s, pine] of list) {
    const g = K.heightAt(x, z), h = (pine ? 7 : 4.5) * s;
    trunks.push([x, g + h * 0.5 - 0.3, z, s, h]);
    if (pine) { cones.push([x, g + h * 0.75, z, 2.4 * s, h * 0.9]); cones.push([x, g + h * 1.05, z, 1.6 * s, h * 0.6]); }
    else for (let k = 0; k < 3; k++) crowns.push([x + (K.rng() - 0.5) * 2 * s, g + h + (K.rng() - 0.3) * 1.4 * s, z + (K.rng() - 0.5) * 2 * s, (1.6 + K.rng()) * s]);
    K.cyl(x, z, 0.45 * s, g - 1, g + h);
  }
  scatter(K.scene, new THREE.CylinderGeometry(0.35, 0.5, 1, 6), toon(opts.bark || 0x5a3a26), trunks, (o, [x, y, z, s, h]) => { o.position.set(x, y, z); o.scale.set(s, h, s); });
  scatter(K.scene, new THREE.IcosahedronGeometry(1, 0), toon(opts.leaf || 0x5a8a3a), crowns, (o, [x, y, z, r]) => { o.position.set(x, y, z); o.scale.set(r, r * 0.85, r); o.rotation.set(K.rng(), K.rng(), K.rng()); });
  scatter(K.scene, new THREE.ConeGeometry(1, 1, 7), toon(opts.pine || 0x2a4a30), cones, (o, [x, y, z, r, h]) => { o.position.set(x, y, z); o.scale.set(r, h, r); o.rotation.y = K.rng() * 6; });
}
