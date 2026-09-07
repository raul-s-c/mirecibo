import type { AppState, CategoryDefinition } from '../types';

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { id: 'category-food', name: 'Alimentación', color: '#079455', archived: false, builtin: true, aliases: ['Alimentación'] },
  { id: 'category-home', name: 'Hogar', color: '#2e90fa', archived: false, builtin: true, aliases: ['Hogar'] },
  { id: 'category-hygiene', name: 'Higiene', color: '#7f56d9', archived: false, builtin: true, aliases: ['Higiene'] },
  { id: 'category-pets', name: 'Mascotas', color: '#f79009', archived: false, builtin: true, aliases: ['Mascotas'] },
  { id: 'category-other', name: 'Otros', color: '#667085', archived: false, builtin: true, aliases: ['Otros'] }
];

export const CATEGORY_COLORS = ['#079455', '#2e90fa', '#7f56d9', '#f79009', '#e5484d', '#0e9384', '#dd2590', '#6172f3', '#667085'];

export function activeCategories(state: Pick<AppState, 'categories'>) {
  return state.categories.filter(category => !category.archived);
}

export function categoryColor(categories: CategoryDefinition[], name: string) {
  return categories.find(category => category.name === name)?.color ?? '#667085';
}
