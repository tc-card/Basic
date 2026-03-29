/**
 * Google Apps Script backend for tccards.tn analytics
 */

// Configuration
const SPREADSHEET_ID = '1kSpvcLl1onOsi46sp-9Ut1zp9iVIkJHOJAAT5ZzaGkI';
const SHEET_NAME = 'Analysis';

// Main function to handle POST requests
function doPost(e) {
  try {
    // Parse incoming data — works whether Content-Type is application/json or text/plain
    const data = JSON.parse(e.postData.contents);

    // Validate required fields
    if (!data.fullState?.link || !data.action) {
      return jsonResponse({error: 'Missing required fields: link and action'});
    }

    const sheet = getSheet();
    const profileData = getOrCreateProfile(sheet, data.fullState.link);
    const nowIso = new Date().toISOString();

    switch(data.action) {
      case 'visit':
        profileData.totalVisits = (profileData.totalVisits || 0) + 1;
        profileData.lastVisitAt = nowIso;
        break;
      case 'share':
        profileData.shareCount = (profileData.shareCount || 0) + 1;
        profileData.lastShareAt = nowIso;
        break;
      case 'contact':
        profileData.contactCount = (profileData.contactCount || 0) + 1;
        profileData.lastContactAt = nowIso;
        break;
      case 'copy':
        profileData.copyCount = (profileData.copyCount || 0) + 1;
        profileData.lastCopyAt = nowIso;
        break;
      case 'social':
        if (data.detail) {
          const socialKey = 'social_' + data.detail.id;
          profileData[socialKey] = (profileData[socialKey] || 0) + 1;
          profileData['lastSocialAt_' + data.detail.id] = nowIso;
          profileData['lastSocialHref_' + data.detail.id] = data.detail.href || '';
        }
        break;
      case 'init':
        profileData.totalVisits = data.fullState.totalVisits || 0;
        profileData.shareCount = data.fullState.shareCount || 0;
        profileData.contactCount = data.fullState.contactCount || 0;
        profileData.copyCount = data.fullState.copyCount || 0;
        break;
    }

    // Sync social counts from fullState
    if (data.fullState.socialCounts) {
      Object.entries(data.fullState.socialCounts).forEach(([key, count]) => {
        profileData['social_' + key] = count;
      });
    }

    profileData.lastUpdated = nowIso;
    saveProfileData(sheet, profileData);

    return jsonResponse({success: true, action: data.action});

  } catch (error) {
    console.error('Error processing analytics data:', error);
    return jsonResponse({error: error.message});
  }
}

// Returns a plain JSON TextOutput — ContentService does NOT support setHeader()
// or setResponseCode(), so we omit them entirely. Apps Script handles CORS for
// no-cors POST requests automatically (the browser doesn't read the response anyway).
function jsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
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

  // Guard: only read data rows if they exist (lastRow > 1)
  if (lastRow > 1) {
    const linkCells = sheet.getRange(2, linkCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < linkCells.length; i++) {
      if (linkCells[i][0] === link) {
        const row = sheet.getRange(i + 2, 1, 1, lastCol).getValues()[0];
        const profile = {};
        headers.forEach((header, idx) => { profile[header] = row[idx]; });
        return profile;
      }
    }
  }

  // New profile
  const profile = {
    link: link,
    totalVisits: 0,
    shareCount: 0,
    contactCount: 0,
    copyCount: 0,
    lastUpdated: new Date().toISOString()
  };
  updateSheetHeaders(sheet, headers, profile);
  const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = updatedHeaders.map(header => profile[header] !== undefined ? profile[header] : '');
  sheet.appendRow(rowData);
  return profile;
}

function saveProfileData(sheet, profile) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const linkCol = headers.indexOf('link') + 1;
  if (linkCol === 0) throw new Error('No link column found');

  // Add any new dynamic columns before saving
  updateSheetHeaders(sheet, headers, profile);
  const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (lastRow <= 1) {
    // No data rows — append
    const rowData = updatedHeaders.map(h => profile[h] !== undefined ? profile[h] : '');
    sheet.appendRow(rowData);
    return;
  }

  const linkCells = sheet.getRange(2, linkCol, lastRow - 1, 1).getValues();
  let rowIndex = -1;
  for (let i = 0; i < linkCells.length; i++) {
    if (linkCells[i][0] === profile.link) {
      rowIndex = i + 2;
      break;
    }
  }

  if (rowIndex === -1) {
    const rowData = updatedHeaders.map(h => profile[h] !== undefined ? profile[h] : '');
    sheet.appendRow(rowData);
    return;
  }

  const rowData = updatedHeaders.map(h => profile[h] !== undefined ? profile[h] : '');
  sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
}

function updateSheetHeaders(sheet, existingHeaders, profile) {
  const newHeaders = Object.keys(profile).filter(key => !existingHeaders.includes(key));
  if (newHeaders.length > 0) {
    sheet.getRange(1, existingHeaders.length + 1, 1, newHeaders.length).setValues([newHeaders]);
  }
}

// GET endpoint for testing only
function doGet(e) {
  if (e.parameter.action === 'test') {
    return jsonResponse({status: 'active', message: 'Analytics endpoint is working'});
  }
  return jsonResponse({error: 'Endpoint not found'});
}