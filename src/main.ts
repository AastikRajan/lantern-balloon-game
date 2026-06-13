import { PhysicsWorld, PLAY_HALF_WIDTH, BURST_COST } from './physics/world';
import { FixedLoop } from './core/loop';
import { GameStateMachine } from './core/state';
import { Flame } from './gameplay/flame';
import { Score } from './gameplay/score';
import { Combo } from './gameplay/combo';
import { Dda } from './gameplay/dda';
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
import { Shop } from './ui/shop';
import { Sfx } from './audio/sfx';
import { loadSave, writeSave } from './meta/save';
import { deriveLoadout, skinById } from './meta/progression';

async function boot() {
  await PhysicsWorld.init();

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui')!;
  const gfx = new GameScene(canvas);
  const sky = new Sky(gfx.scene);
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
  const combo = new Combo();
  const dda = new Dda();
  let spawner = new Spawner(Date.now() % 100000, PLAY_HALF_WIDTH - 0.5);
  let invulnUntil = 0; // run clock seconds
  let rescuedThisRun = 0;
  let embersThisRun = 0;
  let runPeak = 0;

  const save = loadSave();
  const applySkin = () => {
    const skin = skinById(save.lanternSkin);
    lanternVis.setColor(skin.lantern);
    shieldVis.setColor(skin.shield);
  };
  applySkin();

  const clock = () => performance.now() / 1000;

  const hud = new Hud(uiRoot, () => doBurst());
  hud.setVisible(false);
  const sfx = new Sfx();

  function doBurst() {
    if (sm.state !== 'run' || !flame.spend(BURST_COST)) return;
    physics.burst();
    sfx.burst();
    const lp = physics.lanternPosition();
    sparks.burst(lp.x, lp.y, 14);
    invulnUntil = clock() + 0.45;
  }

  function wirePhysicsEvents() {
    physics.events.on('lanternHit', ({ speed }) => {
      if (sm.state !== 'run' || clock() < invulnUntil) return;
      flame.hit(speed);
      sfx.hit();
      combo.break();
      if (flame.dead) sm.transition('gameover');
    });
    physics.events.on('emberCollected', () => { flame.flare(); sfx.ember(); embersThisRun++; });
    physics.events.on('wispRescued', () => {
      flame.flare(10);
      const lp = physics.lanternPosition();
      sparks.burst(lp.x, lp.y, 6);
      sfx.rescue();
      rescuedThisRun++;
    });
    physics.events.on('shieldDeflect', ({ x, y, speed, perfect }) => {
      const c = combo.deflect(clock());
      sparks.burst(x, y, perfect ? speed + 10 : speed);
      score.addBonus(Math.round((perfect ? 25 : 10) * combo.scoreMultiplier));
      if (perfect) {
        flame.flare(4);
        hud.flash(0.55);
        sfx.perfect(c.count);
      } else {
        sfx.deflect(speed);
      }
    });
  }

  const startRun = () => {
    sfx.resume(); // triggered from the Rise/Retry button gesture
    const loadout = deriveLoadout(save.upgrades);
    physics.dispose();
    physics = new PhysicsWorld({ shieldHalfWidth: loadout.shieldHalfWidth, magnetRadius: loadout.magnetRadius });
    wirePhysicsEvents();
    flame.configure(loadout.startFlame, loadout.maxFlame);
    flame.reset();
    score.reset();
    combo.reset();
    invulnUntil = 0;
    rescuedThisRun = 0;
    embersThisRun = 0;
    runPeak = 0;
    physics.setObstacleGravityScale(dda.ease);
    shieldVis.setHalfWidth(loadout.shieldHalfWidth);
    applySkin();
    spawner = new Spawner(Date.now() % 100000, PLAY_HALF_WIDTH - 0.5);
    hud.setVisible(true);
    screens.show('none');
  };

  const bankRun = () => {
    save.embers += embersThisRun + rescuedThisRun * 3;
    save.wispsTotal += rescuedThisRun;
    save.bestScore = Math.max(save.bestScore, score.points);
    writeSave(save);
    screens.setCurrency(save.embers);
  };

  const screens = new Screens(
    uiRoot,
    () => sm.transition('run'),
    () => sm.transition('run'),
    () => shop.open(),
  );
  screens.setCurrency(save.embers);

  const shop = new Shop(uiRoot, save, () => { writeSave(save); applySkin(); screens.setCurrency(save.embers); });

  const sm = new GameStateMachine({
    menu: () => { hud.setVisible(false); screens.show('home'); },
    run: startRun,
    gameover: () => {
      dda.recordRun(runPeak);
      bankRun();
      hud.setVisible(false);
      sfx.gameover();
      screens.show('over', score.points, save.bestScore);
    },
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
    combo.expire(clock());
    const pos = physics.lanternPosition();
    if (pos.y > runPeak) runPeak = pos.y;
    score.update(pos.y, flame.multiplier);
    const spawn = spawner.tick(dt, pos.y);
    if (spawn) {
      const spawnY = gfx.camera.position.y + 10;
      if (spawn.kind === 'ember') physics.spawnEmber(spawn.x, spawnY);
      else if (spawn.kind === 'wisp') physics.spawnWisp(spawn.x * 0.3, gfx.camera.position.y + 4);
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
    gfx.follow(pos.y, elapsedSec);
    sky.update(gfx.camera.position.x, gfx.camera.position.y, pos.y);
    stars.update(gfx.camera.position.x, gfx.camera.position.y, now / 1000);
    lanternVis.update(pos.x, pos.y, vel.x, vel.y,
      flame.lightIntensity, flame.lightDistance, elapsedSec);
    shieldVis.update(sp.x, sp.y, elapsedSec);
    obstacleVis.sync(physics, now / 1000);
    sparks.update(elapsedSec);
    post.setBrightness(flame.brightness);
    hud.update(score.points, flame.value, combo.count, flame.value >= BURST_COST);
    post.render(elapsedSec);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
