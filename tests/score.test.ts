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
