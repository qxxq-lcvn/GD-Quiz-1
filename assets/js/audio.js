/*
 * Unity Quiz — sound design (Web Audio API, no audio files).
 *
 * Two voices:
 *   - mallet: sine body + a bright, fast-decaying overtone
 *   - gong: low inharmonic partials with a slow decay
 * Melodies use a pentatonic scale.
 */
window.QUIZ = window.QUIZ || {};

window.QUIZ.Sound = (() => {
  const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C D E G A C

  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;

  function ensureContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function ready() {
    return !muted && ensureContext() !== null;
  }

  function envelope(gainNode, t, peak, attack, decay) {
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.exponentialRampToValueAtTime(peak, t + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function mallet(freq, when, { dur = 0.6, gain = 0.3, bright = 0.25 } = {}) {
    const t = ctx.currentTime + when;

    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = "sine";
    body.frequency.value = freq;
    envelope(bodyGain, t, gain, 0.008, dur);
    body.connect(bodyGain).connect(master);

    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = "sine";
    ping.frequency.value = freq * 3.98;
    envelope(pingGain, t, gain * bright, 0.004, 0.12);
    ping.connect(pingGain).connect(master);

    body.start(t);
    ping.start(t);
    body.stop(t + dur + 0.05);
    ping.stop(t + 0.2);
  }

  function getNoise() {
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function click(when, { freq = 2200, gain = 0.3, dur = 0.035, q = 3 } = {}) {
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    envelope(g, t, gain, 0.002, dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /** Soft mallet note when an answer is picked. */
  function tick(index = 0) {
    if (!ready()) return;
    mallet(PENTATONIC[index % 4], 0, { dur: 0.35, gain: 0.16 });
  }

  /** Short wood-block tick for each of the last seconds on the timer. */
  function countdown() {
    if (!ready()) return;
    click(0, { freq: 2600, gain: 0.2, dur: 0.03, q: 4 });
    mallet(1046.5, 0, { dur: 0.12, gain: 0.05 });
  }

  /** Rising pentatonic run for a correct answer. */
  function success() {
    if (!ready()) return;
    PENTATONIC.forEach((f, i) => mallet(f, i * 0.085, { dur: 0.5, gain: 0.2 }));
    const end = PENTATONIC.length * 0.085 + 0.05;
    [523.25, 659.25, 783.99].forEach((f) => mallet(f, end, { dur: 1.2, gain: 0.12, bright: 0.15 }));
  }

  /** Low gong for an incorrect answer. */
  function fail() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const partials = [
      [98, 0.32, 2.2],
      [147.5, 0.12, 1.6],
      [209.7, 0.07, 1.2],
      [311, 0.04, 0.8]
    ];
    partials.forEach(([freq, gain, dur]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.97, t + dur);
      envelope(g, t, gain, 0.015, dur);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.1);
    });
    click(0, { freq: 300, gain: 0.25, dur: 0.12, q: 0.8 });
  }

  return {
    /** Call from a user gesture so browsers allow audio. */
    unlock() {
      if (!muted) ensureContext();
    },
    setMuted(value) {
      muted = Boolean(value);
    },
    isMuted() {
      return muted;
    },
    tick,
    countdown,
    success,
    fail
  };
})();
