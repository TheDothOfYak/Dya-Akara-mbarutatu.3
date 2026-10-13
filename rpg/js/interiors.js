/* ============================================================
   INSIDE — rooms behind doors, the way a house opens up in an
   old Hylian tale: walk to a door, press E, and you're inside a
   room bigger than the house looked. The rooms are built far out
   past every horizon (the "pocket"), lit by their own lamps, one
   at a time, the first time you step in.

   A world lists its doors ({ id, x, z, yaw, name, kind, ... });
   main.js asks this for prompts and moves the player through.
   ============================================================ */
import * as THREE from 'three';
import { toon, addOutline, glowSprite } from './gfx.js';
import { buildEikar } from './actors.js';
import { mulberry32 } from './util.js';

export const POCKET_X = 40000;           // every room lives out here, a long way past the edge of any land
const ROOM_GAP = 220;
const inPocket = x => x > POCKET_X - 1000;

const WOOD = ['#8a5a36', '#9a6a40', '#7a4e2c', '#a8784a'], PLASTER = ['#f0dcb4', '#e8c89a', '#f4e6c8', '#dcc0a0'];
const BOOK = [0x8a2a2a, 0x2a4a7a, 0x3a6a3a, 0x7a5a2a, 0x5a2a6a, 0xa8783a];
const FOLK = [
  { skin: '#c89a6a', cap: '#6a3a1a', tunic: 0xd8b878 }, { skin: '#a8743e', cap: '#5a3018', tunic: 0x5a6a8a },
  { skin: '#9a6a40', cap: '#3a2414', tunic: 0x8a4a3a }, { skin: '#b8844e', cap: '#4a2a14', tunic: 0x6a8a4a },
];
const HELLOS = [
  'Shoes off on the rug, if you please. …Eikar don’t wear shoes. Well. Feet, then.',
  'Come in, come in. Mind the pot, it bites.',
  'You’re the Carpenter’s boy. Everyone knows. Nobody says. Sit, if you like.',
  'We heard the sky go quiet. Not a Skyfall since. Strange times for a small town.',
  'Have you eaten? You look like you haven’t eaten.',
  'My grandmother had an amulet like that. It hummed at night. We buried it in the garden. It still hums.',
  'The roof leaks when the wind’s from Velki. Venkin says he’ll fix it. Venkin says a lot of things.',
  'Out! — oh. Sorry. I thought you were the Kipsu again.',
];
const BOOKS = [
  ['A cookbook, much splattered:', '"Zahreh buns. Two petals, one fluff — no, Kipsu fluff is not optional."'],
  ['A child’s primer:', '"The Three Tatu: Velki in the sky, Xikia under your feet, Pia’don where the Kalo sail. Draw them!"'],
  ['A ledger, in tidy columns:', '"Owed to Hemla: 4 shards. Owed BY Hemla: a favour (she says it\'s already paid)."'],
  ['A worn songbook:', '"When the Firefall comes, catch it, catch it — the Ahoac sing as they leap."'],
  ['A note tucked in a book:', '"Bosk — the Stryx wants a WARM seed. Not a lukewarm seed. A warm one."'],
  ['A book of Relic-lore:', '"Every Relic has its trigger. Some want a touch. Some a word. Some want you to wait."'],
];

export function createInteriors({ scene, world, say, give, picked, toast }) {
  const rooms = new Map();     // door id → built room
  let slot = 0, inside = null;  // the door we came in by
  const doors = [];

  /* the land's own rules stop at the pocket: a flat floor, always in bounds, never water */
  {
    const raw = world.heightAt.bind(world);
    world.heightAt = (x, z) => inPocket(x) ? 0 : raw(x, z);
    world.col.heightAt = world.heightAt;
    for (const k of ['inBounds']) { const f = world[k]; if (f) world[k] = (x, z) => inPocket(x) || f(x, z); }
    for (const k of ['swimOk']) { const f = world[k]; if (f) world[k] = (x, z) => !inPocket(x) && f(x, z); }
    if (world.water) {
      const iw = world.water.isWater, dp = world.water.depth;
      world.water.isWater = (x, z) => !inPocket(x) && iw(x, z);
      if (dp) world.water.depth = (x, z) => inPocket(x) ? 0 : dp(x, z);
    }
  }

  /* ---------------- building blocks ---------------- */
  function box(g, x, y, z, w, h, d, color, col, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color, opts.mat));
    m.position.set(x, y, z); if (opts.ry) m.rotation.y = opts.ry;
    m.castShadow = opts.shadow !== false; m.receiveShadow = true;
    if (opts.outline !== false) addOutline(m, 0.025);
    g.add(m);
    if (col) world.col.add(g.position.x + x, g.position.z + z, w / 2, d / 2, opts.ry || 0, y - h / 2, y + h / 2);
    return m;
  }
  function cyl(g, x, y, z, r0, r1, h, color, col, seg = 10) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), toon(color));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; addOutline(m, 0.025); g.add(m);
    if (col) world.col.add(g.position.x + x, g.position.z + z, Math.max(r0, r1) * 0.85, Math.max(r0, r1) * 0.85, 0, y - h / 2, y + h / 2);
    return m;
  }
  function lamp(g, x, y, z, color = 0xffc070, power = 40, dist = 26) {
    const l = new THREE.PointLight(color, power * 0.38, dist, 1.6); l.position.set(x, y, z); g.add(l);
    const s = glowSprite(color, 1.3, 0.6); s.position.set(x, y, z); g.add(s);
    return { l, s };
  }

  /* a room: floor, four walls with a door gap's worth of frame on the south (+z) wall, a ceiling, windows */
  function shell(g, R, spec) {
    const { w, d, h } = spec, wall = spec.wall, rng = R;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), toon(spec.floor)); floor.position.y = -0.15; floor.receiveShadow = true; g.add(floor);
    // floorboards
    for (let x = -w / 2 + 0.6; x < w / 2; x += 1.2) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, d), toon(0x5a3a22)); b.position.set(x, 0.01, 0); g.add(b); }
    const T = 0.6;
    box(g, 0, h / 2, -d / 2 - T / 2, w + T * 2, h, T, wall, true);
    box(g, -w / 2 - T / 2, h / 2, 0, T, h, d, wall, true);
    box(g, w / 2 + T / 2, h / 2, 0, T, h, d, wall, true);
    box(g, 0, h / 2, d / 2 + T / 2, w + T * 2, h, T, wall, true);
    const ceil = box(g, 0, h + 0.25, 0, w + T * 2, 0.5, d + T * 2, spec.ceil || '#6a4428', true, { shadow: false });
    ceil.castShadow = false;
    // beams across the ceiling
    for (let z = -d / 2 + 1.5; z < d / 2; z += 3) box(g, 0, h - 0.18, z, w, 0.36, 0.36, '#5a3a22', false, { shadow: false });
    // skirting
    for (const [x, z, ww, dd] of [[0, -d / 2 + 0.06, w, 0.12], [-w / 2 + 0.06, 0, 0.12, d], [w / 2 - 0.06, 0, 0.12, d]]) box(g, x, 0.15, z, ww, 0.3, dd, '#6a4428', false, { outline: false });
    // the way out: a door in the south wall, with daylight round its edges
    const door = box(g, 0, 1.15, d / 2 - 0.05, 1.4, 2.3, 0.12, '#6a3a1e', false);
    const frame = box(g, 0, 2.38, d / 2 - 0.08, 1.8, 0.18, 0.18, '#4a2a14', false);
    const sun = glowSprite(0xfff0c0, 2.4, 0.22); sun.position.set(0, 1.2, d / 2 - 0.3); g.add(sun);
    // windows on the side walls, bright by day
    const win = new THREE.MeshBasicMaterial({ color: 0xfff0c8 });
    for (const sx of [-1, 1]) for (let z = -d / 2 + 2.5; z < d / 2 - 1.5; z += Math.max(4, d / 3)) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), win); pane.position.set(sx * (w / 2 - 0.02), 2.1, z); pane.rotation.y = -sx * Math.PI / 2; g.add(pane);
      box(g, sx * (w / 2 - 0.05), 2.1, z, 0.1, 1.5, 0.12, '#4a2a14', false, { outline: false });
      box(g, sx * (w / 2 - 0.05), 2.1, z, 0.1, 0.1, 1.3, '#4a2a14', false, { outline: false });
    }
    return { door, frame };
  }

  /* ---------------- furniture ---------------- */
  function table(g, x, z, w = 2.2, d = 1.2, ry = 0) {
    box(g, x, 0.86, z, w, 0.12, d, '#8a5a36', true, { ry });
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const lx = a * (w / 2 - 0.12), lz = b * (d / 2 - 0.12);
      box(g, x + lx * Math.cos(ry) + lz * Math.sin(ry), 0.4, z - lx * Math.sin(ry) + lz * Math.cos(ry), 0.12, 0.8, 0.12, '#6a4428', false, { outline: false });
    }
  }
  function chair(g, x, z, ry) {
    box(g, x, 0.5, z, 0.55, 0.08, 0.55, '#7a4e2c', false, { ry });
    box(g, x - Math.sin(ry) * 0.25, 0.9, z - Math.cos(ry) * 0.25, 0.55, 0.75, 0.08, '#7a4e2c', false, { ry });
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(g, x + a * 0.22, 0.25, z + b * 0.22, 0.06, 0.5, 0.06, '#5a3a22', false, { outline: false });
  }
  function bed(g, x, z, ry = 0, quilt = 0x8a3a2a, y = 0) {
    box(g, x, y + 0.35, z, 1.4, 0.5, 2.4, '#7a4e2c', true, { ry });
    box(g, x, y + 0.66, z + Math.cos(ry) * 0.2, 1.3, 0.14, 1.9, quilt, false, { ry });
    box(g, x - Math.sin(ry) * 0.9, y + 0.7, z - Math.cos(ry) * 0.9, 0.9, 0.18, 0.45, '#f0e8d8', false, { ry });
    box(g, x - Math.sin(ry) * 1.15, y + 0.9, z - Math.cos(ry) * 1.15, 1.4, 1.1, 0.12, '#6a4428', false, { ry });
  }
  function hearth(g, x, z, ry = 0) {
    const fx = x + Math.sin(ry) * 0.2, fz = z + Math.cos(ry) * 0.2;
    box(g, x, 1.2, z, 2.6, 2.4, 0.9, '#9a8a78', true, { ry });
    box(g, fx + Math.sin(ry) * 0.3, 0.55, fz + Math.cos(ry) * 0.3, 1.4, 1.1, 0.6, '#2a1a10', false, { ry, outline: false });
    const fire = glowSprite(0xff8a3a, 1.6, 0.95); fire.position.set(fx + Math.sin(ry) * 0.55, 0.5, fz + Math.cos(ry) * 0.55); g.add(fire);
    const l = new THREE.PointLight(0xff8a3a, 9, 14, 1.6); l.position.copy(fire.position).y += 0.4; g.add(l);
    return { fire, l };
  }
  function shelf(g, x, z, ry, rng, w = 2) {
    box(g, x, 1.1, z, w, 2.2, 0.45, '#6a4428', true, { ry });
    for (let row = 0; row < 3; row++) for (let k = 0; k < 7; k++) {
      if (rng() < 0.2) continue;
      const off = (k / 6 - 0.5) * (w - 0.3), h = 0.3 + rng() * 0.12;
      box(g, x + Math.cos(ry) * off + Math.sin(ry) * 0.18, 0.5 + row * 0.62 + h / 2, z - Math.sin(ry) * off + Math.cos(ry) * 0.18, 0.12, h, 0.3, BOOK[Math.floor(rng() * BOOK.length)], false, { ry, outline: false, shadow: false });
    }
  }
  function rug(g, x, z, w, d, color) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), toon(color)); m.position.set(x, 0.02, z); m.receiveShadow = true; g.add(m); }
  function barrel(g, x, z) { cyl(g, x, 0.55, z, 0.42, 0.46, 1.1, '#7a4e2c', true); cyl(g, x, 0.85, z, 0.46, 0.46, 0.06, '#3a3a3a', false); }
  function crate(g, x, z, s = 0.8) { box(g, x, s / 2, z, s, s, s, '#9a6a40', true); }
  function pot(g, x, y, z, c = 0xb06a3a) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), toon(c)); m.scale.y = 0.9; m.position.set(x, y + 0.2, z); g.add(m); }
  function stairs(g, list, rise) {   // [[x, z, w, d]] climbing by `rise` each step
    list.forEach(([x, z, w, d], i) => { const top = (i + 1) * rise; box(g, x, top / 2, z, w, top, d, i % 2 ? '#9a6a40' : '#a8784a', true); });
  }

  /* ---------------- the rooms ---------------- */
  const KINDS = {
    cottage(g, R, door) {
      const w = 10 + Math.floor(R() * 3), d = 9 + Math.floor(R() * 3), h = 4.2;
      shell(g, R, { w, d, h, wall: PLASTER[Math.floor(R() * 4)], floor: WOOD[Math.floor(R() * 4)] });
      hearth(g, 0, -d / 2 + 0.5, 0);
      table(g, -w / 4, 0.5, 2, 1.1); chair(g, -w / 4 - 1.2, 0.5, Math.PI / 2); chair(g, -w / 4 + 1.2, 0.5, -Math.PI / 2);
      pot(g, -w / 4, 0.92, 0.5, 0xd0a040);
      bed(g, w / 2 - 1.1, -d / 2 + 1.6, 0, [0x8a3a2a, 0x2f6f8a, 0x5a8a3a, 0xd9a441][Math.floor(R() * 4)]);
      shelf(g, -w / 2 + 0.35, -d / 4, Math.PI / 2, R);
      rug(g, 0.5, 0.8, 3.4, 2.4, [0x8a3a4a, 0x3a5a8a, 0x8a6a2a][Math.floor(R() * 3)]);
      barrel(g, w / 2 - 0.7, d / 2 - 1.2); if (R() < 0.6) crate(g, w / 2 - 1.7, d / 2 - 0.9);
      lamp(g, 0, h - 0.6, 0.5, 0xffc070, 28, 22);
      const items = [{ pos: [-w / 2 + 0.8, 1.2, -d / 4], label: 'Read a book from the shelf', book: true }];
      if (R() < 0.55) items.push({ pos: [-w / 4 + 0.6, 1, 0.5], label: 'Take a Zahreh bun from the basket', give: 'bun', once: true });
      const folk = R() < 0.6 ? [{ x: w / 4, z: 1, look: FOLK[Math.floor(R() * FOLK.length)], line: HELLOS[Math.floor(R() * HELLOS.length)] }] : [];
      return { w, d, h, items, folk };
    },
    manor(g, R) {
      const w = 30, d = 22, h = 7.5;
      shell(g, R, { w, d, h, wall: '#e8d4b0', floor: '#7a4e2c', ceil: '#5a3a22' });
      // a long table, set for breakfast
      table(g, -3, 1, 7, 1.6);
      for (let k = 0; k < 5; k++) { chair(g, -6 + k * 1.5, -0.2, 0); chair(g, -6 + k * 1.5, 2.2, Math.PI); }
      const bread = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), toon(0xc8903a)); bread.scale.set(1.4, 0.7, 1); bread.position.set(-4, 1.05, 1); g.add(bread);
      const pot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.45, 12), toon(0x3a3a40)); pot2.position.set(-2, 1.15, 1); addOutline(pot2, 0.02); g.add(pot2);
      const steam = glowSprite(0xffffff, 0.8, 0.3); steam.position.set(-2, 1.6, 1); g.add(steam);
      // the great hearth, and the house's seals above it
      hearth(g, -3, -d / 2 + 0.5, 0);
      for (let k = 0; k < 3; k++) {
        const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 18), toon([0xc8a040, 0x8a2a2a, 0x2a4a7a][k], { emissive: 0x2a1a00, emissiveIntensity: 0.2 }));
        seal.rotation.x = Math.PI / 2; seal.position.set(-5 + k * 2, 4.2, -d / 2 + 0.05); addOutline(seal, 0.02); g.add(seal);
      }
      // portraits along the west wall
      for (let k = 0; k < 4; k++) { box(g, -w / 2 + 0.1, 3.4, -7 + k * 4.2, 0.12, 2, 1.5, '#c8a040', false); box(g, -w / 2 + 0.15, 3.4, -7 + k * 4.2, 0.08, 1.7, 1.2, [0x6a4a3a, 0x4a3a5a, 0x5a4a2a, 0x3a4a3a][k], false, { outline: false }); }
      // the library wall: Zikhron story cores among the books
      for (let k = 0; k < 4; k++) shelf(g, 6 + k * 2.2, -d / 2 + 0.35, 0, R, 2.1);
      const cores = [];
      for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xe8f0ff })); c.position.set(6.6 + k * 2.6, 1.75, -d / 2 + 0.6); g.add(c); const gl = glowSprite(0xdfe8ff, 0.8, 0.7); gl.position.copy(c.position); g.add(gl); cores.push(c); }
      rug(g, -3, 1, 10, 5, 0x6a2a3a); rug(g, 9, -4, 7, 5, 0x2a3a5a);
      // two armchairs by the shelves
      chair(g, 8, -5.5, Math.PI); chair(g, 11, -5.5, Math.PI);
      // the gallery: a stair up the east wall to Tanoc's loft
      const st = []; for (let i = 0; i < 9; i++) st.push([w / 2 - 1.2, d / 2 - 3 - i * 1.0, 2, 1.0]);
      stairs(g, st, 0.42);
      const LY = 9 * 0.42;
      box(g, w / 2 - 4, LY - 0.15, -5.5, 8, 0.3, 11, '#8a5a36', true);
      box(g, w / 2 - 8, LY + 0.5, -5.5, 0.15, 1, 11, '#6a4428', false);          // the rail
      bed(g, w / 2 - 2, -d / 2 + 2.2, 0, 0x2f6f8a, LY);
      const bedTop = { x: w / 2 - 2, y: LY, z: -d / 2 + 2.2 };
      for (const [x, z] of [[-12, -8], [-12, 8], [12, 8]]) { const pl = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 7), toon(0x4a8a3a)); pl.position.set(x, 0.9, z); g.add(pl); cyl(g, x, 0.3, z, 0.35, 0.3, 0.6, '#a8603a', true); }
      lamp(g, -3, h - 1.2, 1, 0xffc878, 60, 30); lamp(g, 4, h - 1.2, -4, 0xffc878, 50, 26); lamp(g, w / 2 - 4, LY + 2.6, -6, 0xffc070, 30, 16);
      return {
        w, d, h, cores,
        items: [
          { pos: [-3, 1.1, 1], label: 'Breakfast — bread, and a pot of something warm', lines: [['tale', 'Still warm. Somebody got up early and didn’t eat with you — the hammering from the workshop says who.']] },
          { pos: [-4, 4.2, -d / 2 + 0.6], label: 'Look at the seals over the hearth', lines: [['tale', 'Three seals, old and heavy: a house’s marks, the kind great families hang where guests can see them.'], ['tanoc', 'For a carpenter, he has a lot of seals.']] },
          { pos: [-w / 2 + 0.6, 3, -1], label: 'Look at the portraits', lines: [['tale', 'Stern Eikar in fine coats, generation on generation. The last frame on the wall is empty.']] },
          { pos: [8.8, 1.8, -d / 2 + 0.9], label: 'Touch a Zikhron story core', lines: [['tale', 'Cold, then warm. For a moment you are somewhere else — a long hall of shelves, and someone singing to the stone so it will remember.'], ['tanoc', 'Memory, he said. Stone remembers.']] },
          { pos: [bedTop.x, bedTop.y + 0.8, bedTop.z], label: 'Your bed in the loft', lines: [['tanoc', 'A real bed. With a quilt. Up here I can see the whole room — and out the window, the lake.']] },
        ],
        folk: [],
      };
    },
    workshop(g, R) {
      const w = 18, d = 13, h = 5.5;
      shell(g, R, { w, d, h, wall: '#c8a878', floor: '#8a6a4a' });
      for (const [x, z] of [[-4, -3], [3, -3]]) {   // workbenches, with tools and shavings
        box(g, x, 0.9, z, 3.6, 0.2, 1.4, '#9a6a40', true);
        for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(g, x + a * 1.6, 0.4, z + b * 0.55, 0.15, 0.8, 0.15, '#6a4428', false, { outline: false });
        box(g, x - 0.8, 1.05, z, 0.8, 0.1, 0.25, '#b8b0a8', false); box(g, x + 0.6, 1.08, z + 0.3, 0.12, 0.16, 0.6, '#6a4428', false);
      }
      // tools on the north wall
      for (let k = 0; k < 9; k++) { box(g, -6 + k * 1.4, 2.6, -d / 2 + 0.12, 0.12, 1 + (k % 3) * 0.3, 0.08, k % 2 ? '#8a8a90' : '#6a4428', false, { outline: false }); }
      // planks, a half-built cradle, a hull rib
      for (let k = 0; k < 5; k++) box(g, w / 2 - 1.5, 0.15 + k * 0.16, -2 + (k % 2) * 0.2, 1.4, 0.14, 6, WOOD[k % 4], k === 4);
      box(g, -5, 0.5, 3, 1.6, 0.9, 1, '#a8784a', true);
      const rib = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.15, 6, 16, Math.PI), toon(0x9a6a40)); rib.position.set(3, 0, 3.5); addOutline(rib, 0.02); g.add(rib);
      // the lathe-stone and a stygian anvil, cold and violet
      const anvil = box(g, 6.5, 0.6, 4, 1.2, 1.2, 0.8, '#3a3446', true, { mat: { emissive: 0x3a1a6a, emissiveIntensity: 0.4 } });
      lamp(g, -4, h - 0.8, -2); lamp(g, 4, h - 0.8, 2);
      hearth(g, -w / 2 + 0.5, 3, Math.PI / 2);
      return {
        w, d, h, folk: [],
        items: [
          { pos: [-4, 1.1, -3], label: 'Look at the workbench', lines: [['tale', 'Plane, chisels, a mallet worn to the shape of one particular hand. Curls of fire-tree shavings that smell like warm bread.']] },
          { pos: [6.5, 1.2, 4], label: 'Touch the cold violet anvil', lines: [['tale', 'Stygian. It hums very faintly, and the hum goes right up your arm into your hat.'], ['tanoc', 'He works soul-iron. Here. In a shed.']] },
          { pos: [3, 1, 3.5], label: 'Look at the half-built boat rib', lines: [['tale', 'One rib of a hull, pegged and perfect. A note on it: "for the lake. For the boy, when he swims well enough to need rescuing less."']] },
        ],
      };
    },
    barn(g, R) {
      const w = 20, d = 16, h = 10;
      shell(g, R, { w, d, h, wall: '#8a3a2a', floor: '#8a7050', ceil: '#4a2a18' });
      // stalls along the west side
      for (let k = 0; k < 4; k++) { box(g, -w / 2 + 3, 0.7, -d / 2 + 2 + k * 3.4, 0.2, 1.4, 0.2, '#6a4428', true); box(g, -w / 2 + 1.6, 1.2, -d / 2 + 2 + k * 3.4, 2.8, 0.15, 0.15, '#6a4428', false); }
      for (let k = 0; k < 7; k++) { const hb = box(g, 2 + (k % 3) * 1.3, 0.45 + Math.floor(k / 3) * 0.9, 4 - (k % 2) * 1.2, 1.2, 0.9, 0.9, '#d8b85a', true); }
      // the loft, and a ladder-stair up to it
      const LY = 4.6;
      box(g, 3, LY - 0.15, -5.5, w - 4, 0.3, 5, '#7a5232', true);
      const st = []; for (let i = 0; i < 11; i++) st.push([w / 2 - 1.3, d / 2 - 2.2 - i * 0.85, 1.6, 0.85]);
      stairs(g, st, 0.42);
      for (let k = 0; k < 6; k++) box(g, -2 + k * 1.4, LY + 0.45, -d / 2 + 2, 1.2, 0.9, 0.9, '#d8b85a', true);
      // the loft hideout: a blanket, a lantern, a little stash
      rug(g, 6, -4.5, 2.4, 1.6, 0x8a3a4a); g.children[g.children.length - 1].position.y = LY + 0.02;
      lamp(g, 6, LY + 1.6, -4.5, 0xffb060, 18, 12);
      lamp(g, 0, h - 1, 2, 0xffd090, 40, 30);
      const sun = glowSprite(0xfff0c0, 6, 0.35); sun.position.set(0, h - 1.2, -d / 2 + 0.2); g.add(sun);   // the hay door, open to the sky
      return {
        w, d, h, folk: [],
        items: [
          { pos: [6, LY + 0.6, -4.5], label: 'Your loft hideout', lines: [['tanoc', 'Nobody can see up here. A fort. My fort.'], ['tale', 'You could keep things here. Amulets. Secrets. A Punk, if it would fit up the stair.']] },
          { pos: [-w / 2 + 2, 1, -d / 2 + 2], label: 'Look in the stall', lines: [['tale', 'Clean straw, a water trough, and a name burned over the door that has been carefully sanded off.']] },
        ],
      };
    },
    tower(g, R) {
      const w = 9, d = 9, h = 20;
      shell(g, R, { w, d, h, wall: '#a8784a', floor: '#7a5232' });
      // a stair winding round the inside walls, to the lookout landing
      const st = [], rise = 0.42;
      let x = -w / 2 + 1.1, z = d / 2 - 2.6, i = 0;
      const legs = [[0, -1, 5], [1, 0, 6], [0, 1, 6], [-1, 0, 6], [0, -1, 6], [1, 0, 6], [0, 1, 4]];
      for (const [dx, dz, n] of legs) for (let k = 0; k < n; k++) { st.push([x, z, 1.6, 1.6]); x += dx * 1.0; z += dz * 1.0; i++; }
      st.forEach(([sx, sz], k) => { const top = (k + 1) * rise; box(g, sx, top - 0.15, sz, 1.6, 0.3, 1.6, k % 2 ? '#9a6a40' : '#a8784a', false); world.col.add(g.position.x + sx, g.position.z + sz, 0.8, 0.8, 0, top - 0.3, top); });
      const LY = st.length * rise;
      box(g, w / 4, LY - 0.15, 2.75, w / 2, 0.3, 3.5, '#8a5a36', true);
      // empty shelves waiting for books, round the landing
      box(g, w / 4, LY + 1.2, d / 2 - 0.3, 3.6, 2.2, 0.4, '#6a4428', false);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.8), new THREE.MeshBasicMaterial({ color: 0xbfe0ff })); pane.position.set(w / 2 - 0.05, LY + 1.6, 2.75); pane.rotation.y = -Math.PI / 2; g.add(pane);
      lamp(g, 0, 3, 0, 0xffc070, 30, 20); lamp(g, w / 4, LY + 2.6, 2.75, 0xffc070, 30, 18);
      return {
        w, d, h, folk: [],
        items: [{ pos: [w / 2 - 0.8, LY + 1, 2.75], label: 'Look out of the high window', lines: [['tale', 'The whole property below you: the house, the fields, the long slope down to the lake, the dark forest on the far shore — and the blue line of mountains, far off to the south.'], ['tanoc', 'Empty shelves. He said this tower will hold books one day.']] }],
      };
    },
    boathouse(g, R) {
      const w = 11, d = 13, h = 5;
      shell(g, R, { w, d, h, wall: '#7a6a5a', floor: '#6a5a4a' });
      const boat = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0x8a5a36, { side: THREE.DoubleSide }));
      boat.scale.set(1, 0.6, 3); boat.position.set(-2, 0.8, -1); addOutline(boat, 0.02); g.add(boat); world.col.add(g.position.x - 2, g.position.z - 1, 1.1, 3, 0, 0, 0.8);
      for (let k = 0; k < 3; k++) box(g, w / 2 - 0.4, 1.8 + k * 0.6, -3 + k, 0.1, 0.1, 3, '#a8784a', false);   // oars
      const net = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ color: 0x8a7a5a, wireframe: true })); net.position.set(0, 2.4, -d / 2 + 0.1); g.add(net);
      crate(g, 3, 2); barrel(g, 3.5, 4);
      lamp(g, 0, h - 0.8, 0, 0xffc070, 30, 20);
      return { w, d, h, folk: [], items: [{ pos: [-2, 1, -1], label: 'Look at the boat', lines: [['tale', 'A little round-bottomed lake boat, upside-down on trestles. Someone has carved a tiny acorn on the bow.']] }] };
    },
    woodshed(g, R) {
      const w = 9, d = 7, h = 3.8;
      shell(g, R, { w, d, h, wall: '#8a6a4a', floor: '#6a5a40' });
      for (let row = 0; row < 4; row++) for (let k = 0; k < 8; k++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.2, 6), toon(0x7a4e2c)); lg.rotation.x = Math.PI / 2; lg.position.set(-3 + k * 0.38 + (row % 2) * 0.19, 0.2 + row * 0.34, -d / 2 + 1); g.add(lg); }
      world.col.add(g.position.x - 1.6, g.position.z - d / 2 + 1, 1.7, 0.7, 0, 0, 1.4);
      box(g, 2, 0.4, 0.5, 0.9, 0.8, 0.9, '#8a5a36', true);   // the chopping block
      lamp(g, 0, h - 0.6, 0, 0xffc070, 18, 14);
      return { w, d, h, folk: [], items: [{ pos: [2, 1, 0.5], label: 'Look at the chopping block', lines: [['tale', 'Notched by a thousand swings. A hatchet just like yours is sunk in the top of it, waiting.']] }] };
    },
  };

  function build(door) {
    if (rooms.has(door.id)) return rooms.get(door.id);
    const g = new THREE.Group(); g.position.set(POCKET_X + (slot++) * ROOM_GAP, 0, 0); scene.add(g);
    const R = mulberry32(door.seed || (door.id.length * 7919 + 13));
    const info = (KINDS[door.kind] || KINDS.cottage)(g, R, door);
    const folk = (info.folk || []).map(f => {
      const a = buildEikar(Object.assign({ weapon: 'none', flasks: false }, f.look)); a.root.position.set(g.position.x + f.x, 0, f.z); a.root.rotation.y = Math.PI; scene.add(a.root);
      world.col.add(g.position.x + f.x, f.z, 0.4, 0.4, 0, -1, 1.8);
      return { a, line: f.line, pos: new THREE.Vector3(g.position.x + f.x, 0, f.z) };
    });
    const room = { door, g, info, folk, spawn: new THREE.Vector3(g.position.x, 0, info.d / 2 - Math.min(4, info.d * 0.3)), out: new THREE.Vector3(g.position.x, 0, info.d / 2 - 0.4),
      items: (info.items || []).map((it, i) => ({ ...it, id: door.id + ':' + i, pos: new THREE.Vector3(g.position.x + it.pos[0], it.pos[1], it.pos[2]) })) };
    g.visible = false; folk.forEach(f => { f.a.root.visible = false; });
    rooms.set(door.id, room);
    return room;
  }

  function show(room, on) { room.g.visible = on; room.folk.forEach(f => { f.a.root.visible = on; }); }

  return {
    get inside() { return inside; },
    doors,
    addDoors(list) { for (const d of list) doors.push(d); },
    isPocket: inPocket,
    room: id => rooms.get(id),
    /* step in: returns where to stand and which way to face */
    enter(door) {
      const room = build(door);
      for (const r of rooms.values()) show(r, r === room);
      inside = door;
      return { pos: room.spawn.clone(), yaw: Math.PI, room };
    },
    /* step out, in front of the door you came in by */
    exit() {
      const d = inside; inside = null;
      for (const r of rooms.values()) show(r, false);
      const out = new THREE.Vector3(d.x + Math.sin(d.yaw) * 1.6, 0, d.z + Math.cos(d.yaw) * 1.6);
      out.y = world.col.ground(out.x, out.z, world.heightAt(out.x, out.z) + 3);
      return { pos: out, yaw: d.yaw, door: d };
    },
    /* the things you can press E on: doors outside, or the room's own bits inside */
    interactables(P, act) {
      const list = [];
      if (!inside) {
        for (const d of doors) {
          if (Math.abs(d.x - P.pos.x) > 4 || Math.abs(d.z - P.pos.z) > 4) continue;
          if (d.open === false) continue;
          list.push({ pos: new THREE.Vector3(d.x, world.heightAt(d.x, d.z) + 1, d.z), label: d.label || `Go inside <small style="opacity:.7">${d.name}</small>`, act: () => act.enter(d), far: 2.4 });
        }
        return list;
      }
      const room = rooms.get(inside.id);
      list.push({ pos: room.out.clone().setY(1), label: 'Go outside', act: () => act.exit(), far: 2.2 });
      for (const it of room.items) {
        if (it.once && picked[it.id]) continue;
        list.push({ pos: it.pos, label: it.label, far: 2.4, act: () => {
          if (it.book) { const b = BOOKS[Math.floor(Math.random() * BOOKS.length)]; say([['tale', b[0] + ' ' + b[1]]]); return; }
          if (it.give) { picked[it.id] = true; give(it.give, 1); return; }
          if (it.lines) say(it.lines);
        } });
      }
      for (const f of room.folk) list.push({ pos: f.pos.clone().setY(1), label: 'Talk', far: 2.6, act: () => say([['resident', f.line]]) });
      return list;
    },
    update(dt, t, P) {
      if (!inside) return;
      const room = rooms.get(inside.id); if (!room) return;
      for (const f of room.folk) {
        const want = Math.atan2(P.pos.x - f.pos.x, P.pos.z - f.pos.z);
        f.a.root.rotation.y += (((want - f.a.root.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 3);
        f.a.animate(dt, { speed: 0, onGround: true, t: t + f.pos.x });
      }
      if (room.info.cores) room.info.cores.forEach((c, i) => { c.rotation.y = t + i; });
    },
  };
}
