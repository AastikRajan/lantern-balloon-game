import { describe, it, expect } from 'vitest';
import { Pool } from '../src/core/pool';

describe('Pool', () => {
  it('reuses released objects instead of creating new ones', () => {
    let created = 0;
    const pool = new Pool(() => ({ id: created++ }), (o) => o);
    const a = pool.acquire();
    pool.release(a);
    const b = pool.acquire();
    expect(b).toBe(a);
    expect(created).toBe(1);
  });
  it('runs reset on acquire of recycled object', () => {
    const pool = new Pool(() => ({ v: 0 }), (o) => { o.v = 0; return o; });
    const a = pool.acquire(); a.v = 42;
    pool.release(a);
    expect(pool.acquire().v).toBe(0);
  });
  it('tracks active objects for iteration', () => {
    const pool = new Pool(() => ({}), (o) => o);
    const a = pool.acquire(); pool.acquire();
    pool.release(a);
    expect(pool.active.size).toBe(1);
  });
});
