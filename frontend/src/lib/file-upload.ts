export type SageFileType = "pdf" | "docx" | "txt" | "md" | "image";

export type LibraryFile = {
  id: string;
  file: File;
  fileType: SageFileType;
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

const SYSTEM_JUNK_NAMES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
]);

function getExtension(filename: string): string {
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
