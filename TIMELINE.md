# TIMELINE.md — Emerald Development Plan

> Phased roadmap for building Emerald from planning to production.
> Model: `claude-opus-4-6` | Stack: GAS Web App + Vanilla JS + Anthropic API

---

## Phase Overview

```
Phase 1 ──── Documentation & Architecture     [COMPLETE]
Phase 2 ──── GAS Web App Backend Foundation   [Next]
Phase 3 ──── Claude AI Integration            [After Phase 2]
Phase 4 ──── Frontend: Chat UI                [After Phase 3]
Phase 5 ──── Frontend: Client Sidebar         [Parallel with Phase 4]
Phase 6 ──── Tool Wiring: All 32+ Actions     [After Phase 4-5]
Phase 7 ──── Memory System                    [After Phase 6]
Phase 8 ──── Polish, Testing & Deployment     [Final]
```

---

## Phase 1: Documentation & Architecture

**Status: COMPLETE**

### Deliverables
- [x] `CLAUDE.md` — master project reference
- [x] `MEMORY.md` — memory architecture design
- [x] `CONTEXT.md` — Claude system prompt + full tool schema
- [x] `TIMELINE.md` — this document

### Files Created
- `/CLAUDE.md`
- `/MEMORY.md`
- `/CONTEXT.md`
- `/TIMELINE.md`

---

## Phase 2: GAS Web App Backend Foundation

**Goal:** Set up the web app entry point, client data API, and safe read/write bridge.

### Tasks

#### 2.1 Create `EmeraldAPI.gs`

**`doGet(e)`** — serve the Emerald UI
```
- Return HtmlService output of EmeraldUI.html
- Set viewport meta for mobile
- Set title: "Emerald | Haven"
```

**`doPost(e)`** — route incoming requests
```
Actions to handle:
  ├── action: 'chat'             → callEmeraldAI(messages, clientName)
  ├── action: 'getClients'       → emeraldGetClientList()
  ├── action: 'getClientInfo'    → emeraldGetClientInfo(clientName)
  ├── action: 'getEmailTemplates'→ getEmailTemplateList()
  ├── action: 'getMemory'        → getLongTermMemory()
  └── action: 'saveNote'        → saveClientNote(clientName, note)
```

**`emeraldGetClientList()`**
```
- Scan all sheets in the spreadsheet
- Skip system sheets (Dashboard, Leads, Past Clients, Budget, etc.)
- For each client sheet, read: B2 (name), B3 (status), B6 (service type), D3 (type)
- Return array of client objects
- Sort: Active first, then Complete
```

**`emeraldGetClientInfo(clientName)`**
```
- Find sheet by name
- Read all relevant cells (see CLAUDE.md Spreadsheet Structure table)
- Return full client data object
- Include type-specific fields based on D3 value
```

**`emeraldSafeWrite(clientName, cell, value)`**
```
- Validate cell is in the safe-write whitelist
- Validate client sheet exists
- Write value
- Return success/error
```

**`emeraldSafeClear(clientName, cell)`**
```
- Same validation as safeWrite
- Clear content only (no format changes)
```

**Safe Write Whitelist:**
```javascript
const SAFE_WRITE_CELLS = {
  common: ['B4', 'B5', 'B7', 'B8', 'B9', 'B10', 'B11', 'D10'],
  Akashic: ['B13','B14','B15','B16','B17','B20','B21','B22','B25','B26','B27','B28','B29','B31','B32','B33','B36','B37'],
  Counseling: ['B14','B15','B16','B17','B18','B19','B20','B21','B22','B23'],
  'Soul Emergence': ['B13','B14','B15','B16','B17','B18','B19','B20','B21','B22','B23','B24','B25']
};
```

**`emeraldActivateClientSheet(clientName)`**
```
- Set the active sheet to the named client sheet
- Required before calling existing backend_ functions
  (they use SpreadsheetApp.getActiveSheet())
```

#### 2.2 Tool Execution Bridge

Many existing functions rely on `SpreadsheetApp.getActiveSheet()`. The bridge must:
1. Set the correct client sheet as active
2. Call the existing function
3. Capture the return value or success/error state
4. Restore context if needed

```javascript
function emeraldExecuteTool(toolName, toolInput) {
  const clientName = toolInput.clientName;

  // Activate client sheet if needed
  if (clientName) {
    emeraldActivateClientSheet(clientName);
  }

  switch(toolName) {
    case 'generate_document':
      return backend_generateDoulaDoc(toolInput.docType);
    case 'send_workbook':
      return backend_sendWorkbook(toolInput.weekNumber);
    case 'send_onboarding_email':
      return sendOnboardingEmail();
    case 'check_intake_status':
      return checkIntakeStatus();
    case 'create_intake_doc':
      return createIntakeDoc();
    case 'add_session':
      return addNextSession();
    case 'delete_session':
      return deleteSession();
    case 'record_payment':
      return recordClientPayment();
    case 'send_receipt':
      return sendReceipt();
    case 'get_client_folder_url':
      return backend_openClientFolder();
    case 'create_journal':
      return backend_createJournal();
    case 'get_journal_url':
      return backend_openJournal();
    case 'generate_client_packet':
      return backend_generateClientPacket(toolInput.packetType);
    case 'send_email_template':
      return backend_sendSalesEmailTemplate(toolInput.templateName);
    case 'send_newsletter':
      return backend_sendNewsletterToAll();
    case 'send_past_client_offer':
      return toolInput.sendToAll
        ? backend_sendPastClientOfferAll()
        : backend_sendPastClientOfferOne();
    case 'refresh_dashboard':
      return refreshDoulaDashboard();
    case 'write_cell':
      return emeraldSafeWrite(clientName, toolInput.cell, toolInput.value);
    case 'clear_cell':
      return emeraldSafeClear(clientName, toolInput.cell);
    default:
      throw new Error('Unknown tool: ' + toolName);
  }
}
```

### Files
- `Tula App/EmeraldAPI.gs` — Created in this phase

---

## Phase 3: Claude AI Integration

**Goal:** Wire up `claude-opus-4-6` with tool use, memory, and context injection.

### Tasks

#### 3.1 Create `EmeraldAI.gs`

**`callClaudeAPI(messages, tools, systemPrompt)`**
```
- Retrieve ANTHROPIC_API_KEY from ScriptProperties
- Build request payload:
    model: 'claude-opus-4-6'
    max_tokens: 1024
    system: systemPrompt (with context injected)
    messages: messages array
    tools: tools array
- Call https://api.anthropic.com/v1/messages via UrlFetchApp
- Parse response
- Handle tool_use stop reason:
    → Execute the tool via emeraldExecuteTool()
    → Append tool_use and tool_result to messages
    → Call Claude again with result (agentic loop)
- Return final text response
```

**`buildSystemPrompt(activeClientName)`**
```
- Load CONTEXT.md system prompt text (hardcoded in EmeraldAI.gs)
- If activeClientName provided:
    → Call emeraldGetClientInfo(activeClientName)
    → Build ACTIVE_CLIENT_CONTEXT block
- Load session memory → build SESSION_HISTORY_SUMMARY
- Inject today's date
- Return complete system prompt string
```

**`handleChatRequest(userMessage, activeClientName, conversationHistory)`**
```
- Build system prompt
- Append userMessage to conversationHistory
- Call callClaudeAPI with all tools
- Handle multi-step tool use (agentic loop until stop_reason = 'end_turn')
- Save updated conversation to session memory
- Return { reply: string, actions: [] }
```

**`getToolDefinitions()`**
```
- Return the complete tools array (all 32+ tools)
- Each tool matches the schema in CONTEXT.md
```

#### 3.2 Memory Functions

**`getSessionMemory()`** — load from ScriptProperties key `EMERALD_SESSION`
**`saveSessionMemory(session)`** — save to ScriptProperties
**`getLongTermMemory()`** — load from ScriptProperties key `EMERALD_MEMORY`
**`saveLongTermMemory(mem)`** — save to ScriptProperties
**`pruneConversationHistory(history)`** — keep last 20 turns
**`buildContextSnapshot(clientName)`** — assemble Layer 1 context

#### 3.3 Tool Agentic Loop

Claude may call multiple tools in sequence. The loop:
```
1. Send messages to Claude
2. If response.stop_reason === 'tool_use':
     a. Extract tool_use blocks from response.content
     b. For each tool_use block:
         - Call emeraldExecuteTool(tool.name, tool.input)
         - Build tool_result message
     c. Append assistant response + user tool_results to messages
     d. Call Claude again
3. Continue until stop_reason === 'end_turn'
4. Return final text content
```

Max 10 iterations to prevent infinite loops.

### Files
- `Tula App/EmeraldAI.gs` — Created in this phase

---

## Phase 4: Frontend — Chat Interface

**Goal:** Build the mobile-first chat UI in `EmeraldUI.html`.

### Layout (Mobile-First)

```
┌─────────────────────────────────┐
│ HEADER                          │
│ ◆ Emerald   [Client Name] ▼    │
│ Haven, The Awakening Doula      │
├─────────────────────────────────┤
│                                 │
│ CHAT AREA (scrollable)          │
│                                 │
│   ┌──────────────────────────┐  │
│   │ Emerald                  │  │
│   │ Good morning, Carlie.    │  │
│   │ Jane's Week 5 session    │  │
│   │ is tomorrow at 2 PM.     │  │
│   └──────────────────────────┘  │
│                                 │
│        ┌──────────────────────┐ │
│        │ User message bubble  │ │
│        └──────────────────────┘ │
│                                 │
│   ┌──────────────────────────┐  │
│   │ ACTION CONFIRMATION      │  │
│   │ Send Week 5 workbook to  │  │
│   │ jane@email.com?          │  │
│   │ [Yes, send it] [Cancel]  │  │
│   └──────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ QUICK ACTIONS (scrollable row)  │
│ [Docs] [Onboard] [Schedule]     │
│ [Pay] [Email] [Utils]           │
├─────────────────────────────────┤
│ INPUT BAR                       │
│ [☰] [Type a message...  ] [→]  │
└─────────────────────────────────┘
```

### Desktop Layout (sidebar visible)

```
┌──────────────┬──────────────────────────────────┐
│ CLIENT LIST  │ HEADER                           │
│              │ ◆ Emerald  — Jane Doe            │
│ ● Jane Doe   ├──────────────────────────────────┤
│   SE Wk 5   │ CHAT AREA                        │
│ ● Mary Smith │                                  │
│   Akashic   │   [Emerald bubble]               │
│ ○ Past Cl.  │                                  │
│             │        [User bubble]              │
│ [+ New      │                                  │
│   Client]   │   [Action buttons panel]         │
│             ├──────────────────────────────────┤
│ QUICK STATS  │ QUICK ACTIONS ROW                │
│ 2 Active    ├──────────────────────────────────┤
│ 1 Complete  │ [Type a message...           ] → │
└──────────────┴──────────────────────────────────┘
```

### Components

**Header**
- Logo gem icon + "Emerald" name in deep burnt umber
- Current client name (clickable → opens client selector on mobile)
- "Haven, The Awakening Doula" subtitle

**Chat Area**
- Smooth scroll to bottom on new messages
- AI bubbles: left-aligned, warm peach background, gem icon
- User bubbles: right-aligned, coral background, white text
- Typing indicator (animated dots) while waiting for Claude
- Timestamp on each message (subtle, small)
- Action confirmation cards (inline, not modals):
  - Summary of what's about to happen
  - "Yes, do it" (primary coral button)
  - "Never mind" (ghost button)

**Quick Actions Row**
- Horizontal scroll strip below chat, above input
- One chip per action category: Documents, Onboarding, Schedule, Financial, Emails, Utilities
- Tapping a chip expands a bottom sheet with that section's buttons
- Buttons in bottom sheet match the existing sidebar exactly

**Action Bottom Sheet**
- Slides up from bottom (mobile-native feel)
- Section title + list of buttons
- Each button triggers the action directly (bypasses chat) or asks Emerald to do it
- Buttons are styled by type: primary (coral), accent (gold), secondary (cream)

**Input Bar**
- Menu icon → opens client sidebar (mobile)
- Text input: "Ask Emerald anything..."
- Send button (arrow icon, coral)
- Pressing Enter sends on desktop

**Client Sidebar (mobile: drawer, desktop: fixed left)**
- Client search/filter input at top
- Client cards: Name, service type badge, week indicator (if Soul Emergence)
- Status dot: green (active), grey (complete)
- "New Client" button at bottom
- Tapping a client: selects them, closes drawer, Emerald greets with their context

### CSS Design Tokens (Sunset System)

All from the design system in CLAUDE.md. Additional UI-specific tokens:

```css
--chat-bubble-ai:     #FFF3EC;
--chat-bubble-user:   #E8654A;
--chip-bg:            #FFF8F3;
--chip-border:        #F0D9CA;
--chip-active-bg:     #E8654A;
--chip-active-color:  #ffffff;
--sheet-bg:           #FFF8F3;
--sheet-handle:       #E8B99A;
--typing-dot:         #D4A762;
```

### Files
- `Tula App/EmeraldUI.html` — Created in this phase

---

## Phase 5: Frontend — Client Sidebar

**Goal:** Build the client selection sidebar / drawer.

### Tasks

- Load client list via `doPost({ action: 'getClients' })` on app start
- Display each client as a card with:
  - Name
  - Service type badge (Akashic/Counseling/Soul Emergence)
  - Status indicator
  - Soul Emergence: current week pill
- Active client: highlighted with coral border + glow
- Client search: filter by name in real time
- New Client button: opens mini-form modal (name + type select) → calls `newClientSetup` equivalent
- On client tap: select client, close drawer, inject client context into next chat

---

## Phase 6: Tool Wiring — All Actions

**Goal:** Wire every button and tool to its correct backend function.

### Wiring Checklist

Every action below must be tested end-to-end:

**Document Generation**
- [ ] Session Notes → `backend_generateDoulaDoc("Session Notes")`
- [ ] Integration Guide → `backend_generateDoulaDoc("Integration Guide")`
- [ ] Breathwork Notes → `backend_generateDoulaDoc("Breathwork Notes")`
- [ ] Akashic Notes → `backend_generateDoulaDoc("Akashic Notes")`
- [ ] Counseling Notes → `backend_generateDoulaDoc("Counseling Notes")`
- [ ] Client Homework → `backend_generateDoulaDoc("Client Homework")`
- [ ] Client Summary → `backend_generateDoulaDoc("Client Summary")`
- [ ] Soul Emergence Summary → `backend_generateDoulaDoc("Soul Emergence Summary")`
- [ ] Intro Packet → `backend_generateClientPacket("Intro Packet")`
- [ ] Packet 2 → `backend_generateClientPacket("Packet 2")`
- [ ] Packet 3 → `backend_generateClientPacket("Packet 3")`

**Soul Emergence**
- [ ] Week 1–12 Workbooks → `backend_sendWorkbook(n)` for each n
- [ ] Create Journal → `backend_createJournal()`
- [ ] Open Journal → `backend_openJournal()` → open URL

**Onboarding**
- [ ] Send Onboarding → `sendOnboardingEmail()`
- [ ] Check Intake → `checkIntakeStatus()`
- [ ] Create Intake Doc → `createIntakeDoc()`

**Scheduling**
- [ ] Add Session → `addNextSession()`
- [ ] Delete Session → `deleteSession()`

**Financial**
- [ ] Record Payment → `recordClientPayment()`
- [ ] Send Receipt → `sendReceipt()`
- [ ] Open Budget → `backend_openBudgetSheet()`

**Emails**
- [ ] Preview Newsletter → `backend_previewNewsletter()`
- [ ] Send Newsletter → `backend_sendNewsletterToAll()`
- [ ] Dynamic email templates → `backend_sendSalesEmailTemplate(name)`
- [ ] Past Client Offer All → `backend_sendPastClientOfferAll()`
- [ ] Past Client Offer One → `backend_sendPastClientOfferOne()`

**Utilities**
- [ ] Open Client Folder → `backend_openClientFolder()` → open URL
- [ ] Refresh Dashboard → `refreshDoulaDashboard()`
- [ ] Refresh Leads → `refreshLeads()`

**AI Read/Write**
- [ ] Read client data → `emeraldGetClientInfo()`
- [ ] Write session notes / scheduling → `emeraldSafeWrite()`
- [ ] Clear cell → `emeraldSafeClear()`

---

## Phase 7: Memory System

**Goal:** Implement session and long-term memory.

### Tasks

- [ ] Implement `getSessionMemory()` / `saveSessionMemory()`
- [ ] Implement `getLongTermMemory()` / `saveLongTermMemory()`
- [ ] Implement `pruneConversationHistory()`
- [ ] On app load: restore last client + recent session
- [ ] After each response: save conversation turn
- [ ] After each tool call: append to `recentActions`
- [ ] "Remember..." command processing in Claude tool: `remember_note`
- [ ] Display pinned reminders on load (if any)
- [ ] `clearEmeraldMemory()` admin function

---

## Phase 8: Polish, Testing & Deployment

**Goal:** Production-ready, tested, deployed.

### Tasks

**Polish**
- [ ] Loading skeletons for client list
- [ ] Smooth animations: sidebar slide, bottom sheet slide-up, message fade-in
- [ ] Error states: network error toast, API key missing alert
- [ ] Empty state: "Select a client to get started"
- [ ] Responsive breakpoints: 375px (iPhone SE) to 1440px (desktop)
- [ ] Favicon: gem emoji or custom SVG
- [ ] Page title updates with active client name

**Testing**
- [ ] Test all 32+ tools via chat with each client type
- [ ] Test Soul Emergence weeks 1–12 (all 12 workbook buttons)
- [ ] Test email flows (draft creation, newsletter, past client offer)
- [ ] Test scheduling (add + delete session)
- [ ] Test safe write + clear (confirm protected cells rejected)
- [ ] Test memory: close and reopen app, verify context restored
- [ ] Test on iPhone Safari (primary target)
- [ ] Test on Chrome mobile emulator
- [ ] Test on desktop Chrome/Firefox

**Deployment**
- [ ] Set `ANTHROPIC_API_KEY` in Script Properties
- [ ] Deploy as Web App (Execute as: Me, Access: Only myself)
- [ ] Test Web App URL loads correctly
- [ ] Add URL to iPhone home screen (Add to Home Screen)
- [ ] Verify all tools work through Web App (not just script editor)

**Documentation**
- [ ] Update CLAUDE.md with Web App URL
- [ ] Note deployment date and version in CLAUDE.md

---

## Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-02-24 | GAS Web App deployment (not Cloud Run) | Simpler, no hosting cost, stays in Google ecosystem |
| 2026-02-24 | Vanilla JS (not React/Next.js) | GAS serves HTML; no build step needed; matches complexity |
| 2026-02-24 | claude-opus-4-6 | Most capable model for nuanced multi-tool reasoning |
| 2026-02-24 | ScriptProperties for memory | Built-in to GAS, no external DB needed, secure |
| 2026-02-24 | No changes to existing .gs files | Preserve existing system, automations, sidebar |
| 2026-02-24 | Sunset color palette | Matches Haven brand — warm, empowering, elegant |

---

## Questions & Answers

> These were clarified before development began.

**Q: Where is Wanderlust/Gilligan?**
A: Provided by user in text — Next.js + Tailwind + GAS backend + Cloud Run. Emerald mirrors the component architecture (sidebar, chat, cards, modals) adapted for GAS-native HTML delivery.

**Q: Deployment?**
A: Google Apps Script Web App — simplest path, no external hosting.

**Q: Auth?**
A: Single practitioner (Carlie Wyton). Web App runs as her Google account. No login screen needed.

**Q: API key?**
A: Stored in GAS Script Properties (`ANTHROPIC_API_KEY`). Never exposed to the browser.

**Q: Can the spreadsheet be modified?**
A: No. All new code is additive only. `SPREADSHEET APPS SCRIPT.gs` is never touched.
