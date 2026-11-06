/* ============================================================
   PUNK RACES — js/pr_main.js
   The game around the race: the menus, your stable, the foal
   market, the cups, the betting board, time trials, saving, and
   the race screen (the loop, the controls and the HUD).
   ============================================================ */
(function () {
  'use strict';
  const PR = window.PR, A = PR.art, F = window.FLAKE;
  const $ = id => document.getElementById(id);
  const ui = $('ui'), cv = $('race'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  /* ================= the save ================= */
  function blank() {
    const r = PR.rng(Date.now() & 0xffffff);
    const starter = PR.newPunk(r, { coat: 'orange', name: 'Pumpkin', grade: 1 });
    starter.stats = { speed: 3, grip: 3, spring: 3, nerve: 2 };
    return {
      v: 1, coins: PR.START_COINS, punks: [starter], active: starter.id, hat: '#7a4a24',
      cups: {}, cupRun: null, records: {}, wins: 0, races: 0, bets: { won: 0, lost: 0 }, foals: null, foalSeed: 1, seenHelp: false,
    };
  }
  const SAVE = window.FLAKE_MINI.open('pr', blank);
  let D = null;
  const save = () => SAVE.save();
  const me = () => D.punks.find(p => p.id === D.active) || D.punks[0];
  const riderName = () => (SAVE.who && SAVE.who.name) || 'You';

  /* ================= little sounds ================= */
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
  const SFX = {
    vine: () => beep(520, 0.12, 'triangle', 0.04, 900),
    clean: () => { beep(880, 0.12, 'sine', 0.05); setTimeout(() => beep(1320, 0.15, 'sine', 0.04), 70); },
    boost: () => beep(200, 0.4, 'sawtooth', 0.03, 600),
    fruit: () => beep(990, 0.1, 'square', 0.025, 1500),
    splash: () => beep(180, 0.3, 'triangle', 0.05, 80),
    fall: () => beep(300, 0.5, 'triangle', 0.05, 90),
    go: () => beep(660, 0.3, 'square', 0.04),
    count: () => beep(440, 0.12, 'square', 0.03),
    trick: n => { beep(660 + Math.min(4, n || 1) * 110, 0.12, 'triangle', 0.045, 1400); },
    snap: () => { beep(240, 0.08, 'square', 0.05, 90); setTimeout(() => beep(160, 0.12, 'square', 0.04, 60), 40); },
    bump: () => beep(140, 0.1, 'sine', 0.06, 80),
    finish: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'triangle', 0.05), i * 110)); },
  };

  /* ================= building screens ================= */
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
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2800);
  }
  function portrait(p, size) {
    const c = el('canvas', { width: size * 2, height: size * 2, cls: 'portrait' });
    c.style.width = size + 'px'; c.style.height = size + 'px';
    A.portrait(c, p, D.hat);
    return c;
  }
  function statBars(p, train) {
    return el('div', { cls: 'stats' }, PR.STATS.map(s => {
      const v = p.stats[s.id];
      const bar = el('div', { cls: 'bar' }, [el('i', { style: 'width:' + (v * 10) + '%' })]);
      const row = el('div', { cls: 'stat', title: s.about }, [el('span', { cls: 'sn', text: s.name }), bar, el('b', { text: v })]);
      if (train) {
        const cost = PR.trainCost(v), ok = PR.canTrain(p, s.id);
        row.appendChild(btn(ok ? '+1 · ' + cost : (v >= PR.STAT_MAX ? 'max' : 'full'), () => {
          if (D.coins < cost) { toast('Not enough coins.'); return; }
          D.coins -= cost; p.stats[s.id]++; save(); beep(700, 0.1, 'triangle', 0.04); train();
        }, 'small', !ok || D.coins < cost));
      }
      return row;
    }));
  }
  const place = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
  const fmt = t => t == null ? '—' : t.toFixed(2) + ' s';
  const medal = (t, tr) => t == null ? '' : t <= tr.par ? '🥇' : t <= tr.par * 1.15 ? '🥈' : t <= tr.par * 1.35 ? '🥉' : '';

  /* ================= the main menu ================= */
  function menu() {
    const p = me();
    const card = el('div', { cls: 'card hero' }, [
      portrait(p, 120),
      el('div', {}, [
        el('div', { cls: 'pname', text: p.name }),
        el('div', { cls: 'muted', text: PR.COATS[p.coat].name + ' Punk · ridden by ' + riderName() }),
        statBars(p),
        el('div', { cls: 'muted small', text: p.races + ' races · ' + p.wins + ' wins' }),
      ]),
    ]);
    const cupBusy = D.cupRun ? ' (in progress)' : '';
    const grid = el('div', { cls: 'grid' }, [
      tile('🏆', 'Cup Races' + cupBusy, 'Three races, points for each place, a purse for the winner.', cups),
      tile('🏁', 'Quick Race', 'One race against three rivals on any track you have reached.', () => pickTrack('quick')),
      tile('⏱', 'Time Trial', 'Just you and the ghost of your best run. Beat par for gold.', () => pickTrack('trial')),
      tile('🎟', 'Watch & Bet', 'The market-day way: pick a runner, put coins on it, and watch.', watchBet),
      tile('🐾', 'Your Stable', 'Train your Punks, choose who races, pair two at the Grove.', stable),
      tile('🌱', 'Foal Market', 'Young Punks for sale. New foals after every race.', market),
      tile('📜', 'Records', 'Your best times on every track.', records),
      tile('❔', 'How to Ride', 'The vine, the release, the boost.', help),
    ]);
    const acct = SAVE.who ? el('p', { cls: 'muted small center', text: 'Saved to your Flake Games account' + (SAVE.online ? '' : ' (offline: kept in this browser for now)') + '.' })
      : el('p', { cls: 'muted small center', html: 'Playing as a guest: your stable is kept in this browser. <a href="#" id="signin">Sign in</a> to keep it on your account.' });
    screen('Punk Races', [card, grid, acct]);
    const si = $('signin'); if (si) si.addEventListener('click', e => { e.preventDefault(); save(); F.toSignIn(); });
    if (!D.seenHelp) { D.seenHelp = true; save(); help(); }
  }
  function tile(icon, name, about, fn) {
    return el('button', { cls: 'tile', type: 'button', onclick: fn }, [el('div', { cls: 'ti', text: icon }), el('div', { cls: 'tn', text: name }), el('div', { cls: 'ta', text: about })]);
  }

  function help() {
    screen('How to Ride', [el('div', { cls: 'card prose', html: `
      <p>Your Punk swings from tree to tree on its own leg-vines. The faster you swing, the faster you race.</p>
      <h3>The vine</h3>
      <p><b>Hold</b> <kbd>Space</kbd>, the mouse button, or anywhere on a touch screen. A vine shoots to the glowing branch tip ahead and catches.
      Keep holding and you swing under it: your Punk pumps at the bottom of the arc.</p>
      <p><b>Let go</b> to fly off with all that speed, then hold again in the air to catch the next tree.</p>
      <h3>A clean release</h3>
      <p>Let go just past the bottom, while you are rising forward (between a gentle climb and a steep one).
      A clean release throws you a little harder, sparkles, and fills your boost.</p>
      <h3>Boost</h3>
      <p>When the boost bar is full, press <kbd>Shift</kbd>, <kbd>X</kbd> or the ⚡ button. Ju fruit hanging in the air fill it too.</p>
      <h3>The ground</h3>
      <p>On the ground your Punk runs, and holding with no branch in reach jumps. Thorns and venom bogs slow you,
      water makes you swim (slowly: catch a branch to get out), and a fall into a chasm costs you a slow climb out.
      Geysers on the Ashen Reach throw you high, if you time them.</p>
      <h3>Your stable</h3>
      <p>Each Punk has four stats: <b>Speed</b> (running, and less air drag), <b>Grip</b> (how far its vines reach),
      <b>Spring</b> (pumping and a clean release), and <b>Nerve</b> (boost). Train them with coins, up to what that Punk can become.</p>` })], menu);
  }

  /* ================= stable, market, records ================= */
  function stable() {
    const list = el('div', { cls: 'list' });
    D.punks.forEach(p => {
      const active = p.id === D.active;
      list.appendChild(el('div', { cls: 'card punk' + (active ? ' active' : '') }, [
        portrait(p, 96),
        el('div', { cls: 'grow' }, [
          el('div', { cls: 'pname', text: p.name + (active ? ' · racing' : '') }),
          el('div', { cls: 'muted small', text: PR.COATS[p.coat].name + ' · can grow to ' + p.pot + ' (now ' + PR.statTotal(p) + ') · ' + p.races + ' races, ' + p.wins + ' wins' + (p.parents ? ' · foal of ' + p.parents.join(' and ') : '') }),
          statBars(p, stable),
          el('div', { cls: 'row' }, [
            active ? null : btn('Race this one', () => { D.active = p.id; save(); stable(); }, 'small primary'),
            btn('Rename', () => { const n = prompt('A name for this Punk:', p.name); if (n && n.trim()) { p.name = n.trim().slice(0, 18); save(); stable(); } }, 'small'),
            D.punks.length > 1 ? btn('Sell · ' + sellPrice(p), () => { if (!confirm('Sell ' + p.name + ' for ' + sellPrice(p) + ' coins?')) return; D.coins += sellPrice(p); D.punks = D.punks.filter(x => x !== p); if (D.active === p.id) D.active = D.punks[0].id; save(); stable(); }, 'small danger') : null,
          ]),
        ]),
      ]));
    });
    const hats = ['#7a4a24', '#4a3a2a', '#3a6a7a', '#6a5a2a', '#2a4a2a', '#8a3a3a', '#5a3a6a', '#c8a040'];
    const hatRow = el('div', { cls: 'row' }, [el('span', { cls: 'muted', text: 'Your Aagac (acorn hat) and saddle blanket: ' })].concat(hats.map(h => el('button', { cls: 'swatch' + (D.hat === h ? ' on' : ''), style: 'background:' + h, type: 'button', onclick: () => { D.hat = h; save(); stable(); } }))));
    const grove = el('div', { cls: 'card' }, [
      el('h3', { text: 'The Grove: pair two Punks' }),
      el('p', { cls: 'muted small', text: 'Two of your Punks spend a season together at the Grove, and a foal grows from what they leave behind. It takes after both, with a little luck, and starts young. Costs ' + PR.PAIR_COST + ' coins and a free place in the stable.' }),
      pairPicker(),
    ]);
    screen('Your Stable', [hatRow, list, grove], menu);
  }
  const sellPrice = p => PR.SELL_BASE + PR.statTotal(p) * 10 + p.wins * 15;
  function pairPicker() {
    if (D.punks.length < 2) return el('p', { cls: 'muted small', text: 'You need two Punks.' });
    if (D.punks.length >= PR.MAX_PUNKS) return el('p', { cls: 'muted small', text: 'Your stable is full (' + PR.MAX_PUNKS + ').' });
    const opt = () => D.punks.map(p => el('option', { value: p.id, text: p.name }));
    const a = el('select', {}, opt()), b = el('select', {}, opt());
    b.selectedIndex = 1;
    return el('div', { cls: 'row' }, [a, el('span', { text: ' and ' }), b, btn('Pair · ' + PR.PAIR_COST, () => {
      if (a.value === b.value) { toast('Pick two different Punks.'); return; }
      if (D.coins < PR.PAIR_COST) { toast('Not enough coins.'); return; }
      const pa = D.punks.find(p => p.id === a.value), pb = D.punks.find(p => p.id === b.value);
      D.coins -= PR.PAIR_COST;
      const foal = PR.pair(PR.rng(Date.now() & 0xffffff), pa, pb);
      D.punks.push(foal); save();
      toast(foal.name + ' has sprouted!'); stable();
    }, 'small primary', D.coins < PR.PAIR_COST)]);
  }
  function freshFoals() {
    const r = PR.rng((D.foalSeed || 1) * 7919 + 13);
    D.foals = [0, 1, 2].map(g => PR.newPunk(r, { grade: g }));
  }
  function market() {
    if (!D.foals) { freshFoals(); save(); }
    const full = D.punks.length >= PR.MAX_PUNKS;
    const pens = ['A plain pen', 'A good pen', 'The fine pen'];
    const list = el('div', { cls: 'list' }, D.foals.map((p, i) => p ? el('div', { cls: 'card punk' }, [
      portrait(p, 96),
      el('div', { cls: 'grow' }, [
        el('div', { cls: 'pname', text: p.name }),
        el('div', { cls: 'muted small', text: pens[i] + ' · ' + PR.COATS[p.coat].name + ' · can grow to ' + p.pot }),
        statBars(p),
        btn('Buy · ' + PR.FOAL_PRICE[i], () => {
          if (D.coins < PR.FOAL_PRICE[i]) { toast('Not enough coins.'); return; }
          D.coins -= PR.FOAL_PRICE[i]; D.punks.push(p); D.foals[i] = null; save();
          toast(p.name + ' is yours.'); market();
        }, 'primary small', full || D.coins < PR.FOAL_PRICE[i]),
      ]),
    ]) : el('div', { cls: 'card muted', text: 'Sold. New foals come in after your next race.' })));
    screen('Foal Market', [el('p', { cls: 'muted', text: full ? 'Your stable is full: sell a Punk first.' : 'Foals start small. What matters is what they can grow to.' }), list], menu);
  }
  function records() {
    const t = el('table', { cls: 'tbl' }, [el('tr', {}, ['Track', 'Where', 'Par', 'Your best', ''].map(h => el('th', { text: h })))].concat(PR.TRACKS.map(tr => {
      const r = D.records[tr.id];
      return el('tr', {}, [el('td', { text: tr.name }), el('td', { cls: 'muted small', text: tr.where }), el('td', { text: fmt(tr.par) }), el('td', { text: r ? fmt(r.time) + ' (' + r.punk + ')' : '—' }), el('td', { text: r ? medal(r.time, tr) : '' })]);
    })));
    screen('Records', [el('div', { cls: 'card' }, [t]), el('p', { cls: 'muted small', text: D.races + ' races run · ' + D.wins + ' won · bets: ' + D.bets.won + ' won, ' + D.bets.lost + ' lost' })], menu);
  }

  /* ================= which tracks you have reached ================= */
  function reached() {
    const ok = new Set(PR.CUPS[0].tracks);
    PR.CUPS.forEach(c => { if (!c.needs || (D.cups[c.needs] && D.cups[c.needs].won)) c.tracks.forEach(t => ok.add(t)); });
    return PR.TRACKS.filter(t => ok.has(t.id));
  }
  function pickTrack(kind) {
    const have = reached();
    const list = el('div', { cls: 'list' }, PR.TRACKS.map(tr => {
      const open = have.indexOf(tr) >= 0, r = D.records[tr.id];
      return el('button', { cls: 'card trackrow', type: 'button', disabled: open ? null : 'disabled', onclick: () => kind === 'quick' ? quickRace(tr) : timeTrial(tr) }, [
        el('div', { cls: 'tswatch ' + tr.theme }),
        el('div', { cls: 'grow' }, [el('div', { cls: 'pname', text: tr.name + (open ? '' : ' 🔒') }), el('div', { cls: 'muted small', text: tr.where }), el('div', { cls: 'small', text: open ? tr.blurb : 'Win the cup before to race here.' })]),
        el('div', { cls: 'small right', html: kind === 'trial' ? 'Par ' + fmt(tr.par) + '<br>' + (r ? 'Best ' + fmt(r.time) + ' ' + medal(r.time, tr) : '') : 'Purse ' + Math.round(tr.purse / 2) }),
      ]);
    }));
    screen(kind === 'quick' ? 'Quick Race' : 'Time Trial', [list], menu);
  }

  /* ================= rivals ================= */
  function rivalsFor(track, level, n, seed) {
    const r = PR.rng(seed);
    const pool = PR.RIVALS.slice();
    const out = [];
    for (let i = 0; i < n; i++) {
      const riv = pool.splice(Math.floor(r() * pool.length), 1)[0];
      out.push({ id: riv.id, name: riv.punk, rider: riv.rider, coat: riv.coat, hat: riv.hat, style: riv.style, ai: true,
        skill: Math.min(1, 0.15 + level * 0.75 + (r() - 0.5) * 0.15), stats: PR.rivalStats(riv, level, r) });
    }
    return out;
  }
  const mine = () => { const p = me(); return { id: 'me', name: p.name, rider: riderName(), coat: p.coat, hat: D.hat, stats: Object.assign({}, p.stats), ai: false }; };

  /* ================= cups ================= */
  function cups() {
    const list = el('div', { cls: 'list' }, PR.CUPS.map(c => {
      const open = !c.needs || (D.cups[c.needs] && D.cups[c.needs].won), rec = D.cups[c.id];
      const running = D.cupRun && D.cupRun.id === c.id;
      return el('div', { cls: 'card' }, [
        el('div', { cls: 'pname', text: c.name + (open ? '' : ' 🔒') + (rec && rec.won ? ' 🏆' : '') }),
        el('div', { cls: 'muted small', text: c.tracks.map(t => PR.track(t).name).join(' → ') }),
        el('div', { cls: 'small', text: 'Entry ' + c.fee + ' · the winner takes ' + c.prize + (rec ? ' · your best: ' + place(rec.best) : '') }),
        open ? el('div', { cls: 'row' }, [
          running ? btn('Carry on (race ' + (D.cupRun.i + 1) + ' of 3)', () => cupNext(), 'primary small') : btn('Enter · ' + c.fee, () => cupStart(c), 'primary small', D.coins < c.fee || (D.cupRun && !running)),
          running ? btn('Give it up', () => { if (confirm('Give up this cup? The entry is not given back.')) { D.cupRun = null; save(); cups(); } }, 'small danger') : null,
        ]) : el('div', { cls: 'muted small', text: 'Win the ' + PR.cup(c.needs).name + ' first.' }),
      ]);
    }));
    screen('Cup Races', [D.cupRun ? el('p', { cls: 'muted', text: 'You are in the middle of the ' + PR.cup(D.cupRun.id).name + '.' }) : null, list], menu);
  }
  function cupStart(c) {
    if (D.coins < c.fee) return;
    D.coins -= c.fee;
    const seed = Date.now() & 0xfffff;
    const riv = rivalsFor(null, c.rival, 3, seed);
    D.cupRun = { id: c.id, i: 0, seed, rivals: riv, points: { me: 0 }, results: [] };
    riv.forEach(r => { D.cupRun.points[r.id] = 0; });
    save(); cupNext();
  }
  function cupTable(run) {
    const names = { me: me().name + ' (' + riderName() + ')' };
    run.rivals.forEach(r => { names[r.id] = r.name + ' (' + r.rider + ')'; });
    const rows = Object.keys(run.points).sort((a, b) => run.points[b] - run.points[a]);
    return el('table', { cls: 'tbl' }, [el('tr', {}, ['', 'Punk (rider)', 'Points'].concat(run.results.map((_, i) => 'R' + (i + 1))).map(h => el('th', { text: h })))].concat(rows.map((id, i) =>
      el('tr', { cls: id === 'me' ? 'mine' : '' }, [el('td', { text: i + 1 }), el('td', { text: names[id] }), el('td', { text: run.points[id] })].concat(run.results.map(res => el('td', { text: res[id] ? place(res[id]) : '' })))))));
  }
  function cupNext() {
    const run = D.cupRun, c = PR.cup(run.id);
    if (run.i >= 3) return cupEnd();
    const tr = PR.track(c.tracks[run.i]);
    const back = { amt: 0 };
    const entrants = [mine()].concat(run.rivals);
    const odds = PR.odds(entrants.map(e => PR.rating(e.stats, e.ai ? e.skill : 0.6)));
    const betRow = el('div', { cls: 'row' }, [el('span', { text: 'Back yourself to win at ' + odds[0] + ' to 1: ' })].concat([0, 10, 25, 50, 100].map(a => {
      const b = el('button', { cls: 'btn small' + (a === 0 ? ' on' : ''), type: 'button', disabled: a > D.coins ? 'disabled' : null, onclick: () => { back.amt = a; Array.from(betRow.querySelectorAll('.btn')).forEach(x => x.classList.remove('on')); b.classList.add('on'); } }, [a ? String(a) : 'No bet']);
      return b;
    })));
    screen(c.name + ' · race ' + (run.i + 1) + ' of 3', [
      el('div', { cls: 'card' }, [el('div', { cls: 'pname', text: tr.name }), el('div', { cls: 'muted small', text: tr.where }), el('p', { text: tr.blurb })]),
      el('div', { cls: 'card' }, [cupTable(run)]),
      el('div', { cls: 'card' }, [betRow]),
      el('div', { cls: 'row center' }, [btn('Ride! 🏁', () => {
        if (back.amt) D.coins -= back.amt;
        save();
        startRace({ track: tr, entrants, kind: 'cup', bet: back.amt ? { on: 'me', amt: back.amt, odds: odds[0] } : null, done: res => {
          const pts = {};
          res.order.forEach((u, i) => { run.points[u.id] = (run.points[u.id] || 0) + (PR.POINTS[i] || 0); pts[u.id] = i + 1; });
          run.results.push(pts); run.i++;
        } });
      }, 'primary big')]),
    ], cups);
  }
  function cupEnd() {
    const run = D.cupRun, c = PR.cup(run.id);
    const rows = Object.keys(run.points).sort((a, b) => run.points[b] - run.points[a]);
    const pos = rows.indexOf('me') + 1;
    const rec = D.cups[c.id] = D.cups[c.id] || { best: 9, won: false };
    rec.best = Math.min(rec.best, pos);
    let line;
    if (pos === 1) {
      const first = !rec.won;
      rec.won = true; D.coins += c.prize;
      line = 'You win the ' + c.name + '! ' + c.prize + ' coins.' + (first ? ' New tracks are open.' : '');
      SFX.finish();
    } else line = 'You finish the cup ' + place(pos) + '.';
    const table = cupTable(run);
    D.cupRun = null; save();
    screen(c.name + ' · final standings', [el('div', { cls: 'card center' }, [el('div', { cls: 'big', text: pos === 1 ? '🏆' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '🌱' }), el('p', { text: line })]), el('div', { cls: 'card' }, [table]), el('div', { cls: 'row center' }, [btn('Back to the cups', cups, 'primary')])], menu);
  }

  /* ================= quick race and time trial ================= */
  function quickRace(tr) {
    const lvl = 0.12 + PR.TRACKS.indexOf(tr) * 0.11;
    const entrants = [mine()].concat(rivalsFor(tr, lvl, 3, Date.now() & 0xfffff));
    startRace({ track: tr, entrants, kind: 'quick' });
  }
  function timeTrial(tr) {
    const rec = D.records[tr.id];
    startRace({ track: tr, entrants: [mine()], kind: 'trial', ghost: rec && rec.ghost });
  }

  /* ================= watch and bet ================= */
  function watchBet() {
    const have = reached();
    const tr = have[Math.floor(Math.random() * have.length)];
    const lvl = 0.3 + Math.random() * 0.6;
    const entrants = rivalsFor(tr, lvl, 4, Date.now() & 0xfffff);
    const odds = PR.odds(entrants.map(e => PR.rating(e.stats, e.skill)));
    const pick = { i: -1, amt: 25 };
    const runners = el('div', { cls: 'list' });
    const draw = () => {
      runners.innerHTML = '';
      entrants.forEach((e, i) => runners.appendChild(el('button', { cls: 'card punk betrow' + (pick.i === i ? ' active' : ''), type: 'button', onclick: () => { pick.i = i; draw(); } }, [
        portrait({ coat: e.coat }, 64),
        el('div', { cls: 'grow' }, [el('div', { cls: 'pname', text: e.name }), el('div', { cls: 'muted small', text: 'ridden by ' + e.rider + ' · rides ' + e.style }), statBars(e)]),
        el('div', { cls: 'odds', text: odds[i] + ' : 1' }),
      ])));
    };
    draw();
    const amts = el('div', { cls: 'row' }, [el('span', { text: 'Stake: ' })].concat([10, 25, 50, 100, 250].map(a => {
      const b = el('button', { cls: 'btn small' + (a === pick.amt ? ' on' : ''), type: 'button', disabled: a > D.coins ? 'disabled' : null, onclick: () => { pick.amt = a; Array.from(amts.querySelectorAll('.btn')).forEach(x => x.classList.remove('on')); b.classList.add('on'); } }, [String(a)]);
      return b;
    })));
    screen('Watch & Bet', [
      el('div', { cls: 'card' }, [el('div', { cls: 'pname', text: tr.name }), el('div', { cls: 'muted small', text: tr.where + ' · the odds are the bookmaker’s, and the bookmaker keeps a little' })]),
      runners, amts,
      el('div', { cls: 'row center' }, [
        btn('Place the bet and watch', () => {
          if (pick.i < 0) { toast('Pick a runner first.'); return; }
          if (D.coins < pick.amt) { toast('Not enough coins.'); return; }
          D.coins -= pick.amt; save();
          startRace({ track: tr, entrants, kind: 'watch', bet: { on: entrants[pick.i].id, amt: pick.amt, odds: odds[pick.i] } });
        }, 'primary big'),
        btn('Another race', watchBet),
      ]),
    ], menu);
  }

  /* ================= the race screen ================= */
  let R = null;              // the race being run, with its extras
  const input = { hold: false, jump: false, boost: false, trick: false };
  const keys = {};

  function startRace(o) {
    ui.classList.add('hidden');
    document.body.classList.add('racing');
    $('hud').classList.remove('hidden');
    $('touch').classList.toggle('hidden', !touchy || o.kind === 'watch');
    const race = PR.makeRace(o.track, o.entrants, { seed: (Date.now() ^ (o.track.seed * 7919)) & 0xffffff });
    A.indexCourse(race.course);
    A.parts.length = 0;
    const focus = race.runners.find(u => !u.ai) || race.runners[0];
    A.resetCamera(focus);
    R = Object.assign({ race, focus, lastCount: 4, endAt: 0, speed: o.kind === 'watch' ? 1.4 : 1, paused: false }, o);
    input.hold = input.jump = input.boost = input.trick = false;
    $('skip').classList.toggle('hidden', o.kind !== 'watch');
    const md = race.course.mood;
    $('hudTrack').textContent = o.track.name + ' · ' + ({ dawn: 'dawn', day: 'midday', dusk: 'dusk', night: 'night' })[md.time] + (md.weather === 'rain' ? ', rain' : md.weather === 'wind' ? (md.wind > 0 ? ', a tailwind' : ', a headwind') : '');
    resize();
  }
  function endRace() {
    const race = R.race, o = R;
    const meU = race.runners.find(u => u.id === 'me');
    document.body.classList.remove('racing');
    $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
    R = null;
    const lines = [];
    let purse = 0;
    if (o.kind !== 'watch' && meU) {
      const p = me();
      p.races++; D.races++;
      if (o.kind !== 'trial') {
        const share = [1, 0.5, 0.25, 0.1][meU.place - 1] || 0;
        purse = Math.round(o.track.purse * (o.kind === 'quick' ? 0.5 : 1) * share);
        if (meU.place === 1) { p.wins++; D.wins++; }
        D.coins += purse;
        lines.push('You came ' + place(meU.place) + ' in ' + fmt(meU.time) + (purse ? ': ' + purse + ' coins.' : '.'));
      } else lines.push('Your time: ' + fmt(meU.time) + ' ' + medal(meU.time, o.track));
      /* a record keeps its ghost */
      const rec = D.records[o.track.id];
      if (!rec || meU.time < rec.time) {
        D.records[o.track.id] = { time: Math.round(meU.time * 100) / 100, punk: p.name, at: Date.now(), ghost: race.record.slice(0, 12000) };
        lines.push(rec ? 'A new record for ' + o.track.name + '! (was ' + fmt(rec.time) + ')' : 'Your first time on ' + o.track.name + ' is on the board.');
      }
      lines.push(meU.clean + ' clean releases · ' + meU.swings + ' swings' + (meU.flips ? ' · ' + meU.flips + ' flips (best combo ' + meU.bestCombo + ')' : '') + (meU.snaps ? ' · ' + meU.snaps + ' snapped branches' : '') + (meU.falls ? ' · ' + meU.falls + ' falls' : '') + ' · top speed ' + Math.round(meU.best / 40 * 3.6) + ' km/h');
    }
    if (o.bet) {
      const win = race.order[0] && race.order[0].id === o.bet.on;
      if (win) { const pay = Math.round(o.bet.amt * o.bet.odds); D.coins += pay; D.bets.won++; lines.push('Your bet came in! ' + pay + ' coins.'); }
      else { D.bets.lost++; lines.push('Your bet is lost (' + o.bet.amt + ' coins).'); }
    }
    if (o.done) o.done(race);
    /* new foals after every race */
    D.foalSeed = (D.foalSeed || 1) + 1; D.foals = null;
    save();
    const table = el('table', { cls: 'tbl' }, [el('tr', {}, ['', 'Punk', 'Rider', 'Time'].map(h => el('th', { text: h })))].concat(race.order.map(u =>
      el('tr', { cls: u.id === 'me' ? 'mine' : '' }, [el('td', { text: place(u.place) }), el('td', { text: u.name }), el('td', { text: u.rider }), el('td', { text: fmt(u.time) })]))));
    const again = o.kind === 'cup' ? btn(D.cupRun && D.cupRun.i >= 3 ? 'The final standings' : 'Next race', cupNext, 'primary') :
      o.kind === 'quick' ? btn('Race again', () => quickRace(o.track), 'primary') :
      o.kind === 'trial' ? btn('Try again', () => timeTrial(o.track), 'primary') : btn('Another race', watchBet, 'primary');
    screen(o.track.name + ' · results', [el('div', { cls: 'card' }, lines.map(l => el('p', { text: l }))), el('div', { cls: 'card' }, [table]), el('div', { cls: 'row center' }, [again, btn('Menu', menu)])], menu);
  }

  /* the controls */
  const touchy = matchMedia('(pointer: coarse)').matches;
  const isVineKey = k => k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W';
  const isBoostKey = k => k === 'Shift' || k === 'x' || k === 'X' || k === 'ArrowRight';
  const isTrickKey = k => k === 'ArrowDown' || k === 's' || k === 'S' || k === 'c' || k === 'C';
  window.addEventListener('keydown', e => {
    if (!R) return;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { togglePause(); return; }
    if (isVineKey(e.key)) { keys.vine = true; e.preventDefault(); }
    if (isBoostKey(e.key) && !e.repeat) { input.boost = true; e.preventDefault(); }
    if (isTrickKey(e.key) && !e.repeat) { input.trick = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', e => { if (isVineKey(e.key)) keys.vine = false; });
  let pointerVine = false;
  cv.addEventListener('pointerdown', e => { if (!R) return; pointerVine = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); e.preventDefault(); });
  const up = () => { pointerVine = false; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  $('boostBtn').addEventListener('pointerdown', e => { input.boost = true; e.preventDefault(); e.stopPropagation(); });
  $('trickBtn').addEventListener('pointerdown', e => { input.trick = true; e.preventDefault(); e.stopPropagation(); });
  $('pause').addEventListener('click', () => togglePause());
  $('skip').addEventListener('click', () => { if (R) { PR.settle(R.race); } });
  window.addEventListener('blur', () => { keys.vine = false; pointerVine = false; if (R && R.kind !== 'watch' && R.race.t > 0 && !R.race.done) setPause(true); });
  function setPause(v) { if (!R) return; R.paused = v; $('pausebox').classList.toggle('hidden', !v); }
  function togglePause() { setPause(!R.paused); }
  $('resume').addEventListener('click', () => setPause(false));
  $('quit').addEventListener('click', () => { if (!R) return; const o = R; R = null; document.body.classList.remove('racing'); $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('pausebox').classList.add('hidden'); if (o.bet) { D.bets.lost++; save(); } if (o.kind === 'cup') cupNext(); else menu(); });

  /* the loop */
  let last = performance.now();
  const perf = [];
  try { A.lowFx = localStorage.getItem('pr-lowfx') === '1'; } catch (e) { /* ignore */ }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!R) return;
    /* a slow device gets the lighter picture (no light shafts, grading or foreground) */
    perf.push(dt); if (perf.length > 90) perf.shift();
    if (perf.length === 90 && !A.lowFx) { const avg = perf.reduce((a, b) => a + b, 0) / 90; if (avg > 0.026) { A.lowFx = true; try { localStorage.setItem('pr-lowfx', '1'); } catch (e) { /* ignore */ } } }
    const race = R.race;
    if (!R.paused) {
      input.hold = !!(keys.vine || pointerVine);
      PR.tick(race, dt * R.speed, input);
      /* in a watched race, follow whoever leads */
      if (R.kind === 'watch') R.focus = PR.standings(race)[0];
      race.runners.forEach(u => {
        if (!u.events.length) return;
        u.events.forEach(ev => {
          A.event(ev, A.THEMES[race.track.theme]);
          if (u === R.focus || u.id === 'me') {
            if (ev.t === 'vine') SFX.vine(); else if (ev.t === 'clean') SFX.clean(); else if (ev.t === 'boost') SFX.boost();
            else if (ev.t === 'fruit') SFX.fruit(); else if (ev.t === 'splash') SFX.splash(); else if (ev.t === 'fall') SFX.fall();
            else if (ev.t === 'finish') SFX.finish();
            else if (ev.t === 'trick') { SFX.trick(ev.combo); pop(ev.combo > 1 ? 'Flip! ×' + ev.combo : 'Flip!', '#a8f0ff'); }
            else if (ev.t === 'botch') { SFX.fall(); pop('Botched!', '#ff9a8a'); }
            else if (ev.t === 'snap') { SFX.snap(); pop('Snap!', '#ffc890'); }
            else if (ev.t === 'clean') pop('Clean!', '#fff3a0', true);
            else if (ev.t === 'bump') SFX.bump();
          }
        });
        u.events.length = 0;
      });
      A.stepParts(dt);
      const c = Math.ceil(-race.t);
      if (race.t < 0 && c !== R.lastCount && c > 0) { R.lastCount = c; SFX.count(); }
      if (race.t >= 0 && R.lastCount > 0) { R.lastCount = 0; SFX.go(); }
      /* once you are home, the others get a few seconds, then everyone is timed */
      const meU = race.runners.find(u => u.id === 'me');
      if (meU && meU.finished && !race.done && race.t > meU.time + 4) PR.settle(race);
      if (race.done && !R.endAt) R.endAt = now + 1600;
      if (R.endAt && now > R.endAt) { endRace(); return; }
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    A.draw(ctx, W, H, race, R.focus, now / 1000, { aim: R.kind !== 'watch', ghost: R.kind === 'trial' ? R.ghost : null });
    hud(race, now / 1000);
  }
  /* little words that pop up over the race */
  function pop(text, col, small) {
    if (!R || R.kind === 'watch') return;
    const p = el('div', { cls: 'pop' + (small ? ' small' : ''), text });
    p.style.color = col; $('hud').appendChild(p);
    setTimeout(() => p.remove(), 1100);
  }
  function hud(race, now) {
    const st = PR.standings(race), f = R.focus;
    const pos = st.indexOf(f) + 1;
    $('hudPlace').textContent = race.runners.length > 1 ? place(pos) + ' of ' + race.runners.length : 'Time trial';
    $('hudTime').textContent = Math.max(0, race.t).toFixed(1) + ' s';
    $('hudSpeed').textContent = Math.round(Math.hypot(f.vx, f.vy) / 40 * 3.6) + ' km/h';
    const bm = $('boostFill'); bm.style.width = Math.round(f.boost * 100) + '%';
    $('boostBar').classList.toggle('full', f.boost >= 0.999);
    $('boostBtn').classList.toggle('ready', f.boost >= 0.999);
    /* the progress line */
    const prog = $('prog');
    if (prog.children.length !== race.runners.length) {
      prog.innerHTML = '';
      race.runners.forEach(u => prog.appendChild(el('i', { style: 'background:' + PR.COATS[u.coat].rind + (u.id === 'me' ? ';box-shadow:0 0 0 2px #fff' : '') })));
    }
    race.runners.forEach((u, i) => { prog.children[i].style.left = (Math.min(1, u.x / race.course.finish) * 100) + '%'; });
    let msg = '';
    if (race.t < 0) msg = String(Math.ceil(-race.t));
    else if (race.t < 0.8) msg = 'GO!';
    else if (f.climb > 0) msg = 'Climbing out…';
    else if (f.finished) msg = place(f.place || pos) + '!';
    const m = $('hudMsg'); m.textContent = msg; m.classList.toggle('hidden', !msg);
    const tip = $('hudTip');
    $('draft').classList.toggle('hidden', !f.draft || R.kind === 'watch');
    if (R.kind !== 'watch' && race.t >= 0 && race.t < 7 && D.races < 4) { tip.classList.remove('hidden'); tip.textContent = touchy ? 'Hold anywhere to catch a branch, let go to fly. ↻ flips in the air.' : 'Hold Space to catch a branch, let go to fly. ↓ flips in the air, Shift boosts.'; }
    else tip.classList.add('hidden');
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  window.addEventListener('resize', resize);

  /* ================= boot ================= */
  resize();
  requestAnimationFrame(frame);
  ui.appendChild(el('p', { cls: 'center muted', text: 'Saddling up…' }));
  SAVE.ready.then(d => {
    D = d;
    if (SAVE.banned) { screen('Punk Races', [el('div', { cls: 'card', text: SAVE.banned })]); return; }
    if (!D.punks || !D.punks.length) { const b = blank(); D.punks = b.punks; D.active = b.active; }
    menu();
  });
  window.PR_GAME = { get D() { return D; }, get R() { return R; }, menu, startRace, quickRace, timeTrial };
})();
