import { ApiError } from "@/lib/api/client";
import type { AskCitation, AskResponse } from "@/lib/ask/api";
import {
  DEMO_ANSWERS,
  DEMO_DOCUMENTS,
  DEMO_REFUSAL,
  type DemoDocument,
} from "@/lib/demo/seed";
import type { FileRecord } from "@/lib/files/api";

/**
 * In-browser stand-in for the FastAPI backend, used only on `/demo`.
 * Mirrors the routes the UI calls (`/files*`, `/ask`); state lives for the
 * page session and resets on reload.
 */

const INGEST_DELAY_MS = 4000;
const ASK_DELAY_MS = 900;

type DemoFile = {
  record: FileRecord;
  /** Plain text (seeded docs) or the uploaded bytes. */
  content: string | Blob;
  /** Seeded PDF/DOCX served from `public/demo/`. */
  assetUrl?: string;
};

let files: Map<string, DemoFile> | null = null;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pending → processing → indexed on a timer, like a real BackgroundTask. */
function finishIngestingLater(file: DemoFile) {
  setTimeout(() => {
    file.record.status = "indexed";
  }, INGEST_DELAY_MS);
}

function getFiles(): Map<string, DemoFile> {
  if (files) {
    return files;
  }

  files = new Map(
    DEMO_DOCUMENTS.map((doc: DemoDocument) => {
      const file: DemoFile = {
        record: {
          file_id: doc.file_id,
          filename: doc.filename,
          status: doc.startsProcessing ? "processing" : "indexed",
          looks_scanned: false,
          error: null,
        },
        content: doc.content,
        assetUrl: doc.assetUrl,
      };
      if (doc.startsProcessing) {
        finishIngestingLater(file);
      }
      return [doc.file_id, file];
    }),
  );
  return files;
}

function requireFile(fileId: string): DemoFile {
  const file = getFiles().get(fileId);
  if (!file) {
    throw new ApiError(404, "File not found.");
  }
  return file;
}

function uploadedFile(body: BodyInit | null | undefined): File {
  const upload = body instanceof FormData ? body.get("upload") : null;
  if (!(upload instanceof File)) {
    throw new ApiError(422, "No file uploaded.");
  }
  return upload;
}

function storeUpload(fileId: string, upload: File): FileRecord {
  const file: DemoFile = {
    record: {
      file_id: fileId,
      filename: upload.name,
      status: "processing",
      looks_scanned: false,
      error: null,
    },
    content: upload,
  };
  getFiles().set(fileId, file);
  finishIngestingLater(file);
  return { ...file.record };
}

function matchesKeyword(question: string, keyword: string) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}(s|es|ed|ing)?\\b`, "i").test(question);
}

function citationFor(fileId: string, quote: string, index: number): AskCitation | null {
  const file = getFiles().get(fileId);
  if (!file || typeof file.content !== "string") {
    return null;
  }
  const start = file.content.indexOf(quote);
  if (start === -1) {
    return null;
  }
  return {
    id: `${fileId}:${index}`,
    file_id: fileId,
    filename: file.record.filename,
    chunk_index: 0,
    char_start: start,
    char_end: start + quote.length,
  };
}

/** Best keyword match over the seeded answers, else a grounded refusal. */
export function answerDemoQuestion(question: string): AskResponse {
  let best: (typeof DEMO_ANSWERS)[number] | null = null;
  let bestScore = 0;

  for (const candidate of DEMO_ANSWERS) {
    const score = candidate.keywords.filter((k) => matchesKeyword(question, k)).length;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  // Only cite documents that are still in the library (the user may delete one).
  const citations = best
    ? best.sources
        .map((source, index) => citationFor(source.file_id, source.quote, index))
        .filter((citation): citation is AskCitation => citation !== null)
    : [];

  if (!best || citations.length === 0) {
    return { answer: DEMO_REFUSAL, citations: [], refused: true, reason: "low_trust", limited: false };
  }

  return { answer: best.answer, citations, refused: false, reason: null, limited: false };
}

export async function handleDemoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const [, resource, fileId, action] = path.split("?")[0].split("/");

  if (resource === "ask" && method === "POST") {
    const { question } = JSON.parse(String(init.body ?? "{}")) as { question?: string };
    await delay(ASK_DELAY_MS);
    return answerDemoQuestion(question ?? "") as T;
  }

  if (resource === "files") {
    if (!fileId && method === "GET") {
      return [...getFiles().values()].map((file) => ({ ...file.record })) as T;
    }
    if (!fileId && method === "POST") {
      return storeUpload(`demo-upload-${crypto.randomUUID()}`, uploadedFile(init.body)) as T;
    }
    if (fileId && !action && method === "PUT") {
      requireFile(fileId);
      return storeUpload(fileId, uploadedFile(init.body)) as T;
    }
    if (fileId && !action && method === "DELETE") {
      requireFile(fileId);
      getFiles().delete(fileId);
      return undefined as T;
    }
    if (fileId && action === "text" && method === "GET") {
      const { content, record } = requireFile(fileId);
      if (typeof content !== "string" && /\.(docx|pdf)$/i.test(record.filename)) {
        return { text: "Text extraction isn't available for files uploaded in the demo." } as T;
      }
      const text = typeof content === "string" ? content : await content.text();
      return { text } as T;
    }
  }

  throw new ApiError(404, "Not available in the demo.");
}

/** Blob download for `/files/{id}/content` — the real PDF/DOCX for seeded docs. */
export async function downloadDemoFile(fileId: string): Promise<Blob> {
  const { content, assetUrl } = requireFile(fileId);
  if (assetUrl) {
    const response = await fetch(assetUrl);
    if (!response.ok) {
      throw new ApiError(response.status, "Couldn't load that demo file.");
    }
    return response.blob();
  }
  return typeof content === "string" ? new Blob([content], { type: "text/plain" }) : content;
}
