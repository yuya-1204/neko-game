import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, move, adopt, legalMoves, canAdopt, isStuck, validateState, MAX_LEVEL, FEVER_MAX } from '../engine.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
function fixture(board, extra = {}) {
  return {
    ...createGame(20260908),
    board: [...board, ...Array(16 - board.length).fill(0)],
    discovered: Array.from({ length: MAX_LEVEL }, (_, index) => index + 1),
    ...extra,
  };
}
function withoutSpawn(state) {
  const board = [...state.board];
  if (state.last.spawned !== null) board[state.last.spawned] = 0;
  return board;
}
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

test('new games have two kittens, valid serializable data, and deterministic seeded placement', () => {
  const game = createGame(99);
  assert.equal(game.board.filter(Boolean).length, 2);
  assert.ok(game.board.every(level => level === 0 || level === 1));
  assert.equal(game.requestLevel, 2);
  assert.deepEqual(game, createGame(99));
  assert.ok(validateState(clone(game)));
  for (const seed of [0, -1, 4294967295, Date.now(), 'kitten']) assert.ok(validateState(createGame(seed)));
});

test('swipes merge toward the requested edge in all four directions', () => {
  const cases = [
    ['left', [1, 0, 1, 0], 0],
    ['right', [1, 0, 1, 0], 3],
    ['up', [1, 0, 0, 0, 0, 0, 0, 0, 1], 0],
    ['down', [1, 0, 0, 0, 0, 0, 0, 0, 1], 12],
  ];
  for (const [direction, board, destination] of cases) {
    const state = move(fixture(board), direction);
    const expected = Array(16).fill(0);
    expected[destination] = 2;
    assert.deepEqual(withoutSpawn(state), expected, direction);
    assert.deepEqual(state.last.merges, [{ index: destination, level: 2, fever: false }]);
    assert.equal(state.score, 4);
    assert.equal(state.moves, 1);
  }
});

test('a source tile merges at most once per swipe, including equal products', () => {
  assert.deepEqual(withoutSpawn(move(fixture([1, 1, 1, 1]), 'left')).slice(0, 4), [2, 2, 0, 0]);
  assert.deepEqual(withoutSpawn(move(fixture([1, 1, 2]), 'left')).slice(0, 4), [2, 2, 0, 0]);
  assert.deepEqual(withoutSpawn(move(fixture([2, 1, 1]), 'right')).slice(0, 4), [0, 0, 2, 2]);
  assert.deepEqual(withoutSpawn(move(fixture([1, 1, 1]), 'left')).slice(0, 4), [2, 1, 0, 0]);
});

test('animation translations preserve each source tile and map both merge sources to their destination', () => {
  const result = move(fixture([1, 1, 1, 1]), 'left');
  assert.deepEqual(result.last.translations, [
    { from: 0, to: 0, level: 1 },
    { from: 1, to: 0, level: 1 },
    { from: 2, to: 1, level: 1 },
    { from: 3, to: 1, level: 1 },
  ]);
  assert.deepEqual(withoutSpawn(result).slice(0, 4), [2, 2, 0, 0]);
  const spaced = move(fixture([1, 0, 0, 0, 0, 0, 0, 0, -1]), 'down');
  assert.deepEqual(spaced.last.translations, [
    { from: 8, to: 12, level: -1 },
    { from: 0, to: 12, level: 1 },
  ]);
  assert.deepEqual(createGame(1).last.translations, []);
  assert.deepEqual(adopt(fixture([2]), 0).last.translations, []);
});

test('wild mice merge with either adjacent cat, never with another mouse', () => {
  for (const pair of [[-1, 4], [4, -1]]) {
    const result = move(fixture(pair), 'left');
    assert.equal(withoutSpawn(result)[0], 5);
    assert.equal(result.last.merges.length, 1);
  }
  const mice = fixture([-1, -1]);
  assert.equal(move(mice, 'left'), mice);
  assert.deepEqual(withoutSpawn(move(fixture([-1, 2, 3]), 'left')).slice(0, 4), [3, 3, 0, 0]);
  assert.equal(move(fixture([10, 10]), 'left').last.type, 'start');
  const maximum = move(fixture([-1, 10]), 'left');
  assert.equal(maximum.board[0], 10);
  assert.equal(maximum.last.merges.length, 1);
});

test('full fever affects exactly the first merge, then remaining merges refill it', () => {
  const state = move(fixture([1, 1, 2, 2, 3, 3, 4, 4], { fever: FEVER_MAX }), 'left');
  assert.deepEqual(withoutSpawn(state).slice(0, 8), [3, 3, 0, 0, 4, 5, 0, 0]);
  assert.deepEqual(state.last.merges.map(merge => merge.fever), [true, false, false, false]);
  assert.equal(state.fever, 3);
  const capped = move(fixture([9, 9], { fever: FEVER_MAX }), 'left');
  assert.equal(capped.board[0], 10);
  assert.equal(capped.fever, 0);
});

test('a fever charged during a move waits until the next move', () => {
  const state = move(fixture([1, 1, 2, 2], { fever: FEVER_MAX - 1 }), 'left');
  assert.deepEqual(state.last.merges.map(merge => merge.level), [2, 3]);
  assert.ok(state.last.merges.every(merge => merge.fever === false));
  assert.equal(state.fever, FEVER_MAX);
  const noMerge = move(fixture([0, 1], { fever: FEVER_MAX }), 'right');
  assert.equal(noMerge.fever, FEVER_MAX);
});

test('successful moves spawn exactly one new tile in a previously empty cell', () => {
  const start = fixture([0, 0, 0, 3]);
  const moved = move(start, 'left');
  assert.equal(moved.board.filter(Boolean).length, 2);
  assert.notEqual(moved.last.spawned, 0);
  assert.ok([-1, 1, 2].includes(moved.board[moved.last.spawned]));
  assert.equal(moved.moves, start.moves + 1);
  assert.notEqual(moved.seed, start.seed);
  assert.ok(validateState(moved));
});

test('invalid moves preserve reference, seed, counters, fever and entire state', () => {
  const state = deepFreeze(fixture([1, 2, 3, 4]));
  const saved = clone(state);
  for (const direction of ['left', 'up', 'sideways', null, undefined, 1]) assert.equal(move(state, direction), state);
  assert.deepEqual(state, saved);
});

test('actions never mutate their input and restoring an undo snapshot reproduces spawn and fever', () => {
  const original = deepFreeze(fixture([1, 1, 0, 0, 3, 3], { fever: FEVER_MAX }));
  const snapshot = clone(original);
  const first = move(original, 'right');
  assert.deepEqual(first, move(snapshot, 'right'));
  assert.deepEqual(original, snapshot);
  const residentState = deepFreeze(fixture([2, 3]));
  assert.notEqual(adopt(residentState, 0), residentState);
  assert.equal(residentState.board[0], 2);
  assert.equal(residentState.residents[2], 0);
});

test('adoption accepts only an exact requested cat and frees a cell without spawning', () => {
  const state = fixture([2, 3, -1, 2]);
  assert.deepEqual(canAdopt(state), [0, 3]);
  for (const index of [1, 2, 4, -1, 16, 0.5, '0', NaN]) assert.equal(adopt(state, index), state);
  const adopted = adopt(state, 3);
  assert.equal(adopted.board[3], 0);
  assert.equal(adopted.residents[2], 1);
  assert.equal(adopted.adoptions, 1);
  assert.equal(adopted.requestIndex, 1);
  assert.equal(adopted.requestLevel, 3);
  assert.equal(adopted.seed, state.seed);
  assert.equal(adopted.moves, state.moves);
  assert.equal(adopted.score, state.score);
  assert.deepEqual(adopted.last, { type: 'adopt', merges: [], translations: [], spawned: null });
  assert.ok(validateState(adopted));
});

test('requests progress and continue indefinitely with reachable cat levels', () => {
  let state = fixture([]);
  const requested = [];
  for (let i = 0; i < 40; i += 1) {
    requested.push(state.requestLevel);
    state = adopt({ ...state, board: [state.requestLevel, ...Array(15).fill(0)] }, 0);
    assert.ok(validateState(state));
  }
  assert.deepEqual(requested.slice(0, 16), [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10]);
  assert.deepEqual(requested.slice(16, 26), [6, 7, 8, 9, 10, 6, 7, 8, 9, 10]);
});

test('game-over accounts for both possible swipes and adoption escape', () => {
  const blocked = fixture([3, 4, 3, 4, 4, 3, 4, 3, 3, 4, 3, 4, 4, 3, 4, 3]);
  assert.deepEqual(legalMoves(blocked), []);
  assert.equal(isStuck(blocked), true);
  const escapable = { ...blocked, board: [2, ...blocked.board.slice(1)] };
  assert.deepEqual(legalMoves(escapable), []);
  assert.equal(isStuck(escapable), false);
  assert.equal(isStuck(adopt(escapable, 0)), false);
  assert.deepEqual(legalMoves(fixture([1])), ['right', 'down']);
});

test('validation rejects malformed, sparse, unbounded and inconsistent saved data', () => {
  const good = createGame(4);
  const mutations = [
    state => { state.version = 2; },
    state => { state.board.pop(); },
    state => { state.board[0] = 11; },
    state => { state.board[0] = '1'; },
    state => { state.board[0] = NaN; },
    state => { delete state.board[0]; },
    state => { state.seed = -1; },
    state => { state.seed = 4294967296; },
    state => { state.score = Infinity; },
    state => { state.moves = 0.5; },
    state => { state.fever = 7; },
    state => { state.residents = Array(12).fill(0); },
    state => { state.residents[0] = 1; },
    state => { state.residents[2] = -1; },
    state => { state.discovered = [1, 1]; },
    state => { state.discovered = Array(10000).fill(1); },
    state => { state.discovered = [2]; },
    state => { state.requestIndex = Number.MAX_VALUE; },
    state => { state.requestLevel = 10; },
    state => { state.adoptions = 1; },
  ];
  for (const mutate of mutations) {
    const state = clone(good);
    mutate(state);
    assert.equal(validateState(state), false, mutate.toString());
  }
  for (const value of [null, undefined, true, 1, [], {}]) assert.equal(validateState(value), false);
  const withoutAnimation = clone(good);
  delete withoutAnimation.last;
  assert.equal(validateState(withoutAnimation), true);
});

test('many seeded random games preserve invariants and deterministic replay', () => {
  let rng = 0xC0FFEE;
  const random = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };
  let actions = 0;
  let mice = 0;
  let adoptions = 0;
  let boosts = 0;
  for (let game = 0; game < 180; game += 1) {
    let state = createGame(game);
    for (let turn = 0; turn < 500; turn += 1) {
      const before = clone(state);
      const choices = canAdopt(state);
      const directions = legalMoves(state);
      let next;
      if (choices.length && (random() < 0.6 || !directions.length)) {
        const index = choices[Math.floor(random() * choices.length)];
        next = adopt(state, index);
        assert.equal(next.board.filter(Boolean).length, state.board.filter(Boolean).length - 1);
        adoptions += 1;
      } else if (directions.length) {
        const direction = directions[Math.floor(random() * directions.length)];
        next = move(state, direction);
        assert.deepEqual(next, move(before, direction));
        assert.equal(next.board.filter(Boolean).length, state.board.filter(Boolean).length - next.last.merges.length + 1);
        assert.equal(next.last.merges.filter(merge => merge.fever).length, state.fever === FEVER_MAX && next.last.merges.length ? 1 : 0);
        if (next.board[next.last.spawned] === -1) mice += 1;
        boosts += next.last.merges.filter(merge => merge.fever).length;
      } else {
        assert.equal(isStuck(state), true);
        break;
      }
      assert.deepEqual(state, before);
      assert.ok(validateState(next), `seed ${game}, turn ${turn}`);
      assert.ok(next.score >= state.score);
      assert.ok(next.discovered.length >= state.discovered.length);
      state = next;
      actions += 1;
    }
  }
  assert.ok(actions > 10000, `exercised ${actions} actions`);
  assert.ok(mice > 100, `spawned ${mice} mice`);
  assert.ok(adoptions > 100, `completed ${adoptions} adoptions`);
  assert.ok(boosts > 100, `triggered ${boosts} fevers`);
});
