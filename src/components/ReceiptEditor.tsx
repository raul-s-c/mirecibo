import { useState } from 'react';
import type { Category, Receipt, ReceiptLine } from '../types';
import { Button, Field } from './ui';
import { money } from '../utils/format';

const categories: Category[] = ['Alimentación', 'Hogar', 'Higiene', 'Mascotas', 'Otros'];

export function ReceiptEditor({ receipt, onSave, onCancel }: { receipt: Receipt; onSave: (receipt: Receipt) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Receipt>(() => ({ ...receipt, lines: receipt.lines.map(line => ({ ...line })) }));
  const changeLine = (id: string, patch: Partial<ReceiptLine>) => setDraft(value => ({ ...value, lines: value.lines.map(line => line.id === id ? { ...line, ...patch } : line) }));
  const sum = draft.lines.reduce((value, line) => value + line.total, 0);
  const valid = draft.store.trim() && draft.date && Number.isFinite(draft.total) && draft.lines.every(line => line.name.trim() && line.unit.trim() && Number.isFinite(line.quantity) && line.quantity > 0 && Number.isFinite(line.unitPrice) && Number.isFinite(line.total));
  return <form className="form-stack receipt-editor" onSubmit={event => { event.preventDefault(); if (valid) onSave(draft); }}>
    <p>Corrige los datos sin volver a analizar el ticket. Los cambios solo se guardan al confirmar.</p>
    <Field label="Establecimiento"><input required value={draft.store} onChange={event => setDraft({ ...draft, store: event.target.value })} /></Field>
    <Field label="Fecha"><input required type="date" value={draft.date.slice(0, 10)} onChange={event => setDraft({ ...draft, date: event.target.value })} /></Field>
    {draft.lines.map((line, index) => <fieldset key={line.id} className="receipt-editor__line">
      <legend>Producto {index + 1}</legend>
      <Field label="Producto"><input required value={line.name} onChange={event => changeLine(line.id, { name: event.target.value })} /></Field>
      <Field label={`Categoría de ${line.name}`}><select value={line.category} onChange={event => changeLine(line.id, { category: event.target.value as Category })}>{categories.map(category => <option key={category}>{category}</option>)}</select></Field>
      <div className="receipt-editor__numbers">
        <Field label="Cantidad"><input required type="number" min="0.001" step="any" value={Number.isNaN(line.quantity) ? '' : line.quantity} onChange={event => changeLine(line.id, { quantity: event.target.valueAsNumber })} /></Field>
        <Field label="Unidad"><input required value={line.unit} onChange={event => changeLine(line.id, { unit: event.target.value })} /></Field>
        <Field label="Precio unitario (€)"><input required type="number" step="any" value={Number.isNaN(line.unitPrice) ? '' : line.unitPrice} onChange={event => changeLine(line.id, { unitPrice: event.target.valueAsNumber })} /></Field>
        <Field label="Importe (€)"><input required type="number" step="0.01" value={Number.isNaN(line.total) ? '' : line.total} onChange={event => changeLine(line.id, { total: event.target.valueAsNumber })} /></Field>
      </div>
    </fieldset>)}
    <p>Los importes se editan por separado para respetar descuentos y redondeos del ticket.</p>
    <Field label="Total del ticket (€)"><input required type="number" step="0.01" value={Number.isNaN(draft.total) ? '' : draft.total} onChange={event => setDraft({ ...draft, total: event.target.valueAsNumber })} /></Field>
    {Number.isFinite(sum) && Math.abs(sum - draft.total) >= 0.02 ? <p role="status">Revisa el total: las líneas suman {money(sum)} y el ticket indica {money(draft.total)}.</p> : null}
    <div className="receipt-editor__actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={!valid}>Guardar cambios</Button></div>
  </form>;
}
