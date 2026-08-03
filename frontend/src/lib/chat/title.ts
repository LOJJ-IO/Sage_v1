const MAX_TITLE_LENGTH = 48;

/** Client-side heuristic — no LLM call. Cleans up the first question into a short tab title. */
export function deriveChatTitle(question: string): string {
  const cleaned = question.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return "New chat";
  }

  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (capitalized.length <= MAX_TITLE_LENGTH) {
    return capitalized;
  }

  return `${capitalized.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
}
