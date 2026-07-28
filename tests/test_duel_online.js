/* Headless test for real-player duel wager settlement (core/duel_online.js).
   The critical property: when two humans wager gold/NgAkara/Okid/tokens and
   both clients settle their OWN account from the shared result, the winner
   gains EXACTLY what the loser forfeits — nothing duplicated or lost — and
   nobody can stake what they don't hold. */
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

function acct(id, name, gold, ngak, okid, toks) {
  const tokens = {};
  (toks || []).forEach(t => tokens[t.id] = t);
  return { id, displayName: name, gold, ngakara: ngak, okid: okid.slice(), tokens, pouches: [{ id: 'p', tokenIds: (toks || []).map(t => t.id) }], stall: {} };
}
function tok(id, sp) { return { id, speciesId: sp, name: sp + '-' + id, status: 'collection', stats: { hp: 100 } }; }
const totalTokens = a => Object.keys(a.tokens).length;

console.log('== DUEL ONLINE: wager settlement conserves gold/NgAkara/Okid/tokens ==');

/* ---- resolveStakes deltas over the full bet shape ---- */
const myW = { gold: 100, ngakara: 2, okid: [3, 0, 0, 0, 0, 0, 0], tokens: [tok('t1', 'gynge')] };
const opW = { gold: 40, ngakara: 1, okid: [0, 1, 0, 0, 0, 0, 0], tokens: [tok('t2', 'kipsu')] };
const win = DO.resolveStakes(myW, opW, true, false);
check('winner gains opponent gold + NgAkara', win.gold === 40 && win.ngakara === 1);
check('winner gains opponent Okid', win.okid[1] === 1 && win.okid[0] === 0);
check('winner receives opponent tokens', win.addTokens.length === 1 && win.addTokens[0].id === 't2');
const lose = DO.resolveStakes(myW, opW, false, false);
check('loser forfeits own gold/NgAkara/Okid', lose.gold === -100 && lose.ngakara === -2 && lose.okid[0] === -3);
check('loser forfeits own tokens', lose.removeTokenIds.length === 1 && lose.removeTokenIds[0] === 't1');
const drew = DO.resolveStakes(myW, opW, false, true);
check('a draw moves nothing', drew.gold === 0 && drew.ngakara === 0 && !drew.okid.some(Boolean) && !drew.addTokens.length && !drew.removeTokenIds.length);

/* ---- canCover guards over-staking on every resource ---- */
const poor = acct('A', 'Ann', 30, 1, [2, 0, 0, 0, 0, 0, 0], [tok('x', 'gynge')]);
check('cannot stake more gold than held', !DO.canCover(poor, { gold: 100 }));
check('cannot stake more NgAkara than held', !DO.canCover(poor, { ngakara: 5 }));
check('cannot stake more Okid than held', !DO.canCover(poor, { okid: [5, 0, 0, 0, 0, 0, 0] }));
check('cannot stake a token not held', !DO.canCover(poor, { tokens: [tok('nope', 'kipsu')] }));
check('cannot stake a market-listed token', !DO.canCover(acct('B', 'Bo', 0, 0, [0, 0, 0, 0, 0, 0, 0], [Object.assign(tok('m', 'uff'), { status: 'market' })]), { tokens: [tok('m', 'uff')] }));
check('can stake exactly what is held', DO.canCover(poor, { gold: 30, ngakara: 1, okid: [2, 0, 0, 0, 0, 0, 0], tokens: [tok('x', 'gynge')] }));

/* ---- full settlement across BOTH clients conserves everything ---- */
const aliceWager = { gold: 100, ngakara: 2, okid: [3, 0, 0, 0, 0, 0, 0], tokens: [tok('a1', 'gynge')] };
const bobWager = { gold: 40, ngakara: 2, okid: [3, 0, 0, 0, 0, 0, 0], tokens: [tok('b1', 'kipsu')] };
const alice = acct('ALICE', 'Alice', 500, 5, [4, 0, 0, 0, 0, 0, 0], [tok('a1', 'gynge'), tok('a2', 'sword_eikar')]);
const bob = acct('BOB', 'Bob', 500, 5, [4, 0, 0, 0, 0, 0, 0], [tok('b1', 'kipsu'), tok('b2', 'rodak')]);
const goldBefore = alice.gold + bob.gold, ngakBefore = alice.ngakara + bob.ngakara;
const okid0Before = alice.okid[0] + bob.okid[0], tokensBefore = totalTokens(alice) + totalTokens(bob);

DO.settle(alice, aliceWager, bobWager, true, false);   // Alice's client: she won
DO.settle(bob, bobWager, aliceWager, false, false);     // Bob's client: he lost

check('total gold is conserved', alice.gold + bob.gold === goldBefore, alice.gold + '+' + bob.gold);
check('total NgAkara is conserved', alice.ngakara + bob.ngakara === ngakBefore, alice.ngakara + '+' + bob.ngakara);
check('total Okid is conserved', alice.okid[0] + bob.okid[0] === okid0Before, alice.okid[0] + '+' + bob.okid[0]);
check('total token COUNT is conserved (no dup, no loss)', totalTokens(alice) + totalTokens(bob) === tokensBefore, (totalTokens(alice) + totalTokens(bob)) + ' vs ' + tokensBefore);
check('gold moved by exactly the pot', alice.gold === 540 && bob.gold === 460);
check('winner gained the opponent NgAkara + Okid', alice.ngakara === 7 && alice.okid[0] === 7, 'ngak=' + alice.ngakara + ' okid=' + alice.okid[0]);
check('loser forfeited their NgAkara + Okid', bob.ngakara === 3 && bob.okid[0] === 1, 'ngak=' + bob.ngakara + ' okid=' + bob.okid[0]);
check('winner now holds a copy of the staked creature', Object.values(alice.tokens).some(t => t.speciesId === 'kipsu'));
check('loser no longer has the staked creature', !bob.tokens['b1'] && !bob.pouches[0].tokenIds.includes('b1'));
check('loser keeps their un-staked creature', !!bob.tokens['b2']);
check('winner keeps their own staked creature', !!alice.tokens['a1']);

/* ---- a draw leaves both accounts untouched ---- */
const a2 = acct('A2', 'A2', 300, 3, [1, 0, 0, 0, 0, 0, 0], [tok('z1', 'gynge')]);
const b2 = acct('B2', 'B2', 300, 3, [1, 0, 0, 0, 0, 0, 0], [tok('z2', 'kipsu')]);
DO.settle(a2, { gold: 50, tokens: [tok('z1', 'gynge')] }, { gold: 50, tokens: [tok('z2', 'kipsu')] }, false, true);
DO.settle(b2, { gold: 50, tokens: [tok('z2', 'kipsu')] }, { gold: 50, tokens: [tok('z1', 'gynge')] }, false, true);
check('draw leaves gold + tokens untouched', a2.gold === 300 && b2.gold === 300 && !!a2.tokens['z1'] && !!b2.tokens['z2'] && totalTokens(a2) === 1 && totalTokens(b2) === 1);

console.log(failures ? 'DUEL ONLINE: ' + failures + ' FAILURE(S)' : 'DUEL ONLINE: ALL PASS');
process.exit(failures ? 1 : 0);
