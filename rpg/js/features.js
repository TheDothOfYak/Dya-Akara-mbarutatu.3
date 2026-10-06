/* ============================================================
   Things to find off the beaten road: loot chests, gathering
   spots (stygian ore, fire-tree logs, rubble, bog moss), and
   the Kalo Trials — small puzzles left in the wilds that pay out
   in spells and Hurst seeds.
   ============================================================ */
import * as THREE from 'three';
import { toon, ramp, glowSprite, addOutline } from './gfx.js';
import { mulberry32 } from './util.js';

const TAU = Math.PI * 2;

/* where things may go: on open ground, not in bogs, not off the edge */
function spots(world, rng, n, opts = {}) {
  const out = [];
  for (let i = 0; i < n * 40 && out.length < n; i++) {
    const a = rng() * TAU, r = (opts.rMin || 20) + rng() * ((opts.rMax || 160) - (opts.rMin || 20));
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) > world.edgeRadius(x, z) - 12) continue;
    const h = world.heightAt(x, z);
    if (world.col.ground(x, z, h + 0.4) > h + 0.3) continue;              // something built here
    if (world.hazards.some(b => Math.hypot(x - b.x, z - b.z) < b.r + 3)) continue;
    if (world.camp && Math.hypot(x - world.camp.x, z - world.camp.z) < 28) continue;
    if (Math.hypot(x - world.PLAZA.x, z - world.PLAZA.z) < 34) continue;
    if (out.some(p => Math.hypot(p.x - x, p.z - z) < (opts.gap || 14))) continue;
    if (opts.near && Math.hypot(x - opts.near.x, z - opts.near.z) > opts.near.r) continue;
    out.push({ x, z, y: h });
  }
  return out;
}

const CHEST_LOOT = {
  aakalay: [['petal', 2], ['ore', 2], ['bark', 2], ['salad', 1], ['stew', 1], ['vine', 3], ['t_seed', 1], ['oil', 2]],
  leotik: [['moss', 2], ['ore', 3], ['ember', 2], ['tea', 1], ['seed', 1], ['thorn', 1], ['skewer', 1], ['t_ring', 1]],
};

function chestMesh() {
  const g = new THREE.Group();
  const wood = toon(0x7a4a26), band = toon(0xd9a441);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.85), wood); base.position.y = 0.35; g.add(base);
  const lid = new THREE.Group(); lid.position.set(0, 0.7, -0.42); g.add(lid);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 1.3, 10, 1, false, 0, Math.PI), wood); top.rotation.z = Math.PI / 2; top.position.z = 0.42; lid.add(top);
  for (const x of [-0.45, 0.45]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.74, 0.9), band); b.position.set(x, 0.36, 0); g.add(b); }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.08), band); lock.position.set(0, 0.6, 0.45); g.add(lock);
  const glow = glowSprite(0xffd27a, 2.4, 0.5); glow.position.y = 1.0; g.add(glow);
  const meshes = []; g.traverse(m => { if (m.isMesh) meshes.push(m); });
  meshes.forEach(m => { m.castShadow = true; addOutline(m, 0.025); });
  g.userData = { lid, glow };
  return g;
}

export function buildFeatures(scene, world, region, save) {
  const rng = mulberry32(region === 'leotik' ? 8811 : 5521);
  const picked = save.picked || (save.picked = {});

  /* ---------- chests ---------- */
  const chests = spots(world, rng, 11, { rMin: 30, rMax: 165, gap: 30 }).map((p, i) => {
    const id = region + '_chest_' + i;
    const m = chestMesh(); m.position.set(p.x, p.y, p.z); m.rotation.y = rng() * TAU; scene.add(m);
    world.col.add(p.x, p.z, 0.65, 0.42, m.rotation.y, p.y - 1, p.y + 0.9);
    const loot = CHEST_LOOT[region];
    const a = loot[Math.floor(rng() * loot.length)], b = loot[Math.floor(rng() * loot.length)];
    const c = { id, x: p.x, y: p.y, z: p.z, mesh: m, open: !!picked[id], items: { [a[0]]: a[1] }, shards: 20 + Math.floor(rng() * 40), seed: i % 4 === 0 };
    if (b[0] !== a[0]) c.items[b[0]] = b[1];
    if (c.open) { m.userData.lid.rotation.x = -1.9; m.userData.glow.visible = false; }
    return c;
  });

  /* ---------- gathering spots (they grow back when you rest) ---------- */
  const nodes = [];
  const oreMat = new THREE.MeshToonMaterial({ color: 0x4a3a6a, emissive: 0x8a4aff, emissiveIntensity: 0.6, gradientMap: ramp() });
  const addNode = (kind, p, mesh, item, label) => {
    mesh.position.set(p.x, p.y, p.z); scene.add(mesh);
    nodes.push({ kind, x: p.x, y: p.y, z: p.z, mesh, item, label, ready: true });
  };
  spots(world, rng, 14, { gap: 18 }).forEach(p => {
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.4 + rng() * 0.35, 0), oreMat);
      c.position.set((rng() - 0.5) * 0.9, 0.4, (rng() - 0.5) * 0.9); c.scale.y = 1.8; c.rotation.set(rng(), rng(), rng() * 0.4);
      addOutline(c, 0.03); g.add(c);
    }
    const gl = glowSprite(0x9a5aff, 2.2, 0.5); gl.position.y = 0.7; g.add(gl);
    addNode('ore', p, g, 'ore', 'Break the stygian ore loose');
  });
  spots(world, rng, 11, { gap: 18 }).forEach(p => {
    const g = new THREE.Group();
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 4, 9), new THREE.MeshToonMaterial({ color: 0x6b2f1e, emissive: 0x5a1a08, emissiveIntensity: 0.4, gradientMap: ramp() }));
    log.rotation.z = Math.PI / 2; log.rotation.y = rng() * TAU; log.position.y = 0.4; addOutline(log, 0.04); g.add(log);
    addNode('bark', p, g, 'bark', 'Peel fire-tree bark');
  });
  spots(world, rng, 11, { gap: 18 }).forEach(p => {
    const g = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.6 + rng() * 0.4, 0.4 + rng() * 0.3, 0.5 + rng() * 0.4), toon(region === 'leotik' ? 0x7f7a6c : 0xcfa977));
      b.position.set((rng() - 0.5) * 1.4, 0.25 + (k > 2 ? 0.4 : 0), (rng() - 0.5) * 1.4); b.rotation.y = rng() * 3; addOutline(b, 0.02); g.add(b);
    }
    addNode('stone', p, g, 'stone', 'Gather cut stone');
  });
  if (region === 'leotik') {
    for (const b of world.hazards) for (let k = 0; k < 2; k++) {
      const a = rng() * TAU, x = b.x + Math.cos(a) * (b.r + 2.5), z = b.z + Math.sin(a) * (b.r + 2.5);
      const g = new THREE.Group();
      for (let j = 0; j < 6; j++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 4), toon(0x5aa83a)); m.scale.y = 0.5; m.position.set((rng() - 0.5) * 1.2, 0.1, (rng() - 0.5) * 1.2); g.add(m); }
      addNode('moss', { x, z, y: world.heightAt(x, z) }, g, 'moss', 'Gather bog moss');
    }
  }

  /* ---------- the Kalo Trials ---------- */
  const TRIALS = region === 'aakalay'
    ? [{ id: 'a_chime', kind: 'chime', name: 'Trial of Echoes', at: [-36, -100], reward: { spell: 'quake', xp: 200 } },
       { id: 'a_duat', kind: 'duat', name: 'Trial of the Seam', at: [100, -40], reward: { seed: 1, xp: 200, shards: 80 } },
       { id: 'a_fire', kind: 'brazier', name: 'Trial of Kindling', at: [-100, 40], reward: { seed: 1, xp: 180, items: { seed: 1 } } }]
    : [{ id: 'l_duat', kind: 'duat', name: 'Trial of the Seam', at: [40, -60], reward: { spell: 'ward', xp: 300 } },
       { id: 'l_fire', kind: 'brazier', name: 'Trial of Kindling', at: [-30, 70], reward: { seed: 1, xp: 260, items: { t_ver: 1 } } },
       { id: 'l_chime', kind: 'chime', name: 'Trial of Echoes', at: [70, 50], reward: { seed: 1, xp: 260, shards: 120 } }];
  const stoneMat = toon(region === 'leotik' ? 0x6e6a5e : 0xcfb48a);
  const trials = TRIALS.map(T => {
    const [x, z] = T.at, y = world.heightAt(x, z);
    const done = !!(save.trials || {})[T.id];
    const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
    // a ring of flagstones and a Kalo altar
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(11, 11.5, 0.4, 32), stoneMat); disk.position.y = -0.05; disk.receiveShadow = true; g.add(disk);
    const altar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 1.2, 6), toon(0x3a3048)); altar.position.y = 0.6; addOutline(altar, 0.04); g.add(altar);
    const rune = glowSprite(0x7ad8ff, 2.2, done ? 0.15 : 0.8); rune.position.y = 1.6; g.add(rune);
    world.col.add(x, z, 0.9, 0.9, 0, y - 1, y + 1.2);
    const t = { ...T, x, y, z, group: g, rune, done, active: false, timer: 0, parts: [], seq: [], step: 0, showT: 0 };
    if (T.kind === 'chime') {
      const cols = [0xff6a5a, 0x5ad86a, 0x5aa8ff, 0xffd05a];
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + Math.PI / 4;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 2.6, 6), new THREE.MeshToonMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: 0.1, gradientMap: ramp() }));
        m.position.set(Math.cos(a) * 6.5, 1.3, Math.sin(a) * 6.5); addOutline(m, 0.05); g.add(m);
        world.col.add(x + Math.cos(a) * 6.5, z + Math.sin(a) * 6.5, 0.6, 0.6, 0, y - 1, y + 2.6);
        t.parts.push({ mesh: m, x: x + Math.cos(a) * 6.5, z: z + Math.sin(a) * 6.5, glow: 0, i });
      }
    } else if (T.kind === 'brazier') {
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + 0.6, r = 18 + (i % 2) * 6;
        const bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r, by = world.heightAt(bx, bz);
        const bg = new THREE.Group(); bg.position.set(bx, by, bz); scene.add(bg);
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.35, 0.6, 8), toon(0x4a4038)); bowl.position.y = 1.4; addOutline(bowl, 0.04); bg.add(bowl);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6), toon(0x3a3028)); leg.position.y = 0.6; bg.add(leg);
        const flame = glowSprite(0xff8a3a, 2.6, 0); flame.position.y = 2.0; bg.add(flame);
        t.parts.push({ x: bx, z: bz, y: by, flame, lit: false });
      }
    } else if (T.kind === 'duat') {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 9, 6), toon(0x2a2236)); pillar.position.y = 4.5; addOutline(pillar, 0.05); g.add(pillar);
      world.col.add(x, z, 0.8, 0.8, 0, y - 1, y + 9);
    }
    return t;
  });

  return { chests, nodes, trials };
}

/* the high, floating sigils of a Duat trial — only the Duat can reach them */
export function sigilMesh() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 6, 16), new THREE.MeshBasicMaterial({ color: 0xc8a0ff }));
  g.add(m); g.add(glowSprite(0x9a5aff, 2.6, 0.9));
  return g;
}
