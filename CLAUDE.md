# CLAUDE.md — Emerald AI

> **Project:** Emerald — AI Assistant for Haven, The Awakening Doula
> **Model:** `claude-sonnet-4-6` (Anthropic, February 2026)
> **Practitioner:** Carlie Wyton, MA
> **Brand voice:** Haven, The Awakening Doula

---

## What This Project Is

Emerald is a mobile-first AI chat interface for Haven, The Awakening Doula. It gives the practitioner a phone-app experience to manage every aspect of their client practice — through conversation, through tapping buttons, or through a mix of both.

Emerald can:
- Browse and select clients from a sidebar list
- Read client data from the spreadsheet in real time
- Write or clear cell data (within safe, non-automation ranges)
- Trigger any of the 50+ backend actions that exist in the spreadsheet system
- Answer questions, draft content, and guide workflows conversationally

Emerald **cannot**:
- Modify the spreadsheet structure (no sheet creation/deletion via AI)
- Interfere with form triggers or automation functions (`onFormSubmit`, `onOptInFormSubmit`, `onInquiryFormSubmit`)
- Access any cell outside the defined safe write ranges for each client type

---

## Architecture

Emerald follows the Wanderlust/Gilligan pattern: a Next.js-style component-driven frontend, a Google Apps Script backend that exposes a Web App API, and Claude as the AI reasoning layer with tool use.

```
┌─────────────────────────────────────────────────────────┐
│  Emerald UI  (EmeraldUI.html — GAS Web App)             │
│                                                         │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │ Client       │  │ Chat Area                        │ │
│  │ Sidebar      │  │  • Message thread                │ │
│  │              │  │  • Emerald responses             │ │
│  │  ● Client A  │  │  • Action confirmations          │ │
│  │  ● Client B  │  │                                  │ │
│  │  ● Client C  │  │ Action Panel (per client type)   │ │
│  │              │  │  ▸ DOCUMENTS                     │ │
│  │  [+ New]     │  │  ▸ ONBOARDING                   │ │
│  └──────────────┘  │  ▸ SCHEDULING                   │ │
│                    │  ▸ FINANCIAL                     │ │
│                    │  ▸ EMAILS                        │ │
│                    └──────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────┘
                                  │ google.script.run / fetch
                    ┌─────────────▼───────────────────────┐
                    │  EmeraldAPI.gs  (GAS Web App)       │
                    │   doGet() → serve UI                │
                    │   doPost() → route actions          │
                    │    ├── Chat → EmeraldAI.gs          │
                    │    ├── Client list                  │
                    │    ├── Client data (read)           │
                    │    └── Direct actions               │
                    └─────────────┬───────────────────────┘
                    ┌─────────────▼───────────────────────┐
                    │  EmeraldAI.gs  (Claude layer)       │
                    │   callClaude() with tool_use        │
                    │   Tool dispatcher                   │
                    │   Memory (ScriptProperties)         │
                    └─────────────┬───────────────────────┘
                    ┌─────────────▼───────────────────────┐
                    │  SPREADSHEET APPS SCRIPT.gs         │
                    │  (existing — never modified)        │
                    │   backend_generateDoulaDoc()        │
                    │   backend_sendWorkbook()            │
                    │   addNextSession()                  │
                    │   recordClientPayment()             │
                    │   … all 50+ existing functions      │
                    └─────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, Vanilla JS (ES6+), CSS3 — served by GAS |
| Styling | Custom CSS — sunset design system (no framework needed at this scale) |
| Backend | Google Apps Script (Web App — `doGet` / `doPost`) |
| Data | Google Sheets (existing — read-only structure) |
| AI | Anthropic Claude claude-sonnet-4-6 via REST API |
| Storage | GAS ScriptProperties (API key, memory, session state) |
| Deployment | Google Apps Script Web App URL (no external hosting) |
| Auth | Single-user; GAS runs as practitioner's Google account |

---

## File Structure

```
Emerald/
├── CLAUDE.md              ← You are here
├── MEMORY.md              ← Memory & context architecture
├── CONTEXT.md             ← Claude system prompt + persona
├── TIMELINE.md            ← Phased development plan
└── Tula App/
    ├── SPREADSHEET APPS SCRIPT.gs    ← EXISTING — do not modify
    ├── SPREADSHEET SIDEBAR CODE.html ← EXISTING — do not modify
    ├── EmeraldAPI.gs                 ← NEW: Web App entry + data bridge
    ├── EmeraldAI.gs                  ← NEW: Claude integration + tools
    └── EmeraldUI.html                ← NEW: Mobile-first chat UI
```

> **Golden Rule:** Never modify `SPREADSHEET APPS SCRIPT.gs` or `SPREADSHEET SIDEBAR CODE.html`. All new code is additive only.

---

## Spreadsheet Structure (Read Reference)

### System Sheets (never write to these via AI)
- `Dashboard` — auto-populated by `refreshDoulaDashboard()`
- `Leads` — managed by `addToLeads()` / `refreshLeads()`
- `Past Clients` — managed by `addToPastClients()`
- `Email_Templates` — read-only for AI
- `Intake Log` — written only by `createIntakeDoc()`
- `Budget` — written only by `recordClientPayment()`
- `Document Log` — written only by `logDoulaDoc()`
- `Akashic_Client_Template` — template sheet
- `Counseling_Client_Template` — template sheet
- `SoulEmergence_Client_Template` — template sheet

### Client Sheets (AI safe read range + safe write range)

Every client sheet follows this layout:

| Cell | Field | AI Access |
|------|-------|-----------|
| A12 | Client Folder ID (Drive) | READ only |
| B2 | Client Name | READ only |
| B3 | Status (Active/Complete) | READ only (set via `markClientComplete`) |
| B4 | Email | READ + safe write |
| B5 | Phone | READ + safe write |
| B6 | Service Type | READ only |
| B7 | Package Type | READ + safe write |
| B8 | Sessions Total | READ + safe write |
| B9 | Sessions Used | READ + safe write |
| B10 | Next Session Date | READ + safe write |
| B11 | Session Price | READ + safe write |
| D3 | Client Type (Akashic/Counseling/Soul Emergence) | READ only |
| D7 | Intake Status | READ only (set via onboarding functions) |
| D10 | Session Time | READ + safe write |
| E4 | Journal Doc ID (Soul Emergence) | READ only |
| E11 | Payment Status | READ only (set via `recordClientPayment`) |
| F1 | Current Week (Soul Emergence) | READ only |

#### Akashic Client Fields (safe write)
| Cell | Field |
|------|-------|
| B13 | Themes |
| B14 | Soul Messages |
| B15 | Blocks |
| B16 | Openings |
| B17 | Past Life Notes |
| B20 | Breath Insights |
| B21 | Body Feedback |
| B22 | Breath Energy |
| B25 | Regulation |
| B26 | Triggers |
| B27 | Soothing |
| B28 | Routine |
| B29 | Nervous Energy |
| B31 | Session Notes |
| B32 | Insight Downloads |
| B33 | Integration Tasks |
| B36 | Completion Notes |
| B37 | Completion Date |

#### Counseling Client Fields (safe write)
| Cell | Field |
|------|-------|
| B14 | Themes |
| B15 | Patterns |
| B16 | Blocks |
| B17 | Connections |
| B18 | Concerns |
| B19 | Notice |
| B20 | Progress |
| B21 | Planning |
| B22 | Homework |
| B23 | Follow Up |

#### Soul Emergence Fields (safe write)
| Rows | Field |
|------|-------|
| B13 | Week 1 Notes (The Threshold) |
| B14 | Week 2 Notes (Akashic Records Reading) |
| B15 | Week 3 Notes (Integration & Intention) |
| B16 | Week 4 Notes (Akashic Clearing) |
| B17 | Week 5 Notes (Befriending Your Nervous System) |
| B18 | Week 6 Notes (Parts Work Integration) |
| B19 | Week 7 Notes (Timeline Therapy & Reprocessing) |
| B20 | Week 8 Notes (Clearing Old Programming) |
| B21 | Week 9 Notes (Honoring What Was) |
| B22 | Week 10 Notes (Releasing Expectations & Ritual Goodbye) |
| B23 | Week 11 Notes (Final Akashic Clearing) |
| B24 | Week 12 Notes (Emergence & Integration) |
| B25 | Final Summary |

#### Cells AI Must Never Write
- `A12` — Folder ID (only set by `newClientSetup`)
- `B2` — Client Name (set at creation)
- `B3` — Status (only via `markClientCompleteMenu`)
- `B6` — Service Type (set at creation)
- `D3` — Client Type (set at creation)
- `D7` — Intake Status (only via onboarding functions)
- `E4` — Journal Doc ID (only via `createPrivateJournal`)
- `E11` — Payment Status (only via `recordClientPayment`)
- Rows 100+ Column X — Event ID storage (only via scheduling functions)

---

## Complete Tool Map

Every Apps Script function is exposed to Claude as a named tool. Emerald can invoke any of these.

### Group 1: Client Information (Read-Only)
| Tool Name | Calls | Description |
|-----------|-------|-------------|
| `get_client_list` | Direct sheet scan | Returns all non-system sheets with B2/B3/B6 |
| `get_client_info` | Direct sheet read | Returns full client data for named client |
| `get_client_type` | `getClientTypeForSidebar()` | Returns Akashic/Counseling/Soul Emergence |
| `read_cell` | Direct read | Read any safe cell value |
| `read_range` | Direct read | Read a range of cells |

### Group 2: Client Management
| Tool Name | Calls | Description |
|-----------|-------|-------------|
| `create_new_client` | `newClientSetup()` | Create client (name + type) |
| `mark_client_complete` | `markClientCompleteMenu()` | Mark client done + add to past clients |
| `write_cell` | Direct write | Write to a safe cell |
| `clear_cell` | Direct clear | Clear a safe cell |

### Group 3: Document Generation
| Tool Name | Calls | Description |
|-----------|-------|-------------|
| `generate_session_notes` | `backend_generateDoulaDoc("Session Notes")` | Session notes doc |
| `generate_integration_guide` | `backend_generateDoulaDoc("Integration Guide")` | Integration guide |
| `generate_breathwork_notes` | `backend_generateDoulaDoc("Breathwork Notes")` | Breathwork notes |
| `generate_akashic_notes` | `backend_generateDoulaDoc("Akashic Notes")` | Akashic notes |
| `generate_counseling_notes` | `backend_generateDoulaDoc("Counseling Notes")` | Counseling notes |
| `generate_client_homework` | `backend_generateDoulaDoc("Client Homework")` | Client homework |
| `generate_client_summary` | `backend_generateDoulaDoc("Client Summary")` | Client summary |
| `generate_soul_emergence_summary` | `backend_generateDoulaDoc("Soul Emergence Summary")` | SE summary |
| `generate_intro_packet` | `backend_generateClientPacket("Intro Packet")` | Intro literature |
| `generate_packet_2` | `backend_generateClientPacket("Packet 2")` | Packet 2 |
| `generate_packet_3` | `backend_generateClientPacket("Packet 3")` | Packet 3 |

### Group 4: Soul Emergence Program
| Tool Name | Calls | Description |
|-----------|-------|-------------|
| `send_workbook_week` | `backend_sendWorkbook(n)` | Send week N workbook (1–12) |
| `create_private_journal` | `backend_createJournal()` | Create private journal |
| `get_journal_url` | `backend_openJournal()` | Get journal link |

### Group 5: Onboarding
| Tool Name | Calls | Description |
|-----------|-------|-------------|
| `send_onboarding_email` | `sendOnboardingEmail()` | Send intake form |
| `check_intake_status` | `checkIntakeStatus()` | Check if intake submitted |
| `create_intake_doc` | `createIntakeDoc()` | Create intake document |

### Group 6: Scheduling
| Tool Name | Calls | Description |
|-----------|-------|-------------|
| `add_session_to_calendar` | `addNextSession()` | Add calendar event |
| `delete_session_from_calendar` | `deleteSession()` | Delete calendar event |

### Group 7: Financial
| Tool Name | Calls | Description |
|-----------|-------|-------------|
| `record_payment` | `recordClientPayment()` | Record payment |
| `send_receipt` | `sendReceipt()` | Send receipt email |
| `get_budget_url` | `backend_openBudgetSheet()` | Open budget |

### Group 8: Email & Marketing
| Tool Name | Calls | Description |
|-----------|-------|-------------|
| `send_email_template` | `backend_sendSalesEmailTemplate(name)` | Send template email |
| `get_email_templates` | `getEmailTemplateList()` | List active templates |
| `preview_newsletter` | `backend_previewNewsletter()` | Preview newsletter |
| `send_newsletter_all` | `backend_sendNewsletterToAll()` | Send newsletter to all leads |
| `send_past_client_offer_all` | `backend_sendPastClientOfferAll()` | Offer to all past clients |
| `send_past_client_offer_one` | `backend_sendPastClientOfferOne()` | Offer to one past client |

### Group 9: Utilities
| Tool Name | Calls | Description |
|-----------|-------|-------------|
| `get_client_folder_url` | `backend_openClientFolder()` | Client Drive folder |
| `refresh_dashboard` | `refreshDoulaDashboard()` | Refresh dashboard |
| `refresh_leads` | `refreshLeads()` | Refresh leads list |
| `add_lead` | `addToLeads(name, email)` | Add lead manually |

---

## Design System — Sunset

```css
/* Sunset Palette */
--emerald-bg:         #FDF0E8;   /* Warm peach cream — main background */
--emerald-surface:    #FFF8F3;   /* Soft white — cards, panels */
--emerald-primary:    #E8654A;   /* Sunset coral — primary actions */
--emerald-primary-dk: #C4472F;   /* Deep coral — hover states */
--emerald-gold:       #D4A762;   /* Amber gold — accents, highlights */
--emerald-gold-dk:    #B88840;   /* Deep gold — gold hover */
--emerald-deep:       #7B3F2A;   /* Burnt umber — headers, emphasis */
--emerald-text:       #2C1810;   /* Rich dark — body text */
--emerald-muted:      #A87B6E;   /* Rosy stone — secondary text */
--emerald-border:     #F0D9CA;   /* Petal — dividers, borders */
--emerald-ai-bubble:  #FFF3EC;   /* Warm peach — AI message bubbles */
--emerald-user-bubble:#E8654A;   /* Coral — user message bubbles */
--emerald-glow:       rgba(212, 167, 98, 0.15); /* Gold glow — focus states */
```

### Typography
- Primary: `'Georgia', serif` — elegant, warm
- UI: `'Google Sans', 'Helvetica Neue', sans-serif` — clean, readable
- Code/data: `'Courier New', monospace`

### UI Principles
- Mobile-first: designed for phone, works on desktop
- Touch targets ≥ 44px
- No clutter — one action at a time
- Smooth transitions (200–300ms ease)
- Positive, affirming microcopy
- No error dialogs — inline toast messages only

---

## AI Persona — Emerald

Emerald is a warm, wise, efficient assistant for Haven, The Awakening Doula. She speaks in a calm, professional, gently empowering tone. She is never robotic, never verbose. She confirms actions clearly and asks only what she needs.

**Emerald's voice:**
- Clear and direct — no fluff
- Warm and affirming — never clinical
- Proactive — anticipates next steps
- Trustworthy — always confirms before sending emails or making irreversible changes

**What Emerald says:**
- "Done — Session Notes created for [Client]."
- "Week 3 workbook sent to [Client] at [email]."
- "I've drafted the past client offer — want me to send it to all 12 contacts?"
- "I don't see a session date set yet. Add it to B10 and I'll schedule the calendar event."

---

## Setup Instructions (Developer)

### 1. Copy new files into Google Apps Script
In the Apps Script editor (script.google.com), create three new files:
- `EmeraldAPI` (type: Script)
- `EmeraldAI` (type: Script)
- `EmeraldUI` (type: HTML)

Paste the respective code from this repo into each file.

### 2. Set the Anthropic API key
In Apps Script → Project Settings → Script Properties:
```
ANTHROPIC_API_KEY = sk-ant-...your key...
```

### 3. Deploy as Web App
Apps Script → Deploy → New Deployment:
- Type: Web app
- Execute as: Me (Carlie's Google account)
- Who has access: Only myself

Copy the Web App URL — this is Emerald's home URL.

### 4. Bookmark on phone
Add the Web App URL to your phone's home screen for app-like experience.

---

## Deployment Status

```
Status:     LIVE — First deploy 2026-02-26
Web App:    https://script.google.com/macros/s/AKfycbwdMweOLJfAKzVBCP68x0_rp8GXN0FuKk2MJw70Mzn8QEUz_Ggb-jo-GgrhPP5LfuA4/exec
Model:      claude-sonnet-4-6
API Key:    Set in Script Properties
Testing:    End-to-end testing in progress
```

### What's Working
- Web App loads and renders the full UI (sidebar, chat, action panels)
- Client list loads from spreadsheet
- Chat sends messages to Claude and receives responses
- All 31 AI tools defined and routed
- All action buttons wired in the UI
- Session memory (24h rolling) and long-term memory (persistent)
- Safe write/clear with cell validation

### What Still Needs Testing
- Each tool end-to-end with real client data (all 3 types)
- Email sending flows (onboarding, newsletter, past client offer)
- Calendar scheduling (add + delete)
- Document generation (all 8 types + 3 packets)
- Soul Emergence workbooks (weeks 1–12)
- Memory persistence across sessions
- iPhone Safari experience

---

## Model Specification

```
Model:    claude-sonnet-4-6
Provider: Anthropic
API:      https://api.anthropic.com/v1/messages
Version:  Current as of February 2026
```

Use `claude-sonnet-4-6` for all AI inference. This is the most capable Claude model available as of February 2026 and is appropriate for the nuanced, multi-tool reasoning required by Emerald's doula practice workflows.

---

## Safety & Privacy

- All data stays within Google's infrastructure (Sheets, Drive, Gmail, Calendar)
- The Anthropic API call sends only the conversation messages and tool schemas — no raw spreadsheet dumps
- Cell data sent to Claude is minimal and purposeful (only what's needed for the current action)
- No client data is logged externally
- The Web App runs as Carlie's Google account — same permissions as the existing system

---

## Non-Interference Guarantee

Emerald's new GAS files add only:
1. A `doGet()` entry point (serves the UI)
2. A `doPost()` entry point (handles chat/actions)
3. New AI-specific helper functions

They do NOT:
- Override `onOpen()`, `onFormSubmit()`, or any trigger function
- Modify existing function signatures
- Change any spreadsheet structure
- Conflict with the existing sidebar (both can coexist)
