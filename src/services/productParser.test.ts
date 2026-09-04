import { describe, expect, it } from 'vitest';
import { parseShoppingText } from './productParser';

describe('parseShoppingText', () => {
  it('interpreta varios productos y cantidades en español', () => {
    expect(parseShoppingText('dos cafés, leche y un paquete de papel higiénico')).toMatchObject([
      { name: 'Cafés', quantity: 2, unit: 'ud.', category: 'Alimentación' },
      { name: 'Leche', quantity: 1, unit: 'ud.', category: 'Alimentación' },
      { name: 'Papel higiénico', quantity: 1, unit: 'paquete', category: 'Hogar' }
    ]);
  });

  it('no confunde la primera letra de leche con litros', () => {
    expect(parseShoppingText('leche')[0]).toMatchObject({ name: 'Leche', unit: 'ud.' });
  });

  it('entiende peso y litros', () => {
    expect(parseShoppingText('2 kg de pollo y 3 litros de leche')).toMatchObject([
      { name: 'Pollo', quantity: 2, unit: 'kg' },
      { name: 'Leche', quantity: 3, unit: 'L' }
    ]);
  });

  it('separa un dictado sin puntuación cuando reconoce productos consecutivos', () => {
    expect(parseShoppingText('leche huevos tostadas rollo papel de cocina')).toMatchObject([
      { name: 'Leche', category: 'Alimentación' },
      { name: 'Huevos', category: 'Alimentación' },
      { name: 'Tostadas', category: 'Alimentación' },
      { name: 'Papel de cocina', quantity: 1, unit: 'rollo', category: 'Hogar' }
    ]);
  });

  it('conserva los atributos que pertenecen al producto anterior', () => {
    expect(parseShoppingText('leche sin lactosa huevos camperos')).toMatchObject([
      { name: 'Leche sin lactosa' },
      { name: 'Huevos camperos' }
    ]);
  });
});
