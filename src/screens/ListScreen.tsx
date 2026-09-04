import { Check, MoreHorizontal, Search, ShoppingBasket, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Segmented, EmptyState, Button, IconButton, Sheet, Field } from '../components/ui';
import { useStore } from '../store/StoreProvider';
import type { ShoppingItem } from '../types';

export function ListScreen({ onAdd, onGenerate }: { onAdd: () => void; onGenerate: () => void }) {
  const { state, toggleItem, updateItem, deleteItem, clearItems } = useStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const visible = useMemo(() => state.items.filter(item => (filter === 'all' || (filter === 'done' ? item.completed : !item.completed)) && item.name.toLowerCase().includes(search.toLowerCase())), [filter, search, state.items]);
  const grouped = useMemo(() => {
    const result = new Map<string, ShoppingItem[]>();
    visible.forEach(item => result.set(item.category, [...(result.get(item.category) ?? []), item]));
    return result;
  }, [visible]);
  const pending = state.items.filter(item => !item.completed).length;
  const done = state.items.length - pending;
  return <div className="screen">
    <div className="search"><Search size={19} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar en la lista…" /></div>
    <button className="generate-list-entry" onClick={onGenerate}><span><Sparkles size={18} /></span><span><b>Generar lista con IA</b><small>Una receta, una celebración o una tarea completa</small></span></button>
    <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Todos', count: state.items.length }, { value: 'pending', label: 'Pendientes', count: pending }, { value: 'done', label: 'Comprados', count: done }]} />
    {state.items.length ? <div className="list-actions"><span>{state.items.length} productos en la lista</span><button onClick={() => { if (window.confirm(`¿Vaciar toda la lista? Se eliminarán ${state.items.length} productos, pero tus tickets y repostajes se conservarán.`)) { clearItems(); setSearch(''); setFilter('all'); } }}><Trash2 size={15} /> Vaciar lista</button></div> : null}
    {!visible.length ? <EmptyState icon={<ShoppingBasket />} title={state.items.length ? 'No hay resultados' : 'Tu lista está vacía'} text={state.items.length ? 'Prueba con otro filtro o búsqueda.' : 'Añade varios productos escribiendo o hablando de forma natural.'} action={!state.items.length ? <Button onClick={onAdd}>Añadir productos</Button> : undefined} /> : <div className="grouped-list">{[...grouped].map(([category, items]) => <section key={category}><h2>{category}<span>{items.length}</span></h2><div className="list-card">{items.map(item => <article className={`product-row ${item.completed ? 'completed' : ''}`} key={item.id}><button className="check" onClick={() => toggleItem(item.id)} aria-label={item.completed ? `Desmarcar ${item.name}` : `Marcar ${item.name}`}>{item.completed ? <Check size={16} /> : null}</button><button className="product-row__main" onClick={() => toggleItem(item.id)}><b>{item.name}</b><small>{item.quantity.toLocaleString('es-ES')} {item.unit}{item.store ? ` · ${item.store}` : ''}</small></button><IconButton label={`Opciones de ${item.name}`} onClick={() => setEditing(item)}><MoreHorizontal size={20} /></IconButton></article>)}</div></section>)}</div>}
    <Sheet open={Boolean(editing)} title="Editar producto" onClose={() => setEditing(null)}>{editing ? <form onSubmit={event => { event.preventDefault(); updateItem(editing); setEditing(null); }} className="form-stack">
      <Field label="Producto"><input value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></Field>
      <div className="field-grid"><Field label="Cantidad"><input type="number" min="0.01" step="0.01" value={editing.quantity} onChange={event => setEditing({ ...editing, quantity: Number(event.target.value) })} /></Field><Field label="Unidad"><select value={editing.unit} onChange={event => setEditing({ ...editing, unit: event.target.value })}><option>ud.</option><option>kg</option><option>g</option><option>L</option><option>paquete</option><option>cartón</option></select></Field></div>
      <Field label="Notas"><input value={editing.note ?? ''} onChange={event => setEditing({ ...editing, note: event.target.value })} placeholder="Marca, tamaño, variedad…" /></Field>
      <Button type="submit" className="button--wide">Guardar</Button><Button type="button" variant="danger" className="button--wide" onClick={() => { deleteItem(editing.id); setEditing(null); }}>Eliminar</Button>
    </form> : null}</Sheet>
  </div>;
}
