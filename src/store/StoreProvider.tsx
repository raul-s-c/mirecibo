import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { initialState, uid } from '../data/seed';
import { demoBasketState, isBasketDemo } from '../data/basketDemo';
import { advanceRecurringDate, processAutomaticExpenses, recurringReceipt } from '../services/recurringExpenses';
import type { AppState, CategoryDefinition, NewShoppingItem, Receipt, RecurringExpense, Refuel, ShoppingItem, Vehicle } from '../types';

const STORAGE_KEY = 'mirecibo-state-v1';
const STORAGE_VERSION = 3;

interface StoredState { version: number; state: AppState }

const normalizeState = (candidate: Partial<AppState>): AppState => ({
  ...initialState,
  ...candidate,
  categories: Array.isArray(candidate.categories) && candidate.categories.length ? candidate.categories : initialState.categories,
  recurringExpenses: Array.isArray(candidate.recurringExpenses) ? candidate.recurringExpenses : []
});

const parseStoredState = (raw: string | null): AppState | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredState | AppState;
    const candidate = 'state' in parsed ? parsed.state : parsed;
    if (!candidate || !Array.isArray(candidate.items) || !Array.isArray(candidate.receipts)) return null;
    return normalizeState(candidate);
  } catch {
    return null;
  }
};

type Action =
  | { type: 'add-items'; items: NewShoppingItem[] }
  | { type: 'update-item'; item: ShoppingItem }
  | { type: 'delete-item'; id: string }
  | { type: 'clear-items' }
  | { type: 'toggle-item'; id: string }
  | { type: 'add-receipt'; receipt: Receipt }
  | { type: 'update-receipt'; receipt: Receipt }
  | { type: 'delete-receipt'; id: string }
  | { type: 'add-refuel'; refuel: Refuel }
  | { type: 'delete-refuel'; id: string }
  | { type: 'add-vehicle'; vehicle: Vehicle }
  | { type: 'add-category'; category: CategoryDefinition }
  | { type: 'rename-category'; id: string; name: string }
  | { type: 'set-category-color'; id: string; color: string }
  | { type: 'move-category'; id: string; direction: -1 | 1 }
  | { type: 'archive-category'; id: string; archived: boolean }
  | { type: 'merge-category'; sourceId: string; targetId: string }
  | { type: 'add-recurring'; expense: RecurringExpense }
  | { type: 'update-recurring'; expense: RecurringExpense }
  | { type: 'delete-recurring'; id: string }
  | { type: 'confirm-recurring'; id: string }
  | { type: 'skip-recurring'; id: string }
  | { type: 'process-recurring' }
  | { type: 'set-postal-code'; postalCode: string }
  | { type: 'hydrate'; state: AppState }
  | { type: 'reset' };

const loadInitial = (): AppState => {
  if (isBasketDemo) return demoBasketState;
  return parseStoredState(localStorage.getItem(STORAGE_KEY)) ?? initialState;
};

const serialize = (state: AppState) => JSON.stringify({ version: STORAGE_VERSION, state } satisfies StoredState);

const categoryName = (state: AppState, value: string) => state.categories.find(category => category.name === value || category.aliases?.includes(value))?.name ?? value;

function reducer(state: AppState, action: Action): AppState {
  let next = state;
  switch (action.type) {
    case 'add-items':
      next = {
        ...state,
        items: [
          ...action.items.map(value => ({ ...value, category: categoryName(state, value.category), id: uid(), completed: false, createdAt: new Date().toISOString() })),
          ...state.items
        ]
      };
      break;
    case 'update-item':
      next = { ...state, items: state.items.map(value => value.id === action.item.id ? action.item : value) };
      break;
    case 'delete-item':
      next = { ...state, items: state.items.filter(value => value.id !== action.id) };
      break;
    case 'clear-items':
      next = { ...state, items: [] };
      break;
    case 'toggle-item':
      next = { ...state, items: state.items.map(value => value.id === action.id ? { ...value, completed: !value.completed } : value) };
      break;
    case 'add-receipt': {
      const normalize = (value: string) => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').trim();
      const receipt = { ...action.receipt, lines: action.receipt.lines.map(line => ({ ...line, category: categoryName(state, line.category) })) };
      const purchased = receipt.lines.map(value => normalize(value.name));
      next = {
        ...state,
        receipts: [receipt, ...state.receipts],
        items: state.items.map(value => {
          const itemName = normalize(value.name);
          const found = purchased.some(name => name === itemName || (Math.min(name.length, itemName.length) >= 4 && (name.includes(itemName) || itemName.includes(name))));
          return found ? { ...value, completed: true } : value;
        })
      };
      break;
    }
    case 'update-receipt':
      next = { ...state, receipts: state.receipts.map(value => value.id === action.receipt.id ? action.receipt : value) };
      break;
    case 'delete-receipt':
      next = { ...state, receipts: state.receipts.filter(value => value.id !== action.id) };
      break;
    case 'add-refuel':
      next = { ...state, refuels: [action.refuel, ...state.refuels] };
      break;
    case 'delete-refuel':
      next = { ...state, refuels: state.refuels.filter(value => value.id !== action.id) };
      break;
    case 'add-vehicle':
      next = { ...state, vehicles: [...state.vehicles, action.vehicle] };
      break;
    case 'add-category':
      next = { ...state, categories: [...state.categories, action.category] };
      break;
    case 'rename-category': {
      const previous = state.categories.find(value => value.id === action.id)?.name;
      if (!previous) break;
      const replace = (value: string) => value === previous ? action.name : value;
      next = { ...state,
        categories: state.categories.map(value => value.id === action.id ? { ...value, name: action.name, aliases: [...new Set([...(value.aliases ?? []), previous])] } : value),
        items: state.items.map(value => ({ ...value, category: replace(value.category) })),
        receipts: state.receipts.map(receipt => ({ ...receipt, lines: receipt.lines.map(line => ({ ...line, category: replace(line.category) })) })),
        recurringExpenses: state.recurringExpenses.map(value => ({ ...value, category: replace(value.category) }))
      };
      break;
    }
    case 'set-category-color':
      next = { ...state, categories: state.categories.map(value => value.id === action.id ? { ...value, color: action.color } : value) };
      break;
    case 'move-category': {
      const index = state.categories.findIndex(value => value.id === action.id);
      const target = index + action.direction;
      if (index < 0 || target < 0 || target >= state.categories.length) break;
      const categories = [...state.categories];
      [categories[index], categories[target]] = [categories[target], categories[index]];
      next = { ...state, categories };
      break;
    }
    case 'archive-category':
      next = { ...state, categories: state.categories.map(value => value.id === action.id ? { ...value, archived: action.archived } : value) };
      break;
    case 'merge-category': {
      const source = state.categories.find(value => value.id === action.sourceId);
      const target = state.categories.find(value => value.id === action.targetId);
      if (!source || !target || source.id === target.id) break;
      const replace = (value: string) => value === source.name ? target.name : value;
      next = { ...state,
        categories: state.categories.filter(value => value.id !== source.id).map(value => value.id === target.id ? { ...value, aliases: [...new Set([...(value.aliases ?? []), ...(source.aliases ?? []), source.name])] } : value),
        items: state.items.map(value => ({ ...value, category: replace(value.category) })),
        receipts: state.receipts.map(receipt => ({ ...receipt, lines: receipt.lines.map(line => ({ ...line, category: replace(line.category) })) })),
        recurringExpenses: state.recurringExpenses.map(value => ({ ...value, category: replace(value.category) }))
      };
      break;
    }
    case 'add-recurring':
      next = processAutomaticExpenses({ ...state, recurringExpenses: [action.expense, ...state.recurringExpenses] });
      break;
    case 'update-recurring':
      next = processAutomaticExpenses({ ...state, recurringExpenses: state.recurringExpenses.map(value => value.id === action.expense.id ? action.expense : value) });
      break;
    case 'delete-recurring':
      next = { ...state, recurringExpenses: state.recurringExpenses.filter(value => value.id !== action.id) };
      break;
    case 'confirm-recurring': {
      const expense = state.recurringExpenses.find(value => value.id === action.id);
      if (!expense) break;
      const receipt = recurringReceipt(expense);
      next = { ...state, receipts: state.receipts.some(value => value.id === receipt.id) ? state.receipts : [receipt, ...state.receipts], recurringExpenses: state.recurringExpenses.map(value => value.id === expense.id ? { ...value, nextDate: advanceRecurringDate(value.nextDate, value.frequency, value.dayOfPeriod) } : value) };
      break;
    }
    case 'skip-recurring':
      next = { ...state, recurringExpenses: state.recurringExpenses.map(value => value.id === action.id ? { ...value, nextDate: advanceRecurringDate(value.nextDate, value.frequency, value.dayOfPeriod) } : value) };
      break;
    case 'process-recurring':
      next = processAutomaticExpenses(state);
      break;
    case 'set-postal-code':
      next = { ...state, postalCode: action.postalCode };
      break;
    case 'hydrate':
      return normalizeState(action.state);
    case 'reset':
      next = initialState;
      break;
  }
  return next;
}

interface StoreValue {
  state: AppState;
  addItems: (items: NewShoppingItem[]) => void;
  updateItem: (item: ShoppingItem) => void;
  deleteItem: (id: string) => void;
  clearItems: () => void;
  toggleItem: (id: string) => void;
  addReceipt: (receipt: Receipt) => void;
  updateReceipt: (receipt: Receipt) => void;
  deleteReceipt: (id: string) => void;
  addRefuel: (refuel: Refuel) => void;
  deleteRefuel: (id: string) => void;
  addVehicle: (vehicle: Vehicle) => void;
  addCategory: (category: Omit<CategoryDefinition, 'id'>) => void;
  renameCategory: (id: string, name: string) => void;
  setCategoryColor: (id: string, color: string) => void;
  moveCategory: (id: string, direction: -1 | 1) => void;
  archiveCategory: (id: string, archived: boolean) => void;
  mergeCategory: (sourceId: string, targetId: string) => void;
  addRecurringExpense: (expense: Omit<RecurringExpense, 'id' | 'createdAt'>) => void;
  updateRecurringExpense: (expense: RecurringExpense) => void;
  deleteRecurringExpense: (id: string) => void;
  confirmRecurringExpense: (id: string) => void;
  skipRecurringExpense: (id: string) => void;
  setPostalCode: (postalCode: string) => void;
  reset: () => void;
  replaceState: (state: AppState) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);
  const [ready, setReady] = useState(() => Boolean(parseStoredState(localStorage.getItem(STORAGE_KEY))));

  useEffect(() => {
    if (ready) return;
    let active = true;
    void Preferences.get({ key: STORAGE_KEY }).then(result => {
      const stored = parseStoredState(result.value);
      if (active && stored) dispatch({ type: 'hydrate', state: stored });
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [ready]);

  useEffect(() => { if (ready) dispatch({ type: 'process-recurring' }); }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const value = serialize(state);
    localStorage.setItem(STORAGE_KEY, value);
    void Preferences.set({ key: STORAGE_KEY, value });
  }, [ready, state]);
  const addItems = useCallback((items: NewShoppingItem[]) => dispatch({ type: 'add-items', items }), []);
  const updateItem = useCallback((item: ShoppingItem) => dispatch({ type: 'update-item', item }), []);
  const deleteItem = useCallback((id: string) => dispatch({ type: 'delete-item', id }), []);
  const clearItems = useCallback(() => dispatch({ type: 'clear-items' }), []);
  const toggleItem = useCallback((id: string) => dispatch({ type: 'toggle-item', id }), []);
  const addReceipt = useCallback((receipt: Receipt) => dispatch({ type: 'add-receipt', receipt }), []);
  const updateReceipt = useCallback((receipt: Receipt) => dispatch({ type: 'update-receipt', receipt }), []);
  const deleteReceipt = useCallback((id: string) => dispatch({ type: 'delete-receipt', id }), []);
  const addRefuel = useCallback((refuel: Refuel) => dispatch({ type: 'add-refuel', refuel }), []);
  const deleteRefuel = useCallback((id: string) => dispatch({ type: 'delete-refuel', id }), []);
  const addVehicle = useCallback((vehicle: Vehicle) => dispatch({ type: 'add-vehicle', vehicle }), []);
  const addCategory = useCallback((category: Omit<CategoryDefinition, 'id'>) => dispatch({ type: 'add-category', category: { ...category, id: uid(), aliases: [category.name] } }), []);
  const renameCategory = useCallback((id: string, name: string) => dispatch({ type: 'rename-category', id, name }), []);
  const setCategoryColor = useCallback((id: string, color: string) => dispatch({ type: 'set-category-color', id, color }), []);
  const moveCategory = useCallback((id: string, direction: -1 | 1) => dispatch({ type: 'move-category', id, direction }), []);
  const archiveCategory = useCallback((id: string, archived: boolean) => dispatch({ type: 'archive-category', id, archived }), []);
  const mergeCategory = useCallback((sourceId: string, targetId: string) => dispatch({ type: 'merge-category', sourceId, targetId }), []);
  const addRecurringExpense = useCallback((expense: Omit<RecurringExpense, 'id' | 'createdAt'>) => dispatch({ type: 'add-recurring', expense: { ...expense, id: uid(), createdAt: new Date().toISOString() } }), []);
  const updateRecurringExpense = useCallback((expense: RecurringExpense) => dispatch({ type: 'update-recurring', expense }), []);
  const deleteRecurringExpense = useCallback((id: string) => dispatch({ type: 'delete-recurring', id }), []);
  const confirmRecurringExpense = useCallback((id: string) => dispatch({ type: 'confirm-recurring', id }), []);
  const skipRecurringExpense = useCallback((id: string) => dispatch({ type: 'skip-recurring', id }), []);
  const setPostalCode = useCallback((postalCode: string) => dispatch({ type: 'set-postal-code', postalCode }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  const replaceState = useCallback((nextState: AppState) => dispatch({ type: 'hydrate', state: normalizeState(nextState) }), []);
  const value = useMemo(() => ({ state, addItems, updateItem, deleteItem, clearItems, toggleItem, addReceipt, updateReceipt, deleteReceipt, addRefuel, deleteRefuel, addVehicle, addCategory, renameCategory, setCategoryColor, moveCategory, archiveCategory, mergeCategory, addRecurringExpense, updateRecurringExpense, deleteRecurringExpense, confirmRecurringExpense, skipRecurringExpense, setPostalCode, reset, replaceState }), [state, addItems, updateItem, deleteItem, clearItems, toggleItem, addReceipt, updateReceipt, deleteReceipt, addRefuel, deleteRefuel, addVehicle, addCategory, renameCategory, setCategoryColor, moveCategory, archiveCategory, mergeCategory, addRecurringExpense, updateRecurringExpense, deleteRecurringExpense, confirmRecurringExpense, skipRecurringExpense, setPostalCode, reset, replaceState]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore debe usarse dentro de StoreProvider');
  return value;
}
