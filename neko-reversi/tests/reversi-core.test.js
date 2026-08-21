"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../reversi-core.js");

function coordinates(moves) {
  return moves.map(({ row, col }) => `${row},${col}`).sort();
}

function boardFrom(rows) {
  return rows.map((row) => Array.from(row, (cell) => {
    if (cell === "P") return Core.HUMAN;
    if (cell === "A") return Core.AI;
    return Core.EMPTY;
  }));
}

function occupied(board) {
  const count = Core.countPieces(board);
  return count.human + count.ai;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

test("6x6 and 8x8 start with four legal moves for the child", () => {
  assert.deepEqual(coordinates(Core.getLegalMoves(Core.createBoard(6), Core.HUMAN)), ["1,2", "2,1", "3,4", "4,3"]);
  assert.deepEqual(coordinates(Core.getLegalMoves(Core.createBoard(8), Core.HUMAN)), ["2,3", "3,2", "4,5", "5,4"]);
});

test("one move can flip vertical, horizontal, and diagonal lines together", () => {
  const board = boardFrom([
    "......",
    ".P.P..",
    "..AA..",
    ".PA...",
    "....A.",
    ".....P"
  ]);
  const result = Core.applyMove(board, 3, 3, Core.HUMAN);
  assert.ok(result);
  assert.deepEqual(result.flips.slice().sort(), [[2, 2], [2, 3], [3, 2], [4, 4]]);
  assert.equal(Core.countPieces(result.board).ai, 0);
  assert.equal(board[3][3], Core.EMPTY, "the input board is not mutated");
});

test("occupied cells and cells without a closing piece are illegal", () => {
  const board = Core.createBoard(8);
  assert.equal(Core.applyMove(board, 3, 3, Core.HUMAN), null);
  assert.equal(Core.applyMove(board, 0, 0, Core.HUMAN), null);
  assert.deepEqual(Core.getFlips(board, 0, 0, Core.HUMAN), []);
});

test("a player can pass while the other player still has a legal move", () => {
  const board = Array.from({ length: 6 }, () => Array(6).fill(Core.HUMAN));
  board[3][3] = Core.AI;
  board[4][3] = Core.EMPTY;
  assert.equal(Core.getLegalMoves(board, Core.AI).length, 0);
  assert.deepEqual(coordinates(Core.getLegalMoves(board, Core.HUMAN)), ["4,3"]);
  assert.equal(Core.isGameOver(board), false);
});

test("the game ends when neither player can move even if an empty cell remains", () => {
  const board = Array.from({ length: 6 }, () => Array(6).fill(Core.HUMAN));
  board[5][5] = Core.EMPTY;
  assert.equal(Core.getLegalMoves(board, Core.HUMAN).length, 0);
  assert.equal(Core.getLegalMoves(board, Core.AI).length, 0);
  assert.equal(Core.isGameOver(board), true);
  assert.equal(Core.getWinner(board), "human");
});

test("every AI level returns a legal move without mutating the board", () => {
  const source = Core.createBoard(8);
  const before = JSON.stringify(source);
  for (const difficulty of ["practice", "easy", "normal", "hard"]) {
    const move = Core.chooseAIMove(source, { difficulty, rng: seededRandom(42) });
    const legal = Core.getLegalMoves(source, Core.AI);
    assert.ok(legal.some((item) => item.row === move.row && item.col === move.col), `${difficulty} must choose a legal move`);
    assert.equal(JSON.stringify(source), before);
  }
});

test("a legal move increases occupied cells by exactly one", () => {
  const board = Core.createBoard(8);
  const move = Core.getLegalMoves(board, Core.HUMAN)[0];
  const result = Core.applyMove(board, move.row, move.col, Core.HUMAN);
  assert.equal(occupied(result.board), occupied(board) + 1);
});

test("practice ends after one round and only a child win awards one fish", () => {
  const initial = Core.createSeries("practice");
  const win = Core.resolveRound(initial, "human");
  assert.equal(win.matchOver, true);
  assert.equal(win.fishAward, 1);
  assert.equal(win.series.humanWins, 1);
  assert.equal(Core.resolveRound(initial, "ai").fishAward, 0);
  assert.equal(Core.resolveRound(initial, "draw").fishAward, 0);
});

test("first-to-two ignores draws and ends at the second win", () => {
  let series = Core.createSeries("match");
  let result = Core.resolveRound(series, "human");
  series = result.series;
  assert.equal(result.matchOver, false);
  assert.deepEqual([series.humanWins, series.aiWins], [1, 0]);

  result = Core.resolveRound(series, "draw");
  series = result.series;
  assert.equal(result.matchOver, false);
  assert.deepEqual([series.humanWins, series.aiWins], [1, 0]);

  result = Core.resolveRound(series, "ai");
  series = result.series;
  assert.equal(result.matchOver, false);
  assert.deepEqual([series.humanWins, series.aiWins], [1, 1]);

  result = Core.resolveRound(series, "human");
  assert.equal(result.matchOver, true);
  assert.equal(result.matchWinner, "human");
  assert.deepEqual([result.series.humanWins, result.series.aiWins], [2, 1]);
});

test("seeded legal playouts always finish within the number of board cells", () => {
  for (let game = 1; game <= 80; game += 1) {
    const rng = seededRandom(game);
    let board = Core.createBoard(game % 2 ? 6 : 8);
    let player = Core.HUMAN;
    let passes = 0;
    let movesPlayed = 0;
    while (!Core.isGameOver(board)) {
      const moves = Core.getLegalMoves(board, player);
      if (!moves.length) {
        passes += 1;
        player = Core.otherPlayer(player);
        continue;
      }
      passes = 0;
      const move = moves[Math.floor(rng() * moves.length)];
      const before = occupied(board);
      const result = Core.applyMove(board, move.row, move.col, player);
      board = result.board;
      movesPlayed += 1;
      assert.equal(occupied(board), before + 1);
      assert.ok(movesPlayed <= board.length * board.length - 4);
      assert.ok(passes < 2);
      player = Core.otherPlayer(player);
    }
    assert.ok(Core.countPieces(board).empty >= 0);
  }
});
