import type { SageFileType } from "@/lib/file-upload";

/** === fileId for MVP — the backend has no version/etag field, so a file
 * replace (PUT /files/{file_id}) keeps the same resourceKey. */
export type ResourceKey = string;

export type TabId = string;

export type OverflowMode = "pagination" | "scroll";

export type TabLifecycle = "loading" | "ready" | "error" | "removed";

export type ViewState = {
  zoom?: number;
  page?: number;
  scrollTop?: number;
};

export type PreviewTab = {
  tabId: TabId;
  resourceKey: ResourceKey;
  title: string;
  fileType: SageFileType;
  pinned: boolean;
  lifecycle: TabLifecycle;
  errorMessage?: string;
  viewState: ViewState;
};

export type PreviewTabsState = {
  tabs: PreviewTab[];
  activeTabId: TabId | null;
  overflowMode: OverflowMode;
  /** Most recently active/interacted-with first. */
  mruTabIds: TabId[];
};

/** Minimal descriptor openTab needs — decoupled from LibraryFile's full shape. */
export type OpenTabInput = {
  resourceKey: ResourceKey;
  title: string;
  fileType: SageFileType;
};
