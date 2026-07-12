/* ============================================================
   DYA'AKARA — ui/screens_meta.js
   Adventures (Hunt: slots → Track → encounters → hidden-score
   rewards), Tournaments (browser, brackets, titles, seasons,
   leaderboards), the Dya Guild page (market, appeals, rulings,
   Avizu'Vac, Trin'Vak), and the 14-step tutorial.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, UI = DYA.ui, SP = DYA.species, EC = DYA.economy, TK = DYA.token, L = DYA.lore, M = DYA.mods;

  /* ================= ADVENTURES / HUNT ================= */
  UI.register('adventures', {
    enter(root) {
      const me = G.me;
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Adventures' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      head.appendChild(U.el('h2', { text: 'Adventures — Hunt' }));
      head.appendChild(U.el('div', { cls: 'muted small', text: 'Expedition and Challenge content arrive in future updates.' }));
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body', style: 'max-width:880px;width:100%;margin:0 auto' });

      if (me.activeHunt) { renderActiveHunt(body); page.appendChild(body); scr.appendChild(page); root.appendChild(scr); return; }

      body.appendChild(U.el('p', { cls: 'muted', text: 'A Hunt is a narrative pursuit of one specific creature. Each is a single individual — once someone brings it down, it is gone for good. Success earns a crafting piece of that creature — the token itself must still be sung true at the workbench. You earn one Hunt slot every 10 levels; unused slots expire at the next 10-level mark.' }));

      /* prune expired slots and any choice whose Hunt has vanished */
      me.huntSlots = me.huntSlots.filter(s => !s.expiresAtBand || s.expiresAtBand > me.level);
      me.huntSlots.forEach(s => { if (s.huntId && !(M && M.getHunt(s.huntId))) s.huntId = null; });

      /* slots */
      body.appendChild(U.el('h3', { cls: 'gold mt mb', text: 'Your Hunt Slots' }));
      if (!me.huntSlots.length) {
        body.appendChild(U.el('p', { cls: 'muted', text: 'No open Hunt slots. The next arrives at level ' + (Math.floor(me.level / 10) * 10 + 10) + '. Tournaments sometimes award them too.' }));
      }
      me.huntSlots.forEach(slot => {
        const row = U.el('div', { cls: 'panel mb', style: 'display:flex;gap:14px;align-items:center' });
        const hunt = slot.huntId && M ? M.getHunt(slot.huntId) : null;
        if (!hunt) {
          row.appendChild(U.el('div', { style: 'font-size:30px', text: '🏹' }));
          row.appendChild(U.el('div', { cls: 'flex1', html: '<b>Open slot</b> <span class="small muted">(' + slot.source + (slot.expiresAtBand ? ' · expires at level ' + slot.expiresAtBand : '') + ')</span><br><span class="small muted">Choose your quarry. The choice locks until the Hunt is done.</span>' }));
          row.appendChild(U.el('button', { cls: 'btn', text: 'Choose a Hunt', onclick: () => chooseHunt(slot) }));
        } else if (hunt.hunted) {
          row.appendChild(U.el('div', { style: 'font-size:30px', text: '🕳' }));
          row.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + U.esc(hunt.name) + '</b> <span class="pill">claimed</span><br><span class="small muted">Another hunter brought it down first. Choose a different quarry.</span>' }));
          row.appendChild(U.el('button', { cls: 'btn', text: 'Choose a Hunt', onclick: () => chooseHunt(slot) }));
        } else {
          const sp = SP.get(hunt.speciesId);
          row.appendChild(UI.tokenArt(hunt.speciesId, 66));
          row.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + U.esc(hunt.name) + '</b> <span class="small muted">(' + (sp ? sp.name : hunt.speciesId) + ')</span><br><span class="small muted">' + (sp ? sp.temperament : '') + '</span>' }));
          row.appendChild(U.el('button', { cls: 'btn primary', text: 'Begin the Track', onclick: () => startTrack(slot) }));
          row.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Re-choose', onclick: () => { slot.huntId = null; G.save(); UI.show('adventures'); } }));
        }
        body.appendChild(row);
      });

      /* available hunts the admin has posted (not already taken by one of my slots) */
      body.appendChild(U.el('h3', { cls: 'gold mt mb', text: 'Available Hunts' }));
      const takenIds = me.huntSlots.map(s => s.huntId).filter(Boolean);
      const avail = (M ? M.availableHunts() : []).filter(h => takenIds.indexOf(h.id) < 0);
      if (!avail.length) {
        body.appendChild(U.el('p', { cls: 'muted', text: 'No Hunts are posted right now. The Guild sends word when a great creature is sighted — check back.' }));
      } else {
        const grid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(200px,1fr))' });
        avail.forEach(h => {
          const sp = SP.get(h.speciesId);
          const card = U.el('div', { cls: 'tok-card', style: 'text-align:left;padding:12px' });
          card.appendChild(UI.tokenArt(h.speciesId, 84, 'idle'));
          card.appendChild(U.el('div', { cls: 'gold', text: h.name }));
          card.appendChild(U.el('div', { cls: 'small muted', text: (sp ? sp.name : h.speciesId) + ' · ' + (SP.RARITIES[h.rarity] || '') }));
          const narr = L.NARRATORS[h.narrator];
          if (narr) card.appendChild(U.el('div', { cls: 'small muted', text: 'Narrator: ' + narr.name }));
          const openSlot = me.huntSlots.find(s => !s.huntId || !(M && M.getHunt(s.huntId)) || M.getHunt(s.huntId).hunted);
          card.appendChild(U.el('button', {
            cls: 'btn small mt' + (openSlot ? ' primary' : ' ghost'), text: openSlot ? 'Take this Hunt' : 'Needs a Hunt slot',
            onclick: () => {
              if (!openSlot) { UI.toast ? UI.toast('You have no open Hunt slot.') : alert('You have no open Hunt slot.'); return; }
              openSlot.huntId = h.id; G.save(); UI.show('adventures');
            },
          }));
          grid.appendChild(card);
        });
        body.appendChild(grid);
      }
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);

      function chooseHunt(slot) {
        const list = (M ? M.availableHunts() : []).filter(h => me.huntSlots.every(s => s === slot || s.huntId !== h.id));
        const w = U.el('div', {});
        w.appendChild(U.el('h3', { cls: 'gold', text: 'Choose your quarry' }));
        const m = UI.modal(w);
        if (!list.length) { w.appendChild(U.el('p', { cls: 'muted mt', text: 'No Hunts are available right now.' })); return; }
        const g2 = U.el('div', { cls: 'grid mt', style: 'grid-template-columns:repeat(auto-fill,minmax(120px,1fr))' });
        list.forEach(h => {
          const card = U.el('div', { cls: 'tok-card' });
          card.appendChild(UI.tokenArt(h.speciesId, 70));
          card.appendChild(U.el('div', { cls: 'tc-name', text: h.name }));
          card.onclick = () => { slot.huntId = h.id; G.save(); m.close(); UI.show('adventures'); };
          g2.appendChild(card);
        });
        w.appendChild(g2);
      }

      /* ---- the Track: narrative + 2 questions (hidden 5% influence) ---- */
      function startTrack(slot) {
        const hunt = M && M.getHunt(slot.huntId);
        if (!hunt || hunt.hunted) { slot.huntId = null; G.save(); UI.show('adventures'); return; }
        const spid = hunt.speciesId;
        const narrKey = hunt.narrator || L.HUNT_NARRATOR[spid] || 'guide';
        const narr = L.NARRATORS[narrKey] || L.NARRATORS.guide;
        const intro = hunt.intro || (L.HUNT_INTROS[spid] && L.HUNT_INTROS[spid][narrKey]) || 'The trail is fresh. Answer, and we begin.';
        /* questions: at least 1 creature-specific if pool exists */
        const rng = new U.Rng(U.newSeed());
        const specific = (L.HUNT_QUESTIONS_SPECIFIC[spid] || []);
        const q1 = specific.length ? rng.pick(specific) : rng.pick(L.HUNT_QUESTIONS_GENERAL);
        const q2 = rng.pick(L.HUNT_QUESTIONS_GENERAL);
        const answers = [];
        body.innerHTML = '';
        const track = U.el('div', { cls: 'hunt-track' });
        track.appendChild(U.el('h3', { cls: 'gold center mb', text: narr.title }));
        track.appendChild(U.el('div', { cls: 'narrator-box', text: intro }));
        track.appendChild(U.el('div', { cls: 'small muted center mt', text: '— ' + narr.name }));
        const qWrap = U.el('div', { cls: 'panel mt' });
        track.appendChild(qWrap);
        body.appendChild(track);
        askQuestion(q1, () => {
          /* mid-track beat */
          qWrap.innerHTML = '';
          track.insertBefore(U.el('div', { cls: 'narrator-box mt', text: midTrackLine(spid, narrKey) }), qWrap);
          askQuestion(q2, () => {
            const bias = answers.filter(a => a === 'fierce').length - answers.filter(a => a === 'calm').length; // -2..2
            /* snapshot the authored Hunt so an in-progress pursuit survives
               even if the admin edits or deletes it mid-hunt */
            me.activeHunt = {
              slotId: slot.id, huntId: hunt.id, huntName: hunt.name, speciesId: spid,
              encounters: U.deepCopy(hunt.encounters || []), rewards: U.deepCopy(hunt.rewards || {}),
              encounterIdx: 0, answers, temperBias: bias / 2, /* hidden ~5% acquisition influence */
              losses: 0, startedAt: Date.now(), attemptStart: Date.now(),
            };
            G.save();
            UI.show('adventures');
          });
        });
        function askQuestion(q, next) {
          qWrap.innerHTML = '';
          qWrap.appendChild(U.el('div', { cls: 'gold mb', text: q.q }));
          q.a.forEach(a => {
            qWrap.appendChild(U.el('button', { cls: 'btn ghost q-opt', text: a.t, onclick: () => { answers.push(a.v); DYA.audio.play('click'); next(); } }));
          });
        }
      }

      function midTrackLine(spid, narrKey) {
        const lines = {
          noka: 'The trail bends where the water remembers. One more answer, hunter — the mountain is listening.',
          guild: 'Assessor’s note: tracks confirmed, spoor fresh. Final question for the record, then the Guild wishes you luck. Officially.',
          guide: 'There — see the marks? We’re close now. One more thing before we go quiet.',
        };
        return lines[narrKey];
      }

      /* ---- active hunt: encounter series ---- */
      function renderActiveHunt(body) {
        const hunt = me.activeHunt;
        const sp = SP.get(hunt.speciesId);
        const encounters = (hunt.encounters && hunt.encounters.length) ? hunt.encounters
          : [{ name: (sp && sp.name) || 'The Quarry', desc: 'The quarry stands before you.', terrain: 'plains', enemies: [{ speciesId: hunt.speciesId, boss: true }] }];
        body.appendChild(U.el('h3', { cls: 'gold center', text: 'HUNT — ' + (hunt.huntName || (sp && sp.name) || '').toUpperCase() }));
        /* encounter progress dots */
        const dots = U.el('div', { cls: 'encounter-dots' });
        encounters.forEach((e, i) => {
          dots.appendChild(U.el('div', { cls: 'enc-dot' + (i < hunt.encounterIdx ? ' done' : i === hunt.encounterIdx ? ' current' : ''), title: e.name }));
        });
        body.appendChild(dots);
        const cur = encounters[hunt.encounterIdx];
        const box = U.el('div', { cls: 'panel center', style: 'max-width:560px;margin:0 auto' });
        box.appendChild(U.el('h3', { cls: 'gold', text: 'Encounter ' + (hunt.encounterIdx + 1) + ' of ' + encounters.length + ' — ' + cur.name }));
        box.appendChild(U.el('p', { cls: 'muted mt', text: cur.desc }));
        box.appendChild(U.el('div', { cls: 'mt' }, [UI.tokenArt(cur.enemies[cur.enemies.length - 1].speciesId, 110)]));
        const row = U.el('div', { cls: 'flex mt', style: 'justify-content:center' });
        row.appendChild(U.el('button', {
          cls: 'btn primary', text: '⚔ Fight encounter', onclick: () => {
            DYA.play.pickPouch(pouch => {
              DYA.play.startMatch({
                mode: 'hunt', format: 'Hunt — ' + (hunt.huntName || (sp && sp.name) || 'Quarry'), skipSetup: true, noRecord: true,
                hunt: { enemies: cur.enemies },
                terrain: cur.terrain, pouch,
                opponent: { name: 'The Wild' },
                onFinish: (res, iWon) => {
                  hunt.losses += res.stats && res.stats[0] ? Math.max(0, res.stats[0].tokensPlayed.length - 1) : 0;
                  if (iWon) {
                    hunt.encounterIdx++;
                    hunt.lastHealthScore = res.stats && res.stats[0] ? 1 : 0.8;
                    if (hunt.encounterIdx >= encounters.length) { finishHunt(true); return; }
                  } else {
                    hunt.failedOnce = true; // not a perfect run anymore
                  }
                  G.save();
                  UI.show('adventures');
                },
              });
            }, { title: 'Choose your hunting pouch' });
          },
        }));
        row.appendChild(U.el('button', {
          cls: 'btn danger', text: 'Abandon Hunt', onclick: () => {
            UI.confirm('Abandon the Hunt?', 'The slot stays open — you can start the Track again. The creature will not wait around, though.', () => {
              me.activeHunt = null; G.save(); UI.show('adventures');
            }, 'Abandon');
          },
        }));
        box.appendChild(row);
        body.appendChild(box);

        function finishHunt(success) {
          const spid = hunt.speciesId;
          /* hidden performance score: speed + token health + tokens lost — never shown */
          const mins = (Date.now() - hunt.startedAt) / 60000;
          let score = 1;
          score -= Math.min(0.4, mins / 60 * 0.4);
          score -= Math.min(0.4, hunt.losses * 0.06);
          if (hunt.failedOnce) score -= 0.2;
          score = U.clamp(score + G.titleBuff('huntScore'), 0.05, 1);
          const perfect = !hunt.failedOnce && hunt.losses === 0;
          /* rewards come from THIS individual creature's authored payout */
          const rw = hunt.rewards || {};
          const ceilGold = rw.gold != null ? rw.gold : 500;
          const goldFloor = Math.round(ceilGold * EC.HUNT.goldFloorRate);
          const gold = Math.round(goldFloor + (ceilGold - goldFloor) * score);
          const okid = Math.round((rw.okid != null ? rw.okid : 3) * score);
          const ngak = Math.round((rw.ngakara != null ? rw.ngakara : 3) * score);
          const rng = new U.Rng(U.newSeed());
          const mat = () => (rw.pieceMaterial && rw.pieceMaterial.trim()) || rng.pick(L.MATERIALS);
          /* guaranteed pieces (author-set); perfect runs have a hidden shot at one more */
          const pieceCount = Math.max(1, rw.pieces || 1);
          const pieces = [];
          for (let i = 0; i < pieceCount; i++) pieces.push({ speciesId: spid, material: mat(), from: 'Hunt', temperBias: hunt.temperBias, at: Date.now() });
          const secondChance = rw.secondPieceChance != null ? rw.secondPieceChance : (EC.HUNT.secondPieceChance || 0);
          if (perfect && rng.chance(secondChance)) pieces.push({ speciesId: spid, material: mat(), from: 'Hunt (perfect)', temperBias: hunt.temperBias, at: Date.now() });
          pieces.forEach(p => me.pieces.push(p));
          G.addGold(gold, true);
          const spDef = SP.get(spid);
          if (spDef) me.okid[Math.min(6, spDef.rarity[0])] += okid;
          me.ngakara += ngak;
          me.stats.huntsDone++;
          me.huntSlots = me.huntSlots.filter(s => s.id !== hunt.slotId); // slot consumed on completion
          me.activeHunt = null;
          G.grantAchievement('first_hunt');
          if (perfect) G.grantAchievement('no_losses_hunt');
          G.save();
          /* claim this individual creature for the whole world — it is now hunted */
          if (hunt.huntId && M) M.markHunted(hunt.huntId, me.displayName);
          /* reward screen */
          const w = U.el('div', { cls: 'center' });
          w.appendChild(U.el('h2', { cls: 'gold', text: '✦ THE HUNT IS DONE ✦' }));
          w.appendChild(U.el('p', { cls: 'muted mt', text: 'The ' + (hunt.huntName || (SP.get(spid) && SP.get(spid).name) || 'creature') + ' yields a piece of its truth.' }));
          w.appendChild(U.el('div', { cls: 'panel mt', html: '🦴 <b>' + pieces.length + '× crafting piece</b> (' + pieces.map(p => p.material).join(', ') + ')<br>🪙 +' + U.fmt(gold) + ' gold · ⬡ +' + okid + ' Okid · 🧪 +' + ngak + ' NgAkara' }));
          w.appendChild(U.el('p', { cls: 'small muted mt', text: 'Take the piece to the Crafting bench to sing the token true.' }));
          const m = UI.modal(w, { sticky: true });
          w.appendChild(U.el('button', { cls: 'btn primary mt', text: 'To the workbench', onclick: () => { m.close(); UI.show('crafting'); if (DYA.tutorial) DYA.tutorial.onEvent('huntDone'); } }));
          w.appendChild(U.el('button', { cls: 'btn ghost mt', text: 'Later', onclick: () => { m.close(); UI.show('adventures'); if (DYA.tutorial) DYA.tutorial.onEvent('huntDone'); } }));
          DYA.audio.play('victory');
          UI.refreshTopbar();
        }
      }
    },
  });

  /* ================= TOURNAMENTS ================= */
  const trnState = { filter: 'All' };
  UI.register('tournaments', {
    enter(root) {
      const me = G.me;
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Tournaments' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      head.appendChild(U.el('h2', { text: 'Tournament Browser' }));
      head.appendChild(U.el('div', { cls: 'spacer' }));
      ['All'].concat(EC.CIRCUITS).forEach(c => {
        const chip = U.el('button', { cls: 'filter-chip' + (trnState.filter === c ? ' active' : ''), text: c });
        chip.onclick = () => { trnState.filter = c; UI.show('tournaments'); };
        head.appendChild(chip);
      });
      head.appendChild(U.el('button', { cls: 'btn small', text: '＋ Create tournament', onclick: createTournament }));
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body' });

      /* season banner */
      body.appendChild(U.el('div', { cls: 'panel mb', style: 'display:flex;gap:14px;align-items:center' }, [
        U.el('div', { style: 'font-size:26px', text: '🏆' }),
        U.el('div', { cls: 'flex1', html: '<b class="gold">Ranked Season ' + G.world.season.number + '</b><br><span class="small muted">Ends when the Dya Guild activates the Interplanetary. Ranked play lives inside Guild-sealed tournaments at Regional level and above.</span>' }),
        U.el('button', { cls: 'btn small ghost', text: 'Leaderboards', onclick: showLeaderboards }),
      ]));

      let trns = Object.values(G.world.tournaments).filter(t => t.state !== 'done');
      if (trnState.filter !== 'All') trns = trns.filter(t => t.circuit === trnState.filter);
      trns.sort((a, b) => EC.CIRCUITS.indexOf(a.circuit) - EC.CIRCUITS.indexOf(b.circuit));
      if (!trns.length) body.appendChild(U.el('p', { cls: 'muted', text: 'No open tournaments at this circuit. The Guild activates the Interplanetary when the season ripens.' }));
      trns.forEach(t => {
        const card = U.el('div', { cls: 'panel mb tour-card', style: 'display:flex;gap:14px;align-items:center' });
        card.appendChild(U.el('div', { cls: 'flex1' }, [
          U.el('div', { cls: 'flex' }, [
            U.el('b', { cls: 'gold', text: t.name }),
            t.sealed ? UI.guildSeal(18) : U.el('span', { cls: 'small muted', text: 'player-run' }),
          ]),
          U.el('div', { cls: 'small muted', text: t.circuit + ' circuit · ' + t.arena + ' · organizer: ' + t.organizer }),
          U.el('div', { cls: 'small', html: 'Entry <b class="gold">' + U.fmt(t.entryFee) + 'g</b> · ' + t.size + ' players · pouch: ' + t.pouchFormat + (t.rules.length ? ' · <span style="color:var(--eldi)">special rules</span>' : '') + (t.sealed && EC.CIRCUITS.indexOf(t.circuit) >= 1 ? ' · <b>RANKED</b>' : '') }),
        ]));
        if (t.state === 'running' && t.players.includes(me.id)) {
          card.appendChild(U.el('button', { cls: 'btn primary', text: 'Continue bracket', onclick: () => UI.show('bracket', { trn: t }) }));
        } else if (t.state === 'open') {
          const minLv = EC.CIRCUIT_MIN_LEVEL[t.circuit];
          if (me.level < minLv) card.appendChild(U.el('div', { cls: 'small muted', text: 'Requires level ' + minLv }));
          else card.appendChild(U.el('button', {
            cls: 'btn', text: 'Enter — ' + U.fmt(t.entryFee) + 'g', onclick: () => {
              if (me.gold < t.entryFee) { UI.alert('Too poor', 'Entry is ' + U.fmt(t.entryFee) + 'g.'); return; }
              enterTournament(t);
            },
          }));
        }
        card.appendChild(U.el('button', { cls: 'btn small ghost', text: 'View', onclick: () => UI.show('bracket', { trn: t }) }));
        body.appendChild(card);
      });

      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);

      function createTournament() {
        const w = U.el('div', {});
        w.appendChild(U.el('h3', { cls: 'gold', text: 'Create a player-run tournament' }));
        w.appendChild(U.el('p', { cls: 'small muted', text: 'Requires a Guild tournament license (200g, from the Guild market). Set your own structure and rewards; baseline tournament rules still apply.' }));
        const nm = U.el('input', { cls: 'txt mt', placeholder: 'Tournament name' });
        const fee = U.el('input', { cls: 'txt mt', type: 'number', placeholder: 'Entry fee (goes to the reward pool)', value: 50 });
        /* §9 bracket structure is the organizer's call */
        const struct = U.el('select', { cls: 'txt mt' });
        [['single', 'Single elimination'], ['rr', 'Round robin — everyone plays everyone']].forEach(([v, l]) => struct.appendChild(U.el('option', { value: v, text: l })));
        const fmt = U.el('select', { cls: 'txt mt' });
        [['single', 'Single pouch — locked all tournament'], ['three-draft', 'Three pouch draft'], ['random', 'Random pouch each match']].forEach(([v, l]) => fmt.appendChild(U.el('option', { value: v, text: l })));
        const size = U.el('select', { cls: 'txt mt' });
        [4, 8, 16].forEach(s => size.appendChild(U.el('option', { value: s, text: s + ' players' })));
        w.appendChild(nm); w.appendChild(fee); w.appendChild(struct); w.appendChild(fmt); w.appendChild(size);
        /* §9 custom rewards, pledged from the organizer's own pocket */
        w.appendChild(U.el('div', { cls: 'small muted mt', text: 'Custom rewards (optional — pledged from your own pocket):' }));
        const bonus = U.el('input', { cls: 'txt', type: 'number', min: 0, placeholder: 'Bonus gold for the champion' });
        w.appendChild(bonus);
        const prizeSel = U.el('select', { cls: 'txt mt' });
        prizeSel.appendChild(U.el('option', { value: '', text: 'No token prize' }));
        Object.values(me.tokens).filter(x => x.status === 'collection' && !x.frozen && !x.isRental).forEach(x => prizeSel.appendChild(U.el('option', { value: x.id, text: '🎴 ' + x.name + ' (' + SP.RARITIES[x.rarity] + ')' })));
        w.appendChild(prizeSel);
        /* §15 terrain tokens for every match of the event — organizer's call at creation */
        const terrToks = [];
        const ttRow = U.el('div', { cls: 'flex mt', style: 'flex-wrap:wrap' });
        [['forest', '🌲 Forest patch'], ['water', '💧 Water pool']].forEach(([id, label]) => {
          const b = U.el('button', { cls: 'btn small ghost', text: label });
          b.onclick = () => {
            const i = terrToks.indexOf(id);
            if (i >= 0) terrToks.splice(i, 1); else terrToks.push(id);
            b.classList.toggle('ghost', !terrToks.includes(id));
          };
          ttRow.appendChild(b);
        });
        w.appendChild(U.el('div', { cls: 'small muted mt', text: 'Terrain tokens (placed on every arena of this event):' }));
        w.appendChild(ttRow);
        let aftd = false, wantSeal = false;
        const aftdBtn = U.el('button', { cls: 'btn small ghost mt', text: '✦ Aftð — Active Tokens: OFF', title: 'Tokens keep XP, growth, and behavior across the whole tournament — and same-species pairs may breed.' });
        aftdBtn.onclick = () => { aftd = !aftd; aftdBtn.textContent = '✦ Aftð — Active Tokens: ' + (aftd ? 'ON' : 'OFF'); aftdBtn.classList.toggle('ghost', !aftd); };
        w.appendChild(aftdBtn);
        const sealBtn = U.el('button', { cls: 'btn small ghost mt', style: 'margin-left:6px', text: '🏛 Request Guild seal: OFF', title: 'Sealed events pay the organizer a creator reward (200g + 1 Okid + 1 NgAkara) at completion and the champion a Guild chest. You may enter — and win — your own event.' });
        sealBtn.onclick = () => { wantSeal = !wantSeal; sealBtn.textContent = '🏛 Request Guild seal: ' + (wantSeal ? 'ON' : 'OFF'); sealBtn.classList.toggle('ghost', !wantSeal); };
        w.appendChild(sealBtn);
        const m = UI.modal(w);
        w.appendChild(U.el('button', {
          cls: 'btn primary mt', text: me.flags.tournamentLicense ? 'Create' : 'Buy license (200g) & create', onclick: () => {
            if (!me.flags.tournamentLicense) {
              if (me.gold < 200) { UI.alert('Too poor', 'The license costs 200g.'); return; }
              G.addGold(-200); me.flags.tournamentLicense = true;
            }
            if (nm.value.trim().length < 3) return;
            const bonusGold = parseInt(bonus.value) || 0;
            if (bonusGold > 0 && me.gold < bonusGold) { UI.alert('Too poor', 'You cannot pledge ' + U.fmt(bonusGold) + 'g you do not hold.'); return; }
            if (bonusGold > 0) G.addGold(-bonusGold);
            const t = {
              id: U.uid('trn'), name: nm.value.trim(), circuit: 'Local', sealed: wantSeal,
              organizer: me.displayName, organizerId: me.id, entryFee: parseInt(fee.value) || 0,
              pouchFormat: fmt.value, size: parseInt(size.value), structure: struct.value,
              aftd, customReward: { gold: bonusGold, tokenId: prizeSel.value || null },
              terrainTokens: terrToks.slice(),
              state: 'open', players: [], bracket: null,
              titlePool: [], rules: [], arena: L.ARENAS.Local[0],
              terrain: 'plains', createdAt: Date.now(), schedule: 'Rolling',
            };
            if (aftd) t.rules.push('Aftð — Active Tokens: XP, growth, and behavior persist across the tournament.');
            if (t.structure === 'rr') t.rules.push('Round robin: most match wins takes the championship.');
            G.world.tournaments[t.id] = t;
            G.save(); m.close(); UI.show('tournaments');
          },
        }));
      }

      function enterTournament(t) {
        DYA.play.pickPouch(pouch => {
          me.gold -= t.entryFee;
          t.players.push(me.id);
          /* fill remaining slots with AI players near circuit level */
          const ais = Object.values(G.world.accounts).filter(a => a.ai && a.level >= EC.CIRCUIT_MIN_LEVEL[t.circuit]);
          const rng = new U.Rng(U.newSeed());
          while (t.players.length < t.size && ais.length) {
            const pick = rng.pick(ais);
            if (!t.players.includes(pick.id)) t.players.push(pick.id);
          }
          /* §9 every entry fee lands in the reward pool */
          t.pot = t.entryFee * t.players.length;
          const order = rng.shuffle(t.players);
          if (t.structure === 'rr') {
            /* round robin: one big round of every pairing */
            const round = [];
            for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) round.push({ a: order[i], b: order[j], winner: null });
            t.bracket = [round];
          } else {
            t.bracket = [order.map((p, i) => i % 2 === 0 ? { a: order[i], b: order[i + 1], winner: null } : null).filter(Boolean)];
          }
          t.state = 'running';
          t.myPouch = pouch.map(x => x.id);
          if (t.aftd) DYA.aftd.activate(t, pouch);
          G.save();
          UI.show('bracket', { trn: t });
        }, { title: t.pouchFormat === 'random' ? 'Random pouch — pick a fallback' : 'Choose your tournament pouch' });
      }

      function showLeaderboards() {
        const w = U.el('div', {});
        w.appendChild(U.el('h3', { cls: 'gold', text: 'Circuit Leaderboards — Season ' + G.world.season.number }));
        const tabs = U.el('div', { cls: 'tabs mt' });
        const list = U.el('div', { cls: 'mt' });
        EC.CIRCUITS.forEach((c, i) => {
          const tab = U.el('div', { cls: 'tab' + (i === 0 ? ' active' : ''), text: c });
          tab.onclick = () => { U.qsa('.tab', tabs).forEach(x => x.classList.remove('active')); tab.classList.add('active'); render(c); };
          tabs.appendChild(tab);
        });
        w.appendChild(tabs); w.appendChild(list);
        function render(circuit) {
          list.innerHTML = '';
          const minLv = EC.CIRCUIT_MIN_LEVEL[circuit];
          const players = Object.values(G.world.accounts).filter(a => a.level >= minLv || a.id === me.id);
          players.sort((a, b) => b.rank - a.rank);
          players.slice(0, 12).forEach((p, i) => {
            const row = U.el('div', { cls: 'friend-row' + (p.id === me.id ? ' gold' : '') });
            row.appendChild(U.el('div', { style: 'width:26px', text: '#' + (i + 1) }));
            row.appendChild(U.el('div', { cls: 'flex1', html: '<b' + (p.id === me.id ? ' class="gold"' : '') + '>' + U.esc(p.displayName) + '</b> <span class="small muted">Lv ' + p.level + '</span>' }));
            row.appendChild(U.el('div', { cls: 'gold', text: p.rank }));
            list.appendChild(row);
          });
        }
        render('Local');
        UI.modal(w);
      }
    },
  });

  /* ---------- bracket display (Part XII spec) ---------- */
  UI.register('bracket', {
    enter(root, params) {
      const t = params.trn;
      const me = G.me;
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Tournament' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('tournaments') }));
      /* top left banner */
      const banner = U.el('div', {}, [
        U.el('div', { cls: 'flex' }, [U.el('h2', { text: t.name }), t.sealed ? UI.guildSeal(20) : null]),
        U.el('div', { cls: 'small muted', text: t.circuit + ' circuit · organized by ' + t.organizer + ' · ' + t.arena }),
      ]);
      head.appendChild(banner);
      const tabs = U.el('div', { cls: 'tabs' });
      head.appendChild(U.el('div', { cls: 'spacer' }));
      head.appendChild(tabs);
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body' });
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);

      let bracketView = 'full';
      const views = {
        Main() {
          body.innerHTML = '';
          const cols = U.el('div', { cls: 'flex', style: 'align-items:flex-start' });
          /* left: pinned non-standard rules */
          const left = U.el('div', { style: 'width:220px;flex-shrink:0' });
          if (t.rules.length) {
            left.appendChild(U.el('h3', { cls: 'gold mb', text: 'Special rules' }));
            t.rules.forEach(r => left.appendChild(U.el('div', { cls: 'small', text: '• ' + r })));
          } else left.appendChild(U.el('div', { cls: 'small muted', text: 'Standard Guild ruleset. No exceptions pinned.' }));
          left.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Rewards' }));
          const pool = t.pot != null ? t.pot : t.entryFee * t.size;
          left.appendChild(U.el('div', {
            cls: 'small', html:
              '🥇 ' + U.fmt(Math.round(pool * 0.6) + EC.CIRCUIT_GOLD[t.circuit] + ((t.customReward && t.customReward.gold) || 0)) + 'g · title' + (t.titlePool.length ? '' : ' (none)') + ' · ' + EC.CIRCUIT_XP[t.circuit] + ' XP' +
              (t.sealed ? ' · 🎁 Guild chest' : '') +
              ((t.customReward && t.customReward.tokenId) ? ' · 🎴 token prize' : '') +
              '<br>🥈 ' + U.fmt(Math.round(pool * 0.25)) + 'g<br>🥉 ' + U.fmt(Math.round(pool * 0.1)) + 'g shared (trickle-down)<br>🏛 organizer keeps ' + U.fmt(Math.round(pool * 0.05)) + 'g (5%) at the end' + (t.sealed ? ' + creator reward' : ''),
          }));
          const toggle = U.el('button', { cls: 'btn small ghost mt', text: bracketView === 'full' ? 'View: Full Bracket' : 'View: My Path' });
          toggle.onclick = () => { bracketView = bracketView === 'full' ? 'my' : 'full'; views.Main(); };
          left.appendChild(toggle);
          cols.appendChild(left);
          /* center: bracket */
          const bwrap = U.el('div', { cls: 'bracket-wrap flex1' });
          bwrap.appendChild(renderBracket());
          cols.appendChild(bwrap);
          body.appendChild(cols);
        },
        Rules() {
          body.innerHTML = '';
          body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Baseline tournament rules' }));
          ['Standard match rules apply unless pinned otherwise.', 'Pouch format: ' + t.pouchFormat + '.', 'Bracket format set by the organizer — single elimination here.', 'Rematches at the organizer’s discretion.', 'Description cards are auto-generated from token data.', t.sealed ? 'This event is Guild-sealed: rulings are final and matches at Regional level and above are RANKED.' : 'This is a player-run event. The Guild holds no opinion, officially.'].forEach(r => body.appendChild(U.el('p', { cls: 'small', text: '• ' + r })));
        },
        Players() {
          body.innerHTML = '';
          t.players.forEach(pid => {
            const acc = G.world.accounts[pid];
            if (!acc) return;
            const row = U.el('div', { cls: 'friend-row' });
            row.appendChild(U.el('div', { cls: 'flex1', html: '<b' + (pid === me.id ? ' class="gold"' : '') + '>' + U.esc(acc.displayName) + '</b> <span class="small muted">Lv ' + acc.level + ' · rank ' + acc.rank + '</span>' }));
            body.appendChild(row);
          });
          if (!t.players.length) body.appendChild(U.el('p', { cls: 'muted', text: 'No entrants yet.' }));
        },
        Schedule() {
          body.innerHTML = '';
          body.appendChild(U.el('p', { cls: 'muted', text: t.schedule + '. Play your match whenever you’re ready — the bracket waits for you (the Dya’kukull are patient).' }));
        },
        'Live/Results'() {
          body.innerHTML = '';
          if (!t.bracket) { body.appendChild(U.el('p', { cls: 'muted', text: 'Bracket forms when the tournament fills.' })); return; }
          t.bracket.forEach((round, ri) => {
            body.appendChild(U.el('h3', { cls: 'gold mb mt', text: roundName(t, ri) }));
            round.forEach(mt => {
              const a = G.world.accounts[mt.a], b = G.world.accounts[mt.b];
              body.appendChild(U.el('div', { cls: 'small', text: (a ? a.displayName : 'bye') + ' vs ' + (b ? b.displayName : 'bye') + ' — ' + (mt.winner ? 'won by ' + G.world.accounts[mt.winner].displayName : 'pending') }));
            });
          });
        },
        Announcements() {
          body.innerHTML = '';
          body.appendChild(U.el('p', { cls: 'muted', text: t.sealed ? 'The Guild reminds all entrants that wagering on sealed matches outside sanctioned channels is a violation. The Guild also reminds you that it is watching. Cordially.' : 'The organizer has posted no announcements.' }));
        },
      };
      ['Main', 'Rules', 'Players', 'Schedule', 'Live/Results', 'Announcements'].forEach((tb, i) => {
        const tab = U.el('div', { cls: 'tab' + (i === 0 ? ' active' : ''), text: tb });
        tab.onclick = () => { U.qsa('.tab', tabs).forEach(x => x.classList.remove('active')); tab.classList.add('active'); views[tb](); };
        tabs.appendChild(tab);
      });
      views.Main();

      /* the field plays around you: refresh when other matches resolve */
      const sig = () => t.state + '|' + JSON.stringify(t.bracket ? t.bracket.map(r2 => r2.map(mm => mm.winner)) : null);
      let lastSig = sig();
      const liveIv = setInterval(() => {
        if (!scr.isConnected) { clearInterval(liveIv); return; }
        if (sig() !== lastSig) { lastSig = sig(); UI.show('bracket', { trn: t }); }
      }, 5000);
      this.leave = () => clearInterval(liveIv);

      function roundName(t, ri) {
        const rounds = Math.log2(t.size);
        const left = rounds - ri;
        return left === 1 ? 'FINAL' : left === 2 ? 'Semifinals' : left === 3 ? 'Quarterfinals' : 'Round ' + (ri + 1);
      }

      function renderBracket() {
        const wrap = U.el('div', { cls: 'bracket' });
        if (!t.bracket) { wrap.appendChild(U.el('p', { cls: 'muted', text: 'Waiting for entrants. Enter from the tournament browser.' })); return wrap; }
        t.bracket.forEach((round, ri) => {
          const col = U.el('div', { cls: 'b-round' });
          round.forEach((mt, mi) => {
            if (bracketView === 'my' && mt.a !== me.id && mt.b !== me.id) return;
            const box = U.el('div', { cls: 'b-match' });
            [mt.a, mt.b].forEach(pid => {
              const acc = pid ? G.world.accounts[pid] : null;
              const p = U.el('div', { cls: 'b-player' + (mt.winner === pid && pid ? ' winner' : '') + (pid === me.id ? ' me' : '') });
              p.appendChild(U.el('span', { text: acc ? acc.displayName : '—' }));
              if (mt.winner === pid) p.appendChild(U.el('span', { text: '✓' }));
              box.appendChild(p);
            });
            /* my playable match? */
            if (!mt.winner && (mt.a === me.id || mt.b === me.id) && roundReady(ri)) {
              const btn = U.el('button', { cls: 'btn small primary', style: 'margin:6px', text: '⚔ Play' });
              btn.onclick = () => playMyMatch(ri, mi);
              box.appendChild(btn);
            }
            col.appendChild(box);
          });
          wrap.appendChild(col);
        });
        return wrap;
      }
      function roundReady(ri) {
        if (ri === 0) return true;
        return t.bracket[ri - 1].every(m => m.winner);
      }

      function playMyMatch(ri, mi) {
        const mt = t.bracket[ri][mi];
        const oppId = mt.a === me.id ? mt.b : mt.a;
        const opp = G.world.accounts[oppId];
        const ranked = t.sealed && EC.CIRCUIT_XP[t.circuit] && EC.CIRCUITS.indexOf(t.circuit) >= 1;
        const isFinal = ri === t.bracket.length - 1 || t.bracket[ri].length === 1;

        function launch(pouch) {
          DYA.play.startMatch({
            mode: 'standard', ranked, format: t.circuit + ' Tournament', tournament: t.name,
            terrain: t.terrain, terrainTokens: t.terrainTokens,
            opponent: { name: opp.displayName, accId: opp.id, aiSkill: opp.aiCfg ? opp.aiCfg.matchSkill : 0.7, pouch: DYA.play.accountPouch(opp), simulatedHuman: true },
            pouch,
            onFinish: (res, iWon) => {
              mt.winner = iWon ? me.id : oppId;
              if (t.aftd) DYA.aftd.afterMatch(t, res);
              advanceBracket(); /* advances only when the whole round is played */
              if (t.state === 'done') {
                if (t.champion === me.id) tournamentWon();
                else {
                  finishTournament(t);
                  UI.toast({ title: 'Tournament over', body: G.world.accounts[t.champion].displayName + ' takes the championship. Your share of the pool, if any, is paid.', icon: '🏆' });
                }
              } else if (!iWon && t.structure !== 'rr') {
                /* eliminated — the rest of the field plays on WITHOUT you,
                   match by match, over the next while. Results land here. */
                UI.toast({ title: 'Eliminated', body: 'The bracket plays on without you — watch it fill in from the bracket page. There is always next season.', icon: '🏆' });
              } else if (!t.bracket[t.bracket.length - 1].every(m2 => m2.winner)) {
                UI.toast({ title: 'Match recorded', body: 'The other Dya\u2019kukull play their matches on their own time. You\u2019ll be told when your next round is ready.', icon: '🏆' });
              }
              G.save();
              UI.show('bracket', { trn: t });
            },
          });
        }

        /* Planet+ : pick 3 titles before the final */
        if (isFinal && (t.circuit === 'Whole Planet' || t.circuit === 'Interplanetary') && t.titlePool.length && !t.myTitlePicks) {
          const pool = t.titlePool.map(id => EC.TITLES.find(x => x.id === id)).filter(Boolean);
          const picks = [];
          const w = U.el('div', {});
          w.appendChild(U.el('h3', { cls: 'gold', text: 'Before the final: choose 3 titles' }));
          w.appendChild(U.el('p', { cls: 'small muted', text: 'Win, and you keep exactly one of the three.' }));
          const m = UI.modal(w, { sticky: true });
          pool.concat(EC.TITLES.filter(x => x.tier === 'Planet' || x.tier === t.circuit)).slice(0, 6).forEach(tt => {
            const b = U.el('button', { cls: 'btn ghost q-opt', text: tt.name + ' — ' + tt.desc });
            b.onclick = () => {
              if (picks.includes(tt.id)) return;
              picks.push(tt.id); b.classList.remove('ghost');
              if (picks.length === 3) { t.myTitlePicks = picks; G.save(); m.close(); pickPouchAndLaunch(); }
            };
            w.appendChild(b);
          });
          return;
        }
        pickPouchAndLaunch();
        function pickPouchAndLaunch() {
          if (t.pouchFormat === 'single' && t.myPouch) {
            launch(t.myPouch.map(id => me.tokens[id]).filter(Boolean));
          } else {
            DYA.play.pickPouch(launch, { title: t.pouchFormat === 'three-draft' ? 'Draft: choose which pouch for THIS match' : 'Choose your pouch' });
          }
        }
      }

      function rrWins() {
        const wins = {};
        t.bracket[0].forEach(m2 => { if (m2.winner) wins[m2.winner] = (wins[m2.winner] || 0) + 1; });
        return wins;
      }
      function advanceBracket() {
        if (t.structure === 'rr') {
          if (t.bracket[0].every(m2 => m2.winner)) {
            const wins = rrWins();
            t.state = 'done';
            t.champion = t.players.slice().sort((a, b) =>
              (wins[b] || 0) - (wins[a] || 0) ||
              ((G.world.accounts[b] ? G.world.accounts[b].rank : 0) - (G.world.accounts[a] ? G.world.accounts[a].rank : 0)))[0];
          }
          return;
        }
        const last = t.bracket[t.bracket.length - 1];
        if (last.length === 1 && last[0].winner) { t.state = 'done'; t.champion = last[0].winner; return; }
        if (last.every(m => m.winner) && last.length > 1) {
          const next = [];
          for (let i = 0; i < last.length; i += 2) {
            next.push({ a: last[i].winner, b: last[i + 1] ? last[i + 1].winner : null, winner: last[i + 1] ? null : last[i].winner });
          }
          t.bracket.push(next);
        }
      }
      /* §9 — completion payouts: trickle-down pool, organizer 5%, sealed extras. Runs once. */
      function finishTournament(t2) {
        if (t2.paidOut) return t2.payout || {};
        t2.paidOut = true;
        const pool = t2.pot != null ? t2.pot : Math.round(t2.entryFee * t2.size);
        const pay = { championGold: 0, chest: null, prizeTok: null };
        const grant = (pid, amount) => {
          if (!pid || amount <= 0) return;
          const acc = G.world.accounts[pid];
          if (!acc) return;
          if (acc === me) G.addGold(amount, true); else acc.gold += amount;
        };
        const champion = t2.champion;
        let runnerUp = null, third = [];
        if (t2.structure === 'rr') {
          const wins = rrWins();
          const order = t2.players.slice().sort((a, b) => (wins[b] || 0) - (wins[a] || 0));
          runnerUp = order[1] || null; third = order[2] ? [order[2]] : [];
        } else if (t2.bracket && t2.bracket.length) {
          const finalM = t2.bracket[t2.bracket.length - 1][0];
          if (finalM) runnerUp = finalM.a === champion ? finalM.b : finalM.a;
          const semis = t2.bracket.length > 1 ? t2.bracket[t2.bracket.length - 2] : null;
          if (semis) third = semis.map(m2 => m2.winner === m2.a ? m2.b : m2.a).filter(pp => pp && pp !== champion && pp !== runnerUp);
        }
        pay.championGold = Math.round(pool * 0.6) + EC.CIRCUIT_GOLD[t2.circuit] + ((t2.customReward && t2.customReward.gold) || 0);
        grant(champion, pay.championGold);
        grant(runnerUp, Math.round(pool * 0.25));
        third.forEach(pp => grant(pp, Math.round(pool * 0.1 / third.length)));
        const orgId = t2.organizerId || (G.findAccount(t2.organizer) || {}).id;
        grant(orgId, Math.round(pool * 0.05));
        if (t2.sealed) {
          /* creator reward — even when the organizer entered (and won) their own event */
          const org = orgId && G.world.accounts[orgId];
          if (org) {
            if (org === me) { G.addGold(200, true); me.okid[0]++; me.ngakara++; G.notify({ type: 'tournament', title: 'Creator reward', body: 'The Guild honors your sealed event: 200g + 1 Okid + 1 NgAkara.', icon: '🏛' }); }
            else { org.gold += 200; org.okid[0]++; org.ngakara++; }
          }
          /* champion's Guild chest: gold, Okid, NgAkara — rarely a crafting piece */
          const rng = new U.Rng(U.newSeed());
          const huntSpecies = (DYA.mods && DYA.mods.availableHunts().map(h => h.speciesId)) || [];
          const chestPieceSpid = huntSpecies.length ? rng.pick(huntSpecies) : rng.pick(SP.craftable);
          const chest = { gold: rng.int(150, 600), okR: rng.int(0, 3), okQ: rng.int(1, 2), ng: rng.int(0, 3), piece: rng.chance(0.08) ? chestPieceSpid : null };
          pay.chest = chest;
          const champAcc = champion && G.world.accounts[champion];
          if (champAcc) {
            if (champAcc === me) {
              G.addGold(chest.gold, true); me.okid[chest.okR] += chest.okQ; me.ngakara += chest.ng;
              if (chest.piece) me.pieces.push({ speciesId: chest.piece, material: 'chest trophy piece', from: t2.name, temperBias: 0, at: Date.now() });
            } else { champAcc.gold += chest.gold; champAcc.okid[chest.okR] += chest.okQ; champAcc.ngakara += chest.ng; }
          }
        }
        /* organizer's pledged token prize changes hands */
        if (t2.customReward && t2.customReward.tokenId && champion) {
          const org = orgId && G.world.accounts[orgId];
          const champAcc = G.world.accounts[champion];
          const ptok = org && org.tokens[t2.customReward.tokenId];
          if (ptok && champAcc && champAcc.id !== org.id) {
            delete org.tokens[ptok.id];
            ptok.ownerId = champAcc.id; ptok.status = 'collection';
            ptok.tradeHistory.push({ at: Date.now(), from: org.displayName, to: champAcc.displayName, price: 0, gift: true });
            champAcc.tokens[ptok.id] = ptok;
            if (champAcc === me) pay.prizeTok = ptok;
          }
        }
        if (t2.aftd) DYA.aftd.deactivate(t2);
        t2.payout = pay;
        G.save();
        return pay;
      }

      function tournamentWon() {
        const pay = finishTournament(t); /* pays the whole field, including me */
        const gold = pay.championGold;
        const xp = EC.CIRCUIT_XP[t.circuit];
        me.stats.tourneysWon++;
        G.grantAchievement('tourney_win');
        G.world.season.winners.push({ name: me.displayName, circuit: t.circuit, tournament: t.name, at: Date.now() });
        /* hunt slot reward from bigger tournaments */
        if (EC.CIRCUITS.indexOf(t.circuit) >= 1) {
          me.huntSlots.push({ id: U.uid('hs'), huntId: null, source: 'tournament', expiresAtBand: Math.floor(me.level / 10) * 10 + 10 });
        }
        /* title flow per circuit tier */
        const pool = t.titlePool.map(id => EC.TITLES.find(x => x.id === id)).filter(Boolean);
        const w = U.el('div', { cls: 'center' });
        w.appendChild(U.el('h2', { cls: 'gold', text: '🏆 CHAMPION 🏆' }));
        w.appendChild(U.el('p', { cls: 'mt', html: 'Winner of <b>' + U.esc(t.name) + '</b><br>🪙 +' + U.fmt(gold) + 'g · ⭐ +' + xp + ' XP' }));
        if (pay.chest) {
          const ch = pay.chest;
          w.appendChild(U.el('div', {
            cls: 'panel mt', html: '🎁 <b class="gold">Guild-sealed champion\u2019s chest</b><br>🪙 +' + U.fmt(ch.gold) + 'g · ⬡ +' + ch.okQ + ' ' + SP.RARITIES[ch.okR] + ' Okid · 🧪 +' + ch.ng + ' NgAkara' +
              (ch.piece ? '<br>🦴 <b>A crafting piece of a ' + SP.get(ch.piece).name + '</b> — the rare roll came in.' : ''),
          }));
        }
        if (pay.prizeTok) w.appendChild(U.el('div', { cls: 'panel mt', html: '🎴 The organizer\u2019s pledged prize is yours: <b class="gold">' + U.esc(pay.prizeTok.name) + '</b>' }));
        const m = UI.modal(w, { sticky: true });
        function done() { m.close(); const evs = G.addXP(xp); evs.forEach(ev => DYA.play.showLevelUp(ev)); UI.refreshTopbar(); UI.show('bracket', { trn: t }); }
        if (!pool.length) { w.appendChild(U.el('button', { cls: 'btn primary mt', text: 'Glory enough', onclick: done })); DYA.audio.play('victory'); return; }
        if (t.circuit === 'Local') {
          const title = pool[Math.floor(Math.random() * pool.length)];
          if (!me.titles.includes(title.id)) me.titles.push(title.id);
          w.appendChild(U.el('p', { cls: 'gold mt', text: 'Title earned: « ' + title.name + ' » — ' + title.desc }));
          w.appendChild(U.el('button', { cls: 'btn primary mt', text: 'Claim', onclick: done }));
        } else if (t.myTitlePicks) {
          w.appendChild(U.el('p', { cls: 'muted mt', text: 'Choose one of your three picks to keep:' }));
          t.myTitlePicks.forEach(id => {
            const tt = EC.TITLES.find(x => x.id === id);
            w.appendChild(U.el('button', { cls: 'btn ghost q-opt', text: tt.name + ' — ' + tt.desc, onclick: () => { if (!me.titles.includes(id)) me.titles.push(id); done(); } }));
          });
        } else {
          w.appendChild(U.el('p', { cls: 'muted mt', text: 'Choose your title from the organizer’s pool:' }));
          pool.forEach(tt => {
            w.appendChild(U.el('button', { cls: 'btn ghost q-opt', text: tt.name + ' — ' + tt.desc, onclick: () => { if (!me.titles.includes(tt.id)) me.titles.push(tt.id); done(); } }));
          });
        }
        DYA.audio.play('victory');
        /* interplanetary win ends the season */
        if (t.endsSeason) {
          G.world.rulings.unshift({ at: Date.now(), text: me.displayName + ' is the Interplanetary Champion of Season ' + G.world.season.number + '.' });
        }
      }
    },
  });

  /* ================= AFTÐ — ACTIVE TOKENS (§2) =================
     In an Aftð tournament, tokens keep their earned XP, growth, and
     behavior drift for the WHOLE tournament, then reset when it ends
     (match-reset stays the default everywhere else). Same-species
     pairs that stay active through a long event may leave offspring. */
  const AFTD = {};
  DYA.aftd = AFTD;

  AFTD.activate = function (t, pouch) {
    const me = G.me;
    t.aftdTokens = [];
    pouch.forEach(tok => {
      const real = me.tokens[tok.id];
      if (!real || real.aftdBase) return;
      real.aftdBase = { stats: U.deepCopy(real.stats), behaviorValue: real.behaviorValue, headCount: real.picks ? real.picks.headCount : undefined };
      real.aftdXp = 0;
      t.aftdTokens.push(real.id);
    });
    UI.toast({ title: 'Aftð — Active Tokens', body: 'Your tokens keep what they earn until the tournament ends.', icon: '✦' });
  };

  AFTD.afterMatch = function (t, res) {
    const me = G.me;
    if (!res || !res.tokenXp) return;
    const rng = new U.Rng(U.newSeed());
    Object.entries(res.tokenXp).forEach(([tid, e]) => {
      const tok = me.tokens[tid];
      if (!tok || !tok.aftdBase) return;
      tok.aftdXp = (tok.aftdXp || 0) + e.xp;
      /* +2% strike & health per 100 carried XP, capped at +30% over base */
      const mul = Math.min(1.3, 1 + Math.floor(tok.aftdXp / 100) * 0.02);
      tok.stats.dmg = Math.round(tok.aftdBase.stats.dmg * mul);
      tok.stats.hp = Math.round(tok.aftdBase.stats.hp * mul);
      /* Naga heads grown on the field stay grown */
      if (e.heads > 1 && tok.picks && (tok.picks.headCount || 1) < e.heads) tok.picks.headCount = Math.min(5, e.heads);
      /* behavior drifts a little with lived experience */
      if (rng.chance(0.35)) tok.behaviorValue = U.clamp(tok.behaviorValue + rng.pick([-1, 1]), 1, 99);
    });
    G.save();
  };

  AFTD.deactivate = function (t) {
    const me = G.me;
    /* breeding check happens BEFORE the reset, while the pair is still "active" */
    const rounds = t.structure === 'rr' ? Math.max(1, t.players.length - 1) : (t.bracket ? t.bracket.length : 0);
    if (rounds >= 3 && t.aftdTokens && t.aftdTokens.length) {
      const bySpecies = {};
      t.aftdTokens.forEach(tid => { const tok = me.tokens[tid]; if (tok) (bySpecies[tok.speciesId] = bySpecies[tok.speciesId] || []).push(tok); });
      const rng = new U.Rng(U.newSeed());
      Object.values(bySpecies).forEach(list => {
        if (list.length < 2 || !rng.chance(0.6)) return;
        const parent = rng.pick(list);
        const child = TK.mint({ speciesId: parent.speciesId, rng, owner: me.id, rarity: Math.max(0, parent.rarity - rng.int(0, 1)) });
        /* offspring are weaker than either parent, stats freshly rolled then scaled down */
        child.stats.hp = Math.max(1, Math.round(child.stats.hp * rng.range(0.6, 0.8)));
        child.stats.dmg = Math.max(1, Math.round(child.stats.dmg * rng.range(0.6, 0.8)));
        child.name = parent.name + '\u2019s offspring';
        child.story = 'Born under Aftð rules at ' + t.name + '. Weaker than its line — for now.';
        G.addToken(child);
        UI.toast({ title: 'Aftð offspring', body: parent.name + ' leaves you ' + child.name + '.', icon: '🥚' });
      });
    }
    (t.aftdTokens || []).forEach(tid => {
      const tok = me.tokens[tid];
      if (!tok || !tok.aftdBase) return;
      tok.stats = tok.aftdBase.stats;
      tok.behaviorValue = tok.aftdBase.behaviorValue;
      if (tok.picks) tok.picks.headCount = tok.aftdBase.headCount;
      delete tok.aftdBase; delete tok.aftdXp;
    });
    delete t.aftdTokens;
    G.save();
  };

  /* ================= DYA GUILD PAGE ================= */
  const guildState = { tab: 'Market' };
  UI.register('guild', {
    enter(root) {
      const me = G.me;
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Dya Guild' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      head.appendChild(U.el('h2', { text: 'The Dya Guild' }));
      head.appendChild(UI.guildSeal(26));
      const tabs = U.el('div', { cls: 'tabs' });
      head.appendChild(U.el('div', { cls: 'spacer' }));
      head.appendChild(tabs);
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body', style: 'max-width:900px;width:100%;margin:0 auto' });
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);

      const views = {
        Market() {
          body.innerHTML = '';
          body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Guild Market — standard goods' }));
          const goods = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(210px,1fr))' });
          function good(icon, name, desc, price, fn) {
            const c = U.el('div', { cls: 'panel center' });
            c.appendChild(U.el('div', { style: 'font-size:30px', text: icon }));
            c.appendChild(U.el('b', { cls: 'gold', text: name }));
            c.appendChild(U.el('p', { cls: 'small muted', text: desc }));
            c.appendChild(U.el('button', { cls: 'btn small mt', text: U.fmt(price) + 'g', onclick: () => { if (me.gold < price) { UI.alert('Too poor', 'That costs ' + U.fmt(price) + 'g.'); return; } G.addGold(-price, true); fn(); DYA.audio.play('coin'); UI.refreshTopbar(); views.Market(); } }));
            return c;
          }
          goods.appendChild(good('🧪', 'NgAkara bottle', 'Su Naga fluid, honestly harvested. The Naga is fine.', 120, () => { me.ngakara++; G.save(); }));
          goods.appendChild(good('⬡', 'Buri Okid', 'Common crafting Okid.', 60, () => { me.okid[0]++; G.save(); }));
          goods.appendChild(good('⬡', 'Tui Okid', 'Uncommon crafting Okid.', 140, () => { me.okid[1]++; G.save(); }));
          goods.appendChild(good('⬡', 'Stamijan Okid', 'Fine crafting Okid.', 320, () => { me.okid[2]++; G.save(); }));
          goods.appendChild(good('📜', 'Tournament license', 'Run your own tournaments. Baseline rules apply.', 200, () => { me.flags.tournamentLicense = true; G.save(); }));
          goods.appendChild(good('🎴', 'Guild stall token', 'A common token from the Guild’s own stall. Species is the Guild’s choice.', 100, () => {
            const rng = new U.Rng(U.newSeed());
            const spid = rng.pick(['kipsu', 'wild_punk', 'uff', 'raf_krabbi', 'rodak', 'mikolo_moko', 'karnen']);
            const tok = TK.mint({ speciesId: spid, rng, rarity: Math.min(1, SP.get(spid).rarity[1]) });
            G.addToken(tok);
            UI.toast({ title: 'The Guild provides', body: tok.name + ' (' + SP.get(spid).name + ')', icon: '🎴' });
            if (DYA.tutorial) DYA.tutorial.onEvent('guildStallBuy');
          }));
          body.appendChild(goods);
          body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'New releases' }));
          body.appendChild(U.el('p', { cls: 'small muted', text: 'Terrain sets and token releases are announced in the Avizu’Vac. Basic terrain sets shipped at launch; named sets circulate at wealthier venues.' }));
        },
        'Circuit Tournaments'() {
          body.innerHTML = '';
          EC.CIRCUITS.forEach(c => {
            const trns = Object.values(G.world.tournaments).filter(t => t.sealed && t.circuit === c && t.state !== 'done');
            body.appendChild(U.el('h3', { cls: 'gold mb mt', text: c }));
            if (!trns.length) { body.appendChild(U.el('p', { cls: 'small muted', text: c === 'Interplanetary' ? 'Activated by the Guild when the season ends. Watch the announcements.' : 'No sealed events open at this level.' })); return; }
            trns.forEach(t => {
              const row = U.el('div', { cls: 'friend-row' });
              row.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + U.esc(t.name) + '</b> <span class="small muted">' + t.arena + '</span>' }));
              row.appendChild(U.el('button', { cls: 'btn small', text: 'View', onclick: () => UI.show('bracket', { trn: t }) }));
              body.appendChild(row);
            });
          });
        },
        'Seal Verification'() {
          body.innerHTML = '';
          body.appendChild(U.el('p', { cls: 'muted', text: 'Click any Guild seal anywhere in Dya’Akara to verify its legitimacy. A genuine seal means the event follows Guild rules, pays Guild-standard rewards, and answers to Guild rulings. Counterfeit seals are a violation the Guild treats with… enthusiasm.' }));
          body.appendChild(U.el('div', { cls: 'mt' }, [UI.guildSeal(60)]));
        },
        Appeals() {
          body.innerHTML = '';
          const ban = G.banInfo(me.id);
          if (ban) {
            body.appendChild(U.el('div', { cls: 'banlist-row', html: '<b>Your account is banned:</b> ' + U.esc(ban.reason) + '<br><span class="small muted">' + (ban.permanent ? 'Permanent' : 'Until ' + U.fmtClock(ban.until)) + '</span>' }));
          }
          body.appendChild(U.el('p', { cls: 'muted', text: 'Banned players may submit appeals directly to the Guild. All appeals are read. Most are even read twice.' }));
          const txt = U.el('textarea', { cls: 'txt mt', rows: 4, placeholder: 'Your appeal…' });
          body.appendChild(txt);
          body.appendChild(U.el('button', {
            cls: 'btn mt', text: 'Submit appeal', onclick: () => {
              if (txt.value.trim().length < 5) return;
              G.world.appeals.push({ id: U.uid('app'), kind: 'appeal', by: me.id, note: txt.value.trim(), at: Date.now(), open: true });
              G.save(); txt.value = '';
              UI.toast({ title: 'Appeal submitted', body: 'The Guild will rule in due time.', icon: '⚖' });
            },
          }));
          /* public bans */
          const bans = Object.entries(G.world.bans);
          if (bans.length) {
            body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Public ban record' }));
            bans.forEach(([accId, b]) => {
              const acc = G.world.accounts[accId];
              body.appendChild(U.el('div', { cls: 'banlist-row', html: '<b>' + U.esc(acc ? acc.displayName : accId) + '</b> — ' + U.esc(b.reason) + ' <span class="small muted">(' + (b.permanent ? 'permanent' : 'until ' + U.fmtClock(b.until)) + ')</span>' }));
            });
          }
        },
        'Rulings Log'() {
          body.innerHTML = '';
          G.world.rulings.forEach(r => {
            body.appendChild(U.el('div', { cls: 'news-card' }, [
              U.el('div', { cls: 'nc-body', text: r.text }),
              U.el('div', { cls: 'small muted mt', text: U.timeAgo(r.at) }),
            ]));
          });
        },
        "Avizu'Vac"() {
          body.innerHTML = '';
          body.appendChild(U.el('p', { cls: 'muted small mb', text: 'The Guild’s official publication. Curated, prestigious, admin-approved. Being featured is a big deal; submissions welcome, approval mandatory.' }));
          G.world.avizu.forEach(a => {
            body.appendChild(U.el('div', { cls: 'news-card', style: 'border-left-color:#8a1c1c' }, [
              U.el('div', { cls: 'nc-title', text: a.title }),
              U.el('div', { cls: 'nc-body', text: a.body }),
            ]));
          });
          const txt = U.el('textarea', { cls: 'txt mt', rows: 3, placeholder: 'Submit a piece for consideration…' });
          body.appendChild(txt);
          body.appendChild(U.el('button', {
            cls: 'btn mt small', text: 'Submit for approval', onclick: () => {
              if (txt.value.trim().length < 5) return;
              G.world.appeals.push({ id: U.uid('avz'), kind: 'avizuSubmission', by: me.id, note: txt.value.trim(), at: Date.now(), open: true });
              G.save(); txt.value = '';
              UI.toast({ title: 'Submitted to the Avizu’Vac', body: 'Approval required for everything. Everything.', icon: '📜' });
            },
          }));
        },
        "Trin'Vak"() {
          body.innerHTML = '';
          body.appendChild(U.el('p', { cls: 'muted small mb', text: 'The community notice board. Pay-to-post, auto-approved, gloriously unfiltered.' }));
          const title = U.el('input', { cls: 'txt', placeholder: 'Notice title' });
          const txt = U.el('textarea', { cls: 'txt mt', rows: 2, placeholder: 'Your notice…' });
          const amt = U.el('input', { cls: 'txt mt', type: 'number', value: 25, placeholder: 'Payment (more gold = higher on the board)' });
          body.appendChild(title); body.appendChild(txt); body.appendChild(amt);
          body.appendChild(U.el('button', {
            cls: 'btn mt small', text: 'Post notice', onclick: () => {
              const pay = parseInt(amt.value) || 0;
              if (pay < 5) { UI.alert('Cheapskate', 'Minimum 5g. The board has standards. Low ones, but standards.'); return; }
              if (me.gold < pay) { UI.alert('Too poor', 'You cannot pay ' + pay + 'g.'); return; }
              if (title.value.trim().length < 3) return;
              G.addGold(-pay, true);
              G.world.trinvak.unshift({ id: U.uid('tv'), at: Date.now(), author: me.displayName, title: title.value.trim(), body: txt.value.trim(), paid: pay });
              G.world.trinvak.sort((a, b) => b.paid - a.paid);
              G.save(); UI.show('guild'); UI.refreshTopbar();
            },
          }));
          body.appendChild(U.el('div', { cls: 'divider' }));
          G.world.trinvak.forEach(n => {
            body.appendChild(U.el('div', { cls: 'news-card' }, [
              U.el('div', { cls: 'nc-title', text: n.title }),
              U.el('div', { cls: 'nc-body', text: n.body }),
              U.el('div', { cls: 'small muted mt', text: '— ' + n.author + ' · paid ' + n.paid + 'g · ' + U.timeAgo(n.at) }),
            ]));
          });
        },
      };
      ['Market', 'Circuit Tournaments', 'Seal Verification', 'Appeals', 'Rulings Log', "Avizu'Vac", "Trin'Vak"].forEach((tname) => {
        const tab = U.el('div', { cls: 'tab' + (guildState.tab === tname ? ' active' : ''), text: tname });
        tab.onclick = () => { guildState.tab = tname; U.qsa('.tab', tabs).forEach(x => x.classList.remove('active')); tab.classList.add('active'); views[tname](); };
        tabs.appendChild(tab);
      });
      views[guildState.tab]();
    },
  });

  /* ================= TUTORIAL (14 steps, Part IX) ================= */
  const TUT = {
    active: false,
    spot: null,
  };
  DYA.tutorial = TUT;

  TUT.start = function () {
    const me = G.me;
    TUT.active = true;
    if (me.tutorial.step < 3) me.tutorial.step = 3;
    UI.showWithLoading('menu', {}, 1000);
    setTimeout(() => TUT.run(), 1400);
  };

  TUT.skip = function () {
    UI.confirm('Skip the tutorial?', 'You keep everything already granted, but forfeit the remaining tutorial tokens.', () => {
      G.me.tutorial.done = true;
      G.me.gold = Math.max(G.me.gold, 1000);
      if (!G.me.seal) G.me.seal = { avatarIdx: G.me.avatarIdx, patterns: ['runes'], locked: false };
      TUT.clear(); G.save();
    }, 'Skip');
  };

  TUT.clear = function () { if (TUT.spot) { TUT.spot.remove(); TUT.spot = null; } };

  function spot(opts) {
    TUT.clear();
    const s = U.el('div', { cls: 'tut-spot', style: opts.pos || 'left:50%;top:52%;transform:translate(-50%,-50%)' });
    s.appendChild(U.el('div', { cls: 'ts-step', text: 'TUTORIAL — STEP ' + opts.step + ' OF 15' }));
    s.appendChild(U.el('div', { cls: 'ts-title', text: opts.title }));
    s.appendChild(U.el('div', { cls: 'ts-body', html: opts.body }));
    const row = U.el('div', { cls: 'flex mt' });
    if (opts.next) row.appendChild(U.el('button', { cls: 'btn primary small', text: opts.nextLabel || 'Continue', onclick: opts.next }));
    row.appendChild(U.el('button', { cls: 'btn ghost small', text: 'Skip tutorial', onclick: TUT.skip }));
    s.appendChild(row);
    document.body.appendChild(s);
    TUT.spot = s;
  }

  TUT.run = function () {
    const me = G.me;
    if (!me || me.tutorial.done) return;
    const step = me.tutorial.step;
    const save = () => { G.save(); };
    switch (step) {
      case 3: { /* First token: themselves as an Eikar */
        const rng = new U.Rng(U.hashStr(me.id));
        const tok = TK.mint({ speciesId: 'sword_eikar', rng, owner: me.id, rarity: 1, name: me.displayName });
        tok.story = me.displayName + ' — you, sung true from a lock of your own acorn-cap at the Guild registry. Every player of Dya’Akara begins with their own truth on the field.';
        tok.isStarter = true;
        tok.isSelf = true; /* the token of the player themself — it commands the field as they would */
        G.addToken(tok);
        spot({
          step: 3, title: 'Your First Token: You',
          body: 'Every account begins with the player themselves, sung true as an Eikar token. <b>' + U.esc(me.displayName) + '</b> now stands in your collection — sword, acorn cap, and all.<br><br><i>Token 1 of 13.</i>',
          next: () => { me.tutorial.step = 4; save(); TUT.run(); },
        });
        break;
      }
      case 4:
        spot({
          step: 4, title: 'The Tournament Road',
          body: 'Dya’Akara is played in circuits: <b>Local → Regional → Half Planet → Whole Planet → Interplanetary</b>. The Dya Guild seals official events — ranked play lives there. Your home region sets your Regional circuit. Everything else is practice, pride, and profit.',
          next: () => { me.tutorial.step = 4.5; save(); TUT.run(); },
        });
        break;
      case 4.5: /* §3/§14 — the player's seal is struck during the tutorial */
        spot({
          step: 5, title: 'Strike Your Seal',
          body: 'Every keeper carries a <b>seal</b> — an engraved coin, struck once: your face at the center, up to two patterns around the rim. It marks your screens, rings your creatures on the field, and stamps your victories.',
          nextLabel: 'Design my seal',
          next: () => {
            TUT.clear();
            UI.sealDesigner(() => {
              spot({
                step: 5, title: 'The Seal Is Struck',
                body: 'Done — and done forever. You will find it behind every page and beneath every creature you field.',
                next: () => { me.tutorial.step = 5; save(); TUT.run(); },
              });
            });
          },
        });
        break;
      case 5: { /* Guild selection — pick 4 tokens, one per element */
        spot({
          step: 6, title: 'Guild Selection — choose 4 tokens',
          body: 'The Guild grants every new player four tokens: one of each element — <span class="el-Su">Su</span>, <span class="el-Eldi">Eldi</span>, <span class="el-Fti">Fti</span>, <span class="el-Ular">Ular</span>. Choose one from each shelf.',
          next: () => {
            TUT.clear();
            const w = U.el('div', {});
            w.appendChild(U.el('h3', { cls: 'gold', text: 'Guild Selection' }));
            const m = UI.modal(w, { sticky: true });
            const chosen = {};
            SP.ELEMENTS.forEach(el => {
              w.appendChild(U.el('div', { cls: 'muted small mt', text: el + ' — ' + SP.ELEMENT_NAMES[el] }));
              const row = U.el('div', { cls: 'flex', style: 'flex-wrap:wrap' });
              SP.starterChoices[el].forEach(spid => {
                const card = UI.tokenCard(TK.mint({ speciesId: spid, rng: new U.Rng(U.hashStr(spid)), rarity: SP.get(spid).rarity[0] }), { size: 66 });
                card.style.width = '110px';
                card.onclick = () => {
                  chosen[el] = spid;
                  U.qsa('.tok-card', row).forEach(c => c.style.borderColor = '');
                  card.style.borderColor = 'var(--gold)';
                  if (Object.keys(chosen).length === 4) confirmBtn.disabled = false;
                };
                row.appendChild(card);
              });
              w.appendChild(row);
            });
            const confirmBtn = U.el('button', { cls: 'btn primary mt', text: 'Take them', disabled: 'true' });
            confirmBtn.onclick = () => {
              SP.ELEMENTS.forEach(el => {
                const rng = new U.Rng(U.newSeed());
                const tok = TK.mint({ speciesId: chosen[el], rng, owner: me.id, isStarter: true });
                G.addToken(tok);
              });
              m.close();
              me.tutorial.step = 6; save();
              UI.toast({ title: 'Four tokens granted', body: 'Tokens 2–5 of 13.', icon: '🎴' });
              TUT.run();
            };
            w.appendChild(confirmBtn);
          },
        });
        break;
      }
      case 6:
        spot({
          step: 7, title: 'Your First Hunt',
          body: 'Tokens are crafted from pieces of real creatures — and pieces come from <b>Hunts</b>. The Guild has arranged a beginner’s Hunt: a young Tonguatjis, patient and shelled. Bring your five tokens.',
          nextLabel: 'Begin the Hunt',
          next: () => {
            TUT.clear();
            const pouch = Object.values(me.tokens).slice(0, 5);
            DYA.play.startMatch({
              mode: 'hunt', format: 'Tutorial Hunt', skipSetup: true, noRecord: true,
              hunt: { enemies: [{ speciesId: 'tonguatjis', boss: true, rarity: 2 }] },
              terrain: 'forest', pouch,
              opponent: { name: 'The Wild' },
              onFinish: (res, iWon) => {
                if (iWon) {
                  me.pieces.push({ speciesId: 'tonguatjis', material: 'shell splinter', from: 'First Hunt', temperBias: 0, at: Date.now(), rarity: 0 });
                  me.tutorial.step = 7; save();
                  UI.show('menu');
                  setTimeout(TUT.run, 600);
                } else {
                  UI.show('menu');
                  setTimeout(() => spot({
                    step: 7, title: 'The Wild Won This Round',
                    body: 'It happens. The Guild has re-baited the trail — try the Hunt again.',
                    nextLabel: 'Retry the Hunt',
                    next: () => { TUT.run(); },
                  }), 600);
                }
              },
            });
          },
        });
        break;
      case 7:
        spot({
          step: 8, title: 'Crafting — Sing It True',
          body: 'You carry a <b>Tonguatjis shell splinter</b>. At the workbench: sing the creature’s song, pour NgAkara into the veins of the piece, set the trigger, and the Okid’Relic captures its TRUTH. You have 5 Okid and 5 NgAkara — plenty.',
          nextLabel: 'To the workbench',
          next: () => { TUT.clear(); UI.show('crafting'); setTimeout(() => spot({ step: 8, title: 'Craft it', body: 'Select the shell splinter on the left, then press <b>⚗ Craft Token</b>. Token 6 of 13.', pos: 'right:30px;top:120px' }), 500); },
        });
        break;
      case 8:
        spot({
          step: 9, title: 'The Market',
          body: 'Everything in Dya’Akara can be bought, sold, and haggled over. The Guild asks you to make two purchases to learn the ropes:<br>1. A <b>Guild stall token</b> (Guild page → Market, 100g)<br>2. Any token from <b>Elbergi Plass</b>’s famous stall (Market → Stalls)<br><br><i>Tokens 7 and 8 of 13.</i>',
          nextLabel: 'To the Guild market',
          next: () => { TUT.clear(); me.tutorial.market = { guild: false, elbergi: false }; save(); UI.show('guild'); },
        });
        break;
      case 9:
        spot({
          step: 10, title: 'Your First Match',
          body: 'The Guild has prepared a <b>rental pouch</b> — a full 25 tokens, on loan. Rentals cost gold normally (25% of market price each); this one is the Guild’s treat. Win by carrying <b>their Relic</b> to your hoard. Turn the wheel with <b>A/D</b> or the scroll wheel, ready the centered token with <b>SHIFT</b> (or click it), and trigger readied tokens with <b>SPACE</b> or by dragging onto the field.',
          nextLabel: 'Into the arena',
          next: () => {
            TUT.clear();
            const rng = new U.Rng(U.newSeed());
            const rentals = [];
            for (let i = 0; i < 20; i++) {
              const spid = rng.pick(SP.craftable);
              const tok = TK.mint({ speciesId: spid, rng, rarity: Math.min(SP.get(spid).rarity[1], rng.int(0, 2)) });
              tok.isRental = true;
              rentals.push(tok);
            }
            const pouch = Object.values(me.tokens).slice(0, 5).concat(rentals);
            DYA.play.startMatch({
              mode: 'standard', format: 'Tutorial Match', skipSetup: true,
              opponent: { name: 'Guild Instructor Vekka', aiSkill: 0.25, pouch: DYA.play.aiPouch(0.3) },
              pouch,
              onFinish: () => { me.tutorial.step = 10; save(); UI.show('menu'); setTimeout(TUT.run, 700); },
            });
          },
        });
        break;
      case 10: { /* post-match reward: 2 tokens — its own beat */
        const rng = new U.Rng(U.newSeed());
        [0, 1].forEach(() => G.addToken(TK.mint({ speciesId: rng.pick(SP.craftable), rng, owner: me.id, rarity: rng.int(0, 1) })));
        spot({
          step: 11, title: 'Post-Match Reward',
          body: 'Your first match pays out: <b>2 tokens</b>, courtesy of the Guild. Win or lose, the arena always teaches something.<br><br><i>Tokens 9–10 of 13.</i>',
          next: () => { me.tutorial.step = 11; save(); TUT.run(); },
        });
        break;
      }
      case 11: { /* level 0 → 1 milestone: 2 tokens — its own beat */
        if (me.level < 1) { me.level = 1; }
        const rng = new U.Rng(U.newSeed());
        [0, 1].forEach(() => G.addToken(TK.mint({ speciesId: rng.pick(SP.craftable), rng, owner: me.id, rarity: rng.int(0, 1) })));
        DYA.audio.play('levelup');
        spot({
          step: 12, title: 'Level 1 — Milestone Chest',
          body: 'The XP from your first match carries you to <b>Level 1</b>. Milestone chests at levels 3, 5, 10, 15, 20, and beyond bring gold, Okid, NgAkara — and bonus tokens, like these <b>two</b>.<br><br><i>Tokens 11–12 of 13.</i>',
          next: () => { me.tutorial.step = 12; save(); TUT.run(); },
        });
        break;
      }
      case 12: { /* achievement: first match complete — its own beat */
        G.grantAchievement('first_match');
        const rng = new U.Rng(U.newSeed());
        G.addToken(TK.mint({ speciesId: rng.pick(SP.craftable), rng, owner: me.id, rarity: 1 }));
        spot({
          step: 13, title: 'Achievement: First Steps on the Field',
          body: 'Achievements mark one-time feats and tiered grinds (win 10… 100… 1,000 matches). This one pays a token.<br><br><i>Token 13 of 13. Your starting collection is complete.</i>',
          next: () => { me.tutorial.step = 13; save(); TUT.run(); },
        });
        break;
      }
      case 13:
        spot({
          step: 14, title: 'Build Your Own Pouch',
          body: 'A pouch holds up to <b>25 tokens</b>. Open your Collection, name a pouch in the left sidebar, and add tokens with the <b>+</b> button or by dragging. Save it when you like it. Rentals can fill the gaps — up to 13 per pouch.',
          nextLabel: 'To the Collection',
          next: () => { TUT.clear(); me.tutorial.step = 13.5; save(); UI.show('collection'); },
        });
        break;
      case 14:
        spot({
          step: 15, title: 'One More Match — Your Pouch This Time',
          body: 'Play a full match with the pouch you built (rentals welcome). Win it, lose it — after this, the Mbaru Tatu is yours.',
          nextLabel: 'Final tutorial match',
          next: () => {
            TUT.clear();
            DYA.play.pickPouch(pouch => {
              DYA.play.startMatch({
                mode: 'standard', format: 'Tutorial Graduation', skipSetup: true,
                opponent: { name: 'Guild Instructor Vekka', aiSkill: 0.35, pouch: DYA.play.aiPouch(0.35) },
                pouch,
                onFinish: () => {
                  me.tutorial.done = true;
                  /* gold engineered backward: tutorial always ends at exactly 1,000 gold */
                  me.gold = 1000;
                  save();
                  UI.show('menu');
                  setTimeout(() => {
                    spot({
                      step: 15, title: 'Tutorial Complete',
                      body: 'Thirteen tokens. A thousand gold. Five Hunt roads and every market stall open to you.<br><br><b>Welcome to Dya’Akara, ' + U.esc(me.displayName) + '.</b>',
                      nextLabel: 'Begin',
                      next: () => { TUT.clear(); UI.refreshTopbar(); },
                    });
                  }, 800);
                },
              });
            });
          },
        });
        break;
    }
  };

  /* tutorial event hooks — every completion shows a Continue-gated beat (§14):
     the tutorial never yanks the player anywhere on a timer. */
  TUT.onEvent = function (ev, data) {
    const me = G.me;
    if (!me || me.tutorial.done) return;
    if (ev === 'huntDone' && me.tutorial.step === 6) { me.tutorial.step = 7; G.save(); setTimeout(TUT.run, 800); }
    if (ev === 'crafted' || (ev === 'guildStallBuy' || ev === 'marketBuy')) {
      if (me.tutorial.step === 8 && me.tutorial.market) {
        if (ev === 'guildStallBuy') me.tutorial.market.guild = true;
        if (ev === 'marketBuy') me.tutorial.market.elbergi = true;
        G.save();
        if (me.tutorial.market.guild && me.tutorial.market.elbergi) {
          spot({
            step: 9, title: 'The Market Knows You Now',
            body: 'Both purchases made — a Guild token and one of Elbergi’s. Haggling, offers, and your own stall come later; the ropes are learned.',
            next: () => { me.tutorial.step = 9; G.save(); TUT.clear(); UI.show('menu'); setTimeout(TUT.run, 400); },
          });
        } else if (me.tutorial.market.guild) {
          spot({ step: 9, title: 'One more purchase', body: 'Now visit <b>Market → Stalls</b> and buy any token from <b>Elbergi Plass</b>’s stall — Elbergi’s Fine Truths.', nextLabel: 'To the Market', next: () => { TUT.clear(); UI.show('market'); } });
        }
      }
    }
  };
  TUT.onScreen = function (name) {
    const me = G.me;
    /* defense in depth: whatever the exit path (logout, ban, a stray
       reload of 'login'/'menu' while G.me is unset), a leftover .tut-spot
       must never survive onto a screen it doesn't belong to — it can
       block clicks on real controls underneath it */
    if (!me || me.tutorial.done) { TUT.active = false; TUT.clear(); return; }
    if (!TUT.active) return;
    if (name === 'crafting' && me.tutorial.step === 7) {
      /* watch for craft completion, then wait for the player's Continue */
      const check = setInterval(() => {
        if (!G.me || G.me.tutorial.done) { clearInterval(check); return; }
        if (G.me.tokens && Object.values(G.me.tokens).some(t => t.speciesId === 'tonguatjis')) {
          clearInterval(check);
          spot({
            step: 8, title: 'Sung True',
            body: 'The Tonguatjis stands in your collection — shell, tongue, truth and all. <i>Token 6 of 13.</i>',
            next: () => { G.me.tutorial.step = 8; G.save(); TUT.clear(); UI.show('menu'); setTimeout(TUT.run, 400); },
          });
        }
      }, 1500);
    }
    if (name === 'collection' && me.tutorial.step === 13.5) {
      const check = setInterval(() => {
        if (!G.me || G.me.tutorial.done) { clearInterval(check); return; }
        if (G.me.pouches.length > 0) {
          clearInterval(check);
          spot({
            step: 14, title: 'Pouch Saved',
            body: 'A pouch of your own. You can build as many as you like and pick one before every match.',
            next: () => { G.me.tutorial.step = 14; G.save(); TUT.run(); },
          });
        }
      }, 1500);
    }
  };
})();
