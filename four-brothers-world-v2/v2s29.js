// 4 Brothers World V2 — part 29: sleep through the night.
//  * Sleep in a bed at night and you wake up at sunrise. The day and night clock is shared by everyone (it runs on
//    real time), so this moves only your own clock ahead. When the real sunrise comes, your clock lines up with
//    everyone else's again. Both moments are near the horizon, so the sky barely changes.
//  * Only the sky's time moves (light, night creatures, fireflies, the moon). Weather and market days stay shared.
(function (RW) {
  'use strict';
  const E = RW.ent, U = RW.ui, P = RW.player, WD = RW.world;
  if (!E || !U || !P || !WD) return;
  const DAY = 480, WAKE = 0.25;   // a day is 480 real seconds; 0.25 is sunrise
  const KEY = 'v2_sleepskip';
  // { until: real ms when the real sunrise comes, off: ms your clock is ahead }
  const load = () => { try { const s = RW.store.get(KEY, null); return s && s.until > Date.now() ? s : null; } catch (e) { return null; } };
  let skip = load();

  // ---- the sky asks for the time with your clock moved ahead ----
  let hooked = false;
  function hook() {
    const G = RW.game; if (hooked || !G || !G.sky) return; hooked = true;
    const base = G.sky;   // the game's own sky, before weather and sunsets are added on top
    G.sky = function () {
      if (skip && Date.now() >= skip.until) { skip = null; try { RW.store.set(KEY, null); } catch (e) { /* fine */ } }
      if (!skip) return base.apply(this, arguments);
      const real = Date.now, off = skip.off; Date.now = () => real() + off;
      try { return base.apply(this, arguments); } finally { Date.now = real; }
    };
  }
  // hook before the other modules wrap the sky on their first frame (this wrap runs first)
  const bHills = WD.drawHills;
  WD.drawHills = function () { hook(); return bHills.apply(this, arguments); };

  // ---- sleeping in a bed at night ----
  const isNight = () => RW.game && RW.game.skyNow && RW.game.skyNow.night;
  E.useHandlers = E.useHandlers || {};
  const bBed = E.useHandlers.bed;
  E.useHandlers.bed = function () {
    const night = isNight();
    const r = bBed ? bBed.apply(this, arguments) : undefined;
    if (!night || !hooked) return r;
    const now = Date.now(), t = ((now + (skip ? skip.off : 0)) / 1000 % DAY) / DAY;
    const ahead = ((WAKE - t + 1) % 1) * DAY * 1000;            // from your time now to sunrise
    const realT = (now / 1000 % DAY) / DAY, untilRise = ((WAKE - realT + 1) % 1) * DAY * 1000;
    skip = { off: (skip ? skip.off : 0) + ahead, until: now + untilRise };
    if (skip.off <= 0 || untilRise <= 0) skip = null;
    try { RW.store.set(KEY, skip); } catch (e) { /* fine */ }
    RW.fx.flash && RW.fx.flash('#000000', 0.9);
    RW.game.skyNow = RW.game.sky();
    setTimeout(() => { U.banner('Good morning!', 'You slept through the night.'); RW.audio.sfx('crystal'); }, 500);
    P.hp = P.maxHp();
    U.dirty && U.dirty();
    return r;
  };
})(window.RW);
