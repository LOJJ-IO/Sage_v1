import { describe, expect, it } from "vitest";

import type { AskCitation } from "../api";
import { dedupeCitationsByFile, type CitationSource } from "./citations";

function citation(overrides: Partial<AskCitation> = {}): AskCitation {
  return {
    id: overrides.id ?? "file-a#abc123",
    file_id: overrides.file_id ?? "file-a",
    filename: overrides.filename ?? "return-policy.txt",
    chunk_index: overrides.chunk_index ?? 0,
    char_start: overrides.char_start ?? 0,
    char_end: overrides.char_end ?? 100,
  };
}

describe("dedupeCitationsByFile", () => {
  it("keeps one source per file_id, first citation wins offsets", () => {
    const sources = dedupeCitationsByFile([
      citation({
        id: "file-a#aaa",
        file_id: "file-a",
        filename: "return-policy.txt",
        char_start: 10,
        char_end: 40,
      }),
      citation({
        id: "file-a#bbb",
        file_id: "file-a",
        filename: "return-policy.txt",
        char_start: 200,
        char_end: 300,
      }),
      citation({
        id: "file-b#ccc",
        file_id: "file-b",
        filename: "dress-code.pdf",
        char_start: 0,
        char_end: 50,
      }),
    ]);

    expect(sources).toEqual<CitationSource[]>([
      {
        fileId: "file-a",
        filename: "return-policy.txt",
        citationId: "file-a#aaa",
        charStart: 10,
        charEnd: 40,
      },
      {
        fileId: "file-b",
        filename: "dress-code.pdf",
        citationId: "file-b#ccc",
        charStart: 0,
        charEnd: 50,
      },
    ]);
  });

  it("returns empty for no citations", () => {
    expect(dedupeCitationsByFile([])).toEqual([]);
  });
});
