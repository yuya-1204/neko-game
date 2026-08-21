(function () {
  "use strict";

  const Core = window.ReversiCore;
  if (!Core) throw new Error("ReversiCore was not loaded.");

  const STORAGE_KEY = "nekoReversiV1";
  const VOICES = {
    RULE_01: { file: "voice/rules_01.wav", text: "きみは茶色のネコ、AIは灰色のネコです。まんなかの4つのコマから始めます。" },
    RULE_02: { file: "voice/rules_02.wav", text: "相手のネコを、たて、よこ、ななめに、自分のネコではさめるところへ置きます。" },
    RULE_03: { file: "voice/rules_03.wav", text: "はさんだネコは、くるりんとひっくりかえって、自分の仲間になります。" },
    RULE_04: { file: "voice/rules_04.wav", text: "置けるところには肉球が光ります。置けるところがないときは、自動でパスします。" },
    RULE_05: { file: "voice/rules_05.wav", text: "ふたりとも置けなくなったらおしまいです。ネコが多いほうの勝ち。AIに勝つと、おさかなを1ぴきもらえます。" },
    PASS: { file: "voice/pass.wav", text: "置けるところがないので、パスします。つぎのネコの番です。" },
    WIN_FISH: { file: "voice/win_fish.wav", text: "やったね。AIに勝ちました。おさかなを1ぴきもらえます。" },
    LOSE: { file: "voice/lose.wav", text: "さいごまで、よく考えました。もういちど遊ぶと、もっと上手になります。" },
    DRAW: { file: "voice/draw.wav", text: "同じ数で引き分けです。とってもいい勝負でした。" },
    MATCH_WIN: { file: "voice/match_win.wav", text: "2かい勝って、2本先取のゆうしょうです。おめでとう。" }
  };

  const RULE_STEPS = [
    { voice: "RULE_01", visual: "start" },
    { voice: "RULE_02", visual: "sandwich" },
    { voice: "RULE_03", visual: "flip" },
    { voice: "RULE_04", visual: "paws" },
    { voice: "RULE_05", visual: "finish" }
  ];

  const $ = (id) => document.getElementById(id);
  const dom = {
    titleScreen: $("titleScreen"), gameScreen: $("gameScreen"),
    homeBtn: $("homeBtn"), fishCount: $("fishCount"), fishMessage: $("fishMessage"), fishShelf: $("fishShelf"), soundBtn: $("soundBtn"),
    rulesBtn: $("rulesBtn"), practiceBtn: $("practiceBtn"), matchBtn: $("matchBtn"),
    gameModeLabel: $("gameModeLabel"), gameModeTitle: $("gameModeTitle"), seriesScore: $("seriesScore"), humanWins: $("humanWins"), aiWins: $("aiWins"),
    turnCard: $("turnCard"), turnCat: $("turnCat"), turnText: $("turnText"), humanCount: $("humanCount"), aiCount: $("aiCount"), statusMessage: $("statusMessage"),
    hintBtn: $("hintBtn"), gameRulesBtn: $("gameRulesBtn"), board: $("board"), quitBtn: $("quitBtn"),
    rulesOverlay: $("rulesOverlay"), closeRulesBtn: $("closeRulesBtn"), ruleProgressText: $("ruleProgressText"), ruleProgressBar: $("ruleProgressBar"),
    ruleVisual: $("ruleVisual"), ruleSubtitle: $("ruleSubtitle"), voiceStatus: $("voiceStatus"), rulePrevBtn: $("rulePrevBtn"), ruleReplayBtn: $("ruleReplayBtn"), ruleNextBtn: $("ruleNextBtn"), skipRulesBtn: $("skipRulesBtn"),
    resultOverlay: $("resultOverlay"), resultBadge: $("resultBadge"), resultKicker: $("resultKicker"), resultTitle: $("resultTitle"), resultCounts: $("resultCounts"),
    fishReward: $("fishReward"), resultMessage: $("resultMessage"), resultSeries: $("resultSeries"), resultPrimaryBtn: $("resultPrimaryBtn"), resultHomeBtn: $("resultHomeBtn"),
    confirmOverlay: $("confirmOverlay"), confirmQuitBtn: $("confirmQuitBtn"), cancelQuitBtn: $("cancelQuitBtn"), fishBurst: $("fishBurst")
  };

  const defaultSave = () => ({
    version: 1,
    fish: 0,
    soundOn: true,
    tutorialSeen: false,
    stats: { humanWins: 0, aiWins: 0, draws: 0 },
    rewardedRounds: []
  });

  function loadSave() {
    const base = defaultSave();
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!raw || typeof raw !== "object") return base;
      base.fish = Math.max(0, Math.min(9999, Math.floor(Number(raw.fish) || 0)));
      base.soundOn = raw.soundOn !== false;
      base.tutorialSeen = raw.tutorialSeen === true;
      if (raw.stats && typeof raw.stats === "object") {
        for (const key of ["humanWins", "aiWins", "draws"]) {
          base.stats[key] = Math.max(0, Math.floor(Number(raw.stats[key]) || 0));
        }
      }
      if (Array.isArray(raw.rewardedRounds)) {
        base.rewardedRounds = raw.rewardedRounds.filter((x) => typeof x === "string").slice(-40);
      }
      return base;
    } catch (error) {
      return base;
    }
  }

  let save = loadSave();
  let series = null;
  let board = null;
  let turn = Core.HUMAN;
  let phase = "title";
  let difficulty = "normal";
  let seriesId = "";
  let roundHistory = [];
  let hintCell = null;
  let roundTimer = 0;
  let rulesIndex = 0;
  let afterRules = null;
  let currentVoice = null;
  let audioContext = null;
  let lastFocusedCell = null;

  function writeSave() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch (error) { /* Play without persistence. */ }
  }

  function updateCollection() {
    dom.fishCount.textContent = String(save.fish);
    dom.fishShelf.replaceChildren();
    const shown = Math.min(save.fish, 7);
    for (let index = 0; index < shown; index += 1) {
      const fish = document.createElement("span");
      fish.textContent = index % 3 === 1 ? "🐠" : "🐟";
      fish.setAttribute("aria-hidden", "true");
      dom.fishShelf.appendChild(fish);
    }
    if (save.fish > shown) {
      const more = document.createElement("span");
      more.className = "more-fish";
      more.textContent = `＋${save.fish - shown}`;
      dom.fishShelf.appendChild(more);
    }
    if (save.fish === 0) dom.fishMessage.textContent = "さいしょの1ぴきを つかまえよう！";
    else if (save.fish < 5) dom.fishMessage.textContent = `${save.fish}ひき あつまったよ。つぎもねらおう！`;
    else dom.fishMessage.textContent = `${save.fish}ひき！ ネコたちも おおよろこび。`;
  }

  function unlockAudio() {
    if (!save.soundOn) return null;
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    } catch (error) { audioContext = null; }
    return audioContext;
  }

  function tone(frequency, duration, delay, type, volume) {
    const context = unlockAudio();
    if (!context) return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + (delay || 0);
      oscillator.type = type || "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(volume || .05, start);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + .03);
    } catch (error) { /* Sound effects are optional. */ }
  }

  function sfx(name) {
    if (!save.soundOn) return;
    if (name === "move") { tone(330, .08, 0, "triangle", .06); tone(440, .09, .07, "triangle", .05); }
    if (name === "flip") { tone(520, .07, 0, "sine", .04); tone(690, .08, .07, "sine", .04); }
    if (name === "hint") { tone(660, .08, 0, "sine", .05); tone(880, .12, .08, "sine", .05); }
    if (name === "win") [523, 659, 784, 1047].forEach((f, i) => tone(f, .15, i * .1, "triangle", .06));
    if (name === "tap") tone(470, .06, 0, "sine", .035);
  }

  function stopVoice() {
    if (!currentVoice) return;
    try { currentVoice.pause(); currentVoice.currentTime = 0; } catch (error) { /* Ignore. */ }
    currentVoice = null;
  }

  function playVoice(id) {
    stopVoice();
    const line = VOICES[id];
    if (!line || !save.soundOn) {
      if (!save.soundOn && !dom.rulesOverlay.hidden) {
        dom.voiceStatus.textContent = "おとはオフです。字幕で読めます。";
        dom.voiceStatus.classList.remove("playing");
      }
      return;
    }
    unlockAudio();
    const audio = new Audio(line.file);
    audio.preload = "auto";
    audio.volume = .95;
    currentVoice = audio;
    if (!dom.rulesOverlay.hidden) {
      dom.voiceStatus.textContent = "ネコ先生がおはなし中…";
      dom.voiceStatus.classList.add("playing");
    }
    const finish = () => {
      if (currentVoice === audio) currentVoice = null;
      if (!dom.rulesOverlay.hidden) {
        dom.voiceStatus.textContent = "字幕でも読めます";
        dom.voiceStatus.classList.remove("playing");
      }
    };
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    audio.play().catch(finish);
  }

  function setSound(on) {
    save.soundOn = Boolean(on);
    if (!save.soundOn) stopVoice();
    writeSave();
    dom.soundBtn.setAttribute("aria-pressed", String(save.soundOn));
    dom.soundBtn.textContent = save.soundOn ? "🔊 おと" : "🔇 おと";
    if (save.soundOn) { unlockAudio(); sfx("tap"); }
    if (!dom.rulesOverlay.hidden) renderRuleStep(true);
  }

  function showScreen(name) {
    const game = name === "game";
    dom.titleScreen.hidden = game;
    dom.gameScreen.hidden = !game;
    if (!game) {
      phase = "title";
      series = null;
      board = null;
      clearTimeout(roundTimer);
      stopVoice();
      updateCollection();
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  function chosenDifficulty() {
    const selected = document.querySelector('input[name="difficulty"]:checked');
    return selected ? selected.value : "normal";
  }

  function requestSeries(mode) {
    unlockAudio();
    sfx("tap");
    if (!save.tutorialSeen) {
      openRules(() => startSeries(mode));
    } else {
      startSeries(mode);
    }
  }

  function startSeries(mode) {
    stopVoice();
    dom.resultOverlay.hidden = true;
    dom.confirmOverlay.hidden = true;
    series = Core.createSeries(mode);
    difficulty = mode === "practice" ? "practice" : chosenDifficulty();
    seriesId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    roundHistory = [];
    showScreen("game");
    startRound();
  }

  function difficultyLabel(value) {
    return { practice: "やさしい", easy: "やさしい", normal: "ふつう", hard: "つよい" }[value] || "ふつう";
  }

  function startRound() {
    clearTimeout(roundTimer);
    hintCell = null;
    lastFocusedCell = null;
    board = Core.createBoard(series.boardSize);
    turn = Core.HUMAN;
    phase = "player";
    dom.gameModeLabel.textContent = series.mode === "practice" ? "れんしゅう・やさしいAI" : `2ほん先取・${difficultyLabel(difficulty)}AI`;
    dom.gameModeTitle.textContent = series.mode === "practice" ? "6×6・1かいしょうぶ" : `8×8・${series.round}かいめ`;
    dom.seriesScore.hidden = series.mode === "practice";
    updateSeriesScore();
    renderBoard();
    setTurnDisplay(Core.HUMAN, "光っている肉球においてね。");
    dom.hintBtn.textContent = series.mode === "practice" ? "✨ おすすめをみる" : "✨ ヒントをみる";
    dom.board.querySelector(".board-cell.legal")?.focus({ preventScroll: true });
  }

  function updateSeriesScore() {
    if (!series) return;
    dom.humanWins.textContent = String(series.humanWins);
    dom.aiWins.textContent = String(series.aiWins);
  }

  function createPiece(player, animationClass) {
    const piece = document.createElement("span");
    piece.className = `piece ${player === Core.HUMAN ? "human" : "ai"}${animationClass ? ` ${animationClass}` : ""}`;
    piece.setAttribute("aria-hidden", "true");
    const face = document.createElement("span");
    face.className = "piece-face";
    face.textContent = player === Core.HUMAN ? "•ᴗ•" : "•ω•";
    piece.appendChild(face);
    return piece;
  }

  function cellLabel(row, col, value, legal) {
    const pos = `${row + 1}だん ${col + 1}ばん`;
    if (value === Core.HUMAN) return `${pos}、きみの茶色いネコ`;
    if (value === Core.AI) return `${pos}、AIの灰色のネコ`;
    return legal ? `${pos}、ここにおけます` : `${pos}、あきマス`;
  }

  function sameCell(cell, row, col) {
    return cell && cell.row === row && cell.col === col;
  }

  function renderBoard(animation) {
    if (!board) return;
    const legalMoves = phase === "player" && turn === Core.HUMAN ? Core.getLegalMoves(board, Core.HUMAN) : [];
    const legalMap = new Map(legalMoves.map((move) => [`${move.row},${move.col}`, move]));
    dom.board.style.setProperty("--size", String(board.length));
    dom.board.setAttribute("aria-rowcount", String(board.length));
    dom.board.setAttribute("aria-colcount", String(board.length));
    dom.board.replaceChildren();

    let firstLegal = true;
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board.length; col += 1) {
        const value = board[row][col];
        const legal = legalMap.has(`${row},${col}`);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "board-cell";
        button.dataset.row = String(row);
        button.dataset.col = String(col);
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-rowindex", String(row + 1));
        button.setAttribute("aria-colindex", String(col + 1));
        button.setAttribute("aria-label", cellLabel(row, col, value, legal));
        if (legal) {
          button.classList.add("legal");
          button.tabIndex = firstLegal ? 0 : -1;
          firstLegal = false;
          button.addEventListener("click", () => humanMove(row, col));
        } else {
          button.disabled = true;
          button.tabIndex = -1;
        }
        if (sameCell(hintCell, row, col)) button.classList.add("hinted");
        if (value !== Core.EMPTY) {
          let animationClass = "";
          if (animation && sameCell(animation.placed, row, col)) animationClass = "just-placed";
          else if (animation && animation.flipped?.some(([r, c]) => r === row && c === col)) animationClass = "just-flipped";
          button.appendChild(createPiece(value, animationClass));
        }
        dom.board.appendChild(button);
      }
    }
    updateCounts();
  }

  function updateCounts() {
    if (!board) return;
    const counts = Core.countPieces(board);
    dom.humanCount.textContent = String(counts.human);
    dom.aiCount.textContent = String(counts.ai);
  }

  function setTurnDisplay(player, message, thinking) {
    const human = player === Core.HUMAN;
    dom.turnCard.classList.toggle("player-turn", human);
    dom.turnCard.classList.toggle("ai-turn", !human);
    dom.turnCard.classList.toggle("thinking", Boolean(thinking));
    dom.turnCat.classList.toggle("orange", human);
    dom.turnCat.classList.toggle("gray", !human);
    dom.turnCat.querySelector("span").textContent = human ? "•ᴗ•" : "•ω•";
    dom.turnText.textContent = thinking ? "AIが かんがえ中" : (human ? "きみの ばん" : "AIの ばん");
    dom.statusMessage.textContent = message;
  }

  function humanMove(row, col) {
    if (phase !== "player" || turn !== Core.HUMAN) return;
    unlockAudio();
    const result = Core.applyMove(board, row, col, Core.HUMAN);
    if (!result) return;
    phase = "animating";
    hintCell = null;
    board = result.board;
    sfx("move");
    if (result.flips.length) setTimeout(() => sfx("flip"), 100);
    renderBoard({ placed: { row, col }, flipped: result.flips });
    setTurnDisplay(Core.HUMAN, `${result.flips.length}ひき くるりん！`);
    roundTimer = window.setTimeout(() => advanceTurn(Core.AI), 590);
  }

  function advanceTurn(nextPlayer) {
    if (!board || phase === "result" || phase === "title") return;
    if (Core.isGameOver(board)) { finishRound(); return; }
    const moves = Core.getLegalMoves(board, nextPlayer);
    if (!moves.length) {
      const label = nextPlayer === Core.HUMAN ? "きみ" : "AI";
      phase = "pass";
      turn = nextPlayer;
      renderBoard();
      setTurnDisplay(nextPlayer, `${label}は おけるところがないので パス！`);
      playVoice("PASS");
      roundTimer = window.setTimeout(() => advanceTurn(Core.otherPlayer(nextPlayer)), 1250);
      return;
    }

    turn = nextPlayer;
    if (nextPlayer === Core.AI) {
      phase = "ai";
      renderBoard();
      setTurnDisplay(Core.AI, "どこにおこうかな…", true);
      roundTimer = window.setTimeout(makeAIMove, 560);
    } else {
      phase = "player";
      renderBoard();
      setTurnDisplay(Core.HUMAN, "光っている肉球においてね。");
      const target = lastFocusedCell
        ? dom.board.querySelector(`[data-row="${lastFocusedCell.row}"][data-col="${lastFocusedCell.col}"]:not(:disabled)`)
        : null;
      (target || dom.board.querySelector(".board-cell.legal"))?.focus({ preventScroll: true });
    }
  }

  function makeAIMove() {
    if (phase !== "ai" || turn !== Core.AI || !board) return;
    let move = null;
    try { move = Core.chooseAIMove(board, { difficulty }); } catch (error) { move = null; }
    const legal = Core.getLegalMoves(board, Core.AI);
    if (!move || !legal.some((item) => item.row === move.row && item.col === move.col)) move = legal[0] || null;
    if (!move) { advanceTurn(Core.HUMAN); return; }
    const result = Core.applyMove(board, move.row, move.col, Core.AI);
    if (!result) { advanceTurn(Core.HUMAN); return; }
    phase = "animating";
    board = result.board;
    sfx("move");
    if (result.flips.length) setTimeout(() => sfx("flip"), 100);
    renderBoard({ placed: { row: move.row, col: move.col }, flipped: result.flips });
    setTurnDisplay(Core.AI, `AIが ${result.flips.length}ひき くるりん！`);
    roundTimer = window.setTimeout(() => advanceTurn(Core.HUMAN), 620);
  }

  function showHint() {
    if (phase !== "player" || turn !== Core.HUMAN || !board) {
      dom.statusMessage.textContent = "きみの番になったら、ヒントを見られるよ。";
      return;
    }
    const move = Core.suggestMove(board, Core.HUMAN);
    if (!move) return;
    hintCell = { row: move.row, col: move.col };
    lastFocusedCell = hintCell;
    renderBoard();
    dom.statusMessage.textContent = "キラキラのマスがおすすめだよ。ほかの肉球でもだいじょうぶ！";
    sfx("hint");
    dom.board.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`)?.focus({ preventScroll: true });
  }

  function rewardFish(roundKey) {
    if (save.rewardedRounds.includes(roundKey)) return false;
    save.rewardedRounds.push(roundKey);
    save.rewardedRounds = save.rewardedRounds.slice(-40);
    save.fish += 1;
    writeSave();
    updateCollection();
    return true;
  }

  function finishRound() {
    if (!board || phase === "result") return;
    phase = "result";
    stopVoice();
    const counts = Core.countPieces(board);
    const winner = Core.getWinner(board);
    const resolved = Core.resolveRound(series, winner);
    series = resolved.series;
    updateSeriesScore();
    roundHistory.push(winner);

    if (winner === "human") save.stats.humanWins += 1;
    else if (winner === "ai") save.stats.aiWins += 1;
    else save.stats.draws += 1;

    const roundKey = `${seriesId}:${series.round}`;
    const newlyRewarded = resolved.fishAward === 1 ? rewardFish(roundKey) : false;
    writeSave();
    renderBoard();
    setTurnDisplay(winner === "ai" ? Core.AI : Core.HUMAN, "しょうぶが おわりました！");
    roundTimer = window.setTimeout(() => showResult(winner, counts, resolved, newlyRewarded), 520);
  }

  function showResult(winner, counts, resolved, newlyRewarded) {
    dom.resultKicker.textContent = series.mode === "practice" ? "れんしゅうの けっか" : `${series.round}かいめの けっか`;
    dom.resultCounts.textContent = `きみ ${counts.human}ひき　―　AI ${counts.ai}ひき`;
    dom.fishReward.hidden = !newlyRewarded;
    dom.resultSeries.replaceChildren();
    roundHistory.forEach((item) => {
      const dot = document.createElement("span");
      dot.className = `series-dot ${item}`;
      dot.textContent = item === "human" ? "🐱" : item === "ai" ? "🤖" : "△";
      dot.setAttribute("aria-label", item === "human" ? "きみの勝ち" : item === "ai" ? "AIの勝ち" : "引き分け");
      dom.resultSeries.appendChild(dot);
    });
    dom.resultSeries.hidden = series.mode === "practice";

    if (winner === "human") {
      dom.resultBadge.textContent = "★";
      dom.resultTitle.textContent = "きみの かち！";
      dom.resultMessage.textContent = resolved.matchOver && series.mode === "match" ? "2かい勝って、ゆうしょうだよ！" : "じょうずにはさんで、AIに勝ったね！";
      sfx("win");
      playVoice(resolved.matchOver && series.mode === "match" ? "MATCH_WIN" : "WIN_FISH");
      if (newlyRewarded) burstFish();
    } else if (winner === "ai") {
      dom.resultBadge.textContent = "🐾";
      dom.resultTitle.textContent = "AIの かち";
      dom.resultMessage.textContent = "さいごまで、よく考えたね。つぎは角をねらってみよう！";
      playVoice("LOSE");
    } else {
      dom.resultBadge.textContent = "△";
      dom.resultTitle.textContent = "ひきわけ！";
      dom.resultMessage.textContent = "おなじ数になったよ。とってもいいしょうぶ！";
      playVoice("DRAW");
    }

    if (series.mode === "practice") {
      dom.resultPrimaryBtn.textContent = "もういちど れんしゅう";
      dom.resultPrimaryBtn.onclick = () => startSeries("practice");
    } else if (resolved.matchOver) {
      dom.resultKicker.textContent = series.humanWins >= 2 ? "2ほん先取・ゆうしょう" : "2ほん先取・けっか";
      if (series.aiWins >= 2) dom.resultMessage.textContent = "AIが2かい先に勝ったよ。またちょうせんしてね！";
      dom.resultPrimaryBtn.textContent = "もういちど 2ほん先取";
      dom.resultPrimaryBtn.onclick = () => startSeries("match");
    } else {
      dom.resultMessage.textContent += `　いまは ${series.humanWins}たい${series.aiWins}。`;
      dom.resultPrimaryBtn.textContent = `${series.round + 1}かいめへ`;
      dom.resultPrimaryBtn.onclick = () => {
        stopVoice();
        dom.resultOverlay.hidden = true;
        series.round += 1;
        startRound();
      };
    }
    dom.resultOverlay.hidden = false;
    dom.resultPrimaryBtn.focus({ preventScroll: true });
  }

  function burstFish() {
    dom.fishBurst.replaceChildren();
    const icons = ["🐟", "✨", "🐠", "★", "🐟", "✨", "🐟", "★"];
    icons.forEach((icon, index) => {
      const item = document.createElement("span");
      item.className = "burst-item";
      item.textContent = icon;
      const angle = (Math.PI * 2 * index) / icons.length;
      const distance = 110 + (index % 3) * 35;
      item.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
      item.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
      item.style.setProperty("--r", `${index * 77 - 220}deg`);
      dom.fishBurst.appendChild(item);
    });
    setTimeout(() => dom.fishBurst.replaceChildren(), 1500);
  }

  function miniPiece(player, flipped) {
    return `<span class="piece ${player}${flipped ? " just-flipped" : ""}"><span class="piece-face">${player === "human" ? "•ᴗ•" : "•ω•"}</span></span>`;
  }

  function miniBoard(cells) {
    return `<div class="rule-mini-board">${cells.map((cell) => `<i class="rule-mini-cell">${cell || ""}</i>`).join("")}</div>`;
  }

  function ruleVisual(type) {
    const H = miniPiece("human");
    const A = miniPiece("ai");
    if (type === "start") {
      const cells = Array(16).fill("");
      cells[5] = A; cells[6] = H; cells[9] = H; cells[10] = A;
      return miniBoard(cells);
    }
    if (type === "sandwich") {
      const cells = Array(16).fill("");
      cells[8] = H; cells[9] = A; cells[10] = A; cells[11] = `<span class="rule-paw">🐾</span><span class="rule-arrow">←</span>`;
      return miniBoard(cells);
    }
    if (type === "flip") {
      const cells = Array(16).fill("");
      cells[8] = H; cells[9] = miniPiece("human", true); cells[10] = miniPiece("human", true); cells[11] = H;
      return miniBoard(cells);
    }
    if (type === "paws") {
      const cells = Array(16).fill("");
      cells[5] = A; cells[6] = H; cells[9] = H; cells[10] = A;
      [1, 4, 11, 14].forEach((index) => { cells[index] = `<span class="rule-paw">🐾</span>`; });
      return miniBoard(cells);
    }
    return `<div class="rule-fish-scene"><div class="rule-score">🐱 21<br>AI 15</div><span>🐟</span></div>`;
  }

  function openRules(onFinish) {
    stopVoice();
    afterRules = typeof onFinish === "function" ? onFinish : null;
    rulesIndex = 0;
    dom.rulesOverlay.hidden = false;
    renderRuleStep(true);
    dom.closeRulesBtn.focus({ preventScroll: true });
  }

  function renderRuleStep(autoPlay) {
    const step = RULE_STEPS[rulesIndex];
    dom.ruleProgressText.textContent = `${rulesIndex + 1} / ${RULE_STEPS.length}`;
    dom.ruleProgressBar.style.width = `${((rulesIndex + 1) / RULE_STEPS.length) * 100}%`;
    dom.ruleVisual.innerHTML = ruleVisual(step.visual);
    dom.ruleSubtitle.textContent = VOICES[step.voice].text;
    dom.rulePrevBtn.disabled = rulesIndex === 0;
    dom.ruleNextBtn.textContent = rulesIndex === RULE_STEPS.length - 1 ? (afterRules ? "ゲームへ ▶" : "おしまい ✓") : "つぎへ ▶";
    dom.voiceStatus.textContent = save.soundOn ? "字幕でも読めます" : "おとはオフです。字幕で読めます。";
    dom.voiceStatus.classList.remove("playing");
    if (autoPlay) playVoice(step.voice);
  }

  function finishRules() {
    stopVoice();
    save.tutorialSeen = true;
    writeSave();
    dom.rulesOverlay.hidden = true;
    const callback = afterRules;
    afterRules = null;
    if (callback) callback();
    else (dom.gameScreen.hidden ? dom.rulesBtn : dom.gameRulesBtn).focus({ preventScroll: true });
  }

  function requestQuit() {
    if (phase === "title") return;
    dom.confirmOverlay.hidden = false;
    dom.cancelQuitBtn.focus({ preventScroll: true });
  }

  function confirmQuit() {
    clearTimeout(roundTimer);
    stopVoice();
    dom.confirmOverlay.hidden = true;
    dom.resultOverlay.hidden = true;
    showScreen("title");
    dom.practiceBtn.focus({ preventScroll: true });
  }

  function handleBoardKeys(event) {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const current = event.target.closest(".board-cell");
    if (!current || phase !== "player") return;
    event.preventDefault();
    const legal = Array.from(dom.board.querySelectorAll(".board-cell.legal"));
    if (!legal.length) return;
    const row = Number(current.dataset.row);
    const col = Number(current.dataset.col);
    const delta = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key];
    const scored = legal.map((cell) => {
      const r = Number(cell.dataset.row), c = Number(cell.dataset.col);
      const primary = (r - row) * delta[0] + (c - col) * delta[1];
      const sideways = Math.abs((r - row) * delta[1] - (c - col) * delta[0]);
      return { cell, primary, sideways, distance: Math.abs(r - row) + Math.abs(c - col) };
    }).filter((item) => item.primary > 0)
      .sort((a, b) => a.sideways - b.sideways || a.distance - b.distance);
    const target = scored[0]?.cell || legal[0];
    legal.forEach((cell) => { cell.tabIndex = cell === target ? 0 : -1; });
    target.focus();
    lastFocusedCell = { row: Number(target.dataset.row), col: Number(target.dataset.col) };
  }

  function wireEvents() {
    dom.soundBtn.addEventListener("click", () => setSound(!save.soundOn));
    dom.homeBtn.addEventListener("click", () => phase === "title" ? window.scrollTo({ top: 0, behavior: "smooth" }) : requestQuit());
    dom.rulesBtn.addEventListener("click", () => { unlockAudio(); openRules(null); });
    dom.gameRulesBtn.addEventListener("click", () => { unlockAudio(); openRules(null); });
    dom.practiceBtn.addEventListener("click", () => requestSeries("practice"));
    dom.matchBtn.addEventListener("click", () => requestSeries("match"));
    dom.hintBtn.addEventListener("click", showHint);
    dom.quitBtn.addEventListener("click", requestQuit);
    dom.board.addEventListener("keydown", handleBoardKeys);

    dom.closeRulesBtn.addEventListener("click", finishRules);
    dom.skipRulesBtn.addEventListener("click", finishRules);
    dom.rulePrevBtn.addEventListener("click", () => {
      if (rulesIndex > 0) { rulesIndex -= 1; renderRuleStep(true); }
    });
    dom.ruleNextBtn.addEventListener("click", () => {
      if (rulesIndex < RULE_STEPS.length - 1) { rulesIndex += 1; renderRuleStep(true); }
      else finishRules();
    });
    dom.ruleReplayBtn.addEventListener("click", () => playVoice(RULE_STEPS[rulesIndex].voice));

    dom.resultHomeBtn.addEventListener("click", confirmQuit);
    dom.confirmQuitBtn.addEventListener("click", confirmQuit);
    dom.cancelQuitBtn.addEventListener("click", () => {
      dom.confirmOverlay.hidden = true;
      dom.quitBtn.focus({ preventScroll: true });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!dom.confirmOverlay.hidden) dom.cancelQuitBtn.click();
      else if (!dom.rulesOverlay.hidden) finishRules();
      else if (!dom.resultOverlay.hidden) return;
      else if (phase !== "title") requestQuit();
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden) stopVoice(); });
    window.addEventListener("pagehide", () => { stopVoice(); clearTimeout(roundTimer); });
  }

  function init() {
    setSound(save.soundOn);
    updateCollection();
    showScreen("title");
    wireEvents();
  }

  init();
})();
