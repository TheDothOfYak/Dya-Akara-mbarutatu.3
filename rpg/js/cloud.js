/* ============================================================
   Torcain's Run, saved to your Flake Games account (the same
   account as Dya'Akara, signed in once on the home page — see
   js/flake/account.js), which keeps the run in the shared dya_config key/value table
   under "rpg_save:<account id>",
   so it follows you to any device.
   ============================================================ */

function cfg() { return (window.DYA_CONFIG && window.DYA_CONFIG.supabase) || {}; }
export const configured = () => { const c = cfg(); return !!(c.url && c.anonKey); };

async function rest(method, path, body, prefer, keepalive) {
  const c = cfg();
  const res = await fetch(c.url + '/rest/v1/' + path, {
    method, keepalive: !!keepalive,
    headers: Object.assign({ apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey, 'Content-Type': 'application/json' }, prefer ? { Prefer: prefer } : {}),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204 || res.status === 201 && !res.headers.get('content-length')) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) { const e = new Error((data && (data.message || data.hint)) || 'HTTP ' + res.status); e.status = res.status; throw e; }
  return data;
}

/* who is playing: the Flake Games session (js/flake/account.js) */
export function identity() {
  const s = window.FLAKE && window.FLAKE.session();
  return s ? { id: s.id, email: s.email, name: s.name } : null;
}
const rowKey = accountId => 'rpg_save:' + accountId;

export const state = { available: true, error: null, lastPush: 0 };

/* the cloud copy of this account's run, or null */
export async function fetchSave(accountId, timeoutMs = 5000) {
  if (!configured()) return null;
  const timer = new Promise((_, rej) => setTimeout(() => rej(new Error('timed out')), timeoutMs));
  try {
    const rows = await Promise.race([rest('GET', 'dya_config?key=eq.' + encodeURIComponent(rowKey(accountId)) + '&select=value'), timer]);
    state.available = true; state.error = null;
    return (rows && rows[0] && rows[0].value) || null;
  } catch (e) {
    /* never push blind: if we couldn't read the cloud copy, writing ours could
       overwrite a run that is further along — this session saves locally only */
    state.available = false;
    state.error = e.message;
    return null;
  }
}

let timer = null, pending = null;
async function pushNow(accountId, data, keepalive) {
  if (!configured() || !state.available) return;
  try {
    await rest('POST', 'dya_config?on_conflict=key', { key: rowKey(accountId), value: data, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates', keepalive);
    state.lastPush = Date.now(); state.error = null;
  } catch (e) { state.error = e.message; }
}
/* debounced: safe to call on every save */
export function pushSave(accountId, data) {
  pending = { accountId, data };
  clearTimeout(timer);
  timer = setTimeout(() => { const p = pending; pending = null; if (p) pushNow(p.accountId, p.data); }, 1500);
}
/* send anything waiting right now — the tab may be closing */
export function flush() {
  clearTimeout(timer);
  const p = pending; pending = null;
  if (p) pushNow(p.accountId, p.data, true);
}
export async function deleteSave(accountId) {
  if (!configured()) return;
  try { await rest('DELETE', 'dya_config?key=eq.' + encodeURIComponent(rowKey(accountId))); } catch (e) { /* ignore */ }
}
