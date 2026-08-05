import type { ChatSession } from "./types";

const STORAGE_KEY = "sage_chat_sessions";

type PersistedChatState = {
  sessions: ChatSession[];
  activeSessionId: string;
};

function isPersistedChatState(value: unknown): value is PersistedChatState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PersistedChatState>;
  return (
    Array.isArray(candidate.sessions) &&
    typeof candidate.activeSessionId === "string"
  );
}

export function loadPersistedChatState(): PersistedChatState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return isPersistedChatState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveChatState(state: PersistedChatState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota exceeded — persistence is best-effort only.
  }
}

/** Wipes chat history from this device — call on sign-out (shared retail tablets, per FEAT-sign-in). */
export function clearPersistedChatState(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
