// Local-first storage utilities
// All data persists in localStorage, auto-saves on every change

import { Customer, Product, Invoice, MerchantConfig } from '@/types';

const STORAGE_KEYS = {
  CUSTOMERS: 'invoice_app_customers',
  PRODUCTS: 'invoice_app_products',
  DRAFT_INVOICE: 'invoice_app_draft',
  INVOICES: 'invoice_app_invoices',
  MERCHANT_CONFIG: 'invoice_app_merchant_config',
} as const;

// Generic localStorage helpers
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

// Customer operations
export function getCustomers(): Customer[] {
  return getFromStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
}

export function saveCustomer(customer: Customer): void {
  const customers = getCustomers();
  const existingIndex = customers.findIndex(c => c.id === customer.id);
  
  if (existingIndex >= 0) {
    customers[existingIndex] = customer;
  } else {
    customers.push(customer);
  }
  
  saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
}

export function getMostFrequentCustomers(limit = 5): Customer[] {
  return getCustomers()
    .sort((a, b) => b.usageCount - a.usageCount || b.lastUsed - a.lastUsed)
    .slice(0, limit);
}

export function incrementCustomerUsage(customerId: string): void {
  const customers = getCustomers();
  const customer = customers.find(c => c.id === customerId);
  
  if (customer) {
    customer.usageCount += 1;
    customer.lastUsed = Date.now();
    saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
  }
}

// Product operations
export function getProducts(): Product[] {
  return getFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
}

// Get all products: manual + sheet products
export async function getAllProducts(): Promise<Product[]> {
  const { fetchProductsFromSheet } = await import('./sheets');
  const manualProducts = getProducts();
  const sheetProducts = await fetchProductsFromSheet();
  
  // Merge: sheet products first, then manual products not in sheet
  const allProducts = [...sheetProducts];
  
  // Add manual products that don't exist in sheet (by name comparison)
  const sheetProductNames = new Set(sheetProducts.map(p => p.name.toLowerCase()));
  for (const product of manualProducts) {
    if (!product.fromSheet && !sheetProductNames.has(product.name.toLowerCase())) {
      allProducts.push(product);
    }
  }
  
  return allProducts;
}

export function saveProduct(product: Product): void {
  const products = getProducts();
  const existingIndex = products.findIndex(p => p.id === product.id);
  
  if (existingIndex >= 0) {
    products[existingIndex] = product;
  } else {
    products.push(product);
  }
  
  saveToStorage(STORAGE_KEYS.PRODUCTS, products);
}

export function getProductsSortedByUsage(): Product[] {
  return getProducts().sort((a, b) => b.usageCount - a.usageCount);
}

export function incrementProductUsage(productId: string): void {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  
  if (product) {
    product.usageCount += 1;
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
  }
}

// Draft invoice operations
export function getDraftInvoice(): Invoice | null {
  return getFromStorage<Invoice | null>(STORAGE_KEYS.DRAFT_INVOICE, null);
}

export function saveDraftInvoice(invoice: Invoice): void {
  saveToStorage(STORAGE_KEYS.DRAFT_INVOICE, invoice);
}

export function clearDraftInvoice(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.DRAFT_INVOICE);
  }
}

// Finalized invoices
export function saveInvoice(invoice: Invoice): void {
  const invoices = getFromStorage<Invoice[]>(STORAGE_KEYS.INVOICES, []);
  invoices.push(invoice);
  saveToStorage(STORAGE_KEYS.INVOICES, invoices);
}

export function getInvoices(): Invoice[] {
  return getFromStorage<Invoice[]>(STORAGE_KEYS.INVOICES, []);
}

// Merchant configuration
const DEFAULT_MERCHANT_CONFIG: MerchantConfig = {
  businessName: '',
  address1: '',
  address2: '',
  phone: '',
  email: '',
  gstNumber: '',
};

export function getMerchantConfig(): MerchantConfig {
  return getFromStorage<MerchantConfig>(STORAGE_KEYS.MERCHANT_CONFIG, DEFAULT_MERCHANT_CONFIG);
}

export function saveMerchantConfig(config: MerchantConfig): void {
  saveToStorage(STORAGE_KEYS.MERCHANT_CONFIG, config);
}
