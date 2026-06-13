import RAPIER from '@dimforge/rapier2d-compat';
import { EventBus } from '../core/events';
import type { SpawnKind } from '../gameplay/spawner';

export const RISE_SPEED = 2.2;           // world units / s
export const PLAY_HALF_WIDTH = 5;        // gameplay corridor half width
export const SHIELD_HALF_WIDTH = 1.0;    // shield bar half length
export const SHIELD_FINGER_OFFSET = 1.1; // shield sits this far above the touch point

export interface ObstacleState {
  kind: Exclude<SpawnKind, 'ember'>;
  body: RAPIER.RigidBody;
}
export interface EmberState { body: RAPIER.RigidBody; }

type PhysicsEvents = {
  lanternHit: { speed: number };
  emberCollected: Record<string, never>;
  shieldDeflect: { x: number; y: number; speed: number };
};

const OBSTACLE_SHAPES: Record<Exclude<SpawnKind, 'ember'>, { hx: number; hy: number; density: number }> = {
  tile:   { hx: 0.55, hy: 0.35, density: 1.4 },
  kite:   { hx: 0.45, hy: 0.45, density: 0.6 },
  branch: { hx: 1.1,  hy: 0.18, density: 1.0 },
};

export class PhysicsWorld {
  static async init(): Promise<void> { await RAPIER.init(); }

  readonly events = new EventBus<PhysicsEvents>();
  private world = new RAPIER.World({ x: 0, y: -5.0 });
  private queue = new RAPIER.EventQueue(true);
  private lantern: RAPIER.RigidBody;
  private lanternCollider: RAPIER.Collider;
  private shield: RAPIER.RigidBody;
  private shieldCollider: RAPIER.Collider;
  private shieldTarget: { x: number; y: number };
  private obstacles = new Map<number, ObstacleState>(); // collider handle -> state
  private embers = new Map<number, EmberState>();

  constructor() {
    // Lantern: floats upward, only jostled by obstacles that get through.
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 0)
      .setGravityScale(0)
      .setLinearDamping(2.4)
      .setCcdEnabled(true);
    this.lantern = this.world.createRigidBody(desc);
    this.lanternCollider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(0.5) // slightly smaller than visual (spec fairness)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.lantern,
    );

    // Shield: kinematic bar the player drags 1:1 with their finger.
    this.shieldTarget = { x: 0, y: -3 };
    this.shield = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -3),
    );
    this.shieldCollider = this.world.createCollider(
      RAPIER.ColliderDesc.roundCuboid(SHIELD_HALF_WIDTH, 0.06, 0.14)
        .setRestitution(0.55)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.shield,
    );
  }

  lanternPosition(): { x: number; y: number } {
    const t = this.lantern.translation();
    return { x: t.x, y: t.y };
  }
  lanternVelocity(): { x: number; y: number } {
    const v = this.lantern.linvel();
    return { x: v.x, y: v.y };
  }
  shieldPosition(): { x: number; y: number } {
    const t = this.shield.translation();
    return { x: t.x, y: t.y };
  }
  obstacleCount(): number { return this.obstacles.size; }

  /** Command the shield to a world position (player finger, 1:1). */
  setShieldTarget(x: number, y: number): void {
    this.shieldTarget.x = Math.max(-PLAY_HALF_WIDTH - 1, Math.min(PLAY_HALF_WIDTH + 1, x));
    this.shieldTarget.y = y + SHIELD_FINGER_OFFSET;
  }

  forEachObstacle(fn: (kind: string, x: number, y: number, rot: number) => void): void {
    this.obstacles.forEach((o) => {
      const t = o.body.translation();
      fn(o.kind, t.x, t.y, o.body.rotation());
    });
  }
  forEachEmber(fn: (x: number, y: number) => void): void {
    this.embers.forEach((e) => { const t = e.body.translation(); fn(t.x, t.y); });
  }

  spawnObstacle(kind: Exclude<SpawnKind, 'ember'>, x: number, y: number): void {
    const shape = OBSTACLE_SHAPES[kind];
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y)
        .setAngvel((Math.random() - 0.5) * 4)
        .setCcdEnabled(true),
    );
    const col = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(shape.hx, shape.hy)
        .setDensity(shape.density)
        .setRestitution(0.4)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    this.obstacles.set(col.handle, { kind, body });
  }

  spawnEmber(x: number, y: number): void {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y).setGravityScale(0),
    );
    const col = this.world.createCollider(
      RAPIER.ColliderDesc.ball(0.45).setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    this.embers.set(col.handle, { body });
  }

  step(dt: number): void {
    // steady rise toward RISE_SPEED; lateral self-centering keeps it readable
    const v = this.lantern.linvel();
    const t = this.lantern.translation();
    this.lantern.setLinvel({ x: v.x - t.x * 1.6 * dt, y: v.y + (RISE_SPEED - v.y) * 0.18 }, true);

    // drive the kinematic shield to the player's commanded position
    this.shield.setNextKinematicTranslation({ x: this.shieldTarget.x, y: this.shieldTarget.y });

    this.world.timestep = dt;
    this.world.step(this.queue);

    this.queue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const lh = this.lanternCollider.handle;
      const sh = this.shieldCollider.handle;

      // shield deflecting an obstacle -> feedback event
      if (h1 === sh || h2 === sh) {
        const other = h1 === sh ? h2 : h1;
        const obs = this.obstacles.get(other);
        if (obs) {
          const ov = obs.body.linvel();
          const tt = obs.body.translation();
          this.events.emit('shieldDeflect', { x: tt.x, y: tt.y, speed: Math.hypot(ov.x, ov.y) });
        }
        return;
      }

      const other = h1 === lh ? h2 : h2 === lh ? h1 : null;
      if (other === null) return;
      const ember = this.embers.get(other);
      if (ember) {
        this.world.removeRigidBody(ember.body);
        this.embers.delete(other);
        this.events.emit('emberCollected', {});
        return;
      }
      const obs = this.obstacles.get(other);
      if (obs) {
        const ov = obs.body.linvel();
        const lv = this.lantern.linvel();
        const speed = Math.hypot(ov.x - lv.x, ov.y - lv.y);
        this.events.emit('lanternHit', { speed });
      }
    });
  }

  cullBelow(y: number): void {
    const dropObs: number[] = [];
    this.obstacles.forEach((o, h) => { if (o.body.translation().y < y) dropObs.push(h); });
    dropObs.forEach((h) => { this.world.removeRigidBody(this.obstacles.get(h)!.body); this.obstacles.delete(h); });
    const dropEmb: number[] = [];
    this.embers.forEach((e, h) => { if (e.body.translation().y < y) dropEmb.push(h); });
    dropEmb.forEach((h) => { this.world.removeRigidBody(this.embers.get(h)!.body); this.embers.delete(h); });
  }

  dispose(): void { this.world.free(); this.queue.free(); }
}
