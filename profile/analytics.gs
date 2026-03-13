/**
 * Google Apps Script backend for tccards.tn analytics
 */

// Configuration
const SPREADSHEET_ID = '1kSpvcLl1onOsi46sp-9Ut1zp9iVIkJHOJAAT5ZzaGkI';
const SHEET_NAME = 'Analysis';

// Main function to handle POST requests
function doPost(e) {
  try {
    // Parse incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.fullState?.link || !data.action) {
      return createResponse(400, {error: 'Missing required fields: link and action'});
    }
    
    // Get or create the spreadsheet
    const sheet = getSheet();
    
    // Get or create profile data
    const profileData = getOrCreateProfile(sheet, data.fullState.link);
    
    // Update counts and timestamps based on action type
    const nowIso = new Date().toISOString();
    switch(data.action) {
      case 'visit':
        profileData.totalVisits = (profileData.totalVisits || 0) + (data.fullState.totalVisits || 1);
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
          // data.detail is { id, href }
          const socialKey = `social_${data.detail.id}`;
          profileData[socialKey] = (profileData[socialKey] || 0) + 1;
          // Save last social click info
          profileData[`lastSocialAt_${data.detail.id}`] = nowIso;
          profileData[`lastSocialHref_${data.detail.id}`] = data.detail.href || '';
        }
        break;
      case 'init':
        // For initialization, update all counts
        profileData.totalVisits = data.fullState.totalVisits || 0;
        profileData.shareCount = data.fullState.shareCount || 0;
        profileData.contactCount = data.fullState.contactCount || 0;
        profileData.copyCount = data.fullState.copyCount || 0;
        break;
    }
    
    // Update social counts from fullState
    if (data.fullState.socialCounts) {
      Object.entries(data.fullState.socialCounts).forEach(([key, count]) => {
        profileData[`social_${key}`] = count;
      });
    }
    
    // Update last activity timestamp
    profileData.lastUpdated = nowIso;
    
    // Save to sheet
    saveProfileData(sheet, profileData);
    
    return createResponse(200, {success: true, action: data.action});
    
  } catch (error) {
    console.error('Error processing analytics data:', error);
    return createResponse(500, {error: error.message});
  }
}

// Helper function to get or create the sheet
function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    // Create headers including dynamic social columns
    const headers = [
      'link',
      'totalVisits',
      'shareCount',
      'contactCount',
      'copyCount',
      'lastUpdated'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

// Helper function to get or create profile data (optimized with getRange and getValues)
function getOrCreateProfile(sheet, link) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const linkCol = headers.indexOf('link') + 1;
  if (linkCol === 0) throw new Error('No link column found');
  const linkCells = sheet.getRange(2, linkCol, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < linkCells.length; i++) {
    if (linkCells[i][0] === link) {
      const row = sheet.getRange(i + 2, 1, 1, headers.length).getValues()[0];
      const profile = {};
      headers.forEach((header, idx) => { profile[header] = row[idx]; });
      return profile;
    }
  }
  // Create new profile (append row)
  const profile = {
    link: link,
    totalVisits: 0,
    shareCount: 0,
    contactCount: 0,
    copyCount: 0,
    lastUpdated: new Date().toISOString()
  };
  // Add any dynamic columns as needed
  updateSheetHeaders(sheet, headers, profile);
  // Prepare row in correct order
  const rowData = headers.map(header => profile[header] || '');
  sheet.appendRow(rowData);
  return profile;
}

// Helper function to save profile data (optimized)
function saveProfileData(sheet, profile) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const linkCol = headers.indexOf('link') + 1;
  if (linkCol === 0) throw new Error('No link column found');
  const linkCells = sheet.getRange(2, linkCol, sheet.getLastRow() - 1, 1).getValues();
  let rowIndex = -1;
  for (let i = 0; i < linkCells.length; i++) {
    if (linkCells[i][0] === profile.link) {
      rowIndex = i + 2; // 1-based, plus header row
      break;
    }
  }
  if (rowIndex === -1) {
    // Should not happen, but append if missing
    updateSheetHeaders(sheet, headers, profile);
    const rowData = headers.map(header => profile[header] || '');
    sheet.appendRow(rowData);
    return;
  }
  // Prepare row data in correct order
  const rowData = headers.map(header => profile[header] || '');
  sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
}

// Helper function to update sheet headers for new social links and new timestamp columns
function updateSheetHeaders(sheet, existingHeaders, profile) {
  // Add social count columns
  const newSocialHeaders = Object.keys(profile)
    .filter(key => key.startsWith('social_') && !existingHeaders.includes(key));
  // Add last action timestamp columns
  const newTimestampHeaders = Object.keys(profile)
    .filter(key => (key.startsWith('last') || key.startsWith('lastSocialAt_') || key.startsWith('lastSocialHref_')) && !existingHeaders.includes(key));
  const allNewHeaders = [...newSocialHeaders, ...newTimestampHeaders];
  if (allNewHeaders.length > 0) {
    const lastCol = existingHeaders.length;
    sheet.getRange(1, lastCol + 1, 1, allNewHeaders.length)
      .setValues([allNewHeaders]);
  }
}

// Helper function to create consistent responses
function createResponse(code, data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Add CORS headers
  const responseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  for (const [key, value] of Object.entries(responseHeaders)) {
    output.setHeader(key, value);
  }
  
  output.setResponseCode(code);
  return output;
}

// Optional GET endpoint for testing
function doGet(e) {
  if (e.parameter.action === 'test') {
    return createResponse(200, {status: 'active', message: 'Analytics endpoint is working'});
  }
  return createResponse(404, {error: 'Endpoint not found'});
}