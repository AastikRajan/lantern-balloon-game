export class Score {
  private raw = 0;
  private bestAltitude = 0;

  get points(): number { return Math.floor(this.raw); }

  update(altitude: number, multiplier: number): void {
    if (altitude > this.bestAltitude) {
      this.raw += (altitude - this.bestAltitude) * multiplier;
      this.bestAltitude = altitude;
    }
  }

  reset(): void { this.raw = 0; this.bestAltitude = 0; }
}
