/* ============================================================
   FLAKE GAMES — js/flake/fbw_cloud.js
   The 4 Brothers Worlds, saved to your Flake Games account.

   The game keeps everything in this browser's localStorage under
   'rw_' keys (hero, bag, worlds, controls…). This copies all of
   them (except the per-version spare copies, rw_save_backup_*) to
   the shared dya_config table under 'fbw_save:<account id>', the
   same way Torcain's Run keeps 'rpg_save:<id>', so progress follows
   the account to any device.

   Two bookkeeping keys sit next to the game's own:
     rw__owner    which account the rw_ keys in this browser belong to
     rw__savedAt  when they last changed (compared with the cloud copy)

   FBW.sync(who) runs once at boot, BEFORE the game reads its save:
     • cloud copy newer (or this browser holds someone else's) →
       install it here
     • this browser newer, or no cloud copy yet → push it up (an old
       save from before accounts becomes this account's)
     • another account's progress here is pushed to THAT account
       first if it is newer than its cloud copy, then cleared
     • cloud unreachable → saving stays in this browser this session,
       and nothing is pushed blind (it could overwrite newer progress)
   FBW.touch() marks a change and schedules a push.
   ============================================================ */
(function (root) {
  'use strict';
  const OWNER = 'rw__owner', STAMP = 'rw__savedAt';
  const PUSH_MS = 4000;

  function create(storage, rest) {
    const FBW = { available: false, who: null, error: null, lastPush: 0 };
    const rowKey = id => 'fbw_save:' + id;
    const isGameKey = k => k && k.indexOf('rw_') === 0 && k !== OWNER && k !== STAMP && k.indexOf('rw_save_backup_') !== 0;

    function keys() { const out = []; for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (isGameKey(k)) out.push(k); } return out; }
    function stamp() { return parseInt(storage.getItem(STAMP) || '0', 10) || 0; }
    FBW.snapshot = function () {
      const data = {};
      keys().forEach(k => { data[k] = storage.getItem(k); });
      return { v: 1, savedAt: stamp(), data };
    };
    function clearGame() { keys().forEach(k => storage.removeItem(k)); }
    function install(snap, owner) {
      clearGame();
      Object.keys(snap.data || {}).forEach(k => { if (isGameKey(k) && typeof snap.data[k] === 'string') storage.setItem(k, snap.data[k]); });
      storage.setItem(OWNER, owner);
      storage.setItem(STAMP, String(snap.savedAt || 0));
    }
    async function fetchRow(id) {
      const rows = await rest('GET', 'dya_config?key=eq.' + encodeURIComponent(rowKey(id)) + '&select=value');
      return (rows && rows[0] && rows[0].value) || null;
    }
    async function pushRow(id, snap) {
      await rest('POST', 'dya_config?on_conflict=key', { key: rowKey(id), value: snap, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
    }

    FBW.sync = async function (who) {
      FBW.who = who;
      const owner = storage.getItem(OWNER);
      let cloud;
      try { cloud = await fetchRow(who.id); }
      catch (e) { FBW.available = false; FBW.error = e.message; return { offline: true, mine: !owner || owner === who.id }; }
      FBW.available = true;
      /* someone else's progress in this browser: make sure it reached their account, then make room */
      if (owner && owner !== who.id) {
        try {
          const theirs = await fetchRow(owner);
          if (!theirs || (theirs.savedAt || 0) < stamp()) await pushRow(owner, FBW.snapshot());
        } catch (e) { FBW.available = false; FBW.error = e.message; return { offline: true, mine: false }; }
        clearGame();
        storage.removeItem(STAMP);
      }
      if (cloud && (owner !== who.id || (cloud.savedAt || 0) > stamp())) { install(cloud, who.id); return { installed: true }; }
      storage.setItem(OWNER, who.id);
      if (!keys().length) return { empty: true };
      if (!stamp()) storage.setItem(STAMP, String(Date.now()));
      if (!cloud || stamp() > (cloud.savedAt || 0)) { await FBW.pushNow(); return { pushed: true }; }
      return { same: true };
    };

    FBW.pushNow = async function () {
      if (!FBW.who || !FBW.available) return;
      clearTimeout(timer); timer = null;
      try { await pushRow(FBW.who.id, FBW.snapshot()); FBW.lastPush = Date.now(); FBW.error = null; }
      catch (e) { FBW.error = e.message; }
    };
    let timer = null;
    /* something in the save changed */
    FBW.touch = function () {
      try { storage.setItem(STAMP, String(Date.now())); } catch (e) { /* quota */ }
      if (!FBW.who || !FBW.available) return;
      if (!timer) timer = setTimeout(FBW.pushNow, PUSH_MS);
    };
    FBW.pending = () => !!timer;
    return FBW;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { create };
  else root.FBW_CLOUD = { create };
})(typeof window !== 'undefined' ? window : this);
