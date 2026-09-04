import type { Category } from '../types';
import { aiFetch } from './aiTransport';
import { aiRequestHeaders, hydrateAiSettings } from './aiSettings';
import { recordAiUsage, type AiUsageMeta } from './usageLedger';

const CATEGORIES: Category[] = ['Alimentación', 'Hogar', 'Higiene', 'Mascotas', 'Otros'];

export interface GeneratedListItem {
  name: string;
  quantity: number;
  unit: string;
  category: Category;
  note: string;
}

export interface GeneratedList {
  title: string;
  summary: string;
  assumptions: string[];
  items: GeneratedListItem[];
}

type UnknownList = {
  title?: unknown;
  summary?: unknown;
  assumptions?: unknown;
  items?: Array<{ name?: unknown; quantity?: unknown; unit?: unknown; category?: unknown; note?: unknown }>;
};

export function sanitizeGeneratedList(value: UnknownList | null | undefined): GeneratedList | null {
  if (!value || !Array.isArray(value.items)) return null;
  const items = value.items.flatMap(item => {
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const quantity = typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 0;
    const unit = typeof item.unit === 'string' ? item.unit.trim() : '';
    if (!name || name.length > 120 || quantity <= 0 || quantity > 999 || !unit || unit.length > 30) return [];
    return [{ name, quantity, unit, category: CATEGORIES.includes(item.category as Category) ? item.category as Category : 'Otros', note: typeof item.note === 'string' ? item.note.trim().slice(0, 240) : '' }];
  }).slice(0, 40);
  if (!items.length) return null;
  return {
    title: typeof value.title === 'string' && value.title.trim() ? value.title.trim().slice(0, 100) : 'Lista sugerida',
    summary: typeof value.summary === 'string' ? value.summary.trim().slice(0, 300) : '',
    assumptions: Array.isArray(value.assumptions) ? value.assumptions.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 8) : [],
    items
  };
}

const demoProposal: GeneratedList = {
  title: 'Paella valenciana para 10 personas',
  summary: 'Ingredientes proporcionados para una paella valenciana como plato principal.',
  assumptions: ['Se calcula una ración principal por persona.', 'Se presupone que ya tienes sal y agua.'],
  items: [
    { name: 'Arroz bomba', quantity: 1, unit: 'kg', category: 'Alimentación', note: 'Variedad adecuada para paella' },
    { name: 'Pollo troceado', quantity: 1.5, unit: 'kg', category: 'Alimentación', note: 'Trozos pequeños con hueso' },
    { name: 'Conejo troceado', quantity: 1, unit: 'kg', category: 'Alimentación', note: 'Trozos para paella' },
    { name: 'Judía verde plana', quantity: 750, unit: 'g', category: 'Alimentación', note: 'Ferraura valenciana si está disponible' },
    { name: 'Garrofón valenciano', quantity: 400, unit: 'g', category: 'Alimentación', note: 'Fresco o congelado' },
    { name: 'Tomate maduro para rallar', quantity: 4, unit: 'ud.', category: 'Alimentación', note: '' },
    { name: 'Azafrán en hebras', quantity: 1, unit: 'sobre', category: 'Alimentación', note: 'Evita colorante si buscas sabor tradicional' },
    { name: 'Aceite de oliva virgen extra', quantity: 250, unit: 'ml', category: 'Alimentación', note: '' }
  ]
};

export async function generateShoppingList(request: string): Promise<GeneratedList> {
  const input = request.trim();
  if (!input) throw new Error('Describe qué quieres preparar o hacer.');
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('ai-list-demo')) {
    await new Promise(resolve => setTimeout(resolve, 250));
    return demoProposal;
  }
  const settings = await hydrateAiSettings();
  const response = await aiFetch(`${settings.endpoint}/v1/lists/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...await aiRequestHeaders(settings) },
    body: JSON.stringify({ request: input.slice(0, 2_000) })
  });
  const payload = await response.json().catch(() => null) as { data?: UnknownList; error?: string; usage?: AiUsageMeta } | null;
  recordAiUsage(payload?.usage);
  if (!response.ok) throw new Error(payload?.error || 'No se ha podido generar la lista.');
  const generated = sanitizeGeneratedList(payload?.data);
  if (!generated) throw new Error('La IA no ha devuelto una propuesta utilizable.');
  return generated;
}
