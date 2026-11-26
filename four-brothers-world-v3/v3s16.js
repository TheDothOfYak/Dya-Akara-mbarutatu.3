// 4 Brothers World V3 — part 16: a compact hero maker that previews on hover.
//  * Hover any choice (rock, head, body, arms, cracks, eyes, glow, mouth, face, growths, size, veins, hat, cape...) and
//    your hero shows it at once; move the mouse off and it goes back, unless you clicked. (Moves still animate on hover.)
//  * The options sit in two columns with smaller chips, so the whole maker fits on screen without scrolling.
(function (RW) {
  'use strict';
  const css = document.createElement('style');
  css.textContent = `
  #creator { padding-block: 6px; }
  #creator .card { width: min(1340px, 98vw) !important; max-width: none !important; grid-template-columns: minmax(100px, 150px) minmax(0, 1fr); gap: 10px; padding: 8px 12px; }
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
  function wire() {
    const cr = document.getElementById('creator'); if (!cr || cr.classList.contains('hidden-ui')) return;
    cr.querySelectorAll('button.chip, button.swatch').forEach((b) => {
      if (b.__v3hov) return; b.__v3hov = true;
      const opt = b.closest('.opt'), lab = opt && opt.querySelector('.label'), name = lab ? lab.textContent.trim().toLowerCase() : '';
      if (name === 'species' || name === 'moves' || !b.onclick) return;
      let saved = null, pressed = null, clicked = false;
      b.addEventListener('mouseenter', () => {
        const L = live(); if (!L) return; saved = JSON.stringify(L); clicked = false;
        const box = b.parentElement; pressed = box ? [...box.children].map((c) => c.getAttribute('aria-pressed')) : null;
        const sfx = RW.audio && RW.audio.sfx; if (RW.audio) RW.audio.sfx = () => {}; try { b.onclick(); } catch (e) { /* only a preview */ } finally { if (RW.audio) RW.audio.sfx = sfx; }
      });
      b.addEventListener('mousedown', () => { clicked = true; });
      b.addEventListener('mouseleave', () => {
        const L = live(); if (!L || !saved || clicked) { saved = null; return; }
        const old = JSON.parse(saved); Object.keys(L).forEach((k) => { if (!(k in old)) delete L[k]; }); Object.assign(L, old); saved = null;
        const box = b.parentElement; if (box && pressed) [...box.children].forEach((c, i) => c.setAttribute('aria-pressed', pressed[i]));
      });
    });
  }
  new MutationObserver(() => wire()).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})(window.RW);
