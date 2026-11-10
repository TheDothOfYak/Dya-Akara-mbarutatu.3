/* ============================================================
   STRYX PILOT — js/sp_net.js
   The shared sky. Every pilot online flies under the same sky
   clock, so the Tatu are in the same places for all of them, and
   each ship streams where it is. You can see the others, and you
   can raid them: come alongside, hook your vines across and hold
   there, and a job out of their hold is yours (they can lash your
   vines off). Ports are safe.

   No account needed. Choose the open sky (everyone) or a private
   sky with a code (just your friends).

   Each pilot's own device is in charge of its own ship and hold:
   a raider asks, the ship being raided decides (and hands over the
   job) only if it agrees the raider really held on long enough.

   Transport: Supabase Realtime broadcast (channel sp-sky-<code>).
   Add ?net=local to test with two tabs in one browser.
   ============================================================ */
(function (root) {
  'use strict';
  const SP = root.SP;
  const NET = SP.net = {};
  NET.local = typeof location !== 'undefined' && /[?&]net=local\b/.test(location.search);
  NET.SEND_MS = 120;
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  NET.code = () => Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
  NET.cleanCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  NET.colorOf = key => { let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0; return 'hsl(' + (Math.abs(h) % 360) + ',70%,62%)'; };

  /* ---------------- transports ---------------- */
  const SB_URLS = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js', 'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'];
  let sbPromise = null, sbClient = null;
  function loadSb() {
    if (root.supabase && root.supabase.createClient) return Promise.resolve(root.supabase);
    if (sbPromise) return sbPromise;
    sbPromise = new Promise((resolve, reject) => {
      const next = i => {
        if (i >= SB_URLS.length) { sbPromise = null; reject(new Error('Could not load the online library.')); return; }
        const s = document.createElement('script'); s.src = SB_URLS[i]; s.async = true;
        s.onload = () => (root.supabase && root.supabase.createClient ? resolve(root.supabase) : next(i + 1));
        s.onerror = () => next(i + 1);
        document.head.appendChild(s);
      };
      next(0);
    });
    return sbPromise;
  }
  async function supabaseChannel(name, key, onMsg) {
    const c = root.DYA_CONFIG && root.DYA_CONFIG.supabase;
    if (!c || !c.url || !c.anonKey) throw new Error('Online play is not set up for this site.');
    const sdk = await loadSb();
    sbClient = sbClient || (root.DYA_LIVE && root.DYA_LIVE._client) || sdk.createClient(c.url, c.anonKey, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 20 } } });
    const ch = sbClient.channel(name, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'm' }, e => onMsg(e.payload));
    await new Promise((resolve, reject) => {
      let done = false;
      ch.subscribe(status => {
        if (done) return;
        if (status === 'SUBSCRIBED') { done = true; resolve(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { done = true; reject(new Error('Could not reach the shared sky.')); }
      });
      setTimeout(() => { if (!done) { done = true; reject(new Error('The shared sky took too long to answer.')); } }, 12000);
    });
    return { send: p => ch.send({ type: 'broadcast', event: 'm', payload: p }), close: () => { try { sbClient.removeChannel(ch); } catch (e) { /* ignore */ } } };
  }
  async function localChannel(name, key, onMsg) {
    const bc = new BroadcastChannel(name);
    bc.onmessage = e => onMsg(e.data);
    return { send: p => bc.postMessage(p), close: () => { try { bc.close(); } catch (e) { /* ignore */ } } };
  }

  /* ---------------- the sky ---------------- */
  /* me: { key, name }  handlers: { onRaided(from, progress), onCut(from), onLoot(job, from), onClaim(from), onChange() } */
  NET.Sky = function (me, handlers) {
    const K = this;
    K.me = me; K.h = handlers || {}; K.pilots = {}; K.ch = null; K.code = null; K.state = 'off'; K.error = '';
    K.raids = {};       // who is raiding me: key → { progress, at }
    K.sentAt = 0;
  };
  const P = NET.Sky.prototype;
  P.open = async function (code) {
    const K = this;
    K.code = code ? NET.cleanCode(code) : 'OPEN';
    K.state = 'connecting'; K.error = '';
    const name = 'sp-sky-' + K.code;
    try {
      K.ch = NET.local ? await localChannel(name, K.me.key, m => K.onMessage(m)) : await supabaseChannel(name, K.me.key, m => K.onMessage(m));
      K.state = 'on';
    } catch (e) { K.state = 'error'; K.error = e.message; K.ch = null; }
    clearInterval(K.timer);
    K.timer = setInterval(() => K.prune(), 1500);
    if (K.h.onChange) K.h.onChange();
    return K;
  };
  P.close = function () { const K = this; clearInterval(K.timer); if (K.ch) { K.send({ t: 'bye' }); K.ch.close(); } K.ch = null; K.state = 'off'; K.pilots = {}; };
  P.send = function (m) { if (this.ch) { m.k = this.me.key; try { this.ch.send(m); } catch (e) { /* a lost packet */ } } };
  P.prune = function () {
    const K = this, now = Date.now();
    let changed = false;
    Object.keys(K.pilots).forEach(k => { const p = K.pilots[k]; if (now - p.seen > (p.flying ? 5000 : 12000)) { delete K.pilots[k]; changed = true; } });
    Object.keys(K.raids).forEach(k => { if (now - K.raids[k].at > 1200) { delete K.raids[k]; changed = true; } });
    if (changed && K.h.onChange) K.h.onChange();
  };
  P.flying = function () { return Object.values(this.pilots).filter(p => p.flying); };
  P.count = function () { return Object.keys(this.pilots).length; };

  /* what I tell the sky: where my ship is (flying), or which port I am in */
  NET.shipState = function (f, hold, raidTarget) {
    const s = f.ship;
    return { t: 's', x: Math.round(s.x), y: Math.round(s.y), vx: Math.round(s.vx), vy: Math.round(s.vy), a: Math.round(s.ang * 100) / 100,
      th: s.thrusting ? 1 : 0, g: s.grounded || f.docked ? 1 : 0, h: hold, hp: Math.round(s.hull / f.S.hullMax * 100), r: raidTarget || '' };
  };
  P.sendShip = function (f, holdCount, raidTarget, name) { const m = NET.shipState(f, holdCount, raidTarget); m.n = name; this.send(m); };
  P.sendPort = function (port, name) { this.send({ t: 'p', at: port, n: name }); };

  P.onMessage = function (m) {
    const K = this;
    if (!m || !m.k || m.k === K.me.key) return;
    const now = Date.now();
    let p = K.pilots[m.k];
    const isNew = !p;
    if (!p) p = K.pilots[m.k] = { key: m.k, name: 'A pilot', color: NET.colorOf(m.k) };
    p.seen = now;
    if (m.n) p.name = String(m.n).slice(0, 18);
    switch (m.t) {
      case 's':
        p.flying = true; p.at = null;
        p.net = { x: m.x, y: m.y, vx: m.vx, vy: m.vy, a: m.a, th: m.th, g: m.g, h: m.h, hp: m.hp, r: m.r, when: performance.now() };
        if (p.x == null) { p.x = m.x; p.y = m.y; p.ang = m.a; }
        break;
      case 'p': p.flying = false; p.at = m.at; p.net = null; p.x = null; break;
      case 'bye': delete K.pilots[m.k]; break;
      /* someone is hooking their vines on me */
      case 'raid':
        if (m.to === K.me.key) { K.raids[m.k] = { progress: m.p, at: now }; if (K.h.onRaided) K.h.onRaided(m.k, m.p); }
        break;
      case 'claim': if (m.to === K.me.key && K.h.onClaim) K.h.onClaim(m.k, K.raids[m.k]); break;
      case 'loot': if (m.to === K.me.key && K.h.onLoot) K.h.onLoot(m.job, m.k); break;
      case 'deny': if (m.to === K.me.key && K.h.onDeny) K.h.onDeny(m.why, m.k); break;
      case 'cut': if (m.to === K.me.key && K.h.onCut) K.h.onCut(m.k); break;
    }
    if ((isNew || m.t === 'p' || m.t === 'bye') && K.h.onChange) K.h.onChange();
  };
  /* move the other ships smoothly toward where they should be by now */
  P.smooth = function (dt) {
    const now = performance.now();
    Object.values(this.pilots).forEach(p => {
      if (!p.flying || !p.net) return;
      const age = Math.min(0.35, (now - p.net.when) / 1000);
      const tx = p.net.x + p.net.vx * age, ty = p.net.y + p.net.vy * age;
      const k = Math.min(1, dt * 10);
      if (p.x == null || Math.hypot(tx - p.x, ty - p.y) > 600) { p.x = tx; p.y = ty; }
      else { p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; }
      p.ang = p.ang == null ? p.net.a : p.ang + SP.angDiff(p.ang, p.net.a) * k;
      p.vx = p.net.vx; p.vy = p.net.vy;
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
