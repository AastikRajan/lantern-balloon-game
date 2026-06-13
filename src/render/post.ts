import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, VignetteEffect, SMAAEffect,
} from 'postprocessing';
import type * as THREE from 'three';

export class PostChain {
  private composer: EffectComposer;
  private vignette: VignetteEffect;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    const bloom = new BloomEffect({
      mipmapBlur: true,            // cheap, soft, mobile-friendly
      luminanceThreshold: 0.55,    // catch the warm glow, not just pure white
      luminanceSmoothing: 0.32,
      intensity: 1.9,
      radius: 0.78,
    });
    this.vignette = new VignetteEffect({ darkness: 0.45, offset: 0.3 });
    const smaa = new SMAAEffect();
    this.composer.addPass(new EffectPass(camera, bloom, this.vignette, smaa));

    window.addEventListener('resize', () =>
      this.composer.setSize(window.innerWidth, window.innerHeight));
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  /** brightness 0.25..1 from Flame; lower flame = heavier vignette (world closes in). */
  setBrightness(brightness: number): void {
    this.vignette.darkness = 1.05 - brightness * 0.65;
  }

  render(dt: number): void { this.composer.render(dt); }
}
