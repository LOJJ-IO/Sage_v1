---
type: product
status: active
tags: [area/product, area/design, area/frontend]
created: 2026-07-03
updated: 2026-07-28
related: ["[[Product-Vision]]", "[[UI-UX-Guidelines]]", "[[FEAT-app-shell-layout]]", "[[Current-Context]]", "[[Sage-MVP-Functional-Spec]]", "[[0007-boutique-retail-mvp-beachhead]]"]
---

# Workspace UI — Design Decisions & Rationale

> Decision log from UI review session, July 2026. Covers the zero-state, panel/tab model, iconography, and hotel-staff design constraints for the LOJJ workspace shell.

**Read this before proposing workspace UX changes.** Don't re-litigate decisions here in chat — extend or supersede this note.

---

## Relationship to MVP functional spec

[[Sage-MVP-Functional-Spec]] is **approved for implementation** and **defers** most of this document's workspace-shell scope (dock, tabs, connected apps) to post-MVP. See [[0007-boutique-retail-mvp-beachhead]].

**Still relevant for MVP:**
- Shared-device / interruption-driven / minimal-training constraints (retail floor ≈ hotel front desk)
- Iconography principles (collapse-all, recognizable glyphs)
- Touch equivalents for hover-only affordances (kebab menus on tablets)
- Coherent zero-state flow across panels (adapt copy for retail, not hotel)
- Per-user server-side preferences ([[Sage-MVP-Functional-Spec#6]]) — resolves open item §8 below for MVP

**Deferred past MVP:** dock, center tabs, app slots, drag-apps-into-panels, property switcher.

**Open conflict (resolve during frontend build):** this doc §7 puts account menu on bottom-left avatar; MVP spec §4.2 puts settings/themes/Manage Accounts under top-right gear. Working resolution: gear owns settings; avatar owns identity (who am I, log out). See [[Sage-MVP-Functional-Spec#0]].

---

## Product direction (context)

The app is a **workspace shell**, not a document viewer. Three panels (file tree, center stage, AI chat) are slots; users can drag connected apps from a dock into any panel or open them in the middle. The center panel becomes **Cursor-style tabs** once a file is opened. Target: lives open all shift at a front desk.

---

## Decisions

### 1. Center panel zero-state
- **Problem:** On first load the center (largest region) is completely empty while the file tree gets a "No files yet" treatment. First-time users stare at a void.
- **Decision:** Do NOT collapse the center panel on first load — it's the primary stage and hiding it teaches the wrong layout. Fix hierarchy with content, not by removing the panel.
- **Zero-state design:** Checklist-style launcher in the center stage (VS Code "Start" screen pattern):
  1. ☐ Upload your first documents (SOPs, rate sheets, brand standards)
  2. ☐ Ask AI a question about them
  3. ☐ Drag an app from the dock to any panel
  - Each item is clickable and triggers the real action (upload dialog, AI input focus with suggested question, dock pulse).
  - Fallback if checklist is too heavy for v1: single CTA "Upload your hotel's documents" + subline "Drop files anywhere, or connect an app from the dock."
- **Also:** the empty center should be a drag-and-drop target for files.
- **Note:** if the dock isn't visible on first load, the workspace concept is invisible — dock visibility is a prerequisite for users intuiting "drag apps into panels."

### 2. Tab model (center panel / file previewer)
- Cursor/Chrome-inspired tabs in the middle preview stage. An empty tab bar on first load still helps signal "opened things live here," but the operational model is now explicit:
  - Clicking a file that's already open **focuses** the most recently active matching tab instance; it does **not** duplicate automatically.
  - **Duplicate tab** is explicit only (menu action), never implicit.
  - Multiple tab instances may point at the same underlying file resource, but each tab instance owns independent `viewState` (zoom / page / scroll). Duplicating copies the source tab's current `viewState`.
  - Closing the active tab activates the nearest tab to the **left**, else the nearest tab to the **right**.
- **Pinned tabs**
  - Pinned tabs stay on the left.
  - Pinning is a **tab-instance** property, not a file/resource property.
  - Pinned tabs are protected: they survive `close all`, cannot be directly closed, and must be explicitly unpinned before close.
  - For discoverability, pinned-tab kebab menus still show **Close**, but in a disabled state.
  - No arbitrary numeric cap for now; pinning is allowed until pinned-tab layout would violate the minimum usable render contract below.
- **Removed files**
  - If an open file is deleted/replaced out from under the tab, the tab becomes a removed/error state instead of auto-closing.
  - Removed tabs cannot be duplicated.
- **Overflow behavior**
  - Active tab must always be brought into view.
  - Overflow mode is a **tab-strip/workspace preference**, not a per-tab setting.
  - MVP supports two overflow modes: `pagination` and `free horizontal scroll`.
  - Overflow preference should survive refresh via browser storage; open tabs themselves do **not** need refresh persistence in MVP.
- **Minimum usable pinned-tab render contract**
  - file-type icon
  - truncated filename
  - pin/unpin affordance
  - kebab menu
  - full filename available via tooltip
  - Pinned tabs may shrink only down to the minimum width that still fits the elements above.
- **Visual / crowded layout (2026-07-28, Chrome/Obsidian inspo)**
  - Active tab: visually connected to preview stage below; higher contrast; **wider than inactive neighbors** even when strip is crowded.
  - Inactive tabs: flatter, lower contrast; compress more aggressively than active.
  - Pinned cluster: fixed left, non-scrollable by default; **compresses before** unpinned region loses readability; may degrade to icon-only (tooltip for full name; kebab always available).
  - Divider between pinned and unpinned regions **only when** at least one pinned tab exists — no divider or reserved gap when zero pins.
  - **Fallback only:** if pinned cluster still overflows after compression, pinned region becomes independently horizontally scrollable; active pinned tab auto-reveals inside that region.
  - Unpinned region: normal overflow (`pagination` or free scroll); active tab always brought into view.
  - Principle: **state truth and visual truth stay synchronized under compression** — don't show structural chrome (divider, scroll regions) without underlying state.

### 3. Apps in the workspace — tabs vs. replace
- **Original plan:** dragging an app into the middle removes the file previewer.
- **Concern raised:** replace-on-drag is destructive. If 3 SOPs are open and the PMS app is dragged in, files vanish → perceived as "the app ate my work." Interruption-driven users hit this constantly.
- **Options:**
  1. Apps come in as tabs, visually differentiated (app icon, accent/shape difference). One mental model: tabs hold things; some are files, some are apps. Least engineering.
  2. App takes over the stage but the tab strip survives (file tabs dimmed, clickable to swap back).
- **Invariant to protect either way:** dragging something in never closes what was open. Open tabs are the user's memory after an interruption.
- **Status:** leaning option 1 (apps as differentiated tabs) — final call pending.

### 4. Iconography — collapse-all
- The file-tree "collapse all folders" button currently looks like an X → reads as close/delete/dismiss; some users will avoid it (invisible in analytics).
- **Decision:** adopt the established convention.
  - VS Code's icon is from Microsoft **Codicons**, named `collapse-all` (two stacked squares with a minus). Available via `@vscode/codicons` npm package.
  - Lucide equivalent: **`copy-minus`** (closest visual match).
- General principle: tooltips are last-resort discovery — fine for power features (sort, magic wand), risky for structural controls. Recognizable icons > tooltips.

### 5. Upload paths & toolbar
- Two upload entry points (top toolbar icon + sidebar button) is fine, but icon-only toolbar needs tooltips at minimum. Tooltips exist — keep, but prioritize recognizable glyphs for structural actions.

### 6. AI panel zero-state
- Current copy ("AI helps you find answers across your docs") contradicts the empty state — asking anything with no docs is a guaranteed dead end.
- **Decision:** AI panel acknowledges empty state: "Upload documents first so I can answer questions about them," with its own upload shortcut.
- Placeholder text should be example-driven ("Ask about check-in procedures...") instead of repeating "Ask AI" twice (panel header + input).
- **Shipped (2026-07-09):** `AskAiEmptyState` gates on `files.length`; empty → upload CTA; with files → ask copy. Input disabled until files exist; retail example placeholder. See `page.tsx`.

### 7. Avatar / account button (bottom-left)
- Add a chevron or three-dot affordance so it reads as clickable.
- On click: small menu — name + email at top, then Settings, Billing/Plan, Help, Log out.
- Expanded sidebar shows avatar + name inline; collapses to avatar-only when narrow.
- **Leave room for a property/team switcher** in this menu — needed once multi-property groups (Hotel Equities-type) sign.

### 8. State persistence
- Reopening the workspace does **not** need to restore the open tab set in MVP.
- What *does* persist in MVP: the tab-strip overflow preference (`pagination` vs `free horizontal scroll`) via browser storage, because re-selecting it on every refresh is needless friction.
- Per-login vs. per-desk persistence remains a future design question for richer workspace state, but it is intentionally out of scope for the preview-tab MVP.

### 9. Highest-leverage overall fix
- Design the zero-state as **one coherent flow** across all three panels (empty viewer points to upload → AI panel explains it activates after upload) instead of three panels each pretending the others don't exist. Zero-state is the beta hotels' first impression.
- **Seed a demo doc** (sample SOP) so the AI is instantly demoable on a sales call without waiting for the prospect to upload anything.

---

## Hotel staff design constraints (personas & environment)

Patterns to design against — validate against firsthand front-desk experience:

- **Shared workstations.** Terminals used by whoever's on shift → complicates per-user state (see §8).
- **Interruption-driven work.** No task finishes in one sitting (walk-ups, phones, walk-ins). Every flow must survive mid-task abandonment and 20-minute-later resume with zero re-orientation. Strongest argument for tabs + persistence.
- **High turnover, minimal training.** Training ≈ "shadow someone for two shifts." Product must be guessable, zero learning curve. (Also the LOJJ sales pitch: knowledge walks out the door.)
- **PMS muscle memory.** Opera-trained staff tolerate ugly, not slow. Latency and click-count beat polish for daily-driver adoption.
- **Night audit is a distinct persona.** One person, alone, 3am, often least-trained on property. AI answering questions when no manager is awake = arguably highest-value user.
- **Nobody reads docs or training videos.** Discovery must happen in the interface — hence zero-states and recognizable icons.

---

## Open items

- [ ] Final call: apps as tabs (option 1) vs. stage-takeover with surviving tab strip (option 2)
- [ ] If/when tab restoration returns post-MVP, decide per-login vs. per-desk workspace persistence data model
- [ ] Dock visibility on first load
- [ ] Demo/sample SOP seeded for new workspaces
- [x] Replace collapse-all icon — `codicon-collapse-all` in left panel header (2026-07-06)
- [ ] Avatar menu + room for property switcher
- [ ] Center panel checklist zero-state (or v1 fallback CTA)
- [x] AI panel empty-state copy + example-driven placeholder (2026-07-09)
- [ ] Coherent three-panel zero-state flow

## Related

- Current implementation: `frontend/src/app/page.tsx`
- Shell layout spec: [[FEAT-app-shell-layout]]
- Visual conventions: [[UI-UX-Guidelines]]
- Active priorities: [[Current-Context]]
- §2's tab model is being implemented as [[FEAT-preview-tabs]] — pure state layer (`frontend/src/lib/preview-tabs/`) shipped 2026-07-28; UI/viewers not started.
