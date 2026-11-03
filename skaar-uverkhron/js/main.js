/* ============================================================
   SKAAR UVERKHRON — js/main.js
   The title screen, setting up a new game, the turn of the
   players (computer, same device, online), battles and sieges,
   the menu, and the end of the game.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, RU = SU.rules, BT = SU.battle, V = SU.mapView, A = SU.art;
  const U = SU.ui, el = U.el, btn = U.btn;
  const G = SU.game = {};
  const $ = id => document.getElementById(id);
  const DEV = /^(localhost|127\.|0\.0\.0\.0|$)/.test(location.hostname) || location.protocol === 'file:';

  /* ======================= the title ======================= */
  G.title = function () {
    U.closeAll(); if (SU.online.stopWatching) SU.online.stopWatching(); U.busy = false;
    $('game').classList.add('hidden'); $('town').classList.add('hidden'); $('battle').classList.add('hidden');
    const t = $('title'); t.classList.remove('hidden'); t.innerHTML = '';
    const cv = el('canvas', { cls: 'bg' }); t.appendChild(cv);
    titleArt(cv);
    const auto = SU.save.listLocal().find(s => s.slot === 'auto');
    const acc = SU.save.account();
    const box = el('div', { cls: 'panel box' }, [
      el('h1', { text: 'Skaar Uverkhron' }),
      el('div', { cls: 'sub', text: 'The greatest factions of the Mbaru Tatu' }),
      el('div', { cls: 'menu' }, [
        auto ? btn('Continue — ' + auto.name.replace(' (autosave)', '') + ', day ' + auto.day, () => G.loadSlot('local', 'auto'), 'primary big') : null,
        btn('Play the starter map', () => G.quickStart(), auto ? 'big' : 'primary big', 'The First Dusk: you against one computer player on Velki'),
        btn('New game', () => G.setup(), 'big'),
        btn('Load a game', () => G.loadMenu(), 'big'),
        btn('Online games', () => SU.online.menu(), 'big'),
        btn('Map editor', () => SU.editor.open(), 'big'),
        btn('How to play', () => G.howTo(), 'big'),
        el('a', { href: '../index.html', cls: 'btn', style: { textDecoration: 'none', marginTop: '8px' } }, '← Back to Flake Games'),
      ]),
      el('div', { cls: 'small muted', style: { marginTop: '12px' }, text: acc ? 'Signed in as ' + acc.name + '. Saves go to your account too.' : 'Playing without an account: saves stay in this browser.' }),
    ]);
    t.appendChild(box);
  };
  function titleArt(cv) {
    let raf;
    const draw = now => {
      if ($('title').classList.contains('hidden')) { cancelAnimationFrame(raf); return; }
      raf = requestAnimationFrame(draw);
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
      const g = cv.getContext('2d'), t = now / 1000, w = r.width, h = r.height; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = A.lin(g, 0, 0, 0, h, [[0, '#07060f'], [0.55, '#241a3c'], [0.8, '#6a3a4a'], [1, '#1a1018']]); g.fillRect(0, 0, w, h);
      for (let i = 0; i < 140; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(t + i)) + ')'; g.fillRect((i * 263.7) % w, (i * 97.3) % (h * 0.6), 1.6, 1.6); }
      /* Velki at the heart, Xikia and Leotik swinging round it */
      const cx = w * 0.5, cy = h * 0.3;
      g.fillStyle = A.radial(g, cx, cy, h * 0.11, '#8ab8e8', '#1a3a6a'); A.ell(g, cx, cy, h * 0.1, h * 0.1); g.fill();
      [['#9ab06a', 0.2, 0.034, 24], ['#7ab0d0', 0.3, 0.05, 54]].forEach(([c, rad, sz, per], i) => { const a = t * (i ? 0.05 : 0.09) + i * 2; const x = cx + Math.cos(a) * w * rad, y = cy + Math.sin(a) * h * rad * 0.35;
        g.fillStyle = A.radial(g, x, y, h * sz, A.mix(c, '#ffffff', 0.4), A.shade(c, -50)); A.ell(g, x, y, h * sz, h * sz); g.fill(); });
      /* the Duskwaste and the worm rising */
      g.fillStyle = '#120e1c'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * 0.78); for (let x = 0; x <= w; x += 30) g.lineTo(x, h * 0.78 - Math.abs(Math.sin(x * 0.01)) * h * 0.06); g.lineTo(w, h); g.fill();
      A.creature(g, 'nekh', w * 0.16, h * 0.86, h * 0.3, { t, noShadow: true });
      A.creature(g, 'lutut', w * 0.84 + Math.sin(t * 0.4) * 40, h * 0.45 + Math.sin(t * 0.7) * 10, h * 0.12, { t, f: -1, noShadow: true });
    };
    raf = requestAnimationFrame(draw);
  }

  G.howTo = function () {
    U.modal([el('h2', { text: 'How to play' }), el('div', { cls: 'small', html: [
      '<p><b>Win</b> by taking every town of every rival (some maps have other goals).</p>',
      '<p><b>The map</b> has four layers: <b>Velki</b>, <b>Xikia</b>, <b>Leotik</b> and <b>the Kalo</b> (the moons). Switch with the buttons on the right (or keys 1–4). Click an army, click a place to see the path, click again to go. Right-click anything to learn about it. Drag to look around; scroll to zoom.</p>',
      '<p><b>Urverk</b> are the portals between the worlds. Some work only when the worlds are in the right places; some are kept by families who ask a toll; some are dangerous. Hover over one to see when it opens.</p>',
      '<p><b>Heroes</b> are generals: they do not fight, they direct and sing. Hire them at a tavern, then train them at the training halls until they have five basic skills — only then can they leave town. Up to five heroes can be out on the map.</p>',
      '<p><b>Squadron captains</b> lead groups of stacks. A squadron with a captain can go out without a hero, take mines and pick up resources (but not towns or Relics). Captains fight on the field, in front of their squadrons.</p>',
      '<p><b>Memory cores:</b> a fallen hero is gone for good, but leaves a core. Whoever takes it chooses two of five of its skills to use while they carry it — three cores fit in the pouch. At a <b>Kalo Shrine</b> on the moons, the <b>Kahizecvar</b> makes three of a core’s skills yours for ever.</p>',
      '<p><b>Food</b> feeds your armies and towns. Hungry armies lose heart, then desert. <b>Morale</b> (per stack) and <b>luck</b> matter in battle.</p>',
      '<p><b>The Sunear’Zikhron</b> storm wanders the Tatu. In it, everything is slower and production halves. Win a battle in its <b>eye</b> to unlock the <b>Nekh’Vorran</b>: one to each castle.</p>',
      '<p><b>Weeks</b> are six days; day four is market day. Keys: E end turn, N next army, H hero, K kingdom, Q map songs, Z sleep.</p>'].join('') }),
      el('div', { cls: 'acts' }, [btn('Close', function () { this.closest('.overlay').remove(); }, 'primary')])], { wide: true });
  };

  /* ======================= new game ======================= */
  G.setup = function (opts) {
    opts = opts || {};
    const acc = SU.save.account();
    const cfg = { size: 'M', spread: true, wild: 'normal', name: 'A new game', players: [
      { kind: 'human', name: acc ? acc.name : 'You', ai: 'normal', team: 0, colorId: 'red' },
      { kind: 'ai', name: 'Computer', ai: 'normal', team: 0, colorId: 'blue' },
    ], map: opts.map || null };
    const m = U.modal(el('div'), { wide: true });
    function render() {
      const b = m.box; b.innerHTML = '';
      b.appendChild(el('h2', { text: 'A new game' }));
      const sel = (val, list, on) => { const s = el('select', { onchange: e => { on(e.target.value); render(); } }, list.map(([v, n]) => el('option', { value: v, selected: v === val ? 'selected' : null }, n))); return s; };
      b.appendChild(el('table', { cls: 'setup' }, [
        el('tr', {}, [el('td', { text: 'Name' }), el('td', {}, el('input', { cls: 'inp', value: cfg.name, oninput: e => cfg.name = e.target.value }))]),
        el('tr', {}, [el('td', { text: 'Map' }), el('td', {}, [cfg.map ? el('span', { cls: 'gold', text: cfg.map.name + ' ' }) : 'Random', ' ', btn('Choose a made map…', () => SU.editor.pickMap(mp => { cfg.map = mp; while (cfg.players.length > (mp.starts || []).length && cfg.players.length > 2) cfg.players.pop(); render(); })), cfg.map ? btn('Random instead', () => { cfg.map = null; render(); }) : null])]),
        cfg.map ? null : el('tr', {}, [el('td', { text: 'Size' }), el('td', {}, sel(cfg.size, [['S', 'Small'], ['M', 'Medium'], ['L', 'Large'], ['XL', 'Extra large']], v => cfg.size = v))]),
        cfg.map ? null : el('tr', {}, [el('td', { text: 'Starts' }), el('td', {}, sel(cfg.spread ? 'spread' : 'velki', [['spread', 'Spread across the three Tatu'], ['velki', 'Everyone on Velki']], v => cfg.spread = v === 'spread'))]),
        cfg.map ? null : el('tr', {}, [el('td', { text: 'Wild creatures' }), el('td', {}, sel(cfg.wild, [['weak', 'Few and weak'], ['normal', 'Normal'], ['strong', 'Many and fierce']], v => cfg.wild = v))]),
        cfg.map && cfg.map.win && cfg.map.win.kind !== 'conquer' ? el('tr', {}, [el('td', { text: 'Victory' }), el('td', { cls: 'gold', text: D.WIN[cfg.map.win.kind].name + ' — ' + D.WIN[cfg.map.win.kind].desc })])
          : el('tr', {}, [el('td', { text: 'Victory' }), el('td', {}, [sel(cfg.winKind || 'conquer', [['conquer', D.WIN.conquer.name], ['prophecy', D.WIN.prophecy.name], ['gold', D.WIN.gold.name]], v => cfg.winKind = v), el('div', { cls: 'small muted', text: D.WIN[cfg.winKind || 'conquer'].desc + (cfg.winKind === 'gold' ? ' (200,000 gold)' : '') + ' Taking every rival’s towns always wins too.' })])]),
      ]));
      b.appendChild(el('h3', { text: 'Players', style: { marginTop: '10px' } }));
      const tbl = el('table', { cls: 'setup' }, [el('tr', {}, ['', 'Name', 'Who', 'Level', 'Team', 'Colour', ''].map(x => el('th', { cls: 'small muted', text: x })))]);
      cfg.players.forEach((p, i) => tbl.appendChild(el('tr', {}, [
        el('td', { text: (i + 1) + '.' }),
        el('td', {}, el('input', { cls: 'inp', value: p.name, style: { width: '130px' }, oninput: e => p.name = e.target.value })),
        el('td', {}, sel(p.kind, [['human', 'A person (this device)'], ['ai', 'The computer']], v => { p.kind = v; if (v === 'ai' && p.name === 'You') p.name = 'Computer'; })),
        el('td', {}, p.kind === 'ai' ? sel(p.ai, Object.entries(D.AI_LEVELS).map(([k, v]) => [k, v.name]), v => p.ai = v) : ''),
        el('td', {}, sel(String(p.team), [['0', 'Alone'], ['1', 'Team 1'], ['2', 'Team 2'], ['3', 'Team 3']], v => p.team = +v)),
        el('td', {}, sel(p.colorId, D.PLAYER_COLORS.map(c => [c.id, c.name]), v => p.colorId = v)),
        el('td', {}, cfg.players.length > 2 ? btn('✕', () => { cfg.players.splice(i, 1); render(); }, 'icon') : ''),
      ])));
      b.appendChild(tbl);
      const maxP = cfg.map ? (cfg.map.starts || []).length : 6;
      if (cfg.players.length < maxP) b.appendChild(btn('+ Add a player', () => { const used = cfg.players.map(p => p.colorId); cfg.players.push({ kind: 'ai', name: 'Computer ' + cfg.players.length, ai: 'normal', team: 0, colorId: D.PLAYER_COLORS.find(c => !used.includes(c.id)).id }); render(); }));
      b.appendChild(el('p', { cls: 'small muted', text: 'Everyone plays the Duskareth in this first version. Two or more people on this device take turns; the screen hides between turns. For games with friends on other devices, use Online games on the title screen.' }));
      b.appendChild(el('div', { cls: 'acts' }, [btn('Back', () => m.close()), btn('Begin', () => { m.close(); G.newGame(cfg); }, 'primary big')]));
    }
    render();
  };
  /* one click: the starter map, you against an easy computer player */
  G.quickStart = async function () {
    const map = await SU.editor.loadBuiltin({ id: 'starter', file: 'starter.json' }).catch(() => null);
    if (!map) { U.alert('Could not load the starter map', 'Try New game for a random map instead.'); return; }
    const acc = SU.save.account();
    G.newGame({ map, name: map.name, players: [
      { kind: 'human', name: acc ? acc.name : 'You', ai: 'normal', team: 0, colorId: 'red' },
      { kind: 'ai', name: 'The Rival', ai: 'easy', team: 0, colorId: 'blue' }] });
  };
  G.newGame = function (cfg) {
    const players = cfg.players.map(p => ({ kind: p.kind, name: p.name || 'Player', ai: p.ai, team: p.team, color: D.PLAYER_COLORS.find(c => c.id === p.colorId).c, colorId: p.colorId, account: p.account || null }));
    U.toast('Shaping the Mbaru Tatu…');
    setTimeout(() => {
      const win = cfg.map && cfg.map.win && cfg.map.win.kind !== 'conquer' ? cfg.map.win : { kind: cfg.winKind || 'conquer', n: 3, gold: 200000 };
      const setup = { size: cfg.size, spread: cfg.spread, wild: cfg.wild, name: cfg.name, players, seed: cfg.seed, win };
      const st = cfg.map ? SU.editor.gameFromMap(cfg.map, setup) : SU.mapgen.newGame(setup);
      if (cfg.online) st.online = cfg.online;
      G.play(st);
    }, 30);
  };

  /* ======================= playing ======================= */
  G.play = function (st) {
    G.st = st; U.closeAll();
    $('title').classList.add('hidden');
    U.start(st);
    RU.startTurn(st);
    G.beginTurn(true);
  };
  const humans = st => st.players.filter(p => p.kind === 'human' && p.alive);
  G.localHuman = function (pi) {
    const st = G.st, P = st.players[pi]; if (!P || P.kind !== 'human') return false;
    if (st.online) return SU.online.isMine(st, pi);
    return true;
  };
  G.beginTurn = function (first) {
    const st = G.st; if (st.over) return G.gameOver();
    const P = S.cur(st);
    U.refresh();
    if (P.kind === 'ai' || (st.online && !G.localHuman(st.current))) {
      if (P.kind === 'ai' && (!st.online || SU.online.isHost(st))) return G.aiTurn();
      return SU.online.waitTurn(st);
    }
    /* a person: on a shared device, hide the map until they are ready */
    const proceed = () => {
      U.viewer = st.current; V.fog = null; V.invalidate();
      const a = Object.values(st.armies).find(x => !x.dead && x.owner === st.current && x.heroId) || Object.values(st.armies).find(x => !x.dead && x.owner === st.current);
      const town = S.townsOf(st, st.current)[0];
      if (a) U.select(a.id, true); else if (town) { U.selected = null; V.centerOn(town.layer, town.x, town.y); }
      U.refresh();
      SU.save.autosave(st);
      weekNews(st);
      /* a vision from the eye of the storm, seen at the end of the last turn */
      const P2 = st.players[st.current], vo = P2.vision && st.objects[P2.vision];
      if (vo && P2.visionShown !== vo.id) { P2.visionShown = vo.id;
        U.alert('A vision in the eye', el('div', {}, [el('p', { text: 'In the stillness at the heart of the Sunear’Zikhron, your hero sees it: the Rokarvac of the Nekh, lying on ' + D.LAYERS[vo.layer].name + ', guarded by things that do not sleep.' }),
          el('p', { cls: 'small muted', text: 'Recover it with a hero. It is not used up: carry it into any of your towns and that town can build the Nekh Hollow while it is there.' })]),
          () => { V.centerOn(vo.layer, vo.x, vo.y); U.refresh(); }); }
    };
    if (humans(st).length > 1 && !st.online) {
      $('game').style.visibility = 'hidden';
      U.modal([el('h2', { text: P.name + '’s turn' }), el('p', { text: 'Pass the device to ' + P.name + '.' }), el('div', { cls: 'acts' }, [btn('I am ' + P.name, function () { this.closest('.overlay').remove(); $('game').style.visibility = ''; proceed(); }, 'primary big')])], { dismiss: false });
    } else proceed();
  };
  function weekNews(st) {
    const cal = S.cal(st.day);
    if (cal.dow !== 1 || st.day === 1) { if (st.day === 1 && !st._welcomed) { st._welcomed = 1; U.alert('The Mbaru Tatu', 'You lead the Duskareth, who follow the Nekh’Vorran. Build up your town, train your heroes, and take the land. Somewhere the Sunear’Zikhron is turning: win a battle in its eye and the great worm will answer you.'); } return; }
    const we = D.WEEK_EVENTS.find(e => e.id === st.weekEvent) || D.WEEK_EVENTS[0];
    const me = D.MONTH_EVENTS.find(e => e.id === st.monthEvent);
    U.alert(cal.week === 1 ? 'A new month: ' + (me ? me.name : '') : 'Week ' + cal.week, el('div', {}, [cal.week === 1 && me && me.desc ? el('p', { text: me.desc }) : null, el('p', {}, [el('b', { text: we.name + '. ' }), we.desc]), el('p', { cls: 'small muted', text: 'Your creatures have grown, and new faces wait at the tavern.' })]));
  }
  G.endTurn = function () {
    const st = G.st; if (!U.myTurn()) return;
    const idle = Object.values(st.armies).filter(a => !a.dead && a.owner === st.current && !a.sleep && a.mp >= a.mpMax && a.heroId);
    const go = async () => { U.selected = null; V.path = null; RU.endTurn(st); if (st.online) { U.busy = true; await SU.online.pushTurn(st); U.busy = false; } G.beginTurn(); };
    if (idle.length && !G.noIdleWarning) U.confirm('End your turn?', SU.plural(idle.length, 'hero has', 'heroes have') + ' not moved today.', go, null, ['End turn', 'Not yet']);
    else go();
  };
  G.aiTurn = async function () {
    const st = G.st, P = S.cur(st);
    U.busy = true; U.refresh();
    $('status').textContent = P.name + ' is thinking…';
    try { await SU.ai.takeTurn(st, { battle: spec => G.runBattle(spec) }); }
    catch (e) { console.error('AI turn failed', e); }
    U.busy = false;
    if (st.over) return G.gameOver();
    RU.endTurn(st);
    if (st.online) await SU.online.pushTurn(st);
    setTimeout(() => G.beginTurn(), 30);
  };

  /* ======================= battles ======================= */
  /* spec: { attacker, defender, town, def, temp, after(rep) } — resolves with the report */
  G.runBattle = function (spec) {
    const st = G.st;
    return new Promise(resolve => {
      const atk = spec.attacker, def = spec.defender;
      const sideOf = a => ({ owner: a.owner, army: a, hero: S.heroOf(st, a), slots: S.slotsOf(st, a) });
      let B;
      if (spec.town) {
        const t = spec.town, d = spec.def || RU.townDefense(st, t);
        const h = d && d.hero;
        B = BT.create(st, sideOf(atk), { owner: t.owner, army: null, hero: h, slots: h ? h.slots : t.garrison, town: t, label: (h ? h.name + ' in ' : '') + t.name }, { town: t, layer: t.layer, x: t.x, y: t.y, extraDefSlots: h ? t.garrison : null });
      } else B = BT.create(st, sideOf(atk), sideOf(def), { layer: def.temp ? atk.layer : def.layer, x: def.temp ? atk.x : def.x, y: def.temp ? atk.y : def.y });
      const control = side => { const o = B.sides[side].owner; return o >= 0 && st.players[o].kind === 'human' && G.localHuman(o) ? 'human' : 'ai'; };
      const done = rep => { U.refresh(); V.invalidate(); if (spec.after) spec.after(rep); resolve(rep); if (st.over) setTimeout(G.gameOver, 400); };
      if (control(0) === 'ai' && control(1) === 'ai') { BT.autoRun(st, B); const rep = BT.finish(st, B); done(rep); return; }
      SU.battleView.start(B, control, (rep) => done(rep));
    });
  };
  G.battle = spec => G.runBattle(spec);
  G.siege = function (attacker, town) { return G.runBattle({ attacker, town }); };

  /* ======================= the menu ======================= */
  G.menu = function () {
    const st = G.st;
    const m = U.modal([el('h2', { text: 'Menu' }), el('div', { cls: 'menu' }, [
      st && !st.online ? btn('Save', () => { m.close(); G.saveMenu(); }) : null,
      btn('Load', () => { m.close(); G.loadMenu(); }),
      btn('How to play', () => { m.close(); G.howTo(); }),
      btn((U.fast ? '✓ ' : '') + 'Fast animations', () => { U.fast = !U.fast; m.close(); }),
      btn((G.noIdleWarning ? '' : '✓ ') + 'Warn about heroes who have not moved', () => { G.noIdleWarning = !G.noIdleWarning; m.close(); }),
      btn('Quit to the title', () => { m.close(); U.confirm('Quit?', st && !st.online ? 'Your game is autosaved at the start of each turn.' : 'Leave this game?', () => G.title()); }),
      btn('Close', () => m.close(), 'primary'),
    ])]);
  };
  G.saveMenu = function () {
    const st = G.st, name = el('input', { cls: 'inp', value: st.setup.name + ' — day ' + st.day, style: { width: '320px' } });
    const m = U.modal([el('h2', { text: 'Save the game' }), name, el('div', { cls: 'col', style: { marginTop: '8px' } }, [1, 2, 3, 4, 5].map(k => {
      const ex = SU.save.listLocal().find(s => s.slot === String(k));
      return btn('Slot ' + k + (ex ? ': ' + ex.name : ' (empty)'), async () => {
        SU.save.saveLocal(st, String(k), name.value);
        if (SU.save.cloudOk()) { try { await SU.save.saveCloud(st, String(k), name.value); } catch (e) { U.toast('Saved here, but the account save failed.'); } }
        m.close(); U.toast('Saved.');
      });
    })), el('div', { cls: 'acts' }, [btn('Cancel', () => m.close())])]);
  };
  G.loadMenu = async function () {
    const m = U.modal([el('h2', { text: 'Load a game' }), el('p', { cls: 'muted', text: 'Looking…' })]);
    let cloud = [];
    try { cloud = await SU.save.listCloud(); } catch (e) { cloud = []; }
    const local = SU.save.listLocal();
    const row = s => el('div', { cls: 'row frame' }, [el('div', { style: { flex: 1 } }, [el('b', { text: s.name || 'A game' }), el('div', { cls: 'small muted', text: 'Day ' + s.day + ' · ' + new Date(s.at).toLocaleString() + ' · ' + (s.where === 'cloud' ? 'on your account' : 'in this browser') })]),
      btn('Load', () => { m.close(); G.loadSlot(s.where, s.slot); }, 'primary'), btn('✕', () => U.confirm('Delete this save?', s.name, async () => { if (s.where === 'cloud') await SU.save.deleteCloud(s.slot); else SU.save.deleteLocal(s.slot); m.close(); G.loadMenu(); }), 'icon')]);
    m.box.innerHTML = '';
    m.box.appendChild(el('h2', { text: 'Load a game' }));
    if (!local.length && !cloud.length) m.box.appendChild(el('p', { text: 'There are no saved games yet.' }));
    if (cloud.length) { m.box.appendChild(el('h3', { text: 'On your account' })); cloud.forEach(s => m.box.appendChild(row(s))); }
    if (local.length) { m.box.appendChild(el('h3', { text: 'In this browser' })); local.forEach(s => m.box.appendChild(row(s))); }
    m.box.appendChild(el('div', { cls: 'acts' }, [btn('Close', () => m.close())]));
  };
  G.loadSlot = async function (where, slot) {
    let st = null;
    try { st = where === 'cloud' ? await SU.save.loadCloud(slot) : SU.save.loadLocal(slot); } catch (e) { console.error(e); }
    if (!st) { U.alert('Could not load', 'That save could not be read.'); return; }
    G.st = st; U.closeAll(); $('title').classList.add('hidden'); U.start(st);
    G.beginTurn();
  };

  G.gameOver = function () {
    const st = G.st; if (!st.over || G._overShown === st) return; G._overShown = st;
    const won = st.over.winners.some(i => st.players[i].kind === 'human' && G.localHuman(i));
    const names = st.over.winners.map(i => st.players[i].name).join(' and ');
    const how = { prophecy: ' heard the true prophecy in the eye of the storm', gold: ' filled the treasury', town: ' held the seat for a week', conquer: (st.over.winners.length > 1 ? ' hold' : ' holds') + ' the Mbaru Tatu' }[st.over.how || 'conquer'];
    U.modal([el('h2', { text: won ? 'Victory' : 'The game is over' }), el('p', { text: names + how + ' after ' + SU.plural(st.day, 'day') + '.' }),
      el('div', { cls: 'acts' }, [btn('Look at the map', function () { this.closest('.overlay').remove(); }), btn('To the title', function () { this.closest('.overlay').remove(); G.title(); }, 'primary')])], { dismiss: false });
  };

  /* ======================= start ======================= */
  document.addEventListener('DOMContentLoaded', () => {
    V.init($('map'), $('mini'));
    const go = () => G.title();
    /* main games need the one Flake Games account; local testing does not */
    if (root.FLAKE && root.FLAKE.gate && root.FLAKE.configured && root.FLAKE.configured() && !DEV && !/[?&]guest=1/.test(location.search)) root.FLAKE.gate('su').then(go);
    else go();
  });
})(typeof window !== 'undefined' ? window : globalThis);
