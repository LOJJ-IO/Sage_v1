import { apiFetch, getApiBaseUrl } from "@/lib/api/client";

export type AskResponse = {
  answer: string;
  citations: string[];
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
