import React, { useState, useEffect } from 'react';
import type { Bon, Frais } from '../types';
import * as googleSheets from '../services/googleSheetsAppsScript';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [todayBons, setTodayBons] = useState<Bon[]>([]);
  const [todayFrais, setTodayFrais] = useState<Frais[]>([]);
  const [totalBons, setTotalBons] = useState(0);
  const [totalFrais, setTotalFrais] = useState(0);
  const [benefice, setBenefice] = useState(0);

  useEffect(() => {
    loadTodayData();
  }, []);

  useEffect(() => {
    const interval = setInterval(loadTodayData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadTodayData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('📅 [DASHBOARD] Today date:', today);
      
      // Load bons from Google Sheets
      const allBons = await googleSheets.getAllBons();
      console.log('📊 [DASHBOARD] All bons loaded:', allBons);
      console.log('📊 [DASHBOARD] Bons dates:', allBons.map((bon: Bon) => bon.date));
      
      const bonsToday = allBons.filter((bon: Bon) => new Date(bon.date).toLocaleDateString() === new Date().toLocaleDateString());
      console.log('📊 [DASHBOARD] Bons today:', bonsToday);
      
      // Load frais from Google Sheets
      const allFrais = await googleSheets.getAllFrais();
      console.log('💰 [DASHBOARD] All frais loaded:', allFrais);
      
      const fraisToday = allFrais.filter((frais: Frais) => new Date(frais.date).toLocaleDateString() === new Date().toLocaleDateString());
      console.log('💰 [DASHBOARD] Frais today:', fraisToday);
      
      setTodayBons(bonsToday);
      setTodayFrais(fraisToday);
      
      // Calculate totals
      const totalB = bonsToday.reduce((sum: number, bon: Bon) => sum + bon.montant, 0);
      setTotalBons(totalB);
      
      const totalF = fraisToday.reduce((sum: number, frais: Frais) => sum + frais.prix, 0);
      setTotalFrais(totalF);
      
      setBenefice(totalB - totalF);
    } catch (error) {
      console.error('Error loading dashboard data from Sheets:', error);
    }
  };

  return (
    <div className="dashboard">
      <h1>Dashboard - Today's Statistics</h1>
      <p className="dashboard-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      
      <div className="stats-grid">
        <div className="stat-card stat-bons">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Total Montant des Bons</h3>
            <p className="stat-value">{totalBons.toFixed(2)} DH</p>
            <p className="stat-count">{todayBons.length} bons today</p>
          </div>
        </div>
        
        <div className="stat-card stat-frais">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Montant des Frais</h3>
            <p className="stat-value">{totalFrais.toFixed(2)} DH</p>
            <p className="stat-count">{todayFrais.length} frais today</p>
          </div>
        </div>
        
        <div className={`stat-card stat-benefice ${benefice >= 0 ? 'positive' : 'negative'}`}>
          <div className="stat-icon">{benefice >= 0 ? '📈' : '📉'}</div>
          <div className="stat-content">
            <h3>Bénéfice</h3>
            <p className="stat-value">{benefice.toFixed(2)} DH</p>
            <p className="stat-formula">Total Bons - Total Frais</p>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <div className="activity-section">
          <h2>Recent Bons ({todayBons.length})</h2>
          {todayBons.length > 0 ? (
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Materiel</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                {todayBons.slice(0, 5).map(bon => (
                  <tr key={bon.id}>
                    <td>{bon.nomClient}</td>
                    <td>{bon.materiel}</td>
                    <td>{bon.montant.toFixed(2)} DH</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-data">No bons added today</p>
          )}
        </div>

        <div className="activity-section">
          <h2>Recent Frais ({todayFrais.length})</h2>
          {todayFrais.length > 0 ? (
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Prix</th>
                </tr>
              </thead>
              <tbody>
                {todayFrais.slice(0, 5).map(frais => (
                  <tr key={frais.id}>
                    <td>{frais.description}</td>
                    <td>{frais.prix.toFixed(2)} DH</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-data">No frais added today</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
