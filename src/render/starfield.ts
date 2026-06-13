import * as THREE from 'three';
import { radialGlowTexture } from './glow';

const COUNT = 150;
const BAND_W = 30;   // horizontal spread (wide enough to cover screen as camera pans)
const BAND_H = 40;   // vertical wrap height (must exceed the visible band)

/** Star layer placed deep in the scene; perspective gives natural parallax.
 *  Stars recycle above the camera as it climbs, so the sky is always full. */
export class Starfield {
  readonly points: THREE.Points;
  private positions = new Float32Array(COUNT * 3);
  private geometry = new THREE.BufferGeometry();
  private material: THREE.PointsMaterial;

  constructor() {
    for (let i = 0; i < COUNT; i++) {
      this.positions[i * 3] = (Math.random() * 2 - 1) * BAND_W;
      this.positions[i * 3 + 1] = (Math.random() - 0.3) * BAND_H;
      this.positions[i * 3 + 2] = -22 - Math.random() * 14;
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.PointsMaterial({
      map: radialGlowTexture('rgba(255,255,255,1)', 'rgba(180,200,255,0)'),
      color: '#e6ecff',
      size: 0.42,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  update(cameraX: number, cameraY: number, _time: number): void {
    this.points.position.x = cameraX; // keep the band centered horizontally
    const cullLine = cameraY - BAND_H * 0.5;
    let changed = false;
    for (let i = 0; i < COUNT; i++) {
      if (this.positions[i * 3 + 1] < cullLine) {
        this.positions[i * 3 + 1] += BAND_H;
        this.positions[i * 3] = (Math.random() * 2 - 1) * BAND_W;
        changed = true;
      }
    }
    if (changed) this.geometry.attributes.position.needsUpdate = true;
  }
}
