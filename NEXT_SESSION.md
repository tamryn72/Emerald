# Emerald — Build Plan

> Last updated: 2026-02-27

---

## Phase 1: UI Fixes (Ready to Build)

### 1. Move Newsletter Offer Button
- **Remove** from Emails & Marketing section (per-client view)
- **Remove** from Home > Newsletter section
- **Add** to Home > Offer section (alongside "Send Offer to All Past Clients" and "Send Offer to One Email")
- Backend function already done — just moving the button

---

## Phase 2: Newsletter Offer Tracking (Ready to Build)

### 2. Column X — Offer Sent Tracking
- Add date stamp to **Column X** on Leads sheet when newsletter offer is sent
- Send function skips any lead where Column X already has a value
- New leads come in with X blank → automatically included in next send

### 3. AI Can Read Offer Status
- New read tool so Emerald can answer:
  - "Has [name] been sent the newsletter offer?"
  - "Who hasn't gotten the offer yet?"
  - "How many unsent leads do I have?"

### 4. Reset / Send-to-All Option
- Button or chat command to clear Column X if Carlie writes a new offer and wants to re-send to everyone

---

## Phase 3: Acuity Scheduling Integration (Waiting on Carlie)

**Blocked by:** Acuity API key, User ID, appointment type names (see ACUITY_QUESTIONS.md)

### 5. Read Schedule from Acuity
- "What's my schedule today/this week?"
- "When do I see [client] next?"
- "Who's on my schedule tomorrow?"
- "How many sessions do I have this month?"

### 6. Check Availability
- "What openings do I have this week?"
- "Am I free Thursday at 2?"

### 7. Sync Add/Delete to Acuity
- "Add Next Session" → writes to Google Calendar AND books in Acuity
- "Delete Session" → pulls upcoming appointments from Acuity, pick one to cancel, removes from both

### 8. Reschedule via Chat
- "Reschedule [client] to Friday at 3pm"
- Updates both Acuity and Google Calendar

### 9. Block Time
- "Block off Friday afternoon"
- Creates a block in Acuity

---

## Phase 4: Template Wiring (Waiting on Carlie)

**Blocked by:** Google Doc template IDs (see QUESTIONS_FOR_CARLIE.md)

### 10. Workbook Templates (Weeks 2–12)
- Wire in 11 real template IDs for Soul Emergence workbooks

### 11. Client Literature Templates
- Intro Packet, Packet 2, Packet 3

### 12. Other Doc Templates
- Client Homework
- Soul Emergence Summary

---

## Phase 5: Field Name Updates (Waiting on Carlie)

**Blocked by:** New row names (see QUESTIONS_FOR_CARLIE.md)

### 13. Counseling Row Name Changes
- Update cell references in CLAUDE.md
- Update tool schemas in EmeraldAI.gs
- Update any doc generation templates

### 14. Akashic Row Name Changes
- Same: CLAUDE.md, tool schemas, doc templates

---

## Phase 6: Newsletter Offer Template (Waiting on Carlie)

### 15. Email Template Row
- Carlie needs to add a "Newsletter Offer" row in Email_Templates sheet with Active = "Yes"
- Or we draft one for her approval

---

## Waiting On Carlie

| Item | What We Need | Doc |
|------|-------------|-----|
| Acuity API credentials | API Key + User ID | ACUITY_QUESTIONS.md |
| Acuity appointment types | Names as they appear in Acuity | ACUITY_QUESTIONS.md |
| Acuity Google Cal sync | Does it already sync? | ACUITY_QUESTIONS.md |
| Acuity booking rules | Open slots only or override? | ACUITY_QUESTIONS.md |
| Acuity time zone | Her Acuity time zone setting | ACUITY_QUESTIONS.md |
| Workbook template IDs | Weeks 2–12 Doc IDs | QUESTIONS_FOR_CARLIE.md |
| Client lit template IDs | Intro, Packet 2, Packet 3 | QUESTIONS_FOR_CARLIE.md |
| Other template IDs | Homework, SE Summary | QUESTIONS_FOR_CARLIE.md |
| Row name changes | Counseling + Akashic fields | QUESTIONS_FOR_CARLIE.md |
| Newsletter Offer template | Email content in Email_Templates | QUESTIONS_FOR_CARLIE.md |

---

## Testing Still Needed
- Each tool end-to-end with real client data (all 3 types)
- Email sending flows (onboarding, newsletter, past client offer, newsletter offer)
- Calendar scheduling (add + delete)
- Document generation (all 8 types + 3 packets)
- Soul Emergence workbooks (weeks 2–12 need real template IDs)
- Acuity integration (after credentials received)
- Memory persistence across sessions
- iPhone Safari experience
