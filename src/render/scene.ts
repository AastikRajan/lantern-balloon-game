import * as THREE from 'three';

export class GameScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

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

  /** Camera follows lantern altitude with a slight lead. */
  follow(lanternY: number, dt = 1 / 60): void {
    const damp = 1 - Math.pow(0.0006, dt); // frame-rate independent
    this.camera.position.y += (lanternY + 1.8 - this.camera.position.y) * damp;
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
