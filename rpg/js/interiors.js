/* ============================================================
   INSIDE — rooms behind doors, the way a house opens up in an
   old Hylian tale: walk to a door, press E, and you're inside a
   room bigger than the house looked. The rooms are built far out
   past every horizon (the "pocket"), lit by their own lamps, one
   at a time, the first time you step in.

   A world lists its doors ({ id, x, z, yaw, name, kind, ... });
   main.js asks this for prompts and moves the player through.

   A building can be a whole house of rooms: halls, doorways, a
   stair up to the bedrooms. Two outside doors can open into the
   same interior — give the second door `room: '<first door id>'`
   and `entry: '<name>'` and it arrives at that entry of the first
   door's building (the Carpenter's workshop is a wing of his
   house: in by the workshop doors, out by the front door, or the
   other way round).

   Static furniture is merged into a few meshes per room (one
   draw call for the lot, plus its ink outline), so a house can
   hold a great deal of it.
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
const TRIM = '#4a2a14';
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

/* The Carpenter's house, in room-space (relative to the room group): where things are that the story
   needs to find. The token bench is in the workshop wing; stand at `stand`, facing `yaw`, and the bench
   top is 1.3 m ahead at y≈0.97 (main.js puts the Okid'Relic and the chip there). */
export const MANOR_SPOTS = {
  tokenBench: { door: 'p_workshop', stand: { x: 56.5, y: 0, z: -17.3 }, yaw: Math.PI, top: { x: 56.5, y: 0.97, z: -18.6 }, buhkon: { x: 58.6, y: 0, z: -16.9 } },
  workshopDoor: { x: 49, y: 0, z: 5.2 },
  loftBed: { x: 24, y: 5.0, z: 3.7 },
};

/* ---------------- merged geometry: a room's static furniture in a few draw calls ---------------- */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _n3 = new THREE.Matrix3(), _c = new THREE.Color(), _v = new THREE.Vector3();
const NI = new WeakMap();
const flat = geo => { let g = NI.get(geo); if (!g) { g = geo.index ? geo.toNonIndexed() : geo; if (!g.attributes.normal) g.computeVertexNormals(); NI.set(geo, g); } return g; };
class Batch {
  constructor() { this.p = []; this.n = []; this.c = []; }
  add(geo, x, y, z, rx, ry, rz, sx, sy, sz, color) {
    const g = flat(geo), P = g.attributes.position, N = g.attributes.normal;
    _e.set(rx, ry, rz); _q.setFromEuler(_e); _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)); _n3.getNormalMatrix(_m); _c.set(color);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(_m); this.p.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize(); this.n.push(_v.x, _v.y, _v.z);
      this.c.push(_c.r, _c.g, _c.b);
    }
  }
  mesh(mat) {
    if (!this.p.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    geo.computeBoundingSphere();
    return new THREE.Mesh(geo, mat);
  }
}
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const GEO = new Map();
const geoOf = (key, make) => { let g = GEO.get(key); if (!g) { g = make(); GEO.set(key, g); } return g; };
const unitCyl = (top, seg) => geoOf('cyl' + top.toFixed(3) + ':' + seg, () => new THREE.CylinderGeometry(top, 1, 1, seg));
const SPHERE = new THREE.SphereGeometry(1, 12, 8), DOME = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), OCTA = new THREE.OctahedronGeometry(1, 0), CONE = new THREE.ConeGeometry(1, 1, 10);
const halfTorus = (r, t) => geoOf('ht' + r + ':' + t, () => new THREE.TorusGeometry(r, t, 6, 18, Math.PI));

export function createInteriors({ scene, world, say, give, picked, toast }) {
  const rooms = new Map();     // door id → built room (doors that share a building share the room)
  let slot = 0, inside = null;  // the door we came in by
  let exitVia = null;           // the door we're about to leave by, if not the one we came in by
  const doors = [];
  let BT = null;                // the batches for the room being built

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
  // batched unless it needs its own material (opts.mat / opts.mesh): `outline: false` → flat, `shadow: false` → structure
  const pick3 = opts => opts.outline === false ? BT.flat : opts.shadow === false ? BT.struct : BT.furn;
  function box(g, x, y, z, w, h, d, color, col, opts = {}) {
    let m = null;
    if (BT && !opts.mat && !opts.mesh) pick3(opts).add(UNIT_BOX, x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0, w, h, d, color);
    else {
      m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color, opts.mat));
      m.position.set(x, y, z); if (opts.ry) m.rotation.y = opts.ry;
      m.castShadow = opts.shadow !== false; m.receiveShadow = true;
      if (opts.outline !== false) addOutline(m, 0.025);
      g.add(m);
    }
    if (col) world.col.add(g.position.x + x, g.position.z + z, w / 2, d / 2, opts.ry || 0, y - h / 2, y + h / 2);
    return m;
  }
  function cyl(g, x, y, z, r0, r1, h, color, col, seg = 10, opts = {}) {
    const rr = Math.max(r1, 0.0001);
    if (BT && !opts.mat) pick3(opts).add(unitCyl(r0 / rr, seg), x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0, rr, h, rr, color);
    else { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), toon(color, opts.mat)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; addOutline(m, 0.025); g.add(m); }
    if (col) world.col.add(g.position.x + x, g.position.z + z, Math.max(r0, r1) * 0.85, Math.max(r0, r1) * 0.85, 0, y - h / 2, y + h / 2);
  }
  const put = (geo, x, y, z, sx, sy, sz, color, opts = {}) => pick3(opts).add(geo, x, y, z, opts.rx || 0, opts.ry || 0, opts.rz || 0, sx, sy, sz, color);
  const glowPane = (x, y, z, w, h, d, color = '#fff0c8') => BT.glow.add(UNIT_BOX, x, y, z, 0, 0, 0, w, h, d, color);
  function lamp(g, x, y, z, color = 0xffc070, power = 40, dist = 26) {
    const l = new THREE.PointLight(color, power * 0.38, dist, 1.6); l.position.set(x, y, z); g.add(l);
    const s = glowSprite(color, 1.3, 0.6); s.position.set(x, y, z); g.add(s);
    return { l, s };
  }
  function candle(g, x, y, z, s = 1) { cyl(g, x, y + 0.12 * s, z, 0.05 * s, 0.05 * s, 0.24 * s, '#f4ecd8', false, 6, { outline: false }); const f = glowSprite(0xffc070, 0.35 * s, 0.9); f.position.set(x, y + 0.3 * s, z); g.add(f); }
  // a chandelier: an iron ring of candles on chains, and one light for the lot
  function chandelier(g, x, y, z, r = 1.2, power = 55, dist = 30) {
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; box(g, x + Math.cos(a) * r * 0.5, y + 0.9, z + Math.sin(a) * r * 0.5, 0.03, 1.8, 0.03, '#2a2a2a', false, { rz: Math.cos(a) * 0.28, rx: -Math.sin(a) * 0.28, outline: false }); }
    put(geoOf('tor' + r, () => new THREE.TorusGeometry(1, 0.05, 6, 24)), x, y, z, r, r, r, '#3a3030', { rx: Math.PI / 2 });
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; candle(g, x + Math.cos(a) * r, y + 0.02, z + Math.sin(a) * r, 0.9); }
    return lamp(g, x, y + 0.3, z, 0xffc878, power, dist);
  }
  /* walls with doorways: a run along x at z (or along z at x), from a0 to a1, between heights y0 and y1.
     gaps: [[centre, width, height]] — each gets a timber frame, and the wall goes on over the top */
  function wall(g, axis, at, a0, a1, y0, y1, color, gaps = [], T = 0.4) {
    const seg = (c0, c1, b0, b1) => {
      if (c1 - c0 < 0.01 || b1 - b0 < 0.01) return;
      const m = (c0 + c1) / 2, ym = (b0 + b1) / 2;
      if (axis === 'x') box(g, m, ym, at, c1 - c0, b1 - b0, T, color, true, { shadow: false });
      else box(g, at, ym, m, T, b1 - b0, c1 - c0, color, true, { shadow: false });
    };
    const trim = (c, ym, len, hh) => { if (axis === 'x') box(g, c, ym, at, len, hh, T + 0.14, TRIM, false, { shadow: false }); else box(g, at, ym, c, T + 0.14, hh, len, TRIM, false, { shadow: false }); };
    let cur = a0;
    for (const [c, w, h] of gaps.slice().sort((p, q) => p[0] - q[0])) {
      seg(cur, c - w / 2, y0, y1); seg(c - w / 2, c + w / 2, y0 + h, y1);
      trim(c - w / 2 - 0.1, y0 + h / 2, 0.2, h); trim(c + w / 2 + 0.1, y0 + h / 2, 0.2, h); trim(c, y0 + h + 0.1, w + 0.4, 0.2);
      cur = c + w / 2;
    }
    seg(cur, a1, y0, y1);
  }
  // a window on the inside face of a wall: bright glass, a frame and cross-bars, a sill
  function win(g, axis, at, c, y, s, w = 1.4, h = 1.7) {
    if (axis === 'x') { glowPane(c, y, at, w, h, 0.05); box(g, c, y, at + s * 0.04, 0.1, h, 0.08, TRIM, false, { shadow: false, outline: false }); box(g, c, y + h * 0.1, at + s * 0.04, w, 0.08, 0.08, TRIM, false, { shadow: false, outline: false }); box(g, c, y, at + s * 0.05, w + 0.3, h + 0.3, 0.06, '#6a4428', false, { shadow: false, outline: false }); box(g, c, y - h / 2 - 0.12, at + s * 0.16, w + 0.4, 0.12, 0.34, '#7a5232', false, { shadow: false }); }
    else { glowPane(at, y, c, 0.05, h, w); box(g, at + s * 0.04, y, c, 0.08, h, 0.1, TRIM, false, { shadow: false, outline: false }); box(g, at + s * 0.04, y + h * 0.1, c, 0.08, 0.08, w, TRIM, false, { shadow: false, outline: false }); box(g, at + s * 0.05, y, c, 0.06, h + 0.3, w + 0.3, '#6a4428', false, { shadow: false, outline: false }); box(g, at + s * 0.16, y - h / 2 - 0.12, c, 0.34, 0.12, w + 0.4, '#7a5232', false, { shadow: false }); }
    // a little of the day comes in with it
    const sp = glowSprite(0xfff0d0, Math.max(w, h) * 1.6, 0.16); sp.position.set(axis === 'x' ? c : at + s * 0.6, y, axis === 'x' ? at + s * 0.6 : c); g.add(sp);
  }
  // a floor slab with its boards (or flags), top at y; upper floors get a collider
  function floorRect(g, x0, x1, z0, z1, y, color, kind = 'boards', col = y > 0.05) {
    box(g, (x0 + x1) / 2, y - 0.2, (z0 + z1) / 2, x1 - x0, 0.4, z1 - z0, color, col, { shadow: false, outline: false });
    if (kind === 'boards') for (let x = x0 + 0.6; x < x1; x += 1.2) box(g, x, y + 0.01, (z0 + z1) / 2, 0.04, 0.02, z1 - z0, '#5a3a22', false, { outline: false, shadow: false });
    else if (kind === 'flags') { const c2 = new THREE.Color(color).offsetHSL(0, 0, -0.06).getStyle(); for (let x = x0 + 0.8; x < x1 - 0.4; x += 1.6) for (let z = z0 + 0.8; z < z1 - 0.4; z += 1.6) if ((Math.round((x - x0) / 1.6) + Math.round((z - z0) / 1.6)) % 2) box(g, x, y + 0.01, z, 1.56, 0.02, 1.56, c2, false, { outline: false, shadow: false }); }
  }
  function ceilRect(g, x0, x1, z0, z1, y, color = '#6a4428', beams = true, pad = 0.8) {
    box(g, (x0 + x1) / 2, y + 0.2, (z0 + z1) / 2, x1 - x0 + pad, 0.4, z1 - z0 + pad, color, true, { shadow: false });
    if (beams) for (let z = z0 + 1.5; z < z1 - 0.5; z += 3) box(g, (x0 + x1) / 2, y - 0.18, z, x1 - x0, 0.36, 0.36, '#5a3a22', false, { shadow: false });
  }
  function skirt(g, x0, x1, z0, z1, y = 0, color = '#6a4428') {
    box(g, (x0 + x1) / 2, y + 0.15, z0 + 0.26, x1 - x0, 0.3, 0.12, color, false, { outline: false, shadow: false }); box(g, (x0 + x1) / 2, y + 0.15, z1 - 0.26, x1 - x0, 0.3, 0.12, color, false, { outline: false, shadow: false });
    box(g, x0 + 0.26, y + 0.15, (z0 + z1) / 2, 0.12, 0.3, z1 - z0, color, false, { outline: false, shadow: false }); box(g, x1 - 0.26, y + 0.15, (z0 + z1) / 2, 0.12, 0.3, z1 - z0, color, false, { outline: false, shadow: false });
  }
  // the way out: a door in the wall with daylight round its edges
  function outDoor(g, x, z, w = 1.6, h = 2.5, y = 0) {
    box(g, x, y + h / 2, z, w - 0.1, h - 0.05, 0.12, '#6a3a1e', true);
    for (let k = 0; k < 3; k++) box(g, x - w / 2 + 0.3 + k * (w - 0.6) / 2, y + h / 2, z - 0.08, 0.05, h - 0.3, 0.04, '#4a2a14', false, { outline: false });
    box(g, x + w * 0.32, y + 1.1, z - 0.12, 0.12, 0.12, 0.12, '#c8a040', false, { outline: false });
    const sun = glowSprite(0xfff0c0, Math.max(w, h) * 1.1, 0.22); sun.position.set(x, y + h / 2, z - 0.3); g.add(sun);
  }

  /* ---------------- furniture ---------------- */
  function table(g, x, z, w = 2.2, d = 1.2, ry = 0, y = 0, color = '#8a5a36') {
    box(g, x, y + 0.86, z, w, 0.12, d, color, true, { ry });
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const lx = a * (w / 2 - 0.12), lz = b * (d / 2 - 0.12);
      box(g, x + lx * Math.cos(ry) + lz * Math.sin(ry), y + 0.4, z - lx * Math.sin(ry) + lz * Math.cos(ry), 0.12, 0.8, 0.12, '#6a4428', false, { outline: false });
    }
  }
  function chair(g, x, z, ry, y = 0, color = '#7a4e2c') {
    box(g, x, y + 0.5, z, 0.55, 0.08, 0.55, color, false, { ry });
    box(g, x - Math.sin(ry) * 0.25, y + 0.9, z - Math.cos(ry) * 0.25, 0.55, 0.75, 0.08, color, false, { ry });
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(g, x + a * 0.22, y + 0.25, z + b * 0.22, 0.06, 0.5, 0.06, '#5a3a22', false, { outline: false });
  }
  function armchair(g, x, z, ry, color = 0x8a3a3a, y = 0) {
    const fx = Math.sin(ry), fz = Math.cos(ry), sx = Math.cos(ry), sz = -Math.sin(ry);
    box(g, x, y + 0.35, z, 1.0, 0.5, 0.95, color, true, { ry });
    box(g, x - fx * 0.42, y + 0.95, z - fz * 0.42, 1.0, 0.9, 0.2, color, false, { ry });
    for (const q of [-1, 1]) box(g, x + sx * q * 0.45, y + 0.72, z + sz * q * 0.45, 0.16, 0.36, 0.9, color, false, { ry });
    box(g, x, y + 0.64, z + fz * 0.05, 0.75, 0.1, 0.75, new THREE.Color(color).offsetHSL(0, 0, 0.08).getStyle(), false, { ry, outline: false });
  }
  function bed(g, x, z, ry = 0, quilt = 0x8a3a2a, y = 0, w = 1.4, l = 2.4) {
    box(g, x, y + 0.35, z, w, 0.5, l, '#7a4e2c', true, { ry });
    box(g, x + Math.sin(ry) * 0.2, y + 0.66, z + Math.cos(ry) * 0.2, w - 0.1, 0.14, l - 0.5, quilt, false, { ry });
    box(g, x - Math.sin(ry) * (l / 2 - 0.3), y + 0.7, z - Math.cos(ry) * (l / 2 - 0.3), w * 0.65, 0.18, 0.45, '#f0e8d8', false, { ry });
    box(g, x - Math.sin(ry) * (l / 2 - 0.05), y + 0.9, z - Math.cos(ry) * (l / 2 - 0.05), w, 1.1, 0.12, '#6a4428', false, { ry });
    box(g, x + Math.sin(ry) * (l / 2 - 0.05), y + 0.6, z + Math.cos(ry) * (l / 2 - 0.05), w, 0.55, 0.1, '#6a4428', false, { ry });
  }
  function hearth(g, x, z, ry = 0, big = 1, power = 9) {
    const fx = Math.sin(ry), fz = Math.cos(ry);
    box(g, x, 1.2 * big, z, 2.6 * big, 2.4 * big, 0.9, '#9a8a78', true, { ry });
    box(g, x + fx * 0.3, 0.55 * big, z + fz * 0.3, 1.4 * big, 1.1 * big, 0.6, '#2a1a10', false, { ry, outline: false });
    box(g, x + fx * 0.55, 2.45 * big, z + fz * 0.55, 3.0 * big, 0.2, 0.5, '#6a4428', false, { ry });   // the mantel
    box(g, x, 2.4 * big + 1.6, z - fz * 0.1, 1.8 * big, 3.2, 0.7, '#8a7a68', false, { ry, shadow: false });   // the chimney breast
    for (let k = 0; k < 3; k++) cyl(g, x + fx * 0.6 + Math.cos(ry) * (k - 1) * 0.3 * big, 0.15, z + fz * 0.6 - Math.sin(ry) * (k - 1) * 0.3 * big, 0.08, 0.08, 0.9, '#5a3a22', false, 6, { rx: Math.PI / 2, ry });
    const fire = glowSprite(0xff8a3a, 1.6 * big, 0.95); fire.position.set(x + fx * 0.55, 0.5 * big, z + fz * 0.55); g.add(fire);
    const l = new THREE.PointLight(0xff8a3a, power, 14 * big, 1.6); l.position.copy(fire.position).y += 0.4; g.add(l);
    flickers.push(fire);
    return { fire, l };
  }
  function shelf(g, x, z, ry, rng, w = 2, h = 2.2, rows = 3, y = 0) {
    box(g, x, y + h / 2, z, w, h, 0.45, '#6a4428', true, { ry });
    for (let row = 0; row < rows; row++) {
      box(g, x + Math.sin(ry) * 0.05, y + 0.4 + row * (h - 0.4) / rows, z + Math.cos(ry) * 0.05, w - 0.1, 0.05, 0.42, '#5a3a22', false, { ry, outline: false });
      for (let k = 0; k < Math.floor(w * 3.4); k++) {
        if (rng() < 0.18) continue;
        const off = (k / (Math.floor(w * 3.4) - 1) - 0.5) * (w - 0.3), hb = 0.28 + rng() * 0.14;
        box(g, x + Math.cos(ry) * off + Math.sin(ry) * 0.18, y + 0.43 + row * (h - 0.4) / rows + hb / 2, z - Math.sin(ry) * off + Math.cos(ry) * 0.18, 0.1 + rng() * 0.04, hb, 0.3, BOOK[Math.floor(rng() * BOOK.length)], false, { ry, outline: false, shadow: false });
      }
    }
  }
  function rug(g, x, z, w, d, color, y = 0) { box(g, x, y + 0.02, z, w, 0.03, d, color, false, { outline: false, shadow: false }); box(g, x, y + 0.025, z, w - 0.4, 0.03, d - 0.4, new THREE.Color(color).offsetHSL(0.04, 0, 0.1).getStyle(), false, { outline: false, shadow: false }); box(g, x, y + 0.03, z, w - 0.8, 0.03, d - 0.8, color, false, { outline: false, shadow: false }); }
  function barrel(g, x, z, y = 0) { cyl(g, x, y + 0.55, z, 0.42, 0.46, 1.1, '#7a4e2c', true); cyl(g, x, y + 0.85, z, 0.47, 0.47, 0.06, '#3a3a3a', false); cyl(g, x, y + 0.25, z, 0.47, 0.47, 0.06, '#3a3a3a', false); }
  function crate(g, x, z, s = 0.8, y = 0, ry = 0) { box(g, x, y + s / 2, z, s, s, s, '#9a6a40', true, { ry }); box(g, x, y + s / 2, z, s + 0.02, 0.1, s + 0.02, '#6a4428', false, { ry, outline: false }); }
  function sack(g, x, z, y = 0) { put(SPHERE, x, y + 0.32, z, 0.34, 0.38, 0.3, '#c8b080'); put(SPHERE, x, y + 0.7, z, 0.12, 0.08, 0.12, '#a89060'); }
  function pot(g, x, y, z, c = 0xb06a3a, s = 1) { put(SPHERE, x, y + 0.2 * s, z, 0.22 * s, 0.2 * s, 0.22 * s, c); }
  function jar(g, x, y, z, c) { cyl(g, x, y + 0.14, z, 0.1, 0.12, 0.28, c, false, 8, { outline: false }); cyl(g, x, y + 0.31, z, 0.08, 0.08, 0.06, '#c8b080', false, 8, { outline: false }); }
  function plant(g, x, z, y = 0, s = 1) { cyl(g, x, y + 0.3 * s, z, 0.35 * s, 0.28 * s, 0.6 * s, '#a8603a', true); put(CONE, x, y + 1.0 * s, z, 0.5 * s, 1.2 * s, 0.5 * s, '#4a8a3a'); put(SPHERE, x + 0.2 * s, y + 0.9 * s, z, 0.3 * s, 0.3 * s, 0.3 * s, '#5a9a40'); }
  function stairs(g, list, rise, y0 = 0) {   // [[x, z, w, d]] climbing by `rise` each step
    list.forEach(([x, z, w, d], i) => { const top = y0 + (i + 1) * rise; box(g, x, (y0 + top) / 2, z, w, top - y0 + 0.001, d, i % 2 ? '#9a6a40' : '#a8784a', true, { shadow: false }); box(g, x, top - 0.02, z, w + 0.06, 0.06, d + 0.04, '#6a4428', false, { outline: false, shadow: false }); });
  }
  function portrait(g, axis, at, c, y, s, w, h, tone) {
    if (axis === 'x') { box(g, c, y, at + s * 0.06, w, h, 0.12, '#c8a040', false); box(g, c, y, at + s * 0.12, w - 0.3, h - 0.3, 0.06, tone, false, { outline: false }); box(g, c, y + 0.1, at + s * 0.15, (w - 0.3) * 0.36, (h - 0.3) * 0.4, 0.04, '#c8a07a', false, { outline: false }); }
    else { box(g, at + s * 0.06, y, c, 0.12, h, w, '#c8a040', false); box(g, at + s * 0.12, y, c, 0.06, h - 0.3, w - 0.3, tone, false, { outline: false }); box(g, at + s * 0.15, y + 0.1, c, 0.04, (h - 0.3) * 0.4, (w - 0.3) * 0.36, '#c8a07a', false, { outline: false }); }
  }
  function pegs(g, axis, at, c0, n, y, s) { for (let k = 0; k < n; k++) { const c = c0 + k * 0.5; if (axis === 'x') box(g, c, y, at + s * 0.12, 0.06, 0.06, 0.24, TRIM, false, { outline: false }); else box(g, at + s * 0.12, y, c, 0.24, 0.06, 0.06, TRIM, false, { outline: false }); } }
  function hat(g, x, y, z, color = '#5a3018') { put(CONE, x, y + 0.2, z, 0.3, 0.42, 0.3, color, { rz: 0.15 }); cyl(g, x, y, z, 0.42, 0.42, 0.04, color, false, 12); }
  function tool(g, x, y, z, kind, ry = 0, along = 'x') {   // something hung on a wall: a saw, a chisel, a mallet, a square
    const r = { ry };
    if (kind === 0) { box(g, x, y, z, 0.7, 0.3, 0.03, '#b8b8c0', false, r); box(g, x - 0.42 * Math.cos(ry), y + 0.02, z + 0.42 * Math.sin(ry), 0.18, 0.2, 0.06, '#7a4e2c', false, r); }
    else if (kind === 1) { box(g, x, y, z, 0.05, 0.4, 0.04, '#b8b8c0', false, r); box(g, x, y + 0.3, z, 0.07, 0.24, 0.06, '#8a5a36', false, r); }
    else if (kind === 2) { box(g, x, y, z, 0.05, 0.55, 0.05, '#8a5a36', false, r); box(g, x, y + 0.32, z, 0.3, 0.14, 0.14, '#7a4e2c', false, r); }
    else { box(g, x, y, z, 0.5, 0.05, 0.03, '#c8c8d0', false, r); box(g, x - 0.22 * Math.cos(ry), y - 0.18, z + 0.22 * Math.sin(ry), 0.05, 0.4, 0.03, '#c8c8d0', false, r); }
  }
  function vase(g, x, y, z, flowers = ['#ff8ac8', '#f2d24a', '#ffffff']) { cyl(g, x, y + 0.2, z, 0.1, 0.16, 0.4, '#3a6a8a', false, 10); for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; put(SPHERE, x + Math.cos(a) * 0.12, y + 0.55 + (k % 2) * 0.08, z + Math.sin(a) * 0.12, 0.08, 0.06, 0.08, flowers[k % flowers.length], { outline: false }); } }
  function book(g, x, y, z, ry, c = 0x8a2a2a, open = false) { if (open) { box(g, x, y + 0.03, z, 0.6, 0.04, 0.42, '#f0e8d0', false, { ry }); box(g, x, y + 0.015, z, 0.64, 0.03, 0.46, c, false, { ry, outline: false }); } else box(g, x, y + 0.05, z, 0.32, 0.1, 0.24, c, false, { ry }); }
  // a token: a small disc of stygian-set wood with the creature's colour in it, and a glint
  function token(g, x, y, z, c, s = 1, upright = false, ry = 0) {
    cyl(g, x, y, z, 0.16 * s, 0.16 * s, 0.05 * s, '#4a3a5a', false, 14, upright ? { rx: Math.PI / 2, ry, outline: false } : { outline: false });
    cyl(g, x + (upright ? Math.sin(ry) * 0.03 * s : 0), y + (upright ? 0 : 0.03 * s), z + (upright ? Math.cos(ry) * 0.03 * s : 0), 0.11 * s, 0.11 * s, 0.02 * s, c, false, 14, upright ? { rx: Math.PI / 2, ry, outline: false } : { outline: false });
  }
  // a glass case on legs: wood frame, a pane of glass (its own see-through mesh), what's inside is up to you
  const glassMat = new THREE.MeshToonMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.22, depthWrite: false });
  function glassCase(g, x, z, w, d, y0 = 0.95, h = 0.6) {
    box(g, x, y0 / 2, z, w, y0, d, '#6a4428', true);
    box(g, x, y0 + 0.02, z, w - 0.12, 0.04, d - 0.12, '#5a2a3a', false, { outline: false });
    const gm = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, h, d - 0.08), glassMat); gm.position.set(x, y0 + h / 2, z); gm.renderOrder = 2; g.add(gm);
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(g, x + a * (w / 2 - 0.04), y0 + h / 2, z + b * (d / 2 - 0.04), 0.06, h, 0.06, '#c8a040', false, { outline: false });
    box(g, x, y0 + h + 0.03, z, w, 0.06, d, '#6a4428', false);
    world.col.add(g.position.x + x, z, w / 2, d / 2, 0, 0, y0 + h);
  }
  const flickers = [];

  /* ---------------- the rooms ---------------- */
  /* a plain room: floor, four walls with the way out in the south (+z) wall, a ceiling, windows */
  function shell(g, R, spec) {
    const { w, d, h } = spec, wallC = spec.wall;
    floorRect(g, -w / 2, w / 2, -d / 2, d / 2, 0, spec.floor);
    wall(g, 'x', -d / 2 - 0.2, -w / 2 - 0.4, w / 2 + 0.4, 0, h, wallC);
    wall(g, 'z', -w / 2 - 0.2, -d / 2, d / 2, 0, h, wallC);
    wall(g, 'z', w / 2 + 0.2, -d / 2, d / 2, 0, h, wallC);
    wall(g, 'x', d / 2 + 0.2, -w / 2 - 0.4, w / 2 + 0.4, 0, h, wallC);
    ceilRect(g, -w / 2, w / 2, -d / 2, d / 2, h, spec.ceil || '#6a4428');
    skirt(g, -w / 2, w / 2, -d / 2, d / 2);
    outDoor(g, 0, d / 2 - 0.05, 1.5, 2.4);
    for (const sx of [-1, 1]) for (let z = -d / 2 + 2.5; z < d / 2 - 1.5; z += Math.max(4, d / 3)) win(g, 'z', sx * (w / 2 - 0.02), z, 2.1, -sx, 1.1, 1.3);
  }
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

    /* ======== the Carpenter's house, and the workshop wing joined on by the covered way ========
       Ground floor, south (front) band: dining room | entrance hall | library.
       Ground floor, north band: kitchen | the token room | storeroom → covered way → the workshop.
       Upstairs, off the gallery over the hall: Buhkon's room (west) and Tanoc's loft (east). */
    manor(g, R) {
      const H1 = 5.0, HT = 9.8, HN = 5.4, HTK = 7.4;
      const WALL = '#efe0c0', WALL2 = '#e8d4b0', PANEL = '#8a5a36';
      const items = [], cores = [];
      /* --- floors and ceilings --- */
      floorRect(g, -8, 8, 2, 20, 0, '#c8bca8', 'flags');            // the hall: flagstones
      floorRect(g, -28, -8, 2, 20, 0, '#7a4e2c');                   // dining
      floorRect(g, 8, 28, 2, 20, 0, '#8a5a36');                     // library
      floorRect(g, -28, -10, -20, 2, 0, '#b8a890', 'flags');        // kitchen: worn tiles
      floorRect(g, -10, 10, -20, 2, 0, '#6a4a3a');                  // token room
      floorRect(g, 10, 28, -20, 2, 0, '#7a6a5a');                   // storeroom
      floorRect(g, 28, 36, -9, -3, 0, '#a89880', 'flags');          // the covered way
      floorRect(g, 36, 62, -20, 8, 0, '#9a7a5a');                   // the workshop
      floorRect(g, -28, -8, 2, 20, H1, '#8a5a36'); floorRect(g, 8, 28, 2, 20, H1, '#9a6a40');   // upstairs
      floorRect(g, -8, 8, 2, 7.2, H1, '#8a5a36');                   // the gallery landing
      ceilRect(g, -28, -8, 2, 20, HT, '#6a4428'); ceilRect(g, 8, 28, 2, 20, HT, '#6a4428'); ceilRect(g, -8, 8, 2, 20, HT, '#5a3a22');
      ceilRect(g, -28, -10, -20, 2, HN, '#5a3a22', true, 0); ceilRect(g, 10, 28, -20, 2, HN, '#5a3a22', true, 0); ceilRect(g, -10, 10, -20, 2, HTK, '#4a2a1a', false, 0);
      ceilRect(g, 28, 36, -9, -3, 4.2, '#5a3a22', false); ceilRect(g, 36, 62, -20, 8, 7.6, '#5a3a22', false);
      // undersides of the upper floors, beamed, as the downstairs ceilings
      for (const [x0, x1] of [[-28, -8], [8, 28]]) for (let z = 3.5; z < 20; z += 3) box(g, (x0 + x1) / 2, H1 - 0.58, z, x1 - x0, 0.36, 0.36, '#5a3a22', false, { shadow: false });
      /* --- the outer walls --- */
      wall(g, 'x', 20.2, -28.4, 28.4, 0, HT, WALL, [[0, 2.4, 3.4]]);
      wall(g, 'z', -28.2, 2, 20, 0, HT, WALL); wall(g, 'z', -28.2, -20.4, 2, 0, HN, WALL2);
      wall(g, 'z', 28.2, 2, 20, 0, HT, WALL); wall(g, 'z', 28.2, -20.4, 2, 0, HN, WALL2, [[-6, 2.4, 3.2]]);
      wall(g, 'x', -20.2, -28.4, -10, 0, HN, WALL2); wall(g, 'x', -20.2, -10, 10, 0, HTK, '#d8c4a0'); wall(g, 'x', -20.2, 10, 28.4, 0, HN, WALL2);
      /* --- the inner walls --- */
      wall(g, 'x', 2, -28, -8, 0, H1, WALL, [[-11.6, 2.2, 3.2]]);         // dining | kitchen
      wall(g, 'x', 2, -8, 8, 0, H1, '#d8c4a0', [[0, 3.0, 3.6]]);           // hall | token room
      wall(g, 'x', 2, 8, 28, 0, H1, WALL);                                 // library | storeroom
      wall(g, 'x', 2, -28, 28, H1, HT, WALL);                              // upstairs, north side
      wall(g, 'z', -8, 2, 20, 0, H1, WALL, [[16.4, 2.4, 3.2]]);            // hall | dining
      wall(g, 'z', 8, 2, 20, 0, H1, WALL, [[17.6, 2.2, 3.2]]);             // hall | library
      wall(g, 'z', -8, 2, 20, H1, HT, WALL2, [[4.6, 2.0, 3.0]]);           // gallery | Buhkon's room
      wall(g, 'z', 8, 2, 20, H1, HT, WALL2, [[4.6, 2.0, 3.0]]);            // gallery | Tanoc's loft
      wall(g, 'z', -10, -20, 2, 0, HTK, '#d8c4a0', [[-0.6, 2.0, 3.2]]);    // kitchen | token room
      wall(g, 'z', 10, -20, 2, 0, HTK, '#d8c4a0', [[-0.6, 2.0, 3.2]]);     // token room | storeroom
      // the covered way
      wall(g, 'x', -9.2, 28, 36, 0, 4.2, WALL2); wall(g, 'x', -2.8, 28, 36, 0, 4.2, WALL2);
      // the workshop
      wall(g, 'z', 36.2, -20.4, 8.4, 0, 7.6, '#c8a878', [[-6, 2.4, 3.2]]);
      wall(g, 'z', 62.2, -20.4, 8.4, 0, 7.6, '#c8a878');
      wall(g, 'x', -20.2, 36, 62.4, 0, 7.6, '#c8a878'); wall(g, 'x', 8.2, 36, 62.4, 0, 7.6, '#c8a878', [[49, 3.2, 3.6]]);
      skirt(g, -28, -8, 2, 20); skirt(g, 8, 28, 2, 20); skirt(g, -28, -8, 2, 20, H1); skirt(g, 8, 28, 2, 20, H1); skirt(g, -10, 10, -20, 2, 0, '#3a2414');
      /* --- windows --- */
      for (const x of [-23, -13, 13, 25]) { win(g, 'x', 19.98, x, 2.3, -1); win(g, 'x', 19.98, x, 7.2, -1); }
      for (const x of [-4.5, 4.5]) win(g, 'x', 19.98, x, 7.4, -1, 1.2, 2.2);
      for (const z of [8, 15]) { win(g, 'z', -27.98, z, 2.3, 1); win(g, 'z', -27.98, z, 7.2, 1); }
      win(g, 'z', 27.98, 16.4, 2.3, -1);
      win(g, 'z', 27.98, 11, 7.2, -1, 2.4, 2.4);                       // Tanoc's big window, toward the lake
      for (const z of [-15, -11.5]) win(g, 'z', -27.98, z, 2.4, 1);
      win(g, 'x', -19.98, -22, 2.6, 1); win(g, 'x', -19.98, -15, 2.6, 1);
      win(g, 'z', 27.98, -15, 2.4, -1);
      for (const x of [30, 34]) { win(g, 'x', -8.98, x, 2.1, 1, 1.4, 1.5); win(g, 'x', -3.02, x, 2.1, -1, 1.4, 1.5); }
      for (const x of [40, 46, 52, 58]) win(g, 'x', -19.98, x, 5.2, 1, 1.6, 1.6);
      for (const x of [40, 58]) win(g, 'x', 7.98, x, 2.4, -1, 1.6, 1.6);
      for (const z of [-14, -6, 2]) win(g, 'z', 61.98, z, 5.6, -1, 1.4, 1.6);
      outDoor(g, 0, 19.95, 2.3, 3.3);
      outDoor(g, 49, 7.95, 3.0, 3.5);

      /* ---- the entrance hall: flagstones, the grand stair, the gallery, a chandelier, the family's faces ---- */
      rug(g, 0, 11, 6, 9, 0x6a2a3a);
      const ST = 12, rise = H1 / ST, sd = 0.7, st = [];
      for (let i = 0; i < ST; i++) st.push([6.6, 15.4 - sd / 2 - i * sd, 2.8, sd]);
      stairs(g, st, rise);
      for (let i = 0; i < ST; i++) { const top = (i + 1) * rise, z = 15.4 - sd / 2 - i * sd; box(g, 5.25, top + 0.45, z, 0.08, 0.9, 0.08, '#f4ead4', false, { outline: false }); world.col.add(g.position.x + 5.2, z, 0.1, sd / 2, 0, top, top + 1.0); }
      box(g, 5.25, H1 / 2 + 0.95, 11.2, 0.14, 0.12, Math.hypot(H1, ST * sd), TRIM, false, { rx: Math.atan2(H1, ST * sd) });
      box(g, 5.25, 1.0, 15.4, 0.3, 2, 0.3, TRIM, false); put(SPHERE, 5.25, 2.1, 15.4, 0.22, 0.22, 0.22, '#c8a040');
      // the gallery balustrade
      for (let x = -7.6; x < 5.2; x += 0.5) box(g, x, H1 + 0.45, 7.05, 0.08, 0.9, 0.08, '#f4ead4', false, { outline: false });
      box(g, -1.2, H1 + 0.95, 7.1, 13.6, 0.14, 0.2, TRIM, false); world.col.add(g.position.x - 1.4, 7.1, 6.6, 0.12, 0, H1, H1 + 1.0);
      box(g, 0, H1 - 0.2, 7.0, 16, 0.4, 0.3, TRIM, false, { shadow: false });
      box(g, -7.4, 2.5, 7.1, 0.5, 5, 0.5, '#f4ead4', true);   // a pillar under the gallery
      chandelier(g, 0, 7.4, 13.5, 1.5, 60, 34);
      // portraits along the gallery wall, and an empty frame at the end
      for (let k = 0; k < 5; k++) portrait(g, 'x', 2.22, -6 + k * 3, H1 + 2.4, 1, 1.6, 2.1, [0x6a4a3a, 0x4a3a5a, 0x5a4a2a, 0x3a4a3a, 0x2a2420][k]);
      // coat pegs and a bench by the door, Buhkon's spare hats, a console with flowers
      pegs(g, 'z', -7.8, 15.5, 5, 2.2, 1); hat(g, -7.55, 2.05, 16.0); hat(g, -7.55, 2.05, 17.0, '#3a5a3a');
      box(g, -6.9, 0.45, 17.2, 0.6, 0.12, 2.4, '#7a4e2c', true); for (const z of [16.2, 18.2]) box(g, -6.9, 0.22, z, 0.5, 0.44, 0.1, '#5a3a22', false, { outline: false });
      table(g, -4.4, 2.75, 2.6, 0.6, 0, 0, '#6a4428'); vase(g, -4.4, 0.92, 2.75); candle(g, -5.4, 0.92, 2.75); candle(g, -3.4, 0.92, 2.75);
      plant(g, -6.8, 3.3); plant(g, 3.6, 3.3, 0, 1.1);
      cyl(g, -6.6, 0.4, 19.2, 0.25, 0.22, 0.8, '#5a6a7a', true, 10); for (let k = 0; k < 3; k++) box(g, -6.6 + (k - 1) * 0.08, 1.0, 19.2, 0.04, 1.2, 0.04, '#3a2a1a', false, { outline: false, rz: (k - 1) * 0.1 });
      items.push({ pos: [0, H1 + 1.2, 2.9], label: 'Look at the faces on the gallery wall', lines: [['tale', 'Stern Eikar in fine coats, generation on generation, and all of them with his chin. The last frame on the wall is empty.'], ['tanoc', 'He never says who they are. I asked once. He said "family", and went to plane something.']] });

      /* ---- the dining room: the long table, set for breakfast; the great hearth with the house's seals over it ---- */
      rug(g, -18, 11, 12, 6, 0x5a2a3a);
      table(g, -18, 11, 9, 1.8, 0, 0, '#7a4e2c');
      for (let k = 0; k < 6; k++) { chair(g, -21.7 + k * 1.5, 9.6, 0); chair(g, -21.7 + k * 1.5, 12.4, Math.PI); }
      chair(g, -23.2, 11, Math.PI / 2, 0, '#6a3a22'); chair(g, -12.8, 11, -Math.PI / 2, 0, '#6a3a22');
      for (let k = 0; k < 6; k++) { const x = -21.7 + k * 1.5; for (const z of [10.3, 11.7]) { cyl(g, x, 0.93, z, 0.2, 0.2, 0.02, '#f0ece0', false, 12, { outline: false }); } }
      put(SPHERE, -19, 1.06, 11, 0.42, 0.21, 0.3, '#c8903a'); put(SPHERE, -18.4, 1.0, 10.8, 0.2, 0.12, 0.2, '#d8a050');
      cyl(g, -17, 1.15, 11, 0.35, 0.3, 0.45, '#3a3a40', false, 12);
      const steam = glowSprite(0xffffff, 0.8, 0.3); steam.position.set(-17, 1.6, 11); g.add(steam); flickers.push(steam);
      for (const x of [-21, -15]) { put(SPHERE, x, 1.0, 11, 0.28, 0.12, 0.28, '#e8d8b8'); for (let q = 0; q < 4; q++) put(SPHERE, x + (q - 1.5) * 0.12, 1.08, 11 + (q % 2) * 0.1, 0.08, 0.08, 0.08, ['#e85a3a', '#f2d24a', '#7ab04a', '#e8762a'][q], { outline: false }); }
      vase(g, -18, 0.92, 11, ['#ff8ac8', '#ffb0d0', '#ffffff']);
      candle(g, -20, 0.92, 11, 1.3); candle(g, -16, 0.92, 11, 1.3);
      hearth(g, -27.5, 11, Math.PI / 2, 1.3, 10);
      for (let k = 0; k < 3; k++) {
        const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 18), toon([0xc8a040, 0x8a2a2a, 0x2a4a7a][k], { emissive: 0x2a1a00, emissiveIntensity: 0.2 }));
        seal.scale.set(0.78, 1, 0.78); seal.rotation.z = Math.PI / 2; seal.position.set(-27.1, 3.75 + (k === 1 ? 0.35 : 0), 10.1 + k * 0.9); addOutline(seal, 0.02); g.add(seal);
      }
      // a dresser of plates on the north wall, a sideboard by the door
      box(g, -18, 1.0, 2.55, 4.2, 2.0, 0.7, '#6a4428', true); box(g, -18, 2.6, 2.4, 4.2, 1.6, 0.35, '#6a4428', false);
      for (let k = 0; k < 7; k++) for (const y of [2.15, 2.75]) cyl(g, -19.8 + k * 0.6, y + 0.18, 2.65, 0.22, 0.22, 0.03, ['#f0ece0', '#3a6a8a', '#f0ece0'][k % 3], false, 14, { rx: Math.PI / 2 - 0.15, outline: false });
      box(g, -10.2, 0.5, 18.9, 3, 1.0, 0.9, '#6a4428', true); vase(g, -11.0, 1.0, 18.9, ['#f2d24a', '#ffffff']); candle(g, -9.6, 1.0, 18.9);
      plant(g, -26.6, 18.6); plant(g, -26.6, 3.4, 0, 0.9);
      chandelier(g, -18, 3.6, 11, 1.4, 40, 22);
      items.push({ pos: [-17.5, 1.1, 11], label: 'Breakfast — bread, and a pot of something warm', lines: [['tale', 'Still warm. Somebody got up early and didn’t eat with you — the hammering from the workshop says who.']] });
      items.push({ pos: [-26.6, 3.8, 11], label: 'Look at the seals over the hearth', lines: [['tale', 'Three seals, old and heavy: a house’s marks, the kind great families hang where guests can see them.'], ['tanoc', 'For a carpenter, he has a lot of seals.']] });

      /* ---- the library: shelves floor to ceiling, Zikhron story cores, a reading table, a globe, a fire ---- */
      for (let k = 0; k < 8; k++) shelf(g, 9.4 + k * 2.3, 2.45, 0, R, 2.2, 4.2, 6);
      for (let k = 0; k < 5; k++) shelf(g, 27.55, 3.6 + k * 2.3, -Math.PI / 2, R, 2.2, 4.2, 6);
      for (let k = 0; k < 9; k++) box(g, 26.85 - k * 0.05, 0.3 + k * 0.42, 9.2, 0.08, 0.06, 0.6, '#7a5232', false, { outline: false });   // the library ladder
      for (const q of [-0.3, 0.3]) box(g, 26.65, 2.0, 9.2 + q, 0.06, 4.0, 0.06, '#7a5232', false, { rz: -0.12, outline: false });
      rug(g, 17, 11, 9, 7, 0x2a3a5a);
      table(g, 17, 10, 3.6, 1.8, 0, 0, '#6a4428');
      book(g, 16.4, 0.92, 9.8, 0.2, 0x2a4a7a, true); book(g, 17.8, 0.92, 10.3, -0.3, 0x8a2a2a); book(g, 17.9, 1.02, 10.3, -0.1, 0x3a6a3a);
      candle(g, 18.3, 0.92, 9.6, 1.2); chair(g, 17, 8.6, 0); chair(g, 17, 11.4, Math.PI);
      // a map of the Tatu pinned on a board, and a globe of Xikia on its stand
      box(g, 8.24, 2.6, 12, 0.08, 1.8, 2.6, '#d8c8a0', false, { outline: false }); box(g, 8.22, 2.6, 12, 0.06, 2.0, 2.8, '#6a4428', false);
      for (let k = 0; k < 6; k++) put(SPHERE, 8.3, 2.0 + (k % 3) * 0.5, 11.2 + Math.floor(k / 3) * 1.4 + (k % 2) * 0.3, 0.05, 0.05, 0.05, '#c83a3a', { outline: false });
      cyl(g, 12.2, 0.5, 15.8, 0.1, 0.35, 1.0, '#6a4428', true); put(SPHERE, 12.2, 1.45, 15.8, 0.48, 0.48, 0.48, '#4a8aa8'); put(SPHERE, 12.36, 1.6, 15.9, 0.3, 0.22, 0.3, '#6a9a4a', { outline: false });
      put(halfTorus(0.56, 0.03), 12.2, 1.45, 15.8, 1, 1, 1, '#c8a040', { ry: 0.6 });
      hearth(g, 17.4, 19.6, Math.PI, 1, 7);
      armchair(g, 15.4, 16.8, 2.6, 0x8a3a3a); armchair(g, 20.6, 16.8, -2.6, 0x3a5a3a);
      box(g, 18, 0.35, 16.6, 1.2, 0.08, 0.7, '#6a4428', false); book(g, 18, 0.42, 16.6, 0.4, 0x5a2a6a);
      // the story cores: three Zikhron stones on velvet, under their own small light
      box(g, 21.4, 1.0, 19.3, 2.6, 2.0, 0.8, '#5a3a22', true); box(g, 21.4, 2.05, 19.3, 2.6, 0.1, 0.8, '#4a2a3a', false, { outline: false });
      for (let k = 0; k < 3; k++) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xe8f0ff })); c.position.set(20.6 + k * 0.8, 2.4, 19.2); g.add(c);
        const gl = glowSprite(0xdfe8ff, 0.8, 0.7); gl.position.copy(c.position); g.add(gl); cores.push(c);
        cyl(g, 20.6 + k * 0.8, 2.16, 19.2, 0.12, 0.16, 0.12, '#c8a040', false, 10);
      }
      const cl = glowSprite(0xdfe8ff, 2.4, 0.25); cl.position.set(21.4, 2.6, 19.0); g.add(cl);
      items.push({ pos: [21.4, 2.4, 18.6], label: 'Touch a Zikhron story core', lines: [['tale', 'Cold, then warm. For a moment you are somewhere else — a long hall of shelves, and someone singing to the stone so it will remember.'], ['tanoc', 'Memory, he said. Stone remembers.']] });
      items.push({ pos: [12.8, 1.4, 3.2], label: 'Read a book from the shelf', book: true });
      items.push({ pos: [9.2, 2.6, 12], label: 'Look at the map of the Tatu', lines: [['tale', 'Velki, Xikia, Pia’don — the three, drawn by a careful hand. Red pins in places nobody goes. One pin, right here, on the lake.'], ['tanoc', 'He’s been everywhere. He says he hasn’t.']] });
      lamp(g, 17, 3.8, 10, 0xffc878, 34, 20);

      /* ---- the kitchen: the range, a scrubbed table, pans, herbs drying, a pantry of jars ---- */
      // the range: a stone hearth with an iron stove in it and a great hood
      box(g, -19, 1.0, -19.2, 6, 2.0, 1.4, '#9a8a78', true); box(g, -19, 3.6, -19.4, 6.4, 3.2, 1.2, '#8a7a68', false, { shadow: false });
      box(g, -19, 2.15, -18.7, 6.6, 0.3, 2.0, '#6a4428', false);
      box(g, -19, 1.2, -18.48, 2.4, 1.0, 0.1, '#2a2a2e', false, { outline: false });
      const kf = glowSprite(0xff8a3a, 1.4, 0.9); kf.position.set(-19, 1.0, -18.3); g.add(kf); flickers.push(kf);
      const kl = new THREE.PointLight(0xff8a3a, 7, 12, 1.6); kl.position.set(-19, 1.6, -17.6); g.add(kl);
      cyl(g, -20.6, 2.1, -18.9, 0.35, 0.3, 0.45, '#2a2a2e', false, 12); cyl(g, -17.4, 2.05, -18.9, 0.4, 0.4, 0.3, '#8a5a3a', false, 12);
      const ks = glowSprite(0xffffff, 0.9, 0.25); ks.position.set(-20.6, 2.6, -18.9); g.add(ks); flickers.push(ks);
      // pans on a rail, herbs from the beams
      box(g, -19, 3.1, -18.55, 5.6, 0.06, 0.06, '#3a3a3a', false, { outline: false });
      for (let k = 0; k < 7; k++) { const x = -21.6 + k * 0.85; box(g, x, 2.8, -18.5, 0.03, 0.5, 0.03, '#3a3a3a', false, { outline: false }); cyl(g, x, 2.5, -18.45, 0.24 - (k % 3) * 0.04, 0.24 - (k % 3) * 0.04, 0.06, k % 2 ? '#a8603a' : '#4a4a50', false, 12, { rx: Math.PI / 2 }); }
      for (let k = 0; k < 10; k++) { const x = -26 + k * 1.6; for (let q = 0; q < 2; q++) put(CONE, x + q * 0.3, HN - 0.75, -10 + q * 0.4, 0.14, 0.5, 0.14, ['#6a8a3a', '#8a9a4a', '#5a7a3a', '#a8783a'][(k + q) % 4], { rx: Math.PI }); }
      table(g, -19, -10, 4.6, 1.8, 0, 0, '#c8a070');
      for (const [x, z] of [[-20.5, -10.2], [-17.6, -9.7]]) { cyl(g, x, 1.0, z, 0.36, 0.24, 0.24, '#e8d8b8', false, 12); }
      put(SPHERE, -19.2, 1.02, -10, 0.36, 0.16, 0.28, '#e8d0a0'); box(g, -18.4, 0.95, -10.4, 0.5, 0.04, 0.25, '#9a6a40', false);
      for (let k = 0; k < 3; k++) { put(SPHERE, -21 + k * 0.25, 1.0, -10.6, 0.1, 0.1, 0.1, ['#e85a3a', '#f2d24a', '#7ab04a'][k], { outline: false }); }
      for (const [x, z, ry] of [[-21.6, -11.4, Math.PI], [-16.4, -11.4, Math.PI], [-21.6, -8.6, 0], [-16.4, -8.6, 0]]) chair(g, x, z, ry, 0, '#9a6a40');
      // the pantry wall: shelves of jars, crocks below, sacks and a flour bin
      for (let row = 0; row < 4; row++) { box(g, -27.6, 0.6 + row * 0.7, -6, 0.7, 0.06, 6, '#6a4428', row === 0, { shadow: false }); for (let k = 0; k < 10; k++) if (R() < 0.8) jar(g, -27.55, 0.63 + row * 0.7, -8.6 + k * 0.55, ['#c8603a', '#e8c84a', '#6a8a3a', '#8a3a5a', '#d8d0c0'][Math.floor(R() * 5)]); }
      box(g, -27.75, 1.6, -6, 0.2, 3.2, 6.2, '#5a3a22', true, { shadow: false });
      for (let k = 0; k < 4; k++) sack(g, -26.6 + (k % 2) * 0.7, -1 + Math.floor(k / 2) * 0.8);
      barrel(g, -12, -18.8); barrel(g, -12.9, -18.9); crate(g, -11.6, -17.6, 0.7);
      // the basin under the window
      box(g, -27.3, 0.5, -15, 1.0, 1.0, 2.4, '#8a8478', true); box(g, -27.3, 1.0, -15, 0.8, 0.06, 1.8, '#4a6a7a', false, { outline: false });
      lamp(g, -19, 4.2, -9, 0xffc878, 36, 20);
      items.push({ pos: [-19, 1.6, -17.8], label: 'Look at the range', lines: [['tale', 'A pot of porridge keeping warm at the back, a kettle that has boiled dry twice this morning, and a loaf proving under a cloth.'], ['tanoc', 'He cooks like he builds. Slowly, and then all at once.']] });
      items.push({ pos: [-27, 1.4, -6], label: 'Look along the pantry shelves', lines: [['tale', 'Jars with labels in his square hand: ZAHREH HONEY. PICKLED KOFI ROOT. DO NOT EAT (TANOC). DO NOT EAT (EITHER OF US).']] });
      items.push({ pos: [-20.5, 1.1, -10.2], label: 'Take a Zahreh bun from the bowl', give: 'bun', once: true });

      /* ---- the token room: cases of tokens, the house's long collection, one great token under its own light ---- */
      rug(g, 0, -9, 4, 16, 0x3a2a4a);
      const TOK = ['#7a5a8a'];   // all of a piece: stygian-set wood, no rainbow
      // wall cabinets of little tokens, row on row, each on its pin
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
        const z = -16.5 + k * 4.3, x = s * 9.55;
        box(g, x, 2.6, z, 0.5, 3.4, 3.0, '#6a4428', true, { shadow: false }); box(g, x - s * 0.24, 2.6, z, 0.04, 3.0, 2.6, '#2a1a2a', false, { outline: false });
        for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) token(g, x - s * 0.3, 1.3 + r * 0.6, z - 1.0 + c * 0.5, TOK[(r * 5 + c + k * 3) % TOK.length], 0.9, true, -s * Math.PI / 2);
        const gm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.2, 2.8), glassMat); gm.position.set(x - s * 0.36, 2.6, z); gm.renderOrder = 2; g.add(gm);
      }
      // cases down the middle, tokens on velvet, a card by each
      for (const z of [-15.5, -11, -6.5]) for (const x of [-4.2, 4.2]) {
        glassCase(g, x, z, 2.6, 1.4);
        for (let k = 0; k < 6; k++) token(g, x - 0.9 + (k % 3) * 0.9, 1.0, z - 0.3 + Math.floor(k / 3) * 0.6, TOK[Math.floor(R() * TOK.length)], 1.3);
        box(g, x, 0.98, z + 0.62, 0.4, 0.02, 0.16, '#f0e8d0', false, { outline: false });
      }
      // the great token, under glass on a plinth, in a shaft of light from the lantern-roof
      cyl(g, 0, 0.6, -17.2, 0.9, 1.1, 1.2, '#8a7a68', true, 12); cyl(g, 0, 1.25, -17.2, 0.95, 0.95, 0.1, '#c8a040', false, 16);
      token(g, 0, 1.6, -17.2, '#b48aff', 4.2, true, 0);
      const bigGlow = glowSprite(0xb48aff, 2.6, 0.6); bigGlow.position.set(0, 1.6, -16.9); g.add(bigGlow); flickers.push(bigGlow);
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.4, 16, 1, true), glassMat); bell.position.set(0, 1.95, -17.2); bell.renderOrder = 2; g.add(bell);
      glowPane(0, HTK - 0.02, -10, 5, 0.04, 9, '#fff4d8');                                           // the lantern-roof: daylight
      for (let k = -2; k <= 2; k++) box(g, k * 1.2, HTK - 0.08, -10, 0.12, 0.12, 9.2, TRIM, false, { shadow: false, outline: false });
      const shaft = glowSprite(0xfff0d0, 7, 0.14); shaft.position.set(0, 4, -12); g.add(shaft);
      // banners between the cabinets, and a long bench
      for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { const z = -14.3 + k * 8.6 + 2.15; box(g, s * 9.55, 5.4, z, 0.05, 2.2, 1.0, s > 0 ? '#5a2a6a' : '#2a4a6a', false, { outline: false }); token(g, s * 9.5, 5.6, z, '#f2d24a', 1.6, true, -s * Math.PI / 2); }
      box(g, 0, 0.45, -2.2, 3.6, 0.12, 0.7, '#7a4e2c', true); for (const x of [-1.5, 1.5]) box(g, x, 0.22, -2.2, 0.1, 0.44, 0.6, '#5a3a22', false, { outline: false });
      lamp(g, 0, 5.5, -9, 0xd8c8ff, 34, 22);
      items.push({ pos: [-4.2, 1.4, -11], label: 'Look at the tokens in the cases', lines: [['tale', 'Tokens by the hundred, each on its pin, each with a card in the same square hand: a creature’s name, a place, a year. Some of the years are very old.'], ['tanoc', 'One creature each. Not the kind — the one. He said that like it mattered more than anything.']] });
      items.push({ pos: [0, 1.9, -16.4], label: 'Look at the great token under the glass', lines: [['tale', 'Bigger than your hand, and violet all through, as if the stygian in it never cooled. The card beside it is blank.'], ['tanoc', 'He won’t say what it is. He says some songs you only sing once.']] });

      /* ---- the storeroom: the house's odds and ends, and the way through to the workshop ---- */
      for (let k = 0; k < 4; k++) for (let r = 0; r < 3; r++) { box(g, 12 + k * 3.8, 0.55 + r * 1.3, -19.4, 3.4, 0.08, 1.0, '#6a4428', r === 0, { shadow: false }); for (let q = 0; q < 3; q++) if (R() < 0.75) { if (R() < 0.5) crate(g, 11 + k * 3.8 + q * 1.0, -19.4, 0.55 + R() * 0.25, 0.59 + r * 1.3); else jar(g, 11 + k * 3.8 + q * 1.0, 0.59 + r * 1.3, -19.4, '#a8603a'); } }
      for (const [x, z] of [[12, -6], [12.9, -5.4], [12.3, -4.6], [26.6, -18], [26.6, -16.9]]) barrel(g, x, z);
      for (let k = 0; k < 6; k++) crate(g, 20 + (k % 3) * 0.95, -13 + Math.floor(k / 3) * 0.95, 0.9, 0, (R() - 0.5) * 0.3);
      crate(g, 21, -12.6, 0.7, 0.9); crate(g, 20.4, -13, 0.6, 0.9, 0.4);
      for (let k = 0; k < 5; k++) sack(g, 15 + k * 0.7, -1);
      // old furniture under dust sheets, spare lanterns, a coil of rope, a chest
      put(DOME, 25, 0, -2, 1.0, 1.4, 0.8, '#e8e0d0'); put(DOME, 23.6, 0, -1.5, 0.7, 0.9, 0.7, '#e0d8c8');
      for (let k = 0; k < 4; k++) { box(g, 11 + k * 0.6, 3.9, -19.7, 0.3, 0.42, 0.3, '#3a2a1a', false); glowPane(11 + k * 0.6, 3.9, -19.55, 0.2, 0.3, 0.02, '#c8a060'); }
      cyl(g, 16, 0.15, -6.5, 0.6, 0.6, 0.3, '#c8b080', false, 14);
      box(g, 22.5, 0.45, -8.5, 1.6, 0.9, 0.9, '#6a3a22', true); box(g, 22.5, 0.95, -8.5, 1.65, 0.1, 0.95, '#c8a040', false, { outline: false });
      lamp(g, 19, 4.4, -9, 0xffc070, 24, 16);
      items.push({ pos: [22.5, 1.0, -8.5], label: 'Look in the old chest', lines: [['tale', 'Folded inside: a child’s coat, very small, very fine, the kind of cloth nobody in Beuhk could afford. A name-tag has been carefully unpicked.']] });

      /* ---- the covered way: flagstones, windows both sides, a bench, his work-coat on a peg ---- */
      box(g, 32, 0.45, -8.4, 3, 0.12, 0.6, '#7a4e2c', true); for (const x of [30.8, 33.2]) box(g, x, 0.22, -8.4, 0.1, 0.44, 0.5, '#5a3a22', false, { outline: false });
      pegs(g, 'x', -3.0, 30, 4, 2.0, -1); box(g, 30.5, 1.4, -3.25, 0.7, 1.2, 0.12, '#7a5a3a', false); hat(g, 31.0, 1.85, -3.35, '#5a3018');
      { const s = glowSprite(0xffc070, 1.4, 0.7); s.position.set(32, 3.6, -6); g.add(s); }

      /* ---- the workshop ---- */
      const WS = { x0: 36, x1: 62, z0: -20, z1: 8 };
      // roof trusses
      for (let k = 0; k < 5; k++) { const z = -17 + k * 5.5; box(g, 49, 7.2, z, 26, 0.4, 0.4, '#5a3a22', false, { shadow: false }); for (const q of [-1, 1]) box(g, 49 + q * 6.5, 6.5, z, 13.4, 0.3, 0.3, '#5a3a22', false, { rz: q * 0.18, shadow: false }); box(g, 49, 6.4, z, 0.3, 1.6, 0.3, '#5a3a22', false, { shadow: false }); }
      glowPane(49, 7.55, -6, 4, 0.04, 2.6, '#fff4d8'); const sky = glowSprite(0xfff0d0, 6, 0.14); sky.position.set(49, 5.5, -6); g.add(sky);
      // two great benches with vises, tools and shavings
      for (const [x, z] of [[42.5, -9], [49.5, -9]]) {
        box(g, x, 0.92, z, 4.4, 0.22, 1.6, '#9a6a40', true);
        for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(g, x + a * 2.0, 0.42, z + b * 0.65, 0.18, 0.84, 0.18, '#6a4428', false, { outline: false });
        box(g, x, 0.25, z, 4.0, 0.08, 1.3, '#7a4e2c', false, { outline: false });
        box(g, x - 1.9, 1.15, z + 0.75, 0.5, 0.3, 0.3, '#4a4a50', false); cyl(g, x - 1.9, 1.2, z + 1.05, 0.03, 0.03, 0.6, '#8a8a90', false, 6, { rz: Math.PI / 2 });
        box(g, x - 0.6, 1.08, z, 0.8, 0.1, 0.25, '#b8b0a8', false); box(g, x + 0.6, 1.1, z + 0.3, 0.12, 0.16, 0.6, '#6a4428', false);
        box(g, x + 1.3, 1.06, z - 0.4, 1.8, 0.06, 0.3, '#d8b080', false, { outline: false });
        for (let k = 0; k < 9; k++) put(halfTorus(0.12, 0.03), x + (R() - 0.5) * 3.6, 1.06, z + (R() - 0.5) * 1.2, 1, 1, 1, '#e8c890', { rx: -Math.PI / 2 + (R() - 0.5), ry: R() * 6, outline: false });
        for (let k = 0; k < 14; k++) put(halfTorus(0.12, 0.03), x + (R() - 0.5) * 4, 0.03, z + (R() - 0.5) * 2.6, 1, 1, 1, '#e8c890', { rx: -Math.PI / 2, ry: R() * 6, outline: false });
      }
      // the tool wall: a pegboard of saws, chisels, mallets and squares
      box(g, 46, 2.8, -19.75, 12, 2.6, 0.1, '#b8905a', false, { shadow: false, outline: false });
      for (let k = 0; k < 22; k++) tool(g, 40.6 + k * 0.5, 2.0 + (k % 2) * 1.2, -19.6, k % 4);
      for (let k = 0; k < 6; k++) tool(g, 41 + k * 1.9, 3.6, -19.6, 0);
      // the lumber rack: boards on brackets up the east wall
      for (let r = 0; r < 4; r++) { for (const z of [-14, -8, -2]) box(g, 61.6, 0.8 + r * 1.2, z, 0.8, 0.1, 0.12, TRIM, false, { outline: false }); for (let k = 0; k < 3; k++) box(g, 61.4 - k * 0.25, 0.92 + r * 1.2 + k * 0.08, -8, 0.2, 0.08, 14, WOOD[(r + k) % 4], false); }
      world.col.add(g.position.x + 61.4, -8, 0.6, 7, 0, 0, 5);
      // the half-built boat, ribs on a keel on trestles
      const BZ = -1.2;
      for (const z of [BZ - 2.9, BZ + 2.9]) { box(g, 48.5, 0.45, z, 2.2, 0.12, 0.3, '#7a4e2c', false); for (const q of [-0.9, 0.9]) box(g, 48.5 + q, 0.22, z, 0.12, 0.44, 0.28, '#5a3a22', false, { outline: false }); }
      box(g, 48.5, 0.62, BZ, 0.3, 0.24, 8.4, '#8a5a36', true);
      for (let k = 0; k < 7; k++) { const z = BZ - 3.5 + k * 1.15, s = 1 - Math.pow((k - 3) / 4, 2) * 0.55; put(halfTorus(1.5 * s, 0.09), 48.5, 0.7 + 1.5 * s, z, 1, 1, 1, '#9a6a40', { rz: Math.PI }); }
      for (const q of [-1, 1]) box(g, 48.5 + q * 1.35, 1.9, BZ, 0.1, 0.12, 7.6, '#b07a48', false, { rz: q * 0.1 });
      box(g, 48.5, 1.2, BZ + 4.3, 0.25, 1.4, 0.25, '#8a5a36', false, { rx: -0.3 });
      // sawhorses with a board across, a shave-horse, a grindstone, a cradle half made
      for (const x of [40, 42.6]) { box(g, x, 0.75, 2.5, 0.16, 0.16, 1.4, '#7a5232', false); for (const q of [-0.5, 0.5]) for (const s of [-1, 1]) box(g, x + s * 0.25, 0.38, 2.5 + q, 0.08, 0.8, 0.08, '#6a4428', false, { rz: s * 0.3, outline: false }); }
      box(g, 41.3, 0.88, 2.5, 3.6, 0.08, 0.5, '#c8a070', false); world.col.add(g.position.x + 41.3, 2.5, 1.9, 0.8, 0, 0, 0.9);
      box(g, 55, 0.55, 3.5, 0.4, 0.12, 2.4, '#7a5232', true); box(g, 55, 0.85, 3.0, 0.35, 0.5, 0.12, '#7a5232', false, { rx: 0.4 });
      cyl(g, 59.5, 0.9, 4.5, 0.5, 0.5, 0.14, '#a8a094', false, 16, { rz: Math.PI / 2 }); box(g, 59.5, 0.45, 4.5, 0.6, 0.9, 0.3, '#6a4428', true);
      box(g, 38.5, 0.6, -3, 1.6, 0.6, 0.9, '#a8784a', true); for (const q of [-1, 1]) put(halfTorus(0.5, 0.05), 38.5 + q * 0.75, 0.55, -3, 1, 1, 1, '#8a5a36', { ry: Math.PI / 2, rz: Math.PI });
      // the forge and the stygian anvil, cold and violet, on the west side
      box(g, 37.6, 0.7, -14, 2.2, 1.4, 2.6, '#8a6a5a', true); box(g, 37.6, 1.42, -14, 1.6, 0.06, 1.8, '#2a1a10', false, { outline: false });
      box(g, 37.2, 4.2, -14, 1.4, 5.6, 1.6, '#7a5a4a', false, { shadow: false }); box(g, 37.8, 2.3, -14, 2.4, 1.0, 2.6, '#6a4a3a', false, { rz: -0.4 });
      const forge = glowSprite(0xff7a2a, 1.6, 0.85); forge.position.set(37.8, 1.5, -14); g.add(forge); flickers.push(forge);
      const fl = new THREE.PointLight(0xff7a2a, 8, 12, 1.6); fl.position.set(38.4, 2.0, -14); g.add(fl);
      box(g, 38.5, 1.0, -16.2, 1.0, 0.5, 0.6, '#6a3a22', false, { rz: 0.2 });   // the bellows
      box(g, 40.6, 0.6, -14, 1.2, 1.2, 0.8, '#3a3446', true, { mat: { emissive: 0x3a1a6a, emissiveIntensity: 0.4 } });
      box(g, 40.6, 1.28, -14, 1.5, 0.16, 0.7, '#4a4458', false, { mat: { emissive: 0x3a1a6a, emissiveIntensity: 0.5 } });
      cyl(g, 39.2, 0.45, -11.4, 0.45, 0.42, 0.9, '#5a4a3a', true); box(g, 39.2, 0.88, -11.4, 0.7, 0.02, 0.7, '#3a5a6a', false, { outline: false });
      for (let k = 0; k < 4; k++) box(g, 36.4, 1.6 + k * 0.4, -10.5, 0.08, 0.06, 1.0, '#3a3a40', false, { outline: false });
      // ---- the token bench, in the north-east corner: an Okid'Relic stand, a stygian crucible, a little shelf of tokens ----
      const TB = MANOR_SPOTS.tokenBench, bx = TB.top.x, bz = TB.top.z;
      box(g, bx, 0.92, bz, 2.6, 0.1, 1.0, '#6a4428', true);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(g, bx + a * 1.2, 0.44, bz + b * 0.4, 0.12, 0.88, 0.12, '#4a2a14', false, { outline: false });
      box(g, bx, 0.975, bz + 0.05, 0.9, 0.012, 0.7, '#3a2a4a', false, { outline: false });     // a cloth, where the work goes
      // the Okid'Relic stand: a carved fork on a foot, holding the empty cradle
      cyl(g, bx - 0.9, 1.0, bz - 0.15, 0.18, 0.22, 0.08, '#5a3a22', false, 12); box(g, bx - 0.9, 1.2, bz - 0.15, 0.05, 0.36, 0.05, '#6a4428', false, { outline: false });
      for (const q of [-1, 1]) box(g, bx - 0.9 + q * 0.09, 1.42, bz - 0.15, 0.04, 0.16, 0.04, '#6a4428', false, { rz: q * 0.4, outline: false });
      put(geoOf('tor1', () => new THREE.TorusGeometry(1, 0.2, 6, 16)), bx - 0.9, 1.5, bz - 0.15, 0.13, 0.13, 0.13, '#c8a060', { rx: Math.PI / 2 });
      // the crucible: black-violet, on a little brazier, with stygian glowing in it
      cyl(g, bx + 0.85, 1.0, bz - 0.1, 0.16, 0.2, 0.1, '#3a3a40', false, 10);
      cyl(g, bx + 0.85, 1.2, bz - 0.1, 0.22, 0.15, 0.3, '#2a2234', false, 12, { mat: { emissive: 0x2a1050, emissiveIntensity: 0.5 } });
      BT.glow.add(unitCyl(1, 12), bx + 0.85, 1.345, bz - 0.1, 0, 0, 0, 0.18, 0.02, 0.18, '#b48aff');
      const cg = glowSprite(0xb48aff, 0.9, 0.7); cg.position.set(bx + 0.85, 1.45, bz - 0.1); g.add(cg); flickers.push(cg);
      const ce = glowSprite(0xff8a3a, 0.4, 0.8); ce.position.set(bx + 0.85, 1.0, bz - 0.1); g.add(ce);
      box(g, bx + 0.5, 0.99, bz + 0.25, 0.3, 0.03, 0.06, '#9aa0a8', false, { ry: 0.5, outline: false });    // tongs
      // the little shelf of finished tokens over it, and the song-sheets pinned up
      box(g, bx, 2.0, -19.6, 2.4, 0.08, 0.36, '#6a4428', false); box(g, bx, 2.6, -19.6, 2.4, 0.08, 0.36, '#6a4428', false); for (const q of [-1.2, 1.2]) box(g, bx + q, 2.3, -19.65, 0.06, 0.7, 0.3, '#6a4428', false, { outline: false });
      for (let k = 0; k < 7; k++) token(g, bx - 1.0 + k * 0.33, 2.24, -19.5, TOK[(k * 3) % TOK.length], 1.1, true, 0);
      for (let k = 0; k < 4; k++) token(g, bx - 0.8 + k * 0.5, 2.84, -19.5, TOK[(k * 7 + 2) % TOK.length], 1.1, true, 0);
      for (let k = 0; k < 3; k++) box(g, bx - 0.9 + k * 0.9, 1.45, -19.72, 0.6, 0.8, 0.02, '#f0e8d0', false, { rz: (k - 1) * 0.06, outline: false });
      // a stool for the boy, an apron on a peg, a lamp of its own
      cyl(g, bx - 1.8, 0.62, bz + 1.0, 0.25, 0.25, 0.06, '#8a5a36', false, 10); for (let k = 0; k < 3; k++) box(g, bx - 1.8 + Math.cos(k * 2.1) * 0.15, 0.3, bz + 1.0 + Math.sin(k * 2.1) * 0.15, 0.05, 0.6, 0.05, '#6a4428', false, { outline: false });
      pegs(g, 'z', 61.8, -18.5, 2, 2.0, -1); box(g, 61.7, 1.4, -18.5, 0.08, 1.1, 0.6, '#8a7a5a', false);
      lamp(g, bx, 2.6, bz + 0.3, 0xffd8a0, 18, 9);
      // lamps over the benches
      for (const x of [42.5, 49.5]) { box(g, x, 6.3, -9, 0.03, 1.8, 0.03, '#2a2a2a', false, { outline: false }); cyl(g, x, 5.35, -9, 0.15, 0.45, 0.3, '#4a4a40', false, 10); }
      lamp(g, 42.5, 5.1, -9, 0xffd090, 34, 22); lamp(g, 50, 5.1, -2, 0xffd090, 34, 22);
      items.push({ pos: [42.5, 1.2, -9], label: 'Look at the workbench', lines: [['tale', 'Plane, chisels, a mallet worn to the shape of one particular hand. Curls of fire-tree shavings that smell like warm bread.']] });
      items.push({ pos: [40.6, 1.3, -13.4], label: 'Touch the cold violet anvil', lines: [['tale', 'Stygian. It hums very faintly, and the hum goes right up your arm into your hat.'], ['tanoc', 'He works soul-iron. Here. In a shed.']] });
      items.push({ pos: [48.5, 1.4, 0.5], label: 'Look at the half-built boat', lines: [['tale', 'Ribs on a keel, pegged and perfect. A note on the stem: "for the lake. For the boy, when he swims well enough to need rescuing less."']] });
      items.push({ pos: [bx, 1.3, bz + 0.2], label: 'Look at the token bench', lines: [['tale', 'A small bench of its own in the corner, scrubbed clean: an empty Okid’Relic cradle on its stand, a crucible with a little stygian keeping warm in it, a row of finished tokens on the shelf above.'], ['tanoc', 'He makes tokens here. Not the game kind he buys — real ones. Sung.']] });
      return {
        w: 56, d: 40, h: HT, cores, items, folk: [],
        spawn: [0, 15.6],
        entries: { workshop: { x: MANOR_SPOTS.workshopDoor.x, z: MANOR_SPOTS.workshopDoor.z, yaw: Math.PI } },
        exits: [{ x: 49, z: 7.6, door: 'p_workshop' }],
        spots: MANOR_SPOTS,
        extra: [{ pos: [24, H1 + 0.8, 3.7], label: 'Your bed in the loft', lines: [['tanoc', 'A real bed. With a quilt. Up here I can see the whole room — and out the window, the lake.']] }],
        upstairs(it) {
          /* ---- Buhkon's room, over the dining room ---- */
          const y = H1;
          rug(g, -18, 11, 7, 5, 0x5a3a2a, y);
          bed(g, -18, 3.75, 0, 0x6a2a2a, y, 2.4, 2.8);
          box(g, -18, y + 1.8, 2.3, 3.0, 1.6, 0.12, '#5a3a22', false); box(g, -18, y + 2.4, 2.38, 1.4, 0.5, 0.06, '#c8a040', false, { outline: false });
          for (const x of [-20.1, -15.9]) { box(g, x, y + 0.3, 2.8, 0.7, 0.6, 0.6, '#6a4428', true); candle(g, x, y + 0.6, 2.8); }
          box(g, -18, y + 0.35, 5.8, 1.8, 0.7, 0.7, '#6a3a22', true); box(g, -18, y + 0.72, 5.8, 1.85, 0.06, 0.75, '#c8a040', false, { outline: false });
          box(g, -27.3, y + 1.4, 18.4, 1.0, 2.8, 2.4, '#5a3a22', true); box(g, -26.78, y + 1.4, 18.4, 0.04, 2.5, 0.04, '#3a2414', false, { outline: false }); for (const q of [-0.5, 0.5]) box(g, -26.75, y + 1.5, 18.4 + q * 0.3, 0.06, 0.12, 0.06, '#c8a040', false, { outline: false });
          // his desk: plans, a square, a candle burnt right down
          table(g, -12, 18.2, 2.4, 1.1, 0, y, '#6a4428'); chair(g, -12, 17.0, 0, y);
          box(g, -12.3, y + 0.93, 18.2, 1.2, 0.01, 0.8, '#e8dcc0', false, { outline: false, ry: 0.1 }); box(g, -11.4, y + 0.94, 18.0, 0.5, 0.02, 0.04, '#c8c8d0', false, { outline: false }); candle(g, -11.1, y + 0.92, 18.5, 0.6);
          pegs(g, 'z', -27.8, 10.2, 4, y + 2.2, 1); hat(g, -27.55, y + 2.05, 10.7); hat(g, -27.55, y + 2.05, 11.7, '#6a3a22');
          shelf(g, -8.6, 13, -Math.PI / 2, R, 2.0, 2.2, 3, y);
          for (let k = 0; k < 4; k++) token(g, -27.4, y + 1.2, 12.6 + k * 0.4, ['#f2d24a', '#5ad0ff', '#e85a3a', '#8affb0'][k], 1.2);
          box(g, -27.4, y + 1.1, 13.2, 0.6, 0.06, 1.8, '#6a4428', false);
          plant(g, -26.8, 3.3, y, 0.9);
          // a tapestry of the lake on the east wall, a rocking chair by the window, books stacked by the bed
          box(g, -8.3, y + 2.6, 13, 0.06, 2.6, 3.6, '#3a5a6a', false, { outline: false }); box(g, -8.32, y + 2.2, 13, 0.06, 1.0, 3.4, '#4a7a5a', false, { outline: false }); put(SPHERE, -8.33, y + 3.3, 12.2, 0.02, 0.35, 0.35, '#f2d24a', { outline: false });
          box(g, -8.3, y + 3.95, 13, 0.14, 0.12, 4.0, '#6a4428', false);
          chair(g, -24, 16.6, Math.PI * 0.8, y, '#6a3a22'); for (const q of [-0.25, 0.25]) put(halfTorus(0.5, 0.03), -24 + q, y + 0.5, 16.6, 1, 0.3, 1, '#5a3a22', { ry: Math.PI * 0.8 + Math.PI / 2, rz: Math.PI });
          for (let k = 0; k < 4; k++) box(g, -15.2, y + 0.06 + k * 0.1, 2.9 + (k % 2) * 0.05, 0.42, 0.1, 0.3, BOOK[k], false, { ry: k * 0.2, outline: false });
          rug(g, -18, 4.5, 3.2, 1.1, 0x7a5a3a, y);
          lamp(g, -18, y + 3.6, 11, 0xffc070, 30, 18);
          it.push({ pos: [-12, y + 1.1, 18.2], label: 'Look at Buhkon’s desk', lines: [['tale', 'Drawings of a boat, every rib numbered. Underneath them, half hidden, a drawing of a boy in a hat — not very good, done over and over, as if he were practising.']] });
          it.push({ pos: [-18, y + 0.9, 5.8], label: 'Look at the chest at the foot of his bed', lines: [['tale', 'Locked. On the lid, burned into the wood very small, the same seal that hangs over the hearth downstairs.']] });
          /* ---- Tanoc's loft, over the library: the bed by the north wall, the big window to the lake ---- */
          rug(g, 18, 9, 6, 4.5, 0x2a4a6a, y);
          bed(g, MANOR_SPOTS.loftBed.x, MANOR_SPOTS.loftBed.z, 0, 0x2f6f8a, y);
          box(g, 26.2, y + 0.3, 3.0, 0.7, 0.6, 0.6, '#7a4e2c', true); candle(g, 26.2, y + 0.6, 3.0, 0.8);
          box(g, 19.6, y + 0.35, 2.9, 1.4, 0.7, 0.7, '#7a4e2c', true);                 // his chest
          // the window seat under the big window, with a cushion; a spyglass on the sill
          box(g, 27.2, y + 0.5, 11, 1.4, 1.0, 3.0, '#7a4e2c', true); box(g, 27.1, y + 1.06, 11, 1.2, 0.14, 2.8, '#c85a3a', false, { outline: false });
          cyl(g, 27.5, y + 2.1, 12.0, 0.05, 0.08, 0.7, '#c8a040', false, 8, { rz: Math.PI / 2 - 0.3 });
          // his desk: carvings, a whittling knife, a drawing of a Punk
          table(g, 15, 18.3, 2.2, 1.0, 0, y, '#8a5a36'); chair(g, 15, 17.2, 0, y);
          for (let k = 0; k < 5; k++) put(SPHERE, 14.2 + k * 0.36, y + 1.0, 18.4, 0.1, 0.12 + (k % 2) * 0.05, 0.14, ['#c89a6a', '#a8783a', '#d8b080', '#9a6a40', '#b88a5a'][k]);
          box(g, 15.6, y + 0.93, 18.1, 0.6, 0.01, 0.45, '#f0e8d0', false, { outline: false, ry: -0.2 });
          // a kite on the wall, a hat on a hook, a little shelf of treasures
          put(OCTA, 8.3, y + 2.8, 14, 0.06, 0.7, 0.5, '#e85a3a', { outline: false }); for (let k = 0; k < 4; k++) put(SPHERE, 8.32, y + 1.95 - k * 0.3, 14 + Math.sin(k) * 0.1, 0.05, 0.05, 0.05, ['#f2d24a', '#5a8ae8'][k % 2], { outline: false });
          pegs(g, 'z', 8.2, 9, 2, y + 2.2, 1); hat(g, 8.45, y + 2.05, 9.3, '#4a6a8a');
          box(g, 12, y + 1.6, 19.65, 2.4, 0.08, 0.36, '#6a4428', false);
          for (let k = 0; k < 5; k++) put(DOME, 11.1 + k * 0.45, y + 1.64, 19.6, 0.12, 0.14 + (k % 2) * 0.08, 0.12, ['#8a9aa8', '#e8c84a', '#6a8a4a', '#c86a5a', '#d8d8e0'][k]);
          plant(g, 9.2, 19, y, 0.7);
          // rafters, as if the roof came right down over him; drawings pinned up; a jar of fireflies; carved birds on threads
          for (let k = 0; k < 6; k++) { const z = 3.5 + k * 3.2; for (const q of [-1, 1]) box(g, 18 + q * 5, y + 4.25, z, 10.4, 0.18, 0.18, '#6a4428', false, { rz: q * 0.1, shadow: false }); }
          for (let k = 0; k < 6; k++) { const x = 12.5 + k * 1.3 + (k > 2 ? 3.2 : 0); box(g, x, y + 2.3 + (k % 2) * 0.35, 2.24, 0.9, 0.7, 0.02, ['#f0e8d0', '#e8dcc0', '#f4ecd8'][k % 3], false, { rz: (k % 3 - 1) * 0.08, outline: false }); box(g, x + (k % 2 ? 0.1 : -0.15), y + 2.3 + (k % 2) * 0.35, 2.26, 0.4, 0.3, 0.01, ['#6a8a4a', '#c86a5a', '#5a7aa8', '#c8a040'][k % 4], false, { outline: false }); }
          cyl(g, 26.2, y + 0.75, 3.0, 0.11, 0.12, 0.3, '#dff4ff', false, 10, { outline: false }); const ff = glowSprite(0xc8ff6a, 0.7, 0.8); ff.position.set(26.2, y + 0.78, 3.0); g.add(ff); flickers.push(ff);
          for (let k = 0; k < 4; k++) { const a = k * 1.57, bx2 = 18 + Math.cos(a) * 0.7, bz2 = 9 + Math.sin(a) * 0.7, by = y + 2.7 - (k % 2) * 0.4; box(g, bx2, (by + y + 4.2) / 2, bz2, 0.01, y + 4.2 - by, 0.01, '#d8c8a0', false, { outline: false }); box(g, bx2, by, bz2, 0.3, 0.06, 0.08, '#c89a6a', false, { ry: a }); box(g, bx2, by + 0.02, bz2, 0.06, 0.03, 0.4, '#a8783a', false, { ry: a, outline: false }); }
          box(g, 18, y + 4.2, 9, 1.6, 0.05, 0.05, '#6a4428', false, { outline: false });
          lamp(g, 19, y + 3.6, 10, 0xffc070, 30, 18);
          it.push({ pos: [27, y + 2.0, 11], label: 'Look out of the big window', lines: [['tale', 'The slope going down and down, the orchard, the lane, and the lake shining all the way to the far shore — and over it all, the Elder Tree, standing up into the sky like weather.'], ['tanoc', 'Nobody else has a window like this. Nobody.']] });
          it.push({ pos: [15, y + 1.1, 18.3], label: 'Look at your carvings', lines: [['tanoc', 'A Punk, a Kipsu, a Kofi with too many legs. He showed me how to hold the knife so it goes away from me. I still nick my thumb.']] });
        },
      };
    },
    workshop(g, R) {   // a stand-alone workshop, for any world that has one that isn't joined to a house
      const w = 18, d = 13, h = 5.5;
      shell(g, R, { w, d, h, wall: '#c8a878', floor: '#8a6a4a' });
      for (const [x, z] of [[-4, -3], [3, -3]]) {
        box(g, x, 0.9, z, 3.6, 0.2, 1.4, '#9a6a40', true);
        for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(g, x + a * 1.6, 0.4, z + b * 0.55, 0.15, 0.8, 0.15, '#6a4428', false, { outline: false });
        box(g, x - 0.8, 1.05, z, 0.8, 0.1, 0.25, '#b8b0a8', false); box(g, x + 0.6, 1.08, z + 0.3, 0.12, 0.16, 0.6, '#6a4428', false);
      }
      for (let k = 0; k < 9; k++) tool(g, -6 + k * 1.4, 2.6, -d / 2 + 0.12, k % 4);
      box(g, 6.5, 0.6, 4, 1.2, 1.2, 0.8, '#3a3446', true, { mat: { emissive: 0x3a1a6a, emissiveIntensity: 0.4 } });
      lamp(g, -4, h - 0.8, -2); lamp(g, 4, h - 0.8, 2);
      hearth(g, -w / 2 + 0.5, 3, Math.PI / 2);
      return { w, d, h, folk: [], items: [{ pos: [-4, 1.1, -3], label: 'Look at the workbench', lines: [['tale', 'Plane, chisels, a mallet worn to the shape of one particular hand.']] }] };
    },

    /* ======== the barn: the threshing floor, the stalls, a tack room, a feed room, and the hayloft over it all ======== */
    barn(g, R) {
      const w = 24, d = 20, h = 10, LY = 4.6, WC = '#8a3a2a';
      floorRect(g, -w / 2, w / 2, -d / 2, d / 2, 0, '#8a7050');
      wall(g, 'x', -d / 2 - 0.2, -w / 2 - 0.4, w / 2 + 0.4, 0, h, WC); wall(g, 'x', d / 2 + 0.2, -w / 2 - 0.4, w / 2 + 0.4, 0, h, WC);
      wall(g, 'z', -w / 2 - 0.2, -d / 2, d / 2, 0, h, WC); wall(g, 'z', w / 2 + 0.2, -d / 2, d / 2, 0, h, WC);
      ceilRect(g, -w / 2, w / 2, -d / 2, d / 2, h, '#4a2a18', false);
      for (let k = 0; k < 5; k++) { const x = -10 + k * 5; box(g, x, h - 0.6, 0, 0.4, 0.4, d, '#4a2a18', false, { shadow: false }); for (const q of [-1, 1]) box(g, x, h - 2, q * 5, 0.3, 0.3, 10.6, '#4a2a18', false, { rx: q * 0.24, shadow: false }); }
      for (const x of [-6, 6]) for (const z of [-4.5, 4.5]) box(g, x, LY / 2, z, 0.45, LY, 0.45, '#6a4428', true);
      outDoor(g, 0, d / 2 - 0.05, 3.2, 3.8);
      for (const z of [-5, 3]) { win(g, 'z', -w / 2 + 0.02, z, 2.4, 1, 1.2, 1.2); win(g, 'z', w / 2 - 0.02, z, 2.4, -1, 1.2, 1.2); }
      // stalls along the west side
      for (let k = 0; k < 5; k++) { const z = -d / 2 + 1 + k * 3.6; box(g, -w / 2 + 3, 0.7, z, 0.2, 1.4, 0.2, '#6a4428', true); box(g, -w / 2 + 1.6, 0.9, z, 2.8, 1.8, 0.12, '#7a4e2c', true); box(g, -w / 2 + 1.6, 1.9, z, 2.8, 0.12, 0.16, '#5a3a22', false); }
      for (let k = 0; k < 4; k++) { const z = -d / 2 + 2.8 + k * 3.6; box(g, -w / 2 + 0.6, 0.4, z, 0.8, 0.5, 1.2, '#7a5232', true); box(g, -w / 2 + 1.6, 0.04, z, 2.2, 0.06, 2.8, '#d8c070', false, { outline: false }); }
      // the threshing floor: a cart, bales, a flail and pitchforks against a post
      for (let k = 0; k < 9; k++) box(g, 3.2 + (k % 3) * 1.3, 0.45 + Math.floor(k / 3) * 0.9, 7.6 - (k % 2) * 1.2, 1.2, 0.9, 0.9, '#d8b85a', true);
      box(g, -2, 1.0, 1, 2, 0.25, 3.4, '#8a5a36', true); for (const s of [-1, 1]) { box(g, -2 + s * 0.95, 1.4, 1, 0.1, 0.6, 3.4, '#7a4e2c', false); cyl(g, -2 + s * 1.15, 0.6, 1.8, 0.6, 0.6, 0.14, '#5a3a22', false, 12, { rz: Math.PI / 2 }); }
      for (let k = 0; k < 3; k++) box(g, 5.6 + k * 0.15, 1.3, -4.3, 0.05, 2.6, 0.05, '#8a6a40', false, { rz: 0.15 - k * 0.05, outline: false });
      // the tack room, east, behind a partition with a door
      wall(g, 'z', 7, -d / 2, -1, 0, 3.6, '#7a4e2c', [[-5, 1.4, 2.6]], 0.2); wall(g, 'x', -1, 7, w / 2, 0, 3.6, '#7a4e2c', [], 0.2);
      ceilRect(g, 7, w / 2, -d / 2, -1, 3.6, '#5a3a22', false);
      for (let k = 0; k < 4; k++) { box(g, 11.7, 1.4, -8.5 + k * 1.8, 0.4, 0.06, 0.06, TRIM, false); put(DOME, 11.4, 1.1, -8.5 + k * 1.8, 0.5, 0.3, 0.35, ['#6a3a22', '#7a4a2a', '#5a3018', '#8a5a36'][k], { rz: Math.PI / 2 }); }
      for (let k = 0; k < 6; k++) box(g, 8 + k * 0.5, 2.2, -9.75, 0.06, 1.2, 0.04, '#3a2414', false, { outline: false });
      table(g, 9.2, -3, 1.6, 0.8, 0, 0, '#7a5232'); box(g, 9.2, 0.95, -3, 0.5, 0.06, 0.3, '#c8a040', false); lamp(g, 9.5, 3.0, -5.5, 0xffc070, 16, 9);
      // the feed room: bins and sacks, east, south of the tack room
      for (let k = 0; k < 3; k++) { box(g, 11, 0.6, 1.5 + k * 1.6, 1.4, 1.2, 1.4, '#7a5232', true); box(g, 11, 1.22, 1.5 + k * 1.6, 1.3, 0.04, 1.3, ['#d8b85a', '#c8a050', '#e0c070'][k], false, { outline: false }); }
      for (let k = 0; k < 4; k++) sack(g, 10.4 + (k % 2) * 0.7, 6.6 + Math.floor(k / 2) * 0.7);
      // the loft, and a stair up to it
      box(g, 0, LY - 0.15, -5.5, w - 2, 0.3, 9, '#7a5232', true, { shadow: false });
      for (let x = -10.5; x <= 7.2; x += 0.6) box(g, x, LY + 0.45, -0.9, 0.08, 0.9, 0.08, '#6a4428', false, { outline: false });
      box(g, -1.65, LY + 0.95, -0.9, 17.9, 0.12, 0.16, TRIM, false); world.col.add(g.position.x - 1.65, -0.9, 8.95, 0.12, 0, LY, LY + 1.0);
      const st = []; for (let i = 0; i < 11; i++) st.push([w / 2 - 3.6, d / 2 - 2.2 - i * 0.85, 1.6, 0.85]);
      stairs(g, st, 0.42);
      for (let k = 0; k < 8; k++) box(g, -8 + k * 1.4, LY + 0.45 + (k % 3 === 0 ? 0.9 : 0), -d / 2 + 2, 1.2, 0.9, 0.9, '#d8b85a', true);
      for (let k = 0; k < 6; k++) box(g, -9 + k * 1.3, LY + 0.45, -d / 2 + 3, 1.2, 0.9, 0.9, '#e0c068', true);
      // the loft hideout: a blanket, a lantern, a little stash
      rug(g, 6, -4.5, 2.4, 1.6, 0x8a3a4a, LY);
      crate(g, 7.6, -5.6, 0.6, LY); put(SPHERE, 7.6, LY + 0.72, -5.6, 0.1, 0.1, 0.1, '#5aa0ff', { outline: false });
      for (let k = 0; k < 3; k++) put(SPHERE, 5 + k * 0.3, LY + 0.1, -3.6, 0.1, 0.08, 0.12, '#c89a6a');
      lamp(g, 6, LY + 1.6, -4.5, 0xffb060, 18, 12);
      lamp(g, 0, h - 1.5, 3, 0xffd090, 40, 30);
      box(g, 0, h - 2.4, -d / 2 + 0.05, 3, 3, 0.1, '#fff0c0', false, { outline: false, shadow: false });
      const sun = glowSprite(0xfff0c0, 7, 0.35); sun.position.set(0, h - 2.4, -d / 2 + 0.4); g.add(sun);   // the hay door, open to the sky
      return {
        w, d, h, folk: [],
        items: [
          { pos: [6, LY + 0.6, -4.5], label: 'Your loft hideout', lines: [['tanoc', 'Nobody can see up here. A fort. My fort.'], ['tale', 'You could keep things here. Amulets. Secrets. A Punk, if it would fit up the stair.']] },
          { pos: [-w / 2 + 2, 1, -d / 2 + 2.8], label: 'Look in the stall', lines: [['tale', 'Clean straw, a water trough, and a name burned over the door that has been carefully sanded off.']] },
          { pos: [10, 1.4, -6.5], label: 'Look round the tack room', lines: [['tale', 'Saddles for animals the farm doesn’t keep, oiled anyway, every week by the look of them. Somebody is waiting for somebody to come back.']] },
        ],
      };
    },

    /* ======== the tower: a stair winding up the walls past a reading landing to the lookout ======== */
    tower(g, R) {
      const w = 9, d = 9, h = 20;
      shell(g, R, { w, d, h, wall: '#a8784a', floor: '#7a5232' });
      // a stair winding round the inside walls, past a reading platform, to the lookout landing
      const st = [], rise = 0.42;
      let x = -w / 2 + 1.1, z = d / 2 - 2.6;
      const legs = [[0, -1, 5], [1, 0, 6], [0, 1, 6], [-1, 0, 6], [0, -1, 6], [1, 0, 6], [0, 1, 4]];
      for (const [dx, dz, n] of legs) for (let k = 0; k < n; k++) { st.push([x, z]); x += dx * 1.0; z += dz * 1.0; }
      st.forEach(([sx, sz], k) => { const top = (k + 1) * rise; box(g, sx, top - 0.15, sz, 1.6, 0.3, 1.6, k % 2 ? '#9a6a40' : '#a8784a', false); box(g, sx, top - 1.2, sz, 0.2, 2.0, 0.2, '#6a4428', false, { outline: false }); world.col.add(g.position.x + sx, sz, 0.8, 0.8, 0, top - 0.3, top); });
      const LY = st.length * rise, MY = 14 * rise;
      // the reading platform, off the third flight: a chair, a lamp, shelves waiting for books
      box(g, -0.4, MY - 0.15, -0.45, 4.4, 0.3, 3.7, '#8a5a36', true);
      for (let q = -2.2; q <= 1.6; q += 0.5) box(g, q, MY + 0.45, 1.35, 0.07, 0.9, 0.07, '#6a4428', false, { outline: false });
      box(g, -0.3, MY + 0.92, 1.35, 4.0, 0.1, 0.12, TRIM, false); world.col.add(g.position.x - 0.3, 1.35, 2.0, 0.1, 0, MY, MY + 1);
      box(g, -2.5, MY + 0.45, -0.45, 0.1, 0.9, 3.6, TRIM, false); world.col.add(g.position.x - 2.55, -0.45, 0.1, 1.8, 0, MY, MY + 1);
      armchair(g, -1.4, -1.3, Math.PI * 0.75, 0x5a3a6a, MY);
      box(g, 0.4, MY + 0.3, -2.0, 0.6, 0.6, 0.6, '#6a4428', false); candle(g, 0.4, MY + 0.6, -2.0); book(g, 0.25, MY + 0.6, -1.85, 0.4, 0x2a4a7a, true);
      lamp(g, -0.4, MY + 2.4, -0.4, 0xffc070, 20, 12);
      // the top landing
      box(g, w / 4, LY - 0.15, 2.55, w / 2, 0.3, 3.9, '#8a5a36', true);
      box(g, w / 4, LY + 1.2, d / 2 - 0.3, 3.6, 2.2, 0.4, '#6a4428', false);
      for (let k = 0; k < 3; k++) box(g, w / 4 - 1.4 + k * 1.4, LY + 0.5 + k * 0.3, d / 2 - 0.5, 0.3, 0.4, 0.3, BOOK[k], false);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.0), new THREE.MeshBasicMaterial({ color: 0xbfe0ff })); pane.position.set(w / 2 - 0.05, LY + 1.6, 2.75); pane.rotation.y = -Math.PI / 2; g.add(pane);
      cyl(g, w / 2 - 0.9, LY + 1.2, 1.4, 0.06, 0.1, 1.0, '#c8a040', false, 8, { rz: 1.1 }); for (const q of [-1, 1]) box(g, w / 2 - 0.9 + q * 0.2, LY + 0.5, 1.4, 0.04, 1.0, 0.04, '#5a3a22', false, { rz: q * 0.3, outline: false });
      // the ground room: a map table, a sea-chest, a coil of rope
      table(g, 0.6, -0.8, 2.2, 1.3); box(g, 0.6, 0.93, -0.8, 1.9, 0.01, 1.0, '#e8dcc0', false, { outline: false });
      crate(g, 2.6, 2.6, 0.7); cyl(g, -1.4, 0.15, 2.8, 0.45, 0.45, 0.3, '#c8b080', false, 14);
      lamp(g, 0, 3, 0, 0xffc070, 30, 20); lamp(g, w / 4, LY + 2.6, 2.75, 0xffc070, 30, 18);
      return {
        w, d, h, folk: [],
        items: [
          { pos: [w / 2 - 0.8, LY + 1, 2.75], label: 'Look out of the high window', lines: [['tale', 'The whole property below you: the house, the fields, the long slope down to the lake — and beyond it the Elder Tree, and away to the north the Warden, holding up the sky between them. The blue line of mountains, far off to the south.'], ['tanoc', 'Empty shelves. He said this tower will hold books one day.']] },
          { pos: [0.6, 1.1, -0.8], label: 'Look at the map on the table', lines: [['tale', 'The property, drawn from up here: every field, every fence-post. The two great trees are drawn very small at the edges, as if whoever drew it was a little afraid of them.']] },
          { pos: [-1.0, MY + 0.9, -1.0], label: 'Sit a while on the reading platform', lines: [['tanoc', 'Halfway up. Too high to hear the yard, too low to see the lake. A good place to be nobody for a bit.']] },
        ],
      };
    },

    /* ======== the boathouse: the boat bay over the water, a bunk room, the net loft ======== */
    boathouse(g, R) {
      const w = 14, d = 16, h = 6.4, WC = '#7a6a5a';
      floorRect(g, -w / 2, -1.4, -d / 2, d / 2, 0, '#6a5a4a'); floorRect(g, 3.6, w / 2, -d / 2, d / 2, 0, '#6a5a4a');
      // the slip: water in a channel down the middle, glowing faintly from below
      const water = new THREE.Mesh(new THREE.PlaneGeometry(5, d), new THREE.MeshToonMaterial({ color: 0x3a8aa8, emissive: 0x0e4a62, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 })); water.rotation.x = -Math.PI / 2; water.position.set(1.1, -0.5, 0); g.add(water);
      box(g, 1.1, -1.2, 0, 5, 0.2, d, '#2a4a52', false, { outline: false });
      world.col.add(g.position.x + 1.1, 0, 2.5, d / 2, 0, -2, 0.7);   // the slip: mind the edge
      for (const q of [-1, 1]) box(g, 1.1 + q * 2.55, 0.1, 0, 0.2, 0.2, d, '#4a3020', false);
      wall(g, 'x', -d / 2 - 0.2, -w / 2 - 0.4, w / 2 + 0.4, 0, h, WC, [[1.1, 4.6, 3.4]]);
      box(g, 1.1, 1.6, -d / 2 - 0.1, 4.4, 3.2, 0.1, '#bfe0ff', false, { outline: false, shadow: false });
      wall(g, 'x', d / 2 + 0.2, -w / 2 - 0.4, w / 2 + 0.4, 0, h, WC);
      wall(g, 'z', -w / 2 - 0.2, -d / 2, d / 2, 0, h, WC); wall(g, 'z', w / 2 + 0.2, -d / 2, d / 2, 0, h, WC);
      ceilRect(g, -w / 2, w / 2, -d / 2, d / 2, h, '#4a3a2a');
      outDoor(g, -4.2, d / 2 - 0.05, 1.5, 2.4);
      win(g, 'z', -w / 2 + 0.02, -4, 2.2, 1, 1.1, 1.2); win(g, 'z', w / 2 - 0.02, -4, 2.2, -1, 1.1, 1.2);
      // the boat in the slip, on the water
      const boat = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0x8a5a36, { side: THREE.DoubleSide }));
      boat.scale.set(1, 0.6, 3); boat.position.set(1.1, 0.2, -1); addOutline(boat, 0.02); g.add(boat);
      box(g, 1.1, -0.05, -1, 1.8, 0.06, 5.6, '#6a4428', false, { outline: false });
      for (const q of [-1.2, 0.8]) box(g, 1.1, -0.15, -1 + q, 1.8, 0.08, 0.4, '#9a6a40', false);
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { cyl(g, 1.1 + s * 2.4, 0.4, -6 + k * 4, 0.12, 0.12, 0.8, '#3a2a1a', false, 8); }
      // oars and nets, a workbench, a crate of floats
      for (let k = 0; k < 3; k++) box(g, 5 + k * 0.4, 2.0 + k * 0.5, d / 2 - 0.2, 3, 0.1, 0.1, '#a8784a', false);
      const net = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ color: 0x8a7a5a, wireframe: true })); net.position.set(-4, 2.4, -d / 2 + 0.1); g.add(net);
      table(g, 4.4, -6.8, 1.6, 0.9, 0, 0, '#7a5232'); for (let k = 0; k < 4; k++) put(SPHERE, 3.9 + k * 0.35, 1.0, -6.8, 0.12, 0.12, 0.12, ['#e85a3a', '#f4f0e8'][k % 2]);
      crate(g, 5, 2); barrel(g, 5.6, 4);
      // the bunk room, west, behind a partition
      wall(g, 'x', 1, -w / 2, -1.6, 0, 3.4, '#8a7a6a', [[-4.2, 1.3, 2.4]], 0.2);
      wall(g, 'z', -1.6, -d / 2, 1, 0, 3.4, '#8a7a6a', [], 0.2);
      ceilRect(g, -w / 2, -1.6, -d / 2, 1, 3.4, '#5a4a3a', false);
      bed(g, -5.8, -5, 0, 0x3a5a7a, 0, 1.2, 2.2); bed(g, -3.2, -5, 0, 0x7a3a2a, 0, 1.2, 2.2);
      box(g, -4.5, 0.3, -1, 1.0, 0.6, 0.6, '#6a4428', true); candle(g, -4.5, 0.6, -1);
      lamp(g, -4.5, 2.6, -3, 0xffc070, 14, 8);
      // the net loft, up a ladder
      box(g, 4.6, 3.6, 3.6, 4.6, 0.25, 8, '#7a5a3a', true, { shadow: false });
      const ld = []; for (let i = 0; i < 8; i++) ld.push([6.4, -5.6 + i * 0.7, 1.0, 0.7]);
      stairs(g, ld, 3.725 / 8);
      for (let k = 0; k < 4; k++) put(SPHERE, 3.4 + k * 0.7, 3.95, 5, 0.3, 0.25, 0.3, '#8a7a5a');
      lamp(g, 0, h - 0.8, 2, 0xffc070, 30, 20);
      return {
        w, d, h, folk: [], spawn: [-4.2, d / 2 - 2.5], out: [-4.2, d / 2 - 0.4],
        items: [
          { pos: [1.1, 1, -1], label: 'Look at the boat', lines: [['tale', 'A little round-bottomed lake boat, riding in her slip. Someone has carved a tiny acorn on the bow.']] },
          { pos: [-4.5, 1, -2], label: 'Look in the bunk room', lines: [['tale', 'Two bunks, made up tight. One quilt is blue, one red. The red one has a hat-shaped dent in the pillow.']] },
        ],
      };
    },

    /* ======== the woodshed: the log store, and a tool nook behind it ======== */
    woodshed(g, R) {
      const w = 10, d = 9, h = 3.8;
      shell(g, R, { w, d, h, wall: '#8a6a4a', floor: '#6a5a40' });
      for (let row = 0; row < 5; row++) for (let k = 0; k < 10; k++) cyl(g, -4 + k * 0.4 + (row % 2) * 0.2, 0.2 + row * 0.36, -d / 2 + 1, 0.18, 0.18, 1.4, row % 2 ? '#9a6a40' : '#7a4e2c', false, 7, { rx: Math.PI / 2 });
      world.col.add(g.position.x - 2, -d / 2 + 1, 2.1, 0.8, 0, 0, 1.8);
      // a partition, and the tool nook beyond
      wall(g, 'z', 2, -d / 2, 1, 0, h, '#7a5a3a', [[-1.5, 1.2, 2.3]], 0.2);
      for (let k = 0; k < 6; k++) tool(g, 3 + k * 0.55, 1.8 + (k % 2) * 0.6, -d / 2 + 0.15, k % 4);
      box(g, 4, 0.8, -1, 1.6, 0.1, 0.8, '#8a5a36', true); box(g, 4, 0.95, -1, 0.5, 0.2, 0.3, '#9aa0a8', false);
      cyl(g, 2.8, 0.4, 2.5, 0.45, 0.45, 0.8, '#8a5a36', true); box(g, 2.9, 1.1, 2.5, 0.06, 0.7, 0.06, '#6a4428', false, { rz: 0.5 }); box(g, 2.75, 0.88, 2.5, 0.3, 0.2, 0.05, '#9aa0a8', false, { rz: 0.5 });
      lamp(g, 0, h - 0.6, 0, 0xffc070, 18, 14);
      return { w, d, h, folk: [], items: [
        { pos: [2.8, 1, 2.5], label: 'Look at the chopping block', lines: [['tale', 'Notched by a thousand swings. A hatchet just like yours is sunk in the top of it, waiting.']] },
        { pos: [4, 1.2, -1], label: 'Look at the sharpening bench', lines: [['tale', 'A whetstone worn hollow in the middle, an oil can, and a row of edges so keen they make your eyes water to look at.']] },
      ] };
    },
  };

  function build(door) {
    const key = door.room || door.id;
    if (rooms.has(key)) { const r = rooms.get(key); rooms.set(door.id, r); return r; }
    const host = doors.find(d => d.id === key) || door;
    const g = new THREE.Group(); g.position.set(POCKET_X + (slot++) * ROOM_GAP, 0, 0); scene.add(g);
    const R = mulberry32(host.seed || (host.id.length * 7919 + 13));
    BT = { furn: new Batch(), struct: new Batch(), flat: new Batch(), glow: new Batch() };
    const info = (KINDS[host.kind] || KINDS.cottage)(g, R, host);
    if (info.extra) for (const it of info.extra) (info.items = info.items || []).push(it);
    if (info.upstairs) info.upstairs(info.items);
    // bake the batches: furniture casts shadows, the structure doesn't, the flat bits go without ink, the glass glows
    const bake = (b, mat, cast, ink) => { const m = b.mesh(mat); if (!m) return; m.castShadow = cast; m.receiveShadow = true; if (ink) addOutline(m, 0.025); g.add(m); };
    bake(BT.furn, toon(0xffffff, { vertexColors: true }), true, true);
    bake(BT.struct, toon(0xffffff, { vertexColors: true }), false, true);
    bake(BT.flat, toon(0xffffff, { vertexColors: true }), false, false);
    bake(BT.glow, new THREE.MeshBasicMaterial({ vertexColors: true }), false, false);
    BT = null;
    const folk = (info.folk || []).map(f => {
      const a = buildEikar(Object.assign({ weapon: 'none', flasks: false }, f.look)); a.root.position.set(g.position.x + f.x, 0, f.z); a.root.rotation.y = Math.PI; scene.add(a.root);
      world.col.add(g.position.x + f.x, f.z, 0.4, 0.4, 0, -1, 1.8);
      return { a, line: f.line, pos: new THREE.Vector3(g.position.x + f.x, 0, f.z) };
    });
    const sp = info.spawn || [0, info.d / 2 - Math.min(4, info.d * 0.3)], ou = info.out || [sp[0], info.d / 2 - 0.4];
    const room = { door: host, g, info, folk, spawn: new THREE.Vector3(g.position.x + sp[0], 0, sp[1]), out: new THREE.Vector3(g.position.x + ou[0], 0, ou[1]),
      exits: (info.exits || []).map(e => ({ pos: new THREE.Vector3(g.position.x + e.x, 0, e.z), door: e.door })),
      entries: info.entries || {}, flickers: flickers.splice(0),
      items: (info.items || []).map((it, i) => ({ ...it, id: host.id + ':' + i, pos: new THREE.Vector3(g.position.x + it.pos[0], it.pos[1], it.pos[2]) })) };
    g.visible = false; folk.forEach(f => { f.a.root.visible = false; });
    rooms.set(key, room); rooms.set(door.id, room);
    return room;
  }

  function show(room, on) { room.g.visible = on; room.folk.forEach(f => { f.a.root.visible = on; }); }

  return {
    get inside() { return inside; },
    doors,
    addDoors(list) { for (const d of list) doors.push(d); },
    isPocket: inPocket,
    room: id => rooms.get(id),
    /* a named spot in a building (e.g. 'tokenBench'), in world space: builds the room if it isn't yet.
       Returns { pos, yaw, top, buhkon, room, door } or null */
    spot(name, doorId) {
      const door = doorId ? doors.find(d => d.id === doorId) : doors.find(d => { const host = d.room ? doors.find(q => q.id === d.room) : d; return host && host.kind === 'manor'; });
      if (!door) return null;
      const room = build(door), s = room.info.spots && room.info.spots[name];
      if (!s) return null;
      const ox = room.g.position.x, v = p => p && new THREE.Vector3(ox + p.x, p.y || 0, p.z);
      return { pos: v(s.stand || s), yaw: s.yaw ?? Math.PI, top: v(s.top), buhkon: v(s.buhkon), room, door: (s.door && doors.find(d => d.id === s.door)) || door };
    },
    /* step in: returns where to stand and which way to face */
    enter(door) {
      const room = build(door);
      for (const r of new Set(rooms.values())) show(r, r === room);
      inside = door; exitVia = null;
      const e = door.entry && room.entries[door.entry];
      if (e) return { pos: new THREE.Vector3(room.g.position.x + e.x, 0, e.z), yaw: e.yaw ?? Math.PI, room };
      return { pos: room.spawn.clone(), yaw: Math.PI, room };
    },
    /* step out, in front of the door you leave by (the one you came in by, unless you chose another) */
    exit() {
      const d = exitVia || inside; inside = null; exitVia = null;
      for (const r of new Set(rooms.values())) show(r, false);
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
      const host = room.door;
      list.push({ pos: room.out.clone().setY(1), label: room.exits.length ? `Go outside <small style="opacity:.7">${host.name}</small>` : 'Go outside', act: () => { exitVia = host; act.exit(); }, far: 2.2 });
      for (const e of room.exits) {
        const d = doors.find(q => q.id === e.door); if (!d) continue;
        list.push({ pos: e.pos.clone().setY(1), label: `Go outside <small style="opacity:.7">${d.name}</small>`, act: () => { exitVia = d; act.exit(); }, far: 2.4 });
      }
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
      for (let i = 0; i < room.flickers.length; i++) { const s = room.flickers[i]; s.userData.s0 = s.userData.s0 || s.scale.x; s.scale.setScalar(s.userData.s0 * (1 + Math.sin(t * (7 + i) + i * 2.3) * 0.06 + Math.sin(t * 13.7 + i) * 0.03)); }
    },
  };
}
