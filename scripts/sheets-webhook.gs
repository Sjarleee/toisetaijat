// ============================================================
// Toiset Aijat – Google Apps Script
// POST-webhook fra Cloudflare Worker etter MobilePay-capture
//
// Setup:
//   1. Åpne Google Sheet → Extensions → Apps Script
//   2. Lim inn hele denne filen, erstatt eksisterende innhold
//   3. Deploy → New deployment → Type: Web app
//      - Execute as: Me
//      - Who has access: Anyone
//   4. Kopier Web App URL → legg inn som SHEETS_WEBHOOK i
//      Cloudflare Dashboard → Pages → toisetaijat → Settings → Variables
// ============================================================

const ADMIN_EMAIL = 'jarle@alvheim.org';
const SENDER_NAME = 'Toiset Aijat';
const REPLY_TO    = 'jarle@toisetaijat.fi';
const SHEET_NAME  = 'Tilaukset';
const ALV_RATE    = 0.135;

// Drive file ID for palautusehdot PDF
const PALAUTUSEHDOT_FILE_ID = '1D-q1tuBuRnY6MYRVIul7c54WTwERYKvs';

// Cart item ID → Drive file ID for article PDFs
const PDF_ARTICLES = {
  // --- Uudenmaan Ratsurykmentti: kaikki ---
  'uudenmaan-ratsurykmentti': '1yeq9g_7uhrWPND3bRDkmSQtPXto_PCQP',
  // --- Uudenmaan Ratsurykmentti: yksittäiset ---
  'uudenmaan-ratsurykmentti-1641': '14lnOOjOKHVVYOb2-HudzAGzaQCZEZ1HQ',
  'uudenmaan-ratsurykmentti-1642': '1zC0G9CE3J52vBF3OJSE6wj2Uvf6CL8js',
  'uudenmaan-ratsurykmentti-1643': '1c5HZKKPV220fhDOMGX9wQelRZD6v5E7B',
  'uudenmaan-ratsurykmentti-1647': '1ZOXzn4H66nPotCD2QWci-dcgtSl0AE65',
  'uudenmaan-ratsurykmentti-1649': '1m37xhNn7aJJlSG38pmniN9QtyyNnKUph',
  'uudenmaan-ratsurykmentti-1654': '1gIMA5j_e0rY8cpSkQ5JWsoSqhz0HbM6i',
  'uudenmaan-ratsurykmentti-1655': '1z_8yXRhgE4Ij5QKoHYEBkPSfSBN-9AvX',
  'uudenmaan-ratsurykmentti-16551656-luettelovertailu': '1RRjzQeZIuNoRmhUEs-Z9iUTfTf0SQ1GF',
  'uudenmaan-ratsurykmentti-1659': '1vSHx4HMmts3uXMsGh_H7RC2dR-NgGnxM',
  'uudenmaan-ratsurykmentti-16981758': '1guWChM5VijBMkO84XFqWnkwawvNmMm5f',
  'uudenmaan-ratsurykmentti-17001706': '116ZU3pXzPVAzsGygWfw9TLStpbIaRfjj',
  'uudenmaan-ratsurykmentti-1712': '16WQmK_md15x7I3G8UxpcM3l0H5tV5Xgh',
  'uudenmaan-ratsurykmentti-1720': '1vKUoAe2HAl_oatq21iVpOyDnyYVMRO28',
  'uudenmaan-ratsurykmentti-1728': '1K_Huil5G-n5xApVNxI5bMeJY6GoA2_WO',
  'uudenmaan-ratsurykmentti-1729': '1ug4RGn5JmrOBJUE3rpsAB5-vpGE1S5qS',
  'uudenmaan-ratsurykmentti-1743': '1ka8WhfoiViop-dPAta-2X04nLSUeg9i-',
  'uudenmaan-ratsurykmentti-1762': '1G5pUNjD8ZuKSIuU1ghiCTvH6o6iaBJrm',
  'uudenmaan-ratsurykmentti-1767': '1jCHJd3BhnKN4JKI5gkXxqfGckzzNtqg3',
  'uudenmaan-ratsurykmentti-1779': '1u6VyZNdG4JdbV6P7FSsqTi_qjVs6blL4',
  'uudenmaan-ratsurykmentti-1787': '1HO9sew3fO4WKYo9RCSgj4N9IkwBd9580',
  'uudenmaan-ratsurykmentti-1789': '1D3krSFUIxa9g2P_yOMFBhsJ7WTvByDqp',
  'uudenmaan-ratsurykmentti-1790': '1bbkjxpNGPrsSpyz9IR0ewViGxhxn4dUZ',
  'uudenmaan-ratsurykmentti-1795': '11LFr-pusurVh6KVoXhFMSUR3Fs5W8dR2',
  'uudenmaan-ratsurykmentti-1800': '1F2iswnRFGlWGwBjCPhE8f3tJ0JhNx0Rg',
  'uudenmaan-ratsurykmentti-1806': '1p0B-PdNqNHQEvNjtu8kob9oq47CvDulm',
  'uudenmaan-ratsurykmentti-1809': '195m6YlCXf_wngbAO6jurzJk5dO1m8Q1X',

  // --- Karjalan ratsurykmentti: kaikki ---
  'karjalan-ratsurykmentti-artikkelit': '1D6ayzMNQjLCBCFBuCch9anrpytWwwQ8n',
  // --- Karjalan ratsurykmentti: yksittäiset ---
  'karjalan-ratsurykmentti-artikkelit-1643': '1kRCf8wcjtDsgbQL1_QLaKlnVNuD39ned',
  'karjalan-ratsurykmentti-artikkelit-1646': '1wRPtKU24AGxEvJA0GEJIaJ28WVDRhH_q',
  'karjalan-ratsurykmentti-artikkelit-1649': '1r_06KZfTLe1Xt0CjGiWjSwc9aa5dplB8',
  'karjalan-ratsurykmentti-artikkelit-1660': '1f_xyhxnjbPXConjk6FYhFSgUTcMVKuLr',
  'karjalan-ratsurykmentti-artikkelit-1675': '1WzqhykNQcSaceW2JSf-9O7ottx_CcH0l',
  'karjalan-ratsurykmentti-artikkelit-1676': '1NOm7ZzcIhGNkXk_o3BREme-X4nt6bXS3',
  'karjalan-ratsurykmentti-artikkelit-gottfrid-bobertin-rykmentti-1679': '17G46zYkarMbpNTHtkKocrlUypGvB-oUU',
  'karjalan-ratsurykmentti-artikkelit-1685': '1TfyvSRZaebWvh0eyjLZNOk6TAi6j1Yd7',
  'karjalan-ratsurykmentti-artikkelit-1708': '1C4zhd6E_V0rzxDWxL4qhUZsEwsMuWArB',
  'karjalan-ratsurykmentti-artikkelit-1710': '1-ctucZOGmGZTPk0QBGAcwr9uGcQuGybH',
  'karjalan-ratsurykmentti-artikkelit-1712': '1S5ecS1Gnx1whkk7Kgh5TQcARqwrtuZc3',
  'karjalan-ratsurykmentti-artikkelit-17131721': '1WUx5jlCLfgPVqZcVJRUsSFV3Jgpr632t',
  'karjalan-ratsurykmentti-artikkelit-pkatselmus-1719': '1TIhgsubBlzsTc15e587KESzM_l51K1kH',
  'karjalan-ratsurykmentti-artikkelit-1758': '14f3JfZc_V5Nx60EUlB8UI2Dvst84m49K',
  'karjalan-ratsurykmentti-artikkelit-1773': '11dwCmY9OljJn5r46sgSOmRo_QkMHbMCG',
  'karjalan-ratsurykmentti-artikkelit-1778-ja-1789': '1vAoSMs4kVNksoQFI4_fZPZNef4yP6Pnm',
  'karjalan-ratsurykmentti-artikkelit-ammuslaskelmia': '1uTNESZ1b93ZblAJ8zfd96obEi6W3fRN-',
  'karjalan-ratsurykmentti-artikkelit-1806': '15eyMg7X-e8Nfkxha3KH5OhuwABhto9l5',
  'karjalan-ratsurykmentti-artikkelit-1809-afmnstring': '1DX99YfKQHAhlGCbUHZtB5WzxwgLQr1E0',
  'karjalan-ratsurykmentti-artikkelit-1809': '1rD37aScWFAYdkCYNhY56xX_syB5L8caQ',

  // --- Viipurin läänintilit: kaikki ---
  'viipurin-laanintilit': '1KKEg4ZB94GC6AJ9C0RZpVEJ1kPC3MFWP',
  // --- Viipurin läänintilit: yksittäiset ---
  'viipurin-laanintilit-1635': '1IHDvLZqKQP1arvG8OcbmCfY4delNy-h7',
  'viipurin-laanintilit-1639': '1d0j6uoRehPfDxl3qXQiS5uFi39fKJ-3Y',
  'viipurin-laanintilit-1665': '1Y_Ve93WZjjdGYy0APRyQ0gfiTfwmW5sh',
  'viipurin-laanintilit-1670': '1gMxDKRpK8RMRck9yMipaSc5pB5YCwhTz',
  'viipurin-laanintilit-1673': '1w6Nkj_QpgMcP_pPCTOt0AMsDLLXkJSw7',
  'viipurin-laanintilit-1682': '1A4g7MvKQDNJOabXwS-x5jtEfTFL6Aw8j',
  'viipurin-laanintilit-1683': '1nMyoy9BrfGZU7JeS19tFCA_5v5STtTdH',
  'viipurin-laanintilit-1697': '1O3vPEQWN183CbFqEHDDWrjdNRVHEn2sF',
  'viipurin-laanintilit-1699': '1hERpEoWgQo-rjQuhoiWLekvhdikBKMlg',
  'viipurin-laanintilit-1700': '1UsCpBYzkjeNsifULnTF_bUrbtPYWu1LH',
  'viipurin-laanintilit-1701': '17iz5U0ZihbEbdXFiAioONnS42D_iEEGU',
  'viipurin-laanintilit-1702': '1PrFAYYoPRHqaGCpdQUhTHUSJ7GzDlWE1',
  'viipurin-laanintilit-1703': '1_AH632__YQPo0oVdstiz3Io50WKFbZzP',
  'viipurin-laanintilit-1705': '1kXxrr8BJICkQrzvVDmm6bLESCycNjqCz',
  'viipurin-laanintilit-1706': '1qGVPN93q-z-7qbfO8RDuBN3FvCFDf-It',
  'viipurin-laanintilit-1707': '10NjkzddIx_gsWvFFzYR29-tFXY9FYHw8',
  'viipurin-laanintilit-1708': '1hl5gtD_Eu8r-UUPT8sqHtCFjf5qdguI3',
  'viipurin-laanintilit-1709': '1g3rfo2Yhcd1VGT4-o3INa9LqXTwDIzOS',
  'viipurin-laanintilit-1710': '1181Qyl5xAV3UTVKPB8O-d9oGmJyyGxJh',
  'viipurin-laanintilit-1711': '16PZ_e_lWSElgBxjiPfkcl3c8xZrHCRqo',
  'viipurin-laanintilit-1712': '1tFiAcZZKfs3e4DjezoX8ykqI9BFrQoWg',
  'viipurin-laanintilit-1724': '1gDwTvPxPudAARNQSIUm907YZfg4Ncwky',
};

// ============================================================
// Invoice number counter (resets per year)
// ============================================================
function getNextInvoiceNumber() {
  var props = PropertiesService.getScriptProperties();
  var year = new Date().getFullYear().toString();
  var key = 'invoiceCounter_' + year;
  var current = parseInt(props.getProperty(key) || '0', 10);
  var next = current + 1;
  props.setProperty(key, next.toString());
  return year + '-' + String(next).padStart(3, '0');
}

// ============================================================
// Debug: run manually to verify Drive access + log item IDs
// ============================================================
function testDriveAccess() {
  var ok = 0, fail = 0;
  for (var id in PDF_ARTICLES) {
    try {
      var f = DriveApp.getFileById(PDF_ARTICLES[id]);
      Logger.log('OK: ' + id + ' → ' + f.getName());
      ok++;
    } catch (err) {
      Logger.log('FAIL: ' + id + ' → ' + err);
      fail++;
    }
  }
  Logger.log('--- ' + ok + ' ok, ' + fail + ' failed ---');
  // Also verify palautusehdot
  try {
    DriveApp.getFileById(PALAUTUSEHDOT_FILE_ID);
    Logger.log('Palautusehdot: OK');
  } catch (err) {
    Logger.log('Palautusehdot: FAIL → ' + err);
  }
}

function testOrder() {
  var fakeOrder = {
    orderId: 'TEST-001',
    invoiceNumber: '2026-TEST',
    orderedAt: new Date().toISOString(),
    name: 'Testi Käyttäjä',
    email: Session.getActiveUser().getEmail(),
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    country: '',
    items: [
      { id: 'viipurin-laanintilit-1673', title: 'Viipurin läänintilit – 1673', price: 4, quantity: 1, type: 'article-collection' },
    ],
    subtotal: 4,
    vatAmount: 0.47,
    shipping: 0,
    total: 4,
    paymentState: 'CAPTURED',
    notes: '',
  };
  sendAdminEmail(fakeOrder);
  sendConfirmationEmail(fakeOrder);
  Logger.log('testOrder done – check inbox');
}

// Simulerer hva frontend sender i dag (BundleCard-bug: type er 'book' for alt)
// Kjør denne for å bekrefte at articleItems er tom → ingen PDF-vedlegg
function testWithBuggedType() {
  var fakeOrder = {
    orderId: 'TEST-BUG',
    invoiceNumber: '2026-BUG',
    orderedAt: new Date().toISOString(),
    name: 'Testi Käyttäjä',
    email: Session.getActiveUser().getEmail(),
    phone: '', address: '', postalCode: '', city: '', country: '',
    items: [
      { id: 'viipurin-laanintilit-1673', title: 'Viipurin läänintilit – 1673', price: 4, quantity: 1, type: 'book' },
    ],
    subtotal: 4, vatAmount: 0.47, shipping: 0, total: 4,
    paymentState: 'CAPTURED', notes: '',
  };
  Logger.log('=== testWithBuggedType ===');
  Logger.log('Forventet: articleItems=0, ingen PDF-vedlegg');
  var articleItems = (fakeOrder.items || []).filter(function(i) { return i.type === 'article-collection'; });
  Logger.log('articleItems.length: ' + articleItems.length);
  Logger.log('Kjøres uten å sende epost – se ovenfor');
}

// Kjør begge og sammenlign i loggen
function testCompare() {
  Logger.log('--- Med riktig type (article-collection) ---');
  var correct = [{ id: 'viipurin-laanintilit-1673', type: 'article-collection' }];
  Logger.log('articleItems: ' + correct.filter(function(i) { return i.type === 'article-collection'; }).length);

  Logger.log('--- Med feil type (book, BundleCard-bug) ---');
  var bugged = [{ id: 'viipurin-laanintilit-1673', type: 'book' }];
  Logger.log('articleItems: ' + bugged.filter(function(i) { return i.type === 'article-collection'; }).length);
  Logger.log('Fix: BundleCard.astro linje ~97 hardkoder type:book – skal lese dataset.type');
}

// ============================================================
// Webhook entry point
// ============================================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    data.invoiceNumber = getNextInvoiceNumber();
    logToSheet(data);
    sendAdminEmail(data);
    sendConfirmationEmail(data);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('doPost error: ' + err);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// Log order to Google Sheet
// ============================================================
function logToSheet(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Aikaleima', 'Laskunumero', 'Tilausnumero', 'Nimi', 'Sähköposti', 'Puhelin',
      'Osoite', 'Postinumero', 'Kaupunki', 'Maa', 'Tuotteet',
      'Välisumma', 'ALV', 'Toimitus', 'Yhteensä', 'Maksutapa', 'Tila', 'Muistiinpanot'
    ]);
    sheet.getRange(1, 1, 1, 18).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.getRange(1, 6, sheet.getMaxRows(), 1).setNumberFormat('@'); // puhelin aina teksti

  var itemStr = (data.items || []).map(function(i) {
    return i.title + ' x' + i.quantity + ' (€' + (i.price * i.quantity) + ')';
  }).join('; ');

  var veroton = Math.round(data.subtotal / (1 + ALV_RATE) * 100) / 100;
  var alv = Math.round(data.subtotal * ALV_RATE / (1 + ALV_RATE) * 100) / 100;

  sheet.appendRow([
    new Date(data.orderedAt).toLocaleString('fi-FI'),
    data.invoiceNumber || '',
    data.orderId || '',
    data.name || '',
    data.email || '',
    data.phone ? '\'' + data.phone : '',
    data.address || '',
    data.postalCode || '',
    data.city || '',
    data.country || '',
    itemStr,
    data.subtotal || 0,
    alv,
    data.shipping || 0,
    data.total || 0,
    'MobilePay',
    data.paymentState || 'CAPTURED',
    data.notes || '',
  ]);
}

// ============================================================
// Admin notification email (plain text)
// ============================================================
function buildItemLines(items) {
  return (items || []).map(function(i) {
    return '  ' + i.title + (i.quantity > 1 ? ' x' + i.quantity : '') + '   €' + (i.price * i.quantity);
  }).join('\n');
}

function sendAdminEmail(data) {
  var subject = 'Uusi tilaus ' + data.invoiceNumber + ' – ' + data.name;
  var body = [
    'Laskunumero:  ' + data.invoiceNumber,
    'Tilausnumero: ' + data.orderId,
    'Päivämäärä:   ' + new Date(data.orderedAt).toLocaleString('fi-FI'),
    '',
    'Nimi:    ' + data.name,
    'Email:   ' + data.email,
    'Puhelin: ' + (data.phone || '–'),
    data.address
      ? 'Osoite:  ' + data.address + ', ' + data.postalCode + ' ' + data.city + ', ' + data.country
      : 'Osoite:  (vain digitaaliset tuotteet)',
    '',
    buildItemLines(data.items),
    '',
    (data.shipping > 0 ? 'Postitus: €' + data.shipping + '\n' : '') + 'Yhteensä: €' + data.total,
    'Maksettu MobilePay:llä ✓',
    data.notes ? ('\nLisätiedot: ' + data.notes) : ''
  ].join('\n');
  MailApp.sendEmail(ADMIN_EMAIL, subject, body);
}

// ============================================================
// Receipt PDF (Google Docs → PDF)
// ============================================================
function createReceiptPdf(data) {
  var veroton = Math.round(data.subtotal / (1 + ALV_RATE) * 100) / 100;
  var alv = Math.round(data.subtotal * ALV_RATE / (1 + ALV_RATE) * 100) / 100;
  var date = new Date(data.orderedAt).toLocaleDateString('fi-FI');

  var doc = DocumentApp.create('Kuitti_' + data.invoiceNumber + '_' + data.orderId);
  var body = doc.getBody();
  body.setPageWidth(595).setPageHeight(842)
      .setMarginTop(50).setMarginBottom(50).setMarginLeft(56).setMarginRight(56);

  var header = body.appendParagraph('TOISET AIJAT');
  header.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  header.editAsText().setFontSize(20).setForegroundColor('#1a3a2a').setBold(true);

  body.appendParagraph('T:mi Toiset Aijat  |  jarle@toisetaijat.fi  |  www.toisetaijat.fi')
      .editAsText().setFontSize(9).setForegroundColor('#6b7280');

  body.appendHorizontalRule();

  var titlePara = body.appendParagraph('TILAUSVAHVISTUS / KUITTI');
  titlePara.editAsText().setFontSize(14).setBold(true).setForegroundColor('#1a3a2a');

  body.appendParagraph('Laskunumero: ' + data.invoiceNumber
      + '   |   Päivämäärä: ' + date
      + '   |   Maksettu MobilePay:llä ✓')
      .editAsText().setFontSize(10).setForegroundColor('#4a4a4a');

  body.appendParagraph('');

  var partiesTable = body.appendTable([
    ['MYYJÄ', 'OSTAJA'],
    [
      'Toiset Aijat – Matti J. Kankaanpää – Perikunta\nJarle M. Alvheim\nSkullerudstubben 24, 1188 Oslo\nY-tunnus: 2901392-1\njarle@toisetaijat.fi',
      data.name + '\n' + data.email
        + (data.phone ? '\n' + data.phone : '')
        + (data.address ? '\n' + data.address + '\n' + data.postalCode + ' ' + data.city : '')
    ]
  ]);
  partiesTable.getRow(0).editAsText().setBold(true).setFontSize(8).setForegroundColor('#9ca3af');
  partiesTable.getRow(1).editAsText().setFontSize(10);
  partiesTable.setBorderWidth(0);

  body.appendParagraph('');

  var rows = [['TUOTE', 'VEROTON', 'ALV', 'YHTEENSÄ']];
  (data.items || []).forEach(function(i) {
    var iv = Math.round(i.price / (1 + ALV_RATE) * 100) / 100;
    rows.push([
      i.title + (i.quantity > 1 ? ' ×' + i.quantity : ''),
      '€' + (iv * i.quantity).toFixed(2),
      '13,5 %',
      '€' + (i.price * i.quantity)
    ]);
  });
  if (data.shipping > 0) {
    rows.push(['Postitus', '', '25,5 %', '€' + data.shipping]);
  }
  rows.push(['', 'Veroton: €' + veroton.toFixed(2), 'ALV: €' + alv.toFixed(2), 'YHTEENSÄ: €' + data.total]);

  var itemTable = body.appendTable(rows);
  itemTable.getRow(0).editAsText().setBold(true).setFontSize(9).setForegroundColor('#1a3a2a');
  itemTable.getRow(rows.length - 1).editAsText().setBold(true).setFontSize(11);
  for (var r = 1; r < rows.length - 1; r++) {
    itemTable.getRow(r).editAsText().setFontSize(10);
  }

  body.appendParagraph('');
  body.appendHorizontalRule();
  body.appendParagraph('Toimitusehdot').editAsText().setBold(true).setFontSize(10);
  body.appendParagraph(
    'Toimitus: Kirjat toimitetaan Suomeen 3–7 arkipäivässä. '
    + 'PDF-artikkelit toimitetaan sähköpostitse tämän viestin liitteenä.\n'
    + 'Peruutus: 14 päivää tavaran vastaanottamisesta (kuluttajansuojalaki). '
    + 'Palautuskulut maksaa ostaja, ellei tuote ole viallinen.\n'
    + 'Reklamaatiot: ' + ADMIN_EMAIL + '\n'
    + 'Täydelliset ehdot: www.toisetaijat.fi/toimitusehdot'
  ).editAsText().setFontSize(9).setForegroundColor('#4a4a4a');

  doc.saveAndClose();

  var docFile = DriveApp.getFileById(doc.getId());
  var folders = DriveApp.getFoldersByName('Toiset Aijat – Laskut');
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('Toiset Aijat – Laskut');
  folder.addFile(docFile);
  DriveApp.getRootFolder().removeFile(docFile);

  var pdfBlob = docFile.getAs('application/pdf');
  pdfBlob.setName('Toiset_Aijat_Kuitti_' + data.invoiceNumber + '.pdf');
  return pdfBlob;
}

// ============================================================
// Confirmation email to customer (HTML + attachments)
// ============================================================
function sendConfirmationEmail(data) {
  var email = data.email;
  if (!email) return;

  var hasBooks       = (data.items || []).some(function(i) { return i.type === 'book'; });
  var articleItems   = (data.items || []).filter(function(i) { return i.type === 'article-collection'; });

    Logger.log('All items: ' + JSON.stringify((data.items || []).map(function(i) { return {id: i.id, type: i.type}; })));
    Logger.log('articleItems count: ' + articleItems.length);
  var articleBlobs = [];
  var missing = [];
  articleItems.forEach(function(item) {
    var fileId = PDF_ARTICLES[item.id];
    if (!fileId) {
      missing.push(item.title);
      Logger.log('Missing Drive ID for: ' + item.id);
      return;
    }
    try {
      var blob = DriveApp.getFileById(fileId).getBlob();
      blob.setName(item.title.replace(/[\/\\:*?"<>|]/g, '_') + '.pdf');
      articleBlobs.push(blob);
    } catch (err) {
      missing.push(item.title);
      Logger.log('Could not fetch file ' + fileId + ': ' + err);
    }
  });

  var receiptBlob = createReceiptPdf(data);
  var palautusehdotBlob = DriveApp.getFileById(PALAUTUSEHDOT_FILE_ID).getBlob();
  palautusehdotBlob.setName('Toiset_Aijat_Palautusehdot.pdf');

  var allAttachments = [receiptBlob, palautusehdotBlob].concat(articleBlobs);

  // --- Build HTML ---
  var veroton = Math.round(data.subtotal / (1 + ALV_RATE) * 100) / 100;
  var alv     = Math.round(data.subtotal * ALV_RATE / (1 + ALV_RATE) * 100) / 100;
  var date    = new Date(data.orderedAt).toLocaleDateString('fi-FI');

  var itemRows = (data.items || []).map(function(i) {
    var iv = Math.round(i.price / (1 + ALV_RATE) * 100) / 100;
    return '<tr>'
      + '<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">' + i.title + (i.quantity > 1 ? ' &times;' + i.quantity : '') + '</td>'
      + '<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">€' + (iv * i.quantity).toFixed(2) + '</td>'
      + '<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">13,5%</td>'
      + '<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">€' + (i.price * i.quantity) + '</td>'
      + '</tr>';
  }).join('');

  var htmlBody = '<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1a1a1a;">'
    + '<div style="background:#1a3a2a;padding:24px 32px;">'
    + '<h1 style="color:#d4a843;font-size:22px;margin:0;font-family:Georgia,serif;">Toiset Aijat</h1>'
    + '<p style="color:#a0c4a8;margin:4px 0 0;font-size:13px;">Matti J. Kankaanpää – Perikunta</p>'
    + '</div>'
    + '<div style="background:#f5f0e8;border:1px solid #e5d9c3;border-top:none;padding:16px 32px;display:flex;justify-content:space-between;">'
    + '<div><strong style="font-size:15px;">Tilausvahvistus / Kuitti</strong><br>'
    + '<span style="font-size:13px;color:#6b7280;">Laskunumero: ' + data.invoiceNumber + ' &nbsp;|&nbsp; Tilausnumero: ' + data.orderId + '</span></div>'
    + '<div style="text-align:right;font-size:13px;color:#6b7280;">' + date + '<br><strong style="color:#2d6a4f;">Maksettu MobilePay:llä ✓</strong></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e5d9c3;border-top:none;">'
    + '<div style="padding:16px 24px;border-right:1px solid #e5d9c3;">'
    + '<p style="font-size:11px;text-transform:uppercase;color:#9ca3af;margin:0 0 6px;">Myyjä</p>'
    + '<strong>Toiset Aijat – Matti J. Kankaanpää – Perikunta</strong><br>'
    + 'Jarle M. Alvheim<br>Skullerudstubben 24, 1188 Oslo<br>'
    + 'Y-tunnus: 2901392-1<br>jarle@toisetaijat.fi<br>www.toisetaijat.fi'
    + '</div>'
    + '<div style="padding:16px 24px;">'
    + '<p style="font-size:11px;text-transform:uppercase;color:#9ca3af;margin:0 0 6px;">Ostaja</p>'
    + '<strong>' + data.name + '</strong><br>'
    + data.email + '<br>'
    + (data.phone ? data.phone + '<br>' : '')
    + (data.address ? data.address + '<br>' + data.postalCode + ' ' + data.city + ', ' + data.country : '')
    + '</div>'
    + '</div>'
    + '<table style="width:100%;border-collapse:collapse;border:1px solid #e5d9c3;border-top:none;font-size:14px;">'
    + '<thead><tr style="background:#f9fafb;">'
    + '<th style="padding:8px;text-align:left;border-bottom:2px solid #e5d9c3;">Tuote</th>'
    + '<th style="padding:8px;text-align:right;border-bottom:2px solid #e5d9c3;">Veroton</th>'
    + '<th style="padding:8px;text-align:center;border-bottom:2px solid #e5d9c3;">ALV</th>'
    + '<th style="padding:8px;text-align:right;border-bottom:2px solid #e5d9c3;">Yhteensä</th>'
    + '</tr></thead>'
    + '<tbody>' + itemRows + '</tbody>'
    + '<tfoot>'
    + (hasBooks && data.shipping > 0 ? '<tr><td style="padding:6px 8px;color:#6b7280;" colspan="3">Postitus</td><td style="padding:6px 8px;text-align:right;color:#6b7280;">€' + data.shipping + '</td></tr>' : '')
    + '<tr style="border-top:2px solid #1a3a2a;">'
    + '<td style="padding:8px;font-size:12px;color:#6b7280;" colspan="2">Veroton hinta: €' + veroton.toFixed(2) + ' &nbsp;|&nbsp; ALV 13,5 %: €' + alv.toFixed(2) + '</td>'
    + '<td style="padding:8px;font-weight:700;font-size:16px;text-align:right;" colspan="2">€' + data.total + '</td>'
    + '</tr>'
    + '</tfoot>'
    + '</table>'
    + (articleBlobs.length > 0
      ? '<div style="border:1px solid #e5d9c3;border-top:none;padding:14px 24px;background:#f0fdf4;font-size:13px;color:#166534;">'
        + '📎 PDF-artikkelit (' + articleBlobs.length + ' kpl) löytyvät tämän viestin liitteistä.'
        + '</div>'
      : '')
    + (missing.length > 0
      ? '<div style="border:1px solid #fde68a;border-top:none;padding:14px 24px;background:#fffbeb;font-size:13px;color:#92400e;">'
        + 'Huom: Seuraavat artikkelit toimitetaan erikseen sähköpostitse: ' + missing.join(', ')
        + '</div>'
      : '')
    + (hasBooks
      ? '<div style="border:1px solid #e5d9c3;border-top:none;padding:14px 24px;background:#fff;font-size:13px;">'
        + '📦 Kirjatilaus toimitetaan postitse lähipäivinä.'
        + '</div>'
      : '')
    + '<div style="border:1px solid #e5d9c3;border-top:none;padding:16px 24px;background:#f9fafb;font-size:12px;color:#4a4a4a;">'
    + '<strong style="font-size:13px;">Toimitusehdot / Palautusehdot</strong><br><br>'
    + '<strong>Toimitus:</strong> Kirjat toimitetaan Suomeen 3–7 arkipäivässä. '
    + 'PDF-artikkelit toimitetaan sähköpostitse tämän viestin liitteenä.<br><br>'
    + '<strong>Peruutus:</strong> 14 päivää tavaran vastaanottamisesta (kuluttajansuojalaki). '
    + 'Palautettavat kirjat tulee lähettää alkuperäisessä kunnossa. Palautuskulut maksaa ostaja, ellei tuote ole viallinen.<br><br>'
    + '<strong>Reklamaatiot:</strong> ' + ADMIN_EMAIL + '<br><br>'
    + 'Täydelliset toimitusehdot: <a href="https://www.toisetaijat.fi/toimitusehdot" style="color:#2d6a4f;">www.toisetaijat.fi/toimitusehdot</a><br>'
    + 'Artikkeleita ei saa jakaa muille ilman tekijänoikeusomistajan lupaa.'
    + '</div>'
    + '<div style="padding:16px 24px;text-align:center;font-size:12px;color:#9ca3af;">'
    + 'Toiset Aijat – Perikunta &nbsp;|&nbsp; jarle@toisetaijat.fi &nbsp;|&nbsp; www.toisetaijat.fi'
    + '</div>'
    + '</div>';

  var plainText = 'Tilausvahvistus ' + data.invoiceNumber + ' / ' + data.orderId + '\n\n'
    + data.name + '\n' + data.email + '\n\n'
    + buildItemLines(data.items) + '\n\n'
    + (data.shipping > 0 ? 'Postitus: €' + data.shipping + '\n' : '')
    + 'Veroton: €' + veroton.toFixed(2) + '\n'
    + 'ALV 13,5%: €' + alv.toFixed(2) + '\n'
    + 'Yhteensä: €' + data.total + '\n\n'
    + 'Maksettu MobilePay:llä ✓\n\n'
    + 'Toiset Aijat – jarle@toisetaijat.fi';

  MailApp.sendEmail({
    to: email,
    subject: 'Tilausvahvistus / Kuitti ' + data.invoiceNumber + ' – Toiset Aijat',
    body: plainText,
    htmlBody: htmlBody,
    name: SENDER_NAME,
    replyTo: REPLY_TO,
    attachments: allAttachments,
  });

  // Notify admin if any articles were missing from Drive
  if (missing.length > 0) {
    MailApp.sendEmail(
      ADMIN_EMAIL,
      '[Toiset Aijat] Puuttuvat artikkelit tilauksessa ' + data.invoiceNumber,
      'Tilaus ' + data.invoiceNumber + ' (' + email + ') sisälsi tuntemattomia artikkeleja:\n'
        + missing.join('\n') + '\n\nTilaus:\n' + JSON.stringify(data, null, 2)
    );
  }
}
