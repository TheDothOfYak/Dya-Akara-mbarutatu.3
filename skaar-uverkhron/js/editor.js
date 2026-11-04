/* ============================================================
   SKAAR UVERKHRON — js/editor.js
   The map editor. Paint terrain, trees, mountains and roads on
   all four layers; place towns, starting towns, mines, treasure,
   places to visit, Urverk (linked in pairs), and wild groups.
   Save maps in this browser, share them with everyone (an admin
   approves them first), and play them.

   A map is { id, name, desc, author, size, layers (packed), objects,
   wild: [{ layer, x, y, power, cr, guard }], starts: [town ids] }.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, RU = SU.rules, M = SU.make, V = SU.mapView;
  const U = SU.ui, el = U.el, btn = U.btn;
  const E = SU.editor = {};
  const $ = id => document.getElementById(id);
  const MKEY = 'su_map_';

  E.active = false;
  let est = null;           // the map being edited, shaped like a game state
  let tool = { kind: 'terrain', terrain: 'grass', brush: 1 };
  let panel = null, linkFrom = null, painting = false;

  /* ---------- a blank map ---------- */
  function blank(size, name) {
    const base = SU.mapgen.SIZES[size] || SU.mapgen.SIZES.M;
    const st = { version: 1, seed: 1, rngState: 7, nextId: 1, day: 1, current: 0, setup: { size, name, players: [] }, layers: [], objects: {}, armies: {}, heroes: {}, cores: {}, players: [], storm: null, weekEvent: 'none', monthEvent: 'none', log: [] };
    D.LAYERS.forEach((ld, li) => {
      const w = Math.round(base * ld.scale), h = Math.round(base * ld.scale * (li === 3 ? 0.8 : 1));
      const L = { id: ld.id, w, h, t: new Uint8Array(w * h), ob: new Uint8Array(w * h), road: new Uint8Array(w * h), v: new Uint8Array(w * h) };
      for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0; const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
        L.t[i] = li === 3 ? S.TC.void : edge < 2 ? S.TC.water : S.TC.grass; L.v[i] = (i * 2654435761 >>> 24) & 255; }
      st.layers.push(L);
    });
    return st;
  }
  function editorPlayer(st) { st.players = [Object.assign(M.player(st, 0, { name: 'Editor', kind: 'human' }), { explored: st.layers.map(L => new Uint8Array(L.w * L.h).fill(1)) })]; }

  /* ---------- opening and closing ---------- */
  E.open = function (map) {
    U.closeAll();
    $('title').classList.add('hidden');
    est = map ? E.mapToState(map) : blank('M', 'A new map');
    est.mapId = map ? map.id : 'm' + Date.now().toString(36);
    est.mapDesc = map ? map.desc || '' : '';
    editorPlayer(est);
    S.rebuild(est);
    E.active = true; U.st = null; U.viewer = 0;
    $('game').classList.remove('hidden'); V.resize();
    V.setGame(est); V.paintMode = true; V.setLayer(0); V.centerOn(0, est.layers[0].w >> 1, est.layers[0].h >> 1);
    [...$('side').children].forEach(c => c.style.display = 'none');
    $('mini').style.display = ''; $('layers').style.display = '';
    panel = el('div', { cls: 'col', id: 'edpanel' }); $('side').appendChild(panel);
    $('topbar').innerHTML = ''; $('topbar').appendChild(el('span', { cls: 'gold', text: 'Skaar Uverkhron — map editor' })); $('topbar').appendChild(el('span', { cls: 'muted small', style: { marginLeft: 'auto' }, text: 'Keys 1–4 switch layers · right-drag to look around' }));
    buildLayerButtons();
    render();
  };
  E.close = function () {
    E.active = false; V.paintMode = false; est = null;
    if (panel) panel.remove(); panel = null;
    [...$('side').children].forEach(c => c.style.display = '');
    $('game').classList.add('hidden');
    SU.game.title();
  };
  function buildLayerButtons() {
    const box = $('layers'); box.innerHTML = '';
    D.LAYERS.forEach((L, i) => box.appendChild(el('button', { cls: 'btn' + (V.layer === i ? ' on' : ''), onclick: () => { V.setLayer(i); buildLayerButtons(); } }, L.name)));
  }

  /* ---------- the tool panel ---------- */
  const TOOLS = [['terrain', 'Terrain'], ['obstacle', 'Trees & rock'], ['road', 'Road'], ['town', 'Town'], ['keep', 'Keep'], ['mine', 'Mine'], ['treasure', 'Treasure'], ['visit', 'Places'], ['urverk', 'Urverk'], ['wild', 'Wild group'], ['erase', 'Erase']];
  function render() {
    const P = panel; P.innerHTML = '';
    P.appendChild(el('div', { cls: 'lhead' }, [el('span', { text: 'Map editor' })]));
    P.appendChild(el('input', { cls: 'inp', value: est.setup.name, oninput: e => est.setup.name = e.target.value, title: 'The map’s name' }));
    P.appendChild(el('textarea', { cls: 'inp', rows: 2, placeholder: 'A line about the map', oninput: e => est.mapDesc = e.target.value }, est.mapDesc || ''));
    P.appendChild(el('div', { cls: 'row', style: { gap: '4px' } }, TOOLS.map(([k, n]) => btn(n, () => { tool = Object.assign({ kind: k }, defaults(k)); linkFrom = null; render(); }, tool.kind === k ? 'primary' : '', null))));
    const opts = el('div', { cls: 'col frame' }); P.appendChild(opts);
    const pick = (label, list, key) => opts.appendChild(el('div', {}, [el('div', { cls: 'small muted', text: label }), el('select', { cls: 'inp', style: { width: '100%' }, onchange: e => { tool[key] = e.target.value; } }, list.map(([v, n]) => el('option', { value: v, selected: String(tool[key]) === String(v) ? 'selected' : null }, n)))]));
    switch (tool.kind) {
      case 'terrain': pick('Terrain', Object.keys(D.TERRAIN).map(k => [k, D.TERRAIN[k].name]), 'terrain'); pick('Brush', [[1, 'Small'], [2, 'Medium'], [3, 'Large']], 'brush'); break;
      case 'obstacle': pick('Kind', S.OB_NAMES.filter(n => n !== 'none').map(n => [n, n]), 'obstacle'); pick('Brush', [[1, 'Small'], [2, 'Medium'], [3, 'Large']], 'brush'); break;
      case 'road': pick('Road', [['add', 'Lay road'], ['del', 'Take up road']], 'mode'); break;
      case 'town': pick('Owner', [['start', 'A starting town (one per player)'], ['neutral', 'An unclaimed town']], 'owner'); break;
      case 'mine': pick('Mine', Object.keys(D.MINES).map(k => [k, D.MINES[k].name]), 'mine'); break;
      case 'keep': pick('Garrison', [[1500, 'A few'], [3500, 'A band'], [8000, 'A host'], [18000, 'A horde']], 'power'); opts.appendChild(el('p', { cls: 'small muted', text: 'A family’s keep. Whoever holds it holds much of its territory. Territories are drawn on the map when a game starts.' })); break;
      case 'treasure': pick('What', [['chest', 'A buried treasure chest (found through quests)'], ['relic', 'A random Relic'], ['scroll', 'A song scroll'], ['boat', 'A boat']], 'what'); break;
      case 'visit': pick('Place', Object.keys(D.VISIT).map(k => [k, D.VISIT[k].name]), 'visit'); break;
      case 'urverk': pick('Kind', [['always', 'Always open'], ['aligned', 'Only when the worlds line up'], ['toll', 'Kept by a family (toll)'], ['danger', 'Dangerous crossing'], ['kalo', 'To a moon (Kalo)']], 'ukind');
        opts.appendChild(el('p', { cls: 'small muted', text: linkFrom ? 'Now click where the other end goes (any layer).' : 'Click to place one end, then the other end. They are linked.' })); break;
      case 'wild': pick('Strength', [[800, 'A few'], [2500, 'A band'], [7000, 'A host'], [18000, 'A horde'], [45000, 'A legion'], [100000, 'A vast legion']], 'power'); pick('Creatures', [['', 'Any'], ...Object.keys(D.CREATURES).filter(c => !D.CREATURES[c].upgraded).map(c => [c, D.CREATURES[c].plural])], 'cr'); break;
      case 'erase': opts.appendChild(el('p', { cls: 'small muted', text: 'Click a thing to remove it.' })); break;
    }
    est.mapWin = est.mapWin || { kind: 'conquer' };
    const towns = Object.values(est.objects).filter(o => o.type === 'town');
    P.appendChild(el('div', { cls: 'col frame' }, [el('div', { cls: 'small muted', text: 'How to win' }),
      el('select', { cls: 'inp', onchange: e => { est.mapWin.kind = e.target.value; render(); } }, Object.entries(D.WIN).map(([k, w]) => el('option', { value: k, selected: est.mapWin.kind === k ? 'selected' : null }, w.name))),
      est.mapWin.kind === 'town' ? el('select', { cls: 'inp', onchange: e => est.mapWin.town = e.target.value }, [el('option', { value: '' }, 'Choose the town…'), ...towns.map(t => el('option', { value: t.id, selected: est.mapWin.town === t.id ? 'selected' : null }, t.name + ' (' + D.LAYERS[t.layer].name + ')'))]) : null,
      est.mapWin.kind === 'gold' ? el('input', { cls: 'inp', type: 'number', value: est.mapWin.gold || 200000, step: 10000, oninput: e => est.mapWin.gold = +e.target.value }) : null,
      est.mapWin.kind === 'prophecy' ? el('input', { cls: 'inp', type: 'number', value: est.mapWin.n || 3, min: 1, max: 9, oninput: e => est.mapWin.n = +e.target.value }) : null]));
    const starts = Object.values(est.objects).filter(o => o.type === 'town' && o.start).length;
    P.appendChild(el('div', { cls: 'small muted', text: starts + ' starting town' + (starts === 1 ? '' : 's') + ' (that many players at most).' }));
    P.appendChild(el('div', { cls: 'col', style: { marginTop: '6px' } }, [
      btn('New blank map…', () => newMap()), btn('Fill with a random map…', () => randomMap()),
      btn('Save in this browser', () => { saveLocal(); U.toast('Saved.'); }, 'primary'),
      btn('Share with everyone…', () => share()), btn('Play this map', () => { saveLocal(); const mp = E.stateToMap(est); E.close(); SU.game.setup({ map: mp }); }),
      btn('Open a map…', () => E.pickMap(mp => E.open(mp), true)), btn('Leave the editor', () => U.confirm('Leave?', 'Unsaved changes are lost.', () => E.close())),
    ]));
    P.appendChild(el('p', { cls: 'small muted', text: 'Left-click (or drag) to paint. Right-drag or the arrow keys to look around. Scroll to zoom.' }));
  }
  function defaults(k) { return { terrain: { terrain: 'grass', brush: 1 }, obstacle: { obstacle: 'tree', brush: 1 }, road: { mode: 'add' }, town: { owner: 'start' }, mine: { mine: 'gold' }, treasure: { what: 'chest' }, keep: { power: 3500 }, visit: { visit: 'ring' }, urverk: { ukind: 'always' }, wild: { power: 2500, cr: '' }, erase: {} }[k] || {}; }

  /* ---------- painting ---------- */
  SU.on('mappaint', t => { if (!E.active) return; apply(t.x, t.y, t.first); });
  function apply(x, y, first) {
    const li = V.layer, L = est.layers[li]; if (!S.inside(L, x, y)) return;
    const brush = +(tool.brush || 1), r = brush - 1;
    const each = fn => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (S.inside(L, xx, yy)) fn(xx, yy, yy * L.w + xx); } };
    switch (tool.kind) {
      case 'terrain': each((xx, yy, i) => { L.t[i] = S.TC[tool.terrain]; if (D.TERRAIN[tool.terrain].pass === false) { L.ob[i] = 0; L.road[i] = 0; } }); break;
      case 'obstacle': each((xx, yy, i) => { if (D.TERRAIN[S.TCODES[L.t[i]]].pass !== false && !est._block[li][i] && !S.objAt(est, li, xx, yy)) L.ob[i] = S.OB[tool.obstacle || 'tree'] || 1; }); break;
      case 'road': L.road[y * L.w + x] = tool.mode === 'del' ? 0 : 1; if (tool.mode !== 'del') L.ob[y * L.w + x] = 0; break;
      default: if (!first) return; place(li, x, y); return;
    }
    V.chunks = {}; V.invalidate();
  }
  function free(li, x, y, foot) {
    const L = est.layers[li]; if (!S.inside(L, x, y)) return false;
    const tiles = [[0, 0]].concat(foot || []);
    return tiles.every(([dx, dy]) => { const xx = x + dx, yy = y + dy; if (!S.inside(L, xx, yy)) return false; const i = yy * L.w + xx; return D.TERRAIN[S.TCODES[L.t[i]]].pass !== false && !est._block[li][i] && !S.objAt(est, li, xx, yy) && !S.armyAt(est, li, xx, yy); });
  }
  function add(o) { o.id = SU.uid(est, 'o'); est.objects[o.id] = o; const L = est.layers[o.layer]; S.footprint(o).concat([[0, 0]]).forEach(([dx, dy]) => { const xx = o.x + dx, yy = o.y + dy; if (S.inside(L, xx, yy)) L.ob[yy * L.w + xx] = 0; }); S.place(est, o); V.chunks = {}; V.invalidate(); return o; }
  function place(li, x, y) {
    const R = SU.makeRng(Date.now() & 0xffff);
    switch (tool.kind) {
      case 'town': { const probe = { type: 'town' }; if (!free(li, x, y, S.footprint(probe))) return U.toast('No room for a town there.');
        const t = M.town(est, li, x, y, -1); delete est.objects[t.id]; t.start = tool.owner === 'start'; if (!t.start) t.built = ['hall1', 'fort1', 'd1', 'd2', 'tavern']; add(t); t.id = t.id; break; }
      case 'keep': { if (!free(li, x, y, [[-1, 0], [-1, -1], [0, -1]])) return U.toast('No room for a keep there.'); const k = SU.realm.makeKeep(est, li, x, y, -1, { power: +tool.power }); V.chunks = {}; V.invalidate(); break; }
      case 'mine': if (!free(li, x, y, [[-1, 0], [-1, -1], [0, -1]])) return U.toast('No room for a mine there.'); add({ type: 'mine', kind: tool.mine, layer: li, x, y, owner: -1, naga: tool.mine === 'ngakara' ? { alive: true, calm: 0 } : undefined }); break;
      case 'treasure': { if (!free(li, x, y)) return U.toast('Something is already there.'); const w = tool.what;
        if (w === 'chest') add({ type: 'chest', layer: li, x, y, gold: 4000, xp: 2500 });
        else if (w === 'relic') add({ type: 'relic', layer: li, x, y, relic: R.pick(D.RELIC_IDS.filter(r => D.RELICS[r].rare !== 'skaar')) });
        else if (w === 'scroll') add({ type: 'scroll', layer: li, x, y, song: R.pick(D.SONG_IDS.filter(s => D.SONGS[s].tier <= 3)) });
        else if (w === 'boat') { const L = est.layers[li]; if (!D.TERRAIN[S.terrainAt(L, x, y)].water) return U.toast('Boats go on water.'); add({ type: 'boat', layer: li, x, y, owner: -1 }); }
        break; }
      case 'visit': { const big = ['shrine', 'tower', 'library', 'fair']; const probe = { type: 'visit', kind: tool.visit };
        if (!free(li, x, y, S.footprint(probe))) return U.toast('No room there.');
        const o = { type: 'visit', kind: tool.visit, layer: li, x, y, visited: {} };
        if (tool.visit === 'songstone') o.song = R.pick(D.SONG_IDS.filter(s => D.SONGS[s].tier <= 3));
        if (tool.visit === 'shrine') { o.keeper = R.pick(D.NAMES.kaloeik); o.moon = D.LAYERS[li].name; }
        add(o); break; }
      case 'urverk': { if (!free(li, x, y, [[-1, -1], [0, -1], [1, -1]])) return U.toast('No room for an Urverk there.');
        const o = add({ type: 'urverk', layer: li, x, y, kind: tool.ukind, triggerKnown: true });
        if (tool.ukind === 'aligned' || tool.ukind === 'kalo') o.window = { period: tool.ukind === 'kalo' ? 10 : 24, from: R.int(0, 9), len: 4 };
        if (tool.ukind === 'toll') o.toll = { gold: 1000, family: 'the Lantern-Wardens', respect: {}, alive: true };
        if (tool.ukind === 'danger') o.danger = 0.25;
        if (linkFrom && est.objects[linkFrom]) { const a = est.objects[linkFrom]; a.link = o.id; o.link = a.id; o.kind = a.kind; if (a.window) o.window = SU.deep(a.window); if (a.toll) o.toll = SU.deep(a.toll); if (a.danger) o.danger = a.danger; linkFrom = null; U.toast('Linked.'); }
        else { linkFrom = o.id; U.toast('Now place the other end.'); }
        render(); break; }
      case 'wild': { if (!free(li, x, y)) return U.toast('Something is already there.');
        const a = M.wild(est, li, x, y, +tool.power, tool.cr ? { cr: tool.cr, stacks: 1 } : {}); a.power0 = +tool.power; a.edCr = tool.cr || null;
        const g = Object.values(est.objects).find(o => o.layer === li && Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1 && o.type !== 'town'); if (g) a.guard = g.id;
        break; }
      case 'erase': {
        const a = S.armyAt(est, li, x, y); if (a) { RU.removeArmy(est, a); break; }
        const o = S.objAt(est, li, x, y) || U.bodyObj(est, li, x, y); if (o) { S.unplace(est, o); delete est.objects[o.id]; if (o.link && est.objects[o.link]) delete est.objects[o.link].link; V.chunks = {}; V.invalidate(); }
        break; }
    }
    render();
  }

  /* ---------- new, random ---------- */
  function newMap() {
    let size = 'M';
    const m = U.modal([el('h2', { text: 'A new blank map' }), el('select', { cls: 'inp', onchange: e => size = e.target.value }, [['S', 'Small'], ['M', 'Medium'], ['L', 'Large'], ['XL', 'Extra large']].map(([v, n]) => el('option', { value: v, selected: v === 'M' ? 'selected' : null }, n))),
      el('div', { cls: 'acts' }, [btn('Cancel', () => m.close()), btn('Make it', () => { m.close(); const name = est.setup.name; est = blank(size, name); est.mapId = 'm' + Date.now().toString(36); editorPlayer(est); S.rebuild(est); V.setGame(est); V.setLayer(0); render(); }, 'primary')])]);
  }
  function randomMap() {
    let size = 'M', n = 2;
    const m = U.modal([el('h2', { text: 'Start from a random map' }), el('p', { cls: 'small muted', text: 'This replaces what is on the map now. You can change anything afterwards.' }),
      el('div', { cls: 'row' }, ['Size ', el('select', { cls: 'inp', onchange: e => size = e.target.value }, [['S', 'Small'], ['M', 'Medium'], ['L', 'Large'], ['XL', 'Extra large']].map(([v, k]) => el('option', { value: v, selected: v === 'M' ? 'selected' : null }, k))),
        ' Players ', el('select', { cls: 'inp', onchange: e => n = +e.target.value }, [2, 3, 4, 5, 6].map(k => el('option', { value: k }, String(k))))]),
      el('div', { cls: 'acts' }, [btn('Cancel', () => m.close()), btn('Make it', () => { m.close();
        const players = []; for (let i = 0; i < n; i++) players.push({ kind: 'ai', name: 'P' + (i + 1), color: D.PLAYER_COLORS[i].c });
        const g = SU.mapgen.newGame({ size, players, spread: true, name: est.setup.name });
        /* keep the land and the things; drop the players and their heroes */
        Object.values(g.objects).forEach(o => { if (o.type === 'town') { if (o.owner >= 0) o.start = true; o.owner = -1; } if (o.type === 'mine') o.owner = -1; });
        Object.values(g.armies).forEach(a => { if (!a.wild) { delete g.armies[a.id]; } });
        g.heroes = {}; g.cores = {}; const name = est.setup.name; est = g; est.setup.name = name; est.mapId = 'm' + Date.now().toString(36); editorPlayer(est); S.rebuild(est); V.setGame(est); V.setLayer(0); render();
      }, 'primary')])]);
  }

  /* ======================= map ↔ state ======================= */
  E.stateToMap = function (st) {
    const packed = JSON.parse(S.serialize(Object.assign({}, st, { players: [] })));
    const wild = Object.values(st.armies).filter(a => a.wild && !a.dead).map(a => ({ layer: a.layer, x: a.x, y: a.y, power: a.power0 || Math.round(S.power(a.slots)), cr: a.edCr || null, guard: a.guard || null, roam: !!a.roam, herd: !!a.herd }));
    const objects = {}; Object.values(st.objects).forEach(o => { const c = SU.deep(o); delete c._k; objects[o.id] = c; });
    const starts = Object.values(st.objects).filter(o => o.type === 'town' && o.start).map(o => o.id);
    return { id: st.mapId || ('m' + Date.now().toString(36)), name: st.setup.name || 'A map', desc: st.mapDesc || '', size: st.setup.size, layers: packed.layers, objects, wild, starts, moons: st.moons || [], nextId: st.nextId, at: Date.now(), win: st.mapWin || { kind: 'conquer' } };
  };
  E.mapToState = function (map) {
    const st = S.deserialize({ version: 2, seed: 1, rngState: 9, nextId: map.nextId || 5000, day: 1, current: 0, setup: { size: map.size, name: map.name, players: [] }, layers: map.layers, objects: SU.deep(map.objects), armies: {}, heroes: {}, cores: {}, players: [], storm: null, weekEvent: 'none', monthEvent: 'none', log: [], moons: map.moons || [] });
    (map.wild || []).forEach(w => { const a = M.wild(st, w.layer, w.x, w.y, w.power, w.cr ? { cr: w.cr, stacks: 1 } : { roam: w.roam }); a.guard = w.guard; a.power0 = w.power; a.edCr = w.cr; a.herd = !!w.herd; });
    st.mapId = map.id; st.mapDesc = map.desc; st.mapWin = map.win || { kind: 'conquer' };
    return st;
  };
  /* a playable game from a made map */
  E.gameFromMap = function (map, setup) {
    const st = E.mapToState(map);
    st.seed = setup.seed || (Math.random() * 1e9) | 0; st.rngState = st.seed ^ 0x5bd1e995; st._rng = null;
    st.setup = SU.deep(setup); st.setup.name = setup.name || map.name; st.setup.mapName = map.name; st.setup.size = map.size || setup.size;
    if (map.win && map.win.kind !== 'conquer') st.setup.win = SU.deep(map.win);
    st.players = setup.players.map((pc, i) => M.player(st, i, pc));
    const starts = (map.starts || []).map(id => st.objects[id]).filter(Boolean);
    st._starts = [];
    st.players.forEach((P, pi) => { const t = starts[pi]; if (!t) return; t.owner = pi; M.setFaction(t, P.faction); t.pop = 260; delete t.start; P.startLayer = t.layer; st._starts.push({ pi, li: t.layer, x: t.x, y: t.y, town: t.id }); });
    starts.slice(st.players.length).forEach(t => { delete t.start; t.owner = -1; });
    /* the land's wealth comes from holding it: loose piles go, and chests are buried until someone tells of them */
    const R = SU.rng(st);
    Object.values(st.objects).forEach(o => { if (o.type === 'pile') delete st.objects[o.id]; else if (o.type === 'chest') Object.assign(o, SU.mapgen.buriedChest(R), { id: o.id, layer: o.layer, x: o.x, y: o.y }); });
    S.rebuild(st);
    SU.mapgen.startArmies(st);
    if (SU.realm) { st.regions = null; SU.realm.makeRegions(st); S.rebuild(st); SU.realm.setup(st); }
    st.storm = setup.storm === false ? null : RU.newStorm(st);
    SU.syncRng(st);
    return st;
  };

  /* ======================= saving and sharing ======================= */
  function saveLocal() { const mp = E.stateToMap(est); try { localStorage.setItem(MKEY + mp.id, JSON.stringify(mp)); } catch (e) { U.toast('Could not save: this browser is full.'); } return mp; }
  E.listLocal = function () { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(MKEY)) { try { const m = JSON.parse(localStorage.getItem(k)); out.push(m); } catch (e) {} } } } catch (e) {} return out.sort((a, b) => b.at - a.at); };
  async function share() {
    const acc = SU.save.account();
    if (!SU.save.cloudOk()) { U.alert('Sign in first', 'Sign in to Flake Games to share your maps with everyone.'); return; }
    const mp = saveLocal();
    if (Object.values(est.objects).filter(o => o.type === 'town' && o.start).length < 2) { U.alert('Not yet', 'A map needs at least two starting towns before it can be shared.'); return; }
    try {
      await root.FLAKE.rest('POST', 'dya_config?on_conflict=key', { key: 'su_map:' + mp.id, value: { name: mp.name, desc: mp.desc, size: mp.size, players: mp.starts.length, author: acc.name, authorId: acc.id, status: 'pending', at: Date.now(), map: mp }, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
      U.alert('Sent', 'Your map has been sent. Once an admin approves it, everyone can play it.');
    } catch (e) { U.alert('Could not share', e.message); }
  }
  E.listShared = async function () {
    if (!(root.FLAKE && root.FLAKE.configured && root.FLAKE.configured())) return [];
    const rows = await root.FLAKE.rest('GET', 'dya_config?select=key,name:value->>name,desc:value->>desc,author:value->>author,players:value->>players,size:value->>size&key=like.' + encodeURIComponent('su_map:*') + '&value->>status=eq.approved');
    return (rows || []).map(r => ({ id: r.key.slice(7), name: r.name, desc: r.desc, author: r.author, players: +r.players, size: r.size, shared: true }));
  };
  E.loadShared = async function (id) { const rows = await root.FLAKE.rest('GET', 'dya_config?select=value&key=eq.' + encodeURIComponent('su_map:' + id)); return rows && rows[0] ? rows[0].value.map : null; };

  /* choose a map: yours, or shared ones */
  /* maps that come with the game (maps/index.json) */
  E.listBuiltin = async function () { try { const r = await fetch('maps/index.json', { cache: 'no-cache' }); return r.ok ? (await r.json()).map(m => Object.assign({ builtin: true }, m)) : []; } catch (e) { return []; } };
  E.loadBuiltin = async function (entry) { const r = await fetch('maps/' + (entry.file || entry.id + '.json'), { cache: 'no-cache' }); return r.ok ? r.json() : null; };
  E.pickMap = async function (cb, forEditing) {
    const m = U.modal([el('h2', { text: forEditing ? 'Open a map' : 'Choose a map' }), el('p', { cls: 'muted', text: 'Looking…' })], { wide: true });
    let shared = []; try { shared = await E.listShared(); } catch (e) { shared = []; }
    const builtin = await E.listBuiltin();
    const mine = E.listLocal();
    m.box.innerHTML = '';
    m.box.appendChild(el('h2', { text: forEditing ? 'Open a map' : 'Choose a map' }));
    const row = (mp, load) => el('div', { cls: 'row frame' }, [el('div', { style: { flex: 1 } }, [el('b', { text: mp.name }), el('div', { cls: 'small muted', text: [mp.desc, (mp.starts ? mp.starts.length : mp.players) + ' players', { S: 'small', M: 'medium', L: 'large', XL: 'extra large' }[mp.size], mp.author ? 'by ' + mp.author : ''].filter(Boolean).join(' · ') })]),
      btn(forEditing ? 'Open' : 'Play', async () => { const full = await load(); if (!full) { U.toast('Could not load that map.'); return; } m.close(); cb(full); }, 'primary'),
      !mp.shared && !mp.builtin ? btn('✕', () => U.confirm('Delete this map?', mp.name, () => { localStorage.removeItem(MKEY + mp.id); m.close(); E.pickMap(cb, forEditing); }), 'icon') : null]);
    if (builtin.length) { m.box.appendChild(el('h3', { text: 'Maps that come with the game' })); builtin.forEach(mp => m.box.appendChild(row(mp, () => E.loadBuiltin(mp)))); }
    m.box.appendChild(el('h3', { text: 'Your maps', style: { marginTop: '10px' } }));
    if (!mine.length) m.box.appendChild(el('p', { cls: 'small muted', text: 'None yet. Make one in the map editor.' }));
    mine.forEach(mp => m.box.appendChild(row(mp, async () => mp)));
    m.box.appendChild(el('h3', { text: 'Shared maps', style: { marginTop: '10px' } }));
    if (!shared.length) m.box.appendChild(el('p', { cls: 'small muted', text: 'No shared maps yet (or you are offline).' }));
    shared.forEach(mp => m.box.appendChild(row(mp, () => E.loadShared(mp.id))));
    m.box.appendChild(el('div', { cls: 'acts' }, [btn('Close', () => m.close())]));
  };
})(typeof window !== 'undefined' ? window : globalThis);
