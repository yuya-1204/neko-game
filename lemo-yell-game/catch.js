(() => {
  "use strict";

  const canvas = document.getElementById("catchCanvas");
  const ctx = canvas.getContext("2d");
  const refs = {
    setup: document.getElementById("catchSetup"),
    game: document.getElementById("catchGame"),
    difficulty: document.getElementById("catchDifficulty"),
    start: document.getElementById("startCatch"),
    score: document.getElementById("catchScore"),
    time: document.getElementById("catchTime"),
    best: document.getElementById("catchBest"),
    left: document.getElementById("moveLeft"),
    right: document.getElementById("moveRight"),
    pause: document.getElementById("pauseCatch"),
    quit: document.getElementById("quitCatch"),
    sound: document.getElementById("catchSoundButton"),
    result: document.getElementById("catchResult"),
    resultTitle: document.getElementById("resultTitle"),
    resultText: document.getElementById("resultText"),
    resultScore: document.getElementById("resultScore"),
    retry: document.getElementById("retryCatch"),
    home: document.getElementById("catchHome"),
    lemoSprite: document.getElementById("lemoSprite"),
    lemomySprite: document.getElementById("lemomySprite")
  };

  const SETTINGS = {
    easy: { spawnMs: 820, minSpeed: 145, maxSpeed: 240, cloudChance: 0.08, label: "やさしい" },
    normal: { spawnMs: 650, minSpeed: 195, maxSpeed: 315, cloudChance: 0.13, label: "ふつう" },
    challenge: { spawnMs: 480, minSpeed: 260, maxSpeed: 405, cloudChance: 0.18, label: "チャレンジ" }
  };

  const TYPES = [
    { id: "lemon", emoji: "🍋", score: 10, chance: 0.58, size: 50 },
    { id: "heart", emoji: "💗", score: 20, chance: 0.25, size: 52 },
    { id: "star", emoji: "⭐", score: 30, chance: 0.17, size: 54 }
  ];

  let selectedCharacter = "lemo";
  let soundEnabled = true;
  let audioContext = null;
  let animationFrame = null;
  let state = createState();
  let lastTimestamp = 0;
  let spawnAccumulator = 0;
  let dragActive = false;

  function createState() {
    return {
      running: false,
      paused: false,
      score: 0,
      remaining: 60,
      difficulty: "easy",
      elapsed: 0,
      player: { x: 306, y: 735, width: 108, height: 120, speed: 450 },
      items: [],
      keys: { left: false, right: false },
      flash: 0,
      message: "",
      messageTime: 0,
      particles: []
    };
  }

  function beep(frequency = 620, duration = 0.12) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.11, audioContext.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration + 0.02);
    } catch {
      // Sound is optional.
    }
  }

  function randomType() {
    const roll = Math.random();
    let cumulative = 0;
    for (const type of TYPES) {
      cumulative += type.chance;
      if (roll <= cumulative) return type;
    }
    return TYPES[0];
  }

  function spawnItem() {
    const settings = SETTINGS[state.difficulty];
    const isCloud = Math.random() < settings.cloudChance;
    const type = isCloud
      ? { id: "cloud", emoji: "☁️", score: -5, size: 58 }
      : randomType();
    state.items.push({
      ...type,
      x: 25 + Math.random() * (canvas.width - 80),
      y: -70,
      speed: settings.minSpeed + Math.random() * (settings.maxSpeed - settings.minSpeed),
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.6
    });
  }

  function startGame() {
    cancelAnimationFrame(animationFrame);
    state = createState();
    state.running = true;
    state.difficulty = refs.difficulty.value;
    refs.setup.hidden = true;
    refs.game.hidden = false;
    refs.pause.textContent = "Ⅱ";
    updateHud();
    lastTimestamp = performance.now();
    spawnAccumulator = 0;
    animationFrame = requestAnimationFrame(loop);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishGame() {
    state.running = false;
    cancelAnimationFrame(animationFrame);
    const key = `lemo-catch-best-${state.difficulty}`;
    const oldBest = Number(localStorage.getItem(key) || 0);
    const isBest = state.score > oldBest;
    if (isBest) localStorage.setItem(key, String(state.score));
    refs.resultScore.textContent = `${state.score}点`;
    refs.resultTitle.textContent = isBest ? "ベストスコア！" : state.score >= 500 ? "すごい！" : "よくできました！";
    refs.resultText.textContent = state.score >= 500
      ? "たくさんのレモンとエールを届けられたね！"
      : "何度でも挑戦して、少しずつ上手になろう。";
    refs.result.showModal();
    beep(780, 0.3);
  }

  function quitGame() {
    state.running = false;
    cancelAnimationFrame(animationFrame);
    refs.game.hidden = true;
    refs.setup.hidden = false;
    refs.result.close?.();
  }

  function loop(timestamp) {
    if (!state.running) return;
    const delta = Math.min(0.04, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;
    if (!state.paused) {
      update(delta);
      draw();
    } else {
      draw();
      drawPause();
    }
    animationFrame = requestAnimationFrame(loop);
  }

  function update(delta) {
    state.elapsed += delta;
    state.remaining = Math.max(0, 60 - state.elapsed);
    if (state.remaining <= 0) {
      updateHud();
      finishGame();
      return;
    }

    const direction = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
    state.player.x += direction * state.player.speed * delta;
    state.player.x = Math.max(0, Math.min(canvas.width - state.player.width, state.player.x));

    spawnAccumulator += delta * 1000;
    const spawnMs = SETTINGS[state.difficulty].spawnMs;
    if (spawnAccumulator >= spawnMs) {
      spawnAccumulator = 0;
      spawnItem();
    }

    state.items.forEach((item) => {
      item.y += item.speed * delta;
      item.rotation += item.spin * delta;
    });

    const playerHitbox = {
      left: state.player.x + 10,
      right: state.player.x + state.player.width - 10,
      top: state.player.y + 12,
      bottom: state.player.y + state.player.height
    };

    state.items = state.items.filter((item) => {
      const itemCenterX = item.x + item.size / 2;
      const itemBottom = item.y + item.size;
      const hit = itemCenterX >= playerHitbox.left
        && itemCenterX <= playerHitbox.right
        && itemBottom >= playerHitbox.top
        && item.y <= playerHitbox.bottom;
      if (hit) {
        state.score = Math.max(0, state.score + item.score);
        state.message = item.id === "cloud" ? "ふわっ！ -5" : `+${item.score}`;
        state.messageTime = 0.7;
        state.flash = item.id === "cloud" ? 0.25 : 0;
        addParticles(itemCenterX, item.y, item.id === "cloud" ? "#e6eef2" : "#ffd93d");
        beep(item.id === "cloud" ? 180 : item.id === "star" ? 880 : 650);
        return false;
      }
      return item.y < canvas.height + 80;
    });

    state.messageTime = Math.max(0, state.messageTime - delta);
    state.flash = Math.max(0, state.flash - delta);
    state.particles.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 150 * delta;
      particle.life -= delta;
    });
    state.particles = state.particles.filter((particle) => particle.life > 0);
    updateHud();
  }

  function addParticles(x, y, color) {
    for (let i = 0; i < 10; i += 1) {
      state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 240,
        vy: -80 - Math.random() * 180,
        life: 0.6 + Math.random() * 0.25,
        color
      });
    }
  }

  function draw() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#86dcff");
    gradient.addColorStop(0.68, "#eafaff");
    gradient.addColorStop(0.69, "#c5ed8f");
    gradient.addColorStop(1, "#7fcf58");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawScenery();
    state.items.forEach(drawItem);
    drawPlayer();
    drawParticles();

    if (state.messageTime > 0) {
      ctx.save();
      ctx.fillStyle = state.message.includes("-") ? "#8c4f5c" : "#d64a72";
      ctx.font = "900 42px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(state.message, canvas.width / 2, 130);
      ctx.restore();
    }
    if (state.flash > 0) {
      ctx.fillStyle = "rgba(255,255,255,.38)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawScenery() {
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#fff";
    for (const cloud of [[90, 110, 65], [520, 180, 48], [340, 80, 35]]) {
      ctx.beginPath();
      ctx.arc(cloud[0], cloud[1], cloud[2] * 0.6, 0, Math.PI * 2);
      ctx.arc(cloud[0] + cloud[2] * 0.55, cloud[1] + 5, cloud[2] * 0.45, 0, Math.PI * 2);
      ctx.arc(cloud[0] - cloud[2] * 0.5, cloud[1] + 8, cloud[2] * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#f4cd37";
    ctx.beginPath();
    ctx.arc(620, 90, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawItem(item) {
    ctx.save();
    ctx.translate(item.x + item.size / 2, item.y + item.size / 2);
    ctx.rotate(item.rotation);
    ctx.font = `${item.size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.emoji, 0, 0);
    ctx.restore();
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawPlayer() {
    const { x, y, width, height } = state.player;
    const image = selectedCharacter === "lemo" ? refs.lemoSprite : refs.lemomySprite;
    ctx.save();
    ctx.shadowColor = "rgba(41,46,18,.25)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    roundedRect(x, y, width, height, 28);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.clip();
    const imageRatio = image.naturalWidth / image.naturalHeight || 1;
    const frameRatio = width / height;
    let sx = 0;
    let sy = 0;
    let sw = image.naturalWidth;
    let sh = image.naturalHeight;
    if (imageRatio > frameRatio) {
      sw = image.naturalHeight * frameRatio;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / frameRatio;
      sy = Math.max(0, (image.naturalHeight - sh) * 0.25);
    }
    if (image.complete && image.naturalWidth) {
      ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
    } else {
      ctx.fillStyle = "#ffd93d";
      ctx.fillRect(x, y, width, height);
      ctx.font = "64px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("🍋", x + width / 2, y + height / 2 + 20);
    }
    ctx.restore();

    ctx.save();
    roundedRect(x, y, width, height, 28);
    ctx.lineWidth = 7;
    ctx.strokeStyle = selectedCharacter === "lemo" ? "#6ba626" : "#ff6f9f";
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawPause() {
    ctx.save();
    ctx.fillStyle = "rgba(31,43,50,.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "900 52px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("ひとやすみ", canvas.width / 2, canvas.height / 2);
    ctx.font = "700 27px system-ui";
    ctx.fillText("Ⅱボタンでもどるよ", canvas.width / 2, canvas.height / 2 + 55);
    ctx.restore();
  }

  function updateHud() {
    refs.score.textContent = String(state.score);
    refs.time.textContent = String(Math.ceil(state.remaining));
    refs.best.textContent = String(Number(localStorage.getItem(`lemo-catch-best-${state.difficulty}`) || 0));
  }

  function setMove(direction, active) {
    state.keys[direction] = active;
  }

  function movePlayerToPointer(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    state.player.x = Math.max(0, Math.min(canvas.width - state.player.width, x - state.player.width / 2));
  }

  document.querySelectorAll(".character-choice-button").forEach((choice) => {
    choice.addEventListener("click", () => {
      document.querySelectorAll(".character-choice-button").forEach((button) => {
        button.classList.remove("selected");
        button.setAttribute("aria-checked", "false");
      });
      choice.classList.add("selected");
      choice.setAttribute("aria-checked", "true");
      selectedCharacter = choice.dataset.character;
      beep(600);
    });
  });

  refs.start.addEventListener("click", startGame);
  refs.retry.addEventListener("click", () => {
    refs.result.close();
    startGame();
  });
  refs.home.addEventListener("click", () => {
    refs.result.close();
    quitGame();
  });
  refs.quit.addEventListener("click", quitGame);

  refs.pause.addEventListener("click", () => {
    state.paused = !state.paused;
    refs.pause.textContent = state.paused ? "▶" : "Ⅱ";
    lastTimestamp = performance.now();
  });

  refs.sound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    refs.sound.textContent = soundEnabled ? "音 ON" : "音 OFF";
    refs.sound.setAttribute("aria-pressed", String(soundEnabled));
    if (soundEnabled) beep();
  });

  const bindHold = (element, direction) => {
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      element.setPointerCapture?.(event.pointerId);
      setMove(direction, true);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
      element.addEventListener(type, () => setMove(direction, false));
    });
  };
  bindHold(refs.left, "left");
  bindHold(refs.right, "right");

  canvas.addEventListener("pointerdown", (event) => {
    dragActive = true;
    canvas.setPointerCapture?.(event.pointerId);
    movePlayerToPointer(event.clientX);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (dragActive) movePlayerToPointer(event.clientX);
  });
  canvas.addEventListener("pointerup", () => {
    dragActive = false;
  });
  canvas.addEventListener("pointercancel", () => {
    dragActive = false;
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setMove("left", true);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setMove("right", true);
    }
    if (event.key === " " && state.running) {
      event.preventDefault();
      refs.pause.click();
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.key === "ArrowLeft") setMove("left", false);
    if (event.key === "ArrowRight") setMove("right", false);
  });

  window.addEventListener("blur", () => {
    state.keys.left = false;
    state.keys.right = false;
    if (state.running && !state.paused) {
      state.paused = true;
      refs.pause.textContent = "▶";
    }
  });

  draw();
})();
