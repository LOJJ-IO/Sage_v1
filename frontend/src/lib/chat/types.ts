import type { AskCitation } from "@/lib/ask/api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: AskCitation[];
};

export type ChatSession = {
  id: string;
  title: string;
  /** True once the user has manually renamed the tab — blocks auto-titling from overwriting it. */
  titleIsCustom: boolean;
  messages: ChatMessage[];
};
