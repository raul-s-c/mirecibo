import { describe, expect, it } from 'vitest';
import type { PriceComparison, ShoppingItem } from '../types';
import { buildStoreBaskets, quantityInBasis, compatibleProduct } from './basketComparison';

const items: ShoppingItem[] = [
  { id: '1', name: 'Leche entera', quantity: 2, unit: 'L', category: 'Alimentación', completed: false, createdAt: '' },
  { id: '2', name: 'Salmón', quantity: 1, unit: 'kg', category: 'Alimentación', completed: false, createdAt: '' }
];

const comparison: PriceComparison = {
  postalCode: '46900', updatedAt: '', coverage: ['Mercadona', 'Consum'], warnings: [], nearbyStores: [
    { id: 'm1', chain: 'Mercadona', name: 'Mercadona Centre', distanceKm: 1.2, latitude: 39.4, longitude: -0.4 },
    { id: 'c1', chain: 'Consum', name: 'Consum Centre', distanceKm: 2, latitude: 39.41, longitude: -0.41 }
  ], groups: [
    { id: 'milk', canonicalName: 'Leche entera', memberNames: ['Leche entera'], basis: 'l', offers: [
      { source: 'mercadona', chain: 'Mercadona', store: 'Mercadona', productName: 'Leche entera Hacendado', price: 1.1, unitPrice: 1.1, basis: 'l', date: '', matchType: 'equivalent' },
      { source: 'consum', chain: 'Consum', store: 'Consum', productName: 'Leche entera Consum', price: 1.2, unitPrice: 1.2, basis: 'l', date: '', matchType: 'same' }
    ], bestOffer: {} as never, latestPaid: { source: 'history', store: 'Ticket', productName: 'Leche', price: 1.5, unitPrice: 1.5, basis: 'l', date: '', matchType: 'same' }, possibleSaving: 0 },
    { id: 'salmon', canonicalName: 'Salmón', memberNames: ['Salmón'], basis: 'kg', offers: [
      { source: 'mercadona', chain: 'Mercadona', store: 'Mercadona', productName: 'Salmón fresco', price: 9, unitPrice: 9, basis: 'kg', date: '', matchType: 'same' }
    ], bestOffer: {} as never, possibleSaving: 0 }
  ]
};

describe('buildStoreBaskets', () => {
  it('convierte gramos y mililitros sin inventar pesos de paquetes o cucharadas', () => {
    expect(quantityInBasis(300, 'g', 'kg')).toBe(.3);
    expect(quantityInBasis(500, 'ml', 'l')).toBe(.5);
    expect(quantityInBasis(2, 'paquetes', 'kg')).toBeUndefined();
    expect(quantityInBasis(2, 'cucharadas', 'l')).toBeUndefined();
    expect(quantityInBasis(300, 'g', 'unit')).toBeUndefined();
    expect(quantityInBasis(NaN, 'kg', 'kg')).toBeUndefined();
  });

  it('rechaza cortes y preparaciones incompatibles incluso si estaban en caché', () => {
    expect(compatibleProduct('Pechuga de pollo', 'Muslito de pollo 97% La Carloteña asado al horno lonchas')).toBe(false);
    expect(compatibleProduct('Pechuga de pollo', 'Pechuga de pollo asada en lonchas')).toBe(false);
    expect(compatibleProduct('Arroz bomba', 'Arroz basmati')).toBe(false);
    expect(compatibleProduct('Pechuga de pollo', 'Pechuga de pollo fresca')).toBe(true);
    expect(compatibleProduct('Pechuga de pollo', 'Pit de pollastre')).toBe(true);
  });

  it('calcula 300 g a 15 euros/kg como 4,50 euros y no 4500', () => {
    const request = { ...items[0], name: 'Pechuga de pollo', quantity: 300, unit: 'g' };
    const offer = { ...comparison.groups[1].offers[0], productName: 'Pechuga de pollo fresca', unitPrice: 15 };
    const data = { ...comparison, groups: [{ ...comparison.groups[1], memberNames: [request.name], offers: [offer] }] };
    expect(buildStoreBaskets([request], data)[0]).toMatchObject({ total: 4.5, coverage: 1, savingComparable: false });
    data.groups[0].offers = [{ ...offer, productName: 'Muslito de pollo asado en lonchas' }];
    expect(buildStoreBaskets([request], data)[0]).toMatchObject({ total: 0, coverage: 0, potentialSaving: 0 });
  });

  it('solo calcula ahorro cuando la misma cesta completa tiene referencia válida', () => {
    const group = { ...comparison.groups[0], latestPaid: { ...comparison.groups[0].offers[0], price: 1.5, unitPrice: 1.5 } };
    const basket = buildStoreBaskets([items[0]], { ...comparison, groups: [group] })[0];
    expect(basket).toMatchObject({ savingComparable: true, potentialSaving: .8 });
  });
  it('calcula cada cesta, conserva faltantes y ordena por cobertura', () => {
    const baskets = buildStoreBaskets(items, comparison);
    expect(baskets.map(basket => basket.chain)).toEqual(['Mercadona', 'Consum']);
    expect(baskets[0]).toMatchObject({ total: 11.2, coverage: 2, itemCount: 2, potentialSaving: 0, savingComparable: false, catalogAvailable: true });
    expect(baskets[1]).toMatchObject({ total: 2.4, coverage: 1, itemCount: 2, potentialSaving: 0, savingComparable: false });
    expect(baskets[1].lines[1].offer).toBeUndefined();
  });

  it('muestra cadenas sin ofertas sin inventar un total', () => {
    const extraStore = { id: 'x', chain: 'Lidl', name: 'Lidl', distanceKm: 1, latitude: 39.4, longitude: -0.4 };
    expect(buildStoreBaskets(items, comparison, [extraStore])).toMatchObject([{ chain: 'Lidl', coverage: 0, total: 0, catalogAvailable: false }]);
  });

  it('usa solo la sucursal más cercana de cada cadena', () => {
    const stores = [
      { id: 'far', chain: 'Mercadona', name: 'Mercadona lejos', distanceKm: 8, latitude: 39.5, longitude: -0.5 },
      { id: 'near', chain: 'Mercadona', name: 'Mercadona cerca', distanceKm: 1, latitude: 39.4, longitude: -0.4 }
    ];
    expect(buildStoreBaskets(items, comparison, stores)).toMatchObject([{ location: { id: 'near' } }]);
  });
});
