import * as THREE from 'three';
import { radialGlowTexture, makeGlowSprite } from './glow';
import { SHIELD_HALF_WIDTH } from '../physics/world';

/** A glowing light-bar the player drags to deflect debris. Cool tint so it
 *  reads instantly against the warm lantern/obstacles. */
export class ShieldVisual {
  readonly group = new THREE.Group();
  private bar: THREE.Mesh;
  private glow: THREE.Sprite;
  private time = 0;
  private prevX = 0;

  constructor() {
    const len = SHIELD_HALF_WIDTH * 2 + 0.3;
    const geo = new THREE.CapsuleGeometry(0.15, len, 6, 16);
    geo.rotateZ(Math.PI / 2);
    this.bar = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: '#cdfaff',
      emissive: '#3fd6ff',
      emissiveIntensity: 3.4,
      roughness: 0.3,
      metalness: 0.0,
    }));
    this.glow = makeGlowSprite(2.4, radialGlowTexture('rgba(150,235,255,1)', 'rgba(60,180,255,0)'), 0.7);
    this.glow.scale.set(len + 1.6, 1.1, 1);
    this.glow.position.z = -0.3;
    this.group.add(this.glow, this.bar);
  }

  update(x: number, y: number, dt: number): void {
    this.time += dt;
    this.group.position.set(x, y, 0.3);
    // tilt slightly toward travel direction for a lively, hand-of-wind feel
    const vx = (x - this.prevX) / Math.max(dt, 1 / 120);
    this.prevX = x;
    this.group.rotation.z = THREE.MathUtils.clamp(-vx * 0.03, -0.4, 0.4);
    const pulse = 1 + Math.sin(this.time * 8) * 0.05;
    (this.bar.material as THREE.MeshStandardMaterial).emissiveIntensity = 3.0 * pulse;
    (this.glow.material as THREE.SpriteMaterial).opacity = 0.6 * pulse;
  }
}
