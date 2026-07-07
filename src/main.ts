import { PhysicsWorld, PLAY_HALF_WIDTH, BURST_COST } from './physics/world';
import { FixedLoop } from './core/loop';
import { GameStateMachine } from './core/state';
import { Flame } from './gameplay/flame';
import { Score } from './gameplay/score';
import { Combo } from './gameplay/combo';
import { Dda } from './gameplay/dda';
import { ensureGoals, applyRun, type RunStats } from './gameplay/goals';
import { Spawner } from './gameplay/spawner';
import { GameScene } from './render/scene';
import { Sky, BIOME_HEIGHT } from './render/sky';
import { Starfield } from './render/starfield';
import { Backdrop } from './render/backdrop';
import { LanternVisual } from './render/lantern';
import { ShieldVisual } from './render/shield';
import { ObstacleVisuals } from './render/obstacles';
import { PostChain } from './render/post';
import { Sparks, EmberTrail } from './render/particles';
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
  const backdrop = new Backdrop();
  const lanternVis = new LanternVisual();
  const shieldVis = new ShieldVisual();
  const obstacleVis = new ObstacleVisuals(gfx.scene);
  const sparks = new Sparks();
  const trail = new EmberTrail();
  gfx.scene.add(sky.mesh, backdrop.mesh, stars.points, lanternVis.group, shieldVis.group,
    sparks.points, trail.points);
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
  let deflectsThisRun = 0;
  let perfectsThisRun = 0;
  let maxComboThisRun = 0;
  let runPeak = 0;
  let dailyMode = false;
  let lastCompleted: string[] = [];

  const save = loadSave();
  save.goals = ensureGoals(save.goals);
  writeSave(save);
  const applySkin = () => {
    const skin = skinById(save.lanternSkin);
    lanternVis.setColor(skin.lantern);
    shieldVis.setColor(skin.shield);
    trail.setColor(skin.lantern);
  };
  applySkin();

  const clock = () => performance.now() / 1000;

  const hud = new Hud(uiRoot, () => doBurst(), () => {
    if (sm.state === 'run') sm.transition('pause');
  });
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
      // damage juice: red edge flash + screen shake scaled by impact speed
      hud.flash(Math.min(0.85, 0.35 + speed * 0.04), 'hit');
      gfx.shake(Math.min(0.5, 0.16 + speed * 0.03));
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
      deflectsThisRun++;
      if (c.count > maxComboThisRun) maxComboThisRun = c.count;
      sparks.burst(x, y, perfect ? speed + 10 : speed);
      score.addBonus(Math.round((perfect ? 25 : 10) * combo.scoreMultiplier));
      if (perfect) {
        perfectsThisRun++;
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
    deflectsThisRun = 0;
    perfectsThisRun = 0;
    maxComboThisRun = 0;
    runPeak = 0;
    physics.setObstacleGravityScale(dda.ease);
    shieldVis.setHalfWidth(loadout.shieldHalfWidth);
    applySkin();
    const seed = dailyMode ? dailySeed() : Date.now() % 100000;
    spawner = new Spawner(seed, PLAY_HALF_WIDTH - 0.5);
    hud.setVisible(true);
    screens.show('none');
  };

  const todayStr = () => new Date().toISOString().slice(0, 10);
  function dailySeed(): number {
    return [...todayStr()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  }

  const bankRun = () => {
    save.embers += embersThisRun + rescuedThisRun * 3;
    save.wispsTotal += rescuedThisRun;
    save.bestScore = Math.max(save.bestScore, score.points);

    const biome = Math.min(3, Math.floor(runPeak / BIOME_HEIGHT));
    const stats: RunStats = {
      deflects: deflectsThisRun, perfects: perfectsThisRun, maxCombo: maxComboThisRun,
      wisps: rescuedThisRun, embers: embersThisRun, biome, score: score.points,
    };
    const res = applyRun(save.goals, stats);
    save.goals = res.goals;
    save.embers += res.reward;
    lastCompleted = res.completed.map((c) => c.desc);

    if (dailyMode) {
      const today = todayStr();
      if (save.daily.date !== today) {
        const prev = new Date(save.daily.date || 0).getTime();
        const isYesterday = today !== save.daily.date &&
          Date.now() - prev < 1000 * 60 * 60 * 48 && save.daily.date !== '';
        save.daily = { date: today, best: score.points, streak: isYesterday ? save.daily.streak + 1 : 1 };
      } else {
        save.daily.best = Math.max(save.daily.best, score.points);
      }
    }

    writeSave(save);
    screens.setCurrency(save.embers);
    screens.setGoals(save.goals);
    screens.setBest(save.bestScore);
  };

  let resuming = false; // pause -> run without resetting the run
  const screens = new Screens(uiRoot, {
    onStart: () => { dailyMode = false; sm.transition('run'); },
    onRetry: () => sm.transition('run'),
    onShop: () => shop.open(),
    onDaily: () => { dailyMode = true; sm.transition('run'); },
    onResume: () => { resuming = true; sm.transition('run'); },
    onRestart: () => sm.transition('run'),
    onMenu: () => sm.transition('menu'),
  });
  screens.setCurrency(save.embers);
  screens.setGoals(save.goals);
  screens.setBest(save.bestScore);

  const shop = new Shop(uiRoot, save, () => { writeSave(save); applySkin(); screens.setCurrency(save.embers); });

  const endRun = (won: boolean) => {
    dda.recordRun(runPeak);
    bankRun();
    hud.setVisible(false);
    if (won) sfx.perfect(8); else sfx.gameover();
    screens.show(won ? 'won' : 'over', score.points, save.bestScore, lastCompleted);
  };

  const sm = new GameStateMachine({
    menu: () => { hud.setVisible(false); screens.show('home'); },
    run: () => {
      if (resuming) { resuming = false; screens.show('none'); hud.setVisible(true); }
      else startRun();
    },
    pause: () => screens.show('pause'),
    gameover: () => endRun(false),
    won: () => endRun(true),
  });

  wirePhysicsEvents();

  // --- Keyboard: Esc/P pause-resume, Space flame burst ---
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (sm.state === 'run') sm.transition('pause');
      else if (sm.state === 'pause') { resuming = true; sm.transition('run'); }
    } else if (e.code === 'Space' && sm.state === 'run') {
      e.preventDefault();
      doBurst();
    }
  });

  // Auto-pause when the tab is hidden so the run isn't lost in the background.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && sm.state === 'run') sm.transition('pause');
  });

  // --- Input: pointer position -> shield target, 1:1 and immediate ---
  const trackPointer = (clientX: number, clientY: number) => {
    if (sm.state !== 'run') return;
    const w = gfx.screenToWorld(clientX, clientY);
    physics.setShieldTarget(w.x, w.y);
  };
  canvas.addEventListener('pointerdown', (e) => trackPointer(e.clientX, e.clientY));
  canvas.addEventListener('pointermove', (e) => trackPointer(e.clientX, e.clientY));

  // --- Fixed-step simulation ---
  const WIN_ALTITUDE = BIOME_HEIGHT * 4; // clear all four biomes -> ascended
  const loop = new FixedLoop(1 / 60, (dt) => {
    if (sm.state !== 'run') return;
    physics.step(dt);
    combo.expire(clock());
    const pos = physics.lanternPosition();
    if (pos.y > runPeak) runPeak = pos.y;
    if (pos.y >= WIN_ALTITUDE) { sm.transition('won'); return; }
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
    backdrop.update(gfx.camera.position.x, gfx.camera.position.y, pos.y, elapsedSec);
    lanternVis.update(pos.x, pos.y, vel.x, vel.y,
      flame.lightIntensity, flame.lightDistance, elapsedSec);
    shieldVis.update(sp.x, sp.y, elapsedSec);
    obstacleVis.sync(physics, now / 1000);
    if (sm.state === 'run') trail.emit(pos.x, pos.y, flame.value / 100, elapsedSec);
    trail.update(elapsedSec);
    sparks.update(elapsedSec);
    post.setBrightness(flame.brightness);
    hud.update(score.points, flame.value, combo.count, flame.value >= BURST_COST);
    post.render(elapsedSec);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
