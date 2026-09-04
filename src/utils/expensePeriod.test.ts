import { describe, expect, it } from 'vitest';
import { expenseSummary } from './expensePeriod';
import type { Receipt, Refuel } from '../types';

describe('expense periods', () => {
  const state = { receipts: [{ date: '2025-12-31', total: 10 } as Receipt], refuels: [{ date: '2026-01-01', total: 20 } as Refuel] };
  it('includes fuel in the selected month without previous-year purchases', () => {
    expect(expenseSummary(state, 'month', '2026-01', 2026)).toMatchObject({ shopping: 0, fuel: 20, total: 20 });
  });
  it('isolates the selected year', () => {
    expect(expenseSummary(state, 'year', '2026-01', 2025)).toMatchObject({ shopping: 10, fuel: 0, total: 10 });
  });
  it('includes the complete history', () => {
    expect(expenseSummary(state, 'all', '2026-01', 2026).total).toBe(30);
  });
  it('returns zero for empty periods', () => {
    expect(expenseSummary(state, 'month', '2024-01', 2024).total).toBe(0);
  });
});
