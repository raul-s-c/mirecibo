import { Preferences } from '@capacitor/preferences';

export type AiUsageAction = 'receipt_scan' | 'fuel_scan' | 'voice_dictation' | 'generate_list' | 'price_comparison';

export interface AiUsageMeta {
  action: AiUsageAction;
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  requestCount: number;
  estimatedCostUsd: number;
  cacheHit: boolean;
}

export interface AiUsageRecord extends AiUsageMeta {
  id: string;
  createdAt: string;
}

const STORAGE_KEY = 'mirecibo-ai-usage-v1';
const MAX_RECORDS = 250;
export const AI_USAGE_UPDATED = 'mirecibo-ai-usage-updated';

function validUsage(value: unknown): value is AiUsageMeta {
  if (!value || typeof value !== 'object') return false;
  const usage = value as Partial<AiUsageMeta>;
  return typeof usage.action === 'string' && typeof usage.model === 'string' &&
    typeof usage.inputTokens === 'number' && typeof usage.outputTokens === 'number' &&
    typeof usage.totalTokens === 'number' && typeof usage.estimatedCostUsd === 'number';
}

function parseRecords(value: string | null): AiUsageRecord[] {
  if (!value) return [];
  try {
    const records = JSON.parse(value) as unknown;
    return Array.isArray(records) ? records.filter((record): record is AiUsageRecord => validUsage(record) &&
      typeof (record as Partial<AiUsageRecord>).id === 'string' && typeof (record as Partial<AiUsageRecord>).createdAt === 'string').slice(0, MAX_RECORDS) : [];
  } catch { return []; }
}

function localRecords() {
  return parseRecords(localStorage.getItem(STORAGE_KEY));
}

export async function loadAiUsageRecords(): Promise<AiUsageRecord[]> {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('usage-demo')) return [
    { id: 'usage-demo-ticket', createdAt: '2026-09-03T16:42:00.000Z', action: 'receipt_scan', model: 'gpt-5.4-mini-2026-03-17', inputTokens: 8_421, cachedInputTokens: 0, outputTokens: 1_164, reasoningTokens: 312, totalTokens: 9_585, requestCount: 1, estimatedCostUsd: 0.01155375, cacheHit: false },
    { id: 'usage-demo-prices', createdAt: '2026-09-03T16:37:00.000Z', action: 'price_comparison', model: 'gpt-5.4-mini-2026-03-17', inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0, requestCount: 0, estimatedCostUsd: 0, cacheHit: true }
  ];
  const local = localRecords();
  if (local.length) return local;
  const stored = parseRecords((await Preferences.get({ key: STORAGE_KEY })).value);
  if (stored.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

export function recordAiUsage(value: unknown) {
  if (!validUsage(value)) return;
  const record: AiUsageRecord = {
    ...value,
    cachedInputTokens: Number.isFinite(value.cachedInputTokens) ? value.cachedInputTokens : 0,
    reasoningTokens: Number.isFinite(value.reasoningTokens) ? value.reasoningTokens : 0,
    requestCount: Number.isFinite(value.requestCount) ? value.requestCount : 1,
    cacheHit: Boolean(value.cacheHit),
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  const records = [record, ...localRecords()].slice(0, MAX_RECORDS);
  const serialized = JSON.stringify(records);
  localStorage.setItem(STORAGE_KEY, serialized);
  void Preferences.set({ key: STORAGE_KEY, value: serialized });
  window.dispatchEvent(new CustomEvent(AI_USAGE_UPDATED));
}

export function clearAiUsageRecords() {
  localStorage.removeItem(STORAGE_KEY);
  void Preferences.remove({ key: STORAGE_KEY });
  window.dispatchEvent(new CustomEvent(AI_USAGE_UPDATED));
}

export const usageActionLabel: Record<AiUsageAction, string> = {
  receipt_scan: 'Escanear ticket',
  fuel_scan: 'Escanear repostaje',
  voice_dictation: 'Dictar productos',
  generate_list: 'Generar lista con IA',
  price_comparison: 'Comparar precios'
};
