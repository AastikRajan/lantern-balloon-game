import { UPGRADES, upgradeCost, SKINS } from '../meta/progression';
import type { SaveData } from '../meta/save';

/** Workshop overlay: spend embers on upgrades and lantern skins. */
export class Shop {
  private root: HTMLElement;
  private body: HTMLElement;

  constructor(parent: HTMLElement, private save: SaveData, private onChange: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'shop';
    this.root.innerHTML = `
      <div class="shop-panel interactive">
        <div class="shop-head">
          <span class="shop-title">Workshop</span>
          <span class="shop-embers">✦ <b>0</b></span>
          <button class="shop-close" aria-label="Close">✕</button>
        </div>
        <div class="shop-body"></div>
      </div>`;
    parent.appendChild(this.root);
    this.body = this.root.querySelector('.shop-body')!;
    this.root.querySelector('.shop-close')!.addEventListener('click', () => this.close());
    this.root.addEventListener('click', (e) => { if (e.target === this.root) this.close(); });
  }

  open(): void { this.render(); this.root.classList.add('visible'); }
  close(): void { this.root.classList.remove('visible'); }

  private render(): void {
    (this.root.querySelector('.shop-embers b') as HTMLElement).textContent = String(this.save.embers);
    const rows: string[] = ['<div class="shop-section">Upgrades</div>'];
    for (const u of UPGRADES) {
      const lvl = this.save.upgrades[u.id] ?? 0;
      const cost = upgradeCost(u.id, lvl);
      const pips = Array.from({ length: u.maxLevel }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      const btn = cost === null
        ? `<button class="shop-buy maxed" disabled>MAX</button>`
        : `<button class="shop-buy" data-up="${u.id}" ${this.save.embers < cost ? 'disabled' : ''}>✦ ${cost}</button>`;
      rows.push(`<div class="shop-row">
        <div class="shop-info"><b>${u.name}</b><span>${u.desc}</span><div class="pips">${pips}</div></div>${btn}</div>`);
    }
    rows.push('<div class="shop-section">Skins</div>');
    for (const s of SKINS) {
      const owned = this.save.ownedSkins.includes(s.id);
      const equipped = this.save.lanternSkin === s.id;
      const swatch = `<span class="skin-swatch" style="background:linear-gradient(135deg,${s.lantern},${s.shield})"></span>`;
      let btn: string;
      if (equipped) btn = `<button class="shop-buy equipped" disabled>Equipped</button>`;
      else if (owned) btn = `<button class="shop-buy" data-equip="${s.id}">Equip</button>`;
      else btn = `<button class="shop-buy" data-skin="${s.id}" ${this.save.embers < s.cost ? 'disabled' : ''}>✦ ${s.cost}</button>`;
      rows.push(`<div class="shop-row">
        <div class="shop-info">${swatch}<b>${s.name}</b></div>${btn}</div>`);
    }
    this.body.innerHTML = rows.join('');

    this.body.querySelectorAll<HTMLButtonElement>('[data-up]').forEach((b) =>
      b.addEventListener('click', () => this.buyUpgrade(b.dataset.up!)));
    this.body.querySelectorAll<HTMLButtonElement>('[data-skin]').forEach((b) =>
      b.addEventListener('click', () => this.buySkin(b.dataset.skin!)));
    this.body.querySelectorAll<HTMLButtonElement>('[data-equip]').forEach((b) =>
      b.addEventListener('click', () => this.equipSkin(b.dataset.equip!)));
  }

  private buyUpgrade(id: string): void {
    const lvl = this.save.upgrades[id] ?? 0;
    const cost = upgradeCost(id, lvl);
    if (cost === null || this.save.embers < cost) return;
    this.save.embers -= cost;
    this.save.upgrades[id] = lvl + 1;
    this.onChange();
    this.render();
  }

  private buySkin(id: string): void {
    const skin = SKINS.find((s) => s.id === id)!;
    if (this.save.embers < skin.cost || this.save.ownedSkins.includes(id)) return;
    this.save.embers -= skin.cost;
    this.save.ownedSkins.push(id);
    this.equipSkin(id);
  }

  private equipSkin(id: string): void {
    this.save.lanternSkin = id;
    this.save.shieldSkin = id;
    this.onChange();
    this.render();
  }
}
