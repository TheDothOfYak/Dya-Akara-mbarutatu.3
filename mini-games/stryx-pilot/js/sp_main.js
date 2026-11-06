/* ============================================================
   STRYX PILOT — js/sp_main.js
   The game around a flight: the port you are at (its job board,
   your hold, the shipwright, the bark-mender, the chart of the
   sky), the flight screen (the loop, the controls, the HUD and the
   pilot's log), delivering, wrecks and tows, records and saving.
   ============================================================ */
(function () {
  'use strict';
  const SP = window.SP, A = SP.art, F = window.FLAKE;
  const $ = id => document.getElementById(id);
  const ui = $('ui'), cv = $('sky'), ctx = cv.getContext('2d');
  const mini = $('mini'), mctx = mini.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  /* ================= the save ================= */
  function blank() {
    return { v: 1, coins: 100, day: 0, at: 'rakar', parts: { seed: 1, sails: 1, hull: 1, vines: 1, hold: 1 }, hull: null,
      hold: [], deliveries: 0, earned: 0, flights: 0, wrecks: 0, clock: 0, records: {}, board: null, seenHelp: false, mcfly: 0 };
  }
  const SAVE = window.FLAKE_MINI.open('sp', blank);
  let D = null;
  const save = () => SAVE.save();
  const rank = () => SP.rankOf(D.deliveries);
  const S = () => SP.ship(D.parts);
  const hullNow = () => D.hull == null ? S().hullMax : Math.min(D.hull, S().hullMax);

  /* ================= sounds ================= */
  let AC = null;
  function beep(f, d, type, vol, slide) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'sine'; o.frequency.value = f;
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, AC.currentTime + d);
      g.gain.value = vol || 0.05; g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
      o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + d);
    } catch (e) { /* no sound */ }
  }
  let hum = null;
  function engine(on) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (!hum) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sawtooth'; o.frequency.value = 55; g.gain.value = 0; o.connect(g); g.connect(AC.destination); o.start(); hum = { o, g }; }
      hum.g.gain.setTargetAtTime(on ? 0.018 : 0, AC.currentTime, 0.08);
    } catch (e) { /* no sound */ }
  }
  const SFX = {
    hit: n => beep(120, 0.25 + n * 0.01, 'square', 0.05, 50),
    boost: () => beep(180, 0.5, 'sawtooth', 0.04, 500),
    lash: () => beep(700, 0.15, 'triangle', 0.04, 300),
    pop: () => beep(900, 0.08, 'square', 0.02, 1400),
    mcfly: () => { beep(1200, 0.1, 'sine', 0.04); setTimeout(() => beep(1600, 0.12, 'sine', 0.03), 60); },
    dock: () => { [392, 523, 659].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'triangle', 0.05), i * 100)); },
    screech: () => beep(1800, 0.8, 'sawtooth', 0.03, 900),
    bolt: () => beep(80, 0.5, 'square', 0.06, 30),
    wreck: () => beep(200, 1.2, 'sawtooth', 0.06, 30),
  };

  /* ================= screens ================= */
  function el(tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => {
      if (k === 'cls') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(c => { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  const btn = (text, onclick, cls, dis) => el('button', { cls: 'btn ' + (cls || ''), onclick, disabled: dis ? 'disabled' : null, type: 'button' }, [text]);
  function screen(title, kids, back) {
    ui.innerHTML = ''; ui.classList.remove('hidden'); ui.scrollTop = 0;
    const top = el('div', { cls: 'top' }, [
      back ? btn('← Back', back, 'ghost') : btn('⌂ Flake Games', () => { save(); F.toHub(); }, 'ghost'),
      el('h1', { text: title }),
      el('div', { cls: 'coins', text: '🪙 ' + D.coins }),
    ]);
    ui.appendChild(el('div', { cls: 'wrap' }, [top].concat(kids)));
  }
  function toast(text) {
    const t = el('div', { cls: 'toast', text });
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2400); setTimeout(() => t.remove(), 3000);
  }
  const bodyName = id => SP.body(id).name;
  const fmt = t => t == null ? '—' : t.toFixed(1) + ' s';
  const jobLine = j => SP.JOBS[j.kind].icon + ' ' + j.what + ' → ' + SP.port(j.to).name;

  /* ================= the port ================= */
  function boardFor() {
    if (!D.board || D.board.port !== D.at || D.board.day !== D.day) {
      D.board = { port: D.at, day: D.day, jobs: SP.makeJobs(D.at, D.day, rank(), (D.day + 1) * 1009 + D.at.length * 31 + D.flights, 3 + Math.min(3, rank() + 1)) };
    }
    return D.board.jobs;
  }
  let chartRaf = 0;
  function portScreen(note) {
    if (!Array.isArray(note)) note = null;    // called straight from a button, with its click
    const p = SP.port(D.at), Sh = S(), rk = rank();
    const nextRank = SP.RANKS[rk + 1];
    /* the chart of the sky, today */
    const chart = el('canvas', { cls: 'chart' });
    const marks = new Set(D.hold.map(j => j.to));
    const drawChart = () => {
      if (!chart.isConnected) return;
      const r = chart.getBoundingClientRect(), dp = Math.min(2, window.devicePixelRatio || 1);
      if (chart.width !== Math.round(r.width * dp)) { chart.width = Math.round(r.width * dp); chart.height = Math.round(r.height * dp); }
      const c2 = chart.getContext('2d'); c2.setTransform(dp, 0, 0, dp, 0, 0);
      A.chart(c2, r.width, r.height, D.day, D.at, marks, performance.now() / 1000);
      chartRaf = requestAnimationFrame(drawChart);
    };
    cancelAnimationFrame(chartRaf);
    setTimeout(drawChart, 0);

    const hold = el('div', { cls: 'card' }, [
      el('h3', { text: 'Your hold (' + D.hold.length + ' of ' + Sh.slots + ')' }),
      D.hold.length ? el('div', {}, D.hold.map(j => el('div', { cls: 'job' }, [
        el('div', { cls: 'grow' }, [el('div', { text: jobLine(j) }), el('div', { cls: 'muted small', text: SP.JOBS[j.kind].name + ' · pays ' + j.pay + ' · par ' + j.par + ' s · ' + Math.round(D.clock - j.taken) + ' s so far' })]),
        btn('Leave it here', () => { if (!confirm('Leave this job on the dock? Nobody pays for it.')) return; D.hold = D.hold.filter(x => x !== j); save(); portScreen(); }, 'small danger'),
      ]))) : el('p', { cls: 'muted small', text: 'Empty. Take a job from the board.' }),
    ]);
    const jobs = boardFor();
    const board = el('div', { cls: 'card' }, [
      el('h3', { text: 'The job board' }),
      jobs.length ? el('div', {}, jobs.map(j => {
        const to = SP.port(j.to);
        return el('div', { cls: 'job' }, [
          el('div', { cls: 'grow' }, [
            el('div', { text: jobLine(j) }),
            el('div', { cls: 'muted small', text: SP.JOBS[j.kind].name + ' (' + SP.JOBS[j.kind].about + ') · on ' + bodyName(to.body) + ' · par ' + j.par + ' s' }),
          ]),
          el('div', { cls: 'pay', text: j.pay }),
          btn('Take', () => {
            if (D.hold.length >= Sh.slots) { toast('The hold is full.'); return; }
            D.hold.push(Object.assign({}, j, { taken: D.clock }));
            D.board.jobs = D.board.jobs.filter(x => x !== j); save(); portScreen();
          }, 'small primary', D.hold.length >= Sh.slots),
        ]);
      })) : el('p', { cls: 'muted small', text: 'Nothing left today. New jobs come with the next day.' }),
    ]);
    const hullMax = Sh.hullMax, hn = hullNow(), missing = Math.ceil(hullMax - hn);
    const yard = el('div', { cls: 'card' }, [
      el('h3', { text: 'The shipwright' }),
      el('div', {}, SP.PARTS.map(part => {
        const lvl = D.parts[part.id], max = lvl >= part.max, cost = SP.partCost(part.id, lvl);
        return el('div', { cls: 'job' }, [
          el('div', { cls: 'grow' }, [el('div', { html: '<b>' + part.name + '</b> ' + '●'.repeat(lvl) + '○'.repeat(part.max - lvl) }), el('div', { cls: 'muted small', text: part.about })]),
          btn(max ? 'Best there is' : 'Grow it · ' + cost, () => {
            if (D.coins < cost) { toast('Not enough coins.'); return; }
            const wasMax = S().hullMax;
            D.coins -= cost; D.parts[part.id]++;
            if (part.id === 'hull' && D.hull != null) D.hull += S().hullMax - wasMax;
            save(); beep(600, 0.15, 'triangle', 0.04); portScreen();
          }, 'small', max || D.coins < cost),
        ]);
      })),
      el('div', { cls: 'job' }, [
        el('div', { cls: 'grow' }, [el('div', { html: '<b>The bark-mender</b>' }), el('div', { cls: 'muted small', text: 'Hull ' + Math.round(hn) + ' of ' + hullMax + '. One coin a knot.' })]),
        btn(missing > 0 ? 'Mend it · ' + Math.min(missing, D.coins) : 'Sound', () => { const n = Math.min(missing, D.coins); D.coins -= n; D.hull = hn + n; save(); portScreen(); }, 'small', missing <= 0 || D.coins <= 0),
      ]),
    ]);
    const kids = [
      note ? el('div', { cls: 'card note' }, note.map(n => el('p', { text: n }))) : null,
      el('div', { cls: 'card portcard' }, [
        el('div', { cls: 'grow' }, [
          el('div', { cls: 'pname', text: p.name }),
          el('div', { cls: 'muted small', text: 'on ' + bodyName(p.body) + ' · day ' + (D.day + 1) + ' · ' + SP.RANKS[rk].name + ' (' + D.deliveries + ' delivered' + (nextRank ? ', ' + (nextRank.at - D.deliveries) + ' more to ' + nextRank.name : '') + ')' }),
          el('p', { text: p.blurb }),
          el('div', { cls: 'row' }, [
            btn('Take off ⛵', fly, 'primary big'),
            btn('How to fly', help, 'small'), btn('Records', records, 'small'),
          ]),
          el('div', { cls: 'bars' }, [bar('Hull', hn / hullMax, '#c86a3a'), bar('Seed', 1, '#ffb040')]),
        ]),
        chart,
      ]),
      hold, board, yard,
      SAVE.who ? el('p', { cls: 'muted small center', text: 'Saved to your Flake Games account' + (SAVE.online ? '' : ' (offline: kept in this browser for now)') + '.' })
        : el('p', { cls: 'muted small center', html: 'Flying as a guest: your ship is kept in this browser. <a href="#" id="signin">Sign in</a> to keep it on your account.' }),
    ];
    screen('Stryx Pilot', kids);
    const si = $('signin'); if (si) si.addEventListener('click', e => { e.preventDefault(); save(); F.toSignIn(); });
    if (!D.seenHelp) { D.seenHelp = true; save(); help(); }
  }
  function bar(label, v, col) {
    return el('div', { cls: 'bar' }, [el('span', { text: label }), el('div', {}, [el('i', { style: 'width:' + Math.round(Math.max(0, Math.min(1, v)) * 100) + '%;background:' + col })])]);
  }
  function help() {
    screen('How to fly', [el('div', { cls: 'card prose', html: `
      <p>You are a pilot Stryx: a flat stone grown into the pilot stump of an Eldi ship, a fire tree hollowed into a hull.
      A fire seed in the stern pushes it through the sky; gold solar sails win heat back from Pia’don’s light.</p>
      <h3>Flying</h3>
      <p><kbd>←</kbd> <kbd>→</kbd> (or <kbd>A</kbd> <kbd>D</kbd>) turn the ship. <kbd>↑</kbd> or <kbd>W</kbd> burns the seed and pushes.
      <kbd>↓</kbd> or <kbd>S</kbd> turns the sails into the wind to slow down. <kbd>Space</kbd> is a hard push from the seed.
      <kbd>E</kbd> or <kbd>Shift</kbd> lashes out with your vines and knocks away anything close.</p>
      <p>With a mouse or a finger: <b>hold</b> anywhere and the ship turns toward it and pushes. The buttons do the rest.</p>
      <h3>The pull of the Tatu</h3>
      <p>Every Tatu and Kalo pulls you toward it, the big ones hardest. Near the ground the air is thick and slows you.
      Use the pull: swing round a Kalo rather than burning heat to fight it.</p>
      <h3>Landing</h3>
      <p>Touch down <b>gently</b>, nose up, on a port’s pad (the beacons) to dock. Come in too fast and you knock the hull.
      You can set down gently anywhere and take off again.</p>
      <h3>Heat</h3>
      <p>Pushing burns the seed’s heat. With no heat you drift until the sails win some back. The seed rests and refills at every port.</p>
      <h3>Jobs</h3>
      <p>Take jobs from a port’s board. Each pays when it reaches its port, more if you beat par. Fragile goods hate knocks, mail hates lateness,
      passengers tip for a smooth flight, and fire seeds can set the hold smouldering if you hit hard.</p>
      <h3>The sky</h3>
      <p><b>Tyndael</b>, flying sparks with wings, swarm round Leotik and the Ashen Reach: lash them. A <b>Lutut</b> screeches (which stuns) and then dives:
      do not be where it is diving. Sky rock drifts along Bolo Kalo’s path. Storms come off Nekh FtiSular. The <b>oath-mist</b> by Aakalay chills a seed.
      And now and then the <b>Waves of Memory</b> roll across the sky: ride them, and catch the RubberMcFly glowing in them.</p>` })], portScreen);
  }
  function records() {
    const keys = Object.keys(D.records).sort();
    const t = el('table', { cls: 'tbl' }, [el('tr', {}, ['From', 'To', 'Best'].map(h => el('th', { text: h })))].concat(keys.map(k => {
      const [a, b] = k.split('>');
      return el('tr', {}, [el('td', { text: SP.port(a).name }), el('td', { text: SP.port(b).name }), el('td', { text: fmt(D.records[k]) })]);
    })));
    screen('Records', [el('div', { cls: 'card' }, [keys.length ? t : el('p', { cls: 'muted', text: 'No flights yet.' })]),
      el('p', { cls: 'muted small', text: D.flights + ' flights · ' + D.deliveries + ' delivered · ' + D.earned + ' coins earned · ' + D.mcfly + ' RubberMcFly caught · ' + D.wrecks + ' wrecks' })], portScreen);
  }

  /* ================= the flight ================= */
  let FL = null;
  const input = { turn: 0, thrust: false, brake: false, boost: false, lash: false, aim: null };
  const keys = {};
  const touchy = matchMedia('(pointer: coarse)').matches;

  function fly() {
    cancelAnimationFrame(chartRaf);
    ui.classList.add('hidden'); document.body.classList.add('flying');
    $('hud').classList.remove('hidden');
    $('touch').classList.toggle('hidden', !touchy);
    const f = SP.makeFlight({ day: D.day, from: D.at, parts: D.parts, hull: hullNow(), rank: rank(), seed: (D.day + 7) * 7919 + D.flights * 13, hot: D.hold.some(j => j.kind === 'seeds') });
    A.parts.length = 0; A.resetCamera(f);
    FL = { f, from: D.at, ended: 0, log: [], logT: 0 };
    Object.assign(input, { turn: 0, thrust: false, brake: false, boost: false, lash: false, aim: null });
    say('takeoff');
    resize();
  }
  function say(key) { const L = SP.LOG[key]; if (L) logLine(L[Math.floor(Math.random() * L.length)]); }
  function logLine(text) { if (!FL) return; FL.logT = 4; $('log').textContent = '— ' + text; $('log').classList.remove('hidden'); }

  function endFlight() {
    const f = FL.f, from = FL.from;
    FL = null; engine(false);
    document.body.classList.remove('flying');
    $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('pausebox').classList.add('hidden');
    D.flights++; D.clock += f.t; D.mcfly += f.mcfly;
    const note = [];
    const coinsFly = f.mcfly * 6;
    if (f.mcfly) { D.coins += coinsFly; note.push('You caught ' + f.mcfly + ' RubberMcFly in the Waves of Memory: ' + coinsFly + ' coins.'); }
    if (f.wrecked) {
      D.wrecks++;
      const fee = Math.min(D.coins, 40);
      D.coins -= fee;
      const lost = D.hold.filter(j => j.kind === 'fragile' || j.kind === 'seeds');
      D.hold = D.hold.filter(j => lost.indexOf(j) < 0);
      D.hull = Math.round(S().hullMax * 0.4);
      D.at = from; D.day++;
      note.unshift('The hull gave out. The academy sent a tow back to ' + SP.port(from).name + ' (' + fee + ' coins), and the bark-mender patched you up enough to fly.' + (lost.length ? ' The fragile cargo and fire seeds were lost.' : ''));
      save(); SFX.wreck();
      portScreen(note); return;
    }
    D.hull = Math.max(1, f.ship.hull);
    const to = f.docked;
    const key = from + '>' + to;
    if (to !== from) {
      const best = D.records[key];
      if (best == null || f.t < best) { D.records[key] = Math.round(f.t * 10) / 10; if (best != null) note.push('A new best from ' + SP.port(from).name + ': ' + fmt(f.t) + ' (was ' + fmt(best) + ').'); }
    }
    /* deliver what is for here */
    const here = D.hold.filter(j => j.to === to);
    here.forEach(j => {
      const time = D.clock - j.taken;
      const r = SP.settle(j, f, time);
      D.coins += r.pay; D.earned += r.pay; D.deliveries++;
      note.push(SP.JOBS[j.kind].icon + ' ' + j.what + ' delivered in ' + fmt(time) + ': ' + r.pay + ' coins' + (r.notes.length ? ' (' + r.notes.join(', ') + ')' : '') + '.');
    });
    D.hold = D.hold.filter(j => j.to !== to);
    const rkBefore = SP.rankOf(D.deliveries - here.length), rkNow = rank();
    if (rkNow > rkBefore) note.push('You are now ' + SP.RANKS[rkNow].name + '. Further ports will take your jobs.');
    if (!here.length) note.unshift('Docked at ' + SP.port(to).name + '.');
    note.push(f.hits ? 'Knocks: ' + f.hits + ' (' + Math.round(f.damage) + ' bark).' : 'Not a scratch.');
    if (to !== from) D.day++;
    D.at = to;
    save(); SFX.dock();
    portScreen(note);
  }

  /* the controls */
  const isK = (e, list) => list.indexOf(e.key) >= 0;
  window.addEventListener('keydown', e => {
    if (!FL) return;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { setPause(!FL.paused); return; }
    keys[e.key.toLowerCase()] = true;
    if (isK(e, [' ']) && !e.repeat) input.boost = true;
    if (isK(e, ['e', 'E', 'Shift']) && !e.repeat) input.lash = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) >= 0) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  let pointer = null;
  cv.addEventListener('pointerdown', e => { if (!FL) return; pointer = { x: e.clientX, y: e.clientY, id: e.pointerId }; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); e.preventDefault(); });
  cv.addEventListener('pointermove', e => { if (pointer && pointer.id === e.pointerId) { pointer.x = e.clientX; pointer.y = e.clientY; } });
  const up = e => { if (pointer && (!e || pointer.id === e.pointerId)) pointer = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const hold = (id, on, off) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); on(); }); if (off) { b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); } };
  let touchBrake = false;
  hold('tBoost', () => { input.boost = true; });
  hold('tLash', () => { input.lash = true; });
  hold('tBrake', () => { touchBrake = true; }, () => { touchBrake = false; });
  $('pause').addEventListener('click', () => setPause(!FL.paused));
  $('resume').addEventListener('click', () => setPause(false));
  $('abort').addEventListener('click', () => {
    if (!FL) return;
    if (!confirm('Turn back? The academy will tow you back to where you set off, for 20 coins.')) return;
    const from = FL.from; FL = null; engine(false);
    document.body.classList.remove('flying'); $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('pausebox').classList.add('hidden');
    D.coins = Math.max(0, D.coins - 20); D.at = from; save(); portScreen(['Towed back to ' + SP.port(from).name + '.']);
  });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; pointer = null; if (FL) setPause(true); });
  function setPause(v) { if (!FL) return; FL.paused = v; $('pausebox').classList.toggle('hidden', !v); if (v) engine(false); }

  /* the loop */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!FL) return;
    const f = FL.f;
    if (!FL.paused && !FL.ended) {
      input.turn = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
      input.thrust = !!(keys.arrowup || keys.w);
      input.brake = !!(keys.arrowdown || keys.s) || touchBrake;
      input.aim = null;
      if (pointer && FL.view) {
        const sx = FL.view.SX(f.ship.x), sy = FL.view.SY(f.ship.y);
        const dx = pointer.x - sx, dy = pointer.y - sy;
        if (Math.hypot(dx, dy) > 18) { input.aim = Math.atan2(dy, dx); input.thrust = Math.abs(SP.angDiff(f.ship.ang, input.aim)) < 1.2; }
      }
      SP.tick(f, dt, input);
      engine(f.ship.thrusting);
      f.events.forEach(ev => {
        A.event(ev, f);
        if (ev.t === 'log') logLine(ev.text);
        else if (ev.t === 'hit') SFX.hit(ev.n); else if (ev.t === 'boost') SFX.boost(); else if (ev.t === 'lash') SFX.lash();
        else if (ev.t === 'pop') SFX.pop(); else if (ev.t === 'mcfly') SFX.mcfly(); else if (ev.t === 'screech') SFX.screech();
        else if (ev.t === 'bolt' && Math.hypot(ev.x - f.ship.x, ev.y - f.ship.y) < 900) SFX.bolt();
      });
      f.events.length = 0;
      A.stepParts(dt, f);
      if ((f.docked || f.wrecked) && !FL.ended) FL.ended = now + (f.wrecked ? 1800 : 1100);
      if (FL.logT > 0) { FL.logT -= dt; if (FL.logT <= 0) $('log').classList.add('hidden'); }
    }
    if (FL.ended && now > FL.ended) { endFlight(); return; }
    if (FL.ended) A.stepParts(dt, f);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const marks = new Set(D.hold.map(j => j.to));
    const targets = D.hold.map(j => ({ port: j.to, label: SP.port(j.to).name }));
    FL.view = A.draw(ctx, W, H, f, now / 1000, { marks, targets, braking: input.brake });
    A.minimap(mctx, mini.width, mini.height, f, Array.from(marks));
    hud(f);
  }
  function hud(f) {
    const s = f.ship, Sh = f.S;
    $('hHull').style.width = Math.round(s.hull / Sh.hullMax * 100) + '%';
    $('hHeat').style.width = Math.round(s.heat / Sh.heatMax * 100) + '%';
    $('hHeatBar').classList.toggle('low', s.heat < Sh.heatMax * 0.2);
    const P = SP.pull(f, s.x, s.y);
    $('hSpeed').textContent = Math.round(Math.hypot(s.vx, s.vy) / 40 * 3.6) + ' km/h';
    $('hAlt').textContent = s.grounded ? 'on ' + P.near.name : Math.round(Math.max(0, P.alt - SP.SHIP_R) / 40) + ' m over ' + P.near.name;
    $('hTime').textContent = f.t.toFixed(1) + ' s';
    const cargo = $('hCargo');
    cargo.innerHTML = '';
    D.hold.forEach(j => {
      const t = D.clock + f.t - j.taken;
      cargo.appendChild(el('div', { cls: t > j.par ? 'late' : '' }, [SP.JOBS[j.kind].icon + ' ' + SP.port(j.to).name + ' · ' + Math.max(0, Math.round(j.par - t)) + ' s']));
    });
    $('hLash').classList.toggle('ready', s.lashCd <= 0);
    $('tLash').classList.toggle('ready', s.lashCd <= 0);
    let msg = '';
    if (f.docked) msg = 'Docked: ' + SP.port(f.docked).name;
    else if (f.wrecked) msg = 'The hull is gone';
    else if (s.grounded && f.t < 3) msg = touchy ? 'Hold above the ship to lift off' : 'Hold ↑ to lift off';
    const m = $('hMsg'); m.textContent = msg; m.classList.toggle('hidden', !msg);
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const ms = Math.round(Math.min(150, Math.max(96, W * 0.12)));
    mini.width = ms * 2; mini.height = ms * 2; mini.style.width = ms + 'px'; mini.style.height = ms + 'px';
    mctx.setTransform(2, 0, 0, 2, 0, 0);
  }
  window.addEventListener('resize', resize);
  /* the minimap draws in its own pixels */
  const mm = A.minimap;
  A.minimap = (c, w, h, f, m) => { c.setTransform(1, 0, 0, 1, 0, 0); mm(c, w, h, f, m); };

  /* ================= boot ================= */
  resize();
  requestAnimationFrame(frame);
  ui.appendChild(el('p', { cls: 'center muted', text: 'Warming the seed…' }));
  SAVE.ready.then(d => {
    D = d;
    if (!SP.port(D.at)) D.at = 'rakar';
    if (SAVE.banned) { screen('Stryx Pilot', [el('div', { cls: 'card', text: SAVE.banned })]); return; }
    portScreen();
  });
  window.SP_GAME = { get D() { return D; }, get FL() { return FL; }, fly, portScreen, input };
})();
