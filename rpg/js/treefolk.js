/* ============================================================
   TREE FOLK — the people who live in a home tree, and the
   Kipsu that live with them.

   Eikar, Keilia and Karnen, going about their day inside the
   trunk: up and down the great stair, round the floors, across
   the bridges over the well, in and out of their rooms; buying
   at the stalls in the hall (the stallholders serve them),
   sitting on the benches round the hearth, warming their hands
   at it, leaning on the rail to look down the well, looking out
   of the openings, working at the tables and the looms, and
   stopping to talk to each other. A Kipsu or two trots after
   its owner, and waits at the door when they go in.

   Nobody walks into a wall: everyone keeps to the ways about
   the tree (a graph of the stair, the floors' rings, the
   bridges, and the short ways off them to every room, seat,
   stall and opening), keeps to their own side when they pass,
   and waits for whoever is in front of them.

   createTreeFolk(scene, tree, opts) → { update(dt, t, eye), panic(on) }
   The folk are only made the first time someone comes near the
   tree, and only moved while someone is near it.
   ============================================================ */
import * as THREE from 'three';
import { buildEikar, cartoon } from './actors.js';
import { buildKeilia, buildKarnen } from './npcs.js';
import { buildKipsu } from './esik_land.js';
import { FOLK_LOOKS } from './city.js';
import { mulberry32, dampAngle } from './util.js';

const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const angDiff = (p, q) => Math.atan2(Math.sin(p - q), Math.cos(p - q));
const CAPS = ['#5a3018', '#3a2414', '#6a4020', '#4a2a18', '#6a3a1a', '#2a1a0c', '#7a4a2a'];
const TUNICS = [0x5a6a8a, 0x8a4a3a, 0x4a7a5a, 0x7a6a4a, 0xd8b878, 0x6a3a6a, 0x3a6a8a, 0xa88a4a, 0x8a3a2a, 0x2f6f8a];
const KCLOTH = [0x4a5a34, 0x5a4a2a, 0x3a4a5a, 0x6a3a2a, 0x4a3a5a];

export function createTreeFolk(scene, T, opts = {}) {
  const rng = mulberry32(opts.seed ?? 5);
  const near = opts.near ?? T.reach + 70;          // made, a few at a time, once someone comes this close
  const seen = opts.seen ?? T.reach + 30;          // drawn and moved while they're this close (they're inside a trunk: there's no seeing them from further)
  let made = false, panicking = false, toMake = 0;
  const group = new THREE.Group(); group.visible = false; scene.add(group);

  /* ---------------- the ways about the tree ---------------- */
  const nodes = [];
  const node = (a, r, y, L) => { const n = { id: nodes.length, x: T.x + Math.cos(a) * r, y: T.g + y, z: T.z + Math.sin(a) * r, a, r, L, nb: [] }; nodes.push(n); return n; };
  const link = (p, q) => { const d = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z); p.nb.push([q, d]); q.nb.push([p, d]); };
  // a ring of nodes at radius r, with a node exactly at every angle something branches off it
  function ring(L, r, y, ports, step = 2.4) {
    const as = [...new Set(ports.map(a => ((a % TAU) + TAU) % TAU))].sort((p, q) => p - q);
    if (!as.length) as.push(0);
    const all = [];
    for (let i = 0; i < as.length; i++) {
      const a = as[i], b = i + 1 < as.length ? as[i + 1] : as[0] + TAU, n = Math.max(1, Math.floor((b - a) * r / step));
      for (let k = 0; k < n; k++) all.push(a + (b - a) * k / n);
    }
    const ns = all.map(a => node(a, r, y, L));
    for (let i = 0; i < ns.length; i++) link(ns[i], ns[(i + 1) % ns.length]);
    return a => ns.reduce((b, n) => Math.abs(angDiff(n.a, a)) < Math.abs(angDiff(b.a, a)) ? n : b);
  }
  // the places to go and what to do there: { n: node, face: yaw or point, act, dur: [min, max], L, pose }
  const spots = [];
  const spot = (n, act, face, dur, more = {}) => { const s = Object.assign({ n, act, face, dur, L: n.L, busy: null }, more); spots.push(s); return s; };
  const yawTo = (from, x, z) => Math.atan2(x - from.x, z - from.z);
  const H = T.hall, rh = T.rIn(0), door = T.door, st = T.stair;
  const ROOM_DUR = [14, 50];

  /* the hall */
  const hr = H.stalls.length ? Math.max(H.rs - 2.0, 6.6) : Math.max(6.6, rh * 0.45);
  const clearInHall = a => H.stalls.every(s => Math.abs(angDiff(a, s)) > 1.5 / H.rs + 0.12) && H.props.every(p => Math.abs(angDiff(a, p.a)) > 0.22);
  const hallRooms = H.rooms.filter(r => clearInHall(r.a) && Math.abs(angDiff(r.a, st.a0)) > 0.25);
  const hallPorts = [door.a, st.a0, ...H.stalls, ...H.hearths.map(h => h.a), ...H.benches.flatMap(b => [b.a - 0.6 / b.r, b.a + 0.6 / b.r]), ...hallRooms.map(r => r.a),
    ...H.props.filter(p => p.kind !== 1).map(p => p.a)];
  const hallAt = ring(-1, hr, 0.04, hallPorts);
  const inDoor = node(door.a, rh - 1.2, 0.04, -1); link(hallAt(door.a), inDoor);
  { const out = node(door.a, T.rAt(0.5, door.a) + 2.6, 0, -1); link(inDoor, out); spot(out, 'stand', door.a, [6, 14]); }   // on the doorstep, looking out
  for (const a of H.stalls) { const n = node(a, H.rs - 1.3, 0.04, -1); link(hallAt(a), n); spot(n, 'shop', a, [5, 12], { stall: a }); }
  for (const h of H.hearths) { const n = node(h.a, h.r, 0.04, -1); link(hallAt(h.a), n); spot(n, 'warm', { x: T.x, z: T.z }, [8, 22]); }
  for (const b of H.benches) for (const s of [-1, 1]) {
    const a = b.a + s * 0.6 / b.r, ap = node(a, b.r + 1.0, 0.04, -1), seat = node(a, b.r + 0.15, 0.04, -1);
    link(hallAt(a), ap); link(ap, seat); spot(seat, 'sit', { x: T.x, z: T.z }, [12, 40], { seat: true });
  }
  for (const p of H.props) {
    if (p.kind === 1) continue;
    const rr = rh - 3.6 - 1.0; if (rr < hr + 0.5) continue;
    const n = node(p.a, rr, 0.04, -1); link(hallAt(p.a), n); spot(n, 'work', p.a, [10, 26]);
  }
  for (const r of hallRooms) { const n = node(r.a, T.rIn(0.8) - 1.0, 0.04, -1); link(hallAt(r.a), n); spot(n, 'room', r.a, ROOM_DUR, { wallR: T.rIn(1.2) - 0.25 }); }

  /* the great stair: a node every metre and a half of it, and one where it arrives at each floor */
  const stairNodes = [];
  {
    const span = st.turns * TAU, ys = new Set();
    const n = Math.max(8, Math.ceil(span * (T.rIn(st.top * 0.5) - 1.6) / 1.6));
    for (let i = 0; i <= n; i++) ys.add(st.S0 + i / n * (st.top - st.S0));
    for (const L of T.levels) ys.add(L.y);
    const yl = [...ys].sort((p, q) => p - q);
    let prev = null;
    for (const y of yl) {
      const a = st.a0 + (y - st.S0) / (st.top - st.S0) * span, m = node(a, T.rIn(y) - 1.6, y + 0.17, 'stair');
      m.stairY = y; if (prev) link(prev, m); prev = m; stairNodes.push(m);
    }
    { const foot = node(st.a0, T.rIn(0.3) - 3.3, 0.04, -1); link(hallAt(st.a0), foot); link(foot, stairNodes[0]); }   // (across the hall floor to the foot of it, then up)
  }

  /* the floors */
  for (const L of T.levels) {
    const arrive = stairNodes.find(m => Math.abs(m.stairY - L.y) < 1e-6);
    const r0 = L.rWell + 0.7, r1 = L.ri - 3.6, rr = r1 > r0 ? r0 + (r1 - r0) * 0.75 : r0 + 0.15, sa = arrive ? arrive.a : L.slot[1];
    const across = (x, z) => -(x - T.x) * Math.sin(L.bA) + (z - T.z) * Math.cos(L.bA);
    const railAs = [];
    for (let k = 0; k < 8; k++) {
      const a = (k + 0.5) / 8 * TAU + L.i, q = { x: T.x + Math.cos(a) * (L.rWell + 0.65), z: T.z + Math.sin(a) * (L.rWell + 0.65) };
      if (Math.abs(across(q.x, q.z)) < L.bw + 0.6) continue;
      if (L.pots.some(p => Math.abs(angDiff(a, p)) < 1.3 / (L.rWell + 0.75))) continue;
      railAs.push(a);
    }
    const at = ring(L.i, rr, L.y, [sa, L.bA, L.bA + Math.PI, ...L.rooms.map(r => r.a), ...L.looks, ...railAs]);
    // up off the stair onto the floor
    if (arrive) link(arrive, at(sa));
    // across the bridge
    const e1 = node(L.bA, L.rWell + 0.45, L.y, L.i), mid = node(0, 0, L.y, L.i), e2 = node(L.bA + Math.PI, L.rWell + 0.45, L.y, L.i);
    link(at(L.bA), e1); link(e1, mid); link(mid, e2); link(e2, at(L.bA + Math.PI));
    spot(mid, 'bridge', L.bA + Math.PI / 2 + (rng() < 0.5 ? 0 : Math.PI), [5, 12]);
    for (const r of L.rooms) { const n = node(r.a, T.rIn(L.y + 1.4) - 0.9, L.y, L.i); link(at(r.a), n); spot(n, 'room', r.a, ROOM_DUR, { wallR: T.rIn(L.y + 1.4) - 0.25 }); }
    for (const a of L.looks) { const n = node(a, L.ri - 0.9, L.y, L.i); link(at(a), n); spot(n, 'look', a, [8, 22]); }
    for (const a of railAs) { const n = node(a, L.rWell + 0.65, L.y, L.i); link(at(a), n); spot(n, 'rail', a + Math.PI, [6, 18]); }
  }

  /* the way from one node to another: the shortest along the ways */
  function route(from, to) {
    const dist = new Map([[from, 0]]), prev = new Map(), open = [from], done = new Set();
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (dist.get(open[i]) < dist.get(open[bi])) bi = i;
      const u = open.splice(bi, 1)[0]; if (u === to) break; if (done.has(u)) continue; done.add(u);
      for (const [v, w] of u.nb) { const d = dist.get(u) + w; if (d < (dist.get(v) ?? Infinity)) { dist.set(v, d); prev.set(v, u); open.push(v); } }
    }
    if (from !== to && !prev.has(to)) return null;
    const path = [to]; while (path[0] !== from) path.unshift(prev.get(path[0]));
    return path;
  }
  const nearestNode = (x, y, z) => nodes.reduce((b, n) => (Math.hypot(n.x - x, n.z - z) + Math.abs(n.y - y) * 3 < Math.hypot(b.x - x, b.z - z) + Math.abs(b.y - y) * 3 ? n : b), nodes[0]);

  /* ---------------- the folk ---------------- */
  const folk = [], pets = [], vendors = [];
  const free = spots.filter(s => s.act !== 'room');
  function make() { made = true; toMake = Math.max(16, Math.min(38, Math.round(T.levels.length * 3 + 10))); }
  function makeSome(n) {
    for (let j = 0; j < n && toMake > 0; j++, toMake--) makePerson(folk.length);
    if (toMake === 0 && !vendors.length) makeRest();
  }
  function makePerson(i) {
    const u = rng(), kind = u < 0.6 ? 'eikar' : u < 0.84 ? 'keilia' : 'karnen';
    const a = kind === 'eikar'
      ? buildEikar(Object.assign({ weapon: 'none', flasks: false, scale: 0.88 + rng() * 0.2 }, FOLK_LOOKS[i % FOLK_LOOKS.length], { cap: CAPS[Math.floor(rng() * CAPS.length)], tunic: TUNICS[Math.floor(rng() * TUNICS.length)] }))
      : kind === 'keilia' ? cartoon(buildKeilia({ seed: 3 + Math.floor(rng() * 90), cloth: KCLOTH[Math.floor(rng() * KCLOTH.length)], hammer: rng() < 0.4 }))
        : cartoon(buildKarnen({ seed: 2 + Math.floor(rng() * 60) }));
    if (kind === 'keilia') a.root.scale.multiplyScalar(0.92);
    group.add(a.root);
    const s = free[Math.floor(rng() * free.length)], at = s.n.nb.length ? s.n.nb[0][0] : s.n;
    const p = { a, kind, pos: V3(at.x, at.y, at.z), yaw: rng() * TAU, at, path: null, k: 0, lane: (rng() - 0.5) * 0.5, speed: (kind === 'karnen' ? 1.5 : kind === 'keilia' ? 1.1 : 1.25) + rng() * 0.35,
      spot: null, state: 'idle', t: rng() * 4, talk: 0, sitting: false, inside: false, ph: rng() * 9, home: null, trail: [], blocked: 0 };
    folk.push(p);
  }
  function makeRest() {
    // the stallholders behind their counters
    for (const a of H.stalls) {
      const v = buildEikar(Object.assign({ weapon: 'none', flasks: false, scale: 0.95 + rng() * 0.12 }, FOLK_LOOKS[Math.floor(rng() * FOLK_LOOKS.length)], { tunic: TUNICS[Math.floor(rng() * TUNICS.length)] }));
      const r = H.rs + 1.0; v.root.position.set(T.x + Math.cos(a) * r, T.g + 0.04, T.z + Math.sin(a) * r); v.root.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
      group.add(v.root); vendors.push({ a: v, stall: a, talk: 0, yaw: v.root.rotation.y, base: v.root.rotation.y, ph: rng() * 9 });
    }
    // a Kipsu or two, each with somebody it follows about
    const nPets = Math.min(folk.length, 2 + Math.floor(T.levels.length / 3));
    for (let i = 0; i < nPets; i++) {
      const k = buildKipsu({ seed: 7 + Math.floor(rng() * 300) }); group.add(k.root);
      const owner = folk[Math.floor(i * folk.length / nPets)];
      pets.push({ a: k, owner, pos: owner.pos.clone(), yaw: 0, ph: rng() * 9, t: 0 });
    }
  }

  /* what next: somewhere to go, near where they are now rather than far, and nowhere already taken */
  function choose(p) {
    const here = p.at, Lh = here.L === 'stair' ? null : here.L;
    if (rng() < 0.18 && trySeekChat(p)) return;
    const w = s => {
      if (s.busy) return 0;
      const dL = Lh == null ? 1 : Math.abs((s.L === -1 ? -1 : s.L) - Lh);
      let k = { room: 2.2, shop: 2, warm: 1.2, sit: 1.8, work: 1.2, rail: 1.6, look: 1.5, bridge: 0.8, stand: 0.5 }[s.act] || 1;
      if (s.L === -1) k *= 1.6;   // the hall is where everyone ends up, sooner or later
      if (p.kind !== 'eikar' && s.act === 'sit') k *= 0.15;
      if (p.home && s === p.home) k *= 3;
      return k * Math.exp(-dL * 0.7);
    };
    let tot = 0; const ws = spots.map(s => { const v = w(s); tot += v; return v; });
    let u = rng() * tot, s = spots[0];
    for (let i = 0; i < spots.length; i++) { u -= ws[i]; if (u <= 0) { s = spots[i]; break; } }
    go(p, s);
  }
  function go(p, s, ok = true) {
    const path = route(p.at, s.n); if (!path || !ok) { p.state = 'idle'; p.t = 1 + rng() * 2; return; }
    if (p.spot) p.spot.busy = null;
    s.busy = p; p.spot = s; p.path = path; p.k = 1; p.state = 'walk';
    if (s.act === 'room' && !p.home && rng() < 0.6) p.home = s;   // somebody's room
  }
  // somebody standing about, near enough: go over and talk to them
  function trySeekChat(p) {
    const cands = folk.filter(q => q !== p && q.state === 'act' && !q.chat && !q.inside && q.spot && ['rail', 'look', 'warm', 'bridge', 'stand', 'work'].includes(q.spot.act) && q.at.L === p.at.L);
    if (!cands.length) return false;
    const q = cands[Math.floor(rng() * cands.length)], meet = q.spot.n.nb.map(e => e[0]).find(n => !spots.some(s2 => s2.n === n && s2.busy));
    if (!meet) return false;
    const path = route(p.at, meet); if (!path) return false;
    if (p.spot) { p.spot.busy = null; p.spot = null; }
    p.path = path; p.k = 1; p.state = 'walk'; p.chat = q; q.chat = p; q.t = Math.max(q.t, 12);
    return true;
  }

  /* ---------------- moving them ---------------- */
  const tmp = V3();
  function step(p, dt) {
    const from = p.path[p.k - 1], to = p.path[p.k];
    let tx = to.x, tz = to.z;
    // keep to your own side: a little to the right of the way you're going (not on the last step to a spot)
    const ex = to.x - from.x, ez = to.z - from.z, el = Math.hypot(ex, ez);
    if (el > 0.5 && p.k < p.path.length - 1) { tx += -ez / el * p.lane * -1; tz += ex / el * p.lane * -1; }
    const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
    // whoever is just in front going the same way: fall in behind them; anyone standing about, or coming the other way: step round
    let sp = p.speed * (to.L === 'stair' || from.L === 'stair' ? 0.85 : 1);
    for (const q of folk) {
      if (q === p || q.inside) continue;
      const ox = q.pos.x - p.pos.x, oz = q.pos.z - p.pos.z, oy = q.pos.y - p.pos.y, od = Math.hypot(ox, oz);
      if (od > 1.0 || od < 1e-4 || Math.abs(oy) > 1.2) continue;
      if (q.state === 'walk' && (ox * dx + oz * dz) / (od * d + 1e-6) > 0.6 && Math.cos(q.yaw - p.yaw) > 0.3) sp *= od < 0.65 ? 0 : 0.45;
      if (od < 0.55) { const push = (0.55 - od) * 0.5; p.pos.x -= ox / od * push; p.pos.z -= oz / od * push; }
    }
    if (sp < 0.05) { p.blocked += dt; if (p.blocked > 2.5) { p.lane = -p.lane; p.blocked = 0; } } else p.blocked = 0;
    if (d < 0.25 || (p.blocked > 1.5 && d < 0.8)) {
      p.at = to; p.k++;
      if (p.k >= p.path.length) arrive(p);
      return 0;
    }
    const mv = Math.min(d, sp * dt);
    p.pos.x += dx / d * mv; p.pos.z += dz / d * mv;
    // height along the way (the stair rises as you go)
    const tot = Math.hypot(to.x - from.x, to.z - from.z) || 1, k = Math.min(1, Math.max(0, 1 - Math.hypot(to.x - p.pos.x, to.z - p.pos.z) / tot));
    p.pos.y = from.y + (to.y - from.y) * k;
    p.yaw = dampAngle(p.yaw, Math.atan2(dx, dz), 9, dt);
    return mv / dt;
  }
  function arrive(p) {
    p.path = null;
    if (p.chat && !p.spot) {   // come to talk to somebody
      const q = p.chat;
      if (q.state === 'act' && q.chat === p) { p.state = 'act'; p.t = 6 + rng() * 9; p.faceTo = q; q.faceTo = p; q.t = Math.max(q.t, p.t); return; }
      p.chat = null; p.state = 'idle'; p.t = 0.5; return;
    }
    const s = p.spot; if (!s) { p.state = 'idle'; p.t = 1; return; }
    p.state = 'act'; p.t = s.dur[0] + rng() * (s.dur[1] - s.dur[0]); p.faceTo = null;
    if (s.act === 'room') { p.state = 'enter'; }
    if (s.act === 'sit') p.sitting = true;
    if (s.act === 'shop') { const v = vendors.find(v2 => v2.stall === s.stall); if (v) { v.talk = p.t; v.customer = p; } }
  }
  function leaveSpot(p) {
    p.sitting = false;
    if (p.chat) { const q = p.chat; if (q.chat === p) { q.chat = null; q.faceTo = null; } p.chat = null; }
    p.faceTo = null;
  }

  function update(dt, t, eye) {
    const dEye = Math.hypot(eye.x - T.x, eye.z - T.z);
    if (dEye > near) { group.visible = false; return; }
    if (!made) make();
    if (toMake > 0 || !vendors.length) makeSome(4);
    if (dEye > seen) { group.visible = false; return; }
    group.visible = true;
    const dtc = Math.min(dt, 0.05);
    for (const p of folk) {
      let sp = 0;
      if (p.state === 'walk' && p.path) sp = step(p, dtc);
      else if (p.state === 'enter') {
        // the last few steps in at the door, and in out of sight
        const s = p.spot, wx = T.x + Math.cos(s.n.a) * s.wallR, wz = T.z + Math.sin(s.n.a) * s.wallR, dx = wx - p.pos.x, dz = wz - p.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.08) { const mv = Math.min(d, p.speed * 0.7 * dtc); p.pos.x += dx / d * mv; p.pos.z += dz / d * mv; p.yaw = dampAngle(p.yaw, Math.atan2(dx, dz), 9, dtc); sp = mv / dtc; }
        else { p.state = 'inside'; p.inside = true; p.a.root.visible = false; }
      } else if (p.state === 'inside') {
        p.t -= dtc;
        if (p.t <= 0 && !panicking) {   // out again, the way they went in
          p.inside = false; p.a.root.visible = true; p.state = 'leave'; p.yaw += Math.PI;
        }
      } else if (p.state === 'leave') {
        const n = p.spot.n, dx = n.x - p.pos.x, dz = n.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.1) { const mv = Math.min(d, p.speed * 0.8 * dtc); p.pos.x += dx / d * mv; p.pos.z += dz / d * mv; p.yaw = dampAngle(p.yaw, Math.atan2(dx, dz), 9, dtc); sp = mv / dtc; }
        else { p.state = 'idle'; p.t = 0.3 + rng(); p.at = n; }
      } else if (p.state === 'act') {
        p.t -= dtc;
        const s = p.spot;
        let want = p.yaw;
        if (p.faceTo) want = yawTo(p.pos, p.faceTo.pos.x, p.faceTo.pos.z);
        else if (s) want = typeof s.face === 'number' ? Math.atan2(Math.cos(s.face), Math.sin(s.face)) : yawTo(p.pos, s.face.x, s.face.z);   // (a face of a: looking along angle a, round the tree)
        p.yaw = dampAngle(p.yaw, want, 4, dtc);
        if (p.t <= 0 || panicking) { leaveSpot(p); p.state = 'idle'; p.t = 0.2 + rng() * 1.5; }
      } else if (p.state === 'idle') {
        p.t -= dtc;
        if (p.t <= 0) {
          if (panicking) {   // everyone in, out of the way
            const rooms = spots.filter(s => s.act === 'room' && !s.busy);
            const s = rooms.sort((s1, s2) => Math.hypot(s1.n.x - p.pos.x, s1.n.z - p.pos.z) + Math.abs(s1.n.y - p.pos.y) * 4 - Math.hypot(s2.n.x - p.pos.x, s2.n.z - p.pos.z) - Math.abs(s2.n.y - p.pos.y) * 4)[0];
            if (s) { go(p, s); p.speed = Math.max(p.speed, 2.8); } else p.t = 2;
          } else choose(p);
        }
      }
      if (p.inside) continue;
      // talking: whoever's turn it is, in a conversation; a word with the stallholder over the counter
      let talking = false;
      if (p.state === 'act' && p.faceTo) talking = Math.floor((t + (p.chat && folk.indexOf(p) < folk.indexOf(p.chat) ? 0 : 2.6)) / 2.6) % 2 === 0;
      else if (p.state === 'act' && p.spot && p.spot.act === 'shop') talking = Math.sin(t * 0.9 + p.ph) > 0.2;
      else if (p.state === 'act' && p.spot && p.spot.act === 'sit') talking = folk.some(q => q !== p && q.sitting && q.pos.distanceTo(p.pos) < 1.6) && Math.sin(t * 0.7 + p.ph) > 0.3;
      p.a.root.position.copy(p.pos);
      if (p.sitting) p.a.root.position.y -= 0.26 * p.a.root.scale.y;
      p.a.root.rotation.y = p.yaw;
      if (Math.hypot(eye.x - p.pos.x, eye.z - p.pos.z) < 60) p.a.animate(dtc, { speed: sp, onGround: true, t: t + p.ph, talking, sit: p.sitting });
      // leave a trail for a Kipsu to follow
      const last = p.trail[p.trail.length - 1];
      if (!last || last.distanceTo(p.pos) > 0.4) { p.trail.push(p.pos.clone()); if (p.trail.length > 12) p.trail.shift(); }
    }
    for (const v of vendors) {
      v.talk -= dtc;
      const c = v.customer, want = v.talk > 0 && c ? yawTo(v.a.root.position, c.pos.x, c.pos.z) : v.base + Math.sin(t * 0.2 + v.ph) * 0.5;
      v.yaw = dampAngle(v.yaw, want, 3, dtc); v.a.root.rotation.y = v.yaw;
      v.a.root.visible = !panicking;
      if (Math.hypot(eye.x - v.a.root.position.x, eye.z - v.a.root.position.z) < 60) v.a.animate(dtc, { speed: 0, onGround: true, t: t + v.ph, talking: v.talk > 0 && Math.sin(t * 0.9 + v.ph) < 0.2 });
    }
    // the Kipsu: along its owner's trail, a little way behind; waiting at the door if they've gone in; snuffling about while they stand
    for (const k of pets) {
      const o = k.owner, tr = o.trail;
      let goal = null;
      if (!o.inside && tr.length > 3) goal = tr[tr.length - 4];
      else if (o.inside && o.spot) goal = o.spot.n;
      let sp = 0;
      if (goal) {
        const dx = goal.x - k.pos.x, dz = goal.z - k.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.35) { const mv = Math.min(d, (d > 2 ? 3.2 : 1.6) * dtc); k.pos.x += dx / d * mv; k.pos.z += dz / d * mv; k.pos.y += (goal.y - k.pos.y) * Math.min(1, mv / Math.max(d, 0.01)); k.yaw = dampAngle(k.yaw, Math.atan2(dx, dz), 8, dtc); sp = mv / dtc; }
        else { k.t += dtc; k.yaw = dampAngle(k.yaw, k.yaw + Math.sin(t * 0.6 + k.ph) * 0.8, 1.5, dtc); }
      }
      k.a.root.visible = !panicking || !o.inside;
      k.a.root.position.copy(k.pos); k.a.root.rotation.y = k.yaw;
      if (Math.hypot(eye.x - k.pos.x, eye.z - k.pos.z) < 50) k.a.animate(dtc, { speed: sp * 0.35, t: t + k.ph, onGround: true });
    }
  }

  return {
    update,
    // the city's panicking: everyone indoors (or out of sight behind their counters), and back out when it's over
    panic(on = true) { panicking = on; },
    get folk() { return folk; }, nodes, spots, route,
  };
}
