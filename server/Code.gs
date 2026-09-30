/**
 * Unity Quiz — results backend (Google Apps Script + Google Sheet).
 *
 * Setup: see "Results backend" in README.md.
 *
 * The codes below live only here, on Google's server. Students never see them:
 * the quiz page sends the code it was given and this script checks it.
 * Change them before the first class, then Deploy > Manage deployments > Edit > New version.
 */

// Code each class types before starting. Keys must match the class ids in assets/js/data.js.
const CLASS_CODES = {
  A: "CHANGE-ME-A",
  B: "CHANGE-ME-B"
};

// Code the teacher types to download results.
const ADMIN_CODE = "CHANGE-ME-ADMIN";

const SHEET_NAME = "Results";
const HEADERS = [
  "Submitted At",
  "Attempt ID",
  "Class",
  "Student Name",
  "Attempt",
  "Score",
  "Total",
  "Percent",
  "Correct",
  "Wrong",
  "Timed Out",
  "Avg Answer Time (s)",
  "Total Time (s)",
  "Started At",
  "Finished At",
  "Answers"
];

/* ---------- entry points ---------- */

// The page sends every request as a POST with a JSON body (sent as text/plain to avoid
// a CORS preflight). Codes never go in the URL, so they don't end up in logs or history.
function doPost(e) {
  let body;
  try {
    body = JSON.parse((e.postData && e.postData.contents) || "{}");
  } catch (_) {
    return json({ ok: false, error: "bad_request" });
  }
  try {
    switch (body.action) {
      case "verify":
        return json(checkClassCode(body.classId, body.code) ? { ok: true } : { ok: false, error: "bad_code" });
      case "submit":
        return json(submitResult(body));
      case "export":
        if (!sameCode(body.adminCode, ADMIN_CODE)) return json({ ok: false, error: "bad_admin" });
        return json({ ok: true, rows: readRows() });
      default:
        return json({ ok: false, error: "unknown_action" });
    }
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: "server_error" });
  }
}

// Opening the web app URL in a browser shows this, which confirms the deployment works.
function doGet() {
  return json({ ok: true, service: "unity-quiz" });
}

/* ---------- actions ---------- */

function submitResult(body) {
  const r = body.result || {};
  if (!checkClassCode(r.classId, body.code)) return { ok: false, error: "bad_code" };

  const name = cleanName(r.name);
  if (!name) return { ok: false, error: "bad_name" };
  const attemptId = String(r.attemptId || "").slice(0, 64);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(attemptId)) return { ok: false, error: "bad_request" };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet();
    const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues() : [];

    // a retried upload (e.g. the reply got lost) must not create a second row
    const existing = rows.find((row) => row[1] === attemptId);
    if (existing) return { ok: true, attempt: existing[4], duplicate: true };

    const sameStudent = rows.filter((row) => row[2] === r.classId && String(row[3]).toLowerCase() === name.toLowerCase());
    const attempt = sameStudent.length + 1;
    const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : "");

    sheet.appendRow([
      new Date(),
      attemptId,
      r.classId,
      // leading ' keeps Sheets from treating a name like "=SUM(...)" as a formula
      "'" + name,
      attempt,
      num(r.score),
      num(r.total),
      num(r.percent),
      num(r.correct),
      num(r.wrong),
      num(r.timedOut),
      num(r.avgSeconds),
      num(r.totalSeconds),
      r.startedAt ? new Date(r.startedAt) : "",
      r.finishedAt ? new Date(r.finishedAt) : "",
      "'" + cleanAnswers(r.answers)
    ]);
    return { ok: true, attempt };
  } finally {
    lock.releaseLock();
  }
}

function readRows() {
  const sheet = getSheet();
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
  return values.map((row) => {
    const out = {};
    HEADERS.forEach((header, i) => {
      const v = row[i];
      out[header] = v instanceof Date ? v.toISOString() : v;
    });
    return out;
  });
}

/* ---------- helpers ---------- */

function checkClassCode(classId, code) {
  return Object.prototype.hasOwnProperty.call(CLASS_CODES, classId) && sameCode(code, CLASS_CODES[classId]);
}

// Codes are not case-sensitive and ignore surrounding spaces, so students can type them easily.
function sameCode(given, expected) {
  return typeof given === "string" && given.trim().toUpperCase() === String(expected).trim().toUpperCase();
}

function cleanName(value) {
  const name = String(value || "").replace(/\s+/g, " ").trim().slice(0, 60);
  return name.length >= 2 ? name : "";
}

// Stored as "a01=1 a02=0 a03=T" (1 correct, 0 wrong, T time's up), in the order answered.
function cleanAnswers(list) {
  if (!Array.isArray(list)) return "";
  return list
    .slice(0, 200)
    .map((a) => `${String(a.id).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 20)}=${a.timedOut ? "T" : a.correct ? "1" : "0"}`)
    .join(" ");
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
