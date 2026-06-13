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
uniform float uGlow;        // warm horizon glow strength
void main() {
  float t = vUv.y;
  // smooth three-stop vertical gradient
  vec3 col = t > 0.5 ? mix(uMid, uTop, smoothstep(0.0, 1.0, (t - 0.5) * 2.0))
                     : mix(uBottom, uMid, smoothstep(0.0, 1.0, t * 2.0));
  // soft warm bloom near the bottom horizon
  col += uBottom * uGlow * pow(1.0 - t, 3.0) * 0.6;
  // dithered grain kills banding on phone panels
  float n = fract(sin(dot(vUv * 1234.5, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor = vec4(col + (n - 0.5) * 0.014, 1.0);
}`;

export interface Biome {
  name: string;
  top: THREE.Color; mid: THREE.Color; bottom: THREE.Color;
  glow: number;          // warm horizon strength
  fog: THREE.Color;
}

function biome(name: string, top: string, mid: string, bottom: string, glow: number, fog: string): Biome {
  return {
    name,
    top: new THREE.Color(top), mid: new THREE.Color(mid), bottom: new THREE.Color(bottom),
    glow, fog: new THREE.Color(fog),
  };
}

// Four hand-tuned night palettes the journey climbs through.
export const BIOMES: Biome[] = [
  biome('Village Dusk', '#2a1c54', '#8a3f86', '#ff9a52', 0.9, '#3a2a5a'),
  biome('Storm Veil',   '#0c1022', '#2b3f6e', '#7d6fa6', 0.4, '#1a2240'),
  biome('Aurora',       '#04122e', '#0f7d72', '#c24fa6', 0.7, '#0c2c46'),
  biome('The Stars',    '#01030c', '#0a1236', '#2a2f7a', 0.25, '#05071c'),
];

export const BIOME_HEIGHT = 52; // world units of altitude per biome

const tmpTop = new THREE.Color();
const tmpMid = new THREE.Color();
const tmpBottom = new THREE.Color();
const tmpFog = new THREE.Color();

/** Continuously interpolated multi-biome night sky. */
export class Sky {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor(private scene?: THREE.Scene) {
    const b0 = BIOMES[0];
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTop: { value: b0.top.clone() },
        uMid: { value: b0.mid.clone() },
        uBottom: { value: b0.bottom.clone() },
        uGlow: { value: b0.glow },
      },
      depthWrite: false,
      depthTest: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(160, 110), this.material);
    this.mesh.position.z = -45;
    this.mesh.renderOrder = -100;
  }

  /** Current biome name for HUD/telemetry. */
  biomeName(altitude: number): string {
    const i = Math.min(BIOMES.length - 1, Math.floor(altitude / BIOME_HEIGHT));
    return BIOMES[i].name;
  }

  update(cameraX: number, cameraY: number, altitude: number): void {
    this.mesh.position.x = cameraX;
    this.mesh.position.y = cameraY;

    const f = altitude / BIOME_HEIGHT;
    const i = Math.max(0, Math.min(BIOMES.length - 1, Math.floor(f)));
    const j = Math.min(BIOMES.length - 1, i + 1);
    // ease the crossfade so transitions feel deliberate, not linear
    const k = THREE.MathUtils.smoothstep(f - i, 0, 1);
    const a = BIOMES[i], b = BIOMES[j];

    this.material.uniforms.uTop.value.copy(tmpTop.copy(a.top).lerp(b.top, k));
    this.material.uniforms.uMid.value.copy(tmpMid.copy(a.mid).lerp(b.mid, k));
    this.material.uniforms.uBottom.value.copy(tmpBottom.copy(a.bottom).lerp(b.bottom, k));
    this.material.uniforms.uGlow.value = THREE.MathUtils.lerp(a.glow, b.glow, k);

    if (this.scene) {
      tmpFog.copy(a.fog).lerp(b.fog, k);
      if (!this.scene.fog) this.scene.fog = new THREE.FogExp2(tmpFog.getHex(), 0.012);
      (this.scene.fog as THREE.FogExp2).color.copy(tmpFog);
    }
  }
}
