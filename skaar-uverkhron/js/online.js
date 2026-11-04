/* ============================================================
   SKAAR UVERKHRON — js/online.js
   Online games with friends on other devices.

   A room is a dya_config row 'su_room:<CODE>':
     { code, name, host, status: 'lobby'|'playing'|'over', seats:[{ kind,
       account, name, colorId, team, ai }], setup, state, seq, turnOf,
       timer (seconds a turn, or null), at }
   'su_rooms:<account id>' lists the rooms each player is in.

   Whoever's turn it is plays on their own device, then sends the
   whole game back with seq + 1 (the write only lands if nobody else
   wrote first). Everyone else watches the room. The host's device
   plays the computer players. Play live (everyone on at once) or
   take your turn whenever you like: it's the same room either way.

   Battles between people: the computer never fights for a person.
   'su_fight:<CODE>' holds the battle: the game as it was the moment
   it began, and the list of choices each person makes. Both devices
   run the same battle from the same state, so the dice agree; only
   the choices travel. The attacker waits until the defender comes.
   'su_chat:<CODE>:<time>' rows are the room's chat.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, RU = SU.rules;
  const U = SU.ui, el = U.el, btn = U.btn;
  const O = SU.online = {};
  const F = () => root.FLAKE;
  const POLL = 4000;

  const acc = () => SU.save.account();
  const ready = () => SU.save.cloudOk();
  const rest = (...a) => F().rest(...a);
  const now = () => new Date().toISOString();
  function code() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
  async function getRoom(c) { const r = await rest('GET', 'dya_config?select=value&key=eq.' + encodeURIComponent('su_room:' + c)); return r && r[0] ? r[0].value : null; }
  async function putRoom(room) { room.at = Date.now(); await rest('POST', 'dya_config?on_conflict=key', { key: 'su_room:' + room.code, value: room, updated_at: now() }, 'resolution=merge-duplicates'); }
  /* write only if nobody has written since we read seq */
  async function casRoom(room, oldSeq) {
    room.at = Date.now();
    const rows = await rest('PATCH', 'dya_config?key=eq.' + encodeURIComponent('su_room:' + room.code) + '&value->>seq=eq.' + oldSeq, { value: room, updated_at: now() }, 'return=representation');
    return rows && rows.length > 0;
  }
  async function myRooms() { const a = acc(); const r = await rest('GET', 'dya_config?select=value&key=eq.' + encodeURIComponent('su_rooms:' + a.id)); return (r && r[0] && r[0].value.codes) || []; }
  async function addMyRoom(c) { const a = acc(); const list = (await myRooms()).filter(x => x !== c); list.unshift(c); await rest('POST', 'dya_config?on_conflict=key', { key: 'su_rooms:' + a.id, value: { codes: list.slice(0, 30) }, updated_at: now() }, 'resolution=merge-duplicates'); }
  async function dropMyRoom(c) { const a = acc(); const list = (await myRooms()).filter(x => x !== c); await rest('POST', 'dya_config?on_conflict=key', { key: 'su_rooms:' + a.id, value: { codes: list }, updated_at: now() }, 'resolution=merge-duplicates'); }

  /* ======================= the online menu ======================= */
  O.menu = async function () {
    if (!ready()) { U.alert('Online games', 'Sign in to Flake Games first: online games are kept on your account.'); return; }
    const m = U.modal([el('h2', { text: 'Online games' }), el('p', { cls: 'muted', text: 'Looking…' })], { wide: true });
    let rooms = [];
    try { rooms = (await Promise.all((await myRooms()).map(c => getRoom(c).catch(() => null)))).filter(Boolean); } catch (e) { m.box.innerHTML = ''; m.box.appendChild(el('p', { cls: 'bad', text: 'Could not reach the server: ' + e.message })); return; }
    const me = acc();
    m.box.innerHTML = '';
    m.box.appendChild(el('h2', { text: 'Online games' }));
    m.box.appendChild(el('div', { cls: 'row' }, [btn('Make a new room', () => { m.close(); O.create(); }, 'primary'), btn('Join with a code', () => { m.close(); O.join(); })]));
    m.box.appendChild(el('h3', { text: 'Your rooms', style: { marginTop: '10px' } }));
    if (!rooms.length) m.box.appendChild(el('p', { cls: 'small muted', text: 'You are not in any online game yet.' }));
    rooms.forEach(r => {
      const mine = r.seats.findIndex(s => s.account === me.id);
      const turn = r.status === 'playing' && r.seats[r.turnOf] && r.seats[r.turnOf].account === me.id;
      m.box.appendChild(el('div', { cls: 'row frame' }, [el('div', { style: { flex: 1 } }, [el('b', { text: r.name + ' · ' + r.code }), el('div', { cls: 'small muted', text: (r.status === 'lobby' ? 'Waiting for players: ' : r.status === 'over' ? 'Finished · ' : (turn ? 'Your turn! · ' : 'Waiting for ' + (r.seats[r.turnOf] || {}).name + ' · ')) + r.seats.map(s => s.kind === 'ai' ? 'computer' : s.account ? s.name : 'open seat').join(', ') })]),
        turn ? el('span', { cls: 'gold', text: '★' }) : null,
        btn(r.status === 'lobby' ? 'Open' : 'Play', () => { m.close(); r.status === 'lobby' ? O.lobby(r.code) : O.enter(r.code); }, 'primary'),
        btn('Leave', () => U.confirm('Leave this room?', 'You can rejoin with the code while the game is waiting for players.', async () => { await dropMyRoom(r.code); if (r.status === 'lobby' && mine >= 0) { r.seats[mine].account = null; r.seats[mine].name = 'Open seat'; await putRoom(r); } m.close(); O.menu(); }))]));
    });
    m.box.appendChild(el('p', { cls: 'small muted', text: 'Play live with everyone at once, or take your turns whenever you like — rooms keep their place. When someone attacks you, you fight the battle yourself: the game waits for you to come.' }));
    m.box.appendChild(el('div', { cls: 'acts' }, [btn('Close', () => m.close())]));
  };

  O.create = function () {
    const me = acc();
    const room = { code: code(), name: me.name + '’s game', host: me.id, status: 'lobby', seq: 0, turnOf: 0, timer: null,
      setup: { size: 'M', spread: true, wild: 'normal' },
      seats: [{ kind: 'human', account: me.id, name: me.name, colorId: 'red', team: 0, faction: 'random' }, { kind: 'human', account: null, name: 'Open seat', colorId: 'blue', team: 0, faction: 'random' }] };
    const m = U.modal(el('div'), { wide: true });
    function render() {
      const b = m.box; b.innerHTML = '';
      b.appendChild(el('h2', { text: 'A new online room' }));
      const sel = (val, list, on) => el('select', { cls: 'inp', onchange: e => { on(e.target.value); render(); } }, list.map(([v, n]) => el('option', { value: v, selected: String(v) === String(val) ? 'selected' : null }, n)));
      b.appendChild(el('table', { cls: 'setup' }, [
        el('tr', {}, [el('td', { text: 'Name' }), el('td', {}, el('input', { cls: 'inp', value: room.name, oninput: e => room.name = e.target.value }))]),
        el('tr', {}, [el('td', { text: 'Size' }), el('td', {}, sel(room.setup.size, [['S', 'Small'], ['M', 'Medium'], ['L', 'Large'], ['XL', 'Extra large'], ['G', 'Gigantic']], v => room.setup.size = v))]),
        el('tr', {}, [el('td', { text: 'Turn timer' }), el('td', {}, sel(room.timer || 0, [[0, 'None'], [120, '2 minutes'], [300, '5 minutes'], [600, '10 minutes']], v => room.timer = +v || null))]),
      ]));
      b.appendChild(el('h3', { text: 'Seats' }));
      room.seats.forEach((s, i) => b.appendChild(el('div', { cls: 'row' }, [(i + 1) + '.', i === 0 ? el('b', { text: s.name + ' (you)' }) : sel(s.kind, [['human', 'A person (open seat)'], ['ai', 'The computer']], v => { s.kind = v; s.name = v === 'ai' ? 'Computer' : 'Open seat'; s.ai = 'normal'; }),
        s.kind === 'ai' ? sel(s.ai || 'normal', Object.entries(D.AI_LEVELS).map(([k, v]) => [k, v.name]), v => s.ai = v) : null,
        /* each person picks their own people (an open seat picks when they join); the host picks for the computer */
        i === 0 || s.kind === 'ai' ? factionSel(s.faction, v => { s.faction = v; render(); }) : el('span', { cls: 'small muted', text: 'picks their own faction' }),
        sel(s.team, [[0, 'Alone'], [1, 'Team 1'], [2, 'Team 2'], [3, 'Team 3']], v => s.team = +v), sel(s.colorId, D.PLAYER_COLORS.map(c => [c.id, c.name]), v => s.colorId = v),
        i > 1 ? btn('✕', () => { room.seats.splice(i, 1); render(); }, 'icon') : null])));
      if (room.seats.length < 6) b.appendChild(btn('+ Add a seat', () => { const used = room.seats.map(s => s.colorId); room.seats.push({ kind: 'human', account: null, name: 'Open seat', colorId: D.PLAYER_COLORS.find(c => !used.includes(c.id)).id, team: 0, faction: 'random' }); render(); }));
      b.appendChild(el('div', { cls: 'acts' }, [btn('Cancel', () => m.close()), btn('Make the room', async () => { try { await putRoom(room); await addMyRoom(room.code); m.close(); O.lobby(room.code); } catch (e) { U.alert('Could not make the room', e.message); } }, 'primary')]));
    }
    render();
  };

  /* the choice of people: random, or any faction that is ready */
  const factionName = f => f === 'random' || !f ? 'Random faction' : (D.FACTIONS.find(x => x.id === f) || { name: f }).name.replace(/^The /, '');
  function factionSel(val, on) {
    return el('select', { cls: 'inp', 'data-tip': 'Which people this seat plays', onchange: e => on(e.target.value) },
      [['random', 'Random faction']].concat(D.FACTIONS.filter(f => f.ready).map(f => [f.id, f.name.replace(/^The /, '')])).map(([v, n]) => el('option', { value: v, selected: (val || 'random') === v ? 'selected' : null }, n)));
  }
  O.join = function () {
    const inp = el('input', { cls: 'inp', placeholder: 'ABCDE', style: { textTransform: 'uppercase', width: '120px' } });
    const m = U.modal([el('h2', { text: 'Join a room' }), el('p', { text: 'Type the code your friend gave you.' }), inp, el('div', { cls: 'acts' }, [btn('Cancel', () => m.close()), btn('Join', async () => {
      const c = inp.value.trim().toUpperCase(); const me = acc();
      try {
        const r = await getRoom(c); if (!r) { U.toast('No room with that code.'); return; }
        if (r.seats.some(s => s.account === me.id)) { m.close(); await addMyRoom(c); return r.status === 'lobby' ? O.lobby(c) : O.enter(c); }
        if (r.status !== 'lobby') { U.toast('That game has already started.'); return; }
        const seat = r.seats.find(s => s.kind === 'human' && !s.account); if (!seat) { U.toast('That room is full.'); return; }
        seat.account = me.id; seat.name = me.name; await putRoom(r); await addMyRoom(c); m.close(); O.lobby(c);
      } catch (e) { U.alert('Could not join', e.message); }
    }, 'primary')])]);
    setTimeout(() => inp.focus(), 30);
  };

  /* ---------- waiting for everyone ---------- */
  O.lobby = function (c) {
    const me = acc(); let timer = null;
    O.chatStart(c);
    const m = U.modal([el('h2', { text: 'Room ' + c }), el('p', { cls: 'muted', text: 'Loading…' })], { onClose: () => clearInterval(timer), wide: true });
    async function refresh() {
      let r; try { r = await getRoom(c); } catch (e) { return; }
      if (!r) return;
      if (r.status === 'playing') { clearInterval(timer); m.close(); O.enter(c); return; }
      const isHost = r.host === me.id, full = r.seats.every(s => s.kind === 'ai' || s.account);
      /* not while someone has the faction list open */
      if (document.activeElement && document.activeElement.tagName === 'SELECT' && m.box.contains(document.activeElement)) return;
      const b = m.box; b.innerHTML = '';
      b.appendChild(el('h2', { text: r.name }));
      b.appendChild(el('p', {}, ['Give your friends this code: ', el('b', { cls: 'gold', style: { fontSize: '22px', letterSpacing: '3px' }, text: r.code })]));
      b.appendChild(el('div', { cls: 'col' }, r.seats.map((s, i) => el('div', { cls: 'row frame' }, [el('span', { style: { width: '14px', height: '14px', borderRadius: '50%', background: D.PLAYER_COLORS.find(x => x.id === s.colorId).c } }), el('span', { text: s.kind === 'ai' ? 'The computer (' + (D.AI_LEVELS[s.ai || 'normal'].name) + ')' : s.account ? s.name : 'An open seat…' }),
        s.account === me.id ? factionSel(s.faction, async v => { try { const fresh = await getRoom(c); const seat = fresh && fresh.status === 'lobby' && fresh.seats.find(x => x.account === me.id); if (!seat) return; seat.faction = v; await putRoom(fresh); refresh(); } catch (e) { U.toast('Could not change faction: ' + e.message); } })
          : el('span', { cls: 'small muted', text: factionName(s.faction) }),
        s.team ? el('span', { cls: 'small muted', text: 'Team ' + s.team }) : null]))));
      b.appendChild(el('div', { cls: 'acts' }, [btn('Close', () => m.close()), isHost ? btn(full ? 'Begin the game' : 'Waiting for players…', async () => { if (!full) return; await start(r); }, 'primary') : el('span', { cls: 'muted', text: 'The host will begin when everyone is here.' })]));
    }
    refresh(); timer = setInterval(refresh, POLL);
  };
  async function start(r) {
    const players = r.seats.map((s, i) => ({ kind: s.kind, name: s.name, ai: s.ai || 'normal', team: s.team || 0, color: D.PLAYER_COLORS.find(c => c.id === s.colorId).c, colorId: s.colorId, account: s.account || null,
      faction: s.faction && s.faction !== 'random' ? s.faction : SU.rng({ rngState: (Date.now() + i * 7919) & 0xffff }).pick(D.FACTIONS.filter(f => f.ready).map(f => f.id)) }));
    const st = SU.mapgen.newGame(Object.assign({}, r.setup, { name: r.name, players }));
    st.online = { code: r.code };
    RU.startTurn(st);
    r.status = 'playing'; r.state = S.serialize(st); r.seq = 1; r.turnOf = st.current;
    await putRoom(r);
  }

  /* ======================= playing ======================= */
  let watching = null, room = null;
  O.enter = async function (c) {
    let r; try { r = await getRoom(c); } catch (e) { U.alert('Could not reach the room', e.message); return; }
    if (!r || !r.state) { U.alert('Not ready', 'That game has not started yet.'); return; }
    room = r; O.stopWatching();
    const st = S.deserialize(r.state); st.online = { code: c, seq: r.seq };
    O.chatStart(c);
    SU.game.st = st; U.closeAll(); document.getElementById('title').classList.add('hidden');
    U.start(st);
    U.viewer = myIndex(st) >= 0 ? myIndex(st) : 0;
    SU.game.beginTurn();
  };
  function myIndex(st) { const me = acc(); return st.players.findIndex(P => P.account === (me && me.id)); }
  O.isMine = (st, pi) => { const me = acc(); return !!(me && st.players[pi] && st.players[pi].account === me.id); };
  O.isHost = st => { const me = acc(); return !!(room && me && room.host === me.id); };
  O.stopWatching = () => { clearInterval(watching); watching = null; U.busy = false; };
  /* someone else is playing: watch the room until it is our turn again */
  O.waitTurn = function (st) {
    U.viewer = Math.max(0, myIndex(st));
    U.busy = true; U.refresh();
    document.getElementById('status').textContent = 'Waiting for ' + S.cur(st).name + '…';
    clearInterval(watching);
    watching = setInterval(async () => {
      let r, f; try { [r, f] = await Promise.all([getRoom(st.online.code), getFight(st.online.code).catch(() => null)]); } catch (e) { return; }
      if (f && f.status === 'waiting' && O.isMine(st, f.remotePi) && f.seq === st.online.seq && Math.abs(Date.now() - (f.at || 0)) < 120000) { clearInterval(watching); watching = null; called(st, f); return; }
      if (!r || r.seq === st.online.seq) return;
      clearInterval(watching); room = r;
      const nst = S.deserialize(r.state); nst.online = { code: r.code, seq: r.seq };
      U.busy = false; SU.game.st = nst; U.start(nst); U.viewer = Math.max(0, myIndex(nst));
      if (nst.over) { SU.game.gameOver(); return; }
      SU.game.beginTurn();
    }, POLL);
  };
  /* our turn is done: send the game back */
  O.pushTurn = async function (st) {
    const oldSeq = st.online.seq;
    try {
      const r = room || await getRoom(st.online.code);
      r.state = S.serialize(st); r.seq = oldSeq + 1; r.turnOf = st.current; if (st.over) r.status = 'over';
      const okk = await casRoom(r, oldSeq);
      if (!okk) { U.alert('Out of step', 'Someone else changed the game first. Loading the latest.'); return O.enter(st.online.code); }
      st.online.seq = r.seq; room = r;
    } catch (e) { U.alert('Could not send your turn', e.message + ' — try ending your turn again.'); }
  };
  /* ======================= battles between people ======================= */
  const FKEY = c => 'su_fight:' + c;
  async function getFight(c) { const r = await rest('GET', 'dya_config?select=value&key=eq.' + encodeURIComponent(FKEY(c))); return r && r[0] ? r[0].value : null; }
  async function putFight(c, f) { f.at = Date.now(); await rest('POST', 'dya_config?on_conflict=key', { key: FKEY(c), value: f, updated_at: now() }, 'resolution=merge-duplicates'); }
  const idsOf = spec => ({ atk: spec.attacker.id, def: spec.defender ? spec.defender.id : null, town: spec.town ? spec.town.id : null, temp: !!spec.temp });
  const specOf = (st, ids) => ({ attacker: st.armies[ids.atk], defender: ids.def ? st.armies[ids.def] : null, town: ids.town ? st.objects[ids.town] : null, temp: ids.temp });

  /* the attacker's side: send the battle, wait for the defender, then fight it together */
  O.fight = async function (st, spec) {
    const G = SU.game, c = st.online.code;
    const atkPi = spec.attacker.owner, defPi = spec.town ? spec.town.owner : spec.defender.owner;
    const remotePi = [defPi, atkPi].find(o => o >= 0 && st.players[o].kind === 'human' && !G.localHuman(o));
    const f = { id: 'f' + Date.now().toString(36), status: 'waiting', atkPi, defPi, remotePi, ids: idsOf(spec), seq: st.online.seq, state: S.serialize(st), actions: [], by: (acc() || {}).id };
    try { await putFight(c, f); } catch (e) { U.alert('Could not start the battle', e.message); return null; }
    const who = st.players[remotePi].name;
    const came = await new Promise(resolve => {
      let t = null;
      const m = U.modal([el('h2', { text: 'To battle' }), el('p', { text: 'Waiting for ' + who + ' to come and fight. In online games the computer never fights for a person.' }),
        el('p', { cls: 'small muted', text: 'If ' + who + ' is not here, use the chat to call them, or call the battle off: your army stays where it is.' }),
        el('div', { cls: 'acts' }, [btn('Call it off', () => { clearInterval(t); m.close(); resolve(false); }, 'danger')])], { dismiss: false });
      let beat = 0;
      t = setInterval(async () => {
        let g; try { g = await getFight(c); } catch (e) { return; }
        if (g && g.id === f.id && g.status === 'live') { clearInterval(t); m.close(); resolve(true); return; }
        /* still here: keep the call fresh (only while nobody has answered it) */
        if (++beat % 10 === 0) { f.at = Date.now(); rest('PATCH', 'dya_config?key=eq.' + encodeURIComponent(FKEY(c)) + '&value->>status=eq.waiting&value->>id=eq.' + f.id, { value: f, updated_at: now() }).catch(() => {}); }
      }, 1500);
    });
    if (!came) { f.status = 'off'; putFight(c, f).catch(() => {}); return null; }
    const B = G.buildBattle(st, specOf(st, f.ids));
    const rep = await together(st, B, f);
    f.status = 'done'; putFight(c, Object.assign({}, f, { actions: [], state: null })).catch(() => {});
    return rep;
  };
  /* the defender's side: we have been attacked */
  function called(st, f) {
    const atk = st.players[f.atkPi];
    U.modal([el('h2', { text: (atk ? atk.name : 'An enemy') + ' attacks!' }), el('p', { text: 'Your forces are under attack. Come and lead them: the battle waits for you.' }),
      el('div', { cls: 'acts' }, [btn('To battle', async function () {
        this.closest('.overlay').remove();
        const G = SU.game, c = st.online.code;
        const st2 = S.deserialize(f.state); st2.online = { code: c, seq: f.seq };
        G.st = st2; U.busy = false; U.start(st2); U.viewer = Math.max(0, myIndex(st2));
        try { f.status = 'live'; await putFight(c, f); } catch (e) { U.alert('Could not join the battle', e.message); O.waitTurn(st2); return; }
        const B = G.buildBattle(st2, specOf(st2, f.ids));
        await together(st2, B, f);
        U.refresh(); SU.mapView.invalidate();
        O.waitTurn(G.st);
      }, 'primary big')])], { dismiss: false });
  }
  /* run the battle on this device, sending our choices and playing theirs */
  function together(st, B, f) {
    const c = st.online.code, log = (f.actions || []).slice();
    let used = log.length, chain = Promise.resolve(), poll = null, closed = false;
    const write = () => { const snap = Object.assign({}, f, { status: 'live', actions: log.slice() }); chain = chain.then(async () => { for (let i = 0; i < 20 && !closed; i++) { try { await putFight(c, snap); return; } catch (e) { await new Promise(r => setTimeout(r, 1500)); } } }); };
    const net = {
      send(cmd) { log.push(cmd); used = log.length; write(); },
      next() { return used < log.length ? log[used++] : null; },
    };
    poll = setInterval(async () => { let g; try { g = await getFight(c); } catch (e) { return; } if (!g || g.id !== f.id) return; if (g.actions && g.actions.length > log.length) log.push(...g.actions.slice(log.length)); }, 1200);
    return new Promise(resolve => {
      SU.battleView.start(B, SU.game.controlFor(st, B), rep => { closed = true; clearInterval(poll); resolve(rep); }, net);
    });
  }

  /* ======================= chat ======================= */
  let chat = null;
  const CKEY = c => 'su_chat:' + c + ':';
  async function chatList(c) { const rows = await rest('GET', 'dya_config?select=key,value&key=like.' + encodeURIComponent(CKEY(c) + '*') + '&order=key.desc&limit=60'); return (rows || []).map(r => r.value).filter(Boolean).reverse(); }
  async function chatSend(c, text) { const me = acc(); const k = CKEY(c) + Date.now().toString(36).padStart(9, '0') + Math.random().toString(36).slice(2, 6); await rest('POST', 'dya_config?on_conflict=key', { key: k, value: { name: me.name, acc: me.id, text: text.slice(0, 400), at: Date.now() }, updated_at: now() }, 'resolution=merge-duplicates'); }
  /* the chat for a room: a button in the corner that opens a small panel */
  O.chatStart = function (c) {
    if (chat && chat.code === c) return;
    O.chatStop();
    const me = acc();
    const box = el('div', { cls: 'chat panel hidden' }), msgs = el('div', { cls: 'chat-msgs' });
    const inp = el('input', { cls: 'inp', placeholder: 'Say something…', maxlength: 400 });
    const fab = el('button', { type: 'button', cls: 'btn chat-fab', title: 'Chat with the room' }, 'Chat');
    box.appendChild(el('div', { cls: 'chat-head' }, [el('b', { text: 'Room ' + c }), el('span', { cls: 'spacer' }), btn('✕', () => { box.classList.add('hidden'); fab.classList.remove('hidden'); }, 'icon')]));
    box.appendChild(msgs);
    const go = async () => { const t = inp.value.trim(); if (!t) return; inp.value = ''; try { await chatSend(c, t); await pull(); } catch (e) { U.toast('Could not send: ' + e.message); } };
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); });
    box.appendChild(el('div', { cls: 'row', style: { flexWrap: 'nowrap' } }, [inp, btn('Send', go, 'primary')]));
    fab.addEventListener('click', () => { box.classList.remove('hidden'); fab.classList.add('hidden'); chat.seen = chat.count; fab.textContent = 'Chat'; msgs.scrollTop = 1e6; setTimeout(() => inp.focus(), 20); });
    document.body.appendChild(box); document.body.appendChild(fab);
    chat = { code: c, box, fab, count: 0, seen: 0, timer: null };
    async function pull() {
      let list; try { list = await chatList(c); } catch (e) { return; }
      if (!chat || chat.code !== c) return;
      const open = !box.classList.contains('hidden'), last = list.length ? list[list.length - 1].at : 0;
      if (last === chat.last) return;
      chat.last = last;
      msgs.innerHTML = '';
      if (!list.length) msgs.appendChild(el('div', { cls: 'small muted', text: 'No messages yet.' }));
      list.forEach(m => msgs.appendChild(el('div', { cls: 'chat-m' + (me && m.acc === me.id ? ' me' : '') }, [el('b', { text: m.name + ' ' }), el('span', { text: m.text }), el('span', { cls: 'small muted', text: ' ' + new Date(m.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) })])));
      msgs.scrollTop = 1e6;
      const fresh = list.filter(m => !me || m.acc !== me.id).length;
      chat.count = fresh;
      if (open) chat.seen = fresh; else if (fresh > chat.seen) fab.textContent = 'Chat (' + (fresh - chat.seen) + ')';
    }
    pull(); chat.timer = setInterval(pull, 5000);
    chat.seen = Infinity; setTimeout(() => { if (chat) chat.seen = chat.count; }, 2500);
  };
  O.chatStop = function () { if (!chat) return; clearInterval(chat.timer); chat.box.remove(); chat.fab.remove(); chat = null; };

  /* the turn timer */
  let tTimer = null;
  SU.on('turn', () => {
    clearInterval(tTimer);
    const st = SU.game && SU.game.st; if (!st || !st.online || !room || !room.timer) return;
    if (!O.isMine(st, st.current)) return;
    const end = Date.now() + room.timer * 1000;
    tTimer = setInterval(() => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      const st2 = SU.game.st; if (!st2 || st2.current !== st.current) { clearInterval(tTimer); return; }
      const s = document.getElementById('status'); if (s) s.textContent = 'Time left this turn: ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      if (!left) { clearInterval(tTimer); SU.game.noIdleWarning = true; U.closeAll(); if (U.myTurn()) SU.game.endTurn(); }
    }, 1000);
  });
})(typeof window !== 'undefined' ? window : globalThis);
