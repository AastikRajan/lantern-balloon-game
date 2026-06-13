export type GameState = 'menu' | 'run' | 'gameover';

const VALID: Record<GameState, GameState[]> = {
  menu: ['run'],
  run: ['gameover'],
  gameover: ['run', 'menu'],
};

export class GameStateMachine {
  private _state: GameState = 'menu';
  constructor(private onEnter: Record<GameState, () => void>) {
    this.onEnter.menu();
  }
  get state(): GameState { return this._state; }
  transition(to: GameState): void {
    if (!VALID[this._state].includes(to)) {
      throw new Error(`Invalid transition ${this._state} -> ${to}`);
    }
    this._state = to;
    this.onEnter[to]();
  }
}
