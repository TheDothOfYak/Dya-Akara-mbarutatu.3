/* ============================================================
   DYA'AKARA — main.js — boot
   ============================================================ */
(function () {
  'use strict';
  const G = DYA.state, UI = DYA.ui;

  window.addEventListener('DOMContentLoaded', () => {
    G.init();
    UI.init();

    /* pull the admin-curated shared world (Dya'kukull + AI market) before the
       player logs in, so admin token deletions/edits/spawns show up here too.
       Fire-and-forget: it updates G.world in place and the login flow (1.6s
       later) reads the adopted accounts. */
    if (G.fetchAdminWorld) { try { G.fetchAdminWorld(); } catch (e) { /* offline is fine */ } }

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
