/****************************************************************************************
 * EmeraldAPI.gs — Emerald Web App Entry Point & Data Bridge
 * Haven, The Awakening Doula
 *
 * Model: claude-opus-4-6 (Anthropic, February 2026)
 *
 * SAFE — additive only. Does NOT touch:
 *   onOpen(), onFormSubmit(), onOptInFormSubmit(), onInquiryFormSubmit()
 *   or any existing function in SPREADSHEET APPS SCRIPT.gs
 *
 * All UI-dependent existing functions (sendOnboardingEmail, recordClientPayment, etc.)
 * are wrapped with emerald_* API-safe versions that return JSON instead of calling
 * SpreadsheetApp.getUi() — which crashes in a doPost() context.
 ****************************************************************************************/

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */

const SYSTEM_SHEETS = [
  "Dashboard", "Akashic_Client_Template", "Counseling_Client_Template",
  "SoulEmergence_Client_Template", "Email_Templates", "Intake Log",
  "Budget", "Document Log", "Leads", "Past Clients"
];

const SAFE_WRITE_CELLS = {
  common:           ['B4','B5','B7','B8','B9','B10','B11','D10'],
  Akashic:          ['B13','B14','B15','B16','B17','B20','B21','B22',
                     'B25','B26','B27','B28','B29','B31','B32','B33','B36','B37'],
  Counseling:       ['B14','B15','B16','B17','B18','B19','B20','B21','B22','B23'],
  'Soul Emergence': ['B13','B14','B15','B16','B17','B18','B19','B20',
                     'B21','B22','B23','B24','B25']
};

// These cells belong to system automations — Emerald never touches them
const FORBIDDEN_CELLS = ['A12','B2','B3','B6','D3','D7','E4','E11'];


/* ═══════════════════════════════════════════════════════════════
   WEB APP ENTRY POINTS
═══════════════════════════════════════════════════════════════ */

/**
 * Serves the Emerald chat UI.
 * Uses createTemplateFromFile so the web app URL can be injected server-side.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('EmeraldUI')
    .setTitle('Emerald | Haven, The Awakening Doula')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handles all API requests from the Emerald UI.
 */
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    switch (action) {
      case 'chat':
        result = handleChatRequest(data.message, data.clientName || null, data.history || []);
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
      case 'getSessions':
        result = emerald_getUpcomingSessions(data.clientName);
        break;
      case 'getNewsletterPreview':
        result = emerald_getNewsletterPreview();
        break;
      case 'executeAction':
        result = emeraldExecuteTool(data.tool, data.params || {});
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


/**
 * Called directly from the UI via google.script.run.
 * Replaces the fetch/doPost pattern — handles auth automatically,
 * no CORS or login-redirect issues.
 */
function handleApiCall(payloadStr) {
  const data   = JSON.parse(payloadStr);
  const action = data.action;

  switch (action) {
    case 'chat':               return handleChatRequest(data.message, data.clientName || null, data.history || []);
    case 'getClients':         return emeraldGetClientList();
    case 'getClientInfo':      return emeraldGetClientInfo(data.clientName);
    case 'getEmailTemplates':  return getEmailTemplateList();
    case 'getMemory':          return getLongTermMemory();
    case 'getSessions':        return emerald_getUpcomingSessions(data.clientName);
    case 'getNewsletterPreview': return emerald_getNewsletterPreview();
    case 'executeAction':      return emeraldExecuteTool(data.tool, data.params || {});
    case 'clearMemory':        return clearEmeraldMemory();
    default: throw new Error('Unknown action: ' + action);
  }
}


/* ═══════════════════════════════════════════════════════════════
   CLIENT DATA — READ
═══════════════════════════════════════════════════════════════ */

function emeraldGetClientList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const clients = [];

  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    if (SYSTEM_SHEETS.includes(name)) return;

    const clientName = sh.getRange('B2').getValue();
    if (!clientName) return;

    const type    = getClientType(sh);
    const sesUsed = sh.getRange('B9').getValue() || 0;

    clients.push({
      name:         String(clientName),
      status:       sh.getRange('B3').getValue() || 'Unknown',
      serviceType:  sh.getRange('B6').getValue() || '',
      clientType:   type || sh.getRange('D3').getValue() || '',
      sessionsUsed: sesUsed,
      sessionsTotal: sh.getRange('B8').getValue() || 0,
      nextSession:  _formatDate(sh.getRange('B10').getValue()),
      currentWeek:  (type === 'Soul Emergence') ? Math.min(Math.max(Math.ceil(sesUsed) || 1, 1), 12) : null,
      sheetId:      sh.getSheetId()
    });
  });

  clients.sort((a, b) => {
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    if (a.status !== 'Active' && b.status === 'Active') return 1;
    return a.name.localeCompare(b.name);
  });

  return clients;
}

function emeraldGetClientInfo(clientName) {
  const sh   = _getClientSheet(clientName);
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
    folderId:      sh.getRange('A12').getValue(),
    type:          type
  };

  if (type === 'Akashic') {
    Object.assign(base, {
      themes:           sh.getRange('B13').getValue(),
      soulMessages:     sh.getRange('B14').getValue(),
      blocks:           sh.getRange('B15').getValue(),
      openings:         sh.getRange('B16').getValue(),
      pastLifeNotes:    sh.getRange('B17').getValue(),
      breathInsights:   sh.getRange('B20').getValue(),
      bodyFeedback:     sh.getRange('B21').getValue(),
      breathEnergy:     sh.getRange('B22').getValue(),
      regulation:       sh.getRange('B25').getValue(),
      triggers:         sh.getRange('B26').getValue(),
      soothing:         sh.getRange('B27').getValue(),
      routine:          sh.getRange('B28').getValue(),
      nervousEnergy:    sh.getRange('B29').getValue(),
      sessionNotes:     sh.getRange('B31').getValue(),
      insightDownloads: sh.getRange('B32').getValue(),
      integrationTasks: sh.getRange('B33').getValue(),
      completionNotes:  sh.getRange('B36').getValue(),
      completionDate:   sh.getRange('B37').getValue()
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
    base.journalId   = sh.getRange('E4').getValue();
    base.currentWeek = Math.min(Math.max(Math.ceil(base.sessionsUsed || 1), 1), 12);
    base.finalSummary = sh.getRange('B25').getValue();
    for (let w = 1; w <= 12; w++) {
      base['week' + w + 'Notes'] = sh.getRange(12 + w, 2).getValue();
    }
  }

  return base;
}

function emeraldReadCell(clientName, cell) {
  return _getClientSheet(clientName).getRange(cell).getValue();
}


/* ═══════════════════════════════════════════════════════════════
   SAFE WRITE / CLEAR
═══════════════════════════════════════════════════════════════ */

function emeraldSafeWrite(clientName, cell, value) {
  const sh   = _getClientSheet(clientName);
  const type = getClientType(sh) || '';
  _validateSafeCell(cell, type);
  sh.getRange(cell).setValue(value);
  SpreadsheetApp.flush();
  return { written: true, cell: cell, value: value };
}

function emeraldSafeClear(clientName, cell) {
  const sh   = _getClientSheet(clientName);
  const type = getClientType(sh) || '';
  _validateSafeCell(cell, type);
  sh.getRange(cell).clearContent();
  SpreadsheetApp.flush();
  return { cleared: true, cell: cell };
}

function emeraldActivateClientSheet(clientName) {
  const sh = _getClientSheet(clientName);
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sh);
  return sh;
}


/* ═══════════════════════════════════════════════════════════════
   TOOL EXECUTION BRIDGE
   Routes AI tool calls to API-safe implementations.
   NOTE: Never calls functions that use SpreadsheetApp.getUi() directly.
═══════════════════════════════════════════════════════════════ */

function emeraldExecuteTool(toolName, toolInput) {
  const clientName = toolInput.clientName || null;

  if (clientName) emeraldActivateClientSheet(clientName);

  try {
    switch (toolName) {

      // ── Client Info ──
      case 'get_client_list':     return emeraldGetClientList();
      case 'get_client_info':     return emeraldGetClientInfo(clientName);
      case 'read_cell':           return { cell: toolInput.cell, value: emeraldReadCell(clientName, toolInput.cell) };
      case 'write_cell':          return emeraldSafeWrite(clientName, toolInput.cell, toolInput.value);
      case 'clear_cell':          return emeraldSafeClear(clientName, toolInput.cell);

      // ── Client Management ──
      case 'mark_client_complete': {
        if (!toolInput.confirmed) return { error: 'Confirmation required.' };
        return emerald_markClientComplete(clientName);
      }

      // ── Document Generation (existing backend_ functions are UI-safe) ──
      case 'generate_document':
        backend_generateDoulaDoc(toolInput.docType);
        return { generated: true, docType: toolInput.docType, client: clientName };

      case 'generate_client_packet':
        backend_generateClientPacket(toolInput.packetType);
        return { generated: true, packetType: toolInput.packetType, client: clientName };

      // ── Soul Emergence ──
      case 'send_workbook':
        backend_sendWorkbook(toolInput.weekNumber);
        return { sent: true, week: toolInput.weekNumber, client: clientName };

      case 'create_journal':
        return emerald_createJournal(clientName);

      case 'get_journal_url': {
        const url = backend_openJournal();
        return { url: url, client: clientName };
      }

      // ── Onboarding (API-safe — do not call originals which use getUi()) ──
      case 'send_onboarding_email':
        if (!toolInput.confirmed) return { error: 'Confirmation required.' };
        return emerald_sendOnboardingEmail(clientName);

      case 'check_intake_status':
        return emerald_checkIntakeStatus(clientName);

      case 'create_intake_doc':
        return emerald_createIntakeDoc(clientName);

      // ── Scheduling (API-safe) ──
      case 'add_session':
        if (!toolInput.confirmed) return { error: 'Confirmation required.' };
        return emerald_addNextSession(clientName);

      case 'get_upcoming_sessions':
        return emerald_getUpcomingSessions(clientName);

      case 'delete_session_by_event_id':
        return emerald_deleteSessionByEventId(clientName, toolInput.eventId);

      // ── Financial (API-safe) ──
      case 'record_payment':
        if (!toolInput.confirmed) return { error: 'Confirmation required.' };
        return emerald_recordPayment(clientName, toolInput.amount);

      case 'send_receipt':
        if (!toolInput.confirmed) return { error: 'Confirmation required.' };
        return emerald_sendReceipt(clientName);

      case 'get_budget_url': {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let budget = ss.getSheetByName('Budget');
        if (!budget) {
          budget = ss.insertSheet('Budget');
          budget.getRange('A1:G1').setValues([['Date','Client Name','Description','Category','Type','Amount','Notes']]);
        }
        return { url: ss.getUrl() + '#gid=' + budget.getSheetId() };
      }

      // ── Email & Marketing (API-safe) ──
      case 'get_email_templates':
        return getEmailTemplateList();

      case 'send_email_template':
        if (!toolInput.confirmed) return { error: 'Confirmation required.' };
        backend_sendSalesEmailTemplate(toolInput.templateName);
        return { drafted: true, template: toolInput.templateName, client: clientName };

      case 'send_newsletter':
        if (!toolInput.confirmed) return { error: 'Confirmation required.' };
        return emerald_sendNewsletterAll();

      case 'send_past_client_offer':
        if (!toolInput.confirmed) return { error: 'Confirmation required.' };
        if (toolInput.sendToAll) return emerald_sendPastClientOfferAll();
        return emerald_sendPastClientOfferOne(toolInput.email, toolInput.name);

      // ── Utilities ──
      case 'get_client_folder_url': {
        const url = backend_openClientFolder();
        return { url: url, client: clientName };
      }

      case 'refresh_dashboard':
        refreshDoulaDashboard();
        return { refreshed: true };

      case 'refresh_leads':
        return emerald_refreshLeads();

      case 'add_lead':
        addToLeads(toolInput.name, toolInput.email || '');
        return { added: true, name: toolInput.name };

      // ── Memory ──
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
   API-SAFE WRAPPERS
   These replace functions that call SpreadsheetApp.getUi() internally.
   They replicate the same spreadsheet operations but return JSON
   instead of showing dialog boxes.
═══════════════════════════════════════════════════════════════ */

// ── Client Management ──────────────────────────────────────────

function emerald_markClientComplete(clientName) {
  const sh    = _getClientSheet(clientName);
  const name  = sh.getRange('B2').getValue();
  const email = sh.getRange('B4').getValue();
  sh.getRange('B3').setValue('Complete');
  addToPastClients(name, email);
  return { completed: true, client: name, message: name + ' marked complete and added to Past Clients.' };
}

// Creates a new client without UI prompts
function emerald_createNewClient(name, type) {
  if (!name || !type) return { error: 'Name and type required.' };
  const typeMap = {
    'Akashic': 'Akashic_Client_Template',
    'Counseling': 'Counseling_Client_Template',
    'Soul Emergence': 'SoulEmergence_Client_Template'
  };
  const templateName = typeMap[type];
  if (!templateName) return { error: 'Invalid type. Must be Akashic, Counseling, or Soul Emergence.' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(name)) return { error: 'A client named "' + name + '" already exists.' };

  const template = ss.getSheetByName(templateName);
  if (!template) return { error: 'Template not found: ' + templateName };

  const parentFolder = DriveApp.getFolderById(TEMPLATE_ROOT);
  const clientFolder = parentFolder.createFolder(name + ' Files');

  const tempCopy = template.copyTo(ss);
  SpreadsheetApp.flush();
  const newSheet = ss.getSheets().find(s => s.getSheetId() === tempCopy.getSheetId());

  newSheet.setName(name);
  ss.moveActiveSheet(ss.getSheets().length);
  newSheet.getRange('B2').setValue(name);
  newSheet.getRange('B3').setValue('Active');
  newSheet.getRange('A12').setValue(clientFolder.getId());
  newSheet.getRange('B8').setValue(0);
  newSheet.getRange('B9').setValue(0);
  newSheet.getRange('E11').setValue('No');

  addToLeads(name, '');
  SpreadsheetApp.flush();
  return { created: true, name: name, type: type, folderId: clientFolder.getId() };
}

// ── Onboarding ────────────────────────────────────────────────

function emerald_sendOnboardingEmail(clientName) {
  const sh = _getClientSheet(clientName);
  const statusCell = sh.getRange('D7');

  if (statusCell.getValue() !== 'Not Sent') {
    return { error: 'Onboarding already sent or in progress. Current status: ' + statusCell.getValue() };
  }

  const clientEmail = String(sh.getRange('B4').getValue()).trim();
  if (!clientEmail) return { error: 'Client email is missing. Add it to B4 first.' };

  const formUrl = FormApp.openById(INTAKE_FORM_ID).getPublishedUrl();
  const body = 'Hi,\n\nPlease complete the intake form prior to our first session:\n\n' + formUrl +
    '\n\nWith love and respect,\nCarlie Wyton, MA\nAwakening Doula';
  GmailApp.sendEmail(clientEmail, 'Awakening Doula - Intake Form', body);
  statusCell.setValue('Sent');

  return { sent: true, message: 'Onboarding email sent to ' + clientEmail + '.', email: clientEmail };
}

function emerald_checkIntakeStatus(clientName) {
  const sh          = _getClientSheet(clientName);
  const clientEmail = String(sh.getRange('B4').getValue()).trim().toLowerCase();
  const statusCell  = sh.getRange('D7');
  const status      = statusCell.getValue();

  if (!clientEmail) return { error: 'Client email is missing.' };
  if (status !== 'Sent') return { status: status, message: 'Intake status is: ' + status };

  const form = FormApp.openById(INTAKE_FORM_ID);
  let found  = false;
  form.getResponses().some(r =>
    r.getItemResponses().some(ir => {
      if (String(ir.getResponse()).trim().toLowerCase() === clientEmail) {
        found = true; return true;
      }
    })
  );

  if (found) {
    statusCell.setValue('Response Received');
    return { status: 'Response Received', message: 'Intake received — ready to create intake document.' };
  }
  return { status: 'Waiting', message: 'No intake response yet for ' + clientEmail + '.' };
}

function emerald_createIntakeDoc(clientName) {
  const sh = _getClientSheet(clientName);
  if (sh.getRange('D7').getValue() !== 'Response Received') {
    return { error: 'Intake not confirmed. Check status first (D7 must be "Response Received").' };
  }

  const clientEmail    = String(sh.getRange('B4').getValue()).trim().toLowerCase();
  const clientFolderId = sh.getRange('A12').getValue();
  if (!clientEmail || !clientFolderId) return { error: 'Missing email or client folder.' };

  const form = FormApp.openById(INTAKE_FORM_ID);
  let matched = null;
  form.getResponses().some(r =>
    r.getItemResponses().some(ir => {
      if (String(ir.getResponse()).trim().toLowerCase() === clientEmail) {
        matched = r; return true;
      }
    })
  );
  if (!matched) return { error: 'No matching form response found.' };

  // Field mapping — mirrors original createIntakeDoc() exactly
  const fieldMap = {
    'Full name':'FullName','Preferred name':'PreferredName','Date of birth':'DOB',
    'Email address':'Email','Phone number':'Phone',
    'Emergency contact name':'EmergencyName','Emergency contact phone':'EmergencyPhone',
    'Primary reason for seeking counseling':'PrimaryReason',
    'When did these concerns begin':'ConcernsBegin',
    'What symptoms are most problematic right now':'ProblematicSymptoms',
    'What makes symptoms better or worse':'SymptomTriggers',
    'Have you previously received mental health treatment':'PriorTreatment',
    'If yes, type of prior mental health treatment':'PriorTreatmentTypes',
    'Approximate dates of prior mental health treatment':'PriorTreatmentDates',
    'Have you ever received a mental health diagnosis':'HasDiagnosis',
    'If yes, select all that apply':'DiagnosisList',
    'Are you currently taking psychiatric medication':'CurrentMeds',
    'If yes, list current psychiatric medications including dose and prescriber':'CurrentMedsList',
    'Have you taken psychiatric medications in the past':'PastMeds',
    'If yes, which medications and why they were discontinued':'PastMedsList',
    'Do you have any chronic medical conditions':'ChronicConditions',
    'If yes, please list medical conditions':'MedicalConditionsList',
    'Please list any current non-psychiatric medications':'NonPsychMeds',
    'History of head injury, seizures, or neurological conditions':'NeuroHistory',
    'If yes, please explain':'NeuroExplanation',
    'Do you currently use any of the following substances':'SubstanceUse',
    'Age of first substance use':'SubstanceAge','Frequency of current substance use':'SubstanceFrequency',
    'Have you ever received treatment for substance use':'SubstanceTreatment',
    'If yes, please describe':'SubstanceTreatmentDescription',
    'Have you ever had thoughts of harming yourself':'SelfHarmThoughts',
    'Have you ever attempted suicide or self-harm':'SelfHarmAttempts',
    'Have you had thoughts of harming others':'HarmOthersThoughts',
    'Have you experienced recent thoughts of suicide or self-harm':'RecentSelfHarm',
    'Have you experienced trauma or abuse':'TraumaHistory',
    'If yes, are these experiences impacting you currently':'TraumaImpact',
    'What are your goals for therapy':'TherapyGoals',
    'What would improvement look like for you':'ImprovementVision',
    'I understand this intake does not replace medical or emergency care and that my therapist may follow up regarding safety concerns':'Acknowledgement'
  };

  const data = {};
  matched.getItemResponses().forEach(ir => {
    const key = fieldMap[ir.getItem().getTitle()];
    if (key) data[key] = Array.isArray(ir.getResponse()) ? ir.getResponse().join(', ') : ir.getResponse();
  });

  const folder = DriveApp.getFolderById(clientFolderId);
  const copy   = DriveApp.getFileById(INTAKE_TEMPLATE_ID).makeCopy('Intake – Clinical', folder);
  const doc    = DocumentApp.openById(copy.getId());
  const body   = doc.getBody();
  Object.keys(data).forEach(k => body.replaceText('\\{\\{' + k + '\\}\\}', data[k] || ''));
  doc.saveAndClose();

  const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Intake Log');
  if (logSheet) {
    const row = Math.max(logSheet.getLastRow() + 1, 2);
    logSheet.getRange(row, 1).setValue(sh.getRange('B2').getValue());
    logSheet.getRange(row, 2).setValue(new Date());
    logSheet.getRange(row, 3).setValue(copy.getUrl());
  }

  return { created: true, message: 'Intake document created.', url: copy.getUrl() };
}

// ── Scheduling ────────────────────────────────────────────────

function emerald_addNextSession(clientName) {
  const sh = _getClientSheet(clientName);
  const dateValue = sh.getRange('B10').getValue();
  const timeInput = sh.getRange('D10').getValue();

  if (!dateValue || !timeInput) {
    return { error: 'Session date (B10) or time (D10) is missing. Set these first.' };
  }

  const time = normalizeTime(timeInput);
  if (!validateTimeWindow(time.hours, time.minutes)) {
    return { error: 'Session time must be between 7:00 AM and 6:00 PM.' };
  }

  const startDate = new Date(dateValue);
  startDate.setHours(time.hours, time.minutes, 0, 0);
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + SESSION_DURATION_MINUTES);

  const event = CalendarApp.getDefaultCalendar().createEvent(
    'Awakening Doula Session - ' + clientName, startDate, endDate,
    { description: 'Soul session with ' + clientName }
  );

  const eventId = event.getId();
  sh.getRange(findNextStorageRow(sh), STORAGE_COLUMN).setValue(eventId);

  const timeStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a');
  return { added: true, message: 'Session added: ' + timeStr, eventId: eventId };
}

function emerald_getUpcomingSessions(clientName) {
  const sh = _getClientSheet(clientName);
  const now    = new Date();
  const future = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const events = CalendarApp.getDefaultCalendar()
    .getEvents(now, future)
    .filter(e => e.getTitle().includes(clientName));

  return events.map(e => ({
    eventId: e.getId(),
    title:   e.getTitle(),
    dateStr: Utilities.formatDate(e.getStartTime(), Session.getScriptTimeZone(), 'EEE, MMM d · h:mm a')
  }));
}

function emerald_deleteSessionByEventId(clientName, eventId) {
  if (!eventId) return { error: 'eventId required.' };
  const sh     = _getClientSheet(clientName);
  const now    = new Date();
  const future = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const events = CalendarApp.getDefaultCalendar().getEvents(now, future);
  const target = events.find(e => e.getId() === eventId);

  if (!target) return { error: 'Session not found — it may have already been deleted.' };

  const dateStr = Utilities.formatDate(target.getStartTime(), Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a');
  target.deleteEvent();
  removeEventIdFromStorage(sh, eventId);
  return { deleted: true, message: 'Session deleted: ' + dateStr };
}

// ── Financial ─────────────────────────────────────────────────

function emerald_recordPayment(clientName, amount) {
  const sh           = _getClientSheet(clientName);
  const name         = sh.getRange('B2').getValue();
  const clientType   = sh.getRange('D3').getValue();
  const serviceType  = sh.getRange('B6').getValue();
  const sessionPrice = sh.getRange('B11').getValue();

  const payAmount = (amount !== undefined && amount !== null && String(amount).trim() !== '')
    ? parseFloat(String(amount).replace(/[^0-9.]/g, ''))
    : parseFloat(sessionPrice) || 0;

  if (isNaN(payAmount) || payAmount <= 0) {
    return { error: 'Invalid amount. Provide a positive dollar amount.' };
  }

  const ss          = SpreadsheetApp.getActiveSpreadsheet();
  const budgetSheet = ss.getSheetByName('Budget');
  if (!budgetSheet) return { error: 'Budget sheet not found.' };

  const nextRow = budgetSheet.getLastRow() + 1;
  budgetSheet.getRange(nextRow, 1, 1, 7).setValues([[
    new Date(), name, clientType, serviceType, 'Income', payAmount, ''
  ]]);
  sh.getRange('E11').setValue('Yes');

  return { recorded: true, amount: payAmount, message: '$' + payAmount + ' recorded for ' + name + '.' };
}

function emerald_sendReceipt(clientName) {
  const sh    = _getClientSheet(clientName);
  const name  = sh.getRange('B2').getValue();
  const email = sh.getRange('B4').getValue();
  const price = sh.getRange('B11').getValue();

  if (!email) return { error: 'Client email is missing.' };

  GmailApp.sendEmail(email,
    'Payment Receipt - Awakening Doula - ' + name,
    'Hi ' + name + ',\n\nThank you for your payment of $' + price + '.\n\n' +
    'Date: ' + new Date().toLocaleDateString() + '\nAmount: $' + price + '\n\n' +
    'With love and respect,\nCarlie Wyton, MA\nAwakening Doula'
  );
  return { sent: true, message: 'Receipt sent to ' + email + '.' };
}

// ── Newsletter / Past Client Offer ────────────────────────────

function emerald_getNewsletterPreview() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Email_Templates');
  if (!sheet) return { error: 'Email_Templates sheet not found.' };

  const names   = sheet.getRange('A2:A').getValues().flat();
  const bodies  = sheet.getRange('B2:B').getValues().flat();
  const actives = sheet.getRange('C2:C').getValues().flat();

  for (let i = 0; i < names.length; i++) {
    if (String(names[i]).trim() === 'Newsletter' && String(actives[i]).trim().toLowerCase() === 'yes') {
      return {
        html: String(bodies[i] || '').trim()
          .replace(/\{\{NAME\}\}/g, 'Preview Reader')
          .replace(/\{\{CLIENT_NAME\}\}/g, 'Preview Reader')
      };
    }
  }
  return { error: 'No active Newsletter template found.' };
}

function emerald_sendNewsletterAll() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Email_Templates');
  if (!sheet) return { error: 'Email_Templates sheet not found.' };

  const names   = sheet.getRange('A2:A').getValues().flat();
  const bodies  = sheet.getRange('B2:B').getValues().flat();
  const actives = sheet.getRange('C2:C').getValues().flat();

  let htmlBody = null;
  for (let i = 0; i < names.length; i++) {
    if (String(names[i]).trim() === 'Newsletter' && String(actives[i]).trim().toLowerCase() === 'yes') {
      htmlBody = String(bodies[i] || '').trim(); break;
    }
  }
  if (!htmlBody) return { error: 'No active Newsletter template found.' };

  const leadsSheet = ss.getSheetByName('Leads');
  if (!leadsSheet) return { error: 'Leads sheet not found.' };
  const lastRow = leadsSheet.getLastRow();
  if (lastRow < 4) return { error: 'No leads found.' };

  const leads = leadsSheet.getRange(4, 1, lastRow - 3, 3).getValues()
    .map(r => [String(r[0] || '').trim(), String(r[2] || '').trim()])
    .filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r[1]));

  if (!leads.length) return { error: 'No valid email addresses in Leads.' };

  let sent = 0;
  leads.forEach(([name, email]) => {
    const filled = htmlBody.replace(/\{\{NAME\}\}/g, name).replace(/\{\{CLIENT_NAME\}\}/g, name);
    GmailApp.sendEmail(email, 'Awakening Doula - Newsletter', '', { htmlBody: filled });
    sent++;
  });
  return { sent: true, count: sent, message: 'Newsletter sent to ' + sent + ' contacts.' };
}

function emerald_sendPastClientOfferAll() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Email_Templates');
  if (!sheet) return { error: 'Email_Templates sheet not found.' };

  const names   = sheet.getRange('A2:A').getValues().flat();
  const bodies  = sheet.getRange('B2:B').getValues().flat();
  const actives = sheet.getRange('C2:C').getValues().flat();

  let htmlBody = null;
  for (let i = 0; i < names.length; i++) {
    if (String(names[i]).trim() === 'Past Client Offer' && String(actives[i]).trim().toLowerCase() === 'yes') {
      htmlBody = String(bodies[i] || '').trim(); break;
    }
  }
  if (!htmlBody) return { error: 'No active "Past Client Offer" template found.' };

  const pastSheet = ss.getSheetByName('Past Clients');
  if (!pastSheet) return { error: 'Past Clients sheet not found.' };

  const lastRow = pastSheet.getLastRow();
  if (lastRow < 2) return { error: 'No past clients found.' };

  const clients = pastSheet.getRange(2, 1, lastRow - 1, 2).getValues()
    .map(r => [String(r[0] || '').trim(), String(r[1] || '').trim()])
    .filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r[1]));

  if (!clients.length) return { error: 'No past clients with valid emails.' };

  const optInUrl = getOptInFormUrl();
  let sent = 0;
  clients.forEach(([name, email]) => {
    const filled = htmlBody
      .replace(/\{\{NAME\}\}/g, name).replace(/\{\{CLIENT_NAME\}\}/g, name)
      .replace(/\{\{OPT_IN_LINK\}\}/g, optInUrl);
    GmailApp.sendEmail(email, 'A Special Offer For You', '', { htmlBody: filled });
    sent++;
  });
  return { sent: true, count: sent, message: 'Offer sent to ' + sent + ' past client(s).' };
}

function emerald_sendPastClientOfferOne(email, name) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Valid email address required.' };
  }

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Email_Templates');
  if (!sheet) return { error: 'Email_Templates sheet not found.' };

  const names   = sheet.getRange('A2:A').getValues().flat();
  const bodies  = sheet.getRange('B2:B').getValues().flat();
  const actives = sheet.getRange('C2:C').getValues().flat();

  let htmlBody = null;
  for (let i = 0; i < names.length; i++) {
    if (String(names[i]).trim() === 'Past Client Offer' && String(actives[i]).trim().toLowerCase() === 'yes') {
      htmlBody = String(bodies[i] || '').trim(); break;
    }
  }
  if (!htmlBody) return { error: 'No active "Past Client Offer" template found.' };

  const recipientName = name || 'Friend';
  const filled = htmlBody
    .replace(/\{\{NAME\}\}/g, recipientName).replace(/\{\{CLIENT_NAME\}\}/g, recipientName)
    .replace(/\{\{OPT_IN_LINK\}\}/g, getOptInFormUrl());

  GmailApp.sendEmail(email, 'A Special Offer For You', '', { htmlBody: filled });
  return { sent: true, message: 'Offer sent to ' + email + '.' };
}

// ── Private Journal (API-safe) ────────────────────────────────

function emerald_createJournal(clientName) {
  const sh         = _getClientSheet(clientName);
  const clientType = getClientType(sh);

  if (clientType !== 'Soul Emergence') {
    return { error: 'Journals are only available for Soul Emergence clients.' };
  }

  const name    = sh.getRange('B2').getValue();
  const email   = sh.getRange('B4').getValue();
  const folderId = sh.getRange('A12').getValue();

  if (!name || !email || !folderId) {
    return { error: 'Missing client name, email, or folder ID.' };
  }

  const existingId = sh.getRange(JOURNAL_DOC_CELL).getValue();
  if (existingId) return { error: 'Journal already exists. Use "Open Journal" to access it.' };

  const folder = DriveApp.getFolderById(folderId);
  const copy   = DriveApp.getFileById(JOURNAL_TEMPLATE_ID).makeCopy('Private Journal - ' + name, folder);
  const doc    = DocumentApp.openById(copy.getId());
  const body   = doc.getBody();
  const today  = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM d, yyyy');

  body.replaceText('{{ClientName}}', name);
  body.replaceText('{{PractitionerName}}', Session.getActiveUser().getEmail());
  body.replaceText('{{StartDate}}', today);
  doc.saveAndClose();

  copy.addEditor(email);
  copy.addEditor(Session.getActiveUser().getEmail());
  sh.getRange(JOURNAL_DOC_CELL).setValue(copy.getId());

  return { created: true, message: 'Private journal created and shared with ' + email + '.', url: copy.getUrl() };
}

// ── Leads ─────────────────────────────────────────────────────

function emerald_refreshLeads() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const ledger = ss.getSheetByName('Leads');
  if (!ledger) return { error: 'Leads sheet not found.' };

  let processed = 0;
  ss.getSheets().forEach(sh => {
    if (SYSTEM_SHEETS.includes(sh.getName())) return;
    const n = sh.getRange('B2').getValue();
    const e = sh.getRange('B4').getValue();
    if (n && e) { addToLeads(n, e); processed++; }
  });
  return { refreshed: true, message: 'Leads refreshed. ' + processed + ' client(s) processed.' };
}


/* ═══════════════════════════════════════════════════════════════
   MEMORY HELPERS (called from EmeraldAI.gs)
═══════════════════════════════════════════════════════════════ */

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


/* ═══════════════════════════════════════════════════════════════
   PRIVATE HELPERS
═══════════════════════════════════════════════════════════════ */

function _getClientSheet(clientName) {
  if (!clientName) throw new Error('clientName is required.');
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(clientName);
  if (!sh) throw new Error('Client sheet not found: ' + clientName);
  return sh;
}

function _validateSafeCell(cell, clientType) {
  if (FORBIDDEN_CELLS.includes(cell)) {
    throw new Error('Cell ' + cell + ' is managed by system automations and cannot be modified by Emerald.');
  }
  const allowed = [
    ...SAFE_WRITE_CELLS.common,
    ...(SAFE_WRITE_CELLS[clientType] || [])
  ];
  if (!allowed.includes(cell)) {
    throw new Error('Cell ' + cell + ' is not in the safe-write list for ' + (clientType || 'this client type') + '.');
  }
}

function _formatDate(val) {
  if (!val) return '';
  try { return Utilities.formatDate(new Date(val), Session.getScriptTimeZone(), 'MMM d, yyyy'); }
  catch (_) { return String(val); }
}
