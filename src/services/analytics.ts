import type { AppState, Category } from '../types';

export type ExpenseKind = 'all' | 'shopping' | 'fuel';
export type ExpenseCategory = Category | 'Combustible';

export interface ExpenseLine {
  id: string;
  sourceId: string;
  sourceType: 'receipt' | 'refuel';
  date: string;
  merchant: string;
  name: string;
  category: ExpenseCategory;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  isAdjustment?: boolean;
}

export interface AnalyticsData {
  lines: ExpenseLine[];
  total: number;
  documentCount: number;
  conceptCount: number;
  category: Array<[ExpenseCategory, number]>;
  stores: Array<[string, number]>;
  products: Array<[string, number]>;
  months: Array<[string, number]>;
}

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function availableExpenseMonths(state: AppState) {
  return [...new Set([...state.receipts.map(value => value.date.slice(0, 7)), ...state.refuels.map(value => value.date.slice(0, 7))])]
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));
}

export function buildAnalyticsData(state: AppState, month = 'all', kind: ExpenseKind = 'all'): AnalyticsData {
  const lines: ExpenseLine[] = [];
  const acceptsMonth = (date: string) => month === 'all' || date.slice(0, 7) === month;

  if (kind !== 'fuel') {
    state.receipts.filter(receipt => acceptsMonth(receipt.date)).forEach(receipt => {
      let lineSum = 0;
      receipt.lines.forEach(line => {
        lineSum += line.total;
        lines.push({
          id: line.id,
          sourceId: receipt.id,
          sourceType: 'receipt',
          date: receipt.date,
          merchant: receipt.store,
          name: line.name,
          category: line.category,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          amount: line.total
        });
      });
      const difference = roundMoney(receipt.total - lineSum);
      if (Math.abs(difference) >= 0.02) lines.push({
        id: `${receipt.id}-adjustment`, sourceId: receipt.id, sourceType: 'receipt', date: receipt.date,
        merchant: receipt.store, name: 'Ajuste del ticket', category: 'Otros', quantity: 1, unit: 'ud',
        unitPrice: difference, amount: difference, isAdjustment: true
      });
    });
  }

  if (kind !== 'shopping') {
    state.refuels.filter(refuel => acceptsMonth(refuel.date)).forEach(refuel => lines.push({
      id: refuel.id,
      sourceId: refuel.id,
      sourceType: 'refuel',
      date: refuel.date,
      merchant: refuel.station,
      name: refuel.fuelType,
      category: 'Combustible',
      quantity: refuel.liters,
      unit: 'L',
      unitPrice: refuel.pricePerLiter,
      amount: refuel.total
    }));
  }

  const aggregate = <K extends string>(key: (line: ExpenseLine) => K) => {
    const values = new Map<K, number>();
    lines.forEach(line => values.set(key(line), roundMoney((values.get(key(line)) ?? 0) + line.amount)));
    return [...values.entries()].filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  };
  const documents = new Set(lines.map(line => `${line.sourceType}:${line.sourceId}`));
  const total = roundMoney(lines.reduce((sum, line) => sum + line.amount, 0));
  const months = aggregate(line => line.date.slice(0, 7)).sort((a, b) => a[0].localeCompare(b[0]));

  return {
    lines,
    total,
    documentCount: documents.size,
    conceptCount: lines.filter(line => !line.isAdjustment).length,
    category: aggregate(line => line.category),
    stores: aggregate(line => line.merchant),
    products: aggregate(line => line.name),
    months
  };
}
