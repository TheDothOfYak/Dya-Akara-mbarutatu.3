// 4 Brothers World V2 — part 15: runes instead of picks, and the Ancient Rune Keeper.
// Picks are gone. How hard a block you can break depends only on your runes, and each hero's runes are their own:
//   Acorn: a harder cap to headbutt with.   Fuzzy: stronger suction (earth-and-weather magic).
//   Rock:  a stronger fist.                 Ghost: a stronger permanence (the arm stays solid inside harder things).
// The Ancient Rune Keeper stands near where you arrive in every world. Bring him materials, a monster part or two and
// some coins, and he carves your next rune. Eight runes in all:
//   1 flint (breaks stone) · 2 stone (iron ore) · 3 iron (bronze ore) · 4 bronze (platinum) · 5 platinum (stygian)
//   6 stygian · 7 soulsteel · 8 the Duat rune (each of the last three just digs faster).
// The fuzzy's runes also give him more puff jumps (a 2nd at rune 3, a 3rd at rune 5), and the Duat rune lets him
// ride a cloud. Old saves start from no runes, as asked: picks you still have are only weapons now.
(function (RW) {
  'use strict';
  const P = RW.player, E = RW.ent, U = RW.ui, A = RW.art, TS = RW.TILE;
  if (!P || !E || !U || !A) return;

  // ====================== the runes ======================
  const POWER = [1, 2, 3, 4, 5, 6, 7, 8, 10];   // mining power with 0..8 runes (same numbers the picks had)
  const COLOR = ['#fff6e0', '#5a5560', '#8a8478', '#a0a6ae', '#c8873a', '#d8e4ec', '#7a5ac8', '#5ad0e8', '#f2c94c'];
  const PARTS = ['slime_gel', 'bat_wing', 'warthog_hide', 'fish_scale', 'fish_spine', 'ectoplasm', 'crawler_shard', 'scorpion_stinger', 'kofi_hair', 'kipsu_fur', 'krabbi_shell', 'scute'];
  const RARE = ['ember_gland', 'fish_eye', 'eater_fang', 'warthog_tusk', 'living_vine', 'wraith_essence', 'lutut_tooth', 'harkal_tooth', 'hvaleia_oil', 'naga_scale', 'soul_shard', 'leviathan_scale'];
  const COST = [null,
    { coins: 15, need: { flint: 3, rubble: 6 }, part: 3, breaks: 'stone' },
    { coins: 30, need: { stone: 20, flint: 4 }, part: 5, breaks: 'iron ore and deep stone' },
    { coins: 60, need: { iron_bar: 5, stone: 15 }, part: 8, breaks: 'bronze ore and Duat stone' },
    { coins: 100, need: { bronze_bar: 6, iron_bar: 3 }, rare: 4, breaks: 'platinum ore' },
    { coins: 150, need: { platinum_bar: 6, bronze_bar: 3 }, rare: 6, breaks: 'stygian ore' },
    { coins: 220, need: { stygian_bar: 6, platinum_bar: 3 }, rare: 8, breaks: 'everything a little faster' },
    { coins: 320, need: { soulsteel_bar: 4, soul_shard: 8 }, breaks: 'everything faster again' },
    { coins: 500, need: { soulsteel_bar: 8, mirror_shard: 2, star_ember: 3 }, breaks: 'everything as fast as a legendary weapon' },
  ];
  const MAT = ['', 'Flint', 'Stone', 'Iron', 'Bronze', 'Platinum', 'Stygian', 'Soulsteel', 'Duat'];
  const HERO = {
    acorn: { what: 'cap', names: ['Bare Cap', 'Flint Cap', 'Stone Cap', 'Iron Cap', 'Bronze Cap', 'Platinum Cap', 'Stygian Cap', 'Soulsteel Cap', 'Duat Crown'],
      say: 'Your cap grows harder. You can headbutt' },
    fuzzy: { what: 'suction', names: ['Soft Breath', 'Breeze', 'Gust', 'Whirlwind', 'Squall', 'Tempest', 'Cyclone', 'Thunderhead', 'Sky Rune'],
      say: 'The wind answers you more strongly. You can suck up' },
    rock: { what: 'fist', names: ['Bare Fist', 'Flint Knuckles', 'Stone Fist', 'Iron Fist', 'Bronze Fist', 'Platinum Fist', 'Stygian Fist', 'Soulsteel Fist', 'Worldbreaker Fist'],
      say: 'Your fist grows heavier. You can punch through' },
    ghost: { what: 'permanence', names: ['Wisp', 'Mist', 'Shade', 'Firm', 'Solid', 'Dense', 'Anchored', 'Unfading', 'Eternal'],
      say: 'Your arm stays solid inside harder things. You can reach into' },
  };
  const hero = () => HERO[P.species] || HERO.rock;
  const tier = () => Math.max(0, Math.min(8, (P.flags && P.flags.rune) | 0));
  const runeName = (t) => (t > 0 ? MAT[t] + ' rune: ' : '') + hero().names[t];
  RW.v2runes = { tier, power: () => POWER[tier()], color: (t) => COLOR[t == null ? tier() : t], name: runeName,
    puffs: () => 1 + (tier() >= 3 ? 1 : 0) + (tier() >= 5 ? 1 : 0), cloud: () => tier() >= 8 };

  // mining strength comes from the runes only (anything you hold, pick or hammer, is just a weapon now)
  P.power = () => POWER[tier()];
  P.bestPower = () => POWER[tier()];
  const PICKS = ['flint_pick', 'stone_pick', 'iron_pick', 'bronze_pick', 'platinum_pick', 'stygian_pick'];
  for (let i = RW.RECIPES.length - 1; i >= 0; i--) if (PICKS.includes(RW.RECIPES[i].out)) RW.RECIPES.splice(i, 1);
  PICKS.forEach((id) => { const it = RW.ITEMS[id]; if (it) it.desc = 'An old pick. Mining strength comes from runes now (ask the Ancient Rune Keeper), so this is only a weapon.'; });
  const baseMine = P.mineTile;
  P.mineTile = function () {
    const ot = U.toast;
    U.toast = (m) => ot.call(U, typeof m === 'string' && /needs a stronger pick/.test(m) ? m.replace(/needs a stronger pick\./, 'is too hard for your ' + hero().what + '. The Ancient Rune Keeper can carve you a stronger rune.') : m);
    try { return baseMine.apply(this, arguments); } finally { U.toast = ot; }
  };

  // the guides talk about runes, not picks
  const TIPS = [
    [/Flint Pick/, 0, 'Bare paws, caps, fists and arms only break soft ground. The Ancient Rune Keeper stands where you arrive: bring him 3 flint, 6 rubble (punch gravel), 3 monster parts and 15 coins and he carves your first rune. Then you can break stone.'],
    [/Stone Pick/, 1, 'Your next rune breaks iron ore, the rusty-speckled rock. The Rune Keeper wants 20 stone, 4 flint, 5 monster parts and 30 coins for it.'],
    [/Iron Pick/, 2, 'Smelt iron bars at a forge. Five of them, with stone and monster parts, buy the third rune from the Rune Keeper, and that breaks bronze ore.'],
    [/Bronze Pick/, 3, 'Bronze bars and a few rare monster parts buy the fourth rune. Platinum lies deep, and shines even in the dark.'],
    [/Stygian ore only yields/, 4, 'Stygian ore only yields to the fifth rune. Bring the Rune Keeper platinum bars, bronze bars and rare monster parts.'],
  ];
  ['GUIDE_TIPS', 'FUZZY_TIPS', 'GHOST_TIPS', 'ACORN_TIPS', 'DUAT_TIPS'].forEach((k) => (RW[k] || []).forEach((tip) => {
    if (typeof tip.say !== 'string') return;
    const m = TIPS.find(([re]) => re.test(tip.say)); if (!m) return;
    const below = m[1]; tip.t = () => tier() <= below; tip.say = m[2];
  }));

  // ====================== the Ancient Rune Keeper ======================
  RW.register.species({ id: 'v2_runekeeper', type: 'monsters', name: 'Ancient Rune Keeper', role: 'npc', status: 'active', world: 'fuzzy', still: true,
    art: { draw: 'runekeeper' },
    blurb: 'Older than the worlds he stands in. He carves the runes that let each hero break harder things: a harder cap, stronger suction, a heavier fist, a more permanent arm.' });
  const D = A.drawers;
  if (D) {
    const { px, rect, ell } = A; const mk = A.canvas;
    const ROBE = '#2a2440', ROBE2 = '#3a3258', ROBE3 = '#1a1628', STONE = '#8a8478', STONE2 = '#5a5550', GLOW = '#7af0ff', GOLD = '#f2c94c', INK = '#0a0810';
    D.runekeeper = function () {
      const frames = [];
      for (let f = 0; f < 4; f++) {
        const c = mk(26, 38), g = c.ctx, pulse = [0.55, 0.8, 1, 0.8][f], bob = [0, -1, -1, 0][f];
        // staff with a floating rune stone
        rect(g, 21, 9, 2, 29, '#5a4030'); rect(g, 21, 9, 1, 29, '#7a5a40');
        rect(g, 19, 2 + bob, 6, 6, INK); rect(g, 20, 3 + bob, 4, 4, STONE); px(g, 20, 3 + bob, '#aaa498');
        g.globalAlpha = pulse; rect(g, 21, 4 + bob, 2, 1, GOLD); px(g, 21, 5 + bob, GOLD); g.globalAlpha = 1;
        // long robe, wide at the hem
        const rows = [[8, 10], [7, 12], [6, 14], [6, 14], [5, 15], [5, 15], [4, 16], [4, 16], [4, 17], [3, 18], [3, 18], [3, 18], [2, 19], [2, 19], [2, 19], [2, 19], [1, 20], [1, 20], [1, 20], [1, 20], [1, 20], [1, 20]];
        rows.forEach(([a, b], i) => { rect(g, a - 1, 16 + i, b - a + 2, 1, INK); rect(g, a, 16 + i, b - a, 1, i % 7 === 3 ? ROBE3 : ROBE); });
        rect(g, 1, 37, 20, 1, INK);
        for (let i = 0; i < 22; i += 2) px(g, 10, 16 + i, ROBE2); // seam
        // hood and the dark face inside it
        ell(g, 10, 12, 7, 7, INK); ell(g, 10, 12, 6, 6, ROBE2); ell(g, 10, 13, 4, 4, ROBE3); ell(g, 10, 14, 3, 3, INK);
        px(g, 10, 5, ROBE2); rect(g, 9, 6, 3, 1, ROBE2);
        g.globalAlpha = pulse; px(g, 8, 13, GLOW); px(g, 12, 13, GLOW); g.globalAlpha = 1;   // eyes
        // a stone beard of carved plates
        rect(g, 8, 16, 5, 1, STONE2); rect(g, 8, 17, 5, 2, STONE); rect(g, 9, 19, 3, 2, STONE); px(g, 10, 21, STONE2);
        // runes stitched down the robe, glowing in turn
        const glyphs = [[5, 24], [14, 26], [6, 31], [15, 32], [10, 28]];
        glyphs.forEach(([x, y], i) => { g.globalAlpha = ((i + f) % 4 === 0 ? 1 : 0.45) * pulse; const col = i % 2 ? GOLD : GLOW; px(g, x, y, col); px(g, x + 1, y, col); px(g, x, y + 1, col); px(g, x + 1, y + 2, col); });
        g.globalAlpha = 1;
        // the hand on the staff
        rect(g, 18, 20, 4, 3, INK); rect(g, 19, 21, 3, 1, STONE);
        frames.push(c);
      }
      return frames;
    };
  }
  const baseInit = E.initNpcs;
  E.initNpcs = function () {
    const r = baseInit.apply(this, arguments);
    const W = RW.world, def = W.def, sp = def && def.spawn; if (!sp || !['fuzzy', 'acorn', 'rock', 'ghost'].includes(def.id)) return r;
    const taken = (x) => E.npcs.some((n) => Math.abs(n.x / TS - x) < 2.5);
    for (const dx of [-10, 10, -12, 12, -14, 14, -16, 16, -8, 8]) {
      const x = sp.x + dx;
      for (let y = sp.y - 3; y <= sp.y + 3; y++) {
        if (W.solid(x, y) || W.solid(x, y - 1) || !W.solid(x, y + 1) || taken(x)) continue;
        E.npcs.push({ id: 'v2_runekeeper', x: x * TS - 1, y: (y + 1) * TS - 34, w: 18, h: 34, home: x * TS, face: dx > 0 ? -1 : 1, t: Math.random() * 4, vx: 0, vy: 0 });
        return r;
      }
    }
    return r;
  };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const partsHave = (list) => list.reduce((s, id) => s + P.count(id), 0);
  function canPay(c) {
    if (P.count('coin') < c.coins) return false;
    if (!Object.entries(c.need).every(([id, n]) => P.count(id) >= n)) return false;
    if (c.part && partsHave(PARTS) < c.part) return false;
    if (c.rare && partsHave(RARE) < c.rare) return false;
    return true;
  }
  function payParts(list, n) { for (const id of list) { if (n <= 0) break; const k = Math.min(n, P.count(id)); if (k) { P.remove(id, k); n -= k; } } }
  function pay(c) { P.remove('coin', c.coins); Object.entries(c.need).forEach(([id, n]) => P.remove(id, n)); if (c.part) payParts(PARTS, c.part); if (c.rare) payParts(RARE, c.rare); }
  const LINES = ['Every hero breaks the world in their own way. I only make the way stronger.', 'Bring me the stuff of the world, and a little of what lives in it.', 'Runes do not care what you hold. They care what you are.', 'Something stirs in the Duat. Strong runes will be needed.'];
  function keeper() {
    U.openModal('talk');
    const box = document.getElementById('talk');
    box.querySelector('.who').textContent = 'Ancient Rune Keeper';
    try { U.portrait(box.querySelector('canvas'), 'v2_runekeeper'); } catch (e) { /* no portrait is fine */ }
    const says = box.querySelector('.says'), acts = box.querySelector('.acts'), extra = box.querySelector('.extra');
    const show = () => {
      acts.innerHTML = ''; extra.innerHTML = '';
      const t = tier(), H = hero();
      extra.append(el('div', 'label', 'Your ' + H.what + ': ' + runeName(t) + (t ? ' (rune ' + t + ' of 8)' : ' (no runes yet)')));
      if (t >= 8) { says.textContent = 'There is nothing left I can carve for you. You are as strong as the runes go.'; }
      else {
        const c = COST[t + 1], next = t + 1;
        says.textContent = RW.pick(LINES);
        const row = el('div', 'trade');
        const bits = Object.entries(c.need).map(([id, n]) => n + ' ' + RW.ITEMS[id].name + ' (' + P.count(id) + ')');
        if (c.part) bits.push(c.part + ' monster parts, any kind (' + partsHave(PARTS) + ')');
        if (c.rare) bits.push(c.rare + ' rare monster parts (' + partsHave(RARE) + ')');
        bits.push(c.coins + ' coins (' + P.count('coin') + ')');
        row.append(el('div', null, 'Next: ' + runeName(next) + '. Breaks ' + c.breaks + '.' + (P.species === 'fuzzy' && (next === 3 || next === 5) ? ' Also one more puff jump.' : '') + (P.species === 'fuzzy' && next === 8 ? ' Also lets you ride a cloud.' : '')));
        row.append(el('div', 'label', 'He needs: ' + bits.join(', ') + '.'));
        const b = el('button', 'btn small primary', 'Carve the rune'); b.type = 'button'; b.disabled = !canPay(c);
        b.onclick = () => {
          if (!canPay(c)) return;
          pay(c); P.flags.rune = next;
          const pc = P.center(); RW.fx.burst(pc.x, pc.y - 6, [COLOR[next], '#ffffff', '#7af0ff'], 26, 90, { add: true, kind: 'glow', grav: -40 }); RW.fx.ring(pc.x, pc.y, COLOR[next], 34, 0.5, 2); RW.audio.sfx('crystal');
          U.banner(runeName(next), H.say + ' ' + c.breaks + '.' + (P.species === 'fuzzy' && (next === 3 || next === 5) ? ' And you can puff-jump once more.' : '') + (P.species === 'fuzzy' && next === 8 ? ' And when your puffs run out, press jump again to ride a cloud.' : ''));
          U.dirty(); RW.game.saveSoon(); show();
        };
        row.append(b); extra.append(row);
        // what the parts can be
        extra.append(el('div', 'label', (c.rare ? 'Rare parts: ' + RARE : 'Monster parts: ' + PARTS).toString().replace(/_/g, ' ').replace(/,/g, ', ')));
      }
      const bye = el('button', 'btn small', 'Goodbye'); bye.type = 'button'; bye.onclick = () => U.closeModal(); acts.append(bye);
    };
    show();
  }
  const baseTalk = U.talk;
  U.talk = function (npc) { if (npc && npc.id === 'v2_runekeeper') return keeper(); return baseTalk.apply(this, arguments); };

  // ====================== the acorn's harder cap ======================
  // his cap takes on the colour of the material his rune is made of (the shell keeps the colour you picked)
  const CAPS = [null, ['#4a4650', '#2e2a34'], ['#7a7470', '#5a5450'], ['#8a9098', '#606870'], ['#a8672a', '#7a4818'], ['#b8c4cc', '#8a96a0'], ['#5a3a98', '#3a2470'], ['#3aa0b8', '#22707e'], ['#d8a83a', '#a07a20']];
  // (the rune palette is only in the shell list while he's being drawn, so it never shows up in the character maker)
  const baseDrawCap = E.drawPlayer;
  E.drawPlayer = function (g, cam, p, look, opts) {
    const t = tier();
    if (p !== P || !opts || opts.species !== 'acorn' || !t || !look || !RW.SHELLS) return baseDrawCap.apply(this, arguments);
    const base = look.shell && RW.SHELLS[look.shell] ? look.shell : 'brown', key = base + '_rune' + t;
    RW.SHELLS[key] = Object.assign({}, RW.SHELLS[base], { cap: CAPS[t][0], capDark: CAPS[t][1] });
    try { return baseDrawCap.call(this, g, cam, p, Object.assign({}, look, { shell: key }), opts); } finally { delete RW.SHELLS[key]; }
  };

  // ====================== the fuzzy's cloud (Duat rune) ======================
  const CL = (P.cloud = { on: false, fuel: 5, t: 0 });
  const blocked = () => !!(U.blocking && U.blocking());
  const baseUpd = P.update;
  P.update = function (dt) {
    const I = RW.input;
    const wasLeft = P.puff ? P.puff.left : 0;
    const r = baseUpd.apply(this, arguments);
    if (P.species !== 'fuzzy' || P.dead || !RW.v2runes.cloud()) { CL.on = false; return r; }
    if (P.ground || P.water) { CL.on = false; CL.fuel = Math.min(5, CL.fuel + dt * 2.5); return r; }
    const hit = !blocked() && (I.actHit('jump') || I.actHit('up')), hold = !blocked() && (I.act('jump') || I.act('up'));
    if (!CL.on && hit && wasLeft === 0 && CL.fuel > 0.3) { CL.on = true; RW.audio.sfx('swing'); if (!P.flags.tipCloud) { P.flags.tipCloud = 1; U.toast('Cloud ride: hold jump to stay up, let go to drop. It lasts about five seconds, and refills on the ground.'); } }
    if (CL.on) {
      if (!hold || CL.fuel <= 0) CL.on = false;
      else { CL.fuel -= dt; CL.t += dt; P.vy = Math.sin(CL.t * 4) * 10 - 6; P.vx *= 1.02; }
    }
    return r;
  };
  const baseDraw = E.drawPlayer;
  E.drawPlayer = function (g, cam, p) {
    if (p === P && CL.on) {
      const x = P.x + P.w / 2 - cam.x, y = P.y + P.h + 2 - cam.y;
      g.save();
      [[-9, 1, 5], [-3, -1, 6], [4, 0, 6], [10, 2, 4], [0, 3, 5]].forEach(([dx, dy, r]) => { g.fillStyle = '#c8d4e2'; g.beginPath(); g.arc(Math.round(x + dx), Math.round(y + dy + 1), r, 0, 6.28); g.fill(); });
      [[-9, 0, 4], [-3, -2, 5], [4, -1, 5], [10, 1, 3]].forEach(([dx, dy, r]) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(Math.round(x + dx), Math.round(y + dy), r, 0, 6.28); g.fill(); });
      g.restore();
      if (Math.random() < 0.3) RW.fx.spawn({ x: P.x + P.w / 2 + RW.rand(-10, 10), y: P.y + P.h + 6, vy: 20, life: 0.4, color: '#ffffff', size: 2, kind: 'smoke' });
    }
    return baseDraw.apply(this, arguments);
  };
})(window.RW);
