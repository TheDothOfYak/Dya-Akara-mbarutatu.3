/* ============================================================
   DYA'AKARA — core/session_guard.js
   One active session per account — one tab, one device.

   Signing in CLAIMS the account's single session slot. Any other
   tab or device already holding that same account is signed out the
   moment the new login lands:

     • Same browser, other tabs — a BroadcastChannel (with a
       localStorage 'storage'-event fallback) kicks them instantly.
     • Other devices — the claim is written to the account's cloud
       row (dya_accounts.session_id); every signed-in client polls
       it and signs out the moment it no longer holds the slot.

   Best-effort, matching the rest of this repo's open-RLS online
   model (see schema.sql): it stops honest double-logins and stray
   multi-tab play — not a determined attacker holding the anon key.
   When online isn't configured, the cross-tab guard still runs, so
   one browser still allows only a single active tab per account.
   ============================================================ */
(function () {
  'use strict';
  const SG = {};
  DYA.sessionGuard = SG;

  const CHANNEL = 'dya-akara-session';
  const LS_PREFIX = 'dya:session:';
  const POLL_MS = 15000;

  SG.token = null;        // this tab's claim on the current account (null = no active session)
  SG.accountId = null;
  SG.onKicked = null;     // (reason) => {}  — wired by the boot/UI layer to sign out + return to login
  let poll = null;
  let cloudOff = false;   // set once we learn the cloud column is absent → skip cross-device checks

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
      const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  const KICK_MSG = 'Your account was signed in on another tab or device. An account can only be active in one place at a time.';

  /* ---------- cross-tab channel (same browser) ---------- */
  let bc = null;
  try { if (window.BroadcastChannel) bc = new BroadcastChannel(CHANNEL); } catch (e) { bc = null; }
  if (bc) bc.onmessage = (ev) => {
    const m = ev.data;
    if (m && m.type === 'claimed' && m.accountId === SG.accountId && m.token !== SG.token) kick(KICK_MSG);
  };
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('storage', (e) => {
      if (!SG.accountId || e.key !== LS_PREFIX + SG.accountId) return;
      if (e.newValue && e.newValue !== SG.token) kick(KICK_MSG);
    });
  }

  function announce() {
    try { if (bc) bc.postMessage({ type: 'claimed', accountId: SG.accountId, token: SG.token }); } catch (e) { /* ignore */ }
    try { localStorage.setItem(LS_PREFIX + SG.accountId, SG.token); } catch (e) { /* ignore */ }
  }

  function startPoll() {
    stopPoll();
    if (cloudOff) return;
    if (!(DYA.accountCloud && DYA.accountCloud.configured() && DYA.accountCloud.fetchSession)) return;
    poll = setInterval(SG.check, POLL_MS);
  }
  function stopPoll() { if (poll) { clearInterval(poll); poll = null; } }

  /* claim the account's single session slot for THIS tab (called on any
     successful sign-in or account creation) */
  SG.claim = function (account) {
    if (!account || account.ai) return;
    SG.accountId = account.id;
    SG.token = uuid();
    announce();   // boot the sibling tabs immediately
    if (DYA.accountCloud && DYA.accountCloud.configured() && DYA.accountCloud.claimSession) {
      DYA.accountCloud.claimSession(account.id, SG.token).then(r => {
        if (r && r.missing) cloudOff = true;   // deployment hasn't run the migration yet
      }).catch(() => { /* keep the cross-tab guard regardless */ });
    }
    startPoll();
  };

  /* confirm we still hold the slot (cross-device). A non-null cloud token
     that isn't ours means a newer sign-in elsewhere took over. */
  SG.check = function () {
    if (!SG.token || cloudOff) return;
    if (!(DYA.accountCloud && DYA.accountCloud.configured() && DYA.accountCloud.fetchSession)) return;
    DYA.accountCloud.fetchSession(SG.accountId).then(r => {
      if (!r || !SG.token) return;
      if (r.missing) { cloudOff = true; stopPoll(); return; }
      if (r.sessionId && r.sessionId !== SG.token) kick(KICK_MSG);
    }).catch(() => { /* transient network error — keep the session */ });
  };

  /* voluntary sign-out — give up the slot quietly */
  SG.release = function () {
    stopPoll();
    if (SG.accountId) { try { localStorage.removeItem(LS_PREFIX + SG.accountId); } catch (e) { /* ignore */ } }
    SG.token = null; SG.accountId = null; cloudOff = false;
  };

  function kick(reason) {
    if (!SG.token) return;   // not the active session — nothing to lose
    const acc = SG.accountId;
    stopPoll();
    SG.token = null; SG.accountId = null;
    /* don't let this tab's trailing save overwrite the tab/device that won */
    if (DYA.accountCloud && DYA.accountCloud.cancelPending) DYA.accountCloud.cancelPending(acc);
    if (typeof SG.onKicked === 'function') { try { SG.onKicked(reason); } catch (e) { /* ignore */ } }
  }

  /* re-check the instant this tab regains focus — catches a takeover that
     landed while it was backgrounded and its poll was throttled */
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') SG.check(); });
  }
})();
