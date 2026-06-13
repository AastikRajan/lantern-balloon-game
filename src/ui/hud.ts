export class Hud {
  private root: HTMLElement;
  private scoreEl: HTMLElement;
  private flameFill: HTMLElement;
  private comboEl: HTMLElement;
  private flashEl: HTMLElement;
  private burstBtn: HTMLButtonElement;
  private lastCombo = -1;

  constructor(parent: HTMLElement, onBurst: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud-top">
        <div class="hud-score">0</div>
        <div class="hud-flame"><div class="hud-flame-fill"></div></div>
      </div>
      <div class="hud-combo"></div>
      <button class="hud-burst interactive" aria-label="Flame burst">
        <span class="hud-burst-glyph">✦</span>
      </button>`;
    parent.appendChild(this.root);
    this.scoreEl = this.root.querySelector('.hud-score')!;
    this.flameFill = this.root.querySelector('.hud-flame-fill')!;
    this.comboEl = this.root.querySelector('.hud-combo')!;
    this.burstBtn = this.root.querySelector('.hud-burst')!;
    this.burstBtn.addEventListener('click', onBurst);

    this.flashEl = document.createElement('div');
    this.flashEl.className = 'screen-flash';
    parent.appendChild(this.flashEl);
  }

  update(points: number, flamePct: number, comboCount: number, burstReady: boolean): void {
    const txt = String(points);
    if (this.scoreEl.textContent !== txt) this.scoreEl.textContent = txt;
    this.flameFill.style.width = `${flamePct}%`;
    this.flameFill.classList.toggle('low', flamePct < 30);

    if (comboCount !== this.lastCombo) {
      if (comboCount >= 2) {
        this.comboEl.textContent = `×${comboCount}`;
        this.comboEl.classList.add('show', 'pop');
        // restart the pop animation
        void this.comboEl.offsetWidth;
        this.comboEl.classList.remove('pop');
      } else {
        this.comboEl.classList.remove('show');
      }
      this.lastCombo = comboCount;
    }
    this.burstBtn.classList.toggle('ready', burstReady);
  }

  /** Brief white flash for Perfect Deflects (0..1 intensity). */
  flash(intensity = 0.6): void {
    this.flashEl.style.transition = 'none';
    this.flashEl.style.opacity = String(intensity);
    void this.flashEl.offsetWidth;
    this.flashEl.style.transition = 'opacity 0.32s ease-out';
    this.flashEl.style.opacity = '0';
  }

  setVisible(v: boolean): void { this.root.style.display = v ? '' : 'none'; }
}
