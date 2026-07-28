/* Headless test for real-player duel wager settlement (core/duel_online.js).
   The critical property: when two humans wager gold + tokens and both clients
   settle their OWN account from the shared result, the winner gains EXACTLY
   what the loser forfeits — no token is duplicated or lost, and nobody can
   stake what they don't hold. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global; global.DYA = {};
for (const f of ['js/core/util.js', 'js/core/duel_online.js']) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}
const DO = global.DYA.duelOnline;

let failures = 0;
function check(name, ok, detail) {
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '   ← ' + (detail || '')));
  if (!ok) failures++;
}

function acct(id, name, gold, toks) {
  const tokens = {};
  (toks || []).forEach(t => tokens[t.id] = t);
  return { id, displayName: name, gold, tokens, pouches: [{ id: 'p', tokenIds: (toks || []).map(t => t.id) }], stall: {} };
}
function tok(id, sp) { return { id, speciesId: sp, name: sp + '-' + id, status: 'collection', stats: { hp: 100 } }; }
const totalTokens = a => Object.keys(a.tokens).length;

console.log('== DUEL ONLINE: wager settlement conserves gold + tokens ==');

/* ---- resolveStakes deltas ---- */
const myW = { gold: 100, tokens: [tok('t1', 'gynge')] };
const opW = { gold: 40, tokens: [tok('t2', 'kipsu')] };
const win = DO.resolveStakes(myW, opW, true, false);
check('winner gains opponent gold', win.goldDelta === 40, 'gold=' + win.goldDelta);
check('winner receives opponent tokens', win.addTokens.length === 1 && win.addTokens[0].id === 't2');
check('winner forfeits nothing', win.removeTokenIds.length === 0);
const lose = DO.resolveStakes(myW, opW, false, false);
check('loser forfeits own gold', lose.goldDelta === -100, 'gold=' + lose.goldDelta);
check('loser forfeits own tokens', lose.removeTokenIds.length === 1 && lose.removeTokenIds[0] === 't1');
const drew = DO.resolveStakes(myW, opW, false, true);
check('a draw moves nothing', drew.goldDelta === 0 && !drew.addTokens.length && !drew.removeTokenIds.length);

/* ---- canCover guards over-staking ---- */
const poor = acct('A', 'Ann', 30, [tok('x', 'gynge')]);
check('cannot stake more gold than held', !DO.canCover(poor, { gold: 100 }));
check('cannot stake a token not held', !DO.canCover(poor, { tokens: [tok('nope', 'kipsu')] }));
check('cannot stake a market-listed token', !DO.canCover(acct('B', 'Bo', 0, [Object.assign(tok('m', 'uff'), { status: 'market' })]), { tokens: [tok('m', 'uff')] }));
check('can stake what is actually held', DO.canCover(poor, { gold: 30, tokens: [tok('x', 'gynge')] }));

/* ---- full settlement across BOTH clients conserves everything ---- */
// Alice wagers 100g + gynge(a1); Bob wagers 40g + kipsu(b1). Alice wins.
const aliceWager = { gold: 100, tokens: [tok('a1', 'gynge')] };
const bobWager = { gold: 40, tokens: [tok('b1', 'kipsu')] };
const alice = acct('ALICE', 'Alice', 500, [tok('a1', 'gynge'), tok('a2', 'sword_eikar')]);
const bob = acct('BOB', 'Bob', 500, [tok('b1', 'kipsu'), tok('b2', 'rodak')]);
const goldBefore = alice.gold + bob.gold;
const tokensBefore = totalTokens(alice) + totalTokens(bob);

// each client settles its OWN account from the shared result (Alice won)
DO.settle(alice, aliceWager, bobWager, true, false);   // Alice's client: iWon = true
DO.settle(bob, bobWager, aliceWager, false, false);    // Bob's client:   iWon = false

check('total gold is conserved across both accounts', alice.gold + bob.gold === goldBefore, alice.gold + '+' + bob.gold + ' vs ' + goldBefore);
check('total token COUNT is conserved (no dup, no loss)', totalTokens(alice) + totalTokens(bob) === tokensBefore, (totalTokens(alice) + totalTokens(bob)) + ' vs ' + tokensBefore);
check('winner ends with the staked token', !!alice.tokens['b1'], 'alice has b1=' + !!alice.tokens['b1']);
check('loser no longer has the staked token', !bob.tokens['b1']);
check('loser keeps their un-staked token', !!bob.tokens['b2']);
check('winner keeps their own staked token', !!alice.tokens['a1']);
check('gold moved by exactly the pot', alice.gold === 500 + 40 && bob.gold === 500 - 40, 'alice=' + alice.gold + ' bob=' + bob.gold);
check('forfeited token is pulled from the loser\'s pouch too', !bob.pouches[0].tokenIds.includes('b1'));

/* ---- a draw leaves both accounts untouched ---- */
const a2 = acct('A2', 'A2', 300, [tok('z1', 'gynge')]);
const b2 = acct('B2', 'B2', 300, [tok('z2', 'kipsu')]);
DO.settle(a2, { gold: 50, tokens: [tok('z1', 'gynge')] }, { gold: 50, tokens: [tok('z2', 'kipsu')] }, false, true);
DO.settle(b2, { gold: 50, tokens: [tok('z2', 'kipsu')] }, { gold: 50, tokens: [tok('z1', 'gynge')] }, false, true);
check('draw leaves gold untouched', a2.gold === 300 && b2.gold === 300);
check('draw leaves tokens untouched', !!a2.tokens['z1'] && !!b2.tokens['z2'] && totalTokens(a2) === 1 && totalTokens(b2) === 1);

console.log(failures ? 'DUEL ONLINE: ' + failures + ' FAILURE(S)' : 'DUEL ONLINE: ALL PASS');
process.exit(failures ? 1 : 0);
