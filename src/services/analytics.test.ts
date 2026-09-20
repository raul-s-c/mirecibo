import { describe, expect, it } from 'vitest';
import type { AppState } from '../types';
import { availableExpenseMonths, buildAnalyticsData } from './analytics';

const state: AppState = {
  currency: 'EUR', postalCode: '', alerts: [], items: [], vehicles: [], categories: [], recurringExpenses: [], pantryItems: [], mealPlans: [],
  receipts: [{ id: 'r1', store: 'Super', date: '2026-08-10', total: 5, createdAt: '', lines: [
    { id: 'l1', name: 'Leche', quantity: 2, unit: 'ud', unitPrice: 2, total: 4, category: 'Alimentación', confidence: 1 }
  ] }],
  refuels: [{ id: 'f1', station: 'Gasolinera', date: '2026-07-12', fuelType: 'Gasolina 95', liters: 20, pricePerLiter: 1.5, total: 30, vehicleId: '', tags: [] }]
};

describe('analytics', () => {
  it('unifica tickets y repostajes y conserva el total real', () => {
    const data = buildAnalyticsData(state);
    expect(data.total).toBe(35);
    expect(data.documentCount).toBe(2);
    expect(data.category).toContainEqual(['Combustible', 30]);
    expect(data.lines.find(line => line.name === 'Ajuste del ticket')?.amount).toBe(1);
  });

  it('filtra por mes y tipo de gasto', () => {
    expect(buildAnalyticsData(state, '2026-08', 'shopping').total).toBe(5);
    expect(buildAnalyticsData(state, '2026-08', 'fuel').total).toBe(0);
    expect(buildAnalyticsData(state, '2026-07', 'fuel').total).toBe(30);
    expect(availableExpenseMonths(state)).toEqual(['2026-08', '2026-07']);
  });

  it('respeta una categoría corregida en un repostaje', () => {
    const corrected = { ...state, refuels: [{ ...state.refuels[0], category: 'Trabajo' }] };
    expect(buildAnalyticsData(corrected, 'all', 'fuel').category).toEqual([['Trabajo', 30]]);
  });

  it('resta abonos del gasto neto y conserva su origen en el desglose', () => {
    const withCredit: AppState = { ...state, receipts: [...state.receipts, {
      id: 'r2', store: 'Ana', date: '2026-08-11', total: -2, createdAt: '', analysisMethod: 'manual',
      lines: [{ id: 'l2', name: 'Bizum por compra compartida', quantity: 1, unit: 'abono', unitPrice: -2, total: -2, category: 'Alimentación', confidence: 1 }]
    }] };
    const data = buildAnalyticsData(withCredit, '2026-08', 'shopping');
    expect(data).toMatchObject({ total: 3, grossExpense: 5, credits: 2 });
    expect(data.category).toContainEqual(['Alimentación', 2]);
    expect(data.stores).toContainEqual(['Ana', -2]);
    expect(data.products).toContainEqual(['Bizum por compra compartida', -2]);
  });
});
