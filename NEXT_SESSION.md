# Emerald — Build Plan

> Last updated: 2026-02-27

---

## DONE — Phases 1 & 2 (built 2026-02-27)

### 1. Move Newsletter Offer Button ✓
- Moved to Offers section (home-past-clients)
- Removed from Emails & Marketing and Newsletter sections
- Home chip + home button renamed "Offers"

### 1b. Fix Newsletter Preview on Mobile ✓
- Added fetch fallback for mobile Safari
- CSS fixes: vh fallback, -webkit-overflow-scrolling, word-wrap

### 1c. Add Microphone (Voice Input) ✓
- Mic icon next to send button
- Web Speech API — hidden if browser doesn't support it
- Pulses coral when listening, fills text input

### 2. Column X — Offer Sent Tracking ✓
- Date stamp in Column X when newsletter offer sent
- Smart send: skips leads who already got it
- check_newsletter_offer_status tool (one lead or summary)
- reset_newsletter_offer tool (clear all for re-send)

### 13. Counseling Row Name Changes ✓
- 9 fields B14–B22 (B23 removed)
- Updated: CLAUDE.md, EmeraldAPI.gs, SPREADSHEET APPS SCRIPT.gs
- **REMINDER:** Update the Counseling template sheet in the spreadsheet to match

### Soul Emergence Summary Template ✓
- Template ID wired: `1dRpRvXb14reodgFRn1E688lhWZ5wrUwbACaeBqLOs1k`

---

## NEXT STEP: Deploy

1. **Copy updated files into Apps Script editor:**
   - `EmeraldAPI.gs`
   - `EmeraldAI.gs`
   - `EmeraldUI.html`
   - `SPREADSHEET APPS SCRIPT.gs`
2. **Redeploy the web app** (Deploy > Manage Deployments > edit existing)
3. **Update the Counseling template sheet** — new row names B14–B22, remove B23
4. **Test on mobile** — mic, newsletter preview, Offers section

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
- Client Homework — waiting on template ID
- Soul Emergence Summary — **DONE** ✓

---

## Phase 5: Remaining Field Name Updates

### 14. Akashic Row Name Changes (Waiting on Carlie)
- Need clarification on scope (top section only vs whole sheet)
- Then: CLAUDE.md, tool schemas, doc templates, safe write list

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
| Other template IDs | Homework | QUESTIONS_FOR_CARLIE.md |
| Akashic row names | Clarify scope + new names | QUESTIONS_FOR_CARLIE.md |
| Newsletter Offer template | Email content in Email_Templates | QUESTIONS_FOR_CARLIE.md |

---

## Testing Still Needed
- Each tool end-to-end with real client data (all 3 types)
- Email sending flows (onboarding, newsletter, past client offer, newsletter offer)
- Calendar scheduling (add + delete)
- Document generation (all 8 types + 3 packets)
- Soul Emergence workbooks (weeks 2–12 need real template IDs)
- Acuity integration (after credentials received)
- Voice input (mic) on iPhone Safari
- Newsletter preview on mobile
- Memory persistence across sessions
