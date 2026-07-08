import {
  fileTypeLabel,
  formatFileSize,
  type LibraryFile,
} from "@/lib/file-upload";

function FileRowIcon({ fileType }: { fileType: LibraryFile["fileType"] }) {
  const iconClass =
    fileType === "image" ? "codicon-file-media" : "codicon-file";
  return (
    <span
      aria-hidden="true"
      className={`codicon ${iconClass} shrink-0 text-muted-foreground`}
      style={{ fontSize: 16 }}
    />
  );
}

export function FileList({ files }: { files: LibraryFile[] }) {
  if (files.length === 0) return null;

  return (
    <ul className="flex flex-col gap-0.5">
      {files.map((entry) => (
        <li key={entry.id}>
          <button
            className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
            type="button"
          >
            <FileRowIcon fileType={entry.fileType} />
            <span className="min-w-0 flex-1 truncate font-medium">
              {entry.file.name}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {fileTypeLabel(entry.fileType)}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatFileSize(entry.file.size)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
