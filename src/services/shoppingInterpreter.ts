import type { Category, NewShoppingItem } from '../types';
import { aiFetch } from './aiTransport';
import { aiRequestHeaders, hydrateAiSettings } from './aiSettings';
import { parseShoppingText } from './productParser';
import { recordAiUsage, type AiUsageMeta } from './usageLedger';

const CATEGORIES: Category[] = ['Alimentación', 'Hogar', 'Higiene', 'Mascotas', 'Otros'];

interface InterpretedProduct {
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  category?: unknown;
}

function sanitizeItem(value: InterpretedProduct): NewShoppingItem | null {
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const quantity = typeof value.quantity === 'number' && Number.isFinite(value.quantity) ? value.quantity : 1;
  const unit = typeof value.unit === 'string' ? value.unit.trim() : 'ud.';
  const category = CATEGORIES.includes(value.category as Category) ? value.category as Category : 'Otros';
  if (!name || name.length > 100 || quantity <= 0 || quantity > 999) return null;
  return { name, quantity, unit: unit || 'ud.', category };
}

export async function interpretShoppingText(text: string): Promise<NewShoppingItem[]> {
  const input = text.trim();
  if (!input) return [];
  try {
    const settings = await hydrateAiSettings();
    const response = await aiFetch(`${settings.endpoint}/v1/products/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...await aiRequestHeaders(settings) },
      body: JSON.stringify({ text: input.slice(0, 2_000) })
    });
    const payload = await response.json().catch(() => null) as { data?: { items?: InterpretedProduct[] }; usage?: AiUsageMeta } | null;
    recordAiUsage(payload?.usage);
    const items = payload?.data?.items?.flatMap(item => sanitizeItem(item) ?? []) ?? [];
    if (response.ok && items.length) return items;
  } catch { /* El analizador local mantiene disponible la lista sin conexión. */ }
  return parseShoppingText(input);
}
