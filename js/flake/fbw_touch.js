/* ============================================================
   FLAKE GAMES — js/flake/fbw_touch.js
   Touch controls for the 4 Brothers Worlds (v1 and v2) on phones
   and tablets.

     Left thumb:  a joystick. Left/right walks, up jumps and climbs,
                  down drops and dives. Push past the rim to run.
     The world:   touch and hold anywhere on the game to swing, mine,
                  chop or place a block right there (the left mouse);
                  double-tap a spot to use or cast on it (the right).
     Buttons:     Jump, Hit (swings at what's in front of you), Use
                  (eat / cast), Cast, Spell, Talk, Torch, Drop, and
                  the hero ability in v2. Bag, Map, Guide and Chat sit
                  with the Menu button.
     The bag:     tap to pick up and put down; hold a slot to eat or
                  wear what's in it (the right-click).
     Settings:    a Touch controls section: button size, see-through
                  buttons, left-handed (joystick on the right) and a
                  little buzz on each press. Kept in this browser.
     Words:       hints that name keys ("Press R", "F to cast") name
                  the buttons instead, and Controls lists the touch
                  controls.

   Turns itself on only on a touch screen (a coarse pointer, or the
   first touch), so mouse-and-keyboard players never see any of it
   and the game on a computer is exactly as it was.

   It feeds the game through RW.input.act / actHit, the same calls
   the keyboard and mouse go through, so nothing in the game needed
   to change.
   ============================================================ */
(function () {
  'use strict';
  const RW = window.RW;
  if (!RW || !RW.input) return;
  const I = RW.input;

  /* ---------- touch actions, read by the game like held keys ---------- */
  const held = {}, hit = {};
  const act0 = I.act, actHit0 = I.actHit, end0 = I.endFrame;
  // the old v1.1 copy reads keys by name and the mouse buttons directly, with no actions
  const LEGACY = !act0;
  const LKEY = { left: 'a', right: 'd', up: 'w', down: 's', jump: ' ', sprint: 'Shift', interact: 'e', cast: 'f', spell: 'q' };
  function legacy(id, down) {
    const M = I.mouse;
    if (id === 'attack') { M.l = down; if (down) M.lp = true; return; }
    if (id === 'use') { M.r = down; if (down) M.rp = true; return; }
    const k = LKEY[id]; if (!k) return;
    if (down && !I.keys[k]) I.pressed[k] = true;
    I.keys[k] = down;
  }
  if (!LEGACY) {
    I.act = function (id) { return act0.call(this, id) || !!held[id]; };
    I.actHit = function (id) { return actHit0.call(this, id) || !!hit[id]; };
  }
  I.endFrame = function () { end0.call(this); for (const k in hit) delete hit[k]; };
  const press = (id) => { if (!held[id]) hit[id] = true; held[id] = true; if (LEGACY) legacy(id, true); };
  const release = (id) => { if (held[id] && LEGACY) legacy(id, false); held[id] = false; };

  let on = false, root = null, cv = null;

  /* ---------- touch settings, kept in this browser ---------- */
  const OPT_KEY = 'fbw-touch-opts';
  const TO = Object.assign({ size: 'normal', faint: false, lefty: false, buzz: true }, (() => { try { return JSON.parse(localStorage.getItem(OPT_KEY) || '{}'); } catch (e) { return {}; } })());
  const saveOpts = () => { try { localStorage.setItem(OPT_KEY, JSON.stringify(TO)); } catch (e) { /* private mode */ } };
  function applyOpts() {
    if (!root) return;
    root.classList.toggle('sz-s', TO.size === 'small');
    root.classList.toggle('sz-l', TO.size === 'large');
    root.classList.toggle('faint', !!TO.faint);
    document.body.classList.toggle('fbw-lefty', !!TO.lefty);
  }
  const buzz = () => { if (TO.buzz && navigator.vibrate) try { navigator.vibrate(8); } catch (e) { /* ignore */ } };
  const $ = (s) => document.querySelector(s);
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const playing = () => !!(RW.game && RW.game.playing);

  /* ---------- aiming: the game reads the mouse position ---------- */
  function aimAtClient(x, y) { I.mouse.x = x; I.mouse.y = y; }
  // a spot just in front of the hero, for the Hit and Use buttons
  function aimAhead() {
    const P = RW.player; if (!P || !cv || !RW.cam) return;
    const r = cv.getBoundingClientRect(), k = r.width / (cv.width || 1);
    const sc = (P.scale && P.scale()) || 1;
    const wx = P.x + P.w / 2 + (P.face || 1) * 22 * sc, wy = P.y + P.h * 0.45;
    aimAtClient((wx - RW.cam.x) * k + r.left, (wy - RW.cam.y) * k + r.top);
  }

  /* ---------- the joystick ---------- */
  const STICK_R = 46;
  let stickId = null, stickO = null, stick = null, knob = null;
  function stickDown(e) {
    if (stickId !== null) return;
    e.preventDefault(); e.stopPropagation();
    stickId = e.pointerId;
    const r = stick.getBoundingClientRect(); stickO = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    try { stick.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    RW.audio && RW.audio.start && RW.audio.start();
    stickMove(e);
  }
  function stickMove(e) {
    if (e.pointerId !== stickId) return;
    e.preventDefault();
    let dx = e.clientX - stickO.x, dy = e.clientY - stickO.y;
    const d = Math.hypot(dx, dy);
    const far = d > STICK_R * 1.3;
    if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    const x = dx / STICK_R, y = dy / STICK_R;
    setHeld('left', x < -0.35); setHeld('right', x > 0.35);
    setHeld('up', y < -0.6); setHeld('down', y > 0.6);
    setHeld('sprint', far && Math.abs(x) > 0.6);
  }
  function stickUp(e) {
    if (e.pointerId !== stickId) return;
    stickId = null; knob.style.transform = '';
    ['left', 'right', 'up', 'down', 'sprint'].forEach(release);
  }
  function setHeld(id, v) { if (v) press(id); else release(id); }

  /* ---------- touching the world: the left mouse button, right there ---------- */
  // a quick second tap on the same spot is the right mouse button there: eat, cast, fish, open, pet
  let worldId = null, worldUse = false, downAt = null, lastTap = { t: 0, x: 0, y: 0 };
  function worldDown(e) {
    if (!on || e.pointerType === 'mouse' || !playing()) return;
    if (worldId !== null) return;
    e.preventDefault();   // no pretend mouse clicks after the touch
    worldId = e.pointerId;
    RW.audio && RW.audio.start && RW.audio.start();
    const ae = document.activeElement; if (ae && ae !== document.body && ae.blur) ae.blur();
    aimAtClient(e.clientX, e.clientY);
    const now = performance.now();
    if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 36) {
      worldUse = true; lastTap.t = 0;
      press('use'); setTimeout(() => release('use'), 60);
      return;
    }
    downAt = { t: now, x: e.clientX, y: e.clientY };
    press('attack');
  }
  function worldMove(e) { if (e.pointerId === worldId) aimAtClient(e.clientX, e.clientY); }
  function worldUp(e) {
    if (e.pointerId !== worldId) return;
    worldId = null;
    if (worldUse) { worldUse = false; return; }
    release('attack');
    const now = performance.now();
    if (downAt && now - downAt.t < 250 && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 14) lastTap = { t: now, x: e.clientX, y: e.clientY };
  }

  /* ---------- buttons ---------- */
  // [id, label, action, hold?, size]
  const BTN = [
    ['jump', 'Jump', 'jump', true, 'big'],
    ['attack', 'Hit', 'attack', true, 'big'],
    ['use', 'Use', 'use', false, 'mid'],
    ['cast', 'Cast', 'cast', false, 'mid'],
    ['interact', 'Talk', 'interact', false, 'mid'],
    ['spell', 'Spell', 'spell', false, 'sm'],
    ['torch', 'Torch', 'torch', false, 'sm'],
    ['drop', 'Drop', 'drop', false, 'sm'],
    ['give', 'Give', 'give', false, 'sm'],
    ['ability', 'Power', 'ability', false, 'sm'],
  ];
  let aheadT = 0;
  function aheadLoop() {
    if (!held.attack || worldId !== null) { aheadT = 0; return; }
    aimAhead(); aheadT = requestAnimationFrame(aheadLoop);
  }
  function button(id, label, action, hold, size) {
    const b = mk('button', 'fbt ' + size, label); b.type = 'button'; b.id = 'fbt-' + id;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      b.classList.add('down');
      try { b.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      RW.audio && RW.audio.start && RW.audio.start();
      buzz();
      if (action === 'attack' || action === 'use' || action === 'cast') { aimAhead(); if (action === 'attack' && !aheadT) aheadT = requestAnimationFrame(aheadLoop); }
      press(action);
      if (!hold) setTimeout(() => release(action), 60);
    });
    const up = () => { if (!b.classList.contains('down')) return; b.classList.remove('down'); if (hold) release(action); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    return b;
  }

  /* the panel buttons (Bag, Map, ...) lose their keyboard hints: there's no keyboard */
  const KEYHINT = /\s*\((Esc|Tab|Enter|[A-Z0-9]|[A-Z][a-z]+ [a-z]+)\)\s*$/;
  function stripKeys() {
    if (!on) return;
    document.querySelectorAll('#ui .btn').forEach((b) => {
      if (b.children.length) return;
      const t = b.textContent; if (KEYHINT.test(t)) b.textContent = t.replace(KEYHINT, '');
    });
  }

  /* ---------- words: name the buttons, not the keys ---------- */
  const LABEL = { left: 'Joystick', right: 'Joystick', up: 'Joystick up', down: 'Joystick down', jump: 'Jump', sprint: 'Joystick (push all the way)', attack: 'Hit', use: 'Use', cast: 'Cast', spell: 'Spell', interact: 'Talk', torch: 'Torch', drop: 'Drop', give: 'Give', ability: 'Power', bag: 'Bag', map: 'Map', guide: 'Guide', help: 'Controls', settings: 'Settings', chat: 'Chat' };
  let realKeys = 0;   // > 0 while the Settings key table or the HUD key hints draw: those want the real keys
  const kn0 = RW.keyName;
  if (kn0) RW.keyName = function (c) {
    if (on && !realKeys && c && RW.binds) {
      for (const id in LABEL) if ((RW.binds[id] || []).includes(c)) return LABEL[id];
    }
    return kn0.apply(this, arguments);
  };
  const realKeysDuring = (fn) => function () { realKeys++; try { return fn.apply(this, arguments); } finally { realKeys--; } };
  // hard-written hints in the game's text, said the touch way
  const WORDS = [
    [/Hold left mouse on /g, 'Touch and hold '], [/hold left mouse on /g, 'touch and hold '],
    [/Right-click or F to cast\. Q switches spells\./g, 'Tap Cast (or double-tap where you aim) to cast. Spell switches spells.'],
    [/F or right-click slams/g, 'Cast slams'],
    [/Right-click casts (\w+), Q switches to/g, 'Use casts $1, Spell switches to'],
    [/F casts (\w+), Q switches to/g, 'Cast casts $1, Spell switches to'],
    [/\(R or right-click\)/g, '(Talk, or double-tap it)'], [/R or right-click/g, 'Talk, or double-tap it,'],
    [/ \(R\)/g, ' (Talk)'],
    [/Press H for controls\./g, 'Menu → Controls shows the buttons.'],
    [/\bPress R\b/g, 'Tap Talk'], [/\bpress R\b/g, 'tap Talk'], [/\bPress T\b/g, 'Tap Torch'],
    [/ · right-click to wear/g, ' · hold it in the bag to wear'],
    [/Right-click armor in your bag/g, 'Hold armor in your bag'],
    [/\bRight-click\b/g, 'Double-tap'], [/\bright-click\b/g, 'double-tap'],
    [/ · F to cast · Q to switch/g, ' · tap Cast · Spell switches'],
    [/\bCast to cast\b/g, 'tap Cast'], [/\bSpell to switch\b/g, 'Spell switches'],
  ];
  function sayTouch(node) {
    if (!on || !node) return;
    const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let t = walk.nextNode(); t; t = walk.nextNode()) {
      let v = t.nodeValue, w = v;
      for (const [re, to] of WORDS) w = w.replace(re, to);
      if (w !== v) t.nodeValue = w;
    }
  }
  function watchWords() {
    ['#toast', '#banner', '#spellchip', '#feed', '#talk', '#carve', '#tooltip', '#pick', '#riftm', '#chest'].forEach((sel) => {
      const n = $(sel); if (!n) return;
      sayTouch(n);
      new MutationObserver(() => sayTouch(n)).observe(n, { childList: true, characterData: true, subtree: true });
    });
    // the "R: Talk" drawn over a person's head
    const g = cv && cv.getContext && cv.getContext('2d');
    if (g && !g._touchText) {
      const ft = g.fillText;
      g.fillText = function (t) { if (t === 'R: Talk') arguments[0] = 'Talk'; return ft.apply(this, arguments); };
      g._touchText = true;
    }
  }

  /* Controls: the touch controls (the keyboard still works, and says so) */
  const HELP = [
    ['Joystick', 'Walk. Push up to jump or climb, down to drop through walkways or dive. Push all the way to run (uses stamina).'],
    ['Jump', 'Jump. In water, hold to swim up. Rocks sink but never drown; fuzzies float but need air'],
    ['Touch & hold', 'anywhere in the world: swing, shoot bows, mine, chop trees, place blocks, plant on farm soil, right there'],
    ['Double-tap', 'a spot: use, cast or open what is there: fish, feed a pet, open a chest, sleep in a bed'],
    ['Hit', 'Swing at whatever is in front of you'],
    ['Use', 'Eat or consume what you hold, otherwise cast your spell ahead of you'],
    ['Cast · Spell', 'Cast your spell · switch spell'],
    ['Talk', 'Talk, read carvings, open chests, use waystones, rifts and Duat Altars'],
    ['Torch · Drop', 'Light your torch or put it away · drop what you hold'],
    ['Power', 'Your hero magic (V2)'],
    ['Hotbar', 'Tap a slot to hold it. Hold a slot to eat or wear what is in it'],
    ['Bag · Map · Guide', 'Top right. In the bag, tap to pick up and put down, hold to eat or wear'],
    ['Chat', 'Talk with the other players in your world'],
    ['Menu', 'Pause, travel, Settings (bigger or see-through buttons, left-handed), save'],
  ];
  function touchHelp() {
    const box = $('#help .keys'); if (!box) return;
    box.innerHTML = '';
    HELP.forEach(([k, t]) => { if (k === 'Power' && !(RW.binds && RW.binds.ability)) return; const a = mk('kbd', null, k), b = mk('span', null, t); box.append(a, b); });
    const n = mk('span', 'label', 'Got a keyboard and mouse too? They still work.'); box.append(mk('span'), n);
  }

  /* Settings: a Touch controls section at the top */
  function touchOpts() {
    const box = $('#optbody'); if (!box) return;
    const frag = document.createDocumentFragment();
    frag.append(mk('div', 'label opt-h', 'Touch controls'));
    const row = (label, ctl) => { const r = mk('label', 'opt-row'); r.append(mk('span', null, label), ctl); frag.append(r); };
    const sizes = mk('span', 'chips');
    [['small', 'Small'], ['normal', 'Normal'], ['large', 'Large']].forEach(([v, n]) => {
      const c = mk('button', 'chip', n); c.type = 'button'; c.setAttribute('aria-pressed', String(TO.size === v));
      c.onclick = (e) => { e.preventDefault(); TO.size = v; saveOpts(); applyOpts(); sizes.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c))); };
      sizes.append(c);
    });
    row('Button size', sizes);
    const check = (label, key) => { const cb = mk('input'); cb.type = 'checkbox'; cb.checked = !!TO[key]; cb.onchange = () => { TO[key] = cb.checked; saveOpts(); applyOpts(); if (key === 'buzz' && cb.checked) buzz(); }; row(label, cb); };
    check('See-through buttons', 'faint');
    check('Left-handed (joystick on the right)', 'lefty');
    check('Buzz on each press', 'buzz');
    box.insertBefore(frag, box.firstChild);
  }

  function build() {
    root = mk('div'); root.id = 'fbtouch';
    stick = mk('div', 'fbstick'); knob = mk('div', 'fbknob'); stick.appendChild(knob);
    stick.addEventListener('pointerdown', stickDown);
    stick.addEventListener('pointermove', stickMove);
    stick.addEventListener('pointerup', stickUp); stick.addEventListener('pointercancel', stickUp); stick.addEventListener('lostpointercapture', stickUp);
    const pad = mk('div', 'fbpad');
    BTN.forEach(([id, l, a, h, s]) => pad.appendChild(button(id, l, a, h, s)));
    const rot = mk('div', 'fbrot', '⟳ Turn your phone sideways for the best view');
    rot.addEventListener('click', () => rot.classList.add('gone'));
    setTimeout(() => rot.classList.add('gone'), 12000);
    root.append(stick, pad, rot);
    document.body.appendChild(root);
    applyOpts();

    // Chat joins Bag, Map and Guide
    const hb = $('#helpbtns');
    if (hb && !$('#b-chat')) {
      const c = mk('button', 'btn small', 'Chat'); c.type = 'button'; c.id = 'b-chat';
      c.onclick = () => { const ci = $('#chatin'); if (!ci) return; ci.classList.remove('hidden-ui'); ci.focus(); };
      hb.appendChild(c);
    }
    // ...and sit right under the Menu button, so the two rows can never overlap
    const tr = $('#topright'); if (tr && hb && hb.parentNode !== tr) tr.appendChild(hb);
    const ci = $('#chatin');
    if (ci) {
      ci.placeholder = 'Say something';
      ci.setAttribute('enterkeyhint', 'send');
      ci.addEventListener('blur', () => { if (!ci.value) ci.classList.add('hidden-ui'); });
    }

    // the bag's help speaks touch
    const hint = $('#inv .hint');
    if (hint) hint.textContent = 'Tap to pick up and move. Hold an item to eat food, consume a crystal or wear armor. Stand near a Knapping Stone or Forge to craft more.';

    // the game's canvas: touches there are the left mouse button
    cv = $('#game');
    if (cv) {
      cv.addEventListener('pointerdown', worldDown, { passive: false });
      cv.addEventListener('pointermove', worldMove);
      cv.addEventListener('pointerup', worldUp); cv.addEventListener('pointercancel', worldUp);
    }

    // the bag: hold a slot to eat or wear what's in it (the right-click)
    let lp = null;
    document.addEventListener('touchstart', (e) => {
      const s = e.target.closest && e.target.closest('#invgrid .slot, #hotbar .slot');
      if (!s || e.touches.length > 1) return;
      const t = e.touches[0];
      lp = { s, x: t.clientX, y: t.clientY, fired: false, timer: setTimeout(() => {
        lp.fired = true;
        s.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2, clientX: lp.x, clientY: lp.y }));
        if (navigator.vibrate) try { navigator.vibrate(15); } catch (_) { /* ignore */ }
      }, 480) };
    }, { passive: true });
    document.addEventListener('touchmove', (e) => { if (lp && Math.hypot(e.touches[0].clientX - lp.x, e.touches[0].clientY - lp.y) > 10) { clearTimeout(lp.timer); lp = null; } }, { passive: true });
    document.addEventListener('touchend', (e) => { if (!lp) return; clearTimeout(lp.timer); if (lp.fired && e.cancelable) e.preventDefault(); lp = null; }, { passive: false });
    // a tapped item's tooltip goes away with the next tap
    document.addEventListener('touchstart', (e) => { const tip = $('#tooltip'); if (tip && !(e.target.closest && e.target.closest('.slot'))) tip.classList.add('hidden-ui'); }, { passive: true });

    // keep the key hints off the buttons when the game redraws them
    const U = RW.ui;
    if (U && U.hudKeys && !U.hudKeys._touch) { const h0 = realKeysDuring(U.hudKeys); U.hudKeys = function () { const r = h0.apply(this, arguments); stripKeys(); return r; }; U.hudKeys._touch = true; }
    if (U && U.renderOpts && !U.renderOpts._touch) { const o0 = realKeysDuring(U.renderOpts); U.renderOpts = function () { const r = o0.apply(this, arguments); touchOpts(); return r; }; U.renderOpts._touch = true; }
    if (U && U.renderHelp && !U.renderHelp._touch) { const h1 = U.renderHelp; U.renderHelp = function () { const r = h1.apply(this, arguments); touchHelp(); return r; }; U.renderHelp._touch = true; }
    touchHelp();
    stripKeys();
    watchWords();
    new MutationObserver(() => stripKeys()).observe($('#ui') || document.body, { childList: true, subtree: true });
  }

  /* show only the buttons that do something right now */
  function update() {
    if (!on || !root) return;
    const P = RW.player, U = RW.ui || {};
    const show = playing() && !U.open;
    root.classList.toggle('off', !show);
    root.classList.toggle('portrait', innerHeight > innerWidth);
    if (show && P) {
      const vis = (id, v) => { const b = document.getElementById('fbt-' + id); if (b) b.style.display = v ? '' : 'none'; };
      const spells = P.spells && P.spells.length;
      vis('cast', spells || P.species === 'rock');
      vis('spell', spells > 1 || P.species === 'rock');
      vis('torch', !LEGACY && P.has && (P.has('torch') || P.offTorch));
      vis('give', !LEGACY && RW.net && RW.net.transport);
      vis('ability', !LEGACY && !!(RW.binds && RW.binds.ability));
      vis('drop', !LEGACY && P.held && P.held());
    }
  }

  function enable() {
    if (on) return;
    on = true;
    document.body.classList.add('fbw-touch');
    build();
    setInterval(update, 200); update();
  }
  let coarse = false;
  try { coarse = matchMedia('(pointer: coarse)').matches; } catch (e) { /* ignore */ }
  if (coarse) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enable); else enable(); }
  addEventListener('touchstart', enable, { passive: true, capture: true });

  /* ---------- the look of it (only ever applied on a touch screen) ---------- */
  const css = `
body.fbw-touch #game { touch-action: none; }
body.fbw-touch, body.fbw-touch * { -webkit-tap-highlight-color: transparent; }
body.fbw-touch button, body.fbw-touch .slot, body.fbw-touch .chip { touch-action: manipulation; }
#fbtouch { position: fixed; inset: 0; pointer-events: none; z-index: 5; user-select: none; -webkit-user-select: none; }
#fbtouch.off .fbstick, #fbtouch.off .fbpad, #fbtouch.off .fbrot { display: none; }
#fbtouch * { touch-action: none; }
.fbstick { position: absolute; left: calc(18px + env(safe-area-inset-left, 0px)); bottom: calc(18px + env(safe-area-inset-bottom, 0px)); width: 108px; height: 108px; border-radius: 50%; background: rgba(13,11,18,.38); border: 2px solid rgba(157,148,170,.45); pointer-events: auto; }
.fbknob { position: absolute; left: 50%; top: 50%; width: 48px; height: 48px; margin: -24px 0 0 -24px; border-radius: 50%; background: rgba(236,228,214,.28); border: 2px solid rgba(236,228,214,.6); }
.fbpad { position: absolute; right: calc(14px + env(safe-area-inset-right, 0px)); bottom: calc(12px + env(safe-area-inset-bottom, 0px)); width: 190px; display: flex; flex-wrap: wrap-reverse; justify-content: flex-end; align-items: flex-end; gap: 7px; pointer-events: none; }
.fbt { pointer-events: auto; font-family: var(--display); color: var(--text); background: rgba(36,32,46,.72); border: 2px solid rgba(90,81,104,.9); border-radius: 50%; padding: 0; display: grid; place-items: center; line-height: 1; }
.fbt.big { width: 58px; height: 58px; font-size: 18px; }
.fbt.mid { width: 46px; height: 46px; font-size: 15px; }
.fbt.sm { width: 40px; height: 40px; font-size: 12px; letter-spacing: -.02em; }
.fbt.down { background: rgba(127,227,255,.35); border-color: var(--crystal); }
#fbt-attack { background: rgba(120,40,34,.6); }
#fbtouch.sz-s .fbpad { transform: scale(.85); transform-origin: bottom right; }
#fbtouch.sz-s .fbstick { transform: scale(.85); transform-origin: bottom left; }
#fbtouch.sz-l .fbpad { transform: scale(1.2); transform-origin: bottom right; }
#fbtouch.sz-l .fbstick { transform: scale(1.2); transform-origin: bottom left; }
#fbtouch.faint .fbt, #fbtouch.faint .fbstick { opacity: .42; }
#fbtouch.faint .fbt.down, #fbtouch.faint .fbstick:active { opacity: .9; }
body.fbw-lefty .fbstick { left: auto; right: calc(18px + env(safe-area-inset-right, 0px)); }
body.fbw-lefty .fbpad { right: auto; left: calc(14px + env(safe-area-inset-left, 0px)); justify-content: flex-start; }
body.fbw-lefty #fbtouch.sz-s .fbpad, body.fbw-lefty #fbtouch.sz-l .fbpad { transform-origin: bottom left; }
body.fbw-lefty #fbtouch.sz-s .fbstick, body.fbw-lefty #fbtouch.sz-l .fbstick { transform-origin: bottom right; }
body.fbw-touch.fbw-lefty #hotbar, body.fbw-touch.fbw-lefty #spellchip, body.fbw-touch.fbw-lefty #toast { left: calc(50% + 32px); }
body.fbw-touch #optbody .chips .chip { min-height: 34px; }
body.fbw-touch #optbody input[type=checkbox] { width: 22px; height: 22px; flex: 0 0 auto; }
#fbt-jump { background: rgba(35,64,74,.72); }
.fbrot { position: absolute; top: 40%; left: 50%; transform: translateX(-50%); display: none; pointer-events: auto; background: rgba(13,11,18,.85); border: 2px solid var(--edge); padding: 6px 12px; font-size: 16px; color: var(--muted); text-align: center; width: max-content; max-width: calc(100vw - 48px); }
#fbtouch.portrait:not(.off) .fbrot:not(.gone) { display: block; }

/* the HUD, smaller, out of the thumbs' way */
body.fbw-touch #bars { transform: scale(.66); transform-origin: top left; }
body.fbw-touch #zone { font-size: 13px; top: calc(74px + env(safe-area-inset-top, 0px)); left: max(16px, env(safe-area-inset-left, 0px)); transform: none; text-align: left; }
body.fbw-touch #zone b { font-size: 16px; }
body.fbw-touch #b-help, body.fbw-touch #b-opts, body.fbw-touch #topright .b-full { display: none; }
body.fbw-touch #online { font-size: 13px; padding: 2px 6px; align-self: center; }
body.fbw-touch #topright { top: calc(6px + env(safe-area-inset-top, 0px)); gap: 4px; max-width: 58vw; }
body.fbw-touch #helpbtns { position: static; flex-basis: 100%; flex-direction: row; justify-content: flex-end; gap: 4px; max-width: none; }
body.fbw-touch #topright .btn, body.fbw-touch #helpbtns .btn { font-size: 15px; padding: 3px 8px; min-height: 30px; }
body.fbw-touch #hotbar { bottom: calc(6px + env(safe-area-inset-bottom, 0px)); left: calc(50% - 32px); gap: 2px; padding: 3px; }
body.fbw-touch #hotbar .slot { width: 27px; height: 27px; }
body.fbw-touch #hotbar .slot canvas { width: 22px; height: 22px; }
body.fbw-touch #hotbar .slot .k { display: none; }
body.fbw-touch #spellchip { bottom: calc(44px + env(safe-area-inset-bottom, 0px)); left: calc(50% - 32px); font-size: 13px; padding: 2px 8px; max-width: calc(100vw - 340px); }
body.fbw-touch #toast { bottom: calc(92px + env(safe-area-inset-bottom, 0px)); left: calc(50% - 32px); font-size: 15px; padding: 4px 10px; max-width: min(460px, calc(100vw - 340px)); }
body.fbw-touch #feed { top: calc(84px + env(safe-area-inset-top, 0px)); }
body.fbw-touch #feed div { font-size: 14px; }
body.fbw-touch #chatlog { bottom: calc(150px + env(safe-area-inset-bottom, 0px)); width: min(300px, 50vw); }
body.fbw-touch #chatlog div { font-size: 14px; }
body.fbw-touch #chatin { top: calc(50px + env(safe-area-inset-top, 0px)); bottom: auto; left: 50%; transform: translateX(-50%); width: min(360px, 60vw); font-size: 16px; }
body.fbw-touch #bossbar { transform: scale(.75); }
body.fbw-touch #banner { top: 18%; }
body.fbw-touch #v2coins { left: max(16px, env(safe-area-inset-left, 0px)) !important; right: auto !important; top: calc(116px + env(safe-area-inset-top, 0px)) !important; font-size: 14px !important; }
@media (max-width: 600px) {
  body.fbw-touch #topright { max-width: calc(100vw - 196px); }
  body.fbw-touch #zone { top: calc(150px + env(safe-area-inset-top, 0px)); left: 50%; transform: translateX(-50%); text-align: center; }
  body.fbw-touch #v2coins { top: calc(76px + env(safe-area-inset-top, 0px)) !important; }
  body.fbw-touch #banner { top: 30%; }
  body.fbw-touch #hotbar, body.fbw-touch.fbw-lefty #hotbar { bottom: calc(184px + env(safe-area-inset-bottom, 0px)); left: 50%; }
  body.fbw-touch #spellchip, body.fbw-touch.fbw-lefty #spellchip { bottom: calc(220px + env(safe-area-inset-bottom, 0px)); left: 50%; max-width: calc(100vw - 32px); }
  body.fbw-touch #toast, body.fbw-touch.fbw-lefty #toast { bottom: calc(256px + env(safe-area-inset-bottom, 0px)); left: 50%; max-width: calc(100vw - 32px); }
  body.fbw-touch #chatlog { bottom: calc(290px + env(safe-area-inset-bottom, 0px)); }
}

/* menus and panels fit a phone and scroll instead of spilling off it */
body.fbw-touch #title, body.fbw-touch #creator { place-items: start center; overflow-y: auto; -webkit-overflow-scrolling: touch; }
body.fbw-touch #title .wrap, body.fbw-touch #creator .card { margin-block: auto; }
body.fbw-touch .modal { padding: 8px; }
body.fbw-touch .panel { max-height: calc(100dvh - 16px); max-width: calc(100vw - 16px); -webkit-overflow-scrolling: touch; }
body.fbw-touch #tooltip { max-width: min(260px, 70vw); }
@media (max-height: 500px) {
  body.fbw-touch #title .wrap { gap: 10px; padding: 12px; }
  body.fbw-touch #logo { font-size: clamp(22px, 9vh, 40px); }
  body.fbw-touch #title .sub { font-size: 16px; }
  body.fbw-touch .btn { font-size: 17px; padding: 6px 11px; }
  body.fbw-touch .btn.small { font-size: 15px; padding: 3px 8px; }
  body.fbw-touch #creator .card { gap: 10px; padding: 12px; grid-template-columns: minmax(120px, 180px) minmax(0, 1fr); }
  body.fbw-touch .panel { font-size: 17px; padding: 10px 12px; }
}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
