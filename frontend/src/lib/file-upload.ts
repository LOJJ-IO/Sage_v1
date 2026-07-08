export type SageFileType = "pdf" | "docx" | "txt" | "md" | "image";

export type SageFile = {
  id: string;
  filename: string;
  fileType: SageFileType;
  size: number;
  mimeType: string;
  createdAt: string;
};

export type SkippedFile = {
  name: string;
  reason: string;
};

export type UploadFilesResult = {
  uploaded: SageFile[];
  skipped: SkippedFile[];
};

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES_PER_BATCH = 50;

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

export function getExtension(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot === -1) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function sanitizeDisplayFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  return base.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 200) || "upload";
}

export function isSystemJunkFile(filename: string): boolean {
  const base = (filename.split(/[/\\]/).pop() ?? filename).toLowerCase();
  return SYSTEM_JUNK_NAMES.has(base);
}

export function getFileTypeFromExtension(
  extension: string,
): SageFileType | null {
  if (!(extension in EXTENSION_TO_TYPE)) return null;
  return EXTENSION_TO_TYPE[extension as AllowedExtension];
}

export type FileValidationResult =
  | { ok: true; fileType: SageFileType; extension: string }
  | { ok: false; reason: string };

export function validateFileMeta(
  filename: string,
  size: number,
): FileValidationResult {
  if (isSystemJunkFile(filename)) {
    return { ok: false, reason: "System file skipped" };
  }

  const extension = getExtension(filename);

  if (extension === "doc") {
    return {
      ok: false,
      reason:
        "Legacy Word (.doc) is not supported — save the file as .docx and try again.",
    };
  }

  const fileType = getFileTypeFromExtension(extension);
  if (!fileType) {
    return {
      ok: false,
      reason: `Unsupported file type (.${extension || "unknown"})`,
    };
  }

  if (size <= 0) {
    return { ok: false, reason: "File is empty" };
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      reason: `File exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB limit`,
    };
  }

  return { ok: true, fileType, extension };
}

export function validateFileForUpload(file: File): FileValidationResult {
  return validateFileMeta(file.name, file.size);
}

function startsWithBytes(buffer: Uint8Array, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

function isTextLike(buffer: Uint8Array): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  for (const byte of sample) {
    if (byte === 0) return false;
  }
  return true;
}

export function validateMagicBytes(
  buffer: Uint8Array,
  fileType: SageFileType,
): boolean {
  switch (fileType) {
    case "pdf":
      return startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46]); // %PDF
    case "docx":
      return startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04]); // PK..
    case "image": {
      const isJpeg = startsWithBytes(buffer, [0xff, 0xd8, 0xff]);
      const isPng = startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47]);
      const isGif =
        startsWithBytes(buffer, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
        startsWithBytes(buffer, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      const isWebp =
        startsWithBytes(buffer, [0x52, 0x49, 0x46, 0x46]) &&
        buffer.length >= 12 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50;
      return isJpeg || isPng || isGif || isWebp;
    }
    case "txt":
    case "md":
      return isTextLike(buffer);
    default:
      return false;
  }
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
