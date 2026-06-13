import { goalDef } from '../gameplay/goals';
import type { GoalState } from '../meta/save';

export class Screens {
  private home: HTMLElement;
  private over: HTMLElement;
  private finalScore: HTMLElement;
  private bestScore: HTMLElement;
  private homeEmbers: HTMLElement;
  private goalsEl: HTMLElement;
  private completedEl: HTMLElement;

  constructor(parent: HTMLElement, onStart: () => void, onRetry: () => void, onShop: () => void, onDaily: () => void) {
    this.home = document.createElement('div');
    this.home.className = 'screen home';
    this.home.innerHTML = `
      <div class="home-bank">✦ <b>0</b></div>
      <h1 class="title">Lantern</h1>
      <p class="hint">protect the flame · drag to shield</p>
      <div class="home-goals"></div>
      <button class="cta interactive" data-act="rise">Rise</button>
      <div class="home-row">
        <button class="cta-ghost interactive" data-act="shop">Workshop</button>
        <button class="cta-ghost interactive" data-act="daily">Daily</button>
      </div>`;
    this.home.querySelector('[data-act="rise"]')!.addEventListener('click', onStart);
    this.home.querySelector('[data-act="shop"]')!.addEventListener('click', onShop);
    this.home.querySelector('[data-act="daily"]')!.addEventListener('click', onDaily);
    this.homeEmbers = this.home.querySelector('.home-bank b')!;
    this.goalsEl = this.home.querySelector('.home-goals')!;

    this.over = document.createElement('div');
    this.over.className = 'screen over';
    this.over.innerHTML = `
      <p class="over-label">the flame went out</p>
      <div class="final-score">0</div>
      <div class="best-score"></div>
      <div class="over-completed"></div>
      <button class="cta interactive">Rise Again</button>`;
    this.over.querySelector('button')!.addEventListener('click', onRetry);
    this.finalScore = this.over.querySelector('.final-score')!;
    this.bestScore = this.over.querySelector('.best-score')!;
    this.completedEl = this.over.querySelector('.over-completed')!;

    parent.append(this.home, this.over);
    this.show('home');
  }

  setCurrency(embers: number): void { this.homeEmbers.textContent = String(embers); }

  setGoals(goals: GoalState[]): void {
    this.goalsEl.innerHTML = goals.map((g) => {
      const def = goalDef(g.id);
      if (!def) return '';
      const pct = Math.min(100, Math.round((g.progress / def.target) * 100));
      return `<div class="goal">
        <div class="goal-top"><span>${def.desc}</span><span class="goal-rw">✦${def.reward}</span></div>
        <div class="goal-bar"><div style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  }

  show(which: 'home' | 'over' | 'none', score?: number, best?: number, completed: string[] = []): void {
    this.home.classList.toggle('visible', which === 'home');
    this.over.classList.toggle('visible', which === 'over');
    if (which === 'over' && score !== undefined) {
      this.finalScore.textContent = String(score);
      this.bestScore.textContent = `best ${best ?? score}`;
      this.completedEl.innerHTML = completed.length
        ? completed.map((d) => `<div class="goal-done">✓ ${d}</div>`).join('')
        : '';
    }
  }
}
