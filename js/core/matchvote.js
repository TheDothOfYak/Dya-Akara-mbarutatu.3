/* ============================================================
   DYA'AKARA — core/matchvote.js
   Pure helpers for the pre-match settings vote and the authoritative
   match "info" both live-match players launch from. Kept dependency-free
   (only DYA.economy for the legal option lists) so the netplay launch path
   and the local match-setup screen share ONE deterministic rule set — and
   so it can be unit-tested headlessly.
   ============================================================ */
(function () {
  'use strict';
  const MV = {};
  DYA.matchvote = MV;

  const DEFAULT_VOTE = { interval: 8, amount: 2, mode: 'Standard' };
  const DEFAULT_SEAL = { avatarIdx: 0, patterns: [] };
  MV.DEFAULT_VOTE = DEFAULT_VOTE;
  MV.DEFAULT_SEAL = DEFAULT_SEAL;

  function pick(v, arr, def) { return (arr && arr.indexOf(v) >= 0) ? v : def; }

  /* combine two players' votes into the agreed match settings — the middle
     ground on the numeric dials, Chaos only when BOTH ask for it. Identical
     inputs always yield identical settings, so both devices agree. */
  MV.combine = function (a, b) {
    const EC = DYA.economy;
    a = a || {}; b = b || {};
    const ai = pick(a.interval, EC.PULSE_INTERVALS, 8), bi = pick(b.interval, EC.PULSE_INTERVALS, 8);
    const aa = pick(a.amount, EC.PULSE_AMOUNTS, 2), ba = pick(b.amount, EC.PULSE_AMOUNTS, 2);
    return {
      pulseInterval: Math.round((ai + bi) / 2),
      pulseAmount: Math.round((aa + ba) / 2),
      chaos: a.mode === 'Chaos' && b.mode === 'Chaos',
    };
  };

  /* snap a numeric value to the nearest legal option in `arr` */
  function nearest(v, arr, def) {
    if (!arr || !arr.length) return def;
    let best = arr[0], bd = Infinity;
    for (const o of arr) { const d = Math.abs(o - v); if (d < bd) { bd = d; best = o; } }
    return best;
  }

  /* combine ANY number of players' votes into the agreed match settings — used
     by the multi-player Brawl, where every real player (and, when fewer than two
     real players are in the match, the Dya'kukull too) casts a vote. The middle
     ground wins each numeric dial (the mean, snapped to the nearest legal
     option); Chaos only when a strict MAJORITY asks for it. A single vote
     reduces to that vote; identical vote lists always yield identical settings,
     so every client agrees. */
  MV.combineMany = function (votes) {
    const EC = DYA.economy;
    votes = (votes || []).filter(Boolean);
    if (!votes.length) return { pulseInterval: 8, pulseAmount: 2, chaos: false };
    let si = 0, sa = 0, chaos = 0;
    votes.forEach(v => {
      si += pick(v.interval, EC.PULSE_INTERVALS, 8);
      sa += pick(v.amount, EC.PULSE_AMOUNTS, 2);
      if (v.mode === 'Chaos') chaos++;
    });
    return {
      pulseInterval: nearest(si / votes.length, EC.PULSE_INTERVALS, 8),
      pulseAmount: nearest(sa / votes.length, EC.PULSE_AMOUNTS, 2),
      chaos: chaos * 2 > votes.length,
    };
  };

  /* The Dya'kukull only cast pulse-settings votes when there are FEWER than two
     real players in the match — with two or more real people, the settings are
     decided by the people alone and the AI stand-ins abstain. */
  MV.shouldAIVote = function (realPlayerCount) {
    return (realPlayerCount || 0) < 2;
  };

  /* the host assembles the ONE authoritative match descriptor both sides build
     their identical lockstep match from: agreed settings, and each seat's
     starting-resource bonus (from titles) and seal — keyed by net id.
     For non-standard modes (duels) the pulse settings are fixed by the caller;
     only the per-seat title bonus and seal are carried. */
  MV.buildInfo = function (hostNet, guestNet, hostSetup, guestSetup, mode, fallbackSettings) {
    const hs = hostSetup || {}, gs = guestSetup || {};
    const settings = (!mode || mode === 'standard')
      ? MV.combine(hs.vote, gs.vote)
      : (fallbackSettings || { pulseInterval: 8, pulseAmount: 2, chaos: false });
    const info = { settings, res: {}, seals: {} };
    info.res[hostNet] = hs.startRes || 0;
    info.res[guestNet] = gs.startRes || 0;
    info.seals[hostNet] = hs.seal || DEFAULT_SEAL;
    info.seals[guestNet] = gs.seal || DEFAULT_SEAL;
    return info;
  };
})();
