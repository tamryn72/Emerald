# MEMORY.md — Emerald Memory Architecture

> How Emerald remembers things within and across sessions.

---

## Overview

Emerald uses a **three-layer memory model** that keeps things lightweight (no external database) while giving the practitioner a coherent, contextual experience every time she opens the app.

```
┌─────────────────────────────────────────────┐
│  LAYER 3: Long-Term Memory                  │
│  (GAS Script Properties — persistent)       │
│   • Last selected client                    │
│   • Pinned notes per client                 │
│   • Practitioner preferences                │
└─────────────┬───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│  LAYER 2: Session Memory                    │
│  (GAS Script Properties — rolling 24h)      │
│   • Recent conversation (last 20 turns)     │
│   • Active client context snapshot          │
│   • Last 5 actions taken                    │
└─────────────┬───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│  LAYER 1: Request Context                   │
│  (In-memory per API call — ephemeral)       │
│   • Current message being processed         │
│   • Tool call chain for this turn           │
│   • Inline client data from sheet           │
└─────────────────────────────────────────────┘
```

---

## Layer 1: Request Context (Ephemeral)

Built fresh for every Claude API call. Never stored. Contains:

```json
{
  "activeClient": {
    "name": "Jane Doe",
    "type": "Soul Emergence",
    "email": "jane@email.com",
    "sessionsUsed": 5,
    "sessionsTotal": 12,
    "nextSession": "2026-03-15",
    "status": "Active"
  },
  "currentMessage": "Send Jane her Week 6 workbook",
  "toolCallChain": []
}
```

This snapshot is injected into the Claude system prompt at call time so Claude always knows who is the active client without needing to be told repeatedly.

---

## Layer 2: Session Memory (Rolling 24-Hour Window)

Stored in `ScriptProperties` under key `EMERALD_SESSION`.

**Schema:**
```json
{
  "sessionId": "sess_1708123456",
  "startedAt": "2026-02-24T10:00:00Z",
  "lastActiveAt": "2026-02-24T14:32:00Z",
  "activeClientName": "Jane Doe",
  "conversationHistory": [
    { "role": "user", "content": "How is Jane doing?" },
    { "role": "assistant", "content": "Jane is on Week 5 of Soul Emergence..." },
    ...
  ],
  "recentActions": [
    { "action": "send_workbook_week", "week": 5, "client": "Jane Doe", "at": "2026-02-24T11:00:00Z" },
    { "action": "generate_session_notes", "client": "Jane Doe", "at": "2026-02-24T11:30:00Z" }
  ]
}
```

**Rules:**
- Max 20 turns stored in `conversationHistory` (oldest dropped when limit hit)
- Session expires after 24 hours of inactivity — new session starts fresh
- `recentActions` capped at 10 entries
- Updated after every successful Claude response

---

## Layer 3: Long-Term Memory (Persistent)

Stored in `ScriptProperties` under key `EMERALD_MEMORY`.

**Schema:**
```json
{
  "lastClient": "Jane Doe",
  "clientNotes": {
    "Jane Doe": "Prefers morning sessions. Allergic to peanuts (not medically relevant but noted).",
    "Mary Smith": "Very responsive to integration exercises."
  },
  "preferences": {
    "confirmBeforeSendingEmails": true,
    "confirmBeforeCalendarActions": true,
    "defaultGreeting": "Welcome back"
  },
  "pinnedReminders": [
    "Invoice Jane before Week 8",
    "Check in on Mary's homework completion"
  ]
}
```

**Rules:**
- `lastClient` updated whenever a client is selected — restores on next open
- `clientNotes` can be written by saying "Remember that Jane prefers mornings"
- `pinnedReminders` can be added via chat: "Remind me to invoice Jane before Week 8"
- Max 50 client notes (oldest trimmed)
- Max 20 pinned reminders

---

## How Memory Is Used in Practice

### App Open
1. Load `EMERALD_MEMORY` → restore `lastClient` → pre-select that client in sidebar
2. Load `EMERALD_SESSION` → if session < 24h old, restore conversation history
3. Greet user: "Welcome back, Carlie. You were last working with [Client]."

### Client Switch
1. Update `lastClient` in `EMERALD_MEMORY`
2. Load fresh client data snapshot from spreadsheet
3. Inject snapshot into next Claude call context

### After Each Claude Response
1. Append user message + assistant response to `conversationHistory`
2. If a tool was called, append to `recentActions`
3. Save updated session to `ScriptProperties`

### "Remember" Commands
Emerald listens for memory phrases:
- "Remember that Jane likes mornings" → writes to `clientNotes["Jane"]`
- "Remind me to follow up with Mary next week" → appends to `pinnedReminders`
- "Forget the note about Jane" → clears that client note

### Memory Retrieval
When Emerald needs context about a client beyond the spreadsheet data, she checks:
1. `clientNotes` for that client
2. `recentActions` for recent history
3. `conversationHistory` for ongoing thread context

---

## Privacy

- Memory is stored in GAS `ScriptProperties` — accessible only to the script owner (Carlie's Google account)
- No memory is sent to Anthropic except what's included in the conversation messages array
- Client names and notes are not hashed or encrypted at rest (Google infrastructure provides security)
- Memory can be fully cleared by calling `clearEmeraldMemory()` from the GAS console

---

## Memory Management Functions (in EmeraldAI.gs)

```
getSessionMemory()          → Returns current session object
saveSessionMemory(session)  → Persists session to ScriptProperties
getLongTermMemory()         → Returns persistent memory object
saveLongTermMemory(mem)     → Persists long-term memory
clearEmeraldMemory()        → Nuclear option — wipes all memory
buildContextSnapshot(clientName) → Assembles Layer 1 context from sheet
pruneConversationHistory(history) → Keeps last 20 turns
```

---

## Conversation History Format

Messages sent to Claude follow the Anthropic Messages API format:

```json
[
  {
    "role": "user",
    "content": "Send Jane her Week 6 workbook"
  },
  {
    "role": "assistant",
    "content": [
      {
        "type": "tool_use",
        "id": "tool_abc123",
        "name": "send_workbook_week",
        "input": { "weekNumber": 6 }
      }
    ]
  },
  {
    "role": "user",
    "content": [
      {
        "type": "tool_result",
        "tool_use_id": "tool_abc123",
        "content": "Success: Week 6 workbook sent to jane@email.com"
      }
    ]
  },
  {
    "role": "assistant",
    "content": "Done — Jane's Week 6: Parts Work Integration workbook has been sent to jane@email.com and shared in her Drive folder."
  }
]
```

Tool results are always stored as part of the message history so Claude has full context on what was done.
