import { describe, expect, it } from "vitest";

import {
  canCloseTab,
  canDuplicateTab,
  canUnpinTab,
  findMatchingTabsByResource,
  findMruMatchingTab,
  findTabById,
  getActiveTab,
  getOrderedTabs,
  getPinnedTabs,
  getResourceKeysToMarkRemoved,
  getUnpinnedTabs,
  isRemovedTab,
} from "./selectors";
import type { PreviewTab, PreviewTabsState } from "./types";

function makeTab(overrides: Partial<PreviewTab> = {}): PreviewTab {
  return {
    tabId: overrides.tabId ?? "tab-1",
    resourceKey: overrides.resourceKey ?? "file-1",
    title: overrides.title ?? "File 1.pdf",
    fileType: overrides.fileType ?? "pdf",
    pinned: overrides.pinned ?? false,
    lifecycle: overrides.lifecycle ?? "ready",
    errorMessage: overrides.errorMessage,
    viewState: overrides.viewState ?? {},
  };
}

const fixtureState: PreviewTabsState = {
  tabs: [
    makeTab({ tabId: "pinned-1", resourceKey: "file-p", pinned: true }),
    makeTab({ tabId: "unpinned-1", resourceKey: "file-a" }),
    makeTab({ tabId: "unpinned-2", resourceKey: "file-a" }),
    makeTab({ tabId: "removed-1", resourceKey: "file-a", lifecycle: "removed" }),
  ],
  activeTabId: "unpinned-1",
  overflowMode: "scroll",
  mruTabIds: ["unpinned-2", "unpinned-1", "removed-1", "pinned-1"],
};

describe("getActiveTab", () => {
  it("returns the active tab", () => {
    expect(getActiveTab(fixtureState)?.tabId).toBe("unpinned-1");
  });

  it("returns null when activeTabId is null", () => {
    expect(getActiveTab({ ...fixtureState, activeTabId: null })).toBeNull();
  });
});

describe("findTabById", () => {
  it("finds an existing tab", () => {
    expect(findTabById(fixtureState, "pinned-1")?.tabId).toBe("pinned-1");
  });

  it("returns undefined for a missing tab", () => {
    expect(findTabById(fixtureState, "ghost")).toBeUndefined();
  });
});

describe("findMatchingTabsByResource", () => {
  it("returns all tabs sharing a resourceKey regardless of lifecycle", () => {
    const matches = findMatchingTabsByResource(fixtureState, "file-a");
    expect(matches.map((t) => t.tabId).sort()).toEqual(["removed-1", "unpinned-1", "unpinned-2"]);
  });
});

describe("getResourceKeysToMarkRemoved", () => {
  it("returns resource keys with a non-removed tab that are absent from the present set", () => {
    const keys = getResourceKeysToMarkRemoved(fixtureState.tabs, new Set(["file-p"]));
    expect(keys).toEqual(["file-a"]);
  });

  it("dedupes across multiple tabs sharing a resourceKey", () => {
    const keys = getResourceKeysToMarkRemoved(fixtureState.tabs, new Set([]));
    expect(keys.sort()).toEqual(["file-a", "file-p"]);
  });

  it("ignores resource keys already fully removed", () => {
    const onlyRemovedTabs = [
      makeTab({ tabId: "removed-1", resourceKey: "file-a", lifecycle: "removed" }),
    ];
    expect(getResourceKeysToMarkRemoved(onlyRemovedTabs, new Set([]))).toEqual([]);
  });

  it("returns nothing when every open resource is present", () => {
    const keys = getResourceKeysToMarkRemoved(fixtureState.tabs, new Set(["file-p", "file-a"]));
    expect(keys).toEqual([]);
  });
});

describe("findMruMatchingTab", () => {
  it("returns the first non-removed MRU match", () => {
    expect(findMruMatchingTab(fixtureState, "file-a")?.tabId).toBe("unpinned-2");
  });

  it("skips removed tabs even if they appear earlier in MRU", () => {
    const state: PreviewTabsState = {
      ...fixtureState,
      mruTabIds: ["removed-1", "unpinned-2", "unpinned-1"],
    };
    expect(findMruMatchingTab(state, "file-a")?.tabId).toBe("unpinned-2");
  });

  it("returns undefined when no non-removed tab matches", () => {
    expect(findMruMatchingTab(fixtureState, "file-p" + "-none")).toBeUndefined();
  });
});

describe("getPinnedTabs / getUnpinnedTabs / getOrderedTabs", () => {
  it("partitions pinned vs unpinned", () => {
    expect(getPinnedTabs(fixtureState).map((t) => t.tabId)).toEqual(["pinned-1"]);
    expect(getUnpinnedTabs(fixtureState).map((t) => t.tabId)).toEqual([
      "unpinned-1",
      "unpinned-2",
      "removed-1",
    ]);
  });

  it("orders pinned before unpinned, preserving relative order within each group", () => {
    expect(getOrderedTabs(fixtureState).map((t) => t.tabId)).toEqual([
      "pinned-1",
      "unpinned-1",
      "unpinned-2",
      "removed-1",
    ]);
  });
});

describe("capability selectors", () => {
  it("canCloseTab is false for pinned, true otherwise", () => {
    expect(canCloseTab(makeTab({ pinned: true }))).toBe(false);
    expect(canCloseTab(makeTab({ pinned: false }))).toBe(true);
  });

  it("canDuplicateTab is false for removed tabs", () => {
    expect(canDuplicateTab(makeTab({ lifecycle: "removed" }))).toBe(false);
    expect(canDuplicateTab(makeTab({ lifecycle: "ready" }))).toBe(true);
  });

  it("canUnpinTab mirrors pinned state", () => {
    expect(canUnpinTab(makeTab({ pinned: true }))).toBe(true);
    expect(canUnpinTab(makeTab({ pinned: false }))).toBe(false);
  });

  it("isRemovedTab checks lifecycle", () => {
    expect(isRemovedTab(makeTab({ lifecycle: "removed" }))).toBe(true);
    expect(isRemovedTab(makeTab({ lifecycle: "ready" }))).toBe(false);
  });
});
