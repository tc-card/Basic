function findRow(identifier, byId = false) {
  const CACHE_EXPIRATION = 300;
  const cache = CacheService.getScriptCache();
  // Use the identifier as‑is (case‑sensitive)
  const cacheKey = (byId ? 'id_' : 'link_') + identifier.trim();

  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    try { return JSON.parse(cachedData); } catch (e) { cache.remove(cacheKey); }
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Form');
  if (!sheet) throw new Error('Form sheet not found');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return null;
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0];
  const columnName = byId ? 'ID' : 'Link';
  const columnIndex = headers.findIndex(h => h.toString().trim() === columnName);
  if (columnIndex === -1) throw new Error(`${columnName} column not found`);

  // Exact match – case‑sensitive, no lowercasing
  for (let i = 1; i < data.length; i++) {
    const rowValue = String(data[i][columnIndex]).trim();
    if (rowValue === identifier.trim()) {
      const responseData = {};
      headers.forEach((header, index) => {
        responseData[header] = data[i][index] !== null ? String(data[i][index]).trim() : '';
      });
      if (!responseData.Name) throw new Error('Profile data missing required Name field');
      try { cache.put(cacheKey, JSON.stringify(responseData), CACHE_EXPIRATION); } catch (e) {}
      return responseData;
    }
  }
  return null;
}

function doGet(e) {
  try {
    if (!e.parameter) throw new Error('Missing parameters');
    const identifier = (e.parameter.id || e.parameter.link || '').trim();
    if (!identifier) throw new Error('Invalid identifier parameter');
    const data = findRow(identifier, !!e.parameter.id);
    if (!data) throw new Error('Profile not found');
    const response = {
      status: 'success',
      data: {
        status: data.Status || 'Inactive',
        Name: data.Name || '',
        Link: data.Link || '',
        ...sanitizeProfileData(data)
      }
    };
    const output = ContentService.createTextOutput(
      e.parameter.callback ? `${e.parameter.callback}(${JSON.stringify(response)})` : JSON.stringify(response)
    );
    output.setMimeType(e.parameter.callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
    return output;
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sanitizeProfileData(data) {
  const safe = {};
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      safe[key] = data[key] ? data[key].toString().replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
    }
  }
  return safe;
}
function clearCache() { CacheService.getScriptCache().removeAll(); }