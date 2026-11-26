// 4 Brothers World V3 — part 7: glow trinkets.
//  * Worn in a new Trinket slot (its own row in the bag). While you wear one you glow, whatever you hold, in every world.
//  * Three strengths: Dim (lights about 3 blocks round you), Bright (about 9) and Radiant (about 16).
//    Six colours: amber, cyan, green, violet, white and ember.
//    Dim: craft by hand from 3 Glow Mushrooms and 2 stone (amber). Bright: craft at a forge from 1 Gemscale and
//    1 platinum bar (amber). Radiant: found in legendary chests (a random colour).
//  * Recolour the trinket you wear at a forge for 1 matching crystal: gold for amber, blue for cyan, green for green,
//    purple for violet, red for ember, any crystal for white. (In the bag's Trinket row, when you stand by a forge.)
//  * The wearer gets a soft outline in the glow's colour, and friends in your room see your glow light the cave.
(function (RW) {
  'use strict';
  const E = RW.ent, P = RW.player, WD = RW.world, U = RW.ui, N = RW.net, A = RW.art, TS = RW.TILE;
  if (!E || !P || !WD || !U || !A) return;
  const COLS = { amber: '#ffb347', cyan: '#6ff0ff', green: '#8dff8a', violet: '#c89bff', white: '#f4f4ff', ember: '#ff6a3a' };
  const CRYSTAL = { amber: ['crystal_gold'], cyan: ['crystal_blue'], green: ['crystal_green'], violet: ['crystal_purple'], ember: ['crystal_red'], white: ['crystal_red', 'crystal_blue', 'crystal_green', 'crystal_purple', 'crystal_gold'] };
  const TIERS = { dim: { name: 'Dim', power: 0.18 }, bright: { name: 'Bright', power: 0.38 }, radiant: { name: 'Radiant', power: 0.93 } };
  const CNAME = { amber: 'Amber', cyan: 'Cyan', green: 'Green', violet: 'Violet', white: 'White', ember: 'Ember' };
  const idOf = (t, c) => 'glow_' + t + '_' + c;
  const parse = (id) => { const m = /^glow_(dim|bright|radiant)_([a-z]+)$/.exec(id || ''); return m && COLS[m[2]] ? { tier: m[1], col: m[2] } : null; };
  Object.keys(TIERS).forEach((t) => Object.keys(COLS).forEach((c) => {
    RW.register.item({ id: idOf(t, c), name: TIERS[t].name + ' ' + CNAME[c] + ' Glowstone', kind: 'armor', slot: 'trinket', def: 0, stack: 1,
      icon: { s: 'v3glow', a: COLS[c], b: t }, desc: 'A trinket. Wear it (right-click) and you glow ' + CNAME[c].toLowerCase() + ', about ' + ({ dim: 3, bright: 9, radiant: 16 }[t]) + ' blocks round you. Recolour it at a forge for a matching crystal.' });
  }));
  RW.register.recipe({ out: 'glow_dim_amber', in: { glow_mushroom: 3, stone: 2 } });
  RW.register.recipe({ out: 'glow_bright_amber', in: { leviathan_scale: 1, platinum_bar: 1 }, at: 'forge' });
  // the icon: a gem on a little cord, brighter for the stronger ones
  A.iconExtra.v3glow = function (g, a, tier) {
    const r = tier === 'radiant' ? 4 : tier === 'bright' ? 3.5 : 3;
    A.line(g, 4, 2, 8, 6, '#8a7a5a'); A.line(g, 12, 2, 8, 6, '#8a7a5a');
    A.ell(g, 8, 10, r + 1, r + 1, '#141218'); A.ell(g, 8, 10, r, r, a); A.ell(g, 7, 9, 1, 1, '#ffffff');
    if (tier !== 'dim') { A.px(g, 8, 10 - r - 2, a); A.px(g, 8, 10 + r + 2, a); A.px(g, 8 - r - 2, 10, a); A.px(g, 8 + r + 2, 10, a); }
    if (tier === 'radiant') { A.px(g, 4, 6, '#ffffff'); A.px(g, 12, 14, '#ffffff'); A.px(g, 12, 6, a); A.px(g, 4, 14, a); }
  };
  const rgb = (hex) => { const c = RW.hexToRgb(hex); return [c[0] / 255, c[1] / 255, c[2] / 255]; };
  const lightOf = (id) => { const q = parse(id); if (!q) return null; const c = rgb(COLS[q.col]), m = Math.max(c[0], c[1], c[2]) || 1, k = TIERS[q.tier].power / m; return [c[0] * k, c[1] * k, c[2] * k]; };

  // ---- the light: yours and your friends' ----
  const friends = new Map(); // pid -> trinket id
  const baseLight = WD.computeLight;
  WD.computeLight = function (tx0, ty0, tw, th, extra) {
    if (Array.isArray(extra) && RW.game && RW.game.playing) {
      const mine = !P.dead && lightOf(P.armor && P.armor.trinket);
      if (mine) extra.push({ x: P.x + 6, y: P.y + 10, r: mine[0], g: mine[1], b: mine[2], v3: true });
      if (N && N.peers) N.peers.forEach((p, key) => { const t = p.target, id = friends.get(key) || (t && friends.get(t.pid)); if (!id || !t || t.dead || t.w !== (WD.def && WD.def.id)) return; const l = lightOf(id); if (l) extra.push({ x: p.x + 6, y: p.y + 10, r: l[0], g: l[1], b: l[2], v3: true }); });
    }
    return baseLight.apply(this, arguments);
  };
  if (N) {
    let last = null, beat = 0;
    setInterval(() => { if (!N.transport || !RW.game || !RW.game.playing) return; const id = (P.armor && P.armor.trinket) || ''; beat++; if (id !== last || beat % 3 === 0) { last = id; N.send({ k: 'v3glow', id }); } }, 1500);
    N.on('v3glow', (m) => { if (typeof m.f !== 'string') return; if (m.id && parse(m.id)) friends.set(m.f, m.id); else friends.delete(m.f); });
    N.on('left', (m) => friends.delete(m.pid));
  }

  // ---- the soft outline ----
  const rims = new WeakMap();
  function rim(fr, col) {
    let m = rims.get(fr); if (!m) { m = {}; rims.set(fr, m); } if (m[col]) return m[col];
    const src = fr.__hd2 || fr, c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const g = c.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); c.__noHD = true;
    m[col] = c; return c;
  }
  const baseDP = E.drawPlayer;
  E.drawPlayer = function (g, cam, p, look, opts) {
    let id = null;
    if (p === P) id = P.armor && P.armor.trinket;
    else if (N && N.peers) N.peers.forEach((q, key) => { if (!id && Math.abs(q.x - p.x) < 1 && Math.abs(q.y - p.y) < 1) id = friends.get(key) || (q.target && friends.get(q.target.pid)); });
    const qq = parse(id);
    if (qq && opts && !opts.dead) {
      try {
        const frames = A.dressed(opts.species || 'rock', look, opts.armor), fr = frames[p.anim || 0] && frames[p.anim || 0][(p.face || 1) > 0 ? 0 : 1];
        if (fr) {
          const sc = opts.scale || 1, w = fr.width * sc, h = fr.height * sc;
          const dx = Math.round(p.x - cam.x + 6 - w / 2), dy = Math.round(p.y - cam.y + 28 - h + ({ fuzzy: 2, acorn: 2, ghost: 3 }[opts.species] || 1));
          const rc = rim(fr, COLS[qq.col]), puls = 0.45 + 0.15 * Math.sin(performance.now() / 300);
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = puls * (qq.tier === 'radiant' ? 1 : qq.tier === 'bright' ? 0.8 : 0.6);
          [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([ax, ay]) => g.drawImage(rc, dx + ax * 0.75, dy + ay * 0.75, w, h));
          g.restore();
        }
      } catch (e) { /* the outline is only a look */ }
    }
    return baseDP.apply(this, arguments);
  };

  // ---- radiant glowstones in legendary chests ----
  const baseSet = WD.setTile;
  WD.setTile = function (x, y) {
    const was = WD.get(x, y), r = baseSet.apply(this, arguments);
    if (RW.T.legendchest != null && was === RW.T.legendchest && WD.get(x, y) !== was && Math.hypot(P.x + 6 - (x * TS + 8), P.y + 14 - (y * TS + 8)) < 6 * TS && Math.random() < 0.6) {
      const c = RW.pick(Object.keys(COLS)); E.dropItem(idOf('radiant', c), 1, x * TS + 8, y * TS); setTimeout(() => U.toast('A Radiant ' + CNAME[c] + ' Glowstone was in the chest!'), 400);
    }
    return r;
  };

  // ---- the bag: a Trinket row, and recolouring at a forge ----
  const css = document.createElement('style');
  css.textContent = '.v3trinket { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 6px; } .v3trinket .chip[disabled] { opacity: .4; } .v3trinket .sw { display: inline-block; width: 10px; height: 10px; margin-right: 4px; border: 1px solid #000; vertical-align: -1px; }';
  document.head.appendChild(css);
  const paint = (canvas, id) => { const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 16, 16); if (id) g.drawImage(A.icon(id), 0, 0); };
  const baseRender = U.renderInv;
  U.renderInv = function () {
    const r = baseRender.apply(this, arguments);
    const sb = document.getElementById('statsbox'); if (!sb) return r;
    const old = sb.querySelector('.v3trinket'); if (old) old.remove();
    const row = document.createElement('div'); row.className = 'wearing v3trinket';
    const b = document.createElement('b'); b.textContent = 'Trinket'; row.append(b);
    const id = P.armor && P.armor.trinket, it = RW.ITEMS[id];
    const slot = document.createElement('div'); slot.className = 'slot armorslot'; const c = document.createElement('canvas'); c.width = c.height = 16; paint(c, it && it.id); slot.append(c);
    slot.title = it ? it.name + ' (click to take off)' : 'No trinket. Right-click a Glowstone in your bag to wear it.';
    slot.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); if (it) { P.unwear('trinket'); U.renderInv(); } });
    if (it) U.attachTip(slot, () => ({ id: it.id }));
    row.append(slot);
    const q = parse(id);
    if (q) {
      const atForge = P.nearStation && P.nearStation('forge');
      const lab = document.createElement('span'); lab.className = 'label'; lab.textContent = atForge ? 'Recolour (1 matching crystal):' : 'Stand by a forge to recolour it.'; row.append(lab);
      if (atForge) Object.keys(COLS).forEach((col) => {
        if (col === q.col) return;
        const need = CRYSTAL[col].find((cr) => P.has(cr));
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'chip'; const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = COLS[col]; btn.append(sw, document.createTextNode(CNAME[col]));
        btn.title = col === 'white' ? 'Any crystal' : RW.ITEMS[CRYSTAL[col][0]] ? RW.ITEMS[CRYSTAL[col][0]].name : '';
        if (!need) btn.disabled = true;
        btn.onclick = () => { if (!need) return; P.remove(need, 1); P.armor.trinket = idOf(q.tier, col); RW.audio.sfx('craft'); RW.fx.burst(P.x + 6, P.y + 10, [COLS[col], '#ffffff'], 14, 80, { add: true, kind: 'glow' }); U.toast('Your glowstone shines ' + CNAME[col].toLowerCase() + ' now.'); RW.game.saveSoon(); U.renderInv(); };
        row.append(btn);
      });
    }
    const wear = sb.querySelector('.wearing'); if (wear) wear.after(row); else sb.prepend(row);
    return r;
  };
  // trinkets never count as armour pieces for the armour look and the defence total (they have none anyway)
  RW.v3glow = { COLS, TIERS, idOf, parse };
})(window.RW);
