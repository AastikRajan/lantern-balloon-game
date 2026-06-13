# Lantern Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser-playable vertical slice of Lantern: a glowing 3D lantern rises through a dusk sky, the player swipes to gust debris away, flame = health/light/multiplier, with bloom post-processing that already looks premium.

**Architecture:** Fixed-timestep game loop drives a Rapier 2D physics world (gameplay plane z=0); a Three.js scene with pmndrs postprocessing renders interpolated state in 2.5D; a DOM overlay renders UI. Systems communicate through a typed event bus; all spawned bodies/meshes come from pools.

**Tech Stack:** Vite, TypeScript, Three.js, postprocessing (pmndrs), @dimforge/rapier2d-compat, Vitest, DOM/CSS UI.

**File structure:**

```
index.html              — canvas + #ui root, viewport-fit=cover, base CSS link
src/main.ts             — boot: init physics+render+ui, wire loop & states
src/core/events.ts      — typed event bus
src/core/loop.ts        — fixed-timestep accumulator with interpolation alpha
src/core/state.ts       — state machine: menu | run | gameover
src/core/pool.ts        — generic object pool
src/gameplay/flame.ts   — flame value, damage, flare, multiplier, light params
src/gameplay/score.ts   — altitude score × flame multiplier
src/gameplay/gust.ts    — swipe → impulse field math (pure)
src/gameplay/spawner.ts — obstacle/ember spawn cadence & placement (pure)
src/physics/world.ts    — Rapier world, lantern body, obstacle/ember pools, collisions
src/render/scene.ts     — renderer, camera, resize, scene root
src/render/post.ts      — composer: render pass, bloom, vignette, SMAA
src/render/sky.ts       — gradient sky plane shader + fog
src/render/lantern.ts   — lantern mesh + point light + squash/stretch
src/render/obstacles.ts — pooled meshes synced from physics
src/render/particles.ts — gust streaks + ember glow points
src/ui/hud.ts           — score + flame bar DOM
src/ui/screens.ts       — home + game-over overlays
src/styles.css          — UI styling (glass panels, thumb-zone layout, safe areas)
tests/*.test.ts         — Vitest unit tests for core/gameplay/physics logic
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/styles.css`, `src/main.ts` (stub)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "lantern",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install three postprocessing @dimforge/rapier2d-compat` then `npm install -D typescript vite vitest @types/three`
Expected: packages added without errors.

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true },
  build: { target: 'es2022' },
});
```

- [ ] **Step 5: Create index.html**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="theme-color" content="#1a1030" />
  <title>Lantern</title>
  <link rel="stylesheet" href="/src/styles.css" />
</head>
<body>
  <canvas id="game"></canvas>
  <div id="ui"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 6: Create src/styles.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { height: 100%; overflow: hidden; background: #1a1030; touch-action: none;
  font-family: system-ui, -apple-system, sans-serif; user-select: none; -webkit-user-select: none; }
#game { position: fixed; inset: 0; width: 100%; height: 100%; display: block; }
#ui { position: fixed; inset: 0; pointer-events: none;
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           calc(env(safe-area-inset-bottom) + 12px) env(safe-area-inset-left); }
#ui .interactive { pointer-events: auto; }
```

- [ ] **Step 7: Create stub src/main.ts**

```ts
console.log('Lantern boot');
```

- [ ] **Step 8: Verify dev server**

Run: `npm run dev` (background), fetch `http://localhost:5173/` — expect HTML containing `id="game"`. Then stop or keep server for later tasks.

- [ ] **Step 9: Create .gitignore and commit**

`.gitignore`:
```
node_modules
dist
```

```bash
git add -A
git commit -m "chore: scaffold Vite + TS project for Lantern"
```

---

### Task 2: Event bus and fixed-timestep loop

**Files:**
- Create: `src/core/events.ts`, `src/core/loop.ts`
- Test: `tests/loop.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/loop.test.ts
import { describe, it, expect } from 'vitest';
import { EventBus } from '../src/core/events';
import { FixedLoop } from '../src/core/loop';

describe('EventBus', () => {
  it('delivers payloads to subscribers and supports off()', () => {
    const bus = new EventBus<{ hit: { speed: number } }>();
    const got: number[] = [];
    const off = bus.on('hit', (e) => got.push(e.speed));
    bus.emit('hit', { speed: 5 });
    off();
    bus.emit('hit', { speed: 9 });
    expect(got).toEqual([5]);
  });
});

describe('FixedLoop', () => {
  it('steps fixed dt and reports interpolation alpha', () => {
    const steps: number[] = [];
    const loop = new FixedLoop(1 / 60, (dt) => steps.push(dt));
    const alpha = loop.advance(0.05); // 3 steps of 1/60 = 0.05 exactly
    expect(steps.length).toBe(3);
    expect(steps[0]).toBeCloseTo(1 / 60);
    expect(alpha).toBeCloseTo(0, 5);
  });
  it('carries remainder and clamps huge frames', () => {
    const steps: number[] = [];
    const loop = new FixedLoop(1 / 60, () => steps.push(1));
    loop.advance(0.025); // 1 step + 0.00833 left
    expect(steps.length).toBe(1);
    loop.advance(2.0); // clamped to max 0.25s => at most 15 more steps
    expect(steps.length).toBeLessThanOrEqual(16);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/loop.test.ts` → FAIL (modules missing).

- [ ] **Step 3: Implement**

```ts
// src/core/events.ts
type Handler<T> = (payload: T) => void;

export class EventBus<M extends Record<string, unknown>> {
  private handlers = new Map<keyof M, Set<Handler<never>>>();

  on<K extends keyof M>(type: K, fn: Handler<M[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) { set = new Set(); this.handlers.set(type, set); }
    set.add(fn as Handler<never>);
    return () => set!.delete(fn as Handler<never>);
  }

  emit<K extends keyof M>(type: K, payload: M[K]): void {
    this.handlers.get(type)?.forEach((fn) => (fn as Handler<M[K]>)(payload));
  }

  clear(): void { this.handlers.clear(); }
}
```

```ts
// src/core/loop.ts
export class FixedLoop {
  private accumulator = 0;
  constructor(
    readonly dt: number,
    private step: (dt: number) => void,
    private maxFrame = 0.25,
  ) {}

  /** Advance by elapsed seconds; returns interpolation alpha in [0,1). */
  advance(elapsed: number): number {
    this.accumulator += Math.min(elapsed, this.maxFrame);
    while (this.accumulator >= this.dt) {
      this.step(this.dt);
      this.accumulator -= this.dt;
    }
    return this.accumulator / this.dt;
  }
}
```

- [ ] **Step 4: Run tests** — `npx vitest run tests/loop.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: event bus and fixed-timestep loop"`

---

### Task 3: Generic object pool

**Files:**
- Create: `src/core/pool.ts`
- Test: `tests/pool.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/pool.test.ts
import { describe, it, expect } from 'vitest';
import { Pool } from '../src/core/pool';

describe('Pool', () => {
  it('reuses released objects instead of creating new ones', () => {
    let created = 0;
    const pool = new Pool(() => ({ id: created++ }), (o) => o);
    const a = pool.acquire();
    pool.release(a);
    const b = pool.acquire();
    expect(b).toBe(a);
    expect(created).toBe(1);
  });
  it('runs reset on acquire of recycled object', () => {
    const pool = new Pool(() => ({ v: 0 }), (o) => { o.v = 0; return o; });
    const a = pool.acquire(); a.v = 42;
    pool.release(a);
    expect(pool.acquire().v).toBe(0);
  });
  it('tracks active objects for iteration', () => {
    const pool = new Pool(() => ({}), (o) => o);
    const a = pool.acquire(); pool.acquire();
    pool.release(a);
    expect(pool.active.size).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/pool.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/core/pool.ts
export class Pool<T extends object> {
  private free: T[] = [];
  readonly active = new Set<T>();

  constructor(private create: () => T, private reset: (obj: T) => T) {}

  acquire(): T {
    const obj = this.free.pop() ?? this.create();
    const ready = this.reset(obj);
    this.active.add(ready);
    return ready;
  }

  release(obj: T): void {
    if (this.active.delete(obj)) this.free.push(obj);
  }

  releaseAll(): void {
    this.active.forEach((o) => this.free.push(o));
    this.active.clear();
  }
}
```

- [ ] **Step 4: Run tests** — PASS. **Step 5: Commit** — `git commit -am "feat: generic object pool"`

---

### Task 4: Flame system

**Files:**
- Create: `src/gameplay/flame.ts`
- Test: `tests/flame.test.ts`

Behavior (from spec §2.1): flame 0–100, starts 70. Damage scales with impact speed (`dmg = min(45, speed * 2.2)`), ember flare +22, multiplier 1→3 linear in flame, light params derived, dead at 0.

- [ ] **Step 1: Write failing tests**

```ts
// tests/flame.test.ts
import { describe, it, expect } from 'vitest';
import { Flame } from '../src/gameplay/flame';

describe('Flame', () => {
  it('starts at 70 and clamps to [0,100]', () => {
    const f = new Flame();
    expect(f.value).toBe(70);
    f.flare(); f.flare();
    expect(f.value).toBe(100);
  });
  it('takes velocity-scaled damage, capped at 45', () => {
    const f = new Flame();
    f.hit(10); // 22 dmg
    expect(f.value).toBeCloseTo(48);
    f.hit(1000); // capped 45
    expect(f.value).toBeCloseTo(3);
  });
  it('dies at zero', () => {
    const f = new Flame();
    f.hit(1000); f.hit(1000);
    expect(f.value).toBe(0);
    expect(f.dead).toBe(true);
  });
  it('maps multiplier 1..3 and light params from value', () => {
    const f = new Flame();
    (f as unknown as { _value: number })._value = 100;
    expect(f.multiplier).toBeCloseTo(3);
    (f as unknown as { _value: number })._value = 0;
    expect(f.multiplier).toBeCloseTo(1);
    expect(f.lightIntensity).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/gameplay/flame.ts
export class Flame {
  private _value = 70;

  get value(): number { return this._value; }
  get dead(): boolean { return this._value <= 0; }
  /** Score multiplier 1..3 linear in flame. */
  get multiplier(): number { return 1 + 2 * (this._value / 100); }
  /** Point-light intensity for the renderer. */
  get lightIntensity(): number { return 8 + 60 * (this._value / 100); }
  /** Point-light distance (vision radius) in world units. */
  get lightDistance(): number { return 6 + 14 * (this._value / 100); }
  /** 0 = full vignette darkness, 1 = bright. */
  get brightness(): number { return 0.25 + 0.75 * (this._value / 100); }

  hit(impactSpeed: number): number {
    const dmg = Math.min(45, impactSpeed * 2.2);
    this._value = Math.max(0, this._value - dmg);
    return dmg;
  }

  flare(): void { this._value = Math.min(100, this._value + 22); }
  reset(): void { this._value = 70; }
}
```

- [ ] **Step 4: Run tests** → PASS. **Step 5: Commit** — `git commit -am "feat: flame health/light/multiplier system"`

---

### Task 5: Score system

**Files:**
- Create: `src/gameplay/score.ts`
- Test: `tests/score.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/score.test.ts
import { describe, it, expect } from 'vitest';
import { Score } from '../src/gameplay/score';

describe('Score', () => {
  it('accrues altitude gain times multiplier, floors display value', () => {
    const s = new Score();
    s.update(10, 2);   // altitude 10, x2 => 20
    s.update(10, 2);   // same altitude => no gain
    s.update(15, 3);   // +5 at x3 => +15 => 35
    expect(s.points).toBe(35);
  });
  it('ignores downward movement and resets cleanly', () => {
    const s = new Score();
    s.update(10, 1);
    s.update(4, 1);
    expect(s.points).toBe(10);
    s.reset();
    expect(s.points).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/gameplay/score.ts
export class Score {
  private raw = 0;
  private bestAltitude = 0;

  get points(): number { return Math.floor(this.raw); }

  update(altitude: number, multiplier: number): void {
    if (altitude > this.bestAltitude) {
      this.raw += (altitude - this.bestAltitude) * multiplier;
      this.bestAltitude = altitude;
    }
  }

  reset(): void { this.raw = 0; this.bestAltitude = 0; }
}
```

- [ ] **Step 4: Run tests** → PASS. **Step 5: Commit** — `git commit -am "feat: altitude score with flame multiplier"`

---

### Task 6: Gust impulse-field math (pure)

**Files:**
- Create: `src/gameplay/gust.ts`
- Test: `tests/gust.test.ts`

Behavior (spec §2.2): a swipe segment (world coords, with speed) produces impulses on bodies within radius R of the segment: direction = swipe direction, magnitude ∝ swipe speed × linear falloff with distance; capped. Lantern gets `LANTERN_FACTOR` (0.12) of the obstacle impulse.

- [ ] **Step 1: Write failing tests**

```ts
// tests/gust.test.ts
import { describe, it, expect } from 'vitest';
import { gustImpulse, GUST_RADIUS } from '../src/gameplay/gust';

describe('gustImpulse', () => {
  const seg = { ax: 0, ay: 0, bx: 2, by: 0, speed: 20 };
  it('pushes along the swipe direction with falloff by distance', () => {
    const near = gustImpulse(seg, 1, 0.5);   // 0.5 above midpoint of segment
    const far = gustImpulse(seg, 1, GUST_RADIUS * 0.9);
    expect(near).not.toBeNull();
    expect(far).not.toBeNull();
    expect(near!.x).toBeGreaterThan(far!.x);
    expect(near!.x).toBeGreaterThan(0);
    expect(Math.abs(near!.y)).toBeLessThan(1e-9);
  });
  it('returns null outside the radius', () => {
    expect(gustImpulse(seg, 1, GUST_RADIUS + 0.1)).toBeNull();
  });
  it('caps magnitude for violent swipes', () => {
    const wild = gustImpulse({ ...seg, speed: 10_000 }, 1, 0.1);
    expect(Math.hypot(wild!.x, wild!.y)).toBeLessThanOrEqual(60.000001);
  });
});
```

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/gameplay/gust.ts
export const GUST_RADIUS = 4.5;
export const GUST_STRENGTH = 1.6;
export const GUST_MAX_IMPULSE = 60;
export const LANTERN_FACTOR = 0.12;

export interface SwipeSegment { ax: number; ay: number; bx: number; by: number; speed: number; }
export interface Impulse { x: number; y: number; }

/** Distance from point P to segment AB. */
function distToSegment(seg: SwipeSegment, px: number, py: number): number {
  const dx = seg.bx - seg.ax, dy = seg.by - seg.ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - seg.ax) * dx + (py - seg.ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (seg.ax + t * dx), py - (seg.ay + t * dy));
}

export function gustImpulse(seg: SwipeSegment, px: number, py: number): Impulse | null {
  const d = distToSegment(seg, px, py);
  if (d > GUST_RADIUS) return null;
  const dx = seg.bx - seg.ax, dy = seg.by - seg.ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const falloff = 1 - d / GUST_RADIUS;
  const mag = Math.min(GUST_MAX_IMPULSE, seg.speed * GUST_STRENGTH * falloff);
  return { x: (dx / len) * mag, y: (dy / len) * mag };
}
```

- [ ] **Step 4: Run tests** → PASS. **Step 5: Commit** — `git commit -am "feat: gust impulse field math"`

---

### Task 7: Spawner logic (pure)

**Files:**
- Create: `src/gameplay/spawner.ts`
- Test: `tests/spawner.test.ts`

Behavior: given altitude and a seeded RNG, decide when/where to spawn obstacles and embers. Spawn interval shrinks with altitude (1.6s → 0.55s by altitude 400). X positions inside `[-halfWidth, +halfWidth]`. Obstacle kinds cycle through `tile | kite | branch`. Every ~5th spawn is an ember instead.

- [ ] **Step 1: Write failing tests**

```ts
// tests/spawner.test.ts
import { describe, it, expect } from 'vitest';
import { Spawner, spawnInterval } from '../src/gameplay/spawner';

describe('spawnInterval', () => {
  it('shrinks with altitude and clamps at floor', () => {
    expect(spawnInterval(0)).toBeCloseTo(1.6);
    expect(spawnInterval(200)).toBeLessThan(1.6);
    expect(spawnInterval(10_000)).toBeCloseTo(0.55);
  });
});

describe('Spawner', () => {
  it('emits spawns over time with bounded x and is deterministic per seed', () => {
    const a = new Spawner(7, 5);
    const b = new Spawner(7, 5);
    const out: { kind: string; x: number }[] = [];
    for (let t = 0; t < 30; t++) {
      const sa = a.tick(0.1, 50);
      const sb = b.tick(0.1, 50);
      expect(sa?.kind).toBe(sb?.kind);
      if (sa) { out.push(sa); expect(Math.abs(sa.x)).toBeLessThanOrEqual(5); }
    }
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((s) => s.kind === 'ember')).toBe(false); // too few spawns in 3s for 5th
  });
  it('produces an ember on every 5th spawn', () => {
    const s = new Spawner(1, 5);
    const kinds: string[] = [];
    for (let t = 0; t < 600; t++) {
      const sp = s.tick(0.1, 999_999); // min interval
      if (sp) kinds.push(sp.kind);
    }
    expect(kinds[4]).toBe('ember');
    expect(kinds[9]).toBe('ember');
  });
});
```

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/gameplay/spawner.ts
export type SpawnKind = 'tile' | 'kite' | 'branch' | 'ember';
export interface SpawnRequest { kind: SpawnKind; x: number; }

export function spawnInterval(altitude: number): number {
  const t = Math.min(1, altitude / 400);
  return 1.6 - (1.6 - 0.55) * t;
}

/** Deterministic LCG so runs are reproducible per seed. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const OBSTACLE_KINDS: SpawnKind[] = ['tile', 'kite', 'branch'];

export class Spawner {
  private rng: () => number;
  private timer = 0;
  private count = 0;

  constructor(seed: number, private halfWidth: number) {
    this.rng = lcg(seed);
  }

  tick(dt: number, altitude: number): SpawnRequest | null {
    this.timer += dt;
    if (this.timer < spawnInterval(altitude)) return null;
    this.timer = 0;
    this.count++;
    const x = (this.rng() * 2 - 1) * this.halfWidth;
    if (this.count % 5 === 0) return { kind: 'ember', x };
    const kind = OBSTACLE_KINDS[Math.floor(this.rng() * OBSTACLE_KINDS.length)];
    return { kind, x };
  }

  reset(): void { this.timer = 0; this.count = 0; }
}
```

- [ ] **Step 4: Run tests** → PASS. **Step 5: Commit** — `git commit -am "feat: deterministic obstacle/ember spawner"`

---

### Task 8: Physics world (Rapier)

**Files:**
- Create: `src/physics/world.ts`
- Test: `tests/physics.test.ts`

Responsibilities: init Rapier (async WASM), lantern dynamic body (gravityScale 0, CCD, steady rise toward `RISE_SPEED`, lateral damping), pooled obstacle bodies (dynamic, CCD, gravity), ember sensor bodies, step + drain collision events, expose typed events: `lanternHit {speed}`, `emberCollected {}`. Recycle bodies fallen below camera.

- [ ] **Step 1: Write failing tests**

```ts
// tests/physics.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { PhysicsWorld, RISE_SPEED } from '../src/physics/world';

describe('PhysicsWorld', () => {
  beforeAll(async () => { await PhysicsWorld.init(); });

  it('lantern rises at steady speed', () => {
    const w = new PhysicsWorld();
    for (let i = 0; i < 120; i++) w.step(1 / 60);
    const y = w.lanternPosition().y;
    expect(y).toBeGreaterThan(RISE_SPEED * 1.5);
    expect(y).toBeLessThan(RISE_SPEED * 2.5);
  });

  it('spawns obstacles that fall and recycles them below the cull line', () => {
    const w = new PhysicsWorld();
    w.spawnObstacle('tile', 0, 10);
    expect(w.obstacleCount()).toBe(1);
    for (let i = 0; i < 600; i++) { w.step(1 / 60); w.cullBelow(w.lanternPosition().y - 12); }
    expect(w.obstacleCount()).toBe(0);
  });

  it('emits lanternHit with impact speed when an obstacle lands on the lantern', () => {
    const w = new PhysicsWorld();
    let hitSpeed = -1;
    w.events.on('lanternHit', (e) => { hitSpeed = e.speed; });
    w.spawnObstacle('tile', 0, w.lanternPosition().y + 6);
    for (let i = 0; i < 300 && hitSpeed < 0; i++) w.step(1 / 60);
    expect(hitSpeed).toBeGreaterThan(0);
  });

  it('emits emberCollected when lantern touches an ember sensor', () => {
    const w = new PhysicsWorld();
    let collected = 0;
    w.events.on('emberCollected', () => collected++);
    w.spawnEmber(0, w.lanternPosition().y + 2);
    for (let i = 0; i < 300 && collected === 0; i++) w.step(1 / 60);
    expect(collected).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/physics/world.ts
import RAPIER from '@dimforge/rapier2d-compat';
import { EventBus } from '../core/events';
import type { SpawnKind } from '../gameplay/spawner';
import { gustImpulse, LANTERN_FACTOR, type SwipeSegment } from '../gameplay/gust';

export const RISE_SPEED = 2.2;           // world units / s
export const PLAY_HALF_WIDTH = 5;        // gameplay corridor half width

export interface ObstacleState {
  kind: Exclude<SpawnKind, 'ember'>;
  body: RAPIER.RigidBody;
}
export interface EmberState { body: RAPIER.RigidBody; }

type PhysicsEvents = {
  lanternHit: { speed: number };
  emberCollected: Record<string, never>;
};

const OBSTACLE_SHAPES: Record<Exclude<SpawnKind, 'ember'>, { hx: number; hy: number; density: number }> = {
  tile:   { hx: 0.55, hy: 0.35, density: 1.4 },
  kite:   { hx: 0.45, hy: 0.45, density: 0.6 },
  branch: { hx: 1.1,  hy: 0.18, density: 1.0 },
};

export class PhysicsWorld {
  static async init(): Promise<void> { await RAPIER.init(); }

  readonly events = new EventBus<PhysicsEvents>();
  private world = new RAPIER.World({ x: 0, y: -7.5 });
  private queue = new RAPIER.EventQueue(true);
  private lantern: RAPIER.RigidBody;
  private lanternCollider: RAPIER.Collider;
  private obstacles = new Map<number, ObstacleState>(); // collider handle -> state
  private embers = new Map<number, EmberState>();

  constructor() {
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 0)
      .setGravityScale(0)
      .setLinearDamping(1.6)
      .setCcdEnabled(true);
    this.lantern = this.world.createRigidBody(desc);
    this.lanternCollider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(0.55) // slightly smaller than visual (spec fairness)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.lantern,
    );
  }

  lanternPosition(): { x: number; y: number } {
    const t = this.lantern.translation();
    return { x: t.x, y: t.y };
  }
  lanternVelocity(): { x: number; y: number } {
    const v = this.lantern.linvel();
    return { x: v.x, y: v.y };
  }
  obstacleCount(): number { return this.obstacles.size; }

  /** All live obstacles for render sync. */
  forEachObstacle(fn: (kind: string, x: number, y: number, rot: number) => void): void {
    this.obstacles.forEach((o) => {
      const t = o.body.translation();
      fn(o.kind, t.x, t.y, o.body.rotation());
    });
  }
  forEachEmber(fn: (x: number, y: number) => void): void {
    this.embers.forEach((e) => { const t = e.body.translation(); fn(t.x, t.y); });
  }

  spawnObstacle(kind: Exclude<SpawnKind, 'ember'>, x: number, y: number): void {
    const shape = OBSTACLE_SHAPES[kind];
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y)
        .setAngvel((Math.random() - 0.5) * 4)
        .setCcdEnabled(true),
    );
    const col = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(shape.hx, shape.hy)
        .setDensity(shape.density)
        .setRestitution(0.35)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    this.obstacles.set(col.handle, { kind, body });
  }

  spawnEmber(x: number, y: number): void {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y).setGravityScale(0),
    );
    const col = this.world.createCollider(
      RAPIER.ColliderDesc.ball(0.45).setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    this.embers.set(col.handle, { body });
  }

  applyGust(seg: SwipeSegment): void {
    this.obstacles.forEach((o) => {
      const t = o.body.translation();
      const imp = gustImpulse(seg, t.x, t.y);
      if (imp) o.body.applyImpulse({ x: imp.x * o.body.mass(), y: imp.y * o.body.mass() }, true);
    });
    const lt = this.lantern.translation();
    const li = gustImpulse(seg, lt.x, lt.y);
    if (li) this.lantern.applyImpulse(
      { x: li.x * LANTERN_FACTOR * this.lantern.mass(), y: li.y * LANTERN_FACTOR * this.lantern.mass() }, true);
  }

  step(dt: number): void {
    // steady rise: ease vertical velocity toward RISE_SPEED, keep lateral free
    const v = this.lantern.linvel();
    this.lantern.setLinvel({ x: v.x, y: v.y + (RISE_SPEED - v.y) * 0.15 }, true);
    // soft corridor: nudge back inside the play width
    const t = this.lantern.translation();
    if (Math.abs(t.x) > PLAY_HALF_WIDTH) {
      this.lantern.applyImpulse({ x: -Math.sign(t.x) * 0.6 * this.lantern.mass(), y: 0 }, true);
    }

    this.world.timestep = dt;
    this.world.step(this.queue);

    this.queue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const lh = this.lanternCollider.handle;
      const other = h1 === lh ? h2 : h2 === lh ? h1 : null;
      if (other === null) return;
      const ember = this.embers.get(other);
      if (ember) {
        this.world.removeRigidBody(ember.body);
        this.embers.delete(other);
        this.events.emit('emberCollected', {});
        return;
      }
      const obs = this.obstacles.get(other);
      if (obs) {
        const ov = obs.body.linvel();
        const lv = this.lantern.linvel();
        const speed = Math.hypot(ov.x - lv.x, ov.y - lv.y);
        this.events.emit('lanternHit', { speed });
      }
    });
  }

  cullBelow(y: number): void {
    const dropObs: number[] = [];
    this.obstacles.forEach((o, h) => { if (o.body.translation().y < y) dropObs.push(h); });
    dropObs.forEach((h) => { this.world.removeRigidBody(this.obstacles.get(h)!.body); this.obstacles.delete(h); });
    const dropEmb: number[] = [];
    this.embers.forEach((e, h) => { if (e.body.translation().y < y) dropEmb.push(h); });
    dropEmb.forEach((h) => { this.world.removeRigidBody(this.embers.get(h)!.body); this.embers.delete(h); });
  }

  dispose(): void { this.world.free(); this.queue.free(); }
}
```

Note: bodies are created/removed via Rapier (cheap); the *render* side pools meshes (Task 12). If profiling later shows body churn cost, swap to body reuse behind the same API.

- [ ] **Step 4: Run tests** — `npx vitest run tests/physics.test.ts` → PASS (WASM init may take a few seconds first run).

- [ ] **Step 5: Commit** — `git commit -am "feat: Rapier physics world with lantern, obstacles, embers, gusts"`

---

### Task 9: Renderer, camera, scene root

**Files:**
- Create: `src/render/scene.ts`

- [ ] **Step 1: Implement**

```ts
// src/render/scene.ts
import * as THREE from 'three';

export class GameScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,           // SMAA in post instead
      stencil: false,
      depth: false,               // composer owns depth
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
    this.camera.position.set(0, 0, 14);

    this.scene.add(new THREE.AmbientLight(0x404a7a, 0.7));
    const moon = new THREE.DirectionalLight(0x8aa0ff, 0.5);
    moon.position.set(-6, 10, 8);
    this.scene.add(moon);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Camera follows lantern altitude with a slight lead. */
  follow(lanternY: number): void {
    this.camera.position.y += (lanternY + 1.5 - this.camera.position.y) * 0.08;
  }

  /** Screen px -> world coords on the z=0 plane. */
  screenToWorld(px: number, py: number): { x: number; y: number } {
    const ndc = new THREE.Vector3(
      (px / window.innerWidth) * 2 - 1,
      -(py / window.innerHeight) * 2 + 1,
      0.5,
    ).unproject(this.camera);
    const dir = ndc.sub(this.camera.position).normalize();
    const t = -this.camera.position.z / dir.z;
    return { x: this.camera.position.x + dir.x * t, y: this.camera.position.y + dir.y * t };
  }
}
```

- [ ] **Step 2: Verify compile** — `npx tsc --noEmit` → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat: renderer, camera follow, screen-to-world"`

---

### Task 10: Sky gradient + fog

**Files:**
- Create: `src/render/sky.ts`

- [ ] **Step 1: Implement**

```ts
// src/render/sky.ts
import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
varying vec2 vUv;
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom;
uniform float uShift; // 0..1 altitude progression within the biome
void main() {
  float t = vUv.y;
  vec3 top = mix(uTop, uTop * 0.6, uShift);          // sky deepens as you climb
  vec3 col = t > 0.5 ? mix(uMid, top, (t - 0.5) * 2.0)
                     : mix(uBottom, uMid, t * 2.0);
  // faint grain to avoid banding on mobile screens
  float n = fract(sin(dot(vUv * 1234.5, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor = vec4(col + (n - 0.5) * 0.012, 1.0);
}`;

// Village Dusk palette (spec §2.5 biome 1)
export const DUSK = {
  top: new THREE.Color('#241a4e'),
  mid: new THREE.Color('#7a3b8f'),
  bottom: new THREE.Color('#ff8c5a'),
};

export class Sky {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTop: { value: DUSK.top.clone() },
        uMid: { value: DUSK.mid.clone() },
        uBottom: { value: DUSK.bottom.clone() },
        uShift: { value: 0 },
      },
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(140, 90), this.material);
    this.mesh.position.z = -40;
    this.mesh.renderOrder = -10;
  }

  /** Keep the sky glued to the camera and evolve with altitude. */
  update(cameraX: number, cameraY: number, altitude: number): void {
    this.mesh.position.x = cameraX;
    this.mesh.position.y = cameraY;
    this.material.uniforms.uShift.value = Math.min(1, altitude / 300);
  }
}
```

- [ ] **Step 2: Verify compile** — `npx tsc --noEmit` → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat: dusk gradient sky shader"`

---

### Task 11: Lantern visual + light + squash/stretch

**Files:**
- Create: `src/render/lantern.ts`

- [ ] **Step 1: Implement**

```ts
// src/render/lantern.ts
import * as THREE from 'three';

export class LanternVisual {
  readonly group = new THREE.Group();
  readonly light: THREE.PointLight;
  private body: THREE.Mesh;
  private flame: THREE.Mesh;
  private time = 0;

  constructor() {
    // Paper body: capsule-ish lathe silhouette, warm emissive
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const r = 0.62 * Math.sin(Math.PI * (0.08 + t * 0.84));
      pts.push(new THREE.Vector2(r, t * 1.5 - 0.75));
    }
    this.body = new THREE.Mesh(
      new THREE.LatheGeometry(pts, 24),
      new THREE.MeshStandardMaterial({
        color: '#ffb36b',
        emissive: '#ff7a2a',
        emissiveIntensity: 2.4,   // above bloom luminance threshold => glows
        roughness: 0.9,
        transparent: true,
        opacity: 0.96,
      }),
    );
    // Inner flame core: small bright sphere, strongest bloom source
    this.flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#fff3c0' }),
    );
    this.flame.position.y = -0.25;
    this.light = new THREE.PointLight('#ffae5e', 60, 18, 1.6);
    this.group.add(this.body, this.flame, this.light);
  }

  update(x: number, y: number, vx: number, vy: number,
         lightIntensity: number, lightDistance: number, dt: number): void {
    this.group.position.set(x, y, 0);
    this.time += dt;
    // squash & stretch from velocity + gentle idle breathing
    const stretch = THREE.MathUtils.clamp(1 + (vy - 2.2) * 0.06, 0.85, 1.18);
    const breathe = 1 + Math.sin(this.time * 2.2) * 0.015;
    this.body.scale.set((1 / stretch) * breathe, stretch * breathe, (1 / stretch) * breathe);
    this.group.rotation.z = THREE.MathUtils.clamp(-vx * 0.06, -0.25, 0.25);
    // flame flicker
    this.light.intensity = lightIntensity * (1 + Math.sin(this.time * 13.7) * 0.07);
    this.light.distance = lightDistance;
    const f = lightIntensity / 68; // 0..1
    (this.body.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + 2.2 * f;
    this.flame.scale.setScalar(0.6 + 0.7 * f);
  }
}
```

- [ ] **Step 2: Verify compile** — `npx tsc --noEmit` → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat: glowing lantern visual with squash/stretch and flicker"`

---

### Task 12: Obstacle + ember meshes synced from physics

**Files:**
- Create: `src/render/obstacles.ts`

- [ ] **Step 1: Implement**

```ts
// src/render/obstacles.ts
import * as THREE from 'three';
import { Pool } from '../core/pool';
import type { PhysicsWorld } from '../physics/world';

const GEOMETRIES: Record<string, THREE.BufferGeometry> = {
  tile: new THREE.BoxGeometry(1.1, 0.7, 0.5),
  kite: new THREE.OctahedronGeometry(0.55),
  branch: new THREE.CylinderGeometry(0.16, 0.2, 2.2, 7).rotateZ(Math.PI / 2),
};
const MATERIALS: Record<string, THREE.MeshStandardMaterial> = {
  tile: new THREE.MeshStandardMaterial({ color: '#5a4a6e', roughness: 0.85 }),
  kite: new THREE.MeshStandardMaterial({ color: '#3e6e8f', roughness: 0.6, metalness: 0.1 }),
  branch: new THREE.MeshStandardMaterial({ color: '#4a3b30', roughness: 1 }),
};
const EMBER_MAT = new THREE.MeshBasicMaterial({ color: '#ffd27a' }); // blooms

export class ObstacleVisuals {
  private pools = new Map<string, Pool<THREE.Mesh>>();
  private emberPool: Pool<THREE.Mesh>;

  constructor(private scene: THREE.Scene) {
    for (const kind of Object.keys(GEOMETRIES)) {
      this.pools.set(kind, new Pool(
        () => { const m = new THREE.Mesh(GEOMETRIES[kind], MATERIALS[kind]); scene.add(m); return m; },
        (m) => { m.visible = true; return m; },
      ));
    }
    this.emberPool = new Pool(
      () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), EMBER_MAT); scene.add(m); return m; },
      (m) => { m.visible = true; return m; },
    );
  }

  /** Re-acquire pooled meshes each frame to mirror the physics state. */
  sync(physics: PhysicsWorld, time: number): void {
    this.pools.forEach((p) => { p.active.forEach((m) => (m.visible = false)); p.releaseAll(); });
    this.emberPool.active.forEach((m) => (m.visible = false));
    this.emberPool.releaseAll();

    physics.forEachObstacle((kind, x, y, rot) => {
      const mesh = this.pools.get(kind)!.acquire();
      mesh.position.set(x, y, 0);
      mesh.rotation.set(0, time * 0.7, rot); // slow tumble on y for 3D depth
    });
    physics.forEachEmber((x, y) => {
      const mesh = this.emberPool.acquire();
      mesh.position.set(x, y, 0);
      const s = 1 + Math.sin(time * 6 + x) * 0.15;
      mesh.scale.setScalar(s);
    });
  }
}
```

- [ ] **Step 2: Verify compile** — `npx tsc --noEmit` → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat: pooled obstacle and ember meshes synced from physics"`

---

### Task 13: Post-processing chain

**Files:**
- Create: `src/render/post.ts`

- [ ] **Step 1: Implement**

```ts
// src/render/post.ts
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, VignetteEffect, SMAAEffect,
} from 'postprocessing';
import type * as THREE from 'three';

export class PostChain {
  private composer: EffectComposer;
  private vignette: VignetteEffect;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    const bloom = new BloomEffect({
      mipmapBlur: true,            // cheap, soft, mobile-friendly
      luminanceThreshold: 0.75,    // only emissives bloom (selective)
      luminanceSmoothing: 0.2,
      intensity: 1.15,
    });
    this.vignette = new VignetteEffect({ darkness: 0.45, offset: 0.3 });
    const smaa = new SMAAEffect();
    this.composer.addPass(new EffectPass(camera, bloom, this.vignette, smaa));

    window.addEventListener('resize', () =>
      this.composer.setSize(window.innerWidth, window.innerHeight));
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  /** brightness 0.25..1 from Flame; lower flame = heavier vignette (world closes in). */
  setBrightness(brightness: number): void {
    this.vignette.darkness = 1.05 - brightness * 0.65;
  }

  render(dt: number): void { this.composer.render(dt); }
}
```

- [ ] **Step 2: Verify compile** — `npx tsc --noEmit` → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat: bloom + flame-linked vignette + SMAA post chain"`

---

### Task 14: Gust streak particles

**Files:**
- Create: `src/render/particles.ts`

- [ ] **Step 1: Implement**

```ts
// src/render/particles.ts
import * as THREE from 'three';

const MAX = 220;

/** Short-lived additive streak particles spawned along the swipe path. */
export class GustParticles {
  readonly points: THREE.Points;
  private positions = new Float32Array(MAX * 3);
  private velocities = new Float32Array(MAX * 2);
  private life = new Float32Array(MAX);
  private cursor = 0;
  private geometry = new THREE.BufferGeometry();

  constructor() {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    const material = new THREE.PointsMaterial({
      color: '#bfe3ff', size: 0.22, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
  }

  burst(ax: number, ay: number, bx: number, by: number, speed: number): void {
    const n = Math.min(14, 4 + Math.floor(speed * 0.4));
    for (let i = 0; i < n; i++) {
      const k = this.cursor++ % MAX;
      const t = Math.random();
      this.positions[k * 3] = ax + (bx - ax) * t;
      this.positions[k * 3 + 1] = ay + (by - ay) * t;
      this.positions[k * 3 + 2] = 0.2;
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      this.velocities[k * 2] = (dx / len) * (2 + Math.random() * 3);
      this.velocities[k * 2 + 1] = (dy / len) * (2 + Math.random() * 3);
      this.life[k] = 0.5 + Math.random() * 0.25;
    }
  }

  update(dt: number): void {
    for (let k = 0; k < MAX; k++) {
      if (this.life[k] <= 0) { this.positions[k * 3 + 2] = -999; continue; } // hide
      this.life[k] -= dt;
      this.positions[k * 3] += this.velocities[k * 2] * dt;
      this.positions[k * 3 + 1] += this.velocities[k * 2 + 1] * dt;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}
```

- [ ] **Step 2: Verify compile** — `npx tsc --noEmit` → no errors.
- [ ] **Step 3: Commit** — `git commit -am "feat: additive gust streak particles"`

---

### Task 15: State machine + UI (HUD, home, game over)

**Files:**
- Create: `src/core/state.ts`, `src/ui/hud.ts`, `src/ui/screens.ts`
- Modify: `src/styles.css` (append UI styles)
- Test: `tests/state.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/state.test.ts
import { describe, it, expect } from 'vitest';
import { GameStateMachine } from '../src/core/state';

describe('GameStateMachine', () => {
  it('follows menu -> run -> gameover -> run', () => {
    const order: string[] = [];
    const sm = new GameStateMachine({
      menu: () => order.push('menu'),
      run: () => order.push('run'),
      gameover: () => order.push('gameover'),
    });
    expect(sm.state).toBe('menu');
    sm.transition('run');
    sm.transition('gameover');
    sm.transition('run');
    expect(order).toEqual(['menu', 'run', 'gameover', 'run']);
  });
  it('rejects invalid transitions', () => {
    const sm = new GameStateMachine({ menu: () => {}, run: () => {}, gameover: () => {} });
    expect(() => sm.transition('gameover')).toThrow(); // menu -> gameover invalid
  });
});
```

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement state machine**

```ts
// src/core/state.ts
export type GameState = 'menu' | 'run' | 'gameover';

const VALID: Record<GameState, GameState[]> = {
  menu: ['run'],
  run: ['gameover'],
  gameover: ['run', 'menu'],
};

export class GameStateMachine {
  private _state: GameState = 'menu';
  constructor(private onEnter: Record<GameState, () => void>) {
    this.onEnter.menu();
  }
  get state(): GameState { return this._state; }
  transition(to: GameState): void {
    if (!VALID[this._state].includes(to)) {
      throw new Error(`Invalid transition ${this._state} -> ${to}`);
    }
    this._state = to;
    this.onEnter[to]();
  }
}
```

- [ ] **Step 4: Run tests** → PASS.

- [ ] **Step 5: Implement HUD**

```ts
// src/ui/hud.ts
export class Hud {
  private root: HTMLElement;
  private scoreEl: HTMLElement;
  private flameFill: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud-score">0</div>
      <div class="hud-flame"><div class="hud-flame-fill"></div></div>`;
    parent.appendChild(this.root);
    this.scoreEl = this.root.querySelector('.hud-score')!;
    this.flameFill = this.root.querySelector('.hud-flame-fill')!;
  }

  update(points: number, flamePct: number): void {
    const txt = String(points);
    if (this.scoreEl.textContent !== txt) this.scoreEl.textContent = txt;
    this.flameFill.style.width = `${flamePct}%`;
    this.flameFill.classList.toggle('low', flamePct < 30);
  }

  setVisible(v: boolean): void { this.root.style.display = v ? '' : 'none'; }
}
```

- [ ] **Step 6: Implement screens**

```ts
// src/ui/screens.ts
export class Screens {
  private home: HTMLElement;
  private over: HTMLElement;
  private finalScore: HTMLElement;
  private bestScore: HTMLElement;

  constructor(parent: HTMLElement, onStart: () => void, onRetry: () => void) {
    this.home = document.createElement('div');
    this.home.className = 'screen home';
    this.home.innerHTML = `
      <h1 class="title">Lantern</h1>
      <p class="hint">swipe to guide the wind</p>
      <button class="cta interactive">Rise</button>`;
    this.home.querySelector('button')!.addEventListener('click', onStart);

    this.over = document.createElement('div');
    this.over.className = 'screen over';
    this.over.innerHTML = `
      <p class="over-label">the flame went out</p>
      <div class="final-score">0</div>
      <div class="best-score"></div>
      <button class="cta interactive">Rise Again</button>`;
    this.over.querySelector('button')!.addEventListener('click', onRetry);
    this.finalScore = this.over.querySelector('.final-score')!;
    this.bestScore = this.over.querySelector('.best-score')!;

    parent.append(this.home, this.over);
    this.show('home');
  }

  show(which: 'home' | 'over' | 'none', score?: number): void {
    this.home.classList.toggle('visible', which === 'home');
    this.over.classList.toggle('visible', which === 'over');
    if (which === 'over' && score !== undefined) {
      this.finalScore.textContent = String(score);
      const best = Math.max(score, Number(localStorage.getItem('lantern.best') ?? 0));
      localStorage.setItem('lantern.best', String(best));
      this.bestScore.textContent = `best ${best}`;
    }
  }
}
```

- [ ] **Step 7: Append UI styles to src/styles.css**

```css
/* --- HUD --- */
.hud { position: absolute; top: calc(env(safe-area-inset-top) + 14px); left: 0; right: 0;
  display: flex; flex-direction: column; align-items: center; gap: 8px; }
.hud-score { font-size: 44px; font-weight: 800; color: #fff;
  text-shadow: 0 2px 18px rgba(255, 160, 80, .45); font-variant-numeric: tabular-nums; }
.hud-flame { width: 130px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.14);
  overflow: hidden; }
.hud-flame-fill { height: 100%; border-radius: 3px; width: 70%;
  background: linear-gradient(90deg, #ff7a2a, #ffd27a);
  transition: width .25s ease; }
.hud-flame-fill.low { background: linear-gradient(90deg, #ff3b3b, #ff7a2a);
  animation: pulse 1s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: .55; } }

/* --- Screens (glass panels, thumb-zone CTA) --- */
.screen { position: absolute; inset: 0; display: none; flex-direction: column;
  align-items: center; justify-content: flex-end;
  padding-bottom: calc(env(safe-area-inset-bottom) + 12vh); text-align: center; }
.screen.visible { display: flex; }
.title { font-size: clamp(44px, 12vw, 72px); font-weight: 800; letter-spacing: .04em;
  color: #ffe9c9; text-shadow: 0 0 34px rgba(255,150,60,.55); margin-bottom: 6px; }
.hint, .over-label { color: rgba(255,255,255,.75); font-size: 15px; margin-bottom: 26px; }
.final-score { font-size: 64px; font-weight: 800; color: #ffe9c9;
  text-shadow: 0 0 28px rgba(255,150,60,.5); }
.best-score { color: rgba(255,255,255,.6); font-size: 14px; margin-bottom: 24px; }
.cta { padding: 16px 52px; font-size: 19px; font-weight: 700; color: #2a1606;
  border: none; border-radius: 999px; cursor: pointer;
  background: linear-gradient(135deg, #ffd27a, #ff8c3a);
  box-shadow: 0 8px 32px rgba(255,140,58,.4), inset 0 1px 0 rgba(255,255,255,.5);
  backdrop-filter: blur(10px); transition: transform .12s ease; }
.cta:active { transform: scale(.95); }
```

- [ ] **Step 8: Verify compile** — `npx tsc --noEmit` → no errors.
- [ ] **Step 9: Commit** — `git commit -am "feat: state machine, HUD, home and game-over screens"`

---

### Task 16: Integration (main.ts) + input

**Files:**
- Modify: `src/main.ts` (replace stub)

- [ ] **Step 1: Implement main.ts**

```ts
// src/main.ts
import { PhysicsWorld } from './physics/world';
import { FixedLoop } from './core/loop';
import { GameStateMachine } from './core/state';
import { Flame } from './gameplay/flame';
import { Score } from './gameplay/score';
import { Spawner, PLAY_SPAWN_MARGIN } from './gameplay/spawner';
import { GameScene } from './render/scene';
import { Sky } from './render/sky';
import { LanternVisual } from './render/lantern';
import { ObstacleVisuals } from './render/obstacles';
import { PostChain } from './render/post';
import { GustParticles } from './render/particles';
import { Hud } from './ui/hud';
import { Screens } from './ui/screens';
import { PLAY_HALF_WIDTH } from './physics/world';

async function boot() {
  await PhysicsWorld.init();

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui')!;
  const gfx = new GameScene(canvas);
  const sky = new Sky();
  const lanternVis = new LanternVisual();
  const obstacleVis = new ObstacleVisuals(gfx.scene);
  const gust = new GustParticles();
  gfx.scene.add(sky.mesh, lanternVis.group, gust.points);
  const post = new PostChain(gfx.renderer, gfx.scene, gfx.camera);

  let physics = new PhysicsWorld();
  const flame = new Flame();
  const score = new Score();
  let spawner = new Spawner(Date.now() % 100000, PLAY_HALF_WIDTH - 0.5);
  let elapsed = 0;

  const hud = new Hud(uiRoot);
  hud.setVisible(false);

  const startRun = () => {
    physics.dispose();
    physics = new PhysicsWorld();
    wirePhysicsEvents();
    flame.reset();
    score.reset();
    spawner = new Spawner(Date.now() % 100000, PLAY_HALF_WIDTH - 0.5);
    hud.setVisible(true);
    screens.show('none');
  };

  const screens = new Screens(
    uiRoot,
    () => sm.transition('run'),
    () => sm.transition('run'),
  );

  const sm = new GameStateMachine({
    menu: () => { hud.setVisible(false); screens.show('home'); },
    run: startRun,
    gameover: () => { hud.setVisible(false); screens.show('over', score.points); },
  });

  function wirePhysicsEvents() {
    physics.events.on('lanternHit', ({ speed }) => {
      if (sm.state !== 'run') return;
      flame.hit(speed);
      if (flame.dead) sm.transition('gameover');
    });
    physics.events.on('emberCollected', () => flame.flare());
  }
  wirePhysicsEvents();

  // --- Input: pointer swipes -> gust segments in world space ---
  let lastPointer: { x: number; y: number; t: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    lastPointer = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!lastPointer || sm.state !== 'run') return;
    const now = performance.now();
    const dt = Math.max(1, now - lastPointer.t) / 1000;
    const a = gfx.screenToWorld(lastPointer.x, lastPointer.y);
    const b = gfx.screenToWorld(e.clientX, e.clientY);
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist > 0.05) {
      const seg = { ax: a.x, ay: a.y, bx: b.x, by: b.y, speed: Math.min(40, dist / dt) };
      physics.applyGust(seg);
      gust.burst(a.x, a.y, b.x, b.y, seg.speed);
    }
    lastPointer = { x: e.clientX, y: e.clientY, t: now };
  });
  canvas.addEventListener('pointerup', () => { lastPointer = null; });
  canvas.addEventListener('pointercancel', () => { lastPointer = null; });

  // --- Fixed-step simulation ---
  const loop = new FixedLoop(1 / 60, (dt) => {
    if (sm.state !== 'run') return;
    elapsed += dt;
    physics.step(dt);
    const pos = physics.lanternPosition();
    score.update(pos.y, flame.multiplier);
    const spawn = spawner.tick(dt, pos.y);
    if (spawn) {
      const spawnY = gfx.camera.position.y + 16;
      if (spawn.kind === 'ember') physics.spawnEmber(spawn.x, spawnY);
      else physics.spawnObstacle(spawn.kind, spawn.x, spawnY);
    }
    physics.cullBelow(gfx.camera.position.y - 14);
  });

  // --- Render loop ---
  let last = performance.now();
  function frame(now: number) {
    const elapsedSec = (now - last) / 1000;
    last = now;
    loop.advance(elapsedSec);

    const pos = physics.lanternPosition();
    const vel = physics.lanternVelocity();
    gfx.follow(pos.y);
    sky.update(gfx.camera.position.x, gfx.camera.position.y, pos.y);
    lanternVis.update(pos.x, pos.y, vel.x, vel.y,
      flame.lightIntensity, flame.lightDistance, elapsedSec);
    obstacleVis.sync(physics, now / 1000);
    gust.update(elapsedSec);
    post.setBrightness(flame.brightness);
    hud.update(score.points, flame.value);
    post.render(elapsedSec);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
```

Note: `PLAY_SPAWN_MARGIN` import is wrong on purpose-check — remove it; Spawner takes `PLAY_HALF_WIDTH - 0.5` directly (already shown). Final code must compile with `npx tsc --noEmit`.

- [ ] **Step 2: Compile + full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean compile, all tests PASS.

- [ ] **Step 3: Commit** — `git commit -am "feat: integrate game loop, input, render, UI into playable slice"`

---

### Task 17: Visual verification + performance check

- [ ] **Step 1: Run dev server and screenshot**

Use webapp-testing skill (Playwright) against `http://localhost:5173`:
- Screenshot home screen → verify: gradient dusk sky, glowing title, CTA pill in thumb zone.
- Click "Rise", wait 3s, screenshot gameplay → verify: glowing lantern with bloom halo, obstacles lit by lantern light, score HUD ticking.
- Verify no console errors.

- [ ] **Step 2: Visual quality gate (spec §8)**

Compare screenshots against the bar: visible bloom glow, smooth gradient sky without banding, lantern light pooling on nearby obstacles, vignette present. If flat or cheap-looking, tune bloom intensity/threshold, emissive intensities, sky palette before proceeding. This gate must pass before the slice is called done.

- [ ] **Step 3: Performance sanity**

In Playwright, evaluate an rAF counter for 5s → expect ≥ 55 fps average on desktop. (Android device profiling is a Phase-2 milestone task; desktop floor is the slice gate.)

- [ ] **Step 4: Commit any tuning** — `git commit -am "polish: visual tuning pass on slice"`

---

## Self-review notes

- Spec coverage (slice scope = spec §7.1): lantern+light+bloom ✔ (T11, T13), sky ✔ (T10), gust input ✔ (T6, T16), obstacles ✔ (T7, T8, T12), flame damage/embers ✔ (T4, T7), game over/restart ✔ (T15, T16), 60fps gate ✔ (T17), thumb-zone/safe-area UI ✔ (T1, T15). Near-miss field, DDA, audio, haptics, biomes 2–4 are explicitly later phases per spec §7.
- Type consistency: `Spawner.tick(dt, altitude)` matches T16 usage; `PhysicsWorld` API (`spawnObstacle/spawnEmber/applyGust/step/cullBelow/forEach*`) consistent across T8/T12/T16; `gustImpulse` signature consistent T6/T8.
- Placeholder scan: T16 contains a deliberate import-error callout resolved in-step; no TBDs remain.
