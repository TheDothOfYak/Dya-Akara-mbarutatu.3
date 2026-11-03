/* ============================================================
   SKAAR UVERKHRON — js/records.js
   Your own records from solo games against the computer: every
   game you finish, your score and title, and your bests. There is
   no leaderboard: these are yours alone. Kept in this browser, and
   on your Flake Games account (dya_config 'su_rec:<account id>').
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, U = SU.ui, el = U.el, btn = U.btn;
  const RC = SU.records = {};
  const LKEY = 'su_records';
  const SIZE_K = { S: 0.8, M: 1, L: 1.2, XL: 1.4, G: 1.6 };
  const SIZE_NAMES = { S: 'Small', M: 'Medium', L: 'Large', XL: 'Extra large', G: 'Gigantic' };
  /* titles, from the smallest of the Duskareth to the great worm */
  const TITLES = [[0, 'Malsti Punk'], [300, 'Velnurthalith'], [600, 'Ver'], [900, 'Harkal'], [1200, 'Kalo’Eik'], [1500, 'Tyndael'], [1800, 'Xiw’Eik'], [2100, 'Lutut'], [2500, 'Nekh’Vorran']];
  RC.title = score => TITLES.filter(t => score >= t[0]).pop()[1];

  /* a solo game: one person on this device against the computer */
  RC.isSolo = st => !st.online && st.players.filter(P => P.kind === 'human').length === 1;
  RC.score = function (st, won) {
    if (!won) return 0;
    const d = D.DIFFICULTY.find(x => x.id === st.setup.difficulty) || D.DIFFICULTY[2];
    const rivals = st.players.filter(P => P.kind === 'ai').length;
    return Math.round(d.pct * 6 * (1 + 0.25 * Math.max(0, rivals - 1)) * (SIZE_K[st.setup.size] || 1) * Math.max(0.35, 2 - st.day / 100));
  };

  const local = () => { try { return JSON.parse(localStorage.getItem(LKEY) || '[]') || []; } catch (e) { return []; } };
  const saveLocal = list => { try { localStorage.setItem(LKEY, JSON.stringify(list.slice(0, 200))); } catch (e) {} };
  const cloudKey = () => { const a = SU.save.account(); return a ? 'su_rec:' + a.id : null; };
  async function cloud() {
    if (!SU.save.cloudOk()) return [];
    const r = await root.FLAKE.rest('GET', 'dya_config?select=value&key=eq.' + encodeURIComponent(cloudKey()));
    return (r && r[0] && r[0].value && r[0].value.games) || [];
  }
  const merge = (a, b) => { const by = {}; a.concat(b).forEach(g => { if (g && g.id) by[g.id] = g; }); return Object.values(by).sort((x, y) => y.at - x.at).slice(0, 200); };
  RC.all = async function () { let c = []; try { c = await cloud(); } catch (e) { c = []; } const list = merge(local(), c); saveLocal(list); return list; };

  /* write down a finished game (once) */
  RC.add = async function (st) {
    if (!st.over || !RC.isSolo(st) || st.recorded) return null;
    const me = st.players.findIndex(P => P.kind === 'human');
    const won = st.over.winners.includes(me);
    const h = Object.values(st.heroes).filter(x => x.owner === me).sort((a, b) => b.level - a.level)[0];
    const g = { id: 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: Date.now(), name: st.setup.name || 'A game', map: st.setup.mapName || 'A random map',
      size: st.setup.size, difficulty: st.setup.difficulty || 'captain', rivals: st.players.length - 1, days: st.day, won, how: st.over.how || 'conquer',
      score: RC.score(st, won), hero: h ? h.name + ', level ' + h.level : null };
    g.title = won ? RC.title(g.score) : null;
    st.recorded = g.id;
    const list = merge([g], local()); saveLocal(list);
    if (SU.save.cloudOk()) { try { const all = merge(list, await cloud()); await root.FLAKE.rest('POST', 'dya_config?on_conflict=key', { key: cloudKey(), value: { games: all }, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates'); } catch (e) { /* kept here; it goes up next time */ } }
    return g;
  };

  /* ======================= the records screen ======================= */
  RC.show = async function () {
    const m = U.modal([el('h2', { text: 'Your records' }), el('p', { cls: 'muted', text: 'Looking…' })], { wide: true });
    const list = await RC.all();
    const b = m.box; b.innerHTML = '';
    b.appendChild(el('h2', { text: 'Your records' }));
    b.appendChild(el('p', { cls: 'small muted', text: 'Your solo games against the computer. Only you see these.' }));
    if (!list.length) { b.appendChild(el('p', { text: 'No finished games yet. Win one and it is written here.' })); b.appendChild(el('div', { cls: 'acts' }, [btn('Close', () => m.close(), 'primary')])); return; }
    const wins = list.filter(g => g.won), best = wins.slice().sort((a, b) => b.score - a.score)[0], fastest = wins.slice().sort((a, b) => a.days - b.days)[0];
    const tile = (n, l) => el('div', { cls: 'rec-tile' }, [el('div', { cls: 'n', text: String(n) }), el('div', { cls: 'small muted', text: l })]);
    b.appendChild(el('div', { cls: 'rec-tiles' }, [tile(list.length, 'games finished'), tile(wins.length, 'won'), tile(Math.round(100 * wins.length / list.length) + '%', 'won of all'),
      tile(best ? best.score : '—', best ? 'best score: ' + best.title : 'best score'), tile(fastest ? fastest.days + ' days' : '—', 'fastest win')]));
    /* the best by difficulty */
    b.appendChild(el('h3', { text: 'Best by difficulty', style: { marginTop: '12px' } }));
    const bt = el('table', { cls: 'setup rec-tbl' }, [el('tr', {}, ['Difficulty', 'Won', 'Best score', 'Title', 'Fastest'].map(x => el('th', { cls: 'small muted', text: x })))]);
    D.DIFFICULTY.forEach(d => { const gs = list.filter(g => g.difficulty === d.id), w = gs.filter(g => g.won); if (!gs.length) return;
      const top = w.slice().sort((a, b) => b.score - a.score)[0], fast = w.slice().sort((a, b) => a.days - b.days)[0];
      bt.appendChild(el('tr', {}, [el('td', { cls: 'gold', text: d.name }), el('td', { text: w.length + ' of ' + gs.length }), el('td', { text: top ? String(top.score) : '—' }), el('td', { text: top ? top.title : '—' }), el('td', { text: fast ? fast.days + ' days' : '—' })])); });
    b.appendChild(bt);
    b.appendChild(el('h3', { text: 'Your games', style: { marginTop: '12px' } }));
    const gt = el('div', { cls: 'rec-list' });
    list.slice(0, 60).forEach(g => gt.appendChild(el('div', { cls: 'rec-row' + (g.won ? ' won' : '') }, [
      el('span', { cls: 'res', text: g.won ? 'Won' : 'Lost' }),
      el('span', {}, [el('b', { text: g.map }), el('div', { cls: 'small muted', text: [SIZE_NAMES[g.size], (D.DIFFICULTY.find(d => d.id === g.difficulty) || {}).name, g.rivals + (g.rivals === 1 ? ' rival' : ' rivals'), g.hero].filter(Boolean).join(' · ') })]),
      el('span', { cls: 'small', text: 'Day ' + g.days }),
      el('span', { cls: 'small gold', text: g.won ? g.score + ' · ' + g.title : '' }),
      el('span', { cls: 'small muted', text: new Date(g.at).toLocaleDateString() })])));
    b.appendChild(gt);
    b.appendChild(el('div', { cls: 'acts' }, [btn('Close', () => m.close(), 'primary')]));
  };
})(typeof window !== 'undefined' ? window : globalThis);
