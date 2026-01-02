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
  const [selectedBon, setSelectedBon] = useState<Bon | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [editFormData, setEditFormData] = useState({
    nomClient: '',
    poidsVide: '',
    poidsComplet: '',
    materiel: '',
    prixUnitaire: '',
  });
  const userRole = localStorage.getItem('userRole') as 'full' | 'limited' | null;

  useEffect(() => {
    checkSheetsConnection();
    
    // Listen for updates from other components
    const handleUpdate = () => {
      loadBonsData();
    };
    window.addEventListener('bons-updated', handleUpdate);
    return () => window.removeEventListener('bons-updated', handleUpdate);
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
      statut: 'impaye',
      versements: [],
      montantPaye: 0,
      montantRestant: montant,
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

  const handleViewDetails = (bon: Bon) => {
    setSelectedBon(bon);
    setIsViewModalOpen(true);
  };

  const handlePayment = (bon: Bon) => {
    setSelectedBon(bon);
    setPaymentAmount('');
    setPaymentNote('');
    setIsPaymentModalOpen(true);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBon || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedBon.montantRestant) {
      alert(`Le montant doit être entre 0 et ${selectedBon.montantRestant.toFixed(2)} DA`);
      return;
    }

    const newVersement = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      montant: amount,
      note: paymentNote || undefined,
    };

    const newMontantPaye = selectedBon.montantPaye + amount;
    const newMontantRestant = selectedBon.montant - newMontantPaye;
    let newStatut: 'impaye' | 'paye_partiel' | 'paye' = 'impaye';

    if (newMontantRestant === 0) {
      newStatut = 'paye';
    } else if (newMontantPaye > 0) {
      newStatut = 'paye_partiel';
    }

    const updatedBon: Bon = {
      ...selectedBon,
      versements: [...selectedBon.versements, newVersement],
      montantPaye: newMontantPaye,
      montantRestant: newMontantRestant,
      statut: newStatut,
    };

    const updatedBons = bons.map(bon => bon.id === selectedBon.id ? updatedBon : bon);
    setBons(updatedBons);

    try {
      console.log('💵 [BONS] Adding payment to Google Sheets...');
      await googleSheets.updateBon(selectedBon.id, updatedBon);
      setSyncStatus(`✅ Synced (${updatedBons.length} bons)`);
      console.log('✅ [BONS] Payment added successfully!');
      setIsPaymentModalOpen(false);
      setSelectedBon(updatedBon);
    } catch (error) {
      console.error('❌ [BONS] Error adding payment:', error);
      setSyncStatus('❌ Error adding payment');
    }

    window.dispatchEvent(new Event('storage'));
  };

  const handleEdit = (bon: Bon) => {
    setSelectedBon(bon);
    setEditFormData({
      nomClient: bon.nomClient,
      poidsVide: bon.poidsVide.toString(),
      poidsComplet: bon.poidsComplet.toString(),
      materiel: bon.materiel,
      prixUnitaire: bon.prixUnitaire.toString(),
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateBon = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEditForm()) {
      return;
    }

    const poidsVide = parseFloat(editFormData.poidsVide);
    const poidsComplet = parseFloat(editFormData.poidsComplet);
    const prixUnitaire = parseFloat(editFormData.prixUnitaire);
    const montant = (poidsComplet - poidsVide) * prixUnitaire;

    // Recalculate montantRestant based on existing payments
    const montantPaye = selectedBon!.montantPaye || 0;
    const newMontantRestant = montant - montantPaye;
    
    // Update status based on payment
    let newStatut: 'impaye' | 'paye_partiel' | 'paye' = 'impaye';
    if (newMontantRestant === 0) {
      newStatut = 'paye';
    } else if (montantPaye > 0) {
      newStatut = 'paye_partiel';
    }

    const updatedBon: Bon = {
      ...selectedBon!,
      nomClient: editFormData.nomClient,
      poidsVide,
      poidsComplet,
      materiel: editFormData.materiel,
      prixUnitaire,
      montant,
      montantRestant: newMontantRestant,
      statut: newStatut,
      // Preserve payment fields
      versements: selectedBon!.versements || [],
      montantPaye: montantPaye,
    };

    const updatedBons = bons.map(bon => bon.id === selectedBon!.id ? updatedBon : bon);
    setBons(updatedBons);

    try {
      console.log('📝 [BONS] Updating bon in Google Sheets...');
      await googleSheets.updateBon(selectedBon!.id, updatedBon);
      setSyncStatus(`✅ Synced (${updatedBons.length} bons)`);
      console.log('✅ [BONS] Bon updated successfully!');
      setIsEditModalOpen(false);
      setErrors({});
      
      // Scroll to table section
      setTimeout(() => {
        document.querySelector('.table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (error) {
      console.error('❌ [BONS] Error updating in Sheets:', error);
      setSyncStatus('❌ Error updating - will retry');
    }

    window.dispatchEvent(new Event('storage'));
  };

  const validateEditForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!editFormData.nomClient.trim()) {
      newErrors.nomClient = 'Client name is required';
    }

    if (!editFormData.poidsVide) {
      newErrors.poidsVide = 'Poids Vide is required';
    } else if (parseFloat(editFormData.poidsVide) < 0) {
      newErrors.poidsVide = 'Poids Vide must be greater than or equal to 0';
    }

    if (!editFormData.poidsComplet) {
      newErrors.poidsComplet = 'Poids Complet is required';
    } else if (parseFloat(editFormData.poidsComplet) <= 0) {
      newErrors.poidsComplet = 'Poids Complet must be greater than 0';
    }

    if (editFormData.poidsVide && editFormData.poidsComplet) {
      if (parseFloat(editFormData.poidsComplet) <= parseFloat(editFormData.poidsVide)) {
        newErrors.poidsComplet = 'Poids Complet must be greater than Poids Vide';
      }
    }

    if (!editFormData.materiel.trim()) {
      newErrors.materiel = 'Materiel is required';
    }

    if (!editFormData.prixUnitaire) {
      newErrors.prixUnitaire = 'Prix Unitaire is required';
    } else if (parseFloat(editFormData.prixUnitaire) <= 0) {
      newErrors.prixUnitaire = 'Prix Unitaire must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
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
                <label htmlFor="prixUnitaire">Prix Unitaire (DA/kg) *</label>
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
                    {((parseFloat(formData.poidsComplet) - parseFloat(formData.poidsVide)) * parseFloat(formData.prixUnitaire)).toFixed(2)} DA
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
                    <th>Statut</th>
                    <th>Restant</th>
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
                      <td>{(bon.prixUnitaire ?? 0).toFixed(2)} DA</td>
                      <td className="montant">{(bon.montant ?? 0).toFixed(2)} DA</td>
                      <td>
                        <span className={`statut-badge statut-${bon.statut || 'impaye'}`}>
                          {bon.statut === 'paye' ? '✅ Payé' : 
                           bon.statut === 'paye_partiel' ? '⏳ Partiel' : 
                           '❌ Impayé'}
                        </span>
                      </td>
                      <td className="montant-restant">
                        {bon.statut === 'paye' ? '0.00' : (bon.montantRestant ?? 0).toFixed(2)} DA
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleViewDetails(bon)}
                            className="view-button"
                            title="View details"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => handlePayment(bon)}
                            className="payment-button"
                            title="Add payment"
                            disabled={bon.statut === 'paye'}
                          >
                            💰
                          </button>
                          <button
                            onClick={() => handleEdit(bon)}
                            className="edit-button"
                            title="Edit bon"
                          >
                            ✏️
                          </button>
                          {userRole === 'full' && (
                            <button
                              onClick={() => handleDelete(bon.id)}
                              className="delete-button"
                              title="Delete bon"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
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

      {/* View Details Modal */}
      {isViewModalOpen && selectedBon && (
        <div className="modal-overlay" onClick={() => setIsViewModalOpen(false)}>
          <div className="bon-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button-bon" onClick={() => setIsViewModalOpen(false)}>×</button>
            
            <div className="bon-receipt">
              <div className="bon-header">
                <h1>BON DE LIVRAISON</h1>
                <div className="bon-number">N° {selectedBon.id}</div>
              </div>
              
              <div className="bon-info-section">
                <div className="bon-date">
                  <strong>Date:</strong> {new Date(selectedBon.date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric'
                  })}
                </div>
                <div className="bon-client">
                  <strong>Client:</strong> {selectedBon.nomClient}
                </div>
              </div>

              <div className="bon-divider"></div>

              <div className="bon-details">
                <table className="bon-details-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="text-right">Quantité</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Matériel</strong></td>
                      <td className="text-right">{selectedBon.materiel}</td>
                    </tr>
                    <tr className="spacer-row">
                      <td colSpan={2}></td>
                    </tr>
                    <tr>
                      <td>Poids Complet</td>
                      <td className="text-right">{selectedBon.poidsComplet.toFixed(2)} kg</td>
                    </tr>
                    <tr>
                      <td>Poids Vide (Tare)</td>
                      <td className="text-right">- {selectedBon.poidsVide.toFixed(2)} kg</td>
                    </tr>
                    <tr className="total-row">
                      <td><strong>Poids Net</strong></td>
                      <td className="text-right"><strong>{(selectedBon.poidsComplet - selectedBon.poidsVide).toFixed(2)} kg</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bon-divider"></div>

              <div className="bon-calculation">
                <div className="calc-row">
                  <span>Prix Unitaire:</span>
                  <span>{selectedBon.prixUnitaire.toFixed(2)} DA/kg</span>
                </div>
                <div className="calc-row">
                  <span>Poids Net:</span>
                  <span>{(selectedBon.poidsComplet - selectedBon.poidsVide).toFixed(2)} kg</span>
                </div>
                <div className="bon-divider-thin"></div>
                <div className="calc-row total-amount">
                  <span>MONTANT TOTAL:</span>
                  <span>{selectedBon.montant.toFixed(2)} DA</span>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bon-payment-section">
                <h3>Informations de Paiement</h3>
                <div className="payment-status-display">
                  <div className="payment-row">
                    <span>Statut:</span>
                    <span className={`statut-badge statut-${selectedBon.statut || 'impaye'}`}>
                      {selectedBon.statut === 'paye' ? '✅ Payé' : 
                       selectedBon.statut === 'paye_partiel' ? '⏳ Partiellement Payé' : 
                       '❌ Impayé'}
                    </span>
                  </div>
                  <div className="payment-row">
                    <span>Montant Payé:</span>
                    <strong className="text-success">{(selectedBon.montantPaye || 0).toFixed(2)} DA</strong>
                  </div>
                  <div className="payment-row highlight">
                    <span>Montant Restant:</span>
                    <strong className="text-danger">
                      {selectedBon.statut === 'paye' ? '0.00' : (selectedBon.montantRestant || selectedBon.montant).toFixed(2)} DA
                    </strong>
                  </div>
                </div>

                {selectedBon.versements && selectedBon.versements.length > 0 && (
                  <div className="versements-display">
                    <h4>Historique des Versements</h4>
                    <table className="versements-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Montant</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBon.versements.map(v => (
                          <tr key={v.id}>
                            <td>{new Date(v.date).toLocaleDateString('fr-FR')}</td>
                            <td>{v.montant.toFixed(2)} DA</td>
                            <td>{v.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bon-footer">
                <p>Calcul: {(selectedBon.poidsComplet - selectedBon.poidsVide).toFixed(2)} kg × {selectedBon.prixUnitaire.toFixed(2)} DA/kg = {selectedBon.montant.toFixed(2)} DA</p>
              </div>

              <div className="bon-print-button">
                <button onClick={() => window.print()} className="print-btn">🖨️ Imprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedBon && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Bon</h2>
              <button className="close-button" onClick={() => setIsEditModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateBon}>
                <div className="form-group">
                  <label htmlFor="edit-nomClient">Nom Client *</label>
                  <input
                    type="text"
                    id="edit-nomClient"
                    name="nomClient"
                    value={editFormData.nomClient}
                    onChange={handleEditChange}
                    placeholder="Enter client name"
                  />
                  {errors.nomClient && <span className="error">{errors.nomClient}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-poidsVide">Poids Vide (kg) *</label>
                    <input
                      type="number"
                      id="edit-poidsVide"
                      name="poidsVide"
                      value={editFormData.poidsVide}
                      onChange={handleEditChange}
                      placeholder="0.00"
                      step="0.01"
                    />
                    {errors.poidsVide && <span className="error">{errors.poidsVide}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-poidsComplet">Poids Complet (kg) *</label>
                    <input
                      type="number"
                      id="edit-poidsComplet"
                      name="poidsComplet"
                      value={editFormData.poidsComplet}
                      onChange={handleEditChange}
                      placeholder="0.00"
                      step="0.01"
                    />
                    {errors.poidsComplet && <span className="error">{errors.poidsComplet}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-materiel">Materiel *</label>
                    <input
                      type="text"
                      id="edit-materiel"
                      name="materiel"
                      value={editFormData.materiel}
                      onChange={handleEditChange}
                      placeholder="Enter material type"
                    />
                    {errors.materiel && <span className="error">{errors.materiel}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-prixUnitaire">Prix Unitaire (DA/kg) *</label>
                    <input
                      type="number"
                      id="edit-prixUnitaire"
                      name="prixUnitaire"
                      value={editFormData.prixUnitaire}
                      onChange={handleEditChange}
                      placeholder="0.00"
                      step="0.01"
                    />
                    {errors.prixUnitaire && <span className="error">{errors.prixUnitaire}</span>}
                  </div>
                </div>

                {editFormData.poidsVide && editFormData.poidsComplet && editFormData.prixUnitaire && (
                  <div className="calculation-preview">
                    <p>
                      Montant = ({editFormData.poidsComplet} - {editFormData.poidsVide}) × {editFormData.prixUnitaire} = {' '}
                      <strong>
                        {((parseFloat(editFormData.poidsComplet) - parseFloat(editFormData.poidsVide)) * parseFloat(editFormData.prixUnitaire)).toFixed(2)} DA
                      </strong>
                    </p>
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="cancel-button">
                    Cancel
                  </button>
                  <button type="submit" className="submit-button">
                    Update Bon
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Payment Modal */}
      {isPaymentModalOpen && selectedBon && (
        <div className="modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ajouter un Versement</h2>
              <button className="close-button" onClick={() => setIsPaymentModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="payment-info">
                <div className="info-row">
                  <span>Client:</span>
                  <strong>{selectedBon.nomClient}</strong>
                </div>
                <div className="info-row">
                  <span>Montant Total:</span>
                  <strong>{selectedBon.montant.toFixed(2)} DA</strong>
                </div>
                <div className="info-row">
                  <span>Déjà Payé:</span>
                  <strong className="text-success">{(selectedBon.montantPaye || 0).toFixed(2)} DA</strong>
                </div>
                <div className="info-row highlight">
                  <span>Restant à Payer:</span>
                  <strong className="text-danger">
                    {selectedBon.statut === 'paye' ? '0.00' : (selectedBon.montantRestant || selectedBon.montant).toFixed(2)} DA
                  </strong>
                </div>
              </div>

              {selectedBon.versements && selectedBon.versements.length > 0 && (
                <div className="versements-history">
                  <h3>Historique des Versements</h3>
                  <table className="versements-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Montant</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBon.versements.map(v => (
                        <tr key={v.id}>
                          <td>{new Date(v.date).toLocaleDateString('fr-FR')}</td>
                          <td>{v.montant.toFixed(2)} DA</td>
                          <td>{v.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <form onSubmit={handleAddPayment} className="payment-form">
                <div className="form-group">
                  <label htmlFor="paymentAmount">Montant du Versement (DA) *</label>
                  <input
                    type="number"
                    id="paymentAmount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    max={(selectedBon.montantRestant || selectedBon.montant).toFixed(2)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="paymentNote">Note (optionnel)</label>
                  <input
                    type="text"
                    id="paymentNote"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Ajouter une note..."
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="cancel-button">
                    Annuler
                  </button>
                  <button type="submit" className="submit-button">
                    Confirmer le Versement
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bons;
