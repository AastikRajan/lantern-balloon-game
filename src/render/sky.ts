import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
varying vec2 vUv;
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom;
uniform float uShift; // 0..1 altitude progression within the biome
void main() {
  float t = vUv.y;
  vec3 top = mix(uTop, uTop * 0.6, uShift);          // sky deepens as you climb
  vec3 col = t > 0.5 ? mix(uMid, top, (t - 0.5) * 2.0)
                     : mix(uBottom, uMid, t * 2.0);
  // faint grain to avoid banding on mobile screens
  float n = fract(sin(dot(vUv * 1234.5, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor = vec4(col + (n - 0.5) * 0.012, 1.0);
}`;

// Village Dusk palette (spec §2.5 biome 1)
export const DUSK = {
  top: new THREE.Color('#241a4e'),
  mid: new THREE.Color('#7a3b8f'),
  bottom: new THREE.Color('#ff8c5a'),
};

export class Sky {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTop: { value: DUSK.top.clone() },
        uMid: { value: DUSK.mid.clone() },
        uBottom: { value: DUSK.bottom.clone() },
        uShift: { value: 0 },
      },
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(140, 90), this.material);
    this.mesh.position.z = -40;
    this.mesh.renderOrder = -10;
  }

  /** Keep the sky glued to the camera and evolve with altitude. */
  update(cameraX: number, cameraY: number, altitude: number): void {
    this.mesh.position.x = cameraX;
    this.mesh.position.y = cameraY;
    this.material.uniforms.uShift.value = Math.min(1, altitude / 300);
  }
}
