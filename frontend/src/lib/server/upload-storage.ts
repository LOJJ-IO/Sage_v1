import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { SageFile, SageFileType } from "@/lib/file-upload";

export type StoredFileRecord = SageFile & {
  storageName: string;
};

type Manifest = {
  files: StoredFileRecord[];
};

const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");
const MANIFEST_PATH = path.join(UPLOADS_DIR, "manifest.json");

async function ensureUploadsDir(): Promise<void> {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

async function readManifest(): Promise<Manifest> {
  await ensureUploadsDir();
  try {
    const raw = await readFile(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw) as Manifest;
    if (!Array.isArray(parsed.files)) return { files: [] };
    return parsed;
  } catch {
    return { files: [] };
  }
}

async function writeManifest(manifest: Manifest): Promise<void> {
  await ensureUploadsDir();
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

export async function listStoredFiles(): Promise<SageFile[]> {
  const manifest = await readManifest();
  return [...manifest.files].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export async function saveStoredFile({
  filename,
  fileType,
  size,
  mimeType,
  extension,
  buffer,
}: {
  filename: string;
  fileType: SageFileType;
  size: number;
  mimeType: string;
  extension: string;
  buffer: Buffer;
}): Promise<SageFile> {
  await ensureUploadsDir();

  const id = randomUUID();
  const storageName = `${id}.${extension}`;
  const storagePath = path.join(UPLOADS_DIR, storageName);

  await writeFile(storagePath, buffer);

  const record: StoredFileRecord = {
    id,
    filename,
    fileType,
    size,
    mimeType,
    createdAt: new Date().toISOString(),
    storageName,
  };

  const manifest = await readManifest();
  manifest.files.push(record);
  await writeManifest(manifest);

  const { storageName: _storageName, ...publicFile } = record;
  return publicFile;
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}
