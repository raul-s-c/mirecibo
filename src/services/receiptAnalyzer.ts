import { Capacitor } from '@capacitor/core';
import { Script, TextRecognition, type TextBlock } from '@capacitor-mlkit/text-recognition';
import { guessCategory } from './productParser';
import { uid, today } from '../data/seed';
import type { Receipt, ReceiptLine, Refuel } from '../types';

const MONEY = /(-?\d{1,4}[.,]\d{2})\s*€?/g;
const DATE = /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/;
const TIME = /\b([01]?\d|2[0-3]):([0-5]\d)\b/;
const NOISE = /\b(total|subtotal|iva|i\.v\.a|base\s+imponible|cuota|tipo\s+iva|cambio|efectivo|tarjeta|ahorro|descuento|ticket|factura|cif|nif|tel(?:[eé]fono)?|fecha|hora|gracias|atendido|operaci[oó]n|caja|pago|importe\s+total)\b/i;
const TAX_ROW = /^(?:[a-z]\s+)?(?:iva|i\.v\.a)|(?:iva|i\.v\.a)\s*(?:[a-z]|\d)|\b(?:base|cuota)\s+(?:iva|imponible)\b/i;

const number = (value: string) => Number(value.replace(/\./g, '').replace(',', '.'));

function normalizeDate(match?: RegExpMatchArray | null) {
  if (!match) return today();
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function detectStore(lines: string[]) {
  const known = ['Mercadona', 'Carrefour', 'Alcampo', 'Lidl', 'Aldi', 'Consum', 'Dia', 'Eroski', 'Repsol', 'Cepsa', 'Bp', 'Shell', 'Plenoil'];
  const joined = lines.slice(0, 12).join(' ');
  return known.find(value => new RegExp(`\\b${value}\\b`, 'i').test(joined)) ?? lines.find(value => /[a-záéíóúñ]{3}/i.test(value) && !/ticket|factura|cif|nif/i.test(value))?.slice(0, 36) ?? 'Establecimiento';
}

function parseReceiptLines(lines: string[]): ReceiptLine[] {
  return lines.flatMap(raw => {
    const clean = raw.replace(/\s+/g, ' ').trim();
    if (clean.length < 4 || NOISE.test(clean) || TAX_ROW.test(clean) || /^\s*[a-z]\s+(?:10|21|4)(?:[.,]00)?\s*%?\s*$/i.test(clean)) return [];
    const amounts = [...clean.matchAll(MONEY)];
    if (!amounts.length) return [];
    const last = amounts.at(-1)!;
    const total = number(last[1]);
    if (!Number.isFinite(total) || total <= 0 || total > 9999) return [];
    const name = clean.slice(0, last.index)
      .replace(/^\d+\s*[xX]\s*/, '')
      .replace(/\s+\d+[.,]\d{3}\s*(kg|l)?$/i, '')
      .replace(/\s+\d+\s*$/, '')
      .trim();
    if (name.length < 2 || /^\d+$/.test(name)) return [];
    const quantityMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*[xX]\s*/);
    const quantity = quantityMatch ? number(quantityMatch[1]) : 1;
    const unitPrice = amounts.length > 1 ? number(amounts.at(-2)![1]) : total / quantity;
    return [{
      id: uid(),
      name: name.replace(/^./, value => value.toLocaleUpperCase('es')),
      quantity,
      unit: /kg/i.test(clean) ? 'kg' : 'ud.',
      unitPrice,
      total,
      category: guessCategory(name),
      confidence: amounts.length > 1 ? 0.88 : 0.72
    }];
  });
}

export function reconstructReceiptRows(blocks: TextBlock[]): string[] {
  const positioned = blocks.flatMap(block => block.lines).filter(line => line.boundingBox).map(line => ({
    text: line.text.trim(),
    left: line.boundingBox!.left,
    top: line.boundingBox!.top,
    bottom: line.boundingBox!.bottom,
    center: (line.boundingBox!.top + line.boundingBox!.bottom) / 2,
    height: Math.max(1, line.boundingBox!.bottom - line.boundingBox!.top)
  })).filter(line => line.text);
  if (!positioned.length) return blocks.flatMap(block => block.lines.map(line => line.text.trim())).filter(Boolean);
  const heights = positioned.map(line => line.height).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] ?? 12;
  const tolerance = Math.max(7, medianHeight * 0.7);
  const groups: Array<{ center: number; height: number; lines: typeof positioned }> = [];
  positioned.sort((a, b) => a.center - b.center || a.left - b.left).forEach(line => {
    const group = groups.find(value => Math.abs(value.center - line.center) <= Math.max(tolerance, (value.height + line.height) * 0.38));
    if (group) {
      group.lines.push(line);
      group.center = group.lines.reduce((sum, value) => sum + value.center, 0) / group.lines.length;
      group.height = Math.max(group.height, line.height);
    } else groups.push({ center: line.center, height: line.height, lines: [line] });
  });
  return groups.sort((a, b) => a.center - b.center).map(group => group.lines.sort((a, b) => a.left - b.left).map(line => line.text).join(' ').replace(/\s+/g, ' ').trim());
}

export function parseReceiptText(text: string, reconstructedRows?: string[]): Receipt {
  const rawLines = text.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  const lines = reconstructedRows?.length ? reconstructedRows : rawLines;
  const totalLine = [...lines].reverse().find(value => /^\s*total\b/i.test(value));
  const totals = totalLine ? [...totalLine.matchAll(MONEY)] : [];
  const receiptLines = parseReceiptLines(lines);
  const computed = receiptLines.reduce((sum, line) => sum + line.total, 0);
  const total = totals.length ? number(totals.at(-1)![1]) : computed;
  const taxLine = lines.find(value => /\biva\b/i.test(value));
  const taxMatch = taxLine ? [...taxLine.matchAll(MONEY)].at(-1) : undefined;
  const searchText = `${text}\n${lines.join('\n')}`;
  const dateMatch = searchText.match(DATE);
  const timeMatch = searchText.match(TIME);
  return {
    id: uid(),
    store: detectStore([...rawLines, ...lines]),
    date: normalizeDate(dateMatch),
    time: timeMatch?.[0],
    total: Math.round(total * 100) / 100,
    tax: taxMatch ? number(taxMatch[1]) : undefined,
    lines: receiptLines,
    ocrText: text,
    createdAt: new Date().toISOString()
  };
}

export async function recognizeReceipt(path: string): Promise<{ text: string; receipt: Receipt }> {
  if (!Capacitor.isNativePlatform()) throw new Error('El OCR local está disponible en la APK. En web puedes pegar el texto del ticket.');
  const result = await TextRecognition.processImage({ path, script: Script.Latin });
  if (!result.text.trim()) throw new Error('No se ha podido leer texto. Haz otra foto con más luz y el ticket plano.');
  const rows = reconstructReceiptRows(result.blocks);
  return { text: result.text, receipt: { ...parseReceiptText(result.text, rows), imageUri: path, ocrText: result.text, analysisMethod: 'local-ocr' } };
}

export function parseFuelText(text: string, vehicleId: string): Refuel {
  const receipt = parseReceiptText(text);
  const liters = text.match(/(\d{1,3}[.,]\d{2,3})\s*l(?:itros?)?\b/i);
  const price = text.match(/(\d[.,]\d{3})\s*€?\s*\/?\s*l/i);
  const fuel = text.match(/gasolina\s*9[58]|di[eé]sel|gas[oó]leo\s*[ab]?|glp/i);
  const parsedLiters = liters ? number(liters[1]) : price ? receipt.total / number(price[1]) : 0;
  const parsedPrice = price ? number(price[1]) : parsedLiters ? receipt.total / parsedLiters : 0;
  return {
    id: uid(), station: receipt.store, date: receipt.date, fuelType: fuel?.[0] ?? 'Combustible',
    liters: Math.round(parsedLiters * 100) / 100, pricePerLiter: Math.round(parsedPrice * 1000) / 1000,
    total: receipt.total, vehicleId, tags: []
  };
}
