// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 1: hosting that holds up, dropping things, the rock's digging and floating, the bag's hotbar.
//  * Hosting: the room no longer hangs on "Opening a room…" when the room server is slow (it falls back to the relay),
//    the host keeps trying to get back on the room server after a wifi blip or a sleeping laptop, the relay listener is
//    re-opened if it dies, and big messages (a whole world) go through the relay a few at a time instead of in one burst.
//    The version is bumped with every update, so a friend on an old copy is told to refresh instead of joining a broken game.
//  * Dropping (Z, or Shift-click in the bag): what you drop stays on the ground until you walk away from it (it used to
//    fly straight back into your bag). Everyone in the room sees it and anyone can pick it up.
//  * The rock: one block per punch, or a 2x2 square in 2x2 mode (T, v3s6), toward the side of the block your mouse is on.
//    A block you just placed is never smashed while you still hold the button, and blocks anybody placed are never
//    knocked out by a 2x2 smash, a run-up ram or a ground slam: you can still mine them on purpose, at normal speed.
//  * The rock can float: press C in water to switch between floating up and sinking. S dives while floating.
//  * The bag: the hotbar row is marked clearly, with its keys, and set apart from the rest of the bag.
(function (RW) {
  'use strict';
  const E = RW.ent, U = RW.ui, P = RW.player, WD = RW.world, N = RW.net, TS = RW.TILE;
  if (!E || !U || !P || !WD || !N) return;

  RW.VERSION = '3.23.0'; // everyone in a room must match; bump with every update

  // =====================================================================================================
  // 1. HOSTING
  // =====================================================================================================
  const Relay = N.relay;
  if (Relay) {
    // the relay link: subscribed state is tracked for good (not only until the first answer), and sends are paced
    Relay.open = async function (code) {
      const sb = await Relay.getClient();
      const ch = sb.channel('fbw3-room-' + code, { config: { broadcast: { self: false, ack: false } } });
      const h = { on: null }, link = { h, alive: false, deadAt: 0 };
      ch.on('broadcast', { event: 'm' }, (e) => { if (h.on) h.on(e.payload); });
      await new Promise((resolve, reject) => {
        let settled = false;
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') { link.alive = true; link.deadAt = 0; if (!settled) { settled = true; resolve(); } }
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (link.alive || !link.deadAt) link.deadAt = Date.now(); link.alive = false;
            if (!settled) { settled = true; try { sb.removeChannel(ch); } catch (e) { /* gone */ } reject(new Error('relay ' + status)); }
          }
        });
        setTimeout(() => { if (!settled) { settled = true; try { sb.removeChannel(ch); } catch (e) { /* gone */ } reject(new Error('relay timeout')); } }, 12000);
      });
      // at most 3 broadcasts per 60 ms: a world split into 30 pieces arrives in under a second without tripping limits
      const q = []; let tm = 0;
      const out = (p) => { try { const r = ch.send({ type: 'broadcast', event: 'm', payload: p }); if (r && r.catch) r.catch(() => { }); } catch (e) { /* dropped */ } };
      const pump = () => { tm = 0; for (let k = 0; k < 3 && q.length; k++) out(q.shift()); if (q.length) tm = setTimeout(pump, 60); };
      link.send = (p) => { q.push(p); if (!tm) { if (q.length === 1) { pump(); if (!q.length) tm = setTimeout(() => { tm = 0; if (q.length) pump(); }, 20); } else tm = setTimeout(pump, 20); } };
      link.close = () => { link.alive = false; q.length = 0; clearTimeout(tm); try { sb.removeChannel(ch); } catch (e) { /* gone */ } };
      Relay.lastLink = link;
      return link;
    };
  }

  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun2.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:global.stun.twilio.com:3478' }];
  const peerOpts = () => {
    const q = new URLSearchParams(location.search).get('peerhost'); const o = { debug: 0, config: { iceServers: ICE.concat(N.relayServers || []) } };
    if (q) { const [h, p] = q.split(':'); o.host = h; o.port = +p || 9000; o.path = '/'; o.secure = false; }
    return o;
  };
  const roomId = (code) => 'fourbrothersworlds3-' + code.toUpperCase();
  const toast = (m) => { if (RW.ui && RW.ui.toast) RW.ui.toast(m); };

  N.hostGame = function (tries) {
    tries = tries || 0;
    return new Promise((resolve, reject) => {
      const code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
      let done = false, failed = false, said = false;
      const onIncoming = (c) => {
        c.on('open', () => { c.helloT = setTimeout(() => { if (!c.ok) { toast('A player with an older version of the game tried to join. They need to refresh their page.'); try { c.send({ k: 'badver', v: RW.VERSION }); } catch (x) { /* gone */ } setTimeout(() => c.close(), 400); } }, 8000); });
        c.on('data', (m) => {
          if (!m || typeof m !== 'object') return;
          if (!c.ok) {
            if (m.k !== 'hello') return;
            clearTimeout(c.helloT);
            if (m.v !== RW.VERSION) { try { c.send({ k: 'badver', v: RW.VERSION }); } catch (x) { /* gone */ } toast('A player on version ' + String(m.v).slice(0, 18) + ' tried to join. You are on ' + RW.VERSION + '. Both of you: open the same link and refresh.'); setTimeout(() => c.close(), 400); return; }
            if (N.conns.some((x) => x.ok && x.pid === m.f && x !== c)) { const old = N.conns.find((x) => x.pid === m.f && x !== c); N.conns = N.conns.filter((x) => x !== old); try { old.close(); } catch (x) { /* gone */ } } // the same player back again
            c.ok = true; c.pid = m.f; N.conns.push(c); c.send({ k: 'hello', v: RW.VERSION, f: N.pid });
            toast('A player joined your room.'); U.dirty(); return;
          }
          c.pid = c.pid || m.f; N.recv(m, c);
        });
        c.on('close', () => { if (!N.conns.includes(c)) return; N.conns = N.conns.filter((x) => x !== c); if (c.pid && !N.conns.some((x) => x.pid === c.pid)) { N.peers.delete(c.pid); N.recv({ k: 'left', f: '#host', pid: c.pid }); } U.dirty(); });
      };
      const live = () => { if (done) return; done = true; clearTimeout(openT); N.transport = 'p2p'; N.isHost = true; N.code = code; N.mode = 'p2p'; resolve(code); keepUp(); };
      // ---- the relay side of the room ----
      let relayBusy = false;
      const listenRelay = () => {
        if (!Relay || !Relay.available() || relayBusy) return Promise.resolve(false);
        relayBusy = true;
        return Relay.host(code, onIncoming).then((r) => { N.relayHost = r; N.relayLink = Relay.lastLink; relayBusy = false; return true; }, () => { relayBusy = false; return false; });
      };
      const relayOnly = (why) => listenRelay().then((ok) => { if (ok) live(); else if (!done && !failed) { failed = true; try { peer && peer.destroy(); } catch (x) { /* gone */ } reject(new Error(why)); } });
      // ---- the direct (PeerJS) side ----
      let peer = null, recT = 0;
      const makePeer = () => {
        if (!window.Peer) return null;
        const p = new window.Peer(roomId(code), peerOpts()); N.peer = p;
        p.on('open', () => { clearTimeout(recT); recT = 0; if (!done) { live(); listenRelay(); } });
        p.on('connection', onIncoming);
        p.on('disconnected', () => reconnectSoon(p));
        p.on('error', (e) => {
          const ty = (e && e.type) || '';
          if (!done) {
            if (ty === 'unavailable-id' && tries < 3) { failed = true; clearTimeout(openT); try { p.destroy(); } catch (x) { /* gone */ } N.hostGame(tries + 1).then(resolve, reject); return; } // code taken: pick another
            try { p.destroy(); } catch (x) { /* gone */ }
            relayOnly(ty === 'network' || ty === 'server-error' || ty === 'socket-error' ? 'Could not reach the room server. Check your internet connection, or try another network.' : 'Could not open a room (' + (ty || e.message) + ').');
            return;
          }
          if (ty === 'peer-unavailable') return; // someone looked for a player who left: nothing to do with hosting
          if (!said) { said = true; toast('Lost touch with the room server. Reconnecting… (players already here stay connected)'); }
          reconnectSoon(p);
        });
        return p;
      };
      function reconnectSoon(p) {
        if (recT || failed) return;
        recT = setTimeout(function tryAgain() {
          recT = 0; if (failed || N.code !== code || !N.isHost) return;
          if (peer && peer.open && !peer.disconnected) { said = false; return; }
          try {
            if (peer && !peer.destroyed && peer.disconnected) peer.reconnect();
            else if (!peer || peer.destroyed) peer = makePeer();
          } catch (x) { try { peer && peer.destroy(); } catch (y) { /* gone */ } peer = null; }
          recT = setTimeout(tryAgain, 4000);
        }, 2500);
      }
      // keep both doors open while hosting
      function keepUp() {
        const tick = setInterval(() => {
          if (N.code !== code || !N.isHost) { clearInterval(tick); return; }
          if (peer && (peer.destroyed || peer.disconnected)) reconnectSoon(peer);
          const lk = N.relayLink;
          if (Relay && Relay.available() && (!lk || (!lk.alive && lk.deadAt && Date.now() - lk.deadAt > 15000))) {
            const old = N.relayHost; N.relayHost = null; N.relayLink = null;
            try { old && old.close(); } catch (x) { /* gone */ }
            listenRelay();
          }
        }, 5000);
      }
      if (!window.Peer) { relayOnly('Multiplayer could not load. Check your internet connection.'); return; }
      peer = makePeer();
      // the room server can be slow or silent: don't wait forever, open the room on the relay
      const openT = setTimeout(() => { if (!done && !failed) relayOnly('Could not reach the room server. Check your internet connection, or try another network.'); }, 9000);
    });
  };

  // =====================================================================================================
  // 2. DROPPING THINGS
  // =====================================================================================================
  const wid = () => (WD.def ? WD.def.id : '');
  let dropSeq = 0;
  const baseThrow = P.throwItem;
  P.throwItem = function (id, n) {
    const before = E.drops.length;
    const r = baseThrow.apply(this, arguments);
    if (E.drops.length > before) {
      const d = E.drops[E.drops.length - 1];
      d.vx = (P.face || 1) * 150; d.hold = 1e9; d.mine = true; // stays put until you walk away from it
      d.nid = N.pid + '.' + (++dropSeq).toString(36);
      if (N.transport) N.send({ k: 'tdrop', w: wid(), nid: d.nid, id: d.id, n: d.n, x: Math.round(d.x), y: Math.round(d.y), vx: Math.round(d.vx), vy: Math.round(d.vy) });
    }
    return r;
  };
  N.on('tdrop', (m) => {
    if (m.w !== wid() || !RW.ITEMS[m.id] || typeof m.nid !== 'string' || E.drops.some((d) => d.nid === m.nid)) return;
    E.drops.push({ id: m.id, n: RW.clamp(Math.floor(+m.n) || 1, 1, 9999), x: +m.x || 0, y: +m.y || 0, vx: RW.clamp(+m.vx || 0, -400, 400), vy: RW.clamp(+m.vy || 0, -400, 400), t: 0, hold: 0.6, w: 8, h: 8, nid: m.nid });
  });
  N.on('tpick', (m) => {
    if (m.w !== wid() || typeof m.nid !== 'string') return;
    const i = E.drops.findIndex((d) => d.nid === m.nid); if (i < 0) return;
    const left = Math.floor(+m.n) || 0; if (left <= 0) E.drops.splice(i, 1); else E.drops[i].n = left;
  });
  const baseUpDrops = E.updateDrops;
  E.updateDrops = function (dt) {
    const pc = { x: P.x + P.w / 2, y: P.y + P.h / 2 };
    E.drops.forEach((d) => { if (d.mine && d.hold > 1e8 && (P.dead || RW.dist(d.x, d.y, pc.x, pc.y) > 48)) { d.hold = 0; d.mine = false; } });
    const was = new Map(); E.drops.forEach((d) => { if (d.nid) was.set(d.nid, d); });
    const r = baseUpDrops.apply(this, arguments);
    if (N.transport && was.size) {
      was.forEach((d, nid) => {
        const still = E.drops.includes(d);
        if (!still && d.t <= 300) N.send({ k: 'tpick', w: wid(), nid, n: 0 });
        else if (still && d.n !== d.sentN && d.sentN != null) N.send({ k: 'tpick', w: wid(), nid, n: d.n });
        d.sentN = d.n;
      });
    }
    return r;
  };

  // =====================================================================================================
  // 3. PLACED BLOCKS, AND THE ROCK'S DIGGING
  // =====================================================================================================
  // every block a player put down (this session, or loaded from the world's saved changes) is remembered by its place
  const placed = (RW.v2placed = new Set());
  let placedWorld = null;
  const solidId = (t) => !!(RW.TILES[t] && RW.TILES[t].solid);
  const baseRemote = WD.applyRemote;
  WD.applyRemote = function (i, t) {
    if (wid() !== placedWorld) { placed.clear(); placedWorld = wid(); }
    const was = WD.fg && WD.fg[i];
    const r = baseRemote.apply(this, arguments);
    if (WD.fg && WD.fg[i] === t) { if (solidId(t) && !solidId(was) && t !== RW.T.water) placed.add(i); else if (!solidId(t)) placed.delete(i); }
    return r;
  };
  const baseInit = WD.init;
  WD.init = function () { placed.clear(); const r = baseInit.apply(this, arguments); placedWorld = wid(); return r; };

  const S = { hold: -1, deliberate: -1, ctxPlaced: false, smash: null };
  const baseTryPlace = P.tryPlace;
  P.tryPlace = function (tx, ty) {
    const before = WD.get(tx, ty);
    const r = baseTryPlace.apply(this, arguments);
    const now = WD.get(tx, ty);
    if (now !== before && solidId(now)) { const i = WD.idx(tx, ty); placed.add(i); S.hold = i; }
    return r;
  };
  // RW.v2Built: "never smash this kind of block in a line". It also answers yes for a block someone placed while it's
  // the one being mined, so the rock mines it the normal way instead of smashing it.
  const baseBuilt = RW.v2Built;
  if (baseBuilt) RW.v2Built = function (i) { return S.ctxPlaced || baseBuilt(i); };

  const tile = (x, y) => RW.TILES[WD.get(x, y)] || {};
  const NEVER = new Set(['tablet', 'ward', 'rift', 'altar', 'forge', 'knapstone', 'bedrock', 'townportal', 'cloudportal']);
  function smashable(x, y) {
    if (!WD.inb(x, y) || placed.has(WD.idx(x, y))) return false;
    const id = WD.get(x, y), t = RW.TILES[id]; if (!t || !t.solid) return false;
    const hard = t.hard == null ? 0 : t.hard;
    if (hard >= 99 || hard > Math.min(3, P.power())) return false;
    if (t.element || t.loot || t.storage || t.toggle || t.use || t.lockedMsg || t.crop || t.tree || t.decor || NEVER.has(t.key)) return false;
    return !(baseBuilt && baseBuilt(id));
  }

  let depth = 0;
  const baseBreak = P.breakTile;
  P.breakTile = function (tx, ty) {
    const i = WD.inb(tx, ty) ? WD.idx(tx, ty) : -1;
    if (depth === 0) {
      if (S.smash) {
        if (tx !== S.smash.tx || ty !== S.smash.ty || S.smash.done) return; // the old 3-deep line smash: only the block you hit
        S.smash.done = true;
      }
      if (i >= 0 && placed.has(i) && S.deliberate !== i) return; // a placed block is only ever broken on purpose
    }
    depth++;
    try {
      const r = baseBreak.apply(this, arguments);
      if (i >= 0 && !solidId(WD.get(tx, ty))) placed.delete(i);
      if (depth === 1 && S.smash && S.smash.area) {
        S.smash.area.forEach(([x, y]) => { if (smashable(x, y)) { baseBreak.call(this, x, y); if (!solidId(WD.get(x, y))) placed.delete(WD.idx(x, y)); } });
        RW.fx.shake(2.5, 0.15);
      }
      return r;
    } finally { depth--; }
  };

  const baseMine = P.mineTile;
  P.mineTile = function (tx, ty) {
    const i = WD.inb(tx, ty) ? WD.idx(tx, ty) : -1;
    if (i >= 0 && i === S.hold) { P.mine = null; return; } // you just put it there and haven't let go of the button
    const isPlaced = i >= 0 && placed.has(i);
    S.deliberate = i; S.ctxPlaced = isPlaced;
    if (P.species === 'rock' && !isPlaced) {
      S.smash = { tx, ty, done: false, area: null };
      if ((RW.v3mine2On ? RW.v3mine2On() : false) && smashable(tx, ty)) { // 2x2 mode (T): a 2x2 square, toward the side of the block the mouse is on
        const m = RW.mouseWorld ? RW.mouseWorld() : { x: tx * TS + 8, y: ty * TS + 8 };
        const sx = m.x / TS - tx >= 0.5 ? 1 : -1, sy = m.y / TS - ty >= 0.5 ? 1 : -1;
        S.smash.area = [[tx + sx, ty], [tx, ty + sy], [tx + sx, ty + sy]];
        if (RW.v2runes && RW.v2runes.tier() >= 14) { S.smash.area = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) S.smash.area.push([tx + dx, ty + dy]); } // the Abyssite rune: 3x3
      }
    }
    try { return baseMine.apply(this, arguments); }
    finally { S.deliberate = -1; S.ctxPlaced = false; S.smash = null; }
  };
  const baseActions = P.actions;
  P.actions = function () {
    if (!RW.input.act('attack')) S.hold = -1;
    return baseActions.apply(this, arguments);
  };

  // =====================================================================================================
  // 4. THE ROCK FLOATS OR SINKS (C)
  // =====================================================================================================
  if (!RW.ACTIONS.some((a) => a[0] === 'float')) {
    const at = RW.ACTIONS.findIndex((a) => a[0] === 'drop');
    RW.ACTIONS.splice(at + 1, 0, ['float', 'Rock: float up or sink in water', ['KeyC']]);
    if (!RW.binds.float) RW.binds.float = ['KeyC'];
  }
  P.rockFloat = !!RW.store.get('v2_rockfloat', false);
  const baseMove = E.move;
  E.move = function (o, dt) {
    if (o !== P || P.species !== 'rock' || !P.water || P.climbing || !P.rockFloat || P.dead) return baseMove.apply(this, arguments);
    const I = RW.input, typing = U.blocking && U.blocking();
    const dir = typing ? 0 : (I.act('right') ? 1 : 0) - (I.act('left') ? 1 : 0), dive = !typing && I.act('down');
    const top = 70, now = performance.now();
    if (!S.fl || now - S.fl.at > 300) S.fl = { vx: P.vx, vy: Math.min(P.vy, 110) }; // the base step already pulled him down: keep our own speeds
    S.fl.at = now;
    S.fl.vx += RW.clamp(dir * top - S.fl.vx, -top * 4 * dt, top * 4 * dt);
    S.fl.vy += RW.clamp((dive ? 90 : -85) - S.fl.vy, -260 * dt, 260 * dt);
    P.vx = S.fl.vx; P.vy = S.fl.vy;
    const c = P.climbing; P.climbing = true; // straight to the plain physics step: no sinking this frame
    try { return baseMove.apply(this, arguments); } finally { P.climbing = c; }
  };
  const baseActions2 = P.actions;
  P.actions = function () {
    const r = baseActions2.apply(this, arguments);
    if (P.species === 'rock' && RW.input.actHit('float') && !(U.blocking && U.blocking())) {
      P.rockFloat = !P.rockFloat; RW.store.set('v2_rockfloat', P.rockFloat);
      toast(P.rockFloat ? 'Floating: you drift up in water. Hold S to dive. Press C to sink again.' : 'Sinking: you walk the bottom like a stone. Press C to float.');
      RW.audio.sfx('ui');
    }
    return r;
  };

  // =====================================================================================================
  // 5. THE BAG: THE HOTBAR STANDS OUT
  // =====================================================================================================
  const css = document.createElement('style');
  css.textContent = [
    '#invgrid .slot.hot { background: #2a2136; border-color: #b0883a; box-shadow: inset 0 0 0 1px rgba(255,210,120,.18); }',
    '#invgrid .slot.hot.sel { border-color: var(--ember); box-shadow: 0 0 0 2px var(--ember), inset 0 0 12px rgba(255,179,71,.35); }',
    '#invgrid .slot.hot .k { color: #ffd98a; font-weight: bold; }',
    '#invgrid .v2sep { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; margin: 4px 0 2px; color: var(--muted); font-family: var(--small); font-size: 12px; letter-spacing: .08em; }',
    '#invgrid .v2sep::after { content: ""; flex: 1; height: 1px; background: var(--edge); }',
    '#invgrid .v2hb { grid-column: 1 / -1; color: #ffd98a; font-family: var(--small); font-size: 12px; letter-spacing: .08em; }',
  ].join('\n');
  document.head.appendChild(css);
  const baseRenderInv = U.renderInv;
  U.renderInv = function () {
    const r = baseRenderInv.apply(this, arguments);
    const g = document.getElementById('invgrid'); if (!g) return r;
    const slots = Array.from(g.children).filter((c) => c.classList.contains('slot'));
    slots.slice(0, 10).forEach((s, i) => { if (!s.querySelector('.k')) { const k = document.createElement('span'); k.className = 'k'; k.textContent = String((i + 1) % 10); s.appendChild(k); } });
    if (slots.length > 10 && !g.querySelector('.v2sep')) {
      const hb = document.createElement('div'); hb.className = 'v2hb'; hb.textContent = 'HOTBAR · keys 1 to 0 · what you can hold and use';
      g.insertBefore(hb, slots[0]);
      const sep = document.createElement('div'); sep.className = 'v2sep'; sep.textContent = 'BAG';
      g.insertBefore(sep, slots[10]);
      const lab = g.previousElementSibling; if (lab && lab.classList.contains('label')) lab.hidden = true;
    }
    return r;
  };
})(window.RW);
