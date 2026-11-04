/* ============================================================
   SKAAR UVERKHRON — js/talk.js
   Talking. Only a Dearcàn can talk (a hero, a captain, or one
   of the peoples), and only to someone who can understand: a
   band led by a Dearcàn, travellers, the people of a town or a
   family's keep, a rival's envoy. Beasts cannot be talked to.

   Also: keeps, caravans and territories seen close up, offers
   from rivals at the start of your turn, and your land in the
   kingdom window.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, RU = SU.rules, M = SU.make, V = SU.mapView, U = SU.ui, RL = SU.realm;
  const el = U.el, btn = U.btn;
  const TK = SU.talk = {};
  const st = () => U.st, me = () => U.st.players[U.viewer];
  const pct = p => Math.round(p * 100) + '%';
  const names = slots => { const ss = S.stacksIn(slots).filter(s => s.n > 0); return ss.length ? ss.map(s => D.CREATURES[s.cr].plural).join(' and ') : 'nobody'; };
  const leader = (stt, a) => { const h = S.heroOf(stt, a); if (h) return h.name; const c = S.captainsIn(S.slotsOf(stt, a))[0]; return c ? c.name + (c.rank && D.CAPTAIN_RANKS[c.rank] ? ', ' + D.CAPTAIN_RANKS[c.rank].name : '') : null; };
  const done = () => { U.refresh(); V.invalidate(); };

  /* ======================= meeting a band, travellers or a rival army ======================= */
  TK.encounter = function (a, w, ambush) {
    const stt = st();
    if (w.travellers) return travellers(a, w);
    if (w.owner >= 0) return rivalArmy(a, w);
    const lead = leader(stt, w), r = RL.regionAt(stt, w.layer, w.x, w.y);
    let m;
    const draw = (msg) => {
      if (m) m.close();
      const T = RL.bandTerms(stt, a, w), talked = w.talked && w.talked[a.owner] === stt.day;
      const guarded = w.guard && stt.objects[w.guard];
      const opt = (title, desc, cost, p, fn) => el('div', { cls: 'talk-opt' }, [el('div', { cls: 'what' }, [el('b', { text: title }), el('div', { cls: 'small muted', text: desc })]),
        el('span', { cls: 'odds', text: cost + ' gold · ' + pct(p) + ' they agree' }), btn('Offer', fn, '', null)]);
      m = U.modal([el('h2', { text: ambush ? 'They bar your way' : 'A band of ' + names(w.slots) }),
        el('div', { cls: 'row' }, [U.armyInfoHtml ? el('div', { cls: 'small', html: U.armyInfoHtml(w) }) : null]),
        el('p', { cls: 'small', text: (lead ? 'They follow ' + lead + '. ' : '') + (guarded ? 'They guard ' + (guarded.type === 'mine' ? 'the ' + D.MINES[guarded.kind].name : guarded.type === 'urverk' ? 'an Urverk' : guarded.type === 'village' ? 'the village of ' + guarded.name : 'something here') + '. ' : '') + (r ? 'In ' + r.name + ', they stand against anyone who would hold it.' : '') }),
        msg ? el('p', { cls: msg.ok ? 'good' : 'warn', text: msg.text }) : null,
        talked ? el('p', { cls: 'small muted', text: 'They have heard you today. Fight, or come back tomorrow.' }) :
          el('div', { cls: 'talk-opts' }, [
            opt('Join you as mercenaries', 'They keep their own captain and march under your colours: a band of their own that you can move, for ' + T.join.pay + ' gold a day, every day. Unpaid, they leave.', T.join.fee, T.join.p, () => attempt('join')),
            opt('Leave this land', 'They take your gold and go far away, to land nobody holds.', T.leave.fee, T.leave.p, () => attempt('leave')),
            opt('Let you pass', 'For a week they let your armies by without a fight.', T.pass.fee, T.pass.p, () => attempt('pass')),
          ]),
        el('p', { cls: 'small muted', text: 'Diplomacy makes them more willing and cheaper; a stronger army than theirs helps too.' }),
        el('div', { cls: 'acts' }, [ambush ? null : btn('Back away', () => m.close()), btn(ambush ? 'Fight' : 'Attack', () => { m.close(); SU.game.battle(ambush ? { attacker: w, defender: a } : { attacker: a, defender: w }); }, 'danger')])], { dismiss: !ambush });
    };
    const attempt = kind => {
      const res = RL.talkBand(stt, a, w, kind);
      if (res.ok) { m.close(); U.alert('Agreed', res.msg, done); return; }
      if (res.refused && ambush) { m.close(); U.alert('Refused', res.why + ' They attack!', () => SU.game.battle({ attacker: w, defender: a })); return; }
      draw({ ok: false, text: res.why });
    };
    draw();
  };
  function travellers(a, w) {
    const stt = st(), r = RL.regionAt(stt, w.layer, w.x, w.y), home = RU.nearestHome(stt, a.owner, a.layer, a.x, a.y), dest = RL.region(stt, w.travellers.dest);
    const mine = r && r.owner === a.owner;
    const m = U.modal([el('h2', { text: 'Travellers on the road' }),
      el('p', { text: S.armySize(w.slots) + ' ' + names(w.slots) + ', with their carts and children, looking for a place to settle' + (dest ? ' (they speak of ' + dest.name + ')' : '') + '. Left alone, they will found a keep or even a town where nobody rules.' }),
      el('div', { cls: 'talk-opts' }, [
        el('div', { cls: 'talk-opt' }, [el('div', { cls: 'what' }, [el('b', { text: 'Settle in ' + (home ? home.name : 'one of your towns') }), el('div', { cls: 'small muted', text: 'They go to live in your nearest town: more people.' })]), btn('Ask them', () => go('town'), '', null)]),
        el('div', { cls: 'talk-opt' }, [el('div', { cls: 'what' }, [el('b', { text: 'Raise a keep for you here' }), el('div', { cls: 'small muted', text: mine ? 'They build a keep in ' + r.name + ' and hold it for you with their own spears.' : 'Only in land you hold' + (r ? ' (' + r.name + ' is not yours).' : '.') })]),
          U.costView(RL.K.KEEP_COST, me()), btn('Ask them', () => go('keep'), mine ? 'primary' : '', null)]),
      ]),
      el('div', { cls: 'acts' }, [btn('Let them go', () => m.close()), btn('Attack them', () => { m.close(); SU.game.battle({ attacker: a, defender: w }); }, 'danger')])]);
    function go(kind) { const res = RL.talkTravellers(stt, a, w, kind); if (!res.ok) { U.toast(res.why); return; } m.close(); U.alert('Agreed', res.msg, done); }
  }
  function rivalArmy(a, w) {
    const stt = st(), Q = stt.players[w.owner];
    const m = U.modal([el('h2', { text: (leader(stt, w) || 'An army') + ' of ' + Q.name }), el('div', { cls: 'small', html: U.armyInfoHtml(w) }),
      el('p', { cls: 'small muted', text: 'You can send an envoy to ' + Q.name + ' instead of fighting.' }),
      el('div', { cls: 'acts' }, [btn('Back away', () => m.close()), btn('Send an envoy…', () => { m.close(); TK.envoy(a.owner, w.owner); }), btn('Attack', () => { m.close(); SU.game.battle({ attacker: a, defender: w }); }, 'danger')])]);
  }

  /* ======================= at the gate of a town or keep that is not yours ======================= */
  TK.parley = function (a, o) {
    const stt = st();
    if (o.owner >= 0) {
      const Q = stt.players[o.owner];
      const m = U.modal([el('h2', { text: o.name + ' — ' + Q.name }), el('div', { cls: 'small', html: o.type === 'keep' ? TK.keepInfoHtml(o) : U.townInfoHtml(o) }),
        el('div', { cls: 'acts' }, [btn('Leave', () => m.close()), btn('Send an envoy…', () => { m.close(); TK.envoy(a.owner, o.owner); }), btn(o.type === 'keep' ? 'Storm the keep' : 'Lay siege', () => { m.close(); assault(a, o); }, 'danger')])]);
      return;
    }
    let m;
    const draw = msg => {
      if (m) m.close();
      const T = RL.townTerms(stt, a, o), P = me();
      const who = o.type === 'keep' ? (o.family ? o.family.replace(/^the /, 'The ') : 'The family') + ' of ' + o.name : 'The people of ' + o.name;
      m = U.modal([el('h2', { text: o.name + (o.type === 'keep' ? ', a keep' : ', a free town') }),
        el('p', { text: who + ' answer to no one. ' + (T.treaty ? 'You have a treaty with them.' : '') }),
        el('div', { cls: 'small' }, ['How they feel about you: ', el('b', { text: T.rel + ' / 100' })]), el('div', { cls: 'relbar' }, el('i', { style: { width: T.rel + '%' } })),
        el('div', { cls: 'small', html: o.type === 'keep' ? TK.keepInfoHtml(o) : U.townInfoHtml(o) }),
        msg ? el('p', { cls: msg.ok ? 'good' : 'warn', text: msg.text }) : null,
        el('div', { cls: 'talk-opts' }, [
          el('div', { cls: 'talk-opt' }, [el('div', { cls: 'what' }, [el('b', { text: 'Give a gift' }), el('div', { cls: 'small muted', text: 'Gold wins friends. Diplomacy makes each gift count for more.' })]),
            ...[500, 1000, 2500].map(g => btn(g + ' gold', () => act('gift', g), '', null))]),
          el('div', { cls: 'talk-opt' }, [el('div', { cls: 'what' }, [el('b', { text: T.treaty ? 'End the treaty' : 'A treaty of trade' }), el('div', { cls: 'small muted', text: T.treaty ? 'They will think less of you.' : 'They stay their own, but their land will not stand against yours, your caravans pass safely, and trade brings you gold each day. Needs friendship 30.' })]),
            btn(T.treaty ? 'End it' : 'Propose', () => act(T.treaty ? 'end' : 'treaty'), T.canTreaty && !T.treaty ? 'primary' : '', null)]),
          el('div', { cls: 'talk-opt' }, [el('div', { cls: 'what' }, [el('b', { text: 'Join your kingdom' }), el('div', { cls: 'small muted', text: 'They become yours: their people, walls, garrison and taxes, and you their ruler. Needs friendship 75, or 45 and an army they dare not refuse.' })]),
            el('span', { cls: 'odds', text: T.joinCost + ' gold' }), btn('Ask', () => act('join'), T.canJoin ? 'primary' : '', null)]),
        ]),
        el('div', { cls: 'acts' }, [btn('Leave', () => m.close()), btn(o.type === 'keep' ? 'Storm the keep' : 'Lay siege', () => { m.close(); assault(a, o); }, 'danger')])]);
    };
    const act = (kind, amt) => { const res = RL.talkTown(stt, a, o, kind, amt); if (res.joined) { m.close(); U.alert('They are yours', res.msg, () => { done(); if (o.type === 'town') SU.townView.open(o); }); return; } draw({ ok: res.ok, text: res.ok ? res.msg : res.why }); done(); };
    draw();
  };
  function assault(a, o) { const r = RU.assault(st(), a, o); U.handle(a, r); }

  /* ======================= a rival's court: envoys ======================= */
  TK.envoy = function (from, to) {
    const stt = st(), Q = stt.players[to], P = stt.players[from];
    let give = 'gold', gAmt = 1000, get = 'wood', tAmt = 10;
    const send = (kind, terms) => { const r = RL.offer(stt, from, to, kind, terms); if (!r.ok) { U.toast(r.why); return; } m.close(); U.alert(r.answered ? (r.yes ? 'Agreed' : 'Refused') : 'The envoy rides', r.msg, done); };
    const sel = (v, f) => el('select', { cls: 'inp', onchange: e => f(e.target.value) }, D.RES.map(r => el('option', { value: r, selected: r === v ? 'selected' : null }, D.RES_INFO[r].short || D.RES_INFO[r].name)));
    const num = (v, f) => el('input', { cls: 'inp', type: 'number', min: 1, value: v, style: { width: '80px' }, oninput: e => f(Math.max(1, +e.target.value || 1)) });
    const pacts = ['truce', 'roads'].filter(k => RL.pact(stt, from, to, k)).map(k => k === 'truce' ? 'a truce' : 'open roads');
    const m = U.modal([el('h2', { text: 'An envoy to ' + Q.name }),
      el('p', { cls: 'small muted', text: 'You are rivals: in the end only one of you can hold the Mbaru Tatu. But for now, a deal may serve you both.' + (pacts.length ? ' You already have ' + pacts.join(' and ') + '.' : '') }),
      el('div', { cls: 'talk-opts' }, [
        el('div', { cls: 'talk-opt' }, [el('div', { cls: 'what' }, [el('b', { text: 'A truce' }), el('div', { cls: 'small muted', text: 'No battles between you for ' + RL.K.TRUCE_DAYS + ' days.' })]), btn('Propose', () => send('truce'))]),
        el('div', { cls: 'talk-opt' }, [el('div', { cls: 'what' }, [el('b', { text: 'Open roads' }), el('div', { cls: 'small muted', text: 'For ' + RL.K.ROADS_DAYS + ' days each of you lets the other’s caravans through your land safely.' })]), btn('Propose', () => send('roads'))]),
        el('div', { cls: 'talk-opt' }, [el('div', { cls: 'what' }, [el('b', { text: 'Trade' }), el('div', { cls: 'row small' }, ['Give ', num(gAmt, v => gAmt = v), sel(give, v => give = v), ' for ', num(tAmt, v => tAmt = v), sel(get, v => get = v)])]), btn('Propose', () => send('trade', { give: { [give]: gAmt }, get: { [get]: tAmt } }))]),
        el('div', { cls: 'talk-opt' }, [el('div', { cls: 'what' }, [el('b', { text: 'Demand that they yield' }), el('div', { cls: 'small muted', text: 'Everything they hold becomes yours. Only someone beaten and desperate would agree.' })]), btn('Demand', () => send('yield'), 'danger')]),
      ]),
      el('div', { cls: 'acts' }, [btn('Close', () => m.close(), 'primary')])]);
  };
  /* offers that came while you were away, shown one by one at the start of your turn */
  TK.offers = function (pi, then) {
    const stt = st(), list = RL.offersFor(stt, pi);
    const next = () => {
      const o = list.shift(); if (!o) { if (then) then(); return; }
      const A = stt.players[o.from];
      const what = o.kind === 'truce' ? 'a truce: no battles between you for ' + RL.K.TRUCE_DAYS + ' days.' : o.kind === 'roads' ? 'open roads: each lets the other’s caravans through safely for ' + RL.K.ROADS_DAYS + ' days.'
        : o.kind === 'trade' ? 'a trade: they give ' + Object.entries(o.give || {}).map(([k, v]) => v + ' ' + D.RES_INFO[k].name).join(', ') + ' for your ' + Object.entries(o.get || {}).map(([k, v]) => v + ' ' + D.RES_INFO[k].name).join(', ') + '.'
        : 'that you yield everything you hold to them.';
      const m = U.modal([el('h2', { text: 'An envoy from ' + A.name }), el('p', { text: A.name + ' proposes ' + what }),
        el('div', { cls: 'acts' }, [btn('Refuse', () => { RL.decline(stt, o); m.close(); next(); }), btn('Accept', () => { const r = RL.accept(stt, o); m.close(); if (!r.ok && r.why) U.toast(r.why); U.refresh(); next(); }, 'primary')])], { dismiss: false });
    };
    next();
  };

  /* ======================= keeps ======================= */
  TK.keepInfoHtml = function (o) {
    const stt = st(), mine = o.owner === U.viewer, r = RL.regionAt(stt, o.layer, o.x, o.y + 1) || RL.regionAt(stt, o.layer, o.x, o.y);
    const list = S.stacksIn(o.garrison).filter(s => s.n > 0).map(s => (mine ? s.n : S.countWord(s.n)) + ' ' + D.CREATURES[s.cr].plural).join(', ');
    return '<b>' + U.esc(o.name) + '</b> — ' + (o.owner >= 0 ? U.esc(stt.players[o.owner].name) : U.esc(o.family || 'a family')) + '<div class="small">A keep in ' + (r ? U.esc(r.name) : 'the wilds') + '. Whoever holds it has a strong claim on the land around it.</div>'
      + '<div class="small muted" style="margin-top:4px">Garrison</div><div class="small">' + (list || 'empty') + '</div>';
  };
  /* your own keep: move troops between the army at its gate and its garrison */
  TK.keep = function (a, o) {
    const stt = st(), r = RL.regionAt(stt, o.layer, o.x, o.y + 1) || RL.regionAt(stt, o.layer, o.x, o.y), h = a && S.heroOf(stt, a);
    const groups = [{ label: o.name + ' (garrison)', slots: o.garrison }];
    if (a) groups.unshift({ label: h ? h.name : (S.captainsIn(a.slots)[0] || { name: 'Your squadron' }).name, slots: S.slotsOf(stt, a), hero: h, onlyCaptain: !h, keepOne: !!h });
    const m = U.modal([el('h2', { text: o.name }), el('p', { cls: 'small muted', text: 'Your keep in ' + (r ? r.name : 'the wilds') + '. A garrison here keeps your hold on the land; an empty keep can be taken by anyone who walks in.' }),
      SU.dialogs.armyEditor(groups, () => U.refresh()),
      r ? el('p', { cls: 'small', text: RL.describe(stt, r, U.viewer).state }) : null,
      el('div', { cls: 'acts' }, [r ? btn('The territory…', () => { m.close(); TK.region(r); }) : null, btn('Done', () => m.close(), 'primary')])], { wide: true, onClose: () => { if (a && !a.heroId && S.isEmptySlots(a.slots)) RU.removeArmy(stt, a); RL.update(stt, true); done(); } });
  };

  /* ======================= caravans ======================= */
  TK.caravan = function (a) {
    const stt = st(), r = RL.region(stt, a.caravan.rid); if (!r) return;
    const cv = r.cv || {}, to = cv.to && stt.objects[cv.to], y = RL.regionYield(stt, r, false), risk = RL.routeRisk(stt, r, a.owner);
    const m = U.modal([el('h2', { text: 'The caravan from ' + r.name }),
      el('p', { text: 'Every day it brings home what ' + r.name + ' yields, to ' + (to ? (to.type === 'urverk' ? 'the Urverk, and through the Duat to your towns' : to.name) : 'your towns') + '.' }),
      el('div', { cls: 'row' }, [el('span', { cls: 'small muted', text: 'A day:' }), yieldView((y))]),
      el('p', { cls: 'small', text: S.armySize(a.slots) + ' ' + names(a.slots) + ' pull and guard it.' }),
      el('p', { cls: risk.risk > 0.04 ? 'small warn' : 'small good', text: risk.risk > 0.04 ? 'Bandits: a ' + pct(risk.risk) + ' chance each day, on the road through ' + risk.through.map(q => q.name).join(', ') + '. Take that land, raise a watch post there, or give the caravan more guards (walk an army onto it and trade).' : 'The road home runs through your own land, or past your watch posts: it is safe.' }),
      el('div', { cls: 'acts' }, [btn('The territory…', () => { m.close(); TK.region(r); }), btn('Close', () => m.close(), 'primary')])]);
  };
  const roundY = y => { const o = {}; Object.entries(y).forEach(([k, v]) => { const n = v >= 1 ? Math.round(v) : Math.round(v * 10) / 10; if (n > 0) o[k] = n; }); return o; };
  /* a day's goods, small ones as fractions ("0.4" is a little under one every two days) */
  const yieldView = y => el('span', { cls: 'cost' }, Object.entries(roundY(y)).map(([k, v]) => el('span', { 'data-tip': D.RES_INFO[k].name + (v < 1 ? ': about one every ' + Math.round(1 / v) + ' days' : '') }, [U.resIcon(k, 16), v >= 1 ? SU.fmt(v) : String(v)])));

  /* ======================= a territory, close up ======================= */
  TK.region = function (r) {
    const stt = st(), pi = U.viewer, d = RL.describe(stt, r, pi), y = RL.regionYield(stt, r, false);
    const places = RL.placesIn(stt, r, ['town', 'keep', 'mine', 'village', 'post', 'urverk']);
    const L = stt.layers[r.li], seen = me().explored[r.li][r.y * L.w + r.x];
    const cv = r.owner === pi && r.cv ? r.cv : null, home = r.owner === pi && RL.townIn(stt, r, pi);
    const m = U.modal([el('h2', { text: r.name }),
      el('p', { cls: 'small muted', text: D.LAYERS[r.li].name + ' · ' + (r.owner >= 0 ? 'held by ' + stt.players[r.owner].name : 'held by nobody') }),
      el('p', { text: d.state }),
      el('div', { cls: 'row small' }, [el('span', { text: 'Your authority here: ' }), el('b', { cls: 'gold', text: String(d.mine) }), el('span', { text: ' · against you: ' }), el('b', { cls: 'warn', text: String(d.against) }), d.wild ? el('span', { cls: 'muted', text: ' (wild bands ' + d.wild + ')' }) : null]),
      el('p', { cls: 'small muted', text: 'Towns count 100, keeps 60, watch posts 12, and armies standing here by their strength. Holding it already counts 20. To take it, your authority must be half again as large as everything against you; to keep it, at least as large.' }),
      el('div', { cls: 'row' }, [el('span', { cls: 'small muted', text: 'It yields a day:' }), yieldView((y))]),
      r.owner === pi ? el('p', { cls: 'small', text: home ? 'A town of yours stands here: its goods come straight in.' : cv && cv.noRoute ? 'There is no road home from here: its goods cannot reach you.' : cv && cv.army && stt.armies[cv.army] ? 'A caravan carries its goods home every day.' : cv && cv.down > stt.day ? 'Its caravan was lost. A new one sets out in ' + SU.plural(cv.down - stt.day, 'day') + '.' : 'A caravan is setting out.' }) : null,
      seen ? el('p', { cls: 'small', text: places.length ? 'In it: ' + places.map(o => o.type === 'mine' ? D.MINES[o.kind].name : o.type === 'urverk' ? 'an Urverk' : o.type === 'post' ? 'a watch post' : o.type + ' ' + (o.name || '')).join(', ') + '.' : 'Nothing built.' }) : el('p', { cls: 'small muted', text: 'You have not seen it yet: what you know is from the old drawing.' }),
      el('div', { cls: 'acts' }, [btn('Show me', () => { m.close(); V.centerOn(r.li, r.x, r.y); U.refresh(); }), btn('Close', () => m.close(), 'primary')])]);
  };

  /* ======================= your land, in the kingdom window ======================= */
  TK.landSection = function () {
    const stt = st(), pi = U.viewer, regs = RL.regionsOf(stt, pi), P = me();
    const all = {}; regs.forEach(r => Object.entries(RL.regionYield(stt, r, false)).forEach(([k, v]) => all[k] = (all[k] || 0) + v));
    const mercs = Object.values(stt.armies).filter(a => !a.dead && a.owner === pi && a.merc), pay = mercs.reduce((t, a) => t + a.merc.pay, 0);
    const pacts = (stt.pacts || []).filter(p => p.a === pi || p.b === pi).map(p => (p.kind === 'truce' ? 'Truce with ' : 'Open roads with ') + stt.players[p.a === pi ? p.b : p.a].name + ' (' + SU.plural(p.until - stt.day + 1, 'day') + ' left)');
    const treaties = Object.values(stt.objects).filter(o => (o.type === 'town' || o.type === 'keep') && o.owner < 0 && o.treaty && o.treaty[pi]).map(o => o.name);
    const row = r => { const cv = r.cv && r.cv.owner === pi ? r.cv : null, home = RL.townIn(stt, r, pi);
      const how = home ? 'a town of yours' : cv && cv.noRoute ? 'no road home' : cv && cv.army && stt.armies[cv.army] ? 'caravan' + (cv.risk > 0.04 ? ' · bandits ' + pct(cv.risk) : '') : cv && cv.down > stt.day ? 'caravan lost (' + SU.plural(cv.down - stt.day, 'day') + ')' : 'caravan setting out';
      return el('tr', { cls: 'reg-row', onclick: () => TK.region(r) }, [el('td', { text: r.name }), el('td', { text: D.LAYERS[r.li].name }), el('td', {}, yieldView((RL.regionYield(stt, r, false)))), el('td', { cls: /lost|no road|bandits/.test(how) ? 'warn' : '', text: how })]); };
    return el('div', {}, [
      el('h3', { text: 'Your land (' + regs.length + (regs.length === 1 ? ' territory' : ' territories') + ')', style: { marginTop: '10px' } }),
      el('div', { cls: 'row' }, [el('span', { cls: 'small muted', text: 'All of it yields a day:' }), yieldView((all))]),
      el('table', { cls: 'grid' }, regs.map(row)),
      el('p', { cls: 'small muted', text: 'Click a territory to see it close up. ' + (mercs.length ? SU.plural(mercs.length, 'mercenary band') + ' in your pay: ' + pay + ' gold a day. ' : '') + (pacts.length ? pacts.join('. ') + '. ' : '') + (treaties.length ? 'Treaties with ' + treaties.join(', ') + '.' : '') }),
    ]);
  };
})(typeof window !== 'undefined' ? window : globalThis);
