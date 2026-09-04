import { Check, ChevronLeft, Lightbulb, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { generateShoppingList, type GeneratedList, type GeneratedListItem } from '../services/listGenerator';
import { useStore } from '../store/StoreProvider';
import type { Category } from '../types';
import { Button, Field } from './ui';

const categories: Category[] = ['Alimentación', 'Hogar', 'Higiene', 'Mascotas', 'Otros'];
const units = ['ud.', 'g', 'kg', 'ml', 'L', 'paquete', 'bote', 'botella', 'caja', 'rollo', 'sobre'];
type DraftItem = GeneratedListItem & { id: string; selected: boolean };
type DraftList = Omit<GeneratedList, 'items'> & { items: DraftItem[] };

function withDraftItems(proposal: GeneratedList): DraftList {
  return { ...proposal, items: proposal.items.map(item => ({ ...item, id: crypto.randomUUID(), selected: true })) };
}

export function AiListGenerator({ onDone }: { onDone: () => void }) {
  const { addItems } = useStore();
  const [request, setRequest] = useState('');
  const [proposal, setProposal] = useState<DraftList | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setBusy(true); setError('');
    try { setProposal(withDraftItems(await generateShoppingList(request))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido generar la propuesta.'); }
    finally { setBusy(false); }
  };
  const update = (id: string, patch: Partial<DraftItem>) => setProposal(current => current ? { ...current, items: current.items.map(item => item.id === id ? { ...item, ...patch } : item) } : current);
  const selected = proposal?.items.filter(item => item.selected && item.name.trim() && item.quantity > 0) ?? [];

  if (!proposal) return <div className="ai-list-start">
    <div className="ai-list-hero"><span><Sparkles size={27} /></span><div><h3>¿Qué quieres preparar o hacer?</h3><p>La IA lo convierte en productos concretos. Nada se añadirá hasta que revises la propuesta.</p></div></div>
    <Field label="Tu objetivo" hint="Incluye personas, estancia, duración o cualquier preferencia importante."><textarea autoFocus rows={5} value={request} onChange={event => setRequest(event.target.value)} placeholder="Quiero hacer una paella valenciana para 10 personas…" /></Field>
    <div className="ai-list-examples"><span>Prueba, por ejemplo:</span><button onClick={() => setRequest('Quiero hacer una paella valenciana para 10 personas')}>Paella valenciana para 10</button><button onClick={() => setRequest('Quiero limpiar toda la casa: cocina, baños, cristales y suelos')}>Limpieza completa de casa</button></div>
    {error ? <p className="error-note" role="alert">{error}</p> : null}
    <Button className="button--wide" onClick={() => void generate()} disabled={!request.trim() || busy}><Sparkles size={18} /> {busy ? 'Preparando una propuesta…' : 'Generar propuesta'}</Button>
    <p className="ai-list-privacy">La petición se procesa con IA; tu lista actual no se envía ni se modifica.</p>
  </div>;

  return <div className="ai-list-review">
    <button className="text-back" onClick={() => setProposal(null)}><ChevronLeft size={17} /> Cambiar petición</button>
    <div className="ai-list-summary"><span><Sparkles /></span><div><h3>{proposal.title}</h3>{proposal.summary ? <p>{proposal.summary}</p> : null}</div></div>
    {proposal.assumptions.length ? <details className="ai-assumptions"><summary><Lightbulb size={16} /> Supuestos que conviene revisar</summary><ul>{proposal.assumptions.map(value => <li key={value}>{value}</li>)}</ul></details> : null}
    <div className="ai-review-toolbar"><div><b>{proposal.items.length} productos propuestos</b><small>{selected.length} seleccionados</small></div><button onClick={() => setProposal(current => current ? { ...current, items: current.items.map(item => ({ ...item, selected: !current.items.every(value => value.selected) })) } : current)}>{proposal.items.every(item => item.selected) ? 'Quitar todos' : 'Seleccionar todos'}</button></div>
    <div className="ai-draft-list">{proposal.items.map(item => <article className={item.selected ? 'selected' : ''} key={item.id}>
      <button className="draft-check" aria-label={`${item.selected ? 'Excluir' : 'Incluir'} ${item.name}`} onClick={() => update(item.id, { selected: !item.selected })}>{item.selected ? <Check size={15} /> : null}</button>
      <div className="draft-fields">
        <input aria-label="Producto" value={item.name} onChange={event => update(item.id, { name: event.target.value })} />
        <div><input aria-label={`Cantidad de ${item.name}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={event => update(item.id, { quantity: Number(event.target.value) })} /><select aria-label={`Unidad de ${item.name}`} value={item.unit} onChange={event => update(item.id, { unit: event.target.value })}>{[...new Set([...units, item.unit])].map(unit => <option key={unit}>{unit}</option>)}</select><select aria-label={`Categoría de ${item.name}`} value={item.category} onChange={event => update(item.id, { category: event.target.value as Category })}>{categories.map(category => <option key={category}>{category}</option>)}</select></div>
        <input className="draft-note" aria-label={`Nota de ${item.name}`} value={item.note} onChange={event => update(item.id, { note: event.target.value })} placeholder="Nota opcional" />
      </div>
      <button className="draft-delete" aria-label={`Eliminar ${item.name}`} onClick={() => setProposal(current => current ? { ...current, items: current.items.filter(value => value.id !== item.id) } : current)}><Trash2 size={17} /></button>
    </article>)}</div>
    <button className="add-draft-item" onClick={() => setProposal(current => current ? { ...current, items: [...current.items, { id: crypto.randomUUID(), selected: true, name: '', quantity: 1, unit: 'ud.', category: 'Otros', note: '' }] } : current)}><Plus size={17} /> Añadir otro producto</button>
    {error ? <p className="error-note" role="alert">{error}</p> : null}
    <div className="ai-review-actions"><Button className="button--wide" disabled={!selected.length} onClick={() => { addItems(selected.map(({ id: _id, selected: _selected, ...item }) => item)); onDone(); }}><Plus size={18} /> Añadir {selected.length} a mi lista</Button><Button variant="secondary" className="button--wide" onClick={() => void generate()} disabled={busy}><RefreshCw size={17} /> {busy ? 'Generando…' : 'Regenerar propuesta'}</Button></div>
  </div>;
}
