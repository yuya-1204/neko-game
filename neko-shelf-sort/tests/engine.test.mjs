import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, ITEM_IDS, getLevel } from '../levels.mjs';
import { createGame, moveItem, tick, getCounts, getHint, solveGame } from '../engine.mjs';

const A = 'drink-strawberry';
const B = 'toy-red-car';
const C = 'sweet-cookie';
const D = 'flower-pink';
const empty = () => [null, null, null];
const shelf = (front, back = []) => ({ front, back });
function fixture(shelves, extra = {}) {
  const totalItems = shelves.flatMap(s => [s.front, ...s.back]).flat().filter(Boolean).length;
  return { levelId: 1, seed: 'fixture', shelves, totalItems, cleared: 0, moves: 0,
    status: 'playing', reason: null, timeLimit: 150, timeLeft: 150, lastEvents: [], _plan: null, ...extra };
}
function play(state, move) {
  const result = moveItem(state, move.fromShelf, move.fromSlot, move.toShelf, move.toSlot);
  assert.equal(result.ok, true, JSON.stringify(move));
  return result.state;
}
const identityCounts = state => {
  const counts = {};
  for (const row of state.shelves.flatMap(s => [s.front, ...s.back])) for (const item of row) if (item !== null) counts[item] = (counts[item] || 0) + 1;
  return counts;
};

test('24 levels introduce all categories, more types, more layers and generous finite time', () => {
  assert.equal(LEVELS.length, 24);
  assert.equal(new Set(ITEM_IDS).size, 30);
  assert.equal(getLevel(1), LEVELS[0]);
  assert.equal(getLevel(24), LEVELS[23]);
  assert.equal(getLevel(999), LEVELS[0]);
  for (const level of LEVELS) {
    assert.equal(level.items.length, level.typeCount);
    assert.equal(new Set(level.items).size, level.typeCount);
    assert.ok(level.items.every(item => ITEM_IDS.includes(item)));
    assert.ok(level.timeLimit >= 90 && level.timeLimit <= 240);
    assert.ok(level.groups >= level.typeCount);
  }
  assert.equal(LEVELS[0].typeCount, 3);
  assert.equal(LEVELS.at(-1).typeCount, 12);
  for (const category of ['drink-', 'toy-', 'sweet-', 'plush-', 'flower-']) {
    assert.ok(LEVELS.some(level => level.items.some(item => item.startsWith(category))));
  }
  const finalItems = LEVELS.at(-1).items;
  assert.equal(new Set(LEVELS.flatMap(level => level.items)).size, 30, 'every illustrated identity appears in a level');
  assert.ok(finalItems.includes('plush-bear-brown') && finalItems.includes('plush-bear-cream'));
  assert.ok(finalItems.includes('sweet-donut-pink') && finalItems.includes('sweet-donut-blue'));
});

for (const level of LEVELS) {
  test(`level ${level.id}: 50 independent replay seeds have a verified, nontrivial solution`, () => {
    const layouts = new Set();
    for (let seed = 0; seed < 50; seed++) {
      let state = createGame(level, `replay-${seed}`);
      layouts.add(JSON.stringify(state.shelves));
      const counts = getCounts(state);
      assert.equal(state.status, 'playing');
      assert.equal(counts.total, level.groups * 3);
      assert.equal(counts.remaining, counts.total);
      assert.ok(counts.empty >= 3);
      assert.ok(counts.hidden > 0, 'at least one concealed layer');
      assert.ok(state.shelves.every(s => s.front.length === 3 && s.back.every(layer => layer.length === 3)));
      assert.ok(state.shelves.every(s => s.back.length + 1 <= level.layerCount));
      assert.ok(state.shelves.every(s => !(s.front[0] && s.front.every(item => item === s.front[0]))));
      const ids = identityCounts(state);
      assert.equal(Object.keys(ids).length, level.typeCount);
      assert.ok(Object.values(ids).every(count => count % 3 === 0));
      const proof = [...state._plan];
      assert.equal(proof.length, level.groups * 3);
      let matches = 0;
      let reveals = 0;
      for (const move of proof) {
        const before = getCounts(state).remaining;
        assert.deepEqual(getHint(state), move);
        state = play(state, move);
        assert.notEqual(state.status, 'lost');
        const removed = state.lastEvents.filter(event => event.type === 'match').length * 3;
        assert.equal(getCounts(state).remaining, before - removed);
        matches += removed / 3;
        reveals += state.lastEvents.filter(event => event.type === 'reveal').length;
      }
      assert.equal(state.status, 'won');
      assert.equal(matches, level.groups);
      assert.ok(reveals > 0);
      assert.equal(getCounts(state).remaining, 0);
      assert.equal(state.cleared, state.totalItems);
    }
    assert.equal(layouts.size, 50, 'new seeds give new layouts');
  });
}

test('seed is stable across visits; numeric and string seed are equivalent', () => {
  assert.deepEqual(createGame(LEVELS[9], 'hello'), createGame(LEVELS[9], 'hello'));
  assert.deepEqual(createGame(LEVELS[9], 42), createGame(LEVELS[9], '42'));
  assert.notDeepEqual(createGame(LEVELS[9], 'hello').shelves, createGame(LEVELS[9], 'goodbye').shelves);
});

test('a move is immutable and permits any empty slot, including the same shelf', () => {
  const state = fixture([shelf([A, null, B]), shelf([C, null, null]), shelf(empty())]);
  const snapshot = JSON.stringify(state);
  const moved = moveItem(state, 0, 0, 1, 2);
  assert.equal(moved.ok, true);
  assert.deepEqual(moved.state.shelves[0].front, [null, null, B]);
  assert.deepEqual(moved.state.shelves[1].front, [C, null, A]);
  assert.equal(JSON.stringify(state), snapshot);
  const sameShelf = moveItem(state, 0, 0, 0, 1);
  assert.equal(sameShelf.ok, true);
  assert.deepEqual(sameShelf.state.shelves[0].front, [null, A, B]);
  assert.equal(sameShelf.state.moves, 1);
});

test('invalid positions, occupied targets, empty sources and finished games make no changes', () => {
  const state = fixture([shelf([A, null, B]), shelf(empty()), shelf(empty())]);
  for (const args of [[-1, 0, 1, 0], [0, 3, 1, 0], [0, 0, 99, 0], [0, 0, 1, 0.5], [0, 1, 1, 0], [0, 0, 0, 2], [0, 0, 0, 0]]) {
    const result = moveItem(state, ...args);
    assert.equal(result.ok, false);
    assert.equal(result.state, state);
    assert.deepEqual(result.events, []);
  }
  for (const status of ['won', 'lost']) {
    const done = { ...state, status };
    assert.equal(moveItem(done, 0, 0, 1, 0).state, done);
  }
});

test('a layer stays concealed until its whole front is empty', () => {
  let state = fixture([shelf([A, B, null], [[C, D, A]]), shelf(empty()), shelf(empty())]);
  state = play(state, { fromShelf: 0, fromSlot: 0, toShelf: 1, toSlot: 2 });
  assert.deepEqual(state.shelves[0].front, [null, B, null]);
  assert.equal(state.shelves[0].back.length, 1);
  assert.deepEqual(state.lastEvents, []);
  state = play(state, { fromShelf: 0, fromSlot: 1, toShelf: 2, toSlot: 0 });
  assert.deepEqual(state.shelves[0].front, [C, D, A]);
  assert.equal(state.shelves[0].back.length, 0);
  assert.deepEqual(state.lastEvents, [{ type: 'reveal', shelf: 0, count: 3 }]);
});

test('three exact matches clear, reveal and repeatedly resolve consecutive complete layers', () => {
  let state = fixture([shelf([A, A, null], [[B, B, B], [C, C, C]]), shelf([A, null, null]), shelf(empty())]);
  state = play(state, { fromShelf: 1, fromSlot: 0, toShelf: 0, toSlot: 2 });
  assert.equal(state.status, 'won');
  assert.equal(state.cleared, 9);
  assert.deepEqual(state.lastEvents.map(e => e.type), ['match', 'reveal', 'match', 'reveal', 'match', 'win']);
  assert.equal(state.lastEvents.filter(e => e.type === 'match')[0].item, A);
});

test('different colours never match despite having the same product shape', () => {
  const pink = 'sweet-donut-pink';
  const blue = 'sweet-donut-blue';
  let state = fixture([shelf([pink, pink, null]), shelf([blue, null, null]), shelf(empty())]);
  state = play(state, { fromShelf: 1, fromSlot: 0, toShelf: 0, toSlot: 2 });
  assert.equal(state.cleared, 0);
  assert.deepEqual(state.shelves[0].front, [pink, pink, blue]);
  assert.equal(state.status, 'playing');
});

test('matching has priority over a momentarily full board', () => {
  let state = fixture([shelf([A, null, null], [[B, C, D]]), shelf([A, A, null]), shelf([B, C, D])]);
  state = play(state, { fromShelf: 0, fromSlot: 0, toShelf: 1, toSlot: 2 });
  assert.equal(state.status, 'playing');
  assert.equal(state.cleared, 3);
  assert.equal(getCounts(state).empty, 3);
  assert.ok(state.lastEvents.some(e => e.type === 'match'));
  assert.ok(state.lastEvents.some(e => e.type === 'reveal'));
  assert.ok(!state.lastEvents.some(e => e.type === 'lose'));
});

test('a full board with no completed triple loses immediately after revealing', () => {
  let state = fixture([shelf([A, null, null], [[B, C, D]]), shelf([B, C, null]), shelf([C, D, B])]);
  state = play(state, { fromShelf: 0, fromSlot: 0, toShelf: 1, toSlot: 2 });
  assert.equal(state.status, 'lost');
  assert.equal(state.reason, 'space');
  assert.equal(getCounts(state).empty, 0);
  assert.equal(state.lastEvents.at(-1).type, 'lose');
});

test('a real generated level can lose by filling its buffer with three different things', () => {
  let state = createGame(LEVELS[5], 'check');
  const buffer = state.shelves.findIndex(s => s.front.every(item => item === null));
  const source = state.shelves.findIndex(s => s.front.every(Boolean) && s.back.length > 0 && s.back[0].every(Boolean));
  assert.ok(buffer >= 0 && source >= 0);
  for (let slot = 0; slot < 3; slot++) state = play(state, { fromShelf: source, fromSlot: slot, toShelf: buffer, toSlot: slot });
  assert.equal(state.status, 'lost');
  assert.equal(state.reason, 'space');
  assert.equal(getCounts(state).empty, 0);
});

test('timer is monotonic, immutable and never revives a finished game', () => {
  const state = createGame(LEVELS[0], 'timer');
  const next = tick(state, 0.125);
  assert.equal(next.timeLeft, 149.875);
  assert.equal(state.timeLeft, 150);
  assert.equal(tick(next, -1), next);
  assert.equal(tick(next, NaN), next);
  assert.equal(tick(next, Infinity), next);
  const lost = tick(next, 1000);
  assert.equal(lost.timeLeft, 0);
  assert.equal(lost.reason, 'time');
  assert.equal(lost.status, 'lost');
  assert.equal(tick(lost, 10), lost);
  assert.equal(getHint(lost), null);
  assert.equal(tick({ ...state, status: 'won' }, 1000).status, 'won');
});

test('reversible detours retain a proven hint route and do not mutate the prior proof', () => {
  let state = createGame(LEVELS[0], 'detour');
  const original = JSON.stringify(state);
  const source = state.shelves.findIndex(s => s.front.filter(Boolean).length >= 2);
  assert.ok(source >= 0);
  const fromSlot = state.shelves[source].front.findIndex(Boolean);
  const target = state.shelves.findIndex(s => s.front.every(item => item === null));
  const toSlot = state._plan[0].toSlot === 0 ? 1 : 0;
  const next = moveItem(state, source, fromSlot, target, toSlot).state;
  assert.equal(JSON.stringify(state), original);
  assert.deepEqual(getHint(next), { fromShelf: target, fromSlot: toSlot, toShelf: source, toSlot: fromSlot });
  state = play(next, getHint(next));
  for (const move of state._plan) state = play(state, move);
  assert.equal(state.status, 'won');
});

test('solver recovers a solution after an unplanned irreversible reveal', () => {
  const state = fixture([
    shelf([A, A, null]), shelf([A, B, null]), shelf([B, C, null]),
    shelf([B, C, C]), shelf(empty()),
  ]);
  const result = solveGame(state, { maxNodes: 300, maxMs: 1000 });
  assert.ok(result.moves && result.moves.length > 0);
  let solved = state;
  for (const move of result.moves) solved = play(solved, move);
  assert.equal(solved.status, 'won');
  assert.ok(getHint(state));
});

test('solver can reveal hidden third copies instead of requiring an already visible triple', () => {
  const state = fixture([
    shelf([A, null, null], [[B, C, null]]),
    shelf([A, B, null], [[C, null, null]]),
    shelf([B, C, null], [[A, null, null]]),
    shelf(empty()),
  ]);
  const result = solveGame(state, { maxNodes: 500, maxMs: 1000 });
  assert.ok(result.moves, 'revealing an occupied shelf should create a solvable branch');
  let solved = state;
  for (const move of result.moves) solved = play(solved, move);
  assert.equal(solved.status, 'won');
});

test('hint solver recovers playable boards after randomized detours across all difficulty levels', () => {
  let randomState = 913;
  const random = () => ((randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0) / 4294967296);
  let recovered = 0;
  for (const level of LEVELS) for (let seed = 0; seed < 8; seed++) {
    let state = createGame(level, `detour-stress-${seed}`);
    for (let step = 0; step < 15 && state.status === 'playing'; step++) {
      const items = [];
      const spaces = [];
      state.shelves.forEach((row, s) => row.front.forEach((item, p) => (item === null ? spaces : items).push([s, p])));
      const source = items[Math.floor(random() * items.length)];
      const target = spaces[Math.floor(random() * spaces.length)];
      state = moveItem(state, ...source, ...target).state;
    }
    if (state.status !== 'playing' || state._plan) continue;
    const result = solveGame(state, { maxNodes: 500, maxMs: 1000 });
    assert.ok(result.moves, `recover level ${level.id}, seed ${seed}`);
    for (const move of result.moves) state = play(state, move);
    assert.equal(state.status, 'won');
    recovered++;
  }
  assert.ok(recovered > 50, 'exercise many irreversible reveal/match detours');
});

test('constructor rejects malformed levels rather than silently inventing a board', () => {
  assert.throws(() => createGame(null), TypeError);
  assert.throws(() => createGame({ ...LEVELS[0], shelfCount: 1 }), TypeError);
  assert.throws(() => createGame({ ...LEVELS[0], timeLimit: 0 }), TypeError);
  assert.throws(() => createGame({ ...LEVELS[0], items: [] }), TypeError);
});
