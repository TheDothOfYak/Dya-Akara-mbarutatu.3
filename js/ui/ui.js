/* ============================================================
   DYA'AKARA — ui/ui.js
   Screen manager, topbar, toasts/notifications, token card
   components with live animated placeholder art, modals, and
   the loading screen (spinning token coin + lore tips).
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, SP = DYA.species, SPR = DYA.sprites, TK = DYA.token, L = DYA.lore;

  const UI = {
    root: null,
    current: null,
    currentName: null,
    screens: {},
    animCards: new Set(),   // live token-art canvases
    _animT: 0,
  };

  UI.init = function () {
    UI.root = U.qs('#app');
    /* toast container */
    document.body.appendChild(U.el('div', { id: 'toasts' }));
    /* global animation loop for card art */
    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      UI._animT += dt;
      for (const c of UI.animCards) {
        if (!c.isConnected) { UI.animCards.delete(c); continue; }
        drawTokenArt(c, UI._animT);
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    /* world sim heartbeat */
    setInterval(() => { if (G.me && !G.me.ai) { G.simTick(); G.cleanExpiredRentals(); } }, 20000);
  };

  /* ================= screen management ================= */
  UI.register = function (name, screen) { UI.screens[name] = screen; };

  UI.show = function (name, params) {
    const next = UI.screens[name];
    if (!next) { console.error('no screen', name); return; }
    if (UI.current && UI.current.leave) UI.current.leave();
    UI.root.innerHTML = '';
    if (hoverTip) hoverTip.style.display = 'none';
    UI.current = next; UI.currentName = name;
    next.enter(UI.root, params || {});
    addSealWatermark(name);
    if (DYA.tutorial) DYA.tutorial.onScreen(name, params);
  };

  /* player seal as a faint background on every non-battle screen (§3).
     Battle surfaces (arena + HUD) stay clean. */
  const NO_SEAL_SCREENS = { match: 1, spectate: 1, login: 1 };
  let sealWmCache = null, sealWmKey = '';
  function addSealWatermark(name) {
    if (NO_SEAL_SCREENS[name]) return;
    const me = G.me;
    if (!me || !me.seal || !SPR.drawSeal) return;
    const key = (me.seal.avatarIdx || 0) + '|' + (me.seal.patterns || []).join(',');
    if (!sealWmCache || sealWmKey !== key) {
      sealWmCache = U.el('canvas', { width: 560, height: 560 });
      SPR.drawSeal(sealWmCache.getContext('2d'), 280, 280, 268, me.seal);
      sealWmKey = key;
    }
    const wm = U.el('div', { cls: 'seal-watermark' });
    const cv = U.el('canvas', { width: 560, height: 560 });
    cv.getContext('2d').drawImage(sealWmCache, 0, 0);
    wm.appendChild(cv);
    UI.root.appendChild(wm);
  }

  /* loading transition with the spinning-coin screen */
  UI.showWithLoading = function (name, params, minMs) {
    UI.loading(true);
    setTimeout(() => { UI.show(name, params); UI.loading(false); }, minMs || 900);
  };

  let loadingEl = null, loadingRAF = 0;
  UI.loading = function (on) {
    if (on && !loadingEl) {
      const cv = U.el('canvas', { width: 220, height: 220 });
      const tip = L.TIPS[Math.floor(Math.random() * L.TIPS.length)];
      loadingEl = U.el('div', { id: 'loadingOverlay' }, [
        cv,
        U.el('div', { cls: 'lo-title', text: "DYA'AKARA" }),
        U.el('div', { cls: 'lo-tip', text: tip }),
      ]);
      document.body.appendChild(loadingEl);
      const ctx = cv.getContext('2d');
      /* cycle through the player's own collection if logged in, else default set */
      let pool;
      if (G.me && Object.keys(G.me.tokens).length) {
        pool = Object.values(G.me.tokens).map(t => SP.get(t.speciesId));
      } else {
        pool = ['gynge', 'rubbermcfly', 'domestic_punk', 'su_naga'].map(id => SP.get(id));
      }
      let idx = 0, t0 = performance.now();
      function spin(now) {
        if (!loadingEl) return;
        const t = (now - t0) / 1000;
        if (t > 2.6) { t0 = now; idx = (idx + 1) % pool.length; } // crossfade to next token
        ctx.clearRect(0, 0, 220, 220);
        ctx.save();
        const fade = t > 2.2 ? (2.6 - t) / 0.4 : t < 0.4 ? t / 0.4 : 1;
        ctx.globalAlpha = Math.max(0.15, fade);
        SPR.drawCoin(ctx, 110, 110, 88, t * 1.9, pool[idx], { spinRate: 1.2 });
        ctx.restore();
        loadingRAF = requestAnimationFrame(spin);
      }
      loadingRAF = requestAnimationFrame(spin);
    } else if (!on && loadingEl) {
      const el = loadingEl; loadingEl = null;
      cancelAnimationFrame(loadingRAF);
      el.style.transition = 'opacity .4s'; el.style.opacity = '0';
      setTimeout(() => el.remove(), 420);
    }
  };

  /* ================= topbar ================= */
  UI.topbar = function (opts) {
    opts = opts || {};
    const me = G.me;
    const bar = U.el('div', { cls: 'topbar' });
    bar.appendChild(U.el('div', { cls: 'logo', text: "DYA'AKARA", onclick: () => UI.show('menu') }));
    if (opts.title) bar.appendChild(U.el('div', { cls: 'muted', text: '— ' + opts.title }));
    bar.appendChild(U.el('div', { cls: 'spacer' }));
    if (me) {
      const okidTotal = me.okid.reduce((a, b) => a + b, 0);
      bar.appendChild(U.el('span', { cls: 'res-chip', html: '🪙 <b>' + U.fmt(me.gold) + '</b> gold' }));
      bar.appendChild(U.el('span', { cls: 'res-chip', html: '⬡ <b>' + okidTotal + '</b> Okid' }));
      bar.appendChild(U.el('span', { cls: 'res-chip', html: '🧪 <b>' + me.ngakara + '</b> NgAkara' }));
      bar.appendChild(U.el('span', { cls: 'res-chip', html: 'Lv <b>' + me.level + '</b>' }));
      /* notifications bell */
      const bell = U.el('div', { cls: 'bell', html: '🔔' + (me.notifications.length ? '<span class="dot"></span>' : '') });
      bell.onclick = () => UI.toggleNotifPanel();
      bar.appendChild(bell);
      /* avatar */
      const av = U.el('div', { cls: 'avatar-mini' });
      const avc = U.el('canvas', { width: 34, height: 34 });
      SPR.drawAvatar(avc.getContext('2d'), me.avatarIdx, 34);
      av.appendChild(avc);
      av.onclick = () => UI.show('profile');
      bar.appendChild(av);
    }
    UI._topbar = bar;
    return bar;
  };
  UI.refreshTopbar = function () {
    if (UI._topbar && UI._topbar.isConnected) {
      const fresh = UI.topbar({ title: UI._topbarTitle });
      UI._topbar.replaceWith(fresh);
    }
  };

  /* ================= notifications ================= */
  UI.onNotify = function (n) {
    UI.toast(n);
    UI.refreshTopbar();
  };
  UI.toast = function (n) {
    const t = U.el('div', { cls: 'toast' }, [
      U.el('div', { cls: 't-title', text: (n.icon ? n.icon + ' ' : '') + n.title }),
      U.el('div', { cls: 't-body', text: n.body || '' }),
    ]);
    t.onclick = () => t.remove();
    U.qs('#toasts').appendChild(t);
    DYA.audio.play('notify');
    setTimeout(() => { t.style.transition = 'opacity .5s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 5200);
  };
  let notifPanel = null;
  UI.toggleNotifPanel = function () {
    if (notifPanel) { notifPanel.remove(); notifPanel = null; return; }
    const me = G.me;
    notifPanel = U.el('div', { id: 'notifPanel' });
    if (!me.notifications.length) notifPanel.appendChild(U.el('div', { cls: 'muted center', style: 'padding:18px', text: 'Nothing new. The Guild sleeps.' }));
    me.notifications.slice().reverse().forEach(n => {
      const row = U.el('div', { cls: 'notif-row' }, [
        U.el('div', { text: n.icon || '📜' }),
        U.el('div', {}, [
          U.el('div', { style: 'color:var(--gold);font-size:13px', text: n.title }),
          U.el('div', { cls: 'small muted', text: n.body || '' }),
          U.el('div', { cls: 'small muted', text: U.timeAgo(n.at) }),
        ]),
        U.el('div', { cls: 'n-x', text: '✕', onclick: (e) => { e.stopPropagation(); G.dismissNotification(n.id); row.remove(); UI.refreshTopbar(); } }),
      ]);
      notifPanel.appendChild(row);
    });
    document.body.appendChild(notifPanel);
    const close = (e) => { if (notifPanel && !notifPanel.contains(e.target)) { notifPanel.remove(); notifPanel = null; document.removeEventListener('mousedown', close); } };
    setTimeout(() => document.addEventListener('mousedown', close), 10);
  };

  /* ================= modals ================= */
  UI.modal = function (contentEl, opts) {
    opts = opts || {};
    const back = U.el('div', { cls: 'modal-back' });
    const box = U.el('div', { cls: 'modal panel' });
    box.appendChild(contentEl);
    back.appendChild(box);
    back.onclick = (e) => { if (e.target === back && !opts.sticky) back.remove(); };
    document.body.appendChild(back);
    return { close: () => back.remove(), el: box };
  };
  UI.confirm = function (title, body, onYes, yesLabel) {
    const wrap = U.el('div', {}, [
      U.el('h3', { cls: 'gold', text: title }),
      U.el('p', { cls: 'mt', text: body }),
    ]);
    const m = UI.modal(wrap);
    const row = U.el('div', { cls: 'flex mt' });
    row.appendChild(U.el('button', { cls: 'btn danger', text: yesLabel || 'Confirm', onclick: () => { m.close(); onYes(); } }));
    row.appendChild(U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => m.close() }));
    wrap.appendChild(row);
  };
  UI.alert = function (title, body) {
    const wrap = U.el('div', {}, [
      U.el('h3', { cls: 'gold', text: title }),
      U.el('p', { cls: 'mt', text: body }),
    ]);
    const m = UI.modal(wrap);
    wrap.appendChild(U.el('div', { cls: 'mt' }, [U.el('button', { cls: 'btn', text: 'Very well', onclick: () => m.close() })]));
  };

  /* ================= token art & cards ================= */
  function drawTokenArt(cv, t) {
    const sp = cv._sp; if (!sp) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    /* subtle backdrop by element */
    const col = SP.ELEMENT_COLORS[sp.element] || '#888';
    const g = ctx.createRadialGradient(w / 2, h * 0.62, 2, w / 2, h * 0.62, w * 0.55);
    g.addColorStop(0, col + '2e'); g.addColorStop(1, col + '00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h * 0.6);
    SPR.draw(ctx, {
      sp, r: w * 0.26, state: cv._state || 'idle', t: t, phase: cv._phase || 0,
      facing: 1, alpha: 1, shimmer: true, biolum: true,
      heads: cv._heads, heat: 0.7,
    });
    ctx.restore();
  }

  /* live animated art canvas for a species */
  UI.tokenArt = function (speciesId, size, state, heads) {
    const cv = U.el('canvas', { width: size, height: size });
    cv._sp = SP.get(speciesId);
    cv._state = state || 'idle';
    cv._phase = Math.random() * 6.28;
    cv._heads = heads;
    UI.animCards.add(cv);
    drawTokenArt(cv, UI._animT);
    return cv;
  };

  /* standard token card */
  UI.tokenCard = function (tok, opts) {
    opts = opts || {};
    const sp = SP.get(tok.speciesId);
    const card = U.el('div', { cls: 'tok-card' + (tok.isRental ? ' rental' : '') });
    card.appendChild(UI.tokenArt(tok.speciesId, opts.size || 92, 'idle', tok.picks && tok.picks.headCount));
    card.appendChild(U.el('div', { cls: 'tc-name', text: tok.name }));
    if (opts.mode !== 'minimal') {
      card.appendChild(U.el('div', { cls: 'tc-meta', html: '<span class="rarity-dot br' + tok.rarity + '"></span>' + SP.RARITIES[tok.rarity] + ' · <span class="el-' + sp.element + '">' + sp.element + '</span>' }));
    }
    if (opts.mode === 'full') {
      card.appendChild(U.el('div', { cls: 'tc-meta', text: sp.name + ' · ' + SP.SIZES[tok.sizeIdx] }));
      card.appendChild(U.el('div', { cls: 'small muted', style: 'margin-top:4px;height:44px;overflow:hidden', text: sp.desc }));
    }
    card.appendChild(U.el('div', { cls: 'tc-cost', text: '◈' + SP.RARITY_COST[tok.rarity] }));
    if (opts.onclick) card.onclick = () => opts.onclick(tok);
    if (tok.frozen) card.appendChild(U.el('div', { style: 'position:absolute;inset:0;background:#2a4a6a44;border-radius:9px;display:flex;align-items:center;justify-content:center;color:#9ac4df;font-size:12px', text: '❄ FROZEN — under review' }));
    if (opts.hover !== false) UI.attachHoverInfo(card, tok);
    return card;
  };

  /* §11 — hover info card: name, species/type, temperament summary, status.
     Same treatment as the battle hover; used in the pouch builder & grids. */
  let hoverTip = null;
  UI.attachHoverInfo = function (el, tok) {
    el.addEventListener('mouseenter', () => {
      const sp = SP.get(tok.speciesId);
      if (!hoverTip) { hoverTip = U.el('div', { cls: 'hover-info' }); document.body.appendChild(hoverTip); }
      const card = TK.descriptionCard ? TK.descriptionCard(tok) : null;
      const costVec = TK.costVec ? TK.costVec(tok) : null;
      hoverTip.innerHTML =
        '<div class="hi-name">' + U.esc(tok.name) + '</div>' +
        '<div class="hi-line">' + U.esc(sp.name) + ' · <span class="el-' + sp.element + '">' + sp.element + '</span> · ' + SP.RARITIES[tok.rarity] + '</div>' +
        (card ? '<div class="hi-temper">' + U.esc(card.temperament) + '</div>' : '') +
        '<div class="hi-line">Health ' + tok.stats.hp + ' · Strike ' + tok.stats.dmg + ' · Pace ' + tok.stats.speed + '</div>' +
        (costVec && TK.fmtCost ? '<div class="hi-line gold">Cost: ' + U.esc(TK.fmtCost(costVec)) + '</div>' : '') +
        (tok.status && tok.status !== 'collection' ? '<div class="hi-line muted">Status: ' + U.esc(tok.status) + '</div>' : '');
      hoverTip.style.display = 'block';
    });
    el.addEventListener('mousemove', (e) => {
      if (!hoverTip) return;
      const x = Math.min(window.innerWidth - 260, e.clientX + 16);
      const y = Math.min(window.innerHeight - 150, e.clientY + 14);
      hoverTip.style.left = x + 'px'; hoverTip.style.top = y + 'px';
    });
    el.addEventListener('mouseleave', () => { if (hoverTip) hoverTip.style.display = 'none'; });
  };

  /* full detail view content (3D-ish rotating render + all info) */
  UI.tokenDetail = function (tok, opts) {
    opts = opts || {};
    const sp = SP.get(tok.speciesId);
    const card = TK.descriptionCard(tok);
    const wrap = U.el('div', { cls: 'detail-wrap' });

    /* left: rotating render fills half */
    const left = U.el('div', { cls: 'detail-left' });
    const cv = U.el('canvas', { width: 460, height: 460 });
    left.appendChild(cv);
    const back = U.el('div', { cls: 'back-arrow', text: '‹', style: 'position:absolute;top:14px;left:14px;font-size:30px;z-index:3' });
    back.onclick = () => opts.onBack && opts.onBack();
    left.appendChild(back);
    let raf, t0 = performance.now();
    function turntable(now) {
      if (!cv.isConnected) { cancelAnimationFrame(raf); return; }
      const t = (now - t0) / 1000;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, 460, 460);
      /* pedestal */
      ctx.fillStyle = '#00000055';
      ctx.beginPath(); ctx.ellipse(230, 350, 120 * (0.8 + 0.2 * Math.abs(Math.cos(t * 0.8))), 26, 0, 0, 6.29); ctx.fill();
      ctx.save();
      ctx.translate(230, 280);
      const facing = Math.cos(t * 0.8) >= 0 ? 1 : -1; // slow turntable rotation
      const squish = Math.abs(Math.cos(t * 0.8)) * 0.25 + 0.75;
      ctx.scale(squish, 1);
      SPR.draw(cv.getContext('2d'), {
        sp, r: 95, state: 'idle', t, facing,
        alpha: 1, shimmer: true, biolum: true,
        heads: tok.picks && tok.picks.headCount, heat: 0.8,
      });
      ctx.restore();
      raf = requestAnimationFrame(turntable);
    }
    raf = requestAnimationFrame(turntable);

    /* right: all info */
    const right = U.el('div', { cls: 'detail-right' });
    right.appendChild(U.el('h2', { cls: 'gold', text: tok.name }));
    right.appendChild(U.el('div', { cls: 'muted', text: sp.name + ' — ' + sp.family }));
    const badges = U.el('div', { cls: 'mt' });
    badges.appendChild(U.el('span', { cls: 'type-badge r' + tok.rarity, style: 'border-color:currentColor', text: SP.RARITIES[tok.rarity] }));
    badges.appendChild(U.el('span', { cls: 'type-badge el-' + sp.element, style: 'border-color:currentColor', text: sp.element + ' · ' + SP.ELEMENT_NAMES[sp.element] }));
    badges.appendChild(U.el('span', { cls: 'type-badge', style: 'border-color:var(--line);color:var(--ink-dim)', text: SP.SIZES[tok.sizeIdx] }));
    right.appendChild(badges);
    const costRow = U.el('div', { cls: 'flex mt' }, [U.el('span', { cls: 'muted small', text: 'COST TO READY' })]);
    const costVec = TK.costVec(tok);
    const vecSpan = U.el('span', {});
    SP.ELEMENTS.forEach(e => { if (costVec[e] > 0) vecSpan.appendChild(U.el('span', { cls: 'el-' + e, style: 'margin-right:8px', text: costVec[e] + ' ' + e })); });
    costRow.appendChild(vecSpan);
    costRow.appendChild(U.el('span', { cls: 'gold', text: '(' + SP.RARITY_COST[tok.rarity] + ' total)' }));
    right.appendChild(costRow);
    right.appendChild(U.el('div', { cls: 'divider' }));
    right.appendChild(U.el('div', { html: '<span class="muted small">DESCRIPTION</span><br>' + U.esc(sp.desc) }));
    right.appendChild(U.el('div', { cls: 'mt', html: '<span class="muted small">TEMPERAMENT (THIS INDIVIDUAL)</span><br>' + U.esc(card.temperament) }));
    right.appendChild(U.el('div', { cls: 'mt', html: '<span class="muted small">SPECIAL RULES</span><br>' + U.esc(sp.special || '—') }));
    right.appendChild(U.el('div', { cls: 'mt', html: '<span class="muted small">BACKGROUND</span><br><i>' + U.esc(tok.story) + '</i>' }));
    /* diamonds */
    const dia = U.el('div', { cls: 'mt' });
    dia.appendChild(U.el('span', { cls: 'muted small', text: 'PERSONALITY' }));
    const diaRow = U.el('div', { cls: 'mt', style: 'display:flex;flex-wrap:wrap;gap:6px' });
    for (const k in tok.diamonds) diaRow.appendChild(U.el('span', { cls: 'pill', text: k + ': ' + tok.diamonds[k] }));
    dia.appendChild(diaRow);
    right.appendChild(dia);
    /* eikar/keilia layer */
    if (tok.layer) {
      const lay = U.el('div', { cls: 'mt' });
      lay.appendChild(U.el('span', { cls: 'muted small', text: tok.layer.race.toUpperCase() + ' TRAITS' }));
      const lr = U.el('div', { cls: 'mt', style: 'display:flex;flex-wrap:wrap;gap:6px' });
      ['subRace', 'loyalty', 'alignment', 'ambition', 'communication', 'defaultMind', 'specialty', 'guild'].forEach(k => {
        if (tok.layer[k]) lr.appendChild(U.el('span', { cls: 'pill', text: tok.layer[k] }));
      });
      if (tok.layer.quarethen) lr.appendChild(U.el('span', { cls: 'pill gold', text: '★ Quarethen' }));
      lay.appendChild(lr);
      right.appendChild(lay);
    }
    /* stats */
    right.appendChild(U.el('div', { cls: 'mt', html: '<span class="muted small">TRUTH-STATS</span><br>Health ' + tok.stats.hp + ' · Strike ' + tok.stats.dmg + ' · Pace ' + tok.stats.speed + ' · Behavior value <span class="gold">' + tok.behaviorValue + '</span>' }));
    if (tok.tradeHistory && tok.tradeHistory.length) {
      right.appendChild(U.el('div', { cls: 'mt', html: '<span class="muted small">TRADE HISTORY</span><br>' + tok.tradeHistory.map(h => U.esc(h.from + ' → ' + h.to + (h.gift ? ' (gift)' : ' — ' + U.fmt(h.price) + 'g'))).join('<br>') }));
    }
    /* actions */
    const actions = U.el('div', { cls: 'flex mt', style: 'flex-wrap:wrap' });
    if (opts.actions) opts.actions.forEach(a => actions.appendChild(a));
    right.appendChild(actions);

    wrap.appendChild(left);
    wrap.appendChild(right);
    return wrap;
  };

  /* guild seal element */
  UI.guildSeal = function (size, label) {
    const wrap = U.el('span', { cls: 'seal', title: 'Click to verify Guild seal' });
    const cv = U.el('canvas', { width: size, height: size });
    SPR.drawGuildSeal(cv.getContext('2d'), size / 2, size / 2, size / 2 - 1);
    wrap.appendChild(cv);
    if (label !== false) wrap.appendChild(U.el('span', { text: 'GUILD SEALED' }));
    wrap.onclick = (e) => {
      e.stopPropagation();
      UI.alert('Seal Verified', 'This seal is genuine. The event is sanctioned and regulated by the Dya Guild, and all official rules apply. Rulings are final. Glory is optional but encouraged.');
    };
    return wrap;
  };

  DYA.ui = UI;
})();
