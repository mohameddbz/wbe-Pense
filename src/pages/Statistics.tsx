import React, { useState, useEffect } from 'react';
import type { Bon, Frais, Statistics } from '../types';
import * as googleSheets from '../services/googleSheetsAppsScript';
import './Statistics.css';

type DateFilter = 'today' | 'yesterday' | 'custom';

const StatisticsPage: React.FC = () => {
  const [filter, setFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState('');
  const [statistics, setStatistics] = useState<Statistics>({
    totalBons: 0,
    totalFrais: 0,
    benefice: 0,
  });
  const [filteredBons, setFilteredBons] = useState<Bon[]>([]);
  const [filteredFrais, setFilteredFrais] = useState<Frais[]>([]);

  useEffect(() => {
    calculateStatistics();
  }, [filter, customDate]);

  const getDateRange = (): { start: string; end: string } => {
    const now = new Date();
    let targetDate: Date;

    switch (filter) {
      case 'today':
        targetDate = now;
        break;
      case 'yesterday':
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() - 1);
        break;
      case 'custom':
        if (!customDate) {
          targetDate = now;
        } else {
          targetDate = new Date(customDate);
        }
        break;
      default:
        targetDate = now;
    }

    const dateStr = targetDate.toISOString().split('T')[0];
    return { start: dateStr, end: dateStr };
  };

  const calculateStatistics = async () => {
    try {
      const { start } = getDateRange();

      // Load data from Google Sheets
      const allBons = await googleSheets.getAllBons();
      const allFrais = await googleSheets.getAllFrais();

      // Filter by date
      const bons = allBons.filter((bon: Bon) => new Date(bon.date).toLocaleDateString() === new Date(start).toLocaleDateString());
      const frais = allFrais.filter((f: Frais) => new Date(f.date).toLocaleDateString() === new Date(start).toLocaleDateString());

      setFilteredBons(bons);
      setFilteredFrais(frais);

      // Calculate totals
      const totalBons = bons.reduce((sum: number, bon: Bon) => sum + bon.montant, 0);
      const totalFrais = frais.reduce((sum: number, f: Frais) => sum + f.prix, 0);
      const benefice = totalBons - totalFrais;

      setStatistics({ totalBons, totalFrais, benefice });
    } catch (error) {
      console.error('Error loading statistics from Sheets:', error);
    }
  };

  const getDisplayDate = (): string => {
    const { start } = getDateRange();
    const date = new Date(start);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="statistics-page">
      <h1>Statistics & Reports</h1>

      <div className="filter-section">
        <div className="filter-buttons">
          <button
            className={filter === 'today' ? 'active' : ''}
            onClick={() => setFilter('today')}
          >
            Today
          </button>
          <button
            className={filter === 'yesterday' ? 'active' : ''}
            onClick={() => setFilter('yesterday')}
          >
            Yesterday
          </button>
          <button
            className={filter === 'custom' ? 'active' : ''}
            onClick={() => setFilter('custom')}
          >
            Custom Date
          </button>
        </div>

        {filter === 'custom' && (
          <div className="custom-date-input">
            <label htmlFor="customDate">Select Date:</label>
            <input
              type="date"
              id="customDate"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}
      </div>

      <div className="stats-display">
        <h2>{getDisplayDate()}</h2>

        <div className="stats-grid">
          <div className="stat-card stat-bons">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>Total Montant des Bons</h3>
              <p className="stat-value">{statistics.totalBons.toFixed(2)} DH</p>
              <p className="stat-count">{filteredBons.length} bons</p>
            </div>
          </div>

          <div className="stat-card stat-frais">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>Total Montant des Frais</h3>
              <p className="stat-value">{statistics.totalFrais.toFixed(2)} DH</p>
              <p className="stat-count">{filteredFrais.length} frais</p>
            </div>
          </div>

          <div className={`stat-card stat-benefice ${statistics.benefice >= 0 ? 'positive' : 'negative'}`}>
            <div className="stat-icon">{statistics.benefice >= 0 ? '📈' : '📉'}</div>
            <div className="stat-content">
              <h3>Bénéfice</h3>
              <p className="stat-value">{statistics.benefice.toFixed(2)} DH</p>
              <p className="stat-formula">Total Bons - Total Frais</p>
            </div>
          </div>
        </div>

        <div className="detailed-breakdown">
          <div className="breakdown-section">
            <h3>Bons Breakdown</h3>
            {filteredBons.length > 0 ? (
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Materiel</th>
                    <th>Poids Net</th>
                    <th>Prix Unitaire</th>
                    <th>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBons.map(bon => (
                    <tr key={bon.id}>
                      <td>{bon.nomClient}</td>
                      <td>{bon.materiel}</td>
                      <td>{(bon.poidsComplet - bon.poidsVide).toFixed(2)} kg</td>
                      <td>{bon.prixUnitaire.toFixed(2)} DH</td>
                      <td className="amount">{bon.montant.toFixed(2)} DH</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}><strong>Total</strong></td>
                    <td className="amount"><strong>{statistics.totalBons.toFixed(2)} DH</strong></td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p className="no-data">No bons for this date</p>
            )}
          </div>

          <div className="breakdown-section">
            <h3>Frais Breakdown</h3>
            {filteredFrais.length > 0 ? (
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFrais.map(frais => (
                    <tr key={frais.id}>
                      <td>{frais.description}</td>
                      <td className="amount">{frais.prix.toFixed(2)} DH</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>Total</strong></td>
                    <td className="amount"><strong>{statistics.totalFrais.toFixed(2)} DH</strong></td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p className="no-data">No frais for this date</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
