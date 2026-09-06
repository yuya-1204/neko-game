/** Bundled narration: VOICEVOX:ずんだもん. Music and effects are original synthesis. */
export const VOICE_LINES = Object.freeze({
  "welcome": {
    "text": "棚のおかたづけへ、ようこそなのだ！",
    "file": "voice/welcome.mp3"
  },
  "guide1": {
    "text": "同じ品物を、同じ棚に三つ並べると、消えるのだ！",
    "file": "voice/guide1.mp3"
  },
  "guide2": {
    "text": "品物を押して、空いている場所を押すのだ。指で運んでもいいのだ！",
    "file": "voice/guide2.mp3"
  },
  "guide3": {
    "text": "手前の品物が全部なくなると、奥の品物が出てくるのだ！",
    "file": "voice/guide3.mp3"
  },
  "guide4": {
    "text": "空き場所がなくなるか、時間切れでおしまいなのだ！",
    "file": "voice/guide4.mp3"
  },
  "start": {
    "text": "おかたづけ、スタートなのだ！",
    "file": "voice/start.mp3"
  },
  "match1": {
    "text": "三つそろったのだ！",
    "file": "voice/match1.mp3"
  },
  "match2": {
    "text": "すっきり、いい感じなのだ！",
    "file": "voice/match2.mp3"
  },
  "combo": {
    "text": "つづけて、そろったのだ！",
    "file": "voice/combo.mp3"
  },
  "reveal": {
    "text": "奥から、品物が出てきたのだ！",
    "file": "voice/reveal.mp3"
  },
  "last": {
    "text": "あと少しで、ぴかぴかなのだ！",
    "file": "voice/last.mp3"
  },
  "fewSpaces": {
    "text": "空き場所が少ないのだ。三つそろえられるかな？",
    "file": "voice/fewSpaces.mp3"
  },
  "timeWarning": {
    "text": "あと三十秒。あわてずに、見つけるのだ！",
    "file": "voice/timeWarning.mp3"
  },
  "win": {
    "text": "大成功！お店がぴかぴかになったのだ！",
    "file": "voice/win.mp3"
  },
  "loseTime": {
    "text": "今日は、ここまで。また一緒に、おかたづけするのだ！",
    "file": "voice/loseTime.mp3"
  },
  "loseSpace": {
    "text": "棚がいっぱいなのだ。もう一度、ためしてみよう！",
    "file": "voice/loseSpace.mp3"
  },
  "hint": {
    "text": "同じ品物を、探してみるのだ！",
    "file": "voice/hint.mp3"
  },
  "undo": {
    "text": "一つ前に、もどしたのだ！",
    "file": "voice/undo.mp3"
  },
  "newKinds": {
    "text": "新しい品物が、仲間入りなのだ！",
    "file": "voice/newKinds.mp3"
  },
  "colors": {
    "text": "色違いは、別の品物なのだ。色もよく見てね！",
    "file": "voice/colors.mp3"
  },
  "free": {
    "text": "時間を気にせず、ゆっくり練習するのだ！",
    "file": "voice/free.mp3"
  },
  "allclear": {
    "text": "ぜんぶ大成功！きみは、おかたづけ名人なのだ！",
    "file": "voice/allclear.mp3"
  },
  "pause": {
    "text": "ひとやすみ、するのだ！",
    "file": "voice/pause.mp3"
  },
  "resume": {
    "text": "つづきから、始めるのだ！",
    "file": "voice/resume.mp3"
  }
});

const SETTINGS_KEY = 'neko-shelf-audio-v1';
const DEFAULTS = Object.freeze({voice: 0.85, music: 0.25, sfx: 0.65, muted: false});
const clamp = (number) => Math.min(1, Math.max(0, number));
// Eight original three-beat phrases: soft toy-piano melody over a shop waltz.
const WALTZ_MELODY = [72, 76, 79, 77, 76, 72, 74, 77, 81, 79, 77, 74,
  76, 79, 84, 83, 81, 79, 77, 74, 71, 72, 67, 72];
const WALTZ_CHORDS = [[48, 64, 67], [48, 64, 67], [50, 65, 69], [50, 65, 69],
  [45, 64, 69], [45, 64, 69], [43, 62, 67], [48, 64, 67]];

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
      case 'select': tone(520, 0, 0.075, 0.065, 'sine', 590); break;
      case 'place': tone(410, 0, 0.09, 0.13, 'sine', 620); break;
      case 'match': [659, 880, 1047].forEach((f, i) => tone(f, i * 0.06, 0.28, 0.1)); break;
      case 'combo': [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.065, 0.34, 0.08)); break;
      case 'reveal': tone(380, 0, 0.14, 0.07, 'sine', 580); tone(760, 0.1, 0.18, 0.05); break;
      case 'warning': tone(523, 0, 0.12, 0.045); tone(523, 0.25, 0.14, 0.04); break;
      case 'undo': tone(600, 0, 0.12, 0.07, 'sine', 410); break;
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
    const beat = 60 / 112;
    const schedule = () => {
      if (!this.unlocked || this._disposed) return;
      // Catch up safely after tab suspension instead of stacking overdue notes.
      if (this._nextMusicTime < this.context.currentTime - 0.2) this._nextMusicTime = this.context.currentTime + 0.04;
      while (this._nextMusicTime < this.context.currentTime + 0.28) {
        const step = this._musicStep % 24;
        const delay = this._nextMusicTime - this.context.currentTime;
        const freq = 440 * 2 ** ((WALTZ_MELODY[step] - 69) / 12);
        this._tone(freq, delay, 0.48, step % 3 === 0 ? 0.11 : 0.075, 'sine', undefined, true);
        this._tone(freq * 2, delay, 0.16, 0.012, 'sine', undefined, true);
        const chord = WALTZ_CHORDS[Math.floor(step / 3)];
        const notes = step % 3 === 0 ? [chord[0]] : chord.slice(1);
        for (const note of notes) {
          this._tone(440 * 2 ** ((note - 69) / 12), delay, step % 3 === 0 ? 0.62 : 0.3,
            step % 3 === 0 ? 0.065 : 0.025, 'sine', undefined, true);
        }
        this._musicStep += 1;
        this._nextMusicTime += beat;
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
