import { describe, expect, it } from 'vitest';
import { initialState } from '../data/seed';
import type { RecurringExpense } from '../types';
import { advanceRecurringDate, dueReminderExpenses, processAutomaticExpenses, recurringReceipt } from './recurringExpenses';

const expense = (patch: Partial<RecurringExpense> = {}): RecurringExpense => ({
  id: 'internet', concept: 'Fibra', store: 'Operadora', amount: 35, category: 'Hogar', frequency: 'monthly', nextDate: '2026-01-31', dayOfPeriod: 31, mode: 'automatic', active: true, createdAt: '', ...patch
});

describe('recurring expenses', () => {
  it('keeps end-of-month dates valid', () => {
    expect(advanceRecurringDate('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(advanceRecurringDate('2028-02-29', 'yearly')).toBe('2029-02-28');
    expect(advanceRecurringDate('2026-02-28', 'monthly', 30)).toBe('2026-03-30');
  });

  it('creates each due automatic occurrence once and advances the schedule', () => {
    const state = { ...initialState, recurringExpenses: [expense()] };
    const processed = processAutomaticExpenses(state, '2026-03-02');
    expect(processed.receipts.map(value => value.date)).toEqual(['2026-02-28', '2026-01-31']);
    expect(processed.recurringExpenses[0].nextDate).toBe('2026-03-31');
    expect(processAutomaticExpenses(processed, '2026-03-02')).toBe(processed);
  });

  it('leaves reminder expenses pending until the user confirms them', () => {
    const reminder = expense({ mode: 'reminder' });
    const state = { ...initialState, recurringExpenses: [reminder] };
    expect(processAutomaticExpenses(state, '2026-02-01')).toBe(state);
    expect(dueReminderExpenses(state, '2026-02-01')).toEqual([reminder]);
    expect(recurringReceipt(reminder)).toMatchObject({ total: 35, store: 'Operadora', date: '2026-01-31', analysisMethod: 'manual' });
  });
});
