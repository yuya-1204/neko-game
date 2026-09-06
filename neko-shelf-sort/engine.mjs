/** Pure shelf-sort rules and deterministic, constructively solvable boards. */
const EMPTY = () => [null, null, null];
const present = item => item !== null;
const occupancy = front => front.reduce((n, item) => n + (item !== null), 0);
const isMatch = front => front[0] !== null && front[0] === front[1] && front[1] === front[2];
const cloneShelves = shelves => shelves.map(shelf => ({ front: [...shelf.front], back: shelf.back.map(layer => [...layer]) }));
const sameMove = (a, b) => a && b && a.fromShelf === b.fromShelf && a.fromSlot === b.fromSlot && a.toShelf === b.toShelf && a.toSlot === b.toSlot;
const inverseMove = move => ({ fromShelf: move.toShelf, fromSlot: move.toSlot, toShelf: move.fromShelf, toSlot: move.fromSlot });
const makeMove = (fromShelf, fromSlot, toShelf, toSlot) => ({ fromShelf, fromSlot, toShelf, toSlot });

function hashSeed(seed) {
  const text = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}
function randomGenerator(seed) {
  let value = hashSeed(seed);
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Build backwards from an empty shop. Insert a matched triple on an empty
 * buffer shelf, then move its three items elsewhere. To reverse a front-layer
 * reveal, tuck the old front behind a new single item. Reversing the recorded
 * moves is therefore a legal solution, rather than a guessed random shuffle.
 * Front layers never contain an already-matched triple.
 */
function construct(level, seed, attempt) {
  const random = randomGenerator(`${seed}:${level.id}:${attempt}`);
  const shelves = Array.from({ length: level.shelfCount }, () => ({ front: EMPTY(), back: [] }));
  const reverseMoves = [];
  const groupItems = shuffled(Array.from({ length: level.groups }, (_, n) => level.items[n % level.items.length]), random);
  const targets = Array.from({ length: level.shelfCount - 1 }, (_, n) => n + 1);
  for (let group = 0; group < groupItems.length; group++) {
    const item = groupItems[group];
    shelves[0].front = [item, item, item];
    for (const bufferSlot of shuffled([0, 1, 2], random)) {
      const options = [];
      for (const shelfIndex of shuffled(targets, random)) {
        const shelf = shelves[shelfIndex];
        const filled = occupancy(shelf.front);
        const wouldMatch = filled === 2 && shelf.front.filter(present).every(id => id === item);
        if (filled < 3 && !wouldMatch) {
          options.push({ shelfIndex, bury: false, weight: 4 + filled * 2 + random() * 5 });
        }
        if (filled > 0 && shelf.back.length + 1 < level.layerCount) {
          // Filling a layer before burying it preserves capacity at large sizes.
          const forceFirstHidden = group === groupItems.length - 1 && !shelves.some(s => s.back.length);
          if (filled === 3 || wouldMatch || forceFirstHidden) {
            options.push({ shelfIndex, bury: true, weight: (forceFirstHidden ? 24 : filled === 3 ? 5 : 1) + random() * 5 });
          }
        }
      }
      options.sort((a, b) => b.weight - a.weight);
      if (!options.length) return null;
      const chosen = options[0];
      const shelf = shelves[chosen.shelfIndex];
      if (chosen.bury) {
        shelf.back.unshift(shelf.front);
        shelf.front = EMPTY();
      }
      const slot = shuffled([0, 1, 2].filter(n => shelf.front[n] === null), random)[0];
      shelf.front[slot] = item;
      shelves[0].front[bufferSlot] = null;
      reverseMoves.push(makeMove(0, bufferSlot, chosen.shelfIndex, slot));
    }
  }
  if (!shelves.some(shelf => shelf.back.length)) return null;
  // Permuting shelves/slots changes the presentation without changing the proof.
  const shelfOrder = shuffled(Array.from({ length: shelves.length }, (_, n) => n), random);
  const slotOrders = shelves.map(() => shuffled([0, 1, 2], random));
  const remapSlot = (shelf, slot) => slotOrders[shelf].indexOf(slot);
  const permuted = shelfOrder.map(oldIndex => ({
    front: slotOrders[oldIndex].map(slot => shelves[oldIndex].front[slot]),
    back: shelves[oldIndex].back.map(layer => slotOrders[oldIndex].map(slot => layer[slot])),
  }));
  const solution = reverseMoves.reverse().map(inverseMove).map(move => makeMove(
    shelfOrder.indexOf(move.fromShelf), remapSlot(move.fromShelf, move.fromSlot),
    shelfOrder.indexOf(move.toShelf), remapSlot(move.toShelf, move.toSlot),
  ));
  return { shelves: permuted, solution };
}

function validLevel(level) {
  return level && Number.isInteger(level.shelfCount) && level.shelfCount >= 3 &&
    Number.isInteger(level.layerCount) && level.layerCount >= 2 &&
    Number.isInteger(level.groups) && level.groups >= 1 && Array.isArray(level.items) && level.items.length > 0 &&
    level.items.every(item => typeof item === 'string' && item.length > 0) &&
    level.groups >= level.items.length && Number.isFinite(level.timeLimit) && level.timeLimit > 0;
}

export function createGame(level, seed = `${level?.id ?? 1}-first`) {
  if (!validLevel(level)) throw new TypeError('Invalid shelf-sort level');
  for (let attempt = 0; attempt < 128; attempt++) {
    const built = construct(level, seed, attempt);
    if (!built) continue;
    const state = {
      levelId: level.id, seed: String(seed), shelves: built.shelves,
      status: 'playing', reason: null, timeLeft: level.timeLimit, timeLimit: level.timeLimit,
      moves: 0, cleared: 0, totalItems: level.groups * 3, lastEvents: [],
      // UI deliberately renders front only. This proof is private engine data.
      _plan: built.solution,
    };
    // Validate the exact mechanics (including reveals and no-space failures),
    // not merely the count of items. The small boards need at most 75 moves.
    let check = state;
    let good = true;
    for (const move of built.solution) {
      const result = moveItem(check, move.fromShelf, move.fromSlot, move.toShelf, move.toSlot);
      if (!result.ok || result.state.status === 'lost') { good = false; break; }
      check = result.state;
    }
    if (good && check.status === 'won') return state;
  }
  throw new Error('Unable to construct a solvable board for this level');
}

export function getCounts(state) {
  let visible = 0;
  let hidden = 0;
  for (const shelf of state.shelves) {
    visible += occupancy(shelf.front);
    for (const layer of shelf.back) hidden += occupancy(layer);
  }
  const remaining = visible + hidden;
  return {
    remaining, visible, hidden, empty: state.shelves.length * 3 - visible,
    cleared: state.cleared, total: state.totalItems, groupsLeft: Math.ceil(remaining / 3),
  };
}

function resolve(state) {
  const events = [];
  let changed;
  do {
    changed = false;
    // Matches are removed before revealing new layers and testing failure.
    for (let i = 0; i < state.shelves.length; i++) {
      const shelf = state.shelves[i];
      if (isMatch(shelf.front)) {
        const item = shelf.front[0];
        shelf.front = EMPTY();
        state.cleared += 3;
        events.push({ type: 'match', shelf: i, item, count: 3 });
        changed = true;
      }
    }
    for (let i = 0; i < state.shelves.length; i++) {
      const shelf = state.shelves[i];
      if (occupancy(shelf.front) === 0 && shelf.back.length) {
        shelf.front = shelf.back.shift();
        events.push({ type: 'reveal', shelf: i, count: occupancy(shelf.front) });
        changed = true;
      }
    }
  } while (changed);
  const counts = getCounts(state);
  if (counts.remaining === 0) {
    state.status = 'won';
    events.push({ type: 'win', shelf: -1 });
  } else if (counts.empty === 0) {
    state.status = 'lost';
    state.reason = 'space';
    events.push({ type: 'lose', shelf: -1, reason: 'space' });
  }
  return events;
}

function validPosition(state, shelf, slot) {
  return Number.isInteger(shelf) && shelf >= 0 && shelf < state.shelves.length &&
    Number.isInteger(slot) && slot >= 0 && slot < 3;
}
function legalMove(state, move) {
  return state.status === 'playing' && validPosition(state, move.fromShelf, move.fromSlot) &&
    validPosition(state, move.toShelf, move.toSlot) &&
    state.shelves[move.fromShelf].front[move.fromSlot] !== null &&
    state.shelves[move.toShelf].front[move.toSlot] === null;
}

export function moveItem(state, fromShelf, fromSlot, toShelf, toSlot) {
  const move = makeMove(fromShelf, fromSlot, toShelf, toSlot);
  let reason = null;
  if (state.status !== 'playing') reason = 'finished';
  else if (!validPosition(state, fromShelf, fromSlot) || !validPosition(state, toShelf, toSlot)) reason = 'invalid';
  else if (state.shelves[fromShelf].front[fromSlot] === null) reason = 'empty';
  else if (state.shelves[toShelf].front[toSlot] !== null) reason = 'occupied';
  if (reason) return { state, ok: false, reason, events: [] };
  const next = { ...state, shelves: cloneShelves(state.shelves), moves: state.moves + 1 };
  next.shelves[toShelf].front[toSlot] = next.shelves[fromShelf].front[fromSlot];
  next.shelves[fromShelf].front[fromSlot] = null;
  const events = resolve(next);
  if (sameMove(state._plan?.[0], move)) next._plan = state._plan.slice(1);
  else if (state._plan && events.length === 0) next._plan = [inverseMove(move), ...state._plan];
  else next._plan = null;
  next.lastEvents = events;
  return { state: next, ok: true, reason: null, events };
}

export function tick(state, seconds) {
  if (state.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return state;
  const timeLeft = Math.max(0, state.timeLeft - seconds);
  if (timeLeft > 0) return { ...state, timeLeft, lastEvents: [] };
  return { ...state, timeLeft: 0, status: 'lost', reason: 'time', lastEvents: [{ type: 'lose', shelf: -1, reason: 'time' }] };
}

// Solver used only after a player deviates from the construction proof through
// an irreversible reveal/match. Its macro moves always clear or reveal a layer;
// it does not explore endless permutations of identical empty spaces.
const hintCache = new Map();
const boardKey = state => state.shelves.map(s => `${s.front.map(x => x ?? '_').join(',')}|${s.back.map(l => l.map(x => x ?? '_').join(',')).join('/')}`).join(';');
const now = () => globalThis.performance?.now?.() ?? Date.now();
function applyForSolver(state, move) {
  return moveItem({ ...state, _plan: null }, move.fromShelf, move.fromSlot, move.toShelf, move.toSlot);
}
function emptyPositions(state, exceptShelf = -1) {
  const slots = [];
  state.shelves.forEach((shelf, s) => shelf.front.forEach((item, p) => {
    if (item === null && s !== exceptShelf) slots.push({ shelf: s, slot: p });
  }));
  return slots;
}
function occurrences(state, item, exceptShelf = -1) {
  const slots = [];
  state.shelves.forEach((shelf, s) => shelf.front.forEach((value, p) => {
    if (value === item && s !== exceptShelf) slots.push({ shelf: s, slot: p, depth: shelf.back.length, filled: occupancy(shelf.front) });
  }));
  return slots.sort((a, b) => b.filled - a.filled || a.depth - b.depth);
}
function moveBlockers(start, destination, keepItem = null, variant = 0) {
  let state = start;
  const moves = [];
  const original = [...state.shelves[destination].front];
  for (let slot = 0; slot < 3; slot++) {
    const item = original[slot];
    if (item === null || item === keepItem) continue;
    if (state.shelves[destination].front[slot] !== item) continue;
    const empties = emptyPositions(state, destination);
    empties.sort((a, b) => {
      const score = position => {
        const front = state.shelves[position.shelf].front;
        const alike = front.filter(value => value === item).length;
        return alike * 6 + occupancy(front) + (variant ? -position.shelf / 10 : position.shelf / 10);
      };
      return score(b) - score(a);
    });
    let accepted = false;
    for (const target of empties) {
      const move = makeMove(destination, slot, target.shelf, target.slot);
      const result = applyForSolver(state, move);
      if (!result.ok || result.state.status === 'lost') continue;
      state = result.state;
      moves.push(move);
      accepted = true;
      break;
    }
    if (!accepted) return null;
    if (state.status === 'won') break;
  }
  return { state, moves };
}
function collectTriple(start, item, destination, variant) {
  const clearedBefore = start.cleared;
  const clearedBlockers = moveBlockers(start, destination, item, variant);
  if (!clearedBlockers) return null;
  let { state, moves } = clearedBlockers;
  if (state.status === 'won') return { state, moves };
  // A reveal while evacuating can make this target unsuitable; another branch
  // will choose that reveal as progress instead.
  if (state.shelves[destination].front.some(value => value !== null && value !== item)) return null;
  for (let guard = 0; guard < 3; guard++) {
    const slot = state.shelves[destination].front.indexOf(null);
    if (slot < 0) break;
    let sources = occurrences(state, item, destination);
    if (variant) sources = sources.reverse();
    let accepted = false;
    for (const source of sources) {
      const move = makeMove(source.shelf, source.slot, destination, slot);
      const result = applyForSolver(state, move);
      if (!result.ok || result.state.status === 'lost') continue;
      state = result.state;
      moves.push(move);
      accepted = true;
      break;
    }
    if (!accepted) return null;
    if (state.cleared > clearedBefore || state.status === 'won') return { state, moves };
  }
  return state.cleared > clearedBefore ? { state, moves } : null;
}

export function solveGame(initial, { maxNodes = 260, maxMs = 65 } = {}) {
  if (initial.status === 'won') return { moves: [], visited: 0, exhausted: false };
  if (initial.status !== 'playing') return { moves: null, visited: 0, exhausted: true };
  const deadline = now() + maxMs;
  const visited = new Set();
  let nodes = 0;
  let timedOut = false;
  function search(state, path, depth) {
    if (state.status === 'won') return path;
    if (++nodes > maxNodes || now() > deadline) { timedOut = true; return null; }
    if (depth > initial.totalItems + initial.shelves.length * 4) return null;
    const key = boardKey(state);
    if (visited.has(key)) return null;
    visited.add(key);
    const totals = new Map();
    for (const shelf of state.shelves) for (const item of shelf.front) if (item !== null) totals.set(item, (totals.get(item) || 0) + 1);
    const options = [];
    for (const [item, count] of totals) {
      if (count < 3) continue;
      const destinations = state.shelves.map((shelf, index) => ({ index, same: shelf.front.filter(value => value === item).length, filled: occupancy(shelf.front) }))
        .sort((a, b) => (b.same * 3 - b.filled) - (a.same * 3 - a.filled));
      for (const { index } of destinations) {
        for (let variant = 0; variant < 2; variant++) {
          const option = collectTriple(state, item, index, variant);
          if (option) options.push(option);
        }
      }
    }
    // Revealing a shelf can expose the third copy of a currently blocked item.
    state.shelves.forEach((shelf, index) => {
      if (!shelf.back.length) return;
      for (let variant = 0; variant < 2; variant++) {
        const option = moveBlockers(state, index, null, variant);
        if (option && (option.state.cleared > state.cleared || option.state.shelves[index].back.length < shelf.back.length)) options.push(option);
      }
    });
    options.sort((a, b) => (b.state.cleared - a.state.cleared) * 100 + (getCounts(a.state).hidden - getCounts(b.state).hidden) * 2 + a.moves.length - b.moves.length);
    const local = new Set();
    for (const option of options) {
      const nextKey = boardKey(option.state);
      if (local.has(nextKey)) continue;
      local.add(nextKey);
      const solved = search(option.state, [...path, ...option.moves], depth + 1);
      if (solved) return solved;
      if (timedOut) break;
    }
    return null;
  }
  const moves = search(initial, [], 0);
  if (moves) {
    let state = initial;
    for (let i = 0; i < moves.length; i++) {
      hintCache.set(boardKey(state), moves[i]);
      state = applyForSolver(state, moves[i]).state;
    }
    if (hintCache.size > 2000) hintCache.clear();
  }
  return { moves, visited: nodes, exhausted: timedOut };
}

export function getHint(state) {
  if (state.status !== 'playing') return null;
  const planned = state._plan?.[0];
  if (planned && legalMove(state, planned)) return { ...planned };
  const cached = hintCache.get(boardKey(state));
  if (cached && legalMove(state, cached)) return { ...cached };
  const result = solveGame(state);
  return result.moves?.[0] ? { ...result.moves[0] } : null;
}
