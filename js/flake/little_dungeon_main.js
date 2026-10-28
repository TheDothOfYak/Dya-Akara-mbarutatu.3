/* ============================================================
   FLAKE GAMES — js/flake/little_dungeon_main.js
   Boot for Little Dungeon (mini-games/little-dungeon/), the mini
   game that used to sit inside Dya'Akara as Legends of Pia'don.

   It shares Dya'Akara's engine and account code, so a signed-in
   player's Flake Games account (and the gold a won run pays out) is
   the same everywhere. It opens straight into the dungeon, and every
   "main menu" leads to the Flake Games home.

   Mini games need no account: with nobody signed in it plays as a
   guest (a run in progress is kept in this browser, and a win pays no
   gold), with a "Sign in to save" button in the top bar.
   ============================================================ */
(function () {
  'use strict';
  const G = DYA.state, UI = DYA.ui, F = window.FLAKE;

  window.addEventListener('DOMContentLoaded', () => {
    G.init();
    UI.init();
    UI.brand = { logo: 'LITTLE DUNGEON', chips: false, signIn: () => F.toSignIn() };

    /* the dungeon's "menu" is the Flake Games home page */
    UI.register('menu', { enter() { G.saveNow(); F.toHub(); } });
    UI.register('login', { enter() { F.toSignIn(); } });

    if (DYA.live) DYA.live.toast = (it) => UI.toast({ title: it.title, body: it.body, icon: it.icon || '📣' });
    if (DYA.sessionGuard) {
      DYA.sessionGuard.onKicked = (reason) => { if (!G.me) return; G.logout(); F.notice('Signed out', reason); };
    }

    function proceed() {
      UI.loading(true);
      F.gate('ld').then(s => G.loginHash(s.email, s.passHash)).then(r => {
        UI.loading(false);
        if (r.err) { F.notice('Could not sign in', r.err); return; }
        UI.show('pia');
      });
    }
    /* a guest goes straight in: no account, and solo play needs no connection
       (co-op asks to connect when it is chosen) */
    if (!F.session()) { UI.show('pia'); return; }
    if (DYA.onlineGate) DYA.onlineGate.requireOnline(proceed);
    else proceed();
  });

  window.addEventListener('error', (e) => { console.error('Little Dungeon error:', e.error || e.message); });
})();
