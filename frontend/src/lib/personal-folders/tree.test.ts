import { describe, expect, it } from "vitest";

import {
  buildFolderTree,
  getAncestorFolderIds,
  getAncestorFolderIdsForFile,
  getDescendantFolderIds,
  getFolderChildFileIds,
  getRootFileIds,
  wouldCreateCycle,
} from "./tree";
import type { PersonalFolder, PersonalFolderItem } from "./types";

function folder(overrides: Partial<PersonalFolder> = {}): PersonalFolder {
  return {
    id: overrides.id ?? "folder-1",
    folderName: overrides.folderName ?? "Folder",
    parentFolderId: overrides.parentFolderId ?? null,
    position: overrides.position ?? 0,
  };
}

function item(overrides: Partial<PersonalFolderItem> = {}): PersonalFolderItem {
  return {
    fileId: overrides.fileId ?? "file-1",
    folderId: overrides.folderId ?? null,
    position: overrides.position ?? 0,
  };
}

describe("buildFolderTree", () => {
  it("nests folders under their parent, sorted by position", () => {
    const folders = [
      folder({ id: "b", position: 1 }),
      folder({ id: "a", position: 0 }),
      folder({ id: "child", parentFolderId: "a", position: 0 }),
    ];
    const tree = buildFolderTree(folders);
    expect(tree.map((n) => n.folder.id)).toEqual(["a", "b"]);
    expect(tree[0].children.map((n) => n.folder.id)).toEqual(["child"]);
    expect(tree[1].children).toEqual([]);
  });

  it("returns an empty tree for no folders", () => {
    expect(buildFolderTree([])).toEqual([]);
  });

  it("nests arbitrarily deep", () => {
    const folders = [
      folder({ id: "a" }),
      folder({ id: "b", parentFolderId: "a" }),
      folder({ id: "c", parentFolderId: "b" }),
    ];
    const tree = buildFolderTree(folders);
    expect(tree[0].children[0].children.map((n) => n.folder.id)).toEqual(["c"]);
  });
});

describe("getFolderChildFileIds", () => {
  it("returns files placed in the folder, sorted by position", () => {
    const items = [
      item({ fileId: "z", folderId: "f1", position: 1 }),
      item({ fileId: "a", folderId: "f1", position: 0 }),
      item({ fileId: "elsewhere", folderId: "f2", position: 0 }),
    ];
    expect(getFolderChildFileIds(items, "f1")).toEqual(["a", "z"]);
  });

  it("never falls back to unplaced files (root-only behavior)", () => {
    expect(getFolderChildFileIds([], "f1")).toEqual([]);
  });
});

describe("getRootFileIds", () => {
  it("orders explicitly-root-placed files first, then unplaced files alphabetically", () => {
    const items = [
      item({ fileId: "explicit-b", folderId: null, position: 1 }),
      item({ fileId: "explicit-a", folderId: null, position: 0 }),
      item({ fileId: "nested", folderId: "some-folder", position: 0 }),
    ];
    const allFileIds = ["explicit-a", "explicit-b", "nested", "unplaced-2", "unplaced-1"];
    const names: Record<string, string> = {
      "explicit-a": "Explicit A",
      "explicit-b": "Explicit B",
      nested: "Nested",
      "unplaced-1": "Alpha unplaced",
      "unplaced-2": "Zeta unplaced",
    };

    const result = getRootFileIds(items, allFileIds, (id) => names[id]);
    expect(result).toEqual(["explicit-a", "explicit-b", "unplaced-1", "unplaced-2"]);
  });

  it("returns everything alphabetically when nothing is explicitly placed", () => {
    const names: Record<string, string> = { b: "Bravo", a: "Alpha" };
    expect(getRootFileIds([], ["b", "a"], (id) => names[id])).toEqual(["a", "b"]);
  });
});

describe("wouldCreateCycle", () => {
  it("is never a cycle when the proposed parent is root", () => {
    expect(wouldCreateCycle([], "a", null)).toBe(false);
  });

  it("rejects reparenting a folder onto itself", () => {
    expect(wouldCreateCycle([folder({ id: "a" })], "a", "a")).toBe(true);
  });

  it("rejects reparenting a folder into its own descendant", () => {
    const folders = [
      folder({ id: "root" }),
      folder({ id: "child", parentFolderId: "root" }),
      folder({ id: "grandchild", parentFolderId: "child" }),
    ];
    expect(wouldCreateCycle(folders, "root", "grandchild")).toBe(true);
  });

  it("allows moving into an unrelated folder", () => {
    const folders = [folder({ id: "a" }), folder({ id: "b" })];
    expect(wouldCreateCycle(folders, "a", "b")).toBe(false);
  });
});

describe("getDescendantFolderIds", () => {
  it("collects every nested descendant, not just direct children", () => {
    const folders = [
      folder({ id: "root" }),
      folder({ id: "child", parentFolderId: "root" }),
      folder({ id: "grandchild", parentFolderId: "child" }),
      folder({ id: "unrelated" }),
    ];
    expect(getDescendantFolderIds(folders, "root")).toEqual(new Set(["child", "grandchild"]));
  });

  it("returns an empty set for a leaf folder", () => {
    expect(getDescendantFolderIds([folder({ id: "leaf" })], "leaf")).toEqual(new Set());
  });
});

describe("getAncestorFolderIds", () => {
  it("walks up the parent chain to (not including) root", () => {
    const folders = [
      folder({ id: "root" }),
      folder({ id: "child", parentFolderId: "root" }),
      folder({ id: "grandchild", parentFolderId: "child" }),
    ];
    expect(getAncestorFolderIds(folders, "grandchild")).toEqual(["child", "root"]);
  });

  it("returns an empty array for a root-level folder", () => {
    expect(getAncestorFolderIds([folder({ id: "root" })], "root")).toEqual([]);
  });
});

describe("getAncestorFolderIdsForFile", () => {
  it("returns the containing folder plus its ancestors", () => {
    const folders = [folder({ id: "root" }), folder({ id: "child", parentFolderId: "root" })];
    const items = [item({ fileId: "f1", folderId: "child" })];
    expect(getAncestorFolderIdsForFile(items, folders, "f1")).toEqual(["child", "root"]);
  });

  it("returns an empty array for an unplaced file", () => {
    expect(getAncestorFolderIdsForFile([], [], "f1")).toEqual([]);
  });

  it("returns an empty array for a file explicitly placed at root", () => {
    const items = [item({ fileId: "f1", folderId: null })];
    expect(getAncestorFolderIdsForFile(items, [], "f1")).toEqual([]);
  });
});
