# Lantern — Depth & Meta Design Addendum

**Date:** 2026-06-13 · **Status:** Approved (directions chosen by user)
**Builds on:** `2026-06-12-lantern-design.md`. Adds the depth + retention layers the vertical slice lacked. Research basis: Alto's Odyssey (goals system, mood), 2026 hybrid-casual 4-layer rule (hook→session→meta→economy, "death never wasted"), and the local game-design library (flow channel, Buster DDA, ≥2 feedback channels).

All numbers below are **starting values** to tune in playtest, not fixed.

## A. Core depth (moment-to-moment skill)

### A1. Perfect Deflect
- When the shield deflects an obstacle whose position is within `PERFECT_DIST = 2.4` world units of the lantern, it's a **Perfect**.
- Reward: +flash (chromatic/white pop), bright chime, spawn 1 ember, small flame bump (+4), bonus score (+25 × combo).
- Detection lives in the `shieldDeflect` handler (obstacle pos + lantern pos already available). Emit a distinct `perfect` path.

### A2. Combo chains
- `Combo` system: each deflect within `COMBO_WINDOW = 1.6 s` of the last increments the streak; window expiry or a lantern hit resets it to 0.
- Combo scales the deflect score bonus (`base × (1 + 0.25·combo)`) and the SFX pitch (rising). HUD shows `x{combo}` when combo ≥ 2, with a brief scale-pop.
- Pure function module `gameplay/combo.ts` (TDD): `deflect(now) → {count, justBroke}`, `reset()`, time-based expiry.

### A3. Secret dynamic difficulty (Buster principle)
- `gameplay/dda.ts` (TDD). Tracks the last runs' peak altitude. After **3 consecutive runs** ending below `STRUGGLE_ALT = 28`, lower a hidden `ease` scalar to `0.85` (slower obstacles, slightly wider spawn). A run that beats `STRUGGLE_ALT` nudges `ease` back toward `1.0` (+0.05/run). Never below 0.8, never above 1.0. Applied to obstacle gravity scale and spawn interval. Never surfaced to the player.

## B. Reasons to return (meta + economy)

### B1. Persistence
- `meta/save.ts` (TDD): typed save blob in `localStorage` (`lantern.save.v1`): `embers` (currency), `wisps` (rescued total), `upgrades` (level per id), `skins` (owned + equipped), `goals` (active + progress), `daily` (date, best, streak), `bestScore`. Versioned, defensive parse (corrupt → fresh defaults).

### B2. Currency + upgrades
- Embers + rescued wisps bank into `embers` currency at run end (wisps worth more).
- Upgrade shop (home screen) — each upgrade has levels w/ rising cost:
  - `flameCap` (+max flame), `shieldWidth` (+shield half-width), `magnet` (+ember/wisp attract radius), `startFlame` (+starting flame).
- Upgrade effects read at run start and applied to `Flame`/`PhysicsWorld`/spawn.

### B3. Skins
- Lantern color + shield color skins, bought with embers, equipped, applied to visuals. Pure cosmetic.

### B4. Rotating goals (the return engine)
- `gameplay/goals.ts` (TDD): pool of goal defs; **3 active** at a time. Track per-run + lifetime metrics: deflects, perfects, embers, wisps, max combo, biome reached. On completion → reward embers, roll a fresh goal. Persist. Examples: "Deflect 25 in one run", "Reach the Aurora", "Rescue 10 wisps", "Hit a x8 combo", "5 Perfect Deflects in a run".

### B5. Daily challenge
- Date-seeded run (`seed = yyyymmdd`) so everyone shares the layout. Track today's best + a completion **streak**. Home-screen "Daily" entry.

## C. Signature mechanic — Rescue + Burst economy (combined)

### C1. Rescue wisps
- Small glowing **wisp** lights drift gently upward through the run (sensor bodies). Touching one with the lantern **rescues** it: refuels flame (+10), +1 wisp to the run tally, sparkle + chime. Wisps are the emotional/identity hook (escorting lost lights) and the fuel source.

### C2. Flame Burst (spendable light)
- A thumb-zone **Burst button** (and double-tap fallback) emits a radial shockwave that shoves every obstacle away from the lantern and grants ~0.4 s of invulnerability.
- **Costs `BURST_COST = 22` flame.** Disabled when flame < cost. This is the risk/reward core: spend your life-light to escape a deadly cluster, then rebuild it by rescuing wisps/embers.
- Tight loop: rescue wisps → flame up → spend flame on bursts to survive → rescue more.

## Build order
1. A1+A2 (Perfect Deflect + combo) — biggest moment-to-moment lift.
2. C1+C2 (wisps + burst economy) — the signature identity.
3. A3 (DDA).
4. B1–B3 (persistence, currency, upgrades, skins).
5. B4–B5 (goals, daily).

## Acceptance
- Each increment: browser-playable, tests green, committed.
- Per 5-component filter: every new action fires ≥2 feedback channels (visual + audio); perfects/combos clearly telegraphed and readable; burst cost obvious; goals/currency persist across reloads.
