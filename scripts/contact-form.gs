/**
 * Adrastea contact form: Google Apps Script web app.
 *
 * Receives the form on contact.html, appends one row per inquiry to a Google Sheet, optionally
 * emails the team, and answers with JSON so the page can tell the visitor whether it was saved.
 *
 * Deploy (see README, "Contact form"):
 *   Deploy > New deployment > Web app
 *   Execute as:      Me
 *   Who has access:  Anyone            <- not "Anyone with a Google account", not "Anyone within the organisation"
 * Then put the /exec address in the `action` of the form in contact.html, in this shape:
 *   https://script.google.com/macros/s/<deployment id>/exec
 */

// Leave empty when this script is attached to the spreadsheet (Extensions > Apps Script).
// For a standalone script, paste the spreadsheet's id (the long part of its address).
const SHEET_ID = "";
const SHEET_NAME = "Inquiries";

// Optional: an address that receives an email for every inquiry. Leave empty to switch off.
const NOTIFY_EMAIL = "";

// Column order for a new sheet. An existing sheet keeps its own header row: each column is filled
// from the form field with the same name, so columns can be reordered or removed in the sheet.
const FIELDS = [
  "Request Type",
  "First Name",
  "Last Name",
  "Email",
  "Organization",
  "Organization Website",
  "Request Date",
  "Urgency",
  "Joining Team",
  "Team",
  "Resume",
  "Why Join",
  "Additional File",
  "Message",
  "How Heard",
  "Additional Comments",
];
const REQUIRED = ["Request Type", "First Name", "Last Name", "Email", "Message"];
const MAX_LENGTH = 5000;

function doPost(e) {
  const fields = (e && e.parameter) || {};

  // The hidden field only bots fill in. Answer "ok" so they learn nothing, and save nothing.
  if (String(fields.website_check || "").trim()) return json({ ok: true });

  const missing = REQUIRED.filter((name) => !String(fields[name] || "").trim());
  if (missing.length) {
    return json({ ok: false, message: "Please complete: " + missing.join(", ") + "." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(fields.Email).trim())) {
    return json({ ok: false, message: "Please enter a valid email address." });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // two inquiries arriving together must not write the same row

    const book = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(["Timestamp"].concat(FIELDS));

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.appendRow(headers.map((header) => (header === "Timestamp" ? new Date() : clean(fields[header]))));

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        replyTo: String(fields.Email).trim(),
        subject: "Adrastea inquiry: " + clean(fields["Request Type"]),
        body: FIELDS.filter((name) => fields[name])
          .map((name) => name + ": " + fields[name])
          .join("\n"),
      });
    }

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ ok: false, message: "We couldn’t save your inquiry. Please try again in a moment." });
  } finally {
    lock.releaseLock();
  }
}

// Opening the address in a browser shows this, which is a quick way to check the deployment is public.
function doGet() {
  return json({ ok: true, service: "adrastea-contact-form" });
}

// Trim, cap the length, and stop a value such as "=IMPORTXML(...)" from running as a formula in the sheet.
function clean(value) {
  const text = String(value == null ? "" : value).trim().slice(0, MAX_LENGTH);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
