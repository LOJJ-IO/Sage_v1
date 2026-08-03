"use client";

import { useEffect, useRef, useState } from "react";

import { createDebouncedCallback } from "@/components/preview-tabs/viewers/create-debounced-callback";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";
import type { TabId, ViewState } from "@/lib/preview-tabs/types";

const DEBOUNCE_MS = 200;

/**
 * Local viewState for instant UI; debounced writes to the tab store.
 * Schedules the full local snapshot (not a single field) so rapid page+zoom
 * edits coalesce without dropping earlier keys. Flushes on unmount.
 */
export function useDebouncedViewState(tabId: TabId, initial: ViewState) {
  const updateViewState = usePreviewTabsStore((state) => state.updateViewState);
  const [viewState, setViewState] = useState<ViewState>(initial);

  const debouncedRef = useRef(
    createDebouncedCallback((snapshot: ViewState) => {
      updateViewState(tabId, snapshot);
    }, DEBOUNCE_MS),
  );

  useEffect(() => {
    const debounced = createDebouncedCallback((snapshot: ViewState) => {
      updateViewState(tabId, snapshot);
    }, DEBOUNCE_MS);
    debouncedRef.current = debounced;
    return () => {
      debounced.flush();
    };
  }, [tabId, updateViewState]);

  function patchViewState(partial: Partial<ViewState>) {
    setViewState((prev) => {
      const next = { ...prev, ...partial };
      debouncedRef.current.schedule(next);
      return next;
    });
  }

  return { viewState, patchViewState } as const;
}
