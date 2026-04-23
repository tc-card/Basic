/**
 * Google Apps Script backend for tccards.tn analytics
 * Receives analytics via GET requests (?data=JSON) — same pattern as profile.gs
 */

const SPREADSHEET_ID = '1kSpvcLl1onOsi46sp-9Ut1zp9iVIkJHOJAAT5ZzaGkI';
const SHEET_NAME = 'Analysis';

function doGet(e) {
  try {
    // --- Test endpoint ---
    if (e.parameter.action === 'test') {
      return jsonResponse({ status: 'active', message: 'Analytics endpoint is working' });
    }

    // --- Analytics payload arrives as ?data=<JSON> ---
    if (!e.parameter.data) {
      return jsonResponse({ error: 'Missing data parameter' });
    }

    const data = JSON.parse(e.parameter.data);

    if (!data.link || !data.action) {
      return jsonResponse({ error: 'Missing required fields: link and action' });
    }

    const sheet = getSheet();
    const profile = getOrCreateProfile(sheet, data.link);
    const nowIso = new Date().toISOString();

    switch (data.action) {
      case 'visit':
        profile.totalVisits = (Number(profile.totalVisits) || 0) + 1;
        profile.lastVisitAt = nowIso;
        break;
      case 'share':
        profile.shareCount = (Number(profile.shareCount) || 0) + 1;
        profile.lastShareAt = nowIso;
        break;
      case 'contact':
        profile.contactCount = (Number(profile.contactCount) || 0) + 1;
        profile.lastContactAt = nowIso;
        break;
      case 'copy':
        profile.copyCount = (Number(profile.copyCount) || 0) + 1;
        profile.lastCopyAt = nowIso;
        break;
      case 'social':
        if (data.detail) {
          const key = 'social_' + data.detail.id;
          profile[key] = (Number(profile[key]) || 0) + 1;
          profile['lastSocialAt_' + data.detail.id] = nowIso;
          profile['lastSocialHref_' + data.detail.id] = data.detail.href || '';
        }
        break;
    }

    // Sync social counts from client state
    if (data.socialCounts && typeof data.socialCounts === 'object') {
      Object.entries(data.socialCounts).forEach(([key, count]) => {
        profile['social_' + key] = count;
      });
    }

    profile.lastUpdated = nowIso;
    saveProfileData(sheet, profile);

    return jsonResponse({ success: true, action: data.action, link: data.link });

  } catch (err) {
    console.error('Analytics doGet error:', err);
    return jsonResponse({ error: err.message });
  }
}

// Apps Script ContentService — no setHeader/setResponseCode, those don't exist
function jsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ['link', 'totalVisits', 'shareCount', 'contactCount', 'copyCount', 'lastUpdated'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function getOrCreateProfile(sheet, link) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const linkCol = headers.indexOf('link') + 1;
  if (linkCol === 0) throw new Error('No link column found');

  if (lastRow > 1) {
    const linkCells = sheet.getRange(2, linkCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < linkCells.length; i++) {
      if (linkCells[i][0] === link) {
        const row = sheet.getRange(i + 2, 1, 1, lastCol).getValues()[0];
        const profile = {};
        headers.forEach((h, idx) => { profile[h] = row[idx]; });
        return profile;
      }
    }
  }

  // New profile row
  const profile = {
    link, totalVisits: 0, shareCount: 0,
    contactCount: 0, copyCount: 0,
    lastUpdated: new Date().toISOString()
  };
  updateSheetHeaders(sheet, headers, profile);
  const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(updatedHeaders.map(h => profile[h] !== undefined ? profile[h] : ''));
  return profile;
}

function saveProfileData(sheet, profile) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const linkCol = headers.indexOf('link') + 1;
  if (linkCol === 0) throw new Error('No link column found');

  updateSheetHeaders(sheet, headers, profile);
  headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (lastRow <= 1) {
    sheet.appendRow(headers.map(h => profile[h] !== undefined ? profile[h] : ''));
    return;
  }

  const linkCells = sheet.getRange(2, linkCol, lastRow - 1, 1).getValues();
  let rowIndex = -1;
  for (let i = 0; i < linkCells.length; i++) {
    if (linkCells[i][0] === profile.link) { rowIndex = i + 2; break; }
  }

  const rowData = headers.map(h => profile[h] !== undefined ? profile[h] : '');
  if (rowIndex === -1) {
    sheet.appendRow(rowData);
  } else {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  }
}

function updateSheetHeaders(sheet, existingHeaders, profile) {
  const newHeaders = Object.keys(profile).filter(k => !existingHeaders.includes(k));
  if (newHeaders.length > 0) {
    sheet.getRange(1, existingHeaders.length + 1, 1, newHeaders.length).setValues([newHeaders]);
  }
}