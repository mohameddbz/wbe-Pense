import React, { useState, useEffect } from 'react';
import { initGoogleSheets } from '../services/googleSheets';

const GoogleSheetsDebug: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<any>({
    apiLoaded: false,
    clientIdValid: false,
    apiKeyValid: false,
    authInstanceExists: false,
    isSignedIn: false,
    error: null,
  });

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const results: any = {
      apiLoaded: false,
      clientIdValid: false,
      apiKeyValid: false,
      authInstanceExists: false,
      isSignedIn: false,
      error: null,
    };

    try {
      // Check if gapi is loaded
      results.apiLoaded = typeof (window as any).gapi !== 'undefined';

      if (results.apiLoaded) {
        // Try to initialize
        await initGoogleSheets();

        // Check auth instance
        const authInstance = (window as any).gapi?.auth2?.getAuthInstance();
        results.authInstanceExists = !!authInstance;

        if (authInstance) {
          results.isSignedIn = authInstance.isSignedIn.get();
        }

        results.clientIdValid = true;
        results.apiKeyValid = true;
      }
    } catch (error: any) {
      results.error = error.message || String(error);
      console.error('Diagnostics error:', error);
    }

    setDiagnostics(results);
  };

  const getStatusIcon = (status: boolean) => (status ? '✅' : '❌');

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      padding: '1rem',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      fontSize: '0.85rem',
      maxWidth: '350px',
      zIndex: 1000,
    }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>
        🔍 Google Sheets Diagnostics
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          {getStatusIcon(diagnostics.apiLoaded)} Google API Loaded
        </div>
        <div>
          {getStatusIcon(diagnostics.clientIdValid)} Client ID Valid
        </div>
        <div>
          {getStatusIcon(diagnostics.apiKeyValid)} API Key Valid
        </div>
        <div>
          {getStatusIcon(diagnostics.authInstanceExists)} Auth Instance Created
        </div>
        <div>
          {getStatusIcon(diagnostics.isSignedIn)} User Signed In
        </div>
      </div>

      {diagnostics.error && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: '#fee',
          borderRadius: '5px',
          color: '#c33',
          fontSize: '0.8rem',
          wordBreak: 'break-word',
        }}>
          <strong>Error:</strong> {diagnostics.error}
        </div>
      )}

      <button
        onClick={runDiagnostics}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          background: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        🔄 Re-run Diagnostics
      </button>

      <div style={{
        marginTop: '1rem',
        fontSize: '0.75rem',
        color: '#666',
        borderTop: '1px solid #ddd',
        paddingTop: '0.5rem',
      }}>
        <strong>Note:</strong> Check browser console (F12) for detailed logs
      </div>
    </div>
  );
};

export default GoogleSheetsDebug;
