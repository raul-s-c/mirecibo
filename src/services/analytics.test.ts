import { describe, expect, it } from 'vitest';
import type { AppState } from '../types';
import { availableExpenseMonths, buildAnalyticsData } from './analytics';

const state: AppState = {
  currency: 'EUR', postalCode: '', alerts: [], items: [], vehicles: [],
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
});
