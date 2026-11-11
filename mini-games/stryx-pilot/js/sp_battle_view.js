/* ============================================================
   STRYX PILOT — js/sp_battle_view.js
   The boarding battle screen. Both hulls side by side under the
   open sky, gangplanks and vines across the gap, every stack a
   little figure with its count beside it, an initiative bar along
   the bottom, and your Stryx's orders to hand. Point at a stack to
   see what an attack would do; the side you point from is the side
   you attack from.
   ============================================================ */
(function () {
  'use strict';
  const SP = window.SP, FX = window.FX, B = SP.Battle;
  const TAU = Math.PI * 2;
  const $ = id => document.getElementById(id);
  const V = SP.battleView = {};
  let S = null, opts = null, cv = null, ctx = null, W = 0, H = 0, DPR = 1, raf = 0;
  let anim = [], animT = 0, cur = null, hover = null, pending = 0, casting = null, auto = false, popups = [], shownWinner = false;
  const pos = {};           // unit id → drawn position (for tweening)
  const fade = {};          // unit id → death fade
  const flash = {};

  /* ---------------- geometry ---------------- */
  let HS = 30, OX = 0, OY = 0;     // hex size and offset
  const SQ = 0.78;                  // squash the grid a little, for a deck seen from above and in front
  function hexXY(c, r) { const w = Math.sqrt(3) * HS; return [OX + c * w + (r & 1 ? w / 2 : 0), OY + r * HS * 1.5 * SQ]; }
  function pickHex(x, y) {
    let best = null, bd = 1e9;
    for (let c = 0; c < B.COLS; c++) for (let r = 0; r < B.ROWS; r++) { const [hx, hy] = hexXY(c, r); const d = Math.hypot(hx - x, (hy - y) / SQ); if (d < bd) { bd = d; best = [c, r]; } }
    return bd < HS * 1.05 ? best : null;
  }
  function layout() {
    const r = cv.getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const top = 70, bottom = 120;
    HS = Math.min((W - 40) / (Math.sqrt(3) * (B.COLS + 0.5)), (H - top - bottom) / ((B.ROWS - 1) * 1.5 * SQ + 2.2));
    const gw = Math.sqrt(3) * HS * (B.COLS + 0.5), gh = (B.ROWS - 1) * 1.5 * HS * SQ;
    OX = (W - gw) / 2 + Math.sqrt(3) * HS / 2; OY = top + (H - top - bottom - gh) / 2 + HS * 0.6;
  }
  function hexPath(x, y, s) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s * SQ; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }

  /* ---------------- open and close ---------------- */
  /* o: { S, title, foeName, foeShip, onEnd(result) } */
  V.open = function (o) {
    opts = o; S = o.S; cv = $('bcv'); ctx = cv.getContext('2d');
    anim = []; popups = []; casting = null; auto = false; shownWinner = false; pending = 0;
    Object.keys(pos).forEach(k => delete pos[k]); Object.keys(fade).forEach(k => delete fade[k]);
    S.units.forEach(u => { pos[u.id] = hexXY(u.c, u.r); });
    $('battle').classList.remove('hidden');
    $('bTitle').textContent = o.title || 'Boarding!';
    $('bResult').classList.add('hidden');
    layout(); S.units.forEach(u => { pos[u.id] = hexXY(u.c, u.r); });
    takeEvents();
    buildButtons();
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame);
  };
  V.close = function () { cancelAnimationFrame(raf); $('battle').classList.add('hidden'); S = null; };
  V.isOpen = () => !!S;

  function buildButtons() {
    const bar = $('bButtons'); bar.innerHTML = '';
    const mk = (txt, fn, id, title) => { const b = document.createElement('button'); b.className = 'btn small'; b.textContent = txt; b.type = 'button'; if (id) b.id = id; if (title) b.title = title; b.addEventListener('click', fn); bar.appendChild(b); return b; };
    mk('⏳ Wait (W)', () => mine() && act({ t: 'wait' }), 'bWait', 'Act later this round');
    mk('🛡 Defend (D)', () => mine() && act({ t: 'defend' }), 'bDef', 'Stand ready: harder to hurt until your next turn');
    mk('🌿 Orders (O)', toggleOrders, 'bOrd', 'Your Stryx gives one order a round');
    mk('⚙ Auto (A)', () => { auto = !auto; $('bAuto').classList.toggle('on', auto); }, 'bAuto', 'Let your crew fight on their own');
    mk('✂ Cut the vines', () => { if (confirm('Cut the vines and pull away? The battle is lost, but your ship gets clear.')) { B.retreat(S); takeEvents(); } }, 'bFlee', 'Retreat');
  }
  let ordersSig = '';
  function toggleOrders() {
    const box = $('bOrders');
    if (!box.classList.contains('hidden')) { box.classList.add('hidden'); casting = null; return; }
    fillOrders();
  }
  function fillOrders() {
    const box = $('bOrders');
    ordersSig = (mine() ? 1 : 0) + ':' + S.will + ':' + S.castThisRound;
    box.innerHTML = '<div class="small muted">Will ' + S.will + ' of ' + S.maxWill + (S.castThisRound ? ' · already given an order this round' : '') + '</div>';
    SP.ORDERS.forEach(o => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small order';
      b.innerHTML = '<b>' + o.name + '</b> · ' + o.will + ' will<br><span class="muted">' + o.about + '</span>';
      b.disabled = !B.canCast(S, o) || !mine();
      b.addEventListener('click', () => { casting = o; box.classList.add('hidden'); say('Choose a target for ' + o.name + '.'); });
      box.appendChild(b);
    });
    box.classList.remove('hidden');
  }
  function say(t) { $('bLog').textContent = t; }

  /* ---------------- events → animations ---------------- */
  function takeEvents() {
    while (S.events.length) {
      const e = S.events.shift();
      anim.push(e);
    }
  }
  const nameOf = u => u ? (B.T(u).short || B.T(u).name) + (u.side === 'B' ? ' (theirs)' : '') : '?';
  function popup(x, y, text, col, big) { popups.push({ x, y, text, col, t: 0, big }); }
  function stepAnim(dt) {
    if (!anim.length) return false;
    const e = anim[0];
    animT += dt;
    const done = () => { anim.shift(); animT = 0; };
    if (e.t === 'move') {
      const per = 0.11, i = Math.min(e.path.length - 1, Math.floor(animT / per)), k = (animT % per) / per;
      const a = hexXY(e.path[i][0], e.path[i][1]), b = e.path[Math.min(e.path.length - 1, i + 1)];
      const bb = hexXY(b[0], b[1]);
      pos[e.id] = [a[0] + (bb[0] - a[0]) * k, a[1] + (bb[1] - a[1]) * k - Math.sin(k * Math.PI) * 4];
      if (animT >= per * (e.path.length - 1)) { const u = B.unit(S, e.id); pos[e.id] = hexXY(u.c, u.r); done(); }
      return true;
    }
    if (e.t === 'hit') {
      if (!e.shown) {
        e.shown = true;
        const a = B.unit(S, e.att), d = B.unit(S, e.def), pa = pos[e.att], pd = pos[e.def];
        if (e.ranged) shots.push({ x: pa[0], y: pa[1] - HS * 0.6, tx: pd[0], ty: pd[1] - HS * 0.5, t: 0, kind: a && B.T(a).duat ? 'knife' : 'stone' });
        else lunge[e.att] = { tx: pd[0], ty: pd[1], t: 0 };
        setTimeout(() => {
          flash[e.def] = 0.4;
          popup(pd[0], pd[1] - HS, '−' + e.dmg + (e.kills ? '  ✝' + e.kills : ''), e.lucky ? '#ffe070' : '#ffb0a0', e.lucky);
          if (e.lucky) popup(pd[0], pd[1] - HS * 1.8, 'Lucky strike!', '#ffe070');
          say(nameOf(a) + (e.retaliation ? ' strike back at ' : e.ranged ? ' shoot ' : ' attack ') + nameOf(d) + ': ' + e.dmg + ' harm' + (e.kills ? ', ' + e.kills + ' fall.' : '.'));
          SFX(e.ranged ? 'shoot' : 'hit');
        }, e.ranged ? 260 : 140);
      }
      if (animT > (e.ranged ? 0.55 : 0.42)) done();
      return true;
    }
    if (e.t === 'miss') { if (!e.shown) { e.shown = true; const d = pos[e.def]; popup(d[0], d[1] - HS, 'passes through!', '#c8d8f0'); } if (animT > 0.4) done(); return true; }
    if (e.t === 'death') { fade[e.id] = fade[e.id] || 0.001; if (animT > 0.25) done(); return true; }
    if (e.t === 'cast' || e.t === 'captain') {
      if (!e.shown) {
        e.shown = true; SFX('cast');
        const t = e.target ? pos[e.target] : null;
        const name = e.t === 'cast' ? (SP.ORDERS.find(o => o.id === e.order) || {}).name : (SP.CAPT_ORDERS.find(o => o.id === e.order) || {}).name;
        say((e.t === 'cast' ? 'Your Stryx: ' : (opts.foeName || 'The captain') + ': ') + name + '!');
        if (t) fx.push({ kind: e.order, x: t[0], y: t[1], t: 0 });
        (e.hits || []).forEach(h => { const p = pos[h.id]; if (p) { flash[h.id] = 0.4; fx.push({ kind: e.order, x: p[0], y: p[1], t: 0 }); if (h.kills) popup(p[0], p[1] - HS, '✝' + h.kills, '#ffb0a0'); } });
        if (e.order === 'step' && e.id) pos[e.id] = hexXY(e.to[0], e.to[1]);
      }
      if (animT > 0.7) done();
      return true;
    }
    if (e.t === 'morale') { if (!e.shown) { e.shown = true; const p = pos[e.id]; popup(p[0], p[1] - HS * 1.4, 'Good morale!', '#b8f090', true); } if (animT > 0.5) done(); return true; }
    if (e.t === 'round') { if (!e.shown) { e.shown = true; popup(W / 2, 46, 'Round ' + e.n, '#ffe2a0', true); } if (animT > 0.35) done(); return true; }
    if (e.t === 'surrender') { if (!e.shown) { e.shown = true; popup(W / 2, H / 2, 'They strike their colours!', '#ffe2a0', true); } if (animT > 1.2) done(); return true; }
    if (e.t === 'wait') { const u = B.unit(S, e.id); say(nameOf(u) + ' wait.'); done(); return true; }
    if (e.t === 'defend') { const u = B.unit(S, e.id); say(nameOf(u) + ' stand ready.'); done(); return true; }
    done(); return true;
  }

  /* ---------------- the player's clicks ---------------- */
  const mine = () => S && !S.winner && !anim.length && B.unit(S, S.turn) && B.unit(S, S.turn).side === 'A' && !auto;
  function act(a) { if (B.act(S, a)) { casting = null; takeEvents(); return true; } return false; }
  /* what a click on this hex would do */
  function intent(c, r, mx, my) {
    const u = B.unit(S, S.turn); if (!u) return null;
    const there = B.at(S, c, r);
    if (casting) {
      if (!there) return null;
      if (casting.target === 'enemy' && there.side !== 'B') return null;
      if ((casting.target === 'ally') && there.side !== 'A') return null;
      return { t: 'cast', id: casting.id, target: there.id };
    }
    const opt = B.options(S, u);
    if (there && there.side === 'B') {
      if (opt.shots.indexOf(there.id) >= 0) return { t: 'shoot', target: there.id, exp: B.expected(S, u, there, true) };
      const ats = opt.attacks.filter(a => a.target === there.id);
      if (!ats.length) return null;
      /* attack from the side the pointer is on */
      let best = ats[0], bd = 1e9;
      ats.forEach(a => { const p = hexXY(a.from[0], a.from[1]); const d = Math.hypot(p[0] - mx, p[1] - my); if (d < bd) { bd = d; best = a; } });
      return { t: 'attack', target: there.id, c: best.from[0], r: best.from[1], exp: B.expected(S, u, there, false) };
    }
    const o = opt.reach[B.key(c, r)];
    if (o && o.d > 0 && !o.through) return { t: 'move', c, r };
    return null;
  }
  function onMove(e) {
    if (!S) return;
    const rc = cv.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
    const h = pickHex(x, y);
    hover = h ? { c: h[0], r: h[1], x, y, it: mine() ? intent(h[0], h[1], x, y) : null } : null;
    const u = h ? B.at(S, h[0], h[1]) : null;
    $('bInfo').innerHTML = u ? info(u) : '';
  }
  function onClick(e) {
    onMove(e);
    if (!mine() || !hover || !hover.it) return;
    const it = hover.it;
    if (it.t === 'cast') { if (B.cast(S, it.id, it.target)) { casting = null; takeEvents(); } return; }
    act(it);
  }
  function info(u) {
    const T = B.T(u);
    return '<b>' + u.n + ' ' + T.name + '</b>' + (u.side === 'B' ? ' <span class="muted">(theirs)</span>' : '') +
      '<br>attack ' + T.atk + ' · defence ' + T.def + (u.defending ? ' (+30%)' : '') + ' · harm ' + T.dmg[0] + '–' + T.dmg[1] + ' · health ' + u.hp + '/' + T.hp + ' · speed ' + B.speed(u) + (T.shots ? ' · shots ' + u.shots : '') +
      (u.rootT > 0 ? ' · <i>bound by roots</i>' : '') + '<br><span class="muted">' + T.about + '</span>';
  }

  /* ---------------- sounds (small ones) ---------------- */
  let AC = null;
  function SFX(k) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain();
      const p = { hit: [160, 0.12, 'square', 90], shoot: [700, 0.1, 'triangle', 1200], cast: [420, 0.4, 'sine', 900], win: [523, 0.6, 'triangle', 1046] }[k] || [300, 0.1, 'sine', 300];
      o.type = p[2]; o.frequency.value = p[0]; o.frequency.exponentialRampToValueAtTime(p[3], AC.currentTime + p[1]);
      g.gain.value = 0.04; g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + p[1]);
      o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + p[1]);
    } catch (e) { /* no sound */ }
  }

  /* ---------------- the loop ---------------- */
  let last = 0;
  const shots = [], lunge = {}, fx = [];
  function frame(t) {
    if (!S) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    const busy = stepAnim(dt);
    if (!busy) {
      takeEvents();
      if (!anim.length && !S.winner) {
        const u = B.unit(S, S.turn);
        if (u && (u.side === 'B' || auto)) { pending += dt; if (pending > (auto ? 0.25 : 0.45)) { pending = 0; B.aiStep(S); takeEvents(); } }
        else pending = 0;
      }
      if (!anim.length && S.winner && !shownWinner) { shownWinner = true; setTimeout(showResult, 500); }
    }
    draw(t / 1000, dt);
    queueBar();
    /* the orders panel follows whose turn it is */
    if (!$('bOrders').classList.contains('hidden') && ordersSig !== (mine() ? 1 : 0) + ':' + S.will + ':' + S.castThisRound) fillOrders();
  }

  /* ---------------- drawing ---------------- */
  function draw(now, dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    /* the sky */
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#20285a'); g.addColorStop(0.55, '#5a5a9a'); g.addColorStop(1, '#d8a8a0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) { const x = ((i * 271 + now * 12) % (W + 400)) - 200, y = 30 + (i * 97) % (H * 0.5); FX.orb(ctx, x, y, 90 + (i % 3) * 30, '#ffffff', 0.08); }
    const [lx] = hexXY(-0.6, 3), [mx] = hexXY(B.COLS / 2 - 0.5, 3), [rx] = hexXY(B.COLS - 0.4, 3);
    const top = hexXY(0, 0)[1] - HS * 1.4, bot = hexXY(0, B.ROWS - 1)[1] + HS * 1.5;
    /* the two hulls */
    hull(lx, mx - HS * 0.9, top, bot, '#6b3a22', '#3e1c10', false, now);
    hull(mx + HS * 0.9, rx, top, bot, opts.foeHull || '#3a2a34', '#1a1018', true, now);
    /* the hexes */
    for (let c = 0; c < B.COLS; c++) for (let r = 0; r < B.ROWS; r++) {
      const cell = S.cells[B.key(c, r)], [x, y] = hexXY(c, r);
      if (cell.t === 'gap') { continue; }
      if (cell.t === 'plank') {
        ctx.fillStyle = '#7a5a36'; ctx.fillRect(x - HS * 1.1, y - HS * 0.32, HS * 2.2, HS * 0.64);
        ctx.strokeStyle = '#3a2414'; ctx.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * HS * 0.4, y - HS * 0.32); ctx.lineTo(x + k * HS * 0.4, y + HS * 0.32); ctx.stroke(); }
        ctx.strokeStyle = '#4e7a32'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - HS, y - HS * 0.4); ctx.quadraticCurveTo(x, y - HS * 0.7, x + HS, y - HS * 0.4); ctx.stroke();
      }
      hexPath(x, y, HS * 0.96);
      ctx.strokeStyle = 'rgba(255,240,210,.18)'; ctx.lineWidth = 1; ctx.stroke();
      if (cell.t === 'mast') mast(x, y, c > B.COLS / 2, now);
      if (cell.t === 'crate') crate(x, y);
    }
    /* vines strung across the gap */
    ctx.strokeStyle = 'rgba(78,122,50,.8)'; ctx.lineWidth = 2;
    for (let r = 0; r < B.ROWS; r += 2) { const a = hexXY(B.COLS / 2 - 1.5, r), b = hexXY(B.COLS / 2 + 0.5, r); ctx.beginPath(); ctx.moveTo(a[0], a[1] - HS * 0.8); ctx.quadraticCurveTo((a[0] + b[0]) / 2, a[1] - HS * 0.2, b[0], b[1] - HS * 0.8); ctx.stroke(); }
    /* where the stack whose turn it is can go, and what the pointer would do */
    const u = S.winner ? null : B.unit(S, S.turn);
    if (u && !anim.length) {
      const [ux, uy] = pos[u.id] || hexXY(u.c, u.r);
      hexPath(ux, uy, HS * 0.96); ctx.fillStyle = u.side === 'A' ? 'rgba(255,226,120,.32)' : 'rgba(255,120,120,.28)'; ctx.fill();
      if (u.side === 'A' && !auto) {
        const opt = B.options(S, u);
        if (hover) hover.it = intent(hover.c, hover.r, hover.x, hover.y);
        opt.moves.forEach(o => { const [x, y] = hexXY(o.c, o.r); hexPath(x, y, HS * 0.9); ctx.fillStyle = 'rgba(160,220,255,.14)'; ctx.fill(); });
        if (hover && hover.it && !casting) {
          const it = hover.it;
          if (it.t === 'move' || it.t === 'attack') {
            const reach = opt.reach, p = B.path(reach, it.c, it.r);
            ctx.strokeStyle = 'rgba(255,240,180,.8)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath();
            p.forEach((q, i) => { const [x, y] = hexXY(q[0], q[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
            const [x, y] = hexXY(it.c, it.r); hexPath(x, y, HS * 0.9); ctx.strokeStyle = '#ffe2a0'; ctx.lineWidth = 2; ctx.stroke();
          }
          if (it.t === 'attack' || it.t === 'shoot') {
            const tgt = B.unit(S, it.target), [tx, ty] = pos[tgt.id];
            hexPath(tx, ty, HS * 0.96); ctx.fillStyle = 'rgba(255,90,70,.35)'; ctx.fill();
            const kills = Math.floor(Math.max(0, it.exp - tgt.hp) / B.T(tgt).hp) + (it.exp >= tgt.hp ? 1 : 0);
            const label = (it.t === 'shoot' ? '🏹 ' : '⚔ ') + 'about ' + it.exp + ' harm · kills ~' + Math.min(tgt.n, kills);
            tip(tx, ty - HS * 2.1, label);
          }
        }
        if (casting) S.units.forEach(v => { if (!v.alive) return; const ok = (casting.target === 'enemy' && v.side === 'B') || (casting.target === 'ally' && v.side === 'A') || casting.target === 'area'; if (!ok) return; const [x, y] = pos[v.id]; hexPath(x, y, HS * 0.96); ctx.strokeStyle = 'rgba(180,255,140,' + (0.5 + Math.sin(now * 6) * 0.3) + ')'; ctx.lineWidth = 3; ctx.stroke(); });
      }
    }
    /* the crews, back rows first */
    S.units.slice().sort((a, b) => (pos[a.id] || [0, 0])[1] - (pos[b.id] || [0, 0])[1]).forEach(v => {
      if (!v.alive && !fade[v.id]) return;
      if (fade[v.id]) { fade[v.id] += dt * 1.8; if (fade[v.id] >= 1) return; }
      let [x, y] = pos[v.id] || hexXY(v.c, v.r);
      const L = lunge[v.id];
      if (L) { L.t += dt * 3.2; const k = Math.sin(Math.min(1, L.t) * Math.PI) * 0.35; x += (L.tx - x) * k; y += (L.ty - y) * k; if (L.t >= 1) delete lunge[v.id]; }
      ctx.globalAlpha = fade[v.id] ? 1 - fade[v.id] : 1;
      figure(v, x, y, now);
      ctx.globalAlpha = 1;
      if (v.alive) badge(v, x, y);
    });
    /* missiles, spell effects, numbers */
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.t += dt * 2.6;
      const k = Math.min(1, s.t), x = s.x + (s.tx - s.x) * k, y = s.y + (s.ty - s.y) * k - Math.sin(k * Math.PI) * HS * 1.5;
      if (s.kind === 'knife') { ctx.save(); ctx.translate(x, y); ctx.rotate(s.t * 20); ctx.fillStyle = '#d8d8f0'; ctx.fillRect(-7, -1.5, 14, 3); ctx.restore(); FX.orb(ctx, x, y, 14, '#a080ff', 0.6); }
      else { ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill(); }
      if (s.t >= 1) shots.splice(i, 1);
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt * 1.6; const a = 1 - f.t;
      if (f.kind === 'flare' || f.kind === 'storm') { FX.orb(ctx, f.x, f.y, HS * (1 + f.t * 2), f.kind === 'flare' ? '#ff9a30' : '#a080ff', a * 0.9); }
      else if (f.kind === 'lash' || f.kind === 'roots') { ctx.strokeStyle = 'rgba(120,200,80,' + a + ')'; ctx.lineWidth = 4; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(f.x, f.y, HS * (0.4 + k * 0.15 + f.t * 0.5), k, k + 2.2); ctx.stroke(); } }
      else if (f.kind === 'rally' || f.kind === 'gust') { for (let k = 0; k < 8; k++) { const ang = k / 8 * TAU; FX.orb(ctx, f.x + Math.cos(ang) * HS * f.t, f.y - f.t * HS * 1.4 + Math.sin(ang) * HS * 0.3, 10, f.kind === 'rally' ? '#b8f090' : '#c8e8ff', a); } }
      else FX.orb(ctx, f.x, f.y, HS, '#ffffff', a);
      if (f.t >= 1) fx.splice(i, 1);
    }
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i]; p.t += dt;
      const a = Math.min(1, 2 - p.t * 1.4);
      ctx.globalAlpha = Math.max(0, a); ctx.font = (p.big ? 'bold 26px' : 'bold 15px') + ' Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(p.text, p.x + 1, p.y - p.t * 26 + 1); ctx.fillStyle = p.col; ctx.fillText(p.text, p.x, p.y - p.t * 26);
      ctx.globalAlpha = 1;
      if (p.t > 1.5) popups.splice(i, 1);
    }
    Object.keys(flash).forEach(k => { flash[k] -= dt; if (flash[k] <= 0) delete flash[k]; });
    $('bWill').textContent = 'Will ' + S.will + '/' + S.maxWill;
  }
  function tip(x, y, text) {
    ctx.font = 'bold 13px system-ui'; const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = 'rgba(10,10,30,.85)'; ctx.fillRect(x - w / 2, y - 15, w, 22); ctx.strokeStyle = '#ffe2a0'; ctx.strokeRect(x - w / 2, y - 15, w, 22);
    ctx.fillStyle = '#ffe2a0'; ctx.textAlign = 'center'; ctx.fillText(text, x, y + 1);
  }
  function hull(x0, x1, top, bot, col, dark, foe, now) {
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, FX.shade(col, 0.2)); g.addColorStop(0.5, col); g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.beginPath(); const mid = (top + bot) / 2, w = x1 - x0;
    ctx.moveTo(x0 + w * 0.08, top); ctx.lineTo(x1 - w * 0.08, top);
    ctx.quadraticCurveTo(x1 + w * 0.04, mid, x1 - w * 0.08, bot); ctx.lineTo(x0 + w * 0.08, bot);
    ctx.quadraticCurveTo(x0 - w * 0.04, mid, x0 + w * 0.08, top); ctx.closePath(); ctx.fill();
    /* planks */
    ctx.save(); ctx.clip();
    for (let y = top + 10; y < bot; y += HS * 0.55) { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.strokeStyle = 'rgba(255,220,180,.06)'; ctx.beginPath(); ctx.moveTo(x0, y + 2); ctx.lineTo(x1, y + 2); ctx.stroke(); }
    if (!foe) { ctx.strokeStyle = 'rgba(255,150,60,' + (0.4 + 0.3 * Math.sin(now * 3)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + w * 0.1, bot - 14); ctx.quadraticCurveTo((x0 + x1) / 2, bot - 22, x1 - w * 0.1, bot - 12); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3; ctx.stroke();
    /* the rail */
    ctx.strokeStyle = FX.shade(col, -0.3); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0 + w * 0.08, top); ctx.lineTo(x1 - w * 0.08, top); ctx.stroke();
  }
  function mast(x, y, foe, now) {
    ctx.fillStyle = '#3a2214'; ctx.fillRect(x - 5, y - HS * 4.2, 10, HS * 4.4);
    ctx.fillStyle = foe ? (opts.foeSail || '#4a2a5a') : 'rgba(240,200,90,.85)';
    ctx.beginPath(); ctx.moveTo(x, y - HS * 4); ctx.quadraticCurveTo(x + (foe ? -1 : 1) * HS * (1.6 + Math.sin(now * 2) * 0.1), y - HS * 3, x, y - HS * 1.6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, HS * 0.32, 0, TAU); ctx.fillStyle = '#2a1608'; ctx.fill();
  }
  function crate(x, y) {
    const s = HS * 0.55;
    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(x - s, y - s * 1.3, s * 2, s * 1.6);
    ctx.strokeStyle = '#4a3418'; ctx.lineWidth = 2; ctx.strokeRect(x - s, y - s * 1.3, s * 2, s * 1.6);
    ctx.beginPath(); ctx.moveTo(x - s, y - s * 1.3); ctx.lineTo(x + s, y + s * 0.3); ctx.moveTo(x + s, y - s * 1.3); ctx.lineTo(x - s, y + s * 0.3); ctx.stroke();
  }
  /* a little figure for each kind of fighter */
  function figure(v, x, y, now) {
    const T = B.T(v), s = HS / 30, face = v.side === 'A' ? 1 : -1, look = T.look;
    const bob = Math.sin(now * 3 + v.id) * 1.5 * s;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(face * s, s);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 2, 16, 5, 0, 0, TAU); ctx.fill();
    const fl = flash[v.id] > 0;
    const skin = look === 'kalo' ? '#d8dcef' : look === 'shade' ? 'rgba(200,220,255,.6)' : look === 'stryx' ? '#9a9488' : look === 'dusk' || look === 'duskK' || look === 'captain' && v.side === 'B' ? '#6a5a6a' : '#9a7448';
    const body = fl ? '#ffffff' : T.col;
    if (look === 'shade') { ctx.globalAlpha *= 0.75; const g = ctx.createRadialGradient(0, -18, 2, 0, -14, 22); g.addColorStop(0, 'rgba(220,235,255,.95)'); g.addColorStop(1, 'rgba(140,170,220,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-14, -26, 0, -36); ctx.quadraticCurveTo(14, -26, 10, 0); ctx.quadraticCurveTo(0, -6, -10, 0); ctx.fill(); ctx.fillStyle = '#1a2040'; ctx.fillRect(2, -27, 3, 3); ctx.restore(); return; }
    if (look === 'stryx') {
      ctx.fillStyle = fl ? '#fff' : '#8a847a'; ctx.beginPath(); ctx.ellipse(0, -10, 18, 11, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#aaa496'; ctx.beginPath(); ctx.ellipse(-3, -14, 10, 5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#4e7a32'; ctx.lineWidth = 2.5; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-8 + k * 5, -16); ctx.quadraticCurveTo(-12 + k * 9, -32 + Math.sin(now * 3 + k) * 4, 4 + k * 6, -28); ctx.stroke(); }
      ctx.restore(); return;
    }
    const big = look === 'keilia' ? 1.35 : look === 'captain' ? 1.15 : look === 'karnen' ? 0.85 : 1;
    ctx.scale(big, big);
    /* legs, body */
    ctx.strokeStyle = FX.shade(T.col, -0.4); ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(-5, 0); ctx.moveTo(3, -8); ctx.lineTo(5, 0); ctx.stroke();
    if (look === 'keilia') { ctx.fillStyle = '#4a3a5a'; ctx.beginPath(); ctx.moveTo(-10, -28); ctx.quadraticCurveTo(-14, -6, -8, 0); ctx.lineTo(8, 0); ctx.quadraticCurveTo(12, -10, 8, -28); ctx.fill(); }
    const bg = ctx.createLinearGradient(-8, 0, 8, 0); bg.addColorStop(0, FX.shade(body, 0.2)); bg.addColorStop(1, FX.shade(body, -0.25));
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, -15, 7.5, 10, 0, 0, TAU); ctx.fill();
    /* head */
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, -29, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a0e06'; ctx.fillRect(2.5, -30.5, 2, 2);
    /* hats and hoods */
    if (look === 'eikar' || look === 'karnen') { ctx.fillStyle = look === 'karnen' ? '#c84a3a' : '#6a4a24'; ctx.beginPath(); ctx.ellipse(0, -33, 8.5, 5, 0, Math.PI, TAU); ctx.fill(); if (look === 'eikar') { ctx.fillRect(-0.8, -40, 1.6, 3); } }
    if (look === 'kalo') { ctx.strokeStyle = '#e8ecff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -34, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    if (look === 'dusk' || look === 'duskK') { ctx.fillStyle = fl ? '#fff' : '#2a1a34'; ctx.beginPath(); ctx.moveTo(-8, -26); ctx.quadraticCurveTo(0, -44, 8, -26); ctx.lineTo(5, -24); ctx.lineTo(-5, -24); ctx.fill(); ctx.fillStyle = '#c8a0ff'; ctx.fillRect(1.5, -30, 2, 1.5); }
    if (look === 'bravo' || look === 'gunner') { ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-9, -36, 18, 3); ctx.fillRect(-5, -42, 10, 7); }
    if (look === 'captain') { ctx.fillStyle = '#1a1018'; ctx.beginPath(); ctx.moveTo(-11, -34); ctx.lineTo(0, -44); ctx.lineTo(11, -34); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#c83a3a'; ctx.fillRect(-7, -17, 14, 3); }
    /* what they fight with */
    ctx.strokeStyle = '#c8c8d8'; ctx.lineWidth = 2;
    if (look === 'dusk' || look === 'captain' || look === 'bravo') { ctx.beginPath(); ctx.moveTo(6, -16); ctx.quadraticCurveTo(16, -22, 18, -34); ctx.stroke(); }
    if (look === 'duskK') { for (let k = 0; k < 3; k++) { ctx.save(); ctx.translate(9, -18); ctx.rotate(-0.6 + k * 0.4); ctx.fillStyle = '#d8d8f0'; ctx.fillRect(0, -1, 10, 2); ctx.restore(); } }
    if (look === 'kalo' || look === 'gunner') { ctx.strokeStyle = '#8a6a3a'; ctx.beginPath(); ctx.moveTo(6, -18); ctx.lineTo(12, -30 + Math.sin(now * 4) * 3); ctx.stroke(); ctx.fillStyle = '#bbb'; ctx.beginPath(); ctx.arc(12, -30, 2.5, 0, TAU); ctx.fill(); }
    if (look === 'eikar') { ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(14, -30); ctx.stroke(); }
    if (look === 'karnen') { ctx.strokeStyle = '#b8a070'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-8, -16, 5, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -16); ctx.lineTo(14, -24); ctx.stroke(); }
    if (look === 'keilia') { ctx.fillStyle = fl ? '#fff' : '#9a7a4a'; ctx.fillRect(5, -32, 11, 30); ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 2; ctx.strokeRect(5, -32, 11, 30); ctx.beginPath(); ctx.moveTo(10.5, -32); ctx.lineTo(10.5, -2); ctx.stroke(); }
    ctx.restore();
    if (v.defending) { ctx.strokeStyle = 'rgba(160,200,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - HS * 0.5, HS * 0.7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    if (v.rootT > 0) { ctx.strokeStyle = 'rgba(90,150,60,.9)'; ctx.lineWidth = 2.5; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x, y, HS * (0.4 + k * 0.12), 0.2 + k, 2.4 + k); ctx.stroke(); } }
  }
  function badge(v, x, y) {
    const t = String(v.n); ctx.font = 'bold ' + Math.round(HS * 0.42) + 'px system-ui'; const w = ctx.measureText(t).width + 8, h = HS * 0.5;
    const bx = x + (v.side === 'A' ? HS * 0.35 : -HS * 0.35 - w), by = y - h * 0.2;
    ctx.fillStyle = v.side === 'A' ? '#6a4a1e' : '#5a1e2a'; ctx.fillRect(bx, by, w, h);
    ctx.strokeStyle = v.side === 'A' ? '#ffd890' : '#ff9a9a'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, w, h);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(t, bx + w / 2, by + h * 0.78);
  }
  /* the initiative bar: who goes next */
  let lastQ = '';
  function queueBar() {
    const ids = [S.turn].concat(S.queue).concat(S.waited).filter((id, i, a) => a.indexOf(id) === i).map(id => B.unit(S, id)).filter(u => u && u.alive).slice(0, 12);
    const sig = ids.map(u => u.id + ':' + u.n).join(',') + '|' + S.round;
    if (sig === lastQ) return; lastQ = sig;
    const q = $('bQueue'); q.innerHTML = '';
    ids.forEach((u, i) => {
      const d = document.createElement('div'); d.className = 'qi ' + (u.side === 'A' ? 'mine' : 'foe') + (i === 0 ? ' now' : '');
      d.innerHTML = '<b>' + u.n + '</b> ' + (B.T(u).short || B.T(u).name) + '<br><span>spd ' + B.speed(u) + '</span>';
      q.appendChild(d);
    });
  }

  /* ---------------- the end ---------------- */
  function showResult() {
    const box = $('bResult'); box.innerHTML = ''; box.classList.remove('hidden');
    const won = S.winner === 'A';
    if (won) SFX('win');
    const lost = {};
    S.units.filter(u => u.side === 'A').forEach(u => { lost[u.type] = (lost[u.type] || 0) + (u.n0 - u.n); });
    const lossText = Object.keys(lost).filter(k => lost[k] > 0).map(k => lost[k] + ' ' + SP.UNITS[k].short).join(', ');
    const h = document.createElement('h2'); h.textContent = S.fled ? 'You cut the vines' : S.surrendered ? 'They strike their colours!' : won ? 'Victory!' : 'Your crew is beaten';
    box.appendChild(h);
    const p = document.createElement('p'); p.textContent = (won ? 'The ' + (opts.foeShip || 'ship') + ' is yours to take.' : S.fled ? 'You pulled clear. The pirates keep their ship.' : 'The pirates hold their deck and throw your vines back across.') + (lossText ? ' You lost ' + lossText + '.' : ' You lost nobody.');
    box.appendChild(p);
    const choices = document.createElement('div'); choices.className = 'row';
    const done = (r) => { V.close(); opts.onEnd(r); };
    const join = S.joiners;
    let takeJoin = !!join;
    if (won && join) {
      const jp = document.createElement('label'); jp.className = 'small';
      jp.innerHTML = '<input type="checkbox" checked> ' + join.n + ' ' + SP.UNITS[join.type].name + ' offer to sign on with you';
      jp.querySelector('input').addEventListener('change', e => { takeJoin = e.target.checked; });
      box.appendChild(jp);
    }
    const mk = (t, fn, cls) => { const b = document.createElement('button'); b.className = 'btn ' + (cls || ''); b.textContent = t; b.type = 'button'; b.addEventListener('click', fn); choices.appendChild(b); };
    if (won) {
      mk('Take her into your fleet', () => done({ won: true, take: true, joiners: takeJoin ? join : null }), 'primary');
      mk('Strip her for loot and let her go', () => done({ won: true, take: false, joiners: takeJoin ? join : null }));
    } else mk('Back to the sky', () => done({ won: false, fled: !!S.fled }), 'primary');
    box.appendChild(choices);
  }

  /* ---------------- input wiring ---------------- */
  window.addEventListener('resize', () => { if (S) { layout(); S.units.forEach(u => { pos[u.id] = hexXY(u.c, u.r); }); } });
  window.addEventListener('keydown', e => {
    if (!S || $('battle').classList.contains('hidden')) return;
    const k = e.key.toLowerCase();
    if (k === 'w') mine() && act({ t: 'wait' });
    if (k === 'd') mine() && act({ t: 'defend' });
    if (k === 'o') toggleOrders();
    if (k === 'a') { auto = !auto; $('bAuto').classList.toggle('on', auto); }
    if (k === 'escape') { casting = null; $('bOrders').classList.add('hidden'); }
    e.stopImmediatePropagation();
  }, true);
  setTimeout(() => {
    const c = $('bcv'); if (!c) return;
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerdown', onClick);
  }, 0);
})();
