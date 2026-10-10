/* ============================================================
   The Esik that fight back. One table of creature kinds, each
   with its own behaviour, plus the knives, venom globs and
   burning puddles they leave behind.
   ============================================================ */
import * as THREE from 'three';
import { damp, dampAngle, clamp } from './util.js';
import { glowSprite } from './gfx.js';
import { buildPunk } from './actors.js';
import { buildRodak, buildKipsu, buildAlbali, buildVel, buildTyndael, buildSruVorn, buildDummy, buildKofi } from './creatures.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export const TYPES = {
  punk: { name: 'Wild Punk', build: () => buildPunk(false), hp: 60, dmg: 12, speed: 5.4, rad: 0.85, range: 2.4, aggro: 15, windup: 0.6, recover: 0.75, lunge: 9, shards: 6, ai: 'melee', color: 0xffb040 },
  malsti: { name: 'Malsti Punk', build: () => buildPunk(true), hp: 26, dmg: 6, speed: 7.2, rad: 0.4, range: 1.5, aggro: 17, windup: 0.35, recover: 0.5, lunge: 9, shards: 3, ai: 'melee', blink: true, color: 0xc08aff },
  rodak: { name: 'Rodak', build: buildRodak, hp: 75, dmg: 15, speed: 8.6, rad: 0.7, range: 2.7, aggro: 14, windup: 0.45, recover: 0.7, lunge: 13, shards: 10, ai: 'scavenger', color: 0x6a8a8a },
  kipsu: { name: 'Kipsu', build: () => buildKipsu(0.55), hp: 32, dmg: 4, speed: 9.5, rad: 0.45, range: 1.5, aggro: 11, windup: 0.3, recover: 0.4, lunge: 9, shards: 5, ai: 'thief', color: 0x6af0e0 },
  albali: { name: 'Albali Byrd', build: () => buildAlbali(false), hp: 48, dmg: 10, speed: 9, rad: 0.7, range: 1.8, aggro: 20, shards: 9, ai: 'flyer', status: 'paralyze', color: 0xffe0a0, disp: 'neutral' },
  /* little wild things that run from everything */
  kofi: { name: 'Kofi Galta', build: buildKofi, hp: 12, dmg: 0, speed: 8.5, rad: 0.35, range: 0, aggro: 0, shards: 1, ai: 'melee', color: 0xb8a070, disp: 'critter' },
  /* the Carpenter's straw dummies — they only stand there and take it */
  dummy: { name: 'Training dummy', build: buildDummy, hp: 30, dmg: 0, speed: 0, rad: 0.45, range: 0, aggro: 0, shards: 1, ai: 'static', color: 0xd8c098, disp: 'training' },
  dummy_far: { name: 'High dummy', build: buildDummy, hp: 30, dmg: 0, speed: 0, rad: 0.45, range: 0, aggro: 0, shards: 1, ai: 'static', color: 0xd8c098, disp: 'training', perch: 6 },
  /* friendly folk of the wilds — they only fight if you start it */
  kipsu_f: { name: 'Kipsu', build: () => buildKipsu(0.75), hp: 40, dmg: 6, speed: 9, rad: 0.5, range: 1.6, aggro: 0, windup: 0.35, recover: 0.5, lunge: 9, shards: 2, ai: 'melee', color: 0x6af0e0, disp: 'friendly' },
  punk_d: { name: 'Domestic Punk', build: () => buildPunk(false, { domestic: true }), hp: 90, dmg: 10, speed: 6, rad: 1.0, range: 2.6, aggro: 0, windup: 0.6, recover: 0.8, lunge: 8, shards: 3, ai: 'melee', color: 0xe8a85a, disp: 'friendly' },
  albali_t: { name: 'Villtur Albali', build: () => buildAlbali(true), hp: 58, dmg: 11, speed: 9.5, rad: 0.7, range: 1.8, aggro: 22, shards: 12, ai: 'flyer', status: 'poison', color: 0x9aff5a },
  vel: { name: 'Duskareth Vel', build: buildVel, hp: 190, dmg: 17, speed: 6.2, rad: 0.5, range: 2.4, aggro: 22, windup: 0.5, shards: 60, ai: 'vel', stagger: 0.35, elite: true, color: 0xb070ff },
  tyndael: { name: 'Tyndael', build: buildTyndael, hp: 55, dmg: 9, speed: 5.6, rad: 0.6, range: 1.8, aggro: 19, windup: 0.7, recover: 0.6, lunge: 7, shards: 9, ai: 'spitter', color: 0xff7a2a },
  punk_alpha: { name: 'Thornback, the Old Punk', build: () => buildPunk(false), hp: 520, dmg: 22, speed: 5.8, rad: 1.6, range: 3.6, aggro: 20, windup: 0.75, recover: 0.9, lunge: 11, shards: 160, ai: 'melee', stagger: 0.3, elite: true, color: 0xc06a20 },
  sruvorn: { name: 'Sru Vorn of the Bogs', build: buildSruVorn, hp: 1100, dmg: 26, speed: 4.6, rad: 2.6, range: 5.5, aggro: 26, shards: 220, ai: 'sruvorn', stagger: 0, miniboss: true, color: 0xb0ff4a },
};

export function createEnemies(ctx) {
  const list = [];
  const knives = [];    // { mesh, pos, delay, vel, dmg, life }
  const globs = [];     // { mesh, pos, vel, dmg, life }
  const puddles = [];   // { mesh, x, z, r, t, dps, poison }
  const D = () => ctx.D;

  function spawn(kind, x, z, group, extra = {}) {
    const T = TYPES[kind];
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
    list.forEach(e => ctx.scene.remove(e.actor.root));
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
    if (e.dead) return;
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
    if (e.hp <= 0) kill(e);
  }

  function T_isPassive(e) { return !!e.T.disp; }

  function kill(e) {
    e.dead = true; e.state = 'dead'; e.timer = 0;
    ctx.sfx.die();
    ctx.particles.burst(e.pos.x, e.pos.y + 1, e.pos.z, 30, { color: e.T.color, speed: 9, size: 0.5, life: 0.9, gravity: -6 });
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
      const T = 0.9, start = V3(e.pos.x, e.pos.y + (e.T.miniboss ? 3 : 1.2), e.pos.z);
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

  /* --------- per-frame --------- */
  function moveTo(e, wantYaw, wantV, dt) {
    e.yaw = dampAngle(e.yaw, wantYaw, 10, dt);
    const k = e.stun > 0 ? 2 : 10;
    e.vel.x = damp(e.vel.x, e.stun > 0 ? 0 : Math.sin(e.yaw) * wantV, k, dt);
    e.vel.z = damp(e.vel.z, e.stun > 0 ? 0 : Math.cos(e.yaw) * wantV, k, dt);
  }

  function updateOne(e, dt) {
    const P = ctx.P, G = ctx.G, a = e.actor, T = e.T;
    if (e.dead) {
      e.timer += dt;
      const s0 = T.ai === 'flyer' ? 1 : (e.kind === 'malsti' ? 0.5 : e.kind === 'kipsu' ? 0.55 : T.miniboss ? 1.25 : 1.0);
      a.root.scale.setScalar(Math.max(0.001, s0 * (1 - e.timer / (T.miniboss ? 2 : 0.6))));
      a.root.rotation.z += dt * (T.miniboss ? 0.5 : 6);
      if (e.timer > (T.miniboss ? 2 : 0.6)) { ctx.scene.remove(a.root); e.gone = true; }
      return;
    }
    const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz);
    const toP = Math.atan2(dx, dz);
    let wantV = 0, wantYaw = e.yaw;
    e.flash = Math.max(0, e.flash - dt * 5); a.flash(e.flash * 0.9);
    e.stun = Math.max(0, e.stun - dt);
    if (e.burn > 0) {
      e.burn -= dt; e.hp -= 6 * dt;
      if (Math.random() < 0.5) ctx.particles.emit(e.pos.x, e.pos.y + 1, e.pos.z, { vy: 2, speed: 1, color: 0xff7a2a, size: 0.4, life: 0.5 });
      if (e.hp <= 0) { kill(e); return; }
    }
    e.windup = Math.max(0, e.windup - dt * 3); e.attackA = Math.max(0, e.attackA - dt * 4);
    const playing = G.mode === 'play' && !P.dead;
    const wf = D().windup;
    const aggroR = T.aggro * D().aggro;

    if (!playing && e.state !== 'idle' && e.state !== 'return' && e.state !== 'flee') e.state = 'return';

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
      if (d > 55 || e.timer <= 0) { ctx.scene.remove(a.root); e.gone = true; e.escaped = true; ctx.onEscape(e); return; }
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

  function finishMove(e, dt, d, dx, dz) {
    const P = ctx.P, a = e.actor, T = e.T;
    if (T.ai !== 'flyer') e.vel.y -= 30 * dt;
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
    a.animate(dt, { speed: Math.hypot(e.vel.x, e.vel.z), t: ctx.G.t, windup: e.windup, attack: e.attackA, diving: e.state === 'dive', tail: e.tailT || 0, tailUp: e.windup && e.act === 'tail' ? 1 : 0, thrown: e.state === 'cast' });
  }

  /* --------- Albali: circle high, dive, then hang low and vulnerable --------- */
  function updateFlyer(e, dt, d, toP) {
    const P = ctx.P, T = e.T, G = ctx.G;
    const ground = ctx.world.heightAt(e.pos.x, e.pos.z);
    let wantAlt = 3, wantPos = null, sp = T.speed;
    if (e.stun > 0) { wantAlt = 1.2; }
    else if (e.state === 'chase') {
      e.orbit = (e.orbit ?? Math.random() * 6) + dt * 0.8;
      wantPos = V3(P.pos.x + Math.cos(e.orbit) * 8, 0, P.pos.z + Math.sin(e.orbit) * 8);
      wantAlt = 6.5;
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
      wantPos = V3(e.home.x + Math.cos(G.t * 0.4 + e.home.z) * 6, 0, e.home.z + Math.sin(G.t * 0.4 + e.home.z) * 6); wantAlt = 4;
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
    a.animate(dt, { speed: Math.hypot(e.vel.x, e.vel.z), t: ctx.G.t, diving: e.state === 'dive' });
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
