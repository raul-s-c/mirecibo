import { uid, today } from '../data/seed';
import type { Category, Receipt, ReceiptLine, Refuel } from '../types';
import { aiRequestHeaders, hydrateAiSettings } from './aiSettings';
import { aiFetch } from './aiTransport';
import { recordAiUsage, type AiUsageMeta } from './usageLedger';

interface AiLine {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  total: number;
  category: string;
  confidence: number;
  lineType: 'product' | 'discount' | 'deposit' | 'fee';
}

interface AiResult {
  kind: 'grocery' | 'fuel' | 'unknown';
  isReadable: boolean;
  merchant: { name: string | null; address: string | null };
  transaction: {
    date: string | null;
    time: string | null;
    currency: string;
    total: number | null;
    tax: number | null;
    paymentMethod: string | null;
  };
  items: AiLine[];
  fuel: {
    fuelType: string | null;
    liters: number | null;
    pricePerLiter: number | null;
  };
  warnings: string[];
}

const categories: Category[] = ['Alimentación', 'Hogar', 'Higiene', 'Mascotas', 'Otros'];
const category = (value: string): Category => categories.includes(value as Category) ? value as Category : 'Otros';
const finite = (value: number | null | undefined, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

function toReceiptLine(line: AiLine): ReceiptLine {
  const quantity = Math.max(finite(line.quantity, 1), 0.001);
  const total = finite(line.total);
  return {
    id: uid(),
    name: line.name.trim() || 'Producto sin nombre',
    quantity,
    unit: line.unit.trim() || 'ud.',
    unitPrice: finite(line.unitPrice, total / quantity),
    total,
    category: category(line.category),
    confidence: Math.min(1, Math.max(0, finite(line.confidence, 0.5))),
    lineType: line.lineType
  };
}

async function callAnalyzer(imageBase64: string, mimeType: string, requestedKind: 'ticket' | 'fuel', ocrText = ''): Promise<AiResult> {
  const settings = await hydrateAiSettings();
  if (!settings.endpoint) throw new Error('El servicio inteligente no está disponible.');
  const response = await aiFetch(`${settings.endpoint}/v1/receipts/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...await aiRequestHeaders(settings)
    },
    body: JSON.stringify({ imageBase64, mimeType, requestedKind, ocrText: ocrText.slice(0, 24_000) })
  });
  const payload = await response.json().catch(() => null) as { data?: AiResult; error?: string; usage?: AiUsageMeta } | null;
  recordAiUsage(payload?.usage);
  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error || 'El servicio inteligente no ha podido interpretar el ticket.');
  }
  if (!payload.data.isReadable) throw new Error('La foto no permite leer el ticket completo. Hazla de nuevo, enfocada y sin cortar bordes.');
  return payload.data;
}

export async function analyzeReceiptImage(imageBase64: string, mimeType: string, preview: string, ocrText = ''): Promise<Receipt> {
  const result = await callAnalyzer(imageBase64, mimeType, 'ticket', ocrText);
  const lines = result.items.map(toReceiptLine).filter(line => line.name && Number.isFinite(line.total));
  if (!lines.length) throw new Error('La IA ha leído el ticket, pero no ha identificado productos. No se guardará como si fuera correcto.');
  const storeAddress = result.merchant.address?.trim() || undefined;
  const municipality = storeAddress?.match(/\b\d{5}\s+([^,;(\n]+)/)?.[1]?.trim();
  return {
    id: uid(),
    store: result.merchant.name?.trim() || 'Establecimiento',
    storeAddress,
    storeMunicipality: municipality || undefined,
    date: result.transaction.date || today(),
    time: result.transaction.time || undefined,
    total: finite(result.transaction.total, lines.reduce((sum, line) => sum + line.total, 0)),
    tax: result.transaction.tax ?? undefined,
    lines,
    imageUri: preview,
    ocrText: ocrText || undefined,
    analysisWarnings: result.warnings,
    analysisMethod: 'ai-vision',
    createdAt: new Date().toISOString()
  };
}

export async function analyzeFuelImage(imageBase64: string, mimeType: string, vehicleId: string, ocrText = ''): Promise<Refuel> {
  const result = await callAnalyzer(imageBase64, mimeType, 'fuel', ocrText);
  const total = finite(result.transaction.total);
  const liters = finite(result.fuel.liters);
  const pricePerLiter = finite(result.fuel.pricePerLiter, liters ? total / liters : 0);
  if (!total || !liters) throw new Error('La IA no ha podido confirmar el importe y los litros del repostaje.');
  return {
    id: uid(),
    station: result.merchant.name?.trim() || 'Estación de servicio',
    date: result.transaction.date || today(),
    fuelType: result.fuel.fuelType?.trim() || 'Combustible',
    liters,
    pricePerLiter,
    total,
    vehicleId,
    tags: []
  };
}
