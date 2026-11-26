// 4 Brothers World V3 — part 13: Rock World towns.
//  * Only Rock World's own folk (Gneiss, Slagg, Wedgeworth, Cubert) live in Stalagmere, each in a home. Tumble, the rune
//    keeper and any other visitors move to the first lived-in town.
//  * Each other town is lived in or abandoned (decided by the world's seed, at least one of each when there are two or more).
//  * Lived-in towns have three villagers: a trader (coins for trinkets, tools and supplies), a job-giver (bring things,
//    get paid) and an old-timer full of advice and rumours (including which towns went quiet).
//  * Abandoned towns are dark. Zombie boulders shamble about and possessed rocks float and throw spirit orbs.
//    A haunted chest sits in the middle: it opens once every corrupted rock in that town is gone (once per hero).
//  * Making a new hero rolls a brand-new Rock World (new seed, the Leviathan alive again). Guests in a room still use the host's.
(function (RW) {
  'use strict';
  const E = RW.ent, P = RW.player, WD = RW.world, U = RW.ui, A = RW.art, R = RW.register, TS = RW.TILE;
  if (!E || !WD || !A) return;
  const def = RW.WORLDS && RW.WORLDS.rock; if (!def) return;
  const inRock = () => WD.def && WD.def.id === 'rock';
  const h32 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const addTile = (d) => { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; };
  const T_HAUNT = addTile({ key: 'hauntchest', name: 'Haunted Chest', hard: 99, decor: 'v3haunt', use: 'v3haunt', light: [0.25, 0.1, 0.4], lockedMsg: 'A haunted chest, chained shut. Press R beside it.' });
  A.decorExtra.v3haunt = function (g, t, x, y, time) {
    const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a, y + b, w, h); };
    r(1, 5, 14, 11, '#140e14'); r(2, 6, 12, 9, '#3a2a24'); r(2, 6, 12, 3, '#4e3a30'); r(2, 9, 12, 1, '#1e1418'); r(7, 8, 2, 3, '#8a7a5a');
    r(1, 7, 14, 1, '#5a4a6a'); r(4, 5, 1, 11, '#5a4a6a'); r(11, 5, 1, 11, '#5a4a6a');
    const a = 0.35 + 0.25 * Math.sin(time * 3 + x); g.fillStyle = 'rgba(170,120,255,' + a + ')'; g.fillRect(x + 7, y + 3 - Math.round(Math.sin(time * 2) * 1.5), 2, 2);
  };

  // ---------------- which towns are abandoned (same for everyone with the same world) ----------------
  const baseGen = def.generate;
  def.generate = function () {
    const out = baseGen.apply(this, arguments);
    try {
      const m = out.meta, towns = m.towns || [], W = out.W, at = (x, y) => out.fg[y * W + x];
      // you start in Stalagmere, beside the chest of old tools, with its own folk round you
      const st = m.starter; if (st) { for (const dx of [-2, -3, 2, 3, -1, 1]) { const x = st.x + dx, y = st.y; const ok = !(RW.TILES[at(x, y)] || {}).solid && !(RW.TILES[at(x, y - 1)] || {}).solid && (RW.TILES[at(x, y + 1)] || {}).solid; if (ok) { def.spawn.x = x; def.spawn.y = y; break; } } }
      towns.forEach((t) => { t.abandoned = h32(t.name + ':' + (def.store || '')) < 0.42; });
      if (towns.length >= 2) { if (towns.every((t) => t.abandoned)) towns[0].abandoned = false; if (!towns.some((t) => t.abandoned)) towns[towns.length - 1].abandoned = true; }
      towns.forEach((t) => {
        if (def.zones[t.zone]) def.zones[t.zone].name = t.name + (t.abandoned ? ' (abandoned)' : '');
        if (!t.abandoned) return;
        // the haunted chest stands on the floor in the middle of town
        const x = Math.round(t.cx); let y = Math.round(t.cy - t.ry * 0.3);
        while (y < out.H - 2 && !(RW.TILES[at(x, y + 1)] || {}).solid) y++;
        if (!(RW.TILES[at(x, y)] || {}).solid && y < t.cy + t.ry) { out.fg[y * W + x] = T_HAUNT; t.chest = { x, y }; }
      });
    } catch (e) { console.error(e); }
    return out;
  };
  // abandoned towns are dark
  const baseAmb = def.ambientAt;
  if (baseAmb) def.ambientAt = function (x, y) { const v = baseAmb.apply(this, arguments); const t = townAt(x, y); return t && t.abandoned ? Math.min(v, 0.03) : v; };
  function townAt(x, y) { const ts = WD.meta && WD.meta.towns; if (!ts) return null; for (const t of ts) { const dx = (x - t.cx) / (t.rx * 1.05), dy = (y - t.cy) / (t.ry * 1.05); if (dx * dx + dy * dy <= 1) return t; } return null; }

  // ---------------- the corrupted rocks ----------------
  const tintFrames = (look, col, alpha, frames) => {
    const src = A.rockSprites(look);
    return frames.map((i) => {
      const f = src[i][0], mkT = (s) => { const c = document.createElement('canvas'); c.width = s.width; c.height = s.height; const g = c.getContext('2d'); g.globalAlpha = alpha; g.drawImage(s, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c; };
      const c = mkT(f); if (f.__hd2) c.__hd2 = mkT(f.__hd2); return c;
    });
  };
  const ZLOOK = { rock: 'basalt', hue: 12, tone: -0.06, topper: 'moss', cracks: 'web', eyes: 'sleepy', glow: 'green', mouth: 'grin', shape: 'lumpy.long.wobble.chip.barnacles.large.none', hat: 'none', cape: 'none' };
  const GLOOK = { rock: 'marble', hue: 0, tone: 0.05, topper: 'bare', cracks: 'split', eyes: 'cyclops', glow: 'violet', mouth: 'none', shape: 'round.pebble.bounce', hat: 'none', cape: 'none' };
  const D = A.drawers || (A.drawers = {});
  D.v3zombie = () => tintFrames(ZLOOK, 'rgba(70,110,50,0.38)', 1, [1, 2, 3, 4]);
  D.v3possessed = () => tintFrames(GLOOK, 'rgba(150,100,255,0.45)', 0.82, [0, 5]);
  R.species({ id: 'v3_zboulder', type: 'monsters', name: 'Zombie Boulder', world: 'rock', role: 'enemy', status: 'active', art: { draw: 'v3zombie' }, w: 16, h: 26, hp: 260, dmg: 18, speed: 46, behavior: 'v3zombie',
    drops: [['coin', 0.8, 3, 9], ['cave_moss', 0.5, 1, 3], ['crystal_dust', 0.4, 1, 3]], blurb: 'A rock from an abandoned town that never stopped walking. Moss in its cracks, nothing behind its eyes. Slow, heavy and it lunges.' });
  R.species({ id: 'v3_possessed', type: 'monsters', name: 'Possessed Rock', world: 'rock', role: 'enemy', status: 'active', art: { draw: 'v3possessed' }, w: 16, h: 22, hp: 180, dmg: 12, speed: 60, behavior: 'v3possessed',
    drops: [['coin', 0.8, 4, 10], ['crystal_dust', 0.6, 1, 4], ['soul_shard', 0.3, 1, 2]], blurb: 'A rock with a spirit inside. It floats, flickers and throws spirit orbs, and keeps its distance.' });
  E.behaviors.v3zombie = function (e, dt, sp) {
    const pc = P.center(), c = { x: e.x + e.w / 2, y: e.y + e.h / 2 }, d = Math.hypot(pc.x - c.x, pc.y - c.y), chase = !P.dead && d < 22 * TS;
    e.vy = Math.min(520, (e.vy || 0) + 900 * dt);
    const dir = chase ? Math.sign(pc.x - c.x) || 1 : (e.wd = e.wd || 1);
    e.vx = RW.lerp(e.vx || 0, dir * sp.speed * (chase ? 1 : 0.3), dt * 3);
    if (chase && e.ground && d < 70 && (e.lt = (e.lt || 0) - dt) <= 0) { e.lt = 2.2; e.vy = -230; e.vx = dir * sp.speed * 3.2; RW.audio.sfx('slam'); }
    const x0 = e.x; E.move(e, dt, {}); if (e.ground && Math.abs(e.x - x0) < 0.05 && Math.abs(e.vx) > 5) e.vy = -280;
    if (!chase && Math.random() < dt * 0.3) e.wd = -(e.wd || 1);
    e.face = dir; e.fr = Math.floor(e.t * 5) % 4; e.harmless = !chase;
  };
  E.behaviors.v3possessed = function (e, dt, sp) {
    const pc = P.center(), c = { x: e.x + e.w / 2, y: e.y + e.h / 2 }, d = Math.hypot(pc.x - c.x, pc.y - c.y), chase = !P.dead && d < 24 * TS;
    const want = 110, a = Math.atan2(pc.y - 30 - c.y, pc.x - c.x), k = d > want + 20 ? 1 : d < want - 20 ? -0.8 : 0;
    const tvx = chase ? Math.cos(a) * sp.speed * k + Math.cos(e.t * 1.3) * 20 : Math.cos(e.t * 0.7) * 20, tvy = chase ? Math.sin(a) * sp.speed * k + Math.sin(e.t * 2.1) * 18 : Math.sin(e.t) * 10;
    e.vx = RW.lerp(e.vx || 0, tvx, dt * 2); e.vy = RW.lerp(e.vy || 0, tvy, dt * 2); E.move(e, dt, {});
    if (chase && d < 300 && (e.ot = (e.ot == null ? 1 + Math.random() * 2 : e.ot) - dt) <= 0) { e.ot = 2.6; const b = Math.atan2(pc.y - c.y, pc.x - c.x); E.shots.push({ x: c.x, y: c.y, vx: Math.cos(b) * 170, vy: Math.sin(b) * 170, life: 2.4, owner: 'e', dmg: 11, kind: 'orb', color: '#b89aff' }); RW.audio.sfx('poison'); }
    e.face = pc.x >= c.x ? 1 : -1; e.fr = Math.floor(e.t * 3) % 2; e.harmless = !chase;
    if (RW.fx.light) RW.fx.light(c.x, c.y, 0.25, 0.15, 0.4);
  };
  // spawning them, counting them, and the haunted chest
  let checkT = 0;
  const baseUpd = E.updateEnemies;
  E.updateEnemies = function (dt) {
    const r = baseUpd.apply(this, arguments);
    if (inRock() && (checkT -= dt) <= 0) { checkT = 0.5; try { haunt(); } catch (e) { console.error(e); } }
    return r;
  };
  function haunt() {
    if (P.dead || !RW.game || !RW.game.playing) return;
    const tx = (P.x + 6) / TS, ty = (P.y + 14) / TS, t = townAt(tx, ty); if (!t || !t.abandoned) return;
    const key = 'v3clear_' + t.name, alive = E.enemies.filter((e) => e.v3town === t.name && !e.dead);
    if (P.flags[key]) return;
    if (!alive.length && !t.v3spawned) {
      t.v3spawned = true;
      const n = 5 + Math.floor(h32(t.name) * 3), m = 3 + Math.floor(h32(t.name + 'g') * 2);
      for (let k = 0; k < n + m; k++) {
        const ghost = k >= n, x = Math.round(t.cx + (k / (n + m) - 0.5) * t.rx * 1.5); let y = Math.round(t.cy - t.ry * 0.4);
        while (y < t.cy + t.ry && !WD.solid(x, y + 1)) y++;
        if (WD.solid(x, y)) continue;
        const e = E.spawnEnemy(ghost ? 'v3_possessed' : 'v3_zboulder', x * TS, (ghost ? y - 3 : y) * TS - 10); e.v3town = t.name;
      }
      U.banner(t.name + ', abandoned', 'Corrupted rocks still wander here. Clear every one and the haunted chest will open.');
      return;
    }
    if (t.v3spawned && !alive.length) {
      P.flags[key] = 1; t.v3spawned = false; RW.audio.sfx('crystal');
      U.banner(t.name + ' is quiet', 'The haunting lifts. The haunted chest\'s chains fall away.'); RW.game.saveSoon();
    }
  }
  E.useHandlers.v3haunt = function (x, y) {
    const t = (WD.meta.towns || []).find((q) => q.chest && q.chest.x === x && q.chest.y === y) || townAt(x, y); if (!t) return;
    if (!P.flags['v3clear_' + t.name]) { U.toast('Chains of spirit light hold it shut. Clear every corrupted rock in ' + t.name + ' first.'); RW.audio.sfx('deny'); return; }
    const k = 'v3haunt_' + t.name; if (P.flags[k]) { U.toast('The haunted chest is empty now.'); return; }
    P.flags[k] = 1;
    const give = (id, n) => { if (RW.ITEMS[id] && n > 0) E.dropItem(id, n, x * TS + 8 + RW.rand(-6, 6), y * TS - 4); };
    give('coin', RW.randi(60, 120)); give('key_fragment', RW.randi(1, 2)); give(RW.pick(['t_anchor', 't_fin', 't_pebble', 't_eye']), 1);
    if (Math.random() < 0.5) give('glow_bright_' + RW.pick(['amber', 'cyan', 'green', 'violet', 'white', 'ember']), 1);
    if (Math.random() < 0.35) give('recipe_square', 1);
    RW.fx.burst(x * TS + 8, y * TS + 4, ['#b89aff', '#ffffff'], 24, 120, { add: true, kind: 'glow' }); RW.audio.sfx('chest');
    U.toast('The haunted chest creaks open.'); RW.game.saveSoon();
  };

  // ---------------- villagers ----------------
  const NAMES = ['Mica', 'Feldra', 'Quarry Jo', 'Old Tuffet', 'Basalda', 'Gritt', 'Shale', 'Pumicia', 'Flintwick', 'Cobb', 'Opaline', 'Sandor'];
  const ROLE = ['trader', 'jobs', 'elder'];
  const ROCKS = ['granite', 'basalt', 'sandstone', 'marble', 'slate', 'limestone', 'gneiss', 'tuff', 'jasper'];
  const tops = ['mushroom', 'moss', 'crystal', 'lichen', 'pebbles', 'bare'], bods = ['round', 'egg', 'lumpy'];
  RW.V3_TOWN_TRADES = [
    { give: { coin: 140 }, get: ['t_coil', 1], note: 'Attack a little faster.' }, { give: { coin: 140 }, get: ['t_thorn', 1], note: 'Bite back.' },
    { give: { coin: 110 }, get: ['t_feather', 1], note: 'Jump higher.' }, { give: { coin: 90 }, get: ['t_magnet', 1], note: 'Pick things up from farther.' },
    { give: { coin: 12 }, get: ['torch', 4] }, { give: { coin: 30 }, get: ['iron_bar', 2] }, { give: { coin: 20 }, get: ['glow_mushroom', 3] }, { give: { coin: 60 }, get: ['glow_dim_amber', 1] },
  ].filter((t) => RW.ITEMS[t.get[0]]);
  RW.V3_JOBS = [
    { give: { crystal_dust: 10 }, get: ['coin', 45], note: 'Job: dust for the lamps.' }, { give: { cave_moss: 8 }, get: ['coin', 30], note: 'Job: moss to stuff the beds.' },
    { give: { fish_scale: 12 }, get: ['coin', 50], note: 'Job: scales for a new roof.' }, { give: { iron_bar: 4 }, get: ['coin', 70], note: 'Job: bars for the well winch.' },
    { give: { stone: 30 }, get: ['coin', 25], note: 'Job: stone to patch the walls.' }, { give: { leviathan_scale: 1 }, get: ['coin', 160], note: 'Job: a Gemscale, for the shrine.' },
  ].filter((t) => Object.keys(t.give).every((k) => RW.ITEMS[k]));
  NAMES.forEach((nm, i) => {
    const look = { rock: ROCKS[i % ROCKS.length], hue: (i * 7) % 21 - 10, tone: ((i * 3) % 7 - 3) * 0.02, topper: tops[i % tops.length], cracks: ['bolt', 'web', 'split', 'none'][i % 4], eyes: ['round', 'narrow', 'sleepy', 'cyclops'][i % 4], glow: ['amber', 'cyan', 'green', 'violet', 'white', 'ember'][i % 6], mouth: ['none', 'line', 'grin', 'beard'][(i + 1) % 4], shape: bods[i % 3] + '.' + ['stubby', 'long', 'pebble'][(i + 1) % 3] + '.trundle', hat: i % 5 === 2 ? 'cap' : 'none', cape: 'none' };
    R.species({ id: 'v3vil_' + i, type: 'rocks', name: nm, world: 'rock', role: 'npc', status: 'active', art: { draw: 'rockfolk', look }, blurb: 'Lives in one of the towns in Rock World\'s cavern band.' });
  });
  function villagerCfg(id, role, town, quiet) {
    const rum = quiet.length ? quiet.map((q) => 'Nobody\'s heard from ' + q + ' in a long time. Something walks there at night. Something that used to be us.') : ['Every town on the band is lived in, for once. Long may it last.'];
    const tips = ['Hold Shift to run. Some of us roll, some of us bounce. Same speed in the end.', 'Glow mushrooms and two stones make a Dim Glowstone. Wear it, and the dark goes back a step.', 'The Heart Chamber is under all of us. The Leviathan sleeps there with the Elder Crystals.', 'A Gemscale and platinum at a forge make a Bright Glowstone.', 'Press T to switch between breaking one block and a 2x2 patch.', 'Trinkets: you can wear three. Not two the same.'];
    if (role === 'trader') return { lines: ['Coins for goods. Fair prices, mostly.', 'Welcome to ' + town + '.'].concat(rum.slice(0, 1)), actions: ['trade', 'chat'], trades: 'V3_TOWN_TRADES', tradeSay: '"Pleasure. Come back to ' + town + '."' };
    if (role === 'jobs') return { lines: ['Got work, if you\'ve got hands. Bring what I ask, I pay in coin.', town + ' always needs something.'], actions: ['trade', 'chat'], trades: 'V3_JOBS', tradeSay: '"That\'s the job done. Here\'s your pay."' };
    return { lines: ['I\'ve lived in ' + town + ' longer than the stalactites.'].concat(tips, rum), actions: ['chat'] };
  }
  const baseInit = E.initNpcs;
  E.initNpcs = function () {
    const r = baseInit.apply(this, arguments);
    if (!inRock()) return r;
    try {
      const m = WD.meta, orig = new Set(Object.keys(m.npcs || {})), sp = WD.def.spawn;
      // visitors stay out of Stalagmere (only its own folk live there): they go to the first lived-in town
      const lt = (m.towns || []).find((t) => !t.abandoned && t.homes && t.homes.length), g = lt ? { x: lt.homes[lt.homes.length - 1].x + 6, y: lt.homes[lt.homes.length - 1].y } : m.npcs && m.npcs.gneiss;
      // visitors move to Stalagmere
      if (sp && g) {
        let slot = 0;
        E.npcs.forEach((n) => {
          if (orig.has(n.id)) return;
          const nx = (n.x + n.w / 2) / TS, ny = n.y / TS; if (Math.hypot(nx - sp.x, ny - sp.y) > 40) return;
          for (const dx of [10, -10, 14, -14, 18, -18, 22, -22, 7, -7]) {
            const x = g.x + dx + (slot % 2 ? 1 : 0); let y = g.y - 6; while (y < g.y + 90 && !WD.solid(x, y + 1)) y++; if (WD.isWaterAt && WD.isWaterAt(x * TS + 8, y * TS + 8)) continue;
            if (WD.solid(x, y) || WD.solid(x, y - 1) || !WD.solid(x, y + 1)) continue;
            if (E.npcs.some((o) => o !== n && Math.abs(o.x - x * TS) < 20 && Math.abs(o.y - ((y + 1) * TS - n.h)) < 20)) continue;
            n.x = x * TS + 2; n.y = (y + 1) * TS - n.h; n.home = x * TS; slot++; break;
          }
        });
      }
      // villagers in the lived-in towns
      const towns = m.towns || [], quiet = towns.filter((t) => t.abandoned).map((t) => t.name);
      towns.forEach((t, ti) => {
        if (t.abandoned || !t.homes) return;
        t.homes.slice(0, 3).forEach((h, k) => {
          const id = 'v3vil_' + ((ti * 3 + k) % NAMES.length); RW.NPCS[id] = villagerCfg(id, ROLE[k % 3], t.name, quiet);
          let y = h.y; while (y < h.y + 6 && !WD.solid(h.x, y + 1)) y++;
          E.npcs.push({ id, x: h.x * TS + 2, y: (y + 1) * TS - 24, w: 16, h: 24, home: h.x * TS, face: -1, t: Math.random() * 4, vx: 0, vy: 0 });
        });
      });
    } catch (e) { console.error(e); }
    return r;
  };
  // ---------------- a new hero gets a brand-new Rock World ----------------
  const N = RW.net;
  (function hookNew() {
    const G = RW.game; if (!G || !G.newCharacter) { setTimeout(hookNew, 30); return; }
    if (G.newCharacter.__v3) return;
    const baseNew = G.newCharacter;
    G.newCharacter = function () {
      const r = baseNew.apply(this, arguments);
      const joined = N && N.transport === 'p2p' && !N.isHost; // a guest plays in the host's world
      if (!joined) {
        RW.store.set('v2_rockseed', 1 + Math.floor(Math.random() * 2147483000));
        RW.state.bosses.rock = false; try { RW.store.set(N.key('bossdead_rock'), false); } catch (e) { /* fine */ }
        RW.v3rematch = false; RW.v3reinit = true;
      }
      return r;
    };
    G.newCharacter.__v3 = true;
    const baseStart = G.start;
    G.start = async function () { if (RW.v3reinit) { RW.v3reinit = false; if (RW.world.def && RW.world.def.id === 'rock' && (P.world || P.startWorld) === 'rock') await G.enterWorld('rock'); } return baseStart.apply(this, arguments); };
  })();
  RW.v3towns = { townAt };
})(window.RW);
