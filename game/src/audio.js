// Every sound NIGHTLOOM makes, synthesised with the Web Audio API and no audio files: a soft night
// drone, a rising pentatonic pluck for each star a thread touches, a chord when a loop snaps shut,
// an arpeggio for captures, a thud for hits, a snip for cut threads and a fanfare for each wave.

const PENTATONIC = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

/** The audio system; nothing is created until `unlock()` runs inside a user gesture. */
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let droneNodes = null;

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

  /** One oscillator note through its own envelope. */
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

  /** A burst of filtered noise. */
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

  /** The ambient night: two detuned low saws under a slowly breathing low-pass, and a faint fifth above. */
  function startDrone() {
    if (!context || droneNodes) return;
    const out = context.createGain();
    out.gain.value = 0.05;
    const low = context.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 180;
    low.Q.value = 2;
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain);
    lfoGain.connect(low.frequency);
    const voices = [
      { type: 'sawtooth', freq: 55, detune: -6 },
      { type: 'sawtooth', freq: 55, detune: 7 },
      { type: 'triangle', freq: 82.4, detune: 0 },
    ].map((voice) => {
      const osc = context.createOscillator();
      osc.type = voice.type;
      osc.frequency.value = voice.freq;
      osc.detune.value = voice.detune;
      osc.connect(low);
      osc.start();
      return osc;
    });
    low.connect(out);
    const shimmer = context.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 329.6;
    const shimmerGain = context.createGain();
    shimmerGain.gain.value = 0.012;
    const tremolo = context.createOscillator();
    tremolo.frequency.value = 0.21;
    const tremoloGain = context.createGain();
    tremoloGain.gain.value = 0.01;
    tremolo.connect(tremoloGain);
    tremoloGain.connect(shimmerGain.gain);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(out);
    shimmer.start();
    tremolo.start();
    lfo.start();
    out.connect(master);
    droneNodes = { voices, shimmer, tremolo, lfo, out };
  }

  return {
    unlock,
    get muted() {
      return muted;
    },
    /** Flip mute; returns the new state. */
    toggleMute() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.6, context.currentTime, 0.02);
      return muted;
    },
    /** A thread touches its `index`th star: a pluck that climbs the pentatonic scale. */
    playAnchor(index) {
      const freq = PENTATONIC[Math.min(PENTATONIC.length - 1, index)];
      tone({ freq, type: 'triangle', decay: 0.35, gain: 0.18 });
      tone({ freq: freq * 2, type: 'sine', decay: 0.18, gain: 0.06 });
    },
    /** A loop snaps shut: a bright strummed chord and a whoosh. */
    playSnap() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone({ freq, type: 'triangle', when: i * 0.035, decay: 0.5, gain: 0.14 }));
      noise({ duration: 0.35, gain: 0.08, freq: 600, sweepTo: 4000, q: 0.7 });
    },
    /** `count` moths captured: an arpeggio one note per moth, higher with the tier. */
    playCapture(count, tier) {
      const steps = Math.min(8, Math.max(1, count));
      for (let i = 0; i < steps; i += 1) {
        const freq = PENTATONIC[Math.min(PENTATONIC.length - 1, i + tier)];
        tone({ freq: freq * 1.0, type: 'sine', when: 0.05 + i * 0.06, decay: 0.3, gain: 0.16 });
        tone({ freq: freq * 2, type: 'sine', when: 0.05 + i * 0.06, decay: 0.15, gain: 0.05 });
      }
      if (count >= 4) tone({ freq: 1568, type: 'sine', when: 0.1 + steps * 0.06, decay: 0.8, gain: 0.12 });
    },
    /** A moth burned by an ember thread. */
    playBurn() {
      noise({ duration: 0.18, gain: 0.07, freq: 3000, sweepTo: 800, q: 2 });
      tone({ freq: 740, type: 'sine', decay: 0.12, gain: 0.05, slideTo: 300, slideTime: 0.12 });
    },
    /** The Weaver is touched by a moth. */
    playHit() {
      tone({ freq: 160, type: 'sawtooth', decay: 0.35, gain: 0.22, slideTo: 40, slideTime: 0.3 });
      noise({ duration: 0.3, gain: 0.2, filter: 'lowpass', freq: 900, sweepTo: 200 });
    },
    /** A thread is severed by a cutter. */
    playCut() {
      noise({ duration: 0.12, gain: 0.16, freq: 5000, sweepTo: 1500, q: 3 });
      tone({ freq: 1200, type: 'square', decay: 0.1, gain: 0.05, slideTo: 300, slideTime: 0.1 });
    },
    /** A dropped thread fades away. */
    playRelease() {
      tone({ freq: 440, type: 'sine', decay: 0.2, gain: 0.05, slideTo: 220, slideTime: 0.2 });
    },
    /** A new wave begins. */
    playFanfare(boss) {
      const notes = boss ? [261.63, 311.13, 392, 466.16, 523.25] : [392, 523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        tone({ freq, type: 'square', when: i * 0.13, hold: 0.08, decay: 0.3, gain: 0.07 });
        tone({ freq: freq / 2, type: 'triangle', when: i * 0.13, hold: 0.08, decay: 0.3, gain: 0.08 });
      });
      if (boss) noise({ duration: 1.2, gain: 0.1, filter: 'lowpass', freq: 300, sweepTo: 60 });
    },
    /** A veil is stripped from the Eclipse Moth. */
    playVeil() {
      tone({ freq: 220, type: 'sawtooth', decay: 0.6, gain: 0.14, slideTo: 110, slideTime: 0.5 });
      [880, 1108.73, 1318.51].forEach((freq, i) => tone({ freq, type: 'sine', when: 0.08 + i * 0.05, decay: 0.5, gain: 0.1 }));
    },
    /** Slow time begins. */
    playSlow() {
      tone({ freq: 880, type: 'sine', hold: 0.1, decay: 1.2, gain: 0.1, slideTo: 220, slideTime: 1.0 });
      noise({ duration: 0.8, gain: 0.05, filter: 'lowpass', freq: 2000, sweepTo: 200 });
    },
    /** A menu choice. */
    playSelect() {
      tone({ freq: 880, type: 'sine', decay: 0.12, gain: 0.1 });
      tone({ freq: 1320, type: 'sine', when: 0.06, decay: 0.2, gain: 0.08 });
    },
    /** Wave cleared. */
    playClear() {
      [659.25, 783.99, 1046.5].forEach((freq, i) => tone({ freq, type: 'triangle', when: i * 0.09, decay: 0.45, gain: 0.12 }));
    },
    /** The night is woven: a long golden chord. */
    playVictory() {
      [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        tone({ freq, type: 'triangle', when: i * 0.11, hold: 0.6, decay: 1.6, gain: 0.1 });
      });
      noise({ duration: 1.5, gain: 0.05, freq: 1200, sweepTo: 6000, q: 0.5 });
    },
    /** The loom goes dark: a falling minor line. */
    playDefeat() {
      [392, 349.23, 311.13, 261.63].forEach((freq, i) => tone({ freq, type: 'sawtooth', when: i * 0.3, hold: 0.1, decay: 0.6, gain: 0.08 }));
      tone({ freq: 65.4, type: 'sine', when: 1.1, hold: 0.3, decay: 1.5, gain: 0.15 });
    },
  };
}
