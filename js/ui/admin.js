/* ============================================================
   DYA'AKARA — ui/admin.js
   The Admin Panel (Master Design Doc, Part XVI).
   Developer/creator use only — lives outside the game UI at
   admin.html. Full god-mode access:

     • CREATURES — every species fully editable: stats, rarity &
       size bands, elements, behavior tree, per-individual trait
       ranges, dictionary text, and the sprite itself (rig,
       colors, feature layers, or an uploaded image) with a live
       animated preview. Clone species into new ones.
     • TEXT & LORE — loading tips, quick chat, name pools, story
       fragments, plus game-wide exact-match UI text replacement.
     • BALANCE & ECONOMY — every numeric table.
     • DYA'KUKULL — global AI tuning dials, bulk operations, and
       per-AI control down to their collections.
     • MARKET — local stalls AND the shared online market
       (pull any player listing; the token returns home).

   Edits are stored as overrides (DYA.mods), applied instantly,
   and — when online is configured — pushed to Supabase so every
   player's game picks them up within a minute.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, SP = DYA.species, EC = DYA.economy, L = DYA.lore, TK = DYA.token, M = DYA.mods;
  let root, view = 'Overview';

  window.addEventListener('DOMContentLoaded', () => {
    G.init();
    root = U.qs('#app');
    gate();
  });

  /* ---------- access gate: you are the admin ---------- */
  function gate() {
    root.innerHTML = '';
    const wrap = U.el('div', { cls: 'admin-wrap', style: 'max-width:420px;margin-top:12vh' });
    wrap.appendChild(U.el('h1', { cls: 'gold center', text: "DYA'AKARA — ADMIN" }));
    wrap.appendChild(U.el('p', { cls: 'muted center small mt', text: G.world.adminPass ? 'Enter the admin password.' : 'First access — set the admin password. You are the admin.' }));
    const pass = U.el('input', { cls: 'txt mt', type: 'password', placeholder: 'Admin password' });
    wrap.appendChild(pass);
    const err = U.el('div', { cls: 'small center mt', style: 'color:var(--red);min-height:16px' });
    wrap.appendChild(err);
    const btn = U.el('button', { cls: 'btn primary mt', style: 'width:100%', text: G.world.adminPass ? 'Enter' : 'Set password & enter' });
    btn.onclick = () => {
      if (pass.value.length < 4) { err.textContent = 'At least 4 characters.'; return; }
      if (!G.world.adminPass) { G.admin.setPass(pass.value); panel(); return; }
      if (G.admin.checkPass(pass.value)) panel();
      else err.textContent = 'Wrong password. The Guild is watching. Cordially.';
    };
    pass.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
    wrap.appendChild(btn);
    root.appendChild(wrap);
  }

  /* ---------- shared helpers ---------- */
  function modal(inset) {
    const back = U.el('div', { style: 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99' });
    const w = U.el('div', { cls: 'panel', style: 'position:fixed;inset:' + (inset || '5% 10%') + ';overflow:auto;z-index:100' });
    back.onclick = () => close();
    function close() { back.remove(); w.remove(); }
    document.body.appendChild(back);
    document.body.appendChild(w);
    return { w, close };
  }
  function lblIn(parent, label, el) {
    parent.appendChild(U.el('label', { cls: 'lbl', text: label }));
    parent.appendChild(el);
    return el;
  }
  function numIn(value, opts) {
    return U.el('input', Object.assign({ cls: 'txt', type: 'number', value }, opts || {}));
  }
  /* one-per-line list editor */
  function linesEditor(body, title, getArr, onSave, onReset, rows) {
    const box = U.el('div', { cls: 'panel mb' });
    box.appendChild(U.el('h3', { cls: 'gold mb', text: title }));
    const ta = U.el('textarea', { cls: 'txt', rows: rows || 8, style: 'width:100%;font-size:12px' });
    ta.value = getArr().join('\n');
    box.appendChild(ta);
    const acts = U.el('div', { cls: 'flex mt' });
    acts.appendChild(U.el('button', {
      cls: 'btn small primary', text: 'Save', onclick: () => {
        onSave(ta.value.split('\n').map(s => s.trim()).filter(Boolean));
        flashSaved(acts);
      },
    }));
    acts.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Reset to default', onclick: () => { onReset(); ta.value = getArr().join('\n'); flashSaved(acts, 'Reset.'); } }));
    box.appendChild(acts);
    body.appendChild(box);
  }
  function flashSaved(parent, txt) {
    const s = U.el('span', { cls: 'small gold', style: 'margin-left:8px', text: txt || (M.configured() ? 'Saved — pushing to all players…' : 'Saved locally.') });
    parent.appendChild(s);
    setTimeout(() => s.remove(), 2500);
  }
  function syncLine() {
    const s = M.syncState;
    let txt;
    if (!M.configured()) txt = 'Offline build — edits apply to this browser only. Configure Supabase (js/config.js) to broadcast edits to every player.';
    else if (s.error) txt = '⚠ Online sync problem: ' + s.error + (/(relation|table)/i.test(s.error) ? ' — re-run supabase/schema.sql to add the dya_config table.' : '');
    else txt = '🌐 Online sync ON — rev ' + (M.data.rev || 0) + (s.lastPush ? ' · pushed ' + U.timeAgo(s.lastPush) : '') + '. Players pick up edits within a minute.';
    return U.el('p', { cls: 'small ' + (s.error ? '' : 'muted'), style: s.error ? 'color:var(--red)' : '', text: txt });
  }

  /* ---------- main panel ---------- */
  const NAV = ['Overview', 'Creatures', 'Text & Lore', 'Balance & Economy', "Dya'kukull (AI Players)", 'Market Monitor', 'Spawn Tokens', 'Tournaments', 'Bans & Appeals', 'Flagged Tokens', 'Announcements', 'God Mode'];
  function panel() {
    root.innerHTML = '';
    const wrap = U.el('div', { cls: 'admin-wrap' });
    wrap.appendChild(U.el('h1', { cls: 'gold', text: "DYA'AKARA — ADMIN PANEL" }));
    wrap.appendChild(U.el('p', { cls: 'muted small', text: 'Full god-mode access. Season ' + G.world.season.number + ' · ' + Object.keys(G.world.accounts).length + ' accounts · Handle with the usual recklessness.' }));
    const grid = U.el('div', { cls: 'admin-grid mt' });
    const nav = U.el('div', { cls: 'admin-nav' });
    const body = U.el('div', {});
    NAV.forEach(v => {
      const b = U.el('button', { cls: 'btn' + (view === v ? ' primary' : ''), text: v });
      b.onclick = () => { view = v; panel(); };
      nav.appendChild(b);
    });
    grid.appendChild(nav);
    grid.appendChild(body);
    wrap.appendChild(grid);
    root.appendChild(wrap);
    VIEWS[view](body);
  }

  function rerender() { panel(); }

  const VIEWS = {
    /* ================= OVERVIEW ================= */
    Overview(body) {
      const humans = Object.values(G.world.accounts).filter(a => !a.ai);
      const ais = Object.values(G.world.accounts).filter(a => a.ai);
      const listings = Object.values(G.world.market.listings).length;
      const openReports = G.world.appeals.filter(a => a.open).length;
      const ms = M.summary();
      const tiles = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(160px,1fr))' });
      [['Real players', humans.length], ['AI players', ais.length], ['Local listings', listings], ['Open reports/appeals', openReports], ['Tournaments', Object.values(G.world.tournaments).length], ['Season', G.world.season.number],
      ['Species edited', ms.species + ms.customSpecies], ['Text overrides', ms.text + ms.lore], ['Balance overrides', ms.balance], ['Edit revision', ms.rev]].forEach(([l, v]) => {
        tiles.appendChild(U.el('div', { cls: 'stat-tile' }, [U.el('div', { cls: 'st-num', text: v }), U.el('div', { cls: 'st-lbl', text: l })]));
      });
      body.appendChild(tiles);
      body.appendChild(syncLine());
      body.appendChild(U.el('h3', { cls: 'gold mt mb', text: 'Real player accounts' }));
      const tbl = U.el('table', { cls: 'adm' });
      tbl.appendChild(U.el('tr', {}, [U.el('th', { text: 'Name' }), U.el('th', { text: 'Level' }), U.el('th', { text: 'Gold' }), U.el('th', { text: 'Tokens' }), U.el('th', { text: 'Rank' }), U.el('th', { text: '' })]));
      humans.forEach(a => {
        const tr = U.el('tr', {}, [
          U.el('td', { text: a.displayName }), U.el('td', { text: a.level }),
          U.el('td', { text: U.fmt(a.gold) }), U.el('td', { text: Object.keys(a.tokens).length }),
          U.el('td', { text: a.rank }),
        ]);
        const td = U.el('td', {});
        td.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Edit', onclick: () => editAccount(a) }));
        tr.appendChild(td);
        tbl.appendChild(tr);
      });
      body.appendChild(tbl);
    },

    /* ================= CREATURES ================= */
    Creatures(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'Every species is fully editable — stats, bands, elements, behavior tree, per-individual trait ranges, dictionary text, and the sprite itself. Edits apply to matches and newly minted tokens immediately' + (M.configured() ? ', and reach every player online.' : '.') }));
      body.appendChild(syncLine());
      const bar = U.el('div', { cls: 'flex mb' });
      const search = U.el('input', { cls: 'txt', style: 'max-width:240px', placeholder: '🔎 Search species…' });
      bar.appendChild(search);
      body.appendChild(bar);
      const grd = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:10px' });
      body.appendChild(grd);
      function paint() {
        grd.innerHTML = '';
        const q = search.value.toLowerCase();
        SP.list.filter(sp => !q || sp.name.toLowerCase().includes(q) || sp.id.includes(q) || (sp.family || '').toLowerCase().includes(q)).forEach(sp => {
          const card = U.el('div', { cls: 'panel', style: 'padding:10px;cursor:pointer' });
          const row = U.el('div', { cls: 'flex' });
          row.appendChild(spriteThumb(sp, 54));
          const info = U.el('div', { cls: 'flex1', style: 'margin-left:8px' });
          info.appendChild(U.el('div', { cls: 'gold', text: sp.name }));
          info.appendChild(U.el('div', { cls: 'small muted', text: (sp.family || '—') + ' · ' + sp.element + (sp.element2 ? '/' + sp.element2 : '') }));
          info.appendChild(U.el('div', { cls: 'small muted', text: 'HP×' + (sp.statMul ? sp.statMul.hp : 1) + ' DMG×' + (sp.statMul ? sp.statMul.dmg : 1) + ' SPD×' + (sp.statMul ? sp.statMul.speed : 1) }));
          const badges = U.el('div', {});
          if (M.isCustom(sp.id)) badges.appendChild(U.el('span', { cls: 'pill gold', text: 'CUSTOM' }));
          else if (M.isEdited(sp.id)) badges.appendChild(U.el('span', { cls: 'pill', text: 'EDITED' }));
          if (sp.spriteImg) badges.appendChild(U.el('span', { cls: 'pill', text: '🖼 image' }));
          info.appendChild(badges);
          row.appendChild(info);
          card.appendChild(row);
          card.onclick = () => editSpecies(sp.id);
          grd.appendChild(card);
        });
      }
      search.oninput = paint;
      paint();
    },

    /* ================= TEXT & LORE ================= */
    'Text & Lore'(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'All game text is editable. Species dictionary text lives with each creature (Creatures tab). Everything else is here — including a game-wide find-and-replace for ANY string the UI displays.' }));
      body.appendChild(syncLine());

      /* --- game-wide UI text replacement --- */
      const box = U.el('div', { cls: 'panel mb' });
      box.appendChild(U.el('h3', { cls: 'gold mb', text: 'UI text overrides (game-wide)' }));
      box.appendChild(U.el('p', { cls: 'small muted', text: 'Exact-match replacement applied to every piece of text the game renders — button labels, headings, messages. Case-sensitive, whole string. (The admin panel itself is exempt so you can’t lock yourself out.)' }));
      const rows = U.el('div', {});
      box.appendChild(rows);
      function paintRows() {
        rows.innerHTML = '';
        Object.entries(M.data.text || {}).forEach(([from, to]) => {
          const r = U.el('div', { cls: 'flex mt' });
          r.appendChild(U.el('input', { cls: 'txt', value: from, readonly: '', style: 'flex:1;opacity:.8' }));
          r.appendChild(U.el('span', { cls: 'gold', style: 'padding:8px 4px', text: '→' }));
          const toIn = U.el('input', { cls: 'txt', value: to, style: 'flex:1' });
          toIn.onchange = () => { M.data.text[from] = toIn.value; M.save(); };
          r.appendChild(toIn);
          r.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { delete M.data.text[from]; M.save(); paintRows(); } }));
          rows.appendChild(r);
        });
        const add = U.el('div', { cls: 'flex mt' });
        const fromIn = U.el('input', { cls: 'txt', placeholder: 'Original text (exact)', style: 'flex:1' });
        const toIn = U.el('input', { cls: 'txt', placeholder: 'Replacement', style: 'flex:1' });
        add.appendChild(fromIn); add.appendChild(toIn);
        add.appendChild(U.el('button', {
          cls: 'btn small', text: '＋ Add', onclick: () => {
            if (!fromIn.value) return;
            M.data.text = M.data.text || {};
            M.data.text[fromIn.value] = toIn.value;
            M.save(); paintRows();
          },
        }));
        rows.appendChild(add);
      }
      paintRows();
      body.appendChild(box);

      /* --- lore pools --- */
      linesEditor(body, 'Loading-screen lore tips (one per line)', () => L.TIPS, v => M.set('lore', 'TIPS', v), () => M.set('lore', 'TIPS', null), 10);
      linesEditor(body, 'Quick-chat phrases (in-match)', () => L.QUICK_CHAT, v => M.set('lore', 'QUICK_CHAT', v), () => M.set('lore', 'QUICK_CHAT', null), 4);
      linesEditor(body, 'Spectator reactions (emoji)', () => L.SPECTATOR_REACTIONS, v => M.set('lore', 'SPECTATOR_REACTIONS', v), () => M.set('lore', 'SPECTATOR_REACTIONS', null), 3);
      linesEditor(body, 'World places (backstories draw from these)', () => L.PLACES, v => M.set('lore', 'PLACES', v), () => M.set('lore', 'PLACES', null), 5);
      linesEditor(body, 'Token materials', () => L.MATERIALS, v => M.set('lore', 'MATERIALS', v), () => M.set('lore', 'MATERIALS', null), 3);
      linesEditor(body, 'Backstory fragments — life ({terr}, {place} are filled in)', () => L.STORY_LIVED, v => M.set('lore', 'STORY_LIVED', v), () => M.set('lore', 'STORY_LIVED', null), 5);
      linesEditor(body, 'Backstory fragments — temperament', () => L.STORY_TEMPER, v => M.set('lore', 'STORY_TEMPER', v), () => M.set('lore', 'STORY_TEMPER', null), 5);
      linesEditor(body, 'Backstory fragments — material ({mat}, {place})', () => L.STORY_MATERIAL, v => M.set('lore', 'STORY_MATERIAL', v), () => M.set('lore', 'STORY_MATERIAL', null), 4);
    },

    /* ================= BALANCE & ECONOMY ================= */
    'Balance & Economy'(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'The numeric heart of the game. Changes apply to new mints, matches, and market math immediately.' }));
      body.appendChild(syncLine());

      function tableEditor(title, labels, get, saveKey, section, opts) {
        opts = opts || {};
        const box = U.el('div', { cls: 'panel mb' });
        box.appendChild(U.el('h3', { cls: 'gold mb', text: title }));
        const row = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px' });
        const ins = labels.map((lb, i) => {
          const cell = U.el('div', {});
          cell.appendChild(U.el('label', { cls: 'lbl', text: lb }));
          const inp = numIn(get()[i], { step: opts.step || 'any' });
          cell.appendChild(inp);
          row.appendChild(cell);
          return inp;
        });
        box.appendChild(row);
        const acts = U.el('div', { cls: 'flex mt' });
        acts.appendChild(U.el('button', {
          cls: 'btn small primary', text: 'Save', onclick: () => {
            M.set(section, saveKey, ins.map(inp => parseFloat(inp.value) || 0));
            flashSaved(acts);
          },
        }));
        acts.appendChild(U.el('button', {
          cls: 'btn small ghost', text: 'Reset to default', onclick: () => {
            M.set(section, saveKey, null);
            ins.forEach((inp, i) => inp.value = get()[i]);
            flashSaved(acts, 'Reset.');
          },
        }));
        box.appendChild(acts);
        body.appendChild(box);
      }

      tableEditor('Resource cost to ready, per rarity', SP.RARITIES, () => SP.RARITY_COST, 'RARITY_COST', 'balance');
      tableEditor('Baseline market value (gold), per rarity', SP.RARITIES, () => SP.RARITY_VALUE, 'RARITY_VALUE', 'balance');
      tableEditor('Base HP, per size band', SP.SIZES, () => SP.SIZE_HP, 'SIZE_HP', 'balance');
      tableEditor('Base damage, per size band', SP.SIZES, () => SP.SIZE_DMG, 'SIZE_DMG', 'balance');
      tableEditor('Field radius, per size band', SP.SIZES, () => SP.SIZE_RADIUS, 'SIZE_RADIUS', 'balance');
      tableEditor('Base speed, per size band', SP.SIZES, () => SP.SIZE_SPEED, 'SIZE_SPEED', 'balance');
      tableEditor('Market tax rate, per rarity (0.05 = 5%)', SP.RARITIES, () => EC.MARKET_TAX, 'MARKET_TAX', 'economy', { step: 0.01 });

      /* --- object-style economy knobs --- */
      function objEditor(title, key, fields) {
        const box = U.el('div', { cls: 'panel mb' });
        box.appendChild(U.el('h3', { cls: 'gold mb', text: title }));
        const row = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px' });
        const ins = {};
        fields.forEach(([k, lb]) => {
          const cell = U.el('div', {});
          cell.appendChild(U.el('label', { cls: 'lbl', text: lb }));
          ins[k] = numIn(EC[key][k], { step: 'any' });
          cell.appendChild(ins[k]);
          row.appendChild(cell);
        });
        box.appendChild(row);
        const acts = U.el('div', { cls: 'flex mt' });
        acts.appendChild(U.el('button', {
          cls: 'btn small primary', text: 'Save', onclick: () => {
            const v = {};
            Object.keys(EC[key]).forEach(k => v[k] = EC[key][k]);
            fields.forEach(([k]) => v[k] = parseFloat(ins[k].value) || 0);
            M.set('economy', key, v);
            flashSaved(acts);
          },
        }));
        acts.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Reset', onclick: () => { M.set('economy', key, null); fields.forEach(([k]) => ins[k].value = EC[key][k]); flashSaved(acts, 'Reset.'); } }));
        box.appendChild(acts);
        body.appendChild(box);
      }
      objEditor('New player starting resources', 'START', [['gold', 'Gold'], ['okid', 'Buri Okid'], ['ngakara', 'NgAkara']]);
      objEditor('Match XP', 'XP', [['casualWin', 'Casual win'], ['casualLoss', 'Casual loss'], ['rankedWin', 'Ranked win'], ['rankedLoss', 'Ranked loss']]);
      objEditor('Match gold', 'GOLD', [['casualWin', 'Casual win'], ['casualLoss', 'Casual loss'], ['rankedWin', 'Ranked win'], ['rankedLoss', 'Ranked loss']]);

      /* craft costs */
      const cbox = U.el('div', { cls: 'panel mb' });
      cbox.appendChild(U.el('h3', { cls: 'gold mb', text: 'Crafting costs per rarity (Okid / NgAkara)' }));
      const crow = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px' });
      const cIns = SP.RARITIES.map((rn, i) => {
        const cell = U.el('div', {});
        cell.appendChild(U.el('label', { cls: 'lbl', text: rn }));
        const ok = numIn(EC.CRAFT_COST[i].okid, { placeholder: 'Okid', style: 'margin-bottom:4px' });
        const ng = numIn(EC.CRAFT_COST[i].ngakara, { placeholder: 'NgAkara' });
        cell.appendChild(ok); cell.appendChild(ng);
        crow.appendChild(cell);
        return [ok, ng];
      });
      cbox.appendChild(crow);
      const cacts = U.el('div', { cls: 'flex mt' });
      cacts.appendChild(U.el('button', {
        cls: 'btn small primary', text: 'Save', onclick: () => {
          M.set('economy', 'CRAFT_COST', cIns.map(([ok, ng]) => ({ okid: parseInt(ok.value) || 0, ngakara: parseInt(ng.value) || 0 })));
          flashSaved(cacts);
        },
      }));
      cacts.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Reset', onclick: () => { M.set('economy', 'CRAFT_COST', null); cIns.forEach(([ok, ng], i) => { ok.value = EC.CRAFT_COST[i].okid; ng.value = EC.CRAFT_COST[i].ngakara; }); flashSaved(cacts, 'Reset.'); } }));
      cbox.appendChild(cacts);
      body.appendChild(cbox);

      /* scalar knobs */
      const sbox = U.el('div', { cls: 'panel mb' });
      sbox.appendChild(U.el('h3', { cls: 'gold mb', text: 'Other dials' }));
      const srow = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px' });
      const scalars = [['BUYBACK_RATE', 'Guild buyback rate (0.75 = 75%)'], ['TRUSTED_SELLER_SALES', 'Sales for trusted badge'], ['POUCH_SIZE', 'Pouch size (tokens)']];
      const sIns = {};
      scalars.forEach(([k, lb]) => {
        const cell = U.el('div', {});
        cell.appendChild(U.el('label', { cls: 'lbl', text: lb }));
        sIns[k] = numIn(EC[k], { step: 'any' });
        cell.appendChild(sIns[k]);
        srow.appendChild(cell);
      });
      sbox.appendChild(srow);
      const sacts = U.el('div', { cls: 'flex mt' });
      sacts.appendChild(U.el('button', {
        cls: 'btn small primary', text: 'Save', onclick: () => {
          scalars.forEach(([k]) => M.set('economy', k, parseFloat(sIns[k].value) || 0));
          flashSaved(sacts);
        },
      }));
      sacts.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Reset', onclick: () => { scalars.forEach(([k]) => { M.set('economy', k, null); sIns[k].value = EC[k]; }); flashSaved(sacts, 'Reset.'); } }));
      sbox.appendChild(sacts);
      body.appendChild(sbox);
    },

    /* ================= DYA'KUKULL ================= */
    "Dya'kukull (AI Players)"(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'The AI players that keep the world feeling alive. They look identical to real players — nothing in the game marks them. Global dials tune ALL of them at once; each one is individually editable below, down to their collections.' }));
      body.appendChild(syncLine());

      /* --- global tuning dials --- */
      const tune = M.aiTuning();
      const gbox = U.el('div', { cls: 'panel mb' });
      gbox.appendChild(U.el('h3', { cls: 'gold mb', text: 'Global AI tuning (applies to every Dya’kukull)' }));
      const grow = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px' });
      const DIALS = [
        ['matchSkillMul', 'Match skill × (higher = harder AIs)', 0.05],
        ['marketActivityMul', 'Market activity ×', 0.05],
        ['actionsPerBeat', 'Market actions per world tick', 1],
        ['minOnline', 'Minimum AIs online', 1],
        ['challengeChance', 'Challenge-the-player chance', 0.005],
        ['friendRequestChance', 'Friend-request chance', 0.005],
        ['listPriceLo', 'Listing price low ×', 0.05],
        ['listPriceHi', 'Listing price high ×', 0.05],
        ['tournamentJoinChance', 'Tournament join chance', 0.05],
      ];
      const dIns = {};
      DIALS.forEach(([k, lb, step]) => {
        const cell = U.el('div', {});
        cell.appendChild(U.el('label', { cls: 'lbl', text: lb + ' (default ' + M.AI_DEFAULTS[k] + ')' }));
        dIns[k] = numIn(tune[k], { step });
        cell.appendChild(dIns[k]);
        grow.appendChild(cell);
      });
      gbox.appendChild(grow);
      const gacts = U.el('div', { cls: 'flex mt' });
      gacts.appendChild(U.el('button', {
        cls: 'btn small primary', text: 'Save dials', onclick: () => {
          DIALS.forEach(([k]) => {
            const v = parseFloat(dIns[k].value);
            M.set('ai', k, (isNaN(v) || v === M.AI_DEFAULTS[k]) ? null : v);
          });
          flashSaved(gacts);
        },
      }));
      gacts.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Reset all dials', onclick: () => { M.resetSection('ai'); DIALS.forEach(([k]) => dIns[k].value = M.AI_DEFAULTS[k]); flashSaved(gacts, 'Reset.'); } }));
      gbox.appendChild(gacts);
      body.appendChild(gbox);

      /* --- bulk operations --- */
      const bbox = U.el('div', { cls: 'panel mb' });
      bbox.appendChild(U.el('h3', { cls: 'gold mb', text: 'Bulk operations' }));
      const ais = () => Object.values(G.world.accounts).filter(a => a.ai);
      const brow = U.el('div', { cls: 'flex', style: 'flex-wrap:wrap;gap:6px' });
      brow.appendChild(U.el('button', { cls: 'btn small', text: '▶ Activate all', onclick: () => { ais().forEach(a => a.aiCfg.active = true); G.saveNow(); rerender(); } }));
      brow.appendChild(U.el('button', { cls: 'btn small', text: '⏸ Deactivate all', onclick: () => { ais().forEach(a => a.aiCfg.active = false); G.saveNow(); rerender(); } }));
      const goldIn = numIn('', { placeholder: 'Gold', style: 'max-width:110px' });
      brow.appendChild(goldIn);
      brow.appendChild(U.el('button', { cls: 'btn small', text: '💰 Grant gold to all', onclick: () => { const g = parseInt(goldIn.value) || 0; ais().forEach(a => a.gold = Math.max(0, a.gold + g)); G.saveNow(); rerender(); } }));
      const styleSel = U.el('select', { cls: 'txt', style: 'max-width:140px' });
      ['aggressive', 'defensive', 'balanced', 'greedy', 'chaotic'].forEach(s => styleSel.appendChild(U.el('option', { value: s, text: s })));
      brow.appendChild(styleSel);
      brow.appendChild(U.el('button', { cls: 'btn small', text: 'Set play style for all', onclick: () => { ais().forEach(a => a.aiCfg.playStyle = styleSel.value); G.saveNow(); rerender(); } }));
      bbox.appendChild(brow);
      body.appendChild(bbox);

      body.appendChild(U.el('button', {
        cls: 'btn mb', text: '＋ Add AI player', onclick: () => {
          const rng = new U.Rng(U.newSeed());
          const name = DYA.lore.genName(rng);
          const acc = Object.values(G.world.accounts).find(a => a.ai); // template check only
          const naiAcc = JSON.parse(JSON.stringify(acc));
          naiAcc.id = U.uid('ai');
          naiAcc.displayName = name;
          naiAcc.email = name.toLowerCase().replace(/[^a-z]/g, '') + '@dya.kukull';
          naiAcc.level = Math.max(1, Math.round(rng.gauss(12, 8)));
          naiAcc.gold = Math.round(500 + rng.next() * 4000);
          naiAcc.tokens = {};
          for (let i = 0; i < 12; i++) {
            const t = TK.mint({ speciesId: rng.pick(SP.craftable), rng, owner: naiAcc.id, aiOwner: true });
            naiAcc.tokens[t.id] = t;
          }
          naiAcc.pouches = [];
          naiAcc.stall.name = name + '’s Stall';
          G.world.accounts[naiAcc.id] = naiAcc;
          G.saveNow(); rerender();
        },
      }));
      const tbl = U.el('table', { cls: 'adm' });
      tbl.appendChild(U.el('tr', {}, ['Name', 'Lv', 'Gold', 'Tokens', 'Region', 'Style', 'Market', 'Skill', 'Tourneys', 'Active', ''].map(h => U.el('th', { text: h }))));
      Object.values(G.world.accounts).filter(a => a.ai).forEach(a => {
        const tr = U.el('tr', {});
        tr.appendChild(U.el('td', { text: a.displayName + (a.aiCfg.merchant ? ' 🏪' : '') }));
        tr.appendChild(U.el('td', { text: a.level }));
        tr.appendChild(U.el('td', { text: U.fmt(a.gold) }));
        tr.appendChild(U.el('td', { text: Object.keys(a.tokens).length }));
        tr.appendChild(U.el('td', { text: (EC.REGIONS.find(r => r.id === a.region) || {}).name || a.region }));
        tr.appendChild(U.el('td', { text: a.aiCfg.playStyle }));
        tr.appendChild(U.el('td', { text: Math.round(a.aiCfg.marketActivity * 100) + '%' }));
        tr.appendChild(U.el('td', { text: Math.round(G.aiSkill(a) * 100) + '%' }));
        tr.appendChild(U.el('td', { text: a.aiCfg.tournaments ? '✓' : '—' }));
        tr.appendChild(U.el('td', { text: a.aiCfg.active ? '✓' : '✗ disabled' }));
        const td = U.el('td', {});
        td.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Edit', onclick: () => editAI(a) }));
        tr.appendChild(td);
        tbl.appendChild(tr);
      });
      body.appendChild(tbl);
    },

    /* ================= MARKET MONITOR ================= */
    'Market Monitor'(body) {
      /* ---- the shared ONLINE market ---- */
      const MO = DYA.marketOnline;
      const obox = U.el('div', { cls: 'panel mb' });
      obox.appendChild(U.el('h3', { cls: 'gold mb', text: '🌐 Online market — the shared, real player-to-player market' }));
      if (!MO || !MO.configured()) {
        obox.appendChild(U.el('p', { cls: 'muted small', text: 'Online is not configured (js/config.js). Only the local Dya’kukull stalls exist.' }));
      } else {
        obox.appendChild(U.el('p', { cls: 'muted small', text: 'One row = one unique token. Buying is atomic — the first buyer takes it and it leaves the market for everyone. Pulling an active listing returns the token to its seller.' }));
        const holder = U.el('div', {});
        obox.appendChild(holder);
        holder.appendChild(U.el('p', { cls: 'small muted', text: 'Loading online listings…' }));
        MO.adminFetchAll().then(rows => {
          holder.innerHTML = '';
          if (!rows || !rows.length) { holder.appendChild(U.el('p', { cls: 'muted small', text: 'No online listings yet.' })); return; }
          const tbl = U.el('table', { cls: 'adm' });
          tbl.appendChild(U.el('tr', {}, ['Token', 'Species', 'Seller', 'Price', 'Status', 'Buyer', 'When', ''].map(h => U.el('th', { text: h }))));
          rows.forEach(row => {
            const sp = row.token && SP.get(row.token.speciesId);
            const tr = U.el('tr', {});
            tr.appendChild(U.el('td', { text: row.token ? row.token.name : row.token_id }));
            tr.appendChild(U.el('td', { text: sp ? sp.name : (row.token ? row.token.speciesId : '?') }));
            tr.appendChild(U.el('td', { text: row.seller_name || '?' }));
            tr.appendChild(U.el('td', { text: U.fmt(row.price) + 'g' }));
            tr.appendChild(U.el('td', { html: row.status === 'active' ? '<span class="gold">active</span>' : row.status === 'sold' ? 'sold' : 'cancelled' }));
            tr.appendChild(U.el('td', { text: row.buyer_name || '—' }));
            tr.appendChild(U.el('td', { text: U.timeAgo(Date.parse(row.created_at) || Date.now()) }));
            const td = U.el('td', {});
            if (row.status === 'active') {
              td.appendChild(U.el('button', {
                cls: 'btn small danger', text: 'Pull', onclick: async () => {
                  const r = await MO.adminPull(row.id);
                  alert(r.pulled ? 'Pulled. The token returns to its seller on their next sync.' : 'Too late — it already sold or was cancelled.');
                  rerender();
                },
              }));
            }
            tr.appendChild(td);
            tbl.appendChild(tr);
          });
          holder.appendChild(tbl);
        }).catch(e => {
          holder.innerHTML = '';
          holder.appendChild(U.el('p', { cls: 'small', style: 'color:var(--red)', text: '⚠ Could not load online listings: ' + e.message + (/(relation|table)/i.test(e.message) ? ' — re-run supabase/schema.sql to add the dya_listings table.' : '') }));
        });
      }
      body.appendChild(obox);

      /* ---- local (Dya'kukull) market ---- */
      const lsts = Object.values(G.world.market.listings);
      const offers = Object.values(G.world.market.offers);
      body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Local stalls (this world’s Dya’kukull + this device)' }));
      body.appendChild(U.el('p', { cls: 'muted small mb', text: lsts.length + ' active listings · ' + offers.length + ' open negotiations. Market manipulation (hoarding to control prices) is a Guild violation — watch for it here.' }));
      const tbl = U.el('table', { cls: 'adm' });
      tbl.appendChild(U.el('tr', {}, [U.el('th', { text: 'Token' }), U.el('th', { text: 'Seller' }), U.el('th', { text: 'Price' }), U.el('th', { text: 'Mkt avg' }), U.el('th', { text: 'Status' }), U.el('th', { text: '' })]));
      lsts.sort((a, b) => b.price - a.price).slice(0, 60).forEach(l => {
        const seller = G.world.accounts[l.sellerId];
        const tok = seller && seller.tokens[l.tokenId];
        if (!tok) return;
        const avg = G.marketAverage(tok.speciesId, tok.rarity);
        const sus = l.price > avg * 3;
        const tr = U.el('tr', {}, [
          U.el('td', { text: tok.name + ' (' + (SP.get(tok.speciesId) || { name: tok.speciesId }).name + ')' }),
          U.el('td', { text: seller.displayName + (seller.ai ? ' (AI)' : '') }),
          U.el('td', { html: (sus ? '<span style="color:var(--red)">' : '') + U.fmt(l.price) + 'g' + (sus ? ' ⚠</span>' : '') }),
          U.el('td', { text: U.fmt(avg) + 'g' }),
          U.el('td', { text: l.status }),
        ]);
        const td = U.el('td', {});
        td.appendChild(U.el('button', { cls: 'btn small danger', text: 'Pull', onclick: () => { G.removeListing(l.id); rerender(); } }));
        tr.appendChild(td);
        tbl.appendChild(tr);
      });
      body.appendChild(tbl);
      body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Trusted seller badge' }));
      const sel = U.el('select', { cls: 'txt', style: 'max-width:260px' });
      Object.values(G.world.accounts).filter(a => !a.trustedSeller).forEach(a => sel.appendChild(U.el('option', { value: a.id, text: a.displayName })));
      body.appendChild(U.el('div', { cls: 'flex' }, [sel, U.el('button', { cls: 'btn small', text: 'Grant badge', onclick: () => { G.admin.grantTrusted(sel.value); rerender(); } })]));
    },

    /* ================= SPAWN TOKENS ================= */
    'Spawn Tokens'(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'Spawn tokens into any account — prizes, events, testing.' }));
      const acc = U.el('select', { cls: 'txt' });
      Object.values(G.world.accounts).forEach(a => acc.appendChild(U.el('option', { value: a.id, text: a.displayName + (a.ai ? ' (AI)' : '') })));
      const spc = U.el('select', { cls: 'txt' });
      SP.list.forEach(s => spc.appendChild(U.el('option', { value: s.id, text: s.name })));
      const rar = U.el('select', { cls: 'txt' });
      SP.RARITIES.forEach((r, i) => rar.appendChild(U.el('option', { value: i, text: r })));
      /* §4 famous tokens: given name + whether the recipient may rename it */
      const fname = U.el('input', { cls: 'txt', maxlength: 24, placeholder: '(species name)' });
      const editSel = U.el('select', { cls: 'txt' });
      [['no', 'Name locked (famous)'], ['yes', 'Owner may rename']].forEach(([v, l]) => editSel.appendChild(U.el('option', { value: v, text: l })));
      body.appendChild(U.el('div', { cls: 'grid', style: 'grid-template-columns:1fr 1fr 1fr;gap:10px;align-items:end' }, [
        U.el('div', {}, [U.el('label', { cls: 'lbl', text: 'Account' }), acc]),
        U.el('div', {}, [U.el('label', { cls: 'lbl', text: 'Species' }), spc]),
        U.el('div', {}, [U.el('label', { cls: 'lbl', text: 'Rarity' }), rar]),
      ]));
      body.appendChild(U.el('div', { cls: 'grid', style: 'grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;margin-top:8px' }, [
        U.el('div', {}, [U.el('label', { cls: 'lbl', text: 'Famous name (optional)' }), fname]),
        U.el('div', {}, [U.el('label', { cls: 'lbl', text: 'Name editable?' }), editSel]),
        U.el('button', {
          cls: 'btn primary', text: 'Spawn', onclick: () => {
            const r = G.admin.spawnToken(acc.value, spc.value, parseInt(rar.value), { name: fname.value.trim() || null, nameEditable: editSel.value === 'yes' });
            if (r.tok) alert('Spawned "' + r.tok.name + '" into ' + G.world.accounts[acc.value].displayName + '\'s collection.' + (r.tok.nameLocked ? ' (name locked)' : ''));
          },
        }),
      ]));
      body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Resource grants' }));
      const gold = U.el('input', { cls: 'txt', type: 'number', placeholder: 'Gold' });
      const ngak = U.el('input', { cls: 'txt', type: 'number', placeholder: 'NgAkara' });
      body.appendChild(U.el('div', { cls: 'flex' }, [gold, ngak, U.el('button', {
        cls: 'btn', text: 'Grant to selected account', onclick: () => {
          const a = G.world.accounts[acc.value];
          a.gold += parseInt(gold.value) || 0;
          a.ngakara += parseInt(ngak.value) || 0;
          G.saveNow(); alert('Granted.');
        },
      })]));
    },

    /* ================= TOURNAMENTS ================= */
    Tournaments(body) {
      body.appendChild(U.el('div', { cls: 'flex mb' }, [
        U.el('button', {
          cls: 'btn primary', text: '⚡ ACTIVATE INTERPLANETARY', onclick: () => {
            G.admin.activateInterplanetary();
            alert('Interplanetary activated. The season ends with its conclusion.');
            rerender();
          },
        }),
        U.el('button', {
          cls: 'btn danger', text: 'End season now (reset ceremony)', onclick: () => {
            if (!confirm('End the ranked season?')) return;
            G.admin.endSeason();
            rerender();
          },
        }),
        U.el('button', { cls: 'btn ghost', text: 'Seed fresh circuit tournaments', onclick: () => { G.seedTournamentsForAdmin(); rerender(); } }),
      ]));
      body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Season ' + G.world.season.number + ' winners so far' }));
      if (!G.world.season.winners.length) body.appendChild(U.el('p', { cls: 'muted small', text: 'None yet.' }));
      G.world.season.winners.forEach(w => body.appendChild(U.el('div', { cls: 'small', text: '🏆 ' + w.name + ' — ' + w.tournament + ' (' + w.circuit + ')' })));
      body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'All tournaments' }));
      const tbl = U.el('table', { cls: 'adm' });
      tbl.appendChild(U.el('tr', {}, [U.el('th', { text: 'Name' }), U.el('th', { text: 'Circuit' }), U.el('th', { text: 'State' }), U.el('th', { text: 'Players' }), U.el('th', { text: '' })]));
      Object.values(G.world.tournaments).forEach(t => {
        const tr = U.el('tr', {}, [U.el('td', { text: t.name + (t.sealed ? ' 🔴' : '') }), U.el('td', { text: t.circuit }), U.el('td', { text: t.state }), U.el('td', { text: t.players.length + '/' + t.size })]);
        const td = U.el('td', {});
        td.appendChild(U.el('button', { cls: 'btn small danger', text: 'Delete', onclick: () => { delete G.world.tournaments[t.id]; G.saveNow(); rerender(); } }));
        tr.appendChild(td);
        tbl.appendChild(tr);
      });
      body.appendChild(tbl);
    },

    /* ================= BANS & APPEALS ================= */
    'Bans & Appeals'(body) {
      body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Issue a ban' }));
      const sel = U.el('select', { cls: 'txt', style: 'max-width:260px' });
      Object.values(G.world.accounts).forEach(a => sel.appendChild(U.el('option', { value: a.id, text: a.displayName + (a.ai ? ' (AI)' : '') })));
      const reason = U.el('input', { cls: 'txt', style: 'max-width:260px', placeholder: 'Public reason' });
      const days = U.el('input', { cls: 'txt', type: 'number', style: 'max-width:110px', placeholder: 'Days (blank = permanent)' });
      body.appendChild(U.el('div', { cls: 'flex mb' }, [sel, reason, days,
        U.el('button', { cls: 'btn danger', text: 'Ban', onclick: () => { if (!reason.value) return; G.admin.ban(sel.value, reason.value, parseInt(days.value) || null); rerender(); } })]));
      body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Active bans (public record)' }));
      Object.entries(G.world.bans).forEach(([id, b]) => {
        const a = G.world.accounts[id];
        const row = U.el('div', { cls: 'banlist-row flex' });
        row.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + U.esc(a ? a.displayName : id) + '</b> — ' + U.esc(b.reason) + ' <span class="small muted">(' + (b.permanent ? 'permanent' : 'until ' + U.fmtClock(b.until)) + ')</span>' }));
        row.appendChild(U.el('button', { cls: 'btn small', text: 'Lift', onclick: () => { G.admin.unban(id); rerender(); } }));
        body.appendChild(row);
      });
      body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Reports & appeals' }));
      const open = G.world.appeals.filter(x => x.open);
      if (!open.length) body.appendChild(U.el('p', { cls: 'muted small', text: 'Inbox zero. Historic.' }));
      open.forEach(rep => {
        if (rep.kind === 'tokenReport') return; // shown in Flagged Tokens
        const by = G.world.accounts[rep.by];
        const against = rep.against ? G.world.accounts[rep.against] : null;
        const row = U.el('div', { cls: 'panel mb' });
        row.appendChild(U.el('div', { html: '<b>' + rep.kind + '</b> from ' + U.esc(by ? by.displayName : '?') + (against ? ' against <b>' + U.esc(against.displayName) + '</b>' : '') + '<br><span class="small muted">' + U.esc(rep.reason || '') + ' ' + U.esc(rep.note || '') + ' · ' + U.timeAgo(rep.at) + '</span>' }));
        const acts = U.el('div', { cls: 'flex mt' });
        acts.appendChild(U.el('button', { cls: 'btn small', text: 'Dismiss', onclick: () => { rep.open = false; G.saveNow(); rerender(); } }));
        if (rep.kind === 'avizuSubmission') {
          acts.appendChild(U.el('button', {
            cls: 'btn small primary', text: 'Approve → publish in Avizu’Vac', onclick: () => {
              G.world.avizu.unshift({ id: U.uid('av'), at: Date.now(), title: 'From the community', body: rep.note });
              rep.open = false; G.saveNow(); rerender();
            },
          }));
        }
        if (against) acts.appendChild(U.el('button', { cls: 'btn small danger', text: 'Ban them', onclick: () => { G.admin.ban(against.id, rep.reason || 'Guild ruling', 7); rep.open = false; G.saveNow(); rerender(); } }));
        row.appendChild(acts);
        body.appendChild(row);
      });
    },

    /* ================= FLAGGED TOKENS ================= */
    'Flagged Tokens'(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'Trigger: player report only. Tokens function normally until you OPEN the review — then they freeze until you rule. Outcomes: cleared, corrected, deleted, or player penalized.' }));
      const reports = G.world.appeals.filter(x => x.kind === 'tokenReport' && x.open);
      if (!reports.length) body.appendChild(U.el('p', { cls: 'muted', text: 'No token reports.' }));
      reports.forEach(rep => {
        const owner = G.world.accounts[rep.against];
        const tok = owner && owner.tokens[rep.tokenId];
        const row = U.el('div', { cls: 'panel mb' });
        row.appendChild(U.el('div', { html: '<b>' + U.esc(tok ? tok.name : '(token gone)') + '</b> owned by ' + U.esc(owner ? owner.displayName : '?') + '<br><span class="small muted">' + (tok ? (SP.get(tok.speciesId) || { name: tok.speciesId }).name + ' · ' + SP.RARITIES[tok.rarity] : '') + ' · reported ' + U.timeAgo(rep.at) + (rep.reviewing ? ' · ❄ FROZEN, under review' : ' · functioning normally') + '</span>' }));
        const acts = U.el('div', { cls: 'flex mt' });
        if (!rep.reviewing) {
          acts.appendChild(U.el('button', { cls: 'btn small', text: 'Open review (freezes token)', onclick: () => { G.admin.openReport(rep.id); rerender(); } }));
        } else {
          ['cleared', 'corrected', 'deleted', 'player penalized'].forEach(outcome => {
            acts.appendChild(U.el('button', {
              cls: 'btn small' + (outcome === 'deleted' || outcome === 'player penalized' ? ' danger' : ''), text: outcome, onclick: () => {
                G.admin.resolveReport(rep.id, outcome);
                if (outcome === 'player penalized' && owner) G.admin.ban(owner.id, 'Token rule violation', 3);
                rerender();
              },
            }));
          });
        }
        row.appendChild(acts);
        body.appendChild(row);
      });
    },

    /* ================= ANNOUNCEMENTS ================= */
    Announcements(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'Broadcast to the main landing page and every player’s notifications.' }));
      const title = U.el('input', { cls: 'txt', placeholder: 'Title' });
      const txt = U.el('textarea', { cls: 'txt mt', rows: 3, placeholder: 'Body' });
      body.appendChild(title); body.appendChild(txt);
      body.appendChild(U.el('button', { cls: 'btn primary mt', text: '📣 Broadcast', onclick: () => { if (!title.value) return; G.admin.announce(title.value, txt.value); title.value = ''; txt.value = ''; rerender(); } }));
      body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Publish to the Avizu’Vac' }));
      const at = U.el('input', { cls: 'txt', placeholder: 'Avizu title' });
      const ab = U.el('textarea', { cls: 'txt mt', rows: 2, placeholder: 'Body' });
      body.appendChild(at); body.appendChild(ab);
      body.appendChild(U.el('button', { cls: 'btn mt', text: 'Publish', onclick: () => { if (!at.value) return; G.world.avizu.unshift({ id: U.uid('av'), at: Date.now(), title: at.value, body: ab.value }); G.saveNow(); at.value = ''; ab.value = ''; rerender(); } }));
      body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Recent announcements' }));
      G.world.announcements.slice(0, 8).forEach(a => body.appendChild(U.el('div', { cls: 'news-card' }, [U.el('div', { cls: 'nc-title', text: a.title }), U.el('div', { cls: 'nc-body', text: a.body })])));
    },

    /* ================= GOD MODE ================= */
    'God Mode'(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'Anything. Everything. No confirmation beyond the ones below. You were warned by this sentence.' }));
      body.appendChild(U.el('h3', { cls: 'gold mb', text: 'World save' }));
      body.appendChild(U.el('div', { cls: 'flex mb', style: 'flex-wrap:wrap' }, [
        U.el('button', {
          cls: 'btn', text: '⬇ Export world save', onclick: () => {
            const blob = new Blob([DYA.store.export()], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'dyaakara-world-' + Date.now() + '.json';
            a.click();
          },
        }),
        U.el('button', {
          cls: 'btn', text: '⬆ Import world save', onclick: () => {
            const inp = document.createElement('input');
            inp.type = 'file'; inp.accept = '.json';
            inp.onchange = () => {
              const f = inp.files[0]; if (!f) return;
              const r = new FileReader();
              r.onload = () => { try { DYA.store.import(r.result); alert('Imported. Reloading.'); location.reload(); } catch (e) { alert('Bad file: ' + e.message); } };
              r.readAsText(f);
            };
            inp.click();
          },
        }),
        U.el('button', {
          cls: 'btn danger', text: '☠ RESET ENTIRE WORLD', onclick: () => {
            if (!confirm('Destroy every account, token, and market listing, and regenerate the world?')) return;
            if (!confirm('Really? There is no undo. The Guild keeps no backups it will admit to.')) return;
            DYA.store.reset(); location.reload();
          },
        }),
      ]));
      body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Game edits (overrides)' }));
      body.appendChild(syncLine());
      body.appendChild(U.el('div', { cls: 'flex mb', style: 'flex-wrap:wrap' }, [
        U.el('button', {
          cls: 'btn', text: '⬇ Export game edits', onclick: () => {
            const blob = new Blob([M.export()], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'dyaakara-mods-' + Date.now() + '.json';
            a.click();
          },
        }),
        U.el('button', {
          cls: 'btn', text: '⬆ Import game edits', onclick: () => {
            const inp = document.createElement('input');
            inp.type = 'file'; inp.accept = '.json';
            inp.onchange = () => {
              const f = inp.files[0]; if (!f) return;
              const r = new FileReader();
              r.onload = () => { try { M.import(r.result); alert('Imported and applied.'); rerender(); } catch (e) { alert('Bad file: ' + e.message); } };
              r.readAsText(f);
            };
            inp.click();
          },
        }),
        U.el('button', {
          cls: 'btn', text: '🌐 Push to all players now', onclick: async () => {
            const r = await M.pushRemote();
            alert(r.ok ? 'Pushed. Every game picks it up within a minute.' : 'Push failed: ' + r.err);
            rerender();
          },
        }),
        U.el('button', {
          cls: 'btn', text: '🌐 Fetch latest from online', onclick: async () => {
            const r = await M.fetchRemote();
            alert(r.ok ? (r.adopted ? 'Adopted a newer online revision.' : 'This panel already has the newest revision.') : 'Fetch failed: ' + r.err);
            rerender();
          },
        }),
        U.el('button', {
          cls: 'btn danger', text: '☠ Reset ALL game edits to defaults', onclick: () => {
            if (!confirm('Remove every creature, text, balance, and AI override, restoring the game as shipped?')) return;
            M.resetAll();
            alert('All overrides cleared.' + (M.configured() ? ' The reset propagates to every player.' : ''));
            rerender();
          },
        }),
      ]));
      body.appendChild(U.el('p', { cls: 'small muted', text: 'World created ' + U.fmtClock(G.world.createdAt) + ' · storage backend: ' + DYA.store.backend + ' · edits stored as overrides in this browser' + (M.configured() ? ' and in Supabase (dya_config)' : '') + '.' }));
    },
  };

  /* ================= SPRITE PREVIEW ================= */
  const previewLoops = [];
  function stopPreviews() { previewLoops.forEach(fn => fn()); previewLoops.length = 0; }
  function spriteThumb(sp, size) {
    const cv = U.el('canvas', { width: size, height: size, style: 'flex:none' });
    const ctx = cv.getContext('2d');
    try {
      ctx.translate(size / 2, size * 0.62);
      DYA.sprites.draw(ctx, { sp, r: size * 0.32, state: 'idle', t: 1.3, biolum: true });
    } catch (e) { /* a bad features JSON must not kill the panel */ }
    return cv;
  }
  function livePreview(spGetter) {
    const holder = U.el('div', { cls: 'center' });
    const cv = U.el('canvas', { width: 300, height: 210, style: 'background:radial-gradient(ellipse at 50% 70%, #241c10, #14100a);border:1px solid #4a3b24;border-radius:10px' });
    const ctx = cv.getContext('2d');
    let state = 'idle', stopped = false;
    const t0 = performance.now();
    (function loop(now) {
      if (stopped) return;
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.save();
      ctx.translate(cv.width / 2, cv.height * 0.62);
      try { DYA.sprites.draw(ctx, { sp: spGetter(), r: 44, state, t, biolum: true, shimmer: true }); }
      catch (e) { ctx.fillStyle = '#c33'; ctx.fillText('sprite error: ' + e.message, -130, 0); }
      ctx.restore();
      requestAnimationFrame(loop);
    })(t0);
    previewLoops.push(() => { stopped = true; });
    holder.appendChild(cv);
    const states = U.el('div', { cls: 'flex mt', style: 'flex-wrap:wrap;gap:4px;justify-content:center' });
    ['idle', 'walk', 'run', 'attack', 'hit', 'dormant', 'special', 'death'].forEach(s => {
      const b = U.el('button', { cls: 'btn small' + (s === 'idle' ? ' primary' : ''), text: s });
      b.onclick = () => { state = s; U.qsa('button', states).forEach(x => x.classList.remove('primary')); b.classList.add('primary'); };
      states.appendChild(b);
    });
    holder.appendChild(states);
    return holder;
  }

  /* ================= SPECIES EDITOR ================= */
  const RIGS = ['quad', 'biped', 'flame', 'swarm', 'tree', 'blob', 'field', 'relic', 'crab', 'mcfly', 'bird'];
  function editSpecies(id) {
    const sp = SP.get(id);
    /* working copy — nothing applies until Save */
    const work = U.deepCopy(sp);
    delete work._custom;
    const isCustom = M.isCustom(id);
    const { w, close } = modal('3% 6%');
    const closeAll = () => { stopPreviews(); close(); rerender(); };
    w.appendChild(U.el('h2', { cls: 'gold', text: (isCustom ? 'Custom species — ' : 'Species — ') + sp.name + '  (' + id + ')' }));
    if (M.isEdited(id)) w.appendChild(U.el('p', { cls: 'small gold', text: 'This species carries live edits. "Reset to default" restores it as shipped.' }));

    const cols = U.el('div', { cls: 'grid', style: 'grid-template-columns:320px 1fr;gap:18px;align-items:start' });
    w.appendChild(cols);

    /* ---------- LEFT: sprite ---------- */
    const left = U.el('div', {});
    cols.appendChild(left);
    left.appendChild(U.el('h3', { cls: 'gold mb', text: 'Sprite' }));
    left.appendChild(livePreview(() => work));

    const rig = U.el('select', { cls: 'txt' });
    RIGS.forEach(r => rig.appendChild(U.el('option', { value: r, text: r })));
    rig.value = work.rig || 'quad';
    rig.onchange = () => work.rig = rig.value;
    lblIn(left, 'Rig (placeholder body type)', rig);

    const c1 = U.el('input', { cls: 'txt', type: 'color', value: /^#[0-9a-f]{6}$/i.test(work.color || '') ? work.color : '#888888' });
    c1.oninput = () => work.color = c1.value;
    lblIn(left, 'Primary color', c1);
    const c2 = U.el('input', { cls: 'txt', type: 'color', value: /^#[0-9a-f]{6}$/i.test(work.color2 || '') ? work.color2 : '#555555' });
    c2.oninput = () => work.color2 = c2.value;
    lblIn(left, 'Secondary color', c2);

    const feats = U.el('textarea', { cls: 'txt', rows: 5, style: 'font-family:monospace;font-size:11px' });
    feats.value = JSON.stringify(work.features || {}, null, 1);
    const featErr = U.el('div', { cls: 'small', style: 'color:var(--red);min-height:14px' });
    feats.oninput = () => {
      try { work.features = JSON.parse(feats.value); featErr.textContent = ''; }
      catch (e) { featErr.textContent = 'Invalid JSON — preview keeps the last valid features.'; }
    };
    lblIn(left, 'Feature layers (JSON — wings, horns, vines, heads, shell, flame…)', feats);
    left.appendChild(featErr);

    /* ---- custom image sprite ---- */
    left.appendChild(U.el('label', { cls: 'lbl', text: 'Custom image (replaces the rig everywhere; auto-shrunk to 96px)' }));
    const imgRow = U.el('div', { cls: 'flex' });
    const upBtn = U.el('button', { cls: 'btn small', text: work.spriteImg ? 'Replace image…' : 'Upload image…' });
    upBtn.onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = () => {
        const f = inp.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          const im = new Image();
          im.onload = () => {
            const max = 96;
            const scale = Math.min(1, max / Math.max(im.width, im.height));
            const cnv = document.createElement('canvas');
            cnv.width = Math.max(1, Math.round(im.width * scale));
            cnv.height = Math.max(1, Math.round(im.height * scale));
            cnv.getContext('2d').drawImage(im, 0, 0, cnv.width, cnv.height);
            work.spriteImg = cnv.toDataURL('image/png');
            upBtn.textContent = 'Replace image…';
          };
          im.src = rd.result;
        };
        rd.readAsDataURL(f);
      };
      inp.click();
    };
    imgRow.appendChild(upBtn);
    imgRow.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Remove image (back to rig)', onclick: () => { delete work.spriteImg; upBtn.textContent = 'Upload image…'; } }));
    left.appendChild(imgRow);

    /* ---------- RIGHT: identity, stats, behavior, text ---------- */
    const right = U.el('div', {});
    cols.appendChild(right);

    right.appendChild(U.el('h3', { cls: 'gold mb', text: 'Identity & stats' }));
    const g1 = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px' });
    right.appendChild(g1);
    function cell(parent, label, el) {
      const c = U.el('div', {});
      c.appendChild(U.el('label', { cls: 'lbl', text: label }));
      c.appendChild(el);
      parent.appendChild(c);
      return el;
    }
    const nameIn = cell(g1, 'Name', U.el('input', { cls: 'txt', value: work.name }));
    nameIn.oninput = () => work.name = nameIn.value;
    const famIn = cell(g1, 'Family', U.el('input', { cls: 'txt', value: work.family || '' }));
    famIn.oninput = () => work.family = famIn.value;
    const el1 = cell(g1, 'Element', U.el('select', { cls: 'txt' }));
    SP.ELEMENTS.forEach(e => el1.appendChild(U.el('option', { value: e, text: e + ' (' + SP.ELEMENT_NAMES[e] + ')' })));
    el1.value = work.element; el1.onchange = () => work.element = el1.value;
    const el2 = cell(g1, 'Second element', U.el('select', { cls: 'txt' }));
    el2.appendChild(U.el('option', { value: '', text: '— none —' }));
    SP.ELEMENTS.forEach(e => el2.appendChild(U.el('option', { value: e, text: e })));
    el2.value = work.element2 || ''; el2.onchange = () => { if (el2.value) work.element2 = el2.value; else delete work.element2; };
    const rlo = cell(g1, 'Rarity min', U.el('select', { cls: 'txt' }));
    const rhi = cell(g1, 'Rarity max', U.el('select', { cls: 'txt' }));
    SP.RARITIES.forEach((r, i) => { rlo.appendChild(U.el('option', { value: i, text: r })); rhi.appendChild(U.el('option', { value: i, text: r })); });
    rlo.value = work.rarity[0]; rhi.value = work.rarity[1];
    const syncR = () => work.rarity = [Math.min(+rlo.value, +rhi.value), Math.max(+rlo.value, +rhi.value)];
    rlo.onchange = syncR; rhi.onchange = syncR;
    const slo = cell(g1, 'Size min', U.el('select', { cls: 'txt' }));
    const shi = cell(g1, 'Size max', U.el('select', { cls: 'txt' }));
    SP.SIZES.forEach((s, i) => { slo.appendChild(U.el('option', { value: i, text: s })); shi.appendChild(U.el('option', { value: i, text: s })); });
    slo.value = work.size[0]; shi.value = work.size[1];
    const syncS = () => work.size = [Math.min(+slo.value, +shi.value), Math.max(+slo.value, +shi.value)];
    slo.onchange = syncS; shi.onchange = syncS;
    work.statMul = work.statMul || { hp: 1, dmg: 1, speed: 1 };
    const hpIn = cell(g1, 'HP ×', numIn(work.statMul.hp, { step: 0.05 }));
    hpIn.oninput = () => work.statMul.hp = parseFloat(hpIn.value) || 0;
    const dmgIn = cell(g1, 'Damage ×', numIn(work.statMul.dmg, { step: 0.05 }));
    dmgIn.oninput = () => work.statMul.dmg = parseFloat(dmgIn.value) || 0;
    const spdIn = cell(g1, 'Speed ×', numIn(work.statMul.speed, { step: 0.05 }));
    spdIn.oninput = () => work.statMul.speed = parseFloat(spdIn.value) || 0;
    const rngIn = cell(g1, 'Attack range (px, 0 = never fights)', numIn(work.attackRange || 0, {}));
    rngIn.oninput = () => work.attackRange = parseFloat(rngIn.value) || 0;

    const tagsIn = U.el('input', { cls: 'txt', value: (work.tags || []).join(', ') });
    tagsIn.oninput = () => work.tags = tagsIn.value.split(',').map(s => s.trim()).filter(Boolean);
    lblIn(right, 'Tags (comma-separated: carnivore, apex, flyer, prey, stationary, pack, su…)', tagsIn);

    /* behavior */
    right.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Behavior' }));
    const behSel = U.el('select', { cls: 'txt' });
    Object.keys(DYA.behaviors || {}).sort().forEach(b => behSel.appendChild(U.el('option', { value: b, text: b })));
    behSel.value = work.behavior || 'inert';
    behSel.onchange = () => work.behavior = behSel.value;
    lblIn(right, 'Decision tree (how it thinks on the field — reuse any species’ tree)', behSel);
    const craftChk = U.el('div', { cls: 'toggle' + (work.notCraftable ? '' : ' on'), style: 'margin-top:4px' });
    craftChk.onclick = () => { if (work.notCraftable) delete work.notCraftable; else work.notCraftable = true; craftChk.classList.toggle('on'); };
    lblIn(right, 'Craftable / obtainable by players', craftChk);

    /* per-individual variable ranges */
    right.appendChild(U.el('label', { cls: 'lbl', text: 'Per-individual variables — every minted token rolls between low and high' }));
    const varsBox = U.el('div', {});
    right.appendChild(varsBox);
    function paintVars() {
      varsBox.innerHTML = '';
      Object.entries(work.vars || {}).forEach(([k, range]) => {
        const r = U.el('div', { cls: 'flex', style: 'gap:6px;margin-bottom:4px' });
        const kIn = U.el('input', { cls: 'txt', value: k, style: 'flex:2' });
        const lo = numIn(range[0], { step: 'any', style: 'flex:1' });
        const hi = numIn(range[1], { step: 'any', style: 'flex:1' });
        const upd = () => {
          const nk = kIn.value.trim();
          if (nk !== k) { delete work.vars[k]; paintVarsSoon(); }
          if (nk) work.vars[nk] = [parseFloat(lo.value) || 0, parseFloat(hi.value) || 0];
        };
        let t2 = null;
        function paintVarsSoon() { clearTimeout(t2); t2 = setTimeout(paintVars, 600); }
        kIn.onchange = upd; lo.oninput = upd; hi.oninput = upd;
        r.appendChild(kIn); r.appendChild(lo); r.appendChild(hi);
        r.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { delete work.vars[k]; paintVars(); } }));
        varsBox.appendChild(r);
      });
      varsBox.appendChild(U.el('button', {
        cls: 'btn small ghost', text: '＋ Add variable', onclick: () => {
          work.vars = work.vars || {};
          work.vars['newVar' + Object.keys(work.vars).length] = [0, 1];
          paintVars();
        },
      }));
    }
    paintVars();

    /* picks */
    right.appendChild(U.el('label', { cls: 'lbl', text: 'Trait picks — each token gets ONE option per row (repeat an option to weight it)' }));
    const picksBox = U.el('div', {});
    right.appendChild(picksBox);
    function parsePickList(s) {
      return s.split(',').map(x => x.trim()).filter(x => x !== '').map(x => (x !== '' && !isNaN(Number(x))) ? Number(x) : x);
    }
    function paintPicks() {
      picksBox.innerHTML = '';
      Object.entries(work.picks || {}).forEach(([k, opts]) => {
        const r = U.el('div', { cls: 'flex', style: 'gap:6px;margin-bottom:4px' });
        const kIn = U.el('input', { cls: 'txt', value: k, style: 'flex:1' });
        const oIn = U.el('input', { cls: 'txt', value: opts.join(', '), style: 'flex:3' });
        const upd = () => {
          const nk = kIn.value.trim();
          if (nk !== k) delete work.picks[k];
          if (nk) work.picks[nk] = parsePickList(oIn.value);
        };
        kIn.onchange = upd; oIn.onchange = upd;
        r.appendChild(kIn); r.appendChild(oIn);
        r.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { delete work.picks[k]; paintPicks(); } }));
        picksBox.appendChild(r);
      });
      picksBox.appendChild(U.el('button', {
        cls: 'btn small ghost', text: '＋ Add pick', onclick: () => {
          work.picks = work.picks || {};
          work.picks['newPick' + Object.keys(work.picks).length] = ['option A', 'option B'];
          paintPicks();
        },
      }));
    }
    paintPicks();

    /* dictionary text */
    right.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Vakarborac dictionary text' }));
    const descIn = U.el('textarea', { cls: 'txt', rows: 2 }); descIn.value = work.desc || '';
    descIn.oninput = () => work.desc = descIn.value;
    lblIn(right, 'Description', descIn);
    const tempIn = U.el('textarea', { cls: 'txt', rows: 2 }); tempIn.value = work.temperament || '';
    tempIn.oninput = () => work.temperament = tempIn.value;
    lblIn(right, 'Temperament', tempIn);
    const specIn = U.el('textarea', { cls: 'txt', rows: 2 }); specIn.value = work.special || '';
    specIn.oninput = () => work.special = specIn.value;
    lblIn(right, 'Special rules (field notes)', specIn);

    /* ---------- actions ---------- */
    const acts = U.el('div', { cls: 'flex mt', style: 'gap:8px;flex-wrap:wrap' });
    acts.appendChild(U.el('button', {
      cls: 'btn primary', text: '💾 Save' + (M.configured() ? ' & push to all players' : ''), onclick: () => {
        try { work.features = JSON.parse(feats.value); } catch (e) { /* keep last valid */ }
        M.setSpecies(id, work);
        closeAll();
      },
    }));
    acts.appendChild(U.el('button', {
      cls: 'btn', text: '⧉ Clone into new species', onclick: () => {
        const nm = prompt('Name for the new species:', work.name + ' Variant');
        if (!nm) return;
        let nid = nm.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'custom';
        while (SP.get(nid)) nid += '_2';
        const def = U.deepCopy(work);
        def.name = nm;
        M.data.customSpecies[nid] = def;
        M.save();
        closeAll();
        editSpecies(nid);
      },
    }));
    if (!isCustom) {
      acts.appendChild(U.el('button', {
        cls: 'btn ghost', text: '↺ Reset to default', onclick: () => {
          if (!confirm('Restore ' + sp.name + ' exactly as shipped?')) return;
          M.resetSpecies(id); closeAll();
        },
      }));
    } else {
      acts.appendChild(U.el('button', {
        cls: 'btn danger', text: '🗑 Delete custom species', onclick: () => {
          if (!confirm('Delete ' + sp.name + '? Any already-minted tokens of this species will break — spawn replacements or clean them up.')) return;
          M.resetSpecies(id); closeAll();
        },
      }));
    }
    acts.appendChild(U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: closeAll }));
    w.appendChild(acts);
  }

  /* ================= ACCOUNT / AI EDITORS ================= */
  function editAccount(a) {
    const { w, close } = modal('10% 22%');
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Edit — ' + a.displayName }));
    const fields = [['displayName', 'Name', 'text'], ['level', 'Level', 'number'], ['gold', 'Gold', 'number'], ['ngakara', 'NgAkara', 'number'], ['rank', 'Rank', 'number']];
    const inputs = {};
    fields.forEach(([k, l, t]) => {
      w.appendChild(U.el('label', { cls: 'lbl', text: l }));
      inputs[k] = U.el('input', { cls: 'txt', type: t, value: a[k] });
      w.appendChild(inputs[k]);
    });
    w.appendChild(U.el('div', { cls: 'flex mt' }, [
      U.el('button', {
        cls: 'btn primary', text: 'Save', onclick: () => {
          fields.forEach(([k, , t]) => { a[k] = t === 'number' ? (parseInt(inputs[k].value) || 0) : inputs[k].value; });
          G.saveNow(); close(); rerender();
        },
      }),
      U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => close() }),
    ]));
  }

  function editAI(a) {
    const { w, close } = modal('4% 14%');
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Dya’kukull — ' + a.displayName }));
    const cols = U.el('div', { cls: 'grid', style: 'grid-template-columns:1fr 1fr;gap:16px;align-items:start' });
    w.appendChild(cols);
    const leftC = U.el('div', {}), rightC = U.el('div', {});
    cols.appendChild(leftC); cols.appendChild(rightC);

    const name = U.el('input', { cls: 'txt', value: a.displayName });
    const level = U.el('input', { cls: 'txt', type: 'number', value: a.level });
    const gold = U.el('input', { cls: 'txt', type: 'number', value: a.gold });
    const ngak = U.el('input', { cls: 'txt', type: 'number', value: a.ngakara });
    const region = U.el('select', { cls: 'txt' });
    EC.REGIONS.forEach(r => region.appendChild(U.el('option', { value: r.id, text: r.name })));
    region.value = a.region;
    const style = U.el('select', { cls: 'txt' });
    ['aggressive', 'defensive', 'balanced', 'greedy', 'chaotic'].forEach(s => style.appendChild(U.el('option', { value: s, text: s })));
    style.value = a.aiCfg.playStyle;
    const market = U.el('input', { type: 'range', min: 0, max: 100, value: Math.round(a.aiCfg.marketActivity * 100) });
    const skill = U.el('input', { type: 'range', min: 10, max: 120, value: Math.round(a.aiCfg.matchSkill * 100) });
    const stallName = U.el('input', { cls: 'txt', value: a.stall.name || '' });
    const stallBio = U.el('textarea', { cls: 'txt', rows: 2 }); stallBio.value = a.stall.bio || '';
    [['Name', name], ['Level & XP', level], ['Gold', gold], ['NgAkara', ngak], ['Region (circuit assignment)', region], ['Play style', style], ['Market activity', market], ['Match skill (× the global dial)', skill], ['Stall name', stallName], ['Stall bio', stallBio]].forEach(([l, el]) => {
      leftC.appendChild(U.el('label', { cls: 'lbl', text: l })); leftC.appendChild(el);
    });
    const tourney = U.el('div', { cls: 'toggle' + (a.aiCfg.tournaments ? ' on' : ''), style: 'margin-top:8px' });
    tourney.onclick = () => { a.aiCfg.tournaments = !a.aiCfg.tournaments; tourney.classList.toggle('on'); };
    leftC.appendChild(U.el('label', { cls: 'lbl', text: 'Enters tournaments' })); leftC.appendChild(tourney);
    const merchant = U.el('div', { cls: 'toggle' + (a.aiCfg.merchant ? ' on' : ''), style: 'margin-top:8px' });
    merchant.onclick = () => { a.aiCfg.merchant = !a.aiCfg.merchant; merchant.classList.toggle('on'); };
    leftC.appendChild(U.el('label', { cls: 'lbl', text: 'Merchant (always heavily stocked)' })); leftC.appendChild(merchant);
    const active = U.el('div', { cls: 'toggle' + (a.aiCfg.active ? ' on' : ''), style: 'margin-top:8px' });
    active.onclick = () => { a.aiCfg.active = !a.aiCfg.active; active.classList.toggle('on'); };
    leftC.appendChild(U.el('label', { cls: 'lbl', text: 'Active (disabled AIs do nothing)' })); leftC.appendChild(active);

    /* ---- collection manager ---- */
    rightC.appendChild(U.el('h3', { cls: 'gold mb', text: 'Collection (' + Object.keys(a.tokens).length + ' tokens)' }));
    const tokBox = U.el('div', { style: 'max-height:320px;overflow:auto' });
    rightC.appendChild(tokBox);
    function paintToks() {
      tokBox.innerHTML = '';
      Object.values(a.tokens).forEach(t => {
        const sp = SP.get(t.speciesId);
        const r = U.el('div', { cls: 'flex', style: 'gap:6px;align-items:center;border-bottom:1px solid var(--line);padding:3px 0' });
        r.appendChild(U.el('div', { cls: 'flex1 small', html: '<b>' + U.esc(t.name) + '</b> <span class="muted">' + (sp ? sp.name : t.speciesId) + ' · ' + SP.RARITIES[t.rarity] + (t.status !== 'collection' ? ' · ' + t.status : '') + '</span>' }));
        r.appendChild(U.el('button', {
          cls: 'btn small danger', text: '✕', onclick: () => {
            delete a.tokens[t.id];
            a.pouches.forEach(p => p.tokenIds = p.tokenIds.filter(x => x !== t.id));
            Object.values(G.world.market.listings).forEach(l => { if (l.tokenId === t.id) delete G.world.market.listings[l.id]; });
            G.saveNow(); paintToks();
          },
        }));
        tokBox.appendChild(r);
      });
    }
    paintToks();
    const addRow = U.el('div', { cls: 'flex mt', style: 'gap:6px' });
    const spSel = U.el('select', { cls: 'txt' });
    SP.list.forEach(s => spSel.appendChild(U.el('option', { value: s.id, text: s.name })));
    const rarSel = U.el('select', { cls: 'txt', style: 'max-width:130px' });
    SP.RARITIES.forEach((r, i) => rarSel.appendChild(U.el('option', { value: i, text: r })));
    addRow.appendChild(spSel); addRow.appendChild(rarSel);
    addRow.appendChild(U.el('button', {
      cls: 'btn small', text: '＋ Mint into collection', onclick: () => {
        const t = TK.mint({ speciesId: spSel.value, rng: new U.Rng(U.newSeed()), owner: a.id, rarity: parseInt(rarSel.value), aiOwner: true });
        a.tokens[t.id] = t;
        G.saveNow(); paintToks();
      },
    }));
    rightC.appendChild(addRow);

    w.appendChild(U.el('div', { cls: 'flex mt' }, [
      U.el('button', {
        cls: 'btn primary', text: 'Save', onclick: () => {
          a.displayName = name.value; a.level = parseInt(level.value) || a.level;
          a.gold = parseInt(gold.value) || 0; a.ngakara = parseInt(ngak.value) || 0;
          a.region = region.value; a.aiCfg.playStyle = style.value;
          a.aiCfg.marketActivity = market.value / 100; a.aiCfg.matchSkill = skill.value / 100;
          a.stall.name = stallName.value; a.stall.bio = stallBio.value;
          G.saveNow(); close(); rerender();
        },
      }),
      U.el('button', { cls: 'btn danger', text: 'Delete AI', onclick: () => { if (confirm('Delete ' + a.displayName + '?')) { delete G.world.accounts[a.id]; G.saveNow(); close(); rerender(); } } }),
      U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => close() }),
    ]));
  }
})();
