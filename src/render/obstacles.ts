import * as THREE from 'three';
import { Pool } from '../core/pool';
import type { PhysicsWorld } from '../physics/world';

const GEOMETRIES: Record<string, THREE.BufferGeometry> = {
  tile: new THREE.BoxGeometry(1.1, 0.7, 0.5),
  kite: new THREE.OctahedronGeometry(0.55),
  branch: new THREE.CylinderGeometry(0.16, 0.2, 2.2, 7).rotateZ(Math.PI / 2),
};
const MATERIALS: Record<string, THREE.MeshStandardMaterial> = {
  tile: new THREE.MeshStandardMaterial({ color: '#5a4a6e', roughness: 0.85 }),
  kite: new THREE.MeshStandardMaterial({ color: '#3e6e8f', roughness: 0.6, metalness: 0.1 }),
  branch: new THREE.MeshStandardMaterial({ color: '#4a3b30', roughness: 1 }),
};
const EMBER_MAT = new THREE.MeshBasicMaterial({ color: '#ffd27a' }); // blooms

export class ObstacleVisuals {
  private pools = new Map<string, Pool<THREE.Mesh>>();
  private emberPool: Pool<THREE.Mesh>;

  constructor(private scene: THREE.Scene) {
    for (const kind of Object.keys(GEOMETRIES)) {
      this.pools.set(kind, new Pool<THREE.Mesh>(
        () => { const m: THREE.Mesh = new THREE.Mesh(GEOMETRIES[kind], MATERIALS[kind]); scene.add(m); return m; },
        (m) => { m.visible = true; return m; },
      ));
    }
    this.emberPool = new Pool<THREE.Mesh>(
      () => { const m: THREE.Mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), EMBER_MAT); scene.add(m); return m; },
      (m) => { m.visible = true; return m; },
    );
  }

  /** Re-acquire pooled meshes each frame to mirror the physics state. */
  sync(physics: PhysicsWorld, time: number): void {
    this.pools.forEach((p) => { p.active.forEach((m) => (m.visible = false)); p.releaseAll(); });
    this.emberPool.active.forEach((m) => (m.visible = false));
    this.emberPool.releaseAll();

    physics.forEachObstacle((kind, x, y, rot) => {
      const mesh = this.pools.get(kind)!.acquire();
      mesh.position.set(x, y, 0);
      mesh.rotation.set(0, time * 0.7, rot); // slow tumble on y for 3D depth
    });
    physics.forEachEmber((x, y) => {
      const mesh = this.emberPool.acquire();
      mesh.position.set(x, y, 0);
      const s = 1 + Math.sin(time * 6 + x) * 0.15;
      mesh.scale.setScalar(s);
    });
  }
}
