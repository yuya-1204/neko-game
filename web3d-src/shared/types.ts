import type { AbstractEngine, Scene } from "babylonjs";

export type LearningKind = "ひらがな" | "カタカナ" | "たしざん" | "ひきざん" | "とけい" | "かんさつ";

export interface LearningQuestion {
  prompt: string;
  choices: string[];
  answer: number;
  hint: string;
  speak?: string;
  kind: LearningKind;
}

export interface StageDefinition {
  id: string;
  area: string;
  areaIndex: number;
  title: string;
  description: string;
  mission: string;
  learning: LearningKind;
  difficulty: 1 | 2 | 3;
  palette: [string, string, string];
  seed: number;
  targets: number;
  bonusTargets: number;
  question: LearningQuestion;
  variant: string;
}

export interface StageResult {
  stars: 1 | 2 | 3;
  score: number;
  collected: number;
  bonus: boolean;
  message: string;
}

export interface SavedStageResult extends StageResult {
  plays: number;
  bestScore: number;
}

export interface GameSave {
  version: 1;
  unlocked: number;
  selectedProfile: number;
  stages: Record<string, SavedStageResult>;
  collection: string[];
  settings: GameSettings;
  updatedAt: string;
}

export interface GameSettings {
  sound: boolean;
  narration: boolean;
  reducedMotion: boolean;
  leftHanded: boolean;
  tilt: boolean;
  quality: "auto" | "high" | "eco";
}

export interface GameDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  accent2: string;
  ageLabel: string;
  stageNoun: string;
  primaryLabel: string;
  secondaryLabel: string;
  stages: StageDefinition[];
  collectionLabel: string;
  collectionTotal: number;
  safetyNote: string;
}

export interface InputState {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  tiltX: number;
  tiltY: number;
  primaryHeld: boolean;
  secondaryHeld: boolean;
}

export interface RuntimeUi {
  setMission(text: string): void;
  setCounter(label: string, value: number, total: number): void;
  setHint(text: string, visible?: boolean): void;
  toast(text: string, tone?: "good" | "info" | "warn"): void;
  ask(question: LearningQuestion): Promise<boolean>;
  say(text: string): void;
  playTone(kind: "tap" | "collect" | "success" | "wrong" | "photo" | "magic"): void;
  complete(result: StageResult): void;
  addCollection(id: string): void;
  getSettings(): Readonly<GameSettings>;
}

export interface SceneController {
  scene: Scene;
  update(deltaSeconds: number, input: InputState): void;
  primary?(pressed: boolean): void;
  secondary?(pressed: boolean): void;
  pause?(): void;
  resume?(): void;
  dispose(): void;
}

export interface GameFactoryContext {
  engine: AbstractEngine;
  canvas: HTMLCanvasElement;
  ui: RuntimeUi;
}

export type GameFactory = (
  context: GameFactoryContext,
  stage: StageDefinition
) => SceneController | Promise<SceneController>;

export interface NekoGameDebugApi {
  ready: boolean;
  engine: string;
  gameId: string;
  stageCount: number;
  currentStage: number | null;
  startStage(index: number): Promise<void>;
  returnToMenu(): void;
  getSave(): GameSave;
}

declare global {
  interface Window {
    __NEKO_GAME__?: NekoGameDebugApi;
  }
}
