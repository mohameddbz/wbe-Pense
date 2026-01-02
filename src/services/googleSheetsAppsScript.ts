// ============================================
// GOOGLE APPS SCRIPT SERVICE (NO OAUTH!)
// ============================================

// 🔧 CONFIGURATION
// The URL is provided via Vite env variable: VITE_GOOGLE_APPS_SCRIPT_URL
// Never hardcode secrets here. Configure .env.local instead.
const WEB_APP_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL ?? '';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// BONS FUNCTIONS
// ============================================

export async function getAllBons() {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'getAll',
        type: 'bons'
      })
    });
    
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get bons');
    }
    
    // Convert and map Sheets column names to app property names
    const bons = (result.data || []).map((bon: any) => ({
      id: bon.ID || bon.id,
      date: bon.Date || bon.date,
      nomClient: bon['Nom Client'] || bon.nomClient,
      poidsVide: parseFloat(bon['Poids Vide'] || bon.poidsVide) || 0,
      poidsComplet: parseFloat(bon['Poids Complet'] || bon.poidsComplet) || 0,
      materiel: bon.Materiel || bon.materiel,
      prixUnitaire: parseFloat(bon['Prix Unitaire'] || bon.prixUnitaire) || 0,
      montant: parseFloat(bon.Montant || bon.montant) || 0,
    }));
    
    return bons;
  } catch (error) {
    console.error('Error getting bons:', error);
    throw error;
  }
}

export async function addBon(bon: any) {
  try {
    console.log('🔵 [DEBUG] Sending bon to Sheets:', bon);
    console.log('🔵 [DEBUG] URL:', WEB_APP_URL);
    
    const payload = {
      action: 'add',
      type: 'bons',
      item: bon
    };
    console.log('🔵 [DEBUG] Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload)
    });
    
    console.log('🔵 [DEBUG] Response status:', response.status);
    const responseText = await response.text();
    console.log('🔵 [DEBUG] Response text:', responseText);
    
    const result: ApiResponse = JSON.parse(responseText);
    console.log('🔵 [DEBUG] Parsed result:', result);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to add bon');
    }
    
    console.log('✅ [DEBUG] Bon added successfully!');
    return result;
  } catch (error) {
    console.error('❌ [DEBUG] Error adding bon:', error);
    throw error;
  }
}

export async function deleteBon(id: string) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'delete',
        type: 'bons',
        id: id
      })
    });
    
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete bon');
    }
    
    return result;
  } catch (error) {
    console.error('Error deleting bon:', error);
    throw error;
  }
}

// ============================================
// FRAIS FUNCTIONS
// ============================================

export async function getAllFrais() {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'getAll',
        type: 'frais'
      })
    });
    
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get frais');
    }
    
    // Convert and map Sheets column names to app property names
    const frais = (result.data || []).map((item: any) => ({
      id: item.ID || item.id,
      date: item.Date || item.date,
      description: item.Description || item.description,
      prix: parseFloat(item.Prix || item.prix) || 0,
    }));
    
    return frais;
  } catch (error) {
    console.error('Error getting frais:', error);
    throw error;
  }
}

export async function addFrais(frais: any) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'add',
        type: 'frais',
        item: frais
      })
    });
    
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to add frais');
    }
    
    return result;
  } catch (error) {
    console.error('Error adding frais:', error);
    throw error;
  }
}

export async function deleteFrais(id: string) {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'delete',
        type: 'frais',
        id: id
      })
    });
    
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete frais');
    }
    
    return result;
  } catch (error) {
    console.error('Error deleting frais:', error);
    throw error;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function checkConnection(): Promise<boolean> {
  try {
    console.log('🔍 [DEBUG] Testing connection to:', WEB_APP_URL);
    
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'getAll',
        type: 'bons'
      })
    });
    
    console.log('🔍 [DEBUG] Response status:', response.status);
    const responseText = await response.text();
    console.log('🔍 [DEBUG] Response text:', responseText);
    
    const result: ApiResponse = JSON.parse(responseText);
    console.log('🔍 [DEBUG] Connection result:', result);
    
    return result.success;
  } catch (error) {
    console.error('❌ [DEBUG] Connection check failed:', error);
    console.error('❌ [DEBUG] Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
    });
    return false;
  }
}

export function isConfigured(): boolean {
  // Check if URL has been changed from the placeholder
  return WEB_APP_URL.length > 0 && 
         WEB_APP_URL.startsWith('https://script.google.com/');
}