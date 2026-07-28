import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock calls are hoisted above imports/consts by vitest, so any shared
// mock fns referenced inside the factory must go through vi.hoisted().
const { saveOverflowMode, loadOverflowMode } = vi.hoisted(() => ({
  saveOverflowMode: vi.fn(),
  loadOverflowMode: vi.fn(() => "scroll" as const),
}));

vi.mock("./storage", () => ({
  saveOverflowMode,
  loadOverflowMode,
}));

import { usePreviewTabsStore } from "./store";

function resetStore() {
  usePreviewTabsStore.setState({
    tabs: [],
    activeTabId: null,
    mruTabIds: [],
    overflowMode: "scroll",
  });
}

describe("usePreviewTabsStore", () => {
  beforeEach(() => {
    resetStore();
    saveOverflowMode.mockClear();
  });

  it("openTab delegates to the reducer and updates state", () => {
    usePreviewTabsStore.getState().openTab({ resourceKey: "file-1", title: "a.pdf", fileType: "pdf" });

    const state = usePreviewTabsStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe(state.tabs[0].tabId);
  });

  it("focusTab / closeTab delegate correctly", () => {
    const { openTab } = usePreviewTabsStore.getState();
    openTab({ resourceKey: "file-1", title: "a.pdf", fileType: "pdf" });
    openTab({ resourceKey: "file-2", title: "b.pdf", fileType: "pdf" });

    const firstTabId = usePreviewTabsStore.getState().tabs[0].tabId;
    usePreviewTabsStore.getState().focusTab(firstTabId);
    expect(usePreviewTabsStore.getState().activeTabId).toBe(firstTabId);

    usePreviewTabsStore.getState().closeTab(firstTabId);
    expect(usePreviewTabsStore.getState().tabs.some((t) => t.tabId === firstTabId)).toBe(false);
  });

  it("pinTab / unpinTab promote MRU", () => {
    usePreviewTabsStore.getState().openTab({ resourceKey: "file-1", title: "a.pdf", fileType: "pdf" });
    usePreviewTabsStore.getState().openTab({ resourceKey: "file-2", title: "b.pdf", fileType: "pdf" });

    const [tabB, tabA] = usePreviewTabsStore.getState().tabs.slice().reverse();
    usePreviewTabsStore.getState().pinTab(tabA.tabId);

    expect(usePreviewTabsStore.getState().mruTabIds[0]).toBe(tabA.tabId);

    usePreviewTabsStore.getState().unpinTab(tabA.tabId);
    expect(usePreviewTabsStore.getState().mruTabIds[0]).toBe(tabA.tabId);
    void tabB;
  });

  it("closeAllUnpinned preserves an active pinned tab", () => {
    usePreviewTabsStore.getState().openTab({ resourceKey: "file-1", title: "a.pdf", fileType: "pdf" });
    const pinnedId = usePreviewTabsStore.getState().tabs[0].tabId;
    usePreviewTabsStore.getState().pinTab(pinnedId);
    usePreviewTabsStore.getState().focusTab(pinnedId);

    usePreviewTabsStore.getState().openTab({ resourceKey: "file-2", title: "b.pdf", fileType: "pdf" });
    usePreviewTabsStore.getState().closeAllUnpinned();

    const state = usePreviewTabsStore.getState();
    expect(state.tabs.map((t) => t.tabId)).toEqual([pinnedId]);
    expect(state.activeTabId).toBe(pinnedId);
  });

  it("setOverflowMode calls saveOverflowMode and updates state", () => {
    usePreviewTabsStore.getState().setOverflowMode("pagination");

    expect(saveOverflowMode).toHaveBeenCalledWith("pagination");
    expect(usePreviewTabsStore.getState().overflowMode).toBe("pagination");
  });
});
