// Every sound, synthesised with the Web Audio API: drone, plucks, snap chord, capture arpeggios, hits, cuts and fanfares.

const PENTATONIC = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

/** The audio system; nothing is created until `unlock()` runs inside a user gesture. */
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function unlock() {
    if (!context) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      context = new Ctx();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(context.destination);
      startDrone();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }

  function ready() {
    return context !== null && !muted;
  }

  function tone({ freq, type = 'sine', attack = 0.004, hold = 0, decay = 0.25, gain = 0.2, when = 0, slideTo = null, slideTime = 0.2 }) {
    if (!ready()) return;
    const t0 = context.currentTime + when;
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + slideTime);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    if (hold > 0) env.gain.setValueAtTime(gain, t0 + attack + hold);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + decay);
    osc.connect(env);
    env.connect(master);
    osc.start(t0);
    osc.stop(t0 + attack + hold + decay + 0.05);
  }

  function noise({ duration = 0.2, gain = 0.15, filter = 'bandpass', freq = 2000, q = 1, when = 0, sweepTo = null }) {
    if (!ready()) return;
    const t0 = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const biquad = context.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.setValueAtTime(freq, t0);
    if (sweepTo !== null) biquad.frequency.exponentialRampToValueAtTime(sweepTo, t0 + duration);
    biquad.Q.value = q;
    const env = context.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    source.connect(biquad);
    biquad.connect(env);
    env.connect(master);
    source.start(t0);
    source.stop(t0 + duration + 0.02);
  }

  function voice(type, freq, destination, detune = 0) {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(destination);
    osc.start();
    return osc;
  }

  function startDrone() {
    const out = context.createGain();
    out.gain.value = 0.05;
    const low = context.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 180;
    low.Q.value = 2;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 90;
    lfoGain.connect(low.frequency);
    voice('sine', 0.07, lfoGain);
    voice('sawtooth', 55, low, -6);
    voice('sawtooth', 55, low, 7);
    voice('triangle', 82.4, low);
    low.connect(out);
    const shimmerGain = context.createGain();
    shimmerGain.gain.value = 0.012;
    const tremoloGain = context.createGain();
    tremoloGain.gain.value = 0.01;
    tremoloGain.connect(shimmerGain.gain);
    voice('sine', 0.21, tremoloGain);
    voice('sine', 329.6, shimmerGain);
    shimmerGain.connect(out);
    out.connect(master);
  }

  return {
    unlock,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.6, context.currentTime, 0.02);
      return muted;
    },
    playAnchor(index) {
      const freq = PENTATONIC[Math.min(PENTATONIC.length - 1, index)];
      tone({ freq, type: 'triangle', decay: 0.35, gain: 0.18 });
      tone({ freq: freq * 2, decay: 0.18, gain: 0.06 });
    },
    playSnap() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone({ freq, type: 'triangle', when: i * 0.035, decay: 0.5, gain: 0.14 }));
      noise({ duration: 0.35, gain: 0.08, freq: 600, sweepTo: 4000, q: 0.7 });
    },
    playCapture(count, multiplier) {
      const steps = Math.min(8, Math.max(1, count));
      const lift = Math.min(4, Math.floor(multiplier / 6));
      for (let i = 0; i < steps; i += 1) {
        const freq = PENTATONIC[Math.min(PENTATONIC.length - 1, i + lift)];
        tone({ freq, when: 0.05 + i * 0.06, decay: 0.3, gain: 0.16 });
        tone({ freq: freq * 2, when: 0.05 + i * 0.06, decay: 0.15, gain: 0.05 });
      }
      if (count >= 4) tone({ freq: 1568, when: 0.1 + steps * 0.06, decay: 0.8, gain: 0.12 });
    },
    playBurn() {
      noise({ duration: 0.18, gain: 0.07, freq: 3000, sweepTo: 800, q: 2 });
      tone({ freq: 740, decay: 0.12, gain: 0.05, slideTo: 300, slideTime: 0.12 });
    },
    playHit() {
      tone({ freq: 160, type: 'sawtooth', decay: 0.35, gain: 0.22, slideTo: 40, slideTime: 0.3 });
      noise({ duration: 0.3, gain: 0.2, filter: 'lowpass', freq: 900, sweepTo: 200 });
    },
    playCut() {
      noise({ duration: 0.12, gain: 0.16, freq: 5000, sweepTo: 1500, q: 3 });
      tone({ freq: 1200, type: 'square', decay: 0.1, gain: 0.05, slideTo: 300, slideTime: 0.1 });
    },
    playRelease() {
      tone({ freq: 440, decay: 0.2, gain: 0.05, slideTo: 220, slideTime: 0.2 });
    },
    playFanfare(boss) {
      const notes = boss ? [261.63, 311.13, 392, 466.16, 523.25] : [392, 523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        tone({ freq, type: 'square', when: i * 0.13, hold: 0.08, decay: 0.3, gain: 0.07 });
        tone({ freq: freq / 2, type: 'triangle', when: i * 0.13, hold: 0.08, decay: 0.3, gain: 0.08 });
      });
      if (boss) noise({ duration: 1.2, gain: 0.1, filter: 'lowpass', freq: 300, sweepTo: 60 });
    },
    playVeil() {
      tone({ freq: 220, type: 'sawtooth', decay: 0.6, gain: 0.14, slideTo: 110, slideTime: 0.5 });
      [880, 1108.73, 1318.51].forEach((freq, i) => tone({ freq, when: 0.08 + i * 0.05, decay: 0.5, gain: 0.1 }));
    },
    playSlow() {
      tone({ freq: 880, hold: 0.1, decay: 1.2, gain: 0.1, slideTo: 220, slideTime: 1.0 });
      noise({ duration: 0.8, gain: 0.05, filter: 'lowpass', freq: 2000, sweepTo: 200 });
    },
    playSelect() {
      tone({ freq: 880, decay: 0.12, gain: 0.1 });
      tone({ freq: 1320, when: 0.06, decay: 0.2, gain: 0.08 });
    },
    playClear() {
      [659.25, 783.99, 1046.5].forEach((freq, i) => tone({ freq, type: 'triangle', when: i * 0.09, decay: 0.45, gain: 0.12 }));
    },
    playVictory() {
      [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone({ freq, type: 'triangle', when: i * 0.11, hold: 0.6, decay: 1.6, gain: 0.1 }));
      noise({ duration: 1.5, gain: 0.05, freq: 1200, sweepTo: 6000, q: 0.5 });
    },
    playDefeat() {
      [392, 349.23, 311.13, 261.63].forEach((freq, i) => tone({ freq, type: 'sawtooth', when: i * 0.3, hold: 0.1, decay: 0.6, gain: 0.08 }));
      tone({ freq: 65.4, when: 1.1, hold: 0.3, decay: 1.5, gain: 0.15 });
    },
  };
}
