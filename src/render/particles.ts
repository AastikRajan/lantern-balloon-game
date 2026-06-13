import * as THREE from 'three';

const MAX = 260;

/** Additive spark burst pool used for shield deflections and impacts. */
export class Sparks {
  readonly points: THREE.Points;
  private positions = new Float32Array(MAX * 3);
  private velocities = new Float32Array(MAX * 2);
  private life = new Float32Array(MAX);
  private cursor = 0;
  private geometry = new THREE.BufferGeometry();

  constructor(color = '#bff0ff') {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    for (let k = 0; k < MAX; k++) this.positions[k * 3 + 2] = -999; // start hidden
    const material = new THREE.PointsMaterial({
      color, size: 0.26, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
  }

  /** Spray sparks outward from an impact point; count scales with impact speed. */
  burst(x: number, y: number, speed: number): void {
    const n = Math.min(18, 6 + Math.floor(speed * 1.2));
    for (let i = 0; i < n; i++) {
      const k = this.cursor++ % MAX;
      this.positions[k * 3] = x;
      this.positions[k * 3 + 1] = y;
      this.positions[k * 3 + 2] = 0.3;
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * (3 + speed * 0.4);
      this.velocities[k * 2] = Math.cos(ang) * spd;
      this.velocities[k * 2 + 1] = Math.sin(ang) * spd;
      this.life[k] = 0.35 + Math.random() * 0.3;
    }
  }

  update(dt: number): void {
    for (let k = 0; k < MAX; k++) {
      if (this.life[k] <= 0) continue;
      this.life[k] -= dt;
      if (this.life[k] <= 0) { this.positions[k * 3 + 2] = -999; continue; }
      this.positions[k * 3] += this.velocities[k * 2] * dt;
      this.positions[k * 3 + 1] += this.velocities[k * 2 + 1] * dt;
      this.velocities[k * 2 + 1] -= 6 * dt; // slight gravity on sparks
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}
