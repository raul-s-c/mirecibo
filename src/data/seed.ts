import type { AppState, Category, NewShoppingItem } from '../types';

export const uid = () => crypto.randomUUID();
export const today = () => new Date().toISOString().slice(0, 10);

const item = (name: string, quantity: number, unit: string, category: Category): NewShoppingItem => ({
  name, quantity, unit, category
});

export const demoItems = [
  item('Leche', 1, 'ud.', 'Alimentación'),
  item('Huevos', 1, 'cartón', 'Alimentación'),
  item('Pollo', 1, 'kg', 'Alimentación'),
  item('Papel higiénico', 1, 'paquete', 'Hogar'),
  item('Detergente', 1, 'ud.', 'Hogar')
];

export const initialState: AppState = {
  currency: 'EUR',
  postalCode: '',
  items: [],
  receipts: [],
  refuels: [],
  vehicles: [
    { id: 'vehicle-car', name: 'Mi coche', description: 'Vehículo principal' },
    { id: 'vehicle-moto', name: 'Moto' }
  ],
  alerts: []
};
