export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
  costMul: number;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'flameCap',    name: 'Flame Capacity', desc: 'Hold a bigger flame',      maxLevel: 5, baseCost: 40,  costMul: 1.6 },
  { id: 'startFlame',  name: 'Bright Start',   desc: 'Begin each run brighter',  maxLevel: 5, baseCost: 30,  costMul: 1.6 },
  { id: 'shieldWidth', name: 'Wider Shield',   desc: 'A broader guard',          maxLevel: 4, baseCost: 50,  costMul: 1.7 },
  { id: 'magnet',      name: 'Ember Magnet',   desc: 'Draw embers & wisps in',   maxLevel: 4, baseCost: 45,  costMul: 1.7 },
];

export function upgradeById(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id);
}

/** Cost to buy the next level; null if already maxed or unknown. */
export function upgradeCost(id: string, currentLevel: number): number | null {
  const def = upgradeById(id);
  if (!def || currentLevel >= def.maxLevel) return null;
  return Math.round(def.baseCost * Math.pow(def.costMul, currentLevel));
}

export interface Loadout {
  startFlame: number;
  maxFlame: number;
  shieldHalfWidth: number;
  magnetRadius: number;
}

/** Translate owned upgrade levels into concrete gameplay numbers. */
export function deriveLoadout(upgrades: Record<string, number>): Loadout {
  const lvl = (id: string) => upgrades[id] ?? 0;
  return {
    startFlame: 70 + lvl('startFlame') * 5,
    maxFlame: 100 + lvl('flameCap') * 10,
    shieldHalfWidth: 1.0 + lvl('shieldWidth') * 0.14,
    magnetRadius: lvl('magnet') === 0 ? 0 : 1.4 + lvl('magnet') * 0.7,
  };
}

export interface Skin { id: string; name: string; cost: number; lantern: string; shield: string; }

export const SKINS: Skin[] = [
  { id: 'ember',   name: 'Ember',   cost: 0,   lantern: '#ff7a2a', shield: '#3fd6ff' },
  { id: 'rose',    name: 'Rose',    cost: 120, lantern: '#ff5a8a', shield: '#ffd24f' },
  { id: 'jade',    name: 'Jade',    cost: 160, lantern: '#46d39a', shield: '#ff8cf0' },
  { id: 'frost',   name: 'Frost',   cost: 220, lantern: '#7ad0ff', shield: '#ffe6a0' },
];

export function skinById(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
