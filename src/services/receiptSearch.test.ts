import { describe, expect, it } from 'vitest';
import type { Receipt } from '../types';
import { searchReceiptProducts } from './receiptSearch';

const receipt = (id: string, date: string, name: string, lineType: 'product' | 'discount' = 'product'): Receipt => ({
  id, store: 'Consum', date, total: 2, createdAt: `${date}T12:00:00Z`, lines: [{ id: `${id}-line`, name, quantity: 1, unit: 'ud.', unitPrice: 2, total: 2, category: 'Alimentación', confidence: 1, lineType }]
});

describe('searchReceiptProducts', () => {
  it('ignora acentos y mayúsculas y ordena lo más reciente primero', () => {
    const results = searchReceiptProducts([receipt('old', '2026-08-01', 'SALMON ENTERO'), receipt('new', '2026-09-01', 'Salmón fresco')], 'salmón');
    expect(results.map(value => value.receipt.id)).toEqual(['new', 'old']);
  });
  it('no muestra descuentos ni resultados para una consulta vacía', () => {
    expect(searchReceiptProducts([receipt('discount', '2026-09-01', 'Descuento salmón', 'discount')], 'salmon')).toEqual([]);
    expect(searchReceiptProducts([receipt('one', '2026-09-01', 'Queso')], ' ')).toEqual([]);
  });
});
