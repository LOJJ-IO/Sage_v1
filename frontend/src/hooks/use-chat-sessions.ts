"use client";

import { useCallback, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { askSage, isBackendConfigured } from "@/lib/ask/api";
import { deriveChatTitle } from "@/lib/chat/title";
import type { ChatMessage, ChatSession } from "@/lib/chat/types";

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createSession(): ChatSession {
  return {
    id: createId(),
    title: "New chat",
    titleIsCustom: false,
    messages: [],
  };
}

/** Local-only reply when NEXT_PUBLIC_API_URL isn't set (standalone UI demo). */
function buildLocalAssistantReply(question: string): string {
  const trimmed = question.trim();
  return (
    `I received your question (“${trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed}”), ` +
    "but no backend is configured (NEXT_PUBLIC_API_URL is unset) — so I can’t look up your uploaded docs."
  );
}

export function useChatSessions() {
  const [initialSession] = useState(() => createSession());
  const [sessions, setSessions] = useState<ChatSession[]>([initialSession]);
  const [activeSessionId, setActiveSessionId] = useState(initialSession.id);

  const newChat = useCallback(() => {
    const session = createSession();
    setSessions((current) => [...current, session]);
    setActiveSessionId(session.id);
  }, []);

  const closeChat = useCallback(
    (id: string) => {
      const next = sessions.filter((session) => session.id !== id);
      const nextSessions = next.length > 0 ? next : [createSession()];
      setSessions(nextSessions);

      if (activeSessionId === id) {
        setActiveSessionId(nextSessions[nextSessions.length - 1].id);
      }
    },
    [sessions, activeSessionId]
  );

  const switchChat = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const renameChat = useCallback((id: string, title: string) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === id ? { ...session, title, titleIsCustom: true } : session
      )
    );
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      const sessionId = activeSessionId;
      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content,
      };

      setSessions((current) =>
        current.map((session) => {
          if (session.id !== sessionId) {
            return session;
          }
          const isFirstMessage = session.messages.length === 0;
          return {
            ...session,
            title:
              !session.titleIsCustom && isFirstMessage
                ? deriveChatTitle(content)
                : session.title,
            messages: [...session.messages, userMessage],
          };
        })
      );

      const appendAssistantMessage = (message: ChatMessage) => {
        setSessions((current) =>
          current.map((session) =>
            session.id === sessionId
              ? { ...session, messages: [...session.messages, message] }
              : session
          )
        );
      };

      if (!isBackendConfigured()) {
        appendAssistantMessage({
          id: createId(),
          role: "assistant",
          content: buildLocalAssistantReply(content),
        });
        return;
      }

      void askSage(content)
        .then((result) => {
          appendAssistantMessage({
            id: createId(),
            role: "assistant",
            content: result.answer,
            citations: result.limited ? undefined : result.citations,
          });
        })
        .catch((err) => {
          const message =
            err instanceof ApiError
              ? err.message
              : "Something went wrong reaching Sage. Try again.";
          appendAssistantMessage({
            id: createId(),
            role: "assistant",
            content: message,
          });
        });
    },
    [activeSessionId]
  );

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0];

  return {
    sessions,
    activeSession,
    newChat,
    closeChat,
    switchChat,
    renameChat,
    sendMessage,
  };
}
