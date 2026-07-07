import { describe, it, expect } from 'vitest';
import { GameStateMachine } from '../src/core/state';

function handlers(order: string[]) {
  return {
    menu: () => order.push('menu'),
    run: () => order.push('run'),
    pause: () => order.push('pause'),
    gameover: () => order.push('gameover'),
    won: () => order.push('won'),
  };
}

describe('GameStateMachine', () => {
  it('follows menu -> run -> gameover -> run', () => {
    const order: string[] = [];
    const sm = new GameStateMachine(handlers(order));
    expect(sm.state).toBe('menu');
    sm.transition('run');
    sm.transition('gameover');
    sm.transition('run');
    expect(order).toEqual(['menu', 'run', 'gameover', 'run']);
  });
  it('supports pause -> resume and pause -> menu', () => {
    const order: string[] = [];
    const sm = new GameStateMachine(handlers(order));
    sm.transition('run');
    sm.transition('pause');
    sm.transition('run');       // resume
    sm.transition('pause');
    sm.transition('menu');      // quit to menu
    expect(order).toEqual(['menu', 'run', 'pause', 'run', 'pause', 'menu']);
    expect(sm.state).toBe('menu');
  });
  it('supports winning a run and retrying', () => {
    const order: string[] = [];
    const sm = new GameStateMachine(handlers(order));
    sm.transition('run');
    sm.transition('won');
    sm.transition('run');
    expect(order).toEqual(['menu', 'run', 'won', 'run']);
  });
  it('rejects invalid transitions', () => {
    const sm = new GameStateMachine(handlers([]));
    expect(() => sm.transition('gameover')).toThrow(); // menu -> gameover invalid
    expect(() => sm.transition('pause')).toThrow();    // menu -> pause invalid
  });
});
