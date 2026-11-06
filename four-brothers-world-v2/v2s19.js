// V2 stage 19: the fuzzy's weather magic, reworked into weathers that work together.
//
//   Tap V (Power on a touch screen) to call the weather you have picked, where you aim.
//   Hold V to open the weather wheel: point at a weather (or tap left/right) and let go to pick it.
//
//   Gust       a blast of wind: shoves monsters (off ledges, into water), stops their charges, blows their
//              shots away, and pushes your own clouds where you want them. Stronger with the wind at your back.
//   Rain       a rain cloud: soaks monsters (wet: slower, and fire goes out) and slowly heals heroes under it.
//   Storm      a thundercloud: lightning is weak on dry monsters, but WET monsters take 2.5x and pass it on
//              to other wet monsters nearby. Monsters kept under it get soaked by its rain after a while.
//              Careful: if you are wet and stand under your own storm, the lightning can find you too.
//   Whirlwind  (Whirlwind rune) a funnel that sucks monsters in and lifts the light ones, then drops them hard.
//              Rain or a storm over a whirlwind pours into it: everything inside gets soaked or struck at once.
//   Hail       (Squall rune) hailstones chill monsters (slow); WET monsters freeze solid. A frozen monster
//              can't move or hurt you, and your next hit shatters the ice for double damage.
//
// Every weather has its own cooldown, so the fun is in combining them (rain, then storm or hail).
// The land under a cloud feeds it: over water, rain and storms last longer; over snow, hail freezes even dry
// monsters; over hot sand, rain dries up fast but lightning hits harder. Clouds drift with the wind.
// Higher fuzzy runes make it stronger: Tempest (5) weather lasts longer, Cyclone (6) the whirlwind lifts heavy
// monsters too, Thunderhead (7) lightning jumps further and to more monsters.
(function (RW) {
  const A = RW.art, E = RW.ent, U = RW.ui, P = RW.player, TS = RW.TILE, I = RW.input;
  const ec = E.center;
  const foes = () => E.enemies.concat(E.boss ? [E.boss] : []).filter((e) => e && !e.dead && !e.dummy && !e.friendly);
  const isBoss = (e) => e.isBoss || e === E.boss || (RW.SPECIES[e.sp] || {}).boss;
  const tier = () => (RW.v2runes ? RW.v2runes.tier() : 0);
  const pw = () => P.dmgMul() * (P.magicMul ? P.magicMul() : 1) * (1 + tier() * 0.06);
  const seen = (k) => { P.seen = P.seen || {}; if (P.seen[k]) return true; P.seen[k] = 1; return false; };

  // ====================== THE WEATHERS ======================
  const WEATHERS = [
    { id: 'gust', name: 'Gust', rune: 0, cd: 3, icon: '#e8f4ff', tip: 'Shoves monsters and blows their shots away. Aim it at your own cloud to push the cloud.' },
    { id: 'rain', name: 'Rain', rune: 0, cd: 10, time: 8, icon: '#7fc0ff', tip: 'Soaks monsters (wet: slower) and heals you while you stand under it.' },
    { id: 'storm', name: 'Storm', rune: 0, cd: 12, time: 6, icon: '#ffe36a', tip: 'Lightning. Weak on dry monsters, but wet ones take 2.5x and pass it on.' },
    { id: 'whirl', name: 'Whirlwind', rune: 3, cd: 16, time: 4.5, icon: '#c8e0b8', tip: 'Sucks monsters in and lifts the light ones, then drops them hard.' },
    { id: 'hail', name: 'Hail', rune: 4, cd: 15, time: 5, icon: '#d8f0ff', tip: 'Chills monsters. Wet ones freeze solid: hit them to shatter the ice for double damage.' },
  ];
  const WBY = Object.fromEntries(WEATHERS.map((w) => [w.id, w]));
  const RUNE_NAME = { 3: 'Whirlwind', 4: 'Squall' };
  const open = (w) => tier() >= w.rune;
  const WX = (RW.v2weather = { pick: 'rain', cd: {}, held: false, hold: 0, wheel: false, hover: null, fields: [] });
  const fields = WX.fields;
  const loadPick = () => { const p = P.flags && P.flags.wxPick; if (p && WBY[p] && open(WBY[p])) WX.pick = p; };
  const savePick = () => { P.flags = P.flags || {}; P.flags.wxPick = WX.pick; };

  // what the land under a cloud is made of: water, snow, sand (hot) or plain
  function landUnder(x, y) {
    const W = RW.world, tx = Math.floor(x / TS); let ty = Math.max(0, Math.floor(y / TS));
    for (let k = 0; k < 16; k++, ty++) {
      const id = W.get(tx, ty), t = RW.TILES[id]; if (!t || !id) continue;
      if (t.liquid) return t.key === 'water' ? 'water' : t.key === 'lava' ? 'hot' : 'plain';
      if (!t.solid) continue;
      if (/snow|ice|frost/.test(t.key)) return 'snow';
      if (t.key === 'sand' || t.key === 'sandstone' || /dune|desert/.test(t.key)) return 'sand';
      return 'plain';
    }
    return 'plain';
  }
  const groundBelow = (x, y) => { let ty = Math.floor(y / TS); for (let k = 0; k < 16; k++, ty++) if (RW.world.solid(Math.floor(x / TS), ty)) return ty * TS; return null; };
  const LAND_SAY = { water: 'It drinks from the water below and lasts longer.', sand: 'The hot sand dries the rain fast, but the lightning hits harder.', snow: 'The snow below makes the hail bite: even dry monsters freeze.' };
  const under = (f, e, reach) => { const c = ec(e); return Math.abs(c.x - f.x) < (f.w || 52) && c.y > f.y - 8 && c.y < f.y + (reach || 190); };
  const heroUnder = (f) => !P.dead && Math.abs(P.x + P.w / 2 - f.x) < (f.w || 52) && P.y + P.h > f.y && P.y < f.y + 190;
  const weight = (e) => { if (isBoss(e)) return 0; const hp = e.maxhp || (RW.SPECIES[e.sp] || {}).hp || 30; return hp <= 60 ? 1 : hp <= 200 ? 0.6 : 0.3; };
  // weather damage is marked so it never shatters the ice it makes
  let weatherHit = false;
  const zap = (e, d, dir, knock, color) => { weatherHit = true; try { E.damage(e, Math.max(1, Math.round(d)), dir || 0, knock || 0, false, color); } finally { weatherHit = false; } };

  // ====================== STATUS: wet, chilled, frozen ======================
  const wet = (e, s) => { if (!e.v2wet && !isBoss(e)) RW.fx.text(ec(e).x, e.y - 4, 'wet', '#9ad8ff'); e.v2wet = Math.max(e.v2wet || 0, s); e.burn = 0; };
  const chill = (e, s) => { e.v2chill = Math.max(e.v2chill || 0, s); };
  function freeze(e, s) {
    if (isBoss(e)) { chill(e, s + 2); return; }
    if (!(e.v2frozen > 0)) { e.v2frozeHarmless = !!e.harmless; RW.fx.text(ec(e).x, e.y - 6, 'FROZEN', '#d8f6ff'); RW.audio.sfx('crystal'); }
    e.v2frozen = Math.max(e.v2frozen || 0, s); e.harmless = true; e.vx = 0; e.vy = 0; e.burn = 0;
    if (!seen('wx_frozen')) U.toast('Frozen solid! It can\'t move or hurt you. Hit it to shatter the ice for double damage.');
  }
  function thaw(e, shattered) {
    e.v2frozen = 0; e.harmless = !!e.v2frozeHarmless;
    const c = ec(e);
    RW.fx.burst(c.x, c.y, ['#ffffff', '#d8f6ff', '#9ad8ff'], shattered ? 18 : 8, shattered ? 160 : 60, { kind: 'spark', life: 0.45 });
    if (shattered) { RW.fx.text(c.x, e.y - 10, 'SHATTER', '#ffffff', true); RW.audio.sfx('break'); RW.fx.shake(2, 0.15); }
  }
  // your next hit on a frozen monster shatters it for double damage
  const baseDamage = E.damage;
  E.damage = function (e, d, dir, knock, crit, color) {
    if (e && !e.dead && e.v2frozen > 0 && !weatherHit) { d = Math.round(d * 2); thaw(e, true); }
    return baseDamage.call(this, e, d, dir, knock, crit, color);
  };

  // ====================== CASTING ======================
  function aimPoint() {
    const c = P.center(), m = RW.mouseWorld(); const a = Math.atan2(m.y - c.y, m.x - c.x), d = Math.min(220, RW.dist(c.x, c.y, m.x, m.y));
    return { c, a, d, x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d };
  }
  function cast(id) {
    const w = WBY[id]; if (!w) return;
    if (!open(w)) { U.toast(w.name + ' needs the ' + RUNE_NAME[w.rune] + ' rune from the Ancient Rune Keeper.'); RW.audio.sfx('deny'); return; }
    if ((WX.cd[id] || 0) > 0) { U.toast(w.name + ' is gathering again (' + Math.ceil(WX.cd[id]) + 's). Hold V to pick another weather.'); RW.audio.sfx('deny'); return; }
    const t = aimPoint(), long = tier() >= 5 ? 1.3 : 1, power = pw();
    if (id === 'gust') gust(t, power);
    else if (id === 'whirl') {
      const gy = groundBelow(t.x, t.y); if (gy == null) { U.toast('A whirlwind needs ground to spin on. Aim at the floor.'); RW.audio.sfx('deny'); return; }
      fields.push({ kind: 'whirl', x: t.x, y: gy, life: w.time * long, max: w.time * long, tick: 0, dmg: 12 * power, lifted: new Set(), spin: 0 });
      RW.audio.sfx('slam'); toastOnce('wx_whirl_use', 'The whirlwind sucks monsters in. Put rain or a storm over it and everything inside gets soaked or struck at once.');
    } else {
      const land = landUnder(t.x, Math.min(t.y, t.c.y) - 40);
      let life = w.time * long; if ((id === 'rain' || id === 'storm') && land === 'water') life *= 1.5; if (id === 'rain' && land === 'sand') life *= 0.6;
      fields.push({ kind: id, x: t.x, y: Math.min(t.y, t.c.y) - 40, w: 54, vx: 0, life, max: life, tick: 0.2, land, soak: new Map(), dmg: (id === 'storm' ? 10 : 3) * power, flash: 0 });
      RW.audio.sfx(id === 'storm' ? 'lightning' : 'crystal');
      if (LAND_SAY[land] && ((land === 'snow' && id === 'hail') || (land === 'sand' && id !== 'hail') || (land === 'water' && id !== 'hail'))) U.toast(w.name + ': ' + LAND_SAY[land]);
      else toastOnce('wx_' + id, w.name + ': ' + w.tip);
    }
    WX.cd[id] = w.cd; U.dirty();
  }
  const toastOnce = (k, msg) => { if (!seen(k)) U.toast(msg); };
  function gust(t, power) {
    const c = t.c, a = t.a, cos = Math.cos(a), sin = Math.sin(a), R = 150, half = 0.62;
    const wind = RW.v2wind && RW.v2wind.outdoors() ? RW.v2wind.now() : 0;
    const tail = Math.sign(wind) === Math.sign(cos) && Math.abs(cos) > 0.3 ? 1 + Math.abs(wind) * 0.6 : 1; // the wind at your back
    const inCone = (x, y) => { const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy); if (d > R || d < 1) return false; let da = Math.atan2(dy, dx) - a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; return Math.abs(da) < half; };
    let hits = 0;
    foes().forEach((e) => {
      const ce = ec(e); if (!inCone(ce.x, ce.y)) return;
      const k = weight(e) * tail; hits++;
      if (k > 0) { e.vx = cos * 430 * k; e.vy = Math.min(e.vy || 0, sin * 300 * k - 170 * k); e.v2gusted = 0.5; }
      if (e.v2frozen > 0) { e.vx = cos * 520; e.vy = -60; } // frozen monsters slide on the ice
      zap(e, 4 * power, Math.sign(cos) || 1, 0, '#e8f4ff');
    });
    // enemy shots are blown away
    if (E.shots) for (let i = E.shots.length - 1; i >= 0; i--) { const s = E.shots[i]; if (s.owner === 'e' && inCone(s.x, s.y)) { RW.fx.spawn({ x: s.x, y: s.y, life: 0.3, color: '#ffffff', add: true, kind: 'glow' }); E.shots.splice(i, 1); } }
    // your own clouds get pushed along
    fields.forEach((f) => { if (f.kind !== 'whirl' && inCone(f.x, f.y + 20)) { f.vx += cos * 90; f.pushed = 1; } });
    for (let k = 0; k < 26; k++) { const aa = a + RW.rand(-half, half), sp = RW.rand(240, 420); RW.fx.spawn({ x: c.x + Math.cos(aa) * 10, y: c.y + Math.sin(aa) * 10, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: 0.35, color: RW.pick(['#ffffff', '#e8f4ff', '#c8dcf0']), add: true, kind: 'dot' }); }
    RW.audio.sfx('swing');
    if (tail > 1.2) toastOnce('wx_tail', 'The wind is at your back: your gust blows harder.');
    else if (hits) toastOnce('wx_gust', 'Gust: shove monsters off ledges or into water. Aim it at your own clouds to push them.');
  }

  // tap V: cast; hold V: open the weather wheel
  const prevAbility = P.ability;
  P.ability = function () {
    if (P.species !== 'fuzzy' || P.dead) return prevAbility.apply(this, arguments);
    loadPick(); WX.held = true; WX.hold = 0;
  };

  // ====================== EVERY FRAME ======================
  function tickWeather(dt) {
    for (const k in WX.cd) if (WX.cd[k] > 0) WX.cd[k] -= dt;
    if (P.species === 'fuzzy') tickWheel(dt); else { WX.held = false; WX.wheel = false; }
    const all = foes();
    // statuses wear off
    all.forEach((e) => {
      if (e.v2wet > 0) { e.v2wet -= dt; if (Math.random() < dt * 6) RW.fx.spawn({ x: e.x + Math.random() * e.w, y: e.y + e.h * 0.5, vy: 40, life: 0.4, color: '#7fc0ff', add: true, kind: 'dot' }); }
      if (e.v2chill > 0) e.v2chill -= dt;
      if (e.v2gusted > 0) e.v2gusted -= dt;
      if (e.v2frozen > 0) { e.v2frozen -= dt; if (e.v2frozen <= 0) thaw(e, false); }
    });
    if (P.v2wet > 0) P.v2wet -= dt; if (P.water) P.v2wet = 3;
    for (let i = fields.length - 1; i >= 0; i--) {
      const f = fields[i]; f.life -= dt; f.tick -= dt;
      if (f.kind !== 'whirl') {
        // clouds drift with the wind, and with your gusts
        const W = RW.world, tx = Math.floor(f.x / TS), outside = W.skyTop && Math.floor(f.y / TS) < W.skyTop[tx];
        const drift = outside && RW.v2wind ? RW.v2wind.now() * 9 : 0;
        f.x += (drift + f.vx) * dt; f.vx *= Math.pow(0.35, dt);
      }
      if (f.kind === 'rain') rainTick(f, dt, all);
      else if (f.kind === 'storm') stormTick(f, dt, all);
      else if (f.kind === 'hail') hailTick(f, dt, all);
      else if (f.kind === 'whirl') whirlTick(f, dt, all);
      if (f.life <= 0) { if (f.kind === 'whirl') dropLifted(f); fields.splice(i, 1); }
    }
    // a new weather opens up with a new rune
    WEATHERS.forEach((w) => { if (w.rune > 0 && P.species === 'fuzzy' && open(w) && !seen('wx_unlock_' + w.id)) U.banner('New weather: ' + w.name, w.tip + ' Hold V to pick it.'); });
  }
  function rainTick(f, dt, all) {
    for (let k = 0; k < 4; k++) RW.fx.spawn({ x: f.x + RW.rand(-f.w, f.w), y: f.y + 8, vx: (RW.v2wind ? RW.v2wind.now() * 30 : 0), vy: 260, life: 0.65, color: RW.pick(['#9ad8ff', '#bfe4ff', '#7fc0ff']), add: true, kind: 'dot' });
    if (f.tick > 0) return; f.tick = 0.25;
    all.forEach((e) => { if (under(f, e)) wet(e, 8); });
    fields.forEach((o) => { if (o.kind === 'whirl' && Math.abs(o.x - f.x) < f.w + 30) o.wetted = 1; }); // rain pours into a whirlwind
    if (heroUnder(f)) { P.v2wet = 4; if ((f.heal = (f.heal || 0) - 0.25) <= 0 && P.hp < P.maxHp()) { f.heal = 0.5; P.hp = Math.min(P.maxHp(), P.hp + 1); RW.fx.text(P.x + P.w / 2, P.y - 6, '+1', '#8dff8a'); U.dirty(); } }
    RW.fx.light(f.x, f.y + 30, 0.1, 0.15, 0.25);
  }
  function stormTick(f, dt, all) {
    for (let k = 0; k < 2; k++) RW.fx.spawn({ x: f.x + RW.rand(-f.w, f.w), y: f.y + 8, vx: (RW.v2wind ? RW.v2wind.now() * 30 : 0), vy: 280, life: 0.6, color: RW.pick(['#9ad8ff', '#bfe4ff']), add: true, kind: 'dot' });
    f.flash = Math.max(0, f.flash - dt);
    if (f.tick > 0) return; f.tick = 0.8;
    // monsters kept under the storm get soaked by its rain after a while
    all.forEach((e) => { if (under(f, e)) { const s = (f.soak.get(e) || 0) + 0.8; f.soak.set(e, s); if (s >= 2.4) wet(e, 6); } });
    const hot = f.land === 'sand' ? 1.25 : 1, thunder = tier() >= 7;
    const strike = (e, mul) => {
      const c = ec(e); const wetNow = e.v2wet > 0 || e.v2frozen > 0;
      RW.fx.bolt(f.x + RW.rand(-18, 18), f.y + 6, c.x, c.y); RW.fx.element.lightning(c.x, c.y, wetNow ? 1.4 : 0.7);
      zap(e, f.dmg * mul * hot * (wetNow ? 2.5 : 1), Math.sign(c.x - f.x) || 1, wetNow ? 2 : 1, wetNow ? '#ffe36a' : '#bff4ff');
      return wetNow;
    };
    // a whirlwind under the storm: lightning runs down the funnel and hits everything in it
    const funnel = fields.find((o) => o.kind === 'whirl' && Math.abs(o.x - f.x) < f.w + 30);
    if (funnel) { const inside = all.filter((e) => inWhirl(funnel, e)); if (inside.length) { inside.forEach((e) => strike(e, 0.8)); f.flash = 0.15; RW.audio.sfx('lightning'); toastOnce('wx_funnel', 'Lightning runs down the whirlwind and strikes everything inside!'); return; } }
    // the hero, if wet and standing under the storm, draws the lightning sometimes
    if (heroUnder(f) && P.v2wet > 0 && Math.random() < 0.22) {
      RW.fx.bolt(f.x, f.y + 6, P.x + P.w / 2, P.y + 4); RW.fx.element.lightning(P.x + P.w / 2, P.y + 6, 0.8); P.hurt(6, 0, 'lightning'); RW.audio.sfx('lightning'); f.flash = 0.15;
      toastOnce('wx_selfzap', 'Ouch! You\'re wet, and the lightning found you. Stay out from under your own storm when you\'ve been in the rain.');
      return;
    }
    const under_ = all.filter((e) => under(f, e));
    if (!under_.length) return;
    const wets = under_.filter((e) => e.v2wet > 0 || e.v2frozen > 0);
    const first = (wets.length ? wets : under_)[Math.floor(Math.random() * (wets.length || under_.length))];
    f.flash = 0.15; RW.audio.sfx('lightning');
    if (strike(first, 1)) {
      // it jumps from wet monster to wet monster
      const range = thunder ? 140 : 84, jumps = thunder ? 5 : 3; let cur = first; const hit = new Set([first]);
      for (let j = 0; j < jumps; j++) {
        const c0 = ec(cur); const next = all.filter((e) => !hit.has(e) && (e.v2wet > 0 || e.v2frozen > 0) && RW.dist(c0.x, c0.y, ec(e).x, ec(e).y) < range).sort((p, q) => RW.dist(c0.x, c0.y, ec(p).x, ec(p).y) - RW.dist(c0.x, c0.y, ec(q).x, ec(q).y))[0];
        if (!next) break; hit.add(next); const c1 = ec(next); RW.fx.bolt(c0.x, c0.y, c1.x, c1.y); zap(next, f.dmg * 1.5 * hot, Math.sign(c1.x - c0.x) || 1, 1, '#ffe36a'); cur = next;
      }
      if (hit.size > 1) toastOnce('wx_chain', 'The lightning jumped between the wet monsters! Rain first, then storm.');
    } else toastOnce('wx_dry', 'Lightning barely hurts dry monsters. Soak them with rain first and it does 2.5x and jumps between them.');
  }
  function hailTick(f, dt, all) {
    for (let k = 0; k < 2; k++) RW.fx.spawn({ x: f.x + RW.rand(-f.w, f.w), y: f.y + 8, vx: RW.rand(-10, 10), vy: 330, life: 0.55, color: RW.pick(['#ffffff', '#e8f6ff']), size: 2, kind: 'dot' });
    if (f.tick > 0) return; f.tick = 0.5;
    const snowy = f.land === 'snow';
    all.forEach((e) => {
      if (!under(f, e)) return;
      zap(e, f.dmg, 0, 0, '#e8f6ff');
      if (e.v2wet > 0 || snowy) freeze(e, snowy && !(e.v2wet > 0) ? 2 : 3); else { chill(e, 4); toastOnce('wx_chill', 'Hail chills dry monsters. Soak them with rain first and the hail freezes them solid.'); }
    });
  }
  const inWhirl = (f, e) => { const c = ec(e); return Math.abs(c.x - f.x) < 34 && c.y > f.y - 110 && c.y < f.y + 6; };
  function whirlTick(f, dt, all) {
    f.spin += dt * 9;
    const cyclone = tier() >= 6;
    all.forEach((e) => {
      const c = ec(e), dx = f.x - c.x; if (Math.abs(dx) > 120 || c.y < f.y - 140 || c.y > f.y + 20) return;
      const k = weight(e) || (cyclone ? 0.25 : 0); if (!k) return;
      e.v2pull = { x: f.x, k: k * (cyclone ? 1.3 : 1), lift: (k >= 0.6 || cyclone) && Math.abs(dx) < 40 ? f.y - 70 : null, f };
      if (f.wetted) wet(e, 6);
    });
    if (E.shots) for (let i = E.shots.length - 1; i >= 0; i--) { const s = E.shots[i]; if (s.owner === 'e' && Math.abs(s.x - f.x) < 50 && s.y > f.y - 120 && s.y < f.y + 6) E.shots.splice(i, 1); }
    if (Math.random() < dt * 30) { const h = RW.rand(4, 100); RW.fx.spawn({ x: f.x + Math.sin(f.spin + h) * (10 + h * 0.3), y: f.y - h, vx: Math.cos(f.spin + h) * 60, vy: -40, life: 0.4, color: RW.pick(['#c8b89a', '#a89878', '#e8f4ff']), size: 2, kind: 'dot' }); }
    if (f.tick <= 0) { f.tick = 0.6; all.forEach((e) => { if (inWhirl(f, e)) { zap(e, f.dmg * 0.35, 0, 0, '#e8f4ff'); f.lifted.add(e); } }); }
  }
  function dropLifted(f) {
    f.lifted.forEach((e) => { if (!e.dead && weight(e) > 0) { e.vy = 260; e.v2slam = f.dmg; } });
    RW.audio.sfx('swing');
  }

  // monsters: frozen ones stay put, wet and chilled ones are slower, whirlwinds pull them in and lift them
  const baseUpd = E.updateEnemies;
  E.updateEnemies = function (dt) {
    const list = foes(); const before = list.map((e) => [e, e.x, e.y]);
    const r = baseUpd.apply(this, arguments);
    before.forEach(([e, x, y]) => {
      if (e.dead) return;
      if (e.v2frozen > 0) { e.x = x; e.y = y; e.vx = 0; e.vy = 0; return; }
      const boss = isBoss(e);
      let slow = 1; if (e.v2wet > 0) slow *= boss ? 0.85 : 0.7; if (e.v2chill > 0) slow *= boss ? 0.8 : 0.6;
      if (slow < 1 && !(e.v2gusted > 0)) e.x = x + (e.x - x) * slow;
      const pull = e.v2pull;
      if (pull) {
        e.v2pull = null;
        e.x += Math.sign(pull.x - (e.x + e.w / 2)) * Math.min(Math.abs(pull.x - (e.x + e.w / 2)), 110 * pull.k * dt);
        if (pull.lift != null && e.y + e.h > pull.lift) { e.y -= 95 * pull.k * dt; e.vy = Math.min(e.vy || 0, 0); }
      }
      // dropped by a whirlwind: it slams into the ground
      if (e.v2slam && (e.vy || 0) <= 0 && e.y >= y && Math.abs(e.y - y) < 0.5) { const d = e.v2slam; e.v2slam = 0; zap(e, d, 0, 0, '#c8b89a'); RW.fx.debris(e.x + e.w / 2, e.y + e.h, ['#8b847c', '#5f5953', '#c8b89a'], 8); RW.fx.shake(2, 0.12); }
    });
    return r;
  };

  // ====================== THE WEATHER WHEEL ======================
  function wheelPick(c) {
    const m = RW.mouseWorld(), dx = m.x - c.x, dy = m.y - c.y;
    if (Math.hypot(dx, dy) < 14) return null;
    let a = Math.atan2(dy, dx) + Math.PI / 2; if (a < 0) a += Math.PI * 2;
    return WEATHERS[Math.floor(((a + Math.PI / WEATHERS.length) % (Math.PI * 2)) / (Math.PI * 2 / WEATHERS.length))];
  }
  let lastMouse = null;
  function tickWheel(dt) {
    if (!WX.held) return;
    if (I.act('ability')) {
      WX.hold += dt;
      if (!WX.wheel && WX.hold > 0.28) { WX.wheel = true; WX.hover = wheelPick(P.center()) || WBY[WX.pick]; const m = RW.mouseWorld(); lastMouse = m.x + ',' + m.y; toastOnce('wx_wheel', 'Point at a weather, or tap left and right, then let go of V to pick it.'); }
      if (WX.wheel) {
        const m = RW.mouseWorld(), key = m.x + ',' + m.y;
        if (key !== lastMouse) { lastMouse = key; const h = wheelPick(P.center()); if (h) WX.hover = h; }
        const step = (I.actHit('right') ? 1 : 0) - (I.actHit('left') ? 1 : 0);
        if (step) { const i = WEATHERS.indexOf(WX.hover || WBY[WX.pick]); WX.hover = WEATHERS[(i + step + WEATHERS.length) % WEATHERS.length]; RW.audio.sfx('ui'); }
      }
      return;
    }
    // let go
    WX.held = false;
    if (WX.wheel) {
      WX.wheel = false; const h = WX.hover;
      if (h && open(h)) { if (h.id !== WX.pick) { WX.pick = h.id; savePick(); RW.audio.sfx('ui'); U.toast(h.name + ': ' + h.tip); } }
      else if (h) { U.toast(h.name + ' needs the ' + RUNE_NAME[h.rune] + ' rune from the Ancient Rune Keeper.'); RW.audio.sfx('deny'); }
      U.dirty(); return;
    }
    cast(WX.pick);
  }

  // ====================== DRAWING ======================
  const CLOUD = { rain: ['#6a7a92', '#8e9cb2', '#55647a'], storm: ['#3e4656', '#5a6474', '#2c3240'], hail: ['#aab8cc', '#d2dcea', '#8896aa'] };
  function drawCloud(g, f, ox, oy, a) {
    const [base, hi, dk] = CLOUD[f.kind]; const x0 = Math.round(f.x + ox), y0 = Math.round(f.y + oy);
    g.globalAlpha = 0.9 * a;
    const puffs = [[-38, 4, 15, 8], [-16, -3, 19, 12], [10, -1, 19, 11], [34, 4, 15, 8], [0, 8, 34, 8]];
    puffs.forEach(([dx, dy, rx, ry], k) => { g.fillStyle = k === 4 ? dk : base; g.beginPath(); g.ellipse(x0 + dx, y0 + dy, rx, ry, 0, 0, 6.29); g.fill(); });
    puffs.slice(0, 4).forEach(([dx, dy, rx, ry]) => { g.fillStyle = hi; g.beginPath(); g.ellipse(x0 + dx - 3, y0 + dy - 4, rx * 0.55, ry * 0.45, 0, 0, 6.29); g.fill(); });
    if (f.kind === 'storm' && f.flash > 0) { g.globalAlpha = a * 0.7; g.fillStyle = '#fff8c0'; g.beginPath(); g.ellipse(x0, y0 + 2, 30, 9, 0, 0, 6.29); g.fill(); }
    // a little symbol so you can tell your clouds apart
    g.globalAlpha = a; g.fillStyle = f.kind === 'storm' ? '#ffe36a' : f.kind === 'hail' ? '#ffffff' : '#bfe4ff';
    if (f.kind === 'storm') { g.fillRect(x0 - 1, y0 + 4, 3, 2); g.fillRect(x0 - 2, y0 + 6, 3, 2); g.fillRect(x0 - 3, y0 + 8, 3, 1); }
    else if (f.kind === 'hail') { g.fillRect(x0 - 3, y0 + 6, 2, 2); g.fillRect(x0 + 1, y0 + 8, 2, 2); g.fillRect(x0 + 4, y0 + 5, 2, 2); }
    else { g.fillRect(x0 - 4, y0 + 7, 1, 2); g.fillRect(x0, y0 + 8, 1, 2); g.fillRect(x0 + 4, y0 + 7, 1, 2); }
    g.globalAlpha = 1;
  }
  function drawWhirl(g, f, ox, oy, a) {
    const x0 = f.x + ox, y0 = f.y + oy;
    for (let k = 0; k < 14; k++) {
      const h = k * 8, r = 6 + k * 2.6, off = Math.sin(f.spin * 0.7 + k * 0.6) * (3 + k * 0.4);
      g.globalAlpha = a * (0.25 + 0.03 * k); g.fillStyle = k % 2 ? '#e8f4ff' : '#c8d8e0';
      g.beginPath(); g.ellipse(Math.round(x0 + off), Math.round(y0 - h), r, 2.5 + k * 0.15, 0, 0, 6.29); g.fill();
      g.globalAlpha = a * 0.8; g.fillStyle = f.wetted ? '#7fc0ff' : '#a89878';
      const s = f.spin + k * 1.7; g.fillRect(Math.round(x0 + off + Math.cos(s) * r), Math.round(y0 - h + Math.sin(s) * 2), 2, 2);
    }
    g.globalAlpha = 1;
  }
  function drawStatus(g, ox, oy, t) {
    foes().forEach((e) => {
      const x = Math.round(e.x + ox), y = Math.round(e.y + oy);
      if (e.v2frozen > 0) {
        g.globalAlpha = 0.45; g.fillStyle = '#bfe8ff'; g.fillRect(x - 2, y - 2, e.w + 4, e.h + 4);
        g.globalAlpha = 0.9; g.fillStyle = '#ffffff'; g.fillRect(x - 2, y - 2, e.w + 4, 1); g.fillRect(x - 2, y - 2, 1, e.h + 4); g.fillRect(x + 2, y + 2, 2, 1); g.fillRect(x + e.w - 3, y + e.h - 2, 3, 1);
        g.fillStyle = '#7fc0e8'; g.fillRect(x + e.w + 1, y - 2, 1, e.h + 4); g.fillRect(x - 2, y + e.h + 1, e.w + 4, 1);
        g.globalAlpha = 1;
      } else {
        if (e.v2wet > 0 && (Math.floor(t * 4) & 1)) { g.fillStyle = '#7fc0ff'; g.fillRect(x + 2, y + e.h - 2, 1, 2); g.fillRect(x + e.w - 3, y + e.h - 4, 1, 2); }
        if (e.v2chill > 0) { g.fillStyle = '#e8f6ff'; g.fillRect(x + Math.round(e.w / 2) - 1, y - 6, 3, 1); g.fillRect(x + Math.round(e.w / 2), y - 7, 1, 3); }
      }
    });
  }
  function drawWheel(g, ox, oy) {
    if (!WX.wheel) return;
    const c = P.center(), cx = Math.round(c.x + ox), cy = Math.round(c.y + oy), R = 46, n = WEATHERS.length;
    g.globalAlpha = 0.45; g.fillStyle = '#0d0b12'; g.beginPath(); g.arc(cx, cy, R + 15, 0, 6.29); g.fill(); g.globalAlpha = 1;
    WEATHERS.forEach((w, i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / n, x = Math.round(cx + Math.cos(a) * R), y = Math.round(cy + Math.sin(a) * R);
      const on = open(w), hov = WX.hover === w, cur = WX.pick === w.id;
      g.fillStyle = hov ? '#f2c94c' : cur ? '#7fe3ff' : '#3d3648'; g.fillRect(x - 12, y - 12, 24, 24);
      g.fillStyle = on ? '#1b1823' : '#121016'; g.fillRect(x - 10, y - 10, 20, 20);
      drawIcon(g, w.id, x, y, on);
      const cd = WX.cd[w.id] || 0;
      if (on && cd > 0) { g.globalAlpha = 0.6; g.fillStyle = '#000000'; g.fillRect(x - 10, y - 10, 20, Math.round(20 * Math.min(1, cd / w.cd))); g.globalAlpha = 1; }
      if (!on) { g.fillStyle = '#6a6276'; g.fillRect(x + 4, y + 4, 5, 4); g.fillRect(x + 5, y + 2, 3, 2); } // a little lock
    });
    if (WX.hover) {
      const h = WX.hover, txt = open(h) ? h.name : h.name + ': ' + RUNE_NAME[h.rune] + ' rune';
      g.font = '9px VT323, monospace'; g.textAlign = 'center'; const tw = Math.ceil(g.measureText(txt).width) + 6;
      g.globalAlpha = 0.85; g.fillStyle = '#0d0b12'; g.fillRect(cx - tw / 2, cy + R + 16, tw, 11); g.globalAlpha = 1;
      g.fillStyle = open(h) ? '#f2c94c' : '#9d94aa'; g.fillText(txt, cx, cy + R + 24);
    }
    g.textAlign = 'left';
  }
  function drawIcon(g, id, x, y, on) {
    const k = on ? 1 : 0.35; g.globalAlpha = k;
    if (id === 'gust') { g.fillStyle = '#e8f4ff'; g.fillRect(x - 7, y - 4, 10, 2); g.fillRect(x - 5, y, 12, 2); g.fillRect(x - 7, y + 4, 8, 2); g.fillRect(x + 3, y - 6, 2, 2); g.fillRect(x + 7, y - 2, 2, 2); }
    else {
      const col = id === 'storm' ? '#5a6474' : id === 'hail' ? '#d2dcea' : id === 'whirl' ? '#c8d8e0' : '#8e9cb2';
      if (id === 'whirl') { g.fillStyle = col; g.fillRect(x - 7, y - 6, 14, 2); g.fillRect(x - 5, y - 3, 10, 2); g.fillRect(x - 3, y, 7, 2); g.fillRect(x - 1, y + 3, 4, 2); g.fillRect(x, y + 6, 2, 2); }
      else {
        g.fillStyle = col; g.fillRect(x - 7, y - 4, 14, 5); g.fillRect(x - 4, y - 7, 8, 4);
        g.fillStyle = id === 'storm' ? '#ffe36a' : id === 'hail' ? '#ffffff' : '#7fc0ff';
        if (id === 'storm') { g.fillRect(x, y + 2, 2, 2); g.fillRect(x - 1, y + 4, 2, 2); g.fillRect(x - 2, y + 6, 2, 1); }
        else if (id === 'hail') { g.fillRect(x - 5, y + 3, 2, 2); g.fillRect(x, y + 5, 2, 2); g.fillRect(x + 4, y + 3, 2, 2); }
        else { g.fillRect(x - 5, y + 3, 1, 3); g.fillRect(x - 1, y + 4, 1, 3); g.fillRect(x + 3, y + 3, 1, 3); }
      }
    }
    g.globalAlpha = 1;
  }
  const baseDraw = E.draw;
  E.draw = function (g, cam, time) {
    const r = baseDraw.apply(this, arguments);
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y), t = performance.now() / 1000;
    fields.forEach((f) => { const a = Math.min(1, f.life * 2, (f.max - f.life) * 4 + 0.3); if (f.kind === 'whirl') drawWhirl(g, f, ox, oy, a); else drawCloud(g, f, ox, oy, a); });
    drawStatus(g, ox, oy, t);
    if (P.species === 'fuzzy') drawWheel(g, ox, oy);
    return r;
  };

  // the game loop: piggyback on the enemy update, which runs every frame
  const baseUpd2 = E.updateEnemies;
  E.updateEnemies = function (dt) { const r = baseUpd2.apply(this, arguments); tickWeather(dt); return r; };

  // ====================== THE CHIP ABOVE THE HOTBAR ======================
  const key = () => RW.keyName((RW.binds.ability || [])[0]);
  const chip = () => { loadPick(); const w = WBY[WX.pick], cd = WX.cd[w.id] || 0; return cd > 0 ? w.name + ' in ' + Math.ceil(cd) + 's · hold ' + key() + ' to change' : key() + ': ' + w.name + ' · hold ' + key() + ' to change'; };
  const baseChip = P.chipText;
  P.chipText = function (el) { if (P.species === 'fuzzy') { el.textContent = chip(); el.style.borderColor = '#9ad8ff'; return true; } return baseChip ? baseChip.apply(this, arguments) : false; };
  const baseExtra = P.chipExtra;
  P.chipExtra = function () { if (P.species === 'fuzzy') return ' · ' + chip(); return baseExtra ? baseExtra.apply(this, arguments) : ''; };
  const act = RW.ACTIONS.find((a) => a[0] === 'ability'); if (act) act[1] = 'Hero ability (ghost: invisible · rock: slam · fuzzy: weather, hold to pick · acorn: brambles)';
  // refresh the chip while a cooldown counts down
  setInterval(() => { if (P.species === 'fuzzy' && Object.values(WX.cd).some((v) => v > 0)) U.dirty(); }, 500);
})(window.RW);
