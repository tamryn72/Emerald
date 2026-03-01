# TIMELINE.md — Emerald Development Plan

> Phased roadmap for building Emerald from planning to production.
> Model: `claude-sonnet-4-6` | Stack: GAS Web App + Vanilla JS + Anthropic API

---

## Phase Overview

```
Phase 1 ──── Documentation & Architecture     [COMPLETE]
Phase 2 ──── GAS Web App Backend Foundation   [COMPLETE]
Phase 3 ──── Claude AI Integration            [COMPLETE]
Phase 4 ──── Frontend: Chat UI                [COMPLETE]
Phase 5 ──── Frontend: Client Sidebar         [COMPLETE]
Phase 6 ──── Tool Wiring: All 31 Actions      [COMPLETE]
Phase 7 ──── Memory System                    [COMPLETE]
Phase 8 ──── Polish, Testing & Deployment     [IN PROGRESS]
```

---

## Phase 1: Documentation & Architecture — COMPLETE

### Deliverables
- [x] `CLAUDE.md` — master project reference
- [x] `MEMORY.md` — memory architecture design
- [x] `CONTEXT.md` — Claude system prompt + full tool schema
- [x] `TIMELINE.md` — this document

---

## Phase 2: GAS Web App Backend Foundation — COMPLETE

### Delivered: `EmeraldAPI.gs` (37 functions, 974 lines)

- [x] `doGet(e)` — serves EmeraldUI.html as Web App
- [x] `doPost(e)` — routes 10 API actions (chat, getClients, getClientInfo, getEmailTemplates, getMemory, getSessions, getNewsletterPreview, executeAction, clearMemory)
- [x] `handleApiCall(payloadStr)` — `google.script.run` bridge (mirrors doPost, with try-catch)
- [x] `emeraldGetClientList()` — scans all sheets, skips system sheets, returns sorted client array
- [x] `emeraldGetClientInfo(clientName)` — reads all cells including type-specific fields
- [x] `emeraldSafeWrite()` / `emeraldSafeClear()` — validated against SAFE_WRITE_CELLS + FORBIDDEN_CELLS
- [x] `emeraldActivateClientSheet()` — sets active sheet before calling existing backend functions
- [x] `emeraldExecuteTool()` — 31-case switch routing AI tool calls to API-safe implementations
- [x] 20 `emerald_*` API-safe wrappers (replace UI-dependent originals that call `getUi()`)

---

## Phase 3: Claude AI Integration — COMPLETE

### Delivered: `EmeraldAI.gs` (14 functions, 704 lines)

- [x] `callClaudeAPI()` — REST call to Anthropic API (`claude-sonnet-4-6`, 2048 max tokens)
- [x] `runAgenticLoop()` — multi-step tool use, max 10 iterations, executes tools until no more tool_use blocks
- [x] `handleChatRequest()` — entry point from doPost; builds context, runs loop, saves session
- [x] `buildSystemPrompt()` — injects active client data, session summary, long-term notes, reminders, today's date
- [x] `getToolDefinitions()` — 31 tools with full input_schema (matching CONTEXT.md spec)

---

## Phase 4: Frontend — Chat Interface — COMPLETE

### Delivered: `EmeraldUI.html` (1,386 lines — 639 CSS + 747 JS/HTML)

- [x] Mobile-first layout (100dvh, flexbox, 680px breakpoint)
- [x] Chat area with AI bubbles (peach) + user bubbles (coral) + timestamps
- [x] Typing indicator (animated dots)
- [x] Input bar with auto-resize textarea + Enter-to-send
- [x] Quick actions row (8 chips, adapts to home vs. client-selected state)
- [x] Bottom sheet (slide-up) with action pill grids per section
- [x] Newsletter preview modal
- [x] New client modal (name + type)
- [x] Toast notifications (2.5s auto-hide)
- [x] Simple markdown rendering (bold, italic, backticks)
- [x] All communication via `google.script.run.handleApiCall()` (no fetch/CORS issues)

---

## Phase 5: Frontend — Client Sidebar — COMPLETE

Built into `EmeraldUI.html`:

- [x] Fixed sidebar on desktop (250px), slide-over drawer on mobile
- [x] Client cards: name, service type badge (color-coded), session count, week pill (SE)
- [x] Status indicators: green dot (active), grey (complete)
- [x] Real-time search/filter by name
- [x] "New Client" button → modal with name + type → creates via chat
- [x] Client selection: highlights card, updates header pill, shows greeting
- [x] Footer stats: "X active · Y complete"

---

## Phase 6: Tool Wiring — All 31 Actions — COMPLETE

All tools are wired end-to-end: UI button → `trigger()` → chat message → Claude → tool_use → `emeraldExecuteTool()` → backend function → response.

### Wiring Checklist

**Document Generation**
- [x] Session Notes, Integration Guide, Breathwork Notes, Akashic Notes
- [x] Counseling Notes, Client Homework, Client Summary, Soul Emergence Summary
- [x] Intro Packet, Packet 2, Packet 3

**Soul Emergence**
- [x] Week 1–12 Workbooks (individual buttons)
- [x] Create Journal
- [x] Open Journal (returns URL)

**Onboarding**
- [x] Send Onboarding Email (API-safe, no getUi)
- [x] Check Intake Status
- [x] Create Intake Doc

**Scheduling**
- [x] Add Session to Calendar
- [x] Get Upcoming Sessions (by event ID)
- [x] Delete Session by Event ID

**Financial**
- [x] Record Payment (to Budget sheet)
- [x] Send Receipt
- [x] Get Budget URL

**Email & Marketing**
- [x] Get Email Templates
- [x] Send Email Template
- [x] Preview Newsletter
- [x] Send Newsletter to All Leads
- [x] Send Past Client Offer (all or one)

**Utilities**
- [x] Open Client Folder (Drive URL)
- [x] Refresh Dashboard
- [x] Refresh Leads
- [x] Add Lead (Name/Date/Email/Service)

**AI Read/Write**
- [x] Read Cell
- [x] Write Cell (safe-validated)
- [x] Clear Cell (safe-validated)

**Memory**
- [x] Remember Note (client_note or reminder)

---

## Phase 7: Memory System — COMPLETE

Built into `EmeraldAI.gs`:

- [x] `getSessionMemory()` / `saveSessionMemory()` — ScriptProperties key `EMERALD_SESSION`
- [x] `getLongTermMemory()` / `saveLongTermMemory()` — ScriptProperties key `EMERALD_MEMORY`
- [x] `pruneConversationHistory()` — keeps last 20 turns
- [x] Session TTL: 24 hours of inactivity → auto-expires
- [x] After each response: saves conversation turn + recent actions (capped at 10)
- [x] `remember_note` tool — saves client notes or pinned reminders via chat
- [x] `clearEmeraldMemory()` — admin reset function
- [ ] On app load: restore last client from long-term memory (not yet implemented in UI)
- [ ] Display pinned reminders on load (not yet implemented in UI)

---

## Phase 8: Polish, Testing & Deployment — IN PROGRESS

### Deployment
- [x] Set `ANTHROPIC_API_KEY` in Script Properties
- [x] Deploy as Web App (Execute as: Me, Access: Only myself)
- [x] Web App URL confirmed live
- [ ] Add URL to iPhone home screen
- [ ] Verify all tools work through Web App (end-to-end testing)

### Polish — Planned for Monday March 3
- [ ] Restore last client on app load (from EMERALD_MEMORY.lastClient)
- [ ] Display pinned reminders on app load
- [ ] Loading skeleton for client list (shimmer animation)
- [ ] Page title updates with active client name
- [ ] Error state: API key missing alert on first load

### Template Management — Self-Service System (added 2026-03-01)
- [x] Template Registry sheet with setup migration
- [x] Manage Templates dialog (search Drive, wire, add new)
- [x] Registry-first lookups with hard-coded fallback
- [x] `manage_template` AI tool (search, wire, list_missing, list_all, rename_field)
- [x] Dynamic UI — buttons grey out for unwired templates
- [ ] Carlie runs Setup > Create Template Registry (one-time)
- [ ] Carlie wires remaining templates via Manage Templates dialog

### Dynamic Self-Service Systems (added 2026-03-01)
- [x] Dynamic Soul Emergence weeks — count + names from registry workbook entries
- [x] Field Labels registry — Akashic (18 fields) + Counseling (9 fields) in Template Registry
- [x] Field rename via Manage Templates dialog (Edit button) and via chat (rename_field action)
- [x] Dynamic doc type enums — generate_document tool reads from registry
- [x] Dynamic packet enums — generate_client_packet tool reads from registry
- [x] Dynamic workbook grid — UI builds week buttons from registry data
- [x] Config via Script Properties — PRACTITIONER_NAME, PRACTICE_NAME, AI_NAME, SESSION_DURATION_MINUTES
- [x] Setup > Configure Settings menu item
- [x] Dynamic system prompt — AI persona reads from config, rebrandable without code changes
- [x] Dynamic page title + sidebar brand from config
- [x] getConfig API endpoint for UI to fetch settings

### Template Wiring — Waiting on Carlie's answers (self-service now!)
- [ ] Wire workbook template IDs weeks 2–12 (Q6) — Carlie can do via Manage Templates
- [ ] Wire client literature template IDs: Intro, Packet 2, Packet 3 (Q7)
- [ ] Wire client homework template ID (Q8)
- [ ] Akashic field name changes if any (Q10) — Carlie can now rename in Manage Templates
- [ ] Newsletter Offer email template (Q11)

### Website Forms — Both offered (decided 2026-02-28)
- [ ] Carlie runs Setup > Create Opt-In Form → gets URL
- [ ] Carlie runs Setup > Create Website Inquiry Form → gets URL
- [ ] Carlie runs Setup > Install Form Triggers
- [ ] Website links updated to form URLs

### Testing — Planned for Tuesday March 4
- [ ] Test all 31+ tools via chat with each client type (Akashic, Counseling, Soul Emergence)
- [ ] Test Soul Emergence weeks 1–12 workbook buttons
- [ ] Test email flows (onboarding, newsletter, past client offer, newsletter offer)
- [ ] Test scheduling (add + delete session)
- [ ] Test safe write + clear (confirm protected cells rejected)
- [ ] Test memory: close and reopen app, verify session context restored
- [ ] Test on iPhone Safari (primary target)
- [ ] Test on desktop Chrome

---

## Phase 9: Acuity Scheduling Integration — PLANNED (Tuesday March 4)

> Blocked by Carlie's Acuity API credentials (ACUITY_QUESTIONS.md Q1-Q5)

### New Tools (5)
- [ ] `get_schedule` — read appointments for date range
- [ ] `check_availability` — check open slots for a date
- [ ] `reschedule_appointment` — move existing appointment (confirmation required)
- [ ] `block_time` — block off time
- [ ] `cancel_appointment` — cancel appointment (confirmation required)

### New Code
- [ ] `acuityFetch_()` — internal helper for Acuity REST API (Basic Auth)
- [ ] 5 `emerald_*` API wrapper functions in EmeraldAPI.gs
- [ ] 5 tool definitions in EmeraldAI.gs `getToolDefinitions()`
- [ ] 5 new cases in EmeraldAPI.gs `emeraldExecuteTool()` switch
- [ ] "Schedule" quick action chip in EmeraldUI.html
- [ ] Acuity credentials stored in Script Properties

### Confirmation Protocol
| Acuity Action | Confirmation Required |
|---------------|----------------------|
| Read schedule | No |
| Check availability | No |
| Reschedule | Yes |
| Block time | No |
| Cancel | Yes |

---

## Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-02-24 | GAS Web App deployment (not Cloud Run) | Simpler, no hosting cost, stays in Google ecosystem |
| 2026-02-24 | Vanilla JS (not React/Next.js) | GAS serves HTML; no build step needed; matches complexity |
| 2026-02-24 | claude-sonnet-4-6 | Best balance of capability and cost for multi-tool doula workflows |
| 2026-02-24 | ScriptProperties for memory | Built-in to GAS, no external DB needed, secure |
| 2026-02-24 | No changes to existing .gs files | Preserve existing system, automations, sidebar |
| 2026-02-24 | Sunset color palette | Matches Haven brand — warm, empowering, elegant |
| 2026-02-26 | google.script.run instead of fetch | Avoids CORS and login-redirect issues with GAS Web App |
| 2026-02-26 | Actions routed through chat (not direct API) | AI confirms before executing, consistent UX, single communication pattern |
| 2026-02-28 | Both website forms offered (Opt-In + Get In Touch) | Carlie wants both options available on her website |
| 2026-02-28 | Acuity integration planned as Phase 9 | Separate from polish/testing — depends on API credentials from Carlie |
| 2026-03-01 | Template Registry sheet for self-service management | Carlie can wire/update template IDs without code changes or redeploy |
| 2026-03-01 | Dynamic weeks, field labels, doc types, config from registry/properties | Full self-service: Carlie can rename fields, add weeks, change brand name — zero code changes |
| 2026-03-01 | Keep model as claude-sonnet-4-6 | Per Carlie's preference — Sonnet, not Opus |

---

## Bug Fixes Applied (2026-02-26) — Emerald Layer

| Fix | File | Issue |
|-----|------|-------|
| Added `create_new_client` to tool switch | EmeraldAPI.gs | Tool defined but not routed → "Unknown tool" error |
| Added `preview_newsletter` to tool switch | EmeraldAPI.gs | Tool defined but not routed → "Unknown tool" error |
| Wrapped `handleApiCall` in try-catch | EmeraldAPI.gs | Uncaught exceptions crashed UI instead of returning error |
| Fixed agentic loop exit condition | EmeraldAI.gs | `end_turn` OR check discarded tool_use blocks; now only exits when no tools |
| Model constant corrected | EmeraldAI.gs | Changed from `claude-opus-4-6` to `claude-sonnet-4-6` |
| add_lead column layout | EmeraldAPI.gs | Columns: A=Name, B=Date, C=Email, D=Service |

---

## Critical Bug Fix Session (2026-02-26) — Human Spreadsheet Layer

> Priority pivot: All fixes below target the **human-facing spreadsheet system** (sidebar + backend functions).
> The existing `SPREADSHEET APPS SCRIPT.gs` and `SPREADSHEET SIDEBAR CODE.html` were modified to fix production-blocking bugs.

### Root Causes Identified & Fixed

| # | Bug | Root Cause | Fix | File |
|---|-----|-----------|-----|------|
| 1 | **Scheduling sets December 1899 dates** | `normalizeTime()` received Date objects from `getValue()` but only handled strings. `String(Date)` → "Sat Dec 30 1899 14:00:00..." | Added `instanceof Date` check; extract `.getHours()`/`.getMinutes()` directly | SPREADSHEET APPS SCRIPT.gs |
| 2 | **Intake status false positives** | `checkIntakeStatus()` compared client email against ALL form fields, not just the email field | Added `ir.getItem().getTitle().toLowerCase().includes('email')` filter | SPREADSHEET APPS SCRIPT.gs + EmeraldAPI.gs |
| 3 | **Delete sessions finds nothing** | Events were created with corrupted dates (from bug #1), so they existed in the wrong time range | Fixed by resolving bug #1 (normalizeTime) | SPREADSHEET APPS SCRIPT.gs |
| 4 | **Sidebar buttons give no feedback** | `google.script.host.toast()` does not exist in GAS sidebars — every callback silently failed | Built DOM-based toast notification system (CSS + JS) | SPREADSHEET SIDEBAR CODE.html |
| 5 | **New client overwrites B8 formula** | `newClientSetup()` set B8 to `0`, overwriting the template formula | Removed `setValue(0)` line; B8 left to template formula | SPREADSHEET APPS SCRIPT.gs + EmeraldAPI.gs |
| 6 | **Leads column B shows "Direct" not date** | `addToLeads()` put string "Direct" in column B instead of today's date | Rewrote to always set `new Date()` in column B | SPREADSHEET APPS SCRIPT.gs |
| 7 | **Duplicate leads** | `addToLeads()` only checked email for duplicates; calls without email always added new rows | Added name+email matching with 3 match paths (email match, name+fill email, name match) | SPREADSHEET APPS SCRIPT.gs |
| 8 | **Refresh leads doesn't update date** | Existing lead rows matched but returned early without touching date column | Added `setValue(new Date())` to every match path | SPREADSHEET APPS SCRIPT.gs |
| 9 | **Email template list empty** | `getEmailTemplateList()` used `=== "Yes"` (case-sensitive) while sheet had variations | Changed to `String(row[2]).trim().toLowerCase() === "yes"` | SPREADSHEET APPS SCRIPT.gs |
| 10 | **Week 1 workbook template missing** | Placeholder ID was overwritten when code was updated | Restored real template ID: `1xJtINLKRfoMKYKfkVL8bxpiT7CDpyC7dndAe3hDSTvg` | SPREADSHEET APPS SCRIPT.gs |

### Files Modified

| File | Lines Changed | What Changed |
|------|--------------|-------------|
| `SPREADSHEET APPS SCRIPT.gs` | ~120 lines | normalizeTime(), newClientSetup(), checkIntakeStatus(), createIntakeDoc(), addToLeads(), addToLeadsWithSource(), getEmailTemplateList(), WORKBOOK_TEMPLATES[1] |
| `SPREADSHEET SIDEBAR CODE.html` | ~30 lines | Added toast CSS, toast DOM element, replaced broken `google.script.host.toast()` with DOM-based `showSidebarToast()` |
| `EmeraldAPI.gs` | ~15 lines | B8 overwrite removed from `emerald_createNewClient()`, email-only filtering in `emerald_checkIntakeStatus()` and `emerald_createIntakeDoc()` |

### Known Remaining Issues

| Issue | Status | Notes |
|-------|--------|-------|
| Workbook template IDs weeks 2–12 | **Needs user input** | Still placeholder IDs; user must provide real Google Doc URLs |
| `CLIENT_LIT_TEMPLATES` (Intro Packet, Packet 2, Packet 3) | **Needs user input** | Placeholder IDs with `YOUR_` prefix |
| `TEMPLATE_CLIENT_HOMEWORK` | **Needs user input** | Placeholder ID |
| `TEMPLATE_SOUL_EMERGENCE_SUMMARY` | **Needs user input** | Placeholder ID |
| B5 shows email instead of phone | **Template issue** | Not a code bug — user's client templates may have a formula in B5 referencing B4 |

### Decision Log Update

| Date | Decision | Reason |
|------|----------|--------|
| 2026-02-26 | Modified existing SPREADSHEET APPS SCRIPT.gs | Critical production bugs in human-facing system required fixes; "never modify" rule superseded by user directive |
| 2026-02-26 | Modified existing SPREADSHEET SIDEBAR CODE.html | Toast notifications were completely broken; `google.script.host.toast()` doesn't exist in GAS sidebars |
| 2026-02-26 | Human spreadsheet layer prioritized over Emerald AI | User actively using sidebar daily; AI layer can wait until human tools work perfectly |
