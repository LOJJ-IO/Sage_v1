import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadOverflowMode, saveOverflowMode } from "./storage";

const STORAGE_KEY = "sage_preview_tab_overflow_mode";

class FakeLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe("storage (localStorage guarded)", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // @ts-expect-error -- test-only global shim
    globalThis.window = { localStorage: new FakeLocalStorage() };
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("loads a valid stored mode", () => {
    window.localStorage.setItem(STORAGE_KEY, "pagination");
    expect(loadOverflowMode()).toBe("pagination");
  });

  it("ignores an invalid stored value and falls back to the default", () => {
    window.localStorage.setItem(STORAGE_KEY, "garbage");
    expect(loadOverflowMode()).toBe("scroll");
  });

  it("falls back to the default when storage is empty", () => {
    expect(loadOverflowMode()).toBe("scroll");
  });

  it("saves and round-trips correctly", () => {
    saveOverflowMode("pagination");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("pagination");
    expect(loadOverflowMode()).toBe("pagination");
  });

  it("does not throw when localStorage.getItem throws (private mode / disabled storage)", () => {
    window.localStorage.getItem = () => {
      throw new Error("blocked");
    };
    expect(loadOverflowMode()).toBe("scroll");
  });

  it("does not throw when localStorage.setItem throws (quota exceeded)", () => {
    window.localStorage.setItem = () => {
      throw new Error("quota exceeded");
    };
    expect(() => saveOverflowMode("pagination")).not.toThrow();
  });
});

describe("storage (no window / SSR)", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // @ts-expect-error -- simulate SSR: no window global
    delete globalThis.window;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("loadOverflowMode returns the default without touching window", () => {
    expect(loadOverflowMode()).toBe("scroll");
  });

  it("saveOverflowMode is a safe no-op", () => {
    expect(() => saveOverflowMode("pagination")).not.toThrow();
  });
});
