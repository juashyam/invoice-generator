// Utility functions for invoice calculations

import { LineItem } from '@/types';

export function calculateSubtotal(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
}

export function calculateTotal(lineItems: LineItem[]): number {
  // For v1, total = subtotal (no taxes/discounts)
  return calculateSubtotal(lineItems);
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
