# Lantern — Game Design Spec

**Date:** 2026-06-12 · **Status:** Approved by user
**One-liner:** A glowing paper sky-lantern rises through the night; you swipe to summon wind gusts that deflect tumbling debris. Your flame is your health, your vision, and your score multiplier — protect it to the stars.

## 1. Product goals

- Visual quality is the **top acceptance criterion**: must look like a modern premium hyper-casual title (real 3D rendering, bloom/glow, rich evolving gradients, polished motion design). Never sprite-flat.
- Fix the genre's documented failures: no one-hit deaths, no repetition wall, no physics tunneling, no predatory monetization.
- Ship web-first (instantly playable in browser), then Google Play + App Store via Capacitor. Full launch ambition.
- 60 fps on mid-range Android; playable one-handed in the thumb zone.

## 2. Core gameplay

### 2.1 The lantern
- Rises at a controlled base speed (camera follows). Carries a real point light; its radius and intensity scale with **flame level** (0–100).
- Flame = health + light radius + score multiplier (x1 at low flame → x3 at full blaze).
- Grazes/hits dim the flame (scaled by impact velocity). At flame 0 the lantern goes dark and falls — run over. Near zero: world darkens, vignette tightens, audio muffles, heartbeat rises.
- **Embers** spawn along the path; collecting one flares the flame up and emits a bloom pulse.

### 2.2 Wind gust control (one finger)
- Swipe anywhere → directional impulse field along the swipe vector, visualized as flowing particle streaks.
- Strong effect on debris, gentle nudge on the lantern (lets skilled players steer). Short flicks = small puffs; long sweeps = big clears. Fully analog (force ∝ swipe speed/length).

### 2.3 Obstacles
- Low-poly 3D rigid bodies (roof tiles, kites, branches, hail, ice shards — themed per biome) tumbling under Rapier physics on the z=0 gameplay plane. Fragments from breakable obstacles remain live hazards.
- Spawning: handcrafted pattern chunks per biome, sequenced with procedural filler. No pattern-exhaustion loop.

### 2.4 Fairness engineering
- Continuous collision detection (Rapier CCD) on all fast bodies — nothing tunnels or teleports.
- Hitboxes: lantern collider slightly smaller than visual; gust field slightly generous.
- **Near-miss field:** invisible weak repulsion shell just outside the lantern collider nudges would-be clipping trajectories into dramatic grazes.
- **Dynamic difficulty:** invisible scalars (obstacle speed, telegraph latency, trajectory noise) adjust to consecutive-failure and dominance telemetry; e.g. −5–8% speed after 3 rapid failures at the same section.

### 2.5 Biomes (run structure)
1. **Village Dusk** — warm oranges/purples, rooftop silhouettes, tiles & kites.
2. **Storm Clouds** — slate blues, lightning flashes, wind shear events, hail.
3. **Aurora** — teal/magenta curtains (bloom showcase), ice shards.
4. **The Stars** — deep indigo, near-silence, slow majestic debris; the emotional payoff.

Each biome: distinct palette/color grade, obstacle set, music stem intensity, ~10 pattern chunks. Score = altitude × flame multiplier.

## 3. Game feel ("juice") — mandatory

Central `FeedbackManager` subscribed to the physics collision bus; intensity driven by relative impact velocity:
- Hit-stop 16–32 ms on heavy deflections; procedural decaying-sine screen shake.
- Directional debris particles at impact normal; gust streak trails; ember sparkle trails.
- Squash-and-stretch on the lantern body tied to velocity.
- Haptics via Capacitor (light ticks for grazes, thuds for heavy hits); start/end waveforms at zero amplitude.
- Audio: collision SFX pitch-shifted by mass/velocity; 3-stem adaptive music (rhythm bed → melody → percussion) layered in per biome; all audio pre-decoded at load.

## 4. Visual & UI specification

- **Renderer:** Three.js, perspective camera, 2.5D (gameplay plane at z=0, parallax layers behind/in front).
- **Post:** pmndrs `postprocessing` — selective bloom (lantern/embers/aurora emissives), vignette (flame-linked), subtle chromatic aberration on impacts, per-biome color grading. Half-res bloom, SMAA, antialias off, pixel ratio ≤ 2.
- **Sky:** full-screen gradient shader, continuously interpolating per altitude; star/cloud parallax layers.
- **UI:** DOM/CSS overlay above canvas. Glassmorphism panels, kinetic score typography, micro-animated buttons. All critical controls in bottom 30% (thumb zone). `viewport-fit=cover` + `env(safe-area-inset-*)` padding. Colorblind-safe signal design (shape + color, never color alone). Build every screen with the frontend-design skill.
- **Performance budget:** GPU-instanced particles, object pooling for all obstacles/particles (no allocation in the game loop), texture/draw-call budget reviewed per biome.

## 5. Meta layer (Phase 2 — only after the core loop is proven fun)

- Embers double as persistent currency → lantern skins, flame colors, gust trail cosmetics, small perk track (starting flame, ember magnet radius).
- Daily journey goal; battle-pass-lite season later.
- Monetization (store launch only): $2.99–4.99 permanent remove-ads IAP, opt-in rewarded ads (run continue, ember multiplier), cosmetic IAP. No interstitials after short sessions, no subscriptions.

## 6. Tech stack & architecture

| Layer | Choice |
|---|---|
| Build | Vite + TypeScript |
| Rendering | Three.js + pmndrs postprocessing |
| Physics | Rapier 2D (WASM, deterministic, CCD) on gameplay plane |
| UI | DOM/CSS overlay (no React — full-screen game, menus don't justify the weight) |
| Audio | Web Audio API, layered stems |
| Mobile | Capacitor (Android + iOS), haptics + native IAP plugins at store phase |

### Module boundaries
- `core/` — game loop, fixed-timestep stepping, state machine (menu/run/gameover), event bus.
- `physics/` — Rapier world, body pools, collision events, near-miss field, CCD config.
- `render/` — Three scene, lantern rig + light, obstacle meshes, sky shader, parallax, particles, post chain.
- `gameplay/` — flame system, gust input → impulse fields, spawner (pattern chunks + DDA), scoring, biome sequencer.
- `feel/` — FeedbackManager (shake, hit-stop, haptics, SFX triggers).
- `ui/` — DOM screens (home, HUD, pause, game over), settings (reduced motion, haptics toggle).
- `audio/` — stem mixer, SFX pool, pitch-shift on collision events.

Physics in fixed timestep with render interpolation; render at display rate.

## 7. Build order

1. **Vertical slice:** lantern + light + bloom + sky gradient + gust input + one obstacle type + flame damage/embers + game over/restart. Must already look premium — this gates everything else.
2. Juice pass: FeedbackManager, particles, hit-stop, shake, audio stems.
3. Biome system: palettes, grading, pattern chunks, DDA, near-miss field.
4. UI polish: home/HUD/pause/game-over screens, settings, safe areas.
5. Meta layer (embers economy, cosmetics).
6. Capacitor wrap, haptics, store prep (Play closed testing, App Store review hardening).

## 8. Acceptance criteria

- Browser-playable at each milestone; 60 fps on mid-range Android (Chrome) at milestone 1.
- Visual bar: lantern glow/bloom and evolving sky visibly comparable to premium titles (Alto's Odyssey-class atmosphere) in the vertical slice.
- No tunneling at max obstacle velocity; deaths always trace to a visible, fair cause.
- Zero text tutorial: first-session onboarding by affordance (one slow obstacle, instinctive swipe).
- One-hand playable; all interactive UI in bottom 30%; safe-area correct on notched devices.

## 9. Testing

- Unit: flame math, DDA scalars, scoring, spawner sequencing (deterministic seeds via Rapier).
- Integration: physics-step determinism snapshot tests; pool exhaustion/reuse.
- Manual/visual: webapp-testing (Playwright) screenshots per milestone; FPS overlay profiling on Android Chrome via remote debugging.
