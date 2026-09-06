/* Deterministic circle physics. All outcomes depend on positions and forces. */
export const WORLD = Object.freeze({ width: 960, height: 540 });
export const PARTS = Object.freeze({
  ramp: Object.freeze({ label: 'さか', w: 180, h: 16, color: '#e9ae69' }),
  spring: Object.freeze({ label: 'ばね', w: 100, h: 22, color: '#e895af' }),
  fan: Object.freeze({ label: 'せんぷうき', w: 74, h: 64, range: 300, spread: 70, color: '#82c7bc' }),
  bumper: Object.freeze({ label: 'ぽよん', r: 34, color: '#efc65d' }),
});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function clampPart(part) {
  const m = PARTS[part.kind];
  if (!m) return part;
  part.angle = Number.isFinite(part.angle) ? Math.atan2(Math.sin(part.angle), Math.cos(part.angle)) : 0;
  const c = Math.abs(Math.cos(part.angle)), s = Math.abs(Math.sin(part.angle));
  const ex = m.r || c * m.w / 2 + s * m.h / 2;
  const ey = m.r || s * m.w / 2 + c * m.h / 2;
  part.x = clamp(Number.isFinite(part.x) ? part.x : 480, ex + 8, WORLD.width - ex - 8);
  part.y = clamp(Number.isFinite(part.y) ? part.y : 270, ey + 20, WORLD.height - ey - 12);
  return part;
}
export function hitTestPart(part, x, y, padding = 8) {
  const m = PARTS[part.kind];
  if (!m) return false;
  const dx = x - part.x, dy = y - part.y;
  if (m.r) return dx * dx + dy * dy <= (m.r + padding) ** 2;
  const c = Math.cos(part.angle || 0), s = Math.sin(part.angle || 0);
  return Math.abs(dx * c + dy * s) <= m.w / 2 + padding && Math.abs(-dx * s + dy * c) <= m.h / 2 + padding;
}
export function createSimulation(level, placements = []) {
  const g = level.goal, side = 9;
  return {
    level, placements: placements.map(p => ({ ...p, angle: p.angle || 0 })),
    ball: { x: level.spawn.x, y: level.spawn.y, vx: level.spawn.vx || 0, vy: level.spawn.vy || 0, r: 15, angle: 0 },
    goalColliders: [
      { x: g.x - g.w / 2, y: g.y, w: side, h: g.h, angle: 0, goal: true },
      { x: g.x + g.w / 2, y: g.y, w: side, h: g.h, angle: 0, goal: true },
      { x: g.x, y: g.y + g.h / 2, w: g.w + side, h: side, angle: 0, goal: true },
    ],
    elapsed: 0, status: 'running', stars: new Set(), events: [], trace: [],
    dwell: 0, stillTime: 0, traceClock: 0, eventTimes: {}, accumulator: 0,
  };
}
function event(st, type, id, x, y) {
  const key = `${type}:${id}`;
  if (st.elapsed - (st.eventTimes[key] ?? -100) < .18) return;
  st.eventTimes[key] = st.elapsed;
  st.events.push({ type, id, x, y, time: st.elapsed });
}
function rectContact(b, o) {
  const c = Math.cos(o.angle || 0), s = Math.sin(o.angle || 0);
  const dx = b.x - o.x, dy = b.y - o.y;
  const lx = dx * c + dy * s, ly = -dx * s + dy * c;
  const hx = o.w / 2, hy = o.h / 2;
  const qx = clamp(lx, -hx, hx), qy = clamp(ly, -hy, hy);
  let nx = lx - qx, ny = ly - qy;
  const dist = Math.hypot(nx, ny);
  let depth;
  if (dist >= b.r) return null;
  if (dist > .00001) { nx /= dist; ny /= dist; depth = b.r - dist; }
  else {
    const px = hx - Math.abs(lx), py = hy - Math.abs(ly);
    if (px < py) { nx = lx >= 0 ? 1 : -1; ny = 0; depth = b.r + px; }
    else { nx = 0; ny = ly >= 0 ? 1 : -1; depth = b.r + py; }
  }
  return { nx: nx * c - ny * s, ny: nx * s + ny * c, localNy: ny, depth };
}
function collide(st, o, kind, id) {
  const b = st.ball;
  let ct;
  if (kind === 'bumper') {
    const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy);
    if (d >= b.r + o.r) return;
    ct = { nx: d ? dx / d : 0, ny: d ? dy / d : -1, depth: b.r + o.r - d };
  } else ct = rectContact(b, o);
  if (!ct) return;
  b.x += ct.nx * (ct.depth + .025); b.y += ct.ny * (ct.depth + .025);
  const vn = b.vx * ct.nx + b.vy * ct.ny;
  if (vn >= 0) return;
  let restitution = kind === 'bumper' ? .9 : kind === 'ramp' ? .02 : o.goal ? .06 : .08;
  b.vx -= (1 + restitution) * vn * ct.nx;
  b.vy -= (1 + restitution) * vn * ct.ny;
  if (kind === 'spring' && ct.localNy < -.65 && st.elapsed - (st.eventTimes[`spring:${id}`] ?? -100) > .2) {
    const launch = 530;
    const speedNormal = b.vx * ct.nx + b.vy * ct.ny;
    b.vx += (launch - speedNormal) * ct.nx;
    b.vy += (launch - speedNormal) * ct.ny;
    event(st, 'spring', id, b.x, b.y);
  } else if (kind === 'bumper') {
    // A soft energetic cushion preserves a fun bounce even after a short drop.
    const speedNormal = b.vx * ct.nx + b.vy * ct.ny;
    const boost = Math.max(0, 210 - speedNormal);
    b.vx += ct.nx * boost; b.vy += ct.ny * boost;
    event(st, 'bounce', id, b.x, b.y);
  } else if (-vn > 95) event(st, 'land', id, b.x, b.y);
  if (o.goal) {
    // The woven basket dissipates tangential speed on physical contact.
    const tx = -ct.ny, ty = ct.nx, vt = b.vx * tx + b.vy * ty;
    b.vx -= vt * .08 * tx; b.vy -= vt * .08 * ty;
  }
}
const FIXED_DT = 1 / 240;
function tick(st) {
  const dt = FIXED_DT, b = st.ball, level = st.level;
  st.elapsed += dt;
  b.vy += (level.gravity ?? 500) * dt;
  for (const p of st.placements) {
    if (p.kind !== 'fan') continue;
    const c = Math.cos(p.angle), s = Math.sin(p.angle);
    const dx = b.x - p.x, dy = b.y - p.y;
    const along = dx * c + dy * s, across = -dx * s + dy * c;
    const m = PARTS.fan;
    if (along > 18 && along < m.range && Math.abs(across) < m.spread + along * .08) {
      const force = 830 * (.7 + .3 * (1 - along / m.range));
      b.vx += c * force * dt; b.vy += s * force * dt;
      event(st, 'wind', p.id, b.x, b.y);
    }
  }
  b.vx *= 1 - .045 * dt; b.vy *= 1 - .015 * dt;
  b.vx = clamp(b.vx, -1150, 1150); b.vy = clamp(b.vy, -1150, 1150);
  b.x += b.vx * dt; b.y += b.vy * dt;
  b.angle += b.vx * dt / b.r;
  for (let pass = 0; pass < 2; pass++) {
    for (const [i, o] of (level.obstacles || []).entries()) collide(st, o, 'obstacle', `o${i}`);
    for (const p of st.placements) {
      if (p.kind === 'fan') continue; // air is non-solid; fan's visible base is away from its stream
      const m = PARTS[p.kind];
      if (m) collide(st, { ...m, ...p }, p.kind, p.id);
    }
    for (const [i, o] of st.goalColliders.entries()) collide(st, o, 'goal', `g${i}`);
  }
  for (const [i, star] of (level.stars || []).entries()) {
    if (!st.stars.has(i) && Math.hypot(b.x - star.x, b.y - star.y) < b.r + 19) {
      st.stars.add(i); event(st, 'star', i, star.x, star.y);
    }
  }
  const g = level.goal;
  const inside = Math.abs(b.x - g.x) < g.w / 2 - b.r * .7 && b.y > g.y - g.h / 2 - b.r * .25 && b.y < g.y + g.h / 2;
  st.dwell = inside ? st.dwell + dt : 0;
  if (st.dwell >= .25) { st.status = 'won'; event(st, 'win', 'goal', b.x, b.y); }
  else if (b.y > WORLD.height + 90 || b.x < -100 || b.x > WORLD.width + 100 || b.y < -900) {
    st.status = 'lost'; event(st, 'lost', 'bounds', b.x, b.y);
  }
  const slow = Math.hypot(b.vx, b.vy) < 5;
  st.stillTime = slow ? st.stillTime + dt : 0;
  if (st.status === 'running' && (st.stillTime > 4 || st.elapsed > 40)) { st.status = 'lost'; event(st, 'lost', 'stuck', b.x, b.y); }
  st.traceClock += dt;
  if (st.traceClock >= .07) { st.traceClock = 0; st.trace.push({ x: b.x, y: b.y }); if (st.trace.length > 600) st.trace.shift(); }
}
export function stepSimulation(state, dt) {
  if (state.status !== 'running' || !Number.isFinite(dt) || dt <= 0) return state;
  state.accumulator += Math.min(dt, .25);
  while (state.accumulator >= FIXED_DT && state.status === 'running') {
    tick(state); state.accumulator -= FIXED_DT;
  }
  return state;
}
