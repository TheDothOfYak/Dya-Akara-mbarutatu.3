/* ============================================================
   DYA'AKARA — core/duel_online.js
   Real-player DUEL matchmaking + wager settlement.

   Matchmaking reuses the season's shared queue on a private duel
   channel (see season.js S.pollDuel): when you open a "vs Player"
   duel, the game looks for another human who is also searching, and
   only fills in a Dya'kukull if none turns up in time.

   STAKES: two humans wager gold and/or tokens; both must agree.
   There is no server escrow — instead, because both clients run the
   SAME deterministic duel from the same seed, they agree on the
   winner, and each client settles its OWN account only:
     • the loser removes exactly what they staked,
     • the winner adds exactly what the loser staked,
   so nothing is duplicated or lost. A draw returns everything.
   The token DATA each side staked is exchanged during negotiation,
   so the winner can materialise the tokens it receives.

   The settlement math lives here as a pure function (resolveStakes)
   so it can be unit-tested without any network or UI.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util;
  const DO = {};
  DYA.duelOnline = DO;

  /* a wager: { gold:Number, tokens:[tokenObject,…] }. Normalise loose input. */
  function normWager(w) {
    w = w || {};
    return { gold: Math.max(0, Math.round(w.gold || 0)), tokens: Array.isArray(w.tokens) ? w.tokens.filter(Boolean) : [] };
  }

  /* Pure settlement: given MY wager, the OPPONENT's wager, and the outcome
     from MY seat, return the deltas to apply to MY account only:
       { goldDelta, addTokens:[…], removeTokenIds:[…] }
     - win  → I keep mine, gain theirs   (+their gold, +their tokens)
     - lose → I forfeit mine             (-my gold,   -my tokens)
     - draw → nothing moves
     Applied symmetrically on both clients, the winner's addTokens exactly
     mirror the loser's removeTokenIds, so the ledger balances. */
  DO.resolveStakes = function (myWager, oppWager, iWon, draw) {
    const mine = normWager(myWager), theirs = normWager(oppWager);
    if (draw) return { goldDelta: 0, addTokens: [], removeTokenIds: [] };
    if (iWon) return { goldDelta: theirs.gold, addTokens: theirs.tokens.slice(), removeTokenIds: [] };
    return { goldDelta: -mine.gold, addTokens: [], removeTokenIds: mine.tokens.map(t => t.id) };
  };

  /* Can I actually cover this wager right now? (checked before agreeing so a
     player can never stake gold/tokens they don't hold) */
  DO.canCover = function (acc, wager) {
    const w = normWager(wager);
    if (!acc) return false;
    if ((acc.gold || 0) < w.gold) return false;
    for (const t of w.tokens) {
      const owned = acc.tokens && acc.tokens[t.id];
      if (!owned || owned.status === 'market' || owned.frozen || owned.isRental) return false;
    }
    return true;
  };

  /* Apply a resolved settlement to an account in place. Idempotent per call;
     the caller invokes it exactly once, on a clean duel finish. Returns the
     settlement it applied (for logging/tests). */
  DO.settle = function (acc, myWager, oppWager, iWon, draw) {
    const r = DO.resolveStakes(myWager, oppWager, iWon, draw);
    acc.gold = Math.max(0, (acc.gold || 0) + r.goldDelta);
    r.removeTokenIds.forEach(id => {
      delete acc.tokens[id];
      (acc.pouches || []).forEach(p => { p.tokenIds = p.tokenIds.filter(x => x !== id); });
      if (acc.stall && acc.stall.featuredTokenId === id) acc.stall.featuredTokenId = null;
    });
    r.addTokens.forEach(t => {
      const tok = U.deepCopy(t);
      tok.ownerId = acc.id;
      tok.status = 'collection';
      tok.tradeHistory = (tok.tradeHistory || []).concat([{ at: Date.now(), from: 'duel', to: acc.displayName, price: 0 }]);
      acc.tokens[tok.id] = tok;
    });
    return r;
  };

  /* human-readable wager summary (shared by the negotiation UI + chat) */
  DO.describe = function (wager, SP) {
    const w = normWager(wager);
    const parts = [];
    if (w.gold) parts.push(U.fmt ? U.fmt(w.gold) + 'g' : w.gold + 'g');
    w.tokens.forEach(t => parts.push((SP && SP.get(t.speciesId) ? SP.get(t.speciesId).name : t.speciesId) + (t.name ? ' “' + t.name + '”' : '')));
    return parts.length ? parts.join(' · ') : 'Nothing — honor duel';
  };
})();
