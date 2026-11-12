/**
 * EKSPOR SELURUH SHEET KE CSV
 *
 * Cara pakai:
 *   1. Di editor Apps Script, klik + lalu pilih Script.
 *   2. Beri nama file: ExportCsv
 *   3. Tempel seluruh isi berkas ini.
 *   4. Simpan, lalu jalankan fungsi exportAllSheetsToCsv.
 *   5. Izinkan akses saat diminta.
 *   6. Hasilnya ada di Drive, folder "PMO-CSV-Export".
 *
 * Berkas CSV inilah bahan untuk tahap B3 (impor ke Postgres).
 */

var EXPORT_FOLDER = 'PMO-CSV-Export';

function exportAllSheetsToCsv() {
  var ss = getSpreadsheet_();
  if (!ss) throw new Error('Buka dulu spreadsheet-nya, lalu jalankan lagi.');

  var folder = getOrCreateFolder_(EXPORT_FOLDER);
  var report = [];
  var sheets = ss.getSheets();

  sheets.forEach(function (sheet) {
    var name = sheet.getName();
    var values = sheet.getDataRange().getDisplayValues();

    if (!values.length || values.length < 1) {
      report.push([name, 0, 0, 'kosong, dilewati']);
      return;
    }

    var csv = values.map(function (row) {
      return row.map(csvCell_).join(',');
    }).join('\r\n');

    var safeName = name.replace(/[\\/:*?"<>|]/g, '_');
    var file = folder.createFile(safeName + '.csv', csv, MimeType.CSV);

    report.push([name, values.length, values[0].length, file.getName()]);
  });

  report.forEach(function (r) {
    Logger.log(r[0] + ' | baris: ' + r[1] + ' | kolom: ' + r[2] + ' | ' + r[3]);
  });
  Logger.log('Selesai. Folder: ' + folder.getUrl());

  return report;
}

/** Ekspor satu sheet saja. Contoh: exportOneSheet('USER ACCESS') */
function exportOneSheet(sheetName) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + sheetName);

  var folder = getOrCreateFolder_(EXPORT_FOLDER);
  var values = sheet.getDataRange().getDisplayValues();
  var csv = values.map(function (row) {
    return row.map(csvCell_).join(',');
  }).join('\r\n');

  var file = folder.createFile(sheetName.replace(/[\\/:*?"<>|]/g, '_') + '.csv', csv, MimeType.CSV);
  Logger.log('Selesai: ' + file.getUrl());
  return file.getUrl();
}

function csvCell_(value) {
  var text = String(value === null || value === undefined ? '' : value);
  if (/[",\r\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function getOrCreateFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

/**
 * Ambil spreadsheet yang benar.
 * Utamakan yang sedang terbuka; kalau tidak ada (skrip dijalankan dari editor
 * proyek standalone), pakai SPREADSHEET_ID yang sudah ada di Code.js.
 */
function getSpreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return null;
}
