export type PersonalFolderId = string;

/** A folder in one user's *personal* view of the shared file list — purely
 * visual, never consulted by retrieval (Sage-MVP-Functional-Spec §4.4). */
export type PersonalFolder = {
  id: PersonalFolderId;
  folderName: string;
  parentFolderId: PersonalFolderId | null;
  position: number;
};

/** Where one file sits in the current user's tree. Files with no matching
 * entry are unplaced — they render at root, alphabetically. */
export type PersonalFolderItem = {
  fileId: string;
  folderId: PersonalFolderId | null;
  position: number;
};

export type PersonalFolderTree = {
  folders: PersonalFolder[];
  items: PersonalFolderItem[];
};
