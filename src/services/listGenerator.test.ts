import { describe, expect, it } from 'vitest';
import { sanitizeGeneratedList } from './listGenerator';

describe('sanitizeGeneratedList', () => {
  it('conserva productos concretos y sanea categorías y entradas inválidas', () => {
    const result = sanitizeGeneratedList({ title: 'Paella', summary: '', assumptions: ['Para 10'], items: [
      { name: ' Arroz bomba ', quantity: 1, unit: 'kg', category: 'Alimentación', note: 'Variedad para paella' },
      { name: 'Judía verde plana', quantity: 750, unit: 'g', category: 'otra', note: '' },
      { name: '', quantity: 1, unit: 'ud.', category: 'Otros', note: '' }
    ] });
    expect(result?.items).toHaveLength(2);
    expect(result?.items[0]).toMatchObject({ name: 'Arroz bomba', category: 'Alimentación' });
    expect(result?.items[1].category).toBe('Otros');
  });

  it('rechaza propuestas sin artículos válidos', () => {
    expect(sanitizeGeneratedList({ items: [{ name: 'Arroz bomba', quantity: 0, unit: 'kg' }] })).toBeNull();
  });
});
