import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDebouncedCallback } from "./create-debounced-callback";

describe("createDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delivers the last scheduled value after delayMs", () => {
    const fn = vi.fn();
    const debounced = createDebouncedCallback(fn, 200);

    debounced.schedule({ a: 1 });
    debounced.schedule({ a: 2 });
    debounced.schedule({ a: 3 });

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ a: 3 });
  });

  it("flush delivers the pending value immediately", () => {
    const fn = vi.fn();
    const debounced = createDebouncedCallback(fn, 200);

    debounced.schedule({ page: 2 });
    debounced.flush();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ page: 2 });

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("cancel drops the pending value", () => {
    const fn = vi.fn();
    const debounced = createDebouncedCallback(fn, 200);

    debounced.schedule({ zoom: 1.5 });
    debounced.cancel();
    vi.advanceTimersByTime(200);

    expect(fn).not.toHaveBeenCalled();
  });

  it("flush is a no-op when nothing is pending", () => {
    const fn = vi.fn();
    const debounced = createDebouncedCallback(fn, 200);
    debounced.flush();
    expect(fn).not.toHaveBeenCalled();
  });
});
