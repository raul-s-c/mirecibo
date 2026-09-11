import { describe, expect, it } from 'vitest';
import { sanitizeMealPlan } from './mealPlanner';

describe('sanitizeMealPlan', () => {
  it('conserva recetas válidas y separa ingredientes de despensa y compra', () => {
    const result = sanitizeMealPlan({ title: 'Semana', days: [{ label: 'Lunes', date: '2026-09-14', meals: [{ type: 'Cena', name: 'Salmón al horno', description: '', ingredients: [
      { name: 'Salmón fresco', quantity: 400, unit: 'g', source: 'pantry' },
      { name: 'Limón', quantity: 1, unit: 'ud.', source: 'shopping' }
    ], steps: ['Hornear.'] }] }], shoppingItems: [{ name: 'Limón', quantity: 1, unit: 'ud.', category: 'Alimentación', note: '' }] });
    expect(result?.days[0].meals[0].ingredients).toEqual(expect.arrayContaining([expect.objectContaining({ source: 'pantry' }), expect.objectContaining({ source: 'shopping' })]));
    expect(result?.shoppingItems[0].name).toBe('Limón');
  });

  it('rechaza planes sin ninguna receta válida', () => {
    expect(sanitizeMealPlan({ days: [{ label: 'Lunes', meals: [] }] })).toBeNull();
  });
});
