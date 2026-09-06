import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, stepSimulation, WORLD, PARTS, hitTestPart, clampPart } from '../physics.mjs';
import { LEVELS, SANDBOX } from '../levels.mjs';

function play(level, placements, dt = 1 / 60) {
  const state = createSimulation(level, placements);
  for (let n = 0; n < 45 / dt && state.status === 'running'; n++) {
    stepSimulation(state, dt);
    for (const key of ['x', 'y', 'vx', 'vy', 'angle']) assert.ok(Number.isFinite(state.ball[key]), `finite ${key}`);
  }
  return state;
}
for (const level of LEVELS) {
  test(`stage ${level.id}: authored route physically wins and collects both optional stars`, () => {
    const result = play(level, level.solution);
    assert.equal(result.status, 'won', `${level.title}: ${JSON.stringify(result.ball)}`);
    assert.equal(result.stars.size, 2, `${level.title}: stars ${[...result.stars]}`);
    assert.ok(result.dwell >= .25, 'ball actually stayed in the basket');
    assert.ok(result.elapsed < 15, 'example resolves promptly');
    assert.ok(result.events.some(e => e.type === 'win'));
  });
  test(`stage ${level.id}: an empty workshop does not solve the puzzle`, () => {
    assert.equal(play(level, []).status, 'lost');
  });
}
test('level inventory, IDs, and coordinate metadata are valid', () => {
  assert.equal(LEVELS.length, 18);
  assert.equal(new Set(LEVELS.map(l => l.id)).size, 18);
  for (const level of LEVELS) {
    const counts = {};
    for (const p of level.solution) {
      assert.ok(PARTS[p.kind]);
      counts[p.kind] = (counts[p.kind] || 0) + 1;
      const bounded = clampPart({ ...p });
      assert.equal(bounded.x, p.x, 'hint x fits within workshop');
      assert.equal(bounded.y, p.y, 'hint y fits within workshop');
      assert.ok(Math.abs(bounded.angle - p.angle) < 1e-10, 'hint rotation stays the same');
    }
    for (const [kind, n] of Object.entries(counts)) assert.ok(level.inventory[kind] >= n);
    assert.equal(level.stars.length, 2);
    assert.ok(level.goal.x - level.goal.w / 2 > 0 && level.goal.x + level.goal.w / 2 < WORLD.width);
  }
  assert.ok(SANDBOX.inventory.ramp >= 6);
});
test('physics result does not use solution identity or solution metadata', () => {
  const level = LEVELS[0];
  const withoutKey = { ...level, solution: [], id: 'unknown', title: '' };
  const placements = level.solution.map(p => ({ ...p, id: 'a completely new ID' }));
  const a = play(level, level.solution), b = play(withoutKey, placements);
  assert.equal(b.status, 'won');
  assert.deepEqual(a.ball, b.ball);
  assert.equal(a.elapsed, b.elapsed);
});
test('ramp rotation changes the actual trajectory', () => {
  const level = LEVELS[0];
  const right = play(level, level.solution);
  const left = play(level, level.solution.map(p => ({ ...p, angle: -.32 })));
  assert.equal(right.status, 'won');
  assert.equal(left.status, 'lost');
  assert.ok(Math.abs(right.ball.x - left.ball.x) > 200);
});
test('small position adjustments can still solve the first stage', () => {
  const level = LEVELS[0];
  for (const delta of [-3, 3]) {
    assert.equal(play(level, level.solution.map(p => ({ ...p, x: p.x + delta, y: p.y + delta }))).status, 'won');
  }
});
test('30 Hz and 144 Hz render updates produce the same fixed-step result', () => {
  for (const id of [1, 6, 11, 18]) {
    const level = LEVELS[id - 1];
    const a = play(level, level.solution, 1 / 30), b = play(level, level.solution, 1 / 144);
    assert.equal(a.status, b.status);
    assert.deepEqual(a.ball, b.ball);
    assert.equal(a.elapsed, b.elapsed);
  }
});
test('spring and bumper physically bounce; reversing the fan changes horizontal motion', () => {
  assert.ok(play(LEVELS[3], LEVELS[3].solution).events.some(e => e.type === 'spring'));
  assert.ok(play(LEVELS[5], LEVELS[5].solution).events.some(e => e.type === 'bounce'));
  const level = { ...SANDBOX, spawn: { x: 480, y: 150 }, gravity: 0 };
  const right = createSimulation(level, [{ id: 'f', kind: 'fan', x: 380, y: 150, angle: 0 }]);
  const left = createSimulation(level, [{ id: 'f', kind: 'fan', x: 580, y: 150, angle: Math.PI }]);
  for (let i = 0; i < 30; i++) { stepSimulation(right, 1 / 60); stepSimulation(left, 1 / 60); }
  assert.ok(right.ball.x > 530 && left.ball.x < 430);
});
test('rotated hit testing and boundary clamping support the editor', () => {
  const ramp = { kind: 'ramp', x: 200, y: 200, angle: Math.PI / 2 };
  assert.equal(hitTestPart(ramp, 200, 270, 0), true);
  assert.equal(hitTestPart(ramp, 270, 200, 0), false);
  const bounded = clampPart({ ...ramp, x: -100, y: 9999 });
  assert.ok(bounded.x > 0 && bounded.y < 540);
  assert.equal(hitTestPart({ kind: 'bumper', x: 100, y: 100 }, 115, 110), true);
});
test('bad frame deltas are harmless and simultaneous contacts remain finite', () => {
  const placements = [
    { id: 'a', kind: 'ramp', x: 180, y: 110, angle: .4 },
    { id: 'b', kind: 'ramp', x: 180, y: 110, angle: -.4 },
    { id: 'c', kind: 'bumper', x: 180, y: 110, angle: 0 },
  ];
  const state = createSimulation(SANDBOX, placements);
  for (const dt of [NaN, -1, Infinity, 0]) stepSimulation(state, dt);
  assert.equal(state.elapsed, 0);
  const result = play(SANDBOX, placements);
  assert.notEqual(result.status, 'running');
});
