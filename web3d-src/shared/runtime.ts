import { AbstractEngine, Engine, WebGPUEngine } from "babylonjs";
import type {
  GameDefinition,
  GameFactory,
  GameSave,
  GameSettings,
  InputState,
  LearningQuestion,
  NekoGameDebugApi,
  RuntimeUi,
  SavedStageResult,
  SceneController,
  StageResult
} from "./types";
import "./styles.css";

const DEFAULT_SETTINGS: GameSettings = {
  sound: true,
  narration: true,
  reducedMotion: false,
  leftHanded: false,
  tilt: false,
  quality: "auto"
};

const PROFILE_COUNT = 3;
const SAVE_GENERATIONS = 3;
const STORAGE_PREFIX = "neko-web3d-v1";
const PROFILE_EMOJI = ["🐱", "🐾", "⭐"] as const;
const PROFILE_COLORS = ["#62d4d6", "#ff9b84", "#b695ff"] as const;

type RuntimeMode = "boot" | "menu" | "playing" | "paused" | "complete" | "error";
type ToneKind = "tap" | "collect" | "success" | "wrong" | "photo" | "magic";

interface EngineResult {
  engine: AbstractEngine;
  backend: "WebGPU" | "WebGL2" | "WebGL";
}

interface SaveSummary {
  unlocked: number;
  completed: number;
  stars: number;
  collection: number;
  updatedAt: string;
}

interface RuntimeElements {
  shell: HTMLDivElement;
  canvas: HTMLCanvasElement;
  screen: HTMLDivElement;
  fullscreenHelp: HTMLDivElement;
  hud: HTMLElement;
  mission: HTMLElement;
  counter: HTMLElement;
  hint: HTMLElement;
  controls: HTMLElement;
  joystick: HTMLElement;
  joystickKnob: HTMLElement;
  primary: HTMLButtonElement;
  secondary: HTMLButtonElement;
  quiz: HTMLDivElement;
  toasts: HTMLDivElement;
  loading: HTMLDivElement;
  loadingText: HTMLElement;
  backend: HTMLElement;
}

interface WebkitFullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitCurrentFullScreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => void | Promise<void>;
  webkitCancelFullScreen?: () => void | Promise<void>;
}

interface WebkitFullscreenElement extends HTMLDivElement {
  webkitRequestFullscreen?: () => void | Promise<void>;
}

interface StandaloneNavigator extends Navigator {
  standalone?: boolean;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cssColor(value: string, fallback: string): string {
  return /^(#[\da-f]{3,8}|rgb[a]?\([\d\s,.%]+\)|hsl[a]?\([\d\s,.%deg]+\))$/i.test(value.trim())
    ? value.trim()
    : fallback;
}

function cloneSave(save: GameSave): GameSave {
  return JSON.parse(JSON.stringify(save)) as GameSave;
}

function formatSavedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "まだあそんでいません";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

class SaveStore {
  readonly gameId: string;
  readonly stageCount: number;
  selectedProfile: number;

  constructor(gameId: string, stageCount: number) {
    this.gameId = gameId;
    this.stageCount = Math.max(1, stageCount);
    this.selectedProfile = this.readSelectedProfile();
  }

  private selectionKey(): string {
    return `${STORAGE_PREFIX}:${this.gameId}:selected-profile`;
  }

  private generationKey(profile: number, generation: number): string {
    return `${STORAGE_PREFIX}:${this.gameId}:profile-${profile}:generation-${generation}`;
  }

  private readSelectedProfile(): number {
    try {
      const stored = Number.parseInt(localStorage.getItem(this.selectionKey()) ?? "0", 10);
      return clamp(Number.isFinite(stored) ? stored : 0, 0, PROFILE_COUNT - 1);
    } catch {
      return 0;
    }
  }

  private empty(profile: number): GameSave {
    return {
      version: 1,
      unlocked: 1,
      selectedProfile: profile,
      stages: {},
      collection: [],
      settings: { ...DEFAULT_SETTINGS },
      updatedAt: new Date(0).toISOString()
    };
  }

  private parse(raw: string | null, profile: number): GameSave | null {
    if (!raw) return null;
    try {
      const value: unknown = JSON.parse(raw);
      if (!isRecord(value) || value.version !== 1) return null;

      const settingsValue = isRecord(value.settings) ? value.settings : {};
      const quality = settingsValue.quality;
      const settings: GameSettings = {
        sound: typeof settingsValue.sound === "boolean" ? settingsValue.sound : DEFAULT_SETTINGS.sound,
        narration:
          typeof settingsValue.narration === "boolean"
            ? settingsValue.narration
            : DEFAULT_SETTINGS.narration,
        reducedMotion:
          typeof settingsValue.reducedMotion === "boolean"
            ? settingsValue.reducedMotion
            : DEFAULT_SETTINGS.reducedMotion,
        leftHanded:
          typeof settingsValue.leftHanded === "boolean"
            ? settingsValue.leftHanded
            : DEFAULT_SETTINGS.leftHanded,
        tilt: typeof settingsValue.tilt === "boolean" ? settingsValue.tilt : DEFAULT_SETTINGS.tilt,
        quality: quality === "high" || quality === "eco" || quality === "auto" ? quality : "auto"
      };

      const stages: Record<string, SavedStageResult> = {};
      if (isRecord(value.stages)) {
        for (const [id, rawResult] of Object.entries(value.stages)) {
          if (!isRecord(rawResult)) continue;
          const stars = clamp(Math.round(finite(rawResult.stars, 1)), 1, 3) as 1 | 2 | 3;
          stages[id] = {
            stars,
            score: Math.max(0, Math.round(finite(rawResult.score))),
            collected: Math.max(0, Math.round(finite(rawResult.collected))),
            bonus: Boolean(rawResult.bonus),
            message: typeof rawResult.message === "string" ? rawResult.message.slice(0, 240) : "",
            plays: Math.max(1, Math.round(finite(rawResult.plays, 1))),
            bestScore: Math.max(0, Math.round(finite(rawResult.bestScore, finite(rawResult.score))))
          };
        }
      }

      const collection = Array.isArray(value.collection)
        ? [...new Set(value.collection.filter((item): item is string => typeof item === "string"))].slice(0, 500)
        : [];

      const updatedAt =
        typeof value.updatedAt === "string" && !Number.isNaN(new Date(value.updatedAt).getTime())
          ? value.updatedAt
          : new Date(0).toISOString();

      return {
        version: 1,
        unlocked: clamp(Math.round(finite(value.unlocked, 1)), 1, this.stageCount),
        selectedProfile: profile,
        stages,
        collection,
        settings,
        updatedAt
      };
    } catch {
      return null;
    }
  }

  load(profile = this.selectedProfile): GameSave {
    const safeProfile = clamp(Math.round(profile), 0, PROFILE_COUNT - 1);
    for (let generation = 0; generation < SAVE_GENERATIONS; generation += 1) {
      try {
        const parsed = this.parse(localStorage.getItem(this.generationKey(safeProfile, generation)), safeProfile);
        if (parsed) return parsed;
      } catch {
        break;
      }
    }
    return this.empty(safeProfile);
  }

  save(save: GameSave): void {
    const profile = clamp(save.selectedProfile, 0, PROFILE_COUNT - 1);
    const snapshot = cloneSave({
      ...save,
      version: 1,
      selectedProfile: profile,
      unlocked: clamp(save.unlocked, 1, this.stageCount),
      updatedAt: new Date().toISOString()
    });

    try {
      const next = JSON.stringify(snapshot);
      const current = localStorage.getItem(this.generationKey(profile, 0));
      if (current === next) return;

      for (let generation = SAVE_GENERATIONS - 1; generation >= 1; generation -= 1) {
        const prior = localStorage.getItem(this.generationKey(profile, generation - 1));
        if (prior) localStorage.setItem(this.generationKey(profile, generation), prior);
      }
      localStorage.setItem(this.generationKey(profile, 0), next);
    } catch {
      // Safari private mode or a full localStorage quota must never stop play.
    }
  }

  select(profile: number): GameSave {
    this.selectedProfile = clamp(Math.round(profile), 0, PROFILE_COUNT - 1);
    try {
      localStorage.setItem(this.selectionKey(), String(this.selectedProfile));
    } catch {
      // Continue with an in-memory selection when storage is unavailable.
    }
    return this.load(this.selectedProfile);
  }

  summary(profile: number): SaveSummary {
    const save = this.load(profile);
    return {
      unlocked: save.unlocked,
      completed: Object.keys(save.stages).length,
      stars: Object.values(save.stages).reduce((sum, result) => sum + result.stars, 0),
      collection: save.collection.length,
      updatedAt: save.updatedAt
    };
  }
}

class AudioDirector {
  private context: AudioContext | null = null;
  private readonly settings: () => Readonly<GameSettings>;

  constructor(settings: () => Readonly<GameSettings>) {
    this.settings = settings;
  }

  async wake(): Promise<void> {
    if (!this.settings().sound) return;
    try {
      if (!this.context) {
        const AudioContextClass =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        this.context = new AudioContextClass();
      }
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      // Audio is an enhancement. The game stays fully playable without it.
    }
  }

  play(kind: ToneKind): void {
    if (!this.settings().sound) return;
    void this.wake().then(() => {
      const context = this.context;
      if (!context || context.state !== "running") return;

      const patterns: Record<ToneKind, Array<[number, number, number, OscillatorType]>> = {
        tap: [[520, 0, 0.055, "sine"]],
        collect: [
          [660, 0, 0.08, "sine"],
          [880, 0.065, 0.11, "sine"]
        ],
        success: [
          [523, 0, 0.12, "triangle"],
          [659, 0.1, 0.13, "triangle"],
          [784, 0.21, 0.2, "triangle"]
        ],
        wrong: [
          [240, 0, 0.09, "sine"],
          [190, 0.08, 0.13, "sine"]
        ],
        photo: [
          [980, 0, 0.035, "square"],
          [620, 0.04, 0.08, "sine"]
        ],
        magic: [
          [440, 0, 0.1, "sine"],
          [660, 0.07, 0.14, "sine"],
          [990, 0.16, 0.2, "sine"]
        ]
      };

      const now = context.currentTime;
      for (const [frequency, delay, duration, type] of patterns[kind]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now + delay);
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(kind === "wrong" ? 0.055 : 0.075, now + delay + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + delay);
        oscillator.stop(now + delay + duration + 0.02);
      }
    });
  }

  say(text: string): void {
    if (!this.settings().narration || !text.trim() || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = 0.9;
      utterance.pitch = 1.08;
      utterance.volume = 0.9;
      const voice = window.speechSynthesis
        .getVoices()
        .find((candidate) => candidate.lang.toLowerCase().startsWith("ja"));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Some iOS contexts deny speech until a fresh gesture; visual text remains.
    }
  }

  stopSpeech(): void {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
}

class DynamicResolution {
  private readonly engine: AbstractEngine;
  private quality: GameSettings["quality"] = "auto";
  private baseLevel = 1;
  private minimumLevel = 0.5;
  private maximumLevel = 1.28;
  private elapsed = 0;
  private lowSamples = 0;
  private highSamples = 0;

  constructor(engine: AbstractEngine, quality: GameSettings["quality"]) {
    this.engine = engine;
    this.setQuality(quality);
  }

  setQuality(quality: GameSettings["quality"]): void {
    this.quality = quality;
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const desiredDpr =
      quality === "high" ? dpr :
      quality === "eco" ? Math.min(dpr, 1.05) :
      Math.min(dpr, 1.55);
    this.baseLevel = 1 / desiredDpr;
    this.minimumLevel = 1 / dpr;
    this.maximumLevel = quality === "high" ? 1.05 : quality === "eco" ? 1.38 : 1.28;
    this.lowSamples = 0;
    this.highSamples = 0;
    this.engine.setHardwareScalingLevel(clamp(this.baseLevel, this.minimumLevel, this.maximumLevel));
    this.engine.resize();
  }

  sample(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    if (this.elapsed < 1.2) return;
    this.elapsed = 0;

    const fps = this.engine.getFps();
    if (!Number.isFinite(fps) || fps <= 0) return;

    if (fps < 47) {
      this.lowSamples += 1;
      this.highSamples = 0;
    } else if (fps > 57) {
      this.highSamples += 1;
      this.lowSamples = 0;
    } else {
      this.lowSamples = Math.max(0, this.lowSamples - 1);
      this.highSamples = Math.max(0, this.highSamples - 1);
    }

    const current = this.engine.getHardwareScalingLevel();
    if (this.lowSamples >= 2 && current < this.maximumLevel) {
      this.engine.setHardwareScalingLevel(Math.min(this.maximumLevel, current + 0.1));
      this.lowSamples = 0;
    } else if (this.highSamples >= 4 && current > this.baseLevel) {
      this.engine.setHardwareScalingLevel(Math.max(this.baseLevel, current - 0.06));
      this.highSamples = 0;
    }
  }

  label(): string {
    const scale = 1 / this.engine.getHardwareScalingLevel();
    return `${this.quality} · ${scale.toFixed(2)}x`;
  }
}

class InputManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly joystick: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly primaryButton: HTMLButtonElement;
  private readonly secondaryButton: HTMLButtonElement;
  private readonly settings: () => Readonly<GameSettings>;
  private readonly state: InputState = {
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    tiltX: 0,
    tiltY: 0,
    primaryHeld: false,
    secondaryHeld: false
  };
  private readonly keys = new Set<string>();
  private joystickPointer: number | null = null;
  private lookPointer: number | null = null;
  private lastLookX = 0;
  private lastLookY = 0;
  private controller: SceneController | null = null;
  private enabled = false;
  private orientationListening = false;

  constructor(
    elements: Pick<
      RuntimeElements,
      "canvas" | "joystick" | "joystickKnob" | "primary" | "secondary"
    >,
    settings: () => Readonly<GameSettings>
  ) {
    this.canvas = elements.canvas;
    this.joystick = elements.joystick;
    this.knob = elements.joystickKnob;
    this.primaryButton = elements.primary;
    this.secondaryButton = elements.secondary;
    this.settings = settings;
    this.bind();
  }

  private bind(): void {
    this.joystick.addEventListener("pointerdown", (event) => {
      if (!this.enabled || this.joystickPointer !== null) return;
      this.joystickPointer = event.pointerId;
      this.joystick.setPointerCapture(event.pointerId);
      this.updateJoystick(event);
      event.preventDefault();
    });
    this.joystick.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.joystickPointer) return;
      this.updateJoystick(event);
      event.preventDefault();
    });
    const releaseJoystick = (event: PointerEvent): void => {
      if (event.pointerId !== this.joystickPointer) return;
      this.joystickPointer = null;
      this.state.moveX = 0;
      this.state.moveY = 0;
      this.knob.style.transform = "translate(-50%, -50%)";
    };
    this.joystick.addEventListener("pointerup", releaseJoystick);
    this.joystick.addEventListener("pointercancel", releaseJoystick);
    this.joystick.addEventListener("lostpointercapture", releaseJoystick);

    this.canvas.addEventListener("pointerdown", (event) => {
      if (!this.enabled || this.lookPointer !== null) return;
      this.lookPointer = event.pointerId;
      this.lastLookX = event.clientX;
      this.lastLookY = event.clientY;
      this.canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.lookPointer) return;
      const sensitivity = Math.max(42, Math.min(innerWidth, innerHeight) * 0.13);
      this.state.lookX = clamp(this.state.lookX + (event.clientX - this.lastLookX) / sensitivity, -1, 1);
      this.state.lookY = clamp(this.state.lookY + (event.clientY - this.lastLookY) / sensitivity, -1, 1);
      this.lastLookX = event.clientX;
      this.lastLookY = event.clientY;
      event.preventDefault();
    });
    const releaseLook = (event: PointerEvent): void => {
      if (event.pointerId !== this.lookPointer) return;
      this.lookPointer = null;
    };
    this.canvas.addEventListener("pointerup", releaseLook);
    this.canvas.addEventListener("pointercancel", releaseLook);
    this.canvas.addEventListener("lostpointercapture", releaseLook);

    this.bindAction(this.primaryButton, true);
    this.bindAction(this.secondaryButton, false);

    window.addEventListener("keydown", (event) => {
      if (!this.enabled) return;
      const code = event.code;
      if (
        code.startsWith("Arrow") ||
        code === "Space" ||
        code === "KeyW" ||
        code === "KeyA" ||
        code === "KeyS" ||
        code === "KeyD" ||
        code === "KeyE" ||
        code === "ShiftLeft" ||
        code === "ShiftRight"
      ) {
        event.preventDefault();
      }
      this.keys.add(code);
      if (code === "Space" && !this.state.primaryHeld) this.setAction(true, true);
      if ((code === "KeyE" || code.startsWith("Shift")) && !this.state.secondaryHeld) {
        this.setAction(false, true);
      }
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
      if (event.code === "Space") this.setAction(true, false);
      if (event.code === "KeyE" || event.code.startsWith("Shift")) this.setAction(false, false);
    });
    window.addEventListener("blur", () => this.reset());
  }

  private bindAction(button: HTMLButtonElement, primary: boolean): void {
    const set = (pressed: boolean): void => {
      if (!this.enabled && pressed) return;
      this.setAction(primary, pressed);
      button.classList.toggle("is-held", pressed);
    };
    button.addEventListener("pointerdown", (event) => {
      button.setPointerCapture(event.pointerId);
      set(true);
      event.preventDefault();
    });
    button.addEventListener("pointerup", () => set(false));
    button.addEventListener("pointercancel", () => set(false));
    button.addEventListener("lostpointercapture", () => set(false));
  }

  private setAction(primary: boolean, pressed: boolean): void {
    if (primary) {
      if (this.state.primaryHeld === pressed) return;
      this.state.primaryHeld = pressed;
      this.primaryButton.classList.toggle("is-held", pressed);
      this.controller?.primary?.(pressed);
    } else {
      if (this.state.secondaryHeld === pressed) return;
      this.state.secondaryHeld = pressed;
      this.secondaryButton.classList.toggle("is-held", pressed);
      this.controller?.secondary?.(pressed);
    }
  }

  private updateJoystick(event: PointerEvent): void {
    const bounds = this.joystick.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const radius = Math.max(1, bounds.width * 0.34);
    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const distance = Math.hypot(rawX, rawY);
    const scale = distance > radius ? radius / distance : 1;
    const x = rawX * scale;
    const y = rawY * scale;
    this.state.moveX = clamp(x / radius, -1, 1);
    this.state.moveY = clamp(-y / radius, -1, 1);
    this.knob.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px))`;
  }

  private handleOrientation = (event: DeviceOrientationEvent): void => {
    if (!this.settings().tilt) {
      this.state.tiltX = 0;
      this.state.tiltY = 0;
      return;
    }
    const beta = finite(event.beta);
    const gamma = finite(event.gamma);
    const angle = screen.orientation?.angle ?? (typeof window.orientation === "number" ? window.orientation : 0);
    if (Math.abs(angle) === 90) {
      const direction = angle === 90 ? 1 : -1;
      this.state.tiltX = clamp((beta - 45) / 35, -1, 1) * direction;
      this.state.tiltY = clamp(gamma / 35, -1, 1) * direction;
    } else {
      this.state.tiltX = clamp(gamma / 35, -1, 1);
      this.state.tiltY = clamp((beta - 45) / 35, -1, 1);
    }
  };

  async requestTiltPermission(): Promise<boolean> {
    try {
      const OrientationEventClass = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      };
      if (OrientationEventClass?.requestPermission) {
        const permission = await OrientationEventClass.requestPermission();
        if (permission !== "granted") return false;
      }
      this.startTiltListening();
      return "DeviceOrientationEvent" in window;
    } catch {
      return false;
    }
  }

  startTiltListening(): void {
    if (this.orientationListening || !("DeviceOrientationEvent" in window)) return;
    window.addEventListener("deviceorientation", this.handleOrientation, true);
    this.orientationListening = true;
  }

  setController(controller: SceneController | null): void {
    this.controller = controller;
    this.reset();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  reset(): void {
    this.keys.clear();
    this.joystickPointer = null;
    this.lookPointer = null;
    this.state.moveX = 0;
    this.state.moveY = 0;
    this.state.lookX = 0;
    this.state.lookY = 0;
    this.setAction(true, false);
    this.setAction(false, false);
    this.knob.style.transform = "translate(-50%, -50%)";
  }

  snapshot(): InputState {
    let moveX = this.state.moveX;
    let moveY = this.state.moveY;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) moveX -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) moveX += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) moveY += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) moveY -= 1;

    const gamepad = navigator.getGamepads?.()[0];
    if (gamepad) {
      const axisX = Math.abs(gamepad.axes[0] ?? 0) > 0.12 ? gamepad.axes[0] ?? 0 : 0;
      const axisY = Math.abs(gamepad.axes[1] ?? 0) > 0.12 ? -(gamepad.axes[1] ?? 0) : 0;
      moveX += axisX;
      moveY += axisY;
      this.state.lookX += Math.abs(gamepad.axes[2] ?? 0) > 0.14 ? gamepad.axes[2] ?? 0 : 0;
      this.state.lookY += Math.abs(gamepad.axes[3] ?? 0) > 0.14 ? gamepad.axes[3] ?? 0 : 0;
      this.setAction(true, Boolean(gamepad.buttons[0]?.pressed));
      this.setAction(false, Boolean(gamepad.buttons[1]?.pressed));
    }

    const length = Math.hypot(moveX, moveY);
    if (length > 1) {
      moveX /= length;
      moveY /= length;
    }

    const snapshot: InputState = {
      moveX: clamp(moveX, -1, 1),
      moveY: clamp(moveY, -1, 1),
      lookX: clamp(this.state.lookX, -1, 1),
      lookY: clamp(this.state.lookY, -1, 1),
      tiltX: this.settings().tilt ? this.state.tiltX : 0,
      tiltY: this.settings().tilt ? this.state.tiltY : 0,
      primaryHeld: this.state.primaryHeld,
      secondaryHeld: this.state.secondaryHeld
    };
    this.state.lookX = 0;
    this.state.lookY = 0;
    return snapshot;
  }
}

async function createBestEngine(canvas: HTMLCanvasElement): Promise<EngineResult> {
  const hasWebGpu = Boolean((navigator as Navigator & { gpu?: unknown }).gpu);
  if (hasWebGpu) {
    let webGpu: WebGPUEngine | null = null;
    try {
      webGpu = new WebGPUEngine(canvas, {
        antialias: true,
        adaptToDeviceRatio: false,
        powerPreference: "high-performance"
      });
      await webGpu.initAsync();
      return { engine: webGpu, backend: "WebGPU" };
    } catch (error) {
      console.warn("WebGPU could not start; falling back to WebGL2.", error);
      webGpu?.dispose();
    }
  }

  const engine = new Engine(
    canvas,
    true,
    {
      preserveDrawingBuffer: false,
      stencil: true,
      premultipliedAlpha: false,
      disableWebGL2Support: false,
      powerPreference: "high-performance",
      doNotHandleContextLost: false,
      audioEngine: false
    },
    false
  );
  const version = engine.webGLVersion;
  return { engine, backend: version >= 2 ? "WebGL2" : "WebGL" };
}

class NekoRuntime {
  private readonly definition: GameDefinition;
  private readonly factory: GameFactory;
  private readonly store: SaveStore;
  private readonly elements: RuntimeElements;
  private save: GameSave;
  private mode: RuntimeMode = "boot";
  private engine: AbstractEngine | null = null;
  private backend = "準備中";
  private currentController: SceneController | null = null;
  private currentStageIndex: number | null = null;
  private input: InputManager | null = null;
  private resolution: DynamicResolution | null = null;
  private audio: AudioDirector;
  private ui: RuntimeUi;
  private lastFrame = performance.now();
  private stageLoadToken = 0;
  private quizOpen = false;
  private quizFinish: ((answer: boolean) => void) | null = null;
  private pausedBySystem = false;
  private fullscreenHelpOpen = false;
  private fullscreenRequestPending = false;
  private ready = false;

  constructor(definition: GameDefinition, factory: GameFactory) {
    this.definition = definition;
    this.factory = factory;
    this.store = new SaveStore(definition.id, definition.stages.length);
    this.save = this.store.load();
    this.elements = this.createShell();
    this.audio = new AudioDirector(() => this.save.settings);
    this.ui = this.createUi();
    this.applySettings();
    this.bindUi();
  }

  private createShell(): RuntimeElements {
    const host = document.querySelector<HTMLElement>("#game-root") ?? document.body;
    host.innerHTML = "";
    document.documentElement.lang = "ja";

    const shell = document.createElement("div");
    shell.className = "neko-shell";
    shell.dataset.game = this.definition.id;
    shell.style.setProperty("--accent", cssColor(this.definition.accent, "#62d4d6"));
    shell.style.setProperty("--accent-2", cssColor(this.definition.accent2, "#ffd66f"));
    shell.innerHTML = `
      <canvas class="neko-canvas" aria-label="${escapeHtml(this.definition.title)} の3Dゲーム画面"></canvas>
      <div class="neko-hud" hidden>
        <button class="neko-hud__button" type="button" data-runtime-action="pause" aria-label="いったん休む">Ⅱ</button>
        <div class="neko-hud__center">
          <div class="neko-hud__mission">ミッションを よみこみちゅう</div>
          <div class="neko-hud__counter">0 / 0</div>
        </div>
        <button class="neko-hud__button" type="button" data-runtime-action="say-mission" aria-label="ミッションを読み上げる">🔊</button>
      </div>
      <div class="neko-hint" hidden></div>
      <div class="neko-controls" hidden>
        <div class="neko-joystick" aria-label="いどうスティック">
          <div class="neko-joystick__knob"></div>
        </div>
        <div class="neko-actions">
          <button class="neko-action neko-action--secondary" type="button">${escapeHtml(this.definition.secondaryLabel)}</button>
          <button class="neko-action neko-action--primary" type="button">${escapeHtml(this.definition.primaryLabel)}</button>
        </div>
      </div>
      <div class="neko-screen"></div>
      <button
        class="neko-fullscreen-toggle"
        type="button"
        data-runtime-action="fullscreen"
        aria-pressed="false"
        aria-label="全画面にする"
      >
        <span data-fullscreen-icon aria-hidden="true">⛶</span>
        <span data-fullscreen-label>全画面</span>
      </button>
      <div class="neko-quiz" hidden></div>
      <div class="neko-toast-stack" aria-live="polite" aria-atomic="false"></div>
      <div class="neko-loading">
        <div class="neko-loading__card">
          <div class="neko-spinner" aria-hidden="true"></div>
          <div class="neko-loading__text">きれいな せかいを つくっています…</div>
        </div>
      </div>
      <div class="neko-backend-badge">準備中</div>
      <div class="neko-portrait-guard" role="status">
        <div>
          <div class="neko-portrait-guard__phone" aria-hidden="true">↻</div>
          <h2>よこむきに してね</h2>
          <p>iPhoneを よこにすると、ひろい画面で あそべます。</p>
        </div>
      </div>
      <div class="neko-fullscreen-help" hidden>
        <section
          class="neko-fullscreen-help__card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="neko-fullscreen-help-title"
        >
          <div class="neko-fullscreen-help__icon" aria-hidden="true">📱✨</div>
          <h2 id="neko-fullscreen-help-title">ホーム画面から 大きくあそぼう</h2>
          <p class="neko-fullscreen-help__lead">
            このiPhoneでは、Safariのページをそのまま全画面にできません。<br>
            おうちの人と いっしょに、つぎの3つを やってね。
          </p>
          <ol class="neko-fullscreen-help__steps">
            <li><strong>1</strong><span>Safariの <b>共有ボタン「□↑」</b>を おします</span></li>
            <li><strong>2</strong><span><b>「ホーム画面に追加」</b>を えらび、「Web Appとして開く」が出たら オンにします</span></li>
            <li><strong>3</strong><span>ホーム画面にできたアイコンから ゲームを ひらきます</span></li>
          </ol>
          <p class="neko-fullscreen-help__note">ゲームのつづきは、このiPhoneの中に のこります。</p>
          <button class="neko-button neko-button--primary" type="button" data-runtime-action="close-fullscreen-help">
            わかった
          </button>
        </section>
      </div>
    `;
    host.append(shell);

    const requireElement = <T extends Element>(selector: string): T => {
      const found = shell.querySelector<T>(selector);
      if (!found) throw new Error(`Runtime element is missing: ${selector}`);
      return found;
    };

    return {
      shell,
      canvas: requireElement<HTMLCanvasElement>(".neko-canvas"),
      screen: requireElement<HTMLDivElement>(".neko-screen"),
      fullscreenHelp: requireElement<HTMLDivElement>(".neko-fullscreen-help"),
      hud: requireElement<HTMLElement>(".neko-hud"),
      mission: requireElement<HTMLElement>(".neko-hud__mission"),
      counter: requireElement<HTMLElement>(".neko-hud__counter"),
      hint: requireElement<HTMLElement>(".neko-hint"),
      controls: requireElement<HTMLElement>(".neko-controls"),
      joystick: requireElement<HTMLElement>(".neko-joystick"),
      joystickKnob: requireElement<HTMLElement>(".neko-joystick__knob"),
      primary: requireElement<HTMLButtonElement>(".neko-action--primary"),
      secondary: requireElement<HTMLButtonElement>(".neko-action--secondary"),
      quiz: requireElement<HTMLDivElement>(".neko-quiz"),
      toasts: requireElement<HTMLDivElement>(".neko-toast-stack"),
      loading: requireElement<HTMLDivElement>(".neko-loading"),
      loadingText: requireElement<HTMLElement>(".neko-loading__text"),
      backend: requireElement<HTMLElement>(".neko-backend-badge")
    };
  }

  private createUi(): RuntimeUi {
    return {
      setMission: (text) => {
        this.elements.mission.textContent = text;
      },
      setCounter: (label, value, total) => {
        this.elements.counter.textContent = `${label} ${Math.max(0, Math.round(value))} / ${Math.max(0, Math.round(total))}`;
      },
      setHint: (text, visible = true) => {
        this.elements.hint.textContent = text;
        this.elements.hint.hidden = !visible || !text;
      },
      toast: (text, tone = "info") => this.toast(text, tone),
      ask: (question) => this.ask(question),
      say: (text) => this.audio.say(text),
      playTone: (kind) => this.audio.play(kind),
      complete: (result) => {
        void this.completeStage(result);
      },
      addCollection: (id) => this.addCollection(id),
      getSettings: () => this.save.settings
    };
  }

  private bindUi(): void {
    this.elements.shell.addEventListener(
      "pointerdown",
      () => {
        void this.audio.wake();
      },
      { capture: true }
    );

    this.elements.shell.addEventListener("click", (event) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-runtime-action]");
      if (!target) return;
      void this.handleAction(target);
    });

    const handleFullscreenChange = (): void => {
      this.fullscreenRequestPending = false;
      this.syncFullscreenUi();
      this.engine?.resize();
      this.handleSystemPause();
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("fullscreenerror", () => this.handleFullscreenError());
    document.addEventListener("webkitfullscreenerror", () => this.handleFullscreenError());

    document.addEventListener("visibilitychange", () => this.handleSystemPause());
    window.addEventListener("pageshow", () => this.syncFullscreenUi());
    window.addEventListener("pagehide", () => {
      this.persist();
      this.currentController?.pause?.();
    });
    window.addEventListener("resize", () => {
      this.engine?.resize();
      this.handleSystemPause();
    });
    screen.orientation?.addEventListener?.("change", () => this.handleSystemPause());
    document.addEventListener("contextmenu", (event) => event.preventDefault());
    document.addEventListener("gesturestart", (event) => event.preventDefault());
    this.syncFullscreenUi();
  }

  async init(): Promise<void> {
    try {
      this.setLoading(true, "iPhoneに あわせて じゅんびしています…");
      await nextFrame();
      const engineResult = await createBestEngine(this.elements.canvas);
      this.engine = engineResult.engine;
      this.backend = engineResult.backend;
      this.elements.backend.textContent = this.backend;
      this.resolution = new DynamicResolution(this.engine, this.save.settings.quality);
      this.input = new InputManager(this.elements, () => this.save.settings);

      if (this.save.settings.tilt) {
        // A fresh iOS permission request must come from a user gesture. If the
        // child already granted access, events resume; otherwise the settings
        // button remains the explicit place to request it again.
        this.input.startTiltListening();
      }

      this.startRenderLoop();
      this.installDebugApi();
      this.registerServiceWorker();
      this.mode = "menu";
      this.ready = true;
      this.showMainMenu();
      this.setLoading(false);
      const isLocalPreview = location.hostname === "127.0.0.1" || location.hostname === "localhost";
      const previewStage = Number.parseInt(new URLSearchParams(location.search).get("stage") ?? "", 10);
      if (
        isLocalPreview &&
        Number.isInteger(previewStage) &&
        previewStage >= 1 &&
        previewStage <= this.definition.stages.length
      ) {
        await this.startStage(previewStage - 1, true);
      }
      window.dispatchEvent(new CustomEvent("neko-game-ready", { detail: { id: this.definition.id, engine: this.backend } }));
    } catch (error) {
      console.error(error);
      this.mode = "error";
      this.showFatal(error);
      this.setLoading(false);
    }
  }

  private startRenderLoop(): void {
    if (!this.engine) return;
    this.lastFrame = performance.now();
    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const deltaSeconds = clamp((now - this.lastFrame) / 1000, 0, 0.05);
      this.lastFrame = now;
      const controller = this.currentController;

      if (
        controller &&
        this.mode === "playing" &&
        !this.quizOpen &&
        !this.fullscreenHelpOpen &&
        !this.pausedBySystem &&
        !document.hidden
      ) {
        try {
          controller.update(deltaSeconds, this.input?.snapshot() ?? {
            moveX: 0,
            moveY: 0,
            lookX: 0,
            lookY: 0,
            tiltX: 0,
            tiltY: 0,
            primaryHeld: false,
            secondaryHeld: false
          });
          this.resolution?.sample(deltaSeconds);
        } catch (error) {
          console.error("Game update failed.", error);
          this.toast("うごきを なおしています。メニューにもどって もういちど ためしてね。", "warn");
          this.showPause();
        }
        if (
          this.mode === "playing" &&
          !this.quizOpen &&
          !this.fullscreenHelpOpen &&
          !this.pausedBySystem
        ) {
          try {
            controller.scene.render();
          } catch (error) {
            console.error("Scene render failed.", error);
          }
        }
      }

      if (this.resolution && this.engine && Math.floor(now / 2000) !== Math.floor((now - deltaSeconds * 1000) / 2000)) {
        this.elements.backend.title = `${this.backend} · ${this.resolution.label()} · ${this.engine.getFps().toFixed(0)}fps`;
      }
    });
  }

  private async handleAction(target: HTMLElement): Promise<void> {
    const action = target.dataset.runtimeAction;
    this.audio.play("tap");

    switch (action) {
      case "continue": {
        await this.startStage(this.findContinueStage());
        break;
      }
      case "stages":
        this.showStages();
        break;
      case "profiles":
        this.showProfiles();
        break;
      case "settings":
        this.showSettings();
        break;
      case "menu":
        this.returnToMenu();
        break;
      case "back-menu":
        this.showMainMenu();
        break;
      case "start-stage": {
        const index = Number.parseInt(target.dataset.stage ?? "", 10);
        if (Number.isFinite(index)) await this.startStage(index);
        break;
      }
      case "select-profile": {
        const profile = Number.parseInt(target.dataset.profile ?? "", 10);
        if (Number.isFinite(profile)) this.selectProfile(profile);
        break;
      }
      case "setting": {
        const setting = target.dataset.setting as keyof GameSettings | undefined;
        if (setting) await this.toggleSetting(setting);
        break;
      }
      case "pause":
        this.showPause();
        break;
      case "resume":
        this.resumeGame();
        break;
      case "say-mission":
        this.audio.say(this.elements.mission.textContent ?? "");
        break;
      case "retry":
        if (this.currentStageIndex !== null) await this.startStage(this.currentStageIndex);
        break;
      case "next":
        if (this.currentStageIndex !== null) await this.startStage(this.currentStageIndex + 1);
        break;
      case "fullscreen":
        await this.toggleFullscreen();
        break;
      case "close-fullscreen-help":
        this.closeFullscreenHelp();
        break;
    }
  }

  private findContinueStage(): number {
    const unlocked = clamp(this.save.unlocked, 1, this.definition.stages.length);
    for (let index = 0; index < unlocked; index += 1) {
      const stage = this.definition.stages[index];
      if (stage && !this.save.stages[stage.id]) return index;
    }
    return Math.max(0, unlocked - 1);
  }

  private showMainMenu(): void {
    if (this.currentController) this.disposeCurrentStage();
    this.mode = "menu";
    this.hideGameUi();
    const completed = Object.keys(this.save.stages).length;
    const stars = Object.values(this.save.stages).reduce((total, result) => total + result.stars, 0);
    const continueStage = this.definition.stages[this.findContinueStage()];
    const continueLabel = completed === 0 ? "はじめから あそぶ" : "つづきから あそぶ";

    this.showScreen(`
      <div class="neko-screen__scroll">
        <main class="neko-panel neko-menu">
          <section class="neko-menu__copy">
            <p class="neko-eyebrow">🎮 ${escapeHtml(this.definition.ageLabel)} · 全${this.definition.stages.length}${escapeHtml(this.definition.stageNoun)}</p>
            <h1 class="neko-title">${escapeHtml(this.definition.title)}</h1>
            <p class="neko-subtitle">${escapeHtml(this.definition.subtitle)}</p>
            <p class="neko-description">${escapeHtml(this.definition.description)}</p>
            <p class="neko-safety"><span aria-hidden="true">🛟</span><span>${escapeHtml(this.definition.safetyNote)}</span></p>
          </section>
          <section class="neko-menu__actions" aria-label="メニュー">
            <button class="neko-button neko-button--primary" type="button" data-runtime-action="continue">
              ${continueLabel}<br><small>${continueStage ? `${this.findContinueStage() + 1}. ${escapeHtml(continueStage.title)}` : ""}</small>
            </button>
            <button class="neko-button neko-button--warm" type="button" data-runtime-action="stages">🗺️ ${this.definition.stages.length}${escapeHtml(this.definition.stageNoun)}から えらぶ</button>
            <div class="neko-menu__meta">
              <div class="neko-stat">できた ${escapeHtml(this.definition.stageNoun)}<strong>${completed} / ${this.definition.stages.length}</strong></div>
              <div class="neko-stat">あつめた ★<strong>${stars} / ${this.definition.stages.length * 3}</strong></div>
              <div class="neko-stat">${escapeHtml(this.definition.collectionLabel)}<strong>${this.save.collection.length} / ${this.definition.collectionTotal}</strong></div>
              <div class="neko-stat">プレイヤー<strong>${PROFILE_EMOJI[this.save.selectedProfile]} ${this.save.selectedProfile + 1}</strong></div>
            </div>
            <button class="neko-button neko-button--quiet" type="button" data-runtime-action="profiles">👤 プレイヤーを かえる</button>
            <button class="neko-button neko-button--quiet" type="button" data-runtime-action="settings">⚙️ おと・そうさ・がしつ</button>
            <button
              class="neko-button neko-button--quiet"
              type="button"
              data-runtime-action="fullscreen"
              aria-pressed="false"
              aria-label="全画面にする"
            >
              <span data-fullscreen-icon aria-hidden="true">⛶</span>
              <span data-fullscreen-label>全画面</span>
            </button>
          </section>
        </main>
      </div>
    `);
  }

  private showStages(): void {
    if (this.currentController) this.disposeCurrentStage();
    this.mode = "menu";
    this.hideGameUi();
    const groups = new Map<string, number[]>();
    this.definition.stages.forEach((stage, index) => {
      const area = stage.area || `エリア ${stage.areaIndex + 1}`;
      const list = groups.get(area) ?? [];
      list.push(index);
      groups.set(area, list);
    });

    const groupHtml = [...groups.entries()]
      .map(([area, indices]) => {
        const completed = indices.filter((index) => {
          const stage = this.definition.stages[index];
          return stage ? Boolean(this.save.stages[stage.id]) : false;
        }).length;
        const stages = indices
          .map((index) => {
            const stage = this.definition.stages[index];
            if (!stage) return "";
            const saved = this.save.stages[stage.id];
            const locked = index >= this.save.unlocked;
            const paletteColor = cssColor(stage.palette[0], this.definition.accent);
            const stars = saved ? `${"★".repeat(saved.stars)}${"☆".repeat(3 - saved.stars)}` : "☆☆☆";
            return `
              <button
                class="neko-stage"
                type="button"
                style="--stage-color:${paletteColor}"
                data-runtime-action="start-stage"
                data-stage="${index}"
                ${locked ? "disabled" : ""}
                aria-label="${locked ? "まだえらべません: " : ""}${index + 1} ${escapeHtml(stage.title)}"
              >
                <span class="neko-stage__top">
                  <span class="neko-stage__number">${locked ? "🔒" : index + 1}</span>
                  <span class="neko-stage__stars">${stars}</span>
                </span>
                <span class="neko-stage__title">${escapeHtml(stage.title)}</span>
                <span class="neko-stage__learning">${escapeHtml(stage.learning)} · むずかしさ ${"●".repeat(stage.difficulty)}</span>
              </button>
            `;
          })
          .join("");
        return `
          <section class="neko-stage-group">
            <header class="neko-stage-group__title">
              <h3>${escapeHtml(area)}</h3>
              <span>${completed} / ${indices.length} クリア</span>
            </header>
            <div class="neko-stage-grid">${stages}</div>
          </section>
        `;
      })
      .join("");

    this.showScreen(`
      <div class="neko-screen__scroll">
        <main class="neko-panel">
          <header class="neko-toolbar">
            <button class="neko-icon-button" type="button" data-runtime-action="back-menu" aria-label="メニューにもどる">←</button>
            <div class="neko-toolbar__copy">
              <h2>${this.definition.stages.length}${escapeHtml(this.definition.stageNoun)}から えらぼう</h2>
              <p>★を あつめながら、すこしずつ すすもう</p>
            </div>
            <div class="neko-toolbar__actions">
              <div class="neko-quality-pill">${Object.keys(this.save.stages).length} クリア</div>
              <button class="neko-toolbar__fullscreen" type="button" data-runtime-action="fullscreen" aria-pressed="false" aria-label="全画面にする">
                <span data-fullscreen-icon aria-hidden="true">⛶</span>
                <span data-fullscreen-label>全画面</span>
              </button>
            </div>
          </header>
          <div class="neko-stage-groups">${groupHtml || '<div class="neko-empty">ステージを じゅんびちゅうです。</div>'}</div>
        </main>
      </div>
    `);
  }

  private showProfiles(): void {
    const cards = Array.from({ length: PROFILE_COUNT }, (_, profile) => {
      const summary = this.store.summary(profile);
      const current = profile === this.save.selectedProfile;
      return `
        <button
          class="neko-profile-card ${current ? "is-current" : ""}"
          style="--profile-color:${PROFILE_COLORS[profile]}"
          type="button"
          data-runtime-action="select-profile"
          data-profile="${profile}"
        >
          <span class="neko-profile-card__avatar">${PROFILE_EMOJI[profile]}</span>
          <h3>プレイヤー ${profile + 1}${current ? " · いま" : ""}</h3>
          <p>${summary.completed} ステージ クリア<br>★ ${summary.stars} · ${escapeHtml(this.definition.collectionLabel)} ${summary.collection}<br>${formatSavedAt(summary.updatedAt)}</p>
        </button>
      `;
    }).join("");
    this.showScreen(`
      <div class="neko-screen__scroll">
        <main class="neko-panel">
          <header class="neko-toolbar">
            <button class="neko-icon-button" type="button" data-runtime-action="back-menu" aria-label="メニューにもどる">←</button>
            <div class="neko-toolbar__copy">
              <h2>だれが あそぶ？</h2>
              <p>3人まで、べつべつに つづきを のこせます</p>
            </div>
            <button class="neko-toolbar__fullscreen" type="button" data-runtime-action="fullscreen" aria-pressed="false" aria-label="全画面にする">
              <span data-fullscreen-icon aria-hidden="true">⛶</span>
              <span data-fullscreen-label>全画面</span>
            </button>
          </header>
          <div class="neko-profile-grid">${cards}</div>
        </main>
      </div>
    `);
  }

  private showSettings(): void {
    const booleanSetting = (
      key: Exclude<keyof GameSettings, "quality">,
      title: string,
      description: string
    ): string => `
      <button
        class="neko-setting"
        type="button"
        data-runtime-action="setting"
        data-setting="${key}"
        aria-pressed="${this.save.settings[key]}"
      >
        <span class="neko-setting__copy"><strong>${title}</strong><span>${description}</span></span>
        <span class="neko-switch" aria-hidden="true"></span>
      </button>
    `;
    const qualityLabels: Record<GameSettings["quality"], string> = {
      auto: "じどう",
      high: "きれい",
      eco: "ながもち"
    };
    this.showScreen(`
      <div class="neko-screen__scroll">
        <main class="neko-panel">
          <header class="neko-toolbar">
            <button class="neko-icon-button" type="button" data-runtime-action="back-menu" aria-label="メニューにもどる">←</button>
            <div class="neko-toolbar__copy">
              <h2>おと・そうさ・がしつ</h2>
              <p>このプレイヤーだけの せっていです</p>
            </div>
            <div class="neko-toolbar__actions">
              <div class="neko-quality-pill">${escapeHtml(this.backend)}</div>
              <button class="neko-toolbar__fullscreen" type="button" data-runtime-action="fullscreen" aria-pressed="false" aria-label="全画面にする">
                <span data-fullscreen-icon aria-hidden="true">⛶</span>
                <span data-fullscreen-label>全画面</span>
              </button>
            </div>
          </header>
          <div class="neko-settings">
            ${booleanSetting("sound", "♪ おと", "こうかおんを ならします")}
            ${booleanSetting("narration", "🔊 よみあげ", "もじを にほんごで よみます")}
            ${booleanSetting("leftHanded", "↔ ひだりきき", "ボタンと スティックを いれかえます")}
            ${booleanSetting("tilt", "📱 かたむけそうさ", "iPhoneの かたむきも つかいます")}
            ${booleanSetting("reducedMotion", "◌ やさしいうごき", "大きな ゆれや ひかりを へらします")}
            <button
              class="neko-setting"
              type="button"
              data-runtime-action="setting"
              data-setting="quality"
            >
              <span class="neko-setting__copy"><strong>✨ がしつ</strong><span>じどうは 60fpsを めざして ちょうせいします</span></span>
              <span class="neko-quality-pill">${qualityLabels[this.save.settings.quality]}</span>
            </button>
          </div>
        </main>
      </div>
    `);
  }

  private selectProfile(profile: number): void {
    this.persist();
    this.save = this.store.select(profile);
    this.applySettings();
    this.resolution?.setQuality(this.save.settings.quality);
    this.showProfiles();
    this.toast(`プレイヤー ${profile + 1} に かわりました`, "good");
  }

  private async toggleSetting(setting: keyof GameSettings): Promise<void> {
    if (setting === "quality") {
      const order: GameSettings["quality"][] = ["auto", "high", "eco"];
      const current = order.indexOf(this.save.settings.quality);
      this.save.settings.quality = order[(current + 1) % order.length] ?? "auto";
      this.resolution?.setQuality(this.save.settings.quality);
    } else if (setting === "tilt") {
      if (this.save.settings.tilt) {
        this.save.settings.tilt = false;
      } else {
        const permitted = await this.input?.requestTiltPermission();
        this.save.settings.tilt = Boolean(permitted);
        if (!permitted) this.toast("かたむきそうさを つかえません。タッチそうさで あそべます。", "warn");
      }
    } else {
      this.save.settings[setting] = !this.save.settings[setting];
      if (setting === "narration" && !this.save.settings.narration) this.audio.stopSpeech();
    }
    this.applySettings();
    this.persist();
    this.showSettings();
  }

  private applySettings(): void {
    this.elements.shell.classList.toggle("is-left-handed", this.save.settings.leftHanded);
    this.elements.shell.classList.toggle("is-reduced-motion", this.save.settings.reducedMotion);
    if (this.save.settings.tilt) this.input?.startTiltListening();
  }

  private async startStage(index: number, allowLocked = false): Promise<void> {
    if (!this.engine) throw new Error("The game engine is not ready.");
    if (!Number.isInteger(index) || index < 0 || index >= this.definition.stages.length) {
      throw new RangeError(`Stage ${index} does not exist.`);
    }
    if (!allowLocked && index >= this.save.unlocked) {
      this.toast("まえの ステージを クリアすると えらべるよ", "warn");
      return;
    }
    const stage = this.definition.stages[index];
    if (!stage) return;

    this.closeQuiz(false);
    this.disposeCurrentStage();
    const token = ++this.stageLoadToken;
    this.setLoading(true, `${index + 1}. ${stage.title} を つくっています…`);
    this.hideScreen();
    this.ui.setMission(stage.mission);
    this.ui.setCounter(this.definition.collectionLabel, 0, stage.targets);
    this.ui.setHint("", false);
    await nextFrame();

    try {
      const controller = await this.factory(
        {
          engine: this.engine,
          canvas: this.elements.canvas,
          ui: this.ui
        },
        stage
      );
      if (token !== this.stageLoadToken) {
        controller.dispose();
        controller.scene.dispose();
        return;
      }

      this.currentController = controller;
      this.currentStageIndex = index;
      this.input?.setController(controller);
      this.input?.setEnabled(true);
      this.mode = "playing";
      this.elements.hud.hidden = false;
      this.elements.controls.hidden = false;
      this.elements.canvas.classList.remove("is-dimmed");
      this.setLoading(false);
      this.lastFrame = performance.now();
      controller.resume?.();
      this.audio.say(`${stage.title}。${stage.mission}`);
      void this.tryLandscapeLock();
    } catch (error) {
      console.error(`Stage ${index + 1} could not start.`, error);
      this.setLoading(false);
      this.toast("ステージを ひらけませんでした。もういちど ためしてね。", "warn");
      this.mode = "menu";
      this.showStages();
    }
  }

  private async completeStage(rawResult: StageResult): Promise<void> {
    if (this.mode !== "playing" || this.currentStageIndex === null) return;
    const stage = this.definition.stages[this.currentStageIndex];
    if (!stage) return;

    const result: StageResult = {
      stars: clamp(Math.round(finite(rawResult.stars, 1)), 1, 3) as 1 | 2 | 3,
      score: Math.max(0, Math.round(finite(rawResult.score))),
      collected: Math.max(0, Math.round(finite(rawResult.collected))),
      bonus: Boolean(rawResult.bonus),
      message: typeof rawResult.message === "string" ? rawResult.message.slice(0, 240) : "よく できました！"
    };
    const old = this.save.stages[stage.id];
    this.save.stages[stage.id] = {
      stars: Math.max(old?.stars ?? 1, result.stars) as 1 | 2 | 3,
      score: result.score,
      collected: Math.max(old?.collected ?? 0, result.collected),
      bonus: Boolean(old?.bonus || result.bonus),
      message: result.message,
      plays: (old?.plays ?? 0) + 1,
      bestScore: Math.max(old?.bestScore ?? 0, result.score)
    };
    this.save.unlocked = clamp(
      Math.max(this.save.unlocked, this.currentStageIndex + 2),
      1,
      this.definition.stages.length
    );
    this.persist();

    this.mode = "complete";
    this.currentController?.pause?.();
    this.input?.setEnabled(false);
    this.elements.hud.hidden = true;
    this.elements.controls.hidden = true;
    this.elements.hint.hidden = true;
    this.elements.canvas.classList.add("is-dimmed");
    this.audio.play("success");
    this.audio.say(result.message);

    const hasNext = this.currentStageIndex + 1 < this.definition.stages.length;
    const stars = `${"★".repeat(result.stars)}${"☆".repeat(3 - result.stars)}`;
    this.showScreen(`
      <div class="neko-screen__scroll">
        <main class="neko-panel neko-complete">
          <section class="neko-complete__badge">
            <div class="neko-complete__stars" aria-label="${result.stars}つ星">${stars}</div>
            <div class="neko-complete__label">${result.stars === 3 ? "すごい！ かんぺき！" : "ステージ クリア！"}</div>
          </section>
          <section class="neko-complete__copy">
            <p class="neko-eyebrow">${this.currentStageIndex + 1}. ${escapeHtml(stage.title)}</p>
            <h2>${result.stars === 3 ? "きらきら だいせいこう！" : "やったね！"}</h2>
            <p class="neko-complete__message">${escapeHtml(result.message)}</p>
            <div class="neko-complete__score">
              <span class="neko-score-chip">スコア <strong>${result.score.toLocaleString("ja-JP")}</strong></span>
              <span class="neko-score-chip">みつけた <strong>${result.collected}</strong></span>
              ${result.bonus ? '<span class="neko-score-chip">ボーナス <strong>GET!</strong></span>' : ""}
            </div>
            <div class="neko-complete__actions">
              ${hasNext ? '<button class="neko-button neko-button--primary" type="button" data-runtime-action="next">つぎの ステージへ →</button>' : '<button class="neko-button neko-button--primary" type="button" data-runtime-action="stages">30ステージ ぜんぶ できた！</button>'}
              <button class="neko-button" type="button" data-runtime-action="retry">↻ もういちど</button>
              <button class="neko-button" type="button" data-runtime-action="menu">⌂ メニュー</button>
              <button class="neko-button neko-button--quiet neko-button--fullscreen-wide" type="button" data-runtime-action="fullscreen" aria-pressed="false" aria-label="全画面にする">
                <span data-fullscreen-icon aria-hidden="true">⛶</span>
                <span data-fullscreen-label>全画面</span>
              </button>
            </div>
          </section>
        </main>
      </div>
    `);
  }

  private showPause(): void {
    if (this.mode !== "playing") return;
    this.mode = "paused";
    this.currentController?.pause?.();
    this.input?.setEnabled(false);
    this.elements.controls.hidden = true;
    this.elements.canvas.classList.add("is-dimmed");
    this.showScreen(`
      <div class="neko-screen__scroll">
        <main class="neko-panel neko-pause">
          <div class="neko-pause__icon" aria-hidden="true">🐱💤</div>
          <h2>ひとやすみ</h2>
          <p>ゲームは ここで とまっています。</p>
          <div class="neko-pause__actions">
            <button class="neko-button neko-button--primary" type="button" data-runtime-action="resume">あそびに もどる</button>
            <button class="neko-button" type="button" data-runtime-action="retry">このステージを やりなおす</button>
            <button class="neko-button" type="button" data-runtime-action="fullscreen" aria-pressed="false" aria-label="全画面にする">
              <span data-fullscreen-icon aria-hidden="true">⛶</span>
              <span data-fullscreen-label>全画面</span>
            </button>
            <button class="neko-button neko-button--quiet" type="button" data-runtime-action="menu">メニューに もどる</button>
          </div>
        </main>
      </div>
    `);
  }

  private resumeGame(): void {
    if (this.mode !== "paused" || !this.currentController) return;
    this.mode = "playing";
    this.hideScreen();
    this.elements.hud.hidden = false;
    this.elements.controls.hidden = false;
    this.elements.canvas.classList.remove("is-dimmed");
    this.input?.setEnabled(true);
    this.currentController.resume?.();
    this.lastFrame = performance.now();
  }

  private returnToMenu(): void {
    this.closeQuiz(false);
    this.persist();
    this.showMainMenu();
  }

  private disposeCurrentStage(): void {
    this.stageLoadToken += 1;
    const controller = this.currentController;
    this.currentController = null;
    this.currentStageIndex = null;
    this.input?.setController(null);
    this.input?.setEnabled(false);
    if (controller) {
      try {
        controller.dispose();
      } catch (error) {
        console.warn("Controller disposal reported an error.", error);
      }
      try {
        controller.scene.dispose();
      } catch {
        // Controllers may already own and dispose their scene.
      }
    }
    this.elements.canvas.classList.remove("is-dimmed");
  }

  private ask(question: LearningQuestion): Promise<boolean> {
    if (this.quizOpen) return Promise.resolve(false);
    this.quizOpen = true;
    this.input?.setEnabled(false);
    this.currentController?.pause?.();
    this.elements.quiz.hidden = false;
    const answer = clamp(Math.round(question.answer), 0, Math.max(0, question.choices.length - 1));
    let attempts = 0;
    let settled = false;

    this.elements.quiz.innerHTML = `
      <div class="neko-quiz__card" role="dialog" aria-modal="true" aria-labelledby="neko-quiz-prompt">
        <div class="neko-quiz__kind">${escapeHtml(question.kind)} チャレンジ</div>
        <h2 class="neko-quiz__prompt" id="neko-quiz-prompt">${escapeHtml(question.prompt)}</h2>
        <p class="neko-quiz__helper">こたえを えらんでね</p>
        <div class="neko-quiz__choices">
          ${question.choices
            .map(
              (choice, index) =>
                `<button class="neko-choice" type="button" data-quiz-choice="${index}">${escapeHtml(choice)}</button>`
            )
            .join("")}
        </div>
        <div class="neko-quiz__rescue">
          <span>おたすけ 3かい</span>
          <span class="neko-rescue-dot"></span>
          <span class="neko-rescue-dot"></span>
          <span class="neko-rescue-dot"></span>
        </div>
      </div>
    `;

    const helper = this.elements.quiz.querySelector<HTMLElement>(".neko-quiz__helper");
    const choices = [...this.elements.quiz.querySelectorAll<HTMLButtonElement>("[data-quiz-choice]")];
    const dots = [...this.elements.quiz.querySelectorAll<HTMLElement>(".neko-rescue-dot")];

    if (question.speak || question.prompt) this.audio.say(question.speak ?? question.prompt);

    return new Promise<boolean>((resolve) => {
      const finish = (success: boolean): void => {
        if (settled) return;
        settled = true;
        this.quizFinish = null;
        this.elements.quiz.hidden = true;
        this.elements.quiz.innerHTML = "";
        this.quizOpen = false;
        if (this.mode === "playing" && !this.pausedBySystem && !this.fullscreenHelpOpen) {
          this.input?.setEnabled(true);
          this.currentController?.resume?.();
        }
        resolve(success);
      };
      this.quizFinish = finish;

      choices.forEach((choice) => {
        choice.addEventListener("click", () => {
          if (settled) return;
          void this.audio.wake();
          const selected = Number.parseInt(choice.dataset.quizChoice ?? "-1", 10);
          if (selected === answer) {
            choice.classList.add("is-correct");
            choices.forEach((button) => {
              button.disabled = true;
            });
            if (helper) helper.textContent = "せいかい！ よく できました";
            this.audio.play("success");
            this.audio.say("せいかい。よく できました");
            window.setTimeout(() => finish(true), 650);
            return;
          }

          attempts += 1;
          choice.classList.add("is-wrong");
          choice.disabled = true;
          dots[attempts - 1]?.classList.add("is-used");
          this.audio.play("wrong");

          if (attempts >= 3) {
            choices.forEach((button, index) => {
              button.disabled = true;
              if (index === answer) button.classList.add("is-correct");
            });
            const correctText = question.choices[answer] ?? "";
            if (helper) helper.textContent = `だいじょうぶ。こたえは「${correctText}」だよ`;
            this.audio.say(`だいじょうぶ。こたえは、${correctText}、だよ`);
            window.setTimeout(() => finish(true), 1450);
          } else {
            if (helper) helper.textContent = question.hint || "ヒントを みて、もういちど えらぼう";
            this.audio.say(question.hint || "もういちど えらんでみよう");
          }
        });
      });
    });
  }

  private closeQuiz(answer: boolean): void {
    if (!this.quizOpen) return;
    const finish = this.quizFinish;
    this.quizFinish = null;
    finish?.(answer);
  }

  private addCollection(id: string): void {
    const safeId = id.trim().slice(0, 120);
    if (!safeId || this.save.collection.includes(safeId)) return;
    this.save.collection.push(safeId);
    this.persist();
    this.audio.play("collect");
    this.toast(`${this.definition.collectionLabel}に あたらしく くわわったよ！`, "good");
  }

  private persist(): void {
    this.save.updatedAt = new Date().toISOString();
    this.store.save(this.save);
  }

  private handleSystemPause(): void {
    const portrait =
      window.matchMedia("(orientation: portrait) and (max-width: 900px)").matches;
    const shouldPause = document.hidden || portrait;
    if (shouldPause && this.mode === "playing" && !this.pausedBySystem) {
      this.pausedBySystem = true;
      this.currentController?.pause?.();
      this.input?.setEnabled(false);
      this.persist();
      this.audio.stopSpeech();
    } else if (!shouldPause && this.mode === "playing" && this.pausedBySystem) {
      this.pausedBySystem = false;
      if (!this.quizOpen && !this.fullscreenHelpOpen) {
        this.currentController?.resume?.();
        this.input?.setEnabled(true);
      }
      this.lastFrame = performance.now();
    }
  }

  private toast(text: string, tone: "good" | "info" | "warn"): void {
    const toast = document.createElement("div");
    toast.className = `neko-toast neko-toast--${tone}`;
    toast.textContent = text;
    this.elements.toasts.append(toast);
    while (this.elements.toasts.children.length > 4) {
      this.elements.toasts.firstElementChild?.remove();
    }
    window.setTimeout(() => {
      toast.classList.add("is-leaving");
      window.setTimeout(() => toast.remove(), 220);
    }, tone === "warn" ? 4300 : 2800);
  }

  private showScreen(content: string): void {
    this.elements.screen.innerHTML = content;
    this.elements.screen.hidden = false;
    this.syncFullscreenUi();
  }

  private hideScreen(): void {
    this.elements.screen.hidden = true;
    this.elements.screen.innerHTML = "";
  }

  private hideGameUi(): void {
    this.elements.hud.hidden = true;
    this.elements.controls.hidden = true;
    this.elements.hint.hidden = true;
    this.input?.setEnabled(false);
    this.elements.canvas.classList.remove("is-dimmed");
  }

  private setLoading(visible: boolean, text?: string): void {
    if (text) this.elements.loadingText.textContent = text;
    this.elements.loading.hidden = !visible;
  }

  private showFatal(error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    this.hideGameUi();
    this.showScreen(`
      <div class="neko-screen__scroll">
        <main class="neko-panel neko-pause">
          <div class="neko-pause__icon" aria-hidden="true">🧰</div>
          <h2>ゲームを ひらけませんでした</h2>
          <p>ページを もういちど よみこんでください。<br><small>${escapeHtml(detail)}</small></p>
          <div class="neko-pause__actions">
            <button class="neko-button neko-button--primary" type="button" onclick="location.reload()">もういちど よみこむ</button>
          </div>
        </main>
      </div>
    `);
  }

  private fullscreenElement(): Element | null {
    const fullscreenDocument = document as WebkitFullscreenDocument;
    return (
      document.fullscreenElement ??
      fullscreenDocument.webkitFullscreenElement ??
      fullscreenDocument.webkitCurrentFullScreenElement ??
      null
    );
  }

  private isStandaloneMode(): boolean {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (navigator as StandaloneNavigator).standalone === true
    );
  }

  private supportsFullscreen(): boolean {
    const fullscreenDocument = document as WebkitFullscreenDocument;
    const fullscreenShell = this.elements.shell as WebkitFullscreenElement;
    const hasRequest =
      typeof fullscreenShell.requestFullscreen === "function" ||
      typeof fullscreenShell.webkitRequestFullscreen === "function";
    const enabledFlags = [
      typeof document.fullscreenEnabled === "boolean" ? document.fullscreenEnabled : undefined,
      typeof fullscreenDocument.webkitFullscreenEnabled === "boolean"
        ? fullscreenDocument.webkitFullscreenEnabled
        : undefined
    ].filter((value): value is boolean => value !== undefined);
    return hasRequest && (enabledFlags.length === 0 || enabledFlags.some(Boolean));
  }

  private syncFullscreenUi(): void {
    const active = Boolean(this.fullscreenElement());
    const supported = this.supportsFullscreen();
    const standalone = this.isStandaloneMode();
    const displayActive = active || standalone;
    const label = active ? "元に戻す" : standalone ? "全画面中" : "全画面";
    const icon = active ? "↙" : standalone ? "✓" : "⛶";

    this.elements.shell.classList.toggle("is-browser-fullscreen", active);
    this.elements.shell.classList.toggle("is-standalone", standalone);
    for (const button of this.elements.shell.querySelectorAll<HTMLElement>(
      '[data-runtime-action="fullscreen"]'
    )) {
      button.setAttribute("aria-pressed", String(displayActive));
      button.setAttribute(
        "aria-label",
        active
          ? "全画面を終了して元に戻す"
          : standalone
            ? "ホーム画面の全画面モードで開いています"
            : "全画面にする"
      );
      button.dataset.fullscreenAvailable = String(supported);
      button.title =
        !displayActive && !supported
          ? "ホーム画面に追加する方法を見ます"
          : active
            ? "元の大きさに戻します"
            : standalone
              ? "ホーム画面の全画面モードで開いています"
              : "ゲームを全画面にします";
      const labelElement = button.querySelector<HTMLElement>("[data-fullscreen-label]");
      const iconElement = button.querySelector<HTMLElement>("[data-fullscreen-icon]");
      if (labelElement) labelElement.textContent = label;
      if (iconElement) iconElement.textContent = icon;
    }
  }

  private handleFullscreenError(): void {
    if (!this.fullscreenRequestPending) return;
    this.fullscreenRequestPending = false;
    this.syncFullscreenUi();
    this.showFullscreenHelp();
  }

  private async toggleFullscreen(): Promise<void> {
    if (this.fullscreenElement()) {
      await this.exitFullscreen();
      return;
    }
    if (this.isStandaloneMode()) {
      this.toast("いまは ホーム画面モードです。もう大きな画面で あそべています。", "good");
      return;
    }
    if (!this.supportsFullscreen()) {
      this.showFullscreenHelp();
      return;
    }

    const fullscreenShell = this.elements.shell as WebkitFullscreenElement;
    this.fullscreenRequestPending = true;
    try {
      if (typeof fullscreenShell.requestFullscreen === "function") {
        try {
          await fullscreenShell.requestFullscreen({ navigationUI: "hide" });
        } catch (error) {
          if (error instanceof TypeError && !this.fullscreenElement()) {
            await fullscreenShell.requestFullscreen();
          } else {
            throw error;
          }
        }
      } else if (typeof fullscreenShell.webkitRequestFullscreen === "function") {
        await Promise.resolve(fullscreenShell.webkitRequestFullscreen());
      }
      await nextFrame();
      const enteredFullscreen = Boolean(this.fullscreenElement());
      this.fullscreenRequestPending = false;
      if (!enteredFullscreen) {
        this.showFullscreenHelp();
      }
    } catch (error) {
      console.info("Fullscreen is unavailable in this browser context.", error);
      this.fullscreenRequestPending = false;
      this.showFullscreenHelp();
    } finally {
      this.syncFullscreenUi();
      this.engine?.resize();
    }
  }

  private async exitFullscreen(): Promise<void> {
    const fullscreenDocument = document as WebkitFullscreenDocument;
    try {
      if (typeof document.exitFullscreen === "function") {
        await document.exitFullscreen();
      } else if (typeof fullscreenDocument.webkitExitFullscreen === "function") {
        await Promise.resolve(fullscreenDocument.webkitExitFullscreen());
      } else if (typeof fullscreenDocument.webkitCancelFullScreen === "function") {
        await Promise.resolve(fullscreenDocument.webkitCancelFullScreen());
      } else {
        this.toast("ブラウザの「戻る」で 元の画面に もどれます。", "info");
      }
    } catch (error) {
      console.info("Fullscreen could not be exited.", error);
      this.toast("画面の上にある「完了」や「戻る」を おしてね。", "info");
    } finally {
      this.syncFullscreenUi();
      this.engine?.resize();
    }
  }

  private showFullscreenHelp(): void {
    if (this.fullscreenHelpOpen) return;
    this.fullscreenRequestPending = false;
    this.fullscreenHelpOpen = true;

    const isIos =
      /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const title = this.elements.fullscreenHelp.querySelector<HTMLElement>(
      "#neko-fullscreen-help-title"
    );
    const lead = this.elements.fullscreenHelp.querySelector<HTMLElement>(
      ".neko-fullscreen-help__lead"
    );
    if (!isIos) {
      if (title) title.textContent = "大きな画面で あそぶには";
      if (lead) {
        lead.innerHTML =
          "このブラウザでは、ページをそのまま全画面にできません。<br>おうちの人と いっしょに、ブラウザのメニューから「ホーム画面に追加」を えらんでね。";
      }
    }

    this.elements.fullscreenHelp.hidden = false;
    if (this.mode === "playing") {
      this.currentController?.pause?.();
      this.input?.setEnabled(false);
      this.elements.canvas.classList.add("is-dimmed");
    }
    window.setTimeout(() => {
      this.elements.fullscreenHelp
        .querySelector<HTMLButtonElement>('[data-runtime-action="close-fullscreen-help"]')
        ?.focus();
    }, 0);
  }

  private closeFullscreenHelp(): void {
    if (!this.fullscreenHelpOpen) return;
    this.fullscreenHelpOpen = false;
    this.elements.fullscreenHelp.hidden = true;
    if (this.mode === "playing") {
      this.elements.canvas.classList.remove("is-dimmed");
      if (!this.quizOpen && !this.pausedBySystem && !document.hidden) {
        this.currentController?.resume?.();
        this.input?.setEnabled(true);
        this.lastFrame = performance.now();
      }
    }
    this.syncFullscreenUi();
  }

  private async tryLandscapeLock(): Promise<void> {
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: "landscape") => Promise<void>;
      };
      await orientation.lock?.("landscape");
    } catch {
      // iPhone Safari intentionally ignores orientation locking outside a PWA/fullscreen context.
    }
  }

  private registerServiceWorker(): void {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    const workerUrl = new URL("../web3d-sw.js", location.href);
    const scopeUrl = new URL("../", location.href);
    void navigator.serviceWorker
      .register(workerUrl, { scope: scopeUrl.href })
      .catch((error) => console.warn("Offline mode could not be registered.", error));
  }

  private installDebugApi(): void {
    const runtime = this;
    const api = {
      get ready() {
        return runtime.ready;
      },
      get engine() {
        return runtime.backend;
      },
      get gameId() {
        return runtime.definition.id;
      },
      get stageCount() {
        return runtime.definition.stages.length;
      },
      get currentStage() {
        return runtime.currentStageIndex;
      },
      startStage(index: number) {
        return runtime.startStage(index, true);
      },
      returnToMenu() {
        runtime.returnToMenu();
      },
      getSave() {
        return cloneSave(runtime.save);
      }
    } satisfies NekoGameDebugApi;
    window.__NEKO_GAME__ = api;
  }
}

export async function bootstrapGame(definition: GameDefinition, factory: GameFactory): Promise<void> {
  if (!definition.id || !definition.title) {
    throw new Error("GameDefinition requires an id and title.");
  }
  if (!Array.isArray(definition.stages) || definition.stages.length === 0) {
    throw new Error("GameDefinition requires at least one stage.");
  }
  const duplicateStage = definition.stages.find(
    (stage, index) => definition.stages.findIndex((candidate) => candidate.id === stage.id) !== index
  );
  if (duplicateStage) {
    throw new Error(`Stage ids must be unique. Duplicate: ${duplicateStage.id}`);
  }

  const runtime = new NekoRuntime(definition, factory);
  await runtime.init();
}

export default bootstrapGame;
