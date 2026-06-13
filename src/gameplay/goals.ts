import type { GoalState } from '../meta/save';

export type GoalMetric = 'deflects' | 'perfects' | 'maxCombo' | 'wisps' | 'embers' | 'biome' | 'score';

export interface GoalDef {
  id: string;
  desc: string;
  metric: GoalMetric;
  target: number;
  mode: 'run' | 'cumulative';
  reward: number;
}

export const GOAL_POOL: GoalDef[] = [
  { id: 'deflect25',  desc: 'Deflect 25 in one run',     metric: 'deflects', target: 25,  mode: 'run',        reward: 30 },
  { id: 'perfect5',   desc: '5 Perfect Deflects in a run', metric: 'perfects', target: 5,  mode: 'run',        reward: 40 },
  { id: 'combo8',     desc: 'Reach a ×8 combo',          metric: 'maxCombo', target: 8,   mode: 'run',        reward: 35 },
  { id: 'wisps10',    desc: 'Rescue 10 wisps',           metric: 'wisps',    target: 10,  mode: 'cumulative', reward: 30 },
  { id: 'embers40',   desc: 'Collect 40 embers',         metric: 'embers',   target: 40,  mode: 'cumulative', reward: 25 },
  { id: 'aurora',     desc: 'Reach the Aurora',          metric: 'biome',    target: 2,   mode: 'run',        reward: 50 },
  { id: 'score500',   desc: 'Score 500 in a run',        metric: 'score',    target: 500, mode: 'run',        reward: 40 },
  { id: 'stars',      desc: 'Reach the Stars',           metric: 'biome',    target: 3,   mode: 'run',        reward: 70 },
];

export interface RunStats {
  deflects: number; perfects: number; maxCombo: number;
  wisps: number; embers: number; biome: number; score: number;
}

export function goalDef(id: string): GoalDef | undefined {
  return GOAL_POOL.find((g) => g.id === id);
}

/** Fill the active list up to 3 with random goals not already present. */
export function ensureGoals(goals: GoalState[]): GoalState[] {
  const out = goals.filter((g) => goalDef(g.id));
  while (out.length < 3) {
    const taken = new Set(out.map((g) => g.id));
    const choices = GOAL_POOL.filter((g) => !taken.has(g.id));
    if (!choices.length) break;
    out.push({ id: choices[Math.floor(Math.random() * choices.length)].id, progress: 0 });
  }
  return out;
}

function runValue(def: GoalDef, stats: RunStats): number {
  return stats[def.metric];
}

/**
 * Update active goals with one run's stats. Completed goals are replaced with
 * fresh ones and their rewards summed.
 */
export function applyRun(goals: GoalState[], stats: RunStats): { goals: GoalState[]; completed: GoalDef[]; reward: number } {
  const completed: GoalDef[] = [];
  let reward = 0;
  const kept: GoalState[] = [];

  for (const g of goals) {
    const def = goalDef(g.id);
    if (!def) continue;
    const v = runValue(def, stats);
    const progress = def.mode === 'cumulative' ? g.progress + v : Math.max(g.progress, v);
    if (progress >= def.target) {
      completed.push(def);
      reward += def.reward;
    } else {
      kept.push({ id: g.id, progress });
    }
  }
  return { goals: ensureGoals(kept), completed, reward };
}
