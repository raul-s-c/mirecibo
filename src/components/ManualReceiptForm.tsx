import { useState } from 'react';
import { Check, ReceiptText } from 'lucide-react';
import type { Category, Receipt } from '../types';
import { createManualReceipt } from '../services/manualReceipt';
import { Button, Field } from './ui';

const categories: Category[] = ['Alimentación', 'Hogar', 'Higiene', 'Mascotas', 'Otros'];
const today = () => { const date = new Date(); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 10); };

export function ManualReceiptForm({ onSave }: { onSave: (receipt: Receipt) => void }) {
  const [store, setStore] = useState('');
  const [date, setDate] = useState(today);
  const [total, setTotal] = useState('');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState<Category>('Alimentación');
  const amount = Number(total.replace(',', '.'));
  const valid = store.trim().length > 0 && date.length === 10 && Number.isFinite(amount) && amount > 0;
  return <form className="form-stack manual-receipt" onSubmit={event => { event.preventDefault(); if (valid) onSave(createManualReceipt({ store, date, total: amount, concept, category })); }}>
    <div className="manual-receipt__intro"><ReceiptText /><div><h3>Registra un gasto sin ticket</h3><p>Solo necesitas indicar dónde compraste y cuánto gastaste. No utiliza IA.</p></div></div>
    <Field label="Establecimiento"><input autoFocus required value={store} onChange={event => setStore(event.target.value)} placeholder="Ej. Frutería, panadería o mercado" /></Field>
    <div className="field-grid"><Field label="Fecha"><input required type="date" value={date} onChange={event => setDate(event.target.value)} /></Field><Field label="Importe total (€)"><input required inputMode="decimal" value={total} onChange={event => setTotal(event.target.value.replace(/[^0-9.,]/g, ''))} placeholder="12,00" /></Field></div>
    <Field label="Concepto (opcional)"><input value={concept} onChange={event => setConcept(event.target.value)} placeholder={store.trim() ? `Compra en ${store.trim()}` : 'Ej. Fruta y verdura'} /></Field>
    <Field label="Categoría"><select value={category} onChange={event => setCategory(event.target.value as Category)}>{categories.map(value => <option key={value}>{value}</option>)}</select></Field>
    <div className="success-note"><Check /> Este gasto aparecerá en tickets, inicio y análisis.</div>
    <Button className="button--wide" type="submit" disabled={!valid}><Check size={18} /> Guardar gasto</Button>
  </form>;
}
