import { describe, expect, it } from 'vitest';
import type { Receipt } from '../types';
import { auditReceipt, findDuplicateReceipt } from './receiptQuality';

const receipt = (overrides: Partial<Receipt> = {}): Receipt => ({
  id: 'receipt-1', store: 'Mercadona', date: '2026-08-31', total: 3.65, createdAt: '2026-08-31T18:03:00Z',
  lines: [
    { id: 'a', name: 'Leche', quantity: 1, unit: 'ud.', unitPrice: 1.25, total: 1.25, category: 'Alimentación', confidence: 0.98, lineType: 'product' },
    { id: 'b', name: 'Huevos', quantity: 1, unit: 'ud.', unitPrice: 2.4, total: 2.4, category: 'Alimentación', confidence: 0.94, lineType: 'product' }
  ],
  ...overrides
});

describe('receiptQuality', () => {
  it('considera fiable un ticket cuyas líneas cuadran', () => {
    expect(auditReceipt(receipt())).toMatchObject({ score: 100, label: 'Fiable', matchesTotal: true, difference: 0 });
  });

  it('señala diferencias y líneas inciertas', () => {
    const value = receipt({ total: 5, lines: [{ ...receipt().lines[0], confidence: 0.5 }] });
    const audit = auditReceipt(value);
    expect(audit.matchesTotal).toBe(false);
    expect(audit.uncertainCount).toBe(1);
    expect(audit.issues.length).toBeGreaterThan(1);
  });

  it('detecta duplicados aunque cambien mayúsculas o el identificador', () => {
    const duplicate = receipt({ id: 'another', store: 'MERCADONA' });
    expect(findDuplicateReceipt([receipt()], duplicate)?.id).toBe('receipt-1');
  });
});
