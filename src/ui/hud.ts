export class Hud {
  private root: HTMLElement;
  private scoreEl: HTMLElement;
  private flameFill: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud-score">0</div>
      <div class="hud-flame"><div class="hud-flame-fill"></div></div>`;
    parent.appendChild(this.root);
    this.scoreEl = this.root.querySelector('.hud-score')!;
    this.flameFill = this.root.querySelector('.hud-flame-fill')!;
  }

  update(points: number, flamePct: number): void {
    const txt = String(points);
    if (this.scoreEl.textContent !== txt) this.scoreEl.textContent = txt;
    this.flameFill.style.width = `${flamePct}%`;
    this.flameFill.classList.toggle('low', flamePct < 30);
  }

  setVisible(v: boolean): void { this.root.style.display = v ? '' : 'none'; }
}
