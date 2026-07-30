import { getOrderedTabs } from "./selectors";
import type {
  OpenTabInput,
  OverflowMode,
  PreviewTab,
  PreviewTabsState,
  ResourceKey,
  TabId,
  ViewState,
} from "./types";

export type PreviewTabsAction =
  | { type: "OPEN_TAB"; input: OpenTabInput }
  | { type: "FOCUS_TAB"; tabId: TabId }
  | { type: "DUPLICATE_TAB"; tabId: TabId }
  | { type: "CLOSE_TAB"; tabId: TabId }
  | { type: "CLOSE_ALL_UNPINNED" }
  | { type: "PIN_TAB"; tabId: TabId }
  | { type: "UNPIN_TAB"; tabId: TabId }
  | { type: "MARK_RESOURCE_REMOVED"; resourceKey: ResourceKey; message?: string }
  | { type: "UPDATE_VIEW_STATE"; tabId: TabId; partial: Partial<ViewState> }
  | { type: "SET_OVERFLOW_MODE"; mode: OverflowMode };

export type PreviewTabsReducerDeps = {
  makeTabId?: () => TabId;
};

function moveToFront(mruTabIds: TabId[], tabId: TabId): TabId[] {
  return [tabId, ...mruTabIds.filter((id) => id !== tabId)];
}

function withoutId(mruTabIds: TabId[], tabId: TabId): TabId[] {
  return mruTabIds.filter((id) => id !== tabId);
}

export function previewTabsReducer(
  state: PreviewTabsState,
  action: PreviewTabsAction,
  deps: PreviewTabsReducerDeps = {},
): PreviewTabsState {
  const makeTabId = deps.makeTabId ?? (() => crypto.randomUUID());

  switch (action.type) {
    case "OPEN_TAB": {
      const { input } = action;
      const matches = state.tabs.filter(
        (tab) => tab.resourceKey === input.resourceKey && tab.lifecycle !== "removed",
      );

      if (matches.length > 0) {
        const matchIds = new Set(matches.map((tab) => tab.tabId));
        const mruMatchId =
          state.mruTabIds.find((id) => matchIds.has(id)) ?? matches[0].tabId;

        return {
          ...state,
          tabs: state.tabs.map((tab) =>
            tab.tabId === mruMatchId
              ? {
                  ...tab,
                  title: input.title,
                  fileType: input.fileType,
                  viewState: input.viewState
                    ? { ...tab.viewState, ...input.viewState }
                    : tab.viewState,
                }
              : tab,
          ),
          activeTabId: mruMatchId,
          mruTabIds: moveToFront(state.mruTabIds, mruMatchId),
        };
      }

      const newTab: PreviewTab = {
        tabId: makeTabId(),
        resourceKey: input.resourceKey,
        title: input.title,
        fileType: input.fileType,
        pinned: false,
        lifecycle: "ready",
        viewState: { ...(input.viewState ?? {}) },
      };

      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.tabId,
        mruTabIds: moveToFront(state.mruTabIds, newTab.tabId),
      };
    }

    case "FOCUS_TAB": {
      const { tabId } = action;
      if (!state.tabs.some((tab) => tab.tabId === tabId)) {
        return state;
      }

      return {
        ...state,
        activeTabId: tabId,
        mruTabIds: moveToFront(state.mruTabIds, tabId),
      };
    }

    case "DUPLICATE_TAB": {
      const source = state.tabs.find((tab) => tab.tabId === action.tabId);
      if (!source || source.lifecycle === "removed") {
        return state;
      }

      const newTab: PreviewTab = {
        tabId: makeTabId(),
        resourceKey: source.resourceKey,
        title: source.title,
        fileType: source.fileType,
        pinned: false,
        lifecycle: "ready",
        viewState: { ...source.viewState },
      };

      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.tabId,
        mruTabIds: moveToFront(state.mruTabIds, newTab.tabId),
      };
    }

    case "CLOSE_TAB": {
      const { tabId } = action;
      const target = state.tabs.find((tab) => tab.tabId === tabId);
      if (!target || target.pinned) {
        return state;
      }

      const ordered = getOrderedTabs(state);
      const orderedIndex = ordered.findIndex((tab) => tab.tabId === tabId);
      const leftNeighbor = orderedIndex > 0 ? ordered[orderedIndex - 1] : undefined;
      const rightNeighbor = ordered[orderedIndex + 1];

      const nextTabs = state.tabs.filter((tab) => tab.tabId !== tabId);
      const nextMru = withoutId(state.mruTabIds, tabId);

      const nextActiveTabId =
        state.activeTabId === tabId
          ? (leftNeighbor ?? rightNeighbor)?.tabId ?? null
          : state.activeTabId;

      return {
        ...state,
        tabs: nextTabs,
        activeTabId: nextActiveTabId,
        mruTabIds: nextMru,
      };
    }

    case "CLOSE_ALL_UNPINNED": {
      const unpinnedIds = new Set(
        state.tabs.filter((tab) => !tab.pinned).map((tab) => tab.tabId),
      );

      const nextTabs = state.tabs.filter((tab) => tab.pinned);
      const nextMru = state.mruTabIds.filter((id) => !unpinnedIds.has(id));

      const activeWasUnpinned =
        state.activeTabId !== null && unpinnedIds.has(state.activeTabId);

      const nextActiveTabId = activeWasUnpinned
        ? (nextMru[0] ?? null)
        : state.activeTabId;

      return {
        ...state,
        tabs: nextTabs,
        activeTabId: nextActiveTabId,
        mruTabIds: nextMru,
      };
    }

    case "PIN_TAB":
    case "UNPIN_TAB": {
      const { tabId } = action;
      if (!state.tabs.some((tab) => tab.tabId === tabId)) {
        return state;
      }

      const pinned = action.type === "PIN_TAB";
      return {
        ...state,
        tabs: state.tabs.map((tab) => (tab.tabId === tabId ? { ...tab, pinned } : tab)),
        mruTabIds: moveToFront(state.mruTabIds, tabId),
      };
    }

    case "MARK_RESOURCE_REMOVED": {
      const { resourceKey, message } = action;
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.resourceKey === resourceKey && tab.lifecycle !== "removed"
            ? { ...tab, lifecycle: "removed", errorMessage: message }
            : tab,
        ),
      };
    }

    case "UPDATE_VIEW_STATE": {
      const { tabId, partial } = action;
      if (!state.tabs.some((tab) => tab.tabId === tabId)) {
        return state;
      }

      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.tabId === tabId ? { ...tab, viewState: { ...tab.viewState, ...partial } } : tab,
        ),
      };
    }

    case "SET_OVERFLOW_MODE": {
      return { ...state, overflowMode: action.mode };
    }
  }
}
