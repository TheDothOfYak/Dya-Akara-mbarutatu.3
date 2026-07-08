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
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);
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
              opponent: { name: 'Dya’kukull ' + d, aiSkill: AI_SKILL[d], pouch: P.aiPouch(AI_SKILL[d]) },
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
      const ais = Object.values(G.world.accounts).filter(a => a.ai && Math.abs(a.level - G.me.level) < 12);
      const opp = ais.length ? ais[Math.floor(Math.random() * ais.length)] : Object.values(G.world.accounts).find(a => a.ai);
      const t = setTimeout(() => {
        status.textContent = 'Opponent found: ' + opp.displayName + ' (Lv ' + opp.level + ')';
        DYA.audio.play('notify');
        setTimeout(() => {
          m.close();
          P.startMatch({
            mode: 'standard', ranked: false, format: 'Casual Queue',
            opponent: { name: opp.displayName, accId: opp.id, aiSkill: opp.aiCfg.matchSkill, pouch: P.accountPouch(opp), simulatedHuman: true },
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
    const w = U.el('div', {});
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Private Match' }));
    const m = UI.modal(w);
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    w.appendChild(U.el('p', { cls: 'mt', html: 'Room code: <b class="gold" style="font-size:22px;letter-spacing:.2em">' + code + '</b><br><span class="small muted">Share it — or invite from your friends list. (Real cross-device rooms arrive with the Firebase backend; here a friend joins in moments.)</span>' }));
    const joinInp = U.el('input', { cls: 'txt mt', placeholder: 'Or enter a friend’s code…' });
    w.appendChild(joinInp);
    const row = U.el('div', { cls: 'flex mt' });
    row.appendChild(U.el('button', {
      cls: 'btn primary', text: 'Open room', onclick: () => {
        m.close();
        const friends = G.me.friends.map(id => G.world.accounts[id]).filter(Boolean);
        const opp = friends.length ? friends[Math.floor(Math.random() * friends.length)] : Object.values(G.world.accounts).find(a => a.ai);
        UI.toast({ title: 'Room ' + code, body: opp.displayName + ' joined your room!', icon: '🤝' });
        setTimeout(() => P.inviteFriendMatch(opp), 900);
      },
    }));
    row.appendChild(U.el('button', {
      cls: 'btn', text: 'Join room', onclick: () => {
        if (joinInp.value.trim().length < 3) return;
        m.close();
        const opp = Object.values(G.world.accounts).find(a => a.ai);
        P.inviteFriendMatch(opp);
      },
    }));
    row.appendChild(U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => m.close() }));
    w.appendChild(row);
  };

  P.inviteFriendMatch = function (acc) {
    P.pickPouch(pouch => {
      P.startMatch({
        mode: 'standard', ranked: false, format: 'Private Match',
        opponent: { name: acc.displayName, accId: acc.id, aiSkill: (acc.aiCfg && acc.aiCfg.matchSkill) || 0.6, pouch: P.accountPouch(acc), simulatedHuman: true },
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
      const readyBtn = U.el('button', { cls: 'btn primary', style: 'width:100%', text: '✓ Ready — skip the wait' });
      mid.appendChild(readyBtn);
      wrap.appendChild(mid);

      /* right: opponent */
      const right = U.el('div', { cls: 'setup-col panel' });
      right.appendChild(U.el('h3', { cls: 'gold mb', text: 'Opponent — ' + cfg.opponent.name }));
      right.appendChild(U.el('p', { cls: 'muted small', text: cfg.ranked ? 'RANKED MATCH — Guild sealed.' : 'Casual match.' }));
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
        { name: G.me.displayName, accId: G.me.id, controller: 'human', pouch: cfg.pouch.map(t => U.deepCopy(t)), startResources: startRes },
        cfg.mode === 'hunt'
          ? { name: 'The Wild', controller: 'wild', pouch: [] }
          : { name: cfg.opponent.name, accId: cfg.opponent.accId, controller: 'ai', aiSkill: cfg.opponent.aiSkill, pouch: (cfg.opponent.pouch || []).map(t => U.deepCopy(t)) },
      ],
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

      const T0 = M.teams[0];
      const isDuel = M.mode === 'duel';
      if (isDuel) wheelEl.style.display = 'none';

      /* quick chat */
      const chatBtn = U.el('button', { cls: 'btn small ghost', text: '💬', style: 'position:absolute;bottom:130px;right:14px' });
      chatBtn.onclick = () => {
        const w = U.el('div', {});
        w.appendChild(U.el('h3', { cls: 'gold', text: 'Quick chat' }));
        const m = UI.modal(w);
        L.QUICK_CHAT.forEach(q => w.appendChild(U.el('button', { cls: 'btn small ghost q-opt', text: q, onclick: () => { M.queueInput(0, { type: 'chat', msg: q }); m.close(); } })));
      };
      scr.appendChild(chatBtn);

      /* ---------- input state ---------- */
      let mouseWorld = { x: 800, y: 500 };
      let draggingSlot = null;
      canvas.addEventListener('mousemove', e => {
        const r = canvas.getBoundingClientRect();
        mouseWorld = renderer.toWorld(e.clientX - r.left, e.clientY - r.top);
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
        M.queueInput(0, { type: 'trigger', slot, x, y });
        DYA.audio.play('deploy');
        if (DYA.tutorial) DYA.tutorial.onEvent('deployed');
      }

      /* wheel scroll cycles through pouch */
      wheelEl.addEventListener('wheel', e => {
        e.preventDefault();
        const avail = T0.pouch.filter(en => en.state === 'pouch');
        if (!avail.length) return;
        wheelIndex = (wheelIndex + (e.deltaY > 0 ? 1 : -1) + avail.length) % avail.length;
        renderWheel();
      }, { passive: false });

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
          const cost = SP.RARITY_COST[en.tok.rarity];
          const afford = T0.resources >= cost;
          const card = U.el('div', { cls: 'wheel-card' + (k === 0 ? ' center' : Math.abs(k) >= 3 ? ' fade3' : Math.abs(k) === 2 ? ' fade2' : ' fade1') });
          card.appendChild(UI.tokenArt(en.tok.speciesId, k === 0 ? 62 : 46));
          card.appendChild(U.el('div', { cls: 'wc-name', text: en.tok.name }));
          card.appendChild(U.el('div', { cls: 'wc-meta', html: SP.RARITIES[en.tok.rarity] + ' · ◈' + cost }));
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
            if (!afford) { DYA.audio.play('deny'); renderWheel(); return; }
            if (T0.readied.length >= 5) { UI.toast({ title: 'Ready panel full', body: 'Five readied tokens is the limit.', icon: '⚠' }); renderWheel(); return; }
            M.queueInput(0, { type: 'ready', pouchIdx: i }); // …and readies it
            DYA.audio.play('ready');
            if (DYA.tutorial) DYA.tutorial.onEvent('readied');
            setTimeout(renderWheel, 80);
          };
          wheelEl.appendChild(card);
        }
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

      /* keyboard: space + 2–5 trigger readied at cursor, per rebindable controls */
      const keyHandler = (e) => {
        if (M.over) return;
        const c = me.settings.controls;
        if (e.key === c.pause || e.key === 'Escape') { e.preventDefault(); togglePause(); return; }
        const slotKeys = [c.trigger1, c.trigger2, c.trigger3, c.trigger4, c.trigger5];
        const slot = slotKeys.indexOf(e.key);
        if (slot >= 0) {
          e.preventDefault();
          triggerSlot(slot, mouseWorld.x, mouseWorld.y);
        }
      };
      document.addEventListener('keydown', keyHandler);

      /* ---------- pause ---------- */
      let pauseOverlay = null;
      const vsRealPlayer = cfg.opponent && cfg.opponent.simulatedHuman;
      function togglePause() {
        if (pauseOverlay) { closePause(); return; }
        if (!vsRealPlayer) M.paused = true; // vs AI: simulation actually pauses
        pauseOverlay = U.el('div', { cls: 'match-overlay' });
        pauseOverlay.appendChild(U.el('h1', { style: 'color:var(--ink)', text: 'PAUSED' }));
        if (vsRealPlayer) pauseOverlay.appendChild(U.el('p', { cls: 'muted small', text: 'Multiplayer pause is cosmetic — the match continues.' }));
        const info = U.el('p', { cls: 'muted mt center', html: 'vs <b>' + U.esc(M.teams[1].name) + '</b> · ' + M.creatures.filter(cr => !cr.dead).length + ' creatures on field<br>Relic: ' + relicText() + ' · Pulse in ' + Math.max(0, M.nextPulseAt - M.time).toFixed(0) + 's' });
        pauseOverlay.appendChild(info);
        const col = U.el('div', { cls: 'menu-nav mt' });
        col.appendChild(U.el('button', { cls: 'btn', text: 'Resume', onclick: closePause }));
        col.appendChild(U.el('button', { cls: 'btn', text: 'Settings', onclick: () => { closePause(); const prev = { match: M, cfg }; UI.show('settings'); const back = U.qs('.back-arrow'); if (back) back.onclick = () => UI.show('match', prev); } }));
        col.appendChild(U.el('button', {
          cls: 'btn danger', text: 'Concede', onclick: () => {
            UI.confirm('Concede the match?', 'A concession is a loss. The Guild records everything.', () => { closePause(); M.queueInput(0, { type: 'concede' }); }, 'Concede');
          },
        }));
        col.appendChild(U.el('button', {
          cls: 'btn', text: 'Report player', onclick: () => {
            const w = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'Report ' + M.teams[1].name })]);
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
            UI.confirm('Leave the match?', 'Leaving counts as a concession.', () => { closePause(); M.queueInput(0, { type: 'concede' }); }, 'Leave & concede');
          },
        }));
        pauseOverlay.appendChild(col);
        scr.appendChild(pauseOverlay);
      }
      function closePause() { if (pauseOverlay) { pauseOverlay.remove(); pauseOverlay = null; } M.paused = false; }
      pauseBtn.onclick = togglePause;

      function relicText() {
        if (M.relic.disabled) return '—';
        if (M.relic.carrierTeam === 0) return '<span style="color:var(--green)">YOURS</span>';
        if (M.relic.carrierTeam === 1) return '<span style="color:var(--red)">THEIRS</span>';
        return 'Free';
      }

      /* ---------- simulated disconnect (rare, casual queue only) ---------- */
      let disconnectFired = false;
      function maybeDisconnect() {
        if (disconnectFired || !cfg.opponent || !cfg.opponent.simulatedHuman || M.mode !== 'standard') return;
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

      /* ---------- main loop ---------- */
      let last = performance.now(), raf, finished = false;
      let lastPulseIdx = 0, lastReadiedLen = -1, lastPouchLeft = -1;
      function frame(now) {
        if (!canvas.isConnected) { cancelAnimationFrame(raf); document.removeEventListener('keydown', keyHandler); return; }
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        M.step(dt);
        renderer.draw(dt);
        renderer.drawMinimap(mmCv.getContext('2d'), 150);
        maybeDisconnect();

        /* HUD updates */
        const esc = EC.escalationMult(M.time);
        pulseLabel.innerHTML = '⏱ ' + U.fmtTime(M.time) + ' · Pulse ' + M.pulseIndex + (esc > 1 ? ' · <span class="gold">×' + esc + ' ESCALATION</span>' : '') + (M.settings.chaos ? ' · <span style="color:var(--red)">CHAOS</span>' : '');
        const frac = Math.max(0, 1 - (M.nextPulseAt - M.time) / (M.settings.pulseInterval || 8));
        pulseBar.firstChild.style.width = Math.min(100, frac * 100) + '%';
        relicRow.innerHTML = M.mode === 'hunt'
          ? '☠ Quarry: ' + (M.creatures.some(c => !c.dead && c.isBoss) ? '<b style="color:var(--red)">ALIVE</b>' : 'DOWN')
          : 'Relic: ' + relicText();
        resBox.innerHTML = resCollapsed
          ? '<div class="rb-big">◈' + Math.floor(T0.resources) + '</div>'
          : '<div class="rb-big">◈ ' + Math.floor(T0.resources) + '</div><div class="small muted">resources</div>' +
            '<div class="small mt">Pulse: +' + (M.settings.chaos ? '?' : M.settings.pulseAmount * esc) + ' every ' + (M.settings.chaos ? '?' : M.settings.pulseInterval) + 's</div>' +
            '<div class="small muted">' + M.pulseElement + ' pulse</div>';

        if (M.pulseIndex !== lastPulseIdx || T0.readied.length !== lastReadiedLen) {
          lastPulseIdx = M.pulseIndex; lastReadiedLen = T0.readied.length;
          renderReadied(); renderWheel();
        }
        const pouchLeft = T0.pouch.filter(en => en.state === 'pouch').length;
        if (pouchLeft !== lastPouchLeft) { lastPouchLeft = pouchLeft; renderWheel(); }

        /* event feed */
        while (lastEventIdx < M.events.length) {
          const ev = M.events[lastEventIdx++];
          if (ev.kind === 'deny' && ev.team !== 0) continue;
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
        setTimeout(() => showWinLoss(), 900);
      }

      function showWinLoss() {
        const res = M.result;
        const iWon = res.winner === 0 || M.disconnectWin && res.winner === 0;
        const draw = res.winner === -1;
        const replay = M.serializeReplay();
        let rewards = null;
        if (!cfg.noRecord) {
          const usedNew = T0.stats.tokensPlayed.some(spid => Object.values(me.tokens).some(t => t.speciesId === spid && t.newlyCrafted));
          rewards = G.recordMatch({
            win: iWon && !draw, draw, ranked: cfg.ranked,
            opponentName: M.teams[1].name, format: cfg.format || 'Casual',
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
        ov.appendChild(U.el('p', { cls: 'muted', text: 'vs ' + M.teams[1].name + (oppAcc ? ' · rank ' + oppAcc.rank : '') + (cfg.ranked ? ' · Ranked' : '') }));
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
        const stats = U.el('div', { cls: 'mt muted small center', html: 'Tokens played: ' + T0.stats.tokensPlayed.length + ' · Eliminations: ' + T0.stats.eliminations + '<br>' + (M.mode === 'standard' ? 'Relic: ' + (T0.stats.relicMethod || M.teams[1].stats.relicMethod || (draw ? 'never captured' : '—')) + '<br>' : '') + 'Duration: ' + U.fmtDur(res.duration * 1000) });
        ov.appendChild(stats);
        const row = U.el('div', { cls: 'flex mt' });
        row.appendChild(U.el('button', { cls: 'btn primary', text: 'Play again', onclick: () => { ov.remove(); if (cfg.onFinish) { cfg.onFinish(res, iWon, draw); } else UI.show('play'); } }));
        const rematch = U.el('button', { cls: 'btn', text: 'Rematch' });
        if (cfg.opponent && !cfg.tournament) rematch.onclick = () => { ov.remove(); P.startMatch(Object.assign({}, cfg)); };
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
    w.appendChild(U.el('p', { cls: 'small muted mt', text: 'No resources, no pulse, no Relic. Fight to elimination — no draws. Anything can be wagered; the Guild takes no cut. A wagered token lost is lost forever.' }));
    const modeSel = U.el('select', { cls: 'txt mt' });
    [['pick', 'Pick — choose your token'], ['random', 'Random — assigned from your collection'], ['blind', 'Blind Pick — both choose secretly']].forEach(([v, l]) => modeSel.appendChild(U.el('option', { value: v, text: l })));
    w.appendChild(modeSel);
    const wagerSel = U.el('select', { cls: 'txt mt' });
    [['none', 'No wager — honor duel'], ['gold', 'Wager gold'], ['token', 'Wager the dueling tokens themselves']].forEach(([v, l]) => wagerSel.appendChild(U.el('option', { value: v, text: l })));
    w.appendChild(wagerSel);
    const goldInp = U.el('input', { cls: 'txt mt', type: 'number', placeholder: 'Gold wager', style: 'display:none' });
    wagerSel.onchange = () => goldInp.style.display = wagerSel.value === 'gold' ? '' : 'none';
    w.appendChild(goldInp);
    const m = UI.modal(w);
    w.appendChild(U.el('button', {
      cls: 'btn primary mt', text: 'Find opponent', onclick: () => {
        const toks = Object.values(me.tokens).filter(t => !t.frozen);
        if (!toks.length) { UI.alert('No tokens', 'You need at least one token to duel.'); return; }
        const wager = wagerSel.value;
        const goldAmt = parseInt(goldInp.value) || 0;
        if (wager === 'gold' && (goldAmt <= 0 || goldAmt > me.gold)) { UI.alert('Bad wager', 'Wager gold you actually hold.'); return; }
        m.close();
        const mode = modeSel.value;
        if (mode === 'pick' || mode === 'blind') {
          pickTokenModal(toks, tok => beginDuel(tok, { mode, wager, goldAmt }));
        } else {
          const tok = toks[Math.floor(Math.random() * toks.length)];
          beginDuel(tok, { mode, wager, goldAmt });
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
    const oppToks = Object.values(opp.tokens);
    const oppTok = oppToks.length ? oppToks[Math.floor(Math.random() * oppToks.length)] : TK.mint({ speciesId: 'harkal', rng: new U.Rng(U.newSeed()) });
    if (opts.mode === 'blind') {
      UI.toast({ title: 'Blind pick', body: 'Tokens revealed: ' + myTok.name + ' vs ' + oppTok.name + '!', icon: '🎭' });
    }
    const seed = U.newSeed();
    const match = new DYA.match.Match({
      seed, mode: 'duel',
      teams: [
        { name: me.displayName, controller: 'human', pouch: [U.deepCopy(myTok)] },
        { name: opp.displayName, controller: 'ai', aiSkill: opp.aiCfg.matchSkill, pouch: [U.deepCopy(oppTok)] },
      ],
    });
    UI.showWithLoading('match', {
      match,
      cfg: {
        mode: 'duel', format: 'Duel (' + opts.mode + ')', opponent: { name: opp.displayName, accId: opp.id },
        onFinish: (res, iWon, draw, toMenu) => {
          /* duel stats + wagers */
          if (iWon) me.stats.duelsWon++; else me.stats.duelsLost++;
          if (iWon) G.grantAchievement('first_duel');
          if (opts.wager === 'gold') {
            G.addGold(iWon ? opts.goldAmt : -opts.goldAmt);
            UI.toast({ title: iWon ? 'Wager won!' : 'Wager lost', body: (iWon ? '+' : '−') + U.fmt(opts.goldAmt) + 'g', icon: '🪙' });
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
        { name: a.displayName, controller: 'ai', aiSkill: a.aiCfg.matchSkill, pouch: P.accountPouch(a) },
        { name: b.displayName, controller: 'ai', aiSkill: b.aiCfg.matchSkill, pouch: P.accountPouch(b) },
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
