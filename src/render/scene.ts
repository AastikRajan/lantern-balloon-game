import * as THREE from 'three';

export class GameScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private baseY = 0;
  private shakeAmp = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,           // SMAA in post instead
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
    this.camera.position.set(0, 0, 14);

    this.scene.add(new THREE.AmbientLight(0x404a7a, 0.7));
    const moon = new THREE.DirectionalLight(0x8aa0ff, 0.5);
    moon.position.set(-6, 10, 8);
    this.scene.add(moon);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Gentle trauma-style screen shake; intensity in world units (~0.2–0.5). */
  shake(intensity: number): void {
    this.shakeAmp = Math.max(this.shakeAmp, intensity);
  }

  /** Camera follows lantern altitude with a slight lead. */
  follow(lanternY: number, dt = 1 / 60): void {
    const damp = 1 - Math.pow(0.0006, dt); // frame-rate independent
    this.baseY += (lanternY + 1.8 - this.baseY) * damp;

    // decay shake fast (~0.4s) and apply as a small random offset on top
    this.shakeAmp *= Math.pow(0.0004, dt);
    if (this.shakeAmp < 0.004) this.shakeAmp = 0;
    const sx = (Math.random() * 2 - 1) * this.shakeAmp;
    const sy = (Math.random() * 2 - 1) * this.shakeAmp * 0.6;
    this.camera.position.x = sx;
    this.camera.position.y = this.baseY + sy;
  }

  /** Screen px -> world coords on the z=0 plane. */
  screenToWorld(px: number, py: number): { x: number; y: number } {
    const ndc = new THREE.Vector3(
      (px / window.innerWidth) * 2 - 1,
      -(py / window.innerHeight) * 2 + 1,
      0.5,
    ).unproject(this.camera);
    const dir = ndc.sub(this.camera.position).normalize();
    const t = -this.camera.position.z / dir.z;
    return { x: this.camera.position.x + dir.x * t, y: this.camera.position.y + dir.y * t };
  }
}
