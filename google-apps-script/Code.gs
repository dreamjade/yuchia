/**
 * Anonymous Astro Rumor Mill API, bound to its Google Sheet.
 * Run setupRumorMill once in the editor before deploying the web app.
 */
const RUMOR_HEADERS = ['Institution', 'Category', 'Deadline', 'JobUrl', 'Status', 'Rumors', 'Updated'];
const RUMOR_CATEGORIES = ['Postdoc', 'Faculty'];
const RUMOR_STATUSES = ['Ad Posted', 'Shortlist / Reference Req', 'Interviews', 'Offer Made', 'Offer Accepted'];
const RUMOR_MAX_LOG_LENGTH = 45000;

function setupRumorMill() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open this script from Extensions > Apps Script in the tracker spreadsheet.');
  validateHeaders_(spreadsheet.getSheets()[0]);
  PropertiesService.getScriptProperties().setProperty('RUMOR_SPREADSHEET_ID', spreadsheet.getId());
}

function doGet(e) {
  try {
    const sheet = getRumorSheet_();
    const timezone = sheet.getParent().getSpreadsheetTimeZone();
    const rows = readRows_(sheet)
      .filter(function (row) { return String(row[0]).trim() !== ''; })
      .map(function (row) { return rowToObject_(row, timezone); });
    return jsonOutput_(rows);
  } catch (error) {
    return errorOutput_(error, 'Unable to load the tracker. Please try again later.');
  }
}

function doPost(e) {
  let lock;
  try {
    const body = parseSubmission_(e);
    lock = LockService.getScriptLock();
    lock.waitLock(10000);

    const sheet = getRumorSheet_();
    const timezone = sheet.getParent().getSpreadsheetTimeZone();
    const today = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
    const logLine = '[' + today + '] ' + body.rumor;
    const rows = readRows_(sheet);
    const matchIndex = rows.findIndex(function (row) {
      return String(row[0]).trim().toLowerCase() === body.institution.toLowerCase() &&
        String(row[1]).trim().toLowerCase() === body.category.toLowerCase();
    });

    let result;
    if (matchIndex >= 0) {
      result = rowToObject_(rows[matchIndex], timezone);
      result.status = body.status;
      // Existing job details stay intact; only fill missing optional metadata.
      result.deadline = result.deadline || body.deadline;
      result.jobUrl = result.jobUrl || body.jobUrl;
      result.rumors = result.rumors ? result.rumors + '\n' + logLine : logLine;
      result.updated = today;
    } else {
      result = {
        institution: body.institution, category: body.category,
        deadline: body.deadline, jobUrl: body.jobUrl, status: body.status,
        rumors: logLine, updated: today
      };
    }

    if (result.rumors.length > RUMOR_MAX_LOG_LENGTH) {
      throw publicError_('This job has reached its history limit. Please contact the site owner; no history was removed.');
    }

    const values = [result.institution, result.category, result.deadline, result.jobUrl,
      result.status, result.rumors, result.updated].map(sheetLiteral_);
    const rowNumber = matchIndex >= 0 ? matchIndex + 2 : sheet.getLastRow() + 1;
    if (rowNumber > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
    // Explicit plain-text cells preserve ISO dates and prevent locale coercion.
    // The apostrophe escape also prevents setValues from interpreting formulas.
    sheet.getRange(rowNumber, 1, 1, RUMOR_HEADERS.length).setNumberFormat('@').setValues([values]);
    SpreadsheetApp.flush();
    return jsonOutput_({ success: true, row: result });
  } catch (error) {
    return errorOutput_(error, 'Unable to save the update. Refresh the tracker before retrying.');
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function getRumorSheet_() {
  // Bound-script active-document methods are unavailable in deployed web apps.
  const id = PropertiesService.getScriptProperties().getProperty('RUMOR_SPREADSHEET_ID');
  if (!id) throw publicError_('The tracker is not configured. The owner must run setupRumorMill in Apps Script.');
  const sheet = SpreadsheetApp.openById(id).getSheets()[0];
  validateHeaders_(sheet);
  return sheet;
}

function validateHeaders_(sheet) {
  const headers = sheet.getRange(1, 1, 1, RUMOR_HEADERS.length).getValues()[0];
  if (!RUMOR_HEADERS.every(function (header, index) { return headers[index] === header; })) {
    throw publicError_('The first sheet must have the seven tracker headers in the documented order.');
  }
}

function readRows_(sheet) {
  const count = sheet.getLastRow() - 1;
  return count > 0 ? sheet.getRange(2, 1, count, RUMOR_HEADERS.length).getValues() : [];
}

function rowToObject_(row, timezone) {
  const storedCategory = String(row[1] == null ? '' : row[1]);
  const category = RUMOR_CATEGORIES.find(function (value) {
    return value.toLowerCase() === storedCategory.trim().toLowerCase();
  });
  return {
    institution: String(row[0] == null ? '' : row[0]),
    category: category || storedCategory,
    deadline: dateString_(row[2], timezone),
    jobUrl: String(row[3] == null ? '' : row[3]),
    status: String(row[4] == null ? '' : row[4]),
    rumors: String(row[5] == null ? '' : row[5]),
    updated: dateString_(row[6], timezone)
  };
}

function dateString_(value, timezone) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timezone, 'yyyy-MM-dd');
  }
  return String(value == null ? '' : value).trim();
}

function parseSubmission_(e) {
  if (!e || !e.postData || typeof e.postData.contents !== 'string' || e.postData.contents.length > 10000) {
    throw publicError_('Invalid submission.');
  }
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (error) {
    throw publicError_('Invalid JSON submission.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw publicError_('Invalid submission.');
  if (body.website != null && body.website !== '') throw publicError_('Submission rejected.');

  const submission = {
    institution: textField_(body.institution, 'Institution', 200, true),
    category: textField_(body.category, 'Category', 20, true),
    deadline: textField_(body.deadline, 'Deadline', 10, false),
    jobUrl: textField_(body.jobUrl, 'Job URL', 2048, false),
    status: textField_(body.status, 'Status', 40, true),
    rumor: textField_(body.rumor, 'Rumor', 500, true)
  };
  if (RUMOR_CATEGORIES.indexOf(submission.category) === -1) throw publicError_('Choose Postdoc or Faculty.');
  if (RUMOR_STATUSES.indexOf(submission.status) === -1) throw publicError_('Choose a valid status.');
  if (submission.deadline) {
    const parsed = new Date(submission.deadline + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(submission.deadline) || isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== submission.deadline) {
      throw publicError_('Deadline must be a valid date in YYYY-MM-DD format.');
    }
  }
  if (submission.jobUrl && !validJobUrl_(submission.jobUrl)) {
    throw publicError_('Use a valid http:// or https:// job URL without spaces, control characters, or embedded credentials.');
  }
  return submission;
}

function validJobUrl_(value) {
  // Apps Script has no browser URL constructor. Validate the URL's structure
  // locally; no requests are made to submitted hosts.
  if (/[\s\u0000-\u001f\u007f-\u009f\\]/.test(value)) return false;
  const match = /^https?:\/\/([^/?#]+)(?:[/?#].*)?$/i.exec(value);
  if (!match || match[1].indexOf('@') !== -1) return false;
  const authority = match[1];
  let host;
  let port;
  if (authority.charAt(0) === '[') {
    const ipv6 = /^\[([0-9a-f:.]+)\](?::(\d+))?$/i.exec(authority);
    if (!ipv6 || !validIpv6_(ipv6[1])) return false;
    port = ipv6[2];
  } else {
    const hostname = /^([^:]+)(?::(\d+))?$/.exec(authority);
    if (!hostname) return false;
    host = hostname[1].replace(/[\u3002\uff0e\uff61]/g, '.').replace(/\.$/, '');
    port = hostname[2];
    // Preserve Unicode/IDN labels while excluding invalid ASCII host syntax.
    const labels = host.split('.');
    if (!labels.every(function (label) {
      return /^[a-z0-9\u00a0-\uffff](?:[a-z0-9\u00a0-\uffff-]*[a-z0-9\u00a0-\uffff])?$/i.test(label);
    })) return false;
    if (/^\d+(?:\.\d+){3}$/.test(host) && !validIpv4_(host)) return false;
  }
  return port === undefined || Number(port) <= 65535;
}

function validIpv4_(address) {
  const octets = address.split('.');
  return octets.length === 4 && octets.every(function (octet) {
    return /^\d{1,3}$/.test(octet) && Number(octet) <= 255;
  });
}

function validIpv6_(address) {
  const ipv4 = /(^|:)(\d+\.\d+\.\d+\.\d+)$/.exec(address);
  if (ipv4) {
    if (!validIpv4_(ipv4[2])) return false;
    address = address.slice(0, -ipv4[2].length) + '0:0';
  }
  const halves = address.split('::');
  if (halves.length > 2) return false;
  const groups = halves.filter(Boolean).join(':').split(':').filter(Boolean);
  if (!groups.every(function (group) { return /^[0-9a-f]{1,4}$/i.test(group); })) return false;
  if (halves.length === 1) return groups.length === 8 && !/^:|:$/.test(address);
  return groups.length < 8 && !/(^:[^:]|[^:]:$|:::)/.test(address);
}

function textField_(value, label, limit, required) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') throw publicError_(label + ' must be text.');
  const text = value.trim();
  if (required && !text) throw publicError_(label + ' is required.');
  if (text.length > limit) throw publicError_(label + ' must be at most ' + limit + ' characters.');
  return text;
}

function sheetLiteral_(value) {
  const text = String(value);
  return /^[=+\-@']/.test(text) ? "'" + text : text;
}

function publicError_(message) {
  const error = new Error(message);
  error.publicMessage = message;
  return error;
}

function errorOutput_(error, fallback) {
  return jsonOutput_({ success: false, error: error.publicMessage || fallback });
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
