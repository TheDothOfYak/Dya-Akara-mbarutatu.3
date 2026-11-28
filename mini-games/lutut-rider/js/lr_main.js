// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   LÚTUT RIDER — js/lr_main.js
   The game around a ride: the roost (regions, your Lútut, their
   upgrades, feats), the ride screen (the loop, the two pedals, the
   HUD, the first-ride tips), the pay at the end, sounds and saving.
   ============================================================ */
(function () {
  'use strict';
  const LR = window.LR;
  /* the look of the ride: 'storybook' (Four Brothers: Tuftwood's painting) or 'pixel' (the 4 Brothers Worlds) */
  let A = LR.art;
  function setLook(k) {
    if (!LR.looks || !LR.looks[k]) k = 'pixel';
    A = LR.art = LR.looks[k];
    document.body.classList.toggle('storybook', k === 'storybook');
  }
  const $ = id => document.getElementById(id);
  const cv = $('world'), ctx = cv.getContext('2d'), ui = $('ui');
  let W = 0, H = 0, DPR = 1;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en');

  /* ================= the save ================= */
  function blank() {
    return { v: 1, teeth: 0, pick: 'young', stage: 'downs', kinds: { young: { wings: 0, gullet: 0, tail: 0, saddle: 0 } }, stages: { downs: true },
      best: {}, medals: {}, feats: {}, tamed: {}, look: 'storybook', sound: true, rides: 0, tipsDone: false,
      stats: { runs: 0, dist: 0, eatenAll: 0, eaten: {}, smashed: 0, clean: 0, loops: 0, airMax: 0, skimMax: 0, teethAll: 0 } };
  }
  const SAVE = window.FLAKE_MINI.open('lr', blank);
  let D = blank();
  const save = () => { D.bestAll = Math.max(0, ...Object.values(D.best)); SAVE.save(); };

  /* ================= sounds ================= */
  let AC = null, windNode = null;
  function ac() { if (!D.sound) return null; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; }
  function tone(f, d, type, vol, slide) {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, a.currentTime + d);
    g.gain.value = vol || 0.05; g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + d);
  }
  function noise(d, vol, freq, q) {
    const a = ac(); if (!a) return;
    const b = a.createBuffer(1, Math.floor(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq || 800; f.Q.value = q || 1; g.gain.value = vol || 0.1;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  function windSound(level) {
    const a = ac();
    if (!a) { if (windNode) windNode.g.gain.value = 0; return; }
    if (!windNode) {
      const b = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = b; s.loop = true; f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(a.destination); s.start(); windNode = { g, f };
    }
    windNode.g.gain.setTargetAtTime(level * 0.06, a.currentTime, 0.2);
    windNode.f.frequency.setTargetAtTime(300 + level * 900, a.currentTime, 0.2);
  }
  const SND = {
    beat: () => noise(0.18, 0.09, 260, 0.8),
    tooth: () => tone(1320, 0.12, 'triangle', 0.035, 1760),
    prey: () => { tone(420, 0.35, 'sawtooth', 0.04, 90); noise(0.3, 0.05, 500, 2); },
    sting: () => tone(1600, 0.25, 'square', 0.02, 2400),
    smash: () => { noise(0.35, 0.22, 400, 0.6); tone(90, 0.3, 'square', 0.05, 40); },
    crack: () => { noise(0.12, 0.25, 3200, 4); tone(2400, 0.08, 'square', 0.03, 1200); },
    thud: v => noise(0.2, Math.min(0.25, 0.04 + v * 0.015), 140, 0.7),
    trick: () => { tone(660, 0.12, 'triangle', 0.04); setTimeout(() => tone(990, 0.16, 'triangle', 0.04), 90); },
    screech: () => { tone(900, 0.7, 'sawtooth', 0.035, 2200); tone(1350, 0.6, 'sawtooth', 0.02, 2900); },
    end: () => tone(300, 0.8, 'sine', 0.06, 90),
    buy: () => { tone(880, 0.1, 'triangle', 0.05); setTimeout(() => tone(1320, 0.18, 'triangle', 0.05), 80); },
  };

  /* ================= the screen ================= */
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  window.addEventListener('resize', resize); resize();

  /* ================= input: two pedals ================= */
  const keys = { beat: false, tuck: false };
  const KEY_BEAT = ['ArrowRight', 'KeyD', 'ArrowUp', 'KeyW', 'Space'], KEY_TUCK = ['ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS'];
  window.addEventListener('keydown', e => {
    if (mode !== 'ride') { if (mode === 'results' && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); startRide(); } return; }
    if (KEY_BEAT.includes(e.code)) { keys.beat = true; e.preventDefault(); }
    if (KEY_TUCK.includes(e.code)) { keys.tuck = true; e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  });
  window.addEventListener('keyup', e => {
    if (KEY_BEAT.includes(e.code)) keys.beat = false;
    if (KEY_TUCK.includes(e.code)) keys.tuck = false;
  });
  const pedal = { beat: 0, tuck: 0 };
  function bindPedal(el, which) {
    const down = e => { e.preventDefault(); pedal[which]++; el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } ac(); };
    const up = e => { e.preventDefault(); pedal[which] = Math.max(0, pedal[which] - 1); if (!pedal[which]) el.classList.remove('down'); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  bindPedal($('pBeat'), 'beat'); bindPedal($('pTuck'), 'tuck');
  const input = () => LR.main.auto && run ? LR.autopilot(run) : ({ beat: keys.beat || pedal.beat > 0, tuck: keys.tuck || pedal.tuck > 0 });

  /* ================= the ride ================= */
  let mode = 'roost', run = null, view = A.makeView(), anim = { t: 0 }, evAt = 0, paused = false, acc = 0, last = 0, resultsShown = false;
  let demo = null, lastBeatT = 0, tipI = 0, tipT = 0;
  function newDemo() { demo = LR.makeRun({ stage: D.stage, kind: D.pick, up: D.kinds[D.pick] }); view = A.makeView(); A.follow(view, demo, W, H, 0, true); A.fx = []; A.popText = []; }

  function startRide() {
    if (SAVE.banned) return;
    if (!D.tamed[D.pick]) { toRoost(); return; }
    ac();
    run = LR.makeRun({ stage: D.stage, kind: D.pick, up: D.kinds[D.pick], best: D.best[D.stage] || 0 });
    view = A.makeView(); A.follow(view, run, W, H, 0, true); anim = { t: 0 }; evAt = 0; acc = 0; paused = false; resultsShown = false;
    A.fx = []; A.popText = []; tipI = 0; tipT = 0;
    keys.beat = keys.tuck = false;
    mode = 'ride';
    ui.classList.add('hidden'); $('results').classList.add('hidden'); $('pausebox').classList.add('hidden');
    $('hud').classList.remove('hidden'); $('pedals').classList.remove('hidden');
    document.body.classList.add('riding');
    buildHud();
    setTimeout(() => SND.screech(), 250);
  }
  function togglePause(force) {
    if (mode !== 'ride' || (run && run.over)) return;
    paused = force != null ? force : !paused;
    $('pausebox').classList.toggle('hidden', !paused);
    $('sndBtn').textContent = D.sound ? '🔊 Sound on' : '🔇 Sound off';
    if (!paused) last = performance.now();
  }
  $('pauseBtn').onclick = () => togglePause(true);
  $('resume').onclick = () => togglePause(false);
  $('homeBtn').onclick = () => { paused = false; $('pausebox').classList.add('hidden'); if (run && !run.over) { run.over = 'quit'; run.overT = 2; run.ev.push({ k: 'end', text: LR.ENDS.quit, t: run.t }); } };
  $('sndBtn').onclick = () => { D.sound = !D.sound; save(); $('sndBtn').textContent = D.sound ? '🔊 Sound on' : '🔇 Sound off'; if (!D.sound) windSound(0); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'ride') togglePause(true); });

  /* the first rides teach the two pedals */
  const TIPS = [
    { text: 'Hold <b>BEAT</b> (→ or D) to run down the ledge and take off', done: r => r.x > 30 },
    { text: 'Let go to <b>glide</b>. Beating costs meat from the gullet', done: r => r.t > 9 },
    { text: 'Hold <b>TUCK</b> (← or A) to fold the wings and dive for speed', done: r => r.t > 15 },
    { text: 'Fly into prey to suck it in. Meat is what keeps you flying', done: r => r.eaten > 0 || r.t > 24 },
    { text: 'Land along the slope. Nose up and the tail strikes first and cracks', done: r => r.t > 32 },
  ];

  /* what happened in the sim this frame: pops, sounds, bits flying */
  function handleEvents() {
    while (evAt < run.ev.length) {
      const e = run.ev[evAt++], P = LR.points(run);
      if (e.k === 'tooth') { SND.tooth(); continue; }
      if (e.k === 'prey') {
        SND.prey(); if (/stung/.test(e.text)) { SND.sting(); }
        A.burst(/Byrd/.test(e.text) ? 'feather' : 'dot', P.head[0], P.head[1], 10, { col: /Byrd/.test(e.text) ? '#e0d8e8' : '#a83a3a', speed: 3, g: 0.2, life: 0.7 });
        A.pop('+' + e.teeth + ' 🦷  ' + e.text, P.head[0], P.head[1] + 2, '#ffd0c0');
      } else if (e.k === 'smash') {
        SND.smash(); view.shake = 0.6;
        A.burst('shard', P.head[0] + 1, P.head[1], 18, { col: '#8a8272', speed: 9, dir: 0.4, spread: 2.2, size: 0.3, life: 1.4 });
        A.pop(e.text + ' +' + e.teeth + ' 🦷', P.head[0], P.head[1] + 3, '#ffe2a0');
      } else if (e.k === 'crack') {
        SND.crack(); view.shake = 0.8;
        A.burst('shard', P.tail[0], P.tail[1], 10, { col: '#e8e0ff', speed: 5, size: 0.15, life: 0.8 });
        A.pop(e.text, P.tail[0], P.tail[1] + 3, '#ff9a8a'); flash('#hTail');
      } else if (e.k === 'end') {
        SND.end(); view.shake = 1;
        if (run.over === 'shattered') A.burst('shard', P.tail[0], P.tail[1], 30, { col: '#d8d0e8', speed: 10, size: 0.25, life: 1.6 });
        if (run.over === 'sank') A.burst('dot', run.x, run.y, 30, { col: '#8ab0d0', speed: 8, life: 1.2 });
        if (run.over === 'thrown') A.burst('dust', run.x, run.y - run.r, 14, { col: '#c8b89a', speed: 4, life: 1, g: 0 });
      } else if (e.k === 'stone') { A.pop(e.text, run.x + 6, run.y + 5, '#d8e8ff'); }
      else if (e.k === 'best') { SND.trick(); banner('New best!'); }
      else if (e.k === 'bonk') { SND.thud(4); view.shake = 0.3; }
      else if (e.k === 'slow') { A.pop(e.text, run.x, run.y + 4, '#ffd0a0'); }
      else if (e.k === 'plough') { SND.thud(8); view.shake = 0.4; A.burst('dust', P.head[0], run.land.h(P.head[0]), 12, { col: '#a89070', speed: 4, g: 0, life: 0.9 }); }
      else { // tricks: clean landings, air, loops, skims
        SND.trick();
        A.pop(e.text + (e.teeth ? ' +' + e.teeth + ' 🦷' : ''), run.x, run.y + 4, '#fff2c0');
        if (e.k === 'clean') A.burst('dust', run.x, run.y - run.r, 8, { col: '#d8c8a8', speed: 3, g: 0, life: 0.8 });
      }
    }
  }
  /* a landing: dust and a thud, sized by how hard */
  let wasGrounded = true;
  function landingFx(prevVy) {
    if (run.grounded && !wasGrounded && prevVy < -4) {
      SND.thud(-prevVy); view.shake = Math.max(view.shake, Math.min(0.7, -prevVy * 0.04));
      A.burst('dust', run.x, run.y - run.r, 6 + Math.min(16, -prevVy), { col: '#c8b89a', speed: 2 - prevVy * 0.2, g: 0, life: 0.9, dir: Math.PI / 2, spread: 3 });
    }
    wasGrounded = run.grounded;
  }

  /* ================= the HUD ================= */
  function buildHud() {
    const st = run.st;
    $('hTail').innerHTML = Array.from({ length: st.cracks }, (_, i) => '<i data-i="' + i + '"></i>').join('');
    const best = D.best[D.stage] || 0, top = Math.max(LR.MEDALS[LR.MEDALS.length - 1].m, best);
    $('track').innerHTML = LR.MEDALS.map(m => '<b class="mk" style="left:' + (m.m / top * 100) + '%;background:' + m.col + '" title="' + m.name + ' ' + m.m + ' m"></b>').join('') +
      (best > 30 ? '<b class="mk best" style="left:' + (best / top * 100) + '%" title="Best ' + fmt(best) + ' m"></b>' : '') + '<i id="trackMe"></i>';
    $('track').dataset.top = top;
    $('hTip').classList.toggle('hidden', D.tipsDone);
  }
  function flash(sel) { const el = document.querySelector(sel); if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  function banner(text) { const b = $('banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
  function hud() {
    const st = run.st, f = run.hunger / st.gullet;
    $('hMeat').style.width = (f * 100).toFixed(1) + '%';
    $('hMeatBar').classList.toggle('low', f < 0.22);
    $('hMeatTxt').textContent = run.hunger <= 0 ? 'Empty: it can only glide' : Math.ceil(run.hunger) + ' / ' + st.gullet;
    document.querySelectorAll('#hTail i').forEach((el, i) => el.classList.toggle('gone', i >= st.cracks - run.cracks));
    $('hDist').textContent = fmt(run.dist) + ' m';
    const best = D.best[D.stage] || 0;
    $('hBest').textContent = best > 0 ? 'best ' + fmt(Math.max(best, run.dist)) + ' m' : LR.stage(D.stage).name;
    $('hTeeth').textContent = '🦷 ' + fmt(run.teeth);
    const sp = Math.hypot(run.vx, run.vy), hag = Math.max(0, run.y - run.land.h(run.x) - run.r);
    $('hSpeed').textContent = Math.round(sp * 3.6) + ' km/h · ' + Math.round(hag) + ' m up' + (run.numb > 0 ? ' · stung!' : '');
    const me = $('trackMe'); if (me) me.style.left = Math.min(100, run.dist / +$('track').dataset.top * 100) + '%';
    $('pBeat').classList.toggle('off', run.hunger <= 0 || run.numb > 0);
    if (!D.tipsDone && tipI < TIPS.length) {
      const T = TIPS[tipI];
      $('hTip').innerHTML = T.text;
      if (T.done(run)) { tipI++; if (tipI >= TIPS.length) { $('hTip').classList.add('hidden'); } }
    }
  }

  /* ================= the end of a ride: the pay ================= */
  function finishRide() {
    resultsShown = true;
    const R = LR.finish(run), S = D.stats, sid = D.stage;
    const lines = [['Teeth picked up', R.picked], ['Prey', R.prey], ['Tricks and smashes', R.tricks], ['Distance (' + fmt(R.dist) + ' m)', R.distPay]];
    let total = R.total;
    const wasBest = D.best[sid] || 0, newBest = R.dist > wasBest;
    if (newBest) D.best[sid] = R.dist;
    /* medals in this region */
    const medals = [];
    D.medals[sid] = D.medals[sid] || {};
    for (const m of LR.MEDALS) if (R.dist >= m.m && !D.medals[sid][m.id]) { D.medals[sid][m.id] = Date.now(); medals.push(m); lines.push([m.name + ' medal', m.teeth]); total += m.teeth; }
    /* the tally of every ride */
    S.runs++; S.dist += R.dist; S.eatenAll += R.eaten;
    for (const k in run.tally.eaten) S.eaten[k] = (S.eaten[k] || 0) + run.tally.eaten[k];
    S.smashed += run.tally.smashed; S.clean += run.tally.clean; S.loops += run.tally.loops;
    S.airMax = Math.max(S.airMax, run.tally.airMax); S.skimMax = Math.max(S.skimMax, run.tally.skimMax);
    const feats = [];
    for (const f of LR.FEATS) if (!D.feats[f.id] && f.test(S, R)) { D.feats[f.id] = Date.now(); feats.push(f); lines.push(['Feat: ' + f.name, f.teeth]); total += f.teeth; }
    D.teeth += total; S.teethAll += total; D.rides++;
    if (D.rides >= 3) D.tipsDone = true;
    save();
    $('hud').classList.add('hidden'); $('pedals').classList.add('hidden');
    const box = $('results');
    box.innerHTML = '<div class="card res">' +
      '<div class="why">' + esc(run.ev.filter(e => e.k === 'end').map(e => e.text).pop() || '') + '</div>' +
      '<div class="bigdist">' + fmt(R.dist) + ' m</div>' +
      (newBest ? '<div class="newbest">New best in ' + esc(LR.stage(sid).name) + '!</div>' : '<div class="muted small">Best here: ' + fmt(wasBest) + ' m</div>') +
      (medals.length ? '<div class="medals">' + medals.map(m => '<span class="medal" style="--c:' + m.col + '">' + m.name + '</span>').join('') + '</div>' : '') +
      (feats.length ? '<div class="feats">' + feats.map(f => '<div>🏅 <b>' + esc(f.name) + '</b> · ' + esc(f.desc) + '</div>').join('') + '</div>' : '') +
      '<table class="pay">' + lines.map(l => '<tr><td>' + esc(l[0]) + '</td><td>' + fmt(l[1]) + ' 🦷</td></tr>').join('') +
      '<tr class="tot"><td>Total</td><td>' + fmt(total) + ' 🦷</td></tr></table>' +
      '<div class="row center"><button class="btn primary big" id="again" type="button">Ride again</button><button class="btn big" id="toRoost" type="button">Back to the roost</button></div>' +
      '<div class="muted small center">You have ' + fmt(D.teeth) + ' 🦷. Spend them on upgrades in the roost.</div></div>';
    box.classList.remove('hidden');
    $('again').onclick = startRide;
    $('toRoost').onclick = toRoost;
    mode = 'results';
  }
  function toRoost() {
    mode = 'roost'; run = null; document.body.classList.remove('riding');
    $('results').classList.add('hidden'); $('hud').classList.add('hidden'); $('pedals').classList.add('hidden');
    newDemo(); ui.classList.remove('hidden'); roost(); windSound(0);
  }

  /* ================= the taming (3D, js/lr_tame3d.js) ================= */
  function tame(kind) {
    if (mode === 'tame') return;
    mode = 'tame'; ui.classList.add('hidden'); windSound(0); ac();
    const done = res => {
      D.tamed[kind] = true; D.pick = kind; save();
      mode = 'roost'; ui.classList.remove('hidden'); newDemo(); roost();
      if (res && res.why && res.result !== 'tamed' && res.why !== 'skipped') toastMsg('The 3D taming could not start here (' + res.why + '), so your Lútut is ready to ride.');
    };
    import('./lr_tame3d.js')
      .then(T => T.runTame({ kind, host: $('tame'), snd: SND, auto: !!LR.main.autoTame, dt: LR.main.tameDt || 0, expose: st => { LR.main.tameState = st; } }))
      .then(done, e => { console.warn('[tame]', e); $('tame').classList.add('hidden'); done({ result: 'skipped', why: (e && e.message) || 'no 3D' }); });
  }
  function toastMsg(t) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 5000); }

  /* ================= the roost ================= */
  let tab = 'ride';
  function medalDots(sid) {
    const got = D.medals[sid] || {};
    return LR.MEDALS.map(m => '<span class="dot' + (got[m.id] ? ' on' : '') + '" style="--c:' + m.col + '" title="' + m.name + ': ' + m.m + ' m"></span>').join('');
  }
  function roost() {
    const K = LR.KINDS[D.pick], up = D.kinds[D.pick], st = LR.stats(D.pick, up), S = LR.stage(D.stage);
    const who = SAVE.who ? 'Signed in as <b>' + esc(SAVE.who.name) + '</b>' : 'Playing as a guest (this browser keeps your roost)';
    let body = '';
    if (SAVE.banned) body = '<div class="card note"><h3>Not allowed</h3><p>' + esc(SAVE.banned) + '</p></div>';
    else if (!D.tamed.young && !D.rides) body = '<div class="card welcome"><h2>Every rider starts with a wild one</h2>' +
      '<p>A young Lútut has come down in Beuhk Downs. Creep up on it, leap on its back and hold on until it gives in. Then it is yours to ride.</p>' +
      '<canvas id="heroPic" width="300" height="200"></canvas><div class="row center"><button class="btn primary big" data-tame="young" type="button">🦇 Tame your first Lútut</button></div>' +
      '<p class="muted small">The taming is in 3D. Lean with ◀ ▶ (← →), grab with Space.</p></div>';
    else if (tab === 'ride') {
      body = '<div class="card hero"><div class="grow"><div class="muted small">Riding out over</div><div class="pname">' + esc(S.name) + '</div>' +
        '<div class="muted">' + esc(S.blurb) + '</div><div class="row">' + medalDots(S.id) + '<span class="muted small">best ' + fmt(D.best[S.id] || 0) + ' m</span></div>' +
        '<div class="row"><span class="chip">' + esc(K.name) + '</span><span class="chip">🍖 ' + st.gullet + '</span><span class="chip">💎 ' + st.cracks + ' cracks</span></div></div>' +
        '<div class="ride"><canvas id="heroPic" width="300" height="200"></canvas>' + (D.tamed[D.pick] ? '<button class="btn primary big" id="rideBtn" type="button">▶ Ride out</button>' : '<button class="btn primary big" data-tame="' + D.pick + '" type="button">🦇 Tame it first</button>') + '</div></div>' +
        '<h2>Regions</h2><div class="grid">' + LR.STAGES.map(s => {
          const open = D.stages[s.id], on = s.id === D.stage;
          return '<div class="card stage' + (on ? ' on' : '') + (open ? '' : ' locked') + '" style="--a:' + s.sky[0] + ';--b:' + s.ground + '">' +
            '<div class="sname">' + esc(s.name) + '</div><div class="small muted">' + esc(s.blurb) + '</div>' +
            '<div class="row">' + medalDots(s.id) + (open ? '<span class="small muted">best ' + fmt(D.best[s.id] || 0) + ' m</span>' : '') + '</div>' +
            '<div class="row">' + (open ? (on ? '<span class="chip ok">Chosen</span>' : '<button class="btn small" data-stage="' + s.id + '" type="button">Choose</button>')
              : '<button class="btn small" data-buystage="' + s.id + '" type="button"' + (D.teeth < s.cost ? ' disabled' : '') + '>Unlock · ' + fmt(s.cost) + ' 🦷</button>') + '</div></div>';
        }).join('') + '</div>';
    } else if (tab === 'lutut') {
      body = '<h2>Your Lútut</h2><div class="grid three">' + LR.KIND_ORDER.map(id => {
        const k = LR.KINDS[id], own = !!D.kinds[id], on = id === D.pick, s = LR.stats(id, D.kinds[id]);
        const bar = (n, v, mx) => '<div class="bar"><span>' + n + '</span><div><i style="width:' + Math.min(100, v / mx * 100) + '%"></i></div></div>';
        return '<div class="card kind' + (on ? ' on' : '') + '"><canvas class="pic" data-kind="' + id + '" width="300" height="200"></canvas>' +
          '<div class="sname">' + esc(k.name) + '</div><div class="small muted">' + esc(k.desc) + '</div><div class="bars">' +
          bar('Power', s.power / Math.pow(s.mass, 0.3), 1.9) + bar('Glide', s.lift / s.drag, 2) + bar('Gullet', s.gullet, 320) + bar('Tail', s.cracks + s.tailHit / 10, 9) + bar('Head', 13 / s.smashV, 2.2) + '</div>' +
          '<div class="row">' + (own && !D.tamed[id] ? '<button class="btn small primary" data-tame="' + id + '" type="button">🦇 Tame it</button>' : own ? (on ? '<span class="chip ok">Riding this one</span>' : '<button class="btn small" data-pick="' + id + '" type="button">Ride this one</button>')
            : '<button class="btn small" data-buykind="' + id + '" type="button"' + (D.teeth < k.cost ? ' disabled' : '') + '>Raise one · ' + fmt(k.cost) + ' 🦷</button>') + '</div></div>';
      }).join('') + '</div>' +
        '<h2>Upgrades: ' + esc(K.name) + '</h2><div class="card">' + LR.UPGRADES.map(u => {
          const lv = up[u.id] || 0, max = lv >= LR.UPG_MAX, cost = LR.upgCost(D.pick, lv);
          return '<div class="upg"><div class="uico">' + u.icon + '</div><div class="grow"><b>' + esc(u.name) + '</b> <span class="muted small">level ' + lv + '</span><div class="small muted">' + esc(u.desc) + '</div>' +
            '<div class="pips">' + Array.from({ length: LR.UPG_MAX }, (_, i) => '<i class="' + (i < lv ? 'on' : '') + '"></i>').join('') + '</div></div>' +
            (max ? '<span class="chip ok">Full</span>' : '<button class="btn" data-up="' + u.id + '" type="button"' + (D.teeth < cost ? ' disabled' : '') + '>' + fmt(cost) + ' 🦷</button>') + '</div>';
        }).join('') + '</div>';
    } else if (tab === 'feats') {
      const S2 = D.stats;
      body = '<h2>Feats</h2><div class="card">' + LR.FEATS.map(f => '<div class="feat' + (D.feats[f.id] ? ' done' : '') + '"><span>' + (D.feats[f.id] ? '🏅' : '◻') + '</span><div class="grow"><b>' + esc(f.name) + '</b><div class="small muted">' + esc(f.desc) + '</div></div><span class="small">' + fmt(f.teeth) + ' 🦷</span></div>').join('') + '</div>' +
        '<h2>Records</h2><div class="card"><table class="tbl"><tr><th>Region</th><th>Best</th><th>Medals</th></tr>' +
        LR.STAGES.map(s => '<tr><td>' + esc(s.name) + '</td><td>' + (D.stages[s.id] ? fmt(D.best[s.id] || 0) + ' m' : '<span class="muted">locked</span>') + '</td><td>' + medalDots(s.id) + '</td></tr>').join('') + '</table>' +
        '<p class="small muted">' + fmt(S2.runs) + ' rides · ' + fmt(S2.dist) + ' m in all · ' + fmt(S2.eatenAll) + ' prey · ' + fmt(S2.smashed) + ' stones and trees broken · ' + fmt(S2.clean) + ' clean landings · ' + fmt(S2.loops) + ' loops · longest in the air ' + S2.airMax.toFixed(1) + ' s</p></div>';
    } else {
      body = '<h2>How to ride</h2><div class="card prose">' +
        '<p>You are an Eikar on the back of a Lútut. Ride out from the roost as far as you can, then spend the teeth you bring back on a better Lútut.</p>' +
        '<h3>Two pedals</h3><p><b>BEAT</b> (<kbd>→</kbd> <kbd>D</kbd> <kbd>Space</kbd>, or the right pedal): a wingbeat. It pushes you on and lifts the nose. On the ground it runs, and from standing it leaps. Every beat costs meat.</p>' +
        '<p><b>TUCK</b> (<kbd>←</kbd> <kbd>A</kbd>, or the left pedal): fold the wings. The nose drops and it dives, which is how you get speed back. On the ground it digs its claws in to brake.</p>' +
        '<p>Neither: it <b>glides</b>, and gliding is free. A Lútut is a stone with wings: it only holds the air while it moves. Too steep a nose and it stalls.</p>' +
        '<h3>Meat is your fuel</h3><p>The gullet empties as you fly and faster when you beat. Lútut eat meat and nothing else: fly into Rock Hoppers, Albali Byrds, Shellbacks and Mud Eels to suck them in. A Byrd\'s horns sting, and the wings go numb for a moment. A Shellback is heavy: you have to be going fast. Empty, you can only glide, and the ride ends when you stop.</p>' +
        '<h3>Head of stone, tail of glass</h3><p>The round head is near unbreakable: hit a standing stone (or, on a big Lútut, a tree) head first and fast, and it breaks. The thin tail is not. Land with the nose up, or slap down too hard, or drag the tail through a stone, and it cracks. Too many cracks and it shatters.</p>' +
        '<p>Your Eikar is thrown off by a landing that is far too hard, or too far off the slope (on its back). In the marsh, stay out of the water: stone sinks. In the canyons, clear the chasms.</p>' +
        '<h3>Teeth</h3><p>Pick up the teeth on the way (worth more the further out you are), eat, break things, and do tricks: clean landings after a long flight, long air, skimming low and fast, loops. Every metre pays too. Reach 500, 1500, 3000 and 6000 m in a region for its medals.</p>' +
        '<h3>Taming</h3><p>Every Lútut starts wild. Raising a new one means taming it first, in 3D: creep up while it isn\'t looking, leap on, lean against its rolls and grab on through its screeches until its wildness runs out. Bigger ones fight harder.</p>' +
        (D.tamed[D.pick] ? '<div class="row"><button class="btn" data-tame="' + D.pick + '" type="button">🦇 Play the taming again</button></div>' : '') + '</div>';
    }
    ui.innerHTML = '<div class="wrap"><div class="top"><a class="btn ghost small" href="../../index.html">← Flake Games</a><h1>Lútut Rider</h1><div class="coins">🦷 ' + fmt(D.teeth) + '</div></div>' +
      '<div class="tabs">' + [['ride', 'Ride'], ['lutut', 'Lútut & upgrades'], ['feats', 'Feats & records'], ['help', 'How to ride']].map(t => '<button class="tab' + (tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '" type="button">' + t[1] + '</button>').join('') + '</div>' +
      body + '<p class="muted small center">' + who + ' · <button class="linkbtn" id="sndToggle" type="button">' + (D.sound ? '🔊 sound on' : '🔇 sound off') + '</button> · <button class="linkbtn" id="lookToggle" type="button">🎨 look: ' + (D.look === 'pixel' ? 'pixel (4 Brothers Worlds)' : 'storybook (Tuftwood)') + '</button></p>' +
      '<p class="copyright">© 2026 Isaac Flake. All Rights Reserved.</p></div>';
    const hp = $('heroPic'); if (hp) A.portrait(hp, D.pick, 1.1);
    ui.querySelectorAll('canvas.pic').forEach(c => A.portrait(c, c.dataset.kind, 1.1));
    const rb = $('rideBtn'); if (rb) rb.onclick = startRide;
    $('sndToggle').onclick = () => { D.sound = !D.sound; save(); roost(); };
    $('lookToggle').onclick = () => { D.look = D.look === 'pixel' ? 'storybook' : 'pixel'; setLook(D.look); save(); newDemo(); roost(); };
  }
  ui.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.tab) { tab = d.tab; roost(); ui.scrollTop = 0; return; }
    if (d.tame) { tame(d.tame); return; }
    if (d.stage) { D.stage = d.stage; save(); newDemo(); roost(); return; }
    if (d.buystage) { const s = LR.stage(d.buystage); if (D.teeth >= s.cost) { D.teeth -= s.cost; D.stages[s.id] = true; D.stage = s.id; SND.buy(); save(); newDemo(); roost(); } return; }
    if (d.pick) { D.pick = d.pick; save(); newDemo(); roost(); return; }
    if (d.buykind) { const k = LR.KINDS[d.buykind]; if (D.teeth >= k.cost) { D.teeth -= k.cost; D.kinds[d.buykind] = { wings: 0, gullet: 0, tail: 0, saddle: 0 }; D.pick = d.buykind; SND.buy(); save(); tame(d.buykind); } return; }
    if (d.up) {
      const up = D.kinds[D.pick], lv = up[d.up] || 0, cost = LR.upgCost(D.pick, lv);
      if (lv < LR.UPG_MAX && D.teeth >= cost) { D.teeth -= cost; up[d.up] = lv + 1; SND.buy(); save(); roost(); }
    }
  });

  /* ================= the loop ================= */
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    if (mode === 'tame') return;          // the 3D scene draws itself
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (mode === 'ride' || mode === 'results') {
      if (!paused) {
        acc += dt; let n = 0;
        const vy0 = run.vy;
        while (acc >= LR.DT && n < 6) { LR.step(run, input()); acc -= LR.DT; n++; }
        if (acc > LR.DT) acc = 0;
        landingFx(vy0);
        if (run.beating && run.t - lastBeatT > 0.7) { lastBeatT = run.t; SND.beat(); }
        handleEvents();
        A.follow(view, run, W, H, dt);
        windSound(Math.min(1, Math.hypot(run.vx, run.vy) / 40));
        if (run.over && run.overT > 1.8 && !resultsShown) finishRide();
      }
      A.frame(ctx, view, run, now / 1000, paused ? 0 : dt, anim);
      if (mode === 'ride') hud();
    } else if (demo) {
      /* the roost's background: a Lútut out riding on its own */
      for (let i = 0; i < Math.round(dt / LR.DT); i++) LR.step(demo, LR.autopilot(demo));
      if ((demo.over && demo.overT > 2) || demo.t > 90) newDemo();
      A.follow(view, demo, W, H, dt);
      A.frame(ctx, view, demo, now / 1000, dt, anim);
      demo.ev.length = 0;
    }
  }

  SAVE.ready.then(d => {
    D = d;
    if (!D.kinds[D.pick]) D.pick = 'young';
    if (!D.stages[D.stage]) D.stage = 'downs';
    setLook(D.look);
    if (D.rides > 0) for (const k in D.kinds) if (D.tamed[k] == null) D.tamed[k] = true;     // saves from before the taming: what you already rode is tame
    newDemo(); roost();
    requestAnimationFrame(frame);
  });
  LR.main = { auto: false, autoTame: false, tame, get D() { return D; }, get run() { return run; }, startRide, toRoost };
})();
