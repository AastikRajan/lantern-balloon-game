import RAPIER from '@dimforge/rapier2d-compat';
import { EventBus } from '../core/events';
import type { SpawnKind } from '../gameplay/spawner';
import { gustImpulse, LANTERN_FACTOR, type SwipeSegment } from '../gameplay/gust';

export const RISE_SPEED = 2.2;           // world units / s
export const PLAY_HALF_WIDTH = 5;        // gameplay corridor half width

export interface ObstacleState {
  kind: Exclude<SpawnKind, 'ember'>;
  body: RAPIER.RigidBody;
}
export interface EmberState { body: RAPIER.RigidBody; }

type PhysicsEvents = {
  lanternHit: { speed: number };
  emberCollected: Record<string, never>;
};

const OBSTACLE_SHAPES: Record<Exclude<SpawnKind, 'ember'>, { hx: number; hy: number; density: number }> = {
  tile:   { hx: 0.55, hy: 0.35, density: 1.4 },
  kite:   { hx: 0.45, hy: 0.45, density: 0.6 },
  branch: { hx: 1.1,  hy: 0.18, density: 1.0 },
};

export class PhysicsWorld {
  static async init(): Promise<void> { await RAPIER.init(); }

  readonly events = new EventBus<PhysicsEvents>();
  private world = new RAPIER.World({ x: 0, y: -4.2 });
  private queue = new RAPIER.EventQueue(true);
  private lantern: RAPIER.RigidBody;
  private lanternCollider: RAPIER.Collider;
  private obstacles = new Map<number, ObstacleState>(); // collider handle -> state
  private embers = new Map<number, EmberState>();

  constructor() {
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 0)
      .setGravityScale(0)
      .setLinearDamping(1.6)
      .setCcdEnabled(true);
    this.lantern = this.world.createRigidBody(desc);
    this.lanternCollider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(0.55) // slightly smaller than visual (spec fairness)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.lantern,
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
  obstacleCount(): number { return this.obstacles.size; }

  /** All live obstacles for render sync. */
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
        .setRestitution(0.35)
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

  applyGust(seg: SwipeSegment): void {
    this.obstacles.forEach((o) => {
      const t = o.body.translation();
      const imp = gustImpulse(seg, t.x, t.y);
      if (imp) o.body.applyImpulse({ x: imp.x * o.body.mass(), y: imp.y * o.body.mass() }, true);
    });
    const lt = this.lantern.translation();
    const li = gustImpulse(seg, lt.x, lt.y);
    if (li) this.lantern.applyImpulse(
      { x: li.x * LANTERN_FACTOR * this.lantern.mass(), y: li.y * LANTERN_FACTOR * this.lantern.mass() }, true);
  }

  step(dt: number): void {
    // steady rise: ease vertical velocity toward RISE_SPEED, keep lateral free
    const v = this.lantern.linvel();
    this.lantern.setLinvel({ x: v.x, y: v.y + (RISE_SPEED - v.y) * 0.15 }, true);
    // gentle self-centering so the lantern eases back toward the middle,
    // with a firmer wall near the corridor edge
    const t = this.lantern.translation();
    const centering = Math.abs(t.x) > PLAY_HALF_WIDTH ? 1.1 : 0.28;
    this.lantern.applyImpulse({ x: -t.x * centering * this.lantern.mass() * dt, y: 0 }, true);

    this.world.timestep = dt;
    this.world.step(this.queue);

    this.queue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const lh = this.lanternCollider.handle;
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
