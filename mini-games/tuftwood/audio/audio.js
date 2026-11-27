// © 2026 Isaac Flake. All Rights Reserved.
/* 4 Brothers World V3 — a small, entirely synthesized forest orchestra. */
(function () {
  'use strict';
  var V3 = window.V3 = window.V3 || {};
  var ctx, master, compressor, warmth, noiseBuffer, timer;
  var ready = false, muted = false, musicZone = null, song = null;
  var voices = new Set(), beds = [], air = {};
  var weather = { rain: 0, wind: 0, night: 0, cave: 0 };
  var cricketAt = 0, dripAt = 0;
  var TAU = Math.PI * 2;

  function safe(fn) { try { return fn(); } catch (_) { /* Audio is optional. */ } }
  function number(value, fallback, lo, hi) {
    return typeof value === 'number' && isFinite(value)
      ? Math.max(lo, Math.min(hi, value)) : fallback;
  }
  function random(lo, hi) { return lo + Math.random() * (hi - lo); }
  function hz(note) { return 440 * Math.pow(2, (note - 69) / 12); }
  function allowed() { return ready && !muted && ctx && ctx.state !== 'closed'; }
  function pref(write) {
    return safe(function () {
      if (V3.save && typeof V3.save.pref === 'function') {
        return write ? V3.save.pref('mute', muted) : V3.save.pref('mute');
      }
    });
  }
  function resume() {
    if (!allowed() || ctx.state === 'running') return;
    safe(function () {
      var pending = ctx.resume();
      if (pending && pending.catch) pending.catch(function () {});
    });
  }
  function gain(value, destination) {
    var node = ctx.createGain();
    node.gain.value = value;
    node.connect(destination);
    return node;
  }
  function filter(type, frequency, q, destination) {
    var node = ctx.createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    node.Q.value = q;
    node.connect(destination);
    return node;
  }
  // Every finite voice owns its nodes and disconnects them when it ends.
  function track(source, nodes, end, after) {
    var entry = { source: source, nodes: nodes };
    voices.add(entry);
    source.onended = function () {
      voices.delete(entry);
      nodes.forEach(function (node) { safe(function () { node.disconnect(); }); });
      if (after) safe(after);
    };
    if (end !== undefined) source.stop(end);
    return source;
  }
  function outlet(volume, pan, destination) {
    var envelope = gain(0, destination || master), nodes = [envelope];
    if (ctx.createStereoPanner) {
      var stereo = ctx.createStereoPanner();
      stereo.pan.value = pan;
      envelope.disconnect();
      envelope.connect(stereo);
      stereo.connect(destination || master);
      nodes.push(stereo);
    }
    return { envelope: envelope, nodes: nodes, volume: volume };
  }
  function shape(param, start, duration, level, attack) {
    attack = Math.min(attack || 0.012, duration * 0.35);
    param.setValueAtTime(0, start);
    param.linearRampToValueAtTime(level, start + attack);
    param.exponentialRampToValueAtTime(0.00001, start + duration);
    param.linearRampToValueAtTime(0, start + duration + 0.02);
  }
  function tone(frequency, duration, volume, options) {
    if (voices.size >= 100) return;
    options = options || {};
    var start = ctx.currentTime + (options.delay || 0);
    var out = outlet(volume, options.pan || 0, options.bus);
    var osc = ctx.createOscillator();
    osc.type = options.type || 'sine';
    osc.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (options.to) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), start + duration);
    }
    osc.connect(out.envelope);
    shape(out.envelope.gain, start, duration, volume, options.attack);
    track(osc, [osc].concat(out.nodes), start + duration + 0.03);
    osc.start(start);
  }
  function noise(frequency, duration, volume, options) {
    if (voices.size >= 100) return;
    options = options || {};
    var start = ctx.currentTime + (options.delay || 0);
    var out = outlet(volume, options.pan || 0, options.bus);
    var band = filter(options.type || 'bandpass', frequency, options.q || 0.65, out.envelope);
    var source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    source.connect(band);
    if (options.to) band.frequency.exponentialRampToValueAtTime(options.to, start + duration);
    shape(out.envelope.gain, start, duration, volume, options.attack || 0.025);
    track(source, [source, band].concat(out.nodes), start + duration + 0.03);
    source.start(start, random(0, 2));
  }
  function mallet(frequency, duration, volume, options) {
    tone(frequency, duration, volume, options);
    var overtone = Object.assign({}, options);
    // A very quiet, slightly inharmonic partial gives rounded wooden resonance.
    tone(frequency * 2.76, duration * 0.34, volume * 0.13, overtone);
  }

  // Recipes use relative pitch and gain; all oscillators have click-free envelopes.
  function effect(name, opts) {
    opts = opts || {};
    var volume = number(opts.vol, 1, 0, 1);
    var pitch = number(opts.pitch, 1, 0.25, 4);
    var pan = number(opts.pan, 0, -1, 1);
    function t(f, d, v, to, delay, type) {
      tone(f * pitch, d, v * volume, {
        to: to ? to * pitch : 0, delay: delay || 0, pan: pan, type: type || 'sine'
      });
    }
    function n(f, d, v, to, delay) {
      noise(f * pitch, d, v * volume, {
        to: to ? to * pitch : 0, delay: delay || 0, pan: pan
      });
    }
    function m(f, d, v, delay) {
      mallet(f * pitch, d, v * volume, { pan: pan, delay: delay || 0 });
    }
    function notes(list, spacing, duration, level) {
      list.forEach(function (f, i) { m(f, duration, level, i * spacing); });
    }
    switch (name) {
      case 'jump': t(220, .2, .13, 430); n(700, .09, .025); break;
      case 'land': m(105, .17, .16); n(240, .12, .07); break;
      case 'puff': n(650, .24, .12, 240); t(180, .14, .035, 130); break;
      case 'glide': n(1300, .48, .065, 600); t(440, .4, .035, 520); break;
      case 'zap': t(620, .18, .09, 310); m(930, .13, .035); break;
      case 'zapbig': t(330, .38, .13, 165); t(660, .3, .055, 220); n(900, .22, .055); break;
      case 'dash': n(480, .23, .13, 1800); t(160, .18, .07, 290); break;
      case 'roll': n(140, .45, .15, 220); [0, .09, .2, .32].forEach(function (d) { m(78, .1, .06, d); }); break;
      case 'slam': m(65, .42, .23); m(117, .22, .1, .015); n(300, .26, .1); break;
      case 'punch': t(155, .14, .18, 70); n(450, .08, .07); break;
      case 'crack': n(1800, .07, .1); m(270, .13, .09); m(390, .1, .065, .035); break;
      case 'seed': m(740, .19, .11); t(370, .13, .04, 540); break;
      case 'sprout': notes([262, 330, 440], .085, .3, .09); n(1000, .25, .025); break;
      case 'bloom': notes([392, 494, 587, 784], .09, .65, .08); break;
      case 'tuck': t(280, .22, .12, 100); n(330, .15, .045); break;
      case 'parry': m(880, .3, .11); m(1320, .22, .055, .025); break;
      case 'boo': t(185, .48, .13, 310); t(188, .44, .035, 306); break;
      case 'possess': t(196, .58, .09, 392); t(294, .52, .05, 588, .07); n(700, .4, .025); break;
      case 'unpossess': t(392, .48, .09, 196); t(588, .4, .045, 294, .05); break;
      case 'phase': n(1200, .4, .07, 350); t(523, .36, .06, 494); break;
      case 'swap': notes([330, 440], .075, .23, .11); break;
      case 'hurt': t(270, .24, .11, 160); m(185, .16, .07, .055); break;
      case 'heal': notes([330, 392, 523], .13, .55, .09); break;
      case 'poke': m(420, .105, .12); break;
      case 'splash': n(1600, .42, .13, 420); t(210, .17, .085, 90); break;
      case 'plop': t(360, .2, .14, 95); m(630, .1, .035, .025); break;
      case 'ribbit': t(185, .14, .12, 125); t(225, .19, .11, 140, .16); break;
      case 'hoot': t(349, .32, .09, 330); t(330, .48, .1, 294, .36); break;
      case 'snort': n(260, .24, .12, 140); t(90, .17, .06, 65); break;
      case 'squish': n(550, .19, .09, 180); t(140, .19, .095, 240); break;
      case 'chime': notes([1047, 1319], .075, .72, .055); break;
      case 'bell': t(523, 1.05, .11); t(1049, .65, .028); t(1468, .3, .012); break;
      case 'sneeze': n(800, .12, .06, 1200); n(2200, .24, .13, 500, .13); t(300, .16, .05, 140, .14); break;
      case 'knock': m(180, .12, .13); m(200, .13, .11, .16); break;
      case 'discover': notes([392, 494, 587, 784, 988], .12, .8, .09); break;
      case 'keepsake': notes([523, 659, 784, 1047], .18, 1.1, .08); t(262, 1.4, .045); break;
      case 'page': n(2200, .22, .065, 800); n(1400, .1, .035, 2100, .12); break;
      case 'talk': t(310, .095, .07, 370); t(390, .08, .05, 350, .085); break;
      case 'vine': n(720, .4, .055, 1400); t(165, .4, .075, 330); m(495, .2, .05, .22); break;
      case 'thud': m(82, .26, .18); n(170, .15, .065); break;
      case 'rift': t(147, .85, .085, 220); t(222, .75, .055, 330); n(450, .65, .05, 1100); break;
      case 'star': notes([1175, 1568, 2093], .07, .65, .045); break;
      case 'snore': n(190, .75, .08, 310); t(82, .68, .06, 110); t(110, .3, .035, 75, .65); break;
    }
  }

  // MIDI pentatonic patterns; each place has its own register, pace and colour.
  var zones = {
    village: { root: 60, scale: [0, 2, 4, 7, 9], pace: 1.25, pad: [0, 7, 16], flute: .25 },
    woods:   { root: 55, scale: [0, 2, 5, 7, 9], pace: 1.8, pad: [0, 7, 14], flute: .45 },
    hollow:  { root: 50, scale: [0, 3, 5, 7, 10], pace: 2.6, pad: [0, 7, 15], flute: .6 },
    pond:    { root: 62, scale: [0, 2, 4, 7, 9], pace: 2.2, pad: [0, 7, 14], flute: .7 },
    ridge:   { root: 57, scale: [0, 2, 5, 7, 10], pace: 2.4, pad: [0, 7, 17], flute: .85 },
    glade:   { root: 64, scale: [0, 2, 4, 7, 11], pace: 1.7, pad: [0, 7, 16], flute: .4 },
    title:   { root: 60, scale: [0, 2, 5, 7, 9], pace: 2, pad: [0, 7, 14], flute: .5 }
  };
  function fadeSong(old) {
    if (!old) return;
    var now = ctx.currentTime, param = old.bus.gain;
    // This bus has only a linear fade-in, so its present level is known exactly.
    var current = Math.min(1, Math.max(0, (now - old.born) / 2));
    param.cancelScheduledValues(now);
    param.setValueAtTime(current, now);
    param.linearRampToValueAtTime(0, now + 2);
    old.pads.forEach(function (osc) { safe(function () { osc.stop(now + 2.05); }); });
  }
  function startSong(zone) {
    if (song && song.zone === zone) return;
    fadeSong(song);
    song = null;
    if (zone === null) return;
    var config = zones[zone], now = ctx.currentTime;
    var current = { zone: zone, config: config, bus: gain(0, master), pads: [],
      born: now, next: now + .15, step: 2, remaining: 3 };
    song = current;
    current.bus.gain.setValueAtTime(0, now);
    current.bus.gain.linearRampToValueAtTime(1, now + 2);
    config.pad.forEach(function (interval, i) {
      var padGain = gain(.009, current.bus), osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = hz(config.root - 12 + interval);
      osc.detune.value = (i - 1) * 3;
      osc.connect(padGain);
      current.pads.push(osc);
      track(osc, [osc, padGain], undefined, function () {
        current.remaining--;
        if (!current.remaining) current.bus.disconnect();
      });
      osc.start();
    });
  }
  function melody(now) {
    if (!song || now < song.next) return;
    var config = song.config, scale = config.scale;
    song.step = Math.max(0, Math.min(9, song.step + (Math.random() < .5 ? -1 : 1)));
    var note = config.root + scale[song.step % 5] + 12 * Math.floor(song.step / 5);
    var options = { bus: song.bus, pan: random(-.45, .45), attack: .09 };
    if (Math.random() < config.flute) {
      tone(hz(note), 1.7, .033, options);
      tone(hz(note) * 2, 1.3, .003, options);
    } else {
      mallet(hz(note), 1.2, .047, { bus: song.bus, pan: options.pan });
    }
    song.next = now + config.pace * random(.85, 1.35);
  }

  function makeBed(kind, frequency) {
    var level = gain(0, master);
    var band = filter(kind === 'wind' ? 'lowpass' : 'bandpass', frequency, .55, level);
    var source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    source.connect(band);
    source.start(0, random(0, 2));
    beds.push({ source: source, nodes: [source, band, level] });
    return { level: level, band: band };
  }
  function makeBeds() {
    if (beds.length) return;
    air.rain = makeBed('rain', 2500);
    air.wind = makeBed('wind', 420);
  }
  function stopBeds() {
    beds.forEach(function (bed) {
      safe(function () { bed.source.stop(); });
      bed.nodes.forEach(function (node) { safe(function () { node.disconnect(); }); });
    });
    beds = [];
    air = {};
  }
  // One clock for music and sparse creatures; frame-rate-independent smoothing.
  var smooth = { rain: 0, wind: 0, night: 0, cave: 0 }, lastTick = 0;
  function tick() {
    if (!allowed() || ctx.state !== 'running') return;
    if ((song ? song.zone : null) !== musicZone) startSong(musicZone);
    var now = ctx.currentTime;
    var dt = Math.min(.5, Math.max(0, now - lastTick));
    lastTick = now;
    Object.keys(smooth).forEach(function (key) {
      smooth[key] += (weather[key] - smooth[key]) * (1 - Math.exp(-dt / .8));
    });
    if (air.rain) {
      air.rain.level.gain.setTargetAtTime(smooth.rain * .075, now, .3);
      var gust = .7 + .3 * Math.sin(now * .37) * Math.sin(now * .13);
      air.wind.level.gain.setTargetAtTime(smooth.wind * .12 * gust, now, .4);
      air.wind.band.frequency.setTargetAtTime(280 + 350 * gust, now, .5);
    }
    melody(now);
    if (now >= cricketAt) {
      cricketAt = now + random(.9, 2.8);
      if (smooth.night > .01) {
        var pan = random(-.85, .85), frequency = random(2350, 2850);
        for (var i = 0; i < 3; i++) {
          tone(frequency, .075, .009 * smooth.night,
            { delay: i * .13, pan: pan, to: frequency * .96 });
        }
      }
    }
    if (now >= dripAt) {
      dripAt = now + random(1.4, 4.5);
      if (smooth.cave > .01) {
        var f = random(680, 1050), side = random(-.7, .7);
        tone(f, .18, .045 * smooth.cave, { to: f * .58, pan: side });
        mallet(f * .58, .65, .012 * smooth.cave, { delay: .17, pan: -side });
      }
    }
  }
  function stopVoices() {
    voices.forEach(function (entry) {
      safe(function () { entry.source.stop(); });
      entry.nodes.forEach(function (node) { safe(function () { node.disconnect(); }); });
    });
    voices.clear();
    song = null;
  }
  function silence() {
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0, ctx.currentTime);
    stopVoices();
    stopBeds();
  }
  function initialize() {
    if (ready) { resume(); return; }
    var Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    var saved = pref(false);
    if (typeof saved === 'boolean') muted = saved;
    try {
      ctx = new Audio();
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 2;
      compressor.attack.value = .012;
      compressor.release.value = .25;
      compressor.connect(ctx.destination);
      warmth = filter('lowpass', 5200, .5, compressor);
      master = gain(muted ? 0 : .72, warmth);
      noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 3), ctx.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      ready = true;
      if (!muted) { makeBeds(); resume(); }
      timer = window.setInterval(function () { safe(tick); }, 100);
    } catch (_) {
      ready = false;
      stopBeds();
      safe(function () {
        if (ctx) { var closing = ctx.close(); if (closing && closing.catch) closing.catch(function () {}); }
      });
      ctx = null;
    }
  }
  function setMuted(value) {
    muted = !!value;
    pref(true);
    if (!ready) return;
    if (muted) { silence(); return; }
    master.gain.setTargetAtTime(.72, ctx.currentTime, .04);
    lastTick = ctx.currentTime;
    makeBeds();
    resume();
    if (musicZone && ctx.state === 'running') startSong(musicZone);
  }

  V3.audio = {
    init: function () { safe(initialize); },
    sfx: function (name, opts) {
      if (!allowed()) return;
      safe(function () { effect(name, opts); });
    },
    note: function (i) {
      if (!allowed() || typeof i !== 'number' || i % 1 || i < 0 || i > 7) return;
      safe(function () {
        mallet(hz([60, 62, 64, 67, 69, 72, 74, 76][i]), .85, .14, {});
      });
    },
    music: function (zone) {
      if (zone !== null && !Object.prototype.hasOwnProperty.call(zones, zone)) return;
      musicZone = zone;
      if (!allowed() || ctx.state !== 'running') return;
      safe(function () { startSong(zone); });
    },
    ambience: function (values) {
      if (!allowed() || !values) return;
      safe(function () {
        Object.keys(weather).forEach(function (key) {
          weather[key] = number(values[key], 0, 0, 1);
        });
      });
    },
    setMuted: function (value) { safe(function () { setMuted(value); }); },
    get muted() { return muted; }
  };
  safe(function () {
    window.document.addEventListener('visibilitychange', function () {
      if (!window.document.hidden) resume();
    });
    window.addEventListener('pagehide', function (event) {
      // A bfcache page must retain its context and clock for restoration.
      if (event.persisted) return;
      safe(function () { window.clearInterval(timer); silence(); });
    });
  });
}());
