import { describe, it, expect } from 'vitest';
import { Dda } from '../src/gameplay/dda';

describe('Dda (Buster principle)', () => {
  it('starts neutral', () => {
    const d = new Dda();
    expect(d.ease).toBeCloseTo(1);
  });
  it('eases down after 3 consecutive short runs', () => {
    const d = new Dda();
    d.recordRun(10);
    d.recordRun(12);
    expect(d.ease).toBeCloseTo(1);   // not yet 3
    d.recordRun(8);
    expect(d.ease).toBeLessThan(1);  // kicked in
    expect(d.ease).toBeGreaterThanOrEqual(0.8);
  });
  it('recovers toward 1 after a good run and resets the struggle streak', () => {
    const d = new Dda();
    d.recordRun(5); d.recordRun(5); d.recordRun(5); // eased down
    const eased = d.ease;
    d.recordRun(200); // strong run
    expect(d.ease).toBeGreaterThan(eased);
    // one good run breaks the streak, so further struggle needs 3 more
    d.recordRun(5); d.recordRun(5);
    expect(d.ease).toBeGreaterThan(eased);
  });
  it('never goes below 0.8 or above 1', () => {
    const d = new Dda();
    for (let i = 0; i < 20; i++) d.recordRun(1);
    expect(d.ease).toBeGreaterThanOrEqual(0.8);
    for (let i = 0; i < 20; i++) d.recordRun(999);
    expect(d.ease).toBeLessThanOrEqual(1);
  });
});
