/* ============================================================
   FLAKE GAMES — js/flake/mini_save.js
   Saves for the small canvas mini games (Punk Races, Stryx Pilot).

   Mini games need no account:
     • a guest's save lives in this browser (localStorage
       'mini-<game>-guest');
     • a signed-in player's save lives on the account, in dya_config
       under 'mini:<game>:<account id>', with a copy in this browser
       ('mini-<game>-<account id>') so a dropped connection loses
       nothing;
     • a guest who signs in later carries their guest save onto the
       account the first time (only if the account has none yet).

   Usage:
     const S = FLAKE_MINI.open('pr', blank);     // blank(): a new save
     S.ready.then(data => …);                    // the save, loaded
     S.data                                      // the same object
     S.save()                                    // debounced write
     S.who                                       // session or null
     S.banned                                    // ban text, or ''

   Needs js/config.js and js/flake/account.js first.
   ============================================================ */
(function () {
  'use strict';
  const F = window.FLAKE;

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  const MINI = {};
  window.FLAKE_MINI = MINI;
  MINI.rowKey = (game, accId) => 'mini:' + game + ':' + accId;

  MINI.open = function (game, blank) {
    const who = F && F.session ? F.session() : null;
    const guestKey = 'mini-' + game + '-guest';
    const localKey = who ? 'mini-' + game + '-' + who.id : guestKey;
    const S = { game, who, data: null, banned: '', online: false, lastError: '' };
    let timer = null, writing = false, again = false;

    function fill(d) {
      const b = blank();
      if (!d || typeof d !== 'object') return b;
      /* new fields added later get their defaults */
      Object.keys(b).forEach(k => { if (d[k] === undefined) d[k] = b[k]; });
      return d;
    }
    function newer(a, b) { return ((a && a.savedAt) || 0) >= ((b && b.savedAt) || 0) ? a : b; }

    async function load() {
      const local = lsGet(localKey);
      if (!who || !F.configured()) { S.data = fill(local); return S.data; }
      try {
        const bans = await F.fetchBans(who.id);
        const b = F.banFor(bans, game);
        if (b) S.banned = F.banText(b);
      } catch (e) { /* offline: no ban check */ }
      let cloud = null;
      try {
        const rows = await F.rest('GET', 'dya_config?key=eq.' + encodeURIComponent(MINI.rowKey(game, who.id)) + '&select=value');
        cloud = rows && rows[0] ? rows[0].value : null;
        S.online = true;
      } catch (e) { S.lastError = e.message; }
      let d = cloud || local ? newer(cloud, local) : null;
      if (!d) {
        /* first time on the account: bring the guest's save across */
        const g = lsGet(guestKey);
        if (g) { d = g; d.fromGuest = Date.now(); lsDel(guestKey); }
      }
      /* an admin reset (Admin Panel → Game Players) starts the player over */
      if (d && d.adminReset) { lsDel(localKey); d = null; S.data = fill(null); S.save(true); return S.data; }
      S.data = fill(d);
      if (d && d !== cloud) S.save(true);
      return S.data;
    }

    async function write() {
      if (writing) { again = true; return; }
      writing = true;
      try {
        if (who && F.configured()) {
          await F.rest('POST', 'dya_config?on_conflict=key',
            { key: MINI.rowKey(game, who.id), value: S.data, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
          S.online = true; S.lastError = '';
        }
      } catch (e) { S.online = false; S.lastError = e.message; }
      writing = false;
      if (again) { again = false; write(); }
    }

    S.save = function (now) {
      if (!S.data) return;
      S.data.savedAt = Date.now();
      lsSet(localKey, S.data);
      clearTimeout(timer);
      timer = setTimeout(write, now ? 0 : 1500);
    };
    S.reset = function () { S.data = blank(); S.save(true); return S.data; };
    window.addEventListener('pagehide', () => { if (S.data) { lsSet(localKey, S.data); if (timer) { clearTimeout(timer); write(); } } });
    S.ready = load();
    return S;
  };
})();
