import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { initialState, uid } from '../data/seed';
import { demoBasketState, isBasketDemo } from '../data/basketDemo';
import type { AppState, NewShoppingItem, Receipt, Refuel, ShoppingItem, Vehicle } from '../types';

const STORAGE_KEY = 'mirecibo-state-v1';
const STORAGE_VERSION = 2;

interface StoredState { version: number; state: AppState }

const parseStoredState = (raw: string | null): AppState | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredState | AppState;
    const candidate = 'state' in parsed ? parsed.state : parsed;
    if (!candidate || !Array.isArray(candidate.items) || !Array.isArray(candidate.receipts)) return null;
    return { ...initialState, ...candidate };
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
  | { type: 'set-postal-code'; postalCode: string }
  | { type: 'hydrate'; state: AppState }
  | { type: 'reset' };

const loadInitial = (): AppState => {
  if (isBasketDemo) return demoBasketState;
  return parseStoredState(localStorage.getItem(STORAGE_KEY)) ?? initialState;
};

const serialize = (state: AppState) => JSON.stringify({ version: STORAGE_VERSION, state } satisfies StoredState);

function reducer(state: AppState, action: Action): AppState {
  let next = state;
  switch (action.type) {
    case 'add-items':
      next = {
        ...state,
        items: [
          ...action.items.map(value => ({ ...value, id: uid(), completed: false, createdAt: new Date().toISOString() })),
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
      const purchased = action.receipt.lines.map(value => normalize(value.name));
      next = {
        ...state,
        receipts: [action.receipt, ...state.receipts],
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
    case 'set-postal-code':
      next = { ...state, postalCode: action.postalCode };
      break;
    case 'hydrate':
      return action.state;
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
  const setPostalCode = useCallback((postalCode: string) => dispatch({ type: 'set-postal-code', postalCode }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  const replaceState = useCallback((nextState: AppState) => dispatch({ type: 'hydrate', state: { ...initialState, ...nextState } }), []);
  const value = useMemo(() => ({ state, addItems, updateItem, deleteItem, clearItems, toggleItem, addReceipt, updateReceipt, deleteReceipt, addRefuel, deleteRefuel, addVehicle, setPostalCode, reset, replaceState }), [state, addItems, updateItem, deleteItem, clearItems, toggleItem, addReceipt, updateReceipt, deleteReceipt, addRefuel, deleteRefuel, addVehicle, setPostalCode, reset, replaceState]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore debe usarse dentro de StoreProvider');
  return value;
}
