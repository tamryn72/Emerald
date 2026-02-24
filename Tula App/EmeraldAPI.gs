/****************************************************************************************
 EMERALD API — Haven, The Awakening Doula
 Web App entry point, client data bridge, and safe read/write layer.

 DO NOT modify SPREADSHEET APPS SCRIPT.gs — this file is purely additive.

 Deploy as Web App:
   Execute as: Me (Carlie's Google account)
   Who has access: Only myself
****************************************************************************************/

/* ─────────────────────────────────────────────
   SYSTEM SHEET NAMES — never treat as clients
───────────────────────────────────────────── */
const SYSTEM_SHEETS = [
  "Dashboard",
  "Akashic_Client_Template",
  "Counseling_Client_Template",
  "SoulEmergence_Client_Template",
  "Email_Templates",
  "Intake Log",
  "Budget",
  "Document Log",
  "Leads",
  "Past Clients"
];

/* ─────────────────────────────────────────────
   SAFE WRITE WHITELIST
   AI may only write to these cells.
   Protected structural cells are excluded.
───────────────────────────────────────────── */
const SAFE_WRITE_CELLS = {
  common: ['B4', 'B5', 'B7', 'B8', 'B9', 'B10', 'B11', 'D10'],
  Akashic: [
    'B13','B14','B15','B16','B17',
    'B20','B21','B22',
    'B25','B26','B27','B28','B29',
    'B31','B32','B33',
    'B36','B37'
  ],
  Counseling: ['B14','B15','B16','B17','B18','B19','B20','B21','B22','B23'],
  'Soul Emergence': ['B13','B14','B15','B16','B17','B18','B19','B20','B21','B22','B23','B24','B25']
};


/* ═══════════════════════════════════════════════════════════════
   WEB APP ENTRY POINTS
═══════════════════════════════════════════════════════════════ */

function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile('EmeraldUI')
    .setTitle('Emerald | Haven, The Awakening Doula')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    switch (action) {
      case 'chat':
        result = handleChatRequest(
          data.message,
          data.clientName || null,
          data.history || []
        );
        break;

      case 'getClients':
        result = emeraldGetClientList();
        break;

      case 'getClientInfo':
        result = emeraldGetClientInfo(data.clientName);
        break;

      case 'getEmailTemplates':
        result = getEmailTemplateList();
        break;

      case 'getMemory':
        result = getLongTermMemory();
        break;

      case 'saveNote':
        result = saveClientNote(data.clientName, data.note);
        break;

      case 'clearMemory':
        result = clearEmeraldMemory();
        break;

      default:
        result = { error: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


/* ═══════════════════════════════════════════════════════════════
   CLIENT DATA — READ
═══════════════════════════════════════════════════════════════ */

/**
 * Returns all client sheets (non-system) with summary info.
 * Active clients first, then complete.
 */
function emeraldGetClientList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const clients = [];

  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    if (SYSTEM_SHEETS.includes(name)) return;

    const clientName = sh.getRange('B2').getValue();
    if (!clientName) return;

    const status   = sh.getRange('B3').getValue() || 'Unknown';
    const service  = sh.getRange('B6').getValue() || '';
    const type     = sh.getRange('D3').getValue() || '';
    const sessions = sh.getRange('B9').getValue() || 0;
    const total    = sh.getRange('B8').getValue() || 0;
    const nextSess = sh.getRange('B10').getValue() || '';
    const weekNum  = type.toLowerCase().includes('soul') ? (sh.getRange('B9').getValue() || 0) : null;

    clients.push({
      name: clientName,
      status: status,
      serviceType: service,
      clientType: type,
      sessionsUsed: sessions,
      sessionsTotal: total,
      nextSession: nextSess ? Utilities.formatDate(new Date(nextSess), Session.getScriptTimeZone(), 'MMM d, yyyy') : '',
      currentWeek: weekNum,
      sheetId: sh.getSheetId()
    });
  });

  // Sort: Active first
  clients.sort((a, b) => {
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    if (a.status !== 'Active' && b.status === 'Active') return 1;
    return a.name.localeCompare(b.name);
  });

  return clients;
}

/**
 * Returns full client data object for a named client.
 */
function emeraldGetClientInfo(clientName) {
  const sh = _getClientSheet(clientName);
  const type = getClientType(sh);

  const base = {
    name:          sh.getRange('B2').getValue(),
    status:        sh.getRange('B3').getValue(),
    email:         sh.getRange('B4').getValue(),
    phone:         sh.getRange('B5').getValue(),
    serviceType:   sh.getRange('B6').getValue(),
    packageType:   sh.getRange('B7').getValue(),
    sessionsTotal: sh.getRange('B8').getValue(),
    sessionsUsed:  sh.getRange('B9').getValue(),
    nextSession:   sh.getRange('B10').getValue(),
    sessionTime:   sh.getRange('D10').getValue(),
    sessionPrice:  sh.getRange('B11').getValue(),
    clientType:    sh.getRange('D3').getValue(),
    intakeStatus:  sh.getRange('D7').getValue(),
    paymentStatus: sh.getRange('E11').getValue(),
    folderId:      sh.getRange('A12').getValue()
  };

  // Type-specific fields
  if (type === 'Akashic') {
    Object.assign(base, {
      themes:          sh.getRange('B13').getValue(),
      soulMessages:    sh.getRange('B14').getValue(),
      blocks:          sh.getRange('B15').getValue(),
      openings:        sh.getRange('B16').getValue(),
      pastLifeNotes:   sh.getRange('B17').getValue(),
      breathInsights:  sh.getRange('B20').getValue(),
      bodyFeedback:    sh.getRange('B21').getValue(),
      breathEnergy:    sh.getRange('B22').getValue(),
      regulation:      sh.getRange('B25').getValue(),
      triggers:        sh.getRange('B26').getValue(),
      soothing:        sh.getRange('B27').getValue(),
      routine:         sh.getRange('B28').getValue(),
      nervousEnergy:   sh.getRange('B29').getValue(),
      sessionNotes:    sh.getRange('B31').getValue(),
      insightDownloads:sh.getRange('B32').getValue(),
      integrationTasks:sh.getRange('B33').getValue(),
      completionNotes: sh.getRange('B36').getValue(),
      completionDate:  sh.getRange('B37').getValue()
    });
  } else if (type === 'Counseling') {
    Object.assign(base, {
      themes:      sh.getRange('B14').getValue(),
      patterns:    sh.getRange('B15').getValue(),
      blocks:      sh.getRange('B16').getValue(),
      connections: sh.getRange('B17').getValue(),
      concerns:    sh.getRange('B18').getValue(),
      notice:      sh.getRange('B19').getValue(),
      progress:    sh.getRange('B20').getValue(),
      planning:    sh.getRange('B21').getValue(),
      homework:    sh.getRange('B22').getValue(),
      followUp:    sh.getRange('B23').getValue()
    });
  } else if (type === 'Soul Emergence') {
    base.journalId = sh.getRange('E4').getValue();
    base.currentWeek = Math.min(Math.max(Math.ceil(base.sessionsUsed || 1), 1), 12);
    for (let w = 1; w <= 12; w++) {
      base['week' + w + 'Notes'] = sh.getRange(12 + w, 2).getValue();
    }
    base.finalSummary = sh.getRange('B25').getValue();
  }

  return base;
}

/**
 * Read a single cell value from a client sheet.
 */
function emeraldReadCell(clientName, cell) {
  const sh = _getClientSheet(clientName);
  return sh.getRange(cell).getValue();
}


/* ═══════════════════════════════════════════════════════════════
   CLIENT DATA — SAFE WRITE
═══════════════════════════════════════════════════════════════ */

/**
 * Write a value to a whitelisted cell in a client sheet.
 * Throws if cell is not in safe-write whitelist.
 */
function emeraldSafeWrite(clientName, cell, value) {
  const sh = _getClientSheet(clientName);
  const type = getClientType(sh) || '';

  _validateSafeCell(cell, type);

  sh.getRange(cell).setValue(value);
  SpreadsheetApp.flush();
  return { written: true, cell: cell, value: value };
}

/**
 * Clear a whitelisted cell in a client sheet.
 */
function emeraldSafeClear(clientName, cell) {
  const sh = _getClientSheet(clientName);
  const type = getClientType(sh) || '';

  _validateSafeCell(cell, type);

  sh.getRange(cell).clearContent();
  SpreadsheetApp.flush();
  return { cleared: true, cell: cell };
}

/**
 * Set a client sheet as the active sheet.
 * Required before calling existing backend_ functions
 * that rely on SpreadsheetApp.getActiveSheet().
 */
function emeraldActivateClientSheet(clientName) {
  const sh = _getClientSheet(clientName);
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sh);
  return sh;
}


/* ═══════════════════════════════════════════════════════════════
   TOOL EXECUTION BRIDGE
   Routes AI tool calls to the correct existing function.
═══════════════════════════════════════════════════════════════ */

function emeraldExecuteTool(toolName, toolInput) {
  const clientName = toolInput.clientName || null;

  // Activate the correct client sheet for context-dependent functions
  if (clientName) {
    emeraldActivateClientSheet(clientName);
  }

  try {
    switch (toolName) {

      /* ── Client Info ── */
      case 'get_client_list':
        return emeraldGetClientList();

      case 'get_client_info':
        return emeraldGetClientInfo(clientName);

      case 'read_cell':
        return { cell: toolInput.cell, value: emeraldReadCell(clientName, toolInput.cell) };

      /* ── Client Management ── */
      case 'mark_client_complete': {
        const sh = _getClientSheet(clientName);
        const email = sh.getRange('B4').getValue();
        sh.getRange('B3').setValue('Complete');
        addToPastClients(clientName, email);
        return { completed: true, client: clientName };
      }

      /* ── Document Generation ── */
      case 'generate_document':
        backend_generateDoulaDoc(toolInput.docType);
        return { generated: true, docType: toolInput.docType, client: clientName };

      case 'generate_client_packet':
        backend_generateClientPacket(toolInput.packetType);
        return { generated: true, packetType: toolInput.packetType, client: clientName };

      /* ── Soul Emergence ── */
      case 'send_workbook':
        backend_sendWorkbook(toolInput.weekNumber);
        return { sent: true, week: toolInput.weekNumber, client: clientName };

      case 'create_journal':
        backend_createJournal();
        return { created: true, client: clientName };

      case 'get_journal_url': {
        const url = backend_openJournal();
        return { url: url, client: clientName };
      }

      /* ── Onboarding ── */
      case 'send_onboarding_email':
        sendOnboardingEmail();
        return { sent: true, client: clientName };

      case 'check_intake_status': {
        const sh = _getClientSheet(clientName);
        const status = sh.getRange('D7').getValue();
        return { status: status, client: clientName };
      }

      case 'create_intake_doc':
        createIntakeDoc();
        return { created: true, client: clientName };

      /* ── Scheduling ── */
      case 'add_session':
        addNextSession();
        return { added: true, client: clientName };

      case 'delete_session':
        deleteSession();
        return { deleted: true, client: clientName };

      /* ── Financial ── */
      case 'record_payment':
        recordClientPayment();
        return { recorded: true, client: clientName };

      case 'send_receipt':
        sendReceipt();
        return { sent: true, client: clientName };

      case 'get_budget_url': {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let budget = ss.getSheetByName('Budget');
        if (!budget) {
          budget = ss.insertSheet('Budget');
          budget.getRange('A1:G1').setValues([['Date','Client Name','Description','Category','Type','Amount','Notes']]);
        }
        return { url: ss.getUrl() + '#gid=' + budget.getSheetId() };
      }

      /* ── Email & Marketing ── */
      case 'send_email_template':
        backend_sendSalesEmailTemplate(toolInput.templateName);
        return { drafted: true, template: toolInput.templateName, client: clientName };

      case 'get_email_templates':
        return getEmailTemplateList();

      case 'send_newsletter':
        if (!toolInput.confirmed) return { error: 'Confirmation required before sending newsletter.' };
        backend_sendNewsletterToAll();
        return { sent: true };

      case 'send_past_client_offer':
        if (!toolInput.confirmed) return { error: 'Confirmation required before sending offer.' };
        if (toolInput.sendToAll) {
          backend_sendPastClientOfferAll();
          return { sent: true, target: 'all past clients' };
        } else {
          // For sendToAll:false, we need to handle it differently since
          // the existing function uses UI prompts. We call it and let it handle prompts.
          backend_sendPastClientOfferOne();
          return { sent: true };
        }

      /* ── Utilities ── */
      case 'get_client_folder_url': {
        const url = backend_openClientFolder();
        return { url: url, client: clientName };
      }

      case 'refresh_dashboard':
        refreshDoulaDashboard();
        return { refreshed: true };

      case 'refresh_leads':
        refreshLeads();
        return { refreshed: true };

      case 'add_lead':
        addToLeads(toolInput.name, toolInput.email || '');
        return { added: true, name: toolInput.name };

      /* ── Safe Write / Clear ── */
      case 'write_cell':
        return emeraldSafeWrite(clientName, toolInput.cell, toolInput.value);

      case 'clear_cell':
        return emeraldSafeClear(clientName, toolInput.cell);

      /* ── Memory ── */
      case 'remember_note':
        return saveClientNote(toolInput.clientName, toolInput.note, toolInput.type);

      default:
        throw new Error('Unknown tool: ' + toolName);
    }

  } catch (err) {
    return { error: err.message, tool: toolName };
  }
}


/* ═══════════════════════════════════════════════════════════════
   PRIVATE HELPERS
═══════════════════════════════════════════════════════════════ */

function _getClientSheet(clientName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(clientName);
  if (!sh) throw new Error('Client sheet not found: ' + clientName);
  return sh;
}

function _validateSafeCell(cell, clientType) {
  const allowed = [
    ...SAFE_WRITE_CELLS.common,
    ...(SAFE_WRITE_CELLS[clientType] || [])
  ];
  if (!allowed.includes(cell)) {
    throw new Error(
      'Cell ' + cell + ' is not in the safe-write whitelist for ' +
      (clientType || 'this client type') + '. Protected cells cannot be modified by Emerald.'
    );
  }
}

function saveClientNote(clientName, note, type) {
  const mem = getLongTermMemory();
  if (type === 'reminder') {
    if (!mem.pinnedReminders) mem.pinnedReminders = [];
    mem.pinnedReminders.unshift(note);
    if (mem.pinnedReminders.length > 20) mem.pinnedReminders = mem.pinnedReminders.slice(0, 20);
  } else {
    if (!mem.clientNotes) mem.clientNotes = {};
    mem.clientNotes[clientName] = note;
  }
  saveLongTermMemory(mem);
  return { saved: true };
}
