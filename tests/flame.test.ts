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
