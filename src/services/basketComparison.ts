import type { PriceComparison, PriceOffer, ShoppingItem, SupermarketLocation } from '../types';

export interface BasketLine {
  item: ShoppingItem;
  offer?: PriceOffer;
  subtotal?: number;
  previousSubtotal?: number;
  unavailableReason?: string;
}

export interface StoreBasket {
  id: string;
  location: SupermarketLocation;
  chain: string;
  lines: BasketLine[];
  total: number;
  previousComparableTotal: number;
  coverage: number;
  itemCount: number;
  potentialSaving: number;
  catalogAvailable: boolean;
  savingComparable: boolean;
}

const normalized = (value: string) => value.toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const chainKey = (value: string) => normalized(value).replace(/\bonline\b/g, '').replace(/\s+/g, '');

/** Unknown package sizes and recipe measures must never become kilos or litres. */
export function quantityInBasis(quantity: number, unit: string, basis: PriceOffer['basis']): number | undefined {
  if (!Number.isFinite(quantity) || quantity <= 0) return undefined;
  const key = normalized(unit);
  const mass: Record<string, number> = { kg: 1, kilo: 1, kilos: 1, kilogramo: 1, kilogramos: 1, g: .001, gr: .001, gramo: .001, gramos: .001, mg: .000001 };
  const volume: Record<string, number> = { l: 1, litro: 1, litros: 1, ml: .001, mililitro: .001, mililitros: .001, cl: .01, dl: .1 };
  const factor = basis === 'kg' ? mass[key] : basis === 'l' ? volume[key] : /^(ud|uds|unidad|unidades|unit)$/.test(key) ? 1 : undefined;
  return factor === undefined ? undefined : quantity * factor;
}

export function compatibleProduct(requested: string, offered: string): boolean {
  const traitsText = (value: string) => normalized(value).replace(/\bpit de pollastre\b/g, 'pechuga de pollo').replace(/\bpollastre\b/g, 'pollo').replace(/\bcuixa\b/g, 'muslo').replace(/\bcuixeta\b/g, 'muslito').replace(/\bcuit\b/g, 'cocido').replace(/\brostit\b/g, 'asado').replace(/\bfumat\b/g, 'ahumado').replace(/\bfilets?\b/g, 'filete');
  const wanted = traitsText(requested);
  const candidate = traitsText(offered);
  // Essential cuts/varieties must be present, even when an AI match says otherwise.
  const traits = [/\bpechuga\b/, /\bmusl(?:o|os|ito|itos)\b/, /\bsolomillo\b/, /\balitas?\b/, /\bbomba\b/, /\bbasmati\b/, /\bintegral\b/, /\bentera\b/, /\bsemidesnatada\b/, /\bdesnatada\b/, /\bsin lactosa\b/, /\bmolido\b/, /\bcapsulas?\b/];
  if (traits.some(trait => trait.test(wanted) && !trait.test(candidate))) return false;
  const proteins = ['pollo', 'pavo', 'cerdo', 'ternera', 'salmon', 'atun', 'conejo'];
  if (proteins.some(protein => new RegExp(`\\b${protein}\\b`).test(wanted) && !new RegExp(`\\b${protein}\\b`).test(candidate))) return false;
  const processed = /\b(asad[oa]s?|cocid[oa]s?|cocinad[oa]s?|frit[oa]s?|empanad[oa]s?|rebozad[oa]s?|ahumad[oa]s?|fiambre|lonchas?|marinad[oa]s?|adobad[oa]s?)\b/;
  if (proteins.some(protein => wanted.includes(protein)) && processed.test(wanted) !== processed.test(candidate)) return false;
  return true;
}

function valueOffer(item: ShoppingItem, offer: PriceOffer): number | undefined {
  const quantity = quantityInBasis(item.quantity, item.unit, offer.basis);
  const price = offer.basis === 'unit' ? offer.price : offer.unitPrice;
  if (quantity === undefined || !Number.isFinite(price) || price <= 0) return undefined;
  const result = quantity * price;
  return Number.isFinite(result) ? Math.round(result * 100) / 100 : undefined;
}

function sourceAvailable(chain: string, coverage: string[]) {
  const key = chainKey(chain);
  return coverage.some(source => {
    const sourceKey = chainKey(source);
    if (key.includes('mercadona')) return sourceKey.includes('mercadona');
    if (key.includes('consum')) return sourceKey.includes('consum');
    if (key.includes('bonpreu') || key.includes('esclat')) return sourceKey.includes('bonpreu') || sourceKey.includes('esclat');
    return sourceKey === key;
  });
}

export function distanceBetween(latitude: number, longitude: number, store: SupermarketLocation) {
  const radians = (value: number) => value * Math.PI / 180;
  const lat = radians(store.latitude - latitude);
  const lon = radians(store.longitude - longitude);
  const value = Math.sin(lat / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(store.latitude)) * Math.sin(lon / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)) * 10) / 10;
}

export function buildStoreBaskets(items: ShoppingItem[], comparison: PriceComparison, stores = comparison.nearbyStores ?? []): StoreBasket[] {
  const pending = items.filter(item => !item.completed);
  const groupsByMember = new Map<string, PriceComparison['groups'][number]>();
  comparison.groups.forEach(group => group.memberNames.forEach(name => groupsByMember.set(normalized(name), group)));
  const nearestByChain = new Map<string, SupermarketLocation>();
  stores.forEach(store => {
    const key = chainKey(store.chain);
    const current = nearestByChain.get(key);
    if (!current || store.distanceKm < current.distanceKm) nearestByChain.set(key, store);
  });

  return [...nearestByChain.values()].map(location => {
    let total = 0;
    let previousComparableTotal = 0;
    let coverage = 0;
    const lines = pending.map(item => {
      const group = groupsByMember.get(normalized(item.name));
      const candidates = group?.offers.filter(candidate => chainKey(candidate.chain || candidate.store) === chainKey(location.chain)) ?? [];
      if (!group || !candidates.length) return { item, unavailableReason: 'Sin precio encontrado; no implica falta de existencias' };
      const compatible = candidates.filter(candidate => compatibleProduct(item.name, candidate.productName));
      if (!compatible.length) return { item, unavailableReason: 'Las ofertas encontradas no conservan el producto solicitado' };
      const priced = compatible.flatMap(offer => { const subtotal = valueOffer(item, offer); return subtotal === undefined ? [] : [{ offer, subtotal }]; }).sort((a, b) => a.subtotal - b.subtotal);
      if (!priced.length) return { item, unavailableReason: 'No se puede convertir la cantidad al formato de venta con seguridad' };
      const { offer, subtotal } = priced[0];
      const previousSubtotal = group.latestPaid && compatibleProduct(item.name, group.latestPaid.productName) ? valueOffer(item, group.latestPaid) : undefined;
      total += subtotal;
      coverage += 1;
      if (previousSubtotal !== undefined) previousComparableTotal += previousSubtotal;
      return { item, offer, subtotal, previousSubtotal };
    });
    const offeredComparableTotal = lines.reduce((sum, line) => line.previousSubtotal === undefined ? sum : sum + (line.subtotal ?? 0), 0);
    const savingComparable = pending.length > 0 && coverage === pending.length && lines.every(line => line.previousSubtotal !== undefined);
    return { id: location.id, location, chain: location.chain, lines, total: Math.round(total * 100) / 100,
      previousComparableTotal: Math.round(previousComparableTotal * 100) / 100, coverage,
      itemCount: pending.length, savingComparable, potentialSaving: savingComparable ? Math.round(Math.max(0, previousComparableTotal - offeredComparableTotal) * 100) / 100 : 0,
      catalogAvailable: sourceAvailable(location.chain, comparison.coverage) };
  }).sort((left, right) => right.coverage - left.coverage || left.total - right.total || left.location.distanceKm - right.location.distanceKm);
}
