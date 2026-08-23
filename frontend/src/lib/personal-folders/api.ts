import { apiFetch } from "@/lib/api/client";

import type { PersonalFolder, PersonalFolderId, PersonalFolderItem, PersonalFolderTree } from "./types";

type FolderRecord = {
  id: string;
  folder_name: string;
  parent_folder_id: string | null;
  position: number;
};

type ItemRecord = {
  file_id: string;
  folder_id: string | null;
  position: number;
};

type TreeRecord = {
  folders: FolderRecord[];
  items: ItemRecord[];
};

function toFolder(record: FolderRecord): PersonalFolder {
  return {
    id: record.id,
    folderName: record.folder_name,
    parentFolderId: record.parent_folder_id,
    position: record.position,
  };
}

function toItem(record: ItemRecord): PersonalFolderItem {
  return { fileId: record.file_id, folderId: record.folder_id, position: record.position };
}

export async function fetchPersonalFolderTree(): Promise<PersonalFolderTree> {
  const record = await apiFetch<TreeRecord>("/me/folders");
  return { folders: record.folders.map(toFolder), items: record.items.map(toItem) };
}

export async function createPersonalFolder(
  folderName: string,
  parentFolderId: PersonalFolderId | null,
): Promise<PersonalFolder> {
  const record = await apiFetch<FolderRecord>("/me/folders", {
    method: "POST",
    body: JSON.stringify({ folder_name: folderName, parent_folder_id: parentFolderId }),
  });
  return toFolder(record);
}

export async function renamePersonalFolder(folderId: PersonalFolderId, folderName: string): Promise<PersonalFolder> {
  const record = await apiFetch<FolderRecord>(`/me/folders/${folderId}`, {
    method: "PUT",
    body: JSON.stringify({ folder_name: folderName }),
  });
  return toFolder(record);
}

export async function movePersonalFolder(
  folderId: PersonalFolderId,
  parentFolderId: PersonalFolderId | null,
  position: number,
): Promise<PersonalFolder> {
  const record = await apiFetch<FolderRecord>(`/me/folders/${folderId}/move`, {
    method: "PUT",
    body: JSON.stringify({ parent_folder_id: parentFolderId, position }),
  });
  return toFolder(record);
}

export async function deletePersonalFolder(folderId: PersonalFolderId): Promise<void> {
  await apiFetch<void>(`/me/folders/${folderId}`, { method: "DELETE" });
}

export async function upsertPersonalFolderItem(
  fileId: string,
  folderId: PersonalFolderId | null,
  position: number,
): Promise<PersonalFolderItem> {
  const record = await apiFetch<ItemRecord>("/me/folders/items", {
    method: "PUT",
    body: JSON.stringify({ file_id: fileId, folder_id: folderId, position }),
  });
  return toItem(record);
}
