// 4 Brothers World V3 — part 16: a compact hero maker that previews on hover.
//  * Hover any choice (rock, head, body, arms, cracks, eyes, glow, mouth, face, growths, size, veins, hat, cape...) and
//    your hero shows it at once; move the mouse off and it goes back, unless you clicked. (Moves still animate on hover.)
//  * The options sit in columns with smaller chips, and the card shrinks itself to fit any window, so there is never a scrollbar.
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
  #creator .opts > p, #creator .opts > .label:not(:first-child), #creator #c-dyn ~ .label { font-size: 11px !important; line-height: 1.25; opacity: .7; }
  #creator .opts > div:first-child .label { display: none; }`;
  document.head.appendChild(css);
  // hover to try a choice
  let cLook = null; const A = RW.art, bD = A.dressed;
  A.dressed = function (species, look) { const cr = document.getElementById('creator'); if (arguments.length < 3 && look && cr && !cr.classList.contains('hidden-ui')) cLook = look; return bD.apply(this, arguments); };
  const live = () => cLook; RW.v3dbgLook = live;
  // one listener for the whole maker: whatever chip the mouse is over is tried on; leaving it puts things back
  let cur = null, saved = null, pressed = null;
  const tryable = (b) => { const opt = b.closest('.opt'), lab = opt && opt.querySelector('.label'), name = lab ? lab.textContent.trim().toLowerCase() : ''; return name !== 'species' && name !== 'moves' && typeof b.onclick === 'function'; };
  function undo() {
    if (!cur) return; const L = live();
    if (L && saved) { const old = JSON.parse(saved); Object.keys(L).forEach((k) => { if (!(k in old)) delete L[k]; }); Object.assign(L, old); }
    const box = cur.parentElement; if (box && pressed) [...box.children].forEach((c, i) => c.setAttribute('aria-pressed', pressed[i]));
    cur = null; saved = null; pressed = null;
  }
  function tryOn(b) {
    const L = live(); if (!L) return;
    cur = b; saved = JSON.stringify(L); const box = b.parentElement; pressed = box ? [...box.children].map((c) => c.getAttribute('aria-pressed')) : null;
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
  // always fit on the screen: shrink the whole card if the window is short
  function fit() {
    const cr = document.getElementById('creator'), card = cr && cr.querySelector('.card'); if (!card || cr.classList.contains('hidden-ui')) return;
    card.style.zoom = 1; const h = card.scrollHeight + 16, w = card.scrollWidth + 8;
    const k = Math.min(1.7, (window.innerHeight - 30) / h, (window.innerWidth - 16) / w); card.style.zoom = Math.abs(k - 1) > 0.01 ? k.toFixed(3) : 1; // grow to fill the screen, or shrink to fit it
  }
  window.addEventListener('resize', fit);
  new MutationObserver(() => requestAnimationFrame(fit)).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})(window.RW);
