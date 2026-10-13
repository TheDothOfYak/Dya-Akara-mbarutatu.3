/* ============================================================
   THE CAVES UNDER THE LAKE — below the Carpenter's old dock.
   A shallow, moss-lit cave to learn diving in; the shell-stone
   breath Relic asleep on its floor; a root-hidden crack that goes
   down into a flooded tunnel and a vast half-drowned cavern where
   an ancient Su Naga sleeps among young sea-things; and a tunnel
   that climbs out of the water into dry caves right under the tower
   — the room that will become Tanoc's deep library.
   ============================================================ */
import * as THREE from 'three';
import { createMini, V3, toon, glowSprite, lerp, clamp } from './mini.js';
import { buildSuNaga } from './esik_sea.js';
import { smooth } from './util.js';
import * as STORY from './story.js';

/* the passages: capsules with a floor that slopes from start to end, and a height */
const PASSAGES = [
  { a: [0, 10], b: [0, -8], r: 6, f0: -3, f1: -3.5, h: 7 },          // the mouth under the dock
  { a: [0, -8], b: [0, -30], r: 16, f0: -4, f1: -5, h: 10 },         // the shallow cave
  { a: [0, -32], b: [0, -84], r: 4.2, f0: -6, f1: -17, h: 4.2 },     // the crack: flooded all the way
  { a: [0, -84], b: [0, -152], r: 34, f0: -20, f1: -42, h: 52 },     // the deep cavern
  { a: [24, -152], b: [84, -152], r: 5, f0: -14, f1: 2, h: 5.5 },    // the warm tunnel, climbing
  { a: [84, -152], b: [112, -152], r: 12, f0: 2, f1: 3, h: 9 },      // the dry caves under the tower
];
const WALL = 40;
function sample(x, z) {
  let floor = WALL, ceil = null, inside = false;
  for (const p of PASSAGES) {
    const [ax, az] = p.a, [bx, bz] = p.b, vx = bx - ax, vz = bz - az;
    const t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
    const d = Math.hypot(x - ax - vx * t, z - az - vz * t);
    if (d > p.r) continue;
    inside = true;
    const f = lerp(p.f0, p.f1, t), edge = smooth(p.r - 2.2, p.r, d);
    const fl = lerp(f, f + p.h * 0.9, edge);
    if (fl < floor) floor = fl;
    const c = f + p.h * (1 - 0.5 * edge);
    if (ceil == null || c > ceil) ceil = c;
  }
  return { floor, ceil: inside ? ceil : null };
}
const heightAt = (x, z) => sample(x, z).floor;
const ceilingAt = (x, z) => sample(x, z).ceil;
const RELIC = { x: 7, z: -24 }, ROOTS = { x: 0, z: -31.5 }, NAGA = { x: -4, z: -132 }, DRY = { x: 104, z: -152 };

export function createCaves(ctx) {
  const A = STORY.ARC.caves;
  let stage = '';
  const K = createMini(ctx, {
    seed: 909, heightAt, ceilingAt, dark: true, torch: true, torchColor: 0x9adfd0, torchRange: 16,
    fog: 0x0a1e24, fogNear: 6, fogFar: 70, waterLevel: 0, waterColor: 0x1a5a6a, hemiSky: 0x5a9a90, hemiGround: 0x101820,
    ground: { x0: -50, x1: 130, z0: -200, z1: 20, segX: 120, segZ: 150, color: (x, z, y, c) => {
      c.set(0x4a5560).lerp(new THREE.Color(0x2a3a3a), smooth(-5, -30, y));
      if (z > -34 && y < 0) c.lerp(new THREE.Color(0x3a7a50), 0.5);                       // moss in the shallow cave
      if (x > 80) c.set(0x7a6a58);                                                         // dry, warm stone under the tower
      if (y > 20) c.set(0x1c2226);
    } },
    bounds: p => { p.x = clamp(p.x, -45, 125); p.z = clamp(p.z, -195, 15); },
    tick: (dt, playing) => tick(dt, playing),
  });
  const { scene, P } = K;
  /* the roof */
  {
    const geo = new THREE.PlaneGeometry(180, 220, 120, 150); geo.rotateX(-Math.PI / 2); geo.translate(40, 0, -90);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const c = ceilingAt(pos.getX(i), pos.getZ(i)); pos.setY(i, c == null ? WALL : c); }
    geo.computeVertexNormals();
    const roof = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: 0x2a3438, side: THREE.DoubleSide })); scene.add(roof);
  }
  /* moss-light, and the warm glow up the tunnel */
  const lamps = [];
  for (let i = 0; i < 26; i++) {
    const a = K.rng() * Math.PI * 2, r = 4 + K.rng() * 12, x = Math.cos(a) * r, z = -19 + Math.sin(a) * r;
    const g = glowSprite(K.rng() < 0.5 ? 0x8affc8 : 0x6ad8ff, 1.2 + K.rng() * 1.6, 0.8); g.position.set(x, heightAt(x, z) + 0.3, z); scene.add(g); lamps.push(g);
  }
  for (const [x, y, z, c, i] of [[0, 2, -18, 0x6affc0, 1.4], [0, -30, -120, 0x3a8aff, 1.2], [60, -2, -152, 0xffb070, 1.1], [104, 7, -152, 0xffd890, 1.8]]) { const l = new THREE.PointLight(c, i, 60); l.position.set(x, y, z); scene.add(l); }
  const lampLight = glowSprite(0xffd890, 6, 0.9); lampLight.position.set(DRY.x + 3, 11.5, DRY.z); scene.add(lampLight);   // the crack up into the tower
  /* the breath Relic: a shell-stone with a stygian circle */
  const shell = new THREE.Group();
  { const s = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xd8c8b0, { emissive: 0x3a6a8a, emissiveIntensity: 0.4 })); s.scale.set(1.2, 0.5, 1); shell.add(s); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 6, 20), toon(0x2a2236, { emissive: 0x6a8aff, emissiveIntensity: 0.6 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; shell.add(ring); shell.add(glowSprite(0x6ad8ff, 2.4, 0.6)); }
  const circle = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 32), new THREE.MeshBasicMaterial({ color: 0x9adfff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
  circle.rotation.x = -Math.PI / 2; circle.position.set(RELIC.x, heightAt(RELIC.x, RELIC.z) + 0.05, RELIC.z); scene.add(circle);
  /* the root curtain over the crack */
  const roots = new THREE.Group();
  for (let i = 0; i < 14; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 6, 5), toon(0x5a4a2a)); r.position.set(-3 + i * 0.45, -4, 0); r.rotation.z = (K.rng() - 0.5) * 0.3; roots.add(r); }
  roots.position.set(ROOTS.x, 0, ROOTS.z); scene.add(roots);
  const rootWall = K.box(ROOTS.x, ROOTS.z, 4.4, 0.6, -20, 6);
  /* the ancient Su Naga, asleep in the deep, and the young things round it */
  const naga = buildSuNaga({ heads: 3 }); naga.root.scale.setScalar(2.2); naga.root.position.set(NAGA.x, heightAt(NAGA.x, NAGA.z) + 1, NAGA.z); naga.root.rotation.y = 0.8; scene.add(naga.root);
  for (let i = 0; i < 4; i++) K.addFoe('grothyn', NAGA.x + Math.cos(i * 1.6) * 14, NAGA.z + Math.sin(i * 1.6) * 12, { passive: true, scale: 0.6 });
  for (let i = 0; i < 3; i++) K.addFoe('harkal', 8 + i * 9, -110 - i * 8, { passive: true, watch: true });
  /* the sleeper's dream-light */
  const breathTrail = [];

  /* ---------------- beats ---------------- */
  let relicIt = null, rootsIt = null, saidNaga = false, saidDeep = false, saidCrack = false;
  function start() {
    stage = 'shallow';
    K.place(P, 0, 6, Math.PI, -1.15); ctx.CAM.yaw = 0; ctx.CAM.pitch = 0.15;
    K.tanoc.weapon.visible = true;
    ctx.cards(A.enter, 3200, () => {
      ctx.play(); ctx.location('Under the lake', 'the shallow cave');
      ctx.say(A.shallow, () => {
        objective('Dive to the slow circle of light on the cave floor', 'C to dive · Space to rise · come up before your breath runs out');
        K.setGoal(RELIC.x, heightAt(RELIC.x, RELIC.z), RELIC.z);
        relicIt = K.addItem(V3(RELIC.x, heightAt(RELIC.x, RELIC.z) + 0.25, RELIC.z), 'Take the shell-stone', () => takeRelic(), shell, 3.2);
      });
    });
  }
  function takeRelic() {
    K.dropItem(relicIt); scene.remove(circle); ctx.sfx.heal();
    ctx.say(A.relic, () => {
      ctx.give('r_breath', 1); ctx.toast(A.learned, 4);
      stage = 'crack'; objective('The shallow cave goes on somewhere. Look along the far wall', 'Nur’Hlyst won’t work down here — use your eyes');
      K.setGoal(ROOTS.x, heightAt(ROOTS.x, ROOTS.z) + 2, ROOTS.z);
      rootsIt = K.addItem(V3(ROOTS.x, -2.5, ROOTS.z + 1), 'Push through the roots', () => {
        K.dropItem(rootsIt); scene.remove(roots); rootWall.on = false; ctx.sfx.swing();
        stage = 'deep'; objective('Follow the crack down — the breath Relic will carry you', ''); K.setGoal(0, -18, -90);
        ctx.say(A.deep);
      }, null, 4);
    });
  }
  function tick(dt) {
    const t = K.t;
    lamps.forEach((l, i) => { l.material.opacity = 0.6 + Math.sin(t * 2 + i) * 0.25; });
    shell.rotation.y = t * 0.5;
    if (circle.parent) circle.material.opacity = 0.35 + Math.sin(t * 2) * 0.2;
    naga.animate && naga.animate(dt, { speed: 0, t: t * 0.2 });
    if (stage === 'crack' && !saidCrack && P.pos.distanceTo(V3(ROOTS.x, P.pos.y, ROOTS.z)) < 9) { saidCrack = true; ctx.bark('tale', A.crack, 4); }
    if (stage === 'shallow' && !saidDeep && P.under && P.pos.distanceTo(V3(RELIC.x, P.pos.y, RELIC.z)) < 10) { saidDeep = true; ctx.bark('tale', A.relicSpot, 4); }
    if (stage === 'deep' && !saidNaga && P.pos.z < -100) {
      saidNaga = true; stage = 'warm';
      ctx.say(A.naga, () => { objective('Follow the warm current east, and up', 'There is air above the water in the cavern'); K.setGoal(84, 2, -152); });
    }
    if (stage === 'warm' && P.pos.x > 96 && !P.swim) {
      stage = 'dry'; K.setGoal();
      ctx.say(A.dry, () => { stage = 'done'; ctx.onDone(); });
    }
    // bubbles from the boy when he's under
    if (P.under && Math.random() < 0.3) K.particles.emit(P.pos.x, P.pos.y + 1.6, P.pos.z, { vx: 0, vy: 1.6, vz: 0, color: 0xcfefff, size: 0.18, life: 1.2, drag: 0 });
  }
  function objective(text, hint = '') { ctx.objective('Under the lake', text, hint); }
  K.start = start;
  Object.defineProperty(K, 'stage', { get: () => stage });
  return K;
}
