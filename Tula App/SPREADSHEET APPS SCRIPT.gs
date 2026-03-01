/****************************************************************************************
 AWAKENING DOULA - CLIENT MANAGEMENT SYSTEM
 Supports: Akashic • Counseling • Soul Emergence (12-Week Program)
 Smart context-aware document generation
****************************************************************************************/

/***********************************************
 GLOBAL CONFIG
***********************************************/
const TEMPLATE_ROOT = "1L19P0AfMGzOf0QvAq-SnTI9iJ17k9IUo";

// Document Templates
const TEMPLATE_SESSION_NOTES   = "1_kjvbyVz-rPoNU1q9_tO3cOj9YcfK4nN_V3McpPR9SI";
const TEMPLATE_INTEGRATION     = "1dRpRvXb14reodgFRn1E688lhWZ5wrUwbACaeBqLOs1k";
const TEMPLATE_SUMMARY         = "14moOOPr0Dz33oX5AwKodoEq4MqFIxAKUXbgme7znofI";
const TEMPLATE_COUNSELLING     = "1n5BLhgeMgSx2J2mbZw8KFQW3aHl4HGbIwWui9LMI47o";
const TEMPLATE_BREATHWORK      = "1M6hVFB7VcjkirOz3X_3pJjb1IFmtixOwlatWDBAm8dI";
const TEMPLATE_AKASHIC         = "1BN6WZnXyJHJErvwblMZUUtzf1IUGWj14qq5EhgwmI5c";
const TEMPLATE_CLIENT_HOMEWORK = "YOUR_HOMEWORK_TEMPLATE_ID_HERE";

// Soul Emergence Workbook Templates (one per week)
const WORKBOOK_TEMPLATES = {
  1:  "1xJtINLKRfoMKYKfkVL8bxpiT7CDpyC7dndAe3hDSTvg",   // The Threshold
  2:  "YOUR_WEEK_2_WORKBOOK_TEMPLATE_ID",   // Akashic Records Reading
  3:  "YOUR_WEEK_3_WORKBOOK_TEMPLATE_ID",   // Integration & Intention
  4:  "YOUR_WEEK_4_WORKBOOK_TEMPLATE_ID",   // Akashic Clearing
  5:  "YOUR_WEEK_5_WORKBOOK_TEMPLATE_ID",   // Befriending Your Nervous System
  6:  "YOUR_WEEK_6_WORKBOOK_TEMPLATE_ID",   // Parts Work Integration
  7:  "YOUR_WEEK_7_WORKBOOK_TEMPLATE_ID",   // Timeline Therapy & Reprocessing
  8:  "YOUR_WEEK_8_WORKBOOK_TEMPLATE_ID",   // Clearing Old Programming
  9:  "YOUR_WEEK_9_WORKBOOK_TEMPLATE_ID",   // Honoring What Was
  10: "YOUR_WEEK_10_WORKBOOK_TEMPLATE_ID",  // Releasing Expectations & Ritual Goodbye
  11: "YOUR_WEEK_11_WORKBOOK_TEMPLATE_ID",  // Final Akashic Clearing
  12: "YOUR_WEEK_12_WORKBOOK_TEMPLATE_ID"   // Emergence & Integration
};

// Soul Emergence Session Names
const SESSION_NAMES = {
  1:  "The Threshold",
  2:  "Akashic Records Reading",
  3:  "Integration & Intention",
  4:  "Akashic Clearing",
  5:  "Befriending Your Nervous System",
  6:  "Parts Work Integration",
  7:  "Timeline Therapy & Reprocessing",
  8:  "Clearing Old Programming",
  9:  "Honoring What Was",
  10: "Releasing Expectations & Ritual Goodbye",
  11: "Final Akashic Clearing",
  12: "Emergence & Integration"
};

// Soul Emergence Summary Template
const TEMPLATE_SOUL_EMERGENCE_SUMMARY = "1dRpRvXb14reodgFRn1E688lhWZ5wrUwbACaeBqLOs1k";

const JOURNAL_TEMPLATE_ID = '1oG0hnn9OEwP_uupStwUm9LybIGupeCZe2263_8X11XQ';
const JOURNAL_DOC_CELL = 'E4';

// Onboarding
const INTAKE_FORM_ID = '1CTNUnoqqybR_mMcMhPQIFtsL4R9dJg7HrxUhNd2hLWs';
const INTAKE_TEMPLATE_ID = '1Ectd2uJDhdaqF8RysNadRdoLqVRYCWCSVb2vtI1bFkc';

// Scheduling
const SESSION_DURATION_MINUTES = 60;
const STORAGE_START_ROW = 100;
const STORAGE_COLUMN = 24;

// Client Literature
const CLIENT_LIT_TEMPLATES = {
  'Intro Packet': 'YOUR_INTRO_PACKET_TEMPLATE_ID_HERE',
  'Packet 2': 'YOUR_PACKET_2_TEMPLATE_ID_HERE',
  'Packet 3': 'YOUR_PACKET_3_TEMPLATE_ID_HERE'
};


/****************************************************************************************
 TEMPLATE REGISTRY — Self-Service Template Management
 Stores template IDs in a "Template Registry" sheet so Carlie can manage them
 without code changes. Falls back to hard-coded constants if registry doesn't exist.
****************************************************************************************/

/**
 * Looks up a template ID from the Template Registry sheet.
 * Falls back to hard-coded constants if registry doesn't exist (migration safety).
 */
function getTemplateIdFromRegistry(category, label) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Template Registry');

  // Fallback to hard-coded constants if registry doesn't exist yet
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === category && data[i][1] === label) {
      var id = String(data[i][2]).trim();
      return id || null;
    }
  }
  return null;
}

/**
 * Returns the full template registry as an array of objects.
 */
function getTemplateRegistry() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Template Registry');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var templates = [];
  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][2]).trim();
    templates.push({
      category: data[i][0],
      label: data[i][1],
      templateId: id,
      status: id ? 'Active' : 'Missing',
      lastUpdated: data[i][4] || null
    });
  }
  return templates;
}

/**
 * Returns only missing templates from the registry.
 */
function getMissingTemplates() {
  return getTemplateRegistry().filter(function(t) { return t.status === 'Missing'; });
}

/**
 * Searches Google Drive for documents matching a search term.
 */
function searchDriveForTemplate(searchTerm) {
  var files = DriveApp.searchFiles(
    'title contains "' + searchTerm.replace(/"/g, '\\"') + '" and mimeType = "application/vnd.google-apps.document"'
  );
  var results = [];
  while (files.hasNext() && results.length < 20) {
    var f = files.next();
    results.push({ id: f.getId(), name: f.getName(), url: f.getUrl() });
  }
  return results;
}

/**
 * Wires a template ID into the registry. Updates existing row or appends new.
 */
function wireTemplate(category, label, templateId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Template Registry');
  if (!sheet) throw new Error('Template Registry not found. Run Setup > Create Template Registry first.');

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === category && data[i][1] === label) {
      sheet.getRange(i + 1, 3).setValue(templateId);
      sheet.getRange(i + 1, 4).setValue('Active');
      sheet.getRange(i + 1, 5).setValue(new Date());
      return { success: true, label: label, isNew: false };
    }
  }

  // New template type — append row
  sheet.appendRow([category, label, templateId, 'Active', new Date()]);
  return { success: true, label: label, isNew: true };
}

/**
 * Adds a new template type to the registry with no ID yet (Missing status).
 */
function addTemplateType(category, label) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Template Registry');
  if (!sheet) throw new Error('Template Registry not found. Run Setup > Create Template Registry first.');

  // Check if already exists
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === category && data[i][1] === label) {
      return { success: false, error: 'Template "' + label + '" already exists in registry.' };
    }
  }

  sheet.appendRow([category, label, '', 'Missing', '']);
  return { success: true, label: label };
}

/**
 * Creates the Template Registry sheet and migrates all existing template IDs.
 * One-time setup — safe to run multiple times (won't overwrite existing registry).
 */
function setupTemplateRegistry() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existing = ss.getSheetByName('Template Registry');
  if (existing) {
    SpreadsheetApp.getUi().alert('Template Registry already exists. No changes made.');
    return;
  }

  var sheet = ss.insertSheet('Template Registry');

  // Headers
  sheet.getRange('A1:E1').setValues([['Category', 'Label', 'Template ID', 'Status', 'Last Updated']]);
  sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#FDF0E8');

  var now = new Date();
  function row(cat, label, id) {
    var cleanId = (id && !id.includes('YOUR_')) ? id : '';
    return [cat, label, cleanId, cleanId ? 'Active' : 'Missing', cleanId ? now : ''];
  }

  var rows = [
    // Documents
    row('document', 'Session Notes', TEMPLATE_SESSION_NOTES),
    row('document', 'Integration Guide', TEMPLATE_INTEGRATION),
    row('document', 'Client Summary', TEMPLATE_SUMMARY),
    row('document', 'Counseling Notes', TEMPLATE_COUNSELLING),
    row('document', 'Breathwork Notes', TEMPLATE_BREATHWORK),
    row('document', 'Akashic Notes', TEMPLATE_AKASHIC),
    row('document', 'Client Homework', TEMPLATE_CLIENT_HOMEWORK),
    row('document', 'Soul Emergence Summary', TEMPLATE_SOUL_EMERGENCE_SUMMARY),

    // Workbooks
    row('workbook', 'Week 1 - The Threshold', WORKBOOK_TEMPLATES[1]),
    row('workbook', 'Week 2 - Akashic Records Reading', WORKBOOK_TEMPLATES[2]),
    row('workbook', 'Week 3 - Integration & Intention', WORKBOOK_TEMPLATES[3]),
    row('workbook', 'Week 4 - Akashic Clearing', WORKBOOK_TEMPLATES[4]),
    row('workbook', 'Week 5 - Befriending Your Nervous System', WORKBOOK_TEMPLATES[5]),
    row('workbook', 'Week 6 - Parts Work Integration', WORKBOOK_TEMPLATES[6]),
    row('workbook', 'Week 7 - Timeline Therapy & Reprocessing', WORKBOOK_TEMPLATES[7]),
    row('workbook', 'Week 8 - Clearing Old Programming', WORKBOOK_TEMPLATES[8]),
    row('workbook', 'Week 9 - Honoring What Was', WORKBOOK_TEMPLATES[9]),
    row('workbook', 'Week 10 - Releasing Expectations & Ritual Goodbye', WORKBOOK_TEMPLATES[10]),
    row('workbook', 'Week 11 - Final Akashic Clearing', WORKBOOK_TEMPLATES[11]),
    row('workbook', 'Week 12 - Emergence & Integration', WORKBOOK_TEMPLATES[12]),

    // Packets
    row('packet', 'Intro Packet', CLIENT_LIT_TEMPLATES['Intro Packet']),
    row('packet', 'Packet 2', CLIENT_LIT_TEMPLATES['Packet 2']),
    row('packet', 'Packet 3', CLIENT_LIT_TEMPLATES['Packet 3']),

    // Field Labels — Akashic (label = cell ref, "template ID" = display name)
    ['field_akashic', 'B13', 'Themes', 'Active', now],
    ['field_akashic', 'B14', 'Soul Messages', 'Active', now],
    ['field_akashic', 'B15', 'Blocks', 'Active', now],
    ['field_akashic', 'B16', 'Openings', 'Active', now],
    ['field_akashic', 'B17', 'Past Life Notes', 'Active', now],
    ['field_akashic', 'B20', 'Breath Insights', 'Active', now],
    ['field_akashic', 'B21', 'Body Feedback', 'Active', now],
    ['field_akashic', 'B22', 'Breath Energy', 'Active', now],
    ['field_akashic', 'B25', 'Regulation', 'Active', now],
    ['field_akashic', 'B26', 'Triggers', 'Active', now],
    ['field_akashic', 'B27', 'Soothing', 'Active', now],
    ['field_akashic', 'B28', 'Routine', 'Active', now],
    ['field_akashic', 'B29', 'Nervous Energy', 'Active', now],
    ['field_akashic', 'B31', 'Session Notes', 'Active', now],
    ['field_akashic', 'B32', 'Insight Downloads', 'Active', now],
    ['field_akashic', 'B33', 'Integration Tasks', 'Active', now],
    ['field_akashic', 'B36', 'Completion Notes', 'Active', now],
    ['field_akashic', 'B37', 'Completion Date', 'Active', now],

    // Field Labels — Counseling
    ['field_counseling', 'B14', 'Primary Concern / Focus', 'Active', now],
    ['field_counseling', 'B15', 'Client Narrative', 'Active', now],
    ['field_counseling', 'B16', 'Emotional Landscape', 'Active', now],
    ['field_counseling', 'B17', 'Spiritual Landscape', 'Active', now],
    ['field_counseling', 'B18', 'Cognitive + Relational Patterns', 'Active', now],
    ['field_counseling', 'B19', 'Behavioural Patterns', 'Active', now],
    ['field_counseling', 'B20', 'Interventions Used', 'Active', now],
    ['field_counseling', 'B21', 'Therapeutic Notes for Continuity', 'Active', now],
    ['field_counseling', 'B22', 'Plan for Next Session', 'Active', now]
  ];

  sheet.getRange(2, 1, rows.length, 5).setValues(rows);

  // Formatting
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 5);
  sheet.setColumnWidth(3, 300);

  // Conditional formatting: green for Active, red for Missing
  var statusRange = sheet.getRange('D2:D' + (rows.length + 1));
  var greenRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Active')
    .setBackground('#D4EDDA')
    .setRanges([statusRange])
    .build();
  var redRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Missing')
    .setBackground('#F8D7DA')
    .setRanges([statusRange])
    .build();
  sheet.setConditionalFormatRules([greenRule, redRule]);

  SpreadsheetApp.getUi().alert('Template Registry created! Go to Doula Tools > Manage Templates to wire your templates.');
}

/**
 * Reads Soul Emergence week names from the Template Registry workbook entries.
 * Parses "Week N - Name" labels to extract week numbers and names.
 * Falls back to hard-coded SESSION_NAMES if registry doesn't exist.
 */
function getSessionNamesFromRegistry() {
  var registry = getTemplateRegistry();
  if (!registry || registry.length === 0) return { names: SESSION_NAMES, count: 12 };

  var workbooks = registry.filter(function(t) { return t.category === 'workbook'; });
  if (workbooks.length === 0) return { names: SESSION_NAMES, count: 12 };

  var names = {};
  var count = 0;
  workbooks.forEach(function(w) {
    var match = w.label.match(/^Week\s+(\d+)\s*-\s*(.+)$/i);
    if (match) {
      var num = parseInt(match[1]);
      names[num] = match[2].trim();
      if (num > count) count = num;
    }
  });

  if (count === 0) return { names: SESSION_NAMES, count: 12 };
  return { names: names, count: count };
}

/**
 * Reads field display labels from the Template Registry.
 * Categories: field_akashic, field_counseling, field_soul_emergence
 * Returns object: { "B13": "Themes", "B14": "Soul Messages", ... }
 */
function getFieldLabels(clientType) {
  var registry = getTemplateRegistry();
  var category = 'field_' + clientType.toLowerCase().replace(/\s+/g, '_');
  var labels = {};
  registry.forEach(function(t) {
    if (t.category === category && t.templateId) {
      labels[t.label] = t.templateId;
    }
  });
  return labels;
}

/**
 * Returns Emerald configuration from Script Properties.
 * Falls back to sensible defaults if not yet configured.
 */
function getEmeraldConfig() {
  var props = PropertiesService.getScriptProperties();
  var sessionInfo = getSessionNamesFromRegistry();
  return {
    sessionNames: sessionInfo.names,
    weekCount: sessionInfo.count,
    sessionDuration: parseInt(props.getProperty('SESSION_DURATION_MINUTES') || '60'),
    practitionerName: props.getProperty('PRACTITIONER_NAME') || 'Carlie Wyton, MA',
    practiceName: props.getProperty('PRACTICE_NAME') || 'Haven, The Awakening Doula',
    aiName: props.getProperty('AI_NAME') || 'Emerald'
  };
}

/**
 * Initializes default Emerald configuration in Script Properties.
 * Safe to run multiple times — only sets values that don't exist yet.
 */
function setupEmeraldConfig() {
  var props = PropertiesService.getScriptProperties();
  var defaults = {
    'SESSION_DURATION_MINUTES': '60',
    'PRACTITIONER_NAME': 'Carlie Wyton, MA',
    'PRACTICE_NAME': 'Haven, The Awakening Doula',
    'AI_NAME': 'Emerald'
  };
  Object.keys(defaults).forEach(function(key) {
    if (!props.getProperty(key)) {
      props.setProperty(key, defaults[key]);
    }
  });
  SpreadsheetApp.getUi().alert(
    'Emerald configuration initialized with defaults.\n\n' +
    'To change values, go to:\nExtensions > Apps Script > Project Settings > Script Properties\n\n' +
    'Available settings:\n' +
    '• PRACTITIONER_NAME\n' +
    '• PRACTICE_NAME\n' +
    '• AI_NAME\n' +
    '• SESSION_DURATION_MINUTES'
  );
}

/**
 * Opens the Manage Templates dialog.
 */
function showManageTemplatesDialog() {
  var templates = getTemplateRegistry();
  if (templates.length === 0) {
    SpreadsheetApp.getUi().alert('Template Registry not found. Go to Setup > Create Template Registry first.');
    return;
  }

  // Build grouped HTML
  var categories = { document: 'Documents', workbook: 'Workbooks', packet: 'Packets', field_akashic: 'Field Labels — Akashic', field_counseling: 'Field Labels — Counseling' };
  var html = '<style>';
  html += 'body{font-family:"Google Sans",Helvetica,sans-serif;background:#FDF0E8;color:#2C1810;margin:0;padding:16px;}';
  html += 'h2{color:#7B3F2A;font-size:16px;margin:16px 0 8px;border-bottom:1px solid #F0D9CA;padding-bottom:4px;}';
  html += 'h2:first-of-type{margin-top:0;}';
  html += '.row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #F0D9CA;}';
  html += '.status{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}';
  html += '.active{background:#D4EDDA;color:#28a745;}';
  html += '.missing{background:#F8D7DA;color:#dc3545;}';
  html += '.label{flex:1;font-size:13px;}';
  html += '.btn{padding:6px 12px;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500;}';
  html += '.btn-wire{background:#E8654A;color:white;}';
  html += '.btn-wire:hover{background:#C4472F;}';
  html += '.btn-edit{background:#7B3F2A;color:white;}';
  html += '.btn-edit:hover{background:#5a2d1e;}';
  html += '.btn-change{background:#D4A762;color:white;}';
  html += '.btn-change:hover{background:#B88840;}';
  html += '#searchPanel{display:none;background:#FFF8F3;border:1px solid #F0D9CA;border-radius:8px;padding:12px;margin:12px 0;}';
  html += '#searchInput{width:100%;padding:8px;border:1px solid #F0D9CA;border-radius:6px;font-size:13px;box-sizing:border-box;}';
  html += '#searchResults{margin-top:8px;max-height:200px;overflow-y:auto;}';
  html += '.result{padding:8px;background:#FFF;border:1px solid #F0D9CA;border-radius:4px;margin:4px 0;cursor:pointer;font-size:12px;}';
  html += '.result:hover{background:#FDF0E8;border-color:#D4A762;}';
  html += '.result-name{font-weight:500;}';
  html += '.result-id{color:#A87B6E;font-size:11px;word-break:break-all;}';
  html += '#addPanel{display:none;background:#FFF8F3;border:1px solid #F0D9CA;border-radius:8px;padding:12px;margin:12px 0;}';
  html += 'select,#newLabel{padding:8px;border:1px solid #F0D9CA;border-radius:6px;font-size:13px;width:100%;box-sizing:border-box;margin-top:4px;}';
  html += '.add-row{margin-top:8px;}';
  html += '.footer{margin-top:12px;display:flex;gap:8px;}';
  html += '.btn-add{background:#7B3F2A;color:white;padding:8px 16px;}';
  html += '.toast{display:none;position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#28a745;color:white;padding:10px 20px;border-radius:8px;font-size:13px;z-index:100;}';
  html += '</style>';

  html += '<div id="toast" class="toast"></div>';
  html += '<div id="searchPanel">';
  html += '<strong id="searchTitle">Search Drive</strong>';
  html += '<input type="text" id="searchInput" placeholder="Type template name..." onkeyup="if(event.key===\'Enter\')doSearch()">';
  html += '<button class="btn btn-wire" onclick="doSearch()" style="margin-top:8px">Search</button>';
  html += '<div id="searchResults"></div>';
  html += '</div>';

  var catOrder = ['document', 'workbook', 'packet', 'field_akashic', 'field_counseling'];
  for (var c = 0; c < catOrder.length; c++) {
    var cat = catOrder[c];
    var catTemplates = templates.filter(function(t) { return t.category === cat; });
    if (catTemplates.length === 0) continue;

    html += '<h2>' + categories[cat] + '</h2>';
    var isFieldCategory = cat.indexOf('field_') === 0;

    for (var t = 0; t < catTemplates.length; t++) {
      var tmpl = catTemplates[t];
      var isActive = tmpl.status === 'Active';
      html += '<div class="row">';

      if (isFieldCategory) {
        // Field labels: show cell ref + display name + Edit button
        html += '<div class="status active" style="font-size:11px;background:#E8F4FD;color:#2C6FA0;">' + tmpl.label + '</div>';
        html += '<div class="label">' + (tmpl.templateId || '<em>unnamed</em>') + '</div>';
        html += '<button class="btn btn-edit" onclick="editField(\'' + tmpl.category + '\',\'' + tmpl.label + '\',\'' + (tmpl.templateId || '').replace(/'/g, "\\'") + '\')">Edit</button>';
      } else {
        // Template: show status + label + Wire/Change button
        html += '<div class="status ' + (isActive ? 'active' : 'missing') + '">' + (isActive ? '✓' : '✗') + '</div>';
        html += '<div class="label">' + tmpl.label + '</div>';
        if (isActive) {
          html += '<button class="btn btn-change" onclick="startWire(\'' + tmpl.category + '\',\'' + tmpl.label.replace(/'/g, "\\'") + '\')">Change</button>';
        } else {
          html += '<button class="btn btn-wire" onclick="startWire(\'' + tmpl.category + '\',\'' + tmpl.label.replace(/'/g, "\\'") + '\')">Wire</button>';
        }
      }
      html += '</div>';
    }
  }

  // Add New Template section
  html += '<div class="footer">';
  html += '<button class="btn btn-add" onclick="showAddPanel()">+ Add New Template</button>';
  html += '</div>';

  html += '<div id="addPanel">';
  html += '<strong>Add New Template Type</strong>';
  html += '<div class="add-row"><label>Category:</label><select id="newCat"><option value="document">Document</option><option value="workbook">Workbook</option><option value="packet">Packet</option></select></div>';
  html += '<div class="add-row"><label>Label:</label><input type="text" id="newLabel" placeholder="e.g. Week 13 - Bonus Session"></div>';
  html += '<button class="btn btn-wire" style="margin-top:8px" onclick="addNew()">Add</button>';
  html += '</div>';

  // JavaScript
  html += '<script>';
  html += 'var wireCategory="",wireLabel="";';

  html += 'function showToast(msg,color){var t=document.getElementById("toast");t.textContent=msg;t.style.background=color||"#28a745";t.style.display="block";setTimeout(function(){t.style.display="none"},3000);}';

  html += 'function startWire(cat,label){wireCategory=cat;wireLabel=label;document.getElementById("searchTitle").textContent="Search for: "+label;document.getElementById("searchInput").value=label.replace(/^Week \\d+ - /,"");document.getElementById("searchResults").innerHTML="";document.getElementById("searchPanel").style.display="block";document.getElementById("searchInput").focus();}';

  html += 'function doSearch(){var q=document.getElementById("searchInput").value;if(!q)return;document.getElementById("searchResults").innerHTML="Searching...";google.script.run.withSuccessHandler(showResults).withFailureHandler(function(e){document.getElementById("searchResults").innerHTML="Error: "+e.message;}).searchDriveForTemplate(q);}';

  html += 'function showResults(results){var div=document.getElementById("searchResults");if(!results||results.length===0){div.innerHTML="No documents found. Try a different search term.";return;}div.innerHTML="";for(var i=0;i<results.length;i++){var r=results[i];var el=document.createElement("div");el.className="result";el.innerHTML=\'<div class="result-name">\'+r.name+\'</div><div class="result-id">ID: \'+r.id+\'</div>\';el.onclick=(function(id,name){return function(){confirmWire(id,name)};})(r.id,r.name);div.appendChild(el);}}';

  html += 'function confirmWire(id,name){if(!confirm("Wire \\\""+name+"\\\" as the template for \\\""+wireLabel+"\\\"?")){return;}google.script.run.withSuccessHandler(function(res){if(res.success){showToast(wireLabel+" template wired!");document.getElementById("searchPanel").style.display="none";setTimeout(function(){google.script.host.close();showManageTemplatesDialog();},1500);}}).withFailureHandler(function(e){showToast("Error: "+e.message,"#dc3545");}).wireTemplate(wireCategory,wireLabel,id);}';

  html += 'function editField(cat,cell,currentName){var newName=prompt("Rename field "+cell+" (currently: "+currentName+"):",currentName);if(!newName||newName===currentName)return;google.script.run.withSuccessHandler(function(res){if(res.success){showToast(cell+" renamed to "+newName);setTimeout(function(){google.script.host.close();showManageTemplatesDialog();},1500);}}).withFailureHandler(function(e){showToast("Error: "+e.message,"#dc3545");}).wireTemplate(cat,cell,newName);}';

  html += 'function showAddPanel(){document.getElementById("addPanel").style.display="block";}';

  html += 'function addNew(){var cat=document.getElementById("newCat").value;var label=document.getElementById("newLabel").value.trim();if(!label){showToast("Enter a label","#dc3545");return;}google.script.run.withSuccessHandler(function(res){if(res.success){showToast(label+" added! Click Wire to connect it.");setTimeout(function(){google.script.host.close();showManageTemplatesDialog();},1500);}else{showToast(res.error,"#dc3545");}}).withFailureHandler(function(e){showToast("Error: "+e.message,"#dc3545");}).addTemplateType(cat,label);}';

  html += '</script>';

  var output = HtmlService.createHtmlOutput(html)
    .setWidth(420)
    .setHeight(550);
  SpreadsheetApp.getUi().showModalDialog(output, 'Manage Templates');
}


/****************************************************************************************
 MENU BAR
****************************************************************************************/
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Doula Tools")
    .addItem("New Client", "newClientSetup")
    .addItem("Open Sidebar", "openDoulaSidebar")
    .addSeparator()
    .addItem("Manage Templates", "showManageTemplatesDialog")
    .addItem("Mark Client Complete", "markClientCompleteMenu")
    .addSeparator()
    .addItem("Open Budget", "backend_openBudgetSheet")
    .addItem("Refresh Leads", "refreshLeads")
    .addItem("Refresh Dashboard", "refreshDoulaDashboard")
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu("Past Clients")
      .addItem("Send Offer to All Past Clients", "menuSendPastClientOfferAll")
      .addItem("Send Offer to One Email", "menuSendPastClientOfferOne"))
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu("Setup")
      .addItem("Create Template Registry", "setupTemplateRegistry")
      .addItem("Configure Settings", "setupEmeraldConfig")
      .addItem("Create Past Clients Sheet", "ensurePastClientsSheet")
      .addItem("Create Opt-In Form", "setupOptInForm")
      .addItem("Create Website Inquiry Form", "setupWebsiteInquiryForm")
      .addItem("Install Form Triggers", "installFormTriggers"))
    .addToUi();
}

function openDoulaSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("Doula Tools")
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}


/****************************************************************************************
 NEW CLIENT SETUP
****************************************************************************************/
function newClientSetup() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const namePrompt = ui.prompt("New Client", "Enter the client's name:", ui.ButtonSet.OK_CANCEL);
  if (namePrompt.getSelectedButton() !== ui.Button.OK) return;
  const clientName = namePrompt.getResponseText().trim();
  if (!clientName) return;

  const typePrompt = ui.prompt(
    "Client Type",
    "Enter client type:\n1 = Akashic\n2 = Counseling\n3 = Soul Emergence (12-Week)",
    ui.ButtonSet.OK_CANCEL
  );
  if (typePrompt.getSelectedButton() !== ui.Button.OK) return;

  const typeChoice = typePrompt.getResponseText().trim();
  let templateName;

  if (typeChoice === "1") templateName = "Akashic_Client_Template";
  else if (typeChoice === "2") templateName = "Counseling_Client_Template";
  else if (typeChoice === "3") templateName = "SoulEmergence_Client_Template";
  else {
    ui.alert("Invalid choice. Please enter 1, 2, or 3.");
    return;
  }

  const template = ss.getSheetByName(templateName);
  if (!template) {
    ui.alert(`Template "${templateName}" not found.`);
    return;
  }

  const parentFolder = DriveApp.getFolderById(TEMPLATE_ROOT);
  const clientFolder = parentFolder.createFolder(clientName + " Files");

  const tempCopy = template.copyTo(ss);
  const newSheetId = tempCopy.getSheetId();
  SpreadsheetApp.flush();
  const newSheet = ss.getSheets().find(s => s.getSheetId() === newSheetId);

  newSheet.setName(clientName);
  ss.setActiveSheet(newSheet);
  ss.moveActiveSheet(ss.getSheets().length);

  newSheet.getRange("B2").setValue(clientName);
  newSheet.getRange("B3").setValue("Active");
  newSheet.getRange("A12").setValue(clientFolder.getId());
  // B8 left alone — template has a formula there
  newSheet.getRange("B9").setValue(0);
  newSheet.getRange("E11").setValue("No");

  addToLeads(clientName, '');

  SpreadsheetApp.flush();
  ui.alert("Client created successfully.");
}


/****************************************************************************************
 ADD TO LEADS
****************************************************************************************/
function addToLeads(name, email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let leadsSheet = ss.getSheetByName("Leads");

  if (!leadsSheet) {
    leadsSheet = ss.insertSheet("Leads");
    leadsSheet.getRange("A1:C3").setValues([
      ["LEADS", "", ""],
      ["", "", ""],
      ["Name", "Date", "Email"]
    ]);
    leadsSheet.getRange("A1").setFontSize(16).setFontWeight("bold");
    leadsSheet.getRange("A3:C3").setFontWeight("bold").setBackground("#1a1a2e").setFontColor("#f5f0e8");
  }

  const lastRow = leadsSheet.getLastRow();
  if (lastRow >= 4) {
    const data = leadsSheet.getRange(4, 1, lastRow - 3, 3).getValues();
    const normalizedName = String(name).trim().toLowerCase();
    const normalizedEmail = email ? String(email).trim().toLowerCase() : '';

    for (let i = 0; i < data.length; i++) {
      const rowName = String(data[i][0]).trim().toLowerCase();
      const rowEmail = String(data[i][2]).trim().toLowerCase();

      // Exact email match — update date, skip
      if (normalizedEmail && rowEmail === normalizedEmail) {
        leadsSheet.getRange(4 + i, 2).setValue(new Date());
        return;
      }

      // Same name, row has no email — fill in the email + update date
      if (rowName === normalizedName && !rowEmail && normalizedEmail) {
        leadsSheet.getRange(4 + i, 2).setValue(new Date());
        leadsSheet.getRange(4 + i, 3).setValue(email);
        return;
      }

      // Same name, already has email — update date, skip duplicate
      if (rowName === normalizedName) {
        leadsSheet.getRange(4 + i, 2).setValue(new Date());
        return;
      }
    }
  }

  const nextRow = Math.max(leadsSheet.getLastRow() + 1, 4);
  leadsSheet.getRange(nextRow, 1).setValue(name);
  leadsSheet.getRange(nextRow, 2).setValue(new Date());
  leadsSheet.getRange(nextRow, 3).setValue(email);
}

function addToLeadsWithSource(name, email, source) {
  // Uses addToLeads — column B is always date now
  addToLeads(name, email);
}

function refreshLeads() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leadsSheet = ss.getSheetByName("Leads");
  if (!leadsSheet) {
    SpreadsheetApp.getUi().alert("Leads sheet not found.");
    return;
  }

  const systemSheets = ["Dashboard", "Akashic_Client_Template", "Counseling_Client_Template",
                         "SoulEmergence_Client_Template", "Email_Templates", "Intake Log", "Budget",
                         "Document Log", "Leads", "Past Clients"];

  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    if (systemSheets.includes(name)) return;

    const clientName = sh.getRange("B2").getValue();
    const clientEmail = sh.getRange("B4").getValue();
    if (clientName && clientEmail) {
      addToLeads(clientName, clientEmail);
    }
  });

  SpreadsheetApp.getUi().alert("Leads refreshed.");
}


/****************************************************************************************
 PAST CLIENTS SHEET
****************************************************************************************/
function ensurePastClientsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Past Clients");

  if (!sheet) {
    sheet = ss.insertSheet("Past Clients");
    sheet.getRange("A1:B1").setValues([["Name", "Email"]]);
    sheet.getRange("A1:B1").setFontWeight("bold").setBackground("#1a1a2e").setFontColor("#f5f0e8");
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 280);
    SpreadsheetApp.getUi().alert("Past Clients sheet created.");
  } else {
    SpreadsheetApp.getUi().alert("Past Clients sheet already exists.");
  }

  return sheet;
}

function addToPastClients(name, email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Past Clients");
  if (!sheet) sheet = ensurePastClientsSheet();

  if (email) {
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const existingEmails = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
      const normalizedEmail = String(email).trim().toLowerCase();
      if (existingEmails.some(e => String(e).trim().toLowerCase() === normalizedEmail)) {
        return;
      }
    }
  }

  const nextRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(nextRow, 1).setValue(name);
  sheet.getRange(nextRow, 2).setValue(email);
}


/****************************************************************************************
 MARK CLIENT COMPLETE
****************************************************************************************/
function markClientCompleteMenu() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActiveSheet();

  const clientName = sh.getRange('B2').getValue();
  const clientEmail = sh.getRange('B4').getValue();

  if (!clientName) {
    ui.alert('No client found on this sheet.');
    return;
  }

  const response = ui.alert(
    'Mark Client Complete',
    `Mark ${clientName} as complete?\n\nThis will:\n• Set status to Complete\n• Add them to Past Clients list`,
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    sh.getRange('B3').setValue('Complete');
    addToPastClients(clientName, clientEmail);
    ui.alert(`${clientName} marked complete and added to Past Clients.`);
  }
}


/****************************************************************************************
 SEND PAST CLIENT OFFER
****************************************************************************************/
function backend_sendPastClientOfferAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const templateSheet = ss.getSheetByName("Email_Templates");
  if (!templateSheet) throw new Error("Email_Templates sheet not found");

  const names   = templateSheet.getRange("A2:A").getValues().flat();
  const bodies  = templateSheet.getRange("B2:B").getValues().flat();
  const actives = templateSheet.getRange("C2:C").getValues().flat();

  let htmlBody = null;

  for (let i = 0; i < names.length; i++) {
    if (
      String(names[i]).trim() === "Past Client Offer" &&
      String(actives[i]).trim().toLowerCase() === "yes"
    ) {
      htmlBody = String(bodies[i] || "").trim();
      break;
    }
  }

  if (!htmlBody) throw new Error("No active 'Past Client Offer' template found in Email_Templates");

  const pastSheet = ss.getSheetByName("Past Clients");
  if (!pastSheet) throw new Error("Past Clients sheet not found. Run Setup > Create Past Clients Sheet.");

  const lastRow = pastSheet.getLastRow();
  if (lastRow < 2) throw new Error("No past clients found");

  const clients = pastSheet.getRange(2, 1, lastRow - 1, 2).getValues()
    .map(row => [String(row[0] || "").trim(), String(row[1] || "").trim()])
    .filter(row => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row[1]));

  if (clients.length === 0) throw new Error("No past clients with valid email addresses");

  const response = ui.alert(
    "Send Past Client Offer",
    `Send offer to ${clients.length} past client(s)?`,
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return 0;

  const optInUrl = getOptInFormUrl();

  let sent = 0;
  clients.forEach(([name, email]) => {
    let filledHtml = htmlBody
      .replace(/\{\{NAME\}\}/g, name)
      .replace(/\{\{CLIENT_NAME\}\}/g, name)
      .replace(/\{\{OPT_IN_LINK\}\}/g, optInUrl);

    GmailApp.sendEmail(email, "A Special Offer For You", "", { htmlBody: filledHtml });
    sent++;
  });

  ui.alert(`Past Client Offer sent to ${sent} contact(s).`);
  return sent;
}

function menuSendPastClientOfferAll() {
  try { backend_sendPastClientOfferAll(); }
  catch (e) { SpreadsheetApp.getUi().alert("Error: " + e.message); }
}

function backend_sendPastClientOfferOne() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const emailPrompt = ui.prompt("Send Past Client Offer", "Enter the recipient's email address:", ui.ButtonSet.OK_CANCEL);
  if (emailPrompt.getSelectedButton() !== ui.Button.OK) return;

  const email = emailPrompt.getResponseText().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    ui.alert("Invalid email address.");
    return;
  }

  const namePrompt = ui.prompt("Recipient Name", "Enter their name (for personalization):", ui.ButtonSet.OK_CANCEL);
  if (namePrompt.getSelectedButton() !== ui.Button.OK) return;
  const name = namePrompt.getResponseText().trim() || "Friend";

  const templateSheet = ss.getSheetByName("Email_Templates");
  if (!templateSheet) throw new Error("Email_Templates sheet not found");

  const names   = templateSheet.getRange("A2:A").getValues().flat();
  const bodies  = templateSheet.getRange("B2:B").getValues().flat();
  const actives = templateSheet.getRange("C2:C").getValues().flat();

  let htmlBody = null;

  for (let i = 0; i < names.length; i++) {
    if (
      String(names[i]).trim() === "Past Client Offer" &&
      String(actives[i]).trim().toLowerCase() === "yes"
    ) {
      htmlBody = String(bodies[i] || "").trim();
      break;
    }
  }

  if (!htmlBody) throw new Error("No active 'Past Client Offer' template found");

  const optInUrl = getOptInFormUrl();

  let filledHtml = htmlBody
    .replace(/\{\{NAME\}\}/g, name)
    .replace(/\{\{CLIENT_NAME\}\}/g, name)
    .replace(/\{\{OPT_IN_LINK\}\}/g, optInUrl);

  GmailApp.sendEmail(email, "A Special Offer For You", "", { htmlBody: filledHtml });
  ui.alert(`Offer sent to ${email}`);
}

function menuSendPastClientOfferOne() {
  try { backend_sendPastClientOfferOne(); }
  catch (e) { SpreadsheetApp.getUi().alert("Error: " + e.message); }
}


/****************************************************************************************
 OPT-IN FORM SETUP
****************************************************************************************/
function setupOptInForm() {
  const ui = SpreadsheetApp.getUi();

  const form = FormApp.create("Awakening Doula - Newsletter Opt-In");
  form.setDescription("Yes! I'd like to receive updates, insights, and special offers from Awakening Doula.");
  form.setConfirmationMessage("Thank you! You've been added to our mailing list. Welcome to the community.");

  form.addTextItem().setTitle("Your Name").setRequired(true);
  form.addTextItem().setTitle("Your Email").setRequired(true);

  const formId = form.getId();
  const formUrl = form.getPublishedUrl();

  PropertiesService.getScriptProperties().setProperty("OPT_IN_FORM_ID", formId);

  ui.alert(
    "Opt-In Form Created!\n\n" +
    "Form ID: " + formId + "\n" +
    "Published URL: " + formUrl + "\n\n" +
    "Now run Setup > Install Form Triggers to activate auto-processing.\n\n" +
    "Use {{OPT_IN_LINK}} in your Past Client Offer email template to include this link."
  );

  return formId;
}

function getOptInFormUrl() {
  const formId = PropertiesService.getScriptProperties().getProperty("OPT_IN_FORM_ID");
  if (!formId) return "[Opt-in form not yet created - run Setup > Create Opt-In Form]";

  try {
    return FormApp.openById(formId).getPublishedUrl();
  } catch (e) {
    return "[Opt-in form link unavailable]";
  }
}


/****************************************************************************************
 WEBSITE INQUIRY FORM SETUP
****************************************************************************************/
function setupWebsiteInquiryForm() {
  const ui = SpreadsheetApp.getUi();

  const form = FormApp.create("Awakening Doula - Get In Touch");
  form.setDescription("I'd love to hear from you. Fill out the form below and I'll be in touch soon.");
  form.setConfirmationMessage("Thank you for reaching out! I'll get back to you shortly.");

  form.addTextItem().setTitle("Your Name").setRequired(true);
  form.addTextItem().setTitle("Your Email").setRequired(true);
  form.addParagraphTextItem().setTitle("How can I help you?").setRequired(false);

  const formId = form.getId();
  const formUrl = form.getPublishedUrl();

  PropertiesService.getScriptProperties().setProperty("INQUIRY_FORM_ID", formId);

  ui.alert(
    "Website Inquiry Form Created!\n\n" +
    "Form ID: " + formId + "\n" +
    "Published URL: " + formUrl + "\n\n" +
    "Embed this URL on your website.\n" +
    "Now run Setup > Install Form Triggers to activate auto-processing."
  );

  return formId;
}


/****************************************************************************************
 FORM TRIGGERS
****************************************************************************************/
function installFormTriggers() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "onOptInFormSubmit" ||
        t.getHandlerFunction() === "onInquiryFormSubmit") {
      ScriptApp.deleteTrigger(t);
    }
  });

  let installed = [];

  const optInId = props.getProperty("OPT_IN_FORM_ID");
  if (optInId) {
    ScriptApp.newTrigger("onOptInFormSubmit").forForm(optInId).onFormSubmit().create();
    installed.push("Opt-In Form");
  }

  const inquiryId = props.getProperty("INQUIRY_FORM_ID");
  if (inquiryId) {
    ScriptApp.newTrigger("onInquiryFormSubmit").forForm(inquiryId).onFormSubmit().create();
    installed.push("Website Inquiry Form");
  }

  if (installed.length === 0) {
    ui.alert("No forms found. Please create forms first using the Setup menu.");
  } else {
    ui.alert("Triggers installed for: " + installed.join(", "));
  }
}

function onOptInFormSubmit(e) {
  const responses = e.response.getItemResponses();
  let name = "", email = "";

  responses.forEach(r => {
    const title = r.getItem().getTitle().toLowerCase();
    if (title.includes("name")) name = r.getResponse();
    if (title.includes("email")) email = r.getResponse();
  });

  if (email) {
    addToLeadsWithSource(name, email, "Newsletter Opt-In");
    sendNewsletterToOne(name, email);
  }
}

function onInquiryFormSubmit(e) {
  const responses = e.response.getItemResponses();
  let name = "", email = "", message = "";

  responses.forEach(r => {
    const title = r.getItem().getTitle().toLowerCase();
    if (title.includes("name")) name = r.getResponse();
    else if (title.includes("email")) email = r.getResponse();
    else if (title.includes("help")) message = r.getResponse();
  });

  if (email) {
    addToLeadsWithSource(name, email, "Website Inquiry");
    sendWelcomeEmail(name, email);
    notifyPractitioner(name, email, message);
  }
}

function notifyPractitioner(name, email, message) {
  try {
    const practitionerEmail = Session.getEffectiveUser().getEmail();
    const subject = "New Inquiry from " + (name || "someone on your website");
    const body = "You have a new inquiry from your website.\n\n" +
      "Name: " + (name || "(not provided)") + "\n" +
      "Email: " + (email || "(not provided)") + "\n" +
      (message ? "Message: " + message + "\n" : "") +
      "\nThey've been added to your Leads sheet and sent a welcome email.";

    GmailApp.sendEmail(practitionerEmail, subject, body);
  } catch (e) {
    Logger.log("notifyPractitioner error: " + e.message);
  }
}

function sendWelcomeEmail(name, email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = ss.getSheetByName("Email_Templates");

  let htmlBody = null;

  if (templateSheet) {
    const names   = templateSheet.getRange("A2:A").getValues().flat();
    const bodies  = templateSheet.getRange("B2:B").getValues().flat();
    const actives = templateSheet.getRange("C2:C").getValues().flat();

    for (let i = 0; i < names.length; i++) {
      if (String(names[i]).trim() === "Welcome" && String(actives[i]).trim().toLowerCase() === "yes") {
        htmlBody = String(bodies[i] || "").trim();
        break;
      }
    }
  }

  if (!htmlBody) {
    htmlBody = `<p>Hi {{NAME}},</p>
<p>Thank you for reaching out to Awakening Doula! I received your message and will get back to you shortly.</p>
<p>In the meantime, feel free to reply to this email if you have any questions.</p>
<p>With love and respect,<br>Carlie Wyton, MA<br>Awakening Doula<br>www.awakening-doula.com</p>`;
  }

  htmlBody = htmlBody
    .replace(/\{\{NAME\}\}/g, name || "Friend")
    .replace(/\{\{CLIENT_NAME\}\}/g, name || "Friend");

  GmailApp.sendEmail(email, "Thank You For Reaching Out - Awakening Doula", "", { htmlBody: htmlBody });
}


/****************************************************************************************
 GET CLIENT TYPE
****************************************************************************************/
function getClientType(sheet) {
  const typeCell = sheet.getRange("D3").getValue();
  if (!typeCell) return null;

  const type = String(typeCell).toLowerCase();
  if (type.includes("akashic")) return "Akashic";
  if (type.includes("counseling") || type.includes("counselling")) return "Counseling";
  if (type.includes("soul") || type.includes("emergence") || type.includes("12") || type.includes("twelve") || type.includes("week")) return "Soul Emergence";
  return null;
}


/****************************************************************************************
 UNIFIED DOCUMENT GENERATION ENGINE
****************************************************************************************/
function backend_generateDoulaDoc(docType) {
  const sh = SpreadsheetApp.getActiveSheet();
  const clientName = sh.getRange("B2").getValue();
  const folderId = sh.getRange("A12").getValue();
  const clientType = getClientType(sh);

  if (!folderId) throw new Error("Client folder missing in A12.");

  const folder = DriveApp.getFolderById(folderId);
  const templateId = getTemplateForDocType(docType);

  if (!templateId || templateId.includes("YOUR_")) throw new Error("No template found for: " + docType);

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMM d, yyyy");
  const docName = `${docType} - ${clientName} - ${today}`;

  const newDoc = DriveApp.getFileById(templateId).makeCopy(docName, folder);
  const doc = DocumentApp.openById(newDoc.getId());
  const body = doc.getBody();

  const map = buildPlaceholderMap(sh, clientType, docType);

  Object.keys(map).forEach(key => {
    body.replaceText(key.replace(/[{}]/g, '\\$&'), map[key] || '');
  });

  doc.saveAndClose();
  logDoulaDoc(sh, docType, newDoc.getUrl());

  return true;
}

function getTemplateForDocType(docType) {
  // Registry-first lookup, falls back to hard-coded constants
  var registryId = getTemplateIdFromRegistry('document', docType);
  if (registryId) return registryId;

  const map = {
    "Session Notes": TEMPLATE_SESSION_NOTES,
    "Integration Guide": TEMPLATE_INTEGRATION,
    "Client Summary": TEMPLATE_SUMMARY,
    "Counseling Notes": TEMPLATE_COUNSELLING,
    "Client Homework": TEMPLATE_CLIENT_HOMEWORK,
    "Breathwork Notes": TEMPLATE_BREATHWORK,
    "Akashic Notes": TEMPLATE_AKASHIC,
    "Soul Emergence Summary": TEMPLATE_SOUL_EMERGENCE_SUMMARY
  };
  return map[docType] || null;
}


/****************************************************************************************
 SOUL EMERGENCE - WORKBOOK SYSTEM
 Copies workbook to client folder AND emails it to the client
****************************************************************************************/
function backend_sendWorkbook(weekNumber) {
  const sh = SpreadsheetApp.getActiveSheet();
  const clientName = sh.getRange("B2").getValue();
  const clientEmail = sh.getRange("B4").getValue();
  const folderId = sh.getRange("A12").getValue();
  const clientType = getClientType(sh);

  if (clientType !== "Soul Emergence") {
    throw new Error("Workbooks are only available for Soul Emergence clients.");
  }

  if (!clientName || !clientEmail || !folderId) {
    throw new Error("Missing client name, email, or folder ID.");
  }

  // Dynamic session names from registry
  var sessionInfo = getSessionNamesFromRegistry();
  var sessionName = sessionInfo.names[weekNumber];
  if (!sessionName) throw new Error('Week ' + weekNumber + ' is not defined in the program.');

  // Registry-first lookup, falls back to hard-coded constants
  var registryLabel = 'Week ' + weekNumber + ' - ' + sessionName;
  var templateId = getTemplateIdFromRegistry('workbook', registryLabel) || WORKBOOK_TEMPLATES[weekNumber];
  if (!templateId || templateId.includes("YOUR_")) {
    throw new Error('Workbook template for Week ' + weekNumber + ' not yet configured. Go to Doula Tools > Manage Templates to wire it.');
  }
  const folder = DriveApp.getFolderById(folderId);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMM d, yyyy");
  const docName = `Week ${weekNumber} Workbook - ${sessionName} - ${clientName}`;

  // Copy to client folder
  const newFile = DriveApp.getFileById(templateId).makeCopy(docName, folder);
  const doc = DocumentApp.openById(newFile.getId());
  const body = doc.getBody();

  // Replace placeholders
  body.replaceText("\\{\\{CLIENT_NAME\\}\\}", clientName);
  body.replaceText("\\{\\{NAME\\}\\}", clientName);
  body.replaceText("\\{\\{WEEK_NUMBER\\}\\}", String(weekNumber));
  body.replaceText("\\{\\{SESSION_NAME\\}\\}", sessionName);
  body.replaceText("\\{\\{TODAY\\}\\}", today);

  doc.saveAndClose();

  // Email to client with PDF attachment
  const fileBlob = newFile.getAs(MimeType.PDF);

  const emailBody = `<p>Hi ${clientName},</p>
<p>Here is your <strong>Week ${weekNumber}: ${sessionName}</strong> workbook for Soul Emergence.</p>
<p>Please review it before our session. You can also access the editable version in your Google Drive folder.</p>
<p>With love and respect,<br>Carlie Wyton, MA<br>Awakening Doula</p>`;

  GmailApp.sendEmail(clientEmail, `Soul Emergence - Week ${weekNumber}: ${sessionName} Workbook`, "", {
    htmlBody: emailBody,
    attachments: [fileBlob],
    name: "Awakening Doula"
  });

  // Share editable doc with client
  newFile.addEditor(clientEmail);

  // Log it
  logDoulaDoc(sh, `Week ${weekNumber} Workbook`, newFile.getUrl());

  // Update sessions used if this is a new high
  const currentUsed = sh.getRange("B9").getValue() || 0;
  if (weekNumber > currentUsed) {
    sh.getRange("B9").setValue(weekNumber);
  }

  return true;
}

function getCurrentWeek(sheet) {
  var sessionsUsed = sheet.getRange("B9").getValue() || 0;
  var sessionInfo = getSessionNamesFromRegistry();
  var currentWeek = Math.min(Math.max(Math.ceil(sessionsUsed), 1), sessionInfo.count);
  sheet.getRange("F1").setValue(currentWeek);
  return currentWeek;
}

function getSessionNamesForSidebar() {
  return SESSION_NAMES;
}


/****************************************************************************************
 PLACEHOLDER MAP BUILDER
****************************************************************************************/
function buildPlaceholderMap(sh, clientType, docType) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMM d, yyyy");

  let map = {
    "{{CLIENT_NAME}}": sh.getRange("B2").getValue(),
    "{{STATUS}}": sh.getRange("B3").getValue(),
    "{{EMAIL}}": sh.getRange("B4").getValue(),
    "{{PHONE}}": sh.getRange("B5").getValue(),
    "{{SERVICE_TYPE}}": sh.getRange("B6").getValue(),
    "{{PACKAGE_TYPE}}": sh.getRange("B7").getValue(),
    "{{SESSIONS_TOTAL}}": sh.getRange("B8").getValue(),
    "{{SESSIONS_USED}}": sh.getRange("B9").getValue(),
    "{{NEXT_SESSION}}": sh.getRange("B10").getValue(),
    "{{SESSION_PRICE}}": sh.getRange("B11").getValue(),
    "{{TODAY}}": today
  };

  if (clientType === "Akashic") {
    Object.assign(map, getAkashicFields(sh));
  } else if (clientType === "Counseling") {
    Object.assign(map, getCounselingFields(sh));
  } else if (clientType === "Soul Emergence") {
    Object.assign(map, getSoulEmergenceFields(sh));
  }

  return map;
}

function getAkashicFields(sh) {
  return {
    "{{THEMES}}": sh.getRange("B13").getValue(),
    "{{SOUL_MESSAGES}}": sh.getRange("B14").getValue(),
    "{{BLOCKS}}": sh.getRange("B15").getValue(),
    "{{OPENINGS}}": sh.getRange("B16").getValue(),
    "{{PAST_LIFE_NOTES}}": sh.getRange("B17").getValue(),
    "{{BREATH_INSIGHTS}}": sh.getRange("B20").getValue(),
    "{{BODY_FEEDBACK}}": sh.getRange("B21").getValue(),
    "{{BREATH_ENERGY}}": sh.getRange("B22").getValue(),
    "{{REGULATION}}": sh.getRange("B25").getValue(),
    "{{TRIGGERS}}": sh.getRange("B26").getValue(),
    "{{SOOTHING}}": sh.getRange("B27").getValue(),
    "{{ROUTINE}}": sh.getRange("B28").getValue(),
    "{{NERVOUS_ENERGY}}": sh.getRange("B29").getValue(),
    "{{SESSION_NOTES}}": sh.getRange("B31").getValue(),
    "{{INSIGHT_DOWNLOADS}}": sh.getRange("B32").getValue(),
    "{{INTEGRATION_TASKS}}": sh.getRange("B33").getValue(),
    "{{COMPLETION_NOTES}}": sh.getRange("B36").getValue(),
    "{{COMPLETION_DATE}}": sh.getRange("B37").getValue()
  };
}

function getCounselingFields(sh) {
  const counselingNotesRange = sh.getRange("A13:A22").getValues();
  const counselingNotes = counselingNotesRange.map(row => row[0]).filter(String).join("\n");

  return {
    "{{COUNSELING_NOTES}}": counselingNotes,
    "{{FOCUS_THEMES}}": sh.getRange("B14").getValue(),
    "{{INSIGHT_DOWNLOADS}}": sh.getRange("B15").getValue(),
    "{{EMOTIONAL_LANDSCAPE}}": sh.getRange("B16").getValue(),
    "{{SPIRITUAL_LANDSCAPE}}": sh.getRange("B17").getValue(),
    "{{COGNITIVE_RELATIONAL}}": sh.getRange("B18").getValue(),
    "{{BEHAVIOURAL_PATTERNS}}": sh.getRange("B19").getValue(),
    "{{PRACTICES_ASSIGNED}}": sh.getRange("B20").getValue(),
    "{{PATHWAY_NOTES}}": sh.getRange("B21").getValue(),
    "{{COMPLETION_NOTES}}": sh.getRange("B22").getValue()
  };
}

/**
 * Soul Emergence fields - one row per week for session notes
 * Layout: Row 13 = Week 1 notes, Row 14 = Week 2 notes, ... Row 24 = Week 12 notes
 * Row 25 = Final Summary
 */
function getSoulEmergenceFields(sh) {
  var currentWeek = getCurrentWeek(sh);
  var sessionInfo = getSessionNamesFromRegistry();
  var names = sessionInfo.names;
  var count = sessionInfo.count;

  var map = {
    "{{CURRENT_WEEK}}": currentWeek,
    "{{CURRENT_SESSION_NAME}}": names[currentWeek] || "",
    "{{FINAL_SUMMARY}}": sh.getRange("B25").getValue()
  };

  for (var week = 1; week <= count; week++) {
    var row = 12 + week;
    map["{{WEEK_" + week + "_NOTES}}"] = sh.getRange(row, 2).getValue();
    map["{{WEEK_" + week + "_NAME}}"] = names[week] || "";
  }

  return map;
}


/****************************************************************************************
 DOCUMENT LOG
****************************************************************************************/
function logDoulaDoc(sheet, type, url) {
  const lastRow = sheet.getLastRow();
  const nextRow = lastRow < 105 ? 106 : lastRow + 1;

  sheet.getRange(nextRow, 1).setValue(type);
  sheet.getRange(nextRow, 2).setValue(new Date());
  sheet.getRange(nextRow, 3).setValue(url);
}


/****************************************************************************************
 CLIENT LITERATURE
****************************************************************************************/
function backend_generateClientPacket(type) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const folderId = sheet.getRange("A12").getValue();
  const clientName = sheet.getRange("B2").getValue();
  const clientType = getClientType(sheet);

  // Registry-first lookup, falls back to hard-coded constants
  var templateId = getTemplateIdFromRegistry('packet', type) || CLIENT_LIT_TEMPLATES[type];
  if (!templateId || templateId.includes("YOUR_")) throw new Error('Template for "' + type + '" not yet configured. Go to Doula Tools > Manage Templates to wire it.');

  const folder = DriveApp.getFolderById(folderId);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMM d, yyyy");
  const docName = `${type} - ${clientName} - ${today}`;

  const newDoc = DriveApp.getFileById(templateId).makeCopy(docName, folder);
  const doc = DocumentApp.openById(newDoc.getId());
  const body = doc.getBody();

  const map = buildPlaceholderMap(sheet, clientType, type);

  Object.keys(map).forEach(key => {
    body.replaceText(key.replace(/[{}]/g, '\\$&'), map[key] || '');
  });

  doc.saveAndClose();
  logDoulaDoc(sheet, type, newDoc.getUrl());

  return true;
}


/****************************************************************************************
 ONBOARDING
****************************************************************************************/
function sendOnboardingEmail() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();

  const statusCell = sh.getRange('D7');
  if (statusCell.getValue() !== 'Not Sent') {
    SpreadsheetApp.getUi().alert('Onboarding already sent or in progress.');
    return;
  }

  const clientEmail = String(sh.getRange('B4').getValue()).trim();
  if (!clientEmail) {
    SpreadsheetApp.getUi().alert('Client email is missing.');
    return;
  }

  const formUrl = FormApp.openById(INTAKE_FORM_ID).getPublishedUrl();
  const subject = 'Awakening Doula - Intake Form';
  const body = 'Hi,\n\nPlease complete the intake form prior to our first session using the link below.\n\n' + formUrl + '\n\nWith love and respect,\nCarlie Wyton, MA\nAwakening Doula';

  GmailApp.sendEmail(clientEmail, subject, body);
  statusCell.setValue('Sent');
  SpreadsheetApp.getUi().alert('Onboarding email sent.');
}

function checkIntakeStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  const clientEmail = String(sh.getRange('B4').getValue()).trim().toLowerCase();
  const statusCell = sh.getRange('D7');

  if (!clientEmail) {
    SpreadsheetApp.getUi().alert('Client email is missing.');
    return;
  }

  if (statusCell.getValue() !== 'Sent') {
    SpreadsheetApp.getUi().alert('Intake not in Sent state.');
    return;
  }

  const form = FormApp.openById(INTAKE_FORM_ID);
  const responses = form.getResponses();
  let found = false;

  responses.some(r =>
    r.getItemResponses().some(ir => {
      // Only match on the email field, not every field in the form
      if (ir.getItem().getTitle().toLowerCase().includes('email') &&
          String(ir.getResponse()).trim().toLowerCase() === clientEmail) {
        found = true;
        return true;
      }
      return false;
    })
  );

  if (found) {
    statusCell.setValue('Response Received');
    SpreadsheetApp.getUi().alert('Intake response found.');
  } else {
    SpreadsheetApp.getUi().alert('No intake response yet.');
  }
}

function createIntakeDoc() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();

  if (sh.getRange('D7').getValue() !== 'Response Received') {
    SpreadsheetApp.getUi().alert('Intake not confirmed.');
    return;
  }

  const clientEmail = String(sh.getRange('B4').getValue()).trim().toLowerCase();
  const clientFolderId = sh.getRange('A12').getValue();

  if (!clientEmail || !clientFolderId) {
    SpreadsheetApp.getUi().alert('Missing email or client folder.');
    return;
  }

  const form = FormApp.openById(INTAKE_FORM_ID);
  const responses = form.getResponses();
  let matched = null;

  responses.some(r =>
    r.getItemResponses().some(ir => {
      // Only match on the email field, not every field in the form
      if (ir.getItem().getTitle().toLowerCase().includes('email') &&
          String(ir.getResponse()).trim().toLowerCase() === clientEmail) {
        matched = r;
        return true;
      }
      return false;
    })
  );

  if (!matched) {
    SpreadsheetApp.getUi().alert('No matching response found.');
    return;
  }

  const map = {
    'Full name': 'FullName',
    'Preferred name': 'PreferredName',
    'Date of birth': 'DOB',
    'Email address': 'Email',
    'Phone number': 'Phone',
    'Emergency contact name': 'EmergencyName',
    'Emergency contact phone': 'EmergencyPhone',
    'Primary reason for seeking counseling': 'PrimaryReason',
    'When did these concerns begin': 'ConcernsBegin',
    'What symptoms are most problematic right now': 'ProblematicSymptoms',
    'What makes symptoms better or worse': 'SymptomTriggers',
    'Have you previously received mental health treatment': 'PriorTreatment',
    'If yes, type of prior mental health treatment': 'PriorTreatmentTypes',
    'Approximate dates of prior mental health treatment': 'PriorTreatmentDates',
    'Have you ever received a mental health diagnosis': 'HasDiagnosis',
    'If yes, select all that apply': 'DiagnosisList',
    'Are you currently taking psychiatric medication': 'CurrentMeds',
    'If yes, list current psychiatric medications including dose and prescriber': 'CurrentMedsList',
    'Have you taken psychiatric medications in the past': 'PastMeds',
    'If yes, which medications and why they were discontinued': 'PastMedsList',
    'Do you have any chronic medical conditions': 'ChronicConditions',
    'If yes, please list medical conditions': 'MedicalConditionsList',
    'Please list any current non-psychiatric medications': 'NonPsychMeds',
    'History of head injury, seizures, or neurological conditions': 'NeuroHistory',
    'If yes, please explain': 'NeuroExplanation',
    'Do you currently use any of the following substances': 'SubstanceUse',
    'Age of first substance use': 'SubstanceAge',
    'Frequency of current substance use': 'SubstanceFrequency',
    'Have you ever received treatment for substance use': 'SubstanceTreatment',
    'If yes, please describe': 'SubstanceTreatmentDescription',
    'Have you ever had thoughts of harming yourself': 'SelfHarmThoughts',
    'Have you ever attempted suicide or self-harm': 'SelfHarmAttempts',
    'Have you had thoughts of harming others': 'HarmOthersThoughts',
    'Have you experienced recent thoughts of suicide or self-harm': 'RecentSelfHarm',
    'Have you experienced trauma or abuse': 'TraumaHistory',
    'If yes, are these experiences impacting you currently': 'TraumaImpact',
    'What are your goals for therapy': 'TherapyGoals',
    'What would improvement look like for you': 'ImprovementVision',
    'I understand this intake does not replace medical or emergency care and that my therapist may follow up regarding safety concerns': 'Acknowledgement'
  };

  const data = {};
  matched.getItemResponses().forEach(ir => {
    const key = map[ir.getItem().getTitle()];
    if (key) {
      data[key] = Array.isArray(ir.getResponse())
        ? ir.getResponse().join(', ')
        : ir.getResponse();
    }
  });

  const clientFolder = DriveApp.getFolderById(clientFolderId);
  const copy = DriveApp.getFileById(INTAKE_TEMPLATE_ID).makeCopy('Intake – Clinical', clientFolder);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();

  Object.keys(data).forEach(k => {
    body.replaceText(`{{${k}}}`, data[k] || '');
  });

  doc.saveAndClose();

  const logSheet = ss.getSheetByName('Intake Log');
  if (logSheet) {
    const clientName = sh.getRange('B2').getValue();
    const nextRow = logSheet.getLastRow() < 1 ? 2 : logSheet.getLastRow() + 1;
    logSheet.getRange(nextRow, 1).setValue(clientName);
    logSheet.getRange(nextRow, 2).setValue(new Date());
    logSheet.getRange(nextRow, 3).setValue(copy.getUrl());
  }

  SpreadsheetApp.getUi().alert('Intake document created and logged.');
}


/****************************************************************************************
 SCHEDULING
****************************************************************************************/
function normalizeTime(input) {
  // Handle Date objects (Google Sheets returns Date for time-formatted cells)
  if (input instanceof Date && !isNaN(input.getTime())) {
    return { hours: input.getHours(), minutes: input.getMinutes() };
  }

  const str = String(input).trim().toLowerCase();
  const isPM = str.includes('pm');
  const isAM = str.includes('am');
  const clean = str.replace(/[ap]m/g, '').replace(/\s+/g, '').trim();

  if (clean.includes(':')) {
    let [h, m] = clean.split(':').map(s => parseInt(s));
    m = m || 0;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return { hours: h, minutes: m };
  }

  const num = parseInt(clean.replace(/\D/g, ''));

  if (num < 100) {
    let hours = num;
    if (isPM && hours < 12) hours += 12;
    else if (isAM && hours === 12) hours = 0;
    else if (!isPM && !isAM && hours < 7) hours += 12;
    return { hours, minutes: 0 };
  }

  const hoursStr = clean.length === 3 ? clean.substring(0, 1) : clean.substring(0, 2);
  const minutesStr = clean.length === 3 ? clean.substring(1) : clean.substring(2);

  let hours = parseInt(hoursStr);
  const minutes = parseInt(minutesStr);

  if (isPM && hours < 12) hours += 12;
  else if (isAM && hours === 12) hours = 0;
  else if (!isPM && !isAM && hours < 7) hours += 12;

  return { hours, minutes };
}

function validateTimeWindow(hours, minutes) {
  if (hours < 7 || hours > 18) return false;
  if (hours === 18 && minutes > 0) return false;
  return true;
}

function addNextSession() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();

  const clientName = sh.getRange('B2').getValue();
  const dateValue = sh.getRange('B10').getValue();
  const timeInput = sh.getRange('D10').getValue();

  if (!clientName || !dateValue || !timeInput) {
    SpreadsheetApp.getUi().alert('Client name, date, or time is missing.');
    return;
  }

  const time = normalizeTime(timeInput);
  if (!validateTimeWindow(time.hours, time.minutes)) {
    SpreadsheetApp.getUi().alert('Time must be between 7:00 AM and 6:00 PM.');
    return;
  }

  const startDate = new Date(dateValue);
  startDate.setHours(time.hours, time.minutes, 0, 0);

  var duration = parseInt(PropertiesService.getScriptProperties().getProperty('SESSION_DURATION_MINUTES') || '60');
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + duration);

  const calendar = CalendarApp.getDefaultCalendar();
  const event = calendar.createEvent(`Awakening Doula Session - ${clientName}`, startDate, endDate, {
    description: `Soul session with ${clientName}`
  });

  const eventId = event.getId();
  const nextRow = findNextStorageRow(sh);
  sh.getRange(nextRow, STORAGE_COLUMN).setValue(eventId);

  const timeStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a');
  SpreadsheetApp.getUi().alert(`Session created: ${timeStr}`);
}

function deleteSession() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  const clientName = sh.getRange('B2').getValue();

  if (!clientName) {
    ui.alert('Client name is missing.');
    return;
  }

  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const future = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));

  const events = calendar.getEvents(now, future).filter(e => e.getTitle().includes(clientName));

  if (events.length === 0) {
    ui.alert('No future sessions found for this client.');
    return;
  }

  const options = events.map((e, i) => {
    const dateStr = Utilities.formatDate(e.getStartTime(), Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a');
    return `${i + 1}. ${dateStr}`;
  }).join('\n');

  const response = ui.prompt('Delete Session', `Select session to delete:\n\n${options}\n\nEnter number:`, ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;

  const choice = parseInt(response.getResponseText()) - 1;
  if (isNaN(choice) || choice < 0 || choice >= events.length) {
    ui.alert('Invalid selection.');
    return;
  }

  const selectedEvent = events[choice];
  const eventId = selectedEvent.getId();
  selectedEvent.deleteEvent();
  removeEventIdFromStorage(sh, eventId);

  const dateStr = Utilities.formatDate(selectedEvent.getStartTime(), Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a');
  ui.alert(`Session deleted: ${dateStr}`);
}

function findNextStorageRow(sheet) {
  const values = sheet.getRange(STORAGE_START_ROW, STORAGE_COLUMN, 500, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (!values[i][0]) return STORAGE_START_ROW + i;
  }
  return STORAGE_START_ROW + values.length;
}

function removeEventIdFromStorage(sheet, eventId) {
  const values = sheet.getRange(STORAGE_START_ROW, STORAGE_COLUMN, 500, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === eventId) {
      sheet.getRange(STORAGE_START_ROW + i, STORAGE_COLUMN).clearContent();
      return;
    }
  }
}


/****************************************************************************************
 FINANCIAL
****************************************************************************************/
function recordClientPayment() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();

  const clientName = sh.getRange('B2').getValue();
  const clientType = sh.getRange('D3').getValue();
  const serviceType = sh.getRange('B6').getValue();
  const sessionPrice = sh.getRange('B11').getValue();

  if (!clientName) {
    ui.alert('Client name is missing.');
    return;
  }

  const response = ui.prompt('Record Payment', `Full session ($${sessionPrice}) or custom amount?\n\nEnter amount or press OK for full session:`, ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;

  let amount = response.getResponseText().trim();
  if (!amount) {
    amount = sessionPrice;
  } else {
    amount = parseFloat(amount.replace(/[^0-9.]/g, ''));
  }

  if (isNaN(amount)) {
    ui.alert('Invalid amount.');
    return;
  }

  let budgetSheet = ss.getSheetByName('Budget');
  if (!budgetSheet) {
    ui.alert('Budget sheet not found. Please create it first.');
    return;
  }

  const nextRow = budgetSheet.getLastRow() + 1;
  // Headers: Date | Client Name | Description | Category | Type | Amount | Notes
  budgetSheet.getRange(nextRow, 1, 1, 7).setValues([[
    new Date(),
    clientName,
    clientType,
    serviceType,
    'Income',
    amount,
    ''
  ]]);
  sh.getRange('E11').setValue('Yes');

  ui.alert(`Payment of $${amount} recorded for ${clientName}`);
}

function sendReceipt() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActiveSheet();

  const clientName = sh.getRange('B2').getValue();
  const clientEmail = sh.getRange('B4').getValue();
  const sessionPrice = sh.getRange('B11').getValue();

  if (!clientEmail) {
    ui.alert('Client email is missing.');
    return;
  }

  const subject = `Payment Receipt - Awakening Doula - ${clientName}`;
  const body = `Hi ${clientName},\n\nThank you for your payment of $${sessionPrice}.\n\nDate: ${new Date().toLocaleDateString()}\nAmount: $${sessionPrice}\n\nWith love and respect,\nCarlie Wyton, MA\nAwakening Doula`;

  GmailApp.sendEmail(clientEmail, subject, body);
  ui.alert('Receipt sent to ' + clientEmail);
}


/****************************************************************************************
 EMAIL TEMPLATES
****************************************************************************************/
function getEmailTemplateList() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName("Email_Templates");
  if (!sheet) return [];

  const data = sheet.getRange("A2:C").getValues();
  return data.filter(row => String(row[2]).trim().toLowerCase() === "yes" && row[0]).map(row => row[0]);
}

function backend_sendSalesEmailTemplate(templateName) {
  const ss = SpreadsheetApp.getActive();
  const templateSheet = ss.getSheetByName("Email_Templates");
  if (!templateSheet) throw new Error("Email_Templates sheet not found");

  const data = templateSheet.getRange("A2:C").getValues();
  const match = data.find(row => row[0] === templateName);
  if (!match) throw new Error("Template not found: " + templateName);

  const htmlBody = match[1];
  const activeSheet = SpreadsheetApp.getActiveSheet();
  const clientName = activeSheet.getRange("B2").getValue();
  const clientEmail = activeSheet.getRange("B4").getValue();
  if (!clientEmail) throw new Error("No email address found for this client");

  const journalId = activeSheet.getRange("E4").getValue();
  const journalLink = journalId
    ? `https://docs.google.com/document/d/${journalId}/edit`
    : "Journal not yet created";

  const placeholders = {
    "{{CLIENT_NAME}}": clientName,
    "{{NAME}}": clientName,
    "{{JOURNAL_LINK}}": journalLink
  };

  let filledHtml = htmlBody;
  Object.keys(placeholders).forEach(p => {
    filledHtml = filledHtml.replace(new RegExp(p.replace(/[{}]/g, '\\$&'), 'g'), placeholders[p]);
  });

  GmailApp.createDraft(clientEmail, templateName, "", { htmlBody: filledHtml });
  return true;
}


/****************************************************************************************
 NEWSLETTER - Send to all leads
****************************************************************************************/
function backend_sendNewsletterToAll() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();

  const templateSheet = ss.getSheetByName("Email_Templates");
  if (!templateSheet) throw new Error("Email_Templates sheet not found");

  const names   = templateSheet.getRange("A2:A").getValues().flat();
  const bodies  = templateSheet.getRange("B2:B").getValues().flat();
  const actives = templateSheet.getRange("C2:C").getValues().flat();

  let subject = null;
  let htmlBody = null;

  for (let i = 0; i < names.length; i++) {
    if (
      String(names[i]).trim() === "Newsletter" &&
      String(actives[i]).trim().toLowerCase() === "yes"
    ) {
      subject = "Awakening Doula - Newsletter";
      htmlBody = String(bodies[i] || "").trim();
      break;
    }
  }

  if (!subject) throw new Error("No active Newsletter template found");
  if (!htmlBody) throw new Error("Newsletter HTML body is empty");

  const leadsSheet = ss.getSheetByName("Leads");
  if (!leadsSheet) throw new Error("Leads sheet not found");

  const lastRow = leadsSheet.getLastRow();
  if (lastRow < 4) throw new Error("No leads found");

  const leads = leadsSheet
    .getRange(4, 1, lastRow - 3, 3)
    .getValues()
    .map(row => [
      String(row[0] || "").trim(),
      String(row[2] || "").trim()
    ])
    .filter(row => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row[1]));

  if (leads.length === 0) throw new Error("No valid email addresses found");

  const response = ui.alert(
    "Send Newsletter",
    `Send newsletter to ${leads.length} contacts?`,
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return 0;

  let sent = 0;

  leads.forEach(([name, email]) => {
    const filledHtml = htmlBody
      .replace(/\{\{NAME\}\}/g, name)
      .replace(/\{\{CLIENT_NAME\}\}/g, name);

    GmailApp.sendEmail(email, subject, "", { htmlBody: filledHtml });
    sent++;
  });

  ui.alert(`Newsletter sent to ${sent} contacts`);
  return sent;
}

function backend_previewNewsletter() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Email_Templates");
  if (!sheet) throw new Error("Email_Templates sheet not found");

  const names   = sheet.getRange("A2:A").getValues().flat();
  const bodies  = sheet.getRange("B2:B").getValues().flat();
  const actives = sheet.getRange("C2:C").getValues().flat();

  let htmlBody = null;

  for (let i = 0; i < names.length; i++) {
    if (
      String(names[i]).trim() === "Newsletter" &&
      String(actives[i]).trim().toLowerCase() === "yes"
    ) {
      htmlBody = String(bodies[i] || "").trim();
      break;
    }
  }

  if (!htmlBody) throw new Error("Newsletter template not found or empty");

  htmlBody = htmlBody
    .replace(/\{\{NAME\}\}/g, "Preview Reader")
    .replace(/\{\{CLIENT_NAME\}\}/g, "Preview Reader");

  const html = HtmlService.createHtmlOutput(htmlBody)
    .setWidth(720)
    .setHeight(800);

  SpreadsheetApp.getUi().showModalDialog(html, "Newsletter Preview");
}


/****************************************************************************************
 NEWSLETTER - Send to one person (used by opt-in form auto-send)
****************************************************************************************/
function sendNewsletterToOne(name, email) {
  try {
    const ss = SpreadsheetApp.getActive();
    const templateSheet = ss.getSheetByName("Email_Templates");
    if (!templateSheet) return;

    const names   = templateSheet.getRange("A2:A").getValues().flat();
    const bodies  = templateSheet.getRange("B2:B").getValues().flat();
    const actives = templateSheet.getRange("C2:C").getValues().flat();

    let htmlBody = null;

    for (let i = 0; i < names.length; i++) {
      if (
        String(names[i]).trim() === "Newsletter" &&
        String(actives[i]).trim().toLowerCase() === "yes"
      ) {
        htmlBody = String(bodies[i] || "").trim();
        break;
      }
    }

    if (!htmlBody) return; // No active newsletter — silently skip

    htmlBody = htmlBody
      .replace(/\{\{NAME\}\}/g, name || "Friend")
      .replace(/\{\{CLIENT_NAME\}\}/g, name || "Friend");

    GmailApp.sendEmail(email, "Awakening Doula - Newsletter", "", { htmlBody: htmlBody });
  } catch (e) {
    // Don't let newsletter failure break the opt-in flow
    Logger.log("sendNewsletterToOne error: " + e.message);
  }
}


/****************************************************************************************
 UTILITIES
****************************************************************************************/
function backend_openClientFolder() {
  const folderId = SpreadsheetApp.getActiveSheet().getRange("A12").getValue();
  if (!folderId) throw new Error("No folder ID found in A12.");
  return "https://drive.google.com/drive/folders/" + folderId;
}

function backend_openBudgetSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Budget");

  if (!sheet) {
    sheet = ss.insertSheet("Budget");
    sheet.getRange("A1:G1").setValues([["Date", "Client Name", "Description", "Category", "Type", "Amount", "Notes"]]);
  }

  ss.setActiveSheet(sheet);
  return true;
}

function refreshDoulaDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dash = ss.getSheetByName("Dashboard");
  if (!dash) return;

  dash.getRange("A6:I5000").clearContent();

  const rows = [];
  const systemSheets = ["Dashboard", "Akashic_Client_Template", "Counseling_Client_Template",
                         "SoulEmergence_Client_Template", "Email_Templates", "Intake Log", "Budget",
                         "Document Log", "Leads", "Past Clients"];

  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    if (systemSheets.includes(name)) return;

    const client = sh.getRange("B2").getValue();
    if (!client) return;

    const folderId = sh.getRange("A12").getValue();
    const folderLink = folderId ? `=HYPERLINK("https://drive.google.com/drive/folders/${folderId}", "Open")` : "";

    rows.push([
      client,
      sh.getRange("B6").getValue(),
      sh.getRange("B10").getValue(),
      sh.getRange("B9").getValue(),
      sh.getRange("B8").getValue(),
      sh.getRange("B12").getValue(),
      sh.getRange("B3").getValue(),
      `=HYPERLINK("#gid=${sh.getSheetId()}", "Open")`,
      folderLink
    ]);
  });

  if (rows.length > 0) {
    dash.getRange(6, 1, rows.length, 9).setValues(rows);
  }
}

function getClientTypeForSidebar() {
  const sh = SpreadsheetApp.getActiveSheet();
  return getClientType(sh);
}


/****************************************************************************************
 PRIVATE JOURNAL (Soul Emergence Clients Only)
****************************************************************************************/
function createPrivateJournal() {
  const sh = SpreadsheetApp.getActiveSheet();
  const clientType = getClientType(sh);

  if (clientType !== "Soul Emergence") {
    SpreadsheetApp.getUi().alert('Journals are only available for Soul Emergence clients.');
    return;
  }

  const clientName = sh.getRange('B2').getValue();
  const clientEmail = sh.getRange('B4').getValue();
  const folderId = sh.getRange('A12').getValue();

  if (!clientName || !clientEmail || !folderId) {
    SpreadsheetApp.getUi().alert('Missing client name, email, or folder.');
    return;
  }

  const existingJournalId = sh.getRange(JOURNAL_DOC_CELL).getValue();
  if (existingJournalId) {
    SpreadsheetApp.getUi().alert('Journal already exists for this client. Use "Open Journal" to access it.');
    return;
  }

  const folder = DriveApp.getFolderById(folderId);
  const copy = DriveApp.getFileById(JOURNAL_TEMPLATE_ID).makeCopy(`Private Journal - ${clientName}`, folder);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM d, yyyy');
  const practitionerEmail = Session.getActiveUser().getEmail();

  body.replaceText('{{ClientName}}', clientName);
  body.replaceText('{{PractitionerName}}', practitionerEmail);
  body.replaceText('{{StartDate}}', today);

  doc.saveAndClose();
  copy.addEditor(clientEmail);
  copy.addEditor(practitionerEmail);
  sh.getRange(JOURNAL_DOC_CELL).setValue(copy.getId());

  SpreadsheetApp.getUi().alert(`Private journal created and shared with ${clientEmail}`);
}

function openJournal() {
  const sh = SpreadsheetApp.getActiveSheet();
  const clientType = getClientType(sh);

  if (clientType !== "Soul Emergence") {
    SpreadsheetApp.getUi().alert('Journals are only available for Soul Emergence clients.');
    return;
  }

  const journalId = sh.getRange(JOURNAL_DOC_CELL).getValue();

  if (!journalId) {
    SpreadsheetApp.getUi().alert('No journal found. Create one first using "Create Journal".');
    return;
  }

  const url = `https://docs.google.com/document/d/${journalId}/edit`;
  const html = HtmlService.createHtmlOutput(`
    <script>
      window.open('${url}', '_blank');
      google.script.host.close();
    </script>
  `).setWidth(200).setHeight(50);

  SpreadsheetApp.getUi().showModalDialog(html, 'Opening Journal...');
}

function backend_createJournal() {
  createPrivateJournal();
  return true;
}

function backend_openJournal() {
  const sh = SpreadsheetApp.getActiveSheet();
  const journalId = sh.getRange(JOURNAL_DOC_CELL).getValue();
  if (!journalId) throw new Error('No journal found for this client.');
  return `https://docs.google.com/document/d/${journalId}/edit`;
}