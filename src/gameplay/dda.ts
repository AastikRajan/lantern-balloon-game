export const STRUGGLE_ALT = 28;   // a run ending below this counts as a struggle
export const EASE_MIN = 0.8;
export const EASE_STEP = 0.05;

/**
 * Secret Dynamic Difficulty Adjustment (Buster principle): after repeated short
 * runs, quietly make obstacles a touch slower; recover as the player improves.
 * `ease` multiplies obstacle speed / divides spawn frequency. Never surfaced.
 */
export class Dda {
  private _ease = 1;
  private struggleStreak = 0;

  get ease(): number { return this._ease; }

  /** Call once per finished run with the peak altitude reached. */
  recordRun(peakAltitude: number): void {
    if (peakAltitude < STRUGGLE_ALT) {
      this.struggleStreak++;
      if (this.struggleStreak >= 3) {
        this._ease = Math.max(EASE_MIN, this._ease - EASE_STEP);
      }
    } else {
      this.struggleStreak = 0;
      this._ease = Math.min(1, this._ease + EASE_STEP);
    }
  }

  reset(): void { this._ease = 1; this.struggleStreak = 0; }
}
