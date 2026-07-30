import type { AskCitation } from "./api";

export type CitationSource = {
  fileId: string;
  filename: string;
  citationId: string;
  charStart: number;
  charEnd: number;
};

/** One badge per file — first cited chunk wins for jump offsets. */
export function dedupeCitationsByFile(citations: AskCitation[]): CitationSource[] {
  const seen = new Set<string>();
  const sources: CitationSource[] = [];
  for (const citation of citations) {
    if (seen.has(citation.file_id)) {
      continue;
    }
    seen.add(citation.file_id);
    sources.push({
      fileId: citation.file_id,
      filename: citation.filename,
      citationId: citation.id,
      charStart: citation.char_start,
      charEnd: citation.char_end,
    });
  }
  return sources;
}
