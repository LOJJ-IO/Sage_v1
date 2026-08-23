import type { PersonalFolder, PersonalFolderId, PersonalFolderItem } from "./types";

export type TreeFolderNode = {
  folder: PersonalFolder;
  children: TreeFolderNode[];
};

/** Nested folder structure only (no files) — sorted by `position` within each
 * parent. Root folders are those with `parentFolderId === null`. */
export function buildFolderTree(folders: PersonalFolder[]): TreeFolderNode[] {
  const byParent = new Map<PersonalFolderId | null, PersonalFolder[]>();
  for (const folder of folders) {
    const siblings = byParent.get(folder.parentFolderId) ?? [];
    siblings.push(folder);
    byParent.set(folder.parentFolderId, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.position - b.position);
  }

  function build(parentId: PersonalFolderId | null): TreeFolderNode[] {
    return (byParent.get(parentId) ?? []).map((folder) => ({
      folder,
      children: build(folder.id),
    }));
  }

  return build(null);
}

/** File ids explicitly placed in this folder, in `position` order. Non-root
 * folders never fall back to alphabetical — only root does (see below). */
export function getFolderChildFileIds(items: PersonalFolderItem[], folderId: PersonalFolderId): string[] {
  return items
    .filter((item) => item.folderId === folderId)
    .sort((a, b) => a.position - b.position)
    .map((item) => item.fileId);
}

/** Root file ids: explicitly root-placed items first (by `position`), then
 * every file with no placement row at all — anywhere — sorted alphabetically. */
export function getRootFileIds(
  items: PersonalFolderItem[],
  allFileIds: string[],
  getFileName: (fileId: string) => string,
): string[] {
  const placedFileIds = new Set(items.map((item) => item.fileId));
  const rootPlaced = items
    .filter((item) => item.folderId === null)
    .sort((a, b) => a.position - b.position)
    .map((item) => item.fileId);
  const unplaced = allFileIds
    .filter((fileId) => !placedFileIds.has(fileId))
    .sort((a, b) => getFileName(a).localeCompare(getFileName(b)));

  return [...rootPlaced, ...unplaced];
}

/** True if setting `folderId`'s parent to `proposedParentId` would make
 * `folderId` its own ancestor (including reparenting onto itself). Mirrors
 * the backend's `_would_create_cycle` so invalid drop targets can be greyed
 * out client-side before a request is ever sent. */
export function wouldCreateCycle(
  folders: PersonalFolder[],
  folderId: PersonalFolderId,
  proposedParentId: PersonalFolderId | null,
): boolean {
  if (proposedParentId === null) return false;
  if (proposedParentId === folderId) return true;

  const parentById = new Map(folders.map((f) => [f.id, f.parentFolderId]));
  let current: PersonalFolderId | null = proposedParentId;
  const seen = new Set<PersonalFolderId>();
  while (current !== null) {
    if (current === folderId) return true;
    if (seen.has(current)) return false;
    seen.add(current);
    current = parentById.get(current) ?? null;
  }
  return false;
}

/** Every folder nested (at any depth) under `folderId` — used to grey out a
 * dragged folder's own subtree as invalid drop targets. */
export function getDescendantFolderIds(folders: PersonalFolder[], folderId: PersonalFolderId): Set<PersonalFolderId> {
  const childrenByParent = new Map<PersonalFolderId, PersonalFolderId[]>();
  for (const folder of folders) {
    if (folder.parentFolderId === null) continue;
    const children = childrenByParent.get(folder.parentFolderId) ?? [];
    children.push(folder.id);
    childrenByParent.set(folder.parentFolderId, children);
  }

  const result = new Set<PersonalFolderId>();
  const stack = [...(childrenByParent.get(folderId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop() as PersonalFolderId;
    if (result.has(current)) continue;
    result.add(current);
    stack.push(...(childrenByParent.get(current) ?? []));
  }
  return result;
}

/** Ancestor chain from `folderId` up to (not including) the root. Used to
 * auto-expand a folder's ancestors when revealing a file inside it. */
export function getAncestorFolderIds(folders: PersonalFolder[], folderId: PersonalFolderId): PersonalFolderId[] {
  const parentById = new Map(folders.map((f) => [f.id, f.parentFolderId]));
  const ancestors: PersonalFolderId[] = [];
  let current = parentById.get(folderId) ?? null;
  const seen = new Set<PersonalFolderId>();
  while (current !== null) {
    if (seen.has(current)) break;
    seen.add(current);
    ancestors.push(current);
    current = parentById.get(current) ?? null;
  }
  return ancestors;
}

/** The folder (and its ancestors) a given file currently lives in, or `[]` if
 * the file is unplaced/at root. */
export function getAncestorFolderIdsForFile(
  items: PersonalFolderItem[],
  folders: PersonalFolder[],
  fileId: string,
): PersonalFolderId[] {
  const item = items.find((i) => i.fileId === fileId);
  if (!item || item.folderId === null) return [];
  return [item.folderId, ...getAncestorFolderIds(folders, item.folderId)];
}
