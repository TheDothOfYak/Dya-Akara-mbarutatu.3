/* ============================================================
   THE MEGLA AAGAC — the Ring quest.
   North up the river pass to a clearing at the edge of a forest of
   dark trees in fog that never lifts. A night camp full of sounds.
   In on foot; the Punk bolts; alone. A stunned beast's drag trail,
   the Rodak's line, ancient ruins and a purple Relic in the wall —
   and the Gynge. A night in the ruins. Then Velki crosses the sun,
   the screaming, the Duskareth hideout, the fight Tanoc cannot win,
   the Sniller half out of its amulet, the Ver master, the ring, the
   one request — and the keep that becomes his.
   ============================================================ */
import * as THREE from 'three';
import { createMini, forest, V3, toon, addOutline, glowSprite, lerp, clamp } from './mini.js';
import { smooth } from './util.js';
import { buildSniller } from './velki.js';
import { buildMeglaAagac } from './esik_sea.js';
import * as STORY from './story.js';

const CLEAR_Z = -280, FOREST_Z = -305, RUINS = { x: -12, z: -430 }, KEEP = { x: 0, z: -585 }, KEEP_HW = 16, END = -640;
const roadX = z => (z > -20 ? 0 : 10 * Math.sin(-z * 0.012) + 5 * Math.sin(-z * 0.031));
const RIVER = z => roadX(z) + 16;
function heightAt(x, z) {
  const lat = Math.abs(x - roadX(z));
  let base = z > CLEAR_Z ? lerp(0, 22, smooth(0, CLEAR_Z, z)) : 22 + Math.sin(z * 0.02) * 1.5;
  if (Math.abs(x - KEEP.x) < KEEP_HW + 6 && Math.abs(z - KEEP.z) < KEEP_HW + 6) base = 22;          // the keep's yard is level
  let h = base + smooth(18, 70, lat) * (z > CLEAR_Z ? 55 : 14) + (Math.sin(x * 0.11) * Math.cos(z * 0.09)) * 0.6 * smooth(4, 10, lat);
  if (z > CLEAR_Z + 10) { const dr = Math.abs(x - RIVER(z)); if (dr < 7) h = Math.min(h, lerp(base - 3, h, smooth(3, 7, dr))); }   // the river
  return h;
}

export function createMegla(ctx) {
  const A = STORY.ARC.megla;
  let stage = '', sub = '';
  const K = createMini(ctx, {
    seed: 4422, heightAt, fog: 0xc8d0d0, fogNear: 30, fogFar: 260, skyTop: 0x8aa0b0, skyLow: 0xd8dcd8, waterLevel: undefined,
    ground: { x0: -130, x1: 130, z0: END - 20, z1: 30, segX: 104, segZ: 270, color: (x, z, y, c) => {
      const lat = Math.abs(x - roadX(z));
      c.set(z > CLEAR_Z ? 0x7a9a5a : 0x3e5a3a);
      if (z > CLEAR_Z + 10 && Math.abs(x - RIVER(z)) < 6) c.set(0x5a7a8a);
      c.lerp(new THREE.Color(0x8a826a), smooth(30, 70, y - 10) * 0.6);
      c.lerp(new THREE.Color(0x9a8a6a), smooth(3.5, 1.5, lat) * 0.7);
      if (Math.abs(x - KEEP.x) < KEEP_HW && Math.abs(z - KEEP.z) < KEEP_HW) c.set(0x6a6258);
    } },
    bounds: p => { const rx = roadX(p.z), lim = p.z > CLEAR_Z ? 22 : 60; if (Math.abs(p.x - rx) > lim) p.x = rx + Math.sign(p.x - rx) * lim; p.z = clamp(p.z, END + 5, 25); },
    onDown: () => down(),
    tick: (dt, playing) => tick(dt, playing),
  });
  const { scene, P } = K;
  /* the river */
  { const pts = []; for (let z = 25; z > CLEAR_Z + 10; z -= 4) pts.push(V3(RIVER(z), 19, z)); const wm = toon(0x4a8aa8, { emissive: 0x0e3a52, emissiveIntensity: 0.3 });
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const seg = new THREE.Mesh(new THREE.PlaneGeometry(9, a.distanceTo(b) + 0.4), wm); seg.rotation.x = -Math.PI / 2; seg.rotation.z = -Math.atan2(b.x - a.x, a.z - b.z); seg.position.set((a.x + b.x) / 2, heightAt((a.x + b.x) / 2, (a.z + b.z) / 2) + 1.2, (a.z + b.z) / 2); scene.add(seg); } }
  /* the forest: pines along the pass, then the Megla Aagac's dark trees in the fog */
  {
    const list = [];
    for (let i = 0; i < 2200; i++) {
      const z = 20 - K.rng() * (20 - END), rx = roadX(z), side = K.rng() < 0.5 ? -1 : 1, lat = 6 + Math.pow(K.rng(), 0.8) * 58, x = rx + side * lat;
      if (z > CLEAR_Z && K.rng() > 0.25) continue;
      if (z < CLEAR_Z + 6 && z > FOREST_Z - 4) continue;                 // the clearing
      if (Math.hypot(x - RUINS.x, z - RUINS.z) < 22) continue;
      if (Math.abs(x - KEEP.x) < KEEP_HW + 10 && Math.abs(z - KEEP.z) < KEEP_HW + 10) continue;
      if (z > CLEAR_Z && Math.abs(x - RIVER(z)) < 7) continue;
      list.push([x, z, 0.9 + K.rng() * 1.2, true]);
    }
    forest(K, list, { pine: 0x1e3424, bark: 0x2a2018 });
    // the great dark trees themselves, standing in the fog past the clearing
    for (let i = 0; i < 9; i++) {
      const z = FOREST_Z - 20 - i * 34, x = roadX(z) + (i % 2 ? 30 : -30) + (K.rng() - 0.5) * 10;
      const t = buildMeglaAagac({ seed: i + 3 }); t.root.scale.setScalar(1.6 + K.rng()); t.root.position.set(x, heightAt(x, z) - 0.5, z); scene.add(t.root);
      K.cyl(x, z, 3, heightAt(x, z) - 2, heightAt(x, z) + 30);
    }
  }
  /* the clearing camp */
  const CAMP = { x: roadX(CLEAR_Z - 4) - 6, z: CLEAR_Z - 4 };
  const campFire = glowSprite(0xff8a3a, 2.6, 0); campFire.position.set(CAMP.x, heightAt(CAMP.x, CAMP.z) + 0.7, CAMP.z); scene.add(campFire);
  const campLight = new THREE.PointLight(0xff8a3a, 0, 20); campLight.position.set(CAMP.x, heightAt(CAMP.x, CAMP.z) + 1.4, CAMP.z); scene.add(campLight);
  /* the ruins and the wall Relic */
  const WALLR = { x: RUINS.x, z: RUINS.z - 10 };
  {
    const sm = toon(0x8a8478), dm = toon(0x5a564e);
    for (let i = 0; i < 26; i++) {
      const a = K.rng() * Math.PI * 2, r = 6 + K.rng() * 12, x = RUINS.x + Math.cos(a) * r, z = RUINS.z + Math.sin(a) * r, g = heightAt(x, z);
      const ruin = smooth(2, 18, Math.hypot(x - WALLR.x, z - WALLR.z));     // further from the Relic, more ruined
      const h = lerp(4, 0.8, ruin) * (0.7 + K.rng() * 0.6), w = 1.5 + K.rng() * 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1), K.rng() < 0.5 ? sm : dm); b.position.set(x, g + h / 2, z); b.rotation.set((K.rng() - 0.5) * ruin * 0.6, K.rng() * 3, (K.rng() - 0.5) * ruin * 0.6); b.castShadow = true; addOutline(b, 0.04); scene.add(b);
      K.box(x, z, w / 2, 0.6, g - 1, g + h);
    }
    const g = heightAt(WALLR.x, WALLR.z);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 1.2), toon(0xb0a898)); wall.position.set(WALLR.x, g + 2.5, WALLR.z); wall.castShadow = true; addOutline(wall, 0.05); scene.add(wall);
    K.box(WALLR.x, WALLR.z, 4.5, 0.6, g - 1, g + 5);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), toon(0x8a3aff, { emissive: 0xb06aff, emissiveIntensity: 1 })); gem.position.set(WALLR.x, g + 2.6, WALLR.z + 0.62); scene.add(gem);
    const glow = glowSprite(0xb06aff, 5, 0.7); glow.position.copy(gem.position); scene.add(glow);
  }
  /* the Duskareth hideout: four walls, a courtyard, watchtower trees, and a little church in the north wall */
  const TOWERS = [[-KEEP_HW - 5, KEEP_HW - 2], [KEEP_HW + 5, KEEP_HW - 2]].map(([dx, dz]) => ({ x: KEEP.x + dx, z: KEEP.z + dz }));
  const keepMats = [];
  let gateWall = null;
  {
    const g = heightAt(KEEP.x, KEEP.z), wm = toon(0x3a3444); keepMats.push(wm);
    const wall = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 6, d), wm); m.position.set(x, g + 3, z); m.castShadow = true; addOutline(m, 0.05); scene.add(m); return K.box(x, z, w / 2, d / 2, g - 1, g + 6); };
    wall(KEEP.x, KEEP.z - KEEP_HW, KEEP_HW * 2, 1.2);                       // north
    wall(KEEP.x - KEEP_HW, KEEP.z, 1.2, KEEP_HW * 2); wall(KEEP.x + KEEP_HW, KEEP.z, 1.2, KEEP_HW * 2);
    wall(KEEP.x - KEEP_HW / 2 - 2.5, KEEP.z + KEEP_HW, KEEP_HW - 5, 1.2); wall(KEEP.x + KEEP_HW / 2 + 2.5, KEEP.z + KEEP_HW, KEEP_HW - 5, 1.2);
    // the gate: barred
    const gm = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.6), toon(0x2a1e18)); gm.position.set(KEEP.x, g + 2.5, KEEP.z + KEEP_HW); scene.add(gm);
    gateWall = { mesh: gm, col: K.box(KEEP.x, KEEP.z + KEEP_HW, 5, 0.4, g - 1, g + 5) };
    // the little church in the north wall
    const ch = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 6), toon(0x4a4054)); ch.position.set(KEEP.x, g + 2.5, KEEP.z - KEEP_HW + 3.6); addOutline(ch, 0.05); scene.add(ch); keepMats.push(ch.material);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 3, 4), toon(0x2a2236)); roof.rotation.y = Math.PI / 4; roof.position.set(KEEP.x, g + 6.5, KEEP.z - KEEP_HW + 3.6); scene.add(roof);
    K.box(KEEP.x - 3.4, KEEP.z - KEEP_HW + 3.6, 0.6, 3, g - 1, g + 5); K.box(KEEP.x + 3.4, KEEP.z - KEEP_HW + 3.6, 0.6, 3, g - 1, g + 5); K.box(KEEP.x, KEEP.z - KEEP_HW + 1, 4, 0.5, g - 1, g + 5);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), new THREE.MeshBasicMaterial({ color: 0x0a0812 })); door.position.set(KEEP.x, g + 1.6, KEEP.z - KEEP_HW + 6.62); scene.add(door);
    // watchtower trees outside the south wall, with a stair of boughs and a platform
    for (const T of TOWERS) {
      const tg = heightAt(T.x, T.z);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 14, 8), toon(0x2a2018)); trunk.position.set(T.x, tg + 7, T.z); scene.add(trunk); K.cyl(T.x, T.z, 0.9, tg - 1, tg + 14);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(4, 8, 8), toon(0x1e3424)); crown.position.set(T.x, tg + 15, T.z); scene.add(crown);
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.3, 10), toon(0x5a4030)); plat.position.set(T.x, tg + 8, T.z); scene.add(plat); K.cyl(T.x, T.z, 2.6, tg + 7.7, tg + 8.15);
      for (let k = 0; k < 13; k++) { const a = k * 0.55, bx = T.x + Math.cos(a) * 1.8, bz = T.z + Math.sin(a) * 1.8, top = tg + 0.6 * (k + 1); const st = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 1.1), toon(0x5a4030)); st.position.set(bx, top - 0.12, bz); scene.add(st); K.box(bx, bz, 0.55, 0.55, top - 0.3, top); }
      T.top = tg + 8.15;
    }
  }
  /* mist, everywhere past the clearing */
  const mist = [];
  for (let i = 0; i < 70; i++) { const z = CLEAR_Z - K.rng() * (CLEAR_Z - END), x = roadX(z) + (K.rng() - 0.5) * 80, m = glowSprite(0xe8eeee, 18 + K.rng() * 18, 0.18); m.material.blending = THREE.NormalBlending; m.position.set(x, heightAt(x, z) + 3 + K.rng() * 6, z); scene.add(m); mist.push(m); }

  /* ---------------- the cast ---------------- */
  const punk = K.addFriend(K.buildPunk(0.55 + (ctx.age || 0) * 0.06), { side: -2, dist: 2.4, speed: 11, fight: true, dmg: 10 });
  const sniller = buildSniller(3.2); sniller.visible = false; scene.add(sniller);
  let gynge = null, watchers = [], guards = [], ver = null, malsti = null;

  /* ---------------- beats ---------------- */
  function objective(text, hint = '', pips = 0, on = 0) { ctx.objective('The Megla Aagac', text, hint, pips, on); }
  function start(at) {
    K.tanoc.weapon.visible = true;
    if (at === 'ruins') return startRuins();
    if (at === 'day2') return startDay2();
    stage = 'pass';
    K.place(P, roadX(10), 10, Math.PI); K.place(punk, roadX(12) - 2, 12, Math.PI); ctx.CAM.yaw = 0; ctx.CAM.pitch = 0.2;
    K.setSky({ fogNear: 60, fogFar: 320 });
    ctx.cards(A.cards, 3400, () => {
      ctx.play(); ctx.location('The river pass', 'north, toward the Megla Aagac');
      objective('Follow the river north through the pass', 'Your Punk keeps pace'); K.setGoal(CAMP.x, heightAt(CAMP.x, CAMP.z), CAMP.z);
    });
  }
  function startCamp() {
    stage = 'clearing'; K.setGoal(); ctx.save('clearing');
    for (let i = 0; i < 5; i++) { const x = roadX(FOREST_Z) + (i - 2) * 9, z = FOREST_Z + 4; watchers.push(K.addFoe('rodak', x, z, { passive: true, watch: true })); }
    ctx.say(A.clearing.concat(A.rodak), () => {
      K.setSky({ top: 0x1a1830, low: 0x5a4a5a, dim: 0.6, sunI: 0.5, hemiI: 0.45, fog: 0x3a3a48, fogNear: 20, fogFar: 160 });
      campFire.material.opacity = 0.95; campLight.intensity = 1.8;
      K.place(P, CAMP.x + 2, CAMP.z + 1.5, -Math.PI / 2); punk.stay = V3(CAMP.x - 2, 0, CAMP.z + 1);
      ctx.say(A.night.slice(0, 1), () => { ctx.sfx.roar(); setTimeout(() => ctx.sfx.blink(), 900); ctx.say(A.night.slice(1), () => {
        ctx.cards(['…', 'Morning.'], 2400, () => { morning(); });
      }); });
    });
  }
  function morning() {
    stage = 'enter'; campFire.material.opacity = 0; campLight.intensity = 0; punk.stay = null;
    K.setSky({ top: 0x8aa0b0, low: 0xd8dcd8, dim: 0, sunI: 1.4, hemiI: 0.9, fog: 0xc8d0d0, fogNear: 12, fogFar: 110 });
    for (const w of watchers) { w.dead = true; scene.remove(w.a.root); } watchers = [];
    ctx.play();
    ctx.say(A.morning, () => { objective('Into the Megla Aagac', 'The mist gets thicker the further you go'); ctx.blur(1.5); });
  }
  function thud() {
    stage = 'alone'; K.shake(0.8); ctx.sfx.slam();
    ctx.say(A.thud, () => {
      punk.stay = V3(CAMP.x, 0, CAMP.z + 3); punk.speed = 16; ctx.blur(2);
      const tz = P.pos.z - 30;
      for (let i = 0; i < 12; i++) { const z = tz - i * 4, x = roadX(z) + Math.sin(i) * 2; const d = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.4), new THREE.MeshBasicMaterial({ color: 0x2a2018, transparent: true, opacity: 0.6, depthWrite: false })); d.rotation.x = -Math.PI / 2; d.position.set(x, heightAt(x, z) + 0.05, z); scene.add(d); }
      objective('Find where the thud came from', ''); K.setGoal(roadX(tz), heightAt(roadX(tz), tz), tz);
      sub = 'drag'; dragZ = tz;
    });
  }
  let dragZ = 0;
  function startRuins() {
    stage = 'ruins'; ctx.save('ruins'); K.setGoal();
    if (P.pos.z > RUINS.z + 30) K.place(P, roadX(RUINS.z + 22), RUINS.z + 22, Math.PI);
    ctx.play();
    ctx.say(A.ruins, () => {
      objective('Explore the ruins — and the purple light in the wall', 'Gather what you find');
      for (let i = 0; i < 3; i++) { const a = i * 2.1, x = RUINS.x + Math.cos(a) * 9, z = RUINS.z + Math.sin(a) * 7; const ore = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), toon(0xffd27a, { emissive: 0xa07a2a, emissiveIntensity: 0.6 })); const it = K.addItem(V3(x, heightAt(x, z) + 0.4, z), 'Gather the stygian ore', () => { K.dropItem(it); ctx.give('ore', 1); }, ore); }
      wallIt = K.addItem(V3(WALLR.x, heightAt(WALLR.x, WALLR.z), WALLR.z + 1.4), 'Look at the purple Relic', () => { if (!gyngeDone) startGynge(); else runeBeat(); }, null, 3.4);
      ctx.bark('tale', A.wallRelic, 5);
    });
  }
  let wallIt = null, gyngeDone = false;
  function startGynge() {
    if (gynge) return;
    stage = 'gynge'; K.shake(1.2); ctx.sfx.slam(); ctx.sfx.roar();
    const gx = P.pos.x + 2, gz = P.pos.z + 5;
    gynge = K.addFoe('gynge', gx, gz, { hp: 300, sink: -1.6, heavy: true, wind: 0.9, rate: 2.2, mouth: true, scale: 1.1 });
    gynge.phase = 1;
    gynge.onHit = (f, dmg, o) => {
      if (f.phase === 1 && o.axe) { f.hp += dmg; ctx.bark('tanoc', 'Rock! The hatchet just bounces off — the mouth, the fire-stone, the mouth!', 3); }
      if (f.phase === 1 && o.fire && ctx.hasLongevity && ctx.hasLongevity()) f.hp -= dmg * 0.5;   // the second Relic lends the throw its strength
      if (f.phase === 2 && o.axe && f.state !== 'recover') { f.hp += dmg * 0.7; }
      if (f.phase === 1 && f.hp < f.max * 0.5) { f.phase = 2; f.sink = 0; f.rate = 1.6; ctx.say(A.gyngeUp); }
    };
    gynge.onDeath = () => { gyngeDone = true; ctx.give('gynge_chip', 1); ctx.say(A.gyngeDown, () => { stage = 'ruins'; objective('The purple Relic in the wall', ''); }); };
    for (let i = 0; i < 30; i++) K.particles.emit(gx, heightAt(gx, gz), gz, { vx: (Math.random() - 0.5) * 8, vy: 6 + Math.random() * 6, vz: (Math.random() - 0.5) * 8, color: 0x8a8070, size: 0.6, life: 1.2, gravity: 14 });
    ctx.say(A.gynge, () => { objective('Bring down the Gynge', A.gyngeHint); });
  }
  function runeBeat() {
    K.dropItem(wallIt);
    ctx.say(A.rune, () => {
      ctx.flag('rune', true);
      campFire.position.set(RUINS.x, heightAt(RUINS.x, RUINS.z) + 0.7, RUINS.z); campLight.position.set(RUINS.x, heightAt(RUINS.x, RUINS.z) + 1.4, RUINS.z);
      K.setSky({ top: 0x1a1830, low: 0x5a4a5a, dim: 0.6, sunI: 0.5, hemiI: 0.45, fog: 0x3a3a48, fogNear: 14, fogFar: 120 });
      campFire.material.opacity = 0.95; campLight.intensity = 1.8;
      K.place(P, RUINS.x + 2, RUINS.z + 1, -Math.PI / 2);
      ctx.say(A.campRuins, () => { ctx.save('day2'); ctx.cards(A.day2, 3200, () => startDay2()); });
    });
  }
  function startDay2() {
    stage = 'day2'; campFire.material.opacity = 0; campLight.intensity = 0; gyngeDone = true;
    K.setSky({ top: 0x8aa0b0, low: 0xd8dcd8, dim: 0, sunI: 1.4, hemiI: 0.9, fog: 0xc8d0d0, fogNear: 12, fogFar: 110 });
    if (P.pos.z > RUINS.z) K.place(P, RUINS.x + 2, RUINS.z - 4, Math.PI);
    ctx.play();
    for (let i = 0; i < 3; i++) { const z = RUINS.z - 40 - i * 22, x = roadX(z) + (i % 2 ? 12 : -12); K.addFoe(i === 1 ? 'wildpunk' : 'rodak', x, z); }
    for (let i = 0; i < 3; i++) { const z = RUINS.z - 30 - i * 25, x = roadX(z) + (i % 2 ? -8 : 8); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), toon(0x6a8a4a)); const it = K.addItem(V3(x, heightAt(x, z) + 0.3, z), 'Gather the moss', () => { K.dropItem(it); ctx.give('moss', 1); }, m); }
    objective('Deeper into the Megla Aagac', 'Smaller fights — and things worth gathering');
  }
  function eclipse() {
    stage = 'eclipse';
    K.setSky({ top: 0x1a1a2a, low: 0x4a4a58, dim: 0.75, sunI: 0.3, hemiI: 0.4, fog: 0x2a2a34, fogNear: 10, fogFar: 90 });
    ctx.sfx.roar();
    ctx.say(A.eclipse, () => { objective('Toward the screaming', ''); K.setGoal(KEEP.x, heightAt(KEEP.x, KEEP.z), KEEP.z + KEEP_HW + 10); });
  }
  function atHideout() {
    stage = 'hideout'; K.setGoal(TOWERS[0].x, TOWERS[0].top, TOWERS[0].z);
    ctx.say(A.hideout, () => {
      objective(A.climb, 'The bough-stair winds up the tree');
      for (const T of TOWERS) { const w = K.addFoe('vel', T.x, T.z, { passive: true, float: true, still: true, watch: true }); w.pos.y = T.top; w.a.root.position.copy(w.pos); T.w = w; }
      for (const T of TOWERS) T.it = K.addItem(V3(T.x, T.top, T.z), 'Knock out the watcher', () => knockWatcher(T), null, 3.2);
    });
  }
  function knockWatcher(T) {
    for (const U of TOWERS) { if (U.it) K.dropItem(U.it); U.it = null; }
    T.w.a.root.rotation.z = Math.PI / 2; T.w.dead = true; ctx.sfx.hit();
    stage = 'caught'; K.setGoal();
    ctx.say(A.caught, () => {
      K.place(P, KEEP.x, KEEP.z + 4, Math.PI);
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; guards.push(K.addFoe('vel', KEEP.x + Math.cos(a) * 9, KEEP.z + 4 + Math.sin(a) * 7, { hp: 9999, dmg: 18, rate: 0.9 })); }
      stage = 'courtyard'; objective('Fight', 'There are so many of them');
    });
  }
  function down() {
    if (stage !== 'courtyard') { P.hp = 60; P.iframes = 1.5; ctx.toast('You drag yourself up. “Again.”', 3); return; }
    stage = 'released'; P.hp = 1; ctx.blur(5);
    ctx.say(A.down.concat(A.help), () => {
      sniller.visible = true; sniller.position.set(KEEP.x, heightAt(KEEP.x, KEEP.z) + 2, KEEP.z - 2); ctx.sfx.duat(); K.shake(1);
      K.particles.burst(KEEP.x, heightAt(KEEP.x, KEEP.z) + 8, KEEP.z - 2, 90, { color: 0x6af0e0, speed: 18, size: 1.2, life: 1.2 });
      for (const g of guards) { g.passive = true; g.state = 'idle'; g.a.root.rotation.z = Math.PI / 2; g.immune = true; g.tick = () => true; g.vel.set(0, 0, 0); }
      ctx.say(A.release, () => {
        P.hp = 100; ctx.blur(0); ctx.sfx.heal();
        stage = 'church'; objective('Search the keep — the little church in the north wall', ''); K.setGoal(KEEP.x, heightAt(KEEP.x, KEEP.z), KEEP.z - KEEP_HW + 7);
      });
    });
  }
  function inChurch() {
    stage = 'ver'; K.setGoal();
    ver = K.addFoe('vel', KEEP.x, KEEP.z - KEEP_HW + 3.4, { passive: true, watch: true, still: true, immune: true });
    ctx.say(A.ver.slice(0, 1), () => {
      K.particles.burst(ver.pos.x, ver.pos.y + 1.2, ver.pos.z, 30, { color: 0xb070ff, speed: 5, size: 0.4, life: 0.8 }); ctx.sfx.duat();
      ctx.say(A.ver.slice(1, 3), () => {
        ver.dead = true; scene.remove(ver.a.root);
        malsti = K.addFoe('malsti', KEEP.x, KEEP.z - KEEP_HW + 3.6, { passive: true, watch: true, still: true, immune: true });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 16), toon(0xffd27a, { emissive: 0xa07a2a, emissiveIntensity: 0.8 })); ring.rotation.x = Math.PI / 2;
        K.particles.burst(malsti.pos.x, malsti.pos.y + 0.6, malsti.pos.z, 30, { color: 0xc890ff, speed: 4, size: 0.4, life: 0.8 });
        ctx.say(A.ver.slice(3), () => {
          const ringIt = K.addItem(V3(malsti.pos.x, malsti.pos.y + 0.9, malsti.pos.z + 0.6), 'Take the ring from its stem', () => {
            K.dropItem(ringIt);
            ctx.say(A.ring, () => ctx.say(A.request, () => cleanse()));
          }, ring, 3.2);
          objective('The ring, on the little Punk’s stem', '');
        });
      });
    });
  }
  function cleanse() {
    ctx.give('relic_ring', 1); ctx.toast(A.ringNote, 4); ctx.sfx.victory();
    for (const m of keepMats) m.color.set(0xb8b0a0);
    K.setSky({ top: 0x6a9ad8, low: 0xd8e4ec, dim: 0, sunI: 1.8, hemiI: 1.0, fog: 0xc8d0d0, fogNear: 40, fogFar: 260 });
    for (const m of mist) if (Math.abs(m.position.x - KEEP.x) < 30 && Math.abs(m.position.z - KEEP.z) < 30) m.visible = false;
    sniller.visible = false; for (const g of guards) { g.dead = true; scene.remove(g.a.root); }
    gateWall.col.on = false; scene.remove(gateWall.mesh);
    ctx.flag('keep', true);
    ctx.cards(A.malstiNight.map(l => l[1]).concat(['Morning.']), 3600, () => {
      ctx.say(A.out, () => ctx.askName('NAME YOUR MALSTI PUNK', 'Vesper', name => { ctx.flag('malstiName', name); stage = 'done'; ctx.onDone(); }));
    });
  }
  function tick(dt, playing) {
    const t = K.t;
    sniller.visible && sniller.userData.tick(t);
    for (const m of mist) m.position.x += Math.sin(t * 0.1 + m.position.z) * dt * 0.4;
    if (!playing) return;
    // the mist thickens as you go in
    if (stage === 'enter' || stage === 'alone' || stage === 'ruins' || stage === 'day2') { const k = smooth(FOREST_Z, RUINS.z, P.pos.z); K.fog.near = lerp(16, 6, k); K.fog.far = lerp(120, 60, k); }
    if (stage === 'pass' && P.pos.z < CLEAR_Z + 8) startCamp();
    if (stage === 'enter' && P.pos.z < FOREST_Z - 30) thud();
    if (stage === 'alone' && sub === 'drag' && P.pos.z < dragZ + 6) {
      sub = 'line'; ctx.say(A.drag, () => {
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, x = P.pos.x + Math.cos(a) * 9, z = P.pos.z + Math.sin(a) * 9; watchers.push(K.addFoe('rodak', x, z, { passive: true, watch: true })); }
        ctx.say(A.rodakLine, () => { objective('Deeper in', ''); K.setGoal(RUINS.x, heightAt(RUINS.x, RUINS.z), RUINS.z); });
      });
    }
    if (stage === 'alone' && sub === 'line') {
      // the Rodak drift along beside you, and stop at a line they won't cross
      for (const w of watchers) { const lineZ = RUINS.z + 40; w.home.set(clamp(P.pos.x + (w.home.x - P.pos.x) * 0.98, -60, 60), 0, Math.max(lineZ, P.pos.z + (w.pos.z - P.pos.z))); }
      if (P.pos.z < RUINS.z + 22) startRuins();
    }
    if (stage === 'day2' && P.pos.z < RUINS.z - 90) eclipse();
    if (stage === 'eclipse' && P.pos.z < KEEP.z + KEEP_HW + 14) atHideout();
    if (stage === 'courtyard') { for (const g of guards) if (g.hp < 9000) g.hp = 9999; }
    if (stage === 'church' && Math.abs(P.pos.x - KEEP.x) < 3.2 && P.pos.z < KEEP.z - KEEP_HW + 6.5) inChurch();
  }
  K.start = start;
  Object.defineProperty(K, 'stage', { get: () => stage });
  return K;
}
