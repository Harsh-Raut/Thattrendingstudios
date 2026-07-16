/**
 * That Trending Studio — enquiry backend (Google Apps Script)
 * ----------------------------------------------------------------
 * Receives the website enquiry form, appends a row to your Google
 * Sheet, and emails a notification to thattrendingsong@gmail.com.
 *
 * SETUP (once):
 *  1. Open your sheet:
 *     https://docs.google.com/spreadsheets/d/1cNnSlNydXdlJt--rWJStxrFcEE_uTIQl1p50IBhD5HY/edit
 *  2. Extensions → Apps Script.
 *  3. Delete anything there, paste ALL of this file, click Save.
 *  4. Deploy → New deployment → gear icon → "Web app".
 *       - Description:  TTS enquiries
 *       - Execute as:   Me (thattrendingsong@gmail.com)
 *       - Who has access: Anyone
 *     Click Deploy, then Authorize access (approve the permissions).
 *  5. Copy the "Web app URL" (ends in /exec) and send it back to me.
 *     I'll paste it into the website and the form goes live.
 */

var SHEET_ID = '1cNnSlNydXdlJt--rWJStxrFcEE_uTIQl1p50IBhD5HY';
var SHEET_NAME = 'Enquiries';
var NOTIFY_EMAIL = 'thattrendingsong@gmail.com';

function doPost(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};

    // Honeypot: silently drop bot submissions.
    if (p.botcheck) {
      return _json({ ok: true });
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Name', 'Phone / WhatsApp', 'Email', 'Service', 'Message']);
    }

    var ts = new Date();
    sheet.appendRow([
      ts,
      p.name || '',
      p.phone || '',
      p.email || '',
      p.service || '',
      p.message || ''
    ]);

    var body =
      'New Voice Test enquiry from the website:\n\n' +
      'Name: ' + (p.name || '') + '\n' +
      'Phone / WhatsApp: ' + (p.phone || '') + '\n' +
      'Email: ' + (p.email || '') + '\n' +
      'Service: ' + (p.service || '') + '\n' +
      'Message: ' + (p.message || '') + '\n\n' +
      'Received: ' + ts;

    MailApp.sendEmail(NOTIFY_EMAIL, 'New enquiry — That Trending Studio', body);

    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return ContentService.createTextOutput('That Trending Studio enquiry endpoint is live.');
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
