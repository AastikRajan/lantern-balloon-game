export class Flame {
  private _value = 70;
  private _start = 70;
  private _max = 100;

  /** Apply upgrade loadout: starting + maximum flame. */
  configure(start: number, max: number): void {
    this._start = start;
    this._max = max;
  }

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

  flare(amount = 22): void { this._value = Math.min(this._max, this._value + amount); }
  /** Spend flame (e.g. a burst). Returns true if there was enough. */
  spend(amount: number): boolean {
    if (this._value < amount) return false;
    this._value -= amount;
    return true;
  }
  reset(): void { this._value = this._start; }
}
