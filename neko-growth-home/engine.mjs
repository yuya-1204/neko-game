/** Deterministic, immutable rules for Neko Growth Home. No DOM or storage. */
export const MAX_LEVEL = 10;
export const FEVER_MAX = 6;

const SIZE = 4;
const CELL_COUNT = SIZE * SIZE;
const DIRECTIONS = ['left', 'right', 'up', 'down'];
const REQUESTS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10];
const REPEAT_REQUESTS = [6, 7, 8, 9, 10];
const MAX_COUNTER = Number.MAX_SAFE_INTEGER;
const isCounter = value => Number.isSafeInteger(value) && value >= 0;
const isLevel = value => Number.isInteger(value) && value >= 1 && value <= MAX_LEVEL;
const requestAt = index => index < REQUESTS.length
  ? REQUESTS[index]
  : REPEAT_REQUESTS[(index - REQUESTS.length) % REPEAT_REQUESTS.length];
const increment = value => Math.min(MAX_COUNTER, value + 1);

function initialSeed(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value >>> 0;
  const text = String(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/** Mulberry32 step: the advanced seed is part of the serializable state. */
function nextRandom(seed) {
  const nextSeed = (seed + 0x6D2B79F5) >>> 0;
  let value = nextSeed;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return { seed: nextSeed, value: ((value ^ (value >>> 14)) >>> 0) / 4294967296 };
}

function spawn(board, seed, initial = false) {
  const empty = [];
  board.forEach((level, index) => { if (level === 0) empty.push(index); });
  if (!empty.length) return { board, seed, index: null, level: 0 };
  const positionRoll = nextRandom(seed);
  const index = empty[Math.floor(positionRoll.value * empty.length)];
  let level = 1;
  let nextSeed = positionRoll.seed;
  if (!initial) {
    const levelRoll = nextRandom(nextSeed);
    nextSeed = levelRoll.seed;
    // Most arrivals are kittens; a rare mouse can merge with any cat.
    level = levelRoll.value < 0.045 ? -1 : levelRoll.value < 0.145 ? 2 : 1;
  }
  const result = [...board];
  result[index] = level;
  return { board: result, seed: nextSeed, index, level };
}

function discover(previous, levels) {
  return [...new Set([...previous, ...levels.filter(isLevel)])].sort((a, b) => a - b);
}

export function createGame(seed = Date.now()) {
  const first = spawn(Array(CELL_COUNT).fill(0), initialSeed(seed), true);
  const second = spawn(first.board, first.seed, true);
  return {
    version: 1,
    board: second.board,
    seed: second.seed,
    score: 0,
    moves: 0,
    fever: 0,
    residents: Array(MAX_LEVEL + 1).fill(0),
    adoptions: 0,
    discovered: [1],
    requestIndex: 0,
    requestLevel: requestAt(0),
    last: { type: 'start', merges: [], translations: [], spawned: null },
  };
}

function lineIndices(direction, line) {
  const indices = [];
  for (let offset = 0; offset < SIZE; offset += 1) {
    if (direction === 'left') indices.push(line * SIZE + offset);
    if (direction === 'right') indices.push(line * SIZE + SIZE - 1 - offset);
    if (direction === 'up') indices.push(offset * SIZE + line);
    if (direction === 'down') indices.push((SIZE - 1 - offset) * SIZE + line);
  }
  return indices;
}

function canMerge(first, second) {
  if (first === undefined || second === undefined || first === 0 || second === 0) return false;
  if (first === -1 || second === -1) return first !== second;
  return first === second && first < MAX_LEVEL;
}

/** Resolve the whole swipe before spawning. Each source tile is used once. */
function swipe(state, direction) {
  const board = Array(CELL_COUNT).fill(0);
  const merges = [];
  const translations = [];
  let fever = state.fever;
  let mayUseFever = fever === FEVER_MAX;
  let score = state.score;
  for (let line = 0; line < SIZE; line += 1) {
    const indices = lineIndices(direction, line);
    const sourceIndices = indices.filter(index => state.board[index] !== 0);
    const values = sourceIndices.map(index => state.board[index]);
    let destination = 0;
    for (let source = 0; source < values.length; source += 1) {
      let level = values[source];
      translations.push({ from: sourceIndices[source], to: indices[destination], level });
      if (canMerge(level, values[source + 1])) {
        translations.push({ from: sourceIndices[source + 1], to: indices[destination], level: values[source + 1] });
        const boosted = mayUseFever;
        level = Math.min(MAX_LEVEL, Math.max(level, values[source + 1]) + (boosted ? 2 : 1));
        if (boosted) {
          fever = 0;
          mayUseFever = false;
        } else {
          fever = Math.min(FEVER_MAX, fever + 1);
        }
        score = Math.min(MAX_COUNTER, score + 2 ** level);
        merges.push({ index: indices[destination], level, fever: boosted });
        source += 1;
      }
      board[indices[destination]] = level;
      destination += 1;
    }
  }
  return {
    board,
    merges,
    translations,
    fever,
    score,
    changed: board.some((level, index) => level !== state.board[index]),
  };
}

export function move(state, direction) {
  if (!DIRECTIONS.includes(direction)) return state;
  const result = swipe(state, direction);
  if (!result.changed) return state;
  const arrival = spawn(result.board, state.seed);
  return {
    ...state,
    board: arrival.board,
    seed: arrival.seed,
    score: result.score,
    moves: increment(state.moves),
    fever: result.fever,
    discovered: discover(state.discovered, [...result.merges.map(merge => merge.level), arrival.level]),
    last: { type: 'move', merges: result.merges, translations: result.translations, spawned: arrival.index },
  };
}

export function canAdopt(state) {
  return state.board.flatMap((level, index) => level === state.requestLevel ? [index] : []);
}

export function adopt(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT || state.board[index] !== state.requestLevel) return state;
  const level = state.board[index];
  const board = [...state.board];
  board[index] = 0;
  const residents = [...state.residents];
  residents[level] = increment(residents[level]);
  const requestIndex = increment(state.requestIndex);
  return {
    ...state,
    board,
    residents,
    adoptions: increment(state.adoptions),
    requestIndex,
    requestLevel: requestAt(requestIndex),
    discovered: discover(state.discovered, [level]),
    last: { type: 'adopt', merges: [], translations: [], spawned: null },
  };
}

export function legalMoves(state) {
  return DIRECTIONS.filter(direction => swipe(state, direction).changed);
}

export function isStuck(state) {
  return canAdopt(state).length === 0 && legalMoves(state).length === 0;
}

/** Validate persistent gameplay data; animation-only `last` is deliberately ignored. */
export function validateState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return false;
  if (!Array.isArray(value.board) || value.board.length !== CELL_COUNT) return false;
  // Array.from also visits holes, unlike Array#every on sparse arrays.
  if (!Array.from(value.board).every(level => level === 0 || level === -1 || isLevel(level))) return false;
  if (!Number.isInteger(value.seed) || value.seed < 0 || value.seed > 0xFFFFFFFF) return false;
  if (!isCounter(value.score) || !isCounter(value.moves) || !isCounter(value.adoptions)) return false;
  if (!Number.isInteger(value.fever) || value.fever < 0 || value.fever > FEVER_MAX) return false;
  if (!Array.isArray(value.residents) || value.residents.length !== MAX_LEVEL + 1) return false;
  if (value.residents[0] !== 0 || !Array.from(value.residents).every(isCounter)) return false;
  if (!Array.isArray(value.discovered) || value.discovered.length < 1 || value.discovered.length > MAX_LEVEL) return false;
  if (!Array.from(value.discovered).every(isLevel) || new Set(value.discovered).size !== value.discovered.length) return false;
  if (!isCounter(value.requestIndex) || value.requestLevel !== requestAt(value.requestIndex)) return false;
  if (value.requestIndex !== value.adoptions) return false;
  if (value.residents.reduce((sum, count) => sum + count, 0) !== value.adoptions) return false;
  if (!value.board.filter(isLevel).every(level => value.discovered.includes(level))) return false;
  if (!value.residents.every((count, level) => count === 0 || value.discovered.includes(level))) return false;
  return true;
}
