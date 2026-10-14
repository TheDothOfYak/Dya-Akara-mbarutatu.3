/* ============================================================
   VINES — where a Punk's (or a Stryx's) vine can latch on.
   Anything solid will do: a tree, the eave of a house, the top
   of a wall, a boulder, a post, the rising flank of a hill.
   latchPoint() scores every candidate in reach by how well it
   lines up with where you're aiming, how far off it is, and how
   high above you it sits, and hands back the best one.
   ============================================================ */
import * as THREE from 'three';

/* world: the region (trees, col, heightAt)
   from:  the point the vine leaves from (Vector3)
   dir:   aim direction on the ground plane (unit Vector3)
   o:     { range, near, minUp, far (0..1: prefer far/high), cone (min dot), terrain } */
export function latchPoint(world, from, dir, o = {}) {
  const range = o.range ?? 36, near = o.near ?? 4, minUp = o.minUp ?? 3, cone = o.cone ?? 0.3, far = o.far ?? 0.5;
  const ideal = 8 + far * 20;          // the reach it likes best
  let best = null, bs = -1e9;
  eachCandidate(world, from, dir, range, o.terrain !== false, (x, y, z, kind, bonus) => {
    const dx = x - from.x, dz = z - from.z, d = Math.hypot(dx, dz);
    if (d < near || d > range) return;
    const up = y - from.y; if (up < minUp) return;
    const dot = (dx * dir.x + dz * dir.z) / d; if (dot < cone) return;
    const sc = dot * 3 - Math.abs(d - ideal) / 14 + Math.min(up, 22) / 16 * (0.5 + far) + bonus;
    if (sc > bs) { bs = sc; best = { x, y, z, kind }; }
  });
  return best ? Object.assign(new THREE.Vector3(best.x, best.y, best.z), { kind: best.kind }) : null;
}

/* the same, but steered by the look-ray through the X (eye: where the ray starts, look: its unit direction):
   whatever sits closest to the X wins, and side ('L' or 'R') leans the pick a little that way, so the
   left vine takes the tree left of the X and the right vine the one to its right */
export function latchAlongRay(world, from, eye, look, side, o = {}) {
  const range = o.range ?? 38, near = o.near ?? 3, minUp = o.minUp ?? 1.5, cone = o.cone ?? 0.86;
  const hl = Math.hypot(look.x, look.z) || 1, dir = { x: look.x / hl, z: look.z / hl };
  const rx = -dir.z, rz = dir.x, sgn = side === 'L' ? -1 : side === 'R' ? 1 : 0;
  let best = null, bs = -1e9;
  eachCandidate(world, from, dir, range, true, (x, y, z, kind, bonus) => {
    const dx = x - from.x, dz = z - from.z, d = Math.hypot(dx, dz);
    if (d < near || d > range) return;
    const up = y - from.y; if (up < minUp) return;
    const ex = x - eye.x, ey = y - eye.y, ez = z - eye.z, el = Math.hypot(ex, ey, ez) || 1;
    const dot = (ex * look.x + ey * look.y + ez * look.z) / el; if (dot < cone) return;
    const lat = (dx * rx + dz * rz) / d;                                 // -1 left of you … +1 right
    const sc = dot * 12 + sgn * clampN(lat, -0.6, 0.6) * 1.2 - Math.abs(d - 16) / 40 + Math.min(up, 20) / 40 + bonus * 0.5;
    if (sc > bs) { bs = sc; best = { x, y, z, kind }; }
  });
  return best ? Object.assign(new THREE.Vector3(best.x, best.y, best.z), { kind: best.kind }) : null;
}
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

/* every point a vine could hold within range: under tree crowns, the top edges of solid boxes,
   and (with terrain) the land rising ahead along dir */
function eachCandidate(world, from, dir, range, terrain, consider) {
  // trees: just under the crown
  for (const t of world.trees || []) {
    if (Math.abs(t.x - from.x) > range || Math.abs(t.z - from.z) > range) continue;
    const dx = t.x - from.x, dz = t.z - from.z, d = Math.hypot(dx, dz) || 1, r = t.r || 0.4;
    consider(t.x - dx / d * r, t.g + Math.min(t.h * 0.95, from.y - t.g + 30), t.z - dz / d * r, 'tree', 0.25);
  }
  // anything else solid: the top edge of the box nearest to you
  if (world.col && world.col.nearAll) {
    for (const c of world.col.nearAll(from.x, from.z, range)) {
      if (c.top - c.bot < 1.2) continue;                                // a flat slab isn't something to swing from
      const dx = from.x - c.x, dz = from.z - c.z;
      const lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;          // into the box's own frame
      const cx = Math.max(-c.hw, Math.min(c.hw, lx)) * 0.9, cz = Math.max(-c.hd, Math.min(c.hd, lz)) * 0.9;
      const wx = c.x + cx * c.c + cz * c.s, wz = c.z - cx * c.s + cz * c.c; // back out to the world
      consider(wx, c.top, wz, 'solid', 0);
    }
  }
  // the land itself: a hillside or a cliff rising ahead
  if (terrain && world.heightAt) {
    for (const a of [-0.45, -0.2, 0, 0.2, 0.45]) {
      const ca = Math.cos(a), sa = Math.sin(a), ax = dir.x * ca - dir.z * sa, az = dir.x * sa + dir.z * ca;
      for (let d = 10; d <= range; d += 4) {
        const x = from.x + ax * d, z = from.z + az * d;
        if (world.inBounds && !world.inBounds(x, z)) break;
        consider(x, world.heightAt(x, z) + 0.3, z, 'ground', -0.6);
      }
    }
  }
}

/* a pivot right beside a running creature, to whip round (trees, posts, corners of walls, boulders) */
export function pivotNear(world, pos, vel, rad, reach = 6) {
  const v = Math.hypot(vel.x, vel.z) || 1;
  let best = null, bd = 1e9;
  const take = (x, z, r, g, top) => {
    const ox = x - pos.x, oz = z - pos.z, d = Math.hypot(ox, oz);
    if (d < rad + r + 0.4 || d > reach) return;
    if ((ox * vel.x + oz * vel.z) / (d * v) < -0.2) return;            // beside or ahead of it, never behind
    if (top - pos.y < 1.5) return;
    if (d < bd) { bd = d; best = { x, z, r, g, h: top - g }; }
  };
  for (const t of world.trees || []) {
    if (Math.abs(t.x - pos.x) > reach + 1 || Math.abs(t.z - pos.z) > reach + 1) continue;
    take(t.x, t.z, t.r || 0.4, t.g, t.g + t.h);
  }
  if (world.col && world.col.nearAll) for (const c of world.col.nearAll(pos.x, pos.z, reach)) {
    if (c.top - c.bot < 1.5 || Math.max(c.hw, c.hd) > 4) continue;     // posts, pillars, boulders, wall-ends; not a whole house
    take(c.x, c.z, Math.min(c.hw, c.hd), c.bot, c.top);
  }
  return best;
}
