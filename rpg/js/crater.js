/* ============================================================
   THE METEOR CRATER — the new Aagac.
   Three days east with the Carpenter, both of them wary: the
   Duskareth saw Tanoc's hat. A crater with True Raw stygian at its
   heart; library researchers planting Stryx on the near rim, and
   Duskareth scouts on the far one. Stryx seedlings; the rune
   rubbing; the linking lesson; the tent, and what Tanoc only ever
   remembers in dreams; a new hat; and a song by the fire.
   ============================================================ */
import * as THREE from 'three';
import { createMini, forest, V3, toon, addOutline, glowSprite, lerp, clamp } from './mini.js';
import { buildEikar } from './actors.js';
import { buildStryx } from './esik_land.js';
import { smooth } from './util.js';
import * as STORY from './story.js';

const C = { x: 0, z: -40 }, RIM = 46;
function heightAt(x, z) {
  const d = Math.hypot(x - C.x, z - C.z);
  const bowl = d < RIM ? lerp(-12, 10, Math.pow(d / RIM, 2)) : lerp(10, 2, smooth(RIM, RIM + 50, d));
  return bowl + Math.sin(x * 0.07) * Math.cos(z * 0.06) * 1.2;
}
const CAMP = { x: 8, z: 22 }, TENT = { x: 44, z: -22 }, SCOUTS = { x: -6, z: -98 };

export function createCrater(ctx) {
  const A = STORY.ARC.crater;
  let stage = '';
  const K = createMini(ctx, {
    seed: 3141, heightAt, fog: 0xd8c8b8, fogNear: 60, fogFar: 380, skyTop: 0x5a7ab8, skyLow: 0xf0d8c0,
    ground: { x0: -120, x1: 120, z0: -160, z1: 90, segX: 120, segZ: 125, color: (x, z, y, c) => {
      const d = Math.hypot(x - C.x, z - C.z);
      c.set(0x8a7a62).lerp(new THREE.Color(0x3a2a3a), smooth(RIM * 0.7, RIM * 0.25, d));
      if (d > RIM + 6) c.lerp(new THREE.Color(0x8a9a5a), smooth(RIM + 6, RIM + 30, d));
    } },
    bounds: p => { p.x = clamp(p.x, -110, 110); p.z = clamp(p.z, -150, 80); },
    tick: (dt, playing) => tick(dt, playing),
  });
  const { scene, P } = K;
  /* True Raw at the heart: black-violet stone that drinks the light */
  const raw = new THREE.Group();
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(1.5 + K.rng() * 2.5, 0), toon(0x1a1222, { emissive: 0x4a1a8a, emissiveIntensity: 0.6 })); m.position.set((K.rng() - 0.5) * 12, -10 + K.rng() * 2, C.z + (K.rng() - 0.5) * 12); m.rotation.set(K.rng() * 3, K.rng() * 3, 0); addOutline(m, 0.05); raw.add(m); }
  { const rg = glowSprite(0x8a4aff, 40, 0.35); rg.position.set(0, -6, C.z); raw.add(rg); }
  scene.add(raw);
  forest(K, Array.from({ length: 160 }, () => { const a = K.rng() * Math.PI * 2, r = RIM + 22 + K.rng() * 60; return [C.x + Math.cos(a) * r, C.z + Math.sin(a) * r, 0.8 + K.rng(), K.rng() < 0.5]; }).filter(([x, z]) => Math.hypot(x - CAMP.x, z - CAMP.z) > 18 && Math.hypot(x - TENT.x, z - TENT.z) > 12));
  /* the researchers' camp, with Stryx planted near the edge */
  const tent = (x, z, col, r = 3) => { const g = heightAt(x, z); const m = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.2, 6, 1, true), toon(col, { side: THREE.DoubleSide })); m.position.set(x, g + r * 0.6, z); m.castShadow = true; addOutline(m, 0.04); scene.add(m); K.cyl(x, z, r * 0.8, g - 1, g + r); return m; };
  tent(CAMP.x - 6, CAMP.z + 4, 0x2f6f8a); tent(CAMP.x + 6, CAMP.z + 6, 0xd9a441); tent(CAMP.x, CAMP.z + 12, 0x5a8a3a);
  for (let i = 0; i < 3; i++) { const s = buildStryx({ seed: i + 2 }); s.root.scale.setScalar(0.35); const x = CAMP.x - 10 + i * 6, z = CAMP.z - 12; s.root.position.set(x, heightAt(x, z), z); scene.add(s.root); }
  const opTent = tent(TENT.x, TENT.z, 0xe8dcc0, 3.4);
  const fire = glowSprite(0xff8a3a, 2.6, 0); fire.position.set(CAMP.x + 14, heightAt(CAMP.x + 14, CAMP.z - 2) + 0.7, CAMP.z - 2); scene.add(fire);
  const fireLight = new THREE.PointLight(0xff8a3a, 0, 18); fireLight.position.copy(fire.position).add(V3(0, 0.8, 0)); scene.add(fireLight);
  /* the cast */
  const buhkon = K.addFriend(K.buildBuhkon(), { side: 2, dist: 2.2 });
  const ilse = buildEikar({ skin: '#c8a070', cap: '#2a4a3a', tunic: 0x3a6a5a, trim: 0xd8e0c0, weapon: 'none', flasks: false, satchel: 0xd8c8a0, scale: 0.98 });
  ilse.root.position.set(CAMP.x, heightAt(CAMP.x, CAMP.z), CAMP.z); scene.add(ilse.root);
  for (let i = 0; i < 3; i++) K.addFoe('vel', SCOUTS.x + (i - 1) * 10, SCOUTS.z, { passive: true, still: true, watch: true, immune: true });

  function objective(text, hint = '') { ctx.objective('The meteor crater', text, hint); }
  function start() {
    stage = 'arrive'; K.tanoc.weapon.visible = true;
    K.place(P, CAMP.x + 30, CAMP.z + 45, Math.PI); K.place(buhkon, CAMP.x + 32, CAMP.z + 47, Math.PI); ctx.CAM.yaw = 0.4; ctx.CAM.pitch = 0.22;
    ctx.cards(A.cards, 3400, () => {
      ctx.play(); ctx.location('The meteor crater', 'True Raw, three days east');
      objective('Down to the researchers’ camp on the near rim', 'Stay close to the Carpenter'); K.setGoal(CAMP.x, heightAt(CAMP.x, CAMP.z), CAMP.z);
    });
  }
  function meet() {
    stage = 'camp'; K.setGoal();
    ctx.say(A.researchers, () => {
      ctx.give('stryx_seedling', 3); ctx.give('stryx_dormant', 1); ctx.toast('Three Stryx seedlings, and a bag of sleepers', 3);
      ctx.bark('tale', A.scouts, 5);
      const rub = ctx.flagged('rune') ? A.rubbing : [];
      ctx.say(rub.concat(A.linkLesson), () => { ctx.flag('linkLesson', true); stage = 'tent'; objective('To the tent by the crater’s edge', 'Close enough to True Raw that the stygian stays soft'); K.setGoal(TENT.x, heightAt(TENT.x, TENT.z), TENT.z);
        K.addItem(V3(TENT.x - 3.2, heightAt(TENT.x - 3.2, TENT.z + 2), TENT.z + 2), 'Go into the tent', () => operation(), null, 3.4);
      });
    });
  }
  function operation() {
    stage = 'op'; for (const it of K.items.slice()) K.dropItem(it); K.setGoal();
    K.place(P, TENT.x - 1, TENT.z + 1, 0); buhkon.stay = V3(TENT.x + 1, 0, TENT.z - 1);
    ctx.say(A.tent, () => {
      ctx.blur(8); K.tanoc.hat.visible = false;
      ctx.cards(A.dream, 3200, () => {
        ctx.blur(0); K.tanoc.hat.visible = true;
        ctx.flag('newHat', true);
        ctx.say(A.after, () => {
          ctx.give('old_hat', 1);
          stage = 'song';
          K.setSky({ top: 0x2a2050, low: 0xff9a70, dim: 0.4, sunI: 1.0, hemiI: 0.6, fog: 0xa07a6a });
          fire.material.opacity = 0.95; fireLight.intensity = 1.8;
          K.place(P, fire.position.x - 2, fire.position.z + 1, Math.PI / 2); buhkon.stay = V3(fire.position.x + 2, 0, fire.position.z - 1);
          ctx.cards(['That night, on the way home.'], 2600, () => { ctx.play(); ctx.say(A.song, () => { stage = 'done'; ctx.onDone(); }); });
        });
      });
    });
  }
  function tick(dt, playing) {
    raw.children.forEach((m, i) => { if (m.isMesh) m.rotation.y += dt * 0.1 * (i % 2 ? 1 : -1); });
    ilse.animate(dt, { speed: 0, onGround: true, t: K.t, talking: stage === 'camp' });
    ilse.root.rotation.y = Math.atan2(P.pos.x - ilse.root.position.x, P.pos.z - ilse.root.position.z);
    if (!playing) return;
    if (stage === 'arrive' && P.pos.distanceTo(V3(CAMP.x, P.pos.y, CAMP.z)) < 7) meet();
    // the Carpenter never lets you wander toward the scouts — without ever seeming to
    if ((stage === 'camp' || stage === 'tent') && Math.hypot(P.pos.x - SCOUTS.x, P.pos.z - SCOUTS.z) < 60 && (K.t - (tick.warnT || -9)) > 5) { tick.warnT = K.t; ctx.bark('buhkon', 'This way, Tanoc. The light’s better over here.', 3); P.vel.z += 6; }
  }
  K.start = start;
  Object.defineProperty(K, 'stage', { get: () => stage });
  return K;
}
