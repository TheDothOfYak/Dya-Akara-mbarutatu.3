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
     • ACCOUNTS — Overview can look up and load any player's
       cloud account by email, even one this browser has never
       locally seen, so bans/edits/grants work on every real
       player, not just ones created on this device.

   Edits are stored as overrides (DYA.mods), applied instantly,
   and — when online is configured — pushed to Supabase so every
   player's game picks them up within a minute.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, SP = DYA.species, EC = DYA.economy, L = DYA.lore, TK = DYA.token, M = DYA.mods;
  let root, view = 'Overview', huntTab = 'Available';

  /* this IS the admin session — world mutations here publish the shared AI
     world so every player's device picks up the curation (see G.saveNow) */
  G.isAdminSession = true;

  window.addEventListener('DOMContentLoaded', () => {
    G.init();
    root = U.qs('#app');
    gate();
  });

  /* ---------- cloud accounts: pull every real player's save into this
     admin session, even ones who signed up on a device this browser
     has never seen — so every tab below (bans, spawn, edit) can act
     on them like any other account. ---------- */
  const cloudAcc = { loaded: false, loading: false, error: null };
  async function loadCloudAccounts() {
    const AC = DYA.accountCloud;
    if (!AC || !AC.configured()) return;
    cloudAcc.loading = true;
    try {
      const rows = await AC.fetchAll();
      rows.forEach(row => {
        const acc = row.data;
        acc.id = row.id; acc.email = row.email; acc.passHash = row.pass_hash;
        acc.cloudAccount = true;
        G.world.accounts[acc.id] = acc;
      });
      cloudAcc.loaded = true; cloudAcc.error = null;
    } catch (e) { cloudAcc.error = e.message; }
    cloudAcc.loading = false;
  }

  /* adopt the shared, admin-curated AI world before editing, so every admin
     device edits the SAME Dya'kukull roster and curation compounds instead of
     each device fighting its own locally-generated one */
  async function pullSharedWorld() {
    if (G.fetchAdminWorld) { try { await G.fetchAdminWorld(); } catch (e) { /* offline is fine */ } }
  }

  /* ---------- access gate: you are the admin ---------- */
  function gate() {
    root.innerHTML = '';
    const wrap = U.el('div', { cls: 'admin-wrap', style: 'max-width:420px;margin-top:12vh' });
    wrap.appendChild(U.el('h1', { cls: 'gold center', text: "DYA'AKARA — ADMIN" }));
    const hasPass = G.admin.hasPass();
    wrap.appendChild(U.el('p', { cls: 'muted center small mt', text: hasPass ? 'Enter the admin password.' : 'First access — set the admin password. You are the admin.' }));
    const pass = U.el('input', { cls: 'txt mt', type: 'password', placeholder: 'Admin password' });
    wrap.appendChild(pass);
    const err = U.el('div', { cls: 'small center mt', style: 'color:var(--red);min-height:16px' });
    wrap.appendChild(err);
    const btn = U.el('button', { cls: 'btn primary mt', style: 'width:100%', text: hasPass ? 'Enter' : 'Set password & enter' });
    btn.onclick = async () => {
      if (pass.value.length < 4) { err.textContent = 'At least 4 characters.'; return; }
      if (!G.admin.hasPass()) { G.admin.setPass(pass.value); await loadCloudAccounts(); await pullSharedWorld(); panel(); return; }
      if (G.admin.checkPass(pass.value)) { await loadCloudAccounts(); await pullSharedWorld(); panel(); }
      else err.textContent = 'Wrong password. The Guild is watching. Cordially.';
    };
    pass.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
    wrap.appendChild(btn);

    /* Locked out? The admin gate is a local convenience lock, not real
       security (the panel is client-side and edits already ride the public
       key), so a self-serve reset is fine — and it rescues anyone whose
       stored hash got into a bad state. Clears it and returns to first-access. */
    if (hasPass) {
      const reset = U.el('button', { cls: 'btn ghost small mt', style: 'width:100%', text: 'Reset to default password' });
      reset.onclick = () => {
        if (!confirm('Clear any custom admin password and go back to the built-in default? (This does not touch any game data.)')) return;
        G.admin.clearPass();
        gate();
      };
      wrap.appendChild(reset);
    }
    root.appendChild(wrap);
  }

  /* ---------- shared helpers ---------- */
  function modal(inset) {
    /* on a phone every modal goes (near) full-screen — the desktop insets
       leave a tiny usable window that's unworkable on a small display */
    const narrow = (window.innerWidth || 1000) < 760;
    const useInset = narrow ? '0' : (inset || '5% 10%');
    const back = U.el('div', { style: 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99' });
    const w = U.el('div', { cls: 'panel', style: 'position:fixed;inset:' + useInset + ';overflow:auto;z-index:100' + (narrow ? ';border-radius:0' : '') });
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

  /* ---------- cloud accounts status + look-up-by-email ---------- */
  function cloudAccountsLine() {
    const AC = DYA.accountCloud;
    const wrap = U.el('div', { cls: 'mb' });
    if (!AC || !AC.configured()) {
      wrap.appendChild(U.el('p', { cls: 'small muted', text: 'Player accounts are local to each device (online not configured) — this admin session only sees accounts that were created or edited in THIS browser.' }));
      return wrap;
    }
    const cloudCount = Object.values(G.world.accounts).filter(a => a.cloudAccount).length;
    wrap.appendChild(U.el('p', {
      cls: 'small ' + (cloudAcc.error ? '' : 'muted'), style: cloudAcc.error ? 'color:var(--red)' : '',
      text: cloudAcc.error ? '⚠ Could not load cloud accounts: ' + cloudAcc.error + (/(relation|table)/i.test(cloudAcc.error) ? ' — re-run supabase/schema.sql to add the dya_accounts table.' : '')
        : '🌐 ' + cloudCount + ' player account(s) loaded from the cloud — every real player, on every device, not just this browser.',
    }));
    const row = U.el('div', { cls: 'flex mt', style: 'flex-wrap:wrap' });
    row.appendChild(U.el('button', {
      cls: 'btn small ghost', text: '🔄 Refresh from cloud', onclick: async () => {
        await loadCloudAccounts(); rerender();
      },
    }));
    const emailIn = U.el('input', { cls: 'txt', placeholder: 'player@email.com', style: 'max-width:220px' });
    row.appendChild(emailIn);
    row.appendChild(U.el('button', {
      cls: 'btn small', text: '🔎 Look up & load', onclick: async () => {
        const email = emailIn.value.trim().toLowerCase();
        if (!email) return;
        try {
          const remote = await AC.fetchByEmail(email);
          if (!remote) { alert('No cloud account with that email.'); return; }
          const acc = remote.data;
          acc.id = remote.id; acc.email = remote.email; acc.passHash = remote.pass_hash; acc.cloudAccount = true;
          G.world.accounts[acc.id] = acc;
          G.saveNow();
          alert('Loaded ' + acc.displayName + ' — edit them from the table below.');
          rerender();
        } catch (e) { alert('Lookup failed: ' + e.message); }
      },
    }));
    wrap.appendChild(row);
    return wrap;
  }

  /* ---------- official online season tournaments (make live & monitor) ---------- */
  function onlineTournaments(body) {
    const TO = DYA.tournamentsOnline;
    const box = U.el('div', { cls: 'panel mb' });
    box.appendChild(U.el('h3', { cls: 'gold mb', text: '🏛 Official season tournaments (online, shared with every player)' }));
    if (!TO || !TO.configured()) {
      box.appendChild(U.el('p', { cls: 'muted small', text: 'Online is not configured (js/config.js) — official online season tournaments need Supabase. Only local circuit tournaments exist.' }));
      body.appendChild(box);
      return;
    }
    box.appendChild(U.el('p', { cls: 'muted small', text: 'Create an official event, share it, then MAKE IT LIVE when your players have joined. Real players fill the seats; the Dya’kukull only pad the empty ones — and only official events award titles.' }));

    /* --- create form --- */
    const form = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;align-items:end' });
    const nm = U.el('input', { cls: 'txt', placeholder: 'Tournament name' });
    const circuit = U.el('select', { cls: 'txt' });
    EC.CIRCUITS.forEach(c => circuit.appendChild(U.el('option', { value: c, text: c })));
    const size = U.el('select', { cls: 'txt' });
    [4, 8, 16, 32].forEach(s => size.appendChild(U.el('option', { value: s, text: s + ' players' })));
    size.value = 8;
    const struct = U.el('select', { cls: 'txt' });
    [['single', 'Single elimination'], ['rr', 'Round robin']].forEach(([v, l]) => struct.appendChild(U.el('option', { value: v, text: l })));
    const pfmt = U.el('select', { cls: 'txt' });
    [['single', 'Single pouch'], ['three-draft', 'Three-pouch draft'], ['random', 'Random pouch']].forEach(([v, l]) => pfmt.appendChild(U.el('option', { value: v, text: l })));
    const fee = numIn(0, { placeholder: 'Entry fee' });
    const bonus = numIn(0, { placeholder: 'Champion bonus gold' });
    const pw = U.el('input', { cls: 'txt', placeholder: 'Password (optional)' });
    lblIn(form, 'Name', nm); lblIn(form, 'Circuit', circuit); lblIn(form, 'Size', size);
    lblIn(form, 'Bracket', struct); lblIn(form, 'Pouch', pfmt); lblIn(form, 'Entry fee', fee);
    lblIn(form, 'Champion bonus', bonus); lblIn(form, 'Password', pw);
    box.appendChild(form);
    let pendingRewards = null;
    const cacts = U.el('div', { cls: 'flex mt', style: 'flex-wrap:wrap;gap:6px' });
    const rewLbl = U.el('span', { cls: 'small muted', style: 'align-self:center' });
    const setRewLbl = () => rewLbl.textContent = pendingRewards && pendingRewards.length ? '🎁 rewards set for top ' + pendingRewards.length : 'no placement rewards yet';
    setRewLbl();
    cacts.appendChild(U.el('button', {
      cls: 'btn small', text: '🎁 Placement rewards…', onclick: () => {
        editTournamentRewards(parseInt(size.value) || 8, pendingRewards, (rw) => { pendingRewards = rw; setRewLbl(); });
      },
    }));
    cacts.appendChild(rewLbl);
    cacts.appendChild(U.el('button', {
      cls: 'btn small primary', text: '＋ Create official tournament', onclick: async () => {
        if (nm.value.trim().length < 3) { alert('Give it a name (3+ characters).'); return; }
        const r = await TO.adminCreate({
          name: nm.value.trim(), circuit: circuit.value, size: parseInt(size.value),
          structure: struct.value, pouchFormat: pfmt.value, entryFee: parseInt(fee.value) || 0,
          bonusGold: parseInt(bonus.value) || 0, password: pw.value.trim() || null,
          rewards: pendingRewards,
        });
        if (r.err) { alert('Could not create: ' + r.err); return; }
        nm.value = ''; pw.value = ''; pendingRewards = null; setRewLbl();
        alert('Official tournament created. Share it — players will see it in their Tournament Browser. Come back here to MAKE IT LIVE once they’ve joined.');
        rerender();
      },
    }));
    box.appendChild(cacts);

    /* --- live list --- */
    const holder = U.el('div', { cls: 'mt' });
    holder.appendChild(U.el('p', { cls: 'small muted', text: 'Loading online tournaments…' }));
    box.appendChild(holder);
    body.appendChild(box);

    TO.adminFetchAll().then(async rows => {
      holder.innerHTML = '';
      if (!rows || !rows.length) { holder.appendChild(U.el('p', { cls: 'muted small', text: 'No online tournaments yet.' })); return; }
      const tbl = U.el('table', { cls: 'adm' });
      tbl.appendChild(U.el('tr', {}, ['Name', 'Circuit', 'Official', 'State', 'Real players', ''].map(h => U.el('th', { text: h }))));
      for (const row of rows) {
        const d = row.data || {};
        let realCount = '—';
        if (row.state === 'open') { try { realCount = (await TO.adminFetchPlayers(row.id)).length + '/' + row.size; } catch (e) { realCount = '?'; } }
        else if (d.roster) realCount = Object.values(d.roster).filter(x => !x.ai).length + ' + ' + Object.values(d.roster).filter(x => x.ai).length + ' AI';
        const tr = U.el('tr', {}, [
          U.el('td', { text: row.name }),
          U.el('td', { text: row.circuit }),
          U.el('td', { html: row.official ? '<span class="gold">official</span>' : '—' }),
          U.el('td', { text: row.state }),
          U.el('td', { text: realCount }),
        ]);
        const td = U.el('td', {});
        if (row.state === 'open') {
          td.appendChild(U.el('button', {
            cls: 'btn small primary', text: '▶ Make live', onclick: async () => {
              const r = await TO.start({ onlineId: row.id, id: row.id, size: row.size, circuit: row.circuit, structure: d.structure || 'single', entryFee: d.entryFee || 0 });
              alert(r.err ? 'Cannot start: ' + r.err : 'Live! ' + r.reals + ' real player(s) seated' + (r.fillers ? ', ' + r.fillers + ' Dya’kukull filling in.' : '.'));
              rerender();
            },
          }));
        } else if (row.state === 'running') {
          td.appendChild(U.el('button', { cls: 'btn small', text: 'Monitor', onclick: () => monitorOnline(row) }));
        }
        td.appendChild(U.el('button', { cls: 'btn small danger', text: 'Delete', onclick: async () => { if (!confirm('Delete this online tournament for everyone?')) return; await TO.adminDelete(row.id); rerender(); } }));
        tr.appendChild(td);
        tbl.appendChild(tr);
      }
      holder.appendChild(tbl);
    }).catch(e => {
      holder.innerHTML = '';
      holder.appendChild(U.el('p', { cls: 'small', style: 'color:var(--red)', text: '⚠ Could not load online tournaments: ' + e.message + (/(relation|table)/i.test(e.message) ? ' — re-run supabase/schema.sql to add the dya_tournaments tables.' : '') }));
    });
  }

  /* official season ladder standings — real players by ranked rating, with the
     circuit each currently sits in (Local → Interplanetary) */
  function seasonLadderStandings(body) {
    const box = U.el('div', { cls: 'panel mb mt' });
    box.appendChild(U.el('h3', { cls: 'gold mb', text: '📈 Season ladder standings (the official ranked climb)' }));
    box.appendChild(U.el('p', { cls: 'muted small', text: 'Everyone climbs one ladder: play your circuit, rank up, promote. Titles are awarded on reaching each circuit. This is the live standing of every real player this admin session can see.' }));
    const players = Object.values(G.world.accounts).filter(a => !a.ai).sort((a, b) => (b.rank || 0) - (a.rank || 0));
    if (!players.length) { box.appendChild(U.el('p', { cls: 'muted small', text: 'No real players yet.' })); body.appendChild(box); return; }
    const tbl = U.el('table', { cls: 'adm' });
    tbl.appendChild(U.el('tr', {}, ['#', 'Name', 'Level', 'Rating', 'Circuit'].map(h => U.el('th', { text: h }))));
    players.slice(0, 50).forEach((a, i) => {
      tbl.appendChild(U.el('tr', {}, [
        U.el('td', { text: '#' + (i + 1) }),
        U.el('td', { html: U.esc(a.displayName) + (a.cloudAccount ? ' <span class="pill">🌐</span>' : '') }),
        U.el('td', { text: a.level }),
        U.el('td', { text: a.rank || 1000 }),
        U.el('td', { html: '<b class="gold">' + EC.circuitForRank(a.rank || 1000) + '</b>' }),
      ]));
    });
    box.appendChild(tbl);
    body.appendChild(box);
  }

  /* live monitor of a running online tournament's shared bracket */
  function monitorOnline(row) {
    const { w } = modal('8% 12%');
    const d = row.data || {};
    const roster = d.roster || {};
    const nm = id => id == null ? 'bye' : (roster[id] ? roster[id].name + (roster[id].ai ? ' 🤖' : '') : id);
    w.appendChild(U.el('h2', { cls: 'gold', text: row.name }));
    w.appendChild(U.el('p', { cls: 'small muted', text: row.circuit + ' · ' + (d.structure === 'rr' ? 'round robin' : 'single elimination') + ' · ' + Object.values(roster).filter(x => !x.ai).length + ' real, ' + Object.values(roster).filter(x => x.ai).length + ' Dya’kukull' }));
    if (!d.bracket) { w.appendChild(U.el('p', { cls: 'muted', text: 'No bracket yet.' })); return; }
    d.bracket.forEach((round, ri) => {
      w.appendChild(U.el('h3', { cls: 'gold mb mt', text: d.structure === 'rr' ? 'Round robin' : 'Round ' + (ri + 1) }));
      round.forEach(mt => {
        if (!mt) return;
        w.appendChild(U.el('div', { cls: 'small', text: nm(mt.a) + ' vs ' + nm(mt.b) + ' — ' + (mt.winner ? 'won by ' + nm(mt.winner) : 'pending') }));
      });
    });
    if (d.champion) w.appendChild(U.el('div', { cls: 'panel mt', html: '🏆 <b class="gold">Champion: ' + U.esc(nm(d.champion)) + '</b>' }));
  }

  /* ---------- main panel ---------- */
  const NAV = ['Overview', 'Creatures', 'Hunts', 'Guild Market', 'Text & Lore', 'Balance & Economy', "Dya'kukull (AI Players)", 'Market Monitor', 'Spawn Tokens', 'Crafting Station', 'All Tokens', 'Tournaments', 'Bans & Appeals', 'Flagged Tokens', 'Announcements', 'God Mode'];
  function panel() {
    root.innerHTML = '';
    const wrap = U.el('div', { cls: 'admin-wrap' });
    wrap.appendChild(U.el('h1', { cls: 'gold', text: "DYA'AKARA — ADMIN PANEL" }));
    wrap.appendChild(U.el('p', { cls: 'muted small', text: 'Full god-mode access. Season ' + G.world.season.number + ' · ' + Object.keys(G.world.accounts).length + ' accounts · Handle with the usual recklessness.' }));
    const grid = U.el('div', { cls: 'admin-grid mt' });
    const nav = U.el('div', { cls: 'admin-nav' });
    const body = U.el('div', { cls: 'admin-body' });
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
      ['Species edited', ms.species + ms.customSpecies], ['Hunts available', ms.huntsAvailable + '/' + ms.hunts], ['Guild listings', ms.guildListings], ['Reserve tokens', ms.reserve], ['Level chest pools set', ms.levelChestPools], ['Text overrides', ms.text + ms.lore], ['Balance overrides', ms.balance], ['Edit revision', ms.rev]].forEach(([l, v]) => {
        tiles.appendChild(U.el('div', { cls: 'stat-tile' }, [U.el('div', { cls: 'st-num', text: v }), U.el('div', { cls: 'st-lbl', text: l })]));
      });
      body.appendChild(tiles);
      body.appendChild(syncLine());
      body.appendChild(cloudAccountsLine());
      body.appendChild(U.el('h3', { cls: 'gold mt mb', text: 'Real player accounts' }));
      const tbl = U.el('table', { cls: 'adm' });
      tbl.appendChild(U.el('tr', {}, [U.el('th', { text: 'Name' }), U.el('th', { text: 'Level' }), U.el('th', { text: 'Gold' }), U.el('th', { text: 'Tokens' }), U.el('th', { text: 'Rank' }), U.el('th', { text: '' })]));
      humans.forEach(a => {
        const tr = U.el('tr', {}, [
          U.el('td', { html: U.esc(a.displayName) + (a.cloudAccount ? ' <span class="pill">🌐 cloud</span>' : '') }), U.el('td', { text: a.level }),
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

    /* ================= HUNTS ================= */
    Hunts(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'Every Hunt is ONE specific creature you author by hand — not a random member of a species. A creature can be hunted once; the first player to finish it claims it for the whole world and it moves to the Hunted list' + (M.configured() ? ', reaching every player online within a minute.' : ' (this browser only until Supabase is configured).') }));
      body.appendChild(syncLine());

      /* sub-tabs */
      const tabs = U.el('div', { cls: 'flex mb' });
      ['Available', 'Hunted'].forEach(t => {
        const b = U.el('button', { cls: 'btn small' + (huntTab === t ? ' primary' : ''), text: t + ' (' + (t === 'Available' ? M.availableHunts().length : M.huntedHunts().length) + ')' });
        b.onclick = () => { huntTab = t; rerender(); };
        tabs.appendChild(b);
      });
      body.appendChild(tabs);

      if (huntTab === 'Available') {
        body.appendChild(U.el('button', { cls: 'btn primary mb', text: '＋ Create a Hunt', onclick: () => editHunt(null) }));
        const hunts = M.availableHunts().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        if (!hunts.length) { body.appendChild(U.el('p', { cls: 'muted', text: 'No Hunts posted. Create one — players see it in Adventures once it is live.' })); return; }
        const grd = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px' });
        hunts.forEach(h => {
          const sp = SP.get(h.speciesId);
          const card = U.el('div', { cls: 'panel', style: 'padding:10px' });
          const row = U.el('div', { cls: 'flex' });
          if (sp) row.appendChild(spriteThumb(sp, 54));
          const info = U.el('div', { cls: 'flex1', style: 'margin-left:8px' });
          info.appendChild(U.el('div', { cls: 'gold', text: h.name || '(unnamed)' }));
          info.appendChild(U.el('div', { cls: 'small muted', text: (sp ? sp.name : h.speciesId) + ' · ' + (SP.RARITIES[h.rarity] || '?') }));
          info.appendChild(U.el('div', { cls: 'small muted', text: (h.encounters ? h.encounters.length : 0) + ' encounter(s) · 🪙' + U.fmt((h.rewards && h.rewards.gold) || 0) }));
          row.appendChild(info);
          card.appendChild(row);
          const acts = U.el('div', { cls: 'flex mt' });
          acts.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Edit', onclick: () => editHunt(h) }));
          acts.appendChild(U.el('button', {
            cls: 'btn small', text: 'Mark hunted', onclick: () => {
              if (!confirm('Manually retire "' + (h.name || h.speciesId) + '"? It leaves every player\'s roster.')) return;
              M.markHunted(h.id, 'Admin').then(rerender);
            },
          }));
          acts.appendChild(U.el('button', { cls: 'btn small danger', text: 'Delete', onclick: () => { if (confirm('Delete this Hunt permanently?')) { M.deleteHunt(h.id); rerender(); } } }));
          card.appendChild(acts);
          grd.appendChild(card);
        });
        body.appendChild(grd);
      } else {
        const hunts = M.huntedHunts().sort((a, b) => (b.huntedAt || 0) - (a.huntedAt || 0));
        if (!hunts.length) { body.appendChild(U.el('p', { cls: 'muted', text: 'No creature has been hunted yet.' })); return; }
        const tbl = U.el('table', { cls: 'adm' });
        tbl.appendChild(U.el('tr', {}, ['Creature', 'Species', 'Rarity', 'Hunted by', 'When', ''].map(h => U.el('th', { text: h }))));
        hunts.forEach(h => {
          const sp = SP.get(h.speciesId);
          const tr = U.el('tr', {}, [
            U.el('td', { text: h.name || '(unnamed)' }),
            U.el('td', { text: sp ? sp.name : h.speciesId }),
            U.el('td', { text: SP.RARITIES[h.rarity] || '?' }),
            U.el('td', { text: h.huntedBy || '—' }),
            U.el('td', { text: h.huntedAt ? U.timeAgo(h.huntedAt) : '—' }),
          ]);
          const td = U.el('td', {});
          td.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Reopen', onclick: () => { M.reopenHunt(h.id); rerender(); } }));
          td.appendChild(U.el('button', { cls: 'btn small danger', text: 'Delete', onclick: () => { if (confirm('Delete this Hunt permanently?')) { M.deleteHunt(h.id); rerender(); } } }));
          tr.appendChild(td);
          tbl.appendChild(tr);
        });
        body.appendChild(tbl);
      }
    },

    /* ================= GUILD MARKET ================= */
    'Guild Market'(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'The Dya Guild’s own stall. It shows underneath the standard goods on the Guild page — the potions, Okid and licences stay exactly as they are. Two things you control here: the LIMITED random pool a Guild stall token pulls from, and the individual creatures the Guild sells outright. Every creature here is designed by hand, down to the last stat, variable and decision tree.' + (M.configured() ? ' Both reach every player online within a minute.' : ' (this browser only until Supabase is configured).') }));
      body.appendChild(syncLine());

      const g = M.guildData();

      /* ---------- RANDOM POOL (limited, designed entries) ---------- */
      const poolBox = U.el('div', { cls: 'panel mb' });
      poolBox.appendChild(U.el('h3', { cls: 'gold mb', text: 'Random “Guild stall token” pool (limited)' }));
      poolBox.appendChild(U.el('p', { cls: 'small muted', text: 'Stock the pool with hand-designed creatures and a quantity for each. Every buy draws one at random (weighted by remaining stock) and takes it OUT — when the stock hits zero the random token sells out. Leave the pool empty to keep the classic unlimited common draw (so the tutorial always has one to buy).' }));

      /* working copy — edited in place, persisted on Save */
      const poolWork = M.guildPoolEntries().map(e => U.deepCopy(e));
      const priceIn = numIn(g.poolPrice, { step: 1, min: 0, style: 'max-width:160px' });
      poolBox.appendChild(U.el('div', {}, [U.el('label', { cls: 'lbl', text: 'Price per random token (gold)' }), priceIn]));

      const poolList = U.el('div', { cls: 'mt' });
      poolBox.appendChild(poolList);
      function paintPoolEntries() {
        poolList.innerHTML = '';
        const totalStock = poolWork.reduce((n, e) => n + Math.max(0, e.qty | 0), 0);
        poolList.appendChild(U.el('p', { cls: 'small muted mb', text: poolWork.length ? (totalStock + ' token(s) in the pool across ' + poolWork.length + ' design(s)') : 'Pool empty — the stall runs the classic unlimited common draw.' }));
        poolWork.forEach((e, i) => {
          const sp = SP.get(e.spec.speciesId);
          const row = U.el('div', { cls: 'panel', style: 'padding:8px;margin-bottom:6px;background:#20180e' });
          const top = U.el('div', { cls: 'flex', style: 'gap:8px;align-items:center;flex-wrap:wrap' });
          if (sp) top.appendChild(spriteThumb(sp, 42));
          const info = U.el('div', { cls: 'flex1', style: 'min-width:120px' });
          info.appendChild(U.el('div', { cls: 'gold small', text: (e.spec.name || (sp ? sp.name : e.spec.speciesId)) }));
          info.appendChild(U.el('div', { cls: 'small muted', text: specSummary(e.spec) }));
          top.appendChild(info);
          const qWrap = U.el('div', {});
          qWrap.appendChild(U.el('label', { cls: 'lbl', text: 'Stock' }));
          const qIn = numIn(e.qty | 0, { step: 1, min: 0, style: 'max-width:80px' });
          qIn.oninput = () => e.qty = Math.max(0, parseInt(qIn.value, 10) || 0);
          qWrap.appendChild(qIn);
          top.appendChild(qWrap);
          top.appendChild(U.el('button', { cls: 'btn small', text: '✎ Design', onclick: () => editHuntEnemy(e.spec, paintPoolEntries, { hideBoss: true, title: 'Pool creature — design every detail', intro: 'This is one design in the random pool. Set anything you like — species, rarity, size, exact stats, behaviour tree, every variable and trait pick. Blank fields roll fresh on each draw.' }) }));
          top.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { poolWork.splice(i, 1); paintPoolEntries(); } }));
          row.appendChild(top);
          poolList.appendChild(row);
        });
        poolList.appendChild(U.el('button', {
          cls: 'btn small', text: '＋ Add creature to pool', onclick: () => {
            poolWork.push({ id: U.uid('gpe'), spec: { speciesId: (SP.list[0] && SP.list[0].id) }, qty: 1 });
            paintPoolEntries();
          },
        }));
      }
      paintPoolEntries();
      const poolActs = U.el('div', { cls: 'flex mt' });
      poolActs.appendChild(U.el('button', {
        cls: 'btn small primary', text: 'Save pool', onclick: () => {
          M.setGuildPool(poolWork.filter(e => SP.get(e.spec.speciesId)), parseInt(priceIn.value, 10) || 0);
          flashSaved(poolActs);
        },
      }));
      poolActs.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Empty the pool (use classic draw)', onclick: () => { if (confirm('Remove every pool design and go back to the unlimited built-in draw?')) { poolWork.length = 0; paintPoolEntries(); } } }));
      poolBox.appendChild(poolActs);
      body.appendChild(poolBox);

      /* ---------- INDIVIDUAL LISTINGS ---------- */
      body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Individual listings — creatures the Guild sells outright' }));
      body.appendChild(U.el('p', { cls: 'small muted mb', text: 'Each listing is one hand-designed creature offered on the Guild stall at a fixed price. Every one is ONE OF A KIND — the first player to buy it claims it for the whole world and it leaves every other player’s stall, exactly like the rest of the market. Sold listings show below; relist one to put it back up.' }));
      body.appendChild(U.el('button', { cls: 'btn primary mb', text: '＋ Create a listing', onclick: () => editGuildListing(null) }));

      const all = M.guildListings().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (!all.length) { body.appendChild(U.el('p', { cls: 'muted', text: 'No listings yet. Create one — it appears under “Creatures for sale” on the Guild page.' })); return; }

      function listingCard(l) {
        const spec = M.listingSpec(l);
        const sp = SP.get(spec.speciesId);
        const card = U.el('div', { cls: 'panel', style: 'padding:10px' + (l.sold ? ';opacity:.6' : '') });
        const row = U.el('div', { cls: 'flex' });
        if (sp) row.appendChild(spriteThumb(sp, 54));
        const info = U.el('div', { cls: 'flex1', style: 'margin-left:8px' });
        const nameLine = U.el('div', { cls: 'gold', text: spec.name || (sp ? sp.name : spec.speciesId) });
        if (l.sold) nameLine.appendChild(U.el('span', { cls: 'pill', style: 'margin-left:6px', text: 'SOLD' }));
        info.appendChild(nameLine);
        info.appendChild(U.el('div', { cls: 'small muted', text: specSummary(spec) }));
        info.appendChild(U.el('div', { cls: 'small muted', text: '🪙 ' + U.fmt(l.price || 0) + 'g' + (l.sold && l.soldAt ? ' · sold ' + U.timeAgo(l.soldAt) : '') }));
        row.appendChild(info);
        card.appendChild(row);
        const acts = U.el('div', { cls: 'flex mt' });
        if (l.sold) {
          acts.appendChild(U.el('button', { cls: 'btn small primary', text: 'Relist', onclick: () => { M.relistGuildListing(l.id); rerender(); } }));
        } else {
          acts.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Edit', onclick: () => editGuildListing(l) }));
        }
        acts.appendChild(U.el('button', { cls: 'btn small danger', text: 'Delete', onclick: () => { if (confirm('Delete this listing? It leaves every player’s Guild stall.')) { M.deleteGuildListing(l.id); rerender(); } } }));
        card.appendChild(acts);
        return card;
      }

      const available = all.filter(l => !l.sold);
      const sold = all.filter(l => l.sold);
      const grd = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px' });
      if (!available.length) grd.appendChild(U.el('p', { cls: 'muted', text: 'Every listing has sold. Create a new one, or relist a sold one below.' }));
      available.forEach(l => grd.appendChild(listingCard(l)));
      body.appendChild(grd);
      if (sold.length) {
        body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Sold (' + sold.length + ')' }));
        const sgrd = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px' });
        sold.forEach(l => sgrd.appendChild(listingCard(l)));
        body.appendChild(sgrd);
      }
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

      tableEditor('Fallback ready cost, per rarity (cost is power-based by default)', SP.RARITIES, () => SP.RARITY_COST, 'RARITY_COST', 'balance');
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

      /* --- Combine Okid rule (3 same → 1 next tier) --- */
      const cmb = EC.COMBINE_OKID || { need: 3, yield: 1 };
      const mbox = U.el('div', { cls: 'panel mb' });
      mbox.appendChild(U.el('h3', { cls: 'gold mb', text: 'Combine Okid (fuse up a tier)' }));
      mbox.appendChild(U.el('p', { cls: 'small muted', text: 'Players fuse several Okid of one rarity into the next rarity up. Default: 3 → 1.' }));
      const mrow = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px' });
      const needIn = numIn(cmb.need, { step: 1, min: 2 });
      const yieldIn = numIn(cmb.yield, { step: 1, min: 1 });
      mrow.appendChild(U.el('div', {}, [U.el('label', { cls: 'lbl', text: 'Okid consumed (same rarity)' }), needIn]));
      mrow.appendChild(U.el('div', {}, [U.el('label', { cls: 'lbl', text: 'Okid produced (next rarity)' }), yieldIn]));
      mbox.appendChild(mrow);
      const macts = U.el('div', { cls: 'flex mt' });
      macts.appendChild(U.el('button', {
        cls: 'btn small primary', text: 'Save', onclick: () => {
          M.set('economy', 'COMBINE_OKID', { need: Math.max(2, parseInt(needIn.value, 10) || 3), yield: Math.max(1, parseInt(yieldIn.value, 10) || 1) });
          flashSaved(macts);
        },
      }));
      macts.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Reset', onclick: () => { M.set('economy', 'COMBINE_OKID', null); needIn.value = EC.COMBINE_OKID.need; yieldIn.value = EC.COMBINE_OKID.yield; flashSaved(macts, 'Reset.'); } }));
      mbox.appendChild(macts);
      body.appendChild(mbox);

      /* --- Crafted token power per Okid rarity (design the craft-from-shard outcome) --- */
      const pbox = U.el('div', { cls: 'panel mb' });
      pbox.appendChild(U.el('h3', { cls: 'gold mb', text: 'Crafted token power per Okid rarity' }));
      pbox.appendChild(U.el('p', { cls: 'small muted', text: 'When ON, crafting a Hunt shard lets the player pick which Okid rarity to spend, and that choice decides the crafted token — its rarity and flat HP/Damage/Speed multipliers. When OFF, crafting uses the shard’s own rarity (classic).' }));
      const active = Array.isArray(EC.CRAFT_BY_OKID);
      const enWrap = U.el('div', { cls: 'flex', style: 'align-items:center;gap:10px' });
      const enTog = U.el('div', { cls: 'toggle' + (active ? ' on' : '') });
      enWrap.appendChild(enTog);
      enWrap.appendChild(U.el('span', { cls: 'small', text: active ? 'ON — players choose the Okid quality' : 'OFF — classic crafting' }));
      pbox.appendChild(enWrap);
      const tblHolder = U.el('div', { cls: 'mt' });
      pbox.appendChild(tblHolder);
      function paintOkidTable() {
        tblHolder.innerHTML = '';
        if (!Array.isArray(EC.CRAFT_BY_OKID)) return;
        const tbl = U.el('table', { cls: 'adm' });
        tbl.appendChild(U.el('tr', {}, ['Okid used', '→ Token rarity', 'HP ×', 'Damage ×', 'Speed ×'].map(h => U.el('th', { text: h }))));
        const ins = [];
        SP.RARITIES.forEach((rn, i) => {
          const m = EC.CRAFT_BY_OKID[i] || { rarity: i, hpMul: 1, dmgMul: 1, speedMul: 1 };
          const rSel = selectEl(SP.RARITIES.map((r2, j) => [String(j), r2]), String(m.rarity != null ? m.rarity : i));
          const hp = numIn(m.hpMul != null ? m.hpMul : 1, { step: 0.05, style: 'max-width:80px' });
          const dm = numIn(m.dmgMul != null ? m.dmgMul : 1, { step: 0.05, style: 'max-width:80px' });
          const sp2 = numIn(m.speedMul != null ? m.speedMul : 1, { step: 0.05, style: 'max-width:80px' });
          ins.push({ rSel, hp, dm, sp2 });
          tbl.appendChild(U.el('tr', {}, [
            U.el('td', { html: '<span class="rarity-dot br' + i + '"></span>' + rn }),
            U.el('td', {}, [rSel]), U.el('td', {}, [hp]), U.el('td', {}, [dm]), U.el('td', {}, [sp2]),
          ]));
        });
        tblHolder.appendChild(tbl);
        const pacts = U.el('div', { cls: 'flex mt' });
        pacts.appendChild(U.el('button', {
          cls: 'btn small primary', text: 'Save table', onclick: () => {
            const val = ins.map(x => ({ rarity: parseInt(x.rSel.value, 10) || 0, hpMul: parseFloat(x.hp.value) || 1, dmgMul: parseFloat(x.dm.value) || 1, speedMul: parseFloat(x.sp2.value) || 1 }));
            M.set('economy', 'CRAFT_BY_OKID', val);
            flashSaved(pacts);
          },
        }));
        tblHolder.appendChild(pacts);
      }
      enTog.onclick = () => {
        if (Array.isArray(EC.CRAFT_BY_OKID)) { M.set('economy', 'CRAFT_BY_OKID', null); }
        else { M.set('economy', 'CRAFT_BY_OKID', EC.defaultCraftByOkid()); }
        rerender();
      };
      paintOkidTable();
      body.appendChild(pbox);

      /* --- Milestone level-chest token pools (manual curation) --- */
      const lbox = U.el('div', { cls: 'panel mb' });
      lbox.appendChild(U.el('h3', { cls: 'gold mb', text: 'Level chest — milestone token pools' }));
      lbox.appendChild(U.el('p', { cls: 'small muted mb', text: 'Milestone levels (3, 5, 10, 15, 20, 30, 40, 50, then every 10) grant a bonus token in the level-up chest. By default that token is any random craftable species. Set a pool for a level to replace that randomness with a hand-picked list of species/rarity options — the chest will only ever draw from your list.' }));
      const lholder = U.el('div', {});
      lbox.appendChild(lholder);
      function paintLevelPools() {
        lholder.innerHTML = '';
        const levels = M.levelChestPoolLevels();
        if (!levels.length) lholder.appendChild(U.el('p', { cls: 'muted small', text: 'No level pools set yet — every milestone still rolls any craftable species.' }));
        levels.forEach(lv => {
          const pool = M.getLevelChestPool(lv) || [];
          const row = U.el('div', { cls: 'flex', style: 'gap:8px;align-items:center;margin-bottom:6px' });
          row.appendChild(U.el('b', { cls: 'gold', style: 'min-width:70px', text: 'Level ' + lv }));
          row.appendChild(U.el('div', { cls: 'small muted', style: 'flex:1', text: pool.map(p => ((SP.get(p.speciesId) || {}).name || p.speciesId) + (p.rarity != null ? ' (' + SP.RARITIES[p.rarity] + ')' : ' (rarity: roll)')).join(', ') || '(empty)' }));
          row.appendChild(U.el('button', { cls: 'btn small ghost', text: '✎ Edit', onclick: () => editLevelChestPool(lv, pool, paintLevelPools) }));
          row.appendChild(U.el('button', { cls: 'btn small danger', text: '🗑', onclick: () => { if (confirm('Remove the pool for level ' + lv + '? It will go back to rolling any craftable species.')) { M.deleteLevelChestPool(lv); paintLevelPools(); } } }));
          lholder.appendChild(row);
        });
      }
      paintLevelPools();
      const laddRow = U.el('div', { cls: 'flex mt', style: 'gap:8px;align-items:end' });
      const lvIn = numIn(10, { step: 1, min: 1, style: 'max-width:100px' });
      laddRow.appendChild(U.el('div', {}, [U.el('label', { cls: 'lbl', text: 'Level' }), lvIn]));
      laddRow.appendChild(U.el('button', {
        cls: 'btn small primary', text: '＋ Add / edit a level’s pool', onclick: () => {
          const lv = Math.max(1, parseInt(lvIn.value, 10) || 10);
          editLevelChestPool(lv, M.getLevelChestPool(lv) || [], paintLevelPools);
        },
      }));
      lbox.appendChild(laddRow);
      body.appendChild(lbox);

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
          /* respect the "no auto-generated tokens" setting — a fresh AI starts
             empty so the creator can hand-design its collection */
          if (!EC.NO_AUTOGEN) {
            for (let i = 0; i < 12; i++) {
              const t = TK.mint({ speciesId: rng.pick(SP.craftable), rng, owner: naiAcc.id, aiOwner: true });
              naiAcc.tokens[t.id] = t;
            }
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
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'Spawn tokens into any account — prizes, events, testing. Stats are rolled fresh from the rarity band. For an exact, hand-designed token, craft it in the Crafting Station tab and grant it from the Reserve instead.' }));
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
      const hslots = U.el('input', { cls: 'txt', type: 'number', placeholder: 'Hunt slots' });
      body.appendChild(U.el('div', { cls: 'flex' }, [gold, ngak, hslots, U.el('button', {
        cls: 'btn', text: 'Grant to selected account', onclick: () => {
          const a = G.world.accounts[acc.value];
          a.gold += parseInt(gold.value) || 0;
          a.ngakara += parseInt(ngak.value) || 0;
          const hs = parseInt(hslots.value) || 0;
          if (hs > 0) G.admin.grantHuntSlots(a.id, hs);
          G.saveNow(); G.pushAccountToCloud(a); alert('Granted' + (hs > 0 ? ' (incl. ' + hs + ' Hunt slot' + (hs > 1 ? 's' : '') + ')' : '') + '.');
        },
      })]));
    },

    /* ================= CRAFTING STATION ================= */
    'Crafting Station'(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'Design a token from scratch with the universal token designer — species, name, rarity, size, exact stats, abilities, behavior tree, everything. Then either place it in the Reserve — a stockpile you can grant to any player, use as an exact tournament reward, or push to the Guild stall later — or push it straight onto the Guild stall now.' }));
      body.appendChild(U.el('button', { cls: 'btn primary mb', text: '✎ Craft a new token…', onclick: () => craftToken() }));

      const entries = M.reserveEntries();
      body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Reserve — ' + entries.length + ' token' + (entries.length === 1 ? '' : 's') + ' waiting' }));
      body.appendChild(U.el('p', { cls: 'small muted mb', text: 'Belongs to no one yet. Grant it directly into a player’s collection, push it to the Guild stall, or pick it as an exact tournament reward from the Tournaments tab.' }));
      if (!entries.length) { body.appendChild(U.el('p', { cls: 'muted small', text: 'The Reserve is empty. Craft a token above to add one.' })); return; }

      const tbl = U.el('table', { cls: 'adm' });
      tbl.appendChild(U.el('tr', {}, ['', 'Design', ''].map(h => U.el('th', { text: h }))));
      entries.forEach(entry => {
        const sp = SP.get(entry.spec.speciesId);
        const tr = U.el('tr', {});
        const iconTd = U.el('td', {});
        if (sp) iconTd.appendChild(spriteThumb(sp, 34));
        tr.appendChild(iconTd);
        tr.appendChild(U.el('td', { text: specSummary(entry.spec) }));
        const actTd = U.el('td', { style: 'white-space:nowrap' });
        actTd.appendChild(U.el('button', {
          cls: 'btn small ghost', text: '✎ Edit', onclick: () => editHuntEnemy(entry.spec, () => { M.setReserveEntry(entry); rerender(); }, { hideBoss: true, title: 'Reserve token — design every detail', intro: 'Anything you set is minted true when this is granted; blank fields roll then.' }),
        }));
        actTd.appendChild(U.el('button', {
          cls: 'btn small ghost', text: '🏪 Push to stall', onclick: () => {
            const raw = prompt('List this token on the Guild stall for how much gold?', '150');
            if (raw == null) return;
            const price = parseInt(raw, 10);
            if (!price || price <= 0) { alert('Enter a price greater than 0.'); return; }
            const r = G.admin.pushReserveToStall(entry.id, price);
            if (r.err) alert(r.err); else rerender();
          },
        }));
        const grantSel = U.el('select', { cls: 'txt', style: 'max-width:170px' });
        Object.values(G.world.accounts).forEach(a => grantSel.appendChild(U.el('option', { value: a.id, text: a.displayName + (a.ai ? ' (AI)' : '') })));
        actTd.appendChild(grantSel);
        actTd.appendChild(U.el('button', {
          cls: 'btn small ghost', text: '🎁 Grant', onclick: () => {
            const acc = G.world.accounts[grantSel.value];
            if (!acc || !confirm('Grant this token directly to ' + acc.displayName + '\'s collection?')) return;
            const r = G.admin.grantReserveEntry(entry.id, acc.id);
            if (r.err) alert(r.err); else rerender();
          },
        }));
        actTd.appendChild(U.el('button', {
          cls: 'btn small danger', text: '🗑', onclick: () => {
            if (!confirm('Delete this token from the Reserve permanently?')) return;
            M.deleteReserveEntry(entry.id);
            rerender();
          },
        }));
        tr.appendChild(actTd);
        tbl.appendChild(tr);
      });
      body.appendChild(tbl);
    },

    /* ================= ALL TOKENS ================= */
    'All Tokens'(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'Every token in the game — the entire collection of every account this admin session can see (real players, Dya’kukull, and any cloud accounts loaded). Escrowed / on-market / pouched tokens are included; each still lives in its owner’s collection. Search or filter to narrow.' }));
      /* pulling in the cloud accounts makes this literally every real player's tokens, not just this browser's */
      body.appendChild(cloudAccountsLine());

      /* flatten every token across every account */
      const all = [];
      Object.values(G.world.accounts).forEach(acc => {
        Object.values(acc.tokens || {}).forEach(tok => all.push({ tok, owner: acc }));
      });

      /* summary */
      const byRarity = {};
      all.forEach(({ tok }) => { byRarity[tok.rarity] = (byRarity[tok.rarity] || 0) + 1; });
      const realCount = all.filter(x => !x.owner.ai).length;
      const tiles = U.el('div', { cls: 'grid mt', style: 'grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px' });
      [['Total tokens', U.fmt(all.length)], ['Held by real players', U.fmt(realCount)], ['Held by Dya’kukull', U.fmt(all.length - realCount)], ['Accounts', U.fmt(Object.keys(G.world.accounts).length)]].forEach(([l, v]) => {
        tiles.appendChild(U.el('div', { cls: 'stat-tile' }, [U.el('div', { cls: 'st-num', text: v }), U.el('div', { cls: 'st-lbl', text: l })]));
      });
      body.appendChild(tiles);
      body.appendChild(U.el('p', { cls: 'small muted mt mb', text: 'By rarity: ' + SP.RARITIES.map((rn, i) => (byRarity[i] || 0) + '× ' + rn).join('  ·  ') }));

      /* controls */
      const bar = U.el('div', { cls: 'flex mb', style: 'gap:8px;flex-wrap:wrap;align-items:center' });
      const search = U.el('input', { cls: 'txt', style: 'max-width:240px', placeholder: '🔎 name / species / owner…' });
      const ownerSel = selectEl([['all', 'All owners'], ['real', 'Real players only'], ['ai', 'Dya’kukull only']], 'all');
      const rarSel = selectEl([['any', 'Any rarity']].concat(SP.RARITIES.map((r, i) => [String(i), r])), 'any');
      const statusSel = selectEl([['any', 'Any status'], ['collection', 'Collection'], ['market', 'On market'], ['pouch', 'In pouch'], ['field', 'On field']], 'any');
      bar.appendChild(search); bar.appendChild(ownerSel); bar.appendChild(rarSel); bar.appendChild(statusSel);
      body.appendChild(bar);

      const CAP = 300;
      const note = U.el('p', { cls: 'small muted' });
      body.appendChild(note);
      const holder = U.el('div', {});
      body.appendChild(holder);

      function repaint() {
        const q = search.value.trim().toLowerCase();
        const ownerF = ownerSel.value, rarF = rarSel.value, statF = statusSel.value;
        let rows = all.filter(({ tok, owner }) => {
          if (ownerF === 'real' && owner.ai) return false;
          if (ownerF === 'ai' && !owner.ai) return false;
          if (rarF !== 'any' && String(tok.rarity) !== rarF) return false;
          if (statF !== 'any' && (tok.status || 'collection') !== statF) return false;
          if (q) {
            const sp = SP.get(tok.speciesId);
            const hay = (tok.name + ' ' + (sp ? sp.name : tok.speciesId) + ' ' + owner.displayName + ' ' + (SP.RARITIES[tok.rarity] || '')).toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });
        rows.sort((a, b) => (b.tok.rarity - a.tok.rarity) || ((SP.get(a.tok.speciesId) || {}).name || a.tok.speciesId).localeCompare((SP.get(b.tok.speciesId) || {}).name || b.tok.speciesId));
        note.textContent = 'Showing ' + Math.min(rows.length, CAP) + ' of ' + rows.length + ' matching token(s)' + (rows.length > CAP ? ' — narrow with search to see the rest.' : '.') + ' Click any row to edit that token.';
        holder.innerHTML = '';
        const tbl = U.el('table', { cls: 'adm' });
        tbl.appendChild(U.el('tr', {}, ['', 'Name', 'Species', 'Rarity', 'Size', 'Element', 'Owner', 'Status', 'HP / DMG / SPD', 'Played', ''].map(h => U.el('th', { text: h }))));
        rows.slice(0, CAP).forEach(({ tok, owner }) => {
          const sp = SP.get(tok.speciesId);
          /* the whole row opens the token editor — the table is wide and the
             Edit button in the last column is easy to miss behind the sideways
             scroll, so clicking anywhere on the row (except the Owner button)
             works too */
          const tr = U.el('tr', { style: 'cursor:pointer' });
          tr.onclick = () => editToken(tok, owner);
          const iconTd = U.el('td', {});
          if (sp) iconTd.appendChild(spriteThumb(sp, 34));
          tr.appendChild(iconTd);
          tr.appendChild(U.el('td', { html: '<b class="gold">' + U.esc(tok.name) + '</b>' + (tok.nameLocked ? ' 🔒' : '') + (tok.frozen ? ' ❄' : '') + (tok.isRental ? ' <span class="pill">rental</span>' : '') }));
          tr.appendChild(U.el('td', { text: sp ? sp.name : tok.speciesId }));
          tr.appendChild(U.el('td', { text: SP.RARITIES[tok.rarity] != null ? SP.RARITIES[tok.rarity] : tok.rarity }));
          tr.appendChild(U.el('td', { text: SP.SIZES[tok.sizeIdx] != null ? SP.SIZES[tok.sizeIdx] : tok.sizeIdx }));
          tr.appendChild(U.el('td', { text: tok.element || (sp ? sp.element : '—') }));
          tr.appendChild(U.el('td', { html: U.esc(owner.displayName) + (owner.ai ? ' <span class="pill">AI</span>' : (owner.cloudAccount ? ' <span class="pill">🌐</span>' : '')) }));
          tr.appendChild(U.el('td', { text: tok.status || 'collection' }));
          tr.appendChild(U.el('td', { text: tok.stats ? (tok.stats.hp + ' / ' + tok.stats.dmg + ' / ' + tok.stats.speed) : '—' }));
          tr.appendChild(U.el('td', { text: tok.matchesPlayed || 0 }));
          const actTd = U.el('td', {});
          actTd.appendChild(U.el('button', { cls: 'btn small primary', text: '✎ Edit', onclick: (e) => { e.stopPropagation(); editToken(tok, owner); } }));
          actTd.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Owner', onclick: (e) => { e.stopPropagation(); editAccount(owner); } }));
          actTd.appendChild(U.el('button', {
            cls: 'btn small danger', text: '🗑 Delete', onclick: (e) => {
              e.stopPropagation();
              if (!confirm('Delete "' + tok.name + '" from ' + owner.displayName + '\'s collection permanently?')) return;
              delete owner.tokens[tok.id];
              (owner.pouches || []).forEach(p => { if (p.tokenIds) p.tokenIds = p.tokenIds.filter(x => x !== tok.id); });
              Object.values(G.world.market.listings).forEach(l => { if (l.tokenId === tok.id) delete G.world.market.listings[l.id]; });
              /* drop it from the flattened list backing this tab, then repaint */
              for (let i = all.length - 1; i >= 0; i--) { if (all[i].tok === tok) all.splice(i, 1); }
              G.saveNow(); G.pushAccountToCloud(owner);
              repaint();
            },
          }));
          tr.appendChild(actTd);
          tbl.appendChild(tr);
        });
        holder.appendChild(tbl);
      }
      search.oninput = repaint;
      [ownerSel, rarSel, statusSel].forEach(el => el.onchange = repaint);
      repaint();
    },

    /* ================= TOURNAMENTS ================= */
    Tournaments(body) {
      /* ---- OFFICIAL SEASON: open/close the ranked ladder (you are the organizer) ---- */
      const live = M.seasonLive && M.seasonLive();
      const sbox = U.el('div', { cls: 'panel mb', style: 'border-left:3px solid ' + (live ? 'var(--gold)' : 'var(--line)') });
      sbox.appendChild(U.el('div', { cls: 'flex', style: 'align-items:center;gap:12px' }, [
        U.el('div', { style: 'font-size:26px', text: live ? '🟢' : '🔴' }),
        U.el('div', { cls: 'flex1', html: '<b class="gold">Official season — ' + (live ? 'OPEN' : 'CLOSED') + '</b><br><span class="small muted">The ranked ladder doesn’t run until you open it. You are the organizer of the Guild season; players can only climb once it’s open.</span>' }),
        U.el('button', {
          cls: 'btn ' + (live ? 'danger' : 'primary'), text: live ? 'Close the season' : '▶ Open the official season',
          onclick: () => {
            if (!M.setSeasonLive) { alert('Update the game to the latest build to control the season.'); return; }
            if (live && !confirm('Close the official season? Players won’t be able to play ranked ladder matches until you open it again.')) return;
            M.setSeasonLive(!live);
            flashSaved(sbox, live ? 'Season closed — pushing to all players…' : 'Season OPEN — pushing to all players…');
            rerender();
          },
        }),
      ]));
      if (!M.configured()) sbox.appendChild(U.el('p', { cls: 'small muted mt', text: 'Online isn’t configured, so this only affects this browser. With Supabase set up, opening the season reaches every player within a minute.' }));
      body.appendChild(sbox);

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

      /* ---- OFFICIAL online season tournaments: make live & monitor ---- */
      onlineTournaments(body);

      body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Season ' + G.world.season.number + ' winners so far' }));
      if (!G.world.season.winners.length) body.appendChild(U.el('p', { cls: 'muted small', text: 'None yet.' }));
      G.world.season.winners.forEach(w => body.appendChild(U.el('div', { cls: 'small', text: '🏆 ' + w.name + ' — ' + w.tournament + ' (' + w.circuit + ')' })));

      /* ---- official season LADDER standings (ranked circuit climb) ---- */
      seasonLadderStandings(body);
      body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'All tournaments' }));
      const tbl = U.el('table', { cls: 'adm' });
      tbl.appendChild(U.el('tr', {}, [U.el('th', { text: 'Name' }), U.el('th', { text: 'Circuit' }), U.el('th', { text: 'State' }), U.el('th', { text: 'Players' }), U.el('th', { text: '' })]));
      Object.values(G.world.tournaments).forEach(t => {
        const tr = U.el('tr', {}, [U.el('td', { text: t.name + (t.sealed ? ' 🔴' : '') + (Array.isArray(t.placeRewards) && t.placeRewards.length ? ' 🎁' : '') }), U.el('td', { text: t.circuit }), U.el('td', { text: t.state }), U.el('td', { text: t.players.length + '/' + t.size })]);
        const td = U.el('td', {});
        td.appendChild(U.el('button', { cls: 'btn small', text: '🎁 Rewards', onclick: () => editTournamentRewards(t.size, t.placeRewards, (rw) => { if (rw) t.placeRewards = rw; else delete t.placeRewards; G.saveNow(); rerender(); }) }));
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

      /* ---- shared world: make this device's curated Dya'kukull world global ---- */
      const swBox = U.el('div', { cls: 'panel mb' });
      swBox.appendChild(U.el('h3', { cls: 'gold mb', text: '🌐 Shared world (Dya’kukull + AI market)' }));
      const swConf = G.adminWorldSync && G.adminWorldSync.configured && G.adminWorldSync.configured();
      swBox.appendChild(U.el('p', { cls: 'small muted', text: swConf
        ? 'Deleting/editing/spawning Dya’kukull tokens now auto-publishes to every device on the next sync. Real players’ own accounts always sync separately and are never touched. Use this to force a publish right now, or pull the latest shared world.'
        : 'Online isn’t configured (js/config.js), so the Dya’kukull world stays local to this device. Real-player accounts still sync when online is set up.' }));
      if (swConf) {
        const err = G.adminWorldSync.error;
        swBox.appendChild(U.el('p', { cls: 'small ' + (err ? '' : 'muted'), style: err ? 'color:var(--red)' : '', text: err
          ? '⚠ Shared-world sync problem: ' + err + (/(relation|table|column)/i.test(err) ? ' — the dya_config table must exist (run supabase/schema.sql).' : '')
          : '✓ Online. Revision ' + (G.world.adminWorldRev || 0) + (G.adminWorldSync.lastPush ? ' · published ' + U.timeAgo(G.adminWorldSync.lastPush) : '') + '.' }));
        const swActs = U.el('div', { cls: 'flex', style: 'flex-wrap:wrap;gap:8px' });
        swActs.appendChild(U.el('button', {
          cls: 'btn primary', text: '🌐 Publish world to all devices now', onclick: async () => {
            const r = await G.publishAdminWorld();
            alert(r.ok ? 'Published ' + r.accounts + ' Dya’kukull account(s). Every device adopts this on its next load.' : 'Publish failed: ' + r.err);
            rerender();
          },
        }));
        swActs.appendChild(U.el('button', {
          cls: 'btn', text: '⬇ Pull latest shared world', onclick: async () => {
            const r = await G.fetchAdminWorld();
            alert(r.adopted ? 'Adopted the latest shared world.' : (r.err ? 'Fetch failed: ' + r.err : 'Already up to date.'));
            rerender();
          },
        }));
        swBox.appendChild(swActs);
      }
      body.appendChild(swBox);

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
      /* ---- hand-designed world: purge auto-generated tokens + stop new ones ---- */
      body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Auto-generated tokens' }));
      const autoCount = G.admin.countAutoGenTokens();
      const noAuto = !!EC.NO_AUTOGEN;
      body.appendChild(U.el('p', { cls: 'muted small', text: 'Design every active token by hand: turn off auto-generation so the world stops minting filler, then purge the procedurally-generated tokens that already exist. Tutorial/starter tokens and anything you have edited are kept.' }));
      const agRow = U.el('div', { cls: 'flex mb', style: 'flex-wrap:wrap;align-items:center;gap:10px' });
      const agTog = U.el('div', { cls: 'toggle' + (noAuto ? ' on' : '') });
      agTog.onclick = () => { M.set('economy', 'NO_AUTOGEN', noAuto ? null : true); rerender(); };
      agRow.appendChild(agTog);
      agRow.appendChild(U.el('span', { cls: 'small', text: noAuto ? 'Auto-generation OFF — the world no longer mints filler tokens.' : 'Auto-generation ON — Dya’kukull still craft filler tokens.' }));
      body.appendChild(agRow);
      body.appendChild(U.el('div', { cls: 'flex mb', style: 'flex-wrap:wrap;align-items:center;gap:10px' }, [
        U.el('button', {
          cls: 'btn danger', text: '🧹 Purge auto-generated tokens (' + autoCount + ')', onclick: () => {
            if (!autoCount) { alert('No auto-generated tokens to purge.'); return; }
            if (!confirm('Delete all ' + autoCount + ' auto-generated tokens across every account? Hand-designed, edited, and tutorial tokens are kept. No undo.')) return;
            const r = G.admin.purgeAutoGenTokens();
            alert('Purged ' + r.removed + ' auto-generated token(s).');
            rerender();
          },
        }),
        U.el('span', { cls: 'small muted', text: autoCount + ' auto-generated token(s) currently in the world.' }),
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

  /* ================= HUNT EDITOR =================
     Authors one individual Hunt end to end: identity, narrative framing,
     the encounter chain, and the exact rewards. */
  function selectEl(options, value) {
    const s = U.el('select', { cls: 'txt' });
    options.forEach(([v, label]) => s.appendChild(U.el('option', { value: v, text: label })));
    if (value != null) s.value = value;
    return s;
  }
  function parseEnemies(text) {
    return (text || '').split('\n').map(line => {
      const parts = line.trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return null;
      const e = { speciesId: parts[0] };
      parts.slice(1).forEach(p => {
        if (/^\d+$/.test(p)) e.rarity = parseInt(p, 10);
        else if (/^boss$/i.test(p)) e.boss = true;
      });
      return e;
    }).filter(Boolean);
  }
  function enemiesToText(arr) {
    return (arr || []).map(e => [e.speciesId, (e.rarity != null ? e.rarity : null), (e.boss ? 'boss' : null)].filter(x => x != null && x !== '').join(' ')).join('\n');
  }
  function editHunt(existing) {
    const isNew = !existing;
    const firstSpid = (SP.list[0] && SP.list[0].id) || '';
    const work = existing ? U.deepCopy(existing) : {
      id: U.uid('hunt'), name: '', speciesId: firstSpid, rarity: 3, narrator: 'guide', intro: '',
      encounters: [{ name: 'The Quarry', desc: '', terrain: 'plains', enemies: [{ speciesId: firstSpid, boss: true }] }],
      rewards: { gold: 600, okid: 3, ngakara: 3, pieces: 1, pieceMaterial: '', secondPieceChance: (EC.HUNT && EC.HUNT.secondPieceChance) || 0.06 },
      partySize: 5,
      hunted: false, huntedBy: null, huntedAt: 0, createdAt: Date.now(),
    };
    work.rewards = work.rewards || {};
    work.encounters = work.encounters || [];
    if (work.partySize == null) work.partySize = 5;

    const { w, close } = modal('3% 6%');
    const closeAll = () => { stopPreviews(); close(); rerender(); };
    w.appendChild(U.el('h2', { cls: 'gold', text: isNew ? 'Create a Hunt' : 'Edit Hunt — ' + (work.name || work.speciesId) }));
    w.appendChild(U.el('p', { cls: 'small muted mb', text: 'This is one specific creature. Give it a name, choose which species it is, frame the pursuit, build the encounters it takes to bring it down, and set exactly what the hunter earns.' }));

    const cols = U.el('div', { cls: 'grid', style: 'grid-template-columns:320px 1fr;gap:18px;align-items:start' });
    w.appendChild(cols);

    /* ---------- LEFT: identity + sprite ---------- */
    const left = U.el('div', {});
    cols.appendChild(left);
    left.appendChild(U.el('h3', { cls: 'gold mb', text: 'The creature' }));
    left.appendChild(livePreview(() => SP.get(work.speciesId) || SP.list[0]));

    const nameIn = U.el('input', { cls: 'txt', maxlength: 32, value: work.name, placeholder: 'e.g. Old Scarback' });
    lblIn(left, 'Individual name', nameIn);

    const spSel = selectEl(SP.list.map(s => [s.id, s.name]), work.speciesId);
    spSel.onchange = () => { work.speciesId = spSel.value; };
    lblIn(left, 'Species (what it is)', spSel);

    const rarSel = selectEl(SP.RARITIES.map((r, i) => [String(i), r]), String(work.rarity));
    lblIn(left, 'Rarity', rarSel);

    /* how many tokens the hunter fields for THIS hunt — their own Eikar plus
       (partySize − 1) chosen. A token that falls is out for the rest of the
       hunt, so a smaller party is a harder, higher-stakes pursuit. */
    const partyIn = numIn(work.partySize != null ? work.partySize : 5, { step: 1, min: 1, max: 13 });
    partyIn.oninput = () => work.partySize = U.clamp(parseInt(partyIn.value, 10) || 5, 1, 13);
    lblIn(left, 'Hunting party size (incl. the player)', partyIn);

    const narSel = selectEl(Object.keys(L.NARRATORS).map(k => [k, L.NARRATORS[k].name]), work.narrator);
    lblIn(left, 'Narrator (voice of the Track)', narSel);

    /* ---------- RIGHT: narrative + rewards ---------- */
    const right = U.el('div', {});
    cols.appendChild(right);

    const introTa = U.el('textarea', { cls: 'txt', rows: 5, style: 'width:100%', placeholder: 'The Track intro this narrator speaks before the two questions. Leave blank to use the narrator’s default opener.' });
    introTa.value = work.intro || '';
    right.appendChild(U.el('h3', { cls: 'gold mb', text: 'The Track — opening words' }));
    right.appendChild(introTa);
    right.appendChild(U.el('p', { cls: 'small muted mt', text: 'The two Track questions are drawn from the pools under Text & Lore (species-specific first, then general).' }));

    right.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Rewards on success' }));
    const rewGrid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px' });
    const rewIns = {};
    [['gold', 'Gold (max)'], ['okid', 'Buri Okid (max)'], ['ngakara', 'NgAkara (max)'], ['pieces', 'Guaranteed pieces']].forEach(([k, lb]) => {
      const cell = U.el('div', {});
      cell.appendChild(U.el('label', { cls: 'lbl', text: lb }));
      rewIns[k] = numIn(work.rewards[k] != null ? work.rewards[k] : 0, { step: 1 });
      cell.appendChild(rewIns[k]);
      rewGrid.appendChild(cell);
    });
    right.appendChild(rewGrid);
    const rewGrid2 = U.el('div', { cls: 'grid mt', style: 'grid-template-columns:1fr 160px;gap:8px' });
    const matCell = U.el('div', {});
    matCell.appendChild(U.el('label', { cls: 'lbl', text: 'Crafting-piece material (blank = random)' }));
    rewIns.pieceMaterial = U.el('input', { cls: 'txt', value: work.rewards.pieceMaterial || '', placeholder: 'e.g. ridge-scale' });
    matCell.appendChild(rewIns.pieceMaterial);
    rewGrid2.appendChild(matCell);
    const chCell = U.el('div', {});
    chCell.appendChild(U.el('label', { cls: 'lbl', text: 'Bonus-piece chance (perfect run)' }));
    rewIns.secondPieceChance = numIn(work.rewards.secondPieceChance != null ? work.rewards.secondPieceChance : 0.06, { step: 0.01 });
    chCell.appendChild(rewIns.secondPieceChance);
    rewGrid2.appendChild(chCell);
    right.appendChild(rewGrid2);
    right.appendChild(U.el('p', { cls: 'small muted mt', text: 'Gold/Okid/NgAkara are ceilings — a hunter’s hidden performance score scales the actual payout down from these.' }));

    /* ---------- ENCOUNTERS (full width) ---------- */
    w.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Encounter chain' }));
    w.appendChild(U.el('p', { cls: 'small muted mb', text: 'Each encounter is one match on the way to the kill. Enemies: one per line as "speciesId [rarity] [boss]" — e.g. "harkal" or "su_naga 4 boss". The last enemy of the final encounter is the creature itself.' }));
    const terrainOpts = L.TERRAIN_SETS.map(t => [t.id, t.name]);
    const encWrap = U.el('div', {});
    w.appendChild(encWrap);

    /* structured per-enemy editor: species/rarity/boss inline, plus an
       optional "exact" panel that overrides the wild roll with precise
       size, hp/dmg/speed, behavior value, and individual variables. */
    function paintEnemies(enc, container) {
      container.innerHTML = '';
      enc.enemies.forEach((en, idx) => {
        const row = U.el('div', { cls: 'panel', style: 'padding:8px;margin-bottom:6px;background:#20180e' });
        const top = U.el('div', { cls: 'flex', style: 'gap:6px;align-items:center;flex-wrap:wrap' });
        const spSel = selectEl(SP.list.map(s => [s.id, s.name]), en.speciesId || (SP.list[0] && SP.list[0].id));
        spSel.style.flex = '2'; spSel.onchange = () => en.speciesId = spSel.value;
        const rSel = selectEl([['', 'rarity: roll']].concat(SP.RARITIES.map((r, i) => [String(i), r])), en.rarity != null ? String(en.rarity) : '');
        rSel.style.flex = '1'; rSel.onchange = () => { if (rSel.value === '') delete en.rarity; else en.rarity = parseInt(rSel.value, 10); };
        const bossWrap = U.el('label', { cls: 'small', style: 'display:flex;align-items:center;gap:4px' });
        const bossChk = U.el('input', { type: 'checkbox' }); bossChk.checked = !!en.boss;
        bossChk.onchange = () => { if (bossChk.checked) en.boss = true; else delete en.boss; };
        bossWrap.appendChild(bossChk); bossWrap.appendChild(U.el('span', { text: 'boss' }));
        /* summary of the overrides authored on this creature */
        const ov = [];
        if (en.name) ov.push('“' + en.name + '”');
        if (en.sizeIdx != null) ov.push(SP.SIZES[en.sizeIdx]);
        if (en.stats && (en.stats.hp != null || en.stats.dmg != null || en.stats.speed != null)) ov.push('stats');
        if (en.picks && en.picks.headCount != null) ov.push(en.picks.headCount + ' heads');
        if (en.behavior) ov.push(en.behavior);
        if (en.vars && Object.keys(en.vars).length) ov.push(Object.keys(en.vars).length + ' vars');
        if (en.picks && Object.keys(en.picks).filter(k => k !== 'headCount').length) ov.push('picks');
        const editBtn = U.el('button', { cls: 'btn small', text: '✎ edit creature' + (ov.length ? ' (' + ov.join(', ') + ')' : '') });
        editBtn.onclick = () => editHuntEnemy(en, () => paintEnemies(enc, container));
        const delBtn = U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { enc.enemies.splice(idx, 1); paintEnemies(enc, container); } });
        top.appendChild(spSel); top.appendChild(rSel); top.appendChild(bossWrap); top.appendChild(editBtn); top.appendChild(delBtn);
        row.appendChild(top);
        container.appendChild(row);
      });
      container.appendChild(U.el('button', {
        cls: 'btn small', text: '＋ Add enemy', onclick: () => {
          enc.enemies.push({ speciesId: (SP.get(work.speciesId) ? work.speciesId : (SP.list[0] && SP.list[0].id)) });
          paintEnemies(enc, container);
        },
      }));
    }

    function paintEncounters() {
      encWrap.innerHTML = '';
      work.encounters.forEach((enc, i) => {
        const box = U.el('div', { cls: 'panel mb', style: 'padding:10px' });
        const head = U.el('div', { cls: 'flex', style: 'align-items:center' });
        head.appendChild(U.el('b', { cls: 'gold flex1', text: 'Encounter ' + (i + 1) }));
        if (i > 0) head.appendChild(U.el('button', { cls: 'btn small ghost', text: '↑', onclick: () => { const t = work.encounters[i - 1]; work.encounters[i - 1] = enc; work.encounters[i] = t; paintEncounters(); } }));
        if (i < work.encounters.length - 1) head.appendChild(U.el('button', { cls: 'btn small ghost', text: '↓', onclick: () => { const t = work.encounters[i + 1]; work.encounters[i + 1] = enc; work.encounters[i] = t; paintEncounters(); } }));
        head.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { work.encounters.splice(i, 1); paintEncounters(); } }));
        box.appendChild(head);
        const grid = U.el('div', { cls: 'grid mt', style: 'grid-template-columns:1fr 200px;gap:8px' });
        const nCell = U.el('div', {});
        nCell.appendChild(U.el('label', { cls: 'lbl', text: 'Encounter name' }));
        const nIn = U.el('input', { cls: 'txt', value: enc.name || '' });
        nIn.oninput = () => enc.name = nIn.value;
        nCell.appendChild(nIn);
        grid.appendChild(nCell);
        const tCell = U.el('div', {});
        tCell.appendChild(U.el('label', { cls: 'lbl', text: 'Terrain' }));
        const tSel = selectEl(terrainOpts, enc.terrain || 'plains');
        tSel.onchange = () => enc.terrain = tSel.value;
        tCell.appendChild(tSel);
        grid.appendChild(tCell);
        box.appendChild(grid);
        const dTa = U.el('textarea', { cls: 'txt mt', rows: 2, style: 'width:100%', placeholder: 'What the hunter sees here.' });
        dTa.value = enc.desc || '';
        dTa.oninput = () => enc.desc = dTa.value;
        box.appendChild(U.el('label', { cls: 'lbl', text: 'Description' }));
        box.appendChild(dTa);
        box.appendChild(U.el('label', { cls: 'lbl', text: 'Enemies — the last enemy of the final encounter is the quarry itself' }));
        enc.enemies = (enc.enemies || []).map(e => typeof e === 'string' ? { speciesId: e } : e);
        const enemyWrap = U.el('div', {});
        box.appendChild(enemyWrap);
        paintEnemies(enc, enemyWrap);
        encWrap.appendChild(box);
      });
      encWrap.appendChild(U.el('button', {
        cls: 'btn small', text: '＋ Add encounter', onclick: () => {
          work.encounters.push({ name: 'Encounter ' + (work.encounters.length + 1), desc: '', terrain: 'plains', enemies: [{ speciesId: work.speciesId, boss: true }] });
          paintEncounters();
        },
      }));
    }
    paintEncounters();

    /* ---------- ACTIONS ---------- */
    const acts = U.el('div', { cls: 'flex mt', style: 'flex-wrap:wrap' });
    acts.appendChild(U.el('button', {
      cls: 'btn primary', text: isNew ? 'Create Hunt' : 'Save Hunt', onclick: () => {
        const name = nameIn.value.trim();
        if (!name) { alert('Give the creature a name.'); return; }
        if (!SP.get(spSel.value)) { alert('Pick a valid species.'); return; }
        work.name = name;
        work.speciesId = spSel.value;
        work.rarity = parseInt(rarSel.value, 10) || 0;
        work.partySize = U.clamp(parseInt(partyIn.value, 10) || 5, 1, 13);
        work.narrator = narSel.value;
        work.intro = introTa.value.trim();
        work.rewards = {
          gold: parseInt(rewIns.gold.value, 10) || 0,
          okid: parseInt(rewIns.okid.value, 10) || 0,
          ngakara: parseInt(rewIns.ngakara.value, 10) || 0,
          pieces: Math.max(1, parseInt(rewIns.pieces.value, 10) || 1),
          pieceMaterial: rewIns.pieceMaterial.value.trim(),
          secondPieceChance: U.clamp(parseFloat(rewIns.secondPieceChance.value) || 0, 0, 1),
        };
        const cleanEnemy = (en) => {
          if (typeof en === 'string') return { speciesId: en };
          const out = { speciesId: en.speciesId };
          if (en.rarity != null) out.rarity = en.rarity;
          if (en.boss) out.boss = true;
          if (en.name) out.name = en.name;
          if (en.sizeIdx != null) out.sizeIdx = en.sizeIdx;
          if (en.element) out.element = en.element;
          if (en.behavior) out.behavior = en.behavior;
          if (en.behaviorValue != null) out.behaviorValue = en.behaviorValue;
          if (en.vars && Object.keys(en.vars).length) out.vars = en.vars;
          if (en.picks && Object.keys(en.picks).length) out.picks = en.picks;
          if (en.stats && Object.keys(en.stats).some(k => en.stats[k] != null)) {
            out.stats = {};
            ['hp', 'dmg', 'speed'].forEach(k => { if (en.stats[k] != null) out.stats[k] = en.stats[k]; });
          }
          return out;
        };
        work.encounters = (work.encounters || []).map(e => ({
          name: (e.name || '').trim() || 'Encounter',
          desc: (e.desc || '').trim(),
          terrain: e.terrain || 'plains',
          enemies: (e.enemies && e.enemies.length) ? e.enemies.map(cleanEnemy) : [{ speciesId: work.speciesId, boss: true }],
        }));
        if (!work.encounters.length) work.encounters = [{ name: 'The Quarry', desc: '', terrain: 'plains', enemies: [{ speciesId: work.speciesId, boss: true }] }];
        M.setHunt(work);
        closeAll();
      },
    }));
    acts.appendChild(U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: closeAll }));
    if (!isNew) acts.appendChild(U.el('button', { cls: 'btn danger', text: 'Delete Hunt', onclick: () => { if (confirm('Delete this Hunt permanently?')) { M.deleteHunt(work.id); closeAll(); } } }));
    w.appendChild(acts);
  }

  /* One-line summary of everything an admin has designed onto a token spec,
     so pool entries and listings show what's been customized at a glance. */
  function specSummary(spec) {
    spec = spec || {};
    const sp = SP.get(spec.speciesId);
    const bits = [sp ? sp.name : (spec.speciesId || '?')];
    bits.push(spec.rarity != null ? SP.RARITIES[spec.rarity] : 'rarity: roll');
    if (spec.sizeIdx != null) bits.push(SP.SIZES[spec.sizeIdx]);
    if (spec.element) bits.push(spec.element);
    if (spec.stats && (spec.stats.hp != null || spec.stats.dmg != null || spec.stats.speed != null)) bits.push('exact stats');
    if (spec.behaviorValue != null) bits.push('behaviour ' + spec.behaviorValue);
    if (spec.behavior) bits.push('tree:' + spec.behavior);
    if (spec.picks && spec.picks.headCount != null) bits.push(spec.picks.headCount + ' heads');
    const nVars = spec.vars ? Object.keys(spec.vars).length : 0;
    const nPicks = spec.picks ? Object.keys(spec.picks).filter(k => k !== 'headCount').length : 0;
    if (nVars) bits.push(nVars + ' var' + (nVars > 1 ? 's' : ''));
    if (nPicks) bits.push(nPicks + ' pick' + (nPicks > 1 ? 's' : ''));
    return bits.join(' · ');
  }

  /* ================= GUILD LISTING EDITOR =================
     Authors one creature the Dya Guild sells outright. The creature itself is
     designed with the full token designer (every stat, variable, trait and
     decision tree); this modal wraps that with the sale price and stall copy.
     It's minted true to the design every time a player buys it. */
  function editGuildListing(existing) {
    const isNew = !existing;
    const firstSpid = (SP.list[0] && SP.list[0].id) || '';
    const work = existing ? U.deepCopy(existing) : {
      id: U.uid('glst'), spec: { speciesId: firstSpid, rarity: 1 }, price: 200, desc: '', createdAt: Date.now(),
    };
    /* migrate a legacy flat listing into a spec */
    if (!work.spec) work.spec = { speciesId: work.speciesId, name: work.name, rarity: work.rarity };
    delete work.speciesId; delete work.name; delete work.rarity;

    const { w, close } = modal('4% 8%');
    const closeAll = () => { stopPreviews(); close(); rerender(); };
    w.appendChild(U.el('h2', { cls: 'gold', text: isNew ? 'Create a Guild listing' : 'Edit listing' }));
    w.appendChild(U.el('p', { cls: 'small muted mb', text: 'One specific creature on the Guild’s stall. Design the creature down to the last detail, then set its price and a line of stall copy.' }));

    const cols = U.el('div', { cls: 'grid', style: 'grid-template-columns:320px 1fr;gap:18px;align-items:start' });
    w.appendChild(cols);

    /* ---------- LEFT: sprite preview ---------- */
    const left = U.el('div', {});
    cols.appendChild(left);
    left.appendChild(U.el('h3', { cls: 'gold mb', text: 'The creature' }));
    left.appendChild(livePreview(() => SP.get(work.spec.speciesId) || SP.list[0]));

    /* ---------- RIGHT: design + price ---------- */
    const right = U.el('div', {});
    cols.appendChild(right);

    const summaryLine = U.el('div', { cls: 'small muted mb', text: specSummary(work.spec) });
    right.appendChild(U.el('label', { cls: 'lbl', text: 'The designed creature' }));
    right.appendChild(summaryLine);
    right.appendChild(U.el('button', {
      cls: 'btn mb', text: '✎ Design the creature (every detail)', onclick: () => {
        editHuntEnemy(work.spec, () => { summaryLine.textContent = specSummary(work.spec); }, { hideBoss: true, title: 'Listing creature — design every detail', intro: 'Design the exact creature this listing sells. Species, name, rarity, size, precise stats, behaviour tree, every variable and trait pick — anything you set is minted true; anything left blank rolls once when the listing is created.' });
      },
    }));

    const priceIn = numIn(work.price, { step: 1, min: 0 });
    lblIn(right, 'Price (gold)', priceIn);

    const descTa = U.el('textarea', { cls: 'txt', rows: 3, style: 'width:100%', placeholder: 'A line of stall copy shown under the card.' });
    descTa.value = work.desc || '';
    lblIn(right, 'Description', descTa);

    /* ---------- ACTIONS ---------- */
    const acts = U.el('div', { cls: 'flex mt', style: 'flex-wrap:wrap' });
    acts.appendChild(U.el('button', {
      cls: 'btn primary', text: isNew ? 'Create listing' : 'Save listing', onclick: () => {
        if (!SP.get(work.spec.speciesId)) { alert('Pick a valid species (Design the creature).'); return; }
        work.price = Math.max(0, parseInt(priceIn.value, 10) || 0);
        work.desc = descTa.value.trim();
        M.setGuildListing(work);
        closeAll();
      },
    }));
    acts.appendChild(U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: closeAll }));
    if (!isNew) acts.appendChild(U.el('button', { cls: 'btn danger', text: 'Delete listing', onclick: () => { if (confirm('Delete this listing permanently?')) { M.deleteGuildListing(work.id); closeAll(); } } }));
    w.appendChild(acts);
  }

  /* ================= CRAFTING STATION =================
     Design a token from scratch with the universal designer, then decide
     where it goes: the Reserve (grant it to a player or a tournament winner
     later) or straight onto the Guild stall as a one-of-a-kind listing. */
  function craftToken() {
    const firstSpid = (SP.list[0] && SP.list[0].id) || '';
    const work = { spec: { speciesId: firstSpid, rarity: 1 } };
    const { w, close } = modal('4% 10%');
    const closeAll = () => { stopPreviews(); close(); rerender(); };
    w.appendChild(U.el('h2', { cls: 'gold', text: 'Craft a token' }));
    w.appendChild(U.el('p', { cls: 'small muted mb', text: 'Design the exact token — species, name, rarity, size, exact stats, abilities, everything — then decide where it goes.' }));

    const cols = U.el('div', { cls: 'grid', style: 'grid-template-columns:320px 1fr;gap:18px;align-items:start' });
    w.appendChild(cols);
    const left = U.el('div', {}), right = U.el('div', {});
    cols.appendChild(left); cols.appendChild(right);

    left.appendChild(U.el('h3', { cls: 'gold mb', text: 'The token' }));
    left.appendChild(livePreview(() => SP.get(work.spec.speciesId) || SP.list[0]));

    right.appendChild(U.el('label', { cls: 'lbl', text: 'The designed token' }));
    const summaryLine = U.el('div', { cls: 'small muted mb', text: specSummary(work.spec) });
    right.appendChild(summaryLine);
    right.appendChild(U.el('button', {
      cls: 'btn mb', text: '✎ Design the token (every detail)', onclick: () => {
        editHuntEnemy(work.spec, () => { summaryLine.textContent = specSummary(work.spec); }, { hideBoss: true, title: 'Craft a token — design every detail', intro: 'Species, name, rarity, size, precise stats, abilities, behavior tree — anything you set here is minted true; anything left blank rolls once it’s placed.' });
      },
    }));

    const acts = U.el('div', { cls: 'flex mt', style: 'flex-wrap:wrap;gap:8px' });
    acts.appendChild(U.el('button', {
      cls: 'btn primary', text: '📦 Place in Reserve', onclick: () => {
        if (!SP.get(work.spec.speciesId)) { alert('Pick a valid species (Design the token).'); return; }
        M.setReserveEntry({ id: U.uid('rsv'), spec: work.spec, createdAt: Date.now() });
        closeAll();
      },
    }));
    acts.appendChild(U.el('button', {
      cls: 'btn', text: '🏪 Push to Guild stall…', onclick: () => {
        if (!SP.get(work.spec.speciesId)) { alert('Pick a valid species (Design the token).'); return; }
        const raw = prompt('List this token on the Guild stall for how much gold?', '150');
        if (raw == null) return;
        const price = parseInt(raw, 10);
        if (!price || price <= 0) { alert('Enter a price greater than 0.'); return; }
        M.setGuildListing({ id: U.uid('glst'), spec: work.spec, price, desc: '', createdAt: Date.now() });
        closeAll();
      },
    }));
    acts.appendChild(U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: closeAll }));
    w.appendChild(acts);
  }

  /* A lightweight picker for choosing one Reserve entry (used by the
     tournament reward editor's "From Reserve" button). */
  function pickReserveEntry(entries, onPick) {
    const { w, close } = modal('20% 20%');
    w.appendChild(U.el('h3', { cls: 'gold mb', text: 'Choose a Reserve token' }));
    entries.forEach(entry => {
      const sp = SP.get(entry.spec.speciesId);
      const row = U.el('div', { cls: 'flex', style: 'gap:8px;align-items:center;cursor:pointer;padding:6px;border-bottom:1px solid var(--line)' });
      if (sp) row.appendChild(spriteThumb(sp, 30));
      row.appendChild(U.el('div', { cls: 'small', style: 'flex:1', text: specSummary(entry.spec) }));
      row.onclick = () => { onPick(entry); close(); };
      w.appendChild(row);
    });
    w.appendChild(U.el('button', { cls: 'btn ghost mt', text: 'Cancel', onclick: close }));
  }

  /* ================= LEVEL CHEST POOL EDITOR =================
     A milestone level's chest token options: a hand-picked list of
     {speciesId, rarity}. The chest rolls only among these instead of any
     random craftable species. Leaving rarity unset rolls it as before. */
  function editLevelChestPool(level, initial, onSave) {
    const { w, close } = modal('20% 20%');
    w.appendChild(U.el('h2', { cls: 'gold', text: 'Level ' + level + ' chest — token pool' }));
    w.appendChild(U.el('p', { cls: 'small muted mb', text: 'When this level\'s chest grants its bonus token, it will draw only from this list. Leave the list empty to fall back to rolling any craftable species.' }));
    const pool = U.deepCopy(initial || []);
    const holder = U.el('div', {});
    w.appendChild(holder);
    function paint() {
      holder.innerHTML = '';
      pool.forEach((p, i) => {
        const r = U.el('div', { cls: 'flex', style: 'gap:6px;margin-bottom:4px' });
        const spSel = selectEl(SP.list.map(s => [s.id, s.name]), p.speciesId || (SP.list[0] && SP.list[0].id));
        spSel.style.flex = '2'; spSel.onchange = () => p.speciesId = spSel.value;
        const rSel = selectEl([['', 'rarity: roll']].concat(SP.RARITIES.map((rn, i2) => [String(i2), rn])), p.rarity != null ? String(p.rarity) : '');
        rSel.onchange = () => { if (rSel.value === '') delete p.rarity; else p.rarity = parseInt(rSel.value, 10); };
        r.appendChild(spSel); r.appendChild(rSel);
        r.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { pool.splice(i, 1); paint(); } }));
        holder.appendChild(r);
      });
    }
    paint();
    w.appendChild(U.el('button', { cls: 'btn small ghost mt', text: '＋ Add an option', onclick: () => { pool.push({ speciesId: SP.list[0] && SP.list[0].id }); paint(); } }));
    w.appendChild(U.el('div', { cls: 'flex mt' }, [
      U.el('button', {
        cls: 'btn primary', text: 'Save pool', onclick: () => {
          M.setLevelChestPool(level, pool.filter(p => p.speciesId && SP.get(p.speciesId)));
          close(); onSave();
        },
      }),
      U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => close() }),
    ]));
  }

  /* ================= HUNT CREATURE EDITOR =================
     Authors ONE hunt enemy down to the last detail. Any field left blank rolls
     at spawn; anything set is used exactly by the match engine. Uses the same
     ability catalog dropdowns as the species editor, but with single values
     (this is one specific creature, not a template). */
  /* The universal token designer. Authors ONE creature down to the last
     detail — used for Hunt enemies AND anywhere a token is designed/granted
     (Guild listings, the Guild stall pool, tournament rewards). opts:
       hideBoss — hide the "boss" toggle (only Hunt enemies are bosses)
       title / intro — override the modal heading + blurb */
  function editHuntEnemy(en, onDone, opts) {
    opts = opts || {};
    en.stats = en.stats || {};
    en.vars = en.vars || {};
    en.picks = en.picks || {};
    let curSp = en.speciesId || (SP.list[0] && SP.list[0].id);
    en.speciesId = curSp;
    const { w, close } = modal('3% 8%');
    const closeAll = () => { stopPreviews(); close(); if (onDone) onDone(); };
    const cat = abilityCatalog();
    w.appendChild(U.el('h2', { cls: 'gold', text: opts.title || ('Hunt creature — ' + (SP.get(curSp) ? SP.get(curSp).name : curSp)) }));
    w.appendChild(U.el('p', { cls: 'small muted mb', text: opts.intro || 'Author this ONE creature completely. Blank fields roll at spawn; anything you set is used exactly. Heads, every variable and trait pick, even the decision tree — all yours.' }));

    const cols = U.el('div', { cls: 'grid', style: 'grid-template-columns:280px 1fr;gap:18px;align-items:start' });
    w.appendChild(cols);
    const left = U.el('div', {}), right = U.el('div', {});
    cols.appendChild(left); cols.appendChild(right);

    /* ---- LEFT: preview of the chosen species ---- */
    left.appendChild(U.el('h3', { cls: 'gold mb', text: 'Preview' }));
    left.appendChild(livePreview(() => SP.get(curSp) || SP.list[0]));
    const spSel = selectEl(SP.list.map(s => [s.id, s.name]), curSp);
    spSel.onchange = () => { curSp = spSel.value; en.speciesId = curSp; };
    lblIn(left, 'Species', spSel);

    /* ---- RIGHT: identity ---- */
    right.appendChild(U.el('h3', { cls: 'gold mb', text: 'Identity' }));
    const g1 = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px' });
    right.appendChild(g1);
    function hcell(parent, label, el) { const c = U.el('div', {}); c.appendChild(U.el('label', { cls: 'lbl', text: label })); c.appendChild(el); parent.appendChild(c); return el; }
    const nameI = hcell(g1, 'Name (blank = auto)', U.el('input', { cls: 'txt', value: en.name || '', placeholder: 'auto' }));
    nameI.oninput = () => { if (nameI.value.trim()) en.name = nameI.value.trim(); else delete en.name; };
    if (!opts.hideBoss) {
      const bossWrap = U.el('div', { cls: 'toggle' + (en.boss ? ' on' : ''), style: 'margin-top:4px' });
      bossWrap.onclick = () => { if (en.boss) delete en.boss; else en.boss = true; bossWrap.classList.toggle('on'); };
      hcell(g1, 'Boss (the quarry itself)', bossWrap);
    }
    const rSel = hcell(g1, 'Rarity', selectEl([['', 'roll']].concat(SP.RARITIES.map((r, i) => [String(i), r])), en.rarity != null ? String(en.rarity) : ''));
    rSel.onchange = () => { if (rSel.value === '') delete en.rarity; else en.rarity = parseInt(rSel.value, 10); };
    const sizeSel = hcell(g1, 'Size', selectEl([['', 'roll']].concat(SP.SIZES.map((s, i) => [String(i), s])), en.sizeIdx != null ? String(en.sizeIdx) : ''));
    sizeSel.onchange = () => { if (sizeSel.value === '') delete en.sizeIdx; else en.sizeIdx = parseInt(sizeSel.value, 10); };
    const elSel = hcell(g1, 'Element', selectEl([['', 'default']].concat(SP.ELEMENTS.map(e => [e, e])), en.element || ''));
    elSel.onchange = () => { if (elSel.value === '') delete en.element; else en.element = elSel.value; };
    const behSel = hcell(g1, 'Behavior tree', selectEl([['', '(species default)']].concat(Object.keys(DYA.behaviors || {}).sort().map(b => [b, b])), en.behavior || ''));
    behSel.onchange = () => { if (behSel.value === '') delete en.behavior; else en.behavior = behSel.value; };

    /* ---- Heads (Naga) ---- */
    const headsC = hcell(g1, '🐍 Heads (blank = roll)', numIn(en.picks.headCount != null ? en.picks.headCount : '', { step: 1, min: 1, placeholder: 'roll' }));
    headsC.oninput = () => { const v = parseInt(headsC.value, 10); if (isNaN(v)) delete en.picks.headCount; else en.picks.headCount = Math.max(1, v); };

    /* ---- exact stats ---- */
    right.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Exact stats (blank = roll)' }));
    const g2 = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px' });
    right.appendChild(g2);
    function statIn(label, val, onset, step) {
      const inp = hcell(g2, label, numIn(val != null ? val : '', { step: step || 1, placeholder: 'roll' }));
      inp.oninput = () => { const v = inp.value.trim(); onset(v === '' ? null : parseFloat(v)); };
    }
    statIn('HP', en.stats.hp, v => { if (v == null) delete en.stats.hp; else en.stats.hp = Math.max(1, v); });
    statIn('Damage', en.stats.dmg, v => { if (v == null) delete en.stats.dmg; else en.stats.dmg = Math.max(0, v); }, 0.1);
    statIn('Speed', en.stats.speed, v => { if (v == null) delete en.stats.speed; else en.stats.speed = Math.max(0, v); });
    statIn('Behavior value (5–3000)', en.behaviorValue, v => { if (v == null) delete en.behaviorValue; else en.behaviorValue = U.clamp(Math.round(v), 5, 3000); });

    /* ---- variables (single values) ---- */
    right.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Abilities — variables (exact value for this creature)' }));
    const varsBox = U.el('div', {});
    right.appendChild(varsBox);
    function paintHVars() {
      varsBox.innerHTML = '';
      Object.keys(en.vars).forEach(k => {
        const wrap = U.el('div', { style: 'margin-bottom:6px' });
        const r = U.el('div', { cls: 'flex', style: 'gap:6px' });
        const kIn = U.el('input', { cls: 'txt', value: k, style: 'flex:2' });
        const vIn = numIn(en.vars[k], { step: 'any', style: 'flex:1' });
        const commit = () => { const nk = kIn.value.trim(); if (nk !== k) delete en.vars[k]; if (nk) en.vars[nk] = parseFloat(vIn.value) || 0; };
        kIn.onchange = commit; vIn.onchange = commit;
        r.appendChild(kIn); r.appendChild(vIn);
        r.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { delete en.vars[k]; paintHVars(); } }));
        wrap.appendChild(r);
        if (cat.vars[k] && cat.vars[k].desc) wrap.appendChild(U.el('div', { cls: 'small muted', style: 'margin:2px 0 0 2px', text: cat.vars[k].desc }));
        varsBox.appendChild(wrap);
      });
      const addRow = U.el('div', { cls: 'flex mt', style: 'gap:6px;flex-wrap:wrap' });
      const sel = U.el('select', { cls: 'txt', style: 'flex:1;min-width:180px' });
      sel.appendChild(U.el('option', { value: '', text: '＋ Add a variable…' }));
      Object.keys(cat.vars).sort((a, b) => cat.vars[a].label.localeCompare(cat.vars[b].label)).forEach(k => {
        if (k in en.vars) return;
        sel.appendChild(U.el('option', { value: k, text: cat.vars[k].label + (cat.vars[k].desc ? ' — ' + cat.vars[k].desc.slice(0, 60) : '') }));
      });
      sel.onchange = () => { const k = sel.value; if (!k) return; const info = cat.vars[k] || { lo: 0, hi: 1 }; en.vars[k] = Math.round(((info.lo + info.hi) / 2) * 100) / 100; paintHVars(); };
      addRow.appendChild(sel);
      addRow.appendChild(U.el('button', { cls: 'btn small ghost', text: 'custom', onclick: () => { en.vars['newVar' + Object.keys(en.vars).length] = 1; paintHVars(); } }));
      varsBox.appendChild(addRow);
    }
    paintHVars();

    /* ---- trait picks (single chosen value) ---- */
    right.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Abilities — trait picks (the chosen option for this creature)' }));
    const picksBox = U.el('div', {});
    right.appendChild(picksBox);
    function paintHPicks() {
      picksBox.innerHTML = '';
      Object.keys(en.picks).forEach(k => {
        if (k === 'headCount') return; /* headCount has its own Heads control above */
        const wrap = U.el('div', { style: 'margin-bottom:6px' });
        const r = U.el('div', { cls: 'flex', style: 'gap:6px' });
        const kIn = U.el('input', { cls: 'txt', value: k, style: 'flex:1' });
        const opts = (cat.picks[k] && cat.picks[k].options) || [];
        let vIn;
        if (opts.length) {
          vIn = selectEl(opts.map(o => [String(o), String(o)]), String(en.picks[k]));
          vIn.style.flex = '2';
          vIn.onchange = () => { const raw = vIn.value; en.picks[k] = (raw !== '' && !isNaN(Number(raw))) ? Number(raw) : raw; };
        } else {
          vIn = U.el('input', { cls: 'txt', value: String(en.picks[k]), style: 'flex:2' });
          vIn.onchange = () => { const raw = vIn.value.trim(); en.picks[k] = (raw !== '' && !isNaN(Number(raw))) ? Number(raw) : raw; };
        }
        const commitK = () => { const nk = kIn.value.trim(); if (nk !== k) { const val = en.picks[k]; delete en.picks[k]; if (nk) en.picks[nk] = val; paintHPicks(); } };
        kIn.onchange = commitK;
        r.appendChild(kIn); r.appendChild(vIn);
        r.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { delete en.picks[k]; paintHPicks(); } }));
        wrap.appendChild(r);
        if (cat.picks[k] && cat.picks[k].desc) wrap.appendChild(U.el('div', { cls: 'small muted', style: 'margin:2px 0 0 2px', text: cat.picks[k].desc }));
        picksBox.appendChild(wrap);
      });
      const addRow = U.el('div', { cls: 'flex mt', style: 'gap:6px;flex-wrap:wrap' });
      const sel = U.el('select', { cls: 'txt', style: 'flex:1;min-width:180px' });
      sel.appendChild(U.el('option', { value: '', text: '＋ Add a trait pick…' }));
      Object.keys(cat.picks).sort((a, b) => cat.picks[a].label.localeCompare(cat.picks[b].label)).forEach(k => {
        if (k === 'headCount' || k in en.picks) return;
        sel.appendChild(U.el('option', { value: k, text: cat.picks[k].label + (cat.picks[k].desc ? ' — ' + cat.picks[k].desc.slice(0, 60) : '') }));
      });
      sel.onchange = () => { const k = sel.value; if (!k) return; const opts = (cat.picks[k] && cat.picks[k].options) || []; en.picks[k] = opts.length ? ((opts[0] !== '' && !isNaN(Number(opts[0]))) ? Number(opts[0]) : opts[0]) : 'option'; paintHPicks(); };
      addRow.appendChild(sel);
      addRow.appendChild(U.el('button', { cls: 'btn small ghost', text: 'custom', onclick: () => { en.picks['newPick' + Object.keys(en.picks).length] = 'option'; paintHPicks(); } }));
      picksBox.appendChild(addRow);
    }
    paintHPicks();

    /* ---- actions ---- */
    const acts = U.el('div', { cls: 'flex mt', style: 'gap:8px;flex-wrap:wrap' });
    acts.appendChild(U.el('button', { cls: 'btn primary', text: 'Done', onclick: closeAll }));
    acts.appendChild(U.el('button', {
      cls: 'btn ghost', text: '↺ Clear all overrides', onclick: () => {
        if (!confirm('Reset this creature to a plain roll of its species (keeps species, rarity, boss)?')) return;
        const keep = { speciesId: en.speciesId };
        if (en.rarity != null) keep.rarity = en.rarity;
        if (en.boss) keep.boss = true;
        Object.keys(en).forEach(k => delete en[k]);
        Object.assign(en, keep);
        closeAll();
      },
    }));
    w.appendChild(acts);
  }

  /* ================= SPECIES EDITOR ================= */
  const RIGS = ['quad', 'punk', 'composed', 'biped', 'flame', 'swarm', 'tree', 'stryx', 'kipsu', 'mikolo', 'blob', 'field', 'relic', 'crab', 'mcfly', 'gynge', 'hvaleia', 'bird'];

  /* Ability catalog for the dropdown menus: merges the curated descriptions in
     data/abilities.js with the real ranges/options learned from every existing
     species, so the designer picks abilities from a list instead of guessing
     internal key names. Cached for the session. */
  let _abilityCatalog = null;
  function abilityCatalog() {
    if (_abilityCatalog) return _abilityCatalog;
    const AB = DYA.abilities || { VARS: {}, PICKS: {}, TAGS: [], FEATURES: [], humanize: x => x };
    const humanize = AB.humanize || (x => x);
    const vars = {}, picks = {}, tags = {};
    Object.keys(AB.VARS || {}).forEach(k => vars[k] = { desc: AB.VARS[k].desc || '', lo: null, hi: null });
    Object.keys(AB.PICKS || {}).forEach(k => picks[k] = { desc: AB.PICKS[k].desc || '', options: new Set((AB.PICKS[k].options || []).map(String)) });
    (AB.TAGS || []).forEach(t => tags[t.id] = t.desc || '');
    SP.list.forEach(sp => {
      Object.entries(sp.vars || {}).forEach(([k, r]) => {
        const v = vars[k] = vars[k] || { desc: '', lo: null, hi: null };
        if (Array.isArray(r)) { v.lo = v.lo == null ? r[0] : Math.min(v.lo, r[0]); v.hi = v.hi == null ? r[1] : Math.max(v.hi, r[1]); }
      });
      Object.entries(sp.picks || {}).forEach(([k, opts]) => {
        const p = picks[k] = picks[k] || { desc: '', options: new Set() };
        (opts || []).forEach(o => p.options.add(String(o)));
      });
      (sp.tags || []).forEach(t => { if (!(t in tags)) tags[t] = ''; });
    });
    Object.keys(vars).forEach(k => { vars[k].label = humanize(k); if (vars[k].lo == null) { vars[k].lo = 0; vars[k].hi = 1; } });
    Object.keys(picks).forEach(k => { picks[k].label = humanize(k); picks[k].options = Array.from(picks[k].options); });
    _abilityCatalog = { vars, picks, tags, features: (AB.FEATURES || []), humanize };
    return _abilityCatalog;
  }

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
    rig.onchange = () => { work.rig = rig.value; paintRigPanel(); };
    lblIn(left, 'Rig (placeholder body type)', rig);

    /* ---- rig-specific controls: the same complete sprite control the
       standalone designer/composer tools give (punk vines, composed parts).
       Everything writes straight onto work, and the live preview above
       re-reads work each frame, so edits show instantly. ---- */
    const rigPanel = U.el('div', { style: 'margin:6px 0' });
    left.appendChild(rigPanel);
    function rigSlider(parent, label, obj, key, min, max, step, dflt) {
      const val = obj[key] != null ? obj[key] : (dflt != null ? dflt : min);
      const row = U.el('div', { cls: 'flex', style: 'align-items:center;gap:8px;margin:3px 0' });
      row.appendChild(U.el('label', { cls: 'lbl', style: 'margin:0;flex:0 0 96px;font-size:11px', text: label }));
      const rng = U.el('input', { type: 'range', min: min, max: max, step: step, value: val, style: 'flex:1' });
      const out = U.el('span', { cls: 'small gold', style: 'flex:0 0 42px;text-align:right', text: step < 1 ? Number(val).toFixed(2) : String(val) });
      rng.oninput = () => { obj[key] = parseFloat(rng.value); out.textContent = step < 1 ? obj[key].toFixed(2) : String(obj[key]); };
      row.appendChild(rng); row.appendChild(out); parent.appendChild(row);
    }
    function rigSelect(parent, label, obj, key, options, after) {
      const sel = U.el('select', { cls: 'txt' });
      options.forEach(opt => sel.appendChild(U.el('option', { value: opt === null ? '__none__' : opt, text: opt === null ? '— none —' : opt })));
      sel.value = obj[key] == null ? '__none__' : obj[key];
      sel.onchange = () => { if (sel.value === '__none__') delete obj[key]; else obj[key] = sel.value; if (after) after(); };
      lblIn(parent, label, sel);
    }
    function paintRigPanel() {
      rigPanel.innerHTML = '';
      if (work.rig === 'punk') {
        work.punk = Object.assign({ legs: 4, arms: 3, ribs: 6, bodyW: 1.0, bodyH: 0.86, legReach: 1.05, armReach: 1.1, legWidth: 0.12, armWidth: 0.1 }, work.punk || {});
        rigPanel.appendChild(U.el('label', { cls: 'lbl', text: 'Punk — vines & pumpkin body' }));
        rigSlider(rigPanel, 'Vine legs', work.punk, 'legs', 1, 8, 1);
        rigSlider(rigPanel, 'Grasp vines', work.punk, 'arms', 0, 6, 1);
        rigSlider(rigPanel, 'Ribs', work.punk, 'ribs', 2, 12, 1);
        rigSlider(rigPanel, 'Body width', work.punk, 'bodyW', 0.5, 1.6, 0.01);
        rigSlider(rigPanel, 'Body height', work.punk, 'bodyH', 0.4, 1.4, 0.01);
        rigSlider(rigPanel, 'Leg reach', work.punk, 'legReach', 0.5, 2, 0.01);
        rigSlider(rigPanel, 'Arm reach', work.punk, 'armReach', 0.4, 2.2, 0.01);
        rigSlider(rigPanel, 'Leg thickness', work.punk, 'legWidth', 0.04, 0.3, 0.005);
        rigSlider(rigPanel, 'Arm thickness', work.punk, 'armWidth', 0.03, 0.25, 0.005);
      } else if (work.rig === 'composed') {
        const CAT = (window.DYA && DYA.parts && DYA.parts.CATALOG) || {};
        const PAR = (window.DYA && DYA.parts && DYA.parts.PARAMS) || [];
        work.parts = Object.assign({ body: 'oval', eyes: 'round', mouth: 'none' }, work.parts || {});
        rigPanel.appendChild(U.el('label', { cls: 'lbl', text: 'Composed — mix body shape & parts' }));
        Object.keys(CAT).forEach(cat => rigSelect(rigPanel, cat, work.parts, cat, CAT[cat], paintRigPanel));
        PAR.forEach(p => { if (!p.when || p.when(work.parts)) rigSlider(rigPanel, p.label, work.parts, p.key, p.min, p.max, p.step, p.def); });
      }
    }
    paintRigPanel();

    const c1 = U.el('input', { cls: 'txt', type: 'color', value: /^#[0-9a-f]{6}$/i.test(work.color || '') ? work.color : '#888888' });
    c1.oninput = () => work.color = c1.value;
    lblIn(left, 'Primary color', c1);
    const c2 = U.el('input', { cls: 'txt', type: 'color', value: /^#[0-9a-f]{6}$/i.test(work.color2 || '') ? work.color2 : '#555555' });
    c2.oninput = () => work.color2 = c2.value;
    lblIn(left, 'Secondary color', c2);

    /* ---- features: friendly toggles + a Heads control, no JSON needed ---- */
    left.appendChild(U.el('label', { cls: 'lbl', text: 'Features — body parts & flags (hover for what each does)' }));
    work.features = work.features || {};
    const featBox = U.el('div', { style: 'max-height:230px;overflow:auto;border:1px solid var(--line);border-radius:6px;padding:8px' });
    left.appendChild(featBox);
    function paintFeatures() {
      featBox.innerHTML = '';
      const cat = abilityCatalog();
      /* Heads first, front and centre (the Naga control) */
      const headsRow = U.el('div', { cls: 'mb', style: 'border-bottom:1px solid var(--line);padding-bottom:6px' });
      headsRow.appendChild(U.el('label', { cls: 'lbl', style: 'margin:0', text: '🐍 Heads (min–max per individual; same value = fixed)' }));
      const hasHeads = Array.isArray(work.features.heads);
      const hrow = U.el('div', { cls: 'flex', style: 'gap:6px;align-items:center' });
      const hLo = numIn(hasHeads ? work.features.heads[0] : '', { step: 1, min: 1, style: 'max-width:70px', placeholder: '—' });
      const hHi = numIn(hasHeads ? (work.features.heads[1] != null ? work.features.heads[1] : work.features.heads[0]) : '', { step: 1, min: 1, style: 'max-width:70px', placeholder: '—' });
      const syncHeads = () => {
        const lo = parseInt(hLo.value, 10), hi = parseInt(hHi.value, 10);
        if (isNaN(lo) && isNaN(hi)) { delete work.features.heads; delete work.picks.headCount; return; }
        const a = isNaN(lo) ? hi : lo, b = isNaN(hi) ? lo : hi;
        const mn = Math.max(1, Math.min(a, b)), mx = Math.max(1, Math.max(a, b));
        work.features.heads = [mn, mx];
        /* per-token head count rolls uniformly across the band */
        work.picks = work.picks || {};
        const list = []; for (let n = mn; n <= mx; n++) list.push(n);
        work.picks.headCount = list;
      };
      hLo.oninput = syncHeads; hHi.oninput = syncHeads;
      hrow.appendChild(hLo); hrow.appendChild(U.el('span', { text: '–' })); hrow.appendChild(hHi);
      headsRow.appendChild(hrow);
      featBox.appendChild(headsRow);
      /* the rest as toggles */
      cat.features.filter(f => f.id !== 'heads').forEach(f => {
        const on = !!work.features[f.id];
        const row = U.el('label', { cls: 'flex small', style: 'align-items:flex-start;gap:6px;margin-bottom:4px;cursor:pointer', title: f.desc });
        const chk = U.el('input', { type: 'checkbox' }); chk.checked = on;
        chk.onchange = () => { if (chk.checked) work.features[f.id] = true; else delete work.features[f.id]; };
        row.appendChild(chk);
        row.appendChild(U.el('span', {}, [U.el('b', { text: f.id }), U.el('span', { cls: 'muted', text: ' — ' + f.desc })]));
        featBox.appendChild(row);
      });
      /* any custom feature keys already on this species that aren't in the catalog */
      const known = new Set(cat.features.map(f => f.id));
      Object.keys(work.features).forEach(k => {
        if (known.has(k) || k === 'heads') return;
        const row = U.el('div', { cls: 'flex small', style: 'align-items:center;gap:6px;margin-bottom:3px' });
        row.appendChild(U.el('span', { cls: 'gold flex1', text: k + ' (custom): ' + JSON.stringify(work.features[k]) }));
        row.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { delete work.features[k]; paintFeatures(); } }));
        featBox.appendChild(row);
      });
    }
    paintFeatures();
    /* advanced JSON fallback for anything exotic */
    const advDet = U.el('details', { style: 'margin-top:6px' });
    advDet.appendChild(U.el('summary', { cls: 'small muted', style: 'cursor:pointer', text: 'Advanced: edit features as JSON' }));
    const feats = U.el('textarea', { cls: 'txt mt', rows: 4, style: 'font-family:monospace;font-size:11px' });
    feats.value = JSON.stringify(work.features || {}, null, 1);
    const featErr = U.el('div', { cls: 'small', style: 'color:var(--red);min-height:14px' });
    feats.oninput = () => {
      try { work.features = JSON.parse(feats.value); featErr.textContent = ''; paintFeatures(); }
      catch (e) { featErr.textContent = 'Invalid JSON — preview keeps the last valid features.'; }
    };
    advDet.appendChild(feats);
    advDet.appendChild(featErr);
    left.appendChild(advDet);

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
    /* per-species base ready-cost range — overrides the rarity cost table so
       cost is not driven by rarity alone (each mint rolls between lo and hi) */
    const hasCR = Array.isArray(work.costRange);
    const crLo = cell(g1, 'Base cost min (blank = from power)', numIn(hasCR ? work.costRange[0] : '', { step: 1, min: 0, placeholder: 'power' }));
    const crHi = cell(g1, 'Base cost max', numIn(hasCR ? work.costRange[1] : '', { step: 1, min: 0, placeholder: 'rarity' }));
    const syncCR = () => {
      const lo = crLo.value.trim(), hi = crHi.value.trim();
      if (lo === '' && hi === '') { delete work.costRange; return; }
      const a = parseInt(lo, 10); const b = parseInt(hi, 10);
      work.costRange = [isNaN(a) ? (isNaN(b) ? 0 : b) : a, isNaN(b) ? (isNaN(a) ? 0 : a) : b];
    };
    crLo.oninput = syncCR; crHi.oninput = syncCR;

    /* ---- tags: toggle chips from the catalog (hover for meaning) + custom ---- */
    right.appendChild(U.el('label', { cls: 'lbl', text: 'Tags — click to toggle (some change how it fights; hover for meaning)' }));
    work.tags = work.tags || [];
    const tagsBox = U.el('div', { cls: 'flex', style: 'flex-wrap:wrap;gap:6px' });
    right.appendChild(tagsBox);
    function paintTags() {
      tagsBox.innerHTML = '';
      const cat = abilityCatalog();
      Object.keys(cat.tags).sort().forEach(id => {
        const on = work.tags.includes(id);
        const chip = U.el('button', { cls: 'btn small' + (on ? ' primary' : ' ghost'), title: cat.tags[id] || id, text: id });
        chip.onclick = () => { if (on) work.tags = work.tags.filter(t => t !== id); else work.tags.push(id); paintTags(); };
        tagsBox.appendChild(chip);
      });
      const known = new Set(Object.keys(cat.tags));
      work.tags.filter(t => !known.has(t)).forEach(t => {
        const chip = U.el('button', { cls: 'btn small primary', title: 'custom tag', text: t + ' ✕' });
        chip.onclick = () => { work.tags = work.tags.filter(x => x !== t); paintTags(); };
        tagsBox.appendChild(chip);
      });
      tagsBox.appendChild(U.el('button', {
        cls: 'btn small ghost', text: '＋ custom', onclick: () => {
          const t = prompt('Custom tag name:'); if (t && t.trim() && !work.tags.includes(t.trim())) { work.tags.push(t.trim()); paintTags(); }
        },
      }));
    }
    paintTags();

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

    /* per-individual variable ranges — with an "add known ability" dropdown */
    right.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Abilities — variables' }));
    right.appendChild(U.el('p', { cls: 'small muted', text: 'Numbers this creature carries; every minted token rolls between low and high. Add one from the menu (with a plain-English description) or type your own.' }));
    const varsBox = U.el('div', {});
    right.appendChild(varsBox);
    function paintVars() {
      varsBox.innerHTML = '';
      const cat = abilityCatalog();
      Object.entries(work.vars || {}).forEach(([k, range]) => {
        const wrap = U.el('div', { style: 'margin-bottom:6px' });
        const r = U.el('div', { cls: 'flex', style: 'gap:6px' });
        const kIn = U.el('input', { cls: 'txt', value: k, style: 'flex:2' });
        const lo = numIn(Array.isArray(range) ? range[0] : range, { step: 'any', style: 'flex:1' });
        const hi = numIn(Array.isArray(range) ? range[1] : range, { step: 'any', style: 'flex:1' });
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
        wrap.appendChild(r);
        if (cat.vars[k] && cat.vars[k].desc) wrap.appendChild(U.el('div', { cls: 'small muted', style: 'margin:2px 0 0 2px', text: cat.vars[k].desc }));
        varsBox.appendChild(wrap);
      });
      /* add-from-menu row */
      const addRow = U.el('div', { cls: 'flex mt', style: 'gap:6px;flex-wrap:wrap' });
      const sel = U.el('select', { cls: 'txt', style: 'flex:1;min-width:180px' });
      sel.appendChild(U.el('option', { value: '', text: '＋ Add an ability…' }));
      Object.keys(cat.vars).sort((a, b) => cat.vars[a].label.localeCompare(cat.vars[b].label)).forEach(k => {
        if (work.vars && k in work.vars) return; // already present
        sel.appendChild(U.el('option', { value: k, text: cat.vars[k].label + (cat.vars[k].desc ? ' — ' + cat.vars[k].desc.slice(0, 60) : '') }));
      });
      sel.onchange = () => {
        const k = sel.value; if (!k) return;
        work.vars = work.vars || {};
        const info = cat.vars[k] || { lo: 0, hi: 1 };
        work.vars[k] = [info.lo != null ? info.lo : 0, info.hi != null ? info.hi : 1];
        paintVars();
      };
      addRow.appendChild(sel);
      addRow.appendChild(U.el('button', {
        cls: 'btn small ghost', text: 'custom', onclick: () => {
          work.vars = work.vars || {};
          work.vars['newVar' + Object.keys(work.vars).length] = [0, 1];
          paintVars();
        },
      }));
      varsBox.appendChild(addRow);
    }
    paintVars();

    /* trait picks — with an "add known pick" dropdown that pre-fills options */
    right.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Abilities — trait picks' }));
    right.appendChild(U.el('p', { cls: 'small muted', text: 'Each token is randomly assigned ONE option from the list (repeat an option to make it more likely). Add one from the menu or type your own.' }));
    const picksBox = U.el('div', {});
    right.appendChild(picksBox);
    function parsePickList(s) {
      return s.split(',').map(x => x.trim()).filter(x => x !== '').map(x => (x !== '' && !isNaN(Number(x))) ? Number(x) : x);
    }
    function paintPicks() {
      picksBox.innerHTML = '';
      const cat = abilityCatalog();
      Object.entries(work.picks || {}).forEach(([k, opts]) => {
        const wrap = U.el('div', { style: 'margin-bottom:6px' });
        const r = U.el('div', { cls: 'flex', style: 'gap:6px' });
        const kIn = U.el('input', { cls: 'txt', value: k, style: 'flex:1' });
        const oIn = U.el('input', { cls: 'txt', value: (opts || []).join(', '), style: 'flex:3' });
        const upd = () => {
          const nk = kIn.value.trim();
          if (nk !== k) delete work.picks[k];
          if (nk) work.picks[nk] = parsePickList(oIn.value);
        };
        kIn.onchange = upd; oIn.onchange = upd;
        r.appendChild(kIn); r.appendChild(oIn);
        r.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { delete work.picks[k]; paintPicks(); } }));
        wrap.appendChild(r);
        if (cat.picks[k] && cat.picks[k].desc) wrap.appendChild(U.el('div', { cls: 'small muted', style: 'margin:2px 0 0 2px', text: cat.picks[k].desc + (cat.picks[k].options && cat.picks[k].options.length ? '  ·  options: ' + cat.picks[k].options.join(', ') : '') }));
        picksBox.appendChild(wrap);
      });
      const addRow = U.el('div', { cls: 'flex mt', style: 'gap:6px;flex-wrap:wrap' });
      const sel = U.el('select', { cls: 'txt', style: 'flex:1;min-width:180px' });
      sel.appendChild(U.el('option', { value: '', text: '＋ Add a trait pick…' }));
      Object.keys(cat.picks).sort((a, b) => cat.picks[a].label.localeCompare(cat.picks[b].label)).forEach(k => {
        if (work.picks && k in work.picks) return;
        sel.appendChild(U.el('option', { value: k, text: cat.picks[k].label + (cat.picks[k].desc ? ' — ' + cat.picks[k].desc.slice(0, 60) : '') }));
      });
      sel.onchange = () => {
        const k = sel.value; if (!k) return;
        work.picks = work.picks || {};
        const info = cat.picks[k] || { options: [] };
        work.picks[k] = (info.options && info.options.length) ? info.options.map(o => (o !== '' && !isNaN(Number(o))) ? Number(o) : o) : ['option A', 'option B'];
        paintPicks();
      };
      addRow.appendChild(sel);
      addRow.appendChild(U.el('button', {
        cls: 'btn small ghost', text: 'custom', onclick: () => {
          work.picks = work.picks || {};
          work.picks['newPick' + Object.keys(work.picks).length] = ['option A', 'option B'];
          paintPicks();
        },
      }));
      picksBox.appendChild(addRow);
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
        /* work.features is kept live by the feature toggles + the advanced JSON
           editor, so nothing to re-parse here. */
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

  /* ================= INDIVIDUAL TOKEN EDITOR =================
     Click any token anywhere in the panel and rewrite it end to end:
     identity, exact stats, behavior, per-element cost (its "price" to
     ready), the individual variables & trait picks that drive its
     abilities on the field, and its lore. Edits are written straight
     onto the live token in its owner's collection and pushed to the
     cloud so they stick for that real player. */
  function editToken(tok, owner, onDone) {
    const { w, close } = modal('3% 8%');
    /* when opened on top of another modal (an account editor), repaint that
       caller's list instead of the whole panel behind it */
    const closeAll = () => { stopPreviews(); close(); if (onDone) onDone(); else rerender(); };
    const sp0 = SP.get(tok.speciesId);
    w.appendChild(U.el('h2', { cls: 'gold', text: 'Token — ' + tok.name } ));
    w.appendChild(U.el('p', { cls: 'small muted mb', text: 'Owned by ' + (owner ? owner.displayName : '?') + (owner && owner.ai ? ' (Dya’kukull)' : '') + ' · ' + (sp0 ? sp0.name : tok.speciesId) + ' · id ' + tok.id + '. Every field below is this ONE individual — nothing here touches the species.' }));

    const cols = U.el('div', { cls: 'grid', style: 'grid-template-columns:300px 1fr;gap:18px;align-items:start' });
    w.appendChild(cols);
    const left = U.el('div', {}), right = U.el('div', {});
    cols.appendChild(left); cols.appendChild(right);

    /* ---- LEFT: live preview of whatever species it currently is ---- */
    left.appendChild(U.el('h3', { cls: 'gold mb', text: 'Preview' }));
    let curSpId = tok.speciesId;
    left.appendChild(livePreview(() => SP.get(curSpId) || sp0 || SP.list[0]));
    const valLine = U.el('p', { cls: 'small muted mt center' });
    left.appendChild(valLine);
    const refreshVal = () => { try { valLine.textContent = 'Market value ≈ ' + U.fmt(TK.baseValue(tok)) + 'g · ready-cost ' + TK.cost(tok); } catch (e) { valLine.textContent = ''; } };

    /* ---- RIGHT: identity & exact stats ---- */
    right.appendChild(U.el('h3', { cls: 'gold mb', text: 'Identity' }));
    const g1 = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px' });
    right.appendChild(g1);
    function cell(parent, label, el) {
      const c = U.el('div', {});
      c.appendChild(U.el('label', { cls: 'lbl', text: label }));
      c.appendChild(el); parent.appendChild(c); return el;
    }
    const nameIn = cell(g1, 'Name', U.el('input', { cls: 'txt', value: tok.name, maxlength: 40 }));
    const spSel = cell(g1, 'Species', selectEl(SP.list.map(s => [s.id, s.name]), tok.speciesId));
    spSel.onchange = () => { curSpId = spSel.value; };
    const rarSel = cell(g1, 'Rarity', selectEl(SP.RARITIES.map((r, i) => [String(i), r]), String(tok.rarity)));
    const sizeSel = cell(g1, 'Size', selectEl(SP.SIZES.map((s, i) => [String(i), s]), String(tok.sizeIdx)));
    const elSel = cell(g1, 'Element', selectEl(SP.ELEMENTS.map(e => [e, e + ' (' + SP.ELEMENT_NAMES[e] + ')']), tok.element || (sp0 ? sp0.element : 'Fti')));

    right.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Exact stats' }));
    const g2 = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px' });
    right.appendChild(g2);
    tok.stats = tok.stats || { hp: 10, dmg: 1, speed: 40 };
    const hpIn = cell(g2, 'HP', numIn(tok.stats.hp, { step: 1 }));
    const dmgIn = cell(g2, 'Damage', numIn(tok.stats.dmg, { step: 0.1 }));
    const spdIn = cell(g2, 'Speed', numIn(tok.stats.speed, { step: 1 }));
    const behIn = cell(g2, 'Behavior value (truth: calm 5 … 3000 volatile)', numIn(tok.behaviorValue != null ? tok.behaviorValue : 400, { step: 1 }));
    const ageIn = cell(g2, 'Age (0–1 → health)', numIn(tok.age != null ? tok.age : 0.5, { step: 0.01 }));
    const expIn = cell(g2, 'Combat exp (0–1 → skill)', numIn(tok.combatExp != null ? tok.combatExp : 0.5, { step: 0.01 }));

    /* ---- per-element cost (the token's "price" to ready in a match) ---- */
    right.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Price — resource cost to ready' }));
    right.appendChild(U.el('p', { cls: 'small muted', text: 'The exact per-element cost paid to bring this token onto the field. Set any combination, including zero.' }));
    const costVec = Object.assign({ Fti: 0, Su: 0, Eldi: 0, Ular: 0 }, TK.costVec(tok));
    const g3 = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(4,1fr);gap:8px' });
    right.appendChild(g3);
    const costIns = {};
    SP.ELEMENTS.forEach(e => { costIns[e] = cell(g3, e + ' (' + SP.ELEMENT_NAMES[e] + ')', numIn(costVec[e] || 0, { step: 1, min: 0 })); });

    /* ---- abilities: per-individual variables & trait picks ---- */
    right.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Abilities — individual variables' }));
    right.appendChild(U.el('p', { cls: 'small muted', text: 'The rolled numbers this individual carries (vine length, teleport range, breath cooldown…). These drive its behavior tree on the field.' }));
    const varsBox = U.el('div', {});
    right.appendChild(varsBox);
    tok.vars = tok.vars || {};
    function paintVars() {
      varsBox.innerHTML = '';
      Object.keys(tok.vars).forEach(k => {
        const r = U.el('div', { cls: 'flex', style: 'gap:6px;margin-bottom:4px' });
        const kIn = U.el('input', { cls: 'txt', value: k, style: 'flex:2' });
        const vIn = numIn(tok.vars[k], { step: 'any', style: 'flex:1' });
        const commit = () => {
          const nk = kIn.value.trim();
          if (nk !== k) delete tok.vars[k];
          if (nk) tok.vars[nk] = parseFloat(vIn.value) || 0;
        };
        kIn.onchange = commit; vIn.onchange = commit;
        r.appendChild(kIn); r.appendChild(vIn);
        r.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { delete tok.vars[k]; paintVars(); } }));
        varsBox.appendChild(r);
      });
      varsBox.appendChild(U.el('button', {
        cls: 'btn small ghost', text: '＋ Add variable', onclick: () => {
          tok.vars['newVar' + Object.keys(tok.vars).length] = 1; paintVars();
        },
      }));
    }
    paintVars();

    right.appendChild(U.el('label', { cls: 'lbl mt', text: 'Trait picks (one chosen option each — vine behavior, breath tier, target preference…)' }));
    const picksBox = U.el('div', {});
    right.appendChild(picksBox);
    tok.picks = tok.picks || {};
    function paintPicks() {
      picksBox.innerHTML = '';
      Object.keys(tok.picks).forEach(k => {
        const r = U.el('div', { cls: 'flex', style: 'gap:6px;margin-bottom:4px' });
        const kIn = U.el('input', { cls: 'txt', value: k, style: 'flex:1' });
        const vIn = U.el('input', { cls: 'txt', value: String(tok.picks[k]), style: 'flex:1' });
        const commit = () => {
          const nk = kIn.value.trim();
          if (nk !== k) delete tok.picks[k];
          if (nk) { const raw = vIn.value.trim(); tok.picks[nk] = (raw !== '' && !isNaN(Number(raw))) ? Number(raw) : raw; }
        };
        kIn.onchange = commit; vIn.onchange = commit;
        r.appendChild(kIn); r.appendChild(vIn);
        r.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { delete tok.picks[k]; paintPicks(); } }));
        picksBox.appendChild(r);
      });
      picksBox.appendChild(U.el('button', {
        cls: 'btn small ghost', text: '＋ Add pick', onclick: () => {
          tok.picks['newPick' + Object.keys(tok.picks).length] = 'option'; paintPicks();
        },
      }));
    }
    paintPicks();

    /* ---- flags & lore ---- */
    right.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Flags & lore' }));
    const statusSel = U.el('select', { cls: 'txt' });
    ['collection', 'market', 'pouch', 'field'].forEach(s => statusSel.appendChild(U.el('option', { value: s, text: s })));
    statusSel.value = tok.status || 'collection';
    lblIn(right, 'Status', statusSel);
    const flagRow = U.el('div', { cls: 'flex mt', style: 'gap:16px;flex-wrap:wrap' });
    function toggle(label, on, onToggle) {
      const t = U.el('div', { cls: 'toggle' + (on ? ' on' : '') });
      t.onclick = () => { t.classList.toggle('on'); onToggle(t.classList.contains('on')); };
      const box = U.el('div', {}, [U.el('label', { cls: 'lbl', text: label }), t]);
      flagRow.appendChild(box);
    }
    let nameLocked = !!tok.nameLocked, frozen = !!tok.frozen, famous = !!tok.famous;
    toggle('Name locked', nameLocked, v => nameLocked = v);
    toggle('Frozen (unplayable)', frozen, v => frozen = v);
    toggle('Famous', famous, v => famous = v);
    right.appendChild(flagRow);
    const matIn = U.el('input', { cls: 'txt', value: tok.material || '' });
    lblIn(right, 'Material', matIn);
    const storyTa = U.el('textarea', { cls: 'txt', rows: 3, style: 'width:100%' });
    storyTa.value = tok.story || '';
    lblIn(right, 'Story / description card text', storyTa);

    refreshVal();

    /* ---- actions ---- */
    const acts = U.el('div', { cls: 'flex mt', style: 'gap:8px;flex-wrap:wrap' });
    acts.appendChild(U.el('button', {
      cls: 'btn primary', text: '💾 Save token', onclick: () => {
        tok.name = nameIn.value.trim() || tok.name;
        tok.speciesId = spSel.value;
        tok.rarity = parseInt(rarSel.value, 10) || 0;
        tok.sizeIdx = parseInt(sizeSel.value, 10) || 0;
        tok.element = elSel.value;
        tok.stats = {
          hp: Math.max(1, Math.round(parseFloat(hpIn.value) || 1)),
          dmg: Math.max(0, Math.round((parseFloat(dmgIn.value) || 0) * 10) / 10),
          speed: Math.max(0, Math.round(parseFloat(spdIn.value) || 0)),
        };
        tok.behaviorValue = U.clamp(Math.round(parseFloat(behIn.value) || 0), 5, 3000);
        tok.age = U.clamp(parseFloat(ageIn.value) || 0, 0, 1);
        tok.combatExp = U.clamp(parseFloat(expIn.value) || 0, 0, 1);
        /* Ready cost is stat-power based and live by default. Only pin (lock)
           it if the admin actually changed a value away from the derived
           price; otherwise leave it live so it keeps tracking the token's
           power. */
        const entered = {
          Fti: Math.max(0, parseInt(costIns.Fti.value, 10) || 0),
          Su: Math.max(0, parseInt(costIns.Su.value, 10) || 0),
          Eldi: Math.max(0, parseInt(costIns.Eldi.value, 10) || 0),
          Ular: Math.max(0, parseInt(costIns.Ular.value, 10) || 0),
        };
        const derived = TK.deriveCostVec(SP.get(tok.speciesId), tok.rarity, new U.Rng(U.hashStr((tok.id || tok.speciesId) + '::cost')), tok.stats);
        if (SP.ELEMENTS.every(e => (entered[e] || 0) === (derived[e] || 0))) {
          delete tok.cost; delete tok.costLocked;   // keep it live (power-based)
        } else {
          tok.cost = entered; tok.costLocked = true; // admin pinned a custom price
        }
        tok.status = statusSel.value;
        tok.nameLocked = nameLocked; tok.frozen = frozen; tok.famous = famous;
        tok.material = matIn.value.trim();
        tok.story = storyTa.value;
        tok.adminEdited = true;
        delete tok.autoGen; /* a hand-edited token is no longer "auto-generated" */
        G.saveNow();
        if (owner) G.pushAccountToCloud(owner);
        closeAll();
      },
    }));
    acts.appendChild(U.el('button', {
      cls: 'btn danger', text: '🗑 Delete token', onclick: () => {
        if (!confirm('Delete "' + tok.name + '" from ' + (owner ? owner.displayName : 'this account') + '\'s collection permanently?')) return;
        if (owner) {
          delete owner.tokens[tok.id];
          (owner.pouches || []).forEach(p => { if (p.tokenIds) p.tokenIds = p.tokenIds.filter(x => x !== tok.id); });
          Object.values(G.world.market.listings).forEach(l => { if (l.tokenId === tok.id) delete G.world.market.listings[l.id]; });
          G.saveNow(); G.pushAccountToCloud(owner);
        }
        closeAll();
      },
    }));
    acts.appendChild(U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: closeAll }));
    w.appendChild(acts);
  }

  /* permanently delete an account (real player or Dya'kukull): from the world,
     its market listings, offers, any tournaments it sits in, bans, and — for a
     real player — from the cloud so it's gone on every device. Returns a promise
     for the cloud deletion (or undefined when offline / AI). */
  function deleteAccount(a) {
    if (!a) return;
    const id = a.id;
    delete G.world.accounts[id];
    /* clean market: listings + offers + notify subscriptions referencing them */
    Object.values(G.world.market.listings).forEach(l => { if (l.sellerId === id || l.buyerId === id) delete G.world.market.listings[l.id]; });
    Object.values(G.world.market.offers || {}).forEach(o => { if (o.sellerId === id || o.buyerId === id) delete G.world.market.offers[o.id]; });
    /* pull them out of any tournament rosters */
    Object.values(G.world.tournaments || {}).forEach(t => { if (Array.isArray(t.players)) t.players = t.players.filter(p => p !== id); });
    /* clear any ban record */
    if (G.world.bans && G.world.bans[id]) delete G.world.bans[id];
    G.saveNow();
    /* real players also live in the cloud account table + ban table */
    const AC = DYA.accountCloud;
    if (!a.ai && AC && AC.configured()) {
      if (AC.clearBan) { try { AC.clearBan(id); } catch (e) { /* best effort */ } }
      if (AC.remove) return AC.remove(id);
    }
  }

  /* ================= ACCOUNT / AI EDITORS ================= */
  function editAccount(a) {
    const { w, close } = modal('4% 12%');
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Edit — ' + a.displayName + (a.cloudAccount ? ' 🌐' : '') }));
    const cols = U.el('div', { cls: 'grid', style: 'grid-template-columns:1fr 1fr;gap:18px;align-items:start' });
    w.appendChild(cols);
    const leftC = U.el('div', {}), rightC = U.el('div', {});
    cols.appendChild(leftC); cols.appendChild(rightC);

    /* ---- account fields ---- */
    const fields = [['displayName', 'Name', 'text'], ['level', 'Level', 'number'], ['gold', 'Gold', 'number'], ['ngakara', 'NgAkara', 'number'], ['rank', 'Rank', 'number']];
    const inputs = {};
    fields.forEach(([k, l, t]) => {
      leftC.appendChild(U.el('label', { cls: 'lbl', text: l }));
      inputs[k] = U.el('input', { cls: 'txt', type: t, value: a[k] });
      leftC.appendChild(inputs[k]);
    });
    /* grant Hunt slots directly to this player */
    leftC.appendChild(U.el('label', { cls: 'lbl mt', text: 'Hunt slots (has ' + ((a.huntSlots || []).length) + ' open)' }));
    const hsGrant = U.el('div', { cls: 'flex', style: 'gap:6px' });
    const hsN = numIn(1, { step: 1, min: 1, style: 'max-width:90px' });
    hsGrant.appendChild(hsN);
    hsGrant.appendChild(U.el('button', {
      cls: 'btn small', text: '🏹 Grant Hunt slots', onclick: () => {
        const n = parseInt(hsN.value, 10) || 1;
        G.admin.grantHuntSlots(a.id, n);
        alert('Granted ' + n + ' Hunt slot' + (n > 1 ? 's' : '') + ' to ' + a.displayName + '.');
        close(); rerender();
      },
    }));
    leftC.appendChild(hsGrant);
    leftC.appendChild(U.el('div', { cls: 'flex mt', style: 'flex-wrap:wrap;gap:6px' }, [
      U.el('button', {
        cls: 'btn primary', text: 'Save account', onclick: () => {
          fields.forEach(([k, , t]) => { a[k] = t === 'number' ? (parseInt(inputs[k].value) || 0) : inputs[k].value; });
          G.saveNow(); G.pushAccountToCloud(a); close(); rerender();
        },
      }),
      U.el('button', {
        cls: 'btn danger', text: '🗑 Delete ' + (a.ai ? 'account' : 'player'), onclick: async () => {
          if (!confirm('Delete ' + a.displayName + '? This removes the account, its ' + Object.keys(a.tokens || {}).length + ' token(s), and its market listings.')) return;
          if (!confirm('Really delete ' + a.displayName + '? There is no undo' + (a.cloudAccount ? ' — this also removes them from the cloud, on every device.' : '.'))) return;
          const del = deleteAccount(a);
          if (del && del.then) { try { await del; } catch (e) { /* cloud delete best-effort */ } }
          close(); rerender();
        },
      }),
      U.el('button', { cls: 'btn ghost', text: 'Close', onclick: () => { close(); rerender(); } }),
    ]));

    /* ---- collection: edit each individual token ---- */
    a.tokens = a.tokens || {};
    rightC.appendChild(U.el('h3', { cls: 'gold mb', text: 'Collection (' + Object.keys(a.tokens).length + ' tokens)' }));
    const search = U.el('input', { cls: 'txt mb', placeholder: '🔎 name / species / rarity…' });
    rightC.appendChild(search);
    const tokBox = U.el('div', { style: 'max-height:52vh;overflow:auto' });
    rightC.appendChild(tokBox);
    function paintToks() {
      tokBox.innerHTML = '';
      const q = search.value.trim().toLowerCase();
      const list = Object.values(a.tokens).filter(t => {
        if (!q) return true;
        const sp = SP.get(t.speciesId);
        return (t.name + ' ' + (sp ? sp.name : t.speciesId) + ' ' + (SP.RARITIES[t.rarity] || '')).toLowerCase().includes(q);
      }).sort((x, y) => (y.rarity - x.rarity));
      if (!list.length) { tokBox.appendChild(U.el('p', { cls: 'muted small', text: q ? 'No matching tokens.' : 'No tokens.' })); return; }
      list.forEach(t => {
        const sp = SP.get(t.speciesId);
        const r = U.el('div', { cls: 'flex', style: 'gap:6px;align-items:center;border-bottom:1px solid var(--line);padding:4px 0' });
        if (sp) r.appendChild(spriteThumb(sp, 30));
        r.appendChild(U.el('div', { cls: 'flex1 small', html: '<b>' + U.esc(t.name) + '</b>' + (t.nameLocked ? ' 🔒' : '') + (t.frozen ? ' ❄' : '') + '<br><span class="muted">' + (sp ? sp.name : t.speciesId) + ' · ' + (SP.RARITIES[t.rarity] != null ? SP.RARITIES[t.rarity] : t.rarity) + (t.status && t.status !== 'collection' ? ' · ' + t.status : '') + ' · ' + (t.stats ? t.stats.hp + '/' + t.stats.dmg + '/' + t.stats.speed : '—') + '</span>' }));
        r.appendChild(U.el('button', { cls: 'btn small primary', text: 'Edit', onclick: () => editToken(t, a, paintToks) }));
        r.appendChild(U.el('button', {
          cls: 'btn small danger', text: '✕', onclick: () => {
            if (!confirm('Delete "' + t.name + '"?')) return;
            delete a.tokens[t.id];
            (a.pouches || []).forEach(p => { if (p.tokenIds) p.tokenIds = p.tokenIds.filter(x => x !== t.id); });
            Object.values(G.world.market.listings).forEach(l => { if (l.tokenId === t.id) delete G.world.market.listings[l.id]; });
            G.saveNow(); G.pushAccountToCloud(a); paintToks();
          },
        }));
        tokBox.appendChild(r);
      });
    }
    search.oninput = paintToks;
    paintToks();

    /* ---- mint a fresh token into this collection ---- */
    const addRow = U.el('div', { cls: 'flex mt', style: 'gap:6px' });
    const spSel = U.el('select', { cls: 'txt' });
    SP.list.forEach(s => spSel.appendChild(U.el('option', { value: s.id, text: s.name })));
    const rarSel = U.el('select', { cls: 'txt', style: 'max-width:130px' });
    SP.RARITIES.forEach((rn, i) => rarSel.appendChild(U.el('option', { value: i, text: rn })));
    addRow.appendChild(spSel); addRow.appendChild(rarSel);
    addRow.appendChild(U.el('button', {
      cls: 'btn small', text: '＋ Mint', onclick: () => {
        const t = TK.mint({ speciesId: spSel.value, rng: new U.Rng(U.newSeed()), owner: a.id, rarity: parseInt(rarSel.value, 10) });
        a.tokens[t.id] = t;
        G.saveNow(); G.pushAccountToCloud(a); paintToks();
      },
    }));
    rightC.appendChild(addRow);
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
        r.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Edit', onclick: () => editToken(t, a, paintToks) }));
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

  /* ================= TOURNAMENT PLACEMENT REWARDS =================
     Decide exactly what each finishing place earns: gold, NgAkara, Okid,
     tokens, and Hunt privileges (Hunt slots). Used by both the online
     official-tournament creator and the local tournaments list. */
  function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function editTournamentRewards(sizeHint, initial, onSave) {
    const { w, close } = modal('4% 12%');
    w.appendChild(U.el('h2', { cls: 'gold', text: 'Placement rewards' }));
    w.appendChild(U.el('p', { cls: 'small muted mb', text: 'Decide exactly what each finishing place earns — gold, NgAkara, Okid, tokens, and Hunt privileges (Hunt slots). Leave a place empty for nothing. These are granted in addition to the normal prize-pool split.' }));
    const places = Math.max(3, Math.min(sizeHint || 8, 8));
    const rewards = (Array.isArray(initial) ? U.deepCopy(initial) : []);
    const holder = U.el('div', {});
    w.appendChild(holder);

    function paint() {
      holder.innerHTML = '';
      for (let p = 0; p < places; p++) {
        rewards[p] = rewards[p] || { gold: 0, ngakara: 0, huntSlots: 0, okid: [], tokens: [] };
        const rw = rewards[p];
        rw.okid = rw.okid || []; rw.tokens = rw.tokens || [];
        const box = U.el('div', { cls: 'panel mb', style: 'padding:10px' });
        box.appendChild(U.el('b', { cls: 'gold', text: ordinal(p + 1) + ' place' }));
        const g = U.el('div', { cls: 'grid mt', style: 'grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px' });
        const mk = (label, key) => {
          const c = U.el('div', {});
          c.appendChild(U.el('label', { cls: 'lbl', text: label }));
          const inp = numIn(rw[key] || 0, { step: 1, min: 0 });
          inp.oninput = () => rw[key] = parseInt(inp.value, 10) || 0;
          c.appendChild(inp); g.appendChild(c);
        };
        mk('Gold', 'gold'); mk('NgAkara', 'ngakara'); mk('Hunt slots', 'huntSlots');
        box.appendChild(g);

        /* Okid rows */
        box.appendChild(U.el('label', { cls: 'lbl mt', text: 'Okid' }));
        rw.okid.forEach((o, oi) => {
          const r = U.el('div', { cls: 'flex', style: 'gap:6px;margin-bottom:4px' });
          const rSel = selectEl(SP.RARITIES.map((rn, i) => [String(i), rn]), String(o.rarity || 0));
          rSel.onchange = () => o.rarity = parseInt(rSel.value, 10) || 0;
          const qIn = numIn(o.qty || 1, { step: 1, min: 1, style: 'max-width:90px' });
          qIn.oninput = () => o.qty = parseInt(qIn.value, 10) || 1;
          r.appendChild(rSel); r.appendChild(qIn);
          r.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { rw.okid.splice(oi, 1); paint(); } }));
          box.appendChild(r);
        });
        box.appendChild(U.el('button', { cls: 'btn small ghost', text: '＋ Okid', onclick: () => { rw.okid.push({ rarity: 0, qty: 1 }); paint(); } }));

        /* Token rows — EITHER a hand-designed token minted fresh for the
           winner, OR the EXACT token pulled from the Reserve (consumed on
           grant, like a Guild listing sold once). */
        box.appendChild(U.el('label', { cls: 'lbl mt', text: 'Tokens' }));
        rw.tokens.forEach((tk, ti) => {
          /* migrate a legacy flat token reward into a spec */
          if (!tk.spec) { tk.spec = { speciesId: tk.speciesId || (SP.list[0] && SP.list[0].id) }; if (tk.rarity != null) tk.spec.rarity = tk.rarity; delete tk.speciesId; delete tk.rarity; }
          const r = U.el('div', { style: 'margin-bottom:6px' });
          const line = U.el('div', { cls: 'flex', style: 'gap:6px;align-items:center;flex-wrap:wrap' });
          if (tk.reserveId) {
            const entry = M.getReserveEntry(tk.reserveId);
            line.appendChild(U.el('div', { cls: 'small', style: 'flex:1', text: '📦 ' + (entry ? specSummary(entry.spec) : '(this Reserve token is gone)') }));
            line.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Unlink', onclick: () => { delete tk.reserveId; tk.spec = { speciesId: (SP.list[0] && SP.list[0].id) }; paint(); } }));
          } else {
            const spSel = selectEl(SP.list.map(s => [s.id, s.name]), tk.spec.speciesId || (SP.list[0] && SP.list[0].id));
            spSel.style.flex = '2'; spSel.onchange = () => { tk.spec.speciesId = spSel.value; sumLine.textContent = specSummary(tk.spec); };
            const rSel = selectEl([['', 'rarity: roll']].concat(SP.RARITIES.map((rn, i) => [String(i), rn])), tk.spec.rarity != null ? String(tk.spec.rarity) : '');
            rSel.onchange = () => { if (rSel.value === '') delete tk.spec.rarity; else tk.spec.rarity = parseInt(rSel.value, 10); sumLine.textContent = specSummary(tk.spec); };
            const qIn = numIn(tk.qty || 1, { step: 1, min: 1, style: 'max-width:70px' });
            qIn.oninput = () => tk.qty = parseInt(qIn.value, 10) || 1;
            const designBtn = U.el('button', { cls: 'btn small', text: '✎ Design', onclick: () => editHuntEnemy(tk.spec, () => { sumLine.textContent = specSummary(tk.spec); }, { hideBoss: true, title: 'Reward token — design every detail', intro: 'Design the exact token this placement awards. Anything you set is minted true for the winner; blank fields roll fresh when it’s granted.' }) });
            const resToks = M.reserveEntries();
            const reserveBtn = U.el('button', {
              cls: 'btn small ghost', text: '📦 From Reserve', onclick: () => {
                if (!resToks.length) { alert('The Reserve is empty — craft a token in the Crafting Station tab first.'); return; }
                pickReserveEntry(resToks, (entry) => { tk.reserveId = entry.id; delete tk.qty; paint(); });
              },
            });
            line.appendChild(spSel); line.appendChild(rSel); line.appendChild(qIn); line.appendChild(designBtn); line.appendChild(reserveBtn);
            var sumLine = U.el('div', { cls: 'small muted', style: 'margin:2px 0 0 2px', text: specSummary(tk.spec) });
          }
          line.appendChild(U.el('button', { cls: 'btn small danger', text: '✕', onclick: () => { rw.tokens.splice(ti, 1); paint(); } }));
          r.appendChild(line);
          if (sumLine) r.appendChild(sumLine);
          box.appendChild(r);
        });
        box.appendChild(U.el('button', { cls: 'btn small ghost', text: '＋ Token', onclick: () => { rw.tokens.push({ spec: { speciesId: (SP.list[0] && SP.list[0].id) }, qty: 1 }); paint(); } }));

        holder.appendChild(box);
      }
    }
    paint();

    /* strip empty placements down to a compact array before saving */
    function clean() {
      const isEmpty = rw => !rw || (!rw.gold && !rw.ngakara && !rw.huntSlots && !(rw.okid && rw.okid.length) && !(rw.tokens && rw.tokens.length));
      let last = -1;
      rewards.forEach((rw, i) => { if (!isEmpty(rw)) last = i; });
      if (last < 0) return null;
      return rewards.slice(0, last + 1).map(rw => ({
        gold: rw.gold || 0, ngakara: rw.ngakara || 0, huntSlots: rw.huntSlots || 0,
        okid: (rw.okid || []).filter(o => (o.qty | 0) > 0),
        tokens: (rw.tokens || []).filter(t => {
          if (t.reserveId) return true;
          const sid = (t.spec && t.spec.speciesId) || t.speciesId;
          return sid && SP.get(sid);
        }),
      }));
    }
    w.appendChild(U.el('div', { cls: 'flex mt' }, [
      U.el('button', { cls: 'btn primary', text: 'Save rewards', onclick: () => { onSave(clean()); close(); } }),
      U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => close() }),
    ]));
  }
})();
