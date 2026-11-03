/* ============================================================
   SKAAR UVERKHRON — js/saveload.js
   The save and load screens: a list of saved games on the left,
   and on the right a picture of the map, the day, the players,
   the difficulty and the goal of the one you pick.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, U = SU.ui, el = U.el, btn = U.btn, G = SU.game, SV = SU.save;

  /* every save, here and on the account, one entry per slot */
  async function allSaves() {
    let cloud = [];
    try { cloud = await SV.listCloud(); } catch (e) { cloud = []; }
    const by = {};
    SV.listLocal().forEach(s => { by[s.slot] = Object.assign({}, s, { local: s.at, cloud: 0 }); });
    cloud.forEach(s => { const e = by[s.slot]; if (!e) by[s.slot] = Object.assign({}, s, { local: 0, cloud: s.at }); else { e.cloud = s.at; if (s.at > e.at) Object.assign(e, { name: s.name, day: s.day, at: s.at, info: s.info || e.info }); } });
    return Object.values(by).sort((a, b) => (a.slot === 'auto' ? -1 : b.slot === 'auto' ? 1 : b.at - a.at));
  }
  const when = at => { const d = new Date(at); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); };

  function preview(s, extra) {
    const box = el('div', { cls: 'sl-prev' });
    if (!s) { box.appendChild(el('div', { cls: 'sl-thumb empty', text: '?' })); box.appendChild(el('p', { cls: 'muted', text: 'Choose a saved game.' })); return box; }
    const inf = s.info || {};
    box.appendChild(inf.thumb ? el('img', { cls: 'sl-thumb', src: inf.thumb, alt: 'The map' }) : el('div', { cls: 'sl-thumb empty', text: '?' }));
    const cal = S.cal(s.day || 1);
    box.appendChild(el('h2', { text: s.name || 'A game' }));
    box.appendChild(el('div', { cls: 'small muted', text: [inf.map, inf.size ? { S: 'Small', M: 'Medium', L: 'Large', XL: 'Extra large', G: 'Gigantic' }[inf.size] : null].filter(Boolean).join(' · ') }));
    box.appendChild(el('div', { cls: 'sl-facts' }, [
      el('div', {}, [el('b', { cls: 'gold', text: 'Day ' + (s.day || 1) }), ' — month ' + cal.month + ', week ' + cal.week + ', day ' + cal.dow]),
      inf.difficulty ? el('div', {}, ['Difficulty: ', el('span', { cls: 'gold', text: (D.DIFFICULTY.find(d => d.id === inf.difficulty) || {}).name || inf.difficulty })]) : null,
      inf.win ? el('div', {}, ['Victory: ', el('span', { cls: 'gold', text: (D.WIN[inf.win] || D.WIN.conquer).name })]) : null,
      el('div', { cls: 'small muted', text: 'Saved ' + when(s.at) + ' · ' + [s.local ? 'in this browser' : null, s.cloud ? 'on your account' : null].filter(Boolean).join(' and ') }),
    ]));
    const ps = inf.players || s.players || [];
    if (ps.length) box.appendChild(el('div', { cls: 'sl-players' }, ps.map((p, i) => el('div', { cls: 'sl-p' + (p.alive === false ? ' out' : '') }, [
      el('span', { cls: 'dot', style: { background: p.color } }),
      el('span', { cls: 'nm', text: p.name + (inf.current === i ? ' ◂' : '') }),
      el('span', { cls: 'small muted', text: (p.kind === 'ai' ? 'computer' + (p.ai && D.AI_LEVELS[p.ai] ? ', ' + D.AI_LEVELS[p.ai].name.toLowerCase() : '') : 'person') + (p.alive === false ? ' · out' : p.towns != null ? ' · ' + SU.plural(p.towns, 'town') + ', ' + SU.plural(p.heroes, 'hero', 'heroes') : '') })]))));
    if (extra) box.appendChild(extra);
    return box;
  }

  function shell(title) {
    const m = U.modal([el('h2', { text: title }), el('p', { cls: 'muted', text: 'Looking…' })], { wide: true });
    m.box.classList.add('sl-box');
    return m;
  }
  function listView(saves, chosen, onPick, onOpen) {
    const list = el('div', { cls: 'sl-list' });
    if (!saves.length) list.appendChild(el('p', { cls: 'muted small', style: { padding: '8px' }, text: 'There are no saved games yet.' }));
    saves.forEach(s => list.appendChild(el('div', { cls: 'sl-row' + (chosen === s ? ' on' : ''), onclick: () => onPick(s), ondblclick: () => onOpen && onOpen(s) }, [
      el('span', { cls: 'nm', text: s.slot === 'auto' ? '⟳ ' + s.name : s.name }),
      el('span', { cls: 'small muted', text: 'Day ' + s.day }),
      el('span', { cls: 'small muted', text: when(s.at) })])));
    return list;
  }

  /* ======================= load ======================= */
  G.loadMenu = async function () {
    const m = shell('Load a game');
    let saves = await allSaves(), chosen = saves[0] || null;
    const open = s => { m.close(); G.loadSlot(s.cloud && s.cloud >= s.local ? 'cloud' : 'local', s.slot); };
    function render() {
      const b = m.box; b.innerHTML = '';
      b.appendChild(el('h2', { text: 'Load a game' }));
      b.appendChild(el('div', { cls: 'sl-main' }, [listView(saves, chosen, s => { chosen = s; render(); }, open), preview(chosen)]));
      b.appendChild(el('div', { cls: 'acts' }, [
        chosen ? btn('Delete', () => U.confirm('Delete this save?', chosen.name, async () => {
          try { if (chosen.cloud) await SV.deleteCloud(chosen.slot); } catch (e) { U.toast('Could not delete it from your account.'); }
          if (chosen.local) SV.deleteLocal(chosen.slot);
          saves = await allSaves(); chosen = saves[0] || null; render(); }), 'danger') : null,
        el('div', { cls: 'spacer' }),
        btn('Cancel', () => m.close()),
        btn('Load', () => { if (chosen) open(chosen); }, 'primary big')]));
    }
    render();
  };

  /* ======================= save ======================= */
  G.saveMenu = async function () {
    const st = G.st; if (!st || st.online) return;
    const m = shell('Save the game');
    let saves = (await allSaves()).filter(s => s.slot !== 'auto'), chosen = null;
    const name = el('input', { cls: 'inp', value: st.setup.name + ' — day ' + st.day, style: { flex: 1, minWidth: '200px' } });
    const doSave = async () => {
      const nm = name.value.trim() || 'A game';
      const slot = chosen && chosen.name === nm ? chosen.slot : 's' + Date.now().toString(36);
      const go = async () => {
        const ok = SV.saveLocal(st, slot, nm);
        let cloudOk = true;
        if (SV.cloudOk()) { try { await SV.saveCloud(st, slot, nm); } catch (e) { cloudOk = false; } }
        m.close();
        U.toast(!ok && !cloudOk ? 'Could not save.' : !cloudOk ? 'Saved here, but the account save failed.' : !ok ? 'Saved to your account (this browser is full).' : 'Saved.');
      };
      if (chosen && chosen.name === nm) U.confirm('Save over it?', '“' + nm + '” will be replaced.', go, null, ['Save over it', 'No']); else go();
    };
    name.addEventListener('keydown', e => { if (e.key === 'Enter') doSave(); });
    const now = { slot: '', name: name.value, day: st.day, at: Date.now(), info: null, local: 0, cloud: 0 };
    function render() {
      const b = m.box; b.innerHTML = '';
      b.appendChild(el('h2', { text: 'Save the game' }));
      const shown = chosen || Object.assign(now, { name: name.value, info: now.info || SV.info(st) });
      b.appendChild(el('div', { cls: 'sl-main' }, [listView(saves, chosen, s => { chosen = chosen === s ? null : s; if (chosen) name.value = chosen.name; render(); }), preview(shown, chosen ? el('p', { cls: 'small warn', text: 'Saving with this name replaces this save.' }) : el('p', { cls: 'small muted', text: 'This is the game you are saving. Pick a save on the left to save over it.' }))]));
      b.appendChild(el('div', { cls: 'acts' }, [el('span', { cls: 'muted', text: 'Name' }), name, btn('Cancel', () => m.close()), btn('Save', doSave, 'primary big')]));
      setTimeout(() => name.focus(), 20);
    }
    render();
  };
})(typeof window !== 'undefined' ? window : globalThis);
