/* ============================================================
   DYA'AKARA — core/expedition.js
   Expedition Mode (Roguelike Summoner) — run engine.

   Owns the RUN: which hero/form, which planet, how deep, the drafted
   run-deck, and the Vaelk economy. Combat itself is delegated to the
   existing match engine (mode 'expedition' — a hunt-style, relic-free,
   defeat-the-enemy battle WITH a resource economy that reads as Vaelk).

   The run is single-player and run-only: nothing here is permanent. A
   lost fight ends the run and the deck/Vaelk reset; the player's real
   Collection is never touched. The active run lives on G.me.expedition
   so it survives navigating away mid-run.

   Everything except launchNode() is pure/headless so it can be tested
   without the DOM or the match UI.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, SP = DYA.species, TK = DYA.token, ED = DYA.expeditionData;
  const E = {};

  /* ---- active run accessor ---- */
  E.active = function () { return (DYA.state && DYA.state.me && DYA.state.me.expedition) || null; };
  E.setActive = function (run) { if (DYA.state && DYA.state.me) { DYA.state.me.expedition = run || null; if (DYA.state.save) DYA.state.save(); } };

  /* ---- node bookkeeping ---- */
  E.isGuardianNode = function (run) { return run.nodeIdx >= run.nodes - 1; };
  E.nodesCleared = function (run) { return run.nodeIdx; };

  /* A deck token: minted from a species, then re-priced so its whole ready
     cost sits in the hero's single Vaelk flavor. A neutral hero still spends
     its own flavor even on an off-element creature. */
  E.makeDeckToken = function (spid, element, rng) {
    const tok = TK.mint({ speciesId: spid, rng: rng || new U.Rng(U.newSeed()) });
    const total = SP.ELEMENTS.reduce((s, e) => s + (tok.cost[e] || 0), 0) || 1;
    tok.cost = { Fti: 0, Su: 0, Eldi: 0, Ular: 0 };
    tok.cost[element] = total;
    tok.costLocked = true;
    tok.expeditionDeck = true;
    return tok;
  };

  /* ---- start a run ---- */
  E.start = function (formId, planetId, opts) {
    opts = opts || {};
    const form = ED.getForm(formId);
    const planet = ED.getPlanet(planetId);
    if (!form || !planet) return null;
    const rng = opts.rng || new U.Rng(U.newSeed());
    const D = ED.DEFAULTS;
    const hero = TK.mint({ speciesId: form.avatar, rng, rarity: opts.heroRarity != null ? opts.heroRarity : 4 });
    hero.expeditionHero = true;
    hero.name = form.name;
    hero.nameLocked = true;
    const run = {
      id: U.uid('exp'),
      formId: form.id, heroId: form.heroId, heroName: form.heroName,
      formName: form.name, planetId: planet.id, planetName: planet.name,
      element: form.element, neutral: !!form.neutral, ability: form.ability,
      avatar: form.avatar,
      nodes: opts.nodes || planet.nodes,
      nodeIdx: 0,
      deck: [],
      hero: hero,
      vaelkRegen: opts.vaelkRegen || D.vaelkRegen,
      startVaelk: opts.startVaelk != null ? opts.startVaelk : D.startVaelk,
      heroHpMul: opts.heroHpMul || D.heroHpMul,
      pulseInterval: opts.pulseInterval || D.pulseInterval,
      nodeTimeLimit: opts.nodeTimeLimit || D.nodeTimeLimit,
      terrain: opts.terrain || ({ Su: 'water', Ular: 'forest', Fti: 'plains', Eldi: 'desert' }[form.element] || 'plains'),
      cleared: false, ended: false, result: null,
      startedAt: Date.now(),
      /* the first summon: draft one before the first node */
      pendingDraft: null,
      log: [],
    };
    run.pendingDraft = { reason: 'start', options: E.draftOptions(run, rng) };
    E.setActive(run);
    return run;
  };

  /* ---- draft: 3 element-filtered creatures, keep 1 ---- */
  E.draftOptions = function (run, rng) {
    rng = rng || new U.Rng(U.newSeed());
    const form = ED.getForm(run.formId) || { element: run.element, neutral: run.neutral };
    const pool = ED.draftPool(form);
    if (!pool.length) return [];
    const picks = rng.shuffle(pool).slice(0, 3);
    return picks.map(spid => E.makeDeckToken(spid, run.element, rng));
  };

  E.applyDraft = function (run, tok) {
    if (!run || !tok) return run;
    run.deck.push(tok);
    run.pendingDraft = null;
    E.setActive(run);
    return run;
  };

  E.skipDraft = function (run) { if (run) { run.pendingDraft = null; E.setActive(run); } return run; };

  /* ---- the enemy side for the current node (pure) ----
     Ordinary nodes pull from the planet's themed pool, scaling rarity and
     count by depth. The final node is the Guardian: a high-rarity boss that
     summons minions each pulse (the Big Momma Kofi pattern, scaled up). */
  E.buildNode = function (run, rng) {
    /* deterministic per (run, node) so the map preview matches the fight */
    rng = rng || new U.Rng(U.hashStr(run.id + ':node:' + run.nodeIdx));
    const planet = ED.getPlanet(run.planetId);
    const guardianIdx = run.nodes - 1;
    if (run.nodeIdx >= guardianIdx) {
      const g = planet.guardian;
      return {
        guardian: true, hadBoss: true, name: g.name, blurb: g.blurb,
        enemies: [{ speciesId: g.species, rarity: g.rarity, name: g.name, boss: true, guardian: g.summon }],
      };
    }
    const depth = run.nodeIdx;                                  // 0-based
    const span = Math.max(1, guardianIdx);                      // nodes before the guardian
    const count = 1 + Math.min(2, Math.floor(depth * 2 / span)); // 1 → 3 as the gauntlet deepens
    const enemies = [];
    for (let i = 0; i < count; i++) {
      const spid = rng.pick(planet.enemyPool);
      const sp = SP.get(spid);
      const lo = sp.rarity[0], hi = sp.rarity[1];
      const r = U.clamp(Math.round(lo + (hi - lo) * (depth / span)), lo, hi);
      enemies.push({ speciesId: spid, rarity: r });
    }
    return { guardian: false, hadBoss: false, name: planet.name + ' — encounter ' + (depth + 1), enemies };
  };

  /* ---- resolve a node outcome (pure, headless-testable) ----
     Returns an event describing what the run should do next. The UI layer
     drives the actual screens off this. */
  E.resolveNode = function (run, iWon, rng) {
    if (!run) return { type: 'none' };
    if (!iWon) {
      run.ended = true; run.result = 'lost';
      E.setActive(run);
      return { type: 'lost' };
    }
    if (E.isGuardianNode(run)) {
      run.cleared = true; run.ended = true; run.result = 'cleared';
      E.setActive(run);
      return { type: 'cleared' };
    }
    run.nodeIdx++;
    run.pendingDraft = { reason: 'node', options: E.draftOptions(run, rng) };
    E.setActive(run);
    return { type: 'draft', nodeIdx: run.nodeIdx };
  };

  E.end = function () { if (DYA.state && DYA.state.me) { DYA.state.me.expedition = null; if (DYA.state.save) DYA.state.save(); } };

  /* ---- Vaelk display helpers ---- */
  E.vaelk = function (run) { return ED.vaelkOf(run.element); };

  /* ============================================================
     launchNode — the ONE non-headless entry point. Mints a fresh
     match pouch from the run-deck, spawns the hero, and starts an
     'expedition' match through the standard match pipeline.
     ============================================================ */
  E.launchNode = function (run, cbs) {
    cbs = cbs || {};
    const P = DYA.play;
    if (!P || !P.startMatch) return;
    const node = E.buildNode(run);
    /* fresh copies so a node can be replayed / a token summoned repeatedly */
    const pouch = run.deck.map(t => {
      const c = U.deepCopy(t); c.id = U.uid('tok'); c.costLocked = true; return c;
    });
    const hero = U.deepCopy(run.hero); hero.id = U.uid('tok');
    /* resolve the node exactly once, whichever end-of-match button is used */
    let settled = false;
    const settle = (res, iWon) => {
      if (settled) return; settled = true;
      const ev = E.resolveNode(run, !!iWon);
      if (cbs.onFinish) cbs.onFinish(ev, res, iWon);
    };
    P.startMatch({
      mode: 'expedition', skipSetup: true, noRecord: true, noXp: true,
      format: 'Expedition — ' + run.planetName + (node.guardian ? ' · Guardian' : ' · Node ' + (run.nodeIdx + 1)),
      terrain: run.terrain,
      pouch,
      opponent: { name: node.name },
      hunt: { enemies: node.enemies },
      expedition: {
        element: run.element,
        hero: hero,
        startPool: run.startVaelk,
        heroHpMul: run.heroHpMul,
        timeLimit: run.nodeTimeLimit,
      },
      settings: { pulseInterval: run.pulseInterval, pulseAmount: run.vaelkRegen, chaos: false },
      onFinish: function (res, iWon, draw) { settle(res, iWon && !draw); },
      /* the overlay's Rematch button: read the outcome off the finished match */
      rematch: function () { const M = DYA.currentMatch; const won = !!(M && M.result && M.result.winner === 0); settle(M && M.result, won); },
    });
  };

  DYA.expedition = E;
})();
