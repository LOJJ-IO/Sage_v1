import type { SageFile } from "@/lib/file-upload";
import { fileTypeLabel, formatFileSize } from "@/lib/file-upload";

function FileRowIcon({ fileType }: { fileType: SageFile["fileType"] }) {
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

export function FileList({ files }: { files: SageFile[] }) {
  if (files.length === 0) return null;

  return (
    <ul className="flex flex-col gap-0.5">
      {files.map((file) => (
        <li key={file.id}>
          <button
            className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
            type="button"
          >
            <FileRowIcon fileType={file.fileType} />
            <span className="min-w-0 flex-1 truncate font-medium">
              {file.filename}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {fileTypeLabel(file.fileType)}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
