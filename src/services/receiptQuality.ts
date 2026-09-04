import type { Receipt, ReceiptLine } from '../types';

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const normalize = (value: string) => value
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export interface ReceiptAudit {
  score: number;
  label: 'Fiable' | 'Revisar' | 'Incompleto';
  lineSum: number;
  difference: number;
  matchesTotal: boolean;
  uncertainCount: number;
  issues: string[];
}

export function auditReceipt(receipt: Receipt): ReceiptAudit {
  const finiteLines = receipt.lines.filter(line => Number.isFinite(line.total) && Number.isFinite(line.quantity));
  const lineSum = roundMoney(finiteLines.reduce((sum, line) => sum + line.total, 0));
  const difference = roundMoney(receipt.total - lineSum);
  const tolerance = Math.max(0.03, Math.abs(receipt.total) * 0.0025);
  const uncertainCount = finiteLines.filter(line => line.confidence < 0.8).length;
  const issues: string[] = [];

  if (!finiteLines.length) issues.push('No hay productos identificados.');
  if (finiteLines.length !== receipt.lines.length) issues.push('Hay líneas con importes o cantidades no válidos.');
  if (uncertainCount) issues.push(`${uncertainCount} ${uncertainCount === 1 ? 'línea necesita' : 'líneas necesitan'} revisión.`);
  if (Math.abs(difference) > tolerance) issues.push(`Faltan por reconciliar ${Math.abs(difference).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}.`);
  if (!receipt.store.trim()) issues.push('Falta el establecimiento.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receipt.date)) issues.push('La fecha no es válida.');

  let score = 100;
  score -= Math.min(36, uncertainCount * 8);
  if (Math.abs(difference) > tolerance) score -= Math.min(42, 16 + Math.round(Math.abs(difference) / Math.max(receipt.total, 1) * 100));
  if (!finiteLines.length) score = 0;
  if (!receipt.store.trim()) score -= 12;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    label: score >= 88 ? 'Fiable' : score >= 60 ? 'Revisar' : 'Incompleto',
    lineSum,
    difference,
    matchesTotal: Math.abs(difference) <= tolerance,
    uncertainCount,
    issues
  };
}

export function receiptFingerprint(receipt: Receipt) {
  const products = receipt.lines
    .filter(line => !line.lineType || line.lineType === 'product')
    .map((line: ReceiptLine) => `${normalize(line.name)}:${roundMoney(line.total)}`)
    .sort()
    .join('|');
  return `${normalize(receipt.store)}|${receipt.date}|${roundMoney(receipt.total)}|${products}`;
}

export function findDuplicateReceipt(receipts: Receipt[], candidate: Receipt) {
  const fingerprint = receiptFingerprint(candidate);
  return receipts.find(receipt => receiptFingerprint(receipt) === fingerprint);
}
