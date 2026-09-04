import type { AppState } from '../types';

export type ExpensePeriod = 'month' | 'year' | 'all';

export function expenseSummary(state: Pick<AppState, 'receipts' | 'refuels'>, mode: ExpensePeriod, month: string, year: number) {
  const matches = (date: string) => mode === 'all' || (mode === 'month' ? date.slice(0, 7) === month : date.slice(0, 4) === String(year));
  const receipts = state.receipts.filter(item => matches(item.date));
  const refuels = state.refuels.filter(item => matches(item.date));
  const shopping = receipts.reduce((sum, item) => sum + item.total, 0);
  const fuel = refuels.reduce((sum, item) => sum + item.total, 0);
  return { receipts, refuels, shopping, fuel, total: shopping + fuel };
}
