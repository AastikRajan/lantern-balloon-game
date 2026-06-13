import { describe, it, expect } from 'vitest';
import { Spawner, spawnInterval } from '../src/gameplay/spawner';

describe('spawnInterval', () => {
  it('shrinks with altitude and clamps at floor', () => {
    expect(spawnInterval(0)).toBeCloseTo(0.8);
    expect(spawnInterval(200)).toBeLessThan(0.8);
    expect(spawnInterval(10_000)).toBeCloseTo(0.36);
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
