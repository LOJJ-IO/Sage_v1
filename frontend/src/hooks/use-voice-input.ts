"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Minimal Web Speech API surface — not in TypeScript's DOM lib. */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Browser dictation for the Ask composer. `onTranscript` gets the full text
 * heard so far in this session; `onUnavailable` explains why it can't start.
 */
export function useVoiceInput({
  onTranscript,
  onUnavailable,
}: {
  onTranscript: (text: string) => void;
  onUnavailable: (reason: string) => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const toggle = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      onUnavailable("Voice input isn't supported in this browser. Try Chrome or Safari.");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join("");
      onTranscript(text);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        onUnavailable("Microphone access is blocked. Allow it in your browser to use voice input.");
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [onTranscript, onUnavailable]);

  return { listening, toggle };
}
