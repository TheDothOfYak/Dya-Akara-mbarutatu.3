/* ============================================================
   DYA'AKARA — ui/screens_expedition.js
   Expedition Mode (Roguelike Summoner) — screens.

   Pick a Hero (locked to one element) → choose a form → enter a planet
   gauntlet of node battles → spend Vaelk to summon creatures from an
   element-filtered draft pool → clear the planet's Guardian. Lose a
   fight and the run ends. Reuses the Expedition map-node idea and the
   standard match screen for combat.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, UI = DYA.ui, SP = DYA.species, TK = DYA.token;
  const ED = DYA.expeditionData, E = DYA.expedition;

  /* pre-run selection wizard (only used when there is no active run) */
  const wiz = { phase: 'hero', heroId: null, formId: null };
  function resetWiz() { wiz.phase = 'hero'; wiz.heroId = null; wiz.formId = null; }

  function elTag(el) { return '<span class="el-' + el + '">' + el + ' · ' + (SP.ELEMENT_NAMES[el] || el) + '</span>'; }
  function vaelkLine(el) { const v = ED.vaelkOf(el); return v.plural + ' — the ' + v.aspect + ' hero’s summoning drive'; }

  UI.register('expedition', {
    enter(root) {
      const me = G.me;
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Expedition' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      head.appendChild(U.el('h2', { text: 'Expedition — the Vaelkar Gauntlet' }));
      head.appendChild(U.el('div', { cls: 'muted small', text: 'A run-based summoner mode. Single-player: the run ends when you fall, or when a planet’s Guardian does.' }));
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body', style: 'max-width:940px;width:100%;margin:0 auto' });
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);

      const run = E.active();
      if (run && run.ended) { renderRunEnd(body, run); return; }
      if (run && run.pendingDraft) { renderDraft(body, run); return; }
      if (run) { renderRunMap(body, run); return; }

      /* no run → the selection wizard */
      if (wiz.phase === 'form') renderFormSelect(body);
      else if (wiz.phase === 'planet') renderPlanetSelect(body);
      else renderHeroSelect(body);
    },
  });

  /* ---------------- HERO SELECT ---------------- */
  function renderHeroSelect(body) {
    body.appendChild(U.el('div', { cls: 'panel mb', html:
      '<b class="gold">Vaelk</b> is a hero’s inner drive to call creatures to their side — a resource all its own, apart from a token’s Fti/Su/Eldi/Ular ready cost. ' +
      'It comes in four elemental flavors (Fti’Vaelk, Su’Vaelk, Eldi’Vaelk, Ular’Vaelk; plural <i>Vaelkar</i>). ' +
      'A hero is locked to one element: they generate and spend only their own flavor, and draft only creatures of that affinity.' }));
    body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Choose your Hero' }));
    const grid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px' });
    ED.HEROES.forEach(h => {
      const base = h.forms[0];
      const card = U.el('div', { cls: 'panel', style: 'text-align:left;padding:12px;cursor:pointer;display:flex;flex-direction:column;gap:6px' });
      const top = U.el('div', { cls: 'flex', style: 'align-items:center;gap:10px' });
      top.appendChild(UI.tokenArt(base.avatar, 64, 'idle'));
      top.appendChild(U.el('div', { cls: 'flex1', html:
        '<b class="gold">' + U.esc(h.name) + '</b>' + (h.forms.length > 1 ? ' <span class="pill">' + h.forms.length + ' forms</span>' : '') +
        '<br><span class="small">' + elTag(h.element) + '</span>' +
        '<br><span class="small muted">' + (h.origin === 'established' ? 'Established character' : 'Original character') + '</span>' }));
      card.appendChild(top);
      card.appendChild(U.el('div', { cls: 'small muted', text: h.blurb }));
      card.appendChild(U.el('div', { cls: 'small', style: 'color:var(--eldi)', text: '⚡ ' + ED.vaelkOf(h.element).flavor }));
      card.onclick = () => {
        DYA.audio.play('click');
        wiz.heroId = h.id;
        if (h.forms.length > 1) { wiz.phase = 'form'; UI.show('expedition'); }
        else { wiz.formId = h.forms[0].id; wiz.phase = 'planet'; UI.show('expedition'); }
      };
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* ---------------- FORM SELECT (Artifact Forms) ---------------- */
  function renderFormSelect(body) {
    const hero = ED.getHero(wiz.heroId);
    if (!hero) { resetWiz(); return renderHeroSelect(body); }
    body.appendChild(U.el('div', { cls: 'back-arrow', text: '‹ back', style: 'cursor:pointer;width:auto', onclick: () => { wiz.phase = 'hero'; UI.show('expedition'); } }));
    body.appendChild(U.el('h3', { cls: 'gold mb', text: hero.name + ' — Artifact Forms' }));
    body.appendChild(U.el('p', { cls: 'muted mb', text: 'A hero can hold more than one form, unlocked through story or a relic. Swapping form can change the hero’s element (and so its Vaelk flavor and draft pool), base ability, and summon pool — letting one character occupy more than one roster slot as they evolve.' }));
    const grid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px' });
    hero.forms.forEach(f => {
      const card = U.el('div', { cls: 'panel', style: 'text-align:left;padding:12px;cursor:pointer' });
      const top = U.el('div', { cls: 'flex', style: 'align-items:center;gap:10px' });
      top.appendChild(UI.tokenArt(f.avatar, 60, 'idle'));
      top.appendChild(U.el('div', { cls: 'flex1', html:
        '<b class="gold">' + U.esc(f.name) + '</b>' + (f.neutral ? ' <span class="pill">neutral / hybrid</span>' : '') +
        '<br><span class="small">' + elTag(f.element) + (f.neutral ? ' <span class="muted">(draws every element)</span>' : '') + '</span>' }));
      card.appendChild(top);
      card.appendChild(U.el('div', { cls: 'small mt', html: '<b>Ability:</b> ' + U.esc(f.ability) }));
      card.appendChild(U.el('div', { cls: 'small muted mt', text: f.unlock === 'start' ? 'Available from the start.' : (f.unlock || 'Unlocked through an artifact.') }));
      card.onclick = () => { DYA.audio.play('click'); wiz.formId = f.id; wiz.phase = 'planet'; UI.show('expedition'); };
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* ---------------- PLANET SELECT ---------------- */
  function renderPlanetSelect(body) {
    const form = ED.getForm(wiz.formId);
    body.appendChild(U.el('div', { cls: 'back-arrow', text: '‹ back', style: 'cursor:pointer;width:auto', onclick: () => { const h = ED.getHero(wiz.heroId); wiz.phase = (h && h.forms.length > 1) ? 'form' : 'hero'; UI.show('expedition'); } }));
    body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Choose a planet gauntlet' }));
    body.appendChild(U.el('p', { cls: 'muted mb', html: 'Fighting as <b class="gold">' + U.esc(form.name) + '</b> · ' + elTag(form.element) + ' · <span style="color:var(--eldi)">' + ED.vaelkOf(form.element).flavor + '</span>' }));
    const grid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px' });
    ED.PLANETS.forEach(p => {
      const g = p.guardian;
      const card = U.el('div', { cls: 'panel', style: 'text-align:left;padding:12px;cursor:pointer' });
      card.appendChild(U.el('div', { cls: 'flex', style: 'align-items:center;gap:8px' }, [
        U.el('b', { cls: 'gold', text: p.name }),
        U.el('span', { cls: 'small', html: elTag(p.theme) }),
      ]));
      card.appendChild(U.el('div', { cls: 'small muted mt', text: p.blurb }));
      card.appendChild(U.el('div', { cls: 'small mt', text: p.nodes + ' nodes · ' + (p.nodes - 1) + ' encounters, then the Guardian' }));
      const gr = U.el('div', { cls: 'flex mt', style: 'align-items:center;gap:8px;border-top:1px solid #ffffff18;padding-top:8px' });
      gr.appendChild(UI.tokenArt(g.species, 48, 'idle'));
      gr.appendChild(U.el('div', { cls: 'small flex1', html: '☠ <b class="gold">' + U.esc(g.name) + '</b><br><span class="muted">' + U.esc((SP.get(g.species) || {}).name || g.species) + ' — summons its own minions</span>' }));
      card.appendChild(gr);
      card.onclick = () => {
        DYA.audio.play('click');
        UI.confirm('Set out for ' + p.name + '?', 'As ' + form.name + ', spending ' + ED.vaelkOf(form.element).flavor + ' to summon. The run is single-player and run-only — nothing here touches your real Collection.', () => {
          const run = E.start(wiz.formId, p.id);
          resetWiz();
          if (run) UI.show('expedition'); else UI.alert('Hm', 'Could not start the run.');
        }, 'Set out');
      };
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* ---------------- DRAFT (win a node → keep 1 of 3) ---------------- */
  function renderDraft(body, run) {
    const first = run.pendingDraft.reason === 'start';
    body.appendChild(U.el('h3', { cls: 'gold mb', text: first ? 'Your first summon' : 'Draft a creature — node cleared' }));
    body.appendChild(U.el('p', { cls: 'muted mb', html:
      (first ? 'Before you set foot on ' + U.esc(run.planetName) + ', ' : 'The way is clear. ') +
      'add one creature to your run-deck. Your pool is the Collection roster filtered to <b>' + elTag(run.element) + '</b>' + (run.neutral ? ' <span class="muted">(hybrid — every element)</span>' : '') + ' affinity. It costs ' + ED.vaelkOf(run.element).flavor + ' to summon in battle.' }));
    const opts = run.pendingDraft.options;
    if (!opts.length) { body.appendChild(U.el('p', { cls: 'muted', text: 'No creatures available to draft.' })); return; }
    const grid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;justify-items:center' });
    opts.forEach(tok => {
      const wrap = U.el('div', { style: 'text-align:center' });
      const card = UI.tokenCard(tok, { size: 104, mode: 'full' });
      card.style.cursor = 'pointer';
      card.onclick = () => {
        DYA.audio.play('click');
        E.applyDraft(run, tok);
        UI.show('expedition');
      };
      wrap.appendChild(card);
      wrap.appendChild(U.el('div', { cls: 'small', style: 'color:var(--eldi)', text: '⚡ ' + TK.cost(tok) + ' ' + ED.vaelkOf(run.element).flavor }));
      grid.appendChild(wrap);
    });
    body.appendChild(grid);
    body.appendChild(U.el('p', { cls: 'small muted mt center', text: 'Deck so far: ' + (run.deck.length || 0) + ' creature' + (run.deck.length === 1 ? '' : 's') }));
  }

  /* ---------------- RUN MAP ---------------- */
  function renderRunMap(body, run) {
    const el = run.element, v = ED.vaelkOf(el);
    const guardianIdx = run.nodes - 1;

    /* header strip */
    const hdr = U.el('div', { cls: 'panel mb', style: 'display:flex;gap:14px;align-items:center' });
    hdr.appendChild(UI.tokenArt(run.avatar, 72, 'idle'));
    hdr.appendChild(U.el('div', { cls: 'flex1', html:
      '<b class="gold">' + U.esc(run.formName) + '</b> <span class="small muted">(' + U.esc(run.heroName) + ')</span>' +
      '<br><span class="small">' + elTag(el) + ' · <span style="color:var(--eldi)">' + v.flavor + '</span></span>' +
      '<br><span class="small muted">' + U.esc(run.ability || '') + '</span>' }));
    hdr.appendChild(U.el('div', { cls: 'small muted', style: 'text-align:right', html:
      '⚡ +' + run.vaelkRegen + ' ' + v.plural + ' / pulse<br>start each node with ' + run.startVaelk }));
    body.appendChild(hdr);

    /* node track */
    body.appendChild(U.el('h3', { cls: 'gold mb', text: run.planetName + ' — node ' + Math.min(run.nodeIdx + 1, run.nodes) + ' of ' + run.nodes }));
    const track = U.el('div', { cls: 'flex mb', style: 'gap:8px;flex-wrap:wrap;align-items:center' });
    for (let i = 0; i < run.nodes; i++) {
      const guardian = i === guardianIdx;
      const done = i < run.nodeIdx, cur = i === run.nodeIdx;
      const dot = U.el('div', { style:
        'width:' + (guardian ? 40 : 30) + 'px;height:' + (guardian ? 40 : 30) + 'px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;' +
        'background:' + (done ? 'var(--gold)' : cur ? '#3a2f1d' : '#ffffff10') + ';' +
        'border:2px solid ' + (cur ? 'var(--gold)' : guardian ? 'var(--red)' : '#ffffff30') + ';' +
        'color:' + (done ? '#14100b' : '#fff'),
        text: guardian ? '☠' : done ? '✓' : String(i + 1) });
      track.appendChild(dot);
      if (i < run.nodes - 1) track.appendChild(U.el('div', { style: 'width:16px;height:2px;background:#ffffff30' }));
    }
    body.appendChild(track);

    /* current node preview */
    const node = E.buildNode(run);
    const nodeBox = U.el('div', { cls: 'panel mb', style: 'display:flex;gap:14px;align-items:center' });
    const enemy = node.enemies[node.enemies.length - 1];
    nodeBox.appendChild(UI.tokenArt(enemy.speciesId, node.guardian ? 92 : 72, 'idle'));
    nodeBox.appendChild(U.el('div', { cls: 'flex1', html:
      (node.guardian ? '☠ <b style="color:var(--red)">GUARDIAN — ' + U.esc(node.name) + '</b>' : '<b class="gold">' + U.esc(node.name) + '</b>') +
      '<br><span class="small muted">' + (node.guardian ? U.esc(node.blurb || '') : node.enemies.length + ' wild creature' + (node.enemies.length === 1 ? '' : 's') + ' — ' + node.enemies.map(e => (SP.get(e.speciesId) || {}).name || e.speciesId).join(', ')) + '</span>' +
      (node.guardian ? '<br><span class="small" style="color:var(--red)">Defeat it to clear ' + U.esc(run.planetName) + '.</span>' : '') }));
    const enterBtn = U.el('button', { cls: 'btn primary', text: node.guardian ? '⚔ Face the Guardian' : '⚔ Enter node' });
    enterBtn.onclick = () => {
      DYA.audio.play('click');
      E.launchNode(run, { onFinish: () => { UI.show('expedition'); } });
    };
    nodeBox.appendChild(enterBtn);
    body.appendChild(nodeBox);

    /* the run-deck */
    body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Run-deck — spend ' + v.flavor + ' to summon these' }));
    if (!run.deck.length) body.appendChild(U.el('p', { cls: 'muted', text: 'No creatures drafted yet.' }));
    else {
      const dg = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px' });
      run.deck.forEach(tok => {
        const cell = U.el('div', { style: 'text-align:center' });
        cell.appendChild(UI.tokenCard(tok, { size: 78, mode: 'minimal' }));
        cell.appendChild(U.el('div', { cls: 'small', style: 'color:var(--eldi)', text: '⚡' + TK.cost(tok) }));
        dg.appendChild(cell);
      });
      body.appendChild(dg);
    }

    /* controls */
    const ctrl = U.el('div', { cls: 'flex mt', style: 'gap:10px' });
    ctrl.appendChild(U.el('button', { cls: 'btn ghost', text: 'How it plays', onclick: showHelp }));
    ctrl.appendChild(U.el('div', { cls: 'flex1' }));
    ctrl.appendChild(U.el('button', {
      cls: 'btn danger', text: 'Abandon run', onclick: () => {
        UI.confirm('Abandon the run?', 'The run and its deck are lost — but nothing permanent goes with them. You can start a fresh run any time.', () => { E.end(); UI.show('menu'); }, 'Abandon');
      },
    }));
    body.appendChild(ctrl);
  }

  function showHelp() {
    const w = U.el('div', {});
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Expedition — how it plays' }));
    w.appendChild(U.el('div', { cls: 'small mt', html:
      '<p>• Each node is a battle: your <b>hero</b> takes the field with a base attack, and you spend <b>Vaelk</b> to summon your drafted creatures beside it.</p>' +
      '<p>• Vaelk regenerates every pulse (only your hero’s flavor). Summoned creatures fight with their own locked behavior — the same match AI as everywhere else.</p>' +
      '<p>• Win a node to draft another creature. The final node is the planet’s <b>Guardian</b> — a legendary that summons minions of its own, scaled up.</p>' +
      '<p>• Defeat the Guardian to clear the planet. If your whole side is wiped or you run out of time, the run ends and returns you here.</p>' }));
    const m = UI.modal(w);
    w.appendChild(U.el('button', { cls: 'btn primary mt', text: 'Got it', onclick: () => m.close() }));
  }

  /* ---------------- RUN END (victory / defeat) ---------------- */
  function renderRunEnd(body, run) {
    const cleared = run.result === 'cleared';
    const wrap = U.el('div', { cls: 'panel center', style: 'max-width:560px;margin:24px auto' });
    wrap.appendChild(U.el('h1', { cls: cleared ? 'victory' : 'defeat', text: cleared ? 'PLANET CLEARED' : 'THE RUN ENDS' }));
    if (cleared) {
      wrap.appendChild(U.el('p', { cls: 'gold mt', text: run.formName + ' has felled the Guardian of ' + run.planetName + '.' }));
      wrap.appendChild(U.el('p', { cls: 'muted mt', text: 'The gauntlet is broken. Your run-deck of ' + run.deck.length + ' creature' + (run.deck.length === 1 ? '' : 's') + ' carried the day.' }));
    } else {
      wrap.appendChild(U.el('p', { cls: 'muted mt', text: run.formName + ' fell on ' + run.planetName + ' at node ' + Math.min(run.nodeIdx + 1, run.nodes) + ' of ' + run.nodes + '. No permanent loss — the run-deck and Vaelk reset. Regroup and try again.' }));
    }
    const row = U.el('div', { cls: 'flex mt', style: 'justify-content:center;gap:10px' });
    row.appendChild(U.el('button', { cls: 'btn primary', text: 'New run', onclick: () => { E.end(); resetWiz(); UI.show('expedition'); } }));
    row.appendChild(U.el('button', { cls: 'btn ghost', text: 'To the menu', onclick: () => { E.end(); UI.show('menu'); } }));
    wrap.appendChild(row);
    body.appendChild(wrap);
    DYA.audio.play(cleared ? 'victory' : 'defeat');
  }
})();
