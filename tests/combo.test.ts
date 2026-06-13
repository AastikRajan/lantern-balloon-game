import { describe, it, expect } from 'vitest';
import { Combo, COMBO_WINDOW } from '../src/gameplay/combo';

describe('Combo', () => {
  it('increments while deflects stay within the window', () => {
    const c = new Combo();
    expect(c.deflect(0).count).toBe(1);
    expect(c.deflect(COMBO_WINDOW * 0.5).count).toBe(2);
    expect(c.deflect(COMBO_WINDOW * 0.9).count).toBe(3);
  });
  it('resets to 1 when the window lapses', () => {
    const c = new Combo();
    c.deflect(0);
    c.deflect(0.5);
    const r = c.deflect(0.5 + COMBO_WINDOW + 0.01);
    expect(r.count).toBe(1);
  });
  it('break() drops the streak and is reported when it was meaningful', () => {
    const c = new Combo();
    c.deflect(0); c.deflect(0.3); c.deflect(0.6);
    expect(c.count).toBe(3);
    expect(c.break()).toBe(true);  // had a streak >=2
    expect(c.count).toBe(0);
    expect(c.break()).toBe(false); // nothing to break now
  });
  it('expire() clears a stale streak based on elapsed time', () => {
    const c = new Combo();
    c.deflect(1.0);
    c.expire(1.0 + COMBO_WINDOW + 0.1);
    expect(c.count).toBe(0);
  });
  it('score multiplier grows with the streak', () => {
    const c = new Combo();
    c.deflect(0);            // count 1 -> mult 1.25
    expect(c.scoreMultiplier).toBeCloseTo(1.25);
    c.deflect(0.2);          // count 2 -> 1.5
    expect(c.scoreMultiplier).toBeCloseTo(1.5);
  });
});
