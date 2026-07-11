/* ============================================================
   DYA'AKARA — ui/screens_play.js
   Play hub, match setup (vote system), the Match HUD (token
   wheel card strip, readied panel, spacebar/2–5 triggers, drag
   deploy, circular minimap), pause menu, win/loss screen,
   duel mode, replays, spectator mode.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, UI = DYA.ui, SP = DYA.species, EC = DYA.economy, TK = DYA.token, L = DYA.lore;

  const P = {};
  DYA.play = P;

  /* ---------- pouch helpers ---------- */
  P.pickPouch = function (cb, opts) {
    opts = opts || {};
    const me = G.me;
    const w = U.el('div', {});
    w.appendChild(U.el('h3', { cls: 'gold', text: opts.title || 'Choose your pouch' }));
    const m = UI.modal(w);
    const list = U.el('div', { cls: 'mt' });
    me.pouches.forEach(p => {
      const n = p.tokenIds.filter(id => me.tokens[id]).length;
      if (!n) return;
      const row = U.el('div', { cls: 'friend-row', style: 'cursor:pointer' });
      row.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + U.esc(p.name) + '</b> <span class="small muted">' + n + ' tokens</span>' }));
      row.onclick = () => { m.close(); cb(p.tokenIds.map(id => me.tokens[id]).filter(Boolean)); };
      list.appendChild(row);
    });
    /* auto-pouch: strongest 25 */
    const all = Object.values(me.tokens);
    if (all.length) {
      const row = U.el('div', { cls: 'friend-row', style: 'cursor:pointer' });
      row.appendChild(U.el('div', { cls: 'flex1', html: '<b>Quick pouch</b> <span class="small muted">auto-fill from your strongest ' + Math.min(25, all.length) + ' tokens</span>' }));
      row.onclick = () => {
        m.close();
        cb(all.sort((a, b) => b.rarity - a.rarity || b.stats.hp - a.stats.hp).slice(0, EC.POUCH_SIZE));
      };
      list.appendChild(row);
    } else {
      list.appendChild(U.el('p', { cls: 'muted', text: 'You own no tokens. The tutorial should have prevented this. See the Guild.' }));
    }
    /* rentals */
    const rentRow = U.el('div', { cls: 'friend-row', style: 'cursor:pointer' });
    rentRow.appendChild(U.el('div', { cls: 'flex1', html: '<b>Guild rentals</b> <span class="small muted">rent up to 13 tokens to fill a pouch (1 Nurtui — 5 hours)</span>' }));
    rentRow.onclick = () => { m.close(); P.rentalFlow(cb); };
    list.appendChild(rentRow);
    w.appendChild(list);
    w.appendChild(U.el('button', { cls: 'btn ghost mt', text: 'Cancel', onclick: () => m.close() }));
  };

  P.rentalFlow = function (cb) {
    const me = G.me;
    const stock = G.rentableStock();
    const chosen = new Set();
    const w = U.el('div', {});
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Guild Rental Stock' }));
    w.appendChild(U.el('p', { cls: 'small muted', text: 'Recently sold-in tokens and honest commons. 25% of market price each, −1% per extra token (floor 3%). Returns after 1 Nurtui.' }));
    const grid = U.el('div', { cls: 'grid mt', style: 'grid-template-columns:repeat(auto-fill,minmax(110px,1fr))' });
    const costLine = U.el('div', { cls: 'gold mt' });
    function updCost() {
      const toks = stock.filter(t => chosen.has(t.id));
      const rate = EC.rentalRate(Math.max(1, toks.length));
      let cost = 0; toks.forEach(t => cost += Math.round(G.marketAverage(t.speciesId, t.rarity) * rate));
      costLine.textContent = chosen.size + ' selected (max ' + EC.RENTAL.maxTokens + ') — total ' + U.fmt(cost) + 'g at ' + Math.round(rate * 100) + '% each';
    }
    stock.forEach(t => {
      const card = UI.tokenCard(t, { size: 70 });
      card.onclick = () => {
        if (chosen.has(t.id)) { chosen.delete(t.id); card.style.borderColor = ''; }
        else if (chosen.size < EC.RENTAL.maxTokens) { chosen.add(t.id); card.style.borderColor = 'var(--gold)'; }
        updCost();
      };
      grid.appendChild(card);
    });
    w.appendChild(grid); w.appendChild(costLine); updCost();
    const m = UI.modal(w);
    w.appendChild(U.el('button', {
      cls: 'btn primary mt', text: 'Rent selected', onclick: () => {
        const toks = stock.filter(t => chosen.has(t.id));
        if (!toks.length) return;
        const r = G.rentTokens(toks);
        if (r.err) { UI.alert('Cannot rent', r.err); return; }
        m.close(); UI.refreshTopbar();
        UI.toast({ title: 'Rented ' + toks.length + ' tokens', body: 'Cost ' + U.fmt(r.cost) + 'g. They return in 5 hours.', icon: '👝' });
        if (cb) P.pickPouch(cb);
        if (DYA.tutorial) DYA.tutorial.onEvent('rented');
      },
    }));
    w.appendChild(U.el('button', { cls: 'btn ghost mt', text: 'Close', onclick: () => m.close() }));
  };

  /* ================= PLAY HUB ================= */
  UI.register('play', {
    enter(root) {
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Play' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      head.appendChild(U.el('h2', { text: 'Play' }));
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body' });
      const grid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(290px,1fr));max-width:1000px;margin:0 auto' });

      function bigCard(icon, title, desc, fn) {
        const c = U.el('div', { cls: 'panel', style: 'cursor:pointer;text-align:center;padding:28px' });
        c.appendChild(U.el('div', { style: 'font-size:40px', text: icon }));
        c.appendChild(U.el('h3', { cls: 'gold mt', text: title }));
        c.appendChild(U.el('p', { cls: 'muted small mt', text: desc }));
        c.onclick = fn;
        c.onmouseenter = () => c.style.borderColor = 'var(--gold-dim)';
        c.onmouseleave = () => c.style.borderColor = '';
        return c;
      }
      grid.appendChild(bigCard('⚡', 'Quick Play — vs AI', 'Straight into a match against the machine. Pick a difficulty, pick a pouch, go.', () => P.quickPlayFlow()));
      grid.appendChild(bigCard('🌐', 'Matchmaking Queue', 'Casual queue — matched with the next player near your level. No rank implications.', () => P.matchmakingFlow()));
      grid.appendChild(bigCard('🤝', 'Private Match', 'Invite a friend, or share a room code.', () => P.privateFlow()));
      grid.appendChild(bigCard('⚔', 'Duel', '1 token vs 1 token. No resources, no Relic. Anything can be wagered. No Guild cut.', () => P.duelFlow()));
      grid.appendChild(bigCard('👁', 'Spectate', 'Watch a public match in progress. React freely; the players never see it.', () => P.spectateFlow()));
      grid.appendChild(bigCard('🎞', 'Replays', 'Your last 50 casual matches and every tournament match, stored as seed + inputs.', () => P.replayList()));
      body.appendChild(grid);

      /* ---- LIVE NOW: the Dya'kukull are playing right now ---- */
      const livePanel = U.el('div', { cls: 'panel mt', style: 'max-width:1000px;margin:18px auto 0' });
      body.appendChild(livePanel);
      function renderLive() {
        if (!livePanel.isConnected) return;
        const ln = G.liveNow();
        livePanel.innerHTML = '';
        livePanel.appendChild(U.el('div', { cls: 'flex' }, [
          U.el('h3', { cls: 'gold', text: 'Live Now' }),
          U.el('span', { cls: 'pill', html: '<span class="online-dot online" style="display:inline-block"></span> ' + ln.online.length + ' Dya\u2019kukull online' }),
        ]));
        /* challenges to YOU first */
        ln.challenges.forEach(ch => {
          const ai = G.world.accounts[ch.aiId];
          if (!ai) return;
          const row = U.el('div', { cls: 'friend-row', style: 'border-left:3px solid var(--gold)' });
          row.appendChild(U.el('div', { cls: 'flex1', html: '⚔ <b class="gold">' + U.esc(ai.displayName) + '</b> (Lv ' + ai.level + ') challenges you!<span class="small muted"> · expires in ' + Math.max(1, Math.ceil((ch.expiresAt - Date.now()) / 60000)) + 'm</span>' }));
          row.appendChild(U.el('button', {
            cls: 'btn small primary', text: 'Accept', onclick: () => {
              const opp = G.acceptChallenge(ch.id);
              if (!opp) { UI.toast({ title: 'Too late', body: 'The challenge expired.', icon: '⌛' }); renderLive(); return; }
              P.pickPouch(pouch => {
                P.startMatch({
                  mode: 'standard', ranked: false, format: 'Challenge Match',
                  opponent: { name: opp.displayName, accId: opp.id, aiSkill: G.aiSkill(opp), pouch: P.accountPouch(opp), simulatedHuman: true },
                  pouch,
                });
              });
            },
          }));
          livePanel.appendChild(row);
        });
        /* matches happening right now — watch any of them */
        if (!ln.matches.length) livePanel.appendChild(U.el('p', { cls: 'muted small', text: 'No matches on right now. Someone will start one soon — the Dya\u2019kukull are always playing.' }));
        ln.matches.forEach(mrec => {
          const a = G.world.accounts[mrec.aId], b = G.world.accounts[mrec.bId];
          if (!a || !b) return;
          const row = U.el('div', { cls: 'friend-row' });
          row.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + U.esc(a.displayName) + '</b> vs <b>' + U.esc(b.displayName) + '</b> <span class="small muted">· ' + mrec.format + ' · ends ~' + Math.max(1, Math.ceil((mrec.endsAt - Date.now()) / 60000)) + 'm</span>' }));
          row.appendChild(U.el('button', {
            cls: 'btn small', text: '👁 Watch', onclick: () => {
              G.markLiveWatched(mrec.id);
              const match = new DYA.match.Match({
                seed: mrec.seed, mode: 'standard',
                settings: { pulseInterval: 5, pulseAmount: 3, chaos: false },
                terrain: ['plains', 'forest', 'mountain', 'desert'][mrec.seed % 4],
                teams: [
                  { name: a.displayName, controller: 'ai', aiSkill: G.aiSkill(a), pouch: P.accountPouch(a), seal: a.seal },
                  { name: b.displayName, controller: 'ai', aiSkill: G.aiSkill(b), pouch: P.accountPouch(b), seal: b.seal },
                ],
              });
              UI.showWithLoading('spectate', { match, title: 'LIVE — ' + a.displayName + ' vs ' + b.displayName, liveId: mrec.id }, 900);
            },
          }));
          livePanel.appendChild(row);
        });
        /* recent results ticker */
        if (ln.recent.length) {
          livePanel.appendChild(U.el('div', { cls: 'small muted mt', html: 'Recent: ' + ln.recent.slice(0, 4).map(r => U.esc(r.winner) + ' beat ' + U.esc(r.winner === r.a ? r.b : r.a)).join(' · ') }));
        }
      }
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);
      renderLive(); /* after attach — the isConnected guard needs a live DOM */
      const liveIv = setInterval(() => { if (!livePanel.isConnected) { clearInterval(liveIv); return; } renderLive(); }, 6000);
    },
  });

  /* ---------- flows ---------- */
  const AI_NAMES = ['Litk', 'Mael', 'Vel', 'Skor', 'Skaar']; // AI difficulty tiers, named for the size scale
  const AI_SKILL = { Litk: 0.25, Mael: 0.45, Vel: 0.65, Skor: 0.9, Skaar: 1.15 };

  P.quickPlayFlow = function () {
    const w = U.el('div', {});
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Quick Play — choose difficulty' }));
    const m = UI.modal(w);
    const row = U.el('div', { cls: 'flex mt', style: 'flex-wrap:wrap' });
    AI_NAMES.forEach(d => {
      row.appendChild(U.el('button', {
        cls: 'btn', text: d, onclick: () => {
          m.close();
          P.pickPouch(pouch => {
            P.startMatch({
              mode: 'standard', ranked: false, format: 'Quick Play vs AI (' + d + ')',
              opponent: { name: 'Dya’kukull ' + d, aiSkill: G.aiSkill({ aiCfg: { matchSkill: AI_SKILL[d] } }), pouch: P.aiPouch(AI_SKILL[d]) },
              pouch, skipSetup: true, vsAI: true,
            });
          });
        },
      }));
    });
    w.appendChild(row);
  };

  P.aiPouch = function (skill) {
    const rng = new U.Rng(U.newSeed());
    const pool = SP.craftable.filter(id => !SP.get(id).notCraftable);
    const pouch = [];
    for (let i = 0; i < EC.POUCH_SIZE; i++) {
      const maxRar = skill > 1 ? 6 : skill > 0.8 ? 5 : skill > 0.6 ? 4 : skill > 0.4 ? 3 : 2;
      const spid = rng.pick(pool);
      const sp = SP.get(spid);
      pouch.push(TK.mint({ speciesId: spid, rng, rarity: Math.min(rng.int(sp.rarity[0], sp.rarity[1]), maxRar) }));
    }
    return pouch;
  };

  P.matchmakingFlow = function () {
    P.pickPouch(pouch => {
      /* queue animation, then match with an AI player near level */
      const w = U.el('div', { cls: 'center' });
      w.appendChild(U.el('h3', { cls: 'gold', text: 'In queue…' }));
      const status = U.el('p', { cls: 'muted mt', text: 'Searching for an opponent near level ' + G.me.level + '.' });
      w.appendChild(status);
      const m = UI.modal(w, { sticky: true });
      const cancel = U.el('button', { cls: 'btn ghost mt', text: 'Leave queue', onclick: () => { clearTimeout(t); m.close(); } });
      w.appendChild(cancel);
      let ais = Object.values(G.world.accounts).filter(a => a.ai && Math.abs(a.level - G.me.level) < 12 && G.aiStatus(a.id) === 'online');
      if (!ais.length) ais = Object.values(G.world.accounts).filter(a => a.ai && Math.abs(a.level - G.me.level) < 12);
      const opp = ais.length ? ais[Math.floor(Math.random() * ais.length)] : Object.values(G.world.accounts).find(a => a.ai);
      const t = setTimeout(() => {
        status.textContent = 'Opponent found: ' + opp.displayName + ' (Lv ' + opp.level + ')';
        DYA.audio.play('notify');
        setTimeout(() => {
          m.close();
          P.startMatch({
            mode: 'standard', ranked: false, format: 'Casual Queue',
            opponent: { name: opp.displayName, accId: opp.id, aiSkill: G.aiSkill(opp), pouch: P.accountPouch(opp), simulatedHuman: true },
            pouch,
          });
        }, 1200);
      }, 1800 + Math.random() * 2500);
    });
  };

  P.accountPouch = function (acc) {
    const ids = acc.pouches[0] ? acc.pouches[0].tokenIds : Object.keys(acc.tokens).slice(0, 25);
    const toks = ids.map(id => acc.tokens[id]).filter(Boolean);
    while (toks.length < 15) toks.push(TK.mint({ speciesId: SP.craftable[Math.floor(Math.random() * SP.craftable.length)], rng: new U.Rng(U.newSeed()) }));
    return toks.slice(0, 25);
  };

  P.privateFlow = function () {
    /* with the online service configured, private matches are REAL
       cross-device rooms; otherwise the offline stand-in flow runs */
    if (DYA.online && DYA.online.enabled) { P.privateOnlineFlow(); return; }
    const w = U.el('div', {});
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Private Match — offline' }));
    const m = UI.modal(w);
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    w.appendChild(U.el('p', { cls: 'mt', html: 'You are in <b>offline mode</b> — rooms here are practice rooms against a Dya’kukull stand-in.<br><span class="small muted">To play a friend on another computer, set up online play first (it takes ~5 minutes, once).</span>' }));
    const row = U.el('div', { cls: 'flex mt' });
    row.appendChild(U.el('button', { cls: 'btn primary', text: '🌐 Set up online play', onclick: () => { m.close(); UI.onlineSetup(() => P.privateFlow()); } }));
    row.appendChild(U.el('button', {
      cls: 'btn', text: 'Practice room (vs AI)', onclick: () => {
        m.close();
        const friends = G.me.friends.map(id => G.world.accounts[id]).filter(Boolean);
        const opp = friends.length ? friends[Math.floor(Math.random() * friends.length)] : Object.values(G.world.accounts).find(a => a.ai);
        UI.toast({ title: 'Room ' + code, body: opp.displayName + ' joined your practice room.', icon: '🤝' });
        setTimeout(() => P.inviteFriendMatch(opp), 900);
      },
    }));
    row.appendChild(U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => m.close() }));
    w.appendChild(row);
  };

  /* ---------- REAL cross-device private matches ---------- */
  P.privateOnlineFlow = function (opts) {
    opts = opts || {};
    const me = G.me;
    const w = U.el('div', {});
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Private Match — Online' }));
    w.appendChild(U.el('p', { cls: 'small muted mt', html: (opts.hostFor ? 'Open a room and tell <b>' + U.esc(opts.hostFor) + '</b> the code. ' : '') + 'One player opens a room and shares the 5-letter code; the other joins with it. Both computers play the same live match.' }));
    const m = UI.modal(w);
    const joinInp = U.el('input', { cls: 'txt mt', placeholder: 'Friend’s room code…', maxlength: 5, style: 'text-transform:uppercase;letter-spacing:.2em' });
    const row = U.el('div', { cls: 'flex mt' });
    row.appendChild(U.el('button', { cls: 'btn primary', text: 'Open a room', onclick: () => { m.close(); P.pickPouch(pouch => hostRoom(pouch)); } }));
    row.appendChild(U.el('button', {
      cls: 'btn', text: 'Join room', onclick: () => {
        const code = joinInp.value.trim().toUpperCase();
        if (code.length !== 5) { UI.alert('Room code', 'Room codes are 5 letters — ask the host to read theirs off their screen.'); return; }
        m.close();
        P.pickPouch(pouch => joinRoom(code, pouch));
      },
    }));
    row.appendChild(U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => m.close() }));
    w.appendChild(joinInp);
    w.appendChild(row);

    function myProfile(pouch) {
      return {
        id: me.netId || me.id, name: me.displayName, level: me.level,
        avatarIdx: me.avatarIdx || 0, seal: me.seal || { avatarIdx: me.avatarIdx, patterns: [] },
        startRes: G.titleBuff('startRes') || 0,
        pouch: pouch.map(t => U.deepCopy(t)),
      };
    }

    /* ----- host side ----- */
    async function hostRoom(pouch) {
      const code = DYA.netplay.genRoomCode();
      const wait = U.el('div', { cls: 'center' });
      wait.appendChild(U.el('h3', { cls: 'gold', text: 'Opening room…' }));
      const codeEl = U.el('div', { cls: 'gold mt', style: 'font-size:34px;letter-spacing:.35em', text: code });
      const statusEl = U.el('p', { cls: 'muted mt', text: 'Connecting to the room service…' });
      wait.appendChild(codeEl); wait.appendChild(statusEl);
      const wm = UI.modal(wait, { sticky: true });
      let room = null, started = false, startPayload = null, closed = false;
      wait.appendChild(U.el('button', { cls: 'btn ghost mt', text: 'Close room', onclick: () => { closed = true; if (room) room.leave(); wm.close(); } }));
      try {
        room = await DYA.netplay.joinRoom(code, myProfile(pouch).id, {
          onMessage(msg) {
            if (!msg) return;
            if (P._netSession && P._netSession.route && (msg.t === 'frame' || msg.t === 'need' || msg.t === 'bye')) { P._netSession.route(msg); return; }
            if (msg.t === 'hello') {
              if (started) {
                /* same guest asking again (lost our start): resend */
                if (startPayload && msg.id === startPayload.guest.id) room.send(startPayload.wire);
                else room.send({ t: 'full' });
                return;
              }
              started = true;
              statusEl.textContent = msg.name + ' joined! Starting…';
              DYA.audio.play('notify');
              const host = myProfile(pouch);
              const info = {
                seed: U.newSeed(),
                terrain: ['plains', 'forest', 'mountain', 'desert'][Math.floor(Math.random() * 4)],
                settings: { pulseInterval: 8, pulseAmount: 2, chaos: false },
                host,
                guest: { id: msg.id, name: msg.name, level: msg.level, avatarIdx: msg.avatarIdx, seal: msg.seal, startRes: msg.startRes || 0, pouch: msg.pouch },
              };
              startPayload = { guest: info.guest, wire: { t: 'start', info: { seed: info.seed, terrain: info.terrain, settings: info.settings, host } } };
              room.send(startPayload.wire);
              setTimeout(() => { if (!closed) { wm.close(); launchNetMatch(room, 0, info, pouch); } }, 700);
            }
          },
          onPeerLeave() { if (P._netSession) P._netSession.peerLeft = Date.now(); },
        });
        statusEl.innerHTML = 'Room is open. Tell your friend the code — they join under<br><b>Play → Private Match → Join room</b>.';
      } catch (e) {
        wm.close();
        UI.alert('Could not open the room', e.message);
      }
    }

    /* ----- guest side ----- */
    async function joinRoom(code, pouch) {
      const wait = U.el('div', { cls: 'center' });
      wait.appendChild(U.el('h3', { cls: 'gold', text: 'Joining room ' + code + '…' }));
      const statusEl = U.el('p', { cls: 'muted mt', text: 'Connecting…' });
      wait.appendChild(statusEl);
      const wm = UI.modal(wait, { sticky: true });
      let room = null, launched = false, closed = false, helloTimer = null;
      wait.appendChild(U.el('button', { cls: 'btn ghost mt', text: 'Cancel', onclick: () => { closed = true; clearInterval(helloTimer); if (room) room.leave(); wm.close(); } }));
      const prof = myProfile(pouch);
      try {
        room = await DYA.netplay.joinRoom(code, prof.id, {
          onMessage(msg) {
            if (!msg) return;
            if (P._netSession && P._netSession.route && (msg.t === 'frame' || msg.t === 'need' || msg.t === 'bye')) { P._netSession.route(msg); return; }
            if (launched || closed) return;
            if (msg.t === 'start') {
              launched = true;
              clearInterval(helloTimer);
              const info = {
                seed: msg.info.seed, terrain: msg.info.terrain, settings: msg.info.settings,
                host: msg.info.host, guest: prof,
              };
              wm.close();
              launchNetMatch(room, 1, info, pouch);
            } else if (msg.t === 'full') {
              launched = true; clearInterval(helloTimer);
              wm.close(); room.leave();
              UI.alert('Room full', 'That room already has two players.');
            }
          },
          onPeerLeave() { if (P._netSession) P._netSession.peerLeft = Date.now(); },
        });
        statusEl.textContent = 'Connected — waiting for the host to answer…';
        const hello = { t: 'hello', id: prof.id, name: prof.name, level: prof.level, avatarIdx: prof.avatarIdx, seal: prof.seal, startRes: prof.startRes, pouch: prof.pouch };
        room.send(hello);
        let tries = 0;
        helloTimer = setInterval(() => {
          if (launched || closed) { clearInterval(helloTimer); return; }
          if (++tries > 6) {
            clearInterval(helloTimer);
            wm.close(); room.leave();
            UI.alert('Nobody home', 'No host answered on that code. Check the code and make sure their room is still open, then try again.');
            return;
          }
          room.send(hello);
        }, 2500);
      } catch (e) {
        wm.close();
        UI.alert('Could not join the room', e.message);
      }
    }
  };

  /* both clients build the SAME match (host = team 0, guest = team 1)
     and keep it in lockstep over the room channel */
  function launchNetMatch(room, myTeam, info, myPouch) {
    const match = new DYA.match.Match({
      seed: info.seed, mode: 'standard', terrain: info.terrain,
      settings: info.settings,
      teams: [
        { name: info.host.name, controller: 'human', pouch: (info.host.pouch || []).map(t => U.deepCopy(t)), startResources: info.host.startRes || 0, seal: info.host.seal },
        { name: info.guest.name, controller: 'human', pouch: (info.guest.pouch || []).map(t => U.deepCopy(t)), startResources: info.guest.startRes || 0, seal: info.guest.seal },
      ],
    });
    const net = new DYA.netplay.Lockstep(match, myTeam, payload => room.send(payload));
    net.room = room;
    P._netSession = net;
    /* the room handlers created at join time forward net traffic here */
    net.route = (msg) => {
      if (!msg) return;
      if (msg.t === 'frame' || msg.t === 'need') net.onRemote(msg);
      else if (msg.t === 'bye') net.peerLeft = Date.now();
    };
    const opp = myTeam === 0 ? info.guest : info.host;
    UI.showWithLoading('match', {
      match,
      cfg: {
        mode: 'standard', ranked: false, format: 'Private Match (Online)',
        myTeam, net,
        opponent: { name: opp.name, remoteHuman: true },
        pouch: myPouch,
      },
    }, 1300);
  }

  P.inviteFriendMatch = function (acc) {
    P.pickPouch(pouch => {
      P.startMatch({
        mode: 'standard', ranked: false, format: 'Private Match',
        opponent: { name: acc.displayName, accId: acc.id, aiSkill: G.aiSkill(acc), pouch: P.accountPouch(acc), simulatedHuman: true },
        pouch,
      });
    });
  };

  /* ================= MATCH SETUP (vote system) ================= */
  /* cfg: {mode, ranked, format, opponent:{name, aiSkill, pouch, simulatedHuman}, pouch, skipSetup, terrain, tournament, onFinish} */
  P.startMatch = function (cfg) {
    if (cfg.skipSetup) { launchMatch(cfg, { pulseInterval: 8, pulseAmount: 2, chaos: false }); return; }
    UI.show('matchSetup', cfg);
  };

  UI.register('matchSetup', {
    enter(root, cfg) {
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Match Setup' }));
      const wrap = U.el('div', { cls: 'setup-wrap' });

      /* left: your pouch */
      const left = U.el('div', { cls: 'setup-col panel' });
      left.appendChild(U.el('h3', { cls: 'gold mb', text: 'Your pouch — ' + G.me.displayName }));
      const pl = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(78px,1fr))' });
      cfg.pouch.forEach(t => pl.appendChild(UI.tokenCard(t, { size: 56, mode: 'minimal' })));
      left.appendChild(pl);
      wrap.appendChild(left);

      /* center: voting */
      const mid = U.el('div', { cls: 'setup-col panel', style: 'max-width:420px' });
      const baseTime = 30 + 15 * 0; // 30s base + 15s per additional opponent (1v1 → 30s), max 60
      let timeLeft = Math.min(60, baseTime);
      const timer = U.el('div', { cls: 'setup-timer', text: timeLeft });
      mid.appendChild(timer);
      mid.appendChild(U.el('p', { cls: 'center muted small mb', text: 'Votes lock when the timer ends. The middle ground wins.' }));
      const myVote = { interval: 8, amount: 2, mode: 'Standard' };
      const rngV = new U.Rng(U.newSeed());
      const oppVote = {
        interval: rngV.pick(EC.PULSE_INTERVALS),
        amount: rngV.pick(EC.PULSE_AMOUNTS),
        mode: rngV.chance(0.25) ? 'Chaos' : 'Standard',
      };
      function voteRow(label, opts, key, fmt) {
        const row = U.el('div', { cls: 'vote-row' });
        row.appendChild(U.el('div', { cls: 'muted small', text: label }));
        const wrap2 = U.el('div', { cls: 'vote-opts' });
        opts.forEach(o => {
          const b = U.el('div', { cls: 'vote-opt' + (myVote[key] === o ? ' mine' : '') + (oppVote[key] === o ? ' theirs' : ''), text: fmt ? fmt(o) : o });
          b.onclick = () => { myVote[key] = o; U.qsa('.vote-opt', wrap2).forEach((x, i) => x.classList.toggle('mine', opts[i] === o)); DYA.audio.play('click'); };
          wrap2.appendChild(b);
        });
        row.appendChild(wrap2);
        return row;
      }
      mid.appendChild(voteRow('PULSE INTERVAL — seconds between resource pulses', EC.PULSE_INTERVALS, 'interval', v => v + 's'));
      mid.appendChild(voteRow('RESOURCES PER PULSE', EC.PULSE_AMOUNTS, 'amount'));
      mid.appendChild(voteRow('MODE — Chaos randomizes every pulse (majority required)', ['Standard', 'Chaos'], 'mode'));
      mid.appendChild(U.el('p', { cls: 'small muted', html: '◆ = opponent’s current vote' }));
      /* terrain tokens: set by the organizer pre-match; random for casual (Part XV) */
      const terrRow = U.el('div', { cls: 'vote-row' });
      if (cfg.format === 'Private Match') {
        terrRow.appendChild(U.el('div', { cls: 'muted small', text: 'TERRAIN SET — you are the organizer' }));
        const tSel = U.el('select', { cls: 'txt mt', style: 'max-width:280px' });
        DYA.lore.TERRAIN_SETS.filter(t => t.basic).forEach(t => tSel.appendChild(U.el('option', { value: t.id, text: t.name })));
        tSel.onchange = () => { cfg.terrain = tSel.value; };
        cfg.terrain = cfg.terrain || 'plains';
        tSel.value = cfg.terrain;
        terrRow.appendChild(tSel);
        /* §15 terrain tokens — the launch pair, placed by the organizer during setup ONLY */
        terrRow.appendChild(U.el('div', { cls: 'muted small mt', text: 'TERRAIN TOKENS — organizer places them before the match; none can be added later' }));
        cfg.terrainTokens = cfg.terrainTokens || [];
        const ttRow = U.el('div', { cls: 'flex', style: 'flex-wrap:wrap' });
        [['forest', '🌲 Forest patch', 'Ular creatures fight happier inside; the canopy blocks some ranged targeting.'],
         ['water', '💧 Water pool', 'Su creatures fight happier inside; water creatures pass freely, walkers wade slow or walk around.']].forEach(([id, label, tip]) => {
          const b = U.el('button', { cls: 'btn small' + (cfg.terrainTokens.includes(id) ? '' : ' ghost'), text: label, title: tip });
          b.onclick = () => {
            if (cfg.terrainTokens.includes(id)) cfg.terrainTokens = cfg.terrainTokens.filter(x => x !== id);
            else cfg.terrainTokens.push(id);
            b.classList.toggle('ghost', !cfg.terrainTokens.includes(id));
            DYA.audio.play('click');
          };
          ttRow.appendChild(b);
        });
        terrRow.appendChild(ttRow);
      } else {
        const tset = DYA.lore.TERRAIN_SETS.find(t => t.id === cfg.terrain);
        terrRow.appendChild(U.el('div', { cls: 'muted small', html: 'TERRAIN SET — ' + (tset ? '<span class="gold">' + tset.name + '</span> (set by the organizer)' : '<span class="gold">assigned randomly</span> for casual matches') }));
      }
      mid.appendChild(terrRow);
      const readyBtn = U.el('button', { cls: 'btn primary', style: 'width:100%', text: '✓ Ready — skip the wait' });
      mid.appendChild(readyBtn);
      wrap.appendChild(mid);

      /* right: opponent — with their pouch preview (§10) */
      const right = U.el('div', { cls: 'setup-col panel' });
      right.appendChild(U.el('h3', { cls: 'gold mb', text: 'Opponent — ' + cfg.opponent.name }));
      right.appendChild(U.el('p', { cls: 'muted small', text: cfg.ranked ? 'RANKED MATCH — Guild sealed.' : 'Casual match.' }));
      if (cfg.opponent.pouch && cfg.opponent.pouch.length) {
        const og = U.el('div', { cls: 'grid mt', style: 'grid-template-columns:repeat(auto-fill,minmax(78px,1fr))' });
        cfg.opponent.pouch.forEach(t => og.appendChild(UI.tokenCard(t, { size: 56, mode: 'minimal' })));
        right.appendChild(og);
      }
      const oppStatus = U.el('p', { cls: 'mt', text: 'Voting…' });
      right.appendChild(oppStatus);
      const chat = U.el('div', { cls: 'mt' });
      L.QUICK_CHAT.slice(0, 4).forEach(q => {
        chat.appendChild(U.el('button', { cls: 'btn small ghost', style: 'margin:2px', text: q, onclick: () => UI.toast({ title: G.me.displayName, body: q, icon: '💬' }) }));
      });
      right.appendChild(chat);
      wrap.appendChild(right);
      scr.appendChild(wrap);
      root.appendChild(scr);

      let oppReady = false, meReady = false, done = false;
      setTimeout(() => { oppReady = true; oppStatus.textContent = '✓ Ready.'; }, 2000 + Math.random() * 4000);
      const iv = setInterval(() => {
        if (done) return;
        timeLeft--;
        timer.textContent = timeLeft;
        if (timeLeft <= 5) timer.classList.add('urgent');
        if (timeLeft <= 0 || (meReady && oppReady)) { finish(); }
      }, 1000);
      readyBtn.onclick = () => { meReady = true; readyBtn.textContent = '✓ Waiting for opponent…'; if (oppReady) finish(); };
      function finish() {
        if (done) return; done = true;
        clearInterval(iv);
        /* middle ground auto-calculated from votes */
        const settings = {
          pulseInterval: Math.round((myVote.interval + oppVote.interval) / 2),
          pulseAmount: Math.round((myVote.amount + oppVote.amount) / 2),
          /* chaos requires majority — in 1v1 that means both */
          chaos: myVote.mode === 'Chaos' && oppVote.mode === 'Chaos',
        };
        launchMatch(cfg, settings);
      }
      this.leave = () => { done = true; clearInterval(iv); };
    },
  });

  /* ================= MATCH ================= */
  function launchMatch(cfg, settings) {
    const seed = U.newSeed();
    const terrain = cfg.terrain || ['plains', 'forest', 'mountain', 'desert'][Math.floor(Math.random() * 4)];
    const startRes = G.titleBuff('startRes') || 0;
    const match = new DYA.match.Match({
      seed, mode: cfg.mode || 'standard', terrain,
      settings,
      teams: [
        { name: G.me.displayName, accId: G.me.id, controller: 'human', pouch: cfg.pouch.map(t => U.deepCopy(t)), startResources: startRes, seal: G.me.seal || { avatarIdx: G.me.avatarIdx, patterns: [] } },
        cfg.mode === 'hunt'
          ? { name: 'The Wild', controller: 'wild', pouch: [] }
          : { name: cfg.opponent.name, accId: cfg.opponent.accId, controller: 'ai', aiSkill: cfg.opponent.aiSkill, pouch: (cfg.opponent.pouch || []).map(t => U.deepCopy(t)), seal: (cfg.opponent.accId && G.world.accounts[cfg.opponent.accId] && G.world.accounts[cfg.opponent.accId].seal) || { avatarIdx: 3, patterns: ['runes'] } },
      ],
      terrainTokens: cfg.terrainTokens,
      hunt: cfg.hunt,
    });
    UI.showWithLoading('match', { match, cfg }, 1300);
  }

  UI.register('match', {
    enter(root, params) {
      const M = params.match, cfg = params.cfg;
      DYA.currentMatch = M;
      const me = G.me;
      const scr = U.el('div', { cls: 'screen', id: 'matchScreen' });
      const canvas = U.el('canvas', { id: 'matchCanvas' });
      scr.appendChild(canvas);
      root.appendChild(scr);
      const renderer = new DYA.render.Renderer(canvas, M);
      DYA.audio.play('crowd');

      /* ---------- HUD scaffolding ---------- */
      /* top-left: pulse timer + relic status */
      const pulseBox = U.el('div', { cls: 'pulse-box' });
      const pulseLabel = U.el('div', { cls: 'small', html: '' });
      const pulseBar = U.el('div', { cls: 'pulse-bar' }, [U.el('div')]);
      const relicRow = U.el('div', { cls: 'relic-status' });
      pulseBox.appendChild(pulseLabel); pulseBox.appendChild(pulseBar); pulseBox.appendChild(relicRow);
      const tl = U.el('div', { cls: 'hud hud-topleft' }); tl.appendChild(pulseBox);
      scr.appendChild(tl);

      /* top-right: resources (collapsible) */
      const resBox = U.el('div', { cls: 'res-box', title: 'Click to collapse' });
      let resCollapsed = false;
      resBox.onclick = () => { resCollapsed = !resCollapsed; };
      const tr = U.el('div', { cls: 'hud hud-topright' }); tr.appendChild(resBox);
      scr.appendChild(tr);

      /* top-center: pause */
      const tc = U.el('div', { cls: 'hud hud-topcenter' });
      const pauseBtn = U.el('button', { cls: 'btn small', text: '❚❚ Pause' });
      tc.appendChild(pauseBtn);
      scr.appendChild(tc);

      /* event feed */
      const eventsEl = U.el('div', { cls: 'hud-events' });
      scr.appendChild(eventsEl);
      let lastEventIdx = 0;

      /* minimap bottom-left (circular) */
      const mmWrap = U.el('div', { cls: 'hud hud-minimap' });
      const mmCv = U.el('canvas', { width: 150, height: 150 });
      mmWrap.appendChild(mmCv);
      scr.appendChild(mmWrap);

      /* readied panel right */
      const readiedEl = U.el('div', { cls: 'hud hud-readied' });
      scr.appendChild(readiedEl);

      /* token wheel bottom: horizontal card strip, 9 wide */
      const wheelEl = U.el('div', { cls: 'hud hud-wheel' });
      scr.appendChild(wheelEl);
      let wheelIndex = 0;
      let tooltip = null;

      /* networked matches: the local player may be team 1 (the guest) */
      const MY = (cfg && cfg.myTeam) || 0;
      const NET = cfg && cfg.net;
      const T0 = M.teams[MY];
      const OPP = M.teams[1 - MY];
      const isDuel = M.mode === 'duel';
      if (isDuel) wheelEl.style.display = 'none';

      /* every local action goes through here: direct for local play,
         lockstep-scheduled + broadcast for networked play */
      function sendInput(input) {
        if (NET) NET.queueLocal(input);
        else M.queueInput(MY, input);
      }

      /* quick chat */
      const chatBtn = U.el('button', { cls: 'btn small ghost', text: '💬', style: 'position:absolute;bottom:130px;right:14px' });
      chatBtn.onclick = () => {
        const w = U.el('div', {});
        w.appendChild(U.el('h3', { cls: 'gold', text: 'Quick chat' }));
        const m = UI.modal(w);
        L.QUICK_CHAT.forEach(q => w.appendChild(U.el('button', { cls: 'btn small ghost q-opt', text: q, onclick: () => { sendInput({ type: 'chat', msg: q }); m.close(); } })));
      };
      scr.appendChild(chatBtn);

      /* ---------- input state ---------- */
      let mouseWorld = { x: 800, y: 500 };
      let draggingSlot = null;
      let fieldTip = null;
      canvas.addEventListener('mousemove', e => {
        const r = canvas.getBoundingClientRect();
        mouseWorld = renderer.toWorld(e.clientX - r.left, e.clientY - r.top);
        /* §11: hover any creature → tooltip with name, species, temperament, status */
        const hov = M.creatures.find(c => !c.dead && U.dist(mouseWorld.x, mouseWorld.y, c.x, c.y) < Math.max(24, c.radius * 1.6));
        if (hov) {
          if (!fieldTip) { fieldTip = U.el('div', { cls: 'wheel-tip', style: 'pointer-events:none;bottom:auto;transform:none' }); scr.appendChild(fieldTip); }
          const card = TK.descriptionCard(hov.tok);
          fieldTip.innerHTML = '<div class="gold">' + U.esc(hov.tokName) + ' — ' + U.esc(hov.sp.name) + '</div>' +
            '<div class="small muted">' + U.esc(card.temperament) + '</div>' +
            '<div class="small mt">HP ' + Math.max(0, Math.round(hov.hp)) + '/' + Math.round(hov.maxHp) +
            ' · ' + hov.state + (hov.carryingRelic ? ' · <span class="gold">CARRYING RELIC</span>' : '') +
            (hov.stunnedUntil > M.tick ? ' · stunned' : '') +
            (hov.headCount > 1 ? ' · heads ' + hov.headsLeft + '/' + hov.headCount : '') +
            (M.teams[hov.team] ? ' · ' + U.esc(M.teams[hov.team].name) : '') + '</div>';
          fieldTip.style.left = Math.min(window.innerWidth - 360, e.clientX + 18) + 'px';
          fieldTip.style.top = Math.max(8, e.clientY - 30) + 'px';
        } else if (fieldTip) { fieldTip.remove(); fieldTip = null; }
      });
      canvas.addEventListener('click', e => {
        if (selectedSlot != null) { triggerSlot(selectedSlot, mouseWorld.x, mouseWorld.y); selectedSlot = null; }
      });
      canvas.addEventListener('dragover', e => e.preventDefault());
      canvas.addEventListener('drop', e => {
        e.preventDefault();
        const slot = parseInt(e.dataTransfer.getData('slot'));
        if (!isNaN(slot)) {
          const r = canvas.getBoundingClientRect();
          const w = renderer.toWorld(e.clientX - r.left, e.clientY - r.top);
          triggerSlot(slot, w.x, w.y);
        }
      });
      let selectedSlot = null;

      function triggerSlot(slot, x, y) {
        const entry = T0.readied[slot];
        if (!entry) return;
        if (entry.readiedAtPulse === M.pulseIndex) { UI.toast({ title: 'Not yet', body: 'A token cannot trigger in the pulse it was readied. Next pulse.', icon: '⏳' }); DYA.audio.play('deny'); return; }
        sendInput({ type: 'trigger', slot, x, y });
        DYA.audio.play('deploy');
        if (DYA.tutorial) DYA.tutorial.onEvent('deployed');
      }

      /* wheel scroll cycles through pouch — A/D (or W/S) do the same */
      function moveWheel(dir) {
        const avail = T0.pouch.filter(en => en.state === 'pouch');
        if (!avail.length) return;
        wheelIndex = (wheelIndex + dir + avail.length) % avail.length;
        renderWheel();
      }
      wheelEl.addEventListener('wheel', e => {
        e.preventDefault();
        moveWheel(e.deltaY > 0 ? 1 : -1);
      }, { passive: false });

      /* additional cost (§1): a fallen token costs +1 per prior defeat, paid
         from any one resource — the player picks it here (click or keys 1–4) */
      let costPicker = null;
      function openCostPicker(en, costV, tax, doReady) {
        const w2 = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'Additional cost +' + tax }),
          U.el('p', { cls: 'small muted mt', text: en.tok.name + ' has fallen ' + tax + ' time' + (tax > 1 ? 's' : '') + ' — replaying it costs ' + tax + ' extra. Choose the resource that pays it, or press 1–4.' })]);
        const m2 = UI.modal(w2);
        function cleanup() { document.removeEventListener('keydown', keyH, true); costPicker = null; }
        function close() { cleanup(); m2.close(); }
        const pick = (el) => {
          if (T0.resources[el] < (costV[el] || 0) + tax) { DYA.audio.play('deny'); return; }
          close(); doReady(el);
        };
        const row2 = U.el('div', { cls: 'flex mt', style: 'flex-wrap:wrap' });
        SP.ELEMENTS.forEach((el, n) => {
          const can = T0.resources[el] >= (costV[el] || 0) + tax;
          row2.appendChild(U.el('button', {
            cls: 'btn small' + (can ? '' : ' ghost'),
            html: '<span class="keybind" style="padding:0 6px;margin-right:6px;font-size:11px">' + (n + 1) + '</span><span class="el-' + el + '">' + el + '</span> (' + Math.floor(T0.resources[el]) + ')',
            onclick: () => pick(el),
          }));
        });
        w2.appendChild(row2);
        /* while the picker is up it owns the keyboard: 1–4 pick, Esc cancels,
           everything else is swallowed so trigger slots can't misfire */
        const keyH = (e) => {
          if (!m2.el.isConnected) { cleanup(); return; }
          e.stopPropagation();
          const n = parseInt(e.key, 10);
          if (n >= 1 && n <= 4) { e.preventDefault(); pick(SP.ELEMENTS[n - 1]); }
          else if (e.key === 'Escape') { e.preventDefault(); close(); }
        };
        document.addEventListener('keydown', keyH, true);
        costPicker = { close };
      }

      /* shared ready flow: wheel-card click and the Shift hotkey both land here */
      function tryReady(en, i, card) {
        const costV = TK.costVec(en.tok);
        const tax = en.deaths || 0;
        const afford = SP.ELEMENTS.every(el => (T0.resources[el] || 0) >= (costV[el] || 0)) &&
          (tax === 0 || SP.ELEMENTS.some(el => (T0.resources[el] || 0) >= (costV[el] || 0) + tax));
        if (!afford) { DYA.audio.play('deny'); renderWheel(); return; }
        if (T0.readied.length >= 5) { UI.toast({ title: 'Ready panel full', body: 'Five readied tokens is the limit.', icon: '⚠' }); renderWheel(); return; }
        const doReady = (taxRes) => {
          sendInput({ type: 'ready', pouchIdx: i, taxRes });
          DYA.audio.play('ready');
          if (DYA.tutorial) DYA.tutorial.onEvent('readied');
          if (card) animateReadyFly(card);
          setTimeout(renderWheel, 80);
        };
        if (tax > 0) openCostPicker(en, costV, tax, doReady);
        else doReady(null);
      }

      /* Shift (either side) readies whatever card sits centered on the wheel */
      function readyCentered() {
        const avail = T0.pouch.map((en, i) => ({ en, i })).filter(x => x.en.state === 'pouch');
        if (!avail.length) return;
        const pos = ((wheelIndex % avail.length) + avail.length) % avail.length;
        const { en, i } = avail[pos];
        tryReady(en, i, wheelEl.querySelector('.wheel-card.center'));
      }

      function renderWheel() {
        wheelEl.innerHTML = '';
        if (tooltip) { tooltip.remove(); tooltip = null; }
        const avail = T0.pouch.map((en, i) => ({ en, i })).filter(x => x.en.state === 'pouch');
        if (!avail.length) { wheelEl.appendChild(U.el('div', { cls: 'muted small', style: 'padding:12px', text: 'Pouch empty' })); return; }
        wheelIndex = wheelIndex % avail.length;
        /* 9 cards: center ±4 */
        for (let k = -4; k <= 4; k++) {
          const idx = ((wheelIndex + k) % avail.length + avail.length) % avail.length;
          if (avail.length <= Math.abs(k)) continue;
          const { en, i } = avail[idx];
          const costV = TK.costVec(en.tok);
          const tax = en.deaths || 0; /* additional cost: +1 per prior defeat, any one resource */
          const afford = SP.ELEMENTS.every(el => (T0.resources[el] || 0) >= (costV[el] || 0)) &&
            (tax === 0 || SP.ELEMENTS.some(el => (T0.resources[el] || 0) >= (costV[el] || 0) + tax));
          const card = U.el('div', { cls: 'wheel-card' + (k === 0 ? ' center' : Math.abs(k) >= 3 ? ' fade3' : Math.abs(k) === 2 ? ' fade2' : ' fade1') });
          card.appendChild(UI.tokenArt(en.tok.speciesId, k === 0 ? 62 : 46));
          card.appendChild(U.el('div', { cls: 'wc-name', text: en.tok.name }));
          card.appendChild(U.el('div', { cls: 'wc-meta', html: SP.ELEMENTS.filter(el => costV[el] > 0).map(el => '<span class="el-' + el + '">' + costV[el] + '</span>').join('·') + (tax ? ' <span style="color:var(--red)">+' + tax + '</span>' : '') }));
          card.appendChild(U.el('div', { cls: 'wc-dot ' + (afford ? 'ok' : 'no') }));
          card.onmouseenter = () => {
            const sp = SP.get(en.tok.speciesId);
            tooltip = U.el('div', { cls: 'wheel-tip' });
            tooltip.appendChild(U.el('div', { cls: 'gold', text: en.tok.name + ' — ' + sp.name }));
            tooltip.appendChild(U.el('div', { cls: 'small muted', text: TK.descriptionCard(en.tok).temperament }));
            tooltip.appendChild(U.el('div', { cls: 'small mt', text: sp.special || sp.desc }));
            scr.appendChild(tooltip);
          };
          card.onmouseleave = () => { if (tooltip) { tooltip.remove(); tooltip = null; } };
          card.onclick = () => {
            wheelIndex = idx; // click centers it…
            tryReady(en, i, card);
          };
          wheelEl.appendChild(card);
        }
      }

      /* §12: animate the card sliding from the wheel to the readied board */
      function animateReadyFly(card) {
        try {
          const r0 = card.getBoundingClientRect();
          const target = readiedEl.getBoundingClientRect();
          const ghost = card.cloneNode(true);
          ghost.style.cssText = 'position:fixed;left:' + r0.left + 'px;top:' + r0.top + 'px;width:' + r0.width + 'px;z-index:120;transition:all .55s cubic-bezier(.4,.1,.3,1);pointer-events:none;opacity:.95';
          document.body.appendChild(ghost);
          requestAnimationFrame(() => {
            ghost.style.left = (target.right - r0.width * 0.7) + 'px';
            ghost.style.top = (target.top + 40) + 'px';
            ghost.style.transform = 'scale(.55)';
            ghost.style.opacity = '0.2';
          });
          setTimeout(() => ghost.remove(), 600);
        } catch (e) { }
      }

      function renderReadied() {
        readiedEl.innerHTML = '';
        readiedEl.appendChild(U.el('div', { cls: 'small muted center', text: isDuel ? '' : 'READIED' }));
        const keys = ['SPACE', '2', '3', '4', '5'];
        T0.readied.forEach((en, slot) => {
          const cool = en.readiedAtPulse === M.pulseIndex;
          const el = U.el('div', { cls: 'readied-slot' + (cool ? ' cooldown' : ''), draggable: 'true' });
          el.appendChild(U.el('div', { cls: 'rs-key', text: keys[slot] }));
          el.appendChild(UI.tokenArt(en.tok.speciesId, 54));
          el.appendChild(U.el('div', { cls: 'small', style: 'font-size:10px', text: en.tok.name }));
          if (cool) el.appendChild(U.el('div', { cls: 'small muted', style: 'font-size:9px', text: 'next pulse' }));
          el.addEventListener('dragstart', e => { e.dataTransfer.setData('slot', slot); });
          el.onclick = () => { selectedSlot = slot; UI.toast({ title: 'Placing ' + en.tok.name, body: 'Click the field to trigger it there.', icon: '🎯' }); };
          readiedEl.appendChild(el);
        });
      }

      /* keyboard: space + 2–5 trigger readied at cursor (rebindable);
         Shift readies the centered wheel card; A/D or W/S turn the wheel */
      const keyHandler = (e) => {
        if (M.over) return;
        if (costPicker) return; /* additional-cost picker owns the keyboard */
        const c = me.settings.controls;
        if (e.key === c.pause || e.key === 'Escape') { e.preventDefault(); togglePause(); return; }
        const slotKeys = [c.trigger1, c.trigger2, c.trigger3, c.trigger4, c.trigger5];
        const slot = slotKeys.indexOf(e.key);
        if (slot >= 0) {
          e.preventDefault();
          triggerSlot(slot, mouseWorld.x, mouseWorld.y);
          return;
        }
        if (isDuel) return;
        const k = e.key.toLowerCase();
        if (k === 'a' || k === 'w' || e.key === 'ArrowLeft') { e.preventDefault(); moveWheel(-1); return; }
        if (k === 'd' || k === 's' || e.key === 'ArrowRight') { e.preventDefault(); moveWheel(1); return; }
        if (e.key === 'Shift' && !e.repeat) { e.preventDefault(); readyCentered(); }
      };
      document.addEventListener('keydown', keyHandler);

      /* ---------- pause ---------- */
      let pauseOverlay = null;
      const vsRealPlayer = cfg.opponent && (cfg.opponent.simulatedHuman || cfg.opponent.remoteHuman);
      function togglePause() {
        if (pauseOverlay) { closePause(); return; }
        if (!vsRealPlayer) M.paused = true; // vs AI: simulation actually pauses
        pauseOverlay = U.el('div', { cls: 'match-overlay' });
        pauseOverlay.appendChild(U.el('h1', { style: 'color:var(--ink)', text: 'PAUSED' }));
        if (vsRealPlayer) pauseOverlay.appendChild(U.el('p', { cls: 'muted small', text: 'Multiplayer pause is cosmetic — the match continues.' }));
        const info = U.el('p', { cls: 'muted mt center', html: 'vs <b>' + U.esc(OPP.name) + '</b> · ' + M.creatures.filter(cr => !cr.dead).length + ' creatures on field<br>Relic: ' + relicText() + ' · Pulse in ' + Math.max(0, M.nextPulseAt - M.time).toFixed(0) + 's' });
        pauseOverlay.appendChild(info);
        const col = U.el('div', { cls: 'menu-nav mt' });
        col.appendChild(U.el('button', { cls: 'btn', text: 'Resume', onclick: closePause }));
        col.appendChild(U.el('button', { cls: 'btn', text: 'Settings', onclick: () => { closePause(); const prev = { match: M, cfg }; UI.show('settings'); const back = U.qs('.back-arrow'); if (back) back.onclick = () => UI.show('match', prev); } }));
        col.appendChild(U.el('button', {
          cls: 'btn danger', text: 'Concede', onclick: () => {
            UI.confirm('Concede the match?', 'A concession is a loss. The Guild records everything.', () => { closePause(); sendInput({ type: 'concede' }); }, 'Concede');
          },
        }));
        col.appendChild(U.el('button', {
          cls: 'btn', text: 'Report player', onclick: () => {
            const w = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'Report ' + OPP.name })]);
            const sel = U.el('select', { cls: 'txt mt' });
            ['Unsporting behavior', 'Offensive name', 'Suspected cheating', 'Token rule violation', 'Other'].forEach(r => sel.appendChild(U.el('option', { text: r })));
            const note = U.el('textarea', { cls: 'txt mt', rows: 3, placeholder: 'Details (optional)' });
            w.appendChild(sel); w.appendChild(note);
            const m2 = UI.modal(w);
            w.appendChild(U.el('button', { cls: 'btn primary mt', text: 'Send to the Guild', onclick: () => { G.reportPlayer(cfg.opponent && cfg.opponent.accId, sel.value, note.value); m2.close(); UI.toast({ title: 'Report filed', icon: '⚖' }); } }));
          },
        }));
        col.appendChild(U.el('button', {
          cls: 'btn ghost', text: 'Back to menu', onclick: () => {
            UI.confirm('Leave the match?', 'Leaving counts as a concession.', () => { closePause(); sendInput({ type: 'concede' }); }, 'Leave & concede');
          },
        }));
        pauseOverlay.appendChild(col);
        scr.appendChild(pauseOverlay);
      }
      function closePause() { if (pauseOverlay) { pauseOverlay.remove(); pauseOverlay = null; } if (!NET) M.paused = false; }
      pauseBtn.onclick = togglePause;

      function relicText() {
        const mine = M.relics && M.relics.find(r => r.ownerTeam === MY);
        const theirs = M.relics && M.relics.find(r => r.ownerTeam === 1 - MY);
        if (!mine || mine.disabled) return '—';
        const mineTxt = mine.carrier != null ? '<span style="color:var(--red)">STOLEN!</span>' : (Math.abs(mine.x - mine.homeX) > 6 ? '<span style="color:var(--eldi)">DROPPED</span>' : '<span style="color:var(--green)">SAFE</span>');
        const theirsTxt = theirs.captured ? '<span style="color:var(--green)">CAPTURED</span>' : theirs.carrier != null ? '<span style="color:var(--green)">TAKEN</span>' : 'home';
        return 'Yours: ' + mineTxt + ' · Theirs: ' + theirsTxt;
      }

      /* ---------- simulated disconnect (rare, casual queue only — never
         for real networked opponents) ---------- */
      let disconnectFired = false;
      function maybeDisconnect() {
        if (disconnectFired || !cfg.opponent || !cfg.opponent.simulatedHuman || cfg.opponent.remoteHuman || M.mode !== 'standard') return;
        if (M.time > 120 && M.time < 121 && Math.random() < 0.04) {
          disconnectFired = true;
          M.paused = true;
          const ov = U.el('div', { cls: 'match-overlay' });
          ov.appendChild(U.el('h1', { style: 'color:var(--ink);font-size:34px', text: 'OPPONENT DISCONNECTED' }));
          const cd = U.el('p', { cls: 'muted mt', text: 'Grace period: 10s…' });
          ov.appendChild(cd);
          scr.appendChild(ov);
          let left = 10;
          const iv = setInterval(() => {
            left--;
            cd.textContent = 'Grace period: ' + left + 's…';
            if (left <= 0) {
              clearInterval(iv);
              cd.textContent = M.teams[1].name + ' did not return.';
              const row = U.el('div', { cls: 'flex mt' });
              row.appendChild(U.el('button', { cls: 'btn primary', text: 'Take the victory', onclick: () => { ov.remove(); M.finish(0, 'disconnect'); } }));
              row.appendChild(U.el('button', { cls: 'btn', text: 'Continue vs AI', onclick: () => { ov.remove(); M.paused = false; M.disconnectWin = true; } }));
              ov.appendChild(row);
            }
          }, 1000);
        }
      }

      /* ---------- networked-play status (stall pill, drop, desync) ---------- */
      let netPill = null, netLeftOverlay = null, desyncWarned = false;
      function netStatus() {
        if (!NET) return;
        /* waiting on the opponent's inputs */
        const stalled = NET.stalled();
        if (stalled && !netPill) {
          netPill = U.el('div', { cls: 'pill', style: 'position:absolute;top:54px;left:50%;transform:translateX(-50%);z-index:40', text: '⌛ waiting for ' + OPP.name + '…' });
          scr.appendChild(netPill);
        } else if (!stalled && netPill) { netPill.remove(); netPill = null; }
        /* opponent left the room, or went silent for 20s */
        const gone = NET.peerLeft || (NET.stallSince && Date.now() - NET.stallSince > 20000);
        if (gone && !netLeftOverlay && !M.over) {
          netLeftOverlay = U.el('div', { cls: 'match-overlay' });
          netLeftOverlay.appendChild(U.el('h1', { style: 'color:var(--ink);font-size:34px', text: 'OPPONENT DISCONNECTED' }));
          netLeftOverlay.appendChild(U.el('p', { cls: 'muted mt', text: OPP.name + ' stopped responding. You may claim the victory or keep waiting.' }));
          const row = U.el('div', { cls: 'flex mt' });
          row.appendChild(U.el('button', { cls: 'btn primary', text: 'Take the victory', onclick: () => { netLeftOverlay.remove(); netLeftOverlay = null; M.finish(MY, 'disconnect'); } }));
          row.appendChild(U.el('button', { cls: 'btn', text: 'Keep waiting', onclick: () => { netLeftOverlay.remove(); netLeftOverlay = null; NET.peerLeft = null; NET.stallSince = Date.now(); } }));
          netLeftOverlay.appendChild(row);
          scr.appendChild(netLeftOverlay);
        }
        if (NET.desynced && !desyncWarned) {
          desyncWarned = true;
          UI.toast({ title: 'Desync detected', body: 'The two machines disagree on the simulation. Results may differ — using the same browser on both computers keeps them identical.', icon: '⚠' });
        }
      }

      /* ---------- main loop ---------- */
      let last = performance.now(), raf, finished = false;
      let lastPulseIdx = 0, lastReadiedLen = -1, lastPouchLeft = -1;
      function frame(now) {
        if (!canvas.isConnected) { cancelAnimationFrame(raf); document.removeEventListener('keydown', keyHandler); if (NET && NET.room) NET.room.leave(); return; }
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (NET) NET.step(dt); else M.step(dt);
        renderer.draw(dt);
        renderer.drawMinimap(mmCv.getContext('2d'), 150);
        maybeDisconnect();
        netStatus();

        /* HUD updates */
        const esc = EC.escalationMult(M.time);
        const zf = M.zikFrac ? M.zikFrac() : 0;
        pulseLabel.innerHTML = '⏱ ' + U.fmtTime(M.time) + ' · Pulse ' + M.pulseIndex + (esc > 1 ? ' · <span class="gold">×' + esc + ' ESCALATION</span>' : '') + (M.settings.chaos ? ' · <span style="color:var(--red)">CHAOS</span>' : '') + (zf > 0 ? ' · <span style="color:var(--r6)">☄ SUNEAR’ZIKHRON</span>' : '');
        const frac = Math.max(0, 1 - (M.nextPulseAt - M.time) / (M.settings.pulseInterval || 8));
        pulseBar.firstChild.style.width = Math.min(100, frac * 100) + '%';
        relicRow.innerHTML = M.mode === 'hunt'
          ? '☠ Quarry: ' + (M.creatures.some(c => !c.dead && c.isBoss) ? '<b style="color:var(--red)">ALIVE</b>' : 'DOWN')
          : 'Relic: ' + relicText();
        const resHtml = SP.ELEMENTS.map(el => '<span class="el-' + el + '" style="margin-left:8px">◈' + Math.floor(T0.resources[el]) + '</span>').join('');
        resBox.innerHTML = resCollapsed
          ? '<div>' + resHtml + '</div>'
          : '<div style="font-size:19px">' + resHtml + '</div><div class="small muted">Fti · Su · Eldi · Ular</div>' +
            '<div class="small mt">Pulse: +' + (M.settings.chaos ? '?' : M.settings.pulseAmount * esc) + ' every ' + (M.settings.chaos ? '?' : M.settings.pulseInterval) + 's</div>' +
            (zf > 0
              ? '<div class="small" style="color:var(--r6)">☄ Storm overhead — McFlies glow, memories surge</div>'
              : '<div class="small muted">☄ Sunear’Zikhron in ' + Math.max(0, Math.ceil(240 - M.time % 300)) + 's</div>');

        if (M.pulseIndex !== lastPulseIdx || T0.readied.length !== lastReadiedLen) {
          lastPulseIdx = M.pulseIndex; lastReadiedLen = T0.readied.length;
          renderReadied(); renderWheel();
        }
        const pouchLeft = T0.pouch.filter(en => en.state === 'pouch').length;
        if (pouchLeft !== lastPouchLeft) { lastPouchLeft = pouchLeft; renderWheel(); }

        /* event feed */
        while (lastEventIdx < M.events.length) {
          const ev = M.events[lastEventIdx++];
          if (ev.kind === 'deny' && ev.team !== MY) continue;
          const el = U.el('div', { cls: 'hud-event', text: (ev.kind === 'chat' ? '💬 ' : '') + ev.msg });
          eventsEl.appendChild(el);
          setTimeout(() => el.remove(), 4200);
          if (eventsEl.children.length > 4) eventsEl.firstChild.remove();
        }

        if (M.over && !finished) { finished = true; onMatchEnd(); return; }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      renderWheel(); renderReadied();

      /* ---------- end of match ---------- */
      function onMatchEnd() {
        document.removeEventListener('keydown', keyHandler);
        if (NET && NET.room) { try { NET.room.leave(); } catch (e) { } P._netSession = null; }
        setTimeout(() => showWinLoss(), 900);
      }

      function showWinLoss() {
        const res = M.result;
        const iWon = res.winner === MY;
        const draw = res.winner === -1;
        const replay = M.serializeReplay();
        let rewards = null;
        if (!cfg.noRecord) {
          const usedNew = T0.stats.tokensPlayed.some(spid => Object.values(me.tokens).some(t => t.speciesId === spid && t.newlyCrafted));
          rewards = G.recordMatch({
            win: iWon && !draw, draw, ranked: cfg.ranked,
            opponentName: OPP.name, format: cfg.format || 'Casual',
            duration: res.duration,
            stats: { eliminations: T0.stats.eliminations, relicCaptured: T0.stats.relicCaptured, tokensPlayed: T0.stats.tokensPlayed, combos: T0.stats.combos },
            replay, tournament: cfg.tournament || null,
            usedNewToken: usedNew, fastRelic: iWon && res.duration < 300 && T0.stats.relicCaptured,
          });
          Object.values(me.tokens).forEach(t => delete t.newlyCrafted);
        }
        if (M.retributionFlag) G.grantAchievement('mcfly_witness');

        const ov = U.el('div', { cls: 'match-overlay', style: 'background:#000c' });
        if (iWon && !draw) {
          DYA.audio.play('victory');
          const parts = U.el('div', { cls: 'victory-particles' });
          for (let i = 0; i < 40; i++) {
            parts.appendChild(U.el('div', { cls: 'vp', style: 'left:' + Math.random() * 100 + '%;animation-duration:' + (2.5 + Math.random() * 3) + 's;animation-delay:' + Math.random() * 2 + 's;background:' + (Math.random() > 0.5 ? '#ffd76a' : '#fff3c8') }));
          }
          ov.appendChild(parts);
        } else if (!draw) DYA.audio.play('defeat');
        ov.appendChild(U.el('h1', { cls: draw ? 'draw' : iWon ? 'victory' : 'defeat', text: draw ? 'DRAW' : iWon ? 'VICTORY' : 'DEFEAT' }));
        const oppAcc = cfg.opponent && cfg.opponent.accId ? G.world.accounts[cfg.opponent.accId] : null;
        ov.appendChild(U.el('p', { cls: 'muted', text: 'vs ' + OPP.name + (oppAcc ? ' · rank ' + oppAcc.rank : '') + (cfg.ranked ? ' · Ranked' : '') }));
        if (rewards) {
          const rw = U.el('div', { cls: 'panel mt', style: 'min-width:340px;text-align:center' });
          rw.appendChild(U.el('div', { html: '⭐ <b class="gold">+' + rewards.xp + ' XP</b> &nbsp; 🪙 <b class="gold">+' + rewards.gold + ' gold</b>' }));
          /* NgAkara and Okid shown only if earned (Part XII) */
          if (rewards.salvage && (rewards.salvage.okid || rewards.salvage.ngakara)) {
            rw.appendChild(U.el('div', { cls: 'small gold', text: 'Field salvage: ' + (rewards.salvage.okid ? '⬡ +' + rewards.salvage.okid + ' Okid ' : '') + (rewards.salvage.ngakara ? '🧪 +' + rewards.salvage.ngakara + ' NgAkara' : '') }));
          }
          rewards.bonuses.forEach(([label, amt]) => rw.appendChild(U.el('div', { cls: 'small muted', text: label + ' +' + amt + ' XP' })));
          ov.appendChild(rw);
          (rewards.lvlEvents || []).forEach(ev => setTimeout(() => showLevelUp(ev), 700));
        }
        const stats = U.el('div', { cls: 'mt muted small center', html: 'Tokens played: ' + T0.stats.tokensPlayed.length + ' · Eliminations: ' + T0.stats.eliminations + '<br>' + (M.mode === 'standard' ? 'Relic: ' + (T0.stats.relicMethod || OPP.stats.relicMethod || (draw ? 'never captured' : '—')) + '<br>' : '') + 'Duration: ' + U.fmtDur(res.duration * 1000) });
        ov.appendChild(stats);
        const row = U.el('div', { cls: 'flex mt' });
        row.appendChild(U.el('button', { cls: 'btn primary', text: 'Play again', onclick: () => { ov.remove(); if (cfg.onFinish) { cfg.onFinish(res, iWon, draw); } else UI.show('play'); } }));
        const rematch = U.el('button', { cls: 'btn', text: 'Rematch' });
        if (NET) { rematch.disabled = true; rematch.title = 'Open a fresh room for a rematch'; }
        else if (cfg.opponent && !cfg.tournament) rematch.onclick = () => { ov.remove(); P.startMatch(Object.assign({}, cfg)); };
        else { rematch.disabled = true; rematch.title = 'Opponent left'; }
        row.appendChild(rematch);
        row.appendChild(U.el('button', { cls: 'btn ghost', text: 'Menu', onclick: () => { ov.remove(); if (cfg.onFinish) cfg.onFinish(res, iWon, draw, true); else UI.show('menu'); } }));
        ov.appendChild(row);
        scr.appendChild(ov);
        UI.refreshTopbar();
        if (DYA.tutorial) DYA.tutorial.onEvent('matchDone', { won: iWon && !draw });
      }
    },
  });

  function showLevelUp(ev) {
    DYA.audio.play('chest');
    const w = U.el('div', { cls: 'center' });
    w.appendChild(U.el('h2', { cls: 'gold', text: '✦ LEVEL ' + ev.level + ' ✦' }));
    w.appendChild(U.el('p', { cls: 'muted', text: EC.isMilestone(ev.level) ? 'MILESTONE CHEST' : 'Level chest' }));
    const box = U.el('div', { cls: 'mt', html: '🪙 +' + ev.gold + 'g' + ev.okid.map(o => '<br>⬡ +' + o.qty + ' ' + SP.RARITIES[o.rarity] + ' Okid').join('') + (ev.ngakara ? '<br>🧪 +' + ev.ngakara + ' NgAkara' : '') + (ev.cosmetic ? '<br>👑 ' + ev.cosmetic : '') + (ev.huntSlot ? '<br>🏹 +1 Hunt slot' : '') + (ev.avatar != null ? '<br>🎭 New portrait unlocked' : '') });
    w.appendChild(box);
    ev.tokens.forEach(t => {
      const tw = U.el('div', { cls: 'mt', style: 'display:inline-block;width:150px' });
      tw.appendChild(UI.tokenCard(t, { size: 100 }));
      w.appendChild(tw);
    });
    const m = UI.modal(w);
    w.appendChild(U.el('div', { cls: 'mt' }, [U.el('button', { cls: 'btn primary', text: 'Claim', onclick: () => { m.close(); UI.refreshTopbar(); } })]));
  }
  P.showLevelUp = showLevelUp;

  /* ================= DUELS ================= */
  P.duelFlow = function () {
    const me = G.me;
    const w = U.el('div', {});
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Duel — 1 token vs 1 token' }));
    w.appendChild(U.el('p', { cls: 'small muted mt', text: 'No resources, no pulse, no Relic. Fight to elimination. The only draw a duel allows is a RubberMcFly in play — on a draw nobody wins, every wager returns to its owner, and the reward is split evenly. Anything can be wagered; the Guild takes no cut. A wagered token lost is lost forever.' }));
    const modeSel = U.el('select', { cls: 'txt mt' });
    [['pick', 'Pick — choose your token'], ['random', 'Random — assigned from your collection'], ['blind', 'Blind Pick — both choose secretly']].forEach(([v, l]) => modeSel.appendChild(U.el('option', { value: v, text: l })));
    w.appendChild(modeSel);
    const wagerSel = U.el('select', { cls: 'txt mt' });
    [['none', 'No wager — honor duel'], ['gold', 'Wager gold'], ['ngakara', 'Wager NgAkara'], ['okid', 'Wager Okid'], ['token', 'Wager the dueling tokens themselves']].forEach(([v, l]) => wagerSel.appendChild(U.el('option', { value: v, text: l })));
    w.appendChild(wagerSel);
    const goldInp = U.el('input', { cls: 'txt mt', type: 'number', placeholder: 'Amount', style: 'display:none' });
    const okidRar = U.el('select', { cls: 'txt mt', style: 'display:none' });
    SP.RARITIES.forEach((r, i) => okidRar.appendChild(U.el('option', { value: i, text: r + ' Okid' })));
    wagerSel.onchange = () => {
      goldInp.style.display = (wagerSel.value === 'gold' || wagerSel.value === 'ngakara' || wagerSel.value === 'okid') ? '' : 'none';
      okidRar.style.display = wagerSel.value === 'okid' ? '' : 'none';
    };
    w.appendChild(goldInp); w.appendChild(okidRar);
    const m = UI.modal(w);
    w.appendChild(U.el('button', {
      cls: 'btn primary mt', text: 'Find opponent', onclick: () => {
        const toks = Object.values(me.tokens).filter(t => !t.frozen);
        if (!toks.length) { UI.alert('No tokens', 'You need at least one token to duel.'); return; }
        const wager = wagerSel.value;
        const goldAmt = parseInt(goldInp.value) || 0;
        const okidR = parseInt(okidRar.value) || 0;
        if (wager === 'gold' && (goldAmt <= 0 || goldAmt > me.gold)) { UI.alert('Bad wager', 'Wager gold you actually hold.'); return; }
        if (wager === 'ngakara' && (goldAmt <= 0 || goldAmt > me.ngakara)) { UI.alert('Bad wager', 'Wager NgAkara you actually hold.'); return; }
        if (wager === 'okid' && (goldAmt <= 0 || goldAmt > me.okid[okidR])) { UI.alert('Bad wager', 'Wager Okid you actually hold.'); return; }
        const mode = modeSel.value;
        if (mode === 'pick' || mode === 'blind') {
          m.close();
          pickTokenModal(toks, tok => beginDuel(tok, { mode, wager, goldAmt, okidR }));
        } else {
          /* Random assignment only ever draws from tokens that FIGHT —
             no fruit, no relic shavings, no Ju Fields. */
          const fighters = toks.filter(t => SP.canDuel(t.speciesId));
          if (!fighters.length) { UI.alert('No duel-fit tokens', 'Random assignment needs a token that actually fights — fruit, relics, and Ju Fields don’t duel. Use Pick mode if you insist on fielding one.'); return; }
          m.close();
          const tok = fighters[Math.floor(Math.random() * fighters.length)];
          beginDuel(tok, { mode, wager, goldAmt, okidR });
        }
      },
    }));
  };

  function pickTokenModal(toks, cb) {
    const w = U.el('div', {});
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Choose your duelist' }));
    const grid = U.el('div', { cls: 'grid mt', style: 'grid-template-columns:repeat(auto-fill,minmax(110px,1fr))' });
    const m = UI.modal(w);
    toks.forEach(t => {
      const card = UI.tokenCard(t, { size: 76 });
      card.onclick = () => { m.close(); cb(t); };
      grid.appendChild(card);
    });
    w.appendChild(grid);
  }

  P.startDuelVsAI = function (tok) { beginDuel(tok, { mode: 'pick', wager: 'none', goldAmt: 0 }); };

  function beginDuel(myTok, opts) {
    const me = G.me;
    const ais = Object.values(G.world.accounts).filter(a => a.ai);
    const opp = ais[Math.floor(Math.random() * ais.length)];
    /* the Dya'kukull never field a non-fighter in a duel */
    const oppToks = Object.values(opp.tokens).filter(t => SP.canDuel(t.speciesId));
    const oppTok = oppToks.length ? oppToks[Math.floor(Math.random() * oppToks.length)] : TK.mint({ speciesId: 'harkal', rng: new U.Rng(U.newSeed()) });
    if (opts.mode === 'blind') {
      UI.toast({ title: 'Blind pick', body: 'Tokens revealed: ' + myTok.name + ' vs ' + oppTok.name + '!', icon: '🎭' });
    }
    const seed = U.newSeed();
    const match = new DYA.match.Match({
      seed, mode: 'duel',
      teams: [
        { name: me.displayName, controller: 'human', pouch: [U.deepCopy(myTok)] },
        { name: opp.displayName, controller: 'ai', aiSkill: G.aiSkill(opp), pouch: [U.deepCopy(oppTok)] },
      ],
    });
    UI.showWithLoading('match', {
      match,
      cfg: {
        mode: 'duel', format: 'Duel (' + opts.mode + ')', opponent: { name: opp.displayName, accId: opp.id },
        onFinish: (res, iWon, draw, toMenu) => {
          /* a draw is nobody's win: every wager returns to its owner,
             both tokens go home, and neither duel stat moves */
          if (draw) {
            if (opts.wager !== 'none') UI.toast({ title: 'Draw — wagers returned', body: 'Nobody wins. Both sides take back exactly what they staked.', icon: '🤝' });
            G.save();
            UI.show(toMenu ? 'menu' : 'play');
            return;
          }
          /* duel stats + wagers */
          if (iWon) me.stats.duelsWon++; else me.stats.duelsLost++;
          if (iWon) G.grantAchievement('first_duel');
          if (opts.wager === 'gold') {
            G.addGold(iWon ? opts.goldAmt : -opts.goldAmt);
            UI.toast({ title: iWon ? 'Wager won!' : 'Wager lost', body: (iWon ? '+' : '−') + U.fmt(opts.goldAmt) + 'g', icon: '🪙' });
          } else if (opts.wager === 'ngakara') {
            me.ngakara = Math.max(0, me.ngakara + (iWon ? opts.goldAmt : -opts.goldAmt));
            UI.toast({ title: iWon ? 'Wager won!' : 'Wager lost', body: (iWon ? '+' : '−') + opts.goldAmt + ' NgAkara', icon: '🧪' });
          } else if (opts.wager === 'okid') {
            me.okid[opts.okidR] = Math.max(0, me.okid[opts.okidR] + (iWon ? opts.goldAmt : -opts.goldAmt));
            UI.toast({ title: iWon ? 'Wager won!' : 'Wager lost', body: (iWon ? '+' : '−') + opts.goldAmt + ' ' + SP.RARITIES[opts.okidR] + ' Okid', icon: '⬡' });
          } else if (opts.wager === 'token') {
            if (iWon) {
              const won = U.deepCopy(oppTok); won.id = U.uid('tok');
              won.tradeHistory.push({ at: Date.now(), from: opp.displayName, to: me.displayName, price: 0, wager: true });
              G.addToken(won);
              G.grantAchievement('duel_wager');
              UI.toast({ title: 'Token claimed!', body: oppTok.name + ' is yours by right of duel.', icon: '⚔' });
            } else {
              /* permanent loss — design rule */
              G.removeToken(myTok.id);
              delete opp.tokens[oppTok.id]; // symbolic transfer
              const lost = U.deepCopy(myTok); lost.id = U.uid('tok'); lost.ownerId = opp.id;
              opp.tokens[lost.id] = lost;
              UI.alert('Token forfeited', myTok.name + ' now belongs to ' + opp.displayName + '. The Guild does not retrieve wagered tokens.');
            }
          }
          G.save();
          UI.show(toMenu ? 'menu' : 'play');
        },
        noRecord: false,
      },
    }, 1000);
  }

  /* ================= REPLAYS ================= */
  P.replayList = function () {
    const me = G.me;
    const w = U.el('div', {});
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Replays' }));
    w.appendChild(U.el('p', { cls: 'small muted', text: 'Stored as seed + input log. Last 50 casual kept; tournament matches kept forever. Share links arrive in a future update.' }));
    const m = UI.modal(w);
    if (!me.replays.length) w.appendChild(U.el('p', { cls: 'muted mt', text: 'No replays yet.' }));
    me.replays.slice(0, 20).forEach(rep => {
      const row = U.el('div', { cls: 'friend-row' });
      row.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + U.esc(rep.teams.map(t => t.name).join(' vs ')) + '</b><br><span class="small muted">' + U.timeAgo(rep.at) + (rep.permanent ? ' · 🏆 tournament (permanent)' : '') + '</span>' }));
      row.appendChild(U.el('button', { cls: 'btn small', text: '▶ Watch', onclick: () => { m.close(); P.watchReplay(rep); } }));
      w.appendChild(row);
    });
    w.appendChild(U.el('button', { cls: 'btn ghost mt', text: 'Close', onclick: () => m.close() }));
  };

  P.watchReplay = function (rep) {
    const match = DYA.match.Match.fromReplay(U.deepCopy(rep));
    UI.showWithLoading('spectate', { match, title: 'REPLAY — ' + rep.teams.map(t => t.name).join(' vs ') }, 900);
  };

  /* ================= SPECTATE ================= */
  P.spectateFlow = function () {
    /* watch two Dya'kukull fight it out live */
    const ais = Object.values(G.world.accounts).filter(a => a.ai);
    const a = ais[Math.floor(Math.random() * ais.length)];
    let b = ais[Math.floor(Math.random() * ais.length)];
    if (b === a) b = ais[(ais.indexOf(a) + 1) % ais.length];
    const match = new DYA.match.Match({
      seed: U.newSeed(), mode: 'standard',
      settings: { pulseInterval: 5, pulseAmount: 3, chaos: false },
      terrain: ['plains', 'forest', 'mountain', 'desert'][Math.floor(Math.random() * 4)],
      teams: [
        { name: a.displayName, controller: 'ai', aiSkill: G.aiSkill(a), pouch: P.accountPouch(a) },
        { name: b.displayName, controller: 'ai', aiSkill: G.aiSkill(b), pouch: P.accountPouch(b) },
      ],
    });
    UI.showWithLoading('spectate', { match, title: 'LIVE — ' + a.displayName + ' vs ' + b.displayName }, 900);
  };

  UI.register('spectate', {
    enter(root, params) {
      const M = params.match;
      const scr = U.el('div', { cls: 'screen', id: 'matchScreen' });
      const canvas = U.el('canvas', { id: 'matchCanvas' });
      scr.appendChild(canvas);
      root.appendChild(scr);
      const renderer = new DYA.render.Renderer(canvas, M);
      const top = U.el('div', { cls: 'hud hud-topcenter flex' });
      top.appendChild(U.el('div', { cls: 'pill', text: params.title || 'SPECTATING' }));
      const speed = U.el('button', { cls: 'btn small', text: '×1' });
      let mult = 1;
      speed.onclick = () => { mult = mult === 1 ? 2 : mult === 2 ? 4 : 1; speed.textContent = '×' + mult; };
      top.appendChild(speed);
      top.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Leave', onclick: () => UI.show('play') }));
      scr.appendChild(top);
      /* spectator reactions — cosmetic only, never shown to players */
      const reactBar = U.el('div', { cls: 'hud', style: 'bottom:16px;left:50%;transform:translateX(-50%)' });
      L.SPECTATOR_REACTIONS.forEach(r => {
        reactBar.appendChild(U.el('button', {
          cls: 'btn small ghost', style: 'font-size:18px;margin:0 2px', text: r, onclick: (e) => {
            const f = U.el('div', { style: 'position:fixed;left:' + e.clientX + 'px;top:' + e.clientY + 'px;font-size:26px;pointer-events:none;transition:all 1.2s ease-out;z-index:100', text: r });
            document.body.appendChild(f);
            requestAnimationFrame(() => { f.style.transform = 'translateY(-90px)'; f.style.opacity = '0'; });
            setTimeout(() => f.remove(), 1300);
          },
        }));
      });
      scr.appendChild(reactBar);
      const mmWrap = U.el('div', { cls: 'hud hud-minimap', style: 'bottom:16px' });
      const mmCv = U.el('canvas', { width: 150, height: 150 });
      mmWrap.appendChild(mmCv);
      scr.appendChild(mmWrap);

      let last = performance.now(), raf;
      function frame(now) {
        if (!canvas.isConnected) { cancelAnimationFrame(raf); return; }
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        for (let i = 0; i < mult; i++) M.step(dt);
        renderer.draw(dt);
        renderer.drawMinimap(mmCv.getContext('2d'), 150);
        if (M.over) {
          /* a watched live match is decided by what actually happened */
          if (params.liveId && M.result.winner >= 0) G.resolveLiveMatch(params.liveId, M.result.winner);
          const ov = U.el('div', { cls: 'match-overlay' });
          ov.appendChild(U.el('h1', { style: 'color:var(--gold);font-size:34px', text: M.result.winner === -1 ? 'DRAW' : M.teams[M.result.winner].name + ' WINS' }));
          ov.appendChild(U.el('button', { cls: 'btn mt', text: 'Back', onclick: () => UI.show('play') }));
          scr.appendChild(ov);
          return;
        }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    },
  });
})();
