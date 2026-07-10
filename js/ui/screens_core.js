/* ============================================================
   DYA'AKARA — ui/screens_core.js
   Login (Pia'don establishing shot), Main Menu, Settings,
   Profile, Friends, Avatar Editor.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, UI = DYA.ui, SP = DYA.species, SPR = DYA.sprites, EC = DYA.economy;

  /* ================= LOGIN ================= */
  UI.register('login', {
    enter(root) {
      const scr = U.el('div', { cls: 'screen', id: 'loginScreen' });
      const cv = U.el('canvas', { id: 'loginCanvas' });
      scr.appendChild(cv);

      const box = U.el('div', { cls: 'login-box' });
      box.appendChild(U.el('h1', { text: "DYA'AKARA" }));
      box.appendChild(U.el('div', { cls: 'sub', text: 'TOKEN GAME OF THE MBARU TATU' }));
      const panel = U.el('div', { cls: 'panel' });
      const email = U.el('input', { cls: 'txt', type: 'email', placeholder: 'you@example.com' });
      const pass = U.el('input', { cls: 'txt', type: 'password', placeholder: '••••••••' });
      const err = U.el('div', { cls: 'small', style: 'color:var(--red);min-height:18px;margin-top:8px' });
      panel.appendChild(U.el('label', { cls: 'lbl', text: 'Email' })); panel.appendChild(email);
      panel.appendChild(U.el('label', { cls: 'lbl', text: 'Password' })); panel.appendChild(pass);
      panel.appendChild(err);
      const row = U.el('div', { cls: 'flex mt' });
      const loginBtn = U.el('button', { cls: 'btn primary flex1', text: 'Enter the Arena' });
      row.appendChild(loginBtn);
      panel.appendChild(row);
      const gBtn = U.el('button', { cls: 'btn ghost mt', style: 'width:100%', html: '𝐆&nbsp; Sign in with Google' });
      gBtn.onclick = () => { err.textContent = 'Google sign-in arrives with the Firebase backend — use email for the local build.'; };
      panel.appendChild(gBtn);
      const links = U.el('div', { cls: 'flex mt', style: 'justify-content:space-between' });
      const forgot = U.el('span', { cls: 'small muted', style: 'cursor:pointer', text: 'Forgot password?' });
      const create = U.el('span', { cls: 'small gold', style: 'cursor:pointer', text: 'Create account' });
      links.appendChild(forgot); links.appendChild(create);
      panel.appendChild(links);
      box.appendChild(panel);
      scr.appendChild(box);
      root.appendChild(scr);

      function doLogin() {
        const r = G.login(email.value.trim().toLowerCase(), pass.value);
        if (r.err) { err.textContent = r.err; DYA.audio.play('deny'); return; }
        afterLogin();
      }
      loginBtn.onclick = doLogin;
      pass.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
      forgot.onclick = () => UI.alert('Forgot Password', 'The local build stores accounts on this device only. When the Firebase backend is connected, a reset email flow appears here. For now: make a new account, or remember harder.');
      create.onclick = () => showCreateFlow();

      /* Pia'don establishing shot: star, three co-orbiting planets, moon */
      const ctx = cv.getContext('2d');
      const stars = [];
      for (let i = 0; i < 160; i++) stars.push([Math.random(), Math.random(), Math.random() * 1.6 + 0.4]);
      let raf;
      function draw(now) {
        if (!cv.isConnected) { cancelAnimationFrame(raf); return; }
        const w = cv.width = cv.clientWidth, h = cv.height = cv.clientHeight;
        const t = now / 1000;
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#05060f'); g.addColorStop(0.7, '#0d0a14'); g.addColorStop(1, '#171009');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        stars.forEach(s => { ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.5 + s[0] * 20)); ctx.fillRect(s[0] * w, s[1] * h, s[2], s[2]); });
        ctx.globalAlpha = 1;
        /* Pia'don's star */
        const sx = w * 0.82, sy = h * 0.2;
        const sg = ctx.createRadialGradient(sx, sy, 4, sx, sy, 120);
        sg.addColorStop(0, '#fff6d8'); sg.addColorStop(0.25, '#ffd76a88'); sg.addColorStop(1, '#ffd76a00');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 120, 0, 6.29); ctx.fill();
        /* the Mbaru Tatu — three planets sharing an orbit, rotating around each other */
        const cx = w * 0.3, cy = h * 0.52, R = Math.min(w, h) * 0.13;
        ctx.strokeStyle = '#d9b87a18'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.6, R * 0.62, -0.2, 0, 6.29); ctx.stroke();
        const planets = [
          { name: 'Velki', col: '#4c7a5f', r: 26 },   // largest
          { name: 'Xikia', col: '#8a6f4a', r: 20 },
          { name: 'Leotik', col: '#5d7a3a', r: 15 },  // smallest, wildest
        ];
        planets.forEach((p, i) => {
          const a = t * 0.22 + i * (Math.PI * 2 / 3);
          const px = cx + Math.cos(a) * R * 1.6, py = cy + Math.sin(a) * R * 0.62;
          const pg = ctx.createRadialGradient(px - p.r * 0.4, py - p.r * 0.4, 1, px, py, p.r);
          pg.addColorStop(0, SPR.shade(p.col, 55)); pg.addColorStop(1, SPR.shade(p.col, -35));
          ctx.fillStyle = pg;
          ctx.beginPath(); ctx.arc(px, py, p.r, 0, 6.29); ctx.fill();
          ctx.fillStyle = '#e8dfc855'; ctx.font = '10px Georgia'; ctx.textAlign = 'center';
          ctx.fillText(p.name, px, py + p.r + 13);
          if (i === 0) { /* Bolo Kalo, the great moon */
            const ma = t * 0.9;
            ctx.fillStyle = '#b8b2c8';
            ctx.beginPath(); ctx.arc(px + Math.cos(ma) * p.r * 1.8, py + Math.sin(ma) * p.r * 0.7, 4, 0, 6.29); ctx.fill();
          }
        });
        /* the Sunear'Zikhron storm band drifting */
        ctx.strokeStyle = '#68e0e822'; ctx.lineWidth = 8;
        ctx.beginPath();
        for (let x = 0; x < w; x += 8) {
          const y = h * 0.78 + Math.sin(x * 0.01 + t * 0.6) * 16;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        raf = requestAnimationFrame(draw);
      }
      raf = requestAnimationFrame(draw);
    },
  });

  function afterLogin() {
    DYA.audio.play('click');
    const ban = G.banInfo();
    if (ban && (ban.permanent || ban.until > Date.now())) {
      UI.alert('Account Restricted', 'The Dya Guild has issued a ban on this account: "' + ban.reason + '". ' + (ban.permanent ? 'This ban is permanent.' : 'Until: ' + U.fmtClock(ban.until)) + ' You may view your collection only. Appeals may be submitted through the Guild page.');
      G.me.flags.bannedView = true;
    }
    if (!G.me.tutorial.done && G.me.tutorial.step <= 1) {
      DYA.tutorial.start();
    } else {
      UI.showWithLoading('menu', {}, 1100);
    }
  }

  /* create account flow — name, appearance, home region (tutorial steps 1–2) */
  function showCreateFlow() {
    const wrap = U.el('div', {});
    wrap.appendChild(U.el('h3', { cls: 'gold', text: 'Join the Dya Guild Rolls' }));
    const email = U.el('input', { cls: 'txt', type: 'email', placeholder: 'you@example.com' });
    const pass = U.el('input', { cls: 'txt', type: 'password', placeholder: 'Choose a password' });
    const name = U.el('input', { cls: 'txt', maxlength: 20, placeholder: '2–20 characters. Dearcineon marks (á æ ø ð т) welcome.' });
    wrap.appendChild(U.el('label', { cls: 'lbl', text: 'Email' })); wrap.appendChild(email);
    wrap.appendChild(U.el('label', { cls: 'lbl', text: 'Password' })); wrap.appendChild(pass);
    wrap.appendChild(U.el('label', { cls: 'lbl', text: 'Display name' })); wrap.appendChild(name);
    /* appearance */
    wrap.appendChild(U.el('label', { cls: 'lbl', text: 'Your appearance' }));
    const avRow = U.el('div', { cls: 'avatar-grid' });
    let chosenAv = 0;
    [0, 1, 2].forEach(i => {
      const cell = U.el('div', { cls: 'avatar-cell' + (i === 0 ? ' selected' : '') });
      const c = U.el('canvas', { width: 86, height: 86 });
      SPR.drawAvatar(c.getContext('2d'), i, 86);
      cell.appendChild(c);
      cell.onclick = () => { chosenAv = i; U.qsa('.avatar-cell', avRow).forEach(x => x.classList.remove('selected')); cell.classList.add('selected'); };
      avRow.appendChild(cell);
    });
    wrap.appendChild(avRow);
    /* home region */
    wrap.appendChild(U.el('label', { cls: 'lbl', text: 'Home region — sets your regional tournament circuit' }));
    const regSel = U.el('select', { cls: 'txt' });
    EC.REGIONS.forEach(r => regSel.appendChild(U.el('option', { value: r.id, text: r.name + ' (' + r.planet + ')' })));
    const regBlurb = U.el('div', { cls: 'small muted mt', text: EC.REGIONS[0].blurb });
    regSel.onchange = () => { regBlurb.textContent = EC.REGIONS.find(r => r.id === regSel.value).blurb; };
    wrap.appendChild(regSel); wrap.appendChild(regBlurb);
    const err = U.el('div', { cls: 'small mt', style: 'color:var(--red);min-height:16px' });
    wrap.appendChild(err);
    const m = UI.modal(wrap, { sticky: true });
    const row = U.el('div', { cls: 'flex mt' });
    row.appendChild(U.el('button', {
      cls: 'btn primary flex1', text: 'Begin', onclick: () => {
        if (!email.value.includes('@')) { err.textContent = 'A real-looking email, please.'; return; }
        if (pass.value.length < 4) { err.textContent = 'Password must be at least 4 characters.'; return; }
        const r = G.createAccount(email.value.trim().toLowerCase(), pass.value, name.value.trim());
        if (r.err) { err.textContent = r.err; return; }
        G.me.avatarIdx = chosenAv;
        G.me.region = regSel.value;
        G.save();
        m.close();
        DYA.tutorial.start();
      },
    }));
    row.appendChild(U.el('button', { cls: 'btn ghost', text: 'Cancel', onclick: () => m.close() }));
    wrap.appendChild(row);
  }

  /* ================= SEAL DESIGNER (§3) =================
     One unique engraved coin per player: avatar at the center,
     up to two pattern rings around it. Built once, then locked. */
  UI.sealDesigner = function (onDone) {
    const me = G.me;
    if (me.seal && me.seal.locked) { UI.alert('Seal already struck', 'A seal is struck once and carried for life. Yours is on your avatar page.'); if (onDone) onDone(); return; }
    const w = U.el('div', { cls: 'center' });
    w.appendChild(U.el('h3', { cls: 'gold', text: 'Strike Your Seal' }));
    w.appendChild(U.el('p', { cls: 'small muted mt', text: 'Your engraving at the center. Choose up to TWO patterns for the outer rings. This coin marks your screens, your creatures on the field, and your victories — and it is struck exactly once.' }));
    const cv = U.el('canvas', { width: 200, height: 200, cls: 'mt' });
    w.appendChild(U.el('div', {}, [cv]));
    const patterns = [];
    function redraw() {
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, 200, 200);
      SPR.drawSeal(ctx, 100, 100, 94, { avatarIdx: me.avatarIdx, patterns: patterns.slice() });
    }
    redraw();
    const row = U.el('div', { cls: 'flex mt', style: 'flex-wrap:wrap;justify-content:center' });
    SPR.PATTERNS.forEach(p => {
      const b = U.el('button', { cls: 'btn small ghost', text: p });
      b.onclick = () => {
        const i = patterns.indexOf(p);
        if (i >= 0) { patterns.splice(i, 1); b.classList.add('ghost'); }
        else {
          if (patterns.length >= 2) { UI.toast({ title: 'Two rings at most', body: 'A seal carries one or two patterns — remove one first.', icon: '⭕' }); return; }
          patterns.push(p); b.classList.remove('ghost');
        }
        redraw(); DYA.audio.play('click');
      };
      row.appendChild(b);
    });
    w.appendChild(row);
    const m = UI.modal(w, { sticky: true });
    w.appendChild(U.el('button', {
      cls: 'btn primary mt', text: '⚒ Strike it — forever', onclick: () => {
        if (!patterns.length) { UI.toast({ title: 'Choose a pattern', body: 'At least one ring pattern, keeper.', icon: '⭕' }); return; }
        me.seal = { avatarIdx: me.avatarIdx, patterns: patterns.slice(), locked: true };
        G.save(); m.close();
        DYA.audio.play('levelup');
        UI.toast({ title: 'Seal struck', body: 'Your mark is now on everything that is yours.', icon: '🪙' });
        if (onDone) onDone();
      },
    }));
  };

  /* ================= MAIN MENU ================= */
  UI.register('menu', {
    enter(root) {
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({}));
      const wrap = U.el('div', { cls: 'menu-wrap' });
      const left = U.el('div', { cls: 'menu-left' });
      left.appendChild(U.el('div', { cls: 'menu-title', text: "DYA'AKARA" }));
      left.appendChild(U.el('div', { cls: 'menu-sub', text: 'SEASON ' + G.world.season.number + ' — ' + (G.me ? EC.REGIONS.find(r => r.id === G.me.region).name.toUpperCase() + ' CIRCUIT' : '') }));
      const nav = U.el('div', { cls: 'menu-nav' });
      const banned = G.isBanned(G.me.id);
      const items = [
        ['⚔ Play', () => UI.show('play')],
        ['🎴 Collection', () => UI.show('collection')],
        ['🛒 Market', () => UI.show('market')],
        ['⚗ Crafting', () => UI.show('crafting')],
        ['🏹 Adventures', () => UI.show('adventures')],
        ['🏆 Tournaments', () => UI.show('tournaments')],
        ['🏛 Dya Guild', () => UI.show('guild')],
        ['📖 Vakarborac', () => UI.show('compendium')],
        ['👥 Friends', () => UI.show('friends')],
        ['📜 Profile', () => UI.show('profile')],
        ['⚙ Settings', () => UI.show('settings')],
      ];
      items.forEach(([label, fn]) => {
        const b = U.el('button', { cls: 'btn', text: label });
        const allowed = !banned || label.includes('Collection') || label.includes('Guild') || label.includes('Settings') || label.includes('Profile');
        if (!allowed) { b.disabled = true; b.title = 'Restricted while banned'; }
        b.onclick = () => { DYA.audio.play('click'); fn(); };
        nav.appendChild(b);
      });
      const out = U.el('button', { cls: 'btn ghost', text: '⏻ Log out' });
      out.onclick = () => { G.logout(); UI.show('login'); };
      nav.appendChild(out);
      left.appendChild(nav);
      wrap.appendChild(left);

      /* right: announcements / news (admin posts land here) */
      const right = U.el('div', { cls: 'menu-right' });
      right.appendChild(U.el('h3', { cls: 'gold mb', text: 'Announcements' }));
      G.world.announcements.slice(0, 6).forEach(a => {
        right.appendChild(U.el('div', { cls: 'news-card' }, [
          U.el('div', { cls: 'nc-title', text: a.title }),
          U.el('div', { cls: 'nc-body', text: a.body }),
          U.el('div', { cls: 'small muted mt', text: U.timeAgo(a.at) }),
        ]));
      });
      right.appendChild(U.el('h3', { cls: 'gold mb mt', text: "The Avizu'Vac" }));
      G.world.avizu.slice(0, 3).forEach(a => {
        right.appendChild(U.el('div', { cls: 'news-card', style: 'border-left-color:#8a1c1c' }, [
          U.el('div', { cls: 'nc-title', text: a.title }),
          U.el('div', { cls: 'nc-body', text: a.body }),
        ]));
      });
      wrap.appendChild(right);
      scr.appendChild(wrap);
      root.appendChild(scr);
    },
  });

  /* ================= SETTINGS ================= */
  UI.register('settings', {
    enter(root) {
      const s = G.me.settings;
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Settings' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      head.appendChild(U.el('h2', { text: 'Settings' }));
      const tabs = U.el('div', { cls: 'tabs' });
      head.appendChild(U.el('div', { cls: 'spacer' }));
      head.appendChild(tabs);
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body', style: 'max-width:760px;margin:0 auto;width:100%' });
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);

      function slider(label, get, set) {
        const row = U.el('div', { cls: 'set-row' });
        row.appendChild(U.el('div', { cls: 'sr-lbl', text: label }));
        const r = U.el('input', { type: 'range', min: 0, max: 100, value: Math.round(get() * 100) });
        r.oninput = () => { set(r.value / 100); G.save(); };
        row.appendChild(r);
        return row;
      }
      function toggle(label, get, set) {
        const row = U.el('div', { cls: 'set-row' });
        row.appendChild(U.el('div', { cls: 'sr-lbl', text: label }));
        row.appendChild(U.el('div', { cls: 'spacer' }));
        const t = U.el('div', { cls: 'toggle' + (get() ? ' on' : '') });
        t.onclick = () => { set(!get()); t.classList.toggle('on', get()); G.save(); DYA.audio.play('click'); };
        row.appendChild(t);
        return row;
      }

      const views = {
        Audio() {
          body.innerHTML = '';
          const A = DYA.audio;
          function syncAudio() {
            A.volumes = { master: s.audio.master, music: s.audio.music, sfx: s.audio.sfx, crowd: s.audio.crowd };
            A.muted = { master: s.audio.muteMaster, music: s.audio.muteMusic, sfx: s.audio.muteSfx, crowd: s.audio.muteCrowd };
            A.shurgrEdanAudio = s.audio.shurgrEdan;
          }
          body.appendChild(slider('Master volume', () => s.audio.master, v => { s.audio.master = v; syncAudio(); }));
          body.appendChild(toggle('Mute master', () => s.audio.muteMaster, v => { s.audio.muteMaster = v; syncAudio(); }));
          body.appendChild(slider('Music volume (music arrives with the composer)', () => s.audio.music, v => { s.audio.music = v; syncAudio(); }));
          body.appendChild(toggle('Mute music', () => s.audio.muteMusic, v => { s.audio.muteMusic = v; syncAudio(); }));
          body.appendChild(slider('SFX volume', () => s.audio.sfx, v => { s.audio.sfx = v; syncAudio(); DYA.audio.play('hit'); }));
          body.appendChild(toggle('Mute SFX', () => s.audio.muteSfx, v => { s.audio.muteSfx = v; syncAudio(); }));
          body.appendChild(slider('Crowd volume', () => s.audio.crowd, v => { s.audio.crowd = v; syncAudio(); }));
          body.appendChild(toggle('Mute crowd', () => s.audio.muteCrowd, v => { s.audio.muteCrowd = v; syncAudio(); }));
          body.appendChild(toggle('ShurgrEdan strike audio (it is very loud)', () => s.audio.shurgrEdan, v => { s.audio.shurgrEdan = v; syncAudio(); }));
        },
        Display() {
          body.innerHTML = '';
          const qRow = U.el('div', { cls: 'set-row' });
          qRow.appendChild(U.el('div', { cls: 'sr-lbl', text: 'Quality preset' }));
          const qSel = U.el('select', { cls: 'txt', style: 'max-width:200px' });
          ['low', 'medium', 'high'].forEach(q => qSel.appendChild(U.el('option', { value: q, text: q, selected: s.display.quality === q ? '' : undefined })));
          qSel.value = s.display.quality;
          qSel.onchange = () => {
            s.display.quality = qSel.value;
            if (qSel.value === 'low') { s.display.particles = false; s.display.holographic = false; }
            if (qSel.value === 'high') { s.display.particles = true; s.display.holographic = true; s.display.bioluminescence = true; }
            G.save(); views.Display();
          };
          qRow.appendChild(qSel);
          body.appendChild(qRow);
          const resRow = U.el('div', { cls: 'set-row' });
          resRow.appendChild(U.el('div', { cls: 'sr-lbl', text: 'Resolution' }));
          const rSel = U.el('select', { cls: 'txt', style: 'max-width:200px' });
          ['auto', '1920×1080', '1600×900', '1280×720'].forEach(r => rSel.appendChild(U.el('option', { value: r, text: r })));
          rSel.value = s.display.resolution || 'auto';
          rSel.onchange = () => { s.display.resolution = rSel.value; G.save(); };
          resRow.appendChild(rSel);
          body.appendChild(resRow);
          body.appendChild(toggle('Fullscreen', () => s.display.fullscreen, v => {
            s.display.fullscreen = v;
            try { v ? document.documentElement.requestFullscreen() : document.exitFullscreen(); } catch (e) { }
          }));
          body.appendChild(toggle('VSync (browser-managed)', () => s.display.vsync, v => s.display.vsync = v));
          body.appendChild(toggle('Particle effects', () => s.display.particles, v => s.display.particles = v));
          body.appendChild(toggle('Bioluminescence', () => s.display.bioluminescence, v => s.display.bioluminescence = v));
          body.appendChild(toggle('Holographic shimmer', () => s.display.holographic, v => s.display.holographic = v));
          body.appendChild(toggle('Colorblind mode', () => s.display.colorblind, v => s.display.colorblind = v));
          body.appendChild(toggle('Seal badges floating above creatures (in matches)', () => !!s.display.sealBadges, v => s.display.sealBadges = v));
        },
        Controls() {
          body.innerHTML = '';
          body.appendChild(U.el('p', { cls: 'muted small mb', text: 'Click a binding, then press the new key.' }));
          const binds = [
            ['Trigger readied slot 1 (at cursor)', 'trigger1'],
            ['Trigger readied slot 2', 'trigger2'],
            ['Trigger readied slot 3', 'trigger3'],
            ['Trigger readied slot 4', 'trigger4'],
            ['Trigger readied slot 5', 'trigger5'],
            ['Pause / Resume', 'pause'],
          ];
          binds.forEach(([label, key]) => {
            const row = U.el('div', { cls: 'set-row' });
            row.appendChild(U.el('div', { cls: 'sr-lbl', text: label }));
            row.appendChild(U.el('div', { cls: 'spacer' }));
            const kb = U.el('div', { cls: 'keybind', text: s.controls[key] === ' ' ? 'SPACE' : s.controls[key].toUpperCase() });
            kb.onclick = () => {
              kb.classList.add('listening'); kb.textContent = 'press key…';
              const h = (e) => {
                e.preventDefault();
                s.controls[key] = e.key;
                kb.textContent = e.key === ' ' ? 'SPACE' : e.key.toUpperCase();
                kb.classList.remove('listening');
                G.save();
                document.removeEventListener('keydown', h, true);
              };
              document.addEventListener('keydown', h, true);
            };
            row.appendChild(kb);
            body.appendChild(row);
          });
        },
      };
      ['Audio', 'Display', 'Controls'].forEach((t, i) => {
        const tab = U.el('div', { cls: 'tab' + (i === 0 ? ' active' : ''), text: t });
        tab.onclick = () => { U.qsa('.tab', tabs).forEach(x => x.classList.remove('active')); tab.classList.add('active'); views[t](); };
        tabs.appendChild(tab);
      });
      views.Audio();
    },
  });

  /* ================= PROFILE ================= */
  UI.register('profile', {
    enter(root, params) {
      const me = params.account || G.me;
      const isMe = me === G.me;
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Profile' }));
      const wrap = U.el('div', { cls: 'profile-wrap' });

      /* left sidebar — always visible */
      const side = U.el('div', { cls: 'profile-side' });
      const avWrap = U.el('div', { style: 'width:110px;height:110px;border-radius:50%;overflow:hidden;border:2px solid var(--gold-dim);margin:0 auto;cursor:pointer', title: 'Open avatar editor' });
      const avc = U.el('canvas', { width: 110, height: 110 });
      SPR.drawAvatar(avc.getContext('2d'), me.avatarIdx, 110);
      avWrap.appendChild(avc);
      if (isMe) avWrap.onclick = () => UI.show('avatar');
      side.appendChild(avWrap);
      side.appendChild(U.el('h2', { cls: 'gold center mt', text: me.displayName }));
      const title = me.titleId ? EC.TITLES.find(t => t.id === me.titleId) : null;
      side.appendChild(U.el('div', { cls: 'center muted small', text: title ? '« ' + title.name + ' »' : 'No title equipped' }));
      side.appendChild(U.el('div', { cls: 'center small muted mt', text: 'ID: ' + me.id }));
      /* online status */
      if (isMe) {
        const stRow = U.el('div', { cls: 'flex mt', style: 'justify-content:center' });
        ['online', 'away', 'offline'].forEach(st => {
          const b = U.el('button', { cls: 'btn small' + (me.onlineStatus === st ? '' : ' ghost'), text: st });
          b.onclick = () => { me.onlineStatus = st; G.save(); UI.show('profile'); };
          stRow.appendChild(b);
        });
        side.appendChild(stRow);
      }
      side.appendChild(U.el('div', { cls: 'divider' }));
      side.appendChild(U.el('div', { cls: 'center', html: 'Rank <b class="gold">' + me.rank + '</b> · Level <b class="gold">' + me.level + '</b>' }));
      const need = EC.xpForLevel(me.level + 1);
      side.appendChild(U.el('div', { cls: 'small muted center mt', text: U.fmt(me.xp) + ' / ' + U.fmt(need) + ' XP' }));
      const xpb = U.el('div', { cls: 'xp-bar mt' }); xpb.appendChild(U.el('div', { style: 'width:' + Math.min(100, me.xp / need * 100) + '%' }));
      side.appendChild(xpb);
      side.appendChild(U.el('div', { cls: 'divider' }));
      side.appendChild(U.el('div', { cls: 'small', html: '🪙 ' + U.fmt(me.gold) + ' gold<br>⬡ ' + me.okid.reduce((a, b) => a + b, 0) + ' Okid<br>🧪 ' + me.ngakara + ' NgAkara<br>👁 ' + G.followerCount(me.id) + ' followers' }));
      side.appendChild(U.el('div', { cls: 'divider' }));
      if (isMe) {
        side.appendChild(U.el('button', { cls: 'btn small', text: '⚙ Settings', onclick: () => UI.show('settings') }));
        side.appendChild(U.el('button', { cls: 'btn small mt', style: 'margin-left:6px', text: '🎭 Avatar & Titles', onclick: () => UI.show('avatar') }));
      } else {
        const fBtn = U.el('button', { cls: 'btn small', text: G.me.follows.includes(me.id) ? 'Unfollow' : 'Follow' });
        fBtn.onclick = () => { const r = G.toggleFollow(me.id); if (r === null) UI.alert('Follow cap', 'You already follow 100 players — the maximum.'); UI.show('profile', { account: me }); };
        side.appendChild(fBtn);
      }
      wrap.appendChild(side);

      /* main tabs */
      const main = U.el('div', { cls: 'profile-main' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      const tabs = U.el('div', { cls: 'tabs' });
      head.appendChild(tabs);
      main.appendChild(head);
      const body = U.el('div', { cls: 'page-body' });
      main.appendChild(body);
      wrap.appendChild(main);
      scr.appendChild(wrap);
      root.appendChild(scr);

      const views = {
        Stats() {
          body.innerHTML = '';
          const grid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(140px,1fr))' });
          const st = me.stats;
          [['Wins', st.wins], ['Losses', st.losses], ['Draws', st.draws], ['Duels won', st.duelsWon], ['Crafted', st.crafted], ['Sales', st.sales], ['Hunts', st.huntsDone], ['Tournaments won', st.tourneysWon], ['Relic captures', st.relicCaptures], ['Eliminations', st.eliminations]].forEach(([l, v]) => {
            grid.appendChild(U.el('div', { cls: 'stat-tile' }, [U.el('div', { cls: 'st-num', text: U.fmt(v || 0) }), U.el('div', { cls: 'st-lbl', text: l })]));
          });
          body.appendChild(grid);
          /* favourite token */
          const fav = Object.entries(st.favSpecies || {}).sort((a, b) => b[1] - a[1])[0];
          if (fav) {
            body.appendChild(U.el('h3', { cls: 'gold mt mb', text: 'Favourite token' }));
            const favRow = U.el('div', { cls: 'flex' });
            favRow.appendChild(UI.tokenArt(fav[0], 90));
            favRow.appendChild(U.el('div', { html: '<b>' + SP.get(fav[0]).name + '</b><br><span class="muted small">Played ' + fav[1] + ' times</span>' }));
            body.appendChild(favRow);
          }
          /* rank history bar chart */
          if (st.rankHistory && st.rankHistory.length) {
            body.appendChild(U.el('h3', { cls: 'gold mt mb', text: 'Rank history' }));
            const chart = U.el('div', { style: 'display:flex;align-items:flex-end;gap:3px;height:110px;padding:8px;background:var(--panel);border-radius:8px;border:1px solid var(--line)' });
            const max = Math.max(...st.rankHistory.map(r => r.rank), 1100);
            st.rankHistory.slice(-30).forEach(r => {
              chart.appendChild(U.el('div', { title: r.rank + ' — ' + U.fmtClock(r.at), style: 'flex:1;background:linear-gradient(180deg,var(--gold),var(--gold-dim));border-radius:2px 2px 0 0;height:' + Math.max(4, r.rank / max * 100) + '%' }));
            });
            body.appendChild(chart);
          }
        },
        'Match History'() {
          body.innerHTML = '';
          if (!me.matchHistory.length) { body.appendChild(U.el('p', { cls: 'muted', text: 'No matches yet. The arena waits.' })); return; }
          me.matchHistory.forEach(m => {
            const row = U.el('div', { cls: 'match-row' });
            row.appendChild(U.el('div', { cls: 'mr-res ' + (m.draw ? 'd' : m.win ? 'w' : 'l'), text: m.draw ? '–' : m.win ? 'W' : 'L' }));
            row.appendChild(U.el('div', { cls: 'flex1', html: '<b>vs ' + U.esc(m.opponent) + '</b><br><span class="small muted">' + m.format + (m.ranked ? ' · RANKED' : '') + (m.tournament ? ' · ' + U.esc(m.tournament) : '') + '</span>' }));
            row.appendChild(U.el('div', { cls: 'small muted', text: U.fmtDur(m.duration * 1000) }));
            row.appendChild(U.el('div', { cls: 'small muted', text: U.timeAgo(m.at) }));
            const rep = me.replays.find(r => r.id === m.id);
            if (rep && isMe) row.appendChild(U.el('button', { cls: 'btn small', text: '▶ Replay', onclick: () => DYA.play.watchReplay(rep) }));
            body.appendChild(row);
          });
        },
        Achievements() {
          body.innerHTML = '';
          const grid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(300px,1fr))' });
          EC.ACHIEVEMENTS.forEach(a => {
            const earned = me.achievements[a.id];
            const name = earned && a.tierNames ? a.tierNames[earned.tier - 1] : a.name;
            const card = U.el('div', { cls: 'ach-card' + (earned ? '' : ' locked') }, [
              U.el('div', { style: 'font-size:26px', text: earned ? '🏅' : '🔒' }),
              U.el('div', {}, [
                U.el('div', { cls: earned ? 'gold' : '', text: name }),
                U.el('div', { cls: 'small muted', text: earned ? a.desc : (a.hint || a.desc) }),
                a.tiered && earned ? U.el('div', { cls: 'small gold', text: 'Tier ' + earned.tier + ' / ' + a.tiered.length }) : null,
              ]),
            ]);
            grid.appendChild(card);
          });
          body.appendChild(grid);
        },
        Account() {
          body.innerHTML = '';
          if (!isMe) { body.appendChild(U.el('p', { cls: 'muted', text: 'Private.' })); return; }
          const em = me.email;
          const hidden = em.slice(0, 2) + '•••' + em.slice(em.indexOf('@'));
          body.appendChild(U.el('div', { cls: 'set-row', html: '<div class="sr-lbl">Display name</div><b>' + U.esc(me.displayName) + '</b>' }));
          body.appendChild(U.el('div', { cls: 'set-row', html: '<div class="sr-lbl">Email</div>' + U.esc(hidden) }));
          body.appendChild(U.el('div', { cls: 'set-row', html: '<div class="sr-lbl">Player ID</div><span class="small">' + me.id + '</span>' }));
          const pwRow = U.el('div', { cls: 'set-row' });
          pwRow.appendChild(U.el('div', { cls: 'sr-lbl', text: 'Password' }));
          pwRow.appendChild(U.el('button', {
            cls: 'btn small', text: 'Change password', onclick: () => {
              const inp = U.el('input', { cls: 'txt', type: 'password', placeholder: 'New password' });
              const w = U.el('div', {}, [U.el('h3', { cls: 'gold', text: 'Change password' }), U.el('div', { cls: 'mt' }), inp]);
              const m = UI.modal(w);
              w.appendChild(U.el('button', {
                cls: 'btn primary mt', text: 'Save', onclick: () => {
                  if (inp.value.length < 4) return;
                  me.passHash = String(U.hashStr('dya!' + inp.value + '!akara'));
                  G.save(); m.close(); UI.toast({ title: 'Password changed', icon: '🔐' });
                },
              }));
            },
          }));
          body.appendChild(pwRow);
          const delRow = U.el('div', { cls: 'set-row' });
          delRow.appendChild(U.el('div', { cls: 'sr-lbl', text: 'Delete account' }));
          delRow.appendChild(U.el('button', {
            cls: 'btn danger small', text: 'Delete forever', onclick: () => {
              UI.confirm('Delete account?', 'Your collection, gold, and history will be gone. The Guild does not restore deleted accounts. Ever.', () => {
                delete G.world.accounts[me.id];
                G.saveNow(); G.logout(); UI.show('login');
              }, 'Delete everything');
            },
          }));
          body.appendChild(delRow);
        },
      };
      ['Stats', 'Match History', 'Achievements', 'Account'].forEach((t, i) => {
        const tab = U.el('div', { cls: 'tab' + (i === 0 ? ' active' : ''), text: t });
        tab.onclick = () => { U.qsa('.tab', tabs).forEach(x => x.classList.remove('active')); tab.classList.add('active'); views[t](); };
        tabs.appendChild(tab);
      });
      views.Stats();
    },
  });

  /* ================= FRIENDS ================= */
  UI.register('friends', {
    enter(root) {
      const me = G.me;
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Friends' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      head.appendChild(U.el('h2', { text: 'Friends' }));
      const tabs = U.el('div', { cls: 'tabs' });
      head.appendChild(U.el('div', { cls: 'spacer' }));
      head.appendChild(tabs);
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body', style: 'max-width:780px;width:100%;margin:0 auto' });
      page.appendChild(body);
      scr.appendChild(page); root.appendChild(scr);

      function friendRow(acc, actions) {
        const row = U.el('div', { cls: 'friend-row' });
        const status = acc.ai ? (U.hashStr(acc.id) % 3 === 0 ? 'online' : U.hashStr(acc.id) % 3 === 1 ? 'away' : 'offline') : acc.onlineStatus;
        row.appendChild(U.el('div', { cls: 'online-dot ' + status }));
        const avc = U.el('canvas', { width: 30, height: 30, style: 'border-radius:50%' });
        SPR.drawAvatar(avc.getContext('2d'), acc.avatarIdx || (U.hashStr(acc.id) % SPR.AVATAR_COUNT), 30);
        row.appendChild(avc);
        row.appendChild(U.el('div', { cls: 'flex1', html: '<b>' + U.esc(acc.displayName) + '</b> <span class="small muted">Lv ' + acc.level + ' · ' + status + '</span>' }));
        actions.forEach(a => row.appendChild(a));
        return row;
      }

      const views = {
        Friends() {
          body.innerHTML = '';
          const add = U.el('div', { cls: 'flex mb' });
          const inp = U.el('input', { cls: 'txt', placeholder: 'Add by name or player ID…' });
          const btn = U.el('button', {
            cls: 'btn', text: 'Add friend', onclick: () => {
              const found = G.findAccount(inp.value);
              if (!found) { UI.alert('Not found', 'No player by that name or ID.'); return; }
              if (found.id === me.id) { UI.alert('Hm', 'You are already your own friend. Hopefully.'); return; }
              const r = G.sendFriendRequest(found.id);
              if (r.err) UI.alert('Cannot add', r.err);
              else UI.toast({ title: 'Request sent', body: 'Friend request sent to ' + found.displayName + '.', icon: '🤝' });
              inp.value = '';
            },
          });
          add.appendChild(inp); add.appendChild(btn);
          body.appendChild(add);
          const groups = { online: [], away: [], offline: [] };
          me.friends.forEach(id => {
            const acc = G.world.accounts[id];
            if (!acc) return;
            const st = acc.ai ? (U.hashStr(acc.id) % 3 === 0 ? 'online' : U.hashStr(acc.id) % 3 === 1 ? 'away' : 'offline') : acc.onlineStatus;
            groups[st].push(acc);
          });
          ['online', 'away', 'offline'].forEach(gname => {
            if (!groups[gname].length) return;
            body.appendChild(U.el('h3', { cls: 'gold mb mt', text: gname.toUpperCase() + ' — ' + groups[gname].length }));
            groups[gname].forEach(acc => {
              body.appendChild(friendRow(acc, [
                U.el('button', { cls: 'btn small', text: '⚔ Invite', onclick: () => DYA.play.inviteFriendMatch(acc) }),
                U.el('button', { cls: 'btn small ghost', text: 'Profile', onclick: () => UI.show('profile', { account: acc }) }),
                U.el('button', { cls: 'btn small ghost', text: 'Stall', onclick: () => UI.show('playerStall', { seller: acc }) }),
                U.el('button', { cls: 'btn small danger', text: 'Remove', onclick: () => { G.removeFriend(acc.id); views.Friends(); } }),
              ]));
            });
          });
          if (!me.friends.length) body.appendChild(U.el('p', { cls: 'muted center mt', text: 'No friends yet. The Mbaru Tatu is friendlier than it looks — add someone.' }));
        },
        Pending() {
          body.innerHTML = '';
          body.appendChild(U.el('h3', { cls: 'gold mb', text: 'Incoming' }));
          if (!me.pendingIn.length) body.appendChild(U.el('p', { cls: 'muted small', text: 'None.' }));
          me.pendingIn.forEach(id => {
            const acc = G.world.accounts[id]; if (!acc) return;
            body.appendChild(friendRow(acc, [
              U.el('button', { cls: 'btn small', text: 'Accept', onclick: () => { G.respondFriendRequest(id, true); views.Pending(); } }),
              U.el('button', { cls: 'btn small ghost', text: 'Decline', onclick: () => { G.respondFriendRequest(id, false); views.Pending(); } }),
            ]));
          });
          body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Sent' }));
          if (!me.pendingOut.length) body.appendChild(U.el('p', { cls: 'muted small', text: 'None.' }));
          me.pendingOut.forEach(id => {
            const acc = G.world.accounts[id]; if (!acc) return;
            body.appendChild(friendRow(acc, [
              U.el('button', { cls: 'btn small ghost', text: 'Cancel', onclick: () => { me.pendingOut = me.pendingOut.filter(x => x !== id); const o = G.world.accounts[id]; if (o) o.pendingIn = o.pendingIn.filter(x => x !== me.id); G.save(); views.Pending(); } }),
            ]));
          });
        },
        Blocked() {
          body.innerHTML = '';
          if (!me.blocked.length) body.appendChild(U.el('p', { cls: 'muted', text: 'Nobody is blocked. Admirable restraint.' }));
          me.blocked.forEach(id => {
            const acc = G.world.accounts[id]; if (!acc) return;
            body.appendChild(friendRow(acc, [
              U.el('button', { cls: 'btn small', text: 'Unblock', onclick: () => { G.unblockPlayer(id); views.Blocked(); } }),
            ]));
          });
        },
      };
      ['Friends', 'Pending', 'Blocked'].forEach((t, i) => {
        const tab = U.el('div', { cls: 'tab' + (i === 0 ? ' active' : ''), text: t });
        tab.onclick = () => { U.qsa('.tab', tabs).forEach(x => x.classList.remove('active')); tab.classList.add('active'); views[t](); };
        tabs.appendChild(tab);
      });
      views.Friends();
    },
  });

  /* ================= AVATAR EDITOR ================= */
  UI.register('avatar', {
    enter(root) {
      const me = G.me;
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'Avatar & Titles' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('profile') }));
      head.appendChild(U.el('h2', { text: 'Avatar & Titles' }));
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body' });
      const cols = U.el('div', { cls: 'flex', style: 'align-items:flex-start;gap:26px' });

      /* live preview — how you appear to others */
      const prev = U.el('div', { cls: 'panel', style: 'width:250px;flex-shrink:0;text-align:center' });
      prev.appendChild(U.el('div', { cls: 'muted small mb', text: 'HOW OTHERS SEE YOU' }));
      const pc = U.el('canvas', { width: 150, height: 150, style: 'border-radius:50%;border:2px solid var(--gold-dim)' });
      prev.appendChild(pc);
      const pname = U.el('h3', { cls: 'gold mt', text: me.displayName });
      prev.appendChild(pname);
      const ptitle = U.el('div', { cls: 'muted small' });
      prev.appendChild(ptitle);
      function refreshPrev() {
        SPR.drawAvatar(pc.getContext('2d'), me.avatarIdx, 150);
        const t = me.titleId ? EC.TITLES.find(x => x.id === me.titleId) : null;
        ptitle.innerHTML = t ? '« ' + U.esc(t.name) + ' »<br><span class="small">' + U.esc(t.desc) + '</span>' : 'No title equipped';
      }
      refreshPrev();
      cols.appendChild(prev);

      /* §3 — your seal, under the preview */
      prev.appendChild(U.el('div', { cls: 'divider' }));
      prev.appendChild(U.el('div', { cls: 'muted small mb', text: 'YOUR SEAL' }));
      if (me.seal && me.seal.locked) {
        const sc = U.el('canvas', { width: 120, height: 120 });
        SPR.drawSeal(sc.getContext('2d'), 60, 60, 56, me.seal);
        prev.appendChild(sc);
        prev.appendChild(U.el('div', { cls: 'small muted mt', text: 'Struck once. Carried for life.' }));
      } else {
        prev.appendChild(U.el('p', { cls: 'small muted', text: 'You have not struck your seal yet.' }));
        prev.appendChild(U.el('button', { cls: 'btn small mt', text: '🪙 Strike your seal', onclick: () => UI.sealDesigner(() => UI.show('avatar')) }));
      }

      const rightCol = U.el('div', { cls: 'flex1' });
      rightCol.appendChild(U.el('h3', { cls: 'gold mb', text: 'Portraits' }));
      rightCol.appendChild(U.el('p', { cls: 'muted small mb', text: 'Unlock through levels, tournaments, achievements, and adventures.' }));
      const grid = U.el('div', { cls: 'avatar-grid' });
      for (let i = 0; i < SPR.AVATAR_COUNT; i++) {
        const unlocked = me.unlockedAvatars.includes(i);
        const cell = U.el('div', { cls: 'avatar-cell' + (me.avatarIdx === i ? ' selected' : '') + (unlocked ? '' : ' locked') });
        const c = U.el('canvas', { width: 86, height: 86 });
        SPR.drawAvatar(c.getContext('2d'), i, 86);
        cell.appendChild(c);
        if (!unlocked) cell.appendChild(U.el('div', { cls: 'lock', text: '🔒' }));
        else cell.onclick = () => { me.avatarIdx = i; G.save(); U.qsa('.avatar-cell', grid).forEach(x => x.classList.remove('selected')); cell.classList.add('selected'); refreshPrev(); DYA.audio.play('click'); };
        grid.appendChild(cell);
      }
      rightCol.appendChild(grid);

      rightCol.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'Titles' }));
      rightCol.appendChild(U.el('p', { cls: 'muted small mb', text: 'Only the equipped title’s buff is active. Tournament titles carry buffs; level and achievement titles are cosmetic.' }));
      const tgrid = U.el('div', { cls: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(230px,1fr))' });
      const noneCard = U.el('div', { cls: 'ach-card', style: 'cursor:pointer' + (me.titleId === null ? ';border-color:var(--gold)' : '') }, [
        U.el('div', { text: '—' }), U.el('div', { html: '<b>No title</b><br><span class="small muted">Blank. Mysterious.</span>' }),
      ]);
      noneCard.onclick = () => { me.titleId = null; G.save(); UI.show('avatar'); };
      tgrid.appendChild(noneCard);
      EC.TITLES.forEach(t => {
        const owned = me.titles.includes(t.id);
        const card = U.el('div', { cls: 'ach-card' + (owned ? '' : ' locked'), style: owned ? 'cursor:pointer' + (me.titleId === t.id ? ';border-color:var(--gold)' : '') : '' }, [
          U.el('div', { text: owned ? '👑' : '🔒' }),
          U.el('div', { html: '<b>' + U.esc(t.name) + '</b> <span class="small muted">(' + t.tier + ')</span><br><span class="small ' + (owned ? 'gold' : 'muted') + '">' + U.esc(t.desc) + '</span>' + (owned ? '' : '<br><span class="small muted">Win a ' + t.tier + ' tournament</span>') }),
        ]);
        if (owned) card.onclick = () => { me.titleId = t.id; G.save(); UI.show('avatar'); DYA.audio.play('click'); };
        tgrid.appendChild(card);
      });
      rightCol.appendChild(tgrid);
      cols.appendChild(rightCol);
      body.appendChild(cols);
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);
    },
  });
})();
