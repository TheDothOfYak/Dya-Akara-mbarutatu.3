/* ============================================================
   SKAAR UVERKHRON — js/ui.js
   The adventure-map controller and the small UI kit: the top
   bar, the side panel, selecting and moving armies, tooltips,
   toasts and modal dialogs. Dialog contents live in dialogs.js.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, RU = SU.rules, A = SU.art, V = SU.mapView;
  const U = SU.ui = { selected: null, viewer: 0, busy: false, fast: false };
  const $ = id => document.getElementById(id);

  /* ======================= tiny DOM kit ======================= */
  U.el = function (tag, attrs, kids) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'cls') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v); else e.setAttribute(k, v);
    });
    (Array.isArray(kids) ? kids : kids != null ? [kids] : []).forEach(k => { if (k == null || k === false) return; e.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k); });
    return e;
  };
  const el = U.el;
  U.btn = (text, fn, cls, title) => el('button', { cls: 'btn ' + (cls || ''), onclick: fn, title, type: 'button' }, text);
  U.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /* modal dialogs: a stack, Esc closes the top one */
  const stack = [];
  U.modal = function (content, opts) {
    opts = opts || {};
    const box = el('div', { cls: 'panel dlg ' + (opts.wide ? 'wide' : '') }, content);
    const ov = el('div', { cls: 'overlay' }, box);
    ov.addEventListener('mousedown', e => { if (e.target === ov && opts.dismiss !== false) close(); });
    document.body.appendChild(ov);
    const h = { ov, box, close, onClose: opts.onClose };
    function close(v) { const i = stack.indexOf(h); if (i >= 0) stack.splice(i, 1); ov.remove(); if (h.onClose) h.onClose(v); }
    stack.push(h);
    return h;
  };
  function prune() { for (let i = stack.length - 1; i >= 0; i--) if (!stack[i].ov.isConnected) stack.splice(i, 1); }
  U.closeAll = () => { prune(); while (stack.length) stack[stack.length - 1].close(); };
  U.modalOpen = () => { prune(); return stack.length > 0; };
  U.alert = function (title, text, then, extra) {
    const m = U.modal([el('h2', { text: title }), typeof text === 'string' ? el('p', { text }) : text, extra || null, el('div', { cls: 'acts' }, [U.btn('OK', () => m.close(), 'primary')])], { onClose: then });
    setTimeout(() => { const b = m.box.querySelector('.btn.primary'); if (b) b.focus(); }, 30);
    return m;
  };
  U.confirm = function (title, text, yes, no, labels) {
    const m = U.modal([el('h2', { text: title }), typeof text === 'string' ? el('p', { text }) : text,
      el('div', { cls: 'acts' }, [U.btn((labels && labels[1]) || 'No', () => { m.close(); if (no) no(); }), U.btn((labels && labels[0]) || 'Yes', () => { m.close(); if (yes) yes(); }, 'primary')])], { dismiss: false });
    return m;
  };
  let toastEl = null, toastT = 0;
  U.toast = function (text, ms) {
    if (!toastEl) { toastEl = el('div', { cls: 'panel toast' }); document.body.appendChild(toastEl); }
    toastEl.textContent = text; toastEl.style.opacity = 1; clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.style.opacity = 0, ms || 2600);
  };
  let tipEl = null;
  U.tip = function (html, x, y) {
    if (!tipEl) { tipEl = el('div', { cls: 'panel tip hidden' }); document.body.appendChild(tipEl); }
    if (!html) { tipEl.classList.add('hidden'); return; }
    tipEl.innerHTML = html; tipEl.classList.remove('hidden');
    const r = tipEl.getBoundingClientRect();
    tipEl.style.left = Math.min(window.innerWidth - r.width - 8, x + 14) + 'px'; tipEl.style.top = Math.min(window.innerHeight - r.height - 8, y + 14) + 'px';
  };
  /* hover tooltips on any element with data-tip */
  document.addEventListener('mousemove', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) U.tip(t.getAttribute('data-tip'), e.clientX, e.clientY); else if (tipEl && !U._mapTip) U.tip(null); });

  /* small canvases: icons and portraits */
  U.resIcon = function (res, size) { const c = el('canvas', { width: size * 2, height: size * 2 }); c.style.width = size + 'px'; c.style.height = size + 'px'; A.resIcon(c.getContext('2d'), res, size, size * 1.05, size * 0.95); return c; };
  U.costView = function (cost, P) {
    return el('span', { cls: 'cost' }, Object.entries(cost || {}).filter(([, v]) => v > 0).map(([k, v]) => el('span', { cls: P && (P.res[k] || 0) < v ? 'no' : '' }, [U.resIcon(k, 16), SU.fmt(v)])));
  };
  U.portrait = function (people, look, color, size, opts) {
    size = size || 44; const c = el('canvas', { width: size * 2, height: size * 2 }); c.style.width = size + 'px'; c.style.height = size + 'px';
    const g = c.getContext('2d'); g.scale(2, 2);
    g.fillStyle = A.radial(g, size / 2, size / 2, size * 0.7, A.shade(color || '#4a3a2a', 10), '#120c08'); g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2); g.clip();
    const k = people === 'keilia' ? 1.35 : people === 'karnen' ? 0.8 : 1, face = { keilia: 1.12, karnen: 0.85, kaloeik: 0.9, eikar: 0.9 }[people] || 0.9;
    A.person(g, size * 0.45, size * 0.5 + size * face, size * 1.5 / k, people, { color: color || '#7a2a2a', look, weapon: opts && opts.weapon || 'none', noShadow: true });
    g.restore();
    g.strokeStyle = '#d9b87a'; g.lineWidth = 1.5; g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2); g.stroke();
    return c;
  };
  U.creatureIcon = function (cr, size, opts) {
    const c = el('canvas', { width: size * 2, height: size * 2 }); c.style.width = size + 'px'; c.style.height = size + 'px';
    const g = c.getContext('2d'); g.scale(2, 2); const C = D.CREATURES[cr];
    const big = C.size === 2 || C.tier >= 8 ? 0.62 : C.tier >= 6 ? 0.78 : 0.95;
    A.creature(g, C.art, size * (C.size === 2 ? 0.45 : 0.5), size * (C.fly ? 0.98 : 0.92), size * big, { t: (opts && opts.t) || 0.4, tint: C.tint || (C.upgraded ? 1 : 0), color: opts && opts.color, noShadow: false });
    return c;
  };
  U.captainIcon = function (cap, size, color) {
    const c = el('canvas', { width: size * 2, height: size * 2 }); c.style.width = size + 'px'; c.style.height = size + 'px';
    const g = c.getContext('2d'); g.scale(2, 2); A.captain(g, size * 0.5, size * 0.95, size * 0.82, cap, color || '#7a2a2a', 0.5, 1); return c;
  };
  U.coreIcon = function (kind, size) { const c = el('canvas', { width: size * 2, height: size * 2 }); c.style.width = size + 'px'; c.style.height = size + 'px'; const g = c.getContext('2d'); g.scale(2, 2); A.coreIcon(g, size / 2, size / 2, size * 0.42, 0.6, kind); return c; };
  U.relicIcon = function (rid, size) { const c = el('canvas', { width: size * 2, height: size * 2 }); c.style.width = size + 'px'; c.style.height = size + 'px'; const g = c.getContext('2d'); g.scale(2, 2); A.relicIcon(g, rid, size / 2, size / 2, size * 0.8); return c; };
  U.pips = (lv, max) => '●'.repeat(lv) + '○'.repeat((max || 5) - lv);

  /* ======================= the game on screen ======================= */
  U.start = function (st) {
    U.st = st; U.selected = null; U.busy = false;
    V.setGame(st);
    $('game').classList.remove('hidden');
    V.resize();
    buildLayers();
    U.refresh();
  };
  U.viewerPlayer = () => U.st.players[U.viewer];
  U.myTurn = () => U.st && U.st.current === U.viewer && U.st.players[U.st.current].kind === 'human' && !U.busy && !U.st.over && $('battle').classList.contains('hidden');

  function buildLayers() {
    const box = $('layers'); box.innerHTML = '';
    D.LAYERS.forEach((L, i) => box.appendChild(el('button', { cls: 'btn', 'data-layer': i, onclick: () => { V.setLayer(i); U.refresh(); }, 'data-tip': '<b>' + L.name + '</b><br>' + L.sub }, L.name)));
  }
  U.refresh = function () {
    const st = U.st; if (!st) return;
    const P = U.viewerPlayer();
    /* top bar */
    const tb = $('topbar'); tb.innerHTML = '';
    D.RES.forEach(r => tb.appendChild(el('span', { cls: 'res', 'data-tip': '<b>' + D.RES_INFO[r].name + '</b>' + (D.RES_INFO[r].desc ? '<br>' + D.RES_INFO[r].desc : '') + (r === 'food' && P.lastEat ? '<br>Your people and armies eat about ' + Math.round(P.lastEat) + ' a day.' : '') }, [U.resIcon(r, 20), SU.fmt(P.res[r])])));
    const cal = S.cal(st.day), we = D.WEEK_EVENTS.find(e => e.id === st.weekEvent) || D.WEEK_EVENTS[0];
    tb.appendChild(el('span', { id: 'date', 'data-tip': '<b>' + we.name + '</b><br>' + we.desc + (S.isMarketDay(st) ? '<br><br><b>Market day!</b> Travelling sellers are in every town with a market, and the fair grounds are open.' : '') },
      [S.isMarketDay(st) ? el('span', { cls: 'gold', text: '⚖ Market day · ' }) : null, 'Month ' + cal.month + ', Week ' + cal.week + ', Day ' + cal.dow + (st.players.length > 1 ? ' · ' : ''), st.players.length > 1 ? el('span', { style: { color: st.players[st.current].color }, text: st.players[st.current].name }) : null]));
    /* layers */
    document.querySelectorAll('#layers .btn').forEach(b => b.classList.toggle('on', +b.dataset.layer === V.layer));
    /* lists */
    const hl = $('herolist'); hl.innerHTML = '';
    const mine = Object.values(st.armies).filter(a => !a.dead && a.owner === U.viewer);
    const heroes = mine.filter(a => a.heroId);
    $('herocount').textContent = heroes.length + ' / ' + D.MAX_FIELD_HEROES;
    heroes.forEach(a => { const h = st.heroes[a.heroId];
      hl.appendChild(el('div', { cls: 'litem' + (U.selected === a.id ? ' on' : ''), onclick: () => U.select(a.id, true), ondblclick: () => SU.dialogs.hero(h) },
        [U.portrait(h.people, h.look, P.color, 34), el('div', { style: { flex: 1, minWidth: 0 } }, [el('div', { cls: 'nm', text: h.name }), el('div', { cls: 'small muted', text: 'Level ' + h.level + (a.sleep ? ' · asleep' : '') + (h.levelUps.length ? ' · ★ level up' : '') }), el('div', { cls: 'mpbar' }, el('i', { style: { width: Math.round(100 * a.mp / Math.max(1, a.mpMax)) + '%' } }))])])); });
    const sl = $('squadlist'); sl.innerHTML = '';
    mine.filter(a => !a.heroId).forEach(a => { const cap = S.captainsIn(a.slots)[0];
      sl.appendChild(el('div', { cls: 'litem' + (U.selected === a.id ? ' on' : ''), onclick: () => U.select(a.id, true), ondblclick: () => SU.dialogs.army(a) },
        [cap ? U.captainIcon(cap, 30, P.color) : null, el('div', { style: { flex: 1 } }, [el('div', { cls: 'nm', text: cap ? cap.name + '’s squadron' : 'Squadron' }), el('div', { cls: 'mpbar' }, el('i', { style: { width: Math.round(100 * a.mp / Math.max(1, a.mpMax)) + '%' } }))])])); });
    if (!sl.children.length) sl.appendChild(el('div', { cls: 'small muted', text: 'None. A captain can lead a squadron out of a town without a hero.' }));
    const tl = $('townlist'); tl.innerHTML = '';
    S.townsOf(st, U.viewer).forEach(t => tl.appendChild(el('div', { cls: 'litem', onclick: () => { V.centerOn(t.layer, t.x, t.y - 1); U.refresh(); }, ondblclick: () => SU.townView.open(t) },
      [el('div', { cls: 'nm', style: { flex: 1 } }, [t.name, el('div', { cls: 'small muted', text: D.LAYERS[t.layer].name + ' · ' + Math.floor(t.pop) + ' people' + (t.builtToday ? '' : ' · can build') })])])));
    $('endturn').disabled = !U.myTurn();
    SU.emit('refresh');
  };

  /* ---------- selecting ---------- */
  U.select = function (id, center) {
    const a = U.st.armies[id]; if (!a) { U.selected = null; V.path = null; U.refresh(); return; }
    U.selected = id; V.path = null;
    if (center) V.centerOn(a.layer, a.x, a.y);
    U.refresh();
  };
  U.selectedArmy = () => { const a = U.selected && U.st.armies[U.selected]; return a && !a.dead && a.owner === U.viewer ? a : null; };
  U.nextArmy = function () {
    const mine = Object.values(U.st.armies).filter(a => !a.dead && a.owner === U.viewer && !a.sleep && a.mp > 60);
    if (!mine.length) { U.toast('Every army has moved. End your turn when you are ready.'); return; }
    const i = mine.findIndex(a => a.id === U.selected);
    U.select(mine[(i + 1) % mine.length].id, true);
  };

  /* ---------- describing a tile ---------- */
  U.describe = function (layer, x, y, full) {
    const st = U.st, L = st.layers[layer]; if (!S.inside(L, x, y)) return '';
    const P = U.viewerPlayer(); if (!P.explored[layer][y * L.w + x]) return 'Unexplored';
    const a = S.armyAt(st, layer, x, y), o = S.objAt(st, layer, x, y) || bodyObj(st, layer, x, y);
    const parts = [];
    if (a) parts.push(armyText(a, full));
    if (o) parts.push(objText(o, full));
    if (!parts.length) parts.push(D.TERRAIN[S.terrainAt(L, x, y)].name + (L.road[y * L.w + x] ? ', road' : '') + (L.ob[y * L.w + x] ? ' (' + obName(L.ob[y * L.w + x]) + ')' : ''));
    if (RU.inEye(st, layer, x, y)) parts.push('The eye of the Sunear’Zikhron');
    else if (RU.inStorm(st, layer, x, y)) parts.push('In the storm');
    return parts.join(' — ');
  };
  function obName(k) { return { 1: 'forest', 2: 'pines', 3: 'mountains', 4: 'rocks', 5: 'dead trees', 6: 'crystals', 7: 'reeds', 8: 'palms', 9: 'glowing trees', 10: 'ridge' }[k] || ''; }
  function bodyObj(st, layer, x, y) { if (!st._block[layer][y * st.layers[layer].w + x]) return null; return Object.values(st.objects).find(o => o.layer === layer && !o.gone && S.footprint(o).some(([dx, dy]) => o.x + dx === x && o.y + dy === y)); }
  U.bodyObj = bodyObj;
  function armyText(a, full) {
    const st = U.st, h = S.heroOf(st, a), slots = S.slotsOf(st, a);
    if (a.owner === U.viewer) return (h ? h.name : 'Your squadron') + (full ? ': ' + S.stacksIn(slots).map(s => s.n + ' ' + D.CREATURES[s.cr].plural).join(', ') : '');
    const cunning = (() => { const mh = Object.values(st.armies).filter(x => x.owner === U.viewer && x.heroId).map(x => S.heroStat(st, st.heroes[x.heroId], 'Cunning')); return mh.length ? Math.max(...mh) : 0; })();
    const who = a.wild ? (a.herd ? 'A herd' : a.mcfly ? 'RubberMcFly' : 'Wild creatures') : (h ? h.name + ' (' + st.players[a.owner].name + ')' : st.players[a.owner].name + '’s squadron');
    const stacks = S.stacksIn(slots).filter(s => s.n > 0);
    const desc = stacks.map(s => (cunning >= 6 ? s.n : S.countWord(s.n)) + ' ' + D.CREATURES[s.cr].plural).join(', ');
    return who + ': ' + desc + (a.guard ? ' (guarding)' : '');
  }
  function objText(o, full) {
    const st = U.st;
    switch (o.type) {
      case 'town': return o.name + (o.owner >= 0 ? ' (' + st.players[o.owner].name + ')' : ' (unclaimed)');
      case 'mine': return D.MINES[o.kind].name + (o.owner >= 0 ? ' (' + st.players[o.owner].name + ')' : '') + ' — ' + D.MINES[o.kind].amt + ' ' + D.RES_INFO[D.MINES[o.kind].res].name + (D.RES_INFO[D.MINES[o.kind].res].common ? ' a day' : ' every other day') + (o.kind === 'ngakara' ? (o.naga && o.naga.alive ? '' : ' (the Naga is dead)') : '');
      case 'urverk': { const open = RU.urverkOpen(st, o), n = RU.urverkNext(st, o), dest = st.objects[o.link];
        const kind = { aligned: 'opens when the worlds line up', toll: 'kept by ' + (o.toll ? o.toll.family : 'a family'), danger: 'a dangerous crossing', always: 'always open', kalo: 'to ' + (o.moon || 'a Kalo') }[o.kind];
        return 'Urverk (' + kind + ') to ' + (dest ? D.LAYERS[dest.layer].name : '?') + ' — ' + (!o.triggerKnown ? 'its trigger is lost' : open ? 'open' + (o.window ? ' for ' + SU.plural(RU.urverkOpenFor(st, o), 'more day') : '') : 'closed, opens in ' + SU.plural(n, 'day')); }
      case 'visit': return D.VISIT[o.kind].name + (full ? ': ' + D.VISIT[o.kind].desc : '') + (o.kind === 'songstone' || o.kind === 'scroll' ? ' (' + D.SONGS[o.song].name + ')' : '');
      case 'pile': return D.RES_INFO[o.res].name;
      case 'chest': return 'A treasure chest';
      case 'relic': return 'A Relic: ' + D.RELICS[o.relic].name;
      case 'scroll': return 'A song scroll: ' + D.SONGS[o.song].name;
      case 'core': { const c = st.cores[o.core]; return 'A memory core' + (c ? ' (' + c.name + ')' : ''); }
      case 'boat': return 'A boat';
      case 'vision': return 'Where the Rokarvac of the Nekh lies';
    }
    return '';
  }

  /* ---------- clicking the map ---------- */
  SU.on('hover', t => { if (!U.st) return; let s = U.describe(V.layer, t.x, t.y);
    const o = S.objAt(U.st, V.layer, t.x, t.y) || bodyObj(U.st, V.layer, t.x, t.y);
    if (o && o.type === 'town' && o.owner === U.viewer) s += o.x === t.x && o.y === t.y ? ' — click to walk a hero in through the gate' : ' — click to open the town';
    $('status').textContent = s || ' '; });
  SU.on('mapinfo', e => {
    if (!U.st) return; const st = U.st;
    const a = S.armyAt(st, V.layer, e.x, e.y);
    if (a && a.owner === U.viewer) { SU.dialogs.army(a); return; }
    const o = S.objAt(st, V.layer, e.x, e.y) || bodyObj(st, V.layer, e.x, e.y);
    if (o && o.type === 'town' && o.owner === U.viewer) { SU.townView.open(o); return; }
    const txt = U.describe(V.layer, e.x, e.y, true);
    if (txt) { U._mapTip = true; U.tip('<b>' + U.esc(txt).replace(' — ', '</b><br>').replace(/ — /g, '<br>') + (txt.indexOf(' — ') < 0 ? '</b>' : ''), e.sx, e.sy); setTimeout(() => { U._mapTip = false; }, 2500); }
  });
  SU.on('mapclick', t => {
    if (!U.st || U.modalOpen() || U.pickTile) return;
    const st = U.st, layer = V.layer, L = st.layers[layer];
    if (!S.inside(L, t.x, t.y)) return;
    const own = S.armyAt(st, layer, t.x, t.y);
    const sel = U.selectedArmy();
    /* clicking your own army: select it (or open its town / army) */
    if (own && own.owner === U.viewer && (!sel || own.id !== sel.id || !U.myTurn())) { U.select(own.id); return; }
    if (own && sel && own.id === sel.id) { const town = S.townAtArmy(st, own); if (town) SU.townView.open(town); else SU.dialogs.army(own); return; }
    const o = S.objAt(st, layer, t.x, t.y) || bodyObj(st, layer, t.x, t.y);
    /* your own castle: clicking the castle opens it; clicking its gate walks a hero in */
    const onGate = o && o.type === 'town' && o.x === t.x && o.y === t.y;
    if (o && o.type === 'town' && o.owner === U.viewer && (!sel || !U.myTurn() || sel.layer !== layer || !onGate)) { SU.townView.open(o); return; }
    if (!sel || !U.myTurn()) return;
    if (sel.layer !== layer) { U.toast('That army is on ' + D.LAYERS[sel.layer].name + '. Go through an Urverk to cross.'); return; }
    let tx = t.x, ty = t.y;
    if (o && o.type === 'town' && (o.x !== tx || o.y !== ty)) { tx = o.x; ty = o.y; }
    if (o && o.type !== 'town' && (o.x !== tx || o.y !== ty)) { tx = o.x; ty = o.y; }
    /* second click on the same destination: go */
    if (V.path && V.path.tx === tx && V.path.ty === ty && V.path.army === sel.id) { U.move(sel, V.path.steps); return; }
    U.preview(sel, tx, ty);
  });
  U.preview = function (a, tx, ty) {
    const st = U.st, p = RU.path(st, a, tx, ty);
    if (!p || !p.length) { V.path = null; U.toast('You cannot reach that from here.'); return; }
    let prev = { x: a.x, y: a.y };
    const steps = p.map(s => { const c = RU.stepCost(st, a, a.layer, prev.x, prev.y, s.x, s.y); prev = s; return { x: s.x, y: s.y, cost: c }; });
    const end = S.armyAt(st, a.layer, tx, ty), eo = S.objAt(st, a.layer, tx, ty);
    let target = end && end.owner !== a.owner && !(end.wild && end.herd) ? 'battle' : eo ? 'visit' : null;
    /* walking next to a guard means a fight there */
    const gi = steps.findIndex((s, i) => i < steps.length - 1 && RU.guardNear(st, a.layer, s.x, s.y));
    if (gi >= 0) { steps.length = gi + 1; target = 'battle'; }
    V.path = { army: a.id, layer: a.layer, tx, ty, steps, mp: a.mp, mpMax: a.mpMax, target };
    const days = (() => { let mp = a.mp, d = 0; steps.forEach(s => { if (mp < s.cost) { d++; mp = a.mpMax; } mp -= s.cost; }); return d; })();
    $('status').textContent = days ? 'That is ' + SU.plural(days + 1, 'day') + ' away. Click again to go.' : 'Click again to go.';
  };
  U.move = function (a, steps) {
    const st = U.st; let i = 0, pending = null;
    V.path = null; U.busy = true; a.sleep = false;
    V.walk(a, () => {
      if (pending) return { stop: true, res: pending };
      if (i >= steps.length || a.dead) return { stop: true };
      const s = steps[i++];
      const r = RU.step(st, a, s.x, s.y);
      if (r.moved) { if (r.stop || r.event || r.need || r.msg) pending = r; return { next: [s.x, s.y] }; }
      return { stop: true, res: r };
    }, end => {
      U.busy = false;
      const r = end && end.res;
      U.refresh();
      if (r) U.handle(a, r);
      if (i < steps.length && !(r && (r.event || r.need)) && a.mp < 60) {} // tired: the rest waits for tomorrow
    });
  };

  /* ---------- what happened when we got there ---------- */
  U.handle = function (a, r) {
    if (!r) return;
    const st = U.st;
    if (r.why === 'tired') { U.toast('This army has no movement left today.'); return; }
    if (r.msg) U.toast(r.msg, 3600);
    if (r.need) SU.dialogs.need(a, r);
    const ev = r.event; if (!ev) { U.refresh(); return; }
    switch (ev.kind) {
      case 'battle': SU.game.battle({ attacker: ev.attacker, defender: ev.defender, temp: ev.temp }); break;
      case 'siege': SU.game.siege(ev.attacker, ev.town); break;
      case 'town': SU.townView.open(ev.obj, a); break;
      case 'captured': U.alert('Taken', 'You have taken ' + ev.obj.name + ' without a fight.', () => SU.townView.open(ev.obj, a)); break;
      case 'meet': SU.dialogs.exchange(a, ev.other); break;
      case 'herd': SU.dialogs.herd(a, ev.other); break;
      case 'urverk': SU.dialogs.urverk(a, ev.obj); break;
      case 'flagged': U.toast('The ' + D.MINES[ev.obj.kind].name + ' is yours.'); V.invalidate(); break;
    }
    U.refresh();
  };

  /* ---------- buttons and keys ---------- */
  function wire() {
    $('b-next').onclick = () => U.nextArmy();
    $('b-sleep').onclick = () => { const a = U.selectedArmy(); if (a) { a.sleep = !a.sleep; U.toast(a.sleep ? 'Asleep until you wake it.' : 'Awake.'); U.refresh(); } };
    $('b-songs').onclick = () => { const a = U.selectedArmy(); if (a && a.heroId) SU.dialogs.mapSongs(a); else U.toast('Select a hero first.'); };
    $('b-hero').onclick = () => { const a = U.selectedArmy(); if (a && a.heroId) SU.dialogs.hero(U.st.heroes[a.heroId]); else if (a) SU.dialogs.army(a); else U.toast('Select a hero first.'); };
    $('b-kingdom').onclick = () => SU.dialogs.kingdom();
    $('b-menu').onclick = () => SU.game.menu();
    $('endturn').onclick = () => SU.game.endTurn();
    SU.on('key', e => {
      if (U.modalOpen()) { if (e.key === 'Escape') { const top = stack[stack.length - 1]; if (top) top.close(); } return; }
      if (!document.getElementById('town').classList.contains('hidden') || !document.getElementById('battle').classList.contains('hidden')) { SU.emit('screenkey', e); return; }
      if (!U.st || $('game').classList.contains('hidden')) return;
      const k = e.key.toLowerCase();
      if (k === 'e' && U.myTurn()) SU.game.endTurn();
      else if (k === 'n') U.nextArmy();
      else if (k === 'h') $('b-hero').click();
      else if (k === 'k') SU.dialogs.kingdom();
      else if (k === 'q') $('b-songs').click();
      else if (k === 'z') $('b-sleep').click();
      else if (k === ' ' || k === 'enter') { const a = U.selectedArmy(); if (a && V.path && V.path.army === a.id) U.move(a, V.path.steps); }
      else if (k === 'escape') SU.game.menu();
      else if (k >= '1' && k <= '4') { V.setLayer(+k - 1); U.refresh(); }
    });
    SU.on('log', () => {});
    SU.on('lost', e => { if (e.owner === U.viewer) U.toast('You lost ' + e.what + '!', 4000); });
    /* the eye's vision: shown when the player whose turn it was is watching */
    SU.on('vision', e => { if (!U.st || e.owner !== U.viewer) return; U._pendingVision = e.obj; });
  }
  document.addEventListener('DOMContentLoaded', wire);
})(typeof window !== 'undefined' ? window : globalThis);
