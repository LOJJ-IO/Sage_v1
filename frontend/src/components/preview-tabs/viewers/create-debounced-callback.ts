/** Schedule calls so only the latest value is delivered after `delayMs` idle. */
export function createDebouncedCallback<T>(
  fn: (value: T) => void,
  delayMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | undefined;
  let hasPending = false;

  return {
    schedule(value: T) {
      pending = value;
      hasPending = true;
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        if (!hasPending) {
          return;
        }
        hasPending = false;
        const next = pending as T;
        pending = undefined;
        fn(next);
      }, delayMs);
    },
    flush() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (!hasPending) {
        return;
      }
      hasPending = false;
      const next = pending as T;
      pending = undefined;
      fn(next);
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      hasPending = false;
      pending = undefined;
    },
  };
}

export type DebouncedCallback<T> = ReturnType<typeof createDebouncedCallback<T>>;
