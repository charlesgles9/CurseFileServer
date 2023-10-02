class Queue<T> {
  private data: T[];
  private pool: number;
  constructor(pool: number);
  constructor(pool: number, values?: T[]);
  constructor(pool: number = Number.MAX_SAFE_INTEGER, values?: T[]) {
    this.data = [];
    this.pool = pool;
    if (values) this.data.push(...values);
  }

  private set(items: T[]) {
    this.data = items;
  }

  public enqueue(item: T) {
    if (this.pool > this.size()) this.data.push(item);
  }

  public dequeue(): T | undefined {
    return this.data.shift();
  }

  public remove(item: T): boolean {
    const index = this.data.indexOf(item) + 1;
    this.set(this.data.splice(index));
    return index != -1;
  }

  public get(index: number): T | undefined {
    return this.data[index];
  }
  public isEmpty(): boolean {
    return this.data.length == 0;
  }

  public size(): number {
    return this.data.length;
  }

  public peek(): T | undefined {
    return this.data[0];
  }

  public clear() {
    return this.data.splice(0, this.data.length);
  }
}

interface QueueEventArgs {
  finish: [arg: string];
  failure: [argA: string, ArgB: string];
  progress: [arg: number];
  killed: [arg: string];
}

interface QueueEventInterface {
  addEventListener<K extends keyof QueueEventArgs>(
    e: K,
    cb: (...args: QueueEventArgs[K]) => void
  ): void;
  emit<K extends keyof QueueEventArgs>(e: K, ...args: QueueEventArgs[K]): void;
}

function QueueEvent(): QueueEventInterface {
  const listenerMap: {
    [K in keyof QueueEventArgs]?: ((...args: QueueEventArgs[K]) => void)[];
  } = {};
  const ret: QueueEventInterface = {
    addEventListener<K extends keyof QueueEventArgs>(
      e: K,
      cb: (...args: QueueEventArgs[K]) => void
    ) {
      const listeners: ((...args: QueueEventArgs[K]) => void)[] = (listenerMap[
        e
      ] ??= []);
      listeners.push(cb);
    },
    emit<K extends keyof QueueEventArgs>(e: K, ...a: QueueEventArgs[K]) {
      const listeners: ((...args: QueueEventArgs[K]) => void)[] =
        listenerMap[e] ?? [];
      listeners.forEach((cb) => cb(...a));
    },
  };
  return ret;
}

export { Queue, QueueEvent, QueueEventArgs, QueueEventInterface };
