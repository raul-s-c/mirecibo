import { ChevronRight, Pencil, ReceiptText, ScanLine, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, EmptyState, Sheet } from '../components/ui';
import { ReceiptEditor } from '../components/ReceiptEditor';
import { useStore } from '../store/StoreProvider';
import type { Receipt } from '../types';
import { money, shortDate } from '../utils/format';

export function TicketsScreen({ onScan }: { onScan: () => void }) {
  const { state, deleteReceipt, updateReceipt } = useStore();
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [editing, setEditing] = useState(false);
  const close = () => { if (!editing || window.confirm('¿Descartar los cambios sin guardar?')) { setEditing(false); setSelected(null); } };
  const total = state.receipts.reduce((sum, receipt) => sum + receipt.total, 0);
  return <div className="screen">
    <section className="metric-banner"><span>Gasto registrado</span><strong>{money(total)}</strong><small>{state.receipts.length} tickets · {state.receipts.reduce((sum, receipt) => sum + receipt.lines.length, 0)} productos</small></section>
    <Button className="button--wide" onClick={onScan}><ScanLine size={20} /> Escanear ticket</Button>
    <div className="section-heading"><h2>Historial</h2></div>
    {!state.receipts.length ? <EmptyState icon={<ReceiptText />} title="Todavía no hay tickets" text="Fotografía uno y revisa los datos antes de guardarlo." action={<Button onClick={onScan}>Escanear el primero</Button>} /> : <div className="ticket-list">{state.receipts.map(receipt => <button key={receipt.id} onClick={() => setSelected(receipt)}><span className="store-mark">{receipt.store.slice(0, 1).toLocaleUpperCase('es')}</span><span><b>{receipt.store}</b><small>{shortDate(receipt.date)}{receipt.time ? ` · ${receipt.time}` : ''} · {receipt.lines.length} productos</small></span><strong>{money(receipt.total)}</strong><ChevronRight size={19} /></button>)}</div>}
    <Sheet open={Boolean(selected)} title={editing ? 'Editar ticket' : 'Detalle del ticket'} onClose={close} wide>{selected && editing ? <ReceiptEditor receipt={selected} onCancel={() => setEditing(false)} onSave={receipt => { updateReceipt(receipt); setSelected(receipt); setEditing(false); }} /> : selected ? <div className="receipt-detail">
      <div className="receipt-summary"><span className="store-mark large">{selected.store.slice(0, 1)}</span><div><h3>{selected.store}</h3><p>{shortDate(selected.date)} {selected.time ?? ''}</p></div><strong>{money(selected.total)}</strong></div>
      <div className="receipt-table"><div className="receipt-table__head"><span>Producto</span><span>Cant.</span><span>P. unit.</span><span>Importe</span></div>{selected.lines.map(line => <div key={line.id}><span><b>{line.name}</b><small>{line.category}</small></span><span>{line.quantity.toLocaleString('es-ES')} {line.unit}</span><span className="receipt-unit-price">{money(line.unitPrice || line.total / Math.max(line.quantity, 1))}<small>/{line.unit}</small></span><strong>{money(line.total)}</strong></div>)}</div>
      <div className="receipt-total"><span>Total</span><strong>{money(selected.total)}</strong></div>
      <Button variant="secondary" className="button--wide" onClick={() => setEditing(true)}><Pencil size={18} /> Editar ticket</Button>
      <Button variant="danger" className="button--wide" onClick={() => { deleteReceipt(selected.id); setSelected(null); }}><Trash2 size={18} /> Eliminar ticket</Button>
    </div> : null}</Sheet>
  </div>;
}
