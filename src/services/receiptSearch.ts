import type { Receipt, ReceiptLine } from '../types';

export interface ReceiptProductResult { receipt: Receipt; line: ReceiptLine }
export interface ReceiptProductSummary { count: number; total: number }

const normalize = (value: string) => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function searchReceiptProducts(receipts: Receipt[], query: string): ReceiptProductResult[] {
  const term = normalize(query);
  if (!term) return [];
  return receipts.flatMap(receipt => receipt.lines.flatMap(line => {
    if ((line.lineType && line.lineType !== 'product') || !normalize(line.name).includes(term)) return [];
    return [{ receipt, line }];
  })).sort((a, b) => `${b.receipt.date}${b.receipt.time ?? ''}`.localeCompare(`${a.receipt.date}${a.receipt.time ?? ''}`));
}

export function summarizeReceiptProductResults(results: ReceiptProductResult[]): ReceiptProductSummary {
  return {
    count: results.length,
    total: Math.round(results.reduce((sum, result) => sum + result.line.total, 0) * 100) / 100
  };
}
