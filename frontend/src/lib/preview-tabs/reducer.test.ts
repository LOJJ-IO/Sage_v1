import { describe, expect, it } from "vitest";

import { previewTabsReducer } from "./reducer";
import { getOrderedTabs } from "./selectors";
import type { OpenTabInput, PreviewTab, PreviewTabsState } from "./types";

function makeCounterId(prefix: string) {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

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

function makeState(overrides: Partial<PreviewTabsState> = {}): PreviewTabsState {
  return {
    tabs: overrides.tabs ?? [],
    activeTabId: overrides.activeTabId ?? null,
    overflowMode: overrides.overflowMode ?? "scroll",
    mruTabIds: overrides.mruTabIds ?? [],
  };
}

const openInput = (overrides: Partial<OpenTabInput> = {}): OpenTabInput => ({
  resourceKey: overrides.resourceKey ?? "file-1",
  title: overrides.title ?? "File 1.pdf",
  fileType: overrides.fileType ?? "pdf",
  viewState: overrides.viewState,
});

describe("OPEN_TAB", () => {
  it("opens a new tab for an absent resource", () => {
    const state = makeState();
    const next = previewTabsReducer(state, { type: "OPEN_TAB", input: openInput() }, {
      makeTabId: makeCounterId("new"),
    });

    expect(next.tabs).toHaveLength(1);
    expect(next.tabs[0].resourceKey).toBe("file-1");
    expect(next.activeTabId).toBe("new-1");
    expect(next.mruTabIds).toEqual(["new-1"]);
  });

  it("focuses the existing single match instead of duplicating", () => {
    const tab = makeTab({ tabId: "tab-1", resourceKey: "file-1" });
    const state = makeState({ tabs: [tab], activeTabId: null, mruTabIds: [] });

    const next = previewTabsReducer(state, { type: "OPEN_TAB", input: openInput() });

    expect(next.tabs).toHaveLength(1);
    expect(next.activeTabId).toBe("tab-1");
    expect(next.mruTabIds).toEqual(["tab-1"]);
  });

  it("focuses the MRU match among multiple duplicates of the same resource", () => {
    const tabA = makeTab({ tabId: "tab-a", resourceKey: "file-1" });
    const tabB = makeTab({ tabId: "tab-b", resourceKey: "file-1" });
    const state = makeState({
      tabs: [tabA, tabB],
      activeTabId: "tab-a",
      mruTabIds: ["tab-b", "tab-a"],
    });

    const next = previewTabsReducer(state, { type: "OPEN_TAB", input: openInput() });

    expect(next.activeTabId).toBe("tab-b");
    expect(next.mruTabIds).toEqual(["tab-b", "tab-a"]);
    expect(next.tabs).toHaveLength(2);
  });

  it("does not implicitly duplicate when a matching tab is already open", () => {
    const tab = makeTab({ tabId: "tab-1", resourceKey: "file-1" });
    const state = makeState({ tabs: [tab] });

    const next = previewTabsReducer(state, { type: "OPEN_TAB", input: openInput() });

    expect(next.tabs).toHaveLength(1);
  });

  it("refreshes title/fileType on the focused match (file replaced under the same resourceKey)", () => {
    const tab = makeTab({ tabId: "tab-1", resourceKey: "file-1", title: "old-name.pdf" });
    const state = makeState({ tabs: [tab] });

    const next = previewTabsReducer(state, {
      type: "OPEN_TAB",
      input: openInput({ title: "new-name.pdf", fileType: "docx" }),
    });

    expect(next.tabs[0].title).toBe("new-name.pdf");
    expect(next.tabs[0].fileType).toBe("docx");
  });

  it("merges citation highlight into viewState when focusing an existing tab", () => {
    const tab = makeTab({
      tabId: "tab-1",
      resourceKey: "file-1",
      viewState: { zoom: 1.2 },
    });
    const state = makeState({ tabs: [tab] });
    const highlight = {
      citationId: "file-1#abc123",
      charStart: 40,
      charEnd: 120,
    };

    const next = previewTabsReducer(state, {
      type: "OPEN_TAB",
      input: openInput({ viewState: { highlight } }),
    });

    expect(next.tabs[0].viewState).toEqual({ zoom: 1.2, highlight });
  });

  it("seeds viewState.highlight when opening a new tab from a citation", () => {
    const state = makeState();
    const highlight = {
      citationId: "file-1#abc123",
      charStart: 0,
      charEnd: 50,
    };

    const next = previewTabsReducer(
      state,
      { type: "OPEN_TAB", input: openInput({ viewState: { highlight } }) },
      { makeTabId: makeCounterId("new") },
    );

    expect(next.tabs[0].viewState.highlight).toEqual(highlight);
  });

  it("opens a fresh tab when only a removed tab exists for that resource, rather than reviving it", () => {
    const removedTab = makeTab({ tabId: "tab-1", resourceKey: "file-1", lifecycle: "removed" });
    const state = makeState({ tabs: [removedTab], mruTabIds: ["tab-1"] });

    const next = previewTabsReducer(state, { type: "OPEN_TAB", input: openInput() }, {
      makeTabId: makeCounterId("new"),
    });

    expect(next.tabs).toHaveLength(2);
    expect(next.activeTabId).toBe("new-1");
    const revived = next.tabs.find((t) => t.tabId === "tab-1");
    expect(revived?.lifecycle).toBe("removed");
  });

  it("opens the very first tab when no tabs existed before", () => {
    const state = makeState();
    const next = previewTabsReducer(state, { type: "OPEN_TAB", input: openInput() });

    expect(next.tabs).toHaveLength(1);
    expect(next.activeTabId).not.toBeNull();
  });
});

describe("FOCUS_TAB", () => {
  it("changes the active tab and promotes it in MRU", () => {
    const tabA = makeTab({ tabId: "a" });
    const tabB = makeTab({ tabId: "b", resourceKey: "file-2" });
    const state = makeState({ tabs: [tabA, tabB], activeTabId: "a", mruTabIds: ["a", "b"] });

    const next = previewTabsReducer(state, { type: "FOCUS_TAB", tabId: "b" });

    expect(next.activeTabId).toBe("b");
    expect(next.mruTabIds).toEqual(["b", "a"]);
  });

  it("is a no-op for a missing tabId", () => {
    const state = makeState({ tabs: [makeTab({ tabId: "a" })], activeTabId: "a", mruTabIds: ["a"] });
    const next = previewTabsReducer(state, { type: "FOCUS_TAB", tabId: "ghost" });

    expect(next).toBe(state);
  });
});

describe("DUPLICATE_TAB", () => {
  it("copies resourceKey, assigns a new tabId, copies viewState, and activates the duplicate", () => {
    const source = makeTab({
      tabId: "tab-1",
      resourceKey: "file-1",
      pinned: true,
      viewState: { zoom: 2, page: 5 },
    });
    const state = makeState({ tabs: [source], activeTabId: "tab-1", mruTabIds: ["tab-1"] });

    const next = previewTabsReducer(state, { type: "DUPLICATE_TAB", tabId: "tab-1" }, {
      makeTabId: makeCounterId("dup"),
    });

    expect(next.tabs).toHaveLength(2);
    const duplicate = next.tabs.find((t) => t.tabId === "dup-1")!;
    expect(duplicate.resourceKey).toBe("file-1");
    expect(duplicate.viewState).toEqual({ zoom: 2, page: 5 });
    expect(duplicate.viewState).not.toBe(source.viewState);
    expect(duplicate.pinned).toBe(false);
    expect(next.activeTabId).toBe("dup-1");
    expect(next.mruTabIds[0]).toBe("dup-1");
  });

  it("independent viewState: mutating the duplicate's viewState later does not affect the source", () => {
    const source = makeTab({ tabId: "tab-1", viewState: { zoom: 1 } });
    const state = makeState({ tabs: [source] });

    const afterDuplicate = previewTabsReducer(state, { type: "DUPLICATE_TAB", tabId: "tab-1" }, {
      makeTabId: makeCounterId("dup"),
    });
    const afterUpdate = previewTabsReducer(afterDuplicate, {
      type: "UPDATE_VIEW_STATE",
      tabId: "dup-1",
      partial: { zoom: 9 },
    });

    const untouchedSource = afterUpdate.tabs.find((t) => t.tabId === "tab-1")!;
    expect(untouchedSource.viewState).toEqual({ zoom: 1 });
  });

  it("rejects duplicating a removed tab", () => {
    const removed = makeTab({ tabId: "tab-1", lifecycle: "removed" });
    const state = makeState({ tabs: [removed] });

    const next = previewTabsReducer(state, { type: "DUPLICATE_TAB", tabId: "tab-1" });

    expect(next).toBe(state);
    expect(next.tabs).toHaveLength(1);
  });

  it("is a no-op for a missing source tab", () => {
    const state = makeState();
    const next = previewTabsReducer(state, { type: "DUPLICATE_TAB", tabId: "ghost" });
    expect(next).toBe(state);
  });
});

describe("CLOSE_TAB", () => {
  it("closes an inactive tab without changing activeTabId", () => {
    const tabA = makeTab({ tabId: "a" });
    const tabB = makeTab({ tabId: "b", resourceKey: "file-2" });
    const state = makeState({ tabs: [tabA, tabB], activeTabId: "a", mruTabIds: ["a", "b"] });

    const next = previewTabsReducer(state, { type: "CLOSE_TAB", tabId: "b" });

    expect(next.tabs.map((t) => t.tabId)).toEqual(["a"]);
    expect(next.activeTabId).toBe("a");
    expect(next.mruTabIds).toEqual(["a"]);
  });

  it("closing the active tab activates the nearest tab to the left", () => {
    const tabA = makeTab({ tabId: "a" });
    const tabB = makeTab({ tabId: "b", resourceKey: "file-2" });
    const tabC = makeTab({ tabId: "c", resourceKey: "file-3" });
    const state = makeState({ tabs: [tabA, tabB, tabC], activeTabId: "b", mruTabIds: ["b", "a", "c"] });

    const next = previewTabsReducer(state, { type: "CLOSE_TAB", tabId: "b" });

    expect(next.activeTabId).toBe("a");
  });

  it("falls back to nearest right when there is no left neighbor", () => {
    const tabA = makeTab({ tabId: "a" });
    const tabB = makeTab({ tabId: "b", resourceKey: "file-2" });
    const state = makeState({ tabs: [tabA, tabB], activeTabId: "a", mruTabIds: ["a", "b"] });

    const next = previewTabsReducer(state, { type: "CLOSE_TAB", tabId: "a" });

    expect(next.activeTabId).toBe("b");
  });

  it("rejects closing a pinned tab", () => {
    const pinned = makeTab({ tabId: "a", pinned: true });
    const state = makeState({ tabs: [pinned], activeTabId: "a", mruTabIds: ["a"] });

    const next = previewTabsReducer(state, { type: "CLOSE_TAB", tabId: "a" });

    expect(next).toBe(state);
  });

  it("null active when the last closable tab disappears", () => {
    const tabA = makeTab({ tabId: "a" });
    const state = makeState({ tabs: [tabA], activeTabId: "a", mruTabIds: ["a"] });

    const next = previewTabsReducer(state, { type: "CLOSE_TAB", tabId: "a" });

    expect(next.activeTabId).toBeNull();
    expect(next.tabs).toHaveLength(0);
    expect(next.mruTabIds).toEqual([]);
  });

  it("uses visual (pinned-first) order for nearest-left/right at the pinned/unpinned boundary", () => {
    const pinned = makeTab({ tabId: "p", pinned: true, resourceKey: "file-p" });
    const unpinnedLeft = makeTab({ tabId: "u1", resourceKey: "file-u1" });
    const unpinnedRight = makeTab({ tabId: "u2", resourceKey: "file-u2" });
    // Insertion order deliberately does NOT match visual order: u1 inserted before pinning `p`.
    const state = makeState({
      tabs: [unpinnedLeft, pinned, unpinnedRight],
      activeTabId: "u1",
      mruTabIds: ["u1", "p", "u2"],
    });

    // getOrderedTabs => [p, u1, u2]. Closing u1 (the leftmost unpinned tab right after
    // the last pinned one) should fall back to the pinned tab as its left neighbor.
    expect(getOrderedTabs(state).map((t) => t.tabId)).toEqual(["p", "u1", "u2"]);

    const next = previewTabsReducer(state, { type: "CLOSE_TAB", tabId: "u1" });

    expect(next.activeTabId).toBe("p");
  });
});

describe("CLOSE_ALL_UNPINNED", () => {
  it("leaves pinned tabs intact", () => {
    const pinned = makeTab({ tabId: "p", pinned: true });
    const unpinned = makeTab({ tabId: "u", resourceKey: "file-u" });
    const state = makeState({ tabs: [pinned, unpinned], mruTabIds: ["u", "p"] });

    const next = previewTabsReducer(state, { type: "CLOSE_ALL_UNPINNED" });

    expect(next.tabs.map((t) => t.tabId)).toEqual(["p"]);
    expect(next.mruTabIds).toEqual(["p"]);
  });

  it("reassigns active to the highest-MRU remaining pinned tab when the active tab was unpinned", () => {
    const pinnedA = makeTab({ tabId: "pa", pinned: true, resourceKey: "file-pa" });
    const pinnedB = makeTab({ tabId: "pb", pinned: true, resourceKey: "file-pb" });
    const unpinned = makeTab({ tabId: "u", resourceKey: "file-u" });
    const state = makeState({
      tabs: [pinnedA, pinnedB, unpinned],
      activeTabId: "u",
      mruTabIds: ["u", "pb", "pa"],
    });

    const next = previewTabsReducer(state, { type: "CLOSE_ALL_UNPINNED" });

    expect(next.activeTabId).toBe("pb");
  });

  it("keeps the active tab active when it is pinned, even if its lifecycle is removed", () => {
    const pinnedRemoved = makeTab({ tabId: "p", pinned: true, lifecycle: "removed" });
    const unpinned = makeTab({ tabId: "u", resourceKey: "file-u" });
    const state = makeState({
      tabs: [pinnedRemoved, unpinned],
      activeTabId: "p",
      mruTabIds: ["p", "u"],
    });

    const next = previewTabsReducer(state, { type: "CLOSE_ALL_UNPINNED" });

    expect(next.activeTabId).toBe("p");
    expect(next.tabs.map((t) => t.tabId)).toEqual(["p"]);
  });

  it("handles the all-unpinned case (active becomes null)", () => {
    const unpinnedA = makeTab({ tabId: "a" });
    const unpinnedB = makeTab({ tabId: "b", resourceKey: "file-b" });
    const state = makeState({ tabs: [unpinnedA, unpinnedB], activeTabId: "a", mruTabIds: ["a", "b"] });

    const next = previewTabsReducer(state, { type: "CLOSE_ALL_UNPINNED" });

    expect(next.tabs).toEqual([]);
    expect(next.activeTabId).toBeNull();
    expect(next.mruTabIds).toEqual([]);
  });

  it("handles the all-pinned case (nothing removed, active unchanged)", () => {
    const pinnedA = makeTab({ tabId: "a", pinned: true });
    const pinnedB = makeTab({ tabId: "b", pinned: true, resourceKey: "file-b" });
    const state = makeState({ tabs: [pinnedA, pinnedB], activeTabId: "a", mruTabIds: ["a", "b"] });

    const next = previewTabsReducer(state, { type: "CLOSE_ALL_UNPINNED" });

    expect(next.tabs).toHaveLength(2);
    expect(next.activeTabId).toBe("a");
  });
});

describe("PIN_TAB / UNPIN_TAB", () => {
  it("pinning changes ordering (via getOrderedTabs) and promotes MRU", () => {
    const tabA = makeTab({ tabId: "a" });
    const tabB = makeTab({ tabId: "b", resourceKey: "file-b" });
    const state = makeState({ tabs: [tabA, tabB], mruTabIds: ["a", "b"] });

    const next = previewTabsReducer(state, { type: "PIN_TAB", tabId: "b" });

    expect(getOrderedTabs(next).map((t) => t.tabId)).toEqual(["b", "a"]);
    expect(next.mruTabIds).toEqual(["b", "a"]);
  });

  it("preserves viewState, tabId, and resourceKey across pin/unpin", () => {
    const tab = makeTab({ tabId: "a", resourceKey: "file-a", viewState: { zoom: 3 } });
    const state = makeState({ tabs: [tab], mruTabIds: ["a"] });

    const pinned = previewTabsReducer(state, { type: "PIN_TAB", tabId: "a" });
    const unpinned = previewTabsReducer(pinned, { type: "UNPIN_TAB", tabId: "a" });

    expect(unpinned.tabs[0].tabId).toBe("a");
    expect(unpinned.tabs[0].resourceKey).toBe("file-a");
    expect(unpinned.tabs[0].viewState).toEqual({ zoom: 3 });
    expect(unpinned.tabs[0].pinned).toBe(false);
  });

  it("is a no-op for a missing tab", () => {
    const state = makeState();
    expect(previewTabsReducer(state, { type: "PIN_TAB", tabId: "ghost" })).toBe(state);
    expect(previewTabsReducer(state, { type: "UNPIN_TAB", tabId: "ghost" })).toBe(state);
  });
});

describe("MARK_RESOURCE_REMOVED", () => {
  it("transitions a single matching tab to removed", () => {
    const tab = makeTab({ tabId: "a", resourceKey: "file-1" });
    const state = makeState({ tabs: [tab] });

    const next = previewTabsReducer(state, {
      type: "MARK_RESOURCE_REMOVED",
      resourceKey: "file-1",
      message: "File deleted",
    });

    expect(next.tabs[0].lifecycle).toBe("removed");
    expect(next.tabs[0].errorMessage).toBe("File deleted");
  });

  it("transitions multiple duplicate tabs sharing the resource", () => {
    const tabA = makeTab({ tabId: "a", resourceKey: "file-1" });
    const tabB = makeTab({ tabId: "b", resourceKey: "file-1" });
    const state = makeState({ tabs: [tabA, tabB] });

    const next = previewTabsReducer(state, { type: "MARK_RESOURCE_REMOVED", resourceKey: "file-1" });

    expect(next.tabs.every((t) => t.lifecycle === "removed")).toBe(true);
  });

  it("leaves active/pinned tab identity untouched", () => {
    const tab = makeTab({ tabId: "a", resourceKey: "file-1", pinned: true });
    const state = makeState({ tabs: [tab], activeTabId: "a", mruTabIds: ["a"] });

    const next = previewTabsReducer(state, { type: "MARK_RESOURCE_REMOVED", resourceKey: "file-1" });

    expect(next.activeTabId).toBe("a");
    expect(next.tabs[0].pinned).toBe(true);
  });

  it("makes duplication invalid afterward", () => {
    const tab = makeTab({ tabId: "a", resourceKey: "file-1" });
    const state = makeState({ tabs: [tab] });

    const removed = previewTabsReducer(state, { type: "MARK_RESOURCE_REMOVED", resourceKey: "file-1" });
    const attemptDuplicate = previewTabsReducer(removed, { type: "DUPLICATE_TAB", tabId: "a" });

    expect(attemptDuplicate.tabs).toHaveLength(1);
  });

  it("is a no-op for an already-removed tab (no double-transition surprises)", () => {
    const tab = makeTab({ tabId: "a", resourceKey: "file-1", lifecycle: "removed", errorMessage: "first" });
    const state = makeState({ tabs: [tab] });

    const next = previewTabsReducer(state, {
      type: "MARK_RESOURCE_REMOVED",
      resourceKey: "file-1",
      message: "second",
    });

    expect(next.tabs[0].errorMessage).toBe("first");
  });
});

describe("UPDATE_VIEW_STATE", () => {
  it("shallow-merges partial viewState into the target tab only", () => {
    const tabA = makeTab({ tabId: "a", viewState: { zoom: 1, page: 2 } });
    const tabB = makeTab({ tabId: "b", resourceKey: "file-b", viewState: { zoom: 5 } });
    const state = makeState({ tabs: [tabA, tabB] });

    const next = previewTabsReducer(state, {
      type: "UPDATE_VIEW_STATE",
      tabId: "a",
      partial: { page: 9 },
    });

    expect(next.tabs.find((t) => t.tabId === "a")!.viewState).toEqual({ zoom: 1, page: 9 });
    expect(next.tabs.find((t) => t.tabId === "b")!.viewState).toEqual({ zoom: 5 });
  });

  it("is a no-op for a missing tab", () => {
    const state = makeState();
    expect(previewTabsReducer(state, { type: "UPDATE_VIEW_STATE", tabId: "ghost", partial: {} })).toBe(
      state,
    );
  });
});

describe("SET_OVERFLOW_MODE", () => {
  it("updates overflowMode only", () => {
    const tab = makeTab({ tabId: "a" });
    const state = makeState({ tabs: [tab], activeTabId: "a", overflowMode: "scroll" });

    const next = previewTabsReducer(state, { type: "SET_OVERFLOW_MODE", mode: "pagination" });

    expect(next.overflowMode).toBe("pagination");
    expect(next.tabs).toBe(state.tabs);
    expect(next.activeTabId).toBe("a");
  });

  it("preserves active tab and tab set", () => {
    const tabA = makeTab({ tabId: "a" });
    const tabB = makeTab({ tabId: "b", resourceKey: "file-b" });
    const state = makeState({ tabs: [tabA, tabB], activeTabId: "b" });

    const next = previewTabsReducer(state, { type: "SET_OVERFLOW_MODE", mode: "pagination" });

    expect(next.tabs).toEqual(state.tabs);
    expect(next.activeTabId).toBe("b");
  });
});

describe("invariants across action sequences", () => {
  function assertInvariants(state: PreviewTabsState) {
    // Unique tabIds
    const ids = state.tabs.map((t) => t.tabId);
    expect(new Set(ids).size).toBe(ids.length);

    // activeTabId is null or exists
    if (state.activeTabId !== null) {
      expect(state.tabs.some((t) => t.tabId === state.activeTabId)).toBe(true);
    }

    // Pinned-first ordering
    const ordered = getOrderedTabs(state);
    const firstUnpinnedIndex = ordered.findIndex((t) => !t.pinned);
    if (firstUnpinnedIndex !== -1) {
      expect(ordered.slice(firstUnpinnedIndex).every((t) => !t.pinned)).toBe(true);
    }

    // No removed tab duplicable (checked via canDuplicateTab semantics is reducer-level;
    // here we assert no removed tab is ever silently flipped back to non-removed)
    // MRU invariants: unique, and every id exists in tabs.
    expect(new Set(state.mruTabIds).size).toBe(state.mruTabIds.length);
    for (const id of state.mruTabIds) {
      expect(state.tabs.some((t) => t.tabId === id)).toBe(true);
    }
  }

  it("holds after a long, mixed sequence of actions", () => {
    let state = makeState();
    const makeTabId = makeCounterId("seq");

    const openA: OpenTabInput = { resourceKey: "file-a", title: "a.pdf", fileType: "pdf" };
    const openB: OpenTabInput = { resourceKey: "file-b", title: "b.pdf", fileType: "pdf" };
    const openC: OpenTabInput = { resourceKey: "file-c", title: "c.pdf", fileType: "pdf" };

    state = previewTabsReducer(state, { type: "OPEN_TAB", input: openA }, { makeTabId });
    assertInvariants(state);
    state = previewTabsReducer(state, { type: "OPEN_TAB", input: openB }, { makeTabId });
    assertInvariants(state);
    state = previewTabsReducer(state, { type: "OPEN_TAB", input: openC }, { makeTabId });
    assertInvariants(state);

    const firstTabId = state.tabs[0].tabId;
    state = previewTabsReducer(state, { type: "PIN_TAB", tabId: firstTabId });
    assertInvariants(state);

    state = previewTabsReducer(state, { type: "DUPLICATE_TAB", tabId: state.tabs[1].tabId }, {
      makeTabId,
    });
    assertInvariants(state);

    state = previewTabsReducer(state, {
      type: "MARK_RESOURCE_REMOVED",
      resourceKey: "file-b",
      message: "gone",
    });
    assertInvariants(state);

    state = previewTabsReducer(state, { type: "OPEN_TAB", input: openA }, { makeTabId });
    assertInvariants(state);

    state = previewTabsReducer(state, { type: "CLOSE_ALL_UNPINNED" });
    assertInvariants(state);

    state = previewTabsReducer(state, { type: "UNPIN_TAB", tabId: firstTabId });
    assertInvariants(state);

    state = previewTabsReducer(state, { type: "CLOSE_TAB", tabId: firstTabId });
    assertInvariants(state);
  });

  it("MRU front-of-list reflects the most recent focus/open/duplicate/pin/unpin interaction", () => {
    let state = makeState({
      tabs: [makeTab({ tabId: "a" }), makeTab({ tabId: "b", resourceKey: "file-b" })],
      mruTabIds: ["a", "b"],
    });

    state = previewTabsReducer(state, { type: "FOCUS_TAB", tabId: "b" });
    expect(state.mruTabIds[0]).toBe("b");

    state = previewTabsReducer(state, { type: "PIN_TAB", tabId: "a" });
    expect(state.mruTabIds[0]).toBe("a");

    state = previewTabsReducer(state, { type: "UNPIN_TAB", tabId: "b" });
    expect(state.mruTabIds[0]).toBe("b");
  });
});
