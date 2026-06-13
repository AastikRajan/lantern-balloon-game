export class Screens {
  private home: HTMLElement;
  private over: HTMLElement;
  private finalScore: HTMLElement;
  private bestScore: HTMLElement;
  private homeEmbers: HTMLElement;

  constructor(parent: HTMLElement, onStart: () => void, onRetry: () => void, onShop: () => void) {
    this.home = document.createElement('div');
    this.home.className = 'screen home';
    this.home.innerHTML = `
      <div class="home-bank">✦ <b>0</b></div>
      <h1 class="title">Lantern</h1>
      <p class="hint">protect the flame · drag to shield</p>
      <button class="cta interactive" data-act="rise">Rise</button>
      <button class="cta-ghost interactive" data-act="shop">Workshop</button>`;
    this.home.querySelector('[data-act="rise"]')!.addEventListener('click', onStart);
    this.home.querySelector('[data-act="shop"]')!.addEventListener('click', onShop);
    this.homeEmbers = this.home.querySelector('.home-bank b')!;

    this.over = document.createElement('div');
    this.over.className = 'screen over';
    this.over.innerHTML = `
      <p class="over-label">the flame went out</p>
      <div class="final-score">0</div>
      <div class="best-score"></div>
      <button class="cta interactive">Rise Again</button>`;
    this.over.querySelector('button')!.addEventListener('click', onRetry);
    this.finalScore = this.over.querySelector('.final-score')!;
    this.bestScore = this.over.querySelector('.best-score')!;

    parent.append(this.home, this.over);
    this.show('home');
  }

  setCurrency(embers: number): void { this.homeEmbers.textContent = String(embers); }

  show(which: 'home' | 'over' | 'none', score?: number, best?: number): void {
    this.home.classList.toggle('visible', which === 'home');
    this.over.classList.toggle('visible', which === 'over');
    if (which === 'over' && score !== undefined) {
      this.finalScore.textContent = String(score);
      this.bestScore.textContent = `best ${best ?? score}`;
    }
  }
}
