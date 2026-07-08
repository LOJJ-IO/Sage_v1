import {
  MAX_FILES_PER_BATCH,
  sanitizeDisplayFilename,
  validateFileMeta,
  validateMagicBytes,
  type SageFile,
  type SkippedFile,
} from "@/lib/file-upload";
import { listStoredFiles, saveStoredFile } from "@/lib/server/upload-storage";

export const runtime = "nodejs";

export async function GET() {
  const files = await listStoredFiles();
  return Response.json({ files });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const entries = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  if (entries.length === 0) {
    return Response.json({ error: "No files provided" }, { status: 400 });
  }

  if (entries.length > MAX_FILES_PER_BATCH) {
    return Response.json(
      {
        error: `Too many files — maximum ${MAX_FILES_PER_BATCH} per upload`,
      },
      { status: 400 },
    );
  }

  const uploaded: SageFile[] = [];
  const skipped: SkippedFile[] = [];

  for (const file of entries) {
    const meta = validateFileMeta(file.name, file.size);
    if (!meta.ok) {
      if (meta.reason !== "System file skipped") {
        skipped.push({ name: file.name, reason: meta.reason });
      }
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateMagicBytes(buffer, meta.fileType)) {
      skipped.push({
        name: file.name,
        reason: "File content does not match its type",
      });
      continue;
    }

    const saved = await saveStoredFile({
      filename: sanitizeDisplayFilename(file.name),
      fileType: meta.fileType,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      extension: meta.extension,
      buffer,
    });

    uploaded.push(saved);
  }

  if (uploaded.length === 0) {
    return Response.json(
      {
        error: "No files were uploaded",
        skipped,
      },
      { status: 400 },
    );
  }

  return Response.json({ uploaded, skipped });
}
