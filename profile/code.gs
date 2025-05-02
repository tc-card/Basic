// Find row by link with EXACT matching (case-sensitive)
function findRowByLink(link) {
    const cache = CacheService.getScriptCache();
    const cachedData = cache.get(link); 
    if (cachedData) return JSON.parse(cachedData);
    
    const spreadsheet = SpreadsheetApp.openById('1tvVAN9sQ4yNPV0om2RKb8EiejoYn8eytTOEi9k26g0E');
    const sheet = spreadsheet.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const linkColumnIndex = headers.findIndex(h => h === 'Link');
    
    if (linkColumnIndex === -1) throw new Error('Link column not found');

    const cleanLink = link.trim();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][linkColumnIndex]).trim() === cleanLink) {
            const row = data[i];
            const responseData = {};
            headers.forEach((header, index) => {
                responseData[header] = row[index];
            });
            
            cache.put(cleanLink, JSON.stringify(responseData), 600);
            return responseData;
        }
    }
    return null;
}

// Main GET request handler
function doGet(e) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        if (!e?.parameter?.link) {
            throw new Error('Link parameter is required');
        }

        console.log('Looking up link:', e.parameter.link);
        const data = findRowByLink(e.parameter.link);
        
        if (!data) {
            throw new Error('Profile not found');
        }

        const response = {
            status: data.Status || 'Active',
            ...data
        };

        const callback = e.parameter.callback;
        const responseText = callback 
            ? `${callback}(${JSON.stringify(response)})`
            : JSON.stringify(response);

        return ContentService.createTextOutput(responseText)
            .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON)
            .setHeaders(headers);

    } catch (error) {
        console.error('Error:', error.message);
        return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: error.message
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(headers);
    }
}