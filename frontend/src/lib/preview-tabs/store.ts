import { create } from "zustand";

import { previewTabsReducer } from "./reducer";
import { loadOverflowMode, saveOverflowMode } from "./storage";
import type {
  OpenTabInput,
  OverflowMode,
  PreviewTabsState,
  ResourceKey,
  TabId,
  ViewState,
} from "./types";

export type PreviewTabsStore = PreviewTabsState & {
  openTab: (input: OpenTabInput) => void;
  focusTab: (tabId: TabId) => void;
  duplicateTab: (tabId: TabId) => void;
  closeTab: (tabId: TabId) => void;
  closeAllUnpinned: () => void;
  pinTab: (tabId: TabId) => void;
  unpinTab: (tabId: TabId) => void;
  markResourceRemoved: (resourceKey: ResourceKey, message?: string) => void;
  updateViewState: (tabId: TabId, partial: Partial<ViewState>) => void;
  setOverflowMode: (mode: OverflowMode) => void;
};

export const usePreviewTabsStore = create<PreviewTabsStore>((set) => ({
  tabs: [],
  activeTabId: null,
  mruTabIds: [],
  overflowMode: loadOverflowMode(),

  openTab: (input) => set((state) => previewTabsReducer(state, { type: "OPEN_TAB", input })),
  focusTab: (tabId) => set((state) => previewTabsReducer(state, { type: "FOCUS_TAB", tabId })),
  duplicateTab: (tabId) =>
    set((state) => previewTabsReducer(state, { type: "DUPLICATE_TAB", tabId })),
  closeTab: (tabId) => set((state) => previewTabsReducer(state, { type: "CLOSE_TAB", tabId })),
  closeAllUnpinned: () =>
    set((state) => previewTabsReducer(state, { type: "CLOSE_ALL_UNPINNED" })),
  pinTab: (tabId) => set((state) => previewTabsReducer(state, { type: "PIN_TAB", tabId })),
  unpinTab: (tabId) => set((state) => previewTabsReducer(state, { type: "UNPIN_TAB", tabId })),
  markResourceRemoved: (resourceKey, message) =>
    set((state) =>
      previewTabsReducer(state, { type: "MARK_RESOURCE_REMOVED", resourceKey, message }),
    ),
  updateViewState: (tabId, partial) =>
    set((state) => previewTabsReducer(state, { type: "UPDATE_VIEW_STATE", tabId, partial })),
  setOverflowMode: (mode) => {
    saveOverflowMode(mode);
    set((state) => previewTabsReducer(state, { type: "SET_OVERFLOW_MODE", mode }));
  },
}));
