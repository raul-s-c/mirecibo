import type { AppState, PriceComparison, PriceOffer, ProductPriceGroup, ShoppingItem } from '../types';

export const isBasketDemo = import.meta.env.DEV && new URLSearchParams(window.location.search).has('basket-demo');

const createdAt = '2026-09-03T08:30:00.000Z';
const item = (id: string, name: string, quantity: number, unit: string): ShoppingItem => ({
  id, name, quantity, unit, category: 'Alimentación', completed: false, createdAt
});

export const demoBasketState: AppState = {
  currency: 'EUR', postalCode: '46900', alerts: [],
  refuels: [
    { id: 'demo-fuel-aug', station: 'Plenergy Xirivella', date: '2026-08-31', fuelType: 'Gasolina 95', liters: 10.79, pricePerLiter: 1.559, total: 16.82, vehicleId: 'vehicle-car', odometer: 42587, tags: ['Ciudad'] },
    { id: 'demo-fuel-jul', station: 'Repsol Torrent', date: '2026-07-18', fuelType: 'Gasolina 95', liters: 24.5, pricePerLiter: 1.53, total: 37.49, vehicleId: 'vehicle-car', tags: ['Viaje'] }
  ],
  vehicles: [{ id: 'vehicle-car', name: 'Mi coche', description: 'Vehículo principal' }],
  receipts: [{ id: 'demo-receipt', store: 'MERCADONA, S.A.', date: '2026-08-31', time: '18:03', total: 5.67, createdAt,
    lines: [
      { id: 'demo-line-milk', name: 'LECHE ENTERA P6', quantity: 2, unit: 'ud.', unitPrice: 1.71, total: 3.42, category: 'Alimentación', confidence: 1, lineType: 'product' },
      { id: 'demo-line-lcasei', name: 'LCASEI FR-PLA/PIÑ-CO', quantity: 1, unit: 'ud.', unitPrice: 2.25, total: 2.25, category: 'Alimentación', confidence: 1, lineType: 'product' }
    ] }],
  items: [
    item('demo-milk', 'Leche entera', 2, 'L'),
    item('demo-banana', 'Plátano', 1, 'kg'),
    item('demo-chicken', 'Pechuga de pollo', 1, 'kg'),
    item('demo-oil', 'Aceite de oliva virgen extra', 1, 'L'),
    item('demo-rice', 'Arroz redondo', 1, 'kg'),
    item('demo-salmon', 'Salmón', 1, 'kg')
  ]
};

type OfferSeed = { source: PriceOffer['source']; chain: string; product: string; price: number; unitPrice?: number; match?: PriceOffer['matchType'] };
const offer = ({ source, chain, product, price, unitPrice = price, match = 'same' }: OfferSeed): PriceOffer => ({
  source, chain, store: chain, productName: product, price, unitPrice, basis: 'unit', date: '2026-09-03',
  matchType: match, matchReason: match === 'same' ? 'Coincide con el producto solicitado' : 'Formato y uso equivalentes'
});

const group = (id: string, name: string, basis: ProductPriceGroup['basis'], seeds: OfferSeed[], lastPaid: number): ProductPriceGroup => {
  const offers = seeds.map(value => ({ ...offer(value), basis }));
  return {
    id, canonicalName: name, memberNames: [name], basis, offers,
    bestOffer: [...offers].sort((a, b) => a.unitPrice - b.unitPrice)[0],
    latestPaid: { ...offer({ source: 'history', chain: 'Última compra', product: name, price: lastPaid }), basis, unitPrice: lastPaid },
    possibleSaving: Math.max(0, lastPaid - Math.min(...offers.map(value => value.unitPrice)))
  };
};

export const demoBasketComparison: PriceComparison = {
  postalCode: '46900', updatedAt: '2026-09-03T08:35:00.000Z',
  coverage: ['Mercadona', 'Consum', 'Bonpreu / Esclat'], warnings: [], maxRadiusKm: 30,
  requestedChains: ['Mercadona', 'Consum', 'Bonpreu/Esclat'], otherNearbyStoreCount: 2,
  searchCenter: { latitude: 39.4372, longitude: -0.4654, label: 'Torrent, València' },
  locationAttribution: '© OpenStreetMap contributors',
  nearbyStores: [
    { id: 'mercadona-torrent', chain: 'Mercadona', name: 'Mercadona Torrent Centre', address: 'Avinguda al Vedat, 103', municipality: 'Torrent', postalCode: '46900', distanceKm: 0.8, latitude: 39.4324, longitude: -0.4698 },
    { id: 'mercadona-torrent-2', chain: 'Mercadona', name: 'Mercadona El Vedat', address: 'Carrer del Pare Méndez, 162', municipality: 'Torrent', postalCode: '46900', distanceKm: 2.4, latitude: 39.4261, longitude: -0.4789 },
    { id: 'consum-torrent', chain: 'Consum', name: 'Consum Parc Central', address: 'Avinguda Olímpica, 7', municipality: 'Torrent', postalCode: '46900', distanceKm: 1.9, latitude: 39.4435, longitude: -0.4576 },
    { id: 'esclat-torrent', chain: 'Bonpreu/Esclat', name: 'Esclat Picanya', address: 'Carrer de València, 41', municipality: 'Picanya', postalCode: '46210', distanceKm: 4.6, latitude: 39.4312, longitude: -0.4345 }
  ],
  groups: [
    group('milk', 'Leche entera', 'l', [
      { source: 'mercadona', chain: 'Mercadona', product: 'Leche entera Hacendado 1 L', price: 0.96 },
      { source: 'consum', chain: 'Consum', product: 'Leche entera Consum 1 L', price: 1.02 },
      { source: 'esclat', chain: 'Bonpreu / Esclat', product: 'Leche entera Bonpreu 1 L', price: 1.05 }
    ], 1.12),
    group('banana', 'Plátano', 'kg', [
      { source: 'mercadona', chain: 'Mercadona', product: 'Plátano de Canarias', price: 1.89 },
      { source: 'consum', chain: 'Consum', product: 'Plátano categoría I', price: 1.79 },
      { source: 'esclat', chain: 'Bonpreu / Esclat', product: 'Plàtan de Canàries', price: 1.95 }
    ], 2.20),
    group('chicken', 'Pechuga de pollo', 'kg', [
      { source: 'mercadona', chain: 'Mercadona', product: 'Pechuga de pollo entera', price: 6.15 },
      { source: 'consum', chain: 'Consum', product: 'Pechuga de pollo bandeja', price: 6.35 },
      { source: 'esclat', chain: 'Bonpreu / Esclat', product: 'Pit de pollastre', price: 6.49, match: 'equivalent' }
    ], 6.75),
    group('oil', 'Aceite de oliva virgen extra', 'l', [
      { source: 'mercadona', chain: 'Mercadona', product: 'Aceite de oliva virgen extra 1 L', price: 4.65 },
      { source: 'consum', chain: 'Consum', product: 'AOVE Consum 1 L', price: 4.79 },
      { source: 'esclat', chain: 'Bonpreu / Esclat', product: 'Oli oliva verge extra 1 L', price: 4.55 }
    ], 5.15),
    group('rice', 'Arroz redondo', 'kg', [
      { source: 'mercadona', chain: 'Mercadona', product: 'Arroz redondo Hacendado 1 kg', price: 1.35 },
      { source: 'consum', chain: 'Consum', product: 'Arroz redondo Consum 1 kg', price: 1.42 },
      { source: 'esclat', chain: 'Bonpreu / Esclat', product: 'Arròs rodó Bonpreu 1 kg', price: 1.39 }
    ], 1.55),
    group('salmon', 'Salmón', 'kg', [
      { source: 'mercadona', chain: 'Mercadona', product: 'Salmón entero limpio', price: 9.95 },
      { source: 'consum', chain: 'Consum', product: 'Salmón noruego pieza', price: 10.25 }
    ], 10.80)
  ]
};
