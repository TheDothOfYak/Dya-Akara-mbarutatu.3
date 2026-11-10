/* ============================================================
   STRYX PILOT — js/sp_main.js
   The game around a flight: the port you are at (its job board,
   your hold, the shipwright, the bark-mender, ships for hire, the
   shared sky, the chart), the sky map and its route planner, the
   flight screen (the loop, the controls, the clock, the HUD and the
   pilot's log), raids, delivering, wrecks and tows, Mba'Karn,
   records and saving.

   Time is the sky clock (SP.skyNow): it runs for every pilot at
   once, in port as well as in flight, so a job's deadline is a real
   moment on the clock in the corner.
   ============================================================ */
(function () {
  'use strict';
  const SP = window.SP, A = SP.art, F = window.FLAKE, NET = SP.net;
  const $ = id => document.getElementById(id);
  const ui = $('ui'), cv = $('sky'), ctx = cv.getContext('2d');
  const mini = $('mini'), mctx = mini.getContext('2d');
  const mapcv = $('mapcv'), mapctx = mapcv.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  /* ================= the save ================= */
  function blank() {
    return { v: 2, coins: 100, at: 'rakar', parts: { seed: 1, sails: 1, hull: 1, vines: 1, hold: 1 }, hull: null,
      hold: [], deliveries: 0, earned: 0, flights: 0, wrecks: 0, records: {}, board: null, seenHelp: false, mcfly: 0,
      route: [], fleet: [], sky: { mode: 'open', code: '' }, secrets: {}, raids: { done: 0, suffered: 0, cut: 0 }, netName: '' };
  }
  const SAVE = window.FLAKE_MINI.open('sp', blank);
  let D = null;
  const save = () => SAVE.save();
  const rank = () => SP.rankOf(D.deliveries);
  const S = () => SP.ship(D.parts);
  const hullNow = () => D.hull == null ? S().hullMax : Math.min(D.hull, S().hullMax);
  const now = () => SP.skyNow();
  const today = () => SP.skyDay(now());
  const TAB = Math.random().toString(36).slice(2, 6);
  const myKey = () => { if (!D.netKey) { D.netKey = 'k' + Math.random().toString(36).slice(2, 10); save(); } return D.netKey + TAB; };
  const myName = () => (SAVE.who && SAVE.who.name) || D.netName || 'Pilot ' + myKey().slice(1, 5).toUpperCase();

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
    alarm: () => { beep(880, 0.12, 'square', 0.04); setTimeout(() => beep(660, 0.12, 'square', 0.04), 140); },
    karn: () => { [262, 330, 392, 523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.6, 'sine', 0.05), i * 180)); },
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
      el('div', { cls: 'portclock', id: 'portClock' }),
      el('div', { cls: 'coins', text: '🪙 ' + D.coins }),
    ]);
    ui.appendChild(el('div', { cls: 'wrap' }, [top].concat(kids)));
    tickPortClock();
  }
  function toast(text) {
    const t = el('div', { cls: 'toast', text });
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3200);
  }
  const bodyName = id => (SP.body(id) || { name: '?' }).name;
  const fmt = t => t == null ? '—' : t.toFixed(1) + ' s';
  const jobLine = j => SP.JOBS[j.kind].icon + ' ' + j.what + ' → ' + SP.port(j.to).name;
  const dueOf = j => j.taken + j.par;
  /* the clock shown on port screens */
  function tickPortClock() {
    const e = $('portClock'); if (!e || !D) return;
    const T = now(), next = D.hold.slice().sort((a, b) => dueOf(a) - dueOf(b))[0];
    e.innerHTML = '<b>' + SP.clockOf(T) + '</b>' + (next ? ' · <span class="' + (dueOf(next) < T ? 'late' : '') + '">' + SP.port(next.to).name + ' by ' + SP.clockOf(dueOf(next)) + ' (' + (dueOf(next) < T ? 'late' : SP.mmss(dueOf(next) - T)) + ')</span>' : '');
  }
  setInterval(tickPortClock, 500);

  /* ================= the shared sky ================= */
  let SKY = null;
  function skyConnect() {
    if (SKY) { SKY.close(); SKY = null; }
    if (!D || D.sky.mode === 'off') { skyChanged(); return; }
    SKY = new NET.Sky({ key: myKey(), name: myName() }, {
      onChange: skyChanged,
      onRaided: (from) => { if (FL && !FL.f.ship.grounded && !FL.f.docked) { FL.raidedBy = from; FL.raidedAt = performance.now(); if (!FL.alarmed) { FL.alarmed = true; SFX.alarm(); say('raided'); } } },
      onClaim: (from, info) => {
        const p = SKY && SKY.pilots[from];
        const ok = FL && !FL.f.ship.grounded && !FL.f.docked && info && info.progress >= SP.RAID.time - 0.6 && p && p.x != null && Math.hypot(p.x - FL.f.ship.x, p.y - FL.f.ship.y) < SP.RAID.range * 1.5 && D.hold.length > 0;
        if (!ok) { SKY.send({ t: 'deny', to: from, why: D.hold.length ? 'They pulled clear.' : 'Their hold is empty.' }); return; }
        const j = D.hold.splice(Math.floor(Math.random() * D.hold.length), 1)[0];
        D.raids.suffered++; save();
        SKY.send({ t: 'loot', to: from, job: j });
        pop('Raided! ' + p.name + ' took ' + j.what, '#ff8a7a'); SFX.wreck();
      },
      onLoot: (job, from) => {
        if (!FL || !FL.raid || FL.raid.target !== from) return;
        const p = SKY.pilots[from];
        if (D.hold.length < S().slots) { D.hold.push(Object.assign({}, job, { stolen: true })); pop('Raided: ' + job.what + '!', '#ffd36a'); }
        else pop('Your hold was full: the cargo tumbled into the sky.', '#ffb0a0');
        D.raids.done++; save(); SFX.dock();
        FL.raid = null; FL.raidCd = SP.RAID.cooldown;
        void p;
      },
      onDeny: (why) => { if (FL && FL.raid) { pop(why, '#ffb0a0'); FL.raid = null; FL.raidCd = 3; } },
      onCut: (from) => {
        if (!FL || !FL.raid || FL.raid.target !== from) return;
        const p = SKY.pilots[from], s = FL.f.ship;
        if (p && p.x != null) { const dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy) || 1; s.vx += dx / d * 320; s.vy += dy / d * 320; }
        FL.raid = null; FL.raidCd = SP.RAID.cooldown; say('cut'); pop('They cut your vines!', '#ffb0a0'); SFX.lash();
      },
    });
    SKY.open(D.sky.mode === 'code' ? D.sky.code : null).then(skyChanged);
  }
  function skyChanged() {
    const e = $('skyStatus'); if (!e) return;
    e.textContent = skyText();
  }
  function skyText() {
    if (!SKY || D.sky.mode === 'off') return 'Flying alone: no other pilots, no raids.';
    if (SKY.state === 'connecting') return 'Reaching the shared sky…';
    if (SKY.state === 'error') return 'Could not reach the shared sky (' + SKY.error + '). You can still fly alone.';
    const fl = SKY.flying().length, all = SKY.count();
    return (D.sky.mode === 'code' ? 'Private sky ' + SKY.code : 'The open sky') + ': ' + (all ? all + ' other pilot' + (all > 1 ? 's' : '') + ' (' + fl + ' flying)' : 'nobody else just now') + (NET.local ? ' · test mode (this browser only)' : '') + '.';
  }
  setInterval(() => { if (SKY && SKY.state === 'on' && D && !FL) SKY.sendPort(D.at, myName()); }, 3000);

  /* ================= the port ================= */
  function boardFor() {
    const day = today();
    if (!D.board || D.board.port !== D.at || D.board.day !== day) {
      D.board = { port: D.at, day, jobs: SP.port(D.at).secret ? [] : SP.makeJobs(D.at, day, rank(), (day + 1) * 1009 + D.at.length * 31 + D.flights, 3 + Math.min(3, rank() + 1)) };
    }
    return D.board.jobs;
  }
  let chartRaf = 0;
  function portScreen(note) {
    if (!Array.isArray(note)) note = null;    // called straight from a button, with its click
    const p = SP.port(D.at), Sh = S(), rk = rank();
    if (p.secret) return karnPort(note);
    const nextRank = SP.RANKS[rk + 1];
    const chart = el('canvas', { cls: 'chart', title: 'Open the sky map', onclick: () => openMap() });
    const marks = new Set(D.hold.map(j => j.to).concat(D.route));
    const drawChart = () => {
      if (!chart.isConnected) return;
      const r = chart.getBoundingClientRect(), dp = Math.min(2, window.devicePixelRatio || 1);
      if (chart.width !== Math.round(r.width * dp)) { chart.width = Math.round(r.width * dp); chart.height = Math.round(r.height * dp); }
      const c2 = chart.getContext('2d'); c2.setTransform(dp, 0, 0, dp, 0, 0);
      A.chart(c2, r.width, r.height, now(), D.at, marks, performance.now() / 1000, D.fleet);
      chartRaf = requestAnimationFrame(drawChart);
    };
    cancelAnimationFrame(chartRaf);
    setTimeout(drawChart, 0);

    const T = now();
    const hold = el('div', { cls: 'card' }, [
      el('h3', { text: 'Your hold (' + D.hold.length + ' of ' + Sh.slots + ')' }),
      D.hold.length ? el('div', {}, D.hold.map(j => {
        const left = dueOf(j) - T;
        return el('div', { cls: 'job' }, [
          el('div', { cls: 'grow' }, [el('div', { text: jobLine(j) + (j.stolen ? ' (raided)' : '') }), el('div', { cls: 'muted small', html: SP.JOBS[j.kind].name + ' · pays ' + j.pay + ' · due <b class="' + (left < 0 ? 'late' : '') + '">' + SP.clockOf(dueOf(j)) + '</b> (' + (left < 0 ? 'late' : 'in ' + SP.mmss(left)) + ')' })]),
          btn('Leave it here', () => { if (!confirm('Leave this job on the dock? Nobody pays for it.')) return; D.hold = D.hold.filter(x => x !== j); save(); portScreen(); }, 'small danger'),
        ]);
      })) : el('p', { cls: 'muted small', text: 'Empty. Take a job from the board.' }),
    ]);
    const jobs = boardFor();
    const board = el('div', { cls: 'card' }, [
      el('h3', { text: 'The job board' }),
      el('p', { cls: 'muted small', text: 'The sky clock runs while you stand here: a job’s time starts when you take it.' }),
      jobs.length ? el('div', {}, jobs.map(j => {
        const to = SP.port(j.to);
        return el('div', { cls: 'job' }, [
          el('div', { cls: 'grow' }, [
            el('div', { text: jobLine(j) }),
            el('div', { cls: 'muted small', text: SP.JOBS[j.kind].name + ' (' + SP.JOBS[j.kind].about + ') · on ' + bodyName(to.body) + ' · ' + SP.mmss(j.par) + ' to get it there' + (SP.JOBS[j.kind].weight >= 0.7 ? ' · heavy' : '') }),
            j.event ? el('div', { cls: 'small event', text: '★ ' + j.event + ' at ' + to.name + ': pays half again' }) : null,
          ]),
          el('div', { cls: 'pay', text: j.pay }),
          btn('Take', () => {
            if (D.hold.length >= Sh.slots) { toast('The hold is full.'); return; }
            D.hold.push(Object.assign({}, j, { taken: now() }));
            D.board.jobs = D.board.jobs.filter(x => x !== j); save(); portScreen();
          }, 'small primary', D.hold.length >= Sh.slots),
        ]);
      })) : el('p', { cls: 'muted small', text: 'Nothing left today. New jobs come with the next sky day.' }),
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
    const rumour = Math.random() < 0.35 ? el('p', { cls: 'muted small rumour', text: '“' + SP.RUMOURS[Math.floor(Math.random() * SP.RUMOURS.length)] + '”' }) : null;
    const kids = [
      note ? el('div', { cls: 'card note' }, note.map(n => el('p', { text: n }))) : null,
      el('div', { cls: 'card portcard' }, [
        el('div', { cls: 'grow' }, [
          el('div', { cls: 'pname', text: p.name }),
          el('div', { cls: 'muted small', text: 'on ' + bodyName(p.body) + ' · sky day ' + today() + ' · ' + SP.RANKS[rk].name + ' (' + D.deliveries + ' delivered' + (nextRank ? ', ' + (nextRank.at - D.deliveries) + ' more to ' + nextRank.name : '') + ')' }),
          el('p', { text: p.blurb }),
          SP.portEvent(p.id, today()) ? el('p', { cls: 'small event', text: '★ ' + SP.portEvent(p.id, today()).name + ' here today: ' + SP.portEvent(p.id, today()).about + '.' }) : null,
          rumour,
          el('div', { cls: 'row' }, [
            btn('Take off ⛵', fly, 'primary big'),
            btn('🗺 Sky map', () => openMap(), 'small'), btn('How to fly', help, 'small'), btn('Records', records, 'small'),
          ]),
          el('div', { cls: 'bars' }, [bar('Hull', hn / hullMax, '#c86a3a'), bar('Seed', 1, '#ffb040')]),
          D.route.length ? el('p', { cls: 'small route', text: 'Your route: ' + D.route.map((id, i) => (i + 1) + '. ' + SP.port(id).name).join(' → ') }) : null,
        ]),
        chart,
      ]),
      hold, board, skyCard(), fleetCard(), yard,
      SAVE.who ? el('p', { cls: 'muted small center', text: 'Saved to your Flake Games account' + (SAVE.online ? '' : ' (offline: kept in this browser for now)') + '.' })
        : el('p', { cls: 'muted small center', html: 'Flying as a guest: your ship is kept in this browser. <a href="#" id="signin">Sign in</a> to keep it, and your stats, on your account.' }),
    ];
    screen('Stryx Pilot', kids);
    const si = $('signin'); if (si) si.addEventListener('click', e => { e.preventDefault(); save(); F.toSignIn(); });
    if (!D.seenHelp) { D.seenHelp = true; save(); help(); }
  }
  /* the shared sky: who else is up there, and whether you fly with them */
  function skyCard() {
    const mode = el('select', { onchange: e => { D.sky.mode = e.target.value; if (D.sky.mode === 'code' && !D.sky.code) D.sky.code = NET.code(); save(); skyConnect(); portScreen(); } }, [
      el('option', { value: 'open', text: 'The open sky (everyone online)', selected: D.sky.mode === 'open' ? 'selected' : null }),
      el('option', { value: 'code', text: 'A private sky (friends with the code)', selected: D.sky.mode === 'code' ? 'selected' : null }),
      el('option', { value: 'off', text: 'Fly alone', selected: D.sky.mode === 'off' ? 'selected' : null }),
    ]);
    const codeRow = D.sky.mode === 'code' ? el('div', { cls: 'row' }, [
      el('span', { cls: 'small muted', text: 'Code:' }),
      el('input', { cls: 'txt code', value: D.sky.code, maxlength: '5', onchange: e => { D.sky.code = NET.cleanCode(e.target.value); save(); skyConnect(); portScreen(); } }),
      btn('New code', () => { D.sky.code = NET.code(); save(); skyConnect(); portScreen(); }, 'small'),
    ]) : null;
    const nameRow = SAVE.who ? null : el('div', { cls: 'row' }, [el('span', { cls: 'small muted', text: 'Your name in the sky:' }),
      el('input', { cls: 'txt', value: myName(), maxlength: '18', onchange: e => { const n = e.target.value.trim().slice(0, 18); if (n.length >= 2) { D.netName = n; save(); if (SKY) SKY.me.name = n; } } })]);
    return el('div', { cls: 'card' }, [
      el('h3', { text: 'The shared sky' }),
      el('p', { cls: 'muted small', text: 'Fly with other pilots online and you will see their ships. Get alongside one carrying cargo and press R (or Raid) to hook your vines across: hold there and a job out of their hold is yours. They can lash your vines off. Ports are safe. No account needed' + (SAVE.who ? '; your raids are kept on your account.' : '; sign in if you want your stats kept.') }),
      el('div', { cls: 'row' }, [mode]), codeRow, nameRow,
      el('p', { cls: 'small', id: 'skyStatus', text: skyText() }),
      el('p', { cls: 'muted small', text: 'Raids: ' + D.raids.done + ' made · ' + D.raids.suffered + ' suffered · ' + D.raids.cut + ' fought off' }),
    ]);
  }
  /* ships for hire */
  function fleetCard() {
    const rk = rank(), max = SP.FLEET.max[rk] || 0, T = now();
    if (!max) return el('div', { cls: 'card' }, [el('h3', { text: 'Ships for hire' }), el('p', { cls: 'muted small', text: 'Crews will work under a Ship’s Pilot. Make ' + (SP.RANKS[1].at - D.deliveries) + ' more deliveries and they will come looking for you.' })]);
    const rows = D.fleet.map(sh => {
      const e = SP.fleetEarn(sh, T);
      return el('div', { cls: 'job' }, [
        el('div', { cls: 'grow' }, [el('div', { html: '<b>' + sh.crew + '</b>: ' + SP.port(sh.from).name + ' ⇄ ' + SP.port(sh.to).name }),
          el('div', { cls: 'muted small', text: e.trips + ' trips since you last paid them' + (e.lost ? ' (' + e.lost + ' lost to Tyndael)' : '') + ' · your cut ' + e.coins + ' · their wages ' + e.wages + ' · ' + (e.net >= 0 ? '+' : '') + e.net }) ]),
        btn('Settle up', () => { const r = SP.fleetSettle(sh, now()); D.coins = Math.max(0, D.coins + r.net); save(); toast((r.net >= 0 ? 'You collect ' : 'You pay out ') + Math.abs(r.net) + ' coins.'); portScreen(); }, 'small primary'),
        btn('Let go', () => { if (!confirm('Pay off ' + sh.crew + ' and let them go?')) return; const r = SP.fleetSettle(sh, now()); D.coins = Math.max(0, D.coins + r.net); D.fleet = D.fleet.filter(x => x !== sh); save(); portScreen(); }, 'small danger'),
      ]);
    });
    const dests = SP.PORTS.filter(q => q.id !== D.at && !q.secret && q.rank <= rk);
    const pick = el('select', {}, dests.map(q => el('option', { value: q.id, text: q.name })));
    const cost = SP.FLEET.cost(D.fleet.length);
    const hire = D.fleet.length < max ? el('div', { cls: 'row' }, [el('span', { cls: 'small', text: 'Hire a crew to run ' + SP.port(D.at).name + ' ⇄ ' }), pick,
      btn('Hire · ' + cost, () => {
        if (D.coins < cost) { toast('Not enough coins.'); return; }
        const crew = SP.CREWS.filter(c => !D.fleet.some(sh => sh.crew === c))[0] || 'a crew';
        D.coins -= cost; D.fleet.push(SP.hireShip('h' + Date.now().toString(36), D.at, pick.value, now(), crew)); save();
        toast(crew + ' sign on. Look for their skiff in the sky.'); portScreen();
      }, 'small primary', D.coins < cost)]) : el('p', { cls: 'muted small', text: 'That is all the crews a ' + SP.RANKS[rk].name + ' can keep (' + max + ').' });
    return el('div', { cls: 'card' }, [el('h3', { text: 'Ships for hire' }),
      el('p', { cls: 'muted small', text: 'A crew runs a route for you, back and forth, while you fly your own. You take a cut of every trip and pay them a wage each sky day. Settle up at any port.' }),
      rows.length ? el('div', {}, rows) : null, hire]);
  }
  /* Mba'Karn: the world at the end of the Waves of Memory */
  function karnPort(note) {
    const p = SP.port('mbakarn');
    screen('Mba’Karn', [
      note ? el('div', { cls: 'card note' }, note.map(n => el('p', { text: n }))) : null,
      el('div', { cls: 'card karn' }, [el('div', { cls: 'pname', text: p.name }), el('p', { text: p.blurb }),
        el('p', { cls: 'muted', text: 'The harbour-master is a Karnen woman with a lantern older than the Rakarvorac. “Few find the way,” she says. “Fewer still find it twice. The waves will carry you home, if you let them.”' }),
        el('p', { cls: 'muted small', text: 'You have found Mba’Karn ' + (D.secrets.karn || 1) + ' time' + ((D.secrets.karn || 1) > 1 ? 's' : '') + '.' }),
        el('div', { cls: 'row' }, [btn('Ride the Waves of Memory home', () => { D.at = 'rakar'; save(); portScreen(['The Sunear’Zikhron carried you home in a long, bright dream. You wake at the Stryx Rakarvorac, with Karnen lantern-light still in your eyes.']); }, 'primary big')]),
      ]),
    ]);
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
      <kbd>E</kbd> or <kbd>Shift</kbd> lashes out with your vines and knocks away anything close. <kbd>M</kbd> opens the sky map. <kbd>R</kbd> raids.</p>
      <p>With a mouse or a finger: <b>hold</b> anywhere and the ship turns toward it and pushes. The buttons do the rest.</p>
      <h3>The sky turns</h3>
      <p>The Tatu and Kalo are big and far apart, and they never stop: they orbit, and they spin, and their ports turn with them.
      The air near a world moves with it. To land, match the ground’s own speed and touch down <b>gently</b>, nose up, on a pad.</p>
      <h3>The clock</h3>
      <p>The clock in the corner is the sky clock, the same for every pilot. It runs in port as well as in flight. Every job you take is due by a time on it:
      the clock shows your next one and how long you have left.</p>
      <h3>The sky map</h3>
      <p>Open the map (<kbd>M</kbd>, or the 🗺 button) to see where everything is, and where it will be in a few minutes. Tap ports to plan a route:
      the map tells you roughly when you would reach each one, against when your jobs are due. Your route shows in flight as numbered arrows.</p>
      <h3>Heat, jobs and weight</h3>
      <p>Pushing burns the seed’s heat; with none you drift until the sails win some back. Jobs pay more if you are on time. Fragile goods hate knocks,
      mail hates lateness, passengers tip for a smooth flight, fire seeds can smoulder. A heavy hold answers slowly.</p>
      <h3>Other pilots</h3>
      <p>In the shared sky you see everyone else who is flying. Get alongside a ship carrying cargo, press <kbd>R</kbd>, and <b>hold</b> beside it:
      your vines go across, and when they hold long enough a job out of their hold is yours (raided goods pay less). If someone hooks <i>you</i>,
      lash (<kbd>E</kbd>) to cut their vines. A ship on the ground or in port cannot be raided.</p>
      <h3>Ships for hire</h3>
      <p>Once you are a Ship’s Pilot, crews will work for you: they run a route of your choosing, back and forth, and you take a cut.
      You will see their skiffs in the sky.</p>
      <h3>The sky’s dangers and gifts</h3>
      <p><b>Tyndael</b> swarm round Leotik and the Ashen Reach. A <b>Lutut</b> screeches, then dives. Sky rock drifts along Bolo Kalo’s path,
      storms come off Nekh FtiSular, the <b>oath-mist</b> by Aakalay chills a seed. Skim past a world fast for a <b>slingshot</b>; tow <b>skiffs adrift</b> to safety.
      And now and then the <b>Waves of Memory</b> roll across the sky. Ride them. Some say, if you ride them long enough, they take you somewhere.</p>` })], portScreen);
  }
  function records() {
    const keys = Object.keys(D.records).sort();
    const t = el('table', { cls: 'tbl' }, [el('tr', {}, ['From', 'To', 'Best'].map(h => el('th', { text: h })))].concat(keys.map(k => {
      const [a, b] = k.split('>');
      return el('tr', {}, [el('td', { text: SP.port(a).name }), el('td', { text: SP.port(b).name }), el('td', { text: fmt(D.records[k]) })]);
    })));
    screen('Records', [el('div', { cls: 'card' }, [keys.length ? t : el('p', { cls: 'muted', text: 'No flights yet.' })]),
      el('p', { cls: 'muted small', text: D.flights + ' flights · ' + D.deliveries + ' delivered · ' + D.earned + ' coins earned · ' + D.mcfly + ' RubberMcFly caught · ' + D.wrecks + ' wrecks · raids ' + D.raids.done + ' made, ' + D.raids.suffered + ' suffered' + (D.secrets.karn ? ' · ★ found Mba’Karn' : '') })], portScreen);
  }

  /* ================= the sky map ================= */
  const MAP = { open: false, cx: 0, cy: 0, scale: 0, ahead: 0, drag: null, moved: false };
  function openMap() {
    MAP.open = true; $('mapbox').classList.remove('hidden');
    const T = now() + MAP.ahead, L = SP.layout(T);
    const at = FL ? FL.f.ship : SP.portPos(SP.port(D.at), L) || { x: 0, y: 0 };
    MAP.cx = at.x; MAP.cy = at.y; MAP.scale = 0;
    resizeMap(); mapSide();
  }
  function closeMap() { MAP.open = false; $('mapbox').classList.add('hidden'); if (!FL) portScreen(); }
  function mapSide() {
    const side = $('mapside'); side.innerHTML = '';
    const T = now();
    const start = FL ? FL.f.ship : SP.portPos(SP.port(D.at), SP.layout(T)) || { x: 0, y: 0 };
    const plan = SP.planRoute(start, D.route, T);
    side.appendChild(el('div', { cls: 'mapclock', html: '<b>' + SP.clockOf(T) + '</b> on the sky clock' }));
    side.appendChild(el('div', { cls: 'row' }, [0, 60, 180, 300].map(s => el('button', { cls: 'btn small' + (MAP.ahead === s ? ' on' : ''), type: 'button', onclick: () => { MAP.ahead = s; mapSide(); } }, [s ? '+' + s / 60 + ' min' : 'Now']))));
    side.appendChild(el('p', { cls: 'muted small', text: MAP.ahead ? 'Showing where everything will be in ' + MAP.ahead / 60 + ' minute' + (MAP.ahead > 60 ? 's' : '') + '.' : 'Showing the sky as it is now.' }));
    side.appendChild(el('h3', { text: 'Your route' }));
    if (!D.route.length) side.appendChild(el('p', { cls: 'muted small', text: 'Tap ports on the map to plan a route through them.' }));
    plan.forEach((leg, i) => {
      const p = SP.port(leg.id), due = D.hold.filter(j => j.to === leg.id).map(dueOf).sort((a, b) => a - b)[0];
      const arrive = T + (leg.eta || 0);
      const ok = due == null || arrive <= due;
      side.appendChild(el('div', { cls: 'leg' }, [
        el('div', {}, [el('b', { text: (i + 1) + '. ' + p.name }), btn('✕', () => { D.route.splice(i, 1); save(); mapSide(); }, 'tiny')]),
        el('div', { cls: 'muted small', html: 'about ' + SP.mmss(leg.leg || 0) + ' flying · there by <b>' + SP.clockOf(arrive) + '</b>' + (due != null ? ' · due ' + SP.clockOf(due) + ' <span class="' + (ok ? 'ok' : 'late') + '">' + (ok ? '✓ in time' : '✗ late') + '</span>' : '') }),
      ]));
    });
    if (D.route.length) side.appendChild(btn('Clear the route', () => { D.route = []; save(); mapSide(); }, 'small danger'));
    side.appendChild(el('h3', { text: 'In your hold' }));
    if (!D.hold.length) side.appendChild(el('p', { cls: 'muted small', text: 'Nothing.' }));
    D.hold.slice().sort((a, b) => dueOf(a) - dueOf(b)).forEach(j => side.appendChild(el('div', { cls: 'small' + (dueOf(j) < T ? ' late' : '') }, [SP.JOBS[j.kind].icon + ' ' + SP.port(j.to).name + ' by ' + SP.clockOf(dueOf(j)) + (D.route.indexOf(j.to) < 0 ? '  ' : ''), D.route.indexOf(j.to) < 0 ? btn('+ route', () => { D.route.push(j.to); save(); mapSide(); }, 'tiny') : null])));
    side.appendChild(el('div', { cls: 'row' }, [btn('−', () => { MAP.scale *= 0.7; }, 'small'), btn('+', () => { MAP.scale *= 1.4; }, 'small'), btn('Centre on me', () => { const at = FL ? FL.f.ship : SP.portPos(SP.port(D.at), SP.layout(now())); MAP.cx = at.x; MAP.cy = at.y; }, 'small'), btn('Whole sky', () => { MAP.cx = 0; MAP.cy = 0; MAP.scale = Math.min(mapcv.clientWidth, mapcv.clientHeight) / 46000; }, 'small')]));
    side.appendChild(btn('Close the map (M)', closeMap, 'primary'));
  }
  function resizeMap() {
    const r = mapcv.getBoundingClientRect(), dp = Math.min(2, window.devicePixelRatio || 1);
    mapcv.width = Math.round(r.width * dp); mapcv.height = Math.round(r.height * dp);
    if (!MAP.scale) MAP.scale = Math.min(r.width, r.height) / 26000;
  }
  function drawMap(t) {
    if (!MAP.open) return;
    const r = mapcv.getBoundingClientRect(), dp = Math.min(2, window.devicePixelRatio || 1);
    if (mapcv.width !== Math.round(r.width * dp)) resizeMap();
    mapctx.setTransform(dp, 0, 0, dp, 0, 0);
    const T = (FL ? FL.f.T : now()) + MAP.ahead;
    const others = SKY ? SKY.flying().filter(p => p.x != null).map(p => ({ x: p.x, y: p.y, ang: p.ang, name: p.name, color: p.color })) : [];
    A.map(mapctx, r.width, r.height, { T, cx: MAP.cx, cy: MAP.cy, scale: MAP.scale, ship: FL ? FL.f.ship : null, here: FL ? null : D.at, route: D.route, hold: D.hold, fleet: D.fleet, others, extra: FL ? FL.f.bodies : null, now: t, ahead: MAP.ahead });
  }
  mapcv.addEventListener('pointerdown', e => { MAP.drag = { x: e.clientX, y: e.clientY, cx: MAP.cx, cy: MAP.cy }; MAP.moved = false; mapcv.setPointerCapture && mapcv.setPointerCapture(e.pointerId); });
  mapcv.addEventListener('pointermove', e => {
    if (!MAP.drag) return;
    const dx = e.clientX - MAP.drag.x, dy = e.clientY - MAP.drag.y;
    if (Math.hypot(dx, dy) > 6) MAP.moved = true;
    MAP.cx = MAP.drag.cx - dx / MAP.scale; MAP.cy = MAP.drag.cy - dy / MAP.scale;
  });
  mapcv.addEventListener('pointerup', e => {
    const d = MAP.drag; MAP.drag = null;
    if (!d || MAP.moved) return;
    /* a tap: the port nearest the tap goes on (or off) the route */
    const r = mapcv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const T = (FL ? FL.f.T : now()) + MAP.ahead, L = FL ? Object.assign(SP.layout(T), FL.f.bodies.karn ? { karn: FL.f.bodies.karn } : {}) : SP.layout(T);
    let best = null, bd = 26;
    SP.portsIn(L).forEach(p => {
      if (p.secret) return;
      const pp = SP.portPos(p, L), b = L[p.body], big = A.mapBig(b, MAP.scale);
      const sx = (b.x + (pp.x - b.x) * big - MAP.cx) * MAP.scale + r.width / 2, sy = (b.y + (pp.y - b.y) * big - MAP.cy) * MAP.scale + r.height / 2;
      const dd = Math.hypot(sx - mx, sy - my); if (dd < bd) { bd = dd; best = p; }
    });
    if (best) {
      if (best.rank > rank()) { toast(best.name + ' will not take a ' + SP.RANKS[rank()].name + ' yet.'); return; }
      const i = D.route.indexOf(best.id);
      if (i >= 0) D.route.splice(i, 1); else D.route.push(best.id);
      save(); mapSide(); beep(660, 0.08, 'triangle', 0.03);
    }
  });
  mapcv.addEventListener('wheel', e => { e.preventDefault(); MAP.scale *= e.deltaY < 0 ? 1.15 : 0.87; }, { passive: false });

  /* ================= the flight ================= */
  let FL = null;
  const input = { turn: 0, thrust: false, brake: false, boost: false, lash: false, aim: null };
  const keys = {};
  const touchy = matchMedia('(pointer: coarse)').matches;
  const online = () => SKY && SKY.state === 'on';

  function fly() {
    cancelAnimationFrame(chartRaf);
    ui.classList.add('hidden'); document.body.classList.add('flying');
    $('hud').classList.remove('hidden');
    $('touch').classList.toggle('hidden', !touchy);
    const T0 = now();
    const f = SP.makeFlight({ T0, from: D.at, parts: D.parts, hull: hullNow(), rank: rank(), seed: (Math.floor(T0) * 7919 + D.flights * 13) >>> 0, hot: D.hold.some(j => j.kind === 'seeds'), weight: D.hold.reduce((w, j) => w + (SP.JOBS[j.kind].weight || 0), 0) });
    A.parts.length = 0; A.resetCamera(f);
    FL = { f, from: D.at, ended: 0, log: [], logT: 0, raid: null, raidCd: 0, sentAt: 0, raidSent: 0 };
    Object.assign(input, { turn: 0, thrust: false, brake: false, boost: false, lash: false, aim: null });
    say('takeoff');
    resize();
  }
  function say(key) { const L = SP.LOG[key]; if (L) logLine(L[Math.floor(Math.random() * L.length)]); }
  function logLine(text) { if (!FL) return; FL.logT = 4.5; $('log').textContent = '— ' + text; $('log').classList.remove('hidden'); }
  function leaveFlightScreen() {
    FL = null; engine(false);
    document.body.classList.remove('flying');
    $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('pausebox').classList.add('hidden');
    if (MAP.open) { MAP.open = false; $('mapbox').classList.add('hidden'); }
  }

  function endFlight() {
    const f = FL.f, from = FL.from;
    leaveFlightScreen();
    D.flights++; D.mcfly += f.mcfly;
    const note = [];
    const coinsFly = f.mcfly * 6;
    if (f.mcfly) { D.coins += coinsFly; note.push('You caught ' + f.mcfly + ' RubberMcFly in the Waves of Memory: ' + coinsFly + ' coins.'); }
    f.skiffs.filter(k => k.saved).forEach(k => { D.coins += k.reward; D.rescues = (D.rescues || 0) + 1; note.push('You towed ' + k.who + ' clear of the sky: they pressed ' + k.reward + ' coins on you.'); });
    if (f.slings) { const c = f.slings * 6; D.coins += c; D.slings = (D.slings || 0) + f.slings; note.push(f.slings + ' slingshot' + (f.slings > 1 ? 's' : '') + ' round the pull of the Tatu: the academy pays ' + c + ' coins for good flying.'); }
    if (f.wrecked) {
      D.wrecks++;
      const fee = Math.min(D.coins, 40);
      D.coins -= fee;
      const lost = D.hold.filter(j => j.kind === 'fragile' || j.kind === 'seeds');
      D.hold = D.hold.filter(j => lost.indexOf(j) < 0);
      D.hull = Math.round(S().hullMax * 0.4);
      D.at = from;
      note.unshift('The hull gave out. The academy sent a tow back to ' + SP.port(from).name + ' (' + fee + ' coins), and the bark-mender patched you up enough to fly.' + (lost.length ? ' The fragile cargo and fire seeds were lost.' : ''));
      save(); SFX.wreck();
      portScreen(note); return;
    }
    D.hull = Math.max(1, f.ship.hull);
    const to = f.docked;
    if (to === 'mbakarn') {
      const first = !D.secrets.karn;
      D.secrets.karn = (D.secrets.karn || 0) + 1;
      const gift = first ? 600 : 150;
      D.coins += gift; D.at = 'mbakarn'; save(); SFX.karn();
      return portScreen((first ? ['You have found Mba’Karn, the world of the Karnen, at the far end of the Waves of Memory. It is on no chart. The Karnen in the harbour greet you as if they had been expecting a ship for a very long time, and press ' + gift + ' coins’ worth of lantern-glass into your vines.'] : ['Mba’Karn again. The harbour-master raises her lantern: “Twice. Hm.” She gives you ' + gift + ' coins’ worth of glass.']).concat(note));
    }
    const key = from + '>' + to;
    if (to !== from) {
      const best = D.records[key];
      if (best == null || f.t < best) { D.records[key] = Math.round(f.t * 10) / 10; if (best != null) note.push('A new best from ' + SP.port(from).name + ': ' + fmt(f.t) + ' (was ' + fmt(best) + ').'); }
    }
    /* deliver what is for here */
    const T = now();
    const here = D.hold.filter(j => j.to === to);
    here.forEach(j => {
      const time = T - j.taken;
      const r = SP.settle(j, f, time);
      D.coins += r.pay; D.earned += r.pay; D.deliveries++;
      note.push(SP.JOBS[j.kind].icon + ' ' + j.what + (T > dueOf(j) ? ' arrived late' : ' arrived in time') + ' (' + SP.mmss(time) + '): ' + r.pay + ' coins' + (r.notes.length ? ' (' + r.notes.join(', ') + ')' : '') + '.');
    });
    D.hold = D.hold.filter(j => j.to !== to);
    D.route = D.route.filter(id => id !== to);
    const rkBefore = SP.rankOf(D.deliveries - here.length), rkNow = rank();
    if (rkNow > rkBefore) note.push('You are now ' + SP.RANKS[rkNow].name + '.' + (rkNow === 1 ? ' Crews will hire on under you now: see Ships for hire.' : ' Further ports will take your jobs.'));
    if (!here.length) note.unshift('Docked at ' + SP.port(to).name + '.');
    note.push(f.hits ? 'Knocks: ' + f.hits + ' (' + Math.round(f.damage) + ' bark).' : 'Not a scratch.');
    D.at = to;
    save(); SFX.dock();
    portScreen(note);
  }

  /* the controls */
  const isK = (e, list) => list.indexOf(e.key) >= 0;
  window.addEventListener('keydown', e => {
    if (e.key === 'm' || e.key === 'M') { if (e.target && e.target.tagName === 'INPUT') return; if (MAP.open) closeMap(); else if (D) openMap(); return; }
    if (!FL) return;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { setPause(!FL.paused); return; }
    keys[e.key.toLowerCase()] = true;
    if (isK(e, [' ']) && !e.repeat) input.boost = true;
    if (isK(e, ['e', 'E', 'Shift']) && !e.repeat) input.lash = true;
    if (isK(e, ['r', 'R']) && !e.repeat) startRaid();
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
  hold('tRaid', () => startRaid());
  $('mapBtn').addEventListener('click', () => { if (MAP.open) closeMap(); else openMap(); });
  $('pause').addEventListener('click', () => setPause(!FL.paused));
  $('resume').addEventListener('click', () => setPause(false));
  $('abort').addEventListener('click', () => {
    if (!FL) return;
    if (!confirm('Turn back? The academy will tow you back to where you set off, for 20 coins.')) return;
    const from = FL.from; leaveFlightScreen();
    D.coins = Math.max(0, D.coins - 20); D.at = from; save(); portScreen(['Towed back to ' + SP.port(from).name + '.']);
  });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; pointer = null; if (FL && !online()) setPause(true); });
  /* in the shared sky the world does not stop for anyone: pausing just shows the menu */
  function setPause(v) { if (!FL) return; FL.paused = v && !online(); $('pausebox').classList.toggle('hidden', !v); $('pauseNote').classList.toggle('hidden', !online()); if (v && !online()) engine(false); }

  /* ---- raids ---- */
  function raidTarget() {
    if (!online() || !FL) return null;
    const s = FL.f.ship;
    let best = null, bd = SP.RAID.range;
    SKY.flying().forEach(p => {
      if (p.x == null || !p.net || p.net.g || !p.net.h) return;
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }
  function startRaid() {
    if (!FL || FL.raid) return;
    if (!online()) { pop('Nobody else is in your sky.', '#c8c8e8'); return; }
    if (FL.raidCd > 0) { pop('Your vines are still sore (' + Math.ceil(FL.raidCd) + ' s).', '#c8c8e8'); return; }
    if (FL.f.ship.grounded) { pop('Not from the ground.', '#c8c8e8'); return; }
    const p = raidTarget();
    if (!p) { pop('Nobody close enough carrying cargo.', '#c8c8e8'); return; }
    FL.raid = { target: p.key, t: 0, claimed: false, claimAt: 0 };
    say('raidOn'); SFX.lash();
  }
  function stepRaid(dt) {
    if (FL.raidCd > 0) FL.raidCd -= dt;
    const R = FL.raid; if (!R) return;
    const p = SKY && SKY.pilots[R.target], s = FL.f.ship;
    const close = p && p.x != null && p.net && !p.net.g && Math.hypot(p.x - s.x, p.y - s.y) < SP.RAID.range * 1.15 && Math.hypot((p.vx || 0) - s.vx, (p.vy || 0) - s.vy) < 320 && !s.grounded;
    if (!close) { if (!R.claimed) { pop('The vines slip.', '#c8c8e8'); FL.raid = null; FL.raidCd = 2; } return; }
    R.t += dt;
    if (performance.now() - FL.raidSent > 250) { FL.raidSent = performance.now(); SKY.send({ t: 'raid', to: R.target, p: R.t }); }
    if (R.t >= SP.RAID.time && !R.claimed) { R.claimed = true; R.claimAt = performance.now(); SKY.send({ t: 'claim', to: R.target }); }
    if (R.claimed && performance.now() - R.claimAt > 4000) { FL.raid = null; FL.raidCd = 3; }
  }

  /* the loop */
  let last = performance.now();
  const perf = [];
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (MAP.open) drawMap(t / 1000);
    if (SKY) SKY.smooth(dt);
    if (!FL) return;
    perf.push(dt); if (perf.length > 90) perf.shift();
    if (perf.length === 90 && !A.lowFx && perf.reduce((a, b) => a + b, 0) / 90 > 0.026) { A.lowFx = true; }
    const f = FL.f;
    const mapPause = MAP.open && !online();
    if (!FL.paused && !FL.ended && !mapPause) {
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
      /* in the shared sky everyone's worlds must agree: keep this flight on the sky clock */
      if (online() && Math.abs(now() - f.T) > 0.6) f.T0 += now() - f.T;
      engine(f.ship.thrusting);
      f.events.forEach(ev => {
        A.event(ev, f);
        if (ev.t === 'log') logLine(ev.text);
        else if (ev.t === 'hit') SFX.hit(ev.n); else if (ev.t === 'boost') SFX.boost(); else if (ev.t === 'lash') { SFX.lash(); lashRaiders(); }
        else if (ev.t === 'pop') SFX.pop(); else if (ev.t === 'mcfly') SFX.mcfly(); else if (ev.t === 'screech') SFX.screech();
        else if (ev.t === 'bolt' && Math.hypot(ev.x - f.ship.x, ev.y - f.ship.y) < 900) SFX.bolt();
        else if (ev.t === 'rescue') { SFX.dock(); pop('Rescued! +' + ev.coins, '#ffd890'); }
        else if (ev.t === 'sling') { SFX.mcfly(); pop('Slingshot!', '#a8e8ff'); }
        else if (ev.t === 'karn') { SFX.karn(); pop('A world on no chart…', '#ffe0a0'); }
      });
      f.events.length = 0;
      if (online()) {
        stepRaid(dt);
        if (t - FL.sentAt > NET.SEND_MS) { FL.sentAt = t; SKY.sendShip(f, D.hold.length, FL.raid ? FL.raid.target : '', myName()); }
      }
      A.stepParts(dt, f);
      if ((f.docked || f.wrecked) && !FL.ended) FL.ended = t + (f.wrecked ? 1800 : 1100);
      if (FL.logT > 0) { FL.logT -= dt; if (FL.logT <= 0) $('log').classList.add('hidden'); }
      if (FL.raidedBy && t - FL.raidedAt > 1500) { FL.raidedBy = null; FL.alarmed = false; }
    }
    if (FL.ended && t > FL.ended) { endFlight(); return; }
    if (FL.ended) A.stepParts(dt, f);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const marks = new Set(D.hold.map(j => j.to));
    const targets = D.hold.map(j => ({ port: j.to, label: SP.port(j.to).name }));
    D.route.forEach((id, i) => { if (!marks.has(id)) targets.push({ port: id, label: (i + 1) + ' · ' + SP.port(id).name, color: '#9fe0ff' }); });
    f.skiffs.forEach(k => { if (!k.saved && Math.hypot(k.x - f.ship.x, k.y - f.ship.y) < 4500) targets.push({ x: k.x, y: k.y, label: 'Distress', color: '#ff8a7a' }); });
    const others = SKY && online() ? SKY.flying().filter(p => p.x != null).map(p => ({ key: p.key, x: p.x, y: p.y, ang: p.ang || 0, vx: p.vx || 0, vy: p.vy || 0, th: p.net && p.net.th, name: p.name, color: p.color, cargo: p.net && p.net.h, raidingMe: p.net && p.net.r === myKey(), mine: FL.raid && FL.raid.target === p.key })) : [];
    const fleet = D.fleet.map(sh => { const q = SP.fleetPos(sh, f.T, f.bodies); return q ? Object.assign(q, { name: sh.crew }) : null; }).filter(Boolean);
    FL.view = A.draw(ctx, W, H, f, t / 1000, { marks, targets, braking: input.brake, others, fleet, raid: FL.raid ? FL.raid.t / SP.RAID.time : 0 });
    A.minimap(mctx, mini.width, mini.height, f, Array.from(marks), others, fleet);
    hud(f);
  }
  function lashRaiders() {
    if (!online() || !FL) return;
    const s = FL.f.ship, reach = FL.f.S.lash + 60;
    Object.keys(SKY.raids).forEach(k => {
      const p = SKY.pilots[k];
      if (p && p.x != null && Math.hypot(p.x - s.x, p.y - s.y) < reach) { SKY.send({ t: 'cut', to: k }); delete SKY.raids[k]; D.raids.cut++; save(); pop('Cut loose!', '#b8f090'); say('cut'); FL.raidedBy = null; FL.alarmed = false; }
    });
  }
  function pop(text, col) {
    const p = el('div', { cls: 'pop', text }); p.style.color = col; $('hud').appendChild(p);
    setTimeout(() => p.remove(), 1500);
  }
  function hud(f) {
    const s = f.ship, Sh = f.S, T = f.T;
    $('hHull').style.width = Math.round(s.hull / Sh.hullMax * 100) + '%';
    $('hHeat').style.width = Math.round(s.heat / Sh.heatMax * 100) + '%';
    $('hHeatBar').classList.toggle('low', s.heat < Sh.heatMax * 0.2);
    const P = SP.pull(f, s.x, s.y);
    $('hSpeed').textContent = Math.round(Math.hypot(s.vx, s.vy) / 40 * 3.6) + ' km/h';
    $('hAlt').textContent = s.grounded ? 'on ' + P.near.name : Math.round(Math.max(0, P.alt - SP.SHIP_R) / 40) + ' m over ' + P.near.name;
    $('hTime').textContent = SP.mmss(f.t) + ' in the air';
    /* the clock, and when things are due */
    $('ckTime').textContent = SP.clockOf(T);
    $('ckDay').textContent = 'sky day ' + SP.skyDay(T);
    const dues = $('ckDue'); dues.innerHTML = '';
    D.hold.slice().sort((a, b) => dueOf(a) - dueOf(b)).slice(0, 3).forEach(j => {
      const left = dueOf(j) - T;
      dues.appendChild(el('div', { cls: left < 0 ? 'late' : left < 30 ? 'soon' : '' }, [SP.JOBS[j.kind].icon + ' ' + SP.port(j.to).name + ' ' + SP.clockOf(dueOf(j)) + ' · ' + (left < 0 ? 'late' : SP.mmss(left))]));
    });
    if (!D.hold.length) dues.appendChild(el('div', { cls: 'muted', text: 'nothing due' }));
    $('hLash').classList.toggle('ready', s.lashCd <= 0);
    $('tLash').classList.toggle('ready', s.lashCd <= 0);
    const target = online() && !FL.raid && FL.raidCd <= 0 ? raidTarget() : null;
    $('tRaid').classList.toggle('hidden', !online());
    $('tRaid').classList.toggle('ready', !!target);
    $('hRaid').textContent = !online() ? '' : FL.raid ? 'Raiding… ' + Math.min(100, Math.round(FL.raid.t / SP.RAID.time * 100)) + '%' : target ? 'R: raid ' + target.name + ' (' + target.net.h + ' in the hold)' : '';
    let msg = '';
    if (f.docked) msg = 'Docked: ' + SP.port(f.docked).name;
    else if (f.wrecked) msg = 'The hull is gone';
    else if (FL.raidedBy) msg = ((SKY && SKY.pilots[FL.raidedBy] && SKY.pilots[FL.raidedBy].name) || 'Someone') + ' is raiding your hold! Lash (E) to cut them off!';
    else if (s.grounded && f.t < 3) msg = touchy ? 'Hold above the ship to lift off' : 'Hold ↑ to lift off';
    else { const k = f.skiffs.find(k => !k.saved && k.hold > 0); if (k) msg = 'Towing… ' + Math.round(k.hold / 1.6 * 100) + '%'; }
    const m = $('hMsg'); m.textContent = msg; m.classList.toggle('hidden', !msg); m.classList.toggle('alarm', !!FL.raidedBy);
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const ms = Math.round(Math.min(150, Math.max(96, W * 0.12)));
    mini.width = ms * 2; mini.height = ms * 2; mini.style.width = ms + 'px'; mini.style.height = ms + 'px';
    if (MAP.open) resizeMap();
  }
  window.addEventListener('resize', resize);
  /* the minimap draws in its own pixels */
  const mm = A.minimap;
  A.minimap = (c, w, h, f, m, o, fl) => { c.setTransform(1, 0, 0, 1, 0, 0); mm(c, w, h, f, m, o, fl); };

  /* ================= boot ================= */
  resize();
  requestAnimationFrame(frame);
  ui.appendChild(el('p', { cls: 'center muted', text: 'Warming the seed…' }));
  SAVE.ready.then(d => {
    D = d;
    const b = blank();
    Object.keys(b).forEach(k => { if (D[k] == null) D[k] = b[k]; });
    /* saves from before the sky clock: jobs in the hold start their clocks now */
    const T = now();
    D.hold.forEach(j => { if (!j.taken || j.taken < 1e6 || j.taken > T + 60) j.taken = T; if (j.par < 40) j.par = j.par + 45; });
    if (!SP.port(D.at)) D.at = 'rakar';
    if (SAVE.banned) { screen('Stryx Pilot', [el('div', { cls: 'card', text: SAVE.banned })]); return; }
    portScreen();
    skyConnect();
  });
  window.addEventListener('pagehide', () => { if (SKY) SKY.close(); });
  window.SP_GAME = { get D() { return D; }, get FL() { return FL; }, get SKY() { return SKY; }, fly, portScreen, input, openMap, closeMap, startRaid, skyConnect };
})();
