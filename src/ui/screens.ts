import { goalDef } from '../gameplay/goals';
import type { GoalState } from '../meta/save';

export interface ScreenCallbacks {
  onStart: () => void;
  onRetry: () => void;
  onShop: () => void;
  onDaily: () => void;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export type ScreenName = 'home' | 'over' | 'won' | 'pause' | 'none';

export class Screens {
  private home: HTMLElement;
  private over: HTMLElement;
  private pause: HTMLElement;
  private overLabel: HTMLElement;
  private overCta: HTMLElement;
  private finalScore: HTMLElement;
  private bestScore: HTMLElement;
  private homeEmbers: HTMLElement;
  private homeBest: HTMLElement;
  private goalsEl: HTMLElement;
  private completedEl: HTMLElement;

  constructor(parent: HTMLElement, cb: ScreenCallbacks) {
    this.home = document.createElement('div');
    this.home.className = 'screen home';
    this.home.innerHTML = `
      <div class="home-art" aria-hidden="true"></div>
      <div class="home-bank">✦ <b>0</b></div>
      <div class="home-content">
        <h1 class="title">Lantern</h1>
        <p class="tagline">rise up · protect the flame</p>
        <p class="home-best"></p>
        <div class="home-goals"></div>
        <button class="cta interactive" data-act="rise">Play</button>
        <div class="home-row">
          <button class="cta-ghost interactive" data-act="shop">Workshop</button>
          <button class="cta-ghost interactive" data-act="daily">Daily</button>
        </div>
        <p class="hint">drag to shield · ✦ / Space to burst · Esc to pause</p>
      </div>`;
    this.home.querySelector('[data-act="rise"]')!.addEventListener('click', cb.onStart);
    this.home.querySelector('[data-act="shop"]')!.addEventListener('click', cb.onShop);
    this.home.querySelector('[data-act="daily"]')!.addEventListener('click', cb.onDaily);
    this.homeEmbers = this.home.querySelector('.home-bank b')!;
    this.homeBest = this.home.querySelector('.home-best')!;
    this.goalsEl = this.home.querySelector('.home-goals')!;

    this.over = document.createElement('div');
    this.over.className = 'screen over';
    this.over.innerHTML = `
      <p class="over-label">the flame went out</p>
      <div class="final-score">0</div>
      <div class="best-score"></div>
      <div class="over-completed"></div>
      <button class="cta interactive">Rise Again</button>
      <button class="cta-ghost interactive" data-act="menu">Menu</button>`;
    this.over.querySelector('.cta')!.addEventListener('click', cb.onRetry);
    this.over.querySelector('[data-act="menu"]')!.addEventListener('click', cb.onMenu);
    this.overLabel = this.over.querySelector('.over-label')!;
    this.overCta = this.over.querySelector('.cta')!;
    this.finalScore = this.over.querySelector('.final-score')!;
    this.bestScore = this.over.querySelector('.best-score')!;
    this.completedEl = this.over.querySelector('.over-completed')!;

    this.pause = document.createElement('div');
    this.pause.className = 'screen pause';
    this.pause.innerHTML = `
      <div class="pause-panel">
        <p class="over-label">paused</p>
        <button class="cta interactive" data-act="resume">Resume</button>
        <button class="cta-ghost interactive" data-act="restart">Restart</button>
        <button class="cta-ghost interactive" data-act="menu">Menu</button>
      </div>`;
    this.pause.querySelector('[data-act="resume"]')!.addEventListener('click', cb.onResume);
    this.pause.querySelector('[data-act="restart"]')!.addEventListener('click', cb.onRestart);
    this.pause.querySelector('[data-act="menu"]')!.addEventListener('click', cb.onMenu);

    parent.append(this.home, this.over, this.pause);
    this.show('home');
  }

  setCurrency(embers: number): void { this.homeEmbers.textContent = String(embers); }

  setBest(best: number): void {
    this.homeBest.textContent = best > 0 ? `best ${best}` : '';
  }

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

  show(which: ScreenName, score?: number, best?: number, completed: string[] = []): void {
    this.home.classList.toggle('visible', which === 'home');
    this.over.classList.toggle('visible', which === 'over' || which === 'won');
    this.pause.classList.toggle('visible', which === 'pause');
    if ((which === 'over' || which === 'won') && score !== undefined) {
      const won = which === 'won';
      this.over.classList.toggle('won', won);
      this.overLabel.textContent = won ? '✦ you reached the stars ✦' : 'the flame went out';
      this.overCta.textContent = won ? 'Rise Once More' : 'Rise Again';
      this.finalScore.textContent = String(score);
      this.bestScore.textContent = `best ${best ?? score}`;
      this.completedEl.innerHTML = completed.length
        ? completed.map((d) => `<div class="goal-done">✓ ${d}</div>`).join('')
        : '';
    }
  }
}
