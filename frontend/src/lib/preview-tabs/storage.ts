import type { OverflowMode } from "./types";

const STORAGE_KEY = "sage_preview_tab_overflow_mode";
const DEFAULT_OVERFLOW_MODE: OverflowMode = "scroll";

function isOverflowMode(value: unknown): value is OverflowMode {
  return value === "pagination" || value === "scroll";
}

export function loadOverflowMode(): OverflowMode {
  if (typeof window === "undefined") {
    return DEFAULT_OVERFLOW_MODE;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isOverflowMode(stored) ? stored : DEFAULT_OVERFLOW_MODE;
  } catch {
    return DEFAULT_OVERFLOW_MODE;
  }
}

export function saveOverflowMode(mode: OverflowMode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private mode / quota exceeded — persistence is best-effort only.
  }
}
