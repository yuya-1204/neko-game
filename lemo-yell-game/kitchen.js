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

  function makeDraggableDrink(buttonElement, drink, trayElement, onDrop) {
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
      const trayRect = trayElement.getBoundingClientRect();
      const isOverTray = !cancelled
        && event.clientX >= trayRect.left
        && event.clientX <= trayRect.right
        && event.clientY >= trayRect.top
        && event.clientY <= trayRect.bottom;

      buttonElement.classList.remove("is-dragging");
      trayElement.classList.remove("is-drop-target");
      dragGhost?.remove();
      dragGhost = null;
      activePointer = null;
      window.setTimeout(() => {
        suppressClick = false;
      }, 0);

      if (isOverTray) {
        onDrop(drink);
      }
    };

    buttonElement.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || activePointer !== null) return;
      event.preventDefault();
      suppressClick = true;
      activePointer = event.pointerId;
      buttonElement.setPointerCapture(event.pointerId);
      buttonElement.classList.add("is-dragging");
      trayElement.classList.add("is-drop-target");
      dragGhost = document.createElement("div");
      dragGhost.className = "drink-drag-ghost";
      dragGhost.innerHTML = `${drinkPicture(drink)}<strong>${drink.name}</strong>`;
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
      const trayRect = trayElement.getBoundingClientRect();
      trayElement.classList.toggle(
        "is-drag-over",
        event.clientX >= trayRect.left
          && event.clientX <= trayRect.right
          && event.clientY >= trayRect.top
          && event.clientY <= trayRect.bottom
      );
    });

    buttonElement.addEventListener("pointerup", (event) => {
      trayElement.classList.remove("is-drag-over");
      finishDrag(event);
    });

    buttonElement.addEventListener("pointercancel", (event) => {
      trayElement.classList.remove("is-drag-over");
      finishDrag(event, true);
    });

    buttonElement.addEventListener("click", (event) => {
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        return;
      }
      onDrop(drink);
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

    const customerArea = document.createElement("section");
    customerArea.className = "customer-tray-area";
    customerArea.setAttribute("aria-labelledby", "trayTitle");
    customerArea.innerHTML = `
      <h3 id="trayTitle">② お客さんのトレイにのせよう</h3>
      <div class="customer-picture">
        <img src="assets/lemomy.png" alt="トレイを持って待っているレモミィちゃん">
        <span>おねがいします♪</span>
      </div>`;
    const tray = document.createElement("div");
    tray.className = "serving-tray";
    tray.setAttribute("role", "group");
    tray.setAttribute("aria-label", "お客さんのトレイ。まだ飲み物はありません");
    const trayItems = document.createElement("div");
    trayItems.className = "serving-tray__items";
    tray.append(trayItems);

    const renderTray = () => {
      trayItems.innerHTML = "";
      tray.classList.toggle("is-empty", placedDrinks.length === 0);
      tray.setAttribute(
        "aria-label",
        placedDrinks.length
          ? `お客さんのトレイ。飲み物が${placedDrinks.length}杯あります`
          : "お客さんのトレイ。まだ飲み物はありません"
      );

      if (!placedDrinks.length) {
        trayItems.innerHTML = '<p class="tray-empty-message">ここに運んでね</p>';
        return;
      }

      placedDrinks.forEach((drink, index) => {
        const trayDrink = document.createElement("button");
        trayDrink.type = "button";
        trayDrink.className = "tray-drink";
        trayDrink.setAttribute("aria-label", `${drink.name}をトレイから戻す`);
        trayDrink.innerHTML = `${drinkPicture(drink)}<span>${drink.name}</span>`;
        trayDrink.addEventListener("click", () => {
          placedDrinks.splice(index, 1);
          renderTray();
          setMessage(`${drink.name}をトレイから戻したよ。`, "hint");
        });
        trayItems.append(trayDrink);
      });
    };

    DRINKS.forEach((drink) => {
      const drinkButton = document.createElement("button");
      drinkButton.type = "button";
      drinkButton.className = "draggable-drink";
      drinkButton.setAttribute("aria-label", `${drink.name}をトレイへ運ぶ`);
      drinkButton.innerHTML = `${drinkPicture(drink)}<strong>${drink.name}</strong><span>つかんで運ぶ</span>`;
      makeDraggableDrink(drinkButton, drink, tray, (droppedDrink) => {
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

  function startDrinkRecipe() {
    const drink = randomItem(DRINKS);
    const memorySeconds = currentLevel >= 6 ? (currentLevel === 6 ? 6 : 4) : null;
    const rounds = currentLevel === 7 ? 2 : 1;
    let round = 1;

    const runRound = () => {
      const targetDrink = round === 1 ? drink : randomItem(DRINKS.filter((item) => item.id !== drink.id));
      let selectedVessel = "";
      const selectedIngredients = new Set();
      const recipeId = `recipe-${Date.now()}`;
      refs.stage.innerHTML = makeOrder(
        `${targetDrink.name}を作ろう`,
        `<span id="${recipeId}">${targetDrink.vessel}・${targetDrink.ingredients.join("・")}</span>`
      );

      if (memorySeconds) {
        const timer = document.createElement("p");
        timer.className = "recipe-timer";
        timer.textContent = `${memorySeconds}秒で見本がかくれるよ`;
        refs.stage.append(timer);
        window.setTimeout(() => {
          const recipe = document.getElementById(recipeId);
          if (recipe) {
            recipe.textContent = "？？？（思い出して作ろう）";
            recipe.classList.add("hidden-recipe");
          }
          timer.remove();
        }, memorySeconds * 1000);
      }

      const vesselTitle = document.createElement("h3");
      vesselTitle.textContent = "① 入れ物をえらぼう";
      refs.stage.append(vesselTitle);
      const vesselGrid = document.createElement("div");
      vesselGrid.className = "choice-grid";
      shuffle(DRINKS).forEach((item) => {
        const itemButton = document.createElement("button");
        itemButton.type = "button";
        itemButton.className = "choice-button";
        itemButton.dataset.value = item.vessel;
        itemButton.innerHTML = `<span class="emoji">${item.emoji}</span>${item.vessel}`;
        itemButton.addEventListener("click", () => {
          vesselGrid.querySelectorAll("button").forEach((element) => element.classList.remove("selected"));
          itemButton.classList.add("selected");
          selectedVessel = item.vessel;
        });
        vesselGrid.append(itemButton);
      });
      refs.stage.append(vesselGrid);

      const ingredientsTitle = document.createElement("h3");
      ingredientsTitle.textContent = "② 材料をぜんぶえらぼう";
      refs.stage.append(ingredientsTitle);
      const allIngredients = [...new Set(DRINKS.flatMap((item) => item.ingredients))];
      const ingredientGrid = document.createElement("div");
      ingredientGrid.className = "choice-grid";
      shuffle(allIngredients).forEach((ingredient) => {
        const itemButton = document.createElement("button");
        itemButton.type = "button";
        itemButton.className = "choice-button";
        itemButton.dataset.value = ingredient;
        itemButton.textContent = ingredient;
        itemButton.addEventListener("click", () => {
          if (selectedIngredients.has(ingredient)) {
            selectedIngredients.delete(ingredient);
            itemButton.classList.remove("selected");
          } else {
            selectedIngredients.add(ingredient);
            itemButton.classList.add("selected");
          }
        });
        ingredientGrid.append(itemButton);
      });
      refs.stage.append(ingredientGrid);

      addCheckButton(rounds > 1 && round === 1 ? "1人目にわたす" : "できあがり！", () => {
        const ingredientCorrect = selectedIngredients.size === targetDrink.ingredients.length
          && targetDrink.ingredients.every((item) => selectedIngredients.has(item));
        if (selectedVessel === targetDrink.vessel && ingredientCorrect) {
          if (round < rounds) {
            beep("ok");
            round += 1;
            setMessage("1人目はぴったり！つぎのお客さんの分も作ろう。", "success");
            runRound();
          } else {
            completeLevel("入れ物と材料を正しく選んで、レモネードを作れました。");
          }
        } else {
          wrong("入れ物と材料を、レシピとくらべてみよう！");
        }
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
    let placed = [];
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

    const buildArea = document.createElement("div");
    buildArea.className = "build-area";
    const stack = document.createElement("div");
    stack.className = "stack";
    buildArea.append(stack);
    refs.stage.append(buildArea);

    const grid = document.createElement("div");
    grid.className = "choice-grid";
    const candidateCount = Math.min(Object.keys(layerMap).length, recipe.length + Math.max(1, currentLevel - 2));
    const candidates = shuffle([...new Set([...recipe, ...shuffle(Object.keys(layerMap))])]).slice(0, candidateCount);
    recipe.forEach((item) => {
      if (!candidates.includes(item)) candidates.push(item);
    });
    shuffle(candidates).forEach((name) => {
      const item = layerMap[name];
      const itemButton = document.createElement("button");
      itemButton.type = "button";
      itemButton.className = "food-button";
      itemButton.innerHTML = `<span class="emoji">${item.emoji}</span>${name}`;
      itemButton.addEventListener("click", () => {
        const expected = recipe[placed.length];
        if (name !== expected) {
          itemButton.classList.add("wrong");
          window.setTimeout(() => itemButton.classList.remove("wrong"), 450);
          wrong(`もう一度、注文を見てみよう！つぎは「${expected}」だよ。`);
          return;
        }
        placed.push(name);
        const layer = document.createElement("div");
        layer.className = `stack-layer ${item.className || ""}`;
        layer.style.setProperty("--layer-color", item.color);
        layer.style.setProperty("--layer-width", item.width);
        layer.textContent = `${item.emoji} ${name}`;
        stack.append(layer);
        beep("ok");
        if (placed.length === recipe.length) {
          window.setTimeout(() => completeLevel(completeText), 350);
        }
      });
      grid.append(itemButton);
    });
    refs.stage.append(grid);

    const undo = document.createElement("button");
    undo.type = "button";
    undo.className = "text-button";
    undo.textContent = "ひとつ戻す";
    undo.addEventListener("click", () => {
      if (!placed.length) return;
      placed.pop();
      stack.lastElementChild?.remove();
    });
    refs.stage.append(undo);
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
    const selected = new Set();
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

    const grid = document.createElement("div");
    grid.className = "choice-grid";
    candidates.forEach((item) => {
      const itemButton = document.createElement("button");
      itemButton.type = "button";
      itemButton.className = "food-button";
      itemButton.innerHTML = `<span class="emoji">${item.emoji}</span>${item.name}`;
      itemButton.addEventListener("click", () => {
        if (selected.has(item.name)) {
          selected.delete(item.name);
          itemButton.classList.remove("selected");
        } else {
          selected.add(item.name);
          itemButton.classList.add("selected");
        }
      });
      grid.append(itemButton);
    });
    refs.stage.append(grid);
    addCheckButton("これでカレーを作る", () => {
      const correct = selected.size === recipe.length && recipe.every((item) => selected.has(item.name));
      if (correct) {
        completeLevel("調理場面を思い出して、使った具材を全部見つけられました。");
      } else {
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

    const tray = document.createElement("div");
    tray.className = "tray-grid";
    target.forEach((item, index) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "tray-slot";
      slot.dataset.index = String(index);
      slot.innerHTML = `<small>${item.slot}</small><span>ここに入れる</span>`;
      slot.addEventListener("click", () => {
        if (!selectedFood || filled.has(index)) return;
        if (selectedFood.name !== item.food.name) {
          wrong(`${item.slot}には、どのおかずだったかな？注文カードを見てみよう！`);
          return;
        }
        filled.set(index, selectedFood);
        slot.classList.add("filled");
        slot.innerHTML = `<span>${selectedFood.emoji}</span><small>${selectedFood.name}</small>`;
        beep("ok");
        if (filled.size === target.length) {
          window.setTimeout(() => completeLevel("指定された場所に、すべてのおかずをつめられました。"), 350);
        }
      });
      tray.append(slot);
    });
    refs.stage.append(tray);

    const grid = document.createElement("div");
    grid.className = "choice-grid";
    shuffle([...foods, ...shuffle(BENTO_FOODS.filter((item) => !foods.includes(item))).slice(0, Math.max(0, currentLevel - 3))]).forEach((food) => {
      const foodButton = document.createElement("button");
      foodButton.type = "button";
      foodButton.className = "food-button";
      foodButton.innerHTML = `<span class="emoji">${food.emoji}</span>${food.name}`;
      foodButton.addEventListener("click", () => {
        grid.querySelectorAll("button").forEach((element) => element.classList.remove("selected"));
        foodButton.classList.add("selected");
        selectedFood = food;
        setMessage(`${food.name}を選んだよ。入れる場所をタップしよう。`, "hint");
      });
      grid.append(foodButton);
    });
    refs.stage.append(grid);
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
    refs.stage.innerHTML = makeOrder(
      `ピザ${config.total}切れを、${config.people}人に同じ数ずつ分けよう`,
      currentLevel >= 5 ? "あまるピザがあるかもしれないよ" : ""
    );
    const pizza = document.createElement("div");
    pizza.className = "plate-row";
    pizza.innerHTML = Array.from({ length: config.total }, () => '<span class="person-plate" aria-hidden="true">🍕</span>').join("");
    refs.stage.append(pizza);
    const people = document.createElement("div");
    people.className = "people-row";
    people.innerHTML = Array.from({ length: config.people }, (_, i) => `<div class="person-plate">🙂<small>${i + 1}人目</small></div>`).join("");
    refs.stage.append(people);

    const question = document.createElement("h3");
    question.textContent = "1人に何切れずつ？";
    question.style.textAlign = "center";
    refs.stage.append(question);
    const choices = shuffle([...new Set([perPerson, perPerson + 1, Math.max(0, perPerson - 1), perPerson + 2])]);
    const grid = document.createElement("div");
    grid.className = "choice-grid";
    let chosenPerPerson = null;
    choices.forEach((number) => {
      const numberButton = document.createElement("button");
      numberButton.type = "button";
      numberButton.className = "choice-button";
      numberButton.textContent = `${number}切れ`;
      numberButton.addEventListener("click", () => {
        grid.querySelectorAll("button").forEach((element) => element.classList.remove("selected"));
        numberButton.classList.add("selected");
        chosenPerPerson = number;
      });
      grid.append(numberButton);
    });
    refs.stage.append(grid);

    let chosenRemainder = 0;
    if (currentLevel >= 5) {
      const remainderArea = document.createElement("div");
      remainderArea.innerHTML = `<h3 style="text-align:center">あまりは何切れ？</h3>
        <div class="count-control">
          <button type="button" data-change="-1" aria-label="あまりを1減らす">−</button>
          <output>0</output>
          <button type="button" data-change="1" aria-label="あまりを1増やす">＋</button>
        </div>`;
      remainderArea.querySelectorAll("[data-change]").forEach((control) => {
        control.addEventListener("click", () => {
          chosenRemainder = Math.max(0, Math.min(5, chosenRemainder + Number(control.dataset.change)));
          remainderArea.querySelector("output").textContent = chosenRemainder;
        });
      });
      refs.stage.append(remainderArea);
    }
    addCheckButton("分けてみる", () => {
      if (chosenPerPerson === perPerson && chosenRemainder === remainder) {
        completeLevel(`${config.people}人に${perPerson}切れずつ、あまり${remainder}切れに分けられました。`);
      } else {
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
    const selected = new Set();
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
    const grid = document.createElement("div");
    grid.className = "choice-grid";
    shuffle(candidates).forEach((item) => {
      const itemButton = document.createElement("button");
      itemButton.type = "button";
      itemButton.className = "food-button";
      itemButton.innerHTML = `<span class="emoji">${item.emoji}</span>${item.name}<small>${currentLevel <= 3 ? item.category : ""}</small>`;
      itemButton.addEventListener("click", () => {
        if (selected.has(item.name)) {
          selected.delete(item.name);
          itemButton.classList.remove("selected");
        } else {
          selected.add(item.name);
          itemButton.classList.add("selected");
        }
      });
      grid.append(itemButton);
    });
    refs.stage.append(grid);
    addCheckButton("いただきます！", () => {
      const selectedItems = BREAKFAST_ITEMS.filter((item) => selected.has(item.name));
      const counts = selectedItems.reduce((map, item) => {
        map[item.category] = (map[item.category] || 0) + 1;
        return map;
      }, {});
      const correct = Object.entries(requirements).every(([category, count]) => counts[category] === count)
        && selectedItems.length === Object.values(requirements).reduce((sum, value) => sum + value, 0);
      if (correct) {
        completeLevel("主食・おかず・飲み物などを、注文どおりに組み合わせられました。");
      } else {
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
    let currentIndex = 0;
    refs.stage.innerHTML = makeOrder(`${items.length}この食べ物を、仲間ごとにかたづけよう`);
    const current = document.createElement("div");
    current.className = "classification-current";
    const label = document.createElement("p");
    label.style.textAlign = "center";
    label.style.fontWeight = "900";
    const categoryRow = document.createElement("div");
    categoryRow.className = "category-row";
    refs.stage.append(current, label, categoryRow);

    const showNext = () => {
      const item = items[currentIndex];
      current.textContent = item.emoji;
      label.textContent = `${item.name}は、どの仲間？（${currentIndex + 1} / ${items.length}）`;
    };

    categories.forEach((category) => {
      const categoryButton = document.createElement("button");
      categoryButton.type = "button";
      categoryButton.className = "category-button";
      categoryButton.textContent = category;
      categoryButton.addEventListener("click", () => {
        const item = items[currentIndex];
        if (category !== item.category) {
          wrong(`${item.name}は「${category}」の仲間かな？もう一度考えてみよう！`);
          return;
        }
        beep("ok");
        currentIndex += 1;
        if (currentIndex >= items.length) {
          completeLevel("野菜・果物・飲み物などを、正しい仲間に分けられました。");
        } else {
          showNext();
        }
      });
      categoryRow.append(categoryButton);
    });
    showNext();
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
    let paid = 0;
    const usedCoins = [];
    refs.stage.innerHTML = makeOrder(
      order.map((item) => `${item.emoji}${item.name} ${item.price}円`).join(" ＋ "),
      `ぜんぶで ${target}円`
    );
    const total = document.createElement("div");
    total.className = "money-total";
    total.textContent = `いま 0円 ／ ${target}円`;
    refs.stage.append(total);
    const coinRow = document.createElement("div");
    coinRow.className = "coin-row";
    coins.forEach((coin) => {
      const coinButton = document.createElement("button");
      coinButton.type = "button";
      coinButton.className = "coin-button";
      coinButton.textContent = `${coin}円`;
      coinButton.addEventListener("click", () => {
        if (paid + coin > target + 100) return;
        paid += coin;
        usedCoins.push(coin);
        total.textContent = `いま ${paid}円 ／ ${target}円`;
        beep("ok");
      });
      coinRow.append(coinButton);
    });
    refs.stage.append(coinRow);
    const undo = document.createElement("button");
    undo.type = "button";
    undo.className = "text-button";
    undo.textContent = "硬貨をひとつ戻す";
    undo.addEventListener("click", () => {
      if (!usedCoins.length) return;
      paid -= usedCoins.pop();
      total.textContent = `いま ${paid}円 ／ ${target}円`;
    });
    refs.stage.append(undo);
    addCheckButton("お会計する", () => {
      if (paid === target) {
        completeLevel(`${target}円を、硬貨でぴったり支払えました。`);
      } else if (paid < target) {
        wrong(`あと${target - paid}円だよ。硬貨を足してみよう！`);
      } else {
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
