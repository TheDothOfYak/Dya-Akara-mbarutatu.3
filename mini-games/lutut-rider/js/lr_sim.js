// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   LÚTUT RIDER — js/lr_sim.js
   The ride itself, with no drawing: the land (hills, mesas and
   chasms, marsh pools), what stands on it and lives on it, and a
   Lútut with an Eikar on its back.

   How a Lútut flies: it is a heavy stone drop, so it can't hover.
   It holds the air only while it is moving: speed gives lift, the
   nose sets where that lift goes, and too steep a nose stalls it.
   A wingbeat pushes it on and pitches the nose up, and costs meat
   from its gullet. Tucking the wings pitches the nose down and dives,
   which is how you get speed back. Out of meat it can only glide.

   What ends a ride:
     • the Eikar is thrown: a landing too hard, or too far off the
       slope (on its back, on its side);
     • the tail shatters: the head is near unbreakable, but the thin
       tail cracks when it strikes first, or slaps down too hard;
     • it goes into marsh water (stone sinks) or down a chasm;
     • it is out of meat and comes to a stop on the ground.

   Everything is metres and seconds, x to the right, y up. The sim
   steps a fixed LR.DT, so the same inputs always give the same ride.
   ============================================================ */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const LR = G.LR;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const wrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  LR.wrap = wrap;

  /* ================= the land ================= */
  function hash(seed, i) {
    let h = (seed * 374761393 + i * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function noise(seed, x) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(hash(seed, i), hash(seed, i + 1), u) * 2 - 1;
  }
  LR.noise = noise; LR.hash = hash;

  LR.START_FLAT = 22;          // the roost ledge runs to here
  LR.makeLand = function (stage) {
    const S = typeof stage === 'string' ? LR.stage(stage) : stage;
    const seed = S.seed;
    const segs = new Map();
    const land = { stage: S, seed };

    /* the rolling land before any chasm or pool is cut into it */
    function base(x) {
      const A = Math.min(3, 1 + S.grow * Math.max(0, x) / 1000);
      let h = S.amp * A * (0.72 * noise(seed, x / S.wave) + 0.28 * noise(seed + 7, x / (S.wave * 0.37)));
      h += S.rough * noise(seed + 13, x / 9) + S.rough * 0.4 * noise(seed + 17, x / 3.1);
      if (S.cliffs) {      // flat-topped mesas: terrace the hills
        const step = 9 * Math.min(2, A), q = h / step, fl = Math.floor(q);
        h = (fl + sstep(0.38, 0.62, q - fl)) * step + S.rough * noise(seed + 19, x / 5);
      }
      return h;
    }
    land.base = base;
    /* the roost ledge you start on, high above the first slope */
    const H0 = Math.max(base(0), base(40), base(70)) + 12;
    land.H0 = H0;

    /* each 120 m stretch: its chasm or pool, and what stands and lives on it */
    function seg(i) {
      if (segs.has(i)) return segs.get(i);
      const r = LR.rng(seed * 1009 + i * 7919 + 3);
      const x0 = i * LR.SEG, far = Math.max(0, x0);
      const sg = { i, x0, cut: null, teeth: [], prey: [], rocks: [], trees: [], thermals: [] };
      segs.set(i, sg);
      if (i < 1) return sg;
      const hard = Math.min(1, far / 4000);
      /* a chasm (canyons) or a pool (marsh) */
      if (S.cliffs && r() < 0.28 + 0.3 * hard && i > 1) {
        const w = 14 + r() * (10 + 22 * hard);
        sg.cut = { kind: 'chasm', a: x0 + 30 + r() * (LR.SEG - 60 - w), w, depth: 55 };
      } else if (S.water && r() < 0.45 + 0.25 * hard) {
        const w = 12 + r() * (14 + 20 * hard);
        sg.cut = { kind: 'pool', a: x0 + 25 + r() * (LR.SEG - 50 - w), w, depth: 5 };
      }
      if (sg.cut) { sg.cut.b = sg.cut.a + sg.cut.w; sg.cut.rim = Math.min(base(sg.cut.a), base(sg.cut.b)) - (sg.cut.kind === 'pool' ? 0.6 : 0); }
      const inCut = x => sg.cut && x > sg.cut.a - 3 && x < sg.cut.b + 3;
      const free = x => !inCut(x) && x > LR.START_FLAT + 60;
      /* teeth, in a few shapes */
      if (r() < 0.8) {
        const shape = r(), cx = x0 + 15 + r() * (LR.SEG - 40), n = 6 + Math.floor(r() * 5);
        for (let k = 0; k < n; k++) {
          let tx, ty;
          if (shape < 0.35) { tx = cx + k * 2.6; ty = h(tx) + 2.2; }                                   // along the ground
          else if (shape < 0.7) { const u = k / (n - 1); tx = cx + k * 3; ty = h(cx) + 6 + Math.sin(u * Math.PI) * (8 + 10 * r()); }  // an arc
          else if (shape < 0.88) { tx = cx + k * 3; ty = h(cx) + 26 + 10 * hard + Math.sin(k * 0.8) * 1.5; }  // high up: climb for them
          else { tx = cx + k * 3; ty = h(cx) + 22 - k * 2.4; }                                         // a dive line
          if (!inCut(tx) || shape >= 0.35) sg.teeth.push({ x: tx, y: Math.max(ty, h(tx) + 1.6), got: false });
        }
      }
      /* prey: fewer and further between the further out you ride */
      const wsum = Object.values(S.prey).reduce((a, b) => a + b, 0);
      const pick = () => { let q = r() * wsum; for (const k in S.prey) { q -= S.prey[k]; if (q <= 0) return k; } return 'hopper'; };
      const meals = S.meals * Math.max(0.42, 1 - far / 7000);
      let n = Math.floor(meals + r());
      for (let k = 0; k < n; k++) {
        let kind = pick();
        if (kind === 'eel' && !(sg.cut && sg.cut.kind === 'pool')) kind = 'hopper';
        const px = kind === 'eel' ? (sg.cut.a + sg.cut.b) / 2 : x0 + 10 + r() * (LR.SEG - 20);
        if (kind !== 'eel' && kind !== 'byrd' && !free(px)) continue;
        if (kind === 'byrd') {
          const alt = 9 + r() * 16, cnt = 3 + Math.floor(r() * 3);
          for (let b = 0; b < cnt; b++) sg.prey.push({ kind, x: px + b * 2.2, y: h(px) + alt, hx: px + b * 2.2, alt: alt + (b % 2) * 2, ph: r() * TAU, scare: 0, eaten: false });
        } else if (kind === 'eel') {
          sg.prey.push({ kind, x: px, y: sg.cut.rim - 2, vx: 0, vy: 0, wait: 0.5 + r() * 2.5, up: false, eaten: false });
        } else sg.prey.push({ kind, x: px, y: h(px), vx: 0, vy: 0, gr: true, wait: r() * 2, eaten: false });
      }
      /* standing stones */
      const nr = Math.floor(S.rocks * (1 + far / 3000) + r());
      for (let k = 0; k < nr; k++) {
        const rx = x0 + 8 + r() * (LR.SEG - 16);
        if (!free(rx)) continue;
        const rh = 1.4 + r() * (2 + 2.5 * hard), rw = 1.3 + r() * 1.6;
        sg.rocks.push({ x: rx, w: rw, h: rh, y: h(rx) - 0.4, broken: false, kind: 'rock', seed: (r() * 1e6) | 0 });
      }
      /* trees */
      const nt = Math.floor(S.trees * (1 + far / 5000) + r());
      for (let k = 0; k < nt; k++) {
        const tx = x0 + 6 + r() * (LR.SEG - 12);
        if (!free(tx)) continue;
        const th = 9 + r() * (9 + 8 * hard);
        sg.trees.push({ x: tx, w: 1.1 + th * 0.03, h: th, y: h(tx) - 0.3, broken: false, kind: 'tree', seed: (r() * 1e6) | 0 });
      }
      /* warm air rising */
      if (r() < S.thermals) sg.thermals.push({ x: x0 + 20 + r() * (LR.SEG - 40), w: 16 + r() * 18, s: 7 + r() * 6 });
      return sg;
    }
    land.seg = seg;

    function h(x) {
      if (x < LR.START_FLAT) return H0;
      let y = base(x);
      if (x < LR.START_FLAT + 55) y = lerp(H0, y, sstep(LR.START_FLAT, LR.START_FLAT + 55, x));     // the run-off slope from the roost
      const sg = seg(Math.floor(x / LR.SEG)), c = sg.cut;
      if (c && x > c.a - 4 && x < c.b + 4) {
        if (c.kind === 'chasm') {
          const wall = 2.2, k = Math.min(sstep(c.a - wall, c.a + wall, x), 1 - sstep(c.b - wall, c.b + wall, x));
          y = lerp(Math.max(y, c.rim), c.rim - c.depth, k);
        } else {
          const k = Math.min(sstep(c.a - 3, c.a + 2, x), 1 - sstep(c.b - 2, c.b + 3, x));
          y = lerp(y, c.rim - c.depth, k);
        }
      }
      return y;
    }
    land.h = h;
    land.slope = x => Math.atan2(h(x + 0.5) - h(x - 0.5), 1);
    land.cutAt = x => { const c = seg(Math.floor(x / LR.SEG)).cut; return c && x > c.a && x < c.b ? c : null; };
    /* every stretch that touches [a, b] */
    land.segsIn = function (a, b) { const out = []; for (let i = Math.floor(a / LR.SEG); i <= Math.floor(b / LR.SEG); i++) out.push(seg(i)); return out; };
    /* the wind along the ridge: gusts that come and go, both ways */
    land.wind = (x, t) => S.wind ? S.wind * (0.65 * Math.sin(t * 0.23 + x / 260) + 0.35 * Math.sin(t * 0.71 + x / 70)) : 0;
    return land;
  };

  /* ================= a ride ================= */
  LR.R = 1.3;                       // a grown Lútut's body radius (m), the size the drawing is made at
  LR.makeRun = function (o) {
    const st = LR.stats(o.kind || 'young', o.up);
    const land = o.land || LR.makeLand(o.stage || 'downs');
    const r = LR.R * st.scale;
    const run = {
      st, land, stage: land.stage, r, t: 0,
      x: 0, y: land.H0 + r, vx: 0, vy: 0, ang: 0, av: 0,
      grounded: true, air: 0, rot: 0, hunger: st.gullet, cracks: 0, numb: 0,
      suckT: 0, beating: false, tucking: false, tailCool: 0, headCool: 0, stallT: 0, skimT: 0, wingT: 0,
      dist: 0, teeth: 0, eaten: 0, best: o.best || 0, passedBest: false, nextStone: 250,
      tally: { eaten: {}, smashed: 0, clean: 0, loops: 0, airMax: 0, skimMax: 0, cracks: 0, teethPicked: 0, tricks: 0, prey: 0 },
      ev: [], over: null, overT: 0, rider: null,
    };
    return run;
  };
  const mult = run => 1 + run.dist / 1500;
  function event(run, k, text, teeth) {
    teeth = Math.round(teeth || 0);
    if (teeth) { run.teeth += teeth; run.tally.tricks += k === 'prey' || k === 'tooth' ? 0 : teeth; }
    run.ev.push({ k, text, teeth, t: run.t });
  }
  LR.heading = run => [Math.cos(run.ang), Math.sin(run.ang)];
  /* where the head (mouth), the tail ball and the saddle are */
  LR.points = function (run) {
    const c = Math.cos(run.ang), s = Math.sin(run.ang), r = run.r;
    const at = (f, u) => [run.x + c * f - s * u, run.y + s * f + c * u];
    return { head: at(1.1 * r, 0.05 * r), tail: at(-2.95 * r, -0.2 * r), seat: at(-0.1 * r, 0.9 * r), c, s };
  };

  function end(run, why, text) {
    if (run.over) return;
    run.over = why; run.overT = 0;
    run.ev.push({ k: 'end', text: text || LR.ENDS[why], teeth: 0, t: run.t });
    if (why === 'thrown') {
      const P = LR.points(run);
      run.rider = { x: P.seat[0], y: P.seat[1], vx: run.vx * 0.9 + 2, vy: Math.max(run.vy, 0) * 0.6 + 6, rot: run.ang, av: 7 + Math.random() * 4,
        hat: { x: P.seat[0], y: P.seat[1] + 0.8, vx: run.vx * 0.6 - 1, vy: 8, rot: 0, av: -9 } };
    }
  }
  function crack(run, text) {
    if (run.tailCool > 0 || run.over) return;
    run.tailCool = 0.6; run.cracks++; run.tally.cracks++;
    if (run.cracks >= run.st.cracks) end(run, 'shattered');
    else event(run, 'crack', text || 'Tail cracked!', 0);
  }
  function thrown(run, text) { end(run, 'thrown', text ? 'Your Eikar was thrown off: ' + text + '.' : null); }

  /* a landing: impact is how fast it met the ground (m/s, along the ground's normal) */
  function landing(run, impact, slope) {
    const st = run.st, diff = wrap(run.ang - slope), air = run.air;
    run.tally.airMax = Math.max(run.tally.airMax, air);
    if (Math.abs(diff) > st.grip) return thrown(run, diff > 0 ? 'it came down on its back' : 'it came down nose-first, too steep');
    if (impact > st.hardHit) return thrown(run, 'it landed far too hard');
    if (diff > 0.22 && impact > st.tailHit * 0.55) crack(run, 'Tail struck first: cracked!');
    else if (diff >= -0.22 && impact > st.tailHit * 1.3) crack(run, 'Hard landing: the tail cracked!');
    else if (diff < -0.22 && impact > 5) { run.vx *= 0.86; run.vy *= 0.86; event(run, 'plough', 'Head first!', 0); }
    if (air > 1 && impact < 5.5 && Math.abs(diff) < 0.3) {
      run.tally.clean++;
      event(run, 'clean', air > 3 ? 'Clean landing · ' + air.toFixed(1) + ' s in the air' : 'Clean landing', (4 + air * 3) * mult(run));
    } else if (air > 3) event(run, 'air', air.toFixed(1) + ' s in the air', air * 2 * mult(run));
  }

  /* how much lift the wings give at angle of attack a (rad) */
  function liftCoef(a, tuck) {
    if (tuck) return 0.12 * clamp(a, -1, 1);
    if (a > 0.42) return Math.max(0.35, 1.476 - 2.2 * (a - 0.42));     // stalling
    if (a < -0.42) return Math.min(-0.2, -0.876 + 1.5 * (-0.42 - a));
    return 0.3 + 2.8 * a;
  }
  LR.liftCoef = liftCoef;

  /* one step. inp: { beat, tuck } */
  LR.step = function (run, inp) {
    const dt = LR.DT, st = run.st, land = run.land, r = run.r, g = LR.G;
    run.t += dt;
    if (run.over) { run.overT += dt; inp = {}; }
    if (run.over === 'sank' || run.over === 'fell') { run.vy -= g * dt; run.vx *= 0.98; run.x += run.vx * dt; run.y += run.vy * dt; stepRider(run, dt); return run; }
    run.numb = Math.max(0, run.numb - dt);
    run.tailCool = Math.max(0, run.tailCool - dt); run.headCool = Math.max(0, run.headCool - dt);
    run.suckT = Math.max(0, run.suckT - dt);
    const hungry = run.hunger <= 0;
    const beat = !!inp.beat && !hungry && run.numb <= 0 && !run.over;
    const tuck = !!inp.tuck && !beat && !run.over;
    run.beating = beat; run.tucking = tuck;
    run.hunger = Math.max(0, run.hunger - dt * (1.6 * Math.sqrt(st.mass) + (beat ? st.beatCost : 0)));
    run.leapCool = Math.max(0, (run.leapCool || 0) - dt);
    run.wingT += dt * (beat ? 1 : 0);

    /* ---- forces ---- */
    const wind = land.wind(run.x, run.t);
    const axr = run.vx - wind, ayr = run.vy, v = Math.hypot(axr, ayr);
    let ax = 0, ay = -g, alpha = 0;
    if (v > 0.4) {
      const dir = Math.atan2(ayr, axr);
      alpha = wrap(run.ang - dir);
      const a = clamp(alpha, -1.4, 1.4);
      const CL = Math.abs(alpha) > 1.4 ? 0.1 * Math.sign(alpha) : liftCoef(a, tuck);
      const kL = 0.06 * st.lift / Math.pow(st.mass, 0.15);
      const L = clamp(kL * CL * v * v, -40, 40);
      ax += -ayr / v * L; ay += axr / v * L;
      const cd = tuck ? 0.0016 : (0.0032 + 0.0045 * CL * CL) * st.drag;
      const D = cd * v * v;
      ax -= axr / v * D; ay -= ayr / v * D;
    }
    if (beat) {
      /* a heavy stone can't climb on its wings alone: the higher the nose, the less a beat does */
      const eff = run.grounded ? 1 : clamp(1 - Math.max(0, Math.sin(run.ang) - 0.3) / 0.6, 0.12, 1);
      const T = 7.2 * st.power / Math.pow(st.mass, 0.3) * eff;
      ax += Math.cos(run.ang) * T; ay += Math.sin(run.ang) * T + (run.grounded ? 0 : 2.4 * st.power * eff);
      /* slow on the ground (stuck at a stone, or starting up a steep slope): a big beat lifts it off its feet */
      if (run.grounded && Math.hypot(run.vx, run.vy) < 5 && run.leapCool <= 0 && run.t > 0.5) { run.vy += 7 * Math.sqrt(st.power); run.leapCool = 0.9; run.leapT = run.t; }
    }
    /* warm air rising off the land */
    if (!tuck) {
      const hag = run.y - land.h(run.x);
      for (const sg of land.segsIn(run.x - 40, run.x + 40)) for (const th of sg.thermals) {
        const d = Math.abs(run.x - th.x);
        if (d < th.w && hag < 75) ay += th.s * (1 - d / th.w) * (1 - hag / 75);
      }
    }
    run.vx += ax * dt; run.vy += ay * dt;
    const sp = Math.hypot(run.vx, run.vy);
    if (sp > 58) { run.vx *= 58 / sp; run.vy *= 58 / sp; }

    /* ---- pitch ---- */
    let torque = (beat ? 2.5 : tuck ? -4.2 : 0) * st.turn;
    if (!run.grounded && v > 0.4) torque += -6.5 * alpha * clamp(v / 15, 0.2, 1.6) - 0.5;
    if (!run.grounded && v < 9 && Math.sin(run.ang) > 0) torque -= 5 * (1 - v / 9) * Math.sin(run.ang);      // stalled: the heavy head drops the nose
    run.av += torque * dt;
    run.av *= Math.exp(-2.6 * dt);
    run.ang = wrap(run.ang + run.av * dt);
    if (!run.grounded) run.rot += run.av * dt;
    if (Math.abs(run.rot) >= TAU) {
      run.rot -= Math.sign(run.rot) * TAU; run.tally.loops++;
      event(run, 'loop', run.rot > 0 || run.av > 0 ? 'Loop!' : 'Forward roll!', 50 * mult(run));
    }

    run.x += run.vx * dt; run.y += run.vy * dt;

    /* ---- the ground under the body ---- */
    const gh = land.h(run.x), slope = land.slope(run.x), cs = Math.cos(slope);
    const cut = land.cutAt(run.x);
    if (cut && cut.kind === 'pool' && run.y - r * 0.6 < cut.rim) { end(run, 'sank'); return run; }
    if (cut && cut.kind === 'chasm' && run.y < cut.rim - 16) { end(run, 'fell'); return run; }
    const rb = r * 1.0;
    if (run.y < gh + rb / cs) {
      const nx = -Math.sin(slope), ny = cs;
      const vn = run.vx * nx + run.vy * ny;
      if (!run.grounded && run.air > 0.12 && !run.over) landing(run, -vn, slope);
      run.y = gh + rb / cs;
      if (vn < 0) { run.vx -= vn * nx; run.vy -= vn * ny; }
      /* along the ground: rolling, braking with the claws, or running */
      const tx = cs, ty = Math.sin(slope);
      let vt = run.vx * tx + run.vy * ty;
      const fr = (tuck ? 7 : 0.35 + (run.over ? 3 : 0)) * dt;
      vt = Math.abs(vt) <= fr ? 0 : vt - Math.sign(vt) * fr;
      const vnn = run.vx * nx + run.vy * ny;
      run.vx = tx * vt + nx * vnn; run.vy = ty * vt + ny * vnn;
      if (!run.grounded) run.rot = 0;
      run.grounded = true; run.air = 0;
      /* on the ground the body lies along the slope (nose up a touch while it beats to take off) */
      const back = Math.atan2(gh - land.h(run.x - 2.6 * r), 2.6 * r);      // lie along the land under the whole body, tail and all
      const target = clamp(Math.min(slope, back), slope - 0.5, slope) + (beat ? 0.2 : 0);
      run.av = run.av * 0.6 + wrap(target - run.ang) * 9;
      if (run.over === 'thrown') run.av *= 0.5;
    } else { run.grounded = false; run.air += dt; }

    /* ---- the head and the tail against the land ---- */
    const P = LR.points(run), hc = [P.c, P.s];
    {
      const hy = land.h(P.head[0]);
      if (P.head[1] < hy - 0.15 && !run.over) {         // nose into a hillside or a chasm wall
        const vh = run.vx * hc[0] + run.vy * hc[1];
        if (vh > st.hardHit * 1.05) thrown(run, 'headlong into the hillside');
        else if (vh > 0) { run.vx -= hc[0] * vh * 1.25; run.vy -= hc[1] * vh * 1.25; if (vh > 4 && run.headCool <= 0) { run.headCool = 0.5; event(run, 'bonk', 'Bonk!', 0); } }
        run.y += Math.min(1, hy - P.head[1]) * 0.5; run.av += 1.2;
      }
    }
    {
      const ty = land.h(P.tail[0]);
      if (P.tail[1] < ty) {
        const lx = P.tail[0] - run.x, ly = P.tail[1] - run.y;
        const tvx = run.vx - run.av * ly, tvy = run.vy + run.av * lx;
        const ts = land.slope(P.tail[0]), nx = -Math.sin(ts), ny = Math.cos(ts);
        const imp = -(tvx * nx + tvy * ny);
        if (imp > st.tailHit && !run.over) crack(run, 'The tail struck the ground: cracked!');
        if (!run.grounded) run.av -= Math.max(0, imp) * 0.18 + (ty - P.tail[1]) * 2;
        if (!run.grounded) run.y += Math.min(0.5, ty - P.tail[1]) * 0.3;
      }
    }

    /* ---- stones and trees ---- */
    for (const sg of land.segsIn(run.x - 20, run.x + 20)) {
      for (const o of sg.rocks.concat(sg.trees)) {
        if (o.broken) continue;
        const top = o.y + (o.kind === 'tree' ? o.h * 0.8 : o.h), hw = o.w / 2;
        const inside = (p, pad) => p[0] > o.x - hw - pad && p[0] < o.x + hw + pad && p[1] < top + pad && p[1] > o.y - 1;
        if (inside(P.head, r * 0.35) && !run.over) {
          const vh = run.vx * hc[0] + run.vy * hc[1];
          const need = st.smashV * (o.kind === 'tree' ? 1.5 : 1) * (0.6 + o.h / (o.kind === 'tree' ? 30 : 6));
          if (vh > need) {
            o.broken = true; run.tally.smashed++; run.vx *= 0.84; run.vy *= 0.84;
            event(run, 'smash', o.kind === 'tree' ? 'Smashed a tree!' : 'Smashed a stone!', (o.kind === 'tree' ? 10 : 5) * mult(run));
          } else if (vh > 0) {
            if (vh > st.hardHit * 1.05) { thrown(run, 'it hit the ' + (o.kind === 'tree' ? 'tree' : 'stone') + ' too fast to break it'); }
            run.vx -= hc[0] * vh * 1.3; run.vy -= hc[1] * vh * 1.3;
            run.x -= hc[0] * 0.25;
            if (run.headCool <= 0) { run.headCool = 0.5; event(run, 'bonk', 'Too slow to break it', 0); }
          }
        }
        if (o.broken) continue;
        if (o.kind === 'rock' && inside([run.x, run.y - r], 0) && run.vy <= 0 && run.y - r > top - 0.8) {   // standing on top of a stone
          run.y = top + r; run.vy = 0; run.grounded = true;
        }
        if (inside(P.tail, 0.15) && !run.over) {
          crack(run, o.kind === 'tree' ? 'The tail caught a tree: cracked!' : 'The tail caught a stone: cracked!');
          run.av -= 1.5; run.vx *= 0.92;
        }
      }
    }

    /* ---- what it eats, and the teeth it picks up ---- */
    const m = mult(run);
    for (const sg of land.segsIn(run.x - 90, run.x + 180)) {
      for (const p of sg.prey) if (!p.eaten) movePrey(run, p, dt);
      if (Math.abs(sg.x0 + LR.SEG / 2 - run.x) > LR.SEG * 1.2 || run.over) continue;
      for (const p of sg.prey) {
        if (p.eaten || (p.kind === 'eel' && !p.up)) continue;
        const P2 = PR[p.kind], d = Math.hypot(p.x - P.head[0], p.y + P2.size * 0.5 - P.head[1]);
        const front = (p.x - run.x) * hc[0] + (p.y - run.y) * hc[1] > 0;
        if (d < st.suck + P2.size && front) {
          if (Math.hypot(run.vx, run.vy) < P2.minV) {
            if (!p.slow) { p.slow = true; event(run, 'slow', 'Too slow to suck in a Shellback', 0); }
            continue;
          }
          p.eaten = true; run.eaten++; run.tally.prey++;
          run.tally.eaten[p.kind] = (run.tally.eaten[p.kind] || 0) + 1;
          run.hunger = Math.min(st.gullet, run.hunger + P2.food);
          run.suckT = 0.45;
          if (p.kind === 'byrd') run.numb = 1.1;
          event(run, 'prey', P2.name + (p.kind === 'byrd' ? ' · stung!' : ''), P2.teeth);
        }
      }
      for (const tt of sg.teeth) {
        if (tt.got) continue;
        if (Math.hypot(tt.x - run.x, tt.y - run.y) < r * 1.25 + 0.6 || Math.hypot(tt.x - P.head[0], tt.y - P.head[1]) < r * 0.7 + 0.6) {
          tt.got = true; const val = LR.toothValue(run.dist);
          run.tally.teethPicked += val;
          event(run, 'tooth', '', val);
        }
      }
    }

    /* ---- skimming low and fast ---- */
    const hag = run.y - gh - rb;
    if (!run.grounded && hag < r * 1.6 && Math.hypot(run.vx, run.vy) > 14 && !run.over) run.skimT += dt;
    else {
      if (run.skimT > 1.2) { event(run, 'skim', 'Skimming · ' + run.skimT.toFixed(1) + ' s', run.skimT * 4 * m); }
      run.tally.skimMax = Math.max(run.tally.skimMax, run.skimT); run.skimT = 0;
    }

    /* ---- distance, and the end of the meat ---- */
    if (!run.over) {
      run.dist = Math.max(run.dist, run.x);
      if (run.best > 50 && !run.passedBest && run.dist > run.best) { run.passedBest = true; event(run, 'best', 'New best distance!', 0); }
      if (run.dist >= run.nextStone) { event(run, 'stone', Math.round(run.nextStone) + ' m', 0); run.nextStone += 250; }
      if (hungry && run.grounded && Math.hypot(run.vx, run.vy) < 1.2) { run.stallT += dt; if (run.stallT > 1.5) end(run, 'hungry'); }
      else run.stallT = 0;
      if (run.x < -40) end(run, 'quit', 'You flew back to the roost.');
    }
    stepRider(run, dt);
    return run;
  };

  const PR = LR.PREY;
  function movePrey(run, p, dt) {
    const land = run.land, g = LR.G;
    if (p.kind === 'hopper' || p.kind === 'shellback') {
      const near = p.x - run.x, low = run.y - land.h(run.x) < 16;
      if (p.kind === 'hopper' && near > -4 && near < 34 && low && p.gr) { p.vx = 6 + Math.random() * 2.5; p.vy = 4.5 + Math.random() * 2; p.gr = false; }
      if (p.kind === 'shellback') { p.x += 1.0 * dt; p.y = land.h(p.x); return; }
      if (!p.gr) {
        p.vy -= g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const gy = land.h(p.x);
        if (p.y <= gy) { p.y = gy; p.gr = true; p.vx = 0; p.vy = 0; if (land.cutAt(p.x)) p.eaten = true; }
      } else p.y = land.h(p.x);
    } else if (p.kind === 'byrd') {
      const d = Math.hypot(p.x - run.x, p.y - run.y);
      if (d < 22 && p.scare <= 0) p.scare = 2.2;
      if (p.scare > 0) { p.scare -= dt; p.alt += 7 * dt; p.hx += 6 * dt; }
      p.ph += dt * 1.6;
      p.x = p.hx + Math.cos(p.ph) * 4; p.y = land.h(p.hx) + p.alt + Math.sin(p.ph * 1.7) * 1.6;
    } else if (p.kind === 'eel') {
      if (!p.up) { p.wait -= dt; if (p.wait <= 0) { p.up = true; p.y = p.base || (p.base = p.y); p.vy = 10 + Math.random() * 3; p.vx = (Math.random() - 0.5) * 3; } }
      else { p.vy -= g * dt; p.y += p.vy * dt; p.x += p.vx * dt; if (p.y < p.base && p.vy < 0) { p.up = false; p.wait = 1.5 + Math.random() * 2; p.y = p.base; } }
    }
  }

  function stepRider(run, dt) {
    const R = run.rider;
    if (!R) return;
    const land = run.land;
    for (const b of [R, R.hat]) {
      b.vy -= LR.G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.av * dt;
      const gy = land.h(b.x) + (b === R ? 0.4 : 0.1);
      if (b.y < gy) { b.y = gy; if (b.vy < 0) b.vy *= -0.35; b.vx *= 0.8; b.av *= 0.7; }
    }
  }

  /* the pay for a ride: what it picked up and did, plus the distance */
  LR.finish = function (run) {
    const distPay = Math.round(run.dist * 0.25);
    return { dist: Math.round(run.dist), distPay, picked: run.tally.teethPicked, tricks: run.tally.tricks, prey: run.teeth - run.tally.teethPicked - run.tally.tricks,
      total: run.teeth + distPay, eaten: run.eaten, cracks: run.cracks, reason: run.over || 'quit' };
  };

  /* a plain rider for tests and the title screen: holds a height over the land and pitches for it */
  LR.autopilot = function (run) {
    const land = run.land, r = run.r;
    const hag = run.y - land.h(run.x) - r;
    const v = Math.hypot(run.vx, run.vy);
    const look = run.x + clamp(v, 6, 30) * 1.4;
    const rise = Math.atan2(Math.max(land.h(look), land.h(run.x + 8)) - land.h(run.x), look - run.x);
    if (run.grounded) return { beat: run.hunger > 2 };
    const gamma = clamp((8 - hag) * 0.06, -0.45, 0.35) + clamp(rise, -0.3, 0.6);
    const want = gamma + (v < 12 ? 0.05 : 0.12);
    if (run.ang < want - 0.04 && run.hunger > 2) return { beat: true };
    if (run.ang > want + 0.12 || (hag > 12 && v < 18)) return { tuck: true };
    return {};
  };
})();
