export type SpawnKind = 'tile' | 'kite' | 'branch' | 'ember';
export interface SpawnRequest { kind: SpawnKind; x: number; }

export function spawnInterval(altitude: number): number {
  const t = Math.min(1, altitude / 500);
  return 0.8 - (0.8 - 0.36) * t;
}

/** Deterministic LCG so runs are reproducible per seed. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const OBSTACLE_KINDS: SpawnKind[] = ['tile', 'kite', 'branch'];

export class Spawner {
  private rng: () => number;
  private timer = 0;
  private count = 0;

  constructor(seed: number, private halfWidth: number) {
    this.rng = lcg(seed);
  }

  tick(dt: number, altitude: number): SpawnRequest | null {
    this.timer += dt;
    if (this.timer < spawnInterval(altitude)) return null;
    this.timer = 0;
    this.count++;
    const x = (this.rng() * 2 - 1) * this.halfWidth;
    if (this.count % 5 === 0) return { kind: 'ember', x };
    const kind = OBSTACLE_KINDS[Math.floor(this.rng() * OBSTACLE_KINDS.length)];
    return { kind, x };
  }

  reset(): void { this.timer = 0; this.count = 0; }
}
