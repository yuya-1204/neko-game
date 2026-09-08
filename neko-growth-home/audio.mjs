/* Original, locally synthesized music and effects. Audio starts only after unlock(). */
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
const BAR_MELODY = [
  [72, null, 76, 79, 76, null, 74, null],
  [72, null, null, 67, 69, null, 72, null],
  [74, null, 77, 81, 79, null, 77, null],
  [76, null, 74, null, 72, null, null, null],
  [76, null, 79, null, 84, null, 83, 79],
  [81, null, 79, 76, 74, null, 72, null],
  [74, null, 77, null, 76, 74, 71, null],
  [72, null, null, null, 67, null, null, null],
  [72, null, 76, 79, 84, null, 79, null],
  [81, null, 76, null, 72, null, 69, null],
  [74, null, 77, 81, 84, null, 81, null],
  [79, null, 76, null, 74, null, null, null],
  [76, null, 79, 76, 72, null, 76, null],
  [77, null, 76, null, 74, null, 72, null],
  [71, null, 74, null, 79, null, 74, null],
  [72, null, 67, null, 72, null, null, null],
];
const HARMONY = [
  [48, 60, 64, 67], [45, 60, 64, 69], [50, 62, 65, 69], [43, 59, 62, 67],
  [48, 60, 64, 67], [45, 60, 64, 69], [43, 59, 62, 65], [48, 60, 64, 67],
  [48, 60, 64, 67], [45, 60, 64, 69], [41, 60, 65, 69], [43, 59, 62, 67],
  [48, 60, 64, 67], [41, 60, 65, 69], [43, 59, 62, 67], [48, 60, 64, 67],
];

export class GameAudio {
  constructor() {
    this.enabled = true;
    this.context = null;
    this._unlocked = false;
    this._suspended = false;
    this._musicRequested = true;
    this._timer = null;
    this._tick = 0;
    this._nextTime = 0;
    this._voices = new Set();
    this._lastEffect = new Map();
    this._musicEpoch = 0;
  }

  _createContext() {
    if (this.context) return true;
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      this.context = new AudioContextClass();
      this._master = this.context.createGain();
      this._master.gain.value = 0.3;
      this._musicBus = this.context.createGain();
      this._musicBus.gain.value = 0.36;
      this._effectBus = this.context.createGain();
      this._effectBus.gain.value = 0.74;
      // A gentle ceiling keeps simultaneous celebrations comfortable.
      this._compressor = this.context.createDynamicsCompressor();
      this._compressor.threshold.value = -15;
      this._compressor.knee.value = 24;
      this._compressor.ratio.value = 3;
      this._compressor.attack.value = 0.008;
      this._compressor.release.value = 0.22;
      this._musicBus.connect(this._master);
      this._effectBus.connect(this._master);
      this._master.connect(this._compressor);
      this._compressor.connect(this.context.destination);
      return true;
    } catch {
      this.context = null;
      return false;
    }
  }

  /** Call from a click, pointer or key event. Safe when sound is disabled. */
  async unlock() {
    if (!this.enabled || this._suspended) return false;
    if (!this._createContext()) return false;
    try {
      await this.context.resume();
      if (!this.enabled || this._suspended) {
        await this.context.suspend();
        return false;
      }
      this._unlocked = this.context.state === 'running';
      if (this._unlocked && this._musicRequested) this._startScheduler();
      return this._unlocked;
    } catch {
      return false;
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this._stopScheduler();
      this._stopVoices();
      if (this.context?.state === 'running') this.context.suspend().catch(() => {});
      return;
    }
    // No context is created here: initialization alone cannot start playback.
    if (this._unlocked && !this._suspended && this.context) {
      this.context.resume().then(() => {
        if (this.enabled && !this._suspended && this._musicRequested) this._startScheduler();
      }).catch(() => {});
    }
  }

  startMusic() {
    this._musicRequested = true;
    if (this._canPlay()) this._startScheduler();
  }

  stopMusic() {
    this._musicRequested = false;
    this._stopScheduler();
    this._stopVoices('music');
  }

  suspend() {
    this._suspended = true;
    this._stopScheduler();
    this._stopVoices();
    if (this.context?.state === 'running') this.context.suspend().catch(() => {});
  }

  resume() {
    this._suspended = false;
    if (!this.enabled || !this._unlocked || !this.context) return;
    this.context.resume().then(() => {
      if (this.enabled && !this._suspended && this._musicRequested) this._startScheduler();
    }).catch(() => {});
  }

  _canPlay() {
    return this.enabled && this._unlocked && !this._suspended && this.context?.state === 'running';
  }

  _startScheduler() {
    if (this._timer !== null || !this._canPlay() || !this._musicRequested) return;
    const epoch = ++this._musicEpoch;
    this._nextTime = this.context.currentTime + 0.07;
    const schedule = () => {
      if (epoch !== this._musicEpoch || !this._canPlay() || !this._musicRequested) return;
      // Eighth notes at 90 bpm; 16 bars make one 42.67-second phrase.
      const stepDuration = 1 / 3;
      const now = this.context.currentTime;
      if (this._nextTime < now - 0.5) this._nextTime = now + 0.05;
      while (this._nextTime < now + 0.6) {
        const bar = Math.floor(this._tick / 8) % BAR_MELODY.length;
        const step = this._tick % 8;
        const note = BAR_MELODY[bar][step];
        const chord = HARMONY[bar];
        if (note !== null) {
          this._tone(frequency(note), this._nextTime, 0.76, 0.24, 'music', 'bell');
        }
        if (step === 0 || step === 4) {
          this._tone(frequency(chord[0] + (step === 4 ? 7 : 0)), this._nextTime, 1.1, 0.20, 'music', 'soft');
        }
        if (step === 0 || step === 3 || step === 6) {
          const voice = chord[step === 0 ? 1 : step === 3 ? 2 : 3];
          this._tone(frequency(voice), this._nextTime + 0.012, 0.94, 0.12, 'music', 'soft');
        }
        this._tick = (this._tick + 1) % 128;
        this._nextTime += stepDuration;
      }
    };
    schedule();
    this._timer = globalThis.setInterval(schedule, 180);
  }

  _stopScheduler() {
    ++this._musicEpoch;
    if (this._timer !== null) globalThis.clearInterval(this._timer);
    this._timer = null;
  }

  /** Sine-based soft wood / bell timbre; every node releases and disconnects. */
  _tone(freq, time, duration, volume, group = 'effect', timbre = 'bell', glide = null) {
    if (!this.context || !this.enabled || this._suspended) return;
    const ctx = this.context;
    const start = Math.max(ctx.currentTime, time);
    const gain = ctx.createGain();
    const fundamental = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    fundamental.type = 'sine';
    harmonic.type = 'sine';
    fundamental.frequency.setValueAtTime(freq, start);
    harmonic.frequency.setValueAtTime(freq * 2, start);
    if (glide) {
      fundamental.frequency.exponentialRampToValueAtTime(glide, start + Math.min(duration * 0.55, 0.22));
      harmonic.frequency.exponentialRampToValueAtTime(glide * 2, start + Math.min(duration * 0.55, 0.22));
    }
    harmonicGain.gain.value = timbre === 'soft' ? 0.045 : 0.11;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), start + (timbre === 'soft' ? 0.04 : 0.012));
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * 0.16), start + duration * 0.47);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    fundamental.connect(gain);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(gain);
    gain.connect(group === 'music' ? this._musicBus : this._effectBus);
    const voice = { nodes: [fundamental, harmonic, harmonicGain, gain], oscillators: [fundamental, harmonic], gain, group };
    this._voices.add(voice);
    fundamental.onended = () => {
      for (const node of voice.nodes) { try { node.disconnect(); } catch {} }
      this._voices.delete(voice);
    };
    fundamental.start(start);
    harmonic.start(start);
    fundamental.stop(start + duration + 0.025);
    harmonic.stop(start + duration + 0.025);
  }

  _stopVoices(group = null) {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const voice of this._voices) {
      if (group && voice.group !== group) continue;
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(0.0001, now, 0.014);
        for (const oscillator of voice.oscillators) oscillator.stop(now + 0.045);
      } catch {}
    }
  }

  play(name, level = 1) {
    if (!this._canPlay()) return;
    const now = this.context.currentTime;
    const last = this._lastEffect.get(name) ?? -Infinity;
    if (now - last < (name === 'move' ? 0.075 : name === 'pet' ? 0.12 : 0.045)) return;
    this._lastEffect.set(name, now);
    const rank = Math.max(1, Math.min(10, Number(level) || 1));
    const playNotes = (notes, interval = 0.1, volume = 0.32, length = 0.46) => {
      notes.forEach((note, i) => this._tone(frequency(note), now + i * interval, length, volume * (1 - i * 0.045)));
    };
    switch (name) {
      case 'move':
        this._tone(196, now, 0.095, 0.20, 'effect', 'soft', 235);
        break;
      case 'merge': {
        const root = 60 + [0, 2, 4, 5, 7, 9, 12, 14, 16, 19][rank - 1];
        playNotes([root, root + 7, root + 12], 0.075, 0.33, 0.43);
        break;
      }
      case 'fever':
        playNotes([60, 64, 67, 72, 76, 79, 84], 0.10, 0.31, 0.75);
        this._tone(frequency(48), now + 0.60, 1.05, 0.25, 'effect', 'soft');
        break;
      case 'adopt':
        playNotes([67, 72, 76, 74, 79], 0.13, 0.30, 0.68);
        this._tone(frequency(60), now + 0.52, 0.95, 0.22, 'effect', 'soft');
        break;
      case 'pet':
        // A tiny two-note mew, produced by gentle pitch curves rather than a recording.
        this._tone(310 + rank * 8, now, 0.23, 0.20, 'effect', 'soft', 465 + rank * 6);
        this._tone(430 + rank * 6, now + 0.17, 0.32, 0.17, 'effect', 'soft', 330 + rank * 6);
        break;
      case 'button':
        this._tone(frequency(76), now, 0.15, 0.18, 'effect', 'soft');
        break;
      default:
        break;
    }
  }
}
