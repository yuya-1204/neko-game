(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReversiCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EMPTY = 0;
  const HUMAN = 1;
  const AI = 2;
  const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],            [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  function assertSize(size) {
    if (!Number.isInteger(size) || size < 4 || size > 12 || size % 2 !== 0) {
      throw new Error("Board size must be an even integer from 4 to 12.");
    }
  }

  function otherPlayer(player) {
    if (player === HUMAN) return AI;
    if (player === AI) return HUMAN;
    throw new Error("Unknown player.");
  }

  function createBoard(size) {
    assertSize(size);
    const board = Array.from({ length: size }, () => Array(size).fill(EMPTY));
    const a = size / 2 - 1;
    const b = size / 2;
    board[a][a] = AI;
    board[b][b] = AI;
    board[a][b] = HUMAN;
    board[b][a] = HUMAN;
    return board;
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function inside(board, row, col) {
    return row >= 0 && col >= 0 && row < board.length && col < board.length;
  }

  function getFlips(board, row, col, player) {
    if (!inside(board, row, col) || board[row][col] !== EMPTY) return [];
    const opponent = otherPlayer(player);
    const flips = [];

    for (const [dr, dc] of DIRECTIONS) {
      const line = [];
      let r = row + dr;
      let c = col + dc;
      while (inside(board, r, c) && board[r][c] === opponent) {
        line.push([r, c]);
        r += dr;
        c += dc;
      }
      if (line.length && inside(board, r, c) && board[r][c] === player) {
        flips.push(...line);
      }
    }
    return flips;
  }

  function getLegalMoves(board, player) {
    const moves = [];
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board.length; col += 1) {
        if (board[row][col] !== EMPTY) continue;
        const flips = getFlips(board, row, col, player);
        if (flips.length) moves.push({ row, col, flips });
      }
    }
    return moves;
  }

  function applyMove(board, row, col, player) {
    const flips = getFlips(board, row, col, player);
    if (!flips.length) return null;
    const next = cloneBoard(board);
    next[row][col] = player;
    for (const [r, c] of flips) next[r][c] = player;
    return { board: next, flips, move: { row, col } };
  }

  function countPieces(board) {
    const result = { empty: 0, human: 0, ai: 0 };
    for (const row of board) {
      for (const cell of row) {
        if (cell === HUMAN) result.human += 1;
        else if (cell === AI) result.ai += 1;
        else result.empty += 1;
      }
    }
    return result;
  }

  function getWinner(board) {
    const count = countPieces(board);
    if (count.human > count.ai) return "human";
    if (count.ai > count.human) return "ai";
    return "draw";
  }

  function isGameOver(board) {
    const count = countPieces(board);
    return count.empty === 0 || (
      getLegalMoves(board, HUMAN).length === 0 &&
      getLegalMoves(board, AI).length === 0
    );
  }

  function cornerCoordinates(size) {
    return [[0, 0], [0, size - 1], [size - 1, 0], [size - 1, size - 1]];
  }

  function isCorner(size, row, col) {
    return (row === 0 || row === size - 1) && (col === 0 || col === size - 1);
  }

  function isEdge(size, row, col) {
    return row === 0 || col === 0 || row === size - 1 || col === size - 1;
  }

  function isDangerSquare(board, row, col) {
    const size = board.length;
    for (const [cr, cc] of cornerCoordinates(size)) {
      if (board[cr][cc] !== EMPTY) continue;
      if (Math.abs(cr - row) <= 1 && Math.abs(cc - col) <= 1 && !(cr === row && cc === col)) {
        return true;
      }
    }
    return false;
  }

  function positionalScore(board, player) {
    const opponent = otherPlayer(player);
    const size = board.length;
    let score = 0;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const cell = board[row][col];
        if (cell === EMPTY) continue;
        let value = 1;
        if (isCorner(size, row, col)) value = 120;
        else if (isDangerSquare(board, row, col)) value = -38;
        else if (isEdge(size, row, col)) value = 16;
        score += cell === player ? value : -value;
      }
    }
    const mobility = getLegalMoves(board, player).length - getLegalMoves(board, opponent).length;
    const count = countPieces(board);
    const pieceDiff = player === HUMAN ? count.human - count.ai : count.ai - count.human;
    const endWeight = count.empty <= 12 ? 8 : 1;
    return score + mobility * 8 + pieceDiff * endWeight;
  }

  function terminalScore(board, player) {
    const count = countPieces(board);
    const diff = player === HUMAN ? count.human - count.ai : count.ai - count.human;
    if (diff > 0) return 100000 + diff;
    if (diff < 0) return -100000 + diff;
    return 0;
  }

  function boardKey(board, player, depth) {
    return `${player}:${depth}:${board.map((row) => row.join("")).join("")}`;
  }

  function minimax(board, turn, maximizingPlayer, depth, alpha, beta, cache) {
    if (isGameOver(board)) return terminalScore(board, maximizingPlayer);
    if (depth <= 0) return positionalScore(board, maximizingPlayer);

    const key = boardKey(board, turn, depth);
    if (cache.has(key)) return cache.get(key);

    const moves = getLegalMoves(board, turn);
    if (!moves.length) {
      const score = minimax(board, otherPlayer(turn), maximizingPlayer, depth - 1, alpha, beta, cache);
      cache.set(key, score);
      return score;
    }

    const maximizing = turn === maximizingPlayer;
    let best = maximizing ? -Infinity : Infinity;
    const ordered = moves.slice().sort((a, b) => {
      const ac = isCorner(board.length, a.row, a.col) ? 1 : 0;
      const bc = isCorner(board.length, b.row, b.col) ? 1 : 0;
      return bc - ac || b.flips.length - a.flips.length;
    });

    for (const move of ordered) {
      const result = applyMove(board, move.row, move.col, turn);
      const score = minimax(result.board, otherPlayer(turn), maximizingPlayer, depth - 1, alpha, beta, cache);
      if (maximizing) {
        best = Math.max(best, score);
        alpha = Math.max(alpha, best);
      } else {
        best = Math.min(best, score);
        beta = Math.min(beta, best);
      }
      if (beta <= alpha) break;
    }
    cache.set(key, best);
    return best;
  }

  function randomItem(items, rng) {
    const value = Math.max(0, Math.min(0.999999, Number(rng())));
    return items[Math.floor(value * items.length)];
  }

  function chooseAIMove(board, options) {
    const settings = options || {};
    const difficulty = settings.difficulty || "match";
    const rng = typeof settings.rng === "function" ? settings.rng : Math.random;
    const moves = getLegalMoves(board, AI);
    if (!moves.length) return null;

    const corners = moves.filter((move) => isCorner(board.length, move.row, move.col));
    if (difficulty === "practice" || difficulty === "easy") {
      const cornerChance = difficulty === "practice" ? 0.45 : 0.65;
      if (corners.length && rng() < cornerChance) return randomItem(corners, rng);
      const safe = moves.filter((move) => !isDangerSquare(board, move.row, move.col));
      const pool = safe.length && rng() < 0.65 ? safe : moves;
      return randomItem(pool, rng);
    }

    const count = countPieces(board);
    const hard = difficulty === "hard";
    const depth = hard
      ? (count.empty <= 12 ? 7 : count.empty <= 24 ? 5 : 4)
      : (count.empty <= 10 ? 6 : count.empty <= 20 ? 4 : 3);
    const cache = new Map();
    const scored = moves.map((move) => {
      const result = applyMove(board, move.row, move.col, AI);
      return {
        move,
        score: minimax(result.board, HUMAN, AI, depth - 1, -Infinity, Infinity, cache)
      };
    }).sort((a, b) => b.score - a.score);

    if (scored.length > 1 && rng() < 0.12 && scored[0].score - scored[1].score < 40) {
      return scored[1].move;
    }
    return scored[0].move;
  }

  function suggestMove(board, player) {
    const moves = getLegalMoves(board, player);
    if (!moves.length) return null;
    return moves.map((move) => {
      const result = applyMove(board, move.row, move.col, player);
      return { move, score: positionalScore(result.board, player) };
    }).sort((a, b) => b.score - a.score || b.move.flips.length - a.move.flips.length)[0].move;
  }

  function createSeries(mode) {
    if (mode !== "practice" && mode !== "match") throw new Error("Unknown mode.");
    return {
      mode,
      boardSize: mode === "practice" ? 6 : 8,
      targetWins: mode === "practice" ? null : 2,
      humanWins: 0,
      aiWins: 0,
      round: 1
    };
  }

  function resolveRound(series, winner) {
    if (!series || (series.mode !== "practice" && series.mode !== "match")) {
      throw new Error("Invalid series.");
    }
    if (!["human", "ai", "draw"].includes(winner)) throw new Error("Invalid winner.");
    const next = { ...series };
    if (winner === "human") next.humanWins += 1;
    if (winner === "ai") next.aiWins += 1;
    const matchOver = next.mode === "practice" || next.humanWins >= 2 || next.aiWins >= 2;
    return {
      series: next,
      fishAward: winner === "human" ? 1 : 0,
      matchOver,
      matchWinner: !matchOver || next.mode === "practice" ? null : (next.humanWins >= 2 ? "human" : "ai")
    };
  }

  return {
    EMPTY,
    HUMAN,
    AI,
    createBoard,
    cloneBoard,
    getFlips,
    getLegalMoves,
    applyMove,
    countPieces,
    getWinner,
    isGameOver,
    otherPlayer,
    positionalScore,
    chooseAIMove,
    suggestMove,
    createSeries,
    resolveRound
  };
});
