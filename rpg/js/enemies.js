/* ============================================================
   The Esik that fight back. One table of creature kinds, each
   with its own behaviour, plus the knives, venom globs and
   burning puddles they leave behind.
   ============================================================ */
import * as THREE from 'three';
import { damp, dampAngle, clamp } from './util.js';
import { glowSprite } from './gfx.js';
import { buildVel, buildDummy } from './creatures.js';
import { pivotNear } from './vines.js';
import { buildApiButa, buildCyitor, buildXiwKatkan } from './creatures2.js';
import { buildWildPunk, buildDomesticPunk, buildMalstiPunk, buildKipsu, buildRodak, buildKofi, buildSruVorn, buildBigMommaKofi, buildUlarNaga, buildGynge, buildStryx, buildTonguatjis, buildMikoloMoko, buildUff } from './esik_land.js';
import { buildAlbaliByrd, buildTyndael, buildKuniByrd, buildLutut, buildRubberMcFly, buildMakariSwarm } from './esik_sky.js';
import { buildHvaleia, buildSuNaga, buildHarkal, buildRafKrabbi, buildGrothyn } from './esik_sea.js';

const seed = () => (Math.random() * 1e9) >>> 0;
/* a Kipsu can be anything from a lapful to a big dog */
const kipsu = (lo, hi) => { const k = buildKipsu({ seed: seed() }); k.root.scale.multiplyScalar(lo + Math.random() * (hi - lo)); return k; };

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export const TYPES = {
  punk: { name: 'Wild Punk', build: () => buildWildPunk({ seed: seed() }), hp: 60, dmg: 12, speed: 5.4, rad: 0.85, range: 2.4, aggro: 15, windup: 0.6, recover: 0.75, lunge: 9, shards: 6, ai: 'melee', color: 0xffb040 },
  /* fist-sized and never truly aggressive — they blink through the Duat to cause chaos and pinch your shards */
  malsti: { name: 'Malsti Punk', build: () => buildMalstiPunk({ seed: seed() }), hp: 18, dmg: 0, speed: 7.2, rad: 0.22, range: 1.1, aggro: 11, windup: 0.3, recover: 0.5, lunge: 8, shards: 3, ai: 'thief', blink: true, color: 0xc08aff },
  rodak: { name: 'Rodak', build: () => buildRodak({ seed: seed() }), hp: 75, dmg: 15, speed: 8.6, rad: 0.7, range: 2.7, aggro: 14, windup: 0.45, recover: 0.7, lunge: 13, shards: 10, ai: 'scavenger', color: 0x6a8a8a },
  kipsu: { name: 'Kipsu', build: () => kipsu(1.1, 1.8), hp: 32, dmg: 4, speed: 9.5, rad: 0.45, range: 1.5, aggro: 11, windup: 0.3, recover: 0.4, lunge: 9, shards: 5, ai: 'thief', color: 0x6af0e0 },
  albali: { name: 'Albali Byrd', build: () => buildAlbaliByrd({ seed: seed() }), hp: 48, dmg: 10, speed: 9, rad: 0.7, range: 1.8, aggro: 20, shards: 9, ai: 'flyer', status: 'paralyze', color: 0xffe0a0, disp: 'neutral' },
  /* little wild things that run from everything */
  kofi: { name: 'Kofi Galta', build: () => buildKofi({ seed: seed() }), hp: 12, dmg: 0, speed: 8.5, rad: 0.35, range: 0, aggro: 0, shards: 1, ai: 'melee', color: 0xb8a070, disp: 'critter' },
  /* the Carpenter's straw dummies — they only stand there and take it */
  dummy: { name: 'Training dummy', build: buildDummy, hp: 30, dmg: 0, speed: 0, rad: 0.45, range: 0, aggro: 0, shards: 1, ai: 'static', color: 0xd8c098, disp: 'training' },
  dummy_far: { name: 'High dummy', build: buildDummy, hp: 30, dmg: 0, speed: 0, rad: 0.45, range: 0, aggro: 0, shards: 1, ai: 'static', color: 0xd8c098, disp: 'training', perch: 6 },
  /* friendly folk of the wilds — they only fight if you start it */
  kipsu_f: { name: 'Kipsu', build: () => kipsu(1.2, 2.2), hp: 40, dmg: 6, speed: 9, rad: 0.5, range: 1.6, aggro: 0, windup: 0.35, recover: 0.5, lunge: 9, shards: 2, ai: 'melee', color: 0x6af0e0, disp: 'friendly' },
  punk_d: { name: 'Domestic Punk', build: () => buildDomesticPunk({ seed: seed(), saddle: Math.random() < 0.5 }), hp: 90, dmg: 10, speed: 6, rad: 1.1, range: 2.6, aggro: 0, windup: 0.6, recover: 0.8, lunge: 8, shards: 3, ai: 'melee', color: 0xe8a85a, disp: 'friendly' },
  albali_t: { name: 'Villtur Albali', build: () => buildAlbaliByrd({ villtur: true, toxic: true, seed: seed() }), hp: 58, dmg: 11, speed: 9.5, rad: 0.7, range: 1.8, aggro: 22, shards: 12, ai: 'flyer', status: 'poison', color: 0x9aff5a },
  vel: { name: 'Duskareth Vel', build: buildVel, hp: 190, dmg: 17, speed: 6.2, rad: 0.5, range: 2.4, aggro: 22, windup: 0.5, shards: 60, ai: 'vel', stagger: 0.35, elite: true, color: 0xb070ff },
  tyndael: { name: 'Tyndael', build: () => buildTyndael({ seed: seed() }), hp: 55, dmg: 9, speed: 5.6, rad: 0.6, range: 1.8, aggro: 19, windup: 0.7, recover: 0.6, lunge: 7, shards: 9, ai: 'spitter', color: 0xff7a2a },
  /* the far forest's own: territorial, and it means it — come too close and it charges, tusks and spiked tail */
  sruvorn_w: { name: 'Sru Vorn', build: () => buildSruVorn({ seed: seed() }), hp: 520, dmg: 22, speed: 5.2, rad: 2.2, range: 4.2, aggro: 13, windup: 0.8, recover: 1.1, lunge: 10, shards: 70, ai: 'melee', stagger: 0.2, elite: true, color: 0x9ab04a },
  sruvorn: { name: 'Sru Vorn of the Bogs', build: () => buildSruVorn({ seed: seed() }), hp: 1100, dmg: 26, speed: 4.6, rad: 2.6, range: 5.5, aggro: 26, shards: 220, ai: 'sruvorn', stagger: 0, miniboss: true, color: 0xb0ff4a },

  /* ---------------- the wider wilds (spawned by wilds.js; most are rare) ----------------
     water: true  = only ever in water ('swim' under/at the surface, 'airswim' through the air above it) */
  big_momma_kofi: { name: 'Big Momma Kofi', build: () => buildBigMommaKofi({ seed: seed() }), hp: 20, dmg: 0, speed: 6.5, rad: 0.4, range: 0, aggro: 0, shards: 4, ai: 'melee', color: 0xb8a070, disp: 'critter' },
  mikolo_moko: { name: 'Mikolo Moko', build: () => buildMikoloMoko({ seed: seed() }), hp: 14, dmg: 0, speed: 9.5, rad: 0.3, range: 0, aggro: 0, shards: 3, ai: 'melee', color: 0x7ad04a, disp: 'critter' },
  uff: { name: 'Uff', build: () => { const u = buildUff({ seed: seed() }); u.root.scale.multiplyScalar(0.8 + Math.random() * 1.6); return u; }, hp: 10, dmg: 0, speed: 1.6, rad: 0.25, range: 0, aggro: 0, shards: 2, ai: 'melee', color: 0xff6a8a, disp: 'critter' },
  /* the one that lives by the Carpenter's workshop, hauling timber about on its vines — it only fights if you do */
  stryx_home: { name: 'The workshop Stryx', build: () => buildStryx({ seed: 5 }), hp: 600, dmg: 12, speed: 1.4, rad: 1.6, range: 6, aggro: 0, windup: 0.8, recover: 1.0, lunge: 0, shards: 0, ai: 'melee', stagger: 0, rooted: true, color: 0x8aa04a, disp: 'neutral' },
  stryx: { name: 'Wild Stryx', build: () => buildStryx({ seed: seed() }), hp: 420, dmg: 16, speed: 1.2, rad: 1.6, range: 6, aggro: 6, windup: 0.8, recover: 1.0, lunge: 0, shards: 40, ai: 'melee', stagger: 0, rooted: true, color: 0x8aa04a, disp: 'neutral' },
  tonguatjis: { name: 'Tonguatjis', build: buildTonguatjis, hp: 260, dmg: 15, speed: 3.2, rad: 1.0, range: 5.5, aggro: 10, windup: 0.7, recover: 1.0, lunge: 2, shards: 30, ai: 'melee', stagger: 0.4, color: 0xf08aa8, disp: 'neutral' },
  gynge: { name: 'Gynge', build: buildGynge, hp: 900, dmg: 26, speed: 3.4, rad: 2.4, range: 4.0, aggro: 9, windup: 1.0, recover: 1.3, lunge: 7, shards: 90, ai: 'melee', stagger: 0.15, elite: true, color: 0xe8c4b4, disp: 'neutral' },
  ular_naga: { name: 'Ular Naga', build: () => buildUlarNaga({ heads: 3 + (Math.random() < 0.2 ? 2 : 0) }), hp: 2400, dmg: 30, speed: 4.2, rad: 3.2, range: 7, aggro: 18, windup: 0.9, recover: 1.1, lunge: 6, shards: 320, ai: 'melee', stagger: 0, elite: true, miniboss: true, color: 0x6a9a4a },
  ular_grothyn: { name: 'Ular Grothyn', build: () => buildGrothyn({ element: 'Ular' }), hp: 120, dmg: 12, speed: 0.15, rad: 0.8, range: 5.5, aggro: 7, windup: 0.6, recover: 1.0, lunge: 0, shards: 14, ai: 'melee', color: 0x6a9a4a },
  eldi_grothyn: { name: 'Eldi Grothyn', build: () => buildGrothyn({ element: 'Eldi' }), hp: 120, dmg: 12, speed: 0.15, rad: 0.8, range: 5.5, aggro: 7, windup: 0.6, recover: 1.0, lunge: 0, shards: 14, ai: 'melee', color: 0xff8a3a },
  rubbermcfly: { name: 'RubberMcFly', build: () => buildRubberMcFly({ seed: seed() }), hp: 6, dmg: 0, speed: 4, rad: 0.15, range: 0, aggro: 0, shards: 2, ai: 'flyer', color: 0xffe08a, disp: 'neutral', altMul: 0.6, roam: 4 },
  makari: { name: 'Makari swarm', build: () => buildMakariSwarm({ seed: seed(), moteScale: 2 }), hp: 8, dmg: 0, speed: 3, rad: 0.6, range: 0, aggro: 0, shards: 2, ai: 'flyer', color: 0x9aff6a, disp: 'neutral', altMul: 0.4, roam: 3 },
  lutut: { name: 'Lutut', build: () => buildLutut({ seed: seed(), age: Math.random() }), hp: 1300, dmg: 28, speed: 10, rad: 3.0, range: 3, aggro: 26, shards: 200, ai: 'flyer', elite: true, color: 0x9a7ac8, disp: 'neutral', altMul: 3, roam: 22 },
  kuni_wild: { name: 'Kuni Byrd', build: () => buildKuniByrd({ seed: seed() }), hp: 1600, dmg: 30, speed: 16, rad: 3.5, range: 3, aggro: 30, shards: 260, ai: 'flyer', elite: true, color: 0xd8c098, disp: 'neutral', altMul: 9, roam: 60 },
  su_naga: { name: 'Su Naga', build: () => buildSuNaga({ heads: 3 }), hp: 3600, dmg: 34, speed: 5, rad: 6, range: 9, aggro: 16, windup: 1.0, recover: 1.2, lunge: 5, shards: 420, ai: 'swim', water: true, sink: 4.4, stagger: 0, elite: true, miniboss: true, color: 0x6ad8ff, disp: 'neutral' },
  raf_krabbi: { name: 'Raf Krabbi', build: () => buildRafKrabbi({ seed: seed() }), hp: 26, dmg: 6, speed: 4, rad: 0.25, range: 1.2, aggro: 5, windup: 0.4, recover: 0.6, lunge: 4, shards: 5, ai: 'swim', water: true, shallow: true, status: 'paralyze', color: 0x6ad8ff },
  su_grothyn: { name: 'Su Grothyn', build: () => buildGrothyn({ element: 'Su' }), hp: 120, dmg: 12, speed: 0.15, rad: 0.8, range: 5.5, aggro: 7, windup: 0.6, recover: 1.0, lunge: 0, shards: 14, ai: 'swim', water: true, shallow: true, color: 0x3a8aa8 },
  hvaleia: { name: 'Hvaleia', build: buildHvaleia, hp: 1800, dmg: 22, speed: 5, rad: 3.5, range: 4, aggro: 0, shards: 160, ai: 'swim', water: true, sink: 3.3, elite: true, color: 0x6ab8ff, disp: 'neutral' },
  /* the Blind Beast: a great flat manta of fire, gliding low over the high ground; leave it be and it leaves you be */
  apibuta: { name: 'Api Buta', build: () => buildApiButa({ seed: seed() }), hp: 2200, dmg: 26, speed: 6, rad: 4, range: 5, aggro: 9, windup: 1.0, recover: 1.4, lunge: 6, shards: 220, ai: 'flyer', elite: true, color: 0xff7a2a, disp: 'neutral', altMul: 1.4, roam: 26 },
  /* from Katkan: ghost-shapes with one eye and two blade arms — nobody knows what they want */
  cyitor: { name: 'Cyitor', build: () => buildCyitor({ seed: seed() }), hp: 160, dmg: 18, speed: 5.8, rad: 0.7, range: 2.8, aggro: 18, windup: 0.6, recover: 0.8, lunge: 9, shards: 45, ai: 'melee', stagger: 0.3, color: 0xd8e0ff },
  /* the Fuzzy Devil: round, fluffy, big-eyed, bat-winged, with a trident and a temper */
  xiwkatkan: { name: 'Xiw’Katkan', build: () => buildXiwKatkan({ seed: seed() }), hp: 90, dmg: 14, speed: 8, rad: 0.5, range: 2.2, aggro: 20, windup: 0.5, recover: 0.7, lunge: 10, shards: 35, ai: 'flyer', color: 0xff4a6a },
  harkal: { name: 'Harkal', build: () => buildHarkal({ seed: seed() }), hp: 140, dmg: 14, speed: 9, rad: 1.0, range: 2.4, aggro: 16, windup: 0.5, recover: 0.7, lunge: 12, shards: 22, ai: 'swim', water: true, sink: 1.85, color: 0x7aa0b8 },
};

export function createEnemies(ctx) {
  const list = [];
  const knives = [];    // { mesh, pos, delay, vel, dmg, life }
  const globs = [];     // { mesh, pos, vel, dmg, life }
  const puddles = [];   // { mesh, x, z, r, t, dps, poison }
  const D = () => ctx.D;

  function spawn(kind, x, z, group, extra = {}) {
    const T = TYPES[kind];
    if (!T) return null;   // a creature whose model isn't loaded in this build
    const actor = T.build();
    ctx.scene.add(actor.root);
    const hp = Math.round(T.hp * (T.miniboss ? D().bossHp : D().enemyHp));
    const e = Object.assign({
      kind, T, actor, group, pos: V3(x, ctx.world.col.ground(x, z, ctx.world.heightAt(x, z) + 0.5), z), vel: V3(), yaw: Math.random() * 6,
      hp, maxHp: hp, state: 'idle', timer: Math.random() * 2, home: V3(x, 0, z), wander: V3(x, 0, z), flash: 0, stun: 0, dead: false,
      blinkCd: 2 + Math.random() * 2, windup: 0, attackA: 0, alt: T.ai === 'flyer' ? 3 : 0, hostile: T.ai !== 'scavenger' && !T.disp, stolen: 0,
      cd: 1 + Math.random() * 2, lastHit: -99, act: null,
    }, extra);
    list.push(e);
    return e;
  }

  function spawnAll(groups, cleared) {
    groups.forEach((g, gi) => {
      if (g.unique && cleared[g.unique]) return;
      g.kinds.forEach((k, i) => {
        const a = i / g.kinds.length * Math.PI * 2;
        const e = spawn(k, g.at[0] + Math.cos(a) * 3, g.at[1] + Math.sin(a) * 3, gi, Object.assign({ unique: i === 0 ? g.unique : null, tag: g.tag }, g.extra || {}));
        if (g.extra && g.extra.scale) e.actor.root.scale.multiplyScalar(g.extra.scale / 0.75);
      });
    });
  }

  function clear() {
    list.forEach(e => { endSwing(e); ctx.scene.remove(e.actor.root); });
    list.length = 0;
    knives.forEach(k => ctx.scene.remove(k.mesh)); knives.length = 0;
    globs.forEach(k => ctx.scene.remove(k.mesh)); globs.length = 0;
    puddles.forEach(k => ctx.scene.remove(k.mesh)); puddles.length = 0;
  }

  function aggroGroup(e) {
    if (e.group == null) return;
    list.forEach(o => { if (o.group === e.group && !o.dead) { o.hostile = true; if (o.state === 'idle' || o.state === 'shadow') o.state = 'chase'; } });
  }

  function damage(e, dmg, from, kb = 4, opts = {}) {
    if (e.dead || ctx.G.inMemory) return;
    if (e.stray || e.pet || e.pup) return;            // someone's beloved — the axe turns aside
    if (opts.burn) e.burn = Math.max(e.burn || 0, 3);
    dmg *= opts.raw ? 1 : D().playerDmg;
    if (ctx.studyMul) dmg *= ctx.studyMul(e);
    e.hp -= dmg; e.flash = 1; e.lastHit = ctx.G.t;
    const st = e.T.stagger ?? 1;
    const dir = V3(e.pos.x - from.x, 0, e.pos.z - from.z).normalize();
    e.vel.addScaledVector(dir, kb * st * (e.kind === 'malsti' || e.kind === 'kipsu' ? 1.4 : 1));
    if (st > 0.5) e.vel.y = Math.max(e.vel.y, kb * 0.35);
    const stun = (opts.stun ?? 0.32) * st;
    if (stun > 0.15) { e.stun = Math.max(e.stun, stun); e.windup = 0; if (e.state === 'windup') e.state = 'chase'; }
    if (e.T.ai === 'flyer' && opts.stun >= 0.3) { e.state = 'recover'; e.timer = 1.4; }
    if (e.T.disp === 'critter') { if (e.hp <= 0) kill(e); return; }
    if (T_isPassive(e) && !e.hostile && e.T.disp !== 'training') ctx.onProvoke && ctx.onProvoke(e);
    e.hostile = true;
    if (e.state === 'idle' || e.state === 'shadow') e.state = 'chase';
    aggroGroup(e);
    ctx.dmgNumber(e.pos.x, e.pos.y + 1.8 + (e.T.miniboss ? 3 : 0), e.pos.z, Math.round(dmg), opts.big ? 'big' : '');
    ctx.particles.burst(e.pos.x, e.pos.y + 1, e.pos.z, opts.big ? 22 : 12, { color: e.T.color, speed: 7, size: 0.35, life: 0.5, gravity: -12 });
    ctx.sfx.hit();
    /* some fights are only to knock the fear out of a thing: it runs off instead of dying */
    if (e.spare && e.hp <= 0) { e.hp = 1; e.spare = false; e.calmed = true; e.hostile = false; e.state = 'flee'; e.timer = 5; e.stun = 1.2; ctx.onSpare && ctx.onSpare(e); return; }
    if (e.hp <= 0) kill(e);
  }

  function T_isPassive(e) { return !!e.T.disp; }

  function kill(e) {
    endSwing(e);
    e.dead = true; e.state = 'dead'; e.timer = 0;
    ctx.sfx.die();
    ctx.particles.burst(e.pos.x, e.pos.y + 1, e.pos.z, 30, { color: e.T.color, speed: 9, size: 0.5, life: 0.9, gravity: -6 });
    // Rodak travel in threes: fell one, and the whole pack is gone
    if (e.kind === 'rodak' && e.group != null) for (const o of list) if (o !== e && !o.dead && o.kind === 'rodak' && o.group === e.group) { o.state = 'flee'; o.timer = 6; o.hostile = false; }
    ctx.onKill(e);
  }

  /* --------- attacks that leave the creature --------- */
  function throwKnives(e) {
    const P = ctx.P;
    const n = e.T.ai === 'vel' && e.hp < e.maxHp * 0.5 ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const pos = V3(P.pos.x + Math.cos(a) * 4.5, P.pos.y + 1.4 + Math.random(), P.pos.z + Math.sin(a) * 4.5);
      const mesh = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xd0b0ff }));
      blade.rotation.x = Math.PI / 2; mesh.add(blade);
      mesh.add(glowSprite(0x9a4aff, 1.2, 0.9));
      mesh.position.copy(pos); ctx.scene.add(mesh);
      ctx.particles.burst(pos.x, pos.y, pos.z, 10, { color: 0x9a4aff, speed: 3, size: 0.35, life: 0.4 });
      knives.push({ mesh, pos, delay: 0.6 + i * 0.12, vel: V3(), dmg: e.T.dmg * 0.7, life: 3 });
    }
    ctx.sfx.duat();
  }

  function spit(e, count = 1, spread = 0) {
    const P = ctx.P;
    for (let i = 0; i < count; i++) {
      const lead = 0.6;
      const off = (i - (count - 1) / 2) * spread;
      const tx = P.pos.x + P.vel.x * lead, tz = P.pos.z + P.vel.z * lead;
      const ang = Math.atan2(tx - e.pos.x, tz - e.pos.z) + off;
      const dist = Math.min(18, Math.hypot(tx - e.pos.x, tz - e.pos.z));
      const T = 0.9, start = V3(e.pos.x, e.pos.y + (e.T.miniboss ? 3 : e.kind === 'tyndael' ? 1.6 : 1.2), e.pos.z);
      const vel = V3(Math.sin(ang) * dist / T, 0, Math.cos(ang) * dist / T);
      vel.y = ((P.pos.y - start.y) + 0.5 * 24 * T * T) / T;
      const mesh = glowSprite(e.T.miniboss ? 0xb0ff4a : 0xff8a2a, 1.4, 1);
      mesh.position.copy(start); ctx.scene.add(mesh);
      globs.push({ mesh, pos: start, vel, dmg: e.T.dmg * 0.5, life: 3, acid: !!e.T.miniboss });
    }
    ctx.sfx.bolt();
  }

  function puddle(x, z, r, acid) {
    const y = ctx.world.col.ground(x, z, 99) + 0.08;
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: acid ? 0x9aff3a : 0xff6a1a, transparent: true, opacity: 0.6, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); ctx.scene.add(m);
    puddles.push({ mesh: m, x, z, y, r, t: 0, dur: 5, dps: acid ? 10 : 7, poison: 3 });
  }

  /* --------- swimmers: under, at, or just above the water — and never anywhere else --------- */
  function wet(x, z, shallow, deep = 0) {
    const W = ctx.world.water; if (!W) return false;
    if (!W.isWater(x, z)) return false;
    if (deep && W.depth(x, z) < deep) return false;   // the big swimmers keep to water deep enough to hide them
    return !shallow || W.depth(x, z) < 3;
  }
  function updateSwimmer(e, dt, d, toP, playing, aggroR, wf) {
    const P = ctx.P, T = e.T, G = ctx.G, a = e.actor, W = ctx.world.water;
    if (!W) { ctx.scene.remove(a.root); e.gone = true; return; }
    const roam = T.rad > 3 ? 40 : T.rad > 0.9 ? 18 : 6;
    let wantV = 0, wantYaw = e.yaw;
    if (e.hostile && playing && d < aggroR * 1.4 && e.state !== 'wind') e.state = 'chase';
    if (e.state === 'chase') {
      if (!playing || d > aggroR * 2.2) e.state = 'idle';
      wantYaw = toP; wantV = T.speed;
      e.cd -= dt;
      if (d < T.range + T.rad * 0.6 && e.cd <= 0) { e.state = 'wind'; e.timer = (T.windup || 0.6) * wf; }
    } else if (e.state === 'wind') {
      wantYaw = toP; e.windup = 1; e.timer -= dt;
      if (e.timer <= 0) {
        e.attackA = 1; e.state = 'chase'; e.cd = (T.recover || 1) + 0.6;
        if (d < T.range + T.rad * 0.7 && T.dmg > 0) ctx.hurtPlayer(T.dmg * D().enemyDmg, e.pos, 6, T.status === 'paralyze' ? { paralyze: 0.6 } : {});
      }
    } else {
      e.timer -= dt;
      if (e.timer <= 0) {
        e.timer = 4 + Math.random() * 6;
        for (let i = 0; i < 8; i++) {
          const x = e.home.x + (Math.random() - 0.5) * roam * 2, z = e.home.z + (Math.random() - 0.5) * roam * 2;
          if (wet(x, z, T.shallow, (T.sink || 0) * 0.8)) { e.wander.set(x, 0, z); break; }
        }
      }
      const wx = e.wander.x - e.pos.x, wz = e.wander.z - e.pos.z;
      if (Math.hypot(wx, wz) > 1.2) { wantV = T.speed * 0.35; wantYaw = Math.atan2(wx, wz); }
      if (!e.hostile && T.aggro && d < T.aggro * 0.5 && playing && !T.disp) { e.hostile = true; e.state = 'chase'; ctx.onAggro(e); }
    }
    moveTo(e, wantYaw, wantV, dt);
    const nx = e.pos.x + e.vel.x * dt, nz = e.pos.z + e.vel.z * dt;
    if (wet(nx, nz, T.shallow, (T.sink || 0) * 0.8)) { e.pos.x = nx; e.pos.z = nz; }
    else { e.vel.x *= -0.3; e.vel.z *= -0.3; e.timer = 0; }
    const ground = ctx.world.heightAt(e.pos.x, e.pos.z);
    if (T.ai === 'airswim') e.pos.y = W.level + T.fly + Math.sin(G.t * 0.7 + e.home.x) * 0.5;
    else if (T.shallow) e.pos.y = Math.max(ground, W.level - 2.5);
    else e.pos.y = Math.max(ground, W.level - (T.sink || 0.4) + Math.sin(G.t * 0.5 + e.home.x) * 0.25);   // in the water, not on it: the body under, a fin or a back breaking the surface
    a.root.position.copy(e.pos); a.root.rotation.y = e.yaw;
    if (a.root.visible) a.animate(dt, { speed: Math.hypot(e.vel.x, e.vel.z), t: G.t, windup: e.windup, attack: e.attackA, onGround: true });
  }

  /* --------- per-frame --------- */
  function moveTo(e, wantYaw, wantV, dt) {
    e.wantYaw = wantYaw;
    e.yaw = dampAngle(e.yaw, wantYaw, 10, dt);
    const k = e.stun > 0 ? 2 : 10;
    e.vel.x = damp(e.vel.x, e.stun > 0 ? 0 : Math.sin(e.yaw) * wantV, k, dt);
    e.vel.z = damp(e.vel.z, e.stun > 0 ? 0 : Math.cos(e.yaw) * wantV, k, dt);
  }

  function updateOne(e, dt) {
    const P = ctx.P, G = ctx.G, a = e.actor, T = e.T;
    if (e.dead) {
      e.timer += dt;
      if (e.s0 == null) e.s0 = a.root.scale.x;
      const s0 = e.baseScale || e.s0;
      a.root.scale.setScalar(Math.max(0.001, s0 * (1 - e.timer / (T.miniboss ? 2 : 0.6))));
      a.root.rotation.z += dt * (T.miniboss ? 0.5 : 6);
      if (e.timer > (T.miniboss ? 2 : 0.6)) { ctx.scene.remove(a.root); e.gone = true; }
      return;
    }
    const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz);
    const toP = Math.atan2(dx, dz);
    let wantV = 0, wantYaw = e.yaw;
    e.flash = Math.max(0, e.flash - dt * 5); a.flash(e.flash * 0.9);
    if (ctx.G.inMemory) { a.root.visible = false; e.vel.set(0, 0, 0); return; }
    /* far-off creatures aren't drawn or animated — small ones vanish sooner than big ones */
    a.root.visible = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) < 90 + T.rad * 40;
    if (a.glow && a.root.visible) a.glow(e.kind === 'rubbermcfly' ? (ctx.storm ? ctx.storm() : 0) : ctx.night ? ctx.night() : 0);   // RubberMcFly glow only in the Sunear'Zikhron
    if (a.blink) { e.blinkGlow = Math.max(0, (e.blinkGlow || 0) - dt * 2.5); a.blink(e.blinkGlow); }
    e.stun = Math.max(0, e.stun - dt);
    if (e.burn > 0) {
      e.burn -= dt; e.hp -= 6 * dt;
      if (Math.random() < 0.5) ctx.particles.emit(e.pos.x, e.pos.y + 1, e.pos.z, { vy: 2, speed: 1, color: 0xff7a2a, size: 0.4, life: 0.5 });
      if (e.hp <= 0) { kill(e); return; }
    }
    e.windup = Math.max(0, e.windup - dt * 3); e.attackA = Math.max(0, e.attackA - dt * 4);
    const playing = G.mode === 'play' && !P.dead && !G.truce;
    const wf = D().windup;
    const aggroR = T.aggro * D().aggro;

    if (!playing && e.state !== 'idle' && e.state !== 'return' && e.state !== 'flee') e.state = 'return';

    /* water folk never leave the water */
    if (T.ai === 'swim' || T.ai === 'airswim') { updateSwimmer(e, dt, d, toP, playing, aggroR, wf); return; }

    /* dummies stand still on their posts */
    if (T.ai === 'static') {
      e.pos.set(e.home.x, ctx.world.heightAt(e.home.x, e.home.z) + (T.perch || 0), e.home.z); e.vel.set(0, 0, 0);
      a.root.position.copy(e.pos); a.root.rotation.y = e.yaw;
      a.animate(dt, { t: ctx.G.t });
      return;
    }

    /* friendly and neutral creatures go about their lives until someone starts a fight */
    if (T.disp && !e.hostile) {
      if (T.ai === 'flyer') { e.state = 'idle'; updateFlyer(e, dt, d, toP); return finishMove(e, dt, d, dx, dz); }
      e.timer -= dt;
      if (e.timer <= 0) { e.timer = 3 + Math.random() * 5; e.wander.set(e.home.x + (Math.random() - 0.5) * 16, 0, e.home.z + (Math.random() - 0.5) * 16); }
      const wx = e.wander.x - e.pos.x, wz = e.wander.z - e.pos.z;
      if (T.disp === 'critter' && d < 8 && playing) { wantYaw = Math.atan2(-dx, -dz) + Math.sin(G.t * 3 + e.home.x) * 0.5; wantV = T.speed; e.wander.set(e.pos.x - dx, 0, e.pos.z - dz); }
      else if (e.follow && d > 3.5) { wantYaw = toP; wantV = Math.min(T.speed, d * 1.5); }
      else if (Math.hypot(wx, wz) > 1.2 && !(d < 3 && T.disp === 'friendly')) { wantV = T.speed * 0.25; wantYaw = Math.atan2(wx, wz); }
      else if (d < 6) wantYaw = toP;     // curious: turn to look at you
      moveTo(e, wantYaw, wantV, dt);
      return finishMove(e, dt, d, dx, dz);
    }

    if (e.stun > 0) {
      // reeling
    } else if (e.state === 'idle' || e.state === 'return') {
      if (e.state === 'idle') {
        e.timer -= dt;
        if (e.timer <= 0) { e.timer = 2 + Math.random() * 3; e.wander.set(e.home.x + (Math.random() - 0.5) * 12, 0, e.home.z + (Math.random() - 0.5) * 12); }
        const wx = e.wander.x - e.pos.x, wz = e.wander.z - e.pos.z;
        if (Math.hypot(wx, wz) > 1) { wantV = T.speed * 0.3; wantYaw = Math.atan2(wx, wz); }
        if (d < aggroR && playing) {
          if (T.ai === 'scavenger' && !e.hostile) e.state = 'shadow';
          else { e.state = 'chase'; aggroGroup(e); ctx.onAggro(e); }
        }
      } else {
        const hx = e.home.x - e.pos.x, hz = e.home.z - e.pos.z;
        wantYaw = Math.atan2(hx, hz); wantV = T.speed;
        e.hp = Math.min(e.maxHp, e.hp + dt * e.maxHp * 0.15);
        if (Math.hypot(hx, hz) < 2) { e.state = 'idle'; e.timer = 1; }
        if (playing && d < aggroR * 0.6 && e.hostile) e.state = 'chase';
      }
    } else if (T.ai === 'scavenger' && e.state === 'shadow') {
      // keep a curious distance — waiting for the aftermath
      const want = 12;
      const side = Math.atan2(-dz, -dx) + 0.4 * Math.sin(G.t * 0.3 + e.home.x);
      const tx = P.pos.x + Math.cos(side) * want, tz = P.pos.z + Math.sin(side) * want;
      const ox = tx - e.pos.x, oz = tz - e.pos.z;
      if (Math.hypot(ox, oz) > 1.5) { wantV = T.speed * 0.45; wantYaw = Math.atan2(ox, oz); } else wantYaw = toP;
      if (P.hp < P.maxHp * 0.4) { e.hostile = true; e.state = 'chase'; aggroGroup(e); ctx.onAggro(e, 'scent'); }
      if (d > aggroR * 2.2) e.state = 'return';
    } else if (e.state === 'flee') {
      wantYaw = Math.atan2(-dx, -dz); wantV = T.speed * 1.1;
      e.timer -= dt;
      if (d > 55 || e.timer <= 0) { endSwing(e); ctx.scene.remove(a.root); e.gone = true; e.escaped = true; ctx.onEscape(e); return; }
    } else if (T.ai === 'flyer') {
      updateFlyer(e, dt, d, toP);
      return finishMove(e, dt, d, dx, dz);
    } else if (T.ai === 'vel') {
      ({ wantV, wantYaw } = updateVel(e, dt, d, toP, wf));
    } else if (T.ai === 'sruvorn') {
      ({ wantV, wantYaw } = updateSru(e, dt, d, toP, wf));
    } else {
      // melee, scavenger and thief chase-and-lunge; the spitter keeps its distance
      if (e.state === 'chase') {
        wantYaw = toP; wantV = T.speed;
        if (T.ai === 'spitter') {
          e.cd -= dt;
          if (d < 8) { wantYaw = toP + Math.PI; wantV = T.speed * 0.8; }
          else if (d < 15) wantV = 0;
          if (e.cd <= 0 && d < 20 && d > 3) { e.state = 'spitwind'; e.timer = 0.7 * wf; }
        }
        if (T.ai === 'scavenger' && d < 7 && d > T.range) {
          // circle before darting in
          wantYaw = toP + (e.home.x > 0 ? 1.2 : -1.2); wantV = T.speed * 0.7;
          e.cd -= dt; if (e.cd > 0) wantV = T.speed * 0.7; else { e.cd = 1.2 + Math.random() * 1.5; e.state = 'windup'; e.timer = T.windup * wf; }
        }
        if (d < T.range && (T.ai !== 'spitter' || d < 2.5)) { e.state = 'windup'; e.timer = T.windup * wf; }
        const homeD = Math.hypot(e.pos.x - e.home.x, e.pos.z - e.home.z);
        if ((homeD > 60 || d > 45) && !e.boss) e.state = 'return';
        if (T.blink) {
          e.blinkCd -= dt;
          if (e.blinkCd <= 0 && d > 4) {
            e.blinkCd = 2.5 + Math.random() * 2.5;
            const ang = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 2;
            ctx.particles.burst(e.pos.x, e.pos.y + 0.5, e.pos.z, 14, { color: 0x9a4aff, speed: 4, size: 0.4, life: 0.5 });
            e.pos.x = P.pos.x + Math.cos(ang) * r; e.pos.z = P.pos.z + Math.sin(ang) * r;
            e.pos.y = ctx.world.col.ground(e.pos.x, e.pos.z, P.pos.y + 2);
            ctx.particles.burst(e.pos.x, e.pos.y + 0.5, e.pos.z, 14, { color: 0xc08aff, speed: 4, size: 0.4, life: 0.5 });
            e.blinkGlow = 1;
            ctx.sfx.blink();
          }
        }
      } else if (e.state === 'spitwind') {
        wantYaw = toP; e.timer -= dt; e.windup = 1;
        if (e.timer <= 0) { spit(e); e.cd = 2.2 + Math.random() * 1.4; e.state = 'chase'; }
      } else if (e.state === 'windup') {
        wantYaw = toP; e.timer -= dt; e.windup = 1;
        if (e.timer <= 0) {
          e.state = 'attack'; e.timer = 0.22; e.hitDone = false;
          e.vel.x += Math.sin(e.yaw) * T.lunge; e.vel.z += Math.cos(e.yaw) * T.lunge;
        }
      } else if (e.state === 'attack') {
        e.timer -= dt; e.attackA = 1;
        if (!e.hitDone && d < T.range + 0.7 && Math.abs(P.pos.y - e.pos.y) < 2) {
          e.hitDone = true;
          const landed = ctx.hurtPlayer(T.dmg * D().enemyDmg, e.pos, 7, {});
          if (landed && T.ai === 'thief' && ctx.G.shards > 0) {
            const n = Math.min(ctx.G.shards, 6 + Math.floor(Math.random() * 10));
            e.stolen += n; ctx.stealShards(n, e);
            e.state = 'flee'; e.timer = 9;
          }
        }
        if (e.timer <= 0 && e.state === 'attack') { e.state = 'recover'; e.timer = T.recover * wf; }
      } else if (e.state === 'recover') {
        e.timer -= dt; if (e.timer <= 0) e.state = 'chase';
      }
    }
    moveTo(e, wantYaw, wantV, dt);
    finishMove(e, dt, d, dx, dz);
  }

  /* ---------- Punks in the trees ----------
     A Punk at a run through the woods throws a vine round a branch and swings
     on it: round the trunk and off in a new direction, quicker than it could
     ever turn on its feet. */
  const SWINGERS = { punk: 1, punk_d: 1, malsti: 1 };
  // a trunk, a post, a pillar, a boulder, the corner of a wall — anything solid right beside it (vines.js)
  function findTrunk(e) { return pivotNear(ctx.world, e.pos, e.vel, e.T.rad); }
  function startSwing(e, t) {
    const v = Math.max(Math.hypot(e.vel.x, e.vel.z), e.T.speed * 0.8);
    const ox = e.pos.x - t.x, oz = e.pos.z - t.z, r = Math.hypot(ox, oz);
    // swing round the side it's already moving toward
    const dir = (ox * e.vel.z - oz * e.vel.x) > 0 ? 1 : -1;
    // sweep as far round as it needs to come out facing where it wants to go
    const head = Math.atan2(e.vel.x, e.vel.z), want = e.wantYaw != null ? e.wantYaw : head;
    let turn = Math.abs(Math.atan2(Math.sin(want - head), Math.cos(want - head)));
    const sweep = clamp(turn + 0.5, 0.9, 2.8);
    const by = t.g + Math.min(t.h * 0.75, 6.5);
    e.swing = { t, r, a: Math.atan2(oz, ox), dir, w: v / r, left: sweep, done: 0, g: e.pos.y, by, lift: clamp(by - e.pos.y - 1.6, 1.2, 3.6), v, anchor: V3(t.x, by, t.z) };
  }
  function updateSwing(e, dt) {
    const S = e.swing, a = e.actor;
    const step = S.w * dt; S.a += S.dir * step; S.done += step;
    const k = Math.min(1, S.done / S.left);
    e.pos.x = S.t.x + Math.cos(S.a) * S.r; e.pos.z = S.t.z + Math.sin(S.a) * S.r;
    const g = ctx.world.col.ground(e.pos.x, e.pos.z, S.g + 3);
    e.pos.y = Math.max(g, lerp0(S.g, g, k) + Math.sin(k * Math.PI) * S.lift);   // up off the ground on the vine, and down again
    // moving along the circle: the tangent
    const tx = -Math.sin(S.a) * S.dir, tz = Math.cos(S.a) * S.dir;
    e.vel.set(tx * S.v, 0, tz * S.v); e.yaw = Math.atan2(tx, tz);
    a.root.position.copy(e.pos); a.root.rotation.y = e.yaw;
    a.root.rotation.z = -S.dir * 0.4 * Math.sin(k * Math.PI);                    // leaning in toward the trunk
    // the swing is one of its own leg-vines, shot out and wrapped round the trunk (or post, or rock)
    if (a.root.visible) { a.root.updateMatrixWorld(true); a.animate(dt, { speed: 0, t: ctx.G.t, grab: { p: a.root.worldToLocal(S.anchor.clone()), k: Math.min(1, S.done * 5) }, air: Math.sin(k * Math.PI) }); }
    if (k >= 1 || e.dead || e.stun > 0) endSwing(e);
  }
  function endSwing(e) {
    if (!e.swing) return;
    e.swing = null; e.swingCd = 1.2 + Math.random() * 1.5; e.actor.root.rotation.z = 0;
  }
  const lerp0 = (a, b, k) => a + (b - a) * k;

  function finishMove(e, dt, d, dx, dz) {
    const P = ctx.P, a = e.actor, T = e.T;
    if (SWINGERS[e.kind] && !e.dead) {
      if (e.swing) { updateSwing(e, dt); return; }
      e.swingCd = (e.swingCd || 0) - dt;
      const v = Math.hypot(e.vel.x, e.vel.z);
      if (e.swingCd <= 0 && (v > T.speed * 0.6 || (v > 0.6 && Math.random() < 0.04)) && !e.windup && e.state !== 'windup' && e.state !== 'attack' && ctx.world.col.ground(e.pos.x, e.pos.z, e.pos.y + 0.5) <= e.pos.y + 0.1) {
        e.swingCd = 0.25;   // look again in a moment
        const t = findTrunk(e);
        if (t) { startSwing(e, t); updateSwing(e, dt); return; }
      }
    }
    // a Stryx never moves: it is rooted where it grew. It turns on its roots to face what it's watching,
    // and its vines do the reaching (its strike comes from as far as they go)
    if (T.rooted && !e.dead) {
      e.vel.x = 0; e.vel.z = 0;
      if (e.hostile || e.state === 'windup' || e.state === 'attack') e.yaw = dampAngle(e.yaw, Math.atan2(P.pos.x - e.pos.x, P.pos.z - e.pos.z), 2.5, dt);
    }
    if (T.ai !== 'flyer') {
      e.vel.y -= 30 * dt;
      // land creatures stop at the water's edge rather than walking along the bottom
      const W = ctx.world.water;
      if (W) { const dn = W.depth(e.pos.x + e.vel.x * dt, e.pos.z + e.vel.z * dt); if (dn > 1.4 && dn > W.depth(e.pos.x, e.pos.z)) { e.vel.x = 0; e.vel.z = 0; } }
    }
    e.pos.addScaledVector(e.vel, dt);
    for (const o of list) {
      if (o === e || o.dead || o.T.ai === 'flyer') continue;
      const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z, od = Math.hypot(ox, oz), min = T.rad + o.T.rad;
      if (od < min && od > 1e-3) { e.pos.x += ox / od * (min - od) * 0.5; e.pos.z += oz / od * (min - od) * 0.5; }
    }
    if (T.ai !== 'flyer' && d < T.rad + 0.45 && d > 1e-3) { e.pos.x -= dx / d * (T.rad + 0.45 - d); e.pos.z -= dz / d * (T.rad + 0.45 - d); }
    if (T.ai !== 'flyer') {
      ctx.world.col.resolve(e.pos, T.rad, 1.6);
      if (ctx.G.arena) ctx.arenaClamp(e.pos, ctx.G.arena - 1);
      const g = ctx.world.col.ground(e.pos.x, e.pos.z, e.pos.y);
      if (e.pos.y <= g) { e.pos.y = g; e.vel.y = 0; }
    }
    if (e.pos.y < -60) { e.hp = 0; kill(e); }
    a.root.position.copy(e.pos);
    a.root.rotation.y = e.yaw;
    let grab = null; if (e.haul && a.root.visible) { a.root.updateMatrixWorld(true); grab = { p: a.root.worldToLocal(e.haul.A.clone()), k: Math.min(1, e.haul.t / 0.25) }; }
    if (a.root.visible) a.animate(dt, { grab, speed: Math.hypot(e.vel.x, e.vel.z), t: ctx.G.t, windup: e.windup, attack: e.attackA, diving: e.state === 'dive', airborne: T.ai === 'flyer' && e.alt > 0.6, tail: e.tailT || 0, tailUp: e.windup && e.act === 'tail' ? 1 : 0, thrown: e.state === 'cast' });
  }

  /* --------- Albali: circle high, dive, then hang low and vulnerable --------- */
  function updateFlyer(e, dt, d, toP) {
    const P = ctx.P, T = e.T, G = ctx.G;
    const ground = ctx.world.heightAt(e.pos.x, e.pos.z);
    let wantAlt = 3, wantPos = null, sp = T.speed;
    const AM = T.altMul || 1, RO = T.roam || 6;
    if (e.stun > 0) { wantAlt = 1.2; }
    else if (e.state === 'chase') {
      e.orbit = (e.orbit ?? Math.random() * 6) + dt * 0.8;
      wantPos = V3(P.pos.x + Math.cos(e.orbit) * 8, 0, P.pos.z + Math.sin(e.orbit) * 8);
      wantAlt = 6.5 * Math.max(1, AM * 0.5);
      e.cd -= dt;
      if (e.cd <= 0) { e.state = 'rise'; e.timer = 0.65 * D().windup; }
      if (d > 50) e.state = 'return';
    } else if (e.state === 'rise') {
      e.timer -= dt; e.windup = 1; wantAlt = 8.5; wantPos = e.pos.clone();
      if (e.timer <= 0) {
        e.state = 'dive'; e.timer = 1.0; e.hitDone = false;
        const tgt = V3(P.pos.x, P.pos.y + 1, P.pos.z);
        const from = V3(e.pos.x, e.pos.y, e.pos.z);
        e.diveVel = tgt.sub(from).normalize().multiplyScalar(24);
      }
    } else if (e.state === 'dive') {
      e.timer -= dt;
      e.pos.addScaledVector(e.diveVel, dt);
      e.yaw = Math.atan2(e.diveVel.x, e.diveVel.z);
      const dd = e.pos.distanceTo(V3(P.pos.x, P.pos.y + 1, P.pos.z));
      if (!e.hitDone && dd < 1.7) {
        e.hitDone = true;
        ctx.hurtPlayer(T.dmg * D().enemyDmg, e.pos, 6, T.status === 'poison' ? { poison: 6 } : { paralyze: 0.8 });
      }
      if (e.timer <= 0 || e.pos.y < ground + 1.0) { e.state = 'recover'; e.timer = 1.3; e.pos.y = Math.max(e.pos.y, ground + 1.0); }
      e.alt = e.pos.y - ground;
      finishFlyer(e, dt);
      return;
    } else if (e.state === 'recover') {
      e.timer -= dt; wantAlt = 1.4; wantPos = e.pos.clone();
      if (e.timer <= 0) { e.state = 'chase'; e.cd = 2.5 + Math.random() * 2; }
    } else if (e.state === 'return' || e.state === 'idle') {
      wantPos = V3(e.home.x + Math.cos(G.t * 0.4 * 6 / RO + e.home.z) * RO, 0, e.home.z + Math.sin(G.t * 0.4 * 6 / RO + e.home.z) * RO); wantAlt = 4 * AM;
      if (e.state === 'return' && Math.hypot(e.pos.x - e.home.x, e.pos.z - e.home.z) < 8) e.state = 'idle';
      if (e.hostile && d < T.aggro * D().aggro && G.mode === 'play' && !P.dead) { e.state = 'chase'; ctx.onAggro(e); }
      sp = T.speed * 0.5;
    }
    if (wantPos) {
      const wx = wantPos.x - e.pos.x, wz = wantPos.z - e.pos.z, wd = Math.hypot(wx, wz);
      const v = wd > 0.5 ? Math.min(sp, wd * 2) : 0;
      e.vel.x = damp(e.vel.x, wd > 0.01 ? wx / wd * v : 0, 4, dt);
      e.vel.z = damp(e.vel.z, wd > 0.01 ? wz / wd * v : 0, 4, dt);
      if (v > 0.5) e.yaw = dampAngle(e.yaw, Math.atan2(e.vel.x, e.vel.z), 6, dt);
      else e.yaw = dampAngle(e.yaw, toP, 6, dt);
    }
    e.pos.x += e.vel.x * dt; e.pos.z += e.vel.z * dt;
    e.alt = damp(e.alt, wantAlt, 3, dt);
    e.pos.y = ground + e.alt + Math.sin(G.t * 3 + e.home.x) * 0.2;
    finishFlyer(e, dt);
  }
  function finishFlyer(e, dt) {
    const a = e.actor;
    a.root.position.copy(e.pos);
    a.root.rotation.y = e.yaw;
    if (a.root.visible) a.animate(dt, { speed: Math.hypot(e.vel.x, e.vel.z), t: ctx.G.t, diving: e.state === 'dive', airborne: e.alt > 0.6, windup: e.windup });
  }

  /* --------- Duskareth Vel --------- */
  function updateVel(e, dt, d, toP, wf) {
    const P = ctx.P, T = e.T;
    let wantV = 0, wantYaw = toP;
    if (e.state === 'chase') {
      e.cd -= dt;
      if (d > 12) wantV = T.speed; else if (d < 6) { wantYaw = toP + Math.PI; wantV = T.speed * 0.8; }
      else { wantYaw = toP + 1.4; wantV = T.speed * 0.5; }
      if (d < 3.2 && e.cd < 1.5) {
        if (Math.random() < 0.45) blinkAway(e, 11);
        else { e.state = 'windup'; e.timer = 0.5 * wf; e.act = 'thrust'; }
      } else if (e.cd <= 0 && d < 30) { e.state = 'cast'; e.timer = 0.8 * wf; }
      if (d > 50) e.state = 'return';
    } else if (e.state === 'cast') {
      e.timer -= dt; e.windup = 1; wantYaw = toP;
      if (e.timer <= 0) { throwKnives(e); e.cd = (e.hp < e.maxHp * 0.5 ? 2.4 : 3.4) * wf; e.state = 'chase'; if (Math.random() < 0.5) blinkAway(e, 9); }
    } else if (e.state === 'windup') {
      e.timer -= dt; e.windup = 1; wantYaw = toP;
      if (e.timer <= 0) { e.state = 'attack'; e.timer = 0.25; e.hitDone = false; e.vel.x += Math.sin(e.yaw) * 12; e.vel.z += Math.cos(e.yaw) * 12; }
    } else if (e.state === 'attack') {
      e.timer -= dt; e.attackA = 1;
      if (!e.hitDone && d < T.range + 0.8) { e.hitDone = true; ctx.hurtPlayer(T.dmg * D().enemyDmg, e.pos, 9, {}); }
      if (e.timer <= 0) { e.state = 'chase'; e.cd = Math.max(e.cd, 1.2); }
    }
    return { wantV, wantYaw };
  }
  function blinkAway(e, r) {
    const P = ctx.P;
    ctx.particles.burst(e.pos.x, e.pos.y + 1, e.pos.z, 20, { color: 0x9a4aff, speed: 5, size: 0.45, life: 0.5 });
    const ang = Math.random() * Math.PI * 2;
    e.pos.x = P.pos.x + Math.cos(ang) * r; e.pos.z = P.pos.z + Math.sin(ang) * r;
    if (ctx.G.arena) ctx.arenaClamp(e.pos, ctx.G.arena - 2);
    e.pos.y = ctx.world.col.ground(e.pos.x, e.pos.z, ctx.world.heightAt(e.pos.x, e.pos.z) + 1);
    ctx.particles.burst(e.pos.x, e.pos.y + 1, e.pos.z, 20, { color: 0xc08aff, speed: 5, size: 0.45, life: 0.5 });
    ctx.sfx.blink();
  }

  /* --------- Sru Vorn --------- */
  function updateSru(e, dt, d, toP, wf) {
    const P = ctx.P, T = e.T;
    let wantV = 0, wantYaw = toP;
    const dmg = T.dmg * D().enemyDmg;
    e.tailT = Math.max(0, (e.tailT || 0) - dt * 1.5);
    if (e.state === 'chase') {
      e.cd -= dt; wantV = d > 5 ? T.speed : 0;
      if (e.cd <= 0) {
        const r = Math.random();
        if (d < 6.5 && r < 0.45) { e.act = 'tail'; e.timer = 0.95 * wf; ctx.telegraph(e.pos.x, e.pos.z, 7.5, e.timer, 0xb0ff4a); }
        else if (d < 6) { e.act = 'gore'; e.timer = 0.65 * wf; }
        else if (d < 18 && r < 0.5) { e.act = 'acid'; e.timer = 0.8 * wf; }
        else { e.act = 'charge'; e.timer = 1.0 * wf; e.chargeYaw = toP; }
        e.state = 'windup';
      }
      if (d > 60) e.state = 'return';
    } else if (e.state === 'windup') {
      e.timer -= dt; e.windup = 1;
      wantYaw = e.act === 'charge' ? toP : toP;
      if (e.act === 'charge') { e.chargeYaw = toP; if (Math.random() < 0.5) ctx.particles.emit(e.pos.x, e.pos.y + 0.3, e.pos.z, { color: 0x8a7a5a, size: 1, life: 0.6, speed: 3 }); }
      if (e.timer <= 0) {
        e.hitDone = false;
        if (e.act === 'charge') { e.state = 'charging'; e.timer = 1.3; ctx.sfx.roar(); }
        else if (e.act === 'gore') {
          e.state = 'recover'; e.timer = 0.9 * wf; e.attackA = 1;
          const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw), dot = d > 0 ? ((P.pos.x - e.pos.x) * fx + (P.pos.z - e.pos.z) * fz) / d : 1;
          if (d < 6.2 && dot > 0.3) ctx.hurtPlayer(dmg, e.pos, 14, {});
          ctx.sfx.heavy();
        } else if (e.act === 'tail') {
          e.state = 'recover'; e.timer = 1.0 * wf; e.tailT = 1;
          const air = P.pos.y - ctx.world.col.ground(P.pos.x, P.pos.z, P.pos.y);
          if (d < 7.5 && air < 0.8) ctx.hurtPlayer(dmg * 0.85, e.pos, 16, {});
          ctx.particles.ring(e.pos.x, e.pos.y + 0.5, e.pos.z, 50, 14, { color: 0xc0b080, size: 0.8, life: 0.5 });
          ctx.sfx.heavy(); ctx.G.shake = Math.max(ctx.G.shake, 0.4);
        } else if (e.act === 'acid') {
          e.state = 'recover'; e.timer = 0.8 * wf; spit(e, 5, 0.18);
        }
      }
    } else if (e.state === 'charging') {
      e.timer -= dt; wantYaw = e.chargeYaw;
      e.yaw = e.chargeYaw;
      e.vel.x = Math.sin(e.yaw) * 17; e.vel.z = Math.cos(e.yaw) * 17;
      if (!e.hitDone && d < 3.6) { e.hitDone = true; ctx.hurtPlayer(dmg * 1.2, e.pos, 20, {}); }
      if (Math.random() < 0.6) ctx.particles.emit(e.pos.x, e.pos.y + 0.3, e.pos.z, { color: 0x8a7a5a, size: 1.4, life: 0.8, speed: 3 });
      if (e.timer <= 0) { e.state = 'recover'; e.timer = 1.1 * wf; e.vel.multiplyScalar(0.2); }
      return { wantV: 17, wantYaw: e.chargeYaw };
    } else if (e.state === 'recover') {
      e.timer -= dt;
      if (e.timer <= 0) { e.state = 'chase'; e.cd = (e.hp < e.maxHp * 0.5 ? 0.6 : 1.1) * wf; }
    }
    if (Math.random() < 0.15) { const h = e.actor.head.getWorldPosition(V3()); ctx.particles.emit(h.x, h.y - 1, h.z, { vy: -2, color: 0xb0ff4a, size: 0.4, life: 0.6, speed: 0.6 }); }
    return { wantV, wantYaw };
  }

  /* --------- projectiles & puddles --------- */
  function updateMissiles(dt) {
    const P = ctx.P;
    for (let i = knives.length - 1; i >= 0; i--) {
      const k = knives[i];
      k.life -= dt;
      if (k.delay > 0) {
        k.delay -= dt;
        k.mesh.lookAt(P.pos.x, P.pos.y + 1.1, P.pos.z);
        if (k.delay <= 0) k.vel.set(P.pos.x - k.pos.x, P.pos.y + 1.1 - k.pos.y, P.pos.z - k.pos.z).normalize().multiplyScalar(26);
      } else {
        k.pos.addScaledVector(k.vel, dt);
        k.mesh.position.copy(k.pos);
        if (k.pos.distanceTo(V3(P.pos.x, P.pos.y + 1.1, P.pos.z)) < 0.9) { ctx.hurtPlayer(k.dmg * D().enemyDmg, k.pos, 4, {}); k.life = 0; }
        if (P.atk && P.atk.p > 0.2 && P.atk.p < 0.7 && k.pos.distanceTo(P.pos) < 2.6) { k.life = 0; ctx.particles.burst(k.pos.x, k.pos.y, k.pos.z, 10, { color: 0xd0b0ff, speed: 5, size: 0.3, life: 0.3 }); }
      }
      if (k.life <= 0) { ctx.scene.remove(k.mesh); knives.splice(i, 1); }
    }
    for (let i = globs.length - 1; i >= 0; i--) {
      const g = globs[i];
      g.life -= dt; g.vel.y -= 24 * dt;
      g.pos.addScaledVector(g.vel, dt); g.mesh.position.copy(g.pos);
      if (Math.random() < 0.7) ctx.particles.emit(g.pos.x, g.pos.y, g.pos.z, { color: g.acid ? 0x9aff3a : 0xff8a2a, size: 0.4, life: 0.3, speed: 0.3 });
      const ground = ctx.world.col.ground(g.pos.x, g.pos.z, g.pos.y + 0.5);
      if (g.pos.distanceTo(V3(P.pos.x, P.pos.y + 1, P.pos.z)) < 1.0) { ctx.hurtPlayer(g.dmg * D().enemyDmg, g.pos, 3, { poison: 4 }); g.life = 0; }
      if (g.pos.y <= ground || g.life <= 0) { puddle(g.pos.x, g.pos.z, g.acid ? 2.6 : 2.0, g.acid); g.life = 0; }
      if (g.life <= 0) { ctx.scene.remove(g.mesh); globs.splice(i, 1); }
    }
    for (let i = puddles.length - 1; i >= 0; i--) {
      const p = puddles[i]; p.t += dt;
      p.mesh.material.opacity = 0.6 * Math.min(1, (p.dur - p.t) / 1.0);
      if (Math.random() < 0.3) ctx.particles.emit(p.x + (Math.random() - 0.5) * p.r, p.y, p.z + (Math.random() - 0.5) * p.r, { vy: 1.5, speed: 0.3, color: p.dps > 8 ? 0x9aff3a : 0xff7a2a, size: 0.4, life: 0.6 });
      if (p.t >= p.dur) { ctx.scene.remove(p.mesh); puddles.splice(i, 1); }
    }
  }

  return {
    list, puddles, spawn, spawnAll, clear, damage, kill,
    update(dt) {
      for (const e of list) updateOne(e, dt);
      for (let i = list.length - 1; i >= 0; i--) if (list[i].gone) list.splice(i, 1);
      updateMissiles(dt);
    },
  };
}
