// Stand-in for @upstash/ratelimit: same shape, but counts in memory, so tests need no Redis.
// Every window in ratelimit.ts is "1 m", so the window is fixed at 60 seconds here.
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export function resetRateLimits() {
  hits.clear();
}

type Limiter = { max: number };

export class Ratelimit {
  private max: number;
  private prefix: string;

  constructor(opts: { limiter: Limiter; prefix: string }) {
    this.max = opts.limiter.max;
    this.prefix = opts.prefix;
  }

  static slidingWindow(max: number): Limiter {
    return { max };
  }

  async limit(id: string) {
    const key = `${this.prefix}:${id}`;
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    const success = recent.length < this.max;
    if (success) recent.push(now);
    hits.set(key, recent);
    return { success, reset: (recent[0] ?? now) + WINDOW_MS };
  }
}
