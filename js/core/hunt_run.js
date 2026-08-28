/* ============================================================
   DYA'AKARA — core/hunt_run.js
   The HUNT — run engine (a run-based summoner mode).

   Owns the RUN: which Hunter/form, which hunting ground, how deep, the
   drafted summon-deck, and the Vaelk economy. Combat is delegated to the
   existing match engine (mode 'huntrun' — a relic-free, defeat-the-enemy
   battle WITH a resource economy that reads as Vaelk).

   The final node is the ground's Quarry: a legendary scaled into a true
   boss. Defeat it and the run grants a crafting PIECE carrying the
   Quarry's EXACT stats (via a stored spec + TK.mintSpec at the bench).

   The run is single-player and run-only: nothing here is permanent
   except the piece you earn by clearing a ground. The active run lives
   on G.me.huntRun so it survives navigating away mid-run.

   Everything except launchNode() is pure/headless so it can be tested
   without the DOM or the match UI.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, SP = DYA.species, TK = DYA.token, ED = DYA.huntRunData;
  const E = {};

  /* ---- active run accessor ---- */
  E.active = function () { return (DYA.state && DYA.state.me && DYA.state.me.huntRun) || null; };
  E.setActive = function (run) { if (DYA.state && DYA.state.me) { DYA.state.me.huntRun = run || null; if (DYA.state.save) DYA.state.save(); } };

  /* ---- node bookkeeping ---- */
  E.isGuardianNode = function (run) { return run.nodeIdx >= run.nodes - 1; };
  E.nodesCleared = function (run) { return run.nodeIdx; };

  /* A deck token: minted from a species, then re-priced so its whole ready
     cost sits in the Hunter's single Vaelk flavor. */
  E.makeDeckToken = function (spid, element, rng) {
    const tok = TK.mint({ speciesId: spid, rng: rng || new U.Rng(U.newSeed()) });
    const total = SP.ELEMENTS.reduce((s, e) => s + (tok.cost[e] || 0), 0) || 1;
    tok.cost = { Fti: 0, Su: 0, Eldi: 0, Ular: 0 };
    tok.cost[element] = total;
    tok.costLocked = true;
    tok.huntRunDeck = true;
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
    hero.huntRunHero = true;
    hero.name = form.name;
    hero.nameLocked = true;
    const run = {
      id: U.uid('hunt'),
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
      bossHpMul: opts.bossHpMul || D.bossHpMul,
      bossDmgMul: opts.bossDmgMul || D.bossDmgMul,
      terrain: opts.terrain || ({ Su: 'water', Ular: 'forest', Fti: 'plains', Eldi: 'desert' }[form.element] || 'plains'),
      cleared: false, ended: false, result: null,
      bossSpec: null, reward: null,
      startedAt: Date.now(),
      pendingDraft: null,
      log: [],
    };
    run.pendingDraft = { reason: 'start', options: E.draftOptions(run, rng) };
    E.setActive(run);
    return run;
  };

  /* ---- draft: 3 element-filtered beasts, keep 1 ---- */
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

  /* ---- the Quarry: an existing legendary scaled into a true boss ----
     Deterministic per run so the fielded Quarry and the piece you earn from
     it are byte-identical. Returns { tok, spec, summon }: the token to field,
     the exact spec to reproduce it at the bench, and its summon pattern. */
  E.buildQuarry = function (run) {
    const planet = ED.getPlanet(run.planetId);
    const g = planet.guardian;
    const D = ED.DEFAULTS;
    const rng = new U.Rng(U.hashStr(run.id + ':quarry'));
    const tok = TK.mint({ speciesId: g.species, rng, rarity: g.rarity });
    tok.name = g.name; tok.nameLocked = true;
    tok.sizeIdx = D.bossSizeIdx;
    /* lock in this individual's life-history quirks so the piece can reproduce
       them verbatim — the engine derives quirks from the token id at spawn and
       applies their HP/speed mods, so the crafted copy must carry the SAME set
       to field identically to the Quarry it came from. */
    const quirks = (TK.quirks ? TK.quirks(tok) : (tok.quirks || [])).slice();
    const hp = Math.max(1, Math.round(tok.stats.hp * (run.bossHpMul || D.bossHpMul)));
    const dmg = Math.max(0, Math.round(tok.stats.dmg * (run.bossDmgMul || D.bossDmgMul) * 10) / 10);
    const speed = tok.stats.speed;
    tok.stats = { hp: hp, dmg: dmg, speed: speed };
    tok.cost = TK.costVec(tok);
    const spec = {
      speciesId: g.species, rarity: g.rarity, name: g.name,
      sizeIdx: D.bossSizeIdx, stats: { hp: hp, dmg: dmg, speed: speed },
      behaviorValue: tok.behaviorValue, element: tok.element,
      vars: U.deepCopy(tok.vars), picks: U.deepCopy(tok.picks), quirks: quirks,
    };
    return { tok: tok, spec: spec, summon: g.summon, name: g.name, blurb: g.blurb };
  };

  /* ---- the enemy side for the current node (pure) ---- */
  E.buildNode = function (run, rng) {
    rng = rng || new U.Rng(U.hashStr(run.id + ':node:' + run.nodeIdx));
    const planet = ED.getPlanet(run.planetId);
    const guardianIdx = run.nodes - 1;
    if (run.nodeIdx >= guardianIdx) {
      const q = E.buildQuarry(run);
      return {
        guardian: true, hadBoss: true, name: q.name, blurb: q.blurb, spec: q.spec,
        enemies: [{
          speciesId: q.spec.speciesId, rarity: q.spec.rarity, name: q.name, boss: true,
          tok: q.tok, sizeIdx: q.spec.sizeIdx, stats: q.spec.stats,
          behaviorValue: q.spec.behaviorValue, vars: q.spec.vars, picks: q.spec.picks,
          guardian: q.summon,
        }],
      };
    }
    /* ordinary nodes ramp hard: more beasts, higher rarity as the ground deepens */
    const depth = run.nodeIdx;
    const span = Math.max(1, guardianIdx);
    const count = 2 + Math.min(2, Math.floor(depth * 2 / span));  // 2 → 4 across the run
    const enemies = [];
    for (let i = 0; i < count; i++) {
      const spid = rng.pick(planet.enemyPool);
      const sp = SP.get(spid);
      const lo = sp.rarity[0], hi = sp.rarity[1];
      /* push toward the top of each species' band as depth grows */
      const r = U.clamp(Math.round(lo + (hi - lo) * (0.4 + 0.6 * depth / span)), lo, hi);
      enemies.push({ speciesId: spid, rarity: r });
    }
    return { guardian: false, hadBoss: false, name: planet.name + ' — beast pack ' + (depth + 1), enemies: enemies };
  };

  /* ---- reward: a piece of the Quarry, carrying its EXACT stats ---- */
  E.grantQuarryPiece = function (run) {
    if (!run || !run.bossSpec) return null;
    const s = run.bossSpec;
    const piece = {
      speciesId: s.speciesId,
      rarity: s.rarity,
      material: 'flawless Quarry-piece',
      from: 'Hunt — the ' + run.planetName + ' Quarry',
      temperBias: 0,
      /* the exact-stats spec the workbench reproduces verbatim */
      spec: {
        speciesId: s.speciesId, rarity: s.rarity, name: s.name,
        sizeIdx: s.sizeIdx, stats: U.deepCopy(s.stats),
        behaviorValue: s.behaviorValue, element: s.element,
        vars: U.deepCopy(s.vars), picks: U.deepCopy(s.picks),
      },
      at: Date.now(),
    };
    if (DYA.state && DYA.state.me) {
      DYA.state.me.pieces = DYA.state.me.pieces || [];
      DYA.state.me.pieces.push(piece);
    }
    return piece;
  };

  /* ---- resolve a node outcome (pure, headless-testable) ---- */
  E.resolveNode = function (run, iWon, rng) {
    if (!run) return { type: 'none' };
    if (!iWon) {
      run.ended = true; run.result = 'lost';
      E.setActive(run);
      return { type: 'lost' };
    }
    if (E.isGuardianNode(run)) {
      run.cleared = true; run.ended = true; run.result = 'cleared';
      const piece = E.grantQuarryPiece(run);
      run.reward = piece ? { speciesId: piece.speciesId, name: (piece.spec && piece.spec.name), stats: piece.spec && piece.spec.stats, rarity: piece.rarity } : null;
      E.setActive(run);
      return { type: 'cleared', reward: run.reward };
    }
    run.nodeIdx++;
    run.pendingDraft = { reason: 'node', options: E.draftOptions(run, rng) };
    E.setActive(run);
    return { type: 'draft', nodeIdx: run.nodeIdx };
  };

  E.end = function () { if (DYA.state && DYA.state.me) { DYA.state.me.huntRun = null; if (DYA.state.save) DYA.state.save(); } };

  E.vaelk = function (run) { return ED.vaelkOf(run.element); };

  /* ============================================================
     launchNode — the ONE non-headless entry point.
     ============================================================ */
  E.launchNode = function (run, cbs) {
    cbs = cbs || {};
    const P = DYA.play;
    if (!P || !P.startMatch) return;
    const node = E.buildNode(run);
    if (node.guardian && node.spec) run.bossSpec = node.spec;    // remember the exact Quarry for the reward
    const pouch = run.deck.map(function (t) { const c = U.deepCopy(t); c.id = U.uid('tok'); c.costLocked = true; return c; });
    const hero = U.deepCopy(run.hero); hero.id = U.uid('tok');
    let settled = false;
    const settle = function (res, iWon) {
      if (settled) return; settled = true;
      const ev = E.resolveNode(run, !!iWon);
      if (cbs.onFinish) cbs.onFinish(ev, res, iWon);
    };
    P.startMatch({
      mode: 'huntrun', skipSetup: true, noRecord: true, noXp: true,
      format: 'Hunt — ' + run.planetName + (node.guardian ? ' · the Quarry' : ' · pack ' + (run.nodeIdx + 1)),
      terrain: run.terrain,
      pouch: pouch,
      opponent: { name: node.name },
      hunt: { enemies: node.enemies },
      huntrun: {
        element: run.element,
        hero: hero,
        startPool: run.startVaelk,
        heroHpMul: run.heroHpMul,
        timeLimit: run.nodeTimeLimit,
      },
      settings: { pulseInterval: run.pulseInterval, pulseAmount: run.vaelkRegen, chaos: false },
      onFinish: function (res, iWon, draw) { settle(res, iWon && !draw); },
      rematch: function () { const M = DYA.currentMatch; const won = !!(M && M.result && M.result.winner === 0); settle(M && M.result, won); },
    });
  };

  DYA.huntRun = E;
})();
