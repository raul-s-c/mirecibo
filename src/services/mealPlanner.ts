import type { Category, MealPlanDay, MealPlanMode, MealSlotSelection, NewShoppingItem, PantryItem } from '../types';
import { aiFetch } from './aiTransport';
import { aiRequestHeaders, hydrateAiSettings } from './aiSettings';
import { recordAiUsage, type AiUsageMeta } from './usageLedger';

const CATEGORIES: Category[] = ['Alimentación', 'Hogar', 'Higiene', 'Mascotas', 'Otros'];

export interface MealPlanRequest {
  mode: MealPlanMode;
  mealSlots: MealSlotSelection;
  people: number;
  startDate: string;
  dietFilters: string[];
  notes: string;
  pantry: PantryItem[];
}

export interface GeneratedMealPlan {
  title: string;
  summary: string;
  assumptions: string[];
  days: MealPlanDay[];
  shoppingItems: NewShoppingItem[];
}

type UnknownPlan = {
  title?: unknown;
  summary?: unknown;
  assumptions?: unknown;
  days?: Array<{ label?: unknown; date?: unknown; meals?: Array<{ type?: unknown; name?: unknown; description?: unknown; ingredients?: Array<{ name?: unknown; quantity?: unknown; unit?: unknown; source?: unknown }>; steps?: unknown }> }>;
  shoppingItems?: Array<{ name?: unknown; quantity?: unknown; unit?: unknown; category?: unknown; note?: unknown }>;
};

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const positiveNumber = (value: unknown, max = 999) => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= max ? value : 0;

export function sanitizeMealPlan(value: UnknownPlan | null | undefined): GeneratedMealPlan | null {
  if (!value || !Array.isArray(value.days)) return null;
  const days = value.days.flatMap(day => {
    const meals = Array.isArray(day.meals) ? day.meals.flatMap(meal => {
      const name = text(meal.name, 120);
      if (!name || !Array.isArray(meal.ingredients)) return [];
      const ingredients = meal.ingredients.flatMap(ingredient => {
        const ingredientName = text(ingredient.name, 120);
        const quantity = positiveNumber(ingredient.quantity);
        const unit = text(ingredient.unit, 30);
        if (!ingredientName || !quantity || !unit) return [];
        return [{ name: ingredientName, quantity, unit, source: ingredient.source === 'pantry' ? 'pantry' as const : 'shopping' as const }];
      }).slice(0, 24);
      if (!ingredients.length) return [];
      return [{
        type: text(meal.type, 30) || 'Comida',
        name,
        description: text(meal.description, 240),
        ingredients,
        steps: Array.isArray(meal.steps) ? meal.steps.filter((step): step is string => typeof step === 'string').map(step => step.trim().slice(0, 300)).filter(Boolean).slice(0, 8) : []
      }];
    }).slice(0, 3) : [];
    if (!meals.length) return [];
    return [{ label: text(day.label, 50) || 'Día', date: /^\d{4}-\d{2}-\d{2}$/.test(text(day.date, 10)) ? text(day.date, 10) : '', meals }];
  }).slice(0, 7);
  if (!days.length) return null;
  const shoppingItems = Array.isArray(value.shoppingItems) ? value.shoppingItems.flatMap(item => {
    const name = text(item.name, 120);
    const quantity = positiveNumber(item.quantity);
    const unit = text(item.unit, 30);
    if (!name || !quantity || !unit) return [];
    return [{ name, quantity, unit, category: CATEGORIES.includes(item.category as Category) ? item.category as Category : 'Alimentación', note: text(item.note, 240) }];
  }).slice(0, 50) : [];
  return {
    title: text(value.title, 120) || 'Plan de comidas',
    summary: text(value.summary, 360),
    assumptions: Array.isArray(value.assumptions) ? value.assumptions.filter((item): item is string => typeof item === 'string').map(item => item.trim().slice(0, 240)).filter(Boolean).slice(0, 8) : [],
    days,
    shoppingItems
  };
}

const demoPlan: GeneratedMealPlan = {
  title: 'Semana sencilla aprovechando tu despensa',
  summary: 'Comidas equilibradas que priorizan lo que ya tienes y concentran la compra en pocos productos.',
  assumptions: ['La sal, el agua y las especias básicas están disponibles.', 'Comprueba siempre las etiquetas si necesitas una dieta sin gluten.'],
  days: [{ label: 'Lunes', date: '2026-09-14', meals: [{ type: 'Comida', name: 'Arroz bomba con pollo y verduras', description: 'Plato único suave y fácil de recalentar.', ingredients: [
    { name: 'Arroz bomba', quantity: 200, unit: 'g', source: 'pantry' },
    { name: 'Pechuga de pollo', quantity: 300, unit: 'g', source: 'shopping' }
  ], steps: ['Trocea y dora el pollo.', 'Añade las verduras y el arroz.', 'Cubre con caldo y cocina hasta que el arroz esté en su punto.'] }] }],
  shoppingItems: [{ name: 'Pechuga de pollo fresca', quantity: 300, unit: 'g', category: 'Alimentación', note: 'Para el arroz del lunes' }]
};

export async function generateMealPlan(request: MealPlanRequest): Promise<GeneratedMealPlan> {
  if (!request.pantry.length) throw new Error('Añade al menos un producto a la despensa.');
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('meal-demo')) {
    await new Promise(resolve => setTimeout(resolve, 250));
    return { ...demoPlan, days: demoPlan.days.map(day => ({ ...day, date: request.startDate })) };
  }
  const settings = await hydrateAiSettings();
  const response = await aiFetch(`${settings.endpoint}/v1/meals/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...await aiRequestHeaders(settings) },
    body: JSON.stringify({
      mode: request.mode,
      mealSlots: request.mealSlots,
      people: Math.min(20, Math.max(1, Math.round(request.people))),
      startDate: request.startDate,
      dietFilters: request.dietFilters.slice(0, 10),
      notes: request.notes.trim().slice(0, 1_000),
      pantry: request.pantry.slice(0, 80).map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit, category: item.category }))
    })
  });
  const payload = await response.json().catch(() => null) as { data?: UnknownPlan; error?: string; usage?: AiUsageMeta } | null;
  recordAiUsage(payload?.usage);
  if (!response.ok) throw new Error(payload?.error || 'No se ha podido preparar el menú.');
  const generated = sanitizeMealPlan(payload?.data);
  if (!generated) throw new Error('La IA no ha devuelto un menú utilizable.');
  return generated;
}
