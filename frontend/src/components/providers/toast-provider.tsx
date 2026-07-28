"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { ToastCard } from "@/components/ui/toast-card";
import type { ToastInput, ToastRecord } from "@/lib/toast/types";

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

/** Above dialog backdrop/popup (`z-50`) so toasts stay visible after Save. */
const TOAST_HOST_CLASS =
  "pointer-events-none fixed top-14 right-2 z-[100] flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2";

type ToastContextValue = {
  success: (input: ToastInput) => string;
  error: (input: ToastInput) => string;
  info: (input: ToastInput) => string;
  progress: (input: ToastInput & { progress?: number }) => string;
  update: (id: string, input: Partial<ToastInput & { progress?: number }>) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  return crypto.randomUUID();
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const timersRef = useRef<Map<string, number>>(new Map());
  const pausedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      pausedRef.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearTimer]
  );

  const scheduleDismiss = useCallback(
    (toast: ToastRecord) => {
      if (toast.sticky) {
        return;
      }

      clearTimer(toast.id);
      const timer = window.setTimeout(() => {
        dismiss(toast.id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(toast.id, timer);
    },
    [clearTimer, dismiss]
  );

  const addToast = useCallback(
    (record: Omit<ToastRecord, "id">) => {
      const id = createToastId();
      const next: ToastRecord = { ...record, id };

      setToasts((current) => {
        const merged = [next, ...current];
        const overflow = merged.slice(MAX_TOASTS);
        for (const toast of overflow) {
          clearTimer(toast.id);
        }
        return merged.slice(0, MAX_TOASTS);
      });

      scheduleDismiss(next);
      return id;
    },
    [clearTimer, scheduleDismiss]
  );

  const update = useCallback(
    (id: string, input: Partial<ToastInput & { progress?: number }>) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id
            ? {
                ...toast,
                title: input.title ?? toast.title,
                description:
                  input.description !== undefined
                    ? input.description
                    : toast.description,
                progress:
                  input.progress !== undefined ? input.progress : toast.progress,
              }
            : toast
        )
      );
    },
    []
  );

  const success = useCallback(
    (input: ToastInput) =>
      addToast({
        variant: "success",
        sticky: false,
        title: input.title,
        description: input.description,
      }),
    [addToast]
  );

  const error = useCallback(
    (input: ToastInput) =>
      addToast({
        variant: "error",
        sticky: true,
        title: input.title,
        description: input.description,
      }),
    [addToast]
  );

  const info = useCallback(
    (input: ToastInput) =>
      addToast({
        variant: "info",
        sticky: false,
        title: input.title,
        description: input.description,
      }),
    [addToast]
  );

  const progress = useCallback(
    (input: ToastInput & { progress?: number }) =>
      addToast({
        variant: "progress",
        sticky: true,
        title: input.title,
        description: input.description,
        progress: input.progress ?? 0,
      }),
    [addToast]
  );

  const pause = useCallback(
    (id: string) => {
      pausedRef.current.add(id);
      clearTimer(id);
    },
    [clearTimer]
  );

  const resume = useCallback(
    (id: string) => {
      if (!pausedRef.current.has(id)) {
        return;
      }

      pausedRef.current.delete(id);
      setToasts((current) => {
        const toast = current.find((entry) => entry.id === id);
        if (toast && !toast.sticky) {
          clearTimer(toast.id);
          const timer = window.setTimeout(() => {
            dismiss(toast.id);
          }, AUTO_DISMISS_MS);
          timersRef.current.set(toast.id, timer);
        }
        return current;
      });
    },
    [clearTimer, dismiss]
  );

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        window.clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      success,
      error,
      info,
      progress,
      update,
      dismiss,
    }),
    [dismiss, error, info, progress, success, update]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div className={TOAST_HOST_CLASS} data-slot="toast-viewport">
              {toasts.map((toast) => (
                <ToastCard
                  key={toast.id}
                  onDismiss={dismiss}
                  onPause={pause}
                  onResume={resume}
                  toast={toast}
                />
              ))}
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}

/** @deprecated Host is now fixed on `document.body` via ToastProvider. Kept as a no-op for call sites. */
export function ToastViewport(_props: { className?: string }) {
  return null;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
