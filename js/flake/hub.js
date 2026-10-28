/* ============================================================
   FLAKE GAMES — js/flake/hub.js
   The home page (index.html): the whole Pia'don system turning
   behind a carousel of the games, the announcements from the
   Admin Panel, the Mini Games corner, and the one sign-in that
   every game shares (js/flake/account.js).

   The sky drifts to each game's corner of the system as the
   carousel turns: the Mbaru Tatu for Dya'Akara, close on Velki
   and Xikia for Torcain's Run, and out to the far worlds (Katkan
   of the Fuzzies, Oskerarean of the Ghosties) for the 4 Brothers.

   Previews are screenshots in img/previews/<game id>.jpg.
   ============================================================ */
(function () {
  'use strict';
  const F = window.FLAKE;
  const $ = id => document.getElementById(id);
  const CYCLE_MS = 10000;
  const narrow = () => window.innerWidth <= 900;

  /* what each slide shows, beyond the name and tagline the Admin Panel can edit */
  const LOOK = {
    game: {
      kicker: 'Collect · battle · trade',
      vibe: 'Every token is a living creature of the Mbaru Tatu, sung true by the Dya Guild. Build your pouch, send it into the arena, craft and trade on the Guild Market, and climb the season from your home circuit to the Interplanetary.',
      feats: ['Living tokens', 'Arena battles', 'Guild Market', 'Ranked seasons', 'The Hunt'],
      a: '#d9b87a', sky: { cx: 0.8, cy: 0.74, maxR: 56, labels: 'full', sun: [0.94, 0.08] },
      skyNarrow: { cx: 0.5, cy: 0.12, maxR: 30, labels: true, sun: [0.92, 0.04] },
    },
    rpg: {
      kicker: 'A story in three dimensions',
      vibe: 'Tanoc Filugani is thirteen, an orphan who wants to be an Ahoac. On the afternoon of the Last Skyfall he walks out of the north gate of Velki and wakes on another world. Follow him from Xikia up the road north to the Carpenter’s land, and on into the story of Torcain.',
      feats: ['3D action RPG', 'Story chapters', 'Glide and ride', 'Relics', 'Saved to your account'],
      a: '#f0b86a', sky: { cx: 0.8, cy: 0.76, maxR: 84, labels: true, sun: [0.99, 0.02] },
      skyNarrow: { cx: 0.55, cy: 0.13, maxR: 44, labels: true, sun: [0.98, 0.02] },
    },
    '4bw': {
      kicker: 'Made by four brothers',
      vibe: 'A pixel open world to dig, build and battle through: Fuzzy World, Acorn World, Rock World and the Ghost World, then the Duat, where all four heroes fight together. Pets, fishing, farming, a house of your own, and room codes to play with your brothers.',
      feats: ['2D pixel platformer', 'Four worlds', 'Build anything', 'Play together'],
      a: '#9be06a', sky: { cx: 0.92, cy: 0.9, maxR: 20, labels: false, sun: [0.62, 0.0] },
      skyNarrow: { cx: 0.88, cy: 0.2, maxR: 12, labels: false, sun: [0.55, 0.0] },
    },
  };
  const MINI_ICON = { ld: '🗝' };

  let hub = F.hubConfig();
  let session = F.session();
  let bans = {};
  let idx = 0, timer = null, paused = false, pendingHref = null;

  /* ---------- the sky ---------- */
  const skyOpts = Object.assign({ far: true, storm: true }, LOOK.game[narrow() ? 'skyNarrow' : 'sky']);
  DYA.mbaruSky.mount($('sky'), skyOpts);
  let skyTarget = null;
  function easeSky() {
    if (skyTarget) {
      let moving = false;
      ['cx', 'cy', 'maxR'].forEach(k => {
        const d = skyTarget[k] - skyOpts[k];
        if (Math.abs(d) > (k === 'maxR' ? 0.05 : 0.0005)) { skyOpts[k] += d * 0.04; moving = true; } else skyOpts[k] = skyTarget[k];
      });
      [0, 1].forEach(i => { skyOpts.sun[i] += (skyTarget.sun[i] - skyOpts.sun[i]) * 0.04; });
      skyOpts.labels = skyTarget.labels;
      if (!moving) skyTarget = null;
    }
    requestAnimationFrame(easeSky);
  }
  skyOpts.sun = skyOpts.sun.slice();
  requestAnimationFrame(easeSky);

  /* ---------- small helpers ---------- */
  function el(tag, attrs, kids) {
    const e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(k => {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'cls') e.className = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(c => c && e.appendChild(c));
    return e;
  }
  let toastT = 0;
  function toast(text) {
    const t = $('toast'); t.textContent = text; t.classList.remove('hidden');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 4200);
  }
  function ago(ms) {
    const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return 'just now';
    const m = Math.round(s / 60); if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    const d = Math.round(h / 24); return d === 1 ? 'yesterday' : d < 30 ? d + ' days ago' : new Date(ms).toLocaleDateString();
  }
  const allGames = () => F.GAMES.concat(F.MINI);

  /* ---------- the studio name ---------- */
  function paintStudio() {
    $('studio').textContent = hub.studio;
    document.title = hub.studio;
  }

  /* ---------- account ---------- */
  function paintAccount() {
    const box = $('acct'); box.innerHTML = '';
    if (session) {
      box.appendChild(el('span', { cls: 'who' }, [el('span', { cls: 'dot' }), document.createTextNode('Signed in as '), el('b', { text: session.name })]));
      box.appendChild(el('button', { cls: 'btn ghost', type: 'button', text: 'Sign out', onclick: () => { F.signOut(); session = null; bans = {}; paintAccount(); paintSlide(0); toast('Signed out.'); } }));
    } else {
      box.appendChild(el('button', { cls: 'btn ghost', type: 'button', text: 'Create account', onclick: () => openAuth('up') }));
      box.appendChild(el('button', { cls: 'btn primary', type: 'button', text: 'Sign in', onclick: () => openAuth('in') }));
    }
  }
  function banOn(gameId) { return session ? F.banFor(bans, gameId) : null; }

  let authMode = 'in';
  function setAuthMode(mode) {
    authMode = mode;
    document.querySelectorAll('#auth .tab').forEach(t => t.classList.toggle('on', t.dataset.mode === mode));
    $('auth-h').textContent = mode === 'up' ? 'Create your account' : 'Sign in';
    $('auth-lead').textContent = mode === 'up'
      ? 'One account for every ' + hub.studio + ' game, and your progress follows you to any device.'
      : 'One account for every game. Already played Dya’Akara or Torcain’s Run? Use that same email and password.';
    $('a-name-row').classList.toggle('hidden', mode !== 'up');
    $('a-pass').setAttribute('autocomplete', mode === 'up' ? 'new-password' : 'current-password');
    $('a-go').textContent = mode === 'up' ? 'Create account' : 'Sign in';
    $('a-err').textContent = '';
  }
  function openAuth(mode, href) {
    pendingHref = href || null;
    setAuthMode(mode || 'in');
    $('auth').classList.remove('hidden');
    stopCycle();
    setTimeout(() => $('a-email').focus(), 30);
  }
  function closeAuth() { $('auth').classList.add('hidden'); pendingHref = null; startCycle(); }
  document.querySelectorAll('#auth .tab').forEach(t => t.addEventListener('click', () => setAuthMode(t.dataset.mode)));
  $('a-cancel').addEventListener('click', closeAuth);
  $('auth').addEventListener('click', e => { if (e.target === $('auth')) closeAuth(); });
  $('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    $('a-err').textContent = ''; $('a-go').disabled = true;
    const r = authMode === 'up'
      ? await F.createAccount($('a-email').value, $('a-pass').value, $('a-name').value)
      : await F.signIn($('a-email').value, $('a-pass').value);
    $('a-go').disabled = false;
    if (r.err) { $('a-err').textContent = r.err; return; }
    session = r.who;
    $('a-pass').value = '';
    const go = pendingHref;
    $('auth').classList.add('hidden'); pendingHref = null;
    bans = await F.fetchBans(session.id).catch(() => ({}));
    const allBan = F.banFor(bans, null);
    if (allBan) { paintAccount(); paintSlide(0); toast(F.banText(allBan)); return; }
    if (go) { location.href = go; return; }
    paintAccount(); paintSlide(0); startCycle();
    toast('Welcome, ' + session.name + '.');
  });

  /* play a game: signed in → straight there; otherwise sign in first */
  function play(game) {
    const b = banOn(game.id === 'game' ? null : game.id);
    if (b) { toast(F.banText(b)); return; }
    if (!session) { openAuth('in', game.href); return; }
    location.href = game.href;
  }

  /* ---------- the carousel ---------- */
  function paintSlide(dir) {
    const g = F.GAMES[idx], look = LOOK[g.id] || {}, txt = F.gameText(g, hub);
    const show = $('show');
    show.dataset.game = g.id;
    document.documentElement.style.setProperty('--a', look.a || '#d9b87a');
    $('count').innerHTML = '<b>' + String(idx + 1).padStart(2, '0') + '</b> / ' + String(F.GAMES.length).padStart(2, '0');
    const slide = $('slide');
    slide.innerHTML = '';
    slide.style.setProperty('--from', (dir < 0 ? -28 : 28) + 'px');
    slide.classList.remove('slide-in'); void slide.offsetWidth; if (dir) slide.classList.add('slide-in');

    const pv = el('div', { cls: 'preview' });
    const img = el('img', { src: 'img/previews/' + g.id + '.jpg', alt: txt.name + ' preview' });
    img.addEventListener('error', () => img.remove());
    pv.appendChild(img);
    pv.appendChild(el('span', { cls: 'pv-chip', text: look.kicker || '' }));

    const b = banOn(g.id === 'game' ? null : g.id);
    const playBtn = el('button', { cls: 'play', type: 'button', text: 'Play', onclick: () => play(g) });
    if (b) playBtn.disabled = true;
    const note = el('span', { cls: 'g-note' + (b ? ' bad' : ''), text: b ? F.banText(b) : session ? '' : 'Sign in to play — one account for every game.' });

    slide.appendChild(el('div', { cls: 'g-kicker', text: txt.tagline }));
    slide.appendChild(el('h1', { cls: 'g-name', text: txt.name }));
    slide.appendChild(pv);
    slide.appendChild(el('p', { cls: 'g-vibe', text: look.vibe || '' }));
    slide.appendChild(el('ul', { cls: 'g-feats' }, (look.feats || []).map(f => el('li', { text: f }))));
    slide.appendChild(el('div', { cls: 'g-actions' }, [playBtn, note]));
    slide.setAttribute('aria-label', (idx + 1) + ' of ' + F.GAMES.length + ': ' + txt.name);

    const dots = $('dots'); dots.innerHTML = '';
    F.GAMES.forEach((x, i) => dots.appendChild(el('button', {
      type: 'button', role: 'tab', 'aria-selected': String(i === idx), 'aria-label': F.gameText(x, hub).name,
      cls: i === idx ? 'on' : '', onclick: () => go(i),
    })));
    show.style.setProperty('--cycle', CYCLE_MS + 'ms');
    skyTarget = Object.assign({}, look[narrow() ? 'skyNarrow' : 'sky']);
  }
  function go(i, dir) {
    const n = F.GAMES.length;
    const next = ((i % n) + n) % n;
    if (dir == null) dir = next > idx ? 1 : -1;
    idx = next;
    paintSlide(dir);
    restartCycle();
  }
  function startCycle() {
    if (timer || paused || !$('auth').classList.contains('hidden')) return;
    timer = setInterval(() => { idx = (idx + 1) % F.GAMES.length; paintSlide(1); }, CYCLE_MS);
    $('show').classList.remove('paused');
  }
  function stopCycle() { clearInterval(timer); timer = null; $('show').classList.add('paused'); }
  function restartCycle() { stopCycle(); startCycle(); }
  $('prev').addEventListener('click', () => go(idx - 1, -1));
  $('next').addEventListener('click', () => go(idx + 1, 1));
  /* hold still while someone is reading or pointing at it */
  const show = $('show');
  show.addEventListener('mouseenter', () => { paused = true; stopCycle(); });
  show.addEventListener('mouseleave', () => { paused = false; startCycle(); });
  show.addEventListener('focusin', () => { paused = true; stopCycle(); });
  show.addEventListener('focusout', () => { paused = false; startCycle(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopCycle(); else startCycle(); });
  document.addEventListener('keydown', e => {
    if (!$('auth').classList.contains('hidden')) { if (e.key === 'Escape') closeAuth(); return; }
    if (/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) return;
    if (e.key === 'ArrowLeft') go(idx - 1, -1);
    else if (e.key === 'ArrowRight') go(idx + 1, 1);
  });
  /* swipe on a phone */
  let sx = null, sy = null;
  show.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  show.addEventListener('touchend', e => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });

  /* ---------- the Mini Games corner ---------- */
  function paintMini() {
    const box = $('mini'); box.innerHTML = '';
    F.MINI.forEach(g => {
      const txt = F.gameText(g, hub);
      const art = el('div', { cls: 'mini-art', text: MINI_ICON[g.id] || '★' });
      const img = el('img', { src: 'img/previews/' + g.id + '.jpg', alt: '' });
      img.addEventListener('load', () => { art.textContent = ''; art.appendChild(img); });
      box.appendChild(el('button', { cls: 'mini-game', type: 'button', onclick: () => play(g) }, [
        art, el('div', {}, [el('div', { cls: 'mini-name', text: txt.name }), el('div', { cls: 'mini-tag', text: txt.tagline })]),
      ]));
    });
  }

  /* ---------- announcements (Admin Panel → Announcements) ---------- */
  function targetName(t) {
    if (!t || t === 'all' || t === 'hub') return '';
    const g = allGames().find(x => x.id === t);
    if (g) return F.gameText(g, hub).name;
    return t === 'film' ? 'The film' : '';
  }
  function paintNews(doc) {
    const box = $('news'); box.innerHTML = '';
    const items = ((doc && doc.items) || []).filter(it => it.kind === 'announcement' && !it.deleted && (!it.expires || it.expires > Date.now()))
      .sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 8);
    if (!items.length) { box.appendChild(el('p', { cls: 'muted small', text: 'No announcements right now.' })); return; }
    items.forEach(it => {
      const tn = targetName(it.target);
      box.appendChild(el('div', { cls: 'news-item' }, [
        el('div', { cls: 'nt' }, [tn ? el('span', { cls: 'pill', text: tn }) : null, document.createTextNode((it.icon ? it.icon + ' ' : '') + (it.title || ''))]),
        it.body ? el('div', { cls: 'nb', text: it.body }) : null,
        el('div', { cls: 'nm', text: ago(it.at || Date.now()) }),
      ]));
    });
  }
  const LIVE = window.DYA_LIVE;
  if (LIVE && LIVE.configured()) {
    LIVE.onUpdate(paintNews);
    LIVE.fetch().then(() => paintNews(LIVE.doc));   // also settles "Loading…" when there is nothing yet
  } else paintNews(null);

  /* ---------- boot ---------- */
  function paintAll() { paintStudio(); paintAccount(); paintSlide(0); paintMini(); }
  paintAll();
  startCycle();
  F.fetchHubConfig().then(h => { hub = h; paintAll(); });
  if (session) {
    F.verify(session).then(v => {
      if (!v.ok) { F.signOut(); session = null; paintAccount(); paintSlide(0); return; }
      session = F.session();
      paintAccount();
      return F.fetchBans(session.id).then(b => { bans = b; paintSlide(0); const all = F.banFor(bans, null); if (all) toast(F.banText(all)); });
    });
  }
  /* sent here from a game to sign in (?signin=1&next=…) */
  const q = new URLSearchParams(location.search);
  if (q.get('signin') && !session) {
    const next = q.get('next');
    openAuth('in', next && /^\/[^/]/.test(next) ? next : null);
  }
  window.addEventListener('resize', () => { skyTarget = Object.assign({}, LOOK[F.GAMES[idx].id][narrow() ? 'skyNarrow' : 'sky']); });
})();
