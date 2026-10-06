/* ============================================================
   TORCAIN'S RUN — a single-player action RPG in the Mbaru Tatu.
   Third person: WASD + mouse. Torcain and Phorus follow Noka's
   riddles from the Ruins of Aakalay to the wilds of Leotik.
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { clamp, lerp, damp, dampAngle, angleDiff } from './util.js';
import { Particles, glowSprite, toon, addOutline } from './gfx.js';
import { buildSky, SUN_DIR } from './sky.js';
import { buildEldiShip } from './ship.js';
import { buildWorld } from './world.js';
import { buildLeotik } from './leotik.js';
import { buildTorcain, buildPhorus, buildMegla, buildCore } from './actors.js';
import { buildMalstiLord } from './creatures.js';
import { createEnemies } from './enemies.js';
import * as STORY from './story.js';
import { DIFFICULTY, UPGRADES, upgradeCost, freshSave, loadSave, writeSave, fmtTime, saveKey, newer } from './progress.js';
import * as CLOUD from './cloud.js';
import { initAudio, sfx, setVolume } from './audio.js';

const $ = id => document.getElementById(id);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ---------------- settings ---------------- */
const OPT = { sens: 1, invert: false, vol: 0.7, bloom: true, shadows: true, scale: 1 };
try { Object.assign(OPT, JSON.parse(localStorage.getItem('torcain-opts') || '{}')); } catch (e) { /* private mode */ }
const saveOpts = () => { try { localStorage.setItem('torcain-opts', JSON.stringify(OPT)); } catch (e) { /* ignore */ } };

/* ---------------- the save, and which region this page is ---------------- */
/* signed in with a Dya'Akara account? Then the run lives on the account. */
const WHO = CLOUD.identity();
const KEY = saveKey(WHO && WHO.id);
let localSave = loadSave(KEY);
if (WHO && !localSave) localSave = loadSave();          // a guest run carries over the first time you sign in
let cloudSave = null;
if (WHO) {
  $('loading').textContent = 'FETCHING YOUR RUN FROM THE DYA GUILD…';
  cloudSave = await CLOUD.fetchSave(WHO.id);
}
const SAVE_AT_LOAD = newer(localSave, cloudSave);
let SAVE = SAVE_AT_LOAD || freshSave('easy');
let BOOT = null;
try { BOOT = sessionStorage.getItem('torcain-boot'); sessionStorage.removeItem('torcain-boot'); } catch (e) { /* ignore */ }
const REGION = SAVE.region || 'aakalay';
let D = DIFFICULTY[SAVE.difficulty] || DIFFICULTY.easy;
const persist = () => {
  SAVE.shards = G.shards;
  writeSave(SAVE, KEY);
  if (WHO) CLOUD.pushSave(WHO.id, SAVE);
};
/* a closing or hidden tab sends the latest save straight away */
const flushSave = () => { try { if (G.mode !== 'title') persist(); } catch (e) { /* still loading */ } CLOUD.flush(); };
addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });

/* ---------------- renderer ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = OPT.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = REGION === 'leotik' ? 1.15 : 1.08;
$('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = REGION === 'leotik' ? new THREE.Fog(0x4a5a58, 70, 650) : new THREE.Fog(0xf2b88e, 140, 1100);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 12000);

const hemi = REGION === 'leotik' ? new THREE.HemisphereLight(0x9ab8b0, 0x3a4a30, 1.35) : new THREE.HemisphereLight(0xb8d0ff, 0xc0804e, 1.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight(REGION === 'leotik' ? 0xc8d8c0 : 0xffd4a0, REGION === 'leotik' ? 1.6 : 2.7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 260 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0x9ab8ff, 0.55); rim.position.set(60, 40, -80); scene.add(rim);
const hemiBase = hemi.intensity;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.55, 0.86);
composer.addPass(bloom);
composer.addPass(new OutputPass());

let particles = null;
function resize() {
  const pr = Math.min(devicePixelRatio, 1.75) * OPT.scale;
  renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  particles && particles.setScale(innerHeight * pr * 0.9);
}

/* ---------------- world ---------------- */
const world = REGION === 'leotik' ? buildLeotik(scene) : buildWorld(scene);
const sky = buildSky(scene, buildEldiShip, REGION === 'leotik' ? 'storm' : 'golden');
particles = new Particles(scene, 3500);
resize();
addEventListener('resize', resize);

const ship = buildEldiShip();
ship.group.position.set(13, world.pier.y - 1.6, world.pier.end - 16);
scene.add(ship.group);
{
  const plank = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 1.4), toon(0x8a5a36));
  plank.position.set(6.4, world.pier.y + 0.35, world.pier.end - 13); plank.rotation.z = -0.08; plank.castShadow = true;
  scene.add(plank);
}
const STRYX_SPOT = V3(3.5, world.pier.y, world.pier.end - 13);

/* ---------------- Nur Lanterns ---------------- */
const lanterns = world.lanterns.map(l => {
  const y = world.col.ground(l.x, l.z, world.heightAt(l.x, l.z) + 0.5);
  const grp = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.6, 6), toon(0x2a2236)); post.position.y = 1.3; addOutline(post, 0.03); grp.add(post);
  const cage = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshToonMaterial({ color: 0x3a3048, wireframe: true })); cage.position.y = 2.9; grp.add(cage);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 0.3, 8), toon(0x5a5060)); base.position.y = 0.1; addOutline(base, 0.03); grp.add(base);
  const flame = glowSprite(0xbfeaff, 2.6, 0.12); flame.position.y = 2.9; grp.add(flame);
  const halo = glowSprite(0x7ad8ff, 9, 0); halo.position.y = 2.9; grp.add(halo);
  grp.position.set(l.x, y, l.z); scene.add(grp);
  return Object.assign({}, l, { y, grp, flame, halo, cage });
});
const lanternById = id => lanterns.find(l => l.id === id);
function lanternLit(l) { return !!SAVE.lit[l.id]; }

/* ---------------- lore stones ---------------- */
const stones = (world.stones || []).map(s => {
  const y = world.heightAt(s.x, s.z);
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.5), toon(0x8a8070));
  m.position.set(s.x, y + 0.9, s.z); m.rotation.y = Math.atan2(-s.x, -s.z); m.rotation.z = 0.05; m.castShadow = true; addOutline(m, 0.04);
  const rune = glowSprite(0xffd27a, 1.2, 0.5); rune.position.set(0, 0.4, 0.3); m.add(rune);
  scene.add(m);
  world.col.add(s.x, s.z, 0.8, 0.3, m.rotation.y, y - 1, y + 2);
  return Object.assign({}, s, { y, mesh: m, rune });
});

/* ---------------- game state ---------------- */
const G = {
  mode: 'title', paused: false, t: 0, shards: SAVE.shards || 0, hitstop: 0, shake: 0, arena: 0,
  sensed: null, senseTimer: 0, bossActive: false, visited: {}, lock: null, seen: {},
};
let F_ = SAVE.flags;       // persistent story flags

/* ---------------- player ---------------- */
const torcain = buildTorcain();
scene.add(torcain.root);
const P = {
  pos: world.pier.start.clone(), vel: V3(), yaw: Math.PI, onGround: true, hp: 100, maxHp: 100, heat: 0,
  stam: 100, stamMax: 100, stamDelay: 0, exhausted: false,
  atk: null, queued: false, comboIdx: 0, comboReset: 0, duatCd: 0, senseCd: 0, iframes: 0, lastHurt: -99,
  lastSafe: world.pier.start.clone(), safeTimer: 0, coyote: 0, jumpBuf: 0, stepPh: 0, flareT: 0, dead: false,
  roll: null, drink: 0, flasks: 3, flasksMax: 3, poison: 0, para: 0,
};
function rank(id) { return SAVE.ups[id] || 0; }
function applyUps(full) {
  P.maxHp = 100 + 15 * rank('vigor');
  P.stamMax = 100 + 18 * rank('breath');
  P.flasksMax = D.flasks + rank('film');
  if (full) { P.hp = P.maxHp; P.stam = P.stamMax; P.flasks = P.flasksMax; }
  P.hp = Math.min(P.hp, P.maxHp);
}
applyUps(true);
const axeMul = () => 1 + 0.12 * rank('edge');
const duatCdMax = () => 5 - 0.6 * rank('duat');
const heatMul = () => D.heatGain * (1 + 0.2 * rank('tukang'));
const addHeat = n => { P.heat = Math.min(100, P.heat + n * heatMul()); };

/* ---------------- Phorus ---------------- */
const phorus = buildPhorus();
scene.add(phorus.root);
const F = { pos: P.pos.clone().add(V3(-2, 0, -3)), vel: V3(), yaw: Math.PI, cd: 1, cast: 0, onGround: true, target: null };

/* ---------------- camera rig ---------------- */
const CAM = { yaw: 0, pitch: 0.28, dist: 6.5, wantDist: 6.5, pos: V3(), target: V3() };

/* where to stand when the run (re)starts */
function spawnPoint() {
  const l = SAVE.lantern && lanternById(SAVE.lantern);
  if (l) return V3(l.x + 1.6, l.y, l.z + 1.6);
  return world.pier.start.clone();
}

/* ---------------- input ---------------- */
const keys = {};
let mouseL = false, locked = false;
addEventListener('keydown', e => {
  if (G.mode !== 'title') initAudio();
  if (e.code === 'Tab') e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  onKey(e.code);
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = false; });
const canvas = renderer.domElement;
const overlayOpen = () => ['journal', 'pause', 'lantern', 'endcard', 'newgame', 'signin'].some(id => !$(id).classList.contains('hidden'));
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && !G.paused && (G.mode === 'play' || G.mode === 'dialog' || G.mode === 'memory') && !overlayOpen()) openPause();
});
document.addEventListener('mousemove', e => {
  if (!locked || G.paused) return;
  if (G.mode !== 'play' && G.mode !== 'dialog' && G.mode !== 'memory') return;
  const s = 0.0023 * OPT.sens;
  CAM.yaw -= e.movementX * s * (G.lock ? 0.25 : 1);
  CAM.pitch = clamp(CAM.pitch + e.movementY * s * (OPT.invert ? -1 : 1), -0.45, 1.25);
});
document.addEventListener('mousedown', e => {
  if (G.mode !== 'title') initAudio();   // browsers only let sound start after a click
  if (G.mode === 'title' || overlayOpen()) return;
  if (G.mode === 'intro' || G.mode === 'trance') { skipCards(); return; }
  if (!locked) { if (!G.paused && G.mode !== 'end') lockMouse(); return; }
  if (G.mode === 'dialog') { advanceDialog(); return; }
  if (G.mode === 'memory') { closeMemory(); return; }
  if (G.mode !== 'play' || G.paused) return;
  if (e.button === 0) { mouseL = true; pressAttack(); }
  if (e.button === 1) { e.preventDefault(); toggleLock(); }
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
  if (!$('lantern').classList.contains('hidden')) { if (code === 'Escape' || code === 'KeyE') closeLantern(); return; }
  if (code === 'Tab' && G.mode === 'play') { toggleJournal(); return; }
  if (G.mode !== 'play' || G.paused) return;
  if (code === 'Space') P.jumpBuf = 0.15;
  if (code === 'KeyE') interact();
  if (code === 'KeyQ') tukangFlare();
  if (code === 'KeyF') nurSense();
  if (code === 'KeyC') dodge();
  if (code === 'KeyR') drinkFilm();
  if (code === 'KeyT') toggleLock();
}

/* ================================================================
   ENEMIES
   ================================================================ */
const enemies = createEnemies({
  scene, world, particles, P, F, G, sfx,
  get D() { return D; },
  hurtPlayer: (d, from, kb, o) => hurtPlayer(d, from, kb, o),
  dmgNumber: (...a) => dmgNumber(...a),
  stealShards(n) { G.shards -= n; toast(`A Kipsu snatched ${n} shards! Catch it before it gets away!`, 3); },
  onEscape(e) { toast(`The Kipsu escaped with ${e.stolen} shards.`, 3); },
  onKill(e) {
    const n = Math.round(e.T.shards * (0.8 + Math.random() * 0.4)) + (e.stolen || 0);
    G.shards += n; SAVE.kills++;
    dmgNumber(e.pos.x, e.pos.y + 2.6, e.pos.z, '+' + n, 'shard');
    for (let i = 0; i < Math.min(14, 3 + n / 4); i++) particles.emit(e.pos.x, e.pos.y + 1, e.pos.z, { vx: (P.pos.x - e.pos.x) * 1.2, vy: 4, vz: (P.pos.z - e.pos.z) * 1.2, color: 0xb48aff, size: 0.35, life: 0.8, drag: 1.5 });
    addHeat(6);
    if (e.unique) { SAVE.cleared[e.unique] = true; persist(); }
    if (G.lock === e) G.lock = null;
  },
  onAggro(e, why) {
    const k = e.kind.replace('_t', '');
    if (why === 'scent') { if (!G.seen.scent) { G.seen.scent = true; bark('phorus', 'The Rodak smell blood — yours. They were waiting for this.'); } return; }
    if (F_['seen_' + k]) return;
    F_['seen_' + k] = true;
    const lines = {
      punk: STORY.DIALOG.firstFight[0][1],
      malsti: 'Malsti Punks — they blink through the Duat. Keep turning!',
      kipsu: 'Kipsu! Mind your shards — they’ll pick you clean and run.',
      albali: 'Albali Byrds. Wait for the dive, then hit them while they’re low!',
      vel: 'Duskareth! Watch for knives coming out of the air!',
      tyndael: 'Tyndael — don’t stand in its venom.',
      sruvorn: STORY.DIALOG2.sruvorn[0][1],
    };
    if (lines[k]) bark('phorus', lines[k], 4);
  },
  telegraph(x, z, r, dur, color) {
    const m = ringMesh(r, color); m.position.set(x, world.col.ground(x, z, 99) + 0.15, z);
    telegraphs.push({ mesh: m, x, z, r, t: 0, dur, kind: 'visual' });
  },
  arenaClamp: (p, R) => arenaClamp(p, R),
});
enemies.spawnAll(world.spawnGroups, SAVE.cleared);

/* ================================================================
   BOSSES — the Oath-Rooted (Aakalay) and the Malsti Lord (Leotik)
   ================================================================ */
let boss = null;
const telegraphs = [];
const projectiles = [];

function ringMesh(r, color) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.9, r, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
  m.add(fill); fill.position.z = 0.01; m.userData.fill = fill;
  scene.add(m);
  return m;
}

const BOSSDEF = {
  megla: { name: 'THE OATH-ROOTED', sub: 'Megla Aagac of Aakalay', hp: 1500, arena: 29 },
  lord: { name: 'THE MALSTI LORD', sub: 'the lord of Aakalay, in a Punk’s stem', hp: 2300, arena: 25 },
};
let removedStoneCol = null;

function startBoss(kind) {
  const def = BOSSDEF[kind], pz = world.PLAZA;
  const actor = kind === 'megla' ? buildMegla() : buildMalstiLord();
  scene.add(actor.root);
  const hp = Math.round(def.hp * D.bossHp);
  boss = { kind, def, actor, hp, maxHp: hp, t: 0, next: 3, phase: 1, rising: 0, sweep: 0, slam: 0, flash: 0, col: null, dead: false, deadT: 0, summonT: 12,
    pos: kind === 'megla' ? V3(pz.x, pz.y, pz.z) : V3(pz.x, pz.y, pz.z - 10), saidHalf: false };
  G.bossActive = true; G.arena = def.arena;
  if (kind === 'megla') {
    actor.root.position.set(pz.x, pz.y - 14, pz.z);
    removedStoneCol = world.col.list.filter(c => Math.abs(c.x - pz.x) < 0.1 && Math.abs(c.z - pz.z) < 0.1 && c.top > pz.y + 5);
    removedStoneCol.forEach(c => world.col.remove(c));
    boss.col = world.col.add(pz.x, pz.z, 3.2, 3.2, 0, pz.y - 2, pz.y + 14);
  } else {
    actor.root.position.set(boss.pos.x, pz.y - 2, boss.pos.z);
    actor.root.scale.setScalar(0.01);
  }
  $('boss-name').textContent = def.name; $('boss-sub').textContent = def.sub;
  $('boss').classList.remove('hidden');
  sfx.roar(); G.shake = 1.2;
}

/* falling during a boss on Realistic ends the fight: it must be woken again */
function abortBoss() {
  if (!boss) return;
  scene.remove(boss.actor.root);
  if (boss.col) world.col.remove(boss.col);
  if (boss.kind === 'megla') {
    world.oath.group.position.y = world.PLAZA.y;
    (removedStoneCol || []).forEach(c => world.col.list.includes(c) || world.col.add(c.x, c.z, c.hw, c.hd, Math.atan2(c.s, c.c), c.bot, c.top));
  }
  enemies.list.forEach(e => { if (e.bossMinion && !e.dead) { e.dead = true; e.gone = true; scene.remove(e.actor.root); } });
  telegraphs.forEach(t => scene.remove(t.mesh)); telegraphs.length = 0;
  boss = null; G.bossActive = false; G.arena = 0; G.lock = null;
  $('boss').classList.add('hidden');
  setObjective();
}

function bossTargetPoint() {
  if (!boss) return V3();
  if (boss.kind === 'megla') return V3(world.PLAZA.x, world.PLAZA.y + 6.5, world.PLAZA.z);
  return V3(boss.pos.x, boss.actor.root.position.y + 4.2, boss.pos.z);
}
function bossReach() { return boss.kind === 'megla' ? 3.4 : 3.6; }

function damageBoss(dmg, opts = {}) {
  if (!boss || boss.dead || boss.rising < 1) return;
  dmg *= opts.raw ? 1 : D.playerDmg;
  boss.hp -= dmg; boss.flash = 1;
  const c = bossTargetPoint();
  dmgNumber(c.x + (Math.random() - 0.5) * 3, c.y + 2 + Math.random() * 2, c.z + 2, Math.round(dmg), opts.big ? 'big' : '');
  sfx.hit();
  if (boss.phase === 1 && boss.hp < boss.maxHp * 0.5) {
    boss.phase = 2; sfx.roar(); G.shake = 0.8;
    bark('phorus', boss.kind === 'megla' ? STORY.DIALOG.bossHalf[0][1] : STORY.DIALOG2.lordHalf[0][1]);
  }
  if (boss.hp <= 0) {
    boss.hp = 0; boss.dead = true; boss.deadT = 0; sfx.victory(); G.shake = 1.5;
    enemies.list.forEach(e => { if (!e.dead && e.bossMinion) { e.hp = 0; enemies.kill(e); } });
    telegraphs.forEach(tg => scene.remove(tg.mesh)); telegraphs.length = 0;
    projectiles.filter(p => p.owner === 'boss').forEach(p => { p.life = 0; });
    G.shards += Math.round((boss.kind === 'megla' ? 400 : 700) * (D === DIFFICULTY.realistic ? 1.3 : 1));
  }
}

function summonMinions(n, kinds) {
  const pz = world.PLAZA;
  const alive = enemies.list.filter(e => e.bossMinion && !e.dead).length;
  n = Math.min(n, 7 - alive);
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const e = enemies.spawn(kinds[i % kinds.length], pz.x + Math.cos(ang) * 9, pz.z + Math.sin(ang) * 9, null, { bossMinion: true, boss: true, state: 'chase', hostile: true });
    e.home.set(pz.x, 0, pz.z);
    particles.burst(e.pos.x, e.pos.y + 0.5, e.pos.z, 20, { color: 0x9a4aff, speed: 5, size: 0.5, life: 0.6 });
  }
  if (n > 0) sfx.blink();
}

function bossOrbs(n, speed) {
  const c = bossTargetPoint();
  for (let i = 0; i < n; i++) {
    const sp = glowSprite(0xc070ff, 1.6, 1);
    const ang = (i / n) * Math.PI * 2;
    const pos = V3(c.x + Math.cos(ang) * 2, c.y + 2, c.z + Math.sin(ang) * 2);
    sp.position.copy(pos); scene.add(sp);
    projectiles.push({ sprite: sp, pos, vel: V3(Math.cos(ang) * 6, 3, Math.sin(ang) * 6), dmg: 11, owner: 'boss', life: 6.5, homing: 2.2, speed });
  }
}

function slamRings(n, color, dmg) {
  for (let i = 0; i < n; i++) {
    const lead = i === 0 ? 0 : 1;
    const x = P.pos.x + P.vel.x * 0.5 * lead + (i ? (Math.random() - 0.5) * 10 : 0);
    const z = P.pos.z + P.vel.z * 0.5 * lead + (i ? (Math.random() - 0.5) * 10 : 0);
    const m = ringMesh(2.8, color);
    m.position.set(x, world.col.ground(x, z, P.pos.y + 1) + 0.12, z);
    telegraphs.push({ mesh: m, x, z, r: 2.8, t: -i * 0.18, dur: 1.15 * D.windup * (boss && boss.phase === 2 ? 0.8 : 1), dmg, kind: 'root' });
  }
}

function updateBoss(dt) {
  if (!boss) return;
  const b = boss, a = b.actor, pz = world.PLAZA;
  b.t += dt;
  if (b.rising < 1) {
    b.rising = Math.min(1, b.rising + dt / 3);
    const k = 1 - Math.pow(1 - b.rising, 3);
    if (b.kind === 'megla') {
      a.root.position.y = pz.y - 14 + 14 * k;
      world.oath.group.position.y = pz.y - b.rising * 12;
    } else {
      a.root.scale.setScalar(Math.max(0.01, k));
      a.root.position.y = pz.y;
    }
    if (Math.random() < 0.9) particles.emit(b.pos.x + (Math.random() - 0.5) * 14, pz.y + 0.5, b.pos.z + (Math.random() - 0.5) * 14, { vy: 4 + Math.random() * 4, color: 0x9a7ad8, size: 2.4, life: 1.6, drag: 0.5 });
    G.shake = Math.max(G.shake, 0.3);
    a.animate(dt, { t: G.t });
    return;
  }
  if (b.dead) {
    b.deadT += dt;
    a.root.position.y = pz.y - b.deadT * 4;
    if (b.kind === 'lord') a.root.scale.setScalar(Math.max(0.01, 1 - b.deadT / 3.6));
    if (Math.random() < 0.9) particles.emit(b.pos.x + (Math.random() - 0.5) * 8, pz.y + Math.random() * 14, b.pos.z + (Math.random() - 0.5) * 8, { vy: 3, color: 0xd0b0ff, size: 1.6, life: 1.4, speed: 4 });
    if (b.deadT > 3.6) {
      scene.remove(a.root); if (b.col) world.col.remove(b.col);
      const kind = b.kind;
      boss = null; G.bossActive = false; G.arena = 0; $('boss').classList.add('hidden');
      kind === 'megla' ? afterMegla() : afterLord();
    }
    return;
  }
  b.flash = Math.max(0, b.flash - dt * 5); a.flash(b.flash * 0.7);
  if (G.mode !== 'play' || P.dead) { a.animate(dt, { t: G.t }); return; }
  b.sweep = Math.max(0, b.sweep - dt * 2); b.slam = Math.max(0, b.slam - dt * 2);
  const fast = (b.phase === 2 ? 0.72 : 1) * D.windup;
  b.next -= dt; b.summonT -= dt;
  const dP = Math.hypot(P.pos.x - b.pos.x, P.pos.z - b.pos.z);

  if (b.kind === 'lord') {
    // drift after Torcain, keeping a little distance
    const want = 7;
    if (!b.blink) {
      const dx = P.pos.x - b.pos.x, dz = P.pos.z - b.pos.z;
      if (dP > want) { b.pos.x += dx / dP * 2.6 * dt; b.pos.z += dz / dP * 2.6 * dt; }
      arenaClamp(b.pos, b.def.arena - 5);
      a.root.position.set(b.pos.x, pz.y, b.pos.z);
      a.root.rotation.y = dampAngle(a.root.rotation.y, Math.atan2(dx, dz), 2, dt);
    } else {
      b.blink.t += dt;
      a.root.scale.setScalar(Math.max(0.01, 1 - b.blink.t * 3));
      if (b.blink.t >= b.blink.dur) {
        b.pos.set(b.blink.x, 0, b.blink.z); a.root.position.set(b.pos.x, pz.y, b.pos.z); a.root.scale.setScalar(1);
        if (Math.hypot(P.pos.x - b.pos.x, P.pos.z - b.pos.z) < 5.5) hurtPlayer(30 * D.enemyDmg, b.pos, 18);
        particles.ring(b.pos.x, pz.y + 0.5, b.pos.z, 60, 16, { color: 0xc890ff, size: 0.9, life: 0.6 });
        sfx.slam(); G.shake = 0.7; b.blink = null;
      }
    }
  }

  if (b.summonT <= 0) {
    b.summonT = (b.phase === 2 ? 15 : 20) * (D === DIFFICULTY.realistic ? 0.85 : 1.2);
    summonMinions(b.phase === 2 ? 4 : 3, b.kind === 'megla' ? ['malsti'] : (b.phase === 2 ? ['malsti', 'tyndael', 'malsti'] : ['malsti']));
  }
  if (b.next <= 0 && !b.blink) {
    const roll = Math.random();
    if (b.kind === 'megla') {
      if (dP < 10 && roll < 0.45) {
        b.next = 3.2 * fast;
        const m = ringMesh(10, 0xff5aa0); m.position.set(pz.x, pz.y + 0.15, pz.z);
        telegraphs.push({ mesh: m, x: pz.x, z: pz.z, r: 10, t: 0, dur: 1.0 * fast + 0.15, dmg: 22, kind: 'sweep' });
        bark('phorus', 'Jump the sweep!', 1.6);
      } else if (roll < 0.75) { b.next = 3.6 * fast; slamRings(b.phase === 2 ? 5 : 3, 0xb070ff, 22); b.slam = 1; }
      else { b.next = 3.4 * fast; bossOrbs(b.phase === 2 ? 7 : 4, b.phase === 2 ? 9 : 7.5); b.sweep = 0.4; }
    } else {
      if (roll < 0.25) {
        b.next = 3.4 * fast;
        const x = P.pos.x, z = P.pos.z;
        const m = ringMesh(5.5, 0xff5aa0); m.position.set(x, world.col.ground(x, z, P.pos.y + 1) + 0.15, z);
        telegraphs.push({ mesh: m, x, z, r: 5.5, t: 0, dur: 1.1 * fast, kind: 'visual' });
        b.blink = { t: 0, dur: 1.1 * fast, x, z };
        particles.burst(b.pos.x, pz.y + 4, b.pos.z, 40, { color: 0x9a4aff, speed: 8, size: 0.7, life: 0.7 });
        sfx.blink();
      } else if (roll < 0.5) { b.next = 3.4 * fast; slamRings(b.phase === 2 ? 6 : 4, 0xb070ff, 24); b.slam = 1; }
      else if (roll < 0.72) { b.next = 3.2 * fast; bossOrbs(b.phase === 2 ? 8 : 5, b.phase === 2 ? 9.5 : 8); }
      else {
        // the oath: a ring of gold closes on you — step out of it before it binds
        b.next = 3.0 * fast;
        const x = P.pos.x, z = P.pos.z;
        const m = ringMesh(3.6, 0xffd060); m.position.set(x, world.col.ground(x, z, P.pos.y + 1) + 0.15, z);
        telegraphs.push({ mesh: m, x, z, r: 3.6, t: 0, dur: 1.5 * fast, dmg: 12, kind: 'oath' });
        bark('phorus', 'Out of the ring — it’s an oath!', 1.6);
      }
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
      const air = P.pos.y - world.col.ground(P.pos.x, P.pos.z, P.pos.y);
      if (tg.kind === 'root') {
        if (d < tg.r && air < 1.2) hurtPlayer(tg.dmg * D.enemyDmg, V3(tg.x, 0, tg.z), 10);
        rootSpikes(tg.x, tg.mesh.position.y, tg.z); sfx.slam(); G.shake = Math.max(G.shake, 0.35);
      } else if (tg.kind === 'sweep') {
        if (d < tg.r && air < 0.8) hurtPlayer(tg.dmg * D.enemyDmg, V3(tg.x, 0, tg.z), 16);
        particles.ring(tg.x, tg.mesh.position.y + 1, tg.z, 60, 16, { color: 0xd0a0ff, size: 0.8, life: 0.6 });
        sfx.heavy(); G.shake = Math.max(G.shake, 0.5);
      } else if (tg.kind === 'oath') {
        if (d < tg.r) hurtPlayer(tg.dmg * D.enemyDmg, V3(tg.x, 0, tg.z), 2, { paralyze: 1.3, force: true });
        particles.ring(tg.x, tg.mesh.position.y + 0.5, tg.z, 40, -4, { color: 0xffd060, size: 0.6, life: 0.6 });
        sfx.core();
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
      if (d < 1.1) { hurtPlayer(p.dmg * D.enemyDmg, p.pos, 5); p.life = 0; }
      if (P.atk && P.atk.p > 0.2 && P.atk.p < 0.7 && d < 2.6) {
        p.life = 0; particles.burst(p.pos.x, p.pos.y, p.pos.z, 12, { color: 0xd0a0ff, speed: 6, size: 0.4, life: 0.4 });
        addHeat(4);
      }
      if (Math.random() < 0.6) particles.emit(p.pos.x, p.pos.y, p.pos.z, { color: 0x9a5aff, size: 0.6, life: 0.4, speed: 0.5 });
    } else {
      const tgt = p.target;
      const alive = tgt && (tgt.isBoss ? !!boss && !boss.dead : !tgt.dead);
      if (alive) {
        const tp = tgt.isBoss ? bossTargetPoint() : V3(tgt.pos.x, tgt.pos.y + 0.8, tgt.pos.z);
        const to = tp.clone().sub(p.pos); const d = to.length();
        p.vel.lerp(to.normalize().multiplyScalar(30), 1 - Math.exp(-8 * dt));
        if (d < (tgt.isBoss ? 3 : 1.1)) {
          if (tgt.isBoss) damageBoss(p.dmg, { raw: true }); else enemies.damage(tgt, p.dmg, F.pos, 2.5, { stun: 0.2, raw: true });
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
const canAct = () => G.mode === 'play' && !P.dead && P.para <= 0 && !P.roll;

function camForward() { return V3(-Math.sin(CAM.yaw), 0, -Math.cos(CAM.yaw)); }
function spend(cost) {
  if (cost <= 0) return true;
  if (P.stam < Math.min(cost, 8)) { $('stam').classList.add('low'); setTimeout(() => $('stam').classList.remove('low'), 300); return false; }
  P.stam -= cost; P.stamDelay = 0.75;
  return true;
}

function pressAttack() {
  if (!canAct() || P.drink > 0) return;
  if (!P.atk) startAttack(P.comboReset > 0 ? (P.comboIdx % 3) + 1 : 1);
  else if (P.atk.p > 0.35) P.queued = true;
}

function startAttack(kind) {
  if (!spend(kind === 3 ? D.stamina.heavy : D.stamina.attack)) { P.atk = null; return; }
  P.atk = { kind, t: 0, p: 0, hit: new Set(), dur: ATK[kind].dur };
  P.comboIdx = kind; P.queued = false;
  const f = lockDir() || camForward();
  P.yaw = Math.atan2(f.x, f.z);
  P.vel.x += f.x * (kind === 3 ? 6 : 4); P.vel.z += f.z * (kind === 3 ? 6 : 4);
  kind === 3 ? sfx.heavy() : sfx.swing();
}

function lockDir() {
  const t = lockPoint(); if (!t) return null;
  const v = V3(t.x - P.pos.x, 0, t.z - P.pos.z); if (v.lengthSq() < 0.01) return null;
  return v.normalize();
}

function updateAttack(dt) {
  if (!P.atk) { P.comboReset = Math.max(0, P.comboReset - dt); return; }
  const A = P.atk, def = ATK[A.kind];
  A.t += dt; A.p = A.t / A.dur;
  if (A.p > 0.28 && A.p < 0.7) {
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    const dmg = def.dmg * axeMul();
    for (const e of enemies.list) {
      if (e.dead || A.hit.has(e)) continue;
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d > def.range + e.T.rad || Math.abs(e.pos.y - P.pos.y) > 2.2) continue;
      if (d > 0.8 + e.T.rad && (dx * fx + dz * fz) / d < 0.15) continue;
      A.hit.add(e);
      enemies.damage(e, dmg * (0.9 + Math.random() * 0.2), P.pos, def.kb, { big: A.kind === 3, stun: A.kind === 3 ? 0.6 : 0.32 });
      addHeat(7);
      G.hitstop = A.kind === 3 ? 0.07 : 0.04;
      G.shake = Math.max(G.shake, A.kind === 3 ? 0.35 : 0.15);
    }
    if (boss && !boss.dead && !A.hit.has('boss')) {
      const d = Math.hypot(P.pos.x - boss.pos.x, P.pos.z - boss.pos.z);
      if (d < def.range + bossReach()) {
        A.hit.add('boss'); damageBoss(dmg * (A.kind === 3 ? 1.2 : 1), { big: A.kind === 3 });
        addHeat(7); G.hitstop = 0.05; G.shake = Math.max(G.shake, 0.2);
      }
    }
    const wp = torcain.weapon.getWorldPosition(V3());
    particles.emit(wp.x, wp.y, wp.z, { color: A.kind === 3 ? 0xffa050 : 0xc8a0ff, size: 0.5, life: 0.25, speed: 0.3 });
  }
  if (A.kind === 3 && A.p > 0.55 && !A.slammed) {
    A.slammed = true;
    const x = P.pos.x + Math.sin(P.yaw) * 2, z = P.pos.z + Math.cos(P.yaw) * 2;
    particles.ring(x, P.pos.y + 0.2, z, 24, 7, { color: 0xffb060, size: 0.5, life: 0.4 });
  }
  if (A.t >= A.dur) {
    const next = P.queued && A.kind < 3 ? A.kind + 1 : 0;
    P.atk = null; P.comboReset = 0.35;
    if (next) startAttack(next); else if (A.kind === 3) P.comboIdx = 0;
  }
}

function targetCandidates() {
  const c = enemies.list.filter(e => !e.dead).map(e => ({ e, p: V3(e.pos.x, e.pos.y + 0.8, e.pos.z) }));
  if (boss && !boss.dead && boss.rising >= 1) c.push({ e: 'boss', p: bossTargetPoint() });
  return c;
}
function bestTarget(maxD, minDot) {
  const f = camForward();
  let best = null, bestScore = -1;
  for (const c of targetCandidates()) {
    const dx = c.p.x - P.pos.x, dz = c.p.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > maxD || d < 0.5) continue;
    const dot = (dx * f.x + dz * f.z) / d;
    if (dot < minDot) continue;
    const score = dot * 2 - d / maxD;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

function duatStrike() {
  if (!canAct() || P.duatCd > 0) return;
  let best = null;
  if (G.lock) { const p = lockPoint(); if (p && p.distanceTo(P.pos) < 30) best = { e: G.lock, p }; }
  if (!best) best = bestTarget(28, 0.8);
  if (!best) { toast('No foe in sight for the Duat to carry the axe to.'); return; }
  P.duatCd = duatCdMax();
  sfx.duat();
  const wp = torcain.weapon.getWorldPosition(V3());
  particles.burst(wp.x, wp.y, wp.z, 26, { color: 0x9a5aff, speed: 5, size: 0.5, life: 0.5 });
  const tp = best.p;
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2;
    particles.emit(tp.x + Math.cos(a) * 1.4, tp.y + 2.4, tp.z + Math.sin(a) * 1.4, { vx: 0, vy: -6, vz: 0, color: 0xb07aff, size: 0.55, life: 0.45 });
  }
  const mul = axeMul() * (1 + 0.15 * rank('duat'));
  setTimeout(() => {
    if (best.e === 'boss') damageBoss(55 * 2 * mul, { big: true });
    else if (!best.e.dead) enemies.damage(best.e, 48 * mul, P.pos, 3, { big: true, stun: 1.0 });
    particles.burst(tp.x, tp.y + 0.5, tp.z, 30, { color: 0xe0c0ff, speed: 9, size: 0.5, life: 0.6, gravity: -8 });
    G.shake = Math.max(G.shake, 0.4); G.hitstop = 0.06;
    addHeat(10);
  }, 180);
}

function tukangFlare() {
  if (!canAct()) return;
  if (P.heat < 100) { toast('The Tukang needs more heat — land your strikes.'); return; }
  P.heat = 0; P.flareT = 0.6;
  sfx.flare(); G.shake = 0.8; G.hitstop = 0.08;
  const mul = 1 + 0.2 * rank('tukang');
  particles.ring(P.pos.x, P.pos.y + 0.6, P.pos.z, 80, 18, { color: 0xff8a2a, size: 1.0, life: 0.7 });
  particles.ring(P.pos.x, P.pos.y + 1.2, P.pos.z, 50, 12, { color: 0xffd070, size: 0.7, life: 0.6 });
  particles.burst(P.pos.x, P.pos.y + 1, P.pos.z, 50, { color: 0xffa040, speed: 10, size: 0.6, life: 0.8, gravity: 4 });
  for (const e of enemies.list) {
    if (e.dead) continue;
    const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
    if (d < 8 && Math.abs(e.pos.y - P.pos.y) < 6) enemies.damage(e, 55 * mul, P.pos, 15, { big: true, stun: 1 });
  }
  if (boss && !boss.dead && Math.hypot(P.pos.x - boss.pos.x, P.pos.z - boss.pos.z) < 12) damageBoss(90 * mul, { big: true });
}

function dodge() {
  if (!canAct() || P.drink > 0) return;
  if (!spend(D.stamina.dodge)) return;
  const f = camForward(), r = V3(Math.cos(CAM.yaw), 0, -Math.sin(CAM.yaw));
  let ix = 0, iz = 0;
  if (keys.KeyW) iz += 1; if (keys.KeyS) iz -= 1; if (keys.KeyA) ix -= 1; if (keys.KeyD) ix += 1;
  const dir = V3().addScaledVector(f, iz).addScaledVector(r, ix);
  if (dir.lengthSq() < 0.01) dir.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
  dir.normalize();
  P.atk = null;
  P.roll = { t: 0, dur: 0.5, dir };
  P.iframes = Math.max(P.iframes, 0.38);
  P.yaw = Math.atan2(dir.x, dir.z);
  sfx.jump();
}

function drinkFilm() {
  if (!canAct() || P.drink > 0) return;
  if (P.flasks <= 0) { toast('No Albali film left — rest at a Nur Lantern.'); return; }
  P.flasks--; P.drink = 0.85; P.atk = null;
}

function nurSense() {
  if (P.senseCd > 0) return;
  P.senseCd = 7;
  sfx.sense();
  particles.ring(F.pos.x, F.pos.y + 1, F.pos.z, 70, 24, { color: 0x9adfff, size: 0.6, life: 1.2, drag: 0.3 });
  const t = senseTarget();
  if (t) {
    G.sensed = { pos: t.pos.clone(), label: t.label }; G.senseTimer = 16;
    beam.position.set(t.pos.x, t.pos.y + 30, t.pos.z); beam.visible = true;
    bark('phorus', t.line, 3.5);
  } else bark('phorus', 'Nothing left singing that I can feel.', 2.5);
}

function senseTarget() {
  let best = null, bd = 1e9;
  if (REGION === 'aakalay') {
    if (coreCount() < 5) {
      for (const c of cores) { if (c.got) continue; const d = c.pos.distanceTo(P.pos); if (d < bd) { bd = d; best = c; } }
      if (best) return { pos: best.pos, label: best.site.name, line: `There — one is singing near ${best.site.name}. ${Math.round(bd)} paces, give or take.` };
    } else if (!F_.bossDead) return { pos: V3(world.PLAZA.x, world.PLAZA.y + 6, world.PLAZA.z), label: 'The Oath Stone', line: 'The stone. It’s pulling at the cores — the plaza.' };
  } else {
    if (pillarCount() < 3) {
      for (const p of world.pillars) { if (p.woken) continue; const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z); if (d < bd) { bd = d; best = p; } }
      if (best) return { pos: V3(best.x, best.y + 6, best.z), label: world.SITES[best.key].name, line: `A pillar — out toward ${world.SITES[best.key].name}. ${Math.round(bd)} paces.` };
    } else if (!F_.lordDead) return { pos: V3(world.PLAZA.x, world.PLAZA.y + 6, world.PLAZA.z - 18), label: 'The Urverk', line: 'The Urverk, in the keep. Everything is pointing at it now.' };
  }
  return null;
}

const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.4, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xb48aff, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
beam.visible = false; scene.add(beam);

/* ---------------- lock-on ---------------- */
function toggleLock() {
  if (G.lock) { G.lock = null; return; }
  const b = bestTarget(30, 0.5);
  G.lock = b ? b.e : null;
  if (!G.lock) toast('Nothing to lock on to.', 1.4);
}
function lockPoint() {
  if (!G.lock) return null;
  if (G.lock === 'boss') return boss && !boss.dead ? bossTargetPoint() : null;
  if (G.lock.dead || G.lock.gone) return null;
  return V3(G.lock.pos.x, G.lock.pos.y + 1, G.lock.pos.z);
}

/* ---------------- getting hurt ---------------- */
function hurtPlayer(dmg, from, kb = 7, opts = {}) {
  if (P.dead || G.mode !== 'play') return false;
  if (P.iframes > 0 && !opts.force) {
    if (P.roll) { particles.burst(P.pos.x, P.pos.y + 1, P.pos.z, 6, { color: 0xffffff, speed: 3, size: 0.3, life: 0.3 }); }
    return false;
  }
  P.hp -= dmg; P.iframes = 0.55; P.lastHurt = G.t; P.drink = 0;
  const dir = V3(P.pos.x - from.x, 0, P.pos.z - from.z); if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1); dir.normalize();
  P.vel.addScaledVector(dir, kb); P.vel.y = Math.max(P.vel.y, 3.5);
  if (opts.poison) { P.poison = Math.max(P.poison, opts.poison); }
  if (opts.paralyze) { P.para = Math.max(P.para, opts.paralyze); P.atk = null; }
  torcain.flash(0.8);
  sfx.hurt(); G.shake = Math.max(G.shake, 0.35);
  dmgNumber(P.pos.x, P.pos.y + 2.3, P.pos.z, Math.round(dmg), 'hurt');
  $('hurtfx').style.opacity = 1; setTimeout(() => $('hurtfx').style.opacity = 0, 160);
  if (P.hp <= 0) playerDown();
  return true;
}

function playerDown() {
  P.hp = 0; P.dead = true; P.atk = null; P.roll = null; G.lock = null;
  SAVE.deaths++;
  const real = D === DIFFICULTY.realistic;
  $('death-sub').textContent = real && G.shards > 0
    ? `Your ${G.shards} zikhron shards spill where you fell. Phorus drags you back to the lantern.`
    : 'Phorus drags you back to the lantern.';
  $('death').classList.add('show');
  setTimeout(() => {
    if (real) {
      if (G.shards > 0) { SAVE.lost = { region: REGION, x: P.lastSafe.x, y: P.lastSafe.y, z: P.lastSafe.z, n: G.shards }; G.shards = 0; placeLost(); }
      if (boss) abortBoss();
      restWorld();
    }
    const cp = !real && G.bossActive ? V3(world.PLAZA.x, world.PLAZA.y, world.PLAZA.z + G.arena - 4) : spawnPoint();
    P.pos.copy(cp); P.vel.set(0, 0, 0); P.dead = false; P.iframes = 2; P.poison = 0; P.para = 0;
    applyUps(true);
    F.pos.copy(cp).add(V3(-2, 0, 2));
    if (!real) {
      if (boss && !boss.dead) boss.hp = Math.min(boss.maxHp, boss.hp + boss.maxHp * 0.25);
      enemies.list.forEach(e => { if (!e.dead && !e.bossMinion) e.state = 'return'; });
    }
    telegraphs.forEach(t => scene.remove(t.mesh)); telegraphs.length = 0;
    persist();
    $('death').classList.remove('show');
    CAM.target.set(P.pos.x, P.pos.y + 1.9, P.pos.z);
  }, 2600);
}

/* shards left where you fell (Realistic) */
let lostMark = null;
function placeLost() {
  if (lostMark) { scene.remove(lostMark); lostMark = null; }
  const L = SAVE.lost;
  if (!L || L.region !== REGION) return;
  lostMark = new THREE.Group();
  lostMark.add(glowSprite(0xb48aff, 3, 0.9));
  lostMark.add(glowSprite(0xffffff, 0.8, 1));
  lostMark.position.set(L.x, L.y + 1.2, L.z);
  scene.add(lostMark);
}
placeLost();

/* resting: the wilds wake again, the flowers regrow, the film refills */
function restWorld() {
  enemies.clear();
  enemies.spawnAll(world.spawnGroups, SAVE.cleared);
  world.flowers.forEach(f => { f.ready = true; f.grp.visible = true; });
  P.poison = 0; applyUps(true);
}

/* ================================================================
   STORY STATE
   ================================================================ */
const cores = REGION === 'aakalay' ? Object.entries(world.SITES).map(([key, site]) => {
  const got = !!SAVE.cores[key];
  const mesh = buildCore();
  mesh.position.copy(site.coreAt);
  if (!got) scene.add(mesh);
  return { key, site, mesh, pos: site.coreAt.clone(), got };
}) : [];
const coreCount = () => cores.filter(c => c.got).length;
if (REGION === 'aakalay') world.oath.sockets.forEach((k, i) => { if (F_.offered || F_.bossDead) k.lit.material.opacity = 1; });
if (REGION === 'aakalay' && F_.bossDead) { world.oath.group.position.y = world.PLAZA.y - 12; world.col.list.filter(c => Math.abs(c.x - world.PLAZA.x) < 0.1 && Math.abs(c.z - world.PLAZA.z) < 0.1 && c.top > world.PLAZA.y + 5).forEach(c => world.col.remove(c)); }

if (REGION === 'leotik') {
  world.pillars.forEach(p => { if (SAVE.flags['pillar_' + p.key]) wakePillarVisual(p); });
  if (pillarCount() >= 3) world.urverk.ringMat.emissiveIntensity = 0.8;
  if (F_.lordDead) world.urverk.portalMat.uniforms.uOn.value = 1;
}
function pillarCount() { return REGION === 'leotik' ? world.pillars.filter(p => p.woken).length : 0; }
function wakePillarVisual(p) { p.woken = true; p.mat.emissiveIntensity = 0.9; p.glow.material.opacity = 0.6; }

function interactables() {
  const list = [];
  if (G.mode !== 'play' || P.dead) return list;
  if (REGION === 'aakalay' && !F_.talked) list.push({ pos: F.pos, label: 'Speak with Phorus', act: () => { F_.talked = true; persist(); dialog(STORY.DIALOG.arrive, () => { setObjective(); hint('Press F and Phorus will feel for the nearest singing core.'); }); } });
  else list.push({ pos: F.pos, label: 'Speak with Phorus', act: () => talkPhorus(), far: 2.6 });
  list.push({ pos: STRYX_SPOT, label: (REGION === 'aakalay' && F_.done) ? 'Set sail for Leotik' : 'Hail the Stryx pilot', act: () => stryx() });
  for (const l of lanterns) list.push({ pos: V3(l.x, l.y, l.z), label: lanternLit(l) ? 'Rest at the Nur Lantern' : 'Wake the Nur Lantern', act: () => useLantern(l), far: 2.8 });
  for (const s of stones) list.push({ pos: V3(s.x, s.y, s.z), label: 'Read the carving', act: () => readStone(s), far: 2.6 });
  if (REGION === 'aakalay') {
    for (const c of cores) if (!c.got) list.push({ pos: c.pos, label: 'Take the memory core', act: () => takeCore(c), far: 3.2 });
    if (coreCount() >= 5 && !G.bossActive && !F_.bossDead) list.push({ pos: V3(world.PLAZA.x, world.PLAZA.y, world.PLAZA.z), label: 'Offer the cores to the Oath Stone', act: () => offerCores(), far: 9 });
  } else {
    for (const p of world.pillars) if (!p.woken) list.push({ pos: V3(p.x, p.y, p.z), label: 'Wake the Klug pillar', act: () => wakePillar(p), far: 4 });
    if (pillarCount() >= 3 && !G.bossActive && !F_.lordDead) list.push({ pos: V3(world.PLAZA.x, world.PLAZA.y, world.PLAZA.z - 15), label: 'Touch the Urverk', act: () => touchUrverk(), far: 8 });
  }
  return list;
}

function talkPhorus() {
  const tips = [
    'Zahreh flowers still grow here — the pink ones. They’ll close a wound if you walk through them.',
    'If you’re overwhelmed, let the Tukang build heat — then Q, and burn them all back.',
    'Aim and right-click, and the Duat will carry that axe wherever you’re looking.',
    'Roll with C — you’re hard to hit mid-roll. And drink the film with R before you’re desperate, not after.',
    'Lock on with T if they won’t hold still. Byrds especially.',
    'Rest at the lanterns. I can sing your shards into you there — but resting wakes everything else up too.',
  ];
  let line;
  if (REGION === 'aakalay') line = F_.done ? 'The Punk with a lord in its head. Lovely. The Stryx is waiting when you are.' : coreCount() >= 5 ? 'The plaza, Torcain. The Oath Stone. It’s waiting.' : tips[Math.floor(G.t) % tips.length];
  else line = F_.lordDead ? 'The door is open. I’m not going through it without a proper meal first.' : pillarCount() >= 3 ? 'The keep. The Urverk. Let’s finish it.' : tips[Math.floor(G.t) % tips.length];
  dialog([['phorus', line]]);
}

function stryx() {
  if (REGION === 'aakalay' && F_.done) { setSail(); return; }
  dialog(REGION === 'leotik' ? [['stryx', 'Kreee. Wet. Stryx does not like wet. Stryx waits anyway.']] : STORY.DIALOG.stryx);
}

function readStone(s) {
  const lines = STORY.STONES[s.key] || ['The carving is too worn to read.'];
  SAVE.codex[s.key] = true; persist();
  dialog(lines.map(l => ['stone', l]));
}

function useLantern(l) {
  if (!lanternLit(l)) {
    SAVE.lit[l.id] = true;
    l.flame.material.opacity = 1;
    particles.burst(l.x, l.y + 2.9, l.z, 30, { color: 0xbfeaff, speed: 4, size: 0.5, life: 0.9 });
    sfx.sense();
    if (!F_.firstLantern) { F_.firstLantern = true; persist(); dialog(STORY.DIALOG2.firstLantern, () => openLantern(l)); return; }
  }
  openLantern(l);
}

function openLantern(l) {
  SAVE.lantern = l.id;
  restWorld();
  persist();
  sfx.heal();
  G.paused = true; G.lock = null;
  if (document.pointerLockElement) document.exitPointerLock();
  $('lan-name').textContent = l.name;
  renderUps();
  $('lantern').classList.remove('hidden');
}
function renderUps() {
  $('lan-shards').textContent = G.shards;
  $('lan-ups').innerHTML = '';
  for (const u of UPGRADES) {
    const r = rank(u.id), cost = upgradeCost(u, r), maxed = r >= u.max;
    const row = document.createElement('div'); row.className = 'uprow';
    row.innerHTML = `<div><b>${u.name}</b><small>${u.desc}</small></div><span class="rank">${r}/${u.max}</span>`;
    const btn = document.createElement('button'); btn.className = 'btn small';
    btn.textContent = maxed ? 'Mastered' : `${cost} ◆`;
    btn.disabled = maxed || G.shards < cost;
    btn.onclick = () => {
      if (G.shards < cost || maxed) return;
      G.shards -= cost; SAVE.ups[u.id] = r + 1; applyUps(true); persist(); sfx.core(); renderUps();
    };
    row.appendChild(btn); $('lan-ups').appendChild(row);
  }
}
function closeLantern() { $('lantern').classList.add('hidden'); G.paused = false; lockMouse(); }
$('btn-lanleave').onclick = closeLantern;

/* ---------------- Aakalay ---------------- */
function takeCore(c) {
  c.got = true; SAVE.cores[c.key] = true;
  sfx.core();
  particles.burst(c.pos.x, c.pos.y, c.pos.z, 50, { color: 0xc8a0ff, speed: 7, size: 0.6, life: 1, gravity: 2 });
  scene.remove(c.mesh);
  if (G.sensed && G.sensed.pos.distanceTo(c.pos) < 1) { G.sensed = null; beam.visible = false; }
  persist();
  const m = STORY.CORES[c.key], n = coreCount();
  showMemory(m.who, m.lines, () => {
    if (n === 1) bark('phorus', STORY.DIALOG.firstCore[0][1], 4);
    if (n === 5) dialog(STORY.DIALOG.allCores, () => setObjective());
    setObjective();
  });
}

function offerCores() {
  F_.offered = true;
  dialog(STORY.DIALOG.atStone, () => {
    const s = world.oath;
    s.sockets.forEach((k, i) => setTimeout(() => {
      k.lit.material.opacity = 1; sfx.core();
      particles.burst(s.group.position.x + k.ped.position.x, s.group.position.y + 2.4, s.group.position.z + k.ped.position.z, 20, { color: 0xc8a0ff, speed: 4, size: 0.5, life: 0.7 });
    }, i * 380));
    setTimeout(() => {
      s.mat.emissiveIntensity = 1.4;
      startBoss('megla');
      setTimeout(() => dialog(STORY.DIALOG.bossRise, () => setObjective()), 2600);
    }, 2200);
  });
}

function afterMegla() {
  F_.bossDead = true; persist();
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
    setTimeout(() => dialog(STORY.DIALOG.wake, () => { F_.done = true; persist(); setObjective(); showEnd(1); }), 1200);
  });
}

function setSail() {
  dialog(STORY.DIALOG2.setSail, () => {
    G.mode = 'trance';
    $('endcard').classList.add('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
    fade(0.9, 1.5);
    playCards([
      'The fire tree slips its moorings, and Aakalay falls away beneath the solar sails.',
      'Two days across the etherium. The Stryx sings to the seed. Phorus sleeps. You do not.',
      'Leotik rises out of a storm — green, wet, and humming with something old.',
    ], 4200, () => {
      SAVE.region = 'leotik'; SAVE.lantern = null; persist(); CLOUD.flush();
      try { sessionStorage.setItem('torcain-boot', 'arrive'); } catch (e) { /* ignore */ }
      location.reload();
    });
  });
}

/* ---------------- Leotik ---------------- */
function wakePillar(p) {
  wakePillarVisual(p);
  SAVE.flags['pillar_' + p.key] = true; persist();
  sfx.core(); G.shake = 0.6;
  particles.burst(p.x, p.y + 8, p.z, 60, { color: 0xc8a0ff, speed: 9, size: 0.7, life: 1.2 });
  const n = pillarCount();
  // waking it calls the Duat's little ones
  for (let i = 0; i < (D === DIFFICULTY.realistic ? 5 : 3); i++) {
    const a = Math.random() * Math.PI * 2;
    const e = enemies.spawn(i % 3 === 2 ? 'tyndael' : 'malsti', p.x + Math.cos(a) * 7, p.z + Math.sin(a) * 7, null, { state: 'chase', hostile: true, boss: true });
    particles.burst(e.pos.x, e.pos.y + 0.5, e.pos.z, 16, { color: 0x9a4aff, speed: 4, size: 0.4, life: 0.5 });
  }
  if (n >= 3) { world.urverk.ringMat.emissiveIntensity = 0.8; dialog(STORY.DIALOG2.allPillars, () => setObjective()); }
  else bark('phorus', STORY.DIALOG2.pillarWoken[0][1] + ` (${n}/3)`, 3.5);
  setObjective();
}

function touchUrverk() {
  world.urverk.portalMat.uniforms.uOn.value = 1;
  sfx.duat();
  setTimeout(() => {
    startBoss('lord');
    setTimeout(() => dialog(STORY.DIALOG2.lordRise, () => setObjective()), 2600);
  }, 1200);
}

function afterLord() {
  F_.lordDead = true; persist();
  dialog(STORY.DIALOG2.lordDown, () => {
    G.mode = 'trance';
    if (document.pointerLockElement) document.exitPointerLock();
    fade(0.85, 1.5);
    playCards(STORY.ENDING2, 4600, () => {
      fade(0, 1.5);
      G.mode = 'play'; F_.doneL = true; persist(); setObjective(); showEnd(2);
    });
  });
}

function showEnd(n) {
  G.mode = 'end';
  if (document.pointerLockElement) document.exitPointerLock();
  if (n === 1) {
    $('e-kicker').textContent = 'Rokarvac I · Complete'; $('e-title').textContent = 'The Ruins of Aakalay';
    $('e-lead').textContent = 'Noka’s next riddle, found at the edge of the trance:';
    $('e-riddle').innerHTML = STORY.NEXT_RIDDLE.join('<br>');
    $('btn-sail').style.display = '';
  } else {
    $('e-kicker').textContent = 'Rokarvac II · Complete'; $('e-title').textContent = 'The Isle of the Urverk';
    $('e-lead').textContent = 'What Noka left on the far side of the door:';
    $('e-riddle').innerHTML = STORY.NEXT_RIDDLE2.join('<br>');
    $('btn-sail').style.display = 'none';
  }
  $('e-stats').textContent = `${D.label} · ${fmtTime(SAVE.time)} · ${SAVE.deaths} fall${SAVE.deaths === 1 ? '' : 's'} · ${SAVE.kills} foes. Torcain’s Run continues…`;
  $('endcard').classList.remove('hidden');
}
$('btn-explore').onclick = () => { $('endcard').classList.add('hidden'); G.mode = 'play'; lockMouse(); };
$('btn-sail').onclick = () => { $('endcard').classList.add('hidden'); G.mode = 'play'; setSail(); };

function interact() {
  let best = null, bd = 1e9;
  for (const it of interactables()) {
    const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z);
    if (d < (it.far || 3) && d < bd && Math.abs(it.pos.y - P.pos.y) < 4) { bd = d; best = it; }
  }
  if (best) { sfx.ui(); best.act(); }
}
function nearestPrompt() {
  let best = null, bd = 1e9;
  for (const it of interactables()) {
    const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z);
    if (d < (it.far || 3) && d < bd && Math.abs(it.pos.y - P.pos.y) < 4) { bd = d; best = it; }
  }
  return best;
}

/* ---------------- objective text ---------------- */
function setObjective() {
  let txt, hintTxt = '', pips = 0, on = 0;
  if (REGION === 'aakalay') {
    if (!F_.talked) txt = STORY.OBJECTIVES.talk;
    else if (F_.done) { txt = 'Board the Eldi ship — the Stryx will fly you to Leotik'; }
    else if (G.bossActive) txt = STORY.OBJECTIVES.boss;
    else if (coreCount() >= 5) txt = STORY.OBJECTIVES.stone;
    else { txt = STORY.OBJECTIVES.cores(coreCount()); hintTxt = 'F — Phorus senses the nearest core'; }
    if (F_.talked) { pips = 5; on = coreCount(); }
  } else {
    if (F_.doneL) txt = STORY.LEOTIK_OBJ.done;
    else if (G.bossActive) txt = STORY.LEOTIK_OBJ.boss;
    else if (pillarCount() >= 3) txt = STORY.LEOTIK_OBJ.keep;
    else { txt = STORY.LEOTIK_OBJ.pillars(pillarCount()); hintTxt = 'F — Phorus senses the nearest pillar'; }
    pips = 3; on = pillarCount();
  }
  $('q-head').textContent = REGION === 'aakalay' ? 'Rokarvac I · Aakalay' : 'Rokarvac II · Leotik';
  $('q-text').textContent = txt;
  $('q-hint').textContent = hintTxt;
  const el = $('q-pips'); el.innerHTML = '';
  for (let i = 0; i < pips; i++) { const d = document.createElement('div'); d.className = 'pip' + (i < on ? ' on' : ''); el.appendChild(d); }
}

/* ================================================================
   UI: dialogue, memory, barks, toasts, cards, damage numbers
   ================================================================ */
let DLG = null;
function dialog(lines, onDone) {
  DLG = { lines, i: 0, chars: 0, onDone, tick: 0 };
  G.mode = 'dialog'; P.atk = null;
  $('dialog').classList.remove('hidden');
  showLine();
}
function showLine() {
  const [who] = DLG.lines[DLG.i];
  const sp = STORY.SPEAKERS[who];
  $('d-who').innerHTML = `<span style="color:${sp.color}">${sp.name}</span><small>${sp.sub}</small>`;
  $('d-face').style.background = portrait(who);
  DLG.chars = 0;
}
function portrait(who) {
  const map = {
    torcain: 'radial-gradient(circle at 50% 70%,#8a5a3a 0 30%,transparent 31%),radial-gradient(circle at 50% 42%,#3d2618 0 40%,transparent 41%),radial-gradient(circle,#3a2a50,#120c20)',
    phorus: 'radial-gradient(circle at 50% 70%,#5d6f86 0 32%,transparent 33%),radial-gradient(circle at 50% 44%,#2c3d52 0 38%,transparent 39%),radial-gradient(circle,#1a3a50,#08121c)',
    stryx: 'radial-gradient(circle at 50% 55%,#7d9c44 0 34%,transparent 35%),radial-gradient(circle,#3a2a18,#120c08)',
    noka: 'radial-gradient(circle,#ffd27a 0 20%,#6a4a20 60%,#1a1008)',
    memory: 'radial-gradient(circle,#c8a0ff 0 18%,#3a1a6a 60%,#0a0418)',
    stone: 'radial-gradient(circle,#d9b87a 0 14%,#6a5a40 50%,#1a140c)',
  };
  return map[who] || map.memory;
}
function updateDialog(dt) {
  if (!DLG) return;
  const text = DLG.lines[DLG.i][1];
  if (DLG.chars < text.length) {
    DLG.chars = Math.min(text.length, DLG.chars + dt * 55);
    DLG.tick += dt; if (DLG.tick > 0.06) { DLG.tick = 0; sfx.talk(); }
  }
  $('d-text').textContent = text.slice(0, Math.floor(DLG.chars));
}
function advanceDialog() {
  if (!DLG) return;
  const text = DLG.lines[DLG.i][1];
  if (DLG.chars < text.length) { DLG.chars = text.length; return; }
  DLG.i++;
  if (DLG.i >= DLG.lines.length) {
    const cb = DLG.onDone; DLG = null;
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
function fade(v, s = 0.8) { $('fade').style.transition = `opacity ${s}s`; $('fade').style.opacity = v; }

let cardState = null;
function playCards(lines, each, done) {
  $('cards').innerHTML = '';
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
  cardState.timer = cardState.each / 1000;
}
function skipCards() { if (cardState) nextCard(); }

const dmgLayer = $('dmg');
const nums = [];
function dmgNumber(x, y, z, n, cls = '') {
  const el = document.createElement('div'); el.className = 'num ' + cls; el.textContent = n;
  if (cls === 'shard') el.style.color = '#d8b8ff';
  dmgLayer.appendChild(el);
  nums.push({ el, pos: V3(x, y, z), t: 0, vx: (Math.random() - 0.5) * 0.6 });
}
const tmpV = V3();
function toScreen(p) {
  tmpV.copy(p).project(camera);
  if (tmpV.z > 1 || tmpV.z < -1) return null;
  return [(tmpV.x + 1) / 2 * innerWidth, (1 - tmpV.y) / 2 * innerHeight];
}
function updateNums(dt) {
  for (let i = nums.length - 1; i >= 0; i--) {
    const n = nums[i]; n.t += dt;
    n.pos.y += dt * 1.6; n.pos.x += n.vx * dt;
    const s = toScreen(n.pos);
    if (!s) n.el.style.display = 'none';
    else {
      n.el.style.display = '';
      n.el.style.left = s[0] + 'px'; n.el.style.top = s[1] + 'px';
      n.el.style.opacity = Math.min(1, 2.2 - n.t * 2.2);
      n.el.style.transform = `translate(-50%,-50%) scale(${1 + Math.max(0, 0.25 - n.t) * 2})`;
    }
    if (n.t > 1) { n.el.remove(); nums.splice(i, 1); }
  }
}

/* enemy health bars */
const bars = new Map();
function updateBars() {
  const layer = $('ehp');
  const keep = new Set();
  for (const e of enemies.list) {
    if (e.dead || e.T.miniboss) continue;
    const show = (G.t - e.lastHit < 6) || (e.T.elite && e.state !== 'idle' && e.state !== 'return') || G.lock === e;
    if (!show || e.pos.distanceTo(P.pos) > 45) continue;
    const s = toScreen(V3(e.pos.x, e.pos.y + (e.T.ai === 'flyer' ? 1.4 : e.T.rad * 2 + 1.6), e.pos.z));
    if (!s) continue;
    let el = bars.get(e);
    if (!el) {
      el = document.createElement('div'); el.className = 'ehp' + (e.T.elite ? ' elite' : '');
      el.innerHTML = '<i></i>' + (e.T.elite ? `<b>${e.T.name}</b>` : '');
      layer.appendChild(el); bars.set(e, el);
    }
    el.style.left = s[0] + 'px'; el.style.top = s[1] + 'px';
    el.firstChild.style.transform = `scaleX(${Math.max(0, e.hp / e.maxHp)})`;
    keep.add(e);
  }
  for (const [e, el] of bars) if (!keep.has(e)) { el.remove(); bars.delete(e); }
}

/* ---------------- compass ---------------- */
const strip = $('compass-strip');
const compassEls = { cards: [], ticks: [], marks: {} };
(function buildCompass() {
  for (let i = 0; i < 24; i++) { const t = document.createElement('div'); t.className = 'tick'; strip.appendChild(t); compassEls.ticks.push({ el: t, h: i / 24 * Math.PI * 2 }); }
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
  const lm = compassMark('lost', '<span style="color:#d8b8ff;font-size:13px">✦</span>');
  if (lostMark) placeOnCompass(lm, head(lostMark.position)); else lm.style.display = 'none';
}
function objectivePoint() {
  let p = null;
  if (REGION === 'aakalay') {
    if (!F_.talked) p = F.pos;
    else if (G.bossActive) return null;
    else if (F_.done) p = STRYX_SPOT;
    else if (coreCount() >= 5) p = V3(world.PLAZA.x, 0, world.PLAZA.z);
    else if (G.sensed) p = G.sensed.pos;
  } else {
    if (G.bossActive || F_.lordDead) return null;
    if (pillarCount() >= 3) p = V3(world.PLAZA.x, 0, world.PLAZA.z - 18);
    else if (G.sensed) p = G.sensed.pos;
  }
  if (!p) return null;
  return { p, d: Math.round(Math.hypot(p.x - P.pos.x, p.z - P.pos.z)) };
}

/* ---------------- location banners ---------------- */
let locTimer = 0;
function showLocation(a, b) { $('loc1').textContent = a; $('loc2').textContent = b; $('location').classList.add('show'); locTimer = 3.6; }
function checkLocations() {
  if (G.mode !== 'play') return;
  const sub = REGION === 'aakalay' ? 'Ruins of Aakalay' : 'Leotik';
  for (const [k, s] of Object.entries(world.SITES)) {
    if (!G.visited[k] && Math.hypot(P.pos.x - s.x, P.pos.z - s.z) < 26) { G.visited[k] = true; showLocation(s.name, sub); }
  }
  if (REGION === 'aakalay') {
    if (!G.visited.gate && P.pos.z < 140 && P.pos.z > 120 && Math.abs(P.pos.x) < 12) { G.visited.gate = true; showLocation('Aakalay', 'the city that swore itself away'); }
    if (!G.visited.plaza && Math.hypot(P.pos.x - world.PLAZA.x, P.pos.z - world.PLAZA.z) < 30) { G.visited.plaza = true; showLocation('The Zahreh Plaza', 'where the Oath Stone drinks'); }
  }
}

/* ---------------- journal / pause ---------------- */
function toggleJournal() {
  const j = $('journal');
  if (j.classList.contains('hidden')) {
    let riddle = STORY.RIDDLE.join('<br>');
    if (F_.done || REGION === 'leotik') riddle += '<br><br>' + STORY.NEXT_RIDDLE.join('<br>');
    if (F_.doneL) riddle += '<br><br>' + STORY.NEXT_RIDDLE2.join('<br>');
    $('j-riddle').innerHTML = riddle;
    const mem = Object.entries(STORY.CORES).map(([k, m]) => SAVE.cores[k]
      ? `<div class="jentry"><b>Memory — ${m.who}</b>${m.lines.map(l => '“' + l + '”').join(' ')}</div>`
      : `<div class="jentry locked"><b>Memory</b>A core still sings somewhere in Aakalay.</div>`).join('');
    const carv = Object.entries(STORY.STONES).filter(([k]) => SAVE.codex[k]).map(([k, l]) => `<div class="jentry"><b>Carving</b>${l.join(' ')}</div>`).join('');
    const stats = `<div class="jentry"><b>This Run</b>${D.label} · ${fmtTime(SAVE.time)} · ${SAVE.deaths} falls · ${SAVE.kills} foes · Hurst ranks ${Object.values(SAVE.ups).reduce((a, b) => a + b, 0)}</div>`;
    $('j-mem').innerHTML = stats + mem + carv;
    $('j-codex').innerHTML = [...STORY.CODEX, ...STORY.CODEX_MORE].map(([k, v]) => `<div class="jentry"><b>${k}</b>${v}</div>`).join('');
    j.classList.remove('hidden'); G.paused = true;
    if (document.pointerLockElement) document.exitPointerLock();
  } else { j.classList.add('hidden'); G.paused = false; lockMouse(); }
}
$('btn-jclose').onclick = () => { toggleJournal(); };
function openPause() { if (overlayOpen()) return; G.paused = true; $('pause').classList.remove('hidden'); }
function closePause() { $('pause').classList.add('hidden'); G.paused = false; lockMouse(); }
$('btn-resume').onclick = closePause;
$('btn-journal').onclick = () => { $('pause').classList.add('hidden'); G.paused = false; toggleJournal(); };
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
  P.para = Math.max(0, P.para - dt);
  torcain.flash(Math.max(0, P.iframes - 0.25) * 2 * (P.roll ? 0 : 1) + P.flareT * 0.8 + (P.para > 0 ? 0.35 : 0));

  const act = canAct();
  let ix = 0, iz = 0;
  if (act) {
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
  let sprint = (keys.ShiftLeft || keys.ShiftRight) && moving && !P.exhausted;
  if (sprint && D.stamina.sprint > 0) { P.stam -= D.stamina.sprint * dt; P.stamDelay = 0.5; if (P.stam <= 0) { P.stam = 0; P.exhausted = true; sprint = false; } }
  if (P.exhausted && P.stam > 25) P.exhausted = false;
  let speed = sprint ? 11.5 : 7;
  if (P.atk) speed *= 0.25;
  if (P.drink > 0) speed *= 0.35;
  const accel = P.onGround ? 14 : 4;

  if (P.roll) {
    P.roll.t += dt;
    const k = 1 - P.roll.t / P.roll.dur;
    P.vel.x = P.roll.dir.x * 15 * Math.max(0.3, k); P.vel.z = P.roll.dir.z * 15 * Math.max(0.3, k);
    torcain.body.rotation.x = (P.roll.t / P.roll.dur) * Math.PI * 2;
    if (Math.random() < 0.5) particles.emit(P.pos.x, P.pos.y + 0.2, P.pos.z, { color: 0xd8c098, size: 0.5, life: 0.4, speed: 1.5 });
    if (P.roll.t >= P.roll.dur) { P.roll = null; torcain.body.rotation.x = 0; }
  } else {
    P.vel.x = damp(P.vel.x, wish.x * speed, accel, dt);
    P.vel.z = damp(P.vel.z, wish.z * speed, accel, dt);
    if (moving && !P.atk) P.yaw = dampAngle(P.yaw, Math.atan2(wish.x, wish.z), 14, dt);
    if (G.lock && !P.atk && !moving) { const ld = lockDir(); if (ld) P.yaw = dampAngle(P.yaw, Math.atan2(ld.x, ld.z), 10, dt); }
  }
  if (P.para > 0) { P.vel.x *= 0.8; P.vel.z *= 0.8; if (Math.random() < 0.4) particles.emit(P.pos.x, P.pos.y + 1.6, P.pos.z, { color: 0xffe0a0, size: 0.3, life: 0.5, speed: 2 }); }

  if (sprint && P.onGround && Math.random() < 0.6)
    particles.emit(P.pos.x, P.pos.y + 0.2, P.pos.z, { vx: -P.vel.x * 0.1, vy: 1.2, vz: -P.vel.z * 0.1, color: Math.random() < 0.5 ? 0xff8a2a : 0xffc04a, size: 0.32, life: 0.6 });

  // stamina recovers once you stop spending it
  P.stamDelay = Math.max(0, P.stamDelay - dt);
  if (P.stamDelay <= 0 && !sprint) P.stam = Math.min(P.stamMax, P.stam + (34 + 5 * rank('breath')) * dt * (P.atk ? 0.3 : 1));

  // drinking the film
  if (P.drink > 0) {
    P.drink -= dt;
    if (Math.random() < 0.5) particles.emit(P.pos.x, P.pos.y + 1.4, P.pos.z, { color: 0xffe0a0, size: 0.3, life: 0.5, speed: 1.5 });
    if (P.drink <= 0) {
      const h = Math.min(D.flaskHeal + 6 * rank('film'), P.maxHp - P.hp); P.hp += h; P.poison = 0;
      dmgNumber(P.pos.x, P.pos.y + 2.4, P.pos.z, '+' + Math.round(h), 'heal'); sfx.heal();
    }
  }

  P.coyote = P.onGround ? 0.12 : Math.max(0, P.coyote - dt);
  if (P.jumpBuf > 0 && P.coyote > 0 && act && spend(D.stamina.jump)) { P.vel.y = 10.5; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; sfx.jump(); }
  P.vel.y -= 28 * dt;

  const wasGround = P.onGround;
  P.pos.addScaledVector(P.vel, dt);
  world.col.resolve(P.pos, 0.45, 1.9);
  if (G.bossActive && boss) {
    arenaClamp(P.pos, G.arena);
    if (boss.kind === 'megla') {
      const pz = world.PLAZA, d = Math.hypot(P.pos.x - pz.x, P.pos.z - pz.z);
      if (d < 4.2) { P.pos.x = pz.x + (P.pos.x - pz.x) / d * 4.2; P.pos.z = pz.z + (P.pos.z - pz.z) / d * 4.2; }
    }
  }
  const g = world.col.ground(P.pos.x, P.pos.z, P.pos.y);
  if (P.pos.y <= g) {
    if (!wasGround && P.vel.y < -12) { sfx.land(); particles.burst(P.pos.x, g + 0.1, P.pos.z, 10, { color: 0xd8c098, speed: 3, size: 0.5, life: 0.5 }); }
    P.pos.y = g; P.vel.y = 0; P.onGround = true;
  } else if (wasGround && P.vel.y <= 0 && P.pos.y - g < 0.45) { P.pos.y = g; P.vel.y = 0; P.onGround = true; }
  else P.onGround = false;

  P.safeTimer -= dt;
  if (P.onGround && P.safeTimer <= 0) {
    const R = world.edgeRadius(P.pos.x, P.pos.z), rr = Math.hypot(P.pos.x, P.pos.z);
    const inHazard = world.hazards.some(h => Math.hypot(P.pos.x - h.x, P.pos.z - h.z) < h.r + 1);
    if (!inHazard && (rr < R - 6 || (Math.abs(P.pos.x) < 3 && P.pos.z > 150))) { P.lastSafe.copy(P.pos); P.safeTimer = 0.5; }
  }
  if (P.pos.y < -45 && !P.dead) {
    fade(1, 0.3);
    setTimeout(() => { P.pos.copy(P.lastSafe); P.vel.set(0, 0, 0); fade(0, 0.8); }, 350);
    P.pos.y = -44; P.vel.set(0, 0, 0);
    const fallDmg = Math.round(P.maxHp * (D === DIFFICULTY.realistic ? 0.3 : 0.12));
    P.hp -= fallDmg; dmgNumber(P.lastSafe.x, P.lastSafe.y + 2.3, P.lastSafe.z, fallDmg, 'hurt');
    bark('phorus', 'Mind the edge! It’s a long way down to the cloud sea.', 2.5);
    if (P.hp <= 0) { P.hp = 1; playerDown(); }
  }

  // poison, acid, burning ground
  if (!P.dead) {
    const groundY = world.col.ground(P.pos.x, P.pos.z, P.pos.y);
    let tick = 0;
    for (const h of world.hazards) if (Math.hypot(P.pos.x - h.x, P.pos.z - h.z) < h.r && P.pos.y - groundY < 0.8) { tick += h.dps * (D === DIFFICULTY.realistic ? 1.4 : 0.8); P.poison = Math.max(P.poison, h.poison); }
    for (const h of enemies.puddles) if (Math.hypot(P.pos.x - h.x, P.pos.z - h.z) < h.r && P.pos.y - groundY < 0.8) { tick += h.dps * D.enemyDmg * 0.6; P.poison = Math.max(P.poison, h.poison); }
    if (tick > 0) {
      P.hp -= tick * dt; P.lastHurt = G.t;
      if (Math.random() < 0.3) particles.emit(P.pos.x, P.pos.y + 0.3, P.pos.z, { vy: 2, color: 0xb0ff4a, size: 0.4, life: 0.5, speed: 1 });
      if (P.hp <= 0) playerDown();
    }
    if (P.poison > 0) {
      P.poison -= dt;
      P.hp = Math.max(1, P.hp - D.poisonDps * dt); P.lastHurt = G.t;
      if (Math.random() < 0.2) particles.emit(P.pos.x, P.pos.y + 1.2, P.pos.z, { vy: 1.5, color: 0x8aff4a, size: 0.3, life: 0.6, speed: 0.8 });
    }
  }

  if (D.regen > 0 && G.t - P.lastHurt > 6 && P.hp < P.maxHp && !P.dead) P.hp = Math.min(P.maxHp, P.hp + D.regen * dt);
  for (const fl of world.flowers) {
    if (!fl.ready) { if (D.flowerRegrow > 0) { fl.timer -= dt; if (fl.timer <= 0) { fl.ready = true; fl.grp.visible = true; } } continue; }
    if (Math.hypot(fl.x - P.pos.x, fl.z - P.pos.z) < 1.6 && P.hp < P.maxHp && !P.dead) {
      const h = Math.min(D.flowerHeal, P.maxHp - P.hp); P.hp += h; P.poison = 0;
      dmgNumber(P.pos.x, P.pos.y + 2.4, P.pos.z, '+' + Math.round(h), 'heal');
      sfx.heal(); particles.burst(fl.x, fl.grp.position.y + 1, fl.z, 24, { color: 0xff9ad0, speed: 4, size: 0.4, life: 0.8, gravity: 3 });
      fl.ready = false; fl.timer = D.flowerRegrow; fl.grp.visible = false;
    }
  }

  // recover shards left where you fell
  if (lostMark && SAVE.lost && P.pos.distanceTo(lostMark.position) < 2.2 && !P.dead) {
    G.shards += SAVE.lost.n;
    dmgNumber(P.pos.x, P.pos.y + 2.6, P.pos.z, '+' + SAVE.lost.n, 'shard');
    sfx.core(); toast(`You gather up ${SAVE.lost.n} lost shards.`);
    SAVE.lost = null; scene.remove(lostMark); lostMark = null; persist();
  }

  const hs = Math.hypot(P.vel.x, P.vel.z);
  if (P.onGround && hs > 1 && !P.roll) { P.stepPh += dt * hs * 0.32; if (P.stepPh > 1) { P.stepPh = 0; sfx.step(); } }

  updateAttack(dt);

  torcain.root.position.copy(P.pos);
  torcain.root.rotation.y = P.yaw;
  torcain.animate(dt, { speed: P.roll ? 0 : hs, onGround: P.onGround, t: G.t, swing: P.atk ? { kind: P.atk.kind, p: clamp(P.atk.p, 0, 1) } : null, heat: P.heat / 100 });
  if (P.roll) torcain.body.rotation.x = (P.roll.t / P.roll.dur) * Math.PI * 2;
}

function updatePhorus(dt) {
  F.cd = Math.max(0, F.cd - dt); F.cast = Math.max(0, F.cast - dt);
  let tgt = null, bd = 1e9;
  if (G.mode === 'play' && !P.dead) {
    for (const e of enemies.list) {
      if (e.dead || !e.hostile || e.state === 'idle' || e.state === 'return' || e.state === 'shadow') continue;
      const d = e.pos.distanceTo(P.pos);
      if (d < 18 && d < bd) { bd = d; tgt = e; }
    }
    if (!tgt && boss && !boss.dead && boss.rising >= 1) tgt = { isBoss: true, pos: boss.pos };
  }
  F.target = tgt;
  let want;
  if (tgt) {
    const tp = tgt.pos;
    const away = V3(P.pos.x - tp.x, 0, P.pos.z - tp.z); if (away.lengthSq() < 0.01) away.set(0, 0, 1); away.normalize();
    const side = V3(-away.z, 0, away.x);
    want = V3(tp.x, 0, tp.z).addScaledVector(away, tgt.isBoss ? 13 : 7).addScaledVector(side, 3);
    const aim = tgt.isBoss ? bossTargetPoint() : V3(tgt.pos.x, tgt.pos.y + 0.8, tgt.pos.z);
    if (F.cd <= 0 && F.pos.distanceTo(aim) < 28) {
      F.cd = D === DIFFICULTY.realistic ? 1.8 : 1.3; F.cast = 0.35;
      const start = phorus.weapon.getWorldPosition(V3());
      const sp = glowSprite(0x7ad8ff, 1.1, 1); sp.position.copy(start); scene.add(sp);
      const dir = aim.clone().sub(start).normalize();
      projectiles.push({ sprite: sp, pos: start, vel: dir.multiplyScalar(22), dmg: tgt.isBoss ? 12 : 10, owner: 'phorus', life: 2.2, target: tgt.isBoss ? { isBoss: true } : tgt });
      sfx.bolt();
      F.yaw = Math.atan2(tp.x - F.pos.x, tp.z - F.pos.z);
    }
  } else {
    const back = V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), right = V3(-Math.cos(P.yaw), 0, Math.sin(P.yaw));
    want = P.pos.clone().addScaledVector(back, 2.4).addScaledVector(right, 1.8);
  }
  // Phorus will not wade into acid
  for (const h of world.hazards) { const dx = want.x - h.x, dz = want.z - h.z, d = Math.hypot(dx, dz); if (d < h.r + 1.5) { want.x = h.x + dx / (d || 1) * (h.r + 1.5); want.z = h.z + dz / (d || 1) * (h.r + 1.5); } }
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
  if (G.bossActive) arenaClamp(F.pos, G.arena - 1);
  const g = world.col.ground(F.pos.x, F.pos.z, F.pos.y);
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
  // lock-on steers the camera toward the target
  const lp = lockPoint();
  if (G.lock && !lp) G.lock = null;
  if (lp) {
    if (lp.distanceTo(P.pos) > 34) G.lock = null;
    else {
      const want = Math.atan2(-(lp.x - P.pos.x), -(lp.z - P.pos.z));
      CAM.yaw = dampAngle(CAM.yaw, want, 7, dt);
      CAM.pitch = damp(CAM.pitch, 0.22, 3, dt);
    }
  }
  const tgt = V3(P.pos.x, P.pos.y + 1.9, P.pos.z);
  CAM.target.lerp(tgt, 1 - Math.exp(-18 * dt));
  if (CAM.target.distanceTo(tgt) > 8) CAM.target.copy(tgt);
  const r = V3(Math.cos(CAM.yaw), 0, -Math.sin(CAM.yaw));
  const look = CAM.target.clone().addScaledVector(r, 0.55);
  const off = V3(Math.sin(CAM.yaw) * Math.cos(CAM.pitch), Math.sin(CAM.pitch), Math.cos(CAM.yaw) * Math.cos(CAM.pitch));
  let want = look.clone().addScaledVector(off, CAM.dist);
  const hit = world.col.ray(look, want);
  if (hit < 1) want = look.clone().addScaledVector(off, Math.max(0.6, CAM.dist * hit - 0.3));
  const gy = world.heightAt(want.x, want.z) + 0.5;
  if (want.y < gy) want.y = gy;
  CAM.pos.copy(want);
  G.shake = Math.max(0, G.shake - dt * 2.2);
  const s = G.shake * G.shake * 0.5;
  camera.position.set(CAM.pos.x + (Math.random() - 0.5) * s, CAM.pos.y + (Math.random() - 0.5) * s, CAM.pos.z + (Math.random() - 0.5) * s);
  camera.lookAt(look);
}

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
  $('hp-fill').style.transform = `scaleX(${Math.max(0, P.hp / P.maxHp)})`;
  $('hp-lag').style.transform = `scaleX(${Math.max(0, P.hp / P.maxHp)})`;
  $('stam-fill').style.transform = `scaleX(${P.stam / P.stamMax})`;
  $('stam').classList.toggle('low', P.exhausted);
  $('hp').style.width = Math.min(420, 280 * P.maxHp / 100) + 'px';
  $('stam').style.width = Math.min(360, 220 * P.stamMax / 100) + 'px';
  $('heat-fill').style.transform = `scaleX(${P.heat / 100})`;
  $('heat').classList.toggle('full', P.heat >= 100);
  const setCd = (id, frac, ready) => { const el = $(id); el.querySelector('.cd').style.transform = `scaleY(${frac})`; el.classList.toggle('ready', ready); };
  setCd('ab-duat', P.duatCd / duatCdMax(), P.duatCd <= 0);
  setCd('ab-flare', 1 - P.heat / 100, P.heat >= 100);
  setCd('ab-sense', P.senseCd / 7, P.senseCd <= 0);
  const vk = P.flasks + '/' + P.flasksMax;
  if ($('vials')._k !== vk) { $('vials')._k = vk; $('vials').innerHTML = Array.from({ length: P.flasksMax }, (_, i) => `<i class="vial${i < P.flasks ? '' : ' empty'}"></i>`).join(''); }
  $('shards').textContent = G.shards;
  const stk = (P.poison > 0 ? 'p' : '') + (P.para > 0 ? 'z' : '');
  if ($('status')._k !== stk) { $('status')._k = stk; $('status').innerHTML = (P.poison > 0 ? '<span class="st poison">POISONED</span>' : '') + (P.para > 0 ? '<span class="st para">PARALYSED</span>' : ''); }
  $('poisonfx').style.opacity = P.poison > 0 ? 0.8 : 0;
  $('resume').classList.toggle('hidden', locked || G.paused || G.mode !== 'play' || overlayOpen());
  const pe = $('prompt'), pr = nearestPrompt();
  if (pr) { pe.innerHTML = `<kbd>E</kbd>${pr.label}`; pe.classList.remove('hidden'); } else pe.classList.add('hidden');
  // the lock reticle
  const lp = lockPoint(), lk = $('lock');
  const ls = lp && toScreen(lp);
  if (ls) { lk.style.display = 'block'; lk.style.left = ls[0] + 'px'; lk.style.top = ls[1] + 'px'; } else lk.style.display = 'none';
  $('crosshair').classList.toggle('lock', !!G.lock);
  // the big bar: a boss, or a Sru Vorn on the hunt
  if (!boss) {
    const mb = enemies.list.find(e => e.T.miniboss && !e.dead && e.state !== 'idle' && e.state !== 'return');
    if (mb) {
      $('boss-name').textContent = mb.T.name.toUpperCase(); $('boss-sub').textContent = 'a Vakarborac of Leotik';
      $('boss').classList.remove('hidden');
      $('boss-fill').style.transform = `scaleX(${mb.hp / mb.maxHp})`; $('boss-lag').style.transform = `scaleX(${mb.hp / mb.maxHp})`;
    } else $('boss').classList.add('hidden');
  }
  updateCompass();
  updateBars();
}

function updateWorldBits(dt) {
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
  if (REGION === 'aakalay' && coreCount() >= 5 && !G.bossActive && !F_.bossDead) world.oath.glow.material.opacity = 0.35 + Math.sin(G.t * 3) * 0.15;
  for (const l of lanterns) {
    const lit = lanternLit(l);
    l.flame.material.opacity = lit ? 0.85 + Math.sin(G.t * 6 + l.x) * 0.15 : 0.15 + Math.sin(G.t * 2 + l.x) * 0.05;
    l.halo.material.opacity = lit ? 0.25 + Math.sin(G.t * 2 + l.z) * 0.05 : 0;
    l.cage.rotation.y += dt * 0.5;
    if (lit && Math.random() < 0.1) particles.emit(l.x, l.y + 2.9, l.z, { vy: 1, speed: 0.6, color: 0xbfeaff, size: 0.2, life: 1.2 });
  }
  for (const s of stones) s.rune.material.opacity = SAVE.codex[s.key] ? 0.2 : 0.45 + Math.sin(G.t * 2.5 + s.x) * 0.2;
  if (lostMark) { lostMark.rotation.y += dt; if (Math.random() < 0.4) particles.emit(lostMark.position.x, lostMark.position.y, lostMark.position.z, { vy: 1.5, speed: 1, color: 0xb48aff, size: 0.3, life: 1 }); }
  if (sky.thunder) { sfx.roar(); }
  hemi.intensity = hemiBase + (sky.flash || 0) * 2.5;
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
      if (G.mode === 'play') SAVE.time += dt;
      updatePlayer(dt);
      updatePhorus(dt);
      enemies.update(dt);
      updateBoss(dt);
      updateTelegraphs(dt);
      updateSpikes(dt);
      updateProjectiles(dt);
      updateWorldBits(dt);
      updateDialog(dt);
      updateCamera(dt);
      checkLocations();
    } else if (G.mode === 'intro') {
      updateIntroCamera(dt);
      updatePhorus(dt);
      torcain.animate(dt, { speed: 0, onGround: true, t: G.t });
      torcain.root.position.copy(P.pos); torcain.root.rotation.y = P.yaw;
    }
    if (cardState) { cardState.timer -= dt; if (cardState.timer <= 0) nextCard(); }
    if (barkTimer > 0) { barkTimer -= dt; if (barkTimer <= 0) $('bark').style.opacity = 0; }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('show'); }
    if (locTimer > 0) { locTimer -= dt; if (locTimer <= 0) $('location').classList.remove('show'); }
    updateNums(dt);
    if (G.mode !== 'title') updateHUD();
  } else if (G.mode === 'title') {
    const t = performance.now() / 1000;
    const a = 0.9 + t * 0.025;
    camera.position.set(Math.sin(a) * 250, 75 + Math.sin(t * 0.1) * 6, Math.cos(a) * 250);
    camera.lookAt(Math.sin(a + 1.2) * 40, 0, Math.cos(a + 1.2) * 40);
  }
  const tt = G.mode === 'title' ? performance.now() / 1000 : G.t;
  world.update(tt, dt, particles, camera.position);
  sky.update(tt, dt, camera.position);
  ship.update(tt, dt, particles);
  particles.update(frozen && G.mode !== 'title' ? 0 : dt);
  const focus = G.mode === 'title' ? V3(0, 0, 0) : P.pos;
  sun.position.copy(focus).addScaledVector(SUN_DIR, 120);
  sun.target.position.copy(focus);
  composer.render();
}

/* ================================================================
   START
   ================================================================ */
function enterPlay() {
  $('hud').classList.remove('hidden');
  G.mode = 'play';
  CAM.target.set(P.pos.x, P.pos.y + 1.9, P.pos.z);
  setObjective();
  lockMouse();
}

function beginNew() {
  G.mode = 'intro'; introT = 0; G.t = 0;
  CAM.yaw = 0; P.yaw = Math.PI;
  playCards(STORY.OPENING, 4200, () => {
    enterPlay();
    showLocation('The Ruins of Aakalay', 'the riddle’s first step');
    hint('Walk to Phorus and press E');
  });
}

function arriveLeotik() {
  P.pos.copy(world.pier.start); F.pos.copy(P.pos).add(V3(-2, 0, -3));
  G.mode = 'intro'; introT = 0; G.t = 0; CAM.yaw = 0; P.yaw = Math.PI;
  playCards(['The Eldi ship comes down through the rain.', 'Leotik.'], 3500, () => {
    enterPlay();
    showLocation('Leotik', 'the isle where the Urverk wakes the dead');
    if (!F_.arrivedL) { F_.arrivedL = true; persist(); dialog(STORY.DIALOG2.arriveLeotik, () => { setObjective(); hint('F — Phorus senses the nearest pillar. Rest at Nur Lanterns.'); }); }
  });
}

function continueRun() {
  P.pos.copy(spawnPoint()); F.pos.copy(P.pos).add(V3(-2, 0, 2));
  CAM.yaw = 0; G.t = 0;
  fade(1, 0); setTimeout(() => fade(0, 1.2), 50);
  enterPlay();
  showLocation(REGION === 'aakalay' ? 'The Ruins of Aakalay' : 'Leotik', `${D.label} · ${fmtTime(SAVE.time)}`);
}

function startFromTitle(fn) {
  initAudio(); setVolume(OPT.vol);
  $('title').classList.add('fade');
  setTimeout(() => $('title').classList.add('hidden'), 1000);
  fn();
}

function newRun(diff) {
  $('newgame').classList.add('hidden');
  if (SAVE_AT_LOAD) {
    const fresh = freshSave(diff);
    writeSave(fresh, KEY);
    if (WHO) { CLOUD.pushSave(WHO.id, fresh); CLOUD.flush(); }
    try { sessionStorage.setItem('torcain-boot', 'new'); } catch (e) { /* ignore */ }
    location.reload();
    return;
  }
  SAVE = freshSave(diff); D = DIFFICULTY[diff]; F_ = SAVE.flags;
  restWorld(); persist();
  startFromTitle(beginNew);
}

$('t-kicker').textContent = REGION === 'leotik' ? "Torcain's Run · Rokarvac II" : STORY.TITLE.kicker;
$('t-title').textContent = REGION === 'leotik' ? 'The Isle of the Urverk' : STORY.TITLE.title;
$('t-sub').textContent = STORY.TITLE.sub;
$('t-riddle').innerHTML = (REGION === 'leotik' ? STORY.NEXT_RIDDLE : STORY.RIDDLE).join('<br>');
$('loading').textContent = 'THE HIGHLAND IS READY';
$('btn-begin').disabled = false;
$('d-easy-p').textContent = DIFFICULTY.easy.blurb;
$('d-real-p').textContent = DIFFICULTY.realistic.blurb;
if (SAVE_AT_LOAD) {
  const where = SAVE.region === 'leotik' ? 'Rokarvac II · Leotik' : 'Rokarvac I · Aakalay';
  $('t-save').textContent = `Saved run: ${where} · ${DIFFICULTY[SAVE.difficulty].label} · ${fmtTime(SAVE.time)} · ${SAVE.deaths} falls`;
  $('btn-continue').style.display = ''; $('btn-continue').disabled = false;
}
function renderAccount() {
  const el = $('t-acct');
  if (WHO) {
    const where = !CLOUD.configured() ? 'saving in this browser only'
      : !CLOUD.state.available ? 'cloud saves aren’t switched on for this site yet — saving in this browser'
      : CLOUD.state.error ? 'couldn’t reach the Dya Guild — saving here and will sync when it’s back'
      : 'your run saves to your Dya’Akara account';
    el.innerHTML = `Signed in as <b>${WHO.name.replace(/[<>&]/g, '')}</b> · ${where} · <a href="#" id="t-signout">Sign out</a>`;
    $('t-signout').onclick = ev => { ev.preventDefault(); CLOUD.flush(); CLOUD.signOut(); location.reload(); };
  } else if (CLOUD.configured()) {
    el.innerHTML = 'Playing as a guest — progress stays in this browser. <a href="#" id="t-signin">Sign in with your Dya’Akara account</a> to save it to your account.';
    $('t-signin').onclick = ev => { ev.preventDefault(); $('signin').classList.remove('hidden'); $('si-email').focus(); };
  } else el.textContent = 'Progress is saved in this browser.';
}
renderAccount();
$('si-cancel').onclick = () => $('signin').classList.add('hidden');
$('si-form').onsubmit = async ev => {
  ev.preventDefault();
  $('si-err').textContent = ''; $('si-go').disabled = true;
  const r = await CLOUD.signIn($('si-email').value, $('si-pass').value);
  $('si-go').disabled = false;
  if (r.err) { $('si-err').textContent = r.err; return; }
  location.reload();
};

if (matchMedia('(pointer: coarse)').matches) $('t-note').textContent = 'This is a keyboard-and-mouse game — on a phone or tablet the controls won’t work.';
$('btn-continue').onclick = () => startFromTitle(() => {
  if (REGION === 'aakalay' && !F_.talked) beginNew();
  else if (REGION === 'leotik' && !F_.arrivedL) arriveLeotik();
  else continueRun();
});
$('btn-begin').onclick = () => {
  $('ng-warn').textContent = SAVE_AT_LOAD ? 'Starting a new run replaces your saved one.' : '';
  $('newgame').classList.remove('hidden');
};
$('btn-ngback').onclick = () => $('newgame').classList.add('hidden');
$('d-easy').onclick = () => newRun('easy');
$('d-real').onclick = () => newRun('realistic');

frame();

if (BOOT === 'new' && SAVE_AT_LOAD) { $('title').classList.add('hidden'); startFromTitle(beginNew); }
else if (BOOT === 'arrive' && REGION === 'leotik') { $('title').classList.add('hidden'); startFromTitle(arriveLeotik); }

/* debugging handle for the console */
window.__torcain = {
  G, P, F, CAM, camera, scene, THREE, enemies, world, cores, SAVE: () => SAVE, persist,
  advance: () => advanceDialog(), closeMemory, pressAttack, duatStrike, tukangFlare, nurSense, interact, dodge, drinkFilm, damageBoss,
  get boss() { return boss; }, startBoss, takeCore, wakePillar, playerDown, openLantern: () => openLantern(lanterns[0]), closeLantern,
};
