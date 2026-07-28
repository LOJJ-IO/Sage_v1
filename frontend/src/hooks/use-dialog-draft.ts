"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

export function useDialogDraft<T>(initial: T) {
  const [draft, setDraftState] = useState(initial);
  const committedRef = useRef(initial);
  const [isSaving, setIsSaving] = useState(false);

  const setDraft: Dispatch<SetStateAction<T>> = setDraftState;

  const resetDraft = useCallback(() => {
    setDraftState(committedRef.current);
  }, []);

  const commitDraft = useCallback((next: T) => {
    committedRef.current = next;
    setDraftState(next);
  }, []);

  const syncOnOpen = useCallback((open: boolean) => {
    if (open) {
      setDraftState(committedRef.current);
    }
  }, []);

  const isDirty =
    JSON.stringify(draft) !== JSON.stringify(committedRef.current);

  const save = useCallback(
    async (onSave: (value: T) => void | Promise<void>) => {
      setIsSaving(true);
      try {
        await onSave(draft);
        committedRef.current = draft;
        return true;
      } finally {
        setIsSaving(false);
      }
    },
    [draft]
  );

  return {
    draft,
    setDraft,
    resetDraft,
    commitDraft,
    syncOnOpen,
    isDirty,
    isSaving,
    save,
  };
}

export function useDialogOpenSync(
  open: boolean,
  syncOnOpen: (open: boolean) => void
) {
  useEffect(() => {
    syncOnOpen(open);
  }, [open, syncOnOpen]);
}
