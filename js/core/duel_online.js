/* ============================================================
   DYA'AKARA — core/duel_online.js
   Real-player DUEL matchmaking + wager settlement.

   Matchmaking reuses the season's shared queue on a private duel
   channel (see season.js S.pollDuel): when you open a "vs Player"
   duel, the game looks for another human who is also searching, and
   only fills in a Dya'kukull if none turns up in time.

   STAKES: two humans wager gold, NgAkara, Okid and/or tokens — the
   same bet shape the Dya'kukull duel uses — and both must agree.
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

  const ZERO_OKID = () => [0, 0, 0, 0, 0, 0, 0];
  /* a wager: { gold, ngakara, okid:[7], tokens:[tokenObject,…] }. Normalise. */
  function normBet(b) {
    b = b || {};
    const okid = ZERO_OKID();
    (b.okid || []).forEach((n, i) => { if (i < 7) okid[i] = Math.max(0, Math.round(n || 0)); });
    return {
      gold: Math.max(0, Math.round(b.gold || 0)),
      ngakara: Math.max(0, Math.round(b.ngakara || 0)),
      okid,
      tokens: Array.isArray(b.tokens) ? b.tokens.filter(Boolean) : [],
    };
  }
  DO.normBet = normBet;
  DO.emptyBet = () => ({ gold: 0, ngakara: 0, okid: ZERO_OKID(), tokens: [] });
  DO.isEmpty = function (b) { const w = normBet(b); return !w.gold && !w.ngakara && !w.okid.some(Boolean) && !w.tokens.length; };

  /* Pure settlement: given MY wager, the OPPONENT's wager, and the outcome
     from MY seat, return the deltas to apply to MY account only:
       { gold, ngakara, okid:[7], addTokens:[…], removeTokenIds:[…] }
     - win  → I keep mine, gain theirs   (+their resources & tokens)
     - lose → I forfeit mine             (-my resources, -my tokens)
     - draw → nothing moves
     Applied symmetrically on both clients, the winner's gains exactly
     mirror the loser's losses, so the ledger balances. */
  DO.resolveStakes = function (myBet, oppBet, iWon, draw) {
    const mine = normBet(myBet), theirs = normBet(oppBet);
    if (draw) return { gold: 0, ngakara: 0, okid: ZERO_OKID(), addTokens: [], removeTokenIds: [] };
    if (iWon) return { gold: theirs.gold, ngakara: theirs.ngakara, okid: theirs.okid.slice(), addTokens: theirs.tokens.slice(), removeTokenIds: [] };
    return { gold: -mine.gold, ngakara: -mine.ngakara, okid: mine.okid.map(n => -n), addTokens: [], removeTokenIds: mine.tokens.map(t => t.id) };
  };

  /* Can I actually cover this wager right now? (checked before agreeing so a
     player can never stake resources/tokens they don't hold) */
  DO.canCover = function (acc, bet) {
    const w = normBet(bet);
    if (!acc) return false;
    if ((acc.gold || 0) < w.gold) return false;
    if ((acc.ngakara || 0) < w.ngakara) return false;
    for (let i = 0; i < 7; i++) if (((acc.okid && acc.okid[i]) || 0) < w.okid[i]) return false;
    for (const t of w.tokens) {
      const owned = acc.tokens && acc.tokens[t.id];
      if (!owned || owned.status === 'market' || owned.frozen || owned.isRental) return false;
    }
    return true;
  };

  /* Apply a resolved settlement to an account in place. The caller invokes it
     exactly once, on a clean duel finish. Returns the settlement applied. */
  DO.settle = function (acc, myBet, oppBet, iWon, draw) {
    const r = DO.resolveStakes(myBet, oppBet, iWon, draw);
    acc.gold = Math.max(0, (acc.gold || 0) + r.gold);
    acc.ngakara = Math.max(0, (acc.ngakara || 0) + r.ngakara);
    acc.okid = acc.okid || ZERO_OKID();
    r.okid.forEach((n, i) => { acc.okid[i] = Math.max(0, (acc.okid[i] || 0) + n); });
    r.removeTokenIds.forEach(id => {
      delete acc.tokens[id];
      (acc.pouches || []).forEach(p => { p.tokenIds = p.tokenIds.filter(x => x !== id); });
      if (acc.stall && acc.stall.featuredTokenId === id) acc.stall.featuredTokenId = null;
    });
    r.addTokens.forEach(t => {
      const tok = U.deepCopy(t);
      tok.id = U.uid ? U.uid('tok') : (t.id + '_won');   // fresh id — never collide with an existing token
      tok.ownerId = acc.id;
      tok.status = 'collection';
      tok.tradeHistory = (tok.tradeHistory || []).concat([{ at: Date.now(), from: 'duel', to: acc.displayName, price: 0, wager: true }]);
      acc.tokens[tok.id] = tok;
    });
    return r;
  };

  /* human-readable wager summary (for toasts/logging; the UI has its own) */
  DO.describe = function (bet, SP) {
    const w = normBet(bet), parts = [];
    if (w.gold) parts.push((U.fmt ? U.fmt(w.gold) : w.gold) + 'g');
    if (w.ngakara) parts.push(w.ngakara + ' NgAkara');
    w.okid.forEach((n, i) => { if (n) parts.push(n + ' ' + (SP && SP.RARITIES ? SP.RARITIES[i] : 'T' + i) + ' Okid'); });
    w.tokens.forEach(t => parts.push((SP && SP.get(t.speciesId) ? SP.get(t.speciesId).name : t.speciesId) + (t.name ? ' “' + t.name + '”' : '')));
    return parts.length ? parts.join(' · ') : 'Nothing — honor duel';
  };
})();
