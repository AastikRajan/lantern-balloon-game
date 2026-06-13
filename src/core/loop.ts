export class FixedLoop {
  private accumulator = 0;
  constructor(
    readonly dt: number,
    private step: (dt: number) => void,
    private maxFrame = 0.25,
  ) {}

  /** Advance by elapsed seconds; returns interpolation alpha in [0,1). */
  advance(elapsed: number): number {
    this.accumulator += Math.min(elapsed, this.maxFrame);
    while (this.accumulator >= this.dt) {
      this.step(this.dt);
      this.accumulator -= this.dt;
    }
    return this.accumulator / this.dt;
  }
}
