/* ============================================================
   Day and night on the Tatu. One full day ≈ 18 real minutes
   (≈12.5 min of daylight, ≈5.5 min of night). Drives the sun /
   Velki-shine shadow light, hemisphere + rim lights, fog, exposure,
   bloom and the sky dome (via sky.setTime). Leotik keeps its storm.

   main.js keeps placing the DirectionalLight itself:
     sun.position.copy(focus).addScaledVector(dn.sunDir, 120); sun.target.position.copy(focus);
   (dn.sunDir IS sky.js's live SUN_DIR, so the old line keeps working.)
   ============================================================ */
import * as THREE from 'three';
import { SUN_DIR, SKY_SUN } from './sky.js';

const DAY_START = 5.5, DAY_END = 19.5;          // the "day" stretch of the clock (incl. twilights)
const DAY_SECS = 750, NIGHT_SECS = 330;         // real seconds: 12.5 min day + 5.5 min night = 18 min
const SUNRISE = 5.8, SUNSET = 18.7;             // sun crosses the horizon

/* keyframes: [hour, values]. Sky colours are in the dome's pre-gamma space; lights are absolute;
   near/far/exp are multipliers on the region's own fog/exposure; bloom is absolute strength. */
const GOLDEN = {
  maxEl: 1.0, // radians of the noon sun
  nightFog: 0x2c2a58,
  cloudNight: [0.22, 0.22, 0.42], cloudGlow: [0.25, 0.2, 0.45],
  keys: [
    [0.0, { zen: [0.05, 0.05, 0.17], mid: [0.11, 0.1, 0.28], hor: [0.25, 0.21, 0.44], low: [0.15, 0.13, 0.3], glow: [0.35, 0.3, 0.55],
      stars: 2.0, neb: 1.5, band: 1, sunCol: 0xa9b8ff, sunI: 0.6, hemiSky: 0x6a7ad0, hemiGnd: 0x30294a, hemiI: 1.0,
      rimCol: 0x8fa2ff, rimI: 0.55, near: 0.55, far: 0.72, exp: 1.12, bloom: 0.8 }],
    [4.6, 'night'],
    [5.6, { zen: [0.07, 0.07, 0.22], mid: [0.2, 0.16, 0.36], hor: [0.55, 0.36, 0.48], low: [0.3, 0.22, 0.36], glow: [0.8, 0.45, 0.45],
      stars: 1.2, neb: 1.1, band: 0.6, sunCol: 0xb0b0ff, sunI: 0.45, hemiSky: 0x8a86c8, hemiGnd: 0x4a3650, hemiI: 1.0,
      rimCol: 0xb090ff, rimI: 0.5, near: 0.65, far: 0.8, exp: 1.1, bloom: 0.7 }],
    [6.4, { zen: [0.1, 0.1, 0.27], mid: [0.42, 0.34, 0.56], hor: [1.0, 0.64, 0.56], low: [0.85, 0.52, 0.56], glow: [1.0, 0.58, 0.48],
      stars: 0.9, neb: 0.8, band: 0.15, sunCol: 0xffb49a, sunI: 1.7, hemiSky: 0xc0b4e8, hemiGnd: 0xa86c5c, hemiI: 1.12,
      rimCol: 0xffa8d0, rimI: 0.5, near: 0.85, far: 0.92, exp: 1.06, bloom: 0.55 }],
    [8.6, 'day'],
    [12.2, { zen: [0.1, 0.17, 0.38], mid: [0.34, 0.47, 0.72], hor: [1.0, 0.8, 0.6], low: [0.95, 0.72, 0.58], glow: [1.0, 0.76, 0.48],
      stars: 0.45, neb: 0.55, band: 0, sunCol: 0xfff0dc, sunI: 3.0, hemiSky: 0xc8daff, hemiGnd: 0xc8905e, hemiI: 1.35,
      rimCol: 0x9ab8ff, rimI: 0.55, near: 1.1, far: 1.1, exp: 1.0, bloom: 0.45 }],
    [15.6, 'day'],
    [17.7, { zen: [0.07, 0.06, 0.2], mid: [0.36, 0.2, 0.44], hor: [1.0, 0.5, 0.28], low: [0.8, 0.34, 0.34], glow: [1.0, 0.46, 0.2],
      stars: 0.9, neb: 0.9, band: 0.1, sunCol: 0xff9e62, sunI: 2.2, hemiSky: 0xd0a4c8, hemiGnd: 0xb0603e, hemiI: 1.15,
      rimCol: 0xd088ff, rimI: 0.65, near: 0.9, far: 0.95, exp: 1.05, bloom: 0.6 }],
    [18.8, { zen: [0.06, 0.05, 0.19], mid: [0.2, 0.12, 0.34], hor: [0.62, 0.3, 0.36], low: [0.32, 0.18, 0.3], glow: [0.85, 0.35, 0.3],
      stars: 1.2, neb: 1.2, band: 0.5, sunCol: 0xa8a8ff, sunI: 0.45, hemiSky: 0x8a7cc4, hemiGnd: 0x4a3048, hemiI: 1.0,
      rimCol: 0xb48aff, rimI: 0.55, near: 0.65, far: 0.8, exp: 1.1, bloom: 0.7 }],
    [19.8, 'night'],
    [24.0, 'night'],
  ],
};
// the "day" key is the original golden-hour look
GOLDEN.day = { zen: [0.045, 0.075, 0.2], mid: [0.22, 0.3, 0.52], hor: [1.0, 0.68, 0.42], low: [0.98, 0.55, 0.45], glow: [1.0, 0.62, 0.3],
  stars: 1, neb: 1, band: 0, sunCol: 0xffd4a0, sunI: 2.7, hemiSky: 0xb8d0ff, hemiGnd: 0xc0804e, hemiI: 1.25,
  rimCol: 0x9ab8ff, rimI: 0.55, near: 1, far: 1, exp: 1, bloom: 0.5 };

const STORM = {
  maxEl: 0.95,
  nightFog: 0x1e2c36,
  cloudNight: [0.16, 0.22, 0.26], cloudGlow: [0.12, 0.2, 0.22],
  keys: [
    [0.0, { zen: [0.025, 0.04, 0.07], mid: [0.07, 0.11, 0.16], hor: [0.18, 0.22, 0.28], low: [0.11, 0.15, 0.17], glow: [0.3, 0.36, 0.42],
      stars: 1.3, neb: 1.3, band: 0.7, sunCol: 0x93a8d0, sunI: 0.5, hemiSky: 0x587088, hemiGnd: 0x1e2c26, hemiI: 1.0,
      rimCol: 0x7f9cd0, rimI: 0.5, near: 0.7, far: 0.78, exp: 1.08, bloom: 0.78 }],
    [4.6, 'night'],
    [6.4, { zen: [0.05, 0.07, 0.11], mid: [0.2, 0.22, 0.28], hor: [0.66, 0.56, 0.48], low: [0.36, 0.38, 0.36], glow: [0.85, 0.7, 0.5],
      stars: 0.9, neb: 0.8, band: 0.1, sunCol: 0xd8c0a8, sunI: 1.2, hemiSky: 0x9aa8b0, hemiGnd: 0x40402e, hemiI: 1.2,
      rimCol: 0xb0a0d0, rimI: 0.5, near: 0.9, far: 0.92, exp: 1.04, bloom: 0.55 }],
    [8.6, 'day'],
    [15.6, 'day'],
    [17.7, { zen: [0.04, 0.05, 0.09], mid: [0.18, 0.18, 0.24], hor: [0.66, 0.5, 0.36], low: [0.34, 0.32, 0.3], glow: [0.9, 0.62, 0.36],
      stars: 0.9, neb: 0.9, band: 0.1, sunCol: 0xd8b088, sunI: 1.35, hemiSky: 0x9a9ca8, hemiGnd: 0x40382a, hemiI: 1.2,
      rimCol: 0xb090d0, rimI: 0.55, near: 0.9, far: 0.92, exp: 1.04, bloom: 0.6 }],
    [18.8, { zen: [0.03, 0.045, 0.08], mid: [0.1, 0.12, 0.18], hor: [0.32, 0.3, 0.34], low: [0.16, 0.18, 0.2], glow: [0.5, 0.42, 0.4],
      stars: 1.0, neb: 1.1, band: 0.4, sunCol: 0x93a8d0, sunI: 0.4, hemiSky: 0x607488, hemiGnd: 0x202a24, hemiI: 1.05,
      rimCol: 0x8a9cd0, rimI: 0.5, near: 0.75, far: 0.82, exp: 1.07, bloom: 0.7 }],
    [19.8, 'night'],
    [24.0, 'night'],
  ],
};
STORM.day = { zen: [0.03, 0.06, 0.09], mid: [0.12, 0.22, 0.26], hor: [0.55, 0.62, 0.5], low: [0.3, 0.4, 0.36], glow: [0.75, 0.8, 0.55],
  stars: 1, neb: 1, band: 0, sunCol: 0xc8d8c0, sunI: 1.6, hemiSky: 0x9ab8b0, hemiGnd: 0x3a4a30, hemiI: 1.35,
  rimCol: 0x9ab8ff, rimI: 0.55, near: 1, far: 1, exp: 1, bloom: 0.5 };

const COLOR_KEYS = ['sunCol', 'hemiSky', 'hemiGnd', 'rimCol'];
const VEC_KEYS = ['zen', 'mid', 'hor', 'low', 'glow'];
const NUM_KEYS = ['stars', 'neb', 'band', 'sunI', 'hemiI', 'rimI', 'near', 'far', 'exp', 'bloom'];

function compile(P) {
  const night = P.keys[0][1];
  return P.keys.map(([h, k]) => {
    const src = k === 'night' ? night : k === 'day' ? P.day : k;
    const o = { h };
    for (const n of VEC_KEYS) o[n] = src[n].slice();
    for (const n of NUM_KEYS) o[n] = src[n];
    for (const n of COLOR_KEYS) o[n] = new THREE.Color(src[n]);
    return o;
  });
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function createDayNight({ scene, sky, sun, hemi, rim, renderer, bloom, region, startHour = 9 }) {
  const storm = region === 'leotik' || (sky && sky.palette === 'storm');
  const P = storm ? STORM : GOLDEN;
  const keys = compile(P);
  const dayKey = compile({ keys: [[0, P.day]], day: P.day })[0];
  const cloudNight = new THREE.Color().fromArray(P.cloudNight), cloudGlow = new THREE.Color().fromArray(P.cloudGlow);

  // the region's own look, captured once: fog colour/distances, exposure, bloom threshold
  const fog = scene.fog;
  const base = {
    fogCol: fog ? fog.color.clone() : new THREE.Color(0xf6c89a),
    near: fog ? fog.near : 160, far: fog ? fog.far : 1200,
    exp: renderer ? renderer.toneMappingExposure : 1.08,
    thr: bloom ? bloom.threshold : 0.86,
  };

  // sun path: rises in the east, sets toward the old golden-hour direction
  const W = new THREE.Vector3(-0.58, 0, 0.81).normalize(), E = W.clone().negate();
  const S = new THREE.Vector3(0.81, 0, 0.58).normalize(), UP = new THREE.Vector3(0, 1, 0);
  const NOON = UP.clone().multiplyScalar(Math.sin(P.maxEl)).addScaledVector(S, Math.cos(P.maxEl));
  const MOON = new THREE.Vector3(-0.5, 0.58, -0.66).normalize();   // Velki-shine: from Velki's side of the sky

  // scratch (no per-frame allocation)
  const cur = { zen: [0, 0, 0], mid: [0, 0, 0], hor: [0, 0, 0], low: [0, 0, 0], glow: [0, 0, 0] };
  for (const n of COLOR_KEYS) cur[n] = new THREE.Color();
  const skyState = { zen: cur.zen, mid: cur.mid, hor: cur.hor, low: cur.low, glow: cur.glow,
    stars: 1, neb: 1, band: 0, night: 0, twilight: 0, sunVis: 1, cloudNight, cloudGlow };
  const lightDir = SUN_DIR;   // the live export, shared with main / anyone else
  const tmp = new THREE.Vector3();
  const nf = new THREE.Color(P.nightFog), nightFog = [nf.r, nf.g, nf.b];
  const fogRGB = [0, 0, 0], baseFog = [base.fogCol.r, base.fogCol.g, base.fogCol.b];

  let hour = ((startHour % 24) + 24) % 24;
  let night = 0, hemiNow = hemi ? hemi.intensity : 1;

  function sample(h) {
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1].h <= h) i++;
    const a = keys[i], b = keys[i + 1];
    const t = smooth(0, 1, (h - a.h) / (b.h - a.h));
    for (const n of VEC_KEYS) for (let c = 0; c < 3; c++) cur[n][c] = a[n][c] + (b[n][c] - a[n][c]) * t;
    for (const n of NUM_KEYS) cur[n] = a[n] + (b[n] - a[n]) * t;
    for (const n of COLOR_KEYS) cur[n].copy(a[n]).lerp(b[n], t);
  }

  function apply() {
    sample(hour);
    // true sun position on its arc (continues below the horizon at night)
    const p = (hour - SUNRISE) / (SUNSET - SUNRISE) * Math.PI;
    SKY_SUN.copy(E).multiplyScalar(Math.cos(p)).addScaledVector(NOON, Math.sin(p)).normalize();
    const el = SKY_SUN.y;
    night = 1 - smooth(-0.1, 0.08, el);
    const twilight = Math.exp(-(el / 0.14) * (el / 0.14));

    // shadow light: the sun while it is up, Velki-shine once it has set; swap while dim
    let w;
    if (el > -0.01) {
      tmp.copy(SKY_SUN); if (tmp.y < 0.14) { tmp.y = 0.14; } lightDir.copy(tmp.normalize());
      w = smooth(-0.01, 0.1, el);
    } else {
      lightDir.copy(MOON);
      w = smooth(-0.01, -0.14, el);
    }
    if (sun) { sun.color.copy(cur.sunCol); sun.intensity = cur.sunI * w; }
    if (hemi) {
      hemi.color.copy(cur.hemiSky); hemi.groundColor.copy(cur.hemiGnd);
      hemiNow = cur.hemiI;
      hemi.intensity = hemiNow + ((sky && sky.flash) || 0) * 2.5;
    }
    if (rim) { rim.color.copy(cur.rimCol); rim.intensity = cur.rimI; }

    if (fog && !api.holdFog) {
      // keep the region's own fog tint, re-lit by how the horizon has shifted from its daytime colour
      const dh = dayKey.hor, h = cur.hor, dm = dayKey.mid, m = cur.mid;
      for (let c = 0; c < 3; c++) {
        const ratio = (h[c] * 0.85 + m[c] * 0.15) / (dh[c] * 0.85 + dm[c] * 0.15);
        fogRGB[c] = Math.min(1, baseFog[c] * Math.pow(ratio, 2.2));   // sky colours are pre-gamma; fog is linear
        fogRGB[c] += (nightFog[c] - fogRGB[c]) * night;
      }
      fog.color.setRGB(fogRGB[0], fogRGB[1], fogRGB[2]);
      fog.near = base.near * cur.near; fog.far = base.far * cur.far;
    }
    if (renderer) renderer.toneMappingExposure = base.exp * cur.exp;
    if (bloom) { bloom.strength = cur.bloom; bloom.threshold = base.thr - night * 0.08; }

    if (sky && sky.setTime) {
      skyState.stars = cur.stars; skyState.neb = cur.neb; skyState.band = cur.band;
      skyState.night = night; skyState.twilight = twilight;
      skyState.sunVis = smooth(-0.12, 0.02, el);
      sky.setTime(skyState);
    }
  }

  const api = {
    dayLength: DAY_SECS + NIGHT_SECS,
    sunDir: lightDir,      // live direction TOWARD the shadow light (=== sky.js SUN_DIR)
    skySun: SKY_SUN,       // live true-sun direction (may point below the horizon)
    speed: 1,              // debug multiplier
    paused: false,
    holdFog: false,        // set true while something else owns scene.fog (e.g. the Kahizecvar memory)
    update(dt) {
      if (!api.paused && dt > 0) {
        const day = hour >= DAY_START && hour < DAY_END;
        const rate = day ? (DAY_END - DAY_START) / DAY_SECS : (24 - (DAY_END - DAY_START)) / NIGHT_SECS;
        hour = (hour + dt * rate * api.speed) % 24;
      }
      apply();
    },
    get hour() { return hour; },
    get night() { return night; },
    get hemiBase() { return hemiNow; },
    setHour(h) { hour = ((h % 24) + 24) % 24; apply(); },
    label() {
      const h = hour;
      if (h >= 5 && h < 7.5) return 'Dawn';
      if (h >= 7.5 && h < 11) return 'Morning';
      if (h >= 11 && h < 14) return 'Midday';
      if (h >= 14 && h < 17.3) return 'Afternoon';
      if (h >= 17.3 && h < 19.6) return 'Dusk';
      return 'Night';
    },
  };
  apply();
  return api;
}
