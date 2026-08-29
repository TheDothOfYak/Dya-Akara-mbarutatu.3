/* ============================================================
   DYA'AKARA — core/pia_coop.js
   LEGENDS OF PIA'DON — session + co-op layer.

   Two pieces:

   • DYA.piaSession — the single object the UI talks to for BOTH
     solo and co-op. It holds the current `run`, routes every player
     action through DYA.piaRun.applyAction, and calls `onUpdate` to
     repaint. Solo applies locally; co-op host applies + broadcasts;
     co-op client forwards its action to the host and renders the
     snapshot it gets back. The screens never branch on mode.

   • DYA.piaCoop — the lobby + Supabase-Realtime transport, reusing
     DYA.netplay.joinRoom (the same room channel the rest of the game
     uses). The host is authoritative: it owns the run (with its rng)
     and broadcasts a JSON snapshot after every applied action.

   Up to three Guardians. Enemy counts and HP scale with the party
   size inside the engine (see core/pia_engine buildEnemies).
   ============================================================ */
(function () {
  'use strict';
  const R = DYA.piaRun, EN = DYA.piaEngine, N = DYA.netplay;
  const MAX_PLAYERS = 3;

  /* strip the host-only rng before sending a run over the wire */
  function snapshot(run) {
    return JSON.parse(JSON.stringify(run, (k, v) => (k === '_rng' ? undefined : v)));
  }

  /* ================= SESSION ================= */
  const S = {
    run: null, mode: 'solo', isHost: true, myId: 'solo',
    onUpdate: null,          // UI repaint hook
    _broadcast: null,        // host: (run) => void
    _sendToHost: null,       // client: (action) => void
  };

  S.startSolo = function (guardianId, planet, opts) {
    opts = opts || {};
    const me = DYA.state && DYA.state.me;
    S.myId = me ? me.id : 'solo';
    S.mode = 'solo'; S.isHost = true; S._broadcast = null; S._sendToHost = null;
    S.run = R.create({ planet, mode: 'solo', difficulty: opts.difficulty, campaignLen: opts.campaignLen, players: [{ id: S.myId, name: me ? me.name : 'You', guardianId }] });
    R.saveSolo(S.run);
    return S.run;
  };

  S.resumeSolo = function (run) {
    S.run = run; S.mode = 'solo'; S.isHost = true; S._broadcast = null; S._sendToHost = null;
    const me = DYA.state && DYA.state.me; S.myId = me ? me.id : 'solo';
    if (run.battle) EN.attachRng(run.battle);
    return run;
  };

  /* the UI calls this for every action; playerId defaults to me */
  S.act = function (action) {
    action = Object.assign({ playerId: S.myId }, action);
    if (S.mode === 'solo' || S.isHost) {
      const changed = R.applyAction(S.run, action);
      if (changed) S._afterApply();
    } else if (S._sendToHost) {
      S._sendToHost(action);
    }
  };

  S._afterApply = function () {
    if (S.isHost && S._broadcast) S._broadcast(S.run);
    if (S.mode === 'solo') R.saveSolo(S.run);
    if (S.onUpdate) S.onUpdate();
  };

  /* host: a client action arrived */
  S.applyRemote = function (action) {
    if (!S.isHost) return;
    const changed = R.applyAction(S.run, action);
    if (changed) S._afterApply();
  };

  /* client: a fresh snapshot arrived */
  S.receiveState = function (run) {
    S.run = run;
    if (S.onUpdate) S.onUpdate();
  };

  /* wire the session as host of a freshly-built co-op run */
  S._becomeHost = function (run, room, myId) {
    S.run = run; S.mode = 'coop'; S.isHost = true; S.myId = myId;
    S._broadcast = (r) => { try { room.send({ t: 'state', run: snapshot(r) }); } catch (e) { } };
    S._sendToHost = null;
    room.send({ t: 'start', run: snapshot(run) });
    if (S.onUpdate) S.onUpdate();
  };

  /* wire the session as a client from a start snapshot */
  S._becomeClient = function (run, room, myId) {
    S.run = run; S.mode = 'coop'; S.isHost = false; S.myId = myId;
    S._sendToHost = (action) => { try { room.send({ t: 'action', action }); } catch (e) { } };
    S._broadcast = null;
    if (S.onUpdate) S.onUpdate();
  };

  DYA.piaSession = S;

  /* ================= CO-OP LOBBY / TRANSPORT ================= */
  const C = {
    room: null, code: null, isHost: false, myId: null, myName: null,
    lobby: null,                 // {players:[{id,name,guardianId,ready}], planet, hostId, started}
    onLobby: null,               // UI hook: lobby changed
    onStart: null,               // UI hook: run started -> navigate
    onError: null,               // UI hook: connection error / peer left
    _boundGuardian: null,
  };

  function meIdName() {
    const me = DYA.state && DYA.state.me;
    return { id: me ? me.id : ('guest_' + Math.random().toString(36).slice(2, 7)), name: me ? me.name : 'Guardian' };
  }

  /* HOST a new co-op room. planet, difficulty and length fixed by host. */
  C.host = async function (planet, difficulty, campaignLen) {
    const who = meIdName();
    C.myId = who.id; C.myName = who.name; C.isHost = true;
    C.code = N.genRoomCode();
    C.lobby = { players: [{ id: who.id, name: who.name, guardianId: DYA.piaData.GUARDIANS[0].id, ready: false }], planet: planet || 'velki', difficulty: difficulty || 'hunter', campaignLen: campaignLen || 1, hostId: who.id, started: false };
    C.room = await N.joinRoom(C.code, who.id, {
      onMessage: hostOnMessage,
      onPeerJoin: () => { broadcastLobby(); },
      onPeerLeave: (key) => { hostRemovePlayer(key); },
      onStatus: (s) => { if ((s === 'CLOSED' || s === 'CHANNEL_ERROR') && C.onError) C.onError('Connection lost.'); },
    });
    broadcastLobby();
    if (C.onLobby) C.onLobby(C.lobby);
    return C.code;
  };

  /* JOIN an existing room by code. */
  C.join = async function (code) {
    const who = meIdName();
    C.myId = who.id; C.myName = who.name; C.isHost = false;
    C.code = String(code).trim().toUpperCase();
    C.lobby = null;
    C.room = await N.joinRoom(C.code, who.id, {
      onMessage: clientOnMessage,
      onPeerJoin: () => { },
      onPeerLeave: (key) => { if (C.lobby && C.lobby.hostId === key && C.onError) C.onError('The host left the room.'); },
      onStatus: (s) => { if ((s === 'CLOSED' || s === 'CHANNEL_ERROR') && C.onError) C.onError('Connection lost.'); },
    });
    /* announce ourselves to the host */
    C.room.send({ t: 'hello', id: who.id, name: who.name });
    return C.code;
  };

  C.setGuardian = function (guardianId) {
    if (C.isHost) {
      const p = C.lobby.players.find(x => x.id === C.myId); if (p) p.guardianId = guardianId;
      broadcastLobby(); if (C.onLobby) C.onLobby(C.lobby);
    } else {
      C.room.send({ t: 'pick', id: C.myId, guardianId });
    }
  };

  /* host-only: change the trial difficulty in the lobby */
  C.setDifficulty = function (id) {
    if (!C.isHost || !C.lobby) return;
    C.lobby.difficulty = id;
    broadcastLobby(); if (C.onLobby) C.onLobby(C.lobby);
  };

  C.toggleReady = function () {
    if (C.isHost) {
      const p = C.lobby.players.find(x => x.id === C.myId); if (p) p.ready = !p.ready;
      broadcastLobby(); if (C.onLobby) C.onLobby(C.lobby);
    } else {
      const cur = C.lobby && C.lobby.players.find(x => x.id === C.myId);
      C.room.send({ t: 'ready', id: C.myId, ready: !(cur && cur.ready) });
    }
  };

  /* HOST starts the run once everyone (else) is ready */
  C.start = function () {
    if (!C.isHost || !C.lobby) return;
    C.lobby.started = true;
    const players = C.lobby.players.slice(0, MAX_PLAYERS).map(p => ({ id: p.id, name: p.name, guardianId: p.guardianId }));
    const run = R.create({ planet: C.lobby.planet, mode: 'coop', difficulty: C.lobby.difficulty, campaignLen: C.lobby.campaignLen, players });
    S._becomeHost(run, C.room, C.myId);
    if (C.onStart) C.onStart();
  };

  C.leave = function () {
    try { if (C.room) C.room.leave(); } catch (e) { }
    C.room = null; C.lobby = null; C.code = null; C.isHost = false;
  };

  C.roster = function () { return (C.lobby && C.lobby.players) || []; };
  C.everyoneReady = function () {
    const ps = C.roster();
    return ps.length >= 1 && ps.every(p => p.ready || p.id === C.lobby.hostId);
  };

  /* ---------- host message handling ---------- */
  function hostOnMessage(msg) {
    if (!msg || !C.isHost) return;
    if (msg.t === 'hello') {
      if (C.lobby.players.length >= MAX_PLAYERS) { C.room.send({ t: 'full' }); return; }
      if (!C.lobby.players.find(p => p.id === msg.id)) {
        C.lobby.players.push({ id: msg.id, name: msg.name || 'Guardian', guardianId: nextFreeGuardian(), ready: false });
      }
      broadcastLobby(); if (C.onLobby) C.onLobby(C.lobby);
    } else if (msg.t === 'pick') {
      const p = C.lobby.players.find(x => x.id === msg.id); if (p) p.guardianId = msg.guardianId;
      broadcastLobby(); if (C.onLobby) C.onLobby(C.lobby);
    } else if (msg.t === 'ready') {
      const p = C.lobby.players.find(x => x.id === msg.id); if (p) p.ready = !!msg.ready;
      broadcastLobby(); if (C.onLobby) C.onLobby(C.lobby);
    } else if (msg.t === 'action') {
      S.applyRemote(msg.action);
    }
  }
  function hostRemovePlayer(key) {
    if (!C.lobby) return;
    if (!C.lobby.started) {
      C.lobby.players = C.lobby.players.filter(p => p.id !== key);
      broadcastLobby(); if (C.onLobby) C.onLobby(C.lobby);
    } else if (S.run) {
      /* mark them disconnected so pending-gates don't stall the party */
      const p = R.player(S.run, key); if (p) { p.connected = false; if (S.run.battle) { const bp = EN.playerById(S.run.battle, key); if (bp && !bp.dead) bp.ended = true; } }
      /* nudge any pending advance */
      R.maybeAdvance(S.run); R.maybeAdvanceRest(S.run);
      S._afterApply();
    }
  }
  function nextFreeGuardian() {
    const used = C.lobby.players.map(p => p.guardianId);
    const free = DYA.piaData.GUARDIANS.find(g => used.indexOf(g.id) < 0);
    return (free || DYA.piaData.GUARDIANS[0]).id;
  }

  /* ---------- client message handling ---------- */
  function clientOnMessage(msg) {
    if (!msg || C.isHost) return;
    if (msg.t === 'lobby') {
      C.lobby = msg.lobby; if (C.onLobby) C.onLobby(C.lobby);
    } else if (msg.t === 'full') {
      if (C.onError) C.onError('That room is full (3 Guardians).');
    } else if (msg.t === 'start') {
      S._becomeClient(msg.run, C.room, C.myId);
      if (C.onStart) C.onStart();
    } else if (msg.t === 'state') {
      S.receiveState(msg.run);
    }
  }

  function broadcastLobby() {
    if (C.isHost && C.room) C.room.send({ t: 'lobby', lobby: C.lobby });
  }

  DYA.piaCoop = C;
})();
