/* ============================================================
   DYA'AKARA — ui/screens_hunt_run.js
   The HUNT — screens (a run-based summoner mode).

   Pick a Hunter (locked to one element) → choose a form → enter a
   hunting ground of node battles → spend Vaelk to summon beasts from an
   element-filtered draft pool → run the ground's Quarry to ground.
   Defeat the Quarry and you claim a PIECE of it, carrying its EXACT
   stats, to sing true at the workbench. Lose a fight and the run ends.
   It is meant to be very hard.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, UI = DYA.ui, SP = DYA.species, TK = DYA.token;
  const ED = DYA.huntRunData, E = DYA.huntRun;

  const wiz = { phase: 'hero', heroId: null, formId: null };
  function resetWiz() { wiz.phase = 'hero'; wiz.heroId = null; wiz.formId = null; }

  function elTag(el) { return '<span class="el-' + el + '">' + el + ' · ' + (SP.ELEMENT_NAMES[el] || el) + '</span>'; }

  UI.register('huntRun', {
    enter(root) {
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Hunt' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      head.appendChild(U.el('h2', { text: 'The Hunt — the Vaelkar Gauntlet' }));
      head.appendChild(U.el('div', { cls: 'muted small', text: 'A run-based summoner hunt. Single-player: the run ends when you fall, or when a hunting ground’s Quarry does. Beat the Quarry and you claim a piece of it — with its exact stats.' }));
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body', style: 'max-width:940px;width:100%;margin:0 auto' });
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);

      const run = E.active();
      if (run && run.ended) { renderRunEnd(body, run); return; }
      if (run && run.pendingDraft) { renderDraft(body, run); return; }
      if (run) { renderRunMap(body, run); return; }

      if (wiz.phase === 'form') renderFormSelect(body);
      else if (wiz.phase === 'planet') renderGroundSelect(body);
      else renderHunterSelect(body);
    },
  });

  /* ---------------- HUNTER SELECT ---------------- */
  function renderHunterSelect(body) {
    body.appendChild(U.el('div', { cls: 'panel mb', html:
      '<b class="gold">Vaelk</b> is a Hunter’s inner drive to call beasts to their side — a resource all its own, apart from a token’s Fti/Su/Eldi/Ular ready cost. ' +
      'It comes in four elemental flavors (Fti’Vaelk, Su’Vaelk, Eldi’Vaelk, Ular’Vaelk; plural <i>Vaelkar</i>). ' +
      'A Hunter is locked to one element: they generate and spend only their own flavor, and draft only beasts of that affinity. ' +
      '<span style="color:var(--red)">The Hunt is brutal — expect to fall many times before a Quarry does.</span>' }));
    body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Choose your Hunter' }));
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
        if (h.forms.length > 1) { wiz.phase = 'form'; UI.show('huntRun'); }
        else { wiz.formId = h.forms[0].id; wiz.phase = 'planet'; UI.show('huntRun'); }
      };
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* ---------------- FORM SELECT (Artifact Forms) ---------------- */
  function renderFormSelect(body) {
    const hero = ED.getHero(wiz.heroId);
    if (!hero) { resetWiz(); return renderHunterSelect(body); }
    body.appendChild(U.el('div', { cls: 'back-arrow', text: '‹ back', style: 'cursor:pointer;width:auto', onclick: () => { wiz.phase = 'hero'; UI.show('huntRun'); } }));
    body.appendChild(U.el('h3', { cls: 'gold mb', text: hero.name + ' — Artifact Forms' }));
    body.appendChild(U.el('p', { cls: 'muted mb', text: 'A Hunter can hold more than one form, unlocked through story or a relic. Swapping form can change the Hunter’s element (and so its Vaelk flavor and draft pool), base ability, and summon pool — letting one character occupy more than one roster slot as they evolve.' }));
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
      card.onclick = () => { DYA.audio.play('click'); wiz.formId = f.id; wiz.phase = 'planet'; UI.show('huntRun'); };
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* ---------------- HUNTING GROUND SELECT ---------------- */
  function renderGroundSelect(body) {
    const form = ED.getForm(wiz.formId);
    body.appendChild(U.el('div', { cls: 'back-arrow', text: '‹ back', style: 'cursor:pointer;width:auto', onclick: () => { const h = ED.getHero(wiz.heroId); wiz.phase = (h && h.forms.length > 1) ? 'form' : 'hero'; UI.show('huntRun'); } }));
    body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Choose a hunting ground' }));
    body.appendChild(U.el('p', { cls: 'muted mb', html: 'Hunting as <b class="gold">' + U.esc(form.name) + '</b> · ' + elTag(form.element) + ' · <span style="color:var(--eldi)">' + ED.vaelkOf(form.element).flavor + '</span>' }));
    const grid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px' });
    ED.PLANETS.forEach(p => {
      const g = p.guardian;
      const card = U.el('div', { cls: 'panel', style: 'text-align:left;padding:12px;cursor:pointer' });
      card.appendChild(U.el('div', { cls: 'flex', style: 'align-items:center;gap:8px' }, [
        U.el('b', { cls: 'gold', text: p.name }),
        U.el('span', { cls: 'small', html: elTag(p.theme) }),
      ]));
      card.appendChild(U.el('div', { cls: 'small muted mt', text: p.blurb }));
      card.appendChild(U.el('div', { cls: 'small mt', text: p.nodes + ' nodes · ' + (p.nodes - 1) + ' beast packs, then the Quarry' }));
      const gr = U.el('div', { cls: 'flex mt', style: 'align-items:center;gap:8px;border-top:1px solid #ffffff18;padding-top:8px' });
      gr.appendChild(UI.tokenArt(g.species, 48, 'idle'));
      gr.appendChild(U.el('div', { cls: 'small flex1', html: '☠ <b class="gold">' + U.esc(g.name) + '</b><br><span class="muted">' + U.esc((SP.get(g.species) || {}).name || g.species) + ' — a monstrous Quarry; beat it for its exact-stat piece</span>' }));
      card.appendChild(gr);
      card.onclick = () => {
        DYA.audio.play('click');
        UI.confirm('Hunt the ' + p.name + ' Quarry?', 'As ' + form.name + ', spending ' + ED.vaelkOf(form.element).flavor + ' to summon. The run is single-player and run-only — nothing here touches your real Collection, except the Quarry-piece you earn by winning.', () => {
          const run = E.start(wiz.formId, p.id);
          resetWiz();
          if (run) UI.show('huntRun'); else UI.alert('Hm', 'Could not start the hunt.');
        }, 'Begin the hunt');
      };
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* ---------------- DRAFT ---------------- */
  function renderDraft(body, run) {
    const first = run.pendingDraft.reason === 'start';
    body.appendChild(U.el('h3', { cls: 'gold mb', text: first ? 'Your first beast' : 'Draft a beast — pack cleared' }));
    body.appendChild(U.el('p', { cls: 'muted mb', html:
      (first ? 'Before you set foot on ' + U.esc(run.planetName) + ', ' : 'The way is clear. ') +
      'add one beast to your summon-deck. Your pool is the Collection roster filtered to <b>' + elTag(run.element) + '</b>' + (run.neutral ? ' <span class="muted">(hybrid — every element)</span>' : '') + ' affinity. It costs ' + ED.vaelkOf(run.element).flavor + ' to summon in battle.' }));
    const opts = run.pendingDraft.options;
    if (!opts.length) { body.appendChild(U.el('p', { cls: 'muted', text: 'No beasts available to draft.' })); return; }
    const grid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;justify-items:center' });
    opts.forEach(tok => {
      const wrap = U.el('div', { style: 'text-align:center' });
      const card = UI.tokenCard(tok, { size: 104, mode: 'full' });
      card.style.cursor = 'pointer';
      card.onclick = () => { DYA.audio.play('click'); E.applyDraft(run, tok); UI.show('huntRun'); };
      wrap.appendChild(card);
      wrap.appendChild(U.el('div', { cls: 'small', style: 'color:var(--eldi)', text: '⚡ ' + TK.cost(tok) + ' ' + ED.vaelkOf(run.element).flavor }));
      grid.appendChild(wrap);
    });
    body.appendChild(grid);
    body.appendChild(U.el('p', { cls: 'small muted mt center', text: 'Deck so far: ' + (run.deck.length || 0) + ' beast' + (run.deck.length === 1 ? '' : 's') }));
  }

  /* ---------------- RUN MAP ---------------- */
  function renderRunMap(body, run) {
    const el = run.element, v = ED.vaelkOf(el);
    const guardianIdx = run.nodes - 1;

    const hdr = U.el('div', { cls: 'panel mb', style: 'display:flex;gap:14px;align-items:center' });
    hdr.appendChild(UI.tokenArt(run.avatar, 72, 'idle'));
    hdr.appendChild(U.el('div', { cls: 'flex1', html:
      '<b class="gold">' + U.esc(run.formName) + '</b> <span class="small muted">(' + U.esc(run.heroName) + ')</span>' +
      '<br><span class="small">' + elTag(el) + ' · <span style="color:var(--eldi)">' + v.flavor + '</span></span>' +
      '<br><span class="small muted">' + U.esc(run.ability || '') + '</span>' }));
    hdr.appendChild(U.el('div', { cls: 'small muted', style: 'text-align:right', html:
      '⚡ +' + run.vaelkRegen + ' ' + v.plural + ' / pulse<br>start each node with ' + run.startVaelk }));
    body.appendChild(hdr);

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

    const node = E.buildNode(run);
    const nodeBox = U.el('div', { cls: 'panel mb', style: 'display:flex;gap:14px;align-items:center' });
    const enemy = node.enemies[node.enemies.length - 1];
    nodeBox.appendChild(UI.tokenArt(enemy.speciesId, node.guardian ? 96 : 72, 'idle'));
    nodeBox.appendChild(U.el('div', { cls: 'flex1', html:
      (node.guardian ? '☠ <b style="color:var(--red)">THE QUARRY — ' + U.esc(node.name) + '</b>' : '<b class="gold">' + U.esc(node.name) + '</b>') +
      '<br><span class="small muted">' + (node.guardian ? U.esc(node.blurb || '') : node.enemies.length + ' wild beasts — ' + node.enemies.map(e => (SP.get(e.speciesId) || {}).name || e.speciesId).join(', ')) + '</span>' +
      (node.guardian ? '<br><span class="small" style="color:var(--red)">A monster — vast health, hits hard, and never stops summoning. Beat it to claim its exact-stat piece and clear ' + U.esc(run.planetName) + '.</span>' : '') }));
    const enterBtn = U.el('button', { cls: 'btn primary', text: node.guardian ? '⚔ Face the Quarry' : '⚔ Enter node' });
    enterBtn.onclick = () => {
      DYA.audio.play('click');
      E.launchNode(run, { onFinish: () => { UI.show('huntRun'); } });
    };
    nodeBox.appendChild(enterBtn);
    body.appendChild(nodeBox);

    body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Summon-deck — spend ' + v.flavor + ' to call these' }));
    if (!run.deck.length) body.appendChild(U.el('p', { cls: 'muted', text: 'No beasts drafted yet.' }));
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

    const ctrl = U.el('div', { cls: 'flex mt', style: 'gap:10px' });
    ctrl.appendChild(U.el('button', { cls: 'btn ghost', text: 'How it plays', onclick: showHelp }));
    ctrl.appendChild(U.el('div', { cls: 'flex1' }));
    ctrl.appendChild(U.el('button', {
      cls: 'btn danger', text: 'Abandon hunt', onclick: () => {
        UI.confirm('Abandon the hunt?', 'The run and its deck are lost — but nothing permanent goes with them. You can start a fresh hunt any time.', () => { E.end(); UI.show('menu'); }, 'Abandon');
      },
    }));
    body.appendChild(ctrl);
  }

  function showHelp() {
    const w = U.el('div', {});
    w.appendChild(U.el('h3', { cls: 'gold', text: 'The Hunt — how it plays' }));
    w.appendChild(U.el('div', { cls: 'small mt', html:
      '<p>• Each node is a battle: your <b>Hunter</b> takes the field with a base attack, and you spend <b>Vaelk</b> to summon your drafted beasts beside it.</p>' +
      '<p>• Vaelk regenerates every pulse (only your Hunter’s flavor). Summoned beasts fight with their own locked behavior — the same match AI as everywhere else.</p>' +
      '<p>• Win a node to draft another beast. The final node is the ground’s <b>Quarry</b> — a legendary scaled into a true boss that summons its own minions.</p>' +
      '<p>• Beat the Quarry and you claim a <b>piece of it with its exact stats</b> — take it to the workbench to sing that very monster into your Collection.</p>' +
      '<p>• If your whole side is wiped or you run out of time, the run ends and returns you here. It is meant to be very hard.</p>' }));
    const m = UI.modal(w);
    w.appendChild(U.el('button', { cls: 'btn primary mt', text: 'Got it', onclick: () => m.close() }));
  }

  /* ---------------- RUN END ---------------- */
  function renderRunEnd(body, run) {
    const cleared = run.result === 'cleared';
    const wrap = U.el('div', { cls: 'panel center', style: 'max-width:580px;margin:24px auto' });
    wrap.appendChild(U.el('h1', { cls: cleared ? 'victory' : 'defeat', text: cleared ? 'THE QUARRY FALLS' : 'THE HUNT ENDS' }));
    if (cleared) {
      const r = run.reward || {};
      wrap.appendChild(U.el('p', { cls: 'gold mt', text: run.formName + ' has run the Quarry of ' + run.planetName + ' to ground.' }));
      if (r.speciesId) {
        wrap.appendChild(U.el('div', { cls: 'mt' }, [UI.tokenArt(r.speciesId, 110, 'idle')]));
        wrap.appendChild(U.el('div', { cls: 'panel mt', style: 'text-align:left', html:
          '🦴 <b class="gold">A piece of ' + U.esc(r.name || 'the Quarry') + '</b> — with its <b>exact stats</b>:' +
          '<br><span class="small">Health <b class="gold">' + (r.stats ? r.stats.hp : '?') + '</b> · Strike <b class="gold">' + (r.stats ? r.stats.dmg : '?') + '</b> · Pace <b class="gold">' + (r.stats ? r.stats.speed : '?') + '</b> · ' + (SP.RARITIES[r.rarity] || '') + '</span>' +
          '<br><span class="small muted">Take it to the Crafting bench to sing this very monster into your Collection.</span>' }));
      }
    } else {
      wrap.appendChild(U.el('p', { cls: 'muted mt', text: run.formName + ' fell on ' + run.planetName + ' at node ' + Math.min(run.nodeIdx + 1, run.nodes) + ' of ' + run.nodes + '. No permanent loss — the summon-deck and Vaelk reset. Regroup and hunt again.' }));
    }
    const row = U.el('div', { cls: 'flex mt', style: 'justify-content:center;gap:10px' });
    if (cleared && run.reward && run.reward.speciesId) {
      row.appendChild(U.el('button', { cls: 'btn primary', text: 'To the workbench', onclick: () => { E.end(); UI.show('crafting'); } }));
    }
    row.appendChild(U.el('button', { cls: 'btn' + (cleared ? ' ghost' : ' primary'), text: 'New hunt', onclick: () => { E.end(); resetWiz(); UI.show('huntRun'); } }));
    row.appendChild(U.el('button', { cls: 'btn ghost', text: 'To the menu', onclick: () => { E.end(); UI.show('menu'); } }));
    wrap.appendChild(row);
    body.appendChild(wrap);
    DYA.audio.play(cleared ? 'victory' : 'defeat');
  }
})();
