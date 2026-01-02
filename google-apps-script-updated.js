// ============================================
// WEB-PENSE GOOGLE APPS SCRIPT API - VERSION AVEC PAIEMENTS
// ============================================

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Parse request
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      throw new Error('No data provided');
    }
    
    const action = data.action;
    const type = data.type; // 'bons' or 'frais'
    
    // Route to appropriate handler
    switch(action) {
      case 'getAll':
        return getAllItems(sheet, type);
      case 'add':
        return addItem(sheet, type, data.item);
      case 'update':
        return updateItem(sheet, type, data.id, data.item);
      case 'delete':
        return deleteItem(sheet, type, data.id);
      default:
        throw new Error('Unknown action: ' + action);
    }
    
  } catch(error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// HELPER: Format Date
// ============================================
function formatDate(isoString) {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// ============================================
// GET ALL ITEMS
// ============================================
function getAllItems(sheet, type) {
  const sheetName = type === 'bons' ? 'Bons' : 'Frais';
  const targetSheet = sheet.getSheetByName(sheetName);
  
  if (!targetSheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  
  const data = targetSheet.getDataRange().getValues();
  
  // If no data or only headers, return empty array
  if (data.length <= 1) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const headers = data[0];
  const rows = data.slice(1);
  
  const items = rows
    .filter(row => row[0]) // Filter out empty rows
    .map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index];
      });
      return item;
    });
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: items
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// ADD ITEM
// ============================================
function addItem(sheet, type, item) {
  const sheetName = type === 'bons' ? 'Bons' : 'Frais';
  const targetSheet = sheet.getSheetByName(sheetName);
  
  if (!targetSheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  
  // Format date
  const formattedDate = formatDate(item.date);
  
  // Prepare row data based on type
  let rowData;
  if (type === 'bons') {
    rowData = [
      item.id,
      formattedDate,
      item.nomClient || '',
      parseFloat(item.poidsVide) || 0,
      parseFloat(item.poidsComplet) || 0,
      item.materiel || '',
      parseFloat(item.prixUnitaire) || 0,
      parseFloat(item.montant) || 0,
      item.statut || 'impaye',
      item.versements || '[]',
      parseFloat(item.montantPaye) || 0,
      parseFloat(item.montantRestant) || parseFloat(item.montant) || 0
    ];
  } else { // frais
    rowData = [
      item.id,
      formattedDate,
      item.description || '',
      parseFloat(item.prix) || 0
    ];
  }
  
  // Append row
  targetSheet.appendRow(rowData);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: 'Item added successfully'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// UPDATE ITEM
// ============================================
function updateItem(sheet, type, id, item) {
  const sheetName = type === 'bons' ? 'Bons' : 'Frais';
  const targetSheet = sheet.getSheetByName(sheetName);
  
  if (!targetSheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  
  const data = targetSheet.getDataRange().getValues();
  
  // Find row with matching ID (ID is in column A, index 0)
  for (let i = 1; i < data.length; i++) { // Start at 1 to skip header
    if (String(data[i][0]) === String(id)) {
      const formattedDate = formatDate(item.date);
      
      // Prepare row data based on type
      let rowData;
      if (type === 'bons') {
        rowData = [
          item.id,
          formattedDate,
          item.nomClient || '',
          parseFloat(item.poidsVide) || 0,
          parseFloat(item.poidsComplet) || 0,
          item.materiel || '',
          parseFloat(item.prixUnitaire) || 0,
          parseFloat(item.montant) || 0,
          item.statut || 'impaye',
          item.versements || '[]',
          parseFloat(item.montantPaye) || 0,
          parseFloat(item.montantRestant) || 0
        ];
      } else { // frais
        rowData = [
          item.id,
          formattedDate,
          item.description || '',
          parseFloat(item.prix) || 0
        ];
      }
      
      // Update the row
      const range = targetSheet.getRange(i + 1, 1, 1, rowData.length);
      range.setValues([rowData]);
      
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: 'Item updated successfully'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  throw new Error('Item not found with ID: ' + id);
}

// ============================================
// DELETE ITEM
// ============================================
function deleteItem(sheet, type, id) {
  const sheetName = type === 'bons' ? 'Bons' : 'Frais';
  const targetSheet = sheet.getSheetByName(sheetName);
  
  if (!targetSheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  
  const data = targetSheet.getDataRange().getValues();
  
  // Find row with matching ID (ID is in column A, index 0)
  for (let i = 1; i < data.length; i++) { // Start at 1 to skip header
    if (String(data[i][0]) === String(id)) {
      targetSheet.deleteRow(i + 1); // +1 because sheets are 1-indexed
      
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: 'Item deleted successfully'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  throw new Error('Item not found with ID: ' + id);
}

// ============================================
// TEST FUNCTION (Optional - pour tester)
// ============================================
function testAddBon() {
  const testBon = {
    id: '1234567890',
    date: new Date().toISOString(),
    nomClient: 'Test Client',
    poidsVide: 10.5,
    poidsComplet: 50.5,
    materiel: 'Cuivre',
    prixUnitaire: 85.5,
    montant: 3420,
    statut: 'impaye',
    versements: '[]',
    montantPaye: 0,
    montantRestant: 3420
  };
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  return addItem(sheet, 'bons', testBon);
}

function testUpdateBon() {
  const testBon = {
    id: '1234567890',
    date: new Date().toISOString(),
    nomClient: 'Test Client Updated',
    poidsVide: 10.5,
    poidsComplet: 50.5,
    materiel: 'Cuivre',
    prixUnitaire: 85.5,
    montant: 3420,
    statut: 'paye_partiel',
    versements: '[{"id":"123","date":"2026-01-03","montant":1000,"note":"Premier versement"}]',
    montantPaye: 1000,
    montantRestant: 2420
  };
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  return updateItem(sheet, 'bons', '1234567890', testBon);
}
