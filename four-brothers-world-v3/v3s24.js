// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 24: ways to test without a full playthrough.
//  * F9 opens a test menu in any world: god mode, set your rune (0-14), jump to Stalagmere, any ring, any lair or
//    the Heart Chamber, call any boss, give yourself any item (or a ring's whole set), reveal the map, full heal.
//  * World select has a "Create test world": a world with the rings, where you arrive with every rune, god mode on,
//    and the test menu open.
(function (RW) {
  'use strict';
  const P = RW.player, WD = RW.world, E = RW.ent, U = RW.ui, TS = RW.TILE;
  if (!P || !WD || !E) return;
  const css = document.createElement('style');
  css.textContent = `#v3test{position:fixed;right:12px;top:60px;width:330px;max-height:86vh;overflow:auto;z-index:60;background:rgba(14,12,20,.96);border:1px solid #6c4aa8;border-radius:8px;padding:10px 12px;color:#e8e0f0;font:13px monospace;box-shadow:0 8px 30px rgba(0,0,0,.6)}
  #v3test.hide{display:none}#v3test h3{margin:0 0 6px;font-size:14px;color:#c0a8ff}#v3test .row{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 8px}
  #v3test button{background:#241c36;color:#e8e0f0;border:1px solid #4a3a70;border-radius:4px;padding:3px 7px;font:12px monospace;cursor:pointer}#v3test button:hover{border-color:#c0a8ff}
  #v3test input,#v3test select{background:#120e1a;color:#fff;border:1px solid #4a3a70;border-radius:4px;padding:3px;font:12px monospace}#v3test .lab{color:#9a8ab8;font-size:11px;margin-top:4px}`;
  document.head.appendChild(css);
  const box = document.createElement('div'); box.id = 'v3test'; box.className = 'hide'; document.body.appendChild(box);
  const el = (t, txt, fn) => { const e = document.createElement(t); if (txt != null) e.textContent = txt; if (fn) e.onclick = fn; return e; };
  const row = (...kids) => { const r = el('div'); r.className = 'row'; kids.forEach((k) => r.append(k)); return r; };
  const lab = (t) => { const d = el('div', t); d.className = 'lab'; return d; };
  const say = (t) => U && U.toast && U.toast(t);
  function goTo(x, y) { // tiles; finds open water or air nearby
    for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const t = WD.get(x + dx, y + dy), t2 = WD.get(x + dx, y + dy - 1);
      if (!RW.TILES[t].solid && !RW.TILES[t2].solid) { P.x = (x + dx) * TS; P.y = (y + dy - 1) * TS; P.vx = P.vy = 0; if (WD.markExplored) WD.markExplored(x + dx, y + dy, 30); return true; }
    }
    return false;
  }
  function render() {
    box.innerHTML = ''; box.append(el('h3', 'Test menu (F9)'));
    box.append(row(el('button', (P.god ? 'God mode: ON' : 'God mode: off'), () => { P.god = !P.god; render(); }), el('button', 'Full heal', () => { P.hp = P.maxhp || P.hp; if (P.stamina != null) P.stamina = 999; }), el('button', 'Reveal map', () => { if (WD.explored) WD.explored.fill(1); if (RW.v3map) { const m = RW.v3map.state(); if (m) { m.img = null; } } say('Map revealed'); })));
    box.append(lab('Rune (mining strength): now ' + ((P.flags && P.flags.rune) | 0)));
    const rs = el('select'); for (let i = 0; i <= 14; i++) { const o = el('option', i + (RW.v2runes ? '' : '')); o.value = i; if (((P.flags && P.flags.rune) | 0) === i) o.selected = true; rs.append(o); }
    rs.onchange = () => { P.flags.rune = +rs.value; P.flags.v3runeMig = 1; say('Rune set to ' + rs.value); render(); };
    box.append(row(rs, el('button', 'Max rune', () => { P.flags.rune = 14; P.flags.v3runeMig = 1; render(); })));
    if (WD.def && WD.def.id === 'rock') {
      box.append(lab('Go to'));
      const r = row(); const L = RW.v3ringsLib, M = WD.meta || {};
      if (WD.def.spawn) r.append(el('button', 'Stalagmere', () => goTo(WD.def.spawn.x, WD.def.spawn.y)));
      if (L && RW.v3ringsOn && RW.v3ringsOn()) {
        [['Coral', 5], ['Kelp', 4], ['Scald', 3], ['Boneyard', 2], ['Hollow Dark', 1]].forEach(([n, j]) => r.append(el('button', n, () => goTo(Math.round(L.CX), L.midOf(j)))));
        (M.v3lairs || []).forEach((l) => r.append(el('button', 'Lair: ' + l.boss.replace('v3b_', ''), () => goTo(l.x, l.y))));
        if (M.v3shaft) r.append(el('button', 'Ring shaft', () => goTo(M.v3shaft.x, M.v3shaft.y1 - 4)));
      } else r.append(el('div', '(this world has no rings)'));
      if (M.arena) r.append(el('button', 'Heart Chamber', () => goTo(M.arena.cx - 40, M.arena.cy)));
      box.append(r);
      box.append(lab('Bosses'));
      const b = row();
      b.append(el('button', 'Leviathan', () => { if (M.arena) goTo(M.arena.cx - 40, M.arena.cy); E.boss = null; setTimeout(() => { E.maybeSpawnBoss && E.maybeSpawnBoss(); }, 300); }));
      (RW.v3ringBosses || []).forEach((id) => b.append(el('button', (RW.SPECIES[id] && RW.SPECIES[id].name) || id, () => { const l = (M.v3lairs || []).find((q) => q.boss === id); if (l) goTo(l.x - 10, l.y); setTimeout(() => RW.v3callBoss && RW.v3callBoss(id), 300); })));
      box.append(b);
    }
    box.append(lab('Give item (id or part of a name)'));
    const inp = el('input'); inp.placeholder = 'e.g. reefcleaver, abyssite_bar'; inp.style.width = '170px'; const n = el('input'); n.value = '1'; n.style.width = '40px';
    const dl = el('datalist'); dl.id = 'v3testItems'; Object.keys(RW.ITEMS).forEach((k) => { const o = el('option'); o.value = k; dl.append(o); }); inp.setAttribute('list', 'v3testItems');
    box.append(dl, row(inp, n, el('button', 'Give', () => {
      const q = (inp.value || '').trim().toLowerCase(); let id = RW.ITEMS[q] ? q : Object.keys(RW.ITEMS).find((k) => k.includes(q) || (RW.ITEMS[k].name || '').toLowerCase().includes(q));
      if (!id) { say('No item like "' + q + '"'); return; } P.add(id, Math.max(1, +n.value || 1)); U.dirty && U.dirty(); say('Gave ' + RW.ITEMS[id].name);
    })));
    const sets = RW.v3ringItems && RW.v3ringItems.SETS;
    if (sets) {
      box.append(lab('Give a ring set (weapons + armour + 99 bars)'));
      box.append(row(...sets.map((S, i) => el('button', ['Coral', 'Kelp', 'Scald', 'Bone', 'Void'][i], () => { [S.melee[0], S.bow[0], S.staff[0], S.helm[0], S.mail[0]].forEach((id) => P.add(id, 1)); P.add(S.bar, 99); if (S.ore) P.add(S.ore, 20); U.dirty && U.dirty(); say('Gave the ' + ['Coral', 'Kelp', 'Scald', 'Bone', 'Void'][i] + ' set'); }))));
      box.append(row(el('button', 'Chillshell Charm', () => { P.add('t_chill', 1); U.dirty && U.dirty(); }), el('button', '9999 coins', () => { P.add('coin', 9999); U.dirty && U.dirty(); })));
    }
    box.append(row(el('button', 'Close (F9)', () => box.classList.add('hide'))));
  }
  const open = () => { render(); box.classList.remove('hide'); };
  window.addEventListener('keydown', (e) => { if (e.code !== 'F9') return; e.preventDefault(); if (box.classList.contains('hide')) open(); else box.classList.add('hide'); });
  RW.v3test = { open, goTo };

  // ---------------- the test world ----------------
  const isTest = () => { const w = RW.v3slots && RW.v3slots.world; return !!(w && RW.store.get('v3_test@w' + w, 0)); };
  const sel = () => document.getElementById('v3sel');
  const mo = new MutationObserver(() => {
    const b = sel(); if (!b || b.classList.contains('hide')) return;
    const h = b.querySelector('h2'); if (!h || h.textContent !== 'Choose a world' || b.querySelector('[data-v3test]')) return;
    const btn = el('button', 'Create test world (everything unlocked)', () => {
      const l = RW.store.get('v3_worlds', []) || [], id = 'w' + Date.now().toString(36) + 't';
      l.push({ id, name: 'Test world', at: Date.now() }); RW.store.set('v3_worlds', l);
      RW.store.set('v2_rockseed@w' + id, 1 + Math.floor(Math.random() * 2147483000)); RW.store.set('v3_rings@w' + id, 1); RW.store.set('v3_test@w' + id, 1);
      if (RW.v3slots && RW.v3slots.worldScreen) RW.v3slots.worldScreen();
    });
    btn.className = 'btn small'; btn.dataset.v3test = '1'; btn.style.marginTop = '8px';
    const bars = b.querySelectorAll('.v3bar'); (bars[0] || b).after(btn);
  });
  mo.observe(document.body, { childList: true, subtree: true });
  // arriving in the test world: every rune, god mode, the menu open
  const G = () => RW.game;
  const hook = setInterval(() => {
    if (!G() || !G().start) return; clearInterval(hook);
    const bs = G().start;
    G().start = async function () { const r = await bs.apply(this, arguments); if (isTest()) { P.flags.rune = 14; P.flags.v3runeMig = 1; P.god = true; setTimeout(open, 600); say('Test world: every rune, god mode on. F9 for the test menu.'); } return r; };
  }, 200);
})(window.RW);
