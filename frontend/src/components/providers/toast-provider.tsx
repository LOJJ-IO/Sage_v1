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
import { cn } from "@/lib/utils";

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

type ToastContextValue = {
  success: (input: ToastInput) => string;
  error: (input: ToastInput) => string;
  info: (input: ToastInput) => string;
  progress: (input: ToastInput & { progress?: number }) => string;
  update: (id: string, input: Partial<ToastInput & { progress?: number }>) => void;
  dismiss: (id: string) => void;
  registerViewport: (node: HTMLElement | null) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  return crypto.randomUUID();
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const [fallbackViewport, setFallbackViewport] = useState<HTMLElement | null>(
    null
  );
  const timersRef = useRef<Map<string, number>>(new Map());
  const pausedRef = useRef<Set<string>>(new Set());

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

  const registerViewport = useCallback((node: HTMLElement | null) => {
    setViewport(node);
  }, []);

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
      registerViewport,
    }),
    [dismiss, error, info, progress, registerViewport, success, update]
  );

  const portalTarget = viewport ?? fallbackViewport;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        ref={setFallbackViewport}
        className={cn(
          "pointer-events-none fixed top-14 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2",
          viewport ? "hidden" : null
        )}
      />
      {portalTarget
        ? createPortal(
            <div className="flex flex-col gap-2">
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
            portalTarget
          )
        : null}
    </ToastContext.Provider>
  );
}

export function ToastViewport({ className }: { className?: string }) {
  const context = useContext(ToastContext);
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      context?.registerViewport(node);
    },
    [context]
  );

  useEffect(() => {
    return () => {
      context?.registerViewport(null);
    };
  }, [context]);

  if (!context) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute top-2 left-2 z-[60] flex w-[min(24rem,100%)] flex-col gap-2",
        className
      )}
    />
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
