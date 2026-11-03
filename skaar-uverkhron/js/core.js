/* ============================================================
   SKAAR UVERKHRON — js/core.js
   The namespace, a seeded random number generator, and small
   helpers. No DOM here: everything in core/data/state/mapgen/
   rules/battle/ai also runs under node for the tests.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU = root.SU || {};

  /* ---------- seeded RNG (mulberry32). The game state carries its seed so
     a saved game, a replayed turn and an online game all roll the same. ---------- */
  SU.makeRng = function (seed) {
    let s = (seed >>> 0) || 1;
    const r = {
      next() { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
      int(a, b) { return a + Math.floor(r.next() * (b - a + 1)); },
      range(a, b) { return a + r.next() * (b - a); },
      chance(p) { return r.next() < p; },
      pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
      shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; },
      weighted(items, wf) { let tot = 0; items.forEach(it => tot += wf(it)); let x = r.next() * tot; for (const it of items) { x -= wf(it); if (x <= 0) return it; } return items[items.length - 1]; },
      get state() { return s; }, set state(v) { s = v >>> 0; },
    };
    return r;
  };
  /* the game's RNG lives on the state (state.rngState) so it is saved with it */
  SU.rng = function (state) {
    if (!state._rng) { state._rng = SU.makeRng(state.rngState || 1); }
    return state._rng;
  };
  SU.syncRng = function (state) { if (state._rng) state.rngState = state._rng.state; };

  /* ---------- small helpers ---------- */
  SU.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  SU.lerp = (a, b, t) => a + (b - a) * t;
  SU.uid = function (state, prefix) { state.nextId = (state.nextId || 1) + 1; return (prefix || 'id') + state.nextId; };
  SU.deep = o => JSON.parse(JSON.stringify(o));
  SU.fmt = function (n) { n = Math.round(n); return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : String(n); };
  SU.plural = (n, a, b) => n + ' ' + (n === 1 ? a : (b || a + 's'));

  /* value noise, for the map generator and for art textures */
  SU.noise2 = function (seed) {
    const perm = new Uint8Array(512); const r = SU.makeRng(seed);
    const p = []; for (let i = 0; i < 256; i++) p[i] = i; r.shuffle(p);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const grad = (h, x, y) => { switch (h & 7) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } };
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    function n(x, y) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y);
      const a = perm[X] + Y, b = perm[X + 1] + Y;
      return SU.lerp(SU.lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u), SU.lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v) * 0.7071;
    }
    n.fbm = function (x, y, oct) { let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < (oct || 4); i++) { s += n(x * f, y * f) * a; t += a; a *= 0.5; f *= 2; } return s / t; };
    return n;
  };

  /* ---------- hex grid for battles (odd-r offset: odd rows shifted right) ---------- */
  SU.hex = {
    neighbors(c, r) {
      const odd = r & 1;
      return odd
        ? [[c + 1, r], [c - 1, r], [c, r - 1], [c + 1, r - 1], [c, r + 1], [c + 1, r + 1]]
        : [[c + 1, r], [c - 1, r], [c - 1, r - 1], [c, r - 1], [c - 1, r + 1], [c, r + 1]];
    },
    toCube(c, r) { const x = c - (r - (r & 1)) / 2; const z = r; return [x, -x - z, z]; },
    dist(c1, r1, c2, r2) { const a = SU.hex.toCube(c1, r1), b = SU.hex.toCube(c2, r2); return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])); },
  };

  /* ---------- events: the UI listens, the rules emit ---------- */
  const listeners = {};
  SU.on = function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); };
  SU.emit = function (ev, data) { (listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); };

  if (typeof module !== 'undefined') module.exports = SU;
})(typeof window !== 'undefined' ? window : globalThis);
