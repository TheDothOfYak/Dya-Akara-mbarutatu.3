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
    m.box.appendChild(el('p', { cls: 'small muted', text: 'Play live with everyone at once, or take your turns whenever you like — rooms keep their place. When someone attacks you on their turn, the computer fights for you.' }));
    m.box.appendChild(el('div', { cls: 'acts' }, [btn('Close', () => m.close())]));
  };

  O.create = function () {
    const me = acc();
    const room = { code: code(), name: me.name + '’s game', host: me.id, status: 'lobby', seq: 0, turnOf: 0, timer: null,
      setup: { size: 'M', spread: true, wild: 'normal' },
      seats: [{ kind: 'human', account: me.id, name: me.name, colorId: 'red', team: 0 }, { kind: 'human', account: null, name: 'Open seat', colorId: 'blue', team: 0 }] };
    const m = U.modal(el('div'), { wide: true });
    function render() {
      const b = m.box; b.innerHTML = '';
      b.appendChild(el('h2', { text: 'A new online room' }));
      const sel = (val, list, on) => el('select', { cls: 'inp', onchange: e => { on(e.target.value); render(); } }, list.map(([v, n]) => el('option', { value: v, selected: String(v) === String(val) ? 'selected' : null }, n)));
      b.appendChild(el('table', { cls: 'setup' }, [
        el('tr', {}, [el('td', { text: 'Name' }), el('td', {}, el('input', { cls: 'inp', value: room.name, oninput: e => room.name = e.target.value }))]),
        el('tr', {}, [el('td', { text: 'Size' }), el('td', {}, sel(room.setup.size, [['S', 'Small'], ['M', 'Medium'], ['L', 'Large'], ['XL', 'Extra large']], v => room.setup.size = v))]),
        el('tr', {}, [el('td', { text: 'Turn timer' }), el('td', {}, sel(room.timer || 0, [[0, 'None'], [120, '2 minutes'], [300, '5 minutes'], [600, '10 minutes']], v => room.timer = +v || null))]),
      ]));
      b.appendChild(el('h3', { text: 'Seats' }));
      room.seats.forEach((s, i) => b.appendChild(el('div', { cls: 'row' }, [(i + 1) + '.', i === 0 ? el('b', { text: s.name + ' (you)' }) : sel(s.kind, [['human', 'A person (open seat)'], ['ai', 'The computer']], v => { s.kind = v; s.name = v === 'ai' ? 'Computer' : 'Open seat'; s.ai = 'normal'; }),
        s.kind === 'ai' ? sel(s.ai || 'normal', Object.entries(D.AI_LEVELS).map(([k, v]) => [k, v.name]), v => s.ai = v) : null,
        sel(s.team, [[0, 'Alone'], [1, 'Team 1'], [2, 'Team 2'], [3, 'Team 3']], v => s.team = +v), sel(s.colorId, D.PLAYER_COLORS.map(c => [c.id, c.name]), v => s.colorId = v),
        i > 1 ? btn('✕', () => { room.seats.splice(i, 1); render(); }, 'icon') : null])));
      if (room.seats.length < 6) b.appendChild(btn('+ Add a seat', () => { const used = room.seats.map(s => s.colorId); room.seats.push({ kind: 'human', account: null, name: 'Open seat', colorId: D.PLAYER_COLORS.find(c => !used.includes(c.id)).id, team: 0 }); render(); }));
      b.appendChild(el('div', { cls: 'acts' }, [btn('Cancel', () => m.close()), btn('Make the room', async () => { try { await putRoom(room); await addMyRoom(room.code); m.close(); O.lobby(room.code); } catch (e) { U.alert('Could not make the room', e.message); } }, 'primary')]));
    }
    render();
  };

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
    const m = U.modal([el('h2', { text: 'Room ' + c }), el('p', { cls: 'muted', text: 'Loading…' })], { onClose: () => clearInterval(timer), wide: true });
    async function refresh() {
      let r; try { r = await getRoom(c); } catch (e) { return; }
      if (!r) return;
      if (r.status === 'playing') { clearInterval(timer); m.close(); O.enter(c); return; }
      const isHost = r.host === me.id, full = r.seats.every(s => s.kind === 'ai' || s.account);
      const b = m.box; b.innerHTML = '';
      b.appendChild(el('h2', { text: r.name }));
      b.appendChild(el('p', {}, ['Give your friends this code: ', el('b', { cls: 'gold', style: { fontSize: '22px', letterSpacing: '3px' }, text: r.code })]));
      b.appendChild(el('div', { cls: 'col' }, r.seats.map((s, i) => el('div', { cls: 'row frame' }, [el('span', { style: { width: '14px', height: '14px', borderRadius: '50%', background: D.PLAYER_COLORS.find(x => x.id === s.colorId).c } }), el('span', { text: s.kind === 'ai' ? 'The computer (' + (D.AI_LEVELS[s.ai || 'normal'].name) + ')' : s.account ? s.name : 'An open seat…' }), s.team ? el('span', { cls: 'small muted', text: 'Team ' + s.team }) : null]))));
      b.appendChild(el('div', { cls: 'acts' }, [btn('Close', () => m.close()), isHost ? btn(full ? 'Begin the game' : 'Waiting for players…', async () => { if (!full) return; await start(r); }, 'primary') : el('span', { cls: 'muted', text: 'The host will begin when everyone is here.' })]));
    }
    refresh(); timer = setInterval(refresh, POLL);
  };
  async function start(r) {
    const players = r.seats.map(s => ({ kind: s.kind, name: s.name, ai: s.ai || 'normal', team: s.team || 0, color: D.PLAYER_COLORS.find(c => c.id === s.colorId).c, colorId: s.colorId, account: s.account || null }));
    const st = SU.mapgen.newGame({ size: r.setup.size, spread: r.setup.spread, wild: r.setup.wild, name: r.name, players });
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
    room = r;
    const st = S.deserialize(r.state); st.online = { code: c, seq: r.seq };
    SU.game.st = st; U.closeAll(); document.getElementById('title').classList.add('hidden');
    U.start(st);
    U.viewer = myIndex(st) >= 0 ? myIndex(st) : 0;
    SU.game.beginTurn();
  };
  function myIndex(st) { const me = acc(); return st.players.findIndex(P => P.account === (me && me.id)); }
  O.isMine = (st, pi) => { const me = acc(); return !!(me && st.players[pi] && st.players[pi].account === me.id); };
  O.isHost = st => { const me = acc(); return !!(room && me && room.host === me.id); };
  /* someone else is playing: watch the room until it is our turn again */
  O.waitTurn = function (st) {
    U.viewer = Math.max(0, myIndex(st));
    U.busy = true; U.refresh();
    document.getElementById('status').textContent = 'Waiting for ' + S.cur(st).name + '…';
    clearInterval(watching);
    watching = setInterval(async () => {
      let r; try { r = await getRoom(st.online.code); } catch (e) { return; }
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
