import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { Category } from '../types';
import { Button, Field, Sheet } from './ui';

export interface ExpenseCategoryTarget {
  key: string;
  name: string;
  category: Category;
}

export function ExpenseCategoryEditor({ target, categories, onClose, onSave }: {
  target: ExpenseCategoryTarget | null;
  categories: string[];
  onClose: () => void;
  onSave: (category: Category) => void;
}) {
  const [category, setCategory] = useState<Category>(target?.category ?? 'Otros');
  useEffect(() => { if (target) setCategory(target.category); }, [target?.key]);
  const options = [...new Set([...categories, target?.category ?? category])];
  return <Sheet open={Boolean(target)} title="Cambiar categoría" onClose={onClose}>
    {target ? <form className="form-stack expense-category-editor" onSubmit={event => { event.preventDefault(); onSave(category); }}>
      <div className="expense-category-target"><small>Gasto seleccionado</small><b>{target.name}</b><span>Actualmente en {target.category}</span></div>
      <Field label="Nueva categoría"><select autoFocus value={category} onChange={event => setCategory(event.target.value)}>{options.map(value => <option key={value}>{value}</option>)}</select></Field>
      <p>El cambio se guarda en el dato original y actualiza inmediatamente gráficos, totales y desgloses.</p>
      <Button type="submit" className="button--wide" disabled={category === target.category}><Check size={18} /> Guardar categoría</Button>
    </form> : null}
  </Sheet>;
}
