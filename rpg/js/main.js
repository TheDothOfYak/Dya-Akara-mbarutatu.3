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
import { buildXilia } from './xilia.js';
import { buildTorcain, buildPhorus, buildMegla, buildCore, buildPunk } from './actors.js';
import { ITEMS, LOOT, add as invAdd, takeAll, hasAll, freshInventory, effects, RECIPES, FORGE } from './items.js';
import { freshSkills, gainXp, PERKS, SPELLS, SPELL_ORDER, xpForLevel, canTake } from './skills.js';
import { NPCS, NPC_LOOKS, buildNpc, buildCamp } from './npcs.js';
import { QUESTS, questProgress } from './quests.js';
import { buildFeatures, sigilMesh } from './features.js';
import { createRpgUI } from './rpgui.js';
import { buildMalstiLord } from './creatures.js';
import { createEnemies, TYPES } from './enemies.js';
import { hasBoard, offers as bountyOffers, bountyProgress } from './bounties.js';
import * as STORY from './story.js';
import { DIFFICULTY, UPGRADES, upgradeCost, freshSave, loadSave, writeSave, fmtTime, saveKey, newer, SAVE_V, isOldSave } from './progress.js';
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
/* runs from before the Xilia prologue were reset; remember that there was one, to say so */
const HAD_OLD = isOldSave(KEY) || isOldSave() || !!(cloudSave && cloudSave.v !== SAVE_V);
if (cloudSave && cloudSave.v !== SAVE_V) cloudSave = null;
const SAVE_AT_LOAD = newer(localSave, cloudSave);
let SAVE = SAVE_AT_LOAD || freshSave('easy');
/* older saves grow the newer RPG fields */
function ensureSave(S) {
  S.inv = S.inv || freshInventory(); S.inv.buffs = S.inv.buffs || {}; S.inv.trinkets = S.inv.trinkets || [];
  S.skills = S.skills || freshSkills();
  for (const k of ['quests', 'counters', 'killsBy', 'qstart', 'picked', 'trials', 'flags', 'cleared', 'codex', 'lit', 'ups']) S[k] = S[k] || {};
  S.seeds = S.seeds || 0; S.bountiesDone = S.bountiesDone || 0; S.bounty = S.bounty || null;
  return S;
}
ensureSave(SAVE);
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
scene.fog = REGION === 'leotik' ? new THREE.Fog(0x4a5a58, 70, 650) : REGION === 'xilia' ? new THREE.Fog(0xf6c89a, 160, 1200) : new THREE.Fog(0xf2b88e, 140, 1100);
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
const world = REGION === 'leotik' ? buildLeotik(scene) : REGION === 'xilia' ? buildXilia(scene) : buildWorld(scene);
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
const perk = id => !!SAVE.skills.perks[id];
let FX = effects(SAVE.inv, SAVE.time);
function applyUps(full) {
  FX = effects(SAVE.inv, SAVE.time);
  P.maxHp = 100 + 15 * rank('vigor') + 5 * (SAVE.skills.lvl - 1) + 10 * SAVE.seeds + FX.hp;
  P.stamMax = 100 + 18 * rank('breath') + 10 * SAVE.seeds;
  P.flasksMax = D.flasks + rank('film') + (SAVE.flags.flask_bonus ? 1 : 0);
  if (full) { P.hp = P.maxHp; P.stam = P.stamMax; P.flasks = P.flasksMax; }
  P.hp = Math.min(P.hp, P.maxHp);
}
applyUps(true);
const axeMul = () => (1 + 0.12 * rank('edge')) * FX.dmg * (perk('heavy') ? 1.15 : 1);
const cdMul = () => FX.cd * (perk('seam') ? 0.8 : 1);
const duatCdMax = () => Math.max(1.5, (5 - 0.6 * rank('duat') - FX.duatCd) * cdMul());
const heatMul = () => D.heatGain * (1 + 0.2 * rank('tukang')) * FX.heat;
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
const overlayOpen = () => ['journal', 'pause', 'lantern', 'endcard', 'newgame', 'signin', 'rpg'].some(id => !$(id).classList.contains('hidden'));
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && !G.paused && (G.mode === 'play' || G.mode === 'dialog' || G.mode === 'memory') && !overlayOpen() && !(DLG && DLG.choices)) openPause();
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
  if (e.target.closest && e.target.closest('#d-choices, #rpg')) return;
  if (G.mode === 'title' || overlayOpen()) return;
  if (G.mode === 'intro' || G.mode === 'trance') { skipCards(); return; }
  if (!locked) { if (!G.paused && G.mode !== 'end') lockMouse(); return; }
  if (G.mode === 'dialog') { if (!(DLG && DLG.choices)) advanceDialog(); return; }
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
  if (G.mode === 'dialog') {
    if (DLG && DLG.choices) { const n = parseInt(code.replace('Digit', ''), 10); if (n >= 1 && n <= DLG.choices.length) pickChoice(n - 1); if (code === 'Escape') pickChoice(DLG.choices.length - 1); return; }
    if (code === 'KeyE' || code === 'Space' || code === 'Enter') advanceDialog(); return;
  }
  if (book && book.isOpen()) { if (code === 'Escape' || code === 'KeyI' || code === 'KeyK' || code === 'KeyJ' || code === 'KeyM' || code === 'Tab') book.close(); return; }
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
  if (code === 'KeyI') openBook('gear');
  if (code === 'KeyK') openBook('skills');
  if (code === 'KeyJ') openBook('quests');
  if (code === 'KeyM') openBook('map');
  if (code === 'KeyH') whistle();
  const si = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(code);
  if (si >= 0) castSpell(SPELL_ORDER[si]);
}

/* ================================================================
   ENEMIES
   ================================================================ */
const enemies = createEnemies({
  scene, world, particles, P, F, G, sfx,
  get D() { return D; },
  hurtPlayer: (d, from, kb, o) => hurtPlayer(d, from, kb, o),
  dmgNumber: (...a) => dmgNumber(...a),
  studyMul: e => studied(e.kind) ? 1.15 : 1,
  stealShards(n) { G.shards -= n; toast(`A Kipsu snatched ${n} shards! Catch it before it gets away!`, 3); },
  onEscape(e) { toast(`The Kipsu escaped with ${e.stolen} shards.`, 3); },
  onKill(e) {
    if (e.T.disp === 'training') { dummyBroken(e); return; }
    const n = Math.round(e.T.shards * (0.8 + Math.random() * 0.4) * FX.shards) + (e.stolen || 0);
    G.shards += n; SAVE.kills++;
    const bk = beastKey(e.kind);
    SAVE.killsBy[bk] = (SAVE.killsBy[bk] || 0) + 1;
    if (SAVE.killsBy[bk] === studyAt(bk) && STORY.BEASTS[bk]) setTimeout(() => toast(`Studied: ${STORY.BEASTS[bk][0]} — +15% damage against them`, 3.5), 700);
    if (SAVE.bounty && SAVE.bounty.kind === bk && bountyProgress(SAVE.bounty, SAVE) === SAVE.bounty.n) setTimeout(() => toast('Bounty complete — claim it at a bounty board', 3.5), 1400);
    xp(Math.round(e.T.shards * 1.2 + 4));
    for (const [it, ch, cnt] of (LOOT[e.kind] || [])) if (Math.random() < ch) { invAdd(SAVE.inv, it, cnt); lootToast(it, cnt); }
    if (perk('wind') && !P.dead) P.hp = Math.min(P.maxHp, P.hp + (D === DIFFICULTY.realistic ? 4 : 8));
    if (e.T.disp && !e.bossMinion) bark('phorus', 'It was only defending itself, Torcain.', 2.5);
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
  onProvoke(e) { bark('phorus', e.T.disp === 'friendly' ? 'Torcain! That one was friendly!' : 'Now you’ve made it angry.', 2.5); },
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
  if (perk('iron')) cost *= 0.7;
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
      const whirl = A.kind === 3 && perk('whirl');
      if (!whirl && d > 0.8 + e.T.rad && (dx * fx + dz * fz) / d < 0.15) continue;
      A.hit.add(e);
      const exec = perk('exec') && e.stun > 0 ? 1.5 : 1;
      enemies.damage(e, dmg * exec * (0.9 + Math.random() * 0.2), P.pos, def.kb, { big: A.kind === 3, stun: (A.kind === 3 ? 0.6 : 0.32) * FX.stagger, burn: FX.burn });
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
    if (!A.hit.has('trial')) { if (trialSwing(def.range)) A.hit.add('trial'); }
    const wp = torcain.weapon.getWorldPosition(V3());
    particles.emit(wp.x, wp.y, wp.z, { color: FX.burn ? 0xff7a2a : A.kind === 3 ? 0xffa050 : 0xc8a0ff, size: 0.5, life: 0.25, speed: 0.3 });
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
  for (const sg of sigils) c.push({ e: { sigil: sg }, p: sg.mesh.position.clone() });
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
  const mul = axeMul() * (1 + 0.15 * rank('duat')) * (perk('deep') ? 1.3 : 1);
  setTimeout(() => {
    if (best.e.sigil) { breakSigil(best.e.sigil); return; }
    if (best.e === 'boss') damageBoss(55 * 2 * mul, { big: true });
    else if (!best.e.dead) {
      enemies.damage(best.e, 48 * mul, P.pos, 3, { big: true, stun: 1.0 });
      if (perk('echo')) {
        const near = enemies.list.filter(o => o !== best.e && !o.dead && o.hostile && o.pos.distanceTo(best.e.pos) < 10).sort((a, b) => a.pos.distanceTo(best.e.pos) - b.pos.distanceTo(best.e.pos))[0];
        if (near) setTimeout(() => { if (!near.dead) { enemies.damage(near, 30 * mul, P.pos, 3, { big: true, stun: 0.8 }); particles.burst(near.pos.x, near.pos.y + 1, near.pos.z, 20, { color: 0xe0c0ff, speed: 7, size: 0.4, life: 0.5 }); } }, 160);
      }
    }
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
  if (P.riding) { toggleRide(); return; }
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
  if (REGION === 'xilia') {
    const p = xiliaGoal();
    if (p && (F_.tut || 0) < 5 || (p && F_.seedQuest)) return { pos: p.pos, label: p.label, line: p.line };
    return sideTarget() || (p ? { pos: p.pos, label: p.label, line: p.line } : null);
  }
  if (REGION === 'aakalay') {
    if (coreCount() < 5) {
      for (const c of cores) { if (c.got) continue; const d = c.pos.distanceTo(P.pos); if (d < bd) { bd = d; best = c; } }
      if (best) return { pos: best.pos, label: best.site.name, line: `There — one is singing near ${best.site.name}. ${Math.round(bd)} paces, give or take.` };
    } else if (!F_.bossDead) return { pos: V3(world.PLAZA.x, world.PLAZA.y + 6, world.PLAZA.z), label: 'The Oath Stone', line: 'The stone. It’s pulling at the cores — the plaza.' };
    const side = sideTarget(); if (side) return side;
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
  dmg *= FX.armor * (perk('shell') ? 0.9 : 1);
  if (P.ward > 0) {
    const soak = Math.min(P.ward, dmg); P.ward -= soak; dmg -= soak;
    particles.burst(P.pos.x, P.pos.y + 1.2, P.pos.z, 14, { color: 0xbfeaff, speed: 5, size: 0.4, life: 0.4 });
    if (dmg <= 0.5) { P.iframes = 0.3; return false; }
  }
  if (FX.antidote) delete opts.poison;
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
  if (typeof feats !== 'undefined') feats.nodes.forEach(n => { n.ready = true; n.mesh.visible = true; });
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
  if (REGION === 'xilia' && !F_.xtalked) list.push({ pos: F.pos, label: 'Speak with Phorus', act: () => { F_.xtalked = true; persist(); dialog(STORY.XILIA.intro, () => { setObjective(); hint('Follow the ◆ on your compass to the Carpenter’s yard.'); }); } });
  else if (REGION === 'aakalay' && !F_.talked) list.push({ pos: F.pos, label: 'Speak with Phorus', act: () => { F_.talked = true; persist(); dialog(STORY.DIALOG.arrive, () => { setObjective(); hint('Press F and Phorus will feel for the nearest singing core.'); }); } });
  else list.push({ pos: F.pos, label: 'Speak with Phorus', act: () => talkPhorus(), far: 2.6 });
  list.push({ pos: STRYX_SPOT, label: (REGION === 'aakalay' && F_.done) ? 'Set sail for Leotik' : (REGION === 'xilia' && F_.xseed) ? 'Give the Stryx the fire seed' : 'Hail the Stryx pilot', act: () => stryx() });
  for (const l of lanterns) list.push({ pos: V3(l.x, l.y, l.z), label: lanternLit(l) ? 'Rest at the Nur Lantern' : 'Wake the Nur Lantern', act: () => useLantern(l), far: 2.8 });
  for (const s of stones) list.push({ pos: V3(s.x, s.y, s.z), label: 'Read the carving', act: () => readStone(s), far: 2.6 });
  for (const n of npcs) list.push({ pos: n.pos, label: `Talk to ${n.def.name} <small style="opacity:.7">${n.def.title}</small>`, act: () => npcTalk(n), far: 3.2 });
  if (REGION === 'xilia' && SAVE.quests.q_camp === 'done') list.push({ pos: V3(world.hearth.x, world.heightAt(world.hearth.x, world.hearth.z), world.hearth.z), label: 'Cook at the hearth', act: () => openBook('cook'), far: 3 });
  if (REGION === 'xilia' && F_.seedQuest && !F_.xseed) list.push({ pos: world.seedSpot, label: 'Take the fire seed', act: () => takeSeed(), far: 3 });
  if (camp && (REGION === 'leotik' || SAVE.quests.q_camp === 'done')) list.push({ pos: V3(world.camp.x, world.heightAt(world.camp.x, world.camp.z), world.camp.z), label: 'Cook at the fire', act: () => openBook('cook'), far: 2.8 });
  if (board) list.push({ pos: V3(board.x, board.y, board.z), label: 'Read the bounty board', act: () => boardTalk(), far: 3 });
  for (const c of crates) if (c.mesh.visible) list.push({ pos: V3(c.x, c.y, c.z), label: 'Haul up the crate', act: () => takeCrate(c), far: 3 });
  for (const pg of pages) if (pg.mesh.visible) list.push({ pos: V3(pg.x, pg.y, pg.z), label: 'Read the torn page', act: () => readPage(pg), far: 2.8 });
  for (const e of enemies.list) {
    if (e.dead || e.hostile || !e.T.disp || e.T.ai === 'flyer') continue;
    if (e.stray) list.push({ pos: e.pos, label: 'Send the stray Punk home', act: () => befriend(e), far: 3.2 });
    else if (e.pet) list.push({ pos: e.pos, label: 'Pick up Fennek', act: () => befriend(e), far: 2.6 });
    else if (e.pup) list.push({ pos: e.pos, label: 'Pick up the Kipsu pup', act: () => befriend(e), far: 2.4 });
    else if (!e.petted) list.push({ pos: e.pos, label: e.kind === 'kipsu_f' ? 'Pet the Kipsu' : 'Pat the Punk', act: () => petCreature(e), far: 2.6 });
  }
  if (mount) list.push({ pos: mount.pos, label: P.riding ? 'Climb down from Brindle' : 'Ride Brindle', act: () => toggleRide(), far: P.riding ? 99 : 3 });
  for (const c of feats.chests) if (!c.open) list.push({ pos: V3(c.x, c.y, c.z), label: 'Open the chest', act: () => openChest(c), far: 2.6 });
  for (const n of feats.nodes) if (n.ready) list.push({ pos: V3(n.x, n.y, n.z), label: n.label, act: () => gather(n), far: 2.6 });
  for (const t of feats.trials) list.push({ pos: V3(t.x, t.y, t.z), label: t.done ? `${t.name} — passed` : `Begin the ${t.name}`, act: () => startTrial(t), far: 2.8 });
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
  if (REGION === 'aakalay' && F_.talked && phorusQuest()) return;
  const tips = [
    'Zahreh flowers still grow here — the pink ones. They’ll close a wound if you walk through them.',
    'If you’re overwhelmed, let the Tukang build heat — then Q, and burn them all back.',
    'Aim and right-click, and the Duat will carry that axe wherever you’re looking.',
    'Roll with C — you’re hard to hit mid-roll. And drink the film with R before you’re desperate, not after.',
    'Lock on with T if they won’t hold still. Byrds especially.',
    'Rest at the lanterns. I can sing your shards into you there — but resting wakes everything else up too.',
  ];
  let line;
  if (REGION === 'xilia') line = F_.xseed ? 'Back to the docks — the Stryx will want that seed while it’s warm.' : F_.seedQuest ? 'The Ember Grove is north-east. I’ll feel for the seed if you press F.' : (F_.tut || 0) < 5 ? 'Buhkon’s yard is south-east of the square. Go on — I’ll be near the bakery.' : tips[Math.floor(G.t) % tips.length];
  else if (REGION === 'aakalay') line = F_.done ? 'The Punk with a lord in its head. Lovely. The Stryx is waiting when you are.' : coreCount() >= 5 ? 'The plaza, Torcain. The Oath Stone. It’s waiting.' : tips[Math.floor(G.t) % tips.length];
  else line = F_.lordDead ? 'The door is open. I’m not going through it without a proper meal first.' : pillarCount() >= 3 ? 'The keep. The Urverk. Let’s finish it.' : tips[Math.floor(G.t) % tips.length];
  dialog([['phorus', line]]);
}

function stryx() {
  if (REGION === 'aakalay' && F_.done) { setSail(); return; }
  if (REGION === 'xilia') {
    if (F_.xseed) { sailToAakalay(); return; }
    if ((F_.tut || 0) < 5) { dialog(STORY.XILIA.stryxEarly); return; }
    if (!F_.seedQuest) { dialog(STORY.XILIA.stryxSeed, () => { F_.seedQuest = true; persist(); setObjective(); toast('New quest: The Warm Seed', 3); sfx.core(); }); return; }
    dialog(STORY.XILIA.stryxWait); return;
  }
  dialog(REGION === 'leotik' ? [['stryx', 'Kreee. Wet. Stryx does not like wet. Stryx waits anyway.']] : STORY.DIALOG.stryx);
}

function readStone(s) {
  const lines = STORY.STONES[s.key] || ['The carving is too worn to read.'];
  if (!SAVE.codex[s.key]) xp(15);
  SAVE.codex[s.key] = true; persist();
  dialog(lines.map(l => ['stone', l]));
}

function useLantern(l) {
  if (!lanternLit(l)) {
    SAVE.lit[l.id] = true; xp(25);
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
  c.got = true; SAVE.cores[c.key] = true; xp(60);
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
  F_.bossDead = true; xp(500); persist();
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

/* ---------------- Xilia: the Carpenter's drills, and the warm seed ---------------- */
function xiliaGoal() {
  const tut = F_.tut || 0;
  const bk = npcs.find(n => n.def.id === 'buhkon');
  if (!F_.xtalked) return { pos: F.pos, label: 'Phorus', line: '' };
  if (tut === 0 || tut === 4) return bk && { pos: bk.pos, label: 'Buhkon', line: 'Buhkon’s yard — south-east of the square. You know the way better than I do.' };
  if (tut === 1) { const e = enemies.list.find(e => e.kind === 'dummy' && !e.dead); return e ? { pos: e.pos, label: 'Dummies', line: 'The straw ones. Go on, they won’t hit back.' } : null; }
  if (tut === 2) { const e = enemies.list.find(e => e.kind === 'dummy_far' && !e.dead); return e ? { pos: e.pos, label: 'High dummy', line: 'Up on the post. Aim, and right-click.' } : null; }
  if (tut === 3) return { pos: V3(world.tower.x, world.tower.y, world.tower.z), label: 'Tower', line: 'The tower. Up the stair, then jump and hold Space.' };
  if (F_.xseed || !F_.seedQuest) return { pos: STRYX_SPOT, label: 'The Stryx', line: 'The Stryx, at the end of the pier.' };
  const d = Math.round(Math.hypot(world.seedSpot.x - P.pos.x, world.seedSpot.z - P.pos.z));
  return { pos: world.seedSpot, label: 'The fire seed', line: `The seed — it’s warm, I can feel it from here. The Ember Grove, ${d} paces.` };
}
const seedMesh = REGION === 'xilia' && !F_.xseed ? (() => {
  const g = new THREE.Group();
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), toon(0xff7a2a, { emissive: 0xff4a10, emissiveIntensity: 0.9 })); nut.scale.y = 1.25; addOutline(nut, 0.04); g.add(nut);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x6a2c1c)); cap.position.y = 0.22; addOutline(cap, 0.04); g.add(cap);
  g.add(glowSprite(0xff8a3a, 4, 0.8));
  g.position.copy(world.seedSpot); scene.add(g);
  return g;
})() : null;
function tutStep(to) {
  if ((F_.tut || 0) >= to) return;
  const lines = STORY.XILIA.tut[to - 1];
  F_.tut = to; persist();
  const bk = npcs.find(n => n.def.id === 'buhkon');
  if (bk) bk.talking = 4;
  if (to === 2 || to === 3 || to === 4) { sfx.core(); toast(to === 4 ? 'Gliding — learned!' : to === 3 ? 'Duat Strike — learned!' : 'Combos — learned!', 2.5); xp(40); }
  if (to === 1 || to === 5) dialog(lines.map(l => [l[0], l[1]]), () => { setObjective(); if (to === 5) { xp(120); G.shards += 30; toast('Prologue drills complete · +30 shards', 3); persist(); } });
  else { for (const [, l] of lines.slice(0, 1)) bark('buhkon', l, 4); setTimeout(() => { if (lines[1]) bark('buhkon', lines[1][1], 5); }, 4200); setObjective(); }
}
function buhkonTalk(n) {
  const tut = F_.tut || 0;
  npcSpeaker(n.def);
  if (tut === 0) { tutStep(1); return; }
  if (tut === 4) { tutStep(5); return; }
  if (tut < 4) { dialog(STORY.XILIA.tut[tut - 1].map(l => [l[0], l[1]])); return; }
  ask('buhkon', STORY.XILIA.buhkonAfter[Math.floor(Math.random() * STORY.XILIA.buhkonAfter.length)], [
    { label: 'Run the dummy drills again', act: () => { enemies.list.filter(e => e.T.disp === 'training' && e.dead).forEach(e => respawnDummy(e, 0)); toast('Buhkon props the dummies back up.', 2); lockMouse(); } },
    { label: 'Goodbye', act: null },
  ]);
}
function respawnDummy(e, delay) {
  setTimeout(() => {
    const i = enemies.list.indexOf(e); if (i >= 0) enemies.list.splice(i, 1);
    scene.remove(e.actor.root);
    enemies.spawn(e.kind, e.home.x, e.home.z, e.group, { tag: e.tag });
  }, delay);
}
function dummyBroken(e) {
  particles.burst(e.pos.x, e.pos.y + 1, e.pos.z, 26, { color: 0xe8d098, speed: 6, size: 0.45, life: 0.9, gravity: 8 });
  if (G.lock === e) G.lock = null;
  const tut = F_.tut || 0;
  if (e.kind === 'dummy' && tut === 1) {
    SAVE.counters.tut_dummy = (SAVE.counters.tut_dummy || 0) + 1;
    setObjective();
    if (SAVE.counters.tut_dummy >= 3) tutStep(2);
  }
  if (e.kind === 'dummy_far' && tut === 2) tutStep(3);
  respawnDummy(e, 6000);
}
function takeSeed() {
  F_.xseed = true; invAdd(SAVE.inv, 'seed', 1); lootToast('seed', 1);
  if (seedMesh) seedMesh.visible = false;
  particles.burst(world.seedSpot.x, world.seedSpot.y + 0.5, world.seedSpot.z, 40, { color: 0xff8a3a, speed: 6, size: 0.6, life: 1, gravity: 2 });
  sfx.core(); xp(80); persist();
  dialog(STORY.XILIA.seedTaken, () => setObjective());
}
function sailToAakalay() {
  dialog(STORY.XILIA.setSail, () => {
    G.mode = 'trance';
    if (document.pointerLockElement) document.exitPointerLock();
    fade(0.9, 1.5);
    playCards(STORY.XILIA.sailCards, 4200, () => {
      takeAll(SAVE.inv, { seed: 1 }); SAVE.region = 'aakalay'; SAVE.lantern = null; F_.xdone = true; persist(); CLOUD.flush();
      try { sessionStorage.setItem('torcain-boot', 'arriveA'); } catch (e) { /* ignore */ }
      location.reload();
    });
  });
}

/* ---------------- the bestiary ---------------- */
function beastKey(kind) { return kind === 'albali_t' ? 'albali' : kind; }
function studyAt(k) { return STORY.STUDY_AT[k] || STORY.STUDY_DEFAULT; }
function studied(kind) { const k = beastKey(kind); return (SAVE.killsBy[k] || 0) >= studyAt(k); }
function beastName(k) { return (STORY.BEASTS[k] || [TYPES[k] ? TYPES[k].name : k])[0]; }

/* ---------------- bounty boards ---------------- */
STORY.SPEAKERS.board = { name: 'Bounty board', color: '#e8c890', sub: 'notices, nailed up' };
const board = world.board && hasBoard(REGION) ? (() => {
  const y = world.col.ground(world.board.x, world.board.z, world.heightAt(world.board.x, world.board.z) + 0.5);
  const g = new THREE.Group();
  for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 2.6, 6), toon(0x5a3a20)); post.position.set(s * 1.0, 1.3, 0); g.add(post); }
  const plank = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.12), toon(0x9a6a40)); plank.position.y = 1.7; g.add(plank);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.6), toon(0x6a3a20)); roof.position.set(0, 2.55, 0.05); roof.rotation.x = 0.25; g.add(roof);
  [[-0.6, 1.9], [0.15, 1.75], [0.7, 1.95], [-0.2, 1.4], [0.6, 1.4]].forEach(([x, yy], i) => {
    const note = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.5), toon(i % 2 ? 0xf0e0c0 : 0xe8d0a0)); note.position.set(x, yy, 0.07); note.rotation.z = (i - 2) * 0.08; g.add(note);
  });
  const parts = []; g.traverse(m => { if (m.isMesh) parts.push(m); });
  parts.forEach(m => { m.castShadow = true; addOutline(m, 0.03); });
  g.position.set(world.board.x, y, world.board.z);
  g.rotation.y = Math.atan2(world.PLAZA.x - world.board.x, world.PLAZA.z - world.board.z);
  scene.add(g);
  world.col.add(world.board.x, world.board.z, 1.2, 0.2, g.rotation.y, y - 1, y + 2.6);
  return { x: world.board.x, y, z: world.board.z, mesh: g };
})() : null;

function boardTalk() {
  const b = SAVE.bounty;
  if (b) {
    const got = bountyProgress(b, SAVE);
    if (got >= b.n) {
      SAVE.bounty = null; SAVE.bountiesDone++;
      G.shards += b.shards; sfx.core();
      dialog([['board', `Bounty claimed: ${b.n} ${beastName(b.kind)}. Someone has left a pouch of ${b.shards} shards pinned under the notice.`]], () => { xp(b.xp); toast(`Bounty complete · +${b.shards} shards`, 3); persist(); boardTalk(); });
      persist();
      return;
    }
    ask('board', `Your bounty: ${beastName(b.kind)} — ${got} of ${b.n}. Posted by ${b.from}. Reward ${b.shards} shards.`, [
      { label: 'Keep hunting', act: null },
      { label: 'Tear it down <small>(abandon)</small>', act: () => { SAVE.bounty = null; persist(); toast('Bounty abandoned.', 2); lockMouse(); } },
    ]);
    return;
  }
  const list = bountyOffers(REGION, SAVE.bountiesDone);
  ask('board', SAVE.bountiesDone ? `Fresh notices. (${SAVE.bountiesDone} bount${SAVE.bountiesDone === 1 ? 'y' : 'ies'} claimed so far.)` : 'Notices, nailed up in a dozen hands. Pick one — hunt it anywhere — and claim it at any board.', [
    ...list.map(o => ({ label: `Hunt ${o.n} ${beastName(o.kind)} <em style="color:var(--brass2)">· ${o.shards} shards</em> <small>— ${o.from}</small>`, act: () => {
      SAVE.bounty = { ...o, start: SAVE.killsBy[o.kind] || 0 }; persist(); toast(`Bounty taken: ${o.n} ${beastName(o.kind)}`, 3); sfx.core(); lockMouse();
    } })),
    { label: 'Not now', act: null },
  ]);
}

/* ---------------- Bosk's crates, out on the rim ---------------- */
function crateMesh() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.9), toon(0xa8744a)); box.position.y = 0.45; addOutline(box, 0.04); g.add(box);
  for (const y of [0.15, 0.75]) { const band = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.08, 0.94), toon(0x4a3020)); band.position.y = y; g.add(band); }
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 4, 10), toon(0xd8c090)); rope.position.set(0, 0.95, 0); rope.rotation.x = Math.PI / 2; g.add(rope);
  const glow = glowSprite(0xffe0a0, 2.2, 0.35); glow.position.y = 1.4; g.add(glow);
  return g;
}
const crates = (REGION === 'xilia' && world.crates ? world.crates : []).map((c, i) => {
  const y = world.heightAt(c.x, c.z);
  const mesh = crateMesh(); mesh.position.set(c.x, y, c.z); mesh.rotation.y = i * 1.3; scene.add(mesh);
  return { id: 'crate_' + i, x: c.x, y, z: c.z, mesh };
});
function refreshCrates() { for (const c of crates) c.mesh.visible = SAVE.quests.q_crates === 'active' && !SAVE.cleared[c.id]; }
refreshCrates();
function takeCrate(c) {
  SAVE.cleared[c.id] = true; SAVE.counters.crates = (SAVE.counters.crates || 0) + 1;
  c.mesh.visible = false; sfx.core(); xp(30);
  toast(`You haul the crate back from the edge (${SAVE.counters.crates}/3).`, 3);
  persist();
}

/* ---------------- Aakalay: the last journal, and Thornback ---------------- */
function pageMesh() {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), toon(0xf0e4c8, { side: THREE.DoubleSide })); paper.position.y = 0.9; paper.rotation.z = 0.2; g.add(paper);
  const glow = glowSprite(0xb48aff, 2.4, 0.55); glow.position.y = 0.9; g.add(glow);
  return g;
}
const pages = (REGION === 'aakalay' && world.pages ? world.pages : []).map(pg => {
  const y = world.col.ground(pg.x, pg.z, world.heightAt(pg.x, pg.z) + 0.5);
  const mesh = pageMesh(); mesh.position.set(pg.x, y, pg.z); mesh.visible = !SAVE.cleared[pg.id]; scene.add(mesh);
  return { ...pg, y, mesh };
});
function readPage(pg) {
  SAVE.cleared[pg.id] = true; SAVE.counters.pages = (SAVE.counters.pages || 0) + 1;
  pg.mesh.visible = false; xp(40); SAVE.codex[pg.id] = true; persist();
  const n = SAVE.counters.pages;
  dialog((STORY.JOURNAL[pg.id] || []).map(l => ['memory', l]).concat([['phorus', n >= 4 ? 'That’s the last of them. Talk to me, Torcain.' : `That’s ${n} of four. There are more — I can feel them.`]]));
}
const PHORUS_DEF = { id: 'phorus', name: 'Phorus', title: 'Kalo’Eik · Nur' };
function phorusQuest() {
  const fake = { def: PHORUS_DEF, talking: 0 };
  for (const qid of ['q_pages', 'q_thorn']) {
    const st = SAVE.quests[qid];
    if (st === 'active' && questProgress(qid, QUESTS[qid], SAVE, SAVE.inv) >= 1) { turnIn(fake, qid); return true; }
    if (st === 'active') return false;
    if (!st && (qid === 'q_pages' || SAVE.quests.q_pages === 'done')) {
      if (qid === 'q_pages' && !G.seen.offeredPages) { G.seen.offeredPages = true; offerQuest(fake, qid); return true; }
      if (qid === 'q_thorn') { offerQuest(fake, qid); return true; }
      return false;
    }
  }
  return false;
}
/* Phorus also feels for side-quest things once the story leaves him free */
function sideTarget() {
  let best = null, bd = 1e9;
  const consider = (x, y, z, label, what) => { const d = Math.hypot(x - P.pos.x, z - P.pos.z); if (d < bd) { bd = d; best = { pos: V3(x, y + 1, z), label, what }; } };
  for (const c of crates) if (c.mesh.visible) consider(c.x, c.y, c.z, 'A crate', 'one of Bosk’s crates, snagged on the rim');
  if (SAVE.quests.q_pages === 'active') for (const pg of pages) if (pg.mesh.visible) consider(pg.x, pg.y, pg.z, 'A torn page', 'a torn page, still warm with memory');
  if (SAVE.quests.q_thorn === 'active' && world.thornback) consider(world.thornback.x, world.heightAt(world.thornback.x, world.thornback.z), world.thornback.z, 'Thornback', 'the Old Punk. Thornback. It’s huge');
  if (!best) return null;
  return { pos: best.pos, label: best.label, line: `There — ${best.what}. ${Math.round(bd)} paces.` };
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
  SAVE.flags['pillar_' + p.key] = true; xp(90); persist();
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
  F_.lordDead = true; xp(800); persist();
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
    if (P.riding && it.far === 99) continue;
    const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z);
    if (d < (it.far || 3) && d < bd && Math.abs(it.pos.y - P.pos.y) < 4) { bd = d; best = it; }
  }
  if (best) { sfx.ui(); best.act(); }
  else if (P.riding) toggleRide();
}
function nearestPrompt() {
  let best = null, bd = 1e9;
  for (const it of interactables()) {
    if (P.riding && it.far === 99) continue;
    const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z);
    if (d < (it.far || 3) && d < bd && Math.abs(it.pos.y - P.pos.y) < 4) { bd = d; best = it; }
  }
  return best;
}

/* ---------------- objective text ---------------- */
function setObjective() {
  let txt, hintTxt = '', pips = 0, on = 0;
  const X = STORY.OBJECTIVES.xilia, tut = F_.tut || 0;
  if (REGION === 'xilia') {
    if (!F_.xtalked) txt = X.talk;
    else if (tut === 0) txt = X.buhkon;
    else if (tut === 1) { txt = X.dummies(Math.min(3, SAVE.counters.tut_dummy || 0)); hintTxt = 'Left-click to swing — keep clicking to combo'; pips = 3; on = Math.min(3, SAVE.counters.tut_dummy || 0); }
    else if (tut === 2) { txt = X.high; hintTxt = 'Right-click throws the axe through the Duat'; }
    else if (tut === 3) { txt = X.glide; hintTxt = 'Jump, then hold Space while falling'; }
    else if (tut === 4) txt = X.back;
    else if (F_.xseed) txt = X.sail;
    else if (F_.seedQuest) { txt = X.seed; hintTxt = 'F — Phorus senses the seed'; }
    else txt = X.stryx;
  } else if (REGION === 'aakalay') {
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
  $('q-head').textContent = REGION === 'xilia' ? 'Prologue · Xilia' : REGION === 'aakalay' ? 'Rokarvac I · Aakalay' : 'Rokarvac II · Leotik';
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
  if (map[who]) return map[who];
  const lk = NPC_LOOKS[who];
  if (lk) return `radial-gradient(circle at 50% 70%,${lk.skin} 0 32%,transparent 33%),radial-gradient(circle at 50% 42%,${lk.cap} 0 40%,transparent 41%),radial-gradient(circle,#2a2a3a,#0c0c14)`;
  if (who === 'venkin') return 'radial-gradient(circle at 50% 50%,#c8a070 0 26%,transparent 27%),radial-gradient(circle at 50% 46%,#5a3a2a 0 42%,transparent 43%),radial-gradient(circle,#3a2a1a,#100a06)';
  return map.memory;
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
  if (!DLG || DLG.choices) return;
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
  if (REGION === 'xilia') {
    const g = xiliaGoal(); if (g) p = g.pos;
  } else if (REGION === 'aakalay') {
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
  const sub = REGION === 'xilia' ? 'Xilia' : REGION === 'aakalay' ? 'Ruins of Aakalay' : 'Leotik';
  for (const [k, s] of Object.entries(world.SITES)) {
    if (!G.visited[k] && Math.hypot(P.pos.x - s.x, P.pos.z - s.z) < 26) { G.visited[k] = true; showLocation(s.name, sub); if (!SAVE.flags['seen_site_' + k]) { SAVE.flags['seen_site_' + k] = true; xp(30); } }
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
   THE WIDER WORLD — experience, loot, the camp and its folk,
   side quests, friendly creatures, a Punk to ride, gliding,
   spells, chests, gathering and the Kalo Trials
   ================================================================ */
function xp(n) {
  const up = gainXp(SAVE.skills, Math.round(n * (FX.xp || 1)));
  if (up > 0) {
    applyUps(true);
    $('levelup').textContent = `LEVEL ${SAVE.skills.lvl}`;
    $('levelup').classList.add('show'); setTimeout(() => $('levelup').classList.remove('show'), 2600);
    sfx.victory();
    particles.ring(P.pos.x, P.pos.y + 1, P.pos.z, 50, 8, { color: 0xc8a0ff, size: 0.6, life: 0.9 });
    toast(`Level ${SAVE.skills.lvl}! A perk point to spend — press K.`, 3.5);
  }
}
let lootQ = [], lootT = 0;
function lootToast(id, n) { lootQ.push(`${ITEMS[id].icon} ${ITEMS[id].name}${n > 1 ? ' ×' + n : ''}`); lootT = 0.25; }

/* ---------------- the camp and its folk ---------------- */
const camp = world.camp ? buildCamp(scene, world, world.camp.x, world.camp.z, { banner: true, seed: REGION === 'leotik' ? 7 : 3 }) : null;
const npcs = (NPCS[REGION] || []).filter(def => camp || def.pos).map(def => {
  const actor = buildNpc(def);
  const x = def.pos ? def.pos[0] : world.camp.x + def.at[0], z = def.pos ? def.pos[1] : world.camp.z + def.at[1];
  const pos = V3(x, world.col.ground(x, z, world.heightAt(x, z) + 0.5), z);
  actor.root.position.copy(pos);
  const yaw = camp ? Math.atan2(world.camp.x - x, world.camp.z - z) : Math.atan2(world.PLAZA.x - x, world.PLAZA.z - z);
  actor.root.rotation.y = yaw;
  scene.add(actor.root);
  if (!def.wander) world.col.add(x, z, 0.5, 0.5, 0, pos.y - 1, pos.y + 2.4);
  return { def, actor, pos, home: pos.clone(), goal: null, pause: Math.random() * 4, yaw, talking: 0 };
});
const npcName = id => { if (id === 'phorus') return 'Phorus'; const n = Object.values(NPCS).flat().find(d => d.id === id); return n ? n.name : id; };
const npcSpeaker = def => { if (!STORY.SPEAKERS[def.id]) STORY.SPEAKERS[def.id] = { name: def.name, color: def.look === 'keilia' ? '#e0b070' : '#e8d8a8', sub: def.title }; return def.id; };

function updateNpcs(dt) {
  for (const n of npcs) {
    const d = n.pos.distanceTo(P.pos);
    let speed = 0;
    // townsfolk stroll about, and stop to look at you when you come close
    if (n.def.wander && d > 5 && n.talking <= 0) {
      if (!n.goal) {
        n.pause -= dt;
        if (n.pause <= 0) {
          const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 12;
          n.goal = V3(n.home.x + Math.cos(a) * r, 0, n.home.z + Math.sin(a) * r);
        }
      } else {
        const dx = n.goal.x - n.pos.x, dz = n.goal.z - n.pos.z, gd = Math.hypot(dx, dz);
        if (gd < 0.6) { n.goal = null; n.pause = 2 + Math.random() * 5; }
        else {
          const before = n.pos.clone();
          n.pos.x += dx / gd * 1.6 * dt; n.pos.z += dz / gd * 1.6 * dt;
          world.col.resolve(n.pos, 0.45, 1.9);
          n.pos.y = world.col.ground(n.pos.x, n.pos.z, n.pos.y + 0.6);
          if (n.pos.distanceTo(before) < 0.5 * dt) { n.goal = null; n.pause = 1; }
          n.yaw = Math.atan2(dx, dz); speed = 1.6;
        }
      }
      n.actor.root.position.copy(n.pos);
    }
    const want = d < 7 ? Math.atan2(P.pos.x - n.pos.x, P.pos.z - n.pos.z) : n.yaw;
    n.actor.root.rotation.y = dampAngle(n.actor.root.rotation.y, want, 4, dt);
    n.talking = Math.max(0, n.talking - dt);
    n.actor.animate(dt, { speed, onGround: true, t: G.t + n.home.x, talking: n.talking > 0 });
  }
  if (camp) camp.update(G.t, particles);
}

/* ---------------- talking, with choices ---------------- */
function ask(who, text, options) {
  DLG = { lines: [[who, text]], i: 0, chars: text.length, choices: options, onDone: null, tick: 0 };
  G.mode = 'dialog'; P.atk = null;
  $('dialog').classList.remove('hidden');
  showLine(); DLG.chars = text.length;
  const box = $('d-choices'); box.innerHTML = '';
  options.forEach((o, i) => {
    const b = document.createElement('button'); b.innerHTML = `<kbd>${i + 1}</kbd>${o.label}`;
    b.onclick = ev => { ev.stopPropagation(); pickChoice(i); };
    box.appendChild(b);
  });
  $('d-next').style.display = 'none';
  if (document.pointerLockElement) document.exitPointerLock();
}
function pickChoice(i) {
  const o = DLG && DLG.choices && DLG.choices[i];
  if (!o) return;
  $('d-choices').innerHTML = ''; $('d-next').style.display = '';
  DLG = null; $('dialog').classList.add('hidden'); G.mode = 'play';
  sfx.ui();
  if (o.act) o.act(); else lockMouse();
}

function npcTalk(n) {
  const def = n.def, who = npcSpeaker(def);
  n.talking = 3;
  if (def.id === 'buhkon') { buhkonTalk(n); return; }
  const opts = [];
  for (const qid of def.quests) {
    const q = QUESTS[qid], st = SAVE.quests[qid];
    if (!st) opts.push({ label: `Ask about work <em style="color:var(--brass2)">· ${q.name}</em>`, act: () => offerQuest(n, qid) });
    else if (st === 'active') {
      if (questProgress(qid, q, SAVE, SAVE.inv) >= 1) opts.push({ label: `<b style="color:#9affc0">Finish: ${q.name}</b>`, act: () => turnIn(n, qid) });
      else opts.push({ label: `About “${q.name}”`, act: () => { n.talking = 3; dialog(q.wait.map(l => [who, l]), () => npcTalk(n)); } });
    }
  }
  if (def.roles.includes('shop')) opts.push({ label: 'Trade', act: () => openBook('shop') });
  if (def.roles.includes('forge')) {
    const ok = REGION !== 'xilia' || SAVE.quests.q_ore === 'done';
    opts.push({ label: ok ? 'Forge an axe' : 'Forge an axe <small>(his cauldron is cold)</small>', act: () => ok ? openBook('forge') : dialog([[who, 'No ore, no bark, no fire. Ask me about work.']], () => npcTalk(n)) });
  }
  if (def.roles.includes('cook')) {
    const ok = REGION !== 'xilia' || SAVE.quests.q_camp === 'done';
    opts.push({ label: ok ? 'Cook at the hearth' : 'Cook <small>(the hearth isn’t built yet)</small>', act: () => ok ? openBook('cook') : dialog([[who, 'Help me raise the storehouse and I’ll build a hearth worth cooking on.']], () => npcTalk(n)) });
  }
  if (def.roles.includes('stable') && SAVE.flags.mount) opts.push({ label: 'Ask about Brindle', act: () => dialog([[who, 'Whistle (H) and she’ll come. Ride her with E. Don’t let her eat the Zahreh.']], () => npcTalk(n)) });
  opts.push({ label: 'Goodbye', act: null });
  ask(who, def.hello[Math.floor(Math.random() * def.hello.length)], opts);
}

function offerQuest(n, qid) {
  const q = QUESTS[qid], who = npcSpeaker(n.def);
  dialog(q.offer.map(l => [who, l]), () => ask(who, `“${q.name}” — will you help?`, [
    { label: 'I’ll do it.', act: () => {
      SAVE.quests[qid] = 'active';
      if (q.goal.type === 'kills') SAVE.qstart[qid] = SAVE.killsBy[q.goal.kind] || 0;
      persist(); toast(`New quest: ${q.name}`, 3); sfx.core(); lockMouse(); refreshCrates();
    } },
    { label: 'Not now.', act: null },
  ]));
}

function turnIn(n, qid) {
  const q = QUESTS[qid], who = npcSpeaker(n.def);
  if (q.goal.type === 'items' && !takeAll(SAVE.inv, q.goal.need)) return;
  SAVE.quests[qid] = 'done';
  const r = q.reward;
  if (r.shards) G.shards += r.shards;
  if (r.items) for (const [k, c] of Object.entries(r.items)) { invAdd(SAVE.inv, k, c); lootToast(k, c); }
  if (r.flag) SAVE.flags[r.flag] = true;
  if (r.spell) learnSpell(r.spell);
  if (r.points) { SAVE.skills.points += r.points; setTimeout(() => toast(`+${r.points} perk point — press K`, 3), 900); }
  if (r.flag === 'flask_bonus') applyUps(true);
  if (r.flag === 'mount') makeMount(true);
  persist();
  n.talking = 4;
  dialog(q.done.map(l => [who, l]), () => { toast(`Quest complete: ${q.name}${r.shards ? ` · +${r.shards} shards` : ''}`, 3.5); xp(r.xp || 0); persist(); });
}

function learnSpell(id) {
  if (SAVE.skills.spells[id]) return;
  SAVE.skills.spells[id] = true;
  const sp = SPELLS[id];
  setTimeout(() => toast(`Spell learned: ${sp.icon} ${sp.name} — press ${sp.key}`, 4), 600);
  renderSpellBar();
}

/* ---------------- friendly creatures ---------------- */
function befriend(e) {
  const at = e.pos.clone();
  if (e.stray) {
    SAVE.counters.strays = (SAVE.counters.strays || 0) + 1; SAVE.cleared['stray_' + e.stray] = true;
    toast(`The stray trots off home to Ruut (${SAVE.counters.strays}/3).`, 3);
  } else if (e.pet) {
    SAVE.counters.fennek = 1; SAVE.cleared.fennek = true;
    toast('Fennek wriggles into your coat. Take him back to Sefa.', 3);
  } else if (e.pup) {
    SAVE.counters.pups = (SAVE.counters.pups || 0) + 1; SAVE.cleared['pup_' + e.pup] = true;
    toast(`You tuck the pup into your coat, out of the rain (${SAVE.counters.pups}/3).`, 3);
  }
  particles.burst(at.x, at.y + 1, at.z, 24, { color: 0xffb0d0, speed: 4, size: 0.5, life: 0.8, gravity: 3 });
  sfx.heal(); xp(30);
  e.dead = true; e.gone = true; scene.remove(e.actor.root);
  persist();
}
function petCreature(e) {
  e.petted = true;
  particles.burst(e.pos.x, e.pos.y + 1.2, e.pos.z, 16, { color: 0xff8ac8, speed: 3, size: 0.45, life: 0.8, gravity: 2 });
  sfx.heal();
  if (P.hp < P.maxHp) { P.hp = Math.min(P.maxHp, P.hp + 6); }
  if (e.kind === 'kipsu_f' && Math.random() < 0.5) { invAdd(SAVE.inv, 'fluff', 1); lootToast('fluff', 1); }
  bark('phorus', e.kind === 'kipsu_f' ? 'It likes you. They can tell, you know.' : 'Gentle as anything. Ruut’s herd, probably.', 2.5);
}

/* ---------------- Brindle, your Punk ---------------- */
let mount = null;
function makeMount(nearPlayer) {
  if (mount) return;
  const actor = buildPunk(false, { domestic: true, blanket: 0x8a2a3a });
  const p = nearPlayer ? P.pos.clone().add(V3(3, 0, 3)) : camp ? V3(camp.pen.x, 0, camp.pen.z) : world.pen ? V3(world.pen.x + 3, 0, world.pen.z) : P.pos.clone().add(V3(4, 0, 4));
  p.y = world.col.ground(p.x, p.z, world.heightAt(p.x, p.z) + 1);
  actor.root.position.copy(p); scene.add(actor.root);
  mount = { actor, pos: p, vel: V3(), yaw: 0, coming: false };
}
if (SAVE.flags.mount) makeMount(false);
function whistle() {
  if (!mount) { toast('You whistle. Nothing comes. (Old Ruut might lend you a Punk.)', 2.5); return; }
  sfx.blink();
  if (P.riding) return;
  if (mount.pos.distanceTo(P.pos) > 60) { mount.pos.copy(P.pos).add(V3(-6, 0, 6)); mount.pos.y = world.col.ground(mount.pos.x, mount.pos.z, P.pos.y + 3); }
  mount.coming = true; toast('Brindle comes running.', 1.8);
}
function toggleRide() {
  if (!mount) return;
  if (P.riding) {
    P.riding = false;
    P.pos.copy(mount.pos).add(V3(Math.cos(mount.yaw) * 1.8, 0, -Math.sin(mount.yaw) * 1.8));
    P.pos.y = world.col.ground(P.pos.x, P.pos.z, P.pos.y + 3);
  } else {
    P.riding = true; mount.coming = false; P.atk = null;
    sfx.jump();
  }
}
function updateMount(dt) {
  if (!mount) return;
  const m = mount;
  if (P.riding) {
    m.pos.copy(P.pos); m.yaw = P.yaw;
  } else if (m.coming) {
    const dx = P.pos.x - m.pos.x, dz = P.pos.z - m.pos.z, d = Math.hypot(dx, dz);
    if (d < 3) m.coming = false;
    else { m.vel.x = dx / d * 13; m.vel.z = dz / d * 13; m.yaw = Math.atan2(dx, dz); }
  } else { m.vel.x *= 0.85; m.vel.z *= 0.85; }
  if (!P.riding) {
    m.pos.x += m.vel.x * dt; m.pos.z += m.vel.z * dt;
    world.col.resolve(m.pos, 1.0, 2.2);
    m.pos.y = world.col.ground(m.pos.x, m.pos.z, m.pos.y + 1);
  }
  m.actor.root.position.copy(m.pos);
  m.actor.root.rotation.y = m.yaw;
  m.actor.animate(dt, { speed: P.riding ? Math.hypot(P.vel.x, P.vel.z) : Math.hypot(m.vel.x, m.vel.z), t: G.t });
}

/* ---------------- gliding: Torcain's coat spread like wings ---------------- */
const glider = new THREE.Group();
{
  const gm = new THREE.MeshToonMaterial({ color: 0x7a1e26, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(1.2, 0.5, 2.1, 0.1); shape.lineTo(1.6, -0.5); shape.quadraticCurveTo(0.8, -0.3, 0, -0.6); shape.lineTo(0, 0);
    const w = new THREE.Mesh(new THREE.ShapeGeometry(shape), gm); w.scale.x = s; w.rotation.x = -Math.PI / 2 + 0.25; w.position.set(s * 0.3, 1.7, -0.2);
    glider.add(w);
  }
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 4, 10), toon(0xe6b84a)); trim.position.y = 1.7; trim.rotation.x = Math.PI / 2; glider.add(trim);
  glider.visible = false; torcain.root.add(glider);
}

/* ---------------- spells ---------------- */
P.spellCd = {}; P.ward = 0; P.wardT = 0;
const wardSprite = glowSprite(0xbfeaff, 3.4, 0); torcain.root.add(wardSprite); wardSprite.position.y = 1.1;
function castSpell(id) {
  if (!id || !canAct()) return;
  if (!SAVE.skills.spells[id]) { toast('You haven’t learned that spell yet. Quests and trials teach them.', 2); return; }
  if ((P.spellCd[id] || 0) > 0) return;
  const sp = SPELLS[id];
  if (id === 'pull') {
    let tgt = G.lock && G.lock !== 'boss' ? G.lock : null;
    if (!tgt) { const b = bestTarget(26, 0.75); tgt = b && b.e !== 'boss' && !b.e.sigil ? b.e : null; if (b && b.e === 'boss') { damageBoss(40, { big: true }); P.spellCd[id] = sp.cd * cdMul(); sfx.duat(); return; } }
    if (!tgt || tgt.T.miniboss) { toast(tgt ? 'Too big for the Duat to drag.' : 'Nothing to pull.', 1.6); return; }
    particles.burst(tgt.pos.x, tgt.pos.y + 1, tgt.pos.z, 24, { color: 0x9a4aff, speed: 5, size: 0.5, life: 0.5 });
    const f = V3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
    tgt.pos.set(P.pos.x + f.x * 2.4, P.pos.y + 0.3, P.pos.z + f.z * 2.4);
    if (tgt.T.ai === 'flyer') { tgt.state = 'recover'; tgt.timer = 1.6; tgt.alt = 1.2; }
    enemies.damage(tgt, 15, P.pos, 0.5, { stun: 1.4 });
    particles.burst(tgt.pos.x, tgt.pos.y + 1, tgt.pos.z, 24, { color: 0xc08aff, speed: 5, size: 0.5, life: 0.5 });
    sfx.duat();
  } else if (id === 'gust') {
    const f = camForward();
    particles.burst(P.pos.x + f.x * 2, P.pos.y + 1.2, P.pos.z + f.z * 2, 40, { vx: f.x * 18, vy: 1, vz: f.z * 18, color: 0xe8f4ff, size: 0.6, life: 0.5, drag: 1 });
    for (const e of enemies.list) {
      if (e.dead) continue;
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d < 10 && (dx * f.x + dz * f.z) / (d || 1) > 0.45) { enemies.damage(e, 20, P.pos, 18, { stun: 0.7 }); if (e.T.ai === 'flyer') { e.state = 'recover'; e.timer = 1.4; } }
    }
    if (!P.onGround) P.vel.y = Math.max(P.vel.y, 11);
    sfx.swing(); sfx.jump();
  } else if (id === 'quake') {
    particles.ring(P.pos.x, P.pos.y + 0.3, P.pos.z, 70, 14, { color: 0xc8a070, size: 1, life: 0.6 });
    for (const e of enemies.list) {
      if (e.dead || e.T.ai === 'flyer' && e.alt > 3) continue;
      if (e.pos.distanceTo(P.pos) < 8.5) enemies.damage(e, 35, P.pos, 9, { stun: 1.7, big: true });
    }
    if (boss && !boss.dead && Math.hypot(P.pos.x - boss.pos.x, P.pos.z - boss.pos.z) < 12) damageBoss(60, { big: true });
    G.shake = 0.9; sfx.slam();
  } else if (id === 'ward') {
    P.ward = 60; P.wardT = 10; sfx.sense();
    particles.burst(P.pos.x, P.pos.y + 1, P.pos.z, 30, { color: 0xbfeaff, speed: 4, size: 0.5, life: 0.7 });
  }
  P.spellCd[id] = sp.cd * cdMul();
}
function renderSpellBar() {
  $('spells').innerHTML = SPELL_ORDER.map(id => {
    const sp = SPELLS[id], have = SAVE.skills.spells[id];
    return `<div class="ab brass${have ? '' : ' locked'}" id="sp-${id}" title="${sp.name}">${have ? sp.icon : '·'}<span class="key">${sp.key}</span><div class="cd"></div></div>`;
  }).join('');
}

/* ---------------- chests, gathering, trials ---------------- */
const feats = buildFeatures(scene, world, REGION, SAVE);
const sigils = [];
let activeTrial = null;

function openChest(c) {
  c.open = true; SAVE.picked[c.id] = true;
  c.mesh.userData.glow.visible = false;
  let t = 0; const anim = () => { t += 0.05; c.mesh.userData.lid.rotation.x = -1.9 * Math.min(1, t); if (t < 1) requestAnimationFrame(anim); }; anim();
  G.shards += c.shards; dmgNumber(c.x, c.y + 2, c.z, '+' + c.shards, 'shard');
  for (const [k, n] of Object.entries(c.items)) { invAdd(SAVE.inv, k, n); lootToast(k, n); }
  if (c.seed) { SAVE.seeds++; applyUps(true); setTimeout(() => toast('A Hurst seed! Your health and stamina grow.', 3), 700); }
  particles.burst(c.x, c.y + 1, c.z, 40, { color: 0xffd27a, speed: 6, size: 0.5, life: 0.9, gravity: -6 });
  sfx.core(); xp(25); persist();
}
function gather(n) {
  n.ready = false; n.mesh.visible = false;
  const c = perk('forager') ? 2 : 1;
  invAdd(SAVE.inv, n.item, c); lootToast(n.item, c);
  particles.burst(n.x, n.y + 0.8, n.z, 16, { color: n.kind === 'ore' ? 0xb48aff : 0xd8c098, speed: 4, size: 0.4, life: 0.6, gravity: -8 });
  n.kind === 'ore' ? sfx.hit() : sfx.step();
  xp(3);
}

function startTrial(t) {
  if (t.done) { toast(`${t.name} — already passed.`, 2); return; }
  if (activeTrial) return;
  activeTrial = t; t.active = true; t.step = 0;
  sfx.sense(); showLocation(t.name, 'a Kalo Trial');
  if (t.kind === 'chime') {
    t.seq = Array.from({ length: D === DIFFICULTY.realistic ? 6 : 5 }, () => Math.floor(Math.random() * 4));
    t.showT = 0; t.showing = true; t.timer = 999;
    bark('phorus', 'Watch the stones — then strike them in the same order.', 3);
  } else if (t.kind === 'duat') {
    t.timer = D === DIFFICULTY.realistic ? 28 : 40;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2, m = sigilMesh();
      m.position.set(t.x + Math.cos(a) * 9, t.y + 7 + (i % 3) * 2, t.z + Math.sin(a) * 9); scene.add(m);
      sigils.push({ mesh: m, trial: t });
    }
    bark('phorus', 'Only the Duat can reach those. Aim and strike — quickly!', 3);
  } else if (t.kind === 'brazier') {
    t.timer = D === DIFFICULTY.realistic ? 26 : 38;
    t.parts.forEach(p => { p.lit = false; p.flame.material.opacity = 0; });
    bark('phorus', 'Light every brazier before the rune fades! Glide if you have to.', 3);
  }
}
function finishTrial(t, ok) {
  t.active = false; activeTrial = null;
  sigils.filter(s => s.trial === t).forEach(s => scene.remove(s.mesh));
  for (let i = sigils.length - 1; i >= 0; i--) if (sigils[i].trial === t) sigils.splice(i, 1);
  if (!ok) { toast(`${t.name} failed — try again at the altar.`, 3); sfx.hurt(); t.parts.forEach(p => { if (p.flame) p.flame.material.opacity = 0; }); return; }
  t.done = true; SAVE.trials[t.id] = true; t.rune.material.opacity = 0.15;
  const r = t.reward;
  if (r.spell) learnSpell(r.spell);
  if (r.seed) { SAVE.seeds += r.seed; applyUps(true); setTimeout(() => toast('A Hurst seed! Health and stamina grow.', 3), 1200); }
  if (r.shards) G.shards += r.shards;
  if (r.items) for (const [k, n] of Object.entries(r.items)) { invAdd(SAVE.inv, k, n); lootToast(k, n); }
  particles.burst(t.x, t.y + 2, t.z, 80, { color: 0x7ad8ff, speed: 9, size: 0.7, life: 1.2 });
  sfx.victory(); toast(`${t.name} passed!`, 3); xp(r.xp || 150); persist();
}
function trialSwing(range) {
  const t = activeTrial; if (!t || P.atk == null) return false;
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  for (const p of t.parts) {
    const dx = p.x - P.pos.x, dz = p.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > range + 1 || (dx * fx + dz * fz) / (d || 1) < 0.2) continue;
    if (t.kind === 'chime') {
      if (t.showing) return true;
      p.glow = 1; sfx.core();
      if (p.i === t.seq[t.step]) { t.step++; if (t.step >= t.seq.length) finishTrial(t, true); }
      else { finishTrial(t, false); }
      return true;
    }
    if (t.kind === 'brazier' && !p.lit) {
      p.lit = true; p.flame.material.opacity = 1; sfx.flare();
      if (t.parts.every(q => q.lit)) finishTrial(t, true);
      return true;
    }
  }
  return false;
}
function breakSigil(sg) {
  const i = sigils.indexOf(sg); if (i < 0) return;
  sigils.splice(i, 1); scene.remove(sg.mesh);
  particles.burst(sg.mesh.position.x, sg.mesh.position.y, sg.mesh.position.z, 30, { color: 0xc8a0ff, speed: 7, size: 0.5, life: 0.6 });
  sfx.core();
  if (!sigils.some(s => s.trial === sg.trial)) finishTrial(sg.trial, true);
}
function updateTrials(dt) {
  for (const t of feats.trials) {
    t.rune.material.opacity = t.done ? 0.15 : 0.6 + Math.sin(G.t * 3 + t.x) * 0.25;
    if (t.kind === 'chime') t.parts.forEach(p => { p.glow = Math.max(0, p.glow - dt * 2); p.mesh.material.emissiveIntensity = 0.1 + p.glow * 1.5; });
  }
  for (const s of sigils) { s.mesh.rotation.y += dt * 2; s.mesh.position.y += Math.sin(G.t * 2 + s.mesh.position.x) * dt * 0.3; }
  const t = activeTrial; if (!t) return;
  if (t.kind === 'chime' && t.showing) {
    t.showT += dt;
    const idx = Math.floor(t.showT / 0.8);
    if (idx < t.seq.length) { const p = t.parts[t.seq[idx]]; if (t.showT % 0.8 < dt * 1.5) { p.glow = 1; sfx.core(); } }
    else { t.showing = false; t.step = 0; toast('Now — strike them in that order.', 2); }
    return;
  }
  t.timer -= dt;
  if (t.timer <= 0) finishTrial(t, false);
  else if (t.kind !== 'chime' && Math.floor(t.timer) !== Math.floor(t.timer + dt)) toast(`${Math.ceil(t.timer)}s`, 0.9);
  if (Math.hypot(P.pos.x - t.x, P.pos.z - t.z) > 60) finishTrial(t, false);
}

/* ---------------- the book: gear, pack, skills, quests, map, trading ---------------- */
let book = null;
function openBook(tab) {
  if (G.mode !== 'play' && G.mode !== 'dialog') return;
  G.paused = true; G.lock = null;
  if (document.pointerLockElement) document.exitPointerLock();
  book.open(tab);
}
function bookAct(act, arg) {
  const inv = SAVE.inv;
  if (act === 'equip') { inv.axe = arg; restyleAxe(); sfx.ui(); }
  else if (act === 'trinket') { if (inv.trinkets.length >= 2) inv.trinkets.shift(); inv.trinkets.push(arg); sfx.ui(); }
  else if (act === 'untrinket') { inv.trinkets = inv.trinkets.filter(t => t !== arg); }
  else if (act === 'use') {
    const it = ITEMS[arg];
    if (arg === 'k_scroll_pull') { learnSpell('pull'); delete inv.items[arg]; }
    else if (it.kind === 'meal') {
      inv.items[arg]--; if (inv.items[arg] <= 0) delete inv.items[arg];
      if (it.heal) P.hp = Math.min(P.maxHp, P.hp + it.heal);
      if (it.buff) inv.buffs[arg] = SAVE.time + it.dur;
      if (it.buff && it.buff.antidote) P.poison = 0;
      sfx.heal();
    }
  } else if (act === 'buy') {
    const price = Math.max(2, Math.round(ITEMS[arg].value * (REGION === 'leotik' ? 1.4 : REGION === 'xilia' ? 1.0 : 1.2)));
    if (G.shards >= price) { G.shards -= price; invAdd(inv, arg, 1); sfx.core(); }
  } else if (act === 'sell') {
    if (inv.items[arg] > 0) { inv.items[arg]--; if (inv.items[arg] <= 0) delete inv.items[arg]; G.shards += Math.max(1, Math.round(ITEMS[arg].value * 0.5)); sfx.ui(); }
  } else if (act === 'forge') {
    const r = FORGE.find(f => f.out === arg);
    if (r && G.shards >= r.shards && takeAll(inv, r.need)) { G.shards -= r.shards; invAdd(inv, arg, 1); inv.axe = arg; restyleAxe(); sfx.flare(); xp(60); toast(`Forged: ${ITEMS[arg].name}`, 2.5); }
  } else if (act === 'cook') {
    const r = RECIPES.find(f => f.out === arg);
    if (r && takeAll(inv, r.need)) { invAdd(inv, arg, 1); sfx.heal(); xp(8); }
  } else if (act === 'perk') {
    const pk = PERKS.find(q => q.id === arg);
    if (pk && canTake(SAVE.skills, pk)) { SAVE.skills.perks[arg] = true; SAVE.skills.points--; sfx.victory(); }
  }
  applyUps(false); persist();
}
/* the wielded axe's blade takes its colour */
function restyleAxe() {
  const it = ITEMS[SAVE.inv.axe];
  const blade = torcain.weapon.userData.blade;
  if (blade) { blade.material.emissive.setHex(it && it.color ? it.color : 0x6a2cff); blade.material.emissiveIntensity = it && it.color ? 0.55 : 0.25; }
  torcain.weapon.scale.setScalar(1 + ((it && it.dmg) || 1) * 0.1 - 0.1);
}
restyleAxe();

function mapMarkers() {
  const m = [];
  for (const l of lanterns) m.push({ x: l.x, z: l.z, ch: '◉', col: lanternLit(l) ? '#bfeaff' : '#5a6a7a', size: 15, label: lanternLit(l) ? l.name : null, travel: lanternLit(l) ? l.id : null });
  if (camp) m.push({ x: world.camp.x, z: world.camp.z, ch: '⌂', col: '#ffd27a', size: 20, label: 'Camp' });
  if (REGION === 'xilia') {
    m.push({ x: world.PLAZA.x, z: world.PLAZA.z, ch: '⌂', col: '#ffd27a', size: 20, label: 'Xilia' });
    for (const n of npcs) if (!n.def.wander) m.push({ x: n.pos.x, z: n.pos.z, ch: '●', col: '#e8d8a8', size: 11 });
  }
  for (const t of feats.trials) m.push({ x: t.x, z: t.z, ch: '▲', col: t.done ? '#6a7a6a' : '#7ad8ff', size: 15 });
  const o = objectivePoint(); if (o) m.push({ x: o.p.x, z: o.p.z, ch: '◆', col: '#f3cf7a', size: 18 });
  for (const e of enemies.list) if (!e.dead && ((e.stray && SAVE.quests.q_strays === 'active') || (e.pet && SAVE.quests.q_fennek === 'active') || (e.pup && SAVE.quests.q_pups === 'active'))) m.push({ x: e.pos.x, z: e.pos.z, ch: '✦', col: '#ff9ad0', size: 15 });
  for (const c of crates) if (c.mesh.visible) m.push({ x: c.x, z: c.z, ch: '✦', col: '#ff9ad0', size: 15 });
  for (const pg of pages) if (pg.mesh.visible && SAVE.quests.q_pages === 'active') m.push({ x: pg.x, z: pg.z, ch: '✦', col: '#ff9ad0', size: 15 });
  if (board) m.push({ x: board.x, z: board.z, ch: '▤', col: '#e8c890', size: 15, label: 'Bounties' });
  if (SAVE.quests.q_thorn === 'active' && world.thornback) m.push({ x: world.thornback.x, z: world.thornback.z, ch: '☠', col: '#ff7a5a', size: 18, label: 'Thornback' });
  if (lostMark) m.push({ x: lostMark.position.x, z: lostMark.position.z, ch: '✦', col: '#d8b8ff', size: 15, label: 'Lost shards' });
  return m;
}
function travel(id) {
  const l = lanternById(id); if (!l) return;
  if (G.bossActive) { toast('Not in the middle of a fight like this.', 2); return; }
  if (enemies.list.some(e => !e.dead && e.hostile && e.state !== 'idle' && e.state !== 'return' && e.pos.distanceTo(P.pos) < 25)) { toast('You can’t travel with foes on your heels.', 2.5); return; }
  book.close();
  fade(1, 0.4);
  setTimeout(() => {
    P.pos.set(l.x + 1.6, l.y, l.z + 1.6); P.vel.set(0, 0, 0); P.riding = false;
    F.pos.copy(P.pos).add(V3(-2, 0, 2));
    if (mount) { mount.pos.copy(P.pos).add(V3(3, 0, -2)); mount.pos.y = world.col.ground(mount.pos.x, mount.pos.z, P.pos.y + 2); }
    CAM.target.set(P.pos.x, P.pos.y + 1.9, P.pos.z);
    fade(0, 0.8); showLocation(l.name, 'Nur Lantern');
  }, 450);
}
book = createRpgUI({
  save: () => SAVE, shards: () => G.shards, fx: () => FX, player: () => P, perkDmg: () => (perk('heavy') ? 1.15 : 1) * (1 + 0.12 * rank('edge')),
  region: () => REGION, world: () => world, npcName, act: bookAct, mapMarkers, travel,
  mainObjective: () => $('q-text').textContent,
  bounty: () => SAVE.bounty && { ...SAVE.bounty, name: beastName(SAVE.bounty.kind), got: bountyProgress(SAVE.bounty, SAVE) },
  beasts: () => Object.entries(STORY.BEASTS).map(([k, [name, lore]]) => ({ k, name, lore, kills: SAVE.killsBy[k] || 0, seen: !!(SAVE.killsBy[k] || F_['seen_' + k]), at: studyAt(k), studied: studied(k) })),
  onClose: () => { G.paused = false; lockMouse(); },
});
renderSpellBar();

function updateRpgHud() {
  const sk = SAVE.skills;
  $('lvl').textContent = `LV ${sk.lvl}` + (sk.points ? ' ✦' : '');
  $('xp-fill').style.width = Math.min(100, sk.xp / xpForLevel(sk.lvl) * 100) + '%';
  for (const id of SPELL_ORDER) {
    const el = $('sp-' + id); if (!el) continue;
    const cd = P.spellCd[id] || 0;
    el.querySelector('.cd').style.transform = `scaleY(${SAVE.skills.spells[id] ? Math.min(1, cd / (SPELLS[id].cd * cdMul())) : 0})`;
  }
  const act = Object.entries(SAVE.quests).filter(([, s]) => s === 'active').slice(0, 3);
  let html = act.map(([id]) => {
    const q = QUESTS[id], p = questProgress(id, q, SAVE, SAVE.inv);
    return `<div>${p >= 1 ? '✔' : '•'} ${q.name} <b>${p >= 1 ? 'return to ' + npcName(q.giver) : Math.round(p * 100) + '%'}</b></div>`;
  }).join('');
  if (SAVE.bounty) { const b = SAVE.bounty, n = bountyProgress(b, SAVE); html += `<div>${n >= b.n ? '✔' : '▤'} Bounty: ${beastName(b.kind)} <b>${n >= b.n ? 'claim at a board' : n + '/' + b.n}</b></div>`; }
  if ($('qtrack')._h !== html) { $('qtrack')._h = html; $('qtrack').innerHTML = html; }
  if (lootQ.length) { lootT -= 1 / 60; if (lootT <= 0) { toast('+ ' + lootQ.splice(0, 3).join('  ·  '), 2.2); lootT = 0.8; } }
}

/* ================================================================
   UPDATE
   ================================================================ */
function updatePlayer(dt) {
  FX = effects(SAVE.inv, SAVE.time);
  for (const k in P.spellCd) P.spellCd[k] = Math.max(0, P.spellCd[k] - dt);
  if (P.wardT > 0) { P.wardT -= dt; if (P.wardT <= 0) P.ward = 0; }
  wardSprite.material.opacity = P.ward > 0 ? 0.35 + Math.sin(G.t * 6) * 0.1 : 0;
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
  if (P.riding) { speed = (keys.ShiftLeft || keys.ShiftRight) ? 19 : 10; sprint = false; }
  if (P.atk) speed *= P.riding ? 0.7 : 0.25;
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
  if (P.stamDelay <= 0 && !sprint && !P.gliding) P.stam = Math.min(P.stamMax, P.stam + (34 + 5 * rank('breath')) * FX.stamRegen * dt * (P.atk ? 0.3 : 1));

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
  if (P.jumpBuf > 0 && P.coyote > 0 && act && (P.riding || spend(D.stamina.jump))) { P.vel.y = P.riding ? 12 : 10.5; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; sfx.jump(); }
  P.vel.y -= 28 * dt;
  // gliding: hold Space while falling and Torcain's coat catches the wind
  P.airT = P.onGround ? 0 : (P.airT || 0) + dt;
  const glideOk = !!(act && !P.riding && keys.Space && !P.onGround && P.airT > 0.25 && P.vel.y < 0 && (P.stam > 0 || D.stamina.jump === 0 || perk('glider')));
  P.gliding = glideOk;
  glider.visible = glideOk;
  if (glideOk) {
    const fall = FX.glide ? -1.4 : -2.4;
    P.vel.y = Math.max(P.vel.y, fall);
    const gs = perk('glider') ? 15 : 11, gf = camForward();
    P.vel.x = damp(P.vel.x, gf.x * gs + wish.x * 3, 2.5, dt); P.vel.z = damp(P.vel.z, gf.z * gs + wish.z * 3, 2.5, dt);
    P.yaw = dampAngle(P.yaw, Math.atan2(gf.x, gf.z), 6, dt);
    if (D.stamina.jump > 0 && !perk('glider')) { P.stam = Math.max(0, P.stam - 8 * dt); P.stamDelay = 0.4; }
    if (Math.random() < 0.3) particles.emit(P.pos.x, P.pos.y + 1.7, P.pos.z, { vx: -P.vel.x * 0.2, vy: 0.5, vz: -P.vel.z * 0.2, color: 0xffffff, size: 0.2, life: 0.6 });
  }

  const wasGround = P.onGround;
  P.pos.addScaledVector(P.vel, dt);
  world.col.resolve(P.pos, P.riding ? 0.95 : 0.45, P.riding ? 2.6 : 1.9);
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
    if (P.poison > 0 && FX.antidote) P.poison = 0;
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
      invAdd(SAVE.inv, 'petal', 1); lootToast('petal', 1);
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
  if (P.riding) torcain.root.position.y += 1.35;
  torcain.root.rotation.y = P.yaw;
  torcain.animate(dt, { speed: P.roll || P.riding ? 0 : hs, onGround: P.onGround || P.riding, t: G.t, swing: P.atk ? { kind: P.atk.kind, p: clamp(P.atk.p, 0, 1) } : null, heat: P.heat / 100, drink: P.drink > 0 });
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
      F.cd = (D === DIFFICULTY.realistic ? 1.8 : 1.3) * (perk('bond') ? 0.75 : 1); F.cast = 0.35;
      const start = phorus.weapon.getWorldPosition(V3());
      const sp = glowSprite(0x7ad8ff, 1.1, 1); sp.position.copy(start); scene.add(sp);
      const dir = aim.clone().sub(start).normalize();
      projectiles.push({ sprite: sp, pos: start, vel: dir.multiplyScalar(22), dmg: (tgt.isBoss ? 12 : 10) * (perk('bond') ? 1.5 : 1), owner: 'phorus', life: 2.2, target: tgt.isBoss ? { isBoss: true } : tgt });
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
  const tgt = V3(P.pos.x, P.pos.y + (P.riding ? 3.0 : 1.9), P.pos.z);
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
  $('resume').classList.toggle('hidden', locked || G.paused || G.mode !== 'play' || overlayOpen() || !!(DLG && DLG.choices));
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
      updateNpcs(dt);
      updateMount(dt);
      updateTrials(dt);
      updateDialog(dt);
      updateCamera(dt);
      checkLocations();
      if (REGION === 'xilia') {
        if (F_.tut === 3 && P.gliding && P.pos.y - world.heightAt(P.pos.x, P.pos.z) > 2.5) tutStep(4);
        if (seedMesh && seedMesh.visible) { seedMesh.rotation.y = G.t * 1.5; seedMesh.position.y = world.seedSpot.y + 0.3 + Math.sin(G.t * 2) * 0.15; }
      }
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
    if (G.mode !== 'title') { updateHUD(); updateRpgHud(); }
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
    showLocation('Xilia', 'home, for a little while');
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

function arriveAakalay() {
  P.pos.copy(world.pier.start); F.pos.copy(P.pos).add(V3(-2, 0, -3));
  G.mode = 'intro'; introT = 0; G.t = 0; CAM.yaw = 0; P.yaw = Math.PI;
  playCards(STORY.ARRIVE_AAKALAY, 3800, () => {
    enterPlay();
    showLocation('The Ruins of Aakalay', 'the riddle’s first step');
    if (!F_.arrivedA) { F_.arrivedA = true; persist(); }
    hint('Walk to Phorus and press E');
  });
}

function continueRun() {
  P.pos.copy(spawnPoint()); F.pos.copy(P.pos).add(V3(-2, 0, 2));
  CAM.yaw = 0; G.t = 0;
  fade(1, 0); setTimeout(() => fade(0, 1.2), 50);
  enterPlay();
  showLocation(REGION === 'xilia' ? 'Xilia' : REGION === 'aakalay' ? 'The Ruins of Aakalay' : 'Leotik', `${D.label} · ${fmtTime(SAVE.time)}`);
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
  SAVE = ensureSave(freshSave(diff)); D = DIFFICULTY[diff]; F_ = SAVE.flags;
  restWorld(); persist();
  startFromTitle(beginNew);
}

$('t-kicker').textContent = REGION === 'leotik' ? "Torcain's Run · Rokarvac II" : REGION === 'xilia' ? STORY.XILIA.kicker : STORY.TITLE.kicker;
$('t-title').textContent = REGION === 'leotik' ? 'The Isle of the Urverk' : REGION === 'xilia' ? STORY.XILIA.title : STORY.TITLE.title;
$('t-sub').textContent = STORY.TITLE.sub;
$('t-riddle').innerHTML = (REGION === 'leotik' ? STORY.NEXT_RIDDLE : STORY.RIDDLE).join('<br>');
$('loading').textContent = 'THE HIGHLAND IS READY';
$('btn-begin').disabled = false;
$('d-easy-p').textContent = DIFFICULTY.easy.blurb;
$('d-real-p').textContent = DIFFICULTY.realistic.blurb;
if (!SAVE_AT_LOAD && HAD_OLD) $('t-save').textContent = 'Torcain’s Run has a new beginning in Xilia — every earlier run was reset. Begin anew!';
if (SAVE_AT_LOAD) {
  const where = SAVE.region === 'leotik' ? 'Rokarvac II · Leotik' : SAVE.region === 'xilia' ? 'Prologue · Xilia' : 'Rokarvac I · Aakalay';
  $('t-save').textContent = `Saved run: ${where} · ${DIFFICULTY[SAVE.difficulty].label} · ${fmtTime(SAVE.time)} · ${SAVE.deaths} falls`;
  $('btn-continue').style.display = ''; $('btn-continue').disabled = false;
}
function renderAccount() {
  const el = $('t-acct');
  if (WHO) {
    const where = !CLOUD.configured() ? 'saving in this browser only'
      : !CLOUD.state.available ? 'couldn’t reach the Dya Guild — this session saves in this browser only (reload to try again)'
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
  if (REGION === 'xilia' && !F_.xtalked) beginNew();
  else if (REGION === 'aakalay' && !F_.arrivedA && !F_.talked) arriveAakalay();
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
else if (BOOT === 'arriveA' && REGION === 'aakalay') { $('title').classList.add('hidden'); startFromTitle(arriveAakalay); }

/* debugging handle for the console */
window.__torcain = {
  G, P, F, CAM, camera, scene, THREE, enemies, world, cores, SAVE: () => SAVE, persist,
  advance: () => advanceDialog(), closeMemory, pressAttack, duatStrike, tukangFlare, nurSense, interact, dodge, drinkFilm, damageBoss,
  glider, board, crates, pages, boardTalk, talkPhorus, get boss() { return boss; }, startBoss, npcs, feats, book, openBook, castSpell, learnSpell, xp, makeMount, toggleRide, startTrial, npcTalk, pickChoice, takeCore, wakePillar, playerDown, openLantern: () => openLantern(lanterns[0]), closeLantern,
};
