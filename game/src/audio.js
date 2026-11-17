// Every sound, synthesised with the Web Audio API. Rows: T tone(freq, gain, decay, type, hold, when, slideTo, slideTime) · N noise(gain, duration, freq, sweepTo, q, filter, when) · A arpeggio(notes, step, tone args).

const PENTATONIC = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
const SOUNDS = {
  snap: [['A', [523.25, 659.25, 783.99, 1046.5], 0.035, 0.14, 0.5, 'triangle'], ['N', 0.08, 0.35, 600, 4000, 0.7]],
  burn: [['N', 0.07, 0.18, 3000, 800, 2], ['T', 740, 0.05, 0.12, 'sine', 0, 0, 300, 0.12]],
  hit: [['T', 160, 0.22, 0.35, 'sawtooth', 0, 0, 40, 0.3], ['N', 0.2, 0.3, 900, 200, 1, 'lowpass']],
  cut: [['N', 0.16, 0.12, 5000, 1500, 3], ['T', 1200, 0.05, 0.1, 'square', 0, 0, 300, 0.1]],
  release: [['T', 440, 0.05, 0.2, 'sine', 0, 0, 220]],
  pluck: [['T', 220, 0.2, 0.5, 'triangle', 0, 0, 196, 0.4], ['T', 660, 0.06, 0.12, 'sawtooth'], ['N', 0.1, 0.25, 900, 2600, 1.2]],
  lance: [['N', 0.12, 0.3, 700, 5000, 1.5], ['T', 1760, 0.1, 0.3, 'triangle', 0, 0.04, 2600]],
  star: [['A', [659.25, 987.77, 1318.51], 0.07, 0.12, 0.6, 'triangle'], ['N', 0.05, 0.5, 3000, 8000, 0.8]],
  deny: [['T', 180, 0.06, 0.12, 'square', 0.05], ['T', 150, 0.06, 0.15, 'square', 0.05, 0.1]],
  realm: [['A', [196, 293.66, 392, 587.33], 0.16, 0.09, 1.6, 'triangle', 0.5], ['N', 0.04, 2, 600, 4000, 0.6]],
  veil: [['T', 220, 0.14, 0.6, 'sawtooth', 0, 0, 110, 0.5], ['A', [880, 1108.73, 1318.51], 0.05, 0.1, 0.5, 'sine', 0, 0.08]],
  slow: [['T', 880, 0.1, 1.2, 'sine', 0.1, 0, 220, 1], ['N', 0.05, 0.8, 2000, 200, 1, 'lowpass']],
  select: [['T', 880, 0.1, 0.12], ['T', 1320, 0.08, 0.2, 'sine', 0, 0.06]],
  clear: [['A', [659.25, 783.99, 1046.5], 0.09, 0.12, 0.45, 'triangle']],
  victory: [['A', [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5], 0.11, 0.1, 1.6, 'triangle', 0.6], ['N', 0.05, 1.5, 1200, 6000, 0.5]],
  defeat: [['A', [392, 349.23, 311.13, 261.63], 0.3, 0.08, 0.6, 'sawtooth', 0.1], ['T', 65.4, 0.15, 1.5, 'sine', 0.3, 1.1]],
  fanfare: [['A', [392, 523.25, 659.25, 783.99], 0.13, 0.08, 0.35, 'square', 0.08]],
  bossFanfare: [['A', [261.63, 311.13, 392, 466.16, 523.25], 0.13, 0.08, 0.35, 'square', 0.08], ['N', 0.1, 1.2, 300, 60, 1, 'lowpass']],
};

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function unlock() {
    if (!context) {
      if (!window.AudioContext) return;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(context.destination);
      startDrone();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }

  function tone(freq, gain, decay, type = 'sine', hold = 0, when = 0, slideTo = null, slideTime = 0.2) {
    if (!context || muted) return;
    const t0 = context.currentTime + when;
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + slideTime);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.004);
    if (hold > 0) env.gain.setValueAtTime(gain, t0 + 0.004 + hold);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.004 + hold + decay);
    osc.connect(env).connect(master);
    osc.start(t0);
    osc.stop(t0 + hold + decay + 0.06);
  }

  function noise(gain, duration, freq, sweepTo = null, q = 1, filter = 'bandpass', when = 0) {
    if (!context || muted) return;
    const t0 = context.currentTime + when;
    const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
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
    source.connect(biquad).connect(env).connect(master);
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
  }

  function startDrone() {
    const out = context.createGain();
    out.gain.value = 0.05;
    const low = context.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 180;
    low.Q.value = 2;
    const lfo = context.createGain();
    lfo.gain.value = 90;
    lfo.connect(low.frequency);
    voice('sine', 0.07, lfo);
    voice('sawtooth', 55, low, -6);
    voice('sawtooth', 55, low, 7);
    voice('triangle', 82.4, low);
    low.connect(out).connect(master);
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
    play(name) {
      for (const [kind, ...a] of SOUNDS[name]) {
        if (kind === 'A') a[0].forEach((freq, i) => tone(freq, a[2], a[3], a[4], a[5], (a[6] || 0) + i * a[1]));
        else if (kind === 'N') noise(...a);
        else tone(...a);
      }
    },
    playAnchor(index) {
      const freq = PENTATONIC[Math.min(PENTATONIC.length - 1, index)];
      tone(freq, 0.18, 0.35, 'triangle');
      tone(freq * 2, 0.06, 0.18);
    },
    playCapture(count, multiplier) {
      const steps = Math.min(8, Math.max(1, count));
      const lift = Math.min(4, Math.floor(multiplier / 6));
      for (let i = 0; i < steps; i += 1) {
        const freq = PENTATONIC[Math.min(PENTATONIC.length - 1, i + lift)];
        tone(freq, 0.16, 0.3, 'sine', 0, 0.05 + i * 0.06);
        tone(freq * 2, 0.05, 0.15, 'sine', 0, 0.05 + i * 0.06);
      }
      if (count >= 4) tone(1568, 0.12, 0.8, 'sine', 0, 0.1 + steps * 0.06);
    },
    playLoomHit(fraction) {
      noise(0.14, 0.16, 1800, 300, 2.5);
      tone(196, 0.12, 0.4, 'sawtooth', 0, 0, 70, 0.35);
      tone(880, 0.08, 0.25, 'triangle', 0, 0, 440);
      if (fraction < 0.3) tone(110, 0.05, 0.4, 'square', 0.1, 0.1);
    },
  };
}
