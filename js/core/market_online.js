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
  /* the permanent online identity (shared with the friends layer) */
  function myNetId() {
    const m = me();
    if (!m) return null;
    if (!m.netId) { m.netId = uuid(); DYA.state.save(); }
    return m.netId;
  }

  /* ---------- live cache (the market UI reads this) ---------- */
  MO.state = {
    listings: [],   // all ACTIVE online listings (rows)
    error: null,
    lastFetch: 0,
    tablesMissing: false,
  };
  MO.enabled = function () { return MO.configured() && !!me(); };

  MO.mine = function () {
    const id = me() && me().netId;
    return id ? MO.state.listings.filter(r => r.seller_net_id === id) : [];
  };
  MO.others = function () {
    const id = me() && me().netId;
    return MO.state.listings.filter(r => r.seller_net_id !== id);
  };

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

  /* ================= SELL ================= */
  MO.list = async function (tok, price) {
    const m = me();
    if (!m) return { err: 'Not logged in.' };
    if (!MO.configured()) return { err: 'Online play is not configured.' };
    if (tok.frozen) return { err: 'This token is frozen pending Guild review.' };
    if (tok.isRental) return { err: 'Rented tokens belong to the Guild.' };
    if (tok.status !== 'collection') return { err: 'This token is already in use or listed.' };
    price = Math.max(1, Math.round(price));
    const netId = myNetId();
    try {
      const rows = await rest('POST', 'dya_listings', {
        token_id: tok.id,
        seller_net_id: netId,
        seller_name: m.displayName,
        price,
        status: 'active',
        token: tok,
      }, 'return=representation');
      const row = rows && rows[0];
      if (!row) return { err: 'The Guild recorded nothing. Try again.' };
      /* escrow: the token stays visible in your collection but locked */
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

  /* ================= BUY (atomic — one winner only) ================= */
  MO.buy = async function (row) {
    const G = DYA.state;
    const m = me();
    if (!m) return { err: 'Not logged in.' };
    if (row.seller_net_id === m.netId) return { err: 'That is your own listing.' };
    if (m.gold < row.price) return { err: 'Not enough gold.' };
    const netId = myNetId();
    let updated;
    try {
      /* conditional update: only succeeds while status is still 'active'.
         If another player bought it a heartbeat earlier, zero rows come
         back and the token is NOT duplicated. */
      updated = await rest('PATCH',
        'dya_listings?id=eq.' + encodeURIComponent(row.id) + '&status=eq.active',
        { status: 'sold', buyer_net_id: netId, buyer_name: m.displayName, sold_at: new Date().toISOString() },
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
    m.gold -= row.price;
    tok.ownerId = m.id;
    tok.status = 'collection';
    delete tok.onlineListingId;
    tok.tradeHistory = tok.tradeHistory || [];
    tok.tradeHistory.push({ at: Date.now(), from: row.seller_name, to: m.displayName, price: row.price, online: true });
    G.addToken(tok);
    m.stats.purchases++;
    G.world.market.recent = G.world.market.recent || [];
    G.world.market.recent.unshift({ at: Date.now(), tokName: tok.name, species: tok.speciesId, price: row.price, buyer: m.displayName, buyerId: m.id, seller: row.seller_name, sellerId: row.seller_net_id, online: true });
    if (G.world.market.recent.length > 30) G.world.market.recent.pop();
    G.checkAchievement('collect_25', Object.keys(m.tokens).length);
    G.save();
    MO.state.listings = MO.state.listings.filter(r => r.id !== row.id);
    if (DYA.ui && DYA.ui.onMarketUpdate) DYA.ui.onMarketUpdate();
    return { ok: true, tok };
  };

  /* ================= CANCEL (also atomic vs a concurrent buy) ================= */
  MO.cancel = async function (row) {
    const m = me();
    if (!m) return { err: 'Not logged in.' };
    let updated;
    try {
      updated = await rest('PATCH',
        'dya_listings?id=eq.' + encodeURIComponent(row.id) + '&status=eq.active&seller_net_id=eq.' + encodeURIComponent(m.netId),
        { status: 'cancelled', claimed: true },
        'return=representation');
    } catch (e) { return { err: e.message }; }
    if (!updated || !updated.length) {
      /* it sold in the meantime — syncMine() will pay us shortly */
      await MO.syncMine();
      return { err: 'That token just SOLD — the gold is on its way to your pouch.' };
    }
    const tok = m.tokens[row.token_id];
    if (tok) { tok.status = 'collection'; delete tok.onlineListingId; }
    DYA.state.save();
    MO.state.listings = MO.state.listings.filter(r => r.id !== row.id);
    return { ok: true };
  };

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
    MO.refresh().then(() => { MO.syncMine(); MO.reconcile(); });
    timer = setInterval(() => {
      MO.refresh();
      MO.syncMine();
    }, POLL_MS);
  };
})();
