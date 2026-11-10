/* ============================================================
   STRYX PILOT — js/sp_sim.js
   A flight, with no drawing: where the Tatu and Kalo are today,
   their pull, the air near them, the ship (heat, hull, thrust,
   sails), landing and docking, the hazards, the vine-lash and the
   Waves of Memory. Runs in a browser and in node
   (tests/test_stryx_pilot.js).

   Coordinates: x right, y DOWN (as on a canvas), px. Fixed 1/60 s steps.
   ============================================================ */
(function (root) {
  'use strict';
  const SP = root.SP = root.SP || {};
  const STEP = 1 / 60;
  const SHIP_R = 34;
  SP.STEP = STEP; SP.SHIP_R = SHIP_R;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const TAU = Math.PI * 2;
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  SP.rng = rng;
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  SP.angDiff = angDiff;

  /* ================= where everything is at sky time T ================= */
  /* Every body orbits and spins with the sky clock. Positions, how fast each is moving,
     and how far round it has turned (rot) all come from T, so every pilot sees the same sky. */
  function place(o, b, T, out) {
    o.rot = (b.spin || 0) * T + (b.dance ? Math.sin(T * 0.35) * 0.5 : 0);
    o.w = (b.spin || 0) + (b.dance ? Math.cos(T * 0.35) * 0.175 : 0);
    if (b.orbit) {
      const c = out[b.orbit[0]], a = b.orbit[2] + T * b.orbit[3], d = b.orbit[1], om = b.orbit[3];
      o.x = c.x + Math.cos(a) * d; o.y = c.y + Math.sin(a) * d;
      o.vx = c.vx - Math.sin(a) * d * om; o.vy = c.vy + Math.cos(a) * d * om;
    } else if (!b.fixed) { o.x = 0; o.y = 0; o.vx = 0; o.vy = 0; }
  }
  SP.layout = function (T) {
    const out = {};
    SP.BODIES.forEach(b => {
      const o = { id: b.id, name: b.name, r: b.r, g: b.g, look: b.look, x: 0, y: 0, vx: 0, vy: 0, rot: 0, w: 0 };
      place(o, b, T, out);
      out[b.id] = o;
    });
    return out;
  };
  /* move the bodies of a flight to time T, keeping the same objects (and noting how far each moved) */
  SP.layoutInto = function (bodies, T) {
    SP.BODIES.forEach(b => { const o = bodies[b.id]; o.px = o.x; o.py = o.y; o.prot = o.rot; place(o, b, T, bodies); });
    const k = bodies.karn;
    if (k) { k.px = k.x; k.py = k.y; k.prot = k.rot; k.rot = k.rot0 + SP.KARN.spin * (T - k.T0); k.w = SP.KARN.spin; }
  };
  /* the speed of the ground at a point on a body's surface (it is orbiting and spinning) */
  SP.groundVel = function (b, x, y) { return [b.vx - b.w * (y - b.y), b.vy + b.w * (x - b.x)]; };
  SP.portPos = function (port, bodies) {
    const b = bodies[port.body];
    if (!b) return null;
    const a = port.ang + (b.rot || 0);
    const nx = Math.cos(a), ny = Math.sin(a);
    return { x: b.x + nx * b.r, y: b.y + ny * b.r, nx, ny, body: b, ang: a };
  };
  SP.portDist = function (a, b, T) {
    const L = SP.layout(T || 0), pa = SP.portPos(a, L), pb = SP.portPos(b, L);
    if (!pa || !pb) return 1e9;
    return Math.hypot(pa.x - pb.x, pa.y - pb.y);
  };
  /* ports that exist in a sky (Mba'Karn only once found, in the flight that finds it) */
  SP.portsIn = bodies => SP.PORTS.filter(p => bodies[p.body]);

  /* ================= a new flight ================= */
  SP.makeFlight = function (o) {
    const r = rng(o.seed || 1);
    const T0 = o.T0 != null ? o.T0 : (o.day || 0) * SP.DAY;
    const bodies = SP.layout(T0);
    const list = Object.values(bodies);
    const S = SP.ship(o.parts);
    const from = SP.port(o.from);
    const pp = SP.portPos(from, bodies);
    const ship = {
      x: pp.x + pp.nx * (SHIP_R + 1), y: pp.y + pp.ny * (SHIP_R + 1), vx: 0, vy: 0,
      ang: Math.atan2(pp.ny, pp.nx), heat: o.heat != null ? Math.min(o.heat, S.heatMax) : S.heatMax, hull: o.hull != null ? Math.min(o.hull, S.hullMax) : S.hullMax,
      grounded: from.body, groundN: [pp.nx, pp.ny], groundRel: pp.ang - (bodies[from.body].rot || 0), stun: 0, lashT: 0, lashCd: 0, thrusting: false, boostT: 0, smoulder: 0,
    };
    const f = {
      t: 0, T0, T: T0, day: SP.skyDay(T0), bodies, list, S, ship, from: from.id, waveRide: 0, outWave: 0, karnStage: 0, karn: false, rank: o.rank || 0, events: [], acc: 0,
      docked: null, wrecked: false, hits: 0, damage: 0, hardHits: 0, mcfly: 0, top: 0, inWave: false, inMist: false, inStorm: false,
      tyndael: [], lutut: [], rocks: [], storms: [], mists: [], wave: null, flies: [], strikes: [], said: {},
      hot: !!o.hot, mass: 1 + (o.weight || 0) * 0.09, skiffs: [], rescued: 0, rescueCoins: 0, slings: 0, slingCd: {},
    };
    /* ---- hazards, by where they live ---- */
    const rank = f.rank;
    const leo = bodies.leotik, vel = bodies.velki, xik = bodies.xikia, bolo = bodies.bolo;
    const flock = (cx, cy, n) => {
      const id = f.tyndael.length ? f.tyndael[f.tyndael.length - 1].flock + 1 : 0;
      for (let i = 0; i < n; i++) f.tyndael.push({ x: cx + (r() - 0.5) * 160, y: cy + (r() - 0.5) * 160, vx: 0, vy: 0, cx, cy, ph: r() * TAU, flock: id, alive: true, chase: false, on: nearestBody(cx, cy) });
    };
    function nearestBody(x, y) { let best = 'velki', bd = 1e12; list.forEach(b => { const d = Math.hypot(x - b.x, y - b.y) - b.r; if (d < bd) { bd = d; best = b.id; } }); return best; }
    /* Tyndael round Leotik and the Ashen Reach, and a few strays out in the sky */
    for (let i = 0; i < 3 + rank; i++) { const a = r() * TAU, d = leo.r + 300 + r() * 900; flock(leo.x + Math.cos(a) * d, leo.y + Math.sin(a) * d, 4 + Math.floor(r() * 3)); }
    const ash = SP.portPos(SP.port('ashen'), bodies);
    for (let i = 0; i < (rank >= 2 ? 2 : 1); i++) flock(ash.x + ash.nx * (500 + r() * 400) + (r() - 0.5) * 600, ash.y + ash.ny * (500 + r() * 400) + (r() - 0.5) * 600, 3 + Math.floor(r() * 3));
    for (let i = 0; i < rank; i++) { const a = r() * TAU, d = 2000 + r() * 6000; flock(vel.x + Math.cos(a) * d, vel.y + Math.sin(a) * d, 4 + Math.floor(r() * 3)); }
    /* Lutut: Leotik's skies, and Velki's ocean once you fly further afield */
    const lut = (x, y) => f.lutut.push({ x, y, hx: x, hy: y, vx: 0, vy: 0, state: 'roam', t: 0, ph: r() * TAU, tx: 0, ty: 0, on: nearestBody(x, y) });
    for (let i = 0; i < 1 + Math.min(2, rank); i++) { const a = r() * TAU, d = leo.r + 500 + r() * 900; lut(leo.x + Math.cos(a) * d, leo.y + Math.sin(a) * d); }
    if (rank >= 1) { const a = 0.6 + r() * 1.2, d = vel.r + 700 + r() * 500; lut(vel.x + Math.cos(a) * d, vel.y + Math.sin(a) * d); }
    /* drifting sky rock along Bolo Kalo's path round Velki */
    const boloOrbit = SP.body('bolo').orbit[1];
    for (let i = 0; i < 16 + rank * 5; i++) {
      const a = r() * TAU, d = boloOrbit + (r() - 0.5) * 900;
      const x = vel.x + Math.cos(a) * d, y = vel.y + Math.sin(a) * d;
      if (Math.hypot(x - bolo.x, y - bolo.y) < bolo.r + 260) continue;
      const sp = 20 + r() * 50, dir = r() * TAU;
      f.rocks.push({ x, y, vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp, r: 18 + r() * 34, spin: r() * TAU, vs: (r() - 0.5) * 2, seed: r(), on: 'velki' });
    }
    /* storm cells off Nekh FtiSular */
    const nekh = SP.portPos(SP.port('nekh'), bodies);
    for (let i = 0; i < 3; i++) f.storms.push({ x: nekh.x + nekh.nx * (300 + i * 260) + (r() - 0.5) * 700, y: nekh.y + nekh.ny * (300 + i * 260) + (r() - 0.5) * 700, r: 300 + r() * 120, wx: 0, wy: 0, wt: 0, next: 1 + r() * 2, on: 'velki', turns: true });
    /* the oath-mist round Aakalay, just beyond the Ashen Reach's pad */
    f.mists.push({ x: ash.x + Math.cos(ash.ang + 0.5) * 420 + ash.nx * 200, y: ash.y + Math.sin(ash.ang + 0.5) * 420 + ash.ny * 200, r: 520, on: 'xikia', turns: true });
    /* now and then a skiff adrift, its seed gone cold, somewhere out in the sky */
    if (o.skiff != null ? o.skiff : r() < 0.45) {
      for (let tries = 0; tries < 40; tries++) {
        const a = r() * TAU, d = 1400 + r() * 2600;
        const x = pp.x + Math.cos(a) * d, y = pp.y + Math.sin(a) * d;
        if (list.some(b => Math.hypot(x - b.x, y - b.y) < b.r + 420)) continue;
        f.skiffs.push({ x, y, vx: (r() - 0.5) * 30, vy: (r() - 0.5) * 30, ph: r() * TAU, hold: 0, saved: false, reward: 30 + Math.round(r() * 40), who: SP.ADRIFT[Math.floor(r() * SP.ADRIFT.length)] });
        break;
      }
    }
    /* the Waves of Memory, now and then */
    if (o.wave != null ? o.wave : r() < 0.5) {
      const dir = r() * TAU, nx = Math.cos(dir), ny = Math.sin(dir);
      /* a band through the sky that rolls slowly across it */
      const off = -2600 + r() * 2000;
      const w = { nx, ny, off: (pp.x * nx + pp.y * ny) + off, w: 520, speed: 70, flow: [-ny, nx] };
      if (r() < 0.5) w.flow = [ny, -nx];
      f.wave = w;
      for (let i = 0; i < 16; i++) f.flies.push({ along: (r() - 0.5) * 7000, across: (r() - 0.5) * 420, got: false, ph: r() * TAU });
    }
    return f;
  };

  /* the pull of every body at a point */
  function pull(f, x, y) {
    let ax = 0, ay = 0, near = null, nd = 1e9;
    for (let i = 0; i < f.list.length; i++) {
      const b = f.list[i];
      const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy) || 1;
      if (d - b.r < nd) { nd = d - b.r; near = b; }
      if (d > b.r * 5) continue;
      const fade = d < b.r * 3 ? 1 : 1 - (d - b.r * 3) / (b.r * 2);
      const a = b.g * b.r * b.r / Math.max(d * d, b.r * b.r) * fade;
      ax += dx / d * a; ay += dy / d * a;
    }
    return { ax, ay, near, alt: nd };
  }
  SP.pull = pull;

  function say(f, key) {
    if (f.said[key] && f.t - f.said[key] < 12) return;
    f.said[key] = f.t;
    const L = SP.LOG[key]; if (!L) return;
    f.events.push({ t: 'log', text: L[Math.floor(Math.random() * L.length)] });
  }
  SP.say = say;

  function hurt(f, n, x, y, why) {
    const s = f.ship;
    if (n <= 0 || f.docked || f.wrecked) return;
    s.hull -= n; f.damage += n; f.hits++;
    if (n >= 15) f.hardHits++;
    f.events.push({ t: 'hit', n, x: x != null ? x : s.x, y: y != null ? y : s.y, why });
    say(f, n >= 15 ? 'bigHit' : 'hit');
    if (f.hot && n >= 18 && Math.random() < 0.5) { s.smoulder = 6; f.events.push({ t: 'smoulder' }); }
    if (s.hull <= 0) { s.hull = 0; f.wrecked = true; f.events.push({ t: 'wreck', x: s.x, y: s.y }); say(f, 'wreck'); }
  }

  /* ================= one step ================= */
  /* input: { turn: -1..1, thrust, brake, boost (edge), lash (edge), aim: angle|null } */
  SP.stepFlight = function (f, input) {
    if (f.docked || f.wrecked) return;
    const dt = STEP, s = f.ship, S = f.S;
    f.t += dt;
    /* the sky turns: move every body to now, and carry what belongs to each along with it */
    f.T = f.T0 + f.t;
    SP.layoutInto(f.bodies, f.T);
    carryAll(f);
    if (s.stun > 0) s.stun -= dt;
    if (s.lashCd > 0) s.lashCd -= dt;
    if (s.lashT > 0) s.lashT -= dt;
    if (s.boostT > 0) s.boostT -= dt;
    const ctl = s.stun > 0 ? { turn: 0, thrust: false, brake: false } : input;

    /* steering: turn keys, or face where the pointer is */
    if (ctl.aim != null) {
      const d = angDiff(s.ang, ctl.aim);
      s.ang += clamp(d, -S.turn * dt, S.turn * dt);
    } else s.ang += (ctl.turn || 0) * S.turn * dt;
    const hx = Math.cos(s.ang), hy = Math.sin(s.ang);

    /* heat: the seed burns, the sails win it back */
    let sun = S.sun;
    const mist = f.mists.find(m => Math.hypot(s.x - m.x, s.y - m.y) < m.r);
    f.inMist = !!mist;
    if (mist) { sun = -14; say(f, 'mist'); }
    const w = f.wave;
    let inWave = false;
    if (w) {
      const across = s.x * w.nx + s.y * w.ny - w.off;
      inWave = Math.abs(across) < w.w / 2;
    }
    f.inWave = inWave;
    if (inWave) { sun = S.sun * 6; say(f, 'wave'); }
    s.thrusting = !!(ctl.thrust && s.heat > 0);
    if (s.thrusting) s.heat -= S.burn * dt;
    s.heat = clamp(s.heat + sun * dt, 0, S.heatMax);
    if (s.heat < S.heatMax * 0.15 && s.heat > 0) say(f, 'lowheat');
    if (s.heat <= 0) say(f, 'noheat');
    if (s.smoulder > 0) { s.smoulder -= dt; s.hull -= 2 * dt; f.damage += 2 * dt; if (s.hull <= 0) { s.hull = 0; f.wrecked = true; f.events.push({ t: 'wreck', x: s.x, y: s.y }); return; } }

    /* boost: a hard push from the seed */
    if (input.boost && s.heat >= S.boostCost && s.stun <= 0) {
      s.heat -= S.boostCost; s.vx += hx * S.boostKick / f.mass; s.vy += hy * S.boostKick / f.mass; s.boostT = 0.4;
      f.events.push({ t: 'boost', x: s.x, y: s.y });
      if (s.grounded) s.grounded = null;
    }
    /* the vine-lash: knocks away everything close */
    if (input.lash && s.lashCd <= 0) {
      s.lashCd = S.lashCd; s.lashT = 0.35;
      f.events.push({ t: 'lash', x: s.x, y: s.y, r: S.lash });
      lash(f);
    }

    /* on the ground: carried round as the world turns; thrust up and away to take off */
    if (s.grounded) {
      const gb = f.bodies[s.grounded];
      const ga = s.groundRel + gb.rot, nx = Math.cos(ga), ny = Math.sin(ga);
      s.x = gb.x + nx * (gb.r + SHIP_R); s.y = gb.y + ny * (gb.r + SHIP_R); s.groundN = [nx, ny];
      s.ang += gb.w * dt;
      const gv = SP.groundVel(gb, s.x, s.y);
      if (s.thrusting && Math.cos(s.ang) * nx + Math.sin(s.ang) * ny > 0.2) {
        s.grounded = null; s.vx = gv[0] + Math.cos(s.ang) * 120; s.vy = gv[1] + Math.sin(s.ang) * 120;
        f.events.push({ t: 'takeoff', x: s.x, y: s.y }); say(f, 'takeoff');
      } else { s.vx = gv[0]; s.vy = gv[1]; return stepHazards(f, dt); }
    }

    const P = pull(f, s.x, s.y);
    s.vx += P.ax * dt; s.vy += P.ay * dt;
    if (s.thrusting) { s.vx += hx * S.thrust / f.mass * dt; s.vy += hy * S.thrust / f.mass * dt; }
    /* the air near a body is thick; the sky is nearly empty */
    let drag = 0.008;
    if (P.alt < 220) {
      /* thick air near a world moves with it: drag pulls you toward the ground's own speed */
      const k = (1 - P.alt / 220) * 0.9, av = SP.groundVel(P.near, s.x, s.y);
      s.vx += (av[0] - s.vx) * k * dt; s.vy += (av[1] - s.vy) * k * dt;
    }
    if (ctl.brake) drag += 1.1;            // the sails turned into the wind
    s.vx *= 1 - drag * dt; s.vy *= 1 - drag * dt;
    if (inWave) { s.vx += w.flow[0] * 170 * dt; s.vy += w.flow[1] * 170 * dt; }
    /* following the Sunear'Zikhron: keep to it long enough, far enough, and something is waiting */
    karnWatch(f, inWave, dt);
    /* storms: wind, and lightning */
    f.inStorm = false;
    f.storms.forEach(st => {
      if (Math.hypot(s.x - st.x, s.y - st.y) < st.r) { f.inStorm = true; s.vx += st.wx * dt; s.vy += st.wy * dt; say(f, 'storm'); }
    });
    /* top speed */
    const sp = Math.hypot(s.vx, s.vy), top = inWave ? 1900 : 1300;
    if (sp > top) { s.vx *= top / sp; s.vy *= top / sp; }
    f.top = Math.max(f.top, sp);
    /* a slingshot: skimming fast past a body, using its pull */
    if (P.near && P.alt < 330 && P.alt > 40 && sp > 520 && (f.slingCd[P.near.id] || 0) < f.t) {
      f.slingCd[P.near.id] = f.t + 10; f.slings++;
      f.events.push({ t: 'sling', x: s.x, y: s.y, body: P.near.id }); say(f, 'sling');
    }
    s.x += s.vx * dt; s.y += s.vy * dt;

    /* touching a body: land, dock, or bounce */
    for (let i = 0; i < f.list.length; i++) {
      const b = f.list[i];
      const dx = s.x - b.x, dy = s.y - b.y, d = Math.hypot(dx, dy);
      if (d > b.r + SHIP_R) continue;
      const nx = dx / d, ny = dy / d;
      s.x = b.x + nx * (b.r + SHIP_R); s.y = b.y + ny * (b.r + SHIP_R);
      /* what matters is how fast you meet the ground, which is itself moving */
      const gv = SP.groundVel(b, s.x, s.y);
      const rvx = s.vx - gv[0], rvy = s.vy - gv[1];
      const vn = rvx * nx + rvy * ny;              // < 0: coming in
      const speed = Math.hypot(rvx, rvy);
      const upright = hx * nx + hy * ny;
      if (speed < 150 && -vn < 120) {
        /* a gentle touch: down. On a pad, docked. */
        s.vx = gv[0]; s.vy = gv[1]; s.grounded = b.id; s.groundN = [nx, ny]; s.groundRel = Math.atan2(ny, nx) - b.rot;
        const port = SP.PORTS.find(p => p.body === b.id && Math.abs(angDiff(p.ang + b.rot, Math.atan2(ny, nx))) * b.r < 120);
        if (port) {
          if (upright < 0.3) hurt(f, 4, s.x, s.y, 'scrape');
          f.docked = port.id; f.events.push({ t: 'dock', port: port.id, x: s.x, y: s.y }); say(f, 'land');
        } else f.events.push({ t: 'touch', x: s.x, y: s.y });
      } else {
        const n = Math.max(0, (-vn - 90) * 0.22 + (speed - 150) * 0.05);
        let bx = rvx, by = rvy;
        if (vn < 0) { bx -= 1.6 * vn * nx; by -= 1.6 * vn * ny; }
        s.vx = gv[0] + bx * 0.7; s.vy = gv[1] + by * 0.7;
        hurt(f, Math.round(n), s.x - nx * SHIP_R, s.y - ny * SHIP_R, 'ground');
      }
      break;
    }
    stepHazards(f, dt);
  };

  /* things that belong to a world move with it: storms and mist turn with it as well */
  function carry(o, f, xk, yk) {
    const b = o.on && f.bodies[o.on];
    if (!b || b.px == null) return;
    const dx = b.x - b.px, dy = b.y - b.py;
    if (o.turns) {
      const da = b.rot - b.prot, c = Math.cos(da), sn = Math.sin(da);
      const rx = o[xk] - b.px, ry = o[yk] - b.py;
      o[xk] = b.x + rx * c - ry * sn; o[yk] = b.y + rx * sn + ry * c;
    } else { o[xk] += dx; o[yk] += dy; }
  }
  function carryAll(f) {
    f.storms.forEach(o => carry(o, f, 'x', 'y'));
    f.mists.forEach(o => carry(o, f, 'x', 'y'));
    f.rocks.forEach(o => carry(o, f, 'x', 'y'));
    f.lutut.forEach(o => { carry(o, f, 'hx', 'hy'); if (o.state === 'roam') carry(o, f, 'x', 'y'); });
    f.tyndael.forEach(o => { carry(o, f, 'cx', 'cy'); if (!o.chase) carry(o, f, 'x', 'y'); });
  }
  SP.carryAll = carryAll;

  /* Mba'Karn: ride the Waves of Memory far enough, in one go, and it is there */
  function karnWatch(f, inWave, dt) {
    const s = f.ship;
    if (f.karn) return;
    if (inWave) { f.waveRide += Math.hypot(s.vx, s.vy) * dt; f.outWave = 0; }
    else { f.outWave += dt; if (f.outWave > 10) { f.waveRide = 0; f.karnStage = 0; } }
    if (f.karnStage < 1 && f.waveRide > SP.KARN_RIDE * 0.3) { f.karnStage = 1; say(f, 'karn1'); }
    if (f.karnStage < 2 && f.waveRide > SP.KARN_RIDE * 0.65) { f.karnStage = 2; say(f, 'karn2'); }
    const far = Math.hypot(s.x - f.bodies.velki.x, s.y - f.bodies.velki.y);
    if (f.waveRide > SP.KARN_RIDE && far > SP.KARN_FAR) SP.spawnKarn(f);
  }
  SP.spawnKarn = function (f) {
    const s = f.ship, w = f.wave, K = SP.KARN;
    const fl = w ? w.flow : [Math.cos(s.ang), Math.sin(s.ang)];
    const x = s.x + fl[0] * (K.r + 3800), y = s.y + fl[1] * (K.r + 3800);
    /* its harbour faces the ship as it comes in */
    const face = Math.atan2(s.y - y, s.x - x);
    const p = SP.port('mbakarn');
    const o = { id: 'karn', name: K.name, r: K.r, g: K.g, look: 'karn', x, y, vx: 0, vy: 0, rot: face - p.ang, rot0: face - p.ang, T0: f.T, w: K.spin, fixed: true };
    f.bodies.karn = o; f.list.push(o);
    f.karn = true; f.karnStage = 3;
    f.events.push({ t: 'karn', x, y }); say(f, 'karn3');
  };

  function lash(f) {
    const s = f.ship, R = f.S.lash;
    f.tyndael.forEach(t => { if (t.alive && Math.hypot(t.x - s.x, t.y - s.y) < R) { t.alive = false; f.events.push({ t: 'pop', x: t.x, y: t.y }); } });
    f.rocks.forEach(k => {
      const dx = k.x - s.x, dy = k.y - s.y, d = Math.hypot(dx, dy) || 1;
      if (d < R + k.r) { k.vx = dx / d * 260 + s.vx; k.vy = dy / d * 260 + s.vy; f.events.push({ t: 'thwack', x: k.x, y: k.y }); }
    });
    f.lutut.forEach(l => {
      if (Math.hypot(l.x - s.x, l.y - s.y) < R + 60 && (l.state === 'dive' || l.state === 'screech')) {
        l.state = 'recover'; l.t = 3; const dx = l.x - s.x, dy = l.y - s.y, d = Math.hypot(dx, dy) || 1;
        l.vx = dx / d * 400; l.vy = dy / d * 400; f.events.push({ t: 'thwack', x: l.x, y: l.y });
      }
    });
  }

  function stepHazards(f, dt) {
    const s = f.ship;
    /* Tyndael: they wheel about their flock, and chase a ship that comes near */
    f.tyndael.forEach(t => {
      if (!t.alive) return;
      const dx = s.x - t.x, dy = s.y - t.y, d = Math.hypot(dx, dy);
      if (d < 520) { if (!t.chase) { t.chase = true; say(f, 'tyndael'); } }
      else if (d > 1100) t.chase = false;
      let tx, ty, spd;
      t.ph += dt * 2.2;
      if (t.chase) { tx = s.x + Math.cos(t.ph) * 40; ty = s.y + Math.sin(t.ph) * 40; spd = 280; }
      else { tx = t.cx + Math.cos(t.ph + t.flock) * 120; ty = t.cy + Math.sin(t.ph * 1.3) * 90; spd = 120; }
      const ex = tx - t.x, ey = ty - t.y, ed = Math.hypot(ex, ey) || 1;
      t.vx += (ex / ed * spd - t.vx) * 2.4 * dt; t.vy += (ey / ed * spd - t.vy) * 2.4 * dt;
      t.x += t.vx * dt; t.y += t.vy * dt;
      if (d < SHIP_R + 12 && !s.grounded) { t.alive = false; hurt(f, 4, t.x, t.y, 'tyndael'); f.events.push({ t: 'pop', x: t.x, y: t.y }); }
    });
    /* Lutut: roam, screech (which stuns), dive, recover */
    f.lutut.forEach(l => {
      const dx = s.x - l.x, dy = s.y - l.y, d = Math.hypot(dx, dy);
      l.ph += dt;
      if (l.state === 'roam') {
        const tx = l.hx + Math.cos(l.ph * 0.4) * 300, ty = l.hy + Math.sin(l.ph * 0.5) * 200;
        l.vx += ((tx - l.x) * 0.8 - l.vx) * dt; l.vy += ((ty - l.y) * 0.8 - l.vy) * dt;
        if (d < 720 && !s.grounded) { l.state = 'screech'; l.t = 1.1; say(f, 'lutut'); f.events.push({ t: 'screech', x: l.x, y: l.y }); }
      } else if (l.state === 'screech') {
        l.vx *= 1 - 3 * dt; l.vy *= 1 - 3 * dt; l.t -= dt;
        if (l.t <= 0) {
          if (d < 400) { s.stun = 0.8; f.events.push({ t: 'stun' }); }
          l.state = 'dive'; l.t = 1.3;
          /* it dives where the ship will be */
          const lead = Math.min(0.6, d / 900);
          l.tx = s.x + s.vx * lead; l.ty = s.y + s.vy * lead;
          const ex = l.tx - l.x, ey = l.ty - l.y, ed = Math.hypot(ex, ey) || 1;
          l.vx = ex / ed * 950; l.vy = ey / ed * 950;
        }
      } else if (l.state === 'dive') {
        l.t -= dt;
        if (d < SHIP_R + 40 && !s.grounded) { hurt(f, 22, l.x, l.y, 'lutut'); l.state = 'recover'; l.t = 3; l.vx *= -0.3; l.vy *= -0.3; }
        if (l.t <= 0) { l.state = 'recover'; l.t = 3; }
      } else if (l.state === 'recover') {
        l.t -= dt; l.vx *= 1 - 1.2 * dt; l.vy *= 1 - 1.2 * dt;
        l.vx += (l.hx - l.x) * 0.3 * dt; l.vy += (l.hy - l.y) * 0.3 * dt;
        if (l.t <= 0) l.state = 'roam';
      }
      l.x += l.vx * dt; l.y += l.vy * dt;
    });
    /* rocks drift, and knock */
    f.rocks.forEach(k => {
      k.x += k.vx * dt; k.y += k.vy * dt; k.spin += k.vs * dt;
      const d = Math.hypot(s.x - k.x, s.y - k.y);
      if (d < SHIP_R + k.r * 0.85 && !s.grounded) {
        const nx = (s.x - k.x) / d, ny = (s.y - k.y) / d;
        const rel = (s.vx - k.vx) * nx + (s.vy - k.vy) * ny;
        if (rel < 0) {
          hurt(f, Math.round(2 + (-rel) * 0.035 + k.r * 0.05), k.x + nx * k.r, k.y + ny * k.r, 'rock');
          s.vx -= 1.5 * rel * nx; s.vy -= 1.5 * rel * ny;
          k.vx += rel * nx * 0.4; k.vy += rel * ny * 0.4;
          if (f.t > 1) say(f, 'rocks');
        }
        s.x = k.x + nx * (SHIP_R + k.r * 0.85); s.y = k.y + ny * (SHIP_R + k.r * 0.85);
      }
    });
    /* storms: the wind shifts, and lightning falls after a flicker */
    f.storms.forEach(st => {
      st.wt -= dt;
      if (st.wt <= 0) { const a = Math.random() * TAU; st.wx = Math.cos(a) * 160; st.wy = Math.sin(a) * 160; st.wt = 1.5 + Math.random() * 2; }
      st.next -= dt;
      if (st.next <= 0) {
        st.next = 1.6 + Math.random() * 1.8;
        /* strike near the ship if it is inside, or anywhere in the cell */
        const inside = Math.hypot(s.x - st.x, s.y - st.y) < st.r;
        const a = Math.random() * TAU, rr = Math.random() * st.r * 0.8;
        const x = inside ? s.x + (Math.random() - 0.5) * 260 : st.x + Math.cos(a) * rr, y = inside ? s.y + (Math.random() - 0.5) * 260 : st.y + Math.sin(a) * rr;
        f.strikes.push({ x, y, t: 0.8, hit: false });
      }
    });
    for (let i = f.strikes.length - 1; i >= 0; i--) {
      const k = f.strikes[i]; k.t -= dt;
      if (k.t <= 0 && !k.hit) {
        k.hit = true; f.events.push({ t: 'bolt', x: k.x, y: k.y });
        if (Math.hypot(s.x - k.x, s.y - k.y) < 95 && !s.grounded) hurt(f, 14, k.x, k.y, 'lightning');
      }
      if (k.t < -0.3) f.strikes.splice(i, 1);
    }
    /* skiffs adrift: come alongside slowly and hold there, and your vines take them in tow */
    f.skiffs.forEach(k => {
      if (k.saved) return;
      k.ph += dt; k.x += k.vx * dt; k.y += k.vy * dt;
      const d = Math.hypot(s.x - k.x, s.y - k.y), rel = Math.hypot(s.vx - k.vx, s.vy - k.vy);
      if (d < 600 && !k.seen) { k.seen = true; say(f, 'distress'); }
      if (d < 95 && rel < 120 && !s.grounded) {
        k.hold += dt;
        if (k.hold > 1.6) { k.saved = true; f.rescued++; f.rescueCoins += k.reward; f.events.push({ t: 'rescue', x: k.x, y: k.y, who: k.who, coins: k.reward }); say(f, 'rescue'); }
      } else k.hold = Math.max(0, k.hold - dt * 2);
    });
    /* the wave rolls on; RubberMcFly glow in it */
    const w = f.wave;
    if (w) {
      w.off += w.speed * dt;
      f.flies.forEach(m => {
        if (m.got) return;
        const x = w.nx * (w.off + m.across) + w.flow[0] * m.along, y = w.ny * (w.off + m.across) + w.flow[1] * m.along;
        m.x = x; m.y = y;
        if (Math.hypot(s.x - x, s.y - y) < SHIP_R + 22) { m.got = true; f.mcfly++; f.events.push({ t: 'mcfly', x, y }); }
      });
    }
  }

  /* advance by real time */
  SP.tick = function (f, dt, input) {
    f.acc += Math.min(dt, 0.1);
    while (f.acc >= STEP && !f.docked && !f.wrecked) {
      f.acc -= STEP;
      SP.stepFlight(f, input);
      input.boost = false; input.lash = false;
    }
  };

  /* ================= jobs ================= */
  /* the jobs on a port's board today */
  SP.portEvent = function (portId, day) {
    let h = 0; for (let i = 0; i < portId.length; i++) h = (h * 31 + portId.charCodeAt(i)) | 0;
    const r = rng((day + 1) * 7331 + h);
    if (r() > 0.3) return null;
    return SP.EVENTS[Math.floor(r() * SP.EVENTS.length)];
  };
  SP.makeJobs = function (portId, day, rank, seed, count) {
    const r = rng(seed);
    const from = SP.port(portId);
    const dests = SP.PORTS.filter(p => p.id !== portId && p.rank <= rank && !p.secret);
    const kinds = Object.keys(SP.JOBS);
    const out = [];
    for (let i = 0; i < (count || 4) && dests.length; i++) {
      const to = dests[Math.floor(r() * dests.length)];
      const kind = kinds[Math.floor(r() * kinds.length)];
      if (kind === 'seeds' && rank < 1) continue;
      const names = SP.CARGO[kind];
      const dist = SP.portDist(from, to, day * SP.DAY);
      const far = SP.body(to.body).id !== SP.body(from.body).id;
      const base = 14 + dist / 150 + (far ? 16 : 0);
      const pay = Math.round(base * SP.JOBS[kind].pay * (1 + rank * 0.15) * (0.85 + r() * 0.3) / 5) * 5;
      const par = Math.round(dist / 330 + 45);      /* seconds on the sky clock, port time included */
      const ev = SP.portEvent(to.id, day);
      const boosted = ev && ev.kinds.indexOf(kind) >= 0;
      out.push({ id: 'j' + seed.toString(36) + i, kind, what: names[Math.floor(r() * names.length)], from: portId, to: to.id, pay: boosted ? Math.round(pay * 1.5 / 5) * 5 : pay, par, day, event: boosted ? ev.name : null });
    }
    return out;
  };
  /* ================= ships for hire ================= */
  /* a hired crew runs back and forth between two ports; they are paid by the trip, you take a cut, they draw a wage */
  SP.hireShip = function (id, from, to, T, crew) {
    const a = SP.port(from), b = SP.port(to), d = SP.portDist(a, b, T);
    const far = a.body !== b.body;
    return { id, crew, from, to, hired: T, paidAt: T, paidTrips: 0, trip: Math.round(d / SP.FLEET.speed + 40), pay: Math.round((14 + d / 150 + (far ? 16 : 0)) * 1.1) };
  };
  function fhash(str, i) { let h = 2166136261; const s2 = str + ':' + i; for (let k = 0; k < s2.length; k++) { h ^= s2.charCodeAt(k); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  /* what a crew has earned since you last settled with them */
  SP.fleetEarn = function (ship, T) {
    const done = Math.max(0, Math.floor((T - ship.hired) / ship.trip));
    const since = Math.max(0, done - ship.paidTrips), n = Math.min(since, SP.FLEET.maxTrips);
    let lost = 0;
    for (let i = 0; i < n; i++) if (fhash(ship.id, ship.paidTrips + i) < SP.FLEET.lose) lost++;
    const coins = Math.round((n - lost) * ship.pay * SP.FLEET.cut);
    const wages = Math.round(Math.max(0, T - ship.paidAt) / SP.DAY * SP.FLEET.wage);
    return { trips: n, lost, coins, wages, net: coins - wages, done };
  };
  SP.fleetSettle = function (ship, T) { const e = SP.fleetEarn(ship, T); ship.paidTrips = e.done; ship.paidAt = T; return e; };
  /* where a crew's skiff is right now (it flies an arc between the two pads) */
  SP.fleetPos = function (ship, T, bodies) {
    const k = Math.max(0, (T - ship.hired) / ship.trip), leg = Math.floor(k), ph = k - leg;
    const a = SP.portPos(SP.port(leg % 2 ? ship.to : ship.from), bodies), b = SP.portPos(SP.port(leg % 2 ? ship.from : ship.to), bodies);
    if (!a || !b) return null;
    const ax = a.x + a.nx * 160, ay = a.y + a.ny * 160, bx = b.x + b.nx * 160, by = b.y + b.ny * 160;
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
    const bulge = Math.sin(ph * Math.PI) * d * 0.12;
    const x = ax + dx * ph - dy / d * bulge, y = ay + dy * ph + dx / d * bulge;
    const x2 = ax + dx * (ph + 0.01) - dy / d * Math.sin((ph + 0.01) * Math.PI) * d * 0.12, y2 = ay + dy * (ph + 0.01) + dx / d * Math.sin((ph + 0.01) * Math.PI) * d * 0.12;
    return { x, y, ang: Math.atan2(y2 - y, x2 - x), leg, ph };
  };

  /* ================= planning a route on the map ================= */
  /* a rough time to fly from a point to each port in turn (the worlds move while you fly) */
  SP.AVG_SPEED = 430;
  SP.planRoute = function (start, route, T) {
    let x = start.x, y = start.y, t = 0;
    return route.map(id => {
      const port = SP.port(id);
      let eta = t, pos = null;
      for (let k = 0; k < 3; k++) { pos = SP.portPos(port, SP.layout(T + eta)); if (!pos) break; eta = t + Math.hypot(pos.x - x, pos.y - y) / SP.AVG_SPEED + 20; }
      if (!pos) return { id, eta: null };
      const leg = eta - t; t = eta + 8; x = pos.x + pos.nx * 200; y = pos.y + pos.ny * 200;
      return { id, eta, leg, dist: Math.round(leg * SP.AVG_SPEED) };
    });
  };

  /* what a job pays when it arrives */
  SP.settle = function (job, f, flightTime) {
    let pay = job.pay, notes = [];
    if (job.stolen) { const cut = Math.round(pay * 0.3); pay -= cut; notes.push('raided goods: the port pays less −' + cut); }
    else if (flightTime <= job.par) { const b = Math.round(job.pay * 0.25); pay += b; notes.push('on time +' + b); }
    if (job.kind === 'fragile' && f.damage > 0) { const cut = Math.min(pay, Math.round(pay * Math.min(0.9, f.damage / 60))); pay -= cut; notes.push('breakages −' + cut); }
    if (job.kind === 'mail' && flightTime > job.par * 1.4) { const cut = Math.round(pay / 2); pay -= cut; notes.push('late −' + cut); }
    if (job.kind === 'folk') {
      if (f.hits === 0) { const tip = Math.round(job.pay * 0.3); pay += tip; notes.push('a smooth flight: tip +' + tip); }
      else if (f.hardHits) { const cut = Math.round(pay * 0.2 * Math.min(3, f.hardHits)); pay -= cut; notes.push('a rough flight −' + cut); }
    }
    return { pay: Math.max(0, pay), notes };
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ================= a simple autopilot (tests, and the title screen) ================= */
(function (root) {
  'use strict';
  const SP = root.SP;
  SP.autopilot = function (f, toId) {
    const s = f.ship, port = SP.port(toId), pp = SP.portPos(port, f.bodies);
    const home = pp.body;
    const P = SP.pull(f, s.x, s.y);
    /* where to head: above the pad, then down onto it; round any body in the way */
    let tx = pp.x - pp.nx * 30, ty = pp.y - pp.ny * 30;
    const dHome = Math.hypot(s.x - home.x, s.y - home.y);
    const padD = Math.hypot(s.x - pp.x, s.y - pp.y);
    if (padD > 260) { tx = pp.x + pp.nx * 240; ty = pp.y + pp.ny * 240; }
    for (let i = 0; i < f.list.length; i++) {
      const b = f.list[i];
      /* does the line to the target pass through b? */
      const ex = tx - s.x, ey = ty - s.y, L = Math.hypot(ex, ey) || 1;
      const ux = ex / L, uy = ey / L;
      const k = (b.x - s.x) * ux + (b.y - s.y) * uy;
      if (k < 0 || k > L) continue;
      const cx = s.x + ux * k, cy = s.y + uy * k, cd = Math.hypot(b.x - cx, b.y - cy);
      if (cd < b.r + 180) {
        let px = cx - b.x, py = cy - b.y; const pl = Math.hypot(px, py);
        if (pl < 1) { px = -uy; py = ux; } else { px /= pl; py /= pl; }
        tx = b.x + px * (b.r + 420); ty = b.y + py * (b.r + 420);
        break;
      }
    }
    const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy) || 1;
    const final = padD < 260;
    const want = final ? Math.min(85, 35 + padD * 0.3) : Math.min(560, 80 + d * 0.45);
    const vdx = dx / d * want - s.vx, vdy = dy / d * want - s.vy;
    const rx = vdx * 1.6 - P.ax, ry = vdy * 1.6 - P.ay;
    const need = Math.hypot(rx, ry);
    let aim = Math.atan2(ry, rx);
    /* when grounded, lift off straight up first */
    if (s.grounded) aim = Math.atan2(s.groundN[1], s.groundN[0]);
    /* landing: keep upright */
    if (final && padD < 90) aim = Math.atan2(pp.ny, pp.nx) + SP.angDiff(Math.atan2(pp.ny, pp.nx), aim) * 0.3;
    const off = Math.abs(SP.angDiff(s.ang, aim));
    const speed = Math.hypot(s.vx, s.vy);
    return { aim, thrust: (need > 25 && off < 0.6) || (s.grounded), brake: speed > want * 1.25 && off > 1.2, boost: false, lash: false };
  };
})(typeof window !== 'undefined' ? window : globalThis);
