import { CalendarDays, Check, ChefHat, ChevronRight, Clock3, History, PackageCheck, Plus, Search, ShoppingCart, Sparkles, Trash2, UtensilsCrossed } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { activeCategories } from '../services/categories';
import { generateMealPlan, type GeneratedMealPlan } from '../services/mealPlanner';
import { useStore } from '../store/StoreProvider';
import type { MealPlan, MealPlanMode, MealSlotSelection, PantryItem, ReceiptLine } from '../types';
import { shortDate } from '../utils/format';
import { Button, EmptyState, Field, Segmented, Sheet } from '../components/ui';

const DIET_OPTIONS = ['Sin gluten / celíaco', 'Bajo en grasas', 'Vegetariano', 'Vegano', 'Sin lactosa', 'Bajo en sal', 'Alto en proteínas'];
const UNITS = ['ud.', 'g', 'kg', 'ml', 'L', 'paquete', 'bote', 'lata'];
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const normalize = (value: string) => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

interface ReceiptSuggestion { key: string; line: ReceiptLine; receiptId: string; store: string; date: string }

function PlanView({ plan, onAddMissing, onSave, onDelete, saved, missingAdded }: { plan: GeneratedMealPlan | MealPlan; onAddMissing: () => void; onSave?: () => void; onDelete?: () => void; saved: boolean; missingAdded: boolean }) {
  return <div className="meal-plan-result">
    <section className="meal-plan-summary"><span><ChefHat /></span><div><h2>{plan.title}</h2><p>{plan.summary}</p></div>{saved ? <em><Check size={13} /> Guardado</em> : null}</section>
    {plan.assumptions.length ? <details className="meal-assumptions"><summary>Supuestos y seguridad alimentaria</summary><ul>{plan.assumptions.map(value => <li key={value}>{value}</li>)}</ul></details> : null}
    <div className="meal-days">{plan.days.map((day, dayIndex) => <section key={`${day.date}-${day.label}-${dayIndex}`}>
      <header><CalendarDays /><div><b>{day.label}</b>{day.date ? <small>{shortDate(day.date)}</small> : null}</div></header>
      {day.meals.map((meal, mealIndex) => <details key={`${meal.name}-${mealIndex}`} open={dayIndex === 0 && mealIndex === 0}>
        <summary><span><small>{meal.type}</small><b>{meal.name}</b><em>{meal.description}</em></span><ChevronRight /></summary>
        <div className="recipe-detail"><h3>Ingredientes</h3>{meal.ingredients.map((ingredient, index) => <p key={`${ingredient.name}-${index}`}><span className={ingredient.source === 'pantry' ? 'in-pantry' : 'to-buy'}>{ingredient.source === 'pantry' ? <PackageCheck /> : <ShoppingCart />}</span><span><b>{ingredient.name}</b><small>{ingredient.source === 'pantry' ? 'En tu despensa' : 'Falta comprar'}</small></span><strong>{ingredient.quantity.toLocaleString('es-ES')} {ingredient.unit}</strong></p>)}
          {meal.steps.length ? <><h3>Preparación</h3><ol>{meal.steps.map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}</ol></> : null}</div>
      </details>)}
    </section>)}</div>
    <section className="meal-shopping"><div><ShoppingCart /><span><b>Compra necesaria</b><small>{plan.shoppingItems.length ? `${plan.shoppingItems.length} productos concretos` : 'No falta ningún producto'}</small></span></div>{plan.shoppingItems.length ? <ul>{plan.shoppingItems.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}<small>{item.note}</small></span><b>{item.quantity.toLocaleString('es-ES')} {item.unit}</b></li>)}</ul> : null}</section>
    {plan.shoppingItems.length ? <Button className="button--wide" disabled={missingAdded} onClick={onAddMissing}><Plus size={18} /> {missingAdded ? 'Añadido a mi lista' : 'Añadir lo que falta a mi lista'}</Button> : null}
    {!saved && onSave ? <Button variant="secondary" className="button--wide" onClick={onSave}><CalendarDays size={18} /> Guardar planificación</Button> : null}
    {saved && onDelete ? <Button variant="danger" className="button--wide" onClick={onDelete}><Trash2 size={17} /> Eliminar planificación</Button> : null}
    <p className="diet-warning">Las propuestas son orientativas. En alergias o celiaquía, verifica siempre etiquetas, trazas y contaminación cruzada.</p>
  </div>;
}

export function PantryScreen() {
  const { state, upsertPantryItem, deletePantryItem, addMealPlan, deleteMealPlan, addItems } = useStore();
  const categories = activeCategories(state).map(value => value.name);
  const [view, setView] = useState<'pantry' | 'plan'>('pantry');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [manual, setManual] = useState({ name: '', quantity: 1, unit: 'ud.', category: categories[0] ?? 'Alimentación' });
  const [mode, setMode] = useState<MealPlanMode>('week');
  const [mealSlots, setMealSlots] = useState<MealSlotSelection>('both');
  const [people, setPeople] = useState(2);
  const [startDate, setStartDate] = useState(localDate);
  const [dietFilters, setDietFilters] = useState<string[]>([]);
  const [otherFilter, setOtherFilter] = useState('');
  const [notes, setNotes] = useState('');
  const [generated, setGenerated] = useState<GeneratedMealPlan | null>(null);
  const [selectedSavedId, setSelectedSavedId] = useState(state.mealPlans[0]?.id ?? 'new');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [missingAdded, setMissingAdded] = useState(false);

  const pantry = useMemo(() => state.pantryItems.filter(item => normalize(item.name).includes(normalize(deferredSearch))), [state.pantryItems, deferredSearch]);
  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const values: ReceiptSuggestion[] = [];
    [...state.receipts].sort((a, b) => b.date.localeCompare(a.date)).forEach(receipt => receipt.lines.forEach(line => {
      if (line.total <= 0 || (line.lineType && line.lineType !== 'product')) return;
      const key = `${normalize(line.name)}|${line.unit}`;
      if (!key || seen.has(key)) return;
      seen.add(key); values.push({ key, line, receiptId: receipt.id, store: receipt.store, date: receipt.date });
    }));
    const term = normalize(deferredSearch);
    return values.filter(value => !term || normalize(value.line.name).includes(term)).slice(0, 120);
  }, [state.receipts, deferredSearch]);
  const savedPlan = selectedSavedId === 'new' ? undefined : state.mealPlans.find(value => value.id === selectedSavedId) ?? state.mealPlans[0];

  const addManual = () => {
    if (!manual.name.trim() || manual.quantity <= 0) return;
    upsertPantryItem({ ...manual, name: manual.name.trim() });
    setManual(current => ({ ...current, name: '', quantity: 1 }));
  };
  const addSuggestion = (suggestion: ReceiptSuggestion) => upsertPantryItem({
    name: suggestion.line.name,
    quantity: suggestion.line.quantity,
    unit: suggestion.line.unit,
    category: suggestion.line.category,
    sourceReceiptId: suggestion.receiptId
  });
  const toggleDiet = (filter: string) => setDietFilters(current => current.includes(filter) ? current.filter(value => value !== filter) : [...current, filter]);
  const generate = async () => {
    setBusy(true); setError(''); setMissingAdded(false);
    try {
      const filters = [...dietFilters, otherFilter.trim()].filter(Boolean);
      setGenerated(await generateMealPlan({ mode, mealSlots, people, startDate, dietFilters: filters, notes, pantry: state.pantryItems }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido generar el menú.'); }
    finally { setBusy(false); }
  };
  const missingAlreadyListed = (plan: GeneratedMealPlan | MealPlan) => plan.shoppingItems.length > 0 && plan.shoppingItems.every(product => state.items.some(item => !item.completed && normalize(item.name) === normalize(product.name) && item.unit === product.unit));
  const addMissing = (plan: GeneratedMealPlan | MealPlan) => {
    const newItems = plan.shoppingItems.filter(product => !state.items.some(item => !item.completed && normalize(item.name) === normalize(product.name) && item.unit === product.unit));
    if (newItems.length) addItems(newItems);
    setMissingAdded(true);
  };
  const saveGenerated = () => {
    if (!generated) return;
    const saved = addMealPlan({ ...generated, startDate, people, mode, mealSlots, dietFilters: [...dietFilters, otherFilter.trim()].filter(Boolean), notes });
    setSelectedSavedId(saved.id); setGenerated(null);
  };

  return <div className="screen pantry-screen">
    <Segmented value={view} onChange={setView} options={[{ value: 'pantry', label: 'Mi despensa', count: state.pantryItems.length }, { value: 'plan', label: 'Menús', count: state.mealPlans.length }]} />
    {view === 'pantry' ? <>
      <section className="pantry-intro"><PackageCheck /><div><h2>Lo que tienes en casa</h2><p>Añádelo manualmente o recupéralo de tus tickets. Tú decides qué sigue realmente en la despensa.</p></div></section>
      <div className="pantry-add"><input aria-label="Producto de despensa" value={manual.name} onChange={event => setManual({ ...manual, name: event.target.value })} placeholder="Ej. Arroz bomba" /><input aria-label="Cantidad" type="number" min="0.01" step="0.01" value={manual.quantity} onChange={event => setManual({ ...manual, quantity: Number(event.target.value) })} /><select aria-label="Unidad" value={manual.unit} onChange={event => setManual({ ...manual, unit: event.target.value })}>{UNITS.map(unit => <option key={unit}>{unit}</option>)}</select><button aria-label="Añadir a despensa" onClick={addManual}><Plus /></button></div>
      <Button variant="secondary" className="button--wide" onClick={() => setImportOpen(true)}><History size={17} /> Añadir desde mis tickets</Button>
      <div className="search pantry-search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar en la despensa…" /></div>
      {!pantry.length ? <EmptyState icon={<PackageCheck />} title={state.pantryItems.length ? 'No hay coincidencias' : 'Tu despensa está vacía'} text={state.pantryItems.length ? 'Prueba con otro término.' : 'Añade lo que tienes en casa para generar menús que lo aprovechen.'} /> : <div className="pantry-list">{pantry.map(item => <article key={item.id}><span><b>{item.name}</b><small>{item.category}{item.sourceReceiptId ? ' · Desde un ticket' : ' · Añadido a mano'}</small></span><strong>{item.quantity.toLocaleString('es-ES')} {item.unit}</strong><button onClick={() => setEditing(item)}>Editar</button></article>)}</div>}
      <Sheet open={importOpen} title="Productos de tus tickets" onClose={() => setImportOpen(false)}><div className="ticket-product-import"><div className="search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Queso, salmón…" /></div>{!suggestions.length ? <EmptyState icon={<History />} title="No hay productos" text="Escanea o crea un ticket y sus productos aparecerán aquí." /> : suggestions.map(suggestion => { const exists = state.pantryItems.some(item => normalize(item.name) === normalize(suggestion.line.name) && item.unit === suggestion.line.unit); return <article key={suggestion.key}><span><b>{suggestion.line.name}</b><small>{suggestion.store} · {shortDate(suggestion.date)}</small></span><strong>{suggestion.line.quantity.toLocaleString('es-ES')} {suggestion.line.unit}</strong><button disabled={exists} onClick={() => addSuggestion(suggestion)}>{exists ? <Check /> : <Plus />}</button></article>; })}</div></Sheet>
      <Sheet open={Boolean(editing)} title="Editar despensa" onClose={() => setEditing(null)}>{editing ? <form className="form-stack" onSubmit={event => { event.preventDefault(); upsertPantryItem(editing); setEditing(null); }}><Field label="Producto"><input value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></Field><div className="field-grid"><Field label="Cantidad"><input type="number" min="0.01" step="0.01" value={editing.quantity} onChange={event => setEditing({ ...editing, quantity: Number(event.target.value) })} /></Field><Field label="Unidad"><select value={editing.unit} onChange={event => setEditing({ ...editing, unit: event.target.value })}>{[...new Set([...UNITS, editing.unit])].map(unit => <option key={unit}>{unit}</option>)}</select></Field></div><Field label="Categoría"><select value={editing.category} onChange={event => setEditing({ ...editing, category: event.target.value })}>{[...new Set([...categories, editing.category])].map(category => <option key={category}>{category}</option>)}</select></Field><Button type="submit" className="button--wide">Guardar</Button><Button type="button" variant="danger" className="button--wide" onClick={() => { deletePantryItem(editing.id); setEditing(null); }}><Trash2 size={17} /> Eliminar de la despensa</Button></form> : null}</Sheet>
    </> : <>
        {generated ? <PlanView plan={generated} saved={false} missingAdded={missingAdded || missingAlreadyListed(generated)} onAddMissing={() => addMissing(generated)} onSave={saveGenerated} /> : savedPlan ? <><div className="saved-plan-picker"><label>Planificaciones guardadas<select value={savedPlan.id} onChange={event => { setSelectedSavedId(event.target.value); setMissingAdded(false); }}>{state.mealPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.title} · {shortDate(plan.startDate)}</option>)}</select></label><Button variant="secondary" onClick={() => { setSelectedSavedId('new'); setGenerated(null); }}>Crear otra</Button></div><PlanView plan={savedPlan} saved missingAdded={missingAdded || missingAlreadyListed(savedPlan)} onAddMissing={() => addMissing(savedPlan)} onDelete={() => { if (confirm('¿Eliminar esta planificación? Tu despensa y lista no cambiarán.')) { deleteMealPlan(savedPlan.id); setSelectedSavedId(state.mealPlans.find(value => value.id !== savedPlan.id)?.id ?? 'new'); } }} /></> : <div className="meal-builder">
        <section className="meal-builder__hero"><UtensilsCrossed /><div><h2>Cocina con lo que ya tienes</h2><p>La IA prioriza tu despensa y separa claramente lo disponible de lo que falta comprar.</p></div></section>
        <Field label="Tipo de planificación"><Segmented value={mode} onChange={setMode} options={[{ value: 'ideas', label: '3 ideas' }, { value: 'week', label: 'Semana' }]} /></Field>
        {mode === 'week' ? <Field label="Comidas a planificar"><Segmented value={mealSlots} onChange={setMealSlots} options={[{ value: 'lunch', label: 'Comidas' }, { value: 'dinner', label: 'Cenas' }, { value: 'both', label: 'Ambas' }]} /></Field> : null}
        <div className="field-grid"><Field label="Personas"><input type="number" min="1" max="20" value={people} onChange={event => setPeople(Number(event.target.value))} /></Field><Field label="Empieza"><input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></Field></div>
        <Field label="Preferencias dietéticas" hint="Selecciona todas las que deban cumplirse."><div className="diet-chips">{DIET_OPTIONS.map(filter => <button type="button" key={filter} className={dietFilters.includes(filter) ? 'active' : ''} aria-pressed={dietFilters.includes(filter)} onClick={() => toggleDiet(filter)}>{dietFilters.includes(filter) ? <Check /> : null}{filter}</button>)}</div></Field>
        <Field label="Otro filtro o indicación"><input value={otherFilter} onChange={event => setOtherFilter(event.target.value)} placeholder="Ej. sin frutos secos, cenas de menos de 30 minutos…" /></Field>
        <Field label="Notas opcionales"><textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Preferencias, alimentos que no te gustan, equipamiento…" /></Field>
        <div className="pantry-ready"><PackageCheck /><span><b>{state.pantryItems.length} productos disponibles</b><small>{state.pantryItems.length ? 'Se enviarán solo nombres y cantidades.' : 'Añade productos en Mi despensa antes de generar.'}</small></span></div>
        {error ? <p className="error-note" role="alert">{error}</p> : null}
        <Button className="button--wide" disabled={!state.pantryItems.length || busy} onClick={() => void generate()}><Sparkles size={18} /> {busy ? 'Preparando el menú…' : mode === 'week' ? 'Generar planificación semanal' : 'Generar 3 recetas'}</Button>
        <p className="ai-list-privacy"><Clock3 size={13} /> Solo se consulta la IA al pulsar generar. Los planes guardados se abren sin gastar tokens.</p>
      </div>}
      {(generated || savedPlan) ? <button className="new-meal-plan" onClick={() => { setGenerated(null); setSelectedSavedId('new'); setMissingAdded(false); }}><Plus /> Crear otra planificación</button> : null}
    </>}
  </div>;
}
