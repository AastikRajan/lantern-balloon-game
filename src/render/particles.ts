import * as THREE from 'three';

const MAX = 260;
const TRAIL_MAX = 90;

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

/**
 * Warm ember trail shed by the rising lantern. Pooled points with
 * per-particle vertex colors; with additive blending, darkening the color
 * over a particle's life reads as a smooth fade — no shader needed.
 */
export class EmberTrail {
  readonly points: THREE.Points;
  private positions = new Float32Array(TRAIL_MAX * 3);
  private colors = new Float32Array(TRAIL_MAX * 3);
  private velocities = new Float32Array(TRAIL_MAX * 2);
  private life = new Float32Array(TRAIL_MAX);
  private maxLife = new Float32Array(TRAIL_MAX);
  private cursor = 0;
  private emitAccum = 0;
  private geometry = new THREE.BufferGeometry();
  private tint = new THREE.Color('#ffb35e');

  constructor() {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    for (let k = 0; k < TRAIL_MAX; k++) this.positions[k * 3 + 2] = -999;
    const material = new THREE.PointsMaterial({
      size: 0.22, vertexColors: true, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
  }

  /** Match the trail to the equipped lantern skin. */
  setColor(hex: string): void { this.tint.set(hex).lerp(new THREE.Color('#ffffff'), 0.25); }

  /** Shed embers from (x, y); rate scales with flame level f (0..1). */
  emit(x: number, y: number, f: number, dt: number): void {
    this.emitAccum += dt * (10 + 16 * f);
    while (this.emitAccum >= 1) {
      this.emitAccum -= 1;
      const k = this.cursor++ % TRAIL_MAX;
      this.positions[k * 3] = x + (Math.random() - 0.5) * 0.35;
      this.positions[k * 3 + 1] = y - 0.55;
      this.positions[k * 3 + 2] = -0.2; // just behind the lantern
      this.velocities[k * 2] = (Math.random() - 0.5) * 0.7;
      this.velocities[k * 2 + 1] = -1.2 - Math.random() * 1.1;
      this.maxLife[k] = this.life[k] = 0.5 + Math.random() * 0.5;
    }
  }

  update(dt: number): void {
    for (let k = 0; k < TRAIL_MAX; k++) {
      if (this.life[k] <= 0) continue;
      this.life[k] -= dt;
      if (this.life[k] <= 0) { this.positions[k * 3 + 2] = -999; continue; }
      this.positions[k * 3] += this.velocities[k * 2] * dt;
      this.positions[k * 3 + 1] += this.velocities[k * 2 + 1] * dt;
      const t = this.life[k] / this.maxLife[k]; // 1 -> 0
      const fade = t * t;
      this.colors[k * 3] = this.tint.r * fade;
      this.colors[k * 3 + 1] = this.tint.g * fade;
      this.colors[k * 3 + 2] = this.tint.b * fade;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}
