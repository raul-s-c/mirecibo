import { describe, expect, it } from 'vitest';
import { attachNearbyStores, comparisonProducts, filterPriceGroups, loadLastPriceComparison } from './priceComparison';
import type { AppState, PriceComparison } from '../types';

describe('comparisonProducts', () => {
  it('une el historial exacto sin incluir impuestos ni descuentos', () => {
    const state = {
      currency: 'EUR', postalCode: '46900', refuels: [], vehicles: [], alerts: [],
      items: [{ id: 'i', name: 'Leche semidesnatada', quantity: 1, unit: 'L', category: 'Alimentación', completed: false, createdAt: '' }],
      receipts: [{ id: 'r', store: 'Mercadona', storeAddress: 'C/ Valencia, 29, 46210 Picanya', storeMunicipality: 'Picanya', date: '2026-08-31', total: 2, createdAt: '', lines: [
        { id: 'a', name: 'LECHE SEMIDESNATADA', quantity: 1, unit: 'L', unitPrice: 0.9, total: 0.9, category: 'Alimentación', confidence: 1, lineType: 'product' },
        { id: 'b', name: 'IVA', quantity: 1, unit: 'ud.', unitPrice: 0.1, total: 0.1, category: 'Otros', confidence: 1, lineType: 'fee' }
      ] }]
    } satisfies AppState;
    const result = comparisonProducts(state);
    expect(result).toHaveLength(1);
    expect(result[0].observations).toHaveLength(1);
    expect(result[0].observations[0]).toMatchObject({ address: 'C/ Valencia, 29, 46210 Picanya', municipality: 'Picanya' });
  });

  it('recupera el último análisis persistido sin consultar la red', async () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    } });
    values.set('mirecibo-price-comparison-latest-v5-46900', JSON.stringify({
      postalCode: '46900', updatedAt: '2026-09-03T10:00:00.000Z', coverage: ['Histórico'], groups: [], warnings: []
    }));
    await expect(loadLastPriceComparison('46900')).resolves.toMatchObject({ postalCode: '46900' });
  });

  it('filtra oportunidades por distancia y cadena y recalcula el mejor precio', () => {
    const comparison = {
      postalCode: '46900', updatedAt: '', coverage: [], warnings: [], groups: [{
        id: 'leche', canonicalName: 'Leche', memberNames: ['Leche'], basis: 'l' as const,
        latestPaid: { source: 'history' as const, store: 'Ticket', productName: 'Leche', price: 1.5, unitPrice: 1.5, basis: 'l' as const, date: '', matchType: 'same' as const },
        offers: [
          { source: 'mercadona' as const, chain: 'Mercadona', store: 'Mercadona', distanceKm: 3, productName: 'Leche A', price: 1, unitPrice: 1, basis: 'l' as const, date: '', matchType: 'same' as const },
          { source: 'consum' as const, chain: 'Consum', store: 'Consum', distanceKm: 12, productName: 'Leche B', price: .9, unitPrice: .9, basis: 'l' as const, date: '', matchType: 'same' as const }
        ],
        bestOffer: {} as never, possibleSaving: 0
      }]
    } satisfies PriceComparison;
    expect(filterPriceGroups(comparison, 5, [])).toMatchObject([{ bestOffer: { store: 'Mercadona' }, possibleSaving: .5 }]);
    expect(filterPriceGroups(comparison, 20, ['Consum'])).toMatchObject([{ bestOffer: { store: 'Consum' }, possibleSaving: .6 }]);
  });

  it('cruza ofertas de catálogo con la sucursal más cercana sin limitar la extracción', () => {
    const comparison = { postalCode: '08812', updatedAt: '', coverage: [], warnings: [], groups: [{
      id: 'pan', canonicalName: 'Pan', memberNames: ['Pan'], basis: 'unit' as const,
      offers: [
        { source: 'consum' as const, chain: 'Consum', store: 'Consum', productName: 'Pan Consum', price: 1, unitPrice: 1, basis: 'unit' as const, date: '', matchType: 'same' as const },
        { source: 'mercadona' as const, chain: 'Mercadona', store: 'Mercadona', productName: 'Pan Mercadona', price: .9, unitPrice: .9, basis: 'unit' as const, date: '', matchType: 'same' as const }
      ], bestOffer: {} as never, possibleSaving: 0
    }] } satisfies PriceComparison;
    const result = attachNearbyStores(comparison, { postalCode: '08812', updatedAt: '', center: { latitude: 1, longitude: 2, label: '08812' }, stores: [
      { id: 'c2', chain: 'Consum', name: 'Consum Centre', address: 'C/ Major, 1', municipality: 'Sant Pere de Ribes', distanceKm: 4.2, latitude: 1, longitude: 2 },
      { id: 'c1', chain: 'Consum', name: 'Consum Lluny', distanceKm: 9, latitude: 1, longitude: 2 }
    ] });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].offers).toHaveLength(1);
    expect(result.groups[0].bestOffer).toMatchObject({ store: 'Consum', nearbyStoreName: 'Consum Centre', distanceKm: 4.2 });
  });

  it('iguala nombres de cadena aunque cambien espacios y barras', () => {
    const comparison = { postalCode: '08800', updatedAt: '', coverage: [], warnings: [], groups: [{
      id: 'milk', canonicalName: 'Leche', memberNames: ['Leche'], basis: 'l' as const,
      offers: [{ source: 'esclat' as const, chain: 'Bonpreu / Esclat', store: 'Bonpreu / Esclat', productName: 'Llet', price: 1, unitPrice: 1, basis: 'l' as const, date: '', matchType: 'same' as const }],
      bestOffer: {} as never, possibleSaving: 0
    }] } satisfies PriceComparison;
    const result = attachNearbyStores(comparison, { postalCode: '08800', updatedAt: '', center: { latitude: 1, longitude: 2, label: '08800' }, stores: [
      { id: 'e1', chain: 'Bonpreu/Esclat', name: 'Esclat Vilanova', distanceKm: 2, latitude: 1, longitude: 2 }
    ] });
    expect(result.groups[0].offers[0]).toMatchObject({ nearbyStoreName: 'Esclat Vilanova', distanceKm: 2 });
  });

  it('oculta supermercados sin catálogo conectado y conserva su recuento', () => {
    const comparison = { postalCode: '46900', updatedAt: '', requestedChains: ['Mercadona'], coverage: ['Mercadona'], warnings: [], groups: [] } satisfies PriceComparison;
    const result = attachNearbyStores(comparison, { postalCode: '46900', updatedAt: '', center: { latitude: 1, longitude: 2, label: '46900' }, stores: [
      { id: 'm', chain: 'Mercadona', name: 'Mercadona', distanceKm: 1, latitude: 1, longitude: 2 },
      { id: 'l', chain: 'Lidl', name: 'Lidl', distanceKm: 2, latitude: 1, longitude: 2 },
      { id: 'c', chain: 'Consum', name: 'Consum', distanceKm: 3, latitude: 1, longitude: 2 }
    ] });
    expect(result.nearbyStores?.map(store => store.chain)).toEqual(['Mercadona']);
    expect(result.otherNearbyStoreCount).toBe(2);
  });
});
