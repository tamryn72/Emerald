# Emerald — Monday/Tuesday Build Plan

> Last updated: 2026-02-28
> Questions sent to Carlie — answers expected before Monday.
> Both website form buttons confirmed (Opt-In + Get In Touch).

---

## What's Ready Now (No Blockers)

| Item | Status |
|------|--------|
| Website forms (Opt-In + Get In Touch) | Built — Carlie runs Setup menu |
| UI polish (restore last client, pinned reminders, skeleton, title) | Ready to build |
| All 31 tools wired and deployed | Live |
| Voice input (mic) | Live |
| Newsletter offer tracking (Column X) | Live |
| Counseling field names | Live |
| Soul Emergence Summary template | Live |

## What's Blocked Until Carlie Answers

| Item | Blocking Question | Doc |
|------|-------------------|-----|
| Workbook templates (weeks 2-12) | Q6 — 11 Google Doc IDs | QUESTIONS_FOR_CARLIE.md |
| Client literature (Intro, Packet 2, Packet 3) | Q7 — 3 Google Doc IDs | QUESTIONS_FOR_CARLIE.md |
| Client Homework template | Q8 — 1 Google Doc ID | QUESTIONS_FOR_CARLIE.md |
| Akashic field name changes | Q10 — 18 field names | QUESTIONS_FOR_CARLIE.md |
| Newsletter Offer email template | Q11 — exists in sheet? | QUESTIONS_FOR_CARLIE.md |
| Acuity Scheduling integration | Q1-5 — API creds + config | ACUITY_QUESTIONS.md |

---

## Monday Build (March 3)

### Block 1: Template Wiring
> Depends on Carlie's answers to Q6-Q8

**Files to modify:**
- `SPREADSHEET APPS SCRIPT.gs` — constants at top of file

**Changes:**
1. Replace `WORKBOOK_TEMPLATES` placeholder IDs (lines 22-35) with real Doc IDs for weeks 2-12
2. Replace `CLIENT_LIT_TEMPLATES` placeholder IDs (lines 69-73) for Intro Packet, Packet 2, Packet 3
3. Replace `TEMPLATE_CLIENT_HOMEWORK` placeholder (line 19) with real Doc ID

**Verify:**
- No `YOUR_` prefix remains in any template constant
- Each ID is a valid 44-character Google Doc ID

---

### Block 2: Akashic Field Name Changes
> Depends on Carlie's answer to Q10

**Files to modify (4):**
1. `SPREADSHEET APPS SCRIPT.gs` — Akashic template section (row labels in `newClientSetup`)
2. `EmeraldAPI.gs` — `emeraldGetClientInfo()` Akashic branch (~line 230) field label strings
3. `CLAUDE.md` — Akashic Client Fields table
4. `CONTEXT.md` — tool descriptions if field names referenced

**Changes per file:**
- Swap old field labels (B13 Themes, B14 Soul Messages, etc.) for new names
- Safe write cell list stays the same — cell addresses don't change, only labels

**Verify:**
- `get_client_info` returns new field names in response
- `write_cell` still accepts the same cell addresses
- CLAUDE.md table matches code

---

### Block 3: Newsletter Offer Template
> Depends on Carlie's answer to Q11

**No code changes.** This is a spreadsheet data row:
- If Carlie says it exists → test `get_email_templates` returns it
- If she says no → help her create the row: Name = "Newsletter Offer", Subject = TBD, Body = TBD, Active = "Yes"

**Verify:**
- `get_email_templates` includes "Newsletter Offer"
- `send_email_template` with templateName "Newsletter Offer" creates a draft

---

### Block 4: Website Forms Setup
> No blockers — both forms already built

**No code changes.** This is Carlie running Setup from the spreadsheet:

1. Carlie opens spreadsheet → Setup > Create Opt-In Form → copies URL
2. Carlie opens spreadsheet → Setup > Create Website Inquiry Form → copies URL
3. Carlie runs Setup > Install Form Triggers (once, covers both)
4. Carlie updates website links: main CTA → Opt-In URL, contact → Get In Touch URL

**Our job:** Verify both `setupOptInForm()` and `setupWebsiteInquiryForm()` work correctly. Both exist in `SPREADSHEET APPS SCRIPT.gs` and are wired into the Setup menu (lines 97-98).

---

### Block 5: UI Polish
> No blockers — all in EmeraldUI.html

**File:** `EmeraldUI.html`

#### 5a. Restore Last Client on App Load
In `DOMContentLoaded` handler (line 828):
```js
// After loadClients() resolves:
const mem = await apiCall({ action: 'getMemory' });
if (mem && mem.lastClient) {
  const match = state.clients.find(c => c.name === mem.lastClient);
  if (match) {
    selectClient(match.name);
    appendAIMessage(`Welcome back — I've restored ${match.name}.`);
  }
}
```

#### 5b. Display Pinned Reminders on Load
After memory restore:
```js
if (mem && mem.pinnedReminders && mem.pinnedReminders.length > 0) {
  const bullets = mem.pinnedReminders.map(r => '• ' + r).join('\n');
  appendAIMessage('**Reminders:**\n' + bullets);
}
```

#### 5c. Loading Skeleton for Client List
In initial render, before data loads:
```js
// Show shimmer placeholders
clientList.innerHTML = Array(5).fill(
  '<div class="client-card skeleton"><div class="skel-name"></div><div class="skel-badge"></div></div>'
).join('');
```
Add CSS for `.skeleton` pulse animation.

#### 5d. Page Title with Active Client
In `selectClient()`:
```js
document.title = clientName + ' | Emerald';
```
On deselect / return to home:
```js
document.title = 'Emerald | Haven, The Awakening Doula';
```

---

### Monday Fallback Plan

If Carlie's answers haven't arrived by Monday morning:
- **Skip Blocks 1-3** (template IDs, field names, newsletter template)
- **Do Blocks 4-5** (website forms verification + UI polish)
- Template IDs are single-line constant changes — can be wired in 5 minutes whenever they arrive

---

## Tuesday Build (March 4)

### Block 6: Acuity Scheduling Integration
> Depends on Carlie's answers to Q1-Q5 (API creds, types, timezone)

**New code in `EmeraldAPI.gs`:**

```
Credentials stored in Script Properties:
  ACUITY_USER_ID = (from Carlie)
  ACUITY_API_KEY = (from Carlie)
```

| Function | HTTP | Acuity Endpoint | Purpose |
|----------|------|-----------------|---------|
| `acuityFetch_(endpoint, method, body)` | — | — | Internal helper: Basic Auth, JSON parse |
| `emerald_getSchedule(dateFrom, dateTo)` | GET | /appointments?minDate=X&maxDate=Y | Read schedule for date range |
| `emerald_checkAvailability(date, typeId)` | GET | /availability/times?date=X&appointmentTypeID=Y | Check open slots |
| `emerald_rescheduleAppointment(id, datetime)` | PUT | /appointments/:id/reschedule | Move appointment |
| `emerald_blockTime(datetime, duration, notes)` | POST | /appointments (calendar=true) | Block time off |
| `emerald_cancelAppointment(id)` | PUT | /appointments/:id/cancel | Cancel appointment |

**New tools in `EmeraldAI.gs` `getToolDefinitions()`:**

| Tool Name | Description |
|-----------|-------------|
| `get_schedule` | Get appointments for a date range |
| `check_availability` | Check open slots for a date and appointment type |
| `reschedule_appointment` | Move an existing appointment (confirmation required) |
| `block_time` | Block off time on the calendar |
| `cancel_appointment` | Cancel an appointment (confirmation required) |

**New routing in `EmeraldAPI.gs` `emeraldExecuteTool()`:**
- 5 new cases in the switch statement

**UI additions in `EmeraldUI.html`:**
- "Schedule" chip in quick actions (home state)
- "My Schedule" button sends: "Show me my schedule for this week"

**Confirmation protocol update in `CONTEXT.md`:**
- Reschedule → Always confirm
- Cancel → Always confirm
- Block time → No confirmation needed
- Read schedule / check availability → No confirmation needed

---

### Block 7: End-to-End Testing Checklist

**Client Types:**
- [ ] Akashic client — full workflow
- [ ] Counseling client — full workflow
- [ ] Soul Emergence client — full workflow

**Documents:**
- [ ] Session Notes generation
- [ ] Integration Guide generation
- [ ] Breathwork Notes generation
- [ ] Akashic Notes generation
- [ ] Counseling Notes generation
- [ ] Client Summary generation
- [ ] Client Homework generation (if template ID wired)
- [ ] Soul Emergence Summary generation
- [ ] Intro Packet (if template ID wired)
- [ ] Packet 2 (if template ID wired)
- [ ] Packet 3 (if template ID wired)

**Soul Emergence:**
- [ ] Week 1 workbook send
- [ ] Week 2-12 workbook send (if template IDs wired)
- [ ] Create private journal
- [ ] Get journal URL

**Onboarding:**
- [ ] Send onboarding email
- [ ] Check intake status
- [ ] Create intake doc

**Scheduling:**
- [ ] Add session to Google Calendar
- [ ] Delete session from Google Calendar
- [ ] Get schedule from Acuity (if integrated)
- [ ] Check availability (if integrated)

**Financial:**
- [ ] Record payment
- [ ] Send receipt
- [ ] Get budget URL

**Emails:**
- [ ] Get email templates list
- [ ] Send email template (as draft)
- [ ] Preview newsletter
- [ ] Send newsletter to all leads
- [ ] Send newsletter offer to leads
- [ ] Send past client offer (all)
- [ ] Send past client offer (one)

**Write/Clear:**
- [ ] Write to safe cell (should succeed)
- [ ] Write to forbidden cell (should reject)
- [ ] Clear safe cell (should succeed)
- [ ] Clear forbidden cell (should reject)

**Memory:**
- [ ] Save client note via chat
- [ ] Save reminder via chat
- [ ] Close and reopen app — session restores
- [ ] Last client restored on load (after Block 5a)
- [ ] Pinned reminders display on load (after Block 5b)

**Platform:**
- [ ] iPhone Safari (primary target)
- [ ] Desktop Chrome
- [ ] Voice input on mobile
- [ ] Newsletter preview on mobile

---

### Block 8: Final Deploy

1. Copy updated files to Apps Script editor:
   - `EmeraldAPI.gs`
   - `EmeraldAI.gs`
   - `EmeraldUI.html`
   - `SPREADSHEET APPS SCRIPT.gs` (if template IDs or field names changed)
2. Set Acuity credentials in Script Properties (if received)
3. Redeploy web app: Deploy > Manage Deployments > edit existing deployment
4. Verify on iPhone Safari from home screen
5. Verify on desktop Chrome

---

### Tuesday Fallback Plan

If Acuity creds haven't arrived by Tuesday:
- **Skip Block 6** entirely — Acuity integration can be added independently later
- **Full focus on Block 7** (testing everything else that IS ready)
- **Deploy Block 8** with whatever is complete

---

## Previously Completed (2026-02-27)

- [x] Newsletter Offer button moved to Offers section
- [x] Newsletter preview mobile fix (fetch fallback, CSS)
- [x] Voice input (microphone) with Web Speech API
- [x] Column X newsletter offer tracking
- [x] Counseling field name changes (B14-B22, B23 removed)
- [x] Soul Emergence Summary template wired
- [x] Auto-send newsletter to new opt-ins

## Previously Completed (2026-02-26)

- [x] 10 critical bug fixes (see TIMELINE.md)
- [x] Full Emerald system live: API + AI + UI
- [x] 31 tools wired end-to-end
- [x] Memory system (session + long-term)
- [x] Week 1 workbook real template ID restored
