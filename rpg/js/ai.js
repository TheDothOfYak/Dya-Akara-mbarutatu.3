/* ============================================================
   AI — what folk and beasts can sense, and how they find their
   way. Shared by the townsfolk (main.js), the crowds (city.js),
   the creatures that fight (enemies.js) and Phorus.

   · createNav: a walking map of a region, learned a metre at a
     time from its colliders the first time anyone asks about a
     spot, and a pathfinder (A*) over it: round the houses, along
     the street, through the gap in the fence. Paths come back with
     their corners cut, as a person walks them, not a grid.
   · sees(): can this one see that one? In front of it (a view
     cone), near enough, and nothing solid in between.
   · createEars: sounds that carry — a blow, a shout, running
     feet, a spell — that anything near enough can hear, and turn
     towards, and come to see about.
   · avoid(): walking among other walkers — slow for someone who
     is about to cross in front, and pass on the right of someone
     coming the other way, instead of walking into them.

   No THREE needed: points are anything with x and z (and y).
   ============================================================ */

const SQ2 = Math.SQRT2, SPAN = 2 ** 22, OFF = 2 ** 21;
const unkey = k => { const i = Math.floor(k / SPAN); return [i - OFF, k - i * SPAN - OFF]; };

/* ---------------- the walking map, and finding a way across it ----------------
   blocked(x, z, y) → true where a walker (feet at about y) can't stand. version() → anything that
   changes when the colliders do (more are added as a region fills in): the map is relearned then. */
export function createNav({ blocked, cell = 1, version = () => 0, maxNodes = 3000 }) {
  let map = new Map(), seenV = version();
  const key = (i, j) => (i + OFF) * SPAN + (j + OFF);   // (a room in the pocket is 40 km out)
  function solid(i, j, y) {
    const v = version(); if (v !== seenV) { seenV = v; map = new Map(); }
    const k = key(i, j);
    let b = map.get(k);
    if (b === undefined) { b = blocked((i + 0.5) * cell, (j + 0.5) * cell, y) ? 1 : 0; map.set(k, b); }
    return b === 1;
  }
  const cellOf = v => Math.floor(v / cell);
  /* can you walk straight from a to b? (every half a cell along the line) */
  function clear(ax, az, bx, bz, y = 0) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / (cell * 0.5)));
    for (let k = 1; k < n; k++) {
      const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n;
      if (solid(cellOf(x), cellOf(z), y)) return false;
    }
    return true;
  }
  /* the nearest open cell to a point (a goal set down inside a stall, say), searching outwards */
  function openNear(i, j, y, R = 4) {
    if (!solid(i, j, y)) return [i, j];
    for (let r = 1; r <= R; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      if (!solid(i + di, j + dj, y)) return [i + di, j + dj];
    }
    return null;
  }
  /* a way from a to b, as a list of points to walk to (the last one b itself, or the nearest open
     place to it), or null if there's none within reach of the search */
  function path(a, b, opts = {}) {
    const y = a.y || 0;
    if (clear(a.x, a.z, b.x, b.z, y)) return [{ x: b.x, z: b.z }];
    const s = openNear(cellOf(a.x), cellOf(a.z), y, 2), g = openNear(cellOf(b.x), cellOf(b.z), y, 4);
    if (!s || !g) return null;
    const limit = opts.maxNodes || maxNodes;
    const open = new Heap(), came = new Map(), cost = new Map();
    const gk = key(g[0], g[1]), sk = key(s[0], s[1]);
    const h = (i, j) => { const dx = Math.abs(i - g[0]), dz = Math.abs(j - g[1]); return (dx + dz + (SQ2 - 2) * Math.min(dx, dz)); };
    cost.set(sk, 0); open.push(sk, h(s[0], s[1]));
    let found = false, n = 0, best = sk, bestH = h(s[0], s[1]);
    while (open.size && n++ < limit) {
      const k = open.pop();
      if (k === gk) { found = true; break; }
      const [i, j] = unkey(k), c = cost.get(k);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (solid(ni, nj, y)) continue;
        if (di && dj && (solid(i + di, j, y) || solid(i, j + dj, y))) continue;   // no squeezing past a corner
        const nk = key(ni, nj), nc = c + (di && dj ? SQ2 : 1);
        if (nc < (cost.has(nk) ? cost.get(nk) : Infinity)) {
          cost.set(nk, nc); came.set(nk, k);
          const hh = h(ni, nj); open.push(nk, nc + hh);
          if (hh < bestH) { bestH = hh; best = nk; }
        }
      }
    }
    if (!found && !opts.partial) return null;
    // back from the goal (or as near as the search got) to the start
    const cells = [];
    for (let k = found ? gk : best; k !== undefined && k !== sk; k = came.get(k)) cells.push(k);
    cells.reverse();
    const pts = cells.map(k => { const [i, j] = unkey(k); return { x: (i + 0.5) * cell, z: (j + 0.5) * cell }; });
    if (found) pts.push({ x: b.x, z: b.z });
    if (!pts.length) return null;
    // cut the corners: from each point, straight on to the furthest one in sight
    const out = []; let from = a;
    for (let i = 0; i < pts.length;) {
      let j = pts.length - 1;
      while (j > i && !clear(from.x, from.z, pts[j].x, pts[j].z, y)) j--;
      out.push(pts[j]); from = pts[j]; i = j + 1;
    }
    return out;
  }
  return { path, clear, blocked: (x, z, y = 0) => solid(cellOf(x), cellOf(z), y), forget: () => { map = new Map(); } };
}

/* a little binary heap of keys by priority (lowest first) */
class Heap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(k, p) {
    const K = this.k, Pr = this.p; let i = K.length; K.push(k); Pr.push(p);
    while (i > 0) { const up = (i - 1) >> 1; if (Pr[up] <= p) break; K[i] = K[up]; Pr[i] = Pr[up]; i = up; }
    K[i] = k; Pr[i] = p;
  }
  pop() {
    const K = this.k, Pr = this.p, top = K[0], lk = K.pop(), lp = Pr.pop();
    if (K.length) {
      let i = 0; const n = K.length;
      for (;;) {
        let c = 2 * i + 1; if (c >= n) break;
        if (c + 1 < n && Pr[c + 1] < Pr[c]) c++;
        if (Pr[c] >= lp) break;
        K[i] = K[c]; Pr[i] = Pr[c]; i = c;
      }
      K[i] = lk; Pr[i] = lp;
    }
    return top;
  }
}

/* ---------------- following a path ----------------
   walker: anything with pos; keeps its own route state on itself (._route). Call with where it wants
   to be; it hands back the point to head for now: the goal itself when the way there is straight and
   clear, else the next corner of a path round whatever's in the way (found once, refound if the goal
   moves a long way or the walker stops getting anywhere). */
export function headFor(nav, walker, goal, dt, opts = {}) {
  const R = walker._route || (walker._route = { pts: null, goal: null, t: 0, best: Infinity, stuck: 0, recheck: 0 });
  const p = walker.pos, d = Math.hypot(goal.x - p.x, goal.z - p.z);
  R.recheck -= dt;
  const moved = !R.goal || Math.hypot(goal.x - R.goal.x, goal.z - R.goal.z) > (opts.slack || Math.max(2, d * 0.25));
  // getting nowhere? (pinned against a fence the straight line didn't see)
  if (d < R.best - 0.25) { R.best = d; R.stuck = 0; } else R.stuck += dt;
  if (moved || R.stuck > (opts.patience || 1.2) || (R.pts && R.recheck <= 0)) {
    R.goal = { x: goal.x, z: goal.z }; R.best = d; R.stuck = 0; R.recheck = 4;
    R.pts = nav && d > 0.5 ? nav.path(p, goal, { partial: true, maxNodes: opts.maxNodes }) : null;
    if (R.pts && R.pts.length === 1 && Math.hypot(R.pts[0].x - goal.x, R.pts[0].z - goal.z) < 0.01) R.pts = null;   // straight there
  }
  if (R.pts) {
    // on to the next corner as soon as it's in plain sight (round the corner, not into it)
    while (R.pts.length > 1 && nav.clear(p.x, p.z, R.pts[1].x, R.pts[1].z, p.y || 0)) R.pts.shift();
    if (R.pts.length) return R.pts[0];
  }
  return goal;
}
export const forgetRoute = walker => { walker._route = null; };

/* ---------------- seeing ----------------
   eye, target: points (y is height); yaw: which way it's facing (atan2(dx, dz) convention);
   fov: the whole width of its view in radians; range; ray(a, b) → 0..1, the first thing solid along
   the way (1: nothing) — terrain.js Colliders.ray. Close enough (near) and it knows you're there
   whichever way it's looking: you can hear someone breathing behind you. */
export function sees(eye, target, { yaw, fov = 2.1, range = 20, near = 2.5, ray, land }) {
  const dx = target.x - eye.x, dz = target.z - eye.z, d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d > near) {
    const off = Math.atan2(Math.sin(Math.atan2(dx, dz) - yaw), Math.cos(Math.atan2(dx, dz) - yaw));
    if (Math.abs(off) > fov / 2) return false;
  }
  if (ray && ray(eye, target) < 0.98) return false;
  if (land) {   // a hill in the way
    const n = Math.ceil(d / 4);
    for (let k = 1; k < n; k++) { const t = k / n; if (land(eye.x + dx * t, eye.z + dz * t) > eye.y + (target.y - eye.y) * t) return false; }
  }
  return true;
}

/* ---------------- hearing ----------------
   emit(x, z, loud, what): a sound carrying `loud` metres. heard(x, z, ears, since) → the loudest
   sound that reached a listener at (x, z) (ears: how well it hears; 1 is ordinary) since time `since`,
   or null. Sounds fade after a few seconds. */
export function createEars(now) {
  const sounds = [];
  return {
    emit(x, z, loud, what = 'noise', who = null) { sounds.push({ x, z, loud, what, who, t: now() }); if (sounds.length > 64) sounds.shift(); },
    heard(x, z, ears = 1, since = -Infinity, skip = null) {
      const t = now(); let best = null, bl = 0;
      for (const s of sounds) {
        if (s.t < since || t - s.t > 3 || (skip && s.who === skip)) continue;
        const d = Math.hypot(s.x - x, s.z - z), carry = s.loud * ears;
        if (d < carry && carry - d > bl) { bl = carry - d; best = s; }
      }
      return best;
    },
    sounds,
  };
}

/* ---------------- walking among others ----------------
   self: { pos, vx, vz } wanting to go at (vx, vz); others: [{ pos, vx?, vz? }]. Looks a second and a
   half ahead: anyone it would come within `room` of, it eases off for and passes on the right of
   (two people meeting both step right, so they don't do the little dance). Returns the speed scale
   and the new heading as { k, vx, vz }. */
export function avoid(self, others, room = 0.9, look = 1.5) {
  let vx = self.vx, vz = self.vz;
  const sp = Math.hypot(vx, vz); if (sp < 0.05) return { k: 1, vx, vz };
  const ux = vx / sp, uz = vz / sp;
  let k = 1, turn = 0;
  for (const o of others) {
    if (o === self || !o.pos) continue;
    const rx = o.pos.x - self.pos.x, rz = o.pos.z - self.pos.z, dist = Math.hypot(rx, rz);
    if (dist > sp * look + room * 2 || dist < 1e-3) continue;
    const ovx = o.vx || 0, ovz = o.vz || 0;
    // closest approach, moving as both are now
    const wx = ovx - vx, wz = ovz - vz, w2 = wx * wx + wz * wz;
    const tc = w2 > 1e-6 ? Math.max(0, Math.min(look, -(rx * wx + rz * wz) / w2)) : 0;
    const cx = rx + wx * tc, cz = rz + wz * tc, miss = Math.hypot(cx, cz);
    if (miss > room) continue;
    const ahead = rx * ux + rz * uz; if (ahead < -0.2) continue;   // behind me: their problem
    const urgency = (1 - miss / room) * (1 - tc / look);
    // which side are they on? step the other way — and if they're coming at me, everyone steps the same way
    const side = rx * uz - rz * ux;   // > 0: they're on my +turn-away side
    const head = (ovx * ux + ovz * uz) < -0.3 * sp;   // coming the other way
    turn += (head || Math.abs(side) < 0.2 ? 1 : Math.sign(side)) * urgency * 0.9;
    if (!head) k = Math.min(k, 1 - urgency * 0.7);   // crossing or overtaking: slow for them
  }
  if (turn) { const c = Math.cos(turn), s = Math.sin(turn); const nx = ux * c - uz * s, nz = ux * s + uz * c; vx = nx * sp; vz = nz * sp; }
  return { k: Math.max(0.15, k), vx, vz };
}

/* ---------------- a pack round its quarry ----------------
   members: [{ pos, attacking }] all after the same quarry (a point) that faces `facing`. Only `max`
   go in at once (those already at it keep their turn); each member gets .mayGo, and .slot: an angle
   round the quarry to wait at, spread evenly and starting from behind it, so they don't all come
   at it from the same side. */
export function packRing(members, quarry, facing = 0, max = 1) {
  let going = members.filter(m => m.attacking).length;
  const ring = members.slice().sort((a, b) => Math.atan2(a.pos.x - quarry.x, a.pos.z - quarry.z) - Math.atan2(b.pos.x - quarry.x, b.pos.z - quarry.z));
  const back = facing + Math.PI, gap = Math.min(1.1, (Math.PI * 2) / Math.max(1, ring.length));
  ring.forEach((m, i) => { m.slot = back + (i - (ring.length - 1) / 2) * gap; });
  // the nearest of those waiting get the free turns
  const waiting = members.filter(m => !m.attacking).sort((a, b) => Math.hypot(a.pos.x - quarry.x, a.pos.z - quarry.z) - Math.hypot(b.pos.x - quarry.x, b.pos.z - quarry.z));
  for (const m of members) m.mayGo = m.attacking;
  for (const m of waiting) if (going < max) { m.mayGo = true; going++; }
}

/* how far round from a to b (signed, -π..π) */
export const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
