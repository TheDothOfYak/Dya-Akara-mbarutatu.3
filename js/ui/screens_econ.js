/* ============================================================
   DYA'AKARA — ui/screens_econ.js
   Collection (+ pouch builder sidebar + token detail),
   Crafting (ritual overlay), Market (browse/stalls/requests,
   offer negotiation), My Stall, Player Stall.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, UI = DYA.ui, SP = DYA.species, SPR = DYA.sprites, TK = DYA.token, EC = DYA.economy, L = DYA.lore;

  /* ================= COLLECTION ================= */
  const collState = { filter: 'All', view: 'card', search: '', tab: 'Tokens', pouch: null, sidebarOpen: true };

  UI.register('collection', {
    enter(root, params) {
      const me = G.me;
      if (params.pouch) collState.pouch = params.pouch;
      if (!collState.pouch) collState.pouch = { id: U.uid('pch'), name: 'New Pouch', tokenIds: [] };
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Collection' }));
      /* Tanoc's relic tower atmosphere = radial glow backdrop */
      const wrap = U.el('div', { cls: 'coll-wrap' });

      /* ---- pouch builder sidebar (collapsible, visible by default) ---- */
      const sidebar = U.el('div', { cls: 'pouch-sidebar' + (collState.sidebarOpen ? '' : ' collapsed') });
      const psHead = U.el('div', { cls: 'ps-head' });
      const nameInp = U.el('input', { cls: 'txt', value: collState.pouch.name, placeholder: 'Pouch name' });
      nameInp.oninput = () => { collState.pouch.name = nameInp.value; };
      psHead.appendChild(U.el('div', { cls: 'muted small mb', text: 'POUCH BUILDER' }));
      psHead.appendChild(nameInp);
      sidebar.appendChild(psHead);
      const psList = U.el('div', { cls: 'ps-list' });
      sidebar.appendChild(psList);
      const psFoot = U.el('div', { cls: 'ps-foot' });
      const count = U.el('div', { cls: 'small gold', text: '0/' + EC.POUCH_SIZE });
      psFoot.appendChild(count);
      psFoot.appendChild(U.el('div', { cls: 'spacer' }));
      psFoot.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Clear', onclick: () => { collState.pouch.tokenIds = []; renderPouch(); } }));
      psFoot.appendChild(U.el('button', {
        cls: 'btn small', text: 'Save', onclick: () => {
          if (!collState.pouch.tokenIds.length) { UI.alert('Empty pouch', 'Add at least one token first.'); return; }
          G.savePouch(U.deepCopy(collState.pouch));
          UI.toast({ title: 'Pouch saved', body: collState.pouch.name, icon: '👝' });
        },
      }));
      sidebar.appendChild(psFoot);
      /* collapse handle */
      const handle = U.el('div', { style: 'position:absolute;right:-1px;top:50%;transform:translateY(-50%);background:var(--panel);border:1px solid var(--line);border-radius:0 6px 6px 0;padding:14px 3px;cursor:pointer;z-index:3', text: collState.sidebarOpen ? '‹' : '›' });
      sidebar.style.position = 'relative';
      handle.onclick = () => { collState.sidebarOpen = !collState.sidebarOpen; sidebar.classList.toggle('collapsed', !collState.sidebarOpen); handle.textContent = collState.sidebarOpen ? '‹' : '›'; };
      sidebar.appendChild(handle);
      wrap.appendChild(sidebar);

      function renderPouch() {
        psList.innerHTML = '';
        collState.pouch.tokenIds = collState.pouch.tokenIds.filter(id => me.tokens[id]);
        collState.pouch.tokenIds.forEach(id => {
          const tok = me.tokens[id];
          const row = U.el('div', { cls: 'mini-tok' });
          row.appendChild(UI.tokenArt(tok.speciesId, 30));
          row.appendChild(U.el('div', { cls: 'flex1', html: U.esc(tok.name) + '<br><span class="small muted r' + tok.rarity + '">' + SP.RARITIES[tok.rarity] + '</span>' }));
          row.appendChild(U.el('div', { cls: 'mt-x', text: '✕', onclick: () => { collState.pouch.tokenIds = collState.pouch.tokenIds.filter(x => x !== id); renderPouch(); } }));
          psList.appendChild(row);
        });
        count.textContent = collState.pouch.tokenIds.length + '/' + EC.POUCH_SIZE;
      }
      /* drag & drop into sidebar */
      sidebar.addEventListener('dragover', e => e.preventDefault());
      sidebar.addEventListener('drop', e => {
        e.preventDefault();
        const id = e.dataTransfer.getData('tokId');
        if (id) addToPouch(id);
      });
      function addToPouch(id) {
        if (collState.pouch.tokenIds.includes(id)) { UI.toast({ title: 'Already in pouch', icon: '👝' }); return; }
        if (collState.pouch.tokenIds.length >= EC.POUCH_SIZE) { UI.alert('Pouch full', 'A standard pouch holds ' + EC.POUCH_SIZE + ' tokens.'); return; }
        collState.pouch.tokenIds.push(id);
        DYA.audio.play('click');
        renderPouch();
      }

      /* ---- main ---- */
      const main = U.el('div', { cls: 'coll-main' });
      const bar = U.el('div', { cls: 'coll-toolbar' });
      bar.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      const search = U.el('input', { cls: 'txt', style: 'max-width:220px', placeholder: '🔎 Search…', value: collState.search });
      search.oninput = () => { collState.search = search.value; renderGrid(); };
      bar.appendChild(search);
      ['All', 'Su', 'Eldi', 'Fti', 'Ular'].forEach(f => {
        const chip = U.el('button', { cls: 'filter-chip' + (collState.filter === f ? ' active' : ''), text: f });
        chip.onclick = () => { collState.filter = f; U.qsa('.filter-chip', bar).forEach(c => c.classList.remove('active')); chip.classList.add('active'); renderGrid(); };
        bar.appendChild(chip);
      });
      bar.appendChild(U.el('div', { cls: 'spacer' }));
      [['minimal', '▪'], ['card', '▦'], ['full', '☰']].forEach(([v, icon]) => {
        const b = U.el('button', { cls: 'filter-chip' + (collState.view === v ? ' active' : ''), text: icon, title: v + ' view' });
        b.onclick = () => { collState.view = v; renderGrid(); UI.show('collection'); };
        bar.appendChild(b);
      });
      ['Tokens', 'Pouches'].forEach(t => {
        const b = U.el('button', { cls: 'filter-chip' + (collState.tab === t ? ' active' : ''), text: t });
        b.onclick = () => { collState.tab = t; UI.show('collection'); };
        bar.appendChild(b);
      });
      main.appendChild(bar);
      const gridWrap = U.el('div', { cls: 'coll-grid' });
      main.appendChild(gridWrap);
      wrap.appendChild(main);
      scr.appendChild(wrap);
      root.appendChild(scr);

      function renderGrid() {
        gridWrap.innerHTML = '';
        if (collState.tab === 'Pouches') { renderPouches(); return; }
        let toks = Object.values(me.tokens);
        if (collState.filter !== 'All') toks = toks.filter(t => t.element === collState.filter);
        if (collState.search) {
          const q = collState.search.toLowerCase();
          toks = toks.filter(t => t.name.toLowerCase().includes(q) || SP.get(t.speciesId).name.toLowerCase().includes(q));
        }
        toks.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
        if (!toks.length) { gridWrap.appendChild(U.el('p', { cls: 'muted center mt', text: 'No tokens match. Hunt, craft, or trade for more.' })); return; }
        const grid = U.el('div', { cls: 'grid cols-auto' });
        if (collState.view === 'full') grid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(180px,1fr))';
        toks.forEach(tok => {
          const card = UI.tokenCard(tok, {
            mode: collState.view, size: collState.view === 'minimal' ? 70 : 92,
            onclick: () => openDetail(tok),
          });
          card.draggable = true;
          card.addEventListener('dragstart', e => e.dataTransfer.setData('tokId', tok.id));
          /* + add button on hover */
          const addBtn = U.el('button', { cls: 'btn small', style: 'position:absolute;bottom:6px;right:6px;display:none;padding:1px 9px', text: '+' });
          addBtn.onclick = (e) => { e.stopPropagation(); addToPouch(tok.id); };
          card.appendChild(addBtn);
          card.onmouseenter = () => addBtn.style.display = 'block';
          card.onmouseleave = () => addBtn.style.display = 'none';
          grid.appendChild(card);
        });
        gridWrap.appendChild(grid);
      }

      function renderPouches() {
        const grid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(240px,1fr))' });
        const newCard = U.el('div', { cls: 'tok-card', style: 'padding:22px' }, [
          U.el('div', { style: 'font-size:34px', text: '＋' }),
          U.el('div', { cls: 'tc-name', text: 'New pouch' }),
        ]);
        newCard.onclick = () => { collState.pouch = { id: U.uid('pch'), name: 'New Pouch', tokenIds: [] }; collState.tab = 'Tokens'; UI.show('collection'); };
        grid.appendChild(newCard);
        me.pouches.forEach(p => {
          const card = U.el('div', { cls: 'tok-card', style: 'padding:16px;text-align:left' });
          card.appendChild(U.el('div', { cls: 'gold', text: p.name }));
          card.appendChild(U.el('div', { cls: 'small muted', text: p.tokenIds.filter(id => me.tokens[id]).length + ' tokens' }));
          const row = U.el('div', { cls: 'flex mt' });
          row.appendChild(U.el('button', { cls: 'btn small', text: 'Edit', onclick: (e) => { e.stopPropagation(); collState.pouch = U.deepCopy(p); collState.tab = 'Tokens'; UI.show('collection'); } }));
          row.appendChild(U.el('button', { cls: 'btn small danger', text: 'Delete', onclick: (e) => { e.stopPropagation(); G.deletePouch(p.id); UI.show('collection'); } }));
          card.appendChild(row);
          grid.appendChild(card);
        });
        gridWrap.appendChild(grid);
      }

      function openDetail(tok) {
        const scr2 = U.el('div', { cls: 'screen', style: 'z-index:10;background:var(--bg)' });
        const actions = [];
        actions.push(U.el('button', { cls: 'btn primary', text: '⚔ Duel vs AI', onclick: () => DYA.play.startDuelVsAI(tok) }));
        actions.push(U.el('button', { cls: 'btn', text: '👝 Add to pouch', onclick: () => { addToPouch(tok.id); } }));
        if (!tok.isRental) {
          actions.push(U.el('button', {
            cls: 'btn', text: '🎁 Gift to friend', onclick: () => {
              if (!G.me.friends.length) { UI.alert('No friends yet', 'Add a friend first — gifts need a recipient.'); return; }
              const w = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'Gift ' + tok.name })]);
              const sel = U.el('select', { cls: 'txt mt' });
              G.me.friends.forEach(fid => { const f = G.world.accounts[fid]; if (f) sel.appendChild(U.el('option', { value: fid, text: f.displayName })); });
              w.appendChild(sel);
              const m = UI.modal(w);
              w.appendChild(U.el('button', {
                cls: 'btn primary mt', text: 'Send gift (no fee)', onclick: () => {
                  G.giftToken(tok, sel.value); m.close(); scr2.remove(); UI.show('collection');
                  UI.toast({ title: 'Gift sent', body: tok.name + ' has a new home.', icon: '🎁' });
                },
              }));
            },
          }));
          actions.push(U.el('button', {
            cls: 'btn danger', text: '⚖ Report token', onclick: () => {
              UI.confirm('Report this token?', 'Reports go to the Dya Guild. The token functions normally until an admin opens the review.', () => {
                G.reportToken(tok.id, tok.ownerId, 'player report');
                UI.toast({ title: 'Report filed', body: 'The Guild will review it.', icon: '⚖' });
              }, 'File report');
            },
          }));
        }
        scr2.appendChild(UI.tokenDetail(tok, { onBack: () => scr2.remove(), actions }));
        root.appendChild(scr2);
      }

      renderPouch();
      renderGrid();
      this._renderGrid = renderGrid;
    },
  });

  /* ================= CRAFTING ================= */
  UI.register('crafting', {
    enter(root) {
      const me = G.me;
      let selected = me.pieces[0] || null;
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Crafting' }));
      const wrap = U.el('div', { cls: 'craft-wrap' });

      /* left: creature pieces */
      const left = U.el('div', { cls: 'craft-col craft-left' });
      left.appendChild(U.el('div', { cls: 'flex mb' }, [
        U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }),
        U.el('h3', { cls: 'gold', text: 'Creature Pieces' }),
      ]));
      const pieceList = U.el('div', {});
      left.appendChild(pieceList);
      wrap.appendChild(left);

      /* center: ritual area */
      const center = U.el('div', { cls: 'craft-center' });
      wrap.appendChild(center);

      /* right: materials + recent */
      const right = U.el('div', { cls: 'craft-col craft-right' });
      wrap.appendChild(right);
      scr.appendChild(wrap);
      root.appendChild(scr);

      function renderPieces() {
        pieceList.innerHTML = '';
        if (!me.pieces.length) {
          pieceList.appendChild(U.el('p', { cls: 'muted small', text: 'No creature pieces. Complete Hunts in Adventures to earn them — a tooth, a scale, a shaving. Then sing them true here.' }));
        }
        me.pieces.forEach(p => {
          const sp = SP.get(p.speciesId);
          const rarity = p.rarity != null ? p.rarity : sp.rarity[0];
          const can = G.canCraft(rarity);
          const row = U.el('div', { cls: 'piece-row' + (selected === p ? ' selected' : '') });
          row.appendChild(UI.tokenArt(p.speciesId, 46));
          row.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + sp.name + '</b> ' + (p.material || 'piece') + '<br><span class="small ' + (can ? 'gold' : 'muted') + '">' + (can ? '✓ Ready to craft' : '✗ Need more materials') + '</span>' }));
          row.onclick = () => { selected = p; renderPieces(); renderCenter(); };
          pieceList.appendChild(row);
        });
      }

      function renderCenter() {
        center.innerHTML = '';
        if (!selected) {
          center.appendChild(U.el('div', { cls: 'muted center', html: 'The workbench is quiet.<br><span class="small">Select a creature piece — or go hunting for one.</span>' }));
          return;
        }
        const sp = SP.get(selected.speciesId);
        const rarity = selected.rarity != null ? selected.rarity : sp.rarity[0];
        const cost = EC.CRAFT_COST[rarity];
        /* floating orb with creature, rune ring, fluid drip */
        const orb = U.el('div', { cls: 'ritual-orb' });
        const cv = U.el('canvas', { width: 300, height: 300 });
        orb.appendChild(cv);
        center.appendChild(orb);
        let raf, t0 = performance.now();
        (function anim(now) {
          if (!cv.isConnected) { cancelAnimationFrame(raf); return; }
          const t = (now - t0) / 1000;
          const ctx = cv.getContext('2d');
          ctx.clearRect(0, 0, 300, 300);
          /* rune ring */
          ctx.save(); ctx.translate(150, 150);
          for (let i = 0; i < 10; i++) {
            const a = t * 0.3 + i * Math.PI / 5;
            ctx.save();
            ctx.translate(Math.cos(a) * 120, Math.sin(a) * 120);
            ctx.rotate(a + Math.PI / 2);
            ctx.strokeStyle = '#d9b87a' + (Math.sin(t * 2 + i) > 0 ? '88' : '44');
            ctx.lineWidth = 2;
            ctx.strokeRect(-5, -8, 10, 16);
            ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, i % 2 ? -4 : 4); ctx.stroke();
            ctx.restore();
          }
          /* orb */
          const og = ctx.createRadialGradient(0, 0, 10, 0, 0, 95);
          og.addColorStop(0, '#68e0e822'); og.addColorStop(0.8, '#68e0e811'); og.addColorStop(1, '#68e0e800');
          ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, 0, 95, 0, 6.29); ctx.fill();
          ctx.strokeStyle = '#68e0e844'; ctx.beginPath(); ctx.arc(0, 0, 88 + Math.sin(t * 2) * 4, 0, 6.29); ctx.stroke();
          /* creature */
          SPR.draw(ctx, { sp, r: 52, state: 'idle', t, facing: 1, alpha: 0.92, shimmer: true, biolum: true });
          /* NgAkara fluid drip */
          const dripY = ((t * 60) % 130);
          ctx.fillStyle = '#68e0e8';
          ctx.beginPath(); ctx.ellipse(0, -140 + dripY, 3, 6 + dripY * 0.04, 0, 0, 6.29); ctx.fill();
          ctx.restore();
          raf = requestAnimationFrame(anim);
        })(t0);

        const info = U.el('div', { cls: 'center', style: 'max-width:380px' });
        info.appendChild(U.el('h2', { cls: 'gold', text: sp.name }));
        info.appendChild(U.el('div', { cls: 'muted small', text: 'From a ' + (selected.material || 'piece') + (selected.from ? ' — ' + selected.from : '') }));
        info.appendChild(U.el('div', { cls: 'mt', html: '<span class="type-badge r' + rarity + '" style="border-color:currentColor">' + SP.RARITIES[rarity] + '</span>' }));
        info.appendChild(U.el('div', { cls: 'mt small', html: 'Cost: <b class="gold">' + cost.okid + '</b> Okid (' + SP.RARITIES[rarity] + '+) · <b class="gold">' + cost.ngakara + '</b> NgAkara' }));
        const can = G.canCraft(rarity);
        const craftBtn = U.el('button', { cls: 'btn primary mt', text: '⚗ Craft Token', disabled: can ? undefined : 'true' });
        if (!can) info.appendChild(U.el('div', { cls: 'small mt', style: 'color:var(--red)', text: 'Not enough materials.' }));
        craftBtn.onclick = () => runRitual(selected, rarity);
        info.appendChild(U.el('div', {}, [craftBtn]));
        center.appendChild(info);
      }

      function renderRight() {
        right.innerHTML = '';
        right.appendChild(U.el('h3', { cls: 'gold mb', text: 'Materials' }));
        const okidRows = U.el('div', {});
        me.okid.forEach((n, i) => {
          if (n > 0) okidRows.appendChild(U.el('div', { cls: 'small', html: '<span class="rarity-dot br' + i + '"></span>' + SP.RARITIES[i] + ' Okid: <b>' + n + '</b>' }));
        });
        if (!me.okid.some(n => n > 0)) okidRows.appendChild(U.el('div', { cls: 'small muted', text: 'No Okid. Level chests and the market carry them.' }));
        right.appendChild(okidRows);
        right.appendChild(U.el('div', { cls: 'small mt', html: '🧪 NgAkara: <b>' + me.ngakara + '</b>' }));
        right.appendChild(U.el('div', { cls: 'divider' }));
        right.appendChild(U.el('h3', { cls: 'gold mb', text: 'Recently Crafted' }));
        const recent = Object.values(me.tokens).filter(t => t.crafterId === me.id).sort((a, b) => b.craftedAt - a.craftedAt).slice(0, 6);
        if (!recent.length) right.appendChild(U.el('p', { cls: 'muted small', text: 'Nothing yet.' }));
        recent.forEach(t => {
          const row = U.el('div', { cls: 'mini-tok' });
          row.appendChild(UI.tokenArt(t.speciesId, 30));
          row.appendChild(U.el('div', { html: U.esc(t.name) + '<br><span class="small muted">' + U.timeAgo(t.craftedAt) + '</span>' }));
          right.appendChild(row);
        });
      }

      /* the ritual: song plays, fluid pours, runes animate — skippable */
      function runRitual(piece, rarity) {
        const sp = SP.get(piece.speciesId);
        const overlay = U.el('div', { cls: 'ritual-overlay' });
        const cv = U.el('canvas', { width: 460, height: 460 });
        overlay.appendChild(cv);
        const status = U.el('div', { cls: 'gold mt', style: 'letter-spacing:.2em', text: 'SINGING THE CREATURE’S SONG…' });
        overlay.appendChild(status);
        const skip = U.el('button', { cls: 'btn ghost mt', text: 'Skip ritual ›' });
        overlay.appendChild(skip);
        document.body.appendChild(overlay);
        DYA.audio.play('craft');
        let done = false, raf;
        const t0 = performance.now();
        const phases = ['SINGING THE CREATURE’S SONG…', 'POURING THE NGAKARA INTO THE VEINS…', 'SETTING THE TRIGGER…', 'THE TRUTH TAKES HOLD.'];
        function finish() {
          if (done) return; done = true;
          cancelAnimationFrame(raf);
          const r = G.craftToken(piece, piece.temperBias || 0);
          overlay.remove();
          if (r.err) { UI.alert('Craft failed', r.err); return; }
          /* result screen */
          const res = U.el('div', { cls: 'ritual-overlay' });
          res.appendChild(U.el('h2', { style: 'color:var(--gold);letter-spacing:.2em', text: '✦ TOKEN CRAFTED ✦' }));
          const w = U.el('div', { cls: 'mt', style: 'width:220px' });
          w.appendChild(UI.tokenCard(r.tok, { size: 150 }));
          res.appendChild(w);
          res.appendChild(U.el('p', { cls: 'muted mt', text: '"' + r.tok.name + '" joins your collection.' }));
          res.appendChild(U.el('button', { cls: 'btn primary mt', text: 'Take it', onclick: () => { res.remove(); UI.show('crafting'); } }));
          document.body.appendChild(res);
          DYA.audio.play('levelup');
        }
        skip.onclick = finish;
        (function anim(now) {
          if (done) return;
          const t = (now - t0) / 1000;
          const ctx = cv.getContext('2d');
          ctx.clearRect(0, 0, 460, 460);
          ctx.save(); ctx.translate(230, 230);
          const phase = Math.min(3, Math.floor(t / 1.8));
          status.textContent = phases[phase];
          /* accelerating rune ring */
          for (let i = 0; i < 14; i++) {
            const a = t * (0.4 + phase * 0.35) + i * Math.PI / 7;
            ctx.save(); ctx.translate(Math.cos(a) * (160 - phase * 12), Math.sin(a) * (160 - phase * 12)); ctx.rotate(a + Math.PI / 2);
            ctx.strokeStyle = 'rgba(217,184,122,' + (0.3 + 0.4 * Math.abs(Math.sin(t * 3 + i))) + ')';
            ctx.lineWidth = 2;
            ctx.strokeRect(-5, -9, 10, 18);
            ctx.restore();
          }
          /* song waves */
          ctx.strokeStyle = '#d9b87a55'; ctx.lineWidth = 1.5;
          for (let w2 = 0; w2 < 3; w2++) {
            ctx.beginPath();
            for (let x = -200; x <= 200; x += 6) {
              const y = Math.sin(x * 0.05 + t * (3 + w2)) * (12 - w2 * 3) - 190;
              x === -200 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          /* fluid pour (phase >= 1) */
          if (phase >= 1) {
            ctx.fillStyle = '#68e0e8';
            for (let i = 0; i < 5; i++) {
              const dy = ((t * 120 + i * 40) % 190);
              ctx.globalAlpha = 0.7;
              ctx.beginPath(); ctx.ellipse(Math.sin(i) * 4, -180 + dy, 3, 7, 0, 0, 6.29); ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
          /* creature materializing */
          ctx.globalAlpha = Math.min(1, 0.25 + phase * 0.25);
          SPR.draw(ctx, { sp, r: 62, state: phase >= 3 ? 'special' : 'idle', t, facing: 1, alpha: 1, shimmer: true, biolum: phase >= 2 });
          ctx.restore();
          if (t > 7.6) { finish(); return; }
          raf = requestAnimationFrame(anim);
        })(t0);
      }

      renderPieces(); renderCenter(); renderRight();
    },
  });

  /* ================= MARKET ================= */
  const mktState = { tab: 'Browse', filter: 'All', search: '', view: 'grid', sort: 'newest' };

  UI.register('market', {
    enter(root) {
      const me = G.me;
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Market' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      head.appendChild(U.el('h2', { text: 'Market' }));
      const tabs = U.el('div', { cls: 'tabs' });
      ['Browse', 'Stalls', 'Requests', 'My Offers'].forEach(t => {
        const tab = U.el('div', { cls: 'tab' + (mktState.tab === t ? ' active' : ''), text: t });
        tab.onclick = () => { mktState.tab = t; UI.show('market'); };
        tabs.appendChild(tab);
      });
      head.appendChild(U.el('div', { cls: 'spacer' }));
      head.appendChild(tabs);
      head.appendChild(U.el('button', { cls: 'btn small', text: '🏪 My Stall', onclick: () => UI.show('myStall') }));
      head.appendChild(U.el('button', { cls: 'btn small ghost', text: '🏛 Guild', onclick: () => UI.show('guild') }));
      page.appendChild(head);
      const body = U.el('div', { cls: 'market-wrap' });
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);
      UI.onMarketUpdate = () => { if (UI.currentName === 'market') UI.show('market'); };

      if (mktState.tab === 'Browse') renderBrowse(body);
      else if (mktState.tab === 'Stalls') renderStalls(body);
      else if (mktState.tab === 'Requests') renderRequests(body);
      else renderMyOffers(body);

      function renderBrowse(body) {
        const main = U.el('div', { cls: 'market-main' });
        const bar = U.el('div', { cls: 'coll-toolbar' });
        const search = U.el('input', { cls: 'txt', style: 'max-width:220px', placeholder: '🔎 Search listings…', value: mktState.search });
        search.oninput = () => { mktState.search = search.value; grid(); };
        bar.appendChild(search);
        ['All', 'Su', 'Eldi', 'Fti', 'Ular'].forEach(f => {
          const chip = U.el('button', { cls: 'filter-chip' + (mktState.filter === f ? ' active' : ''), text: f });
          chip.onclick = () => { mktState.filter = f; U.qsa('.filter-chip', bar).forEach(c => c.classList.remove('active')); chip.classList.add('active'); grid(); };
          bar.appendChild(chip);
        });
        const sortSel = U.el('select', { cls: 'txt', style: 'max-width:150px' });
        [['newest', 'Newest'], ['cheap', 'Price ↑'], ['pricey', 'Price ↓'], ['rare', 'Rarity']].forEach(([v, l]) => sortSel.appendChild(U.el('option', { value: v, text: l })));
        sortSel.value = mktState.sort;
        sortSel.onchange = () => { mktState.sort = sortSel.value; grid(); };
        bar.appendChild(sortSel);
        bar.appendChild(U.el('div', { cls: 'spacer' }));
        [['grid', '▦'], ['list', '☰']].forEach(([v, icon]) => {
          const b = U.el('button', { cls: 'filter-chip' + (mktState.view === v ? ' active' : ''), text: icon });
          b.onclick = () => { mktState.view = v; UI.show('market'); };
          bar.appendChild(b);
        });
        main.appendChild(bar);
        const gwrap = U.el('div', { cls: 'market-grid' });
        main.appendChild(gwrap);
        body.appendChild(main);

        /* right stall panel: notify-me + featured sellers */
        const panel = U.el('div', { cls: 'stall-panel' });
        panel.appendChild(U.el('h3', { cls: 'gold mb', text: 'Notify Me' }));
        panel.appendChild(U.el('p', { cls: 'small muted', text: 'Get an alert when a species you want is listed.' }));
        const nmSel = U.el('select', { cls: 'txt mt' });
        SP.craftable.forEach(id => nmSel.appendChild(U.el('option', { value: id, text: SP.get(id).name })));
        panel.appendChild(nmSel);
        panel.appendChild(U.el('button', {
          cls: 'btn small mt', text: '🔔 Toggle alert', onclick: () => {
            const on = G.toggleNotifyMe(nmSel.value);
            UI.toast({ title: on ? 'Alert set' : 'Alert removed', body: SP.get(nmSel.value).name, icon: '🔔' });
          },
        }));
        const mine = Object.entries(G.world.market.notifyMe).filter(([k, v]) => v.includes(me.id));
        if (mine.length) {
          panel.appendChild(U.el('div', { cls: 'small muted mt', text: 'Active alerts:' }));
          mine.forEach(([k]) => panel.appendChild(U.el('div', { cls: 'pill', style: 'margin:3px', text: SP.get(k).name })));
        }
        panel.appendChild(U.el('div', { cls: 'divider' }));
        panel.appendChild(U.el('h3', { cls: 'gold mb', text: 'Busy Stalls' }));
        const sellers = {};
        Object.values(G.world.market.listings).forEach(l => { sellers[l.sellerId] = (sellers[l.sellerId] || 0) + 1; });
        Object.entries(sellers).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([sid, n]) => {
          const acc = G.world.accounts[sid]; if (!acc) return;
          const row = U.el('div', { cls: 'friend-row', style: 'cursor:pointer' });
          row.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + U.esc(acc.stall.name || acc.displayName) + '</b><br><span class="small muted">' + n + ' listings' + (acc.trustedSeller ? ' · ✓ trusted' : '') + '</span>' }));
          row.onclick = () => UI.show('playerStall', { seller: acc });
          panel.appendChild(row);
        });
        body.appendChild(panel);

        function grid() {
          gwrap.innerHTML = '';
          let lsts = Object.values(G.world.market.listings).filter(l => {
            const seller = G.world.accounts[l.sellerId];
            if (!seller || seller.id === me.id) return false;
            if (me.blocked.includes(seller.id) || seller.blocked.includes(me.id)) return false;
            const tok = seller.tokens[l.tokenId];
            if (!tok) return false;
            if (mktState.filter !== 'All' && tok.element !== mktState.filter) return false;
            if (mktState.search) {
              const q = mktState.search.toLowerCase();
              if (!tok.name.toLowerCase().includes(q) && !SP.get(tok.speciesId).name.toLowerCase().includes(q)) return false;
            }
            return true;
          });
          lsts.sort((a, b) => {
            const ta = G.world.accounts[a.sellerId].tokens[a.tokenId], tb = G.world.accounts[b.sellerId].tokens[b.tokenId];
            if (mktState.sort === 'cheap') return a.price - b.price;
            if (mktState.sort === 'pricey') return b.price - a.price;
            if (mktState.sort === 'rare') return tb.rarity - ta.rarity;
            return b.at - a.at;
          });
          if (!lsts.length) { gwrap.appendChild(U.el('p', { cls: 'muted center', text: 'The stalls are bare. Check back — the Dya\'kukull are always trading.' })); return; }
          const grd = U.el('div', { cls: mktState.view === 'grid' ? 'grid cols-auto' : 'grid cols-list' });
          if (mktState.view === 'grid') grd.style.gridTemplateColumns = 'repeat(auto-fill,minmax(150px,1fr))';
          lsts.slice(0, 60).forEach(l => {
            const seller = G.world.accounts[l.sellerId];
            const tok = seller.tokens[l.tokenId];
            const card = UI.tokenCard(tok, { size: mktState.view === 'grid' ? 92 : 60, onclick: () => openListing(l) });
            card.classList.add('listing-card');
            card.appendChild(U.el('div', { cls: 'lc-price', text: l.status === 'display' ? '—' : U.fmt(l.price) + 'g' }));
            card.appendChild(U.el('div', {}, [U.el('span', { cls: 'status-badge ' + l.status, text: l.status === 'sale' ? 'FOR SALE' : l.status === 'offer' ? 'MAKE OFFER' : 'DISPLAY' })]));
            card.appendChild(U.el('div', { cls: 'small muted', style: 'cursor:pointer;text-decoration:underline dotted', text: seller.stall.name || seller.displayName, onclick: (e) => { e.stopPropagation(); UI.show('playerStall', { seller }); } }));
            grd.appendChild(card);
          });
          gwrap.appendChild(grd);
        }
        grid();
      }

      function openListing(l) {
        const seller = G.world.accounts[l.sellerId];
        const tok = seller.tokens[l.tokenId];
        if (!tok) { UI.alert('Gone', 'That listing has already sold.'); UI.show('market'); return; }
        const scr2 = U.el('div', { cls: 'screen', style: 'z-index:10;background:var(--bg)' });
        const actions = [];
        /* market price NOT shown to buyers — design rule */
        if (l.status !== 'display') {
          actions.push(U.el('button', {
            cls: 'btn primary', text: 'Buy now — ' + U.fmt(l.price) + 'g', onclick: () => {
              if (me.gold < l.price) { UI.alert('Not enough gold', 'You hold ' + U.fmt(me.gold) + 'g.'); return; }
              const r = G.buyListing(l.id);
              if (r.err) { UI.alert('Cannot buy', r.err); return; }
              DYA.audio.play('coin');
              scr2.remove();
              UI.toast({ title: 'Purchase complete', body: tok.name + ' is yours.', icon: '🛒' });
              UI.refreshTopbar();
              if (DYA.tutorial) DYA.tutorial.onEvent('marketBuy');
            },
          }));
        }
        actions.push(U.el('button', {
          cls: 'btn', text: '📩 Make offer', onclick: () => {
            const w = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'Offer on ' + tok.name })]);
            const amt = U.el('input', { cls: 'txt mt', type: 'number', placeholder: 'Gold amount', value: Math.round(l.price * 0.8) || 100 });
            const note = U.el('input', { cls: 'txt mt', placeholder: 'Say something (optional)' });
            w.appendChild(amt); w.appendChild(note);
            const m = UI.modal(w);
            w.appendChild(U.el('button', {
              cls: 'btn primary mt', text: 'Send offer', onclick: () => {
                const r = G.makeOffer(l.id, parseInt(amt.value) || 0, note.value);
                if (r.err) { UI.alert('Cannot offer', r.err); return; }
                m.close();
                UI.toast({ title: 'Offer sent', body: 'Watch My Offers for the reply.', icon: '📩' });
              },
            }));
          },
        }));
        actions.push(U.el('button', { cls: 'btn ghost', text: '🏪 Visit stall', onclick: () => { scr2.remove(); UI.show('playerStall', { seller }); } }));
        scr2.appendChild(UI.tokenDetail(tok, { onBack: () => scr2.remove(), actions }));
        root.appendChild(scr2);
      }

      function renderStalls(body) {
        const main = U.el('div', { cls: 'market-main' });
        const gwrap = U.el('div', { cls: 'market-grid' });
        const grd = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(260px,1fr))' });
        const sellers = Object.values(G.world.accounts).filter(a =>
          a.id !== me.id && Object.values(G.world.market.listings).some(l => l.sellerId === a.id));
        sellers.sort((a, b) => b.stats.sales - a.stats.sales);
        sellers.forEach(acc => {
          const n = Object.values(G.world.market.listings).filter(l => l.sellerId === acc.id).length;
          const card = U.el('div', { cls: 'tok-card', style: 'text-align:left;padding:14px;border-left:4px solid ' + (acc.stall.banner || '#6d4a2e') });
          card.appendChild(U.el('div', { cls: 'gold', text: acc.stall.name || acc.displayName + '’s Stall' }));
          card.appendChild(U.el('div', { cls: 'small muted', text: 'by ' + acc.displayName + ' · ' + EC.REGIONS.find(r => r.id === acc.region).name }));
          card.appendChild(U.el('div', { cls: 'small mt', text: '"' + (acc.stall.bio || '…') + '"' }));
          card.appendChild(U.el('div', { cls: 'small muted mt', text: n + ' listings · ' + acc.stats.sales + ' lifetime sales' + (acc.trustedSeller ? ' · ✓ TRUSTED' : '') }));
          card.onclick = () => UI.show('playerStall', { seller: acc });
          grd.appendChild(card);
        });
        gwrap.appendChild(grd);
        main.appendChild(gwrap);
        body.appendChild(main);
      }

      function renderRequests(body) {
        const main = U.el('div', { cls: 'market-main' });
        const gwrap = U.el('div', { cls: 'market-grid' });
        const bar = U.el('div', { cls: 'flex mb' });
        const sel = U.el('select', { cls: 'txt', style: 'max-width:220px' });
        SP.craftable.forEach(id => sel.appendChild(U.el('option', { value: id, text: SP.get(id).name })));
        const note = U.el('input', { cls: 'txt', placeholder: 'What are you looking for?' });
        const budget = U.el('input', { cls: 'txt', type: 'number', style: 'max-width:130px', placeholder: 'Budget (g)' });
        bar.appendChild(sel); bar.appendChild(note); bar.appendChild(budget);
        bar.appendChild(U.el('button', {
          cls: 'btn', text: 'Post request', onclick: () => {
            G.postRequest(sel.value, note.value, parseInt(budget.value) || 0);
            UI.show('market');
          },
        }));
        gwrap.appendChild(bar);
        if (!G.world.market.requests.length) gwrap.appendChild(U.el('p', { cls: 'muted', text: 'No open requests. Want something? Say so.' }));
        G.world.market.requests.forEach(r => {
          const row = U.el('div', { cls: 'friend-row' });
          row.appendChild(UI.tokenArt(r.speciesId, 44));
          row.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + SP.get(r.speciesId).name + '</b> wanted by ' + U.esc(r.byName) + (r.budget ? ' — up to <b class="gold">' + U.fmt(r.budget) + 'g</b>' : '') + '<br><span class="small muted">' + U.esc(r.note || '') + ' · ' + U.timeAgo(r.at) + '</span>' }));
          row.appendChild(U.el('button', { cls: 'btn small ghost', text: 'I have one — list it', onclick: () => UI.show('myStall') }));
          gwrap.appendChild(row);
        });
        main.appendChild(gwrap);
        body.appendChild(main);
      }

      function renderMyOffers(body) {
        const main = U.el('div', { cls: 'market-main' });
        const gwrap = U.el('div', { cls: 'market-grid' });
        const offers = Object.values(G.world.market.offers).filter(o => o.buyerId === me.id || o.sellerId === me.id);
        if (!offers.length) gwrap.appendChild(U.el('p', { cls: 'muted', text: 'No offers in play. Haggling is half the game.' }));
        offers.sort((a, b) => b.at - a.at).forEach(o => gwrap.appendChild(offerThread(o)));
        main.appendChild(gwrap);
        body.appendChild(main);
      }
    },
  });

  /* offer negotiation thread — gold border selling, blue buying */
  function offerThread(o) {
    const me = G.me;
    const selling = o.sellerId === me.id;
    const other = G.world.accounts[selling ? o.buyerId : o.sellerId];
    const lst = G.world.market.listings[o.listingId];
    const tok = lst ? (G.world.accounts[o.sellerId].tokens[lst.tokenId]) : null;
    const th = U.el('div', { cls: 'offer-thread ' + (selling ? 'selling' : 'buying') });
    const head = U.el('div', { cls: 'offer-head' });
    if (tok) head.appendChild(UI.tokenArt(tok.speciesId, 36));
    head.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + (tok ? U.esc(tok.name) : 'Token gone') + '</b> — ' + (selling ? 'selling to' : 'buying from') + ' ' + U.esc(other ? other.displayName : '?') + '<br><span class="small muted">Listed at ' + (lst ? U.fmt(lst.price) + 'g' : '—') + ' · ' + o.state + '</span>' }));
    th.appendChild(head);
    const msgs = U.el('div', { cls: 'offer-msgs' });
    o.history.forEach(h => {
      const mine = (h.by === 'buyer') === (o.buyerId === me.id);
      msgs.appendChild(U.el('div', { cls: 'offer-msg' + (mine ? ' mine' : '') }, [
        U.el('div', { cls: 'om-bubble', html: '<b class="gold">' + U.fmt(h.amount) + 'g</b>' + (h.note ? ' — ' + U.esc(h.note) : '') }),
      ]));
    });
    th.appendChild(msgs);
    if (o.state === 'pending' || o.state === 'countered') {
      const acts = U.el('div', { cls: 'offer-actions' });
      const last = o.history[o.history.length - 1];
      const myTurn = (last.by === 'buyer') === selling;
      if (myTurn) {
        acts.appendChild(U.el('button', {
          cls: 'btn small primary', text: 'Accept ' + U.fmt(last.amount) + 'g', onclick: () => {
            const r = G.acceptOffer(o.id, selling);
            if (r && r.err) UI.alert('Failed', r.err);
            else { DYA.audio.play('coin'); UI.toast({ title: 'Deal!', icon: '🤝' }); }
            UI.show('market');
          },
        }));
        const amt = U.el('input', { cls: 'txt', type: 'number', style: 'max-width:110px', placeholder: 'Counter…' });
        acts.appendChild(amt);
        acts.appendChild(U.el('button', {
          cls: 'btn small', text: 'Counter', onclick: () => {
            if (!parseInt(amt.value)) return;
            G.counterOffer(o.id, parseInt(amt.value), '', selling);
            UI.show('market');
          },
        }));
      } else {
        acts.appendChild(U.el('div', { cls: 'small muted', text: 'Waiting for ' + (other ? other.displayName : 'them') + '…' }));
      }
      acts.appendChild(U.el('div', { cls: 'spacer' }));
      acts.appendChild(U.el('button', { cls: 'btn small danger', text: selling ? 'End negotiation' : 'Withdraw', onclick: () => { G.endOffer(o.id); UI.show('market'); } }));
      th.appendChild(acts);
    }
    return th;
  }

  /* ================= MY STALL ================= */
  const stallState = { tab: 'Listings' };
  UI.register('myStall', {
    enter(root) {
      const me = G.me;
      const scr = U.el('div', { cls: 'screen stall-bg' });
      scr.appendChild(UI.topbar({ title: 'My Stall' }));
      addTorches(scr);
      const page = U.el('div', { cls: 'page', style: 'position:relative;z-index:2' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('market') }));
      head.appendChild(U.el('h2', { text: me.stall.name || 'My Stall' }));
      const tabs = U.el('div', { cls: 'tabs' });
      ['Listings', 'Offers', 'Customize', 'Sell to Governing Body'].forEach(t => {
        const tab = U.el('div', { cls: 'tab' + (stallState.tab === t ? ' active' : ''), text: t });
        tab.onclick = () => { stallState.tab = t; UI.show('myStall'); };
        tabs.appendChild(tab);
      });
      head.appendChild(U.el('div', { cls: 'spacer' }));
      head.appendChild(tabs);
      head.appendChild(U.el('button', { cls: 'btn small ghost', text: '👁 Preview stall', onclick: () => UI.show('playerStall', { seller: me, preview: true }) }));
      head.appendChild(U.el('button', { cls: 'btn small', text: '＋ New listing', onclick: newListing }));
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body' });
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);

      function newListing() {
        const avail = Object.values(me.tokens).filter(t => t.status === 'collection' && !t.frozen && !t.isRental);
        if (!avail.length) { UI.alert('Nothing to list', 'All your tokens are in use, frozen, or rentals.'); return; }
        const w = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'New listing — 50g flat fee' })]);
        const sel = U.el('select', { cls: 'txt mt' });
        avail.forEach(t => sel.appendChild(U.el('option', { value: t.id, text: t.name + ' (' + SP.get(t.speciesId).name + ', ' + SP.RARITIES[t.rarity] + ')' })));
        const avgLine = U.el('div', { cls: 'small gold mt' });
        function upd() { const t = me.tokens[sel.value]; avgLine.textContent = 'Market average (sellers only): ' + U.fmt(G.marketAverage(t.speciesId, t.rarity)) + 'g'; }
        sel.onchange = upd; upd();
        const price = U.el('input', { cls: 'txt mt', type: 'number', placeholder: 'Asking price (gold)' });
        const status = U.el('select', { cls: 'txt mt' });
        [['sale', 'For sale — instant buy'], ['offer', 'Make offer — negotiate only'], ['display', 'Display only (offers still open)']].forEach(([v, l]) => status.appendChild(U.el('option', { value: v, text: l })));
        w.appendChild(sel); w.appendChild(avgLine); w.appendChild(price); w.appendChild(status);
        const m = UI.modal(w);
        w.appendChild(U.el('button', {
          cls: 'btn primary mt', text: 'List it (−50g)', onclick: () => {
            const tok = me.tokens[sel.value];
            const p = parseInt(price.value) || G.marketAverage(tok.speciesId, tok.rarity);
            const r = G.createListing(tok, p, status.value);
            if (r.err) { UI.alert('Cannot list', r.err); return; }
            m.close(); DYA.audio.play('coin'); UI.show('myStall');
          },
        }));
      }

      const views = {
        Listings() {
          body.innerHTML = '';
          const myLsts = Object.values(G.world.market.listings).filter(l => l.sellerId === me.id);
          if (!myLsts.length) { body.appendChild(U.el('p', { cls: 'muted', text: 'Your shelves are empty. List something — the fee is 50g flat.' })); return; }
          myLsts.forEach(l => {
            const tok = me.tokens[l.tokenId];
            if (!tok) return;
            const row = U.el('div', { cls: 'friend-row' });
            row.appendChild(UI.tokenArt(tok.speciesId, 50));
            /* listed price AND market average — only visible here */
            row.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + U.esc(tok.name) + '</b> ' + (me.stall.featuredTokenId === tok.id ? '<span class="pill gold">★ FEATURED</span>' : '') + '<br><span class="small">Listed: <b class="gold">' + U.fmt(l.price) + 'g</b> · Market avg: <b>' + U.fmt(G.marketAverage(tok.speciesId, tok.rarity)) + 'g</b> · <span class="status-badge ' + l.status + '">' + l.status + '</span></span>' }));
            row.appendChild(U.el('button', {
              cls: 'btn small', text: 'Edit', onclick: () => {
                const w = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'Edit listing' })]);
                const p = U.el('input', { cls: 'txt mt', type: 'number', value: l.price });
                w.appendChild(p);
                const m = UI.modal(w);
                w.appendChild(U.el('button', { cls: 'btn primary mt', text: 'Save', onclick: () => { l.price = parseInt(p.value) || l.price; G.save(); m.close(); UI.show('myStall'); } }));
              },
            }));
            row.appendChild(U.el('button', { cls: 'btn small ghost', text: '★ Feature', onclick: () => { me.stall.featuredTokenId = tok.id; G.save(); UI.show('myStall'); } }));
            row.appendChild(U.el('button', { cls: 'btn small danger', text: 'Remove', onclick: () => { G.removeListing(l.id); UI.show('myStall'); } }));
            body.appendChild(row);
          });
        },
        Offers() {
          body.innerHTML = '';
          const offers = Object.values(G.world.market.offers).filter(o => o.sellerId === me.id || o.buyerId === me.id);
          if (!offers.length) { body.appendChild(U.el('p', { cls: 'muted', text: 'No active negotiations. Gold border = you’re selling, blue = you’re buying.' })); return; }
          offers.forEach(o => body.appendChild(offerThread(o)));
        },
        Customize() {
          body.innerHTML = '';
          const box = U.el('div', { cls: 'panel', style: 'max-width:560px' });
          box.appendChild(U.el('label', { cls: 'lbl', text: 'Stall name' }));
          const nm = U.el('input', { cls: 'txt', value: me.stall.name || '', placeholder: me.displayName + '’s Stall' });
          box.appendChild(nm);
          box.appendChild(U.el('label', { cls: 'lbl', text: 'Bio' }));
          const bio = U.el('textarea', { cls: 'txt', rows: 3 }); bio.value = me.stall.bio || '';
          box.appendChild(bio);
          box.appendChild(U.el('label', { cls: 'lbl', text: 'Banner color' }));
          const swatches = U.el('div', { cls: 'flex' });
          ['#6d4a2e', '#8a1c1c', '#31576b', '#43572f', '#5a3a75', '#7a3f1c', '#2d4a44'].forEach(c => {
            const sw = U.el('div', { style: 'width:34px;height:34px;border-radius:6px;background:' + c + ';cursor:pointer;border:2px solid ' + (me.stall.banner === c ? 'var(--gold)' : 'transparent') });
            sw.onclick = () => { me.stall.banner = c; G.save(); views.Customize(); };
            swatches.appendChild(sw);
          });
          box.appendChild(swatches);
          box.appendChild(U.el('label', { cls: 'lbl', text: 'Stall frame' }));
          const frames = U.el('div', { cls: 'flex' });
          [['wood', 'Wood', true], ['stone', 'Stone', true], ['stygian', 'Stygian', !!me.flags.stygianFrame]].forEach(([id, label, unlocked]) => {
            const b = U.el('button', { cls: 'btn small' + (me.stall.frame === id ? '' : ' ghost'), text: unlocked ? label : label + ' 🔒' });
            if (unlocked) b.onclick = () => { me.stall.frame = id; G.save(); views.Customize(); };
            else b.title = 'Stygian frame unlocks at the level 50 milestone';
            frames.appendChild(b);
          });
          box.appendChild(frames);
          box.appendChild(U.el('label', { cls: 'lbl', text: 'Trophy shelf' }));
          box.appendChild(U.el('div', { cls: 'muted small', text: me.stats.tourneysWon ? me.stats.tourneysWon + ' tournament trophies on display.' : 'Reserved for tournament trophies. (Placeholder — win something.)' }));
          box.appendChild(U.el('button', { cls: 'btn primary mt', text: 'Save', onclick: () => { me.stall.name = nm.value; me.stall.bio = bio.value; G.save(); UI.toast({ title: 'Stall updated', icon: '🏪' }); } }));
          body.appendChild(box);
        },
        'Sell to Governing Body'() {
          body.innerHTML = '';
          body.appendChild(U.el('p', { cls: 'muted mb', text: 'The Dya Guild buys back tokens at 75% of market average. No tax. No haggling. Flagged tokens require review first.' }));
          const grid = U.el('div', { cls: 'grid cols-auto' });
          Object.values(me.tokens).filter(t => t.status === 'collection' && !t.isRental).forEach(tok => {
            const pay = Math.round(G.marketAverage(tok.speciesId, tok.rarity) * EC.BUYBACK_RATE);
            const card = UI.tokenCard(tok, { size: 80 });
            card.appendChild(U.el('div', { cls: 'lc-price', text: '→ ' + U.fmt(pay) + 'g' }));
            card.onclick = () => {
              UI.confirm('Sell to the Guild?', tok.name + ' for ' + U.fmt(pay) + 'g. The Guild does not resell sentimental value.', () => {
                const r = G.buyback(tok);
                if (r.err) UI.alert('Refused', r.err);
                else { DYA.audio.play('coin'); UI.refreshTopbar(); }
                UI.show('myStall');
              }, 'Sell — ' + U.fmt(pay) + 'g');
            };
            grid.appendChild(card);
          });
          body.appendChild(grid);
        },
      };
      views[stallState.tab]();
    },
  });

  /* ================= PLAYER STALL (what others see) ================= */
  UI.register('playerStall', {
    enter(root, params) {
      const seller = params.seller;
      const me = G.me;
      const scr = U.el('div', { cls: 'screen stall-bg' });
      scr.appendChild(UI.topbar({ title: 'Stall' }));
      addTorches(scr);
      /* hanging faction-colored banners */
      for (let i = 0; i < 5; i++) {
        scr.appendChild(U.el('div', { cls: 'banner-strip', style: 'left:' + (12 + i * 22) + '%;background:' + (i % 2 ? seller.stall.banner || '#6d4a2e' : '#3a2a18') + ';z-index:1' }));
      }
      const page = U.el('div', { cls: 'page', style: 'position:relative;z-index:2' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('market') }));
      head.appendChild(U.el('h2', { text: seller.stall.name || seller.displayName + '’s Stall' }));
      head.appendChild(U.el('div', { cls: 'muted small', text: 'kept by ' + seller.displayName }));
      const search = U.el('input', { cls: 'txt', style: 'max-width:200px', placeholder: '🔎 Search this stall' });
      head.appendChild(U.el('div', { cls: 'spacer' }));
      head.appendChild(search);
      head.appendChild(U.el('div', { cls: 'pill', html: (seller.trustedSeller ? '✓ Trusted · ' : '') + seller.stats.sales + ' sales · ' + G.followerCount(seller.id) + ' followers' }));
      if (seller.id !== me.id) {
        const fBtn = U.el('button', { cls: 'btn small', text: me.follows.includes(seller.id) ? 'Following ✓' : 'Follow' });
        fBtn.onclick = () => { G.toggleFollow(seller.id); UI.show('playerStall', params); };
        head.appendChild(fBtn);
      }
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body' });

      const topRow = U.el('div', { cls: 'flex', style: 'align-items:flex-start;gap:20px' });
      /* stall sign top left: wooden sign */
      const sign = U.el('div', { cls: 'stall-sign', style: 'max-width:300px' });
      sign.appendChild(U.el('h3', { cls: 'gold', text: seller.stall.name || seller.displayName + '’s Stall' }));
      sign.appendChild(U.el('div', { cls: 'small muted', text: seller.displayName + ' — ' + EC.REGIONS.find(r => r.id === seller.region).name }));
      sign.appendChild(U.el('p', { cls: 'small mt', text: '"' + (seller.stall.bio || 'No bio. The tokens speak for themselves.') + '"' }));
      sign.appendChild(U.el('div', { cls: 'small muted mt', text: 'Level ' + seller.level + ' · ' + seller.stats.sales + ' lifetime sales' }));
      topRow.appendChild(sign);

      /* featured token top right — largest display, floating */
      const lsts = Object.values(G.world.market.listings).filter(l => l.sellerId === seller.id);
      const featured = lsts.find(l => seller.stall.featuredTokenId === l.tokenId) || lsts.sort((a, b) => b.price - a.price)[0];
      if (featured) {
        const ftok = seller.tokens[featured.tokenId];
        if (ftok) {
          const fbox = U.el('div', { cls: 'panel flex1', style: 'display:flex;gap:20px;align-items:center' });
          const artWrap = U.el('div', { style: 'animation:floaty 3.4s ease-in-out infinite' });
          artWrap.appendChild(UI.tokenArt(ftok.speciesId, 150, 'idle', ftok.picks && ftok.picks.headCount));
          fbox.appendChild(artWrap);
          const finfo = U.el('div', { cls: 'flex1' });
          finfo.appendChild(U.el('div', { cls: 'small gold', text: '★ FEATURED' }));
          finfo.appendChild(U.el('h3', { cls: 'gold', text: ftok.name }));
          finfo.appendChild(U.el('div', { cls: 'small muted', text: TK.summary(ftok) }));
          finfo.appendChild(U.el('p', { cls: 'small mt', text: SP.get(ftok.speciesId).desc }));
          finfo.appendChild(U.el('div', { cls: 'lc-price mt', text: featured.status === 'display' ? 'Display only — offers open' : U.fmt(featured.price) + 'g' }));
          const frow = U.el('div', { cls: 'flex mt' });
          if (seller.id !== me.id) {
            if (featured.status !== 'display') frow.appendChild(U.el('button', { cls: 'btn primary small', text: 'Buy now', onclick: () => buyFlow(featured, ftok) }));
            frow.appendChild(U.el('button', { cls: 'btn small', text: 'Make offer', onclick: () => offerFlow(featured, ftok) }));
          }
          const minBtn = U.el('button', { cls: 'btn small ghost', text: '– minimize' });
          minBtn.onclick = () => fbox.style.display = 'none';
          frow.appendChild(minBtn);
          finfo.appendChild(frow);
          fbox.appendChild(finfo);
          topRow.appendChild(fbox);
        }
      }
      body.appendChild(topRow);

      /* listings on shelves — two per shelf row */
      const shelvesWrap = U.el('div', { cls: 'mt' });
      body.appendChild(shelvesWrap);
      function renderShelves() {
        shelvesWrap.innerHTML = '';
        let show = lsts.filter(l => seller.tokens[l.tokenId]);
        const q = search.value && search.value.toLowerCase();
        if (q) show = show.filter(l => { const t = seller.tokens[l.tokenId]; return t.name.toLowerCase().includes(q) || SP.get(t.speciesId).name.toLowerCase().includes(q); });
        if (!show.length) { shelvesWrap.appendChild(U.el('p', { cls: 'muted center mt', text: 'Bare shelves.' })); return; }
        for (let i = 0; i < show.length; i += 2) {
          const shelf = U.el('div', { cls: 'shelf' });
          [show[i], show[i + 1]].forEach(l => {
            if (!l) return;
            const tok = seller.tokens[l.tokenId];
            const item = U.el('div', { cls: 'flex flex1', style: 'gap:14px;cursor:pointer' });
            item.appendChild(UI.tokenArt(tok.speciesId, 84, 'idle', tok.picks && tok.picks.headCount));
            const inf = U.el('div', { cls: 'flex1' });
            inf.appendChild(U.el('div', { cls: 'gold', text: tok.name }));
            inf.appendChild(U.el('div', { cls: 'small muted', text: SP.get(tok.speciesId).name + ' · ' + SP.RARITIES[tok.rarity] + ' · ' + SP.SIZES[tok.sizeIdx] }));
            inf.appendChild(U.el('div', { cls: 'small', style: 'height:32px;overflow:hidden', text: SP.get(tok.speciesId).desc }));
            /* price breakdown; market avg never shown to buyers */
            inf.appendChild(U.el('div', { html: '<span class="lc-price">' + (l.status === 'display' ? '—' : U.fmt(l.price) + 'g') + '</span> <span class="status-badge ' + l.status + '">' + (l.status === 'sale' ? 'FOR SALE' : l.status === 'offer' ? 'MAKE OFFER' : 'DISPLAY') + '</span>' }));
            item.onclick = () => {
              const scr2 = U.el('div', { cls: 'screen', style: 'z-index:10;background:var(--bg)' });
              const actions = [];
              if (seller.id !== me.id && l.status !== 'display') actions.push(U.el('button', { cls: 'btn primary', text: 'Buy now — ' + U.fmt(l.price) + 'g', onclick: () => { buyFlow(l, tok); scr2.remove(); } }));
              if (seller.id !== me.id) actions.push(U.el('button', { cls: 'btn', text: 'Make offer', onclick: () => offerFlow(l, tok) }));
              scr2.appendChild(UI.tokenDetail(tok, { onBack: () => scr2.remove(), actions }));
              root.appendChild(scr2);
            };
            shelf.appendChild(item);
          });
          shelvesWrap.appendChild(shelf);
        }
      }
      search.oninput = renderShelves;
      renderShelves();

      function buyFlow(l, tok) {
        if (me.gold < l.price) { UI.alert('Not enough gold', 'You hold ' + U.fmt(me.gold) + 'g.'); return; }
        const r = G.buyListing(l.id);
        if (r.err) { UI.alert('Cannot buy', r.err); return; }
        DYA.audio.play('coin');
        UI.toast({ title: 'Purchase complete', body: tok.name + ' is yours.', icon: '🛒' });
        if (DYA.tutorial) DYA.tutorial.onEvent('marketBuy');
        UI.show('playerStall', params);
      }
      function offerFlow(l, tok) {
        const w = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'Offer on ' + tok.name })]);
        const amt = U.el('input', { cls: 'txt mt', type: 'number', placeholder: 'Gold amount', value: Math.round((l.price || 200) * 0.8) });
        const note = U.el('input', { cls: 'txt mt', placeholder: 'Say something (optional)' });
        w.appendChild(amt); w.appendChild(note);
        const m = UI.modal(w);
        w.appendChild(U.el('button', {
          cls: 'btn primary mt', text: 'Send offer', onclick: () => {
            const r = G.makeOffer(l.id, parseInt(amt.value) || 0, note.value);
            if (r.err) { UI.alert('Cannot offer', r.err); return; }
            m.close(); UI.toast({ title: 'Offer sent', icon: '📩' });
          },
        }));
      }

      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);
    },
  });

  /* flickering torches for stall atmosphere */
  function addTorches(scr) {
    [8, 92].forEach(pct => {
      const t = U.el('canvas', { cls: 'torch', width: 60, height: 90, style: 'left:' + pct + '%;top:70px' });
      scr.appendChild(t);
      const ctx = t.getContext('2d');
      (function anim(now) {
        if (!t.isConnected) return;
        const tt = now / 1000;
        ctx.clearRect(0, 0, 60, 90);
        ctx.fillStyle = '#4a3520';
        ctx.fillRect(26, 40, 8, 46);
        const fl = Math.sin(tt * 9) * 3 + Math.sin(tt * 23) * 2;
        const g = ctx.createRadialGradient(30, 30, 2, 30, 30, 26);
        g.addColorStop(0, '#fff3c8'); g.addColorStop(0.4, '#ffb03a'); g.addColorStop(1, '#e8842c00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(30 + fl * 0.4, 28 - Math.abs(fl) * 0.5, 10 + fl * 0.5, 17 + fl, 0, 0, 6.29);
        ctx.fill();
        requestAnimationFrame(anim);
      })(0);
    });
  }
})();
