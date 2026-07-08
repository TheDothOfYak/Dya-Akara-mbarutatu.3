/* ============================================================
   DYA'AKARA — main.js — boot
   ============================================================ */
(function () {
  'use strict';
  const G = DYA.state, UI = DYA.ui;

  window.addEventListener('DOMContentLoaded', () => {
    G.init();
    UI.init();

    /* sync audio settings if a session was left logged-in previously */
    UI.loading(true);
    setTimeout(() => {
      UI.loading(false);
      UI.show('login');
    }, 1600);
  });

  /* surface crashes rather than dying silently */
  window.addEventListener('error', (e) => {
    console.error('DYA error:', e.error || e.message);
  });
})();
