/* ============================================================
   The wider wilds of a region:
   - wildlife scattered through the world's zones by biome, most of
     it rare, and the water folk only ever in the water;
   - Ju fields — carrots that just sit there — until a Sprengju Relic
     Shaving is set among them: each pulse it wakes Ju into Sprengju,
     carrots that fly about the field and burst on impact;
   - Albali Aagac, whose ripe fruit falls and hatches into a Byrd;
   - the Kuni Byrd's nest, high on the region's perch.
   ============================================================ */
import * as THREE from 'three';
import { glowSprite } from './gfx.js';
import { buildJuField, buildSprengju, buildSprengjuShaving, buildAlbaliAagac, buildAlbaliFruit } from './esik_sea.js';
import { buildKuniByrd } from './esik_sky.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

/* how often a thing turns up: weight per spawn slot */
const COMMON = 10, UNCOMMON = 4, RARE = 1.2, VERY_RARE = 0.35;

/* [kind, weight, biomes (null = any land), group size [min,max], cap per region] */
const LAND = {
  xilia: [
    ['kofi', UNCOMMON, null, [1, 2]], ['uff', COMMON, ['meadow', 'forest', 'hills'], [1, 3]], ['makari', COMMON, ['meadow', 'lake', 'shore', 'forest'], [1, 1]],
    ['mikolo_moko', UNCOMMON, ['forest', 'meadow'], [1, 2]], ['big_momma_kofi', UNCOMMON, ['meadow', 'forest'], [1, 1]], ['punk', UNCOMMON, ['meadow', 'hills'], [2, 3]],
    ['rubbermcfly', UNCOMMON, ['meadow', 'forest', 'lake'], [1, 2]], ['ular_grothyn', UNCOMMON, ['forest', 'hills'], [1, 1]], ['tonguatjis', UNCOMMON, ['lake', 'shore', 'meadow'], [1, 1]],
    ['rodak', RARE, ['forest', 'hills'], [2, 3]], ['stryx', RARE, ['hills', 'mountain'], [1, 1], 3], ['gynge', RARE, ['meadow', 'forest', 'hills'], [1, 1], 2],
    ['ular_naga', VERY_RARE, ['mountain', 'hills', 'forest'], [1, 1], 1], ['lutut', VERY_RARE, ['mountain', 'hills'], [1, 1], 1], ['kuni_wild', VERY_RARE, ['mountain'], [1, 1], 1],
  ],
  /* the Carpenter's land: gentle, mostly — the wilder things keep to the far forest */
  property: [
    ['kofi', COMMON, null, [1, 3]], ['uff', COMMON, ['meadow', 'forest', 'hills'], [1, 3]], ['makari', COMMON, ['meadow', 'shore', 'forest'], [1, 1]],
    ['mikolo_moko', UNCOMMON, ['forest', 'meadow'], [1, 2]], ['big_momma_kofi', UNCOMMON, ['meadow'], [1, 1]], ['kipsu_f', UNCOMMON, ['meadow', 'hills'], [2, 3]],
    ['rubbermcfly', UNCOMMON, ['meadow', 'forest'], [1, 2]], ['tonguatjis', RARE, ['shore'], [1, 1], 1], ['punk', RARE, ['forest'], [2, 3]], ['rodak', RARE, ['forest'], [2, 3], 2],
  ],
  aakalay: [
    ['kofi', UNCOMMON, null, [1, 2]], ['uff', COMMON, ['forest', 'ruins', 'meadow'], [1, 2]], ['makari', COMMON, ['lake', 'forest', 'ruins'], [1, 1]],
    ['mikolo_moko', UNCOMMON, ['forest'], [1, 1]], ['rubbermcfly', UNCOMMON, ['forest', 'ruins'], [1, 1]], ['eldi_grothyn', UNCOMMON, ['ash', 'hills'], [1, 1]],
    ['ular_grothyn', UNCOMMON, ['forest'], [1, 1]], ['stryx', RARE, ['hills', 'mountain', 'ash'], [1, 1], 2], ['gynge', RARE, ['ash', 'hills'], [1, 1], 1],
    ['tonguatjis', RARE, ['lake', 'shore'], [1, 1], 2], ['lutut', VERY_RARE, ['mountain', 'ash'], [1, 1], 1],
  ],
  leotik: [
    ['uff', COMMON, ['jungle', 'forest'], [1, 3]], ['makari', COMMON, ['jungle', 'shore', 'bog'], [1, 1]], ['mikolo_moko', COMMON, ['jungle', 'forest'], [1, 2]],
    ['tonguatjis', UNCOMMON, ['bog', 'shore', 'lake'], [1, 1]], ['ular_grothyn', UNCOMMON, ['jungle', 'bog'], [1, 2]], ['eldi_grothyn', UNCOMMON, ['mountain', 'ash', 'hills'], [1, 2]],
    ['rubbermcfly', UNCOMMON, ['jungle'], [1, 2]], ['kofi', UNCOMMON, null, [1, 2]], ['big_momma_kofi', RARE, ['jungle'], [1, 1]],
    ['gynge', RARE, ['jungle', 'bog', 'hills'], [1, 1], 2], ['stryx', RARE, ['hills', 'mountain'], [1, 1], 2],
    ['ular_naga', RARE, ['jungle', 'mountain', 'bog'], [1, 1], 1], ['lutut', RARE, ['mountain', 'shore'], [1, 1], 1], ['kuni_wild', VERY_RARE, ['mountain', 'shore'], [1, 1], 1],
  ],
};
/* water folk: [kind, weight, minDepth, group, cap] */
const WATER = {
  xilia: [['raf_krabbi', COMMON, 0.3, [1, 3]], ['su_grothyn', UNCOMMON, 0.5, [1, 1]], ['harkal', RARE, 3, [1, 2], 2], ['hvaleia', VERY_RARE, 8, [1, 1], 1], ['su_naga', VERY_RARE, 10, [1, 1], 1]],
  property: [['raf_krabbi', COMMON, 0.3, [1, 3]], ['su_grothyn', UNCOMMON, 0.5, [1, 1]], ['harkal', VERY_RARE, 8, [1, 1], 1]],
  aakalay: [['raf_krabbi', COMMON, 0.3, [1, 2]], ['su_grothyn', UNCOMMON, 0.5, [1, 1]], ['harkal', RARE, 3, [1, 1], 1], ['hvaleia', VERY_RARE, 8, [1, 1], 1], ['su_naga', VERY_RARE, 10, [1, 1], 1]],
  leotik: [['raf_krabbi', COMMON, 0.3, [1, 2]], ['su_grothyn', UNCOMMON, 0.5, [1, 2]], ['harkal', UNCOMMON, 3, [1, 3], 4], ['hvaleia', RARE, 8, [1, 1], 2], ['su_naga', RARE, 10, [1, 1], 1]],
};
const SLOTS = { xilia: 2, aakalay: 1, leotik: 3, property: 2 };          // rolls per land zone — Aakalay is all but empty
const WATER_SLOTS = { xilia: 10, aakalay: 7, leotik: 16, property: 8 };

function pick(table, ok) {
  const opts = table.filter(ok);
  let tot = opts.reduce((a, r) => a + r[1], 0), x = Math.random() * tot;
  for (const r of opts) { x -= r[1]; if (x <= 0) return r; }
  return null;
}

export function createWilds(ctx) {
  const { scene, world, enemies, region } = ctx;
  const W = world.water;
  const S = ctx.save();
  S.ju = S.ju || {};
  const counts = {};
  const capOk = r => !r[4] || (counts[r[0]] || 0) < r[4];
  const land = (x, z) => (!world.inBounds || world.inBounds(x, z)) && !(W && W.isWater(x, z)) && !(world.clear || []).some(c => Math.hypot(x - c.x, z - c.z) < c.r + 4);

  /* ---------------- wildlife ---------------- */
  function zonesOrFallback() {
    if (world.zones && world.zones.length) return world.zones;
    const R = Math.min(170, world.edgeRadius(0, 0) - 20), out = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r = R * (0.45 + Math.random() * 0.45); out.push({ id: 'z' + i, x: Math.cos(a) * r, z: Math.sin(a) * r, r: 26, biome: 'meadow' }); }
    return out;
  }
  function spawnLand() {
    const table = LAND[region] || LAND.xilia;
    for (const zn of zonesOrFallback()) {
      if (zn.biome === 'lake') continue;
      for (let s = 0; s < (SLOTS[region] || 2); s++) {
        const r = pick(table, r => capOk(r) && (!r[2] || r[2].includes(zn.biome)));
        if (!r) continue;
        const n = r[3][0] + Math.floor(Math.random() * (r[3][1] - r[3][0] + 1));
        let cx = zn.x, cz = zn.z, ok = false;
        for (let i = 0; i < 10 && !ok; i++) { const a = Math.random() * TAU, d = Math.random() * zn.r; cx = zn.x + Math.cos(a) * d; cz = zn.z + Math.sin(a) * d; ok = land(cx, cz); }
        if (!ok) continue;
        counts[r[0]] = (counts[r[0]] || 0) + 1;
        for (let k = 0; k < n; k++) enemies.spawn(r[0], cx + (Math.random() - 0.5) * 6, cz + (Math.random() - 0.5) * 6, 'wild-' + zn.id + '-' + s, { wild: true });
      }
    }
  }
  function spawnWater() {
    if (!W) return;
    // sample the water once: where it is, and how deep
    const R = Math.max(250, world.edgeRadius(0, 0) * 1.6, ...(W.lakes || []).map(l => Math.max(Math.abs(l.x) + l.rx, Math.abs(l.z) + l.rz))), pts = [];
    for (let x = -R; x <= R; x += 12) for (let z = -R; z <= R; z += 12) {
      const jx = x + (Math.random() - 0.5) * 8, jz = z + (Math.random() - 0.5) * 8;
      if (W.isWater(jx, jz)) pts.push({ x: jx, z: jz, d: W.depth(jx, jz) });
    }
    if (!pts.length) return;
    const table = WATER[region] || WATER.xilia;
    for (let s = 0; s < (WATER_SLOTS[region] || 8); s++) {
      const r = pick(table, r => capOk(r));
      if (!r) continue;
      const deep = pts.filter(p => p.d >= r[2] && (r[0] !== 'raf_krabbi' && r[0] !== 'su_grothyn' || p.d < 3));
      if (!deep.length) continue;
      const p = deep[Math.floor(Math.random() * deep.length)];
      counts[r[0]] = (counts[r[0]] || 0) + 1;
      const n = r[3][0] + Math.floor(Math.random() * (r[3][1] - r[3][0] + 1));
      for (let k = 0; k < n; k++) {
        const x = p.x + (Math.random() - 0.5) * 4, z = p.z + (Math.random() - 0.5) * 4;
        if (W.isWater(x, z)) enemies.spawn(r[0], x, z, 'water-' + s, { wild: true });
      }
    }
  }

  /* ---------------- Ju fields and the Sprengju Relic Shaving ---------------- */
  const fields = (world.juFields || []).map((f, i) => {
    const id = region + ':ju' + i;
    const st = S.ju[id] = S.ju[id] || { ju: 14, relic: false, sprengju: 0, found: false };
    const g = new THREE.Group(); scene.add(g);
    const y = world.heightAt(f.x, f.z);
    const patches = [];
    const n = Math.max(4, Math.min(8, Math.round(f.r * 0.8)));
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU + 0.3, d = f.r * (k % 2 ? 0.35 : 0.7);
      const p = buildJuField({ seed: i * 31 + k });
      const px = f.x + Math.cos(a) * d, pz = f.z + Math.sin(a) * d;
      p.root.position.set(px, world.heightAt(px, pz), pz); p.root.rotation.y = a; g.add(p.root); patches.push(p);
    }
    // one shaving lies half-buried in the first field of each region, waiting to be found
    let buried = null;
    if (i === 0 && !st.found) {
      buried = new THREE.Group(); const s = buildSprengjuShaving(); s.root.scale.setScalar(0.8); buried.add(s.root);
      buried.position.set(f.x + f.r * 0.9, y - 0.5, f.z); g.add(buried); buried.userData.m = s;
    }
    let relicM = null;
    const showRelic = () => {
      if (st.relic && !relicM) { relicM = buildSprengjuShaving(); relicM.root.position.set(f.x, y + 0.2, f.z); g.add(relicM.root); }
      if (!st.relic && relicM) { g.remove(relicM.root); relicM = null; }
    };
    showRelic();
    return { ...f, id, st, g, y, patches, flyers: [], pulse: 20 + Math.random() * 10, buried, showRelic, get relicM() { return relicM; } };
  });
  function addFlyer(f) {
    const m = buildSprengju(); m.root.scale.setScalar(1.4); f.g.add(m.root);
    f.flyers.push({ m, a: Math.random() * TAU, r: 1.5 + Math.random() * (f.r - 1.5), h: 1 + Math.random() * 1.5, sp: 0.6 + Math.random() * 0.8 });
  }
  fields.forEach(f => { for (let k = 0; k < Math.min(6, f.st.sprengju); k++) addFlyer(f); });

  /* ---------------- Albali Aagac: fruit falls, and becomes a Byrd ---------------- */
  const trees = (world.albaliSpots || []).map((p, i) => {
    const t = buildAlbaliAagac({ seed: 40 + i });
    const y = world.heightAt(p.x, p.z); t.root.position.set(p.x, y, p.z); t.root.rotation.y = i * 1.7; scene.add(t.root);
    if (world.col) world.col.add(p.x, p.z, 0.9, 0.9, 0, y - 1, y + 6);
    return { ...p, y, t, next: 30 + Math.random() * 90, fruits: [], byrds: 0 };
  });
  const tame = region !== 'leotik';
  function dropFruit(tr) {
    const m = buildAlbaliFruit(); const a = Math.random() * TAU, d = 1.5 + Math.random() * 5;
    m.root.position.set(tr.x + Math.cos(a) * d, tr.y + 7, tr.z + Math.sin(a) * d); scene.add(m.root);
    tr.fruits.push({ m, vy: 0, landed: false, hatch: 25 + Math.random() * 20 });
  }

  /* ---------------- the Kuni Byrd's nest ---------------- */
  let nest = null;
  if (world.kuniPerch) {
    const p = world.kuniPerch, y = world.heightAt(p.x, p.z);
    const g = new THREE.Group(); g.position.set(p.x, y, p.z); scene.add(g);
    const twig = new THREE.MeshToonMaterial({ color: 0x6a4a2a });
    for (let k = 0; k < 18; k++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 4), twig);
      const a = k / 18 * TAU; c.position.set(Math.cos(a) * 2.2, 0.35 + (k % 3) * 0.18, Math.sin(a) * 2.2); c.rotation.set(Math.PI / 2, a + 0.6, 0); g.add(c);
    }
    const byrd = buildKuniByrd({ seed: 7 }); g.add(byrd.root);
    nest = { ...p, y, g, byrd, t: 0 };
  }

  /* ---------------- per frame ---------------- */
  function update(dt, t) {
    const night = ctx.night();
    for (const f of fields) {
      f.patches.forEach((p, k) => { p.root.visible = k < Math.ceil(f.patches.length * f.st.ju / 14); p.animate(dt, { t }); if (p.glow) p.glow(night); });
      if (f.relicM) { f.relicM.animate(dt, { t }); f.relicM.glow && f.relicM.glow(night); }
      if (f.buried) f.buried.userData.m.animate(dt, { t });
      // the pulse: a Relic shaving wakes two Ju into Sprengju; with no shaving, Ju slowly grow back
      f.pulse -= dt;
      if (f.pulse <= 0) {
        f.pulse = 30;
        if (f.st.relic && f.st.ju > 0 && f.st.sprengju < 8) {
          const n = Math.min(2, f.st.ju, 8 - f.st.sprengju);
          f.st.ju -= n; f.st.sprengju += n;
          for (let k = 0; k < n; k++) { if (f.flyers.length < 6) addFlyer(f); ctx.particles.burst(f.x, f.y + 0.8, f.z, 14, { color: 0xffa040, speed: 3, size: 0.4, life: 0.6 }); }
        } else if (!f.st.relic && f.st.ju < 14) f.st.ju++;
      }
      for (const fl of f.flyers) {
        fl.a += dt * fl.sp;
        const x = f.x + Math.cos(fl.a) * fl.r, z = f.z + Math.sin(fl.a) * fl.r;
        fl.m.root.position.set(x, f.y + fl.h + Math.sin(t * 2 + fl.r) * 0.4, z);
        fl.m.root.rotation.y = fl.a + Math.PI;
        fl.m.animate(dt, { t, speed: 3 }); if (fl.m.glow) fl.m.glow(night);
      }
    }
    for (const tr of trees) {
      tr.t.animate(dt, { t }); if (tr.t.glow) tr.t.glow(night);
      tr.next -= dt;
      if (tr.next <= 0) { tr.next = 120 + Math.random() * 120; if (tr.fruits.length < 3 && tr.byrds < 3) dropFruit(tr); }
      for (let k = tr.fruits.length - 1; k >= 0; k--) {
        const fr = tr.fruits[k], p = fr.m.root.position, g = world.heightAt(p.x, p.z);
        if (!fr.landed) { fr.vy -= 18 * dt; p.y += fr.vy * dt; if (p.y <= g + 0.15) { p.y = g + 0.15; fr.landed = true; } }
        else {
          fr.hatch -= dt; fr.m.root.rotation.z = fr.hatch < 6 ? Math.sin(t * 20) * 0.2 : 0;
          if (fr.hatch <= 0) {
            ctx.particles.burst(p.x, p.y + 0.3, p.z, 20, { color: tame ? 0xfff0c0 : 0x9aff5a, speed: 3, size: 0.4, life: 0.7 });
            enemies.spawn(tame ? 'albali' : 'albali_t', p.x, p.z, 'albali-tree', { wild: true });
            scene.remove(fr.m.root); tr.fruits.splice(k, 1); tr.byrds++;
          }
        }
      }
    }
    if (nest) {
      nest.t += dt;
      nest.byrd.root.visible = !ctx.flags().kuni;
      nest.byrd.root.rotation.y = Math.sin(nest.t * 0.2) * 0.6;
      nest.byrd.animate(dt, { t: nest.t, speed: 0, landed: true });
      if (nest.byrd.glow) nest.byrd.glow(night);
    }
  }

  /* ---------------- things to do here ---------------- */
  function interactables(P) {
    const out = [];
    const near = (x, z, r) => Math.hypot(P.pos.x - x, P.pos.z - z) < r;
    const inv = ctx.save().inv.items;
    for (const f of fields) {
      if (!near(f.x, f.z, f.r + 8)) continue;
      if (f.buried && f.buried.visible !== false && !f.st.found) out.push({ pos: f.buried.position.clone().add(f.g.position), label: 'Dig up the glowing shard', act: () => {
        f.st.found = true; f.g.remove(f.buried); f.buried = null;
        ctx.give('sprengju_shard', 1); ctx.say([['phorus', 'A Sprengju Relic Shaving — a sliver off a true Relic! Ju fields wake up around these. Set it down in the field and stand back.']]);
      }, far: 3 });
      if (!f.st.relic && inv.sprengju_shard) out.push({ pos: V3(f.x, f.y, f.z), label: 'Set the Sprengju Relic Shaving in the Ju field', act: () => {
        ctx.take('sprengju_shard'); f.st.relic = true; f.showRelic(); f.pulse = 4; ctx.persist();
        ctx.toast('The shaving hums. The Ju start to stir…', 3);
      }, far: f.r });
      if (f.st.relic) out.push({ pos: V3(f.x, f.y, f.z), label: 'Take back the Relic shaving', act: () => { f.st.relic = false; f.showRelic(); ctx.give('sprengju_shard', 1); ctx.persist(); }, far: 2.2 });
      if (f.st.ju > 0) out.push({ pos: V3(f.x + f.r * 0.5, f.y, f.z), label: `Pull a Ju <small style="opacity:.7">${f.st.ju} left</small>`, act: () => { f.st.ju--; ctx.give('ju', 1); ctx.persist(); }, far: f.r });
      for (const fl of f.flyers) {
        const p = fl.m.root.position;
        out.push({ pos: p.clone(), label: 'Catch the Sprengju', act: () => {
          f.g.remove(fl.m.root); f.flyers.splice(f.flyers.indexOf(fl), 1); f.st.sprengju = Math.max(0, f.st.sprengju - 1);
          ctx.give('sprengju', 1); ctx.persist();
          ctx.toast('Got it! Eat it for a boon, or throw it with X — it bursts on impact.', 3);
          if (f.flyers.length < Math.min(6, f.st.sprengju)) addFlyer(f);
        }, far: 2.4 });
      }
    }
    for (const tr of trees) for (const fr of tr.fruits) if (fr.landed) {
      const p = fr.m.root.position;
      if (near(p.x, p.z, 2.5)) out.push({ pos: p.clone(), label: 'Pick up the Albali fruit', act: () => { scene.remove(fr.m.root); tr.fruits.splice(tr.fruits.indexOf(fr), 1); ctx.give('albali_fruit', 1); ctx.persist(); }, far: 2.4 });
    }
    if (nest && !ctx.flags().kuni && near(nest.x, nest.z, 12)) out.push({ pos: V3(nest.x, nest.y + 2, nest.z), label: ctx.flags().lordDead ? 'Offer Albali fruit to the Kuni Byrd' : 'Look at the great nest', act: () => ctx.kuniNest(nest), far: 8 });
    return out;
  }
  function markers() {
    const m = [];
    for (const f of fields) m.push({ x: f.x, z: f.z, ch: '🥕', col: '#ffa040', size: 13, label: 'Ju field' });
    for (const t of trees) m.push({ x: t.x, z: t.z, ch: '🌳', col: '#d8463c', size: 13, label: 'Albali Aagac' });
    return m;
  }

  function respawn() { for (const k in counts) delete counts[k]; spawnLand(); spawnWater(); }
  respawn();
  return { respawn, update, interactables, markers, fields, trees, get nest() { return nest; }, counts };
}
