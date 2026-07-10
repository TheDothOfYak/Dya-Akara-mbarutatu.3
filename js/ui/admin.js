/* ============================================================
   DYA'AKARA — ui/admin.js
   The Admin Panel (Master Design Doc, Part XVI).
   Developer/creator use only — lives outside the game UI at
   admin.html. Full god-mode access, including the Dya'kukull
   AI player management tab.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, SP = DYA.species, EC = DYA.economy, TK = DYA.token;
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

  /* ---------- main panel ---------- */
  function panel() {
    root.innerHTML = '';
    const wrap = U.el('div', { cls: 'admin-wrap' });
    wrap.appendChild(U.el('h1', { cls: 'gold', text: "DYA'AKARA — ADMIN PANEL" }));
    wrap.appendChild(U.el('p', { cls: 'muted small', text: 'Full god-mode access. Season ' + G.world.season.number + ' · ' + Object.keys(G.world.accounts).length + ' accounts · Handle with the usual recklessness.' }));
    const grid = U.el('div', { cls: 'admin-grid mt' });
    const nav = U.el('div', { cls: 'admin-nav' });
    const body = U.el('div', {});
    ['Overview', 'Tournaments', 'Bans & Appeals', 'Flagged Tokens', 'Market Monitor', 'Spawn Tokens', 'Announcements', "Dya'kukull (AI Players)", 'God Mode'].forEach(v => {
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
    Overview(body) {
      const humans = Object.values(G.world.accounts).filter(a => !a.ai);
      const ais = Object.values(G.world.accounts).filter(a => a.ai);
      const listings = Object.values(G.world.market.listings).length;
      const openReports = G.world.appeals.filter(a => a.open).length;
      const tiles = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(160px,1fr))' });
      [['Real players', humans.length], ['AI players', ais.length], ['Market listings', listings], ['Open reports/appeals', openReports], ['Tournaments', Object.values(G.world.tournaments).length], ['Season', G.world.season.number]].forEach(([l, v]) => {
        tiles.appendChild(U.el('div', { cls: 'stat-tile' }, [U.el('div', { cls: 'st-num', text: v }), U.el('div', { cls: 'st-lbl', text: l })]));
      });
      body.appendChild(tiles);
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

    'Flagged Tokens'(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'Trigger: player report only. Tokens function normally until you OPEN the review — then they freeze until you rule. Outcomes: cleared, corrected, deleted, or player penalized.' }));
      const reports = G.world.appeals.filter(x => x.kind === 'tokenReport' && x.open);
      if (!reports.length) body.appendChild(U.el('p', { cls: 'muted', text: 'No token reports.' }));
      reports.forEach(rep => {
        const owner = G.world.accounts[rep.against];
        const tok = owner && owner.tokens[rep.tokenId];
        const row = U.el('div', { cls: 'panel mb' });
        row.appendChild(U.el('div', { html: '<b>' + U.esc(tok ? tok.name : '(token gone)') + '</b> owned by ' + U.esc(owner ? owner.displayName : '?') + '<br><span class="small muted">' + (tok ? SP.get(tok.speciesId).name + ' · ' + SP.RARITIES[tok.rarity] : '') + ' · reported ' + U.timeAgo(rep.at) + (rep.reviewing ? ' · ❄ FROZEN, under review' : ' · functioning normally') + '</span>' }));
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

    'Market Monitor'(body) {
      const lsts = Object.values(G.world.market.listings);
      const offers = Object.values(G.world.market.offers);
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
          U.el('td', { text: tok.name + ' (' + SP.get(tok.speciesId).name + ')' }),
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

    "Dya'kukull (AI Players)"(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'The 100 AI players that keep the world feeling alive. They look identical to real players — nothing in the game marks them. Manage everything about each one here.' }));
      body.appendChild(U.el('button', {
        cls: 'btn mb', text: '＋ Add AI player', onclick: () => {
          const rng = new U.Rng(U.newSeed());
          /* reuse the world factory through a fresh mint */
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
            const t = TK.mint({ speciesId: rng.pick(SP.craftable), rng, owner: naiAcc.id });
            naiAcc.tokens[t.id] = t;
          }
          naiAcc.pouches = [];
          naiAcc.stall.name = name + '’s Stall';
          G.world.accounts[naiAcc.id] = naiAcc;
          G.saveNow(); rerender();
        },
      }));
      const tbl = U.el('table', { cls: 'adm' });
      tbl.appendChild(U.el('tr', {}, ['Name', 'Lv', 'Gold', 'Tokens', 'Region', 'Style', 'Market', 'Tourneys', 'Active', ''].map(h => U.el('th', { text: h }))));
      Object.values(G.world.accounts).filter(a => a.ai).forEach(a => {
        const tr = U.el('tr', {});
        tr.appendChild(U.el('td', { text: a.displayName + (a.aiCfg.merchant ? ' 🏪' : '') }));
        tr.appendChild(U.el('td', { text: a.level }));
        tr.appendChild(U.el('td', { text: U.fmt(a.gold) }));
        tr.appendChild(U.el('td', { text: Object.keys(a.tokens).length }));
        tr.appendChild(U.el('td', { text: (EC.REGIONS.find(r => r.id === a.region) || {}).name || a.region }));
        tr.appendChild(U.el('td', { text: a.aiCfg.playStyle }));
        tr.appendChild(U.el('td', { text: Math.round(a.aiCfg.marketActivity * 100) + '%' }));
        tr.appendChild(U.el('td', { text: a.aiCfg.tournaments ? '✓' : '—' }));
        tr.appendChild(U.el('td', { text: a.aiCfg.active ? '✓' : '✗ disabled' }));
        const td = U.el('td', {});
        td.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Edit', onclick: () => editAI(a) }));
        tr.appendChild(td);
        tbl.appendChild(tr);
      });
      body.appendChild(tbl);
    },

    'God Mode'(body) {
      body.appendChild(U.el('p', { cls: 'muted small mb', text: 'Anything. Everything. No confirmation beyond the ones below. You were warned by this sentence.' }));
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
      body.appendChild(U.el('p', { cls: 'small muted', text: 'World created ' + U.fmtClock(G.world.createdAt) + ' · storage backend: ' + DYA.store.backend + ' (see README for the Firebase adapter path).' }));
    },
  };

  function editAccount(a) {
    const w = U.el('div', { cls: 'panel', style: 'position:fixed;inset:10% 20%;overflow:auto;z-index:100' });
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
          G.saveNow(); w.remove(); rerender();
        },
      }),
      U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => w.remove() }),
    ]));
    document.body.appendChild(w);
  }

  function editAI(a) {
    const w = U.el('div', { cls: 'panel', style: 'position:fixed;inset:6% 18%;overflow:auto;z-index:100' });
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Dya’kukull — ' + a.displayName }));
    const name = U.el('input', { cls: 'txt', value: a.displayName });
    const level = U.el('input', { cls: 'txt', type: 'number', value: a.level });
    const gold = U.el('input', { cls: 'txt', type: 'number', value: a.gold });
    const ngak = U.el('input', { cls: 'txt', type: 'number', value: a.ngakara });
    const region = U.el('select', { cls: 'txt' });
    EC.REGIONS.forEach(r => region.appendChild(U.el('option', { value: r.id, text: r.name, selected: a.region === r.id ? '' : undefined })));
    region.value = a.region;
    const style = U.el('select', { cls: 'txt' });
    ['aggressive', 'defensive', 'balanced', 'greedy', 'chaotic'].forEach(s => style.appendChild(U.el('option', { value: s, text: s })));
    style.value = a.aiCfg.playStyle;
    const market = U.el('input', { type: 'range', min: 0, max: 100, value: Math.round(a.aiCfg.marketActivity * 100) });
    const skill = U.el('input', { type: 'range', min: 10, max: 120, value: Math.round(a.aiCfg.matchSkill * 100) });
    [['Name', name], ['Level & XP', level], ['Gold', gold], ['NgAkara', ngak], ['Region (circuit assignment)', region], ['Play style', style], ['Market activity', market], ['Match skill', skill]].forEach(([l, el]) => {
      w.appendChild(U.el('label', { cls: 'lbl', text: l })); w.appendChild(el);
    });
    const tourney = U.el('div', { cls: 'toggle' + (a.aiCfg.tournaments ? ' on' : ''), style: 'margin-top:8px' });
    tourney.onclick = () => { a.aiCfg.tournaments = !a.aiCfg.tournaments; tourney.classList.toggle('on'); };
    w.appendChild(U.el('label', { cls: 'lbl', text: 'Enters tournaments' })); w.appendChild(tourney);
    const active = U.el('div', { cls: 'toggle' + (a.aiCfg.active ? ' on' : ''), style: 'margin-top:8px' });
    active.onclick = () => { a.aiCfg.active = !a.aiCfg.active; active.classList.toggle('on'); };
    w.appendChild(U.el('label', { cls: 'lbl', text: 'Active (disabled AIs do nothing)' })); w.appendChild(active);
    w.appendChild(U.el('label', { cls: 'lbl', text: 'Collection (' + Object.keys(a.tokens).length + ' tokens)' }));
    const tokRow = U.el('div', { cls: 'flex', style: 'flex-wrap:wrap;max-height:120px;overflow:auto' });
    Object.values(a.tokens).slice(0, 40).forEach(t => tokRow.appendChild(U.el('span', { cls: 'pill', text: t.name })));
    w.appendChild(tokRow);
    w.appendChild(U.el('div', { cls: 'flex mt' }, [
      U.el('button', {
        cls: 'btn primary', text: 'Save', onclick: () => {
          a.displayName = name.value; a.level = parseInt(level.value) || a.level;
          a.gold = parseInt(gold.value) || 0; a.ngakara = parseInt(ngak.value) || 0;
          a.region = region.value; a.aiCfg.playStyle = style.value;
          a.aiCfg.marketActivity = market.value / 100; a.aiCfg.matchSkill = skill.value / 100;
          G.saveNow(); w.remove(); rerender();
        },
      }),
      U.el('button', { cls: 'btn danger', text: 'Delete AI', onclick: () => { if (confirm('Delete ' + a.displayName + '?')) { delete G.world.accounts[a.id]; G.saveNow(); w.remove(); rerender(); } } }),
      U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => w.remove() }),
    ]));
    document.body.appendChild(w);
  }
})();
