import * as THREE from 'three';

/**
 * Distant painted backdrop (public/art/bg.jpg — starry night over mountains).
 * Sits between the procedural sky gradient and the play field, follows the
 * camera with a slow parallax so the mountains recede as the lantern climbs,
 * then fades out entirely so the higher biomes take over. One quad, one
 * texture, zero per-frame allocation.
 */
export class Backdrop {
  readonly mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private time = 0;

  /** Altitude (world units) over which the backdrop fully fades out. */
  private static readonly FADE_END = 70;
  /** How much of the climb the backdrop keeps up with (1 = glued to camera). */
  private static readonly PARALLAX = 0.14;

  constructor(baseUrl: string = import.meta.env.BASE_URL) {
    const tex = new THREE.TextureLoader().load(`${baseUrl}art/bg.jpg`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    this.material = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      depthTest: false,
      fog: false,
    });
    // 16:9 quad wide enough to cover ultrawide screens at its depth
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(152, 85.5), this.material);
    this.mesh.position.z = -44;
    this.mesh.renderOrder = -90; // after the sky gradient (-100), before the world
    this.mesh.frustumCulled = false;
  }

  update(cameraX: number, cameraY: number, altitude: number, dt: number): void {
    this.time += dt;
    // Fade with altitude: village mountains give way to storm/aurora biomes.
    const fade = 1 - THREE.MathUtils.smoothstep(altitude, 12, Backdrop.FADE_END);
    this.material.opacity = 0.9 * fade;
    this.mesh.visible = fade > 0.01;
    if (!this.mesh.visible) return;

    // Slow horizontal drift sells "distant clouds"; vertical parallax makes
    // the mountains sink away as the camera rises.
    const drop = Math.min(altitude, Backdrop.FADE_END) * (1 - Backdrop.PARALLAX) * 0.35;
    this.mesh.position.x = cameraX + Math.sin(this.time * 0.045) * 1.6;
    this.mesh.position.y = cameraY - 6 - drop;
  }
}
