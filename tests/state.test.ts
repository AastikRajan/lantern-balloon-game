import { describe, it, expect } from 'vitest';
import { GameStateMachine } from '../src/core/state';

describe('GameStateMachine', () => {
  it('follows menu -> run -> gameover -> run', () => {
    const order: string[] = [];
    const sm = new GameStateMachine({
      menu: () => order.push('menu'),
      run: () => order.push('run'),
      gameover: () => order.push('gameover'),
    });
    expect(sm.state).toBe('menu');
    sm.transition('run');
    sm.transition('gameover');
    sm.transition('run');
    expect(order).toEqual(['menu', 'run', 'gameover', 'run']);
  });
  it('rejects invalid transitions', () => {
    const sm = new GameStateMachine({ menu: () => {}, run: () => {}, gameover: () => {} });
    expect(() => sm.transition('gameover')).toThrow(); // menu -> gameover invalid
  });
});
