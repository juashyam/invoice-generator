// Google Sheets integration for product catalog
// Simple approach using public sheet with CSV export

import { Product } from '@/types';
import { generateId } from './utils';

// Configuration from environment variables
// Set NEXT_PUBLIC_GOOGLE_SHEET_ID in your .env.local or deployment environment
const SHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || '';

// Expected CSV format:
// Product Name, Price, Unit, Default Quantity
// Paneer, 500, kg, 1
// Cream, 60, piece, 1
// Milk, 50, liter, 0.5

interface SheetProduct {
  name: string;
  price: number;
  unit: string;
  defaultQuantity?: number;
}

let cachedProducts: Product[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'invoice_app_sheet_products_cache';
const CACHE_TIME_KEY = 'invoice_app_sheet_cache_time';

// Load cache from localStorage on module load
if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
    if (cached && cacheTime) {
      const time = parseInt(cacheTime);
      if (Date.now() - time < CACHE_DURATION) {
        cachedProducts = JSON.parse(cached);
        lastFetchTime = time;
      }
    }
  } catch (error) {
    console.error('Failed to load cache from localStorage:', error);
  }
}

export async function fetchProductsFromSheet(sheetId?: string): Promise<Product[]> {
  // Use provided sheetId or fallback to env variable (for backwards compatibility during transition)
  const SHEET_ID_TO_USE = sheetId || SHEET_ID;
  
  // Return cached products if still valid and same sheet ID
  if (cachedProducts && Date.now() - lastFetchTime < CACHE_DURATION && SHEET_ID_TO_USE) {
    return cachedProducts;
  }

  // Return empty array if sheet not configured
  if (!SHEET_ID_TO_USE) {
    return [];
  }

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID_TO_USE}/export?format=csv`;
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch sheet:', response.statusText);
      return cachedProducts || [];
    }

    const csvText = await response.text();
    const products = parseCSV(csvText);
    
    cachedProducts = products;
    lastFetchTime = Date.now();
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(products));
        localStorage.setItem(CACHE_TIME_KEY, lastFetchTime.toString());
      } catch (error) {
        console.error('Failed to save cache to localStorage:', error);
      }
    }
    
    return products;
  } catch (error) {
    console.error('Error fetching products from sheet:', error);
    return cachedProducts || [];
  }
}

function parseCSV(csvText: string): Product[] {
  const lines = csvText.trim().split('\n');
  const products: Product[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles basic cases)
    const parts = line.split(',').map(p => p.trim().replace(/^"|"/g, ''));
    
    if (parts.length >= 3) {
      const [name, priceStr, unit, defaultQtyStr] = parts;
      const price = parseFloat(priceStr);
      const defaultQuantity = defaultQtyStr ? parseFloat(defaultQtyStr) : undefined;

      if (name && !isNaN(price) && unit) {
        products.push({
          id: generateId(),
          name,
          price,
          unit: unit.toLowerCase(),
          defaultQuantity: defaultQuantity && !isNaN(defaultQuantity) ? defaultQuantity : undefined,
          usageCount: 0,
          fromSheet: true,
        });
      }
    }
  }

  return products;
}

// Helper to refresh cache manually
export function clearProductCache(): void {
  cachedProducts = null;
  lastFetchTime = 0;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIME_KEY);
  }
}

// Check if sheet is configured
export function isSheetConfigured(): boolean {
  return SHEET_ID !== '';
}
