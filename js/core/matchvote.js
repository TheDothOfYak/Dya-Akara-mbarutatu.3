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
