// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   The Lútut, played by its Blender model (rpg/assets/models/lutut.glb,
   source and scripts in art/lutut/). If the model can't be loaded the
   game falls back to the Lutut it builds for itself (esik_sky.js).

   The model carries:
   - 17 clips: Idle Fly Glide Stand Walk TakeOff LandGlide LandBarrel
     Suck Dive TailSmack TailSmackUp TailSwipeL TailSwipeR Screech Hurt Death
   - hit points riding the bones: hit_mouth (what it sucks in with),
     hit_tail (the spiked ball), and collision spheres col_* (body,
     tail, wings), each with its radius in extras (lutut_radius)
   - a low-detail mesh (Lutut_LOD1) on the same skeleton
   - the gullet as its own material (LututThroat), lit red as it screeches
   - eyes and carved dotted lines in the emissive texture (dimmer lines,
     brighter at night)

   It never bites: the lamprey mouth can't close. It sucks things in.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { buildLutut as buildProceduralLutut } from './esik_sky.js';

const FILE = new URL('../assets/models/lutut.glb', import.meta.url).href;
let SRC = null;

/* model facts (model units are metres before SCALE) */
export const LUTUT = {
  SCALE: 3.6,                // 3.28 units wingtip to wingtip -> about 11.8 m, as the old Lutut
  TAKEOFF_END: 1.6,          // TakeOff ends this high (model units): the game takes over the height from there
  LAND_FROM: 2.2,            // landings start this high above the ground and end on it
  LOD_DIST: 46,              // beyond this many metres the low-detail mesh is shown
  ONCE: new Set(['TakeOff', 'LandGlide', 'LandBarrel', 'Suck', 'Dive', 'TailSmack', 'TailSmackUp', 'TailSwipeL', 'TailSwipeR', 'Screech', 'Hurt', 'Death']),
  // when in each one-shot clip the blow lands (fraction of the clip)
  HIT: { TailSmack: [0.38, 0.6], TailSmackUp: [0.4, 0.58], TailSwipeL: [0.32, 0.56], TailSwipeR: [0.32, 0.56], Suck: [0.22, 0.82], Dive: [0.48, 0.7] },
};
/* young ones are smaller and their lines are faint; old ones are bigger, darker, and their lines glow more */
export const VARIANTS = {
  young: { scale: 0.72, tint: 1.15, glow: 0.7 },
  adult: { scale: 1.0, tint: 1.0, glow: 1.0 },
  old: { scale: 1.15, tint: 0.85, glow: 1.4 },
};
export const variantFor = age => (age < 0.3 ? 'young' : age > 0.75 ? 'old' : 'adult');

export async function loadLutut() {
  try { SRC = await new GLTFLoader().loadAsync(FILE); }
  catch (e) { console.warn('[lutut] model not loaded, using the built-in Lutut', e && e.message); SRC = null; }
  return !!SRC;
}
export const lututLoaded = () => !!SRC;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _up = new THREE.Vector3(), _rt = new THREE.Vector3();

/* build one Lútut. opts: { age 0..1, variant 'young'|'adult'|'old', scale, seed } */
export function buildLututActor(opts = {}) {
  if (!SRC) return buildProceduralLutut(opts);
  const vname = opts.variant || variantFor(opts.age ?? 0.5), V = VARIANTS[vname] || VARIANTS.adult;
  const root = new THREE.Group(); root.name = 'lutut';
  const model = cloneSkinned(SRC.scene);
  const k = LUTUT.SCALE * V.scale * (opts.scale || 1);
  model.scale.setScalar(k); root.add(model);

  const bones = {}, cols = [], lods = [[], []], skins = [], throats = [];
  model.traverse(o => {
    if (o.isBone) bones[o.name] = o;
    const ud = o.userData || {};
    if (ud.lutut_radius) cols.push({ o, r: ud.lutut_radius, kind: ud.lutut_kind || 'body', name: o.name, p: new THREE.Vector3() });
    if (o.isMesh) {
      o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true;
      o.userData.noOutline = true; o.userData.noSolid = true;
      let lod = 0; for (let q = o; q; q = q.parent) if (/LOD1/.test(q.name)) lod = 1;
      lods[lod].push(o);
      const m = o.material.clone(); o.material = m;
      if (/Throat/.test(m.name)) { m.userData.base = 0; m.emissiveIntensity = 0; throats.push(m); }
      else { m.userData.base = m.emissiveIntensity || 2.5; m.color.multiplyScalar(V.tint); m.userData.col0 = m.color.clone(); skins.push(m); }
    }
  });
  const hitMouth = cols.find(c => c.name === 'hit_mouth'), hitTail = cols.find(c => c.name === 'hit_tail');
  const body = cols.filter(c => c.kind !== 'hit');
  const tailBones = []; for (let i = 1; bones['tail' + i]; i++) tailBones.push(bones['tail' + i]);

  const mixer = new THREE.AnimationMixer(model), acts = {};
  for (const c of SRC.animations) acts[c.name] = mixer.clipAction(c);
  let cur = null, curName = '', once = false;
  function play(name, fade = 0.22) {
    const A = acts[name]; if (!A) return;
    if (name === curName && !LUTUT.ONCE.has(name)) return;
    A.reset(); A.enabled = true; A.setEffectiveWeight(1); A.timeScale = 1;
    once = LUTUT.ONCE.has(name);
    A.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); A.clampWhenFinished = once;
    A.play(); if (cur && cur !== A) cur.crossFadeTo(A, fade, false);
    cur = A; curName = name;
  }
  const progress = () => (cur ? clamp(cur.time / cur.getClip().duration, 0, 1) : 0);
  const done = () => once && cur && cur.time >= cur.getClip().duration - 1e-3;

  // a tail that answers to how the body moves: it swings out against a turn and trails a climb or a drop
  let lastYaw = null, yawRate = 0, side = 0, sideV = 0, lift = 0, liftV = 0, lastY = null, vy = 0;
  function tailFollow(dt) {
    const yaw = root.rotation.y, y = root.position.y;
    if (lastYaw !== null) { let d = yaw - lastYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yawRate = lerp(yawRate, d / dt, 1 - Math.exp(-8 * dt)); }
    if (lastY !== null) vy = lerp(vy, clamp((y - lastY) / dt, -20, 20), 1 - Math.exp(-6 * dt));
    lastYaw = yaw; lastY = y;
    sideV += ((clamp(-yawRate * 0.35, -0.6, 0.6) - side) * 30 - sideV * 6) * dt; side += sideV * dt;
    liftV += ((clamp(vy * 0.05, -0.4, 0.4) - lift) * 26 - liftV * 6) * dt; lift += liftV * dt;
    if (Math.abs(side) + Math.abs(lift) < 1e-3 || !tailBones.length) return;
    model.updateMatrixWorld(true);
    model.getWorldQuaternion(_q); _up.set(0, 1, 0).applyQuaternion(_q); _rt.set(1, 0, 0).applyQuaternion(_q);
    const n = tailBones.length;
    for (let i = 0; i < n; i++) {
      const b = tailBones[i], w = (0.5 + i / n) / n * 1.6;
      b.parent.getWorldQuaternion(_q2).invert();
      _v.copy(_up).applyQuaternion(_q2); b.quaternion.premultiply(_q.setFromAxisAngle(_v, side * w));
      _v.copy(_rt).applyQuaternion(_q2); b.quaternion.premultiply(_q.setFromAxisAngle(_v, lift * w));
      b.updateMatrixWorld(true);
    }
  }
  let night = 0, flashV = 0, throatK = 0;
  function shade(dt) {
    const g = V.glow * (0.55 + 0.75 * night);
    for (const m of skins) {
      m.emissiveIntensity = m.userData.base * g;
      if (flashV > 0.01) m.color.copy(m.userData.col0).multiplyScalar(1 + flashV * 3); else m.color.copy(m.userData.col0);
    }
    // the gullet glows red as it screeches
    const want = curName === 'Screech' ? Math.sin(Math.PI * clamp((progress() - 0.12) / 0.72, 0, 1)) : 0;
    throatK = lerp(throatK, want, 1 - Math.exp(-10 * dt));
    for (const m of throats) m.emissiveIntensity = throatK * 2.2;
  }
  let lod = -1;
  function setLod(i) { if (i === lod) return; lod = i; for (const o of lods[0]) o.visible = i === 0; for (const o of lods[1]) o.visible = i === 1; }
  setLod(0);
  function updateColliders() {
    for (const c of cols) { c.o.getWorldPosition(c.p); c.wr = c.r * k * root.scale.x; }
  }

  const L = {
    variant: vname, k, bones, play, progress, done, acts,
    get clip() { return curName; },
    driven: false,           // set by the game's Lútut brain; otherwise animate() picks clips from what it's told
    /* where the mouth and the tail ball are, in the world, and how big */
    mouth: () => hitMouth ? hitMouth.p : root.position,
    mouthR: () => hitMouth ? hitMouth.wr : 1,
    tail: () => hitTail ? hitTail.p : root.position,
    tailR: () => hitTail ? hitTail.wr : 1,
    colliders: () => body,
    /* how far a point is from the Lútut's surface (negative inside), and which way it is */
    reach(x, y, z) {
      let best = 1e9, bx = 0, by = 0, bz = 0;
      for (const c of body) { const g = Math.hypot(x - c.p.x, y - c.p.y, z - c.p.z) - c.wr; if (g < best) { best = g; bx = c.p.x - x; by = c.p.y - y; bz = c.p.z - z; } }
      return { gap: best, dx: bx, dy: by, dz: bz };
    },
    setLodByDistance(d) { setLod(d > LUTUT.LOD_DIST ? 1 : 0); },
  };
  const actor = {
    root, model, lutut: L, cartoon: true,   // its own look: the game's cel shading is left off it
    animate(dt, st = {}) {
      if (!(dt > 0)) return;
      if (!L.driven) {   // a scene that just wants it to look alive (Megla's night sky, the Dya'Akara board)
        const want = st.diving ? 'Dive' : st.attack > 0.2 ? 'TailSmack' : st.onGround ? (st.speed > 0.4 ? 'Walk' : 'Stand') : (st.speed || 0) > 6 ? 'Fly' : 'Idle';
        if (!curName || (curName !== want && (!once || done()))) play(want);
      }
      if (!curName) play('Idle');
      mixer.update(dt);
      tailFollow(dt);
      shade(dt);
      updateColliders();
    },
    flash(v) { flashV = v; },
    glow(n) { night = clamp(n, 0, 1); },
  };
  play('Idle');
  model.updateMatrixWorld(true); updateColliders();
  return actor;
}

/* ================================================================
   The brain (Torcain's Run). It flies high, circles, dives on you with
   its mouth flared to suck you in, hangs low to club you with its tail
   (under its belly, to either side, or over its back if you're above
   it), screeches (which stuns), and lands to rest: a soft glide, or
   wings tucked and barrelling into the ground.
   e: the enemy record (enemies.js); ctx: the enemies context.
   ================================================================ */
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const dAng = (a, b, rate, dt) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * (1 - Math.exp(-rate * dt)); };
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));

export function updateLututFoe(e, dt, ctx, D) {
  const a = e.actor, L = a.lutut, P = ctx.P, G = ctx.G, T = e.T, k = L.k;
  L.driven = true;
  const ground = ctx.world.heightAt(e.pos.x, e.pos.z);
  if (e.ls == null) {
    e.ls = Math.random() < 0.4 && !e.hostile ? 'ground' : 'sky';
    e.alt = e.ls === 'ground' ? 0 : 9 + Math.random() * 4; e.lt = 0; e.calm = 0; e.cd = 2 + Math.random() * 2; e.screechCd = 0; e.lowHits = 0;
    e.hurtSeen = e.lastHit;
  }
  e.lt += dt;
  const playing = G.mode === 'play' && !P.dead && !G.truce;
  const chest = V3(P.pos.x, P.pos.y + 1.1, P.pos.z);
  const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz), toP = Math.atan2(dx, dz);
  const aggroR = T.aggro * D.aggro;
  const go = (s) => { e.ls = s; e.lt = 0; e.hitDone = false; };
  const hurt = (dmg, from, kb, o) => ctx.hurtPlayer(dmg * D.enemyDmg, from, kb, o || {});
  let wantPos = null, sp = T.speed, wantAlt = e.alt, faceP = false, clip = null;

  if (!playing && /^(chase|dive|low|screech)$/.test(e.ls)) go('sky');
  if (e.hostile && playing && /^(sky|ground)$/.test(e.ls) && d < aggroR) {
    if (e.ls === 'ground') go('takeoff');
    else { go(e.screechCd <= 0 ? 'screech' : 'chase'); ctx.onAggro && ctx.onAggro(e); }
  }
  e.screechCd -= dt;

  switch (e.ls) {
    case 'ground': {   // resting: standing, now and then a little walk; wings tucked
      e.alt = 0; e.calm += dt;
      if (!e.wander || e.lt > e.wanderT) { e.wander = V3(e.home.x + (Math.random() - 0.5) * 14, 0, e.home.z + (Math.random() - 0.5) * 14); e.wanderT = 6 + Math.random() * 8; e.lt = 0; }
      const wx = e.wander.x - e.pos.x, wz = e.wander.z - e.pos.z;
      if (Math.hypot(wx, wz) > 1.5 && e.lt > 3) { wantPos = e.wander; sp = 1.6; }
      clip = Math.hypot(e.vel.x, e.vel.z) > 0.4 ? 'Walk' : 'Stand';
      if (e.calm > 25 + (e.home.x % 7) * 3) { go('takeoff'); e.calm = 0; }
      break;
    }
    case 'takeoff': {  // wings spread wide, a run, a jump, flapping
      e.alt = 0; clip = 'TakeOff';
      if (L.clip !== 'TakeOff') L.play('TakeOff', 0.15);
      const p = L.progress();
      if (p < 0.5) { const s = 7 * Math.min(1, p * 4); e.vel.x = Math.sin(e.yaw) * s; e.vel.z = Math.cos(e.yaw) * s; }
      if (L.done()) { e.alt = LUTUT.TAKEOFF_END * k; go(e.hostile && playing && d < aggroR * 1.4 ? 'chase' : 'sky'); L.play('Fly', 0.05); }
      break;
    }
    case 'sky': {      // circling its home, high up
      const RO = T.roam || 22, w = G.t * 0.4 * 6 / RO + e.home.z;
      wantPos = V3(e.home.x + Math.cos(w) * RO, 0, e.home.z + Math.sin(w) * RO); wantAlt = 4 * (T.altMul || 3); sp = T.speed * 0.6;
      e.calm += dt;
      if (!e.hostile && e.calm > 45 + (e.home.z % 9) * 3) { go('approach'); e.calm = 0; }
      break;
    }
    case 'approach': { // coming in to land at home
      wantPos = V3(e.home.x, 0, e.home.z); sp = T.speed * 0.6; wantAlt = LUTUT.LAND_FROM * k;
      if (Math.hypot(e.pos.x - e.home.x, e.pos.z - e.home.z) < 10 && Math.abs(e.alt - wantAlt) < 0.8) {
        e.landKind = Math.random() < 0.7 ? 'LandGlide' : 'LandBarrel';
        e.alt = 0; go('land'); L.play(e.landKind, 0.1);
      }
      break;
    }
    case 'land': {     // the clip carries the height down; it slows to a stop as it touches
      clip = e.landKind; e.alt = 0;
      const p = L.progress(), s = (e.landKind === 'LandGlide' ? 7 : 10) * Math.max(0, 1 - p / 0.75);
      e.vel.x = Math.sin(e.yaw) * s; e.vel.z = Math.cos(e.yaw) * s;
      if (e.landKind === 'LandBarrel' && p > 0.3 && !e.thud) { e.thud = true; G.shake = Math.max(G.shake || 0, d < 30 ? 0.35 : 0.1); ctx.particles.burst(e.pos.x, ground + 0.4, e.pos.z, 26, { color: 0x8a7a66, speed: 6, size: 0.8, life: 0.8, gravity: 6 }); ctx.sfx.slam && ctx.sfx.slam(); }
      if (L.done()) { e.thud = false; go('ground'); }
      break;
    }
    case 'screech': {  // a long rising screech like metal dragged on stone: it stuns
      clip = 'Screech'; faceP = true; wantPos = e.pos.clone(); wantAlt = Math.max(e.alt, 6);
      if (L.clip !== 'Screech') { L.play('Screech', 0.15); lututSfx(ctx.sfx, 'screech'); }
      if (!e.hitDone && L.progress() > 0.3) {
        e.hitDone = true; e.screechCd = 14 + Math.random() * 8;
        if (Math.hypot(chest.x - e.pos.x, chest.y - e.pos.y, chest.z - e.pos.z) < 20) hurt(3, e.pos, 0, { paralyze: 0.9 });
      }
      if (L.done()) go('chase');
      break;
    }
    case 'chase': {    // circling above you, then the stoop
      e.orbit = (e.orbit ?? Math.random() * 6) + dt * 0.55;
      wantPos = V3(P.pos.x + Math.cos(e.orbit) * 11, 0, P.pos.z + Math.sin(e.orbit) * 11); wantAlt = 9;
      e.cd -= dt;
      if (e.cd <= 0) { go('dive'); e.diveFrom = e.pos.clone(); L.play('Dive', 0.12); lututSfx(ctx.sfx, 'dive'); }
      if (d > 60) go('sky');
      break;
    }
    case 'dive': {     // folds back and drops on you; at the bottom the mouth flares and pulls
      clip = 'Dive'; const p = L.progress();
      const tgt = V3(P.pos.x, P.pos.y + 1.0, P.pos.z);
      if (p < 0.55) {  // steer so the mouth arrives as it flares
        const m = L.mouth(), left = Math.max(0.08, (0.55 - p) * 1.4);
        const vx = (tgt.x - m.x) / left, vy = (tgt.y - m.y) / left, vz = (tgt.z - m.z) / left;
        e.vel.x = clamp(vx, -26, 26); e.vel.z = clamp(vz, -26, 26); e.alt = Math.max(1.2, e.alt + clamp(vy, -26, 8) * dt);
        e.yaw = dAng(e.yaw, Math.atan2(tgt.x - e.pos.x, tgt.z - e.pos.z), 6, dt);
      } else { e.vel.multiplyScalar(Math.exp(-3 * dt)); e.alt = damp(e.alt, 2.2, 2, dt); }
      suck(e, ctx, L, 'Dive', hurt, chest, dt);
      if (L.done()) { go('low'); e.lowHits = 0; e.cd = 0.6; }
      break;
    }
    case 'low': {      // hanging low after a dive: the time to hit it, and it clubs with its tail
      // hangs just behind and above you, so you're under its belly or in front of its mouth
      wantAlt = 2.0; faceP = true; sp = 3.5;
      wantPos = V3(P.pos.x - Math.sin(e.yaw) * 1.2 * k * 0.5, 0, P.pos.z - Math.cos(e.yaw) * 1.2 * k * 0.5);
      const atk = /^(TailSmack|TailSmackUp|TailSwipeL|TailSwipeR|Suck)$/.test(L.clip) && !L.done();
      if (atk) {
        const name = L.clip;
        if (name === 'Suck') suck(e, ctx, L, 'Suck', hurt, chest, dt);
        else {
          const [h0, h1] = LUTUT.HIT[name], p = L.progress(), t = L.tail();
          if (!e.hitDone && p > h0 && p < h1 && Math.hypot(t.x - chest.x, t.y - chest.y, t.z - chest.z) < L.tailR() + 0.8) {
            e.hitDone = true; hurt(T.dmg * 1.1, t, 12, {}); ctx.sfx.slam && ctx.sfx.slam();
            ctx.particles.burst(t.x, t.y, t.z, 16, { color: 0x6a4a8a, speed: 6, size: 0.5, life: 0.4 });
          }
        }
      } else {
        e.cd -= dt;
        if (e.cd <= 0 && d < 9 + 2 * k) {
          // where are you, from where it hangs? (its own left/right/up/forward)
          const s = Math.sin(e.yaw), c = Math.cos(e.yaw), rx = P.pos.x - e.pos.x, rz = P.pos.z - e.pos.z;
          const fwd = rx * s + rz * c, lft = rx * c - rz * s, up = P.pos.y - (e.pos.y + 0.6 * k);
          let move = 'TailSmack';
          if (up > 1.2 * k * 0.5 + 1) move = 'TailSmackUp';
          else if (Math.abs(lft) > Math.max(2.5, Math.abs(fwd) * 0.8)) move = lft > 0 ? 'TailSwipeL' : 'TailSwipeR';
          else if (fwd > 2.2) move = 'Suck';
          L.play(move, 0.12); e.hitDone = false; e.cd = 1.0 + Math.random() * 0.8; e.lowHits++;
          lututSfx(ctx.sfx, move === 'Suck' ? 'suck' : 'tail');
        }
        if (e.lowHits >= 3 || e.lt > 7) { go('chase'); e.cd = 3 + Math.random() * 2; }
      }
      if (!atk) clip = 'Idle';
      break;
    }
  }

  // flinch when struck (not in the middle of something that matters more)
  if (e.lastHit !== e.hurtSeen) {
    e.hurtSeen = e.lastHit;
    if (/^(sky|chase|low)$/.test(e.ls) && !/^(Tail|Suck|Dive|Screech)/.test(L.clip)) { L.play('Hurt', 0.06); e.hurtT = 0.45; }
  }
  if ((e.hurtT = Math.max(0, (e.hurtT || 0) - dt)) > 0) clip = null;

  // movement
  const onGround = /^(ground|takeoff|land)$/.test(e.ls);
  if (wantPos) {
    const wx = wantPos.x - e.pos.x, wz = wantPos.z - e.pos.z, wd = Math.hypot(wx, wz), v = wd > 0.5 ? Math.min(sp, wd * 2) : 0;
    e.vel.x = damp(e.vel.x, wd > 0.01 ? wx / wd * v : 0, onGround ? 6 : 2.5, dt);
    e.vel.z = damp(e.vel.z, wd > 0.01 ? wz / wd * v : 0, onGround ? 6 : 2.5, dt);
  }
  const spd = Math.hypot(e.vel.x, e.vel.z);
  if (faceP) e.yaw = dAng(e.yaw, toP, 4, dt);
  else if (spd > 0.6 && e.ls !== 'dive') e.yaw = dAng(e.yaw, Math.atan2(e.vel.x, e.vel.z), onGround ? 5 : 2.2, dt);
  e.pos.x += e.vel.x * dt; e.pos.z += e.vel.z * dt;
  if (!onGround && e.ls !== 'dive') e.alt = damp(e.alt, wantAlt, 1.6, dt);
  if (e.ls === 'takeoff' || e.ls === 'land' || e.ls === 'ground') { e.vel.multiplyScalar(e.ls === 'ground' ? 1 : Math.exp(-0.5 * dt)); }
  e.pos.y = ground + e.alt + (onGround ? 0 : Math.sin(G.t * 1.3 + e.home.x) * 0.15);
  if (ctx.G.arena && ctx.arenaClamp) ctx.arenaClamp(e.pos, ctx.G.arena - 2);

  // which looping clip, when nothing one-shot is playing: in the air it flies, glides now and then, or hovers
  if (/^(sky|chase|approach)$/.test(e.ls)) clip = 'Idle';
  if (clip && (!LUTUT.ONCE.has(L.clip) || L.done())) {
    let want = clip;
    if (clip === 'Idle' && !onGround) want = spd > 6 ? (e.ls !== 'chase' && Math.sin(G.t * 0.21 + e.home.x) > 0.55 ? 'Glide' : 'Fly') : 'Idle';
    if (want !== L.clip) L.play(want, 0.35);
  }

  // place it, animate it, and keep you out of its body
  a.root.position.copy(e.pos); a.root.rotation.y = e.yaw;
  if (a.root.visible) {
    L.setLodByDistance(Math.hypot(e.pos.x - P.pos.x, e.pos.y - P.pos.y, e.pos.z - P.pos.z));
    a.glow(ctx.night ? ctx.night() : 0);
    a.animate(dt, {});
    pushOut(L, P);
  }
  // wingbeats you can hear when it's close
  if (a.root.visible && /^(Fly|Idle|TakeOff)$/.test(L.clip) && d < 40) {
    const beat = Math.floor(L.progress() * (L.clip === 'TakeOff' ? 3 : 1) + 0.5);
    if (beat !== e.lastBeat) { e.lastBeat = beat; if (L.clip !== 'TakeOff' || L.progress() > 0.5) lututSfx(ctx.sfx, 'wing', clamp(1 - d / 40, 0, 1)); }
  }
}

/* the mouth draws you in: a pull toward it while it's flared, and one hard hit if you end up in it */
function suck(e, ctx, L, name, hurt, chest, dt) {
  const [h0, h1] = LUTUT.HIT[name], p = L.progress();
  if (p < h0 || p > h1) return;
  const m = L.mouth(), dx = m.x - chest.x, dy = m.y - chest.y, dz = m.z - chest.z, dd = Math.hypot(dx, dy, dz);
  const reach = L.mouthR() * 4 + 2.5;
  if (dd < reach && dd > 1e-3) {
    // only in front of the mouth: the cone it faces
    const s = Math.sin(e.yaw), c = Math.cos(e.yaw), ahead = (-dx * s + -dz * c) / dd;
    if (ahead > 0.3) {
      const pull = 7 * (1 - dd / reach);
      ctx.P.pos.x += dx / dd * pull * dt; ctx.P.pos.z += dz / dd * pull * dt;
      if (Math.random() < 0.4) ctx.particles.emit(chest.x + (Math.random() - 0.5), chest.y + (Math.random() - 0.5), chest.z + (Math.random() - 0.5), { vx: dx / dd * 6, vy: dy / dd * 6, vz: dz / dd * 6, color: 0x9a8aa8, size: 0.3, life: 0.35 });
      if (!e.hitDone && dd < L.mouthR() + 1.0) { e.hitDone = true; hurt(e.T.dmg, m, 4, {}); }
    }
  }
}
/* you can't walk through it */
function pushOut(L, P) {
  for (const c of L.colliders()) {
    if (c.kind === 'wing') continue;   // the membrane is thin; you pass under and over it
    const cy = c.p.y, py0 = P.pos.y + 0.2, py1 = P.pos.y + 1.7;
    if (py1 < cy - c.wr || py0 > cy + c.wr) continue;
    const dx = P.pos.x - c.p.x, dz = P.pos.z - c.p.z, dh = Math.hypot(dx, dz), min = c.wr + 0.35;
    if (dh < min && dh > 1e-3) { P.pos.x = c.p.x + dx / dh * min; P.pos.z = c.p.z + dz / dh * min; }
  }
}

/* it goes down: the Death clip as it falls, a thud, a while lying there, then it settles into the earth */
export function lututDead(e, dt, ctx) {
  const a = e.actor, L = a.lutut; if (!L) return false;
  if (!e.deadInit) { e.deadInit = true; e.timer = 0; L.play('Death', 0.1); e.vel.y = Math.min(e.vel.y || 0, 0); }
  e.timer += dt;
  const g = ctx.world.heightAt(e.pos.x, e.pos.z);
  if (e.pos.y > g + 0.01) { e.vel.y -= 22 * dt; e.pos.addScaledVector(e.vel, dt); e.vel.x *= Math.exp(-1.5 * dt); e.vel.z *= Math.exp(-1.5 * dt); }
  if (e.pos.y <= g) { if (!e.thud) { e.thud = true; ctx.particles.burst(e.pos.x, g + 0.3, e.pos.z, 30, { color: 0x8a7a66, speed: 6, size: 0.9, life: 0.8, gravity: 6 }); ctx.sfx.slam && ctx.sfx.slam(); } e.pos.y = g; e.vel.set(0, 0, 0); }
  const sink = Math.max(0, e.timer - 5);
  a.root.position.set(e.pos.x, e.pos.y - sink * 1.2, e.pos.z);
  a.animate(dt, {});
  if (sink > 2.5) { ctx.scene.remove(a.root); e.gone = true; }
  return true;
}

/* its sounds, made the way the rest of the game makes its own (audio.js): a first pass */
export function lututSfx(sfx, what, vol = 1) {
  if (!sfx || !sfx._lutut) return;
  sfx._lutut(what, vol);
}
