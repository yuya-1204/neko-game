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
    { id: "lemon", score: 10, chance: 0.58, size: 50 },
    { id: "heart", score: 20, chance: 0.25, size: 52 },
    { id: "star", score: 30, chance: 0.17, size: 54 }
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
      stunRemaining: 0,
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

  function playMissSound() {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const startAt = audioContext.currentTime;
      [
        { frequency: 220, offset: 0, duration: 0.16 },
        { frequency: 145, offset: 0.13, duration: 0.25 }
      ].forEach((note) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(note.frequency, startAt + note.offset);
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(70, note.frequency * 0.68),
          startAt + note.offset + note.duration
        );
        gain.gain.setValueAtTime(0.0001, startAt + note.offset);
        gain.gain.exponentialRampToValueAtTime(0.13, startAt + note.offset + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.offset + note.duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(startAt + note.offset);
        oscillator.stop(startAt + note.offset + note.duration + 0.02);
      });
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
      ? { id: "cloud", score: -5, size: 64 }
      : randomType();
    state.items.push({
      ...type,
      x: 25 + Math.random() * (canvas.width - 80),
      y: -70,
      speed: settings.minSpeed + Math.random() * (settings.maxSpeed - settings.minSpeed),
      rotation: isCloud ? 0 : Math.random() * Math.PI * 2,
      spin: isCloud ? 0 : (Math.random() - 0.5) * 1.6
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

    state.stunRemaining = Math.max(0, state.stunRemaining - delta);
    const direction = state.stunRemaining > 0
      ? 0
      : (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
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
      if (state.stunRemaining > 0) return item.y < canvas.height + 80;
      const hit = itemCenterX >= playerHitbox.left
        && itemCenterX <= playerHitbox.right
        && itemBottom >= playerHitbox.top
        && item.y <= playerHitbox.bottom;
      if (hit) {
        state.score = Math.max(0, state.score + item.score);
        state.message = item.id === "cloud" ? "ミス！ -5" : `+${item.score}`;
        state.messageTime = 0.7;
        state.flash = item.id === "cloud" ? 0.7 : 0;
        addParticles(itemCenterX, item.y, item.id === "cloud" ? "#ffd43b" : "#ffd93d");
        if (item.id === "cloud") {
          state.stunRemaining = 0.7;
          state.keys.left = false;
          state.keys.right = false;
          dragActive = false;
          playMissSound();
        } else {
          beep(item.id === "star" ? 880 : 650);
        }
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

    if (state.flash > 0) {
      ctx.fillStyle = state.stunRemaining > 0
        ? "rgba(31,41,55,.28)"
        : "rgba(255,255,255,.38)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (state.messageTime > 0) {
      ctx.save();
      ctx.fillStyle = state.message.includes("-") ? "#8c4f5c" : "#d64a72";
      ctx.font = "900 42px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(state.message, canvas.width / 2, 130);
      ctx.restore();
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
    ctx.scale(item.size / 60, item.size / 60);
    if (item.id === "lemon") drawLemon();
    if (item.id === "heart") drawHeart();
    if (item.id === "star") drawStar();
    if (item.id === "cloud") drawStormCloud();
    ctx.restore();
  }

  function drawLemon() {
    ctx.save();
    ctx.shadowColor = "rgba(112,78,0,.22)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#ffd43b";
    ctx.strokeStyle = "#b98700";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 5, 18, 25, -0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#65a832";
    ctx.strokeStyle = "#356d1c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(12, -23, 11, 5.5, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#4a781f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, -17);
    ctx.lineTo(8, -27);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.58)";
    ctx.beginPath();
    ctx.ellipse(-7, -3, 4, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHeart() {
    ctx.save();
    ctx.shadowColor = "rgba(123,25,66,.24)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#f55f94";
    ctx.strokeStyle = "#bd2f63";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 25);
    ctx.bezierCurveTo(-6, 18, -24, 7, -24, -8);
    ctx.bezierCurveTo(-24, -23, -5, -27, 0, -13);
    ctx.bezierCurveTo(5, -27, 24, -23, 24, -8);
    ctx.bezierCurveTo(24, 7, 6, 18, 0, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.ellipse(-10, -11, 4, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStar() {
    ctx.save();
    ctx.shadowColor = "rgba(115,76,0,.24)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#ffc928";
    ctx.strokeStyle = "#b77a00";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let index = 0; index < 10; index += 1) {
      const radius = index % 2 === 0 ? 27 : 12;
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(255,255,255,.56)";
    ctx.beginPath();
    ctx.arc(-6, -8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStormCloud() {
    ctx.save();
    ctx.shadowColor = "rgba(15,23,42,.38)";
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = "#4b5563";
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-27, 14);
    ctx.bezierCurveTo(-35, 14, -37, 4, -31, -2);
    ctx.bezierCurveTo(-27, -7, -20, -8, -15, -5);
    ctx.bezierCurveTo(-13, -18, 0, -25, 11, -18);
    ctx.bezierCurveTo(17, -14, 19, -9, 19, -5);
    ctx.bezierCurveTo(28, -8, 35, -1, 34, 7);
    ctx.bezierCurveTo(33, 13, 28, 16, 21, 16);
    ctx.lineTo(-27, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#ffd43b";
    ctx.strokeStyle = "#8a6100";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, -9);
    ctx.lineTo(-7, 6);
    ctx.lineTo(0, 6);
    ctx.lineTo(-4, 21);
    ctx.lineTo(14, 1);
    ctx.lineTo(6, 1);
    ctx.lineTo(11, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
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
    if (state.stunRemaining > 0) return;
    state.keys[direction] = active;
  }

  function movePlayerToPointer(clientX) {
    if (state.stunRemaining > 0) return;
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
    if (state.stunRemaining > 0) return;
    dragActive = true;
    canvas.setPointerCapture?.(event.pointerId);
    movePlayerToPointer(event.clientX);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (dragActive && state.stunRemaining <= 0) movePlayerToPointer(event.clientX);
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
