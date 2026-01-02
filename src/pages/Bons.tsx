import React, { useState, useEffect } from 'react';
import type { Bon } from '../types';
import './Bons.css';
import * as googleSheets from '../services/googleSheetsAppsScript';

const Bons: React.FC = () => {
  const [bons, setBons] = useState<Bon[]>([]);
  const [formData, setFormData] = useState({
    nomClient: '',
    poidsVide: '',
    poidsComplet: '',
    materiel: '',
    prixUnitaire: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<string>('⏳ Loading...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSheetsConnection();
  }, []);

  const checkSheetsConnection = async () => {
    console.log('🔍 [BONS] Checking Google Sheets connection...');
    
    try {
      const connected = await googleSheets.checkConnection();
      console.log('🔍 [BONS] Connection result:', connected);
      
      if (connected) {
        console.log('✅ [BONS] Connected to Google Sheets!');
        setSyncStatus('✅ Connected to Google Sheets');
        await loadBonsData();
      } else {
        console.error('❌ [BONS] Failed to connect to Google Sheets');
        setSyncStatus('❌ Failed to connect - Check AppScript URL');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ [BONS] Error checking connection:', error);
      setSyncStatus('❌ Connection error - ' + (error as Error).message);
      setIsLoading(false);
    }
  };

  const loadBonsData = async () => {
    try {
      console.log('📥 [BONS] Loading data from Google Sheets...');
      const sheetsData = await googleSheets.getAllBons();
      console.log('📥 [BONS] Loaded bons:', sheetsData);
      setBons(sheetsData);
      setSyncStatus(`✅ Synced (${sheetsData.length} bons)`);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ [BONS] Error loading from Sheets:', error);
      setSyncStatus('❌ Error loading data');
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nomClient.trim()) {
      newErrors.nomClient = 'Client name is required';
    }

    if (!formData.poidsVide) {
      newErrors.poidsVide = 'Poids Vide is required';
    } else if (parseFloat(formData.poidsVide) < 0) {
      newErrors.poidsVide = 'Poids Vide must be greater than or equal to 0';
    }

    if (!formData.poidsComplet) {
      newErrors.poidsComplet = 'Poids Complet is required';
    } else if (parseFloat(formData.poidsComplet) <= 0) {
      newErrors.poidsComplet = 'Poids Complet must be greater than 0';
    }

    if (formData.poidsVide && formData.poidsComplet) {
      if (parseFloat(formData.poidsComplet) <= parseFloat(formData.poidsVide)) {
        newErrors.poidsComplet = 'Poids Complet must be greater than Poids Vide';
      }
    }

    if (!formData.materiel.trim()) {
      newErrors.materiel = 'Materiel is required';
    }

    if (!formData.prixUnitaire) {
      newErrors.prixUnitaire = 'Prix Unitaire is required';
    } else if (parseFloat(formData.prixUnitaire) <= 0) {
      newErrors.prixUnitaire = 'Prix Unitaire must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const poidsVide = parseFloat(formData.poidsVide);
    const poidsComplet = parseFloat(formData.poidsComplet);
    const prixUnitaire = parseFloat(formData.prixUnitaire);

    // Calculate montant: (Poids Complet - Poids Vide) * Prix Unitaire
    const montant = (poidsComplet - poidsVide) * prixUnitaire;

    const newBon: Bon = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      nomClient: formData.nomClient,
      poidsVide,
      poidsComplet,
      materiel: formData.materiel,
      prixUnitaire,
      montant,
    };

    const updatedBons = [...bons, newBon];
    setBons(updatedBons);

    try {
      console.log('📤 [BONS] Saving bon to Google Sheets...');
      await googleSheets.addBon(newBon);
      setSyncStatus(`✅ Synced (${updatedBons.length} bons)`);
      console.log('✅ [BONS] Bon saved successfully!');
    } catch (error) {
      console.error('❌ [BONS] Error saving to Sheets:', error);
      setSyncStatus('❌ Error saving - will retry');
    }

    // Reset form
    setFormData({
      nomClient: '',
      poidsVide: '',
      poidsComplet: '',
      materiel: '',
      prixUnitaire: '',
    });
    setErrors({});

    // Dispatch event to update dashboard
    window.dispatchEvent(new Event('storage'));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this bon?')) {
      const updatedBons = bons.filter(bon => bon.id !== id);
      setBons(updatedBons);

      try {
        console.log('🗑️ [BONS] Deleting bon from Google Sheets...');
        await googleSheets.deleteBon(id);
        setSyncStatus(`✅ Synced (${updatedBons.length} bons)`);
        console.log('✅ [BONS] Bon deleted successfully!');
      } catch (error) {
        console.error('❌ [BONS] Error deleting from Sheets:', error);
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

  return (
    <div className="bons-page">
      <div className="page-header">
        <h1>Bons Management</h1>
        <div className="sync-controls">
          <span className="sync-status">{syncStatus}</span>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>⏳ Loading bons from Google Sheets...</p>
        </div>
      ) : (
        <>
        <div className="form-section">
          <h2>Add New Bon</h2>
          <form onSubmit={handleSubmit} className="bon-form">
            <div className="form-group">
              <label htmlFor="nomClient">Nom Client *</label>
              <input
                type="text"
                id="nomClient"
                name="nomClient"
                value={formData.nomClient}
                onChange={handleChange}
                placeholder="Enter client name"
              />
              {errors.nomClient && <span className="error">{errors.nomClient}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="poidsVide">Poids Vide (kg) *</label>
                <input
                  type="number"
                  id="poidsVide"
                  name="poidsVide"
                  value={formData.poidsVide}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                />
                {errors.poidsVide && <span className="error">{errors.poidsVide}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="poidsComplet">Poids Complet (kg) *</label>
                <input
                  type="number"
                  id="poidsComplet"
                  name="poidsComplet"
                  value={formData.poidsComplet}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                />
                {errors.poidsComplet && <span className="error">{errors.poidsComplet}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="materiel">Materiel *</label>
                <input
                  type="text"
                  id="materiel"
                  name="materiel"
                  value={formData.materiel}
                  onChange={handleChange}
                  placeholder="Enter material type"
                />
                {errors.materiel && <span className="error">{errors.materiel}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="prixUnitaire">Prix Unitaire (DH/kg) *</label>
                <input
                  type="number"
                  id="prixUnitaire"
                  name="prixUnitaire"
                  value={formData.prixUnitaire}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                />
                {errors.prixUnitaire && <span className="error">{errors.prixUnitaire}</span>}
              </div>
            </div>

            {formData.poidsVide && formData.poidsComplet && formData.prixUnitaire && (
              <div className="calculation-preview">
                <p>
                  Montant = ({formData.poidsComplet} - {formData.poidsVide}) × {formData.prixUnitaire} = {' '}
                  <strong>
                    {((parseFloat(formData.poidsComplet) - parseFloat(formData.poidsVide)) * parseFloat(formData.prixUnitaire)).toFixed(2)} DH
                  </strong>
                </p>
              </div>
            )}

            <button type="submit" className="submit-button">
              Add Bon
            </button>
          </form>
        </div>

        <div className="table-section">
          <h2>All Bons ({bons.length})</h2>
          {bons.length > 0 ? (
            <div className="table-wrapper">
              <table className="bons-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client Name</th>
                    <th>Poids Vide</th>
                    <th>Poids Complet</th>
                    <th>Materiel</th>
                    <th>Prix Unitaire</th>
                    <th>Montant</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bons.map(bon => (
                    <tr key={bon.id}>
                      <td>{new Date(bon.date).toLocaleDateString()}</td>
                      <td>{bon.nomClient}</td>
                      <td>{(bon.poidsVide ?? 0).toFixed(2)} kg</td>
                      <td>{(bon.poidsComplet ?? 0).toFixed(2)} kg</td>
                      <td>{bon.materiel}</td>
                      <td>{(bon.prixUnitaire ?? 0).toFixed(2)} DH</td>
                      <td className="montant">{(bon.montant ?? 0).toFixed(2)} DH</td>
                      <td>
                        <button
                          onClick={() => handleDelete(bon.id)}
                          className="delete-button"
                          title="Delete bon"
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
            <p className="no-data">No bons added yet. Add your first bon using the form above.</p>
          )}
        </div>
      </>
      )}
    </div>
  );
};

export default Bons;
