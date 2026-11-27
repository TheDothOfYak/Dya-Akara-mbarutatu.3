// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 15: chunkier pixels and a cleaner bag.
//  * Items: the 48x48 Leviathan pictures are snapped down to 32x32 (their own colours, no blur), and every item picture is
//    shown pixel-sharp. Rocks: the sharp frames are drawn with pixels half again as big (still sharper than the old 1x).
//  * The bag: bigger slots and counts, the long help text folded into one line, Equipment (armour + trinkets) in one row,
//    the armour-look pickers tucked behind a "Style" button, compact stats.
//  * Crafting: one list. What you can make now comes first (green), the rest greyed out below, ingredients shown as
//    small pictures with counts.
(function (RW) {
  'use strict';
  const A = RW.art, E = RW.ent, U = RW.ui, P = RW.player, VA = RW.v3art;
  if (!A || !E || !U) return;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d'); return c; };

  // ---------------- items: 48 -> 32, snapped to their own colours ----------------
  function palOf(c) {
    const d = c.ctx.getImageData(0, 0, c.width, c.height).data, seen = new Map();
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 120) { const k = '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''); seen.set(k, (seen.get(k) || 0) + 1); }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 48).map((e) => e[0]);
  }
  const small = new WeakMap();
  function to32(big) {
    if (small.has(big)) return small.get(big);
    const src = mk(big.width, big.height); src.ctx.drawImage(big, 0, 0);
    const c = mk(32, 32); c.ctx.imageSmoothingEnabled = true; c.ctx.imageSmoothingQuality = 'high'; c.ctx.drawImage(big, 0, 0, 32, 32);
    VA.finish(c, palOf(src), { noOutline: true }); c.__noHD = true; small.set(big, c); return c;
  }
  const baseIcon = A.icon;
  A.icon = function (id) {
    const c = baseIcon.apply(this, arguments);
    if (c && c.__big48 && c.__big48.width > 32 && !c.__v3px) { const s = to32(c.__big48); c.__big48 = s; c.__hd2 = s; c.__v3px = true; }
    return c;
  };
  Object.keys(A.icons || {}).forEach((k) => { const c = A.icons[k]; if (c && c.__big48 && c.__big48.width > 32) A.icon(k); });

  // ---------------- rocks: sharp frames with pixels half again as big ----------------
  const HD = new WeakSet(), chunky = new WeakMap();
  const baseDressed = A.dressed;
  A.dressed = function (species) {
    const out = baseDressed.apply(this, arguments);
    if (species === 'rock' && out) out.forEach((pair) => pair && pair.forEach((f) => { if (f && f.__hd2) HD.add(f.__hd2); }));
    return out;
  };
  function chunk(hd) {
    let c = chunky.get(hd); if (c) return c;
    const w = Math.round(hd.width * 2 / 3), h = Math.round(hd.height * 2 / 3); c = mk(w, h); c.ctx.imageSmoothingEnabled = false; c.ctx.drawImage(hd, 0, 0, w, h); c.__noHD = true;
    chunky.set(hd, c); return c;
  }
  const baseDP = E.drawPlayer;
  E.drawPlayer = function (g) {
    const raw = g.drawImage;
    g.drawImage = function (img) { if (arguments.length === 5 && img && HD.has(img)) { const a = Array.from(arguments); a[0] = chunk(img); return raw.apply(this, a); } return raw.apply(this, arguments); };
    try { return baseDP.apply(this, arguments); } finally { g.drawImage = raw; }
  };

  // ---------------- the bag ----------------
  const css = document.createElement('style');
  css.textContent = `
  #inv .panel { width: min(1080px, 98vw); }
  #inv .slot { width: 46px; height: 46px; } #inv .grid { grid-template-columns: repeat(10, 46px); gap: 4px; }
  #inv .slot canvas, #chest .slot canvas { width: 36px; height: 36px; image-rendering: pixelated !important; }
  #inv .slot .n { font-size: 15px; right: 3px; bottom: 1px; font-weight: bold; text-shadow: 0 1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 -1px 0 #000; }
  #inv .hint { display: none; } #inv .v3hint { font-size: 14px; opacity: .7; margin: 6px 0 2px; }
  #invtools { margin-top: 4px; } #invtoolhint { font-size: 13px; }
  #statsbox { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; font-size: 15px; }
  #statsbox .wearing { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  #statsbox .v3equip { grid-column: 1 / -1; display: flex; gap: 14px; flex-wrap: wrap; align-items: center; background: var(--panel-2); padding: 6px 8px; border-left: 3px solid #8a7ac8; }
  #statsbox .v3equip > b { margin-right: 2px; } #statsbox .v3equip .grp { display: flex; gap: 5px; align-items: center; } #statsbox .v3equip .grp span.lbl { font-size: 13px; opacity: .7; margin-right: 3px; }
  #statsbox .v3style { grid-column: 1 / -1; } #statsbox .v3style summary { cursor: pointer; font-size: 14px; opacity: .8; }
  #inv .recipe { grid-template-columns: 40px minmax(0, 1fr) auto; padding: 6px 8px; }
  #inv .recipe canvas { width: 36px; height: 36px; image-rendering: pixelated !important; }
  #inv .recipe.no { opacity: .5; } #inv .recipe .nm { font-size: 17px; }
  #inv .recipe .ing { gap: 4px 8px; } #inv .recipe .ing .chip2 { display: inline-flex; align-items: center; gap: 3px; font-size: 14px; }
  #inv .recipe .ing .chip2 canvas { width: 18px; height: 18px; }
  #inv .v3sep { font-size: 13px; opacity: .6; margin: 6px 2px 2px; text-transform: uppercase; letter-spacing: .05em; }
  .recipes { max-height: 60vh; }`;
  document.head.appendChild(css);
  const el = (t, cls, txt) => { const e = document.createElement(t); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const paint = (canvas, id) => { const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, canvas.width, canvas.height); if (id) g.drawImage(A.icon(id), 0, 0); };
  const baseInv = U.renderInv;
  U.renderInv = function () {
    const r = baseInv.apply(this, arguments);
    try {
      const stash = document.getElementById('stash');
      if (stash && !stash.querySelector('.v3hint')) { const h = el('div', 'v3hint', 'Click: pick up / move · Right-click: use or wear · Shift-click: drop a stack'); const hint = stash.querySelector('.hint'); if (hint) hint.after(h); }
      const sb = document.getElementById('statsbox'); if (!sb) return r;
      // one Equipment row: armour and trinkets side by side
      const rows = Array.from(sb.querySelectorAll('.wearing')), armour = rows.find((x) => !x.classList.contains('v3trinket')), trink = sb.querySelector('.v3trinket');
      if (armour && trink && !sb.querySelector('.v3equip')) {
        const eq = el('div', 'v3equip'); eq.append(el('b', null, 'Equipment'));
        const g1 = el('div', 'grp'); g1.append(el('span', 'lbl', 'Armour')); Array.from(armour.querySelectorAll('.slot')).forEach((s) => g1.append(s));
        const g2 = el('div', 'grp'); g2.append(el('span', 'lbl', 'Trinkets')); Array.from(trink.querySelectorAll('.slot')).forEach((s) => g2.append(s));
        eq.append(g1, g2);
        Array.from(trink.children).filter((c) => !c.classList.contains('slot') && c.tagName !== 'B').forEach((c) => eq.append(c)); // recolour buttons
        armour.replaceWith(eq); trink.remove();
      }
      // the armour-look pickers behind a Style button
      const look = Array.from(sb.children).find((c) => /Armor look/i.test(c.textContent || '') && c.querySelector('select'));
      if (look && !look.closest('details')) { const d = el('details', 'v3style'); const s = el('summary', null, 'Armour style (helmet, armour and colour)'); d.append(s); look.replaceWith(d); d.append(look); }
    } catch (e) { /* the bag still works */ }
    return r;
  };
  // ---------------- crafting: one list, what you can make first ----------------
  const baseCraft = U.renderCraft;
  U.renderCraft = function () {
    U.craftFilter = 'all';
    const r = baseCraft.apply(this, arguments);
    try {
      const f = document.getElementById('cfilter'); if (f) Array.from(f.querySelectorAll('button.chip')).forEach((b) => b.remove());
      const list = document.getElementById('rlist'); if (!list) return r;
      const Pl = P, boxes = RW.chests ? RW.chests.nearby() : [], cnt = (id) => Pl.count(id) + (RW.chests ? RW.chests.nearCount(id, boxes) : 0);
      const near = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (o[k] = Pl.nearStation(k))) }); { const lab = f && f.querySelector('.label'); if (lab && near.v3brew && !/cauldron/.test(lab.textContent)) lab.textContent = lab.textContent.replace('Near: hands', 'Near: hands, brewing cauldron'); }
      const rows = RW.RECIPES.filter((q) => RW.ITEMS[q.out]).map((q) => { const haveAll = Object.entries(q.in).every(([id, n]) => cnt(id) >= n), station = !q.at || near[q.at]; return { q, ok: haveAll && station && !q.locked, haveAll, station }; });
      rows.sort((a, b) => (b.ok - a.ok) || ((b.haveAll ? 1 : 0) - (a.haveAll ? 1 : 0)));
      list.innerHTML = '';
      let shownSep = false;
      rows.forEach(({ q, ok, station }) => {
        if (!ok && !shownSep) { shownSep = true; list.append(el('div', 'v3sep', rows[0] && rows[0].ok ? 'Not yet' : 'Nothing you can make right now')); }
        const it = RW.ITEMS[q.out], row = el('div', 'recipe ' + (ok ? 'can' : 'no'));
        const c = el('canvas'); c.width = c.height = 16; paint(c, q.out);
        const mid = el('div'); mid.append(el('div', 'nm', it.name + (q.n > 1 ? ' ×' + q.n : '')));
        const ing = el('div', 'ing');
        Object.entries(q.in).forEach(([id, n]) => { if (!RW.ITEMS[id]) return; const have = cnt(id), ch = el('span', 'chip2 ' + (have >= n ? 'ok' : 'no')); const ic = el('canvas'); ic.width = ic.height = 16; paint(ic, id); ch.append(ic, document.createTextNode(Math.min(have, n) + '/' + n)); ch.title = RW.ITEMS[id].name; ing.append(ch); });
        mid.append(ing);
        if (q.at) mid.append(el('div', 'at', (q.at === 'forge' ? 'At a forge' : q.at === 'grow' ? 'At a growing altar' : q.at === 'v3brew' ? 'At a brewing cauldron' : 'At a knapping stone') + (station ? '' : ' (not nearby)')));
        if (q.locked) mid.append(el('div', 'lock', q.locked));
        const b = el('button', 'btn small', 'Craft'); b.type = 'button'; b.disabled = !ok; b.onclick = () => U.craft(q);
        if (U.attachTip) U.attachTip(c, () => ({ id: q.out }));
        row.append(c, mid, b); list.append(row);
      });
    } catch (e) { /* the base list stays */ }
    return r;
  };
})(window.RW);
