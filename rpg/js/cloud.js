/* ============================================================
   Torcain's Run, saved to your Dya'Akara account.
   Signs in with the same email + password as the main game
   (checked against dya_accounts the same way the game does),
   then keeps the run in the shared dya_config key/value table
   under "rpg_save:<account id>", so it follows you to any device. Without an account the run stays
   in this browser only.
   ============================================================ */

const IDENT_KEY = 'torcain-identity';

function cfg() { return (window.DYA_CONFIG && window.DYA_CONFIG.supabase) || {}; }
export const configured = () => { const c = cfg(); return !!(c.url && c.anonKey); };

/* the same password hash as js/core/state.js (FNV-1a over a salted string) */
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const hashPass = p => String(hashStr('dya!' + p + '!akara'));

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

/* who is playing — remembered in this browser (no password is ever stored) */
export function identity() {
  try {
    const hand = sessionStorage.getItem(IDENT_KEY);   // handed over by the main game's menu
    if (hand) { localStorage.setItem(IDENT_KEY, hand); sessionStorage.removeItem(IDENT_KEY); }
    const v = JSON.parse(localStorage.getItem(IDENT_KEY) || 'null');
    return v && v.id ? v : null;
  } catch (e) { return null; }
}
export function signOut() { try { localStorage.removeItem(IDENT_KEY); } catch (e) { /* ignore */ } }

export async function signIn(email, pass) {
  if (!configured()) return { err: 'Online accounts are not set up for this site.' };
  email = String(email || '').trim().toLowerCase();
  let rows;
  try { rows = await rest('GET', 'dya_accounts?email=eq.' + encodeURIComponent(email) + '&select=id,email,pass_hash,name:data->>displayName'); }
  catch (e) { return { err: 'Could not reach the Dya Guild: ' + e.message }; }
  const r = rows && rows[0];
  if (!r) return { err: 'No Dya’Akara account with that email.' };
  if (r.pass_hash !== hashPass(pass)) return { err: 'Incorrect password.' };
  const who = { id: r.id, email: r.email, name: r.name || r.email.split('@')[0] };
  try { localStorage.setItem(IDENT_KEY, JSON.stringify(who)); } catch (e) { /* ignore */ }
  return { who };
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
