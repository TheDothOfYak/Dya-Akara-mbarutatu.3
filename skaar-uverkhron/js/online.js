/* ============================================================
   SKAAR UVERKHRON — js/online.js  (placeholder, filled in later)
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU;
  SU.online = {
    menu() { SU.ui.alert('Online games', 'Online games are on their way.'); },
    isMine() { return true; }, isHost() { return true; }, waitTurn() {}, pushTurn() {},
  };
})(typeof window !== 'undefined' ? window : globalThis);
