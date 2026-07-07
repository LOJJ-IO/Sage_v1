---
type: product
status: active
tags: [area/product, area/design, area/frontend]
created: 2026-07-03
updated: 2026-07-06
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

### 2. Tab model (center panel)
- Cursor/VS Code-style tabs. An empty tab bar (or "+" tab) on first load signals "things open here" without copy.
- **Tab cap:** groups of 3 visible, navigate left/right between groups. (Chosen over VS Code preview-tab behavior — simpler to build, closer to browser expectations for non-technical users.)
- Hotel staff are not tab-hygiene people; the cap prevents 15-tab sprawl.

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

### 7. Avatar / account button (bottom-left)
- Add a chevron or three-dot affordance so it reads as clickable.
- On click: small menu — name + email at top, then Settings, Billing/Plan, Help, Log out.
- Expanded sidebar shows avatar + name inline; collapses to avatar-only when narrow.
- **Leave room for a property/team switcher** in this menu — needed once multi-property groups (Hotel Equities-type) sign.

### 8. State persistence
- Reopening the workspace must restore the tab set. Invisible feature; its absence is felt immediately in an all-shift daily driver.
- **Open question (decide before building):** persistence per *login* vs. per *desk*. Front desk terminals are shared workstations — "restore your state" needs a data-model answer: user-tied state with real login switching, or a shared per-desk "property workspace."

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
- [ ] Per-desk vs. per-login state persistence data model
- [ ] Dock visibility on first load
- [ ] Demo/sample SOP seeded for new workspaces
- [x] Replace collapse-all icon — `codicon-collapse-all` in left panel header (2026-07-06)
- [ ] Avatar menu + room for property switcher
- [ ] Center panel checklist zero-state (or v1 fallback CTA)
- [ ] AI panel empty-state copy + example-driven placeholder
- [ ] Coherent three-panel zero-state flow

## Related

- Current implementation: `frontend/src/app/page.tsx`
- Shell layout spec: [[FEAT-app-shell-layout]]
- Visual conventions: [[UI-UX-Guidelines]]
- Active priorities: [[Current-Context]]
