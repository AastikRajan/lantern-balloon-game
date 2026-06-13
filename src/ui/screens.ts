export class Screens {
  private home: HTMLElement;
  private over: HTMLElement;
  private finalScore: HTMLElement;
  private bestScore: HTMLElement;

  constructor(parent: HTMLElement, onStart: () => void, onRetry: () => void) {
    this.home = document.createElement('div');
    this.home.className = 'screen home';
    this.home.innerHTML = `
      <h1 class="title">Lantern</h1>
      <p class="hint">swipe to guide the wind</p>
      <button class="cta interactive">Rise</button>`;
    this.home.querySelector('button')!.addEventListener('click', onStart);

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

  show(which: 'home' | 'over' | 'none', score?: number): void {
    this.home.classList.toggle('visible', which === 'home');
    this.over.classList.toggle('visible', which === 'over');
    if (which === 'over' && score !== undefined) {
      this.finalScore.textContent = String(score);
      const best = Math.max(score, Number(localStorage.getItem('lantern.best') ?? 0));
      localStorage.setItem('lantern.best', String(best));
      this.bestScore.textContent = `best ${best}`;
    }
  }
}
