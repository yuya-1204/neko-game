(() => {
  "use strict";

  const STORAGE_KEY = "lemo-yell-kitchen-progress-v1";
  const GAME_DEFS = [
    { id: "lemonade", icon: "🥤", title: "レモネードスタンド", desc: "種類・数・材料を注文どおりにそろえよう", color: "#fff0a6" },
    { id: "burger", icon: "🍔", title: "ハンバーガーづくり", desc: "見本を見て、下から順番に重ねよう", color: "#ffd4a8" },
    { id: "curry", icon: "🍛", title: "カレーの具材探し", desc: "さっき使った具材を思い出そう", color: "#ffe09b" },
    { id: "bento", icon: "🍱", title: "おべんとうをつめよう", desc: "場所・種類・個数を合わせよう", color: "#ffcbd8" },
    { id: "parfait", icon: "🍨", title: "フルーツパフェを作ろう", desc: "色・数・重ねる順番を合わせよう", color: "#f3d2ff" },
    { id: "pizza", icon: "🍕", title: "ピザを分けよう", desc: "みんなに同じ数ずつ分けよう", color: "#ffd0a6" },
    { id: "breakfast", icon: "🍳", title: "朝ごはんをそろえよう", desc: "主食・おかず・飲み物を組み合わせよう", color: "#d9f2b4" },
    { id: "fridge", icon: "🧊", title: "冷蔵庫のおかたづけ", desc: "食べ物を仲間ごとに分けよう", color: "#cceeff" },
    { id: "checkout", icon: "🪙", title: "レストランのお会計", desc: "硬貨を選んで、ぴったり払おう", color: "#fff1a8" }
  ];

  const refs = {
    menuView: document.getElementById("menuView"),
    playView: document.getElementById("playView"),
    gameMenu: document.getElementById("gameMenu"),
    totalStars: document.getElementById("totalStars"),
    totalProgress: document.getElementById("totalProgress"),
    guardianControls: document.getElementById("guardianControls"),
    resetProgress: document.getElementById("resetProgress"),
    resetDialog: document.getElementById("resetDialog"),
    cancelReset: document.getElementById("cancelReset"),
    confirmReset: document.getElementById("confirmReset"),
    backToMenu: document.getElementById("backToMenu"),
    playIcon: document.getElementById("playIcon"),
    playTitle: document.getElementById("playTitle"),
    playInstruction: document.getElementById("playInstruction"),
    difficultyLabel: document.getElementById("difficultyLabel"),
    levelBadge: document.getElementById("levelBadge"),
    levelDots: document.getElementById("levelDots"),
    challengeMode: document.getElementById("challengeMode"),
    challengeHelp: document.getElementById("challengeHelp"),
    characterMessage: document.getElementById("characterMessage"),
    messageCharacter: document.getElementById("messageCharacter"),
    messageText: document.getElementById("messageText"),
    stage: document.getElementById("stage"),
    liveMessage: document.getElementById("liveMessage"),
    soundButton: document.getElementById("soundButton"),
    clearDialog: document.getElementById("clearDialog"),
    clearMessage: document.getElementById("clearMessage"),
    nextLevelButton: document.getElementById("nextLevelButton"),
    menuButton: document.getElementById("menuButton")
  };

  let progress = loadProgress();
  let currentGame = null;
  let currentLevel = 1;
  let soundEnabled = true;
  let challengeTimer = null;
  let challengeRemaining = 0;
  let audioContext = null;
  const CHALLENGE_OFF_TEXT = "チェックすると、時間制限がつくよ（オフなら時間制限なし）";

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const base = Object.fromEntries(GAME_DEFS.map((game) => [game.id, 0]));
      return { ...base, ...(saved || {}) };
    } catch {
      return Object.fromEntries(GAME_DEFS.map((game) => [game.id, 0]));
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function beep(kind = "ok") {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = kind === "ok" ? "sine" : "triangle";
      osc.frequency.value = kind === "ok" ? 660 : 220;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + 0.3);
    } catch {
      // Sound is optional; the game remains fully usable without it.
    }
  }

  function setMessage(text, kind = "hint") {
    refs.messageText.textContent = text;
    refs.liveMessage.textContent = text;
    refs.messageCharacter.src = kind === "success" ? "assets/lemo-yell.png" : "assets/lemomy.png";
    refs.messageCharacter.alt = kind === "success" ? "レモエール君" : "レモミィちゃん";
  }

  function wrong(message = "もう一度、注文を見てみよう！") {
    beep("wrong");
    setMessage(`レモミィちゃん「${message}」`, "hint");
  }

  function difficultyFor(level) {
    if (level <= 2) return "やさしい";
    if (level <= 4) return "ちょっと考える";
    if (level <= 6) return "むずかしい";
    return "チャレンジ";
  }

  function renderMenu() {
    refs.gameMenu.innerHTML = GAME_DEFS.map((game) => {
      const completed = progress[game.id] || 0;
      const bars = Array.from({ length: 7 }, (_, index) => {
        const level = index + 1;
        const klass = level <= completed ? "done" : level === completed + 1 ? "next" : "";
        return `<i class="${klass}" aria-hidden="true"></i>`;
      }).join("");
      return `
        <button class="mini-game-card" type="button" data-game="${game.id}" style="--card-color:${game.color}">
          <span class="icon" aria-hidden="true">${game.icon}</span>
          <strong>${game.title}</strong>
          <p>${game.desc}</p>
          <span class="card-progress" aria-label="7レベル中${completed}レベルクリア">${bars}</span>
        </button>`;
    }).join("");

    const total = Object.values(progress).reduce((sum, value) => sum + Math.min(7, value || 0), 0);
    refs.totalStars.textContent = `${total} / 63`;
    refs.totalProgress.style.width = `${(total / 63) * 100}%`;
    refs.guardianControls.hidden = total === 0;
  }

  function renderLevelDots() {
    const completed = progress[currentGame.id] || 0;
    const unlocked = Math.min(7, completed + 1);
    refs.levelDots.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const level = index + 1;
      const klass = level <= completed ? "done" : level === currentLevel ? "current" : "";
      return `<button type="button" class="${klass}" data-level="${level}" ${level > unlocked ? "disabled" : ""} aria-label="レベル${level}${level > unlocked ? "（まだ遊べません）" : ""}">${level}</button>`;
    }).join("");
    refs.levelBadge.textContent = `レベル ${currentLevel}`;
    refs.difficultyLabel.textContent = difficultyFor(currentLevel);
  }

  function openGame(id, requestedLevel) {
    currentGame = GAME_DEFS.find((game) => game.id === id);
    if (!currentGame) return;
    const unlocked = Math.min(7, (progress[id] || 0) + 1);
    currentLevel = Math.max(1, Math.min(requestedLevel || unlocked, unlocked));
    refs.menuView.hidden = true;
    refs.playView.hidden = false;
    refs.playIcon.textContent = currentGame.icon;
    refs.playTitle.textContent = currentGame.title;
    refs.playInstruction.textContent = currentGame.desc;
    refs.challengeMode.checked = false;
    refs.challengeHelp.textContent = CHALLENGE_OFF_TEXT;
    renderLevelDots();
    setMessage("いっしょに、ゆっくりやってみよう！", "hint");
    startCurrentGame();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToMenu() {
    stopChallengeTimer();
    refs.clearDialog.close?.();
    refs.playView.hidden = true;
    refs.menuView.hidden = false;
    currentGame = null;
    renderMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startCurrentGame() {
    stopChallengeTimer();
    renderLevelDots();
    refs.stage.innerHTML = "";
    const starters = {
      lemonade: startLemonade,
      burger: startBurger,
      curry: startCurry,
      bento: startBento,
      parfait: startParfait,
      pizza: startPizza,
      breakfast: startBreakfast,
      fridge: startFridge,
      checkout: startCheckout
    };
    starters[currentGame.id]();
    if (refs.challengeMode.checked) {
      const seconds = Math.max(18, 38 - currentLevel * 2);
      startChallengeTimer(seconds, () => {
        wrong("時間になったよ。見本をもう一度見て、ゆっくりやってみよう！");
        startCurrentGame();
      });
    }
  }

  function startChallengeTimer(seconds, onExpire) {
    challengeRemaining = seconds;
    const bar = document.createElement("div");
    bar.className = "timer-bar";
    bar.innerHTML = `<span></span>`;
    refs.stage.prepend(bar);
    const fill = bar.querySelector("span");
    refs.challengeHelp.textContent = `のこり ${challengeRemaining}秒`;
    challengeTimer = window.setInterval(() => {
      challengeRemaining -= 1;
      refs.challengeHelp.textContent = `のこり ${challengeRemaining}秒`;
      fill.style.width = `${Math.max(0, (challengeRemaining / seconds) * 100)}%`;
      if (challengeRemaining <= 0) {
        stopChallengeTimer();
        onExpire();
      }
    }, 1000);
  }

  function stopChallengeTimer() {
    if (challengeTimer) {
      clearInterval(challengeTimer);
      challengeTimer = null;
    }
    if (!refs.challengeMode.checked) {
      refs.challengeHelp.textContent = CHALLENGE_OFF_TEXT;
    }
  }

  function completeLevel(message) {
    stopChallengeTimer();
    beep("ok");
    setMessage("レモエール君「できた！ぴったりだね！」", "success");
    const previous = progress[currentGame.id] || 0;
    progress[currentGame.id] = Math.max(previous, currentLevel);
    saveProgress();
    refs.clearMessage.textContent = message;
    refs.nextLevelButton.hidden = currentLevel >= 7;
    refs.nextLevelButton.textContent = currentLevel >= 7 ? "ぜんぶクリア！" : `レベル${currentLevel + 1}へ`;
    refs.clearDialog.showModal();
  }

  function makeOrder(title, detail = "") {
    return `<div class="order-card"><strong>${title}</strong>${detail ? `<span>${detail}</span>` : ""}</div>`;
  }

  function button(label, value, extra = "") {
    return `<button class="choice-button ${extra}" type="button" data-value="${escapeHtml(value)}">${label}</button>`;
  }

  function addCheckButton(label, handler) {
    const actions = document.createElement("div");
    actions.className = "stage-actions";
    const check = document.createElement("button");
    check.type = "button";
    check.className = "primary-button";
    check.textContent = label;
    check.addEventListener("click", handler);
    actions.append(check);
    refs.stage.append(actions);
  }

  // 1. Lemonade stand
  const DRINKS = [
    { id: "juice", name: "レモネードジュース", emoji: "🥤", vessel: "いつものグラス", ingredients: ["レモン2枚", "お水1杯", "さとう1さじ"] },
    { id: "soda", name: "レモネードソーダ水", emoji: "🫧", vessel: "せの高いグラス", ingredients: ["レモン2枚", "炭酸水1杯", "氷2こ"] },
    { id: "hot", name: "ホットレモネード", emoji: "☕", vessel: "あたたかいマグカップ", ingredients: ["レモン2枚", "お湯1杯", "はちみつ1さじ"] }
  ];

  function drinkPicture(drink) {
    return `<span class="drink-picture drink-picture--${drink.id}" aria-hidden="true"><i></i></span>`;
  }

  function makeDraggableItem(buttonElement, item, dropElement, onDrop, picture = drinkPicture) {
    let dragGhost = null;
    let activePointer = null;
    let suppressClick = false;

    const moveGhost = (clientX, clientY) => {
      if (!dragGhost) return;
      dragGhost.style.left = `${clientX}px`;
      dragGhost.style.top = `${clientY}px`;
    };

    const finishDrag = (event, cancelled = false) => {
      if (activePointer !== event.pointerId) return;
      const dropRect = dropElement.getBoundingClientRect();
      const isOverTray = !cancelled
        && event.clientX >= dropRect.left
        && event.clientX <= dropRect.right
        && event.clientY >= dropRect.top
        && event.clientY <= dropRect.bottom;

      buttonElement.classList.remove("is-dragging");
      dropElement.classList.remove("is-drop-target");
      dragGhost?.remove();
      dragGhost = null;
      activePointer = null;
      window.setTimeout(() => {
        suppressClick = false;
      }, 0);

      if (isOverTray) {
        onDrop(item);
      }
    };

    buttonElement.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || activePointer !== null) return;
      event.preventDefault();
      suppressClick = true;
      activePointer = event.pointerId;
      buttonElement.setPointerCapture(event.pointerId);
      buttonElement.classList.add("is-dragging");
      dropElement.classList.add("is-drop-target");
      dragGhost = document.createElement("div");
      dragGhost.className = "item-drag-ghost";
      dragGhost.innerHTML = `${picture(item)}<strong>${item.name}</strong>`;
      document.body.append(dragGhost);
      moveGhost(event.clientX, event.clientY);
    });

    buttonElement.addEventListener("pointermove", (event) => {
      if (activePointer !== event.pointerId) return;
      event.preventDefault();
      moveGhost(event.clientX, event.clientY);
      if (event.clientY > window.innerHeight - 70) {
        window.scrollBy({ top: 18, behavior: "auto" });
      } else if (event.clientY < 70) {
        window.scrollBy({ top: -18, behavior: "auto" });
      }
      const dropRect = dropElement.getBoundingClientRect();
      dropElement.classList.toggle(
        "is-drag-over",
        event.clientX >= dropRect.left
          && event.clientX <= dropRect.right
          && event.clientY >= dropRect.top
          && event.clientY <= dropRect.bottom
      );
    });

    buttonElement.addEventListener("pointerup", (event) => {
      dropElement.classList.remove("is-drag-over");
      finishDrag(event);
    });

    buttonElement.addEventListener("pointercancel", (event) => {
      dropElement.classList.remove("is-drag-over");
      finishDrag(event, true);
    });

    buttonElement.addEventListener("click", (event) => {
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        return;
      }
      onDrop(item);
    });
  }

  function gameItemPicture(item) {
    return `<span class="game-item-picture" aria-hidden="true">${item.emoji || item.icon || "●"}</span>`;
  }

  function makeDraggableToZones(buttonElement, item, getDropZones, onDrop, onSelect, picture = gameItemPicture) {
    let dragGhost = null;
    let activePointer = null;
    let suppressClick = false;
    let pointerStart = null;
    let pointerMoved = false;

    const zones = () => typeof getDropZones === "function" ? getDropZones() : getDropZones;
    const moveGhost = (clientX, clientY) => {
      if (!dragGhost) return;
      dragGhost.style.left = `${clientX}px`;
      dragGhost.style.top = `${clientY}px`;
    };
    const zoneAt = (clientX, clientY) => zones().find((zone) => {
      const rect = zone.getBoundingClientRect();
      return clientX >= rect.left
        && clientX <= rect.right
        && clientY >= rect.top
        && clientY <= rect.bottom;
    });
    const clearDropState = () => {
      zones().forEach((zone) => zone.classList.remove("is-drop-target", "is-drag-over"));
    };

    const finishDrag = (event, cancelled = false) => {
      if (activePointer !== event.pointerId) return;
      const matchedZone = cancelled ? null : zoneAt(event.clientX, event.clientY);
      const shouldSelect = !cancelled && !matchedZone && !pointerMoved;
      buttonElement.classList.remove("is-dragging");
      clearDropState();
      dragGhost?.remove();
      dragGhost = null;
      activePointer = null;
      pointerStart = null;
      window.setTimeout(() => {
        suppressClick = false;
      }, 0);
      if (matchedZone) onDrop(item, matchedZone);
      else if (shouldSelect) onSelect?.(item, buttonElement);
    };

    buttonElement.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || activePointer !== null) return;
      event.preventDefault();
      suppressClick = true;
      activePointer = event.pointerId;
      pointerStart = { x: event.clientX, y: event.clientY };
      pointerMoved = false;
      buttonElement.setPointerCapture(event.pointerId);
      buttonElement.classList.add("is-dragging");
      zones().forEach((zone) => zone.classList.add("is-drop-target"));
      dragGhost = document.createElement("div");
      dragGhost.className = "item-drag-ghost";
      dragGhost.innerHTML = `${picture(item)}<strong>${item.name}</strong>`;
      document.body.append(dragGhost);
      moveGhost(event.clientX, event.clientY);
    });

    buttonElement.addEventListener("pointermove", (event) => {
      if (activePointer !== event.pointerId) return;
      event.preventDefault();
      if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 8) {
        pointerMoved = true;
      }
      moveGhost(event.clientX, event.clientY);
      if (event.clientY > window.innerHeight - 70) {
        window.scrollBy({ top: 18, behavior: "auto" });
      } else if (event.clientY < 70) {
        window.scrollBy({ top: -18, behavior: "auto" });
      }
      const matchedZone = zoneAt(event.clientX, event.clientY);
      zones().forEach((zone) => zone.classList.toggle("is-drag-over", zone === matchedZone));
    });

    buttonElement.addEventListener("pointerup", (event) => finishDrag(event));
    buttonElement.addEventListener("pointercancel", (event) => finishDrag(event, true));
    buttonElement.addEventListener("click", (event) => {
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        return;
      }
      onSelect?.(item, buttonElement);
    });
  }

  function createCustomerTray(title = "② お客さんのトレイにのせよう", speech = "おねがいします♪") {
    const customerArea = document.createElement("section");
    customerArea.className = "customer-tray-area";
    const titleId = `tray-title-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    customerArea.setAttribute("aria-labelledby", titleId);
    customerArea.innerHTML = `
      <h3 id="${titleId}">${title}</h3>
      <div class="customer-picture">
        <img src="assets/lemomy.png" alt="トレイを持って待っているレモミィちゃん">
        <span>${speech}</span>
      </div>`;
    const tray = document.createElement("div");
    tray.className = "serving-tray";
    tray.setAttribute("role", "group");
    tray.setAttribute("aria-label", "お客さんのトレイ。まだ飲み物はありません");
    const trayItems = document.createElement("div");
    trayItems.className = "serving-tray__items";
    tray.append(trayItems);
    customerArea.append(tray);
    return { customerArea, tray, trayItems };
  }

  function renderCustomerTray(tray, trayItems, drinks, onRemove) {
    trayItems.innerHTML = "";
    tray.classList.toggle("is-empty", drinks.length === 0);
    tray.setAttribute(
      "aria-label",
      drinks.length
        ? `お客さんのトレイ。飲み物が${drinks.length}杯あります`
        : "お客さんのトレイ。まだ飲み物はありません"
    );

    if (!drinks.length) {
      trayItems.innerHTML = '<p class="tray-empty-message">ここに運んでね</p>';
      return;
    }

    drinks.forEach((drink, index) => {
      const trayDrink = document.createElement("button");
      trayDrink.type = "button";
      trayDrink.className = "tray-drink";
      trayDrink.setAttribute("aria-label", `${drink.name}をトレイから戻す`);
      trayDrink.innerHTML = `${drinkPicture(drink)}<span>${drink.name}</span>`;
      trayDrink.addEventListener("click", () => onRemove(drink, index));
      trayItems.append(trayDrink);
    });
  }

  function startLemonade() {
    if (currentLevel <= 3) {
      startDrinkOrder();
    } else {
      startDrinkRecipe();
    }
  }

  function startDrinkOrder() {
    const numberOfTypes = currentLevel === 3 ? 2 : 1;
    const maxCount = currentLevel === 1 ? 1 : currentLevel === 2 ? 3 : 4;
    const targets = shuffle(DRINKS).slice(0, numberOfTypes).map((drink) => ({
      ...drink,
      count: currentLevel === 1 ? 1 : 1 + Math.floor(Math.random() * maxCount)
    }));
    const placedDrinks = [];
    const orderText = targets.map((item) => `${item.name}を${item.count}杯`).join("、");
    refs.stage.innerHTML = makeOrder(`${orderText} ください`);

    const instructions = document.createElement("p");
    instructions.className = "drag-instruction";
    instructions.innerHTML = "<strong>飲み物をつかんで、トレイまで運ぼう！</strong><span>指やマウスで動かせます。まちがえた飲み物は、トレイの上でタッチすると戻せるよ。</span>";
    refs.stage.append(instructions);

    const serviceScene = document.createElement("div");
    serviceScene.className = "drink-service-scene";

    const shelf = document.createElement("section");
    shelf.className = "drink-shelf";
    shelf.setAttribute("aria-labelledby", "drinkShelfTitle");
    shelf.innerHTML = '<h3 id="drinkShelfTitle">① 飲み物をえらぼう</h3>';
    const drinkSources = document.createElement("div");
    drinkSources.className = "drink-sources";

    const { customerArea, tray, trayItems } = createCustomerTray();

    const renderTray = () => {
      renderCustomerTray(tray, trayItems, placedDrinks, (drink, index) => {
          placedDrinks.splice(index, 1);
          renderTray();
          setMessage(`${drink.name}をトレイから戻したよ。`, "hint");
      });
    };

    DRINKS.forEach((drink) => {
      const drinkButton = document.createElement("button");
      drinkButton.type = "button";
      drinkButton.className = "draggable-drink";
      drinkButton.setAttribute("aria-label", `${drink.name}をトレイへ運ぶ`);
      drinkButton.innerHTML = `${drinkPicture(drink)}<strong>${drink.name}</strong><span>つかんで運ぶ</span>`;
      makeDraggableItem(drinkButton, drink, tray, (droppedDrink) => {
        if (placedDrinks.length >= 10) {
          wrong("トレイがいっぱいだよ。いらない飲み物をタッチして戻そう！");
          return;
        }
        placedDrinks.push(droppedDrink);
        renderTray();
        beep("ok");
        setMessage(`${droppedDrink.name}をトレイにのせたよ。注文どおりなら「OK！」を押そう。`, "hint");
      });
      drinkSources.append(drinkButton);
    });
    shelf.append(drinkSources);
    customerArea.append(tray);
    serviceScene.append(shelf, customerArea);
    refs.stage.append(serviceScene);
    renderTray();

    addCheckButton("OK！ 注文をわたす", () => {
      const correct = DRINKS.every((drink) => {
        const target = targets.find((item) => item.id === drink.id)?.count || 0;
        return placedDrinks.filter((placed) => placed.id === drink.id).length === target;
      });
      if (correct) {
        completeLevel("お客さんの注文どおりに、飲み物をそろえられました。");
      } else {
        tray.classList.remove("needs-check");
        void tray.offsetWidth;
        tray.classList.add("needs-check");
        wrong("トレイの飲み物の種類と数を、注文カードとくらべてみよう！");
      }
    });
  }

  const INGREDIENT_ICONS = {
    "レモン2枚": "🍋",
    "お水1杯": "💧",
    "さとう1さじ": "🥄",
    "炭酸水1杯": "🫧",
    "氷2こ": "🧊",
    "お湯1杯": "♨️",
    "はちみつ1さじ": "🍯"
  };

  function recipeItemPicture(item) {
    return `<span class="recipe-item-picture recipe-item-picture--${item.type}" aria-hidden="true">${item.icon}</span>`;
  }

  function startDrinkRecipe() {
    const drink = randomItem(DRINKS);
    const memorySeconds = currentLevel >= 6 ? (currentLevel === 6 ? 6 : 4) : null;
    const rounds = currentLevel === 7 ? 2 : 1;
    let round = 1;

    const runRound = () => {
      const targetDrink = round === 1 ? drink : randomItem(DRINKS.filter((item) => item.id !== drink.id));
      let selectedVessel = null;
      const selectedIngredients = new Set();
      const recipeId = `recipe-${Date.now()}`;
      const recipeText = `${targetDrink.vessel}・${targetDrink.ingredients.join("・")}`;
      let recipeMemoryControls = null;
      let recipeHideTimeout = null;
      refs.stage.innerHTML = makeOrder(
        `${targetDrink.name}を作ろう`,
        `<span id="${recipeId}">${recipeText}</span>`
      );

      if (memorySeconds) {
        let replaysRemaining = 2;
        recipeMemoryControls = document.createElement("div");
        recipeMemoryControls.className = "recipe-memory-controls";
        const timer = document.createElement("p");
        timer.className = "recipe-timer";
        timer.setAttribute("aria-live", "polite");
        const replayButton = document.createElement("button");
        replayButton.type = "button";
        replayButton.className = "secondary-button recipe-replay-button";
        replayButton.disabled = true;
        replayButton.textContent = `もう一度見る（あと${replaysRemaining}回）`;
        recipeMemoryControls.append(timer, replayButton);
        refs.stage.append(recipeMemoryControls);

        const hideRecipe = () => {
          const recipe = document.getElementById(recipeId);
          if (recipe) {
            recipe.textContent = "？？？（思い出して作ろう）";
            recipe.classList.add("hidden-recipe");
          }
          timer.textContent = replaysRemaining > 0
            ? "見本がかくれたよ。必要なら、もう一度見られます"
            : "見本がかくれたよ。思い出して作ってみよう";
          replayButton.disabled = replaysRemaining <= 0;
          replayButton.textContent = replaysRemaining > 0
            ? `もう一度見る（あと${replaysRemaining}回）`
            : "もう一度見る（2回使いました）";
        };

        const showRecipeForMemoryTime = (isReplay = false) => {
          const recipe = document.getElementById(recipeId);
          if (!recipe) return;
          recipe.textContent = recipeText;
          recipe.classList.remove("hidden-recipe");
          replayButton.disabled = true;
          replayButton.textContent = isReplay
            ? `見本を表示中（あと${replaysRemaining}回）`
            : `もう一度見る（あと${replaysRemaining}回）`;
          timer.textContent = isReplay
            ? `${memorySeconds}秒だけ、もう一度見られるよ`
            : `${memorySeconds}秒で見本がかくれるよ。かくれた後は2回まで見られます`;
          if (recipeHideTimeout) window.clearTimeout(recipeHideTimeout);
          recipeHideTimeout = window.setTimeout(hideRecipe, memorySeconds * 1000);
        };

        replayButton.addEventListener("click", () => {
          if (replaysRemaining <= 0) return;
          replaysRemaining -= 1;
          showRecipeForMemoryTime(true);
          setMessage(`見本をもう一度、${memorySeconds}秒だけ見られるよ。`, "hint");
        });

        showRecipeForMemoryTime();
      }

      const instructions = document.createElement("p");
      instructions.className = "drag-instruction";
      instructions.innerHTML = "<strong>入れ物と材料を、調理台まで運ぼう！</strong><span>レシピに合うものを、指やマウスでドラッグしてね。調理台のものはタッチすると戻せます。</span>";
      refs.stage.append(instructions);

      const recipeFlow = document.createElement("div");
      recipeFlow.className = "recipe-drag-layout";
      const pantry = document.createElement("section");
      pantry.className = "recipe-pantry";
      pantry.innerHTML = "<h3>① 棚からえらぼう</h3>";
      const vesselGroup = document.createElement("div");
      vesselGroup.className = "recipe-source-group";
      vesselGroup.innerHTML = "<h4>入れ物</h4>";
      const vesselGrid = document.createElement("div");
      vesselGrid.className = "recipe-item-grid recipe-item-grid--vessels";
      vesselGroup.append(vesselGrid);
      const ingredientGroup = document.createElement("div");
      ingredientGroup.className = "recipe-source-group";
      ingredientGroup.innerHTML = "<h4>材料</h4>";
      const ingredientGrid = document.createElement("div");
      ingredientGrid.className = "recipe-item-grid recipe-item-grid--ingredients";
      ingredientGroup.append(ingredientGrid);
      pantry.append(vesselGroup, ingredientGroup);

      const prep = document.createElement("section");
      prep.className = "preparation-station";
      prep.innerHTML = `
        <h3>② 調理台に集めよう</h3>
        <div class="preparation-counter" role="group" aria-label="飲み物を作る調理台">
          <div class="prep-vessel-slot"></div>
          <div class="prep-ingredient-list"></div>
        </div>`;
      const prepCounter = prep.querySelector(".preparation-counter");
      const vesselSlot = prep.querySelector(".prep-vessel-slot");
      const prepIngredientList = prep.querySelector(".prep-ingredient-list");

      const renderPreparation = () => {
        vesselSlot.innerHTML = "";
        if (selectedVessel) {
          const selectedButton = document.createElement("button");
          selectedButton.type = "button";
          selectedButton.className = "prepared-recipe-item prepared-recipe-item--vessel";
          selectedButton.setAttribute("aria-label", `${selectedVessel.name}を棚へ戻す`);
          selectedButton.innerHTML = `${recipeItemPicture(selectedVessel)}<span>${selectedVessel.name}</span>`;
          selectedButton.addEventListener("click", () => {
            selectedVessel = null;
            renderPreparation();
          });
          vesselSlot.append(selectedButton);
        } else {
          vesselSlot.innerHTML = '<p><strong>入れ物</strong><span>ここに運んでね</span></p>';
        }

        prepIngredientList.innerHTML = "";
        if (!selectedIngredients.size) {
          prepIngredientList.innerHTML = '<p><strong>材料</strong><span>ここに運んでね</span></p>';
        } else {
          selectedIngredients.forEach((ingredientName) => {
            const ingredient = {
              name: ingredientName,
              icon: INGREDIENT_ICONS[ingredientName] || "🥄",
              type: "ingredient"
            };
            const selectedButton = document.createElement("button");
            selectedButton.type = "button";
            selectedButton.className = "prepared-recipe-item";
            selectedButton.setAttribute("aria-label", `${ingredient.name}を棚へ戻す`);
            selectedButton.innerHTML = `${recipeItemPicture(ingredient)}<span>${ingredient.name}</span>`;
            selectedButton.addEventListener("click", () => {
              selectedIngredients.delete(ingredient.name);
              renderPreparation();
            });
            prepIngredientList.append(selectedButton);
          });
        }

        prepCounter.setAttribute(
          "aria-label",
          `飲み物を作る調理台。入れ物${selectedVessel ? "あり" : "なし"}、材料${selectedIngredients.size}こ`
        );
      };

      const vesselItems = DRINKS.map((item) => ({
        id: `vessel-${item.id}`,
        name: item.vessel,
        value: item.vessel,
        icon: item.id === "hot" ? "☕" : item.id === "soda" ? "🥤" : "🥛",
        type: "vessel"
      }));
      shuffle(vesselItems).forEach((item) => {
        const itemButton = document.createElement("button");
        itemButton.type = "button";
        itemButton.className = "draggable-recipe-item";
        itemButton.setAttribute("aria-label", `${item.name}を調理台へ運ぶ`);
        itemButton.innerHTML = `${recipeItemPicture(item)}<strong>${item.name}</strong>`;
        makeDraggableItem(itemButton, item, prepCounter, (droppedItem) => {
          selectedVessel = droppedItem;
          renderPreparation();
          beep("ok");
          setMessage(`${droppedItem.name}を調理台に置いたよ。`, "hint");
        }, recipeItemPicture);
        vesselGrid.append(itemButton);
      });

      const allIngredients = [...new Set(DRINKS.flatMap((item) => item.ingredients))];
      shuffle(allIngredients).forEach((ingredientName) => {
        const ingredient = {
          id: `ingredient-${ingredientName}`,
          name: ingredientName,
          icon: INGREDIENT_ICONS[ingredientName] || "🥄",
          type: "ingredient"
        };
        const itemButton = document.createElement("button");
        itemButton.type = "button";
        itemButton.className = "draggable-recipe-item";
        itemButton.setAttribute("aria-label", `${ingredient.name}を調理台へ運ぶ`);
        itemButton.innerHTML = `${recipeItemPicture(ingredient)}<strong>${ingredient.name}</strong>`;
        makeDraggableItem(itemButton, ingredient, prepCounter, (droppedItem) => {
          if (selectedIngredients.has(droppedItem.name)) {
            setMessage(`${droppedItem.name}は、もう調理台にあるよ。`, "hint");
            return;
          }
          selectedIngredients.add(droppedItem.name);
          renderPreparation();
          beep("ok");
          setMessage(`${droppedItem.name}を調理台に置いたよ。`, "hint");
        }, recipeItemPicture);
        ingredientGrid.append(itemButton);
      });

      recipeFlow.append(pantry, prep);
      refs.stage.append(recipeFlow);
      renderPreparation();

      const prepActions = document.createElement("div");
      prepActions.className = "stage-actions";
      const makeButton = document.createElement("button");
      makeButton.type = "button";
      makeButton.className = "primary-button";
      makeButton.textContent = "OK！ 飲み物をつくる";
      prepActions.append(makeButton);
      refs.stage.append(prepActions);

      makeButton.addEventListener("click", () => {
        const ingredientCorrect = selectedIngredients.size === targetDrink.ingredients.length
          && targetDrink.ingredients.every((item) => selectedIngredients.has(item));
        if (selectedVessel?.value !== targetDrink.vessel || !ingredientCorrect) {
          prepCounter.classList.remove("needs-check");
          void prepCounter.offsetWidth;
          prepCounter.classList.add("needs-check");
          wrong("入れ物と材料を、レシピとくらべてみよう！");
          return;
        }

        beep("ok");
        setMessage(`${targetDrink.name}ができたよ！お客さんのトレイへ運ぼう。`, "success");
        if (recipeHideTimeout) window.clearTimeout(recipeHideTimeout);
        recipeMemoryControls?.remove();
        recipeFlow.remove();
        prepActions.remove();
        instructions.innerHTML = "<strong>できた飲み物を、お客さんへ届けよう！</strong><span>飲み物をつかんで、トレイの上まで運んでね。</span>";

        const deliveryScene = document.createElement("div");
        deliveryScene.className = "drink-service-scene recipe-delivery-scene";
        const finishedShelf = document.createElement("section");
        finishedShelf.className = "drink-shelf finished-drink-shelf";
        finishedShelf.innerHTML = "<h3>③ できあがり</h3>";
        const finishedButton = document.createElement("button");
        finishedButton.type = "button";
        finishedButton.className = "draggable-drink finished-drink";
        finishedButton.setAttribute("aria-label", `${targetDrink.name}をお客さんのトレイへ運ぶ`);
        finishedButton.innerHTML = `${drinkPicture(targetDrink)}<strong>${targetDrink.name}</strong><span>つかんで届ける</span>`;
        finishedShelf.append(finishedButton);

        const { customerArea, tray, trayItems } = createCustomerTray(
          "④ お客さんのトレイにのせよう",
          "できたかな？"
        );
        const deliveredDrinks = [];
        const renderDeliveryTray = () => {
          renderCustomerTray(tray, trayItems, deliveredDrinks, (removedDrink) => {
            deliveredDrinks.length = 0;
            renderDeliveryTray();
            finishedButton.hidden = false;
            setMessage(`${removedDrink.name}を調理台へ戻したよ。`, "hint");
          });
        };
        makeDraggableItem(finishedButton, targetDrink, tray, (droppedDrink) => {
          if (deliveredDrinks.length) return;
          deliveredDrinks.push(droppedDrink);
          finishedButton.hidden = true;
          renderDeliveryTray();
          beep("ok");
          setMessage("トレイにのせられたよ。「OK！」でお客さんにわたそう。", "success");
        });
        deliveryScene.append(finishedShelf, customerArea);
        refs.stage.append(deliveryScene);
        renderDeliveryTray();

        const deliveryActions = document.createElement("div");
        deliveryActions.className = "stage-actions";
        const deliveryButton = document.createElement("button");
        deliveryButton.type = "button";
        deliveryButton.className = "primary-button";
        deliveryButton.textContent = rounds > 1 && round === 1
          ? "OK！ 1人目にわたす"
          : "OK！ お客さんにわたす";
        deliveryActions.append(deliveryButton);
        refs.stage.append(deliveryActions);

        deliveryButton.addEventListener("click", () => {
          if (deliveredDrinks.length !== 1) {
            tray.classList.remove("needs-check");
            void tray.offsetWidth;
            tray.classList.add("needs-check");
            wrong("できた飲み物を、トレイまで運んでから「OK！」を押そう！");
            return;
          }
          if (round < rounds) {
            beep("ok");
            round += 1;
            setMessage("1人目はぴったり！つぎのお客さんの分も同じように作ろう。", "success");
            runRound();
          } else {
            completeLevel("入れ物と材料をそろえ、できたレモネードをお客さんへ届けられました。");
          }
        });
      });
    };
    runRound();
  }

  // 2. Hamburger
  const BURGER_LAYERS = {
    "下のバンズ": { emoji: "🟤", color: "#e9a848", width: "88%", className: "bottom" },
    "レタス": { emoji: "🥬", color: "#76bf44", width: "93%" },
    "ハンバーグ": { emoji: "🥩", color: "#7b421f", width: "84%" },
    "チーズ": { emoji: "🧀", color: "#ffd735", width: "90%" },
    "トマト": { emoji: "🍅", color: "#ef594c", width: "82%" },
    "たまご": { emoji: "🍳", color: "#fff1a1", width: "83%" },
    "ベーコン": { emoji: "🥓", color: "#d96d52", width: "89%" },
    "きゅうり": { emoji: "🥒", color: "#66a94a", width: "80%" },
    "上のバンズ": { emoji: "🟠", color: "#efa93e", width: "91%", className: "top" }
  };

  function burgerRecipe(level) {
    const middlePool = ["レタス", "ハンバーグ", "チーズ", "トマト", "たまご", "ベーコン", "きゅうり"];
    const middleCount = Math.min(7, 2 + level);
    return ["下のバンズ", ...shuffle(middlePool).slice(0, middleCount), "上のバンズ"];
  }

  function startBurger() {
    const recipe = burgerRecipe(currentLevel);
    const hideAfter = currentLevel <= 3 ? null : Math.max(3, 9 - currentLevel);
    startLayerStack({
      recipe,
      layerMap: BURGER_LAYERS,
      orderTitle: "下からこの順番で作ろう",
      hideAfter,
      completeText: "注文カードの順番どおりに、ハンバーガーを重ねられました。"
    });
  }

  // 5. Parfait uses the same stacking engine.
  const PARFAIT_LAYERS = {
    "コーンフレーク": { emoji: "🌾", color: "#d9a84e", width: "68%" },
    "いちご": { emoji: "🍓", color: "#f25c75", width: "62%" },
    "バナナ": { emoji: "🍌", color: "#ffe166", width: "66%" },
    "キウイ": { emoji: "🥝", color: "#8ecb58", width: "63%" },
    "みかん": { emoji: "🍊", color: "#ff9d3d", width: "64%" },
    "ヨーグルト": { emoji: "🥛", color: "#fffef3", width: "70%" },
    "アイス": { emoji: "🍨", color: "#ffd7e7", width: "58%" },
    "生クリーム": { emoji: "☁️", color: "#fff", width: "48%", className: "top" },
    "さくらんぼ": { emoji: "🍒", color: "#d72f4d", width: "32%", className: "top" }
  };

  function startParfait() {
    const pool = ["いちご", "バナナ", "キウイ", "みかん", "ヨーグルト", "アイス"];
    const count = Math.min(6, 1 + currentLevel);
    const recipe = ["コーンフレーク", ...shuffle(pool).slice(0, count)];
    if (currentLevel >= 3) recipe.push("生クリーム");
    if (currentLevel >= 6) recipe.push("さくらんぼ");
    startLayerStack({
      recipe,
      layerMap: PARFAIT_LAYERS,
      orderTitle: "グラスの下からこの順番で重ねよう",
      hideAfter: currentLevel <= 3 ? null : Math.max(3, 9 - currentLevel),
      completeText: "色と順番をよく見て、きれいなパフェを作れました。"
    });
  }

  function startLayerStack({ recipe, layerMap, orderTitle, hideAfter, completeText }) {
    const placed = [];
    const recipeId = `stack-recipe-${Date.now()}`;
    refs.stage.innerHTML = makeOrder(orderTitle, `<span id="${recipeId}">${recipe.join(" → ")}</span>`);

    if (hideAfter) {
      const timer = document.createElement("p");
      timer.className = "recipe-timer";
      timer.textContent = `${hideAfter}秒で見本がかくれるよ`;
      refs.stage.append(timer);
      window.setTimeout(() => {
        const recipeElement = document.getElementById(recipeId);
        if (recipeElement) {
          recipeElement.textContent = "？？？（順番を思い出そう）";
          recipeElement.classList.add("hidden-recipe");
        }
        timer.remove();
      }, hideAfter * 1000);
    }

    const instructions = document.createElement("p");
    instructions.className = "drag-instruction";
    instructions.innerHTML = "<strong>材料をつかんで、できあがり台へ運ぼう！</strong><span>下から順番に重ねてね。重ねた材料はタッチすると戻せます。</span>";
    refs.stage.append(instructions);

    const layout = document.createElement("div");
    layout.className = "drag-game-layout stack-game-layout";
    const sourcePanel = document.createElement("section");
    sourcePanel.className = "drag-source-panel";
    sourcePanel.innerHTML = "<h3>① 材料をえらぼう</h3>";
    const grid = document.createElement("div");
    grid.className = "drag-item-grid";
    sourcePanel.append(grid);

    const targetPanel = document.createElement("section");
    targetPanel.className = "drag-target-panel";
    targetPanel.innerHTML = "<h3>② 下から順番に重ねよう</h3>";
    const buildArea = document.createElement("div");
    buildArea.className = "build-area stack-drop-zone";
    buildArea.setAttribute("role", "group");
    buildArea.setAttribute("aria-label", "料理を重ねるできあがり台");
    const stack = document.createElement("div");
    stack.className = "stack";
    buildArea.append(stack);
    targetPanel.append(buildArea);
    layout.append(sourcePanel, targetPanel);
    refs.stage.append(layout);

    const candidateCount = Math.min(Object.keys(layerMap).length, recipe.length + Math.max(1, currentLevel - 2));
    const candidates = shuffle([...new Set([...recipe, ...shuffle(Object.keys(layerMap))])]).slice(0, candidateCount);
    recipe.forEach((item) => {
      if (!candidates.includes(item)) candidates.push(item);
    });

    const renderStack = () => {
      stack.innerHTML = "";
      if (!placed.length) {
        stack.innerHTML = '<p class="drop-empty-message">ここに運んでね</p>';
        return;
      }
      placed.forEach((name, index) => {
        const item = layerMap[name];
        const layer = document.createElement("button");
        layer.type = "button";
        layer.className = `stack-layer removable-stack-layer ${item.className || ""}`;
        layer.style.setProperty("--layer-color", item.color);
        layer.style.setProperty("--layer-width", item.width);
        layer.setAttribute("aria-label", `${name}をできあがり台から戻す`);
        layer.textContent = `${item.emoji} ${name}`;
        layer.addEventListener("click", () => {
          placed.splice(index, 1);
          renderStack();
          setMessage(`${name}を材料の棚へ戻したよ。`, "hint");
        });
        stack.append(layer);
      });
    };

    shuffle(candidates).forEach((name) => {
      const item = layerMap[name];
      const itemButton = document.createElement("button");
      itemButton.type = "button";
      itemButton.className = "food-button draggable-game-item";
      itemButton.setAttribute("aria-label", `${name}をできあがり台へ運ぶ`);
      itemButton.innerHTML = `${gameItemPicture({ emoji: item.emoji })}<strong>${name}</strong><span>つかんで運ぶ</span>`;
      makeDraggableItem(itemButton, { name, emoji: item.emoji }, buildArea, (droppedItem) => {
        if (placed.length >= recipe.length + 2) {
          wrong("できあがり台がいっぱいだよ。いらない材料をタッチして戻そう！");
          return;
        }
        placed.push(droppedItem.name);
        renderStack();
        beep("ok");
        setMessage(`${droppedItem.name}を重ねたよ。できたら「OK！」を押そう。`, "hint");
      }, gameItemPicture);
      grid.append(itemButton);
    });
    renderStack();

    addCheckButton("OK！ できあがり", () => {
      const correct = placed.length === recipe.length
        && recipe.every((name, index) => placed[index] === name);
      if (correct) {
        completeLevel(completeText);
      } else {
        buildArea.classList.remove("needs-check");
        void buildArea.offsetWidth;
        buildArea.classList.add("needs-check");
        wrong("材料の種類と、下から重ねる順番を注文カードとくらべてみよう！");
      }
    });
  }

  // 3. Curry ingredients
  const CURRY_INGREDIENTS = [
    { name: "にんじん", emoji: "🥕" },
    { name: "じゃがいも", emoji: "🥔" },
    { name: "たまねぎ", emoji: "🧅" },
    { name: "お肉", emoji: "🥩" },
    { name: "ブロッコリー", emoji: "🥦" },
    { name: "なす", emoji: "🍆" },
    { name: "かぼちゃ", emoji: "🎃" },
    { name: "きのこ", emoji: "🍄" },
    { name: "いちご", emoji: "🍓" },
    { name: "魚", emoji: "🐟" },
    { name: "ぶどう", emoji: "🍇" },
    { name: "アイス", emoji: "🍨" }
  ];

  function startCurry() {
    const safe = CURRY_INGREDIENTS.slice(0, 8);
    const distractors = CURRY_INGREDIENTS.slice(8);
    const ingredientCount = Math.min(6, 1 + Math.ceil(currentLevel / 1.5));
    const recipe = shuffle(safe).slice(0, ingredientCount);
    const candidateCount = Math.min(CURRY_INGREDIENTS.length, ingredientCount + 2 + currentLevel);
    const candidates = shuffle([...recipe, ...shuffle([...safe, ...distractors]).filter((item) => !recipe.some((r) => r.name === item.name))])
      .slice(0, candidateCount);
    recipe.forEach((item) => {
      if (!candidates.some((candidate) => candidate.name === item.name)) candidates.push(item);
    });
    const selected = new Map();
    const memorySeconds = currentLevel <= 2 ? null : Math.max(3, 9 - currentLevel);
    const recipeId = `curry-recipe-${Date.now()}`;
    refs.stage.innerHTML = makeOrder(
      "さっき作ったレモエールカレーに入っていたものを選ぼう",
      `<span id="${recipeId}">${recipe.map((item) => `${item.emoji}${item.name}`).join("・")}</span>`
    );

    if (memorySeconds) {
      const timer = document.createElement("p");
      timer.className = "recipe-timer";
      timer.textContent = `${memorySeconds}秒でカレーができあがるよ。具材を覚えてね`;
      refs.stage.append(timer);
      window.setTimeout(() => {
        const recipeElement = document.getElementById(recipeId);
        if (recipeElement) recipeElement.innerHTML = "🍛 できあがり！何が入っていたかな？";
        timer.remove();
      }, memorySeconds * 1000);
    }

    const instructions = document.createElement("p");
    instructions.className = "drag-instruction";
    instructions.innerHTML = "<strong>思い出した具材を、カレー鍋へ運ぼう！</strong><span>鍋に入れた具材は、タッチすると棚へ戻せます。</span>";
    refs.stage.append(instructions);

    const layout = document.createElement("div");
    layout.className = "drag-game-layout curry-game-layout";
    const sourcePanel = document.createElement("section");
    sourcePanel.className = "drag-source-panel";
    sourcePanel.innerHTML = "<h3>① 具材をえらぼう</h3>";
    const grid = document.createElement("div");
    grid.className = "drag-item-grid";
    sourcePanel.append(grid);
    const targetPanel = document.createElement("section");
    targetPanel.className = "drag-target-panel";
    targetPanel.innerHTML = "<h3>② カレー鍋に入れよう</h3>";
    const pot = document.createElement("div");
    pot.className = "curry-pot";
    pot.setAttribute("role", "group");
    pot.setAttribute("aria-label", "カレー鍋。まだ具材は入っていません");
    const potItems = document.createElement("div");
    potItems.className = "curry-pot__items";
    pot.append(potItems);
    targetPanel.append(pot);
    layout.append(sourcePanel, targetPanel);
    refs.stage.append(layout);

    const renderPot = () => {
      potItems.innerHTML = "";
      pot.setAttribute("aria-label", `カレー鍋。具材が${selected.size}こ入っています`);
      if (!selected.size) {
        potItems.innerHTML = '<p class="drop-empty-message">ここに運んでね</p>';
        return;
      }
      selected.forEach((item) => {
        const selectedButton = document.createElement("button");
        selectedButton.type = "button";
        selectedButton.className = "placed-game-item";
        selectedButton.setAttribute("aria-label", `${item.name}を鍋から戻す`);
        selectedButton.innerHTML = `${gameItemPicture(item)}<span>${item.name}</span>`;
        selectedButton.addEventListener("click", () => {
          selected.delete(item.name);
          renderPot();
          setMessage(`${item.name}を具材の棚へ戻したよ。`, "hint");
        });
        potItems.append(selectedButton);
      });
    };

    candidates.forEach((item) => {
      const itemButton = document.createElement("button");
      itemButton.type = "button";
      itemButton.className = "food-button draggable-game-item";
      itemButton.setAttribute("aria-label", `${item.name}をカレー鍋へ運ぶ`);
      itemButton.innerHTML = `${gameItemPicture(item)}<strong>${item.name}</strong><span>鍋へ運ぶ</span>`;
      makeDraggableItem(itemButton, item, pot, (droppedItem) => {
        if (selected.has(droppedItem.name)) {
          setMessage(`${droppedItem.name}は、もう鍋に入っているよ。`, "hint");
          return;
        }
        selected.set(droppedItem.name, droppedItem);
        renderPot();
        beep("ok");
        setMessage(`${droppedItem.name}を鍋に入れたよ。`, "hint");
      }, gameItemPicture);
      grid.append(itemButton);
    });
    renderPot();

    addCheckButton("OK！ これでカレーを作る", () => {
      const correct = selected.size === recipe.length && recipe.every((item) => selected.has(item.name));
      if (correct) {
        completeLevel("調理場面を思い出して、使った具材を全部見つけられました。");
      } else {
        pot.classList.remove("needs-check");
        void pot.offsetWidth;
        pot.classList.add("needs-check");
        wrong("さっきの調理場面を思い出して、選んだ数も確認してみよう！");
      }
    });
  }

  // 4. Bento placement
  const BENTO_FOODS = [
    { name: "おにぎり", emoji: "🍙" },
    { name: "たまごやき", emoji: "🥚" },
    { name: "ブロッコリー", emoji: "🥦" },
    { name: "からあげ", emoji: "🍗" },
    { name: "ミニトマト", emoji: "🍅" },
    { name: "えび", emoji: "🍤" },
    { name: "りんご", emoji: "🍎" },
    { name: "さかな", emoji: "🐟" }
  ];
  const SLOT_NAMES = ["左上", "上まんなか", "右上", "左下", "下まんなか", "右下"];

  function startBento() {
    const slotCount = Math.min(6, 2 + Math.ceil(currentLevel / 1.4));
    const foods = shuffle(BENTO_FOODS).slice(0, slotCount);
    const target = SLOT_NAMES.slice(0, slotCount).map((slot, index) => ({ slot, food: foods[index] }));
    let selectedFood = null;
    const filled = new Map();
    const sourceButtons = [];
    const memorySeconds = currentLevel >= 5 ? Math.max(3, 9 - currentLevel) : null;
    const orderId = `bento-order-${Date.now()}`;
    refs.stage.innerHTML = makeOrder(
      "この場所におかずをつめよう",
      `<span id="${orderId}">${target.map((item) => `${item.slot}＝${item.food.emoji}${item.food.name}`).join("／")}</span>`
    );
    if (memorySeconds) {
      const timer = document.createElement("p");
      timer.className = "recipe-timer";
      timer.textContent = `${memorySeconds}秒で注文カードがかくれるよ`;
      refs.stage.append(timer);
      window.setTimeout(() => {
        const order = document.getElementById(orderId);
        if (order) order.textContent = "？？？（場所を思い出そう）";
        timer.remove();
      }, memorySeconds * 1000);
    }

    const instructions = document.createElement("p");
    instructions.className = "drag-instruction";
    instructions.innerHTML = "<strong>おかずをつかんで、お弁当箱の場所まで運ぼう！</strong><span>ドラッグが難しい時は、おかず→入れる場所の順にタッチ。入れたおかずはタッチで戻せます。</span>";
    refs.stage.append(instructions);

    const layout = document.createElement("div");
    layout.className = "drag-game-layout bento-game-layout";
    const sourcePanel = document.createElement("section");
    sourcePanel.className = "drag-source-panel";
    sourcePanel.innerHTML = "<h3>① おかずをえらぼう</h3>";
    const grid = document.createElement("div");
    grid.className = "drag-item-grid";
    sourcePanel.append(grid);
    const targetPanel = document.createElement("section");
    targetPanel.className = "drag-target-panel";
    targetPanel.innerHTML = "<h3>② 指定された場所につめよう</h3>";
    const tray = document.createElement("div");
    tray.className = "tray-grid";

    const clearSourceSelection = () => {
      selectedFood = null;
      sourceButtons.forEach((buttonElement) => buttonElement.classList.remove("selected"));
    };

    const placeFood = (food, slot) => {
      const index = Number(slot.dataset.index);
      if (filled.has(index)) {
        wrong("その場所には、もうおかずが入っているよ。タッチして戻してみよう！");
        return;
      }
      filled.set(index, food);
      clearSourceSelection();
      renderTray();
      beep("ok");
      setMessage(`${food.name}を${target[index].slot}に入れたよ。`, "hint");
    };

    const renderTray = () => {
      tray.querySelectorAll(".tray-slot").forEach((slot) => {
        const index = Number(slot.dataset.index);
        const placedFood = filled.get(index);
        slot.classList.toggle("filled", Boolean(placedFood));
        if (placedFood) {
          slot.innerHTML = `${gameItemPicture(placedFood)}<small>${placedFood.name}</small><span>タッチで戻す</span>`;
        } else {
          slot.innerHTML = `<small>${target[index].slot}</small><span>ここに運ぶ</span>`;
        }
      });
    };

    target.forEach((item, index) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "tray-slot";
      slot.dataset.index = String(index);
      slot.addEventListener("click", () => {
        if (filled.has(index)) {
          const removedFood = filled.get(index);
          filled.delete(index);
          renderTray();
          setMessage(`${removedFood.name}をおかずの棚へ戻したよ。`, "hint");
          return;
        }
        if (selectedFood) placeFood(selectedFood, slot);
      });
      tray.append(slot);
    });
    targetPanel.append(tray);
    layout.append(sourcePanel, targetPanel);
    refs.stage.append(layout);

    shuffle([...foods, ...shuffle(BENTO_FOODS.filter((item) => !foods.includes(item))).slice(0, Math.max(0, currentLevel - 3))]).forEach((food) => {
      const foodButton = document.createElement("button");
      foodButton.type = "button";
      foodButton.className = "food-button draggable-game-item";
      foodButton.setAttribute("aria-label", `${food.name}をお弁当箱へ運ぶ`);
      foodButton.innerHTML = `${gameItemPicture(food)}<strong>${food.name}</strong><span>つかんで運ぶ</span>`;
      sourceButtons.push(foodButton);
      makeDraggableToZones(
        foodButton,
        food,
        () => [...tray.querySelectorAll(".tray-slot")],
        (droppedFood, slot) => placeFood(droppedFood, slot),
        (selected, selectedButton) => {
          sourceButtons.forEach((buttonElement) => buttonElement.classList.remove("selected"));
          selectedButton.classList.add("selected");
          selectedFood = selected;
          setMessage(`${selected.name}を選んだよ。入れる場所をタッチしよう。`, "hint");
        },
        gameItemPicture
      );
      grid.append(foodButton);
    });
    renderTray();

    addCheckButton("OK！ おべんとうをわたす", () => {
      const correct = filled.size === target.length
        && target.every((item, index) => filled.get(index)?.name === item.food.name);
      if (correct) {
        completeLevel("指定された場所に、すべてのおかずをつめられました。");
      } else {
        tray.classList.remove("needs-check");
        void tray.offsetWidth;
        tray.classList.add("needs-check");
        wrong("おかずの種類と場所を、注文カードとくらべてみよう！");
      }
    });
  }

  // 6. Pizza sharing
  const PIZZA_LEVELS = [
    { people: 2, total: 4 },
    { people: 2, total: 6 },
    { people: 3, total: 6 },
    { people: 4, total: 8 },
    { people: 3, total: 10 },
    { people: 4, total: 14 },
    { people: 4, total: 15 }
  ];

  function startPizza() {
    const config = PIZZA_LEVELS[currentLevel - 1];
    const perPerson = Math.floor(config.total / config.people);
    const remainder = config.total % config.people;
    const assignments = Array(config.total).fill(null);
    const sourceButtons = [];
    let selectedSliceIndex = null;
    refs.stage.innerHTML = makeOrder(
      `ピザ${config.total}切れを、${config.people}人に同じ数ずつ分けよう`,
      currentLevel >= 5 ? "あまるピザがあるかもしれないよ" : ""
    );

    const instructions = document.createElement("p");
    instructions.className = "drag-instruction";
    instructions.innerHTML = "<strong>ピザを1切れずつ、みんなのお皿へ運ぼう！</strong><span>ドラッグが難しい時は、ピザ→お皿の順にタッチ。置いたピザはタッチで大皿へ戻せます。</span>";
    refs.stage.append(instructions);

    const layout = document.createElement("div");
    layout.className = "pizza-sharing-layout";
    const sourcePanel = document.createElement("section");
    sourcePanel.className = "pizza-source-panel";
    sourcePanel.innerHTML = `<h3>① 大皿のピザ（${config.total}切れ）</h3>`;
    const pizzaSource = document.createElement("div");
    pizzaSource.className = "pizza-source";
    sourcePanel.append(pizzaSource);
    const targetPanel = document.createElement("section");
    targetPanel.className = "pizza-target-panel";
    targetPanel.innerHTML = "<h3>② みんなのお皿に配ろう</h3>";
    const people = document.createElement("div");
    people.className = "pizza-people-grid";
    const dropZones = [];

    const clearSliceSelection = () => {
      selectedSliceIndex = null;
      sourceButtons.forEach((buttonElement) => buttonElement.classList.remove("selected"));
    };

    const assignSlice = (slice, zone) => {
      if (assignments[slice.index] !== null) return;
      assignments[slice.index] = zone.dataset.zone;
      clearSliceSelection();
      renderPizza();
      beep("ok");
      setMessage("ピザを1切れ配ったよ。同じ数になるように続けよう。", "hint");
    };

    const placeSelectedOn = (zone) => {
      if (selectedSliceIndex === null) return;
      assignSlice({ index: selectedSliceIndex }, zone);
    };

    const makePlate = (zoneName, title, face) => {
      const plate = document.createElement("div");
      plate.className = "pizza-person-drop";
      plate.dataset.zone = zoneName;
      plate.tabIndex = 0;
      plate.setAttribute("role", "button");
      plate.setAttribute("aria-label", `${title}のお皿`);
      plate.innerHTML = `<span class="pizza-person-face" aria-hidden="true">${face}</span><strong>${title}</strong><div class="pizza-plate-items"></div><small class="pizza-count">0切れ</small>`;
      plate.addEventListener("click", () => placeSelectedOn(plate));
      plate.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          placeSelectedOn(plate);
        }
      });
      dropZones.push(plate);
      return plate;
    };

    for (let index = 0; index < config.people; index += 1) {
      people.append(makePlate(`person-${index}`, `${index + 1}人目`, "🙂"));
    }
    const remainderPlate = makePlate("remainder", "あまり置き場", "🍕");
    remainderPlate.classList.add("pizza-remainder-drop");
    people.append(remainderPlate);
    targetPanel.append(people);
    layout.append(sourcePanel, targetPanel);
    refs.stage.append(layout);

    const renderPizza = () => {
      sourceButtons.forEach((buttonElement, index) => {
        buttonElement.hidden = assignments[index] !== null;
      });
      dropZones.forEach((zone) => {
        const indices = assignments
          .map((assignedZone, index) => assignedZone === zone.dataset.zone ? index : -1)
          .filter((index) => index >= 0);
        const plateItems = zone.querySelector(".pizza-plate-items");
        plateItems.innerHTML = "";
        indices.forEach((sliceIndex) => {
          const sliceButton = document.createElement("button");
          sliceButton.type = "button";
          sliceButton.className = "placed-pizza-slice";
          sliceButton.setAttribute("aria-label", "このピザを大皿へ戻す");
          sliceButton.textContent = "🍕";
          sliceButton.addEventListener("click", (event) => {
            event.stopPropagation();
            assignments[sliceIndex] = null;
            renderPizza();
            setMessage("ピザを大皿へ戻したよ。", "hint");
          });
          plateItems.append(sliceButton);
        });
        zone.querySelector(".pizza-count").textContent = `${indices.length}切れ`;
      });
    };

    Array.from({ length: config.total }, (_, index) => ({
      name: `ピザ${index + 1}切れ目`,
      emoji: "🍕",
      index
    })).forEach((slice) => {
      const sliceButton = document.createElement("button");
      sliceButton.type = "button";
      sliceButton.className = "pizza-slice-source";
      sliceButton.setAttribute("aria-label", `${slice.name}をお皿へ運ぶ`);
      sliceButton.innerHTML = gameItemPicture(slice);
      sourceButtons.push(sliceButton);
      makeDraggableToZones(
        sliceButton,
        slice,
        () => dropZones,
        (droppedSlice, zone) => assignSlice(droppedSlice, zone),
        (selectedSlice, selectedButton) => {
          sourceButtons.forEach((buttonElement) => buttonElement.classList.remove("selected"));
          selectedButton.classList.add("selected");
          selectedSliceIndex = selectedSlice.index;
          setMessage("ピザを選んだよ。渡す人のお皿をタッチしよう。", "hint");
        },
        gameItemPicture
      );
      pizzaSource.append(sliceButton);
    });
    renderPizza();

    addCheckButton("OK！ みんなに配る", () => {
      const peopleCorrect = Array.from({ length: config.people }, (_, index) => (
        assignments.filter((zone) => zone === `person-${index}`).length === perPerson
      )).every(Boolean);
      const remainderCorrect = assignments.filter((zone) => zone === "remainder").length === remainder;
      if (peopleCorrect && remainderCorrect && assignments.every((zone) => zone !== null)) {
        completeLevel(`${config.people}人に${perPerson}切れずつ、あまり${remainder}切れに分けられました。`);
      } else {
        targetPanel.classList.remove("needs-check");
        void targetPanel.offsetWidth;
        targetPanel.classList.add("needs-check");
        wrong("1人ずつ順番に配るつもりで、もう一度数えてみよう！");
      }
    });
  }

  // 7. Breakfast selection
  const BREAKFAST_ITEMS = [
    { name: "ごはん", emoji: "🍚", category: "主食" },
    { name: "パン", emoji: "🍞", category: "主食" },
    { name: "おにぎり", emoji: "🍙", category: "主食" },
    { name: "やきざかな", emoji: "🐟", category: "おかず" },
    { name: "たまご", emoji: "🍳", category: "おかず" },
    { name: "サラダ", emoji: "🥗", category: "おかず" },
    { name: "お水", emoji: "💧", category: "飲み物" },
    { name: "お茶", emoji: "🍵", category: "飲み物" },
    { name: "牛乳", emoji: "🥛", category: "飲み物" },
    { name: "りんご", emoji: "🍎", category: "果物" },
    { name: "バナナ", emoji: "🍌", category: "果物" },
    { name: "みかん", emoji: "🍊", category: "果物" }
  ];

  function startBreakfast() {
    const requirements = currentLevel <= 2
      ? { 主食: 1, おかず: 1 }
      : currentLevel <= 4
        ? { 主食: 1, おかず: 1, 飲み物: 1 }
        : currentLevel <= 6
          ? { 主食: 1, おかず: 2, 飲み物: 1, 果物: 1 }
          : { 主食: 2, おかず: 2, 飲み物: 1, 果物: 1 };
    const selected = new Map();
    const sourceButtons = new Map();
    const candidateCount = Math.min(BREAKFAST_ITEMS.length, 5 + currentLevel);
    const candidates = shuffle(BREAKFAST_ITEMS).slice(0, candidateCount);
    Object.keys(requirements).forEach((category) => {
      const countPresent = candidates.filter((item) => item.category === category).length;
      const needed = requirements[category] - countPresent;
      if (needed > 0) {
        candidates.push(...shuffle(BREAKFAST_ITEMS.filter((item) => item.category === category && !candidates.includes(item))).slice(0, needed));
      }
    });
    refs.stage.innerHTML = makeOrder(
      "朝ごはんをそろえよう",
      Object.entries(requirements).map(([category, count]) => `${category}${count}つ`).join("・")
    );

    const instructions = document.createElement("p");
    instructions.className = "drag-instruction";
    instructions.innerHTML = "<strong>食べ物をつかんで、朝ごはんトレイへ運ぼう！</strong><span>注文に合う種類と数をそろえてね。トレイの食べ物はタッチすると戻せます。</span>";
    refs.stage.append(instructions);

    const layout = document.createElement("div");
    layout.className = "drag-game-layout breakfast-game-layout";
    const sourcePanel = document.createElement("section");
    sourcePanel.className = "drag-source-panel";
    sourcePanel.innerHTML = "<h3>① 食べ物をえらぼう</h3>";
    const grid = document.createElement("div");
    grid.className = "drag-item-grid";
    sourcePanel.append(grid);
    const targetPanel = document.createElement("section");
    targetPanel.className = "drag-target-panel";
    targetPanel.innerHTML = "<h3>② 朝ごはんトレイにのせよう</h3>";
    const tray = document.createElement("div");
    tray.className = "breakfast-tray";
    tray.setAttribute("role", "group");
    tray.setAttribute("aria-label", "朝ごはんトレイ。まだ食べ物はありません");
    const trayItems = document.createElement("div");
    trayItems.className = "breakfast-tray__items";
    tray.append(trayItems);
    targetPanel.append(tray);
    layout.append(sourcePanel, targetPanel);
    refs.stage.append(layout);

    const renderBreakfast = () => {
      trayItems.innerHTML = "";
      tray.setAttribute("aria-label", `朝ごはんトレイ。食べ物が${selected.size}こあります`);
      sourceButtons.forEach((buttonElement, itemName) => {
        buttonElement.hidden = selected.has(itemName);
      });
      if (!selected.size) {
        trayItems.innerHTML = '<p class="drop-empty-message">ここに運んでね</p>';
        return;
      }
      selected.forEach((item) => {
        const placedButton = document.createElement("button");
        placedButton.type = "button";
        placedButton.className = "placed-game-item breakfast-placed-item";
        placedButton.setAttribute("aria-label", `${item.name}をトレイから戻す`);
        placedButton.innerHTML = `${gameItemPicture(item)}<span>${item.name}</span><small>${item.category}</small>`;
        placedButton.addEventListener("click", () => {
          selected.delete(item.name);
          renderBreakfast();
          setMessage(`${item.name}を食べ物の棚へ戻したよ。`, "hint");
        });
        trayItems.append(placedButton);
      });
    };

    shuffle(candidates).forEach((item) => {
      const itemButton = document.createElement("button");
      itemButton.type = "button";
      itemButton.className = "food-button draggable-game-item";
      itemButton.setAttribute("aria-label", `${item.name}を朝ごはんトレイへ運ぶ`);
      itemButton.innerHTML = `${gameItemPicture(item)}<strong>${item.name}</strong><span>${currentLevel <= 3 ? item.category : "つかんで運ぶ"}</span>`;
      sourceButtons.set(item.name, itemButton);
      makeDraggableItem(itemButton, item, tray, (droppedItem) => {
        if (selected.has(droppedItem.name)) {
          setMessage(`${droppedItem.name}は、もうトレイにあるよ。`, "hint");
          return;
        }
        selected.set(droppedItem.name, droppedItem);
        renderBreakfast();
        beep("ok");
        setMessage(`${droppedItem.name}を朝ごはんトレイにのせたよ。`, "hint");
      }, gameItemPicture);
      grid.append(itemButton);
    });
    renderBreakfast();

    addCheckButton("OK！ いただきます", () => {
      const selectedItems = [...selected.values()];
      const counts = selectedItems.reduce((map, item) => {
        map[item.category] = (map[item.category] || 0) + 1;
        return map;
      }, {});
      const correct = Object.entries(requirements).every(([category, count]) => counts[category] === count)
        && selectedItems.length === Object.values(requirements).reduce((sum, value) => sum + value, 0);
      if (correct) {
        completeLevel("主食・おかず・飲み物などを、注文どおりに組み合わせられました。");
      } else {
        tray.classList.remove("needs-check");
        void tray.offsetWidth;
        tray.classList.add("needs-check");
        wrong("選んだ食べ物を、主食・おかず・飲み物に分けて数えてみよう！");
      }
    });
  }

  // 8. Fridge classification
  const FRIDGE_ITEMS = [
    { name: "にんじん", emoji: "🥕", category: "野菜" },
    { name: "じゃがいも", emoji: "🥔", category: "野菜" },
    { name: "キャベツ", emoji: "🥬", category: "野菜" },
    { name: "ブロッコリー", emoji: "🥦", category: "野菜" },
    { name: "りんご", emoji: "🍎", category: "果物" },
    { name: "バナナ", emoji: "🍌", category: "果物" },
    { name: "いちご", emoji: "🍓", category: "果物" },
    { name: "ぶどう", emoji: "🍇", category: "果物" },
    { name: "お水", emoji: "💧", category: "飲み物" },
    { name: "お茶", emoji: "🍵", category: "飲み物" },
    { name: "ジュース", emoji: "🧃", category: "飲み物" },
    { name: "牛乳", emoji: "🥛", category: "乳製品" },
    { name: "ヨーグルト", emoji: "🥣", category: "乳製品" },
    { name: "チーズ", emoji: "🧀", category: "乳製品" }
  ];

  function startFridge() {
    const categoryCount = currentLevel <= 2 ? 2 : currentLevel <= 4 ? 3 : 4;
    const categories = ["野菜", "果物", "飲み物", "乳製品"].slice(0, categoryCount);
    const itemCount = Math.min(12, 3 + currentLevel);
    const items = shuffle(FRIDGE_ITEMS.filter((item) => categories.includes(item.category))).slice(0, itemCount);
    const assignments = new Map();
    const sourceButtons = new Map();
    const bins = [];
    let selectedItem = null;
    refs.stage.innerHTML = makeOrder(`${items.length}この食べ物を、仲間ごとにかたづけよう`);

    const instructions = document.createElement("p");
    instructions.className = "drag-instruction";
    instructions.innerHTML = "<strong>食べ物をつかんで、同じ仲間の冷蔵庫へ運ぼう！</strong><span>ドラッグが難しい時は、食べ物→仲間の場所の順にタッチ。入れた食べ物はタッチで戻せます。</span>";
    refs.stage.append(instructions);

    const layout = document.createElement("div");
    layout.className = "fridge-game-layout";
    const sourcePanel = document.createElement("section");
    sourcePanel.className = "fridge-source-panel";
    sourcePanel.innerHTML = "<h3>① かたづける食べ物</h3>";
    const sourceGrid = document.createElement("div");
    sourceGrid.className = "fridge-source-grid";
    sourcePanel.append(sourceGrid);
    const fridge = document.createElement("section");
    fridge.className = "fridge-cabinet";
    fridge.innerHTML = "<h3>② 仲間の冷蔵庫へ入れよう</h3>";
    const binGrid = document.createElement("div");
    binGrid.className = "fridge-bin-grid";
    fridge.append(binGrid);
    layout.append(sourcePanel, fridge);
    refs.stage.append(layout);

    const clearItemSelection = () => {
      selectedItem = null;
      sourceButtons.forEach((buttonElement) => buttonElement.classList.remove("selected"));
    };

    const assignItem = (item, bin) => {
      assignments.set(item.name, bin.dataset.category);
      clearItemSelection();
      renderFridge();
      beep("ok");
      setMessage(`${item.name}を「${bin.dataset.category}」へ入れたよ。`, "hint");
    };

    const placeSelectedIn = (bin) => {
      if (selectedItem) assignItem(selectedItem, bin);
    };

    categories.forEach((category) => {
      const bin = document.createElement("div");
      bin.className = "fridge-bin";
      bin.dataset.category = category;
      bin.tabIndex = 0;
      bin.setAttribute("role", "button");
      bin.setAttribute("aria-label", `${category}の冷蔵庫`);
      bin.innerHTML = `<strong>${category}</strong><div class="fridge-bin__items"></div>`;
      bin.addEventListener("click", () => placeSelectedIn(bin));
      bin.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          placeSelectedIn(bin);
        }
      });
      bins.push(bin);
      binGrid.append(bin);
    });

    const renderFridge = () => {
      sourceButtons.forEach((buttonElement, itemName) => {
        buttonElement.hidden = assignments.has(itemName);
      });
      bins.forEach((bin) => {
        const itemArea = bin.querySelector(".fridge-bin__items");
        itemArea.innerHTML = "";
        items.filter((item) => assignments.get(item.name) === bin.dataset.category).forEach((item) => {
          const placedButton = document.createElement("button");
          placedButton.type = "button";
          placedButton.className = "fridge-placed-item";
          placedButton.setAttribute("aria-label", `${item.name}を冷蔵庫から戻す`);
          placedButton.innerHTML = `${gameItemPicture(item)}<span>${item.name}</span>`;
          placedButton.addEventListener("click", (event) => {
            event.stopPropagation();
            assignments.delete(item.name);
            renderFridge();
            setMessage(`${item.name}を冷蔵庫から戻したよ。`, "hint");
          });
          itemArea.append(placedButton);
        });
        if (!itemArea.children.length) {
          itemArea.innerHTML = '<span class="fridge-empty">ここに運ぶ</span>';
        }
      });
    };

    items.forEach((item) => {
      const itemButton = document.createElement("button");
      itemButton.type = "button";
      itemButton.className = "food-button draggable-game-item";
      itemButton.setAttribute("aria-label", `${item.name}を冷蔵庫へ運ぶ`);
      itemButton.innerHTML = `${gameItemPicture(item)}<strong>${item.name}</strong><span>つかんで運ぶ</span>`;
      sourceButtons.set(item.name, itemButton);
      makeDraggableToZones(
        itemButton,
        item,
        () => bins,
        (droppedItem, bin) => assignItem(droppedItem, bin),
        (selected, selectedButton) => {
          sourceButtons.forEach((buttonElement) => buttonElement.classList.remove("selected"));
          selectedButton.classList.add("selected");
          selectedItem = selected;
          setMessage(`${selected.name}を選んだよ。仲間の冷蔵庫をタッチしよう。`, "hint");
        },
        gameItemPicture
      );
      sourceGrid.append(itemButton);
    });
    renderFridge();

    addCheckButton("OK！ おかたづけ完了", () => {
      const correct = assignments.size === items.length
        && items.every((item) => assignments.get(item.name) === item.category);
      if (correct) {
        completeLevel("野菜・果物・飲み物などを、正しい仲間に分けられました。");
      } else {
        fridge.classList.remove("needs-check");
        void fridge.offsetWidth;
        fridge.classList.add("needs-check");
        wrong("それぞれの食べ物が、どの仲間かもう一度考えてみよう！");
      }
    });
  }

  // 9. Restaurant checkout
  const MENU_ITEMS = [
    { name: "パン", emoji: "🍞", price: 10 },
    { name: "スープ", emoji: "🥣", price: 20 },
    { name: "サラダ", emoji: "🥗", price: 30 },
    { name: "ジュース", emoji: "🧃", price: 40 },
    { name: "カレー", emoji: "🍛", price: 50 },
    { name: "ハンバーガー", emoji: "🍔", price: 60 },
    { name: "パフェ", emoji: "🍨", price: 70 }
  ];

  function startCheckout() {
    const numberOfItems = currentLevel <= 2 ? 1 : currentLevel <= 4 ? 2 : 3;
    const availableItems = MENU_ITEMS.slice(0, Math.min(MENU_ITEMS.length, 2 + currentLevel));
    const order = shuffle(availableItems).slice(0, numberOfItems);
    const target = order.reduce((sum, item) => sum + item.price, 0);
    const coins = currentLevel <= 2 ? [10] : currentLevel <= 4 ? [10, 50] : [10, 50, 100];
    const usedCoins = [];
    refs.stage.innerHTML = makeOrder(
      order.map((item) => `${item.emoji}${item.name} ${item.price}円`).join(" ＋ "),
      `ぜんぶで ${target}円`
    );

    const instructions = document.createElement("p");
    instructions.className = "drag-instruction";
    instructions.innerHTML = "<strong>硬貨をつかんで、お会計トレイへ運ぼう！</strong><span>ぴったりの金額を作ってね。トレイの硬貨はタッチすると戻せます。</span>";
    refs.stage.append(instructions);

    const total = document.createElement("div");
    total.className = "money-total";
    total.textContent = `いま 0円 ／ ${target}円`;
    const layout = document.createElement("div");
    layout.className = "checkout-game-layout";
    const wallet = document.createElement("section");
    wallet.className = "checkout-wallet";
    wallet.innerHTML = "<h3>① 硬貨をえらぼう</h3>";
    const coinRow = document.createElement("div");
    coinRow.className = "checkout-coin-row";
    wallet.append(coinRow);
    const register = document.createElement("section");
    register.className = "checkout-register";
    register.innerHTML = "<h3>② お会計トレイに置こう</h3>";
    register.append(total);
    const paymentTray = document.createElement("div");
    paymentTray.className = "payment-tray";
    paymentTray.setAttribute("role", "group");
    paymentTray.setAttribute("aria-label", "お会計トレイ。まだ硬貨はありません");
    const paymentCoins = document.createElement("div");
    paymentCoins.className = "payment-tray__coins";
    paymentTray.append(paymentCoins);
    register.append(paymentTray);
    layout.append(wallet, register);
    refs.stage.append(layout);

    const paidTotal = () => usedCoins.reduce((sum, coin) => sum + coin.value, 0);
    const renderPayment = () => {
      const paid = paidTotal();
      total.textContent = `いま ${paid}円 ／ ${target}円`;
      paymentTray.setAttribute("aria-label", `お会計トレイ。いま${paid}円あります`);
      paymentCoins.innerHTML = "";
      if (!usedCoins.length) {
        paymentCoins.innerHTML = '<p class="drop-empty-message">ここに運んでね</p>';
        return;
      }
      usedCoins.forEach((coin, index) => {
        const coinButton = document.createElement("button");
        coinButton.type = "button";
        coinButton.className = `placed-coin placed-coin--${coin.value}`;
        coinButton.setAttribute("aria-label", `${coin.value}円を財布へ戻す`);
        coinButton.textContent = `${coin.value}円`;
        coinButton.addEventListener("click", () => {
          usedCoins.splice(index, 1);
          renderPayment();
          setMessage(`${coin.value}円を財布へ戻したよ。`, "hint");
        });
        paymentCoins.append(coinButton);
      });
    };

    coins.forEach((coin) => {
      const coinItem = { name: `${coin}円硬貨`, emoji: `${coin}`, value: coin };
      const coinButton = document.createElement("button");
      coinButton.type = "button";
      coinButton.className = `coin-button draggable-coin draggable-coin--${coin}`;
      coinButton.setAttribute("aria-label", `${coin}円硬貨をお会計トレイへ運ぶ`);
      coinButton.innerHTML = `<strong>${coin}</strong><span>円</span>`;
      makeDraggableItem(coinButton, coinItem, paymentTray, (droppedCoin) => {
        if (paidTotal() + droppedCoin.value > target + 100) {
          wrong("硬貨が多くなりすぎるよ。トレイの硬貨をタッチして戻そう！");
          return;
        }
        usedCoins.push({ ...droppedCoin });
        renderPayment();
        beep("ok");
        setMessage(`${droppedCoin.value}円をお会計トレイに置いたよ。`, "hint");
      }, gameItemPicture);
      coinRow.append(coinButton);
    });
    renderPayment();

    addCheckButton("OK！ お会計する", () => {
      const paid = paidTotal();
      if (paid === target) {
        completeLevel(`${target}円を、硬貨でぴったり支払えました。`);
      } else if (paid < target) {
        paymentTray.classList.remove("needs-check");
        void paymentTray.offsetWidth;
        paymentTray.classList.add("needs-check");
        wrong(`あと${target - paid}円だよ。硬貨を足してみよう！`);
      } else {
        paymentTray.classList.remove("needs-check");
        void paymentTray.offsetWidth;
        paymentTray.classList.add("needs-check");
        wrong(`${paid - target}円多いよ。硬貨を戻してぴったりにしよう！`);
      }
    });
  }

  refs.gameMenu.addEventListener("click", (event) => {
    const card = event.target.closest("[data-game]");
    if (card) openGame(card.dataset.game);
  });

  refs.levelDots.addEventListener("click", (event) => {
    const levelButton = event.target.closest("[data-level]");
    if (!levelButton || levelButton.disabled) return;
    currentLevel = Number(levelButton.dataset.level);
    refs.clearDialog.close?.();
    startCurrentGame();
  });

  refs.backToMenu.addEventListener("click", returnToMenu);
  refs.menuButton.addEventListener("click", returnToMenu);
  refs.nextLevelButton.addEventListener("click", () => {
    refs.clearDialog.close();
    currentLevel = Math.min(7, currentLevel + 1);
    startCurrentGame();
  });

  refs.challengeMode.addEventListener("change", () => {
    refs.challengeHelp.textContent = refs.challengeMode.checked
      ? "時間制限あり：レベルに合わせて24〜36秒で挑戦！"
      : CHALLENGE_OFF_TEXT;
    startCurrentGame();
  });

  refs.soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    refs.soundButton.textContent = soundEnabled ? "音 ON" : "音 OFF";
    refs.soundButton.setAttribute("aria-pressed", String(soundEnabled));
    if (soundEnabled) beep("ok");
  });

  refs.resetProgress.addEventListener("click", () => {
    refs.resetDialog.showModal();
  });

  refs.cancelReset.addEventListener("click", () => {
    refs.resetDialog.close();
  });

  refs.confirmReset.addEventListener("click", () => {
    refs.resetDialog.close();
    progress = Object.fromEntries(GAME_DEFS.map((game) => [game.id, 0]));
    saveProgress();
    renderMenu();
    setMessage("またレベル1から、ゆっくり楽しもう！", "hint");
  });

  renderMenu();
})();
