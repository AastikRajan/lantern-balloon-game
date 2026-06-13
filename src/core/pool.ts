export class Pool<T extends object> {
  private free: T[] = [];
  readonly active = new Set<T>();

  constructor(private create: () => T, private reset: (obj: T) => T) {}

  acquire(): T {
    const obj = this.free.pop() ?? this.create();
    const ready = this.reset(obj);
    this.active.add(ready);
    return ready;
  }

  release(obj: T): void {
    if (this.active.delete(obj)) this.free.push(obj);
  }

  releaseAll(): void {
    this.active.forEach((o) => this.free.push(o));
    this.active.clear();
  }
}
