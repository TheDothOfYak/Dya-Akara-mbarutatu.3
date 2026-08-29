/* ============================================================
   DYA'AKARA — ui/screens_pia.js
   LEGENDS OF PIA'DON — the deckbuilder's screens.

   Home / Guardian select, the co-op lobby, and one umbrella run
   screen that repaints itself for each phase (map, battle, reward,
   rest, shop, treasure, victory, defeat). Everything reads from
   DYA.piaSession.run and drives it through piaSession.act(), so the
   same screens serve solo and co-op with no branching.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, UI = DYA.ui, SP = DYA.species;
  const D = DYA.piaData, EN = DYA.piaEngine, R = DYA.piaRun, S = DYA.piaSession, C = DYA.piaCoop;

  const NODE_ICON = { battle: '⚔', elite: '💀', boss: '🐉', rest: '🔥', event: '❔', merchant: '🛒', treasure: '📦' };
  const INTENT = {
    attack: { icon: '⚔', cls: 'i-atk' }, block: { icon: '🛡', cls: 'i-blk' },
    buff: { icon: '💪', cls: 'i-buf' }, debuff: { icon: '☠', cls: 'i-deb' }, summon: { icon: '➕', cls: 'i-sum' },
  };

  let targeting = null;   // {handIdx} while choosing an enemy target

  /* Guardian art — every Guardian is an Eikar, but each wears its own coat,
     build, and markings (its `phys`) so the four read as distinct individuals
     wherever they're drawn (home, lobby, battle). */
  function guardArt(g, size, state) {
    const cv = UI.tokenArt(g.avatar, size, state || 'idle', null, null);
    if (g.phys) cv._indiv = g.phys;    // picked up on the next animation frame
    return cv;
  }

  /* ================= BATTLE ANIMATION =================
     The engine records an ordered `events` stream for each action (who hit
     whom, ticks, heals, blocks, summons, deaths). We play it as a timeline:
     the acting figure lunges, the target flashes and floats a number, and
     its HP bar falls in step — so every change reads as a cause, not a jump.
     Bars are seeded to their PRE-batch values (reconstructed from the events)
     and walked forward, so you watch each hit land. */
  let fxRefs = {};           // uid -> { cell, fill, text, max, hp }
  let runHost = null;        // #pia-root, for the post-timeline repaint
  let lastEventsRef = null;  // the events array we last animated
  let fxToken = 0;           // cancels a superseded timeline
  let inputLocked = false;
  let lastHandTurn = -1;     // to trigger deal-in + "your turn" once per turn
  let lastPhase = null;      // to trigger the battle->end flourish
  const EMPTY_SET = { has: () => false };

  function regRef(uid, cell, fill, text, max, hp) {
    fxRefs[uid] = { cell: cell, fill: fill, text: text, max: max, hp: hp };
    cell.setAttribute('data-uid', uid);
  }
  function setBar(ref, hp) {
    if (!ref) return;
    ref.fill.style.width = Math.max(0, Math.min(100, Math.round(100 * hp / ref.max))) + '%';
    ref.text.textContent = Math.max(0, Math.round(hp)) + '/' + ref.max;
  }
  function centerRect(el) { return el.getBoundingClientRect(); }
  function floatText(cell, text, cls) {
    if (!cell) return;
    const r = centerRect(cell);
    const f = U.el('div', { cls: 'pia-float ' + (cls || ''), text: text });
    f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + 10) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 950);
  }
  function flashHit(cell) { if (!cell) return; cell.classList.remove('pia-hit'); void cell.offsetWidth; cell.classList.add('pia-hit'); setTimeout(() => cell.classList.remove('pia-hit'), 440); }
  function popIn(cell) { if (!cell) return; cell.classList.add('pia-pop'); setTimeout(() => cell.classList.remove('pia-pop'), 420); }
  function fadeDie(cell) { if (!cell) return; cell.classList.add('pia-die'); }
  function pulseEl(cell) { if (!cell) return; cell.classList.add('pia-act'); setTimeout(() => cell.classList.remove('pia-act'), 240); }
  function shieldPulse(cell) { if (!cell) return; cell.classList.add('pia-shield'); setTimeout(() => cell.classList.remove('pia-shield'), 420); }
  function lunge(srcCell, tgtCell) {
    if (!srcCell || !tgtCell) return;
    const s = centerRect(srcCell), t = centerRect(tgtCell);
    let dx = (t.left + t.width / 2) - (s.left + s.width / 2);
    let dy = (t.top + t.height / 2) - (s.top + s.height / 2);
    const d = Math.hypot(dx, dy) || 1, reach = Math.min(38, d * 0.4);
    dx = dx / d * reach; dy = dy / d * reach;
    srcCell.style.transition = 'transform .12s ease-out';
    srcCell.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    setTimeout(() => { srcCell.style.transform = ''; setTimeout(() => { srcCell.style.transition = ''; }, 150); }, 120);
  }
  function banner(text, kind) {
    const el = U.el('div', { cls: 'pia-banner' + (kind ? ' b-' + kind : '') }, [U.el('span', { cls: 'pia-banner-txt', text: text })]);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1050);
  }
  /* a full-screen sweep when a battle ends */
  function flourish(kind) {
    try {
      const label = kind === 'quarry' ? 'Quarry Felled' : kind === 'victory' ? 'Victory' : 'The Run Ends';
      const el = U.el('div', { cls: 'pia-flourish k-' + kind }, [
        U.el('div', { cls: 'pf-ray' }),
        U.el('div', { cls: 'pf-label', text: label }),
      ]);
      document.body.appendChild(el);
      sfx(kind === 'defeat' ? 'defeat' : 'victory');
      if (kind === 'quarry') setTimeout(() => sfx('levelup'), 300);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, kind === 'defeat' ? 1500 : 1300);
    } catch (e) { }
  }
  function setInputLocked(v) { inputLocked = v; if (runHost) runHost.classList.toggle('fx-lock', v); }
  function sfx(name) { try { DYA.audio && DYA.audio.play(name); } catch (e) { } }
  function shakeArena(big) {
    const a = runHost && runHost.querySelector('.pia-arena'); if (!a) return;
    const cls = big ? 'pia-shake-big' : 'pia-shake';
    a.classList.remove('pia-shake', 'pia-shake-big'); void a.offsetWidth; a.classList.add(cls);
    setTimeout(() => a.classList.remove(cls), big ? 460 : 300);
  }
  /* a ghost of the played card flies from the hand to its target */
  function flyCard(srcEl, destX, destY) {
    if (!srcEl) return;
    try {
      const r = srcEl.getBoundingClientRect();
      const g = U.el('div', { cls: 'pia-fly' });
      g.style.left = r.left + 'px'; g.style.top = r.top + 'px'; g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
      // mirror the card's face
      g.innerHTML = srcEl.innerHTML;
      g.className = 'pia-fly ' + srcEl.className.replace('pia-card', '').replace('disabled', '').trim();
      document.body.appendChild(g);
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      requestAnimationFrame(() => {
        g.style.transform = 'translate(' + (destX - cx) + 'px,' + (destY - cy) + 'px) scale(.55) rotate(8deg)';
        g.style.opacity = '0';
      });
      setTimeout(() => g.remove(), 340);
    } catch (e) { }
  }
  function arenaPoint(frac) {
    const a = runHost && runHost.querySelector('.pia-arena'); if (!a) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const r = a.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * (frac == null ? 0.5 : frac) };
  }
  function cellCenter(uid) { const ref = fxRefs[uid]; if (!ref) return null; const r = ref.cell.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  /* discrete Vaelk (energy) orbs that deplete as you spend */
  function energyOrbs(me) {
    const wrap = U.el('div', { cls: 'pia-vaelk', title: 'Vaelk — your energy this turn' });
    const base = (me.baseEnergy || 3) + (me.mods && me.mods.energyPerTurn ? me.mods.energyPerTurn : 0);
    const max = Math.max(base, me.energy, 1);
    for (let i = 0; i < max; i++) wrap.appendChild(U.el('span', { cls: 'pia-orb' + (i < me.energy ? ' on' : '') }));
    wrap.appendChild(U.el('span', { cls: 'pia-vaelk-n', html: '<b>' + me.energy + '</b> Vaelk' }));
    return wrap;
  }

  const FLOAT_CLS = { poison: 'f-poison', detonate: 'f-poison', cuts: 'f-dmg' };
  function statusFloat(key, amt) {
    return ({ poison: '☠+' + amt, vuln: '⤈+' + amt, weak: '⬇+' + amt, str: '💪+' + amt, regen: '✚+' + amt, dex: '✧+' + amt })[key] || (key + '+' + amt);
  }
  function dyingSet(b) {
    const s = {};
    (b.events || []).forEach(ev => { if (ev.t === 'die' && ev.tgt) s[ev.tgt] = 1; });
    return { has: (u) => !!s[u] };
  }

  /* play the current battle's event batch as a timed sequence */
  function runTimeline(b) {
    const my = ++fxToken;
    const events = b.events || [];
    const refs = fxRefs;
    /* seed each bar to its pre-batch value (add back damage, remove heals) */
    const cur = {};
    Object.keys(refs).forEach(uid => { cur[uid] = refs[uid].hp; });
    events.forEach(ev => {
      if (ev.tgt != null && cur[ev.tgt] != null) {
        if (ev.t === 'dmg') cur[ev.tgt] += ev.amt;
        else if (ev.t === 'heal') cur[ev.tgt] -= ev.amt;
      }
    });
    Object.keys(refs).forEach(uid => setBar(refs[uid], cur[uid]));

    const lockInput = events.some(e => e.t === 'phase' || e.t === 'die');
    if (lockInput) setInputLocked(true);

    let t = 0;
    const at = (fn, dur) => { const when = t; setTimeout(() => { if (fxToken === my) fn(); }, when); t += dur; };
    events.forEach(ev => {
      const tref = ev.tgt != null ? refs[ev.tgt] : null;
      const sref = ev.src != null ? refs[ev.src] : null;
      switch (ev.t) {
        case 'play': at(() => { pulseEl(sref && sref.cell); sfx(ev.ctype === 'summon' ? 'horn' : ev.ctype === 'skill' ? 'ready' : 'deploy'); }, 60); break;
        case 'phase': at(() => { banner(ev.phase === 'ally' ? 'Your allies strike' : 'Enemy turn', ev.phase === 'ally' ? 'ally' : 'enemy'); sfx(ev.phase === 'enemy' ? 'horn' : 'ready'); }, 480); break;
        case 'dmg': at(() => {
          if (sref && (ev.kind === 'attack')) lunge(sref.cell, tref && tref.cell);
          if (tref) {
            flashHit(tref.cell);
            if (ev.amt > 0) {
              floatText(tref.cell, '-' + ev.amt, FLOAT_CLS[ev.kind] || 'f-dmg');
              if (cur[ev.tgt] != null) { cur[ev.tgt] -= ev.amt; setBar(tref, cur[ev.tgt]); }
              const big = ev.amt >= 12;
              if (ev.kind === 'attack') { sfx(big ? 'bigHit' : 'hit'); shakeArena(big); }
              else if (ev.kind === 'poison' || ev.kind === 'detonate') sfx('breath');
            } else { floatText(tref.cell, ev.blocked ? '🛡 blocked' : '0', 'f-block'); sfx('hit'); }
          }
        }, ev.kind === 'poison' || ev.kind === 'detonate' ? 220 : 260); break;
        case 'heal': at(() => { if (tref) { floatText(tref.cell, '+' + ev.amt, 'f-heal'); if (cur[ev.tgt] != null) { cur[ev.tgt] += ev.amt; setBar(tref, cur[ev.tgt]); } sfx('ready'); } }, 210); break;
        case 'block': at(() => { if (tref) { floatText(tref.cell, '🛡+' + ev.amt, 'f-block'); shieldPulse(tref.cell); } }, 150); break;
        case 'status': at(() => { if (tref) floatText(tref.cell, statusFloat(ev.key, ev.amt), 'f-status'); }, 140); break;
        case 'summon': case 'spawn': at(() => { popIn(tref && tref.cell); sfx('deploy'); }, 200); break;
        case 'die': at(() => { fadeDie(tref && tref.cell); sfx('death'); }, 320); break;
        case 'ward': at(() => { banner('Saved!', 'ally'); sfx('relicPick'); }, 240); break;
        default: break;
      }
    });
    at(() => { if (fxToken !== my) return; if (lockInput) setInputLocked(false); if (runHost && runHost.isConnected) paintRun(runHost); }, 90);
  }

  /* battle actions route through here so input locks during the enemy phase */
  function battleAct(action) { if (inputLocked) return; S.act(action); }

  /* ================= AMBIENT BACKGROUND =================
     A living Pia'don sky behind every screen of the mode: a tinted
     gradient, drifting nebulae, a soft celestial orb, a twinkling
     starfield, and element-flavored particles (embers rise on Eldi,
     bubbles on Su, motes drift on Ular, wind streaks race on Fti;
     the home screen gets the whole cosmos). One canvas per screen,
     torn down on leave. Pure decoration — wrapped so it can never
     break the game. */
  let bgStop = null;
  const BG_THEMES = {
    cosmos: { sky: ['#0c0a16', '#161022'], orb: '#d9b87a', neb: ['#3a2f5e', '#5e3a3a'], particle: '#d9b87a', mode: 'drift' },
    Su:     { sky: ['#071820', '#0c2430'], orb: '#3b9ae1', neb: ['#134b5e', '#0f3550'], particle: '#8ad0f0', mode: 'rise' },
    Ular:   { sky: ['#101706', '#182210'], orb: '#4caf50', neb: ['#2e5220', '#3a4a1c'], particle: '#a8d878', mode: 'drift' },
    Eldi:   { sky: ['#1a0c06', '#26120a'], orb: '#e8842c', neb: ['#5e3320', '#5e2020'], particle: '#ffb060', mode: 'ember' },
    Fti:    { sky: ['#12141a', '#1c2028'], orb: '#e8ecf5', neb: ['#3a4256', '#2e3646'], particle: '#e8f0ff', mode: 'wind' },
  };
  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function startBg(container, theme) {
    stopBg();
    try {
      const P = BG_THEMES[theme] || BG_THEMES.cosmos;
      const cv = U.el('canvas', { cls: 'pia-bg' });
      container.insertBefore(cv, container.firstChild);
      const ctx = cv.getContext('2d');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      let W = 0, H = 0, stars = [], motes = [], orbs = [], raf = 0, t0 = performance.now();
      function newMote() {
        const m = P.mode;
        if (m === 'wind') return { x: -20 - Math.random() * W, y: Math.random() * H, len: 30 + Math.random() * 60, v: 120 + Math.random() * 160, a: 0.05 + Math.random() * 0.12 };
        if (m === 'rise' || m === 'ember') return { x: Math.random() * W, y: H + Math.random() * H, r: (m === 'ember' ? 1.4 : 1.8) + Math.random() * 2, v: 14 + Math.random() * 30, dx: (Math.random() - 0.5) * 12, a: 0.25 + Math.random() * 0.5, ph: Math.random() * 6.28 };
        return { x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2, v: 4 + Math.random() * 10, dx: (Math.random() - 0.5) * 8, a: 0.15 + Math.random() * 0.35, ph: Math.random() * 6.28 };
      }
      function rebuild() {
        stars = []; const ns = Math.round(W * H / 6500);
        for (let i = 0; i < ns; i++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.85, r: Math.random() * 1.3 + 0.2, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 1.1 });
        motes = []; const nm = Math.round(W / 22);
        for (let i = 0; i < nm; i++) { const mo = newMote(); if (P.mode === 'rise' || P.mode === 'ember') mo.y = Math.random() * H; motes.push(mo); }
        orbs = [{ x: W * 0.74, y: H * 0.24, r: Math.min(W, H) * 0.3, c: P.orb, drift: 0.02 }];
        if (theme === 'cosmos') { orbs.push({ x: W * 0.2, y: H * 0.7, r: Math.min(W, H) * 0.16, c: '#5e6ea8', drift: 0.03 }); orbs.push({ x: W * 0.5, y: H * 0.4, r: Math.min(W, H) * 0.1, c: '#a8607a', drift: 0.05 }); }
      }
      function resize() {
        W = container.clientWidth || window.innerWidth; H = container.clientHeight || window.innerHeight;
        cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); rebuild();
      }
      function frame(now) {
        if (!cv.isConnected) { cancelAnimationFrame(raf); return; }
        const t = (now - t0) / 1000, dt = 1 / 60;
        // sky
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, P.sky[0]); g.addColorStop(1, P.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // nebulae (slow breathing blobs)
        for (let i = 0; i < 2; i++) {
          const nx = W * (0.3 + 0.4 * i) + Math.sin(t * 0.05 + i) * 60;
          const ny = H * (0.35 + 0.2 * i) + Math.cos(t * 0.04 + i) * 40;
          const rr = Math.min(W, H) * (0.4 + 0.1 * Math.sin(t * 0.1 + i));
          const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, rr);
          ng.addColorStop(0, hexA(P.neb[i % P.neb.length], 0.28));
          ng.addColorStop(1, hexA(P.neb[i % P.neb.length], 0));
          ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
        }
        // orbs (planets / sun)
        orbs.forEach(o => {
          const ox = o.x + Math.sin(t * o.drift) * 20, oy = o.y + Math.cos(t * o.drift) * 12;
          const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, o.r);
          og.addColorStop(0, hexA(o.c, 0.5)); og.addColorStop(0.5, hexA(o.c, 0.14)); og.addColorStop(1, hexA(o.c, 0));
          ctx.fillStyle = og; ctx.beginPath(); ctx.arc(ox, oy, o.r, 0, 6.29); ctx.fill();
        });
        // stars
        for (const s of stars) {
          const a = 0.35 + 0.55 * Math.abs(Math.sin(t * s.sp + s.ph));
          ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.29); ctx.fill();
        }
        // particles
        ctx.save();
        if (P.mode === 'ember') ctx.globalCompositeOperation = 'lighter';
        for (const m of motes) {
          if (P.mode === 'wind') {
            m.x += m.v * dt; if (m.x > W + 40) { Object.assign(m, newMote()); m.x = -30; }
            ctx.strokeStyle = hexA(P.particle, m.a); ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.len, m.y + 2); ctx.stroke();
          } else if (P.mode === 'rise' || P.mode === 'ember') {
            m.y -= m.v * dt; m.x += Math.sin(t + m.ph) * 0.4 + m.dx * dt;
            if (m.y < -10) { Object.assign(m, newMote()); m.y = H + 10; }
            ctx.fillStyle = hexA(P.particle, m.a);
            ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.29); ctx.fill();
          } else {
            m.y -= m.v * dt * 0.4; m.x += Math.sin(t * 0.5 + m.ph) * 0.3 + m.dx * dt;
            if (m.y < -10) { Object.assign(m, newMote()); m.y = H + 10; }
            ctx.fillStyle = hexA(P.particle, m.a);
            ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.29); ctx.fill();
          }
        }
        ctx.restore();
        // horizon glow
        const hg = ctx.createLinearGradient(0, H, 0, H * 0.72);
        hg.addColorStop(0, hexA(P.orb, 0.16)); hg.addColorStop(1, hexA(P.orb, 0));
        ctx.fillStyle = hg; ctx.fillRect(0, H * 0.72, W, H * 0.28);
        raf = requestAnimationFrame(frame);
      }
      window.addEventListener('resize', resize);
      resize();
      raf = requestAnimationFrame(frame);
      bgStop = () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); cv.remove(); };
    } catch (e) { /* ambiance must never break the game */ }
  }
  function stopBg() { if (bgStop) { try { bgStop(); } catch (e) { } bgStop = null; } }
  function planetTheme() { const run = S.run; return (run && D.planet(run.planet)) ? D.planet(run.planet).element : 'cosmos'; }

  /* ================= HOME / GUARDIAN SELECT ================= */
  UI.register('pia', {
    enter(root) {
      targeting = null;
      const scr = U.el('div', { cls: 'screen pia-home' });
      startBg(scr, 'cosmos');
      const bar = UI.topbar({ title: "Legends of Pia'don" });
      scr.appendChild(bar);
      const back = U.el('div', { cls: 'back-arrow', text: '‹', style: 'position:absolute;top:70px;left:18px;font-size:30px;z-index:3', onclick: () => UI.show('menu') });
      scr.appendChild(back);

      const wrap = U.el('div', { cls: 'pia-home-wrap' });
      wrap.appendChild(U.el('div', { cls: 'pia-title', text: "LEGENDS OF PIA'DON" }));
      wrap.appendChild(U.el('div', { cls: 'pia-sub muted', text: 'A card-and-Vaelk gauntlet across the three sister worlds. Draft a deck, call creatures to your side, and run a planet’s great Quarry to ground — alone, or with up to three Guardians.' }));

      /* resume a solo run in progress */
      const saved = R.loadSolo();
      if (saved && saved.phase !== 'gameover' && saved.phase !== 'win') {
        const g = D.guardian(saved.players[0].guardianId);
        const rc = U.el('div', { cls: 'pia-resume panel' }, [
          U.el('div', { html: '<b class="gold">Run in progress</b> — ' + U.esc(g ? g.name : '') + ' on ' + U.esc(D.planet(saved.planet).name) + ', floor ' + (saved.floor + 1) }),
        ]);
        const rr = U.el('div', { cls: 'flex mt' });
        rr.appendChild(U.el('button', { cls: 'btn', text: '▶ Resume', onclick: () => { S.resumeSolo(saved); openRun(); } }));
        rr.appendChild(U.el('button', { cls: 'btn ghost', text: 'Abandon', onclick: () => { R.clearSolo(); UI.show('pia'); } }));
        rc.appendChild(rr);
        wrap.appendChild(rc);
      }

      /* Guardian picker */
      let chosen = D.GUARDIANS[0].id;
      const gGrid = U.el('div', { cls: 'pia-guard-grid' });
      const detail = U.el('div', { cls: 'pia-guard-detail panel' });
      function paintDetail() {
        const g = D.guardian(chosen);
        detail.innerHTML = '';
        detail.appendChild(guardArt(g, 120, 'idle'));
        detail.appendChild(U.el('div', { cls: 'pia-gd-name gold', text: g.name + ' — ' + g.title }));
        detail.appendChild(U.el('div', { cls: 'pill', text: g.element + ' · ' + D.ELEMENT_NAMES[g.element] + ' · ' + g.maxHp + ' HP' }));
        detail.appendChild(U.el('div', { cls: 'muted mt', text: g.blurb }));
        const relic = D.relic(g.startRelic);
        if (relic) detail.appendChild(U.el('div', { cls: 'pia-relic-line mt', html: relic.icon + ' <b>' + U.esc(relic.name) + '</b> — ' + U.esc(relic.text) }));
        /* starting deck summary */
        const counts = g.deck;
        const deckLine = Object.keys(counts).map(id => (counts[id] + '× ' + D.card(id).name)).join(', ');
        detail.appendChild(U.el('div', { cls: 'small muted mt', html: '<b>Opening deck:</b> ' + U.esc(deckLine) }));
      }
      D.GUARDIANS.forEach(g => {
        const cell = U.el('div', { cls: 'pia-guard-cell' });
        cell.appendChild(guardArt(g, 64, 'idle'));
        cell.appendChild(U.el('div', { cls: 'small', text: g.name }));
        cell.appendChild(U.el('div', { cls: 'tiny muted', text: D.ELEMENT_NAMES[g.element] }));
        cell.onclick = () => { chosen = g.id; U.qsa('.pia-guard-cell', gGrid).forEach(c => c.classList.remove('sel')); cell.classList.add('sel'); paintDetail(); DYA.audio.play('click'); };
        if (g.id === chosen) cell.classList.add('sel');
        gGrid.appendChild(cell);
      });
      paintDetail();

      const cols = U.el('div', { cls: 'pia-home-cols' });
      const leftCol = U.el('div', {}, [U.el('h3', { cls: 'gold mb', text: 'Choose your Guardian' }), gGrid]);
      cols.appendChild(leftCol);
      cols.appendChild(detail);
      wrap.appendChild(cols);

      /* planet picker */
      wrap.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Choose a world' }));
      let planet = D.PLANETS[0].id;
      const pRow = U.el('div', { cls: 'pia-planet-row' });
      D.PLANETS.forEach(pl => {
        const c = U.el('div', { cls: 'pia-planet-cell' + (pl.id === planet ? ' sel' : '') });
        c.appendChild(U.el('div', { cls: 'pp-name', text: pl.name }));
        c.appendChild(U.el('div', { cls: 'pill el-' + pl.element, text: D.ELEMENT_NAMES[pl.element] }));
        c.appendChild(U.el('div', { cls: 'tiny muted mt', text: pl.blurb }));
        c.onclick = () => { planet = pl.id; U.qsa('.pia-planet-cell', pRow).forEach(x => x.classList.remove('sel')); c.classList.add('sel'); };
        pRow.appendChild(c);
      });
      wrap.appendChild(pRow);

      /* actions */
      const acts = U.el('div', { cls: 'pia-home-acts mt' });
      acts.appendChild(U.el('button', { cls: 'btn big', text: '⚔ Play Solo', onclick: () => { R.clearSolo(); S.startSolo(chosen, planet); openRun(); } }));
      acts.appendChild(U.el('button', { cls: 'btn big', text: '👥 Host Co-op', onclick: () => UI.requireOnline(() => openLobbyHost(planet, chosen)) }));
      acts.appendChild(U.el('button', { cls: 'btn big ghost', text: '🔑 Join Co-op', onclick: () => UI.requireOnline(() => promptJoin()) }));
      wrap.appendChild(acts);
      wrap.appendChild(U.el('div', { cls: 'tiny muted mt', text: 'Co-op scales the foes to your party — bigger packs, and a Quarry that seats guards for every extra Guardian.' }));

      scr.appendChild(wrap);
      root.appendChild(scr);
    },
    leave() { stopBg(); },
  });

  function promptJoin() {
    const wrap = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'Join a Co-op Run' }), U.el('p', { cls: 'muted', text: 'Enter the 5-letter room code from your host.' })]);
    const input = U.el('input', { cls: 'input', maxlength: 5, placeholder: 'CODE', style: 'text-transform:uppercase;letter-spacing:6px;font-size:20px;text-align:center' });
    wrap.appendChild(input);
    const m = UI.modal(wrap);
    const row = U.el('div', { cls: 'flex mt' });
    row.appendChild(U.el('button', { cls: 'btn', text: 'Join', onclick: () => {
      const code = input.value.trim().toUpperCase(); if (code.length < 4) return;
      m.close();
      UI.loading(true);
      C.join(code).then(() => { UI.loading(false); openLobbyClient(); }).catch(err => { UI.loading(false); UI.alert('Could not join', err.message || String(err)); });
    } }));
    row.appendChild(U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => m.close() }));
    wrap.appendChild(row);
    setTimeout(() => input.focus(), 50);
  }

  function openLobbyHost(planet, guardianId) {
    UI.loading(true);
    C.host(planet).then((code) => {
      UI.loading(false);
      C.setGuardian(guardianId);
      wireLobby();
      UI.show('piaLobby');
    }).catch(err => { UI.loading(false); UI.alert('Could not host', err.message || String(err)); });
  }
  function openLobbyClient() { wireLobby(); UI.show('piaLobby'); }

  function wireLobby() {
    C.onLobby = () => { if (UI.currentName === 'piaLobby') UI.show('piaLobby'); };
    C.onStart = () => { openRun(); };
    C.onError = (msg) => { UI.alert('Co-op', msg); };
  }

  /* ================= CO-OP LOBBY ================= */
  UI.register('piaLobby', {
    enter(root) {
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Co-op Lobby' }));
      const wrap = U.el('div', { cls: 'pia-lobby-wrap panel' });
      wrap.appendChild(U.el('div', { cls: 'flex', style: 'align-items:center;gap:12px' }, [
        U.el('h2', { cls: 'gold', text: 'Room ' }),
        U.el('div', { cls: 'pia-code', text: C.code || '—' }),
        U.el('button', { cls: 'btn small ghost', text: 'Copy', onclick: () => { try { navigator.clipboard.writeText(C.code); UI.toast({ title: 'Copied', body: 'Room code copied.', icon: '📋' }); } catch (e) { } } }),
      ]));
      const pl = D.planet((C.lobby && C.lobby.planet) || 'velki');
      wrap.appendChild(U.el('div', { cls: 'muted', text: 'World: ' + pl.name + ' · ' + D.ELEMENT_NAMES[pl.element] + '. Up to 3 Guardians.' }));

      /* roster */
      const roster = U.el('div', { cls: 'pia-roster mt' });
      C.roster().forEach(p => {
        const g = D.guardian(p.guardianId);
        const row = U.el('div', { cls: 'pia-roster-row' + (p.id === C.myId ? ' me' : '') });
        row.appendChild(guardArt(g, 44, 'idle'));
        row.appendChild(U.el('div', {}, [
          U.el('div', { text: p.name + (p.id === C.lobby.hostId ? ' (host)' : '') }),
          U.el('div', { cls: 'tiny muted', text: g.name + ' · ' + D.ELEMENT_NAMES[g.element] }),
        ]));
        row.appendChild(U.el('div', { cls: 'spacer' }));
        row.appendChild(U.el('div', { cls: 'pia-ready ' + (p.ready || p.id === C.lobby.hostId ? 'on' : 'off'), text: (p.id === C.lobby.hostId) ? '★ host' : (p.ready ? '✓ ready' : '… waiting') }));
        roster.appendChild(row);
      });
      wrap.appendChild(roster);

      /* my guardian picker */
      wrap.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Your Guardian' }));
      const gRow = U.el('div', { cls: 'pia-guard-grid' });
      const mine = C.roster().find(p => p.id === C.myId);
      D.GUARDIANS.forEach(g => {
        const cell = U.el('div', { cls: 'pia-guard-cell' + (mine && mine.guardianId === g.id ? ' sel' : '') });
        cell.appendChild(guardArt(g, 54, 'idle'));
        cell.appendChild(U.el('div', { cls: 'tiny', text: g.name }));
        cell.onclick = () => { C.setGuardian(g.id); UI.show('piaLobby'); };
        gRow.appendChild(cell);
      });
      wrap.appendChild(gRow);

      /* actions */
      const acts = U.el('div', { cls: 'flex mt' });
      if (!C.isHost) {
        const meRow = C.roster().find(p => p.id === C.myId);
        acts.appendChild(U.el('button', { cls: 'btn', text: (meRow && meRow.ready) ? 'Unready' : '✓ Ready', onclick: () => { C.toggleReady(); UI.show('piaLobby'); } }));
      } else {
        const canStart = C.everyoneReady();
        const startBtn = U.el('button', { cls: 'btn big', text: '▶ Begin the Hunt', onclick: () => { C.start(); } });
        if (!canStart) { startBtn.disabled = true; startBtn.title = 'Waiting for all Guardians to ready up.'; }
        acts.appendChild(startBtn);
      }
      acts.appendChild(U.el('button', { cls: 'btn ghost', text: 'Leave', onclick: () => { C.leave(); UI.show('pia'); } }));
      wrap.appendChild(acts);
      if (C.isHost && !C.everyoneReady()) wrap.appendChild(U.el('div', { cls: 'tiny muted mt', text: 'Others must ready up before you can begin.' }));

      scr.appendChild(wrap);
      root.appendChild(scr);
    },
  });

  /* ================= RUN SCREEN (umbrella) ================= */
  function openRun() { UI.show('piaRun'); }

  UI.register('piaRun', {
    enter(root) {
      targeting = null;
      const scr = U.el('div', { cls: 'screen pia-run' });
      const host = U.el('div', { id: 'pia-root' });
      scr.appendChild(host);
      root.appendChild(scr);
      startBg(scr, planetTheme());
      S.onUpdate = () => paintRun(host);
      paintRun(host);
    },
    leave() { S.onUpdate = null; stopBg(); },
  });

  function paintRun(host) {
    if (!host || !host.isConnected) return;
    runHost = host;
    const run = S.run; if (!run) { UI.show('pia'); return; }
    /* phase-transition flourishes + bookkeeping */
    const prevPhase = lastPhase; lastPhase = run.phase;
    if (prevPhase === 'battle' && run.phase !== 'battle') {
      if (run.phase === 'win') flourish('quarry');
      else if (run.phase === 'reward') flourish('victory');
      else if (run.phase === 'gameover') flourish('defeat');
    }
    if (prevPhase !== 'battle' && run.phase === 'battle') lastHandTurn = -1; // deal in the opening hand
    /* a phase change other than battle-staying clears any leftover input lock */
    if (run.phase !== 'battle') { if (inputLocked) setInputLocked(false); lastEventsRef = null; }
    host.innerHTML = '';
    switch (run.phase) {
      case 'map': host.appendChild(renderMap(run)); break;
      case 'battle': {
        const b = run.battle;
        const hasNew = b && b.events && b.events.length && b.events !== lastEventsRef;
        host.appendChild(renderBattle(run, hasNew ? dyingSet(b) : EMPTY_SET));
        if (hasNew) { lastEventsRef = b.events; requestAnimationFrame(() => runTimeline(b)); }
        break;
      }
      case 'reward': host.appendChild(renderReward(run)); break;
      case 'rest': host.appendChild(renderRest(run)); break;
      case 'shop': host.appendChild(renderShop(run)); break;
      case 'treasure': host.appendChild(renderTreasure(run)); break;
      case 'win': host.appendChild(renderEnd(run, true)); break;
      case 'gameover': host.appendChild(renderEnd(run, false)); break;
      default: host.appendChild(U.el('div', { text: '…' }));
    }
  }

  function runHeader(run, title) {
    const bar = U.el('div', { cls: 'pia-hud' });
    bar.appendChild(U.el('div', { cls: 'logo', text: "PIA'DON", onclick: () => leaveRun() }));
    bar.appendChild(U.el('div', { cls: 'muted', text: '— ' + (title || '') }));
    bar.appendChild(U.el('div', { cls: 'spacer' }));
    const me = R.player(run, S.myId) || run.players[0];
    if (me) {
      bar.appendChild(U.el('span', { cls: 'res-chip', html: '❤ <b>' + me.hp + '</b>/' + me.maxHp }));
      bar.appendChild(U.el('span', { cls: 'res-chip', html: '🪙 <b>' + me.gold + '</b>' }));
      bar.appendChild(U.el('span', { cls: 'res-chip', html: '🎴 <b>' + me.deck.length + '</b>' }));
      me.relics.forEach(rid => { const r = D.relic(rid); if (r) bar.appendChild(U.el('span', { cls: 'pia-relic-chip', title: r.name + ' — ' + r.text, text: r.icon })); });
    }
    if (run.mode === 'coop') bar.appendChild(U.el('span', { cls: 'res-chip', html: '👥 <b>' + run.players.length + '</b>' }));
    bar.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Quit', onclick: () => leaveRun() }));
    return bar;
  }

  function leaveRun() {
    UI.confirm('Leave the run?', 'Solo progress is saved and can be resumed. A co-op run you leave goes on without you.', () => {
      if (run_mode() === 'coop') C.leave();
      S.onUpdate = null;
      UI.show('pia');
    }, 'Leave');
  }
  function run_mode() { return S.run ? S.run.mode : 'solo'; }

  /* ---------- MAP ---------- */
  function renderMap(run) {
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, D.planet(run.planet).name + ' — the climb'));
    const body = U.el('div', { cls: 'pia-map' });
    body.appendChild(U.el('div', { cls: 'pia-map-tip muted', text: 'Choose your next step. Higher floors run deeper toward the Quarry.' }));
    const avail = run.available || [];
    /* floors from top (boss) to bottom (start) */
    for (let f = run.map.floors.length - 1; f >= 0; f--) {
      const rowEl = U.el('div', { cls: 'pia-map-floor' });
      rowEl.appendChild(U.el('div', { cls: 'pia-floor-label tiny muted', text: f === run.map.floors.length - 1 ? 'QUARRY' : ('F' + (f + 1)) }));
      const nodesEl = U.el('div', { cls: 'pia-floor-nodes' });
      run.map.floors[f].forEach(node => {
        const isAvail = avail.indexOf(node.id) >= 0;
        const isCurrent = run.currentNodeId === node.id;
        const nEl = U.el('div', { cls: 'pia-node ' + node.type + (isAvail ? ' avail' : '') + (isCurrent ? ' current' : ''), title: nodeLabel(node) });
        nEl.appendChild(U.el('div', { cls: 'pia-node-icon', text: NODE_ICON[node.type] || '⚔' }));
        if (isAvail) nEl.onclick = () => { S.act({ type: 'enterNode', nodeId: node.id }); };
        nodesEl.appendChild(nEl);
      });
      rowEl.appendChild(nodesEl);
      body.appendChild(rowEl);
    }
    wrap.appendChild(body);
    return wrap;
  }
  function nodeLabel(node) {
    return ({ battle: 'Battle', elite: 'Elite fight', boss: 'The Quarry', rest: 'Rest site', event: 'Rest site', merchant: 'Merchant', treasure: 'Treasure' })[node.type] || node.type;
  }

  /* ---------- BATTLE ---------- */
  function renderBattle(run, dying) {
    const b = run.battle;
    dying = dying || EMPTY_SET;
    fxRefs = {};                       // fresh element registry for this paint
    const wrap = U.el('div', { cls: 'pia-battle' });
    wrap.appendChild(runHeader(run, 'Battle · turn ' + b.turn));

    const arena = U.el('div', { cls: 'pia-arena' });

    /* enemies (include any that die in the pending batch, for the death anim) */
    const enemyRow = U.el('div', { cls: 'pia-enemy-row' });
    b.enemies.filter(e => e.hp > 0 || dying.has(e.uid)).forEach(e => enemyRow.appendChild(renderEnemy(b, e)));
    arena.appendChild(enemyRow);

    /* allies (summons) */
    const allies = b.allies.filter(a => a.hp > 0 || dying.has(a.uid));
    if (allies.length) {
      const allyRow = U.el('div', { cls: 'pia-ally-row' });
      allies.forEach(a => allyRow.appendChild(renderAlly(b, a)));
      arena.appendChild(allyRow);
    }

    /* guardians */
    const gRow = U.el('div', { cls: 'pia-guardian-row' });
    b.players.forEach(p => gRow.appendChild(renderGuardian(b, p)));
    arena.appendChild(gRow);

    wrap.appendChild(arena);

    /* my hand + controls */
    const me = EN.playerById(b, S.myId) || b.players[0];
    const isMine = me && me.id === S.myId;
    const foot = U.el('div', { cls: 'pia-foot' });

    if (me) {
      /* energy + end turn */
      const ctrl = U.el('div', { cls: 'pia-ctrl' });
      ctrl.appendChild(energyOrbs(me));
      if (targeting != null) {
        ctrl.appendChild(U.el('div', { cls: 'pia-targeting', text: 'Pick a target enemy…' }));
        ctrl.appendChild(U.el('button', { cls: 'btn small ghost', text: 'Cancel', onclick: () => { targeting = null; S.onUpdate && S.onUpdate(); } }));
      } else if (isMine && !me.ended && !me.dead) {
        ctrl.appendChild(U.el('button', { cls: 'btn', text: 'End Turn ▶', onclick: () => { targeting = null; battleAct({ type: 'endTurn', playerId: me.id }); } }));
      } else if (me.dead) {
        ctrl.appendChild(U.el('div', { cls: 'muted', text: 'You have fallen. The others fight on…' }));
      } else if (me.ended) {
        ctrl.appendChild(U.el('div', { cls: 'muted', text: 'Turn ended — waiting for the party…' }));
      }
      foot.appendChild(ctrl);

      /* hand — deals in with a stagger at the top of a fresh turn */
      const handEl = U.el('div', { cls: 'pia-hand' });
      const freshTurn = isMine && !me.dead && !me.ended && b.phase === 'player' && b.turn !== lastHandTurn;
      if (isMine && !me.dead) {
        me.hand.forEach((inst, idx) => {
          const c = renderCard(b, me, inst, idx);
          if (freshTurn) { c.classList.add('pia-dealt'); c.style.animationDelay = (idx * 55) + 'ms'; }
          handEl.appendChild(c);
        });
      } else {
        handEl.appendChild(U.el('div', { cls: 'muted', style: 'padding:20px', text: me.dead ? 'Defeated.' : 'This Guardian is played by someone else.' }));
      }
      foot.appendChild(handEl);
      if (freshTurn) {
        lastHandTurn = b.turn;
        if (b.turn > 1) setTimeout(() => { if (S.run && S.run.phase === 'battle' && !inputLocked) { banner('Your Turn', 'you'); sfx('pulse'); } }, 140);
      }
    }
    wrap.appendChild(foot);

    /* combat log */
    const logEl = U.el('div', { cls: 'pia-log' });
    b.log.slice(-4).forEach(l => logEl.appendChild(U.el('div', { text: l })));
    wrap.appendChild(logEl);
    return wrap;
  }

  function intentText(b, e) {
    const m = e.intent; if (!m) return '';
    const scale = e.dmgScale || 1;
    if (m.intent === 'attack' || (m.intent === 'debuff' && m.dmg)) {
      let d = Math.round(m.dmg * scale) + (e.st.str || 0);
      const hits = m.hits || 1;
      return hits > 1 ? (d + '×' + hits) : String(d);
    }
    if (m.intent === 'block') return String(m.block || 0);
    if (m.intent === 'buff') return '+' + (m.str || 0);
    if (m.intent === 'summon') return '+' + (m.count || 1);
    return '';
  }

  function renderEnemy(b, e) {
    const sp = SP.get(e.species);
    const cell = U.el('div', { cls: 'pia-enemy' + (e.boss ? ' boss' : e.elite ? ' elite' : '') + (targeting != null ? ' targetable' : '') });
    /* intent badge */
    const m = e.intent; const info = m ? (INTENT[m.intent] || INTENT.attack) : null;
    if (info) {
      const badge = U.el('div', { cls: 'pia-intent ' + info.cls, title: (m.name || m.intent) });
      badge.appendChild(U.el('span', { cls: 'pi-icon', text: info.icon }));
      const t = intentText(b, e); if (t) badge.appendChild(U.el('span', { cls: 'pi-val', text: t }));
      cell.appendChild(badge);
    }
    const size = e.boss ? 176 : e.elite ? 116 : 92;
    cell.appendChild(UI.tokenArt(e.species, size, 'idle', e.heads, null));
    cell.appendChild(U.el('div', { cls: 'pia-name', text: e.name }));
    const bar = hpBar(e.hp, e.maxHp, e.block);
    cell.appendChild(bar);
    cell.appendChild(statusRow(e.st));
    regRef(e.uid, cell, bar._fill, bar._text, e.maxHp, e.hp);
    if (targeting != null) cell.onclick = () => {
      if (inputLocked) return;
      const me = EN.playerById(b, S.myId); const idx = targeting; targeting = null;
      const handEl = runHost && runHost.querySelector('.pia-hand');
      const cardEl = handEl && handEl.children[idx];
      const ec = cell.getBoundingClientRect();
      flyCard(cardEl, ec.left + ec.width / 2, ec.top + ec.height / 2);
      battleAct({ type: 'playCard', playerId: me.id, handIdx: idx, targetUid: e.uid });
    };
    return cell;
  }

  function renderAlly(b, a) {
    const cell = U.el('div', { cls: 'pia-ally' });
    cell.appendChild(UI.tokenArt(a.species, 74, 'idle', null, null));
    cell.appendChild(U.el('div', { cls: 'pia-name tiny', text: a.name + (a.str ? ' +' + a.str : '') }));
    const bar = hpBar(a.hp, a.maxHp, a.block);
    cell.appendChild(bar);
    const tags = [];
    if (a.dmg) tags.push('⚔' + (a.dmg + a.str));
    if (a.taunt) tags.push('🛡taunt');
    if (a.healAlly) tags.push('✚' + a.healAlly);
    cell.appendChild(U.el('div', { cls: 'tiny muted', text: tags.join(' ') }));
    regRef(a.uid, cell, bar._fill, bar._text, a.maxHp, a.hp);
    return cell;
  }

  function renderGuardian(b, p) {
    const g = D.guardian(p.guardianId);
    const cell = U.el('div', { cls: 'pia-guardian' + (p.id === S.myId ? ' me' : '') + (p.dead ? ' dead' : '') + (p.ended ? ' ended' : '') });
    cell.appendChild(guardArt(g, 96, p.dead ? 'death' : 'idle'));
    cell.appendChild(U.el('div', { cls: 'pia-name', text: p.name + (p.id === S.myId ? ' (you)' : '') }));
    const bar = hpBar(p.hp, p.maxHp, p.block);
    cell.appendChild(bar);
    cell.appendChild(statusRow(p.st, true));
    regRef(p.id, cell, bar._fill, bar._text, p.maxHp, p.hp);
    if (p.ended && !p.dead) cell.appendChild(U.el('div', { cls: 'tiny gold', text: '✓ ready' }));
    return cell;
  }

  function hpBar(hp, max, block) {
    const wrap = U.el('div', { cls: 'pia-hpwrap' });
    const bar = U.el('div', { cls: 'pia-hpbar' });
    const fill = U.el('div', { cls: 'pia-hpfill', style: 'width:' + Math.max(0, Math.round(100 * hp / max)) + '%' });
    bar.appendChild(fill);
    const text = U.el('div', { cls: 'pia-hptext', text: Math.max(0, hp) + '/' + max });
    bar.appendChild(text);
    wrap.appendChild(bar);
    if (block > 0) wrap.appendChild(U.el('div', { cls: 'pia-block', title: 'Block', text: '🛡' + block }));
    wrap._fill = fill; wrap._text = text;   // for the animation registry
    return wrap;
  }

  function statusRow(st, isPlayer) {
    const row = U.el('div', { cls: 'pia-status' });
    const add = (cond, cls, label, title) => { if (cond) row.appendChild(U.el('span', { cls: 'pia-st ' + cls, title: title, text: label })); };
    add(st.poison, 'st-poison', '☠' + st.poison, 'Poison');
    add(st.vuln, 'st-vuln', '⤈' + st.vuln, 'Vulnerable (+50% damage taken)');
    add(st.weak, 'st-weak', '⬇' + st.weak, 'Weak (-25% damage dealt)');
    if (isPlayer) { add(st.str, 'st-str', '💪' + st.str, 'Strength'); add(st.regen, 'st-regen', '✚' + st.regen, 'Regen'); add(st.dex, 'st-dex', '✧' + st.dex, 'Dexterity'); }
    else add(st.str, 'st-str', '💪' + st.str, 'Strength');
    return row;
  }

  function renderCard(b, p, inst, idx) {
    const card = EN.mergedCard(inst);
    const cost = EN.cardCost(b, p.id, card);
    const playable = p.id === S.myId && !p.ended && !p.dead && p.energy >= cost;
    const el = U.el('div', { cls: 'pia-card t-' + card.type + (card.upg ? ' upg' : '') + (playable ? '' : ' disabled') });
    el.appendChild(U.el('div', { cls: 'pia-card-cost', text: cost }));
    el.appendChild(U.el('div', { cls: 'pia-card-type', text: card.type }));
    if (card.type === 'summon') {
      const keys = Array.isArray(card.summon) ? card.summon : [card.summon];
      const s = D.summonDef(keys[0]);
      if (s) el.appendChild(UI.tokenArt(s.species, 46, 'idle', null, null));
    }
    el.appendChild(U.el('div', { cls: 'pia-card-name', text: card.name }));
    el.appendChild(U.el('div', { cls: 'pia-card-text', text: cardText(card) }));
    if (playable) el.onclick = () => {
      if (inputLocked) return;
      if (needsTargetUI(card)) { targeting = idx; sfx('hover'); S.onUpdate && S.onUpdate(); }
      else {
        const dest = arenaPoint(card.type === 'attack' ? 0.22 : 0.82);
        flyCard(el, dest.x, dest.y);
        battleAct({ type: 'playCard', playerId: p.id, handIdx: idx, targetUid: null });
      }
    };
    return el;
  }
  function cardText(card) {
    /* prefer the authored text; upgraded cards note it */
    return (card.text || '') + (card.upg ? '  (upgraded)' : '');
  }
  function needsTargetUI(card) {
    if (card.type === 'summon') return false;
    const e = card.e || {};
    if (e.aoe || e.poisonAll || e.detonatePoison || card.target === 'allEnemies' || card.target === 'self') return false;
    return !!(e.damage || e.poison || e.vuln || e.weak);
  }

  /* ---------- REWARD ---------- */
  function renderReward(run) {
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, 'Victory — spoils'));
    const me = R.player(run, S.myId) || run.players[0];
    const body = U.el('div', { cls: 'pia-reward panel' });
    body.appendChild(U.el('h2', { cls: 'gold', text: 'The field is yours.' }));

    if (me && me.relicReward) {
      const r = D.relic(me.relicReward);
      const rc = U.el('div', { cls: 'pia-relic-offer mt' }, [
        U.el('div', { html: r.icon + ' <b>' + U.esc(r.name) + '</b> — ' + U.esc(r.text) }),
        U.el('button', { cls: 'btn small', text: 'Take relic', onclick: () => { S.act({ type: 'takeRelic', accept: true }); } }),
      ]);
      body.appendChild(rc);
    }

    if (me && !me.rewardTaken && me.rewardChoices) {
      body.appendChild(U.el('div', { cls: 'muted mt', text: 'Add a card to your deck — choose one, or skip.' }));
      const row = U.el('div', { cls: 'pia-reward-cards' });
      me.rewardChoices.forEach(cid => {
        const c = renderStaticCard(cid);
        c.onclick = () => { S.act({ type: 'takeReward', cardId: cid }); };
        row.appendChild(c);
      });
      body.appendChild(row);
      body.appendChild(U.el('button', { cls: 'btn ghost mt', text: 'Skip card', onclick: () => { S.act({ type: 'takeReward', cardId: null }); } }));
    } else {
      body.appendChild(U.el('div', { cls: 'gold mt', text: 'Reward taken. ' + (run.mode === 'coop' ? 'Waiting for the party…' : '') }));
    }

    if (run.mode === 'coop') body.appendChild(partyPending(run, p => p.rewardTaken || p.hp <= 0));
    wrap.appendChild(body);
    return wrap;
  }

  function renderStaticCard(cardId) {
    const card = D.card(cardId);
    const el = U.el('div', { cls: 'pia-card t-' + card.type + ' static' });
    el.appendChild(U.el('div', { cls: 'pia-card-cost', text: (card.cost || 0) }));
    el.appendChild(U.el('div', { cls: 'pia-card-type', text: card.type }));
    if (card.type === 'summon') { const keys = Array.isArray(card.summon) ? card.summon : [card.summon]; const s = D.summonDef(keys[0]); if (s) el.appendChild(UI.tokenArt(s.species, 46, 'idle', null, null)); }
    el.appendChild(U.el('div', { cls: 'pia-card-name', text: card.name }));
    el.appendChild(U.el('div', { cls: 'pia-card-text', text: card.text || '' }));
    el.appendChild(U.el('div', { cls: 'tiny muted', text: card.rarity }));
    return el;
  }

  function partyPending(run, doneFn) {
    const row = U.el('div', { cls: 'pia-party-pending mt' });
    run.players.forEach(p => {
      row.appendChild(U.el('span', { cls: 'pill ' + (doneFn(p) ? 'done' : 'wait'), text: p.name + (doneFn(p) ? ' ✓' : ' …') }));
    });
    return row;
  }

  /* ---------- REST ---------- */
  function renderRest(run) {
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, 'Rest site'));
    const me = R.player(run, S.myId) || run.players[0];
    const body = U.el('div', { cls: 'pia-reward panel' });
    body.appendChild(U.el('h2', { cls: 'gold', text: 'A quiet fire.' }));
    body.appendChild(U.el('div', { cls: 'muted', text: 'Mend your wounds, or hone a card to its sharper truth.' }));
    if (me && !me.restDone) {
      const acts = U.el('div', { cls: 'flex mt' });
      acts.appendChild(U.el('button', { cls: 'btn', text: '🔥 Rest — heal ' + Math.round(me.maxHp * D.TUNE.restHeal) + ' HP', onclick: () => { S.act({ type: 'rest', mode: 'heal' }); } }));
      acts.appendChild(U.el('button', { cls: 'btn ghost', text: '⚒ Upgrade a card', onclick: () => openUpgrade(run, me) }));
      body.appendChild(acts);
    } else {
      body.appendChild(U.el('div', { cls: 'gold mt', text: 'Rested. ' + (run.mode === 'coop' ? 'Waiting for the party…' : '') }));
    }
    if (run.mode === 'coop') body.appendChild(partyPending(run, p => p.restDone || p.hp <= 0));
    wrap.appendChild(body);
    return wrap;
  }
  function openUpgrade(run, me) {
    const wrap = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'Upgrade a card' })]);
    const grid = U.el('div', { cls: 'pia-reward-cards', style: 'max-height:52vh;overflow:auto' });
    me.deck.forEach((c, i) => {
      const base = D.card(c.id); if (!base) return;
      const cell = renderStaticCard(c.id);
      if (c.upg || !base.upgrade) { cell.classList.add('disabled'); }
      else cell.onclick = () => { m.close(); S.act({ type: 'rest', mode: 'upgrade', deckIndex: i }); };
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
    const m = UI.modal(wrap);
    wrap.appendChild(U.el('button', { cls: 'btn ghost mt', text: 'Cancel', onclick: () => m.close() }));
  }

  /* ---------- SHOP ---------- */
  function renderShop(run) {
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, 'Merchant'));
    const me = R.player(run, S.myId) || run.players[0];
    const body = U.el('div', { cls: 'pia-reward panel' });
    body.appendChild(U.el('h2', { cls: 'gold', text: 'Wares of the road' }));
    body.appendChild(U.el('div', { cls: 'muted', text: 'Your gold: 🪙 ' + me.gold }));
    const cards = U.el('div', { cls: 'pia-reward-cards mt' });
    (run.shop.cards || []).forEach((item, i) => {
      const cell = renderStaticCard(item.id);
      const price = U.el('div', { cls: 'pia-price', text: item.sold ? 'SOLD' : ('🪙 ' + item.price) });
      cell.appendChild(price);
      if (!item.sold && me.gold >= item.price) cell.onclick = () => { S.act({ type: 'buyCard', idx: i }); };
      else if (!item.sold) cell.classList.add('disabled');
      else cell.classList.add('disabled');
      cards.appendChild(cell);
    });
    body.appendChild(cards);
    (run.shop.relics || []).forEach((item, i) => {
      const r = D.relic(item.id);
      const rc = U.el('div', { cls: 'pia-relic-offer mt' }, [
        U.el('div', { html: r.icon + ' <b>' + U.esc(r.name) + '</b> — ' + U.esc(r.text) + '  <span class="pia-price">' + (item.sold ? 'SOLD' : '🪙 ' + item.price) + '</span>' }),
      ]);
      if (!item.sold && me.gold >= item.price && me.relics.indexOf(item.id) < 0) rc.appendChild(U.el('button', { cls: 'btn small', text: 'Buy', onclick: () => { S.act({ type: 'buyRelic', idx: i }); } }));
      body.appendChild(rc);
    });
    body.appendChild(U.el('button', { cls: 'btn mt', text: 'Leave the merchant ▶', onclick: () => { S.act({ type: 'leaveShop' }); } }));
    wrap.appendChild(body);
    return wrap;
  }

  /* ---------- TREASURE ---------- */
  function renderTreasure(run) {
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, 'Treasure'));
    const me = R.player(run, S.myId) || run.players[0];
    const body = U.el('div', { cls: 'pia-reward panel' });
    body.appendChild(U.el('h2', { cls: 'gold', text: 'A cache in the rocks.' }));
    if (me && me.treasureRelic && !me.restDone) {
      const r = D.relic(me.treasureRelic);
      body.appendChild(U.el('div', { cls: 'pia-relic-offer mt' }, [U.el('div', { html: r.icon + ' <b>' + U.esc(r.name) + '</b> — ' + U.esc(r.text) })]));
      const acts = U.el('div', { cls: 'flex mt' });
      acts.appendChild(U.el('button', { cls: 'btn', text: 'Take it', onclick: () => { S.act({ type: 'takeTreasure', accept: true }); } }));
      acts.appendChild(U.el('button', { cls: 'btn ghost', text: 'Leave it', onclick: () => { S.act({ type: 'takeTreasure', accept: false }); } }));
      body.appendChild(acts);
    } else {
      body.appendChild(U.el('div', { cls: 'gold mt', text: 'Taken. ' + (run.mode === 'coop' ? 'Waiting for the party…' : '') }));
    }
    if (run.mode === 'coop') body.appendChild(partyPending(run, p => p.restDone || p.hp <= 0));
    wrap.appendChild(body);
    return wrap;
  }

  /* ---------- END ---------- */
  function renderEnd(run, victory) {
    if (run.mode === 'solo') R.clearSolo();
    const wrap = U.el('div', {});
    wrap.appendChild(runHeader(run, victory ? 'The Quarry falls' : 'The run ends'));
    const body = U.el('div', { cls: 'pia-end panel ' + (victory ? 'win' : 'lose') });
    if (victory) {
      body.appendChild(U.el('h1', { cls: 'gold', text: '★ Quarry Felled ★' }));
      body.appendChild(U.el('div', { text: 'You ran the great beast of ' + D.planet(run.planet).name + ' to ground. The Guild will remember it.' }));
      /* award a little gold to the account as a nod (solo, real account only) */
      if (run.mode === 'solo' && G.me && !G.me.ai && !run._paid) { run._paid = true; try { G.me.gold += 250; G.save && G.save(); UI.refreshTopbar && UI.refreshTopbar(); } catch (e) { } }
      if (run.mode === 'solo') body.appendChild(U.el('div', { cls: 'gold mt', text: '+250 gold added to your account.' }));
    } else {
      body.appendChild(U.el('h1', { style: 'color:#c25', text: 'Fallen' }));
      body.appendChild(U.el('div', { text: 'The party could not hold. The Quarry hunts on.' }));
    }
    const acts = U.el('div', { cls: 'flex mt' });
    acts.appendChild(U.el('button', { cls: 'btn', text: '↺ New run', onclick: () => { if (run.mode === 'coop') C.leave(); UI.show('pia'); } }));
    acts.appendChild(U.el('button', { cls: 'btn ghost', text: '☰ Main menu', onclick: () => { if (run.mode === 'coop') C.leave(); UI.show('menu'); } }));
    body.appendChild(acts);
    wrap.appendChild(body);
    return wrap;
  }

})();
