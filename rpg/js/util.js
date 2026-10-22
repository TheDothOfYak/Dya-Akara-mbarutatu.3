/* ============================================================
   Small shared helpers: seeded randomness, value noise, easing.
   ============================================================ */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, z) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* smooth value noise in roughly [0, 1] */
export function noise2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, z, oct = 4) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += noise2(x * f, z * f) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
  return s / norm;
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/* frame-rate independent exponential approach */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export const dampAngle = (a, b, lambda, dt) => a + angleDiff(a, b) * (1 - Math.exp(-lambda * dt));
export const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

/* looking up: the camera orbits down behind him only to ORBIT_MIN (any lower and it would be in the ground); past that
   it stays where it is and turns its gaze upward instead, reaching straight up at PITCH_MIN. Call after camera.lookAt. */
export const PITCH_MIN = -1.5, PITCH_MAX = 1.25, ORBIT_MIN = -0.32;
export const orbitPitch = p => Math.max(p, ORBIT_MIN);
export function tiltUp(camera, pitch) {
  if (pitch >= ORBIT_MIN) return;
  const q = camera.quaternion, e0 = Math.asin(clamp(-2 * (q.y * q.z - q.w * q.x), -1, 1));   // how far up it already looks
  camera.rotateX(Math.max(0, (Math.PI / 2 - 0.02) - e0) * Math.min(1, (ORBIT_MIN - pitch) / (ORBIT_MIN - PITCH_MIN)));
}

/* a hand-rail along a run of points [x, y, z] (the walking surface under the rail): a post at each point (and
   between them, on a long span, so they're never more than `gap` apart), a bar
   over their tops, and a collider under each span so nobody walks off through it. The callers draw and block:
   `post(x, y, z, h)` stands a post of height h on (x, y, z); `bar(x, y, z, len, ry, rz)` is a bar centred on
   (x, y, z) lying along its local x, tipped up by rz and turned by ry; `col(x, z, hw, hd, ang, y0, y1)` blocks.
   A fence is the same thing with taller posts further apart and more than one bar (`bars`: their heights) */
export function railing(pts, { post, bar, col }, { h = 0.95, gap = 1.2, bars = [h] } = {}) {
  for (const [x, y, z] of pts) post(x, y, z, h);
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay, az] = pts[i - 1], [bx, by, bz] = pts[i], dx = bx - ax, dz = bz - az, run = Math.hypot(dx, dz);
    if (run < 1e-3) continue;
    const ry = -Math.atan2(dz, dx), rz = Math.atan2(by - ay, run), mx = (ax + bx) / 2, mz = (az + bz) / 2;
    for (const hb of bars) bar(mx, (ay + by) / 2 + hb, mz, Math.hypot(run, by - ay) + 0.08, ry, rz);
    const n = Math.ceil(run / gap);
    for (let k = 1; k < n; k++) post(ax + dx * k / n, ay + (by - ay) * k / n, az + dz * k / n, h);
    if (col) col(mx, mz, run / 2, 0.1, ry, Math.min(ay, by), Math.max(ay, by) + h + 0.05);
  }
}
