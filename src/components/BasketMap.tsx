import { CheckCircle2, Crosshair, MapPin, PackageCheck, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { PriceComparison, ShoppingItem, SupermarketLocation } from '../types';
import { buildStoreBaskets, distanceBetween, type StoreBasket } from '../services/basketComparison';
import { money } from '../utils/format';
import { Button, EmptyState, Sheet } from './ui';
import { locateSupermarketsAt } from '../services/supermarketLocator';
import { connectedPriceChain } from '../services/priceComparison';

const basisLabel = { kg: 'kg', l: 'L', unit: 'ud.' } as const;

function ChainMark({ chain, small = false }: { chain: string; small?: boolean }) {
  const key = chain.toLocaleLowerCase('es');
  const label = key.includes('mercadona') ? 'M' : key.includes('consum') ? 'consum' : key.includes('esclat') || key.includes('bonpreu') ? 'Esclat' : chain.slice(0, 2);
  const tone = key.includes('consum') ? 'consum' : key.includes('esclat') || key.includes('bonpreu') ? 'esclat' : key.includes('mercadona') ? 'mercadona' : 'other';
  return <span className={`chain-mark chain-mark--${tone}${small ? ' chain-mark--small' : ''}`} aria-label={chain}>{label}</span>;
}

function tilePoint(latitude: number, longitude: number, zoom: number) {
  const scale = 2 ** zoom;
  const sine = Math.sin(latitude * Math.PI / 180);
  return { x: (longitude + 180) / 360 * scale, y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale };
}

function StoreMap({ baskets, center, distance, selected, onSelect }: { baskets: StoreBasket[]; center: { latitude: number; longitude: number }; distance: number; selected?: string; onSelect: (basket: StoreBasket) => void }) {
  const zoom = distance <= 5 ? 13 : distance <= 10 ? 12 : distance <= 15 ? 11 : 10;
  const centerPoint = tilePoint(center.latitude, center.longitude, zoom);
  const tiles = useMemo(() => [-2, -1, 0, 1, 2].flatMap(dx => [-1, 0, 1].map(dy => ({ x: Math.floor(centerPoint.x) + dx, y: Math.floor(centerPoint.y) + dy }))), [centerPoint.x, centerPoint.y]);
  return <div className="basket-map" aria-label="Mapa de supermercados cercanos">
    <div className="basket-map__tiles" aria-hidden="true">{tiles.map(tile => <img key={`${zoom}-${tile.x}-${tile.y}`} loading="lazy" src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`} alt="" style={{ left: `calc(50% + ${(tile.x - centerPoint.x) * 256}px)`, top: `calc(50% + ${(tile.y - centerPoint.y) * 256}px)` }} />)}</div>
    <span className="basket-map__position" style={{ left: '50%', top: '50%' }}><i /></span>
    {baskets.map(basket => { const point = tilePoint(basket.location.latitude, basket.location.longitude, zoom); const price = basket.coverage ? `${money(basket.total)}${basket.coverage < basket.itemCount ? ' parcial' : ''}` : basket.catalogAvailable ? 'Sin coincidencias' : 'No disponible'; return <button key={basket.id} className={`map-store-pin${selected === basket.id ? ' active' : ''}${basket.coverage ? '' : ' unavailable'}`} style={{ left: `calc(50% + ${(point.x - centerPoint.x) * 256}px)`, top: `calc(50% + ${(point.y - centerPoint.y) * 256}px)` }} onClick={() => onSelect(basket)} aria-label={`${basket.location.name}, ${price}`}><ChainMark chain={basket.chain} small /><b>{price}</b></button>; })}
    <a className="basket-map__credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
  </div>;
}

function BasketDetail({ basket, onClose }: { basket: StoreBasket | null; onClose: () => void }) {
  return <Sheet open={Boolean(basket)} title={basket?.location.name || 'Cesta del supermercado'} onClose={onClose} wide>{basket ? <div className="basket-detail">
    <header><ChainMark chain={basket.chain} /><div><b>{basket.location.name}</b><small>{[basket.location.address, basket.location.municipality, `${basket.location.distanceKm.toLocaleString('es-ES')} km`].filter(Boolean).join(' · ')}</small></div><strong>{basket.coverage ? money(basket.total) : '—'}</strong></header>
    <div className="basket-detail__summary"><span><small>Productos con precio</small><b>{basket.coverage} de {basket.itemCount}</b></span><span><small>{basket.coverage < basket.itemCount ? 'Subtotal parcial' : 'Coste por cantidad'}</small><b>{basket.coverage ? money(basket.total) : 'Sin datos'}</b></span><span><small>Ahorro potencial</small><b>{basket.savingComparable ? money(basket.potentialSaving) : 'No calculable'}</b></span></div>
    <p className="basket-detail__coverage">{!basket.catalogAvailable ? <><TriangleAlert /> Catálogo temporalmente no disponible</> : basket.coverage === basket.itemCount ? <><CheckCircle2 /> Cesta completa</> : <><TriangleAlert /> {basket.itemCount - basket.coverage} {basket.itemCount - basket.coverage === 1 ? 'producto' : 'productos'} sin equivalencia encontrada</>}</p>
    <div className="basket-lines">{basket.lines.map(line => <article key={line.item.id} className={!line.offer ? 'missing' : ''}>{line.offer?.imageUrl ? <img src={line.offer.imageUrl} alt="" /> : <span className="basket-line__placeholder"><PackageCheck /></span>}<div><small>Pediste: {line.item.name}</small><b>{line.offer?.productName || line.unavailableReason || 'Sin precio verificable'}</b>{line.offer ? <em>{line.offer.matchType === 'same' ? 'Coincidencia directa' : 'Equivalencia a revisar'}</em> : <em>No incluido en el subtotal</em>}</div><span><small>{line.offer ? `${money(line.offer.basis === 'unit' ? line.offer.price : line.offer.unitPrice)}/${basisLabel[line.offer.basis]}` : '—'}</small><b>{line.subtotal === undefined ? '—' : money(line.subtotal)}</b><small>{line.item.quantity.toLocaleString('es-ES')} {line.item.unit}</small></span></article>)}</div>
    <small className="basket-detail__note">Coste proporcional a la cantidad solicitada, no necesariamente al envase que tendrás que comprar. Los productos sin precio no están incluidos. Solo calculamos ahorro con la lista completa y precios históricos comparables. Revisa cada equivalencia.</small>
  </div> : null}</Sheet>;
}

export function BasketMap({ items, comparison, maxDistance, selectedChains }: { items: ShoppingItem[]; comparison: PriceComparison; maxDistance: number; selectedChains: string[] }) {
  const defaultCenter = comparison.searchCenter ?? { latitude: 40.4168, longitude: -3.7038, label: comparison.postalCode };
  const [center, setCenter] = useState({ latitude: defaultCenter.latitude, longitude: defaultCenter.longitude });
  const [directoryStores, setDirectoryStores] = useState(comparison.nearbyStores ?? []);
  const [selected, setSelected] = useState<StoreBasket | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'error'>('idle');
  useEffect(() => {
    setCenter({ latitude: defaultCenter.latitude, longitude: defaultCenter.longitude });
    setDirectoryStores(comparison.nearbyStores ?? []);
  }, [comparison.nearbyStores, defaultCenter.latitude, defaultCenter.longitude]);
  const stores = useMemo(() => directoryStores.map(store => ({ ...store, distanceKm: distanceBetween(center.latitude, center.longitude, store) }))
    .filter(store => store.distanceKm <= maxDistance && (!selectedChains.length || selectedChains.includes(store.chain))), [directoryStores, center, maxDistance, selectedChains]);
  const baskets = useMemo(() => buildStoreBaskets(items, comparison, stores), [items, comparison, stores]);
  const choose = (basket: StoreBasket) => setSelected(basket);
  const usePosition = () => {
    if (!navigator.geolocation) { setLocationState('error'); return; }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(position => {
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      void locateSupermarketsAt(next.latitude, next.longitude).then(directory => {
        setCenter(next); setDirectoryStores(directory.stores.filter(store => Boolean(connectedPriceChain(store.chain)))); setSelected(null); setLocationState('idle');
      }).catch(() => setLocationState('error'));
    }, () => setLocationState('error'), { enableHighAccuracy: true, timeout: 12_000, maximumAge: 300_000 });
  };

  if (!baskets.length) return <EmptyState icon={<MapPin />} title="No hay cestas calculables en este radio" text="Amplía la distancia, selecciona todas las cadenas o actualiza los precios." />;
  return <section className="basket-comparison">
    <div className="basket-overview"><span><PackageCheck /><b>{items.filter(item => !item.completed).length} productos en tu lista</b></span><small>{baskets.length} catálogos cercanos</small></div>
    <StoreMap baskets={baskets} center={center} distance={maxDistance} selected={selected?.id} onSelect={choose} />
    <div className="map-location-tools"><Button variant="secondary" onClick={usePosition} disabled={locationState === 'loading'}><Crosshair size={16} />{locationState === 'loading' ? 'Buscando supermercados…' : 'Usar mi ubicación'}</Button>{locationState === 'error' ? <small>No se pudo actualizar la ubicación. Se mantienen los supermercados del código postal.</small> : null}</div>
    <div className="store-baskets">{baskets.map((basket, index) => <button key={basket.id} className={selected?.id === basket.id ? 'active' : ''} onClick={() => choose(basket)}><ChainMark chain={basket.chain} /><span><b>{basket.location.name}</b><small>{[basket.location.address, basket.location.municipality].filter(Boolean).join(' · ') || basket.chain}</small><small><MapPin size={11} /> {basket.location.distanceKm.toLocaleString('es-ES')} km · {basket.coverage ? `${basket.coverage} de ${basket.itemCount} productos` : basket.catalogAvailable ? 'sin equivalencias para esta lista' : 'catálogo no disponible'}</small></span><span><b>{basket.coverage ? money(basket.total) : basket.catalogAvailable ? 'Sin coincidencias' : 'No disponible'}</b><small>{basket.coverage ? basket.coverage < basket.itemCount ? 'Total parcial' : 'Cesta estimada' : basket.catalogAvailable ? 'Catálogo consultado' : 'Inténtalo más tarde'}</small>{basket.potentialSaving > 0 ? <em>Ahorras {money(basket.potentialSaving)}</em> : index === 0 && basket.coverage > 0 && basket.coverage === basket.itemCount ? <em>Menor coste completo</em> : null}<strong>Ver cesta</strong></span></button>)}</div>
    <BasketDetail basket={selected} onClose={() => setSelected(null)} />
  </section>;
}
