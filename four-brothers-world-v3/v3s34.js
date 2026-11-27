// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 34: crafting upgrades.
//  * Reforging: Slagg (or any forge: left click it) reforges a weapon or pick for rupees. It gets a random modifier
//    (Savage, Keen, Warding, Swift, Deft, Dull, Cracked ...) that changes damage, armour, speed or mining while you hold it.
//  * Gem sockets: every weapon or pick has one socket. Gems are cut at a knapping stone from each layer's minerals;
//    setting a new gem gives the old one back.
//  * Accessories: ten new trinkets (two per layer) forged from the layer's minerals and bars, worn in the trinket slots.
//  Modifiers and gems live on the bag slot (`v3mod`, `v3gem`) and are saved with the hero (G.snapshot / G.load wraps).
(function (RW) {
  'use strict';
  const P = RW.player, U = RW.ui, R = RW.register, E = RW.ent;
  if (!P || !R) return;
  const el = (t, c, s) => { const n = document.createElement(t); if (c) n.className = c; if (s != null) n.textContent = s; return n; };

  // ---------------- modifiers ----------------
  // [name, dmg, def, spd, mine, weight]
  const MODS = [
    ['Dull', -0.1, 0, 0, 0, 5], ['Cracked', -0.15, 0, -0.04, 0, 3], ['Heavy', 0.08, 0, -0.06, 0, 6],
    ['Jagged', 0.06, 0, 0, 0, 10], ['Keen', 0.1, 0, 0, 0, 9], ['Savage', 0.15, 0, 0, 0, 6], ['Brutal', 0.2, 0, -0.03, 0, 4],
    ['Warding', 0, 3, 0, 0, 7], ['Bulwark', 0.04, 5, -0.03, 0, 3], ['Swift', 0, 0, 0.08, 0, 7], ['Nimble', 0.05, 0, 0.05, 0, 5],
    ['Deft', 0, 0, 0, 0.15, 7], ['Delver\'s', 0.05, 0, 0, 0.2, 3],
    ['Tidecursed', 0.22, 2, 0.06, 0.1, 1], // the best
  ];
  const modOf = (s) => (s && s.v3mod ? MODS.find((m) => m[0] === s.v3mod) : null);
  const canForge = (s) => !!(s && RW.ITEMS[s.id] && RW.ITEMS[s.id].dmg && (RW.ITEMS[s.id].stack || 1) === 1);
  const roll = () => { const tot = MODS.reduce((a, m) => a + m[5], 0); let r = Math.random() * tot; for (const m of MODS) { r -= m[5]; if (r <= 0) return m; } return MODS[3]; };
  const cost = (s) => { const it = RW.ITEMS[s.id]; return Math.round(30 + (it.dmg || 4) * 2 + (it.power || 0) * 6); };

  // ---------------- gems ----------------
  const GEMS = [
    { id: 'v3gem_pearl', name: 'Pearl Eye', col: '#f4e8ec', dk: '#a08a98', in: { v3m_pearlstone: 4, v3m_seaglass: 2 }, hp: 20, say: '+20 max health' },
    { id: 'v3gem_jade', name: 'Jade Eye', col: '#4ab070', dk: '#1e5a36', in: { v3m_jadeite: 4, v3m_mossagate: 2 }, spd: 0.1, say: '+10% move speed' },
    { id: 'v3gem_ember', name: 'Ember Eye', col: '#ff8a3a', dk: '#8a3010', in: { v3m_obsidian: 3, v3m_sulfur: 3 }, dmg: 0.12, say: '+12% damage' },
    { id: 'v3gem_marrow', name: 'Marrow Eye', col: '#f0a030', dk: '#7a4a10', in: { v3m_amberstone: 4, v3m_ivorychalk: 2 }, def: 4, say: '+4 armour' },
    { id: 'v3gem_null', name: 'Null Eye', col: '#c8c0ff', dk: '#3a3060', in: { v3m_starglass: 3, v3m_onyx: 3 }, mine: 0.2, say: '+20% mining speed' },
  ];
  const gemOf = (s) => (s && s.v3gem ? GEMS.find((g) => g.id === s.v3gem) : null);
  GEMS.forEach((g) => {
    R.item({ id: g.id, name: g.name, kind: 'material', icon: { s: 'crystal', a: g.col, b: g.dk }, desc: 'A cut gem for a socket. Set it in a weapon or pick at a forge (or with Slagg): ' + g.say + ' while you hold it.' });
    R.recipes([{ out: g.id, in: g.in, at: 'knap' }]);
  });

  // ---------------- accessories (trinkets) ----------------
  const ACC = [
    { id: 'v3t_pearllocket', name: 'Pearl Locket', col: '#f4e8ec', in: { v3m_pearlstone: 8, coralite_bar: 3 }, hp: 25, say: '+25 max health.' },
    { id: 'v3t_seaglass', name: 'Sea Glass Charm', col: '#7ae0d8', in: { v3m_seaglass: 8, coralite_bar: 3 }, swim: 0.2, say: '+20% speed in water.' },
    { id: 'v3t_jadeband', name: 'Jadeite Band', col: '#4ab070', in: { v3m_jadeite: 8, verdigrite_bar: 3 }, mine: 0.15, say: '+15% mining speed.' },
    { id: 'v3t_mossagate', name: 'Moss Agate Pendant', col: '#9ac87a', in: { v3m_mossagate: 8, verdigrite_bar: 3 }, regen: 0.5, say: 'Heals 1 health every 2 seconds, even in a fight.' },
    { id: 'v3t_obsidianfang', name: 'Obsidian Fang', col: '#5a4a70', in: { v3m_obsidian: 8, cindrite_bar: 3 }, dmg: 0.1, say: '+10% damage.' },
    { id: 'v3t_sulfurward', name: 'Sulfur Ward', col: '#e8d040', in: { v3m_sulfur: 8, cindrite_bar: 3 }, thorns: 0.4, say: 'Whatever hits you up close takes 40% of it back as burning.' },
    { id: 'v3t_amberheart', name: 'Amber Heart', col: '#f0a030', in: { v3m_amberstone: 8, fossilite_bar: 3 }, def: 5, say: '+5 armour.' },
    { id: 'v3t_ivorytalisman', name: 'Ivory Talisman', col: '#f4f0e0', in: { v3m_ivorychalk: 8, fossilite_bar: 3 }, nofall: true, say: 'No fall damage.' },
    { id: 'v3t_starglass', name: 'Starglass Eye', col: '#e8e8ff', in: { v3m_starglass: 8, nullstone_bar: 3 }, dmg: 0.08, spd: 0.08, say: '+8% damage and +8% speed.' },
    { id: 'v3t_onyxseal', name: 'Onyx Seal', col: '#4a4458', in: { v3m_onyx: 8, nullstone_bar: 3 }, guard: 0.12, say: 'You take 12% less damage.' },
  ];
  ACC.forEach((a) => {
    R.item({ id: a.id, name: a.name, kind: 'armor', slot: 'trinket', def: 0, stack: 1, v3trinket: true, icon: { s: 'v3glow', a: a.col, b: 'dim' }, desc: 'Trinket (wear it: right-click). ' + a.say });
    R.recipes([{ out: a.id, in: a.in, at: 'forge' }]);
  });
  const worn = () => { const o = []; ['trinket', 'trinket2', 'trinket3'].forEach((k) => { const a = ACC.find((q) => P.armor && q.id === P.armor[k]); if (a) o.push(a); }); return o; };
  const held = () => P.inv && P.inv[P.sel];
  const sum = (k) => { const s = held(), m = modOf(s), g = gemOf(s); const MI = { dmg: 1, def: 2, spd: 3, mine: 4 }[k]; return (m && MI ? m[MI] : 0) + ((g && g[k]) || 0) + worn().reduce((a, q) => a + (q[k] || 0), 0); };

  const bDmg = P.dmgMul; P.dmgMul = function () { return bDmg.apply(this, arguments) * (1 + sum('dmg')); };
  const bDef = P.defense; P.defense = function () { return Math.max(0, bDef.apply(this, arguments) + sum('def')); };
  const bSpd = P.spdMul; P.spdMul = function () { const sw = P.water ? worn().reduce((a, q) => a + (q.swim || 0), 0) : 0; return bSpd.apply(this, arguments) * (1 + sum('spd') + sw); };
  const bMine = P.mineMul; P.mineMul = function () { return bMine.apply(this, arguments) * (1 + sum('mine')); };
  const bHp = P.maxHp; P.maxHp = function () { return bHp.apply(this, arguments) + sum('hp'); };
  const bHurt = P.hurt;
  P.hurt = function (d, dir, src) {
    const w = worn();
    if (src === 'fall' && w.some((q) => q.nofall)) return;
    const guard = w.reduce((a, q) => a + (q.guard || 0), 0); if (guard && typeof d === 'number') d = d * (1 - guard);
    const hp0 = P.hp, r = bHurt.call(this, d, dir, src);
    const th = w.reduce((a, q) => a + (q.thorns || 0), 0);
    if (th && P.hp < hp0 && src !== 'fall') {
      const c = P.center(); let best = null, bd = 60;
      (E.enemies || []).concat(E.boss ? [E.boss] : []).forEach((e) => { if (e.dead) return; const dd = RW.dist(c.x, c.y, e.x + e.w / 2, e.y + e.h / 2); if (dd < bd) { bd = dd; best = e; } });
      if (best) { E.damage(best, Math.max(1, Math.round((hp0 - P.hp) * th)), Math.sign(best.x - c.x) || 1, 2, false, '#ffd040'); best.burn = Math.max(best.burn || 0, 2); }
    }
    return r;
  };
  const bUpd = P.update; let regenT = 0;
  P.update = function (dt) {
    const r = bUpd.apply(this, arguments);
    const rg = worn().reduce((a, q) => a + (q.regen || 0), 0);
    if (rg && !P.dead && P.hp < P.maxHp()) { regenT += dt * rg; if (regenT >= 1) { regenT -= 1; P.hp = Math.min(P.maxHp(), P.hp + 1); } }
    return r;
  };

  // ---------------- saving ----------------
  (function hookSnap() {
    const G = RW.game; if (!G || !G.snapshot || !G.load) { setTimeout(hookSnap, 30); return; }
    const bSnap = G.snapshot;
    G.snapshot = function () { const s = bSnap.apply(this, arguments); try { if (s) s.v3inv = P.inv.map((q) => (q && (q.v3mod || q.v3gem) ? { m: q.v3mod || null, g: q.v3gem || null, id: q.id } : null)); } catch (e) { /* plain */ } return s; };
    const bLoad = G.load;
    G.load = function (s) { const r = bLoad.apply(this, arguments); try { (s && s.v3inv || []).forEach((x, i) => { const q = P.inv[i]; if (x && q && q.id === x.id) { if (x.m) q.v3mod = x.m; if (x.g) q.v3gem = x.g; } }); } catch (e) { /* plain */ } return r; };
  })();

  // ---------------- names in tooltips ----------------
  let tipInst = null;
  if (U.attachTip) { const bAt = U.attachTip; U.attachTip = function (node, getItem) { node.addEventListener('mouseenter', () => { tipInst = getItem(); }, true); return bAt.call(this, node, getItem); }; }
  const fullName = (s) => { const it = RW.ITEMS[s.id], m = modOf(s); return (m ? m[0] + ' ' : '') + it.name; };
  const modLine = (m) => [m[1] ? (m[1] > 0 ? '+' : '') + Math.round(m[1] * 100) + '% damage' : '', m[2] ? '+' + m[2] + ' armour' : '', m[3] ? (m[3] > 0 ? '+' : '') + Math.round(m[3] * 100) + '% speed' : '', m[4] ? '+' + Math.round(m[4] * 100) + '% mining' : ''].filter(Boolean).join(', ');
  if (U.tipFor) {
    const bTip = U.tipFor;
    U.tipFor = function (it) {
      const r = bTip.apply(this, arguments);
      try {
        const s = tipInst, t = document.getElementById('tooltip');
        if (t && s && it && s.id === it.id && (s.v3mod || s.v3gem)) {
          const b = t.querySelector('b'); if (b) b.textContent = fullName(s);
          const m = modOf(s), g = gemOf(s);
          if (m) { const i = el('i', null, m[0] + ': ' + modLine(m)); i.style.color = m[1] < 0 || m[3] < 0 ? '#e08a7a' : '#9ae0a0'; t.insertBefore(i, b.nextSibling); }
          if (g) { const i = el('i', null, 'Socket: ' + g.name + ' (' + g.say + ')'); i.style.color = g.col; t.insertBefore(i, b.nextSibling); }
        } else if (t && it && canForge({ id: it.id })) { t.append(el('i', null, 'Empty gem socket · reforge at a forge')); }
      } catch (e) { /* plain */ }
      return r;
    };
  }

  // ---------------- the bench ----------------
  let pickI = -1;
  function bench(box, says) {
    box.innerHTML = '';
    const list = P.inv.map((s, i) => (canForge(s) ? i : -1)).filter((i) => i >= 0);
    if (!list.length) { says.textContent = 'Bring me a weapon or a pick and some rupees, and I\'ll make something of it.'; return; }
    if (!list.includes(pickI)) pickI = list.includes(P.sel) ? P.sel : list[0];
    const row = el('div', 'v3bench-row');
    list.forEach((i) => { const s = P.inv[i], b = el('button', 'btn small' + (i === pickI ? ' primary' : ''), fullName(s)); b.type = 'button'; b.onclick = () => { pickI = i; bench(box, says); }; row.append(b); });
    box.append(row);
    const s = P.inv[pickI], m = modOf(s), g = gemOf(s), c = cost(s), coins = P.count('coin');
    box.append(el('div', 'v3bench-info', fullName(s) + (m ? ' — ' + modLine(m) : ' — no modifier') + (g ? ' · socket: ' + g.name + ' (' + g.say + ')' : ' · empty socket')));
    const acts = el('div', 'v3bench-row');
    const rb = el('button', 'btn small primary', 'Reforge (' + c + ' rupees)'); rb.type = 'button'; rb.disabled = coins < c;
    rb.onclick = () => {
      if (P.count('coin') < c) return; P.remove('coin', c); let n = roll(); if (m && n[0] === m[0]) n = roll();
      s.v3mod = n[0]; RW.audio.sfx('craft'); const pc = P.center(); RW.fx.burst(pc.x, pc.y, ['#ffb060', '#ffffff'], 16, 90, { add: true });
      says.textContent = n[1] < 0 || n[3] < 0 ? 'Hm. ' + n[0] + '. The metal had other ideas.' : n[0] === 'Tidecursed' ? 'Tidecursed! I\'ve only seen that twice. Don\'t lose it.' : n[0] + '. Good work, if I say so myself.';
      U.renderInv && U.renderInv(); U.dirty && U.dirty(); RW.game.saveSoon && RW.game.saveSoon(); bench(box, says);
    };
    acts.append(rb);
    GEMS.forEach((gm) => {
      if (P.count(gm.id) < 1 || (g && g.id === gm.id)) return;
      const gb = el('button', 'btn small', 'Set ' + gm.name); gb.type = 'button'; gb.style.borderColor = gm.col;
      gb.onclick = () => { if (P.count(gm.id) < 1) return; P.remove(gm.id, 1); if (s.v3gem) P.add(s.v3gem, 1); s.v3gem = gm.id; RW.audio.sfx('craft'); says.textContent = 'The ' + gm.name + ' sits snug. ' + gm.say + '.'; U.renderInv && U.renderInv(); RW.game.saveSoon && RW.game.saveSoon(); bench(box, says); };
      acts.append(gb);
    });
    if (g) { const ub = el('button', 'btn small', 'Take out the ' + g.name); ub.type = 'button'; ub.onclick = () => { P.add(g.id, 1); s.v3gem = null; U.renderInv && U.renderInv(); RW.game.saveSoon && RW.game.saveSoon(); bench(box, says); }; acts.append(ub); }
    box.append(acts);
    if (!GEMS.some((gm) => P.count(gm.id))) box.append(el('div', 'v3bench-info', 'No gems in your bag. Cut them at a knapping stone from each layer\'s minerals.'));
  }
  const st = document.createElement('style');
  st.textContent = '.v3bench-row{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.v3bench-info{font-size:12px;opacity:.9;margin:4px 0}';
  document.head.appendChild(st);
  function openBench(who) {
    U.openModal('talk');
    const t = document.getElementById('talk');
    t.querySelector('.who').textContent = who || 'Forge';
    try { const cv = t.querySelector('canvas'), g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); const ic = RW.art.icon && RW.art.icon('forge'); if (ic) { g.imageSmoothingEnabled = false; g.drawImage(ic, 0, 6, 48, 48); } } catch (e) { /* no picture */ }
    const says = t.querySelector('.says'), acts = t.querySelector('.acts'), extra = t.querySelector('.extra'); acts.innerHTML = '';
    says.textContent = 'Reforge a weapon or pick for a new modifier, or set a gem in its socket.';
    const bye = el('button', 'btn small', 'Done'); bye.type = 'button'; bye.onclick = U.closeModal; acts.append(bye);
    bench(extra, says);
  }
  const bTalk = U.talk;
  U.talk = function (npc) {
    const r = bTalk.apply(this, arguments);
    if (npc && npc.id === 'slagg') {
      const t = document.getElementById('talk'), acts = t.querySelector('.acts'), says = t.querySelector('.says'), extra = t.querySelector('.extra');
      const b = el('button', 'btn small', 'Reforge & gems'); b.type = 'button'; b.onclick = () => { says.textContent = 'Let\'s see what you\'ve got.'; bench(extra, says); };
      acts.insertBefore(b, acts.lastChild);
    }
    return r;
  };
  if (RW.T.forge != null) RW.TILES[RW.T.forge].use = RW.TILES[RW.T.forge].use || 'v3bench';
  const bUse = P.useTile;
  P.useTile = function (x, y) {
    const t = RW.TILES[RW.world.get(x, y)];
    if (t && t.key === 'forge') { openBench('Forge'); return true; }
    return bUse.apply(this, arguments);
  };
  RW.v3forge = { MODS, GEMS, ACC, openBench, fullName, modOf, gemOf };
})(window.RW);
