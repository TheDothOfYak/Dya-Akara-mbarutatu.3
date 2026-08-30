/* ============================================================
   DYA'AKARA — core/online_gate.js
   Makes Dya'Akara an ONLINE-FIRST game — phase 1 of moving off
   the old local-first design.

   The game now requires a configured, reachable cloud to be
   played. At boot we hold the whole app behind a blocking
   overlay until the Guild's servers answer; if the connection
   drops mid-session the same overlay returns until it comes
   back. localStorage is demoted to a cache — the cloud
   (dya_accounts) is the source of truth (see account_cloud.js).

   The local match engine is deliberately left intact: a future
   offline-vs-AI demo mode ("camping mode") opts back in on
   purpose by setting DYA.onlineGate.allowOffline = true. Nothing
   in this file runs on load — main.js drives it via
   requireOnline(), so it stays inert (and safe to load headless
   in tests) until the browser boots.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util;
  const GATE = {};
  DYA.onlineGate = GATE;

  function cfg() { return (window.DYA_CONFIG && window.DYA_CONFIG.supabase) || {}; }
  GATE.configured = function () { const c = cfg(); return !!(c.url && c.anonKey); };

  /* The future offline-vs-AI mode flips this true to bypass the gate entirely.
     While it's false (the default), the game will not run without the cloud. */
  GATE.allowOffline = false;

  /* last known reachability: true / false / null (not yet checked) */
  GATE.online = null;

  /* how often we re-probe the cloud — relaxed while healthy, brisk while down */
  GATE.ONLINE_EVERY = 30000;
  GATE.OFFLINE_EVERY = 4000;
  /* while a blip is being confirmed we re-probe fast (see FAIL_TOLERANCE) */
  GATE.VERIFY_EVERY = 2000;

  /* How many consecutive *transient* probe failures (network / server) we
     tolerate before actually blocking play. Mobile browsers fire spurious
     `offline` events and briefly report navigator.onLine === false on screen
     lock, tab backgrounding, and Wi-Fi↔cellular handoffs; a single failure is
     almost always one of those blips rather than a real disconnect, so we
     verify before yanking the player out. Definitive failures (auth / schema /
     unconfigured) still block on the first probe — retrying won't fix those. */
  GATE.FAIL_TOLERANCE = 2;

  let overlayEl = null, els = null;
  let monitorTimer = null, netAttached = false;
  let readyCb = null, passedOnce = false, probing = false;
  let failStreak = 0;

  /* ================= reachability probe ================= */
  /* A cheap GET against the REST endpoint. Any 2xx means the online world is
     live; we classify the common failure modes so the overlay can say
     something useful instead of a generic "offline". */
  GATE.ping = async function (timeoutMs) {
    if (!GATE.configured()) return { online: false, reason: 'unconfigured' };
    /* We deliberately do NOT short-circuit on navigator.onLine === false here.
       On mobile that flag is unreliable — it flips false on screen lock and
       network handoffs while the connection is actually fine — so we let the
       real fetch below be the source of truth for reachability. If we truly
       are offline the fetch just fails and we classify it as 'network' anyway. */
    const c = cfg();
    let ctrl = null, to = null;
    try { ctrl = new AbortController(); to = setTimeout(() => ctrl.abort(), timeoutMs || 8000); }
    catch (e) { ctrl = null; }
    try {
      const res = await fetch(c.url + '/rest/v1/dya_config?select=key&limit=1', {
        method: 'GET',
        headers: { apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey },
        signal: ctrl ? ctrl.signal : undefined,
        cache: 'no-store',
      });
      if (to) clearTimeout(to);
      if (res.ok) return { online: true, reason: 'ok' };
      if (res.status === 401 || res.status === 403) return { online: false, reason: 'auth' };
      if (res.status === 404) return { online: false, reason: 'schema' };
      return { online: false, reason: 'server' };
    } catch (e) {
      if (to) clearTimeout(to);
      return { online: false, reason: 'network' };
    }
  };

  /* ================= blocking overlay ================= */
  const MSG = {
    connecting:   { t: 'Reaching the Guild…',        b: 'Connecting to the online world.',                                                                        retry: false, spin: true },
    unconfigured: { t: 'Online play isn’t set up',   b: 'This copy of Dya’Akara hasn’t been linked to a Guild server yet. Add your Supabase project in js/config.js — see ONLINE_SETUP.md — then reload.', retry: false, spin: false },
    network:      { t: 'You’re offline',             b: 'Dya’Akara is an online game. You’ll be back in the moment your connection returns.',                       retry: true,  spin: true },
    auth:         { t: 'Server key rejected',        b: 'The Guild server refused this deployment’s key. Check the anon key in js/config.js.',                      retry: true,  spin: false },
    schema:       { t: 'Game world not set up',      b: 'The Guild’s database is missing its tables. Run supabase/schema.sql once, then retry.',                    retry: true,  spin: false },
    server:       { t: 'The Guild servers are busy', b: 'Having trouble reaching the online world — retrying automatically.',                                       retry: true,  spin: true },
  };

  function ensureOverlay() {
    if (overlayEl || typeof document === 'undefined') return;
    const spin  = U.el('div',    { cls: 'ogate-spin' });
    const title = U.el('div',    { cls: 'ogate-title' });
    const body  = U.el('div',    { cls: 'ogate-body' });
    const retry = U.el('button', { cls: 'btn primary', text: 'Retry now', onclick: () => GATE.recheck() });
    const card  = U.el('div', { cls: 'ogate-card' }, [
      spin, U.el('div', { cls: 'ogate-brand', text: "DYA'AKARA" }), title, body, retry,
    ]);
    overlayEl = U.el('div', { id: 'onlineGateOverlay' }, [card]);
    els = { spin, title, body, retry };
    document.body.appendChild(overlayEl);
  }

  function showOverlay(state) {
    ensureOverlay();
    if (!overlayEl) return;
    const m = MSG[state] || MSG.server;
    els.title.textContent = m.t;
    els.body.textContent = m.b;
    els.retry.style.display = m.retry ? '' : 'none';
    els.spin.style.display = m.spin ? '' : 'none';
    overlayEl.style.display = 'flex';
  }

  function hideOverlay() { if (overlayEl) overlayEl.style.display = 'none'; }

  /* whether play is currently blocked (offline while online is required) */
  GATE.blocked = function () { return !GATE.allowOffline && GATE.online === false; };

  /* ================= monitor loop ================= */
  function scheduleMonitor(ms) {
    clearTimeout(monitorTimer);
    monitorTimer = setTimeout(monitor, ms);
  }

  async function monitor() {
    if (GATE.allowOffline) { hideOverlay(); return; }
    if (probing) return;
    probing = true;
    let r;
    try { r = await GATE.ping(); } finally { probing = false; }

    if (r.online) {
      failStreak = 0;
      GATE.online = true;
      hideOverlay();
      if (!passedOnce) { passedOnce = true; if (readyCb) { try { readyCb(); } catch (e) { console.error(e); } } }
      scheduleMonitor(GATE.ONLINE_EVERY);
      return;
    }

    /* Definitive failures can't be fixed by retrying, so block immediately. */
    const definitive = (r.reason === 'unconfigured' || r.reason === 'auth' || r.reason === 'schema');
    if (definitive) {
      failStreak = 0;
      GATE.online = false;
      showOverlay(r.reason);
      /* an unconfigured deployment can't recover by retrying — stop polling and
         wait for a reload; auth/schema keep trying on the brisk cadence */
      if (r.reason !== 'unconfigured') scheduleMonitor(GATE.OFFLINE_EVERY);
      return;
    }

    /* Transient failure (network / server): don't block on the first blip.
       Keep the player in the game and re-probe quickly; only once failures pile
       up past the tolerance do we treat it as a genuine disconnect. */
    failStreak++;
    if (failStreak >= GATE.FAIL_TOLERANCE) {
      GATE.online = false;
      showOverlay(r.reason);
      scheduleMonitor(GATE.OFFLINE_EVERY);
    } else {
      /* While still booting the connecting spinner stays up; mid-session we
         leave GATE.online untouched so play continues during verification. */
      if (!passedOnce) showOverlay('connecting');
      scheduleMonitor(GATE.VERIFY_EVERY);
    }
  }

  function attachNetEvents() {
    if (netAttached || typeof window === 'undefined' || !window.addEventListener) return;
    netAttached = true;
    /* The browser's `offline` event is a hint, not proof — mobile fires it
       spuriously. Don't block on it; just probe soon to confirm real state.
       A genuine disconnect fails the probe FAIL_TOLERANCE times and blocks;
       a blip recovers before the player ever sees the overlay. */
    window.addEventListener('offline', () => { clearTimeout(monitorTimer); scheduleMonitor(GATE.VERIFY_EVERY); });
    window.addEventListener('online', () => { GATE.recheck(); });
  }

  /* boot gate: call onReady exactly once, the first time the cloud answers. */
  GATE.requireOnline = function (onReady) {
    readyCb = onReady;
    if (GATE.allowOffline) {
      GATE.online = true;
      if (!passedOnce) { passedOnce = true; if (readyCb) readyCb(); }
      return;
    }
    if (!GATE.configured()) { showOverlay('unconfigured'); return; }
    attachNetEvents();
    showOverlay('connecting');
    monitor();
  };

  /* manual "Retry now" / an `online` browser event: probe immediately. */
  GATE.recheck = function () {
    clearTimeout(monitorTimer);
    if (!GATE.allowOffline && GATE.configured()) showOverlay('connecting');
    monitor();
  };
})();
