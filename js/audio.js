// All sound is synthesised with WebAudio. No audio files.
let ctx = null;
let master, sfxBus, musicBus, comp, noiseBuf, delayIn;
const opts = { muted: false, music: true, sfx: true };
const last = Object.create(null);
let voices = 0;

export function audioReady() { return !!ctx; }

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  } catch (e) { ctx = null; return; }
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5;
  comp.attack.value = 0.003; comp.release.value = 0.2;
  master = ctx.createGain();
  master.gain.value = opts.muted ? 0 : 0.8;
  comp.connect(master); master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = opts.sfx ? 0.55 : 0; sfxBus.connect(comp);
  musicBus = ctx.createGain(); musicBus.gain.value = opts.music ? 0.32 : 0; musicBus.connect(comp);
  // music echo
  delayIn = ctx.createGain(); delayIn.gain.value = 0.35;
  const dl = ctx.createDelay(1); dl.delayTime.value = (60 / BPM) * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  delayIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(musicBus);
  // noise
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  startMusic();
}

export function setAudioOpts(o) {
  Object.assign(opts, o);
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(opts.muted ? 0 : 0.8, t, 0.03);
  sfxBus.gain.setTargetAtTime(opts.sfx ? 0.55 : 0, t, 0.03);
  musicBus.gain.setTargetAtTime(opts.music ? 0.32 : 0, t, 0.03);
}

export function suspendAudio(s) {
  if (!ctx) return;
  if (s) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
}

function ok(name, gap) {
  if (!ctx || opts.muted || !opts.sfx || ctx.state !== 'running') return false;
  if (voices > 28) return false;
  const t = ctx.currentTime;
  if (last[name] !== undefined && t - last[name] < gap) return false;
  last[name] = t;
  return true;
}

function env(g, t, a, peak, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone(type, f0, f1, dur, vol, t = ctx.currentTime, dest = sfxBus, attack = 0.004) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, attack, vol, dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.02);
  voices++;
  o.onended = () => { voices--; };
}

function noise(dur, vol, type, f0, f1, t = ctx.currentTime, dest = sfxBus, q = 1) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf; s.loop = true;
  s.playbackRate.value = 0.7 + Math.random() * 0.6;
  const f = ctx.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = ctx.createGain();
  env(g, t, 0.003, vol, dur);
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  voices++;
  s.onended = () => { voices--; };
}

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const sfx = {
  hit() { if (!ok('hit', 0.05)) return; tone('square', 260 + Math.random() * 90, 110, 0.05, 0.035); },
  kill() {
    if (!ok('kill', 0.035)) return;
    noise(0.09, 0.12, 'bandpass', 2200, 500, undefined, undefined, 1.4);
    tone('triangle', 520 + Math.random() * 200, 90, 0.09, 0.06);
  },
  gem(combo) {
    if (!ok('gem', 0.028)) return;
    const n = PENTA[Math.min(PENTA.length - 1, combo % 32 >> 1)];
    const f = mtof(76 + n);
    tone('sine', f, f * 1.01, 0.09, 0.07);
    tone('triangle', f * 2, f * 2, 0.05, 0.025);
  },
  coin() {
    if (!ok('coin', 0.05)) return;
    const t = ctx.currentTime;
    tone('square', 1318, 1318, 0.06, 0.04, t);
    tone('square', 1760, 1760, 0.12, 0.04, t + 0.06);
  },
  levelup() {
    if (!ok('lv', 0.2)) return;
    const t = ctx.currentTime;
    [0, 4, 7, 12, 16].forEach((n, i) => {
      tone('square', mtof(72 + n), mtof(72 + n), 0.16, 0.06, t + i * 0.055);
      tone('sine', mtof(84 + n), mtof(84 + n), 0.2, 0.04, t + i * 0.055);
    });
    noise(0.5, 0.05, 'highpass', 3000, 9000, t);
  },
  card() {
    if (!ok('card', 0.04)) return;
    tone('triangle', 900, 1400, 0.06, 0.05);
  },
  pick() {
    if (!ok('pick', 0.1)) return;
    const t = ctx.currentTime;
    tone('square', mtof(79), mtof(79), 0.08, 0.05, t);
    tone('square', mtof(86), mtof(86), 0.14, 0.05, t + 0.07);
  },
  chest() {
    if (!ok('chest', 0.3)) return;
    const t = ctx.currentTime;
    [0, 7, 12, 16, 19, 24].forEach((n, i) => tone('square', mtof(67 + n), mtof(67 + n), 0.22, 0.05, t + i * 0.09));
    tone('sawtooth', mtof(43), mtof(55), 0.7, 0.05, t);
    noise(1.0, 0.04, 'highpass', 4000, 10000, t + 0.4);
  },
  evolve() {
    if (!ok('evo', 0.4)) return;
    const t = ctx.currentTime;
    tone('sawtooth', 110, 880, 0.9, 0.06, t, sfxBus, 0.3);
    [0, 4, 7, 11, 14, 19, 23].forEach((n, i) => tone('triangle', mtof(74 + n), mtof(74 + n), 0.4, 0.05, t + 0.5 + i * 0.06));
    noise(1.4, 0.06, 'bandpass', 800, 8000, t, sfxBus, 2);
  },
  hurt() {
    if (!ok('hurt', 0.12)) return;
    tone('sawtooth', 220, 60, 0.22, 0.12);
    noise(0.15, 0.1, 'lowpass', 1500, 200);
  },
  whip() {
    if (!ok('whip', 0.06)) return;
    noise(0.16, 0.14, 'bandpass', 900, 5000, undefined, undefined, 3);
    tone('sawtooth', 1600, 300, 0.08, 0.025);
  },
  boom() {
    if (!ok('boom', 0.07)) return;
    noise(0.35, 0.2, 'lowpass', 1800, 90);
    tone('sine', 140, 38, 0.3, 0.16);
  },
  bigboom() {
    if (!ok('bigboom', 0.2)) return;
    noise(1.0, 0.35, 'lowpass', 2400, 50);
    tone('sine', 110, 25, 0.9, 0.3);
  },
  zap() {
    if (!ok('zap', 0.08)) return;
    noise(0.12, 0.14, 'highpass', 3500, 1500);
    tone('square', 1200 + Math.random() * 500, 150, 0.1, 0.035);
  },
  thunder() {
    if (!ok('thunder', 0.25)) return;
    noise(0.6, 0.2, 'lowpass', 3000, 120);
  },
  laser() {
    if (!ok('laser', 0.1)) return;
    tone('sawtooth', 1800, 220, 0.28, 0.05);
    tone('sine', 900, 120, 0.3, 0.06);
  },
  launch() {
    if (!ok('launch', 0.08)) return;
    noise(0.14, 0.07, 'bandpass', 600, 2400, undefined, undefined, 2);
  },
  boomer() {
    if (!ok('boomer', 0.1)) return;
    tone('triangle', 500, 900, 0.12, 0.04);
  },
  fire() {
    if (!ok('fire', 0.15)) return;
    noise(0.3, 0.08, 'bandpass', 400, 1400, undefined, undefined, 1);
  },
  eshoot() {
    if (!ok('eshoot', 0.12)) return;
    tone('square', 600, 300, 0.07, 0.025);
  },
  heal() {
    if (!ok('heal', 0.2)) return;
    const t = ctx.currentTime;
    [0, 4, 7, 12].forEach((n, i) => tone('sine', mtof(72 + n), mtof(72 + n), 0.2, 0.06, t + i * 0.05));
  },
  magnet() {
    if (!ok('magnet', 0.3)) return;
    tone('sine', 200, 1600, 0.6, 0.08, undefined, sfxBus, 0.05);
  },
  nuke() {
    if (!ok('nuke', 0.3)) return;
    noise(1.5, 0.4, 'lowpass', 5000, 40);
    tone('sine', 90, 20, 1.4, 0.35);
  },
  warn() {
    if (!ok('warn', 1)) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      tone('sawtooth', 440, 440, 0.28, 0.07, t + i * 0.6);
      tone('sawtooth', 330, 330, 0.28, 0.07, t + i * 0.6 + 0.3);
    }
  },
  dash() {
    if (!ok('dash', 0.2)) return;
    noise(0.4, 0.15, 'bandpass', 300, 1600, undefined, undefined, 1.5);
  },
  click() {
    if (!ok('click', 0.03)) return;
    tone('square', 880, 660, 0.04, 0.04);
  },
  buy() {
    if (!ok('buy', 0.08)) return;
    const t = ctx.currentTime;
    tone('square', mtof(84), mtof(84), 0.06, 0.05, t);
    tone('square', mtof(91), mtof(91), 0.15, 0.05, t + 0.06);
  },
  deny() {
    if (!ok('deny', 0.1)) return;
    tone('square', 160, 120, 0.15, 0.06);
  },
  death() {
    if (!ok('death', 1)) return;
    const t = ctx.currentTime;
    tone('sawtooth', 330, 40, 1.4, 0.12, t);
    noise(1.2, 0.2, 'lowpass', 2000, 60, t);
  },
  win() {
    if (!ok('win', 1)) return;
    const t = ctx.currentTime;
    [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((n, i) => tone('square', mtof(67 + n), mtof(67 + n), 0.25, 0.05, t + i * 0.12));
  },
  ach() {
    if (!ok('ach', 0.3)) return;
    const t = ctx.currentTime;
    [0, 7, 12].forEach((n, i) => tone('triangle', mtof(79 + n), mtof(79 + n), 0.25, 0.06, t + i * 0.08));
  },
};

// ---------------- music: procedural synthwave loop ----------------
const BPM = 124;
const STEP = 60 / BPM / 4;
let intensity = 0;
let musicTimer = null;
let nextT = 0;
let stepI = 0;
// A minor: Am F C G
const ROOTS = [45, 41, 48, 43];
const CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]];
const BASS = [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 10, 7];
const ARP = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 3, 2, 1, 0, 1];

export function setIntensity(i) { intensity = i; }

function startMusic() {
  if (musicTimer) return;
  nextT = ctx.currentTime + 0.1;
  musicTimer = setInterval(schedule, 25);
}

function kick(t) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  env(g, t, 0.002, 0.7, 0.22);
  o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.25);
}
function snare(t) {
  noise(0.18, 0.28, 'bandpass', 1800, 900, t, musicBus, 0.8);
  tone('triangle', 220, 160, 0.08, 0.15, t, musicBus);
}
function hat(t, open) { noise(open ? 0.12 : 0.04, open ? 0.08 : 0.06, 'highpass', 8000, 8000, t, musicBus); }

function schedule() {
  if (!ctx || ctx.state !== 'running') { if (ctx) nextT = ctx.currentTime + 0.1; return; }
  if (opts.muted || !opts.music) { nextT = ctx.currentTime + 0.1; return; }
  while (nextT < ctx.currentTime + 0.12) {
    playStep(stepI, nextT);
    stepI = (stepI + 1) % 64;
    nextT += STEP * (intensity >= 3 ? 0.92 : 1);
  }
}

function playStep(i, t) {
  const bar = (i >> 4) & 3, s = i & 15;
  const root = ROOTS[bar], ch = CHORDS[bar];
  // pad at bar start
  if (s === 0) {
    for (const n of ch) {
      const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = (Math.random() - 0.5) * 14;
      f.type = 'lowpass'; f.frequency.value = intensity === 0 ? 700 : 1100;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + STEP * 16);
      o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + STEP * 16 + 0.05);
    }
  }
  if (intensity >= 1) {
    if (s % 4 === 0) kick(t);
    if (s === 4 || s === 12) snare(t);
    if (s % 2 === 0) hat(t, s % 4 === 2);
    if (intensity >= 2 && s % 2 === 1) hat(t, false);
    if (s % 2 === 0 || intensity >= 2) {
      const n = root - 12 + BASS[s];
      const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = mtof(n);
      f.type = 'lowpass'; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(220, t + STEP * 1.6);
      env(g, t, 0.004, 0.16, STEP * 1.7);
      o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + STEP * 2);
    }
  } else if (s % 8 === 0) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = mtof(root - 12);
    env(g, t, 0.05, 0.12, STEP * 7);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + STEP * 8);
  }
  // arp lead
  const arpOn = intensity === 0 ? s % 2 === 0 : intensity >= 2 || s % 2 === 0;
  if (arpOn) {
    const idx = ARP[s];
    const n = idx === 3 ? ch[0] + 12 : ch[idx] + 12;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = intensity >= 2 ? 'square' : 'triangle';
    o.frequency.value = mtof(n);
    env(g, t, 0.003, intensity >= 2 ? 0.035 : 0.04, STEP * 0.9);
    o.connect(g); g.connect(musicBus); g.connect(delayIn); o.start(t); o.stop(t + STEP);
  }
  if (intensity >= 3 && s % 8 === 6) {
    noise(0.25, 0.06, 'bandpass', 3000, 600, t, musicBus, 4);
  }
}
