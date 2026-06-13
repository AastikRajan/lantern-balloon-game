export const COMBO_WINDOW = 1.6; // seconds between deflects to keep the chain

export interface ComboResult { count: number; }

/** Tracks consecutive deflect streaks within a sliding time window. */
export class Combo {
  private _count = 0;
  private lastAt = -Infinity;

  get count(): number { return this._count; }
  /** Score bonus multiplier; grows 0.25 per chained hit. */
  get scoreMultiplier(): number { return 1 + 0.25 * this._count; }

  /** Register a deflect at time `now` (seconds). */
  deflect(now: number): ComboResult {
    this._count = now - this.lastAt <= COMBO_WINDOW ? this._count + 1 : 1;
    this.lastAt = now;
    return { count: this._count };
  }

  /** Clear stale streak if the window has lapsed since the last deflect. */
  expire(now: number): void {
    if (this._count > 0 && now - this.lastAt > COMBO_WINDOW) this._count = 0;
  }

  /** Force-break the streak (e.g. lantern hit). Returns true if a streak >=2 was lost. */
  break(): boolean {
    const meaningful = this._count >= 2;
    this._count = 0;
    this.lastAt = -Infinity;
    return meaningful;
  }

  reset(): void { this._count = 0; this.lastAt = -Infinity; }
}
