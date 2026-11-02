/* ============================================================
   FLAKE GAMES — js/flake/mobile.js
   Small things that make every page kinder on a phone or tablet.
   Does nothing at all with a mouse (a fine pointer), so a computer
   is exactly as it was.

     • Text boxes are at least 16px, so an iPhone doesn't zoom the
       page in when you tap one (and leave it zoomed).
     • In a game (data-game="1"): no pull-to-refresh or rubber-band
       bounce, where a swipe is a move, and no long-press "copy /
       look up" pop-up on its buttons.
     • <script ... data-awake="1">: keeps the screen from going dark
       while the page is open and in front (a film, a fight), and
       lets go when you leave it. Only where the browser can.

   Include it on any page:  <script src="js/flake/mobile.js"></script>
   ============================================================ */
(function () {
  'use strict';
  let coarse = false;
  try { coarse = matchMedia('(pointer: coarse)').matches; } catch (e) { /* ignore */ }
  if (!coarse) return;

  const me = document.currentScript;
  const game = !!(me && me.dataset.game);
  const awake = !!(me && me.dataset.awake);

  document.documentElement.classList.add('flake-touch');
  const css = `
.flake-touch input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]), .flake-touch select, .flake-touch textarea { font-size: max(16px, 1em); }
` + (game ? `
.flake-touch, .flake-touch body { overscroll-behavior: none; }
.flake-touch button, .flake-touch .btn { -webkit-touch-callout: none; }
` : '');
  const st = document.createElement('style'); st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  /* ---------- keep the screen on while this page is in front ---------- */
  if (awake && 'wakeLock' in navigator) {
    let lock = null;
    const grab = async () => {
      if (document.visibilityState !== 'visible' || lock) return;
      try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); }
      catch (e) { lock = null; }   // low battery, or not allowed yet: try again on the next touch
    };
    document.addEventListener('visibilitychange', grab);
    // some browsers only allow it after a touch
    addEventListener('pointerdown', grab, { passive: true });
    grab();
  }
})();
