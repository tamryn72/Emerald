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

### Polish — Remaining
- [ ] Loading skeleton for client list
- [ ] Error state: API key missing alert on first load
- [ ] Page title updates with active client name
- [ ] Restore last client on app load (from EMERALD_MEMORY.lastClient)
- [ ] Display pinned reminders on app load

### Testing — Remaining
- [ ] Test all 31 tools via chat with each client type (Akashic, Counseling, Soul Emergence)
- [ ] Test Soul Emergence weeks 1–12 workbook buttons
- [ ] Test email flows (onboarding, newsletter, past client offer)
- [ ] Test scheduling (add + delete session)
- [ ] Test safe write + clear (confirm protected cells rejected)
- [ ] Test memory: close and reopen app, verify session context restored
- [ ] Test on iPhone Safari (primary target)
- [ ] Test on desktop Chrome

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

---

## Bug Fixes Applied (2026-02-26)

| Fix | File | Issue |
|-----|------|-------|
| Added `create_new_client` to tool switch | EmeraldAPI.gs | Tool defined but not routed → "Unknown tool" error |
| Added `preview_newsletter` to tool switch | EmeraldAPI.gs | Tool defined but not routed → "Unknown tool" error |
| Wrapped `handleApiCall` in try-catch | EmeraldAPI.gs | Uncaught exceptions crashed UI instead of returning error |
| Fixed agentic loop exit condition | EmeraldAI.gs | `end_turn` OR check discarded tool_use blocks; now only exits when no tools |
| Model constant corrected | EmeraldAI.gs | Changed from `claude-opus-4-6` to `claude-sonnet-4-6` |
| add_lead column layout | EmeraldAPI.gs | Columns: A=Name, B=Date, C=Email, D=Service |
