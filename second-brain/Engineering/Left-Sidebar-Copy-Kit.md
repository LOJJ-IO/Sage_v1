---
type: engineering-kit
status: active
tags: [area/frontend, pattern/copy-kit]
created: 2026-08-06
updated: 2026-08-06
related: ["[[Workspace-UI-Design-Decisions]]", "[[FEAT-preview-tabs]]", "[[UI-UX-Guidelines]]"]
---

# Left Sidebar + Center Preview Copy Kit

Portable export of Sage's **left file-library sidebar**, **center preview tabs + file viewers**, and **2-column layout** (no right Ask AI panel — center expands to fill remaining width).

Source of truth: `frontend/src/app/page.tsx`, `frontend/src/components/files/`, `frontend/src/components/preview-tabs/`, `frontend/src/lib/preview-tabs/`.

---

## What you get

| Piece | Description |
|---|---|
| **Top toolbar (left)** | Collapse left panel, Files / Search / Upload / Bookmarks |
| **Left panel** | File list, upload, bookmarks, context menu, delete/tags dialogs, resize, collapse |
| **Center panel** | `PreviewCenterPanel` — tab strip (pin/close/duplicate), PDF/image/txt/md/docx viewers |
| **Tab state** | Zustand store + reducer (focus existing tab on re-click, pinned tabs, removed-file sync) |
| **Layout** | 2-column grid: left \| gutter \| center (`minmax(0, 1fr)`) |

**Not included:** Right Ask AI sidebar, chat/citations, auth/profile/settings dialogs.

---

## Quick setup

### 1. Scaffold

```bash
npx create-next-app@latest my-app --typescript --tailwind --app --src-dir
cd my-app
```

### 2. Install dependencies

```bash
npm install @base-ui/react @tabler/icons-react @vscode/codicons class-variance-authority clsx tailwind-merge tw-animate-css shadcn zustand react-pdf
npm install -D @tailwindcss/postcss tailwindcss
```

### 3. tsconfig path alias

```json
"paths": {
  "@/*": ["./src/*"]
}
```

### 4. File tree

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── files/                    (7 files)
│   ├── preview-tabs/             (tab strip + viewers + preview-tab-chrome.css)
│   ├── providers/toast-provider.tsx
│   ├── theme/theme-provider.tsx
│   └── ui/                       (button, dialog, tooltip, …)
├── hooks/
│   ├── use-file-library.ts
│   └── use-sync-removed-preview-tabs.ts
└── lib/
    ├── api/client.ts
    ├── files/api.ts
    ├── file-upload.ts
    ├── preview-tabs/             (types, reducer, selectors, store, storage)
    ├── theme.ts
    ├── toast/types.ts
    ├── ui/truncate.ts
    └── utils.ts
```

### 5. Optional backend

```env
NEXT_PUBLIC_API_URL=https://your-api.example.com
```

Without it: uploads stay in-memory; PDF/image/txt/md preview from local `File` blobs. Docx needs backend extracted text.

### 6. Fast copy from Sage repo

```bash
SAGE=/path/to/Sage_v1/frontend/src
DEST=./src

cp -R "$SAGE/components/files" "$DEST/components/"
cp -R "$SAGE/components/preview-tabs" "$DEST/components/"
cp -R "$SAGE/components/ui" "$DEST/components/"
cp -R "$SAGE/components/providers" "$DEST/components/"
cp -R "$SAGE/components/theme" "$DEST/components/"
cp -R "$SAGE/lib/preview-tabs" "$DEST/lib/"
cp "$SAGE/hooks/use-file-library.ts" "$DEST/hooks/"
cp "$SAGE/hooks/use-sync-removed-preview-tabs.ts" "$DEST/hooks/"
cp "$SAGE/lib/file-upload.ts" "$DEST/lib/"
cp "$SAGE/lib/files/api.ts" "$DEST/lib/files/"  # mkdir lib/files first
cp "$SAGE/lib/api/client.ts" "$DEST/lib/api/"
cp "$SAGE/lib/utils.ts" "$SAGE/lib/theme.ts" "$DEST/lib/"
cp -R "$SAGE/lib/toast" "$DEST/lib/"
cp -R "$SAGE/lib/ui" "$DEST/lib/"
```

Then paste `page.tsx`, `layout.tsx`, and `globals.css` from this document.

---

## Layout architecture

```
main (flex col, h-full, bg-muted)
├── top toolbar (h-12)
├── CSS grid (flex-1) — 3 tracks
│   [0] left section (file library)
│   [1] left resize gutter
│   [2] PreviewCenterPanel (tabs + stage) — minmax(0, 1fr)
```

### Center panel internals

```
PreviewCenterPanel
├── PreviewTabStrip
│   ├── PreviewTabLane → PreviewTab (pin, close, context menu)
│   └── TabStripSettingsMenu (close all unpinned)
└── PreviewStage
    └── FilePreviewRouter
        ├── PdfViewer (react-pdf)
        ├── ImageViewer
        ├── TextViewer (txt/md)
        └── DocxTextViewer (backend /text)
```

### Key wiring in `page.tsx`

```ts
useSyncRemovedPreviewTabs(files);
const openTab = usePreviewTabsStore((state) => state.openTab);

const handleOpenFile = (file: LibraryFile) => {
  openTab({
    resourceKey: file.id,
    title: file.file.name,
    fileType: file.fileType,
  });
};

// In grid:
<PreviewCenterPanel files={files} filesEmpty={files.length === 0} />
```

---

## Source files

### `postcss.config.mjs`

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;

```

---

### `src/app/globals.css`

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: Arial, Helvetica, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  --font-heading: Arial, Helvetica, sans-serif;
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
  --spacing-dialog-shell-x: var(--dialog-shell-px);
  --spacing-dialog-shell-header-y: var(--dialog-shell-header-py);
  --spacing-dialog-shell-footer-y: var(--dialog-shell-footer-py);
  --spacing-dialog-shell-body-y: var(--dialog-shell-body-py);
}

body {
  margin: 0;
  height: 100%;
  overflow: hidden;
}

html {
  height: 100%;
  overflow: hidden;
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.45 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  /* Dialog shell chrome — Settings / FormDialog / wizards share these */
  --dialog-shell-px: 1.5rem;
  --dialog-shell-header-py: 0.875rem;
  --dialog-shell-footer-py: 0.75rem;
  --dialog-shell-body-py: 1.25rem;
  --dialog-shell-max-h: min(80vh, 32rem);
  --dialog-shell-min-h: 20rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

/*
  Must come after :root. Use :root.dark so specificity beats :root —
  otherwise light tokens always win on html.dark (equal specificity).
  Structure mirrors light: muted = recessed well, background = elevated panels.
*/
:root.dark {
  color-scheme: dark;
  --background: oklch(0.205 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.22 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.22 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.92 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.28 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.145 0 0);
  --muted-foreground: oklch(0.78 0 0);
  --accent: oklch(0.28 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.72 0.17 22);
  --border: oklch(1 0 0 / 14%);
  --input: oklch(1 0 0 / 16%);
  --ring: oklch(0.65 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.7 0 0);
  --chart-3: oklch(0.55 0 0);
  --chart-4: oklch(0.45 0 0);
  --chart-5: oklch(0.35 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.92 0 0);
  --sidebar-primary-foreground: oklch(0.205 0 0);
  --sidebar-accent: oklch(0.28 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 14%);
  --sidebar-ring: oklch(0.65 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background font-sans text-foreground;
  }
  html {
    @apply font-sans;
  }
}

```

---

### `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "@vscode/codicons/dist/codicon.css";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sage",
  description: "Operational knowledge for retail teams — ask Sage anything about your store's docs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("sage_theme")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex h-full flex-col overflow-hidden">
        <ThemeProvider>
          <TooltipProvider>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

```

---

### `src/app/page.tsx` — 2-column layout with PreviewCenterPanel

```tsx
"use client";

import {
  IconArrowsSort,
  IconBookmark,
  IconEyeQuestion,
  IconUpload,
  IconWand,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { FileLibraryPanel } from "@/components/files/file-library-panel";
import { PreviewCenterPanel } from "@/components/preview-tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFileLibrary } from "@/hooks/use-file-library";
import { useSyncRemovedPreviewTabs } from "@/hooks/use-sync-removed-preview-tabs";
import type { LibraryFile } from "@/lib/file-upload";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";

const MIN_SIDE_WIDTH = 16;
const MIN_MIDDLE_WIDTH = 16;
const DEFAULT_SIDE_WIDTH = 30;
const PANEL_GUTTER = "0.5rem";
const PANEL_SURFACE =
  "flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-background";
const ICON_SIZE = 20;
const ICON_SIZE_SM = 14;
const ICON_SIZE_EMPTY = 16;
const ICON_STROKE = 2.2;

function Codicon({
  iconClass,
  size = ICON_SIZE,
}: {
  iconClass: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={`codicon ${iconClass} [-webkit-text-stroke:0.35px_currentColor]`}
      style={{ fontSize: size }}
    />
  );
}

function TablerIcon({
  icon: Icon,
  size = ICON_SIZE,
}: {
  icon: typeof IconUpload;
  size?: number;
}) {
  return (
    <Icon
      aria-hidden="true"
      className="text-current"
      size={size}
      stroke={ICON_STROKE}
    />
  );
}

function FilesEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <EmptyState
      action={
        <Button onClick={onUpload} size="sm" type="button">
          <TablerIcon icon={IconUpload} size={ICON_SIZE_SM} />
          Upload files
        </Button>
      }
      className="h-full px-4"
      description="Upload documents to populate your file tree and keep everything in one place."
      icon={<Codicon iconClass="codicon-folder-library" size={ICON_SIZE_EMPTY} />}
      title="No files yet"
    />
  );
}

function HeaderIconGroup({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex w-fit items-center gap-0.5 rounded-full border border-border bg-background p-0.5 shadow-sm">
      {children}
    </div>
  );
}

function HeaderIconButton({
  label,
  iconClass,
  icon,
  onClick,
  tooltipPlacement = "bottom",
}: {
  label: string;
  iconClass?: string;
  icon?: ReactNode;
  onClick?: () => void;
  tooltipPlacement?: "bottom" | "left" | "right";
}) {
  const sideOffset = tooltipPlacement === "bottom" ? 6 : 8;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={label}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onClick={onClick}
            type="button"
          />
        }
      >
        {icon ?? <Codicon iconClass={iconClass!} size={ICON_SIZE} />}
      </TooltipTrigger>
      <TooltipContent
        side={tooltipPlacement}
        sideOffset={sideOffset}
        variant="compact"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Home() {
  const {
    files,
    error,
    openFilePicker,
    removeFile,
    updateTags,
    toggleBookmark,
    openReplacePicker,
    inputRef,
    replaceInputRef,
    inputProps,
    replaceInputProps,
  } = useFileLibrary();

  useSyncRemovedPreviewTabs(files);

  const openTab = usePreviewTabsStore((state) => state.openTab);
  const handleOpenFile = useCallback(
    (file: LibraryFile) => {
      openTab({
        resourceKey: file.id,
        title: file.file.name,
        fileType: file.fileType,
      });
    },
    [openTab],
  );

  const [leftWidth, setLeftWidth] = useState(DEFAULT_SIDE_WIDTH);
  const [isLeftVisible, setIsLeftVisible] = useState(true);

  const startResize = useCallback(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const viewportWidth = window.innerWidth;
      const pointerPercent = (event.clientX / viewportWidth) * 100;
      const maxLeftWidth = 100 - MIN_MIDDLE_WIDTH;
      setLeftWidth(
        Math.min(Math.max(pointerPercent, MIN_SIDE_WIDTH), maxLeftWidth),
      );
    };

    const stopResize = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
  }, []);

  const leftColumnWidth = isLeftVisible ? `${leftWidth}%` : "0px";
  const gridTemplateColumns = [
    leftColumnWidth,
    isLeftVisible ? PANEL_GUTTER : "0px",
    "minmax(0, 1fr)",
  ].join(" ");

  return (
    <main className="flex h-full flex-col overflow-hidden bg-muted text-foreground">
      <input ref={inputRef} {...inputProps} />
      <input ref={replaceInputRef} {...replaceInputProps} />

      <div className="relative flex h-12 shrink-0 items-center px-2">
        <div className="flex items-center gap-2">
          <HeaderIconGroup>
            <HeaderIconButton
              iconClass={
                isLeftVisible
                  ? "codicon-layout-sidebar-left-off"
                  : "codicon-layout-sidebar-left"
              }
              label="Collapse"
              onClick={() => setIsLeftVisible((visible) => !visible)}
              tooltipPlacement="right"
            />
          </HeaderIconGroup>
          <HeaderIconGroup>
            <HeaderIconButton iconClass="codicon-folder-library" label="Files" />
            <HeaderIconButton iconClass="codicon-search" label="Search" />
            <HeaderIconButton
              icon={<TablerIcon icon={IconUpload} />}
              label="Upload"
              onClick={openFilePicker}
            />
            <HeaderIconButton
              icon={<TablerIcon icon={IconBookmark} />}
              label="Bookmarks"
            />
          </HeaderIconGroup>
        </div>
      </div>

      <div
        className="grid min-h-0 min-w-0 flex-1 overflow-hidden px-2 pb-2"
        style={{ gridTemplateColumns }}
      >
        <section className={PANEL_SURFACE}>
          <header className="flex h-14 w-full shrink-0 items-center justify-center border-b border-border">
            <HeaderIconGroup>
              <HeaderIconButton
                icon={<TablerIcon icon={IconArrowsSort} />}
                label="Sort"
              />
              <HeaderIconButton
                iconClass="codicon-new-folder"
                label="New folder"
              />
              <HeaderIconButton
                icon={<TablerIcon icon={IconWand} />}
                label="Auto-Sort"
              />
              <HeaderIconButton
                icon={<TablerIcon icon={IconEyeQuestion} />}
                label="Auto-reveal current file"
              />
              <HeaderIconButton
                iconClass="codicon-collapse-all"
                label="Collapse all"
              />
            </HeaderIconGroup>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {error ? (
              <p
                className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            {files.length > 0 ? (
              <FileLibraryPanel
                files={files}
                onDeleteFile={removeFile}
                onEditTags={updateTags}
                onOpenFile={handleOpenFile}
                onReplaceFile={openReplacePicker}
                onToggleBookmark={toggleBookmark}
              />
            ) : (
              <FilesEmptyState onUpload={openFilePicker} />
            )}
          </div>
        </section>

        <div className="relative h-full">
          {isLeftVisible ? (
            <button
              aria-label="Resize left column"
              className="absolute left-1/2 top-0 z-10 h-full w-4 -translate-x-1/2 cursor-col-resize touch-none bg-transparent"
              onPointerDown={() => {
                setIsLeftVisible(true);
                startResize();
              }}
              type="button"
            />
          ) : null}
        </div>

        <PreviewCenterPanel files={files} filesEmpty={files.length === 0} />
      </div>
    </main>
  );
}

```

---

### `src/hooks/use-file-library.ts`

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  deleteBackendFile,
  isBackendConfigured,
  listBackendFiles,
  replaceBackendFile,
  uploadBackendFile,
  type FileRecord,
} from "@/lib/files/api";
import {
  ACCEPT_ATTRIBUTE,
  fileTypeFromFilename,
  isSystemJunkFile,
  tagsFromFilename,
  validateFileForUpload,
  type LibraryFile,
} from "@/lib/file-upload";

const POLL_INTERVAL_MS = 2000;

type PriorFileInfo = Pick<LibraryFile, "file" | "tags" | "isBookmarked">;

function toLibraryFile(record: FileRecord, prior?: PriorFileInfo): LibraryFile {
  return {
    id: record.file_id,
    file: prior?.file ?? new File([], record.filename),
    fileType: fileTypeFromFilename(record.filename),
    tags: prior?.tags ?? tagsFromFilename(record.filename),
    isBookmarked: prior?.isBookmarked ?? false,
    status: record.status,
    looksScanned: record.looks_scanned,
    error: record.error,
  };
}

function mergeRecords(
  records: FileRecord[],
  previous: LibraryFile[],
): LibraryFile[] {
  const priorById = new Map(previous.map((entry) => [entry.id, entry]));
  return records.map((record) => toLibraryFile(record, priorById.get(record.file_id)));
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function useFileLibrary() {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetIdRef = useRef<string | null>(null);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const backendConfigured = isBackendConfigured();

  const refreshFromBackend = useCallback(async () => {
    if (!backendConfigured) return;
    try {
      const records = await listBackendFiles();
      setFiles((current) => mergeRecords(records, current));
    } catch (err) {
      setError(errorMessage(err, "Couldn't load your files. Try refreshing."));
    }
  }, [backendConfigured]);

  useEffect(() => {
    void refreshFromBackend();
  }, [refreshFromBackend]);

  useEffect(() => {
    if (!backendConfigured) return;
    const hasInFlightIngestion = files.some(
      (entry) => entry.status === "pending" || entry.status === "processing",
    );
    if (!hasInFlightIngestion) return;

    const timer = setInterval(() => {
      void refreshFromBackend();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [backendConfigured, files, refreshFromBackend]);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const addFiles = useCallback(
    async (selected: File[]) => {
      setError(null);

      const accepted: File[] = [];
      let firstSkipReason: string | null = null;
      let skippedCount = 0;

      for (const file of selected) {
        if (isSystemJunkFile(file.name)) continue;

        const result = validateFileForUpload(file);
        if (!result.ok) {
          skippedCount += 1;
          firstSkipReason ??= result.reason;
          continue;
        }

        accepted.push(file);
      }

      if (accepted.length === 0) {
        setError(firstSkipReason ?? "No supported files selected.");
        return;
      }

      const uploadFailures: string[] = [];
      for (const file of accepted) {
        if (!backendConfigured) {
          // No backend configured — keep the old in-memory-only prototype
          // behavior so the UI still works standalone.
          setFiles((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              file,
              fileType: fileTypeFromFilename(file.name),
              tags: tagsFromFilename(file.name),
              isBookmarked: false,
              status: "indexed",
              looksScanned: false,
              error: null,
            },
          ]);
          continue;
        }

        try {
          const record = await uploadBackendFile(file);
          setFiles((current) => [...current, toLibraryFile(record, { file, tags: tagsFromFilename(file.name), isBookmarked: false })]);
        } catch (err) {
          uploadFailures.push(`${file.name}: ${errorMessage(err, "upload failed")}`);
        }
      }

      if (uploadFailures.length > 0) {
        setError(uploadFailures.join("; "));
      } else if (skippedCount > 0) {
        setError(`Uploaded ${accepted.length} file(s). ${skippedCount} skipped.`);
      }
    },
    [backendConfigured],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (selected.length > 0) void addFiles(selected);
    },
    [addFiles],
  );

  const removeFile = useCallback((fileId: string) => {
    const previous = files;
    setFiles((current) => current.filter((entry) => entry.id !== fileId));

    if (!backendConfigured) return;

    void deleteBackendFile(fileId).catch((err) => {
      setError(errorMessage(err, "Couldn't delete that file. Try again."));
      setFiles(previous);
    });
  }, [backendConfigured, files]);

  const updateTags = useCallback((fileId: string, tags: string[]) => {
    setFiles((current) =>
      current.map((entry) =>
        entry.id === fileId ? { ...entry, tags } : entry,
      ),
    );
  }, []);

  const toggleBookmark = useCallback((fileId: string) => {
    setFiles((current) =>
      current.map((entry) =>
        entry.id === fileId
          ? { ...entry, isBookmarked: !entry.isBookmarked }
          : entry,
      ),
    );
  }, []);

  const openReplacePicker = useCallback((fileId: string) => {
    replaceTargetIdRef.current = fileId;
    replaceInputRef.current?.click();
  }, []);

  const handleReplaceInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      const fileId = replaceTargetIdRef.current;
      replaceTargetIdRef.current = null;

      if (!file || !fileId) {
        return;
      }

      const result = validateFileForUpload(file);
      if (!result.ok) {
        setError(result.reason);
        return;
      }

      setError(null);

      if (!backendConfigured) {
        setFiles((current) =>
          current.map((entry) =>
            entry.id === fileId
              ? { ...entry, file, fileType: fileTypeFromFilename(file.name) }
              : entry,
          ),
        );
        return;
      }

      void replaceBackendFile(fileId, file)
        .then((record) => {
          setFiles((current) =>
            current.map((entry) =>
              entry.id === fileId ? toLibraryFile(record, { ...entry, file }) : entry,
            ),
          );
        })
        .catch((err) => {
          setError(errorMessage(err, "Couldn't replace that file. Try again."));
        });
    },
    [backendConfigured],
  );

  return {
    files,
    error,
    openFilePicker,
    removeFile,
    updateTags,
    toggleBookmark,
    openReplacePicker,
    inputRef,
    replaceInputRef,
    inputProps: {
      type: "file" as const,
      multiple: true,
      accept: ACCEPT_ATTRIBUTE,
      className: "sr-only",
      onChange: handleInputChange,
    },
    replaceInputProps: {
      type: "file" as const,
      accept: ACCEPT_ATTRIBUTE,
      className: "sr-only",
      onChange: handleReplaceInputChange,
    },
  };
}

```

---

### `src/hooks/use-sync-removed-preview-tabs.ts`

```ts
"use client";

import { useEffect } from "react";

import type { LibraryFile } from "@/lib/file-upload";
import { getResourceKeysToMarkRemoved } from "@/lib/preview-tabs/selectors";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";

/**
 * Diffs the file library against open preview tabs on every `files` change
 * (upload, delete, or the 2s ingestion poll) and marks any tab whose
 * resource has disappeared as `removed`, instead of leaving it pointing at
 * a file that no longer exists.
 */
export function useSyncRemovedPreviewTabs(files: LibraryFile[]) {
  const tabs = usePreviewTabsStore((state) => state.tabs);
  const markResourceRemoved = usePreviewTabsStore((state) => state.markResourceRemoved);

  useEffect(() => {
    const presentResourceKeys = new Set(files.map((file) => file.id));
    for (const resourceKey of getResourceKeysToMarkRemoved(tabs, presentResourceKeys)) {
      markResourceRemoved(resourceKey);
    }
  }, [files, tabs, markResourceRemoved]);
}

```

---

### `src/lib/utils.ts`

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

---

### `src/lib/theme.ts`

```ts
export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "sage_theme";

export function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }

  return "system";
}

export function storeTheme(theme: ThemePreference) {
  localStorage.setItem(STORAGE_KEY, theme);
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(theme: ThemePreference): "light" | "dark" {
  if (theme === "system") {
    return getSystemTheme();
  }

  return theme;
}

export function applyTheme(theme: ThemePreference) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

```

---

### `src/lib/ui/truncate.ts`

```ts
/**
 * Truncation principles (Material / HIG / desktop shells):
 * - Ellipsis on overflow; never wrap long labels in chrome.
 * - Measure in `ch` (font-relative), not fixed px.
 * - Cap chips vs the field so siblings + caret stay visible (`%` of container).
 * - Always pair with tooltip / `title` when the full string matters.
 */

/** Max width for dialog titles / filenames in descriptions. */
export const TRUNCATE_PROSE_MAX_CLASS = "max-w-[min(100%,28ch)]";

/** Dialog titles, filenames in descriptions, prose labels. */
export const TRUNCATE_PROSE_CLASS = `min-w-0 ${TRUNCATE_PROSE_MAX_CLASS} truncate`;

/**
 * Max width for chips / tags inside a field: at most ~2/3 of the field or ~24ch,
 * whichever is smaller — leaves room to scan other chips and type.
 */
export const TRUNCATE_CHIP_MAX_CLASS = "max-w-[min(70%,24ch)]";

/** Chip label text (apply max on the chip shell, truncate on the label). */
export const TRUNCATE_CHIP_CLASS = `min-w-0 ${TRUNCATE_CHIP_MAX_CLASS} truncate`;

/** Full-width rows (suggestion lists): fill parent, ellipsis at the end. */
export const TRUNCATE_ROW_CLASS = "min-w-0 w-full truncate";

```

---

### `src/lib/toast/types.ts`

```ts
export type ToastVariant = "success" | "error" | "info" | "progress";

export type ToastRecord = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  sticky: boolean;
  progress?: number;
};

export type ToastInput = {
  title: string;
  description?: string;
  progress?: number;
};

```

---

### `src/lib/file-upload.ts`

```ts
export type SageFileType = "pdf" | "docx" | "txt" | "md" | "image";

/** Backend ingestion status (`app/models.py` `File.status`). */
export type FileIngestStatus = "pending" | "processing" | "indexed" | "failed";

export type LibraryFile = {
  /** Backend `file_id` — stable across replace, unlike a client-generated id. */
  id: string;
  file: File;
  fileType: SageFileType;
  /** Client-only for now — the backend has no per-file tags column yet. */
  tags: string[];
  /** Client-only for now — not persisted server-side. */
  isBookmarked: boolean;
  status: FileIngestStatus;
  looksScanned: boolean;
  error: string | null;
};

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [
  "pdf",
  "docx",
  "txt",
  "md",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(
  ",",
);

const EXTENSION_TO_TYPE: Record<AllowedExtension, SageFileType> = {
  pdf: "pdf",
  docx: "docx",
  txt: "txt",
  md: "md",
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  gif: "image",
};

/** Best-effort mapping for filenames coming back from the backend, which
 * accepts a couple of MIME types (csv, xlsx) with no matching SageFileType. */
export function fileTypeFromFilename(filename: string): SageFileType {
  const extension = getExtension(filename) as AllowedExtension;
  return EXTENSION_TO_TYPE[extension] ?? "txt";
}

const SYSTEM_JUNK_NAMES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
]);

export function getExtension(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot === -1) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function isSystemJunkFile(filename: string): boolean {
  const base = (filename.split(/[/\\]/).pop() ?? filename).toLowerCase();
  return SYSTEM_JUNK_NAMES.has(base);
}

export type FileValidationResult =
  | { ok: true; fileType: SageFileType }
  | { ok: false; reason: string };

export function validateFileForUpload(file: File): FileValidationResult {
  if (isSystemJunkFile(file.name)) {
    return { ok: false, reason: "System file skipped" };
  }

  const extension = getExtension(file.name);

  if (extension === "doc") {
    return {
      ok: false,
      reason:
        "Legacy Word (.doc) is not supported — save the file as .docx and try again.",
    };
  }

  const fileType = EXTENSION_TO_TYPE[extension as AllowedExtension];
  if (!fileType) {
    return {
      ok: false,
      reason: `Unsupported file type (.${extension || "unknown"})`,
    };
  }

  if (file.size <= 0) {
    return { ok: false, reason: "File is empty" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      reason: `File exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB limit`,
    };
  }

  return { ok: true, fileType };
}

export function tagsFromFilename(filename: string): string[] {
  const base = (filename.split(/[/\\]/).pop() ?? filename).replace(
    /\.[^.]+$/,
    "",
  );
  const tokens = base
    .split(/[^a-zA-Z0-9]+/)
    .map((token) => token.toLowerCase())
    .filter((token) => token.length > 1);

  return [...new Set(tokens)];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileTypeLabel(fileType: SageFileType): string {
  switch (fileType) {
    case "pdf":
      return "PDF";
    case "docx":
      return "Word";
    case "txt":
      return "Text";
    case "md":
      return "Markdown";
    case "image":
      return "Image";
  }
}

```

---

### `src/lib/api/client.ts`

```ts
export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
}

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem("sage_access_token");
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  { auth = true, headers, ...init }: ApiFetchOptions = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new ApiError(
      0,
      "API is not configured. Set NEXT_PUBLIC_API_URL to connect to the backend."
    );
  }

  const requestHeaders = new Headers(headers);

  // FormData sets its own multipart boundary in the Content-Type header —
  // letting fetch do it. Only JSON bodies need an explicit Content-Type.
  if (
    !requestHeaders.has("Content-Type") &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAuthToken();

    if (!token) {
      throw new ApiError(401, "You must be signed in to perform this action.");
    }

    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: requestHeaders,
  });

  if (!response.ok) {
    let message = "Something went wrong. Try again.";

    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        message = payload.detail;
      }
    } catch {
      // Ignore malformed error bodies.
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

```

---

### `src/lib/files/api.ts`

```ts
import { apiFetch, getApiBaseUrl, getAuthToken } from "@/lib/api/client";
import type { FileIngestStatus } from "@/lib/file-upload";

export type FileRecord = {
  file_id: string;
  filename: string;
  status: FileIngestStatus;
  looks_scanned: boolean;
  error: string | null;
};

export function isBackendConfigured() {
  return Boolean(getApiBaseUrl());
}

export async function listBackendFiles(): Promise<FileRecord[]> {
  return apiFetch<FileRecord[]>("/files");
}

export async function uploadBackendFile(file: File): Promise<FileRecord> {
  const body = new FormData();
  body.append("upload", file, file.name);
  return apiFetch<FileRecord>("/files", { method: "POST", body });
}

export async function replaceBackendFile(
  fileId: string,
  file: File
): Promise<FileRecord> {
  const body = new FormData();
  body.append("upload", file, file.name);
  return apiFetch<FileRecord>(`/files/${fileId}`, { method: "PUT", body });
}

export async function deleteBackendFile(fileId: string): Promise<void> {
  await apiFetch<void>(`/files/${fileId}`, { method: "DELETE" });
}

/** Direct fetch (not apiFetch) because the response is a blob, not JSON. */
export async function downloadBackendFile(fileId: string): Promise<Blob> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "API is not configured. Set NEXT_PUBLIC_API_URL to connect to the backend.",
    );
  }
  const token = getAuthToken();
  const response = await fetch(`${baseUrl}/files/${fileId}/content`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Failed to download file (${response.status})`);
  }

  return response.blob();
}

/** Extracted text from ingestion chunks — used for docx preview (no in-browser renderer). */
export async function fetchBackendFileText(fileId: string): Promise<string> {
  const body = await apiFetch<{ text: string }>(`/files/${fileId}/text`);
  return body.text;
}

```

---

### `src/lib/preview-tabs/types.ts`

```ts
import type { SageFileType } from "@/lib/file-upload";

/** === fileId for MVP — the backend has no version/etag field, so a file
 * replace (PUT /files/{file_id}) keeps the same resourceKey. */
export type ResourceKey = string;

export type TabId = string;

export type OverflowMode = "pagination" | "scroll";

export type TabLifecycle = "loading" | "ready" | "error" | "removed";

/** Citation jump target for Phase 9 viewers (text scroll/highlight; PDF later). */
export type CitationHighlight = {
  citationId: string;
  charStart: number;
  charEnd: number;
};

export type ViewState = {
  zoom?: number;
  page?: number;
  scrollTop?: number;
  /** Set when opening from a Sources badge; viewers consume and may clear. */
  highlight?: CitationHighlight | null;
  /** PDF only: one page at a time vs all pages stacked. */
  scrollMode?: "single" | "continuous";
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
  /** Merged into the focused/new tab's viewState (e.g. citation highlight). */
  viewState?: Partial<ViewState>;
};

```

---

### `src/lib/preview-tabs/reducer.ts`

```ts
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

```

---

### `src/lib/preview-tabs/selectors.ts`

```ts
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

```

---

### `src/lib/preview-tabs/storage.ts`

```ts
import type { OverflowMode } from "./types";

const STORAGE_KEY = "sage_preview_tab_overflow_mode";
const DEFAULT_OVERFLOW_MODE: OverflowMode = "scroll";

function isOverflowMode(value: unknown): value is OverflowMode {
  return value === "pagination" || value === "scroll";
}

export function loadOverflowMode(): OverflowMode {
  if (typeof window === "undefined") {
    return DEFAULT_OVERFLOW_MODE;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isOverflowMode(stored) ? stored : DEFAULT_OVERFLOW_MODE;
  } catch {
    return DEFAULT_OVERFLOW_MODE;
  }
}

export function saveOverflowMode(mode: OverflowMode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private mode / quota exceeded — persistence is best-effort only.
  }
}

```

---

### `src/lib/preview-tabs/store.ts`

```ts
import { create } from "zustand";

import { previewTabsReducer } from "./reducer";
import { loadOverflowMode, saveOverflowMode } from "./storage";
import type {
  OpenTabInput,
  OverflowMode,
  PreviewTabsState,
  ResourceKey,
  TabId,
  ViewState,
} from "./types";

export type PreviewTabsStore = PreviewTabsState & {
  openTab: (input: OpenTabInput) => void;
  focusTab: (tabId: TabId) => void;
  duplicateTab: (tabId: TabId) => void;
  closeTab: (tabId: TabId) => void;
  closeAllUnpinned: () => void;
  pinTab: (tabId: TabId) => void;
  unpinTab: (tabId: TabId) => void;
  markResourceRemoved: (resourceKey: ResourceKey, message?: string) => void;
  updateViewState: (tabId: TabId, partial: Partial<ViewState>) => void;
  setOverflowMode: (mode: OverflowMode) => void;
};

export const usePreviewTabsStore = create<PreviewTabsStore>((set) => ({
  tabs: [],
  activeTabId: null,
  mruTabIds: [],
  overflowMode: loadOverflowMode(),

  openTab: (input) => set((state) => previewTabsReducer(state, { type: "OPEN_TAB", input })),
  focusTab: (tabId) => set((state) => previewTabsReducer(state, { type: "FOCUS_TAB", tabId })),
  duplicateTab: (tabId) =>
    set((state) => previewTabsReducer(state, { type: "DUPLICATE_TAB", tabId })),
  closeTab: (tabId) => set((state) => previewTabsReducer(state, { type: "CLOSE_TAB", tabId })),
  closeAllUnpinned: () =>
    set((state) => previewTabsReducer(state, { type: "CLOSE_ALL_UNPINNED" })),
  pinTab: (tabId) => set((state) => previewTabsReducer(state, { type: "PIN_TAB", tabId })),
  unpinTab: (tabId) => set((state) => previewTabsReducer(state, { type: "UNPIN_TAB", tabId })),
  markResourceRemoved: (resourceKey, message) =>
    set((state) =>
      previewTabsReducer(state, { type: "MARK_RESOURCE_REMOVED", resourceKey, message }),
    ),
  updateViewState: (tabId, partial) =>
    set((state) => previewTabsReducer(state, { type: "UPDATE_VIEW_STATE", tabId, partial })),
  setOverflowMode: (mode) => {
    saveOverflowMode(mode);
    set((state) => previewTabsReducer(state, { type: "SET_OVERFLOW_MODE", mode }));
  },
}));

```

---

### `src/lib/preview-tabs/index.ts`

```ts
export * from "./types";
export * from "./reducer";
export * from "./selectors";
export * from "./storage";
export * from "./store";

```

---

### `src/components/files/file-library-panel.tsx`

```tsx
"use client";

import { useState } from "react";

import { DeleteFileDialog } from "@/components/files/delete-file-dialog";
import { EditFileTagsDialog } from "@/components/files/edit-file-tags-dialog";
import { FileList } from "@/components/files/file-list";
import type { LibraryFile } from "@/lib/file-upload";

type FileLibraryPanelProps = {
  files: LibraryFile[];
  onDeleteFile: (fileId: string) => void;
  onEditTags: (fileId: string, tags: string[]) => void;
  onOpenFile: (file: LibraryFile) => void;
  onReplaceFile: (fileId: string) => void;
  onToggleBookmark: (fileId: string) => void;
};

export function FileLibraryPanel({
  files,
  onDeleteFile,
  onEditTags,
  onOpenFile,
  onReplaceFile,
  onToggleBookmark,
}: FileLibraryPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<LibraryFile | null>(null);
  const [editTagsTarget, setEditTagsTarget] = useState<LibraryFile | null>(
    null,
  );

  return (
    <>
      <FileList
        files={files}
        onDelete={setDeleteTarget}
        onEditTags={setEditTagsTarget}
        onOpenFile={onOpenFile}
        onReplace={(file) => onReplaceFile(file.id)}
        onToggleBookmark={onToggleBookmark}
      />

      <DeleteFileDialog
        file={deleteTarget}
        onConfirm={onDeleteFile}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        open={deleteTarget !== null}
      />

      <EditFileTagsDialog
        file={editTagsTarget}
        files={files}
        onOpenChange={(open) => {
          if (!open) {
            setEditTagsTarget(null);
          }
        }}
        onSubmit={onEditTags}
        open={editTagsTarget !== null}
      />
    </>
  );
}

```

---

### `src/components/files/file-list.tsx`

```tsx
"use client";

import { useState } from "react";

import type { FileIngestStatus, LibraryFile } from "@/lib/file-upload";

import { FileBookmarkButton } from "@/components/files/file-bookmark-button";
import {
  FileRowContextMenu,
  type FileRowMenuAnchor,
} from "@/components/files/file-row-menu";
import { FileTypeIcon } from "@/components/files/file-type-icon";

type FileListProps = {
  files: LibraryFile[];
  onDelete: (file: LibraryFile) => void;
  onEditTags: (file: LibraryFile) => void;
  onOpenFile: (file: LibraryFile) => void;
  onReplace: (file: LibraryFile) => void;
  onToggleBookmark: (fileId: string) => void;
};

type RowContextMenuState = {
  file: LibraryFile;
  anchor: FileRowMenuAnchor;
};

function statusLabel(status: FileIngestStatus): string {
  switch (status) {
    case "pending":
    case "processing":
      return "Indexing…";
    case "indexed":
      return "Ready";
    case "failed":
      return "Failed";
  }
}

function fileHint(entry: LibraryFile): string | null {
  if (entry.status === "failed") {
    return entry.error?.trim() || "Indexing failed — try replace or re-upload.";
  }
  if (entry.looksScanned) {
    return "Looks scanned — OCR is off, so Sage may refuse questions about this file. Prefer a text PDF, .docx, or .txt.";
  }
  return null;
}

export function FileList({
  files,
  onDelete,
  onEditTags,
  onOpenFile,
  onReplace,
  onToggleBookmark,
}: FileListProps) {
  const [contextMenu, setContextMenu] = useState<RowContextMenuState | null>(
    null,
  );

  if (files.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      {files.map((entry) => {
        const hint = fileHint(entry);
        return (
          <li
            key={entry.id}
            className="rounded-md px-1 py-0.5 hover:bg-muted"
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu({
                file: entry,
                anchor: { x: event.clientX, y: event.clientY },
              });
            }}
          >
            <div className="flex min-w-0 items-center gap-1">
              <button
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm text-foreground"
                onClick={() => onOpenFile(entry)}
                type="button"
              >
                <FileTypeIcon entry={entry} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {entry.file.name}
                </span>
                <span
                  className={
                    entry.status === "failed"
                      ? "shrink-0 text-xs text-destructive"
                      : entry.status === "indexed"
                        ? "shrink-0 text-xs text-muted-foreground"
                        : "shrink-0 text-xs text-muted-foreground"
                  }
                >
                  {statusLabel(entry.status)}
                </span>
              </button>

              <div className="flex shrink-0 items-center">
                <FileBookmarkButton
                  bookmarked={entry.isBookmarked}
                  filename={entry.file.name}
                  onToggle={() => onToggleBookmark(entry.id)}
                />
              </div>
            </div>
            {hint ? (
              <p className="px-1 pb-1 pl-9 text-xs text-muted-foreground">
                {hint}
              </p>
            ) : null}
          </li>
        );
      })}

      {contextMenu ? (
        <FileRowContextMenu
          anchor={contextMenu.anchor}
          file={contextMenu.file}
          onDelete={onDelete}
          onDismiss={() => setContextMenu(null)}
          onEditTags={onEditTags}
          onReplace={onReplace}
        />
      ) : null}
    </ul>
  );
}

```

---

### `src/components/files/file-type-icon.tsx`

```tsx
import {
  IconFileTypeDocx,
  IconFileTypeJpg,
  IconFileTypePdf,
  IconFileTypePng,
  IconFileTypeTxt,
  IconGif,
  IconMarkdown,
  IconPhoto,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

import {
  getExtension,
  type LibraryFile,
  type SageFileType,
} from "@/lib/file-upload";

const ICON_SIZE = 16;
const ICON_STROKE = 2.2;

type TablerIconProps = {
  size?: number;
  stroke?: number;
  className?: string;
  "aria-hidden"?: boolean;
};

const FILE_TYPE_ICONS: Record<
  Exclude<SageFileType, "image">,
  ComponentType<TablerIconProps>
> = {
  pdf: IconFileTypePdf,
  docx: IconFileTypeDocx,
  txt: IconFileTypeTxt,
  md: IconMarkdown,
};

function getImageIcon(filename: string): ComponentType<TablerIconProps> {
  const extension = getExtension(filename);
  if (extension === "jpg" || extension === "jpeg") return IconFileTypeJpg;
  if (extension === "png") return IconFileTypePng;
  if (extension === "gif") return IconGif;
  return IconPhoto;
}

export function FileTypeIcon({ entry }: { entry: LibraryFile }) {
  const Icon =
    entry.fileType === "image"
      ? getImageIcon(entry.file.name)
      : FILE_TYPE_ICONS[entry.fileType];

  return (
    <Icon
      aria-hidden
      className="shrink-0 text-muted-foreground"
      size={ICON_SIZE}
      stroke={ICON_STROKE}
    />
  );
}

```

---

### `src/components/files/file-bookmark-button.tsx`

```tsx
"use client";

import { IconBookmark, IconBookmarkFilled } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

type FileBookmarkButtonProps = {
  bookmarked: boolean;
  filename: string;
  onToggle: () => void;
};

export function FileBookmarkButton({
  bookmarked,
  filename,
  onToggle,
}: FileBookmarkButtonProps) {
  const Icon = bookmarked ? IconBookmarkFilled : IconBookmark;
  const label = bookmarked
    ? `Remove bookmark for ${filename}`
    : `Bookmark ${filename}`;

  return (
    <Button
      aria-label={label}
      aria-pressed={bookmarked}
      className={bookmarked ? "text-foreground" : "text-muted-foreground"}
      onClick={onToggle}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <Icon aria-hidden className="size-4" stroke={2.2} />
    </Button>
  );
}

```

---

### `src/components/files/file-row-menu.tsx`

```tsx
"use client";

import { IconReplace, IconTag, IconTrash } from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { LibraryFile } from "@/lib/file-upload";

export type FileRowMenuAnchor = {
  x: number;
  y: number;
};

type MenuPosition = {
  top: number;
  left: number;
};

function getMenuPosition(
  anchor: FileRowMenuAnchor,
  menu: HTMLElement,
): MenuPosition {
  const menuRect = menu.getBoundingClientRect();
  const viewportPadding = 8;

  const openUpward =
    window.innerHeight - anchor.y < menuRect.height + viewportPadding &&
    anchor.y > window.innerHeight - anchor.y;

  const top = openUpward ? anchor.y - menuRect.height : anchor.y;
  const left = Math.min(
    Math.max(viewportPadding, anchor.x),
    window.innerWidth - menuRect.width - viewportPadding,
  );

  return { top, left };
}

type FileRowContextMenuProps = {
  file: LibraryFile;
  anchor: FileRowMenuAnchor;
  onDismiss: () => void;
  onDelete: (file: LibraryFile) => void;
  onEditTags: (file: LibraryFile) => void;
  onReplace: (file: LibraryFile) => void;
};

/** Right-click menu for a file row, anchored at the pointer (rows carry no kebab button). */
export function FileRowContextMenu({
  file,
  anchor,
  onDismiss,
  onDelete,
  onEditTags,
  onReplace,
}: FileRowContextMenuProps) {
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!menuRef.current) {
      return;
    }

    setMenuPosition(getMenuPosition(anchor, menuRef.current));
  }, [anchor]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      onDismiss();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", onDismiss);
    window.addEventListener("scroll", onDismiss, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", onDismiss);
      window.removeEventListener("scroll", onDismiss, true);
    };
  }, [onDismiss]);

  if (typeof document === "undefined") {
    return null;
  }

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-md"
      role="menu"
      style={
        menuPosition
          ? { top: menuPosition.top, left: menuPosition.left }
          : { top: -9999, left: -9999, visibility: "hidden" }
      }
    >
      <button
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
        onClick={() => {
          onDismiss();
          onEditTags(file);
        }}
        role="menuitem"
        type="button"
      >
        <IconTag aria-hidden className="size-4" stroke={2.2} />
        Edit tags
      </button>

      <button
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
        onClick={() => {
          onDismiss();
          onReplace(file);
        }}
        role="menuitem"
        type="button"
      >
        <IconReplace aria-hidden className="size-4" stroke={2.2} />
        Replace
      </button>

      <button
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
        onClick={() => {
          onDismiss();
          onDelete(file);
        }}
        role="menuitem"
        type="button"
      >
        <IconTrash aria-hidden className="size-4" stroke={2.2} />
        Delete
      </button>
    </div>
  );

  return createPortal(menu, document.body);
}

```

---

### `src/components/files/delete-file-dialog.tsx`

```tsx
"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/providers/toast-provider";
import type { LibraryFile } from "@/lib/file-upload";

type DeleteFileDialogProps = {
  file: LibraryFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (fileId: string) => void;
};

export function DeleteFileDialog({
  file,
  open,
  onOpenChange,
  onConfirm,
}: DeleteFileDialogProps) {
  const toast = useToast();

  if (!open || !file) {
    return null;
  }

  return (
    <ConfirmDialog
      confirmLabel="Delete"
      description={
        <>
          <span className="font-medium text-foreground">
            {file.file.name}
          </span>{" "}
          will be removed for everyone, including bookmarks and personal folder
          placements. This cannot be undone.
        </>
      }
      onConfirm={() => {
        onConfirm(file.id);
        toast.success({ title: "File deleted" });
      }}
      onOpenChange={onOpenChange}
      open={open}
      title="Delete file"
    />
  );
}

```

---

### `src/components/files/edit-file-tags-dialog.tsx`

```tsx
"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { TruncatedFilename } from "@/components/preview-tabs/truncated-filename";
import { Button } from "@/components/ui/button";
import { ShellDialog } from "@/components/ui/shell-dialog";
import { TagInput } from "@/components/ui/tag-input";
import type { LibraryFile } from "@/lib/file-upload";
import { TRUNCATE_PROSE_CLASS } from "@/lib/ui/truncate";

type EditFileTagsDialogProps = {
  file: LibraryFile | null;
  files: LibraryFile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (fileId: string, tags: string[]) => void;
};

function collectLibraryTags(files: LibraryFile[]): string[] {
  const tags = new Set<string>();
  for (const entry of files) {
    for (const tag of entry.tags) {
      const normalized = tag.trim().toLowerCase();
      if (normalized) {
        tags.add(normalized);
      }
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

export function EditFileTagsDialog({
  file,
  files,
  open,
  onOpenChange,
  onSubmit,
}: EditFileTagsDialogProps) {
  const toast = useToast();
  const [tags, setTags] = useState<string[]>([]);

  const suggestions = useMemo(() => collectLibraryTags(files), [files]);
  const canSave = file != null && tags.length > 0;

  useEffect(() => {
    if (open && file) {
      setTags([...file.tags]);
    }
  }, [file, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTags([]);
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file || tags.length === 0) {
      return;
    }

    onSubmit(file.id, tags);
    toast.success({ title: "Tags saved" });
    handleOpenChange(false);
  };

  return (
    <ShellDialog
      bodyClassName="py-3"
      className="min-h-0"
      description={
        file ? (
          <span className="flex min-w-0 items-center gap-1">
            <span className="shrink-0">Keywords help Sage find</span>
            <TruncatedFilename
              className="font-medium text-foreground"
              maxWidthClass={TRUNCATE_PROSE_CLASS}
              title={file.file.name}
            />
          </span>
        ) : (
          "Keywords help Sage find this file."
        )
      }
      footer={
        <>
          <Button
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={!canSave} type="submit">
            Save tags
          </Button>
        </>
      }
      kind="form"
      onOpenChange={handleOpenChange}
      onSafeExit={() => handleOpenChange(false)}
      onSubmit={handleSubmit}
      open={open && file != null}
      size="sm"
      title="Edit tags"
    >
      <TagInput
        id="file-tags-input"
        onChange={setTags}
        suggestions={suggestions}
        value={tags}
      />
    </ShellDialog>
  );
}

```

---

### `src/components/preview-tabs/index.ts`

```ts
export { PreviewCenterPanel } from "./preview-center-panel";

```

---

### `src/components/preview-tabs/preview-center-panel.tsx`

```tsx
"use client";

import { PreviewStage } from "@/components/preview-tabs/preview-stage";
import { PreviewTabStrip } from "@/components/preview-tabs/preview-tab-strip";
import type { LibraryFile } from "@/lib/file-upload";
import { getActiveTab } from "@/lib/preview-tabs/selectors";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";

/** Matches `PANEL_SURFACE` in `page.tsx` — kept local since that constant
 * isn't exported (it's private to the app shell). */
const PANEL_SURFACE =
  "flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-background";

type PreviewCenterPanelProps = {
  /** When true and no tabs are open, the stage points at the file tree/upload instead of just "nothing open". */
  filesEmpty?: boolean;
  /** Library entries — used to resolve in-memory File blobs for standalone preview. */
  files?: LibraryFile[];
};

export function PreviewCenterPanel({ filesEmpty, files = [] }: PreviewCenterPanelProps) {
  const tabs = usePreviewTabsStore((state) => state.tabs);
  const activeTab = usePreviewTabsStore((state) => getActiveTab(state));
  const localFile =
    activeTab != null
      ? (files.find((entry) => entry.id === activeTab.resourceKey)?.file ?? null)
      : null;

  return (
    <section className={PANEL_SURFACE}>
      <PreviewTabStrip />
      <div className="min-h-0 flex-1 overflow-hidden">
        <PreviewStage
          activeTab={activeTab}
          filesEmpty={filesEmpty}
          hasTabs={tabs.length > 0}
          localFile={localFile}
        />
      </div>
    </section>
  );
}

```

---

### `src/components/preview-tabs/preview-tab-strip.tsx`

```tsx
"use client";

import { PreviewTabLane } from "@/components/preview-tabs/preview-tab-lane";
import "./preview-tab-chrome.css";
import {
  PANEL_HEADER_ROW_CLASS,
  PANEL_HEADER_ROW_WITH_TABS_CLASS,
  PANEL_HEADER_SETTINGS_CLASS,
  PANEL_HEADER_TABLIST_CLASS,
} from "@/components/preview-tabs/panel-header";
import { TabStripSettingsMenu } from "@/components/preview-tabs/tab-strip-settings-menu";
import { getOrderedTabs, getUnpinnedTabs } from "@/lib/preview-tabs/selectors";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";
import { cn } from "@/lib/utils";

export function PreviewTabStrip() {
  const state = usePreviewTabsStore();

  if (state.tabs.length === 0) {
    return <header className={PANEL_HEADER_ROW_CLASS} />;
  }

  const tabs = getOrderedTabs(state);
  const hasUnpinnedTabs = getUnpinnedTabs(state).length > 0;

  return (
    <header className={cn(PANEL_HEADER_ROW_WITH_TABS_CLASS, "min-w-0")}>
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-hidden">
        <div className={PANEL_HEADER_TABLIST_CLASS} role="tablist">
          <PreviewTabLane
            activeTabId={state.activeTabId}
            onClose={state.closeTab}
            onDuplicate={state.duplicateTab}
            onPin={state.pinTab}
            onSelect={state.focusTab}
            onUnpin={state.unpinTab}
            tabs={tabs}
          />
        </div>
      </div>

      <div className={PANEL_HEADER_SETTINGS_CLASS}>
        <TabStripSettingsMenu
          hasUnpinnedTabs={hasUnpinnedTabs}
          onCloseAllUnpinned={state.closeAllUnpinned}
        />
      </div>
    </header>
  );
}

```

---

### `src/components/preview-tabs/preview-tab-lane.tsx`

```tsx
"use client";

import { Fragment } from "react";

import { PreviewTab } from "@/components/preview-tabs/preview-tab";
import { TAB_MAX_WIDTH_PX } from "@/components/preview-tabs/use-tab-lane-compression";
import type {
  PreviewTab as PreviewTabType,
  TabId,
} from "@/lib/preview-tabs/types";

type PreviewTabLaneProps = {
  tabs: PreviewTabType[];
  activeTabId: TabId | null;
  onSelect: (tabId: TabId) => void;
  onPin: (tabId: TabId) => void;
  onUnpin: (tabId: TabId) => void;
  onDuplicate: (tabId: TabId) => void;
  onClose: (tabId: TabId) => void;
};

export function PreviewTabLane({
  tabs,
  activeTabId,
  onSelect,
  onPin,
  onUnpin,
  onDuplicate,
  onClose,
}: PreviewTabLaneProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex h-full min-w-0 flex-1 items-stretch overflow-x-hidden overflow-y-visible">
      {tabs.map((tab, index) => (
        <Fragment key={tab.tabId}>
          {index > 0 ? (
            <div aria-hidden className="preview-tab-divider shrink-0" />
          ) : null}
          <div
            className="preview-tab-lane-item flex h-full min-w-0 shrink grow basis-0 items-stretch"
            data-active={tab.tabId === activeTabId ? "" : undefined}
            style={{ maxWidth: TAB_MAX_WIDTH_PX }}
          >
            <PreviewTab
              isActive={tab.tabId === activeTabId}
              onClose={() => onClose(tab.tabId)}
              onDuplicate={() => onDuplicate(tab.tabId)}
              onPin={() => onPin(tab.tabId)}
              onSelect={() => onSelect(tab.tabId)}
              onUnpin={() => onUnpin(tab.tabId)}
              tab={tab}
            />
          </div>
        </Fragment>
      ))}
    </div>
  );
}

```

---

### `src/components/preview-tabs/preview-tab.tsx`

```tsx
"use client";

import { IconPin, IconX } from "@tabler/icons-react";
import { useState } from "react";

import { PreviewFileTypeIcon } from "@/components/preview-tabs/preview-file-type-icon";
import "./preview-tab-chrome.css";
import {
  PreviewTabContextMenu,
  type ContextMenuAnchor,
} from "@/components/preview-tabs/preview-tab-menu";
import { TruncatedFilenameText } from "@/components/preview-tabs/truncated-filename";
import {
  isIconOnlyWidth,
  TAB_MAX_WIDTH_PX,
  useElementWidth,
} from "@/components/preview-tabs/use-tab-lane-compression";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  canCloseTab,
  canDuplicateTab,
  canUnpinTab,
} from "@/lib/preview-tabs/selectors";
import type { PreviewTab as PreviewTabType } from "@/lib/preview-tabs/types";
import { cn } from "@/lib/utils";

type PreviewTabProps = {
  tab: PreviewTabType;
  isActive: boolean;
  onSelect: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onDuplicate: () => void;
  onClose: () => void;
};

export function PreviewTab({
  tab,
  isActive,
  onSelect,
  onPin,
  onUnpin,
  onDuplicate,
  onClose,
}: PreviewTabProps) {
  const [menuAnchor, setMenuAnchor] = useState<ContextMenuAnchor | null>(null);
  const { ref: tabRef, width: tabWidth } = useElementWidth<HTMLDivElement>();
  const isRemoved = tab.lifecycle === "removed";
  const isIconOnly = isIconOnlyWidth(tabWidth);
  const showTitle = !isIconOnly;
  const closable = canCloseTab(tab);
  const showTrailingAction = closable || tab.pinned;
  const tooltipLabel = isRemoved ? `${tab.title} (removed)` : tab.title;

  return (
    <div
      ref={tabRef}
      className={cn(
        "preview-tab-chrome group relative w-full min-w-8 text-sm",
        isActive
          ? "preview-tab-shaped"
          : "preview-tab-inactive h-9 bg-transparent text-muted-foreground",
        isRemoved && "opacity-70",
      )}
      style={{ maxWidth: TAB_MAX_WIDTH_PX }}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuAnchor({ x: event.clientX, y: event.clientY });
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-selected={isActive}
              className={cn(
                "absolute inset-y-0 left-0 z-0 flex min-w-0 cursor-pointer items-center gap-1 overflow-hidden px-2 text-left",
                showTrailingAction ? "right-7" : "right-2",
                isIconOnly && "px-1",
              )}
              onClick={onSelect}
              role="tab"
              type="button"
            />
          }
        >
          <PreviewFileTypeIcon
            className={
              isRemoved
                ? "shrink-0 text-destructive"
                : isActive
                  ? "shrink-0 text-foreground"
                  : "shrink-0 text-muted-foreground"
            }
            fileType={tab.fileType}
            title={tab.title}
          />
          {showTitle ? (
            <TruncatedFilenameText
              className="min-w-0 flex-1"
              title={tab.title}
            />
          ) : null}
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} variant="compact">
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>

      {showTrailingAction ? (
        <div
          className={cn(
            "absolute inset-y-0 right-0 z-10 flex w-7 items-center justify-center",
            // Close: hover-reveal on inactive. Pin stays visible (status).
            !isActive &&
              closable &&
              "opacity-0 focus-within:opacity-100 group-hover:opacity-100",
          )}
        >
          <Button
            aria-label={
              tab.pinned ? `Unpin ${tab.title}` : `Close ${tab.title}`
            }
            onClick={tab.pinned ? onUnpin : onClose}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            {tab.pinned ? (
              <IconPin aria-hidden className="size-3.5" stroke={2.2} />
            ) : (
              <IconX aria-hidden className="size-3.5" stroke={2.2} />
            )}
          </Button>
        </div>
      ) : null}

      <PreviewTabContextMenu
        anchor={menuAnchor}
        canClose={closable}
        canDuplicate={canDuplicateTab(tab)}
        canUnpin={canUnpinTab(tab)}
        onClose={onClose}
        onDismiss={() => setMenuAnchor(null)}
        onDuplicate={onDuplicate}
        onPin={onPin}
        onUnpin={onUnpin}
        open={menuAnchor !== null}
        pinned={tab.pinned}
      />
    </div>
  );
}

```

---

### `src/components/preview-tabs/preview-tab-menu.tsx`

```tsx
"use client";

import {
  IconCopy,
  IconPin,
  IconPinnedOff,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ContextMenuAnchor = {
  x: number;
  y: number;
};

type MenuPosition = {
  top: number;
  left: number;
};

function getMenuPosition(
  anchor: ContextMenuAnchor,
  menu: HTMLElement,
): MenuPosition {
  const menuRect = menu.getBoundingClientRect();
  const viewportPadding = 8;

  const openUpward =
    window.innerHeight - anchor.y < menuRect.height + viewportPadding &&
    anchor.y > window.innerHeight - anchor.y;

  const top = openUpward ? anchor.y - menuRect.height : anchor.y;
  const left = Math.min(
    Math.max(viewportPadding, anchor.x),
    window.innerWidth - menuRect.width - viewportPadding,
  );

  return { top, left };
}

type PreviewTabContextMenuProps = {
  open: boolean;
  anchor: ContextMenuAnchor | null;
  onDismiss: () => void;
  pinned: boolean;
  canClose: boolean;
  canDuplicate: boolean;
  canUnpin: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onDuplicate: () => void;
  onClose: () => void;
};

const ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted";
const DISABLED_ITEM_CLASS =
  "flex w-full cursor-not-allowed items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground opacity-50";
const DESTRUCTIVE_ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10";

/** Right-click menu for a tab, anchored at the pointer (Chrome-style — tabs carry no kebab button). */
export function PreviewTabContextMenu({
  open,
  anchor,
  onDismiss,
  pinned,
  canClose,
  canDuplicate,
  canUnpin,
  onPin,
  onUnpin,
  onDuplicate,
  onClose,
}: PreviewTabContextMenuProps) {
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchor || !menuRef.current) {
      setMenuPosition(null);
      return;
    }

    setMenuPosition(getMenuPosition(anchor, menuRef.current));
  }, [open, anchor]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      onDismiss();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", onDismiss);
    window.addEventListener("scroll", onDismiss, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", onDismiss);
      window.removeEventListener("scroll", onDismiss, true);
    };
  }, [open, onDismiss]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-40 rounded-lg border border-border bg-popover p-1 shadow-md"
      role="menu"
      style={
        menuPosition
          ? { top: menuPosition.top, left: menuPosition.left }
          : { top: -9999, left: -9999, visibility: "hidden" }
      }
    >
      {pinned ? (
        <button
          aria-disabled={!canUnpin}
          className={canUnpin ? ITEM_CLASS : DISABLED_ITEM_CLASS}
          disabled={!canUnpin}
          onClick={() => {
            onDismiss();
            onUnpin();
          }}
          role="menuitem"
          type="button"
        >
          <IconPinnedOff aria-hidden className="size-4" stroke={2.2} />
          Unpin
        </button>
      ) : (
        <button
          className={ITEM_CLASS}
          onClick={() => {
            onDismiss();
            onPin();
          }}
          role="menuitem"
          type="button"
        >
          <IconPin aria-hidden className="size-4" stroke={2.2} />
          Pin
        </button>
      )}

      <button
        aria-disabled={!canDuplicate}
        className={canDuplicate ? ITEM_CLASS : DISABLED_ITEM_CLASS}
        onClick={() => {
          if (!canDuplicate) return;
          onDismiss();
          onDuplicate();
        }}
        role="menuitem"
        type="button"
      >
        <IconCopy aria-hidden className="size-4" stroke={2.2} />
        Duplicate
      </button>

      <button
        aria-disabled={!canClose}
        className={canClose ? DESTRUCTIVE_ITEM_CLASS : DISABLED_ITEM_CLASS}
        onClick={() => {
          if (!canClose) return;
          onDismiss();
          onClose();
        }}
        role="menuitem"
        type="button"
      >
        <IconX aria-hidden className="size-4" stroke={2.2} />
        Close
      </button>
    </div>
  );

  return createPortal(menu, document.body);
}

```

---

### `src/components/preview-tabs/preview-stage.tsx`

```tsx
"use client";

import { IconAlertTriangle, IconFile } from "@tabler/icons-react";

import { FilePreviewRouter } from "@/components/preview-tabs/viewers/file-preview-router";
import { EmptyState } from "@/components/ui/empty";
import type { PreviewTab } from "@/lib/preview-tabs/types";

const ICON_SIZE_EMPTY = 16;

type PreviewStageProps = {
  activeTab: PreviewTab | null;
  hasTabs: boolean;
  filesEmpty?: boolean;
  /** In-memory File from the library when present (standalone mode / post-upload). */
  localFile?: File | null;
};

export function PreviewStage({
  activeTab,
  hasTabs,
  filesEmpty,
  localFile,
}: PreviewStageProps) {
  if (!hasTabs || !activeTab) {
    return (
      <EmptyState
        className="h-full px-4"
        description={
          filesEmpty
            ? "Upload documents, then click one in the left panel to preview it here."
            : "Select a file in the left panel to preview it here."
        }
        icon={<IconFile aria-hidden size={ICON_SIZE_EMPTY} stroke={2.2} />}
        title={filesEmpty ? "No files yet" : "Nothing open"}
      />
    );
  }

  if (activeTab.lifecycle === "removed" || activeTab.lifecycle === "error") {
    return (
      <EmptyState
        className="h-full px-4"
        description={
          activeTab.errorMessage ?? "This file is no longer available."
        }
        icon={
          <IconAlertTriangle aria-hidden size={ICON_SIZE_EMPTY} stroke={2.2} />
        }
        mediaClassName="bg-destructive/10 text-destructive"
        title="File could not be previewed"
      />
    );
  }

  if (activeTab.lifecycle === "loading") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4">
        <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return (
    <FilePreviewRouter localFile={localFile ?? null} tab={activeTab} />
  );
}

```

---

### `src/components/preview-tabs/preview-file-type-icon.tsx`

```tsx
import {
  IconFileTypeDocx,
  IconFileTypeJpg,
  IconFileTypePdf,
  IconFileTypePng,
  IconFileTypeTxt,
  IconGif,
  IconMarkdown,
  IconPhoto,
} from "@tabler/icons-react";
import { createElement, type ComponentType } from "react";

import { getExtension, type SageFileType } from "@/lib/file-upload";

const ICON_SIZE = 16;
const ICON_STROKE = 2.2;

type TablerIconProps = {
  size?: number;
  stroke?: number;
  className?: string;
  "aria-hidden"?: boolean;
};

const FILE_TYPE_ICONS: Record<
  Exclude<SageFileType, "image">,
  ComponentType<TablerIconProps>
> = {
  pdf: IconFileTypePdf,
  docx: IconFileTypeDocx,
  txt: IconFileTypeTxt,
  md: IconMarkdown,
};

function getImageIcon(title: string): ComponentType<TablerIconProps> {
  const extension = getExtension(title);
  if (extension === "jpg" || extension === "jpeg") return IconFileTypeJpg;
  if (extension === "png") return IconFileTypePng;
  if (extension === "gif") return IconGif;
  return IconPhoto;
}

/** Same icon mapping as `FileTypeIcon`, but keyed off a tab's `{ fileType, title }`
 * instead of a full `LibraryFile` — a preview tab may outlive the `LibraryFile`
 * it was opened from (e.g. after the file is removed). */
export function PreviewFileTypeIcon({
  fileType,
  title,
  className,
  size = ICON_SIZE,
}: {
  fileType: SageFileType;
  title: string;
  className?: string;
  size?: number;
}) {
  const Icon = fileType === "image" ? getImageIcon(title) : FILE_TYPE_ICONS[fileType];

  return createElement(Icon, {
    "aria-hidden": true,
    className: className ?? "shrink-0 text-muted-foreground",
    size,
    stroke: ICON_STROKE,
  });
}

```

---

### `src/components/preview-tabs/panel-header.ts`

```ts
/** Must match side-panel headers in `page.tsx` (`h-14` + `border-b`). */
export const PANEL_HEADER_ROW_CLASS =
  "flex h-14 w-full shrink-0 rounded-t-2xl border-b border-border bg-background";

/** Tab strip with open tabs — recessed well; border kept so inactive tabs
 * still sit on a separator; active chrome paints over it (see CSS). */
export const PANEL_HEADER_ROW_WITH_TABS_CLASS =
  "preview-tab-strip flex h-14 w-full shrink-0 overflow-visible rounded-t-2xl border-b border-border";

/** Tab gutter — left panel corner. */
export const PANEL_HEADER_TABLIST_CLASS =
  "flex min-w-0 flex-1 items-stretch overflow-x-hidden overflow-y-visible rounded-tl-2xl pl-2.5";

/** Strip settings — same short chrome as active tabs (height/align from CSS). */
export const PANEL_HEADER_SETTINGS_CLASS =
  "preview-tab-shaped preview-tab-settings flex shrink-0 items-center px-2";

```

---

### `src/components/preview-tabs/use-tab-lane-compression.ts`

```ts
"use client";

import { useEffect, useRef, useState } from "react";

/** Comfortable resting width before tabs start sharing space. */
export const TAB_MAX_WIDTH_PX = 124; // 7.75rem
/**
 * Below this width the label is hidden (icon + trailing action only).
 * Last resort after continuous flex-shrink has already narrowed the tab.
 */
export const TAB_ICON_ONLY_WIDTH_PX = 72;

/** Tracks a DOM node's rendered width via ResizeObserver. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const measure = () => setWidth(node.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

/** True once continuous shrink has left no room for a readable filename. */
export function isIconOnlyWidth(widthPx: number): boolean {
  return widthPx > 0 && widthPx < TAB_ICON_ONLY_WIDTH_PX;
}

```

---

### `src/components/preview-tabs/tab-strip-settings-menu.tsx`

```tsx
"use client";

import { IconDots } from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";

type MenuPosition = {
  top: number;
  left: number;
};

function getMenuPosition(
  trigger: HTMLElement,
  menu: HTMLElement,
): MenuPosition {
  const triggerRect = trigger.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const gap = 4;
  const viewportPadding = 8;

  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const openUpward =
    spaceBelow < menuRect.height + gap && spaceAbove > spaceBelow;

  const top = openUpward
    ? triggerRect.top - menuRect.height - gap
    : triggerRect.bottom + gap;

  const left = Math.min(
    Math.max(viewportPadding, triggerRect.right - menuRect.width),
    window.innerWidth - menuRect.width - viewportPadding,
  );

  return { top, left };
}

type TabStripSettingsMenuProps = {
  onCloseAllUnpinned: () => void;
  hasUnpinnedTabs: boolean;
};

const ITEM_CLASS =
  "flex w-full items-center justify-between gap-4 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

export function TabStripSettingsMenu({
  onCloseAllUnpinned,
  hasUnpinnedTabs,
}: TabStripSettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = () => {
    if (!triggerRef.current || !menuRef.current) {
      return;
    }

    setMenuPosition(getMenuPosition(triggerRef.current, menuRef.current));
  };

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    updateMenuPosition();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const handleReposition = () => {
      updateMenuPosition();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  const menu =
    open && typeof document !== "undefined" ? (
      <div
        ref={menuRef}
        className="fixed z-50 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-md"
        role="menu"
        style={
          menuPosition
            ? { top: menuPosition.top, left: menuPosition.left }
            : { top: -9999, left: -9999, visibility: "hidden" }
        }
      >
        <button
          className={ITEM_CLASS}
          disabled={!hasUnpinnedTabs}
          onClick={() => {
            setOpen(false);
            onCloseAllUnpinned();
          }}
          role="menuitem"
          type="button"
        >
          Close all unpinned
        </button>
      </div>
    ) : null;

  return (
    <div className="flex shrink-0 items-center" ref={triggerRef}>
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Tab strip settings"
        onClick={() => setOpen((current) => !current)}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <IconDots aria-hidden className="size-4" stroke={2.2} />
      </Button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

```

---

### `src/components/preview-tabs/truncated-filename.tsx`

```tsx
"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Shared max width for stage title — tabs use fixed tab chrome width instead. */
export const PREVIEW_FILENAME_STAGE_MAX_CLASS = "max-w-md";

type TruncatedFilenameTextProps = {
  title: string;
  className?: string;
  maxWidthClass?: string;
};

/** Ellipsis label only — pair with a parent tooltip when needed. */
export function TruncatedFilenameText({
  title,
  className,
  maxWidthClass,
}: TruncatedFilenameTextProps) {
  return (
    <span
      className={cn("block min-w-0 truncate", maxWidthClass, className)}
    >
      {title}
    </span>
  );
}

type TruncatedFilenameProps = TruncatedFilenameTextProps;

/** Truncated label + tooltip (stage / standalone). */
export function TruncatedFilename(props: TruncatedFilenameProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<TruncatedFilenameText {...props} />}
      />
      <TooltipContent side="bottom" sideOffset={6} variant="compact">
        {props.title}
      </TooltipContent>
    </Tooltip>
  );
}

```

---

### `src/components/preview-tabs/preview-tab-chrome.css`

```css
/* Tab chrome: rounded top, flush bottom into the stage.
 *
 * Active and hovered-inactive tabs share --tab-chrome-bg so one background
 * rule covers both. Dividers are siblings between lane items; any divider
 * that touches an active or hovered tab is hidden.
 */

:root {
  --preview-tab-curve: 0.625rem;
  /* Stronger recess than --muted so the tab well reads against the page chrome
   * (light muted is 0.97; dark muted matches the shell and would dissolve the strip). */
  --preview-tab-strip: oklch(0.93 0 0);
  --preview-tab-hover: color-mix(
    in oklab,
    var(--background) 45%,
    var(--preview-tab-strip)
  );
}

:root.dark {
  /* Mirror light: ~0.04 below --muted (0.145), still well below --background (0.205). */
  --preview-tab-strip: oklch(0.11 0 0);
}

.preview-tab-strip {
  background-color: var(--preview-tab-strip);
}

.preview-tab-shaped {
  --tab-chrome-bg: var(--background);
  position: relative;
  z-index: 10;
  height: 2.25rem;
  align-self: flex-end;
  /* Cover the strip's border-b so the active tab still bridges into the stage. */
  margin-bottom: -1px;
  padding-bottom: 1px;
  color: var(--foreground);
}

.preview-tab-inactive {
  position: relative;
  align-self: flex-end;
}

.preview-tab-inactive:hover,
.preview-tab-inactive:focus-within {
  --tab-chrome-bg: var(--preview-tab-hover);
  z-index: 5;
  color: var(--foreground);
}

.preview-tab-shaped,
.preview-tab-inactive:hover,
.preview-tab-inactive:focus-within {
  border-radius: var(--preview-tab-curve) var(--preview-tab-curve) 0 0;
  background-color: var(--tab-chrome-bg);
}

/* Between-tab dividers — sit in the tab band (h-9 at strip bottom). */
.preview-tab-divider {
  align-self: flex-end;
  width: 1px;
  height: 1rem;
  margin-bottom: 0.625rem; /* centers the 16px rule in the 36px tab band */
  background-color: color-mix(in oklab, var(--foreground) 22%, transparent);
}

.preview-tab-settings {
  margin-inline: 0.25rem 0;
}

/* Hide divider after the active tab. */
.preview-tab-lane-item[data-active] + .preview-tab-divider {
  background-color: transparent;
}

/* Hide divider before the active tab. */
.preview-tab-divider:has(+ .preview-tab-lane-item[data-active]) {
  background-color: transparent;
}

/* Hide divider after the hovered tab. */
.preview-tab-lane-item:has(.preview-tab-chrome:hover) + .preview-tab-divider {
  background-color: transparent;
}

/* Hide divider before the hovered tab. */
.preview-tab-divider:has(+ .preview-tab-lane-item:has(.preview-tab-chrome:hover)) {
  background-color: transparent;
}

```

---

### `src/components/preview-tabs/viewers/file-preview-router.tsx`

```tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { DocxTextViewer } from "@/components/preview-tabs/viewers/docx-text-viewer";
import { ImageViewer } from "@/components/preview-tabs/viewers/image-viewer";
import {
  PreviewFetchError,
  PreviewLoadingSkeleton,
} from "@/components/preview-tabs/viewers/preview-status";
import { TextViewer } from "@/components/preview-tabs/viewers/text-viewer";
import { useDebouncedViewState } from "@/components/preview-tabs/viewers/use-debounced-view-state";
import { usePreviewFileContent } from "@/components/preview-tabs/viewers/use-preview-file-content";
import type { PreviewTab } from "@/lib/preview-tabs/types";

const PdfViewer = dynamic(
  () =>
    import("@/components/preview-tabs/viewers/pdf-viewer").then(
      (mod) => mod.PdfViewer,
    ),
  {
    ssr: false,
    loading: () => <PreviewLoadingSkeleton />,
  },
);

type FilePreviewRouterProps = {
  tab: PreviewTab;
  /** In-memory File from the library when present (standalone mode / post-upload). */
  localFile?: File | null;
};

export function FilePreviewRouter({ tab, localFile }: FilePreviewRouterProps) {
  const content = usePreviewFileContent(tab.resourceKey, tab.fileType, localFile);
  const { viewState, patchViewState } = useDebouncedViewState(
    tab.tabId,
    tab.viewState,
  );

  if (content.status === "loading") {
    return <PreviewLoadingSkeleton />;
  }

  if (content.status === "error") {
    return <PreviewFetchError message={content.message} />;
  }

  if (tab.fileType === "pdf" && content.kind === "blob") {
    return (
      <PdfViewer
        file={content.blob}
        onViewStateChange={patchViewState}
        viewState={viewState}
      />
    );
  }

  if (tab.fileType === "image" && content.kind === "blob") {
    return (
      <ImageViewer
        blobUrl={content.blobUrl}
        onViewStateChange={patchViewState}
        title={tab.title}
        viewState={viewState}
      />
    );
  }

  if (
    (tab.fileType === "txt" || tab.fileType === "md") &&
    content.kind === "blob"
  ) {
    return (
      <BlobTextPreview
        blob={content.blob}
        onViewStateChange={patchViewState}
        viewState={viewState}
      />
    );
  }

  if (tab.fileType === "docx" && content.kind === "text") {
    return (
      <DocxTextViewer
        onViewStateChange={patchViewState}
        text={content.text}
        viewState={viewState}
      />
    );
  }

  return (
    <PreviewFetchError message="This file type cannot be previewed yet." />
  );
}

/** Decode a text blob once for txt/md viewers. */
function BlobTextPreview({
  blob,
  viewState,
  onViewStateChange,
}: {
  blob: Blob;
  viewState: PreviewTab["viewState"];
  onViewStateChange: (partial: Partial<PreviewTab["viewState"]>) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void blob
      .text()
      .then((value) => {
        if (!cancelled) {
          setText(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to decode text file.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [blob]);

  if (error) {
    return <PreviewFetchError message={error} />;
  }
  if (text === null) {
    return <PreviewLoadingSkeleton />;
  }
  return (
    <TextViewer
      onViewStateChange={onViewStateChange}
      text={text}
      viewState={viewState}
    />
  );
}

```

---

### `src/components/preview-tabs/viewers/pdf-viewer.tsx`

```tsx
"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import {
  PdfScrollModePill,
  type PdfScrollMode,
} from "@/components/preview-tabs/viewers/pdf-scroll-mode-pill";
import { Button } from "@/components/ui/button";
import type { ViewState } from "@/lib/preview-tabs/types";
import { cn } from "@/lib/utils";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const DEFAULT_ZOOM = 1;
const DEFAULT_PAGE = 1;
const DEFAULT_SCROLL_MODE: PdfScrollMode = "single";
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

type PdfViewerProps = {
  /** Blob URL or Blob — react-pdf accepts both. */
  file: string | Blob;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
};

export function PdfViewer({ file, viewState, onViewStateChange }: PdfViewerProps) {
  const page = viewState.page ?? DEFAULT_PAGE;
  const zoom = viewState.zoom ?? DEFAULT_ZOOM;
  const scrollMode = viewState.scrollMode ?? DEFAULT_SCROLL_MODE;
  const [numPages, setNumPages] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const restoredScroll = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || restoredScroll.current) {
      return;
    }
    if (typeof viewState.scrollTop === "number") {
      el.scrollTop = viewState.scrollTop;
    }
    restoredScroll.current = true;
  }, [viewState.scrollTop, numPages, scrollMode]);

  function setZoom(next: number) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    onViewStateChange({ zoom: clamped });
  }

  function setPage(next: number) {
    if (numPages === 0) {
      return;
    }
    const clamped = Math.min(numPages, Math.max(1, next));
    onViewStateChange({ page: clamped, scrollTop: 0 });
    if (scrollMode === "single") {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
      return;
    }
    requestAnimationFrame(() => {
      pageRefs.current.get(clamped)?.scrollIntoView({ block: "start" });
    });
  }

  function setScrollMode(next: PdfScrollMode) {
    if (next === scrollMode) {
      return;
    }
    onViewStateChange({
      scrollMode: next,
      scrollTop: next === "single" ? 0 : viewState.scrollTop,
    });
    restoredScroll.current = next === "continuous" ? false : true;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1">
        <Button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <IconChevronLeft aria-hidden className="size-3.5" stroke={2.2} />
        </Button>
        <span className="min-w-16 text-center text-xs text-muted-foreground">
          {page}
          {numPages > 0 ? ` / ${numPages}` : ""}
        </span>
        <Button
          aria-label="Next page"
          disabled={numPages === 0 || page >= numPages}
          onClick={() => setPage(page + 1)}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <IconChevronRight aria-hidden className="size-3.5" stroke={2.2} />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          aria-label="Zoom out"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => setZoom(zoom - ZOOM_STEP)}
          size="xs"
          type="button"
          variant="ghost"
        >
          −
        </Button>
        <span className="min-w-12 text-center text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          aria-label="Zoom in"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => setZoom(zoom + ZOOM_STEP)}
          size="xs"
          type="button"
          variant="ghost"
        >
          +
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <PdfScrollModePill onChange={setScrollMode} value={scrollMode} />
      </div>
      <div
        className={cn(
          "flex min-h-0 flex-1 overflow-auto bg-muted/30 p-4",
          scrollMode === "continuous" ? "flex-col items-center gap-4" : "justify-center",
        )}
        onScroll={(event) => {
          onViewStateChange({ scrollTop: event.currentTarget.scrollTop });
        }}
        ref={scrollRef}
      >
        <Document
          className={cn(
            "flex",
            scrollMode === "continuous" ? "flex-col items-center gap-4" : "justify-center",
          )}
          file={file}
          loading={
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
            </div>
          }
          onLoadSuccess={({ numPages: nextNumPages }) => {
            setNumPages(nextNumPages);
            if (page > nextNumPages) {
              onViewStateChange({ page: nextNumPages });
            }
          }}
        >
          {scrollMode === "continuous" && numPages > 0
            ? Array.from({ length: numPages }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <div
                    key={pageNumber}
                    ref={(node) => {
                      if (node) {
                        pageRefs.current.set(pageNumber, node);
                      } else {
                        pageRefs.current.delete(pageNumber);
                      }
                    }}
                  >
                    <Page pageNumber={pageNumber} scale={zoom} />
                  </div>
                );
              })
            : (
              <Page
                pageNumber={Math.min(page, Math.max(1, numPages || 1))}
                scale={zoom}
              />
            )}
        </Document>
      </div>
    </div>
  );
}

```

---

### `src/components/preview-tabs/viewers/image-viewer.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { ViewState } from "@/lib/preview-tabs/types";

const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

type ImageViewerProps = {
  blobUrl: string;
  title: string;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
};

export function ImageViewer({
  blobUrl,
  title,
  viewState,
  onViewStateChange,
}: ImageViewerProps) {
  const zoom = viewState.zoom ?? DEFAULT_ZOOM;
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredScroll = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || restoredScroll.current) {
      return;
    }
    if (typeof viewState.scrollTop === "number") {
      el.scrollTop = viewState.scrollTop;
    }
    restoredScroll.current = true;
  }, [viewState.scrollTop]);

  function setZoom(next: number) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    onViewStateChange({ zoom: clamped });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1">
        <Button
          aria-label="Zoom out"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => setZoom(zoom - ZOOM_STEP)}
          size="xs"
          type="button"
          variant="ghost"
        >
          −
        </Button>
        <span className="min-w-12 text-center text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          aria-label="Zoom in"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => setZoom(zoom + ZOOM_STEP)}
          size="xs"
          type="button"
          variant="ghost"
        >
          +
        </Button>
      </div>
      <div
        className="min-h-0 flex-1 overflow-auto"
        onScroll={(event) => {
          onViewStateChange({ scrollTop: event.currentTarget.scrollTop });
        }}
        ref={scrollRef}
      >
        <div className="flex min-h-full items-start justify-center p-4">
          {/* Blob URL from authenticated download — next/image cannot use opaque blobs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={title}
            className="max-w-none origin-top"
            src={blobUrl}
            style={{ width: `${zoom * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

```

---

### `src/components/preview-tabs/viewers/text-viewer.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";

import type { ViewState } from "@/lib/preview-tabs/types";

type TextViewerProps = {
  text: string;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
  emptyMessage?: string;
};

export function TextViewer({
  text,
  viewState,
  onViewStateChange,
  emptyMessage = "This file has no text content.",
}: TextViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredScroll = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || restoredScroll.current) {
      return;
    }
    if (typeof viewState.scrollTop === "number") {
      el.scrollTop = viewState.scrollTop;
    }
    restoredScroll.current = true;
  }, [viewState.scrollTop]);

  if (!text.trim()) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className="h-full min-h-0 overflow-auto p-4"
      onScroll={(event) => {
        onViewStateChange({ scrollTop: event.currentTarget.scrollTop });
      }}
      ref={scrollRef}
    >
      <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">
        {text}
      </pre>
    </div>
  );
}

```

---

### `src/components/preview-tabs/viewers/docx-text-viewer.tsx`

```tsx
"use client";

import { TextViewer } from "@/components/preview-tabs/viewers/text-viewer";
import type { ViewState } from "@/lib/preview-tabs/types";

type DocxTextViewerProps = {
  text: string;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
};

export function DocxTextViewer({
  text,
  viewState,
  onViewStateChange,
}: DocxTextViewerProps) {
  return (
    <TextViewer
      emptyMessage="No extracted text yet — the file may still be ingesting, or extraction found nothing."
      onViewStateChange={onViewStateChange}
      text={text}
      viewState={viewState}
    />
  );
}

```

---

### `src/components/preview-tabs/viewers/preview-status.tsx`

```tsx
"use client";

import { IconAlertTriangle } from "@tabler/icons-react";

import { EmptyState } from "@/components/ui/empty";

const ICON_SIZE = 16;

export function PreviewLoadingSkeleton() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4">
      <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
    </div>
  );
}

export function PreviewFetchError({ message }: { message: string }) {
  return (
    <EmptyState
      className="h-full px-4"
      description={message}
      icon={<IconAlertTriangle aria-hidden size={ICON_SIZE} stroke={2.2} />}
      mediaClassName="bg-destructive/10 text-destructive"
      title="Could not load preview"
    />
  );
}

```

---

### `src/components/preview-tabs/viewers/use-preview-file-content.ts`

```ts
"use client";

import { useEffect, useState } from "react";

import {
  downloadBackendFile,
  fetchBackendFileText,
  isBackendConfigured,
} from "@/lib/files/api";
import type { SageFileType } from "@/lib/file-upload";

type CachedBlob = { kind: "blob"; blob: Blob };
type CachedText = { kind: "text"; text: string };
type Cached = CachedBlob | CachedText;

/** Survives remounts within the session so focusing the same file skips a re-download. */
const contentCache = new Map<string, Cached>();

export type PreviewFileContent =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; kind: "blob"; blob: Blob; blobUrl: string }
  | { status: "ready"; kind: "text"; text: string };

function usesExtractedText(fileType: SageFileType): boolean {
  return fileType === "docx";
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Failed to load file preview.";
}

function hasLocalBytes(localFile: File | Blob | null | undefined): localFile is File | Blob {
  return Boolean(localFile && localFile.size > 0);
}

/**
 * Resolve preview bytes/text for a tab.
 * Prefers an in-memory `File` from the library (standalone / just-uploaded),
 * otherwise hits the backend. Docx always needs `/text` when no local path exists.
 */
export function usePreviewFileContent(
  resourceKey: string,
  fileType: SageFileType,
  localFile?: File | Blob | null,
): PreviewFileContent {
  const [content, setContent] = useState<PreviewFileContent>({ status: "loading" });
  const localSize = localFile?.size ?? 0;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setContent({ status: "loading" });

      try {
        // Standalone / just-uploaded: use the browser File we already have.
        if (hasLocalBytes(localFile) && !usesExtractedText(fileType)) {
          const blob: Blob = localFile;
          if (cancelled) {
            return;
          }
          contentCache.set(resourceKey, { kind: "blob", blob });
          objectUrl = URL.createObjectURL(blob);
          setContent({
            status: "ready",
            kind: "blob",
            blob,
            blobUrl: objectUrl,
          });
          return;
        }

        if (usesExtractedText(fileType) && hasLocalBytes(localFile) && !isBackendConfigured()) {
          if (cancelled) {
            return;
          }
          setContent({
            status: "error",
            message:
              "Word (.docx) preview needs the backend’s extracted text. Set NEXT_PUBLIC_API_URL and upload while connected.",
          });
          return;
        }

        const cached = contentCache.get(resourceKey);
        if (cached) {
          if (cancelled) {
            return;
          }
          if (cached.kind === "text") {
            setContent({ status: "ready", kind: "text", text: cached.text });
            return;
          }
          objectUrl = URL.createObjectURL(cached.blob);
          setContent({
            status: "ready",
            kind: "blob",
            blob: cached.blob,
            blobUrl: objectUrl,
          });
          return;
        }

        if (usesExtractedText(fileType)) {
          const text = await fetchBackendFileText(resourceKey);
          if (cancelled) {
            return;
          }
          contentCache.set(resourceKey, { kind: "text", text });
          setContent({ status: "ready", kind: "text", text });
          return;
        }

        const blob = await downloadBackendFile(resourceKey);
        if (cancelled) {
          return;
        }
        contentCache.set(resourceKey, { kind: "blob", blob });
        objectUrl = URL.createObjectURL(blob);
        setContent({
          status: "ready",
          kind: "blob",
          blob,
          blobUrl: objectUrl,
        });
      } catch (err) {
        if (cancelled) {
          return;
        }
        setContent({ status: "error", message: errorMessage(err) });
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resourceKey, fileType, localFile, localSize]);

  return content;
}

/** Test / hot-reload helper — not used by production UI. */
export function clearPreviewFileContentCache() {
  contentCache.clear();
}

```

---

### `src/components/preview-tabs/viewers/use-debounced-view-state.ts`

```ts
"use client";

import { useEffect, useRef, useState } from "react";

import { createDebouncedCallback } from "@/components/preview-tabs/viewers/create-debounced-callback";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";
import type { TabId, ViewState } from "@/lib/preview-tabs/types";

const DEBOUNCE_MS = 200;

/**
 * Local viewState for instant UI; debounced writes to the tab store.
 * Schedules the full local snapshot (not a single field) so rapid page+zoom
 * edits coalesce without dropping earlier keys. Flushes on unmount.
 */
export function useDebouncedViewState(tabId: TabId, initial: ViewState) {
  const updateViewState = usePreviewTabsStore((state) => state.updateViewState);
  const [viewState, setViewState] = useState<ViewState>(initial);

  const debouncedRef = useRef(
    createDebouncedCallback((snapshot: ViewState) => {
      updateViewState(tabId, snapshot);
    }, DEBOUNCE_MS),
  );

  useEffect(() => {
    const debounced = createDebouncedCallback((snapshot: ViewState) => {
      updateViewState(tabId, snapshot);
    }, DEBOUNCE_MS);
    debouncedRef.current = debounced;
    return () => {
      debounced.flush();
    };
  }, [tabId, updateViewState]);

  function patchViewState(partial: Partial<ViewState>) {
    setViewState((prev) => {
      const next = { ...prev, ...partial };
      debouncedRef.current.schedule(next);
      return next;
    });
  }

  return { viewState, patchViewState } as const;
}

```

---

### `src/components/preview-tabs/viewers/create-debounced-callback.ts`

```ts
/** Schedule calls so only the latest value is delivered after `delayMs` idle. */
export function createDebouncedCallback<T>(
  fn: (value: T) => void,
  delayMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | undefined;
  let hasPending = false;

  return {
    schedule(value: T) {
      pending = value;
      hasPending = true;
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        if (!hasPending) {
          return;
        }
        hasPending = false;
        const next = pending as T;
        pending = undefined;
        fn(next);
      }, delayMs);
    },
    flush() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (!hasPending) {
        return;
      }
      hasPending = false;
      const next = pending as T;
      pending = undefined;
      fn(next);
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      hasPending = false;
      pending = undefined;
    },
  };
}

export type DebouncedCallback<T> = ReturnType<typeof createDebouncedCallback<T>>;

```

---

### `src/components/preview-tabs/viewers/pdf-scroll-mode-pill.tsx`

```tsx
"use client";

import { IconChevronDown } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type PdfScrollMode = "single" | "continuous";

const OPTIONS: { value: PdfScrollMode; label: string }[] = [
  { value: "continuous", label: "Continuous" },
  { value: "single", label: "Single" },
];

/**
 * Shared morph timing — caret rotate + option expand/collapse must use the
 * same duration and easing so they read as one motion, not a sequence.
 * (motion-design: on-screen morph → ease-in-out-cubic, ~240ms)
 */
const MORPH_MS = 240;
const MORPH_EASE = "cubic-bezier(0.645, 0.045, 0.355, 1)";
const morphStyle = {
  transitionDuration: `${MORPH_MS}ms`,
  transitionTimingFunction: MORPH_EASE,
} as const;

type PdfScrollModePillProps = {
  value: PdfScrollMode;
  onChange: (value: PdfScrollMode) => void;
};

/**
 * Expand-in-place pill: closed shows current mode + caret;
 * open reveals both options in the same shell. Caret points toward
 * expand (down) when closed and collapse (up) when open.
 */
export function PdfScrollModePill({ value, onChange }: PdfScrollModePillProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="inline-flex h-7 items-stretch overflow-hidden rounded-full border border-border bg-background text-xs shadow-sm"
    >
      {OPTIONS.map((option, index) => {
        const selected = value === option.value;
        const visible = open || selected;

        return (
          <div key={option.value} className="flex min-w-0 items-stretch">
            {index > 0 ? (
              <div
                aria-hidden
                className="shrink-0 bg-border"
                style={{
                  ...morphStyle,
                  transitionProperty: "width, opacity",
                  width: open ? 1 : 0,
                  opacity: open ? 1 : 0,
                }}
              />
            ) : null}
            {/*
              grid 0fr→1fr animates real width from frame 1 (unlike max-width),
              so it tracks the caret rotate instead of lagging behind it.
            */}
            <div
              className="grid min-w-0"
              style={{
                ...morphStyle,
                transitionProperty: "grid-template-columns",
                gridTemplateColumns: visible ? "1fr" : "0fr",
              }}
            >
              <div className="min-w-0 overflow-hidden">
                <button
                  aria-pressed={selected}
                  className={cn(
                    "h-7 whitespace-nowrap px-2.5 font-medium outline-none",
                    "transition-colors duration-[240ms] ease-[cubic-bezier(.645,.045,.355,1)]",
                    selected
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                  onClick={() => {
                    if (!open) {
                      setOpen(true);
                      return;
                    }
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={{
                    ...morphStyle,
                    transitionProperty: "opacity",
                    opacity: visible ? 1 : 0,
                  }}
                  tabIndex={visible ? 0 : -1}
                  type="button"
                >
                  {option.label}
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div aria-hidden className="w-px shrink-0 bg-border" />
      <button
        aria-expanded={open}
        aria-label={open ? "Collapse scroll mode" : "Change scroll mode"}
        className="flex items-center px-1.5 text-muted-foreground outline-none hover:bg-muted/50 hover:text-foreground focus-visible:bg-muted"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <IconChevronDown
          aria-hidden
          className="size-3.5 origin-center"
          stroke={2.2}
          style={{
            ...morphStyle,
            transitionProperty: "transform",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
    </div>
  );
}

```

---

### `src/components/ui/button.tsx`

```tsx
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-gradient-to-b from-primary to-[color-mix(in_oklch,var(--primary),black_8%)] text-primary-foreground shadow-[0_1px_2px_rgb(0_0_0_/0.08),0_4px_12px_rgb(0_0_0_/0.10),inset_0_1px_0_rgb(255_255_255_/0.12)] hover:brightness-[0.96] active:shadow-[0_1px_2px_rgb(0_0_0_/0.08)]",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-full px-2.5 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-full px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-lg),12px)] in-data-[slot=button-group]:rounded-xl [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-lg),14px)] in-data-[slot=button-group]:rounded-xl",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }

```

---

### `src/components/ui/tooltip.tsx`

```tsx
"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  variant = "default",
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  > & {
    variant?: "default" | "compact"
  }) {
  const isCompact = variant === "compact"

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            isCompact
              ? "z-50 max-w-xs rounded-md border-none bg-black px-2.5 py-1.5 text-[12px] font-semibold leading-snug break-words whitespace-normal text-white shadow-md data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
              : "z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow
            className={cn(
              "z-50 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5",
              isCompact
                ? "size-2 bg-black fill-black"
                : "size-2.5 bg-foreground fill-foreground",
            )}
          />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

```

---

### `src/components/ui/empty.tsx`

```tsx
import type { ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border-dashed p-6 text-center text-balance",
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex max-w-sm flex-col items-center gap-2", className)}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn(
        "font-heading text-sm font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-sm text-balance",
        className
      )}
      {...props}
    />
  )
}

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description?: ReactNode
  /** Optional CTA (usually a `Button`). */
  action?: ReactNode
  className?: string
  /** Extra classes on the icon disc (e.g. destructive tint). */
  mediaClassName?: string
}

/**
 * Canonical empty state — own this instead of composing Empty* primitives.
 * Panel fills: pass `className="h-full border-none px-4"`.
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  mediaClassName,
}: EmptyStateProps) {
  return (
    <Empty className={cn("border-none", className)}>
      <EmptyHeader>
        <EmptyMedia className={mediaClassName} variant="icon">
          {icon}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
  EmptyState,
}

```

---

### `src/components/ui/input.tsx`

```tsx
import type { ReactNode } from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/** Crisp field chrome — owned by Input; use for groups (chat composer, etc.). */
export const INPUT_SHELL =
  "rounded-lg border border-foreground/20 bg-background transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40"

/** Text control styles shared by bare Input and InputGroupControl. */
export const INPUT_CONTROL =
  "min-w-0 bg-transparent text-sm leading-normal text-foreground outline-none placeholder:text-muted-foreground/65 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"

type InputProps = InputPrimitive.Props & {
  /** Trailing actions (send, mic, …). Switches to group chrome owned by Input. */
  trailing?: ReactNode
  groupClassName?: string
}

function Input({ className, trailing, groupClassName, ...props }: InputProps) {
  if (trailing) {
    return (
      <div
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-0.5 py-0.5 pl-3.5 pr-0.5",
          INPUT_SHELL,
          groupClassName
        )}
        data-slot="input-group"
      >
        <InputPrimitive
          data-slot="input"
          className={cn(INPUT_CONTROL, "h-full flex-1 truncate", className)}
          {...props}
        />
        {trailing}
      </div>
    )
  }

  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        "h-10 w-full px-3.5",
        INPUT_SHELL,
        INPUT_CONTROL,
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }

```

---

### `src/components/ui/dialog.tsx`

```tsx
"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { IconX } from "@tabler/icons-react";
import { createContext, useContext, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DialogKind = "form" | "confirm";
export type DialogSize = "sm" | "lg" | "xl";
type DialogVariant = "shell" | "legacy";

const DialogVariantContext = createContext<DialogVariant>("legacy");

function DialogVariantProvider({
  variant,
  children,
}: {
  variant: DialogVariant;
  children: ReactNode;
}) {
  return (
    <DialogVariantContext.Provider value={variant}>
      {children}
    </DialogVariantContext.Provider>
  );
}

function useDialogVariant() {
  return useContext(DialogVariantContext);
}

const DIALOG_SIZE_CLASS: Record<DialogSize, string> = {
  sm: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
};

/** Shell frame — uses `--dialog-shell-*` tokens from globals.css */
const DIALOG_SHELL_CLASS =
  "flex max-h-[var(--dialog-shell-max-h)] min-h-[var(--dialog-shell-min-h)] flex-col gap-0 overflow-hidden p-0";

const DIALOG_SHELL_HEADER_CLASS =
  "min-w-0 shrink-0 space-y-1 overflow-hidden border-b border-border px-dialog-shell-x py-dialog-shell-header-y pr-14";

const DIALOG_SHELL_BODY_CLASS =
  "min-h-0 flex-1 overflow-y-auto px-dialog-shell-x py-dialog-shell-body-y";

const DIALOG_SHELL_FOOTER_CLASS =
  "flex shrink-0 justify-end gap-2 border-t border-border px-dialog-shell-x py-dialog-shell-footer-y";

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

type DialogContentProps = {
  className?: string;
  children: ReactNode;
  variant?: "shell" | "legacy";
  kind?: DialogKind;
  size?: DialogSize;
  onSafeExit?: () => void;
};

function DialogContent({
  className,
  children,
  variant = "legacy",
  kind = "form",
  size = "sm",
  onSafeExit,
}: DialogContentProps) {
  const handleClose = () => {
    onSafeExit?.();
  };

  if (variant === "legacy") {
    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
            className
          )}
        >
          <DialogPrimitive.Close
            aria-label="Close dialog"
            className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <IconX aria-hidden="true" className="size-4" stroke={2.2} />
          </DialogPrimitive.Close>
          <DialogVariantProvider variant="legacy">
            {children}
          </DialogVariantProvider>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    );
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <DialogPrimitive.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-lg outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
          DIALOG_SHELL_CLASS,
          DIALOG_SIZE_CLASS[size],
          className
        )}
      >
        <DialogPrimitive.Close
          aria-label={kind === "form" ? "Discard changes" : "Cancel"}
          className="absolute top-4 right-4 z-10 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={handleClose}
        >
          <IconX aria-hidden="true" className="size-4" stroke={2.2} />
        </DialogPrimitive.Close>
        <DialogVariantProvider variant="shell">{children}</DialogVariantProvider>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const variant = useDialogVariant();

  return (
    <div
      className={cn(
        variant === "shell"
          ? DIALOG_SHELL_HEADER_CLASS
          : "mb-4 space-y-1.5 pr-8",
        className
      )}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(DIALOG_SHELL_BODY_CLASS, className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "min-w-0 truncate font-heading text-lg font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <DialogPrimitive.Description
      className={cn("min-w-0 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const variant = useDialogVariant();

  return (
    <div
      className={cn(
        variant === "shell"
          ? DIALOG_SHELL_FOOTER_CLASS
          : "mt-6 flex justify-end gap-2",
        className
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};

```

---

### `src/components/ui/shell-dialog.tsx`

```tsx
"use client";

import type { FormEvent, ReactNode } from "react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogKind,
  type DialogSize,
} from "@/components/ui/dialog";

type ShellDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: DialogSize;
  kind?: DialogKind;
  title: string;
  description?: ReactNode;
  onSafeExit?: () => void;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  headerExtra?: ReactNode;
  footer: ReactNode;
  children?: ReactNode;
  /** When set, wraps header/body/footer in a `<form>`. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

/**
 * Shared dialog shell chrome (bordered header + scroll body + bordered footer).
 * Spacing comes from `--dialog-shell-*` tokens in `globals.css`.
 * Prefer this over hand-rolling `variant="shell"` layout.
 */
export function ShellDialog({
  open,
  onOpenChange,
  size = "sm",
  kind = "form",
  title,
  description,
  onSafeExit,
  className,
  bodyClassName,
  headerClassName,
  footerClassName,
  headerExtra,
  footer,
  children,
  onSubmit,
}: ShellDialogProps) {
  const chrome = (
    <>
      <DialogHeader className={headerClassName}>
        <DialogTitle title={title}>{title}</DialogTitle>
        {description ? (
          <DialogDescription className="min-w-0">{description}</DialogDescription>
        ) : null}
        {headerExtra}
      </DialogHeader>

      {children != null ? (
        <DialogBody className={bodyClassName}>{children}</DialogBody>
      ) : null}

      <DialogFooter className={footerClassName}>{footer}</DialogFooter>
    </>
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={className}
        kind={kind}
        onSafeExit={onSafeExit}
        size={size}
        variant="shell"
      >
        {onSubmit ? (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={onSubmit}
          >
            {chrome}
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{chrome}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

```

---

### `src/components/ui/confirm-dialog.tsx`

```tsx
"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { ShellDialog } from "@/components/ui/shell-dialog";
import type { DialogSize } from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: DialogSize;
  title: string;
  description?: ReactNode;
  safeExitLabel?: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  isConfirming?: boolean;
  destructive?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  size = "sm",
  title,
  description,
  safeExitLabel = "Cancel",
  confirmLabel,
  onConfirm,
  isConfirming = false,
  destructive = true,
}: ConfirmDialogProps) {
  const handleSafeExit = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleConfirm = useCallback(async () => {
    await onConfirm();
    onOpenChange(false);
  }, [onConfirm, onOpenChange]);

  return (
    <ShellDialog
      description={description}
      footer={
        <>
          <Button
            autoFocus={open}
            disabled={isConfirming}
            onClick={handleSafeExit}
            type="button"
            variant="outline"
          >
            {safeExitLabel}
          </Button>
          <Button
            disabled={isConfirming}
            onClick={() => void handleConfirm()}
            type="button"
            variant={destructive ? "destructive" : "default"}
          >
            {isConfirming ? `${confirmLabel}…` : confirmLabel}
          </Button>
        </>
      }
      kind="confirm"
      onOpenChange={onOpenChange}
      onSafeExit={handleSafeExit}
      open={open}
      size={size}
      title={title}
    />
  );
}

```

---

### `src/components/ui/tag-input.tsx`

```tsx
"use client";

import { IconX } from "@tabler/icons-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { INPUT_SHELL } from "@/components/ui/input";
import { TRUNCATE_CHIP_MAX_CLASS, TRUNCATE_ROW_CLASS } from "@/lib/ui/truncate";
import { cn } from "@/lib/utils";

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

/** Rank autocomplete: prefix matches first, then substring. */
function rankSuggestions(tags: string[], query: string): string[] {
  if (!query) {
    return tags;
  }
  const prefix: string[] = [];
  const rest: string[] = [];
  for (const tag of tags) {
    if (tag.startsWith(query)) {
      prefix.push(tag);
    } else if (tag.includes(query)) {
      rest.push(tag);
    }
  }
  return [...prefix, ...rest];
}

/** Viewport point just under the draft caret (single-line input). */
function getDraftCaretAnchor(input: HTMLInputElement): { top: number; left: number } {
  const rect = input.getBoundingClientRect();
  const style = window.getComputedStyle(input);
  const caretIndex = input.selectionStart ?? input.value.length;
  const beforeCaret = input.value.slice(0, caretIndex);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  let textWidth = 0;
  if (context) {
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    textWidth = context.measureText(beforeCaret).width;
  }

  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
  const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
  const caretLeft =
    rect.left + paddingLeft + borderLeft + textWidth - input.scrollLeft;

  // Keep the menu on-screen horizontally (menu min-width ≈ 8.4rem).
  const menuMinWidth = 8.415 * 16;
  const maxLeft = window.innerWidth - menuMinWidth - 8;
  const left = Math.max(8, Math.min(caretLeft, maxLeft));

  return { top: rect.bottom + 6, left };
}

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags from other files — shown in the focus popover / autocomplete. */
  suggestions?: string[];
  id?: string;
  className?: string;
};

export function TagInput({
  value,
  onChange,
  suggestions = [],
  id,
  className,
}: TagInputProps) {
  const listId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );

  const filteredSuggestions = useMemo(() => {
    const selected = new Set(value);
    const query = normalizeTag(draft);
    const available = suggestions.filter((tag) => !selected.has(tag));
    return rankSuggestions(available, query).slice(0, 12);
  }, [suggestions, value, draft]);

  const popoverOpen =
    focused && renamingIndex === null && filteredSuggestions.length > 0;

  useLayoutEffect(() => {
    if (!popoverOpen) {
      setMenuPos(null);
      return;
    }

    const update = () => {
      const input = draftRef.current;
      if (!input) {
        return;
      }
      setMenuPos(getDraftCaretAnchor(input));
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    document.addEventListener("selectionchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.removeEventListener("selectionchange", update);
    };
  }, [popoverOpen, value.length, draft]);

  useEffect(() => {
    setHighlight(0);
  }, [draft, popoverOpen]);

  useEffect(() => {
    if (renamingIndex !== null) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [renamingIndex]);

  const commitDraft = (raw: string) => {
    const next = normalizeTag(raw);
    if (!next) {
      return;
    }
    if (value.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...value, next]);
    setDraft("");
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const commitRename = () => {
    if (renamingIndex === null) {
      return;
    }
    const next = normalizeTag(renameDraft);
    if (!next) {
      setRenamingIndex(null);
      setRenameDraft("");
      return;
    }
    const duplicate = value.some(
      (tag, i) => i !== renamingIndex && tag === next
    );
    if (duplicate) {
      setRenamingIndex(null);
      setRenameDraft("");
      return;
    }
    onChange(value.map((tag, i) => (i === renamingIndex ? next : tag)));
    setRenamingIndex(null);
    setRenameDraft("");
  };

  const onDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && popoverOpen) {
      event.preventDefault();
      setHighlight((current) =>
        current + 1 >= filteredSuggestions.length ? 0 : current + 1
      );
      return;
    }
    if (event.key === "ArrowUp" && popoverOpen) {
      event.preventDefault();
      setHighlight((current) =>
        current <= 0 ? filteredSuggestions.length - 1 : current - 1
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (popoverOpen && filteredSuggestions[highlight]) {
        commitDraft(filteredSuggestions[highlight]);
        return;
      }
      commitDraft(draft);
      return;
    }
    if (event.key === "Escape") {
      setFocused(false);
      draftRef.current?.blur();
    }
  };

  const onRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setRenamingIndex(null);
      setRenameDraft("");
    }
  };

  const suggestionsMenu =
    popoverOpen && menuPos && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={listRef}
            className="fixed z-100 max-h-56 min-w-[8.415rem] max-w-xs overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
            id={listId}
            role="listbox"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {filteredSuggestions.map((tag, index) => (
              <li key={tag} role="presentation">
                <button
                  aria-selected={index === highlight}
                  className={cn(
                    TRUNCATE_ROW_CLASS,
                    "block rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                    index === highlight
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commitDraft(tag);
                    draftRef.current?.focus();
                  }}
                  onMouseEnter={() => setHighlight(index)}
                  role="option"
                  type="button"
                >
                  {tag}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <>
      <div
        ref={shellRef}
        className={cn(
          "flex w-full min-w-0 flex-wrap items-center gap-1.5 px-2.5 py-1.5",
          INPUT_SHELL,
          focused && "border-ring ring-2 ring-ring/40",
          className
        )}
        data-slot="tag-input"
        onMouseDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, input")) {
            return;
          }
          event.preventDefault();
          draftRef.current?.focus();
        }}
      >
        {value.map((tag, index) =>
          renamingIndex === index ? (
            <input
              key={`rename-${tag}`}
              ref={renameRef}
              aria-label={`Rename tag ${tag}`}
              className={cn(
                "h-7 min-w-16 rounded-full border border-ring bg-background px-2.5 text-xs text-foreground outline-none",
                TRUNCATE_CHIP_MAX_CLASS
              )}
              onBlur={commitRename}
              onChange={(event) => setRenameDraft(event.target.value)}
              onKeyDown={onRenameKeyDown}
              value={renameDraft}
            />
          ) : (
            <span
              key={`${tag}-${index}`}
              className={cn(
                "inline-flex h-7 w-fit shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 text-xs font-medium text-foreground",
                TRUNCATE_CHIP_MAX_CLASS
              )}
            >
              <button
                className="min-w-0 truncate text-left hover:underline"
                onClick={() => {
                  setRenamingIndex(index);
                  setRenameDraft(tag);
                }}
                title={tag}
                type="button"
              >
                {tag}
              </button>
              <button
                aria-label={`Remove ${tag}`}
                className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                onClick={() => removeAt(index)}
                type="button"
              >
                <IconX aria-hidden size={12} stroke={2.4} />
              </button>
            </span>
          )
        )}
        <input
          ref={draftRef}
          aria-autocomplete="list"
          aria-controls={popoverOpen ? listId : undefined}
          aria-expanded={popoverOpen}
          autoComplete="off"
          className="h-7 min-w-[3ch] flex-1 basis-[3ch] bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/65"
          id={id}
          onBlur={() => {
            window.setTimeout(() => {
              const active = document.activeElement;
              if (
                listRef.current?.contains(active) ||
                shellRef.current?.contains(active)
              ) {
                return;
              }
              setFocused(false);
            }, 0);
          }}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onDraftKeyDown}
          placeholder={value.length === 0 ? "Add a tag" : undefined}
          role="combobox"
          value={draft}
        />
      </div>
      {suggestionsMenu}
    </>
  );
}

```

---

### `src/components/ui/toast-card.tsx`

```tsx
"use client";

import {
  IconAlertCircle,
  IconCircleCheck,
  IconCloudUpload,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import type { ToastRecord } from "@/lib/toast/types";
import { cn } from "@/lib/utils";

const VARIANT_ICON = {
  success: IconCircleCheck,
  error: IconAlertCircle,
  info: IconInfoCircle,
  progress: IconCloudUpload,
} as const;

const VARIANT_ICON_CLASS = {
  success: "text-emerald-600",
  error: "text-destructive",
  info: "text-foreground",
  progress: "text-foreground",
} as const;

type ToastCardProps = {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
};

export function ToastCard({
  toast,
  onDismiss,
  onPause,
  onResume,
}: ToastCardProps) {
  const Icon = VARIANT_ICON[toast.variant];

  return (
    <div
      className="group pointer-events-auto relative w-full rounded-2xl border border-border bg-card px-3 py-2 shadow-lg"
      onMouseEnter={() => onPause(toast.id)}
      onMouseLeave={() => onResume(toast.id)}
      role="status"
    >
      <Button
        aria-label="Dismiss"
        className="absolute -top-1.5 -left-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={() => onDismiss(toast.id)}
        size="icon-xs"
        type="button"
        variant="outline"
      >
        <IconX aria-hidden="true" stroke={2.2} />
      </Button>

      <div className="flex items-start gap-2.5">
        <Icon
          aria-hidden="true"
          className={cn("mt-0.5 size-5 shrink-0", VARIANT_ICON_CLASS[toast.variant])}
          stroke={2.2}
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{toast.title}</p>
          {toast.description ? (
            <p className="text-sm text-muted-foreground">{toast.description}</p>
          ) : null}

          {toast.variant === "progress" && toast.progress !== undefined ? (
            <div className="space-y-1.5 pt-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, toast.progress))}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(toast.progress)}%
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

```

---

### `src/components/providers/toast-provider.tsx`

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { ToastCard } from "@/components/ui/toast-card";
import type { ToastInput, ToastRecord } from "@/lib/toast/types";

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

/** Above dialog backdrop/popup (`z-50`) so toasts stay visible after Save. */
const TOAST_HOST_CLASS =
  "pointer-events-none fixed top-14 right-2 z-[100] flex w-[min(17rem,calc(100vw-2rem))] flex-col gap-2";

type ToastContextValue = {
  success: (input: ToastInput) => string;
  error: (input: ToastInput) => string;
  info: (input: ToastInput) => string;
  progress: (input: ToastInput & { progress?: number }) => string;
  update: (id: string, input: Partial<ToastInput & { progress?: number }>) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  return crypto.randomUUID();
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const timersRef = useRef<Map<string, number>>(new Map());
  const pausedRef = useRef<Set<string>>(new Set());

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      pausedRef.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearTimer]
  );

  const scheduleDismiss = useCallback(
    (toast: ToastRecord) => {
      if (toast.sticky) {
        return;
      }

      clearTimer(toast.id);
      const timer = window.setTimeout(() => {
        dismiss(toast.id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(toast.id, timer);
    },
    [clearTimer, dismiss]
  );

  const addToast = useCallback(
    (record: Omit<ToastRecord, "id">) => {
      const id = createToastId();
      const next: ToastRecord = { ...record, id };

      setToasts((current) => {
        const merged = [next, ...current];
        const overflow = merged.slice(MAX_TOASTS);
        for (const toast of overflow) {
          clearTimer(toast.id);
        }
        return merged.slice(0, MAX_TOASTS);
      });

      scheduleDismiss(next);
      return id;
    },
    [clearTimer, scheduleDismiss]
  );

  const update = useCallback(
    (id: string, input: Partial<ToastInput & { progress?: number }>) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id
            ? {
                ...toast,
                title: input.title ?? toast.title,
                description:
                  input.description !== undefined
                    ? input.description
                    : toast.description,
                progress:
                  input.progress !== undefined ? input.progress : toast.progress,
              }
            : toast
        )
      );
    },
    []
  );

  const success = useCallback(
    (input: ToastInput) =>
      addToast({
        variant: "success",
        sticky: false,
        title: input.title,
        description: input.description,
      }),
    [addToast]
  );

  const error = useCallback(
    (input: ToastInput) =>
      addToast({
        variant: "error",
        sticky: true,
        title: input.title,
        description: input.description,
      }),
    [addToast]
  );

  const info = useCallback(
    (input: ToastInput) =>
      addToast({
        variant: "info",
        sticky: false,
        title: input.title,
        description: input.description,
      }),
    [addToast]
  );

  const progress = useCallback(
    (input: ToastInput & { progress?: number }) =>
      addToast({
        variant: "progress",
        sticky: true,
        title: input.title,
        description: input.description,
        progress: input.progress ?? 0,
      }),
    [addToast]
  );

  const pause = useCallback(
    (id: string) => {
      pausedRef.current.add(id);
      clearTimer(id);
    },
    [clearTimer]
  );

  const resume = useCallback(
    (id: string) => {
      if (!pausedRef.current.has(id)) {
        return;
      }

      pausedRef.current.delete(id);
      setToasts((current) => {
        const toast = current.find((entry) => entry.id === id);
        if (toast && !toast.sticky) {
          clearTimer(toast.id);
          const timer = window.setTimeout(() => {
            dismiss(toast.id);
          }, AUTO_DISMISS_MS);
          timersRef.current.set(toast.id, timer);
        }
        return current;
      });
    },
    [clearTimer, dismiss]
  );

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        window.clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      success,
      error,
      info,
      progress,
      update,
      dismiss,
    }),
    [dismiss, error, info, progress, success, update]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div className={TOAST_HOST_CLASS} data-slot="toast-viewport">
              {toasts.map((toast) => (
                <ToastCard
                  key={toast.id}
                  onDismiss={dismiss}
                  onPause={pause}
                  onResume={resume}
                  toast={toast}
                />
              ))}
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}

/** @deprecated Host is now fixed on `document.body` via ToastProvider. Kept as a no-op for call sites. */
export function ToastViewport(_props: { className?: string }) {
  return null;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

```

---

### `src/components/theme/theme-provider.tsx`

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  applyTheme,
  getStoredTheme,
  storeTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  useEffect(() => {
    if (theme !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    storeTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

```

---

## Differences from Sage production

| Sage production | This copy kit |
|---|---|
| 5-column grid with Ask AI right panel | 3-column: left + center only |
| Profile menu, settings, org dialogs | Omitted from top bar |
| Citation highlight in viewers | Types exist; full highlight UX partial in Sage too |
| Ask AI / chat | Not included |

Everything else for **left sidebar + center tabs/viewers** matches production source.

---

## Verify

```bash
npm run dev
```

1. Upload a PDF — click it in the left panel → tab opens, PDF viewer renders
2. Open multiple files → tab strip shows; pin/close/duplicate via right-click
3. Resize left panel; collapse → center expands
4. Delete a file → tab shows "removed" state
5. Close all unpinned via strip settings (⋯)

---

## Troubleshooting

| Issue | Fix |
|---|---|
| PDF blank / worker error | Ensure `react-pdf` installed; `pdf-viewer.tsx` sets worker via `import.meta.url` |
| Docx won't preview standalone | Set `NEXT_PUBLIC_API_URL` — docx uses `GET /files/{id}/text` |
| Tabs don't open on click | Wire `onOpenFile` → `openTab({ resourceKey, title, fileType })` |
| Hydration flash on theme | `layout.tsx` inline script sets `dark` class before paint |
