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
  document.addEventListener('mousemove', e => { if (U._pinned) return; const t = e.target.closest && e.target.closest('[data-tip]'); if (t) U.tip(t.getAttribute('data-tip'), e.clientX, e.clientY); else if (tipEl && !U._mapTip) U.tip(null); });
  /* right-click: a creature opens its card; anything else with a tip keeps the tip up until the next click */
  document.addEventListener('contextmenu', e => {
    const c = e.target.closest && e.target.closest('[data-cr]');
    if (c) { e.preventDefault(); U.tip(null); SU.dialogs.creatureCard(c.getAttribute('data-cr')); return; }
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t) { e.preventDefault(); U.tip(t.getAttribute('data-tip'), e.clientX, e.clientY); U._pinned = true; if (tipEl) tipEl.classList.add('pinned'); }
  });
  document.addEventListener('mousedown', e => { if (U._pinned && e.button === 0) { U._pinned = false; if (tipEl) tipEl.classList.remove('pinned'); U.tip(null); } }, true);

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
  /* a small keep picture for the bottom bar */
  function keepIcon(color) { const c = el('canvas', { width: 88, height: 88 }); c.style.width = '44px'; c.style.height = '44px'; const g = c.getContext('2d'); g.scale(2, 2);
    g.fillStyle = A.radial(g, 22, 26, 30, '#3a3150', '#120c14'); g.fillRect(0, 0, 44, 44); A.keep(g, { owner: 0, faction: 'duskareth' }, 6, 4, 28, 0.5, color); return c; }
  const TOWN_PICS = {};
  U.townIcon = function (t, size, color) {
    const c = el('canvas', { width: size * 2, height: size * 2 }); c.style.width = size + 'px'; c.style.height = size + 'px';
    const g = c.getContext('2d'); g.scale(2, 2);
    g.fillStyle = A.radial(g, size / 2, size * 0.6, size * 0.7, '#3a3150', '#120c14'); g.fillRect(0, 0, size, size);
    /* draw the castle large, find where it is, and shrink it to fit */
    const lvl = t.built.join(','), key = lvl + color;
    let pic = TOWN_PICS[key];
    if (!pic) { const SW = 400, big = A.canvas(SW, SW), bg = big.getContext('2d'); try { A.town(bg, t, SW / 2 - 40, SW * 0.7, 80, 0.5, color); } catch (e) {}
      const d = bg.getImageData(0, 0, SW, SW).data; let x0 = SW, y0 = SW, x1 = 0, y1 = 0;
      for (let y = 0; y < SW; y += 2) for (let x = 0; x < SW; x += 2) if (d[(y * SW + x) * 4 + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      pic = TOWN_PICS[key] = { cv: big, x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }; }
    const k = Math.min((size - 4) / pic.w, (size - 4) / pic.h);
    g.drawImage(pic.cv, pic.x, pic.y, pic.w, pic.h, size / 2 - pic.w * k / 2, size - 2 - pic.h * k, pic.w * k, pic.h * k);
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
    if (S.fillPockets) S.fillPockets(st);    /* walled-in patches nobody can reach become part of the range or wood around them */
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
    D.LAYERS.forEach((L, i) => box.appendChild(el('button', { cls: 'btn', 'data-layer': i, onclick: () => { if (V.worlds) V.showWorlds(false); V.setLayer(i); U.refresh(); }, 'data-tip': '<b>' + L.name + '</b><br>' + L.sub + '<br><i class="muted">Key ' + (i + 1) + '</i>' }, i === 3 ? 'Kalo' : L.name)));
    box.appendChild(el('button', { cls: 'btn worlds', id: 'b-worlds', onclick: () => { V.showWorlds(!V.worlds); U.refresh(); }, 'data-tip': '<b>The worlds</b><br>All three Tatu and their moons, turning, with the Urverk between them. (Or scroll all the way out.) Key W.' }, '☉ Worlds'));
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
    document.querySelectorAll('#layers .btn[data-layer]').forEach(b => b.classList.toggle('on', !V.worlds && +b.dataset.layer === V.layer));
    if ($('b-worlds')) $('b-worlds').classList.toggle('on', !!V.worlds);
    /* lists */
    const hl = $('herolist'); hl.innerHTML = '';
    const mine = Object.values(st.armies).filter(a => !a.dead && a.owner === U.viewer && !a.caravan);
    const heroes = mine.filter(a => a.heroId);
    $('herocount').textContent = heroes.length + ' / ' + D.MAX_FIELD_HEROES;
    /* the roster, as the old games had it: portraits on the left (movement and Breath beside each), towns on the right */
    const bars = (mp, br) => el('div', { cls: 'vbars' }, [el('div', { cls: 'vbar mp', 'data-tip': 'Movement left today' }, el('i', { style: { height: Math.round(100 * mp) + '%' } })), br == null ? null : el('div', { cls: 'vbar br', 'data-tip': 'Breath' }, el('i', { style: { height: Math.round(100 * br) + '%' } }))]);
    heroes.forEach(a => { const h = st.heroes[a.heroId];
      hl.appendChild(el('div', { cls: 'rtile' + (U.selected === a.id ? ' on' : '') + (a.sleep ? ' asleep' : ''), onclick: () => { U.selTown = null; U.select(a.id, true); }, ondblclick: () => SU.dialogs.hero(h),
        'data-tip': '<b>' + U.esc(h.name) + '</b><br>Level ' + h.level + (a.sleep ? ' · asleep' : '') + (h.levelUps.length ? ' · ★ level up' : '') + '<br><i class="muted">Click to pick · double-click for the hero</i>' },
        [U.portrait(h.people, h.look, P.color, 44), bars(a.mp / Math.max(1, a.mpMax), h.breath / Math.max(1, SU.make.breathMax(st, h))), h.levelUps.length ? el('span', { cls: 'rstar', text: '★' }) : null])); });
    mine.filter(a => !a.heroId).forEach(a => { const cap = S.captainsIn(a.slots)[0];
      hl.appendChild(el('div', { cls: 'rtile sq' + (U.selected === a.id ? ' on' : ''), onclick: () => { U.selTown = null; U.select(a.id, true); }, ondblclick: () => SU.dialogs.army(a),
        'data-tip': '<b>' + U.esc(cap ? cap.name + '’s squadron' : 'A squadron') + '</b><br><i class="muted">Click to pick · double-click for the squadron</i>' },
        [cap ? U.captainIcon(cap, 44, P.color) : el('div', { style: { width: '44px' } }), bars(a.mp / Math.max(1, a.mpMax), null)])); });
    const tl = $('townlist'); tl.innerHTML = '';
    S.townsOf(st, U.viewer).forEach(t => tl.appendChild(el('div', { cls: 'rtile town' + (U.selTown === t.id ? ' on' : ''), onclick: () => { U.selTown = t.id; U.selected = null; V.path = null; V.centerOn(t.layer, t.x, t.y - 1); if (V.layer !== t.layer) V.setLayer(t.layer); U.refresh(); }, ondblclick: () => SU.townView.open(t),
      'data-tip': '<b>' + U.esc(t.name) + '</b><br>' + D.LAYERS[t.layer].name + ' · ' + Math.floor(t.pop) + ' people' + (t.builtToday ? '' : ' · can build today') + '<br><i class="muted">Click to pick · double-click to go in</i>' },
      [U.townIcon(t, 44, P.color), t.builtToday ? null : el('span', { cls: 'rstar', text: '⚒', 'data-tip': 'Can build today' })])));
    Object.values(st.objects).filter(o => o.type === 'keep' && o.owner === U.viewer && !o.gone).forEach(k => tl.appendChild(el('div', { cls: 'rtile town', onclick: () => { V.centerOn(k.layer, k.x, k.y - 1); U.refresh(); }, ondblclick: () => SU.talk.keep(null, k),
      'data-tip': '<b>' + U.esc(k.name) + '</b>, a keep<br>' + S.armySize(k.garrison) + ' in its garrison<br><i class="muted">Click to look · double-click to see its garrison</i>' }, [keepIcon(P.color)])));
    /* what is picked: its army, or the town's garrison */
    const si = $('selinfo'); if (si) { si.innerHTML = '';
      const sa = U.selectedArmy(), stn = U.selTown && st.objects[U.selTown];
      const row = slots => el('div', { cls: 'si-row' }, S.stacksIn(slots).filter(s => s.n > 0).slice(0, 8).map(s => el('div', { cls: 'si-st', 'data-cr': s.cr, 'data-tip': D.CREATURES[s.cr].plural + ': ' + s.n }, [U.creatureIcon(s.cr, 30, { color: P.color }), el('span', { text: String(s.n) })])));
      const regLine = (layer, x, y) => { const r = SU.realm && SU.realm.regionAt(st, layer, x, y); return r ? el('div', { cls: 'reg', text: 'In ' + r.name + (r.owner === U.viewer ? ' (yours)' : r.owner >= 0 ? ' (' + st.players[r.owner].name + '’s)' : ' (held by nobody)') }) : null; };
      if (stn && stn.owner === U.viewer) si.appendChild(el('div', {}, [el('b', { cls: 'gold', text: stn.name }), el('div', { cls: 'small muted', text: '+' + RU.townIncome(st, stn).gold + ' gold a day · ' + Math.floor(stn.pop) + ' people' }), S.stacksIn(stn.garrison).length ? row(stn.garrison) : el('div', { cls: 'small muted', text: 'No garrison.' })]));
      else if (sa) { const h = S.heroOf(st, sa), cap = S.captainsIn(sa.slots)[0];
        si.appendChild(el('div', {}, [el('b', { cls: 'gold', text: h ? h.name : cap ? cap.name + (sa.merc ? '’s mercenaries' : '’s squadron') : 'A squadron' }), el('div', { cls: 'small muted', text: (h ? 'Level ' + h.level + ' · ' : '') + 'Movement ' + Math.round(sa.mp / 10) + ' / ' + Math.round(sa.mpMax / 10) + (h ? ' · Breath ' + Math.round(h.breath) : '') + (sa.merc ? ' · ' + sa.merc.pay + ' gold a day' : '') }), row(S.slotsOf(st, sa)), regLine(sa.layer, sa.x, sa.y)])); }
      else si.appendChild(el('div', { cls: 'small muted', text: 'Pick a hero, squadron or town.' })); }
    $('endturn').disabled = !U.myTurn();
    SU.emit('refresh');
  };

  /* ---------- selecting ---------- */
  U.select = function (id, center) {
    const a = U.st.armies[id]; if (!a) { U.selected = null; V.path = null; U.refresh(); return; }
    U.selected = id; V.path = null; V.hoverMark = null; U._wayKey = null;
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
    if (st.floods && RU.floodAt(st, layer, x, y)) parts.push('Flooded (slow going for a few days)');
    const r = SU.realm && SU.realm.regionAt(st, layer, x, y);
    if (r) parts.push(r.name + (r.owner === U.viewer ? ' (yours)' : r.owner >= 0 ? ' (' + st.players[r.owner].name + '’s)' : ''));
    return parts.join(' — ');
  };
  function obName(k) { return { 1: 'forest', 2: 'pines', 3: 'mountains', 4: 'rocks', 5: 'dead trees', 6: 'crystals', 7: 'reeds', 8: 'palms', 9: 'glowing trees', 10: 'ridge' }[k] || ''; }
  function bodyObj(st, layer, x, y) { if (!st._block[layer][y * st.layers[layer].w + x]) return null; return Object.values(st.objects).find(o => o.layer === layer && !o.gone && S.footprint(o).some(([dx, dy]) => o.x + dx === x && o.y + dy === y)); }
  U.bodyObj = bodyObj;
  const ICON_URL = {};
  const iconUrl = cr => ICON_URL[cr] || (ICON_URL[cr] = U.creatureIcon(cr, 40).toDataURL());
  /* an army seen from outside: what it is, each stack with a picture and how many (or about how many) */
  /* a castle seen from outside: who holds it, how strong its walls are, and its garrison */
  U.townInfoHtml = function (t) {
    const st = U.st, mine = t.owner === U.viewer;
    const mh = Object.values(st.armies).filter(x => x.owner === U.viewer && x.heroId).map(x => S.heroStat(st, st.heroes[x.heroId], 'Cunning'));
    const exact = mine || (mh.length ? Math.max(...mh) : 0) >= 6;
    const fort = ['fort3', 'fort2', 'fort1'].filter(f => RU.has(t, f)).map(f => D.bname(f, t.faction))[0] || 'no walls';
    const def = t.defender && st.heroes[t.defender];
    const gate = S.armyAt(st, t.layer, t.x, t.y);
    const list = slots => S.stacksIn(slots).filter(s => s.n > 0).map(s => '<div class="ai-row"><img src="' + iconUrl(s.cr) + '" width="40" height="40"><span><b>' + (exact ? s.n : S.countWord(s.n)) + '</b> ' + D.CREATURES[s.cr].plural + (exact ? '' : ' <span class="muted">(' + S.countRange(s.n) + ')</span>') + '</span></div>').join('');
    const caps = S.captainsIn(t.garrison);
    return '<b>' + U.esc(t.name) + '</b> — ' + (t.owner >= 0 ? U.esc(st.players[t.owner].name) : 'unclaimed') + '<div class="small">' + fort + (mine ? ' · ' + Math.floor(t.pop) + ' people · +' + RU.townIncome(st, t).gold + ' gold a day' : '') + '</div>'
      + (def ? '<div class="small">Defending general: ' + U.esc(def.name) + (exact ? ', level ' + def.level : '') + '</div>' : '')
      + (caps.length ? '<div class="small">Captains: ' + caps.map(c => U.esc(c.name)).join(', ') + '</div>' : '')
      + '<div class="small muted" style="margin-top:4px">Garrison</div><div class="ai-list">' + (list(t.garrison) || '<span class="small muted">empty</span>') + '</div>'
      + (gate && gate.owner === t.owner ? '<div class="small muted" style="margin-top:4px">At the gate: ' + U.esc(S.heroOf(st, gate) ? S.heroOf(st, gate).name : 'a squadron') + '</div><div class="ai-list">' + list(S.slotsOf(st, gate)) + '</div>' : '')
      + (exact ? '' : '<div class="small muted">A hero with Cunning 6 could count them exactly.</div>');
  };
  U.armyInfoHtml = function (a) {
    const st = U.st, h = S.heroOf(st, a), slots = S.slotsOf(st, a);
    const mh = Object.values(st.armies).filter(x => x.owner === U.viewer && x.heroId).map(x => S.heroStat(st, st.heroes[x.heroId], 'Cunning'));
    const exact = a.owner === U.viewer || (mh.length ? Math.max(...mh) : 0) >= 6;
    const who = a.travellers ? 'Travellers looking for a place to settle' : a.wild ? (a.herd ? 'A herd of wild punks' : a.mcfly ? 'RubberMcFly' : 'Wild creatures') : a.caravan ? st.players[a.owner].name + '’s caravan' : (h ? h.name + ' (' + st.players[a.owner].name + ')' : st.players[a.owner].name + (a.merc ? '’s mercenaries' : '’s squadron'));
    const caps = S.captainsIn(slots);
    const rows = S.stacksIn(slots).filter(s => s.n > 0).map(s => '<div class="ai-row"><img src="' + iconUrl(s.cr) + '" width="40" height="40"><span><b>' + (exact ? s.n : S.countWord(s.n)) + '</b> ' + D.CREATURES[s.cr].plural + (exact ? '' : ' <span class="muted">(' + S.countRange(s.n) + ')</span>') + '</span></div>').join('');
    return '<b>' + U.esc(who) + '</b>' + (a.guard ? ' <span class="muted">— guarding</span>' : '') + (caps.length ? '<div class="small">Led by ' + caps.map(c => U.esc(c.name) + ' (' + D.CAPTAIN_RANKS[c.rank].name + ')').join(', ') + '</div>' : '') + '<div class="ai-list">' + rows + '</div>' + (exact ? '' : '<div class="small muted">A hero with Cunning 6 could count them exactly. The Key button lists what the words mean.</div>');
  };
  function armyText(a, full) {
    const st = U.st, h = S.heroOf(st, a), slots = S.slotsOf(st, a);
    if (a.owner === U.viewer) return (h ? h.name : 'Your squadron') + (full ? ': ' + S.stacksIn(slots).map(s => s.n + ' ' + D.CREATURES[s.cr].plural).join(', ') : '');
    const cunning = (() => { const mh = Object.values(st.armies).filter(x => x.owner === U.viewer && x.heroId).map(x => S.heroStat(st, st.heroes[x.heroId], 'Cunning')); return mh.length ? Math.max(...mh) : 0; })();
    const who = a.travellers ? 'Travellers' : a.wild ? (a.herd ? 'A herd' : a.mcfly ? 'RubberMcFly' : 'Wild creatures') : a.caravan ? st.players[a.owner].name + '’s caravan' : (h ? h.name + ' (' + st.players[a.owner].name + ')' : st.players[a.owner].name + (a.merc ? '’s mercenaries' : '’s squadron'));
    const stacks = S.stacksIn(slots).filter(s => s.n > 0);
    const desc = stacks.map(s => (cunning >= 6 ? s.n : S.countWord(s.n) + (full ? ' (' + S.countRange(s.n) + ')' : '')) + ' ' + D.CREATURES[s.cr].plural).join(', ');
    return who + ': ' + desc + (a.guard ? ' (guarding)' : '');
  }
  function objText(o, full) {
    const st = U.st;
    switch (o.type) {
      case 'town': return o.name + (o.owner >= 0 ? ' (' + st.players[o.owner].name + ')' : ' (unclaimed)');
      case 'mine': return D.MINES[o.kind].name + ' — ' + D.MINES[o.kind].amt + ' ' + D.RES_INFO[D.MINES[o.kind].res].name + ' a day, to whoever holds the territory' + (o.kind === 'ngakara' ? (o.naga && o.naga.alive ? '' : ' (the Naga is dead)') : '');
      case 'keep': return o.name + ', a keep' + (o.owner >= 0 ? ' (' + st.players[o.owner].name + ')' : ' (' + (o.family || 'a family') + ')');
      case 'post': return 'A watch post' + (o.owner >= 0 ? ' (' + st.players[o.owner].name + ')' : '') + ': caravans of its owner pass this territory safely';
      case 'ruin': return (o.was ? 'The ruins of ' + o.was : 'An old ruin') + (o.loot ? ' — something glints among the stones' : ' — searched');
      case 'urverk': { const open = RU.urverkOpen(st, o), n = RU.urverkNext(st, o), dest = st.objects[o.link];
        const kind = { aligned: 'opens when the worlds line up', toll: 'kept by ' + (o.toll ? o.toll.family : 'a family'), danger: 'a dangerous crossing', always: 'always open', kalo: 'to ' + (o.moon || 'a Kalo') }[o.kind];
        return 'Urverk (' + kind + ') to ' + (dest ? D.LAYERS[dest.layer].name : '?') + ' — ' + (!o.triggerKnown ? 'its trigger is lost' : open ? 'open' + (o.window ? ' for ' + SU.plural(RU.urverkOpenFor(st, o), 'more day') : '') : 'closed, opens in ' + SU.plural(n, 'day')); }
      case 'visit': return D.VISIT[o.kind].name + (full ? ': ' + D.VISIT[o.kind].desc : '') + (o.kind === 'songstone' || o.kind === 'scroll' ? ' (' + D.SONGS[o.song].name + ')' : '');
      case 'pile': return D.RES_INFO[o.res].name;
      case 'chest': return 'A treasure chest';
      case 'village': return 'The village of ' + o.name + ' — whoever holds the territory gets ' + D.VILLAGE_SETTLERS + ' settlers a week in their nearest town';
      case 'relic': return 'A Relic: ' + D.RELICS[o.relic].name;
      case 'scroll': return 'A song scroll: ' + D.SONGS[o.song].name;
      case 'core': { const c = st.cores[o.core]; return 'A memory core' + (c ? ' (' + c.name + ')' : ''); }
      case 'boat': return 'A boat';
      case 'vision': return o.relic === 'vyrantler' ? 'Where a Shed Antler of the Vyrenalur lies' : 'Where the Rokarvac of the Nekh lies';
      case 'glimmer': return 'A glimmer of the Vyrenalur’s trail';
    }
    return '';
  }

  /* ---------- clicking the map ---------- */
  const who = a => { if (a.caravan) return 'your caravan (give it guards)'; const h = S.heroOf(U.st, a); if (h) return h.name; const c = S.captainsIn(a.slots)[0]; return c ? c.name + '’s squadron' : 'your squadron'; };
  SU.on('hover', t => { if (!U.st) return; let s = U.describe(V.layer, t.x, t.y);
    const own = S.armyAt(U.st, V.layer, t.x, t.y), sel = U.selectedArmy();
    if (own && own.owner === U.viewer && sel && own.id !== sel.id && U.myTurn()) s += ' — click to go and meet ' + who(own) + ' and trade · shift-click to pick it';
    const o = S.objAt(U.st, V.layer, t.x, t.y) || bodyObj(U.st, V.layer, t.x, t.y);
    if (o && o.type === 'town' && o.owner === U.viewer) s += o.x === t.x && o.y === t.y ? ' — click to walk a hero in through the gate' : ' — click to open the town';
    const mark = U.wayMark(t.x, t.y, own, o); V.hoverMark = mark;
    if (mark && mark.why) s += ' — ' + mark.why;
    $('status').textContent = s || ' '; });
  /* how the pointer should look over (x,y): reachable today, later, through a fight, or not at all (and why) */
  U.wayMark = function (x, y, own, o) {
    const st = U.st, layer = V.layer, L = st.layers[layer]; if (!S.inside(L, x, y)) return null;
    const seen = U.viewerPlayer().explored[layer][y * L.w + x], sel = U.selectedArmy();
    if (!seen) return { x, y, kind: 'no', why: 'unexplored' };
    if (own && own.owner === U.viewer) return null;
    /* a building's body: point at its entrance instead */
    const body = o && (o.x !== x || o.y !== y) ? o : null;
    const tx = body ? body.x : x, ty = body ? body.y : y;
    if (!sel || !U.myTurn() || sel.layer !== layer) { const b = !o && !S.armyAt(st, layer, x, y) && RU.blockedBy(st, layer, x, y, null); return b ? { x, y, kind: 'no', why: 'cannot go: ' + b } : null; }
    if (sel.x === tx && sel.y === ty) return null;
    const key = sel.id + ':' + sel.x + ',' + sel.y + ':' + sel.mp + ':' + tx + ',' + ty + ':' + st.day;
    if (U._wayKey === key) return U._way;
    let m;
    const b = !body && !S.objAt(st, layer, x, y) && !S.armyAt(st, layer, x, y) && RU.blockedBy(st, layer, x, y, sel);
    if (b) m = { x, y, kind: 'no', why: 'cannot go: ' + b };
    else {
      const p = RU.path(st, sel, tx, ty);
      if (!p || !p.length) { m = { x, y, kind: 'no', why: 'cannot reach: ' + RU.whyNot(st, sel, tx, ty).replace(/\.$/, ''), block: RU.blockerOnWay(st, sel, tx, ty) }; }
      else {
        let mp = sel.mp, prev = { x: sel.x, y: sel.y }, days = 0, fight = null;
        for (let i = 0; i < p.length; i++) { const c = RU.stepCost(st, sel, layer, prev.x, prev.y, p[i].x, p[i].y); if (mp < c && mp < sel.mpMax) { days++; mp = sel.mpMax; } mp -= c; prev = p[i];
          if (i < p.length - 1 && RU.guardNear(st, layer, p[i].x, p[i].y, sel.owner)) { fight = p[i]; break; } }
        m = fight ? { x, y, kind: 'fight', at: fight, why: 'the way passes a wild guard: you will stop and fight it at the orange mark' }
          : { x, y, kind: days ? 'later' : 'ok', why: days ? SU.plural(days + 1, 'day') + ' away' : 'reachable today' };
      }
    }
    if (body) { m.x = tx; m.y = ty; m.why = (m.why ? m.why + ' · ' : '') + 'heroes go in by the entrance (marked)'; }
    U._wayKey = key; U._way = m; return m;
  };
  SU.on('mapinfo', e => {
    if (!U.st) return; const st = U.st;
    const a = S.armyAt(st, V.layer, e.x, e.y);
    if (a && a.owner === U.viewer) { if (a.caravan) SU.talk.caravan(a); else SU.dialogs.army(a); return; }
    const o = S.objAt(st, V.layer, e.x, e.y) || bodyObj(st, V.layer, e.x, e.y);
    const L = st.layers[V.layer], seen = S.inside(L, e.x, e.y) && U.viewerPlayer().explored[V.layer][e.y * L.w + e.x];
    /* someone else's army: each stack with a picture */
    const html = a && seen && !(o && (o.type === 'town' || o.type === 'keep')) ? U.armyInfoHtml(a) : o && o.type === 'town' && seen ? U.townInfoHtml(o) : o && o.type === 'keep' && seen ? SU.talk.keepInfoHtml(o) : null;
    const txt = U.describe(V.layer, e.x, e.y, true);
    let body = html || (txt ? '<b>' + U.esc(txt).replace(' — ', '</b><br>').replace(/ — /g, '<br>') + (txt.indexOf(' — ') < 0 ? '</b>' : '') : null);
    /* the territory, from the old drawing if you have not seen it */
    const r = SU.realm && SU.realm.regionAt(st, V.layer, e.x, e.y);
    if (r) { const d = SU.realm.describe(st, r, U.viewer); body = (body || '<b>' + (seen ? 'Here' : 'On the old drawing') + '</b>') + '<div class="small" style="margin-top:4px;border-top:1px solid #3a2e1e;padding-top:4px"><b class="gold">' + U.esc(r.name) + '</b> — ' + U.esc(d.state) + '<br><span class="muted">Your authority ' + d.mine + ' · against you ' + d.against + '</span></div>'; }
    if (body) { U.tip(body + '<div class="small muted" style="margin-top:4px">Click anywhere to close.</div>', e.sx, e.sy); U._pinned = true; }
  });
  SU.on('mapclick', t => {
    if (!U.st || U.modalOpen() || U.pickTile) return;
    const st = U.st, layer = V.layer, L = st.layers[layer];
    if (!S.inside(L, t.x, t.y)) return;
    const own = S.armyAt(st, layer, t.x, t.y);
    const sel = U.selectedArmy();
    /* clicking another of your armies with one selected: walk over to meet it (click again to go);
       shift-click (or no army selected) picks it instead */
    if (own && own.owner === U.viewer && sel && own.id !== sel.id && U.myTurn() && !t.shift && own.layer === sel.layer && !S.townAtArmy(st, own)) {
      if (V.path && V.path.tx === t.x && V.path.ty === t.y && V.path.army === sel.id) { U.move(sel, V.path.steps); return; }
      U.preview(sel, t.x, t.y);
      if (V.path) { V.path.target = 'meet'; $('status').textContent = 'Click again to go and meet ' + who(own) + ' and trade. (Shift-click to pick it instead.)'; }
      return;
    }
    if (own && own.caravan && own.owner === U.viewer) { SU.talk.caravan(own); return; }
    if (own && own.owner === U.viewer && (!sel || own.id !== sel.id || !U.myTurn())) { U.select(own.id); return; }
    if (own && sel && own.id === sel.id) { const town = S.townAtArmy(st, own); if (town) SU.townView.open(town); else SU.dialogs.army(own); return; }
    const o = S.objAt(st, layer, t.x, t.y) || bodyObj(st, layer, t.x, t.y);
    /* your own castle: clicking the castle opens it; clicking its gate walks a hero in */
    const onGate = o && o.type === 'town' && o.x === t.x && o.y === t.y;
    if (o && o.type === 'town' && o.owner === U.viewer && (!sel || !U.myTurn() || sel.layer !== layer || !onGate)) { SU.townView.open(o); return; }
    if (o && o.type === 'keep' && o.owner === U.viewer && (!sel || !U.myTurn() || sel.layer !== layer || !(o.x === t.x && o.y === t.y))) { SU.talk.keep(null, o); return; }
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
    if (!p || !p.length) { V.path = null; const why = RU.whyNot(st, a, tx, ty); V.blockMark = Object.assign({ until: performance.now() + 4000 }, RU.blockerOnWay(st, a, tx, ty) || { x: tx, y: ty });
      U.toast(why); $('status').textContent = why; return; }
    let prev = { x: a.x, y: a.y };
    const steps = p.map(s => { const c = RU.stepCost(st, a, a.layer, prev.x, prev.y, s.x, s.y); prev = s; return { x: s.x, y: s.y, cost: c }; });
    const end = S.armyAt(st, a.layer, tx, ty), eo = S.objAt(st, a.layer, tx, ty);
    let target = end && end.owner !== a.owner && !(end.wild && end.herd) ? (SU.realm && SU.realm.canTalk(st, a, end) ? 'talk' : 'battle') : eo ? (eo.owner >= 0 && eo.owner !== a.owner && (eo.type === 'town' || eo.type === 'keep') ? 'battle' : 'visit') : null;
    /* walking next to a guard means a fight there (or a parley, if both sides can talk) */
    const gi = steps.findIndex((s, i) => i < steps.length - 1 && RU.guardNear(st, a.layer, s.x, s.y, a.owner));
    if (gi >= 0) { steps.length = gi + 1; target = 'battle'; }
    V.path = { army: a.id, layer: a.layer, tx, ty, steps, mp: a.mp, mpMax: a.mpMax, target };
    const days = (() => { let mp = a.mp, d = 0; steps.forEach(s => { if (mp < s.cost) { d++; mp = a.mpMax; } mp -= s.cost; }); return d; })();
    $('status').textContent = days ? 'That is ' + SU.plural(days + 1, 'day') + ' away. Click again to go.' : 'Click again to go.';
  };
  U.move = function (a, steps) {
    const st = U.st; let i = 0, pending = null;
    V.path = null; V.hoverMark = null; U._wayKey = null; U.busy = true; a.sleep = false;
    V.walk(a, () => {
      if (pending) return { stop: true, res: pending };
      if (i >= steps.length || a.dead) return { stop: true };
      const s = steps[i++];
      const r = RU.step(st, a, s.x, s.y, { last: i === steps.length });
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
      case 'captured': U.alert('Taken', 'You have taken ' + ev.obj.name + ' without a fight.', () => { if (ev.obj.type === 'town') SU.townView.open(ev.obj, a); else SU.talk.keep(a, ev.obj); }); break;
      case 'encounter': SU.talk.encounter(a, ev.other, ev.ambush); break;
      case 'parley': SU.talk.parley(a, ev.obj); break;
      case 'keep': SU.talk.keep(a, ev.obj); break;
      case 'meet': SU.dialogs.exchange(a, ev.other); break;
      case 'herd': SU.dialogs.herd(a, ev.other); break;
      case 'urverk': SU.dialogs.urverk(a, ev.obj); break;
      case 'flagged': U.toast('The ' + D.MINES[ev.obj.kind].name + ' is yours.'); V.invalidate(); break;
      case 'village': U.toast('The village of ' + ev.obj.name + ' is yours: ' + D.VILLAGE_SETTLERS + ' settlers a week will go to your nearest town.'); V.invalidate(); break;
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
    if ($('b-map')) $('b-map').onclick = () => SU.sketch.openMap(V.worlds ? null : V.layer);
    if ($('b-post')) $('b-post').onclick = () => { const a = U.selectedArmy(); if (!a || !U.myTurn()) { U.toast('Pick an army where you want the watch post.'); return; }
      const c = SU.realm.canPost(U.st, a); if (!c.ok) { U.toast(c.why); return; }
      U.confirm('A watch post in ' + c.r.name + '?', el('div', {}, [el('p', { text: 'Its keepers watch the roads of ' + c.r.name + ': your caravans pass through safely, you see the land around it, and it adds to your hold on the territory. A rival can burn it by walking onto it.' }), U.costView(SU.realm.K.POST_COST, U.viewerPlayer())]),
        () => { const r = SU.realm.buildPost(U.st, a); if (!r.ok) U.toast(r.why); else U.toast('A watch post stands in ' + r.r.name + '.'); V.invalidate(); U.refresh(); }, null, ['Raise it', 'Not now']); };
    if ($('b-key')) $('b-key').onclick = () => SU.dialogs.mapKey();
    if ($('b-way')) $('b-way').onclick = () => { V.showWay = !V.showWay; $('b-way').classList.toggle('primary', V.showWay); if (V.showWay && !U.selectedArmy()) U.toast('Pick an army to see where it can go today.'); };
    $('b-menu').onclick = () => SU.game.menu();
    $('endturn').onclick = () => SU.game.endTurn();
    SU.on('key', e => {
      if (U.modalOpen()) { if (e.key === 'Escape') { const top = stack[stack.length - 1]; if (top) top.close(); } return; }
      if (SU.sketch && SU.sketch.mapOpen()) { SU.sketch.mapKey(e); return; }
      if (!document.getElementById('town').classList.contains('hidden') || !document.getElementById('battle').classList.contains('hidden')) { SU.emit('screenkey', e); return; }
      if (!U.st || $('game').classList.contains('hidden')) return;
      const k = e.key.toLowerCase();
      if (k === 'e' && U.myTurn()) SU.game.endTurn();
      else if (k === 'n') U.nextArmy();
      else if (k === 'h') $('b-hero').click();
      else if (k === '?' || k === '/') SU.dialogs.mapKey();
      else if (k === 'k') SU.dialogs.kingdom();
      else if (k === 'q') $('b-songs').click();
      else if (k === 'z') $('b-sleep').click();
      else if (k === 'g') $('b-way').click();
      else if (k === 'm') $('b-map').click();
      else if (k === 'b') $('b-post').click();
      else if (k === 'w') { V.showWorlds(!V.worlds); U.refresh(); }
      else if (k === ' ' || k === 'enter') { const a = U.selectedArmy(); if (a && V.path && V.path.army === a.id) U.move(a, V.path.steps); }
      else if (k === 'escape') SU.game.menu();
      else if (k >= '1' && k <= '4') { if (V.worlds) V.showWorlds(false); V.setLayer(+k - 1); U.refresh(); }
    });
    SU.on('log', () => {});
    SU.on('lost', e => { if (e.owner === U.viewer) U.toast('You lost ' + e.what + '!', 4000); });
    SU.on('caravan', e => { if (e.owner === U.viewer) U.toast(e.lost ? 'Bandits took your caravan from ' + e.region + '!' : 'Bandits robbed your caravan from ' + e.region + '.', 4000); });
    SU.on('worldshover', txt => { $('status').textContent = txt || 'The worlds. Click one to go down to it; scroll in to go back.'; });
    SU.on('worlds', () => U.refresh());
    /* the eye's vision: shown when the player whose turn it was is watching */
    SU.on('vision', e => { if (!U.st || e.owner !== U.viewer) return; U._pendingVision = e.obj; });
  }
  document.addEventListener('DOMContentLoaded', wire);
})(typeof window !== 'undefined' ? window : globalThis);
