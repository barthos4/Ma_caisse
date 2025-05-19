export interface Transaction {
  id: string;
  orderNumber: string; // N° d'ordre - rendu non optionnel après auto-génération
  date: Date;
  description: string;
  reference?: string; // Référence de la transaction
  amount: number;
  type: 'income' | 'expense';
  categoryId: string; 
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

// For report generation
export interface DatedAmount {
  date: string; // Typically formatted date string e.g., "YYYY-MM-DD" or "MMM 'YY"
  amount: number;
}

export interface AppSettings {
  companyName?: string;
  companyAddress?: string;
  // Future settings can be added here
  // dateFormat?: string; 
  // notificationPreferences?: { email?: boolean; inApp?: boolean };
}
