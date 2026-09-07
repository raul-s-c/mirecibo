import type { AppState, Receipt, RecurringExpense, RecurringFrequency } from '../types';

export const localToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export function advanceRecurringDate(date: string, frequency: RecurringFrequency, preferredDay?: number) {
  const [year, month, day] = date.split('-').map(Number);
  if (frequency === 'weekly') {
    const next = new Date(Date.UTC(year, month - 1, day + 7));
    return next.toISOString().slice(0, 10);
  }
  const targetMonth = frequency === 'monthly' ? month : month - 1;
  const targetYear = frequency === 'yearly' ? year + 1 : year;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(preferredDay ?? day, lastDay);
  return new Date(Date.UTC(targetYear, targetMonth, targetDay)).toISOString().slice(0, 10);
}

export function recurringReceipt(expense: RecurringExpense, occurrenceDate = expense.nextDate): Receipt {
  return {
    id: `recurring-${expense.id}-${occurrenceDate}`,
    store: expense.store.trim(), date: occurrenceDate, total: Math.round(expense.amount * 100) / 100,
    lines: [{ id: `recurring-line-${expense.id}-${occurrenceDate}`, name: expense.concept.trim(), quantity: 1, unit: 'cargo', unitPrice: Math.round(expense.amount * 100) / 100, total: Math.round(expense.amount * 100) / 100, category: expense.category, confidence: 1, lineType: 'product' }],
    analysisMethod: 'manual', analysisWarnings: ['Creado desde un gasto periódico'], createdAt: new Date().toISOString()
  };
}

export function dueReminderExpenses(state: Pick<AppState, 'recurringExpenses'>, today = localToday()) {
  return state.recurringExpenses.filter(expense => expense.active && expense.mode === 'reminder' && expense.nextDate <= today);
}

export function processAutomaticExpenses(state: AppState, today = localToday()) {
  let changed = false;
  const receipts = [...state.receipts];
  const recurringExpenses = state.recurringExpenses.map(expense => {
    if (!expense.active || expense.mode !== 'automatic' || expense.nextDate > today) return expense;
    let nextDate = expense.nextDate;
    let guard = 0;
    while (nextDate <= today && guard < 60) {
      const receipt = recurringReceipt(expense, nextDate);
      if (!receipts.some(value => value.id === receipt.id)) receipts.unshift(receipt);
      nextDate = advanceRecurringDate(nextDate, expense.frequency, expense.dayOfPeriod);
      guard += 1;
    }
    changed = changed || nextDate !== expense.nextDate;
    return { ...expense, nextDate };
  });
  return changed ? { ...state, receipts, recurringExpenses } : state;
}
