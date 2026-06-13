import { describe, it, expect } from 'vitest';
import { ensureGoals, applyRun, goalDef, type RunStats } from '../src/gameplay/goals';

const zero: RunStats = { deflects: 0, perfects: 0, maxCombo: 0, wisps: 0, embers: 0, biome: 0, score: 0 };

describe('goals', () => {
  it('ensureGoals fills to exactly 3 unique goals', () => {
    const g = ensureGoals([]);
    expect(g.length).toBe(3);
    expect(new Set(g.map((x) => x.id)).size).toBe(3);
  });
  it('keeps existing goals and tops up the rest', () => {
    const g = ensureGoals([{ id: 'deflect25', progress: 7 }]);
    expect(g.length).toBe(3);
    expect(g.find((x) => x.id === 'deflect25')!.progress).toBe(7);
  });
  it('drops unknown goal ids', () => {
    const g = ensureGoals([{ id: 'bogus', progress: 3 }]);
    expect(g.every((x) => goalDef(x.id))).toBe(true);
  });

  it('completes a run-mode goal and pays its reward', () => {
    const goals = [{ id: 'deflect25', progress: 0 }];
    const res = applyRun(goals, { ...zero, deflects: 30 });
    expect(res.completed.map((c) => c.id)).toContain('deflect25');
    expect(res.reward).toBe(30);
    expect(res.goals.some((g) => g.id === 'deflect25')).toBe(false); // replaced
    expect(res.goals.length).toBe(3);
  });

  it('accumulates cumulative goals across runs without completing early', () => {
    let goals = [{ id: 'wisps10', progress: 0 }];
    let res = applyRun(goals, { ...zero, wisps: 4 });
    let w = res.goals.find((g) => g.id === 'wisps10')!;
    expect(w.progress).toBe(4);
    expect(res.reward).toBe(0);
    res = applyRun(res.goals, { ...zero, wisps: 7 });
    expect(res.completed.map((c) => c.id)).toContain('wisps10');
    expect(res.reward).toBe(30);
  });

  it('run-mode goal tracks the best attempt, not a sum', () => {
    let goals = [{ id: 'score500', progress: 0 }];
    let res = applyRun(goals, { ...zero, score: 200 });
    expect(res.goals.find((g) => g.id === 'score500')!.progress).toBe(200);
    res = applyRun(res.goals, { ...zero, score: 150 });
    expect(res.goals.find((g) => g.id === 'score500')!.progress).toBe(200); // not 350
  });
});
