import { describe, expect, it } from "vitest";

import { answerDemoQuestion, handleDemoRequest } from "@/lib/demo/mock-api";
import { DEMO_ANSWERS, DEMO_DOCUMENTS, DEMO_CONVERSATION } from "@/lib/demo/seed";

describe("demo mock backend", () => {
  it("every canned quote exists verbatim in its document", () => {
    for (const answer of DEMO_ANSWERS) {
      for (const source of answer.sources) {
        const doc = DEMO_DOCUMENTS.find((d) => d.file_id === source.file_id);
        expect(doc?.content, source.quote).toContain(source.quote);
      }
    }
  });

  it("answers the seeded conversation with citations that point at the quote", () => {
    for (const question of DEMO_CONVERSATION) {
      const result = answerDemoQuestion(question);
      expect(result.refused).toBe(false);
      expect(result.citations.length).toBeGreaterThan(0);
      for (const c of result.citations) {
        const doc = DEMO_DOCUMENTS.find((d) => d.file_id === c.file_id)!;
        expect(c.char_end).toBeGreaterThan(c.char_start);
        expect(doc.content.slice(c.char_start, c.char_end).length).toBe(c.char_end - c.char_start);
      }
    }
  });

  it("refuses when nothing matches, and keywords match whole words only", () => {
    expect(answerDemoQuestion("What's the wifi password?").refused).toBe(true);
    // "pos" must not match inside "possible".
    expect(answerDemoQuestion("Is it possible to bring a dog?").refused).toBe(true);
  });

  it("serves the seeded library and stops citing deleted files", async () => {
    const files = await handleDemoRequest<{ file_id: string }[]>("/files");
    expect(files.map((f) => f.file_id)).toContain("demo-gift-cards");
    await handleDemoRequest("/files/demo-gift-cards", { method: "DELETE" });
    expect(answerDemoQuestion("Do gift cards expire?").refused).toBe(true);
  });
});
