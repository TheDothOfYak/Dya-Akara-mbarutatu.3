/* ============================================================
   DYA'AKARA — core/audio.js
   Synthesized SFX via WebAudio. No music (composed by the
   creator later) — the music channel exists but stays silent.
   ============================================================ */
(function () {
  'use strict';
  const A = {
    ctx: null,
    volumes: { master: 0.8, music: 0.7, sfx: 0.8, crowd: 0.5 },
    muted: { master: false, music: false, sfx: false, crowd: false },
    shurgrEdanAudio: true,
  };

  function ctx() {
    if (!A.ctx) {
      try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { A.ctx = null; }
    }
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
    return A.ctx;
  }

  function gainFor(channel) {
    if (A.muted.master || A.muted[channel]) return 0;
    return A.volumes.master * (A.volumes[channel] != null ? A.volumes[channel] : 1);
  }

  /* Fire a simple synthesized tone. */
  function tone(opts) {
    const c = ctx(); if (!c) return;
    const vol = gainFor(opts.channel || 'sfx') * (opts.vol || 0.3);
    if (vol <= 0.001) return;
    const t0 = c.currentTime + (opts.delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq || 440, t0);
    if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + (opts.dur || 0.2));
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.dur || 0.2));
    osc.connect(g); g.connect(c.destination);
    osc.start(t0); osc.stop(t0 + (opts.dur || 0.2) + 0.05);
  }

  function noise(opts) {
    const c = ctx(); if (!c) return;
    const vol = gainFor(opts.channel || 'sfx') * (opts.vol || 0.2);
    if (vol <= 0.001) return;
    const dur = opts.dur || 0.3;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = opts.filter || 'lowpass';
    filt.frequency.value = opts.freq || 800;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(filt); filt.connect(g); g.connect(c.destination);
    src.start();
  }

  /* --------- named SFX used across the game --------- */
  const SFX = {
    click:      () => tone({ freq: 700, freqEnd: 500, dur: 0.06, vol: 0.15, type: 'triangle' }),
    hover:      () => tone({ freq: 900, dur: 0.03, vol: 0.05, type: 'sine' }),
    ready:      () => { tone({ freq: 420, freqEnd: 640, dur: 0.14, vol: 0.2, type: 'triangle' }); },
    deny:       () => tone({ freq: 180, freqEnd: 120, dur: 0.18, vol: 0.22, type: 'sawtooth' }),
    deploy:     () => { tone({ freq: 240, freqEnd: 520, dur: 0.25, vol: 0.3, type: 'triangle' }); noise({ freq: 1200, dur: 0.2, vol: 0.12 }); },
    pulse:      () => { tone({ freq: 520, dur: 0.09, vol: 0.14, type: 'sine' }); tone({ freq: 780, dur: 0.12, vol: 0.1, type: 'sine', delay: 0.06 }); },
    hit:        () => noise({ freq: 600, dur: 0.12, vol: 0.2 }),
    bigHit:     () => { noise({ freq: 300, dur: 0.3, vol: 0.32 }); tone({ freq: 90, freqEnd: 45, dur: 0.3, vol: 0.3, type: 'sine' }); },
    death:      () => tone({ freq: 300, freqEnd: 70, dur: 0.5, vol: 0.22, type: 'sawtooth' }),
    screech:    () => tone({ freq: 1600, freqEnd: 2400, dur: 0.4, vol: 0.18, type: 'sawtooth' }),
    breath:     () => noise({ freq: 900, dur: 0.45, vol: 0.2, filter: 'bandpass' }),
    teleport:   () => { tone({ freq: 900, freqEnd: 200, dur: 0.2, vol: 0.2, type: 'sine' }); tone({ freq: 200, freqEnd: 950, dur: 0.2, vol: 0.2, type: 'sine', delay: 0.12 }); },
    relicPick:  () => { tone({ freq: 520, dur: 0.1, vol: 0.25, type: 'square' }); tone({ freq: 660, dur: 0.1, vol: 0.25, type: 'square', delay: 0.1 }); tone({ freq: 880, dur: 0.2, vol: 0.25, type: 'square', delay: 0.2 }); },
    relicDrop:  () => tone({ freq: 500, freqEnd: 220, dur: 0.3, vol: 0.24, type: 'square' }),
    victory:    () => { [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.35, vol: 0.25, type: 'triangle', delay: i * 0.16 })); },
    defeat:     () => { [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.4, vol: 0.22, type: 'triangle', delay: i * 0.2 })); },
    coin:       () => { tone({ freq: 990, dur: 0.07, vol: 0.16, type: 'square' }); tone({ freq: 1320, dur: 0.12, vol: 0.14, type: 'square', delay: 0.06 }); },
    craft:      () => { [330, 415, 494, 660].forEach((f, i) => tone({ freq: f, dur: 0.5, vol: 0.15, type: 'sine', delay: i * 0.3 })); },
    levelup:    () => { [440, 554, 659, 880, 1108].forEach((f, i) => tone({ freq: f, dur: 0.3, vol: 0.22, type: 'triangle', delay: i * 0.12 })); },
    chest:      () => { tone({ freq: 300, freqEnd: 600, dur: 0.3, vol: 0.2, type: 'triangle' }); SFXdelay('coin', 0.3); },
    notify:     () => { tone({ freq: 740, dur: 0.1, vol: 0.14, type: 'sine' }); tone({ freq: 988, dur: 0.15, vol: 0.12, type: 'sine', delay: 0.09 }); },
    crowd:      () => { noise({ freq: 500, dur: 1.2, vol: 0.25, channel: 'crowd', filter: 'bandpass' }); },
    /* ShurgrEdan retribution strike — has its own settings toggle */
    shurgrEdan: () => {
      if (!A.shurgrEdanAudio) return;
      noise({ freq: 200, dur: 1.0, vol: 0.5 });
      tone({ freq: 60, freqEnd: 30, dur: 1.2, vol: 0.5, type: 'sawtooth' });
      tone({ freq: 2000, freqEnd: 100, dur: 0.8, vol: 0.3, type: 'sawtooth', delay: 0.1 });
    },
  };
  function SFXdelay(name, d) { setTimeout(() => SFX[name] && SFX[name](), d * 1000); }

  A.play = function (name) { try { if (SFX[name]) SFX[name](); } catch (e) { /* audio must never break the game */ } };
  A.setVolume = function (ch, v) { A.volumes[ch] = v; };
  A.setMuted = function (ch, m) { A.muted[ch] = m; };

  DYA.audio = A;
})();
