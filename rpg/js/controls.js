// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   Button mapping — every action in Torcain's Run can be put on
   any key, mouse button, mouse wheel, controller button, trigger
   or stick direction, or on a combo of two (hold one, press the
   other: "L1 + ↑"). Each action can have as many bindings as you
   like. The mapping screen (Pause → Controls, or the title) works
   like a console emulator's: pick an action, press what you want
   on it, done.

   Out of the box a PS4/PS5 (or any standard) controller plays the
   whole game, menus included, and the keyboard and mouse play as
   they always have.

   How it plugs in: every action sends the game the same key code
   it has always listened for (Jump is still 'Space' inside the
   game, whatever you put it on), so nothing else had to learn
   about controllers. The move and look sticks are analog and go
   round the codes (see stick / look).
   ============================================================ */

const LS_KEY = 'torcain-controls';

/* [id, name, group, code the game hears, default bindings]
   Bindings: 'K:<KeyboardEvent.code>', 'M:<mouse button>', 'W:up' / 'W:down' (wheel),
   'P:b<n>' (controller button, standard layout), 'P:a<n>+' / 'P:a<n>-' (a stick or axis pushed that way),
   and 'A&B' for a combo: hold A, press B. */
const DEFS = [
  ['move_f', 'Move forward', 'Move', 'KeyW', ['K:KeyW', 'K:ArrowUp', 'P:a1-']],
  ['move_b', 'Move back', 'Move', 'KeyS', ['K:KeyS', 'K:ArrowDown', 'P:a1+']],
  ['move_l', 'Move left', 'Move', 'KeyA', ['K:KeyA', 'K:ArrowLeft', 'P:a0-']],
  ['move_r', 'Move right', 'Move', 'KeyD', ['K:KeyD', 'K:ArrowRight', 'P:a0+']],
  ['sprint', 'Sprint · ride faster · reel a vine in', 'Move', 'ShiftLeft', ['K:ShiftLeft', 'K:ShiftRight', 'P:b10']],
  ['jump', 'Jump · hold to glide · pump on a Punk · fly up', 'Move', 'Space', ['K:Space', 'P:b0']],
  ['dodge', 'Dodge roll · off the Punk · let a vine out · fly down', 'Move', 'KeyC', ['K:KeyC', 'P:b1']],

  ['look_u', 'Look up', 'Camera', null, ['P:a3-']],
  ['look_d', 'Look down', 'Camera', null, ['P:a3+']],
  ['look_l', 'Look left', 'Camera', null, ['P:a2-']],
  ['look_r', 'Look right', 'Camera', null, ['P:a2+']],
  ['zoom_in', 'Zoom in', 'Camera', 'ZoomIn', ['W:up']],
  ['zoom_out', 'Zoom out', 'Camera', 'ZoomOut', ['W:down']],
  ['lock', 'Lock on', 'Camera', 'KeyT', ['K:KeyT', 'M:1', 'P:b11']],

  ['attack', 'Attack (hold for the combo) · left vine · left hand', 'Fight', 'Mouse0', ['M:0', 'P:b5']],
  ['duat', 'Duat Strike · right vine · right hand', 'Fight', 'Mouse2', ['M:2', 'P:b7']],
  ['flask', 'Drink Albali film (heal)', 'Fight', 'KeyR', ['K:KeyR', 'P:b2']],
  ['throw', 'Throw Sprengju · hold a vine’s length', 'Fight', 'KeyX', ['K:KeyX', 'P:b6']],
  ['punk', 'Punk shove (on her back)', 'Fight', 'CapsLock', ['K:CapsLock', 'K:KeyZ']],
  ['autokey', 'Auto-swing key (hold with both attacks)', 'Fight', 'KeyU', ['K:KeyU']],

  ['ride_l', 'Left vine (hold to swing)', 'On a Punk', 'Mouse0', ['P:b4', 'P:b6']],
  ['ride_r', 'Right vine (hold to swing)', 'On a Punk', 'Mouse2', ['P:b5', 'P:b7']],
  ['ride_hold', 'Hold the vines’ length (tap: keep holding)', 'On a Punk', 'KeyX', ['P:b11']],
  ['ride_shove', 'Shove', 'On a Punk', 'CapsLock', ['P:b2']],
  ['autoswing', 'Auto-swing (hold)', 'On a Punk', 'AutoSwing', ['P:b12']],

  ['interact', 'Talk · take · use · rest', 'Do', 'KeyE', ['K:KeyE', 'P:b3']],
  ['sense', 'Nur Sense', 'Do', 'KeyF', ['K:KeyF', 'P:b12']],
  ['hlyst', 'Nur’Hlyst (reveal)', 'Do', 'KeyG', ['K:KeyG', 'P:b14']],
  ['whistle', 'Whistle for your Punk', 'Do', 'KeyH', ['K:KeyH', 'P:b13']],
  ['kuni', 'Call the Kuni Byrd', 'Do', 'KeyB', ['K:KeyB', 'P:b15']],
  ['overview', 'Dya’Akara: overview', 'Do', 'KeyV', ['K:KeyV', 'P:b4&P:b0']],

  ['slot_q', 'Quick slot Q', 'Quick slots', 'KeyQ', ['K:KeyQ', 'P:b4']],
  ['slot_1', 'Quick slot 1', 'Quick slots', 'Digit1', ['K:Digit1', 'P:b4&P:b12']],
  ['slot_2', 'Quick slot 2', 'Quick slots', 'Digit2', ['K:Digit2', 'P:b4&P:b15']],
  ['slot_3', 'Quick slot 3', 'Quick slots', 'Digit3', ['K:Digit3', 'P:b4&P:b13']],
  ['slot_4', 'Quick slot 4', 'Quick slots', 'Digit4', ['K:Digit4', 'P:b4&P:b14']],
  ['slot_5', 'Quick slot 5', 'Quick slots', 'Digit5', ['K:Digit5', 'P:b4&P:b3']],
  ['slot_6', 'Quick slot 6', 'Quick slots', 'Digit6', ['K:Digit6', 'P:b4&P:b1']],

  ['pause', 'Pause', 'Menus', 'KeyP', ['K:KeyP', 'P:b9']],
  ['gear', 'Book: gear & pack', 'Menus', 'KeyI', ['K:KeyI', 'P:b17']],
  ['skills', 'Book: skills', 'Menus', 'KeyK', ['K:KeyK']],
  ['quests', 'Book: quests', 'Menus', 'KeyJ', ['K:KeyJ']],
  ['map', 'Book: map', 'Menus', 'KeyM', ['K:KeyM']],
  ['journal', 'Rokarvac (journal)', 'Menus', 'Tab', ['K:Tab', 'P:b8']],
  ['escape', 'Close / back (Esc)', 'Menus', 'Escape', ['K:Escape']],

  ['ui_up', 'Up', 'Menu navigation', null, ['P:b12', 'P:a1-']],
  ['ui_down', 'Down', 'Menu navigation', null, ['P:b13', 'P:a1+']],
  ['ui_left', 'Left', 'Menu navigation', null, ['P:b14', 'P:a0-']],
  ['ui_right', 'Right', 'Menu navigation', null, ['P:b15', 'P:a0+']],
  ['ui_ok', 'Choose', 'Menu navigation', null, ['P:b0']],
  ['ui_back', 'Back', 'Menu navigation', null, ['P:b1']],
  ['ui_prev', 'Previous tab', 'Menu navigation', null, ['P:b4']],
  ['ui_next', 'Next tab', 'Menu navigation', null, ['P:b5']],
  ['ui_sup', 'Scroll up', 'Menu navigation', null, ['P:a3-']],
  ['ui_sdown', 'Scroll down', 'Menu navigation', null, ['P:a3+']],
  ['ui_del', 'On-screen keyboard: delete', 'Menu navigation', null, ['P:b2']],
  ['ui_space', 'On-screen keyboard: space', 'Menu navigation', null, ['P:b3']],

  ['song_1', 'Song note 1 (leftmost)', 'The token song', 'Song1', ['K:KeyA', 'P:b14']],
  ['song_2', 'Song note 2', 'The token song', 'Song2', ['K:KeyS', 'P:b13']],
  ['song_3', 'Song note 3', 'The token song', 'Song3', ['K:KeyD', 'P:b12']],
  ['song_4', 'Song note 4 (rightmost)', 'The token song', 'Song4', ['K:KeyF', 'P:b15']],
];
export const ACTIONS = DEFS.map(([id, name, group, code, def]) => ({ id, name, group, code, def }));
const BY_ID = Object.fromEntries(ACTIONS.map(a => [a.id, a]));
const MOVE = { move_f: [0, 1], move_b: [0, -1], move_l: [-1, 0], move_r: [1, 0] };
const LOOK = { look_u: [0, -1], look_d: [0, 1], look_l: [-1, 0], look_r: [1, 0] };
const MENU = new Set(ACTIONS.filter(a => a.group === 'Menu navigation').map(a => a.id));
const SONG = new Set(['song_1', 'song_2', 'song_3', 'song_4']);
const RIDE = new Set(ACTIONS.filter(a => a.group === 'On a Punk').map(a => a.id));
const OSK_ONLY = new Set(['ui_del', 'ui_space']);
const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const CODES = new Set(ACTIONS.map(a => a.code).filter(Boolean));   // every code the game hears from an action

/* ---------------- names for what you press ---------------- */
const PS = ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'PS', 'Touchpad'];
const XB = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'Xbox', 'Share'];
const AXES = ['Left stick ←|Left stick →', 'Left stick ↑|Left stick ↓', 'Right stick ←|Right stick →', 'Right stick ↑|Right stick ↓'];
const KEYNAME = { Space: 'Space', ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift', ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Left Alt', AltRight: 'Right Alt',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', CapsLock: 'Caps Lock', Escape: 'Esc', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace',
  MetaLeft: 'Left ⌘', MetaRight: 'Right ⌘', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: '\'', Comma: ',', Period: '.', Slash: '/' };
const MOUSENAME = ['Left click', 'Middle click', 'Right click', 'Mouse 4', 'Mouse 5'];

export function createControls(api) {
  /* ---------------- the map, kept in this browser ---------------- */
  const OPT0 = { dead: 0.18, look: 1, invert: false, sprint: 'auto', glyphs: 'auto' };
  let map = {}, opt = { ...OPT0 };
  function load() {
    map = {}; opt = { ...OPT0 };
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (s && s.map) for (const a of ACTIONS) if (Array.isArray(s.map[a.id])) map[a.id] = s.map[a.id].filter(b => typeof b === 'string');
      if (s && s.opt) Object.assign(opt, s.opt);
    } catch (e) { /* private mode */ }
    for (const a of ACTIONS) if (!map[a.id]) map[a.id] = a.def.slice();
    rebuild();
  }
  let version = 0;   // goes up whenever the map changes, so labels shown in the HUD can follow
  function save() { version++; try { localStorage.setItem(LS_KEY, JSON.stringify({ v: 1, map, opt })); } catch (e) { /* ignore */ } }

  /* what each input does, indexed so a press is quick to look up */
  let singles = new Map(), chords = [], mods = new Set(), rideIn = new Set();
  function rebuild() {
    singles = new Map(); chords = []; mods = new Set(); rideIn = new Set();
    for (const id of RIDE) for (const b of map[id]) for (const p of b.split('&')) rideIn.add(p);
    for (const a of ACTIONS) for (const b of map[a.id]) {
      const parts = b.split('&');
      if (parts.length === 1) { if (!singles.has(b)) singles.set(b, []); singles.get(b).push(a.id); }
      else { chords.push({ a: parts[0], b: parts[1], id: a.id, bind: b }); mods.add(parts[0]); }
    }
  }
  load();

  /* ---------------- what's held right now ---------------- */
  const down = new Set();           // every input held: 'K:KeyW', 'P:b0', 'P:a1-' ...
  const axisVal = {};               // 'P:a1-' -> 0..1, past the dead zone
  const active = new Map();         // action id -> the binding that's holding it
  const modUsed = {};               // a combo's first button: was a combo made while it was held?
  let pulses = [];                  // actions pressed for a moment (a combo button tapped on its own)
  let device = 'kbm';
  let capture = null;               // the mapping screen waiting for you to press something

  const isPad = b => b.startsWith('P:');
  const isAxis = b => /^P:a/.test(b);

  const context = () => oskOpen() || (screen && !screen.classList.contains('hidden')) ? 'menu' : api.context();
  /* which actions count now. In a menu the controller drives the menu (not the game) and
     anything also bound to a menu move is the menu's; in talk the menu moves pick the answers */
  function enabled(id, bind, ctx) {
    if (MOVE[id] || LOOK[id]) return !isAxis(bind);   // the sticks are read as analog (see stick / look); keys still go through
    if (SONG.has(id)) return ctx === 'play' && api.singing();
    if (OSK_ONLY.has(id)) return ctx === 'menu' && oskOpen();
    if (MENU.has(id)) return ctx === 'menu' || ctx === 'dialog';
    const riding = ctx === 'play' && api.riding && api.riding();
    if (RIDE.has(id)) return riding;
    if (riding && bind.split('&').some(p => rideIn.has(p))) return false;   // on her back those buttons are her vines
    if (ctx === 'menu' && bind.split('&').some(isPad) && BY_ID[id].group !== 'Menus') return false;   // (Options still pauses and unpauses)
    if (ctx !== 'play') for (const m of MENU) if (!OSK_ONLY.has(m) && map[m].includes(bind)) return false;   // that input is the menu's now
    return true;
  }

  function resolve() {
    const ctx = capture ? 'capture' : context();
    const want = new Map(), hitB = new Set();
    if (ctx !== 'capture') {
      for (const c of chords) {
        if (!down.has(c.a) || !down.has(c.b) || !enabled(c.id, c.bind, ctx)) continue;
        want.set(c.id, c.bind); hitB.add(c.b); modUsed[c.a] = true;
      }
      const liveMods = new Set(chords.filter(c => enabled(c.id, c.bind, ctx)).map(c => c.a));
      for (const inp of down) {
        if (hitB.has(inp) || liveMods.has(inp)) continue;   // a combo button acts on its own only when let go
        for (const id of singles.get(inp) || []) if (!want.has(id) && enabled(id, inp, ctx)) want.set(id, inp);
      }
    }
    for (const [id] of active) if (!want.has(id)) { active.delete(id); release(id); }
    for (const [id, b] of want) if (!active.has(id)) { active.set(id, b); press(id, b); }
  }

  /* a button that starts a combo, tapped and let go with no combo made: its own actions, for a moment */
  function tapped(inp) {
    const ctx = context();
    if (modUsed[inp]) return;
    if (!chords.some(c => c.a === inp && enabled(c.id, c.bind, ctx))) return;
    for (const id of singles.get(inp) || []) if (!active.has(id) && enabled(id, inp, ctx)) { press(id, inp); pulses.push(id); }
  }

  function set(inp, on) {
    if (on === down.has(inp)) return;
    if (capture) { captureInput(inp, on); return; }
    if (on) { down.add(inp); modUsed[inp] = false; resolve(); }
    else { down.delete(inp); resolve(); if (mods.has(inp)) tapped(inp); }
  }

  /* ---------------- telling the game ---------------- */
  let sprintLatch = false, stillT = 0;
  const menuHold = {};   // a menu direction held: when it next repeats
  function press(id, via) {
    const a = BY_ID[id];
    if (MENU.has(id)) { menuPress(id, via); return; }
    if (id === 'sprint' && (opt.sprint === 'toggle' || (opt.sprint === 'auto' && isPad(via)))) { latchPress = true; sprintLatch = !sprintLatch; stillT = 0; api.keys.ShiftLeft = sprintLatch; return; }
    if (LOOK[id]) return;
    if (id === 'zoom_in' || id === 'zoom_out') { api.zoom(id === 'zoom_in' ? -1 : 1); zoomHeld[id] = 0; return; }
    const c = a.code;
    if (/^Mouse\d$/.test(c)) { api.mouse(+c[5], true); return; }
    api.keys[c] = true;
    api.onKey(c);
  }
  function release(id) {
    const a = BY_ID[id];
    if (MENU.has(id)) { delete menuHold[id]; return; }
    if (id === 'sprint' && latchPress) { latchPress = false; return; }   // on a toggle: letting go changes nothing
    if (LOOK[id] || id === 'zoom_in' || id === 'zoom_out') { delete zoomHeld[id]; return; }
    const c = a.code;
    if (/^Mouse\d$/.test(c)) { api.mouse(+c[5], false); return; }
    // still held through another of its bindings? (both Shifts, say) then it stays down
    api.keys[c] = false;
    api.onRelease && api.onRelease(c);
  }
  let latchPress = false;
  const zoomHeld = {};

  /* ---------------- the controller ---------------- */
  let padName = '', padStyle = 'ps', lastPad = {};
  addEventListener('gamepadconnected', e => { padName = e.gamepad.id; padStyle = styleOf(padName); api.toast && api.toast(`Controller connected — ${shortName(padName)}. Pause → Controls to change the buttons.`, 3.5); });
  addEventListener('gamepaddisconnected', () => { padName = ''; for (const k of Object.keys(lastPad)) set(k, false); lastPad = {}; });
  const styleOf = id => opt.glyphs === 'xbox' ? 'xbox' : opt.glyphs === 'ps' ? 'ps' : /xbox|xinput|045e/i.test(id) ? 'xbox' : 'ps';
  const shortName = id => (id || 'controller').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'controller';

  function readPads() {
    const now = {};
    let pads = [];
    try { pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; } catch (e) { /* not allowed here */ }
    for (const g of pads) {
      if (!g || !g.connected) continue;
      if (!padName) { padName = g.id; padStyle = styleOf(g.id); }
      g.buttons.forEach((b, i) => { const v = typeof b === 'object' ? b.value : b; const p = typeof b === 'object' ? b.pressed : b > 0.5; if (p || v > 0.35) now['P:b' + i] = Math.max(now['P:b' + i] || 0, v || 1); });
      g.axes.forEach((v, i) => {
        const m = Math.abs(v); if (m <= opt.dead) return;
        const k = 'P:a' + i + (v < 0 ? '-' : '+');
        now[k] = Math.max(now[k] || 0, Math.min(1, (m - opt.dead) / (1 - opt.dead)));
      });
    }
    return now;
  }

  let lastCtx = '';
  function poll(dt) {
    const now = readPads();
    for (const k in axisVal) delete axisVal[k];
    const next = {};
    for (const k in now) {
      if (isAxis(k)) { axisVal[k] = now[k]; if (now[k] > 0.3) device = 'pad'; }
      if (!isAxis(k) || now[k] > (lastPad[k] ? 0.3 : 0.5)) next[k] = 1;   // a little give, so a stick held near the line doesn't chatter
    }
    const prev = lastPad; lastPad = next;
    if (!capture) {
      for (const k in prev) if (!next[k]) set(k, false);
      for (const k in next) if (!prev[k]) { device = 'pad'; if (api.wake) api.wake(); set(k, true); }
    }
    const ctx = capture ? 'capture' : context();
    const ck = ctx + (api.riding && api.riding() ? ':ride' : '') + (oskOpen() ? ':osk' : '');
    if (ck !== lastCtx) { lastCtx = ck; resolve(); }   // a menu opened, or you got on or off her, under a held button   // a menu opened (or shut) under a held button
    // a combo button tapped on its own: let go of it again now
    if (pulses.length) { const p = pulses; pulses = []; for (const id of p) if (!active.has(id)) release(id); }
    // menu directions repeat while held
    if (ctx === 'menu' || ctx === 'dialog') for (const id of ['ui_up', 'ui_down', 'ui_left', 'ui_right', 'ui_del']) {
      if (!active.has(id)) continue;
      menuHold[id] = (menuHold[id] ?? 0.4) - dt;
      if (menuHold[id] <= 0) { menuHold[id] = 0.11; menuPress(id, active.get(id), true); }
    }
    if (ctx === 'menu') menuTick(dt);
    else if (cur || curRoot) { focus(null); curRoot = null; }
    // held zoom (not the wheel: each notch of that is one step)
    for (const id of ['zoom_in', 'zoom_out']) if (active.has(id) && !active.get(id).startsWith('W:')) { zoomHeld[id] = (zoomHeld[id] || 0) + dt; if (zoomHeld[id] > 0.2) api.zoom((id === 'zoom_in' ? -1 : 1) * dt * 6, true); }
    // sprint on a toggle lets go when you stop moving
    if (sprintLatch) { const m = stick(); const moving = Math.hypot(m.x, m.y) > 0.2 || ['KeyW', 'KeyA', 'KeyS', 'KeyD'].some(c => api.keys[c]); stillT = moving ? 0 : stillT + dt; if (stillT > 0.35 || ctx !== 'play') { sprintLatch = false; api.keys.ShiftLeft = false; } }
    if (capture) captureTick(dt, now);
  }

  /* ---------------- analog: the move stick and the look stick ---------------- */
  function vec(table) {
    let x = 0, y = 0;
    for (const id in table) {
      let v = 0;
      for (const b of map[id]) if (isAxis(b)) v = Math.max(v, axisVal[b] || 0);
      x += table[id][0] * v; y += table[id][1] * v;
    }
    return { x, y };
  }
  function stick() { return context() === 'play' && !capture ? vec(MOVE) : { x: 0, y: 0 }; }
  function look() {
    if (context() === 'menu' || capture) return { x: 0, y: 0 };
    const v = vec(LOOK);
    for (const id in LOOK) if (active.has(id)) { v.x += LOOK[id][0]; v.y += LOOK[id][1]; }   // keys on a look action
    // a curve: fine aim near the middle, quick turns at the edge
    const m = Math.hypot(v.x, v.y); if (m > 1) { v.x /= m; v.y /= m; }
    const k = Math.min(1, m) ** 0.8 / (m || 1);
    return { x: v.x * k * opt.look, y: v.y * k * opt.look * (opt.invert ? -1 : 1) };
  }

  /* ---------------- keyboard and mouse, from the game's own listeners ---------------- */
  function key(code, on) {
    device = 'kbm';
    const inp = 'K:' + code;
    if (capture) { set(inp, on); return true; }
    const bound = singles.has(inp) || mods.has(inp) || chords.some(c => c.b === inp);
    if (!bound) {   // a key on nothing: it still means itself (Enter, say), unless it's a code an action now owns elsewhere
      if (CODES.has(code)) return true;
      return false;
    }
    set(inp, on);
    return true;
  }
  function mouse(button, on) { device = 'kbm'; set('M:' + button, on); }
  function wheel(dy) { device = 'kbm'; const inp = dy < 0 ? 'W:up' : 'W:down'; set(inp, true); set(inp, false); }
  function releaseAll() { for (const k of [...down]) set(k, false); lastPad = {}; }

  /* ================================================================
     MENUS WITH A CONTROLLER: a highlight that moves between the
     buttons, sliders, checkboxes and lists of whatever's open
     ================================================================ */
  let cur = null, curRoot = null, cursor = null, cpos = null;
  const style = document.createElement('style');
  style.textContent = `
    .padfocus{outline:3px solid #f3cf7a !important;outline-offset:3px;box-shadow:0 0 0 6px rgba(243,207,122,.25),0 0 18px rgba(243,207,122,.55) !important;border-radius:6px}
    #pad-cursor{position:fixed;z-index:10001;width:22px;height:22px;margin:-11px 0 0 -11px;border:2px solid #f3cf7a;border-radius:50%;box-shadow:0 0 10px #f3cf7a;pointer-events:none;display:none}
    #pad-cursor::after{content:'';position:absolute;left:8px;top:8px;width:2px;height:2px;background:#f3cf7a;border-radius:50%}
    #ctl{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(5,8,16,.72);backdrop-filter:blur(3px)}
    #ctl .panel{width:min(860px,96vw);max-height:92vh;display:flex;flex-direction:column;padding:22px 24px}
    #ctl h2{margin-bottom:6px}
    #ctl .ctl-pad{text-align:center;color:var(--ink-dim);font-size:14px;margin-bottom:10px}
    #ctl .ctl-pad b{color:var(--brass2)}
    #ctl .ctl-list{overflow:auto;padding:4px 8px 8px 4px;flex:1;min-height:0}
    #ctl h3{font-family:var(--display);color:var(--brass);font-size:14px;letter-spacing:.14em;text-transform:uppercase;margin:16px 0 6px;border-bottom:1px solid rgba(217,164,65,.25);padding-bottom:4px}
    #ctl .ctl-row{display:grid;grid-template-columns:minmax(150px,1.1fr) 2fr;gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)}
    #ctl .ctl-name{font-size:15px}
    #ctl .ctl-binds{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
    #ctl .ctl-chip{font-family:var(--display);font-size:12px;letter-spacing:.03em;background:rgba(217,164,65,.14);color:var(--brass2);border:1px solid var(--brass-dim);border-radius:6px;padding:4px 8px;cursor:pointer}
    #ctl .ctl-chip.pad{background:rgba(122,216,255,.12);color:#bfeaff;border-color:#3d7a92}
    #ctl .ctl-chip:hover{text-decoration:line-through;filter:brightness(1.2)}
    #ctl .ctl-add{font-size:12px;padding:4px 10px;border-radius:6px;border:1px dashed var(--brass-dim);background:transparent;color:var(--ink-dim);cursor:pointer;font-family:var(--display)}
    #ctl .ctl-add:hover{color:var(--brass2);border-color:var(--brass)}
    #ctl .ctl-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:4px 22px;margin-bottom:6px}
    #ctl .ctl-opts .row{margin:5px 0;font-size:15px}
    #ctl .ctl-opts select{font:inherit;font-size:14px;background:var(--navy2);color:var(--ink);border:1px solid var(--brass-dim);border-radius:5px;padding:2px 6px}
    #ctl .ctl-hint{font-size:13px;color:var(--ink-dim);text-align:center;margin-top:8px}
    #ctl .btn{padding:9px 18px;font-size:13px}
    #ctl-wait{position:fixed;inset:0;z-index:61;display:flex;align-items:center;justify-content:center;background:rgba(5,8,16,.6)}
    #ctl-wait .panel{text-align:center;width:min(440px,92vw)}
    #ctl-wait .ctl-bar{height:4px;background:var(--brass);margin-top:14px;border-radius:2px;transform-origin:left}
    @media (max-width:600px){ #ctl .ctl-row{grid-template-columns:1fr} }
    #osk{position:fixed;left:0;right:0;bottom:3vh;z-index:10002;display:flex;justify-content:center;pointer-events:none}
    #osk.hidden{display:none}
    #osk .panel{pointer-events:auto;padding:14px 16px;width:min(720px,96vw)}
    #osk .osk-text{font-size:20px;min-height:34px;padding:4px 10px;margin-bottom:10px;border-bottom:1px solid var(--brass-dim);color:var(--ink);white-space:pre}
    #osk .osk-caret{color:var(--brass);animation:oskb 1s steps(1) infinite}
    @keyframes oskb{50%{opacity:0}}
    #osk .osk-row{display:flex;gap:6px;justify-content:center;margin:6px 0}
    #osk .osk-k{flex:1;max-width:58px;height:42px;font:600 16px var(--display);background:rgba(217,164,65,.12);color:var(--brass2);border:1px solid var(--brass-dim);border-radius:7px;cursor:pointer}
    #osk .osk-k.wide{max-width:300px;flex:5}
    #osk .osk-k.on,#osk .osk-k.done{background:var(--brass);color:var(--navy)}
    #osk .osk-k[data-k="⌫"],#osk .osk-k[data-k="✓"],#osk .osk-k[data-k="⇧"]{max-width:120px;flex:2;font-size:13px}
    #osk .osk-hint{text-align:center;font-size:12px;color:var(--ink-dim);margin-top:6px}
  `;
  document.head.appendChild(style);

  function visible(el) {
    if (el.disabled || el.closest('.hidden')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.pointerEvents !== 'none';
  }
  function clickable(el) {
    if (/^(BUTTON|SELECT|CANVAS|TEXTAREA)$/.test(el.tagName)) return true;
    if (el.tagName === 'A' && el.hasAttribute('href')) return true;
    if (el.tagName === 'INPUT' && el.type !== 'hidden') return true;
    if (el.onclick || el.hasAttribute('data-nav')) return true;
    return getComputedStyle(el).cursor === 'pointer' && !(el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer' && !el.parentElement.onclick && el.parentElement !== el.closest('[data-root]'));
  }
  function candidates(root) {
    const all = [...root.querySelectorAll('*')].filter(e => clickable(e) && visible(e));
    // the innermost thing you'd click: a card that holds buttons gives way to its buttons
    return all.filter(e => !all.some(o => o !== e && e.contains(o)));
  }
  const centre = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };
  function focus(el) {
    if (cur && cur !== el) cur.classList.remove('padfocus');
    cur = el;
    if (!el) { showCursor(false); return; }
    if (device === 'pad') el.classList.add('padfocus');
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* ignore */ }
    if (el.tagName === 'CANVAS') { const c = centre(el); cpos = { x: c.x, y: c.y }; showCursor(true); } else showCursor(false);
  }
  function showCursor(on) {
    if (!cursor) { cursor = document.createElement('div'); cursor.id = 'pad-cursor'; document.body.appendChild(cursor); }
    cursor.style.display = on ? 'block' : 'none';
    if (on && cpos) { cursor.style.left = cpos.x + 'px'; cursor.style.top = cpos.y + 'px'; }
  }
  function firstFocus(root) {
    const c = candidates(root); if (!c.length) return null;
    return c.find(e => e.classList.contains('padfocus-first')) || c.find(e => e.classList.contains('btn') && !e.classList.contains('ghost') && !e.disabled) || c.find(e => e.classList.contains('btn')) || c[0];
  }
  function menuRoot() { return capture ? null : oskOpen() ? osk : (screen && !screen.classList.contains('hidden') ? screen : api.menuRoot()); }
  function menuTick(dt) {
    const root = menuRoot();
    if (root !== curRoot) { curRoot = root; focus(null); }
    if (!root) return;
    if (!cur || !root.contains(cur) || !visible(cur)) focus(firstFocus(root));
    else if (device === 'pad') cur.classList.add('padfocus');
    else cur.classList.remove('padfocus');
    // the right stick scrolls; the left one steers the map's pointer
    let sy = 0; for (const b of map.ui_sdown) sy += axisVal[b] || 0; for (const b of map.ui_sup) sy -= axisVal[b] || 0;
    if (active.has('ui_sdown') && !isAxis(active.get('ui_sdown'))) sy += 1;
    if (active.has('ui_sup') && !isAxis(active.get('ui_sup'))) sy -= 1;
    if (sy) { const sc = scroller(cur || root, root); if (sc) sc.scrollTop += sy * 900 * dt; }
    if (cur && cur.tagName === 'CANVAS' && cpos) {
      let x = 0, y = 0;
      for (const b of map.ui_right) x += axisVal[b] || 0; for (const b of map.ui_left) x -= axisVal[b] || 0;
      for (const b of map.ui_down) y += axisVal[b] || 0; for (const b of map.ui_up) y -= axisVal[b] || 0;
      const r = cur.getBoundingClientRect();
      cpos.x = Math.max(r.left, Math.min(r.right, cpos.x + x * 420 * dt)); cpos.y = Math.max(r.top, Math.min(r.bottom, cpos.y + y * 420 * dt));
      showCursor(true);
    }
  }
  function scroller(from, root) {
    for (let e = from; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (e.scrollHeight > e.clientHeight + 2 && /(auto|scroll)/.test(cs.overflowY)) return e;
      if (e === root) break;
    }
    return [...root.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) || null;
  }
  function moveFocus(dx, dy) {
    const root = menuRoot(); if (!root) return;
    if (!cur) { focus(firstFocus(root)); return; }
    const a = centre(cur), list = candidates(root);
    let best = null, bs = Infinity, bestIn = null, bsIn = Infinity;
    for (const e of list) {
      if (e === cur) continue;
      const b = centre(e), vx = b.x - a.x, vy = b.y - a.y;
      const along = vx * dx + vy * dy, across = Math.abs(vx * dy - vy * dx);
      if (along <= 4) continue;
      const s = along + across * 2.2;
      if (s < bs) { bs = s; best = e; }
      // something in the same row (or column) straight ahead wins over a nearer one off to the side
      const overlap = dx ? (b.r.bottom > a.r.top + 2 && b.r.top < a.r.bottom - 2) : (b.r.right > a.r.left + 2 && b.r.left < a.r.right - 2);
      if (overlap && along < bsIn) { bsIn = along; bestIn = e; }
    }
    if (bestIn) best = bestIn;
    if (best) { focus(best); api.sfx && api.sfx(); }
  }
  function adjust(el, dir) {
    if (el.tagName === 'SELECT') {
      const n = el.options.length; if (!n) return true;
      el.selectedIndex = Math.max(0, Math.min(n - 1, el.selectedIndex + dir));
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    if (el.tagName === 'INPUT' && el.type === 'range') {
      const st = +el.step || 1, v = Math.max(+el.min || 0, Math.min(+el.max || 100, +el.value + dir * st * 2));
      el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }
  function menuPress(id, via, repeat) {
    const ctx = context();
    if (ctx === 'dialog') {   // talk: the answers go up and down, choose, or the last (leave)
      if (id === 'ui_up') api.onKey('ArrowUp');
      else if (id === 'ui_down') api.onKey('ArrowDown');
      else if (id === 'ui_ok') api.onKey('Enter');
      else if (id === 'ui_back' && !repeat) api.onKey('Escape');
      return;
    }
    if (ctx !== 'menu') return;
    device = 'pad';
    const root = menuRoot(); if (!root) return;
    if (!cur || !root.contains(cur)) focus(firstFocus(root));
    const onCanvas = cur && cur.tagName === 'CANVAS' && isAxis(via || '');
    switch (id) {
      case 'ui_up': if (!onCanvas) moveFocus(0, -1); break;
      case 'ui_down': if (!onCanvas) moveFocus(0, 1); break;
      case 'ui_left': if (onCanvas) break; if (!(cur && adjust(cur, -1))) moveFocus(-1, 0); break;
      case 'ui_right': if (onCanvas) break; if (!(cur && adjust(cur, 1))) moveFocus(1, 0); break;
      case 'ui_ok': if (repeat || !cur) break; activate(cur); break;
      case 'ui_back': if (repeat) break; if (root === osk) closeOsk(false); else if (root === screen) closeScreen(); else api.menuBack(root); break;
      case 'ui_del': oskType('⌫'); break;
      case 'ui_space': if (!repeat) oskType(' '); break;
      case 'ui_prev': case 'ui_next': if (!repeat) tab(root, id === 'ui_next' ? 1 : -1); break;
    }
  }
  function activate(el) {
    if (el.tagName === 'CANVAS' && cpos) {
      const o = { bubbles: true, cancelable: true, clientX: cpos.x, clientY: cpos.y, button: 0 };
      el.dispatchEvent(new MouseEvent('mousedown', o)); el.dispatchEvent(new MouseEvent('mouseup', o)); el.dispatchEvent(new MouseEvent('click', o));
      return;
    }
    if (el.tagName === 'SELECT') { adjust(el, 1); return; }
    if (isText(el)) { openOsk(el); return; }
    api.sfx && api.sfx();
    el.click();
  }
  function tab(root, dir) {
    const tabs = [...root.querySelectorAll('.rtab, [data-tab]')].filter(visible);
    if (tabs.length < 2) return;
    let i = tabs.findIndex(t => t.classList.contains('on') || t.classList.contains('active'));
    if (i < 0) i = 0;
    tabs[(i + dir + tabs.length) % tabs.length].click();
    focus(null);
    api.sfx && api.sfx();
  }


  /* ================================================================
     THE ON-SCREEN KEYBOARD: a text box chosen with a controller (or
     one that takes the cursor while you're playing with one) brings
     it up. ✕ types the key under the highlight, □ deletes, △ is a
     space, ○ puts it away; Done is Enter.
     ================================================================ */
  let osk = null, oskEl = null, oskShift = false;
  const isText = el => !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|email|password|number|)$/.test(el.type || '')));
  function oskOpen() { return !!osk && !osk.classList.contains('hidden'); }
  const ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl\'', '⇧zxcvbnm-.', ' ⌫✓'];
  function renderOsk() {
    const show = oskEl ? (oskEl.type === 'password' ? '•'.repeat(oskEl.value.length) : oskEl.value) : '';
    osk.innerHTML = `<div class="panel brass"><div class="osk-text">${esc(show)}<span class="osk-caret">▏</span></div>` +
      ROWS.map(r => `<div class="osk-row">` + [...r].map(k => {
        const name = k === ' ' ? 'Space' : k === '⌫' ? '⌫ Delete' : k === '✓' ? 'Done' : k === '⇧' ? '⇧ Shift' : oskShift ? k.toUpperCase() : k;
        return `<button type="button" class="osk-k${k === ' ' ? ' wide' : ''}${k === '⇧' && oskShift ? ' on' : ''}${k === '✓' ? ' done' : ''}" data-k="${esc(k)}">${esc(name)}</button>`;
      }).join('') + `</div>`).join('') +
      `<div class="osk-hint">✕ type · □ delete · △ space · ○ close</div></div>`;
    osk.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => oskType(b.dataset.k); });
  }
  function openOsk(el) {
    if (oskOpen() && oskEl === el) return;
    oskEl = el; oskShift = false;
    if (!osk) {
      osk = document.createElement('div'); osk.id = 'osk'; osk.setAttribute('data-root', '');
      osk.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });   // (and keep the text box's cursor)
      document.body.appendChild(osk);
    }
    osk.classList.remove('hidden'); renderOsk();
    const q = osk.querySelector('[data-k="q"]'); focus(q); curRoot = osk;
  }
  function closeOsk(enter) {
    if (!oskOpen()) return;
    osk.classList.add('hidden'); focus(null); curRoot = null;
    const el = oskEl; oskEl = null;
    if (el && enter) {
      const o = { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true };
      el.dispatchEvent(new KeyboardEvent('keydown', o)); el.dispatchEvent(new KeyboardEvent('keyup', o));
      if (el.form && document.contains(el)) { try { el.form.requestSubmit(); } catch (e) { /* ignore */ } }
    }
  }
  function oskType(k) {
    if (!oskOpen() || !oskEl) return;
    const el = oskEl;
    if (k === '✓') { closeOsk(true); return; }
    if (k === '⇧') { oskShift = !oskShift; const f = cur && cur.dataset.k; renderOsk(); const b = osk.querySelector(`[data-k="${CSS.escape(f || 'q')}"]`); if (b) focus(b); return; }
    let v = el.value;
    if (k === '⌫') v = v.slice(0, -1);
    else { const max = el.maxLength > 0 ? el.maxLength : 1e9; if (v.length >= max) return; v += oskShift ? k.toUpperCase() : k; if (oskShift && k !== ' ') oskShift = false; }
    el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
    const f = cur && cur.dataset.k; renderOsk();
    const b = osk.querySelector(`[data-k="${CSS.escape(f || 'q')}"]`); if (b) focus(b);
    api.sfx && api.sfx();
  }
  // a text box that takes the cursor while you're on a controller brings the keyboard up by itself
  addEventListener('focusin', e => { if (device === 'pad' && isText(e.target) && !(osk && osk.contains(e.target))) setTimeout(() => { if (document.activeElement === e.target) openOsk(e.target); }, 0); });
  // the box it was typing into went away (the panel closed): so does the keyboard
  setInterval(() => { if (oskOpen() && (!oskEl || !document.contains(oskEl))) closeOsk(false); }, 300);

  /* ================================================================
     THE MAPPING SCREEN
     ================================================================ */
  let screen = null, onClose = null;
  function nameOf(b) {
    return b.split('&').map(p => {
      const [t, v] = [p.slice(0, 1), p.slice(2)];
      if (t === 'K') return KEYNAME[v] || v.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');
      if (t === 'M') return MOUSENAME[+v] || 'Mouse ' + v;
      if (t === 'W') return v === 'up' ? 'Wheel up' : 'Wheel down';
      if (v[0] === 'b') { const i = +v.slice(1); return (padStyle === 'xbox' ? XB : PS)[i] || 'Button ' + i; }
      const i = +v.slice(1, -1), s = v.slice(-1) === '-' ? 0 : 1;
      return AXES[i] ? AXES[i].split('|')[s] : `Axis ${i} ${s ? '+' : '−'}`;
    }).join(' + ');
  }
  /* the name of what to press for an action, on whatever you're playing with now */
  function label(id, short) {
    const bs = map[id] || [];
    const want = device === 'pad' ? bs.find(isPad) : bs.find(b => !isPad(b));
    const b = want || bs[0];
    if (!b) return '—';
    const n = nameOf(b);
    return short ? n.replace(/D-pad /g, '').replace(/ \+ /g, '+').replace(/Left stick /, 'LS').replace(/Right stick /, 'RS') : n;
  }

  function openScreen(cb) {
    onClose = cb || null;
    if (!screen) {
      screen = document.createElement('div'); screen.id = 'ctl'; screen.className = 'hidden'; screen.setAttribute('data-root', '');
      screen.addEventListener('mousedown', e => e.stopPropagation());
      document.body.appendChild(screen);
    }
    screen.classList.remove('hidden');
    renderScreen();
  }
  function closeScreen() {
    if (!screen) return;
    screen.classList.add('hidden'); focus(null); curRoot = null;
    if (onClose) { const f = onClose; onClose = null; f(); }
  }
  function renderScreen(keepFocus) {
    const list0 = screen.querySelector('.ctl-list'), scroll = list0 ? list0.scrollTop : 0;
    const fid = keepFocus && cur && cur.dataset ? (cur.dataset.add || cur.dataset.del || cur.id) : null;
    let h = `<div class="panel brass"><h2>Controls</h2>
      <div class="ctl-pad">${padName ? `Controller: <b>${esc(shortName(padName))}</b>` : 'No controller found yet — plug one in (or pair it) and press any button on it.'}</div>
      <div class="ctl-opts">
        <div class="row"><span>Stick look speed</span><input type="range" id="ctl-look" min="0.3" max="2.5" step="0.05" value="${opt.look}"></div>
        <div class="row"><span>Stick dead zone</span><input type="range" id="ctl-dead" min="0.05" max="0.45" step="0.01" value="${opt.dead}"></div>
        <div class="row"><span>Invert stick look up/down</span><input type="checkbox" id="ctl-inv"${opt.invert ? ' checked' : ''}></div>
        <div class="row"><span>Sprint</span><select id="ctl-sprint">${[['auto', 'Toggle on a controller'], ['hold', 'Hold'], ['toggle', 'Toggle']].map(([v, l]) => `<option value="${v}"${opt.sprint === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="row"><span>Button names</span><select id="ctl-glyph">${[['auto', 'Match the controller'], ['ps', 'PlayStation'], ['xbox', 'Xbox']].map(([v, l]) => `<option value="${v}"${opt.glyphs === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      </div>
      <div class="ctl-list">`;
    let group = '';
    for (const a of ACTIONS) {
      if (a.group !== group) { group = a.group; h += `<h3>${esc(group)}</h3>`; }
      h += `<div class="ctl-row"><div class="ctl-name">${esc(a.name)}</div><div class="ctl-binds">` +
        map[a.id].map((b, i) => `<button type="button" class="ctl-chip${b.split('&').some(isPad) ? ' pad' : ''}" data-del="${a.id}:${i}" title="Remove">${esc(nameOf(b))}</button>`).join('') +
        `<button type="button" class="ctl-add" data-add="${a.id}">+ add</button></div></div>`;
    }
    h += `</div>
      <div class="ctl-hint">Click a binding to remove it. <b>+ add</b>, then press a key, mouse button, wheel, controller button or stick — or hold one and press another for a combo. A combo’s first button does its own job when you tap it and let go.</div>
      <div class="btn-row"><button class="btn ghost" id="ctl-reset">Reset to defaults</button><button class="btn" id="ctl-done">Done</button></div></div>`;
    screen.innerHTML = h;
    const list = screen.querySelector('.ctl-list'); list.scrollTop = scroll;
    screen.querySelector('#ctl-done').onclick = closeScreen;
    screen.querySelector('#ctl-reset').onclick = () => { for (const a of ACTIONS) map[a.id] = a.def.slice(); rebuild(); save(); renderScreen(true); api.toast && api.toast('Controls back to the defaults.', 2); };
    screen.querySelector('#ctl-look').oninput = e => { opt.look = +e.target.value; save(); };
    screen.querySelector('#ctl-dead').oninput = e => { opt.dead = +e.target.value; save(); };
    screen.querySelector('#ctl-inv').onchange = e => { opt.invert = e.target.checked; save(); };
    screen.querySelector('#ctl-sprint').onchange = e => { opt.sprint = e.target.value; save(); };
    screen.querySelector('#ctl-glyph').onchange = e => { opt.glyphs = e.target.value; padStyle = styleOf(padName); save(); renderScreen(true); };
    screen.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => {
      const [id, i] = b.dataset.del.split(':'); map[id].splice(+i, 1); rebuild(); save(); renderScreen(true);
      const next = screen.querySelector(`[data-del="${id}:${i}"]`) || screen.querySelector(`[data-add="${id}"]`); if (next) focus(next);
    }; });
    screen.querySelectorAll('[data-add]').forEach(b => { b.onclick = () => startCapture(b.dataset.add); });
    if (fid) { const el = screen.querySelector(`[data-add="${fid}"], [data-del="${fid}"], #${CSS.escape(fid)}`); if (el) focus(el); }
  }

  /* waiting for a press: everything you hold goes into the binding, and it's made when you let go */
  let wait = null;
  function startCapture(id) {
    releaseAll();
    capture = { id, held: [], seen: [], t: 7, armed: 0.25, base: null };
    wait = document.createElement('div'); wait.id = 'ctl-wait';
    wait.innerHTML = `<div class="panel brass"><h2 style="font-size:22px">${esc(BY_ID[id].name)}</h2><p>Press a key, mouse button or wheel, or a controller button or stick.<br><span style="color:var(--ink-dim);font-size:14px">Hold one and press another for a combo.</span></p><div class="ctl-bar"></div><div class="btn-row"><button class="btn ghost" id="ctl-cancel">Cancel</button></div></div>`;
    document.body.appendChild(wait);
    wait.querySelector('#ctl-cancel').onclick = () => endCapture(null);
  }
  function captureInput(inp, on) {
    const C = capture;
    if (C.armed > 0) return;   // the press that opened this isn't the binding
    if (on) { if (!C.held.includes(inp)) C.held.push(inp); if (!C.seen.includes(inp)) C.seen.push(inp); }
    else { C.held = C.held.filter(x => x !== inp); if (!C.held.length && C.seen.length) endCapture(C.seen.slice(-2).join('&')); }
  }
  function captureTick(dt, now) {
    const C = capture; if (!C) return;
    C.armed -= dt; C.t -= dt;
    // controller buttons and sticks, read straight from the pad
    if (!C.base) C.base = { ...now };
    const live = new Set(Object.keys(now).filter(k => isAxis(k) ? now[k] > 0.6 : true));
    if (C.armed <= 0) {
      for (const k of live) if (!C.pad || !C.pad.has(k)) captureInput(k, true);
      if (C.pad) for (const k of C.pad) if (!live.has(k) && capture) captureInput(k, false);
    }
    if (capture) capture.pad = live;
    const bar = wait && wait.querySelector('.ctl-bar'); if (bar) bar.style.transform = `scaleX(${Math.max(0, C.t / 7)})`;
    if (C.t <= 0 && capture) endCapture(null);
  }
  function endCapture(bind) {
    const C = capture; if (!C) return;
    capture = null; if (wait) { wait.remove(); wait = null; }
    lastPad = {}; down.clear(); active.clear();
    if (bind) {
      const list = map[C.id];
      if (!list.includes(bind)) list.push(bind);
      rebuild(); save();
      api.toast && api.toast(`${BY_ID[C.id].name}: ${nameOf(bind)}`, 1.8);
    }
    renderScreen(true);
    const el = screen.querySelector(`[data-add="${C.id}"]`); if (el) focus(el);
  }
  // keys and mouse while the mapping screen waits (the game's own listeners send them here too, but a key
  // like Tab or Escape should never do anything else meanwhile)
  addEventListener('keydown', e => { if (!capture && e.code === 'Escape' && screen && !screen.classList.contains('hidden')) { e.stopImmediatePropagation(); closeScreen(); return; } if (!capture) return; e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat && capture.armed <= 0) captureInput('K:' + e.code, true); }, true);
  addEventListener('keyup', e => { if (!capture) return; e.preventDefault(); e.stopImmediatePropagation(); captureInput('K:' + e.code, false); }, true);
  const onCancel = e => !!(e.target && e.target.closest && e.target.closest('#ctl-cancel'));
  addEventListener('mousedown', e => { if (!capture || onCancel(e)) return; e.preventDefault(); e.stopImmediatePropagation(); captureInput('M:' + e.button, true); }, true);
  addEventListener('mouseup', e => { if (!capture || onCancel(e)) return; e.preventDefault(); e.stopImmediatePropagation(); captureInput('M:' + e.button, false); }, true);
  addEventListener('wheel', e => { if (!capture) return; e.stopImmediatePropagation(); const k = e.deltaY < 0 ? 'W:up' : 'W:down'; captureInput(k, true); if (capture) captureInput(k, false); }, { capture: true, passive: true });
  addEventListener('mousemove', e => { if (device === 'pad' && Math.hypot(e.movementX || 0, e.movementY || 0) > 3) { device = 'kbm'; if (cur) cur.classList.remove('padfocus'); } }, { passive: true });

  return {
    poll, key, mouse, wheel, releaseAll, stick, look, label,
    open: openScreen, close: closeScreen,
    isOpen: () => (!!screen && !screen.classList.contains('hidden')) || oskOpen(),
    keyboard: el => openOsk(el),
    capturing: () => !!capture,
    get device() { return device; },
    get padName() { return padName; },
    get version() { return version; },
    held: id => active.has(id),
  };
}
