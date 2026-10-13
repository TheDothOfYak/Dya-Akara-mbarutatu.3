/* ============================================================
   Touch controls for phones and tablets.
   Left thumb: a floating joystick (push it all the way to run).
   Right thumb: drag anywhere to look around.
   Buttons: attack, dodge, jump/glide, Duat strike, interact, and
   the rest of Torcain's kit; a Dya'Akara row during a match.
   Turns itself on at the first touch, so a mouse-and-keyboard
   player never sees it.
   ============================================================ */

const BTN = [
  // [id, label, code-or-action, hold?, group]
  ['attack', '⚔', 'attack', true, 'main'],
  ['jump', '⤒', 'Space', true, 'main'],
  ['dodge', '⤿', 'KeyC', true, 'main'],
  ['duat', '🜂', 'duat', false, 'main'],
  ['use', 'E', 'KeyE', false, 'main'],
  ['flare', 'Q', 'KeyQ', false, 'kit'],              // the Q quick slot (whatever's on it)
  ['sense', '✧', 'KeyF', false, 'kit'],
  ['hlyst', '◎', 'KeyG', false, 'kit'],
  ['flask', '⚗', 'KeyR', false, 'kit'],
  ['lock', '◉', 'KeyT', false, 'kit'],
  ['throw', '🧨', 'KeyX', false, 'kit'],
  ['kuni', '🪶', 'KeyB', false, 'kit'],
  ['whistle', '♪', 'KeyH', false, 'kit'],
  ['punkatk', '🎃', 'CapsLock', false, 'kit'],        // Brindle attacks, while you ride her
];
const TOP = [['pause', '☰', 'pause'], ['pack', '🎒', 'KeyI'], ['skills', '✦', 'KeyK'], ['quests', '📜', 'KeyJ'], ['map', '🗺', 'KeyM'], ['book', '📖', 'Tab']];
const DYA = [['dq', '◀', 'KeyQ'], ['de', '▶', 'KeyE'], ['dr', 'Ready', 'KeyR'], ['d1', '1', 'Digit1'], ['d2', '2', 'Digit2'], ['d3', '3', 'Digit3'], ['d4', '4', 'Digit4'], ['d5', '5', 'Digit5'], ['dthrow', 'Throw', 'dthrow'], ['dv', 'View', 'KeyV']];

export function initTouch(api) {
  let on = false, root = null, stick = null, knob = null;
  const move = { x: 0, y: 0 };
  let stickId = null, stickO = null, lookId = null, lookLast = null;

  function press(code, down) {
    if (code === 'attack') { if (down) api.attack(true); else api.attack(false); return; }
    if (code === 'duat') { if (down) api.duat(); return; }
    if (code === 'pause') { if (down) api.pause(); return; }
    if (code === 'dthrow') { if (down) api.dyaThrow(); return; }
    if (down) { api.keys[code] = true; api.onKey(code); } else api.keys[code] = false;
  }
  function button(id, label, code, hold, cls) {
    const b = document.createElement('button');
    b.className = 'tb ' + cls; b.id = 'tb-' + id; b.textContent = label; b.type = 'button';
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.classList.add('down'); try { b.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } api.wake(); press(code, true); });
    const up = e => { if (!b.classList.contains('down')) return; e.preventDefault(); b.classList.remove('down'); if (hold) press(code, false); else if (code.startsWith('Key') || code.startsWith('Digit') || code === 'Space') api.keys[code] = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    return b;
  }

  function build() {
    root = document.createElement('div'); root.id = 'touch';
    const main = document.createElement('div'); main.className = 'tcluster';
    const kit = document.createElement('div'); kit.className = 'tkit';
    for (const [id, l, c, h, g] of BTN) (g === 'main' ? main : kit).appendChild(button(id, l, c, h, g === 'main' ? 'big' : 'small'));
    const top = document.createElement('div'); top.className = 'ttop';
    for (const [id, l, c] of TOP) top.appendChild(button(id, l, c, false, 'small'));
    const dya = document.createElement('div'); dya.className = 'tdya';
    for (const [id, l, c] of DYA) dya.appendChild(button(id, l, c, false, 'small wide'));
    stick = document.createElement('div'); stick.className = 'tstick'; knob = document.createElement('div'); knob.className = 'tknob'; stick.appendChild(knob);
    const rot = document.createElement('div'); rot.className = 'trot'; rot.textContent = '⟳ Turn your phone sideways for the best view';
    root.append(main, kit, top, dya, stick, rot);
    document.body.appendChild(root);
  }

  /* the left thumb steers, the right thumb looks */
  function onDown(e) {
    if (!on || e.pointerType === 'mouse') return;
    if (!api.playing()) return;
    const leftZone = e.clientX < innerWidth * 0.42 && e.clientY > innerHeight * 0.3;
    if (leftZone && stickId === null) {
      stickId = e.pointerId; stickO = { x: e.clientX, y: e.clientY };
      stick.style.left = (e.clientX - 60) + 'px'; stick.style.top = (e.clientY - 60) + 'px'; stick.classList.add('on'); knob.style.transform = '';
    } else if (lookId === null) { lookId = e.pointerId; lookLast = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() }; }
  }
  function onMove(e) {
    if (e.pointerId === stickId) {
      let dx = e.clientX - stickO.x, dy = e.clientY - stickO.y; const d = Math.hypot(dx, dy), R = 55;
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      move.x = dx / R; move.y = -dy / R;
      api.keys.ShiftLeft = Math.hypot(move.x, move.y) > 0.95 && d > R * 1.25;   // push past the rim to run
    } else if (e.pointerId === lookId) {
      api.look(e.clientX - lookLast.x, e.clientY - lookLast.y);
      lookLast.x = e.clientX; lookLast.y = e.clientY;
    }
  }
  function onUp(e) {
    if (e.pointerId === stickId) { stickId = null; move.x = move.y = 0; api.keys.ShiftLeft = false; stick.classList.remove('on'); }
    if (e.pointerId === lookId) {
      // a quick tap (not a drag) on the field throws a token in Dya'Akara
      const tap = performance.now() - lookLast.t < 250 && Math.hypot(e.clientX - lookLast.x0, e.clientY - lookLast.y0) < 12;
      lookId = null;
      if (tap) api.tap();
    }
  }

  function enable() {
    if (on) return;
    on = true; document.body.classList.add('touch');
    if (!root) build();
  }
  addEventListener('touchstart', enable, { passive: true, capture: true });
  addEventListener('pointerdown', onDown, { passive: true });
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerup', onUp, { passive: true });
  addEventListener('pointercancel', onUp, { passive: true });

  /* show only the buttons that make sense right now */
  let tick = 0;
  function update(dt) {
    if (!on || !root) return;
    tick -= dt; if (tick > 0) return; tick = 0.2;
    const s = api.state();
    root.classList.toggle('hide', !s.play);
    root.classList.toggle('dya', !!s.dya);
    root.classList.toggle('flying', !!s.flying);
    root.classList.toggle('portrait', innerHeight > innerWidth * 1.1);
    const show = (id, v) => { const el = document.getElementById('tb-' + id); if (el) el.style.display = v ? '' : 'none'; };
    show('use', true); document.getElementById('tb-use').classList.toggle('lit', !!s.prompt);
    show('throw', s.sprengju); show('kuni', s.kuni); show('whistle', s.mount); show('hlyst', s.hlyst);
    document.getElementById('tb-jump').textContent = s.flying ? '⇧' : '⤒';
    document.getElementById('tb-dodge').textContent = s.flying ? '⇩' : '⤿';
  }

  return { get on() { return on; }, move, update, enable };
}
