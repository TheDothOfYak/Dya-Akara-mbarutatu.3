/* ============================================================
   DYA'AKARA — main.js — boot
   ============================================================ */
(function () {
  'use strict';
  const G = DYA.state, UI = DYA.ui;

  window.addEventListener('DOMContentLoaded', () => {
    G.init();
    UI.init();

    /* one account = one active session (one tab, one device). When a newer
       sign-in elsewhere claims the slot, this tab is signed out and dropped
       back at the login screen with an explanation. */
    if (DYA.sessionGuard) {
      DYA.sessionGuard.onKicked = (reason) => {
        if (!G.me) return;
        G.logout();
        UI.show('login');
        UI.alert('Signed out', reason);
      };
    }

    /* pull the admin-curated shared world (Dya'kukull + AI market) before the
       player logs in, so admin token deletions/edits/spawns show up here too.
       Fire-and-forget: it updates G.world in place and the login flow (1.6s
       later) reads the adopted accounts. */
    if (G.fetchAdminWorld) { try { G.fetchAdminWorld(); } catch (e) { /* offline is fine */ } }

    /* keep pulling it LIVE: a cheap meta check every ~90s picks up admin
       curation while the player is already logged in, and re-renders the
       current screen when something actually changed (skips battles/login). */
    if (G.pollAdminWorld) {
      setInterval(() => {
        G.pollAdminWorld().then(r => { if (r && r.adopted && UI.refreshCurrent) UI.refreshCurrent(); }).catch(() => {});
      }, 90000);
    }

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
