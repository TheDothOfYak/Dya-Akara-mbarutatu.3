/* ============================================================
   YEAR FIVE — the night the Sniller woke, and Noka.
   A Relic the size of a door in the Carpenter's barn splits along a
   seam: an ancient, uncursed Sniller from the early days of the war
   with the Angels, nothing in it but fury. Tanoc and the Carpenter
   hold it back; Noka appears over the hill and tells them how to
   finish what the Angels left undone — the amulets in a ring, and
   the Akai Gek song. Then half a day, alone, up to Noka's peak, and
   what she shows him. The world opens.
   ============================================================ */
import * as THREE from 'three';
import { createMini, V3, toon, addOutline, glowSprite, lerp, clamp } from './mini.js';
import { buildSniller } from './velki.js';
import { smooth } from './util.js';
import * as STORY from './story.js';

const BARN = { x: 0, z: 0 }, PEAK = { x: 0, z: -520 };
function heightAt(x, z) {
  const dh = Math.hypot(x - BARN.x, z - BARN.z), dp = Math.hypot(x - PEAK.x, z - PEAK.z);
  let h = lerp(10, -2, smooth(40, 90, dh));
  h = Math.max(h, lerp(80, -2, smooth(10, 150, dp)));                            // Noka's peak
  return h + Math.sin(x * 0.08) * Math.cos(z * 0.07) * 0.6;
}

export function createFinale(ctx) {
  const A = STORY.ARC.finale;
  let stage = '';
  const K = createMini(ctx, {
    seed: 5555, heightAt, fog: 0x1a1a30, fogNear: 30, fogFar: 260, skyTop: 0x0a0a20, skyLow: 0x2a2440,
    hemiSky: 0x6a6aa0, hemiGround: 0x101018,
    ground: { x0: -100, x1: 100, z0: -680, z1: 90, segX: 80, segZ: 300, color: (x, z, y, c) => { c.set(0x3a5a3a).lerp(new THREE.Color(0x6a6a6a), smooth(30, 70, y)); if (Math.hypot(x - BARN.x, z - BARN.z) < 14) c.set(0x6a5038); } },
    bounds: p => { p.x = clamp(p.x, -95, 95); p.z = clamp(p.z, -670, 85); },
    onDown: () => { K.P.hp = 50; K.P.iframes = 1.5; ctx.toast('The Carpenter hauls you up. “Not yet.”', 3); },
    tick: (dt, playing) => tick(dt, playing),
  });
  const { scene, P } = K;
  K.setSky({ sun: [-0.4, 0.5, -0.6], sunI: 0.6, sunColor: 0x9aa0ff, hemiI: 0.6 });
  // stars
  { const g = new THREE.BufferGeometry(), pts = []; for (let i = 0; i < 900; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 1.3 + 0.1; pts.push(Math.cos(a) * Math.cos(e) * 3000, Math.sin(e) * 3000, Math.sin(a) * Math.cos(e) * 3000); } g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const s = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false, fog: false })); scene.add(s); K.stars = s; }
  /* the hilltop at night: house and barn as dark shapes, lamplight in the windows */
  const dark = toon(0x2a2228);
  const house = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.4, 6.5, 16), dark); house.position.set(-4, heightAt(-4, -24) + 3.2, -24); scene.add(house); K.cyl(-4, -24, 8, 0, 20);
  const win = glowSprite(0xffc870, 3, 0.9); win.position.set(-4, heightAt(-4, -24) + 3, -15.5); scene.add(win);
  const barnG = heightAt(BARN.x, BARN.z);
  const walls = [[0, -5, 12, 0.6], [-6, 0, 0.6, 10], [6, 0, 0.6, 10]].map(([dx, dz, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 7, d), toon(0x5a2a22)); m.position.set(BARN.x + dx, barnG + 3.5, BARN.z + dz); addOutline(m, 0.05); scene.add(m); K.box(BARN.x + dx, BARN.z + dz, w / 2, d / 2, barnG - 1, barnG + 7); return m; });
  /* the Relic the size of a door, and what's coming out of it */
  const relic = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 0.8), toon(0x2a1a2a, { emissive: 0xff3a4a, emissiveIntensity: 0.5 })); relic.position.set(BARN.x, barnG + 2.5, BARN.z - 3); addOutline(relic, 0.05); scene.add(relic);
  const bound = buildSniller(3.4); bound.position.set(BARN.x, barnG + 1, BARN.z - 2); bound.visible = false; scene.add(bound);
  bound.traverse(o => { if (o.material && o.material.color) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color(0xff3a3a), 0.6); } });
  const quake = new THREE.PointLight(0xff4a4a, 0, 40); quake.position.set(BARN.x, barnG + 4, BARN.z - 2); scene.add(quake);
  /* Noka: an Aerolhorn's silhouette in the stars, tendrils reaching down */
  const noka = new THREE.Group();
  { const body = new THREE.Mesh(new THREE.SphereGeometry(30, 20, 12), new THREE.MeshBasicMaterial({ color: 0x0a0a14, transparent: true, opacity: 0.85, fog: false })); body.scale.set(1.6, 1, 1); noka.add(body);
    for (const s of [-1, 1]) { const horn = new THREE.Mesh(new THREE.TorusGeometry(24, 3, 6, 20, Math.PI * 0.9), new THREE.MeshBasicMaterial({ color: 0x14141e, fog: false })); horn.position.set(s * 26, 22, 0); horn.rotation.z = s > 0 ? -0.3 : Math.PI + 0.3; noka.add(horn); }
    for (let i = 0; i < 7; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(2.5, 90, 6), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.25, fog: false, blending: THREE.AdditiveBlending, depthWrite: false })); t.position.set((i - 3) * 12, -60, 0); t.rotation.x = Math.PI; noka.add(t); }
    noka.add(Object.assign(glowSprite(0xffd27a, 160, 0.25)));
  }
  noka.position.set(0, 140, -60); noka.visible = false; scene.add(noka);
  /* the peak: a stygian Quarigen and an old soul */
  const quarigen = new THREE.Mesh(new THREE.DodecahedronGeometry(3, 0), toon(0x2a2230, { emissive: 0xffd27a, emissiveIntensity: 0.4 })); quarigen.position.set(PEAK.x, heightAt(PEAK.x, PEAK.z) + 3, PEAK.z); addOutline(quarigen, 0.06); scene.add(quarigen);
  K.cyl(PEAK.x, PEAK.z, 3, 0, 200);
  const qGlow = glowSprite(0xffd27a, 14, 0.6); qGlow.position.copy(quarigen.position); scene.add(qGlow);

  const buhkon = K.addFriend(K.buildBuhkon(), { side: 2.2, dist: 2.4, fight: true, dmg: 16 });
  let shards = [], ringItems = [], placed = 0, slamT = 3;

  function objective(text, hint = '', pips = 0, on = 0) { ctx.objective('Year five', text, hint, pips, on); }
  function start(at) {
    K.tanoc.weapon.visible = true;
    if (at === 'peak') return toPeak();
    stage = 'wake';
    K.place(P, BARN.x - 6, BARN.z + 22, Math.PI); K.place(buhkon, BARN.x - 3, BARN.z + 24, Math.PI); ctx.CAM.yaw = 0.2; ctx.CAM.pitch = 0.22;
    ctx.cards(STORY.ARC.years.five, 3200, () => {
      ctx.play(); ctx.location('The Carpenter’s hill', 'year five · night');
      ctx.say(A.start, () => {
        bound.visible = true; quake.intensity = 3; ctx.sfx.roar(); K.shake(1);
        for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * 1.1, x = BARN.x + Math.cos(a) * 9, z = BARN.z - 2 + Math.sin(a) * 9 + 10; const s = K.addFoe('shard', x, z, { passive: false }); s.onDeath = () => shardDown(); shards.push(s); }
        stage = 'fight'; objective(A.fight, 'Break the three glowing shards that hold the seam open', 3, 0);
      });
    });
  }
  function shardDown() {
    const left = shards.filter(s => !s.dead).length;
    objective(A.fight, 'Break the three glowing shards that hold the seam open', 3, 3 - left);
    if (left > 0) return;
    stage = 'noka'; noka.visible = true; ctx.sfx.victory();
    ctx.say(A.noka, () => {
      stage = 'ring';
      const n = Math.max(6, Math.min(12, ctx.amuletCount ? ctx.amuletCount() : 6));
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, x = BARN.x + Math.cos(a) * 6, z = BARN.z - 2 + Math.sin(a) * 6;
        const mark = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 20), new THREE.MeshBasicMaterial({ color: 0x6af0e0, side: THREE.DoubleSide, transparent: true, opacity: 0.7, depthWrite: false })); mark.rotation.x = -Math.PI / 2;
        const it = K.addItem(V3(x, heightAt(x, z) + 0.05, z), 'Set an amulet here', () => {
          K.dropItem(it); placed++;
          const am = new THREE.Group(); const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), toon(0x6af0e0, { emissive: 0x2aa0a0, emissiveIntensity: 0.9 })); am.add(gem); am.add(glowSprite(0x6af0e0, 1.6, 0.5)); am.position.set(x, heightAt(x, z) + 0.5, z); scene.add(am); ctx.sfx.core();
          objective(A.ringObj, `${placed}/6 — you carry ${n}`, 6, placed);
          if (placed >= 6) { stage = 'sing'; objective(A.sing, 'Stand in the ring and press E'); K.addItem(V3(BARN.x, barnG, BARN.z + 2), 'Sing the Akai Gek song', () => curse(), null, 4); }
        }, mark, 2.4);
        ringItems.push(it);
      }
      objective(A.ringObj, `0/6 — you carry ${n}`, 6, 0);
    });
  }
  function curse() {
    for (const it of K.items.slice()) K.dropItem(it);
    stage = 'cursed'; ctx.sfx.victory(); K.shake(1.4);
    K.particles.burst(BARN.x, barnG + 4, BARN.z - 2, 120, { color: 0x6af0e0, speed: 16, size: 1, life: 1.4 });
    bound.visible = false; quake.intensity = 0; relic.material.emissiveIntensity = 0;
    ctx.say(A.cursed, () => { ctx.give('amulet_bound', 1); ctx.save('peak'); ctx.cards(A.walk, 3600, () => toPeak()); });
  }
  function toPeak() {
    stage = 'peak'; noka.visible = false; buhkon.on = false;
    K.setSky({ top: 0x4a6ab0, low: 0xffd8b0, dim: 0, sun: [0.3, 0.4, -0.8], sunI: 1.8, sunColor: 0xffe0b0, hemiI: 1.0, fog: 0xd8c8c0, fogNear: 80, fogFar: 600 });
    if (K.stars) K.stars.visible = false;
    K.place(P, PEAK.x + 8, PEAK.z + 14, Math.PI); ctx.CAM.yaw = 0.4;
    ctx.play(); ctx.location('Noka’s peak', 'half a day from the Carpenter’s door');
    objective('Up to the stygian Quarigen at the top', ''); K.setGoal(PEAK.x, quarigen.position.y, PEAK.z);
  }
  function meetNoka() {
    stage = 'talk'; K.setGoal();
    ctx.say(A.nokaTalk, () => { ctx.blur(2); ctx.cards(A.visions, 4000, () => { ctx.blur(0); ctx.play(); ctx.say(A.end, () => { stage = 'done'; ctx.cards(A.endCards, 4200, () => ctx.onDone()); }); }); });
  }
  function tick(dt, playing) {
    const t = K.t;
    if (bound.visible) { bound.userData.tick(t); bound.position.y = barnG + 1 + Math.sin(t * 2) * 0.4; quake.intensity = 2.4 + Math.sin(t * 9) * 0.8; }
    if (noka.visible) { noka.rotation.y = Math.sin(t * 0.2) * 0.2; noka.children.forEach((c, i) => { if (c.geometry && c.geometry.type === 'ConeGeometry') c.rotation.z = Math.sin(t + i) * 0.15; }); }
    qGlow.material.opacity = 0.45 + Math.sin(t * 2) * 0.2;
    if (!playing) return;
    if (stage === 'fight') {
      // the Bound One's fury comes out in rings of red light
      slamT -= dt;
      if (slamT <= 0) {
        slamT = 2.6; ctx.sfx.slam(); K.shake(0.4);
        K.particles.ring(BARN.x, barnG + 0.5, BARN.z - 2, 60, 16, { color: 0xff4a4a, size: 0.6, life: 0.9 });
        const d = Math.hypot(P.pos.x - BARN.x, P.pos.z - BARN.z + 2);
        if (d > 7 && d < 15 && P.onGround && P.iframes <= 0) K.hurt(10, V3(BARN.x, 0, BARN.z - 2));
      }
    }
    if (stage === 'peak' && Math.hypot(P.pos.x - PEAK.x, P.pos.z - PEAK.z) < 8) meetNoka();
  }
  K.start = start;
  Object.defineProperty(K, 'stage', { get: () => stage });
  return K;
}
