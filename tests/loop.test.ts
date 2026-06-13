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
