export interface GoalState { id: string; progress: number; }

export interface SaveData {
  version: 1;
  embers: number;          // spendable currency
  bestScore: number;
  wispsTotal: number;      // lifetime rescued (for goals/flavour)
  upgrades: Record<string, number>;
  ownedSkins: string[];
  lanternSkin: string;
  shieldSkin: string;
  goals: GoalState[];
  daily: { date: string; best: number; streak: number };
}

const KEY = 'lantern.save.v1';

export function defaultSave(): SaveData {
  return {
    version: 1,
    embers: 0,
    bestScore: 0,
    wispsTotal: 0,
    upgrades: {},
    ownedSkins: ['ember'],
    lanternSkin: 'ember',
    shieldSkin: 'ember',
    goals: [],
    daily: { date: '', best: 0, streak: 0 },
  };
}

/** Load save, healing missing/corrupt fields back to defaults. */
export function loadSave(store: Pick<Storage, 'getItem' | 'setItem'> = localStorage): SaveData {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { ...defaultSave(), ...parsed,
      upgrades: { ...(parsed.upgrades ?? {}) },
      ownedSkins: Array.isArray(parsed.ownedSkins) && parsed.ownedSkins.length ? parsed.ownedSkins : ['ember'],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      daily: parsed.daily ?? defaultSave().daily,
    };
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData, store: Pick<Storage, 'getItem' | 'setItem'> = localStorage): void {
  try { store.setItem(KEY, JSON.stringify(data)); } catch { /* storage full/blocked — ignore */ }
}
