import type { Category, Receipt } from '../types';

export interface ManualReceiptInput { store: string; date: string; total: number; concept?: string; category: Category }

export function createManualReceipt(input: ManualReceiptInput): Receipt {
  const store = input.store.trim();
  const concept = input.concept?.trim() || (input.total < 0 ? `Abono de ${store}` : `Compra en ${store}`);
  const unit = input.total < 0 ? 'abono' : 'compra';
  const total = Math.round(input.total * 100) / 100;
  return {
    id: crypto.randomUUID(), store, date: input.date, total,
    lines: [{ id: crypto.randomUUID(), name: concept, quantity: 1, unit, unitPrice: total, total, category: input.category, confidence: 1, lineType: 'product' }],
    analysisMethod: 'manual', createdAt: new Date().toISOString()
  };
}
