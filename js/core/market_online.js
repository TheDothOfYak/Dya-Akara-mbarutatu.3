/* ============================================================
   DYA'AKARA — core/market_online.js
   The REAL shared market. When online is configured, player
   listings live in one Supabase table (dya_listings) that every
   device sees. Each listing carries the full token — a token is
   ONE unique individual:

     • Listing escrows the token out of your collection (it can't
       be pouched, wagered, or double-listed while on the market;
       a partial unique index server-side blocks double listing).
     • BUYING IS ATOMIC: the purchase is a conditional update
       that only succeeds while the listing is still active.
       Exactly one buyer ever wins; everyone else is told the
       token is gone. No duplicates, ever.
     • The seller's device collects the proceeds (price minus the
       Guild's rarity tax) on its next sync, and the token leaves
       their collection for good.

   The 100 Dya'kukull AI (and Elbergi) trade here too, as full
   participants — every function below takes an explicit `acc`
   (account) argument rather than assuming "the logged-in human",
   so state.js's AI simulation can list, buy, offer and respond
   through the exact same atomic, no-duplicates path a real player
   uses. AI have stable, deterministic ids (ai_0..ai_99, ai_elbergi
   — see state.js's makeAIAccount), so a listing from "ai_47" is
   the SAME seller on every device, indistinguishable from a human
   stall in the market browse screen.

   Offers (haggling) are gold-only in the shared market: bundle
   trade-ins (NgAkara/Okid/extra tokens) require the buyer's own
   device to move those out of local storage, so that stays a
   local-market-only feature for now.

   Offline (no Supabase configured), the market falls back to the
   local Dya'kukull stalls exactly as before.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util;

  const MO = {};
  DYA.marketOnline = MO;

  const POLL_MS = 20000;

  function cfg() { return (window.DYA_CONFIG && window.DYA_CONFIG.supabase) || {}; }
  MO.configured = function () { const c = cfg(); return !!(c.url && c.anonKey); };

  function rest(method, path, body, prefer) {
    const c = cfg();
    return fetch(c.url + '/rest/v1/' + path, {
      method,
      headers: Object.assign({
        'apikey': c.anonKey,
        'Authorization': 'Bearer ' + c.anonKey,
        'Content-Type': 'application/json',
      }, prefer ? { 'Prefer': prefer } : {}),
      body: body != null ? JSON.stringify(body) : undefined,
    }).then(async res => {
      if (res.status === 204) return null;
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (data && (data.message || data.hint || data.error)) || ('HTTP ' + res.status);
        const e = new Error(msg); e.status = res.status; e.data = data;
        throw e;
      }
      return data;
    });
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
      const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function me() {
    const G = DYA.state;
    return G && G.me && !G.me.ai ? G.me : null;
  }
  /* the permanent online identity (shared with the friends layer).
     AI accounts already have a stable netId (= their own id) assigned
     at world-gen time; real players get a random uuid on first use. */
  function netIdFor(acc) {
    if (!acc) return null;
    if (acc.ai) return acc.netId || acc.id;
    if (!acc.netId) { acc.netId = uuid(); DYA.state.save(); }
    return acc.netId;
  }
  /* the permanent online identity of the CURRENT human, if any */
  function myNetId() {
    const m = me();
    return m ? netIdFor(m) : null;
  }
  function accountFor(netId) {
    const G = DYA.state;
    return (G && G.world && G.world.accounts[netId]) || null;
  }
  function isAi(netId) {
    const acc = accountFor(netId);
    return !!(acc && acc.ai);
  }
  /* AI response delay: skewed short, occasionally up to ~15 minutes,
     never instant. Only the CONTENT of an AI's reply needs to be
     deterministic (so racing devices agree) — the delay itself is
     just pacing and only one device ever schedules it, so plain
     Math.random() is fine here. */
  function aiDelayMs() {
    const d = Math.min(900, 20 + -Math.log(Math.max(1e-6, Math.random())) * 90);
    return Math.round(d * 1000);
  }

  /* ---------- live cache (the market UI reads this) ---------- */
  MO.state = {
    listings: [],   // all ACTIVE online listings (rows)
    offers: [],     // my open offers (as buyer or seller)
    error: null,
    lastFetch: 0,
    tablesMissing: false,
  };
  MO.enabled = function () { return MO.configured() && !!me(); };

  MO.listingsBy = function (netId) { return MO.state.listings.filter(r => r.seller_net_id === netId); };
  MO.listingsNotBy = function (netId) { return MO.state.listings.filter(r => r.seller_net_id !== netId); };
  MO.mine = function () { const id = myNetId(); return id ? MO.listingsBy(id) : []; };
  MO.others = function () { return MO.listingsNotBy(myNetId()); };

  /* ================= BROWSE ================= */
  let lastSig = '';
  MO.refresh = async function () {
    if (!MO.configured()) return;
    try {
      const rows = await rest('GET', 'dya_listings?status=eq.active&select=*&order=created_at.desc&limit=200');
      MO.state.listings = rows || [];
      MO.state.lastFetch = Date.now();
      MO.state.error = null;
      MO.state.tablesMissing = false;
      /* only poke the UI when the listing set actually changed —
         otherwise the market screen would re-render itself forever */
      const sig = MO.state.listings.map(r => r.id).join(',');
      if (sig !== lastSig) {
        lastSig = sig;
        if (DYA.ui && DYA.ui.onMarketUpdate) DYA.ui.onMarketUpdate();
      }
    } catch (e) {
      MO.state.error = e.message;
      if (e.status === 404 || /relation .* does not exist|Could not find the table/i.test(e.message)) MO.state.tablesMissing = true;
    }
  };

  /* ================= SELL (any account — human or AI) ================= */
  MO.listAs = async function (acc, tok, price, opts) {
    if (!acc) return { err: 'Not logged in.' };
    if (!MO.configured()) return { err: 'Online play is not configured.' };
    if (tok.frozen) return { err: 'This token is frozen pending Guild review.' };
    if (tok.isRental) return { err: 'Rented tokens belong to the Guild.' };
    if (tok.status !== 'collection') return { err: 'This token is already in use or listed.' };
    price = Math.max(1, Math.round(price));
    const netId = netIdFor(acc);
    const mode = (opts && opts.mode) || 'sale';
    const want = (opts && opts.want) || null;
    try {
      const rows = await rest('POST', 'dya_listings', {
        token_id: tok.id,
        seller_net_id: netId,
        seller_name: acc.displayName,
        price,
        status: 'active',
        mode,
        want,
        token: tok,
      }, 'return=representation');
      const row = rows && rows[0];
      if (!row) return { err: 'The Guild recorded nothing. Try again.' };
      /* escrow: the token stays visible in the seller's collection but locked */
      tok.status = 'market';
      tok.onlineListingId = row.id;
      DYA.state.save();
      MO.state.listings.unshift(row);
      return { row };
    } catch (e) {
      if (e.status === 409 || /duplicate key/i.test(e.message)) return { err: 'That token is already listed on the online market.' };
      return { err: 'Could not list: ' + e.message };
    }
  };
  MO.list = function (tok, price, opts) { return MO.listAs(me(), tok, price, opts || { mode: 'sale' }); };

  /* ================= BUY (atomic — one winner only; any account) ================= */
  MO.buyAs = async function (acc, row) {
    const G = DYA.state;
    if (!acc) return { err: 'Not logged in.' };
    const netId = netIdFor(acc);
    if (row.seller_net_id === netId) return { err: 'That is your own listing.' };
    if (acc.gold < row.price) return { err: 'Not enough gold.' };
    let updated;
    try {
      /* conditional update: only succeeds while status is still 'active'.
         If another player (or AI) bought it a heartbeat earlier, zero
         rows come back and the token is NOT duplicated. */
      updated = await rest('PATCH',
        'dya_listings?id=eq.' + encodeURIComponent(row.id) + '&status=eq.active',
        { status: 'sold', buyer_net_id: netId, buyer_name: acc.displayName, sold_at: new Date().toISOString() },
        'return=representation');
    } catch (e) {
      return { err: 'Purchase failed: ' + e.message };
    }
    if (!updated || !updated.length) {
      MO.state.listings = MO.state.listings.filter(r => r.id !== row.id);
      MO.refresh();
      return { err: 'Too late — another player just bought this token. It has left the market.' };
    }
    /* we won the claim: pay and take the token */
    const tok = U.deepCopy(row.token);
    acc.gold -= row.price;
    tok.ownerId = acc.id;
    tok.status = 'collection';
    delete tok.onlineListingId;
    tok.tradeHistory = tok.tradeHistory || [];
    tok.tradeHistory.push({ at: Date.now(), from: row.seller_name, to: acc.displayName, price: row.price, online: true });
    acc.tokens[tok.id] = tok;
    acc.stats.purchases++;
    G.world.market.recent = G.world.market.recent || [];
    G.world.market.recent.unshift({ at: Date.now(), tokName: tok.name, species: tok.speciesId, price: row.price, buyer: acc.displayName, buyerId: acc.id, seller: row.seller_name, sellerId: row.seller_net_id, online: true });
    if (G.world.market.recent.length > 30) G.world.market.recent.pop();
    if (!acc.ai) G.checkAchievement('collect_25', Object.keys(acc.tokens).length);
    G.save();
    MO.state.listings = MO.state.listings.filter(r => r.id !== row.id);
    if (DYA.ui && DYA.ui.onMarketUpdate) DYA.ui.onMarketUpdate();
    return { ok: true, tok };
  };
  MO.buy = function (row) { return MO.buyAs(me(), row); };

  /* ================= CANCEL (also atomic vs a concurrent buy) ================= */
  MO.cancelAs = async function (acc, row) {
    if (!acc) return { err: 'Not logged in.' };
    const netId = netIdFor(acc);
    let updated;
    try {
      updated = await rest('PATCH',
        'dya_listings?id=eq.' + encodeURIComponent(row.id) + '&status=eq.active&seller_net_id=eq.' + encodeURIComponent(netId),
        { status: 'cancelled', claimed: true },
        'return=representation');
    } catch (e) { return { err: e.message }; }
    if (!updated || !updated.length) {
      /* it sold in the meantime — syncMine() will pay us shortly */
      await MO.syncMine();
      return { err: 'That token just SOLD — the gold is on its way to your pouch.' };
    }
    const tok = acc.tokens[row.token_id];
    if (tok) { tok.status = 'collection'; delete tok.onlineListingId; }
    DYA.state.save();
    MO.state.listings = MO.state.listings.filter(r => r.id !== row.id);
    return { ok: true };
  };
  MO.cancel = function (row) { return MO.cancelAs(me(), row); };

  /* ================= SELLER SYNC =================
     Collect the results of my listings that resolved elsewhere:
     sold (another device bought it) → token leaves, gold arrives;
     cancelled by an admin pull → token returns home. */
  MO.syncMine = async function () {
    const G = DYA.state, EC = DYA.economy;
    const m = me();
    if (!m || !m.netId || !MO.configured()) return;
    let rows;
    try {
      rows = await rest('GET', 'dya_listings?seller_net_id=eq.' + encodeURIComponent(m.netId) + '&status=in.(sold,cancelled)&claimed=eq.false&select=*');
    } catch (e) { MO.state.error = e.message; return; }
    if (!rows || !rows.length) return;
    const claimedIds = [];
    rows.forEach(row => {
      const tok = m.tokens[row.token_id];
      if (row.status === 'sold') {
        const rarity = (row.token && row.token.rarity) || (tok && tok.rarity) || 0;
        const tax = Math.round(row.price * Math.max(0, EC.MARKET_TAX[rarity] + G.titleBuff('tax')));
        m.gold += row.price - tax;
        if (tok) {
          delete m.tokens[row.token_id];
          m.pouches.forEach(p => { p.tokenIds = p.tokenIds.filter(id => id !== row.token_id); });
          if (m.stall.featuredTokenId === row.token_id) m.stall.featuredTokenId = null;
        }
        m.stats.sales++;
        if (m.stats.sales >= EC.TRUSTED_SELLER_SALES) m.trustedSeller = true;
        G.checkAchievement('first_sale', 1);
        G.world.market.recent = G.world.market.recent || [];
        G.world.market.recent.unshift({ at: Date.now(), tokName: row.token.name, species: row.token.speciesId, price: row.price, buyer: row.buyer_name || 'a player', buyerId: row.buyer_net_id, seller: m.displayName, sellerId: m.id, online: true });
        if (G.world.market.recent.length > 30) G.world.market.recent.pop();
        G.notify({ type: 'market', title: 'Token sold online!', body: row.token.name + ' sold to ' + (row.buyer_name || 'a player') + ' for ' + U.fmt(row.price) + 'g (tax ' + U.fmt(tax) + 'g).', icon: '💰' });
      } else { /* cancelled — pulled by the Guild (admin) */
        if (tok) { tok.status = 'collection'; delete tok.onlineListingId; }
        G.notify({ type: 'market', title: 'Listing removed', body: (row.token ? row.token.name : 'Your listing') + ' was pulled from the market by the Dya Guild. The token has returned to your collection.', icon: '⚖️' });
      }
      claimedIds.push(row.id);
    });
    G.save();
    try {
      await rest('PATCH', 'dya_listings?id=in.(' + claimedIds.map(encodeURIComponent).join(',') + ')', { claimed: true });
    } catch (e) { /* will retry next sync */ }
    if (DYA.ui) {
      if (DYA.ui.refreshTopbar) DYA.ui.refreshTopbar();
      if (DYA.ui.onMarketUpdate) DYA.ui.onMarketUpdate();
    }
  };

  /* re-escrow guard: if a local token says it's online-listed but the
     listing no longer exists (deleted row), release it */
  MO.reconcile = function () {
    const m = me();
    if (!m) return;
    const liveIds = {};
    MO.state.listings.forEach(r => liveIds[r.id] = true);
    let changed = false;
    Object.values(m.tokens).forEach(t => {
      if (t.onlineListingId && t.status === 'market' && MO.state.lastFetch && !liveIds[t.onlineListingId]) {
        /* not active anymore — sold/cancelled handled by syncMine; if the
           row vanished entirely, give the token back */
        rest('GET', 'dya_listings?id=eq.' + encodeURIComponent(t.onlineListingId) + '&select=id,status').then(rows => {
          if (!rows || !rows.length) {
            t.status = 'collection'; delete t.onlineListingId;
            DYA.state.save();
          }
        }).catch(() => { });
        changed = true;
      }
    });
    if (changed) DYA.state.save();
  };

  /* ================= OFFERS (haggling — gold only) =================
     Both sides append to `history` and the row's `version` makes every
     write conditional. If two devices race to write the SAME next
     step (most commonly: every player's browser independently decides
     it's time for the same AI seller to answer the same offer), only
     the first write lands; the loser affects zero rows. That's safe
     because the reply is DETERMINISTIC — seeded from the offer's own
     id and history length — so every device computes the identical
     reply anyway; the "loser" would have written the same thing. */
  async function patchOfferRow(row, fields) {
    const body = Object.assign({}, fields, { version: (row.version || 0) + 1, updated_at: new Date().toISOString() });
    try {
      const updated = await rest('PATCH',
        'dya_offers?id=eq.' + encodeURIComponent(row.id) + '&version=eq.' + (row.version || 0),
        body, 'return=representation');
      const out = updated && updated[0];
      if (out) applyOfferRowLocally(out);
      return out;
    } catch (e) { return null; }
  }
  function applyOfferRowLocally(row) {
    const i = MO.state.offers.findIndex(r => r.id === row.id);
    if (i >= 0) MO.state.offers[i] = row; else MO.state.offers.unshift(row);
  }

  MO.makeOfferAs = async function (acc, row, amount, note) {
    if (!acc) return { err: 'Not logged in.' };
    if (!MO.configured()) return { err: 'Online play is not configured.' };
    const netId = netIdFor(acc);
    if (row.seller_net_id === netId) return { err: 'That is your own listing.' };
    amount = Math.round(amount);
    if (amount <= 0) return { err: 'Offer must be a positive amount.' };
    if (acc.gold < amount) return { err: 'You cannot offer more gold than you hold.' };
    const sellerIsAi = isAi(row.seller_net_id);
    try {
      const rows = await rest('POST', 'dya_offers', {
        listing_id: row.id,
        token_id: row.token_id,
        token: row.token,
        list_price: row.price,
        buyer_net_id: netId,
        buyer_name: acc.displayName,
        seller_net_id: row.seller_net_id,
        seller_name: row.seller_name,
        state: 'pending',
        history: [{ by: 'buyer', amount, note: note || '', at: Date.now() }],
        respond_at: sellerIsAi ? new Date(Date.now() + aiDelayMs()).toISOString() : null,
      }, 'return=representation');
      const off = rows && rows[0];
      if (!off) return { err: 'The Guild recorded nothing. Try again.' };
      MO.state.offers.unshift(off);
      return { off };
    } catch (e) { return { err: 'Could not make offer: ' + e.message }; }
  };

  MO.counterOfferAs = async function (acc, row, amount, note, bySeller) {
    if (!acc) return { err: 'Not logged in.' };
    if (!MO.configured()) return { err: 'Online play is not configured.' };
    if (row.state === 'accepted' || row.state === 'ended' || row.state === 'expired') return { err: 'Offer closed.' };
    const newHistory = (row.history || []).concat([{ by: bySeller ? 'seller' : 'buyer', amount: Math.round(amount), note: note || '', at: Date.now() }]);
    const otherNetId = bySeller ? row.buyer_net_id : row.seller_net_id;
    const patch = {
      state: 'countered',
      history: newHistory,
      respond_at: isAi(otherNetId) ? new Date(Date.now() + aiDelayMs()).toISOString() : null,
    };
    const updated = await patchOfferRow(row, patch);
    if (!updated) return { err: 'That offer just changed — refresh and try again.' };
    if (DYA.ui && DYA.ui.onMarketUpdate) DYA.ui.onMarketUpdate();
    return { off: updated };
  };

  /* accepting resolves the underlying listing atomically (same
     one-winner guarantee as a direct buy) at the negotiated price,
     then flips the offer itself. If the accepting device IS the
     buyer's own (asSeller=false, a human accepting a counter),
     settle immediately; otherwise (a human seller, or the AI
     auto-responder, accepting as seller) the buyer's own device
     picks up the token+gold on its next claimAcceptedOffers() poll —
     the same "your device isn't here, so payout waits for your next
     visit" model already used for ordinary online sales. */
  MO.acceptOfferAs = async function (acc, row, asSeller) {
    if (!MO.configured()) return { err: 'Online play is not configured.' };
    if (row.state === 'accepted' || row.state === 'ended' || row.state === 'expired') return { err: 'Offer closed.' };
    if (acc) {
      const expected = asSeller ? row.seller_net_id : row.buyer_net_id;
      if (netIdFor(acc) !== expected) return { err: 'You are not part of this offer.' };
    }
    const last = (row.history || [])[row.history.length - 1];
    if (!last) return { err: 'Offer has no terms yet.' };
    let listingUpdated;
    try {
      listingUpdated = await rest('PATCH',
        'dya_listings?id=eq.' + encodeURIComponent(row.listing_id) + '&status=eq.active',
        { status: 'sold', buyer_net_id: row.buyer_net_id, buyer_name: row.buyer_name, sold_at: new Date().toISOString() },
        'return=representation');
    } catch (e) { return { err: 'Could not accept: ' + e.message }; }
    if (!listingUpdated || !listingUpdated.length) {
      await patchOfferRow(row, { state: 'expired' });
      return { err: 'That listing is no longer available.' };
    }
    const updatedOffer = await patchOfferRow(row, { state: 'accepted' });
    if (DYA.ui && DYA.ui.onMarketUpdate) DYA.ui.onMarketUpdate();
    if (!asSeller) await MO.claimAcceptedOffers();
    return { ok: true, off: updatedOffer || row };
  };

  MO.endOfferAs = async function (acc, row) {
    if (!MO.configured()) return { err: 'Online play is not configured.' };
    const updated = await patchOfferRow(row, { state: 'ended' });
    if (DYA.ui && DYA.ui.onMarketUpdate) DYA.ui.onMarketUpdate();
    return { ok: !!updated };
  };

  /* my open offers, as buyer or seller — for the Offers tab */
  let lastOfferSig = '';
  MO.refreshOffers = async function () {
    const m = me();
    if (!MO.configured() || !m) return;
    const netId = netIdFor(m);
    try {
      const rows = await rest('GET', 'dya_offers?or=(buyer_net_id.eq.' + encodeURIComponent(netId) + ',seller_net_id.eq.' + encodeURIComponent(netId) + ')&state=in.(pending,countered,accepted)&select=*&order=updated_at.desc&limit=100');
      MO.state.offers = rows || [];
      const sig = MO.state.offers.map(r => r.id + ':' + r.version).join(',');
      if (sig !== lastOfferSig) {
        lastOfferSig = sig;
        if (DYA.ui && DYA.ui.onMarketUpdate) DYA.ui.onMarketUpdate();
      }
    } catch (e) { /* keep previous cache */ }
  };

  /* buyer-side reconciliation: an offer I made got accepted, possibly
     by a browser that isn't mine (the seller, or the AI auto-responder
     running on someone else's tab) — collect the token, pay up. */
  MO.claimAcceptedOffers = async function () {
    const G = DYA.state;
    const m = me();
    if (!m || !MO.configured()) return;
    const netId = netIdFor(m);
    let rows;
    try {
      rows = await rest('GET', 'dya_offers?buyer_net_id=eq.' + encodeURIComponent(netId) + '&state=eq.accepted&claimed=eq.false&select=*');
    } catch (e) { return; }
    if (!rows || !rows.length) return;
    for (const row of rows) {
      const last = (row.history || [])[row.history.length - 1];
      const amount = last ? last.amount : row.list_price;
      if (m.gold >= amount) {
        const tok = U.deepCopy(row.token);
        m.gold -= amount;
        tok.ownerId = m.id;
        tok.status = 'collection';
        delete tok.onlineListingId;
        tok.tradeHistory = tok.tradeHistory || [];
        tok.tradeHistory.push({ at: Date.now(), from: row.seller_name, to: m.displayName, price: amount, online: true });
        G.addToken(tok);
        m.stats.purchases++;
        G.world.market.recent = G.world.market.recent || [];
        G.world.market.recent.unshift({ at: Date.now(), tokName: tok.name, species: tok.speciesId, price: amount, buyer: m.displayName, buyerId: m.id, seller: row.seller_name, sellerId: row.seller_net_id, online: true });
        if (G.world.market.recent.length > 30) G.world.market.recent.pop();
        G.notify({ type: 'market', title: 'Offer accepted!', body: (row.token && row.token.name || 'The token') + ' is yours for ' + U.fmt(amount) + 'g.', icon: '🤝' });
      } else {
        G.notify({ type: 'market', title: 'Offer lapsed', body: 'Your offer on ' + (row.token && row.token.name || 'a token') + ' was accepted, but you no longer have enough gold to cover it.', icon: '⚖️' });
      }
      try { await rest('PATCH', 'dya_offers?id=eq.' + encodeURIComponent(row.id), { claimed: true }); } catch (e) { /* retried next poll */ }
    }
    G.save();
    const doneIds = rows.map(r => r.id);
    MO.state.offers = MO.state.offers.filter(r => !doneIds.includes(r.id));
    if (DYA.ui) {
      if (DYA.ui.refreshTopbar) DYA.ui.refreshTopbar();
      if (DYA.ui.onMarketUpdate) DYA.ui.onMarketUpdate();
    }
  };

  /* an AI seller answers a due offer — mirrors state.js's local
     aiRespondToOffer exactly (same reserve/lowball/counter math), but
     against the shared row. Scope: only the SELLER side is ever AI in
     the shared market (AI only *buys* directly, via buyAs — it never
     makes offers of its own here), so this only handles "AI seller
     replies to the human buyer's last message." */
  async function aiRespondToOfferRow(row) {
    const history = row.history || [];
    const last = history[history.length - 1];
    if (!last || last.by !== 'buyer') return;
    if (!isAi(row.seller_net_id)) return;
    const rngA = new U.Rng(U.hashStr(row.id) ^ history.length);
    const reserve = Math.round(row.list_price * rngA.range(0.72, 0.9));
    const lastAi = history.filter(h => h.by === 'seller').pop();
    const bundleVal = last.amount;
    const lowball = lastAi ? bundleVal < lastAi.amount * 0.5 : bundleVal < reserve * 0.5;
    if (bundleVal >= reserve) {
      await MO.acceptOfferAs(null, row, true);
      return;
    }
    let patch;
    if (lowball) {
      if (history.length > 7) {
        patch = { state: 'ended', respond_at: null };
      } else {
        const up = Math.round((lastAi ? lastAi.amount : row.list_price) * rngA.range(1.02, 1.12));
        patch = {
          state: 'countered', respond_at: null,
          history: history.concat([{ by: 'seller', amount: up, note: rngA.pick(['You insult the token.', 'That number went the wrong way for you.', 'The Guild frowns on jokes.']), at: Date.now() }]),
        };
      }
    } else {
      const prev = lastAi ? lastAi.amount : row.list_price;
      const counter = Math.round(Math.max(reserve, Math.min(prev - 1, (bundleVal + prev) / 2 * rngA.range(0.98, 1.05))));
      patch = {
        state: 'countered', respond_at: null,
        history: history.concat([{ by: 'seller', amount: counter, note: rngA.pick(['Closer.', 'I can’t go that low.', 'The song alone cost more than that.', 'Meet me here.']), at: Date.now() }]),
      };
    }
    await patchOfferRow(row, patch);
    if (DYA.ui && DYA.ui.onMarketUpdate) DYA.ui.onMarketUpdate();
  }
  /* global sweep: any browser's poll can (and should) answer any due
     AI-seller offer, not just ones involving its own logged-in human */
  MO.processDueAiOffers = async function () {
    if (!MO.configured()) return;
    let rows;
    try {
      rows = await rest('GET', 'dya_offers?state=in.(pending,countered)&respond_at=not.is.null&respond_at=lte.' + encodeURIComponent(new Date().toISOString()) + '&select=*&limit=25');
    } catch (e) { return; }
    if (!rows || !rows.length) return;
    for (const row of rows) {
      if (isAi(row.seller_net_id)) await aiRespondToOfferRow(row);
    }
  };

  /* keep Elbergi's stall stocked in the shared market so the tutorial's
     "buy anything from Elbergi" step stays completable once the local
     hardcoded bootstrap listings are superseded by this shared one */
  MO.ensureElbergiStock = async function () {
    if (!MO.configured()) return;
    const G = DYA.state;
    const elbergi = G.world.accounts[G.world.elbergiId];
    if (!elbergi) return;
    const activeMine = MO.state.listings.filter(r => r.seller_net_id === elbergi.netId);
    const need = 4 - activeMine.length;
    if (need <= 0) return;
    const candidates = Object.values(elbergi.tokens)
      .filter(t => t.status === 'collection')
      .sort((a, b) => (a.rarity || 0) - (b.rarity || 0))
      .slice(0, need);
    for (const tok of candidates) {
      await MO.listAs(elbergi, tok, Math.round(80 + Math.random() * 80), { mode: 'sale' });
    }
  };

  /* ================= SUPPLY CAPS (hard, real-time) =================
     Every genuinely new token — hunting/crafting rewards, admin
     grants, the Dya'kukull's own ongoing hunting/crafting — reserves
     a slot here FIRST. reserve_token_slot() does the cap check and
     the increment together in one database transaction, so two
     mints of the same capped species at the same instant can't both
     slip in under the cap. Species/rarities nobody has capped are
     unaffected in spirit (the call still happens — this project
     doesn't keep anything about token production local — but it
     always succeeds instantly since the row has no cap). */
  MO.reserveSupplySlot = async function (speciesId, rarity) {
    if (!MO.configured()) return { reserved: true }; // no cloud, no cap system — mint freely, exactly as before
    try {
      const rows = await rest('POST', 'rpc/reserve_token_slot', { p_species: speciesId, p_rarity: rarity });
      const r = rows && rows[0];
      return r ? { reserved: !!r.reserved, count: r.cur_count, cap: r.cur_cap } : { reserved: true };
    } catch (e) { return { reserved: false, err: e.message }; }
  };
  /* releases a slot — call when a token is destroyed (buyback, admin
     delete) or changes rarity (upgrade: release the old tier). Never
     needs to block anything, so callers can fire this and move on. */
  MO.releaseSupplySlot = async function (speciesId, rarity) {
    if (!MO.configured()) return;
    try { await rest('POST', 'rpc/release_token_slot', { p_species: speciesId, p_rarity: rarity }); }
    catch (e) { /* best-effort — a missed release just means the count runs a little high */ }
  };
  /* every (species, rarity) row that has ever been minted or capped —
     the Admin Panel's Token Limits tab reads this directly, since the
     cap itself lives here (not in the client-synced mods layer) and
     must stay the single source of truth the RPC above enforces */
  MO.fetchSupply = async function () {
    if (!MO.configured()) return [];
    return (await rest('GET', 'dya_species_supply?select=*&order=species_id.asc,rarity.asc')) || [];
  };
  /* set (or raise/lower) a cap — upsert so a never-before-touched
     species/rarity gets a row too; omits `count` from the payload so
     an existing row's live count is never clobbered */
  MO.setSupplyCap = async function (speciesId, rarity, cap) {
    if (!MO.configured()) return { err: 'Online play is not configured.' };
    try {
      await rest('POST', 'dya_species_supply?on_conflict=species_id,rarity',
        { species_id: speciesId, rarity, cap }, 'resolution=merge-duplicates');
      return { ok: true };
    } catch (e) { return { err: e.message }; }
  };
  MO.clearSupplyCap = function (speciesId, rarity) { return MO.setSupplyCap(speciesId, rarity, null); };

  /* ================= ADMIN ================= */
  MO.adminFetchAll = async function () {
    return rest('GET', 'dya_listings?select=*&order=created_at.desc&limit=200');
  };
  MO.adminPull = async function (rowId) {
    /* atomic: only pulls if still active (claimed=false so the seller's
       device is told and returns the token to their collection) */
    const updated = await rest('PATCH',
      'dya_listings?id=eq.' + encodeURIComponent(rowId) + '&status=eq.active',
      { status: 'cancelled' }, 'return=representation');
    return { pulled: !!(updated && updated.length) };
  };

  /* ================= LIFECYCLE ================= */
  let timer = null;
  MO.onAuthChange = function () {
    clearInterval(timer); timer = null;
    if (!me() || !MO.configured()) return;
    MO.refresh().then(() => { MO.syncMine(); MO.reconcile(); MO.ensureElbergiStock(); });
    MO.refreshOffers().then(() => MO.claimAcceptedOffers());
    MO.processDueAiOffers();
    timer = setInterval(() => {
      MO.refresh();
      MO.syncMine();
      MO.refreshOffers().then(() => MO.claimAcceptedOffers());
      MO.processDueAiOffers();
    }, POLL_MS);
  };
})();
