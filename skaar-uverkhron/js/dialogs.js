/* ============================================================
   SKAAR UVERKHRON — js/dialogs.js
   The windows: hero, army and exchange, the tavern, shrines and
   the Kahizecvar, Urverk crossings, quests, trainers, the fair,
   the market, map songs, level-ups and battle reports.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, RU = SU.rules, M = SU.make, A = SU.art, V = SU.mapView;
  const U = SU.ui, el = U.el, btn = U.btn;
  const DL = SU.dialogs = {};
  const st = () => U.st;
  const me = () => st().players[U.viewer];

  /* ======================= army editor =======================
     groups: [{ label, slots, hero, onlyCaptain (hero-less army), keepOne }]
     Click a stack to pick it up, then click where it goes. */
  DL.armyEditor = function (groups, onChange, ctx) {
    ctx = ctx || {};
    const box = el('div', { cls: 'col' });
    let sel = null;   // { g, si, sub }   sub: index under a captain, or 'cap' for the whole squadron
    const P = me();
    function stackAt(g, si, sub) { const s = groups[g].slots[si]; if (!s) return null; if (sub == null || sub === 'cap') return s; return s.stacks[sub] || null; }
    const card = (s, G) => { if (!s) return; if (s.kind === 'cap') { DL.captainCard(s.cap, G.hero); return; } DL.creatureCard(s.cr, { stack: s, slots: G.slots, town: ctx.town || (G.hero && S.heroLocation(st(), G.hero).town) || null, hero: G.hero, canDismiss: !(G.keepOne && countStacks(G) <= 1), onChange: () => { draw(); if (onChange) onChange(); } }); };
    function draw() {
      box.innerHTML = '';
      groups.forEach((G, gi) => {
        const hero = G.hero;
        box.appendChild(el('div', { cls: 'row' }, [el('b', { cls: 'gold', text: G.label }), G.onlyCaptain ? el('span', { cls: 'small muted', text: '(a squadron: all its troops serve under its captain)' }) : null]));
        const grid = el('div', { cls: 'slots' });
        G.slots.forEach((s, si) => {
          if (G.onlyCaptain && si > 0 && !s) return;
          const isSel = sel && sel.g === gi && sel.si === si && (sel.sub == null || sel.sub === 'cap');
          const cell = el('div', { cls: 'slot' + (s && s.kind === 'cap' ? ' cap' : '') + (isSel ? ' sel' : ''), onclick: e => { e.stopPropagation(); click(gi, si, null); }, ondblclick: e => { e.stopPropagation(); sel = null; draw(); card(s, G); }, oncontextmenu: e => { if (!s) return; e.preventDefault(); e.stopPropagation(); card(s, G); } });
          if (!s) cell.appendChild(el('div', { cls: 'lbl', style: { marginTop: '32px' }, text: 'empty' }));
          else if (s.kind === 'stack') { const C = D.CREATURES[s.cr]; cell.appendChild(U.creatureIcon(s.cr, 60, { color: P.color })); cell.appendChild(el('div', { cls: 'lbl', text: C.plural })); cell.appendChild(el('span', { cls: 'cnt', text: s.n })); cell.setAttribute('data-tip', creatureTip(s.cr, s) + '<br><i>Double-click or right-click for more.</i>'); }
          else {
            const cap = s.cap; cell.appendChild(el('div', { cls: 'row', style: { gap: '4px' } }, [U.captainIcon(cap, 30, P.color), el('div', { cls: 'lbl', style: { textAlign: 'left' } }, [cap.name, el('br'), D.CAPTAIN_RANKS[cap.rank].name])]));
            cell.setAttribute('data-tip', captainTip(cap, hero));
            const cap_ = RU.capCapacity(st(), cap, hero), used = RU.capUsed(s);
            const sq = el('div', { cls: 'squad' });
            s.stacks.forEach((x, k) => { const sSel = sel && sel.g === gi && sel.si === si && sel.sub === k;
              sq.appendChild(el('div', { cls: 'sub' + (sSel ? ' sel' : ''), onclick: e => { e.stopPropagation(); click(gi, si, k); }, ondblclick: e => { e.stopPropagation(); sel = null; draw(); card(x, G); }, oncontextmenu: e => { e.preventDefault(); e.stopPropagation(); card(x, G); }, 'data-tip': creatureTip(x.cr, x) + '<br><i>Double-click for more.</i>' }, [U.creatureIcon(x.cr, 42, { color: P.color }), el('span', { cls: 'cnt', text: x.n })])); });
            for (let k = used; k < cap_; k++) sq.appendChild(el('div', { cls: 'sub empty', onclick: e => { e.stopPropagation(); click(gi, si, 'add'); }, 'data-tip': 'Room under this captain' }));
            cell.appendChild(sq);
          }
          grid.appendChild(cell);
        });
        box.appendChild(grid);
      });
      box.appendChild(el('div', { cls: 'row small muted' }, [sel ? 'Click where it should go — an empty slot, under a captain, or onto the same creature to join them. ' : 'Click a stack or captain to pick it up. Double-click one to see it close up (and upgrade it in town). ', sel ? btn('Split', split, '', 'Split this stack in two') : null, sel ? btn('Put down', () => { sel = null; draw(); }) : null, sel && canDismiss() ? btn('Dismiss', dismiss, 'danger') : null]));
    }
    function canDismiss() { if (!sel) return false; const G = groups[sel.g]; return !(G.keepOne && countStacks(G) <= 1); }
    function countStacks(G) { return G.slots.reduce((t, s) => t + (!s ? 0 : s.kind === 'stack' ? 1 : 1 + s.stacks.length), 0); }
    function click(g, si, sub) {
      const G = groups[g];
      if (!sel) { const s = G.slots[si]; if (!s) return; if (sub === 'add') return; sel = { g, si, sub: s.kind === 'cap' && sub == null ? 'cap' : sub }; draw(); return; }
      const from = sel; sel = null;
      const r = moveThing(from, { g, si, sub });
      if (r && r.why) U.toast(r.why);
      draw(); if (onChange) onChange();
    }
    function moveThing(from, to) {
      const F = groups[from.g], T = groups[to.g];
      const fs = F.slots[from.si]; if (!fs) return;
      const toSlot = T.slots[to.si];
      /* moving a whole squadron (captain + troops) */
      if (from.sub === 'cap' || (fs.kind === 'stack' && from.sub == null)) {
        const moving = fs;
        if (F.onlyCaptain && moving.kind === 'cap' && from.g !== to.g && !(T.hero && !toSlot)) return { why: 'A squadron cannot leave without its captain — move its troops instead, or put the captain in an empty place in the hero’s army.' };
        if (T.onlyCaptain && to.si > 0) return { why: 'A squadron fights under its captain only.' };
        if (to.sub === 'add' || (to.sub != null && toSlot && toSlot.kind === 'cap')) {
          /* a single stack goes under a captain */
          if (moving.kind !== 'stack') return { why: 'A captain cannot serve under another captain.' };
          if (D.CREATURES[moving.cr].legendary) return { why: 'The Nekh’Vorran answers to no captain.' };
          const cap = T.slots[to.si]; if (RU.capUsed(cap) + (D.CREATURES[moving.cr].capSlots || 1) > RU.capCapacity(st(), cap.cap, T.hero)) return { why: 'That captain cannot lead any more.' };
          const same = cap.stacks.find(x => x.cr === moving.cr); if (same) same.n += moving.n; else cap.stacks.push({ cr: moving.cr, n: moving.n, grief: moving.grief });
          F.slots[from.si] = null; return;
        }
        if (F.keepOne && from.g !== to.g && countStacks(F) <= 1) return { why: 'An army needs at least one stack.' };
        if (toSlot && toSlot.kind === 'stack' && moving.kind === 'stack' && toSlot.cr === moving.cr && (from.g !== to.g || from.si !== to.si)) { if (D.CREATURES[moving.cr].legendary) return { why: 'Only one Nekh’Vorran to a stack.' }; toSlot.n += moving.n; F.slots[from.si] = null; return; }
        if (T.onlyCaptain && moving.kind === 'stack') return { why: 'A squadron’s troops serve under its captain: put them in the captain’s room.' };
        if (F.onlyCaptain && toSlot && toSlot.kind === 'stack') return { why: 'A squadron needs its captain.' };
        F.slots[from.si] = toSlot || null; T.slots[to.si] = moving; return;
      }
      /* moving a stack that serves under a captain */
      const cap = fs, x = cap.stacks[from.sub]; if (!x) return;
      if (F.onlyCaptain && from.g !== to.g && cap.stacks.length <= 1 && F.keepOne) return { why: 'The squadron needs at least one stack.' };
      if (to.sub != null && to.sub !== 'cap' && toSlot && toSlot.kind === 'cap') {
        if (to.g === from.g && to.si === from.si) return;
        const dest = toSlot; const same = dest.stacks.find(y => y.cr === x.cr);
        if (!same && RU.capUsed(dest) + (D.CREATURES[x.cr].capSlots || 1) > RU.capCapacity(st(), dest.cap, T.hero)) return { why: 'That captain cannot lead any more.' };
        if (same) same.n += x.n; else dest.stacks.push(x); cap.stacks.splice(from.sub, 1); return;
      }
      if (T.onlyCaptain) return { why: 'A squadron’s troops serve under its captain.' };
      if (!toSlot) { T.slots[to.si] = { kind: 'stack', cr: x.cr, n: x.n, grief: x.grief }; cap.stacks.splice(from.sub, 1); return; }
      if (toSlot.kind === 'stack' && toSlot.cr === x.cr) { toSlot.n += x.n; cap.stacks.splice(from.sub, 1); return; }
      if (toSlot.kind === 'cap') { const same = toSlot.stacks.find(y => y.cr === x.cr); if (!same && RU.capUsed(toSlot) + (D.CREATURES[x.cr].capSlots || 1) > RU.capCapacity(st(), toSlot.cap, T.hero)) return { why: 'That captain cannot lead any more.' }; if (same) same.n += x.n; else toSlot.stacks.push(x); cap.stacks.splice(from.sub, 1); return; }
      return { why: 'There is no room there.' };
    }
    function split() {
      const s = stackAt(sel.g, sel.si, sel.sub === 'cap' ? null : sel.sub); if (!s || s.kind === 'cap' || s.n < 2) { U.toast('Pick a stack of two or more.'); return; }
      const G = groups[sel.g]; const free = G.slots.findIndex((x, i) => !x && !(G.onlyCaptain && i > 0));
      const inCap = sel.sub != null && sel.sub !== 'cap';
      if (free < 0 && !inCap) { U.toast('No empty slot to split into.'); return; }
      const range = el('input', { type: 'range', min: 1, max: s.n - 1, value: Math.floor(s.n / 2), style: { width: '100%' } });
      const lab = el('div', { cls: 'row' }); const upd = () => lab.textContent = (s.n - range.value) + '  |  ' + range.value; range.oninput = upd; upd();
      const m = U.modal([el('h3', { text: 'Split ' + D.CREATURES[s.cr].plural }), range, lab, el('div', { cls: 'acts' }, [btn('Cancel', () => m.close()), btn('Split', () => {
        const k = +range.value;
        if (inCap) { const cap = G.slots[sel.si]; if (free >= 0 && !G.onlyCaptain) { G.slots[free] = { kind: 'stack', cr: s.cr, n: k }; s.n -= k; } else if (RU.capUsed(cap) + (D.CREATURES[s.cr].capSlots || 1) <= RU.capCapacity(st(), cap.cap, G.hero)) { cap.stacks.push({ cr: s.cr, n: k }); s.n -= k; } else U.toast('No room to split into.'); }
        else { G.slots[free] = { kind: 'stack', cr: s.cr, n: k }; s.n -= k; }
        m.close(); sel = null; draw(); if (onChange) onChange();
      }, 'primary')])]);
    }
    function dismiss() {
      const G = groups[sel.g]; const s = G.slots[sel.si];
      U.confirm('Dismiss', 'Send them away for good?', () => { const gone = sel.sub != null && sel.sub !== 'cap' ? s.stacks[sel.sub] : s; if (sel.sub != null && sel.sub !== 'cap') s.stacks.splice(sel.sub, 1); else G.slots[sel.si] = null;
        const broke = gone && gone.kind === 'cap' ? gone.stacks.filter(x => x.changed) : gone && gone.changed ? [gone] : []; if (broke.length) { RU.oathTaken(st(), U.viewer, broke); U.toast('The Oath is broken. The forest takes them.'); }
        sel = null; draw(); if (onChange) onChange(); });
    }
    draw();
    return box;
  };
  function creatureTip(cr, s) {
    const C = D.CREATURES[cr];
    return '<b>' + C.name + '</b> (tier ' + C.tier + ')<br>Attack ' + C.atk + ' · Defense ' + C.def + ' · Damage ' + C.dmg[0] + '–' + C.dmg[1] + '<br>Health ' + C.hp + ' · Speed ' + C.spd + (C.ranged ? ' · Shots ' + C.shots : '') + (C.fly ? ' · Flies' : '') + ((C.shape || (C.size === 2 ? [2, 1] : [1, 1]))[0] * (C.shape || [1, 1])[1] > 1 ? ' · ' + (C.shape || [2, 1])[0] + '×' + (C.shape || [2, 1])[1] + ' hexes' : '') + (C.capSlots ? ' · Takes 2 of a captain’s places' : '') +
      '<br>Comfortable on ' + D.ELEMENTS[C.el].name + ' ground · eats ' + C.food + ' food a week' + ((C.abil || []).length ? '<br>' + C.abil.map(a => '• ' + (D.ABIL[a] || a)).join('<br>') : '') + (s && s.grief ? '<br><span class="bad">Grieving: lower morale after heavy losses.</span>' : '') + '<br><span class="muted">' + C.desc + '</span>';
  }
  DL.creatureTip = creatureTip;
  function captainTip(c, hero) {
    return '<b>' + c.name + '</b> — ' + D.CAPTAIN_RANKS[c.rank].name + ', ' + D.PEOPLES[c.people].name + '<br>Level ' + c.level + ' · Health ' + c.hp + ' · Attack ' + c.atk + ' · Defense ' + c.def + '<br>Morale +' + ((c.morale || 0) * 5 + (c.abil === 'banner' ? 10 : 0)) + ' to the squadron · Luck ' + (c.luck >= 0 ? '+' : '') + c.luck + ' · Leads ' + RU.capCapacity(st(), c, hero) + ' stacks<br><b>' + D.CAPTAIN_ABIL[c.abil].name + ':</b> ' + D.CAPTAIN_ABIL[c.abil].desc + (c.rank === 'naelst' ? '<br>As a Naelst Velki, lets Kalo’Eik shift allies through the Duat.' : '');
  }
  DL.captainTip = captainTip;

  /* ======================= a creature, close up =======================
     opts: { stack, slots (the slots it sits in), town (for upgrades), hero, onChange } */
  const townRedraw = () => { const T = SU.townView; if (T && T.town && !document.getElementById('town').classList.contains('hidden')) T.render(); };
  DL.creatureCard = function (cr, opts) {
    opts = opts || {};
    const C = D.CREATURES[cr], s = opts.stack, h = opts.hero, P = me();
    const pic = el('canvas', { width: 440, height: 380, cls: 'cc-pic' }); pic.style.width = '220px'; pic.style.height = '190px';
    let raf = 0; const t0 = performance.now();
    const draw = now => { if (!pic.isConnected && now - t0 > 500) return; raf = requestAnimationFrame(draw); const g = pic.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 220, 190);
      g.fillStyle = A.radial(g, 110, 120, 140, A.mix(D.ELEMENTS[C.el] ? D.ELEMENTS[C.el].color || '#4a3a5a' : '#4a3a5a', '#120a18', 0.82), '#0c0910'); g.fillRect(0, 0, 220, 190);
      g.fillStyle = 'rgba(0,0,0,.35)'; A.ell(g, 110, 168, 70, 12); g.fill();
      const big = C.shape && C.shape[0] >= 4 ? 0.55 : C.shape && C.shape[0] * C.shape[1] >= 2 ? 0.7 : 0.9;
      A.creature(g, C.art, 110, C.fly ? 150 : 166, 150 * big, { t: (now - t0) / 1000, tint: C.tint || (C.upgraded ? 1 : 0), color: P.color, noShadow: true }); };
    raf = requestAnimationFrame(draw);
    const atkB = h ? S.heroStat(st(), h, 'Strength') : 0, defB = h ? S.heroStat(st(), h, 'Defense') : 0;
    const row = (k, v, tip) => el('div', { cls: 'cc-stat', 'data-tip': tip || null }, [el('span', { cls: 'muted', text: k }), el('b', { text: String(v) })]);
    const shape = C.shape || (C.size === 2 ? [2, 1] : [1, 1]);
    const stats = el('div', { cls: 'cc-stats' }, [
      row('Attack', C.atk + (atkB ? ' (' + (C.atk + atkB) + ')' : ''), atkB ? 'With ' + h.name + '’s Strength' : null),
      row('Defense', C.def + (defB ? ' (' + (C.def + defB) + ')' : ''), defB ? 'With ' + h.name + '’s Defense' : null),
      row('Damage', C.dmg[0] + '–' + C.dmg[1]), row('Health', s && s.hpTop ? s.hpTop + ' / ' + C.hp : C.hp), row('Speed', C.spd + (C.fly ? ' (flies)' : '')),
      C.ranged ? row('Shots', C.shots) : null, C.grow != null ? row('Growth', C.grow + ' a week') : null,
      row('Size', shape[0] + '×' + shape[1] + ' hexes'), row('Captain places', C.capSlots || 1), row('Food', C.food + ' a week each'),
      row('Element', D.ELEMENTS[C.el] ? D.ELEMENTS[C.el].name : C.el, 'Fights a little better on ' + (D.ELEMENTS[C.el] ? D.ELEMENTS[C.el].name : C.el) + ' ground'),
      C.cost ? el('div', { cls: 'cc-stat' }, [el('span', { cls: 'muted', text: 'Cost' }), U.costView(C.cost, P)]) : null]);
    const body = el('div', { cls: 'cc' }, [
      el('div', { cls: 'cc-left' }, [pic, el('div', { cls: 'cc-count', text: s ? s.n + ' ' + (s.n === 1 ? C.name : C.plural) : C.plural }), s && s.grief ? el('div', { cls: 'small bad', text: 'Grieving: lower morale after heavy losses.' }) : null]),
      el('div', { cls: 'cc-right' }, [stats,
        (C.abil || []).length ? el('div', { cls: 'cc-abil' }, C.abil.map(a => el('div', { cls: 'small' }, ['• ', el('b', { text: a.replace(/\d$/, '') + ': ' }), D.ABIL[a] || '']))) : null,
        el('p', { cls: 'small muted', text: C.desc })])]);
    const acts = el('div', { cls: 'acts' });
    const m = U.modal([el('h2', { text: C.name + (C.tier ? ' · tier ' + C.tier : '') + (C.faction ? '' : ' · wild') }), body, acts], { wide: true, onClose: () => cancelAnimationFrame(raf) });
    m.box.classList.add('cc-box');
    /* upgrading, where the town can */
    const t = opts.town, up = C.up && D.CREATURES[C.up];
    if (s && t && up && t.owner === U.viewer) {
      const can = Object.values(D.BUILDINGS).some(b => b.dwellUp === C.up && t.built.includes(b.id));
      const cost = {}; Object.entries(up.cost).forEach(([k, v]) => { const d = (v - (C.cost[k] || 0)) * s.n; if (d > 0) cost[k] = d; });
      acts.appendChild(el('div', { cls: 'small', style: { marginRight: 'auto' } }, can ? ['Upgrade to ' + up.plural + ': ', U.costView(cost, P)] : ['Build the ' + (Object.values(D.BUILDINGS).find(b => b.dwellUp === C.up) || {}).name + ' in ' + t.name + ' to upgrade them to ' + up.plural + '.']));
      if (can) acts.appendChild(btn('Upgrade', () => { const r = RU.upgradeStack(st(), t, s); if (!r.ok) { U.toast(r.why || 'Cannot.'); return; } m.close(); U.toast('They are ' + up.plural + ' now.'); if (opts.onChange) opts.onChange(); U.refresh(); townRedraw(); DL.creatureCard(s.cr, opts); }, 'primary'));
    } else if (up) acts.appendChild(el('div', { cls: 'small muted', style: { marginRight: 'auto' }, text: 'Upgrades to ' + up.plural + ' in a town with its upgraded dwelling.' }));
    if (s && opts.slots && opts.canDismiss !== false) acts.appendChild(btn('Dismiss', () => U.confirm('Dismiss', 'Send these ' + C.plural + ' away for good?', () => {
      const i = opts.slots.indexOf(s); if (i >= 0) opts.slots[i] = null; else opts.slots.forEach(x => { if (x && x.kind === 'cap') { const k = x.stacks.indexOf(s); if (k >= 0) x.stacks.splice(k, 1); } });
      if (s.changed) { RU.oathTaken(st(), U.viewer, [s]); U.toast('The Oath is broken. The forest takes them.'); }
      m.close(); if (opts.onChange) opts.onChange(); U.refresh(); townRedraw(); }), 'danger'));
    acts.appendChild(btn('Close', () => m.close(), 'primary'));
    return m;
  };
  DL.captainCard = function (cap, hero) {
    const P = me();
    U.modal([el('h2', { text: cap.name }), el('div', { cls: 'row', style: { alignItems: 'flex-start', gap: '14px', flexWrap: 'nowrap' } }, [U.captainIcon(cap, 120, P.color), el('div', { html: captainTip(cap, hero) })]),
      el('div', { cls: 'acts' }, [btn('Close', function () { this.closest('.overlay').remove(); }, 'primary')])]);
  };

  /* ======================= an army on the map ======================= */
  DL.army = function (a) {
    const h = S.heroOf(st(), a); if (h) return DL.hero(h);
    const cap = S.captainsIn(a.slots)[0];
    const m = U.modal([el('h2', { text: cap ? cap.name + '’s squadron' : 'A squadron' }),
      el('p', { cls: 'small muted', text: 'A squadron goes out without a hero. It can take mines and pick up resources and gold, but it cannot take towns or carry Relics.' }),
      DL.armyEditor([{ label: 'The squadron', slots: a.slots, onlyCaptain: true, keepOne: true }], () => U.refresh()),
      el('div', { cls: 'acts' }, [btn('Close', () => m.close(), 'primary')])], { wide: true });
  };
  DL.exchange = function (a, b) {
    const ha = S.heroOf(st(), a), hb = S.heroOf(st(), b);
    /* a squadron whose captain has gone over to a hero is no more */
    const tidy = () => { [a, b].forEach(x => { if (!x.dead && !x.heroId && !S.stacksIn(x.slots).length && !S.captainsIn(x.slots).length) RU.removeArmy(st(), x); }); U.refresh(); V.invalidate(); };
    const sqName = x => { const c = S.captainsIn(x.slots)[0]; return c ? c.name + '’s squadron' : 'A squadron'; };
    const sq = !ha ? a : !hb ? b : null, hh = sq === a ? hb : sq === b ? ha : null;
    const join = () => {
      const hs = hh.slots, room = hs.filter(x => !x).length, need = sq.slots.filter(Boolean).length;
      if (room < need) { U.toast(hh.name + ' has room for ' + SU.plural(room, 'more group') + ' only.'); return; }
      sq.slots.forEach((x, i) => { if (!x) return; hs[hs.indexOf(null)] = x; sq.slots[i] = null; });
      m.close(); U.toast('The squadron joins ' + hh.name + '’s army.');
    };
    const m = U.modal([el('h2', { text: (ha ? ha.name : sqName(a)) + ' meets ' + (hb ? hb.name : sqName(b)) }),
      el('p', { cls: 'small muted', text: 'Click a stack, captain or Relic to pick it up, then click where it goes.' }),
      DL.armyEditor([{ label: ha ? ha.name : sqName(a), slots: S.slotsOf(st(), a), hero: ha, onlyCaptain: !ha, keepOne: !!ha }, { label: hb ? hb.name : sqName(b), slots: S.slotsOf(st(), b), hero: hb, onlyCaptain: !hb, keepOne: !!hb }], () => U.refresh()),
      ha && hb ? relicSwap(ha, hb) : null,
      ha && hb ? coreSwap(ha, hb) : null,
      el('div', { cls: 'acts' }, [sq && hh ? btn('Join ' + hh.name + '’s army', join, '', 'The whole squadron, captain and all, marches with the hero') : null, btn('Done', () => m.close(), 'primary')])], { wide: true, onClose: tidy });
    function coreSwap(x, y) {
      const box = el('div', { cls: 'col', style: { marginTop: '8px' } });
      const draw = () => { box.innerHTML = ''; box.appendChild(el('b', { cls: 'gold', text: 'Memory cores' }));
        [[x, y], [y, x]].forEach(([from, to]) => {
          const ids = from.pouch.concat(from.cores).filter(id => st().cores[id]);
          box.appendChild(el('div', { cls: 'row' }, [el('span', { style: { width: '160px' }, cls: 'small', text: from.name + ':' }), ids.length ? null : el('span', { cls: 'small muted', text: 'none' }),
            ...ids.map(id => { const c = st().cores[id]; return btn((from.pouch.includes(id) ? '◆ ' : '◇ ') + c.name, () => { from.pouch = from.pouch.filter(q => q !== id); from.cores = from.cores.filter(q => q !== id); if (c.kind === 'hero' && to.pouch.length < 3) to.pouch.push(id); else to.cores.push(id); draw(); }, '', 'Give this core to ' + to.name + (from.pouch.includes(id) ? ' (it is in the pouch, in use)' : '')); })]));
        }); };
      draw(); return box;
    }
    function relicSwap(x, y) {
      const box = el('div', { cls: 'col', style: { marginTop: '8px' } });
      const draw = () => { box.innerHTML = ''; box.appendChild(el('b', { cls: 'gold', text: 'Relics' }));
        [[x, y], [y, x]].forEach(([from, to]) => {
          const items = Object.entries(from.relics).filter(([, r]) => r).map(([sl, r]) => ({ sl, r })).concat((from.pack || []).map(r => ({ r })));
          box.appendChild(el('div', { cls: 'row' }, [el('span', { style: { width: '160px' }, cls: 'small', text: from.name + ':' }), items.length ? null : el('span', { cls: 'small muted', text: 'none' }),
            ...items.map(it => el('div', { cls: 'relslot', 'data-tip': relicTip(it.r) + '<br><i>Click to give it to ' + to.name + '.</i>', onclick: () => { if (it.sl) delete from.relics[it.sl]; else from.pack.splice(from.pack.indexOf(it.r), 1); RU.giveRelic(st(), to, it.r); draw(); } }, U.relicIcon(it.r, 36)))]));
        }); };
      draw(); return box;
    }
  };

  /* ======================= hero window ======================= */
  DL.hero = function (h, opts) {
    opts = opts || {};
    const m = U.modal(el('div'), { wide: true, onClose: () => U.refresh() });
    const P = st().players[h.owner] || me();
    function render() {
      const body = m.box; body.innerHTML = '';
      const statRow = el('div', { cls: 'row' }, D.STATS.map(sname => el('div', { cls: 'frame', style: { textAlign: 'center', minWidth: '84px' }, 'data-tip': '<b>' + sname + '</b><br>' + D.STAT_INFO[sname] }, [el('div', { cls: 'small muted', text: sname }), el('div', { style: { fontSize: '20px' }, cls: 'gold', text: S.heroStat(st(), h, sname) })])));
      const xpNext = S.xpFor(h.level + 1);
      body.appendChild(el('div', { cls: 'row' }, [U.portrait(h.people, h.look, P.color, 72), el('div', {}, [el('h2', { text: h.name }), el('div', { cls: 'muted', text: D.PEOPLES[h.people].name + ' of the Duskareth · Level ' + h.level + ' · ' + h.xp + ' / ' + xpNext + ' XP' }),
        el('div', { cls: 'small' }, ['Breath ' + Math.round(h.breath) + ' / ' + M.breathMax(st(), h), ' · Specialty: ', el('span', { cls: 'gold', text: D.CREATURES[h.spec.cr].plural + ' +' + h.spec.pct + '%' }), ' · Mount: ' + (h.mount === 'kuni' ? 'Kuni Byrd' : 'Domestic Punk')])]), el('div', { cls: 'spacer' }), btn('Close', () => m.close(), 'primary')]));
      if (h.levelUps.length) { const u = h.levelUps[0]; const sts = u.stats || [u.stat];
        const pickS = h._pickStat && sts.includes(h._pickStat) ? h._pickStat : null, pickK = h._pickSkill && u.choice.includes(h._pickSkill) ? h._pickSkill : null;
        const done = () => { if ((pickS || sts.length < 2) && (h._pickSkill || !u.choice.length)) { RU.resolveLevelUp(st(), h, h._pickSkill, h._pickStat || sts[0]); h._pickStat = h._pickSkill = null; } render(); };
        body.appendChild(el('div', { cls: 'frame', style: { borderColor: '#d9b87a', margin: '8px 0' } }, [el('b', { cls: 'gold', text: '★ Level ' + u.level + '! ' }),
          'Raise a stat: ', ...sts.map(x => btn(x + ' ' + h.stats[x] + ' → ' + (h.stats[x] + 1), () => { h._pickStat = x; done(); }, pickS === x ? 'primary' : '')),
          u.choice.length ? el('span', { text: '  and a skill: ' }) : null, ...u.choice.map(id => btn(D.SKILLS[id].name + ' → ' + Math.min(5, (h.skills[id] || 0) + 1), () => { h._pickSkill = id; done(); }, pickK === id ? 'primary' : ''))])); }
      body.appendChild(statRow);
      /* skills */
      const own = Object.entries(h.skills);
      body.appendChild(el('h3', { text: 'Skills', style: { marginTop: '10px' } }));
      body.appendChild(el('div', {}, own.map(([id, lv]) => el('span', { cls: 'skillchip act', 'data-tip': '<b>' + D.SKILLS[id].name + ' ' + U.pips(lv) + '</b><br>' + D.SKILLS[id].desc + '<br>Now: ' + D.SKILLS[id].per[lv - 1] + D.SKILLS[id].unit + (id === h.base ? '<br><i>This hero’s own skill.</i>' : '') }, [(id === h.base ? '◆ ' : '') + D.SKILLS[id].name, el('span', { cls: 'pips', text: U.pips(lv) })]))));
      if (own.length < 5) body.appendChild(el('p', { cls: 'warn small', text: 'This hero has ' + own.length + ' of 5 basic skills. Train at the training halls of a town before leaving.' }));
      /* memory cores */
      body.appendChild(el('h3', { text: 'Core Pouch', style: { marginTop: '10px' }, 'data-tip': 'The pouch holds 3 active cores. Each core offers skills; choose 2 to be active. Change them any time out of battle.' }));
      const pouch = el('div', { cls: 'col' });
      for (let i = 0; i < 3; i++) {
        const cid = h.pouch[i], c = cid && st().cores[cid];
        if (!c) { pouch.appendChild(el('div', { cls: 'frame small muted', text: 'Empty place in the pouch.' })); continue; }
        pouch.appendChild(el('div', { cls: 'frame row' }, [U.coreIcon(c.kind, 30), el('div', { style: { minWidth: '150px' } }, [el('b', { text: 'Core of ' + c.name }), el('div', { cls: 'small muted', text: 'Choose 2 to be active' })]),
          el('div', { style: { flex: 1 } }, c.offer.map((s, k) => { const on = c.active.includes(k);
            return el('span', { cls: 'skillchip click' + (on ? ' act' : ''), onclick: () => { if (on) c.active = c.active.filter(x => x !== k); else { c.active.push(k); if (c.active.length > 2) c.active.shift(); } render(); }, 'data-tip': '<b>' + D.SKILLS[s.id].name + ' ' + U.pips(s.lv) + '</b><br>' + D.SKILLS[s.id].desc }, [D.SKILLS[s.id].name, el('span', { cls: 'pips', text: U.pips(s.lv) })]); })),
          btn('Take out', () => { RU.swapCore(st(), h, cid); render(); }, '', 'Keep it, but not in the pouch')]));
      }
      body.appendChild(pouch);
      if (h.cores.length) {
        body.appendChild(el('div', { cls: 'small muted', text: 'Carried cores (not in the pouch):', style: { marginTop: '6px' } }));
        body.appendChild(el('div', { cls: 'row' }, h.cores.map(cid => { const c = st().cores[cid]; if (!c) return null;
          return el('div', { cls: 'frame row small', 'data-tip': c.kind === 'captain' ? 'A captain’s core. Bring it to a town with a Memory Vault to make a new captain with all of ' + c.name + '’s abilities.' : 'Skills: ' + c.skills.map(s => D.SKILLS[s.id].name + ' ' + s.lv).join(', ') }, [U.coreIcon(c.kind, 22), (c.kind === 'captain' ? 'Captain ' : '') + c.name, c.kind === 'hero' && h.pouch.length < 3 ? btn('To pouch', () => { RU.swapCore(st(), h, cid); if (!c.offer.length) M.drawOffer(st(), c, h); render(); }) : null]); })));
      }
      /* songs */
      body.appendChild(el('h3', { text: 'Songs', style: { marginTop: '10px' } }));
      body.appendChild(el('div', {}, h.songs.length ? h.songs.map(sid => { const s = D.SONGS[sid]; return el('span', { cls: 'skillchip', 'data-tip': '<b>' + s.name + '</b> (tier ' + s.tier + ', ' + s.breath + ' Breath, ' + (s.where === 'map' ? 'on the map' : 'in battle') + ')<br>' + s.desc }, [s.where === 'map' ? '🗺 ' : '⚔ ', s.name]); }) : [el('span', { cls: 'small muted', text: S.skill(st(), h, 'songcraft') ? 'No songs yet. Learn them at a Hall of Songs, from Song Stones, scrolls and cores.' : 'This hero cannot sing. Songcraft is learned at the Hall of the Duat.' })]));
      /* relics */
      body.appendChild(el('h3', { text: 'Relics', style: { marginTop: '10px' } }));
      const doll = el('div', { cls: 'row' });
      D.SLOTS.forEach(sl => { const rid = h.relics[sl];
        doll.appendChild(el('div', { cls: 'relslot', onclick: () => { if (rid) { RU.unequip(st(), h, sl); render(); } }, 'data-tip': rid ? relicTip(rid) + '<br><i>Click to take it off.</i>' : D.SLOT_NAME[sl] }, [rid ? U.relicIcon(rid, 36) : null, el('span', { cls: 'sl', text: D.SLOT_NAME[sl] })])); });
      doll.appendChild(el('div', { cls: 'relslot', style: { borderColor: '#8e7cff' }, 'data-tip': '<b>Core Pouch</b><br>Every hero always has one. It holds 3 active memory cores.' }, [U.coreIcon('hero', 30), el('span', { cls: 'sl', text: 'Pouch' })]));
      body.appendChild(doll);
      if ((h.pack || []).length) body.appendChild(el('div', { cls: 'row', style: { marginTop: '4px' } }, [el('span', { cls: 'small muted', text: 'Pack:' }), ...h.pack.map(rid => el('div', { cls: 'relslot', onclick: () => { RU.equip(st(), h, rid, true); render(); }, 'data-tip': relicTip(rid) + '<br><i>Click to wear it.</i>' }, U.relicIcon(rid, 36)))]));
      if ((h.linked || []).length) body.appendChild(el('div', { cls: 'small duat', text: 'Linked through the Duat: ' + h.linked.map(r => D.RELICS[r].name).join(', ') }));
      /* army */
      body.appendChild(el('h3', { text: 'Army', style: { marginTop: '10px' } }));
      const loc = S.heroLocation(st(), h);
      body.appendChild(DL.armyEditor([{ label: h.name + '’s army', slots: h.slots, hero: h, keepOne: !!loc.army }], () => U.refresh()));
    }
    render();
    return m;
  };
  function relicTip(rid) { const r = D.RELICS[rid]; return '<b style="color:' + D.RARE_COLOR[r.rare] + '">' + r.name + '</b> (' + r.rare + ')<br>' + Object.entries(r.mods).map(([k, v]) => (v > 0 ? '+' : '') + v + ' ' + ({ luck: 'luck', breath: 'Breath', rangedPct: '% ranged damage', duatSafe: '% safer Duat crossings', sight: 'sight', foodPct: '% food eaten', goldDay: ' gold a day', stormSense: 'sense the storm', morale: ' morale for the whole army' }[k] || k)).join(', ') + (r.desc ? '<br><span class="muted">' + r.desc + '</span>' : ''); }
  DL.relicTip = relicTip;

  /* ======================= things that need an answer ======================= */
  DL.need = function (a, r) {
    const h = S.heroOf(st(), a), o = r.obj;
    switch (r.need) {
      case 'chest': {
        const g = Math.round(o.gold * (1 + S.skillVal(st(), h, 'plunder') / 100)), xp = o.xp;
        const m = U.modal([el('h2', { text: 'A treasure chest' }), el('p', { text: 'Keep the gold, or give it to the poor of the road and learn from it?' }),
          el('div', { cls: 'acts' }, [btn(xp + ' XP', () => { take(); const ups = RU.giveXp(st(), h, xp); m.close(); if (ups.length) DL.hero(h); }), btn(g + ' gold', () => { me().res.gold += g; take(); m.close(); }, 'primary')])]);
        function take() { o.gone = true; S.unplace(st(), o); delete st().objects[o.id]; U.refresh(); }
        break; }
      case 'join': {
        const C = D.CREATURES[r.offer.cr];
        U.confirm('Wanderers’ Camp', r.offer.n + ' ' + C.plural + ' at the camp would follow you. Take them?', () => { if (!RU.addToSlots(st(), S.slotsOf(st(), a), r.offer.cr, r.offer.n, h)) U.toast('No room for them.'); U.refresh(); });
        break; }
      case 'tavern': DL.tavern(null, a); break;
      case 'trainer': DL.trainer(a, o); break;
      case 'quest': DL.quest(a, o); break;
      case 'fair': DL.fair(a, o); break;
      case 'shipyard': DL.shipyard(a, o); break;
      case 'shrine': DL.shrine(a, o); break;
      case 'aerie': {
        const h2 = S.heroOf(st(), a), P = me(), cost = { gold: 6000, food: 30 };
        U.confirm('Kuni Byrd Aerie', el('div', {}, [el('p', { text: 'A young Kuni Byrd watches ' + h2.name + ' with one golden eye. Win its trust and it will carry you — over water and mountains too, if your whole army flies.' }), U.costView(cost, P)]), () => {
          if (!RU.afford(P, cost)) { U.toast('Not enough.'); return; } RU.pay(P, cost); h2.mount = 'kuni'; o.taken = true; U.toast(h2.name + ' now rides a Kuni Byrd!'); U.refresh(); }, null, ['Win its trust', 'Leave it']);
        break; }
    }
  };

  /* ---------- the tavern (in a town, or by the road) ---------- */
  DL.tavern = function (town, a) {
    const P = me();
    if (!P.tavern.heroes.length) RU.refreshTavern(st(), P);
    const m = U.modal(el('div'), { wide: true, onClose: () => U.refresh() });
    function render() {
      const b = m.box; b.innerHTML = '';
      b.appendChild(el('h2', { text: town ? 'The ' + D.bname('tavern', town.faction) : 'The Tavern' }));
      b.appendChild(el('p', { cls: 'small muted', text: 'New faces come every week. A hero must learn all five basic skills at a town’s training halls before they can leave it. Only ' + D.MAX_FIELD_HEROES + ' heroes can be out on the map at once.' }));
      b.appendChild(el('h3', { text: 'Heroes — ' + M.heroCost + ' gold' }));
      b.appendChild(el('div', { cls: 'row', style: { alignItems: 'stretch' } }, P.tavern.heroes.map(id => { const h = st().heroes[id]; if (!h) return null;
        return el('div', { cls: 'frame col', style: { width: '230px' } }, [el('div', { cls: 'row' }, [U.portrait(h.people, h.look, P.color, 48), el('div', {}, [el('b', { text: h.name }), el('div', { cls: 'small muted', text: D.PEOPLES[h.people].name })])]),
          el('div', { cls: 'small' }, D.STATS.map(s => s.slice(0, 3) + ' ' + h.stats[s]).join(' · ')),
          el('div', { cls: 'small' }, ['Own skill: ', el('span', { cls: 'gold', text: D.SKILLS[h.base].name })]),
          el('div', { cls: 'small' }, ['Specialty: ' + D.CREATURES[h.spec.cr].plural + ' +' + h.spec.pct + '%']),
          town ? btn('Hire', () => { const r = RU.hireHero(st(), P, town, id); if (!r.ok) U.toast(r.why || 'Cannot hire.'); else U.toast(h.name + ' joins you in ' + town.name + '. Send them to the training halls.'); render(); SU.emit('town'); }, 'primary') : el('div', { cls: 'small muted', text: 'Hire heroes in a town’s tavern.' })]); })));
      b.appendChild(el('h3', { text: 'Squadron captains', style: { marginTop: '10px' } }));
      const where = town ? 'the town garrison' : 'your army';
      b.appendChild(el('div', { cls: 'row', style: { alignItems: 'stretch' } }, P.tavern.captains.map((c, i) => el('div', { cls: 'frame col', style: { width: '200px' } }, [el('div', { cls: 'row' }, [U.captainIcon(c, 40, P.color), el('div', {}, [el('b', { text: c.name }), el('div', { cls: 'small muted', text: D.CAPTAIN_RANKS[c.rank].name + ' · ' + D.PEOPLES[c.people].name })])]),
        el('div', { cls: 'small' }, ['Level ' + c.level + ' · Morale +' + ((c.morale || 0) * 5) + ' · Luck ' + c.luck + ' · Leads ' + c.capacity + (c.elite ? ' (peerless)' : '')]),
        el('div', { cls: 'small', 'data-tip': D.CAPTAIN_ABIL[c.abil].desc }, [el('span', { cls: 'gold', text: D.CAPTAIN_ABIL[c.abil].name }), ': ' + D.CAPTAIN_ABIL[c.abil].desc]),
        btn('Hire — ' + M.captainCost(c) + ' gold', () => { const slots = town ? town.garrison : S.slotsOf(st(), a); const r = RU.hireCaptain(st(), P, town, i, slots); if (!r.ok) U.toast(r.why || 'Cannot hire.'); else U.toast(c.name + ' joins ' + where + '.'); render(); SU.emit('town'); }, 'primary')]))));
      b.appendChild(el('div', { cls: 'acts' }, [btn('Leave', () => m.close())]));
    }
    render();
  };

  /* ---------- a wandering trainer ---------- */
  DL.trainer = function (a, o) {
    const h = S.heroOf(st(), a), P = me();
    const opts = Object.entries(h.skills).filter(([, lv]) => lv < 5);
    const price = lv => 1000 + lv * 1000;
    const m = U.modal([el('h2', { text: 'A Wandering Trainer' }), el('p', { text: '“I can teach you one thing this week. Choose.”' }),
      el('div', { cls: 'col' }, opts.map(([id, lv]) => el('div', { cls: 'row' }, [el('span', { style: { flex: 1 } }, D.SKILLS[id].name + ' ' + lv + ' → ' + (lv + 1)), U.costView({ gold: price(lv) }, P), btn('Learn', () => { if (P.res.gold < price(lv)) { U.toast('Not enough gold.'); return; } P.res.gold -= price(lv); h.skills[id]++; o.visited[h.id] = S.cal(st().day).weekAbs; m.close(); U.toast(h.name + ' now has ' + D.SKILLS[id].name + ' ' + h.skills[id] + '.'); U.refresh(); }, 'primary')]))),
      el('div', { cls: 'acts' }, [btn('Not now', () => m.close())])]);
  };

  /* ---------- quests from a seer ---------- */
  DL.quest = function (a, o) {
    const h = S.heroOf(st(), a), P = me(), R = SU.rng(st());
    if (!o.quest) {
      const dead = Object.values(st().objects).find(u => u.type === 'urverk' && !u.triggerKnown);
      const wild = Object.values(st().armies).filter(w => w.wild && !w.dead && !w.herd && !w.mcfly && w.layer === o.layer && S.power(w.slots) > 4000).sort((p, q) => Math.hypot(p.x - o.x, p.y - o.y) - Math.hypot(q.x - o.x, q.y - o.y))[0];
      const kinds = ['bring'];
      if (wild) kinds.push('slay', 'slay');
      if (dead) kinds.push('trigger', 'trigger');
      const kind = R.pick(kinds);
      if (kind === 'bring') { const res = R.pick(['wood', 'stone', 'stygian', 'glowmoss', 'timber', 'food']); o.quest = { kind, res, amt: D.RES_INFO[res].common ? R.int(10, 20) : R.int(3, 6), reward: { gold: R.pick([2500, 3500, 5000]), xp: R.pick([1000, 2000]) } }; }
      else if (kind === 'slay') o.quest = { kind, target: wild.id, desc: 'the ' + S.stacksIn(wild.slots).map(s => D.CREATURES[s.cr].plural).join(' and ') + ' at ' + wild.x + ',' + wild.y, reward: { gold: 3000, xp: 3000, relic: R.pick(D.RELIC_IDS.filter(r => D.RELICS[r].rare === 'rare')) } };
      else o.quest = { kind, target: dead.id, reward: { xp: 2500 }, desc: 'the lost trigger of the Urverk at ' + dead.x + ',' + dead.y + ' on ' + D.LAYERS[dead.layer].name };
    }
    const q = o.quest;
    let text, done = false;
    if (q.kind === 'bring') { text = '“Bring me ' + q.amt + ' ' + D.RES_INFO[q.res].name + '.”'; done = (P.res[q.res] || 0) >= q.amt; }
    else if (q.kind === 'slay') { text = '“Rid the land of ' + q.desc + '.”'; done = !st().armies[q.target] || st().armies[q.target].dead; }
    else { text = '“Find ' + q.desc + '. I know someone who remembers it — bring me 3 Glowmoss and 2000 gold for their trouble.”'; done = P.res.glowmoss >= 3 && P.res.gold >= 2000; }
    const reward = 'Reward: ' + [q.reward.gold && q.reward.gold + ' gold', q.reward.xp && q.reward.xp + ' XP', q.reward.relic && D.RELICS[q.reward.relic].name].filter(Boolean).join(', ');
    const m = U.modal([el('h2', { text: 'Seer’s Hut' }), el('p', { text }), el('p', { cls: 'small muted', text: reward }), el('div', { cls: 'acts' }, [btn('Later', () => m.close()), done && h ? btn('It is done', () => {
      if (q.kind === 'bring') P.res[q.res] -= q.amt;
      if (q.kind === 'trigger') { P.res.glowmoss -= 3; P.res.gold -= 2000; const u = st().objects[q.target]; if (u) { u.triggerKnown = true; const l = st().objects[u.link]; if (l) l.triggerKnown = true; } }
      if (q.reward.gold) P.res.gold += q.reward.gold;
      if (q.reward.relic) RU.giveRelic(st(), h, q.reward.relic);
      const ups = q.reward.xp ? RU.giveXp(st(), h, q.reward.xp) : [];
      o.quest = null; o.done = (o.done || 0) + 1; m.close(); U.toast('The seer is pleased.'); U.refresh(); if (ups.length) DL.hero(h);
    }, 'primary') : null])]);
  };

  /* ---------- the fair: watch and bet, never take part ---------- */
  DL.fair = function (a, o) {
    const P = me();
    if (!S.isMarketDay(st())) { U.alert('Fair Grounds', 'The grounds are empty. The fair comes on market day — day ' + D.MARKET_DAY + ' of every week.'); return; }
    if (o.visited.day === st().day && o.visited.who === U.viewer) { U.alert('Fair Grounds', 'You have had your fun for today. Come back next market day.'); return; }
    const R = SU.makeRng(st().seed + st().day * 7 + o.x);
    const punks = ['Old Turnip', 'Vinekick', 'Duatdash', 'Gourdon', 'Lady Squash', 'Rindrunner'].map((n, i) => ({ n, speed: R.range(0.8, 1.2), odds: 0 }));
    punks.forEach(p => p.odds = Math.max(1.5, Math.round((3.2 - p.speed * 1.8 + R.range(0, 1.4)) * 10) / 10 + 1.5));
    const players = [R.pick(D.NAMES.eikar) + ' of ' + R.pick(M.TOWN_NAMES), R.pick(D.NAMES.keilia) + ' of ' + R.pick(M.TOWN_NAMES)];
    let bet = Math.min(500, P.res.gold), pick = 0, kind = 'race';
    const m = U.modal(el('div'), { wide: true });
    function render() {
      const b = m.box; b.innerHTML = '';
      b.appendChild(el('h2', { text: 'The Fair of the Lantern' }));
      b.appendChild(el('div', { cls: 'tabs' }, [btn('Punk racing', () => { kind = 'race'; pick = 0; render(); }, kind === 'race' ? 'on' : ''), btn('A Dya’Akara match', () => { kind = 'match'; pick = 0; render(); }, kind === 'match' ? 'on' : '')]));
      if (kind === 'race') b.appendChild(el('div', { cls: 'col' }, punks.map((p, i) => el('label', { cls: 'row' }, [el('input', { type: 'radio', name: 'pk', checked: i === pick ? 'checked' : null, onchange: () => { pick = i; } }), el('span', { style: { flex: 1 } }, p.n), el('span', { cls: 'gold', text: 'pays ' + p.odds + '×' })]))));
      else b.appendChild(el('div', { cls: 'col' }, [el('p', { cls: 'small muted', text: 'Two players of the token game face off in the tavern yard. You can only watch, and bet.' }), ...players.map((p, i) => el('label', { cls: 'row' }, [el('input', { type: 'radio', name: 'pm', checked: i === pick ? 'checked' : null, onchange: () => { pick = i; } }), el('span', { style: { flex: 1 } }, p), el('span', { cls: 'gold', text: 'pays 1.9×' })]))]));
      const amt = el('input', { cls: 'inp', type: 'number', min: 0, max: P.res.gold, step: 100, value: bet, style: { width: '110px' }, oninput: e => bet = SU.clamp(+e.target.value || 0, 0, P.res.gold) });
      const cv = el('canvas', { width: 900, height: 230, style: { width: '100%', maxWidth: '900px', borderRadius: '6px', marginTop: '8px', background: '#2a2016' } });
      b.appendChild(el('div', { cls: 'row', style: { marginTop: '8px' } }, ['Bet', amt, 'gold', btn('Watch!', () => run(cv), 'primary'), btn('Leave', () => m.close())]));
      b.appendChild(cv);
    }
    function run(cv) {
      if (bet > P.res.gold) bet = P.res.gold;
      P.res.gold -= bet; o.visited = { day: st().day, who: U.viewer };
      m.box.querySelectorAll('.btn').forEach(x => { if (x.textContent === 'Watch!') x.disabled = true; });
      const g = cv.getContext('2d'); let t0 = performance.now();
      if (kind === 'race') {
        const pos = punks.map(() => 0); let winner = -1;
        const loop = now => { const t = (now - t0) / 1000;
          g.fillStyle = '#3a5a2a'; g.fillRect(0, 0, 900, 230); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#7a5a34' : '#6a4a2a'; g.fillRect(0, 10 + i * 36, 900, 34); }
          g.fillStyle = '#fff'; g.fillRect(840, 8, 6, 216);
          punks.forEach((p, i) => { if (winner < 0) pos[i] += (p.speed * R.range(0.4, 1.6)) * 3.2; if (pos[i] >= 800 && winner < 0) winner = i; A.creature(g, 'punk', 40 + Math.min(800, pos[i]), 42 + i * 36, 28, { t: t * 2 + i, tint: 2 }); g.fillStyle = '#ffe3a3'; g.font = '12px Georgia'; g.fillText(p.n, 6, 30 + i * 36); });
          if (winner < 0) requestAnimationFrame(loop); else finish(winner === pick, punks[winner].n + ' wins!', punks[pick].odds);
        }; requestAnimationFrame(loop);
      } else {
        const w = R.chance(0.5) ? 0 : 1; let k = 0;
        const loop = now => { const t = (now - t0) / 1000; g.fillStyle = '#2a2016'; g.fillRect(0, 0, 900, 230);
          g.fillStyle = '#d9b87a'; g.font = '16px Georgia'; g.fillText(players[0], 30, 30); g.textAlign = 'right'; g.fillText(players[1], 870, 30); g.textAlign = 'left';
          ['malsti', 'harkal', 'tyndael'].forEach((c, i) => { A.creature(g, D.CREATURES[c].art, 180 + Math.sin(t * 3 + i) * 30 + (t > 3 && w === 1 ? -200 : 0), 200 - i * 50, 34, { t, f: 1, alpha: t > 3 && w === 1 ? 0.3 : 1 }); A.creature(g, D.CREATURES[['kaloeik', 'xiweik', 'ver'][i]].art, 720 - Math.sin(t * 3 + i) * 30 + (t > 3 && w === 0 ? 200 : 0), 200 - i * 50, 34, { t, f: -1, alpha: t > 3 && w === 0 ? 0.3 : 1 }); });
          if (t < 4) requestAnimationFrame(loop); else finish(w === pick, players[w] + ' wins the match!', 1.9);
        }; requestAnimationFrame(loop);
      }
    }
    function finish(won, text, odds) {
      const pay = won ? Math.round(bet * odds) : 0; P.res.gold += pay;
      U.toast(text + (won ? ' You win ' + pay + ' gold!' : bet ? ' You lose your bet.' : ''), 4000); U.refresh();
    }
    render();
  };

  /* ---------- shipyards ---------- */
  DL.shipyard = function (a, o) {
    const P = me(), cost = { gold: 1000, wood: 10 };
    const water = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = o.x + dx, y = o.y + dy; if (S.passable(st(), o.layer, x, y, { boat: true }) && !S.objAt(st(), o.layer, x, y) && !S.armyAt(st(), o.layer, x, y)) water.push([x, y]); }
    U.confirm('Shipyard', el('div', {}, [el('p', { text: water.length ? 'Build a boat? It will wait for you on the water nearby.' : 'There is no free water here to launch a boat.' }), U.costView(cost, P)]), () => {
      if (!water.length) return; if (!RU.afford(P, cost)) { U.toast('Not enough.'); return; }
      RU.pay(P, cost); const [x, y] = water[0]; const b = { id: SU.uid(st(), 'o'), type: 'boat', layer: o.layer, x, y, owner: a.owner }; st().objects[b.id] = b; S.place(st(), b); U.refresh();
    }, null, ['Build', 'Not now']);
  };

  /* ---------- the Kalo Shrine and the Kahizecvar ---------- */
  DL.shrine = function (a, o) {
    const h = S.heroOf(st(), a), P = me();
    const q = RU.shrineQuest(st(), o, h);
    const keeper = o.keeper || 'the Kalo';
    if (q && !q.done) {
      const ok = q.kind === 'gold' ? P.res.gold >= q.amt : (P.res[q.res] || 0) >= q.amt;
      const ask = q.kind === 'gold' ? q.amt + ' gold for the shrine' : q.amt + ' ' + D.RES_INFO[q.res].name;
      U.modal([el('h2', { text: 'The Kalo Shrine of ' + (o.moon || 'a moon') }), el('p', { text: keeper + ', who keeps the shrine, looks you over. “Before the Kahizecvar, a gift for the shrine: ' + ask + '.”' }),
        el('div', { cls: 'acts' }, [btn('Later', function () { this.closest('.overlay').remove(); }), ok ? btn('Give it', function () { if (q.kind === 'gold') P.res.gold -= q.amt; else P.res[q.res] -= q.amt; q.done = true; this.closest('.overlay').remove(); U.refresh(); DL.shrine(a, o); }, 'primary') : null])]);
      return;
    }
    if (o.visited[h.id] === 'kahiz') { U.alert('The Kalo Shrine', keeper + ' shakes their head. “You have done the Kahizecvar here already. Find another shrine.”'); return; }
    const cost = RU.kahizCost(h);
    let core = null, picks = [];
    const m = U.modal(el('div'), { wide: true });
    function render() {
      const b = m.box; b.innerHTML = '';
      b.appendChild(el('h2', { text: 'The Kahizecvar' }));
      b.appendChild(el('p', { text: 'In the trance, ' + h.name + ' merges with a memory core from the pouch and keeps three of its skills for ever. The core is used up. Each Kahizecvar costs ' + h.name + ' twice what the last one did.' }));
      b.appendChild(el('div', { cls: 'row' }, ['Cost: ', U.costView(cost, P)]));
      const pouch = h.pouch.map(id => st().cores[id]).filter(c => c && c.kind === 'hero');
      if (!pouch.length) b.appendChild(el('p', { cls: 'warn', text: 'There is no memory core in the pouch.' }));
      b.appendChild(el('div', { cls: 'row' }, pouch.map(c => btn('Core of ' + c.name, () => { core = c; picks = []; render(); }, core === c ? 'duat' : ''))));
      if (core) {
        b.appendChild(el('p', { cls: 'small muted', text: 'Choose ' + Math.min(3, core.offer.length) + ':' }));
        b.appendChild(el('div', {}, core.offer.map((s, k) => el('span', { cls: 'skillchip click' + (picks.includes(k) ? ' act' : ''), onclick: () => { if (picks.includes(k)) picks = picks.filter(x => x !== k); else if (picks.length < 3) picks.push(k); render(); } }, [D.SKILLS[s.id].name, el('span', { cls: 'pips', text: U.pips(s.lv) }), (h.skills[s.id] ? el('span', { cls: 'small muted', text: ' (have ' + h.skills[s.id] + ')' }) : null)]))));
      }
      b.appendChild(el('div', { cls: 'acts' }, [btn('Leave', () => m.close()), core ? btn('Enter the trance', () => { const r = RU.kahizecvar(st(), h, o, core.id, picks); if (!r.ok) { U.toast(r.why); return; } m.close(); U.alert('The Kahizecvar', h.name + ' wakes from the trance remembering what ' + core.name + ' knew.'); U.refresh(); }, 'duat') : null]));
    }
    render();
  };

  /* ---------- herds ---------- */
  DL.herd = function (a, w) {
    const h = S.heroOf(st(), a), P = me(), stx = S.stacksIn(w.slots)[0]; if (!stx) return;
    const C = D.CREATURES[stx.cr], tame = h ? S.skill(st(), h, 'beasts') : 0, warden = S.captainsIn(S.slotsOf(st(), a)).some(c => c.abil === 'beastwarden');
    const can = tame > 0 || warden, food = Math.ceil(stx.n * 0.8);
    U.modal([el('h2', { text: 'A herd of ' + C.plural }), el('p', { text: stx.n + ' ' + C.plural + ' graze here, wary of you.' }),
      el('p', { cls: 'small muted', text: can ? 'You know how to handle beasts. They can be tamed for ' + food + ' food.' : 'Without Beastmastery (or a Beastwarden captain) they will not let you near.' }),
      el('p', { cls: 'small muted', text: 'Or drive them home: they follow this army, and the farmers of the first of your towns it reaches take them in. You can then buy them there as mounts, so your armies travel further.' }),
      el('div', { cls: 'acts' }, [btn('Leave them', function () { this.closest('.overlay').remove(); }), btn('Drive them off', function () { this.closest('.overlay').remove(); SU.game.battle({ attacker: a, defender: w }); }, 'danger'),
        btn('Corral them home', function () { if (a.corral) { U.toast('This army is already driving a herd.'); return; } a.corral = { cr: stx.cr, n: stx.n }; RU.removeArmy(st(), w); this.closest('.overlay').remove(); U.toast('The herd follows you. Bring it to one of your towns.'); U.refresh(); }),
        can ? btn('Tame them', function () { if (P.res.food < food) { U.toast('Not enough food.'); return; } if (!RU.addToSlots(st(), S.slotsOf(st(), a), stx.cr, stx.n, h)) { U.toast('No room for them.'); return; } P.res.food -= food; RU.removeArmy(st(), w); this.closest('.overlay').remove(); U.toast('The herd follows you now.'); U.refresh(); }, 'primary') : null])]);
  };

  /* ---------- Urverk ---------- */
  DL.urverk = function (a, o) {
    const dest = st().objects[o.link], open = RU.urverkOpen(st(), o), n = RU.urverkNext(st(), o);
    const kind = { aligned: 'This Urverk only works when the worlds are in the right places.', toll: 'This Urverk is kept by ' + (o.toll ? o.toll.family : 'a family') + ', who ask a toll to work it.', danger: 'A dangerous crossing: the Duat here is restless. The Duskareth know it better than anyone, but even they lose people here.', always: 'This Urverk works in any position of the worlds.', kalo: 'A Kalo Urverk, to ' + (o.moon || 'a moon') + '. It opens only on the moon’s near pass.' }[o.kind];
    const lines = [el('p', { text: kind }), el('p', { cls: 'small', text: 'It leads to ' + (dest ? D.LAYERS[dest.layer].name : 'nowhere') + '. ' + (!o.triggerKnown ? 'Nobody alive knows its trigger.' : open ? 'It is open' + (o.window ? ' for ' + SU.plural(RU.urverkOpenFor(st(), o), 'more day') : '') + '.' : 'It is closed. It opens in ' + SU.plural(n, 'day') + '.') })];
    const m = U.modal([el('h2', { text: 'Urverk' }), ...lines, el('div', { cls: 'acts' }, [btn('Stay', () => m.close()), o.triggerKnown && open ? btn('Step through', () => { m.close(); cross(); }, 'duat') : null])]);
    function cross(choice) {
      const r = RU.crossUrverk(st(), a, o, choice);
      if (r.need === 'toll') {
        const P = me(); const resp = o.toll.paid && o.toll.paid[a.owner] || 0;
        const mm = U.modal([el('h2', { text: o.toll.family }), el('p', { text: '“The toll is ' + r.price + ' gold. Pay it three times and you are a friend of the house: your armies pass free for ever.”' }), el('p', { cls: 'small muted', text: 'You have paid ' + resp + ' of 3 times.' }),
          el('div', { cls: 'acts' }, [btn('Turn back', () => mm.close()), btn('Take the Urverk by force', () => { mm.close(); U.confirm('By force?', 'There is a ' + Math.round(Math.max(0, 0.5 - 0.05 * (S.heroOf(st(), a) ? S.skill(st(), S.heroOf(st(), a), 'diplomacy') : 0)) * 100) + '% chance that everyone who knows the trigger dies in the fighting — and then nobody can work this Urverk. Diplomacy makes it less likely.', () => tollFight()); }, 'danger'), btn('Pay ' + r.price, () => { mm.close(); cross('pay'); }, 'primary')])]);
        return;
      }
      if (!r.ok) { if (r.msg) U.alert('Urverk', r.msg); return; }
      V.centerOn(a.layer, a.x, a.y); U.refresh(); if (r.msg) U.toast(r.msg, 4200);
      if (r.event) U.handle(a, { event: r.event });
    }
    function tollFight() {
      const g = RU.tempWild(st(), a, 3000 + st().day * 200, ['velnur', 'ver', 'kaloeik']);
      SU.game.battle({ attacker: a, defender: g, temp: true, after: rep => {
        if (rep.winner !== 0) return;
        const h = S.heroOf(st(), a); const risk = Math.max(0, 0.5 - 0.05 * (h ? S.skill(st(), h, 'diplomacy') : 0));
        const both = [o, st().objects[o.link]].filter(Boolean);
        if (SU.rng(st()).chance(risk)) { both.forEach(u => { u.triggerKnown = false; if (u.toll) u.toll.alive = false; }); U.alert('Silence', 'Everyone who knew the trigger lies dead. The Urverk is still. Perhaps a seer knows someone who remembers it.'); }
        else { both.forEach(u => { if (u.toll) { u.toll.alive = false; } }); U.alert('The Urverk is yours', 'The family yields and teaches you the trigger. Nobody will ask you for a toll here again.'); }
        U.refresh();
      } });
    }
  };

  /* ======================= map songs ======================= */
  DL.mapSongs = function (a) {
    const h = S.heroOf(st(), a); const songs = h.songs.filter(s => D.SONGS[s].where === 'map');
    const m = U.modal([el('h2', { text: h.name + '’s map songs' }), el('p', { cls: 'small muted', text: 'Breath ' + Math.round(h.breath) + ' / ' + M.breathMax(st(), h) }),
      songs.length ? el('div', { cls: 'col' }, songs.map(sid => { const s = D.SONGS[sid]; return el('div', { cls: 'row frame' }, [el('div', { style: { flex: 1 } }, [el('b', { text: s.name }), el('div', { cls: 'small muted', text: s.desc })]), el('span', { cls: 'small', text: s.breath + ' Breath' }), btn('Sing', () => { m.close(); singMap(a, h, sid); }, 'duat', null)]); })) : el('p', { text: 'This hero knows no songs for the map.' }),
      el('div', { cls: 'acts' }, [btn('Close', () => m.close())])]);
  };
  function singMap(a, h, sid) {
    const s = D.SONGS[sid], P = me(); if (h.breath < s.breath) { U.toast('Not enough Breath.'); return; }
    const pay = () => { h.breath -= s.breath; U.refresh(); };
    const stt = st();
    switch (sid) {
      case 'farhear': U.toast('Click a place on the map to listen there.'); U.pickTile = t => { pay(); S.reveal(stt, U.viewer, V.layer, t.x, t.y, 6 + S.skill(stt, h, 'songcraft')); U.refresh(); }; break;
      case 'pathsong': pay(); a.pathsong = stt.day; U.toast('Rough ground is easy going for the rest of today.'); break;
      case 'stormscent': pay(); { const sm = stt.storm; V.centerOn(sm.layer, sm.x, sm.y); S.reveal(stt, U.viewer, sm.layer, sm.x, sm.y, 3); U.toast('The eye of the Sunear’Zikhron is on ' + D.LAYERS[sm.layer].name + '.'); U.refresh(); } break;
      case 'skyread': { pay(); const list = Object.values(stt.objects).filter(o => o.type === 'urverk' && P.explored[o.layer][o.y * stt.layers[o.layer].w + o.x]);
        U.alert('The sky', el('table', { cls: 'grid' }, [el('tr', {}, [el('th', { text: 'Urverk' }), el('th', { text: 'Where' }), el('th', { text: 'Now' })]), ...list.map(o => el('tr', {}, [el('td', { text: o.kind }), el('td', { text: D.LAYERS[o.layer].name + ' ' + o.x + ',' + o.y }), el('td', { text: !o.triggerKnown ? 'dead' : RU.urverkOpen(stt, o) ? 'open ' + (o.window ? RU.urverkOpenFor(stt, o) + 'd' : '') : 'opens in ' + RU.urverkNext(stt, o) + 'd' })]))])); break; }
      case 'homeward': { const ts = S.townsOf(stt, a.owner).sort((p, q) => (p.layer !== a.layer) - (q.layer !== a.layer) || Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y));
        const t = ts[0]; if (!t) { U.toast('You have no town.'); return; } if (S.armyAt(stt, t.layer, t.x, t.y)) { U.toast('Someone stands at the gate of ' + t.name + '.'); return; } pay(); S.moveArmyIndex(stt, a, t.layer, t.x, t.y); a.mp = 0; V.centerOn(t.layer, t.x, t.y); U.refresh(); break; }
      case 'seal': { const t = Object.values(stt.objects).find(o => o.type === 'town' && o.owner === a.owner && o.layer === a.layer && Math.abs(o.x - a.x) <= 1 && Math.abs(o.y - a.y) <= 1); if (!t) { U.toast('Stand in or next to one of your towns.'); return; } pay(); t.sealed = 2; U.toast(t.name + ' is sealed for 2 days.'); break; }
      case 'harvest': { const mn = Object.values(stt.objects).find(o => o.type === 'mine' && o.owner === a.owner && o.layer === a.layer && Math.abs(o.x - a.x) <= 2 && Math.abs(o.y - a.y) <= 2); if (!mn) { U.toast('Stand next to a mine you hold.'); return; } pay(); mn.harvest = stt.day; U.toast('The ' + D.MINES[mn.kind].name + ' will make double tomorrow.'); break; }
      case 'nagacalm': { const ng = Object.values(stt.objects).filter(o => o.type === 'mine' && o.kind === 'ngakara' && o.owner === a.owner && o.naga && o.naga.alive); if (!ng.length) { U.toast('You hold no Naga ground.'); return; } pay(); ng.forEach(o => o.naga.calm = 1); U.toast('The Naga are calm. They will give double this week.'); break; }
      case 'reach': { const sq = Object.values(stt.armies).filter(x => !x.dead && x.owner === a.owner && !x.heroId); if (!sq.length) { U.toast('You have no squadron out on its own.'); return; }
        const mm = U.modal([el('h3', { text: 'Stamijan’s Reach' }), ...sq.map(x => btn((S.captainsIn(x.slots)[0] || {}).name + '’s squadron', () => { const p = RU.freeNear(stt, a.layer, a.x, a.y + 1); if (!p) { U.toast('No room beside you.'); return; } pay(); S.moveArmyIndex(stt, x, a.layer, p[0], p[1]); x.mp = 0; mm.close(); U.refresh(); }))]); break; }
      case 'link': { const others = Object.values(stt.heroes).filter(x => x.owner === a.owner && !x.dead && x.id !== h.id); const commons = Object.values(h.relics).filter(r => r && D.RELICS[r].rare === 'common');
        if (!others.length || !commons.length) { U.toast('You need a common Relic worn, and another hero.'); return; }
        const mm = U.modal([el('h3', { text: 'Stygian Link' }), el('p', { cls: 'small muted', text: 'Only common Relics can be split through the Duat.' }), ...commons.map(r => el('div', { cls: 'row' }, [D.RELICS[r].name + ' → ', ...others.map(o2 => btn(o2.name, () => { pay(); o2.linked = (o2.linked || []).concat([r]); mm.close(); U.toast(o2.name + ' now shares ' + D.RELICS[r].name + '.'); }))]))]); break; }
      case 'duatgate': { const known = (P.knownUrverk || []).map(id => stt.objects[id]).filter(Boolean);
        if (!known.length) { U.toast('You have not crossed through any Urverk yet.'); return; }
        const mm = U.modal([el('h3', { text: 'Duat Gate' }), ...known.map(o => btn(D.LAYERS[o.layer].name + ' (' + o.x + ',' + o.y + ')', () => { const p = RU.freeNear(stt, o.layer, o.x, o.y + 1); if (!p) return; pay(); S.moveArmyIndex(stt, a, o.layer, p[0], p[1]); a.mp = 0; S.reveal(stt, a.owner, o.layer, p[0], p[1], RU.sight(stt, a)); mm.close(); V.centerOn(o.layer, p[0], p[1]); U.refresh(); }))]); break; }
    }
  }
  SU.on('mapclick', t => { if (U.pickTile) { const f = U.pickTile; U.pickTile = null; f(t); } });

  /* ======================= the kingdom ======================= */
  /* the key: what the words, marks and ground mean */
  DL.mapKey = function () {
    const sec = (title, kids) => el('div', { cls: 'key-sec' }, [el('h3', { text: title }), ...kids]);
    const sizes = el('table', { cls: 'setup key-tbl' }, [el('tr', {}, [el('th', { cls: 'small muted', text: 'Word' }), el('th', { cls: 'small muted', text: 'How many' })]), ...S.COUNT_WORDS.map(([a, b, w]) => el('tr', {}, [el('td', { cls: 'gold', text: w }), el('td', { text: b == null ? a + ' or more' : a + '–' + b })]))]);
    const marks = [['G', 'Show the way: green ground is reachable today, red stripes are blocked (water, mountains, thick woods, buildings), orange is beside a wild guard (you would stop there and fight)'], ['□ green', 'Pointing: you can reach it today'], ['□ gold', 'Pointing: you can reach it, but not today'], ['✕ red', 'Pointing: you cannot go there (the bar at the bottom says why)'], ['⚔ orange', 'Pointing: the way passes a wild guard, and you will fight it'], ['→ green', 'The path: reached today'], ['→ red', 'The path: later days'], ['⚔', 'The path ends in a fight'], ['✦', 'The path ends at something to visit'], ['⇄', 'The path ends at one of your own armies: meet and trade'], ['◌ blue ring', 'The Sunear’Zikhron: the storm (its still eye in the middle)']];
    const ground = el('table', { cls: 'setup key-tbl' }, [el('tr', {}, ['Ground', 'Moving', 'Element'].map(x => el('th', { cls: 'small muted', text: x }))),
      ...Object.values(D.TERRAIN).filter(t => !t.void).map(t => el('tr', {}, [el('td', { text: t.name }), el('td', { text: t.pass === false ? 'boats only' : t.cost === 100 ? 'normal' : Math.round(t.cost) + '% (slower)' }), el('td', { text: t.el ? D.ELEMENTS[t.el].name : '' })])),
      el('tr', {}, [el('td', { text: 'Road' }), el('td', { text: D.ROAD_COST + '% (faster)' }), el('td', {})])]);
    const res = el('div', { cls: 'col' }, D.RES.map(r => el('div', { cls: 'row', style: { flexWrap: 'nowrap' } }, [U.resIcon(r, 22), el('b', { text: D.RES_INFO[r].name }), el('span', { cls: 'small muted', text: (D.RES_INFO[r].desc || '') + ' ' + Object.values(D.MINES).filter(m => m.res === r).map(m => '(' + m.name + ')').join(' ') })])));
    const m = U.modal([el('h2', { text: 'Key' }), el('div', { cls: 'key-grid' }, [
      sec('Army sizes', [el('p', { cls: 'small muted', text: 'Other armies are shown by words, not numbers, unless your hero has Cunning 6.' }), sizes]),
      sec('On the map', [el('div', { cls: 'col' }, marks.map(([k, d]) => el('div', { cls: 'row small' }, [el('b', { cls: 'gold', style: { minWidth: '80px' }, text: k }), d]))),
        el('p', { cls: 'small muted', text: 'Click to see a path, click again to go. Right-click anything to learn about it. Shift-click one of your armies to pick it while another is picked. Double-click a creature to see it close up.' })]),
      sec('Ground', [ground]), sec('Resources', [res])]),
      el('div', { cls: 'acts' }, [btn('Close', () => m.close(), 'primary')])], { wide: true });
  };

  DL.kingdom = function () {
    const P = me(), stt = st();
    const towns = S.townsOf(stt, U.viewer);
    const inc = {}; D.RES.forEach(r => inc[r] = 0);
    towns.forEach(t => Object.entries(RU.townIncome(stt, t)).forEach(([k, v]) => inc[k] += v));
    const mines = Object.values(stt.objects).filter(o => o.type === 'mine' && o.owner === U.viewer);
    mines.forEach(o => { const Mi = D.MINES[o.kind]; inc[Mi.res] += Mi.amt; });
    const heroes = Object.values(stt.heroes).filter(h => h.owner === U.viewer && !h.dead);
    const m = U.modal([el('h2', { text: P.name + '’s kingdom' }),
      el('table', { cls: 'grid' }, [el('tr', {}, [el('th', { text: '' }), ...D.RES.map(r => el('th', {}, U.resIcon(r, 18)))]), el('tr', {}, [el('td', { text: 'Stores' }), ...D.RES.map(r => el('td', { text: SU.fmt(P.res[r]) }))]), el('tr', {}, [el('td', { text: 'A day' }), ...D.RES.map(r => el('td', { text: (r === 'food' ? '+' + Math.round(inc[r]) + ' / −' + Math.round(P.lastEat || 0) : '+' + SU.fmt(inc[r])) }))])]),
      el('h3', { text: 'Towns', style: { marginTop: '10px' } }), el('table', { cls: 'grid' }, towns.map(t => el('tr', { style: { cursor: 'pointer' }, onclick: () => { m.close(); SU.townView.open(t); } }, [el('td', { text: t.name }), el('td', { text: D.LAYERS[t.layer].name }), el('td', { text: Math.floor(t.pop) + ' / ' + RU.housing(t) + ' people' }), el('td', { text: '+' + RU.townIncome(stt, t).gold + ' gold' }), el('td', { text: t.builtToday ? 'built today' : 'can build' })]))),
      el('h3', { text: 'Heroes', style: { marginTop: '10px' } }), el('table', { cls: 'grid' }, heroes.map(h => { const loc = S.heroLocation(stt, h); return el('tr', { style: { cursor: 'pointer' }, onclick: () => { m.close(); DL.hero(h); } }, [el('td', { text: h.name }), el('td', { text: 'Level ' + h.level }), el('td', { text: loc.army ? D.LAYERS[loc.army.layer].name : loc.town ? 'in ' + loc.town.name : '' }), el('td', { text: S.armySize(h.slots) + ' troops' })]); })),
      el('p', { cls: 'small muted', text: mines.length + ' mines held, ' + Object.values(stt.objects).filter(o => o.type === 'village' && o.owner === U.viewer).length + ' villages (' + D.VILLAGE_SETTLERS + ' settlers a week each). ' + (P.unlocked.includes('nekh') ? 'The Nekh’Vorran answers your call.' : 'Win a battle in the eye of the storm to unlock the Nekh’Vorran.') }),
      el('div', { cls: 'acts' }, [S.townsOf(stt, U.viewer).some(t => RU.has(t, 'market')) ? btn('Market', () => { m.close(); DL.market(); }) : null, btn('Close', () => m.close(), 'primary')])], { wide: true });
  };

  /* ======================= the market ======================= */
  DL.market = function (town) {
    const P = me(); let from = 'gold', to = 'wood', amt = 0;
    const m = U.modal(el('div'), { wide: true, onClose: () => U.refresh() });
    function render() {
      const b = m.box; b.innerHTML = '';
      b.appendChild(el('h2', { text: (town ? D.bname('market', town.faction) : 'The Market') + (S.isMarketDay(st()) ? ' — market day!' : '') }));
      const pickRow = (label, cur, set, give) => el('div', { cls: 'row' }, [el('span', { style: { width: '50px' }, text: label }), ...D.RES.map(r => el('button', { cls: 'btn icon' + (cur === r ? ' primary' : ''), onclick: () => { set(r); render(); },
        'data-tip': '<b>' + D.RES_INFO[r].name + '</b> — you have ' + SU.fmt(P.res[r]) + (D.RES_INFO[r].desc ? '<br>' + D.RES_INFO[r].desc : '') + (r !== (give ? to : from) ? '<br>' + (give ? '1 ' + D.RES_INFO[r].name + ' → ' + (+RU.tradeRate(st(), P, r, to).toFixed(2)) + ' ' + D.RES_INFO[to].name : '1 ' + D.RES_INFO[from].name + ' → ' + (+RU.tradeRate(st(), P, from, r).toFixed(2)) + ' ' + D.RES_INFO[r].name) : '') }, U.resIcon(r, 22)))]);
      b.appendChild(pickRow('Give', from, r => from = r, true)); b.appendChild(pickRow('Get', to, r => to = r, false));
      const rate = RU.tradeRate(st(), P, from, to);
      const inp = el('input', { cls: 'inp', type: 'range', min: 0, max: P.res[from] || 0, value: Math.min(amt, P.res[from] || 0), style: { width: '300px' } });
      const out = el('span', { cls: 'gold' }); const upd = () => { amt = +inp.value; out.textContent = amt + ' ' + D.RES_INFO[from].name + ' → ' + Math.floor(amt * rate) + ' ' + D.RES_INFO[to].name; }; inp.oninput = upd; upd();
      b.appendChild(el('div', { cls: 'row', style: { marginTop: '8px' } }, [inp, out, btn('Trade', () => { if (from === to) return; const r = RU.trade(st(), P, from, to, amt); if (!r.ok) U.toast(r.why || 'Cannot trade.'); else { amt = 0; render(); U.refresh(); } }, 'primary')]));
      b.appendChild(el('p', { cls: 'small muted', text: 'More markets give better prices. On market day, prices are better still.' }));
      if (town && S.isMarketDay(st())) {
        b.appendChild(el('h3', { text: 'Travelling sellers' }));
        const offers = RU.marketOffers(st(), town);
        b.appendChild(el('div', { cls: 'col' }, offers.map((o, i) => { if (o.sold) return null;
          const label = o.kind === 'relic' ? D.RELICS[o.relic].name : o.kind === 'song' ? 'A scroll of ' + D.SONGS[o.song].name : o.kind === 'res' ? o.amt + ' ' + D.RES_INFO[o.res].name : o.kind === 'captain' ? 'A travelling captain: ' + o.cap.name + ' (' + D.CAPTAIN_RANKS[o.cap.rank].name + ', ' + D.CAPTAIN_ABIL[o.cap.abil].name + ')' : o.n + ' ' + D.CREATURES[o.cr].plural + ' for hire';
          const tip = o.kind === 'relic' ? relicTip(o.relic) : o.kind === 'song' ? '<b>' + D.SONGS[o.song].name + '</b> (tier ' + D.SONGS[o.song].tier + ', ' + D.SONGS[o.song].breath + ' Breath)<br>' + D.SONGS[o.song].desc : o.kind === 'res' ? '<b>' + D.RES_INFO[o.res].name + '</b>' + (D.RES_INFO[o.res].desc ? '<br>' + D.RES_INFO[o.res].desc : '') : o.kind === 'captain' ? captainTip(o.cap, null) : creatureTip(o.cr) + '<br><i>Right-click for more.</i>';
          const pic = o.kind === 'relic' ? U.relicIcon(o.relic, 34) : o.kind === 'creature' ? U.creatureIcon(o.cr, 40, { color: P.color }) : o.kind === 'captain' ? U.captainIcon(o.cap, 36, P.color) : o.kind === 'res' ? U.resIcon(o.res, 26) : null;
          return el('div', { cls: 'row frame', 'data-tip': tip, 'data-cr': o.kind === 'creature' ? o.cr : null, oncontextmenu: o.kind === 'captain' ? e => { e.preventDefault(); e.stopPropagation(); DL.captainCard(o.cap); } : null }, [pic, el('span', { style: { flex: 1 } }, label), U.costView(o.cost, P), btn('Buy', () => {
            if (!RU.afford(P, o.cost)) { U.toast('Not enough.'); return; }
            const h = town.defender && st().heroes[town.defender] || (town.heroes[0] && st().heroes[town.heroes[0]]) || (S.armyAt(st(), town.layer, town.x, town.y) && S.heroOf(st(), S.armyAt(st(), town.layer, town.x, town.y)));
            if ((o.kind === 'relic' || o.kind === 'song') && !h) { U.toast('A hero must be in town to take it.'); return; }
            if (o.kind === 'song' && !RU.canSing(st(), h, o.song)) { U.toast(h.name + ' cannot sing a tier ' + D.SONGS[o.song].tier + ' song yet.'); return; }
            if (o.kind === 'creature' && !RU.addToSlots(st(), town.garrison, o.cr, o.n)) { U.toast('No room in the garrison.'); return; }
            if (o.kind === 'captain') { const i = town.garrison.findIndex(x => !x); if (i < 0) { U.toast('No room in the garrison.'); return; } town.garrison[i] = M.capSlot(o.cap, []); }
            RU.pay(P, o.cost);
            if (o.kind === 'relic') RU.giveRelic(st(), h, o.relic); if (o.kind === 'song') RU.learnSong(st(), h, o.song); if (o.kind === 'res') P.res[o.res] += o.amt;
            o.sold = true; render(); U.refresh();
          }, 'primary')]); })));
      }
      b.appendChild(el('div', { cls: 'acts' }, [btn('Close', () => m.close())]));
    }
    render();
  };

  /* ======================= after a battle ======================= */
  DL.battleReport = function (rep, B, then) {
    const stt = st(); const mineSide = B.sides.findIndex(s => s.owner === U.viewer); const won = mineSide >= 0 ? rep.winner === mineSide : null;
    const lostList = i => rep.lost[i].length ? rep.lost[i].map(l => l.n + ' ' + D.CREATURES[l.cr].plural).join(', ') : 'none';
    const lines = [
      el('p', { text: B.sides[rep.winner].label + ' won.' + (rep.surrendered ? ' (They surrendered.)' : '') }),
      el('p', { cls: 'small', text: B.sides[0].label + ' lost: ' + lostList(0) }), el('p', { cls: 'small', text: B.sides[1].label + ' lost: ' + lostList(1) }),
      rep.xp ? el('p', { cls: 'gold', text: '+' + rep.xp + ' XP' }) : null,
      rep.heroDied ? el('p', { cls: 'bad', text: rep.heroDied + ' has fallen. Only their memory core is left.' + (rep.coreDropped ? ' It lies on the field for anyone to take.' : '') }) : null,
      rep.cores.length || rep.capCores.length ? el('p', { cls: 'duat', text: (rep.cores.length + rep.capCores.length) + ' memory core' + (rep.cores.length + rep.capCores.length > 1 ? 's' : '') + ' taken.' }) : null,
      rep.stolen[0] || rep.stolen[1] ? el('p', { cls: 'small', text: 'Gold stolen by Malsti Punks: ' + (rep.stolen[mineSide >= 0 ? mineSide : 0]) + ' for you' + (rep.stolen[mineSide >= 0 ? 1 - mineSide : 1] ? ', ' + rep.stolen[mineSide >= 0 ? 1 - mineSide : 1] + ' against you' : '') + '.' }) : null,
      rep.unlocked ? el('p', { cls: 'gold', text: 'You won in the eye of the Sunear’Zikhron! The Nekh’Vorran can now be called to your towns (build the Nekh Hollow).' }) : null,
      rep.captured ? el('p', { cls: 'gold', text: 'You have taken ' + rep.captured + '.' }) : null,
      rep.cursed ? el('p', { cls: 'bad', text: 'A RubberMcFly was killed. Bad luck will follow this army for a while.' }) : null,
      rep.wentHome && rep.wentHome.length ? el('p', { cls: 'warn', text: 'Without their captain, ' + rep.wentHome.map(x => x.n + ' ' + D.CREATURES[x.cr].plural + ' went home to ' + x.town).join(', ') + '.' }) : null,
      rep.raised ? el('p', { cls: 'gold', text: rep.raised + ' of the enemy, raised by Rekindle, now march with you.' }) : null,
      rep.sprengjuBack ? el('p', { cls: 'gold', text: rep.sprengjuBack + ' of the spent Sprengju came back.' }) : null,
      rep.oathBroken ? el('p', { cls: 'bad', text: 'The Oath is broken: the forest has taken ' + rep.oathBroken + ' Changed creatures.' }) : null,
      rep.respect ? el('p', { cls: 'gold', text: rep.respect + ' saw you clear the land around their Urverk. Your armies may pass it free.' }) : null,
      rep.eyeWins && (st().setup.win || {}).kind === 'prophecy' ? el('p', { cls: 'gold', text: 'Battles won in the eye: ' + rep.eyeWins + ' of ' + ((st().setup.win || {}).n || 3) + '.' }) : null,
      rep.scattered ? el('p', { cls: 'bad', text: 'With its captain gone, the squadron cannot stay out in the field.' }) : null,
    ];
    U.modal([el('h2', { text: won === null ? 'The battle is over' : won ? 'Victory' : 'Defeat' }), ...lines, el('div', { cls: 'acts' }, [btn('Continue', function () { this.closest('.overlay').remove(); if (then) then(); }, 'primary')])], { dismiss: false });
  };
})(typeof window !== 'undefined' ? window : globalThis);
