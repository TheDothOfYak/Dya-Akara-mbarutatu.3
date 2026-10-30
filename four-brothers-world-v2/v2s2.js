// V2 stage 2: the fuzzy's weather magic and the acorn's growth magic (V), staffs that each shoot their own way,
// coins, Tumble the travelling trader, weapon upgrades, recipe squares and legendary chests.
(function (RW) {
  const A = RW.art, E = RW.ent, U = RW.ui, P = RW.player, TS = RW.TILE, R = RW.register;
  const { px, rect, ell, line } = A;
  const ec = E.center, overlap = E.overlap;
  const now = () => performance.now() / 1000;
  const foes = () => E.enemies.concat(E.boss ? [E.boss] : []).filter((e) => e && !e.dead && !e.dummy);
  const say = (t, s) => U.banner(t, s);

  // ====================== ITEMS ======================
  const I = A.iconExtra;
  I.coin = (g, a, b) => { ell(g, 8, 8, 5, 5, b); ell(g, 8, 8, 4, 4, a); rect(g, 7, 5, 2, 6, b); px(g, 6, 5, '#fff6c8'); px(g, 5, 7, '#fff6c8'); };
  I.keyfrag = (g, a, b) => { rect(g, 4, 6, 6, 3, a); rect(g, 9, 4, 3, 7, a); px(g, 4, 9, b); px(g, 6, 9, b); px(g, 10, 5, '#ffffff'); line(g, 12, 4, 13, 2, b); };
  I.lkey = (g, a, b) => { ell(g, 5, 5, 3, 3, a); px(g, 5, 5, '#2a1a0a'); rect(g, 7, 7, 7, 2, a); rect(g, 11, 9, 2, 3, a); rect(g, 13, 9, 1, 2, a); px(g, 4, 3, '#ffffff'); px(g, 8, 7, b); };
  I.rsquare = (g, a, b) => { rect(g, 3, 3, 10, 10, a); rect(g, 3, 3, 10, 1, '#ffffff'); rect(g, 5, 6, 6, 1, b); rect(g, 5, 8, 6, 1, b); rect(g, 5, 10, 4, 1, b); rect(g, 12, 4, 1, 9, RW.shade(a, -0.3)); };
  I.ember = (g, a, b) => { ell(g, 8, 9, 4, 5, b); ell(g, 8, 10, 3, 3, a); px(g, 8, 4, a); px(g, 7, 6, a); px(g, 8, 9, '#ffffff'); };
  I.compass = (g, a, b) => { ell(g, 8, 8, 6, 6, b); ell(g, 8, 8, 5, 5, a); line(g, 8, 8, 11, 4, '#e0525a'); line(g, 8, 8, 5, 12, '#2a2a3a'); px(g, 8, 8, '#ffffff'); };
  R.items([
    { id: 'coin', name: 'Coin', kind: 'material', stack: 99999, icon: { s: 'coin', a: '#f2c94c', b: '#a8761c' }, desc: 'Money. Monsters drop it, chests hold it, and Tumble the travelling trader takes it.' },
    { id: 'key_fragment', name: 'Key Fragment', kind: 'material', icon: { s: 'keyfrag', a: '#f2c94c', b: '#8a5a1c' }, desc: 'A broken piece of a legendary key. Three make a whole key. Rare monsters, chests and cleared hauntings give them.' },
    { id: 'legend_key', name: 'Legendary Key', kind: 'material', stack: 9, icon: { s: 'lkey', a: '#ffd36a', b: '#ff8a3a' }, desc: 'Opens one legendary chest. They glitter deep underground in every world.' },
    { id: 'recipe_square', name: 'Recipe Square', kind: 'crystal', v2use: 'square', icon: { s: 'rsquare', a: '#c8b48a', b: '#5a4632' }, desc: 'An old carved square. Right-click to read it and learn the next set of gear recipes (bronze, then platinum, stygian, soulsteel).' },
    { id: 'star_ember', name: 'Star Ember', kind: 'material', icon: { s: 'ember', a: '#ffe08a', b: '#ff7a2e' }, desc: 'A spark that never cools. Tumble the trader uses one to upgrade a weapon.' },
    { id: 'chest_compass', name: 'Chest Compass', kind: 'material', stack: 1, icon: { s: 'compass', a: '#e8e0d0', b: '#8a6a3a' }, desc: 'Hold it and the needle points to the nearest unopened legendary chest in this world.' },
  ]);
  const W = (o) => R.item(Object.assign({ kind: 'weapon', stack: 1, tier: 'legendary', power: 1, knock: 3, ranged: { kind: 'v2', spd: 300, grav: 0 } }, o));
  W({ id: 'ember_staff', name: 'Ember Staff', dmg: 38, spd: 0.55, fx: 'fire', v2style: 'lob', icon: { s: 'staff', a: '#c8783a', b: '#ff7a2e' }, desc: 'Legendary. Lobs a fireball in an arc that bursts into flame where it lands.' });
  W({ id: 'tide_staff', name: 'Tide Staff', dmg: 30, spd: 0.6, v2style: 'roll', icon: { s: 'staff', a: '#6a8ab0', b: '#4fa8f0' }, desc: 'Legendary. Sends a wave rolling along the ground that sweeps through every monster in its way.' });
  W({ id: 'wisp_staff', name: 'Wisp Staff', dmg: 22, spd: 0.6, v2style: 'wisp', icon: { s: 'staff', a: '#8a7ab0', b: '#c8a6ff' }, desc: 'Legendary. Lets out three wisps that circle you, then hunt down the nearest monsters, even through walls.' });
  const STAFFS = ['ember_staff', 'tide_staff', 'wisp_staff'];
  // the older staffs get their own way of shooting too
  if (RW.ITEMS.gnarl_staff) RW.ITEMS.gnarl_staff.v2style = 'wave';
  if (RW.ITEMS.starfur_staff) RW.ITEMS.starfur_staff.v2style = 'bounce';
  R.recipe({ out: 'legend_key', in: { key_fragment: 3 } });

  // ====================== RECIPE SQUARES: gear past iron has to be learned ======================
  const LOCK = ['bronze', 'platinum', 'stygian', 'soulsteel'];
  const NAME = { bronze: 'Bronze', platinum: 'Platinum', stygian: 'Stygian', soulsteel: 'Soulsteel' };
  const learned = (t) => !!(P.flags && P.flags['learn_' + t]);
  const nextLock = () => LOCK.find((t) => !learned(t));
  const baseRender = U.renderCraft;
  U.renderCraft = function () {
    RW.RECIPES.forEach((r) => {
      const it = RW.ITEMS[r.out]; if (!it || !LOCK.includes(it.tier)) return;
      if (!('_v2lock' in r)) r._v2lock = r.locked || null;
      r.locked = learned(it.tier) ? r._v2lock || undefined : 'Find a Recipe Square to learn ' + NAME[it.tier].toLowerCase() + ' gear.';
    });
    return baseRender.apply(this, arguments);
  };
  const baseCraft = U.craft;
  U.craft = function (r) { if (r && r.locked) { U.toast(r.locked); return; } return baseCraft.apply(this, arguments); };

  // ====================== USING THE NEW ITEMS ======================
  const baseUse = P.useItem;
  P.useItem = function (it) {
    if (it && it.v2use === 'square') {
      const t = nextLock(); const c = P.center();
      if (!t) { P.remove(it.id, 1); P.add('coin', 40); U.toast('You already know every recipe. The square crumbles into 40 coins.'); return; }
      P.flags['learn_' + t] = 1; P.remove(it.id, 1);
      RW.fx.burst(c.x, c.y - 8, ['#f2c94c', '#ffffff', '#c8b48a'], 20, 80, { add: true, kind: 'glow', grav: -30 }); RW.audio.sfx('crystal');
      say('Recipe Square', 'You can now make ' + NAME[t].toLowerCase() + ' tools, weapons and armour.');
      U.dirty(); RW.game.saveSoon(); return;
    }
    return baseUse.apply(this, arguments);
  };

  // ====================== WEAPON UPGRADES ======================
  const upg = (id) => (P.flags && P.flags.upg && P.flags.upg[id]) || 0;
  const baseMul = P.dmgMul;
  P.dmgMul = function () { const h = P.held(); return baseMul.apply(this, arguments) * (h && h.kind === 'weapon' ? 1 + 0.2 * upg(h.id) : 1); };

  // ====================== STAFFS: each shoots its own way ======================
  const S2 = (E.v2shots = []);
  const baseSwing = P.startSwing;
  P.startSwing = function () {
    const h = P.held(); const n0 = E.shots.length; const r = baseSwing.apply(this, arguments);
    if (!h || !h.v2style || E.shots.length <= n0) return r;
    const s = E.shots.pop(); // the plain shot the base game made: replace it with this staff's own
    const pc = P.center(), m = RW.mouseWorld(), a = Math.atan2(m.y - pc.y, m.x - pc.x), dmg = s.dmg, st = h.v2style;
    const base = { x: pc.x, y: pc.y - 4, t: 0, dmg, fx: h.fx, hit: new Set(), style: st };
    if (st === 'lob') { const sp = 330; S2.push(Object.assign(base, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 110, life: 3 })); RW.audio.sfx('fire'); }
    else if (st === 'roll') { const d = Math.cos(a) >= 0 ? 1 : -1; S2.push(Object.assign(base, { vx: d * 250, vy: 80, life: 1.8, dir: d })); RW.audio.sfx('splash'); }
    else if (st === 'wisp') { for (let k = 0; k < 3; k++) S2.push(Object.assign({}, base, { hit: new Set(), ang: k * 2.094, vx: 0, vy: 0, life: 3, dmg: dmg * 0.8 })); RW.audio.sfx('rift'); }
    else if (st === 'wave') { S2.push(Object.assign(base, { ax: Math.cos(a), ay: Math.sin(a), sp: 340, life: 1.4, dmg })); RW.audio.sfx('swing'); }
    else if (st === 'bounce') { S2.push(Object.assign(base, { vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, life: 2.2, bounce: 4, pierce: 3 })); RW.audio.sfx('poison'); }
    return r;
  };
  const solidPx = (x, y) => RW.world.solid(Math.floor(x / TS), Math.floor(y / TS));
  const hitFoe = (s, rad) => foes().find((e) => !s.hit.has(e) && overlap({ x: s.x - rad, y: s.y - rad, w: rad * 2, h: rad * 2 }, e.hitbox ? e.hitbox() : e));
  const burst = (x, y, r, dmg, color, fx) => {
    foes().forEach((e) => { const c = ec(e); if (RW.dist(c.x, c.y, x, y) < r) { E.damage(e, Math.round(dmg), Math.sign(c.x - x) || 1, 5, false, color); if (fx) E.applyFx(e, fx, dmg); if (fx === 'fire') e.burn = 3.5; } });
  };
  function updateV2Shots(dt) {
    for (let i = S2.length - 1; i >= 0; i--) {
      const s = S2[i]; s.t += dt; s.life -= dt; let dead = s.life <= 0;
      if (s.style === 'lob') {
        s.vy += 520 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        RW.fx.spawn({ x: s.x, y: s.y, vx: RW.rand(-20, 20), vy: RW.rand(-30, 0), life: 0.4, color: RW.pick(['#ff7a2e', '#ffb347', '#ffe08a']), add: true, kind: 'ember', size: 2 }); RW.fx.light(s.x, s.y, 1, 0.5, 0.15);
        if (solidPx(s.x, s.y) || hitFoe(s, 4)) dead = true;
        if (dead) { RW.fx.element.fire(s.x, s.y, 1.8); RW.fx.shake(3, 0.2); RW.audio.sfx('fire'); burst(s.x, s.y, 46, s.dmg, '#ffb347', 'fire'); }
      } else if (s.style === 'roll') {
        s.vy += 900 * dt; let ny = s.y + s.vy * dt;
        if (solidPx(s.x, ny + 6)) { ny = Math.floor((ny + 6) / TS) * TS - 6; s.vy = 0; s.ground = true; }
        s.y = ny; const nx = s.x + s.vx * dt;
        if (solidPx(nx + s.dir * 6, s.y)) { if (!solidPx(nx + s.dir * 6, s.y - TS)) s.y -= TS; else dead = true; } // climbs a one-block step
        s.x = nx;
        for (let k = 0; k < 2; k++) RW.fx.spawn({ x: s.x + RW.rand(-6, 6), y: s.y + RW.rand(-8, 4), vx: -s.dir * RW.rand(10, 40), vy: -RW.rand(20, 70), life: 0.4, color: RW.pick(['#4fa8f0', '#bfe4ff', '#ffffff']), add: true, kind: 'glow' });
        let e; while ((e = hitFoe(s, 9))) { s.hit.add(e); E.damage(e, Math.round(s.dmg), s.dir, 9, false, '#9ad8ff'); }
        if (dead) RW.fx.burst(s.x, s.y, ['#4fa8f0', '#ffffff'], 12, 90, { add: true, kind: 'glow' });
      } else if (s.style === 'wisp') {
        if (s.t < 0.45) { s.ang += dt * 9; const c = P.center(); s.x = c.x + Math.cos(s.ang) * 18; s.y = c.y - 4 + Math.sin(s.ang) * 18; }
        else {
          if (!s.tgt || s.tgt.dead) s.tgt = foes().filter((e) => !s.hit.has(e)).sort((a, b) => RW.dist(ec(a).x, ec(a).y, s.x, s.y) - RW.dist(ec(b).x, ec(b).y, s.x, s.y))[0];
          const t = s.tgt && RW.dist(ec(s.tgt).x, ec(s.tgt).y, s.x, s.y) < 300 ? ec(s.tgt) : null;
          if (t) { const a = Math.atan2(t.y - s.y, t.x - s.x); s.vx = RW.lerp(s.vx, Math.cos(a) * 300, dt * 6); s.vy = RW.lerp(s.vy, Math.sin(a) * 300, dt * 6); }
          else { s.vx = RW.lerp(s.vx, Math.cos(s.ang) * 160, dt * 2); s.vy = RW.lerp(s.vy, Math.sin(s.ang) * 160, dt * 2); }
          s.x += s.vx * dt; s.y += s.vy * dt;
          const e = hitFoe(s, 5); if (e) { E.damage(e, Math.round(s.dmg), Math.sign(s.vx) || 1, 2, false, '#c8a6ff'); dead = true; }
        }
        RW.fx.spawn({ x: s.x, y: s.y, life: 0.35, color: RW.pick(['#c8a6ff', '#ffffff', '#9b6cff']), add: true, kind: 'glow' }); RW.fx.light(s.x, s.y, 0.35, 0.3, 0.6);
      } else if (s.style === 'wave') {
        const w = Math.sin(s.t * 18) * 150; s.vx = s.ax * s.sp - s.ay * w; s.vy = s.ay * s.sp + s.ax * w; s.x += s.vx * dt; s.y += s.vy * dt;
        if (Math.random() < 0.6) RW.fx.spawn({ x: s.x, y: s.y, life: 0.25, color: '#8be04a', add: true, kind: 'dot' });
        if (solidPx(s.x, s.y)) dead = true;
        const e = hitFoe(s, 4);
        if (e) {
          dead = true; E.damage(e, Math.round(s.dmg), Math.sign(s.vx) || 1, 3, false, '#8be04a'); if (s.fx) E.applyFx(e, s.fx, s.dmg);
          if (!s.child) for (let k = -1; k <= 1; k++) { const a = Math.atan2(s.ay, s.ax) + k * 0.6; S2.push({ x: s.x, y: s.y, t: 0, ax: Math.cos(a), ay: Math.sin(a), sp: 300, life: 0.5, dmg: s.dmg * 0.4, fx: s.fx, hit: new Set([e]), style: 'wave', child: true }); }
        }
      } else if (s.style === 'bounce') {
        let nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
        if (solidPx(nx, ny)) {
          if (s.bounce-- <= 0) dead = true;
          else { if (solidPx(nx, s.y)) s.vx = -s.vx; if (solidPx(s.x, ny)) s.vy = -s.vy; if (!solidPx(s.x, ny) && !solidPx(nx, s.y)) { s.vx = -s.vx; s.vy = -s.vy; } nx = s.x; ny = s.y; RW.fx.burst(s.x, s.y, ['#ffe08a', '#ffffff'], 5, 60, { add: true, kind: 'spark' }); }
        }
        s.x = nx; s.y = ny;
        RW.fx.spawn({ x: s.x, y: s.y, vx: RW.rand(-15, 15), vy: RW.rand(-15, 15), life: 0.3, color: RW.pick(['#ffe08a', '#ffffff']), add: true, kind: 'glow' }); RW.fx.light(s.x, s.y, 0.7, 0.6, 0.3);
        const e = hitFoe(s, 4); if (e) { s.hit.add(e); E.damage(e, Math.round(s.dmg), Math.sign(s.vx) || 1, 3, false, '#ffe08a'); if (s.fx) E.applyFx(e, s.fx, s.dmg); if (--s.pierce <= 0) dead = true; }
      }
      if (dead) S2.splice(i, 1);
    }
  }
  function drawV2Shots(g, ox, oy, t) {
    S2.forEach((s) => {
      const x = Math.round(s.x + ox), y = Math.round(s.y + oy);
      if (s.style === 'lob') { g.fillStyle = '#ff7a2e'; g.fillRect(x - 3, y - 3, 6, 6); g.fillStyle = '#ffe08a'; g.fillRect(x - 2, y - 2, 4, 4); g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 1, 2, 2); }
      else if (s.style === 'roll') { const h = 10 + Math.round(Math.sin(t * 20) * 2); g.fillStyle = '#4fa8f0'; g.fillRect(x - 7, y + 6 - h, 14, h); g.fillStyle = '#bfe4ff'; g.fillRect(x - 7 + (s.dir > 0 ? 8 : 0), y + 6 - h, 6, 3); g.fillStyle = '#ffffff'; g.fillRect(x - 2, y + 6 - h, 4, 1); }
      else if (s.style === 'wisp') { g.fillStyle = '#c8a6ff'; g.fillRect(x - 2, y - 2, 5, 5); g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 1, 3, 3); }
      else if (s.style === 'wave') { g.fillStyle = '#6ab84a'; g.fillRect(x - 2, y - 1, 4, 3); g.fillStyle = '#d8ff9a'; g.fillRect(x, y - 1, 2, 1); }
      else if (s.style === 'bounce') { g.fillStyle = '#ffe08a'; g.fillRect(x - 2, y - 2, 5, 5); g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 1, 3, 3); g.fillRect(x, y - 3, 1, 7); g.fillRect(x - 3, y, 7, 1); }
    });
  }

  // ====================== HERO MAGIC (V): the fuzzy's storm, the acorn's brambles and sprouts ======================
  const MAGIC = { storm: { cd: 14, time: 7 }, bramble: { cd: 12, time: 9 }, sprout: { time: 8 } };
  const fields = (E.v2fields = []); // storms, bramble patches and healing sprouts on the map
  P.magicCd = 0;
  const groundBelow = (x, y) => { let ty = Math.floor(y / TS); for (let k = 0; k < 14; k++, ty++) if (RW.world.solid(Math.floor(x / TS), ty)) return ty * TS; return null; };
  const baseAbility = P.ability;
  P.ability = function () {
    if (P.dead || (P.species !== 'fuzzy' && P.species !== 'acorn')) return baseAbility.apply(this, arguments);
    if (P.magicCd > 0) { U.toast('Your magic is gathering again (' + Math.ceil(P.magicCd) + 's).'); RW.audio.sfx('deny'); return; }
    const c = P.center(), m = RW.mouseWorld(); let a = Math.atan2(m.y - c.y, m.x - c.x), d = Math.min(220, RW.dist(c.x, c.y, m.x, m.y));
    const tx = c.x + Math.cos(a) * d, ty = c.y + Math.sin(a) * d;
    const pw = P.dmgMul() * (P.magicMul ? P.magicMul() : 1);
    if (P.species === 'fuzzy') {
      fields.push({ kind: 'storm', x: tx, y: Math.min(ty, c.y) - 34, life: MAGIC.storm.time, tick: 0.5, dmg: 18 * pw });
      P.magicCd = MAGIC.storm.cd; RW.audio.sfx('lightning'); RW.fx.flash && RW.fx.flash('#bff4ff', 0.08);
      U.toast('A storm cloud gathers. Monsters under it are slowed by the rain, and lightning strikes them.');
    } else if (d < 34) {
      fields.push({ kind: 'sprout', x: c.x, y: P.y + P.h, life: MAGIC.sprout.time, tick: 0.5 });
      P.magicCd = MAGIC.bramble.cd; RW.audio.sfx('crystal'); U.toast('A healing sprout grows at your feet. Stand by it to heal.');
    } else {
      const gy = groundBelow(tx, ty); if (gy == null) { U.toast('Brambles need ground to grow on. Aim at the floor.'); RW.audio.sfx('deny'); return; }
      fields.push({ kind: 'bramble', x: tx, y: gy, life: MAGIC.bramble.time, tick: 0.3, dmg: 7 * pw, grow: 0 });
      P.magicCd = MAGIC.bramble.cd; RW.audio.sfx('break'); RW.fx.debris(tx, gy, ['#4a8a3a', '#6ab84a', '#3a5a2a'], 12);
      U.toast('Brambles burst up. Monsters caught in them are stuck and get scratched. Aim at your own feet for a healing sprout instead.');
    }
    U.dirty();
  };
  const inStorm = (f, e) => { const c = ec(e); return Math.abs(c.x - f.x) < 52 && c.y > f.y - 10 && c.y < f.y + 180; };
  const inBramble = (f, e) => overlap({ x: f.x - 42, y: f.y - 22, w: 84, h: 24 }, e);
  function updateFields(dt) {
    for (let i = fields.length - 1; i >= 0; i--) {
      const f = fields[i]; f.life -= dt; f.tick -= dt;
      if (f.kind === 'storm') {
        for (let k = 0; k < 3; k++) RW.fx.spawn({ x: f.x + RW.rand(-46, 46), y: f.y + 8, vx: -10, vy: 240, life: 0.6, color: RW.pick(['#9ad8ff', '#bfe4ff']), add: true, kind: 'dot' });
        if (f.tick <= 0) {
          f.tick = 0.75;
          const t = foes().filter((e) => inStorm(f, e)).sort(() => Math.random() - 0.5)[0];
          if (t) { const c = ec(t); RW.fx.bolt(f.x + RW.rand(-20, 20), f.y + 6, c.x, c.y); RW.fx.element.lightning(c.x, c.y, 1); E.damage(t, Math.round(f.dmg), Math.sign(c.x - f.x) || 1, 2, false, '#bff4ff'); RW.audio.sfx('lightning'); }
        }
        RW.fx.light(f.x, f.y + 20, 0.15, 0.2, 0.3);
      } else if (f.kind === 'bramble') {
        f.grow = Math.min(1, f.grow + dt * 4);
        if (f.tick <= 0) { f.tick = 0.6; foes().forEach((e) => { if (inBramble(f, e)) { E.damage(e, Math.round(f.dmg), 0, 0, false, '#8be04a'); } }); }
      } else if (f.kind === 'sprout') {
        if (f.tick <= 0) { f.tick = 0.5; if (!P.dead && RW.dist(P.x + P.w / 2, P.y + P.h, f.x, f.y) < 46 && P.hp < P.maxHp()) { P.hp = Math.min(P.maxHp(), P.hp + 3); RW.fx.text(P.x + P.w / 2, P.y - 6, '+3', '#8dff8a'); U.dirty(); } }
        if (Math.random() < dt * 8) RW.fx.spawn({ x: f.x + RW.rand(-14, 14), y: f.y - 4, vy: -30, life: 0.8, color: RW.pick(['#8dff8a', '#d8ffd0']), add: true, kind: 'glow' });
        RW.fx.light(f.x, f.y - 8, 0.2, 0.5, 0.2);
      }
      if (f.life <= 0) fields.splice(i, 1);
    }
  }
  function drawFields(g, ox, oy, t) {
    fields.forEach((f) => {
      const a = Math.min(1, f.life * 2);
      if (f.kind === 'storm') {
        g.globalAlpha = 0.85 * a;
        [[-36, 4, 14, 8], [-14, -2, 18, 11], [10, 0, 18, 10], [32, 5, 14, 8], [0, 8, 30, 8]].forEach(([dx, dy, rx, ry], k) => {
          g.fillStyle = k === 4 ? '#4a5262' : '#6a7282'; g.beginPath(); g.ellipse(Math.round(f.x + ox + dx), Math.round(f.y + oy + dy), rx, ry, 0, 0, 6.29); g.fill();
          g.fillStyle = '#8a92a2'; g.beginPath(); g.ellipse(Math.round(f.x + ox + dx - 2), Math.round(f.y + oy + dy - 3), rx * 0.6, ry * 0.5, 0, 0, 6.29); g.fill();
        });
        g.globalAlpha = 1;
      } else if (f.kind === 'bramble') {
        g.globalAlpha = a;
        for (let k = 0; k < 11; k++) {
          const bx = Math.round(f.x + ox - 40 + k * 8), h = Math.round((10 + ((k * 7) % 9)) * f.grow), by = Math.round(f.y + oy);
          g.fillStyle = '#3a5a2a'; g.fillRect(bx, by - h, 2, h); g.fillStyle = '#6ab84a'; g.fillRect(bx + 2, by - h + 3, 3, 2); g.fillRect(bx - 3, by - h + 7, 3, 2);
          g.fillStyle = '#d8c8a0'; g.fillRect(bx + 1, by - h - 1, 1, 2); g.fillRect(bx - 1, by - h + 5, 1, 1);
        }
        g.globalAlpha = 1;
      } else if (f.kind === 'sprout') {
        const x = Math.round(f.x + ox), y = Math.round(f.y + oy), sw = Math.round(Math.sin(t * 3));
        g.globalAlpha = a; g.fillStyle = '#4a8a3a'; g.fillRect(x, y - 12, 2, 12); g.fillStyle = '#8be04a'; g.fillRect(x - 5 + sw, y - 14, 5, 3); g.fillRect(x + 2 + sw, y - 11, 5, 3);
        g.fillStyle = '#ffffff'; g.fillRect(x + sw, y - 16, 2, 2); g.globalAlpha = 1;
      }
    });
  }
  // monsters in the rain move at half speed; monsters in brambles don't move at all
  const baseUpd = E.updateEnemies;
  E.updateEnemies = function (dt) {
    const before = fields.length ? foes().map((e) => [e, e.x, e.y]) : null;
    const r = baseUpd.apply(this, arguments);
    if (before) before.forEach(([e, x, y]) => {
      if (e.dead || e.isBoss || e === E.boss) return;
      if (fields.some((f) => f.kind === 'bramble' && inBramble(f, e))) { e.x = x; if (e.vy < 0) e.y = y; e.vx = 0; }
      else if (fields.some((f) => f.kind === 'storm' && inStorm(f, e))) { e.x = x + (e.x - x) * 0.45; e.y = y + (e.y - y) * (e.vy < 0 ? 0.6 : 1); e.burn = 0; }
    });
    v2s2Tick(dt);
    return r;
  };

  // ====================== MONEY: what monsters, chests and hauntings give ======================
  const give = (id, n, x, y) => { if (n > 0) E.dropItem(id, n, x, y); };
  const baseKill = E.kill;
  E.kill = function (e) {
    const first = e && !e.dead && !e.v2paid; if (first) e.v2paid = true;
    const r = baseKill.apply(this, arguments);
    if (first && !e.dummy) {
      const sp = RW.SPECIES[e.sp] || {}, c = ec(e), hp = e.maxhp || sp.hp || 20;
      if (e.isBoss || e === E.boss || sp.boss) { give('coin', RW.randi(140, 200), c.x, c.y); give('recipe_square', 1, c.x, c.y); give('key_fragment', 2, c.x, c.y); give('star_ember', 1, c.x, c.y); }
      else if (sp.elite) { give('coin', RW.randi(30, 60), c.x, c.y); give('key_fragment', 1, c.x, c.y); if (Math.random() < 0.5) give('star_ember', 1, c.x, c.y); if (Math.random() < 0.35) give('recipe_square', 1, c.x, c.y); }
      else if (sp.role === 'enemy' && Math.random() < 0.65) give('coin', Math.max(1, Math.round(hp / 30 + Math.random() * 2)), c.x, c.y);
    }
    return r;
  };
  // ordinary chests and caches hold coins, and sometimes a key fragment or a recipe square
  if (RW.LOOT) {
    if (RW.LOOT.chest) RW.LOOT.chest.push(['coin', 6, 22, 1], ['key_fragment', 1, 1, 0.3], ['recipe_square', 1, 1, 0.18]);
    if (RW.LOOT.cache) RW.LOOT.cache.push(['coin', 15, 40, 1], ['key_fragment', 1, 1, 0.4], ['star_ember', 1, 1, 0.25]);
    if (RW.LOOT.ship) RW.LOOT.ship.push(['coin', 10, 30, 1], ['key_fragment', 1, 1, 0.3]);
  }
  // clearing a haunting is worth something too
  const paidHaunts = new Set();
  function hauntRewards() {
    const H = RW.haunts && RW.world.def && RW.haunts.all[RW.world.def.id]; if (!H) return;
    for (const k in H) {
      const c = H[k], key = RW.world.def.id + ':' + k + ':' + c.clearedAt;
      if (c.clearedAt && !paidHaunts.has(key)) { paidHaunts.add(key); const pc = P.center(); give('coin', 25, pc.x, pc.y - 10); give('key_fragment', 1, pc.x, pc.y - 10); }
    }
  }

  // ====================== LEGENDARY CHESTS ======================
  if (RW.T.legendchest == null) {
    const id = RW.TILES.length;
    RW.TILES.push({ id, key: 'legendchest', name: 'Legendary Chest', solid: true, decor: 'legendchest', hard: 99, light: [0.9, 0.7, 0.25], lockedMsg: 'A legendary chest. It needs a Legendary Key (three key fragments make one).' });
    RW.T.legendchest = id;
  }
  const LC = RW.T.legendchest;
  const baseDecor = A.drawDecor;
  A.drawDecor = function (g, t, sx, sy, time, stage, x, y) {
    if (t.decor !== 'legendchest') return baseDecor.apply(this, arguments);
    g.fillStyle = '#5a3414'; g.fillRect(sx + 1, sy + 4, 14, 12); g.fillStyle = '#7a4a1e'; g.fillRect(sx + 2, sy + 5, 12, 10);
    g.fillStyle = '#f2c94c'; g.fillRect(sx + 1, sy + 4, 14, 2); g.fillRect(sx + 1, sy + 9, 14, 1); g.fillRect(sx + 3, sy + 4, 2, 12); g.fillRect(sx + 11, sy + 4, 2, 12);
    g.fillStyle = '#fff6c8'; g.fillRect(sx + 7, sy + 8, 2, 3); g.fillStyle = '#2a1a0a'; g.fillRect(sx + 7, sy + 10, 2, 1);
    const tw = Math.sin(time * 3 + x) > 0.7; if (tw) { g.fillStyle = '#ffffff'; g.fillRect(sx + 2 + ((x * 5) % 10), sy + 2, 1, 1); }
    if (Math.random() < 0.02) RW.fx.spawn({ x: x * TS + Math.random() * TS, y: y * TS + 4, vy: -20, life: 0.9, color: RW.pick(['#ffe08a', '#ffffff']), add: true, kind: 'glow' });
  };
  // two in every world, deep underground and away from where you start; the same places every time
  const placeChests = (def, gen) => {
    const Wd = gen.W, Hd = gen.H, fg = gen.fg, T = RW.T; if (!Wd || !fg) return;
    const solid = (x, y) => x < 0 || y < 0 || x >= Wd || y >= Hd || !!RW.TILES[fg[y * Wd + x]].solid;
    const at = (x, y) => fg[y * Wd + x];
    const surf = new Int16Array(Wd); for (let x = 0; x < Wd; x++) { let y = 0; while (y < Hd && !solid(x, y)) y++; surf[x] = y; }
    const sp = def.spawn || { x: Wd / 2, y: 0 };
    const pick = (depth) => {
      const out = [];
      for (let y = 4; y < Hd - 3; y++) for (let x = 4; x < Wd - 4; x++) {
        if (at(x, y) !== T.air || at(x, y - 1) !== T.air || !solid(x, y + 1) || at(x, y + 1) === T.water || at(x, y + 1) === T.lava) continue;
        if (y < surf[x] + depth || Math.abs(x - sp.x) < 45) continue;
        out.push([x, y, RW.hash2(x, y, 4242)]);
      }
      return out.sort((a, b) => a[2] - b[2]);
    };
    let c = pick(22); if (c.length < 2) c = pick(6);
    const chosen = [];
    for (const p of c) { if (chosen.every((q) => Math.abs(q[0] - p[0]) > Wd / 4)) chosen.push(p); if (chosen.length >= 2) break; }
    gen.meta = gen.meta || {}; gen.meta.legend = [];
    chosen.forEach(([x, y]) => { fg[y * Wd + x] = LC; gen.meta.legend.push({ x, y }); });
  };
  Object.values(RW.WORLDS).forEach((def) => {
    if (!def || !def.generate || def._v2chests) return; def._v2chests = true;
    const base = def.generate;
    def.generate = function () { const gen = base.apply(this, arguments); try { placeChests(def, gen); } catch (e) { console.warn('legendary chests', e); } return gen; };
  });
  const unopened = () => ((RW.world.meta && RW.world.meta.legend) || []).filter((p) => RW.world.get(p.x, p.y) === LC);
  function openChest(tx, ty) {
    if (!P.has('legend_key')) { U.toast('A legendary chest. You need a Legendary Key: make one from 3 key fragments.'); RW.audio.sfx('deny'); return; }
    P.remove('legend_key', 1); RW.world.setTile(tx, ty, RW.T.air);
    const x = tx * TS + 8, y = ty * TS + 4;
    RW.fx.burst(x, y, ['#ffe08a', '#ffffff', '#f2c94c'], 40, 140, { add: true, kind: 'glow', grav: -40 }); RW.fx.shake(4, 0.4); RW.audio.sfx('crystal');
    give('coin', RW.randi(70, 120), x, y); give('recipe_square', 1, x, y); give('star_ember', RW.randi(1, 2), x, y);
    const left = STAFFS.filter((id) => !P.has(id) && !(P.flags.gotStaff && P.flags.gotStaff[id]));
    const prize = left.length ? RW.pick(left) : null;
    if (prize) { give(prize, 1, x, y); P.flags.gotStaff = Object.assign({}, P.flags.gotStaff, { [prize]: 1 }); }
    else give('coin', 80, x, y);
    say('Legendary chest!', prize ? 'Inside: the ' + RW.ITEMS[prize].name + ', a Recipe Square, Star Embers and a pile of coins.' : 'Inside: a Recipe Square, Star Embers and a big pile of coins.');
    RW.game.saveSoon();
  }
  const baseMine = P.mineTile;
  P.mineTile = function (tx, ty) {
    if (RW.world.get(tx, ty) === LC) { if (!P._lcT || now() - P._lcT > 0.6) { P._lcT = now(); openChest(tx, ty); } P.mine = null; return; }
    return baseMine.apply(this, arguments);
  };
  const baseInteract = P.interact;
  P.interact = function () {
    const c = P.center(), tx = Math.floor(c.x / TS), ty = Math.floor(c.y / TS);
    for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) if (RW.world.get(x, y) === LC) { openChest(x, y); return; }
    return baseInteract.apply(this, arguments);
  };

  // ====================== TUMBLE, THE TRAVELLING TRADER ======================
  R.species({ id: 'v2_trader', type: 'fuzzies', name: 'Tumble the Trader', role: 'npc', status: 'active', world: 'fuzzy',
    art: { draw: 'fuzzyfolk', look: { fur: 'grey', hue: 0, tone: 0.04, fluff: 'shaggy', ears: 'none', eyes: 'happy', mouth: 'open', extra: 'none' } },
    blurb: 'A travelling fuzzy with very deep pockets. Shows up in every world, next to where you arrive.' });
  const STOCK = [
    { id: 'recipe_square', price: 60, note: 'teaches the next gear recipes' },
    { id: 'key_fragment', price: 40, note: 'three make a Legendary Key' },
    { id: 'chest_compass', price: 35, note: 'points to legendary chests', once: true },
    { id: 'star_ember', price: 50, note: 'for weapon upgrades' },
  ];
  const baseInit = E.initNpcs;
  E.initNpcs = function () {
    const r = baseInit.apply(this, arguments);
    const def = RW.world.def, sp = def && def.spawn; if (!sp) return r;
    for (const dx of [7, 9, -7, -9, 12, -12, 5, -5]) {
      const x = sp.x + dx; if (RW.world.solid(x, sp.y) || RW.world.solid(x, sp.y - 1)) continue;
      E.npcs.push({ id: 'v2_trader', x: x * TS + 2, y: (sp.y + 1) * TS - 24, w: 16, h: 24, home: x * TS, face: -1, t: Math.random() * 4, vx: 0, vy: 0 });
      break;
    }
    return r;
  };
  const baseTalk = U.talk;
  U.talk = function (npc) { if (npc && npc.id === 'v2_trader') return trader(); return baseTalk.apply(this, arguments); };
  function trader() {
    U.openModal('talk');
    const $ = (q) => document.querySelector(q);
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    $('#talk .who').textContent = 'Tumble the Trader'; U.portrait($('#talk canvas'), 'v2_trader');
    const says = $('#talk .says'), acts = $('#talk .acts'), extra = $('#talk .extra');
    const coins = () => P.count('coin');
    says.textContent = RW.pick(['Coins for treasure, treasure for coins! What can Tumble do for you?', 'I walk every world, me. Got something shiny for you.', 'Bring me coins and a Star Ember, and I\'ll make your weapon sing.']);
    const btn = (n, f, primary) => { const b = el('button', 'btn small' + (primary ? ' primary' : ''), n); b.type = 'button'; b.onclick = f; acts.append(b); return b; };
    const shop = () => {
      extra.innerHTML = ''; extra.append(el('div', 'label', 'You have ' + coins() + ' coins.'));
      STOCK.forEach((s) => {
        const it = RW.ITEMS[s.id]; const row = el('div', 'trade');
        const owned = s.once && P.has(s.id);
        row.append(el('div', null, it.name + ': ' + s.price + ' coins (' + s.note + ')' + (owned ? '. You have one.' : '')));
        const b = el('button', 'btn small', 'Buy'); b.type = 'button'; b.disabled = owned || coins() < s.price;
        b.onclick = () => { if (coins() < s.price) return; P.remove('coin', s.price); P.add(s.id, 1); RW.audio.sfx('craft'); says.textContent = 'A fine choice! Pleasure doing business.'; U.dirty(); RW.game.saveSoon(); shop(); };
        row.append(b); extra.append(row);
      });
    };
    const upgrade = () => {
      extra.innerHTML = ''; const h = P.held();
      if (!h || h.kind !== 'weapon') { says.textContent = 'Hold the weapon you want upgraded, then ask me again.'; return; }
      const lvl = upg(h.id), cost = 40 * (lvl + 1);
      if (lvl >= 3) { says.textContent = 'Your ' + h.name + ' is already +3. It can\'t take any more.'; return; }
      says.textContent = 'Your ' + h.name + (lvl ? ' (+' + lvl + ')' : '') + '? For ' + cost + ' coins and one Star Ember, I\'ll make it +' + (lvl + 1) + ': it hits 20% harder.';
      const row = el('div', 'trade'); row.append(el('div', null, 'You have ' + coins() + ' coins and ' + P.count('star_ember') + ' Star Embers.'));
      const b = el('button', 'btn small primary', 'Upgrade to +' + (lvl + 1)); b.type = 'button'; b.disabled = coins() < cost || !P.has('star_ember');
      b.onclick = () => {
        P.remove('coin', cost); P.remove('star_ember', 1); P.flags.upg = Object.assign({}, P.flags.upg, { [h.id]: lvl + 1 });
        const c = P.center(); RW.fx.burst(c.x, c.y, ['#ffe08a', '#ff7a2e', '#ffffff'], 24, 90, { add: true, kind: 'ember', grav: -30 }); RW.audio.sfx('craft');
        U.toast(h.name + ' is now +' + (lvl + 1) + '.'); U.dirty(); RW.game.saveSoon(); upgrade();
      };
      row.append(b); extra.append(row);
    };
    const rumour = () => {
      extra.innerHTML = ''; const n = unopened().length, all = ((RW.world.meta && RW.world.meta.legend) || []).length;
      says.textContent = all ? (n ? 'There are ' + all + ' legendary chests in this world, deep underground, and ' + n + (n > 1 ? ' are' : ' is') + ' still shut. A Chest Compass would point the way. They need a Legendary Key: three key fragments.' : 'You\'ve opened every legendary chest in this world. Try another world!') : 'No legendary chests here, I\'m afraid.';
    };
    acts.innerHTML = ''; extra.innerHTML = '';
    btn('Buy', shop, true); btn('Upgrade what I\'m holding', upgrade); btn('Any treasure around?', rumour); btn('Goodbye', U.closeModal);
    P.seen.v2_trader = 1;
  }

  // ====================== EVERY FRAME, AND DRAWING ======================
  let slowT = 0; const seenChest = new Set();
  function v2s2Tick(dt) {
    updateV2Shots(dt); updateFields(dt);
    if (P.magicCd > 0) P.magicCd -= dt;
    if ((slowT -= dt) > 0) return; slowT = 0.5;
    hauntRewards(); coinHud();
    if (P.magicCd > 0 && (P.species === 'fuzzy' || P.species === 'acorn')) U.dirty();
    // a legendary chest close by
    const c = P.center();
    unopened().forEach((p) => { const k = RW.world.def.id + p.x + ',' + p.y; if (!seenChest.has(k) && RW.dist(c.x, c.y, p.x * TS, p.y * TS) < 14 * TS) { seenChest.add(k); say('Something glitters nearby', 'A legendary chest! It opens with a Legendary Key.'); } });
  }
  let hud = null;
  function coinHud() {
    if (!hud) { const h = document.getElementById('hud'); if (!h) return; hud = document.createElement('div'); hud.id = 'v2coins'; hud.className = 'stone'; hud.style.cssText = 'position:absolute;right:12px;top:52px;padding:3px 8px;font:16px VT323,monospace;color:#f2c94c;pointer-events:none'; h.append(hud); }
    const h = P.held(), u = h && h.kind === 'weapon' ? upg(h.id) : 0;
    hud.textContent = '● ' + P.count('coin') + ' coins' + (u ? '   ' + h.name + ' +' + u : '');
  }
  const baseDraw = E.draw;
  E.draw = function (g, cam, time) {
    const r = baseDraw.apply(this, arguments);
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y), t = now();
    drawFields(g, ox, oy, t); drawV2Shots(g, ox, oy, t);
    // the chest compass needle
    const h = P.held();
    if (h && h.id === 'chest_compass' && !P.dead) {
      const c = P.center(), list = unopened();
      const tgt = list.sort((a, b) => RW.dist(a.x * TS, a.y * TS, c.x, c.y) - RW.dist(b.x * TS, b.y * TS, c.x, c.y))[0];
      if (tgt) {
        const a = Math.atan2(tgt.y * TS + 8 - c.y, tgt.x * TS + 8 - c.x), x = Math.round(c.x + ox + Math.cos(a) * 26), y = Math.round(c.y + oy + Math.sin(a) * 26);
        g.fillStyle = '#f2c94c'; for (let k = 0; k < 6; k++) g.fillRect(Math.round(x - Math.cos(a) * k), Math.round(y - Math.sin(a) * k), 2, 2);
        g.fillStyle = '#ffffff'; g.fillRect(x, y, 2, 2);
        g.font = '10px VT323, monospace'; g.textAlign = 'center'; g.fillStyle = '#f2c94c'; g.fillText(Math.round(RW.dist(tgt.x * TS, tgt.y * TS, c.x, c.y) / TS) + ' blocks', Math.round(c.x + ox), Math.round(P.y + oy - 34)); g.textAlign = 'left';
      }
    }
    return r;
  };

  // the chip above the hotbar: the fuzzy's and acorn's magic
  const key = () => RW.keyName((RW.binds.ability || [])[0]);
  const magicText = () => (P.species === 'fuzzy' ? (P.magicCd > 0 ? 'Storm in ' + Math.ceil(P.magicCd) + 's' : key() + ': storm cloud') : (P.magicCd > 0 ? 'Brambles in ' + Math.ceil(P.magicCd) + 's' : key() + ': brambles (aim at your feet: healing sprout)'));
  const baseChip = P.chipText;
  P.chipText = function (el) {
    if (P.species === 'fuzzy' || P.species === 'acorn') { el.textContent = magicText(); el.style.borderColor = P.species === 'fuzzy' ? '#9ad8ff' : '#8be04a'; return true; }
    return baseChip ? baseChip.apply(this, arguments) : false;
  };
  const baseExtra = P.chipExtra;
  P.chipExtra = function () {
    if (P.species === 'fuzzy' || P.species === 'acorn') return ' · ' + magicText();
    return baseExtra ? baseExtra.apply(this, arguments) : '';
  };
  // the controls list names every hero's ability
  const act = RW.ACTIONS.find((a) => a[0] === 'ability'); if (act) act[1] = 'Hero ability (ghost: invisible · rock: slam · fuzzy: storm · acorn: brambles)';
})(window.RW);
