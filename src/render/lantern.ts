import * as THREE from 'three';
import { radialGlowTexture, makeGlowSprite } from './glow';

export class LanternVisual {
  readonly group = new THREE.Group();
  readonly light: THREE.PointLight;
  private body: THREE.Mesh;
  private flame: THREE.Mesh;
  private halo: THREE.Sprite;
  private coreGlow: THREE.Sprite;
  private time = 0;
  private stretchSmoothed = 1;
  private rotSmoothed = 0;

  constructor() {
    // Soft outer halo (big, feeds bloom) — sits behind everything in the group
    const glowTex = radialGlowTexture('rgba(255,200,130,1)', 'rgba(255,120,40,0)');
    this.halo = makeGlowSprite(6.5, glowTex, 0.55);
    this.halo.position.z = -0.5;

    // Paper body: ribbed lantern silhouette, warm emissive
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      // bulged lantern profile, pinched at top and bottom
      const r = 0.66 * Math.sin(Math.PI * (0.12 + t * 0.76)) * (1 + 0.06 * Math.sin(t * Math.PI * 5));
      pts.push(new THREE.Vector2(Math.max(0.02, r), t * 1.6 - 0.8));
    }
    this.body = new THREE.Mesh(
      new THREE.LatheGeometry(pts, 28),
      new THREE.MeshStandardMaterial({
        color: '#ffd9a0',
        emissive: '#ff7a2a',
        emissiveIntensity: 3.2,
        roughness: 0.75,
        metalness: 0.0,
        transparent: true,
        opacity: 0.97,
      }),
    );

    // Bright inner core + small additive glow for a hot flame center
    this.flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 14, 14),
      new THREE.MeshBasicMaterial({ color: '#fff6d8' }),
    );
    this.flame.position.y = -0.18;
    this.coreGlow = makeGlowSprite(1.7, radialGlowTexture('rgba(255,244,200,1)', 'rgba(255,200,120,0)'), 0.9);
    this.coreGlow.position.set(0, -0.18, 0.2);

    this.light = new THREE.PointLight('#ffae5e', 60, 18, 1.6);

    this.group.add(this.halo, this.body, this.flame, this.coreGlow, this.light);
  }

  update(x: number, y: number, vx: number, vy: number,
         lightIntensity: number, lightDistance: number, dt: number): void {
    this.group.position.set(x, y, 0);
    this.time += dt;
    const f = THREE.MathUtils.clamp(lightIntensity / 68, 0, 1); // 0..1 flame level
    // frame-rate-independent damping factor
    const damp = 1 - Math.pow(0.001, dt);

    // squash & stretch, smoothed so it eases instead of snapping/jittering
    const targetStretch = THREE.MathUtils.clamp(1 + (vy - 2.2) * 0.05, 0.9, 1.14);
    this.stretchSmoothed += (targetStretch - this.stretchSmoothed) * damp;
    const breathe = 1 + Math.sin(this.time * 1.6) * 0.014;
    const s = this.stretchSmoothed * breathe;
    this.body.scale.set(breathe / this.stretchSmoothed, s, breathe / this.stretchSmoothed);
    const targetRot = THREE.MathUtils.clamp(-vx * 0.04, -0.18, 0.18);
    this.rotSmoothed += (targetRot - this.rotSmoothed) * damp;
    this.group.rotation.z = this.rotSmoothed;

    // gentle, low-frequency candle flicker — NEVER strobe the scene light
    const flicker = 1 + Math.sin(this.time * 2.3) * 0.03 + Math.sin(this.time * 3.7 + 1.3) * 0.02;
    this.light.intensity = lightIntensity * flicker;
    this.light.distance = lightDistance;
    (this.body.material as THREE.MeshStandardMaterial).emissiveIntensity = (1.2 + 2.4 * f) * flicker;
    this.flame.scale.setScalar((0.7 + 0.6 * f) * flicker);

    const haloScale = (5.0 + 3.0 * f) * (0.99 + 0.025 * Math.sin(this.time * 1.9));
    this.halo.scale.set(haloScale, haloScale, 1);
    (this.halo.material as THREE.SpriteMaterial).opacity = (0.32 + 0.34 * f) * flicker;
    this.coreGlow.scale.setScalar((1.2 + 0.8 * f) * flicker);
  }
}
