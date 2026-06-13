import * as THREE from 'three';
import { radialGlowTexture } from './glow';

const COUNT = 140;
const BAND_W = 26;   // horizontal spread
const BAND_H = 34;   // vertical wrap height
const PARALLAX = 0.55; // stars drift slower than camera for depth

/** Twinkling parallax star layer that wraps as the camera climbs. */
export class Starfield {
  readonly points: THREE.Points;
  private positions = new Float32Array(COUNT * 3);
  private phase = new Float32Array(COUNT);
  private baseSize = new Float32Array(COUNT);
  private geometry = new THREE.BufferGeometry();
  private material: THREE.PointsMaterial;

  constructor() {
    for (let i = 0; i < COUNT; i++) {
      this.positions[i * 3] = (Math.random() * 2 - 1) * BAND_W;
      this.positions[i * 3 + 1] = Math.random() * BAND_H;
      this.positions[i * 3 + 2] = -20 - Math.random() * 12;
      this.phase[i] = Math.random() * Math.PI * 2;
      this.baseSize[i] = 0.12 + Math.random() * 0.34;
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    const sizes = new Float32Array(this.baseSize);
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.material = new THREE.PointsMaterial({
      map: radialGlowTexture('rgba(255,255,255,1)', 'rgba(180,200,255,0)'),
      color: '#dfe8ff',
      size: 0.4,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  update(cameraX: number, cameraY: number, time: number): void {
    this.points.position.x = cameraX;
    // wrap the vertical band around the parallax-shifted camera position
    const drift = cameraY * PARALLAX;
    this.points.position.y = drift - (((drift % BAND_H) + BAND_H) % BAND_H);
    // twinkle via opacity oscillation (cheap, whole-layer)
    this.material.opacity = 0.7 + Math.sin(time * 1.3) * 0.12;
  }
}
