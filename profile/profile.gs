function findRow(identifier, byId = false) {
  const CACHE_EXPIRATION = 300; // 5 minutes
  const cache = CacheService.getScriptCache();
  // Normalize identifier for cache key and search
  const cleanIdentifier = identifier ? identifier.trim().toLowerCase() : '';
  const cacheKey = (byId ? 'id_' : 'link_') + cleanIdentifier.replace(/^@/, '');

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

  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0];
  const columnName = byId ? 'ID' : 'Link';
  const columnIndex = headers.findIndex(h => h.toString().trim() === columnName);
  if (columnIndex === -1) throw new Error(`${columnName} column not found`);

  // Search for match (case-insensitive, handle @ prefix for links)
  for (let i = 1; i < data.length; i++) {
    let rowValue = String(data[i][columnIndex] || '').trim().toLowerCase();
    let toCompare = byId ? cleanIdentifier : cleanIdentifier.replace(/^@/, '');
    if (rowValue === toCompare || (!byId && rowValue === `@${toCompare}`)) {
      const responseData = {};
      headers.forEach((header, index) => {
        responseData[header] = data[i][index] !== null ? String(data[i][index]).trim() : '';
      });
      // Always include a timestamp field (last modified or now)
      responseData.timestamp = getRowTimestamp(sheet, i + 1) || Date.now();
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
  }
  return null;
}

// Helper to get row timestamp (last updated time if available, else now)
function getRowTimestamp(sheet, row) {
  // Try to get last updated time if present in sheet, else return Date.now()
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const tsIdx = headers.findIndex(h => h.toString().toLowerCase().includes('timestamp'));
  if (tsIdx !== -1) {
    const val = sheet.getRange(row, tsIdx + 1).getValue();
    if (val) {
      if (val instanceof Date) return val.getTime();
      if (!isNaN(val)) return Number(val);
    }
  }
  return Date.now();
}

function doGet(e) {
  let output;
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
        timestamp: data.timestamp || Date.now(),
        ...sanitizeProfileData(data)
      }
    };
    output = ContentService.createTextOutput(
      e.parameter.callback
        ? `${e.parameter.callback}(${JSON.stringify(response)})`
        : JSON.stringify(response)
    );
    output.setMimeType(
      e.parameter.callback
        ? ContentService.MimeType.JAVASCRIPT
        : ContentService.MimeType.JSON
    );
  } catch (error) {
    console.error('Error in doGet:', error);
    output = ContentService.createTextOutput(
      JSON.stringify({
        status: 'error',
        message: error.message
      })
    );
    output.setMimeType(ContentService.MimeType.JSON);
  }
  // Always set CORS header
  output.setHeader('Access-Control-Allow-Origin', '*');
  return output;
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
