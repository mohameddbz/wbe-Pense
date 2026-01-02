// Type definitions for the application

export interface Bon {
  id: string;
  date: string; // ISO date string
  nomClient: string;
  poidsVide: number;
  poidsComplet: number;
  materiel: string;
  prixUnitaire: number;
  montant: number; // Calculated: (poidsComplet - poidsVide) * prixUnitaire
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
