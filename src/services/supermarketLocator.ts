import { Preferences } from '@capacitor/preferences';
import type { SupermarketLocation } from '../types';

const POSTCODE_API = 'https://api.zippopotam.us/es';
const OVERPASS_APIS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const CACHE_PREFIX = 'mirecibo-supermarket-directory-v1';
const CACHE_DAYS = 7;
export const STORE_RADIUS_KM = 30;

export interface SupermarketDirectory {
  postalCode: string;
  updatedAt: string;
  center: { latitude: number; longitude: number; label: string };
  stores: SupermarketLocation[];
}

interface OsmElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

function canonicalChain(value: string) {
  const name = value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const chains: Array<[RegExp, string]> = [
    [/mercadona/, 'Mercadona'], [/\bconsum\b|\bcharter\b/, 'Consum'], [/esclat|bonpreu/, 'Bonpreu/Esclat'],
    [/carrefour/, 'Carrefour'], [/alcampo/, 'Alcampo'], [/\blidl\b/, 'Lidl'], [/\baldi\b/, 'Aldi'],
    [/caprabo/, 'Caprabo'], [/condis/, 'Condis'], [/bonarea/, 'bonÀrea'], [/\bdia(?:\s*market)?\b/, 'DIA'],
    [/eroski/, 'Eroski'], [/hipercor|el corte ingles/, 'Hipercor'], [/supercor/, 'Supercor'], [/\bspar\b/, 'SPAR'],
    [/masymas/, 'masymas'], [/family cash/, 'Family Cash'], [/economy cash/, 'Economy Cash']
  ];
  return chains.find(([pattern]) => pattern.test(name))?.[1] ?? value.trim();
}

function radians(value: number) { return value * Math.PI / 180; }

function distanceKm(fromLat: number, fromLon: number, toLat: number, toLon: number) {
  const lat = radians(toLat - fromLat);
  const lon = radians(toLon - fromLon);
  const value = Math.sin(lat / 2) ** 2 + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(lon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function addressFromTags(tags: Record<string, string>) {
  const street = [tags['addr:street'] || tags['addr:place'], tags['addr:housenumber']].filter(Boolean).join(', ');
  return [street, tags['addr:postcode'], tags['addr:city'] || tags['addr:town'] || tags['addr:village']].filter(Boolean).join(', ') || undefined;
}

function parseDirectory(value: string | null): SupermarketDirectory | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<SupermarketDirectory>;
    if (typeof parsed.postalCode !== 'string' || typeof parsed.updatedAt !== 'string' || !parsed.center || !Array.isArray(parsed.stores)) return null;
    return parsed as SupermarketDirectory;
  } catch { return null; }
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, headers: { Accept: 'application/json', ...init?.headers }, signal: controller.signal }); }
  finally { window.clearTimeout(timer); }
}

export function directoryFromOsm(postalCode: string, center: SupermarketDirectory['center'], elements: OsmElement[]): SupermarketDirectory {
  const seen = new Set<string>();
  const candidates = elements.flatMap(element => {
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    const tags = element.tags ?? {};
    const rawName = tags.name || tags.brand || tags.operator;
    if (!rawName || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const id = `${element.type ?? 'place'}:${element.id ?? `${latitude}:${longitude}`}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ id, chain: canonicalChain([tags.brand, tags.operator, rawName].filter(Boolean).join(' ')), name: rawName,
      address: addressFromTags(tags), municipality: tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
      postalCode: tags['addr:postcode'], distanceKm: Math.round(distanceKm(center.latitude, center.longitude, Number(latitude), Number(longitude)) * 10) / 10,
      latitude: Number(latitude), longitude: Number(longitude) } satisfies SupermarketLocation];
  }).filter(store => store.distanceKm <= STORE_RADIUS_KM).sort((left, right) => left.distanceKm - right.distanceKm);
  const stores = candidates.filter((store, index) => !candidates.slice(0, index).some(previous =>
    previous.chain === store.chain && previous.name.toLocaleLowerCase('es') === store.name.toLocaleLowerCase('es') &&
    distanceKm(previous.latitude, previous.longitude, store.latitude, store.longitude) < 0.15));
  return { postalCode, updatedAt: new Date().toISOString(), center, stores };
}

async function locateFromCenter(key: string, postalCode: string, center: SupermarketDirectory['center'], force: boolean, fallback?: SupermarketDirectory | null) {
  const stored = fallback ?? parseDirectory(localStorage.getItem(key)) ?? parseDirectory((await Preferences.get({ key })).value);
  if (!force && stored && Date.now() - Date.parse(stored.updatedAt) < CACHE_DAYS * 86_400_000) {
    localStorage.setItem(key, JSON.stringify(stored));
    return stored;
  }
  const query = `[out:json][timeout:20];nwr(around:${STORE_RADIUS_KM * 1000},${center.latitude},${center.longitude})["shop"~"^(supermarket|convenience)$"];out center 800;`;
  let elements: OsmElement[] | null = null;
  for (const endpoint of OVERPASS_APIS) {
    try {
      const response = await fetchWithTimeout(endpoint, 25_000, { method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }).toString() });
      if (!response.ok) continue;
      const result = await response.json() as { elements?: OsmElement[] };
      if (Array.isArray(result.elements)) { elements = result.elements; break; }
    } catch { /* Se prueba la siguiente réplica pública. */ }
  }
  if (!elements) {
    if (stored) return stored;
    throw new Error('No se ha podido consultar ahora el directorio de supermercados. Inténtalo de nuevo en unos minutos.');
  }
  const directory = directoryFromOsm(postalCode, center, elements);
  const value = JSON.stringify(directory);
  localStorage.setItem(key, value);
  await Preferences.set({ key, value });
  return directory;
}

export async function locateSupermarkets(postalCode: string, force = false): Promise<SupermarketDirectory> {
  const key = `${CACHE_PREFIX}-${postalCode}`;
  const stored = parseDirectory(localStorage.getItem(key)) ?? parseDirectory((await Preferences.get({ key })).value);
  if (!force && stored && Date.now() - Date.parse(stored.updatedAt) < CACHE_DAYS * 86_400_000) {
    localStorage.setItem(key, JSON.stringify(stored));
    return stored;
  }

  const postcodeResponse = await fetchWithTimeout(`${POSTCODE_API}/${postalCode}`, 8_000);
  if (!postcodeResponse.ok) throw new Error('No hemos podido localizar ese código postal.');
  const postcode = await postcodeResponse.json() as { places?: Array<{ latitude?: string; longitude?: string; 'place name'?: string; state?: string }> };
  const place = postcode.places?.[0];
  const latitude = Number(place?.latitude);
  const longitude = Number(place?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Ese código postal no tiene coordenadas disponibles.');
  const center = { latitude, longitude, label: [postalCode, place?.['place name'], place?.state].filter(Boolean).join(' · ') };
  return locateFromCenter(key, postalCode, center, force, stored);
}

export async function locateSupermarketsAt(latitude: number, longitude: number, force = false): Promise<SupermarketDirectory> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('La ubicación no contiene coordenadas válidas.');
  const locationKey = `${latitude.toFixed(3)}-${longitude.toFixed(3)}`;
  const center = { latitude, longitude, label: 'Tu ubicación actual' };
  return locateFromCenter(`${CACHE_PREFIX}-geo-${locationKey}`, `geo:${locationKey}`, center, force);
}
