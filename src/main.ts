import { PhysicsWorld, PLAY_HALF_WIDTH } from './physics/world';
import { FixedLoop } from './core/loop';
import { GameStateMachine } from './core/state';
import { Flame } from './gameplay/flame';
import { Score } from './gameplay/score';
import { Spawner } from './gameplay/spawner';
import { GameScene } from './render/scene';
import { Sky } from './render/sky';
import { Starfield } from './render/starfield';
import { LanternVisual } from './render/lantern';
import { ShieldVisual } from './render/shield';
import { ObstacleVisuals } from './render/obstacles';
import { PostChain } from './render/post';
import { Sparks } from './render/particles';
import { Hud } from './ui/hud';
import { Screens } from './ui/screens';

async function boot() {
  await PhysicsWorld.init();

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui')!;
  const gfx = new GameScene(canvas);
  const sky = new Sky();
  const stars = new Starfield();
  const lanternVis = new LanternVisual();
  const shieldVis = new ShieldVisual();
  const obstacleVis = new ObstacleVisuals(gfx.scene);
  const sparks = new Sparks();
  gfx.scene.add(sky.mesh, stars.points, lanternVis.group, shieldVis.group, sparks.points);
  const post = new PostChain(gfx.renderer, gfx.scene, gfx.camera);

  let physics = new PhysicsWorld();
  const flame = new Flame();
  const score = new Score();
  let spawner = new Spawner(Date.now() % 100000, PLAY_HALF_WIDTH - 0.5);

  const hud = new Hud(uiRoot);
  hud.setVisible(false);

  function wirePhysicsEvents() {
    physics.events.on('lanternHit', ({ speed }) => {
      if (sm.state !== 'run') return;
      flame.hit(speed);
      if (flame.dead) sm.transition('gameover');
    });
    physics.events.on('emberCollected', () => flame.flare());
    physics.events.on('shieldDeflect', ({ x, y, speed }) => sparks.burst(x, y, speed));
  }

  const startRun = () => {
    physics.dispose();
    physics = new PhysicsWorld();
    wirePhysicsEvents();
    flame.reset();
    score.reset();
    spawner = new Spawner(Date.now() % 100000, PLAY_HALF_WIDTH - 0.5);
    hud.setVisible(true);
    screens.show('none');
  };

  const screens = new Screens(
    uiRoot,
    () => sm.transition('run'),
    () => sm.transition('run'),
  );

  const sm = new GameStateMachine({
    menu: () => { hud.setVisible(false); screens.show('home'); },
    run: startRun,
    gameover: () => { hud.setVisible(false); screens.show('over', score.points); },
  });

  wirePhysicsEvents();

  // --- Input: pointer position -> shield target, 1:1 and immediate ---
  const trackPointer = (clientX: number, clientY: number) => {
    if (sm.state !== 'run') return;
    const w = gfx.screenToWorld(clientX, clientY);
    physics.setShieldTarget(w.x, w.y);
  };
  canvas.addEventListener('pointerdown', (e) => trackPointer(e.clientX, e.clientY));
  canvas.addEventListener('pointermove', (e) => trackPointer(e.clientX, e.clientY));

  // --- Fixed-step simulation ---
  const loop = new FixedLoop(1 / 60, (dt) => {
    if (sm.state !== 'run') return;
    physics.step(dt);
    const pos = physics.lanternPosition();
    score.update(pos.y, flame.multiplier);
    const spawn = spawner.tick(dt, pos.y);
    if (spawn) {
      const spawnY = gfx.camera.position.y + 10;
      if (spawn.kind === 'ember') physics.spawnEmber(spawn.x, spawnY);
      else physics.spawnObstacle(spawn.kind, spawn.x, spawnY);
    }
    physics.cullBelow(gfx.camera.position.y - 12);
  });

  // --- Render loop ---
  let last = performance.now();
  function frame(now: number) {
    const elapsedSec = (now - last) / 1000;
    last = now;
    loop.advance(elapsedSec);

    const pos = physics.lanternPosition();
    const vel = physics.lanternVelocity();
    const sp = physics.shieldPosition();
    gfx.follow(pos.y);
    sky.update(gfx.camera.position.x, gfx.camera.position.y, pos.y);
    stars.update(gfx.camera.position.x, gfx.camera.position.y, now / 1000);
    lanternVis.update(pos.x, pos.y, vel.x, vel.y,
      flame.lightIntensity, flame.lightDistance, elapsedSec);
    shieldVis.update(sp.x, sp.y, elapsedSec);
    obstacleVis.sync(physics, now / 1000);
    sparks.update(elapsedSec);
    post.setBrightness(flame.brightness);
    hud.update(score.points, flame.value);
    post.render(elapsedSec);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
