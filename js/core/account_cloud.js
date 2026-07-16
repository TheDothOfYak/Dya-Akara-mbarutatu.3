/* ============================================================
   DYA'AKARA — core/account_cloud.js
   Cross-device accounts. A player's whole save — collection,
   gold, level, pouches, friends, notifications, settings,
   achievements, stats — travels with their email+password to
   ANY device via a Supabase table (dya_accounts), instead of
   being trapped in one browser's localStorage.

   This keeps the game's existing synchronous design intact:
   G.world.accounts stays the live, in-memory source of truth
   every system reads and writes. This module only handles the
   boundary — pulling the canonical copy in at login, and pushing
   the latest copy out whenever it changes.

   Bans (dya_bans) ride the same lifecycle so a ban issued on one
   device is enforced the moment the player logs in anywhere else.

   ⚠ Security note: this table uses the same OPEN row-level-security
   policy as the rest of this repo's online tables (see schema.sql)
   — anyone holding the site's public anon key can read or write any
   row directly via Supabase's REST API. Fine for a friendly
   deployment; not real per-account security. See schema.sql for the
   stronger (Supabase Auth) alternative if that ever matters here.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util;

  const AC = {};
  DYA.accountCloud = AC;

  function cfg() { return (window.DYA_CONFIG && window.DYA_CONFIG.supabase) || {}; }
  AC.configured = function () { const c = cfg(); return !!(c.url && c.anonKey); };

  AC.state = { error: null, lastPush: 0, lastFetch: 0 };

  function rest(method, path, body, prefer) {
    const c = cfg();
    return fetch(c.url + '/rest/v1/' + path, {
      method,
      headers: Object.assign({
        'apikey': c.anonKey,
        'Authorization': 'Bearer ' + c.anonKey,
        'Content-Type': 'application/json',
      }, prefer ? { 'Prefer': prefer } : {}),
      body: body != null ? JSON.stringify(body) : undefined,
    }).then(async res => {
      if (res.status === 204) return null;
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (data && (data.message || data.hint || data.error)) || ('HTTP ' + res.status);
        const e = new Error(msg); e.status = res.status; e.data = data;
        throw e;
      }
      return data;
    });
  }

  /* ================= ACCOUNTS ================= */
  AC.fetchByEmail = async function (email) {
    if (!AC.configured()) return null;
    const rows = await rest('GET', 'dya_accounts?email=eq.' + encodeURIComponent(email) + '&select=*');
    AC.state.lastFetch = Date.now();
    return (rows && rows[0]) || null;
  };

  /* every cloud account this admin session can see — lets the Admin
     Panel manage players who signed up on a device it has never seen */
  AC.fetchAll = async function () {
    if (!AC.configured()) return [];
    const rows = await rest('GET', 'dya_accounts?select=*&order=updated_at.desc&limit=1000');
    AC.state.lastFetch = Date.now();
    return rows || [];
  };

  function row(account) {
    return {
      id: account.id,
      email: account.email,
      pass_hash: account.passHash,
      data: account,
      updated_at: new Date().toISOString(),
    };
  }

  /* first write for a brand-new account — fails loudly on a real
     email collision (someone else just took it) rather than silently
     overwriting another player */
  AC.insert = async function (account) {
    if (!AC.configured()) return { err: 'Online is not configured.' };
    try {
      await rest('POST', 'dya_accounts', row(account));
      AC.state.lastPush = Date.now(); AC.state.error = null;
      return { ok: true };
    } catch (e) {
      if (e.status === 409 || /duplicate key/i.test(e.message)) return { err: 'An account with that email already exists.' };
      AC.state.error = e.message;
      return { err: e.message };
    }
  };

  /* debounced upsert — safe to call on every G.save() */
  const pushTimers = {};
  AC.push = function (account) {
    if (!AC.configured() || !account || account.ai) return;
    clearTimeout(pushTimers[account.id]);
    pushTimers[account.id] = setTimeout(() => { AC.pushNow(account); }, 1000);
  };
  AC.pushNow = async function (account) {
    if (!AC.configured() || !account || account.ai) return { ok: false };
    try {
      await rest('POST', 'dya_accounts?on_conflict=id', row(account), 'resolution=merge-duplicates');
      AC.state.lastPush = Date.now(); AC.state.error = null;
      return { ok: true };
    } catch (e) {
      AC.state.error = e.message;
      return { err: e.message };
    }
  };

  /* permanently remove a player account from the cloud (admin delete) */
  AC.remove = async function (accountId) {
    if (!AC.configured()) return { ok: false };
    try {
      await rest('DELETE', 'dya_accounts?id=eq.' + encodeURIComponent(accountId));
      AC.state.error = null;
      return { ok: true };
    } catch (e) { AC.state.error = e.message; return { err: e.message }; }
  };

  /* ================= BANS ================= */
  AC.fetchBan = async function (accountId) {
    if (!AC.configured()) return null;
    const rows = await rest('GET', 'dya_bans?account_id=eq.' + encodeURIComponent(accountId) + '&select=*');
    return (rows && rows[0]) || null;
  };
  AC.pushBan = async function (accountId, reason, permanent, until) {
    if (!AC.configured()) return;
    try {
      await rest('POST', 'dya_bans?on_conflict=account_id', {
        account_id: accountId, reason, permanent: !!permanent,
        until: until ? new Date(until).toISOString() : null,
      }, 'resolution=merge-duplicates');
    } catch (e) { AC.state.error = e.message; }
  };
  AC.clearBan = async function (accountId) {
    if (!AC.configured()) return;
    try { await rest('DELETE', 'dya_bans?account_id=eq.' + encodeURIComponent(accountId)); }
    catch (e) { AC.state.error = e.message; }
  };
})();
