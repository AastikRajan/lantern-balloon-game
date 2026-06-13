import { describe, it, expect, beforeAll } from 'vitest';
import { PhysicsWorld, RISE_SPEED } from '../src/physics/world';

describe('PhysicsWorld', () => {
  beforeAll(async () => { await PhysicsWorld.init(); });

  it('lantern rises at steady speed', () => {
    const w = new PhysicsWorld();
    for (let i = 0; i < 120; i++) w.step(1 / 60);
    const y = w.lanternPosition().y;
    expect(y).toBeGreaterThan(RISE_SPEED * 1.5);
    expect(y).toBeLessThan(RISE_SPEED * 2.5);
  });

  it('spawns obstacles that fall and recycles them below the cull line', () => {
    const w = new PhysicsWorld();
    w.spawnObstacle('tile', 0, 10);
    expect(w.obstacleCount()).toBe(1);
    for (let i = 0; i < 600; i++) { w.step(1 / 60); w.cullBelow(w.lanternPosition().y - 12); }
    expect(w.obstacleCount()).toBe(0);
  });

  it('emits lanternHit with impact speed when an obstacle lands on the lantern', () => {
    const w = new PhysicsWorld();
    let hitSpeed = -1;
    w.events.on('lanternHit', (e) => { hitSpeed = e.speed; });
    w.spawnObstacle('tile', 0, w.lanternPosition().y + 6);
    for (let i = 0; i < 300 && hitSpeed < 0; i++) w.step(1 / 60);
    expect(hitSpeed).toBeGreaterThan(0);
  });

  it('emits emberCollected when lantern touches an ember sensor', () => {
    const w = new PhysicsWorld();
    let collected = 0;
    w.events.on('emberCollected', () => collected++);
    w.spawnEmber(0, w.lanternPosition().y + 2);
    for (let i = 0; i < 300 && collected === 0; i++) w.step(1 / 60);
    expect(collected).toBe(1);
  });

  it('tracks the shield to the commanded target, offset above the finger', () => {
    const w = new PhysicsWorld();
    w.setShieldTarget(2, 1);
    w.step(1 / 60);
    const sp = w.shieldPosition();
    expect(sp.x).toBeCloseTo(2, 1);
    expect(sp.y).toBeGreaterThan(1); // sits above the touch point
  });

  it('emits shieldDeflect when an obstacle strikes the shield', () => {
    const w = new PhysicsWorld();
    let deflected = 0;
    w.events.on('shieldDeflect', () => deflected++);
    w.setShieldTarget(0, 4); // shield ends up above the lantern's path
    w.spawnObstacle('tile', 0, 9);
    for (let i = 0; i < 300 && deflected === 0; i++) w.step(1 / 60);
    expect(deflected).toBeGreaterThan(0);
  });
});
