function findRow(identifier, byId = false) {
  const CACHE_EXPIRATION = 300; // 5 minutes
  const cache = CacheService.getScriptCache();
  const cacheKey = (byId ? 'id_' : 'link_') + identifier.toLowerCase().trim();

  // Check cache
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      console.warn('Failed to parse cached data', e);
      cache.remove(cacheKey);
    }
  }

  // Access spreadsheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Form');
  if (!sheet) throw new Error('Form sheet not found');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return null; // No data rows

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const cleanIdentifier = identifier.trim().toLowerCase();
  const columnName = byId ? 'ID' : 'Link';
  const columnIndex = headers.findIndex(h => h.toString().trim() === columnName);
  if (columnIndex === -1) throw new Error(`${columnName} column not found`);

  // Use TextFinder for fast search
  const colRange = sheet.getRange(2, columnIndex + 1, lastRow - 1, 1); // skip header
  const toCompare = byId ? cleanIdentifier : cleanIdentifier.replace(/^@/, '');
  let found = colRange.createTextFinder(toCompare).matchCase(false).matchEntireCell(true).findNext();

  // If not found, try with @ prefix (for link only)
  if (!found && !byId && !toCompare.startsWith('@')) {
    found = colRange.createTextFinder('@' + toCompare).matchCase(false).matchEntireCell(true).findNext();
  }

  if (found) {
    const rowIdx = found.getRow();
    const rowData = sheet.getRange(rowIdx, 1, 1, lastCol).getValues()[0];
    const responseData = {};
    headers.forEach((header, index) => {
      responseData[header] = rowData[index] !== null ? String(rowData[index]).trim() : '';
    });
    // Validate required fields
    if (!responseData.Name) {
      throw new Error('Profile data missing required Name field');
    }
    try {
      cache.put(cacheKey, JSON.stringify(responseData), CACHE_EXPIRATION);
    } catch (e) {
      console.error('Failed to cache data:', e);
    }
    return responseData;
  }
  return null;
}

function doGet(e) {
  try {
    if (!e.parameter) throw new Error('Missing parameters');
    
    // Validate identifier
    const identifier = e.parameter.id || e.parameter.link;
    if (!identifier || typeof identifier !== 'string') {
      throw new Error('Invalid identifier parameter');
    }
    
    // Search for profile
    const data = findRow(identifier, !!e.parameter.id);
    if (!data) throw new Error('Profile not found');

    // Prepare safe response data
    const response = {
      status: 'success',
      data: {
        status: data.Status || 'Inactive',
        Name: data.Name || '',
        Link: data.Link || '',
        // Add other fields as needed
        ...sanitizeProfileData(data)
      }
    };

    // Return response
    const output = ContentService.createTextOutput(
      e.parameter.callback 
        ? `${e.parameter.callback}(${JSON.stringify(response)})`
        : JSON.stringify(response)
    );

    output.setMimeType(
      e.parameter.callback 
        ? ContentService.MimeType.JAVASCRIPT 
        : ContentService.MimeType.JSON
    );

    return output;

  } catch (error) {
    console.error('Error in doGet:', error);
    const errorOutput = ContentService.createTextOutput(
      JSON.stringify({
        status: 'error',
        message: error.message
      })
    );
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    return errorOutput;
  }
}

// Helper functions
function sanitizeProfileData(data) {
  const safeData = {};
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      // Basic XSS protection
      safeData[key] = data[key] ? data[key].toString()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;') : '';
    }
  }
  return safeData;
}
