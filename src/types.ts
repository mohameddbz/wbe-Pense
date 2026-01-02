// Type definitions for the application

export interface Versement {
  id: string;
  date: string;
  montant: number;
  note?: string;
}

export interface Bon {
  id: string;
  date: string; // ISO date string
  nomClient: string;
  poidsVide: number;
  poidsComplet: number;
  materiel: string;
  prixUnitaire: number;
  montant: number; // Calculated: (poidsComplet - poidsVide) * prixUnitaire
  statut: 'impaye' | 'paye_partiel' | 'paye'; // Payment status
  versements: Versement[]; // Payment history
  montantPaye: number; // Total amount paid
  montantRestant: number; // Remaining amount to pay
}

export interface Frais {
  id: string;
  date: string; // ISO date string
  description: string;
  prix: number;
}

export interface Statistics {
  totalBons: number;
  totalFrais: number;
  benefice: number; // totalBons - totalFrais
}
