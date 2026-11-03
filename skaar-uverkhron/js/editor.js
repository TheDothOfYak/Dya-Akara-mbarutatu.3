/* ============================================================
   SKAAR UVERKHRON — js/editor.js  (placeholder, filled in later)
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU;
  SU.editor = {
    open() { SU.ui.alert('Map editor', 'The map editor is on its way.'); },
    pickMap(cb) { SU.ui.alert('Maps', 'No made maps yet.'); },
    gameFromMap(map, setup) { return SU.mapgen.newGame(setup); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
