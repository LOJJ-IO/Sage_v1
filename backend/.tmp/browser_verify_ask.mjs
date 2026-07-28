/**
 * Browser verification: inject auth, upload single-topic doc, wait for backend
 * indexed status, ask in the Ask panel, capture the UI reply.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = "http://localhost:3000";
const BACKEND = "http://localhost:8000";
const DOC = path.join(__dirname, "lavender-return-policy.txt");
const OUT = path.join(__dirname, "browser_verify_result.json");
const FILENAME = "lavender-return-policy.txt";

async function loginToken() {
  const res = await fetch(`${BACKEND}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "sage", pin: "1234" }),
  });
  if (!res.ok) throw new Error(`login failed ${res.status}`);
  const body = await res.json();
  return body.access_token;
}

async function waitIndexed(token, filename, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BACKEND}/files`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`list files ${res.status}`);
    const files = await res.json();
    const match = files.find((f) => f.filename === filename);
    if (match?.status === "indexed") return match;
    if (match?.status === "failed") {
      throw new Error(`ingest failed: ${match.error || "unknown"}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`timed out waiting for ${filename} to index`);
}

async function main() {
  if (!fs.existsSync(DOC)) throw new Error(`missing doc ${DOC}`);
  const token = await loginToken();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const networkAsk = [];
  page.on("response", async (res) => {
    if (res.url().includes("/ask") && res.request().method() === "POST") {
      try {
        networkAsk.push({
          status: res.status(),
          body: await res.json(),
        });
      } catch {
        networkAsk.push({ status: res.status(), body: null });
      }
    }
  });
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await page.goto(`${FRONTEND}/sign-in`);
  await page.evaluate(
    ([t]) => {
      sessionStorage.setItem("sage_access_token", t);
      sessionStorage.setItem("sage_user_role", "admin");
    },
    [token],
  );
  await page.goto(`${FRONTEND}/`);
  await page.waitForLoadState("domcontentloaded");

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(DOC);

  // Filename appears in the file list (even while pending/processing).
  await page.getByText(FILENAME).first().waitFor({ timeout: 60000 });

  const indexed = await waitIndexed(token, FILENAME);
  // UI poll interval is 2s — give it a beat to refresh hasFiles / status.
  await page.waitForTimeout(3000);

  const question = "What is the return window for Lavender Body Mist?";
  const askInput = page.locator(
    'input[placeholder*="Ask about return policy"], input[placeholder*="Upload documents"]',
  );
  await askInput.waitFor({ state: "visible", timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    if (await askInput.isEnabled()) break;
    await page.waitForTimeout(500);
  }
  if (!(await askInput.isEnabled())) {
    throw new Error("Ask input stayed disabled after indexed");
  }

  await askInput.fill(question);
  await page.getByRole("button", { name: "Send message" }).click();

  // Wait for /ask network response + UI render.
  for (let i = 0; i < 60; i++) {
    if (networkAsk.length > 0) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1500);

  // Chat bubbles: user is ml-8, assistant is mr-8 (see page.tsx).
  const assistantBubbles = page.locator("div.mr-8.rounded-2xl");
  let assistantText = null;
  for (let i = 0; i < 30; i++) {
    const count = await assistantBubbles.count();
    if (count > 0) {
      assistantText = (await assistantBubbles.last().innerText()).trim();
      if (assistantText.length > 10) break;
    }
    await page.waitForTimeout(500);
  }

  const screenshot = path.join(__dirname, "browser_verify.png");
  await page.screenshot({ path: screenshot, fullPage: true });

  const result = {
    question,
    indexedFile: indexed,
    assistantText,
    networkAsk,
    consoleErrors: consoleErrors.slice(0, 20),
    screenshot,
    url: page.url(),
  };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error("BROWSER_VERIFY_FAIL", err);
  process.exit(1);
});
