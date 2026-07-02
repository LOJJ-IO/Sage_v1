---
type: process
status: active
tags: [area/process]
created: 2026-07-01
updated: 2026-07-01
related: ["[[Engineering/Bugs]]", "[[Customer-Feedback]]", "[[Known-Issues]]"]
---

# Intake Process (non-technical reporting)

How support/ops/PM get something "that happened on their end" into the vault **without touching Obsidian, markdown, or git.**

## The path

```
Google Form  →  Google Sheet  →  Inbox/*.md  →  triaged into real notes
(reporter)      (raw log)        (staging)       (Bugs / Known-Issues / Customer-Feedback / Current-Context)
```

Reporters only ever see the form. Everything past that is your or Claude's job.

## 1. The form

**Setup (do this once, ~5 min):**

1. [forms.google.com](https://forms.google.com) → **Blank form** → title it "Sage — Report Something".
2. Add these questions:

| # | Question | Type | Setup |
|---|---|---|---|
| 1 | What happened? | Paragraph | Required |
| 2 | Where/when did it happen? | Short answer | Required |
| 3 | Type | Multiple choice | `Bug` · `Customer feedback` · `Something we decided` · `An idea` · `A question` |
| 4 | How urgent? | Multiple choice | `Blocking someone now` · `Annoying but workable` · `Not urgent` |
| 5 | Your name | Short answer | Required |

3. **Responses** tab → click the green Sheets icon → **Create a new spreadsheet** (name it `Sage Intake`).
4. **Send** → copy the link → share it wherever the team already is (Slack pin, browser bookmark). No login required to submit, works on mobile.

Reporters only ever see the form — no Obsidian, markdown, or git.

## 2. Getting Sheet rows into the vault

Two ways to do this, pick based on volume:

**Manual (fine at low volume, zero setup):**
Weekly (or in [[Weekly-Note|the weekly review]]), open the `Sage Intake` sheet, copy the new rows, and tell Claude Code: *"Here are this week's intake form rows: [paste]. File each one into `second-brain/Inbox/` using the Intake-Entry template, then triage them."* Claude creates the Inbox files and immediately routes each into the right permanent note.

**Automated (once volume picks up — free, no Zapier subscription):**
Google Apps Script bound to the Sheet, triggered on every form submit, pushes a new `Inbox/YYYY-MM-DD-<slug>.md` file straight to GitHub via the Contents API. Setup:

1. **Get a GitHub token:** GitHub → Settings → Developer settings → Fine-grained tokens → generate one scoped to just this repo, permission **Contents: Read and write**.
2. In the `Sage Intake` sheet: **Extensions → Apps Script**, paste the script below, and set `GITHUB_TOKEN` via **Project Settings → Script Properties** (don't hardcode it in the script body).
3. In the script editor: **Triggers** (clock icon, left sidebar) → **Add Trigger** → function `onFormSubmit`, event source `From spreadsheet`, event type `On form submit` → Save (grants the script permission the first time).
4. Submit a test form response and confirm a file appears under `Inbox/` in the GitHub repo within a few seconds.

```javascript
const OWNER = "LOJJ-IO";
const REPO = "Sage_v1";
const BRANCH = "main";

function onFormSubmit(e) {
  const token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  const values = e.namedValues; // column headers on the "Form_Responses" sheet, e.g. { "What happened?": ["..."], ... }

  const summary = values["What happened?"][0].slice(0, 60);
  const slug = summary.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const path = `second-brain/Inbox/${date}-${slug}.md`;

  const content = `---
type: intake
status: untriaged
tags: []
created: ${date}
updated: ${date}
related: []
reporter: ${values["Name"][0]}
---

# ${values["What happened?"][0].split("\n")[0].slice(0, 80)}

**Reported by:** ${values["Name"][0]}
**Type:** ${values["Kind"][0]}
**When it happened:** ${values["Where/when did it happen?"][0]}
**Urgency (score):** ${values["Score"][0]}

## What happened
${values["What happened?"][0]}

## Triage
- Filed as: (untriaged)
`;

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;
  UrlFetchApp.fetch(url, {
    method: "put",
    contentType: "application/json",
    headers: { Authorization: `Bearer ${token}` },
    payload: JSON.stringify({
      message: `Intake: ${summary}`,
      content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
      branch: BRANCH,
    }),
  });
}
```

This commits directly to `main` — pull locally (`git pull`) before your next triage session to see new Inbox files. Triage (step 3 below) still needs a human/Claude judgment call; automation only removes the copy/paste.

## 3. Triage (the part that actually needs judgment)

Whoever (or whichever Claude session) processes `Inbox/`:

1. Read the raw entry.
2. Decide what it actually is:
   - **Bug** → create/update `Engineering/Bugs/BUG-NNNN-*.md` ([[Bug-Report]] template). If it's minor, a line in [[Known-Issues]] instead.
   - **Customer feedback** → append to [[Customer-Feedback]].
   - **A decision that was made outside the vault** → write it as an ADR ([[ADR]] template) if it's architectural, or update [[Current-Context]] / [[Roadmap]] if it's a priority call.
   - **An idea** → add to the "Later" section of [[Roadmap]] or, if it's a real feature idea, a draft in `Product/Features/`.
   - **A question** → answer it inline in the Inbox entry, or escalate — either way, don't let it rot.
3. Mark the Inbox entry `status: triaged`, note where it went, and delete it (or leave it — it's disposable once filed, the permanent note is the source of truth).

## Why route through Inbox instead of filing directly

Non-technical reports are messy and mixed-topic by nature ("also, unrelated, the button was blue yesterday"). Inbox absorbs that mess in one place so the permanent notes ([[Known-Issues]], [[Customer-Feedback]], etc.) stay clean and single-purpose. It's a buffer, not a destination — nothing should live in `Inbox/` for more than a week.

## Prompt to hand Claude for triage

See the "New feature, vault-aware" style entry in [[Prompt-Library]] — add this one there too:

> Triage everything in `second-brain/Inbox/`. For each entry, file it into the correct permanent note (Bug-Report, Known-Issues, Customer-Feedback, ADR, or Roadmap) using the matching template, update `status: triaged` with a link to where it went, then delete the Inbox file.
