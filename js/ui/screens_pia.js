/* ============================================================
   DYA'AKARA — ui/screens_pia.js
   LEGENDS OF PIA'DON — the deckbuilder's screens.

   Home / Guardian select, the co-op lobby, and one umbrella run
   screen that repaints itself for each phase (map, battle, reward,
   rest, shop, treasure, victory, defeat). Everything reads from
   DYA.piaSession.run and drives it through piaSession.act(), so the
   same screens serve solo and co-op with no branching.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, UI = DYA.ui, SP = DYA.species;
  const D = DYA.piaData, EN = DYA.piaEngine, R = DYA.piaRun, S = DYA.piaSession, C = DYA.piaCoop;

  const NODE_ICON = { battle: '⚔', elite: '💀', boss: '🐉', rest: '🔥', event: '❔', merchant: '🛒', treasure: '📦' };
  const INTENT = {
    attack: { icon: '⚔', cls: 'i-atk' }, block: { icon: '🛡', cls: 'i-blk' },
    buff: { icon: '💪', cls: 'i-buf' }, debuff: { icon: '☠', cls: 'i-deb' }, summon: { icon: '➕', cls: 'i-sum' },
  };

  let targeting = null;   // {handIdx} while choosing an enemy target

  /* ================= HOME / GUARDIAN SELECT ================= */
  UI.register('pia', {
    enter(root) {
      targeting = null;
      const scr = U.el('div', { cls: 'screen pia-home' });
      const bar = UI.topbar({ title: "Legends of Pia'don" });
      scr.appendChild(bar);
      const back = U.el('div', { cls: 'back-arrow', text: '‹', style: 'position:absolute;top:70px;left:18px;font-size:30px;z-index:3', onclick: () => UI.show('menu') });
      scr.appendChild(back);

      const wrap = U.el('div', { cls: 'pia-home-wrap' });
      wrap.appendChild(U.el('div', { cls: 'pia-title', text: "LEGENDS OF PIA'DON" }));
      wrap.appendChild(U.el('div', { cls: 'pia-sub muted', text: 'A card-and-Vaelk gauntlet across the three sister worlds. Draft a deck, call creatures to your side, and run a planet’s great Quarry to ground — alone, or with up to three Guardians.' }));

      /* resume a solo run in progress */
      const saved = R.loadSolo();
      if (saved && saved.phase !== 'gameover' && saved.phase !== 'win') {
        const g = D.guardian(saved.players[0].guardianId);
        const rc = U.el('div', { cls: 'pia-resume panel' }, [
          U.el('div', { html: '<b class="gold">Run in progress</b> — ' + U.esc(g ? g.name : '') + ' on ' + U.esc(D.planet(saved.planet).name) + ', floor ' + (saved.floor + 1) }),
        ]);
        const rr = U.el('div', { cls: 'flex mt' });
        rr.appendChild(U.el('button', { cls: 'btn', text: '▶ Resume', onclick: () => { S.resumeSolo(saved); openRun(); } }));
        rr.appendChild(U.el('button', { cls: 'btn ghost', text: 'Abandon', onclick: () => { R.clearSolo(); UI.show('pia'); } }));
        rc.appendChild(rr);
        wrap.appendChild(rc);
      }

      /* Guardian picker */
      let chosen = D.GUARDIANS[0].id;
      const gGrid = U.el('div', { cls: 'pia-guard-grid' });
      const detail = U.el('div', { cls: 'pia-guard-detail panel' });
      function paintDetail() {
        const g = D.guardian(chosen);
        detail.innerHTML = '';
        detail.appendChild(UI.tokenArt(g.avatar, 120, 'idle', null, null));
        detail.appendChild(U.el('div', { cls: 'pia-gd-name gold', text: g.name + ' — ' + g.title }));
        detail.appendChild(U.el('div', { cls: 'pill', text: g.element + ' · ' + D.ELEMENT_NAMES[g.element] + ' · ' + g.maxHp + ' HP' }));
        detail.appendChild(U.el('div', { cls: 'muted mt', text: g.blurb }));
        const relic = D.relic(g.startRelic);
        if (relic) detail.appendChild(U.el('div', { cls: 'pia-relic-line mt', html: relic.icon + ' <b>' + U.esc(relic.name) + '</b> — ' + U.esc(relic.text) }));
        /* starting deck summary */
        const counts = g.deck;
        const deckLine = Object.keys(counts).map(id => (counts[id] + '× ' + D.card(id).name)).join(', ');
        detail.appendChild(U.el('div', { cls: 'small muted mt', html: '<b>Opening deck:</b> ' + U.esc(deckLine) }));
      }
      D.GUARDIANS.forEach(g => {
        const cell = U.el('div', { cls: 'pia-guard-cell' });
        cell.appendChild(UI.tokenArt(g.avatar, 64, 'idle', null, null));
        cell.appendChild(U.el('div', { cls: 'small', text: g.name }));
        cell.appendChild(U.el('div', { cls: 'tiny muted', text: D.ELEMENT_NAMES[g.element] }));
        cell.onclick = () => { chosen = g.id; U.qsa('.pia-guard-cell', gGrid).forEach(c => c.classList.remove('sel')); cell.classList.add('sel'); paintDetail(); DYA.audio.play('click'); };
        if (g.id === chosen) cell.classList.add('sel');
        gGrid.appendChild(cell);
      });
      paintDetail();

      const cols = U.el('div', { cls: 'pia-home-cols' });
      const leftCol = U.el('div', {}, [U.el('h3', { cls: 'gold mb', text: 'Choose your Guardian' }), gGrid]);
      cols.appendChild(leftCol);
      cols.appendChild(detail);
      wrap.appendChild(cols);

      /* planet picker */
      wrap.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Choose a world' }));
      let planet = D.PLANETS[0].id;
      const pRow = U.el('div', { cls: 'pia-planet-row' });
      D.PLANETS.forEach(pl => {
        const c = U.el('div', { cls: 'pia-planet-cell' + (pl.id === planet ? ' sel' : '') });
        c.appendChild(U.el('div', { cls: 'pp-name', text: pl.name }));
        c.appendChild(U.el('div', { cls: 'pill el-' + pl.element, text: D.ELEMENT_NAMES[pl.element] }));
        c.appendChild(U.el('div', { cls: 'tiny muted mt', text: pl.blurb }));
        c.onclick = () => { planet = pl.id; U.qsa('.pia-planet-cell', pRow).forEach(x => x.classList.remove('sel')); c.classList.add('sel'); };
        pRow.appendChild(c);
      });
      wrap.appendChild(pRow);

      /* actions */
      const acts = U.el('div', { cls: 'pia-home-acts mt' });
      acts.appendChild(U.el('button', { cls: 'btn big', text: '⚔ Play Solo', onclick: () => { R.clearSolo(); S.startSolo(chosen, planet); openRun(); } }));
      acts.appendChild(U.el('button', { cls: 'btn big', text: '👥 Host Co-op', onclick: () => UI.requireOnline(() => openLobbyHost(planet, chosen)) }));
      acts.appendChild(U.el('button', { cls: 'btn big ghost', text: '🔑 Join Co-op', onclick: () => UI.requireOnline(() => promptJoin()) }));
      wrap.appendChild(acts);
      wrap.appendChild(U.el('div', { cls: 'tiny muted mt', text: 'Co-op scales the foes to your party — bigger packs, and a Quarry that seats guards for every extra Guardian.' }));

      scr.appendChild(wrap);
      root.appendChild(scr);
    },
  });

  function promptJoin() {
    const wrap = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'Join a Co-op Run' }), U.el('p', { cls: 'muted', text: 'Enter the 5-letter room code from your host.' })]);
    const input = U.el('input', { cls: 'input', maxlength: 5, placeholder: 'CODE', style: 'text-transform:uppercase;letter-spacing:6px;font-size:20px;text-align:center' });
    wrap.appendChild(input);
    const m = UI.modal(wrap);
    const row = U.el('div', { cls: 'flex mt' });
    row.appendChild(U.el('button', { cls: 'btn', text: 'Join', onclick: () => {
      const code = input.value.trim().toUpperCase(); if (code.length < 4) return;
      m.close();
      UI.loading(true);
      C.join(code).then(() => { UI.loading(false); openLobbyClient(); }).catch(err => { UI.loading(false); UI.alert('Could not join', err.message || String(err)); });
    } }));
    row.appendChild(U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => m.close() }));
    wrap.appendChild(row);
    setTimeout(() => input.focus(), 50);
  }

  function openLobbyHost(planet, guardianId) {
    UI.loading(true);
    C.host(planet).then((code) => {
      UI.loading(false);
      C.setGuardian(guardianId);
      wireLobby();
      UI.show('piaLobby');
    }).catch(err => { UI.loading(false); UI.alert('Could not host', err.message || String(err)); });
  }
  function openLobbyClient() { wireLobby(); UI.show('piaLobby'); }

  function wireLobby() {
    C.onLobby = () => { if (UI.currentName === 'piaLobby') UI.show('piaLobby'); };
    C.onStart = () => { openRun(); };
    C.onError = (msg) => { UI.alert('Co-op', msg); };
  }

  /* ================= CO-OP LOBBY ================= */
  UI.register('piaLobby', {
    enter(root) {
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Co-op Lobby' }));
      const wrap = U.el('div', { cls: 'pia-lobby-wrap panel' });
      wrap.appendChild(U.el('div', { cls: 'flex', style: 'align-items:center;gap:12px' }, [
        U.el('h2', { cls: 'gold', text: 'Room ' }),
        U.el('div', { cls: 'pia-code', text: C.code || '—' }),
        U.el('button', { cls: 'btn small ghost', text: 'Copy', onclick: () => { try { navigator.clipboard.writeText(C.code); UI.toast({ title: 'Copied', body: 'Room code copied.', icon: '📋' }); } catch (e) { } } }),
      ]));
      const pl = D.planet((C.lobby && C.lobby.planet) || 'velki');
      wrap.appendChild(U.el('div', { cls: 'muted', text: 'World: ' + pl.name + ' · ' + D.ELEMENT_NAMES[pl.element] + '. Up to 3 Guardians.' }));

      /* roster */
      const roster = U.el('div', { cls: 'pia-roster mt' });
      C.roster().forEach(p => {
        const g = D.guardian(p.guardianId);
        const row = U.el('div', { cls: 'pia-roster-row' + (p.id === C.myId ? ' me' : '') });
        row.appendChild(UI.tokenArt(g.avatar, 44, 'idle', null, null));
        row.appendChild(U.el('div', {}, [
          U.el('div', { text: p.name + (p.id === C.lobby.hostId ? ' (host)' : '') }),
          U.el('div', { cls: 'tiny muted', text: g.name + ' · ' + D.ELEMENT_NAMES[g.element] }),
        ]));
        row.appendChild(U.el('div', { cls: 'spacer' }));
        row.appendChild(U.el('div', { cls: 'pia-ready ' + (p.ready || p.id === C.lobby.hostId ? 'on' : 'off'), text: (p.id === C.lobby.hostId) ? '★ host' : (p.ready ? '✓ ready' : '… waiting') }));
        roster.appendChild(row);
      });
      wrap.appendChild(roster);

      /* my guardian picker */
      wrap.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Your Guardian' }));
      const gRow = U.el('div', { cls: 'pia-guard-grid' });
      const mine = C.roster().find(p => p.id === C.myId);
      D.GUARDIANS.forEach(g => {
        const cell = U.el('div', { cls: 'pia-guard-cell' + (mine && mine.guardianId === g.id ? ' sel' : '') });
        cell.appendChild(UI.tokenArt(g.avatar, 54, 'idle', null, null));
        cell.appendChild(U.el('div', { cls: 'tiny', text: g.name }));
        cell.onclick = () => { C.setGuardian(g.id); UI.show('piaLobby'); };
        gRow.appendChild(cell);
      });
      wrap.appendChild(gRow);

      /* actions */
      const acts = U.el('div', { cls: 'flex mt' });
      if (!C.isHost) {
        const meRow = C.roster().find(p => p.id === C.myId);
        acts.appendChild(U.el('button', { cls: 'btn', text: (meRow && meRow.ready) ? 'Unready' : '✓ Ready', onclick: () => { C.toggleReady(); UI.show('piaLobby'); } }));
      } else {
        const canStart = C.everyoneReady();
        const startBtn = U.el('button', { cls: 'btn big', text: '▶ Begin the Hunt', onclick: () => { C.start(); } });
        if (!canStart) { startBtn.disabled = true; startBtn.title = 'Waiting for all Guardians to ready up.'; }
        acts.appendChild(startBtn);
      }
      acts.appendChild(U.el('button', { cls: 'btn ghost', text: 'Leave', onclick: () => { C.leave(); UI.show('pia'); } }));
      wrap.appendChild(acts);
      if (C.isHost && !C.everyoneReady()) wrap.appendChild(U.el('div', { cls: 'tiny muted mt', text: 'Others must ready up before you can begin.' }));

      scr.appendChild(wrap);
      root.appendChild(scr);
    },
  });

  /* ================= RUN SCREEN (umbrella) ================= */
  function openRun() { UI.show('piaRun'); }

  UI.register('piaRun', {
    enter(root) {
      targeting = null;
      const scr = U.el('div', { cls: 'screen pia-run' });
      const host = U.el('div', { id: 'pia-root' });
      scr.appendChild(host);
      root.appendChild(scr);
      S.onUpdate = () => paintRun(host);
      paintRun(host);
    },
    leave() { S.onUpdate = null; },
  });

  function paintRun(host) {
    if (!host || !host.isConnected) return;
    const run = S.run; if (!run) { UI.show('pia'); return; }
    host.innerHTML = '';
    switch (run.phase) {
      case 'map': host.appendChild(renderMap(run)); break;
      case 'battle': host.appendChild(renderBattle(run)); break;
      case 'reward': host.appendChild(renderReward(run)); break;
      case 'rest': host.appendChild(renderRest(run)); break;
      case 'shop': host.appendChild(renderShop(run)); break;
      case 'treasure': host.appendChild(renderTreasure(run)); break;
      case 'win': host.appendChild(renderEnd(run, true)); break;
      case 'gameover': host.appendChild(renderEnd(run, false)); break;
      default: host.appendChild(U.el('div', { text: '…' }));
    }
  }

  function runHeader(run, title) {
    const bar = U.el('div', { cls: 'pia-hud' });
    bar.appendChild(U.el('div', { cls: 'logo', text: "PIA'DON", onclick: () => leaveRun() }));
    bar.appendChild(U.el('div', { cls: 'muted', text: '— ' + (title || '') }));
    bar.appendChild(U.el('div', { cls: 'spacer' }));
    const me = R.player(run, S.myId) || run.players[0];
    if (me) {
      bar.appendChild(U.el('span', { cls: 'res-chip', html: '❤ <b>' + me.hp + '</b>/' + me.maxHp }));
      bar.appendChild(U.el('span', { cls: 'res-chip', html: '🪙 <b>' + me.gold + '</b>' }));
      bar.appendChild(U.el('span', { cls: 'res-chip', html: '🎴 <b>' + me.deck.length + '</b>' }));
      me.relics.forEach(rid => { const r = D.relic(rid); if (r) bar.appendChild(U.el('span', { cls: 'pia-relic-chip', title: r.name + ' — ' + r.text, text: r.icon })); });
    }
    if (run.mode === 'coop') bar.appendChild(U.el('span', { cls: 'res-chip', html: '👥 <b>' + run.players.length + '</b>' }));
    bar.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Quit', onclick: () => leaveRun() }));
    return bar;
  }

  function leaveRun() {
    UI.confirm('Leave the run?', 'Solo progress is saved and can be resumed. A co-op run you leave goes on without you.', () => {
      if (run_mode() === 'coop') C.leave();
      S.onUpdate = null;
      UI.show('pia');
    }, 'Leave');
  }
  function run_mode() { return S.run ? S.run.mode : 'solo'; }

  /* ---------- MAP ---------- */
  function renderMap(run) {
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, D.planet(run.planet).name + ' — the climb'));
    const body = U.el('div', { cls: 'pia-map' });
    body.appendChild(U.el('div', { cls: 'pia-map-tip muted', text: 'Choose your next step. Higher floors run deeper toward the Quarry.' }));
    const avail = run.available || [];
    /* floors from top (boss) to bottom (start) */
    for (let f = run.map.floors.length - 1; f >= 0; f--) {
      const rowEl = U.el('div', { cls: 'pia-map-floor' });
      rowEl.appendChild(U.el('div', { cls: 'pia-floor-label tiny muted', text: f === run.map.floors.length - 1 ? 'QUARRY' : ('F' + (f + 1)) }));
      const nodesEl = U.el('div', { cls: 'pia-floor-nodes' });
      run.map.floors[f].forEach(node => {
        const isAvail = avail.indexOf(node.id) >= 0;
        const isCurrent = run.currentNodeId === node.id;
        const nEl = U.el('div', { cls: 'pia-node ' + node.type + (isAvail ? ' avail' : '') + (isCurrent ? ' current' : ''), title: nodeLabel(node) });
        nEl.appendChild(U.el('div', { cls: 'pia-node-icon', text: NODE_ICON[node.type] || '⚔' }));
        if (isAvail) nEl.onclick = () => { S.act({ type: 'enterNode', nodeId: node.id }); };
        nodesEl.appendChild(nEl);
      });
      rowEl.appendChild(nodesEl);
      body.appendChild(rowEl);
    }
    wrap.appendChild(body);
    return wrap;
  }
  function nodeLabel(node) {
    return ({ battle: 'Battle', elite: 'Elite fight', boss: 'The Quarry', rest: 'Rest site', event: 'Rest site', merchant: 'Merchant', treasure: 'Treasure' })[node.type] || node.type;
  }

  /* ---------- BATTLE ---------- */
  function renderBattle(run) {
    const b = run.battle;
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, 'Battle · turn ' + b.turn));

    const arena = U.el('div', { cls: 'pia-arena' });

    /* enemies */
    const enemyRow = U.el('div', { cls: 'pia-enemy-row' });
    EN.aliveEnemies(b).forEach(e => enemyRow.appendChild(renderEnemy(b, e)));
    arena.appendChild(enemyRow);

    /* allies (summons) */
    const allies = EN.aliveAllies(b);
    if (allies.length) {
      const allyRow = U.el('div', { cls: 'pia-ally-row' });
      allies.forEach(a => allyRow.appendChild(renderAlly(b, a)));
      arena.appendChild(allyRow);
    }

    /* guardians */
    const gRow = U.el('div', { cls: 'pia-guardian-row' });
    b.players.forEach(p => gRow.appendChild(renderGuardian(b, p)));
    arena.appendChild(gRow);

    wrap.appendChild(arena);

    /* my hand + controls */
    const me = EN.playerById(b, S.myId) || b.players[0];
    const isMine = me && me.id === S.myId;
    const foot = U.el('div', { cls: 'pia-foot' });

    if (me) {
      /* energy + end turn */
      const ctrl = U.el('div', { cls: 'pia-ctrl' });
      const pips = U.el('div', { cls: 'pia-energy', title: 'Vaelk' });
      pips.appendChild(U.el('span', { cls: 'pia-energy-val', html: '◈ <b>' + me.energy + '</b>' }));
      ctrl.appendChild(pips);
      if (targeting != null) {
        ctrl.appendChild(U.el('div', { cls: 'pia-targeting', text: 'Pick a target enemy…' }));
        ctrl.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Cancel', onclick: () => { targeting = null; S.onUpdate && S.onUpdate(); } }));
      } else if (isMine && !me.ended && !me.dead) {
        ctrl.appendChild(U.el('button', { cls: 'btn', text: 'End Turn ▶', onclick: () => { targeting = null; S.act({ type: 'endTurn', playerId: me.id }); } }));
      } else if (me.dead) {
        ctrl.appendChild(U.el('div', { cls: 'muted', text: 'You have fallen. The others fight on…' }));
      } else if (me.ended) {
        ctrl.appendChild(U.el('div', { cls: 'muted', text: 'Turn ended — waiting for the party…' }));
      }
      foot.appendChild(ctrl);

      /* hand */
      const handEl = U.el('div', { cls: 'pia-hand' });
      if (isMine && !me.dead) {
        me.hand.forEach((inst, idx) => handEl.appendChild(renderCard(b, me, inst, idx)));
      } else {
        handEl.appendChild(U.el('div', { cls: 'muted', style: 'padding:20px', text: me.dead ? 'Defeated.' : 'This Guardian is played by someone else.' }));
      }
      foot.appendChild(handEl);
    }
    wrap.appendChild(foot);

    /* combat log */
    const logEl = U.el('div', { cls: 'pia-log' });
    b.log.slice(-4).forEach(l => logEl.appendChild(U.el('div', { text: l })));
    wrap.appendChild(logEl);
    return wrap;
  }

  function intentText(b, e) {
    const m = e.intent; if (!m) return '';
    const scale = e.dmgScale || 1;
    if (m.intent === 'attack' || (m.intent === 'debuff' && m.dmg)) {
      let d = Math.round(m.dmg * scale) + (e.st.str || 0);
      const hits = m.hits || 1;
      return hits > 1 ? (d + '×' + hits) : String(d);
    }
    if (m.intent === 'block') return String(m.block || 0);
    if (m.intent === 'buff') return '+' + (m.str || 0);
    if (m.intent === 'summon') return '+' + (m.count || 1);
    return '';
  }

  function renderEnemy(b, e) {
    const sp = SP.get(e.species);
    const cell = U.el('div', { cls: 'pia-enemy' + (e.boss ? ' boss' : e.elite ? ' elite' : '') + (targeting != null ? ' targetable' : '') });
    /* intent badge */
    const m = e.intent; const info = m ? (INTENT[m.intent] || INTENT.attack) : null;
    if (info) {
      const badge = U.el('div', { cls: 'pia-intent ' + info.cls, title: (m.name || m.intent) });
      badge.appendChild(U.el('span', { cls: 'pi-icon', text: info.icon }));
      const t = intentText(b, e); if (t) badge.appendChild(U.el('span', { cls: 'pi-val', text: t }));
      cell.appendChild(badge);
    }
    const size = e.boss ? 132 : e.elite ? 96 : 72;
    cell.appendChild(UI.tokenArt(e.species, size, 'idle', e.heads, null));
    cell.appendChild(U.el('div', { cls: 'pia-name', text: e.name }));
    cell.appendChild(hpBar(e.hp, e.maxHp, e.block));
    cell.appendChild(statusRow(e.st));
    if (targeting != null) cell.onclick = () => {
      const me = EN.playerById(b, S.myId); const idx = targeting; targeting = null;
      S.act({ type: 'playCard', playerId: me.id, handIdx: idx, targetUid: e.uid });
    };
    return cell;
  }

  function renderAlly(b, a) {
    const cell = U.el('div', { cls: 'pia-ally' });
    cell.appendChild(UI.tokenArt(a.species, 56, 'idle', null, null));
    cell.appendChild(U.el('div', { cls: 'pia-name tiny', text: a.name + (a.str ? ' +' + a.str : '') }));
    cell.appendChild(hpBar(a.hp, a.maxHp, a.block));
    const tags = [];
    if (a.dmg) tags.push('⚔' + (a.dmg + a.str));
    if (a.taunt) tags.push('🛡taunt');
    if (a.healAlly) tags.push('✚' + a.healAlly);
    cell.appendChild(U.el('div', { cls: 'tiny muted', text: tags.join(' ') }));
    return cell;
  }

  function renderGuardian(b, p) {
    const g = D.guardian(p.guardianId);
    const cell = U.el('div', { cls: 'pia-guardian' + (p.id === S.myId ? ' me' : '') + (p.dead ? ' dead' : '') + (p.ended ? ' ended' : '') });
    cell.appendChild(UI.tokenArt(g.avatar, 72, p.dead ? 'death' : 'idle', null, null));
    cell.appendChild(U.el('div', { cls: 'pia-name', text: p.name + (p.id === S.myId ? ' (you)' : '') }));
    cell.appendChild(hpBar(p.hp, p.maxHp, p.block));
    cell.appendChild(statusRow(p.st, true));
    if (p.ended && !p.dead) cell.appendChild(U.el('div', { cls: 'tiny gold', text: '✓ ready' }));
    return cell;
  }

  function hpBar(hp, max, block) {
    const wrap = U.el('div', { cls: 'pia-hpwrap' });
    const bar = U.el('div', { cls: 'pia-hpbar' });
    const fill = U.el('div', { cls: 'pia-hpfill', style: 'width:' + Math.max(0, Math.round(100 * hp / max)) + '%' });
    bar.appendChild(fill);
    bar.appendChild(U.el('div', { cls: 'pia-hptext', text: hp + '/' + max }));
    wrap.appendChild(bar);
    if (block > 0) wrap.appendChild(U.el('div', { cls: 'pia-block', title: 'Block', text: '🛡' + block }));
    return wrap;
  }

  function statusRow(st, isPlayer) {
    const row = U.el('div', { cls: 'pia-status' });
    const add = (cond, cls, label, title) => { if (cond) row.appendChild(U.el('span', { cls: 'pia-st ' + cls, title: title, text: label })); };
    add(st.poison, 'st-poison', '☠' + st.poison, 'Poison');
    add(st.vuln, 'st-vuln', '⤈' + st.vuln, 'Vulnerable (+50% damage taken)');
    add(st.weak, 'st-weak', '⬇' + st.weak, 'Weak (-25% damage dealt)');
    if (isPlayer) { add(st.str, 'st-str', '💪' + st.str, 'Strength'); add(st.regen, 'st-regen', '✚' + st.regen, 'Regen'); add(st.dex, 'st-dex', '✧' + st.dex, 'Dexterity'); }
    else add(st.str, 'st-str', '💪' + st.str, 'Strength');
    return row;
  }

  function renderCard(b, p, inst, idx) {
    const card = EN.mergedCard(inst);
    const cost = EN.cardCost(b, p.id, card);
    const playable = p.id === S.myId && !p.ended && !p.dead && p.energy >= cost;
    const el = U.el('div', { cls: 'pia-card t-' + card.type + (card.upg ? ' upg' : '') + (playable ? '' : ' disabled') });
    el.appendChild(U.el('div', { cls: 'pia-card-cost', text: cost }));
    el.appendChild(U.el('div', { cls: 'pia-card-type', text: card.type }));
    if (card.type === 'summon') {
      const keys = Array.isArray(card.summon) ? card.summon : [card.summon];
      const s = D.summonDef(keys[0]);
      if (s) el.appendChild(UI.tokenArt(s.species, 46, 'idle', null, null));
    }
    el.appendChild(U.el('div', { cls: 'pia-card-name', text: card.name }));
    el.appendChild(U.el('div', { cls: 'pia-card-text', text: cardText(card) }));
    if (playable) el.onclick = () => {
      if (needsTargetUI(card)) { targeting = idx; S.onUpdate && S.onUpdate(); }
      else S.act({ type: 'playCard', playerId: p.id, handIdx: idx, targetUid: null });
    };
    return el;
  }
  function cardText(card) {
    /* prefer the authored text; upgraded cards note it */
    return (card.text || '') + (card.upg ? '  (upgraded)' : '');
  }
  function needsTargetUI(card) {
    if (card.type === 'summon') return false;
    const e = card.e || {};
    if (e.aoe || e.poisonAll || e.detonatePoison || card.target === 'allEnemies' || card.target === 'self') return false;
    return !!(e.damage || e.poison || e.vuln || e.weak);
  }

  /* ---------- REWARD ---------- */
  function renderReward(run) {
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, 'Victory — spoils'));
    const me = R.player(run, S.myId) || run.players[0];
    const body = U.el('div', { cls: 'pia-reward panel' });
    body.appendChild(U.el('h2', { cls: 'gold', text: 'The field is yours.' }));

    if (me && me.relicReward) {
      const r = D.relic(me.relicReward);
      const rc = U.el('div', { cls: 'pia-relic-offer mt' }, [
        U.el('div', { html: r.icon + ' <b>' + U.esc(r.name) + '</b> — ' + U.esc(r.text) }),
        U.el('button', { cls: 'btn small', text: 'Take relic', onclick: () => { S.act({ type: 'takeRelic', accept: true }); } }),
      ]);
      body.appendChild(rc);
    }

    if (me && !me.rewardTaken && me.rewardChoices) {
      body.appendChild(U.el('div', { cls: 'muted mt', text: 'Add a card to your deck — choose one, or skip.' }));
      const row = U.el('div', { cls: 'pia-reward-cards' });
      me.rewardChoices.forEach(cid => {
        const c = renderStaticCard(cid);
        c.onclick = () => { S.act({ type: 'takeReward', cardId: cid }); };
        row.appendChild(c);
      });
      body.appendChild(row);
      body.appendChild(U.el('button', { cls: 'btn ghost mt', text: 'Skip card', onclick: () => { S.act({ type: 'takeReward', cardId: null }); } }));
    } else {
      body.appendChild(U.el('div', { cls: 'gold mt', text: 'Reward taken. ' + (run.mode === 'coop' ? 'Waiting for the party…' : '') }));
    }

    if (run.mode === 'coop') body.appendChild(partyPending(run, p => p.rewardTaken || p.hp <= 0));
    wrap.appendChild(body);
    return wrap;
  }

  function renderStaticCard(cardId) {
    const card = D.card(cardId);
    const el = U.el('div', { cls: 'pia-card t-' + card.type + ' static' });
    el.appendChild(U.el('div', { cls: 'pia-card-cost', text: (card.cost || 0) }));
    el.appendChild(U.el('div', { cls: 'pia-card-type', text: card.type }));
    if (card.type === 'summon') { const keys = Array.isArray(card.summon) ? card.summon : [card.summon]; const s = D.summonDef(keys[0]); if (s) el.appendChild(UI.tokenArt(s.species, 46, 'idle', null, null)); }
    el.appendChild(U.el('div', { cls: 'pia-card-name', text: card.name }));
    el.appendChild(U.el('div', { cls: 'pia-card-text', text: card.text || '' }));
    el.appendChild(U.el('div', { cls: 'tiny muted', text: card.rarity }));
    return el;
  }

  function partyPending(run, doneFn) {
    const row = U.el('div', { cls: 'pia-party-pending mt' });
    run.players.forEach(p => {
      row.appendChild(U.el('span', { cls: 'pill ' + (doneFn(p) ? 'done' : 'wait'), text: p.name + (doneFn(p) ? ' ✓' : ' …') }));
    });
    return row;
  }

  /* ---------- REST ---------- */
  function renderRest(run) {
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, 'Rest site'));
    const me = R.player(run, S.myId) || run.players[0];
    const body = U.el('div', { cls: 'pia-reward panel' });
    body.appendChild(U.el('h2', { cls: 'gold', text: 'A quiet fire.' }));
    body.appendChild(U.el('div', { cls: 'muted', text: 'Mend your wounds, or hone a card to its sharper truth.' }));
    if (me && !me.restDone) {
      const acts = U.el('div', { cls: 'flex mt' });
      acts.appendChild(U.el('button', { cls: 'btn', text: '🔥 Rest — heal ' + Math.round(me.maxHp * D.TUNE.restHeal) + ' HP', onclick: () => { S.act({ type: 'rest', mode: 'heal' }); } }));
      acts.appendChild(U.el('button', { cls: 'btn ghost', text: '⚒ Upgrade a card', onclick: () => openUpgrade(run, me) }));
      body.appendChild(acts);
    } else {
      body.appendChild(U.el('div', { cls: 'gold mt', text: 'Rested. ' + (run.mode === 'coop' ? 'Waiting for the party…' : '') }));
    }
    if (run.mode === 'coop') body.appendChild(partyPending(run, p => p.restDone || p.hp <= 0));
    wrap.appendChild(body);
    return wrap;
  }
  function openUpgrade(run, me) {
    const wrap = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'Upgrade a card' })]);
    const grid = U.el('div', { cls: 'pia-reward-cards', style: 'max-height:52vh;overflow:auto' });
    me.deck.forEach((c, i) => {
      const base = D.card(c.id); if (!base) return;
      const cell = renderStaticCard(c.id);
      if (c.upg || !base.upgrade) { cell.classList.add('disabled'); }
      else cell.onclick = () => { m.close(); S.act({ type: 'rest', mode: 'upgrade', deckIndex: i }); };
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
    const m = UI.modal(wrap);
    wrap.appendChild(U.el('button', { cls: 'btn ghost mt', text: 'Cancel', onclick: () => m.close() }));
  }

  /* ---------- SHOP ---------- */
  function renderShop(run) {
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, 'Merchant'));
    const me = R.player(run, S.myId) || run.players[0];
    const body = U.el('div', { cls: 'pia-reward panel' });
    body.appendChild(U.el('h2', { cls: 'gold', text: 'Wares of the road' }));
    body.appendChild(U.el('div', { cls: 'muted', text: 'Your gold: 🪙 ' + me.gold }));
    const cards = U.el('div', { cls: 'pia-reward-cards mt' });
    (run.shop.cards || []).forEach((item, i) => {
      const cell = renderStaticCard(item.id);
      const price = U.el('div', { cls: 'pia-price', text: item.sold ? 'SOLD' : ('🪙 ' + item.price) });
      cell.appendChild(price);
      if (!item.sold && me.gold >= item.price) cell.onclick = () => { S.act({ type: 'buyCard', idx: i }); };
      else if (!item.sold) cell.classList.add('disabled');
      else cell.classList.add('disabled');
      cards.appendChild(cell);
    });
    body.appendChild(cards);
    (run.shop.relics || []).forEach((item, i) => {
      const r = D.relic(item.id);
      const rc = U.el('div', { cls: 'pia-relic-offer mt' }, [
        U.el('div', { html: r.icon + ' <b>' + U.esc(r.name) + '</b> — ' + U.esc(r.text) + '  <span class="pia-price">' + (item.sold ? 'SOLD' : '🪙 ' + item.price) + '</span>' }),
      ]);
      if (!item.sold && me.gold >= item.price && me.relics.indexOf(item.id) < 0) rc.appendChild(U.el('button', { cls: 'btn small', text: 'Buy', onclick: () => { S.act({ type: 'buyRelic', idx: i }); } }));
      body.appendChild(rc);
    });
    body.appendChild(U.el('button', { cls: 'btn mt', text: 'Leave the merchant ▶', onclick: () => { S.act({ type: 'leaveShop' }); } }));
    wrap.appendChild(body);
    return wrap;
  }

  /* ---------- TREASURE ---------- */
  function renderTreasure(run) {
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, 'Treasure'));
    const me = R.player(run, S.myId) || run.players[0];
    const body = U.el('div', { cls: 'pia-reward panel' });
    body.appendChild(U.el('h2', { cls: 'gold', text: 'A cache in the rocks.' }));
    if (me && me.treasureRelic && !me.restDone) {
      const r = D.relic(me.treasureRelic);
      body.appendChild(U.el('div', { cls: 'pia-relic-offer mt' }, [U.el('div', { html: r.icon + ' <b>' + U.esc(r.name) + '</b> — ' + U.esc(r.text) })]));
      const acts = U.el('div', { cls: 'flex mt' });
      acts.appendChild(U.el('button', { cls: 'btn', text: 'Take it', onclick: () => { S.act({ type: 'takeTreasure', accept: true }); } }));
      acts.appendChild(U.el('button', { cls: 'btn ghost', text: 'Leave it', onclick: () => { S.act({ type: 'takeTreasure', accept: false }); } }));
      body.appendChild(acts);
    } else {
      body.appendChild(U.el('div', { cls: 'gold mt', text: 'Taken. ' + (run.mode === 'coop' ? 'Waiting for the party…' : '') }));
    }
    if (run.mode === 'coop') body.appendChild(partyPending(run, p => p.restDone || p.hp <= 0));
    wrap.appendChild(body);
    return wrap;
  }

  /* ---------- END ---------- */
  function renderEnd(run, victory) {
    if (run.mode === 'solo') R.clearSolo();
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, victory ? 'The Quarry falls' : 'The run ends'));
    const body = U.el('div', { cls: 'pia-end panel ' + (victory ? 'win' : 'lose') });
    if (victory) {
      body.appendChild(U.el('h1', { cls: 'gold', text: '★ Quarry Felled ★' }));
      body.appendChild(U.el('div', { text: 'You ran the great beast of ' + D.planet(run.planet).name + ' to ground. The Guild will remember it.' }));
      /* award a little gold to the account as a nod (solo, real account only) */
      if (run.mode === 'solo' && G.me && !G.me.ai && !run._paid) { run._paid = true; try { G.me.gold += 250; G.save && G.save(); UI.refreshTopbar && UI.refreshTopbar(); } catch (e) { } }
      if (run.mode === 'solo') body.appendChild(U.el('div', { cls: 'gold mt', text: '+250 gold added to your account.' }));
    } else {
      body.appendChild(U.el('h1', { style: 'color:#c25', text: 'Fallen' }));
      body.appendChild(U.el('div', { text: 'The party could not hold. The Quarry hunts on.' }));
    }
    const acts = U.el('div', { cls: 'flex mt' });
    acts.appendChild(U.el('button', { cls: 'btn', text: '↺ New run', onclick: () => { if (run.mode === 'coop') C.leave(); UI.show('pia'); } }));
    acts.appendChild(U.el('button', { cls: 'btn ghost', text: '☰ Main menu', onclick: () => { if (run.mode === 'coop') C.leave(); UI.show('menu'); } }));
    body.appendChild(acts);
    wrap.appendChild(body);
    return wrap;
  }

})();
