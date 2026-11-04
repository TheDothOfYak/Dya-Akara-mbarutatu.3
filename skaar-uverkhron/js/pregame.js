/* ============================================================
   SKAAR UVERKHRON — js/pregame.js
   The new-game screen: choose a scenario (a made map or a
   random one), the difficulty, and for each player who plays,
   their faction, starting hero, starting bonus, team and colour.
   The random map generator's options live here too.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, U = SU.ui, el = U.el, btn = U.btn, G = SU.game, V = SU.mapView, A = SU.art;
  const $ = id => document.getElementById(id);
  const SIZES = ['S', 'M', 'L', 'XL', 'G'];
  const SIZE_NAMES = { S: 'Small', M: 'Medium', L: 'Large', XL: 'Extra large', G: 'Gigantic' };
  const PREF = 'su_pregame';
  const loadPref = () => { try { return JSON.parse(localStorage.getItem(PREF) || '{}') || {}; } catch (e) { return {}; } };
  const savePref = p => { try { localStorage.setItem(PREF, JSON.stringify(p)); } catch (e) {} };

  let cfg, view, lists, full = {};

  G.setup = function (opts) {
    opts = opts || {};
    const acc = SU.save.account(), pref = loadPref();
    cfg = {
      name: 'A new game', map: opts.map || null, mapEntry: opts.map ? { id: opts.map.id, name: opts.map.name, desc: opts.map.desc, size: opts.map.size, players: (opts.map.starts || []).length, src: 'yours' } : null,
      size: pref.size || 'M', starts: pref.starts || 'random', wild: pref.wild || 'normal', water: pref.water || 'normal', storm: pref.storm !== false,
      winKind: 'conquer', seed: '', difficulty: pref.difficulty || 'captain',
      players: [
        { kind: 'human', name: acc ? acc.name : 'You', ai: 'auto', team: 0, colorId: 'red', faction: 'duskareth', hero: 'random', bonus: 'random' },
        { kind: 'ai', name: 'Computer', ai: 'auto', team: 0, colorId: 'blue', faction: 'random', hero: 'random', bonus: 'random' },
      ],
    };
    view = { tab: opts.map ? 'maps' : 'random', filter: 'all' };
    lists = null; full = {};
    if (opts.map) full[key(cfg.mapEntry)] = opts.map;
    const t = $('title'); t.classList.remove('hidden'); t.innerHTML = '';
    U.closeAll();
    const cv = el('canvas', { cls: 'bg' }); t.appendChild(cv); backdrop(cv);
    t.appendChild(el('div', { cls: 'pregame', id: 'pregame' }));
    render();
    loadLists();
  };

  const key = e => (e.src || '') + ':' + e.id;
  async function loadLists() {
    const builtin = await SU.editor.listBuiltin();
    const mine = SU.editor.listLocal();
    let shared = []; try { shared = await SU.editor.listShared(); } catch (e) { shared = []; }
    lists = [].concat(
      builtin.map(m => ({ id: m.id, file: m.file, name: m.name, desc: m.desc, size: m.size, players: m.players, src: 'builtin' })),
      mine.map(m => ({ id: m.id, name: m.name, desc: m.desc, size: m.size, players: (m.starts || []).length, src: 'yours', win: m.win })),
      shared.map(m => ({ id: m.id, name: m.name, desc: m.desc, size: m.size, players: m.players, author: m.author, src: 'shared' })));
    mine.forEach(m => { full['yours:' + m.id] = m; });
    if ($('pregame')) render();
  }
  async function fullMap(e) {
    const k = key(e); if (full[k]) return full[k];
    let m = null;
    try { m = e.src === 'builtin' ? await SU.editor.loadBuiltin(e) : e.src === 'shared' ? await SU.editor.loadShared(e.id) : null; } catch (er) { m = null; }
    if (m) full[k] = m;
    return m;
  }

  function maxPlayers() { return cfg.map ? Math.max(2, (cfg.map.starts || []).length) : 6; }
  function diff() { return D.DIFFICULTY.find(d => d.id === cfg.difficulty) || D.DIFFICULTY[2]; }
  function sel(val, opts, on, attrs) {
    return el('select', Object.assign({ onchange: e => { on(e.target.value); render(); } }, attrs || {}), opts.map(o => el('option', { value: o[0], selected: o[0] === val ? 'selected' : null, disabled: o[2] ? 'disabled' : null }, o[1])));
  }
  function seg(val, opts, on) {
    return el('div', { cls: 'seg' }, opts.map(([v, n, tip]) => btn(n, () => { on(v); render(); }, v === val ? 'on' : '', tip)));
  }

  /* ======================= drawing the screen ======================= */
  function render() {
    const root_ = $('pregame'); if (!root_) return;
    root_.innerHTML = '';
    root_.appendChild(el('div', { cls: 'pg-head' }, [el('h1', { text: 'A new game' }), el('div', { cls: 'spacer' }),
      el('label', { cls: 'small muted' }, ['Name ', el('input', { cls: 'inp', value: cfg.name, style: { width: '220px' }, oninput: e => cfg.name = e.target.value })])]));
    root_.appendChild(el('div', { cls: 'pg-main' }, [left(), right()]));
    root_.appendChild(el('div', { cls: 'pg-foot' }, [btn('← Back', () => G.title(), 'big'), el('div', { cls: 'spacer' }),
      el('div', { cls: 'small muted', text: 'Rating ' + rating() + '%' }),
      btn('Begin', begin, 'primary big')]));
  }

  /* --- the left side: random, or a list of made maps --- */
  function left() {
    const box = el('div', { cls: 'panel pg-left' });
    box.appendChild(el('div', { cls: 'tabs' }, [
      btn('Random map', () => { view.tab = 'random'; cfg.map = null; cfg.mapEntry = null; render(); }, view.tab === 'random' ? 'on' : ''),
      btn('Made maps', () => { view.tab = 'maps'; render(); }, view.tab === 'maps' ? 'on' : '')]));
    if (view.tab === 'random') { box.appendChild(randomOptions()); return box; }
    box.appendChild(seg(view.filter, [['all', 'All']].concat(SIZES.map(s => [s, s, SIZE_NAMES[s]])), v => view.filter = v));
    const list = el('div', { cls: 'pg-list' });
    list.appendChild(el('div', { cls: 'pg-row hd small muted' }, [el('span', { text: 'Size' }), el('span', { text: 'Pl.' }), el('span', { text: 'Name' }), el('span', { text: '' })]));
    if (!lists) list.appendChild(el('p', { cls: 'muted small', text: 'Looking for maps…' }));
    else {
      const shown = lists.filter(e => view.filter === 'all' || e.size === view.filter);
      if (!shown.length) list.appendChild(el('p', { cls: 'muted small', text: 'No maps of that size yet. Make one in the map editor, or try a random map.' }));
      shown.forEach(e => list.appendChild(el('div', { cls: 'pg-row' + (cfg.mapEntry && key(cfg.mapEntry) === key(e) ? ' on' : ''), onclick: () => pick(e) }, [
        el('span', { cls: 'sz', text: e.size || '?' }), el('span', { text: String(e.players || '?') }), el('span', { cls: 'nm', text: e.name || 'A map' }),
        el('span', { cls: 'tag ' + e.src, text: { builtin: 'with the game', yours: 'yours', shared: e.author ? 'by ' + e.author : 'shared' }[e.src] })])));
    }
    box.appendChild(list);
    return box;
  }
  async function pick(e) {
    cfg.mapEntry = e; cfg.map = null; render();
    const m = await fullMap(e);
    if (cfg.mapEntry !== e) return;
    if (!m) { U.toast('Could not load that map.'); cfg.mapEntry = null; render(); return; }
    cfg.map = m;
    if (cfg.name === 'A new game' || (cfg._autoName && cfg.name === cfg._autoName)) { cfg.name = m.name; cfg._autoName = m.name; }
    while (cfg.players.length > maxPlayers()) cfg.players.pop();
    render();
  }

  function randomOptions() {
    const box = el('div', { cls: 'pg-random' });
    const row = (label, ctl, note) => el('div', { cls: 'pg-opt' }, [el('div', { cls: 'lbl', text: label }), el('div', {}, [ctl, note ? el('div', { cls: 'small muted', text: note }) : null])]);
    box.appendChild(el('h3', { text: 'The random map' }));
    box.appendChild(row('Size', seg(cfg.size, SIZES.map(s => [s, SIZE_NAMES[s]]), v => { cfg.size = v; }),
      { S: 'Quick games for two.', M: 'The usual size.', L: 'Room for four or more.', XL: 'Long games.', G: 'Gigantic: a long campaign across the worlds.' }[cfg.size]));
    box.appendChild(row('Water', seg(cfg.water, [['little', 'Little'], ['normal', 'Normal'], ['lots', 'Lots']], v => cfg.water = v)));
    box.appendChild(row('Wild creatures', seg(cfg.wild, [['weak', 'Weak'], ['normal', 'Normal'], ['strong', 'Fierce']], v => cfg.wild = v)));
    box.appendChild(row('Where you start', sel(cfg.starts, [['random', 'Anywhere (random)'], ['spread', 'Spread across the three Tatu'], ['velki', 'Everyone on Velki']], v => cfg.starts = v),
      cfg.starts === 'random' ? 'With three players, each starts on a different Tatu.' : null));
    box.appendChild(row('The storm', seg(cfg.storm ? 'on' : 'off', [['on', 'Sunear’Zikhron'], ['off', 'Calm skies']], v => { cfg.storm = v === 'on'; if (!cfg.storm && cfg.winKind === 'prophecy') cfg.winKind = 'conquer'; }),
      cfg.storm ? 'The storm wanders the Tatu; its eye calls the Nekh’Vorran.' : 'No storm: no Nekh’Vorran this game.'));
    box.appendChild(row('Victory', sel(cfg.winKind, [['conquer', D.WIN.conquer.name], ['prophecy', D.WIN.prophecy.name, !cfg.storm], ['gold', D.WIN.gold.name]], v => cfg.winKind = v)));
    const seed = el('input', { cls: 'inp', value: cfg.seed, placeholder: 'random', style: { width: '120px' }, oninput: e => { cfg.seed = e.target.value.replace(/[^0-9]/g, ''); } });
    box.appendChild(row('Seed', el('div', { cls: 'row' }, [seed, btn('🎲', () => { cfg.seed = String((Math.random() * 1e9) | 0); render(); }, 'icon', 'Roll a seed'), btn('Preview', preview, '', 'Make the map now and look at it')]),
      'The same seed and options make the same map.'));
    return box;
  }
  function setupOf() {
    return { size: cfg.size, starts: cfg.starts, wild: cfg.wild, water: cfg.water, storm: cfg.storm, name: cfg.name, difficulty: cfg.difficulty,
      players: playersOf(), seed: cfg.seed ? +cfg.seed : 0, win: { kind: cfg.winKind, n: 3, gold: 200000 } };
  }
  function preview() {
    if (!cfg.seed) cfg.seed = String((Math.random() * 1e9) | 0);
    U.toast('Shaping the Mbaru Tatu…');
    setTimeout(() => { try { view.preview = { seed: cfg.seed, st: SU.mapgen.newGame(setupOf()), size: cfg.size }; } catch (e) { console.error(e); U.toast('That map could not be made.'); } render(); }, 30);
  }

  /* --- the right side: about the scenario, difficulty, players --- */
  function right() {
    const box = el('div', { cls: 'pg-right' });
    box.appendChild(info());
    box.appendChild(difficulty());
    box.appendChild(playersTable());
    return box;
  }
  function info() {
    const box = el('div', { cls: 'panel pg-info' });
    const pic = el('div', { cls: 'pg-thumbs' });
    let title, desc, facts = [], win;
    if (view.tab === 'random') {
      title = 'A random map'; desc = 'A new Mbaru Tatu, shaped for this game: the three Tatu, the Kalo moons and the Urverk between them.';
      facts = [SIZE_NAMES[cfg.size], cfg.players.length + ' players', { little: 'little water', normal: 'some water', lots: 'much water' }[cfg.water], cfg.storm ? 'storm' : 'no storm'];
      win = cfg.winKind;
      const pv = view.preview && view.preview.seed === cfg.seed && view.preview.size === cfg.size ? view.preview.st : null;
      if (pv) thumbs(pic, pv);
      else pic.appendChild(el('div', { cls: 'pg-q', text: '?' }));
    } else if (cfg.mapEntry) {
      const e = cfg.mapEntry; title = e.name; desc = e.desc || 'No description.';
      facts = [SIZE_NAMES[e.size] || e.size, (e.players || '?') + ' players', e.author ? 'by ' + e.author : null, e.src === 'builtin' ? 'comes with the game' : null].filter(Boolean);
      win = cfg.map && cfg.map.win ? cfg.map.win.kind : 'conquer';
      if (cfg.map) thumbs(pic, SU.editor.mapToState(cfg.map));
      else pic.appendChild(el('div', { cls: 'pg-q', text: '…' }));
    } else { title = 'Choose a map'; desc = 'Pick a map from the list, or play a random one.'; win = 'conquer'; pic.appendChild(el('div', { cls: 'pg-q', text: '?' })); }
    const W = D.WIN[win] || D.WIN.conquer;
    box.appendChild(pic);
    box.appendChild(el('div', { cls: 'pg-about' }, [
      el('h2', { text: title }), el('div', { cls: 'small muted', text: facts.join(' · ') }), el('p', { text: desc }),
      el('div', { cls: 'pg-cond' }, [el('b', { cls: 'gold', text: 'Victory: ' }), W.name + ' — ' + W.desc + (win === 'gold' ? ' (200,000 gold)' : '') + (win !== 'conquer' ? ' Taking every rival’s towns always wins too.' : '')]),
      el('div', { cls: 'pg-cond' }, [el('b', { cls: 'gold', text: 'Defeat: ' }), 'Lose all your towns and do not take one back within a week.'])]));
    return box;
  }
  function thumbs(pic, st) {
    st.layers.forEach((L, li) => {
      const big = li === 0, c = V.thumb(st, li, big ? 200 : 96, big ? 150 : 72);
      pic.appendChild(el('div', { cls: 'th' + (big ? ' big' : '') }, [c, el('span', { cls: 'small muted', text: D.LAYERS[li].name })]));
    });
  }
  function difficulty() {
    const box = el('div', { cls: 'panel pg-diff' }, [el('h3', { text: 'Difficulty' })]);
    box.appendChild(el('div', { cls: 'pg-diffs' }, D.DIFFICULTY.map((d, i) => el('button', { type: 'button', cls: 'pg-dbtn' + (d.id === cfg.difficulty ? ' on' : ''), title: d.desc, onclick: () => { cfg.difficulty = d.id; render(); } }, [diffIcon(i), el('div', { cls: 'nm', text: d.name }), el('div', { cls: 'small muted', text: d.pct + '%' })]))));
    box.appendChild(el('div', { cls: 'small muted', text: diff().desc + ' Computer players set to “By difficulty” play at ' + D.AI_LEVELS[diff().ai].name + '.' }));
    return box;
  }
  function diffIcon(i) {
    const s = 40, c = el('canvas', { width: s * 2, height: s * 2 }); c.style.width = s + 'px'; c.style.height = s + 'px';
    const g = c.getContext('2d'); g.scale(2, 2);
    g.fillStyle = A.radial(g, s / 2, s / 2, s * 0.6, ['#4a6a3a', '#5a6a3a', '#6a5a30', '#6a3a2a', '#5a1a2a'][i], '#120c08'); g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c9a85a'; g.lineWidth = 1.2; g.stroke();
    /* more Nekh fangs the harder it is */
    for (let k = 0; k <= i; k++) { const x = s / 2 + (k - i / 2) * 6; g.fillStyle = '#efe4c8'; g.beginPath(); g.moveTo(x - 2.4, s * 0.3); g.lineTo(x + 2.4, s * 0.3); g.lineTo(x, s * 0.72); g.closePath(); g.fill(); }
    return c;
  }
  function rating() {
    const d = diff(); let r = d.pct;
    cfg.players.forEach(p => { if (p.kind !== 'ai') return; const lv = p.ai === 'auto' ? d.ai : p.ai; r += { easy: -10, normal: 0, hard: 15, brutal: 30 }[lv] - { easy: -10, normal: 0, hard: 15, brutal: 30 }[d.ai]; });
    return Math.max(40, r);
  }

  function playersTable() {
    const box = el('div', { cls: 'panel pg-players' }, [el('h3', { text: 'Players' })]);
    const tbl = el('table', { cls: 'setup pg-tbl' }, [el('tr', {}, ['', 'Name', 'Who', 'Faction', 'Starting hero', 'Bonus', 'Team', ''].map(x => el('th', { cls: 'small muted', text: x })))]);
    const taken = cfg.players.map(p => p.hero);
    cfg.players.forEach((p, i) => {
      const used = cfg.players.map(q => q.colorId);
      const col = D.PLAYER_COLORS.find(c => c.id === p.colorId);
      const swatch = el('button', { type: 'button', cls: 'pg-swatch', title: col.name + ' — click for another colour', style: { background: col.c }, onclick: () => { const free = D.PLAYER_COLORS.filter(c => c.id === p.colorId || !used.includes(c.id)); const k = free.findIndex(c => c.id === p.colorId); p.colorId = free[(k + 1) % free.length].id; render(); } });
      const hero = D.START_HEROES.find(h => h.id === p.hero);
      tbl.appendChild(el('tr', {}, [
        el('td', {}, swatch),
        el('td', {}, el('input', { cls: 'inp', value: p.name, style: { width: '120px' }, oninput: e => p.name = e.target.value })),
        el('td', {}, [sel(p.kind, [['human', 'A person'], ['ai', 'Computer']], v => { p.kind = v; if (v === 'ai' && /^You$/.test(p.name)) p.name = 'Computer'; }),
          p.kind === 'ai' ? sel(p.ai, [['auto', 'By difficulty']].concat(Object.entries(D.AI_LEVELS).map(([k, v]) => [k, v.name])), v => p.ai = v, { style: { marginLeft: '4px' } }) : null]),
        el('td', {}, sel(p.faction, [['random', 'Random']].concat(D.FACTIONS.map(f => [f.id, f.name.replace(/^The /, '') + (f.ready ? '' : ' (coming)'), !f.ready])), v => p.faction = v)),
        el('td', {}, el('div', { cls: 'row', style: { flexWrap: 'nowrap', gap: '6px' } }, [hero ? U.portrait(hero.people, 7 + i, col.c, 30) : el('div', { cls: 'pg-rand', text: '?' }),
          sel(p.hero, [['random', 'Random']].concat(D.START_HEROES.map(h => [h.id, h.name, h.id !== p.hero && taken.includes(h.id)])), v => p.hero = v, { title: hero ? D.PEOPLES[hero.people].name + '. ' + hero.desc : 'A random hero of the Duskareth' })])),
        el('td', {}, sel(p.bonus, Object.entries(D.BONUSES), v => p.bonus = v)),
        el('td', {}, sel(String(p.team), [['0', 'Alone'], ['1', 'Team 1'], ['2', 'Team 2'], ['3', 'Team 3']], v => p.team = +v)),
        el('td', {}, cfg.players.length > 2 ? btn('✕', () => { cfg.players.splice(i, 1); render(); }, 'icon', 'Remove this player') : ''),
      ]));
    });
    box.appendChild(el('div', { cls: 'pg-tblwrap' }, tbl));
    const notes = cfg.players.map(p => [p, D.START_HEROES.find(h => h.id === p.hero)]).filter(x => x[1]);
    if (notes.length) box.appendChild(el('div', { cls: 'small', style: { margin: '6px 0' } }, notes.map(([p, h]) => el('div', {}, [el('b', { cls: 'gold', text: h.name }), ' (' + D.PEOPLES[h.people].name + ', ' + p.name + '): ' + h.desc]))));
    if (cfg.players.length < maxPlayers()) box.appendChild(btn('+ Add a player', () => { const used = cfg.players.map(p => p.colorId); cfg.players.push({ kind: 'ai', name: 'Computer ' + cfg.players.length, ai: 'auto', team: 0, colorId: D.PLAYER_COLORS.find(c => !used.includes(c.id)).id, faction: 'random', hero: 'random', bonus: 'random' }); render(); }));
    box.appendChild(el('p', { cls: 'small muted', text: 'The Duskareth and the Elsha’ryn are ready; the SkarValorin are coming. Two or more people on this device take turns, and the screen hides between turns. For friends on other devices, use Online games on the title screen.' }));
    return box;
  }

  function playersOf() {
    const d = diff();
    return cfg.players.map(p => {
      const h = D.START_HEROES.find(x => x.id === p.hero);
      const ready = D.FACTIONS.filter(f => f.ready).map(f => f.id);
      return { kind: p.kind, name: p.name, ai: p.kind === 'ai' ? (p.ai === 'auto' ? d.ai : p.ai) : 'normal', team: p.team, colorId: p.colorId, faction: p.faction === 'random' ? ready[Math.floor(Math.random() * ready.length)] : p.faction,
        hero: h ? { people: h.people, base: h.base, name: h.name } : null, bonus: p.bonus };
    });
  }
  function begin() {
    if (view.tab === 'maps' && !cfg.map) { U.toast(cfg.mapEntry ? 'The map is still loading…' : 'Choose a map first.'); return; }
    if (!cfg.players.some(p => p.kind === 'human')) { U.toast('At least one person has to play.'); return; }
    savePref({ size: cfg.size, starts: cfg.starts, wild: cfg.wild, water: cfg.water, storm: cfg.storm, difficulty: cfg.difficulty });
    G.newGame({ map: view.tab === 'maps' ? cfg.map : null, name: cfg.name, size: cfg.size, starts: cfg.starts, wild: cfg.wild, water: cfg.water, storm: cfg.storm,
      seed: cfg.seed ? +cfg.seed : 0, winKind: cfg.winKind, difficulty: cfg.difficulty, players: playersOf() });
  }

  /* the backdrop: a dim, slow sky */
  function backdrop(cv) {
    let raf;
    const draw = now => {
      if (!$('pregame')) { cancelAnimationFrame(raf); return; }
      raf = requestAnimationFrame(draw);
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
      const g = cv.getContext('2d'), t = now / 1000, w = r.width, h = r.height; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = A.lin(g, 0, 0, 0, h, [[0, '#07060f'], [0.6, '#1c1530'], [1, '#120c14']]); g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + 0.2 * Math.sin(t * 0.7 + i)) + ')'; g.fillRect((i * 263.7) % w, (i * 97.3) % h, 1.4, 1.4); }
    };
    raf = requestAnimationFrame(draw);
  }
})(typeof window !== 'undefined' ? window : globalThis);
