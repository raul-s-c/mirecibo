import { ChevronRight, FilePenLine, Pencil, ReceiptText, ScanLine, Search, Trash2 } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Button, EmptyState, Sheet } from '../components/ui';
import { ReceiptEditor } from '../components/ReceiptEditor';
import { useStore } from '../store/StoreProvider';
import type { Receipt } from '../types';
import { money, shortDate } from '../utils/format';
import { activeCategories } from '../services/categories';
import { searchReceiptProducts, summarizeReceiptProductResults } from '../services/receiptSearch';
import { AdBannerSlot } from '../components/AdBannerSlot';

export function TicketsScreen({ onScan, onManual }: { onScan: () => void; onManual: () => void }) {
  const { state, deleteReceipt, updateReceipt } = useStore();
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const close = () => { if (!editing || window.confirm('¿Descartar los cambios sin guardar?')) { setEditing(false); setSelected(null); } };
  const total = state.receipts.reduce((sum, receipt) => sum + receipt.total, 0);
  const productResults = useMemo(() => searchReceiptProducts(state.receipts, deferredSearch), [deferredSearch, state.receipts]);
  const productSummary = useMemo(() => summarizeReceiptProductResults(productResults), [productResults]);
  const ticketNumbers = useMemo(() => new Map([...state.receipts].sort((a, b) => `${a.date}${a.time ?? ''}`.localeCompare(`${b.date}${b.time ?? ''}`)).map((receipt, index) => [receipt.id, index + 1])), [state.receipts]);
  return <div className="screen">
    <section className="metric-banner"><span>Gasto registrado</span><strong>{money(total)}</strong><small>{state.receipts.length} tickets · {state.receipts.reduce((sum, receipt) => sum + receipt.lines.length, 0)} productos</small></section>
    <AdBannerSlot />
    <div className="ticket-create-actions"><Button onClick={onScan}><ScanLine size={20} /> Escanear</Button><Button variant="secondary" onClick={onManual}><FilePenLine size={20} /> Crear manual</Button></div>
    <div className="search ticket-product-search"><Search size={19} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar queso, salmón, detergente…" /></div>
    <div className="section-heading"><h2>{search.trim() ? 'Productos encontrados' : 'Historial'}</h2>{search.trim() ? <span>{productSummary.count} {productSummary.count === 1 ? 'coincidencia' : 'coincidencias'}</span> : null}</div>
    {search.trim() && productResults.length ? <section className="product-search-summary" aria-live="polite"><span><small>Total gastado en coincidencias</small><b>{money(productSummary.total)}</b></span><strong>{productSummary.count} {productSummary.count === 1 ? 'compra' : 'compras'}</strong><p>Suma de los importes completos de cada línea encontrada.</p></section> : null}
    {!state.receipts.length ? <EmptyState icon={<ReceiptText />} title="Todavía no hay tickets" text="Fotografía uno o registra el gasto a mano para conservarlo." action={<Button onClick={onManual}>Crear el primero</Button>} /> : search.trim() ? (!productResults.length ? <EmptyState icon={<Search />} title="No aparece en tus tickets" text="Prueba con una parte del nombre. La búsqueda ignora mayúsculas y acentos." /> : <div className="ticket-product-results">{productResults.map(({ receipt, line }) => <button key={`${receipt.id}-${line.id}`} onClick={() => setSelected(receipt)}><span className="product-search-icon"><Search /></span><span><b>{line.name}</b><small>Ticket #{ticketNumbers.get(receipt.id)} · {receipt.store}</small><small>{shortDate(receipt.date)} · {line.quantity.toLocaleString('es-ES')} {line.unit} · {money(line.unitPrice || line.total / Math.max(line.quantity, 1))}/{line.unit}</small></span><strong><small>Importe</small>{money(line.total)}</strong><ChevronRight /></button>)}</div>) : <div className="ticket-list">{state.receipts.map(receipt => <button key={receipt.id} onClick={() => setSelected(receipt)}><span className="store-mark">{receipt.store.slice(0, 1).toLocaleUpperCase('es')}</span><span><b>{receipt.store}</b><small>{shortDate(receipt.date)}{receipt.time ? ` · ${receipt.time}` : ''} · {receipt.lines.length} {receipt.lines.length === 1 ? 'concepto' : 'productos'}</small></span><strong>{money(receipt.total)}</strong><ChevronRight size={19} /></button>)}</div>}
    <Sheet open={Boolean(selected)} title={editing ? 'Editar ticket' : 'Detalle del ticket'} onClose={close} wide>{selected && editing ? <ReceiptEditor receipt={selected} categoryNames={activeCategories(state).map(value => value.name)} onCancel={() => setEditing(false)} onSave={receipt => { updateReceipt(receipt); setSelected(receipt); setEditing(false); }} /> : selected ? <div className="receipt-detail">
      <div className="receipt-summary"><span className="store-mark large">{selected.store.slice(0, 1)}</span><div><h3>{selected.store}</h3><p>{shortDate(selected.date)} {selected.time ?? ''}</p></div><strong>{money(selected.total)}</strong></div>
      <div className="receipt-table"><div className="receipt-table__head"><span>Producto</span><span>Cant.</span><span>P. unit.</span><span>Importe</span></div>{selected.lines.map(line => <div key={line.id}><span><b>{line.name}</b><small>{line.category}</small></span><span>{line.quantity.toLocaleString('es-ES')} {line.unit}</span><span className="receipt-unit-price">{money(line.unitPrice || line.total / Math.max(line.quantity, 1))}<small>/{line.unit}</small></span><strong>{money(line.total)}</strong></div>)}</div>
      <div className="receipt-total"><span>Total</span><strong>{money(selected.total)}</strong></div>
      <Button variant="secondary" className="button--wide" onClick={() => setEditing(true)}><Pencil size={18} /> Editar ticket</Button>
      <Button variant="danger" className="button--wide" onClick={() => { deleteReceipt(selected.id); setSelected(null); }}><Trash2 size={18} /> Eliminar ticket</Button>
    </div> : null}</Sheet>
  </div>;
}
