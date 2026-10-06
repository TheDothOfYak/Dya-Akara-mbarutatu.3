/* ============================================================
   TORCAIN'S RUN — a single-player action RPG in the Mbaru Tatu.
   Third person: WASD + mouse. Torcain and Phorus search the
   Ruins of Aakalay for five singing memory cores.
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { clamp, lerp, damp, dampAngle, angleDiff } from './util.js';
import { Particles, glowSprite } from './gfx.js';
import { buildSky, SUN_DIR } from './sky.js';
import { buildEldiShip } from './ship.js';
import { buildWorld } from './world.js';
import { buildTorcain, buildPhorus, buildPunk, buildMegla, buildCore } from './actors.js';
import * as STORY from './story.js';
import { initAudio, sfx, setVolume } from './audio.js';

const $ = id => document.getElementById(id);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ---------------- settings ---------------- */
const OPT = { sens: 1, invert: false, vol: 0.7, bloom: true, shadows: true, scale: 1 };
try { Object.assign(OPT, JSON.parse(localStorage.getItem('torcain-opts') || '{}')); } catch (e) { /* private mode */ }
const saveOpts = () => { try { localStorage.setItem('torcain-opts', JSON.stringify(OPT)); } catch (e) { /* ignore */ } };

/* ---------------- renderer ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = OPT.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.08;
$('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf2b88e, 140, 1100);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 12000);

const hemi = new THREE.HemisphereLight(0xb8d0ff, 0xc0804e, 1.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd4a0, 2.7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 260 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0x9ab8ff, 0.55); rim.position.set(60, 40, -80); scene.add(rim);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.55, 0.86);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const pr = Math.min(devicePixelRatio, 1.75) * OPT.scale;
  renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  particles && particles.setScale(innerHeight * pr * 0.9);
}

/* ---------------- world ---------------- */
let particles = null;
const world = buildWorld(scene);
const sky = buildSky(scene, buildEldiShip);
particles = new Particles(scene, 3000);
resize();
addEventListener('resize', resize);

const ship = buildEldiShip();
ship.group.position.set(13, world.pier.y - 1.6, world.pier.end - 16);
scene.add(ship.group);
{ // gangplank
  const plank = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 1.4), new THREE.MeshToonMaterial({ color: 0x8a5a36 }));
  plank.position.set(6.4, world.pier.y + 0.35, world.pier.end - 13); plank.rotation.z = -0.08; plank.castShadow = true;
  scene.add(plank);
}
const STRYX_SPOT = V3(3.5, world.pier.y, world.pier.end - 13);

/* ---------------- game state ---------------- */
const G = {
  mode: 'title',            // title | intro | play | dialog | memory | trance | end
  paused: false, t: 0,
  talked: false, firstFight: false, coresGot: {}, coreCount: 0, sensed: null, senseTimer: 0,
  stonePrimed: false, bossActive: false, bossDead: false, done: false, saidHalf: false,
  visited: {}, checkpoint: null, hitstop: 0, shake: 0,
};

/* ---------------- player ---------------- */
const torcain = buildTorcain();
scene.add(torcain.root);
const P = {
  pos: world.pier.start.clone(), vel: V3(), yaw: Math.PI, onGround: true, hp: 100, maxHp: 100, heat: 0,
  atk: null, queued: false, comboIdx: 0, comboReset: 0, duatCd: 0, senseCd: 0, iframes: 0, lastHurt: -99,
  lastSafe: world.pier.start.clone(), safeTimer: 0, coyote: 0, jumpBuf: 0, stepPh: 0, flareT: 0, dead: false,
};
G.checkpoint = world.pier.start.clone();

/* ---------------- Phorus ---------------- */
const phorus = buildPhorus();
scene.add(phorus.root);
const F = { pos: world.pier.start.clone().add(V3(-2, 0, -3)), vel: V3(), yaw: Math.PI, cd: 1, cast: 0, onGround: true, target: null };

/* ---------------- camera rig ---------------- */
const CAM = { yaw: 0, pitch: 0.28, dist: 6.5, wantDist: 6.5, pos: V3(), target: V3(), shakeV: V3() };

/* ---------------- input ---------------- */
const keys = {};
let mouseL = false, locked = false;
addEventListener('keydown', e => {
  if (e.code === 'Tab') e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  onKey(e.code);
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = false; });
const canvas = renderer.domElement;
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && !G.paused && (G.mode === 'play' || G.mode === 'dialog' || G.mode === 'memory') && $('journal').classList.contains('hidden')) openPause();
});
document.addEventListener('mousemove', e => {
  if (!locked || G.paused) return;
  if (G.mode !== 'play' && G.mode !== 'dialog' && G.mode !== 'memory') return;
  const s = 0.0023 * OPT.sens;
  CAM.yaw -= e.movementX * s;
  CAM.pitch = clamp(CAM.pitch + e.movementY * s * (OPT.invert ? -1 : 1), -0.45, 1.25);
});
document.addEventListener('mousedown', e => {
  if (G.mode === 'title') return;
  if (G.mode === 'intro' || G.mode === 'trance') { skipCards(); return; }
  if (!locked) { if (!G.paused && G.mode !== 'end') lockMouse(); return; }
  if (G.mode === 'dialog') { advanceDialog(); return; }
  if (G.mode === 'memory') { closeMemory(); return; }
  if (G.mode !== 'play' || G.paused) return;
  if (e.button === 0) { mouseL = true; pressAttack(); }
  if (e.button === 2) duatStrike();
});
document.addEventListener('mouseup', e => { if (e.button === 0) mouseL = false; });
document.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', e => { CAM.wantDist = clamp(CAM.wantDist + Math.sign(e.deltaY) * 0.8, 3.2, 11); }, { passive: true });

function lockMouse() { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }

function onKey(code) {
  if (G.mode === 'intro' || G.mode === 'trance') { if (code === 'Space' || code === 'Enter' || code === 'Escape') skipCards(); return; }
  if (G.mode === 'dialog') { if (code === 'KeyE' || code === 'Space' || code === 'Enter') advanceDialog(); return; }
  if (G.mode === 'memory') { if (code === 'KeyE' || code === 'Space' || code === 'Enter' || code === 'Escape') closeMemory(); return; }
  if (code === 'Tab' && (G.mode === 'play')) { toggleJournal(); return; }
  if (G.mode !== 'play' || G.paused) return;
  if (code === 'Space') P.jumpBuf = 0.15;
  if (code === 'KeyE') interact();
  if (code === 'KeyQ') tukangFlare();
  if (code === 'KeyF') nurSense();
}

/* ================================================================
   ENEMIES
   ================================================================ */
const enemies = [];
function spawnEnemy(kind, x, z, group) {
  const malsti = kind === 'malsti';
  const actor = buildPunk(malsti);
  scene.add(actor.root);
  const e = {
    kind, actor, group, pos: V3(x, world.col.ground(x, z, world.heightAt(x, z) + 0.5), z), vel: V3(), yaw: Math.random() * 6,
    hp: malsti ? 26 : 60, maxHp: malsti ? 26 : 60, state: 'idle', timer: Math.random() * 2, home: V3(x, 0, z),
    speed: malsti ? 7.2 : 5.4, dmg: malsti ? 6 : 12, rad: malsti ? 0.4 : 0.85, range: malsti ? 1.5 : 2.4,
    aggro: malsti ? 17 : 15, wander: V3(x, 0, z), flash: 0, stun: 0, blinkCd: 2 + Math.random() * 2, dead: false, hitT: 0, onGround: true,
    windup: 0, attackA: 0,
  };
  enemies.push(e);
  return e;
}
world.spawnGroups.forEach((g, gi) => g.kinds.forEach((k, i) => {
  const a = i / g.kinds.length * Math.PI * 2;
  spawnEnemy(k, g.at[0] + Math.cos(a) * 3, g.at[1] + Math.sin(a) * 3, gi);
}));

function aggroGroup(e) {
  if (e.group == null) return;
  enemies.forEach(o => { if (o.group === e.group && !o.dead && o.state === 'idle') { o.state = 'chase'; } });
}

function damageEnemy(e, dmg, from, kb = 4, opts = {}) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 1; e.hitT = G.t;
  const dir = V3(e.pos.x - from.x, 0, e.pos.z - from.z).normalize();
  e.vel.addScaledVector(dir, kb * (e.kind === 'malsti' ? 1.4 : 1));
  e.vel.y = Math.max(e.vel.y, kb * 0.35);
  e.stun = Math.max(e.stun, opts.stun ?? 0.32);
  if (e.state === 'windup' || e.state === 'idle') e.state = 'chase';
  e.windup = 0;
  aggroGroup(e);
  dmgNumber(e.pos.x, e.pos.y + 1.8, e.pos.z, Math.round(dmg), opts.big ? 'big' : '');
  particles.burst(e.pos.x, e.pos.y + 1, e.pos.z, opts.big ? 22 : 12, { color: e.kind === 'malsti' ? 0xc08aff : 0xffb040, speed: 7, size: 0.35, life: 0.5, gravity: -12 });
  sfx.hit();
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  e.dead = true; e.state = 'dead'; e.timer = 0;
  sfx.die();
  particles.burst(e.pos.x, e.pos.y + 1, e.pos.z, 30, { color: e.kind === 'malsti' ? 0x9a5aff : 0xff8a30, speed: 9, size: 0.5, life: 0.9, gravity: -6 });
  particles.burst(e.pos.x, e.pos.y + 1, e.pos.z, 14, { color: 0x6a8a2a, speed: 5, size: 0.3, life: 0.8, gravity: -14 });
  P.heat = Math.min(100, P.heat + 6);
}

function updateEnemy(e, dt) {
  const a = e.actor;
  if (e.dead) {
    e.timer += dt;
    a.root.scale.setScalar(Math.max(0.001, (e.kind === 'malsti' ? 0.5 : 1) * (1 - e.timer / 0.6)));
    a.root.rotation.z += dt * 6;
    if (e.timer > 0.6) { scene.remove(a.root); e.gone = true; }
    return;
  }
  const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz);
  const toP = Math.atan2(dx, dz);
  let wantV = 0, wantYaw = e.yaw;
  e.flash = Math.max(0, e.flash - dt * 5); a.flash(e.flash * 0.9);
  e.stun = Math.max(0, e.stun - dt);
  e.windup = 0; e.attackA = Math.max(0, e.attackA - dt * 4);

  if (P.dead) { if (e.state !== 'idle') { e.state = 'return'; } }

  if (e.stun > 0) {
    // reeling
  } else if (e.state === 'idle') {
    e.timer -= dt;
    if (e.timer <= 0) { e.timer = 2 + Math.random() * 3; e.wander.set(e.home.x + (Math.random() - 0.5) * 10, 0, e.home.z + (Math.random() - 0.5) * 10); }
    const wx = e.wander.x - e.pos.x, wz = e.wander.z - e.pos.z;
    if (Math.hypot(wx, wz) > 1) { wantV = e.speed * 0.3; wantYaw = Math.atan2(wx, wz); }
    if (d < e.aggro && !P.dead && G.mode === 'play') {
      e.state = 'chase'; aggroGroup(e);
      if (!G.firstFight) { G.firstFight = true; bark('phorus', STORY.DIALOG.firstFight[0][1]); }
    }
  } else if (e.state === 'chase') {
    wantYaw = toP; wantV = e.speed;
    if (d < e.range) { e.state = 'windup'; e.timer = e.kind === 'malsti' ? 0.35 : 0.6; }
    const homeD = Math.hypot(e.pos.x - e.home.x, e.pos.z - e.home.z);
    if ((homeD > 55 || d > 40) && !e.boss) e.state = 'return';
    if (e.kind === 'malsti') {
      e.blinkCd -= dt;
      if (e.blinkCd <= 0 && d > 4) {
        e.blinkCd = 2.5 + Math.random() * 2.5;
        const ang = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 2;
        particles.burst(e.pos.x, e.pos.y + 0.5, e.pos.z, 14, { color: 0x9a4aff, speed: 4, size: 0.4, life: 0.5 });
        e.pos.x = P.pos.x + Math.cos(ang) * r; e.pos.z = P.pos.z + Math.sin(ang) * r;
        e.pos.y = world.col.ground(e.pos.x, e.pos.z, P.pos.y + 2);
        particles.burst(e.pos.x, e.pos.y + 0.5, e.pos.z, 14, { color: 0xc08aff, speed: 4, size: 0.4, life: 0.5 });
        sfx.blink();
      }
    }
  } else if (e.state === 'windup') {
    wantYaw = toP; e.timer -= dt;
    const tot = e.kind === 'malsti' ? 0.35 : 0.6;
    e.windup = 1 - e.timer / tot;
    if (e.timer <= 0) {
      e.state = 'attack'; e.timer = 0.22; e.hitDone = false;
      e.vel.x += Math.sin(e.yaw) * 9; e.vel.z += Math.cos(e.yaw) * 9;
    }
  } else if (e.state === 'attack') {
    e.timer -= dt; e.attackA = 1;
    if (!e.hitDone && d < e.range + 0.7 && Math.abs(P.pos.y - e.pos.y) < 2) { e.hitDone = true; hurtPlayer(e.dmg, e.pos); }
    if (e.timer <= 0) { e.state = 'recover'; e.timer = e.kind === 'malsti' ? 0.5 : 0.75; }
  } else if (e.state === 'recover') {
    e.timer -= dt; if (e.timer <= 0) e.state = 'chase';
  } else if (e.state === 'return') {
    const hx = e.home.x - e.pos.x, hz = e.home.z - e.pos.z;
    wantYaw = Math.atan2(hx, hz); wantV = e.speed;
    e.hp = Math.min(e.maxHp, e.hp + dt * 20);
    if (Math.hypot(hx, hz) < 2) { e.state = 'idle'; e.timer = 1; }
  }

  e.yaw = dampAngle(e.yaw, wantYaw, 10, dt);
  const ax = Math.sin(e.yaw) * wantV, az = Math.cos(e.yaw) * wantV;
  const k = e.stun > 0 ? 2 : 10;
  e.vel.x = damp(e.vel.x, e.stun > 0 ? 0 : ax, k, dt);
  e.vel.z = damp(e.vel.z, e.stun > 0 ? 0 : az, k, dt);
  e.vel.y -= 30 * dt;
  e.pos.addScaledVector(e.vel, dt);
  // keep apart from each other and from the player
  for (const o of enemies) {
    if (o === e || o.dead) continue;
    const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z, od = Math.hypot(ox, oz), min = e.rad + o.rad;
    if (od < min && od > 1e-3) { e.pos.x += ox / od * (min - od) * 0.5; e.pos.z += oz / od * (min - od) * 0.5; }
  }
  if (d < e.rad + 0.45 && d > 1e-3) { e.pos.x -= dx / d * (e.rad + 0.45 - d); e.pos.z -= dz / d * (e.rad + 0.45 - d); }
  world.col.resolve(e.pos, e.rad, 1.6);
  if (G.bossActive) arenaClamp(e.pos, 28.5);
  const g = world.col.ground(e.pos.x, e.pos.z, e.pos.y);
  if (e.pos.y <= g) { e.pos.y = g; e.vel.y = 0; }
  if (e.pos.y < -60) { e.hp = 0; killEnemy(e); }

  a.root.position.copy(e.pos);
  a.root.rotation.y = e.yaw;
  a.animate(dt, { speed: Math.hypot(e.vel.x, e.vel.z), t: G.t, windup: e.windup, attack: e.attackA });
}

/* ================================================================
   THE BOSS
   ================================================================ */
let boss = null;
const telegraphs = [];     // { mesh, x, z, r, t, dur, dmg, kind }
const projectiles = [];    // { sprite, pos, vel, dmg, owner, life, target }

function ringMesh(r, color) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.9, r, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
  m.add(fill); fill.position.z = 0.01; m.userData.fill = fill;
  scene.add(m);
  return m;
}

function startBoss() {
  const meg = buildMegla();
  const pz = world.PLAZA;
  meg.root.position.set(pz.x, pz.y - 14, pz.z);
  scene.add(meg.root);
  boss = { actor: meg, hp: 1500, maxHp: 1500, t: 0, next: 3, phase: 1, rising: 0, sweep: 0, slam: 0, flash: 0, col: null, dead: false, deadT: 0, summonT: 12 };
  G.bossActive = true;
  // the stone sinks and its heart rises as the tree
  world.col.list.filter(c => Math.abs(c.x - pz.x) < 0.1 && Math.abs(c.z - pz.z) < 0.1 && c.top > pz.y + 5).forEach(c => world.col.remove(c));
  boss.col = world.col.add(pz.x, pz.z, 3.2, 3.2, 0, pz.y - 2, pz.y + 14);
  $('boss').classList.remove('hidden');
  sfx.roar(); G.shake = 1.2;
}

function bossTargetPoint() { return V3(world.PLAZA.x, world.PLAZA.y + 6.5, world.PLAZA.z); }

function damageBoss(dmg, opts = {}) {
  if (!boss || boss.dead || boss.rising < 1) return;
  boss.hp -= dmg; boss.flash = 1;
  const c = bossTargetPoint();
  dmgNumber(c.x + (Math.random() - 0.5) * 3, c.y + 2 + Math.random() * 2, c.z + 2, Math.round(dmg), opts.big ? 'big' : '');
  sfx.hit();
  if (boss.phase === 1 && boss.hp < boss.maxHp * 0.5) {
    boss.phase = 2; sfx.roar(); G.shake = 0.8;
    if (!G.saidHalf) { G.saidHalf = true; bark('phorus', STORY.DIALOG.bossHalf[0][1]); }
  }
  if (boss.hp <= 0) {
    boss.hp = 0; boss.dead = true; boss.deadT = 0; sfx.victory(); G.shake = 1.5;
    enemies.forEach(e => { if (!e.dead && e.bossMinion) { e.hp = 0; killEnemy(e); } });
    telegraphs.forEach(tg => scene.remove(tg.mesh)); telegraphs.length = 0;
    projectiles.filter(p => p.owner === 'boss').forEach(p => { p.life = 0; });
  }
}

function updateBoss(dt) {
  if (!boss) return;
  const b = boss, a = b.actor, pz = world.PLAZA;
  b.t += dt;
  if (b.rising < 1) {
    b.rising = Math.min(1, b.rising + dt / 3);
    a.root.position.y = pz.y - 14 + 14 * (1 - Math.pow(1 - b.rising, 3));
    world.oath.group.position.y = pz.y - b.rising * 12;
    if (Math.random() < 0.9) particles.emit(pz.x + (Math.random() - 0.5) * 14, pz.y + 0.5, pz.z + (Math.random() - 0.5) * 14, { vy: 4 + Math.random() * 4, color: 0x9a7ad8, size: 2.4, life: 1.6, drag: 0.5 });
    G.shake = Math.max(G.shake, 0.3);
    a.animate(dt, { t: G.t });
    return;
  }
  if (b.dead) {
    b.deadT += dt;
    a.root.position.y = pz.y - b.deadT * 4;
    a.root.rotation.z = Math.sin(b.deadT * 7) * 0.05;
    if (Math.random() < 0.9) particles.emit(pz.x + (Math.random() - 0.5) * 8, pz.y + Math.random() * 14, pz.z + (Math.random() - 0.5) * 8, { vy: 3, color: 0xd0b0ff, size: 1.6, life: 1.4, speed: 4 });
    if (b.deadT > 3.6) { scene.remove(a.root); world.col.remove(b.col); boss = null; G.bossActive = false; $('boss').classList.add('hidden'); afterBoss(); }
    return;
  }
  b.flash = Math.max(0, b.flash - dt * 5); a.flash(b.flash * 0.7);
  if (G.mode !== 'play') { a.animate(dt, { t: G.t }); return; }   // it waits while people talk
  b.sweep = Math.max(0, b.sweep - dt * 2); b.slam = Math.max(0, b.slam - dt * 2);
  const fast = b.phase === 2 ? 0.7 : 1;
  b.next -= dt;
  b.summonT -= dt;
  const dP = Math.hypot(P.pos.x - pz.x, P.pos.z - pz.z);
  if (b.summonT <= 0) {
    b.summonT = b.phase === 2 ? 15 : 20;
    const alive = enemies.filter(e => e.bossMinion && !e.dead).length;
    const n = Math.min(b.phase === 2 ? 4 : 3, 6 - alive);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const e = spawnEnemy('malsti', pz.x + Math.cos(ang) * 8, pz.z + Math.sin(ang) * 8, null);
      e.bossMinion = true; e.state = 'chase'; e.home.set(pz.x, 0, pz.z); e.boss = true;
      particles.burst(e.pos.x, e.pos.y + 0.5, e.pos.z, 20, { color: 0x9a4aff, speed: 5, size: 0.5, life: 0.6 });
    }
    sfx.blink();
  }
  if (b.next <= 0 && !P.dead) {
    const roll = Math.random();
    if (dP < 10 && roll < 0.45) {
      // a sweep of the great limbs — jump it
      b.next = 3.2 * fast;
      const m = ringMesh(10, 0xff5aa0);
      m.position.set(pz.x, pz.y + 0.15, pz.z);
      telegraphs.push({ mesh: m, x: pz.x, z: pz.z, r: 10, t: 0, dur: 1.0 * fast + 0.15, dmg: 22, kind: 'sweep' });
      bark('phorus', 'Jump the sweep!', 1.6);
    } else if (roll < 0.75) {
      b.next = 3.6 * fast;
      const n = b.phase === 2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const lead = i === 0 ? 0 : 1;
        const x = P.pos.x + P.vel.x * 0.5 * lead + (i ? (Math.random() - 0.5) * 9 : 0);
        const z = P.pos.z + P.vel.z * 0.5 * lead + (i ? (Math.random() - 0.5) * 9 : 0);
        const m = ringMesh(2.8, 0xb070ff);
        m.position.set(x, world.col.ground(x, z, P.pos.y + 1) + 0.12, z);
        telegraphs.push({ mesh: m, x, z, r: 2.8, t: -i * 0.18, dur: 1.15 * fast, dmg: 22, kind: 'root' });
      }
      b.slam = 1;
    } else {
      b.next = 3.4 * fast;
      const n = b.phase === 2 ? 7 : 4;
      for (let i = 0; i < n; i++) {
        const sp = glowSprite(0xc070ff, 1.6, 1);
        const c = bossTargetPoint();
        const ang = (i / n) * Math.PI * 2;
        const pos = V3(c.x + Math.cos(ang) * 2, c.y + 2, c.z + Math.sin(ang) * 2);
        sp.position.copy(pos); scene.add(sp);
        projectiles.push({ sprite: sp, pos, vel: V3(Math.cos(ang) * 6, 3, Math.sin(ang) * 6), dmg: 11, owner: 'boss', life: 6.5, homing: 2.2, speed: b.phase === 2 ? 9 : 7.5 });
      }
      b.sweep = 0.4;
    }
  }
  a.animate(dt, { t: G.t, sweep: b.sweep, slam: b.slam, enraged: b.phase === 2 });
  const hpPct = b.hp / b.maxHp;
  $('boss-fill').style.transform = `scaleX(${hpPct})`;
  $('boss-lag').style.transform = `scaleX(${hpPct})`;
}

function updateTelegraphs(dt) {
  for (let i = telegraphs.length - 1; i >= 0; i--) {
    const tg = telegraphs[i];
    tg.t += dt;
    const p = clamp(tg.t / tg.dur, 0, 1);
    tg.mesh.visible = tg.t > 0;
    tg.mesh.userData.fill.scale.setScalar(Math.max(0.01, p));
    tg.mesh.material.opacity = 0.5 + Math.sin(G.t * 20) * 0.2;
    if (tg.t >= tg.dur) {
      const d = Math.hypot(P.pos.x - tg.x, P.pos.z - tg.z);
      if (tg.kind === 'root') {
        if (d < tg.r && P.pos.y - world.col.ground(P.pos.x, P.pos.z, P.pos.y) < 1.2) hurtPlayer(tg.dmg, V3(tg.x, 0, tg.z), 10);
        rootSpikes(tg.x, tg.mesh.position.y, tg.z); sfx.slam(); G.shake = Math.max(G.shake, 0.35);
      } else if (tg.kind === 'sweep') {
        const air = P.pos.y - world.col.ground(P.pos.x, P.pos.z, P.pos.y);
        if (d < tg.r && air < 0.8) hurtPlayer(tg.dmg, V3(tg.x, 0, tg.z), 16);
        particles.ring(tg.x, tg.mesh.position.y + 1, tg.z, 60, 16, { color: 0xd0a0ff, size: 0.8, life: 0.6 });
        sfx.heavy(); G.shake = Math.max(G.shake, 0.5);
      }
      scene.remove(tg.mesh);
      telegraphs.splice(i, 1);
    }
  }
}

const spikes = [];
const spikeGeo = new THREE.ConeGeometry(0.45, 3.4, 5);
const spikeMat = new THREE.MeshToonMaterial({ color: 0x4a4258, emissive: 0x3a1a6a, emissiveIntensity: 0.5 });
function rootSpikes(x, y, z) {
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(spikeGeo, spikeMat);
    const a = Math.random() * Math.PI * 2, r = Math.random() * 2.2;
    m.position.set(x + Math.cos(a) * r, y - 2, z + Math.sin(a) * r);
    m.rotation.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5);
    m.castShadow = true; scene.add(m);
    spikes.push({ m, t: 0, y });
  }
  particles.burst(x, y + 0.3, z, 30, { color: 0x9a7ad8, speed: 8, size: 0.6, life: 0.7, gravity: -10 });
}
function updateSpikes(dt) {
  for (let i = spikes.length - 1; i >= 0; i--) {
    const s = spikes[i]; s.t += dt;
    s.m.position.y = s.y - 2 + Math.min(1, s.t * 8) * 2.6 - Math.max(0, s.t - 0.9) * 6;
    if (s.t > 1.5) { scene.remove(s.m); spikes.splice(i, 1); }
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life -= dt;
    if (p.owner === 'boss') {
      const to = V3(P.pos.x - p.pos.x, P.pos.y + 1.1 - p.pos.y, P.pos.z - p.pos.z);
      const d = to.length();
      to.normalize().multiplyScalar(p.speed);
      p.vel.lerp(to, 1 - Math.exp(-p.homing * dt));
      if (d < 1.1) { hurtPlayer(p.dmg, p.pos, 5); p.life = 0; }
      // the axe can cut them from the air
      if (P.atk && P.atk.p > 0.2 && P.atk.p < 0.7 && d < 2.6) {
        p.life = 0; particles.burst(p.pos.x, p.pos.y, p.pos.z, 12, { color: 0xd0a0ff, speed: 6, size: 0.4, life: 0.4 });
        P.heat = Math.min(100, P.heat + 4);
      }
      if (Math.random() < 0.6) particles.emit(p.pos.x, p.pos.y, p.pos.z, { color: 0x9a5aff, size: 0.6, life: 0.4, speed: 0.5 });
    } else {
      const tgt = p.target;
      if (tgt && !tgt.dead) {
        const tp = tgt.isBoss ? bossTargetPoint() : V3(tgt.pos.x, tgt.pos.y + 0.8, tgt.pos.z);
        const to = tp.clone().sub(p.pos); const d = to.length();
        p.vel.lerp(to.normalize().multiplyScalar(30), 1 - Math.exp(-8 * dt));
        if (d < (tgt.isBoss ? 3 : 1.0)) {
          if (tgt.isBoss) damageBoss(p.dmg); else damageEnemy(tgt, p.dmg, F.pos, 2.5, { stun: 0.2 });
          particles.burst(p.pos.x, p.pos.y, p.pos.z, 16, { color: 0x7ad8ff, speed: 6, size: 0.4, life: 0.5 });
          p.life = 0;
        }
      }
      if (Math.random() < 0.8) particles.emit(p.pos.x, p.pos.y, p.pos.z, { color: 0x9adfff, size: 0.35, life: 0.35, speed: 0.4 });
    }
    p.pos.addScaledVector(p.vel, dt);
    p.sprite.position.copy(p.pos);
    if (p.life <= 0) { scene.remove(p.sprite); projectiles.splice(i, 1); }
  }
}

function arenaClamp(pos, R) {
  const pz = world.PLAZA, dx = pos.x - pz.x, dz = pos.z - pz.z, d = Math.hypot(dx, dz);
  if (d > R) { pos.x = pz.x + dx / d * R; pos.z = pz.z + dz / d * R; }
}

/* ================================================================
   PLAYER ACTIONS
   ================================================================ */
const ATK = { 1: { dur: 0.42, dmg: 16, kb: 5, range: 3.0 }, 2: { dur: 0.42, dmg: 18, kb: 5, range: 3.0 }, 3: { dur: 0.62, dmg: 34, kb: 10, range: 3.5 } };

function camForward() { return V3(-Math.sin(CAM.yaw), 0, -Math.cos(CAM.yaw)); }

function pressAttack() {
  if (P.dead) return;
  if (!P.atk) startAttack(P.comboReset > 0 ? (P.comboIdx % 3) + 1 : 1);
  else if (P.atk.p > 0.35) P.queued = true;
}

function startAttack(kind) {
  P.atk = { kind, t: 0, p: 0, hit: new Set(), dur: ATK[kind].dur };
  P.comboIdx = kind; P.queued = false;
  const f = camForward();
  P.yaw = Math.atan2(f.x, f.z);
  P.vel.x += f.x * (kind === 3 ? 6 : 4); P.vel.z += f.z * (kind === 3 ? 6 : 4);
  kind === 3 ? sfx.heavy() : sfx.swing();
}

function updateAttack(dt) {
  if (!P.atk) { P.comboReset = Math.max(0, P.comboReset - dt); return; }
  const A = P.atk, def = ATK[A.kind];
  A.t += dt; A.p = A.t / A.dur;
  if (A.p > 0.28 && A.p < 0.7) {
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    for (const e of enemies) {
      if (e.dead || A.hit.has(e)) continue;
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d > def.range + e.rad || Math.abs(e.pos.y - P.pos.y) > 2.2) continue;
      if (d > 0.8 && (dx * fx + dz * fz) / d < 0.15) continue;
      A.hit.add(e);
      damageEnemy(e, def.dmg * (0.9 + Math.random() * 0.2), P.pos, def.kb, { big: A.kind === 3, stun: A.kind === 3 ? 0.6 : 0.32 });
      P.heat = Math.min(100, P.heat + 7);
      G.hitstop = A.kind === 3 ? 0.07 : 0.04;
      G.shake = Math.max(G.shake, A.kind === 3 ? 0.35 : 0.15);
    }
    if (boss && !boss.dead && !A.hit.has('boss')) {
      const pz = world.PLAZA, d = Math.hypot(P.pos.x - pz.x, P.pos.z - pz.z);
      if (d < def.range + 3.4) {
        A.hit.add('boss'); damageBoss(def.dmg * (A.kind === 3 ? 1.2 : 1), { big: A.kind === 3 });
        P.heat = Math.min(100, P.heat + 7); G.hitstop = 0.05; G.shake = Math.max(G.shake, 0.2);
      }
    }
    // a trail of light behind the axe
    const wp = torcain.weapon.getWorldPosition(V3());
    particles.emit(wp.x, wp.y, wp.z, { color: A.kind === 3 ? 0xffa050 : 0xc8a0ff, size: 0.5, life: 0.25, speed: 0.3 });
  }
  if (A.kind === 3 && A.p > 0.55 && !A.slammed) {
    A.slammed = true;
    const f = V3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
    const x = P.pos.x + f.x * 2, z = P.pos.z + f.z * 2;
    particles.ring(x, P.pos.y + 0.2, z, 24, 7, { color: 0xffb060, size: 0.5, life: 0.4 });
  }
  if (A.t >= A.dur) {
    const next = P.queued && A.kind < 3 ? A.kind + 1 : 0;
    P.atk = null; P.comboReset = 0.35;
    if (next) startAttack(next); else if (A.kind === 3) P.comboIdx = 0;
  }
}

function duatStrike() {
  if (P.dead || P.duatCd > 0) return;
  const f = camForward();
  let best = null, bestScore = -1;
  const cands = enemies.filter(e => !e.dead).map(e => ({ e, p: V3(e.pos.x, e.pos.y + 0.8, e.pos.z) }));
  if (boss && !boss.dead && boss.rising >= 1) cands.push({ e: { isBoss: true }, p: bossTargetPoint() });
  for (const c of cands) {
    const dx = c.p.x - P.pos.x, dz = c.p.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > 28 || d < 0.5) continue;
    const dot = (dx * f.x + dz * f.z) / d;
    if (dot < 0.8) continue;
    const score = dot * 2 - d / 28;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  if (!best) { toast('No foe in sight for the Duat to carry the axe to.'); return; }
  P.duatCd = 5;
  sfx.duat();
  const wp = torcain.weapon.getWorldPosition(V3());
  particles.burst(wp.x, wp.y, wp.z, 26, { color: 0x9a5aff, speed: 5, size: 0.5, life: 0.5 });
  const tp = best.p;
  // a seam in the air above the foe, and the axe falling out of it
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2;
    particles.emit(tp.x + Math.cos(a) * 1.4, tp.y + 2.4, tp.z + Math.sin(a) * 1.4, { vx: 0, vy: -6, vz: 0, color: 0xb07aff, size: 0.55, life: 0.45 });
  }
  setTimeout(() => {
    if (best.e.isBoss) damageBoss(55 * 2, { big: true });
    else if (!best.e.dead) damageEnemy(best.e, 48, P.pos, 3, { big: true, stun: 1.0 });
    particles.burst(tp.x, tp.y + 0.5, tp.z, 30, { color: 0xe0c0ff, speed: 9, size: 0.5, life: 0.6, gravity: -8 });
    G.shake = Math.max(G.shake, 0.4); G.hitstop = 0.06;
    P.heat = Math.min(100, P.heat + 10);
  }, 180);
}

function tukangFlare() {
  if (P.dead) return;
  if (P.heat < 100) { toast('The Tukang needs more heat — land your strikes.'); return; }
  P.heat = 0; P.flareT = 0.6;
  sfx.flare(); G.shake = 0.8; G.hitstop = 0.08;
  particles.ring(P.pos.x, P.pos.y + 0.6, P.pos.z, 80, 18, { color: 0xff8a2a, size: 1.0, life: 0.7 });
  particles.ring(P.pos.x, P.pos.y + 1.2, P.pos.z, 50, 12, { color: 0xffd070, size: 0.7, life: 0.6 });
  particles.burst(P.pos.x, P.pos.y + 1, P.pos.z, 50, { color: 0xffa040, speed: 10, size: 0.6, life: 0.8, gravity: 4 });
  for (const e of enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
    if (d < 8) damageEnemy(e, 55, P.pos, 15, { big: true, stun: 1 });
  }
  if (boss && !boss.dead) { const pz = world.PLAZA; if (Math.hypot(P.pos.x - pz.x, P.pos.z - pz.z) < 12) damageBoss(90, { big: true }); }
}

function nurSense() {
  if (P.senseCd > 0) return;
  P.senseCd = 7;
  sfx.sense();
  // the ripple goes out from Phorus
  particles.ring(F.pos.x, F.pos.y + 1, F.pos.z, 70, 24, { color: 0x9adfff, size: 0.6, life: 1.2, drag: 0.3 });
  let target = null, bd = 1e9, label = '';
  if (G.coreCount < 5) {
    for (const c of cores) {
      if (c.got) continue;
      const d = c.pos.distanceTo(P.pos);
      if (d < bd) { bd = d; target = c.pos; label = c.site.name; }
    }
  } else if (!G.bossActive && !G.bossDead) { target = V3(world.PLAZA.x, world.PLAZA.y + 6, world.PLAZA.z); label = 'The Oath Stone'; }
  if (target) {
    G.sensed = { pos: target.clone(), label }; G.senseTimer = 16;
    beam.position.set(target.x, target.y + 30, target.z); beam.visible = true;
    bark('phorus', G.coreCount < 5 ? `There — one is singing near ${label}. ${Math.round(bd)} paces, give or take.` : 'The stone. It’s pulling at the cores — the plaza.', 3.5);
  } else bark('phorus', 'Nothing left singing that I can feel.', 2.5);
}

/* a pillar of light that marks what Phorus senses */
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.4, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xb48aff, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
beam.visible = false; scene.add(beam);

function hurtPlayer(dmg, from, kb = 7) {
  if (P.iframes > 0 || P.dead || G.mode !== 'play') return;
  P.hp -= dmg; P.iframes = 0.55; P.lastHurt = G.t;
  const dir = V3(P.pos.x - from.x, 0, P.pos.z - from.z); if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1); dir.normalize();
  P.vel.addScaledVector(dir, kb); P.vel.y = Math.max(P.vel.y, 3.5);
  torcain.flash(0.8);
  sfx.hurt(); G.shake = Math.max(G.shake, 0.35);
  dmgNumber(P.pos.x, P.pos.y + 2.3, P.pos.z, Math.round(dmg), 'hurt');
  $('hurtfx').style.opacity = 1; setTimeout(() => $('hurtfx').style.opacity = 0, 160);
  if (P.hp <= 0) playerDown();
}

function playerDown() {
  P.hp = 0; P.dead = true; P.atk = null;
  bark('phorus', 'Torcain! Hold on — I’ve got you.', 3);
  fade(1, 1.2);
  setTimeout(() => {
    const cp = G.bossActive ? V3(world.PLAZA.x, world.PLAZA.y, world.PLAZA.z + 24) : G.checkpoint.clone();
    P.pos.copy(cp); P.vel.set(0, 0, 0); P.hp = P.maxHp; P.dead = false; P.iframes = 2;
    F.pos.copy(cp).add(V3(-2, 0, 2));
    if (boss && !boss.dead) { boss.hp = Math.min(boss.maxHp, boss.hp + boss.maxHp * 0.25); }
    enemies.forEach(e => { if (!e.dead && !e.bossMinion) { e.state = 'return'; } });
    telegraphs.forEach(t => scene.remove(t.mesh)); telegraphs.length = 0;
    fade(0, 1.2);
  }, 1500);
}

/* ================================================================
   CORES, INTERACTION, QUESTS
   ================================================================ */
const cores = Object.entries(world.SITES).map(([key, site]) => {
  const mesh = buildCore();
  mesh.position.copy(site.coreAt);
  scene.add(mesh);
  return { key, site, mesh, pos: site.coreAt.clone(), got: false };
});

function interactables() {
  const list = [];
  if (!G.talked) list.push({ pos: F.pos, label: 'Speak with Phorus', act: () => { G.talked = true; dialog(STORY.DIALOG.arrive, () => { setObjective(); hint('Press F and Phorus will feel for the nearest singing core.'); }); } });
  else if (G.mode === 'play') list.push({ pos: F.pos, label: 'Speak with Phorus', act: () => talkPhorus(), far: 2.6 });
  list.push({ pos: STRYX_SPOT, label: 'Hail the Stryx pilot', act: () => dialog(G.done ? [['stryx', 'Kreee! Home? Stryx knows the way. Stryx always knows the way.']] : STORY.DIALOG.stryx) });
  for (const c of cores) if (!c.got) list.push({ pos: c.pos, label: 'Take the memory core', act: () => takeCore(c), far: 3.2 });
  if (G.coreCount >= 5 && !G.bossActive && !G.bossDead) {
    const s = V3(world.PLAZA.x, world.PLAZA.y, world.PLAZA.z);
    list.push({ pos: s, label: 'Offer the cores to the Oath Stone', act: () => offerCores(), far: 9 });
  }
  return list;
}

function talkPhorus() {
  const lines = G.done
    ? [['phorus', 'The Punk with a lord in its head. Lovely. Let’s at least eat first.']]
    : G.coreCount >= 5
      ? [['phorus', 'The plaza, Torcain. The Oath Stone. It’s waiting.']]
      : [['phorus', ['Five cores. Five memories of the night this city fell. Press F and I’ll feel for them.', 'Zahreh flowers still grow here — the pink ones. They’ll close a wound if you walk through them.', 'If you’re overwhelmed, let the Tukang build heat — then Q, and burn them all back.', 'Aim and right-click, and the Duat will carry that axe wherever you’re looking. Still gives me chills.'][Math.floor(G.t) % 4]]];
  dialog(lines);
}

function takeCore(c) {
  c.got = true; G.coresGot[c.key] = true; G.coreCount++;
  sfx.core();
  particles.burst(c.pos.x, c.pos.y, c.pos.z, 50, { color: 0xc8a0ff, speed: 7, size: 0.6, life: 1, gravity: 2 });
  scene.remove(c.mesh);
  if (G.sensed && G.sensed.pos.distanceTo(c.pos) < 1) { G.sensed = null; beam.visible = false; }
  G.checkpoint = V3(c.pos.x, world.col.ground(c.pos.x, c.pos.z, c.pos.y), c.pos.z);
  const m = STORY.CORES[c.key];
  showMemory(m.who, m.lines, () => {
    if (G.coreCount === 1) bark('phorus', STORY.DIALOG.firstCore[0][1], 4);
    if (G.coreCount === 5) dialog(STORY.DIALOG.allCores, () => setObjective());
    setObjective();
  });
}

function offerCores() {
  G.stonePrimed = true;
  dialog(STORY.DIALOG.atStone, () => {
    const s = world.oath;
    s.sockets.forEach((k, i) => setTimeout(() => {
      k.lit.material.opacity = 1; sfx.core();
      particles.burst(s.group.position.x + k.ped.position.x, s.group.position.y + 2.4, s.group.position.z + k.ped.position.z, 20, { color: 0xc8a0ff, speed: 4, size: 0.5, life: 0.7 });
    }, i * 380));
    setTimeout(() => {
      s.mat.emissiveIntensity = 1.4;
      startBoss();
      setTimeout(() => dialog(STORY.DIALOG.bossRise, () => setObjective()), 2600);
    }, 2200);
  });
}

function afterBoss() {
  G.bossDead = true;
  G.checkpoint = V3(world.PLAZA.x, world.PLAZA.y, world.PLAZA.z + 20);
  dialog(STORY.DIALOG.bossDown, () => trance());
}

function trance() {
  G.mode = 'trance';
  if (document.pointerLockElement) document.exitPointerLock();
  const cards = $('cards'); cards.classList.add('trance');
  fade(0.85, 1.5);
  $('fade').style.background = 'radial-gradient(circle, #3a1a6a, #0a0418)';
  playCards(STORY.TRANCE, 4600, () => {
    cards.classList.remove('trance');
    P.pos.set(world.SITES.garden.x + 6, 0, world.SITES.garden.z + 2);
    P.pos.y = world.col.ground(P.pos.x, P.pos.z, 50);
    F.pos.copy(P.pos).add(V3(-2, 0, 2));
    G.mode = 'play';
    fade(0, 2.5);
    setTimeout(() => { $('fade').style.background = '#000'; }, 2600);
    lockMouse();
    setTimeout(() => dialog(STORY.DIALOG.wake, () => { G.done = true; setObjective(); showEnd(); }), 1200);
  });
}

function showEnd() {
  G.mode = 'end';
  if (document.pointerLockElement) document.exitPointerLock();
  $('e-riddle').innerHTML = STORY.NEXT_RIDDLE.join('<br>');
  $('endcard').classList.remove('hidden');
}
$('btn-explore').onclick = () => { $('endcard').classList.add('hidden'); G.mode = 'play'; lockMouse(); };

function interact() {
  let best = null, bd = 1e9;
  for (const it of interactables()) {
    const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z);
    if (d < (it.far || 3) && d < bd && Math.abs(it.pos.y - P.pos.y) < 4) { bd = d; best = it; }
  }
  if (best) { sfx.ui(); best.act(); }
}

function nearestPrompt() {
  if (G.mode !== 'play' || P.dead) return null;
  let best = null, bd = 1e9;
  for (const it of interactables()) {
    const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z);
    if (d < (it.far || 3) && d < bd && Math.abs(it.pos.y - P.pos.y) < 4) { bd = d; best = it; }
  }
  return best;
}

/* ---------------- objective text ---------------- */
function setObjective() {
  let txt, hintTxt = '';
  if (!G.talked) txt = STORY.OBJECTIVES.talk;
  else if (G.done) txt = STORY.OBJECTIVES.done;
  else if (G.bossActive) txt = STORY.OBJECTIVES.boss;
  else if (G.coreCount >= 5) txt = STORY.OBJECTIVES.stone;
  else { txt = STORY.OBJECTIVES.cores(G.coreCount); hintTxt = 'F — Phorus senses the nearest core'; }
  $('q-text').textContent = txt;
  $('q-hint').textContent = hintTxt;
  const pips = $('q-pips'); pips.innerHTML = '';
  if (G.talked) for (let i = 0; i < 5; i++) { const d = document.createElement('div'); d.className = 'pip' + (i < G.coreCount ? ' on' : ''); pips.appendChild(d); }
}

/* ================================================================
   UI: dialogue, memory, barks, toasts, cards, damage numbers
   ================================================================ */
let D = null;
function dialog(lines, onDone) {
  D = { lines, i: 0, chars: 0, onDone, tick: 0 };
  G.mode = 'dialog'; P.atk = null;
  $('dialog').classList.remove('hidden');
  showLine();
}
function showLine() {
  const [who] = D.lines[D.i];
  const sp = STORY.SPEAKERS[who];
  $('d-who').innerHTML = `<span style="color:${sp.color}">${sp.name}</span><small>${sp.sub}</small>`;
  $('d-face').style.background = portrait(who);
  D.chars = 0;
}
function portrait(who) {
  const map = {
    torcain: 'radial-gradient(circle at 50% 70%,#8a5a3a 0 30%,transparent 31%),radial-gradient(circle at 50% 42%,#3d2618 0 40%,transparent 41%),radial-gradient(circle,#3a2a50,#120c20)',
    phorus: 'radial-gradient(circle at 50% 70%,#5d6f86 0 32%,transparent 33%),radial-gradient(circle at 50% 44%,#2c3d52 0 38%,transparent 39%),radial-gradient(circle,#1a3a50,#08121c)',
    stryx: 'radial-gradient(circle at 50% 55%,#7d9c44 0 34%,transparent 35%),radial-gradient(circle,#3a2a18,#120c08)',
    noka: 'radial-gradient(circle,#ffd27a 0 20%,#6a4a20 60%,#1a1008)',
    memory: 'radial-gradient(circle,#c8a0ff 0 18%,#3a1a6a 60%,#0a0418)',
  };
  return map[who] || map.memory;
}
function updateDialog(dt) {
  if (!D) return;
  const text = D.lines[D.i][1];
  if (D.chars < text.length) {
    D.chars = Math.min(text.length, D.chars + dt * 55);
    D.tick += dt; if (D.tick > 0.06) { D.tick = 0; sfx.talk(); }
  }
  $('d-text').textContent = text.slice(0, Math.floor(D.chars));
}
function advanceDialog() {
  if (!D) return;
  const text = D.lines[D.i][1];
  if (D.chars < text.length) { D.chars = text.length; return; }
  D.i++;
  if (D.i >= D.lines.length) {
    const cb = D.onDone; D = null;
    $('dialog').classList.add('hidden');
    if (G.mode === 'dialog') G.mode = 'play';
    if (cb) cb();
    return;
  }
  showLine();
}

let memCb = null;
function showMemory(who, lines, cb) {
  G.mode = 'memory'; memCb = cb; P.atk = null;
  $('m-who').textContent = '— ' + who + ' —';
  $('m-lines').innerHTML = lines.map(l => `<p>“${l}”</p>`).join('');
  $('memory').classList.remove('hidden');
}
function closeMemory() {
  $('memory').classList.add('hidden');
  G.mode = 'play';
  const cb = memCb; memCb = null; if (cb) cb();
}

let barkTimer = 0;
function bark(who, text, dur = 3.5) {
  const sp = STORY.SPEAKERS[who];
  $('bark').innerHTML = `<b style="color:${sp.color}">${sp.name}</b>${text}`;
  $('bark').style.opacity = 1; barkTimer = dur;
}
let toastTimer = 0;
function toast(text, dur = 2.2) { $('toast').textContent = text; $('toast').classList.add('show'); toastTimer = dur; }
function hint(text) { setTimeout(() => toast(text, 4), 400); }

let fadeTarget = 0;
function fade(v, s = 0.8) { $('fade').style.transition = `opacity ${s}s`; $('fade').style.opacity = v; fadeTarget = v; }

let cardState = null;
function playCards(lines, each, done) {
  const box = $('cards'); box.innerHTML = '';
  cardState = { lines, i: -1, each, done, timer: 0 };
  $('skip').classList.remove('hidden');
  nextCard();
}
function nextCard() {
  const box = $('cards');
  box.querySelectorAll('p').forEach(old => { old.classList.remove('show'); old.style.position = 'absolute'; setTimeout(() => old.remove(), 1000); });
  cardState.i++;
  if (cardState.i >= cardState.lines.length) {
    const cb = cardState.done; cardState = null; $('skip').classList.add('hidden'); cb && cb(); return;
  }
  const p = document.createElement('p'); p.textContent = cardState.lines[cardState.i];
  box.appendChild(p);
  setTimeout(() => p.classList.add('show'), 450);
  cardState.timer = cardState.each;
}
function skipCards() { if (cardState) nextCard(); }

const dmgLayer = $('dmg');
const nums = [];
function dmgNumber(x, y, z, n, cls = '') {
  const el = document.createElement('div'); el.className = 'num ' + cls; el.textContent = n;
  dmgLayer.appendChild(el);
  nums.push({ el, pos: V3(x, y, z), t: 0, vx: (Math.random() - 0.5) * 0.6 });
}
function updateNums(dt) {
  const v = V3();
  for (let i = nums.length - 1; i >= 0; i--) {
    const n = nums[i]; n.t += dt;
    n.pos.y += dt * 1.6; n.pos.x += n.vx * dt;
    v.copy(n.pos).project(camera);
    if (v.z > 1) { n.el.style.display = 'none'; } else {
      n.el.style.display = '';
      n.el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px';
      n.el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
      n.el.style.opacity = Math.min(1, 2.2 - n.t * 2.2);
      n.el.style.transform = `translate(-50%,-50%) scale(${1 + Math.max(0, 0.25 - n.t) * 2})`;
    }
    if (n.t > 1) { n.el.remove(); nums.splice(i, 1); }
  }
}

/* ---------------- compass ---------------- */
const strip = $('compass-strip');
const compassEls = { cards: [], ticks: [], marks: {} };
(function buildCompass() {
  for (let i = 0; i < 24; i++) {
    const t = document.createElement('div'); t.className = 'tick'; strip.appendChild(t); compassEls.ticks.push({ el: t, h: i / 24 * Math.PI * 2 });
  }
  [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['W', -Math.PI / 2]].forEach(([l, h]) => {
    const c = document.createElement('div'); c.className = 'card'; c.textContent = l; strip.appendChild(c); compassEls.cards.push({ el: c, h });
  });
})();
function compassMark(id, html) {
  if (!compassEls.marks[id]) { const m = document.createElement('div'); m.className = 'mark'; strip.appendChild(m); compassEls.marks[id] = m; }
  const m = compassEls.marks[id]; if (m._h !== html) { m.innerHTML = html; m._h = html; }
  return m;
}
function placeOnCompass(el, heading) {
  const f = camForward(), camH = Math.atan2(f.x, -f.z);
  const rel = angleDiff(camH, heading);
  if (Math.abs(rel) > Math.PI / 2) { el.style.display = 'none'; return; }
  el.style.display = ''; el.style.left = (50 + rel / (Math.PI / 2) * 50) + '%';
}
function updateCompass() {
  compassEls.ticks.forEach(t => placeOnCompass(t.el, t.h));
  compassEls.cards.forEach(c => placeOnCompass(c.el, c.h));
  const head = p => Math.atan2(p.x - P.pos.x, -(p.z - P.pos.z));
  const obj = objectivePoint();
  const om = compassMark('obj', obj ? `<span style="color:var(--brass2)">◆</span><small>${obj.d}m</small>` : '');
  if (obj) placeOnCompass(om, head(obj.p)); else om.style.display = 'none';
  const fm = compassMark('phorus', '<span style="color:var(--su);font-size:11px">●</span>');
  if (F.pos.distanceTo(P.pos) > 6) placeOnCompass(fm, head(F.pos)); else fm.style.display = 'none';
}
function objectivePoint() {
  let p = null;
  if (!G.talked) p = F.pos;
  else if (G.bossActive || G.done) return null;
  else if (G.coreCount >= 5) p = V3(world.PLAZA.x, 0, world.PLAZA.z);
  else if (G.sensed) p = G.sensed.pos;
  if (!p) return null;
  return { p, d: Math.round(Math.hypot(p.x - P.pos.x, p.z - P.pos.z)) };
}

/* ---------------- location banners ---------------- */
let locTimer = 0;
function showLocation(a, b) {
  $('loc1').textContent = a; $('loc2').textContent = b;
  $('location').classList.add('show'); locTimer = 3.6;
}
function checkLocations() {
  if (G.mode !== 'play') return;
  const sites = Object.entries(world.SITES);
  for (const [k, s] of sites) {
    if (!G.visited[k] && Math.hypot(P.pos.x - s.x, P.pos.z - s.z) < 26) { G.visited[k] = true; showLocation(s.name, 'Ruins of Aakalay'); }
  }
  if (!G.visited.gate && P.pos.z < 140 && P.pos.z > 120 && Math.abs(P.pos.x) < 12) { G.visited.gate = true; showLocation('Aakalay', 'the city that swore itself away'); }
  if (!G.visited.plaza && Math.hypot(P.pos.x - world.PLAZA.x, P.pos.z - world.PLAZA.z) < 30) { G.visited.plaza = true; showLocation('The Zahreh Plaza', 'where the Oath Stone drinks'); }
}

/* ---------------- journal / pause ---------------- */
function toggleJournal() {
  const j = $('journal');
  if (j.classList.contains('hidden')) {
    $('j-riddle').innerHTML = STORY.RIDDLE.join('<br>') + (G.done ? '<br><br>' + STORY.NEXT_RIDDLE.join('<br>') : '');
    $('j-mem').innerHTML = cores.map(c => {
      const m = STORY.CORES[c.key];
      return c.got ? `<div class="jentry"><b>${c.site.name}</b>${m.lines.map(l => '“' + l + '”').join(' ')}</div>` : `<div class="jentry locked"><b>${c.site.name}</b>A core still sings here.</div>`;
    }).join('');
    $('j-codex').innerHTML = STORY.CODEX.map(([k, v]) => `<div class="jentry"><b>${k}</b>${v}</div>`).join('');
    j.classList.remove('hidden'); G.paused = true;
    if (document.pointerLockElement) document.exitPointerLock();
  } else { j.classList.add('hidden'); G.paused = false; lockMouse(); }
}
$('btn-jclose').onclick = () => { toggleJournal(); };
function openPause() {
  if (!$('journal').classList.contains('hidden')) return;
  G.paused = true; $('pause').classList.remove('hidden');
}
function closePause() { $('pause').classList.add('hidden'); G.paused = false; lockMouse(); }
$('btn-resume').onclick = closePause;
$('btn-journal').onclick = () => { $('pause').classList.add('hidden'); toggleJournal(); };
function bindOpt(id, key, apply, isBool) {
  const el = $(id);
  if (isBool) el.checked = OPT[key]; else el.value = OPT[key];
  el.oninput = el.onchange = () => { OPT[key] = isBool ? el.checked : parseFloat(el.value); apply && apply(); saveOpts(); };
}
bindOpt('opt-sens', 'sens');
bindOpt('opt-invert', 'invert', null, true);
bindOpt('opt-vol', 'vol', () => setVolume(OPT.vol));
bindOpt('opt-bloom', 'bloom', () => { bloom.enabled = OPT.bloom; }, true);
bindOpt('opt-shadows', 'shadows', () => { renderer.shadowMap.enabled = OPT.shadows; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }, true);
bindOpt('opt-scale', 'scale', resize);
bloom.enabled = OPT.bloom;

/* ================================================================
   UPDATE
   ================================================================ */
function updatePlayer(dt) {
  P.iframes = Math.max(0, P.iframes - dt);
  P.duatCd = Math.max(0, P.duatCd - dt);
  P.senseCd = Math.max(0, P.senseCd - dt);
  P.jumpBuf = Math.max(0, P.jumpBuf - dt);
  P.flareT = Math.max(0, P.flareT - dt);
  torcain.flash(Math.max(0, P.iframes - 0.25) * 2 + P.flareT * 0.8);

  const canAct = G.mode === 'play' && !P.dead;
  let ix = 0, iz = 0;
  if (canAct) {
    if (keys.KeyW || keys.ArrowUp) iz += 1;
    if (keys.KeyS || keys.ArrowDown) iz -= 1;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1;
    if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (mouseL && !P.atk) pressAttack();
  }
  const f = camForward(), r = V3(Math.cos(CAM.yaw), 0, -Math.sin(CAM.yaw));
  const wish = V3().addScaledVector(f, iz).addScaledVector(r, ix);
  const moving = wish.lengthSq() > 0.01;
  if (moving) wish.normalize();
  const sprint = keys.ShiftLeft || keys.ShiftRight;
  let speed = sprint ? 11.5 : 7;
  if (P.atk) speed *= 0.25;
  const accel = P.onGround ? 14 : 4;
  P.vel.x = damp(P.vel.x, wish.x * speed, accel, dt);
  P.vel.z = damp(P.vel.z, wish.z * speed, accel, dt);
  if (moving && !P.atk) P.yaw = dampAngle(P.yaw, Math.atan2(wish.x, wish.z), 14, dt);

  // sprinting with the Tukang leaves a trail of embers
  if (sprint && moving && P.onGround && Math.random() < 0.6)
    particles.emit(P.pos.x, P.pos.y + 0.2, P.pos.z, { vx: -P.vel.x * 0.1, vy: 1.2, vz: -P.vel.z * 0.1, color: Math.random() < 0.5 ? 0xff8a2a : 0xffc04a, size: 0.32, life: 0.6 });

  // jump
  P.coyote = P.onGround ? 0.12 : Math.max(0, P.coyote - dt);
  if (P.jumpBuf > 0 && P.coyote > 0 && canAct) { P.vel.y = 10.5; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; sfx.jump(); }
  P.vel.y -= 28 * dt;

  const wasGround = P.onGround;
  P.pos.addScaledVector(P.vel, dt);
  world.col.resolve(P.pos, 0.45, 1.9);
  if (G.bossActive) {
    arenaClamp(P.pos, 29);
    const pz = world.PLAZA, d = Math.hypot(P.pos.x - pz.x, P.pos.z - pz.z);
    if (d < 4.2) { P.pos.x = pz.x + (P.pos.x - pz.x) / d * 4.2; P.pos.z = pz.z + (P.pos.z - pz.z) / d * 4.2; }
  }
  const g = world.col.ground(P.pos.x, P.pos.z, P.pos.y);
  if (P.pos.y <= g) {
    if (!wasGround && P.vel.y < -12) { sfx.land(); particles.burst(P.pos.x, g + 0.1, P.pos.z, 10, { color: 0xd8c098, speed: 3, size: 0.5, life: 0.5 }); }
    P.pos.y = g; P.vel.y = 0; P.onGround = true;
  } else if (wasGround && P.vel.y <= 0 && P.pos.y - g < 0.45) { P.pos.y = g; P.vel.y = 0; P.onGround = true; }
  else P.onGround = false;

  // remember solid footing; the void forgives no one
  P.safeTimer -= dt;
  if (P.onGround && P.safeTimer <= 0) {
    const R = world.edgeRadius(P.pos.x, P.pos.z), rr = Math.hypot(P.pos.x, P.pos.z);
    if (rr < R - 6 || (Math.abs(P.pos.x) < 3 && P.pos.z > 150)) { P.lastSafe.copy(P.pos); P.safeTimer = 0.5; }
  }
  if (P.pos.y < -45 && !P.dead) {
    fade(1, 0.3);
    setTimeout(() => { P.pos.copy(P.lastSafe); P.vel.set(0, 0, 0); fade(0, 0.8); }, 350);
    P.pos.y = -44; P.vel.set(0, 0, 0);
    if (P.hp > 15) { P.hp -= 15; dmgNumber(P.lastSafe.x, P.lastSafe.y + 2.3, P.lastSafe.z, 15, 'hurt'); }
    bark('phorus', 'Mind the edge! It’s a long way down to the cloud sea.', 2.5);
  }

  // health: regen out of combat, Zahreh flowers
  if (G.t - P.lastHurt > 6 && P.hp < P.maxHp && !P.dead) P.hp = Math.min(P.maxHp, P.hp + 5 * dt);
  for (const fl of world.flowers) {
    if (!fl.ready) { fl.timer -= dt; if (fl.timer <= 0) { fl.ready = true; fl.grp.visible = true; } continue; }
    if (Math.hypot(fl.x - P.pos.x, fl.z - P.pos.z) < 1.6 && P.hp < P.maxHp) {
      const h = Math.min(35, P.maxHp - P.hp); P.hp += h;
      dmgNumber(P.pos.x, P.pos.y + 2.4, P.pos.z, '+' + Math.round(h), 'heal');
      sfx.heal(); particles.burst(fl.x, fl.grp.position.y + 1, fl.z, 24, { color: 0xff9ad0, speed: 4, size: 0.4, life: 0.8, gravity: 3 });
      fl.ready = false; fl.timer = 40; fl.grp.visible = false;
    }
  }

  // footsteps
  const hs = Math.hypot(P.vel.x, P.vel.z);
  if (P.onGround && hs > 1) { P.stepPh += dt * hs * 0.32; if (P.stepPh > 1) { P.stepPh = 0; sfx.step(); } }

  updateAttack(dt);

  torcain.root.position.copy(P.pos);
  torcain.root.rotation.y = P.yaw;
  torcain.animate(dt, { speed: hs, onGround: P.onGround, t: G.t, swing: P.atk ? { kind: P.atk.kind, p: clamp(P.atk.p, 0, 1) } : null, heat: P.heat / 100 });
}

function updatePhorus(dt) {
  F.cd = Math.max(0, F.cd - dt); F.cast = Math.max(0, F.cast - dt);
  // choose a foe near Torcain
  let tgt = null, bd = 1e9;
  if (G.mode === 'play' && !P.dead) {
    for (const e of enemies) {
      if (e.dead || e.state === 'idle' || e.state === 'return') continue;
      const d = e.pos.distanceTo(P.pos);
      if (d < 16 && d < bd) { bd = d; tgt = e; }
    }
    if (!tgt && boss && !boss.dead && boss.rising >= 1) tgt = { isBoss: true, pos: V3(world.PLAZA.x, world.PLAZA.y, world.PLAZA.z) };
  }
  F.target = tgt;
  let want;
  if (tgt) {
    const tp = tgt.isBoss ? V3(world.PLAZA.x, 0, world.PLAZA.z) : tgt.pos;
    const away = V3(P.pos.x - tp.x, 0, P.pos.z - tp.z).normalize();
    const side = V3(-away.z, 0, away.x);
    want = V3(tp.x, 0, tp.z).addScaledVector(away, tgt.isBoss ? 14 : 7).addScaledVector(side, 3);
    if (F.cd <= 0 && F.pos.distanceTo(tgt.isBoss ? bossTargetPoint() : tgt.pos) < 26) {
      F.cd = 1.35; F.cast = 0.35;
      const start = phorus.weapon.getWorldPosition(V3());
      const sp = glowSprite(0x7ad8ff, 1.1, 1); sp.position.copy(start); scene.add(sp);
      const dir = (tgt.isBoss ? bossTargetPoint() : V3(tgt.pos.x, tgt.pos.y + 0.8, tgt.pos.z)).sub(start).normalize();
      projectiles.push({ sprite: sp, pos: start, vel: dir.multiplyScalar(22), dmg: tgt.isBoss ? 12 : 10, owner: 'phorus', life: 2, target: tgt.isBoss ? { isBoss: true, dead: false } : tgt });
      sfx.bolt();
      F.yaw = Math.atan2(tp.x - F.pos.x, tp.z - F.pos.z);
    }
  } else {
    const back = V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), right = V3(-Math.cos(P.yaw), 0, Math.sin(P.yaw));
    want = P.pos.clone().addScaledVector(back, 2.4).addScaledVector(right, 1.8);
  }
  const dx = want.x - F.pos.x, dz = want.z - F.pos.z, d = Math.hypot(dx, dz);
  const pd = F.pos.distanceTo(P.pos);
  if (pd > 34 || (pd > 18 && G.mode !== 'play')) {
    particles.burst(F.pos.x, F.pos.y + 1, F.pos.z, 16, { color: 0x7ad8ff, speed: 4, size: 0.4, life: 0.5 });
    F.pos.copy(P.pos).addScaledVector(V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), 2.5);
    particles.burst(F.pos.x, F.pos.y + 1, F.pos.z, 16, { color: 0x7ad8ff, speed: 4, size: 0.4, life: 0.5 });
  }
  const sp = d > 1.2 ? Math.min(12, d * 2.2) : 0;
  F.vel.x = damp(F.vel.x, d > 0.01 ? dx / d * sp : 0, 8, dt);
  F.vel.z = damp(F.vel.z, d > 0.01 ? dz / d * sp : 0, 8, dt);
  F.vel.y -= 28 * dt;
  F.pos.addScaledVector(F.vel, dt);
  world.col.resolve(F.pos, 0.45, 1.9);
  if (G.bossActive) arenaClamp(F.pos, 28);
  const g = world.col.ground(F.pos.x, F.pos.z, F.pos.y);
  // Phorus hops up anything in his way
  if (F.pos.y <= g || F.pos.y - g < 0.4) { F.pos.y = g; F.vel.y = 0; F.onGround = true; } else F.onGround = false;
  if (F.onGround && sp > 3 && world.col.ground(F.pos.x + F.vel.x * 0.12, F.pos.z + F.vel.z * 0.12, F.pos.y + 3) > F.pos.y + 0.7) F.vel.y = 10;
  if (F.pos.y < -30) F.pos.copy(P.pos);
  const hs = Math.hypot(F.vel.x, F.vel.z);
  if (hs > 0.6 && !F.cast) F.yaw = dampAngle(F.yaw, Math.atan2(F.vel.x, F.vel.z), 10, dt);
  else if (!tgt && G.mode === 'dialog') F.yaw = dampAngle(F.yaw, Math.atan2(P.pos.x - F.pos.x, P.pos.z - F.pos.z), 6, dt);
  phorus.root.position.copy(F.pos);
  phorus.root.rotation.y = F.yaw;
  phorus.animate(dt, { speed: hs, onGround: F.onGround, t: G.t, swing: F.cast > 0 ? { kind: 4, p: 1 - F.cast / 0.35 } : null });
}

function updateCamera(dt) {
  CAM.dist = damp(CAM.dist, CAM.wantDist, 8, dt);
  const tgt = V3(P.pos.x, P.pos.y + 1.9, P.pos.z);
  CAM.target.lerp(tgt, 1 - Math.exp(-18 * dt));
  if (CAM.target.distanceTo(tgt) > 8) CAM.target.copy(tgt);
  const r = V3(Math.cos(CAM.yaw), 0, -Math.sin(CAM.yaw));
  const look = CAM.target.clone().addScaledVector(r, 0.55);
  const off = V3(Math.sin(CAM.yaw) * Math.cos(CAM.pitch), Math.sin(CAM.pitch), Math.cos(CAM.yaw) * Math.cos(CAM.pitch));
  let want = look.clone().addScaledVector(off, CAM.dist);
  // don't let walls get between us
  const hit = world.col.ray(look, want);
  if (hit < 1) want = look.clone().addScaledVector(off, Math.max(0.6, CAM.dist * hit - 0.3));
  const gy = world.heightAt(want.x, want.z) + 0.5;
  if (want.y < gy) want.y = gy;
  CAM.pos.copy(want);
  // shake
  G.shake = Math.max(0, G.shake - dt * 2.2);
  const s = G.shake * G.shake * 0.5;
  camera.position.set(CAM.pos.x + (Math.random() - 0.5) * s, CAM.pos.y + (Math.random() - 0.5) * s, CAM.pos.z + (Math.random() - 0.5) * s);
  camera.lookAt(look);
}

/* the opening flight in on the Eldi ship's wake */
let introT = 0;
function updateIntroCamera(dt) {
  introT += dt;
  const k = clamp(introT / 16, 0, 1), e = k * k * (3 - 2 * k);
  const a = lerp(2.4, 0.15, e);
  const R = lerp(150, 14, e);
  const c = V3(0, 0, world.pier.end - 10);
  camera.position.set(c.x + Math.sin(a) * R, lerp(70, 6, e), c.z + Math.cos(a) * R);
  camera.lookAt(lerp(0, P.pos.x, e), lerp(30, P.pos.y + 2, e), lerp(-40, P.pos.z, e));
}

function updateHUD() {
  $('hp-fill').style.transform = `scaleX(${P.hp / P.maxHp})`;
  $('hp-lag').style.transform = `scaleX(${P.hp / P.maxHp})`;
  $('heat-fill').style.transform = `scaleX(${P.heat / 100})`;
  $('heat').classList.toggle('full', P.heat >= 100);
  const setCd = (id, frac, ready) => {
    const el = $(id); el.querySelector('.cd').style.transform = `scaleY(${frac})`; el.classList.toggle('ready', ready);
  };
  setCd('ab-duat', P.duatCd / 5, P.duatCd <= 0);
  setCd('ab-flare', 1 - P.heat / 100, P.heat >= 100);
  setCd('ab-sense', P.senseCd / 7, P.senseCd <= 0);
  $('resume').classList.toggle('hidden', locked || G.paused || G.mode !== 'play');
  const pr = nearestPrompt();
  const pe = $('prompt');
  if (pr) { pe.innerHTML = `<kbd>E</kbd>${pr.label}`; pe.classList.remove('hidden'); } else pe.classList.add('hidden');
  updateCompass();
}

function updateCores(dt) {
  for (const c of cores) {
    if (c.got) continue;
    c.mesh.position.y = c.pos.y + Math.sin(G.t * 2 + c.pos.x) * 0.18;
    c.mesh.userData.m.rotation.y += dt * 1.4;
    c.mesh.userData.inner.material.opacity = 0.7 + Math.sin(G.t * 5 + c.pos.z) * 0.25;
    if (Math.random() < 0.3) particles.emit(c.pos.x, c.pos.y, c.pos.z, { vy: 1.2, speed: 1.2, color: 0xb48aff, size: 0.25, life: 1.2 });
  }
  if (G.senseTimer > 0) {
    G.senseTimer -= dt; beam.material.opacity = 0.28 * Math.min(1, G.senseTimer / 2);
    if (G.senseTimer <= 0) beam.visible = false;
  }
  const s = world.oath;
  if (G.coreCount >= 5 && !G.bossActive && !G.bossDead) s.glow.material.opacity = 0.35 + Math.sin(G.t * 3) * 0.15;
}

/* ================================================================
   LOOP
   ================================================================ */
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  let dt = Math.min(clock.getDelta(), 1 / 20);
  const frozen = G.paused || G.mode === 'title';
  if (G.hitstop > 0) { G.hitstop -= dt; dt *= 0.08; }
  if (!frozen) {
    G.t += dt;
    if (G.mode === 'play' || G.mode === 'dialog' || G.mode === 'memory' || G.mode === 'end') {
      updatePlayer(dt);
      updatePhorus(dt);
      for (const e of enemies) updateEnemy(e, dt);
      for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].gone) enemies.splice(i, 1);
      updateBoss(dt);
      updateTelegraphs(dt);
      updateSpikes(dt);
      updateProjectiles(dt);
      updateCores(dt);
      updateDialog(dt);
      updateCamera(dt);
      checkLocations();
    } else if (G.mode === 'intro') {
      updateIntroCamera(dt);
      updatePhorus(dt);
      torcain.animate(dt, { speed: 0, onGround: true, t: G.t });
      torcain.root.position.copy(P.pos); torcain.root.rotation.y = P.yaw;
    } else if (G.mode === 'trance') {
      updatePlayer(0.0001);
    }
    if (cardState) { cardState.timer -= dt; if (cardState.timer <= 0) nextCard(); }
    if (barkTimer > 0) { barkTimer -= dt; if (barkTimer <= 0) $('bark').style.opacity = 0; }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('show'); }
    if (locTimer > 0) { locTimer -= dt; if (locTimer <= 0) $('location').classList.remove('show'); }
    updateNums(dt);
    if (G.mode !== 'title') updateHUD();
  } else if (G.mode === 'title') {
    // a slow drift over the ruins behind the title
    const t = performance.now() / 1000;
    const a = 0.9 + t * 0.025;
    camera.position.set(Math.sin(a) * 250, 75 + Math.sin(t * 0.1) * 6, Math.cos(a) * 250);
    camera.lookAt(Math.sin(a + 1.2) * 40, 0, Math.cos(a + 1.2) * 40);
    G.t = t;
  }
  const tt = G.mode === 'title' ? performance.now() / 1000 : G.t;
  world.update(tt, dt, particles, camera.position);
  sky.update(tt, dt, camera.position);
  ship.update(tt, dt, particles);
  particles.update(frozen && G.mode !== 'title' ? 0 : dt);
  // the sun's shadow box follows the action
  const focus = G.mode === 'title' ? V3(0, 0, 0) : P.pos;
  sun.position.copy(focus).addScaledVector(SUN_DIR, 120);
  sun.target.position.copy(focus);
  composer.render();
}

/* ================================================================
   START
   ================================================================ */
$('t-kicker').textContent = STORY.TITLE.kicker;
$('t-title').textContent = STORY.TITLE.title;
$('t-sub').textContent = STORY.TITLE.sub;
$('t-riddle').innerHTML = STORY.RIDDLE.join('<br>');
$('loading').textContent = 'THE HIGHLAND IS READY';
$('btn-begin').disabled = false;
if (matchMedia('(pointer: coarse)').matches) $('t-note').textContent = 'This is a keyboard-and-mouse game — on a phone or tablet the controls won’t work.';
$('btn-begin').onclick = () => {
  initAudio(); setVolume(OPT.vol);
  $('title').classList.add('fade');
  setTimeout(() => $('title').classList.add('hidden'), 1000);
  G.mode = 'intro'; introT = 0; G.t = 0;
  CAM.yaw = 0; // face up the pier, toward the city
  P.yaw = Math.PI;
  playCards(STORY.OPENING, 4200, () => {
    $('hud').classList.remove('hidden');
    G.mode = 'play';
    CAM.target.set(P.pos.x, P.pos.y + 1.9, P.pos.z);
    setObjective();
    lockMouse();
    showLocation('The Ruins of Aakalay', 'the riddle’s first step');
    hint('Walk to Phorus and press E');
  });
};

frame();

/* debugging handle for the console */
window.__torcain = { G, P, F, CAM, camera, scene, THREE, startBoss: () => { G.coreCount = 5; G.talked = true; offerCores(); }, advance: () => advanceDialog(), closeMemory, pressAttack, duatStrike, tukangFlare, nurSense, interact, damageBoss, get boss() { return boss; }, enemies, world, cores, skipTo: n => { cores.slice(0, n).forEach(c => { if (!c.got) { c.got = true; G.coreCount++; scene.remove(c.mesh); } }); G.talked = true; setObjective(); } };
