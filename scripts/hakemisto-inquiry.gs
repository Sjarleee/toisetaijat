// ============================================================
// Toiset Aijat – Google Apps Script
// Hakemistotiedustelut webhook
//
// Setup:
//   1. Åpne Google Sheet → Extensions → Apps Script
//   2. Lim inn hele denne filen, erstatt eksisterende innhold
//   3. Deploy → New deployment → Type: Web app
//      - Execute as: Me
//      - Who has access: Anyone
//   4. Kopier Web App URL → legg inn som HAKEMISTO_WEBHOOK i
//      Cloudflare Dashboard → Pages → toisetaijat → Settings → Variables
// ============================================================

const ADMIN_EMAIL = 'jarle@alvheim.org';
const SHEET_NAME  = 'Hakemistotiedustelut';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    logToSheet(data);
    sendAdminEmail(data);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function logToSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Aikaleima', 'Nimi', 'Sähköposti', 'Viesti',
      'Kokoelma', 'Löydetyt henkilöt', 'Lähteet (yksityinen)', 'Tila'
    ]);
    sheet.setFrozenRows(1);

    // Piilotetaan Lähteet-sarake oletuksena (sarake G = indeksi 7)
    sheet.hideColumns(7);
  }
  sheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.message || '',
    data.collection || '',
    data.matched || '',
    data.sources || '',   // yksityinen – sarake piilotettu
    'Uusi',
  ]);
}

function sendAdminEmail(data) {
  const subject = `Hakemistotiedustelu: ${data.collection || '–'}`;
  const body = [
    'Uusi tiedustelu hakemistosta.',
    '',
    `Nimi:           ${data.name}`,
    `Sähköposti:     ${data.email}`,
    `Kokoelma:       ${data.collection || '–'}`,
    '',
    'Löydetyt henkilöt:',
    data.matched || '–',
    '',
    'Lähteet (yksityinen – ei jaeta asiakkaalle):',
    data.sources || '–',
    '',
    'Viesti:',
    data.message || '–',
  ].join('\n');

  GmailApp.sendEmail(ADMIN_EMAIL, subject, body, {
    replyTo: data.email,
    name: 'Toiset Aijat Hakemisto',
  });
}
