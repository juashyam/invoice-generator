// Core data models - local-first, auto-save

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  usageCount: number; // For showing frequent customers
  lastUsed: number; // Timestamp
}

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string; // e.g., "kg", "piece", "liter", "pack"
  defaultQuantity?: number; // Optional default quantity (e.g., 0.5 for milk)
  usageCount: number; // For sorting by frequency
  fromSheet?: boolean; // Track if from Google Sheets
}

export interface LineItem {
  id: string;
  productName: string; // Snapshot - immutable
  unitPrice: number; // Snapshot - immutable
  quantity: number;
  unit: string; // Snapshot - immutable (e.g., "kg", "piece")
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string; // Snapshot
  customerPhone?: string; // Snapshot
  customerAddress?: string; // Snapshot
  lineItems: LineItem[];
  subtotal: number; // Derived
  total: number; // Derived
  createdAt: number;
  isDraft: boolean;
  generatedPdfBlob?: string; // Base64 when finalized
}

export interface MerchantConfig {
  businessName: string;
  address1: string;
  address2: string;
  phone: string;
  email?: string;
  gstNumber?: string;
}
