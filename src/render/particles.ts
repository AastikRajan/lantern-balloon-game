import * as THREE from 'three';

const MAX = 220;

/** Short-lived additive streak particles spawned along the swipe path. */
export class GustParticles {
  readonly points: THREE.Points;
  private positions = new Float32Array(MAX * 3);
  private velocities = new Float32Array(MAX * 2);
  private life = new Float32Array(MAX);
  private cursor = 0;
  private geometry = new THREE.BufferGeometry();

  constructor() {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    const material = new THREE.PointsMaterial({
      color: '#bfe3ff', size: 0.22, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
  }

  burst(ax: number, ay: number, bx: number, by: number, speed: number): void {
    const n = Math.min(14, 4 + Math.floor(speed * 0.4));
    for (let i = 0; i < n; i++) {
      const k = this.cursor++ % MAX;
      const t = Math.random();
      this.positions[k * 3] = ax + (bx - ax) * t;
      this.positions[k * 3 + 1] = ay + (by - ay) * t;
      this.positions[k * 3 + 2] = 0.2;
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      this.velocities[k * 2] = (dx / len) * (2 + Math.random() * 3);
      this.velocities[k * 2 + 1] = (dy / len) * (2 + Math.random() * 3);
      this.life[k] = 0.5 + Math.random() * 0.25;
    }
  }

  update(dt: number): void {
    for (let k = 0; k < MAX; k++) {
      if (this.life[k] <= 0) { this.positions[k * 3 + 2] = -999; continue; } // hide
      this.life[k] -= dt;
      this.positions[k * 3] += this.velocities[k * 2] * dt;
      this.positions[k * 3 + 1] += this.velocities[k * 2 + 1] * dt;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}
