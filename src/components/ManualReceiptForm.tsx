import { useState } from 'react';
import { Check, ReceiptText, Undo2 } from 'lucide-react';
import type { Category, Receipt } from '../types';
import { createManualReceipt } from '../services/manualReceipt';
import { Button, Field, Segmented } from './ui';
import { useStore } from '../store/StoreProvider';
import { activeCategories } from '../services/categories';

const today = () => { const date = new Date(); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 10); };

export function ManualReceiptForm({ onSave }: { onSave: (receipt: Receipt) => void }) {
  const { state } = useStore();
  const categories = activeCategories(state).map(value => value.name);
  const [store, setStore] = useState('');
  const [date, setDate] = useState(today);
  const [total, setTotal] = useState('');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState<Category>(() => categories[0] ?? 'Otros');
  const [movement, setMovement] = useState<'expense' | 'credit'>('expense');
  const amount = Math.abs(Number(total.replace(',', '.')));
  const signedAmount = movement === 'credit' ? -amount : amount;
  const valid = store.trim().length > 0 && date.length === 10 && Number.isFinite(amount) && amount > 0;
  const isCredit = movement === 'credit';
  return <form className={`form-stack manual-receipt ${isCredit ? 'manual-receipt--credit' : ''}`} onSubmit={event => { event.preventDefault(); if (valid) onSave(createManualReceipt({ store, date, total: signedAmount, concept, category })); }}>
    <div className="manual-receipt__intro">{isCredit ? <Undo2 /> : <ReceiptText />}<div><h3>{isCredit ? 'Registra un abono o Bizum' : 'Registra un gasto sin ticket'}</h3><p>{isCredit ? 'El importe se guardará en negativo y reducirá tu gasto.' : 'Solo necesitas indicar dónde compraste y cuánto gastaste. No utiliza IA.'}</p></div></div>
    <div className="field"><span>Tipo de movimiento</span><Segmented value={movement} onChange={setMovement} options={[{ value: 'expense', label: 'Gasto' }, { value: 'credit', label: 'Abono / Bizum' }]} /></div>
    <Field label={isCredit ? 'Origen del abono' : 'Establecimiento'}><input autoFocus required value={store} onChange={event => setStore(event.target.value)} placeholder={isCredit ? 'Ej. Ana, devolución Mercadona…' : 'Ej. Frutería, panadería o mercado'} /></Field>
    <div className="field-grid"><Field label="Fecha"><input required type="date" value={date} onChange={event => setDate(event.target.value)} /></Field><Field label="Importe total (€)"><input required inputMode="decimal" value={total} onChange={event => setTotal(event.target.value.replace(/[^0-9.,]/g, ''))} placeholder="12,00" /></Field></div>
    <Field label="Concepto (opcional)"><input value={concept} onChange={event => setConcept(event.target.value)} placeholder={isCredit ? 'Ej. Bizum por compra compartida' : store.trim() ? `Compra en ${store.trim()}` : 'Ej. Fruta y verdura'} /></Field>
    <Field label="Categoría"><select value={category} onChange={event => setCategory(event.target.value as Category)}>{categories.map(value => <option key={value}>{value}</option>)}</select></Field>
    <div className="success-note"><Check /> {isCredit ? `Se registrará como ${Number.isFinite(amount) && amount > 0 ? `−${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : 'importe negativo'} y restará en tus análisis.` : 'Este gasto aparecerá en tickets, inicio y análisis.'}</div>
    <Button className="button--wide" type="submit" disabled={!valid}><Check size={18} /> {isCredit ? 'Guardar abono' : 'Guardar gasto'}</Button>
  </form>;
}
