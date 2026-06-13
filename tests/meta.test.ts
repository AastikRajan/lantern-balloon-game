import { describe, it, expect } from 'vitest';
import { upgradeCost, deriveLoadout } from '../src/meta/progression';
import { loadSave, writeSave, defaultSave, type SaveData } from '../src/meta/save';

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('progression', () => {
  it('upgrade cost grows geometrically and caps at max level', () => {
    expect(upgradeCost('flameCap', 0)).toBe(40);
    expect(upgradeCost('flameCap', 1)).toBe(64);
    expect(upgradeCost('flameCap', 5)).toBeNull(); // maxLevel 5
    expect(upgradeCost('nope', 0)).toBeNull();
  });
  it('derives loadout numbers from upgrade levels', () => {
    const base = deriveLoadout({});
    expect(base.startFlame).toBe(70);
    expect(base.maxFlame).toBe(100);
    expect(base.magnetRadius).toBe(0);
    const up = deriveLoadout({ startFlame: 2, flameCap: 3, shieldWidth: 2, magnet: 1 });
    expect(up.startFlame).toBe(80);
    expect(up.maxFlame).toBe(130);
    expect(up.shieldHalfWidth).toBeCloseTo(1.28);
    expect(up.magnetRadius).toBeCloseTo(2.1);
  });
});

describe('save', () => {
  it('returns defaults when empty and round-trips a write', () => {
    const store = memStore();
    const fresh = loadSave(store);
    expect(fresh.embers).toBe(0);
    expect(fresh.ownedSkins).toEqual(['ember']);
    const next: SaveData = { ...fresh, embers: 250, bestScore: 999 };
    writeSave(next, store);
    const back = loadSave(store);
    expect(back.embers).toBe(250);
    expect(back.bestScore).toBe(999);
  });
  it('heals corrupt JSON back to defaults', () => {
    const store = memStore();
    store.setItem('lantern.save.v1', '{not valid json');
    expect(loadSave(store).embers).toBe(defaultSave().embers);
  });
  it('backfills missing fields from an older partial save', () => {
    const store = memStore();
    store.setItem('lantern.save.v1', JSON.stringify({ version: 1, embers: 10 }));
    const s = loadSave(store);
    expect(s.embers).toBe(10);
    expect(s.ownedSkins).toEqual(['ember']);
    expect(s.daily.streak).toBe(0);
  });
});
