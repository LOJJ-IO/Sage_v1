import { apiFetch, getApiBaseUrl } from "@/lib/api/client";

export type AskCitation = {
  id: string;
  file_id: string;
  filename: string;
  chunk_index: number;
  char_start: number;
  char_end: number;
};

export type AskResponse = {
  answer: string;
  citations: AskCitation[];
  refused: boolean;
  reason: string | null;
  limited: boolean;
};

export function isBackendConfigured() {
  return Boolean(getApiBaseUrl());
}

export async function askSage(question: string): Promise<AskResponse> {
  return apiFetch<AskResponse>("/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
