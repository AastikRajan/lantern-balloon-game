import * as THREE from 'three';

export class LanternVisual {
  readonly group = new THREE.Group();
  readonly light: THREE.PointLight;
  private body: THREE.Mesh;
  private flame: THREE.Mesh;
  private time = 0;

  constructor() {
    // Paper body: capsule-ish lathe silhouette, warm emissive
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const r = 0.62 * Math.sin(Math.PI * (0.08 + t * 0.84));
      pts.push(new THREE.Vector2(r, t * 1.5 - 0.75));
    }
    this.body = new THREE.Mesh(
      new THREE.LatheGeometry(pts, 24),
      new THREE.MeshStandardMaterial({
        color: '#ffb36b',
        emissive: '#ff7a2a',
        emissiveIntensity: 2.4,   // above bloom luminance threshold => glows
        roughness: 0.9,
        transparent: true,
        opacity: 0.96,
      }),
    );
    // Inner flame core: small bright sphere, strongest bloom source
    this.flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#fff3c0' }),
    );
    this.flame.position.y = -0.25;
    this.light = new THREE.PointLight('#ffae5e', 60, 18, 1.6);
    this.group.add(this.body, this.flame, this.light);
  }

  update(x: number, y: number, vx: number, vy: number,
         lightIntensity: number, lightDistance: number, dt: number): void {
    this.group.position.set(x, y, 0);
    this.time += dt;
    // squash & stretch from velocity + gentle idle breathing
    const stretch = THREE.MathUtils.clamp(1 + (vy - 2.2) * 0.06, 0.85, 1.18);
    const breathe = 1 + Math.sin(this.time * 2.2) * 0.015;
    this.body.scale.set((1 / stretch) * breathe, stretch * breathe, (1 / stretch) * breathe);
    this.group.rotation.z = THREE.MathUtils.clamp(-vx * 0.06, -0.25, 0.25);
    // flame flicker
    this.light.intensity = lightIntensity * (1 + Math.sin(this.time * 13.7) * 0.07);
    this.light.distance = lightDistance;
    const f = lightIntensity / 68; // 0..1
    (this.body.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + 2.2 * f;
    this.flame.scale.setScalar(0.6 + 0.7 * f);
  }
}
