import type { Category, Receipt } from '../types';

export interface ManualReceiptInput { store: string; date: string; total: number; concept?: string; category: Category }

export function createManualReceipt(input: ManualReceiptInput): Receipt {
  const store = input.store.trim();
  const concept = input.concept?.trim() || `Compra en ${store}`;
  return {
    id: crypto.randomUUID(), store, date: input.date, total: Math.round(input.total * 100) / 100,
    lines: [{ id: crypto.randomUUID(), name: concept, quantity: 1, unit: 'compra', unitPrice: Math.round(input.total * 100) / 100, total: Math.round(input.total * 100) / 100, category: input.category, confidence: 1, lineType: 'product' }],
    analysisMethod: 'manual', createdAt: new Date().toISOString()
  };
}
