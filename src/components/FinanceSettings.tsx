import { Archive, ArrowDown, ArrowUp, CalendarClock, Check, Layers3, Merge, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { CATEGORY_COLORS, activeCategories } from '../services/categories';
import { dueReminderExpenses, localToday } from '../services/recurringExpenses';
import { useStore } from '../store/StoreProvider';
import type { RecurringExpense, RecurringFrequency, RecurringMode } from '../types';
import { money, shortDate } from '../utils/format';
import { Button, Field, Sheet } from './ui';

const frequencyLabels: Record<RecurringFrequency, string> = { weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual' };

export function FinanceSettings() {
  const [panel, setPanel] = useState<'categories' | 'recurring' | null>(null);
  const { state } = useStore();
  const due = dueReminderExpenses(state).length;
  return <>
    <section className="settings-group finance-settings"><h2>Organización de gastos</h2>
      <button onClick={() => setPanel('categories')}><Layers3 /><span><b>Categorías</b><small>{activeCategories(state).length} activas · crea, ordena, archiva o fusiona</small></span></button>
      <button onClick={() => setPanel('recurring')}><CalendarClock /><span><b>Gastos periódicos</b><small>{state.recurringExpenses.filter(value => value.active).length} activos{due ? ` · ${due} pendientes de confirmar` : ''}</small></span></button>
    </section>
    <Sheet open={panel === 'categories'} title="Categorías" onClose={() => setPanel(null)}><CategoryManager /></Sheet>
    <Sheet open={panel === 'recurring'} title="Gastos periódicos" onClose={() => setPanel(null)}><RecurringExpenseManager /></Sheet>
  </>;
}

function CategoryManager() {
  const { state, addCategory, renameCategory, setCategoryColor, moveCategory, archiveCategory, mergeCategory } = useStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[5]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const normalizedNames = useMemo(() => new Set(state.categories.map(value => value.name.trim().toLocaleLowerCase('es'))), [state.categories]);
  const create = (event: FormEvent) => {
    event.preventDefault(); const clean = name.trim();
    if (!clean || normalizedNames.has(clean.toLocaleLowerCase('es'))) return;
    addCategory({ name: clean, color, archived: false }); setName('');
  };
  const saveName = (id: string) => {
    const clean = editName.trim(); const current = state.categories.find(value => value.id === id);
    if (!clean || (!current || (clean !== current.name && normalizedNames.has(clean.toLocaleLowerCase('es'))))) return;
    renameCategory(id, clean); setEditing(null);
  };
  const merge = () => {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return;
    const source = state.categories.find(value => value.id === mergeSource); const target = state.categories.find(value => value.id === mergeTarget);
    if (!source || !target || !confirm(`¿Fusionar “${source.name}” dentro de “${target.name}”? Todos sus productos y gastos pasarán a la categoría de destino.`)) return;
    mergeCategory(source.id, target.id); setMergeSource(''); setMergeTarget('');
  };
  return <div className="category-manager">
    <p className="manager-intro">Las categorías se aplican a listas, tickets, análisis y gastos periódicos. Los cambios se conservan en tus snapshots.</p>
    <form className="inline-create" onSubmit={create}><input aria-label="Nombre de la categoría" value={name} onChange={event => setName(event.target.value)} placeholder="Ej. Salud" maxLength={32} /><input aria-label="Color de la categoría" type="color" value={color} onChange={event => setColor(event.target.value)} /><Button type="submit" disabled={!name.trim() || normalizedNames.has(name.trim().toLocaleLowerCase('es'))}><Plus size={17} /> Crear</Button></form>
    <div className="category-list">{state.categories.map((category, index) => <article className={category.archived ? 'archived' : ''} key={category.id}>
      <input className="category-color" aria-label={`Color de ${category.name}`} type="color" value={category.color} onChange={event => setCategoryColor(category.id, event.target.value)} />
      <span>{editing === category.id ? <input autoFocus aria-label={`Nuevo nombre de ${category.name}`} value={editName} onChange={event => setEditName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') saveName(category.id); }} /> : <><b>{category.name}</b><small>{category.archived ? 'Archivada' : category.builtin ? 'Predeterminada' : 'Personalizada'}</small></>}</span>
      <span className="category-actions">{editing === category.id ? <button aria-label={`Guardar ${category.name}`} onClick={() => saveName(category.id)}><Check /></button> : <button aria-label={`Editar ${category.name}`} onClick={() => { setEditing(category.id); setEditName(category.name); }}><Pencil /></button>}<button aria-label={`Subir ${category.name}`} disabled={index === 0} onClick={() => moveCategory(category.id, -1)}><ArrowUp /></button><button aria-label={`Bajar ${category.name}`} disabled={index === state.categories.length - 1} onClick={() => moveCategory(category.id, 1)}><ArrowDown /></button><button aria-label={category.archived ? `Reactivar ${category.name}` : `Archivar ${category.name}`} disabled={!category.archived && activeCategories(state).length <= 1} onClick={() => archiveCategory(category.id, !category.archived)}>{category.archived ? <RotateCcw /> : <Archive />}</button></span>
    </article>)}</div>
    {state.categories.length > 1 ? <section className="merge-box"><h3><Merge /> Fusionar categorías</h3><p>Mueve todo el historial de una categoría a otra y elimina la primera.</p><div><select aria-label="Categoría que se fusionará" value={mergeSource} onChange={event => setMergeSource(event.target.value)}><option value="">Origen…</option>{state.categories.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select><select aria-label="Categoría de destino" value={mergeTarget} onChange={event => setMergeTarget(event.target.value)}><option value="">Destino…</option>{state.categories.filter(value => value.id !== mergeSource).map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select><Button variant="secondary" disabled={!mergeSource || !mergeTarget} onClick={merge}>Fusionar</Button></div></section> : null}
  </div>;
}

const emptyDraft = (category: string): Omit<RecurringExpense, 'id' | 'createdAt'> => ({ concept: '', store: '', amount: 0, category, frequency: 'monthly', nextDate: localToday(), mode: 'reminder', active: true });

function RecurringExpenseManager() {
  const { state, addRecurringExpense, updateRecurringExpense, deleteRecurringExpense, confirmRecurringExpense, skipRecurringExpense } = useStore();
  const categories = activeCategories(state);
  const [draft, setDraft] = useState<Omit<RecurringExpense, 'id' | 'createdAt'>>(() => emptyDraft(categories[0]?.name ?? 'Otros'));
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const due = dueReminderExpenses(state);
  const value = editing ?? draft;
  const setValue = (patch: Partial<RecurringExpense>) => editing ? setEditing(current => current ? { ...current, ...patch } : current) : setDraft(current => ({ ...current, ...patch }));
  const valid = value.concept.trim() && value.store.trim() && value.amount > 0 && value.nextDate;
  const save = (event: FormEvent) => {
    event.preventDefault(); if (!valid) return;
    const dayOfPeriod = Number(value.nextDate.slice(8, 10));
    if (editing) { updateRecurringExpense({ ...editing, dayOfPeriod }); setEditing(null); }
    else { addRecurringExpense({ ...draft, dayOfPeriod }); setDraft(emptyDraft(categories[0]?.name ?? 'Otros')); }
  };
  return <div className="recurring-manager">
    {due.length ? <section className="due-expenses"><h3>{due.length} {due.length === 1 ? 'gasto pendiente' : 'gastos pendientes'}</h3>{due.map(expense => <article key={expense.id}><span><b>{expense.concept}</b><small>{expense.store} · previsto {shortDate(expense.nextDate)}</small></span><strong>{money(expense.amount)}</strong><div><Button onClick={() => confirmRecurringExpense(expense.id)}><Check size={16} /> Registrar</Button><Button variant="secondary" onClick={() => skipRecurringExpense(expense.id)}>Saltar</Button></div></article>)}</section> : null}
    <form className="form-stack recurring-form" onSubmit={save}><h3>{editing ? 'Editar gasto periódico' : 'Nuevo gasto periódico'}</h3><Field label="Concepto"><input value={value.concept} onChange={event => setValue({ concept: event.target.value })} placeholder="Ej. Cuota del gimnasio" /></Field><Field label="Establecimiento o proveedor"><input value={value.store} onChange={event => setValue({ store: event.target.value })} placeholder="Ej. Gimnasio" /></Field><div className="field-grid"><Field label="Importe (€)"><input type="number" min="0.01" step="0.01" value={value.amount || ''} onChange={event => setValue({ amount: event.target.valueAsNumber || 0 })} /></Field><Field label="Próxima fecha"><input type="date" value={value.nextDate} onChange={event => setValue({ nextDate: event.target.value })} /></Field></div><div className="field-grid"><Field label="Frecuencia"><select value={value.frequency} onChange={event => setValue({ frequency: event.target.value as RecurringFrequency })}><option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="yearly">Anual</option></select></Field><Field label="Categoría"><select value={value.category} onChange={event => setValue({ category: event.target.value })}>{[...new Set([...categories.map(category => category.name), value.category])].map(category => <option key={category}>{category}</option>)}</select></Field></div><Field label="Cuando llegue la fecha"><select value={value.mode} onChange={event => setValue({ mode: event.target.value as RecurringMode })}><option value="reminder">Pedirme confirmación</option><option value="automatic">Registrar automáticamente</option></select></Field><label className="toggle-line"><input type="checkbox" checked={value.active} onChange={event => setValue({ active: event.target.checked })} /><span>Gasto activo</span></label><div className="form-actions"><Button type="submit" disabled={!valid}><Check size={17} /> {editing ? 'Guardar cambios' : 'Crear gasto'}</Button>{editing ? <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button> : null}</div></form>
    <div className="recurring-list"><h3>Programados</h3>{state.recurringExpenses.length ? state.recurringExpenses.map(expense => <article className={!expense.active ? 'inactive' : ''} key={expense.id}><span className="recurring-icon"><CalendarClock /></span><span><b>{expense.concept}</b><small>{expense.store} · {frequencyLabels[expense.frequency]} · próxima {shortDate(expense.nextDate)}</small><em>{expense.mode === 'automatic' ? 'Automático' : 'Confirmación'} · {expense.category}</em></span><strong>{money(expense.amount)}</strong><div><button aria-label={`Editar ${expense.concept}`} onClick={() => setEditing(expense)}><Pencil /></button><button aria-label={`${expense.active ? 'Pausar' : 'Activar'} ${expense.concept}`} onClick={() => updateRecurringExpense({ ...expense, active: !expense.active })}>{expense.active ? <Archive /> : <RotateCcw />}</button><button aria-label={`Eliminar ${expense.concept}`} onClick={() => confirm(`¿Eliminar “${expense.concept}”? Los tickets ya creados se conservarán.`) && deleteRecurringExpense(expense.id)}><Trash2 /></button></div></article>) : <p className="empty-inline">Todavía no has programado ningún gasto.</p>}</div>
  </div>;
}
