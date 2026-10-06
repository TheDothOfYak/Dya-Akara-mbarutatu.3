/* ============================================================
   Procedural sound — no audio files. A warm wind-and-pad bed,
   and small synthesized hits, whooshes and chimes.
   ============================================================ */
let ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
let volume = 0.7;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startAmbience();
}

export function setVolume(v) { volume = v; if (master) master.gain.value = v; }

function startAmbience() {
  // wind
  const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.6;
  const wg = ctx.createGain(); wg.gain.value = 0.25;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 220;
  lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
  n.connect(bp); bp.connect(wg); wg.connect(musicGain); n.start();
  // a slow modal pad
  const chords = [[146.8, 220, 293.7, 349.2], [130.8, 196, 261.6, 329.6], [116.5, 174.6, 233.1, 293.7], [130.8, 196, 246.9, 329.6]];
  const voices = chords[0].map(() => {
    const o = ctx.createOscillator(); o.type = 'triangle';
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.detune.value = 7;
    const g = ctx.createGain(); g.gain.value = 0.06;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musicGain); o.start(); o2.start();
    return { o, o2, g };
  });
  let ci = 0;
  const step = () => {
    const ch = chords[ci % chords.length]; ci++;
    const t = ctx.currentTime;
    voices.forEach((v, i) => {
      v.o.frequency.setTargetAtTime(ch[i], t, 1.2); v.o2.frequency.setTargetAtTime(ch[i] * 2, t, 1.2);
      v.g.gain.setTargetAtTime(0.03 + Math.random() * 0.04, t, 2);
    });
    // a high bell now and then
    if (Math.random() < 0.6) tone(ch[Math.floor(Math.random() * 4)] * 4, 0.05, 3.5, 'sine', musicGain, 0.4 + Math.random());
  };
  step(); setInterval(step, 7000);
}

function tone(freq, gain, dur, type = 'sine', dest = sfxGain, delay = 0, slideTo = null) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, gain, f0, f1, q = 1, type = 'bandpass', delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

export const sfx = {
  swing() { noise(0.22, 0.35, 600, 2600, 1.2); },
  heavy() { noise(0.32, 0.45, 300, 1800, 1); tone(90, 0.2, 0.25, 'sine', sfxGain, 0, 50); },
  hit() { noise(0.12, 0.6, 1800, 300, 0.8); tone(140, 0.35, 0.16, 'square', sfxGain, 0, 60); },
  hurt() { tone(220, 0.25, 0.25, 'sawtooth', sfxGain, 0, 110); noise(0.15, 0.3, 900, 200); },
  step() { noise(0.06, 0.06, 500, 200, 2, 'lowpass'); },
  jump() { noise(0.15, 0.12, 400, 900, 1); },
  land() { noise(0.1, 0.18, 300, 100, 1, 'lowpass'); },
  duat() { tone(880, 0.16, 0.5, 'sine', sfxGain, 0, 110); tone(1320, 0.08, 0.4, 'triangle', sfxGain, 0.03, 220); noise(0.4, 0.2, 3000, 300, 3); },
  flare() { noise(0.9, 0.6, 200, 3000, 0.6); tone(70, 0.4, 0.8, 'sawtooth', sfxGain, 0, 35); },
  core() { [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, 0.18, 1.6, 'sine', sfxGain, i * 0.09)); },
  heal() { [392, 523.3, 659.3].forEach((f, i) => tone(f, 0.12, 0.9, 'triangle', sfxGain, i * 0.07)); },
  sense() { tone(330, 0.12, 1.2, 'sine', sfxGain, 0, 660); tone(495, 0.08, 1.2, 'sine', sfxGain, 0.1, 990); },
  bolt() { tone(700, 0.1, 0.25, 'sine', sfxGain, 0, 300); noise(0.2, 0.12, 2000, 800, 2); },
  die() { noise(0.4, 0.35, 1200, 150, 1); tone(300, 0.15, 0.4, 'triangle', sfxGain, 0, 80); },
  blink() { tone(1200, 0.08, 0.18, 'sine', sfxGain, 0, 400); },
  roar() { tone(55, 0.5, 1.8, 'sawtooth', sfxGain, 0, 38); noise(1.6, 0.4, 150, 600, 0.7); },
  slam() { tone(45, 0.6, 0.7, 'sine', sfxGain, 0, 30); noise(0.5, 0.5, 800, 80, 0.7); },
  talk() { tone(500 + Math.random() * 200, 0.025, 0.05, 'triangle'); },
  ui() { tone(660, 0.08, 0.12, 'triangle'); },
  victory() { [392, 494, 587, 784, 988].forEach((f, i) => tone(f, 0.16, 2.2, 'triangle', sfxGain, i * 0.14)); },
};
