/* ============================================================
   DYA'AKARA — core/broadcast.js
   Live broadcasts from the Admin Panel to every open copy of the
   web app: the card game, 4 Brothers World, Torcain's Run and the
   film page.

   One document lives in Supabase dya_config (key='live'):
     {
       rev, updatedAt,
       items:  [{ id, at, kind, title, body, icon, target, expires }],
                 kind: 'toast' (pop-up only) | 'announcement'
                       (pop-up + the game's news feed) | 'avizu'
       banner: { on, text, tone, link, target, expires },
       maintenance: { on, title, text, target },
       reload: { at, target },   // "refresh everyone" button
     }
   target: 'all' | 'hub' | 'game' | '4bw' | 'rpg' | 'ld' | 'film'

   Delivery: the admin writes the row AND sends it on the Supabase
   Realtime channel 'dya-live', so open pages update within a second.
   Every page also re-reads the row every 20 seconds, which covers a
   page that missed the realtime message or a blocked websocket.

   Standalone on purpose (needs only js/config.js), so pages that
   don't load the rest of DYA can include it too.
   ============================================================ */
(function () {
  'use strict';
  const KEY = 'live';
  const CHANNEL = 'dya-live';
  const POLL_MS = 20000;
  const SEEN_KEY = 'dyaakara_live_seen';
  const RELOAD_KEY = 'dyaakara_live_reloaded';
  const SB_URLS = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js', 'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'];
  const path = (window.location && window.location.pathname) || '';
  /* a page can say which app it is (window.DYA_APP) before loading this file */
  const APP = window.DYA_APP ? window.DYA_APP
    : /admin/i.test(path) ? 'admin'
    : /four-brothers-world/i.test(path) ? '4bw'
    : /\/rpg\//i.test(path) ? 'rpg'
    : /\/film\//i.test(path) ? 'film'
    : /little-dungeon/i.test(path) ? 'ld'
    : /dya-akara\.html/i.test(path) ? 'game'
    : 'hub';
  const LOADED_AT = Date.now();

  const LIVE = {
    APP, KEY, CHANNEL,
    TARGETS: [['all', 'Everywhere'], ['hub', 'Flake Games home page'], ['game', "Dya'Akara"], ['rpg', "Torcain's Run"], ['4bw', 'The 4 Brothers Worlds'], ['ld', 'Little Dungeon'], ['film', 'The film page']],
    doc: null,
    state: { lastFetch: 0, lastPush: 0, error: null, realtime: 'off' },
    /* the card game swaps this for its own styled toast */
    toast: null,
    listeners: [],
  };
  window.DYA_LIVE = LIVE;
  if (window.DYA) window.DYA.live = LIVE;

  function cfg() { const c = window.DYA_CONFIG && window.DYA_CONFIG.supabase; return c && c.url && c.anonKey ? c : null; }
  LIVE.configured = () => !!cfg();

  function emptyDoc() { return { rev: 0, updatedAt: 0, items: [], banner: { on: false }, maintenance: { on: false }, reload: { at: 0, target: 'all' } }; }
  LIVE.emptyDoc = emptyDoc;

  LIVE.forMe = function (target, app) {
    const a = app || APP;
    return !target || target === 'all' || target === a;
  };
  function live(x) { return x && (!x.expires || x.expires > Date.now()); }

  function rest(method, p, body, prefer) {
    const c = cfg();
    return fetch(c.url + '/rest/v1/' + p, {
      method,
      headers: Object.assign({ apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey, 'Content-Type': 'application/json' }, prefer ? { Prefer: prefer } : {}),
      body: body != null ? JSON.stringify(body) : undefined,
    }).then(async res => {
      if (res.status === 204) return null;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && (data.message || data.hint || data.error)) || ('HTTP ' + res.status));
      return data;
    });
  }

  /* ---------- realtime (Supabase broadcast channel) ---------- */
  let sbPromise = null, channel = null;
  function loadSupabase() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    if (sbPromise) return sbPromise;
    sbPromise = new Promise((resolve, reject) => {
      const next = i => {
        if (i >= SB_URLS.length) { reject(new Error('could not load supabase-js')); return; }
        const s = document.createElement('script');
        s.src = SB_URLS[i]; s.async = true;
        s.onload = () => (window.supabase && window.supabase.createClient ? resolve(window.supabase) : next(i + 1));
        s.onerror = () => next(i + 1);
        document.head.appendChild(s);
      };
      next(0);
    });
    return sbPromise;
  }
  function connectRealtime() {
    const c = cfg();
    if (!c || channel) return Promise.resolve(channel);
    return loadSupabase().then(sb => {
      LIVE._client = LIVE._client || sb.createClient(c.url, c.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      channel = LIVE._client.channel(CHANNEL, { config: { broadcast: { self: false } } });
      channel.on('broadcast', { event: 'live' }, msg => { if (msg && msg.payload) adopt(msg.payload, true); });
      return new Promise(resolve => {
        channel.subscribe(status => {
          LIVE.state.realtime = status === 'SUBSCRIBED' ? 'on' : String(status).toLowerCase();
          if (status === 'SUBSCRIBED') resolve(channel);
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') resolve(null);
        });
        setTimeout(() => resolve(channel), 6000);
      });
    }).catch(e => { LIVE.state.realtime = 'unavailable'; return null; });
  }

  /* ---------- reading ---------- */
  LIVE.fetch = async function () {
    if (!cfg()) return { err: 'Online is not configured.' };
    try {
      const rows = await rest('GET', 'dya_config?key=eq.' + KEY + '&select=value');
      LIVE.state.lastFetch = Date.now(); LIVE.state.error = null;
      const d = rows && rows[0] && rows[0].value;
      if (d) adopt(d, false);
      else if (!LIVE.doc) LIVE.doc = emptyDoc();
      return { ok: true, doc: LIVE.doc };
    } catch (e) { LIVE.state.error = e.message; return { err: e.message }; }
  };

  function adopt(d, fromRealtime) {
    const cur = LIVE.doc;
    if (cur && (d.updatedAt || 0) < (cur.updatedAt || 0)) return;
    if (cur && d.updatedAt === cur.updatedAt && d.rev === cur.rev) return;
    LIVE.doc = Object.assign(emptyDoc(), d);
    if (APP !== 'admin') render(fromRealtime);
    LIVE.listeners.forEach(fn => { try { fn(LIVE.doc); } catch (e) { /* a listener must not break the others */ } });
    try { window.dispatchEvent(new CustomEvent('dya-live', { detail: LIVE.doc })); } catch (e) { /* old browsers */ }
  }
  LIVE.onUpdate = function (fn) { LIVE.listeners.push(fn); if (LIVE.doc) { try { fn(LIVE.doc); } catch (e) { /* ignore */ } } };

  /* ---------- writing (Admin Panel) ---------- */
  LIVE.publish = async function (doc) {
    if (!cfg()) return { err: 'Online is not configured (js/config.js).' };
    doc.rev = (doc.rev || 0) + 1;
    doc.updatedAt = Date.now();
    try {
      await rest('POST', 'dya_config?on_conflict=key', { key: KEY, value: doc, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
    } catch (e) { LIVE.state.error = e.message; return { err: e.message }; }
    LIVE.doc = doc;
    LIVE.state.lastPush = Date.now(); LIVE.state.error = null;
    let instant = false;
    try {
      const ch = await connectRealtime();
      if (ch) { const r = await ch.send({ type: 'broadcast', event: 'live', payload: doc }); instant = r === 'ok'; }
    } catch (e) { /* polling still delivers within 20s */ }
    return { ok: true, instant };
  };

  /* read-modify-publish, starting from the newest copy online so two admin
     tabs don't wipe each other's posts */
  LIVE.update = async function (fn) {
    if (!cfg()) return { err: 'Online is not configured (js/config.js).' };
    const r = await LIVE.fetch();
    if (r.err && !/no rows/i.test(r.err)) return r;
    const doc = Object.assign(emptyDoc(), JSON.parse(JSON.stringify(LIVE.doc || emptyDoc())));
    fn(doc);
    doc.items = (doc.items || []).slice(0, 120);
    return LIVE.publish(doc);
  };

  /* ================= SHOWING IT ================= */
  function seen() { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch (e) { return []; } }
  function markSeen(ids) { try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-200))); } catch (e) { /* private mode */ } }

  let styled = false;
  function style() {
    if (styled) return; styled = true;
    const s = document.createElement('style');
    s.textContent = [
      '#dyaLiveBanner{position:fixed;left:0;right:0;top:0;z-index:2147483000;display:flex;gap:10px;align-items:center;justify-content:center;padding:7px 40px 7px 14px;font:600 14px/1.35 system-ui,sans-serif;color:#1b140b;background:#e3b65a;box-shadow:0 2px 10px #0006;text-align:center}',
      '#dyaLiveBanner.t-info{background:#7cb4d8}#dyaLiveBanner.t-alert{background:#d8584a;color:#fff}#dyaLiveBanner.t-good{background:#7fc77a}',
      '#dyaLiveBanner a{color:inherit;text-decoration:underline}#dyaLiveBanner button{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:0;font-size:18px;cursor:pointer;color:inherit}',
      '#dyaLiveToasts{position:fixed;right:14px;bottom:14px;z-index:2147483001;display:flex;flex-direction:column;gap:8px;max-width:min(360px,calc(100vw - 28px))}',
      '.dya-live-toast{background:#1d160d;color:#efe3c8;border:1px solid #8a6f42;border-left:4px solid #e3b65a;border-radius:8px;padding:10px 12px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 6px 20px #0008;cursor:pointer;transition:opacity .5s}',
      '.dya-live-toast b{display:block;color:#e3b65a;margin-bottom:2px}',
      '#dyaLiveMaint{position:fixed;inset:0;z-index:2147483002;background:#0e0a06ee;color:#efe3c8;display:flex;align-items:center;justify-content:center;padding:24px;font:16px/1.5 system-ui,sans-serif;text-align:center}',
      '#dyaLiveMaint h2{color:#e3b65a;margin:0 0 10px;font-size:24px}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function defaultToast(it) {
    style();
    let box = document.getElementById('dyaLiveToasts');
    if (!box) { box = document.createElement('div'); box.id = 'dyaLiveToasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'dya-live-toast';
    const b = document.createElement('b'); b.textContent = (it.icon ? it.icon + ' ' : '') + (it.title || '');
    const p = document.createElement('div'); p.textContent = it.body || '';
    t.append(b, p);
    t.onclick = () => t.remove();
    box.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 9000);
  }

  function render(fromRealtime) {
    if (!document.body) { document.addEventListener('DOMContentLoaded', () => render(fromRealtime), { once: true }); return; }
    const d = LIVE.doc;
    style();
    /* banner */
    const bn = d.banner || {};
    let el = document.getElementById('dyaLiveBanner');
    const dismissed = (() => { try { return sessionStorage.getItem('dyaLiveBannerX') === String(bn.at || ''); } catch (e) { return false; } })();
    if (bn.on && bn.text && live(bn) && LIVE.forMe(bn.target) && !dismissed) {
      if (!el) { el = document.createElement('div'); el.id = 'dyaLiveBanner'; document.body.appendChild(el); }
      el.className = 't-' + (bn.tone || 'gold');
      el.textContent = '';
      const span = document.createElement('span'); span.textContent = bn.text; el.appendChild(span);
      if (bn.link && /^https?:\/\//i.test(bn.link)) { const a = document.createElement('a'); a.href = bn.link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'More ›'; el.appendChild(a); }
      const x = document.createElement('button'); x.textContent = '×'; x.title = 'Hide';
      x.onclick = () => { el.remove(); try { sessionStorage.setItem('dyaLiveBannerX', String(bn.at || '')); } catch (e) { /* ignore */ } };
      el.appendChild(x);
    } else if (el) el.remove();

    /* maintenance lock */
    const mt = d.maintenance || {};
    let m = document.getElementById('dyaLiveMaint');
    if (mt.on && LIVE.forMe(mt.target)) {
      if (!m) { m = document.createElement('div'); m.id = 'dyaLiveMaint'; document.body.appendChild(m); }
      m.textContent = '';
      const inner = document.createElement('div');
      const h = document.createElement('h2'); h.textContent = mt.title || 'Back soon';
      const p = document.createElement('p'); p.textContent = mt.text || 'The Dya Guild is updating things. This page will open again by itself.';
      inner.append(h, p); m.appendChild(inner);
    } else if (m) m.remove();

    /* pop-ups: only ones not shown on this device yet, and only fresh ones
       (a page opened tomorrow shouldn't replay last week's toasts) */
    const ids = seen();
    const fresh = (d.items || []).filter(it => !it.deleted && it.popup !== false && live(it) && LIVE.forMe(it.target) && ids.indexOf(it.id) < 0 && (Date.now() - (it.at || 0)) < 3 * 24 * 3600e3);
    fresh.slice(0, 4).reverse().forEach(it => (LIVE.toast || defaultToast)(it));
    if (fresh.length) markSeen(ids.concat(fresh.map(it => it.id)));

    /* refresh everyone: only a page that was opened BEFORE the button was pressed */
    const rl = d.reload || {};
    if (rl.at && rl.at > LOADED_AT && LIVE.forMe(rl.target) && Date.now() - rl.at < 10 * 60e3) {
      let done = 0; try { done = +localStorage.getItem(RELOAD_KEY) || 0; } catch (e) { /* ignore */ }
      if (done !== rl.at) {
        try { localStorage.setItem(RELOAD_KEY, String(rl.at)); } catch (e) { /* ignore */ }
        (LIVE.toast || defaultToast)({ title: 'Updating…', body: 'A new version is ready. Refreshing in a few seconds.', icon: '🔄' });
        setTimeout(() => location.reload(), 4000);
      }
    }
  }
  LIVE._render = render;

  /* ---------- boot ---------- */
  if (cfg() && typeof fetch === 'function') {
    LIVE.fetch();
    if (APP !== 'admin') {
      setInterval(() => { if (!document.hidden) LIVE.fetch(); }, POLL_MS);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) LIVE.fetch(); });
      /* realtime after the page has settled, so it never slows the first paint */
      setTimeout(connectRealtime, 2500);
    }
  }
})();
