import type { Bon, Frais } from '../types';

declare const gapi: any;

// Credentials now pulled from Vite env variables. Configure .env.local.
// See SIGNIN_ERROR_FIX.md for setup instructions.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY ?? '';
const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID ?? '';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let initializationAttempted = false;
let initializationSuccessful = false;

// Initialize Google API
export const initGoogleSheets = () => {
  return new Promise((resolve, reject) => {
    if (initializationAttempted) {
      if (initializationSuccessful) {
        resolve(true);
      } else {
        reject(new Error('Google API initialization already failed. App will use localStorage mode.'));
      }
      return;
    }

    initializationAttempted = true;
    
    try {
      console.log('Loading Google API...');
      console.warn('⚠️  If you see OAuth errors, the app will automatically fall back to localStorage mode.');
      console.warn('📖 To enable Google Sheets sync, follow the setup guide in SIGNIN_ERROR_FIX.md');
      
      // Set timeout for initialization
      const initTimeout = setTimeout(() => {
        console.error('Google API initialization timed out');
        reject(new Error('Initialization timeout'));
      }, 10000);

      gapi.load('client:auth2', () => {
        console.log('Google API loaded, initializing...');
        gapi.client
          .init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: [
              'https://sheets.googleapis.com/$discovery/rest?version=v4',
            ],
            scope: SCOPES,
          })
          .then(() => {
            clearTimeout(initTimeout);
            initializationSuccessful = true;
            console.log('✅ Google Sheets API initialized successfully');
            console.log('Client ID configured:', CLIENT_ID.substring(0, 20) + '...');
            resolve(true);
          })
          .catch((error: any) => {
            clearTimeout(initTimeout);
            console.error('❌ Google API initialization failed:', error);
            console.error('Error details:', {
              error: error.error,
              details: error.details,
              message: error.message
            });
            console.warn('📁 App will continue using localStorage mode');
            reject(error);
          });
      }, (error: any) => {
        clearTimeout(initTimeout);
        console.error('Failed to load gapi script:', error);
        reject(error);
      });
    } catch (error) {
      console.error('Exception during Google API initialization:', error);
      reject(error);
    }
  });
};

// Check if user is signed in
export const isSignedIn = (): boolean => {
  const authInstance = gapi.auth2?.getAuthInstance();
  return authInstance?.isSignedIn?.get() || false;
};

// Sign in to Google
export const signInToGoogle = async () => {
  try {
    const authInstance = gapi.auth2.getAuthInstance();
    if (!authInstance) {
      throw new Error('Google API not initialized. Please refresh the page.');
    }
    
    console.log('Attempting to sign in to Google...');
    const result = await authInstance.signIn();
    console.log('Sign-in successful:', result.getBasicProfile().getEmail());
    return result;
  } catch (error: any) {
    console.error('Sign-in error details:', error);
    
    // Provide more specific error messages
    if (error.error === 'popup_closed_by_user') {
      throw new Error('Sign-in cancelled. Please try again.');
    } else if (error.error === 'access_denied') {
      throw new Error('Access denied. Please grant the necessary permissions.');
    } else if (error.error === 'idpiframe_initialization_failed') {
      throw new Error('Google API initialization failed. Please check your internet connection and try refreshing the page.');
    } else {
      throw new Error(error.details || error.error || 'Failed to sign in. Please check your Google credentials and try again.');
    }
  }
};

// Sign out from Google
export const signOutFromGoogle = async () => {
  const authInstance = gapi.auth2.getAuthInstance();
  if (authInstance) {
    await authInstance.signOut();
  }
};

// Save Bon to Google Sheets
export const saveBonToSheets = async (bon: Bon) => {
  const values = [[
    bon.id,
    bon.date,
    bon.nomClient,
    bon.poidsVide,
    bon.poidsComplet,
    bon.materiel,
    bon.prixUnitaire,
    bon.montant,
  ]];

  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Bons!A:H',
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
};

// Save Frais to Google Sheets
export const saveFraisToSheets = async (frais: Frais) => {
  const values = [[
    frais.id,
    frais.date,
    frais.description,
    frais.prix,
  ]];

  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Frais!A:D',
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
};

// Load Bons from Google Sheets
export const loadBonsFromSheets = async (): Promise<Bon[]> => {
  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Bons!A2:H',
  });

  const rows = response.result.values || [];
  return rows.map((row: any[]) => ({
    id: row[0],
    date: row[1],
    nomClient: row[2],
    poidsVide: parseFloat(row[3]),
    poidsComplet: parseFloat(row[4]),
    materiel: row[5],
    prixUnitaire: parseFloat(row[6]),
    montant: parseFloat(row[7]),
  }));
};

// Load Frais from Google Sheets
export const loadFraisFromSheets = async (): Promise<Frais[]> => {
  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Frais!A2:D',
  });

  const rows = response.result.values || [];
  return rows.map((row: any[]) => ({
    id: row[0],
    date: row[1],
    description: row[2],
    prix: parseFloat(row[3]),
  }));
};

// Delete Bon from Google Sheets
export const deleteBonFromSheets = async (bonId: string) => {
  // First, find the row with this ID
  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Bons!A:A',
  });

  const rows = response.result.values || [];
  const rowIndex = rows.findIndex((row: any[]) => row[0] === bonId);

  if (rowIndex !== -1) {
    // Delete the row
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // Bons sheet ID
                dimension: 'ROWS',
                startIndex: rowIndex + 1, // +1 because row 0 is header
                endIndex: rowIndex + 2,
              },
            },
          },
        ],
      },
    });
  }
};

// Delete Frais from Google Sheets
export const deleteFraisFromSheets = async (fraisId: string) => {
  // Similar to deleteBonFromSheets, but for Frais
  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Frais!A:A',
  });

  const rows = response.result.values || [];
  const rowIndex = rows.findIndex((row: any[]) => row[0] === fraisId);

  if (rowIndex !== -1) {
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 1, // Frais sheet ID
                dimension: 'ROWS',
                startIndex: rowIndex + 1,
                endIndex: rowIndex + 2,
              },
            },
          },
        ],
      },
    });
  }
};