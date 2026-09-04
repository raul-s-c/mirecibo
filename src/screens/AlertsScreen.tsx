import { ArrowDown, ArrowUp, Bell, ExternalLink, MapPin, RefreshCw, Search, ShoppingCart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button, EmptyState, Segmented } from '../components/ui';
import { BasketMap } from '../components/BasketMap';
import { compareCurrentPrices, comparisonProducts, filterPriceGroups, loadLastPriceComparison } from '../services/priceComparison';
import { useStore } from '../store/StoreProvider';
import type { PriceComparison } from '../types';
import { money, shortDate } from '../utils/format';
import { demoBasketComparison, isBasketDemo } from '../data/basketDemo';

interface DerivedAlert { key: string; product: string; store: string; previous: number; current: number; date: string; unit: string }

const basisLabel = { kg: 'kg', l: 'L', unit: 'ud.' } as const;

function offerLocation(offer: PriceComparison['groups'][number]['bestOffer']) {
  const distance = typeof offer.distanceKm === 'number' ? `${offer.distanceKm.toLocaleString('es-ES')} km` : undefined;
  if (offer.address) return [offer.nearbyStoreName, offer.address, offer.municipality, distance].filter(Boolean).join(' · ');
  return [offer.nearbyStoreName || offer.locationLabel, offer.municipality, distance].filter(Boolean).join(' · ') || 'Ubicación no disponible';
}

const FILTER_KEY = 'mirecibo-supermarket-filters-v1';
function initialFilters(): { distance: number; chains: string[] } {
  try {
    const value = JSON.parse(localStorage.getItem(FILTER_KEY) ?? 'null') as { distance?: unknown; chains?: unknown } | null;
    return { distance: typeof value?.distance === 'number' ? value.distance : 15,
      chains: Array.isArray(value?.chains) ? value.chains.filter((chain): chain is string => typeof chain === 'string') : [] };
  } catch { return { distance: 15, chains: [] }; }
}

export function AlertsScreen() {
  const { state, setPostalCode } = useStore();
  const [view, setView] = useState<'baskets' | 'prices' | 'changes'>('baskets');
  const [postalDraft, setPostalDraft] = useState(state.postalCode);
  const [comparison, setComparison] = useState<PriceComparison | null>(null);
  const [savedResult, setSavedResult] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const products = useMemo(() => comparisonProducts(state), [state]);
  const changes = useMemo(() => {
    const prices = new Map<string, DerivedAlert>();
    const result: DerivedAlert[] = [];
    [...state.receipts].reverse().forEach(receipt => receipt.lines.forEach(line => {
      if (line.lineType && line.lineType !== 'product') return;
      const key = line.name.toLocaleLowerCase('es');
      const prior = prices.get(key);
      const current = line.unitPrice || line.total / line.quantity;
      if (prior && Math.abs(current - prior.current) >= 0.03) result.unshift({ key: `${receipt.id}-${line.id}`, product: line.name, store: receipt.store, previous: prior.current, current, date: receipt.date, unit: line.unit });
      prices.set(key, { key, product: line.name, store: receipt.store, previous: current, current, date: receipt.date, unit: line.unit });
    }));
    return result;
  }, [state.receipts]);

  const update = async (force = false) => {
    setLoading(true); setError('');
    try { setComparison(await compareCurrentPrices(state, force)); setSavedResult(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se han podido comparar los precios.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    setRestoring(true);
    setComparison(null);
    setSavedResult(false);
    if (isBasketDemo) {
      setComparison(demoBasketComparison);
      setSavedResult(true);
      setRestoring(false);
      return () => { active = false; };
    }
    void loadLastPriceComparison(state.postalCode).then(saved => {
      if (!active) return;
      setComparison(saved);
      setSavedResult(Boolean(saved));
    }).finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, [state.postalCode]);

  useEffect(() => {
    if (!restoring && /^\d{5}$/.test(state.postalCode) && products.length && !comparison && !loading && !error) void update(false);
  }, [restoring, state.postalCode, products.length, comparison, loading, error]);

  const savePostalCode = () => {
    const value = postalDraft.trim();
    if (!/^\d{5}$/.test(value)) { setError('El código postal debe tener 5 cifras.'); return; }
    setComparison(null); setSavedResult(false); setError(''); setPostalCode(value);
  };
  useEffect(() => { localStorage.setItem(FILTER_KEY, JSON.stringify(filters)); }, [filters]);
  const chains = useMemo(() => comparison ? [...new Set((comparison.nearbyStores ?? []).map(store => store.chain))].sort() : [], [comparison]);
  const visibleGroups = useMemo(() => comparison ? filterPriceGroups(comparison, filters.distance, filters.chains) : [], [comparison, filters]);
  const opportunities = visibleGroups.filter(group => group.possibleSaving > 0);
  const nearbyCount = comparison ? new Set((comparison.nearbyStores ?? []).filter(store => store.distanceKm <= filters.distance &&
    (!filters.chains.length || filters.chains.includes(store.chain))).map(store => store.chain)).size : 0;
  const toggleChain = (chain: string) => setFilters(current => ({ ...current,
    chains: current.chains.includes(chain) ? current.chains.filter(value => value !== chain) : [...current.chains, chain] }));

  return <div className="screen savings-screen">
    <Segmented value={view} onChange={setView} options={[{ value: 'baskets', label: 'Mapa de cesta', count: chains.length }, { value: 'prices', label: 'Mejores precios', count: opportunities.length }, { value: 'changes', label: 'Cambios en tickets', count: changes.length }]} />
    {view === 'changes' ? (!changes.length ? <EmptyState icon={<Bell />} title="Aún no hay cambios de precio" text="Cuando productos equivalentes aparezcan en varios tickets, compararemos su precio unitario." /> : <div className="alerts-list">{changes.map(alert => { const lower = alert.current < alert.previous; return <article key={alert.key}><span className={`trend-icon ${lower ? 'down' : 'up'}`}>{lower ? <ArrowDown /> : <ArrowUp />}</span><span><b>{alert.product}</b><small>{alert.store} · {shortDate(alert.date)}</small><small>Antes: {money(alert.previous)}/{alert.unit}</small></span><div className={lower ? 'price-down' : 'price-up'}><b>{money(alert.current)}</b><small>{lower ? 'Bajó' : 'Subió'}</small></div></article>; })}</div>) : <>
      <section className="postcode-card"><MapPin /><div><b>Supermercados a tu alcance</b><small>El CP ordena las ofertas por cercanía</small></div><input inputMode="numeric" maxLength={5} value={postalDraft} onChange={event => setPostalDraft(event.target.value.replace(/\D/g, ''))} placeholder="Código postal" /><button onClick={savePostalCode}>Usar</button></section>
      {!products.length ? <EmptyState icon={<ShoppingCart />} title="No hay productos para comparar" text="Añade productos a tu lista o escanea tickets. La app agrupará nombres similares y buscará equivalencias." /> : !state.postalCode ? <EmptyState icon={<MapPin />} title="Indica tu código postal" text="Lo utilizaremos para localizar supermercados cercanos, no para limitar de qué cadenas extraemos precios." /> : <>
        <div className="comparison-toolbar"><span><Search size={15} /> {products.length} {products.length === 1 ? 'producto o variante' : 'productos y variantes'} para comparar</span><Button variant="secondary" disabled={loading || restoring} onClick={() => void update(true)}><RefreshCw className={loading ? 'spin' : ''} size={16} />{loading ? 'Buscando…' : 'Actualizar'}</Button></div>
        {error ? <p className="error-note">{error}</p> : null}
        {loading && !comparison ? <div className="comparison-loading"><RefreshCw className="spin" /><b>Buscando equivalencias y precios actuales…</b><small>Solo consultamos las categorías relacionadas con tus compras.</small></div> : null}
        {comparison ? <>
          <div className="coverage-note"><b>{savedResult ? 'Último resultado guardado' : 'Catálogos consultados'}</b><span>{comparison.coverage.length ? comparison.coverage.join(' · ') : 'Ningún catálogo respondió'}</span><small>{savedResult ? 'Recuperado sin hacer una consulta nueva · ' : 'Actualizado '}{new Date(comparison.updatedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</small></div>
          <section className="supermarket-filters"><div><span><MapPin size={16} /><b>{nearbyCount} {nearbyCount === 1 ? 'cadena con precios conectados' : 'cadenas con precios conectados'} a menos de {filters.distance} km</b></span><small>Mostramos una sucursal por cadena y consultamos únicamente sus catálogos. {comparison.otherNearbyStoreCount ? `${comparison.otherNearbyStoreCount} supermercados cercanos sin catálogo conectado quedan ocultos.` : ''}</small></div><div className="distance-filter" aria-label="Distancia máxima">{[5, 10, 15, 30].map(distance => <button key={distance} className={filters.distance === distance ? 'active' : ''} onClick={() => setFilters(current => ({ ...current, distance }))}>{distance} km</button>)}</div>{chains.length ? <div className="chain-filter" aria-label="Filtrar supermercados"><button className={!filters.chains.length ? 'active' : ''} onClick={() => setFilters(current => ({ ...current, chains: [] }))}>Todos</button>{chains.map(chain => <button key={chain} className={filters.chains.includes(chain) ? 'active' : ''} aria-pressed={filters.chains.includes(chain)} onClick={() => toggleChain(chain)}>{chain}</button>)}</div> : null}<small className="osm-credit">Tiendas y distancias: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">{comparison.locationAttribution || '© OpenStreetMap contributors'}</a></small></section>
          {comparison.warnings.map(warning => <p className="warning-note" key={warning}>{warning}</p>)}
          {view === 'baskets' ? <BasketMap items={state.items} comparison={comparison} maxDistance={filters.distance} selectedChains={filters.chains} /> : !visibleGroups.length ? <EmptyState icon={<MapPin />} title="No hay ofertas dentro de este filtro" text="Amplía la distancia o selecciona todas las cadenas para ver más resultados." /> : <div className="price-groups">{visibleGroups.map(group => <article key={group.id} className={group.possibleSaving > 0 ? 'has-saving' : ''}>
            <div className="price-group__title"><div><b>{group.canonicalName}</b><small>{group.memberNames.length > 1 ? `${group.memberNames.length} nombres similares agrupados` : group.memberNames[0]}</small></div>{group.possibleSaving > 0 ? <span>Ahorras {money(group.possibleSaving)}/{basisLabel[group.basis]}</span> : null}</div>
            <div className="best-offer">{group.bestOffer.imageUrl ? <img src={group.bestOffer.imageUrl} alt="" /> : <span className="offer-icon"><ShoppingCart /></span>}<div><small>{group.bestOffer.matchType === 'same' ? 'Mismo producto o variedad' : 'Alternativa equivalente'}</small><b>{group.bestOffer.productName}</b><span>{group.bestOffer.store} · {money(group.bestOffer.unitPrice)}/{basisLabel[group.basis]}</span><small className="offer-location"><MapPin size={12} />{offerLocation(group.bestOffer)}</small>{group.bestOffer.locationKind === 'chain-nearby' ? <small>Precio del catálogo online; la dirección es la sucursal cercana de la cadena.</small> : null}{group.bestOffer.matchReason ? <small>{group.bestOffer.matchReason}</small> : null}</div>{group.bestOffer.url ? <a href={group.bestOffer.url} target="_blank" rel="noreferrer" aria-label="Ver producto"><ExternalLink /></a> : null}</div>
            {group.latestPaid ? <p className="last-paid">Tu última compra comparable: {money(group.latestPaid.unitPrice)}/{basisLabel[group.basis]} en {group.latestPaid.store}</p> : null}
            {group.offers.length > 1 ? <details><summary>Ver {group.offers.length} precios comparables</summary><div>{group.offers.map((offer, index) => <p key={`${offer.source}-${offer.store}-${offer.productName}-${index}`}><span>{offer.productName}<small>{offer.store} · {offer.matchType === 'same' ? 'mismo' : 'equivalente'}</small><small className="offer-location"><MapPin size={11} />{offerLocation(offer)}</small></span><b>{money(offer.unitPrice)}/{basisLabel[group.basis]}</b></p>)}</div></details> : null}
          </article>)}</div>}
        </> : null}
      </>}
    </>}
  </div>;
}
