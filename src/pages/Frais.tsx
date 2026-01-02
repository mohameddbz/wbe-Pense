import React, { useState, useEffect } from 'react';
import type { Frais } from '../types';
import './Frais.css';
import * as googleSheets from '../services/googleSheetsAppsScript';

const FraisPage: React.FC = () => {
  const [frais, setFrais] = useState<Frais[]>([]);
  const [formData, setFormData] = useState({
    description: '',
    prix: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<string>('⏳ Loading...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSheetsConnection();
  }, []);

  const checkSheetsConnection = async () => {
    console.log('🔍 [FRAIS] Checking Google Sheets connection...');
    
    try {
      const connected = await googleSheets.checkConnection();
      console.log('🔍 [FRAIS] Connection result:', connected);
      
      if (connected) {
        console.log('✅ [FRAIS] Connected to Google Sheets!');
        setSyncStatus('✅ Connected to Google Sheets');
        await loadFrais();
      } else {
        console.error('❌ [FRAIS] Failed to connect to Google Sheets');
        setSyncStatus('❌ Failed to connect - Check AppScript URL');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ [FRAIS] Error checking connection:', error);
      setSyncStatus('❌ Connection error - ' + (error as Error).message);
      setIsLoading(false);
    }
  };

  const loadFrais = async () => {
    try {
      console.log('📥 [FRAIS] Loading data from Google Sheets...');
      const sheetsData = await googleSheets.getAllFrais();
      console.log('📥 [FRAIS] Loaded frais:', sheetsData);
      setFrais(sheetsData);
      setSyncStatus(`✅ Synced (${sheetsData.length} frais)`);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ [FRAIS] Error loading from Sheets:', error);
      setSyncStatus('❌ Error loading data');
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.prix) {
      newErrors.prix = 'Prix is required';
    } else if (parseFloat(formData.prix) <= 0) {
      newErrors.prix = 'Prix must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const newFrais: Frais = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      description: formData.description,
      prix: parseFloat(formData.prix),
    };

    const updatedFrais = [...frais, newFrais];
    setFrais(updatedFrais);

    try {
      console.log('📤 [FRAIS] Saving frais to Google Sheets...');
      await googleSheets.addFrais(newFrais);
      setSyncStatus(`✅ Synced (${updatedFrais.length} frais)`);
      console.log('✅ [FRAIS] Frais saved successfully!');
    } catch (error) {
      console.error('❌ [FRAIS] Error saving to Sheets:', error);
      setSyncStatus('❌ Error saving - will retry');
    }

    // Reset form
    setFormData({
      description: '',
      prix: '',
    });
    setErrors({});

    // Dispatch event to update dashboard
    window.dispatchEvent(new Event('storage'));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this frais?')) {
      const updatedFrais = frais.filter(f => f.id !== id);
      setFrais(updatedFrais);

      try {
        console.log('🗑️ [FRAIS] Deleting frais from Google Sheets...');
        await googleSheets.deleteFrais(id);
        setSyncStatus(`✅ Synced (${updatedFrais.length} frais)`);
        console.log('✅ [FRAIS] Frais deleted successfully!');
      } catch (error) {
        console.error('❌ [FRAIS] Error deleting from Sheets:', error);
        setSyncStatus('❌ Error deleting - will retry');
      }

      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const totalFrais = frais.reduce((sum, f) => sum + f.prix, 0);

  return (
    <div className="frais-page">
      <div className="page-header">
        <h1>Frais Management</h1>
        <div className="sync-controls">
          <span className="sync-status">{syncStatus}</span>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>⏳ Loading frais from Google Sheets...</p>
        </div>
      ) : (
      <div className="frais-container">
        <div className="form-section">
          <h2>Add New Frais</h2>
          <form onSubmit={handleSubmit} className="frais-form">
            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter expense description"
              />
              {errors.description && <span className="error">{errors.description}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="prix">Prix (DH) *</label>
              <input
                type="number"
                id="prix"
                name="prix"
                value={formData.prix}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
              />
              {errors.prix && <span className="error">{errors.prix}</span>}
            </div>

            <button type="submit" className="submit-button">
              Add Frais
            </button>
          </form>
        </div>

        <div className="table-section">
          <div className="table-header">
            <h2>All Frais ({frais.length})</h2>
            <div className="total-badge">
              Total: {(totalFrais ?? 0).toFixed(2)} DH
            </div>
          </div>
          {frais.length > 0 ? (
            <div className="table-wrapper">
              <table className="frais-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Prix</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {frais.map(f => (
                    <tr key={f.id}>
                      <td>{new Date(f.date).toLocaleDateString()}</td>
                      <td>{f.description}</td>
                      <td className="prix">{(f.prix ?? 0).toFixed(2)} DH</td>
                      <td>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="delete-button"
                          title="Delete frais"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">No frais added yet. Add your first frais using the form above.</p>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default FraisPage;
