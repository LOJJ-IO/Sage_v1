import { apiFetch, getApiBaseUrl } from "@/lib/api/client";

export type ChatConfigGoal = "default" | "learning" | "custom";
export type ChatConfigResponseLength = "default" | "shorter";

export type ChatConfigSettings = {
  goal: ChatConfigGoal;
  responseLength: ChatConfigResponseLength;
  customInstructions: string;
};

type ChatSettingsRecord = {
  goal: string;
  response_length: string;
  custom_instructions: string;
};

function fromRecord(record: ChatSettingsRecord): ChatConfigSettings {
  return {
    goal: record.goal as ChatConfigGoal,
    responseLength: record.response_length as ChatConfigResponseLength,
    customInstructions: record.custom_instructions,
  };
}

export function isBackendConfigured() {
  return Boolean(getApiBaseUrl());
}

export async function fetchChatSettings(): Promise<ChatConfigSettings> {
  const record = await apiFetch<ChatSettingsRecord>("/chat-settings");
  return fromRecord(record);
}

export async function saveChatSettings(
  settings: ChatConfigSettings
): Promise<ChatConfigSettings> {
  const record = await apiFetch<ChatSettingsRecord>("/chat-settings", {
    method: "PUT",
    body: JSON.stringify({
      goal: settings.goal,
      response_length: settings.responseLength,
      custom_instructions: settings.customInstructions,
    }),
  });
  return fromRecord(record);
}
