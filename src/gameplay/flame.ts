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
