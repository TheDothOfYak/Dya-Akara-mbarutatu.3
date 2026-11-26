// 4 Brothers World V2 — part 21: fights that reward thinking instead of mashing.
//  1. Back hits: a monster that is facing away from you takes 1.5x damage from your melee hits, and shakes off its
//     balance twice as fast. Most beasts turn slowly, so circling, jumping over and baiting a charge pays off.
//  2. Daze: every melee hit wears down a monster's balance (heavier weapons wear it down faster). When it breaks, the
//     monster is DAZED for a moment: it can't move or hurt you, and it takes 1.3x damage. Balance comes back if you
//     stop hitting for a moment, so steady pressure beats a burst. Bosses never stop moving, but their balance
//     breaks too: staggered, they take 1.25x damage for a moment.
//  3. Contact hits come in beats: after a monster bumps into you, that same monster can't bump you again for a
//     short while, so a crowd is dangerous but a single touch isn't a death sentence.
(function (RW) {
  'use strict';
  const E = RW.ent, U = RW.ui, P = RW.player;
  if (!E || !P) return;
  const ec = E.center;
  const isBoss = (e) => e.isBoss || e === E.boss || (RW.SPECIES[e.sp] || {}).boss;
  const LK = RW.v2lock || (RW.v2lock = {
    on(e, why) { if (!e.v2locks) { e.v2locks = {}; e.v2baseHarmless = !!e.harmless; } e.v2locks[why] = 1; e.harmless = true; },
    off(e, why) { if (!e.v2locks || !e.v2locks[why]) return; delete e.v2locks[why]; if (!Object.keys(e.v2locks).length) { e.harmless = e.v2baseHarmless; e.v2locks = null; } },
  });
  const seen = (k) => { P.seen = P.seen || {}; if (P.seen[k]) return true; P.seen[k] = 1; return false; };
  // only your own melee swings count (not shots, poison, burning, weather, your acorn buddy, or hits other players
  // send over the network, which their own game already worked out)
  let mySwing = false;
  const baseSwing = P.swingHits;
  if (baseSwing) P.swingHits = function () { mySwing = true; try { return baseSwing.apply(this, arguments); } finally { mySwing = false; } };
  const DIRECT = (color) => mySwing && (color == null || color === '#ffe36a' || color === '#ffffff');
  const poiseMax = (e) => { const hp = e.maxhp || (RW.SPECIES[e.sp] || {}).hp || 30; return isBoss(e) ? Math.max(60, hp * 0.12) : Math.max(16, hp * 0.6); };

  const baseDamage = E.damage;
  E.damage = function (e, d, dir, knock, crit, color) {
    if (!e || e.dead || !DIRECT(color) || e.harmless && !(e.v2daze > 0) && !(e.v2locks && e.v2locks.frozen)) return baseDamage.apply(this, arguments);
    const pc = P.center(), c = ec(e);
    let mul = 1, back = false;
    // 1. hit from behind
    if (e.face && Math.abs(pc.x - c.x) > 2 && Math.sign(pc.x - c.x) !== Math.sign(e.face) && !isBoss(e)) { back = true; mul *= 1.5; }
    // 2. dazed or staggered monsters take more
    if (e.v2daze > 0) mul *= isBoss(e) ? 1.25 : 1.3;
    const dd = Math.max(1, Math.round(d * mul));
    if (back) { RW.fx.text(c.x, e.y - 12, 'BACK HIT', '#ffd27a'); if (!seen('v2_back')) U.toast('Back hit! Monsters facing away from you take 1.5x damage.'); }
    // wear down its balance
    if (!(e.v2daze > 0) && !(e.v2dazeCd > 0)) {
      e.v2poise = (e.v2poise || 0) + dd * (1 + (knock || 0) * 0.08) * (back ? 2 : 1);
      e.v2poiseT = 1.4;
      if (e.v2poise >= poiseMax(e)) daze(e);
    }
    return baseDamage.call(this, e, dd, dir, knock, crit, color);
  };
  function daze(e) {
    const boss = isBoss(e); e.v2poise = 0;
    if (e.v2locks && e.v2locks.frozen) return; // the ice already holds it
    e.v2daze = boss ? 1.1 : 1.4; e.v2dazeCd = e.v2daze + 3; if (!boss) LK.on(e, 'dazed');
    const c = ec(e); RW.fx.text(c.x, e.y - 16, boss ? 'STAGGERED' : 'DAZED', '#fff0a0', true); RW.fx.shake(2, 0.12); RW.audio.sfx('slam');
    if (!seen('v2_daze')) U.toast(boss ? 'Staggered! For a moment it takes extra damage.' : 'Dazed! It can\'t move or hurt you for a moment, and takes extra damage. Keep up steady hits to daze monsters.');
  }

  // dazed monsters stay put; balance comes back when you stop hitting
  const baseUpd = E.updateEnemies;
  E.updateEnemies = function (dt) {
    const list = E.enemies.concat(E.boss ? [E.boss] : []).filter((e) => e && !e.dead);
    const before = list.map((e) => [e, e.x, e.y]);
    const r = baseUpd.apply(this, arguments);
    before.forEach(([e, x, y]) => {
      if (e.v2poiseT > 0) e.v2poiseT -= dt; else if (e.v2poise > 0) e.v2poise = Math.max(0, e.v2poise - poiseMax(e) * 0.6 * dt);
      if (e.v2daze > 0) {
        e.v2daze -= dt;
        if (!isBoss(e) && !e.dead) { e.x = x; if ((e.vy || 0) < 0) e.y = y; e.vx = 0; }
        if (e.v2daze <= 0) LK.off(e, 'dazed');
      }
      else if (e.v2locks && e.v2locks.dazed) LK.off(e, 'dazed');
      if (e.v2dazeCd > 0) e.v2dazeCd -= dt;
      if (e.v2bump > 0) e.v2bump -= dt;
    });
    return r;
  };

  // 3. a monster that just bumped you has to back off before it can bump you again
  const baseHurt = P.hurt;
  let lastBump = null;
  P.hurt = function (d, dir, src) {
    if (typeof src === 'string' && RW.SPECIES[src] && !isBoss({ sp: src })) {
      const pc = P.center();
      const who = E.enemies.filter((e) => !e.dead && e.sp === src && RW.dist(ec(e).x, ec(e).y, pc.x, pc.y) < 48).sort((a, b) => RW.dist(ec(a).x, ec(a).y, pc.x, pc.y) - RW.dist(ec(b).x, ec(b).y, pc.x, pc.y))[0];
      if (who) { if (who.v2bump > 0) return; who.v2bump = 0.9; lastBump = who; }
    }
    return baseHurt.apply(this, arguments);
  };

  // little stars over a dazed monster's head
  const baseDraw = E.draw;
  E.draw = function (g, cam) {
    const r = baseDraw.apply(this, arguments);
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y), t = performance.now() / 1000;
    E.enemies.concat(E.boss ? [E.boss] : []).forEach((e) => {
      if (!e || e.dead) return;
      if (e.v2daze > 0) for (let k = 0; k < 3; k++) { const a = t * 5 + k * 2.1, x = Math.round(e.x + ox + e.w / 2 + Math.cos(a) * (e.w / 2 + 2)), y = Math.round(e.y + oy - 5 + Math.sin(a) * 2); g.fillStyle = k % 2 ? '#fff0a0' : '#ffd23a'; g.fillRect(x, y, 2, 2); g.fillRect(x - 1, y + 1, 1, 1); }
      else if (e.v2poise > 0 && e.showBar > 0) { const w = Math.min(e.w, 24), f = Math.min(1, e.v2poise / poiseMax(e)); g.fillStyle = '#0c0a10'; g.fillRect(Math.round(e.x + ox + e.w / 2 - w / 2), Math.round(e.y + oy - 9), w, 2); g.fillStyle = '#f2c94c'; g.fillRect(Math.round(e.x + ox + e.w / 2 - w / 2), Math.round(e.y + oy - 9), Math.round(w * f), 2); }
    });
    return r;
  };
  void lastBump;
})(window.RW);
