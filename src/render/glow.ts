import * as THREE from 'three';

/** Procedural soft radial glow texture (no asset files needed). */
export function radialGlowTexture(inner = 'rgba(255,210,150,1)', outer = 'rgba(255,150,60,0)'): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Additive billboard sprite used as a bloom-feeding halo. */
export function makeGlowSprite(scale: number, texture: THREE.Texture, opacity = 1): THREE.Sprite {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    opacity,
  }));
  sprite.scale.set(scale, scale, 1);
  return sprite;
}
