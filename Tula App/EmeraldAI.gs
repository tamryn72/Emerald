/****************************************************************************************
 EMERALD AI — Haven, The Awakening Doula
 Claude AI integration, tool definitions, and memory system.

 Model: claude-sonnet-4-6 (Anthropic, February 2026)
 API key: stored in Script Properties → ANTHROPIC_API_KEY
****************************************************************************************/

const CLAUDE_MODEL   = 'claude-sonnet-4-6';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_TOKENS     = 2048;
const MAX_TOOL_ITERATIONS = 10;
const MAX_HISTORY_TURNS   = 20;


/* ═══════════════════════════════════════════════════════════════
   MAIN CHAT HANDLER
   Called by doPost({ action: 'chat', ... })
═══════════════════════════════════════════════════════════════ */

function handleChatRequest(userMessage, activeClientName, conversationHistory) {
  const systemPrompt = buildSystemPrompt(activeClientName);
  const tools = getToolDefinitions();

  // Append new user message
  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  // Run agentic loop
  const result = runAgenticLoop(messages, tools, systemPrompt);

  // Save session memory
  const session = getSessionMemory();
  session.activeClientName = activeClientName;
  if (!session.conversationHistory) session.conversationHistory = [];
  session.conversationHistory.push(
    { role: 'user', content: userMessage },
    { role: 'assistant', content: result.reply }
  );
  session.conversationHistory = pruneConversationHistory(session.conversationHistory);
  if (!session.recentActions) session.recentActions = [];
  result.actions.forEach(a => session.recentActions.unshift(a));
  if (session.recentActions.length > 10) session.recentActions = session.recentActions.slice(0, 10);
  session.lastActiveAt = new Date().toISOString();
  saveSessionMemory(session);

  return result;
}


/* ═══════════════════════════════════════════════════════════════
   AGENTIC LOOP
   Handles multi-step tool use until end_turn.
═══════════════════════════════════════════════════════════════ */

function runAgenticLoop(messages, tools, systemPrompt) {
  let iterations = 0;
  const actions = [];

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = callClaudeAPI(messages, tools, systemPrompt);

    if (!response || !response.content) {
      return { reply: 'Something went wrong. Please try again.', actions: actions };
    }

    // Check if Claude wants to use tools
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

    if (toolUseBlocks.length === 0) {
      // No tools — extract final text reply
      const textBlock = response.content.find(b => b.type === 'text');
      return {
        reply: textBlock ? textBlock.text : '(No response)',
        actions: actions
      };
    }

    // Execute tools and collect results
    const toolResults = [];
    toolUseBlocks.forEach(toolBlock => {
      const toolResult = emeraldExecuteTool(toolBlock.name, toolBlock.input);
      actions.push({
        action: toolBlock.name,
        input: toolBlock.input,
        result: toolResult,
        at: new Date().toISOString()
      });
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(toolResult)
      });
    });

    // Append assistant message + tool results to conversation
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
  }

  return {
    reply: 'I reached the maximum number of steps for this request. Please try a simpler request.',
    actions: actions
  };
}


/* ═══════════════════════════════════════════════════════════════
   CLAUDE API CALL
═══════════════════════════════════════════════════════════════ */

function callClaudeAPI(messages, tools, systemPrompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set in Script Properties.');
  }

  const payload = {
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: messages,
    tools: tools
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(CLAUDE_API_URL, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode !== 200) {
    let errorMsg = 'API error ' + responseCode;
    try {
      const errData = JSON.parse(responseText);
      errorMsg = errData.error ? errData.error.message : errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return JSON.parse(responseText);
}


/* ═══════════════════════════════════════════════════════════════
   SYSTEM PROMPT BUILDER
═══════════════════════════════════════════════════════════════ */

function buildSystemPrompt(activeClientName) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "EEEE, MMMM d, yyyy");

  let clientContext = 'No client currently selected. Carlie can select a client from the sidebar.';
  if (activeClientName) {
    try {
      const info = emeraldGetClientInfo(activeClientName);
      clientContext = _buildClientContextBlock(info);
    } catch (e) {
      clientContext = 'Client "' + activeClientName + '" — could not load data: ' + e.message;
    }
  }

  const session = getSessionMemory();
  const sessionSummary = _buildSessionSummary(session);

  const mem = getLongTermMemory();
  const clientNoteText = (activeClientName && mem.clientNotes && mem.clientNotes[activeClientName])
    ? '\n\nNote about ' + activeClientName + ': ' + mem.clientNotes[activeClientName]
    : '';
  const remindersText = (mem.pinnedReminders && mem.pinnedReminders.length > 0)
    ? '\n\nPinned reminders:\n' + mem.pinnedReminders.map(r => '• ' + r).join('\n')
    : '';

  return `You are Emerald, the AI assistant for Haven, The Awakening Doula.

You support Carlie Wyton, MA — a spiritual counselor and doula — in managing her practice through a calm, intelligent, phone-app experience.

## Your Identity
- Name: Emerald
- Practice: Haven, The Awakening Doula
- Practitioner: Carlie Wyton, MA
- Tone: Warm, wise, clear, and efficient. Never robotic. Never verbose.
- Purpose: Help Carlie manage her client practice through conversation and action.

## What You Can Do
You have tools to read client data, trigger any practice management action, and write to client sheets within safe limits. See tool definitions for the full list.

## What You Must Always Do
- Confirm before sending any email, making calendar changes, recording payments, or any destructive action
- Tell Carlie exactly what you're about to do before doing it (one sentence)
- If an action succeeds, confirm it clearly and warmly
- If an action fails, explain what went wrong and suggest next steps
- Keep responses short — this is a mobile app

## What You Must Never Do
- Never invent client data — always read it from the spreadsheet first
- Never write to protected cells (B2, B3, B6, A12, D3, D7, E4, E11, and rows 100+ column X)
- Never send emails without explicit confirmation in the current conversation
- Never perform destructive actions without Carlie's confirmation
- Never share client data externally

## Active Client Context
${clientContext}${clientNoteText}

## Recent Session Activity
${sessionSummary}${remindersText}

## Today
Today is ${today}.

## Response Style
- Short and clear — mobile screen
- Lead with the result: "Done — [what happened]"
- When you need info, ask one clear question
- Use line breaks for readability
- Warm and affirming, but never excessive`;
}

function _buildClientContextBlock(info) {
  let text = `Active client: ${info.name}
Type: ${info.clientType || info.serviceType}
Status: ${info.status}
Email: ${info.email || 'Not set'}
Sessions: ${info.sessionsUsed} of ${info.sessionsTotal} used
Next Session: ${info.nextSession || 'Not scheduled'}${info.sessionTime ? ' at ' + info.sessionTime : ''}
Payment: ${info.paymentStatus || 'Unknown'}
Intake: ${info.intakeStatus || 'Not sent'}`;

  if (info.currentWeek) {
    const weekNames = {
      1:'The Threshold', 2:'Akashic Records Reading', 3:'Integration & Intention',
      4:'Akashic Clearing', 5:'Befriending Your Nervous System', 6:'Parts Work Integration',
      7:'Timeline Therapy & Reprocessing', 8:'Clearing Old Programming', 9:'Honoring What Was',
      10:'Releasing Expectations & Ritual Goodbye', 11:'Final Akashic Clearing', 12:'Emergence & Integration'
    };
    text += `\nCurrent Week: ${info.currentWeek} — ${weekNames[info.currentWeek] || ''}`;
    text += `\nJournal: ${info.journalId ? 'Created' : 'Not yet created'}`;
  }

  return text;
}

function _buildSessionSummary(session) {
  if (!session || !session.recentActions || session.recentActions.length === 0) {
    return 'New session — no recent activity.';
  }
  const lines = session.recentActions.slice(0, 5).map(a => {
    const time = a.at ? Utilities.formatDate(new Date(a.at), Session.getScriptTimeZone(), 'h:mm a') : '';
    return `• ${a.action.replace(/_/g, ' ')} for ${a.input && a.input.clientName ? a.input.clientName : 'unknown'}${time ? ' at ' + time : ''}`;
  });
  return 'In this session:\n' + lines.join('\n');
}


/* ═══════════════════════════════════════════════════════════════
   MEMORY SYSTEM
═══════════════════════════════════════════════════════════════ */

const SESSION_KEY    = 'EMERALD_SESSION';
const MEMORY_KEY     = 'EMERALD_MEMORY';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSessionMemory() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(SESSION_KEY);
  if (!raw) return _newSession();

  try {
    const session = JSON.parse(raw);
    // Expire after 24 hours of inactivity
    if (session.lastActiveAt) {
      const elapsed = Date.now() - new Date(session.lastActiveAt).getTime();
      if (elapsed > SESSION_TTL_MS) return _newSession();
    }
    return session;
  } catch (_) {
    return _newSession();
  }
}

function saveSessionMemory(session) {
  PropertiesService.getScriptProperties().setProperty(
    SESSION_KEY,
    JSON.stringify(session)
  );
}

function getLongTermMemory() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(MEMORY_KEY);
  if (!raw) return { clientNotes: {}, preferences: {}, pinnedReminders: [] };
  try {
    return JSON.parse(raw);
  } catch (_) {
    return { clientNotes: {}, preferences: {}, pinnedReminders: [] };
  }
}

function saveLongTermMemory(mem) {
  PropertiesService.getScriptProperties().setProperty(
    MEMORY_KEY,
    JSON.stringify(mem)
  );
}

function clearEmeraldMemory() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(SESSION_KEY);
  props.deleteProperty(MEMORY_KEY);
  return { cleared: true };
}

function pruneConversationHistory(history) {
  if (!history || history.length <= MAX_HISTORY_TURNS) return history;
  return history.slice(history.length - MAX_HISTORY_TURNS);
}

function _newSession() {
  return {
    sessionId: 'sess_' + Date.now(),
    startedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    activeClientName: null,
    conversationHistory: [],
    recentActions: []
  };
}


/* ═══════════════════════════════════════════════════════════════
   TOOL DEFINITIONS
   Full schema for claude-sonnet-4-6 tool_use
═══════════════════════════════════════════════════════════════ */

function getToolDefinitions() {
  return [

    /* ── Client Info ── */
    {
      name: 'get_client_list',
      description: 'Returns a list of all active and past clients in the practice.',
      input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'get_client_info',
      description: 'Returns all available information for a specific client from the spreadsheet.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Exact client name as it appears in the spreadsheet.' }
        },
        required: ['clientName']
      }
    },
    {
      name: 'read_cell',
      description: 'Read the value of a specific cell in a client sheet.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          cell: { type: 'string', description: 'Cell reference e.g. B10, D7' }
        },
        required: ['clientName', 'cell']
      }
    },

    /* ── Client Management ── */
    {
      name: 'create_new_client',
      description: 'Create a new client with a name and service type. This sets up their sheet, folder, and all default data.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full client name.' },
          clientType: {
            type: 'string',
            enum: ['Akashic', 'Counseling', 'Soul Emergence'],
            description: 'The type of service the client is receiving.'
          }
        },
        required: ['name', 'clientType']
      }
    },
    {
      name: 'mark_client_complete',
      description: 'Mark a client as complete and add them to the Past Clients list. REQUIRES confirmation.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          confirmed: { type: 'boolean', description: 'Must be true — practitioner confirmed.' }
        },
        required: ['clientName', 'confirmed']
      }
    },

    /* ── Document Generation ── */
    {
      name: 'generate_document',
      description: 'Generate a clinical or session document for the active client.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          docType: {
            type: 'string',
            enum: [
              'Session Notes', 'Integration Guide', 'Breathwork Notes', 'Akashic Notes',
              'Counseling Notes', 'Client Homework', 'Client Summary', 'Soul Emergence Summary'
            ]
          }
        },
        required: ['clientName', 'docType']
      }
    },
    {
      name: 'generate_client_packet',
      description: 'Generate a client literature packet.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          packetType: { type: 'string', enum: ['Intro Packet', 'Packet 2', 'Packet 3'] }
        },
        required: ['clientName', 'packetType']
      }
    },

    /* ── Soul Emergence ── */
    {
      name: 'send_workbook',
      description: 'Send a weekly Soul Emergence workbook to the client via email and Google Drive. Only for Soul Emergence clients.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          weekNumber: { type: 'integer', minimum: 1, maximum: 12 }
        },
        required: ['clientName', 'weekNumber']
      }
    },
    {
      name: 'create_journal',
      description: 'Create a private shared journal for a Soul Emergence client.',
      input_schema: {
        type: 'object',
        properties: { clientName: { type: 'string' } },
        required: ['clientName']
      }
    },
    {
      name: 'get_journal_url',
      description: 'Get the URL to a Soul Emergence client\'s private journal.',
      input_schema: {
        type: 'object',
        properties: { clientName: { type: 'string' } },
        required: ['clientName']
      }
    },

    /* ── Onboarding ── */
    {
      name: 'send_onboarding_email',
      description: 'Send the intake form link to a client via email. REQUIRES confirmation.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          confirmed: { type: 'boolean' }
        },
        required: ['clientName', 'confirmed']
      }
    },
    {
      name: 'check_intake_status',
      description: 'Check whether a client has submitted their intake form.',
      input_schema: {
        type: 'object',
        properties: { clientName: { type: 'string' } },
        required: ['clientName']
      }
    },
    {
      name: 'create_intake_doc',
      description: 'Create the clinical intake document from a client\'s submitted form responses.',
      input_schema: {
        type: 'object',
        properties: { clientName: { type: 'string' } },
        required: ['clientName']
      }
    },

    /* ── Scheduling ── */
    {
      name: 'add_session',
      description: 'Add the next session to Google Calendar. Requires B10 (date) and D10 (time) to be set first. REQUIRES confirmation.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          confirmed: { type: 'boolean' }
        },
        required: ['clientName', 'confirmed']
      }
    },
    {
      name: 'get_upcoming_sessions',
      description: 'Get a list of upcoming calendar sessions for a client, including their event IDs. Use this before delete_session_by_event_id to let Carlie choose which session to delete.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' }
        },
        required: ['clientName']
      }
    },
    {
      name: 'delete_session_by_event_id',
      description: 'Delete a specific calendar session by its event ID. Use get_upcoming_sessions first to get the event ID. REQUIRES confirmation.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          eventId: { type: 'string', description: 'The calendar event ID from get_upcoming_sessions.' },
          confirmed: { type: 'boolean' }
        },
        required: ['clientName', 'eventId', 'confirmed']
      }
    },

    /* ── Financial ── */
    {
      name: 'record_payment',
      description: 'Record a payment for a client in the Budget sheet. REQUIRES confirmation.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          amount: { type: 'number', description: 'Payment amount. If omitted, uses session price from B11.' },
          confirmed: { type: 'boolean' }
        },
        required: ['clientName', 'confirmed']
      }
    },
    {
      name: 'send_receipt',
      description: 'Send a payment receipt email to a client. REQUIRES confirmation.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          confirmed: { type: 'boolean' }
        },
        required: ['clientName', 'confirmed']
      }
    },
    {
      name: 'get_budget_url',
      description: 'Get the URL to the Budget sheet.',
      input_schema: { type: 'object', properties: {}, required: [] }
    },

    /* ── Email & Marketing ── */
    {
      name: 'get_email_templates',
      description: 'List all active email templates available for sending.',
      input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'send_email_template',
      description: 'Create a Gmail draft for a client using a named email template. REQUIRES confirmation.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          templateName: { type: 'string', description: 'Template name exactly as it appears in Email_Templates sheet.' },
          confirmed: { type: 'boolean' }
        },
        required: ['clientName', 'templateName', 'confirmed']
      }
    },
    {
      name: 'preview_newsletter',
      description: 'Preview the current newsletter content before sending. Returns the newsletter subject and body HTML.',
      input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'send_newsletter',
      description: 'Send the active Newsletter email template to all leads. REQUIRES explicit confirmation.',
      input_schema: {
        type: 'object',
        properties: {
          confirmed: { type: 'boolean', description: 'Must be true.' }
        },
        required: ['confirmed']
      }
    },
    {
      name: 'send_past_client_offer',
      description: 'Send the Past Client Offer email to past clients. REQUIRES confirmation.',
      input_schema: {
        type: 'object',
        properties: {
          sendToAll: { type: 'boolean', description: 'True to send to all past clients.' },
          email: { type: 'string', description: 'Required if sendToAll is false.' },
          name: { type: 'string', description: 'Required if sendToAll is false.' },
          confirmed: { type: 'boolean' }
        },
        required: ['sendToAll', 'confirmed']
      }
    },

    /* ── Utilities ── */
    {
      name: 'get_client_folder_url',
      description: 'Get the Google Drive folder URL for a client.',
      input_schema: {
        type: 'object',
        properties: { clientName: { type: 'string' } },
        required: ['clientName']
      }
    },
    {
      name: 'refresh_dashboard',
      description: 'Refresh the spreadsheet Dashboard with current client data.',
      input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'refresh_leads',
      description: 'Refresh the Leads list from all active client sheets.',
      input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'add_lead',
      description: 'Manually add a lead to the Leads sheet. Columns: A=Name, B=Date (auto-filled), C=Email, D=Service (optional).',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          service: { type: 'string', description: 'Service they are interested in (optional)' }
        },
        required: ['name']
      }
    },

    /* ── Safe Write / Clear ── */
    {
      name: 'write_cell',
      description: 'Write a value to a specific safe cell in a client sheet. Allowed: B4-B11, D10, and type-specific note fields. Protected cells are rejected.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          cell: { type: 'string', description: 'Cell reference e.g. B10' },
          value: { type: 'string', description: 'Value to write' }
        },
        required: ['clientName', 'cell', 'value']
      }
    },
    {
      name: 'clear_cell',
      description: 'Clear the value of a specific safe cell in a client sheet. REQUIRES confirmation.',
      input_schema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          cell: { type: 'string' },
          confirmed: { type: 'boolean' }
        },
        required: ['clientName', 'cell', 'confirmed']
      }
    },

    /* ── Memory ── */
    {
      name: 'remember_note',
      description: 'Save a note about a client or a reminder to long-term memory.',
      input_schema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['client_note', 'reminder'] },
          clientName: { type: 'string', description: 'Required if type is client_note.' },
          note: { type: 'string' }
        },
        required: ['type', 'note']
      }
    }

  ];
}
