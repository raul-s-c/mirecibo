import type { AppState, Category, PriceComparison, ProductPriceGroup } from '../types';
import { Preferences } from '@capacitor/preferences';
import { aiRequestHeaders, hydrateAiSettings } from './aiSettings';
import { aiFetch } from './aiTransport';
import { locateSupermarkets, STORE_RADIUS_KM, type SupermarketDirectory } from './supermarketLocator';
import { recordAiUsage, type AiUsageMeta } from './usageLedger';

interface PriceObservation {
  store: string;
  address?: string;
  municipality?: string;
  date: string;
  price: number;
  unitPrice: number;
  unit: string;
  quantity: number;
}

interface ComparisonProduct {
  name: string;
  category: Category;
  observations: PriceObservation[];
}

const CACHE_HOURS = 24;
const CACHE_PREFIX = 'mirecibo-price-comparison-v5';
const LAST_PREFIX = 'mirecibo-price-comparison-latest-v5';

const cleanName = (value: string) => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const chainKey = (value: string) => cleanName(value).replace(/\bonline\b/g, '').replace(/\s+/g, '');
export const PRICE_CHAINS = ['Mercadona', 'Consum', 'Bonpreu/Esclat'] as const;

export function connectedPriceChain(value: string): typeof PRICE_CHAINS[number] | null {
  const key = chainKey(value);
  return PRICE_CHAINS.find(chain => chainKey(chain) === key) ?? null;
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

export function comparisonProducts(state: AppState): ComparisonProduct[] {
  const products = new Map<string, ComparisonProduct>();
  const add = (name: string, category: Category, observation?: PriceObservation) => {
    const key = cleanName(name);
    if (!key) return;
    const current = products.get(key) ?? { name: name.trim(), category, observations: [] };
    if (observation) current.observations.push(observation);
    products.set(key, current);
  };

  state.items.filter(item => !item.completed).forEach(item => add(item.name, item.category));
  state.receipts.forEach(receipt => receipt.lines.forEach(line => {
    if (line.lineType && line.lineType !== 'product') return;
    if (line.total <= 0 || line.quantity <= 0) return;
    add(line.name, line.category, {
      store: receipt.store,
      address: receipt.storeAddress,
      municipality: receipt.storeMunicipality,
      date: receipt.date,
      price: line.total,
      unitPrice: line.unitPrice || line.total / line.quantity,
      unit: line.unit,
      quantity: line.quantity
    });
  }));

  return [...products.values()]
    .sort((left, right) => Number(Boolean(right.observations.length)) - Number(Boolean(left.observations.length)))
    .slice(0, 36);
}

export async function compareCurrentPrices(state: AppState, force = false): Promise<PriceComparison> {
  if (!/^\d{5}$/.test(state.postalCode)) throw new Error('Introduce un código postal válido de 5 cifras.');
  const products = comparisonProducts(state);
  if (!products.length) throw new Error('Añade productos a la lista o escanea algún ticket antes de comparar.');
  const signature = hash(JSON.stringify(products.map(product => [product.name, product.observations.length, product.observations[0]?.date])));
  const cacheKey = `${CACHE_PREFIX}-${state.postalCode}-${signature}`;
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) ?? 'null') as PriceComparison | null;
      if (cached && Date.now() - Date.parse(cached.updatedAt) < CACHE_HOURS * 60 * 60 * 1000) return cached;
    } catch { /* una caché dañada simplemente se ignora */ }
  }

  const directory = await locateSupermarkets(state.postalCode, force);
  const chains = [...new Set(directory.stores.flatMap(store => connectedPriceChain(store.chain) ?? []))];
  if (!chains.length) throw new Error('No hay supermercados cercanos con un catálogo de precios conectado. Amplía la zona o usa otro código postal.');
  const settings = await hydrateAiSettings();
  if (!settings.endpoint) throw new Error('La comparación inteligente no está disponible en esta instalación.');
  const response = await aiFetch(`${settings.endpoint}/v1/prices/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...await aiRequestHeaders(settings) },
    body: JSON.stringify({ postalCode: state.postalCode, products, chains })
  });
  const payload = await response.json().catch(() => null) as { data?: PriceComparison; error?: string; usage?: AiUsageMeta } | null;
  recordAiUsage(payload?.usage);
  if (!response.ok || !payload?.data) throw new Error(payload?.error || 'No se han podido actualizar los precios.');
  const comparison = attachNearbyStores(payload.data, directory);
  await savePriceComparison(comparison, cacheKey);
  return comparison;
}

export function attachNearbyStores(comparison: PriceComparison, directory: SupermarketDirectory): PriceComparison {
  const requested = new Set(comparison.requestedChains?.map(chainKey) ?? PRICE_CHAINS.map(chainKey));
  const priceStores = directory.stores.filter(store => {
    const chain = connectedPriceChain(store.chain);
    return Boolean(chain && requested.has(chainKey(chain)));
  });
  const groups = comparison.groups.flatMap(group => {
    const offers = group.offers.flatMap(offer => {
      const chain = offer.chain || offer.store;
      const nearby = priceStores.find(store => chainKey(store.chain) === chainKey(chain));
      if (!nearby) return [];
      return [{ ...offer, chain, store: chain, address: nearby.address, municipality: nearby.municipality,
        distanceKm: nearby.distanceKm, nearbyStoreName: nearby.name,
        locationLabel: nearby.name,
        locationKind: 'chain-nearby' as const }];
    }).sort((left, right) => left.unitPrice - right.unitPrice);
    if (!offers.length) return [];
    const bestOffer = offers[0];
    return [{ ...group, offers, bestOffer,
      possibleSaving: group.latestPaid ? Math.max(0, group.latestPaid.unitPrice - bestOffer.unitPrice) : 0 }];
  });
  return { ...comparison, groups, nearbyStores: priceStores, otherNearbyStoreCount: directory.stores.length - priceStores.length, searchCenter: directory.center,
    maxRadiusKm: STORE_RADIUS_KM, locationAttribution: '© OpenStreetMap contributors' };
}

function isPriceComparison(value: unknown): value is PriceComparison {
  if (!value || typeof value !== 'object') return false;
  const comparison = value as Partial<PriceComparison>;
  return typeof comparison.postalCode === 'string' && typeof comparison.updatedAt === 'string' && Array.isArray(comparison.groups) && Array.isArray(comparison.coverage);
}

function parseComparison(value: string | null): PriceComparison | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return isPriceComparison(parsed) ? parsed : null;
  } catch { return null; }
}

async function savePriceComparison(comparison: PriceComparison, exactKey: string) {
  const value = JSON.stringify(comparison);
  const latestKey = `${LAST_PREFIX}-${comparison.postalCode}`;
  localStorage.setItem(exactKey, value);
  localStorage.setItem(latestKey, value);
  await Preferences.set({ key: latestKey, value });
}

export async function loadLastPriceComparison(postalCode: string): Promise<PriceComparison | null> {
  if (!/^\d{5}$/.test(postalCode)) return null;
  const key = `${LAST_PREFIX}-${postalCode}`;
  const local = parseComparison(localStorage.getItem(key));
  if (local?.postalCode === postalCode) return local;
  const stored = parseComparison((await Preferences.get({ key })).value);
  if (stored?.postalCode !== postalCode) return null;
  localStorage.setItem(key, JSON.stringify(stored));
  return stored;
}

export function filterPriceGroups(comparison: PriceComparison, maxDistanceKm: number, chains: string[]): ProductPriceGroup[] {
  const selected = new Set(chains);
  return comparison.groups.flatMap(group => {
    const offers = group.offers.filter(offer => typeof offer.distanceKm === 'number' && offer.distanceKm <= maxDistanceKm &&
      (!selected.size || selected.has(offer.chain || offer.store)));
    if (!offers.length) return [];
    const bestOffer = offers.reduce((best, offer) => offer.unitPrice < best.unitPrice ? offer : best);
    return [{ ...group, offers, bestOffer,
      possibleSaving: group.latestPaid ? Math.max(0, group.latestPaid.unitPrice - bestOffer.unitPrice) : 0 }];
  });
}
