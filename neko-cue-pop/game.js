"use strict";

const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const SAVE_KEY = "nekoCuePopV1";

const STAGES = [
  {
    id: 1, title: "まどべの雨つぶ", icon: "☔", scene: "rain", mood: "かわいい・おだやか",
    bpm: 78, duration: 35, colors: ["#5597d8", "#31518e"], root: 261.63,
    rule: "「ぽつ、ぽつ、キラン！」の キランで ポン！", tempo: "ゆったり",
    targets: [4, 8, 12, 16, 20, 24, 28, 32], decoys: [],
    challenge: [4, 6, 8, 11, 12, 14, 16, 20, 22, 24, 26, 27, 28, 30, 32]
  },
  {
    id: 2, title: "おひるね くしゃみ", icon: "🤧", scene: "sneeze", mood: "にぎやか・わらえる",
    bpm: 92, duration: 35, colors: ["#ff9a74", "#d64c75"], root: 293.66,
    rule: "お鼻が ムズムズ……ハクション！で ティッシュを ポン！", tempo: "ほどよい",
    targets: [4, 8, 12, 16, 20, 24, 28, 32], decoys: [10, 18, 26, 30],
    challenge: [4, 6, 8, 12, 14, 16, 20, 21.5, 24, 28, 30, 32]
  },
  {
    id: 3, title: "屋根裏ニンジャネコ", icon: "🥷", scene: "ninja", mood: "カッコいい",
    bpm: 104, duration: 35, colors: ["#594bbd", "#17194f"], root: 220,
    rule: "月が キラリ！ 『シャキーン』の しゅんかんに ポン！", tempo: "キリッと",
    targets: [4, 6, 8, 12, 14, 16, 20, 22, 24, 28, 30, 32], decoys: [10, 26],
    challenge: [4, 5.5, 7, 8, 11.5, 12.5, 14, 16, 20, 21.5, 22.5, 24, 27.5, 28.5, 30, 31, 32]
  },
  {
    id: 4, title: "はじめてのリミックス", icon: "🎪", scene: "remixA", mood: "ごちゃまぜ",
    bpm: 100, duration: 37, colors: ["#ff6f91", "#6651d6"], root: 246.94,
    rule: "雨つぶ・くしゃみ・ニンジャの 合図が つぎつぎ登場！", tempo: "変化あり",
    targets: [4, 8, 12, 14, 16, 20, 22, 24, 27, 28, 30, 32, 34], decoys: [10, 18, 26],
    challenge: [4, 6, 8, 11, 12, 14, 16, 18, 20, 21.5, 23, 24, 27, 28, 29.5, 31, 32, 34]
  },
  {
    id: 5, title: "こねこの子守歌", icon: "🌙", scene: "lullaby", mood: "かわいい・おだやか",
    bpm: 82, duration: 37, colors: ["#789fd8", "#5c52a4"], root: 329.63,
    rule: "先生ネコの 『ニャ・ニャ』を まねして ポン、ポン！", tempo: "やさしく",
    targets: [6, 7, 10, 11, 14, 15, 18, 19, 22, 23, 24, 28, 29, 31, 32], decoys: [],
    challenge: [6, 7, 9.5, 10.5, 13, 14, 15, 18, 19.5, 20.5, 22, 23, 24.5, 27, 28, 29, 31, 32, 33]
  },
  {
    id: 6, title: "ぐらぐらプリン運び", icon: "🍮", scene: "pudding", mood: "にぎやか・わらえる",
    bpm: 112, duration: 37, colors: ["#f4a742", "#e65f62"], root: 261.63,
    rule: "プリンが ぐらっ！ 『おっと！』で トレーを ポン！", tempo: "にぎやか",
    targets: [4, 6, 8, 11, 12, 15, 16, 20, 22, 24, 28, 30, 32, 34], decoys: [10, 18, 26],
    challenge: [4, 5.5, 7, 8, 10.5, 11.5, 13, 15, 16, 19.5, 21, 22, 23.5, 24.5, 27, 28, 29.5, 31, 32, 34]
  },
  {
    id: 7, title: "夜空のDJネコ", icon: "🎧", scene: "dj", mood: "カッコいい",
    bpm: 116, duration: 37, colors: ["#7f40d7", "#103b74"], root: 196,
    rule: "DJの ベースに こたえて、光るターンテーブルを ポン！", tempo: "ノリノリ",
    targets: [4, 5.5, 8, 9.5, 12, 13, 16, 17.5, 20, 21, 22.5, 24, 26, 28, 30.5, 32, 34], decoys: [11, 27],
    challenge: [4, 5.5, 7, 8, 9.5, 11, 12, 13, 14.5, 16, 17.5, 19, 20, 21, 22.5, 24, 25.5, 27, 28, 30.5, 32, 33, 34]
  },
  {
    id: 8, title: "ドタバタ・リミックス", icon: "🎉", scene: "remixB", mood: "ごちゃまぜ",
    bpm: 110, duration: 41, colors: ["#f14e9b", "#3c5ed1"], root: 220,
    rule: "子守歌・プリン・DJ！ かわいく、笑って、カッコよく！", tempo: "どんどん変化",
    targets: [4, 6, 8, 10, 12, 14, 16, 20, 21.5, 23, 24, 27, 28, 30, 32, 34, 36, 38], decoys: [18, 26, 35],
    challenge: [4, 5.5, 7, 8, 10, 11, 12.5, 14, 15, 16, 19, 20, 21.5, 23, 24, 27, 28, 29.5, 31, 32, 34, 35.5, 37, 38]
  },
  {
    id: 9, title: "星あつめ望遠鏡", icon: "🔭", scene: "stars", mood: "かわいい・おだやか",
    bpm: 84, duration: 37, colors: ["#4b65ae", "#182752"], root: 349.23,
    rule: "静かな 夜。流れ星が 『キラリン』と光ったら ポン！", tempo: "間をきく",
    targets: [4, 8, 12, 17, 20, 24, 29, 32, 34], decoys: [14, 27],
    challenge: [4, 7.5, 10, 12, 15.5, 17, 20, 22.5, 24, 27.5, 29, 31, 32, 34]
  },
  {
    id: 10, title: "ネコパンチ道場", icon: "🥊", scene: "dojo", mood: "にぎやか・わらえる",
    bpm: 120, duration: 37, colors: ["#df5364", "#7e3e39"], root: 293.66,
    rule: "師匠の 『せーの、ニャ！』で パンチ！ 変な合図に注意！", tempo: "はやめ",
    targets: [4, 6, 8, 12, 14, 16, 20, 22, 24, 28, 29, 30, 32, 34], decoys: [10, 18, 26, 31],
    challenge: [4, 5.5, 7, 8, 11.5, 12.5, 14, 15, 16, 19.5, 21, 22, 23, 24, 27.5, 28.5, 29.5, 30.5, 32, 34]
  },
  {
    id: 11, title: "雷神ネコの大太鼓", icon: "⚡", scene: "thunder", mood: "カッコいい",
    bpm: 126, duration: 37, colors: ["#3c64bc", "#2a245e"], root: 164.81,
    rule: "雷が走る！ ドーン！の しゅんかんに 大太鼓を ポン！", tempo: "パワフル",
    targets: [4, 6, 8, 12, 13, 14, 16, 20, 22, 24, 28, 29, 30, 32, 34], decoys: [10, 18, 26],
    challenge: [4, 5.5, 7, 8, 11, 12, 13, 14, 15, 16, 19, 20, 21.5, 22.5, 24, 27, 28, 29, 30, 31, 32, 34]
  },
  {
    id: 12, title: "スーパー・リミックス", icon: "🌟", scene: "remixC", mood: "ごちゃまぜ",
    bpm: 118, duration: 41, colors: ["#4667d1", "#d13f8c"], root: 196,
    rule: "星・道場・雷！ 長い『間』から 連打まで ぜんぶ入り！", tempo: "大きく変化",
    targets: [4, 8, 12, 14, 16, 20, 21, 22, 24, 28, 30, 32, 34, 35, 36, 38], decoys: [10, 18, 26, 33],
    challenge: [4, 7.5, 10, 12, 13.5, 15, 16, 19, 20, 21, 22, 23, 24, 27, 28, 29.5, 31, 32, 34, 35, 36, 37, 38]
  },
  {
    id: 13, title: "ネコの大リズムショー", icon: "🎭", scene: "finale", mood: "グランドフィナーレ",
    bpm: 116, duration: 49, colors: ["#ff5f91", "#4a50cb"], root: 220,
    rule: "全ステージの合図が大集合！ 劇場のみんなと最後まで楽しもう！", tempo: "ぜんぶ入り",
    targets: [4, 6, 8, 12, 14, 16, 20, 21.5, 24, 28, 30, 32, 34, 36, 38, 40, 41, 42, 44, 46], decoys: [10, 18, 26, 35, 43],
    challenge: [4, 5.5, 7, 8, 11, 12, 13.5, 15, 16, 19, 20, 21.5, 23, 24, 27, 28, 29.5, 31, 32, 33.5, 35, 36, 37, 38, 40, 41, 42, 44, 45, 46]
  }
];

const DIALOGUE = [
  {
    speaker: "Dr.やまねこ", who: "doctor", file: "voice/intro_01_dr.wav",
    text: "ようこそ！ ネコの合図でポン、ふしぎなリズム劇場へ。合図をよく聞いて、画面をポンとタッチしてね。"
  },
  {
    speaker: "ゆきちゃん", who: "yuki", file: "voice/intro_02_yuki.wav",
    text: "いっぱい押せばいいの？"
  },
  {
    speaker: "Dr.やまねこ", who: "doctor", file: "voice/intro_03_dr.wav",
    text: "じつは、押さない間もリズムなんだ。お手本を見てから挑戦しよう。"
  },
  {
    speaker: "ゆきちゃん", who: "yuki", file: "voice/intro_04_yuki.wav",
    text: "えーっ！ よく聞いて、やってみよう！"
  }
];

function defaultSave() {
  return { cleared: {}, best: {}, album: {}, assist: true, sound: true, introSeen: false };
}

function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    return Object.assign(defaultSave(), raw || {});
  } catch (_) {
    return defaultSave();
  }
}

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {}
}

let save = loadSave();
let selectedStageIndex = 0;
let selectedChallenge = false;
let previewRaf = 0;
let dialogIndex = 0;
let currentVoice = null;

let AC = null;
let masterGain = null;
let bgmGain = null;
let fxGain = null;
let noiseBuffer = null;
let activeNodes = [];

let gameRunning = false;
let demoMode = false;
let paused = false;
let gameStart = 0;
let currentStage = null;
let currentTargets = [];
let currentDecoys = [];
let beatDuration = 0.5;
let endAtBeat = 0;
let gameRaf = 0;
let stats = null;
let lastAction = { at: -99, judge: "", scene: "rain" };
let particles = [];
let pauseByVisibility = false;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("screen--active", screen.id === id);
  });
  if (id !== "screenStage") cancelAnimationFrame(previewRaf);
  window.scrollTo(0, 0);
}

function ensureAudio() {
  if (!AC) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    AC = new Ctor();
    masterGain = AC.createGain();
    bgmGain = AC.createGain();
    fxGain = AC.createGain();
    bgmGain.gain.value = 0.42;
    fxGain.gain.value = 0.72;
    bgmGain.connect(masterGain);
    fxGain.connect(masterGain);
    masterGain.connect(AC.destination);
    const frames = Math.max(1, Math.floor(AC.sampleRate * 0.35));
    noiseBuffer = AC.createBuffer(1, frames, AC.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (AC.state === "suspended") AC.resume().catch(() => {});
  masterGain.gain.setTargetAtTime(save.sound ? 0.9 : 0.0001, AC.currentTime, 0.015);
  return AC;
}

function rememberNode(node) {
  activeNodes.push(node);
  return node;
}

function tone(when, frequency, duration = 0.12, type = "sine", volume = 0.12, destination = fxGain) {
  if (!AC || !destination) return null;
  const osc = rememberNode(AC.createOscillator());
  const gain = AC.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(35, frequency), when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain).connect(destination);
  osc.start(when);
  osc.stop(when + duration + 0.03);
  return osc;
}

function sweep(when, from, to, duration, volume = 0.12, type = "sine", destination = fxGain) {
  if (!AC || !destination) return;
  const osc = rememberNode(AC.createOscillator());
  const gain = AC.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(35, to), when + duration);
  gain.gain.setValueAtTime(volume, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain).connect(destination);
  osc.start(when);
  osc.stop(when + duration + 0.03);
}

function noise(when, duration = 0.08, volume = 0.06, highpass = 1200, destination = fxGain) {
  if (!AC || !noiseBuffer || !destination) return;
  const src = rememberNode(AC.createBufferSource());
  const filter = AC.createBiquadFilter();
  const gain = AC.createGain();
  src.buffer = noiseBuffer;
  filter.type = "highpass";
  filter.frequency.value = highpass;
  gain.gain.setValueAtTime(volume, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  src.connect(filter).connect(gain).connect(destination);
  src.start(when);
  src.stop(when + duration + 0.02);
}

function kick(when, volume = 0.09) {
  sweep(when, 125, 48, 0.13, volume, "sine", bgmGain);
}

function snare(when, volume = 0.035) {
  noise(when, 0.09, volume, 900, bgmGain);
  tone(when, 180, 0.07, "triangle", volume * 0.6, bgmGain);
}

function hat(when, volume = 0.018) {
  noise(when, 0.035, volume, 4300, bgmGain);
}

function stopGameAudio() {
  for (const node of activeNodes) {
    try { node.stop(); } catch (_) {}
    try { node.disconnect(); } catch (_) {}
  }
  activeNodes = [];
}

function playUiSound() {
  const ac = ensureAudio();
  if (!ac) return;
  tone(ac.currentTime, 540, 0.07, "triangle", 0.08);
  tone(ac.currentTime + 0.055, 720, 0.08, "triangle", 0.06);
}

function hitSound(judge) {
  if (!AC) return;
  const t = AC.currentTime;
  if (judge === "perfect") {
    tone(t, 880, 0.12, "triangle", 0.13);
    tone(t + 0.045, 1320, 0.16, "sine", 0.1);
    noise(t, 0.045, 0.035, 3800);
  } else if (judge === "good") {
    tone(t, 660, 0.12, "triangle", 0.1);
    tone(t + 0.04, 880, 0.11, "sine", 0.065);
  } else {
    sweep(t, 210, 120, 0.16, 0.08, "sawtooth");
  }
}

function scheduleStageMusic(stage, start, targets, decoys) {
  if (!AC) return;
  const dur = 60 / stage.bpm;
  const scale = [1, 1.12246, 1.25992, 1.49831, 1.68179];
  const calm = ["rain", "lullaby", "stars"].includes(resolveScene(stage, 0));
  const cool = ["ninja", "dj", "thunder"].includes(resolveScene(stage, 0));

  for (let b = 0; b <= stage.duration; b++) {
    const at = start + b * dur;
    if (b % 2 === 0) kick(at, calm ? 0.045 : 0.075);
    if (b % 4 === 2) snare(at, calm ? 0.018 : 0.034);
    hat(at, calm ? 0.008 : 0.014);
    if ((selectedChallenge || cool) && b < stage.duration) hat(at + dur * 0.5, 0.008);
    if (b % 4 === 0) {
      const note = scale[(Math.floor(b / 4) + stage.id) % scale.length];
      tone(at, stage.root * note, dur * 1.7, calm ? "sine" : "triangle", calm ? 0.032 : 0.042, bgmGain);
      tone(at, stage.root * 0.5, dur * 1.2, "sine", 0.038, bgmGain);
    }
  }

  targets.forEach((target, i) => {
    const at = start + target.beat * dur;
    const cueBase = stage.root * (i % 2 ? 2 : 1.5);
    if (at - dur > AC.currentTime) tone(at - dur, cueBase, 0.07, "sine", 0.036, fxGain);
    if (at - dur * 0.5 > AC.currentTime) tone(at - dur * 0.5, cueBase * 1.12246, 0.07, "sine", 0.042, fxGain);
    tone(at, cueBase * 1.49831, 0.045, "triangle", 0.035, fxGain);
  });

  decoys.forEach((decoy) => {
    const at = start + decoy.beat * dur;
    tone(at - dur * 0.55, stage.root * 0.88, 0.08, "square", 0.025, fxGain);
    sweep(at, stage.root * 0.9, stage.root * 0.65, 0.1, 0.026, "triangle", fxGain);
  });

  for (let i = 3; i >= 1; i--) {
    const at = start - i * 0.72;
    tone(at, i === 1 ? 880 : 560, 0.09, "square", 0.07, fxGain);
  }
}

function toggleSound() {
  save.sound = !save.sound;
  persist();
  if (AC && masterGain) masterGain.gain.setTargetAtTime(save.sound ? 0.9 : 0.0001, AC.currentTime, 0.02);
  if (currentVoice) currentVoice.muted = !save.sound;
  updateSoundButtons();
  if (save.sound) playUiSound();
}

function updateSoundButtons() {
  document.querySelectorAll(".js-sound").forEach((button) => {
    button.textContent = save.sound ? "🔊" : "🔇";
    button.setAttribute("aria-label", save.sound ? "音をオフにする" : "音をオンにする");
  });
}

function stopVoice() {
  if (!currentVoice) return;
  currentVoice.pause();
  currentVoice.currentTime = 0;
  currentVoice = null;
}

function playVoice(file, onEnded) {
  stopVoice();
  if (!save.sound) {
    if (onEnded) setTimeout(onEnded, 900);
    return;
  }
  const audio = new Audio(file);
  audio.preload = "auto";
  audio.volume = 0.95;
  audio.addEventListener("ended", () => {
    if (currentVoice === audio) currentVoice = null;
    if (onEnded) onEnded();
  }, { once: true });
  audio.addEventListener("error", () => {
    if (currentVoice === audio) currentVoice = null;
    if (onEnded) onEnded();
  }, { once: true });
  currentVoice = audio;
  audio.play().catch(() => {
    if (currentVoice === audio) currentVoice = null;
    if (onEnded) onEnded();
  });
}

function beginDialogue() {
  dialogIndex = 0;
  $("dialogOverlay").hidden = false;
  showDialogueLine();
}

function showDialogueLine() {
  const line = DIALOGUE[dialogIndex];
  $("dialogSpeaker").textContent = line.speaker;
  $("dialogText").textContent = line.text;
  $("dialogPortrait").className = `dialog-portrait dialog-portrait--${line.who}`;
  $("btnDialogNext").textContent = dialogIndex === DIALOGUE.length - 1 ? "劇場へ！ ▶" : "つぎへ ▶";
  playVoice(line.file);
}

function finishDialogue() {
  stopVoice();
  $("dialogOverlay").hidden = true;
  save.introSeen = true;
  persist();
  renderMap();
  showScreen("screenMap");
}

function renderMap() {
  const grid = $("stageGrid");
  grid.innerHTML = "";
  const cleared = STAGES.filter((stage) => save.cleared[stage.id]).length;
  $("clearedCount").textContent = cleared;
  $("mapProgress").style.width = `${(cleared / STAGES.length) * 100}%`;
  updateAssistButtons();

  STAGES.forEach((stage, index) => {
    const unlocked = index === 0 || !!save.cleared[STAGES[index - 1].id];
    const best = save.best[stage.id] || 0;
    const button = document.createElement("button");
    button.className = `stage-card${unlocked ? "" : " stage-card--locked"}${best ? " stage-card--cleared" : ""}${stage.scene.startsWith("remix") || stage.scene === "finale" ? " stage-card--remix" : ""}`;
    button.style.setProperty("--stage-a", stage.colors[0]);
    button.style.setProperty("--stage-b", stage.colors[1]);
    button.disabled = !unlocked;
    button.setAttribute("aria-label", unlocked ? `ステージ${stage.id} ${stage.title}` : `ステージ${stage.id} ロック中`);
    button.innerHTML = `
      <span class="stage-card-number">${String(stage.id).padStart(2, "0")}</span>
      <span class="stage-card-score">${best ? "🐾".repeat(best) : ""}</span>
      <span class="stage-card-icon">${unlocked ? stage.icon : "🔒"}</span>
      <span class="stage-card-copy"><b>${stage.title}</b><small>${stage.mood}</small></span>
      ${unlocked ? "" : '<span class="stage-card-lock">🔒</span>'}`;
    if (unlocked) button.addEventListener("click", () => openStage(index));
    grid.appendChild(button);
  });
}

function updateAssistButtons() {
  const map = $("btnAssistMap");
  map.setAttribute("aria-pressed", String(save.assist));
  map.textContent = save.assist ? "✨ おたすけ ON" : "おたすけ OFF";
  const stage = $("btnAssistStage");
  stage.setAttribute("aria-pressed", String(save.assist && !selectedChallenge));
  stage.classList.toggle("mode-button--selected", save.assist && !selectedChallenge);
}

function openStage(index) {
  selectedStageIndex = index;
  selectedChallenge = false;
  const stage = STAGES[index];
  $("stageNumber").textContent = `STAGE ${stage.id}`;
  $("stageIcon").textContent = stage.icon;
  $("stageTitle").textContent = stage.title;
  $("stageRule").textContent = stage.rule;
  $("stageTempo").textContent = stage.tempo;
  $("moodBadge").textContent = stage.mood;
  const challenge = $("btnChallenge");
  const canChallenge = !!save.cleared[stage.id];
  challenge.disabled = !canChallenge;
  challenge.querySelector("small").textContent = canChallenge ? "合図が細かく、判定も本格的" : "クリアすると遊べます";
  challenge.classList.remove("mode-button--selected");
  challenge.setAttribute("aria-pressed", "false");
  updateAssistButtons();
  showScreen("screenStage");
  startPreviewLoop();
  playUiSound();
}

function startPreviewLoop() {
  cancelAnimationFrame(previewRaf);
  const canvas = $("previewCanvas");
  const ctx = canvas.getContext("2d");
  const stage = STAGES[selectedStageIndex];
  const start = performance.now();
  const frame = (now) => {
    const beat = ((now - start) / 1000) * stage.bpm / 60;
    const cue = (Math.sin(beat * Math.PI) + 1) * 0.5;
    drawScene(ctx, stage, beat, cue, false, { preview: true, assist: save.assist });
    previewRaf = requestAnimationFrame(frame);
  };
  previewRaf = requestAnimationFrame(frame);
}

function setAssist(value) {
  save.assist = value;
  selectedChallenge = false;
  persist();
  updateAssistButtons();
  $("btnChallenge").classList.remove("mode-button--selected");
  $("btnChallenge").setAttribute("aria-pressed", "false");
  playUiSound();
}

function setChallenge() {
  if (!save.cleared[STAGES[selectedStageIndex].id]) return;
  selectedChallenge = true;
  save.assist = false;
  persist();
  $("btnChallenge").classList.add("mode-button--selected");
  $("btnChallenge").setAttribute("aria-pressed", "true");
  updateAssistButtons();
  playUiSound();
}

function buildChart(stage) {
  const source = selectedChallenge ? stage.challenge : stage.targets;
  const targetLimit = demoMode ? Math.min(4, source.length) : source.length;
  const targets = source.slice(0, targetLimit).map((beat, index) => ({ beat, index, judged: false, result: "" }));
  const last = targets.length ? targets[targets.length - 1].beat : 12;
  const decoys = stage.decoys.filter((beat) => !demoMode || beat < last).map((beat) => ({ beat, tripped: false }));
  return { targets, decoys, end: demoMode ? last + 2.5 : stage.duration };
}

async function startGame(asDemo) {
  cancelAnimationFrame(previewRaf);
  stopVoice();
  stopGameAudio();
  ensureAudio();
  if (!AC) return;
  if (AC.state === "suspended") await AC.resume().catch(() => {});
  demoMode = asDemo;
  currentStage = STAGES[selectedStageIndex];
  const chart = buildChart(currentStage);
  currentTargets = chart.targets;
  currentDecoys = chart.decoys;
  endAtBeat = chart.end;
  beatDuration = 60 / currentStage.bpm;
  stats = { perfect: 0, good: 0, miss: 0, combo: 0, maxCombo: 0, score: 0, extra: 0 };
  particles = [];
  lastAction = { at: -99, judge: "", scene: resolveScene(currentStage, 0) };
  gameStart = AC.currentTime + 2.6;
  gameRunning = true;
  paused = false;
  pauseByVisibility = false;
  scheduleStageMusic(currentStage, gameStart, currentTargets, currentDecoys);
  updatePlayHud();
  $("countdown").textContent = "3";
  $("judgeText").className = "judge-text";
  $("tapHint").textContent = demoMode ? "Dr.やまねこの おてほん" : "画面のどこでも ポン！";
  $("pausePanel").hidden = true;
  showScreen("screenPlay");
  $("gameCanvas").focus({ preventScroll: true });
  cancelAnimationFrame(gameRaf);
  gameRaf = requestAnimationFrame(gameLoop);
}

function updatePlayHud() {
  $("hudStage").textContent = `${demoMode ? "おてほん・" : ""}STAGE ${currentStage.id}${selectedChallenge ? " CHALLENGE" : ""}`;
  $("hudTitle").textContent = currentStage.title;
  $("hudPaws").textContent = `🐾 ${stats ? stats.score : 0}`;
  $("hudCombo").textContent = `${stats ? stats.combo : 0} コンボ`;
}

function judgeWindows() {
  if (selectedChallenge) return { perfect: 0.085, good: 0.17 };
  if (save.assist) return { perfect: 0.145, good: 0.30 };
  return { perfect: 0.105, good: 0.21 };
}

function onGameTap(event) {
  if (event) event.preventDefault();
  if (!gameRunning || paused || demoMode || !AC) return;
  const time = AC.currentTime - gameStart;
  if (time < -0.05) return;
  const windows = judgeWindows();
  let nearest = null;
  let nearestDelta = Infinity;
  for (const target of currentTargets) {
    if (target.judged) continue;
    const delta = Math.abs(time - target.beat * beatDuration);
    if (delta < nearestDelta) {
      nearest = target;
      nearestDelta = delta;
    }
  }

  if (nearest && nearestDelta <= windows.good) {
    const result = nearestDelta <= windows.perfect ? "perfect" : "good";
    nearest.judged = true;
    nearest.result = result;
    stats[result]++;
    stats.combo++;
    stats.maxCombo = Math.max(stats.maxCombo, stats.combo);
    stats.score += result === "perfect" ? 100 : 60;
    triggerAction(result, time);
    showJudge(result === "perfect" ? "ぴったり！" : "おしい！", result);
    hitSound(result);
    updatePlayHud();
    return;
  }

  const decoy = currentDecoys.find((item) => !item.tripped && Math.abs(time - item.beat * beatDuration) <= windows.good * 1.15);
  if (decoy) decoy.tripped = true;
  stats.combo = 0;
  stats.extra++;
  showJudge(decoy ? "フェイント！" : "まだだよ", "miss");
  hitSound("miss");
  updatePlayHud();
}

function triggerAction(judge, time) {
  const beat = time / beatDuration;
  const scene = resolveScene(currentStage, beat);
  lastAction = { at: AC.currentTime, judge, scene };
  const focus = sceneFocus(scene);
  const colors = judge === "perfect" ? ["#ffd85a", "#ffffff", "#65e4ef"] : ["#65e4ef", "#ffffff", "#ff9ac1"];
  for (let i = 0; i < (judge === "perfect" ? 22 : 13); i++) {
    const angle = Math.random() * TAU;
    const speed = 90 + Math.random() * 220;
    particles.push({
      x: focus.x, y: focus.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60,
      born: performance.now(), life: 520 + Math.random() * 300, color: colors[i % colors.length], size: 3 + Math.random() * 7
    });
  }
  const wrap = $("canvasWrap");
  if (wrap.animate) wrap.animate([{ transform: "scale(1)" }, { transform: "scale(1.012)" }, { transform: "scale(1)" }], { duration: 180 });
}

function showJudge(text, kind) {
  const node = $("judgeText");
  node.textContent = text;
  node.className = `judge-text judge-text--${kind}`;
  void node.offsetWidth;
  node.classList.add("judge-text--show");
  $("srStatus").textContent = text;
}

function gameLoop() {
  if (!gameRunning || !AC) return;
  if (paused) return;
  const time = AC.currentTime - gameStart;
  const beat = time / beatDuration;
  const windows = judgeWindows();

  if (time < 0) {
    const count = Math.max(1, Math.min(3, Math.ceil(-time / 0.72)));
    $("countdown").textContent = count;
  } else if (time < 0.45) {
    $("countdown").textContent = "ポン！";
  } else {
    $("countdown").textContent = "";
  }

  if (demoMode && time >= 0) {
    for (const target of currentTargets) {
      if (!target.judged && time >= target.beat * beatDuration) {
        target.judged = true;
        target.result = "perfect";
        triggerAction("perfect", time);
        showJudge("ポン！", "perfect");
        hitSound("perfect");
      }
    }
  } else if (time >= 0) {
    for (const target of currentTargets) {
      if (!target.judged && time - target.beat * beatDuration > windows.good) {
        target.judged = true;
        target.result = "miss";
        stats.miss++;
        stats.combo = 0;
        lastAction = { at: AC.currentTime, judge: "miss", scene: resolveScene(currentStage, beat) };
        showJudge("もういちど", "miss");
        hitSound("miss");
        updatePlayHud();
      }
    }
  }

  const ctx = $("gameCanvas").getContext("2d");
  const cue = cueState(time);
  drawScene(ctx, currentStage, Math.max(0, beat), cue.amount, cue.decoy, {
    assist: save.assist && !selectedChallenge,
    recent: AC.currentTime - lastAction.at < 0.45,
    judge: lastAction.judge,
    preview: false
  });
  drawParticles(ctx);

  const progress = Math.max(0, Math.min(1, beat / endAtBeat));
  $("playProgress").style.width = `${progress * 100}%`;

  if (beat >= endAtBeat) {
    finishStage();
    return;
  }
  gameRaf = requestAnimationFrame(gameLoop);
}

function cueState(time) {
  if (time < 0) return { amount: 0, decoy: false };
  let amount = 0;
  for (const target of currentTargets) {
    if (target.judged) continue;
    const until = target.beat * beatDuration - time;
    if (until >= 0 && until <= beatDuration * 1.35) amount = Math.max(amount, 1 - until / (beatDuration * 1.35));
  }
  let decoyAmount = 0;
  for (const decoy of currentDecoys) {
    const until = decoy.beat * beatDuration - time;
    if (until >= 0 && until <= beatDuration * 1.05) decoyAmount = Math.max(decoyAmount, 1 - until / (beatDuration * 1.05));
  }
  return decoyAmount > amount ? { amount: decoyAmount, decoy: true } : { amount, decoy: false };
}

function drawParticles(ctx) {
  const now = performance.now();
  particles = particles.filter((p) => now - p.born < p.life);
  for (const p of particles) {
    const t = (now - p.born) / 1000;
    const alpha = Math.max(0, 1 - (now - p.born) / p.life);
    const x = p.x + p.vx * t;
    const y = p.y + p.vy * t + 230 * t * t;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.translate(x, y);
    ctx.rotate(t * 5);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * TAU / 5;
      const b = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
      ctx.lineTo(Math.cos(b) * p.size * .45, Math.sin(b) * p.size * .45);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function pauseGame(fromVisibility = false) {
  if (!gameRunning || paused) return;
  paused = true;
  pauseByVisibility = fromVisibility;
  $("pausePanel").hidden = false;
  if (AC && AC.state === "running") AC.suspend().catch(() => {});
}

async function resumeGame() {
  if (!gameRunning || !paused) return;
  await ensureAudio()?.resume().catch(() => {});
  paused = false;
  pauseByVisibility = false;
  $("pausePanel").hidden = true;
  cancelAnimationFrame(gameRaf);
  gameRaf = requestAnimationFrame(gameLoop);
}

function quitGame() {
  gameRunning = false;
  paused = false;
  cancelAnimationFrame(gameRaf);
  if (AC && AC.state === "suspended") AC.resume().catch(() => {});
  stopGameAudio();
  $("pausePanel").hidden = true;
  renderMap();
  showScreen("screenMap");
}

function finishStage() {
  gameRunning = false;
  cancelAnimationFrame(gameRaf);
  stopGameAudio();
  if (demoMode) {
    demoMode = false;
    $("srStatus").textContent = "お手本がおわりました。こんどはきみの番です。";
    showScreen("screenStage");
    startPreviewLoop();
    return;
  }

  const total = currentTargets.length || 1;
  const weighted = (stats.perfect + stats.good * 0.72) / total;
  const paws = weighted >= 0.82 ? 3 : weighted >= 0.58 ? 2 : 1;
  save.cleared[currentStage.id] = true;
  save.best[currentStage.id] = Math.max(save.best[currentStage.id] || 0, paws);
  save.album[currentStage.id] = true;
  persist();

  $("resultTitle").textContent = paws === 3 ? "すごい！ ぴったりリズム！" : paws === 2 ? "いいリズム！" : "最後まで できたね！";
  $("resultPaws").textContent = "🐾".repeat(paws) + "○".repeat(3 - paws);
  $("resultMessage").textContent = paws === 3 ? "音も『間』も、ばっちり聞けたね！" : paws === 2 ? "もう一回で、もっと気持ちよく合いそう！" : "最後まで参加できたことが、いちばんすごい！";
  $("resultPerfect").textContent = stats.perfect;
  $("resultGood").textContent = stats.good;
  $("resultMiss").textContent = stats.miss;
  $("resultCombo").textContent = stats.maxCombo;
  $("photoTitle").textContent = currentStage.title;
  const photoCtx = $("photoCanvas").getContext("2d");
  drawScene(photoCtx, currentStage, 12, 1, false, { preview: true, assist: false, recent: true, judge: "perfect" });
  $("btnNext").textContent = currentStage.id === STAGES.length ? "ステージ一覧へ ▶" : "つぎへ ▶";
  showScreen("screenResult");
  playVoice(paws >= 2 ? "voice/result_01_dr.wav" : "voice/result_02_yuki.wav");
}

function resolveScene(stage, beat) {
  if (stage.scene === "remixA") return ["rain", "sneeze", "ninja"][Math.min(2, Math.floor(beat / 12))];
  if (stage.scene === "remixB") return ["lullaby", "pudding", "dj"][Math.min(2, Math.floor(beat / 13))];
  if (stage.scene === "remixC") return ["stars", "dojo", "thunder"][Math.min(2, Math.floor(beat / 13))];
  if (stage.scene === "finale") {
    const scenes = ["rain", "sneeze", "ninja", "lullaby", "pudding", "dj", "stars", "dojo", "thunder"];
    return scenes[Math.floor(beat / 5) % scenes.length];
  }
  return stage.scene;
}

function sceneFocus(scene) {
  const focus = {
    rain: { x: 650, y: 290 }, sneeze: { x: 610, y: 290 }, ninja: { x: 650, y: 275 },
    lullaby: { x: 620, y: 310 }, pudding: { x: 620, y: 310 }, dj: { x: 610, y: 330 },
    stars: { x: 690, y: 210 }, dojo: { x: 660, y: 300 }, thunder: { x: 640, y: 300 }
  };
  return focus[scene] || { x: 610, y: 290 };
}

function drawScene(ctx, stage, beat, cue, decoy, options = {}) {
  const scene = resolveScene(stage, beat);
  ctx.save();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const scaleX = ctx.canvas.width / 960;
  const scaleY = ctx.canvas.height / 540;
  ctx.scale(scaleX, scaleY);

  switch (scene) {
    case "rain": drawRain(ctx, beat, cue, decoy, options); break;
    case "sneeze": drawSneeze(ctx, beat, cue, decoy, options); break;
    case "ninja": drawNinja(ctx, beat, cue, decoy, options); break;
    case "lullaby": drawLullaby(ctx, beat, cue, decoy, options); break;
    case "pudding": drawPudding(ctx, beat, cue, decoy, options); break;
    case "dj": drawDj(ctx, beat, cue, decoy, options); break;
    case "stars": drawStars(ctx, beat, cue, decoy, options); break;
    case "dojo": drawDojo(ctx, beat, cue, decoy, options); break;
    case "thunder": drawThunder(ctx, beat, cue, decoy, options); break;
    default: drawFinale(ctx, beat, cue, decoy, options);
  }

  if (options.assist && cue > .15) drawAssistRing(ctx, sceneFocus(scene), cue, decoy);
  if (options.recent) drawActionFlash(ctx, sceneFocus(scene), options.judge || "perfect");
  if (stage.scene.startsWith("remix") || stage.scene === "finale") drawRemixRibbon(ctx, stage, scene);
  ctx.restore();
}

function verticalGradient(ctx, top, bottom) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 540);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  return gradient;
}

function rr(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCat(ctx, x, y, size, fur = "#f3a044", pose = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  const line = pose.line || "#382a42";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = line;
  ctx.lineWidth = 4;

  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, 44, 37, 45, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-37, -20); ctx.lineTo(-31, -62); ctx.lineTo(-7, -40);
  ctx.lineTo(10, -40); ctx.lineTo(34, -63); ctx.lineTo(38, -20);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -10, 43, 39, 0, 0, TAU);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = "#ffb3bd";
  ctx.beginPath(); ctx.moveTo(-31, -31); ctx.lineTo(-28, -53); ctx.lineTo(-15, -39); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(16, -39); ctx.lineTo(30, -54); ctx.lineTo(33, -31); ctx.closePath(); ctx.fill();

  ctx.strokeStyle = line;
  ctx.lineWidth = 4;
  if (pose.happy) {
    ctx.beginPath(); ctx.arc(-16, -11, 8, Math.PI + .2, TAU - .2); ctx.stroke();
    ctx.beginPath(); ctx.arc(16, -11, 8, Math.PI + .2, TAU - .2); ctx.stroke();
  } else if (pose.sleep) {
    ctx.beginPath(); ctx.moveTo(-25, -10); ctx.quadraticCurveTo(-16, -3, -7, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -10); ctx.quadraticCurveTo(16, -3, 25, -10); ctx.stroke();
  } else {
    ctx.fillStyle = line;
    ctx.beginPath(); ctx.ellipse(-16, -10, 5, 8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16, -10, 5, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-14, -13, 1.8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(18, -13, 1.8, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = "#e66e82";
  ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(5, 2); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = line; ctx.lineWidth = 2.8;
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.quadraticCurveTo(-7, 15, -13, 10); ctx.moveTo(0, 8); ctx.quadraticCurveTo(7, 15, 13, 10); ctx.stroke();

  const arm = pose.arm || 0;
  ctx.strokeStyle = line; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.moveTo(-28, 35); ctx.quadraticCurveTo(-48, 42 - arm * 16, -50, 67 - arm * 25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28, 35); ctx.quadraticCurveTo(48, 42 - arm * 12, 50, 67 - arm * 28); ctx.stroke();
  ctx.strokeStyle = fur; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(-28, 35); ctx.quadraticCurveTo(-48, 42 - arm * 16, -50, 67 - arm * 25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28, 35); ctx.quadraticCurveTo(48, 42 - arm * 12, 50, 67 - arm * 28); ctx.stroke();

  ctx.strokeStyle = line; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(33, 60); ctx.quadraticCurveTo(72, 52, 67, 20); ctx.stroke();
  ctx.strokeStyle = fur; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(33, 60); ctx.quadraticCurveTo(72, 52, 67, 20); ctx.stroke();
  ctx.restore();
}

function drawRain(ctx, beat, cue, decoy, opt) {
  ctx.fillStyle = verticalGradient(ctx, "#70b5df", "#36558d"); ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(0, 365, 960, 175);
  ctx.fillStyle = "#f4e1be"; ctx.fillRect(72, 66, 520, 364);
  ctx.fillStyle = "#335d8c"; ctx.fillRect(92, 86, 480, 318);
  ctx.strokeStyle = "#f4e1be"; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(332, 86); ctx.lineTo(332, 404); ctx.moveTo(92, 245); ctx.lineTo(572, 245); ctx.stroke();
  ctx.strokeStyle = "rgba(190,235,255,.7)"; ctx.lineWidth = 3;
  for (let i = 0; i < 35; i++) {
    const x = 100 + ((i * 77 + beat * 26) % 470);
    const y = 90 + ((i * 43 + beat * 55) % 300);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 19); ctx.stroke();
  }
  const bob = Math.sin(beat * Math.PI) * 4;
  drawCat(ctx, 735, 330 + bob, 155, "#f1a34c", { happy: opt.recent, arm: opt.recent ? 1 : cue * .3 });
  ctx.fillStyle = "#9a5b32"; rr(ctx, 650, 392, 170, 31, 12); ctx.fill();
  ctx.fillStyle = "#fff5db"; rr(ctx, 706, 355, 60, 48, 12); ctx.fill();
  ctx.strokeStyle = "#fff5db"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(766, 377, 18, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  const f = sceneFocus("rain");
  ctx.save(); ctx.translate(f.x, f.y - 70 * (1 - cue));
  ctx.fillStyle = decoy ? "#9d8ed0" : "#dff8ff";
  ctx.beginPath(); ctx.moveTo(0, -28); ctx.quadraticCurveTo(-22, 3, -19, 18); ctx.arc(0, 16, 19, Math.PI, 0); ctx.quadraticCurveTo(22, 2, 0, -28); ctx.fill();
  if (cue > .55) drawStar(ctx, 0, 8, 16 + cue * 7, decoy ? "#c4b7e7" : "#fff4a8");
  ctx.restore();
}

function drawSneeze(ctx, beat, cue, decoy, opt) {
  ctx.fillStyle = verticalGradient(ctx, "#ffb885", "#d05a78"); ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = "#ffe7c4"; ctx.fillRect(0, 340, 960, 200);
  ctx.fillStyle = "#704565"; rr(ctx, 70, 130, 330, 270, 25); ctx.fill();
  ctx.fillStyle = "#f9d7c9"; rr(ctx, 90, 170, 290, 205, 22); ctx.fill();
  ctx.fillStyle = "#8d78c6"; rr(ctx, 100, 276, 270, 106, 18); ctx.fill();
  const wobble = cue ? Math.sin(beat * 8) * cue * 8 : 0;
  ctx.save(); ctx.translate(wobble, 0);
  drawCat(ctx, 610, 304, 170, "#f3a14d", { sleep: !opt.recent, happy: opt.recent, arm: opt.recent ? 1 : 0 });
  ctx.restore();
  ctx.fillStyle = "#f8fbff"; rr(ctx, 710, 345, 130, 82, 14); ctx.fill();
  ctx.fillStyle = "#6dcbd3"; rr(ctx, 710, 382, 130, 45, 12); ctx.fill();
  ctx.save(); ctx.translate(760, 351 - cue * 65); ctx.rotate(Math.sin(beat * 5) * .08);
  ctx.fillStyle = decoy ? "#dccfe8" : "#fff"; ctx.beginPath(); ctx.moveTo(-30, 24); ctx.quadraticCurveTo(-20, -32, 0, -17); ctx.quadraticCurveTo(22, -36, 31, 24); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.fillStyle = decoy ? "#7c668e" : "#fff"; ctx.font = "900 30px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(decoy ? "ムニャ…" : cue > .45 ? "ムズムズ…" : "Z z z", 610, 115);
}

function drawNinja(ctx, beat, cue, decoy, opt) {
  ctx.fillStyle = verticalGradient(ctx, "#191a52", "#483879"); ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = "#fff0b6"; ctx.beginPath(); ctx.arc(760, 108, 71, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(35,29,80,.35)"; ctx.beginPath(); ctx.arc(785, 89, 62, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(13,14,48,.56)";
  for (let i = 0; i < 14; i++) {
    const h = 70 + (i * 41) % 150; ctx.fillRect(i * 75 - 20, 320 - h, 58, h);
  }
  ctx.fillStyle = "#171632"; ctx.beginPath(); ctx.moveTo(0, 395); ctx.lineTo(260, 270); ctx.lineTo(510, 395); ctx.lineTo(710, 285); ctx.lineTo(960, 405); ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.closePath(); ctx.fill();
  const leap = cue * 35 + (opt.recent ? 44 : 0);
  ctx.save(); ctx.translate(620, 365 - leap); ctx.rotate((cue - .5) * .12); drawCat(ctx, 0, 0, 150, "#4b445d", { happy: opt.recent, arm: cue }); ctx.restore();
  ctx.fillStyle = "#d24a68"; ctx.beginPath(); ctx.moveTo(570, 292 - leap); ctx.lineTo(653, 310 - leap); ctx.lineTo(611, 330 - leap); ctx.closePath(); ctx.fill();
  const f = sceneFocus("ninja");
  ctx.strokeStyle = decoy ? "#b18ccf" : "#ecf9ff"; ctx.lineWidth = 7; ctx.globalAlpha = .25 + cue * .75;
  ctx.beginPath(); ctx.moveTo(f.x - 95 * cue, f.y + 76); ctx.lineTo(f.x + 86 * cue, f.y - 76); ctx.stroke();
  drawStar(ctx, f.x + 82 * cue, f.y - 76, 10 + cue * 22, decoy ? "#b99ad5" : "#fff1a8");
  ctx.globalAlpha = 1;
}

function drawLullaby(ctx, beat, cue, decoy, opt) {
  ctx.fillStyle = verticalGradient(ctx, "#7189c7", "#4f477e"); ctx.fillRect(0, 0, 960, 540);
  for (let i = 0; i < 28; i++) drawStar(ctx, 30 + (i * 109) % 900, 25 + (i * 61) % 240, 3 + (i % 3), "rgba(255,244,175,.7)");
  ctx.fillStyle = "#f2d9a7"; rr(ctx, 155, 270, 650, 180, 32); ctx.fill();
  ctx.fillStyle = "#cba86d"; rr(ctx, 180, 305, 600, 128, 25); ctx.fill();
  ctx.fillStyle = "#e9f1ff"; rr(ctx, 210, 315, 540, 101, 30); ctx.fill();
  drawCat(ctx, 610, 320 + Math.sin(beat * Math.PI) * 3, 130, "#faf8f2", { sleep: !opt.recent, happy: opt.recent });
  drawCat(ctx, 355, 326, 116, "#f1a34c", { happy: true, arm: cue * .5 });
  ctx.fillStyle = "rgba(255,255,255,.88)"; rr(ctx, 245, 118, 250, 96, 28); ctx.fill();
  ctx.fillStyle = "#544c82"; ctx.font = "900 26px sans-serif"; ctx.textAlign = "center"; ctx.fillText(decoy ? "ニャ…？" : cue > .45 ? "ニャ・ニャ ♪" : "おてほんを きこう", 370, 175);
  drawMusicNote(ctx, 580, 155 - cue * 35, 24, "#ffe36e");
  drawMusicNote(ctx, 650, 125 - cue * 50, 19, "#86edf4");
}

function drawPudding(ctx, beat, cue, decoy, opt) {
  ctx.fillStyle = verticalGradient(ctx, "#ffd077", "#ed796c"); ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = "#ffeac5"; ctx.fillRect(0, 345, 960, 195);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? "#ff9c88" : "#fff3d0"; ctx.fillRect(i * 120, 0, 120, 86);
  }
  drawCat(ctx, 420, 330, 158, "#f1a04a", { happy: opt.recent, arm: cue });
  const wobble = Math.sin(beat * 8) * cue * .12;
  ctx.save(); ctx.translate(640, 350); ctx.rotate(decoy ? wobble * .4 : wobble);
  ctx.fillStyle = "#d8e4e8"; ctx.beginPath(); ctx.ellipse(0, 55, 125, 24, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#f5c84f"; ctx.beginPath(); ctx.moveTo(-57, 48); ctx.quadraticCurveTo(-47, -35, 0, -46); ctx.quadraticCurveTo(47, -35, 57, 48); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#8f4a28"; ctx.beginPath(); ctx.ellipse(0, -34, 48, 15, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-18, 2, 6, 0, TAU); ctx.arc(18, 2, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = "#6f422e"; ctx.beginPath(); ctx.arc(-18, 3, 3, 0, TAU); ctx.arc(18, 3, 3, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(80,43,54,.72)"; ctx.font = "900 31px sans-serif"; ctx.textAlign = "center"; ctx.fillText(decoy ? "だいじょうぶ…" : cue > .45 ? "おっと！" : "ぐら ぐら…", 640, 144);
}

function drawDj(ctx, beat, cue, decoy, opt) {
  ctx.fillStyle = verticalGradient(ctx, "#331064", "#082c58"); ctx.fillRect(0, 0, 960, 540);
  const pulse = .55 + .45 * Math.sin(beat * Math.PI);
  ctx.globalAlpha = .16 + pulse * .2;
  ctx.fillStyle = "#ff4db8"; ctx.beginPath(); ctx.moveTo(120, 0); ctx.lineTo(360, 540); ctx.lineTo(460, 540); ctx.lineTo(250, 0); ctx.fill();
  ctx.fillStyle = "#45e5ef"; ctx.beginPath(); ctx.moveTo(820, 0); ctx.lineTo(600, 540); ctx.lineTo(510, 540); ctx.lineTo(710, 0); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#1b1441"; rr(ctx, 115, 330, 730, 144, 24); ctx.fill();
  ctx.fillStyle = "#392677"; rr(ctx, 150, 353, 290, 92, 18); ctx.fill(); rr(ctx, 520, 353, 290, 92, 18); ctx.fill();
  drawDisc(ctx, 295, 397, 76, cue, decoy ? "#9882bd" : "#ff55b2");
  drawDisc(ctx, 665, 397, 76, cue, decoy ? "#9882bd" : "#54e6f0");
  drawCat(ctx, 480, 275 - cue * 9, 145, "#f0a04b", { happy: opt.recent, arm: cue });
  ctx.strokeStyle = "#65e4ef"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(480, 200 - cue * 9, 55, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = "#ff5f91"; rr(ctx, 417, 187 - cue * 9, 23, 49, 10); ctx.fill(); rr(ctx, 520, 187 - cue * 9, 23, 49, 10); ctx.fill();
  for (let i = 0; i < 11; i++) {
    const h = 18 + ((i * 19 + beat * 16) % 74); ctx.fillStyle = i % 2 ? "#ff5f91" : "#65e4ef"; ctx.fillRect(150 + i * 61, 305 - h, 24, h);
  }
}

function drawStars(ctx, beat, cue, decoy, opt) {
  ctx.fillStyle = verticalGradient(ctx, "#182858", "#38487f"); ctx.fillRect(0, 0, 960, 540);
  for (let i = 0; i < 45; i++) {
    const twinkle = .35 + .65 * Math.abs(Math.sin(beat * .35 + i));
    drawStar(ctx, 18 + (i * 83) % 930, 18 + (i * 47) % 310, 2 + twinkle * 3, `rgba(255,244,181,${twinkle})`);
  }
  ctx.fillStyle = "#23375e"; ctx.beginPath(); ctx.moveTo(0, 430); ctx.quadraticCurveTo(250, 300, 490, 410); ctx.quadraticCurveTo(720, 285, 960, 410); ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.closePath(); ctx.fill();
  drawCat(ctx, 360, 390, 137, "#faf8f0", { happy: opt.recent, arm: cue * .4 });
  ctx.save(); ctx.translate(550, 336); ctx.rotate(-.45); ctx.fillStyle = "#9edee5"; rr(ctx, -10, -85, 65, 170, 18); ctx.fill(); ctx.fillStyle = "#dff8ff"; ctx.beginPath(); ctx.arc(22, -77, 42, 0, TAU); ctx.fill(); ctx.restore();
  const f = sceneFocus("stars");
  ctx.strokeStyle = decoy ? "#a490c9" : "#fff0a6"; ctx.lineWidth = 5; ctx.globalAlpha = .35 + cue * .65;
  ctx.beginPath(); ctx.moveTo(f.x + 190 - cue * 250, f.y - 150 + cue * 110); ctx.lineTo(f.x + 78 - cue * 100, f.y - 100 + cue * 80); ctx.stroke();
  drawStar(ctx, f.x + 70 - cue * 85, f.y - 80 + cue * 62, 12 + cue * 23, decoy ? "#aa98c9" : "#fff2a6");
  ctx.globalAlpha = 1;
}

function drawDojo(ctx, beat, cue, decoy, opt) {
  ctx.fillStyle = "#f2dfbf"; ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = "#8e4939"; ctx.fillRect(0, 0, 960, 70); ctx.fillRect(0, 430, 960, 110);
  ctx.strokeStyle = "rgba(116,70,55,.25)"; ctx.lineWidth = 3;
  for (let x = 0; x < 960; x += 120) { ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x, 430); ctx.stroke(); }
  ctx.fillStyle = "#fff9ea"; rr(ctx, 90, 102, 230, 235, 12); ctx.fill();
  ctx.fillStyle = "#44324b"; ctx.font = "900 46px serif"; ctx.textAlign = "center"; ctx.fillText("一 撃", 205, 225);
  drawCat(ctx, 405, 350, 150, "#f1a04a", { happy: opt.recent, arm: cue });
  ctx.save(); ctx.translate(680, 300); ctx.rotate(Math.sin(beat * 3) * cue * .15);
  ctx.strokeStyle = "#4b2f38"; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, -200); ctx.lineTo(0, -112); ctx.stroke();
  ctx.fillStyle = decoy ? "#b5a0c0" : "#d64c57"; rr(ctx, -48, -120, 96, 195, 44); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-17, -60, 8, 0, TAU); ctx.arc(17, -60, 8, 0, TAU); ctx.fill();
  ctx.fillStyle = "#3d2d38"; ctx.beginPath(); ctx.arc(-17, -60, 4, 0, TAU); ctx.arc(17, -60, 4, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#593c48"; ctx.font = "900 31px sans-serif"; ctx.fillText(decoy ? "せーの…イモ！" : cue > .45 ? "せーの、ニャ！" : "かまえて！", 690, 130);
}

function drawThunder(ctx, beat, cue, decoy, opt) {
  const flash = opt.recent ? .22 : 0;
  ctx.fillStyle = verticalGradient(ctx, `rgba(69,93,169,${1 - flash})`, "#262652"); ctx.fillRect(0, 0, 960, 540);
  drawCloud(ctx, 100, 95, 1.25, "#2b315d"); drawCloud(ctx, 540, 65, 1.45, "#343866");
  const f = sceneFocus("thunder");
  ctx.strokeStyle = decoy ? "#9a88bf" : "#fff06b"; ctx.lineWidth = 13; ctx.lineJoin = "miter"; ctx.globalAlpha = .16 + cue * .84;
  ctx.beginPath(); ctx.moveTo(f.x + 10, 75); ctx.lineTo(f.x - 28, 170); ctx.lineTo(f.x + 8, 165); ctx.lineTo(f.x - 45, 278); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = "#3a315f"; ctx.fillRect(0, 400, 960, 140);
  drawCat(ctx, 390, 345, 162, "#f0a04a", { happy: opt.recent, arm: cue });
  ctx.fillStyle = "#8f493c"; ctx.beginPath(); ctx.ellipse(650, 355, 132, 120, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#f8dfad"; ctx.lineWidth = 18; ctx.beginPath(); ctx.ellipse(650, 355, 119, 107, 0, 0, TAU); ctx.stroke();
  ctx.fillStyle = "#ffe9b7"; ctx.beginPath(); ctx.ellipse(650, 355, 93, 82, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#9c4e3e"; ctx.beginPath(); ctx.arc(650, 355, 13 + cue * 8, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(500 + cue * 110, 245 - cue * 35); ctx.rotate(-.7); ctx.fillStyle = "#e5bd77"; rr(ctx, -12, -80, 24, 180, 12); ctx.fill(); ctx.restore();
}

function drawFinale(ctx, beat, cue, decoy, opt) {
  ctx.fillStyle = verticalGradient(ctx, "#4c2b87", "#17113e"); ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = "#b62154"; ctx.fillRect(0, 0, 120, 540); ctx.fillRect(840, 0, 120, 540);
  ctx.fillStyle = "#e74d75"; for (let y = 0; y < 540; y += 55) { ctx.fillRect(12, y, 88, 24); ctx.fillRect(860, y + 22, 88, 24); }
  ctx.fillStyle = "#5b355d"; ctx.fillRect(90, 420, 780, 120);
  for (let i = 0; i < 8; i++) drawCat(ctx, 170 + i * 90, 430 - (i % 2) * 15, 73, ["#f1a04a", "#faf8ef", "#6f657f"][i % 3], { happy: true, arm: cue });
  drawStar(ctx, 480, 150, 70 + cue * 20, decoy ? "#a78dbc" : "#ffd85a");
  ctx.fillStyle = "#fff"; ctx.font = "1000 44px sans-serif"; ctx.textAlign = "center"; ctx.fillText("みんなで ポン！", 480, 260);
}

function drawAssistRing(ctx, focus, cue, decoy) {
  ctx.save();
  ctx.globalAlpha = .25 + cue * .65;
  ctx.strokeStyle = decoy ? "#b49bc9" : "#fff4a8";
  ctx.lineWidth = 8;
  ctx.setLineDash([18, 12]);
  ctx.beginPath(); ctx.arc(focus.x, focus.y, 70 - cue * 24, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = decoy ? "#b49bc9" : "#fff";
  ctx.font = "900 24px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(decoy ? "よく聞いて…" : "もうすぐ！", focus.x, focus.y - 82);
  ctx.restore();
}

function drawActionFlash(ctx, focus, judge) {
  ctx.save();
  ctx.globalAlpha = .42;
  const gradient = ctx.createRadialGradient(focus.x, focus.y, 10, focus.x, focus.y, 150);
  gradient.addColorStop(0, judge === "perfect" ? "#fff6a6" : "#b7f6ff");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(focus.x, focus.y, 150, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawRemixRibbon(ctx, stage, scene) {
  ctx.save();
  ctx.fillStyle = "rgba(17,12,51,.68)"; rr(ctx, 22, 20, 250, 40, 15); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "900 16px sans-serif"; ctx.textAlign = "left";
  const labels = { rain: "☔ 雨つぶ", sneeze: "🤧 くしゃみ", ninja: "🥷 ニンジャ", lullaby: "🌙 子守歌", pudding: "🍮 プリン", dj: "🎧 DJ", stars: "🔭 星", dojo: "🥊 道場", thunder: "⚡ 雷" };
  ctx.fillText(`${stage.icon} リミックス　${labels[scene] || "フィナーレ"}`, 39, 46);
  ctx.restore();
}

function drawStar(ctx, x, y, radius, color) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 ? radius * .42 : radius;
    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawMusicNote(ctx, x, y, size, color) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = size * .18;
  ctx.beginPath(); ctx.ellipse(0, size * .55, size * .45, size * .32, -.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(size * .32, size * .45); ctx.lineTo(size * .32, -size); ctx.lineTo(size, -size * .72); ctx.stroke(); ctx.restore();
}

function drawDisc(ctx, x, y, radius, cue, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(cue * .5); ctx.fillStyle = "#111023"; ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, radius * .65, 0, TAU); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 14 + cue * 7, 0, TAU); ctx.fill(); ctx.restore();
}

function drawCloud(ctx, x, y, scale, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = color; ctx.beginPath();
  ctx.arc(38, 36, 32, 0, TAU); ctx.arc(78, 23, 42, 0, TAU); ctx.arc(123, 38, 34, 0, TAU); ctx.rect(38, 35, 86, 40); ctx.fill(); ctx.restore();
}

function renderAlbum() {
  const grid = $("albumGrid");
  grid.innerHTML = "";
  STAGES.forEach((stage) => {
    const unlocked = !!save.album[stage.id];
    const card = document.createElement("div");
    card.className = `album-item${unlocked ? "" : " album-item--locked"}`;
    card.style.setProperty("--stage-a", stage.colors[0]);
    card.style.setProperty("--stage-b", stage.colors[1]);
    card.innerHTML = `<span>${unlocked ? stage.icon : "?"}</span><b>${unlocked ? stage.title : `STAGE ${stage.id}`}</b>`;
    grid.appendChild(card);
  });
}

function openModal(id) {
  if (id === "albumModal") renderAlbum();
  $(id).hidden = false;
  playUiSound();
}

function closeModal(node) {
  const modal = node.closest(".modal");
  if (modal) modal.hidden = true;
  playUiSound();
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      try { await screen.orientation?.lock?.("landscape"); } catch (_) {}
    } else {
      await document.exitFullscreen?.();
    }
  } catch (_) {}
}

function bindEvents() {
  $("btnStart").addEventListener("click", () => {
    ensureAudio();
    playUiSound();
    if (save.introSeen) {
      renderMap();
      showScreen("screenMap");
    } else {
      beginDialogue();
    }
  });
  $("btnDialogNext").addEventListener("click", () => {
    stopVoice();
    dialogIndex++;
    if (dialogIndex >= DIALOGUE.length) finishDialogue(); else showDialogueLine();
  });
  $("btnSkipDialog").addEventListener("click", finishDialogue);
  $("btnHome").addEventListener("click", () => { playUiSound(); showScreen("screenTitle"); });
  $("btnStageBack").addEventListener("click", () => { playUiSound(); renderMap(); showScreen("screenMap"); });
  $("btnAlbum").addEventListener("click", () => openModal("albumModal"));
  $("btnAssistMap").addEventListener("click", () => setAssist(!save.assist));
  $("btnAssistStage").addEventListener("click", () => setAssist(true));
  $("btnChallenge").addEventListener("click", setChallenge);
  $("btnDemo").addEventListener("click", () => startGame(true));
  $("btnPlay").addEventListener("click", () => startGame(false));
  $("gameCanvas").addEventListener("pointerdown", onGameTap, { passive: false });
  $("btnPause").addEventListener("click", () => pauseGame(false));
  $("btnResume").addEventListener("click", resumeGame);
  $("btnRetryFromPause").addEventListener("click", () => { paused = false; if (AC?.state === "suspended") AC.resume().catch(() => {}); startGame(demoMode); });
  $("btnQuit").addEventListener("click", quitGame);
  $("btnRetry").addEventListener("click", () => { stopVoice(); startGame(false); });
  $("btnResultMap").addEventListener("click", () => { stopVoice(); renderMap(); showScreen("screenMap"); });
  $("btnNext").addEventListener("click", () => {
    stopVoice();
    if (currentStage.id >= STAGES.length) { renderMap(); showScreen("screenMap"); return; }
    openStage(currentStage.id);
  });
  document.querySelectorAll(".js-sound").forEach((button) => button.addEventListener("click", toggleSound));
  document.querySelectorAll(".js-fullscreen").forEach((button) => button.addEventListener("click", toggleFullscreen));
  document.querySelectorAll("[data-open-modal]").forEach((button) => button.addEventListener("click", () => openModal(button.dataset.openModal)));
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => closeModal(button)));
  document.querySelectorAll(".modal").forEach((modal) => modal.addEventListener("pointerdown", (event) => { if (event.target === modal) modal.hidden = true; }));
  document.addEventListener("keydown", (event) => {
    if ((event.code === "Space" || event.code === "Enter") && gameRunning && !paused) {
      event.preventDefault(); onGameTap();
    }
    if (event.code === "Escape" && gameRunning && !paused) pauseGame(false);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && gameRunning && !paused) pauseGame(true);
  });
}

updateSoundButtons();
bindEvents();
renderMap();
