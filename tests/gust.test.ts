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
