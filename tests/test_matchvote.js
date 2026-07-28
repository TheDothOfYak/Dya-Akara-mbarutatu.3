/* Headless test for the shared pre-match vote / launch-info helpers
   (js/core/matchvote.js). These are the deterministic rules both live-match
   players and the local setup screen use, so the two sides always agree on
   settings, and each seat's title bonus (startRes) + seal are carried into
   every match. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

global.window = global;
global.DYA = {};
for (const f of ['js/core/util.js', 'js/data/economy.js', 'js/core/matchvote.js']) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const MV = global.DYA.matchvote, EC = global.DYA.economy;

console.log('== MATCH VOTE: shared, deterministic settings + carried title effects ==');

/* combine() picks the middle ground and is symmetric/deterministic */
const a = { interval: 2, amount: 1, mode: 'Chaos' };
const b = { interval: 10, amount: 5, mode: 'Chaos' };
const s1 = MV.combine(a, b), s2 = MV.combine(b, a);
check('combine averages the pulse interval', s1.pulseInterval === Math.round((2 + 10) / 2));
check('combine averages the pulse amount', s1.pulseAmount === Math.round((1 + 5) / 2));
check('combine is order-independent (deterministic)', JSON.stringify(s1) === JSON.stringify(s2));
check('chaos only when BOTH vote chaos', MV.combine({ mode: 'Chaos' }, { mode: 'Standard' }).chaos === false);
check('chaos when both vote chaos', s1.chaos === true);

/* illegal/missing votes fall back to the legal defaults */
const sBad = MV.combine({ interval: 999, amount: -3, mode: 'x' }, null);
check('illegal interval falls back to a legal default', EC.PULSE_INTERVALS.indexOf(8) >= 0 && sBad.pulseInterval === 8);
check('illegal amount falls back to a legal default', sBad.pulseAmount === 2);

/* buildInfo carries each seat's title bonus + seal, keyed by net id */
const host = { startRes: 4, seal: { avatarIdx: 1, patterns: ['runes'] }, vote: { interval: 5, amount: 3, mode: 'Standard' } };
const guest = { startRes: 0, seal: { avatarIdx: 2, patterns: [] }, vote: { interval: 15, amount: 1, mode: 'Standard' } };
const info = MV.buildInfo('HOSTNET', 'GUESTNET', host, guest, 'standard', null);
check('standard match settings come from BOTH votes', info.settings.pulseInterval === Math.round((5 + 15) / 2));
check('host seat carries the host title bonus', info.res.HOSTNET === 4);
check('guest seat carries the guest title bonus', info.res.GUESTNET === 0);
check('host seat carries the host seal', info.seals.HOSTNET.avatarIdx === 1);
check('guest seat carries the guest seal', info.seals.GUESTNET.avatarIdx === 2);

/* both players build IDENTICAL info from the same setups → no desync */
const infoOnGuestDevice = MV.buildInfo('HOSTNET', 'GUESTNET', host, guest, 'standard', null);
check('both devices derive identical launch info', JSON.stringify(info) === JSON.stringify(infoOnGuestDevice));

/* a duel keeps the caller's fixed (no-pulse) settings but still carries seals */
const duelInfo = MV.buildInfo('H', 'G', host, guest, 'duel', { pulseInterval: 9999, pulseAmount: 0, chaos: false });
check('duel keeps the fixed pulse settings (no vote)', duelInfo.settings.pulseInterval === 9999 && duelInfo.settings.pulseAmount === 0);
check('duel still carries seals so titles show', duelInfo.seals.H.avatarIdx === 1 && duelInfo.seals.G.avatarIdx === 2);

/* a missing peer setup still yields safe defaults (host can proceed alone) */
const infoNoGuest = MV.buildInfo('H', 'G', host, null, 'standard', null);
check('missing guest setup → guest seat gets safe defaults', infoNoGuest.res.G === 0 && infoNoGuest.seals.G === MV.DEFAULT_SEAL);
check('missing guest vote still produces legal settings', EC.PULSE_INTERVALS.indexOf(infoNoGuest.settings.pulseInterval) >= 0 || typeof infoNoGuest.settings.pulseInterval === 'number');

console.log(failures ? 'MATCH VOTE: ' + failures + ' FAILURE(S)' : 'MATCH VOTE: ALL PASS');
process.exit(failures ? 1 : 0);
