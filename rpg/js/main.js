/* ============================================================
   TORCAIN'S RUN — a single-player action RPG in the Mbaru Tatu.
   Third person: WASD + mouse. Torcain and Phorus follow Noka's
   riddles from Beuhk on Xikia, to the abandoned Ruins of Aakalay,
   and through an Urverk to the wilds of Leotik.
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { paintPass } from './paint.js';
import { clamp, lerp, damp, dampAngle, angleDiff } from './util.js';
import { Particles, glowSprite, mistSprite, toon, addOutline, outlineAll } from './gfx.js';
import { installSmoothStyle } from './smooth.js';
import { installDetailCull, setDetailCull } from './detail.js';
import { latchAlongRay } from './vines.js';
import { createAmbient } from './ambient.js';
import { buildSky, SUN_DIR } from './sky.js';
import { createDayNight } from './daynight.js';
import { buildEldiShip } from './ship.js';
import { buildWorld } from './world.js';
import { buildLeotik } from './leotik.js';
import { buildXilia } from './xilia.js';
import { buildProperty, COLOSSI } from './property.js';
import { createInteriors } from './interiors.js';
import { buildTorcain, buildPhorus, buildCore, placeWalker, cartoon } from './actors.js';
import { buildDomesticPunk, buildWildPunk, buildMalstiPunk, buildSkorThal, buildGynge } from './esik_land.js';
import { buildMeglaAagac } from './esik_sea.js';
import { buildKuniByrd } from './esik_sky.js';
import { createWilds } from './wilds.js';
import { initTouch } from './touch.js';
import { createSunear } from './sunear.js';
import { createVelki, buildAngel, buildSniller } from './velki.js';
import { createRoad } from './road.js';
import { createMegla } from './megla.js';
import { buildCart } from './cart.js';
import { createCine } from './cine.js';
import { ITEMS, LOOT, add as invAddRaw, takeAll, hasAll, freshInventory, effects, RECIPES, FORGE, bindId } from './items.js';
import { freshSkills, gainXp, PERKS, SPELLS, SPELL_ORDER, xpForLevel, canTake } from './skills.js';
import { NPCS, NPC_LOOKS, buildNpc, buildCamp, buildKeilia } from './npcs.js';
import { QUESTS, questProgress } from './quests.js';
import { buildFeatures, sigilMesh } from './features.js';
import { createRpgUI } from './rpgui.js';
import { createEnemies, TYPES } from './enemies.js';
import { hasBoard, offers as bountyOffers, bountyProgress } from './bounties.js';
import * as DYA3 from './dya3d.js';
import * as STORY from './story.js';
import { DIFFICULTY, UPGRADES, upgradeCost, freshSave, loadSave, writeSave, fmtTime, saveKey, newer, MIN_SAVE_V, migrateSave, isOldSave, tickTime, CHAPTERS } from './progress.js';
import * as CLOUD from './cloud.js';
import { initAudio, sfx, setVolume } from './audio.js';

const $ = id => document.getElementById(id);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ---------------- settings ---------------- */
const OPT = { sens: 1, invert: false, vol: 0.7, bloom: true, shadows: true, scale: 1 };
try { Object.assign(OPT, JSON.parse(localStorage.getItem('torcain-opts') || '{}')); } catch (e) { /* private mode */ }
const saveOpts = () => { try { localStorage.setItem('torcain-opts', JSON.stringify(OPT)); } catch (e) { /* ignore */ } };
installDetailCull();    // parts smaller than a pixel are not drawn (they still cost a draw call each)
installSmoothStyle();   // the film look: painted light and brushwork on every toon material, softened shapes — before anything is drawn

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
/* runs from before the Beuhk prologue were reset; remember that there was one, to say so */
const HAD_OLD = isOldSave(KEY) || isOldSave() || !!(cloudSave && cloudSave.v && cloudSave.v < MIN_SAVE_V);
cloudSave = migrateSave(cloudSave);
const SAVE_AT_LOAD = newer(localSave, cloudSave);
let SAVE = SAVE_AT_LOAD || freshSave('easy');
/* older saves grow the newer RPG fields */
function ensureSave(S) {
  S.inv = S.inv || freshInventory(); S.inv.buffs = S.inv.buffs || {}; S.inv.trinkets = S.inv.trinkets || []; S.inv.wear = S.inv.wear || {};
  // runs from before the Ahoac cloak was a thing: anyone past the prologue has it, and is wearing it
  if (S.flags && S.flags.young && S.flags.pro && S.flags.pro !== 'velki' && !S.inv.items.ahoac_cloak) { S.inv.items.ahoac_cloak = 1; S.inv.wear.cloak = S.inv.wear.cloak || 'ahoac_cloak'; }
  // and Torcain, grown, dresses on his own (inv.wearT): his long coat, which is what he glides with
  if (!S.inv.wearT) { S.inv.wearT = { cloak: 'w_coat' }; S.inv.items.w_coat = 1; }
  S.skills = S.skills || freshSkills();
  for (const k of ['quests', 'counters', 'killsBy', 'qstart', 'picked', 'trials', 'flags', 'cleared', 'codex', 'lit', 'ups']) S[k] = S[k] || {};
  if (!S.dya && DYA3.engineReady()) S.dya = DYA3.starterCollection(parseInt(String(S.runId || 'abc').replace(/[^0-9a-z]/g, '').slice(0, 6), 36) || 7);
  S.chTime = S.chTime || {};
  S.seeds = S.seeds || 0; S.amulets = S.amulets || 0; S.bountiesDone = S.bountiesDone || 0; S.bounty = S.bounty || null;
  // Relic triggers you have worked out, and what sits on the quick slots (Q and 1–6)
  S.triggers = S.triggers || {};
  if (S.inv.items.r_firestone) S.triggers.r_firestone = true;                 // the road only ever hands it over once its trigger is found
  if (S.inv.items.r_longevity && (S.flags.yq || 0) >= 2) S.triggers.r_longevity = true;
  if (!S.slots) S.slots = S.flags.young ? {} : { KeyQ: 'tukang', Digit1: 'pull', Digit2: 'gust', Digit3: 'quake', Digit4: 'ward' };
  return S;
}
ensureSave(SAVE);
let BOOT = null;
try { BOOT = sessionStorage.getItem('torcain-boot'); sessionStorage.removeItem('torcain-boot'); } catch (e) { /* ignore */ }
const REGION = SAVE.region || 'xilia';
let D = DIFFICULTY[SAVE.difficulty] || DIFFICULTY.easy;
const persist = () => {
  SAVE.shards = G.shards; if (typeof dn !== 'undefined') SAVE.hour = Math.round(dn.hour * 10) / 10;
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
scene.fog = REGION === 'leotik' ? new THREE.Fog(0x4a5a58, 70, 650) : REGION === 'xilia' ? new THREE.Fog(0xf6c89a, 160, 1200) : REGION === 'property' ? new THREE.Fog(0xc8dcf0, 520, 4600) : new THREE.Fog(0xf2b88e, 140, 1100);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.4, 12000);   // near 0.4, not 0.1: four times the depth precision, so far hills and roofs stop flickering through each other
/* is this point inside the land or anything solid? (the films' cameras keep out of walls with it) */
function camBlocked(x, y, z) {
  if (!interiors.inside && y < world.heightAt(x, z) + 0.25) return true;
  for (const o of world.col.near(x, z)) {
    if (y < o.bot || y > o.top) continue;
    const dx = x - o.x, dz = z - o.z, lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
    if (Math.abs(lx) <= o.hw && Math.abs(lz) <= o.hd) return true;
  }
  return false;
}
const mainCine = createCine(camera, { blocked: (x, y, z) => camBlocked(x, y, z) });   // the moments you only watch, out in the regions themselves

const hemi = REGION === 'leotik' ? new THREE.HemisphereLight(0x9ab8b0, 0x3a4a30, 1.35) : new THREE.HemisphereLight(0xb8d0ff, 0xc0804e, 1.25);
scene.add(hemi);
const sun = new THREE.DirectionalLight(REGION === 'leotik' ? 0xc8d8c0 : 0xffd4a0, REGION === 'leotik' ? 1.6 : 2.7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 260 });
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.06;
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0x9ab8ff, 0.55); rim.position.set(60, 40, -80); scene.add(rim);
const hemiBase = hemi.intensity;

/* the post chain draws into a multisampled target: without it the renderer's own antialiasing is lost,
   and every toon outline and roof edge crawls as the camera moves (fewer samples on a phone) */
function smoothTarget() {
  const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
  return new THREE.WebGLRenderTarget(Math.max(1, sz.x), Math.max(1, sz.y), { type: THREE.HalfFloatType, samples: matchMedia('(pointer: coarse)').matches ? 2 : 4 });
}
const composer = new EffectComposer(renderer, smoothTarget());
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.55, 0.86);
composer.addPass(bloom);
composer.addPass(paintPass(ShaderPass));
composer.addPass(new OutputPass());

let particles = null;
let VK = null, vkComposer = null;   // the Velki prologue's own little world, while it lasts
function resize() {
  const pr = Math.min(devicePixelRatio, 1.75) * OPT.scale;
  renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  particles && particles.setScale(innerHeight * pr * 0.9);
  if (vkComposer) { vkComposer.setPixelRatio(pr); vkComposer.setSize(innerWidth, innerHeight); }
  if (VK) VK.resize();
}

/* ---------------- world ---------------- */
const world = REGION === 'leotik' ? buildLeotik(scene) : REGION === 'xilia' ? buildXilia(scene) : REGION === 'property' ? buildProperty(scene) : buildWorld(scene);
/* houses you can go into: rooms built far off past the horizon, one at a time */
const interiors = createInteriors({
  scene, world, picked: SAVE.picked,
  say: lines => dialog(lines), toast: (t, d) => toast(t, d),
  give: (id, n) => { invAdd(SAVE.inv, id, n); lootToast(id, n); persist(); },
});
interiors.setRenderer(renderer);   // (the windows take their picture of the land outside with it)
interiors.addDoors(world.doors || []);
const sky = buildSky(scene, buildEldiShip, REGION === 'leotik' ? 'storm' : 'golden');
/* day and night: the sun crosses the sky; at night the Esik glow */
const dn = createDayNight({ scene, sky, sun, hemi, rim, renderer, bloom, region: REGION, startHour: SAVE.hour ?? 9 });
particles = new Particles(scene, 3500);
resize();
addEventListener('resize', resize);

const ship = buildEldiShip();
ship.group.position.set(13, world.pier.y - 1.6, world.pier.end - 16);
if (REGION === 'xilia') {
  scene.add(ship.group);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 1.4), toon(0x8a5a36));
  plank.position.set(6.4, world.pier.y + 0.35, world.pier.end - 13); plank.rotation.z = -0.08; plank.castShadow = true;
  scene.add(plank);
}
/* an Urverk: a ring of stygian with a trigger-lit membrane. Aakalay's sleeps under the Oath Stone;
   on Leotik the one you came through has closed behind you. */
function urverkRing(open) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.42, 8, 32), toon(0x2a2236, { emissive: 0x6a3aff, emissiveIntensity: open ? 0.7 : 0.15 }));
  ring.position.y = 3.6; addOutline(ring, 0.05); g.add(ring);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const k = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.6), toon(0x4a4060)); k.position.set(Math.cos(a) * 3.2, 3.6 + Math.sin(a) * 3.2, 0); k.rotation.z = a; g.add(k); }
  const base = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 1.6), toon(0x5a5060)); base.position.y = 0.2; addOutline(base, 0.04); g.add(base);
  const film = new THREE.Mesh(new THREE.CircleGeometry(2.9, 32), new THREE.MeshBasicMaterial({ color: 0xb48aff, transparent: true, opacity: open ? 0.55 : 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  film.position.y = 3.6; g.add(film);
  g.userData.film = film; g.userData.ring = ring;
  return g;
}
const gate = REGION === 'aakalay' ? (() => {
  const g = urverkRing(!!SAVE.flags.bossDead); g.position.set(world.PLAZA.x, world.PLAZA.y - 0.2, world.PLAZA.z - 4); g.visible = !!SAVE.flags.bossDead; scene.add(g); return g;
})() : REGION === 'leotik' ? (() => {
  const z = world.pier.end - 1.5; const g = urverkRing(false); g.position.set(world.pier.start.x, world.col.ground(world.pier.start.x, z, 50) - 0.1, z); scene.add(g); return g;
})() : null;
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
/* a run that began at the last Skyfall stays with young Tanoc in Beuhk (Chapter I) */
const young = () => !!F_.young && (REGION === 'xilia' || REGION === 'property');

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
let FX = effects(SAVE.inv, SAVE.time, wearSet());
function applyUps(full) {
  FX = effects(SAVE.inv, SAVE.time, wearSet());
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
const typing = e => { const t = e.target; return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))); };
addEventListener('keydown', e => {
  if (typing(e)) return;   // typing in the sign-in box isn't playing the game
  if (G.mode !== 'title') initAudio();
  if (e.code === 'Tab') e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  onKey(e.code);
});
let capsDownT = -1e9;
addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'KeyX') rideXUp();
  // a Mac sends Caps Lock's keydown only when it turns on and its keyup only when it turns off: count that keyup as a press too
  if (e.code === 'CapsLock' && performance.now() - capsDownT > 400 && !typing(e) && G.mode === 'play') onKey('CapsLock');
});
addEventListener('keydown', e => { if (e.code === 'CapsLock') capsDownT = performance.now(); }, true);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = false; if (P.vines) dropVines(); });
const canvas = renderer.domElement;
const overlayOpen = () => ['journal', 'pause', 'lantern', 'endcard', 'newgame', 'signin', 'rpg'].some(id => !$(id).classList.contains('hidden'));
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  // Esc only frees the mouse (and leaves full screen); P is the pause. Click the world to take the mouse back.
});
document.addEventListener('mousemove', e => {
  if (SCOPE && locked && !G.paused) { const k = 0.0023 * OPT.sens * SCOPE.fov / 60; SCOPE.yaw -= e.movementX * k; SCOPE.pitch = clamp(SCOPE.pitch - e.movementY * k * (OPT.invert ? -1 : 1), -0.1, 1.55); return; }
  if (!locked || G.paused) return;
  if (G.mode !== 'play' && G.mode !== 'dialog' && G.mode !== 'memory') return;
  const s = 0.0023 * OPT.sens;
  CAM.yaw -= e.movementX * s * (G.lock ? 0.25 : 1);
  CAM.pitch = clamp(CAM.pitch + e.movementY * s * (OPT.invert ? -1 : 1), -0.45, 1.25);
});
document.addEventListener('mousedown', e => {
  if (G.mode !== 'title') initAudio();   // browsers only let sound start after a click
  if (e.target.closest && e.target.closest('#d-choices, #rpg, #pk-box')) return;
  if (G.mode === 'title' || overlayOpen()) return;
  if (G.mode === 'intro' || G.mode === 'trance') { if (!(TOK && !cardState)) skipCards(); return; }
  if (!locked && !touch.on) { if (!G.paused && G.mode !== 'end') lockMouse(); return; }
  if (G.mode === 'dialog') { if (DLG && DLG.choices) pickChoice(DLG.sel); else advanceDialog(); return; }
  if (G.mode === 'memory') { closeMemory(); return; }
  if (G.mode !== 'play' || G.paused) return;
  if (VK) { if (touch.on) return; if (VK.vine && VK.vine(e.button, true)) return; if (e.button === 0 && VK.attack) VK.attack(); return; }   // on her back in a scene of its own: her vines
  if (touch.on) return;   // on a touch screen the buttons do the fighting
  if (dyaMatch) { if (e.button === 0) dyaMatch.throwAt(dyaAimPoint()); return; }
  if (P.climb && (e.button === 0 || e.button === 2)) { climbGrab(e.button === 0 ? 'L' : 'R'); return; }   // on a trunk: hand over hand (vine over vine, on her back)
  if (P.riding && (e.button === 0 || e.button === 2)) { vineShoot(e.button === 0 ? 'L' : 'R'); return; }   // on her back: her vines, not the axe
  if (e.button === 0) { mouseL = true; pressAttack(); }
  if (e.button === 1) { e.preventDefault(); toggleLock(); }
  if (e.button === 2) duatStrike();
});
document.addEventListener('mouseup', e => { if (e.button === 0) mouseL = false; if (VK) { if (VK.vine) VK.vine(e.button, false); return; } if (e.button === 0 || e.button === 2) vineLet(e.button === 0 ? 'L' : 'R'); });
document.addEventListener('contextmenu', e => { if (!typing(e)) e.preventDefault(); });   // keep long-press paste in text fields
addEventListener('wheel', e => { if (SCOPE) { SCOPE.fov = clamp(SCOPE.fov * (e.deltaY > 0 ? 1.15 : 0.87), 4, 40); return; } CAM.wantDist = clamp(CAM.wantDist + Math.sign(e.deltaY) * (dyaMatch ? 2 : 0.8), 3.2, dyaMatch ? 40 : 11); }, { passive: true });
/* the game letting go of the mouse itself (a cutscene, a menu, a choice) is not you pressing Escape:
   remember when we did it, so the pointer-lock change that follows doesn't open the pause menu */
let selfUnlockT = -1e9;
function unlockMouse() { selfUnlockT = performance.now(); if (document.pointerLockElement) document.exitPointerLock(); }
/* is something being shown that you only watch? then losing the mouse is never a reason to pause */
function watching() { return G.mode === 'intro' || G.mode === 'trance' || !!cardState || mainCine.active || document.body.classList.contains('cine-on') || (VK && VK.cinematic === true); }
function lockMouse() { if (touch.on) return; try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
/* phones and tablets: a joystick, a look-drag and on-screen buttons (see touch.js) */
$('spells').addEventListener('pointerdown', e => {   // tap a quick slot to use it
  const el = e.target.closest && e.target.closest('.ab'); if (!el || !touch.on) return;
  const code = el.dataset.slot; if (!code || !SAVE.slots[code]) return;
  e.preventDefault(); e.stopPropagation(); onKey(code);
});
$('prompt').addEventListener('pointerdown', e => { if (!touch.on || G.mode !== 'play' || G.paused) return; e.preventDefault(); e.stopPropagation(); interact(); });
const touch = initTouch({
  keys, onKey: c => onKey(c), wake: () => { if (G.mode !== 'title') initAudio(); },
  attack(down) { if (!down) { mouseL = false; return; } if (G.mode !== 'play' || G.paused) return; if (dyaMatch) { dyaMatch.throwAt(dyaAimPoint()); return; } mouseL = true; pressAttack(); },
  duat() { if (G.mode === 'play' && !G.paused && !dyaMatch) duatStrike(); },
  pause() { if (G.mode === 'play' || G.mode === 'dialog') openPause(); },
  dyaThrow() { if (dyaMatch && G.mode === 'play' && !G.paused) dyaMatch.throwAt(dyaAimPoint()); },
  tap() { if (dyaMatch && G.mode === 'play' && !G.paused) dyaMatch.throwAt(dyaAimPoint()); },
  look(dx, dy) {
    if (G.paused || (G.mode !== 'play' && G.mode !== 'dialog')) return;
    const s = 0.0055 * OPT.sens;
    CAM.yaw -= dx * s * (G.lock ? 0.25 : 1);
    CAM.pitch = clamp(CAM.pitch + dy * s * (OPT.invert ? -1 : 1), -0.45, 1.25);
  },
  playing: () => G.mode === 'play' && !G.paused && !overlayOpen() && !(book && book.isOpen()),
  state: () => ({
    play: G.mode === 'play' && !G.paused && !overlayOpen() && !(book && book.isOpen()),
    dya: !!dyaMatch, flying: !!P.flying, prompt: !$('prompt').classList.contains('hidden'),
    sprengju: !!SAVE.inv.items.sprengju, kuni: !!F_.kuni, mount: !!mount, hlyst: canHlyst(),
  }),
});

function onKey(code) {
  if (G.mode === 'scope') { if (code === 'KeyE' || code === 'Escape' || code === 'Space' || code === 'KeyP') endScope(); return; }
  if (code === 'KeyP') { togglePause(); return; }
  if (TOK && !cardState && G.mode === 'intro') { tokKey(code); return; }   // the token lesson takes its own keys
  if (G.mode === 'intro' || G.mode === 'trance') { if (code === 'Space' || code === 'Enter' || code === 'Escape') skipCards(); return; }
  if (G.mode === 'dialog') {
    if (DLG && DLG.choices) {
      const n = parseInt(code.replace('Digit', ''), 10); if (n >= 1 && n <= DLG.choices.length) { pickChoice(n - 1); return; }
      if (code === 'KeyW' || code === 'ArrowUp') { markChoice(DLG.sel - 1); return; }
      if (code === 'KeyS' || code === 'ArrowDown') { markChoice(DLG.sel + 1); return; }
      if (code === 'Space' || code === 'Enter' || code === 'KeyE') { pickChoice(DLG.sel); return; }
      if (code === 'Escape') pickChoice(DLG.choices.length - 1); return;
    }
    if (code === 'KeyE' || code === 'Space' || code === 'Enter') advanceDialog(); return;
  }
  if (book && book.isOpen()) { if (code === 'Escape' || code === 'KeyI' || code === 'KeyK' || code === 'KeyJ' || code === 'KeyM' || code === 'Tab') book.close(); return; }
  if (G.mode === 'memory') { if (code === 'KeyE' || code === 'Space' || code === 'Enter' || code === 'Escape') closeMemory(); return; }
  if (!$('lantern').classList.contains('hidden')) { if (code === 'Escape' || code === 'KeyE') closeLantern(); return; }
  if (VK) { if (G.mode === 'play' && !G.paused) { if (code === 'Space') VK.jump(); if (code === 'KeyE') VK.interact(); if (SLOT_KEYS.includes(code) && VK.useSlot) VK.useSlot(SAVE.slots[code]); } return; }
  if (code === 'Tab' && G.mode === 'play') { toggleJournal(); return; }
  if (G.mode !== 'play' || G.paused) return;
  if (PLACE && (code === 'KeyE' || code === 'Escape')) { if (code === 'KeyE') confirmStall(); else cancelStall(); return; }
  if (young() && !['Space', 'KeyE', 'KeyC', 'KeyI', 'KeyM', 'KeyK', 'KeyJ', 'KeyG', 'KeyR', 'KeyT', 'KeyH', 'CapsLock', 'KeyZ', ...SLOT_KEYS].includes(code)) return;   // a boy of thirteen, with a hatchet, and whatever Relics he's learned to wake
  if (dyaMatch) {
    if (code === 'KeyV') { dyaOverview = !dyaOverview; return; }
    if (dyaMatch.key(code)) return;
    if (code === 'KeyQ' || code === 'KeyF' || code === 'KeyG' || code === 'KeyT' || code === 'KeyH' || /^Digit/.test(code)) return;
  }
  if (code === 'Space') P.jumpBuf = 0.15;
  if (code === 'KeyE') interact();
  if (code === 'KeyF') nurSense();
  if (code === 'KeyC') dodge();
  if (code === 'KeyR') drinkFilm();
  if (code === 'KeyT') toggleLock();
  if (code === 'KeyI') openBook('gear');
  if (code === 'KeyK') openBook('skills');
  if (code === 'KeyJ') openBook('quests');
  if (code === 'KeyM') openBook('map');
  if (code === 'KeyH') whistle();
  if (code === 'KeyX') { if (P.riding) rideXDown(); else throwSprengju(); }
  if (code === 'KeyB') callKuni();
  if (code === 'CapsLock' || code === 'KeyZ') punkAttack();
  if (code === 'KeyG') nurHlyst();
  if (SLOT_KEYS.includes(code)) useSlot(code);
}

/* ================================================================
   ENEMIES
   ================================================================ */
const enemies = createEnemies({
  scene, world, particles, P, F, G, sfx, night: () => G.night || 0, storm: () => (sunear ? sunear.k : 0),
  get D() { return D; },
  hurtPlayer: (d, from, kb, o) => hurtPlayer(d, from, kb, o),
  dmgNumber: (...a) => dmgNumber(...a),
  studyMul: e => studied(e.kind) ? 1.15 : 1,
  stealShards(n, e) { G.shards -= n; toast(`${e && e.kind === 'malsti' ? 'A Malsti Punk' : 'A Kipsu'} snatched ${n} shards! Catch it before it gets away!`, 3); },
  onEscape(e) {
    if (e.calmed) return;
    if (e.kind === 'rodak') { if (!G.packGone || G.t - G.packGone > 20) { G.packGone = G.t; bark('phorus', 'And the rest of the pack’s gone. Rodak never stay to bury their own.', 3); } return; }
    toast(`${e.kind === 'malsti' ? 'The Malsti Punk' : 'The Kipsu'} escaped with ${e.stolen} shards.`, 3);
  },
  onKill(e) {
    if (e.T.disp === 'training') { dummyBroken(e); return; }
    if (e.tag === 'winter') apRaidKill(e);
    if (e.kind === 'rubbermcfly') { shurgrEdanCalled(e); return; }   // no shards for that. Nothing good comes of it.
    const n = Math.round(e.T.shards * (0.8 + Math.random() * 0.4) * FX.shards) + (e.stolen || 0);
    G.shards += n; SAVE.kills++;
    const bk = beastKey(e.kind);
    SAVE.killsBy[bk] = (SAVE.killsBy[bk] || 0) + 1;
    if (SAVE.killsBy[bk] === studyAt(bk) && STORY.BEASTS[bk]) setTimeout(() => toast(`Studied: ${STORY.BEASTS[bk][0]} — +15% damage against them`, 3.5), 700);
    if (SAVE.bounty && SAVE.bounty.kind === bk && bountyProgress(SAVE.bounty, SAVE) === SAVE.bounty.n) setTimeout(() => toast('Bounty complete — claim it at a bounty board', 3.5), 1400);
    xp(Math.round(e.T.shards * 1.2 + 4));
    for (const [it, ch, cnt] of (LOOT[e.kind] || [])) if (Math.random() < ch) { invAdd(SAVE.inv, it, cnt); lootToast(it, cnt); }
    if (perk('wind') && !P.dead) P.hp = Math.min(P.maxHp, P.hp + (D === DIFFICULTY.realistic ? 4 : 8));
    if (e.T.disp === 'critter') { if (Math.random() < 0.3) bark('phorus', 'Torcain. It was a Kofi Galta. Everything already eats them.', 2.5); }
    else if (e.T.disp && !e.bossMinion) bark('phorus', 'It was only defending itself, Torcain.', 2.5);
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
      malsti: 'Malsti Punks! They’re not fighting you — they just love chaos. And your shards. Catch the thief!',
      kipsu: 'Kipsu! Mind your shards — they’ll pick you clean and run.',
      albali: 'Albali Byrds. Wait for the dive, then hit them while they’re low!',
      vel: 'Duskareth! Watch for knives coming out of the air!',
      tyndael: 'Tyndael — it breathes fire from the air. Don’t stand where it burns.',
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
/* the wider wilds: wildlife, Ju fields, Albali trees, the Kuni Byrd's nest */
const wilds = createWilds({
  scene, world, enemies, region: REGION, particles,
  save: () => SAVE, flags: () => F_, night: () => G.night || 0,
  give: (id, n) => { invAdd(SAVE.inv, id, n); lootToast(id, n); },
  take: id => { SAVE.inv.items[id]--; if (SAVE.inv.items[id] <= 0) delete SAVE.inv.items[id]; },
  toast: (t, d) => toast(t, d), say: lines => dialog(lines), persist: () => persist(),
  kuniNest: n => kuniNest(n),
});

const _sx = V3(), _sy = V3(), _sp = V3();
function snapShadow(p) {
  const texel = (sun.shadow.camera.right - sun.shadow.camera.left) / sun.shadow.mapSize.x;
  _sx.set(0, 1, 0).cross(SUN_DIR).normalize(); _sy.copy(SUN_DIR).cross(_sx).normalize();
  const a = Math.round(p.dot(_sx) / texel) * texel, b = Math.round(p.dot(_sy) / texel) * texel, c = p.dot(SUN_DIR);
  return _sp.copy(_sx).multiplyScalar(a).addScaledVector(_sy, b).addScaledVector(SUN_DIR, c);
}
/* the great ones seen only from far off: the Aerolhorn in the sky, the Nekh'Vorran in the land, the Vyrenalur in the far forest */
const ambient = createAmbient({
  scene, world, region: REGION, particles, sfx,
  seen: () => (SAVE.flags.ambientSeen = SAVE.flags.ambientSeen || {}), persist: () => persist(),
  bark: (w, t, d) => bark(w, t, d), inside: () => !!interiors.inside,
});

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
  duel: { name: 'OTLIÐ', sub: 'Master of the Keep · the Kahizecvar duel', hp: 1500, arena: 24 },
  lord: { name: 'OTLIÐ, WOKEN', sub: 'the Master of the Keep, poured into stygian', hp: 2300, arena: 25 },
};
/* Otlið: a Keilia, tall as a door, with the Oath Stone's light in his scales.
   In the memory he is gold-lit flesh and pinecone wood; on Leotik the Urverk
   has poured his memory into black stygian. */
function buildOtlid(stygian) {
  const k = buildKeilia({ skin: stygian ? 0x2a2436 : 0x6a4a2a, hair: stygian ? 0x1a1424 : 0x3e4a2a, hair2: stygian ? 0x2a1f3a : 0x4f5a30, scale: 1 });
  const s = stygian ? 2.1 : 1.35;
  k.root.scale.multiplyScalar(s);
  const glowCol = stygian ? 0xb070ff : 0xffd060;
  if (stygian) k.root.traverse(o => { if (o.isMesh && o.material && o.material.emissive && o.name !== 'outline') { o.material = o.material.clone(); o.material.emissive.setHex(0x2a0a4a); o.material.emissiveIntensity = 0.6; } });
  // the Oath relic, circling him like a small dark moon
  const relic = new THREE.Group();
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), toon(stygian ? 0x3a2a4a : 0x6a5a48, { emissive: glowCol, emissiveIntensity: 0.35 }));
  relic.add(stone); relic.add(glowSprite(glowCol, 1.6, 0.6));
  k.root.add(relic);
  const halo = glowSprite(glowCol, 6, 0.25); halo.position.y = 1.4; k.root.add(halo);
  return {
    root: k.root, tgtH: 1.4 * s, mats: k.mats,
    animate(dt, st) {
      const t = st.t || 0;
      k.animate(dt, { speed: st.moving ? 1.4 : 0, t, onGround: true, swing: st.slam || st.sweep || 0, attack: st.slam || 0 });
      relic.position.set(Math.cos(t * 1.3) * 1.1, 1.7 + Math.sin(t * 2.1) * 0.15, Math.sin(t * 1.3) * 1.1);
      stone.rotation.y += dt * 2;
      halo.material.opacity = 0.2 + (st.enraged ? 0.2 : 0) + Math.sin(t * 3) * 0.06;
    },
    flash(v) { k.flash && k.flash(v); },
  };
}
/* the Kahizecvar: while the duel lasts, Torcain is Kiet, in golden memory */
const memState = { on: false, fog: null };
function enterMemory() {
  memState.on = true; G.inMemory = true; dn.holdFog = true;   // the memory holds only Kiet and Otlið — today's creatures aren't in it
  memState.fog = { c: scene.fog.color.getHex(), n: scene.fog.near, f: scene.fog.far };
  scene.fog.color.setHex(0xf6d6a0); scene.fog.near = 30; scene.fog.far = 260;
  phorus.root.visible = false;
  document.body.classList.add('in-memory');
}
function exitMemory() {
  if (!memState.on) return;
  memState.on = false; G.inMemory = false; dn.holdFog = false;
  scene.fog.color.setHex(memState.fog.c); scene.fog.near = memState.fog.n; scene.fog.far = memState.fog.f;
  phorus.root.visible = true;
  document.body.classList.remove('in-memory');
}

function startBoss(kind) {
  const def = BOSSDEF[kind], pz = world.PLAZA;
  const actor = buildOtlid(kind === 'lord');
  scene.add(actor.root);
  const hp = Math.round(def.hp * D.bossHp);
  boss = { kind, def, actor, hp, maxHp: hp, t: 0, next: 3, phase: 1, rising: 0, sweep: 0, slam: 0, flash: 0, col: null, dead: false, deadT: 0, summonT: kind === 'duel' ? 1e9 : 12,
    pos: kind === 'duel' ? V3(pz.x, pz.y, pz.z + 9) : V3(pz.x, pz.y, pz.z - 10), saidHalf: false, baseScale: actor.root.scale.x };
  G.bossActive = true; G.arena = def.arena;
  actor.root.position.set(boss.pos.x, pz.y, boss.pos.z);
  actor.root.scale.setScalar(0.01);
  $('boss-name').textContent = def.name; $('boss-sub').textContent = def.sub;
  $('boss').classList.remove('hidden');
  sfx.roar(); G.shake = 1.2;
}

/* falling during a boss on Realistic ends the fight: it must be woken again */
function abortBoss() {
  if (!boss) return;
  scene.remove(boss.actor.root);
  if (boss.col) world.col.remove(boss.col);
  if (boss.kind === 'duel') exitMemory();
  enemies.list.forEach(e => { if (e.bossMinion && !e.dead) { e.dead = true; e.gone = true; scene.remove(e.actor.root); } });
  telegraphs.forEach(t => scene.remove(t.mesh)); telegraphs.length = 0;
  boss = null; G.bossActive = false; G.arena = 0; G.lock = null;
  $('boss').classList.add('hidden');
  setObjective();
}

function bossTargetPoint() {
  if (!boss) return V3();
  return V3(boss.pos.x, boss.actor.root.position.y + (boss.actor.tgtH || 3), boss.pos.z);
}
function bossReach() { return boss.kind === 'duel' ? 2.6 : 3.6; }

function damageBoss(dmg, opts = {}) {
  if (!boss || boss.dead || boss.rising < 1) return;
  dmg *= opts.raw ? 1 : D.playerDmg;
  boss.hp -= dmg; boss.flash = 1;
  const c = bossTargetPoint();
  dmgNumber(c.x + (Math.random() - 0.5) * 3, c.y + 2 + Math.random() * 2, c.z + 2, Math.round(dmg), opts.big ? 'big' : '');
  sfx.hit();
  if (boss.phase === 1 && boss.hp < boss.maxHp * 0.5) {
    boss.phase = 2; sfx.roar(); G.shake = 0.8;
    if (boss.kind === 'duel') bark('memory', STORY.DIALOG.bossHalf[0][1], 3.5); else bark('phorus', STORY.DIALOG2.lordHalf[0][1]);
  }
  if (boss.hp <= 0) {
    boss.hp = 0; boss.dead = true; boss.deadT = 0; sfx.victory(); G.shake = 1.5;
    enemies.list.forEach(e => { if (!e.dead && e.bossMinion) { e.hp = 0; enemies.kill(e); } });
    telegraphs.forEach(tg => scene.remove(tg.mesh)); telegraphs.length = 0;
    projectiles.filter(p => p.owner === 'boss').forEach(p => { p.life = 0; });
    G.shards += Math.round((boss.kind === 'duel' ? 400 : 700) * (D === DIFFICULTY.realistic ? 1.3 : 1));
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
    a.root.scale.setScalar(Math.max(0.01, k * b.baseScale));
    a.root.position.y = pz.y;
    if (Math.random() < 0.9) particles.emit(b.pos.x + (Math.random() - 0.5) * 6, pz.y + 0.5, b.pos.z + (Math.random() - 0.5) * 6, { vy: 3 + Math.random() * 3, color: b.kind === 'duel' ? 0xffd27a : 0x9a7ad8, size: 1.4, life: 1.4, drag: 0.5 });
    G.shake = Math.max(G.shake, 0.3);
    a.animate(dt, { t: G.t });
    return;
  }
  if (b.dead) {
    b.deadT += dt;
    a.root.position.y = pz.y - b.deadT * (b.kind === 'lord' ? 1.2 : 0.3);
    a.root.scale.setScalar(Math.max(0.01, b.baseScale * (1 - b.deadT / 3.6)));
    if (Math.random() < 0.9) particles.emit(b.pos.x + (Math.random() - 0.5) * 8, pz.y + Math.random() * 14, b.pos.z + (Math.random() - 0.5) * 8, { vy: 3, color: 0xd0b0ff, size: 1.6, life: 1.4, speed: 4 });
    if (b.deadT > 3.6) {
      scene.remove(a.root); if (b.col) world.col.remove(b.col);
      const kind = b.kind;
      boss = null; G.bossActive = false; G.arena = 0; $('boss').classList.add('hidden');
      kind === 'duel' ? afterDuel() : afterLord();
    }
    return;
  }
  b.flash = Math.max(0, b.flash - dt * 5); a.flash(b.flash * 0.7);
  if (G.mode !== 'play' || P.dead) { a.animate(dt, { t: G.t }); return; }
  b.sweep = Math.max(0, b.sweep - dt * 2); b.slam = Math.max(0, b.slam - dt * 2);
  const fast = (b.phase === 2 ? 0.72 : 1) * D.windup;
  b.next -= dt; b.summonT -= dt;
  const dP = Math.hypot(P.pos.x - b.pos.x, P.pos.z - b.pos.z);

  {
    // stalk Torcain, keeping a little distance
    const want = b.kind === 'duel' ? 3.2 : 7;
    if (!b.blink) {
      const dx = P.pos.x - b.pos.x, dz = P.pos.z - b.pos.z;
      b.moving = dP > want;
      if (b.moving) { const sp = b.kind === 'duel' ? (b.phase === 2 ? 4.2 : 3.4) : 2.6; b.pos.x += dx / dP * sp * dt; b.pos.z += dz / dP * sp * dt; }
      arenaClamp(b.pos, b.def.arena - 5);
      a.root.position.set(b.pos.x, pz.y, b.pos.z);
      a.root.rotation.y = dampAngle(a.root.rotation.y, Math.atan2(dx, dz), 2, dt);
    } else {
      b.blink.t += dt;
      a.root.scale.setScalar(Math.max(0.01, b.baseScale * (1 - b.blink.t * 3)));
      if (b.blink.t >= b.blink.dur) {
        b.pos.set(b.blink.x, 0, b.blink.z); a.root.position.set(b.pos.x, pz.y, b.pos.z); a.root.scale.setScalar(b.baseScale);
        if (Math.hypot(P.pos.x - b.pos.x, P.pos.z - b.pos.z) < 5.5) hurtPlayer(30 * D.enemyDmg, b.pos, 18);
        particles.ring(b.pos.x, pz.y + 0.5, b.pos.z, 60, 16, { color: 0xc890ff, size: 0.9, life: 0.6 });
        sfx.slam(); G.shake = 0.7; b.blink = null;
      }
    }
  }

  if (b.summonT <= 0) {
    b.summonT = (b.phase === 2 ? 15 : 20) * (D === DIFFICULTY.realistic ? 0.85 : 1.2);
    summonMinions(b.phase === 2 ? 3 : 2, b.phase === 2 ? ['rodak', 'tyndael'] : ['rodak']);
  }
  if (b.next <= 0 && !b.blink) {
    const roll = Math.random();
    if (b.kind === 'duel') {
      // Otlið fights with the Oath Stone's power: a ringing sweep, oath-rings that bind, chains from the ground, sworn light
      if (dP < 6.5 && roll < 0.4) {
        b.next = 2.8 * fast;
        const m = ringMesh(6, 0xffd060); m.position.set(b.pos.x, pz.y + 0.15, b.pos.z);
        telegraphs.push({ mesh: m, x: b.pos.x, z: b.pos.z, r: 6, t: 0, dur: 0.95 * fast + 0.15, dmg: 20, kind: 'sweep' });
        b.sweep = 1;
      } else if (roll < 0.65) {
        b.next = 2.8 * fast;
        const x = P.pos.x, z = P.pos.z;
        const m = ringMesh(3.6, 0xffd060); m.position.set(x, world.col.ground(x, z, P.pos.y + 1) + 0.15, z);
        telegraphs.push({ mesh: m, x, z, r: 3.6, t: 0, dur: 1.4 * fast, dmg: 12, kind: 'oath' });
      } else if (roll < 0.85) { b.next = 3.2 * fast; slamRings(b.phase === 2 ? 5 : 3, 0xffc040, 20); b.slam = 1; }
      else { b.next = 3.0 * fast; bossOrbs(b.phase === 2 ? 6 : 4, b.phase === 2 ? 9 : 7.5); }
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
  a.animate(dt, { t: G.t, sweep: b.sweep, slam: b.slam, enraged: b.phase === 2, moving: b.moving });
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
  if (VK) { if (VK.attack && G.mode === 'play') VK.attack(); return; }
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
  if (young()) { toast('Tanoc can’t reach the Duat. Not yet.', 2); return; }
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
  if (young()) return;
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
  if (P.flying || P.swimming) return;
  if (P.riding) { if (!vineOn()) toggleRide(); return; }   // on a vine, C lets it out instead
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
  if (!phorusWith() && F.pos.distanceTo(P.pos) > 12) { toast('Phorus isn’t with you — he’s waiting back where the story left him.', 2.5); return; }
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

/* ---------------- the X: what it's pointing at ----------------
   The look-ray through the middle of the screen, from level with Torcain (so nothing
   between him and the camera counts) out until it meets a foe, a wall or the ground.
   A foe a hair off the X still counts — more give the further off it is. */
const aimRay = new THREE.Raycaster(), AIM_C = new THREE.Vector2(0, 0);
function lookAim(maxD = 70) {
  aimRay.setFromCamera(AIM_C, camera);
  const o = aimRay.ray.origin, d = aimRay.ray.direction;
  const t0 = Math.max(0, (P.pos.x - o.x) * d.x + (P.pos.y + 1 - o.y) * d.y + (P.pos.z - o.z) * d.z);
  let end = t0 + maxD;
  // walls, houses, boulders
  const a = o.clone().addScaledVector(d, t0), b = o.clone().addScaledVector(d, end);
  const wf = world.col.ray(a, b); if (wf < 1) end = t0 + maxD * wf;
  // the ground: march out, then close in on where the ray goes under
  let lo = t0, hit = false;
  for (let t = t0; t <= end; t += 0.8) {
    const x = o.x + d.x * t, z = o.z + d.z * t;
    if (o.y + d.y * t < world.heightAt(x, z)) { hit = true; end = t; break; }
    lo = t;
  }
  if (hit) for (let k = 0; k < 6; k++) { const m = (lo + end) / 2, x = o.x + d.x * m, z = o.z + d.z * m; if (o.y + d.y * m < world.heightAt(x, z)) end = m; else lo = m; }
  // foes: the nearest one the ray passes through (or close enough to)
  let foe = null;
  for (const c of targetCandidates()) {
    const vx = c.p.x - o.x, vy = c.p.y - o.y, vz = c.p.z - o.z, t = vx * d.x + vy * d.y + vz * d.z;
    if (t < t0 - 1 || t > end + 1) continue;
    const r = c.e === 'boss' ? 3 : c.e.sigil ? 1.2 : (c.e.T.rad || 0.6) + 0.5;
    const off = Math.hypot(vx - d.x * t, vy - d.y * t, vz - d.z * t);
    if (off < r + t * 0.035 && (!foe || t < foe.t)) foe = { c, t };
  }
  if (foe) return { p: foe.c.p.clone(), foe: foe.c.e };
  return { p: o.clone().addScaledVector(d, end), foe: null, ground: hit || wf < 1 };
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
    : young() ? 'Buhkon finds you, and carries you back.' : 'Phorus drags you back to the lantern.';
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
  wilds.respawn();
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
  list.push(...interiors.interactables(P, { enter: d => enterRoom(d), exit: () => leaveRoom(), scope: d => startScope(d) }));
  if (interiors.inside) return list;   // inside, only the room's own things
  if (young()) { if (relicOut() && RELIC_SPOT) list.push({ pos: RELIC_SPOT, label: 'Pick up the glinting stone', act: () => youngTakeRelic(), far: 2.6 }); list.push(...apInteractables()); }
  else if (REGION === 'xilia' && !F_.xtalked) list.push({ pos: F.pos, label: 'Speak with Phorus', act: () => { F_.xtalked = true; persist(); dialog(STORY.XILIA.intro, () => { setObjective(); hint('Follow the ◆ on your compass to the Carpenter’s yard.'); }); } });
  else if (REGION === 'aakalay' && !F_.talked) list.push({ pos: F.pos, label: 'Speak with Phorus', act: () => { F_.talked = true; persist(); dialog(STORY.DIALOG.arrive, () => { setObjective(); hint('Press F and Phorus will feel for the nearest singing core.'); }); } });
  else list.push({ pos: F.pos, label: 'Speak with Phorus', act: () => talkPhorus(), far: 2.6 });
  if (young() && REGION === 'xilia') list.push({ pos: STRYX_SPOT, label: 'Hail the Stryx pilot', act: () => dialog(STORY.YOUNG.stryx) });
  else if (REGION === 'xilia') list.push({ pos: STRYX_SPOT, label: F_.xseed ? 'Give the Stryx the fire seed' : 'Hail the Stryx pilot', act: () => stryx() });
  if (REGION === 'aakalay' && F_.done && gate) list.push({ pos: V3(gate.position.x, gate.position.y, gate.position.z), label: 'Speak Kiet’s trigger at the Urverk', act: () => setSail(), far: 6 });
  if (REGION === 'leotik' && gate) list.push({ pos: V3(gate.position.x, gate.position.y, gate.position.z), label: 'Touch the closed Urverk', act: () => dialog([['phorus', 'Shut tight. Whatever trigger opens it from this side, Kiet never needed it. We’re stranded until the keep says otherwise.']]), far: 5 });
  for (const l of lanterns) list.push({ pos: V3(l.x, l.y, l.z), label: lanternLit(l) ? 'Rest at the Nur Lantern' : canWakeLantern() ? 'Wake the Nur Lantern' : 'A cold Nur Lantern', act: () => useLantern(l), far: 2.8 });
  for (const s of stones) list.push({ pos: V3(s.x, s.y, s.z), label: 'Read the carving', act: () => readStone(s), far: 2.6 });
  for (const n of npcs) if (!n.hidden) list.push({ pos: n.pos, label: `Talk to ${n.def.name} <small style="opacity:.7">${n.def.title}</small>`, act: () => npcTalk(n), far: 3.2 });
  if (REGION === 'xilia' && SAVE.quests.q_camp === 'done') list.push({ pos: V3(world.hearth.x, world.heightAt(world.hearth.x, world.hearth.z), world.hearth.z), label: 'Cook at the hearth', act: () => openBook('cook'), far: 3 });
  if (REGION === 'xilia' && F_.seedQuest && !F_.xseed) list.push({ pos: world.seedSpot, label: 'Take the fire seed', act: () => takeSeed(), far: 3 });
  if (camp && (REGION === 'leotik' || SAVE.quests.q_camp === 'done')) list.push({ pos: V3(world.camp.x, world.heightAt(world.camp.x, world.camp.z), world.camp.z), label: 'Cook at the fire', act: () => openBook('cook'), far: 2.8 });
  for (const a of amulets) if (!a.got) list.push({ pos: V3(a.x, a.y, a.z), label: 'Pry loose the Sniller amulet', act: () => takeAmulet(a), far: 2.4 });
  if (storehouse) { /* scenery only */ }
  if (board) list.push({ pos: V3(board.x, board.y, board.z), label: 'Read the bounty board', act: () => boardTalk(), far: 3 });
  for (const c of crates) if (c.mesh.visible) list.push({ pos: V3(c.x, c.y, c.z), label: 'Haul up the crate', act: () => takeCrate(c), far: 3 });
  for (const pg of pages) if (pg.mesh.visible) list.push({ pos: V3(pg.x, pg.y, pg.z), label: 'Read the torn page', act: () => readPage(pg), far: 2.8 });
  if (SAVE.quests.q_thorn === 'active') for (const sc of scars) if (sc.revealed && !SAVE.cleared[sc.id]) list.push({ pos: V3(sc.x, sc.y + 1, sc.z), label: 'Read the rind-scar', act: () => readScar(sc), far: 3 });
  if (skor && SAVE.quests.q_skorthal === 'active' && !SAVE.counters.skorthal) list.push({ pos: skor.pos, label: 'Sit with Skor’Thal', act: () => sitWithSkor(), far: 7 });
  for (const e of enemies.list) {
    if (e.dead || e.hostile || !e.T.disp || e.T.ai === 'flyer' || e.T.disp === 'critter') continue;
    if (e.stray) list.push({ pos: e.pos, label: 'Send the stray Punk home', act: () => befriend(e), far: 3.2 });
    else if (e.pet) list.push({ pos: e.pos, label: 'Pick up Fennek', act: () => befriend(e), far: 2.6 });
    else if (e.pup) list.push({ pos: e.pos, label: 'Pick up the Kipsu pup', act: () => befriend(e), far: 2.4 });
    else if (!e.petted) list.push({ pos: e.pos, label: e.kind === 'kipsu_f' ? 'Pet the Kipsu' : 'Pat the Punk', act: () => petCreature(e), far: 2.6 });
  }
  list.push(...wilds.interactables(P));
  if (mount && (saddled() || !P.riding)) list.push({ pos: mount.pos, label: P.riding ? `Climb down from ${PN()}` : saddled() ? `Ride ${PN()}` : `Scratch ${PN()} behind the vines`, act: () => saddled() ? toggleRide() : (sfx.heal(), bark('punk', '…', 1.5)), far: P.riding ? 99 : 3 });
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
    'Zahreh flowers grow wild all over — the pink ones. They’ll close a wound if you walk through them.',
    'Press G and push your Nur’Hlyst out — hidden things answer. Chests, ore, Sniller amulets.',
    'If you’re overwhelmed, let the Tukang build heat — then Q, and burn them all back.',
    'Aim and right-click, and the Duat will carry that axe wherever you’re looking.',
    'Roll with C — you’re hard to hit mid-roll. And drink the film with R before you’re desperate, not after.',
    'Lock on with T if they won’t hold still. Byrds especially.',
    'Rest at the lanterns. I can sing your shards into you there — but resting wakes everything else up too.',
  ];
  let line;
  if (REGION === 'xilia') line = F_.xdone ? 'The Megla Pass — west, Eldi-ward, over the ridge — goes back to the Reach. Three days of mist. I’ll complain the whole way.' : F_.xseed ? 'Back to the docks — the Stryx will want that seed while it’s warm.' : F_.seedQuest ? 'The Ember Grove is north-east. I’ll feel for the seed if you press F.' : (F_.tut || 0) < 5 ? 'Buhkon’s hill is out west of town, up the little road. Go on — I’ll be near the bakery.' : tips[Math.floor(G.t) % tips.length];
  else if (REGION === 'aakalay') line = F_.done ? 'The Punk with a lord in its head. Lovely. The Urverk is in the plaza, under where the stone was — whenever you’re ready.' : coreCount() >= 5 ? 'The plaza, Torcain. The Oath Stone. It’s waiting.' : tips[Math.floor(G.t) % tips.length];
  else line = F_.lordDead ? 'The door is open. I’m not going through it without a proper meal first.' : pillarCount() >= 3 ? 'The keep. The Urverk. Let’s finish it.' : tips[Math.floor(G.t) % tips.length];
  dialog([['phorus', line]]);
}

function stryx() {
  if (REGION === 'aakalay' && F_.done) { setSail(); return; }
  if (REGION !== 'xilia') return;
  if (REGION === 'xilia') {
    if (F_.xdone) { dialog([['stryx', 'The seed went to the Reach with you, and I don’t fly without one. Take the Megla Pass — Eldi-ward, over the ridge.']]); return; }
    if (F_.xseed) { sailToAakalay(); return; }
    if ((F_.tut || 0) < 5) { dialog(STORY.XILIA.stryxEarly); return; }
    if (!F_.seedQuest) { dialog(STORY.XILIA.stryxSeed, () => { F_.seedQuest = true; persist(); setObjective(); toast('New quest: The Warm Seed', 3); sfx.core(); }); return; }
    dialog(STORY.XILIA.stryxWait); return;
  }
  dialog(STORY.DIALOG.stryx);
}

function readStone(s) {
  if (apReadStone(s)) return;
  const lines = STORY.STONES[s.key] || ['The carving is too worn to read.'];
  if (!SAVE.codex[s.key]) xp(15);
  SAVE.codex[s.key] = true; persist();
  dialog(lines.map(l => ['stone', l]));
}

/* a Nur Lantern only wakes for someone carrying Nur: a Nur at your side (Phorus), or a Relic with a Hurst in it */
function canWakeLantern() {
  if (phorusWith()) return true;
  return Object.keys(SAVE.inv.items).some(k => k.startsWith('r_') && SAVE.inv.items[k] > 0) || !!F_.ring;
}
function useLantern(l) {
  if (!lanternLit(l) && !canWakeLantern()) {
    sfx.ui();
    bark(young() ? 'tale' : 'phorus', young() ? 'The lantern is cold. You cup your hands round it and nothing happens. It wants Nur — a Nur beside you, or a Relic with something alive in it.' : 'It won’t wake for us like this.', 4.5);
    return;
  }
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
  unlockMouse();
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
      dialog(STORY.DIALOG.tranceIn, () => {
        G.mode = 'trance';
        fade(0.85, 1.2);
        $('fade').style.background = 'radial-gradient(circle, #f6d6a0, #3a2a10)';
        playCards(STORY.DIALOG.tranceCards, 4200, () => {
          enterMemory();
          P.pos.set(world.PLAZA.x, world.PLAZA.y, world.PLAZA.z + 20); P.vel.set(0, 0, 0); P.yaw = Math.PI; CAM.yaw = 0;
          G.mode = 'play'; fade(0, 1.6);
          setTimeout(() => { $('fade').style.background = '#000'; }, 1800);
          lockMouse();
          startBoss('duel');
          setTimeout(() => dialog(STORY.DIALOG.bossRise, () => setObjective()), 2400);
        });
      });
    }, 2200);
  });
}

function afterDuel() {
  F_.bossDead = true; xp(500); persist();
  dialog(STORY.DIALOG.bossDown, () => trance());
}

function trance() {
  G.mode = 'trance';
  const cards = $('cards'); cards.classList.add('trance');
  fade(0.85, 1.5);
  $('fade').style.background = 'radial-gradient(circle, #3a1a6a, #0a0418)';
  playCards(STORY.TRANCE, 4600, () => {
    cards.classList.remove('trance');
    exitMemory();
    world.oath.group.position.y = world.PLAZA.y - 12;
    world.col.list.filter(c => Math.abs(c.x - world.PLAZA.x) < 0.1 && Math.abs(c.z - world.PLAZA.z) < 0.1 && c.top > world.PLAZA.y + 5).forEach(c => world.col.remove(c));
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

/* ---------------- Beuhk: the Carpenter's drills, and the warm seed ---------------- */
function xiliaGoal() {
  const tut = F_.tut || 0;
  const bk = npcs.find(n => n.def.id === 'buhkon');
  if (!F_.xtalked && REGION === 'xilia') return { pos: F.pos, label: 'Phorus', line: 'I’m right here, Torcain. Talk to me first — E.' };
  if (REGION === 'xilia' && tut < 5) return { pos: world.westGoal, label: 'The forest path', line: 'Buhkon’s place — west along the little road, over the bridge, and along the forest path.' };
  if (REGION === 'property' && tut >= 5) return { pos: world.exits[0] ? V3(world.exits[0].x, 0, world.exits[0].z) : world.pathStart, label: 'Back to Beuhk', line: 'Back to Beuhk — east, along the forest path.' };
  if (tut === 0 || tut === 4) return bk && { pos: bk.pos, label: 'Buhkon', line: 'Buhkon’s hill — west of town, up the little road. You know the way better than I do.' };
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
    { label: SAVE.inv.items.okid ? 'Sing a token' : 'Ask about tokens <em style="color:var(--brass2)">· Dya’Akara</em>', act: () => buhkonTokens() },
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
  if (e.kind === 'dummy' && young() && F_.yq === 2) {
    SAVE.counters.y_dummy = (SAVE.counters.y_dummy || 0) + 1;
    setObjective();
    if (SAVE.counters.y_dummy >= 3) { youngSet(3); sfx.core(); toast('Combos — learned!', 2.5); xp(40); dialog(STORY.YOUNG.dummies, () => setObjective()); }
  }
  if (e.kind === 'dummy' && tut === 1 && !young()) {
    SAVE.counters.tut_dummy = (SAVE.counters.tut_dummy || 0) + 1;
    setObjective();
    if (SAVE.counters.tut_dummy >= 3) tutStep(2);
  }
  if (e.kind === 'dummy_far' && tut === 2) tutStep(3);
  respawnDummy(e, 6000);
}
function takeSeed() {
  F_.xseed = true; invAdd(SAVE.inv, 'k_seed', 1); lootToast('k_seed', 1);
  if (seedMesh) seedMesh.visible = false;
  particles.burst(world.seedSpot.x, world.seedSpot.y + 0.5, world.seedSpot.z, 40, { color: 0xff8a3a, speed: 6, size: 0.6, life: 1, gravity: 2 });
  sfx.core(); xp(80); persist();
  dialog(STORY.XILIA.seedTaken, () => setObjective());
}
function sailToAakalay() {
  dialog(STORY.XILIA.setSail, () => {
    G.mode = 'trance';
    fade(0.9, 1.5);
    playCards(STORY.XILIA.sailCards, 4200, () => {
      delete SAVE.inv.items.k_seed; SAVE.region = 'aakalay'; SAVE.lantern = null; F_.xdone = true; persist(); CLOUD.flush();
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

/* ---------------- Aakalay: the last journal, and Skor'Thal ---------------- */
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
/* the Megla Aagac: the one dark tree that grew where Otlið fell — scenery, not a foe */
if (REGION === 'aakalay') {
  const pz = world.PLAZA, mx = pz.x + 21, mz = pz.z - 21, my = world.heightAt(mx, mz);
  const megla = buildMeglaAagac({ seed: 31 }); megla.root.scale.setScalar(0.7); megla.root.position.set(mx, my - 0.2, mz); megla.root.rotation.y = 2.2; scene.add(megla.root);
  world.col.add(mx, mz, 1.3, 1.3, 0, my - 1, my + 14);
  let mt = 0; G.meglaTick = dt => { mt += dt; megla.animate(dt, { speed: 0, t: mt }); if (megla.glow) megla.glow(G.night || 0); };
}
/* Skor'Thal: scarred trees that only answer Nur'Hlyst, then the den in the far north wood */
function scarTree() {
  const g = new THREE.Group();
  const bark = toon(0x4a3a2a), rub = toon(0xd8c8a0, { emissive: 0x6af08a, emissiveIntensity: 0.15 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 5, 9), bark); trunk.position.y = 2.5; g.add(trunk);
  for (let i = 0; i < 3; i++) {   // three long gouges where the rind rubbed through the bark
    const gash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.08), rub);
    gash.position.set(-0.18 + i * 0.18, 1.6 + i * 0.12, 0.6 - Math.abs(i - 1) * 0.04); gash.rotation.z = 0.25; g.add(gash);
  }
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 0), toon(0x3d5a2a)); crown.position.y = 5.6; g.add(crown);
  outlineAll(g);
  return g;
}
const scars = (REGION === 'aakalay' && world.scars ? world.scars : []).map(sc => {
  const y = world.heightAt(sc.x, sc.z);
  const mesh = scarTree(); mesh.position.set(sc.x, y, sc.z); mesh.rotation.y = Math.atan2(world.skorthal.x - sc.x, world.skorthal.z - sc.z); scene.add(mesh);
  return { ...sc, y, mesh, revealed: false };
});
function readScar(sc) {
  SAVE.cleared[sc.id] = true; SAVE.counters.scars = (SAVE.counters.scars || 0) + 1; xp(50); persist();
  const n = SAVE.counters.scars;
  particles.burst(sc.x, sc.y + 1.8, sc.z, 16, { color: 0x9af0a0, speed: 2, size: 0.3, life: 0.8, gravity: 0 });
  dialog([['phorus', n >= 3 ? 'That’s three. Every one of them leans north. Come back to me, Torcain — I know where it sleeps.' : `Rind-scar, higher than my head. It leans north. That’s ${n} of three.`]]);
}
let skor = null;
if (REGION === 'aakalay' && world.skorthal) {
  const sx = world.skorthal.x, sz = world.skorthal.z, y = world.heightAt(sx, sz);
  const m = cartoon(buildSkorThal({ seed: 4711 })); m.root.position.set(sx, y, sz); m.root.rotation.y = Math.PI * 0.85; scene.add(m.root);
  skor = { m, pos: V3(sx, y, sz), t: 0 };
}
const skorShown = () => SAVE.quests.q_thorn === 'done' || SAVE.quests.q_skorthal;
function skorTick(dt) {
  if (!skor) return;
  skor.m.root.visible = !!skorShown();
  if (!skor.m.root.visible) return;
  skor.t += dt;
  skor.m.animate(dt, { speed: 0, t: skor.t * 0.4, windup: 0, attack: 0, swing: 0, onGround: true });
  if (skor.m.glow) skor.m.glow(G.night || 0);
}
function denGuards() { return enemies.list.filter(e => !e.dead && e.tag === 'skorden' && Math.hypot(e.pos.x - skor.pos.x, e.pos.z - skor.pos.z) < 40).length; }
function sitWithSkor() {
  const left = denGuards();
  if (left) { dialog([['phorus', `Not with ${left} Rodak circling. They’ll spook it — and they’ll go for your throat the moment you sit.`]]); return; }
  dialog(STORY.SKORTHAL.sit, () => {
    SAVE.counters.skorthal = 1; invAdd(SAVE.inv, 'skor_rind', 1); lootToast('skor_rind', 1); xp(100); persist();
    particles.burst(skor.pos.x, skor.pos.y + 3, skor.pos.z, 40, { color: 0x9af0a0, speed: 3, size: 0.45, life: 1.4, gravity: -0.2 });
    hint(SAVE.inv.items.okid ? 'Sing Skor’Thal’s rind in the Okid’Relic for a legendary token. Then tell Phorus.' : 'Skor’Thal’s rind could be sung into a token, if you had an Okid’Relic. Tell Phorus.');
  });
}
const PHORUS_DEF = { id: 'phorus', name: 'Phorus', title: 'Kalo’Eik · Nur' };
function phorusQuest() {
  const fake = { def: PHORUS_DEF, talking: 0 };
  for (const qid of ['q_pages', 'q_thorn', 'q_skorthal']) {
    const st = SAVE.quests[qid];
    if (st === 'active' && questProgress(qid, QUESTS[qid], SAVE, SAVE.inv) >= 1) { turnIn(fake, qid); return true; }
    if (st === 'active') return false;
    if (!st && (qid === 'q_pages' || SAVE.quests.q_pages === 'done')) {
      if (qid === 'q_pages' && !G.seen.offeredPages) { G.seen.offeredPages = true; offerQuest(fake, qid); return true; }
      if (qid === 'q_thorn') { offerQuest(fake, qid); return true; }
      if (qid === 'q_skorthal' && SAVE.quests.q_thorn === 'done') { offerQuest(fake, qid); return true; }
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
  for (const e of enemies.list) {
    if (e.dead) continue;
    if (e.stray && SAVE.quests.q_strays === 'active') consider(e.pos.x, e.pos.y, e.pos.z, 'A stray', 'one of Ruut’s strays, with its saddle-blanket on');
    if (e.pet && SAVE.quests.q_fennek === 'active') consider(e.pos.x, e.pos.y, e.pos.z, 'Fennek', 'Fennek — I can feel a very pleased little Kipsu');
    if (e.pup && SAVE.quests.q_pups === 'active') consider(e.pos.x, e.pos.y, e.pos.z, 'A pup', 'a Kipsu pup, crying in the rain');
  }
  for (const a of amulets) if (!a.got && a.revealed) consider(a.x, a.y, a.z, 'A Sniller amulet', 'a Sniller amulet, cold as a winter well');
  if (SAVE.quests.q_thorn === 'active') for (const sc of scars) if (sc.revealed && !SAVE.cleared[sc.id]) consider(sc.x, sc.y, sc.z, 'A scarred tree', 'a scarred tree — Skor’Thal’s rind did that');
  if (SAVE.quests.q_skorthal === 'active' && skor && !SAVE.counters.skorthal) consider(skor.pos.x, skor.pos.y, skor.pos.z, 'Skor’Thal', 'Skor’Thal. It’s asleep. It’s enormous');
  if (!best) return null;
  return { pos: best.pos, label: best.label, line: `There — ${best.what}. ${Math.round(bd)} paces.` };
}

/* ---------------- Nur'Hlyst: Buhkon's golden pulse ---------------- */
const hlyst = { cd: 0, marks: [], t: 0 };
const canHlyst = () => young() ? !!F_.yHlyst : (REGION !== 'xilia' && REGION !== 'property') || (F_.tut || 0) >= 5;
function nurHlyst() {
  if (!canHlyst()) { toast('You don’t know how yet. (Buhkon will teach you.)', 2); return; }
  if (hlyst.cd > 0 || G.mode !== 'play') return;
  if (apHollowPulse()) return;
  const range = 55 * (FX.hlyst ? 1.6 : 1);
  hlyst.cd = 6; hlyst.t = 12;
  for (const m of hlyst.marks) scene.remove(m); hlyst.marks.length = 0;
  particles.ring(P.pos.x, P.pos.y + 0.6, P.pos.z, 90, 30, { color: 0xffd27a, size: 0.7, life: 1.3, drag: 0.2 });
  sfx.sense();
  const found = { amulet: 0, chest: 0, node: 0, other: 0, scar: 0 };
  const mark = (x, y, z, col, kind) => {
    if (Math.hypot(x - P.pos.x, z - P.pos.z) > range) return;
    const sp = glowSprite(col, 2.6, 0.95); sp.position.set(x, y + 1.6, z); scene.add(sp); hlyst.marks.push(sp); found[kind]++;
  };
  for (const a of amulets) if (!a.got) { mark(a.x, a.y, a.z, 0x6af0e0, 'amulet'); if (Math.hypot(a.x - P.pos.x, a.z - P.pos.z) <= range) a.revealed = true; }
  for (const c of feats.chests) if (!c.open) mark(c.x, c.y, c.z, 0xffd27a, 'chest');
  for (const n of feats.nodes) if (n.ready) mark(n.x, n.y, n.z, 0xf3cf7a, 'node');
  for (const c of crates) if (c.mesh.visible) mark(c.x, c.y, c.z, 0xff9ad0, 'other');
  for (const pg of pages) if (pg.mesh.visible) mark(pg.x, pg.y, pg.z, 0xb48aff, 'other');
  if (SAVE.quests.q_thorn === 'active') for (const sc of scars) if (!SAVE.cleared[sc.id] && Math.hypot(sc.x - P.pos.x, sc.z - P.pos.z) <= range) { mark(sc.x, sc.y + 0.4, sc.z, 0x9af0a0, 'scar'); sc.revealed = true; }
  if (seedMesh && seedMesh.visible) mark(world.seedSpot.x, world.seedSpot.y, world.seedSpot.z, 0xff8a3a, 'other');
  const bits = [];
  if (found.amulet) bits.push(`${found.amulet} Sniller amulet${found.amulet > 1 ? 's' : ''}`);
  if (found.chest) bits.push(`${found.chest} chest${found.chest > 1 ? 's' : ''}`);
  if (found.scar) bits.push(`${found.scar} scarred tree${found.scar > 1 ? 's' : ''}`);
  if (found.node) bits.push(`${found.node} thing${found.node > 1 ? 's' : ''} to gather`);
  toast(bits.length ? 'Nur’Hlyst — the world answers: ' + bits.join(' · ') : 'Nur’Hlyst — nothing hidden answers here.', 3);
  for (const m of hlyst.marks) m.material.opacity = 0;
}
function hlystTick(dt) {
  hlyst.cd = Math.max(0, hlyst.cd - dt);
  if (hlyst.t <= 0) return;
  hlyst.t -= dt;
  const k = hlyst.t > 10 ? (12 - hlyst.t) / 2 : Math.min(1, hlyst.t / 3);
  for (const m of hlyst.marks) { m.material.opacity = 0.9 * k * (0.75 + Math.sin(G.t * 4 + m.position.x) * 0.25); }
  if (hlyst.t <= 0) { for (const m of hlyst.marks) scene.remove(m); hlyst.marks.length = 0; }
}

/* ---------------- Sniller amulets ---------------- */
const AMULET_TOTAL = 21;
const AMULET_TIERS = [
  { n: 5, text: 'The amulets hum together and point you at a cache: a Sniller’s eye trinket.', items: { t_sniller: 1 } },
  { n: 10, text: 'Ten amulets. Something in your Hurst learns from their humming. (+1 perk point)', points: 1 },
  { n: 15, text: 'Fifteen. They lead you to a buried Hurst seed. (+max health and stamina)', seed: 1 },
  { n: 21, text: 'Every amulet. Together they sing one note — the location of an old memory vault. (+2 perk points, +400 shards)', points: 2, shards: 400 },
];
function amuletSpots() {
  let seed = REGION === 'xilia' ? 991 : REGION === 'aakalay' ? 1771 : 2203;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const anchors = Object.values(world.SITES).map(s => [s.x, s.z]).concat(lanterns.map(l => [l.x, l.z]));
  const out = [];
  // one always waits somewhere high: the top of the Carpenter's glide tower
  if (world.tower) out.push({ id: `${REGION}_amulet_0`, x: world.tower.x + 0.8, y: world.col.ground(world.tower.x + 0.8, world.tower.z, 99) + 0.9, z: world.tower.z });
  for (let tries = 0; out.length < 7 && tries < 400; tries++) {
    const [ax, az] = anchors[(out.length * 3 + tries) % anchors.length];
    const a = rnd() * Math.PI * 2, r = 6 + rnd() * 18, x = ax + Math.cos(a) * r, z = az + Math.sin(a) * r;
    if (Math.hypot(x, z) > (world.homeRadius ? world.homeRadius(x, z) : world.edgeRadius(x, z)) - 10) continue;
    if (world.hazards.some(h => Math.hypot(x - h.x, z - h.z) < h.r + 2)) continue;
    if (out.some(o => Math.hypot(o.x - x, o.z - z) < 25)) continue;
    const gy = world.heightAt(x, z);
    let y = world.col.ground(x, z, gy + 6);           // perched on a roof or a wall top if there is one
    if (y - gy > 5.5) y = gy;
    out.push({ id: `${REGION}_amulet_${out.length}`, x, y: y + 0.9, z });
  }
  return out;
}
function amuletMesh() {
  const g = new THREE.Group();
  const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), toon(0x6af0e0, { emissive: 0x2aa0a0, emissiveIntensity: 0.8 })); addOutline(gem, 0.03); g.add(gem);
  for (const s of [-1, 1]) { const horn = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 5, 10, Math.PI * 0.8), toon(0x9aa8b0)); horn.position.x = s * 0.3; horn.rotation.z = s > 0 ? -0.6 : Math.PI + 0.6; g.add(horn); }
  const glow = glowSprite(0x6af0e0, 1.3, 0.3); g.add(glow);
  return g;
}
const amulets = amuletSpots().map(a => {
  const got = !!SAVE.cleared[a.id];
  const mesh = amuletMesh(); mesh.position.set(a.x, a.y, a.z); mesh.visible = !got; scene.add(mesh);
  return { ...a, mesh, got, revealed: false };
});
function takeAmulet(a) {
  a.got = true; a.mesh.visible = false; SAVE.cleared[a.id] = true;
  SAVE.amulets = (SAVE.amulets || 0) + 1;
  particles.burst(a.x, a.y, a.z, 24, { color: 0x6af0e0, speed: 4, size: 0.4, life: 0.8, gravity: 2 });
  sfx.core(); xp(25);
  const tier = AMULET_TIERS.find(t => t.n === SAVE.amulets);
  toast(`Sniller amulet (${SAVE.amulets}/${AMULET_TOTAL})`, 2.5);
  apTookAmulet();
  if (tier) {
    if (tier.items) for (const [k, c] of Object.entries(tier.items)) { invAdd(SAVE.inv, k, c); lootToast(k, c); }
    if (tier.points) SAVE.skills.points += tier.points;
    if (tier.seed) { SAVE.seeds++; applyUps(false); }
    if (tier.shards) G.shards += tier.shards;
    setTimeout(() => dialog([['phorus', tier.text]]), 600);
  }
  persist();
}

/* the bestiary notes anything you've had a good look at */
let beastT = 0;
function beastScan(dt) {
  beastT -= dt; if (beastT > 0) return; beastT = 1;
  for (const e of enemies.list) {
    if (e.dead || e.T.disp === 'training') continue;
    const k = beastKey(e.kind);
    if (!SAVE.codex['beast_' + k] && e.pos.distanceTo(P.pos) < 16) SAVE.codex['beast_' + k] = true;
  }
}

/* Venkin's storehouse goes up when the quest is done */
const storehouse = REGION === 'xilia' ? (() => {
  const x = world.PLAZA.x + 22, z = world.PLAZA.z + 16, y = world.col.ground(x, z, world.heightAt(x, z) + 0.5);
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 4.4), toon(0xc8a070)); walls.position.y = 1.6; g.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.2, 4), toon(0x7a4a2a)); roof.position.y = 4.3; roof.rotation.y = Math.PI / 4; roof.scale.z = 0.75; g.add(roof);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), toon(0x4a2a18)); door.position.set(0, 1.1, 2.21); g.add(door);
  for (let i = 0; i < 3; i++) { const sack = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), toon(0xd8c090)); sack.scale.y = 1.2; sack.position.set(-2.4 + i * 0.6, 0.5, 2.7); g.add(sack); }
  const parts = []; g.traverse(m => { if (m.isMesh) parts.push(m); }); parts.forEach(m => { m.castShadow = true; addOutline(m, 0.04); });
  g.position.set(x, y, z); g.rotation.y = Math.atan2(world.PLAZA.x - x, world.PLAZA.z - z);
  g.visible = SAVE.quests.q_camp === 'done';
  scene.add(g);
  if (g.visible) world.col.add(x, z, 3, 2.2, g.rotation.y, y - 1, y + 3.2);
  return g;
})() : null;

/* ================================================================
   DYA'AKARA — the token game, played on the ground
   ================================================================ */
let dyaMatch = null, dyaOverview = false, dyaRival = null;
const dyaCam = V3();
const SPN = id => (window.DYA && DYA.species.get(id) || {}).name || id;
function dyaRecord(id) { const r = SAVE.dya && SAVE.dya.record[REGION + ':' + id]; return r ? `${r.w}–${r.l}` : 'never played'; }
function dyaAimPoint() {
  if (!dyaMatch) return null;
  const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  // the field lies on the real ground: find where the look-ray meets it
  const plane = new THREE.Plane(V3(0, 1, 0), -dyaMatch.o.planeY), hit = V3();
  if (!ray.ray.intersectPlane(plane, hit)) return null;
  for (let k = 0; k < 4; k++) { plane.constant = -dyaGround(hit.x, hit.z); if (!ray.ray.intersectPlane(plane, hit)) return null; }
  hit.y = dyaGround(hit.x, hit.z);
  return hit;
}
/* the surface a token stands on: the ground, or the top of the water */
function dyaGround(x, z) {
  const g = world.heightAt(x, z);
  return dyaWet(x, z) ? Math.max(g, world.water.level) : g;
}
const dyaWet = (x, z) => !!world.water && (world.water.depth ? world.water.depth(x, z) > 0.4 : !!(world.water.isWater && world.water.isWater(x, z)));
function dyaArena() {
  if (REGION === 'xilia') return { x: world.PLAZA.x, z: world.PLAZA.z, y: world.PLAZA.y, name: 'the market square' };
  if (REGION === 'leotik' && world.camp) return { x: world.camp.x, z: world.camp.z - 30, y: world.heightAt(world.camp.x, world.camp.z - 30), name: 'the camp green' };
  return null;
}
function dyaChallenge(n) {
  const R = DYA3.RIVALS[REGION][n.def.id], who = npcSpeaker(n.def);
  if (!SAVE.dya || !SAVE.dya.pouch.length) { dialog([[who, 'You don’t have any tokens? Come back when you do.']]); return; }
  ask(who, R.intro, [
    { label: 'A full match <small>— resources, pulses, steal their Relic</small>', act: () => dyaScale(n, 'standard') },
    { label: 'A duel <small>— one token each, last one standing</small>', act: () => dyaScale(n, 'duel') },
    { label: 'Not now', act: null },
  ]);
}
function dyaScale(n, mode) {
  const who = npcSpeaker(n.def), ar = dyaArena();
  const near = ar && Math.hypot(P.pos.x - ar.x, P.pos.z - ar.z) < 45;
  ask(who, `What scale? ${near ? `We’ll play on ${ar.name}.` : 'We’ll play right here.'}`, DYA3.SCALES.map(sc => ({
    label: `${sc.name} <small>— ${sc.desc}</small>`,
    act: () => mode === 'duel' ? dyaPickDuel(n, sc) : startDya(n, 'standard', sc),
  })).concat([{ label: 'Never mind', act: null }]));
}
function dyaPickDuel(n, sc) {
  const toks = SAVE.dya.pouch.map(id => SAVE.dya.tokens[id]).filter(Boolean).slice(0, 8);
  ask('torcain', 'Which token do I throw?', toks.map(t => ({ label: `${t.name} <small>— ${SPN(t.speciesId)}, ${DYA.species.SIZES[t.sizeIdx]}, ${DYA.species.RARITIES[t.rarity]}</small>`, act: () => startDya(n, 'duel', sc, t.id) })).concat([{ label: 'Never mind', act: null }]));
}
function startDya(n, mode, sc, duelTok) {
  const R = DYA3.RIVALS[REGION][n.def.id];
  const m = sc.m, ar = dyaArena();
  const near = ar && Math.hypot(P.pos.x - ar.x, P.pos.z - ar.z) < 45;
  let origin, yaw, planeY;
  if (near) {
    const d = V3(ar.x - P.pos.x, 0, ar.z - P.pos.z); if (d.lengthSq() < 1) d.set(0, 0, -1); d.normalize();
    yaw = Math.atan2(d.x, d.z); origin = V3(ar.x, 0, ar.z); planeY = ar.y + 0.05;
    P.pos.copy(origin).addScaledVector(d, -(560 * m + 3)); P.pos.y = world.col.ground(P.pos.x, P.pos.z, planeY + 3);
  } else {
    const f = camForward(); yaw = Math.atan2(f.x, f.z);
    origin = P.pos.clone().addScaledVector(f, 560 * m + 3); planeY = P.pos.y + 0.05;
  }
  let myPouch = SAVE.dya.pouch.map(id => SAVE.dya.tokens[id]).filter(Boolean);
  if (duelTok) myPouch = [SAVE.dya.tokens[duelTok]];
  const rivalPouch = DYA3.rivalPouch(REGION, n.def.id);
  dyaRival = { n, home: n.pos.clone(), yaw: n.actor.root.rotation.y };
  const fwd = V3(Math.sin(yaw), 0, Math.cos(yaw));
  const spot = origin.clone().addScaledVector(fwd, 560 * m + 4);
  spot.y = world.col.ground(spot.x, spot.z, planeY + 3);
  n.pos.copy(spot); n.actor.root.position.copy(spot); n.actor.root.rotation.y = yaw + Math.PI;
  G.truce = true; G.lock = null; document.body.classList.add('dya-on');
  CAM.yaw = Math.atan2(-fwd.x, -fwd.z); CAM.wantDist = clamp(6 + 160 * m, 6, 22); CAM.pitch = 0.42;
  dyaOverview = false;
  dyaMatch = new DYA3.DyaMatch3D({
    scene, particles, sfx, toast, bark: msg => bark('phorus', msg, 3),
    handPos: () => V3(P.pos.x, P.pos.y + 1.5, P.pos.z).addScaledVector(camForward(), 0.5),
    onEnd: (result, mm) => endDya(result, mm, n, R, mode),
  }, { mode, scale: sc, origin, yaw, planeY, myName: young() ? 'Tanoc' : 'Torcain', myPouch,
    world: { ground: dyaGround, colliders: world.col.list, isWater: world.water ? dyaWet : null }, rival: { name: R.name, skill: R.skill, pouch: rivalPouch, actorPos: () => V3(n.pos.x, n.pos.y + 1.6, n.pos.z) }, terrain: REGION === 'leotik' ? 'forest' : 'plains' });
  lockMouse();
  if (!SAVE.flags.dya_hint) { SAVE.flags.dya_hint = true; setTimeout(() => bark('phorus', mode === 'duel' ? 'Duels throw themselves — just watch. Your token can’t touch anyone real.' : 'Q and E to choose, R to ready it with resources, 1–5 to pick it up, then click to throw. Pulses bring resources. Steal their Relic!', 7), 800); }
}
function endDya(result, mm, n, R, mode) {
  if (dyaMatch !== mm) return;
  mm.dispose(); dyaMatch = null; dyaOverview = false;
  G.truce = false; document.body.classList.remove('dya-on');
  if (dyaRival) { n.pos.copy(dyaRival.home); n.actor.root.position.copy(dyaRival.home); n.actor.root.rotation.y = dyaRival.yaw; dyaRival = null; }
  const who = npcSpeaker(n.def), d = SAVE.dya, key = REGION + ':' + n.def.id;
  d.record[key] = d.record[key] || { w: 0, l: 0 }; d.played++;
  const won = result && result.winner === 0, draw = !result || result.winner < 0;
  const lines = [];
  if (won) {
    d.wins++; d.record[key].w++;
    const shards = Math.round(25 + 70 * R.skill) * (mode === 'duel' ? 1 : 2);
    G.shards += shards; xp(mode === 'duel' ? 60 : 140);
    lines.push([who, result.how === 'relic' ? 'You carried my Relic home. …Again! Fine. FINE.' : 'Well played. I’ll get you next time.']);
    toast(`Dya’Akara — victory · +${shards} shards`, 3.5);
    if (Math.random() < (mode === 'duel' ? 0.35 : 0.6)) {
      const sp = R.species[Math.floor(Math.random() * R.species.length)];
      const tok = DYA3.addToken(d, DYA3.mintToken(sp, (Math.random() * 1e9) >>> 0), d.pouch.length < 25);
      lines.push([who, `Here — a ${SPN(sp)} token. ${DYA.species.SIZES[tok.sizeIdx] === 'Litk' ? 'A little one, but it’s yours.' : 'Don’t make me regret it.'}`]);
      setTimeout(() => toast(`New token: ${tok.name} (${DYA.species.SIZES[tok.sizeIdx]} · ${DYA.species.RARITIES[tok.rarity]})`, 3.5), 300);
    }
  } else if (draw) { lines.push([who, 'A draw? Nobody wins a draw. Again sometime.']); xp(40); }
  else { d.losses++; d.record[key].l++; xp(30); lines.push([who, result.how === 'concede' ? 'Giving up already? Ha!' : 'Ha! Your Relic’s mine. Better luck next pulse.']); }
  persist();
  dialog(lines);
}
function dyaBookData() {
  if (!SAVE.dya || !window.DYA) return null;
  const d = SAVE.dya, SP = DYA.species, TK = DYA.token;
  const toks = Object.values(d.tokens).sort((a, b) => (d.pouch.includes(b.id) - d.pouch.includes(a.id)) || (b.rarity - a.rarity));
  return {
    record: `${d.wins} won · ${d.losses} lost`, pouch: d.pouch, okid: !!SAVE.inv.items.okid, singCost: DYA3.SING_COST.shards,
    ecol: DYA3.ELEMENT_COL,
    tokens: toks.map(t => ({ id: t.id, name: t.name, species: SPN(t.speciesId), size: SP.SIZES[t.sizeIdx], rarity: SP.RARITIES[t.rarity], element: t.element, hp: t.stats.hp, dmg: t.stats.dmg, speed: t.stats.speed, cost: TK.costVec(t), quirks: (t.quirks || []).map(q => q.name || q.id || q).join(', ') })),
    singing: DYA3.SINGING.filter(r => !r.big || SAVE.inv.items[r.part]).map(r => ({ part: r.part, name: r.name || SPN(r.species), have: SAVE.inv.items[r.part] || 0, ok: (SAVE.inv.items[r.part] || 0) > 0 && (SAVE.inv.items.ore || 0) > 0 && G.shards >= DYA3.SING_COST.shards })),
  };
}
function singToken(part) {
  const r = DYA3.SINGING.find(x => x.part === part);
  if (!r || !SAVE.inv.items.okid) return;
  if (!takeAll(SAVE.inv, { [part]: 1, ore: 1 }) ) { toast('You need the part and a lump of stygian ore.', 2); return; }
  if (G.shards < DYA3.SING_COST.shards) { invAdd(SAVE.inv, part, 1); invAdd(SAVE.inv, 'ore', 1); toast('Not enough shards.', 2); return; }
  G.shards -= DYA3.SING_COST.shards;
  let tok;
  if (r.big) {   /* a legend's song always comes out as big and as fine as that kind can be */
    let best = null;
    for (let i = 0; i < 40; i++) { const t = DYA3.mintToken(r.species, (Math.random() * 1e9) >>> 0, { rarity: 4, name: r.name }); if (!best || t.sizeIdx > best.sizeIdx) best = t; }
    tok = DYA3.addToken(SAVE.dya, best, SAVE.dya.pouch.length < 25);
  } else tok = DYA3.addToken(SAVE.dya, DYA3.mintToken(r.species, (Math.random() * 1e9) >>> 0), SAVE.dya.pouch.length < 25);
  particles.burst(P.pos.x, P.pos.y + 1.4, P.pos.z, 30, { color: 0x9adfff, speed: 4, size: 0.4, life: 0.9, gravity: 1 });
  sfx.core(); xp(40);
  toast(`You sing ${r.name ? r.name + '’s' : 'the ' + SPN(r.species) + '’s'} song — a ${DYA.species.SIZES[tok.sizeIdx]} ${DYA.species.RARITIES[tok.rarity]} token!`, 3.5);
  persist();
}
function buhkonTokens() {
  if (SAVE.inv.items.okid) { openBook('tokens'); return; }
  if (young() && !F_.ch2) { dialog(STORY.APPRENTICE.festival.tokensAsk); return; }   // the Okid'Relic waits for something worth keeping
  dialog([
    ['buhkon', 'Tokens. I wondered when you’d ask. You’ve carried those since Velki — don’t look at me like that, I know a pocketful of tokens when I hear one.'],
    ['buhkon', 'A token is a creature’s truth. One creature — not the kind, the individual. Sing its song while you pour a little liquid stygian into a piece of it, inside an Okid’Relic, and the Relic keeps what it was.'],
    ['buhkon', 'Here. My old Okid’Relic. A shaving from a sleeping Punk, a tuft of Kipsu fluff, an ember — and a lump of stygian ore. Most songs come out small. A big one is a rare thing.'],
    ['buhkon', 'And go and lose to Venkin a few times. He’s been unbearable all summer.'],
  ], () => { invAdd(SAVE.inv, 'okid', 1); lootToast('okid', 1); xp(30); persist(); openBook('tokens'); });
}

function setSail() {
  dialog(STORY.DIALOG2.setSail, () => {
    G.mode = 'trance';
    $('endcard').classList.add('hidden');
    fade(0.9, 1.5);
    playCards(STORY.DIALOG2.urverkCards, 4200, () => {
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
  // waking it rouses whatever has been nesting in the ruins
  for (let i = 0; i < (D === DIFFICULTY.realistic ? 5 : 3); i++) {
    const a = Math.random() * Math.PI * 2;
    const e = enemies.spawn(i % 3 === 2 ? 'tyndael' : 'rodak', p.x + Math.cos(a) * 7, p.z + Math.sin(a) * 7, null, { state: 'chase', hostile: true, boss: true });
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
  // the little Malsti Punk that carried his memory goes free — causing chaos, as is traditional
  { const pz = world.PLAZA; const m = buildMalstiPunk({ seed: 77 }); m.blink(1); m.root.position.set(pz.x, pz.y, pz.z - 10); scene.add(m.root);
    let t = 0; const hop = () => { t += 0.016; m.root.position.x = pz.x + Math.sin(t * 3) * 4 + t * 2; m.root.position.y = pz.y + Math.abs(Math.sin(t * 9)) * 0.6; m.animate(0.016, { speed: 3, t }); if (t < 6) requestAnimationFrame(hop); else scene.remove(m.root); }; hop(); }
  dialog(STORY.DIALOG2.lordDown, () => {
    G.mode = 'trance';
    fade(0.85, 1.5);
    playCards(STORY.ENDING2, 4600, () => {
      fade(0, 1.5);
      G.mode = 'play'; F_.doneL = true; persist(); setObjective(); showEnd(2);
    });
  });
}

function revealGate() { if (gate) { gate.visible = true; gate.userData.film.material.opacity = 0.55; gate.userData.ring.material.emissiveIntensity = 0.7; } }

function showEnd(n) {
  G.mode = 'end';
  unlockMouse();
  if (n === 1) {
    $('e-kicker').textContent = 'Rokarvac I · Complete'; $('e-title').textContent = 'The Ruins of Aakalay';
    $('e-lead').textContent = 'Noka’s next riddle, found at the edge of the trance:';
    $('e-riddle').innerHTML = STORY.NEXT_RIDDLE.join('<br>');
    $('btn-sail').style.display = ''; revealGate();
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
  if (VK) { VK.interact(); return; }
  let best = null, bd = 1e9;
  for (const it of interactables()) {
    if (P.riding && it.far === 99) continue;
    const d = Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z);
    if (d < (it.far || 3) && d < bd && Math.abs(it.pos.y - P.pos.y) < 4) { bd = d; best = it; }
  }
  if (best) { sfx.ui(); best.act(); }
  else if (P.riding) toggleRide();
}
const useGlow = glowSprite(0xfff2d8, 1.5, 0); useGlow.userData.a = 0; useGlow.visible = false; useGlow.renderOrder = 3; scene.add(useGlow);
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
  if (young() && F_.pro === 'beuhk') { beuhkObjective(); return; }
  if (young()) { youngObjective(); return; }
  let txt, hintTxt = '', pips = 0, on = 0;
  const X = STORY.OBJECTIVES.xilia, tut = F_.tut || 0;
  if (REGION === 'xilia') {
    if (F_.xdone) txt = 'Home in Beuhk for a while. The Megla Pass, Eldi-ward over the ridge, leads back to Aakalay';
    else if (!F_.xtalked) txt = X.talk;
    else if (tut === 0) txt = X.buhkon;
    else if (tut === 1) { txt = X.dummies(Math.min(3, SAVE.counters.tut_dummy || 0)); hintTxt = 'Left-click to swing — keep clicking to combo'; pips = 3; on = Math.min(3, SAVE.counters.tut_dummy || 0); }
    else if (tut === 2) { txt = X.high; hintTxt = 'Right-click throws the axe through the Duat'; }
    else if (tut === 3) { txt = X.glide; hintTxt = 'Jump, then hold Space while falling'; }
    else if (tut === 4) txt = X.back;
    else if (F_.xseed) txt = X.sail;
    else if (F_.seedQuest) { txt = X.seed; hintTxt = 'F — Phorus senses the seed'; }
    else txt = X.stryx;
  } else if (REGION === 'property') {
    if (tut === 0) txt = X.buhkon;
    else if (tut === 1) { txt = X.dummies(Math.min(3, SAVE.counters.tut_dummy || 0)); hintTxt = 'Left-click to swing — keep clicking to combo'; pips = 3; on = Math.min(3, SAVE.counters.tut_dummy || 0); }
    else if (tut === 2) { txt = X.high; hintTxt = 'Right-click throws the axe through the Duat'; }
    else if (tut === 3) { txt = X.glide; hintTxt = 'Jump, then hold Space while falling'; }
    else if (tut === 4) txt = X.back;
    else txt = 'Buhkon’s property. The forest path leads east, back to Beuhk';
  } else if (REGION === 'aakalay') {
    if (!F_.talked) txt = STORY.OBJECTIVES.talk;
    else if (F_.done) { txt = 'Speak Kiet’s trigger at the Urverk beneath the Oath Stone — on to Leotik'; }
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
  $('q-head').textContent = $('q-head').dataset.base = REGION === 'xilia' ? 'Prologue · Beuhk' : REGION === 'property' ? 'Prologue · the Carpenter’s' : REGION === 'aakalay' ? 'Rokarvac I · Aakalay' : 'Rokarvac II · Leotik';
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
  barkTimer = 0; $('bark').style.opacity = 0;   // a bark never talks over a conversation
  if (young() || (!phorusWith() && F.pos.distanceTo(P.pos) > 20)) lines = lines.map(l => l[0] === 'phorus' ? ['tale', l[1]] : l);
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
    tanoc: 'radial-gradient(circle at 50% 70%,#8a5a3a 0 26%,transparent 27%),radial-gradient(circle at 50% 44%,#4a3020 0 34%,transparent 35%),radial-gradient(circle,#5a3a28,#140c08)',
    tale: 'radial-gradient(circle,#e8d8a8 0 14%,#7a6440 52%,#1a140c)',
    xwi: 'radial-gradient(circle,#fff8e0 0 22%,#ffd070 48%,#5a3a10)',
    guard: 'radial-gradient(circle at 50% 70%,#9a6a40 0 30%,transparent 31%),radial-gradient(circle at 50% 42%,#3a2a1a 0 40%,transparent 41%),radial-gradient(circle,#3a3a4a,#0c0c14)',
    ahoac: 'radial-gradient(circle at 50% 70%,#b07a48 0 30%,transparent 31%),radial-gradient(circle at 50% 42%,#3a2414 0 40%,transparent 41%),radial-gradient(circle,#8a4a1a,#1a0c04)',
  };
  if (map[who]) return map[who];
  const lk = NPC_LOOKS[who];
  if (lk) return `radial-gradient(circle at 50% 70%,${lk.skin} 0 32%,transparent 33%),radial-gradient(circle at 50% 42%,${lk.cap} 0 40%,transparent 41%),radial-gradient(circle,#2a2a3a,#0c0c14)`;
  const nd = Object.values(NPCS).flat().find(d => d.id === who);
  if (who === 'venkin' || (nd && nd.look === 'keilia')) return 'radial-gradient(circle at 50% 50%,#c8a070 0 26%,transparent 27%),radial-gradient(circle at 50% 46%,#5a3a2a 0 42%,transparent 43%),radial-gradient(circle,#3a2a1a,#100a06)';
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
    if (G.mode === 'play' && !locked && !overlayOpen()) lockMouse();   // straight back to walking: no dead moment waiting for a click
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
  if (who === 'phorus' && (young() || (!phorusWith() && F.pos.distanceTo(P.pos) > 20))) return;   // he's not here to say it
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
/* the words over a moving picture instead of a black card: a slow drift around something worth looking at */
function cineCards(lines, each, focus, done, o = {}) {
  G.mode = 'intro';
  const f = focus.clone(), R = o.r || 9, h = o.h || 2.4, a0 = o.a ?? (P.yaw + Math.PI * 0.8);
  mainCine.play(lines.map((line, i) => {
    const a = a0 + i * (o.step || 1.1), wide = i % 2 ? (o.wide || 1.7) : 1;
    return { dur: each / 1000 + 1.4, caption: line, cam: k => {
      const aa = a + k * 0.32, r = R * wide * (1.15 - 0.2 * k);
      return { p: V3(f.x + Math.sin(aa) * r, f.y + h * wide + (1 - k) * 1.2, f.z + Math.cos(aa) * r), l: V3(f.x, f.y + (o.look || 1.3), f.z) };
    } };
  }), done);
}
function skipCards() { if (cardState) nextCard(); else if (VK && VK.skip) VK.skip(); else if (mainCine.active) mainCine.skip(); }

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
  if (young()) { p = F_.pro === 'beuhk' ? beuhkGoal() : youngGoal(); return p ? { p, d: Math.round(Math.hypot(p.x - P.pos.x, p.z - P.pos.z)) } : null; }
  if (REGION === 'xilia' || REGION === 'property') {
    const g = xiliaGoal(); if (g) p = g.pos;
  } else if (REGION === 'aakalay') {
    if (!F_.talked) p = F.pos;
    else if (G.bossActive) return null;
    else if (F_.done) p = V3(world.PLAZA.x, 0, world.PLAZA.z);
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
  if (interiors.inside) return;
  const sub = REGION_NAME[REGION] || 'Leotik';
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
    const chs = CHAPTERS.filter(([k]) => SAVE.chTime[k] >= 30).map(([k, n]) => `${n}: ${fmtTime(SAVE.chTime[k])}`).join(' · ');
    $('j-mem').innerHTML = stats + (chs ? `<div class="jentry"><b>Time by chapter</b>${chs}</div>` : '') + mem + carv;
    const proph = (SAVE.prophecies || []).map(l => `<div class="jentry"><b>A true prophecy</b>“${l}”</div>`).join('');
    $('j-codex').innerHTML = proph + [...STORY.CODEX, ...STORY.CODEX_MORE, ...STORY.CODEX_LORE].map(([k, v]) => `<div class="jentry"><b>${k}</b>${v}</div>`).join('');
    j.classList.remove('hidden'); G.paused = true;
    unlockMouse();
  } else { j.classList.add('hidden'); G.paused = false; lockMouse(); }
}
$('btn-jclose').onclick = () => { toggleJournal(); };
function openPause() { if (overlayOpen()) return; G.paused = true; unlockMouse(); $('pause').classList.remove('hidden'); $('btn-concede').style.display = dyaMatch ? '' : 'none'; syncFull(); }
/* P pauses and unpauses, whenever there's a game running to pause */
function togglePause() {
  if (!$('pause').classList.contains('hidden')) { closePause(); return; }
  if (G.mode === 'play' || G.mode === 'dialog' || G.mode === 'memory') openPause();
}
/* full screen, from the pause menu (Esc leaves it too) */
const syncFull = () => { $('opt-full').checked = !!document.fullscreenElement; };
$('opt-full').onchange = () => {
  try {
    if ($('opt-full').checked && !document.fullscreenElement) { const p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(syncFull); }
    else if (!$('opt-full').checked && document.fullscreenElement) document.exitFullscreen();
  } catch (e) { syncFull(); }
};
document.addEventListener('fullscreenchange', syncFull);
function closePause() { $('pause').classList.add('hidden'); G.paused = false; lockMouse(); }
$('btn-resume').onclick = closePause;
$('btn-concede').onclick = () => { if (dyaMatch) dyaMatch.concede(); closePause(); };
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
/* young Tanoc isn't Stamijan yet, and hasn't met Phorus: the folk of Beuhk talk to the Carpenter's boy */
if (young()) {
  for (const n of npcs) if (STORY.YOUNG_HELLO[n.def.id]) n.def.hello = STORY.YOUNG_HELLO[n.def.id];
  for (const [id, o] of Object.entries(STORY.YOUNG_QUESTS)) if (QUESTS[id]) Object.assign(QUESTS[id], o);
  // Venkin is a boy about Tanoc's age, apprenticed to his father Orrin, the builder
  Object.assign(QUESTS.q_camp, STORY.APPRENTICE.build.youngQuest);
  STORY.SPEAKERS.venkin = Object.assign({}, STORY.SPEAKERS.venkinY);
  for (const n of npcs) {
    if (n.def.id === 'venkin') { n.actor.root.scale.multiplyScalar(0.74); n.def = Object.assign({}, n.def, { title: 'young Keilia, Orrin’s apprentice', hello: STORY.YOUNG_HELLO.venkin }); }
    if (n.def.id === 'kw1') n.def = Object.assign({}, n.def, { title: 'Keilia builder, Venkin’s father' });
  }
}
const npcName = id => { if (id === 'phorus') return 'Phorus'; const n = Object.values(NPCS).flat().find(d => d.id === id); return n ? n.name : id; };
const npcSpeaker = def => { if (!STORY.SPEAKERS[def.id]) STORY.SPEAKERS[def.id] = { name: def.name, color: def.look === 'keilia' ? '#e0b070' : '#e8d8a8', sub: def.title }; return def.id; };

function updateNpcs(dt) {
  for (const n of npcs) {
    // in Beuhk the Carpenter is only about on the night they stop there; he lives out at his own place
    n.hidden = REGION === 'xilia' && n.def.id === 'buhkon' && !(young() && F_.pro === 'beuhk' && F_.bk === 'rest') && !(!young() && (F_.tut || 0) >= 5) && !festival;
    n.actor.root.visible = !n.hidden;
    if (n.hidden) continue;
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
    b.onmouseenter = () => markChoice(i);
    box.appendChild(b);
  });
  DLG.sel = 0; markChoice(0);
  $('d-next').style.display = 'none';
  unlockMouse();
}
/* W / S (or the arrows) walk the highlight; Space, Enter, E or a click takes it */
function markChoice(i) {
  if (!DLG || !DLG.choices) return;
  const n = DLG.choices.length; DLG.sel = ((i % n) + n) % n;
  [...$('d-choices').children].forEach((b, j) => b.classList.toggle('sel', j === DLG.sel));
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
  if (def.id === 'buhkon') { if (young()) youngBuhkon(n); else buhkonTalk(n); return; }
  const opts = apNpcOptions(n).concat(bkErrandOptions(n));
  for (const qid of def.quests) {
    if (young() && qid === 'q_vel') continue;   // a Duat scroll is no use to him yet, and a Vel is no job for a boy
    const q = QUESTS[qid], st = SAVE.quests[qid];
    if (!st) opts.push({ label: `Ask about work <em style="color:var(--brass2)">· ${q.name}</em>`, act: () => offerQuest(n, qid) });
    else if (st === 'active') {
      if (questProgress(qid, q, SAVE, SAVE.inv) >= 1) opts.push({ label: `<b style="color:#9affc0">Finish: ${q.name}</b>`, act: () => turnIn(n, qid) });
      else opts.push({ label: `About “${q.name}”`, act: () => { n.talking = 3; dialog(q.wait.map(l => [who, l]), () => npcTalk(n)); } });
    }
  }
  if (DYA3.engineReady() && DYA3.RIVALS[REGION] && DYA3.RIVALS[REGION][def.id]) opts.push({ label: `Play Dya’Akara <em style="color:var(--brass2)">· ${dyaRecord(def.id)}</em>`, act: () => dyaChallenge(n) });
  if (def.roles.includes('shop')) opts.push({ label: 'Trade', act: () => openBook('shop') });
  if (def.roles.includes('forge')) {
    const ok = REGION !== 'xilia' || SAVE.quests.q_ore === 'done';
    opts.push({ label: ok ? 'Forge an axe or armor' : 'Forge an axe or armor <small>(his cauldron is cold)</small>', act: () => ok ? openBook('forge') : dialog([[who, 'No ore, no bark, no fire. Ask me about work.']], () => npcTalk(n)) });
  }
  if (def.roles.includes('cook')) {
    const ok = REGION !== 'xilia' || SAVE.quests.q_camp === 'done';
    opts.push({ label: ok ? 'Cook at the hearth' : 'Cook <small>(the hearth isn’t built yet)</small>', act: () => ok ? openBook('cook') : dialog([[who, 'Help me raise the storehouse and I’ll build a hearth worth cooking on.']], () => npcTalk(n)) });
  }
  if (def.roles.includes('stable') && (SAVE.flags.mount || F_.saddle)) opts.push({ label: `Ask about ${PN()}`, act: () => dialog([[who, saddled() ? 'Whistle (H) and she’ll come. Ride her with E. Don’t let her eat the Zahreh.' : 'The saddle? Give it to the Carpenter. She wants a stall of her own before she’ll take it.']], () => npcTalk(n)) });
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
  if (qid === 'q_camp' && storehouse) { storehouse.visible = true; world.col.add(storehouse.position.x, storehouse.position.z, 3, 2.2, storehouse.rotation.y, storehouse.position.y - 1, storehouse.position.y + 3.2); }
  if (r.flag === 'mount') makeMount(true);
  persist();
  n.talking = 4;
  dialog(q.done.map(l => [who, l]), () => {
    toast(`Quest complete: ${q.name}${r.shards ? ` · +${r.shards} shards` : ''}`, 3.5); xp(r.xp || 0); persist();
    if (qid === 'q_camp' && apOn() && apStep() === AP.BUILD) dialog(STORY.APPRENTICE.build.raised, () => setObjective());   // the frame goes up, with Orrin calling the beams
    else setObjective();
  });
}

function learnSpell(id) {
  if (SAVE.skills.spells[id]) return;
  SAVE.skills.spells[id] = true;
  const sp = SPELLS[id];
  // onto the first empty quick slot, the same as a Relic whose trigger you've found
  const free = SLOT_KEYS.find(k => !SAVE.slots[k]);
  if (free && !Object.values(SAVE.slots).includes(id)) SAVE.slots[free] = id;
  setTimeout(() => toast(free ? `Spell learned: ${sp.icon} ${sp.name} — it’s on ${slotLabel(free)}. Change your quick slots in the book (I → Gear).` : `Spell learned: ${sp.icon} ${sp.name} — put it on a quick slot in the book (I → Gear).`, 4.5), 600);
  renderSpellBar(); persist();
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
  if (e.kind === 'punk_d' && Math.random() < 0.4) { invAdd(SAVE.inv, 'shaving', 1); lootToast('shaving', 1); }
  bark('phorus', e.kind === 'kipsu_f' ? 'It likes you. They can tell, you know.' : 'Gentle as anything. Ruut’s herd, probably.', 2.5);
}

/* ---------------- Sprengju: throw it and it bursts ---------------- */
const sprengjuShots = [];
function throwSprengju() {
  if (G.mode !== 'play' || P.dead) return;
  if (!SAVE.inv.items.sprengju) { toast('No Sprengju to throw. Catch them over a woken Ju field.', 2.2); return; }
  SAVE.inv.items.sprengju--; if (SAVE.inv.items.sprengju <= 0) delete SAVE.inv.items.sprengju;
  const f = camForward(), g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), toon(0xff8a2a, { emissive: 0xff6a10, emissiveIntensity: 0.8 })); core.rotation.x = Math.PI / 2; g.add(core);
  g.add(glowSprite(0xffa040, 1.6, 0.8));
  g.position.set(P.pos.x + f.x, P.pos.y + 1.6, P.pos.z + f.z); scene.add(g);
  // lobbed to land on the X (or the foe you're locked on to); at the sky, the old long throw
  const A = lockPoint() || (() => { const a = lookAim(40); return a.foe || a.ground ? a.p : null; })();
  let vel = V3(f.x * 24, 4, f.z * 24);
  if (A) {
    const dx = A.x - g.position.x, dz = A.z - g.position.z, h = Math.hypot(dx, dz);
    if (h > 1) { const T = h / 24; vel = V3(dx / h * 24, clamp((A.y - g.position.y + 3 * T * T) / T, -6, 18), dz / h * 24); }   // falls 6·T²/2 on the way
  }
  P.yaw = Math.atan2(vel.x, vel.z);
  sprengjuShots.push({ g, vel, life: 3, wob: Math.random() * 6 });
  sfx.jump();
}
function burstSprengju(p) {
  particles.burst(p.x, p.y, p.z, 40, { color: 0xffa040, speed: 9, size: 0.6, life: 0.7, gravity: 4 });
  particles.burst(p.x, p.y, p.z, 20, { color: 0xffe08a, speed: 5, size: 0.4, life: 0.5 });
  sfx.hit(); G.shake = Math.max(G.shake || 0, 0.35);
  for (const e of enemies.list) if (!e.dead && e.pos.distanceTo(p) < 4.2 + e.T.rad) enemies.damage(e, 70, p, 9, { stun: 0.5 });
  if (boss && !boss.dead && boss.pos && boss.pos.distanceTo(p) < 6) damageBoss(70);
}
function updateSprengju(dt) {
  for (let i = sprengjuShots.length - 1; i >= 0; i--) {
    const s = sprengjuShots[i]; s.life -= dt; s.wob += dt * 12;
    s.vel.y -= 6 * dt;   // it flies — mostly
    s.g.position.addScaledVector(s.vel, dt);
    s.g.position.x += Math.sin(s.wob) * 0.04; s.g.lookAt(s.g.position.clone().add(s.vel));
    if (Math.random() < 0.6) particles.emit(s.g.position.x, s.g.position.y, s.g.position.z, { color: 0xffb040, size: 0.3, life: 0.3, speed: 0.4 });
    const hit = s.life <= 0 || s.g.position.y <= world.col.ground(s.g.position.x, s.g.position.z, s.g.position.y + 1) + 0.1
      || enemies.list.some(e => !e.dead && e.pos.distanceTo(s.g.position) < e.T.rad + 0.8);
    if (hit) { burstSprengju(s.g.position.clone()); scene.remove(s.g); sprengjuShots.splice(i, 1); }
  }
}

/* ---------------- the Kuni Byrd: late in the run, a mount that flies ---------------- */
let kuni = null;   // { actor, landing }
function kuniNest(n) {
  if (!F_.lordDead) { dialog([['phorus', 'A Kuni Byrd’s nest. They hardly ever come down, Torcain — and never for strangers. Maybe once we’ve done something worth a Kuni’s notice.']]); return; }
  if ((SAVE.inv.items.albali_fruit || 0) < 3) { dialog([['phorus', 'It’s watching your hands. Albali fruit — ripe ones, from under an Albali Aagac. Three, I’d say. Kuni Byrds are not cheap friends.']]); return; }
  takeAll(SAVE.inv, { albali_fruit: 3 });
  dialog([
    ['torcain', '(You hold out the fruit. The Kuni Byrd looks at it, then at you, for a very long time.)'],
    ['memory', 'It eats all three in three snaps. Then it lowers its head until the saddle-straps hanging from its old harness touch the ground.'],
    ['phorus', 'Someone rode this one, once. …It’s choosing you. Press B whenever you want it, wherever the sky’s open.'],
  ], () => { F_.kuni = true; xp(400); persist(); toast('The Kuni Byrd is yours. B to call it · Space up · C down · B again to land.', 5); });
}
function callKuni() {
  if (!F_.kuni) return;
  if (G.mode !== 'play' || P.dead || G.bossActive || dyaMatch) return;
  if (P.flying) {
    const g = world.col.ground(P.pos.x, P.pos.z, P.pos.y);
    if (P.pos.y - Math.max(g, world.water ? world.water.level : -1e9) > 4) { toast('Fly lower to land (hold C).', 1.8); return; }
    if (world.inBounds && !world.inBounds(P.pos.x, P.pos.z) && !(world.swimOk && world.swimOk(P.pos.x, P.pos.z))) { toast('Nowhere to land here.', 1.8); return; }
    P.flying = false; P.pos.y = g; P.vel.set(0, 0, 0);
    kuni.actor.root.visible = false; F.pos.copy(P.pos).add(V3(2, 0, 2)); phorus.root.visible = true;
    toast('The Kuni Byrd wheels away into the sky.', 2); return;
  }
  if (P.riding) toggleRide();
  if (!kuni) { const a = buildKuniByrd({ saddle: true, seed: 3 }); scene.add(a.root); kuni = { actor: a, body: a.root.children[0] }; }
  kuni.actor.root.visible = true;
  P.flying = true; P.vel.set(0, 6, 0); P.atk = null; P.gliding = false; glider.visible = false;
  phorus.root.visible = false;   // Phorus rides behind you
  particles.burst(P.pos.x, P.pos.y + 2, P.pos.z, 40, { color: 0xffffff, speed: 6, size: 0.5, life: 0.8 });
  sfx.jump(); bark('phorus', 'Hold on to something! Not me!', 2);
}
function flyKuni(dt, wish, moving, act) {
  const fast = keys.ShiftLeft || keys.ShiftRight, sp = fast ? 34 : 20;
  P.vel.x = damp(P.vel.x, wish.x * sp, 2.2, dt); P.vel.z = damp(P.vel.z, wish.z * sp, 2.2, dt);
  const up = act && keys.Space ? 1 : 0, down = act && keys.KeyC ? 1 : 0;
  P.vel.y = damp(P.vel.y, (up - down) * 11, 3, dt);
  const nx = P.pos.x + P.vel.x * dt, nz = P.pos.z + P.vel.z * dt;
  const R = world.edgeRadius(nx, nz);
  if (Math.hypot(nx, nz) < R + 60) { P.pos.x = nx; P.pos.z = nz; }
  else { P.vel.x *= -0.5; P.vel.z *= -0.5; if (G.t - (P.barrierT || -99) > 6) { P.barrierT = G.t; bark('phorus', 'Even a Kuni won’t fly past the edge of what we know. Turn back.', 2.4); } }
  const g = Math.max(world.col.ground(P.pos.x, P.pos.z, P.pos.y + 50), world.water ? world.water.level : -1e9);   // skim the water, don't fly through it
  P.pos.y = clamp(P.pos.y + P.vel.y * dt, g + 1.5, g + 140);
  if (moving) P.yaw = dampAngle(P.yaw, Math.atan2(P.vel.x, P.vel.z), 3, dt);
  P.onGround = false; P.stam = Math.min(P.stamMax, P.stam + 20 * dt);
  // the byrd under you, the saddle under Torcain
  const k = kuni.actor, hs = Math.hypot(P.vel.x, P.vel.z), bodyY = kuni.body ? kuni.body.position.y : 3;
  k.root.rotation.y = P.yaw;
  k.root.rotation.z = damp(k.root.rotation.z, clamp(-angleDiff(P.yaw, Math.atan2(wish.x || 1e-6, wish.z || 1e-6)) * 0.4 * (moving ? 1 : 0), -0.5, 0.5), 3, dt);
  const back = V3(Math.sin(P.yaw), 0, Math.cos(P.yaw)).multiplyScalar(-0.45);
  k.root.position.set(P.pos.x - back.x, P.pos.y - bodyY - 0.56, P.pos.z - back.z);
  k.animate(dt, { speed: hs, t: G.t, diving: P.vel.y < -6 });
  if (k.glow) k.glow(G.night || 0);
  torcain.root.position.copy(P.pos); torcain.root.rotation.y = P.yaw;
  torcain.animate(dt, { speed: 0, onGround: true, t: G.t, heat: P.heat / 100 });
  if (Math.random() < 0.15 * Math.min(1, hs / 20)) particles.emit(P.pos.x, P.pos.y + 1, P.pos.z, { vx: -P.vel.x * 0.1, vz: -P.vel.z * 0.1, color: 0xffffff, size: 0.3, life: 0.8, speed: 0.5 });
  updateAttack(dt);
}

/* ---------------- your Punk ----------------
   Tanoc's Punk is the young mutt he saved in Fyrsti'Vilag, the one that followed
   him north. She trots at his heels and grows as the seasons go (a few hours of
   play). Old Ruut gives him a saddle; the Carpenter and he build her a stall
   wherever you choose; the saddle is fitted, and she's a steed. Her saddlebags
   carry materials, more as she grows. (Torcain, years later, rides Brindle.) */
var mount = null;   // var: the pack check (invAdd) can run before this line does
const PN = () => (young() || F_.punkName) && !(SAVE.flags.mount && !young()) ? (F_.punkName || 'your Punk') : 'Brindle';
const ownPunk = () => young() || (!SAVE.flags.mount && !!F_.punkName);
function punkGrowth() { return clamp(((SAVE.time || 0) - (F_.punkBorn ?? 0)) / (3 * 3600), 0, 1); }
const punkScale = () => 0.84 + 0.48 * punkGrowth();   // a touch bigger from the start
const saddled = () => ownPunk() ? !!F_.saddled : true;
function makeMount(nearPlayer) {
  if (mount) return;
  let actor, seat, scale;
  if (ownPunk()) {
    if (F_.punkBorn == null) { F_.punkBorn = SAVE.time || 0; }
    scale = punkScale();
    actor = cartoon(buildWildPunk({ seed: 31, saddle: !!F_.saddled, blanket: 0x8a5a2a }), 0.6); actor.root.scale.setScalar(scale);
    seat = scale * 1.85 - 0.3;
  } else {
    actor = cartoon(buildDomesticPunk({ saddle: true, blanket: 0x8a2a3a, seed: 9 }), 0.6); scale = 0.8; actor.root.scale.setScalar(scale);   // Brindle: a horse-sized youngster
    seat = 1.35;
  }
  const st = F_.stall;
  const p = nearPlayer ? P.pos.clone().add(V3(3, 0, 3)) : st && REGION === 'property' ? V3(st.x, 0, st.z) : camp ? V3(camp.pen.x, 0, camp.pen.z) : world.pen ? V3(world.pen.x + 3, 0, world.pen.z) : P.pos.clone().add(V3(4, 0, 4));
  p.y = world.col.ground(p.x, p.z, world.heightAt(p.x, p.z) + 1);
  actor.root.position.copy(p); scene.add(actor.root);
  mount = { actor, pos: p, vel: V3(), yaw: 0, coming: false, seat, scale };
}
function remakeMount() { if (!mount) return; const p = mount.pos.clone(), y = mount.yaw; scene.remove(mount.actor.root); mount = null; makeMount(false); mount.pos.copy(p); mount.yaw = y; }
if (SAVE.flags.mount || (ownPunk() && F_.punkName && REGION !== 'leotik' && REGION !== 'aakalay')) makeMount(false);
function whistle() {
  if (!mount) { toast(young() ? 'You whistle. Nothing comes.' : 'You whistle. Nothing comes. (Old Ruut might lend you a Punk.)', 2.5); return; }
  sfx.blink();
  if (P.riding) return;
  if (mount.pos.distanceTo(P.pos) > 60) { mount.pos.copy(P.pos).add(V3(-6, 0, 6)); mount.pos.y = world.col.ground(mount.pos.x, mount.pos.z, P.pos.y + 3); }
  mount.coming = true; mount.called = true; toast(`${PN()} comes running.`, 1.8);
}
/* materials: what Tanoc can carry, and what her saddlebags can */
var PACK = 40;
function bagCap() { return mount && saddled() ? Math.round(20 + 60 * (ownPunk() ? punkGrowth() : 1)) : 0; }
function matCount() { let n = 0; for (const [k, c] of Object.entries(SAVE.inv.items)) if (ITEMS[k] && ITEMS[k].kind === 'mat') n += c; return n; }
function invAdd(inv, id, n = 1) {
  if (inv === SAVE.inv && ITEMS[id] && ITEMS[id].kind === 'mat') {
    const cap = PACK + bagCap(), room = cap - matCount();
    if (room < n) { if (room > 0) invAddRaw(inv, id, room); toast(STORY.STEED.bagFull(cap, bagCap()), 3); return; }
  }
  invAddRaw(inv, id, n);
}
function toggleRide() {
  if (!mount) return;
  if (!P.riding && !saddled()) { bark('tanoc', STORY.STEED.noSaddle(PN()), 3.5); return; }
  if (P.riding) {
    P.riding = false; dropVines(); P.slap = null; mount.called = false;   // left where you climb down (and home in a while, if she has one)
    P.pos.copy(mount.pos).add(V3(Math.cos(mount.yaw) * 1.8, 0, -Math.sin(mount.yaw) * 1.8));
    P.pos.y = world.col.ground(P.pos.x, P.pos.z, P.pos.y + 3);
    phorusDismount();
  } else {
    P.riding = true; mount.coming = false; P.atk = null;
    sfx.jump();
    if (!F_.vineTold) { F_.vineTold = true; persist(); hint(`On ${PN()}: left / right click throw her vines at the X — hold to hang on, let go to fly. Space at the bottom of a swing pumps it · Shift reel in · C let out · X hold the length.`); }
    phorusMount();
  }
}

/* ---------------- riding: Brindle's vines ----------------
   Hand over hand, the way Tarzan swings. On her back the mouse buttons are her two front
   vines: left click throws the left one at whatever is by the X (leaning left of it), right
   click the right one. Hold to hang on; let go to fly off with all your speed — and let go
   on the way up the far side for a flick of extra. Catch the next vine before you let go of
   the last and you never drop. Hold both and you hang between two anchors: pull back on S,
   let go, and she slingshoots you off. Space near the bottom of a swing: she kicks and pumps
   it higher (on the ground, a jump). Shift hauls the vine in, C lets it out. Hold X (or tap
   it) and the vine stays the length it is — nothing reels in, so you can hang there and work
   it up and down yourself.
   She has five vines to throw; each one that catches is spent, and they grow back once her
   feet are on something. No axe from the saddle: Relics on the quick slots, Caps Lock (or Z)
   for her shove, and a vine thrown at a foe yanks it in — or, at something big, holds on. */
const SWING = { range: 38, hip: 1.35, vines: 5 };
P.vines = { L: null, R: null }; P.vineN = SWING.vines; P.vineHoldTap = false; P.sling = 0;
const vineOn = () => !!(P.vines.L || P.vines.R);
const heldVines = () => [P.vines.L, P.vines.R].filter(v => v && v.hold);
const vineHeld = () => !!(keys.KeyX || P.vineHoldTap);
function dropVines() { P.vines.L = P.vines.R = null; P.sling = 0; }
const peaceable = e => !!(e.T && e.T.disp && !e.hostile && e.T.disp !== 'training');
const bigFoe = e => e === 'boss' || (e.T.rad || 0.6) >= 1.4;
const foeGone = e => e === 'boss' ? !boss || boss.dead : e.dead || e.gone;
const foePoint = e => e === 'boss' ? bossTargetPoint() : V3(e.pos.x, e.pos.y + 0.8 + (e.T.rad || 0.6) * 0.5, e.pos.z);
/* where a vine thrown now would go: a foe under the X; else the X itself, if it's on something
   solid and high enough; else whatever sits nearest the X, leaning toward that vine's side */
function vineTarget(side) {
  const from = V3(P.pos.x, P.pos.y + SWING.hip, P.pos.z);
  const a = lookAim(SWING.range);
  if (a.foe && !a.foe.sigil && (a.foe === 'boss' || !peaceable(a.foe))) return { A: foePoint(a.foe), foe: a.foe };
  if (!a.foe && a.ground && a.p.y - from.y > 1.5 && a.p.distanceTo(from) < SWING.range) return { A: a.p };
  const r = aimRay.ray, A = latchAlongRay(world, from, r.origin, r.direction, side, { range: SWING.range, minUp: P.onGround ? 2.5 : 1.2 });
  return A ? { A } : null;
}
function vineShoot(side) {
  if (!mount || !P.riding || !canAct() || P.climb) return;
  const f = camForward();
  sfx.swing();
  if (P.vineN <= 0) {   // nothing left to throw: she reaches, and there's nothing in it
    P.slap = { p: V3(P.pos.x + f.x * 5, P.pos.y + 4, P.pos.z + f.z * 5), t: 0, miss: true };
    if (G.t - (P.vineOutT || -9) > 3) { P.vineOutT = G.t; toast(`${PN()} is out of vines. They grow back once her feet touch something.`, 2.4); }
    return;
  }
  const T = vineTarget(side);
  if (!T) { P.slap = { p: V3(P.pos.x + f.x * 9, P.pos.y + 7, P.pos.z + f.z * 9), t: 0, miss: true }; return; }
  const hip = V3(P.pos.x, P.pos.y + SWING.hip, P.pos.z);
  P.vines[side] = { A: T.A.clone(), foe: T.foe || null, L: hip.distanceTo(T.A), t: 0, k: 0, hold: false, side };
  P.slap = null;
}
function vineLet(side) {
  const S = P.vines[side]; if (!S) return;
  if (S.hold && P.sling > 0.2) { slingLaunch(); return; }
  P.vines[side] = null;
  if (S.hold && !heldVines().length) releaseFlick(S);
}
/* let go on the way up the far side of the arc and she flicks you on; any other time you just keep your speed */
function releaseFlick(S) {
  P.onGround = false; P.coyote = 0;
  const off = V3(P.pos.x, P.pos.y + SWING.hip, P.pos.z).sub(S.A);
  const hv = Math.hypot(P.vel.x, P.vel.z), lead = hv > 1 ? (off.x * P.vel.x + off.z * P.vel.z) / hv : 0;
  const ang = Math.atan2(Math.abs(lead), -off.y);   // 0 hanging straight down, π/2 level with the anchor
  if (P.vel.y > 0 && lead > 0 && ang > 0.4 && ang < 1.35) {
    P.vel.y += 5; if (hv < 30) { P.vel.x *= 1.12; P.vel.z *= 1.12; }
    particles.ring(P.pos.x, P.pos.y + 1, P.pos.z, 16, 1.6, { color: 0xb8ff7a, size: 0.4, life: 0.4 });
    sfx.jump();
  } else if (P.vel.y > 0) P.vel.y += 1.5;
}
/* both vines held and S pulled back: let go and she flings you along the X */
function slingLaunch() {
  const k = clamp(P.sling, 0, 1); dropVines();
  aimRay.setFromCamera(AIM_C, camera); const d = aimRay.ray.direction, sp = 16 + 24 * k;
  P.vel.set(d.x * sp, Math.max(d.y * sp, 0) + 5 + 4 * k, d.z * sp);
  P.onGround = false; P.coyote = 0; G.shake = Math.max(G.shake, 0.25 * k);
  particles.burst(P.pos.x, P.pos.y + 1, P.pos.z, 24, { color: 0xb8ff7a, speed: 6, size: 0.45, life: 0.5 });
  sfx.jump(); sfx.swing();
}
/* Space on her back: a jump on the ground; on a vine, a kick that pumps the swing — best right at the bottom */
function rideSpace() {
  const H = heldVines();
  if (!H.length) {
    if (P.onGround || P.coyote > 0) {
      const f = V3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
      P.vel.y = 10; P.vel.x += f.x * 3; P.vel.z += f.z * 3; P.onGround = false; P.coyote = 0;
      P.slap = { p: V3(P.pos.x + f.x * 2.5, world.col.ground(P.pos.x + f.x * 2.5, P.pos.z + f.z * 2.5, P.pos.y + 1), P.pos.z + f.z * 2.5), t: 0 };
      particles.burst(P.pos.x, P.pos.y + 0.2, P.pos.z, 14, { color: 0x6aa040, speed: 4, size: 0.4, life: 0.5 });
      sfx.jump();
    }
    return;
  }
  if (G.t < (P.pumpT || 0)) return;
  P.pumpT = G.t + 0.45;
  const S = H[0], off = V3(P.pos.x, P.pos.y + SWING.hip, P.pos.z).sub(S.A), ol = off.length() || 1;
  const fromBottom = Math.acos(clamp(-off.y / ol, -1, 1)), sp = P.vel.length();
  const good = clamp(1 - fromBottom / 0.6, 0, 1);   // within ~35° of the bottom of the arc
  if (sp < 2) P.vel.addScaledVector(camForward(), 5);           // hanging still: a kick gets you going
  else if (good > 0 && sp < 40) P.vel.multiplyScalar(1 + (2 + 5 * good) / sp);
  if (good > 0.5) particles.ring(P.pos.x, P.pos.y + 0.6, P.pos.z, 12, 1.2, { color: 0x9ad86a, size: 0.35, life: 0.35 });
  mount.atk = 0.2; sfx.swing();
}
function vineTick(dt, act) {
  if (!P.riding || !act) { dropVines(); return; }
  for (const side of ['L', 'R']) {
    const S = P.vines[side]; if (!S) continue;
    S.t += dt;
    if (S.foe) { if (foeGone(S.foe)) { P.vines[side] = null; continue; } S.A.copy(foePoint(S.foe)); }
    if (S.yank != null) { if ((S.yank -= dt) <= 0) P.vines[side] = null; continue; }
    if (touch.on && side === 'L' && !keys.Space) { vineLet('L'); continue; }   // on a touch screen the jump button is the one vine
    if (S.hold) continue;
    // the vine shoots out — it takes a moment to reach, longer the further it goes
    S.k = Math.min(1, S.t / (0.06 + S.L * 0.007));
    if (S.k < 1) continue;
    P.vineN = Math.max(0, P.vineN - 1);
    sfx.hit(); particles.burst(S.A.x, S.A.y, S.A.z, 10, { color: 0x9ad86a, speed: 3, size: 0.35, life: 0.5 });
    if (S.foe && !bigFoe(S.foe)) {   // something small enough to haul: yank it in, and the vine comes back
      const e = S.foe, dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz) || 1;
      enemies.damage(e, 12 * axeMul(), V3(e.pos.x + dx / d * 2, e.pos.y, e.pos.z + dz / d * 2), Math.min(14, d * 0.8), { stun: 0.9 });
      G.hitstop = 0.05; addHeat(5); S.yank = 0.22;
      continue;
    }
    S.hold = true;
    // she hauls: you leave the ground and go, even from a standstill
    const fx = S.A.x - P.pos.x, fz = S.A.z - P.pos.z, fd = Math.hypot(fx, fz) || 1, hv = Math.hypot(P.vel.x, P.vel.z);
    if (hv < 15 && !vineHeld()) { P.vel.x += fx / fd * (15 - hv); P.vel.z += fz / fd * (15 - hv); }
    if (P.onGround || P.pos.y - world.col.ground(P.pos.x, P.pos.z, P.pos.y) < 1.5) P.vel.y = Math.max(P.vel.y, 7);
    P.onGround = false; P.coyote = 0;
    S.L = V3(P.pos.x, P.pos.y + SWING.hip, P.pos.z).distanceTo(S.A);
  }
  const H = heldVines(); if (!H.length) { P.sling = 0; return; }
  const hold = vineHeld(), reelIn = keys.ShiftLeft || keys.ShiftRight, letOut = keys.KeyC;
  for (const S of H) {
    if (reelIn) S.L = Math.max(2.5, S.L - 7 * dt);
    else if (letOut) S.L = Math.min(SWING.range, S.L + 7 * dt);
    else if (!hold) {   // reel in a little so the arc clears the ground, never shorter than a few lengths of her
      const want = Math.max(4, S.A.y - (world.col.ground(S.A.x, S.A.z, S.A.y) + 2.5));
      S.L = Math.max(4, S.L - Math.min(24, 1.5 + Math.max(0, S.L - want) * 3) * dt);
    }
  }
  // both vines held: pull back on S to draw the slingshot
  if (H.length === 2 && keys.KeyS) { P.sling = Math.min(1, P.sling + dt / 1.2); P.vel.addScaledVector(camForward(), -10 * dt); }
  else P.sling = Math.max(0, P.sling - dt * 2);
  // the rope: wherever this frame's motion would carry you, no vine lets you get further than its length from its anchor
  const hip = V3(P.pos.x, P.pos.y + SWING.hip, P.pos.z), pred = hip.clone().addScaledVector(P.vel, dt);
  for (let it = 0; it < (H.length > 1 ? 3 : 1); it++) for (const S of H) {
    const d = pred.clone().sub(S.A), len = d.length();
    if (len > S.L) pred.copy(S.A).addScaledVector(d, S.L / len);
  }
  P.vel.copy(pred.sub(hip)).multiplyScalar(1 / dt);
  const sp = P.vel.length();
  if (hold) P.vel.multiplyScalar(1 - 1.2 * dt);   // held fast: the swing dies away and you hang
  else if (sp > 0.5 && sp < 38 && P.vel.y < 0) P.vel.multiplyScalar(1 + 0.12 * dt);   // a little of her own pull on the downswing
  if (Math.random() < 0.35) particles.emit(P.pos.x, P.pos.y + 0.6, P.pos.z, { color: 0x9ad86a, size: 0.3, life: 0.5, speed: 1 });
}
/* X on her back: hold it and the vine keeps its length; a quick tap keeps it held until you let go of every vine */
let xDownT = -1;
function rideXDown() { xDownT = G.t; }
function rideXUp() {
  if (xDownT < 0) return;
  if (G.t - xDownT < 0.25 && vineOn()) P.vineHoldTap = !P.vineHoldTap;
  xDownT = -1;
}
/* the five vines grow back when her feet are on something; the pips under the X show how many are left */
function updateVineHud(dt) {
  if (P.riding && (P.onGround || P.climb) && P.vineN < SWING.vines && (P.vineGrow = (P.vineGrow || 0) + dt) > 0.3) { P.vineGrow = 0; P.vineN++; }
  if (!P.riding) P.vineN = SWING.vines;
  if (!vineOn()) P.vineHoldTap = false;
  const el = $('vinepips'), key = P.riding && G.mode === 'play' ? P.vineN + (vineHeld() ? 'h' : '') : '';
  if (el._k === key) return;
  el._k = key; el.classList.toggle('hidden', !key); el.classList.toggle('held', key.endsWith('h'));
  el.innerHTML = Array.from({ length: SWING.vines }, (_, i) => `<i class="${i >= P.vineN ? 'spent' : P.vineN === 1 ? 'last' : ''}"></i>`).join('');
}
function punkAttack() {
  if (!mount || !P.riding) { if (mount) toast('Climb up on Brindle first (E) — then Caps Lock to have her fight.', 2.5); return; }
  if ((mount.atkCd || 0) > 0) return;
  mount.atkCd = 0.85; mount.atk = 0.5;
  const f = V3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
  P.vel.x += f.x * 7; P.vel.z += f.z * 7;   // a lunge
  sfx.swing(); setTimeout(() => sfx.hit(), 120);
  const hx = P.pos.x + f.x * 2.2, hz = P.pos.z + f.z * 2.2;
  particles.ring(hx, P.pos.y + 0.8, hz, 30, 3.2, { color: 0x6aa040, size: 0.5, life: 0.45 });
  let hit = 0;
  for (const e of enemies.list) {
    if (e.dead) continue;
    const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > 4.6 + e.T.rad || (dx * f.x + dz * f.z) / (d || 1) < 0.2 || Math.abs(e.pos.y - P.pos.y) > 4) continue;
    if (e.T.disp && !e.hostile && e.T.disp !== 'training') continue;   // she won't go for the peaceable ones
    enemies.damage(e, 30 * axeMul(), P.pos, 11, { stun: 0.7 }); hit++;
  }
  if (boss && !boss.dead && boss.pos && Math.hypot(boss.pos.x - P.pos.x, boss.pos.z - P.pos.z) < 6) { damageBoss(40); hit++; }
  if (hit) { G.shake = Math.max(G.shake, 0.35); G.hitstop = 0.05; addHeat(6); }
}

/* Phorus rides too: some days he climbs up behind you on Brindle, some days he
   takes his own Punk, Lun (Dearcineon: moon, shadow — a Kalo'Eik's joke), and keeps pace alongside */
const FR = { mode: null, punk: null, pos: V3(), yaw: 0 };
const PILLION_LINES = ['Budge up. Brindle won’t mind.', 'I’m riding behind. Mind the bumps.', 'Room for one more. There’s always room for one more.'];
const LUN_LINES = ['I’m taking Lun. Try to keep up.', 'Lun! Here, girl. We ride together today.', 'Race you. Lun’s faster, don’t tell Brindle.', 'A Kalo’Eik on a Punk called Moon. Don’t laugh.'];
function phorusMount() {
  if (!phorus.root.visible || FR.mode) return;   // he's not about (on the Kuni, say)
  FR.mode = Math.random() < 0.5 ? 'pillion' : 'own';
  if (FR.mode === 'own') {
    if (!FR.punk) { FR.punk = cartoon(buildDomesticPunk({ saddle: true, blanket: 0x2a5a8a, seed: 23 }), 0.6); FR.punk.root.scale.setScalar(0.72); scene.add(FR.punk.root); }
    // Lun trots over from wherever she was left, or out of the nearest bushes
    if (!FR.punk.root.visible || FR.pos.distanceTo(F.pos) > 20) { FR.pos.copy(F.pos).add(V3(1.2, 0, 1.2)); FR.pos.y = world.col.ground(FR.pos.x, FR.pos.z, F.pos.y + 2); }
    FR.punk.root.visible = true;
    F.pos.copy(FR.pos); F.vel.set(0, 0, 0);
    particles.burst(F.pos.x, F.pos.y + 1, F.pos.z, 12, { color: 0xd8c098, speed: 3, size: 0.5, life: 0.5 });
    bark('phorus', LUN_LINES[Math.floor(Math.random() * LUN_LINES.length)], 2.4);
  } else bark('phorus', PILLION_LINES[Math.floor(Math.random() * PILLION_LINES.length)], 2.4);
}
function phorusDismount() {
  if (!FR.mode) return;
  if (FR.mode === 'own') {          // he hops down beside Lun, who waits there
    FR.pos.copy(F.pos); FR.yaw = F.yaw;
    F.pos.add(V3(Math.cos(F.yaw) * 1.5, 0, -Math.sin(F.yaw) * 1.5));
  } else F.pos.copy(P.pos).add(V3(-Math.sin(P.yaw) * 2.2, 0, -Math.cos(P.yaw) * 2.2));   // slides off Brindle's back
  F.pos.y = world.col.ground(F.pos.x, F.pos.z, F.pos.y + 3); F.vel.set(0, 0, 0);
  FR.mode = null;
}
function updateMount(dt) {
  updateVineHud(dt);
  if (!mount) return;
  const m = mount;
  // your own Punk grows, slowly; and until she's a steed she keeps to your heels (indoors, she waits by the door)
  if (ownPunk()) {
    if ((m.growT = (m.growT || 0) - dt) <= 0) { m.growT = 5; const sc = punkScale(); if (Math.abs(sc - m.scale) > 0.004) { m.scale = sc; m.actor.root.scale.setScalar(sc); m.seat = sc * 1.85 - 0.3; } }
    if (!P.riding && !interiors.inside && G.mode === 'play' && (!pipHome() || m.called) && P.pos.distanceTo(m.pos) > (saddled() ? 14 : 7)) m.coming = true;
  }
  if (interiors.inside) { m.coming = false; m.called = false; }   // never into the house after him: she stays outside (and goes home, once she has one)
  if (P.riding) {
    m.pos.copy(P.pos); m.yaw = P.yaw;
  } else if (m.coming) {
    const dx = P.pos.x - m.pos.x, dz = P.pos.z - m.pos.z, d = Math.hypot(dx, dz);
    if (d > 90) { m.pos.set(P.pos.x - Math.sin(P.yaw) * 6, P.pos.y, P.pos.z - Math.cos(P.yaw) * 6); }
    if (d < 3.5) m.coming = false;
    else { const sp = Math.min(13, 3 + d * 0.9); m.vel.x = dx / d * sp; m.vel.z = dz / d * sp; m.yaw = Math.atan2(dx, dz); }
  } else if (pipHome() && !m.called) pipPlay(m, dt);
  else { m.vel.x *= 0.85; m.vel.z *= 0.85; }
  if (!P.riding) {
    m.pos.x += m.vel.x * dt; m.pos.z += m.vel.z * dt;
    world.col.resolve(m.pos, 1.0, 2.2);
    m.pos.y = world.col.ground(m.pos.x, m.pos.z, m.pos.y + 1);
  }
  m.actor.root.position.copy(m.pos);
  if (!P.riding && m.hop) m.actor.root.position.y += m.hop;
  m.actor.root.rotation.y = m.yaw;
  m.atkCd = Math.max(0, (m.atkCd || 0) - dt); m.atk = Math.max(0, (m.atk || 0) - dt);
  // in the air she leans into the swing: nose along the way she's going, rolled toward the vine
  const R0 = m.actor.root; R0.rotation.order = 'YXZ';
  const airborne = P.riding && !P.onGround, hv = Math.hypot(P.vel.x, P.vel.z);
  m.air = damp(m.air || 0, airborne ? 1 : 0, 8, dt);
  let pitch = 0, roll = 0;
  if (airborne) {
    pitch = clamp(-Math.atan2(P.vel.y, Math.max(hv, 1)) * 0.6, -0.7, 0.7);
    const H = heldVines();
    if (H.length) {   // roll toward the anchor (between the two, holding both)
      const ax = H.reduce((s, v) => s + v.A.x, 0) / H.length - P.pos.x, az = H.reduce((s, v) => s + v.A.z, 0) / H.length - P.pos.z, side = ax * Math.cos(P.yaw) - az * Math.sin(P.yaw);
      roll = clamp(-side * 0.04, -0.5, 0.5);
    }
  }
  R0.rotation.x = damp(R0.rotation.x, pitch, 8, dt); R0.rotation.z = damp(R0.rotation.z, roll, 8, dt);
  // the grabbing vine: a real leg reaching out to where it caught (or slapped, or missed)
  let grab = null;
  R0.updateMatrixWorld(true);
  if (P.riding && P.climb) {
    const C = P.climb, held = Object.values(C.grabs || {});
    if (held.length) grab = held.map(p => ({ p: R0.worldToLocal(p.clone()), k: 1 }));   // her two vines, one over the other, where each caught
    else { const c = C.c, [cx, cz] = c.at(P.pos.y + 2); grab = { p: R0.worldToLocal(V3(cx + Math.cos(C.phi) * c.rad(P.pos.y + 2, C.phi), P.pos.y + 2.4, cz + Math.sin(C.phi) * c.rad(P.pos.y + 2, C.phi))), k: 1 }; }
  }
  else if (P.riding && vineOn()) grab = [P.vines.L, P.vines.R].filter(Boolean).map(v => ({ p: R0.worldToLocal(v.A.clone()), k: v.yank != null ? v.yank / 0.22 : v.k }));
  else if (P.riding && P.slap) {
    P.slap.t += dt; const k = P.slap.t / (P.slap.miss ? 0.45 : 0.3);
    if (k >= 1) P.slap = null; else grab = { p: R0.worldToLocal(P.slap.p.clone()), k: Math.sin(k * Math.PI) };
  }
  m.actor.animate(dt, { speed: P.riding ? (P.onGround ? hv : 0) : Math.hypot(m.vel.x, m.vel.z), t: G.t, attack: m.atk > 0 ? m.atk / 0.5 : 0, windup: 0, grabs: Array.isArray(grab) ? grab : grab ? [grab] : null, air: P.riding ? m.air : 0 });

  // the rider sits in the saddle itself: carried by her body as it bobs and rolls, giving with it a little
  if (P.riding && m.actor.body && m.actor.cfg) {
    const cf = m.actor.cfg, b = m.actor.body, T = torcain.root;
    b.updateMatrixWorld(true);
    T.position.copy(b.localToWorld(_seatV.set(0, cf.R * cf.sq + cf.R * 0.07, -cf.R * 0.15)));
    T.position.y -= RIDER_HIP * T.scale.y;
    b.getWorldQuaternion(_seatQ); _yawQ.setFromAxisAngle(_UP, P.yaw); T.quaternion.copy(_yawQ).slerp(_seatQ, 0.65);
    m.gait = clamp((b.position.y - cf.bodyY) / (cf.R * 0.08), 0, 1.2);
  }
}
/* once her shed is built, your own Punk lives there: she dozes in it or plays round about it — little runs, hops,
   nosing about — until you whistle for her (H) or ride her off. Left somewhere else, she wanders home after a while. */
function pipHome() { return REGION === 'property' && ownPunk() && F_.stall ? F_.stall : null; }
function pipPlay(m, dt) {
  const H = pipHome(), dx0 = H.x - m.pos.x, dz0 = H.z - m.pos.z, dHome = Math.hypot(dx0, dz0);
  const S = m.play || (m.play = { tgt: null, wait: 2, away: 0 });
  S.away = P.pos.distanceTo(m.pos) > 22 ? S.away + dt : 0;
  let tgt = S.tgt, sp = 0;
  if (dHome > 16 && S.away > 8) tgt = S.tgt = V3(H.x + Math.sin(H.yaw || 0) * 0.5, 0, H.z + Math.cos(H.yaw || 0) * 0.5);   // trotting home
  if (dHome <= 16 || tgt) {
    if (S.wait > 0) S.wait -= dt;
    else if (!tgt) {
      const r = Math.random();
      if (r < 0.3) tgt = V3(H.x, 0, H.z);                                                     // back into the shed for a doze
      else { const a = Math.random() * Math.PI * 2, d = 4 + Math.random() * 9; tgt = V3(H.x + Math.cos(a) * d, 0, H.z + Math.sin(a) * d); }
      S.tgt = tgt; S.run = Math.random() < 0.4;
    }
    if (tgt && S.wait <= 0) {
      const dx = tgt.x - m.pos.x, dz = tgt.z - m.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.8) { S.tgt = null; S.wait = Math.hypot(tgt.x - H.x, tgt.z - H.z) < 1 ? 8 + Math.random() * 14 : 1.5 + Math.random() * 4; }
      else { sp = S.run ? 6.5 : 2.4; m.yaw = dampAngle(m.yaw, Math.atan2(dx, dz), 6, dt); }
    }
  }
  m.vel.x = damp(m.vel.x, Math.sin(m.yaw) * sp, 6, dt); m.vel.z = damp(m.vel.z, Math.cos(m.yaw) * sp, 6, dt);
  // playing: little bounces as she runs
  m.hop = S.run && sp > 0 ? Math.abs(Math.sin(G.t * 7)) * 0.35 * m.scale : 0;
}
let turnRate = 0;
const RIDER_HIP = 0.76, _seatV = V3(), _seatQ = new THREE.Quaternion(), _yawQ = new THREE.Quaternion(), _UP = V3(0, 1, 0);

/* ---------------- climbing the great trees ----------------
   Any trunk too big to put your arms round — the deepwood's giants, the colossi —
   can be climbed: against it, Space takes hold. Then it's hand over hand: left click,
   right click, one over the other, each one a reach up the bark and a haul. On your
   Punk it's vine over vine — she throws one up the trunk, catches, hauls, throws the
   other — a long way each time. S slides back down, A / D work round it, Space leaps
   off (hold it to glide down). Clicking the same side twice only half-reaches. */
const climbables = [];
{
  for (const t of world.trees || []) if ((t.r || 0) >= 1.6 && (t.h || 0) >= 25) climbables.push({ x: t.x, z: t.z, g: t.g, top: t.g + t.h * 0.85, at: () => [t.x, t.z], rad: (y) => t.r * (1 - 0.28 * clamp((y - t.g) / t.h, 0, 1)) });
  for (const W of world.colossi || []) {
    const C = (COLOSSI || []).find(c => c.id === W.id);
    if (!C || !C.trunkR) continue;
    climbables.push({ x: W.x, z: W.z, g: W.g, top: W.g + W.H * 0.8, big: true, at: y => C.trunkAt(y), rad: (y, phi) => C.trunkR(clamp((y - W.g) / W.H, 0, 1), phi) });
  }
}
function tryClimb(wish) {
  if (P.flying || P.swimming || interiors.inside) return false;
  const reach = P.riding ? 2.6 : 1.1;
  for (const c of climbables) {
    if (Math.abs(c.x - P.pos.x) > 120 || Math.abs(c.z - P.pos.z) > 120) continue;
    const [cx, cz] = c.at(P.pos.y), dx = P.pos.x - cx, dz = P.pos.z - cz, d = Math.hypot(dx, dz), phi = Math.atan2(dz, dx);
    if (d > c.rad(P.pos.y, phi) + reach + (c.big ? 2 : 0)) continue;
    if (P.pos.y > c.top - 1) continue;
    P.climb = { c, phi, y: Math.max(P.pos.y, c.g) + 0.3 };
    dropVines(); P.vel.set(0, 0, 0); P.onGround = false; sfx.jump();
    P.climb.last = null; P.climb.grabs = {};
    if (!F_.climbTold2) { F_.climbTold2 = true; persist(); hint(P.riding ? 'Climbing — left click, right click: vine over vine up the trunk · S slides down · A / D round it · Space to leap off.' : 'Climbing — left click, right click: hand over hand up the bark · S slides down · A / D round it · Space to leap off.'); }
    return true;
  }
  return false;
}
function climbGrab(side) {
  const C = P.climb; if (!C || !canAct()) return;
  if (C.pull && C.pull.t < C.pull.dur * 0.7) return;                       // still hauling on the last one
  const c = C.c, alt = C.last !== side, rid = !!P.riding;
  const step = (rid ? 3.4 : 1.25) * (alt ? 1 : 0.4);
  C.last = side;
  const y1 = Math.min(c.top, C.y + step), R = Math.max(2, c.rad(C.y, C.phi)), phi1 = C.phi + (side === 'L' ? -1 : 1) * (rid ? 0.55 : 0.3) / R;
  C.pull = { y0: C.y, y1, p0: C.phi, p1: phi1, t: 0, dur: rid ? 0.34 : 0.4 };
  // where it caught: up the bark, a little to that side
  const gy = y1 + (rid ? 3.4 : 1.9), [gx, gz] = c.at(gy), gr = c.rad(gy, phi1) + 0.05;
  C.grabs[side] = V3(gx + Math.cos(phi1) * gr, gy, gz + Math.sin(phi1) * gr);
  sfx.swing(); if (rid) setTimeout(() => sfx.hit(), 90);
  particles.burst(C.grabs[side].x, C.grabs[side].y, C.grabs[side].z, 6, { color: rid ? 0x9ad86a : 0x8a7a5a, speed: 2, size: 0.3, life: 0.4 });
  if (!alt && !C.toldAlt) { C.toldAlt = true; hint(rid ? 'The other vine — left, right, left: one over the other.' : 'The other hand — left, right, left.'); }
  if (y1 >= c.top - 0.01 && C.y >= c.top - 0.01) toast('As high as the bark goes — Space to leap off.', 2);
}
function climbTick(dt, act) {
  const C = P.climb, c = C.c;
  let up = 0, round = 0;
  if (act) { if (keys.KeyS || keys.ArrowDown) up -= 1; if (keys.KeyA || keys.ArrowLeft) round -= 1; if (keys.KeyD || keys.ArrowRight) round += 1; if (touch.on) { up += Math.min(0, touch.move.y); round += touch.move.x; } }
  if (act && (keys.KeyW || keys.ArrowUp) && !C.toldW) { C.toldW = true; hint('Left click, right click to climb — one over the other.'); }
  const sp = P.riding ? 8 : 2.8;
  const R0 = c.rad(C.y, C.phi) + (P.riding ? 1.4 : 0.55);
  if (C.pull) {   // the haul: up to where the hand (or vine) caught, quick at first and settling in
    const Q = C.pull; Q.t += dt; const k = Math.min(1, Q.t / Q.dur), e = 1 - Math.pow(1 - k, 3);
    C.y = lerp(Q.y0, Q.y1, e); C.phi = lerp(Q.p0, Q.p1, e);
    if (k >= 1) C.pull = null;
  } else C.y = clamp(C.y + up * sp * 1.4 * dt, c.g - 2, c.top);              // sliding back down
  C.phi += round * (sp * 0.9) / Math.max(2, R0) * dt;
  const [cx, cz] = c.at(C.y), R = c.rad(C.y, C.phi) + (P.riding ? 1.4 : 0.55);
  P.pos.set(cx + Math.cos(C.phi) * R, C.y, cz + Math.sin(C.phi) * R);
  P.vel.set(0, 0, 0);
  P.yaw = Math.atan2(cx - P.pos.x, cz - P.pos.z);
  CAM.yaw = dampAngle(CAM.yaw, Math.atan2(Math.cos(C.phi), Math.sin(C.phi)), 3, dt);   // the camera swings round outside the trunk, behind him
  C.moving = !!C.pull || Math.abs(up) + Math.abs(round) > 0.1;
  for (const k in C.grabs) if (Math.abs(C.grabs[k].y - C.y) > 8) delete C.grabs[k];   // slid well below where it caught: let it go
  if (C.moving && Math.random() < 0.25) particles.emit(P.pos.x, P.pos.y + 0.5, P.pos.z, { color: 0x8a7a5a, size: 0.25, life: 0.5, speed: 1 });
  // back to the ground at the foot of it; or leap off
  const g = world.col.ground(P.pos.x, P.pos.z, P.pos.y + 0.5);
  if (up < 0 && P.pos.y <= g + 0.05) { P.climb = null; P.pos.y = g; P.onGround = true; return; }
  torcain.root.position.copy(P.pos);
  if (P.riding) torcain.root.position.y += mount ? mount.seat : 1.35;
  torcain.root.rotation.y = P.yaw;
  torcain.animate(dt, { speed: P.riding ? 0 : (C.moving ? 2.2 : 0), onGround: true, t: G.t, swing: null, ride: !!P.riding, rideBob: mount ? mount.gait || 0 : 0 });
  if (P.jumpBuf > 0) {
    P.jumpBuf = 0; P.climb = null;
    const out = V3(Math.cos(C.phi), 0, Math.sin(C.phi));
    P.vel.set(out.x * 7, 6, out.z * 7); P.yaw = Math.atan2(out.x, out.z); P.onGround = false; P.airT = 0; sfx.jump();
  }
}

/* ---------------- gliding: arms flung out, the cape stretched between them ----------------
   The wing is the cape itself (actors.js): he lays out flat like a hero in the old songs and the cloth fills the
   space from wrist to wrist and down to his ankles. This empty marker only tells the rig he's gliding. */
const glider = new THREE.Group();
glider.visible = false; torcain.root.add(glider);
/* what he wears: a cloak, something on the body, on the hands, on the feet (the Gear page). The cloak is what he
   glides with — young Tanoc can't glide without one; Torcain always has his coat. */
const WEAR_SLOTS = [['cloak', 'Cloak'], ['body', 'Body'], ['hands', 'Hands'], ['feet', 'Feet']];
// young Tanoc and Torcain grown share a pack, but each dresses for himself
function wearSet() { return young() ? (SAVE.inv.wear = SAVE.inv.wear || {}) : (SAVE.inv.wearT = SAVE.inv.wearT || {}); }
function wearing(slot) { const w = wearSet(); return w[slot] && SAVE.inv.items[w[slot]] ? w[slot] : null; }
const canGlide = () => !!wearing('cloak');
/* later in the tale: Torcain's own days, or young Tanoc home again after the Megla Aagac. Relic armor waits for it. */
const laterGame = () => !young() || F_.megla === 'done';
// a Relic you hold — in your hand, or bound into something you wear
const relicHeld = id => hasItem(id) || Object.keys(SAVE.inv.items).some(k => ITEMS[k] && ITEMS[k].bound === id && SAVE.inv.items[k] > 0);
/* what he has on is what you see: each slot shows on him while it's worn, and is gone when it's taken off */
function applyWear() {
  const spec = slot => { const w = wearing(slot); return w ? { c: ITEMS[w].color ?? 0x7a5a3a, look: ITEMS[w].look, glow: ITEMS[w].glow } : null; };
  const cl = wearing('cloak');
  torcain.setCape(cl ? ITEMS[cl].color ?? 0x9a3a1a : null);
  torcain.setOutfit({ body: spec('body'), hands: spec('hands'), feet: spec('feet'), cloakLook: cl ? ITEMS[cl].look : null, cloakGlow: cl ? ITEMS[cl].glow : null });
}
applyWear();


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
/* ================================================================
   QUICK SLOTS — Q and 1–6. Put whatever you like on them: a Relic
   whose trigger you've worked out, a learned spell, a throw, a
   drink. Change them in the book (I → Gear).
   ================================================================ */
const SLOT_KEYS = ['KeyQ', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];
const slotLabel = code => code === 'KeyQ' ? 'Q' : code.replace('Digit', '');
const hasItem = id => (SAVE.inv.items[id] || 0) > 0;
const knowsTrigger = id => !!SAVE.triggers[id];
P.slotCd = {};
const SLOT_ACTIONS = {
  r_firestone: { name: 'Fire-stone', icon: '🔥', kind: 'Relic', cd: 1.6, desc: 'Set a pebble in the dip: it flies in a streak of flame.',
    ok: () => relicHeld('r_firestone') && knowsTrigger('r_firestone'), use: () => fireStone() },
  r_longevity: { name: 'Humming stone', icon: '🔵', kind: 'Relic', cd: 45, desc: 'Hold it to your chest and breathe slow: a second wind — stamina back, and a little health.',
    ok: () => relicHeld('r_longevity') && knowsTrigger('r_longevity'), use: () => secondWind() },
  tukang: { name: 'Tukang flare', icon: '☀', kind: 'Relic', desc: 'Torcain’s Relic of fire, speed and heat. Fight to build heat, then let it go.',
    ok: () => !young(), use: () => tukangFlare(), frac: () => 1 - P.heat / 100 },
  ...Object.fromEntries(SPELL_ORDER.map(id => [id, { name: SPELLS[id].name, icon: SPELLS[id].icon, kind: 'Spell', desc: SPELLS[id].desc,
    ok: () => !young() && !!SAVE.skills.spells[id], use: () => castSpell(id), frac: () => (P.spellCd[id] || 0) / (SPELLS[id].cd * cdMul()) }])),
  sprengju: { name: 'Throw a Sprengju', icon: '🧨', kind: 'Throw', desc: 'Bursts where it lands.', ok: () => hasItem('sprengju'), use: () => throwSprengju() },
  film: { name: 'Albali film', icon: '🧪', kind: 'Drink', desc: 'Drink a flask of film to heal.', ok: () => !young(), use: () => drinkFilm() },
  hlyst: { name: 'Nur’Hlyst', icon: '✺', kind: 'Gift', desc: 'The golden pulse: hidden things answer.', ok: () => canHlyst(), use: () => nurHlyst() },
};
const slotChoices = () => Object.entries(SLOT_ACTIONS).filter(([, a]) => a.ok()).map(([id, a]) => ({ id, ...a }));
function assignSlot(code, id) {
  if (!SLOT_KEYS.includes(code)) return;
  if (id && (!SLOT_ACTIONS[id] || !SLOT_ACTIONS[id].ok())) return;
  for (const k of SLOT_KEYS) if (id && SAVE.slots[k] === id) delete SAVE.slots[k];   // one thing, one slot
  if (id) SAVE.slots[code] = id; else delete SAVE.slots[code];
  renderSpellBar(); persist();
}
/* a Relic whose trigger you've just found goes onto the first empty slot, if there is one */
function learnTrigger(id) {
  if (SAVE.triggers[id]) return;
  SAVE.triggers[id] = true;
  const free = SLOT_KEYS.find(k => !SAVE.slots[k]);
  if (free && !Object.values(SAVE.slots).includes(id)) { SAVE.slots[free] = id; setTimeout(() => toast(`${SLOT_ACTIONS[id].name} is on ${slotLabel(free)} — change your quick slots in the book (I).`, 4), 1200); }
  renderSpellBar(); persist();
}
function useSlot(code) {
  const id = SAVE.slots[code];
  if (!id) { toast(`Nothing on ${slotLabel(code)} — set your quick slots in the book (I → Gear).`, 2.2); return; }
  const a = SLOT_ACTIONS[id];
  if (!a || !a.ok()) { toast(a && a.kind === 'Relic' ? `You don’t have the ${a.name}’s trigger.` : 'That isn’t ready.', 2); return; }
  if (a.cd && (P.slotCd[id] || 0) > 0) return;
  if (a.use() === false) return;
  if (a.cd) P.slotCd[id] = a.cd * (a.kind === 'Relic' ? 1 : cdMul());
}
/* the fire-stone: a pebble in the dip, and away it goes in a streak of flame */
const bolts = [];
function fireStone() {
  if (!canAct()) return false;
  const dir = camForward();
  const tgt = lockPoint() || lookAim().p;   // locked on: the foe; otherwise wherever the X is
  const from = V3(P.pos.x + dir.x * 0.6, P.pos.y + 1.4, P.pos.z + dir.z * 0.6);
  const vel = tgt.clone().sub(from).normalize().multiplyScalar(34);
  P.yaw = Math.atan2(vel.x, vel.z);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), toon(0xffd060, { emissive: 0xff7a20, emissiveIntensity: 1 })));
  g.add(glowSprite(0xff8a2a, 1.8, 0.9)); g.position.copy(from); scene.add(g);
  bolts.push({ g, vel, life: 2 });
  sfx.flare();
}
function updateBolts(dt) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i]; b.life -= dt;
    const prev = b.g.position.clone();
    b.g.position.addScaledVector(b.vel, dt);
    const p = b.g.position;
    particles.emit(p.x, p.y, p.z, { vx: 0, vy: 0.4, vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: 0.45, life: 0.35, drag: 1 });
    let hit = b.life <= 0 || p.y <= world.col.ground(p.x, p.z, p.y + 0.5) + 0.05;
    if (!hit) { const f = world.col.ray(prev, p); if (f < 1) { p.lerpVectors(prev, p, f); hit = true; } }   // it stops at walls
    for (const e of enemies.list) {
      if (hit || e.dead || Math.hypot(e.pos.x - p.x, e.pos.y + 0.8 - p.y, e.pos.z - p.z) > e.T.rad + 1) continue;
      enemies.damage(e, 22 * (young() ? 1 : axeMul()), P.pos, 4, { stun: 0.4, burn: true }); hit = true;
    }
    if (!hit && boss && !boss.dead && boss.pos && boss.pos.distanceTo(p) < 3) { damageBoss(30); hit = true; }
    if (hit) { particles.burst(p.x, p.y, p.z, 18, { color: 0xff8a2a, speed: 5, size: 0.4, life: 0.5 }); scene.remove(b.g); bolts.splice(i, 1); }
  }
}
/* the humming stone: a second wind */
function secondWind() {
  P.stam = P.stamMax; P.exhausted = false; P.hp = Math.min(P.maxHp, P.hp + 15);
  particles.ring(P.pos.x, P.pos.y + 1, P.pos.z, 30, 3, { color: 0x5aa0ff, size: 0.5, life: 0.9 });
  sfx.heal(); toast('The stone hums against your chest. Breath comes easy again.', 2.2);
}
function renderSpellBar() {
  $('spells').innerHTML = SLOT_KEYS.map(code => {
    const a = SLOT_ACTIONS[SAVE.slots[code]];
    return `<div class="ab brass${a ? '' : ' empty'}" data-slot="${code}" id="slot-${code}" title="${a ? a.name : 'Empty — set it in the book (I)'}">${a ? a.icon : '·'}<span class="key">${slotLabel(code)}</span><div class="cd"></div></div>`;
  }).join('');
}
function updateSlotHud(dt) {
  for (const id in P.slotCd) P.slotCd[id] = Math.max(0, P.slotCd[id] - dt);
  for (const code of SLOT_KEYS) {
    const el = $('slot-' + code); if (!el) continue;
    const id = SAVE.slots[code], a = SLOT_ACTIONS[id];
    const frac = !a ? 0 : !a.ok() ? 1 : a.frac ? a.frac() : a.cd ? (P.slotCd[id] || 0) / a.cd : 0;
    el.querySelector('.cd').style.transform = `scaleY(${clamp(frac, 0, 1)})`;
    el.classList.toggle('locked', !!a && !a.ok());
  }
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
  unlockMouse();
  book.open(tab);
}
function bookAct(act, arg) {
  const inv = SAVE.inv;
  if (act === 'equip') { inv.axe = arg; restyleAxe(); sfx.ui(); }
  else if (act === 'trinket') { if (inv.trinkets.length >= 2) inv.trinkets.shift(); inv.trinkets.push(arg); sfx.ui(); }
  else if (act === 'untrinket') { inv.trinkets = inv.trinkets.filter(t => t !== arg); }
  else if (act === 'wear') { wearSet()[ITEMS[arg].slot] = arg; applyWear(); sfx.ui(); }
  else if (act === 'unwear') { delete wearSet()[arg]; applyWear(); sfx.ui(); }
  else if (act === 'bind') {   // the Carpenter binds a Relic into a piece you wear
    const [relic, base] = arg.split('='), out = bindId(relic, base);
    if (ITEMS[out] && (inv.items[relic] || 0) > 0 && (inv.items[base] || 0) > 0 && (inv.items.ore || 0) > 0) {
      const W = wearSet(), wasOn = W[ITEMS[base].slot] === base;
      for (const k of [relic, base, 'ore']) { inv.items[k]--; if (inv.items[k] <= 0) delete inv.items[k]; }
      invAddRaw(inv, out, 1); if (wasOn) W[ITEMS[base].slot] = out;
      for (const k of SLOT_KEYS) if (SAVE.slots[k] === relic && !SLOT_ACTIONS[relic].ok()) delete SAVE.slots[k];
      applyWear(); renderSpellBar(); sfx.flare(); xp(80); persist();
      dialog([['tale', `He works the ${ITEMS[relic].name} into the ${ITEMS[base].name} with a little stygian, humming the Hurst's own song under his breath, until it settles. When he hands it back, it is warm, and faintly lit from inside.`], ['buhkon', 'There. It’ll answer you the same as before — it just lives in that now. Treat it kindly.']]);
    }
  }
  else if (act === 'slot') { const [code, id] = arg.split('='); assignSlot(code, id || null); sfx.ui(); }
  else if (act === 'pouch') {
    const d = SAVE.dya; if (!d) return;
    const i = d.pouch.indexOf(arg);
    if (i >= 0) { if (d.pouch.length <= 1) toast('Keep at least one token in your pouch.', 2); else d.pouch.splice(i, 1); }
    else if (d.pouch.length >= 25) toast('Your pouch is full (25).', 2);
    else d.pouch.push(arg);
  } else if (act === 'sing') { singToken(arg); }
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
    if (r && !(r.later && !laterGame()) && G.shards >= r.shards && takeAll(inv, r.need)) { G.shards -= r.shards; invAddRaw(inv, arg, 1); if (ITEMS[arg].kind === 'axe') { inv.axe = arg; restyleAxe(); } else if (ITEMS[arg].slot) { wearSet()[ITEMS[arg].slot] = arg; applyWear(); } sfx.flare(); xp(60); toast(`Forged: ${ITEMS[arg].name}${ITEMS[arg].relicArmor ? ' — Relic armor' : ''}`, 2.5); }
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
  if (blade && young() && !(it && it.color)) { blade.material.color.setHex(0x9a9aa2); blade.material.emissiveIntensity = 0; }   // the Carpenter's plain hatchet
  if (torcain.weapon.userData.glow) torcain.weapon.userData.glow.visible = !young();
  torcain.weapon.scale.setScalar(1 + ((it && it.dmg) || 1) * 0.1 - 0.1);
}
restyleAxe();

function mapMarkers() {
  const m = [];
  for (const l of lanterns) m.push({ x: l.x, z: l.z, ch: '◉', col: lanternLit(l) ? '#bfeaff' : '#5a6a7a', size: 15, label: lanternLit(l) ? l.name : null, travel: lanternLit(l) ? l.id : null });
  if (camp) m.push({ x: world.camp.x, z: world.camp.z, ch: '⌂', col: '#ffd27a', size: 20, label: 'Camp' });
  if (REGION === 'xilia') {
    m.push({ x: world.PLAZA.x, z: world.PLAZA.z, ch: '⌂', col: '#ffd27a', size: 20, label: 'Beuhk' });
    for (const n of npcs) if (!n.def.wander) m.push({ x: n.pos.x, z: n.pos.z, ch: '●', col: '#e8d8a8', size: 11 });
  }
  for (const t of feats.trials) m.push({ x: t.x, z: t.z, ch: '▲', col: t.done ? '#6a7a6a' : '#7ad8ff', size: 15 });
  const o = objectivePoint(); if (o) m.push({ x: o.p.x, z: o.p.z, ch: '◆', col: '#f3cf7a', size: 18 });
  for (const e of enemies.list) if (!e.dead && ((e.stray && SAVE.quests.q_strays === 'active') || (e.pet && SAVE.quests.q_fennek === 'active') || (e.pup && SAVE.quests.q_pups === 'active'))) m.push({ x: e.pos.x, z: e.pos.z, ch: '✦', col: '#ff9ad0', size: 15 });
  for (const c of crates) if (c.mesh.visible) m.push({ x: c.x, z: c.z, ch: '✦', col: '#ff9ad0', size: 15 });
  for (const pg of pages) if (pg.mesh.visible && SAVE.quests.q_pages === 'active') m.push({ x: pg.x, z: pg.z, ch: '✦', col: '#ff9ad0', size: 15 });
  if (board) m.push({ x: board.x, z: board.z, ch: '▤', col: '#e8c890', size: 15, label: 'Bounties' });
  if (SAVE.quests.q_skorthal === 'active' && skor && !SAVE.counters.skorthal) m.push({ x: skor.pos.x, z: skor.pos.z, ch: '✦', col: '#9af0a0', size: 18, label: 'Skor’Thal' });
  if (lostMark) m.push({ x: lostMark.position.x, z: lostMark.position.z, ch: '✦', col: '#d8b8ff', size: 15, label: 'Lost shards' });
  for (const ps of passes) { const q = ps.point(ps.r1); m.push({ x: q.x, z: q.z, ch: '⛰', col: passOpen(ps) ? '#f3cf7a' : '#7a6a5a', size: 18, label: passOpen(ps) ? `${ps.name} → ${REGION_NAME[ps.to]}` : `${ps.name} (rockfall)` }); }
  for (const ex of world.exits || []) m.push({ x: ex.x, z: ex.z, ch: '➜', col: '#f3cf7a', size: 18, label: `${ex.name} → ${ex.dest || REGION_NAME[ex.to]}` });
  if (REGION === 'property') for (const k of ['house', 'yard', 'dock', 'outcrop']) { const st = world.SITES[k]; if (st) m.push({ x: st.x, z: st.z, ch: k === 'house' ? '⌂' : '·', col: '#ffd27a', size: k === 'house' ? 20 : 16, label: st.name }); }
  m.push(...wilds.markers());
  return m;
}
/* ---------------- the ShurgrEdan: kill a RubberMcFly and it answers before the day is out ---------------- */
function shurgrEdanCalled(e) {
  if (G.shurgr) return;
  G.shurgr = { t: 9 + Math.random() * 7 };
  SAVE.counters.mcfly = (SAVE.counters.mcfly || 0) + 1; persist();
  dialog(STORY.SHURGREDAN.warn.map(l => ['phorus', l]));
}
const shurgrFx = [];
function updateShurgrEdan(dt) {
  for (let i = shurgrFx.length - 1; i >= 0; i--) {
    const f = shurgrFx[i]; f.t += dt;
    const k = f.t < 0.35 ? f.t / 0.35 : Math.max(0, 1 - (f.t - 0.35) / 1.9);
    f.grp.children.forEach((c, j) => { if (c.material) c.material.opacity = k * (j < 3 ? 0.9 : 0.6); });
    if (f.t > 2.4) { scene.remove(f.grp); shurgrFx.splice(i, 1); }
  }
  if (!G.shurgr || G.mode !== 'play' || G.paused || P.dead || P.flying || G.inMemory) return;
  if ((G.shurgr.t -= dt) > 0) return;
  G.shurgr = null;
  // a claw of light out of a quiet sky: three talons that meet where Torcain stands
  const grp = new THREE.Group(), x = P.pos.x, y = P.pos.y, z = P.pos.z;
  for (let i = -1; i <= 1; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 2.2, 140, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3c8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.position.set(x + i * 7, y + 70, z + i * 2); m.rotation.z = -i * 0.05; grp.add(m);
  }
  const flash = glowSprite(0xfff3c8, 14, 0); flash.position.set(x, y + 2, z); flash.material.fog = false; grp.add(flash);
  scene.add(grp); shurgrFx.push({ grp, t: 0 });
  particles.burst(x, y + 1, z, 70, { color: 0xffe8a8, speed: 14, size: 0.8, life: 1.2, gravity: 3 });
  sfx.slam(); G.hitstop = 0.25; if (sky) sky.flash = 1;
  const dmg = Math.round(P.maxHp * 0.7);
  P.hp -= dmg; P.lastHurt = G.t; dmgNumber(x, y + 2.6, z, dmg, 'hurt');
  toast(STORY.SHURGREDAN.strike, 3.5);
  if (P.hp <= 0) { if (D === DIFFICULTY.realistic) { P.hp = 0; playerDown(); return; } P.hp = 1; }
  setTimeout(() => bark('phorus', STORY.SHURGREDAN.after, 4), 1800);
}

/* ---------------- the Sunear'Zikhron: the Waves of Memory pass over now and then ---------------- */
const sunear = createSunear({ scene, particles, world, region: REGION });
const STORM_FOG = new THREE.Color(0x8a7aa8), STORM_SKY = new THREE.Color(0xc8b4ff);
const DEEP_FOG = new THREE.Color(0x0c2224), DEEP_SKY = new THREE.Color(0x5ac8b8), DEEP_GND = new THREE.Color(0x1a3a2a);
if (SAVE.sunearAt == null) SAVE.sunearAt = (SAVE.time || 0) + 420 + Math.random() * 300;
const pick1 = a => a[Math.floor(Math.random() * a.length)];
function stormMayCome() {
  return G.mode === 'play' && !G.paused && !P.dead && !G.bossActive && !dyaMatch && !G.inMemory && !P.flying
    && (REGION !== 'xilia' || (F_.tut || 0) >= 5) && !young();
}
function startStorm() {
  if (sunear.active) return;
  sunear.start(P.pos, 170);
  G.eyeT = 0; G.eyeLost = 0; G.eyeDone = false; G.eyeSeen = false; G.stormLines = 0;
  showLocation('The Sunear’Zikhron', 'the Waves of Memory');
  bark('phorus', pick1(STORY.SUNEAR.arrive), 5);
  // RubberMcFly come out to play in it — the only time they ever glow
  const near = enemies.list.filter(e => e.kind === 'rubbermcfly' && !e.dead && e.pos.distanceTo(P.pos) < 90).length;
  for (let i = near; i < 5; i++) {
    const a = Math.random() * Math.PI * 2, d = 12 + Math.random() * 30, x = P.pos.x + Math.cos(a) * d, z = P.pos.z + Math.sin(a) * d;
    if (world.inBounds && !world.inBounds(x, z)) continue;
    enemies.spawn('rubbermcfly', x, z, 'sunear', { wild: true });
  }
}
function updateStorm(dt) {
  if (!sunear.active && stormMayCome() && SAVE.time > SAVE.sunearAt) startStorm();
  const was = sunear.active;
  sunear.update(dt, G.t, camera.position);
  if (was && !sunear.active) {
    SAVE.sunearAt = SAVE.time + 1080 + Math.random() * 720;
    bark('phorus', STORY.SUNEAR.passed, 3.5); persist();
  }
  const k = sunear.k;
  if (k > 0) {   // the land dims and goes violet under the waves
    if (scene.fog) scene.fog.color.lerp(STORM_FOG, k * 0.55);
    sun.intensity *= 1 - 0.55 * k;
    hemi.color.lerp(STORM_SKY, k * 0.35);
    bloom.strength += 0.35 * k;
  }
  if (!sunear.active || G.mode !== 'play') return;
  // what Phorus notices, once each
  if (k > 0.8 && G.stormLines === 0) { G.stormLines = 1; setTimeout(() => bark('phorus', STORY.SUNEAR.mcfly, 4), 2500); }
  if (sunear.eyeOn && !G.eyeSeen) { G.eyeSeen = true; bark('phorus', STORY.SUNEAR.eye, 6); }
  if (G.eyeDone || !sunear.eyeOn) return;
  // keep pace with the eye: twenty breaths inside it, a few steps' grace if you slip out
  if (sunear.inEye(P.pos)) {
    G.eyeT += dt; G.eyeLost = 0;
    const sec = Math.floor(G.eyeT);
    if (sec !== G.eyeShown) { G.eyeShown = sec; toast(`Keeping pace with the eye — ${Math.min(sec, EYE_NEED)} / ${EYE_NEED}`, 1.2); }
    if (G.eyeT >= EYE_NEED) prophecy();
  } else if (G.eyeT > 0) {
    G.eyeLost += dt;
    if (G.eyeLost > 3) { G.eyeT = 0; G.eyeShown = -1; bark('phorus', STORY.SUNEAR.lost, 2.5); }
  }
}
const EYE_NEED = 20;
function prophecy() {
  G.eyeDone = true;
  SAVE.prophecies = SAVE.prophecies || [];
  const pool = STORY.PROPHECY[REGION] || STORY.PROPHECY.aakalay;
  const fresh = pool.filter(l => !SAVE.prophecies.includes(l));
  const line = fresh.length ? fresh[0] : pick1(pool);
  if (!SAVE.prophecies.includes(line)) SAVE.prophecies.push(line);
  P.hp = P.maxHp; P.stam = P.stamMax; P.poison = 0;
  G.shards += 30; xp(60); sfx.core();
  particles.burst(P.pos.x, P.pos.y + 1.5, P.pos.z, 50, { color: 0xfff0c8, speed: 6, size: 0.5, life: 1.2, gravity: -2 });
  persist();
  dialog([['eye', line], ['phorus', pick1(STORY.SUNEAR.after)]], () => { sunear.end(); toast('A true prophecy, written in the Rokarvac. +30 shards', 3); });
}

/* ---------------- mountain passes: walk out along the road and the next region loads ---------------- */
const REGION_NAME = { xilia: 'Beuhk', aakalay: 'The Ruins of Aakalay', leotik: 'Leotik', property: 'The Carpenter’s Property' };
const passOpen = ps => ps.to !== 'aakalay' || !!F_.xdone;    // the road to the Reach opens once the story has taken you there
function signTexture(lines) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#6b4a2c'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#3a2614'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 120);
  x.fillStyle = '#f4e2b8'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 30px Georgia, serif'; x.fillText(lines[0], 128, 46);
  x.font = 'italic 22px Georgia, serif'; x.fillText(lines[1], 128, 88);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const passes = (world.passes || []).map(ps => {
  const open = passOpen(ps), grp = new THREE.Group(), stone = toon(0x8a8478), stoneD = toon(0x6e6a62);
  const at = (s, l) => { const q = ps.point(s, l); return V3(q.x, world.heightAt(q.x, q.z), q.z); };
  // cairns with a Nur-lamp on top either side of where the road leaves the land
  for (const side of [-1, 1]) {
    const b = at(ps.r0 + 8, side * (ps.w + 1.2));
    for (let k = 0; k < 4; k++) {
      const r = 0.9 - k * 0.17, m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), k % 2 ? stoneD : stone);
      m.position.set(b.x + (Math.random() - 0.5) * 0.2, b.y + 0.5 + k * r * 1.3, b.z + (Math.random() - 0.5) * 0.2); m.rotation.set(k, k * 2, 0); grp.add(m);
    }
    const lamp = glowSprite(0xffc870, 2.2, 0.85); lamp.position.set(b.x, b.y + 4.4, b.z); grp.add(lamp);
    world.col.add(b.x, b.z, 0.8, 0.8, 0, b.y - 1, b.y + 4);
  }
  // a signpost: where the road goes
  {
    const b = at(ps.r0 + 12, ps.w - 2.2), post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3, 6), toon(0x5a3a22));
    post.position.set(b.x, b.y + 1.5, b.z); grp.add(post);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshToonMaterial({ map: signTexture([ps.name, (ps.dir ? ps.dir + ' · ' : '→ ') + REGION_NAME[ps.to]]), side: THREE.DoubleSide }));
    board.position.set(b.x, b.y + 2.5, b.z); board.rotation.y = Math.atan2(-ps.cx, -ps.sz); grp.add(board);
    world.col.add(b.x, b.z, 0.25, 0.25, 0, b.y - 1, b.y + 3);
  }
  // mist where the road tops the ridge and runs on out of sight
  // (soft grey sheets lying low over the stones; it used to be glow sprites, which read as floating orbs of light)
  for (let k = 0; k < 14; k++) {
    const m = at(ps.trigger - 6 + k * 3.5, (Math.random() - 0.5) * ps.w * 2.2), g = mistSprite(0xe6e8ea, 22 + Math.random() * 18, 6 + Math.random() * 5, 0.42);
    g.position.set(m.x, m.y + 1.6 + Math.random() * 2.5, m.z); grp.add(g);
  }
  // a closed road is blocked by an old rockfall
  if (!open) for (let k = 0; k < 9; k++) {
    const q = at(ps.gate + 3 + Math.random() * 4, (k / 8 - 0.5) * ps.w * 2), r = 1.4 + Math.random() * 1.6;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), k % 2 ? stone : stoneD); m.position.set(q.x, q.y + r * 0.6, q.z); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); grp.add(m);
  }
  outlineAll(grp, 0.05); scene.add(grp);
  return ps;
});
/* called every frame from updatePlayer, after the move */
function checkPasses(px0, pz0) {
  for (const ps of passes) {
    if (ps.lat(P.pos.x, P.pos.z) > ps.w + 3) continue;
    const s = ps.along(P.pos.x, P.pos.z);
    if (!passOpen(ps)) {
      if (s > ps.gate && ps.along(px0, pz0) <= ps.gate + 0.5) {
        P.pos.x = px0; P.pos.z = pz0; P.vel.x *= -0.2; P.vel.z *= -0.2;
        if (G.t - (P.barrierT || -99) > 6 && young()) { P.barrierT = G.t; toast(STORY.YOUNG.pass, 3.5); }
        else if (G.t - (P.barrierT || -99) > 6) { P.barrierT = G.t; bark('phorus', 'Rockfall across the Megla Pass. And it’s three days on foot to the Reach that way anyway. The Stryx is quicker.', 3); }
      }
    } else if (s > ps.trigger && G.mode === 'play') takePass(ps);
  }
}
const PASS_CARDS = {
  aakalay: ride => [ride ? 'Over the Megla Pass on Brindle’s back. Two days of mist, and Phorus singing to keep the cold off.' : 'Over the Megla Pass on foot. Three days of mist, and Phorus complaining about every one of them.', 'The Crown Ridge falls behind. The land goes grey, then ash-white. The Reach.'],
  xilia: ride => [ride ? 'Back over the Megla Pass, two days on Brindle’s back.' : 'Back over the Megla Pass, three days on foot.', 'Pine smoke, then cut Ju, then the windmill. Beuhk.'],
};
/* forest-path exits: walk on past the line and the next region loads (no ridge, no mist — just more trees) */
const exitOpen = ex => !(ex.to === 'property' && young() && F_.pro === 'beuhk' && F_.bk === 'rest');
function checkExits(px0, pz0) {
  if (!Number.isFinite(P.pos.x) || !Number.isFinite(P.pos.z) || interiors.inside) return;
  for (const ex of world.exits || []) {
    const ax = P.pos.x - ex.x, az = P.pos.z - ex.z, along = ax * ex.nx + az * ex.nz, lat = Math.abs(ax * -ex.nz + az * ex.nx);
    if (lat > ex.w || along <= 0 || along > 30 || G.mode !== 'play') continue;
    if (!exitOpen(ex)) {
      P.pos.x = px0; P.pos.z = pz0; P.vel.x *= -0.2; P.vel.z *= -0.2;
      if (G.t - (P.barrierT || -99) > 6) { P.barrierT = G.t; toast('Buhkon said to rest in town tonight. The Carpenter’s is tomorrow.', 3); }
      continue;
    }
    takeExit(ex); return;
  }
}
function takeExit(ex) {
  G.mode = 'trance'; P.vel.set(0, 0, 0);
  fade(1, 0.7);
  SAVE.lanternBy = SAVE.lanternBy || {}; SAVE.lanternBy[REGION] = SAVE.lantern;
  SAVE.region = ex.to; SAVE.lantern = SAVE.lanternBy[ex.to] || null;
  SAVE.passIn = { exit: ex.toExit, ride: !!P.riding };
  persist(); CLOUD.flush();
  try { sessionStorage.setItem('torcain-boot', 'pass'); } catch (e) { /* ignore */ }
  playCards([ex.to === 'property' ? 'Into the trees, along the forest path west…' : 'Back along the forest path, east, toward Beuhk…'], 1700, () => setTimeout(() => location.reload(), 250));
}
function takePass(ps) {
  G.mode = 'trance'; P.vel.set(0, 0, 0);
  fade(0.18, 0.9);   // not a black card: the camera pulls away up the pass while the words come
  const cards = (PASS_CARDS[ps.to] || (() => [ps.name + '.']))(!!P.riding);
  SAVE.lanternBy = SAVE.lanternBy || {}; SAVE.lanternBy[REGION] = SAVE.lantern;   // each region remembers where you last rested
  SAVE.region = ps.to; SAVE.lantern = SAVE.lanternBy[ps.to] || null;
  SAVE.passIn = { id: ps.toPass, ride: !!P.riding };
  persist(); CLOUD.flush();
  try { sessionStorage.setItem('torcain-boot', 'pass'); } catch (e) { /* ignore */ }
  cineCards(cards, 3600, P.pos, () => { fade(1, 0.4); setTimeout(() => location.reload(), 450); }, { r: 14, h: 6, look: 2, step: 0.7 });
}
/* coming in over a pass from another region: stand at the top of the road, facing into the land */
function arriveByPass() {
  const info = SAVE.passIn || {}; delete SAVE.passIn;
  if (REGION === 'aakalay' && !F_.arrivedA) { arriveAakalay(); return; }
  if (info.exit) { arriveByExit(info); return; }
  const ps = passes.find(q => q.id === info.id);
  if (!ps) { continueRun(); return; }
  const a = ps.point(ps.arrive);
  P.pos.set(a.x, world.heightAt(a.x, a.z), a.z); P.vel.set(0, 0, 0); P.lastSafe.copy(P.pos);
  P.yaw = Math.atan2(-ps.cx, -ps.sz); CAM.yaw = Math.atan2(ps.cx, ps.sz); G.t = 0;
  F.pos.copy(P.pos).add(V3(ps.cx * 2.5 - ps.sz * 2, 0, ps.sz * 2.5 + ps.cx * 2));
  if (mount) {              // Brindle came over the pass with you
    mount.pos.copy(P.pos).add(V3(-ps.sz * 3, 0, ps.cx * 3)); mount.pos.y = world.heightAt(mount.pos.x, mount.pos.z);
    if (info.ride) toggleRide();
  }
  fade(1, 0); setTimeout(() => fade(0, 1.2), 50);
  enterPlay();
  showLocation(REGION_NAME[REGION], 'by ' + ps.name);
  persist();
}

/* ---------------- the tower's telescope: the eye goes up past the roof into the open sky ----------------
   Look round with the mouse (or the stick), the wheel zooms, E / Esc / Space to come away. Nothing of the tower
   is in the way: the view is taken from above its roof, out where the real tower stands. */
let SCOPE = null;
function startScope(door) {
  if (SCOPE || !door) return;
  const g = world.heightAt(door.x, door.z), big = V3(-1500, 980, -2300);
  SCOPE = { pos: V3(door.x - Math.sin(door.yaw) * 3, g + 26, door.z - Math.cos(door.yaw) * 3), yaw: Math.atan2(big.x, big.z), pitch: 0.42, fov: 16, fov0: camera.fov, mode: G.mode };
  G.mode = 'scope'; P.vel.set(0, 0, 0);
  let el = $('scope');
  if (!el) {
    el = document.createElement('div'); el.id = 'scope';
    el.style.cssText = 'position:fixed;inset:0;z-index:9;pointer-events:none;background:radial-gradient(circle at 50% 50%,transparent 0 38vmin,rgba(0,0,0,.55) 39vmin,#000 41vmin);transition:opacity .4s';
    el.innerHTML = '<div style="position:absolute;left:50%;bottom:6vh;transform:translateX(-50%);font:14px var(--body);color:#e8dcc0;opacity:.8;letter-spacing:.06em">mouse to look · wheel to focus · E to come away</div>';
    document.body.appendChild(el);
  }
  el.style.display = ''; $('hud').style.visibility = 'hidden'; $('prompt').classList.add('hidden');
  sfx.ui(); fade(1, 0); setTimeout(() => fade(0, 0.6), 40);
  if (!locked) lockMouse();
}
function updateScope(dt) {
  if (!SCOPE) return;
  if (touch.on) { SCOPE.yaw -= touch.move.x * dt * 0.6; SCOPE.pitch = clamp(SCOPE.pitch + touch.move.y * dt * 0.6, -0.1, 1.55); }
  if (Math.abs(camera.fov - SCOPE.fov) > 0.01) { camera.fov = damp(camera.fov, SCOPE.fov, 6, dt); camera.updateProjectionMatrix(); }
  const cp = Math.cos(SCOPE.pitch);
  camera.position.copy(SCOPE.pos);
  camera.lookAt(SCOPE.pos.x + Math.sin(SCOPE.yaw) * cp, SCOPE.pos.y + Math.sin(SCOPE.pitch), SCOPE.pos.z + Math.cos(SCOPE.yaw) * cp);
}
function endScope() {
  if (!SCOPE) return;
  camera.fov = SCOPE.fov0; camera.updateProjectionMatrix();
  G.mode = 'play'; SCOPE = null;
  const el = $('scope'); if (el) el.style.display = 'none';
  $('hud').style.visibility = '';
  sfx.ui(); fade(1, 0); setTimeout(() => fade(0, 0.5), 40);
}

/* ---------------- going indoors: a fade, and you're in the room; another, and you're back on the step ---------------- */
let roomFade = false;
function enterRoom(d, instant) {
  if (roomFade || G.bossActive) return;
  if (P.riding) toggleRide();
  const go = () => {
    const r = interiors.enter(d);
    G.outside = { pos: P.pos.clone(), wantDist: CAM.wantDist };
    P.pos.copy(r.pos); P.vel.set(0, 0, 0); P.yaw = r.yaw; CAM.yaw = r.yaw + Math.PI; CAM.pitch = 0.2;
    CAM.wantDist = Math.min(CAM.wantDist, 5); CAM.target.set(P.pos.x, P.pos.y + 1.9, P.pos.z);
    if (phorusWith() && !young()) F.pos.copy(P.pos).add(V3(1.5, 0, -1.5));
    G.lock = null;
    showLocation(d.name, REGION_NAME[REGION]);
  };
  if (instant) { go(); return; }
  roomFade = true; sfx.ui(); fade(1, 0.3);
  setTimeout(() => { go(); fade(0, 0.5); roomFade = false; }, 330);
}
function leaveRoom(instant) {
  if (roomFade || !interiors.inside) return;
  const go = () => {
    const r = interiors.exit();
    P.pos.copy(r.pos); P.vel.set(0, 0, 0); P.yaw = r.yaw; CAM.yaw = r.yaw + Math.PI;
    if (G.outside) CAM.wantDist = G.outside.wantDist;
    CAM.target.set(P.pos.x, P.pos.y + 1.9, P.pos.z); P.lastSafe.copy(P.pos);
    if (phorusWith() && !young()) F.pos.copy(P.pos).add(V3(-1.5, 0, 1.5));
    if (mount) { const md = mount.pos.distanceTo(P.pos); if (md > 60) { mount.pos.copy(P.pos).add(V3(3, 0, 2)); mount.pos.y = world.col.ground(mount.pos.x, mount.pos.z, P.pos.y + 2); } }
  };
  if (instant) { go(); return; }
  roomFade = true; sfx.ui(); fade(1, 0.3);
  setTimeout(() => { go(); fade(0, 0.5); roomFade = false; }, 330);
}

/* in along a forest path from the next region over */
function arriveByExit(info) {
  const ex = (world.exits || []).find(e => e.id === info.exit);
  if (!ex) { continueRun(); return; }
  if (young()) applyYoung();
  P.pos.set(ex.arrive.x, 0, ex.arrive.z); P.pos.y = world.col.ground(P.pos.x, P.pos.z, world.heightAt(P.pos.x, P.pos.z) + 2);
  P.vel.set(0, 0, 0); P.lastSafe.copy(P.pos);
  P.yaw = Math.atan2(-ex.nx, -ex.nz); CAM.yaw = Math.atan2(ex.nx, ex.nz); G.t = 0;
  F.pos.copy(P.pos).add(V3(ex.nx * 2.5, 0, ex.nz * 2.5 + 2));
  if (mount) { mount.pos.copy(P.pos).add(V3(ex.nx * 3 - ex.nz * 2, 0, ex.nz * 3 + ex.nx * 2)); mount.pos.y = world.heightAt(mount.pos.x, mount.pos.z); if (info.ride) toggleRide(); }
  fade(1, 0); setTimeout(() => fade(0, 1.2), 50);
  enterPlay();
  if (REGION === 'property' && young() && F_.pro === 'beuhk') { pathWalk(); return; }
  showLocation(REGION_NAME[REGION], REGION === 'property' ? 'the forest path, west of Beuhk' : 'in from the forest path');
  apArrive();
  persist();
}

function travel(id) {
  const l = lanternById(id); if (!l) return;
  if (G.bossActive) { toast('Not in the middle of a fight like this.', 2); return; }
  if (interiors.inside) leaveRoom(true);
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
  later: () => laterGame(),
  relicReady: id => id === 'gynge_chip' || knowsTrigger(id),
  wear: () => WEAR_SLOTS.map(([slot, label]) => ({ slot, label, on: wearing(slot), have: Object.keys(SAVE.inv.items).filter(k => ITEMS[k] && ITEMS[k].slot === slot && !(k === 'w_coat' && young())) })),   // (the grown man's coat is no fit for the boy)
  slots: () => ({ keys: SLOT_KEYS.map(k => ({ code: k, label: slotLabel(k), id: SAVE.slots[k] || '' })), choices: slotChoices(),
    relics: ['r_firestone', 'r_longevity'].filter(relicHeld).map(id => ({ id, known: knowsTrigger(id), name: SLOT_ACTIONS[id].name })),
    spells: SPELL_ORDER.filter(id => SLOT_ACTIONS[id].ok()).map(id => ({ id, name: SPELLS[id].name, icon: SPELLS[id].icon, desc: SPELLS[id].desc, cd: SPELLS[id].cd })) }),
  who: () => (young() ? 'Tanoc' : 'Torcain'),
  mainObjective: () => $('q-text').textContent,
  dya: () => dyaBookData(),
  bounty: () => SAVE.bounty && { ...SAVE.bounty, name: beastName(SAVE.bounty.kind), got: bountyProgress(SAVE.bounty, SAVE) },
  amulets: () => ({ got: SAVE.amulets || 0, total: AMULET_TOTAL, next: AMULET_TIERS.find(t => t.n > (SAVE.amulets || 0)) }),
  beasts: () => Object.entries(STORY.BEASTS).map(([k, [name, lore]]) => ({ k, name, lore, kills: SAVE.killsBy[k] || 0, seen: !!(SAVE.killsBy[k] || F_['seen_' + k] || SAVE.codex['beast_' + k]), at: studyAt(k), studied: studied(k) })),
  onClose: () => { G.paused = false; lockMouse(); },
});
renderSpellBar();

function updateRpgHud() {
  const sk = SAVE.skills;
  $('lvl').textContent = `LV ${sk.lvl}` + (sk.points ? ' ✦' : '');
  $('xp-fill').style.width = Math.min(100, sk.xp / xpForLevel(sk.lvl) * 100) + '%';
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
/* how steep a slope you can walk up (rise over run), and how deep you float while swimming */
const SLOPE_MAX = 1.25, SWIM_DEPTH = 1.3;
/* would stepping to (x, z) climb the bare ground faster than a walkable slope?
   Built surfaces — stairs, a pier, a roof — are always fine to step onto. */
function steepUp(x, z, y0, hd) {
  const t = world.heightAt(x, z);
  if (t <= y0 + 0.02 + hd * SLOPE_MAX) return false;
  return world.col.ground(x, z, y0) <= t + 0.01;
}

function updatePlayer(dt) {
  FX = effects(SAVE.inv, SAVE.time, wearSet());
  if (FX.regen && P.hp > 0 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + FX.regen * dt);   // a hearth Hurst in what he wears: wounds close on their own
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
    if (touch.on) { ix += touch.move.x; iz += touch.move.y; }
    if (mouseL && !P.atk && !P.riding) pressAttack();
  }
  const f = camForward(), r = V3(Math.cos(CAM.yaw), 0, -Math.sin(CAM.yaw));
  const wish = V3().addScaledVector(f, iz).addScaledVector(r, ix);
  const moving = wish.lengthSq() > 0.01;
  if (moving) wish.normalize();
  if (P.flying) { flyKuni(dt, wish, moving, act); return; }
  if (P.climb) { climbTick(dt, act); return; }
  if (P.jumpBuf > 0 && act && !vineOn() && tryClimb(wish)) P.jumpBuf = 0;
  let sprint = (keys.ShiftLeft || keys.ShiftRight) && moving && !P.exhausted;
  if (sprint && D.stamina.sprint > 0) { P.stam -= D.stamina.sprint * dt; P.stamDelay = 0.5; if (P.stam <= 0) { P.stam = 0; P.exhausted = true; sprint = false; } }
  if (P.exhausted && P.stam > 25) P.exhausted = false;
  let speed = sprint ? 11.5 : 7;
  if (P.riding) { speed = (keys.ShiftLeft || keys.ShiftRight) ? 19 : 10; sprint = false; }
  if (P.atk) speed *= P.riding ? 0.7 : 0.25;
  if (P.drink > 0) speed *= 0.35;
  if (P.swimming) speed *= 0.6;
  const accel = P.onGround ? 14 : 4;

  if (P.roll) {
    P.roll.t += dt;
    const k = 1 - P.roll.t / P.roll.dur;
    P.vel.x = P.roll.dir.x * 15 * Math.max(0.3, k); P.vel.z = P.roll.dir.z * 15 * Math.max(0.3, k);
    torcain.body.rotation.x = (P.roll.t / P.roll.dur) * Math.PI * 2;
    if (Math.random() < 0.5) particles.emit(P.pos.x, P.pos.y + 0.2, P.pos.z, { color: 0xd8c098, size: 0.5, life: 0.4, speed: 1.5 });
    if (P.roll.t >= P.roll.dur) { P.roll = null; torcain.body.rotation.x = 0; }
  } else if (P.riding && (vineOn() || !P.onGround)) {
    // swinging and flying: momentum is yours to keep; WASD only nudges it, and you face the way you're going
    P.vel.x += wish.x * 9 * dt; P.vel.z += wish.z * 9 * dt;
    const hv = Math.hypot(P.vel.x, P.vel.z);
    if (hv > 44) { P.vel.x *= 44 / hv; P.vel.z *= 44 / hv; }
    if (hv > 1.5) P.yaw = dampAngle(P.yaw, Math.atan2(P.vel.x, P.vel.z), 8, dt);
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
  if (P.riding && P.jumpBuf > 0 && act) { P.jumpBuf = 0; if (touch.on && !vineOn()) vineShoot('L'); else rideSpace(); }
  else if (P.jumpBuf > 0 && P.coyote > 0 && act && !P.steep && !P.riding && spend(D.stamina.jump)) { P.vel.y = P.swimming ? 9 : 10.5; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; sfx.jump(); }
  P.vel.y -= 28 * dt;
  if (vineOn()) vineTick(dt, act);
  // gliding: hold Space while falling and Torcain's coat catches the wind
  P.airT = P.onGround ? 0 : (P.airT || 0) + dt;
  const glideOk = !!(act && !P.riding && canGlide() && keys.Space && !P.onGround && P.airT > 0.25 && P.vel.y < 0 && (P.stam > 0 || D.stamina.jump === 0 || perk('glider')));
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
  if (!Number.isFinite(P.pos.x + P.pos.y + P.pos.z)) { P.pos.copy(P.lastSafe); P.vel.set(0, 0, 0); }   // never lose the boy to a bad number
  const px0 = P.pos.x, pz0 = P.pos.z, py0 = P.pos.y;
  P.pos.addScaledVector(P.vel, dt);
  if (world.inBounds && !world.inBounds(P.pos.x, P.pos.z) && !(world.swimOk && world.swimOk(P.pos.x, P.pos.z))) {   // the land itself says no: a sheer ridge, open sea, a thorn wall
    P.pos.x = px0; P.pos.z = pz0; P.vel.x *= -0.2; P.vel.z *= -0.2;
    if (G.t - (P.barrierT || -99) > 6) { P.barrierT = G.t; bark(young() || !phorusWith() ? 'tale' : 'phorus', world.barrierLine ? world.barrierLine(P.pos.x, P.pos.z) : 'No way through here.', 2.4); }
  }
  checkPasses(px0, pz0);
  checkExits(px0, pz0);
  // no walking (or hopping) straight up a cliff face: slide along it instead
  const hd = Math.hypot(P.pos.x - px0, P.pos.z - pz0);
  if (hd > 1e-4 && steepUp(P.pos.x, P.pos.z, py0, hd)) {
    if (!steepUp(P.pos.x, pz0, py0, Math.abs(P.pos.x - px0))) P.pos.z = pz0;
    else if (!steepUp(px0, P.pos.z, py0, Math.abs(P.pos.z - pz0))) P.pos.x = px0;
    else { P.pos.x = px0; P.pos.z = pz0; }
  }
  world.col.resolve(P.pos, P.riding ? 0.95 : 0.45, P.riding ? 2.6 : 1.9);
  if (G.bossActive && boss) {
    arenaClamp(P.pos, G.arena);

  }
  const g = world.col.ground(P.pos.x, P.pos.z, P.pos.y);
  if (P.pos.y <= g) {
    if (!wasGround && P.vel.y < -12) { sfx.land(); particles.burst(P.pos.x, g + 0.1, P.pos.z, 10, { color: 0xd8c098, speed: 3, size: 0.5, life: 0.5 }); }
    P.pos.y = g; P.vel.y = 0; P.onGround = true;
  } else if (wasGround && P.vel.y <= 0 && P.pos.y - g < 0.45) { P.pos.y = g; P.vel.y = 0; P.onGround = true; }
  else P.onGround = false;

  // swimming: deep water holds you up, head and shoulders clear of the surface
  const wasSwim = P.swimming;
  P.swimming = false;
  if (world.water && g < world.water.level - SWIM_DEPTH - 0.05 && P.pos.y <= world.water.level - SWIM_DEPTH + 0.02 && world.water.depth(P.pos.x, P.pos.z) > SWIM_DEPTH) {
    const lv = world.water.level;
    if (!wasSwim) particles.burst(P.pos.x, lv, P.pos.z, P.vel.y < -6 ? 30 : 12, { color: 0xd8f4ff, speed: P.vel.y < -6 ? 5 : 2.5, size: 0.5, life: 0.7, gravity: 6 });
    P.pos.y = lv - SWIM_DEPTH; if (P.vel.y < 0) P.vel.y = 0;
    P.onGround = true; P.swimming = true;
    if (P.roll) { P.roll = null; torcain.body.rotation.x = 0; }
    if (Math.hypot(P.vel.x, P.vel.z) > 1 && Math.random() < 0.35) particles.emit(P.pos.x - P.vel.x * 0.05, lv + 0.05, P.pos.z - P.vel.z * 0.05, { vy: 0.6, color: 0xe8f8ff, size: 0.35, life: 0.6, speed: 0.8 });
  }
  if (wasSwim && !P.swimming && P.onGround) particles.burst(P.pos.x, P.pos.y + 0.2, P.pos.z, 8, { color: 0xd8f4ff, speed: 2, size: 0.35, life: 0.5, gravity: 6 });

  // ground too steep to stand on: no jumping up it, and you slip back down
  P.steep = false;
  if (P.onGround && !P.swimming) {
    const e = 0.6, gx = world.heightAt(P.pos.x + e, P.pos.z) - world.heightAt(P.pos.x - e, P.pos.z), gz = world.heightAt(P.pos.x, P.pos.z + e) - world.heightAt(P.pos.x, P.pos.z - e);
    const sl = Math.hypot(gx, gz) / (2 * e);
    if (sl > SLOPE_MAX + 0.1 && P.pos.y <= world.heightAt(P.pos.x, P.pos.z) + 0.05) {
      P.steep = true;
      const k = Math.min(6, (sl - SLOPE_MAX) * 5) * dt / Math.hypot(gx, gz), sx = P.pos.x - gx * k, sz = P.pos.z - gz * k;
      if (!world.inBounds || world.inBounds(sx, sz) || (world.swimOk && world.swimOk(sx, sz))) {   // never slip out past the edge
        P.pos.x = sx; P.pos.z = sz;
        P.pos.y = Math.max(world.col.ground(P.pos.x, P.pos.z, P.pos.y), P.pos.y - 6 * dt);
      }
    }
  }

  P.safeTimer -= dt;
  if (P.onGround && !P.swimming && !P.steep && P.safeTimer <= 0) {
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
    bark(young() ? 'tanoc' : 'phorus', young() ? 'Ow. …Ow. Mind your footing, Tanoc.' : 'Mind your footing! That’s a long way down.', 2.5);
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

  placeWalker(torcain.root, P, dt);
  if (P.riding) torcain.root.position.y += mount ? mount.seat : 1.35;
  const dy = P.yaw - (P._ry ?? P.yaw); P._ry = P.yaw; turnRate = damp(turnRate, Math.atan2(Math.sin(dy), Math.cos(dy)) / Math.max(dt, 1e-3), 6, dt);
  torcain.root.rotation.set(0, P.yaw, 0);
  torcain.animate(dt, { speed: P.roll || P.riding ? 0 : hs, onGround: P.onGround || P.riding, t: G.t, swing: P.atk ? { kind: P.atk.kind, p: clamp(P.atk.p, 0, 1) } : null, heat: P.heat / 100, drink: P.drink > 0,
    ride: !!P.riding, rideSpeed: hs, rideBob: mount ? mount.gait || 0 : 0, rideRoll: P.riding ? clamp(-turnRate * 0.06, -0.22, 0.22) : 0 });
  if (P.roll) torcain.body.rotation.x = (P.roll.t / P.roll.dur) * Math.PI * 2;
}

/* Phorus goes where the story takes him, and no further. On Torcain's own
   errands — bounties, hunts, wandering — he waits behind. */
function phorusWith() {
  if (young()) return false;
  if (G.bossActive) return true;
  if (REGION === 'xilia') return !!F_.seedQuest && !F_.xdone;                         // the warm seed, and the ship
  if (REGION === 'property') return true;                                              // out at Buhkon's, he tags along
  if (REGION === 'aakalay') return !F_.done || ['q_pages', 'q_thorn', 'q_skorthal'].some(q => SAVE.quests[q] === 'active');   // the riddle, and his own errands
  return !F_.doneL;                                                                    // Leotik: the pillars and the keep
}
function phorusHome() {
  if (REGION === 'xilia') return F_.xtalked ? V3(world.PLAZA.x - 6, 0, world.PLAZA.z + 8) : world.pier.start.clone().add(V3(-2, 0, -3));   // near the bakery
  if (REGION === 'property') return V3(world.hearth.x + 3, 0, world.hearth.z + 2);
  if (REGION === 'leotik' && world.camp) return V3(world.camp.x + 4, 0, world.camp.z + 3);
  const l = SAVE.lantern && lanternById(SAVE.lantern);
  return l ? V3(l.x + 2, 0, l.z - 1.5) : world.pier.start.clone().add(V3(-2, 0, -3));
}
function updatePhorus(dt) {
  if (young()) { phorus.root.visible = false; return; }   // Phorus is years away yet
  F.cd = Math.max(0, F.cd - dt); F.cast = Math.max(0, F.cast - dt);
  const withP = phorusWith();
  if (!withP && FR.mode) phorusDismount();
  let tgt = null, bd = 1e9;
  if (G.mode === 'play' && !P.dead && withP) {
    for (const e of enemies.list) {
      if (e.dead || !e.hostile || e.state === 'idle' || e.state === 'return' || e.state === 'shadow' || e.kind === 'rubbermcfly') continue;
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
  } else if (!withP) {
    want = phorusHome();
  } else {
    const back = V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), right = V3(-Math.cos(P.yaw), 0, Math.sin(P.yaw));
    want = FR.mode === 'own' ? P.pos.clone().addScaledVector(back, 3.5).addScaledVector(right, 3.2)   // Lun keeps clear of Brindle
      : P.pos.clone().addScaledVector(back, 2.4).addScaledVector(right, 1.8);
  }
  if (FR.mode && !P.riding) phorusDismount();
  if (FR.punk && FR.mode !== 'own') { FR.punk.root.position.copy(FR.pos); FR.punk.root.rotation.y = FR.yaw; if (FR.punk.root.visible) FR.punk.animate(dt, { speed: 0, t: G.t }); }
  if (FR.mode === 'pillion') {      // up behind Torcain on Brindle's back
    F.pos.copy(P.pos).add(V3(-Math.sin(P.yaw) * 0.95, 0, -Math.cos(P.yaw) * 0.95)); F.vel.set(0, 0, 0); F.onGround = true;
    if (!tgt) F.yaw = P.yaw;
    phorus.root.position.set(F.pos.x, F.pos.y + 1.2, F.pos.z); phorus.root.rotation.y = F.yaw;
    phorus.animate(dt, { speed: 0, onGround: true, t: G.t, swing: F.cast > 0 ? { kind: 4, p: 1 - F.cast / 0.35 } : null });
    return;
  }
  // Phorus will not wade into acid
  for (const h of world.hazards) { const dx = want.x - h.x, dz = want.z - h.z, d = Math.hypot(dx, dz); if (d < h.r + 1.5) { want.x = h.x + dx / (d || 1) * (h.r + 1.5); want.z = h.z + dz / (d || 1) * (h.r + 1.5); } }
  const dx = want.x - F.pos.x, dz = want.z - F.pos.z, d = Math.hypot(dx, dz);
  const pd = F.pos.distanceTo(P.pos);
  if (!withP) {   // he makes his own way back to where he waits
    if (F.pos.distanceTo(want) > 40 && pd > 30) { F.pos.copy(want); F.pos.y = world.col.ground(want.x, want.z, world.heightAt(want.x, want.z) + 2); F.vel.set(0, 0, 0); }
  } else if (pd > 34 || (pd > 18 && G.mode !== 'play')) {
    particles.burst(F.pos.x, F.pos.y + 1, F.pos.z, 16, { color: 0x7ad8ff, speed: 4, size: 0.4, life: 0.5 });
    F.pos.copy(P.pos).addScaledVector(V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), 2.5);
    particles.burst(F.pos.x, F.pos.y + 1, F.pos.z, 16, { color: 0x7ad8ff, speed: 4, size: 0.4, life: 0.5 });
  }
  const sp = d > 1.2 ? Math.min(FR.mode === 'own' ? 22 : 12, d * 2.2) : 0;
  F.vel.x = damp(F.vel.x, d > 0.01 ? dx / d * sp : 0, 8, dt);
  F.vel.z = damp(F.vel.z, d > 0.01 ? dz / d * sp : 0, 8, dt);
  F.vel.y -= 28 * dt;
  F.pos.addScaledVector(F.vel, dt);
  world.col.resolve(F.pos, 0.45, 1.9);
  if (G.bossActive) arenaClamp(F.pos, G.arena - 1);
  const g = world.col.ground(F.pos.x, F.pos.z, F.pos.y);
  if (F.pos.y <= g || F.pos.y - g < 0.4) { F.pos.y = g; F.vel.y = 0; F.onGround = true; } else F.onGround = false;
  if (world.water && g < world.water.level - SWIM_DEPTH && F.pos.y <= world.water.level - SWIM_DEPTH && world.water.depth(F.pos.x, F.pos.z) > SWIM_DEPTH) {   // he swims after you
    F.pos.y = world.water.level - SWIM_DEPTH; F.vel.y = Math.max(0, F.vel.y); F.onGround = true;
  }
  if (F.onGround && sp > 3 && world.col.ground(F.pos.x + F.vel.x * 0.12, F.pos.z + F.vel.z * 0.12, F.pos.y + 3) > F.pos.y + 0.7) F.vel.y = 10;
  if (F.pos.y < -30) F.pos.copy(P.pos);
  const hs = Math.hypot(F.vel.x, F.vel.z);
  if (hs > 0.6 && !F.cast) F.yaw = dampAngle(F.yaw, Math.atan2(F.vel.x, F.vel.z), 10, dt);
  else if (!tgt && G.mode === 'dialog') F.yaw = dampAngle(F.yaw, Math.atan2(P.pos.x - F.pos.x, P.pos.z - F.pos.z), 6, dt);
  phorus.root.position.copy(F.pos);
  phorus.root.rotation.y = F.yaw;
  if (FR.mode === 'own') {          // astride Lun
    FR.pos.copy(F.pos); FR.yaw = F.yaw;
    FR.punk.root.position.copy(F.pos); FR.punk.root.rotation.y = F.yaw;
    FR.punk.animate(dt, { speed: hs, t: G.t });
    phorus.root.position.y += 1.2;
    phorus.animate(dt, { speed: 0, onGround: true, t: G.t, swing: F.cast > 0 ? { kind: 4, p: 1 - F.cast / 0.35 } : null });
    return;
  }
  phorus.animate(dt, { speed: hs, onGround: F.onGround, t: G.t, swing: F.cast > 0 ? { kind: 4, p: 1 - F.cast / 0.35 } : null });
}

function updateCamera(dt) {
  const swingK = P.riding && !P.onGround ? clamp((P.vel.length() - 8) / 22, 0, 1) : 0;   // swinging: pull back and widen with the speed
  CAM.dist = damp(CAM.dist, P.flying ? Math.max(CAM.wantDist, 14) : CAM.wantDist + swingK * 5, P.riding ? 4 : 8, dt);
  if (!mainCine.active) { const fv = 60 + swingK * 12; if (Math.abs(camera.fov - fv) > 0.05) { camera.fov = damp(camera.fov, fv, 3, dt); camera.updateProjectionMatrix(); } }
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
  const tgt = V3(P.pos.x, P.pos.y + (P.flying ? 2.6 : P.riding ? 3.0 : 1.9), P.pos.z);
  // follow quickly across the ground, a little more gently up and down, so steps, stairs and landings don't jolt the view
  const kxz = 1 - Math.exp(-16 * dt), ky = 1 - Math.exp(-(P.onGround || P.riding ? 9 : 14) * dt);
  CAM.target.x += (tgt.x - CAM.target.x) * kxz; CAM.target.z += (tgt.z - CAM.target.z) * kxz; CAM.target.y += (tgt.y - CAM.target.y) * ky;
  if (CAM.target.distanceTo(tgt) > 8) CAM.target.copy(tgt);
  const r = V3(Math.cos(CAM.yaw), 0, -Math.sin(CAM.yaw));
  const look = CAM.target.clone().addScaledVector(r, 0.55);
  const off = V3(Math.sin(CAM.yaw) * Math.cos(CAM.pitch), Math.sin(CAM.pitch), Math.cos(CAM.yaw) * Math.cos(CAM.pitch));
  // something in the way: pull in at once (never look through a wall), but ease back out, so it doesn't flicker in and out at an edge
  const hit = world.col.ray(look, look.clone().addScaledVector(off, CAM.dist));
  const clear = hit < 1 ? Math.max(0.6, CAM.dist * hit - 0.3) : CAM.dist;
  CAM.reach = Math.min(clear, damp(CAM.reach ?? clear, clear, 3.2, dt));
  const want = look.clone().addScaledVector(off, CAM.reach);
  const gy = world.heightAt(want.x, want.z) + 0.5;
  CAM.floor = damp(CAM.floor ?? gy, gy, 10, dt);
  if (want.y < Math.max(gy - 0.3, CAM.floor)) want.y = Math.max(gy - 0.3, CAM.floor);
  CAM.pos.copy(want);
  // shake is a rumble, not static: smooth wobble on three unrelated waves
  G.shake = Math.max(0, G.shake - dt * 2.2);
  const s = G.shake * G.shake * 0.5, T = G.t * 31;
  camera.position.set(CAM.pos.x + Math.sin(T * 1.13) * s * 0.5, CAM.pos.y + Math.sin(T * 1.71 + 1) * s * 0.5, CAM.pos.z + Math.sin(T * 0.93 + 2) * s * 0.5);
  camera.lookAt(look);
  if (dyaMatch && dyaOverview) {
    const c = dyaMatch.toWorld(800, 500), m = dyaMatch.m;
    const back = dyaMatch.toWorld(80, 500);
    const want2 = V3(back.x, c.y + 900 * m, back.z);
    dyaCam.lerp(want2, 1 - Math.exp(-4 * dt));
    camera.position.copy(dyaCam); camera.lookAt(c);
  } else if (dyaMatch) dyaCam.copy(camera.position);
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

/* the use prompt is rewritten only when it changes (rebuilding it every frame made the page redo its layout each time) */
function setPrompt(pe, label) { if (pe._k !== label) { pe._k = label; pe.innerHTML = `<kbd>E</kbd>${label}`; } }
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
  $('resume').classList.toggle('hidden', locked || touch.on || G.paused || G.mode !== 'play' || overlayOpen() || !!(DLG && DLG.choices));
  const pe = $('prompt'), pr = nearestPrompt();
  if (pr) { setPrompt(pe, pr.label); pe.classList.remove('hidden'); } else pe.classList.add('hidden');
  // a faint glow on the thing you could use, and nothing else
  {
    const on = pr && pr.far !== 99 && G.mode === 'play';
    if (on) { const lift = pr.pos.y - world.col.ground(pr.pos.x, pr.pos.z, pr.pos.y + 0.5) < 0.4 ? 1 : 0; useGlow.position.set(pr.pos.x, pr.pos.y + lift, pr.pos.z); }
    useGlow.userData.a += ((on ? 0.2 + Math.sin(G.t * 2.4) * 0.04 : 0) - useGlow.userData.a) * 0.15;
    useGlow.material.opacity = useGlow.userData.a; useGlow.visible = useGlow.userData.a > 0.01;
  }
  // the lock reticle
  const lp = lockPoint(), lk = $('lock');
  const ls = lp && toScreen(lp);
  if (ls) { lk.style.display = 'block'; lk.style.left = ls[0] + 'px'; lk.style.top = ls[1] + 'px'; } else lk.style.display = 'none';
  $('crosshair').classList.toggle('lock', !!G.lock);
  // the X warms when there's a foe under it — that's where the fire-stone will go
  // on Brindle it goes green when a vine thrown now would catch something
  if (!(G.t < G.aimT)) {
    G.aimT = G.t + 0.06;
    const ch = $('crosshair').classList, on = G.mode === 'play' && !G.lock, foe = on && !!lookAim(45).foe;
    ch.toggle('foe', foe); ch.toggle('vine', on && !foe && P.riding && P.vineN > 0 && !!vineTarget(''));
  }
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
  if (gate && gate.visible && gate.userData.film.material.opacity > 0) {
    gate.userData.film.material.opacity = 0.45 + Math.sin(G.t * 2.4) * 0.12; gate.userData.film.rotation.z = G.t * 0.3;
    if (Math.random() < 0.3) particles.emit(gate.position.x + (Math.random() - 0.5) * 5, gate.position.y + 3.6 + (Math.random() - 0.5) * 5, gate.position.z, { vy: 0.5, color: 0xb48aff, size: 0.35, life: 1.2, speed: 0.6 });
  }
  hlystTick(dt); skorTick(dt); wilds.update(dt, G.t); ambient.update(dt, G.t, P.pos, G.night || 0); updateSprengju(dt); if (G.meglaTick) G.meglaTick(dt);
  beastScan(dt);
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
}

/* ================================================================
   LOOP
   ================================================================ */
const clock = new THREE.Clock();
let frameDt = 1 / 60;
/* a frame cap of about 60 a second. It draws every Nth refresh of the screen rather than going by a clock,
   so frames stay evenly spaced: on a 60Hz screen every frame is drawn, and a 120/144Hz screen draws every
   2nd refresh instead of pushing the whole bloom-and-shadow pipeline two or three times as often as anyone
   can see (a strict 60 on 144Hz would land 2, 3, 2, 3 refreshes apart, and that unevenness reads as judder). */
let refreshMs = 1000 / 60, lastTick = 0, tickN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const gap = now - lastTick; lastTick = now;
  if (gap > 3 && gap < 40) refreshMs += (gap - refreshMs) * 0.05;   // learn the screen's refresh rate (ignoring hitches)
  const every = Math.max(1, Math.floor(1000 / refreshMs / 60 + 0.25));
  if (++tickN < every) return;
  tickN = 0;
  // steady the clock: the browser's frames arrive a little unevenly, and stepping the world by each raw gap
  // makes everything that moves shimmer. Small wobbles are smoothed out; a real hitch still counts in full.
  const rawDt = Math.min(clock.getDelta(), 1 / 20);
  frameDt = Math.abs(rawDt - frameDt) > 0.012 ? rawDt : lerp(frameDt, rawDt, 0.2);
  let dt = frameDt;
  const frozen = G.paused || G.mode === 'title';
  if (VK) {   // Velki: its own little world, until the air tears open
    if (!G.paused) { G.t += dt; if (G.mode !== 'title') tickTime(SAVE, dt); VK.update(dt, G.mode === 'play' && !overlayOpen()); updateDialog(dt); tickUi(dt); updateSlotHud(dt); }
    touch.update(dt);
    if (VK) {
      const pe = $('prompt'), pr = G.mode === 'play' ? VK.prompt() : null;
      if (pr) { setPrompt(pe, pr); pe.classList.remove('hidden'); } else pe.classList.add('hidden');
      VK.render();
    }
    return;
  }
  if (G.hitstop > 0) { G.hitstop -= dt; dt *= 0.08; }
  if (!frozen) {
    G.t += dt;
    if (G.mode !== 'end') tickTime(SAVE, dt);   // cutscenes and talk are part of the story's hours too
    if (G.mode === 'play' || G.mode === 'dialog' || G.mode === 'memory' || G.mode === 'end') {
      updatePlayer(dt);
      updatePhorus(dt);
      enemies.update(dt);
      updateBoss(dt);
      updateTelegraphs(dt);
      updateSpikes(dt);
      updateProjectiles(dt);
      updateBolts(dt);
      updateWorldBits(dt);
      updateNpcs(dt);
      updateMount(dt);
      updateShurgrEdan(dt);
      updateTrials(dt);
      updateDialog(dt);
      updateCamera(dt);
      if (dyaMatch) { dyaMatch.update(dt, G.t); dyaMatch.updateAim(dyaAimPoint()); dyaMatch.placeBars(camera); }
      checkLocations();
      if (young() && F_.pro === 'beuhk') { if (REGION === 'property') pathTick(); else beuhkTick(); }
      else if (young()) youngTick();
      apTick(dt);
      updateMalsti(dt);
      updatePlace();
      if (REGION === 'xilia' || REGION === 'property') {
        if (F_.tut === 3 && REGION === 'property' && P.gliding && P.pos.y - world.heightAt(P.pos.x, P.pos.z) > 2.5) tutStep(4);
        if (seedMesh && seedMesh.visible) { seedMesh.rotation.y = G.t * 1.5; seedMesh.position.y = world.seedSpot.y + 0.3 + Math.sin(G.t * 2) * 0.15; }
      }
    } else if (G.mode === 'scope') updateScope(dt);
    else if (G.mode === 'intro') {
      if (!mainCine.update(dt)) updateIntroCamera(dt);
      updateToken(dt);
      updatePhorus(dt);
      torcain.animate(dt, { speed: 0, onGround: true, t: G.t });
      torcain.root.position.copy(P.pos); torcain.root.rotation.y = P.yaw;
    }
    tickUi(dt);
    updateNums(dt);
    if (G.mode !== 'title') { updateHUD(); updateRpgHud(); updateSlotHud(dt); }
  } else if (G.mode === 'title') {
    const t = performance.now() / 1000;
    const a = 0.9 + t * 0.025;
    camera.position.set(Math.sin(a) * 250, 75 + Math.sin(t * 0.1) * 6, Math.cos(a) * 250);
    camera.lookAt(Math.sin(a + 1.2) * 40, 0, Math.cos(a + 1.2) * 40);
  }
  const tt = G.mode === 'title' ? performance.now() / 1000 : G.t;
  world.update(tt, dt, particles, camera.position, G.night || 0);
  interiors.update(dt, tt, P); interiors.tickView();
  sky.update(tt, dt, camera.position);
  dn.update(frozen && G.mode !== 'title' ? 0 : dt);
  if (G.mode !== 'title') updateStorm(frozen ? 0 : dt);
  // under the deepwood's roof the day goes dim and blue-green, and the wood's own light takes over
  {
    const want = world.shadeAt && !interiors.inside ? world.shadeAt(camera.position.x, camera.position.z) : 0;
    G.shade = (G.shade || 0) + (want - (G.shade || 0)) * Math.min(1, Math.max(dt, 0.03) * 1.5);
    const k = G.shade;
    if (k > 0.005) {
      if (scene.fog) { scene.fog.color.lerp(DEEP_FOG, k); scene.fog.near = lerp(scene.fog.near, 14, k); scene.fog.far = lerp(scene.fog.far, 320, k); }
      sun.intensity *= 1 - 0.9 * k; rim.intensity *= 1 - 0.6 * k;
      hemi.intensity *= 1 - 0.62 * k; hemi.color.lerp(DEEP_SKY, k * 0.8); hemi.groundColor.lerp(DEEP_GND, k * 0.8);
      renderer.toneMappingExposure *= 1 - 0.38 * k;
      bloom.strength += 0.5 * k; bloom.threshold -= 0.18 * k;
    }
  }
  touch.update(dt);
  G.night = dn.night;
  /* everyone's bioluminescence follows the dark (creatures handle their own in enemies.js / wilds.js) */
  if ((G.glowT = (G.glowT || 0) - dt) <= 0) {
    G.glowT = 0.25; const n = G.night;
    for (const a of [torcain, phorus, mount && mount.actor, boss && boss.actor]) if (a && a.glow) a.glow(n);
    for (const c of npcs) if (c.actor.glow) c.actor.glow(n);
  }
  if ((G.hudT = (G.hudT || 0) - dt) <= 0) { G.hudT = 1; const qh = $('q-head'); if (qh && qh.dataset.base) qh.textContent = qh.dataset.base + ' · ' + dn.label(); }
  ship.update(tt, dt, particles);
  particles.update(frozen && G.mode !== 'title' ? 0 : dt);
  // the sun's shadow box follows you, snapped to its own texel grid so shadow edges don't crawl and shimmer as you move;
  // and indoors there is no sun at all (it used to throw the yard's shadows across the rooms)
  const focus = G.mode === 'title' ? V3(0, 0, 0) : snapShadow(P.pos);
  sun.position.copy(focus).addScaledVector(SUN_DIR, 120);
  sun.target.position.copy(focus);
  const indoors = !!interiors.inside;
  if (sun.castShadow === indoors) sun.castShadow = !indoors && OPT.shadows;
  if (indoors) sun.intensity *= 0.15;
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

/* ================================================================
   THE TRUE BEGINNING — Velki at sunset, then Xikia at midday.
   Tanoc is caught in the last Skyfall and wakes in front of the
   Carpenter's stall in Beuhk's market square, hatless.
   ================================================================ */
const whiteout = (() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:29'; document.body.appendChild(d); return d; })();
function proObjective(head, text, hintTxt = '', pips = 0, on = 0) {
  $('q-head').textContent = $('q-head').dataset.base = head;
  $('q-text').textContent = text; $('q-hint').textContent = hintTxt;
  const el = $('q-pips'); el.innerHTML = '';
  for (let i = 0; i < pips; i++) { const d = document.createElement('div'); d.className = 'pip' + (i < on ? ' on' : ''); el.appendChild(d); }
}
function startVelki() {
  F_.pro = 'velki'; F_.young = true; SAVE.slots = {}; persist();
  G.mode = 'intro'; G.t = 0;
  $('hud').classList.remove('hidden'); $('hud').classList.add('velki');
  VK = createVelki({
    camera, keys, touch, CAM, sfx,
    makeComposer(sc) {
      const c = new EffectComposer(renderer, smoothTarget());
      c.addPass(new RenderPass(sc, camera));
      c.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.6, 0.8));
      c.addPass(paintPass(ShaderPass));
      c.addPass(new OutputPass());
      const pr = Math.min(devicePixelRatio, 1.75) * OPT.scale; c.setPixelRatio(pr); c.setSize(innerWidth, innerHeight);
      vkComposer = c; return c;
    },
    say: (lines, cb) => dialog(lines, cb), bark: (w, t, d) => bark(w, t, d), hint: t => hint(t), toast: (t, d) => toast(t, d),
    objective: (text, h) => proObjective('The Beginning · Velki', text, h),
    at: F_.vkAt, save: k => { F_.vkAt = k; persist(); },
    give: (id, n) => { if (!SAVE.inv.items[id]) { invAdd(SAVE.inv, id, n); if (ITEMS[id].slot && !SAVE.inv.wear[ITEMS[id].slot]) SAVE.inv.wear[ITEMS[id].slot] = id; toast(`+ ${ITEMS[id].icon} ${ITEMS[id].name} — and he puts it on`, 2.6); persist(); } },
    whiteness: v => { whiteout.style.transition = ''; whiteout.style.opacity = v; },
    onCaught: () => leaveVelki(),
  });
  VK.intro(() => {
    G.mode = 'play';
    showLocation('Fyrsti’Vilag', 'Velki · the last Skyfall · 307A');
    lockMouse();
  });
}
function leaveVelki() {
  F_.pro = 'road'; F_.roadAt = 'market'; persist();
  G.mode = 'intro';
  setVolume(0);   // silence
  playCards(STORY.PROLOGUE.caught.slice(1), 3000, () => {
    fade(1, 0);
    whiteout.style.transition = 'opacity 1s'; whiteout.style.opacity = 0;
    if (VK) VK.dispose();
    VK = null; vkComposer = null;
    setVolume(OPT.vol);
    startRoad('market');
  });
}

/* ================================================================
   THE ROAD NORTH — Fyrsti'Vilag on Xikia, and four days of road
   ================================================================ */
function youngHud() {
  document.querySelector('#vitals .name').innerHTML = `TANOC <small>Filugani</small><span id="lvl">${$('lvl') ? $('lvl').textContent : 'LV 1'}</span>`;
}
function askName(cb, title = 'NAME YOUR PUNK', ph = 'Pip') {
  G.mode = 'naming';   // not 'play': letting go of the mouse to type isn't a pause
  unlockMouse();
  const box = document.createElement('div');
  box.id = 'pk-box'; box.className = 'brass'; box.style.cssText = 'position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);z-index:45;padding:22px 26px;text-align:center;min-width:280px';
  box.innerHTML = `<div style="font-family:var(--display);letter-spacing:.12em;margin-bottom:10px">${title}</div><input id="pk-name" maxlength="18" style="font:inherit;font-size:18px;padding:6px 10px;width:220px" placeholder="${ph}"><div style="margin-top:12px"><button class="btn" id="pk-ok">That’s its name</button></div>`;
  document.body.appendChild(box);
  const inp = box.querySelector('#pk-name'); setTimeout(() => inp.focus(), 50);
  const done = () => { const n = (inp.value || '').replace(/[<>&"]/g, '').trim() || ph; box.remove(); G.mode = 'play'; lockMouse(); cb(n); };
  box.querySelector('#pk-ok').onclick = done;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') done(); e.stopPropagation(); });
}
/* what a self-contained scene (the road north, the Megla Aagac) borrows from the game: renderer, input, talk, cards, HUD */
function vkCtx() {
  return {
    camera, keys, touch, CAM, sfx,
    makeComposer(sc) {
      const c = new EffectComposer(renderer, smoothTarget());
      c.addPass(new RenderPass(sc, camera));
      c.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.55, 0.86));
      c.addPass(paintPass(ShaderPass));
      c.addPass(new OutputPass());
      const pr = Math.min(devicePixelRatio, 1.75) * OPT.scale; c.setPixelRatio(pr); c.setSize(innerWidth, innerHeight);
      vkComposer = c; return c;
    },
    say: (lines, cb) => dialog(lines, cb), ask: (w, t, o) => ask(w, t, o), askName,
    bark: (w, t, d) => bark(w, t, d), hint: t => hint(t), toast: (t, d) => toast(t, d),
    cards: (lines, ms, cb) => { G.mode = 'intro'; playCards(lines, ms, cb); },
    play: () => { G.mode = 'play'; lockMouse(); },
    cutscene: on => { G.mode = on ? 'intro' : 'play'; if (!on) lockMouse(); },   // keep the mouse through a scene: no cursor banner each time
    location: (a, b) => showLocation(a, b),
    objective: (head, text, h, pips, on) => proObjective(head, text, h, pips, on),
    blur: px => { if (touch.on) px = 0;   // a CSS blur on the game canvas can stop phone browsers from repainting it at all
      canvas.style.transition = px ? 'filter .4s' : 'filter 1.6s'; canvas.style.filter = `blur(${px}px)`; },
    hp: v => { $('hp-fill').style.transform = $('hp-lag').style.transform = `scaleX(${Math.max(0, v)})`; },
    save: a => { F_.roadAt = a; persist(); },
    amulets: n => { invAdd(SAVE.inv, 'amulet', n); persist(); },
    give: (id, n) => { invAdd(SAVE.inv, id, n); toast(`+ ${ITEMS[id].icon} ${ITEMS[id].name}`, 2.2); persist(); },
    giveFireStone: found => { if (found) { invAdd(SAVE.inv, 'r_firestone', 1); learnTrigger('r_firestone'); persist(); } },
    slotsHud: on => $('hud').classList.toggle('slots', on),
    punkName: n => { F_.punkName = n; STORY.SPEAKERS.punk.name = n; persist(); },
  };
}
function startRoad(at) {
  if (!F_.young) SAVE.slots = {};
  F_.pro = 'road'; F_.young = true; F_.roadAt = at || 'market'; persist();
  G.mode = 'intro'; G.t = 0;
  $('hud').classList.remove('hidden'); $('hud').classList.add('velki', 'roadhp');
  youngHud();
  if (F_.punkName) STORY.SPEAKERS.punk.name = F_.punkName;
  VK = createRoad(Object.assign(vkCtx(), {
    onDone: () => leaveRoad(),
  }));
  VK.start(F_.roadAt);
  fade(0, 1.4);   // out of the white, out of the dark
}
function leaveRoad() {
  F_.pro = 'beuhk'; F_.bk = 'rest'; persist();
  fade(1, 0);
  if (VK) VK.dispose();
  VK = null; vkComposer = null; canvas.style.filter = '';
  $('hud').classList.remove('velki', 'roadhp');
  arriveBeuhk();
}

/* ================================================================
   CHAPTER II — THE MEGLA AAGAC (megla.js), and home again for the
   first token
   ================================================================ */
function meglaBegin() {
  const M = STORY.MEGLA;
  dialog(M.pull, () => {
    F_.megla = 'go'; persist();
    G.mode = 'intro'; fade(1, 1.2);
    setTimeout(() => startMegla('ride'), 1300);
  });
}
function startMegla(at) {
  F_.pro = 'megla'; F_.young = true; F_.meglaAt = at || 'ride'; persist();
  if (interiors.inside) interiors.leave && interiors.leave();
  // the fire-stone goes on Q if it isn't on a slot already
  if (!SAVE.inv.items.r_firestone) invAdd(SAVE.inv, 'r_firestone', 1);
  learnTrigger('r_firestone');
  if (!SLOT_KEYS.some(k => SAVE.slots[k] === 'r_firestone')) SAVE.slots[SLOT_KEYS.find(k => !SAVE.slots[k]) || 'KeyQ'] = 'r_firestone';
  G.mode = 'intro'; G.t = 0;
  $('hud').classList.remove('hidden'); $('hud').classList.add('velki', 'roadhp');
  youngHud();
  STORY.SPEAKERS.punk.name = F_.punkName || 'Brindle'; STORY.SPEAKERS.punk.sub = 'your Punk, grown';
  if (F_.malstiName) STORY.SPEAKERS.malsti.name = F_.malstiName;
  VK = createMegla(Object.assign(vkCtx(), {
    save: a => { F_.meglaAt = a; persist(); },
    askName: (title, ph, cb) => askName(cb, title, ph),
    ring: () => { invAdd(SAVE.inv, 'relic_ring', 1); F_.ring = true; persist(); },
    malstiName: n => { F_.malstiName = n; persist(); },
    fade: (v, sec) => fade(v, sec),
    onDone: () => leaveMegla(),
  }));
  VK.start(F_.meglaAt);
  fade(0, 1.4);
  updateSlotHud && updateSlotHud(0);
}
function leaveMegla() {
  F_.pro = 'token'; F_.megla = 'done'; persist();
  fade(1, 0.4);
  setTimeout(() => {
    if (VK) VK.dispose();
    VK = null; vkComposer = null; canvas.style.filter = '';
    $('hud').classList.remove('velki', 'roadhp');
    // home: down the lane into the yard, the Carpenter at the workshop door
    const Y = world.yard || world.PLAZA;
    P.pos.set(Y.x + 14, 0, Y.z + 8); P.pos.y = world.col.ground(P.pos.x, P.pos.z, world.heightAt(P.pos.x, P.pos.z) + 3); P.yaw = -Math.PI / 2; CAM.yaw = Math.PI / 2;
    P.vel.set(0, 0, 0); P.lastSafe.copy(P.pos);
    dn.setHour(16.5);
    fade(0, 1.4);
    cineCards(['Home.'], 2600, P.pos, () => {
      enterPlay(); showLocation('The Carpenter’s Yard', 'Chapter II · home again');
      setObjective();
      hint('Buhkon is in the workshop.');
    });
  }, 450);
}
/* ---------------- a stall for your Punk: you choose where; then the saddle ---------------- */
function nameplate(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#6a4428'; g.fillRect(0, 0, 256, 64); g.strokeStyle = '#3a2414'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 58);
  g.fillStyle = '#f2e2c0'; g.font = 'bold 34px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 34);
  return new THREE.CanvasTexture(c);
}
function buildStall(ghost) {
  const g = new THREE.Group();
  const M = c => ghost ? new THREE.MeshBasicMaterial({ color: 0x8aff8a, transparent: true, opacity: 0.35, depthWrite: false }) : toon(c);
  const box = (w, h, d, x, y, z, c, rx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); m.rotation.x = rx; if (!ghost) { m.castShadow = true; m.receiveShadow = true; addOutline(m, 0.03); } g.add(m); return m; };
  box(6.4, 0.3, 5.2, 0, 0.15, 0, 0x8a6a4a);                                       // the boards
  for (const [x, z] of [[-3, -2.4], [3, -2.4], [-3, 2.4], [3, 2.4]]) box(0.3, 3.6, 0.3, x, 1.8, z, 0x5a3a22);
  box(6.4, 2.6, 0.25, 0, 1.45, -2.45, 0x7a5a3a);                                  // the back wall
  box(0.25, 2.0, 5.0, -3.1, 1.1, 0, 0x7a5a3a); box(0.25, 2.0, 5.0, 3.1, 1.1, 0, 0x7a5a3a);
  box(7.2, 0.25, 6.2, 0, 3.95, -0.2, 0x8a3a2a, -0.16);                            // the roof, falling to the back
  if (!ghost) {
    box(2.2, 0.8, 1.6, -1.8, 0.7, -1.4, 0xe0c060);                                // hay
    box(1.6, 0.5, 0.6, 2.0, 0.55, -1.8, 0x6a4a2a); box(1.4, 0.1, 0.45, 2.0, 0.78, -1.8, 0x6ab0c8);   // the trough, with water in it
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: nameplate(PN()) })); plate.position.set(0, 3.35, 2.52); g.add(plate);
  }
  g.userData.mats = []; g.traverse(o => { if (o.material) g.userData.mats.push(o.material); });
  return g;
}
let stallG = null;
function placeStall() {   // the built stall, wherever it was put
  if (REGION !== 'property' || !F_.stall || stallG) return;
  const st = F_.stall; stallG = buildStall(false); stallG.position.set(st.x, world.heightAt(st.x, st.z), st.z); stallG.rotation.y = st.yaw; scene.add(stallG);
  const c = Math.cos(st.yaw), sn = Math.sin(st.yaw), y = stallG.position.y;
  const at = (lx, lz) => [st.x + lx * c + lz * sn, st.z - lx * sn + lz * c];
  { const [x, z] = at(0, -2.45); world.col.add(x, z, 3.2, 0.2, st.yaw, y - 1, y + 2.8); }
  for (const s2 of [-1, 1]) { const [x, z] = at(s2 * 3.1, 0); world.col.add(x, z, 0.2, 2.5, st.yaw, y - 1, y + 2.2); }
  world.trees && world.trees.push({ x: st.x, z: st.z, g: y, h: 4.2, r: 0.4 });
}
placeStall();
let PLACE = null;
/* the Carpenter's cart came the whole way home with them: parked by the hearth in Beuhk, then in the yard */
let homeCart = null;
function parkCart() {
  if (homeCart) return;
  let x, z, yaw;
  if (REGION === 'property' && young()) { const Y = world.yard || world.PLAZA; x = Y.x + 16; z = Y.z + 18; yaw = -0.6; }
  else if (REGION === 'xilia' && young() && world.hearth) { x = world.hearth.x + 9; z = world.hearth.z + 6; yaw = 0.9; }
  else return;
  // shuffle it clear of anything already standing there
  for (let k = 0; k < 24 && [...world.col.nearAll(x, z, 6)].some(c => c.top - c.bot > 0.6 && Math.abs(c.x - x) < 3.5 + c.hw && Math.abs(c.z - z) < 3.5 + c.hd); k++) { x += Math.cos(k * 2.4) * 3; z += Math.sin(k * 2.4) * 3; }
  const c = buildCart();
  if (REGION === 'property') c.unhitch();   // its two Punks have gone back to the herd in the pasture
  // resting on its four wheels, tipped to the lie of the ground
  const f = V3(Math.sin(yaw), 0, Math.cos(yaw)), r = V3(f.z, 0, -f.x), wh = (a, b) => world.heightAt(x + f.x * a + r.x * b, z + f.z * a + r.z * b);
  const fl = wh(1.3, -1.32), fr = wh(1.3, 1.32), bl = wh(-1.3, -1.32), br = wh(-1.3, 1.32), y = (fl + fr + bl + br) / 4;
  c.g.rotation.order = 'YXZ';
  c.g.position.set(x, y, z); c.g.rotation.set(-Math.atan2((fl + fr) / 2 - (bl + br) / 2, 2.6), yaw, Math.atan2((fr + br) / 2 - (fl + bl) / 2, 2.64)); scene.add(c.g);
  world.col.add(x + Math.sin(yaw) * 0.8, z + Math.cos(yaw) * 0.8, 1.4, 3.6, yaw, y - 1, y + 2.4);
  homeCart = c;
}
parkCart();
function startStallPlace() {
  PLACE = { g: buildStall(true), ok: false, why: 0, x: 0, z: 0, yaw: 0 }; scene.add(PLACE.g);
  proObjective('Chapter I · the Carpenter’s', STORY.STEED.placeObj, STORY.STEED.placeHint);
  hint(STORY.STEED.placeHint);
}
function updatePlace() {
  if (!PLACE) return;
  const f = V3(Math.sin(P.yaw), 0, Math.cos(P.yaw)), x = P.pos.x + f.x * 7, z = P.pos.z + f.z * 7, y = world.heightAt(x, z);
  let why = -1;
  const hs = [[-3, -2.5], [3, -2.5], [-3, 2.5], [3, 2.5]].map(([a, b]) => world.heightAt(x + a, z + b));
  if (Math.max(...hs) - Math.min(...hs) > 1.4) why = 0;
  else if (world.water && (world.water.isWater(x, z) || world.water.depth(x, z) > 0.2)) why = 2;
  else if (world.house && Math.hypot(x - world.house.x, z - world.house.z) < 26) why = 3;
  else for (const c of world.col.nearAll(x, z, 6)) if (c.top - c.bot > 0.6 && c.top > y && Math.abs(c.x - x) < 4 + c.hw && Math.abs(c.z - z) < 3.6 + c.hd) { why = 1; break; }
  if (world.inBounds && !world.inBounds(x, z)) why = 1;
  PLACE.ok = why < 0; PLACE.why = why; PLACE.x = x; PLACE.z = z; PLACE.yaw = P.yaw + Math.PI;
  PLACE.g.position.set(x, Math.max(...hs) - 0.05, z); PLACE.g.rotation.y = PLACE.yaw;
  for (const m of PLACE.g.userData.mats) m.color.setHex(PLACE.ok ? 0x8aff8a : 0xff7a6a);
}
function confirmStall() {
  if (!PLACE) return;
  if (!PLACE.ok) { sfx.blink(); bark('buhkon', STORY.STEED.badSpot[PLACE.why] || 'Not there.', 2.5); return; }
  const st = { x: PLACE.x, z: PLACE.z, yaw: PLACE.yaw };
  scene.remove(PLACE.g); PLACE = null;
  F_.stall = st; persist();
  G.mode = 'intro'; fade(1, 0.8);
  setTimeout(() => {
    placeStall();
    const c = V3(st.x, world.heightAt(st.x, st.z), st.z);
    if (mount) { mount.pos.set(st.x + Math.sin(st.yaw) * 1.5, c.y, st.z + Math.cos(st.yaw) * 1.5); mount.yaw = st.yaw + Math.PI; mount.coming = false; }
    P.pos.set(st.x + Math.sin(st.yaw) * 5, 0, st.z + Math.cos(st.yaw) * 5); P.pos.y = world.col.ground(P.pos.x, P.pos.z, c.y + 3); P.yaw = st.yaw + Math.PI;
    fade(0, 1.2);
    cineCards(STORY.STEED.built, 3400, c, () => {
      dialog(STORY.STEED.fit(PN()), () => {
        F_.saddled = true; if (SAVE.inv.items.saddle) delete SAVE.inv.items.saddle; persist();
        remakeMount(); sfx.victory(); xp(80);
        particles.burst(mount.pos.x, mount.pos.y + 1.5, mount.pos.z, 40, { color: 0xffd27a, speed: 4, size: 0.5, life: 1 });
        toast(STORY.STEED.steed(PN()), 6);
        enterPlay(); setObjective();
      });
    }, { r: 9, h: 3 });
  }, 900);
}
function cancelStall() { if (!PLACE) return; scene.remove(PLACE.g); PLACE = null; setObjective(); toast('No stall yet. Talk to Buhkon when you’ve a spot in mind.', 2.5); }

/* the first token: the chip in the Okid'Relic, the stygian poured, the Gynge's song sung */
let TOK = null;
function firstTokenLesson(n) {
  const T = STORY.FIRST_TOKEN;
  n.talking = 6;
  dialog(T.back.concat(T.ask), () => {
    G.mode = 'intro';
    // into the workshop, at the bench: Tanoc on the stool, the Carpenter at his shoulder
    const sp = interiors.spot && interiors.spot('tokenBench');
    if (sp) {
      if (!interiors.inside || interiors.room(interiors.inside.id) !== sp.room) enterRoom(sp.door, true);
      P.pos.copy(sp.pos); P.yaw = sp.yaw; CAM.yaw = sp.yaw + Math.PI; P.vel.set(0, 0, 0);
      torcain.root.position.copy(P.pos); torcain.root.rotation.y = P.yaw;
      if (sp.buhkon) { n.pos.copy(sp.buhkon); n.actor.root.position.copy(sp.buhkon); n.actor.root.rotation.y = Math.atan2(P.pos.x - sp.buhkon.x, P.pos.z - sp.buhkon.z); n.talking = 99; }
    }
    // the bench: the Okid'Relic, the chip, a crucible of stygian; the camera close over his shoulder
    const f = V3(Math.sin(P.yaw), 0, Math.cos(P.yaw)), at = P.pos.clone().addScaledVector(f, 1.3).setY(P.pos.y + 1.05);
    const g = new THREE.Group(); g.position.copy(at); scene.add(g);
    const okid = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.16, 12), toon(0x6a5a8a, { emissive: 0x3a2a6a, emissiveIntensity: 0.4 })); addOutline(okid, 0.02); g.add(okid);
    const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 16), toon(0xc8a060)); cradle.rotation.x = Math.PI / 2; cradle.position.y = 0.1; g.add(cradle);
    const chip = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), toon(0x8a7a62)); chip.position.set(0.5, 0.05, 0); g.add(chip);
    const pour = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), new THREE.MeshBasicMaterial({ color: 0xb48aff, transparent: true, opacity: 0 })); pour.position.set(0, 0.6, 0); g.add(pour);
    const glow = glowSprite(0xb48aff, 0.9, 0); glow.position.y = 0.18; g.add(glow);
    TOK = { g, okid, chip, pour, glow, step: 'chip', poured: 0, at, cam: P.pos.clone().addScaledVector(f, -0.9).add(V3(Math.cos(P.yaw) * 0.9, 1.9, -Math.sin(P.yaw) * 0.9)) };
    mainCine.play([{ dur: 99999, cam: (k, tt) => ({ p: TOK.cam, l: TOK.at.clone().setY(TOK.at.y + 0.15) }) }], null, { bars: true });
    tokObjective(T.stepChip);
  });
}
/* after the Megla Aagac: the Malsti Punk who was a Ver, never far from his heels */
let malstiPal = null;
function updateMalsti(dt) {
  if (!F_.malstiName || !young() || interiors.inside) { if (malstiPal) malstiPal.root.visible = false; return; }
  if (!malstiPal) { malstiPal = buildMalstiPunk({ seed: 61 }); malstiPal.root.scale.setScalar(5.5); malstiPal.root.position.copy(P.pos); scene.add(malstiPal.root); malstiPal.v = V3(); }
  const m = malstiPal, R = m.root; R.visible = true;
  const want = V3(P.pos.x - Math.sin(P.yaw) * 1.4 + Math.cos(P.yaw) * 0.9, 0, P.pos.z - Math.cos(P.yaw) * 1.4 - Math.sin(P.yaw) * 0.9);
  if (R.position.distanceTo(P.pos) > 30) R.position.copy(want);
  const dx = want.x - R.position.x, dz = want.z - R.position.z, d = Math.hypot(dx, dz), sp = d > 0.4 ? Math.min(14, d * 3.5) : 0;
  if (sp > 0) { R.position.x += dx / d * sp * dt; R.position.z += dz / d * sp * dt; R.rotation.y = dampAngle(R.rotation.y, Math.atan2(dx, dz), 10, dt); }
  R.position.y = world.col.ground(R.position.x, R.position.z, P.pos.y + 1);
  m.animate(dt, { speed: sp, t: G.t });
}
function tokObjective(text) { proObjective('Chapter II · the first token', text, ''); mainCine.caption(text); }
function tokKey(code, up) {   // the lesson takes E (held for the pour) and the song's notes
  if (!TOK) return false;
  const T = STORY.FIRST_TOKEN;
  if (TOK.step === 'chip' && code === 'KeyE' && !up) {
    TOK.step = 'busy'; sfx.ui();
    const c = TOK.chip, from = c.position.clone(), t0 = performance.now();
    const mv = () => { const k = Math.min(1, (performance.now() - t0) / 700); c.position.lerpVectors(from, V3(0, 0.14, 0), k); c.position.y += Math.sin(k * Math.PI) * 0.2; if (k < 1) requestAnimationFrame(mv); else { sfx.core(); dialog(T.chipIn, () => { G.mode = 'intro'; TOK.step = 'pour'; tokObjective(T.stepPour); }); } };
    mv(); return true;
  }
  if (TOK.step === 'sing' && !up && SONG.keys.includes(code)) { songPress(code); return true; }
  return false;
}
/* the song: notes slide down four lanes; press each as it crosses the line */
const SONG = { keys: ['KeyA', 'KeyS', 'KeyD', 'KeyF'], labels: ['A', 'S', 'D', 'F'], el: null, notes: [], t: 0, hit: 0, miss: 0 };
function songStart() {
  const T = STORY.FIRST_TOKEN;
  TOK.step = 'sing'; tokObjective(T.stepSing);
  const box = document.createElement('div'); box.id = 'song';
  box.style.cssText = 'position:fixed;left:50%;bottom:16vh;transform:translateX(-50%);width:min(360px,80vw);height:46vh;z-index:31;pointer-events:none;border-radius:12px;background:linear-gradient(rgba(20,12,40,.0),rgba(20,12,40,.55));border:1px solid rgba(200,160,255,.25)';
  box.innerHTML = SONG.labels.map((l, i) => `<div style="position:absolute;bottom:6px;left:${i * 25 + 12.5}%;transform:translateX(-50%);width:44px;height:44px;border-radius:50%;border:2px solid #c8a0ff;color:#f0e0ff;font:600 15px var(--display,Georgia);display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px #9a6aff">${l}</div>`).join('') + '<div style="position:absolute;left:0;right:0;bottom:28px;height:2px;background:rgba(220,190,255,.6)"></div>';
  document.body.appendChild(box); SONG.el = box;
  // the Gynge's song: slow and heavy, like rock grinding — then rising
  const pat = [0, 0, 2, 1, 3, 3, 2, 0, 1, 1, 3, 2, 0, 2, 3, 3];
  SONG.notes = pat.map((lane, i) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;top:0;left:${lane * 25 + 12.5}%;transform:translate(-50%,-50%);width:30px;height:30px;border-radius:50%;background:radial-gradient(#fff,#b48aff 60%,transparent 70%);opacity:0`; box.appendChild(d); return { lane, at: 1.6 + i * 0.62, d, done: false }; });
  SONG.t = 0; SONG.hit = 0; SONG.miss = 0;
}
function songPress(code) {
  const lane = SONG.keys.indexOf(code);
  let best = null, bd = 0.28;
  for (const n of SONG.notes) { if (n.done || n.lane !== lane) continue; const d = Math.abs(n.at - SONG.t); if (d < bd) { bd = d; best = n; } }
  if (best) { best.done = true; best.d.style.opacity = 0; SONG.hit++; tone && tone(); sfx.core(); TOK.glow.material.opacity = Math.min(1, 0.2 + SONG.hit / SONG.notes.length); particles.burst(TOK.at.x, TOK.at.y + 0.3, TOK.at.z, 6, { color: 0xc8a0ff, speed: 1.5, size: 0.15, life: 0.6 }); }
  else sfx.blink();
}
const tone = () => {};
function updateToken(gameDt) {
  if (!TOK) return;
  // real time: the song has to keep its own beat however the frames come
  const now = performance.now(), dt = Math.min(0.25, TOK.last ? (now - TOK.last) / 1000 : gameDt); TOK.last = now;
  const T = STORY.FIRST_TOKEN;
  if (TOK.step === 'pour') {
    TOK.pour.material.opacity = damp(TOK.pour.material.opacity, TOK.pouring ? 0.85 : 0, 10, dt);
    TOK.pouring = !!keys.KeyE;
    if (TOK.pouring) { TOK.poured += dt; TOK.glow.material.opacity = Math.min(0.5, TOK.poured * 0.25); if (Math.random() < 0.6) particles.emit(TOK.at.x, TOK.at.y + 0.2, TOK.at.z, { vx: (Math.random() - 0.5) * 0.4, vy: 0.4, vz: (Math.random() - 0.5) * 0.4, color: 0xb48aff, size: 0.12, life: 0.6, drag: 1 }); }
    if (TOK.poured > 2.2) { TOK.step = 'busy'; TOK.pouring = false; TOK.pour.material.opacity = 0; sfx.heal(); dialog(T.poured, () => { G.mode = 'intro'; songStart(); }); }
  }
  if (TOK.step === 'sing') {
    SONG.t += dt;
    const H = SONG.el.clientHeight;
    for (const n of SONG.notes) {
      if (n.done) continue;
      const y = H - 28 - (n.at - SONG.t) * H * 0.55;
      n.d.style.top = y + 'px'; n.d.style.opacity = y > 0 ? 1 : 0;
      if (SONG.t - n.at > 0.3) { n.done = true; n.d.style.opacity = 0; SONG.miss++; }
    }
    if (SONG.notes.every(n => n.done)) {
      SONG.el.remove(); SONG.el = null;
      if (SONG.hit >= SONG.notes.length * 0.6) tokenMade();
      else { TOK.step = 'busy'; dialog(T.missed, () => { G.mode = 'intro'; songStart(); }); }
    }
  }
  if (TOK.holo) { TOK.holo.rotation.y += dt * 0.6; TOK.holo.position.y = TOK.at.y + 0.55 + Math.sin(performance.now() / 600) * 0.03; TOK.holoA && TOK.holoA.animate(dt, { speed: 0, t: performance.now() / 1000, windup: 0.5 + Math.sin(performance.now() / 700) * 0.5, attack: 0 }); }
}
function tokenMade() {
  const T = STORY.FIRST_TOKEN;
  TOK.step = 'busy'; sfx.victory();
  // the truth of it, the size of his hand, turning in the air over the Okid'Relic
  const a = buildGynge({ seed: 77 }); a.root.scale.setScalar(0.11);
  a.root.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.82; if (o.material.emissive) { o.material.emissive.setHex(0x8a6aff); o.material.emissiveIntensity = 0.5; } } });
  const holo = new THREE.Group(); holo.add(a.root, glowSprite(0xb48aff, 0.9, 0.5)); holo.position.copy(TOK.at); scene.add(holo);
  TOK.holo = holo; TOK.holoA = a;
  particles.burst(TOK.at.x, TOK.at.y + 0.4, TOK.at.z, 50, { color: 0xc8a0ff, speed: 2.5, size: 0.2, life: 1.2, gravity: 0.5 });
  // a real token, in the Dya'Akara pouch: an individual — the one he met
  try { const tk = DYA3.mintToken('gynge', 0x6a17a3c, { rarity: 3, name: T.tokenName }); DYA3.addToken(SAVE.dya, tk, SAVE.dya.pouch.length < 25); } catch (e) { /* the pouch keeps its own rules */ }
  invAdd(SAVE.inv, 'tok_gynge', 1); if (SAVE.inv.items.gynge_chip) SAVE.inv.items.gynge_chip = 0;
  if (!SAVE.inv.items.okid) invAdd(SAVE.inv, 'okid', 1);
  xp(200); persist();
  setTimeout(() => dialog(T.sang, () => {
    G.mode = 'intro';
    F_.pro = 'done'; F_.ch2 = true; persist();
    playCards(T.end, 3600, () => {
      mainCine.stop(); scene.remove(TOK.g); scene.remove(TOK.holo); TOK = null;
      enterPlay(); setObjective();
      toast('Your first token — the Gynge of the Megla Aagac — is in your Dya’Akara pouch.', 5);
    });
  }), 1600);
}

/* ---------------- Day 5: Beuhk, and what people are saying. Day 6: the little road up the hill ---------------- */
let BK = null;
function arriveBeuhk() {
  F_.young = true; applyYoung();
  const st = F_.bk || 'rest';
  BK = { heard: new Set() };
  const bk = npcs.find(n => n.def.id === 'buhkon');
  if (st === 'rest') {
    // in from the north road, down out of the pass
    P.pos.set(2, 0, -58); P.pos.y = world.col.ground(P.pos.x, P.pos.z, world.heightAt(P.pos.x, P.pos.z) + 2); P.yaw = 0; CAM.yaw = Math.PI;
    if (bk) { bk.pos.set(world.hearth.x + 2.5, 0, world.hearth.z + 1); bk.pos.y = world.col.ground(bk.pos.x, bk.pos.z, world.PLAZA.y + 2); bk.actor.root.position.copy(bk.pos); }
    dn.setHour(17.5);
  } else {
    P.pos.set(-92, 0, 40); P.pos.y = world.col.ground(P.pos.x, P.pos.z, world.heightAt(P.pos.x, P.pos.z) + 2); P.yaw = -Math.PI / 2; CAM.yaw = Math.PI / 2;
    dn.setHour(8);
  }
  P.vel.set(0, 0, 0); P.lastSafe.copy(P.pos);
  G.mode = 'intro'; introT = 0; G.t = 0;
  fade(0, 1.4);
  const R = STORY.ROAD;
  if (st === 'rest') {
    cineCards(R.day5.cards, 2600, P.pos, () => {
      enterPlay(); showLocation(...R.day5.loc);
      dialog(R.day5.rest, () => { setObjective(); hint('Walk through town near people — and listen.'); });
    });
  } else startDay6();
}
function beuhkTick() {
  if (!BK || G.mode !== 'play') return;
  if (F_.bk === 'rest') {
    const W = STORY.ROAD.day5.whispers;
    for (const n of npcs) {
      if (n.def.id === 'buhkon' || BK.heard.size >= W.length || BK.heard.has(n.def.id)) continue;
      if (n.pos.distanceTo(P.pos) < 7) { BK.heard.add(n.def.id); n.talking = 3; bark('folk', W[BK.heard.size - 1][1], 5); setObjective(); break; }
    }
    if (BK.heard.size >= W.length && !BK.done && barkTimer <= 0) {
      BK.done = true;
      // then supper to fetch, before the night: a loaf from Ama, a wick from Hemla
      dialog(STORY.ROAD.day5.heard.concat(STORY.ROAD.day5.errand), () => { BK.errand = {}; setObjective(); });
    }
  }
}
/* day six, on the forest path itself: walk it to the top, where the trees open */
function pathWalk() {
  applyYoung(); F_.young = true; F_.bk = 'climb'; G.pathSaid = 0;
  BK = BK || { heard: new Set() };
  dn.setHour(10);
  showLocation('The Forest Path', 'Day six · west of Beuhk');
  dialog(STORY.ROAD.day6.path, () => setObjective());
}
function pathTick() {
  if (F_.bk !== 'climb' || G.mode !== 'play' || !world.crestPoint) return;
  const W = STORY.ROAD.day6.pathBarks;
  G.pathSaid = G.pathSaid || 0;
  const prog = 1 - (P.pos.x - world.crestPoint.x) / (world.pathStart.x - world.crestPoint.x);
  if (G.pathSaid < W.length && prog > (G.pathSaid + 1) / (W.length + 1)) { const [w, l] = W[G.pathSaid]; bark(w, l, 4.5); G.pathSaid++; }
  if (P.pos.x < world.crestPoint.x + 4) {
    F_.bk = 'crest'; G.mode = 'intro'; P.vel.set(0, 0, 0);
    // stand at the top and look: the camera leaves him at the gateposts and flies out over the whole of it
    CAM.yaw = Math.PI / 2; CAM.pitch = 0.08; CAM.wantDist = 9;
    P.yaw = -Math.PI / 2; torcain.root.rotation.y = P.yaw;
    const C = world.crestPoint, H = world.house, hy = x => world.heightAt(x.x, x.z), L = STORY.ROAD.day6.crest;
    const house = V3(H.x, hy(H) + 6, H.z), lake = V3(-660, 0, 40);
    mainCine.play([
      { dur: 5.5, from: { p: [C.x + 7, C.y + 2.2, C.z + 3.5], l: [C.x - 40, C.y - 2, C.z - 2] }, to: { p: [C.x + 4, C.y + 2.6, C.z + 2.2], l: [C.x - 60, C.y - 6, C.z] }, caption: L[0] },
      { dur: 8, ease: 'inout', from: { p: [C.x - 2, C.y + 4, C.z], l: [C.x - 120, C.y - 20, C.z] }, to: { p: [C.x - 120, C.y + 70, C.z + 30], l: [lake.x, 0, lake.z] }, caption: L[1] },
      { dur: 8, cam: k => { const a = -0.6 + k * 1.5, R = 95 - k * 25; return { p: V3(H.x + Math.cos(a) * R, house.y + 38 - k * 14, H.z + Math.sin(a) * R), l: V3(H.x - 10 + k * 20, house.y - 2, H.z + 10) }; }, caption: L[2] },
      { dur: 8, from: { p: [H.x - 80, house.y + 120, H.z - 220], l: [H.x - 300, 60, 2600] }, to: { p: [H.x - 200, house.y + 160, H.z - 120], l: [-500, 180, 2900] }, fov: 55, fovTo: 48, caption: L[3] },
      { dur: 5.5, from: { p: [H.x + 46, house.y + 8, H.z + 30], l: [H.x, house.y - 2, H.z] }, to: { p: [H.x + 34, house.y + 4, H.z + 22], l: [H.x, house.y - 3, H.z] }, caption: L[4] },
    ], () => { BK = null; F_.pro = 'done'; persist(); startMorning(); });
  }
}
function startDay6() {
  const bk = npcs.find(n => n.def.id === 'buhkon');
  if (bk) { bk.pos.copy(bk.home); bk.actor.root.position.copy(bk.home); }   // he went on ahead to open up the house
  cineCards(STORY.ROAD.day6.cards, 3200, P.pos, () => {
    enterPlay(); showLocation('The little road', 'Day six · out of Beuhk, west and up');
    dialog([['buhkon', 'I’ll go ahead and open the house up. The little road west, over the bridge, and into the trees — the forest path. Follow it to the top. You can’t miss it.']], () => setObjective());
  });
}
/* day five's supper errand: talk to Ama and to Hemla, then back to the Carpenter at the hearth */
function bkErrandOptions(n) {
  if (!young() || F_.pro !== 'beuhk' || F_.bk !== 'rest' || !BK || !BK.errand) return [];
  const R = STORY.ROAD.day5, id = n.def.id;
  if ((id === 'v1' || id === 'hemla') && !BK.errand[id]) return [{ label: `<b style="color:#ffd27a">${id === 'v1' ? 'Ask for a loaf — for Buhkon Eldi' : 'Ask for a lamp-wick — for Buhkon Eldi'}</b>`, act: () => {
    n.talking = 1.5;
    dialog(id === 'v1' ? R.ama : R.hemla, () => { BK.errand[id] = true; if (id === 'v1') { invAdd(SAVE.inv, 'bun', 1); lootToast('bun', 1); } sfx.core(); setObjective(); });
  } }];
  return [];
}
function bkErrandDone() { return BK && BK.errand && BK.errand.v1 && BK.errand.hemla; }
function beuhkObjective() {
  const R = STORY.ROAD;
  if (F_.bk === 'rest' && BK && BK.errand) { const n = (BK.errand.v1 ? 1 : 0) + (BK.errand.hemla ? 1 : 0); if (n >= 2) proObjective('The Road North · Beuhk', R.day5.back, ''); else proObjective('The Road North · Beuhk', R.day5.errandObj(n), R.day5.errandHint, 2, n); return; }
  if (F_.bk === 'rest') proObjective('The Road North · Beuhk', R.obj.day5, `Overheard: ${BK ? BK.heard.size : 0}/4`, 4, BK ? BK.heard.size : 0);
  else proObjective('The Road North · Day six', R.day6.obj, REGION === 'property' ? 'Follow the path west, up through the trees' : 'West out of town, over the bridge, into the trees');
}
function beuhkGoal() {
  if (REGION === 'property') return world.crestPoint;
  if (F_.bk === 'rest' && BK && BK.errand) { const want = bkErrandDone() ? 'buhkon' : !BK.errand.v1 ? 'v1' : 'hemla', n = npcs.find(q => q.def.id === want); return n ? n.pos : null; }
  if (F_.bk === 'rest') { let best = null, bd = 1e9; for (const n of npcs) { if (n.def.id === 'buhkon' || (BK && BK.heard.has(n.def.id))) continue; const d = n.pos.distanceTo(P.pos); if (d < bd) { bd = d; best = n; } } return best ? best.pos : null; }
  return world.westGoal || null;
}

/* the cape and the Tukang came later; the hatchet comes from the Carpenter */
function youngGear(on) { for (const k of ['relic', 'weapon']) if (torcain[k]) torcain[k].visible = on; applyWear(); }
/* ================================================================
   CHAPTER I — the Carpenter's apprentice: young Tanoc in Beuhk
   ================================================================ */
function applyYoung() {
  if (G.youngOn) return;
  G.youngOn = true;
  torcain.root.scale.multiplyScalar(0.82);
  youngGear(false); torcain.weapon.visible = F_.pro === 'done' || F_.pro === 'beuhk';
  document.querySelector('#vitals .name').innerHTML = `TANOC <small>Filugani</small><span id="lvl">${$('lvl') ? $('lvl').textContent : 'LV 1'}</span>`;
  $('hud').classList.add('young');
  phorus.root.visible = false;
  F_.firstLantern = true;   // nobody to wake the lanterns for him with a speech
  for (const k of SLOT_KEYS) if (SAVE.slots[k] && SLOT_ACTIONS[SAVE.slots[k]] && SLOT_ACTIONS[SAVE.slots[k]].kind !== 'Relic' && SAVE.slots[k] !== 'hlyst' && SAVE.slots[k] !== 'sprengju') delete SAVE.slots[k];
  for (const k of SLOT_KEYS) if (SAVE.slots[k] === 'tukang') delete SAVE.slots[k];
  renderSpellBar();
  restyleAxe();
}
/* the humming stone in the lakeshore mud, by the docks */
const RELIC_SPOT = world.propShore ? world.propShore.clone() : null;
const relicMesh = RELIC_SPOT ? (() => {
  const g = new THREE.Group();
  const st = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), toon(0x7a8090, { emissive: 0x2a6aff, emissiveIntensity: 0.6 })); st.scale.set(1.2, 0.7, 1); addOutline(st, 0.03); g.add(st);
  g.add(glowSprite(0x5aa0ff, 1.6, 0.7));
  g.position.copy(RELIC_SPOT).add(V3(0, 0.15, 0)); g.visible = false; scene.add(g);
  return g;
})() : null;
const relicOut = () => young() && (F_.yq || 0) === 0;
function startMorning() {
  applyYoung();
  F_.yq = F_.yq || 0; persist();
  CAM.wantDist = 6.5;
  // he wakes in his loft bed, up in the big house
  const house = (world.doors || []).find(d => d.kind === 'manor');
  if (house) {
    enterRoom(house, true);
    const room = interiors.room(house.id), b = room && room.items.find(i => /loft/.test(i.label));
    if (b) { P.pos.set(b.pos.x - 2.2, b.pos.y - 0.8, b.pos.z + 1.2); P.yaw = Math.PI; CAM.yaw = 0; }
  } else {
    const Y = world.yard || world.PLAZA;
    P.pos.set(Y.x - 8, 0, Y.z - 4); P.pos.y = world.col.ground(P.pos.x, P.pos.z, world.heightAt(P.pos.x, P.pos.z) + 2);
  }
  P.vel.set(0, 0, 0); if (!interiors.inside) P.lastSafe.copy(P.pos);
  dn.setHour(7.5);
  G.mode = 'intro'; introT = 0; G.t = 0;
  fade(0, 1.4);
  cineCards([STORY.YOUNG.title + '.', 'The Carpenter’s house. The next morning.'], 3200, P.pos, () => {
    enterPlay();
    showLocation('The Big House', 'Chapter I · the Carpenter’s apprentice');
    dialog(STORY.YOUNG.morning, () => { setObjective(); hint('Follow the ◆ on your compass.'); });
  }, interiors.inside ? { r: 3, h: 0.9, wide: 1.25, look: 0.9 } : {});
}
function youngSet(q) { F_.yq = q; persist(); setObjective(); }
function youngTakeRelic() {
  invAdd(SAVE.inv, 'r_longevity', 1); lootToast('r_longevity', 1); sfx.core(); xp(30);
  particles.burst(RELIC_SPOT.x, RELIC_SPOT.y + 0.3, RELIC_SPOT.z, 24, { color: 0x5aa0ff, speed: 4, size: 0.4, life: 0.8, gravity: 2 });
  youngSet(1);
  dialog(STORY.YOUNG.relicTaken, () => setObjective());
}
function youngBuhkon(n) {
  const q = F_.yq || 0, Y = STORY.YOUNG;
  n.talking = 4;
  if (F_.pro === 'beuhk' && F_.bk === 'rest' && bkErrandDone()) { dialog(STORY.ROAD.day5.errandBack, () => { F_.bk = 'climb'; persist(); G.mode = 'intro'; fade(1, 0.8); setTimeout(() => { arriveBeuhk(); }, 900); }); return; }
  if (F_.pro === 'beuhk') { dialog([['buhkon', F_.bk === 'rest' ? (BK && BK.errand ? 'A loaf from Ama, a wick from Hemla. Go on.' : 'Go on, walk about. Ears open, hat on.') : 'Up the little road, west. I’ll have the kettle on.']]); return; }
  if (F_.pro === 'token') { firstTokenLesson(n); return; }
  if (F_.saddle && !F_.stall && SAVE.inv.items.saddle) { dialog(STORY.STEED.askBuhkon(PN()), () => startStallPlace()); return; }
  if (apOn()) { apBuhkon(n); return; }
  if (q >= 5 && !F_.megla) {
    ask('buhkon', 'Something on your mind? You keep touching that amulet.', [
      { label: 'It’s pulling. North. <em style="color:var(--brass2)">· Chapter II: the Megla Aagac</em>', act: () => saddled() ? meglaBegin() : dialog([['buhkon', `North, on foot? Not a chance. Get a saddle on ${PN()} first — Old Ruut in Beuhk has one he’d part with, if you help him with his strays.`]]) },
      { label: SAVE.inv.items.okid ? 'Sing a token' : 'Ask about tokens', act: () => buhkonTokens() },
      { label: 'Not yet', act: null },
    ]);
    return;
  }
  if (q === 1) {
    dialog(Y.relicBuhkon, () => {
      F_.yHlyst = true; learnTrigger('r_longevity'); persist(); nurHlyst();
      dialog(Y.hlyst, () => { SAVE.counters.y_dummy = 0; enemies.list.filter(e => e.T.disp === 'training' && e.dead).forEach(e => respawnDummy(e, 0)); youngSet(2); toast('Nur’Hlyst — learned! (G)', 3); });
    });
    return;
  }
  if (q === 4) { dialog(Y.end, () => { youngSet(5); xp(120); G.shards += 30; toast(Y.chapterEnd, 6); }); return; }
  if (q === 0) { dialog([['buhkon', 'Morning! Bread’s on the table. Go and have a look around — the lake’s just down the hill.']]); return; }
  if (q === 2 || q === 3) { dialog(q === 2 ? Y.hlyst.slice(-1) : Y.dummies.slice(-1)); return; }
  ask('buhkon', Y.buhkonIdle[Math.floor(Math.random() * Y.buhkonIdle.length)], [
    { label: SAVE.inv.items.okid ? 'Sing a token' : 'Ask about tokens <em style="color:var(--brass2)">· Dya’Akara</em>', act: () => buhkonTokens() },
    ...(laterGame() ? [{ label: 'Bind a Relic into something I wear <em style="color:var(--brass2)">· the Carpenter’s bench</em>', act: () => bindAsk() }] : []),
    { label: 'Run the dummy drills again', act: () => { enemies.list.filter(e => e.T.disp === 'training' && e.dead).forEach(e => respawnDummy(e, 0)); toast('Buhkon props the dummies back up.', 2); lockMouse(); } },
    { label: 'Goodbye', act: null },
  ]);
}
/* after the Megla, the Carpenter will bind a Relic's Hurst into armor */
function bindAsk() {
  if (!F_.bindTold) { F_.bindTold = true; persist(); dialog([['buhkon', 'Binding? Who told you about — the Gynge. Of course.'], ['buhkon', 'A Hurst can live in more than a stone, if it’s willing. Bring me the Relic and the thing you mean to wear, and a lump of stygian to seat it. It goes in for good, mind.']], () => openBook('bind')); return; }
  openBook('bind');
}
function youngGoal() {
  const q = F_.yq || 0, bk = npcs.find(n => n.def.id === 'buhkon');
  if (interiors.inside) return interiors.room(interiors.inside.id) ? interiors.room(interiors.inside.id).out : null;
  if (apOn() && !(F_.saddle && !F_.stall && SAVE.inv.items.saddle)) return apGoal();
  if (REGION === 'xilia') return q >= 5 ? null : world.westGoal;   // Buhkon's is out west, along the forest path
  if (q === 0) return RELIC_SPOT;
  if (q === 1 || q === 4 || F_.pro === 'token' || (q >= 5 && !F_.megla) || (F_.saddle && !F_.stall)) return bk ? bk.pos : null;
  if (q === 2) { const e = enemies.list.find(e => e.kind === 'dummy' && !e.dead); return e ? e.pos : null; }
  if (q === 3) return V3(world.tower.x, world.tower.y, world.tower.z);
  return null;
}
function youngObjective() {
  const q = F_.yq || 0, O = STORY.YOUNG_OBJ, n = Math.min(3, SAVE.counters.y_dummy || 0);
  const head = REGION === 'property' ? 'Chapter I · the Carpenter’s' : 'Chapter I · Beuhk';
  if (REGION === 'xilia' && q < 5) { proObjective(head, 'Back to Buhkon’s — out along the forest path, west of town', 'The little road west, over the bridge and into the trees'); return; }
  if (q === 0 && interiors.inside) proObjective(head, O.explore, 'Downstairs and out of the front door');
  else if (q === 0) proObjective(head, O.relic, 'Down the long slope to the west, where the old dock runs into the lake');
  else if (q === 1) proObjective(head, O.bring, 'He’s up at the house, or in the workshop');
  else if (q === 2) proObjective(head, O.dummies(n), 'Left-click to swing — keep clicking to combo', 3, n);
  else if (q === 3) proObjective(head, O.glide, 'Jump, then hold Space while falling');
  else if (q === 4) proObjective(head, O.back, '');
  else if (PLACE) proObjective(head, STORY.STEED.placeObj, STORY.STEED.placeHint);
  else if (F_.saddle && !F_.stall && SAVE.inv.items.saddle) proObjective(head, STORY.STEED.bring, 'He’s up at the house, or in the workshop');
  else if (F_.pro === 'token') proObjective('Chapter II · home again', STORY.FIRST_TOKEN.findObj, 'Show him the Gynge chip');
  else if (apOn()) apObjective();
  else if (!F_.megla) proObjective(head, 'The Sniller amulet is tugging north — talk to Buhkon', 'When you’re ready: Chapter II, the Megla Aagac');
  else proObjective(F_.ch2 ? 'Chapter II · done' : head, O.free, 'Explore the property, or walk the forest path back to Beuhk · G for Nur’Hlyst');
}
function youngTick() {
  if (relicMesh) { relicMesh.visible = relicOut(); if (relicMesh.visible) { relicMesh.rotation.y = G.t; relicMesh.children[1].material.opacity = 0.5 + Math.sin(G.t * 3) * 0.3; } }
  if (G.mode !== 'play') return;
  if (relicOut() && RELIC_SPOT && !G.relicSeen && P.pos.distanceTo(RELIC_SPOT) < 16) { G.relicSeen = true; bark('tale', STORY.YOUNG.relicSpot, 4); }
  if (F_.yq === 3 && REGION === 'property' && P.gliding && P.pos.y - world.heightAt(P.pos.x, P.pos.z) > 2.5) { youngSet(4); sfx.core(); toast('Gliding — learned!', 2.5); xp(40); bark('buhkon', STORY.YOUNG.glided[0][1], 4); }
}

/* ================================================================
   CHAPTER I, GO ON — THE TWO SUMMERS (STORY.APPRENTICE)
   After the first day, a season at a time on the Carpenter's land:
   F_.ap counts the steps, F_.apGiven says Buhkon has set this one,
   and anything a step needs to remember lives in F_.ap* too.
   ================================================================ */
const AP = { DELIVER: 0, BUILD: 1, AMULETS: 2, TESTS: 3, HARVEST: 4, FESTIVAL: 5, CAVE: 6, WINTER: 7, VOICE: 8, SOURCES: 9, SPRING: 10, RIDE: 11, HOLLOW: 12, LOOKOUT: 13, DONE: 14 };
const apStep = () => F_.ap ?? 0;
const apOn = () => young() && (F_.yq || 0) >= 5 && !F_.megla && F_.pro === 'done' && apStep() < AP.DONE;
const apWinter = () => young() && !F_.megla && (apStep() === AP.WINTER || apStep() === AP.VOICE);
const APS = STORY.APPRENTICE;
const RAID_N = 5;
const apBuhkonNpc = () => npcs.find(n => n.def.id === 'buhkon');
const apExitEast = () => (world.exits || []).find(e => e.to === 'xilia');
const apStone = () => stones.find(s => s.key === 'p_path');
const apHome = () => REGION === 'property' ? (apBuhkonNpc() || {}).pos : world.westGoal;
/* move the run on to the next step; a season's cards wait until you're out on the land to see them */
function apAdvance(to, cards) {
  F_.ap = to; F_.apGiven = false;
  if (cards) F_.apCards = cards;
  persist(); setObjective();
}
/* the loft bed in the big house, for waking up in (and lying awake in) */
function toLoftBed() {
  const house = (world.doors || []).find(d => d.kind === 'manor');
  if (!house) return false;
  if (!interiors.inside) enterRoom(house, true);
  const room = interiors.room(house.id), b = room && room.items.find(i => /loft/.test(i.label));
  if (b) { P.pos.set(b.pos.x - 2.2, b.pos.y - 0.8, b.pos.z + 1.2); P.yaw = Math.PI; CAM.yaw = 0; }
  P.vel.set(0, 0, 0);
  return true;
}

/* ---------------- the harvest festival, in Beuhk's square ---------------- */
const festival = REGION === 'xilia' && young() && !F_.megla && apStep() === AP.FESTIVAL ? (() => {
  const g = new THREE.Group(), C = world.PLAZA, fx = C.x + 10, fz = C.z - 8, fy = world.heightAt(fx, fz);
  for (let i = 0; i < 9; i++) {   // the bonfire: a cone of logs
    const a = i / 9 * Math.PI * 2, log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 4.2, 6), toon(0x5a3a20));
    log.position.set(fx + Math.cos(a) * 0.9, fy + 1.7, fz + Math.sin(a) * 0.9); log.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); g.add(log);
  }
  const fire = glowSprite(0xff8a3a, 9, 0.95); fire.position.set(fx, fy + 2.4, fz); g.add(fire);
  const lamps = [];
  for (let k = 0; k < 4; k++) {   // strings of lanterns across the square, sagging between the roofs
    const a = k / 4 * Math.PI + 0.3, x0 = C.x + Math.cos(a) * 24, z0 = C.z + Math.sin(a) * 24, x1 = C.x - Math.cos(a) * 24, z1 = C.z - Math.sin(a) * 24;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, x = lerp(x0, x1, t), z = lerp(z0, z1, t), y = world.heightAt(x, z) + 6.5 - Math.sin(t * Math.PI) * 1.6;
      const l = glowSprite([0xffc070, 0xff8ac8, 0x9adfff, 0xffe08a][(i + k) % 4], 1.1, 0.9); l.position.set(x, y, z); g.add(l); lamps.push(l);
    }
  }
  scene.add(g);
  world.col.add(fx, fz, 1.4, 1.4, 0, fy - 1, fy + 3.5);
  return { g, fire, lamps, x: fx, y: fy, z: fz };
})() : null;

/* ---------------- Eldi I: the Carpenter's first boat, on the far shore ---------------- */
const oldBoat = REGION === 'property' && young() ? (() => {
  let x = -1020;
  for (; x > -1220; x -= 4) if (world.heightAt(x, 40) > (world.water ? world.water.level : 0) + 0.4) break;
  x -= 5;
  const z = 40, y = world.heightAt(x, z), g = new THREE.Group(), wood = toon(0x8a8274);
  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 15), wood); keel.position.y = 0.2; g.add(keel);
  for (let i = 0; i < 8; i++) {   // the ribs, grey and whole: fire-tree never burns, and it hardly rots
    const r = 2.3 - Math.abs(i - 3.5) * 0.18, rib = new THREE.Mesh(new THREE.TorusGeometry(r, 0.16, 5, 10, Math.PI), wood);
    rib.rotation.z = Math.PI; rib.position.set(0, r * 0.9, -6.3 + i * 1.8); g.add(rib);
  }
  for (const s of [-1, 1]) { const plank = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 9), wood); plank.position.set(s * 1.9, 1.2, -1); plank.rotation.z = s * 0.4; g.add(plank); }
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, 0.4), wood); stem.position.set(0, 1.6, 7.4); stem.rotation.x = 0.3; g.add(stem);
  const parts = []; g.traverse(m => { if (m.isMesh) parts.push(m); });
  for (const m of parts) { m.castShadow = true; m.receiveShadow = true; addOutline(m, 0.03); }
  g.position.set(x, y - 0.5, z); g.rotation.set(0, 0.4, 0.32);
  scene.add(g);
  world.col.add(x, z, 2.4, 7.5, 0.4, y - 1, y + 1.4);
  return { g, pos: V3(x, y + 0.6, z) };
})() : null;

/* ---------------- Venkin on the Carpenter's land: by the barn, then at Tanoc's heels ---------------- */
let apV = null;
function apVenkin(on) {
  if (REGION !== 'property') return;
  if (!on) { if (apV) { scene.remove(apV.a.root); apV = null; } return; }
  if (apV) return;
  const a = buildKeilia({ seed: 11, cloth: 0x4a5a34, eye: 0x7a8a2a }); a.root.scale.multiplyScalar(0.74);
  const b = world.SITES && world.SITES.yard ? V3(150 + 6, 0, 82 + 8) : P.pos.clone();
  const p = V3(b.x, world.col.ground(b.x, b.z, world.heightAt(b.x, b.z) + 2), b.z); a.root.position.copy(p); scene.add(a.root);
  apV = { a, pos: a.root.position, follow: false };
}
function apVenkinTick(dt) {
  if (!apV) return;
  const v = apV;
  let sp = 0;
  if (v.follow) {
    const want = V3(P.pos.x - Math.sin(P.yaw) * 2 - Math.cos(P.yaw) * 1.6, 0, P.pos.z - Math.cos(P.yaw) * 2 + Math.sin(P.yaw) * 1.6), dx = want.x - v.pos.x, dz = want.z - v.pos.z, d = Math.hypot(dx, dz);
    if (d > 60) { v.pos.x = want.x; v.pos.z = want.z; }
    else if (d > 0.8) { sp = Math.min(P.riding ? 18 : 10, d * 2.5); v.pos.x += dx / d * sp * dt; v.pos.z += dz / d * sp * dt; v.a.root.rotation.y = Math.atan2(dx, dz); }
    world.col.resolve(v.pos, 0.5, 2);
  } else v.a.root.rotation.y = dampAngle(v.a.root.rotation.y, Math.atan2(P.pos.x - v.pos.x, P.pos.z - v.pos.z), 3, dt);
  v.pos.y = world.col.ground(v.pos.x, v.pos.z, v.pos.y + 1);
  v.a.animate(dt, { speed: sp, onGround: true, t: G.t });
}
const apHollowNear = () => { const h = REGION === 'property' && world.SITES && world.SITES.hollow; return !!h && Math.hypot(P.pos.x - h.x, P.pos.z - h.z) < 22; };
function apHollowPulse() {
  if (!apOn() || apStep() !== AP.HOLLOW || !F_.apGiven || F_.apHollow || !apHollowNear()) return false;
  F_.apHollow = true; persist(); hlyst.cd = 6; sfx.sense();
  particles.ring(P.pos.x, P.pos.y + 0.6, P.pos.z, 120, 26, { color: 0x9fe8ff, size: 0.8, life: 1.6, drag: 0.2 });
  dialog(APS.hollow.found.concat(APS.hollow.result), () => { xp(150); setObjective(); });
  return true;
}
/* ---------------- talking to the Carpenter ---------------- */
function apBuhkon(n) {
  const s = apStep(), B = APS;
  const say = (lines, then) => dialog(lines, () => { if (then) then(); setObjective(); });
  if (REGION === 'xilia') {   // only at the festival is he in town
    if (s !== AP.FESTIVAL) { say([['buhkon', 'Home, Tanoc. The forest path, west.']]); return; }
    if (F_.apFest) { say([['buhkon', 'Home along the path. I’ll be right behind you — I want one more bun.']]); return; }
    const played = !DYA3.engineReady() || (SAVE.dya && SAVE.dya.played > (F_.apPlayed0 || 0));
    if (!played) {
      ask('buhkon', 'Found Venkin yet? He’s by the bonfire, looking smug.', [
        { label: 'Where do tokens come from?', act: () => say(B.festival.tokensAsk) },
        { label: 'Going', act: null },
      ]);
      return;
    }
    say(B.festival.played, () => { F_.apFest = true; xp(150); invAdd(SAVE.inv, 'bun', 2); lootToast('bun', 2); persist(); });
    return;
  }
  switch (s) {
    case AP.DELIVER: {
      if (!F_.apGiven) { say(B.deliver.give, () => { F_.apGiven = true; F_.apDel = {}; persist(); toast(B.deliver.got, 4); sfx.core(); }); return; }
      if (Object.keys(B.deliver.parcels).every(k => F_.apDel && F_.apDel[k])) {
        say(B.deliver.done, () => { G.shards += 40; xp(150); toast('Your first wage · +40 shards', 3); apAdvance(AP.BUILD); });
        return;
      }
      say([['buhkon', 'Still carrying? Into Beuhk with them — Ama, Teodr and Lirra. The forest path, east.']]);
      return;
    }
    case AP.BUILD: {
      if (!F_.apGiven) { say(B.build.give, () => { F_.apGiven = true; persist(); }); return; }
      if (SAVE.quests.q_camp === 'done') { say(B.build.back, () => { xp(120); apAdvance(AP.AMULETS); }); return; }
      say([['buhkon', 'Orrin’s storehouse, by the square in Beuhk. His boy will show you what’s wanted.']]);
      return;
    }
    case AP.TESTS: {
      if (!F_.apGiven) { say(B.tests.give, () => { F_.apGiven = true; F_.apTests = {}; persist(); apBuhkon(n); }); return; }
      const T = B.tests, left = Object.keys(T.list).filter(k => !(F_.apTests || {})[k]);
      if (!left.length) { say(T.done, () => { xp(120); apAdvance(AP.HARVEST, 'harvest'); }); return; }
      ask('buhkon', T.menu, left.map(k => ({ label: T.list[k].label, act: () => say(T.list[k].lines, () => { F_.apTests = F_.apTests || {}; F_.apTests[k] = true; xp(25); sfx.sense(); persist(); if (Object.keys(F_.apTests).length >= 5) apBuhkon(n); }) })).concat([{ label: 'Later', act: null }]));
      return;
    }
    case AP.CAVE: {
      if (!F_.apGiven) { say(B.cave.give, () => { F_.apGiven = true; persist(); apVenkin(true); }); return; }
      say([['buhkon', F_.apCaveGo ? 'Hm? Go to bed, Tanoc.' : 'Venkin’s by the barn. Whatever he’s planning, I don’t want to know.']]);
      return;
    }
    case AP.SOURCES: {
      if (!F_.apGiven) { say(B.sources.give, () => { F_.apGiven = true; F_.apSrc = {}; persist(); }); return; }
      if (Object.keys(F_.apSrc || {}).length >= 3) { say(B.sources.back, () => { xp(150); apAdvance(AP.SPRING, 'spring'); }); return; }
      say([['buhkon', 'Hemla and Lirra, in Beuhk. Ask them what they know about the amulets.']]);
      return;
    }
    case AP.HOLLOW: {
      if (!F_.apGiven) { say(B.hollow.give, () => { F_.apGiven = true; persist(); apVenkin(true); }); return; }
      if (F_.apHollow) { say([['buhkon', 'Three, one, seven. I’ll be counting amulets in my sleep. …Now, the lookout rocks, on the north hill. Climb up and tell me what you see.']], () => { xp(100); apVenkin(false); apAdvance(AP.LOOKOUT); }); return; }
      say([['buhkon', 'The forest hollow, north-west, where the woods start. Follow the amulet — Venkin swears he knows the way, so don’t follow Venkin.']]);
      return;
    }
    case AP.AMULETS: {
      if (!F_.apGiven) {
        say(B.amulets.give, () => {
          F_.apGiven = true; F_.apAm0 = SAVE.amulets || 0; F_.apAmNeed = Math.min(3, amulets.filter(a => !a.got).length); persist();
          hint(B.amulets.hint);
          if (!F_.apAmNeed) apBuhkon(n);
        });
        return;
      }
      if ((SAVE.amulets || 0) - (F_.apAm0 || 0) >= (F_.apAmNeed ?? 3)) { say(B.amulets.done.slice(0, 3), () => { xp(120); apAdvance(AP.TESTS); apBuhkon(n); }); return; }
      say([['buhkon', 'Still missing some? G, and listen. One of them always climbs somewhere high.']]);
      return;
    }
    case AP.HARVEST: {
      if (!F_.apGiven) { say(B.harvest.give, () => { F_.apGiven = true; persist(); }); return; }
      if ((SAVE.inv.items.ju || 0) >= 8) { takeAll(SAVE.inv, { ju: 8 }); say(B.harvest.done, () => { xp(120); G.shards += 20; apAdvance(AP.FESTIVAL); F_.apGiven = true; F_.apPlayed0 = (SAVE.dya && SAVE.dya.played) || 0; persist(); }); return; }
      say([['buhkon', `Eight Ju. You’ve ${SAVE.inv.items.ju || 0}. The field’s southeast of the yard, below the orchard.`]]);
      return;
    }
    case AP.FESTIVAL: {
      if (F_.apFest) { apAdvance(AP.CAVE); apBuhkon(n); return; }
      say([['buhkon', 'The festival’s in Beuhk, tonight. Go on ahead — I’ll be along. Down the forest path, east.']]);
      return;
    }
    case AP.WINTER: {
      if (G.apRaid) { say([['buhkon', 'The pasture, Tanoc! They’re at the fence!']]); return; }
      const first = !F_.apGiven;
      say(first ? B.winter.give : B.winter.retry, () => { F_.apGiven = true; persist(); apRaid(); });
      return;
    }
    case AP.VOICE: {
      if (!F_.apStoneRead) { say([['buhkon', 'Couldn’t sleep either? Go and walk it off. Mind the ice by the lake.']]); return; }
      say(B.voice.back.slice(0, 3), () => { xp(100); apAdvance(AP.SOURCES); apBuhkon(n); });
      return;
    }
    case AP.SPRING: {
      if (saddled()) { say(B.spring.done(PN()), () => { xp(100); apAdvance(AP.RIDE); }); return; }
      if (!F_.apGiven) { say(B.spring.give(PN()), () => { F_.apGiven = true; persist(); }); return; }
      say([['buhkon', 'No saddle yet? Old Ruut, in Beuhk. Help him with his strays and ask him nicely.']]);
      return;
    }
    case AP.RIDE: {
      if (F_.apBoat) { say(B.ride.back.slice(0, 3), () => { xp(150); apAdvance(AP.HOLLOW); apBuhkon(n); }); return; }
      say([['buhkon', 'All the way round the lake, west, to the far shore. Take her — it’s a long way on foot.']]);
      return;
    }
    case AP.LOOKOUT: {
      if (F_.apLook) {
        say(B.lookout.back, () => {
          xp(120); apAdvance(AP.DONE);
          G.mode = 'intro';
          cineCards(B.summer2.cards, 3600, P.pos, () => { enterPlay(); setObjective(); });
        });
        return;
      }
      say([['buhkon', 'The lookout rocks. North hill, past the pasture. Go and look.']]);
      return;
    }
  }
}

/* ---------------- Beuhk folk: the Carpenter's parcels ---------------- */
function apNpcOptions(n) {
  const out = [];
  if (!apOn() || REGION !== 'xilia') return out;
  if (apStep() === AP.BUILD && F_.apGiven && n.def.id === 'venkin' && !SAVE.quests.q_camp)
    out.push({ label: `<b style="color:#ffd27a">${APS.build.meetLabel}</b>`, act: () => { n.talking = 6; dialog(APS.build.meet, () => { SAVE.quests.q_camp = 'active'; persist(); toast(`New quest: ${QUESTS.q_camp.name}`, 3); sfx.core(); setObjective(); }); } });
  if (apStep() === AP.SOURCES && F_.apGiven && (n.def.id === 'hemla' || n.def.id === 'v3') && !(F_.apSrc || {})[n.def.id])
    out.push({ label: `<b style="color:#ffd27a">${APS.sources.askLabel}</b>`, act: () => { n.talking = 8; dialog(APS.sources[n.def.id === 'hemla' ? 'hemla' : 'lirra'], () => { F_.apSrc = F_.apSrc || {}; F_.apSrc[n.def.id] = true; xp(40); sfx.sense(); persist(); setObjective(); }); } });
  const P0 = APS.deliver.parcels[n.def.id];
  if (apStep() === AP.DELIVER && F_.apGiven && P0 && !(F_.apDel && F_.apDel[n.def.id])) {
    out.push({ label: `<b style="color:#ffd27a">${P0.label}</b>`, act: () => {
      n.talking = 6;
      dialog(P0.lines, () => {
        F_.apDel = F_.apDel || {}; F_.apDel[n.def.id] = true; xp(30); sfx.core();
        if (n.def.id === 'v1') { invAdd(SAVE.inv, 'bun', 2); lootToast('bun', 2); }
        const left = Object.keys(APS.deliver.parcels).filter(k => !F_.apDel[k]).length;
        toast(left ? `Delivered ${P0.item} · ${left} to go` : 'All three delivered — back to the Carpenter’s', 3);
        persist(); setObjective();
      });
    } });
  }
  return out;
}

/* ---------------- winter: the Rodak at the pasture ---------------- */
function apRaid() {
  const left = RAID_N - (F_.apRaidK || 0);
  if (left <= 0) { apRaidDone(); return; }
  const pen = world.pen || world.PLAZA;
  dn.setHour(21.5);
  G.apRaid = [];
  for (let i = 0; i < left; i++) {
    const a = -Math.PI / 2 + (i - (left - 1) / 2) * 0.35, x = pen.x + Math.cos(a) * 62, z = pen.z + Math.sin(a) * 62;
    const e = enemies.spawn('rodak', x, z, null, { state: 'chase', hostile: true, tag: 'winter' });
    if (e) G.apRaid.push(e);
  }
  sfx.blink && sfx.blink();
  hint(APS.winter.hint);
  setObjective();
}
function apRaidKill() {
  F_.apRaidK = (F_.apRaidK || 0) + 1; persist(); setObjective();
  if (F_.apRaidK >= RAID_N) setTimeout(apRaidDone, 1200);
}
function apRaidDone() {
  if (apStep() !== AP.WINTER) return;
  for (const e of G.apRaid || []) if (!e.dead) { e.dead = true; e.hostile = false; if (e.actor) e.actor.root.visible = false; }
  G.apRaid = null;
  dialog(APS.winter.done, () => {
    xp(200); G.shards += 60; toast('The herd is safe · +60 shards', 3);
    apAdvance(AP.VOICE);
    // that night, up in the loft
    G.mode = 'intro'; fade(1, 0.9);
    setTimeout(() => {
      if (interiors.inside) leaveRoom(true);
      toLoftBed(); dn.setHour(23.5);
      fade(0, 1.2); enterPlay();
      dialog(APS.voice.night, () => { setObjective(); hint(APS.voice.hint); });
    }, 1000);
  });
}

/* ---------------- the step's objective, and where the compass points ---------------- */
function apObjective() {
  const s = apStep(), B = APS, head = `Chapter I · ${B.seasons[s]}`, inBeuhk = REGION === 'xilia';
  const toTown = 'Down the forest path, east, into Beuhk', toHome = 'Back along the forest path, west';
  switch (s) {
    case AP.DELIVER: {
      if (!F_.apGiven) { proObjective(head, 'Talk to Buhkon — he has work for you', 'He’s in the yard, or the workshop'); return; }
      const got = Object.keys(B.deliver.parcels).filter(k => F_.apDel && F_.apDel[k]).length;
      if (got >= 3) { proObjective(head, 'Back to Buhkon — all three delivered', inBeuhk ? toHome : ''); return; }
      proObjective(head, `Deliver the Carpenter’s work in Beuhk (${got}/3)`, inBeuhk ? 'Ama the baker, Teodr the farmer, Lirra the lamplighter' : toTown, 3, got);
      return;
    }
    case AP.BUILD: {
      if (!F_.apGiven) { proObjective(head, 'Talk to Buhkon', ''); return; }
      if (SAVE.quests.q_camp === 'done') { proObjective(head, 'Home — tell Buhkon the storehouse is up', inBeuhk ? toHome : ''); return; }
      if (!SAVE.quests.q_camp) { proObjective(head, B.build.obj, inBeuhk ? 'Venkin is by the square' : toTown); return; }
      { const q = QUESTS.q_camp, have = SAVE.inv.items; proObjective(head, `Raise the storehouse: cut stone ${Math.min(6, have.stone || 0)}/6 · fire-tree bark ${Math.min(4, have.bark || 0)}/4`, (have.stone || 0) >= 6 && (have.bark || 0) >= 4 ? 'Take it all to Venkin' : 'Quarry heaps for stone, the old fire-tree logs for bark · G shows them', 0, 0); }
      return;
    }
    case AP.TESTS: {
      if (!F_.apGiven) { proObjective(head, 'Talk to Buhkon', ''); return; }
      const n = Object.keys(F_.apTests || {}).length; proObjective(head, B.tests.obj(n), 'Talk to Buhkon — he’s set up at the bench', 5, n); return;
    }
    case AP.CAVE: {
      if (!F_.apGiven) { proObjective(head, 'Talk to Buhkon', ''); return; }
      if (G.apCave) { const n = G.apCave.filter(e => !e.dead && !e.gone).length; proObjective(head, B.cave.fightObj(n), 'Left-click to swing — Q for the fire-stone'); return; }
      if (F_.apCaveGo) { proObjective(head, B.cave.obj, B.cave.hint); return; }
      proObjective(head, 'Talk to Venkin, by the barn', ''); return;
    }
    case AP.SOURCES: {
      if (!F_.apGiven) { proObjective(head, 'Talk to Buhkon', ''); return; }
      const n = Object.keys(F_.apSrc || {}).length;
      if (n >= 3) { proObjective(head, 'Home — tell Buhkon what you learned', inBeuhk ? toHome : ''); return; }
      proObjective(head, B.sources.obj(n), B.sources.hint, 3, n); return;
    }
    case AP.HOLLOW: {
      if (!F_.apGiven) { proObjective(head, 'Talk to Buhkon', ''); return; }
      if (F_.apHollow) { proObjective(head, 'Home — tell Buhkon', ''); return; }
      proObjective(head, B.hollow.obj, apHollowNear() ? B.hollow.pulse : B.hollow.hint); return;
    }
    case AP.AMULETS: {
      if (!F_.apGiven) { proObjective(head, 'Talk to Buhkon', ''); return; }
      const got = Math.min(F_.apAmNeed ?? 3, (SAVE.amulets || 0) - (F_.apAm0 || 0)), need = F_.apAmNeed ?? 3;
      if (got >= need) { proObjective(head, 'Bring the amulets home to Buhkon', ''); return; }
      proObjective(head, `Find the amulets that walked off in the night (${got}/${need})`, 'G — Nur’Hlyst. Listen for cold teal.', need, got);
      return;
    }
    case AP.HARVEST: {
      if (!F_.apGiven) { proObjective(head, 'Talk to Buhkon — it’s harvest', ''); return; }
      const n = Math.min(8, SAVE.inv.items.ju || 0);
      if (n >= 8) proObjective(head, 'Carry the harvest to Buhkon', '');
      else proObjective(head, B.harvest.obj(n), 'E to pull a Ju', 8, n);
      return;
    }
    case AP.FESTIVAL: {
      if (F_.apFest) { proObjective(head, B.festival.homeObj, inBeuhk ? toHome : 'Then talk to Buhkon'); return; }
      if (!inBeuhk) { proObjective(head, B.festival.obj, toTown); return; }
      const played = SAVE.dya && SAVE.dya.played > (F_.apPlayed0 || 0);
      if (played) proObjective(head, 'Find Buhkon by the bonfire', '');
      else proObjective(head, B.festival.obj, B.festival.hint);
      return;
    }
    case AP.WINTER: {
      if (inBeuhk) { proObjective(head, 'Home to the Carpenter’s — snow on the path', toHome); return; }
      if (G.apRaid) { proObjective(head, B.winter.obj(RAID_N - (F_.apRaidK || 0)), B.winter.hint, RAID_N, F_.apRaidK || 0); return; }
      proObjective(head, F_.apGiven ? B.winter.again : 'Talk to Buhkon', F_.apGiven ? 'Talk to Buhkon when you’re ready' : '');
      return;
    }
    case AP.VOICE: {
      if (F_.apStoneRead) proObjective(head, 'Back to the house — Buhkon is up early', '');
      else proObjective(head, B.voice.obj, B.voice.hint);
      return;
    }
    case AP.SPRING: {
      if (!F_.apGiven && !saddled()) { proObjective(head, 'Talk to Buhkon', ''); return; }
      if (saddled()) { proObjective(head, 'Show Buhkon your Punk, saddled', ''); return; }
      if (SAVE.quests.q_strays === 'active' || (inBeuhk && !SAVE.quests.q_strays)) { proObjective(head, B.spring.ruutObj, inBeuhk ? 'Talk to Old Ruut — Nur’Hlyst finds his strays' : toTown); return; }
      proObjective(head, B.spring.obj, inBeuhk ? 'Old Ruut, by the Punk pens' : toTown);
      return;
    }
    case AP.RIDE: proObjective(head, F_.apBoat ? 'Ride home and tell Buhkon' : B.ride.obj, F_.apBoat ? '' : B.ride.hint); return;
    case AP.LOOKOUT: proObjective(head, F_.apLook ? 'Home — tell Buhkon what you saw' : B.lookout.obj, F_.apLook ? '' : B.lookout.hint); return;
  }
}
function apGoal() {
  const s = apStep(), bk = apHome(), inBeuhk = REGION === 'xilia';
  const ex = apExitEast(), toTown = ex ? V3(ex.x, world.heightAt(ex.x, ex.z), ex.z) : null;
  const nearest = list => { let best = null, bd = 1e9; for (const p of list) { const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z); if (d < bd) { bd = d; best = p; } } return best; };
  switch (s) {
    case AP.DELIVER: {
      if (!F_.apGiven) return bk;
      const left = Object.keys(APS.deliver.parcels).filter(k => !(F_.apDel && F_.apDel[k]));
      if (!left.length) return bk;
      return inBeuhk ? nearest(npcs.filter(n => left.includes(n.def.id)).map(n => n.pos)) : toTown;
    }
    case AP.BUILD: {
      if (!F_.apGiven || SAVE.quests.q_camp === 'done') return bk;
      if (!inBeuhk) return toTown;
      const v = npcs.find(n => n.def.id === 'venkin'); return v ? v.pos : null;
    }
    case AP.TESTS: return bk;
    case AP.CAVE: { if (!F_.apGiven) return bk; if (!F_.apCaveGo) return apV ? apV.pos : bk; const c = world.cave; return c ? V3(c.x, world.heightAt(c.x, c.z), c.z) : null; }
    case AP.SOURCES: {
      if (!F_.apGiven) return bk;
      const S = F_.apSrc || {}; if (Object.keys(S).length >= 3) return bk;
      if (inBeuhk) { const want = !S.hemla ? 'hemla' : !S.v3 ? 'v3' : null, n = want && npcs.find(q => q.def.id === want); return n ? n.pos : world.westGoal; }
      if (!S.sniller) { const st = apStone(); return st ? V3(st.x, st.y, st.z) : null; }
      return toTown;
    }
    case AP.HOLLOW: { if (!F_.apGiven || F_.apHollow) return bk; const h = world.SITES.hollow; return h ? V3(h.x, world.heightAt(h.x, h.z), h.z) : null; }
    case AP.AMULETS: {
      if (!F_.apGiven || (SAVE.amulets || 0) - (F_.apAm0 || 0) >= (F_.apAmNeed ?? 3)) return bk;
      const a = nearest(amulets.filter(a => !a.got && a.revealed));
      return a ? V3(a.x, a.y, a.z) : null;
    }
    case AP.HARVEST: {
      const f = (world.juFields || [])[0];
      return F_.apGiven && (SAVE.inv.items.ju || 0) < 8 && f ? V3(f.x, world.heightAt(f.x, f.z), f.z) : bk;
    }
    case AP.FESTIVAL: {
      if (F_.apFest) return inBeuhk ? world.westGoal : bk;
      if (!inBeuhk) return toTown;
      const played = SAVE.dya && SAVE.dya.played > (F_.apPlayed0 || 0), v = npcs.find(n => n.def.id === (played ? 'buhkon' : 'venkin'));
      return v ? v.pos : null;
    }
    case AP.WINTER: {
      if (inBeuhk) return world.westGoal;
      if (G.apRaid) { const e = nearest(G.apRaid.filter(e => !e.dead).map(e => e.pos)); return e || V3(world.pen.x, world.heightAt(world.pen.x, world.pen.z), world.pen.z); }
      return bk;
    }
    case AP.VOICE: { const st = apStone(); return F_.apStoneRead || !st ? bk : V3(st.x, st.y, st.z); }
    case AP.SPRING: {
      if (saddled() || !F_.apGiven) return bk;
      if (inBeuhk) { const r = npcs.find(n => n.def.id === 'ruut'); if (SAVE.quests.q_strays === 'active') { const e = nearest(enemies.list.filter(e => e.stray && !e.dead).map(e => e.pos)); if (e && (SAVE.counters.strays || 0) < 3) return e; } return r ? r.pos : null; }
      return toTown;
    }
    case AP.RIDE: return F_.apBoat || !oldBoat ? bk : oldBoat.pos;
    case AP.LOOKOUT: { const k = world.kuniPerch; return F_.apLook || !k ? bk : V3(k.x, k.y, k.z); }
  }
  return bk;
}
function apInteractables() {
  const out = [];
  if (!apOn()) return out;
  if (apV && !apV.follow && apStep() === AP.CAVE && F_.apGiven && !F_.apCaveGo) out.push({ pos: apV.pos, label: APS.cave.meetLabel, act: () => dialog(APS.cave.meet, () => { F_.apCaveGo = true; persist(); apV.follow = true; dn.setHour(22); setObjective(); }), far: 3 });
  if (apStep() === AP.RIDE && oldBoat && !F_.apBoat) out.push({ pos: oldBoat.pos, label: APS.ride.look, act: () => dialog(APS.ride.found, () => { F_.apBoat = true; xp(60); persist(); setObjective(); }), far: 9 });
  return out;
}
/* reading the waystone with the amulet in hand */
function apReadStone(s) {
  if (apOn() && apStep() === AP.SOURCES && F_.apGiven && s.key === 'p_path' && !(F_.apSrc || {}).sniller) {
    dialog(APS.sources.sniller, () => { F_.apSrc = F_.apSrc || {}; F_.apSrc.sniller = true; xp(60); persist(); setObjective(); });
    return true;
  }
  if (!apOn() || apStep() !== AP.VOICE || s.key !== 'p_path' || F_.apStoneRead) return false;
  dialog(APS.voice.stone, () => { F_.apStoneRead = true; SAVE.codex[s.key] = true; xp(80); persist(); setObjective(); });
  return true;
}
function apTookAmulet() {
  if (!apOn() || apStep() !== AP.AMULETS || !F_.apGiven) return;
  const n = (SAVE.amulets || 0) - (F_.apAm0 || 0);
  if (n >= 1 && n <= 3) setTimeout(() => bark('tanoc', APS.amulets.found(n), 3.5), 900);
  setObjective();
}
/* arriving somewhere: the festival is at night; a season's cards play once you're out on the land */
function apArrive() {
  if (!apOn()) return;
  if (REGION === 'xilia' && apStep() === AP.FESTIVAL && !F_.apFest) {
    dn.setHour(20.5);
    if (!F_.apFestSeen) { F_.apFestSeen = true; persist(); setTimeout(() => dialog(APS.festival.arrive, () => setObjective()), 600); }
  }
  if (REGION === 'property' && apWinter() && dn.hour > 6 && dn.hour < 17 && apStep() === AP.WINTER) dn.setHour(17);
}
let snowT = 0;
function apTick(dt) {
  if (!young()) return;
  // snow, all winter, on the land and in town
  if (apWinter() && !interiors.inside && (REGION === 'property' || REGION === 'xilia')) {
    snowT += dt * 60;
    for (; snowT >= 1; snowT--) {
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 34;
      particles.emit(P.pos.x + Math.cos(a) * r, P.pos.y + 14 + Math.random() * 8, P.pos.z + Math.sin(a) * r, { vx: 0.6 + Math.random() * 0.4, vy: -2.4 - Math.random(), vz: 0.3, color: 0xf4f8ff, size: 0.28, life: 7, drag: 0, gravity: 0 });
    }
  }
  if (festival) {
    festival.fire.scale.setScalar(9 + Math.sin(G.t * 9) * 0.7 + Math.sin(G.t * 5.3) * 0.5);
    festival.lamps.forEach((l, i) => { l.material.opacity = 0.7 + Math.sin(G.t * 2 + i) * 0.2; });
    if (Math.random() < 0.8) particles.emit(festival.x + (Math.random() - 0.5) * 1.6, festival.y + 3, festival.z + (Math.random() - 0.5) * 1.6, { vx: 0, vy: 4 + Math.random() * 2, vz: 0, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd060, size: 0.5, life: 1.4, drag: 0.4 });
  }
  apVenkinTick(dt);
  if (G.mode !== 'play' || !apOn()) return;
  // Venkin is about the land in the cave and hollow steps (a reload puts him back)
  if (REGION === 'property' && !apV && F_.apGiven && ((apStep() === AP.CAVE && !G.apCaveDone) || (apStep() === AP.HOLLOW && !F_.apHollow))) { apVenkin(true); apV.follow = apStep() === AP.HOLLOW || !!F_.apCaveGo; if (apStep() === AP.CAVE && F_.apCaveGo) dn.setHour(22); }
  if (apV && apStep() === AP.HOLLOW && F_.apGiven && !apV.follow) apV.follow = true;
  // the north-shore cave: the storm-glass, the den, the Kipsu
  const cv = world.cave;
  if (apStep() === AP.CAVE && F_.apCaveGo && cv && !G.apCave && !G.apCaveDone && Math.hypot(P.pos.x - cv.x, P.pos.z - cv.z) < 16) {
    G.apCave = [];
    dialog(APS.cave.inside, () => {
      for (let i = 0; i < 4; i++) { const a = i * 1.6, e = enemies.spawn('kipsu', cv.x + Math.cos(a) * 6, cv.z + Math.sin(a) * 6, null, { state: 'chase', hostile: true, tag: 'cave' }); if (e) G.apCave.push(e); }
      setObjective();
    });
  }
  if (G.apCave && G.apCave.length && G.apCave.every(e => e.dead || e.gone)) {
    G.apCave = null; G.apCaveDone = true;
    dialog(APS.cave.caught, () => { xp(180); apVenkin(false); apAdvance(AP.WINTER, 'winter'); });
  }
  // a season's cards, once you're outside on the Carpenter's land
  if (F_.apCards && REGION === 'property' && !interiors.inside) {
    const lines = (APS[F_.apCards] || {}).cards; delete F_.apCards; persist();
    if (lines) { if (apStep() === AP.WINTER) dn.setHour(18); cineCards(lines, 3400, P.pos, () => { enterPlay(); setObjective(); }); return; }
  }
  // the lookout: high on the north hill, looking north
  const k = world.kuniPerch;
  if (apStep() === AP.LOOKOUT && !F_.apLook && k && REGION === 'property' && Math.hypot(P.pos.x - k.x, P.pos.z - k.z) < 16 && P.pos.y > k.y - 4) {
    F_.apLook = true; persist();
    G.mode = 'intro'; P.vel.set(0, 0, 0);
    const c = V3(P.pos.x, P.pos.y, P.pos.z);
    mainCine.play([
      { dur: 6, from: { p: [c.x + 4, c.y + 2.5, c.z + 6], l: [c.x, c.y + 1.6, c.z] }, to: { p: [c.x + 2, c.y + 3.5, c.z + 3], l: [c.x - 60, c.y - 20, c.z + 300] }, caption: APS.lookout.see[0] },
      { dur: 7, ease: 'inout', from: { p: [c.x, c.y + 4, c.z + 2], l: [c.x, c.y + 10, c.z - 400] }, to: { p: [c.x, c.y + 6, c.z - 6], l: [c.x + 40, c.y + 40, c.z - 1600] }, caption: APS.lookout.see[1] },
    ], () => { enterPlay(); dialog(APS.lookout.after, () => { xp(60); setObjective(); }); });
  }
}

function tickUi(dt) {
  if (cardState) { cardState.timer -= dt; if (cardState.timer <= 0) nextCard(); }
  if (barkTimer > 0) { barkTimer -= dt; if (barkTimer <= 0) $('bark').style.opacity = 0; }
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('show'); }
  if (locTimer > 0) { locTimer -= dt; if (locTimer <= 0) $('location').classList.remove('show'); }
}

/* a new run starts where the story does: on Velki, at the last Skyfall */
function beginNew() {
  if (REGION === 'xilia' && !F_.xtalked && F_.pro !== 'done') { startVelki(); return; }
  beginBeuhk();
}
function beginBeuhk() {
  G.mode = 'intro'; introT = 0; G.t = 0;
  CAM.yaw = 0; P.yaw = Math.PI;
  playCards(STORY.OPENING, 4200, () => {
    enterPlay();
    showLocation('Beuhk', 'home, for a little while');
    hint('Walk to Phorus and press E');
  });
}

function arriveLeotik() {
  P.pos.copy(world.pier.start); F.pos.copy(P.pos).add(V3(-2, 0, -3));
  G.mode = 'intro'; introT = 0; G.t = 0; CAM.yaw = 0; P.yaw = Math.PI;
  playCards(['Leotik.', 'Stranded in the ruins of Villtur — Torcain, Phorus, and the three who followed you.'], 3500, () => {
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
  if (young()) setObjective();
  showLocation(REGION_NAME[REGION] || 'Leotik', `${D.label} · ${fmtTime(SAVE.time)}`);
  apArrive();
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

if (young() && F_.pro === 'done') applyYoung();
const FROM_TOP = REGION === 'xilia' && !F_.xtalked && F_.pro !== 'done';   // the run hasn't left the beginning yet
const IN_CH1 = young() && F_.pro === 'done';
$('t-kicker').textContent = IN_CH1 ? STORY.YOUNG.kicker : REGION === 'leotik' ? "Torcain's Run · Rokarvac II" : FROM_TOP ? STORY.PROLOGUE.kicker : REGION === 'xilia' ? STORY.XILIA.kicker : STORY.TITLE.kicker;
$('t-title').textContent = IN_CH1 ? STORY.YOUNG.title : REGION === 'leotik' ? 'The Isle of the Urverk' : FROM_TOP ? STORY.PROLOGUE.title : REGION === 'xilia' ? STORY.XILIA.title : STORY.TITLE.title;
$('t-sub').textContent = STORY.TITLE.sub;
$('t-riddle').innerHTML = (REGION === 'leotik' ? STORY.NEXT_RIDDLE : STORY.RIDDLE).join('<br>');
$('loading').textContent = 'THE HIGHLAND IS READY';
$('btn-begin').disabled = false;
$('d-easy-p').textContent = DIFFICULTY.easy.blurb;
$('d-real-p').textContent = DIFFICULTY.realistic.blurb;
if (!SAVE_AT_LOAD && HAD_OLD) $('t-save').textContent = 'Torcain’s Run has a new beginning in Beuhk — every earlier run was reset. Begin anew!';
if (SAVE_AT_LOAD) {
  const where = SAVE.region === 'leotik' ? 'Rokarvac II · Leotik' : SAVE.region === 'aakalay' ? 'Rokarvac I · Aakalay'
    : IN_CH1 ? (SAVE.region === 'property' ? 'Chapter I · the Carpenter’s' : 'Chapter I · Beuhk') : SAVE.region === 'property' ? 'The Road North · the forest path' : FROM_TOP && F_.pro === 'beuhk' ? 'The Road North · Beuhk' : FROM_TOP && (F_.pro === 'road' || F_.pro === 'xikia') ? 'The Road North' : FROM_TOP && F_.pro ? 'The Beginning · Velki' : 'Prologue · Beuhk';
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

if (matchMedia('(pointer: coarse)').matches) $('t-note').textContent = 'On a phone or tablet: left thumb moves, drag on the right to look, and the buttons fight. Turn your phone sideways for the best view.';
$('btn-continue').onclick = () => startFromTitle(() => {
  if (REGION === 'property' && F_.pro === 'megla') startMegla(F_.meglaAt);
  else if (young() && F_.pro === 'done') { if (F_.yq == null && REGION === 'property') startMorning(); else continueRun(); }
  else if (REGION === 'property' && F_.pro === 'beuhk') { arriveByExit({ exit: 'p_east' }); }
  else if (REGION === 'xilia' && F_.pro === 'beuhk') arriveBeuhk();
  else if (REGION === 'xilia' && !F_.xtalked && (F_.pro === 'road' || F_.pro === 'xikia')) startRoad(F_.pro === 'road' ? F_.roadAt : 'market');
  else if (REGION === 'xilia' && !F_.xtalked) beginNew();
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

frame(performance.now());

if (BOOT === 'new' && SAVE_AT_LOAD) { $('title').classList.add('hidden'); startFromTitle(beginNew); }
else if (BOOT === 'arrive' && REGION === 'leotik') { $('title').classList.add('hidden'); startFromTitle(arriveLeotik); }
else if (BOOT === 'arriveA' && REGION === 'aakalay') { $('title').classList.add('hidden'); startFromTitle(arriveAakalay); }
else if (BOOT === 'pass' && SAVE.passIn) { $('title').classList.add('hidden'); startFromTitle(arriveByPass); }

/* debugging handle for the console */
window.__torcain = {
  bookAct, applyWear, openBook,
  get vk() { return VK; }, F_: () => F_, apBuhkon, apRaid, apStep, apGoal, readStone, skipCards, get storehouse() { return storehouse; }, get festival() { return festival; }, get oldBoat() { return oldBoat; }, stones, get DLG() { return DLG; }, startRoad, arriveBeuhk, leaveRoad, startMorning, youngTakeRelic, youngBuhkon, RELIC_SPOT, get young() { return young(); },
  sunear, startStorm, get shurgr() { return G.shurgr; }, prophecy,
  detailCull: setDetailCull,
  G, P, F, CAM, camera, scene, renderer, interiors, ship, THREE, enemies, world, cores, SAVE: () => SAVE, persist,
  advance: () => advanceDialog(), closeMemory, pressAttack, duatStrike, tukangFlare, nurSense, interact, dodge, drinkFilm, damageBoss,
  get dya() { return dyaMatch; }, useSlot, assignSlot, learnTrigger, fireStone, dn, wilds, callKuni, throwSprengju, get kuni() { return kuni; }, scars, get skor() { return skor; }, readScar, sitWithSkor, phorusQuest, startDya, dyaChallenge, singToken, buhkonTokens, glider, board, crates, pages, boardTalk, talkPhorus, amulets, nurHlyst, takeAmulet, gate, storehouse, interactables, get boss() { return boss; }, startBoss, npcs, feats, book, openBook, castSpell, learnSpell, xp, get TOK() { return TOK; }, enterRoom, get mount() { return mount; }, setObjective, SONG, tokKey, firstTokenLesson, makeMount, toggleRide, lookAim, vineTarget, vineShoot, vineLet, rideSpace, get vines() { return P.vines; }, startTrial, npcTalk, pickChoice, takeCore, wakePillar, playerDown, openLantern: () => openLantern(lanterns[0]), closeLantern,
};
