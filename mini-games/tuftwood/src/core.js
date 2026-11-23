// 4 Brothers World V3: core. Namespace, math, seeded random, input, event bus, safe stubs.
(function () {
  'use strict';
  const V3 = (window.V3 = window.V3 || {});
  V3.TEST = /[?&]test=1/.test(location.search);

  // ---------- math ----------
  const U = (V3.util = {});
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (t) => { t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  U.approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
  U.damp = (v, target, rate, dt) => U.lerp(v, target, 1 - Math.exp(-rate * dt));
  U.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  U.TAU = Math.PI * 2;
  U.mulberry = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const baseRand = V3.TEST ? U.mulberry(1234) : Math.random;
  U.rand = (a, b) => (a === undefined ? baseRand() : a + (b - a) * baseRand());
  U.pick = (arr) => arr[Math.floor(baseRand() * arr.length)];
  U.chance = (p) => baseRand() < p;
  U.hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  // smooth 1D value noise, 0..1
  U.noise = (x) => { const i = Math.floor(x), f = x - i; return U.lerp(U.hash(i), U.hash(i + 1), f * f * (3 - 2 * f)); };
  U.fbm = (x) => U.noise(x) * 0.6 + U.noise(x * 2.1 + 7) * 0.28 + U.noise(x * 4.3 + 19) * 0.12;
  // colour helpers: mix two '#rrggbb' colours
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  U.mix = (a, b, t) => { const A = hex(a), B = hex(b); return 'rgb(' + Math.round(U.lerp(A[0], B[0], t)) + ',' + Math.round(U.lerp(A[1], B[1], t)) + ',' + Math.round(U.lerp(A[2], B[2], t)) + ')'; };
  U.mixA = (a, b, t) => { const A = hex(a), B = hex(b); return [U.lerp(A[0], B[0], t), U.lerp(A[1], B[1], t), U.lerp(A[2], B[2], t)]; };
  U.rgba = (c, a) => { const A = hex(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')'; };
  // pick along a list of [t, '#hex'] stops
  U.ramp = (stops, t) => {
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return U.mix(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0] || 1));
    return stops[stops.length - 1][1];
  };

  // ---------- event bus ----------
  const listeners = {};
  V3.bus = {
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit(name, a, b, c) { const l = listeners[name]; if (l) for (let i = 0; i < l.length; i++) l[i](a, b, c); },
  };

  // ---------- story hook (the ghost storyline plugs in here later; nothing uses it yet) ----------
  // A chapter is {id, when(state) -> bool, start(V3)}. game.js calls V3.story.tick(state) once a second.
  V3.story = {
    chapters: [], done: {},
    add(ch) { this.chapters.push(ch); },
    tick(state) { for (const ch of this.chapters) if (!this.done[ch.id] && ch.when(state)) { this.done[ch.id] = true; ch.start(V3); } },
  };

  // ---------- input ----------
  const keys = new Set(), down = {}, pressed = {}, MAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', KeyJ: 'act', KeyX: 'act', KeyK: 'special', KeyC: 'special', ShiftLeft: 'special', ShiftRight: 'special',
    KeyE: 'poke', Enter: 'poke', Tab: 'journal', KeyG: 'journal', Escape: 'back', KeyM: 'mute',
    Digit1: 'h1', Digit2: 'h2', Digit3: 'h3', Digit4: 'h4', KeyQ: 'next',
  };
  const I = (V3.input = {
    down, pressed, any: false,
    set(name, on) { if (on && !down[name]) { pressed[name] = true; I.any = true; } down[name] = on; },
    hit(name) { return !!pressed[name]; },
    eat(name) { const p = !!pressed[name]; pressed[name] = false; return p; },
    axisX() { return (down.right ? 1 : 0) - (down.left ? 1 : 0); },
    axisY() { return (down.down ? 1 : 0) - (down.up ? 1 : 0); },
    endFrame() { for (const k in pressed) pressed[k] = false; I.any = false; },
    releaseAll() { keys.clear(); for (const k in down) down[k] = false; I.endFrame(); },
  });
  addEventListener('keydown', (e) => {
    const m = MAP[e.code]; if (!m) return;
    if (!e.repeat) { keys.add(e.code); I.set(m, true); }
    if (m === 'jump' || m === 'journal' || e.code.startsWith('Arrow')) e.preventDefault();
    V3.bus.emit('gesture');
  });
  addEventListener('keyup', (e) => { const m = MAP[e.code]; if (m) { keys.delete(e.code); I.set(m, [...keys].some((code) => MAP[code] === m)); } });
  addEventListener('blur', () => I.releaseAll());
  addEventListener('pointerdown', () => V3.bus.emit('gesture'));

  // ---------- safe stubs (the real modules replace these) ----------
  const noop = () => {};
  if (!V3.audio) V3.audio = { init: noop, sfx: noop, note: noop, music: noop, ambience: noop, setMuted(b) { this.muted = b; }, muted: false };
  if (!V3.save) { let mem = null; const prefs = {}; V3.save = { load: () => mem, write: (s) => { mem = JSON.parse(JSON.stringify(s)); return true; }, clear: () => { mem = null; }, has: () => !!mem, pref: (k, v) => (v === undefined ? prefs[k] : (prefs[k] = v)) }; }
})();
