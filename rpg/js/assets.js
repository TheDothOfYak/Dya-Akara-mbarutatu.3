/* ============================================================
   Your own models.
   Any character or creature in the game can be played by a real
   model (.glb / .gltf) instead of the one the game builds for
   itself, and any model can be stood in the world as scenery.
   Nothing here is needed for the game to run: with no entry in
   rpg/assets/models.json everything looks as it always did.

   rpg/assets/models.json
     "models": { "<who>": {
         "file":   "models/torcain.glb",     (in rpg/assets/)
         "height": 1.4,                      metres tall in the game (omit: as tall as who it replaces)
         "yaw":    0,                        degrees, if it faces the wrong way (the game faces +z)
         "y":      0,                        metres up or down, if its feet aren't at its origin
         "hand":   "RightHand",              a bone to put the weapon in (omit: no weapon is shown)
         "anims":  { "idle": "Idle", "walk": "Walk", "run": "Run", "attack1": "Slash", ... },
         "runSpeed": 7, "walkSpeed": 2.2     the speed each of those clips was animated at
     } }
     "props": [ { "file": "models/statue.glb", "region": "xilia", "x": 10, "z": 40, "yaw": 0, "height": 3, "solid": true } ]

   <who>: torcain, tanoc, phorus; npc_<look> (npc_buhkon, …); foe_<type> (foe_punk, foe_rodak, …);
          eikar (every Eikar with no entry of their own).
   The moves the game asks for: idle walk run jump fall roll attack1 attack2 attack3 attack4 attack
   hurt talk drink sit. Name whichever your model has under "anims"; clips whose own names already say
   what they are (Idle, Walking, Run, Jump, Attack, Roll, …) are found without being listed. A move
   with no clip falls back to the nearest one (attack2 → attack1 → attack; run → walk → idle).
   A model with a skeleton but no clips is walked by its bones (Mixamo-style names); a model with
   neither is moved as one solid piece: it bobs with its stride, leans into a run, tips into a blow.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const BASE = new URL('../assets/', import.meta.url).href;
const LIB = new Map();          // who → { def, scene, clips, size, min }
let PROPS = [];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;

/* read the manifest and fetch every model in it. Never throws: a missing file is reported and skipped. */
export async function loadModels() {
  let man = null;
  try { const r = await fetch(BASE + 'models.json', { cache: 'no-cache' }); if (r.ok) man = await r.json(); } catch (e) { /* none */ }
  if (!man) return;
  const loader = new GLTFLoader(), jobs = [];
  const get = file => new Promise(res => loader.load(BASE + file, g => res(g), undefined, e => { console.warn('[models] could not load ' + file, e && e.message); res(null); }));
  for (const [who, def] of Object.entries(man.models || {})) {
    if (!def || !def.file) continue;
    jobs.push(get(def.file).then(g => { if (g) LIB.set(who, measure({ def, scene: g.scene, clips: g.animations || [] })); }));
  }
  for (const p of man.props || []) if (p && p.file) jobs.push(get(p.file).then(g => { if (g) PROPS.push(measure({ def: p, scene: g.scene, clips: g.animations || [] })); }));
  await Promise.all(jobs);
}
function measure(M) {
  M.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(M.scene);
  M.size = box.getSize(new THREE.Vector3()); M.min = box.min.clone(); M.mid = box.getCenter(new THREE.Vector3());
  M.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = !o.isSkinnedMesh; } });
  return M;
}
export const hasModel = who => LIB.has(who);

/* which clip plays a move: the manifest's name for it, else a clip whose own name says so, else the nearest move */
const GUESS = {
  idle: /idle|stand|breath/i, walk: /walk/i, run: /run|sprint|jog/i, jump: /jump/i, fall: /fall|air/i, roll: /roll|dodge/i,
  attack1: /attack.?1|slash|swing|melee|punch|attack/i, attack2: /attack.?2|backhand|combo.?2/i, attack3: /attack.?3|heavy|overhead|chop|smash/i, attack4: /thrust|stab|lunge|attack.?4/i,
  attack: /attack|bite|slash|punch|hit(?!_react)/i, hurt: /hurt|hit_?react|damage|flinch/i, talk: /talk|speak|wave|yes/i, drink: /drink|eat/i, sit: /sit|ride/i,
};
const NEXT = { attack2: 'attack1', attack3: 'attack1', attack4: 'attack1', attack1: 'attack', attack: null, run: 'walk', walk: 'idle', fall: 'jump', jump: 'idle', roll: 'jump', talk: 'idle', drink: 'idle', sit: 'idle', hurt: null, idle: null };
function clipTable(M) {
  const by = {}, named = M.def.anims || {};
  for (const move of Object.keys(GUESS)) {
    const want = named[move];
    by[move] = (want && M.clips.find(c => c.name === want)) || (!want && M.clips.find(c => GUESS[move].test(c.name))) || null;
  }
  if (!by.idle && M.clips.length === 1) by.idle = M.clips[0];
  return move => { for (let m = move; m; m = NEXT[m]) if (by[m]) return { clip: by[m], move: m }; return null; };
}

/* bones by what they are, for a rig with no clips of its own (Mixamo and most humanoid rigs name them so) */
const BONES = { hips: /hips|pelvis/i, spine: /spine1?$|chest/i, head: /head$/i, lUp: /left.?up.?leg|thigh.?l|l.?thigh/i, rUp: /right.?up.?leg|thigh.?r|r.?thigh/i, lLo: /left.?leg$|shin.?l|l.?(calf|shin)/i, rLo: /right.?leg$|shin.?r|r.?(calf|shin)/i, lArm: /left.?arm$|upper.?arm.?l/i, rArm: /right.?arm$|upper.?arm.?r/i, lFore: /left.?fore.?arm|fore.?arm.?l/i, rFore: /right.?fore.?arm|fore.?arm.?r/i };

/* put the model for <who> on an actor the game has built (its root, and its own animate(dt, st)). The game's own
   figure stays inside it, unseen, so everything that reaches into it (the weapon in its hand, its head, its cape)
   still works; the model is what you see. Returns the actor. */
export function dress(actor, who, fallback) {
  const M = LIB.get(who) || (fallback && LIB.get(fallback));
  if (!M || !actor || !actor.root || actor._dressed) return actor;
  actor._dressed = true;
  const root = actor.root, def = M.def;
  // how tall the game's own figure is, before it is hidden
  root.updateMatrixWorld(true);
  const own = new THREE.Box3().setFromObject(root), ownH = Math.max(0.2, (own.max.y - own.min.y) / (root.scale.y || 1));
  const hidden = [];
  root.traverse(o => { if (o !== root && (o.isMesh || o.isSprite || o.isLine || o.isPoints) && o.name !== 'shade') { o.userData.wasVisible = o.visible; o.visible = false; hidden.push(o); } });
  const model = M.clips.length || hasSkin(M.scene) ? cloneSkinned(M.scene) : M.scene.clone(true);
  const k = (def.height || ownH) / Math.max(1e-3, M.size.y);
  const hold = new THREE.Group(); hold.name = 'model';
  model.scale.multiplyScalar(k); model.position.set(-M.mid.x * k, -M.min.y * k + (def.y || 0), -M.mid.z * k);
  hold.rotation.y = (def.yaw || 0) * Math.PI / 180; hold.add(model); root.add(hold);
  hold.userData.noOutline = true; hold.traverse(o => { o.userData.noOutline = true; o.userData.noSolid = true; });
  // the weapon goes in the model's hand, if it has one named
  let hand = null;
  if (def.hand) model.traverse(o => { if (!hand && o.isBone && o.name === def.hand) hand = o; });
  const mats = []; model.traverse(o => { if (o.isMesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && m.emissive && !mats.includes(m)) { m.userData.em0 = m.emissive.clone(); mats.push(m); } });

  const mixer = M.clips.length ? new THREE.AnimationMixer(model) : null, pick = mixer ? clipTable(M) : null, actions = new Map();
  let cur = null, curMove = '', lastY = null, vy = 0, sq = 0, sqV = 0, ph = Math.random() * 6, kS = 0, atkK = 0, leanS = 0;
  const bones = {}; if (!mixer) model.traverse(o => { if (o.isBone) for (const [key, re] of Object.entries(BONES)) if (!bones[key] && re.test(o.name)) bones[key] = { b: o, q: o.quaternion.clone() }; });
  const boned = !mixer && bones.hips && bones.lUp && bones.rUp;
  const _e = new THREE.Euler(), _q = new THREE.Quaternion();
  const turn = (key, x, y = 0, z = 0) => { const B = bones[key]; if (B) B.b.quaternion.copy(B.q).multiply(_q.setFromEuler(_e.set(x, y, z))); };
  const inner = actor.animate ? actor.animate.bind(actor) : null;

  actor.model = model;
  actor.animate = function (dt, st = {}) {
    if (inner) inner(dt, st);                       // the unseen figure keeps its own time (the game reads things off it)
    for (let i = 0; i < hidden.length; i++) { const o = hidden[i]; if (o.visible && !(hand && inWeapon(o, actor.weapon))) o.visible = false; }   // and stays unseen, whatever it shows of itself
    if (!(dt > 0)) return;
    const spd = st.speed || 0, onGround = st.onGround !== false, sw = st.swing && typeof st.swing === 'object' ? st.swing : null;
    const windup = st.windup || 0, strike = Math.max(st.attack || 0, typeof st.swing === 'number' ? st.swing : 0);
    const y = root.position.y; vy = lastY === null ? 0 : lerp(vy, clamp((y - lastY) / dt, -30, 30), 1 - Math.exp(-12 * dt)); lastY = y;
    if (mixer) {
      let move = 'idle', at = null, rate = 1;
      if (st.roll) { move = 'roll'; at = clamp(st.roll.p, 0, 1); }
      else if (sw) { move = 'attack' + (sw.kind || 1); at = clamp(sw.p, 0, 1); }
      else if (windup > 0.02 || strike > 0.02) { move = 'attack'; at = strike > 0.02 ? 0.45 + 0.55 * (1 - strike) : 0.45 * Math.min(1, windup); }
      else if (!onGround) move = vy > 0.5 ? 'jump' : 'fall';
      else if (st.drink) move = 'drink';
      else if (st.ride || st.sit) move = 'sit';
      else if ((st.hurt || 0) > 0.3) move = 'hurt';
      else if (spd > 4.4) { move = 'run'; rate = spd / (def.runSpeed || 7); }
      else if (spd > 0.35) { move = 'walk'; rate = spd / (def.walkSpeed || 2.2); }
      else if (st.talking) move = 'talk';
      let got = pick(move);
      if (!got && move !== 'idle') { got = pick(spd > 0.35 ? 'walk' : 'idle'); at = null; }
      if (got) {
        if (got.move === 'walk' && move === 'run') rate = spd / (def.walkSpeed || 2.2);
        let A = actions.get(got.clip);
        if (!A) { A = mixer.clipAction(got.clip); actions.set(got.clip, A); }
        if (A !== cur) {
          A.reset(); A.enabled = true; A.setEffectiveWeight(1);
          const once = at !== null || /^(jump|hurt)$/.test(got.move);
          A.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); A.clampWhenFinished = once;
          A.play(); if (cur) cur.crossFadeTo(A, curMove.startsWith('attack') || got.move.startsWith('attack') ? 0.07 : 0.16, false);
          cur = A; curMove = got.move;
        }
        if (at !== null && (got.move.startsWith('attack') || got.move === 'roll')) { cur.paused = true; cur.time = at * got.clip.duration; }   // a blow or a roll keeps the game's own time, so it lands when the game says
        else { cur.paused = false; cur.timeScale = clamp(rate, 0.4, 2.6); }
      }
      mixer.update(dt);
    } else {
      // no clips: walked by its bones if it has them, else moved as one piece — a bob with the stride, a lean into
      // speed, squash on landing, a tip into the blow, a turn head-over-heels for the roll
      kS = lerp(kS, onGround ? clamp(spd / 7, 0, 1.3) : 0, 1 - Math.exp(-10 * dt));
      ph += dt * (4 + kS * 9) * Math.min(1, kS * 6);
      const p = sw ? clamp(sw.p, 0, 1) : strike > 0.02 ? 0.45 + 0.55 * (1 - strike) : windup > 0.02 ? 0.3 * windup : -1;
      atkK = lerp(atkK, p >= 0 ? (p < 0.25 ? -p / 0.25 * 0.5 : Math.sin(Math.min(1, (p - 0.25) / 0.5) * Math.PI)) : 0, 1 - Math.exp(-22 * dt));
      const target = !onGround ? clamp(vy * 0.012, -0.05, 0.08) : 0; sqV += ((target - sq) * 140 - sqV * 13) * dt; sq = clamp(sq + sqV * dt, -0.16, 0.14);
      leanS = lerp(leanS, kS * 0.22 + atkK * 0.3, 1 - Math.exp(-10 * dt));
      if (boned) {
        const s = Math.sin(ph), c = Math.cos(ph), a = kS * 0.75;
        turn('lUp', -s * a); turn('rUp', s * a); turn('lLo', Math.max(0, c) * a * 1.3); turn('rLo', Math.max(0, -c) * a * 1.3);
        turn('lArm', s * a * 0.8); turn('rArm', -s * a * 0.8 - Math.max(0, atkK) * 1.6 + Math.min(0, atkK) * 1.2); turn('lFore', -kS * 0.6); turn('rFore', -kS * 0.6 - Math.max(0, atkK) * 0.4);
        turn('spine', leanS * 0.8, atkK * 0.5); turn('head', -leanS * 0.5);
        hold.position.y = Math.abs(c) * 0.03 * kS;
      } else {
        hold.position.y = Math.abs(Math.sin(ph)) * 0.05 * kS * (def.height || ownH);
        hold.rotation.x = leanS + (st.roll ? clamp(st.roll.p, 0, 1) * Math.PI * 2 : 0);
        hold.rotation.z = Math.sin(ph) * 0.05 * kS;
      }
      hold.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
    }
    if (hand && actor.weapon && actor.weapon.parent !== hand) {   // the weapon, in the model's hand, at the size it always was
      hand.add(actor.weapon); actor.weapon.traverse(o => { if (o.userData.wasVisible !== undefined) o.visible = o.userData.wasVisible; });
      root.updateMatrixWorld(true); const hs = hand.getWorldScale(new THREE.Vector3()).x || 1, rs = root.getWorldScale(new THREE.Vector3()).x || 1;
      actor.weapon.scale.setScalar(rs / hs); actor.weapon.position.set(0, 0, 0);
    }
  };
  const flash0 = actor.flash ? actor.flash.bind(actor) : null;
  actor.flash = v => { if (flash0) flash0(v); for (const m of mats) m.emissive.copy(m.userData.em0).addScalar(v * 0.8); };
  return actor;
}
const inWeapon = (o, w) => { for (let q = o; q; q = q.parent) if (q === w) return true; return false; };
const hasSkin = scene => { let s = false; scene.traverse(o => { if (o.isSkinnedMesh) s = true; }); return s; };

/* stand the manifest's props in a region: each on the ground at its place, turned and sized as asked.
   addCollider(x, z, halfW, halfD, angle, bottom, top) makes one solid (the region's own collision). */
export function placeProps(scene, region, heightAt, addCollider) {
  const out = [];
  for (const M of PROPS) {
    const d = M.def; if (d.region && d.region !== region) continue;
    const g = new THREE.Group(), m = M.scene.clone(true), k = d.height ? d.height / Math.max(1e-3, M.size.y) : (d.scale || 1);
    m.scale.multiplyScalar(k); m.position.set(-M.mid.x * k, -M.min.y * k, -M.mid.z * k); g.add(m);
    const x = d.x || 0, z = d.z || 0, y = (d.y ?? 0) + heightAt(x, z);
    g.position.set(x, y, z); g.rotation.y = (d.yaw || 0) * Math.PI / 180;
    g.traverse(o => { o.userData.noOutline = true; o.userData.noSolid = true; });
    scene.add(g); out.push(g);
    if (d.solid !== false && addCollider) addCollider(x, z, M.size.x * k * 0.5, M.size.z * k * 0.5, -g.rotation.y, y - 1, y + M.size.y * k);
  }
  return out;
}
