// Audio: every sound is synthesized with WebAudio — no audio files, no
// network. A low casino-floor hum under everything, a bright chime for loot,
// a metallic ring for a tossed coin, a rising sting when a guard spots you,
// a klaxon for a camera lock, a zap for the EMP, a sad fall when you are
// caught, and a little vault-door arpeggio when a floor is cleared.
// M toggles mute. Nothing here plays until the first key press unlocks it.

export function makeAudio() {
  return { ctx: null, muted: false, hum: null };
}

function ensureCtx(audio) {
  if (!audio.ctx) {
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return null;
    audio.ctx = new Ctx();
    startHum(audio);
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
  return audio.ctx;
}

function startHum(audio) {
  const ctx = audio.ctx;
  const gain = ctx.createGain();
  gain.gain.value = 0.03;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 48;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.09;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.01;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  lfo.start();
  audio.hum = { gain, osc, lfo };
}

function tone(audio, freq, dur, type, vol, when = 0, slideTo = null) {
  const ctx = ensureCtx(audio);
  if (!ctx || audio.muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  unlock(audio) {
    ensureCtx(audio);
  },
  pickup(audio) {
    tone(audio, 1047, 0.1, 'sine', 0.15);
    tone(audio, 1568, 0.16, 'sine', 0.12, 0.06);
  },
  safeCrack(audio) {
    tone(audio, 660, 0.08, 'square', 0.08);
    tone(audio, 880, 0.08, 'square', 0.08, 0.09);
    tone(audio, 1175, 0.2, 'sine', 0.14, 0.18);
  },
  coin(audio) {
    tone(audio, 2093, 0.09, 'triangle', 0.13);
    tone(audio, 2637, 0.12, 'triangle', 0.09, 0.05);
  },
  coinLand(audio) {
    tone(audio, 2500, 0.05, 'square', 0.05);
    tone(audio, 1900, 0.08, 'square', 0.05, 0.07);
  },
  emp(audio) {
    tone(audio, 1400, 0.28, 'sawtooth', 0.1, 0, 180);
    tone(audio, 90, 0.2, 'sine', 0.16, 0.05, 45);
  },
  laserZap(audio) {
    tone(audio, 320, 0.14, 'sawtooth', 0.12, 0, 640);
  },
  cameraLock(audio) {
    tone(audio, 880, 0.12, 'square', 0.1);
    tone(audio, 880, 0.12, 'square', 0.1, 0.16);
    tone(audio, 1175, 0.2, 'square', 0.1, 0.32);
  },
  spotted(audio) {
    tone(audio, 233, 0.16, 'sawtooth', 0.13, 0, 349);
    tone(audio, 349, 0.22, 'sawtooth', 0.13, 0.14, 466);
  },
  caught(audio) {
    tone(audio, 415, 0.25, 'sawtooth', 0.13, 0, 208);
    tone(audio, 208, 0.4, 'sawtooth', 0.13, 0.2, 104);
  },
  levelClear(audio) {
    [659, 784, 988, 1319].forEach((f, i) => tone(audio, f, 0.22, 'triangle', 0.13, i * 0.09));
  },
  win(audio) {
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(audio, f, 0.3, 'triangle', 0.12, i * 0.1));
  },
  step(audio, sneaking) {
    tone(audio, sneaking ? 130 : 180, 0.05, 'sine', sneaking ? 0.02 : 0.03);
  },
  toggleMute(audio) {
    audio.muted = !audio.muted;
    if (audio.hum) audio.hum.gain.gain.value = audio.muted ? 0 : 0.03;
    return audio.muted;
  },
};
