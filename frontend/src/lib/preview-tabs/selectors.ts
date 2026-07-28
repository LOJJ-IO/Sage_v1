import type { PreviewTab, PreviewTabsState, ResourceKey, TabId } from "./types";

export function getActiveTab(state: PreviewTabsState): PreviewTab | null {
  if (state.activeTabId === null) return null;
  return findTabById(state, state.activeTabId) ?? null;
}

export function findTabById(state: PreviewTabsState, tabId: TabId): PreviewTab | undefined {
  return state.tabs.find((tab) => tab.tabId === tabId);
}

export function findMatchingTabsByResource(
  state: PreviewTabsState,
  resourceKey: ResourceKey,
): PreviewTab[] {
  return state.tabs.filter((tab) => tab.resourceKey === resourceKey);
}

export function findMruMatchingTab(
  state: PreviewTabsState,
  resourceKey: ResourceKey,
): PreviewTab | undefined {
  for (const tabId of state.mruTabIds) {
    const tab = findTabById(state, tabId);
    if (tab && tab.resourceKey === resourceKey && tab.lifecycle !== "removed") {
      return tab;
    }
  }
  return undefined;
}

export function getPinnedTabs(state: PreviewTabsState): PreviewTab[] {
  return state.tabs.filter((tab) => tab.pinned);
}

export function getUnpinnedTabs(state: PreviewTabsState): PreviewTab[] {
  return state.tabs.filter((tab) => !tab.pinned);
}

export function getOrderedTabs(state: PreviewTabsState): PreviewTab[] {
  return [...getPinnedTabs(state), ...getUnpinnedTabs(state)];
}

export function canCloseTab(tab: PreviewTab): boolean {
  return !tab.pinned;
}

export function canDuplicateTab(tab: PreviewTab): boolean {
  return tab.lifecycle !== "removed";
}

export function canUnpinTab(tab: PreviewTab): boolean {
  return tab.pinned;
}

export function isRemovedTab(tab: PreviewTab): boolean {
  return tab.lifecycle === "removed";
}

/** Resource keys with a non-removed tab open whose resource is absent from `presentResourceKeys`. */
export function getResourceKeysToMarkRemoved(
  tabs: PreviewTab[],
  presentResourceKeys: ReadonlySet<ResourceKey>,
): ResourceKey[] {
  const keys = new Set<ResourceKey>();
  for (const tab of tabs) {
    if (tab.lifecycle !== "removed" && !presentResourceKeys.has(tab.resourceKey)) {
      keys.add(tab.resourceKey);
    }
  }
  return [...keys];
}
