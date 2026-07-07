# 🎈 Lantern

🎮 **Play now → <https://aastikrajan.github.io/lantern-balloon-game/>**

A physics puzzle-platformer built on real rigid-body simulation: guide and **protect the balloon** through hazards using momentum, not precision-clicking. Rendered with Three.js, simulated with Rapier2D.

**Controls:** drag to move the shield · ✦ button / Space for flame burst · Esc/P to pause. Climb through all four biomes to reach the stars.

## Play / run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve the production build
npm run test       # vitest
```

## How it's built

A modular engine, cleanly separated so each system is testable on its own:

| Module | Responsibility |
| --- | --- |
| `src/core` | game loop, fixed-timestep scheduler, state |
| `src/physics` | Rapier2D world, rigid bodies, collisions |
| `src/gameplay` | balloon, hazards, win/loss rules |
| `src/render` | Three.js scene, camera, post-processing |
| `src/audio` | sound events |
| `src/ui` | HUD, menus |

## Tech
TypeScript · Three.js · Rapier2D (`@dimforge/rapier2d-compat`) · Vite · Vitest · postprocessing

## License
MIT
