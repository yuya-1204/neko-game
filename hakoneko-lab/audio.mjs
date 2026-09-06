/** Bundled narration: VOICEVOX:ずんだもん. Music and effects are original synthesis. */
export const VOICE_LINES = Object.freeze({
  greeting: {text: 'はこねこ大実験へ、ようこそなのだ！', file: 'voice/greeting.mp3'},
  place: {text: '道具を置いて、毛糸玉をとどけるのだ！', file: 'voice/place.mp3'},
  rotate: {text: '角度を変えると、どうなるかな？', file: 'voice/rotate.mp3'},
  rewind: {text: 'もどして、もう一度ためしてみるのだ！', file: 'voice/rewind.mp3'},
  ramp: {text: 'さかを置いて、ころころ転がすのだ！', file: 'voice/ramp.mp3'},
  spring: {text: 'ばねで、ぴょーんと飛ばすのだ！', file: 'voice/spring.mp3'},
  fan: {text: 'せんぷうきの風で、押してみるのだ！', file: 'voice/fan.mp3'},
  bumper: {text: 'クッションで、ぽよんとはね返すのだ！', file: 'voice/bumper.mp3'},
  garden: {text: 'お庭の実験、はじまりなのだ！', file: 'voice/garden.mp3'},
  moon: {text: '星あかりの実験、はじまりなのだ！', file: 'voice/moon.mp3'},
  success1: {text: '大成功！ねこも、うれしそうなのだ！', file: 'voice/success1.mp3'},
  success2: {text: 'そんな、とどけ方もあるのだ！', file: 'voice/success2.mp3'},
  success3: {text: 'やったあ！すてきな発明なのだ！', file: 'voice/success3.mp3'},
  retry1: {text: 'おしい！少しだけ、変えてみるのだ！', file: 'voice/retry1.mp3'},
  retry2: {text: 'だいじょうぶ。何度でも、ためせるのだ！', file: 'voice/retry2.mp3'},
  hint: {text: '毛糸玉の通り道を、よく見てみるのだ！', file: 'voice/hint.mp3'},
  sandbox: {text: '自由な実験！好きな仕掛けを作るのだ！', file: 'voice/sandbox.mp3'},
  save: {text: '仕掛けを保存したのだ！', file: 'voice/save.mp3'},
  allclear: {text: 'ぜんぶ大成功！きみは、発明名人なのだ！', file: 'voice/allclear.mp3'},
  launch: {text: 'じっけん、スタートなのだ！', file: 'voice/launch.mp3'},
  goal: {text: 'ねこのところへ、とどけるのだ！', file: 'voice/goal.mp3'},
  stars: {text: 'お星さまも、集めてみるのだ！', file: 'voice/stars.mp3'},
});

const SETTINGS_KEY = 'hakoneko-audio-v1';
const DEFAULTS = Object.freeze({voice: 0.85, music: 0.25, sfx: 0.65, muted: false});
const clamp = (number) => Math.min(1, Math.max(0, number));
const PENTATONIC = [60, 64, 67, 69, 72, 67, 64, 62, 60, 64, 69, 72, 74, 72, 67, 64];

/** Call unlock() from a tap/click, then say(id), sfx(name), or startMusic().
 * No network service is required; voice files are included beside this module.
 * Say always resolves (including interruption or unavailable audio), never rejects.
 */
export class AudioManager {
  constructor({onSubtitle = () => {}} = {}) {
    this.onSubtitle = typeof onSubtitle === 'function' ? onSubtitle : () => {};
    this.settings = {...DEFAULTS};
    this.context = null;
    this._voice = null;
    this._voiceToken = 0;
    this._voicePending = null;
    this._buffers = new Map();
    this._nodes = new Set();
    this._musicNodes = new Set();
    this._musicTimer = null;
    this._musicWanted = false;
    this._disposed = false;
    try {
      const stored = JSON.parse(globalThis.localStorage?.getItem(SETTINGS_KEY) || 'null');
      this._readSettings(stored);
    } catch { /* Private browsing and invalid saved preferences stay playable. */ }
    this._visibilityHandler = () => {
      if (globalThis.document?.hidden) {
        this._haltMusic();
        this.stopVoice();
      } else if (this._musicWanted) this.startMusic();
    };
    globalThis.document?.addEventListener('visibilitychange', this._visibilityHandler);
  }

  get unlocked() { return !!this.context && this.context.state === 'running'; }

  _readSettings(partial) {
    if (!partial || typeof partial !== 'object') return;
    for (const key of ['voice', 'music', 'sfx']) {
      if (typeof partial[key] === 'number' && Number.isFinite(partial[key])) {
        this.settings[key] = clamp(partial[key]);
      }
    }
    if (typeof partial.muted === 'boolean') this.settings.muted = partial.muted;
  }

  setSettings(partial) {
    this._readSettings(partial);
    this._updateGains();
    try { globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch {}
    return {...this.settings};
  }

  _updateGains() {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const key of ['voice', 'music', 'sfx']) {
      const gain = this[`${key}Gain`]?.gain;
      if (gain) {
        gain.cancelScheduledValues(now);
        const level = this.settings[key] * (key === 'music' && this._voice ? 0.35 : 1);
        gain.setTargetAtTime(level, now, 0.012);
      }
    }
    // The common output controls currently playing speech, effects, and music.
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.settings.muted ? 0 : 1, now);
  }

  async unlock() {
    if (this._disposed) return false;
    try {
      if (!this.context) {
        const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContextClass) return false;
        this.context = new AudioContextClass();
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
        for (const key of ['voice', 'music', 'sfx']) {
          this[`${key}Gain`] = this.context.createGain();
          this[`${key}Gain`].connect(this.masterGain);
        }
        this._updateGains();
      }
      if (this.context.state !== 'running' && this.context.state !== 'closed') await this.context.resume();
      if (this._disposed) return false;
      // Preloading is intentionally non-blocking; a child's first tap responds immediately.
      for (const id of Object.keys(VOICE_LINES)) void this._loadVoice(id);
      if (this._musicWanted) this.startMusic();
      return this.unlocked;
    } catch { return false; }
  }

  async _loadVoice(id) {
    if (!this.context || !VOICE_LINES[id] || this._disposed) return null;
    if (this._buffers.has(id)) return this._buffers.get(id);
    const context = this.context;
    const pending = (async () => {
      const controller = new AbortController();
      const timeout = globalThis.setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(new URL(VOICE_LINES[id].file, import.meta.url), {signal: controller.signal});
        if (!response.ok) return null;
        return await context.decodeAudioData(await response.arrayBuffer());
      } catch { return null; }
      finally { globalThis.clearTimeout(timeout); }
    })();
    this._buffers.set(id, pending);
    void pending.then((buffer) => {
      if (!buffer && this._buffers.get(id) === pending) this._buffers.delete(id);
    });
    return pending;
  }

  async say(id) {
    this.stopVoice();
    const line = VOICE_LINES[id];
    if (!line || this._disposed) return;
    try { this.onSubtitle(line.text); } catch {}
    if (!this.unlocked || this.settings.muted || this.settings.voice === 0) return;
    const token = this._voiceToken;
    try {
      const buffer = await this._loadVoice(id);
      if (!buffer || token !== this._voiceToken || this._disposed || !this.unlocked) return;
      if (this.settings.muted || this.settings.voice === 0) return;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.voiceGain);
      this._voice = source;
      // Speech gently lowers the background music; the preference itself stays unchanged.
      this.musicGain.gain.setTargetAtTime(this.settings.music * 0.35, this.context.currentTime, 0.04);
      await new Promise((resolve) => {
        const finish = () => {
          try { source.disconnect(); } catch {}
          if (this._voice === source) this._voice = null;
          if (this._voicePending === finish) this._voicePending = null;
          if (!this._disposed && this.context) {
            this.musicGain.gain.setTargetAtTime(this.settings.music, this.context.currentTime, 0.15);
          }
          resolve();
        };
        this._voicePending = finish;
        source.onended = finish;
        try { source.start(); } catch { finish(); }
      });
    } catch { /* Missing or blocked audio must never interrupt the game. */ }
  }

  stopVoice() {
    this._voiceToken += 1;
    if (this._voice) {
      try { this._voice.onended = null; this._voice.stop(); this._voice.disconnect(); } catch {}
      this._voice = null;
    }
    if (this._voicePending) {
      const finish = this._voicePending;
      this._voicePending = null;
      finish();
    }
  }

  _tone(frequency, delay = 0, duration = 0.2, volume = 0.15, type = 'sine', endFrequency, music = false) {
    if (!this.unlocked || this._disposed) return;
    try {
      const start = this.context.currentTime + Math.max(0, delay);
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(music ? this.musicGain : this.sfxGain);
      this._nodes.add(oscillator);
      if (music) this._musicNodes.add(oscillator);
      oscillator.onended = () => {
        this._nodes.delete(oscillator);
        this._musicNodes.delete(oscillator);
        try { oscillator.disconnect(); envelope.disconnect(); } catch {}
      };
      oscillator.start(start);
      oscillator.stop(start + duration + 0.015);
    } catch {}
  }

  sfx(name) {
    if (!this.unlocked || this.settings.muted || this.settings.sfx === 0) return;
    const tone = (...args) => this._tone(...args);
    switch (name) {
      case 'place': tone(410, 0, 0.09, 0.13, 'sine', 620); break;
      case 'rotate': tone(660, 0, 0.07, 0.07, 'sine', 780); break;
      case 'launch': tone(230, 0, 0.3, 0.11, 'triangle', 700); break;
      case 'bounce': tone(300, 0, 0.12, 0.1, 'sine', 120); break;
      case 'spring': tone(180, 0, 0.27, 0.15, 'triangle', 900); break;
      case 'star': tone(880, 0, 0.25, 0.12); tone(1320, 0.08, 0.32, 0.08); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.45, 0.12)); break;
      case 'retry': tone(440, 0, 0.16, 0.065); tone(349, 0.15, 0.24, 0.06); break;
      default: break;
    }
  }

  startMusic() {
    this._musicWanted = true;
    if (!this.unlocked || this._disposed || this._musicTimer || globalThis.document?.hidden) return;
    this._musicStep = 0;
    this._nextMusicTime = this.context.currentTime + 0.08;
    const beat = 60 / 86;
    const schedule = () => {
      if (!this.unlocked || this._disposed) return;
      // Catch up safely after tab suspension instead of stacking overdue notes.
      if (this._nextMusicTime < this.context.currentTime - 0.2) this._nextMusicTime = this.context.currentTime + 0.04;
      while (this._nextMusicTime < this.context.currentTime + 0.28) {
        const step = this._musicStep % 32;
        const delay = this._nextMusicTime - this.context.currentTime;
        if (step % 2 === 0) {
          const note = PENTATONIC[step / 2];
          const freq = 440 * 2 ** ((note - 69) / 12);
          this._tone(freq, delay, 0.65, 0.13, 'sine', undefined, true);
          this._tone(freq * 2, delay, 0.19, 0.022, 'sine', undefined, true);
        }
        if (step % 8 === 0) {
          const bass = [130.81, 164.81, 174.61, 146.83][step / 8];
          this._tone(bass, delay, 1.2, 0.07, 'sine', undefined, true);
        }
        this._musicStep += 1;
        this._nextMusicTime += beat / 2;
      }
    };
    schedule();
    this._musicTimer = globalThis.setInterval(schedule, 100);
  }

  _haltMusic() {
    if (this._musicTimer) globalThis.clearInterval(this._musicTimer);
    this._musicTimer = null;
    for (const node of this._musicNodes) {
      try { node.stop(); } catch {}
    }
    this._musicNodes.clear();
  }

  stopMusic() { this._musicWanted = false; this._haltMusic(); }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.stopVoice();
    this.stopMusic();
    globalThis.document?.removeEventListener('visibilitychange', this._visibilityHandler);
    for (const node of this._nodes) { try { node.stop(); } catch {} }
    this._nodes.clear();
    this._buffers.clear();
    try { this.context?.close()?.catch(() => {}); } catch {}
  }
}
