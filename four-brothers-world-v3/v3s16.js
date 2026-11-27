// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 16: a compact hero maker that previews on hover.
//  * Hover any choice (rock, head, body, arms, cracks, eyes, glow, mouth, face, growths, size, veins, hat, cape...) and
//    your hero shows it at once; move the mouse off and it goes back, unless you clicked. (Moves still animate on hover.)
//  * Choices sit in separate labelled boxes (Body, Head & Hat, Face, Details, Cape). While you hover, a line under the
//    picture says what you're trying on, and head and face choices also get a close-up of your hero's head.
//  * The card grows or shrinks to fill the window without a scrollbar.
(function (RW) {
  'use strict';
  const css = document.createElement('style');
  css.textContent = `
  #creator { padding-block: 4px; overflow: hidden !important; }
  #creator .card { width: min(1200px, 96vw) !important; max-width: none !important; grid-template-columns: minmax(100px, 150px) minmax(0, 1fr); gap: 10px; padding: 8px 12px; }
  #creator .opt { min-height: 0; } #creator .opts { row-gap: 2px !important; } #creator #c-dyn { row-gap: 2px !important; }
  #creator #c-dyn > .label:last-child, #creator .opts > .label:last-of-type:not(.opt *) { display: none; }
  #creator h2 { font-size: 17px; margin: 0 0 2px; }
  #creator .opts { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); column-gap: 16px; row-gap: 3px; align-content: start; }
  #creator .opts > div:first-child, #creator .opts > .row, #creator #c-dyn, #creator .opts > p, #creator .opts > .label { grid-column: 1 / -1; }
  #creator #c-dyn { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); column-gap: 16px; row-gap: 3px; }
  #creator #c-dyn > .label, #creator #c-dyn > p { grid-column: 1 / -1; font-size: 11px !important; margin: -2px 0 0 !important; }
  #creator .opt { grid-template-columns: 62px minmax(0, 1fr); gap: 6px; }
  #creator .opt > .label { font-size: 11px; line-height: 1.1; }
  #creator .chips { gap: 3px; } #creator .chip { font-size: 13px; padding: 1px 6px; border-width: 1px; }
  #creator .swatch { width: 18px; height: 18px; }
  #creator input[type=text] { font-size: 16px; padding: 3px 6px; } #creator .btn { font-size: 15px; padding: 4px 10px; }
  #creator input[type=range] { height: 14px; }
  #creator .card > div:first-child .label { font-size: 11px; }
  #creator #c-dyn { display: none !important; }
  #v3groups { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 8px; align-items: start; }
  #v3groups .v3grp { border: 2px solid #3e3658; background: rgba(40, 34, 60, .35); padding: 4px 8px 6px; display: grid; gap: 3px; }
  #v3groups .v3grph { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #b8a8e8; border-bottom: 1px solid #3e3658; padding-bottom: 2px; margin-bottom: 1px; }
  #v3groups .v3grp > .label { font-size: 11px !important; opacity: .7; }
  #v3groups .v3tail { grid-column: 1 / -1; font-size: 11px !important; opacity: .7; }
  #v3try { font-size: 13px; color: #e8d890; min-height: 1.3em; margin-top: 4px; visibility: hidden; }
  #v3zoom { width: 100%; image-rendering: pixelated; border: 2px solid #3e3658; margin-top: 4px; display: none; background: #120f18; }
  #creator .opts > p, #creator .opts > .label:not(:first-child), #creator #c-dyn ~ .label { font-size: 11px !important; line-height: 1.25; opacity: .7; }
  #creator .opts > div:first-child .label { display: none; }`;
  document.head.appendChild(css);
  // hover to try a choice
  let cLook = null, cSp = 'rock'; const A = RW.art, bD = A.dressed;
  A.dressed = function (species, look) { const cr = document.getElementById('creator'); if (arguments.length < 3 && look && cr && !cr.classList.contains('hidden-ui')) { cLook = look; cSp = species; } return bD.apply(this, arguments); };
  const live = () => cLook; RW.v3dbgLook = live;
  // one listener for the whole maker: whatever chip the mouse is over is tried on; leaving it puts things back
  let cur = null, saved = null, pressed = null;
  const tryable = (b) => { const opt = b.closest('.opt'), lab = opt && opt.querySelector('.label'), name = lab ? lab.textContent.trim().toLowerCase() : ''; return name !== 'species' && name !== 'moves' && typeof b.onclick === 'function'; };
  function undo() {
    if (!cur) return; const L = live();
    if (L && saved) { const old = JSON.parse(saved); Object.keys(L).forEach((k) => { if (!(k in old)) delete L[k]; }); Object.assign(L, old); }
    const box = cur.parentElement; if (box && pressed) [...box.children].forEach((c, i) => c.setAttribute('aria-pressed', pressed[i]));
    cur = null; saved = null; pressed = null; showTry(null);
  }
  function tryOn(b) {
    const L = live(); if (!L) return;
    cur = b; showTry(b); saved = JSON.stringify(L); const box = b.parentElement; pressed = box ? [...box.children].map((c) => c.getAttribute('aria-pressed')) : null;
    const sfx = RW.audio && RW.audio.sfx; if (RW.audio) RW.audio.sfx = () => {}; try { b.onclick(); } catch (e) { /* only a preview */ } finally { if (RW.audio) RW.audio.sfx = sfx; }
  }
  document.addEventListener('pointerover', (ev) => {
    const cr = document.getElementById('creator'); if (!cr || cr.classList.contains('hidden-ui')) { cur = null; return; }
    const b = ev.target && ev.target.closest && ev.target.closest('#creator button.chip, #creator button.swatch');
    if (b === cur) return;
    undo();
    if (b && tryable(b)) tryOn(b);
  }, true);
  // a click keeps it: forget the undo
  document.addEventListener('pointerdown', (ev) => { const b = ev.target && ev.target.closest && ev.target.closest('#creator button.chip, #creator button.swatch'); if (b && b === cur) { cur = null; saved = null; pressed = null; } }, true);
  // ---- what you're trying on: a line under the picture, and a close-up for head and face choices ----
  const GROUPS = [
    ['Body', ['rock', 'fur', 'shell', 'glow', 'color shift', 'shade', 'body', 'arms', 'size', 'moves', 'shape', 'fluff']],
    ['Head & Hat', ['head', 'hat', 'cap']],
    ['Face', ['face', 'eyes', 'eye glow', 'mouth']],
    ['Details', ['cracks', 'growths', 'veins', 'extra']],
    ['Cape', ['cape']],
  ];
  const groupOf = (name) => { const g = GROUPS.find(([, l]) => l.includes(name)); return g ? g[0] : 'Details'; };
  const rowName = (b) => { const opt = b.closest('.opt'), lab = opt && opt.querySelector('.label'); return lab ? lab.textContent.trim() : ''; };
  let zoomOn = false;
  function showTry(b) {
    const pv = document.getElementById('preview'); if (!pv) return;
    let tl = document.getElementById('v3try'), zc = document.getElementById('v3zoom');
    if (!tl) { tl = document.createElement('div'); tl.id = 'v3try'; pv.after(tl); }
    if (!zc) { zc = document.createElement('canvas'); zc.id = 'v3zoom'; zc.width = 96; zc.height = 72; tl.after(zc); }
    if (!b) { tl.textContent = ''; tl.style.visibility = 'hidden'; zc.style.display = 'none'; zoomOn = false; return; }
    const rn = rowName(b), what = b.textContent.trim() || b.title || b.getAttribute('aria-label') || 'this colour';
    tl.textContent = 'Trying on: ' + rn + ' \u2014 ' + what; tl.style.visibility = 'visible';
    const grp = groupOf(rn.toLowerCase()); zoomOn = grp === 'Head & Hat' || grp === 'Face'; zc.style.display = zoomOn ? 'block' : 'none';
    if (zoomOn) requestAnimationFrame(drawZoom);
  }
  function drawZoom() {
    if (!zoomOn) return; const zc = document.getElementById('v3zoom'); if (!zc || !cLook) return;
    try {
      const f = A.dressed(cSp, cLook)[0][0], src = f.__hd2 || f, g = zc.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#120f18'; g.fillRect(0, 0, zc.width, zc.height);
      const sh = Math.round(src.height * 0.62), sw = src.width; const k = Math.min(zc.width / sw, zc.height / sh); g.drawImage(src, 0, 0, sw, sh, (zc.width - sw * k) / 2, 0, sw * k, sh * k);
    } catch (e) { /* no close-up */ }
    requestAnimationFrame(drawZoom);
  }
  // ---- separate, labelled boxes for each kind of choice ----
  function regroup() {
    const cr = document.getElementById('creator'), dyn = document.getElementById('c-dyn'); if (!cr || !dyn || cr.classList.contains('hidden-ui')) return;
    const rows = [...dyn.children].filter((c) => !c.dataset.v3mark); if (!rows.some((c) => c.classList.contains('opt'))) return;
    let box = document.getElementById('v3groups'); if (!box) { box = document.createElement('div'); box.id = 'v3groups'; dyn.after(box); }
    box.innerHTML = ''; const made = {};
    const boxFor = (name) => { if (made[name]) return made[name]; const fs = document.createElement('div'); fs.className = 'v3grp'; const h = document.createElement('div'); h.className = 'v3grph'; h.textContent = name; fs.append(h); made[name] = fs; return fs; };
    let last = null, tail = [];
    rows.forEach((c) => {
      if (c.classList.contains('opt')) { last = boxFor(groupOf((c.querySelector('.label') || {}).textContent.trim().toLowerCase())); last.append(c); }
      else if (c.classList.contains('label') && last && !/start/i.test(c.textContent)) last.append(c);   // a note goes with the row above it
      else tail.push(c);
    });
    GROUPS.forEach(([n]) => { if (made[n]) box.append(made[n]); });
    tail.forEach((c) => { c.classList.add('v3tail'); if (/Rocks start in their cave/i.test(c.textContent)) c.textContent = 'Rocks start in Stalagmere on Rock World with bare fists. They are heavy: a run-up smashes through dirt. They cannot swim. They sink, but never drown.'; box.append(c); });
    if (!dyn.querySelector('[data-v3row]')) { const mk = document.createElement('i'); mk.dataset.v3row = '1'; mk.dataset.v3mark = '1'; mk.hidden = true; dyn.append(mk); }
    else { const mk = document.createElement('i'); mk.dataset.v3mark = '1'; mk.hidden = true; dyn.append(mk); }
  }
  let rgT = 0; new MutationObserver(() => { clearTimeout(rgT); rgT = setTimeout(regroup, 40); }).observe(document.body, { childList: true, subtree: true });
  // always fit on the screen: shrink the whole card if the window is short
  function fit() {
    const cr = document.getElementById('creator'), card = cr && cr.querySelector('.card'); if (!card || cr.classList.contains('hidden-ui')) return;
    card.style.zoom = 1; const h = card.scrollHeight + 16, w = card.scrollWidth + 8;
    const k = Math.min(1.7, (window.innerHeight - 30) / h, (window.innerWidth - 16) / w); card.style.zoom = Math.abs(k - 1) > 0.01 ? k.toFixed(3) : 1; // grow to fill the screen, or shrink to fit it
  }
  window.addEventListener('resize', fit);
  new MutationObserver(() => requestAnimationFrame(fit)).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})(window.RW);
