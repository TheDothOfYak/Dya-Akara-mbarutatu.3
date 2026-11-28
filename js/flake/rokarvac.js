// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   FLAKE GAMES — js/flake/rokarvac.js
   The Rokarvac page (rokarvac.html), opened from the home page
   by clicking a world in the sky. One page per world of Pia'don
   (DYA.rokarvac in js/data/rokarvac.js): its chapters, its field
   notes, and its creatures. Click a creature for its close-up.
   Creatures are drawn in 2D by the Dya'Akara sprite engine until
   each one has its 3D model; the Lútut already has its own, with
   a button for how it looks in each game (js/flake/lutut_viewer.js).

   Links: rokarvac.html#<world>  or  rokarvac.html#<world>/<species id>
   ============================================================ */
(function () {
  'use strict';
  const RK = DYA.rokarvac, SP = DYA.species, L = DYA.lore;
  const $ = id => document.getElementById(id);
  const HAS_3D = { lutut: true };
  const ORB = { mbaru: 'radial-gradient(circle at 35% 35%, #6aa0c8, #23557a 60%, #123049)', katkan: 'radial-gradient(circle, #c8c8d0, #9a9aa4 50%, #5a5a64)',
    oskerarean: 'radial-gradient(circle at 35% 35%, #ffffff, #cfd8e8 50%, #7a8498)', sukryulndael: 'radial-gradient(circle at 35% 35%, #8ac0f0, #4a8fd0 55%, #1f4a78)',
    piadon: 'radial-gradient(circle, #fff8e0, #ffe39a 45%, #d9a040)' };
  const SKY = { mbaru: { cx: 0.8, cy: 0.62, maxR: 52 }, katkan: { cx: 0.85, cy: 0.85, maxR: 22 }, oskerarean: { cx: 0.85, cy: 0.85, maxR: 22 }, sukryulndael: { cx: 0.85, cy: 0.85, maxR: 22 }, piadon: { cx: 0.82, cy: 0.8, maxR: 30 } };

  function el(tag, attrs, kids) {
    const e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(k => {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'cls') e.className = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(c => c && e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return e;
  }

  /* ---------- the sky behind the page ---------- */
  const skyOpts = Object.assign({ far: true, storm: true, labels: true, sun: [0.94, 0.08] }, SKY.mbaru);
  DYA.mbaruSky.mount($('sky'), skyOpts);

  /* ---------- live 2D creature art (the Dya'Akara sprite engine) ---------- */
  const arts = new Set();
  let animT = 0;
  function art(speciesId, size, state) {
    const cv = el('canvas', { width: size * 2, height: size * 2, 'aria-hidden': 'true' });
    cv._sp = SP.get(speciesId); cv._state = state || 'idle'; cv._phase = Math.random() * 6.28;
    arts.add(cv); drawArt(cv, animT);
    return cv;
  }
  function drawArt(cv, t) {
    const sp = cv._sp; if (!sp) return;
    const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    const col = SP.ELEMENT_COLORS[sp.element] || '#888888';
    const g = ctx.createRadialGradient(w / 2, h * 0.62, 2, w / 2, h * 0.62, w * 0.55);
    g.addColorStop(0, col + '2e'); g.addColorStop(1, col + '00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w / 2, h * 0.6);
    try {
      DYA.sprites.draw(ctx, { sp, r: w * 0.26, state: cv._state, t, phase: cv._phase, facing: 1, alpha: 1, shimmer: true, biolum: true,
        heads: sp.features && sp.features.heads ? sp.features.heads[1] : undefined, heat: 0.7 });
    } catch (e) { /* a drawing that fails just stays blank */ }
    ctx.restore();
  }
  let last = performance.now();
  const gate = DYA.util.fpsGate ? DYA.util.fpsGate(30) : () => true;
  (function loop(now) {
    requestAnimationFrame(loop);
    if (!gate(now)) return;
    animT += Math.min(0.1, (now - last) / 1000); last = now;
    arts.forEach(cv => {
      if (!cv.isConnected) { arts.delete(cv); return; }
      const r = cv.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;   // only what is on screen
      drawArt(cv, animT);
    });
  })(last);

  /* ---------- the worlds ---------- */
  let current = null, tab = {};
  function worldNav() {
    const nav = $('worlds'); nav.innerHTML = '';
    RK.WORLDS.forEach(w => {
      const b = el('button', { cls: 'world-btn' + (current === w.id ? ' on' : ''), type: 'button', 'aria-pressed': current === w.id ? 'true' : 'false',
        onclick: () => { location.hash = w.id; } }, [el('span', { cls: 'orb', style: 'background:' + ORB[w.id] }), w.name]);
      nav.appendChild(b);
    });
  }

  function chapterView(c) {
    const box = el('div');
    if (c.sky) {
      const wrap = el('div', { cls: 'cluster' });
      const cv = el('canvas', { 'aria-label': 'Velki at the centre, Xikia and Leotik circling it, each with its Kalo' });
      wrap.appendChild(cv); box.appendChild(wrap);
      DYA.mbaruSky.mount(cv, { cx: 0.5, cy: 0.54, labels: 'full', maxR: 44, sun: [0.9, 0.16], far: false });
    }
    if (c.intro) box.appendChild(el('p', { cls: 'ch-intro', text: c.intro }));
    if (c.glossary) box.appendChild(el('div', { cls: 'gloss' }, c.glossary.map(([w, m]) => el('div', {}, [el('b', { text: w }), el('span', { text: m })]))));
    if (c.entries && c.entries.length) {
      box.appendChild(el('div', { cls: 'grid' }, c.entries.map(e => el('div', { cls: 'card' + (c.id === 'elements' ? ' el-' + e.name.split(' ')[0] : '') }, [
        el('div', { cls: 'name', text: e.name }), e.sub ? el('div', { cls: 'sub', text: e.sub }) : null, el('div', { cls: 'body', text: e.body }),
      ]))));
    }
    return box;
  }

  function render() {
    const w = RK.world(current) || RK.WORLDS[0];
    Object.assign(skyOpts, SKY[w.id] || SKY.mbaru);
    worldNav();
    const page = $('page'); page.innerHTML = '';
    page.appendChild(el('div', { cls: 'w-head' }, [el('div', { cls: 'kind', text: w.kind + (w.sub ? ' · ' + w.sub : '') }), el('h2', { text: w.name })]));
    if (w.intro) page.appendChild(el('p', { cls: 'w-intro', text: w.intro }));

    /* field notes */
    const tips = L.TIPS || [];
    if (w.notes && tips.length) {
      let ti = Math.floor(Math.random() * tips.length);
      const p = el('p', { text: tips[ti] });
      page.appendChild(el('div', { cls: 'panel note' }, [
        el('div', { cls: 'head' }, [el('span', { text: 'A field note' }), el('button', { cls: 'btn small', type: 'button', title: 'Another note', 'aria-label': 'Another note', text: '↻',
          onclick: () => { ti = (ti + 1 + Math.floor(Math.random() * Math.max(1, tips.length - 1))) % tips.length; p.textContent = tips[ti]; } })]),
        p,
      ]));
    }

    /* chapters, as tabs */
    const chs = w.chapters || [];
    if (chs.length > 1) {
      const tabs = el('div', { cls: 'tabs', role: 'tablist' });
      const body = el('div');
      const show = i => {
        tab[w.id] = i;
        [...tabs.children].forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
        body.innerHTML = ''; body.appendChild(chapterView(chs[i]));
      };
      chs.forEach((c, i) => tabs.appendChild(el('button', { cls: 'tab', type: 'button', role: 'tab', text: c.title, onclick: () => show(i) })));
      page.append(tabs, body); show(tab[w.id] || 0);
    } else if (chs.length) {
      page.appendChild(el('div', { cls: 'mt' }, [chapterView(chs[0])]));
    }

    /* the telling */
    if (w.tellings) {
      page.appendChild(el('div', { cls: 'panel mt' }, [
        el('div', { cls: 'name', style: 'color:var(--gold);font-size:17px', text: '▷ Tellings · da ávErk á Aakalay' }),
        el('p', { cls: 'small mt', text: 'The Legend of Aakalay, Part the First: Kiet and his Great Nekh’Vorran, Jhealanil, in the last days of the Era of the Nekh’Vorran. A short film in the manner of the Mbaru Tatu, about 23 minutes.' }),
        el('button', { cls: 'btn primary mt', type: 'button', text: '▶ Watch the telling', onclick: openFilm }),
      ]));
    }

    /* creatures */
    const sections = (w.creatures || []).map(([t, ids]) => [t, ids.filter(id => SP.get(id))]).filter(([, ids]) => ids.length);
    if (sections.length || (w.later || []).length) {
      page.appendChild(el('h3', { cls: 'sec-title', text: w.id === 'mbaru' ? 'The Vakarborac · the creatures' : 'Creatures and peoples' }));
    }
    let search = null;
    const beastsBox = el('div');
    if (sections.length > 1) {
      search = el('input', { cls: 'search', type: 'search', placeholder: '🔎 Find a creature…', 'aria-label': 'Find a creature' });
      search.addEventListener('input', () => beasts());
      page.appendChild(search);
    }
    page.appendChild(beastsBox);
    function beasts() {
      beastsBox.innerHTML = '';
      const q = search ? search.value.trim().toLowerCase() : '';
      sections.forEach(([title, ids]) => {
        const shown = ids.filter(id => { const sp = SP.get(id); return !q || sp.name.toLowerCase().includes(q) || (sp.desc || '').toLowerCase().includes(q); });
        if (!shown.length) return;
        beastsBox.appendChild(el('h4', { cls: 'sec-title', style: 'font-size:16px', text: title }));
        beastsBox.appendChild(el('div', { cls: 'beasts' }, shown.map(id => {
          const sp = SP.get(id);
          return el('button', { cls: 'beast-card', type: 'button', 'aria-label': sp.name + (HAS_3D[id] ? ', in 3D' : ''), onclick: () => { location.hash = w.id + '/' + id; } }, [
            HAS_3D[id] ? el('span', { cls: 'badge3d', text: '3D' }) : null,
            art(id, 110),
            el('span', { cls: 'bn', text: displayName(sp) }),
            el('span', { cls: 'bm', text: sp.element + (sp.element2 ? '/' + sp.element2 : '') + ' · ' + SP.SIZES[sp.size[0]] + (sp.size[1] > sp.size[0] ? '–' + SP.SIZES[sp.size[1]] : '') }),
          ]);
        })));
      });
      if (!q && (w.later || []).length) {
        beastsBox.appendChild(el('h4', { cls: 'sec-title', style: 'font-size:16px', text: 'Awaiting future volumes' }));
        beastsBox.appendChild(el('div', { cls: 'grid later' }, w.later.map(x => el('div', { cls: 'card' }, [el('div', { cls: 'name', text: x.name }), el('div', { cls: 'body', text: x.body })]))));
      }
    }
    beasts();
  }
  const displayName = sp => (sp.id === 'lutut' ? 'Lútut' : sp.name);

  /* ---------- one creature, close up ---------- */
  let viewer = null;
  function closeBeast() {
    if (viewer) { viewer.stop(); viewer = null; }
    $('beast').classList.add('hidden'); $('beast-body').innerHTML = '';
  }
  function openBeast(id) {
    const sp = SP.get(id); if (!sp) return;
    const body = $('beast-body'); body.innerHTML = '';
    const info = el('div', {}, [
      el('h2', { id: 'beast-h', text: displayName(sp) }),
      el('div', { cls: 'mt' }, [
        el('span', { cls: 'pill el-' + sp.element + '-t', text: sp.element + (sp.element2 ? '/' + sp.element2 : '') }),
        el('span', { cls: 'pill', style: 'color:var(--gold)', text: SP.RARITIES[sp.rarity[0]] + (sp.rarity[1] > sp.rarity[0] ? '–' + SP.RARITIES[sp.rarity[1]] : '') }),
        el('span', { cls: 'pill muted', text: SP.SIZES[sp.size[0]] + (sp.size[1] > sp.size[0] ? '–' + SP.SIZES[sp.size[1]] : '') }),
      ]),
      el('p', {}, [el('b', { text: 'Description · ' }), sp.desc || '']),
      sp.temperament ? el('p', {}, [el('b', { text: 'Temperament · ' }), sp.temperament]) : null,
      sp.special ? el('p', {}, [el('b', { text: 'Notes · ' }), sp.special]) : null,
    ]);
    if (HAS_3D[id]) {
      const host = el('div', { cls: 'lv' });
      body.append(info, host);
      import('./lutut_viewer.js').then(m => { if (host.isConnected) viewer = m.mountLutut(host, { mode: 'auto' }); })
        .catch(e => { host.textContent = 'The 3D viewer could not be loaded.'; console.warn(e); });
    } else {
      const big = art(id, 320); big.className = 'big';
      const states = [['idle', 'Idle'], ['walk', 'Move'], ['attack', 'Attack'], ['special', 'Special'], ['dormant', 'Rest']];
      const chips = el('div', { cls: 'chips' });
      const paint = () => { chips.innerHTML = ''; states.forEach(([s, n]) => chips.appendChild(el('button', { cls: 'chip' + (big._state === s ? ' on' : ''), type: 'button', text: n, onclick: () => { big._state = s; paint(); } }))); };
      paint();
      body.appendChild(el('div', { cls: 'bx' }, [el('div', { cls: 'bx-art' }, [big, chips, el('div', { cls: 'small muted', text: 'Drawn as in Dya’Akara. Its 3D model is still to come.' })]), info]));
    }
    $('beast').classList.remove('hidden');
    $('beast-x').focus();
  }
  $('beast-x').onclick = () => { history.replaceState(null, '', '#' + current); closeBeast(); };
  $('beast').addEventListener('click', e => { if (e.target === $('beast')) $('beast-x').click(); });

  /* ---------- the film ---------- */
  function openFilm() {
    $('film-frame').innerHTML = '';
    $('film-frame').appendChild(el('iframe', { src: 'film/the-legend-of-aakalay.html', allow: 'autoplay; fullscreen', title: 'The Legend of Aakalay' }));
    $('film').classList.remove('hidden');
  }
  function closeFilm() { $('film').classList.add('hidden'); $('film-frame').innerHTML = ''; }
  $('film-x').onclick = closeFilm;
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('film').classList.contains('hidden')) closeFilm();
    else if (!$('beast').classList.contains('hidden')) $('beast-x').click();
  });

  /* ---------- routing: #world or #world/creature ---------- */
  function route() {
    const [wid, cid] = decodeURIComponent(location.hash.slice(1)).split('/');
    const w = RK.world(wid) ? wid : (cid ? RK.homeOf(cid) : 'mbaru');
    if (w !== current) { current = w; render(); }
    if (cid && SP.get(cid)) openBeast(cid); else closeBeast();
  }
  window.addEventListener('hashchange', route);
  route();
})();
