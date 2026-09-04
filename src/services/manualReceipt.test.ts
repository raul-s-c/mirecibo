import { describe, expect, it, vi } from 'vitest';
import { createManualReceipt } from './manualReceipt';

describe('manual receipts', () => {
  it('creates a minimal expense that participates in analytics', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValueOnce('receipt').mockReturnValueOnce('line') });
    const receipt = createManualReceipt({ store: ' Frutería ', date: '2026-09-04', total: 12, category: 'Alimentación' });
    expect(receipt).toMatchObject({ id: 'receipt', store: 'Frutería', date: '2026-09-04', total: 12, analysisMethod: 'manual' });
    expect(receipt.lines[0]).toMatchObject({ id: 'line', name: 'Compra en Frutería', unitPrice: 12, total: 12, category: 'Alimentación' });
    vi.unstubAllGlobals();
  });
  it('preserves an optional specific concept and rounds cents', () => {
    const receipt = createManualReceipt({ store: 'Mercado', date: '2026-09-04', total: 12.999, concept: 'Fruta y verdura', category: 'Alimentación' });
    expect(receipt.total).toBe(13);
    expect(receipt.lines[0]).toMatchObject({ name: 'Fruta y verdura', total: 13 });
  });
});
