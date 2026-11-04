// Goal 15: knows when an API request has been running for more than 3 seconds.
// Render's free tier puts the API to sleep after 15 idle minutes, and the first
// request after that can take up to a minute while it boots.

export const SLOW_AFTER_MS = 3000;

let slowRequests = 0; // requests still running after SLOW_AFTER_MS
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

// Wraps a request: if it is still running after 3 s it counts as slow until it finishes
export function trackRequest<T>(promise: Promise<T>): Promise<T> {
  let slow = false;
  const timer = setTimeout(() => {
    slow = true;
    slowRequests++;
    notify();
  }, SLOW_AFTER_MS);

  return promise.finally(() => {
    clearTimeout(timer);
    if (slow) {
      slowRequests--;
      notify();
    }
  });
}

// For React's useSyncExternalStore
export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isServerSlow() {
  return slowRequests > 0;
}
