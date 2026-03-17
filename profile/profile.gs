function findRow(identifier, byId = false) {
  const CACHE_EXPIRATION = 300; // 5 minutes
  const cache = CacheService.getScriptCache();
  const cacheKey = (byId ? 'id_' : 'link_') + identifier.trim();

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

  // Get data more efficiently
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return null; // No data rows

  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0];

  // Clean identifier (no lowercasing)
  const cleanIdentifier = identifier.trim();
  const columnName = byId ? 'ID' : 'Link';
  const columnIndex = headers.findIndex(h => h.toString().trim() === columnName);
  if (columnIndex === -1) throw new Error(`${columnName} column not found`);

  // Search for match (case-sensitive, exact)
  for (let i = 1; i < data.length; i++) {
    const rowValue = String(data[i][columnIndex]).trim();
    const toCompare = byId ? cleanIdentifier : cleanIdentifier.replace(/^@/, '');

    if (rowValue === toCompare || (!byId && rowValue === `@${toCompare}`)) {
      const responseData = {};
      headers.forEach((header, index) => {
        // Basic data cleaning
        responseData[header] = data[i][index] !== null ? 
          String(data[i][index]).trim() : '';
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
    const now = Date.now();
    // If the data has a timestamp field, use it, else add one
    let timestamp = data.timestamp ? Number(data.timestamp) : now;
    // If the timestamp is not a valid number, use now
    if (isNaN(timestamp)) timestamp = now;

    const response = {
      status: 'success',
      data: {
        status: data.Status || 'Inactive',
        Name: data.Name || '',
        Link: data.Link || '',
        timestamp: timestamp,
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
    output.setHeader("Access-Control-Allow-Origin", "*");
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
    errorOutput.setHeader("Access-Control-Allow-Origin", "*");
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
