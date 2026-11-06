/* ============================================================
   PUNK RACES — js/pr_sim.js
   The race itself, with no drawing: the course, how a Punk runs,
   swings and flies, the rival riders, and who wins.
   Runs the same in a browser and in node (tests/test_punk_races.js).

   Coordinates: x to the right, y DOWN (as on a canvas), in px.
   About 40 px is a metre. The simulation steps at a fixed 1/120 s.
   ============================================================ */
(function (root) {
  'use strict';
  const PR = root.PR = root.PR || {};
  const STEP = 1 / 120;
  const G = 1500;               // gravity, px/s²
  const BASE_Y = 600;           // the ground's middle height
  const R = 24;                 // a Punk's radius
  PR.STEP = STEP; PR.BASE_Y = BASE_Y; PR.PUNK_R = R;

  /* small seeded random numbers (mulberry32) */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  PR.rng = rng;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ================= the course ================= */
  PR.makeCourse = function (track) {
    const r = rng(track.seed);
    const L = track.length;
    const course = { track, L, gaps: [], trees: [], anchors: [], fruit: [], zones: [], geysers: [], finish: L, startX: 120 };

    /* the ground: a few sine waves, flat at the start and the finish */
    const waves = [];
    for (let i = 0; i < 4; i++) waves.push({ a: (18 + r() * 40) * track.hills / (i + 1) * 1.6, f: (0.0012 + r() * 0.0016) * (i + 1), p: r() * 6.28 });
    const SAMPLE = 16, n = Math.ceil((L + 1600) / SAMPLE) + 1;
    const gy = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i * SAMPLE - 400;
      let h = 0; waves.forEach(w => { h += Math.sin(x * w.f + w.p) * w.a; });
      const calm = clamp(Math.min((x - 200) / 600, (L - 300 - x) / 600), 0, 1);
      gy[i] = BASE_Y + h * calm;
    }
    course.SAMPLE = SAMPLE; course.gy = gy;

    /* breaks in the ground, spread out between the start and the finish */
    const kinds = track.gapKinds || ['water'];
    const span = (L - 1800) / Math.max(1, track.gaps);
    for (let i = 0; i < track.gaps; i++) {
      const kind = kinds[i % kinds.length];
      const w = kind === 'water' ? 260 + r() * 220 : 200 + r() * 160;
      const x0 = 1100 + i * span + r() * (span - w - 200);
      course.gaps.push({ x0, x1: x0 + w, kind });
    }

    /* hazard patches on the ground (never inside a gap) */
    const hz = track.hazards || {};
    const freeAt = (x0, x1) => !course.gaps.some(g => x1 > g.x0 - 80 && x0 < g.x1 + 80) && !course.zones.some(z => x1 > z.x0 - 120 && x0 < z.x1 + 120);
    function place(kind, count, wMin, wMax) {
      for (let i = 0, tries = 0; i < count && tries < 200; tries++) {
        const w = wMin + r() * (wMax - wMin);
        const x0 = 900 + r() * (L - 1600);
        if (!freeAt(x0, x0 + w)) continue;
        course.zones.push({ x0, x1: x0 + w, kind });
        i++;
      }
    }
    if (hz.thorns) place('thorns', hz.thorns, 140, 260);
    if (hz.venom) place('venom', hz.venom, 220, 420);
    if (hz.geysers) {
      for (let i = 0, tries = 0; i < hz.geysers && tries < 200; tries++) {
        const x = 900 + r() * (L - 1600);
        if (!freeAt(x - 30, x + 30)) continue;
        course.geysers.push({ x, w: 46, period: 2.6 + r() * 1.6, phase: r() * 3, power: 3600 });
        course.zones.push({ x0: x - 40, x1: x + 40, kind: 'vent' });
        i++;
      }
    }
    course.fog = !!hz.fog;

    /* trees: one every few hundred px, with two or three branch tips
       (the anchors a vine can catch). A tall tree stands at each edge
       of a gap and leans over it, so every gap can be swung. */
    const tall = track.tall;
    function addTree(x, H, lean) {
      const base = course.groundAt(x);
      if (base == null) return;
      const top = base - H;
      const tree = { x, base, top, H, lean: lean || 0, kind: track.theme, seed: r() };
      course.trees.push(tree);
      const tips = 2 + (r() < 0.5 ? 1 : 0);
      for (let k = 0; k < tips; k++) {
        const side = k === 0 ? 1 : k === 1 ? -1 : (r() < 0.5 ? 1 : -1);
        const ax = x + lean * 0.6 + side * (40 + r() * 60);
        const ay = top + 30 + r() * 60 + (k === 2 ? 40 : 0);
        course.anchors.push({ x: ax, y: ay, tree: course.trees.length - 1 });
      }
    }
    course.groundAt = function (x) {
      for (let i = 0; i < course.gaps.length; i++) { const g = course.gaps[i]; if (x > g.x0 && x < g.x1) return null; }
      return course.surface(x);
    };
    course.surface = function (x) {
      const f = (x + 400) / SAMPLE, i = clamp(Math.floor(f), 0, n - 2);
      return lerp(gy[i], gy[i + 1], clamp(f - i, 0, 1));
    };
    course.gapAt = function (x) {
      for (let i = 0; i < course.gaps.length; i++) { const g = course.gaps[i]; if (x > g.x0 && x < g.x1) return g; }
      return null;
    };
    course.zoneAt = function (x) {
      for (let i = 0; i < course.zones.length; i++) { const z = course.zones[i]; if (x > z.x0 && x < z.x1) return z; }
      return null;
    };
    for (let x = 340; x < L - 120;) {
      const g = course.gaps.find(gg => x > gg.x0 - 100 && x < gg.x1 + 100);
      if (g) {
        /* the two edge trees lean over the gap */
        addTree(g.x0 - 50, tall[1] + 20, 50);
        addTree(g.x1 + 50, tall[1] + 20, -50);
        /* a wide gap gets a hanging root in the middle to catch */
        if (g.x1 - g.x0 > 300) course.anchors.push({ x: (g.x0 + g.x1) / 2, y: course.surface((g.x0 + g.x1) / 2) - tall[0] - 40, tree: -1, root: true });
        x = g.x1 + 50 + track.trees[0] * (0.7 + r() * 0.4);
        continue;
      }
      addTree(x, tall[0] + r() * (tall[1] - tall[0]), (r() - 0.5) * 30);
      x += track.trees[0] + r() * (track.trees[1] - track.trees[0]);
    }
    course.anchors.sort((a, b) => a.x - b.x);

    /* Ju fruit hang in the air between trees */
    for (let i = 0; i < track.fruit; i++) {
      const x = 600 + (i + 0.3 + r() * 0.4) * (L - 1000) / track.fruit;
      const s = course.surface(x);
      course.fruit.push({ x, y: s - 120 - r() * 160, id: i });
    }
    return course;
  };

  /* ================= a Punk in the race ================= */
  /* stats 1..10 → the numbers the physics uses */
  PR.derive = function (st) {
    return {
      run: 250 + st.speed * 17,          // ground speed, px/s
      drag: 0.16 - st.speed * 0.008,     // air drag per second
      reach: 200 + st.grip * 15,         // vine reach, px
      pump: 170 + st.spring * 20,        // swing pump, px/s²
      fling: 1.02 + st.spring * 0.004,   // speed kept on a clean release
      boost: 420 + st.nerve * 40,        // boost push, px/s
      fill: 0.17 + st.nerve * 0.02,      // boost gained by a clean release
    };
  };

  PR.makeRunner = function (course, o) {
    return {
      id: o.id, name: o.name, rider: o.rider, coat: o.coat || 'orange', hat: o.hat || '#6a5a2a', ai: !!o.ai, skill: o.skill == null ? 0.5 : o.skill,
      style: o.style || 'steady', stats: o.stats, d: PR.derive(o.stats), lane: o.lane || 0,
      x: course.startX - (o.lane || 0) * 6, y: course.surface(course.startX) - R, vx: 0, vy: 0,
      mode: 'ground', anchor: null, len: 0, swingT: 0, boost: 0.3, boostT: 0, stumble: 0, climb: 0, swimT: 0,
      finished: false, time: 0, place: 0, fruit: {}, clean: 0, falls: 0, swings: 0, best: 0,
      wantVine: false, think: 0, target: 0.6, events: [], trail: [],
      spin: 0, face: 1,
    };
  };

  /* the best branch tip for a vine, or null */
  PR.pickAnchor = function (course, u) {
    const reach = u.d.reach;
    const A = course.anchors;
    let best = null, bestS = -1e9;
    /* the anchors are sorted by x: look only near this Punk */
    let lo = 0, hi = A.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (A[m].x < u.x - 60) lo = m + 1; else hi = m; }
    for (let i = lo; i < A.length; i++) {
      const a = A[i];
      if (a.x > u.x + reach) break;
      const dx = a.x - u.x, dy = u.y - a.y;
      if (dy < 40) continue;                         // it must be above
      const dist = Math.hypot(dx, dy);
      if (dist > reach || dist < 70) continue;
      if (u.anchor === a) continue;
      /* forward and well up, about three quarters of the reach away */
      const s = dx * 1.2 + dy * 0.35 - Math.abs(dist - reach * 0.78) * 0.6;
      if (s > bestS) { bestS = s; best = a; }
    }
    return best;
  };

  function attach(course, u, a) {
    u.anchor = a;
    u.len = Math.max(60, Math.hypot(u.x - a.x, u.y - a.y) * 0.97);
    /* the vine reels in until the bottom of the arc clears the ground */
    const under = course.surface(a.x);
    u.lenTarget = Math.max(60, Math.min(u.len, under - R - a.y - 14));
    u.mode = 'swing'; u.swingT = 0; u.swings++;
    u.events.push({ t: 'vine', x: a.x, y: a.y });
  }
  function release(u) {
    if (u.mode !== 'swing') return;
    const sp = Math.hypot(u.vx, u.vy);
    const up = -u.vy, fw = u.vx;
    const ang = Math.atan2(up, fw) * 180 / Math.PI;     // 0 = flat ahead, 90 = straight up
    u.mode = 'air'; u.anchor = null;
    if (fw > 0 && ang > 18 && ang < 62 && sp > 380) {
      /* a clean release: thrown a little harder, and the boost fills */
      u.vx *= u.d.fling; u.vy *= u.d.fling;
      u.boost = Math.min(1, u.boost + u.d.fill);
      u.clean++;
      u.events.push({ t: 'clean', x: u.x, y: u.y });
    }
  }
  PR.release = release;

  function doBoost(u) {
    if (u.boost < 0.999 || u.boostT > 0 || u.climb > 0) return false;
    u.boost = 0; u.boostT = 0.7;
    u.events.push({ t: 'boost', x: u.x, y: u.y });
    return true;
  }

  /* one fixed step for one runner. input: { hold, jump, boost } (edges for jump/boost) */
  PR.stepRunner = function (course, u, input, t) {
    const dt = STEP, d = u.d;
    if (u.finished) {
      /* coast past the line */
      u.vx *= 0.985; u.x += u.vx * dt;
      const s = course.surface(u.x); u.y = s - R; return;
    }
    if (u.climb > 0) {
      /* climbing out of a chasm: frozen at its edge for a moment */
      u.climb -= dt; u.vx = 0; u.vy = 0;
      if (u.climb <= 0) { u.mode = 'ground'; }
      return;
    }
    if (u.stumble > 0) u.stumble -= dt;
    if (u.boostT > 0) u.boostT -= dt;

    /* the vine: press to catch, hold to swing, let go to fly */
    if (input.hold && u.mode !== 'swing' && !u.heldLast) {
      const a = PR.pickAnchor(course, u);
      if (a) attach(course, u, a);
      else if (u.mode === 'ground' || u.mode === 'swim') input.jump = true;
    }
    if (!input.hold && u.mode === 'swing') release(u);
    u.heldLast = !!input.hold;
    if (input.boost) doBoost(u);

    const zone = course.zoneAt(u.x);
    const slow = zone && (zone.kind === 'thorns' || zone.kind === 'venom');

    if (u.mode === 'ground') {
      const s = course.groundAt(u.x);
      if (s == null) { u.mode = 'air'; }
      else {
        let target = d.run * (slow ? (zone.kind === 'venom' ? 0.42 : 0.55) : 1) * (u.stumble > 0 ? 0.5 : 1);
        const acc = u.vx < target ? 520 : 900;
        u.vx += clamp(target - u.vx, -acc * dt, acc * dt);
        /* downhill helps a little, uphill costs a little */
        const slope = (course.surface(u.x + 8) - course.surface(u.x - 8)) / 16;
        u.vx += slope * 260 * dt;
        if (u.boostT > 0) u.vx += d.boost * 2.2 * dt;
        u.x += u.vx * dt;
        const s2 = course.groundAt(u.x);
        if (s2 == null) { u.mode = 'air'; u.vy = 0; }
        else {
          /* runs off a crest if it is going fast enough */
          if (s2 - R > u.y + 6 && u.vx > 420) { u.mode = 'air'; u.vy = 0; }
          else { u.y = s2 - R; u.vy = 0; }
        }
        if (input.jump && u.mode === 'ground') { u.mode = 'air'; u.vy = -560; u.events.push({ t: 'jump', x: u.x, y: u.y }); }
        if (slow && Math.random() < 0.08) u.events.push({ t: zone.kind, x: u.x, y: u.y + R });
      }
    } else if (u.mode === 'air' || u.mode === 'swing') {
      u.vy += G * dt;
      if (u.boostT > 0) { u.vx += d.boost * 2.2 * dt; u.vy -= 300 * dt; }
      if (u.mode === 'air') {
        u.vx *= 1 - d.drag * dt;
        /* past a Punk's top speed the air holds it back hard */
        const sp = Math.hypot(u.vx, u.vy), top = 640 + u.stats.speed * 22;
        if (sp > top) { const k = 1 - Math.min(0.5, (sp - top) / sp * 2.2 * dt); u.vx *= k; u.vy *= k; }
      } else {
        /* pump: push along the swing in the way it is already going, low in the arc */
        const a = u.anchor;
        const rx = u.x - a.x, ry = u.y - a.y, rl = Math.hypot(rx, ry) || 1;
        const tx = -ry / rl, ty = rx / rl;                 // tangent
        const vt = u.vx * tx + u.vy * ty;
        const low = ry / rl;                               // 1 at the bottom
        if (low > 0.2) { const p = d.pump * low * Math.sign(vt || 1); u.vx += tx * p * dt; u.vy += ty * p * dt; }
        u.swingT += dt;
        u.vx *= 1 - 0.02 * dt;
        if (u.len > u.lenTarget) u.len = Math.max(u.lenTarget, u.len - 420 * dt);
      }
      /* geysers throw you up */
      course.geysers.forEach(gz => {
        if (Math.abs(u.x - gz.x) < gz.w && PR.geyserOn(gz, t)) {
          const s = course.surface(gz.x);
          if (u.y > s - 700) { u.vy -= gz.power * dt; if (Math.random() < 0.05) u.events.push({ t: 'steam', x: u.x, y: u.y }); }
        }
      });
      u.x += u.vx * dt; u.y += u.vy * dt;
      if (u.mode === 'swing') {
        const a = u.anchor;
        const rx = u.x - a.x, ry = u.y - a.y, rl = Math.hypot(rx, ry);
        if (rl > u.len) {
          /* the vine is taut: back onto the circle, and no speed outward */
          const nx = rx / rl, ny = ry / rl;
          u.x = a.x + nx * u.len; u.y = a.y + ny * u.len;
          const vr = u.vx * nx + u.vy * ny;
          if (vr > 0) { u.vx -= vr * nx; u.vy -= vr * ny; }
        }
        /* a vine stretched too far back snaps */
        if (u.x < a.x - u.len * 0.95 && u.vx < 0) release(u);
      }
      /* the ground */
      const s = course.groundAt(u.x);
      if (s != null && u.y > s - R) {
        u.y = s - R;
        if (u.mode === 'swing') {
          /* feet on the ground under the vine: it keeps running */
          if (u.vy > 0) u.vy = 0;
          if (u.vx < d.run) u.vx += Math.min(d.run - u.vx, 520 * dt);
        } else {
          if (u.vy > 1000) { u.stumble = 0.4; u.vx *= 0.7; u.events.push({ t: 'thud', x: u.x, y: u.y + R }); }
          else u.events.push({ t: 'land', x: u.x, y: u.y + R });
          u.vy = 0; u.mode = 'ground';
        }
      }
      /* into the water or down a chasm */
      const g = course.gapAt(u.x);
      if (g) {
        const surf = Math.max(course.surface(g.x0), course.surface(g.x1));
        if (g.kind === 'water' && u.y > surf + 30 - R && u.mode !== 'swing') {
          u.mode = 'swim'; u.vy *= 0.2; u.vx *= 0.5; u.swimT = 0; u.events.push({ t: 'splash', x: u.x, y: surf + 30 });
        } else if (g.kind === 'chasm' && u.y > surf + 260) {
          /* fell: a slow climb out, up the far side */
          u.falls++; u.x = g.x1 + 40; u.y = course.surface(u.x) - R; u.vx = 0; u.vy = 0;
          u.mode = 'ground'; u.anchor = null; u.climb = 2.4;
          u.events.push({ t: 'fall', x: u.x, y: u.y });
        }
      }
    } else if (u.mode === 'swim') {
      const g = course.gapAt(u.x);
      const surf = g ? Math.max(course.surface(g.x0), course.surface(g.x1)) + 30 : course.surface(u.x);
      u.swimT += dt;
      u.vx += clamp(130 - u.vx, -400 * dt, 300 * dt);
      u.vy += ((surf - R * 0.4) - u.y) * 8 * dt; u.vy *= 1 - 3 * dt;
      u.x += u.vx * dt; u.y += u.vy * dt;
      if (Math.random() < 0.06) u.events.push({ t: 'paddle', x: u.x, y: surf });
      if (input.jump) { u.mode = 'air'; u.vy = -470; u.vx = Math.max(u.vx, 220); }
      if (!g) {
        /* climbed out onto the bank */
        const s = course.groundAt(u.x);
        if (s != null) { u.mode = 'ground'; u.y = s - R; u.vy = 0; }
        else u.mode = 'air';
      }
    }
    /* fruit */
    for (let i = 0; i < course.fruit.length; i++) {
      const f = course.fruit[i];
      if (u.fruit[f.id]) continue;
      if (Math.abs(u.x - f.x) < 34 && Math.abs(u.y - f.y) < 38) {
        u.fruit[f.id] = 1; u.boost = Math.min(1, u.boost + 0.45);
        u.events.push({ t: 'fruit', x: f.x, y: f.y });
      }
    }
    u.spin += u.vx * dt * 0.02;
    u.best = Math.max(u.best, Math.hypot(u.vx, u.vy));
    if (u.x >= course.finish && !u.finished) { u.finished = true; u.time = t; u.events.push({ t: 'finish', x: u.x, y: u.y }); if (u.mode === 'swing') release(u); }
  };

  PR.geyserOn = function (gz, t) { const ph = ((t + gz.phase) % gz.period) / gz.period; return ph < 0.38; };

  /* ================= the rival riders ================= */
  /* a rider's mind: when to catch, when to let go. skill 0..1 */
  PR.aiInput = function (course, u, t) {
    const inp = { hold: u.wantVine, jump: false, boost: false };
    u.think -= PR.STEP;
    const sk = u.skill;
    if (u.mode === 'swing') {
      const a = u.anchor;
      const fw = u.vx, up = -u.vy;
      const ang = Math.atan2(up, fw) * 180 / Math.PI;
      const past = u.x > a.x;
      /* aim for a release angle; worse riders wander off it */
      if (past && fw > 0 && up > 0 && ang > u.target) u.wantVine = false;
      if (u.swingT > 2.6 + sk) u.wantVine = false;
      /* a slow swing that will not get past the anchor: let go early */
      if (!past && u.swingT > 1.2 && Math.hypot(u.vx, u.vy) < 120) u.wantVine = false;
    } else if (u.think <= 0) {
      const a = PR.pickAnchor(course, u);
      const descending = u.mode !== 'air' || u.vy > -60;
      if (a && a.x > u.x + 50 && descending) {
        u.wantVine = true;
        /* the release angle this swing will aim for */
        const spread = (1 - sk) * 22;
        u.target = (u.style === 'reckless' ? 28 : u.style === 'clean' ? 36 : 40) + (Math.random() - 0.5) * 2 * spread;
      } else u.wantVine = false;
      u.think = 0.03 + (1 - sk) * 0.16 * Math.random();
    }
    /* jump a gap there is no branch for */
    if (u.mode === 'ground') {
      const ahead = course.gapAt(u.x + 70) || (course.zoneAt(u.x + 50) && course.zoneAt(u.x + 50).kind !== 'vent' && sk > 0.5);
      if (ahead && !u.wantVine && Math.random() < 0.5) inp.jump = true;
    }
    if (u.mode === 'swim') inp.jump = Math.random() < 0.01 + sk * 0.02;
    if (u.boost >= 0.999 && (u.mode === 'air' || u.mode === 'ground') && Math.random() < 0.004 + sk * 0.01) inp.boost = true;
    inp.hold = u.wantVine;
    return inp;
  };

  /* ================= a whole race ================= */
  PR.makeRace = function (track, entrants, opts) {
    opts = opts || {};
    const course = PR.makeCourse(track);
    const runners = entrants.map((e, i) => PR.makeRunner(course, Object.assign({ lane: i }, e)));
    return { track, course, runners, t: -3, step: 0, done: false, order: [], ghost: opts.ghost || null, record: [], acc: 0, finishedAt: 0 };
  };

  /* advance the race by real time dt (seconds); playerInput for the runner with ai=false */
  PR.tick = function (race, dt, playerInput) {
    race.acc += Math.min(dt, 0.1);
    while (race.acc >= STEP) {
      race.acc -= STEP;
      if (race.t < 0) { race.t += STEP; continue; }
      race.runners.forEach(u => {
        const inp = u.ai ? PR.aiInput(race.course, u, race.t) : (playerInput || { hold: false });
        PR.stepRunner(race.course, u, inp, race.t);
        if (inp.jump && !u.ai && playerInput) playerInput.jump = false;
        if (inp.boost && !u.ai && playerInput) playerInput.boost = false;
        if (u.finished && race.order.indexOf(u) < 0) { race.order.push(u); u.place = race.order.length; }
      });
      if (race.step % 6 === 0) {
        const me = race.runners.find(u => !u.ai);
        if (me && !me.finished) race.record.push(Math.round(me.x), Math.round(me.y));
      }
      race.step++; race.t += STEP;
      const left = race.runners.filter(u => !u.finished);
      if (!left.length && !race.done) { race.done = true; race.finishedAt = race.t; }
      /* once you are home, the rest are given 25 s, then timed by how far they had to go */
      const me = race.runners.find(u => !u.ai);
      if (!race.done && me && me.finished && race.t > me.time + 25) PR.settle(race);
      if (!race.done && race.t > 240) PR.settle(race);
      if (race.done) break;
    }
  };

  /* finish everyone still out on the course, by their pace so far */
  PR.settle = function (race) {
    race.runners.filter(u => !u.finished).sort((a, b) => b.x - a.x).forEach(u => {
      const pace = Math.max(120, u.x / Math.max(1, race.t));
      u.finished = true; u.time = race.t + (race.course.finish - u.x) / pace;
      race.order.push(u); u.place = race.order.length;
    });
    race.order.sort((a, b) => a.time - b.time); race.order.forEach((u, i) => { u.place = i + 1; });
    race.done = true; race.finishedAt = race.t;
  };

  /* run a whole race with nobody steering (for watched races and tests) */
  PR.simulate = function (track, entrants, maxT) {
    const race = PR.makeRace(track, entrants.map(e => Object.assign({}, e, { ai: true })));
    const end = maxT || 240;
    while (!race.done && race.t < end) PR.tick(race, 0.1);
    if (!race.done) PR.settle(race);
    return race;
  };

  /* places on the course right now (1 = leading) */
  PR.standings = function (race) {
    return race.runners.slice().sort((a, b) => {
      if (a.finished && b.finished) return a.time - b.time;
      if (a.finished) return -1; if (b.finished) return 1;
      return b.x - a.x;
    });
  };

  /* how good a Punk is, for the betting odds */
  PR.rating = function (stats, skill) {
    return stats.speed * 1.0 + stats.grip * 1.1 + stats.spring * 1.2 + stats.nerve * 0.6 + (skill || 0.5) * 14;
  };
  /* decimal odds from ratings (with the house's cut) */
  PR.odds = function (ratings) {
    const w = ratings.map(r => Math.exp(r / 6));
    const sum = w.reduce((a, b) => a + b, 0);
    return w.map(x => Math.max(1.2, Math.round((sum / x) * 0.85 * 10) / 10));
  };

  /* ================= a Punk in your stable ================= */
  PR.newPunk = function (r, o) {
    o = o || {};
    const grade = o.grade || 0;                 // 0 plain, 1 good, 2 fine
    const pot = 22 + grade * 6 + Math.floor(r() * 6);     // the most its stats can add up to
    const st = { speed: 1, grip: 1, spring: 1, nerve: 1 };
    let pts = 4 + grade * 2 + Math.floor(r() * 3);
    const keys = Object.keys(st);
    while (pts-- > 0) st[keys[Math.floor(r() * 4)]]++;
    const coat = o.coat || PR.FOAL_COATS[Math.floor(r() * PR.FOAL_COATS.length)];
    if (coat === 'wild') st.grip++;
    if (coat === 'ember') st.nerve++;
    return { id: 'p' + Date.now().toString(36) + Math.floor(r() * 1e6).toString(36), name: o.name || PR.punkName(r), coat, stats: st, pot: Math.min(36, pot), races: 0, wins: 0, born: Date.now() };
  };
  PR.statTotal = p => p.stats.speed + p.stats.grip + p.stats.spring + p.stats.nerve;
  PR.canTrain = (p, k) => p.stats[k] < PR.STAT_MAX && PR.statTotal(p) < p.pot;

  /* pair two Punks: the foal takes after both, with a little luck */
  PR.pair = function (r, a, b) {
    const st = {};
    Object.keys(a.stats).forEach(k => { st[k] = clamp(Math.round((a.stats[k] + b.stats[k]) / 2 * 0.6 + r() * 2), 1, 6); });
    const pot = clamp(Math.round((a.pot + b.pot) / 2 + (r() * 6 - 2)), 20, 36);
    const coat = r() < 0.45 ? a.coat : r() < 0.8 ? b.coat : PR.FOAL_COATS[Math.floor(r() * PR.FOAL_COATS.length)];
    return { id: 'p' + Date.now().toString(36) + Math.floor(r() * 1e6).toString(36), name: PR.punkName(r), coat, stats: st, pot, races: 0, wins: 0, born: Date.now(), parents: [a.name, b.name] };
  };

  /* a rival's Punk, as strong as the cup asks */
  PR.rivalStats = function (riv, level, r) {
    const base = 2 + level * 6.5;
    const st = {};
    ['speed', 'grip', 'spring', 'nerve'].forEach(k => { st[k] = clamp(Math.round(base + (riv.bias[k] || 0) * 1.5 + (r() - 0.5) * 2), 1, 10); });
    return st;
  };
})(typeof window !== 'undefined' ? window : globalThis);
