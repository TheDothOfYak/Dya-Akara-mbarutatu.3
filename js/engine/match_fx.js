/* ============================================================
   DYA'AKARA — engine/match_fx.js
   Plug-in slots for match visuals.

   Every visual improvement to the match lives in its OWN file in
   js/engine/fx/ and registers itself here. To remove one:
     1. delete its file from js/engine/fx/
     2. delete its <script> line from index.html
   Nothing else refers to it. Each one can also be switched off
   per player in Settings → Display → Match visuals.

   Render-only: plug-ins read the match, never write to it, so
   lockstep netplay, replays and tests are unaffected. A plug-in
   that throws is switched off for that renderer instead of
   breaking the match.

   Stages, in the order the renderer calls them:
     begin(ctx, R, M, env)        screen space, before anything is drawn
                                  (not wrapped in save/restore: may move the view)
     ground(ctx, R, M, env)       world space, after the terrain fill
     under(ctx, R, M, env)        world space, just before creatures
     world(ctx, R, M, env)        world space, after creatures/effects
     screen(ctx, R, M, env)       screen space, on top of everything
   env = { dset, t, dt, cw, ch, events }
   events: this frame's render-side events, derived by diffing the
   match against the previous frame:
     { type:'hit',   c, amount }   a creature lost health
     { type:'heal',  c, amount }   a creature gained health
     { type:'death', c }           a creature died this frame
     { type:'pulse', team, x, y }  a resource pulse reached a hoard
     { type:'relic', c }           a creature picked up a Relic
   ============================================================ */
(function () {
  'use strict';
  const FX = { list: [] };
  const STAGES = ['begin', 'ground', 'under', 'world', 'screen'];

  /* def: { id, name, desc, heavy (skipped on 'low' quality), begin/ground/under/world/screen } */
  FX.register = function (def) {
    if (!def || !def.id) return;
    FX.list = FX.list.filter(d => d.id !== def.id).concat([def]);
  };

  FX.enabled = function (def, dset) {
    const off = dset && dset.matchFx && dset.matchFx[def.id] === false;
    if (off) return false;
    if (def.heavy && dset && dset.quality === 'low') return false;
    return true;
  };

  /* ---- render-side event tracking (never touches the sim) ---- */
  function collectEvents(R, M) {
    const st = R._fxTrack || (R._fxTrack = { hp: new WeakMap(), dead: new WeakSet(), relic: new WeakSet(), orbT: M.time });
    const ev = [];
    for (const c of M.creatures) {
      if (c.dead) {
        if (!st.dead.has(c)) { st.dead.add(c); if (st.hp.has(c)) ev.push({ type: 'death', c }); }
        continue;
      }
      const prev = st.hp.get(c);
      if (prev != null) {
        const d = c.hp - prev;
        if (d <= -0.5) ev.push({ type: 'hit', c, amount: -d });
        else if (d >= 0.5) ev.push({ type: 'heal', c, amount: d });
      }
      st.hp.set(c, c.hp);
      if (c.carryingRelic && !st.relic.has(c)) { st.relic.add(c); ev.push({ type: 'relic', c }); }
      else if (!c.carryingRelic && st.relic.has(c)) st.relic.delete(c);
    }
    /* one pulse event per team per batch of new orbs */
    const seen = {};
    for (const o of (M.orbs || [])) {
      if (o.t0 > st.orbT && !seen[o.team]) {
        seen[o.team] = 1;
        const T = M.teams[o.team];
        if (T && T.hoard) ev.push({ type: 'pulse', team: o.team, x: T.hoard.x, y: T.hoard.y });
      }
    }
    for (const o of (M.orbs || [])) if (o.t0 > st.orbT) st.orbT = Math.max(st.orbT, o.t0);
    /* a replay/rematch that rewinds time must not freeze the tracker */
    if (M.time < st.orbT) st.orbT = M.time;
    return ev;
  }

  FX.frame = function (R, M, dset, dt, cw, ch) {
    let events = [];
    try { events = collectEvents(R, M); } catch (e) { /* tracking is optional */ }
    R._fxEnv = { dset, t: R.t, dt, cw, ch, events };
    return R._fxEnv;
  };

  FX.run = function (stage, ctx, R, M) {
    const env = R._fxEnv;
    if (!env) return;
    const broken = R._fxBroken || (R._fxBroken = {});
    for (const def of FX.list) {
      const fn = def[stage];
      if (!fn || broken[def.id] || !FX.enabled(def, env.dset)) continue;
      /* 'begin' may move the whole view (camera shake), so it is not isolated */
      const iso = stage !== 'begin';
      if (iso) ctx.save();
      try { fn(ctx, R, M, env); }
      catch (e) { broken[def.id] = true; if (window.console) console.warn('[match fx] ' + def.id + ' switched off:', e); }
      if (iso) ctx.restore();
    }
  };

  /* per-plugin scratch state on the renderer: S(R, 'id') */
  FX.state = function (R, id, init) {
    const all = R._fxState || (R._fxState = {});
    if (!all[id]) all[id] = init ? init() : {};
    return all[id];
  };

  FX.reducedMotion = (function () {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  })();

  FX.STAGES = STAGES;
  DYA.matchFx = FX;
})();
